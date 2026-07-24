"""Live market-authority comparison for The Egg Lands v0.27.

The browser game is still authoritative. This module receives the market state
that the player is actually seeing and computes a deterministic Python-side
comparison without mutating money, stock, prices, saves, or game progression.
"""
from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass, field
import math
from threading import Lock
import time
from typing import Any, Mapping

MAX_SHADOW_HISTORY = 120

# Approximate daily demand per resident for the current legacy market labels.
# Values are deliberately conservative because v0.27 keeps the shadow model diagnostic while a separate manual price pilot is tested,
# not an authoritative economy release.
DEMAND_PER_CAPITA: dict[str, float] = {
    "fish": 0.10,
    "grain": 0.22,
    "ore": 0.018,
    "cloth": 0.008,
    "log": 0.025,
    "logs": 0.025,
    "timber": 0.025,
    "stone": 0.025,
    "part": 0.006,
    "parts": 0.006,
    "bread": 0.48,
    "meat": 0.10,
    "flour": 0.18,
    "tools": 0.003,
    "hides": 0.006,
    "iron_ore": 0.018,
}

BASE_PRICE_HINTS: dict[str, float] = {
    "fish": 1.0,
    "grain": 1.0,
    "ore": 1.4,
    "cloth": 1.8,
    "log": 1.0,
    "logs": 1.0,
    "timber": 1.0,
    "stone": 1.0,
    "part": 1.6,
    "parts": 1.6,
    "bread": 1.0,
    "meat": 1.4,
    "flour": 1.1,
    "tools": 3.0,
    "hides": 1.6,
    "iron_ore": 1.4,
}


