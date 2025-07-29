import asyncio
from http import HTTPStatus
from pathlib import Path
from aiohttp import web
from sqlmodel import select

from src.Ytdlp import Ytdlp
from src.db import get_session, VideoDB, FileDB
from src.schemas import Video

video_router = web.RouteTableDef()


def model_to_dict(instance):
    return instance.model_dump() if hasattr(instance, "model_dump") else dict(instance)


@video_router.get("/api/videos")
async def get_videos(request):
    with get_session() as session:
        result = session.exec(select(VideoDB))
        videos = result.all()
        return web.json_response([model_to_dict(video) for video in videos])


@video_router.get("/api/video/{id}")
async def get_video(req: web.Request):
    with get_session() as session:
        result = session.exec(select(VideoDB).where(
            VideoDB.id == req.match_info.get("id"))).one_or_none()
        if not result:
            return web.json_response({"error": f"Video not found with id {req.match_info.get("id")}"})
        return web.json_response(result.model_dump())


@video_router.post("/api/video")
async def post_handler(request: web.Request):
    try:
        data = await request.json()
        video_schema = Video(**data)

        with get_session() as session:
            existing = session.get(VideoDB, video_schema.id)
            if existing:
                return web.json_response(
                    {
                        "error": "Video Already Exists!",
                        "video": model_to_dict(existing),
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )

            video_model = VideoDB(**video_schema.model_dump())
            session.add(video_model)
            session.commit()
            session.refresh(video_model)

            asyncio.create_task(Ytdlp(video_schema).download_video())

            return web.json_response(model_to_dict(video_model))
    except Exception as e:
        print("POST/api/video", e)
        return web.json_response({"error": str(e)}, status=500)


@video_router.put("/api/video/{id}")
async def update_video(req: web.Request):
    video_id = req.match_info.get("id")
    if not video_id:
        return web.json_response(
            {"error": "Missing video id"}, status=HTTPStatus.BAD_REQUEST
        )

    try:
        payload = await req.json()
    except Exception:
        return web.json_response(
            {"error": "Invalid JSON body"}, status=HTTPStatus.BAD_REQUEST
        )

    update_data = Video(**payload).dict(exclude_unset=True)
    if not update_data:
        return web.json_response(
            {"error": "No valid fields to update"}, status=HTTPStatus.BAD_REQUEST
        )

    with get_session() as session:
        stmt = select(VideoDB).where(VideoDB.id == video_id)
        result = session.exec(stmt)
        video = result.one_or_none()

        if not video:
            return web.json_response(
                {"error": "Video not found"}, status=HTTPStatus.NOT_FOUND
            )

        for key, value in update_data.items():
            setattr(video, key, value)

        session.add(video)
        session.commit()
        session.refresh(video)

        return web.json_response(video.dict())


@video_router.delete("/api/video/{id}")
async def delete_video(req: web.Request):
    try:
        video_id = req.match_info.get("id")
        if not video_id:
            return web.Response(status=HTTPStatus.BAD_REQUEST, text="Missing video ID")

        with get_session() as session:
            video = session.get(VideoDB, video_id)
            if not video:
                return web.Response(status=HTTPStatus.NOT_FOUND, text="Video not found")

            for path_id in [
                video.videoPathId,
                video.thumbnailPathId,
                video.vttPathId,
                video.vttSpritePathId,
            ]:
                try:
                    file = session.get(FileDB, path_id)
                    if file and file.filePath:
                        path = Path(file.filePath)
                        if path.exists():
                            path.unlink()
                        session.delete(file)
                except Exception as e:
                    print(f"Failed to delete file for ID '{path_id}': {e}")

            session.delete(video)
            session.commit()

            instance = Ytdlp.get_instance(video_id)
            if instance:
                instance.cancel()
                Ytdlp.remove_instance(video_id)

            return web.json_response({"id": video_id, "status": "deleted"})

    except Exception as e:
        print("DELETE /api/video", e)
        return web.json_response({"error": str(e)}, status=500)
