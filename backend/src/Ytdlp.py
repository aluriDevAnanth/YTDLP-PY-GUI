import asyncio
import math
import platform
import re
import shutil
from enum import Enum
from pathlib import Path

import ffmpeg
from PIL import Image
from sqlmodel import select, update
from src.db import FileDB, VideoDB, get_session
from src.logger import get_logger
from src.req import REQ_DIR
from src.schemas import DownloadStatus, ThumbnailVTTConfig, Video, VideoProgress
from src.SioEmitter import SioEmitter
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

logger = get_logger("backend.ytdlp")

ANSI_ESCAPE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")

BASE_DIR = Path(__file__).resolve().parent.parent
DOWNLOAD_DIR = BASE_DIR / "downloads"
VIDEO_DIR = DOWNLOAD_DIR / "videos"
THUMB_DIR = DOWNLOAD_DIR / "thumbnails"
SPRITE_DIR = DOWNLOAD_DIR / "sprite"
VTT_DIR = DOWNLOAD_DIR / "vtt"


class FilePathType(str, Enum):
    VIDEO = "videoFilePath"
    THUMBNAIL = "thumbnailFilePath"
    VTT = "vttFilePath"
    SPRITE = "spriteFilePath"


class Ytdlp:
    _instances: dict[str, "Ytdlp"] = {}

    def __init__(self, video: Video):
        self.canceled = False
        self.once = True
        self.video = video
        self.loop = asyncio.get_event_loop()
        self.canceled = False

        Ytdlp._instances[video.id] = self

        self.thumb_vtt_config = ThumbnailVTTConfig(interval=1)
        self.thumb_vtt_config.temp_dir = DOWNLOAD_DIR / "temp" / "thumbs"
        self.thumb_vtt_config.vtt_output_dir = VTT_DIR
        self.thumb_vtt_config.sprite_output_dir = SPRITE_DIR

        for path in [THUMB_DIR, SPRITE_DIR, VTT_DIR, self.thumb_vtt_config.temp_dir]:
            path.mkdir(parents=True, exist_ok=True)

    @classmethod
    def get_instance(cls, video_id: str) -> "Ytdlp | None":
        return cls._instances.get(video_id)

    @classmethod
    def remove_instance(cls, video_id: str) -> None:
        cls._instances.pop(video_id, None)

    @classmethod
    def all_instances(cls) -> list["Ytdlp"]:
        return list(cls._instances.values())

    def clean_ansi(self, text: str) -> str:
        return ANSI_ESCAPE.sub("", text).strip()

    def cancel(self):
        self.canceled = True

    async def download_video(self):
        ydl_opts = {
            "outtmpl": str(
                VIDEO_DIR
                / "%(height)sp_%(extractor_key)s___%(title).50s___%(id)s.%(ext)s"
            ),
            "format": (
                "bestvideo+bestaudio/best"
                if self.video.format == "BEST"
                else self.video.format.lower()
            ),
            "restrictfilenames": True,
            "noplaylist": True,
            "nooverwrites": True,
            "force_overwrites": False,
            "cachedir": False,
            "quiet": True,
            "no_warnings": True,
            "simulate": False,
            "progress_hooks": [self._progress_wrapper],
            "writethumbnail": True,
            "embedthumbnail": True,
            "addmetadata": True,
            "embedmetadata": True,
            "retries": 3,
            "fragment_retries": 5,
            "continuedl": True,
            "concurrent_fragment_downloads": 5,
            "continue": True,
            "part": True,
            "merge_output_format": "mp4",
            "writeinfojson": True,
            "ffmpeg_location": REQ_DIR,
            # "skip_download": True,
            # "verbose": True,
        }

        try:
            with YoutubeDL(ydl_opts) as ydl:
                await self.loop.run_in_executor(
                    None, lambda: ydl.download([self.video.url])
                )
        except Exception as e:
            try:
                logger.exception("Ytdlp download failed")
                with get_session() as session:
                    logger.debug("Removing video %s", self.video.id)
                    video = session.get(VideoDB, self.video.id)
                    if video:
                        session.delete(video)
                        session.commit()
                    instance = Ytdlp.get_instance(self.video.id)
                    if instance:
                        instance.cancel()
                        logger.info(
                            "Removing video with id %s and url %s because of a download failure",
                            self.video.id,
                            self.video.url,
                        )
                        Ytdlp.remove_instance(self.video.id)
                        await SioEmitter.remove_video(self.video.id)
            except Exception as e:
                logger.exception("Failed while cleaning up a failed download")

    def _progress_wrapper(self, d):
        if self.canceled:
            file_path = d.get("filename")
            if file_path:
                try:
                    path = Path(file_path + ".part")
                    if path.exists():
                        path.unlink()
                        logger.info("Canceled and deleted video file: %s", file_path)
                except Exception as e:
                    logger.exception("Failed to delete video file %s", file_path)

            try:
                thumb_path = d["info_dict"]["thumbnails"][-1].get("filepath")
                if thumb_path:
                    thumb = Path(thumb_path)
                    if thumb.exists():
                        thumb.unlink()
                        logger.info("Canceled and deleted thumbnail: %s", thumb_path)
            except Exception as e:
                logger.exception("Failed to delete thumbnail %s", thumb_path)

            raise DownloadError("[Ytdlp] Canceled by user.")

        try:
            asyncio.run_coroutine_threadsafe(self.ytdlp_progress_hook(d), self.loop)
        except Exception as e:
            logger.exception("Error in progress hook emit")

    async def ytdlp_progress_hook(self, d):
        try:
            cleaned_percent = self.clean_ansi(d.get("_percent_str", "0"))
            cleaned_downloadedSize = self.clean_ansi(
                d.get("_downloaded_bytes_str", "0")
            )
            cleaned_totalSize = self.clean_ansi(d.get("_total_bytes_str", "0"))
            cleaned_eta = self.clean_ansi(d.get("_eta_str", "0"))
            cleaned_speed = self.clean_ansi(d.get("_speed_str", "0"))

            if d["status"] == "downloading":
                if self.once:
                    self.once = False
                    self.video.videoId = d["info_dict"]["id"]
                    self.video.fullTitle = d["info_dict"]["fulltitle"]
                    self.video.durationString = d["info_dict"]["duration_string"]
                    self.video.resolution = d["info_dict"].get("resolution", "")
                    self.video.size = cleaned_totalSize
                    await SioEmitter.message(self.video.model_dump())
                    with get_session() as session:
                        stmt = (
                            update(VideoDB)
                            .where(VideoDB.id == self.video.id)  # type: ignore
                            .values(**self.video.model_dump())
                        )

                        session.exec(stmt)  # type: ignore
                        session.commit()

                vp = VideoProgress(
                    id=self.video.id,
                    videoId=d["info_dict"]["id"],
                    percent=cleaned_percent,
                    downloadedSize=cleaned_downloadedSize,
                    totalSize=cleaned_totalSize,
                    eta=cleaned_eta,
                    speed=cleaned_speed,
                )

                await SioEmitter.status_update(vp)

            else:
                self.video.downloadStatus = DownloadStatus.COMPLETED
                self.video.videoId = d["info_dict"]["id"]
                self.video.fullTitle = d["info_dict"]["fulltitle"]
                self.video.durationString = d["info_dict"]["duration_string"]
                self.video.resolution = d["info_dict"].get("resolution", "")
                self.video.size = cleaned_totalSize

                self.video.videoPathId = self.setFileGetID(
                    Path(d.get("filename")).as_posix(),
                )

                original_thumb_path = Path(d["info_dict"]["thumbnails"][-1]["filepath"])
                final_thumb_path = THUMB_DIR / original_thumb_path.name
                shutil.move(str(original_thumb_path), str(final_thumb_path))

                self.video.thumbnailPathId = self.setFileGetID(
                    final_thumb_path.as_posix(),
                )

                vtt_path = await self.thumbgen(d)
                if vtt_path:
                    self.video.vttPathId = self.setFileGetID(
                        vtt_path.as_posix(),
                    )

                with get_session() as session:
                    stmt = (
                        update(VideoDB)
                        .where(VideoDB.id == self.video.id)  # type: ignore
                        .values(**self.video.model_dump())
                    )

                    session.exec(stmt)  # type: ignore
                    session.commit()

                vp = VideoProgress(
                    id=self.video.id,
                    videoId=d["info_dict"]["id"],
                    percent=cleaned_percent,
                    downloadedSize=cleaned_downloadedSize,
                    totalSize=cleaned_totalSize,
                    eta=cleaned_eta,
                    speed=cleaned_speed,
                )

                await SioEmitter.status_update(vp)

                await SioEmitter.message(self.video.model_dump())

        except Exception as e:
            logger.exception("YTDLP progress hook failed")

    async def thumbgen(self, d: dict):
        thumbs_dir = None
        try:
            filepath = d.get("filename")
            if not filepath or not Path(filepath).exists():
                logger.warning("No valid filepath in hook data.")
                return

            filepath = Path(filepath)
            video_name = filepath.stem
            thumbs_dir = self.thumb_vtt_config.temp_dir / video_name
            thumbs_dir.mkdir(parents=True, exist_ok=True)

            thumb_pattern = str(thumbs_dir / "thumb%04d.jpg")

            binary_name = "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg"
            ffmpeg_path = Path("req") / binary_name

            try:
                (
                    ffmpeg.input(str(filepath))
                    .output(
                        thumb_pattern,
                        vf=f"fps=1/{self.thumb_vtt_config.interval}",
                        loglevel="error",
                    )
                    .run(cmd=str(ffmpeg_path))
                )
            except ffmpeg.Error as e:
                logger.exception("FFmpeg thumbnail generation failed")
                return

            thumbs = sorted(thumbs_dir.glob("thumb*.jpg"))
            if not thumbs:
                logger.warning("No thumbnails found.")
                return

            with Image.open(thumbs[0]) as first_thumb:
                thumb_w, thumb_h = first_thumb.size

            columns = self.thumb_vtt_config.columns
            rows = math.ceil(len(thumbs) / columns)
            sprite = Image.new("RGB", (columns * thumb_w, rows * thumb_h))

            sprite_name = f"{video_name}_sprite.jpg"
            sprite_path = SPRITE_DIR / sprite_name

            for idx, thumb_path in enumerate(thumbs):
                x = (idx % columns) * thumb_w
                y = (idx // columns) * thumb_h
                with Image.open(thumb_path) as img:
                    sprite.paste(img, (x, y))

            sprite.save(sprite_path)
            logger.info("Sprite saved: %s", sprite_path)

            self.video.vttSpritePathId = self.setFileGetID(sprite_path.as_posix())

            def format_timestamp(total_seconds: int) -> str:
                hrs = total_seconds // 3600
                mins = (total_seconds % 3600) // 60
                secs = total_seconds % 60
                return f"{hrs:02}:{mins:02}:{secs:02}.000"

            interval = self.thumb_vtt_config.interval
            vtt_lines = ["WEBVTT\n"]

            sprite_url = self.video.vttSpritePathId

            for idx in range(len(thumbs)):
                x = (idx % columns) * thumb_w
                y = (idx // columns) * thumb_h
                start_time = format_timestamp(idx * interval)
                end_time = format_timestamp((idx + 1) * interval)
                vtt_lines.append(f"{start_time} --> {end_time}")
                vtt_lines.append(f"{sprite_url}#xywh={x},{y},{thumb_w},{thumb_h}\n")

            vtt_path = VTT_DIR / f"{video_name}_thumbs.vtt"
            vtt_path.write_text("\n".join(vtt_lines), encoding="utf-8")
            logger.info("VTT saved: %s", vtt_path)

            return vtt_path

        except Exception as e:
            logger.exception("Thumb generation failed")
            import traceback

            traceback.print_exc()
            return None
        finally:
            if thumbs_dir and thumbs_dir.exists():
                try:
                    shutil.rmtree(thumbs_dir)
                    logger.info("Cleaned up: %s", thumbs_dir)
                except Exception as e:
                    logger.exception("Failed to cleanup %s", thumbs_dir)

    def setFileGetID(self, file_path: str) -> str:
        try:
            with get_session() as session:
                stmt = select(FileDB).where(FileDB.filePath == file_path)
                result = session.exec(stmt)
                existing = result.one_or_none()

                if existing:
                    return str(existing.id)

                new_file = FileDB(filePath=file_path)
                session.add(new_file)
                session.commit()
                session.refresh(new_file)
                return str(new_file.id)

        except Exception as e:
            logger.exception("Ytdlp.setFileGetID failed")
            return ""