def _clean_key(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_")[:48]


def _finite(value: Any, default: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return default
    return result if math.isfinite(result) else default


def _numeric_map(value: Any) -> dict[str, float]:
    if not isinstance(value, Mapping):
        return {}
    result: dict[str, float] = {}
    for raw_key, raw_value in list(value.items())[:64]:
        key = _clean_key(raw_key)
        if key:
            result[key] = max(0.0, _finite(raw_value))
    return result


@dataclass(slots=True)
class ShadowItem:
    item_id: str
    observed_stock: float
    observed_price: float
    previous_stock: float | None
    stock_delta: float | None
    daily_demand: float
    target_stock: float
    coverage_days: float
    scarcity_index: float
    recommended_price: float
    divergence_percent: float
    signal: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class ShadowEconomyReport:
    version: str
    mode: str
    session_id: str
    generated_at_ms: int
    sequence: int
    town_name: str
    world_day: float
    resident_count: int
    building_count: int
    packet_count: int
    mean_absolute_divergence_percent: float
    shortage_count: int
    surplus_count: int
    stable_count: int
    items: dict[str, ShadowItem] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["items"] = {key: value.to_dict() for key, value in self.items.items()}
        return data


@dataclass(slots=True)
class _SessionState:
    packet_count: int = 0
    last_stock: dict[str, float] = field(default_factory=dict)
    latest: ShadowEconomyReport | None = None


class ShadowEconomyStore:
    """Thread-safe Python shadow model keyed by browser session."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._sessions: dict[str, _SessionState] = {}
        self._latest_session_id: str | None = None
        self._history: deque[ShadowEconomyReport] = deque(maxlen=MAX_SHADOW_HISTORY)

    @staticmethod
    def _item_report(
        item_id: str,
        stock: float,
        price: float,
        previous_stock: float | None,
        residents: int,
    ) -> ShadowItem:
        per_capita = DEMAND_PER_CAPITA.get(item_id, 0.012)
        daily_demand = max(0.25, residents * per_capita)
        target_stock = max(5.0, daily_demand * 10.0)
        coverage_days = stock / daily_demand if daily_demand else 0.0
        scarcity_index = max(0.2, min(4.0, 10.0 / max(0.5, coverage_days)))

        # Keep recommendations close to the observed economy in shadow mode.
        # A 25% adjustment toward the scarcity signal is enough to expose
        # disagreement without pretending the Python model is authoritative.
        anchor = price if price > 0 else BASE_PRICE_HINTS.get(item_id, 1.0)
        scarcity_multiplier = max(0.55, min(2.50, 0.62 + 0.58 * scarcity_index))
        recommended = anchor * (0.75 + 0.25 * scarcity_multiplier)
        recommended = max(0.01, round(recommended, 4))
        divergence = 0.0 if anchor <= 0 else ((recommended - anchor) / anchor) * 100.0
        if divergence > 4.0:
            signal = "raise"
        elif divergence < -4.0:
            signal = "lower"
        else:
            signal = "hold"
        delta = None if previous_stock is None else stock - previous_stock
        return ShadowItem(
            item_id=item_id,
            observed_stock=round(stock, 4),
            observed_price=round(price, 4),
            previous_stock=None if previous_stock is None else round(previous_stock, 4),
            stock_delta=None if delta is None else round(delta, 4),
            daily_demand=round(daily_demand, 4),
            target_stock=round(target_stock, 4),
            coverage_days=round(coverage_days, 4),
            scarcity_index=round(scarcity_index, 4),
            recommended_price=recommended,
            divergence_percent=round(divergence, 3),
            signal=signal,
        )

    def ingest(self, browser_state: Any) -> ShadowEconomyReport:
        session_id = str(browser_state.session_id)
        market_inventory = _numeric_map(getattr(browser_state, "market_inventory", {}))
        market_prices = _numeric_map(getattr(browser_state, "market_prices", {}))
        material_stock = _numeric_map(getattr(browser_state, "material_stock", {}))
        material_prices = _numeric_map(getattr(browser_state, "material_prices", {}))
        combined_stock = dict(material_stock)
        combined_stock.update(market_inventory)
        combined_prices = dict(material_prices)
        combined_prices.update(market_prices)

        residents = max(
            1,
            int(getattr(browser_state, "town_population", 0) or getattr(browser_state, "agent_count", 0) or 1),
        )
        building_count = max(0, int(getattr(browser_state, "town_building_count", 0)))

        with self._lock:
            session = self._sessions.setdefault(session_id, _SessionState())
            session.packet_count += 1
            items: dict[str, ShadowItem] = {}
            for item_id in sorted(set(combined_stock) | set(combined_prices)):
                items[item_id] = self._item_report(
                    item_id=item_id,
                    stock=combined_stock.get(item_id, 0.0),
                    price=combined_prices.get(item_id, 0.0),
                    previous_stock=session.last_stock.get(item_id),
                    residents=residents,
                )
            divergences = [abs(item.divergence_percent) for item in items.values()]
            shortages = sum(item.coverage_days < 4.0 for item in items.values())
            surpluses = sum(item.coverage_days > 20.0 for item in items.values())
            stable = max(0, len(items) - shortages - surpluses)
            notes = [
                "Shadow mode is read-only; no browser economy values were changed.",
                "Recommendations are intentionally damped until observed production and consumption flows are validated.",
            ]
            if not items:
                notes.append("No live town market arrays were available in this observation.")
            report = ShadowEconomyReport(
                version="0.27",
                mode="shadow-read-only",
                session_id=session_id,
                generated_at_ms=int(time.time() * 1000),
                sequence=int(getattr(browser_state, "sequence", 0)),
                town_name=str(getattr(browser_state, "town_name", "unknown")),
                world_day=float(getattr(browser_state, "world_day", 0.0)),
                resident_count=residents,
                building_count=building_count,
                packet_count=session.packet_count,
                mean_absolute_divergence_percent=round(sum(divergences) / len(divergences), 3) if divergences else 0.0,
                shortage_count=shortages,
                surplus_count=surpluses,
                stable_count=stable,
                items=items,
                notes=notes,
            )
            session.latest = report
            session.last_stock = combined_stock
            self._latest_session_id = session_id
            self._history.append(report)
            return report

    def status(self, session_id: str | None = None) -> dict[str, Any]:
        with self._lock:
            key = session_id or self._latest_session_id
            session = self._sessions.get(key) if key else None
            latest = session.latest if session else None
            session_count = len(self._sessions)
            history_count = len(self._history)
        return {
            "status": "ready" if latest else "waiting",
            "version": "0.27",
            "mode": "shadow-read-only",
            "authoritative": False,
            "session_count": session_count,
            "history_count": history_count,
            "latest": latest.to_dict() if latest else None,
        }

    def history(self, limit: int = 30) -> list[dict[str, Any]]:
        limit = max(1, min(MAX_SHADOW_HISTORY, int(limit)))
        with self._lock:
            values = list(self._history)[-limit:]
        return [value.to_dict() for value in values]

    def reset(self) -> None:
        with self._lock:
            self._sessions.clear()
            self._latest_session_id = None
            self._history.clear()
