import asyncio

from sqlmodel import or_, select
from src.db import VideoDB, get_session
from src.schemas import DownloadStatus
from src.Ytdlp import Ytdlp
from src.schemas import Video


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
                    print("[INFO] No videos in queue.")
                    return

                for video_db in videos:
                    video = Video(**video_db.dict())
                    ytdlp = Ytdlp(video)
                    self.video_downloaders[video.id] = ytdlp
                    task = asyncio.create_task(ytdlp.download_video())
                    self.download_tasks.append(task)

                print(
                    f"[INFO] Started {len(self.download_tasks)} download task(s).")
        except Exception as e:
            print("DownloadStarter.start", e)


download_starter = DownloadStarter()
