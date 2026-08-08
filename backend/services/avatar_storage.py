import io
import os
from pathlib import Path
from typing import Optional

from PIL import Image, UnidentifiedImageError

MAX_BYTES = 5 * 1024 * 1024
MAX_EDGE = 512
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/pjpeg",
}

_DEFAULT_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "avatars"


def avatar_dir() -> Path:
    root = os.environ.get("AVATAR_UPLOAD_DIR")
    path = Path(root) if root else _DEFAULT_DIR
    path.mkdir(parents=True, exist_ok=True)
    return path


def avatar_path(user_id: int) -> Path:
    return avatar_dir() / f"{user_id}.jpg"


def avatar_exists(user_id: int) -> bool:
    return avatar_path(user_id).is_file()


def delete_avatar(user_id: int) -> None:
    path = avatar_path(user_id)
    if path.is_file():
        path.unlink()


def save_avatar(user_id: int, raw: bytes, content_type: Optional[str]) -> None:
    if len(raw) > MAX_BYTES:
        raise ValueError("Image is too large. Maximum size is 5 MB.")

    ctype = (content_type or "").split(";")[0].strip().lower()
    if ctype and ctype not in ALLOWED_CONTENT_TYPES:
        raise ValueError("Unsupported image type. Use JPEG, PNG, or WebP.")

    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except UnidentifiedImageError as exc:
        raise ValueError("Could not read image file.") from exc

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    elif img.mode == "L":
        img = img.convert("RGB")

    img.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
    out = avatar_path(user_id)
    img.save(out, format="JPEG", quality=85, optimize=True)
