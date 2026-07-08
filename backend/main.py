import asyncio
import os
import platform
from contextlib import asynccontextmanager
from http import HTTPStatus
from pathlib import Path

import aiohttp_cors
import src.req
from aiohttp import web
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from src.db import FileDB, VideoDB, get_session, init_db
from src.DownloadStarter import download_starter
from src.schemas import Notify, Startup, TriStatus
from src.SioEmitter import SioEmitter
from src.sockets import client_set, sio
from src.video_route import video_router
from watchfiles import DefaultFilter, arun_process

app = web.Application()
sio.attach(app)


@sio.event
async def connect(sid, environ, auth):
    print(f"Client Connected: {sid}")
    client_set.add(sid)
    await SioEmitter.notify(
        Notify(
            severity="success",
            summary="Success",
            detail="Connected to SIO",
            extraData={},
        )
    )

    asyncio.create_task(handle_ffmpeg_download_sequence(sid))


async def handle_ffmpeg_download_sequence(sid):
    """Handles the download sequence safely without killing the socket connection lifecycle."""
    try:
        if not src.req.is_ffmpeg_available():
            await SioEmitter.startupp(
                Startup(
                    message=f"📥 Downloading FFmpeg for {platform.system()}...",
                    typee=TriStatus.ONGOING,
                )
            )
            await asyncio.sleep(0.2)

            await asyncio.to_thread(src.req.download_ffmpeg)

            exe_name = "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg"
            local_ffmpeg = Path("req") / exe_name
            await SioEmitter.startupp(
                Startup(
                    message=f"ℹ️ FFmpeg is already available locally at: {local_ffmpeg}",
                    typee=TriStatus.SUCCESS,
                )
            )
        else:
            exe_name = "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg"
            local_ffmpeg = Path("req") / exe_name
            await SioEmitter.startupp(
                Startup(
                    message=f"ℹ️ FFmpeg is already available locally at: {local_ffmpeg}",
                    typee=TriStatus.SUCCESS,
                )
            )
    except Exception as e:
        await SioEmitter.startupp(
            Startup(
                message=str(e),
                typee=TriStatus.ERROR,
            )
        )


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    client_set.discard(sid)


async def index(req):
    return web.json_response({111: 111})


VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm"}


async def serve_file(request: web.Request):
    file_id = request.match_info.get("fileId")
    if not file_id:
        return web.json_response(
            {"error": "File ID not provided."}, status=HTTPStatus.BAD_REQUEST
        )

    video_obj = None
    file_path = None

    try:
        with get_session() as session:
            stmt = select(FileDB).where(FileDB.id == file_id)
            result = session.exec(stmt)
            file_obj = result.one_or_none()

            if not file_obj or not file_obj.filePath:
                return web.json_response(
                    {"error": "File record or path not found."},
                    status=HTTPStatus.NOT_FOUND,
                )

            file_path = Path(file_obj.filePath)
            if not file_path.is_file():
                return web.json_response(
                    {"error": "File not found on disk."},
                    status=HTTPStatus.NOT_FOUND,
                )

            if file_path.suffix.lower() in VIDEO_EXTENSIONS:
                stmt = select(VideoDB).where(VideoDB.videoPathId == file_id)
                video_result = session.exec(stmt)
                video_obj = video_result.one_or_none()
                if video_obj:
                    video_obj.downloaded = True
                    session.add(video_obj)
                    session.commit()
                    # Deep-copy out data model before session terminates
                    video_data = video_obj.model_dump()

        if video_obj:
            await SioEmitter.message(video_data)

        return web.FileResponse(
            path=file_path,
            headers={"Content-Disposition": f'attachment; filename="{file_path.name}"'},
        )

    except Exception as e:
        print("[serve_file] Exception caught:", e)
        return web.json_response({"error": str(e)}, status=500)


app.add_routes([web.get("/api/", index), web.get("/api/files/{fileId:.*}", serve_file)])
app.add_routes(video_router)

cors = aiohttp_cors.setup(
    app,
    defaults={
        "http://localhost:5173": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        )
    },
)

for route in list(app.router.routes()):
    resource = route.resource
    if (
        resource is not None
        and hasattr(resource, "canonical")
        and not resource.canonical.startswith("/socket.io")
    ):
        cors.add(route)


async def callback(changes):
    await asyncio.sleep(0.2)
    os.system("cls" if os.name == "nt" else "clear")
    print("Changes detected:", changes)


async def run():
    init_db()
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host="localhost", port=8000)
    await site.start()
    download_starter.start()
    while True:
        await asyncio.sleep(3600)


class PyOnlyFilter(DefaultFilter):
    def __call__(self, change, path):
        return path.endswith(".py") and super().__call__(change, path)


def runn():
    asyncio.run(run())


if __name__ == "__main__":
    asyncio.run(
        arun_process(".", target=runn, callback=callback, watch_filter=PyOnlyFilter())
    )
