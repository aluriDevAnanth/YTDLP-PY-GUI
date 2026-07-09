from src.schemas import Notify, Startup, VideoProgress
from src.sockets import client_set, sio


class SioEmitter:

    @staticmethod
    async def message(data):
        await sio.emit("message", data, to=next(iter(client_set)))

    @staticmethod
    async def status_update(vp: VideoProgress):
        await sio.emit("status_update", vp.model_dump(), to=next(iter(client_set)))

    @staticmethod
    async def notify(notification: Notify):
        await sio.emit("notify", notification.model_dump(), to=next(iter(client_set)))

    @staticmethod
    async def startupp(startup: Startup):
        await sio.emit("startupp", startup.model_dump(), to=next(iter(client_set)))

    @staticmethod
    async def remove_video(id: str):
        await sio.emit("remove_video", id, to=next(iter(client_set)))
