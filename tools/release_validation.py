"""Run the complete v0.27 release validation and write one report."""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "artifacts" / "previews" / "the-egg-lands-v0.27-trade-ally-escort-preview.html"
REPORT = ROOT / "artifacts" / "v0.27-validation.json"
PLAYTEST = ROOT / "artifacts" / "v0.27-character-playtest.json"
SERVER_TEST = ROOT / "artifacts" / "v0.27-server-integration.json"


def run_command(name: str, command: list[str]) -> dict:
    completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    return {
        "name": name,
        "passed": completed.returncode == 0,
        "returncode": completed.returncode,
        "stdout": completed.stdout[-6000:],
        "stderr": completed.stderr[-6000:],
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_javascript() -> list[Path]:
    text = HTML.read_text(encoding="utf-8")
    outer_match = re.search(r"<script>\s*(\(async function\(\)\{.*?\}\)\(\);)\s*</script>", text, re.S)
    bridge = re.search(r"const V024_PATCH=String\.raw`(.*?)`;\n\n  const V025_PATCH", text, re.S)
    audio = re.search(r"const V025_PATCH=String\.raw`(.*?)`;\n\n  const V026_PATCH", text, re.S)
    economy = re.search(r"const V026_PATCH=String\.raw`(.*?)`;\n\n  const V027_PATCH", text, re.S)
    allies = re.search(r"const V027_PATCH=String\.raw`(.*?)`;\n\n  function transformLoader", text, re.S)
    if not all((outer_match, bridge, audio, economy, allies)):
        raise RuntimeError("one or more compiled JavaScript layers could not be extracted")
    definitions = [
        ("v0.27-outer-loader.js", outer_match.group(1)),
        ("v0.27-bridge-patch.js", re.search(r'<script id="phase2-v024-script">(.*?)</script>', bridge.group(1).replace("<\\/script>", "</script>"), re.S).group(1)),
        ("v0.27-audio-patch.js", re.search(r'<script id="raptor-byte-audio-v025-script">(.*?)</script>', audio.group(1).replace("<\\/script>", "</script>"), re.S).group(1)),
        ("v0.27-economy-patch.js", re.search(r'<script id="authoritative-economy-v026-script">(.*?)</script>', economy.group(1).replace("<\\/script>", "</script>"), re.S).group(1)),
        ("v0.27-ally-patch.js", re.search(r'<script id="trade-ally-v027-script">(.*?)</script>', allies.group(1).replace("<\\/script>", "</script>"), re.S).group(1)),
    ]
    paths = []
    for name, source in definitions:
        path = ROOT / "artifacts" / name
        path.write_text(source, encoding="utf-8")
        paths.append(path)
    return paths


def main() -> None:
    checks: list[dict] = []
    checks.append(run_command("build", [sys.executable, "tools/build_preview.py"]))
    checks.append(run_command("python_compile", [sys.executable, "-m", "compileall", "-q", "egglands", "tools", "tests"]))
    checks.append(run_command("unit_tests", [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"]))
    checks.append(run_command("build_verifier", [sys.executable, "tools/verify_build.py"]))
    checks.append(run_command("character_playtest", [sys.executable, "tools/browser_playtest.py"]))
    checks.append(run_command("server_integration", [sys.executable, "tools/server_integration_test.py"]))
    try:
        for path in extract_javascript():
            checks.append(run_command(path.stem + "_syntax", ["node", "--check", str(path)]))
    except Exception as error:
        checks.append({"name": "javascript_extraction", "passed": False, "error": repr(error)})

    playtest = json.loads(PLAYTEST.read_text(encoding="utf-8")) if PLAYTEST.is_file() else None
    server_test = json.loads(SERVER_TEST.read_text(encoding="utf-8")) if SERVER_TEST.is_file() else None
    text = HTML.read_text(encoding="utf-8")
    static = {
        "settings_based_controls": "Living Economy" in text and "syncEconomyV026" in text,
        "no_function_key_dependency": "F10 opens" not in text and "Press F10" not in text,
        "authoritative_price_inventory": all(marker in text for marker in ["market_inventory", "market_prices", "/api/v1/economy/live/sync"]),
        "python_labor_flows": all(marker in text for marker in ["employment_rate", "average_daily_wage", "payroll_last_step", "consumption_spending_last_step"]),
        "real_input_chains": all(marker in (ROOT / "egglands" / "economy" / "live.py").read_text() for marker in ["PRODUCTION_INPUTS", "intermediate_consumed_last_step", '"tools"', '"bread"']),
        "development_gated_market": all(marker in text for marker in ["market_available", "No formal market", "Formal town market"]),
        "villager_demand_trade": all(marker in text for marker in ["Direct Trade", "They want to buy", "They are selling", "/api/v1/economy/live/trade"]),
        "trade_relationships": all(marker in text for marker in ["protection_score", "willing_to_defend", "tradeAllyV026"]),
        "autonomous_trade_ally_escort": all(marker in text for marker in ["__egglandsAlliesV027", "escortActiveV027", "Invite to escort", "Recall active allies"]),
        "autonomous_trade_ally_combat": all(marker in text for marker in ["nearestEnemy", "hurtEnemy", "escortAttackCdV027", "downed while defending"]),
        "escort_save_persistence": all(marker in text for marker in ["alliesV027", "escortHpV027", "escortDownTimerV027"]),
        "empire_market_foundation": all(marker in text for marker in ["empire_market", "EMPIRE_THRESHOLD=3", "Conquered towns pool stock"]),
        "standalone_fallback": "standalone-demand-economy" in text,
        "byte_backed_raptor_audio": "data:audio/wav;base64," in text and "__egglandsAudioV025" in text,
        "three_races_and_classes": all(marker in text for marker in ["human", "tiefling", "khajit", "warrior", "mage", "noble"]),
    }
    all_passed = all(check.get("passed", False) for check in checks) and all(static.values())
    report = {
        "project_version": "0.27",
        "phase": 3,
        "status": "passed" if all_passed else "failed",
        "compiled_file": HTML.name,
        "compiled_bytes": HTML.stat().st_size,
        "compiled_sha256": sha256(HTML),
        "protocol_version": 6,
        "economy_mode": "python-authoritative-town-economy",
        "authority_scope": ["town_inventory", "town_prices", "production", "employment", "wages", "consumption"],
        "trade_modes": ["villagers", "town_market", "empire_market"],
        "checks": checks,
        "static_checks": static,
        "character_playtest": {"status": playtest.get("status") if playtest else "missing", "passed": playtest.get("passed") if playtest else 0, "total": playtest.get("total") if playtest else 0},
        "server_integration": {"status": server_test.get("status") if server_test else "missing", "passed": server_test.get("passed") if server_test else 0, "total": server_test.get("total") if server_test else 0},
        "limitations": [
            "Direct Chromium navigation through the remote pinned legacy loader is blocked by the execution environment, so the compiled patches were executed in a controlled headless character shell.",
            "The actual local Python HTTP server and authoritative economy APIs were tested end to end independently.",
            "Trade allies now escort and fight autonomously, but their behavior is intentionally limited to nearby threats and does not yet include strategic formations, equipment loadouts, or large-squad command.",
            "Conquered-town control and the three-territory empire market are implemented; the complete raid-to-annexation campaign loop remains a later government/combat integration.",
        ],
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
