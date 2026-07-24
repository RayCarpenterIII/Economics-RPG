"""Dependency-free local server for The Egg Lands v0.27."""
from __future__ import annotations

import argparse
import json
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Timer
from urllib.parse import parse_qs, urlparse

from egglands.audio import load_raptor_audio_library
from egglands.content import build_content_manifest
from egglands.economy import (
    EconomyConfig,
    LiveEconomyError,
    LiveTownEconomyStore,
    MarketAuthorityStore,
    ShadowEconomyStore,
    run_economy_scenario,
)
from egglands.simulation.bridge import MAX_BODY_BYTES, BridgeStore, BridgeValidationError

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_GAME = PROJECT_ROOT / "artifacts" / "previews" / "the-egg-lands-v0.27-trade-ally-escort-preview.html"
BENCHMARK = PROJECT_ROOT / "artifacts" / "benchmarks" / "v0.27-economy-benchmark.json"
ECONOMY_DASHBOARD = PROJECT_ROOT / "web" / "economy.html"
BRIDGE_DASHBOARD = PROJECT_ROOT / "web" / "bridge.html"
BUILD_REPORT = PROJECT_ROOT / "artifacts" / "BUILD_REPORT.txt"
LIVE_STATE_PATH = PROJECT_ROOT / "artifacts" / "live-economy-state.json"
BRIDGE_STORE = BridgeStore()
SHADOW_STORE = ShadowEconomyStore()
AUTHORITY_STORE = MarketAuthorityStore()
LIVE_ECONOMY_STORE = LiveTownEconomyStore(LIVE_STATE_PATH)
AUDIO_LIBRARY = load_raptor_audio_library()
AUDIO_MANIFEST = AUDIO_LIBRARY.to_manifest()
AUDIO_FILES = {clip.path.name: clip.path for clip in AUDIO_LIBRARY.clips}


def health_payload() -> dict[str, object]:
    return {
        "status": "ok",
        "phase": 3,
        "project_version": "0.27",
        "legacy_game_version": 92,
        "compiled_game_exists": DEFAULT_GAME.is_file(),
        "python_economy": True,
        "live_bridge": True,
        "shadow_economy": True,
        "bridge_mode": "python-authoritative-town-economy",
        "market_authority_pilot": False,
        "authoritative_town_prices": True,
        "authoritative_town_inventory": True,
        "python_production": True,
        "python_employment": True,
        "python_wages": True,
        "python_consumption": True,
        "villager_trade": True,
        "development_gated_markets": True,
        "empire_internal_market_foundation": True,
        "byte_backed_audio": True,
        "audio_clip_count": len(AUDIO_LIBRARY.clips),
        "audio_bytes": AUDIO_LIBRARY.total_audio_bytes,
        "authority": AUTHORITY_STORE.status(),
        "bridge": BRIDGE_STORE.status(),
        "shadow": SHADOW_STORE.status(),
        "live_economy": LIVE_ECONOMY_STORE.status(),
    }


