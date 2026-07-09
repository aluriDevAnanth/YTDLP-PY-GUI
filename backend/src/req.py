import asyncio
import os
import platform
import shutil
import time
import urllib.request
from pathlib import Path

from src.schemas import TriStatus
from src.SioEmitter import SioEmitter, Startup

REQ_DIR = Path("req")
REQ_DIR.mkdir(exist_ok=True)

OS_CONFIGS = {
    "windows": (
        "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
        ".zip",
        ["ffmpeg.exe", "ffprobe.exe"],
    ),
    "darwin": (
        "https://evermeet.cx",
        ".zip",
        ["ffmpeg", "ffprobe"],
    ),
    "linux": (
        "https://johnvansickle.com",
        ".tar.xz",
        ["ffmpeg", "ffprobe"],
    ),
}


def is_ffmpeg_available() -> bool:
    """Checks if FFmpeg is available on the system PATH or locally in req/."""
    if shutil.which("ffmpeg"):
        print("ℹ️  FFmpeg is already available on the system PATH.")
        return True

    exe_name = "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg"
    if (REQ_DIR / exe_name).exists():
        print(f"ℹ️  FFmpeg is already available locally at: {REQ_DIR / exe_name}")
        return True
    return False


def download_ffmpeg(progress_callback=None):
    """Downloads, extracts, and moves FFmpeg binaries with size, speed, and ETA metrics."""
    os_name = platform.system().lower()
    if os_name not in OS_CONFIGS:
        raise OSError(f"Unsupported operating system: {os_name}")

    url, ext, exe_names = OS_CONFIGS[os_name]
    archive_path = REQ_DIR / f"ffmpeg_download{ext}"
    temp_extract_dir = REQ_DIR / "temp_extract"

    try:
        opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler())
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
        )

        print(f"📥 Connecting to {url}...")
        with opener.open(req, timeout=45) as response:
            total_size = int(response.headers.get("Content-Length", 0))
            total_mbs = total_size / (1024 * 1024)
            downloaded = 0
            last_percent = -1
            start_time = time.time()

            with open(archive_path, "wb") as out_file:
                while True:
                    chunk = response.read(65536)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    downloaded += len(chunk)

                    if total_size > 0 and progress_callback:
                        percent = min(int((downloaded / total_size) * 100), 100)

                        if percent != last_percent:
                            elapsed = time.time() - start_time
                            speed_mbs = (
                                (downloaded / (1024 * 1024)) / elapsed
                                if elapsed > 0
                                else 0
                            )
                            downloaded_mbs = downloaded / (1024 * 1024)

                            remaining_mbs = total_mbs - downloaded_mbs
                            if speed_mbs > 0:
                                eta_secs = int(remaining_mbs / speed_mbs)
                                mins, secs = divmod(eta_secs, 60)
                                hours, mins = divmod(mins, 60)
                                eta_str = (
                                    f"{hours}:{mins:02d}:{secs:02d}"
                                    if hours > 0
                                    else f"{mins:02d}:{secs:02d}"
                                )
                            else:
                                eta_str = "--:--"

                            progress_callback(
                                percent, speed_mbs, total_mbs, downloaded_mbs, eta_str
                            )
                            last_percent = percent

        print("📦 Extracting FFmpeg...")
        shutil.unpack_archive(archive_path, temp_extract_dir)

        binaries_found = False
        for root, _, files in os.walk(temp_extract_dir):
            for file in files:
                if file in exe_names:
                    dst = REQ_DIR / file
                    if dst.exists():
                        dst.unlink()
                    shutil.move(os.path.join(root, file), dst)
                    if platform.system() != "Windows":
                        dst.chmod(0o755)
                    print(f"✅ {file} installed at: {dst}")
                    binaries_found = True

        if not binaries_found:
            raise FileNotFoundError(
                "FFmpeg binaries were not found inside extracted archive structures."
            )
    except Exception as e:
        print(f"❌ Error : {str(e)}")
        raise Exception(str(e))
    finally:
        if archive_path.exists():
            archive_path.unlink()
        if temp_extract_dir.exists():
            shutil.rmtree(temp_extract_dir, ignore_errors=True)


async def handle_ffmpeg_download_sequence(sid):
    """Handles the download sequence safely with real-time tracking metrics and live ETA formatting."""
    exe_name = "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg"
    local_ffmpeg = Path("req") / exe_name

    try:
        if not is_ffmpeg_available():
            loop = asyncio.get_running_loop()

            def report_progress(percent, speed_mbs, total_mbs, downloaded_mbs, eta_str):
                asyncio.run_coroutine_threadsafe(
                    SioEmitter.startupp(
                        Startup(
                            message=f"📥 Downloading FFmpeg... {percent}% | {downloaded_mbs:.1f} MB of {total_mbs:.1f} MB ({speed_mbs:.2f} MB/s) | ETA: {eta_str}",
                            typee=TriStatus.ONGOING,
                        )
                    ),
                    loop,
                )

            await SioEmitter.startupp(
                Startup(
                    message=f"📥 Downloading FFmpeg for {platform.system()}... 0% | 0.0 MB of 0.0 MB (0.00 MB/s) | ETA: --:--",
                    typee=TriStatus.ONGOING,
                )
            )
            await asyncio.sleep(0.2)

            await asyncio.to_thread(download_ffmpeg, progress_callback=report_progress)

        await SioEmitter.startupp(
            Startup(
                message=f"ℹ️ FFmpeg is available locally at: {local_ffmpeg}",
                typee=TriStatus.SUCCESS,
            )
        )

    except Exception as e:
        await SioEmitter.startupp(
            Startup(
                message=f"❌ Error setting up FFmpeg: {str(e)}",
                typee=TriStatus.ERROR,
            )
        )
