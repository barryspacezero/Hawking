"""Persistent storage helpers for saved voice profiles."""

import os
import shutil
from pathlib import Path

VOICE_PROFILES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "voice_profiles"
)
os.makedirs(VOICE_PROFILES_DIR, exist_ok=True)


def profile_dir(profile_id: int) -> str:
    return os.path.join(VOICE_PROFILES_DIR, str(profile_id))


def reference_path(profile_id: int, ext: str = ".wav") -> str:
    return os.path.join(profile_dir(profile_id), f"reference{ext}")


def conditioning_path(profile_id: int) -> str:
    return os.path.join(profile_dir(profile_id), "conditionals.pt")


def relative_reference_path(profile_id: int, ext: str = ".wav") -> str:
    return f"{profile_id}/reference{ext}"


def relative_conditioning_path(profile_id: int) -> str:
    return f"{profile_id}/conditionals.pt"


def resolve_profile_path(relative_path: str) -> str:
    return os.path.join(VOICE_PROFILES_DIR, relative_path)


def ensure_profile_dir(profile_id: int) -> str:
    path = profile_dir(profile_id)
    os.makedirs(path, exist_ok=True)
    return path


def delete_profile_files(profile_id: int) -> None:
    path = profile_dir(profile_id)
    if os.path.isdir(path):
        shutil.rmtree(path, ignore_errors=True)
