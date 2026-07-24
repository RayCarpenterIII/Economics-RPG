"""Validated live-state bridge between the browser game and Python.

v0.27 adds market-state observation for a read-only Python market authority. The browser remains authoritative while
Python receives compact, validated game-state summaries for diagnostics and
future migration work.
"""
from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass, field
import math
from threading import Lock
import time
from typing import Any, Mapping

from .protocol import PROTOCOL_VERSION

MAX_BODY_BYTES = 256 * 1024
MAX_INVENTORY_KEYS = 64
MAX_HISTORY = 120
MAX_ECONOMY_KEYS = 64


class BridgeValidationError(ValueError):
    """Raised when a browser bridge payload is malformed or unsafe."""


def _mapping(value: Any, field_name: str) -> Mapping[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, Mapping):
        raise BridgeValidationError(f"{field_name} must be an object")
    return value


def _text(value: Any, default: str = "", maximum: int = 80) -> str:
    if value is None:
        return default
    return str(value).strip()[:maximum]


def _integer(
    value: Any,
    default: int = 0,
    minimum: int | None = None,
    maximum: int | None = None,
) -> int:
    try:
        result = int(value)
    except (TypeError, ValueError):
        result = default
    if minimum is not None:
        result = max(minimum, result)
    if maximum is not None:
        result = min(maximum, result)
    return result


def _number(
    value: Any,
    default: float = 0.0,
    minimum: float | None = None,
    maximum: float | None = None,
) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        result = default
    if not math.isfinite(result):
        result = default
    if minimum is not None:
        result = max(minimum, result)
    if maximum is not None:
        result = min(maximum, result)
    return result


def _inventory_counts(value: Any) -> dict[str, int]:
    if not isinstance(value, Mapping):
        return {}
    result: dict[str, int] = {}
    for key, raw in list(value.items())[:MAX_INVENTORY_KEYS]:
        name = _text(key, maximum=48)
        if not name:
            continue
        result[name] = _integer(raw, minimum=0, maximum=2_000_000_000)
    return result


def _numeric_map(value: Any) -> dict[str, float]:
    if not isinstance(value, Mapping):
        return {}
    result: dict[str, float] = {}
    for key, raw in list(value.items())[:MAX_ECONOMY_KEYS]:
        name = _text(key, maximum=48).lower().replace(" ", "_")
        if not name:
            continue
        result[name] = _number(raw, minimum=0.0, maximum=2_000_000_000.0)
    return result


