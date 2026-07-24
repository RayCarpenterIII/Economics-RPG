"""Print a concise local environment report for The Egg Lands."""
from __future__ import annotations

import importlib.util
import platform
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    print("The Egg Lands v0.27 environment doctor")
    print("Python:", sys.version.replace("\n", " "))
    print("Executable:", sys.executable)
    print("Platform:", platform.platform())
    print("Project root:", ROOT)
    print("NumPy available:", bool(importlib.util.find_spec("numpy")))
    print("Legacy game present:", (ROOT / "legacy" / "the-egg-lands-v92-khajit-ground-fix.html").is_file())
    print("Compiled preview present:", (ROOT / "artifacts" / "previews" / "the-egg-lands-v0.27-raptor-audio-preview.html").is_file())


if __name__ == "__main__":
    main()
