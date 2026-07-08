import os
import platform
import shutil
import tarfile
import zipfile
from pathlib import Path

import requests

req_dir = Path("req")
req_dir.mkdir(exist_ok=True)
temp_dir = req_dir / "ffmpeg_temp"
temp_dir.mkdir(exist_ok=True)


def is_ffmpeg_available() -> bool:
    if shutil.which("ffmpeg"):
        print("ℹ️ FFmpeg is already available on the system PATH.")
        return True

    exe_name = "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg"
    local_ffmpeg = req_dir / exe_name
    if local_ffmpeg.exists():
        print(f"ℹ️ FFmpeg is already available locally at: {local_ffmpeg}")
        return True
    return False


def get_ffmpeg_url_and_ext():
    os_name = platform.system().lower()
    arch = platform.machine().lower()

    if os_name == "windows":
        return (
            "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
            ".zip",
        )

    elif os_name == "darwin":
        if "arm" in arch or "aarch64" in arch:
            return "https://evermeet.cx", ".zip"
        return "https://evermeet.cx", ".zip"

    elif os_name == "linux":
        if "arm" in arch or "aarch64" in arch:
            return "https://johnvansickle.com", ".tar.xz"
        return "https://johnvansickle.com", ".tar.xz"

    raise OSError(f"Unsupported operating system: {os_name}")


def extract_archive(archive_path, target_dir):
    if archive_path.suffix == ".zip":
        with zipfile.ZipFile(archive_path, "r") as zip_ref:
            zip_ref.extractall(target_dir)
    elif archive_path.suffix == ".xz" or archive_path.name.endswith(".tar.xz"):
        with tarfile.open(archive_path, "r:xz") as tar_ref:
            tar_ref.extractall(target_dir)


def download_ffmpeg():
    try:
        url, ext = get_ffmpeg_url_and_ext()
        archive_path = temp_dir / f"ffmpeg_download{ext}"

        print(f"📥 Downloading FFmpeg for {platform.system()}...")

        with requests.Session() as session:
            session.headers.update(
                {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                }
            )

            response = session.get(url, stream=True, allow_redirects=True, timeout=30)
            response.raise_for_status()

            with open(archive_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

        print("📦 Extracting FFmpeg...")
        extract_archive(archive_path, temp_dir)

        exe_names = (
            ["ffmpeg.exe", "ffprobe.exe"]
            if platform.system() == "Windows"
            else ["ffmpeg", "ffprobe"]
        )
        found_executables = {}

        for root, _, files in os.walk(temp_dir):
            for file in files:
                if file in exe_names:
                    src = Path(root) / file
                    dst = req_dir / file

                    if dst.exists():
                        dst.unlink()

                    shutil.move(str(src), str(dst))

                    if platform.system() != "Windows":
                        dst.chmod(0o755)

                    found_executables[file] = dst
                    print(f"✅ {file} installed at: {dst}")

        if "ffmpeg" in [Path(f).stem for f in exe_names] and not found_executables:
            print("⚠️ FFmpeg binary not found in the downloaded archive.")
        else:
            print("✅ FFmpeg setup complete!")

    except Exception as e:
        print(f"❌ Error during setup: {e}")
        raise Exception(f"❌ Error during ffmepg setup: {e}")
    finally:
        try:
            shutil.rmtree(temp_dir)
            print(f"[download_ffmpeg] 🧹 Cleaned up: {temp_dir}")
        except Exception as e:
            print(f"[download_ffmpeg] ⚠️ Failed to cleanup {temp_dir}: {e}")