@dataclass(slots=True)
class BrowserGameState:
    protocol_version: int
    client_version: str
    session_id: str
    sequence: int
    captured_at_ms: int
    received_at_ms: int
    remote_address: str
    save_version: int
    scene: str
    active_panel: str
    selected_class: str
    town_name: str
    agent_count: int
    world_day: float
    world_time: float
    player_name: str
    player_race: str
    player_ancestry: str
    player_x: float
    player_y: float
    player_health: float
    player_max_health: float
    player_stamina: float
    player_level: int
    player_xp: int
    player_gold: int
    player_mounted: bool
    raptor_count: int
    tamed_raptor_count: int
    inventory_slots_used: int
    inventory_counts: dict[str, int] = field(default_factory=dict)
    town_population: int = 0
    town_building_count: int = 0
    market_inventory: dict[str, float] = field(default_factory=dict)
    market_prices: dict[str, float] = field(default_factory=dict)
    material_stock: dict[str, float] = field(default_factory=dict)
    material_prices: dict[str, float] = field(default_factory=dict)
    legacy_keys: list[str] = field(default_factory=list)

    @classmethod
    def from_payload(
        cls,
        payload: Mapping[str, Any],
        remote_address: str = "",
    ) -> "BrowserGameState":
        protocol_version = _integer(payload.get("protocol_version"), minimum=0)
        if protocol_version != PROTOCOL_VERSION:
            raise BridgeValidationError(
                f"protocol_version must be {PROTOCOL_VERSION}, received {protocol_version}"
            )
        session_id = _text(payload.get("session_id"), maximum=96)
        if not session_id:
            raise BridgeValidationError("session_id is required")
        game = _mapping(payload.get("game"), "game")
        player = _mapping(payload.get("player"), "player")
        raptors = _mapping(payload.get("raptors"), "raptors")
        economy = _mapping(payload.get("economy"), "economy")
        inventory = _inventory_counts(player.get("inventory_counts"))
        market_inventory = _numeric_map(economy.get("market_inventory"))
        market_prices = _numeric_map(economy.get("market_prices"))
        material_stock = _numeric_map(economy.get("material_stock"))
        material_prices = _numeric_map(economy.get("material_prices"))
        legacy_keys_value = game.get("legacy_keys", [])
        legacy_keys: list[str] = []
        if isinstance(legacy_keys_value, list):
            for value in legacy_keys_value[:64]:
                cleaned = _text(value, maximum=48)
                if cleaned:
                    legacy_keys.append(cleaned)
        now_ms = int(time.time() * 1000)
        return cls(
            protocol_version=protocol_version,
            client_version=_text(payload.get("client_version"), "unknown", 32),
            session_id=session_id,
            sequence=_integer(payload.get("sequence"), minimum=0, maximum=2_000_000_000),
            captured_at_ms=_integer(payload.get("captured_at_ms"), now_ms, minimum=0),
            received_at_ms=now_ms,
            remote_address=_text(remote_address, maximum=80),
            save_version=_integer(game.get("save_version"), minimum=0, maximum=1_000_000),
            scene=_text(game.get("scene"), "unknown", 48),
            active_panel=_text(game.get("active_panel"), "none", 48),
            selected_class=_text(game.get("selected_class"), "unselected", 48),
            town_name=_text(game.get("town_name"), "unknown", 80),
            agent_count=_integer(game.get("agent_count"), minimum=0, maximum=1_000_000),
            world_day=_number(game.get("world_day"), minimum=0.0, maximum=1_000_000_000.0),
            world_time=_number(game.get("world_time"), minimum=0.0, maximum=1_000_000_000.0),
            player_name=_text(player.get("name"), "Player", 64),
            player_race=_text(player.get("race"), "unknown", 48),
            player_ancestry=_text(player.get("ancestry"), "unknown", 48),
            player_x=_number(player.get("x"), minimum=-1_000_000.0, maximum=1_000_000.0),
            player_y=_number(player.get("y"), minimum=-1_000_000.0, maximum=1_000_000.0),
            player_health=_number(player.get("health"), minimum=-1_000_000.0, maximum=1_000_000.0),
            player_max_health=_number(player.get("max_health"), minimum=0.0, maximum=1_000_000.0),
            player_stamina=_number(player.get("stamina"), minimum=0.0, maximum=1_000_000.0),
            player_level=_integer(player.get("level"), minimum=0, maximum=1_000_000),
            player_xp=_integer(player.get("xp"), minimum=0, maximum=2_000_000_000),
            player_gold=_integer(player.get("gold"), minimum=-2_000_000_000, maximum=2_000_000_000),
            player_mounted=bool(player.get("mounted", False)),
            raptor_count=_integer(raptors.get("count"), minimum=0, maximum=1_000_000),
            tamed_raptor_count=_integer(raptors.get("tamed_count"), minimum=0, maximum=1_000_000),
            inventory_slots_used=_integer(player.get("inventory_slots_used"), minimum=0, maximum=1_000_000),
            inventory_counts=inventory,
            town_population=_integer(economy.get("town_population"), minimum=0, maximum=1_000_000),
            town_building_count=_integer(economy.get("town_building_count"), minimum=0, maximum=1_000_000),
            market_inventory=market_inventory,
            market_prices=market_prices,
            material_stock=material_stock,
            material_prices=material_prices,
            legacy_keys=legacy_keys,
        )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class BridgeStore:
    """Thread-safe in-memory store for recent browser observations."""

    def __init__(self, stale_after_seconds: float = 12.0) -> None:
        self._lock = Lock()
        self._latest: BrowserGameState | None = None
        self._history: deque[BrowserGameState] = deque(maxlen=MAX_HISTORY)
        self._received_count = 0
        self._session_count = 0
        self._current_session_id: str | None = None
        self._stale_after_seconds = float(stale_after_seconds)

    def ingest(self, payload: Mapping[str, Any], remote_address: str = "") -> BrowserGameState:
        if not isinstance(payload, Mapping):
            raise BridgeValidationError("request body must be a JSON object")
        state = BrowserGameState.from_payload(payload, remote_address)
        with self._lock:
            new_session = state.session_id != self._current_session_id
            if not new_session and self._latest is not None and state.sequence < self._latest.sequence:
                raise BridgeValidationError("sequence moved backwards within the current session")
            if new_session:
                self._session_count += 1
                self._current_session_id = state.session_id
            self._latest = state
            self._history.append(state)
            self._received_count += 1
        return state

    def reset(self) -> None:
        with self._lock:
            self._latest = None
            self._history.clear()
            self._received_count = 0
            self._session_count = 0
            self._current_session_id = None

    def history(self, limit: int = 30) -> list[dict[str, Any]]:
        limit = max(1, min(MAX_HISTORY, int(limit)))
        with self._lock:
            values = list(self._history)[-limit:]
        return [value.to_dict() for value in values]

    def status(self) -> dict[str, Any]:
        now_ms = int(time.time() * 1000)
        with self._lock:
            latest = self._latest
            received_count = self._received_count
            session_count = self._session_count
            current_session_id = self._current_session_id
        if latest is None:
            return {
                "status": "waiting",
                "connected": False,
                "protocol_version": PROTOCOL_VERSION,
                "received_count": received_count,
                "session_count": session_count,
                "current_session_id": current_session_id,
                "age_seconds": None,
                "latest": None,
            }
        age_seconds = max(0.0, (now_ms - latest.received_at_ms) / 1000.0)
        connected = age_seconds <= self._stale_after_seconds
        return {
            "status": "connected" if connected else "stale",
            "connected": connected,
            "protocol_version": PROTOCOL_VERSION,
            "received_count": received_count,
            "session_count": session_count,
            "current_session_id": current_session_id,
            "age_seconds": round(age_seconds, 3),
            "latest": latest.to_dict(),
        }
