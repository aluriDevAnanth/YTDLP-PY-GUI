import asyncio

from sqlmodel import or_, select
from src.db import VideoDB, get_session
from src.logger import get_logger
from src.schemas import DownloadStatus, Video
from src.Ytdlp import Ytdlp

logger = get_logger("backend.download_starter")


class DownloadStarter:
    def __init__(self):
        self.video_downloaders: dict[str, Ytdlp] = {}
        self.download_tasks: list[asyncio.Task] = []

    def start(self):
        try:
            with get_session() as session:
                stmt = select(VideoDB).where(
                    or_(
                        VideoDB.downloadStatus == DownloadStatus.QUEUED,
                        VideoDB.downloadStatus == DownloadStatus.DOWNLOADING,
                    )
                )
                result = session.exec(stmt)
                videos = result.all()

                if not videos:
                    logger.info("No videos in queue.")
                    return

                for video_db in videos:
                    video = Video(**video_db.dict())
                    ytdlp = Ytdlp(video)
                    self.video_downloaders[video.id] = ytdlp
                    task = asyncio.create_task(ytdlp.download_video())
                    self.download_tasks.append(task)

                logger.info("Started %s download task(s).", len(self.download_tasks))
        except Exception as e:
            logger.exception("DownloadStarter.start failed")


download_starter = DownloadStarter()
