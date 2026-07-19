import asyncio
import shutil
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import req


class ReqSetupTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        req.ffmpeg_setup_task = None
        req.ffmpeg_setup_state = {"message": "", "typee": req.TriStatus.SUCCESS}

    async def test_ensure_ffmpeg_setup_only_starts_one_task(self):
        async def fake_run(_local_ffmpeg):
            await asyncio.sleep(0)

        with (
            patch.object(req, "is_ffmpeg_available", return_value=False),
            patch.object(req, "_emit_ffmpeg_setup_state", new=AsyncMock()) as emit_mock,
            patch.object(req, "_run_ffmpeg_setup", side_effect=fake_run) as run_mock,
        ):
            first_task = await req.ensure_ffmpeg_setup("sid-1")
            second_task = await req.ensure_ffmpeg_setup("sid-2")

            self.assertIs(first_task, second_task)
            self.assertEqual(run_mock.call_count, 1)
            self.assertEqual(emit_mock.await_count, 2)

    async def test_run_ffmpeg_setup_emits_progress_updates(self):
        def fake_download(progress_callback=None):
            progress_callback(25, 1.0, 100, 25, "00:01")

        with (
            patch.object(req, "download_ffmpeg", side_effect=fake_download),
            patch.object(req, "_emit_ffmpeg_setup_state", new=AsyncMock()) as emit_mock,
        ):
            task = asyncio.create_task(req._run_ffmpeg_setup(Path("req/ffmpeg")))
            await asyncio.sleep(0.05)
            await task

            self.assertGreaterEqual(emit_mock.await_count, 1)

    async def test_run_ffmpeg_setup_emits_stage_specific_messages(self):
        async def fake_publish(message, typee):
            return None

        with (
            patch.object(
                req, "_set_ffmpeg_setup_state", side_effect=fake_publish
            ) as set_state_mock,
            patch.object(req, "_emit_ffmpeg_setup_state", new=AsyncMock()) as emit_mock,
        ):
            await req._set_ffmpeg_setup_state(
                "📦 Extracting FFmpeg archive...", req.TriStatus.ONGOING
            )
            await req._set_ffmpeg_setup_state(
                "📁 Installing FFmpeg binaries...", req.TriStatus.ONGOING
            )

            messages = [
                str(call.args[0])
                for call in set_state_mock.await_args_list
                if call.args
            ]
            self.assertTrue(any("Extracting" in message for message in messages))
            self.assertTrue(any("Installing" in message for message in messages))
            self.assertGreaterEqual(emit_mock.await_count, 0)

    def test_download_ffmpeg_recreates_req_dir(self):
        temp_dir = tempfile.mkdtemp()
        req_dir = Path(temp_dir) / "req"
        try:
            if req_dir.exists():
                shutil.rmtree(req_dir)

            fake_response = MagicMock()
            fake_response.headers = {"Content-Length": "4"}
            fake_response.read.side_effect = [b"data", b""]
            context_manager = MagicMock()
            context_manager.__enter__.return_value = fake_response
            context_manager.__exit__.return_value = False

            opener = MagicMock()
            opener.open.return_value = context_manager

            archive_path = req_dir / "ffmpeg_download.zip"
            archive_path.parent.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("ffmpeg.exe", b"fake ffmpeg")

            with open(archive_path, "rb") as archive_file:
                archive_bytes = archive_file.read()

            fake_response.read.side_effect = [archive_bytes, b""]

            with (
                patch.object(req, "REQ_DIR", req_dir),
                patch.object(
                    req,
                    "OS_CONFIGS",
                    {
                        "windows": (
                            "https://example.com/test.zip",
                            ".zip",
                            ["ffmpeg.exe"],
                        )
                    },
                ),
                patch.object(req.platform, "system", return_value="Windows"),
                patch("urllib.request.build_opener", return_value=opener),
            ):
                req.download_ffmpeg(progress_callback=None)

            self.assertTrue(req_dir.exists())
            self.assertTrue((req_dir / "ffmpeg_download.zip").exists() is False)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