def _live_payload_from_bridge(state: object) -> dict[str, object]:
    return {
        "session_id": getattr(state, "session_id"),
        "sequence": getattr(state, "sequence"),
        "world_day": getattr(state, "world_day"),
        "towns": [
            {
                "town_name": getattr(state, "town_name"),
                "population": getattr(state, "town_population") or getattr(state, "agent_count") or 1,
                "building_count": getattr(state, "town_building_count"),
                "world_day": getattr(state, "world_day"),
                "market_inventory": getattr(state, "market_inventory"),
                "market_prices": getattr(state, "market_prices"),
                "material_stock": getattr(state, "material_stock"),
                "material_prices": getattr(state, "material_prices"),
                "villagers": [],
            }
        ],
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "EggLands/0.27"

    def sendb(self, body: bytes, content_type: str, status: HTTPStatus = HTTPStatus.OK) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def sendj(self, payload: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, sort_keys=True, indent=2).encode("utf-8")
        self.sendb(body, "application/json; charset=utf-8", status)

    def do_OPTIONS(self) -> None:
        self.sendb(b"", "text/plain; charset=utf-8", HTTPStatus.NO_CONTENT)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        if path in {"/", "/index.html", "/game"}:
            return self.sendb(DEFAULT_GAME.read_bytes(), "text/html; charset=utf-8")
        if path == "/economy":
            return self.sendb(ECONOMY_DASHBOARD.read_bytes(), "text/html; charset=utf-8")
        if path == "/bridge":
            return self.sendb(BRIDGE_DASHBOARD.read_bytes(), "text/html; charset=utf-8")
        if path == "/build-report":
            return self.sendb(BUILD_REPORT.read_bytes(), "text/plain; charset=utf-8")
        if path == "/health":
            return self.sendj(health_payload())
        if path == "/api/v1/content":
            return self.sendj(build_content_manifest())
        if path == "/api/v1/audio/manifest":
            return self.sendj(AUDIO_MANIFEST)
        if path.startswith("/audio/raptor/"):
            filename = path.rsplit("/", 1)[-1]
            audio_path = AUDIO_FILES.get(filename)
            if audio_path is None:
                return self.sendj({"status": "error", "message": "audio clip not found"}, HTTPStatus.NOT_FOUND)
            return self.sendb(audio_path.read_bytes(), "audio/wav")
        if path == "/api/v1/economy/snapshot":
            return self.sendj(json.loads(BENCHMARK.read_text(encoding="utf-8")))
        if path == "/api/v1/economy/run":
            try:
                config = EconomyConfig(
                    int(query.get("population", ["1000"])[0]),
                    int(query.get("days", ["365"])[0]),
                    int(query.get("seed", ["20260724"])[0]),
                )
                return self.sendj(run_economy_scenario(config).to_dict())
            except (ValueError, TypeError) as error:
                return self.sendj({"status": "error", "message": str(error)}, HTTPStatus.BAD_REQUEST)
        if path == "/api/v1/bridge/status":
            return self.sendj(BRIDGE_STORE.status())
        if path == "/api/v1/bridge/history":
            try:
                limit = int(query.get("limit", ["30"])[0])
            except ValueError:
                limit = 30
            return self.sendj({"status": BRIDGE_STORE.status(), "history": BRIDGE_STORE.history(limit)})
        if path == "/api/v1/economy/shadow":
            session_id = query.get("session_id", [None])[0]
            return self.sendj(SHADOW_STORE.status(session_id))
        if path == "/api/v1/economy/authority":
            session_id = query.get("session_id", [None])[0]
            return self.sendj(AUTHORITY_STORE.status(session_id))
        if path == "/api/v1/economy/live":
            session_id = query.get("session_id", [None])[0]
            return self.sendj(LIVE_ECONOMY_STORE.status(session_id))
        if path == "/api/v1/economy/live/town":
            session_id = str(query.get("session_id", [""])[0])
            town_name = str(query.get("town_name", [""])[0])
            try:
                return self.sendj(LIVE_ECONOMY_STORE.town_status(session_id, town_name))
            except LiveEconomyError as error:
                return self.sendj({"status": "error", "message": str(error)}, HTTPStatus.BAD_REQUEST)
        if path == "/api/v1/economy/authority/history":
            try:
                limit = int(query.get("limit", ["30"])[0])
            except ValueError:
                limit = 30
            return self.sendj({"status": AUTHORITY_STORE.status(), "history": AUTHORITY_STORE.history(limit)})
        if path == "/api/v1/economy/shadow/history":
            try:
                limit = int(query.get("limit", ["30"])[0])
            except ValueError:
                limit = 30
            return self.sendj({"status": SHADOW_STORE.status(), "history": SHADOW_STORE.history(limit)})
        return self.sendj({"status": "error", "message": "Not found"}, HTTPStatus.NOT_FOUND)

    def _read_json(self) -> object:
        raw_length = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_length)
        except ValueError as error:
            raise BridgeValidationError("invalid Content-Length") from error
        if length < 0 or length > MAX_BODY_BYTES:
            raise BridgeValidationError(f"request body exceeds {MAX_BODY_BYTES} bytes")
        body = self.rfile.read(length)
        if not body:
            return {}
        try:
            return json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise BridgeValidationError("request body must be valid UTF-8 JSON") from error

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            payload = self._read_json()
            if path == "/api/v1/bridge/state":
                state = BRIDGE_STORE.ingest(payload, self.client_address[0])
                shadow = SHADOW_STORE.ingest(state)
                authority_proposal = AUTHORITY_STORE.propose(state, shadow)
                live = LIVE_ECONOMY_STORE.sync(_live_payload_from_bridge(state))
                return self.sendj(
                    {
                        "status": "accepted",
                        "ack_sequence": state.sequence,
                        "session_id": state.session_id,
                        "bridge": BRIDGE_STORE.status(),
                        "shadow": shadow.to_dict(),
                        "authority_proposal": authority_proposal.to_dict(),
                        "authoritative_economy": live,
                    },
                    HTTPStatus.ACCEPTED,
                )
            if path == "/api/v1/economy/live/sync":
                return self.sendj({"status": "accepted", "economy": LIVE_ECONOMY_STORE.sync(payload)}, HTTPStatus.ACCEPTED)
            if path == "/api/v1/economy/live/villager":
                if not isinstance(payload, dict):
                    raise LiveEconomyError("request body must be an object")
                profile = LIVE_ECONOMY_STORE.villager_profile(
                    str(payload.get("session_id") or ""),
                    str(payload.get("town_name") or ""),
                    payload.get("villager") if isinstance(payload.get("villager"), dict) else payload,
                )
                return self.sendj({"status": "ready", "villager": profile})
            if path == "/api/v1/economy/live/trade":
                return self.sendj(LIVE_ECONOMY_STORE.trade(payload), HTTPStatus.ACCEPTED)
            if path == "/api/v1/economy/live/control":
                return self.sendj({"status": "accepted", "economy": LIVE_ECONOMY_STORE.set_control(payload)}, HTTPStatus.ACCEPTED)
            if path == "/api/v1/economy/live/reset":
                LIVE_ECONOMY_STORE.reset()
                return self.sendj(LIVE_ECONOMY_STORE.status())
            if path == "/api/v1/bridge/reset":
                BRIDGE_STORE.reset()
                SHADOW_STORE.reset()
                AUTHORITY_STORE.reset()
                LIVE_ECONOMY_STORE.reset()
                return self.sendj({"bridge": BRIDGE_STORE.status(), "shadow": SHADOW_STORE.status(), "authority": AUTHORITY_STORE.status(), "live_economy": LIVE_ECONOMY_STORE.status()})
            if path == "/api/v1/economy/shadow/reset":
                SHADOW_STORE.reset()
                AUTHORITY_STORE.reset()
                return self.sendj({"shadow": SHADOW_STORE.status(), "authority": AUTHORITY_STORE.status()})
            if path == "/api/v1/economy/authority/apply":
                try:
                    application = AUTHORITY_STORE.record_application(payload)
                except ValueError as error:
                    raise BridgeValidationError(str(error)) from error
                return self.sendj({"status": "recorded", "application": application.to_dict(), "authority": AUTHORITY_STORE.status()}, HTTPStatus.ACCEPTED)
            if path == "/api/v1/economy/authority/reset":
                AUTHORITY_STORE.reset()
                return self.sendj(AUTHORITY_STORE.status())
        except (BridgeValidationError, LiveEconomyError) as error:
            return self.sendj({"status": "error", "message": str(error)}, HTTPStatus.BAD_REQUEST)
        return self.sendj({"status": "error", "message": "Not found"}, HTTPStatus.NOT_FOUND)

    def log_message(self, fmt: str, *args: object) -> None:
        print("[egglands]", fmt % args)


def create_server(host: str = "127.0.0.1", port: int = 8000) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), Handler)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    server = create_server(args.host, args.port)
    url = f"http://{args.host}:{args.port}"
    print("The Egg Lands v0.27")
    print("Serving:", url)
    print("Economy dashboard:", url + "/economy")
    print("Live bridge dashboard:", url + "/bridge")
    print("Authoritative economy API:", url + "/api/v1/economy/live")
    print("Villager trade API:", url + "/api/v1/economy/live/trade")
    print("Raptor audio manifest:", url + "/api/v1/audio/manifest")
    print("Press Ctrl+C to stop.")
    if not args.no_browser:
        Timer(0.7, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
