"""End-to-end HTTP integration test for The Egg Lands v0.27."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from threading import Thread
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from egglands.server.app import (
    AUTHORITY_STORE,
    BRIDGE_STORE,
    LIVE_ECONOMY_STORE,
    SHADOW_STORE,
    create_server,
)
from egglands.simulation.protocol import PROTOCOL_VERSION

REPORT = ROOT / "artifacts" / "v0.27-server-integration.json"


def get_json(url: str) -> dict:
    with urlopen(url, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def get_bytes(url: str) -> tuple[bytes, str]:
    with urlopen(url, timeout=5) as response:
        return response.read(), response.headers.get_content_type()


def post_json(url: str, payload: dict) -> dict:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def town(name: str, population: int, buildings: int, day: float, fish: float = 2.0) -> dict:
    return {
        "town_name": name,
        "population": population,
        "building_count": buildings,
        "world_day": day,
        "market_inventory": {"fish": fish, "grain": 120, "ore": 8, "cloth": 3},
        "market_prices": {"fish": 1.0, "grain": 0.8, "ore": 1.5, "cloth": 2.0},
        "material_stock": {"logs": 30, "stone": 20, "parts": 4},
        "material_prices": {"logs": 0.9, "stone": 1.0, "parts": 1.8},
        "villagers": [
            {"id": f"{name}-mira", "name": "Mira", "activity": "fishing at the shore", "wealth": 80},
            {"id": f"{name}-orin", "name": "Orin", "activity": "working at the quarry", "wealth": 55},
        ],
    }


def run() -> dict:
    BRIDGE_STORE.reset()
    SHADOW_STORE.reset()
    AUTHORITY_STORE.reset()
    LIVE_ECONOMY_STORE.reset()
    server = create_server("127.0.0.1", 0)
    port = server.server_address[1]
    base = f"http://127.0.0.1:{port}"
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    checks: list[dict] = []
    errors: list[str] = []

    def check(name: str, passed: bool, detail=None) -> None:
        item = {"name": name, "passed": bool(passed)}
        if detail is not None:
            item["detail"] = detail
        checks.append(item)

    try:
        health = get_json(base + "/health")
        check(
            "health",
            health.get("project_version") == "0.27"
            and health.get("bridge_mode") == "python-authoritative-town-economy"
            and health.get("authoritative_town_prices") is True
            and health.get("authoritative_town_inventory") is True
            and health.get("python_production") is True
            and health.get("python_employment") is True
            and health.get("python_wages") is True
            and health.get("python_consumption") is True
            and health.get("villager_trade") is True
            and health.get("audio_bytes", 0) > 100000,
            health,
        )
        audio_manifest = get_json(base + "/api/v1/audio/manifest")
        check("audio_regression", audio_manifest.get("clip_count", 0) >= 10 and audio_manifest.get("total_audio_bytes", 0) > 100000, audio_manifest)
        bite_bytes, bite_type = get_bytes(base + "/audio/raptor/bite_hit_1.wav")
        check("audio_file_bytes", bite_type == "audio/wav" and bite_bytes[:4] == b"RIFF" and bite_bytes[8:12] == b"WAVE", {"bytes": len(bite_bytes), "type": bite_type})

        session = "http-economy-v026"
        first = post_json(
            base + "/api/v1/economy/live/sync",
            {"session_id": session, "sequence": 1, "world_day": 1, "towns": [town("Smallford", 18, 0, 1), town("Egg Lands", 90, 5, 1)]},
        )
        economy = first.get("economy") or {}
        small = economy.get("towns", {}).get("Smallford", {})
        developed = economy.get("towns", {}).get("Egg Lands", {})
        check("small_town_direct_trade", small.get("trade_mode") == "villagers" and small.get("market_available") is False, small)
        check("developed_town_market", developed.get("trade_mode") == "town_market" and developed.get("market_available") is True, developed)
        check("employment_created", developed.get("employed_population", 0) > 0 and developed.get("employment_rate", 0) > 0, developed.get("employment"))

        second = post_json(
            base + "/api/v1/economy/live/sync",
            {"session_id": session, "sequence": 2, "world_day": 5, "towns": [town("Smallford", 18, 0, 5), town("Egg Lands", 90, 5, 5)]},
        ).get("economy", {})
        later = second.get("towns", {}).get("Egg Lands", {})
        check(
            "production_consumption_wages",
            later.get("item_flows", {}).get("fish", {}).get("produced_last_step", 0) > 0
            and later.get("item_flows", {}).get("fish", {}).get("consumed_last_step", 0) > 0
            and later.get("payroll_last_step", 0) > 0
            and later.get("consumption_spending_last_step", 0) > 0
            and later.get("average_daily_wage", 0) > 0,
            later,
        )
        check(
            "demand_changes_price_and_stock",
            later.get("market_inventory", {}).get("fish") != developed.get("market_inventory", {}).get("fish")
            and later.get("market_prices", {}).get("fish") != developed.get("market_prices", {}).get("fish"),
            {"before": developed.get("item_flows", {}).get("fish"), "after": later.get("item_flows", {}).get("fish")},
        )

        villager = {"id": "Smallford-mira", "name": "Mira", "activity": "fishing at the shore", "wealth": 80}
        profile = post_json(base + "/api/v1/economy/live/villager", {"session_id": session, "town_name": "Smallford", "villager": villager}).get("villager", {})
        check("villager_demand_visible", bool(profile.get("wants")) and bool(profile.get("offers")) and bool(profile.get("demand_summary")), profile)
        offered = (profile.get("offers") or [{}])[0]
        traded = post_json(
            base + "/api/v1/economy/live/trade",
            {
                "session_id": session,
                "town_name": "Smallford",
                "villager": villager,
                "side": "buy",
                "item_id": offered.get("item_id"),
                "quantity": 1,
                "player_gold": 100,
                "player_inventory": {},
            },
        )
        check(
            "villager_trade_updates_real_ledgers",
            traded.get("status") == "accepted"
            and traded.get("player_delta", {}).get("gold", 0) < 0
            and traded.get("villager", {}).get("trade_count") == 1
            and traded.get("villager", {}).get("trust", 0) > 0,
            traded,
        )

        empire_payload = {
            "session_id": session,
            "sequence": 3,
            "world_day": 5,
            "towns": [town("Northmarch", 20, 0, 5), town("Eastmere", 20, 0, 5), town("Southwatch", 20, 0, 5)],
        }
        post_json(base + "/api/v1/economy/live/sync", empire_payload)
        empire = None
        for name in ["Northmarch", "Eastmere", "Southwatch"]:
            empire = post_json(base + "/api/v1/economy/live/control", {"session_id": session, "town_name": name, "control": "conquered"}).get("economy")
        check("empire_market_unlock", bool(empire and empire.get("empire_trade_unlocked")) and empire.get("empire_territory_count") == 3, empire)
        check("empire_internal_trade_modes", all(empire["towns"][name].get("trade_mode") == "empire_market" for name in ["Northmarch", "Eastmere", "Southwatch"]), empire.get("towns") if empire else None)

        bridge_payload = {
            "protocol_version": PROTOCOL_VERSION,
            "client_version": "0.27",
            "session_id": "bridge-v026",
            "sequence": 1,
            "captured_at_ms": 100,
            "game": {"scene": "world", "town_name": "Bridge Town", "agent_count": 64, "world_day": 2},
            "player": {"name": "Ray", "race": "khajit", "gold": 50, "mounted": True},
            "raptors": {"count": 2, "tamed_count": 1, "mounted": True},
            "economy": {
                "town_population": 64,
                "town_building_count": 4,
                "market_inventory": {"fish": 2, "grain": 120},
                "market_prices": {"fish": 1.5, "grain": 0.8},
                "material_stock": {"stone": 20},
                "material_prices": {"stone": 1.1},
            },
        }
        accepted = post_json(base + "/api/v1/bridge/state", bridge_payload)
        check("bridge_returns_authoritative_economy", accepted.get("status") == "accepted" and accepted.get("ack_sequence") == 1 and accepted.get("authoritative_economy", {}).get("authoritative") is True, accepted)
        live_status = get_json(base + f"/api/v1/economy/live?session_id={session}")
        check("live_state_persists", live_status.get("sync_count", 0) >= 3 and len(live_status.get("towns", {})) >= 5, {"sync_count": live_status.get("sync_count"), "town_count": len(live_status.get("towns", {}))})
        content = get_json(base + "/api/v1/content")
        check("content_version", content.get("project_version") == "0.27" and content.get("schema_version") == 4 and content.get("phase") == 3, content)
    except Exception as error:  # pragma: no cover
        errors.append(repr(error))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    passed = sum(item["passed"] for item in checks)
    report = {
        "project_version": "0.27",
        "status": "passed" if passed == len(checks) and not errors else "failed",
        "passed": passed,
        "total": len(checks),
        "checks": checks,
        "errors": errors,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    result = run()
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["status"] == "passed" else 1)
