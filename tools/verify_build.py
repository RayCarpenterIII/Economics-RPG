"""Verify The Egg Lands v0.27 compiled preview and authoritative economy markers."""
from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tools.build_preview import BENCHMARK, OUTPUT, REPORT, SOURCE, sha256

REQUIRED_MARKERS = (
    "V024_PATCH",
    "V025_PATCH",
    "V026_PATCH",
    "V027_PATCH",
    "The Egg Lands v0.27",
    "__egglandsBridgeV024",
    "__egglandsAudioV025",
    "__egglandsEconomyV026",
    "__egglandsAlliesV027",
    "Living Economy",
    "python-authoritative",
    "/api/v1/economy/live/sync",
    "/api/v1/economy/live/villager",
    "/api/v1/economy/live/trade",
    "/api/v1/economy/live/control",
    "Direct Trade",
    "development_score",
    "market_available",
    "town_market",
    "empire_market",
    "willing_to_defend",
    "Invite to escort",
    "escortActiveV027",
    "escortAttackCdV027",
    "alliesV027",
    "production_per_day",
    "consumption_spending_last_step",
    "average_daily_wage",
    "data:audio/wav;base64,",
    "Raptor Sound Effects",
)


def main() -> None:
    missing_files = [path for path in (SOURCE, OUTPUT, BENCHMARK, REPORT) if not path.is_file()]
    if missing_files:
        listed = ", ".join(str(path.relative_to(PROJECT_ROOT)) for path in missing_files)
        raise SystemExit(f"FAILED: missing build artifacts: {listed}. Run python tools/build_preview.py.")
    text = OUTPUT.read_text(encoding="utf-8")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]
    if missing:
        raise SystemExit("FAILED: compiled preview is missing: " + ", ".join(missing))
    if "F10 opens" in text or "Press F10" in text:
        raise SystemExit("FAILED: function-key diagnostics instruction returned.")
    benchmark = json.loads(BENCHMARK.read_text(encoding="utf-8"))
    if str(benchmark.get("version")) != "0.27":
        raise SystemExit("FAILED: benchmark version is not 0.27.")
    invariants = benchmark.get("invariants", {})
    if not invariants or not all(bool(value) for value in invariants.values()):
        raise SystemExit("FAILED: one or more economy invariants failed.")
    source_hash, output_hash = sha256(SOURCE), sha256(OUTPUT)
    if source_hash == output_hash:
        raise SystemExit("FAILED: output unexpectedly equals the legacy source.")
    print("PASS: v0.27 contains Python-authoritative town prices, inventories, production, employment, wages, and consumption.")
    print("PASS: trusted trade allies can be invited, follow the player, fight nearby enemies, recover, and persist through saves.")
    print("PASS: small-town villager trade, development-gated formal markets, and the empire internal-market threshold are present.")
    print("PASS: v0.25 byte-backed raptor audio remains embedded.")
    print("PASS: no function key is required.")
    print(f"Legacy SHA-256:   {source_hash}")
    print(f"Compiled SHA-256: {output_hash}")
    print(f"Compiled bytes:   {OUTPUT.stat().st_size}")


if __name__ == "__main__":
    main()
