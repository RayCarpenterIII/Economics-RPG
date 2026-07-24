"""Export Python content definitions to deterministic JSON."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import json

from egglands.content import build_content_manifest
OUTPUT = PROJECT_ROOT / "artifacts" / "manifests" / "content-manifest.json"


def export_content(output: Path = OUTPUT) -> Path:
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(build_content_manifest(), sort_keys=True, indent=2) + "\n"
    output.write_text(payload, encoding="utf-8")
    return output


def main() -> None:
    output = export_content()
    print(f"Exported content manifest: {output}")


if __name__ == "__main__":
    main()
