"""Load and validate deterministic WAV sound assets."""
from __future__ import annotations

import hashlib
import json
import wave
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAPTOR_AUDIO_DIR = ROOT / "assets" / "audio" / "raptor"


class AudioAssetError(RuntimeError):
    """Raised when an audio asset is missing, silent, or malformed."""


@dataclass(frozen=True, slots=True)
class AudioClip:
    key: str
    category: str
    path: Path
    byte_length: int
    duration_seconds: float
    sample_rate: int
    channels: int
    sample_width: int
    frame_count: int
    sha256: str
    nonzero_pcm_bytes: int

    @property
    def is_nonempty(self) -> bool:
        return self.byte_length > 44 and self.frame_count > 0 and self.nonzero_pcm_bytes > 0


@dataclass(frozen=True, slots=True)
class AudioLibrary:
    version: str
    clips: tuple[AudioClip, ...]

    @property
    def total_audio_bytes(self) -> int:
        return sum(clip.byte_length for clip in self.clips)

    def by_category(self, category: str) -> tuple[AudioClip, ...]:
        return tuple(clip for clip in self.clips if clip.category == category)

    def require_categories(self, *categories: str) -> None:
        missing = [category for category in categories if not self.by_category(category)]
        if missing:
            raise AudioAssetError("Missing audio categories: " + ", ".join(missing))

    def to_manifest(self) -> dict:
        return {
            "version": self.version,
            "total_audio_bytes": self.total_audio_bytes,
            "clip_count": len(self.clips),
            "clips": [
                {
                    "key": clip.key,
                    "file": clip.path.name,
                    "category": clip.category,
                    "bytes": clip.byte_length,
                    "duration_seconds": clip.duration_seconds,
                    "sample_rate": clip.sample_rate,
                    "channels": clip.channels,
                    "sample_width": clip.sample_width,
                    "frame_count": clip.frame_count,
                    "sha256": clip.sha256,
                    "nonzero_pcm_bytes": clip.nonzero_pcm_bytes,
                }
                for clip in self.clips
            ],
        }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_clip(path: Path, category: str) -> AudioClip:
    if not path.is_file():
        raise AudioAssetError(f"Missing audio file: {path}")
    try:
        with wave.open(str(path), "rb") as handle:
            channels = handle.getnchannels()
            sample_width = handle.getsampwidth()
            sample_rate = handle.getframerate()
            frame_count = handle.getnframes()
            pcm = handle.readframes(frame_count)
    except (wave.Error, EOFError) as error:
        raise AudioAssetError(f"Invalid WAV file {path}: {error}") from error
    if channels not in (1, 2):
        raise AudioAssetError(f"Unsupported channel count in {path}: {channels}")
    if sample_width != 2:
        raise AudioAssetError(f"Expected signed 16-bit PCM in {path}, got {sample_width * 8}-bit")
    if sample_rate < 8_000:
        raise AudioAssetError(f"Sample rate is too low in {path}: {sample_rate}")
    if frame_count <= 0:
        raise AudioAssetError(f"Audio file has no frames: {path}")
    nonzero = sum(1 for value in pcm if value != 0)
    if nonzero == 0:
        raise AudioAssetError(f"Audio file is silent: {path}")
    return AudioClip(
        key=path.stem,
        category=category,
        path=path,
        byte_length=path.stat().st_size,
        duration_seconds=round(frame_count / sample_rate, 6),
        sample_rate=sample_rate,
        channels=channels,
        sample_width=sample_width,
        frame_count=frame_count,
        sha256=_sha256(path),
        nonzero_pcm_bytes=nonzero,
    )


def load_raptor_audio_library(directory: Path = RAPTOR_AUDIO_DIR) -> AudioLibrary:
    manifest_path = directory / "manifest.json"
    if not manifest_path.is_file():
        raise AudioAssetError(f"Missing audio manifest: {manifest_path}")
    try:
        raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise AudioAssetError(f"Invalid audio manifest: {error}") from error
    clips = []
    for entry in raw.get("clips", []):
        filename = str(entry.get("file", "")).strip()
        category = str(entry.get("category", "")).strip()
        if not filename or not category:
            raise AudioAssetError("Every audio manifest entry requires file and category")
        clips.append(_read_clip(directory / filename, category))
    if not clips:
        raise AudioAssetError("Audio manifest contains no clips")
    library = AudioLibrary(version=str(raw.get("version", "unknown")), clips=tuple(clips))
    library.require_categories("bite_hit", "bite_miss", "mount", "dismount", "idle")
    return library
