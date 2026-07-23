#!/usr/bin/env python3
"""Lightweight validation for The Egg Lands handoff HTML."""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REQUIRED_MARKERS = {
    "v87 title": "The Egg Lands - Origin Character Creator v87",
    "base source commit": "544ceaaf1a60d4c26ac058a601256d2f49e3077b",
    "loader cache key": "egglands_v87_loader_source_544ceaaf",
    "LPC asset commit": "b312d60647509b06339ba951c18f4f5ff9cb6b52",
    "startup creator": "origin-character-creator-v87-script",
}


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "index.html")
    if not path.is_file():
        fail(f"HTML file not found: {path}")

    text = path.read_text(encoding="utf-8")
    size = path.stat().st_size
    if size < 1_000_000:
        fail(f"File is unexpectedly small: {size:,} bytes")

    for label, marker in REQUIRED_MARKERS.items():
        if marker not in text:
            fail(f"Missing {label}: {marker}")
        print(f"PASS: {label}")

    if not text.lstrip().lower().startswith("<!doctype html>"):
        fail("Missing HTML doctype")
    print("PASS: HTML doctype")

    match = re.search(r"<script>\s*(.*?)\s*</script>\s*</body>", text, re.DOTALL | re.IGNORECASE)
    if not match:
        fail("Could not isolate the outer loader script")

    node = shutil.which("node")
    if node:
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as handle:
            handle.write(match.group(1))
            temp_path = Path(handle.name)
        try:
            result = subprocess.run(
                [node, "--check", str(temp_path)],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                fail("Outer loader JavaScript syntax failed:\n" + result.stderr.strip())
            print("PASS: outer loader JavaScript syntax")
        finally:
            temp_path.unlink(missing_ok=True)
    else:
        print("SKIP: Node.js is unavailable; outer loader syntax was not checked")

    print(f"PASS: {path} ({size:,} bytes)")


if __name__ == "__main__":
    main()
