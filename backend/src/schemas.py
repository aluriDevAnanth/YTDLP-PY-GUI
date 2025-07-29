from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field


class DownloadStatus(str, Enum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class Format(str, Enum):
    BEST = "best"
    AUDIOONLY = "audio_only"
    WORST = "worst"


class Video(BaseModel):
    id: str
    videoId: str
    url: str = ""
    fullTitle: str = ""
    durationString: str = ""
    resolution: str = ""
    size: str = ""
    downloadStatus: str = DownloadStatus.QUEUED
    audioOnly: bool = False
    watched: bool = False
    downloaded: bool = False
    prevWatchTime: int = 0
    format: str = Format.BEST
    type: str = "download"
    videoPathId: str = ""
    thumbnailPathId: str = ""
    vttPathId: str = ""
    vttSpritePathId: str = ""


class VideoProgress(BaseModel):
    id: str
    videoId: str
    eta: str
    percent: str
    speed: str
    downloadedSize: str
    totalSize: str


class Notify(BaseModel):
    severity: str
    summary: str
    detail: str
    extraData: dict = {}


class ThumbnailVTTConfig(BaseModel):
    temp_dir: Path = Field(default=Path("./downloads/temp/thumbs"))
    vtt_output_dir: Path = Field(default=Path("./downloads/vtt"))
    sprite_output_dir: Path = Field(default=Path("./downloads/sprite"))
    interval: int = Field(default=10, gt=0, description="Seconds between thumbnails")
    columns: int = Field(default=10, gt=0, description="Number of thumbnails per row")

    @property
    def fps(self) -> float:
        return 1 / self.interval
