from contextlib import contextmanager
from typing import Optional
from enum import Enum
from pathlib import Path
import uuid

from sqlalchemy import create_engine
from sqlmodel import Field, SQLModel, Session

Path("./data").mkdir(parents=True, exist_ok=True)


class QualityFormat(str, Enum):
    BEST = "best"
    BESTAUDIO = "best"
    WORST = "best"


class DownloadType(str, Enum):
    DOWNLOAD = "download"
    SCAN = "scan"


class DownloadStatus(str, Enum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


def generateUUID() -> str:
    return str(uuid.uuid4()).replace("-", "_")


class VideoDB(SQLModel, table=True):
    id: str = Field(default_factory=generateUUID, primary_key=True)
    url: str = Field()
    format: QualityFormat = Field()
    type: DownloadType = Field()
    videoId: str = Field(alias="video_id")
    fullTitle: str = Field(alias="full_title")
    durationString: str = Field(alias="duration_string")
    size: str = Field()
    resolution: str = Field()
    downloadStatus: str = Field(alias="download_status", index=True)
    audioOnly: bool = Field()
    watched: bool = Field()
    downloaded: bool = Field()
    prevWatchTime: int = Field()
    videoPathId: str = Field()
    thumbnailPathId: str = Field()
    vttPathId: str = Field()
    vttSpritePathId: str = Field()


class FileDB(SQLModel, table=True):
    id: str = Field(default_factory=generateUUID, primary_key=True)
    filePath: str = Field(unique=True)


# Sync SQLAlchemy database engine
DATABASE_URL = "sqlite:///./data/data.db"
engine = create_engine(
    DATABASE_URL,
    # echo=True
)


# Init the database
def init_db():
    SQLModel.metadata.create_all(engine)


# Sync session context manager
@contextmanager
def get_session():
    with Session(engine) as session:
        yield session
