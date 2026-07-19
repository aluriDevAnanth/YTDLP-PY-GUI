from src.schemas import Notify, Startup, VideoProgress
from src.sockets import client_set, sio


class SioEmitter:

    @staticmethod
    async def _emit_to_client(event: str, data, sid: str | None = None):
        if sid is not None:
            if sid in client_set:
                await sio.emit(event, data, to=sid)
            return

        if not client_set:
            return

        for client_id in list(client_set):
            await sio.emit(event, data, to=client_id)

    @staticmethod
    async def message(data):
        await SioEmitter._emit_to_client("message", data)

    @staticmethod
    async def status_update(vp: VideoProgress):
        await SioEmitter._emit_to_client("status_update", vp.model_dump())

    @staticmethod
    async def notify(notification: Notify):
        await SioEmitter._emit_to_client("notify", notification.model_dump())

    @staticmethod
    async def startupp(startup: Startup):
        await SioEmitter._emit_to_client("startupp", startup.model_dump())

    @staticmethod
    async def startupp_to_sid(sid: str, startup: Startup):
        await SioEmitter._emit_to_client("startupp", startup.model_dump(), sid=sid)

    @staticmethod
    async def remove_video(id: str):
        await SioEmitter._emit_to_client("remove_video", id)
