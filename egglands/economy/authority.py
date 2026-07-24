"""Conservative manual market-price authority pilot for The Egg Lands v0.27."""
from __future__ import annotations

import math
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from threading import Lock
from typing import Any, Mapping

MAX_AUTHORITY_HISTORY = 200
MAX_PRICE_STEP_PERCENT = 5.0
MIN_PRICE = 0.01


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
class MarketPriceStep:
    item_id: str
    observed_price: float
    shadow_target_price: float
    proposed_price: float
    step_percent: float
    signal: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class MarketAuthorityProposal:
    version: str
    mode: str
    proposal_id: str
    session_id: str
    generated_at_ms: int
    sequence: int
    town_name: str
    world_day: float
    max_step_percent: float
    requires_manual_apply: bool
    save_persistent: bool
    changes: dict[str, MarketPriceStep] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["changes"] = {key: value.to_dict() for key, value in self.changes.items()}
        return payload


@dataclass(slots=True)
class MarketAuthorityApplication:
    application_id: str
    proposal_id: str
    session_id: str
    town_name: str
    applied_at_ms: int
    source: str
    undone: bool
    changes: dict[str, dict[str, float]]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class MarketAuthorityStore:
    """Create bounded proposals and record explicit browser applications."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._latest_by_session: dict[str, MarketAuthorityProposal] = {}
        self._proposal_index: dict[str, MarketAuthorityProposal] = {}
        self._applications: deque[MarketAuthorityApplication] = deque(maxlen=MAX_AUTHORITY_HISTORY)

    @staticmethod
    def _bounded_step(observed: float, target: float) -> tuple[float, float]:
        observed = max(MIN_PRICE, observed)
        target = max(MIN_PRICE, target)
        raw_percent = ((target - observed) / observed) * 100.0
        bounded_percent = max(-MAX_PRICE_STEP_PERCENT, min(MAX_PRICE_STEP_PERCENT, raw_percent))
        proposed = observed * (1.0 + bounded_percent / 100.0)
        return round(max(MIN_PRICE, proposed), 4), round(bounded_percent, 3)

    def propose(self, browser_state: Any, shadow_report: Any) -> MarketAuthorityProposal:
        session_id = str(getattr(browser_state, "session_id", "unknown"))
        sequence = int(getattr(browser_state, "sequence", 0))
        town_name = str(getattr(browser_state, "town_name", "unknown"))
        observed_prices = _numeric_map(getattr(browser_state, "market_prices", {}))
        shadow_items = getattr(shadow_report, "items", {}) or {}
        changes: dict[str, MarketPriceStep] = {}

        for item_id in sorted(observed_prices):
            observed = observed_prices[item_id]
            shadow_item = shadow_items.get(item_id)
            if not shadow_item or observed <= 0:
                continue
            target = max(MIN_PRICE, _finite(getattr(shadow_item, "recommended_price", observed), observed))
            proposed, step_percent = self._bounded_step(observed, target)
            if abs(step_percent) < 0.25:
                continue
            changes[item_id] = MarketPriceStep(
                item_id=item_id,
                observed_price=round(observed, 4),
                shadow_target_price=round(target, 4),
                proposed_price=proposed,
                step_percent=step_percent,
                signal="raise" if step_percent > 0 else "lower",
            )

        proposal_id = f"{session_id}:{sequence}"
        proposal = MarketAuthorityProposal(
            version="0.27",
            mode="manual-market-price-pilot",
            proposal_id=proposal_id,
            session_id=session_id,
            generated_at_ms=int(time.time() * 1000),
            sequence=sequence,
            town_name=town_name,
            world_day=float(getattr(browser_state, "world_day", 0.0)),
            max_step_percent=MAX_PRICE_STEP_PERCENT,
            requires_manual_apply=True,
            save_persistent=False,
            changes=changes,
            notes=[
                "Only ordinary market-goods prices are eligible in v0.27.",
                "Each manual application is capped at five percent per item.",
                "Inventory, production, player gold, movement, combat, and save data remain browser-authoritative.",
                "Applied pilot prices are session-local and are not intentionally written into saves.",
            ],
        )
        with self._lock:
            self._latest_by_session[session_id] = proposal
            self._proposal_index[proposal_id] = proposal
            if len(self._proposal_index) > MAX_AUTHORITY_HISTORY * 4:
                keep = {value.proposal_id for value in self._latest_by_session.values()}
                for key in list(self._proposal_index):
                    if key not in keep:
                        self._proposal_index.pop(key, None)
                        if len(self._proposal_index) <= MAX_AUTHORITY_HISTORY * 2:
                            break
        return proposal

    def record_application(self, payload: Any) -> MarketAuthorityApplication:
        if not isinstance(payload, Mapping):
            raise ValueError("application payload must be an object")
        proposal_id = str(payload.get("proposal_id") or "")[:160]
        session_id = str(payload.get("session_id") or "")[:160]
        town_name = str(payload.get("town_name") or "unknown")[:160]
        source = str(payload.get("source") or "browser")[:40]
        undone = bool(payload.get("undone", False))
        raw_changes = payload.get("changes")
        if not proposal_id or not session_id:
            raise ValueError("proposal_id and session_id are required")
        if not isinstance(raw_changes, Mapping):
            raise ValueError("changes must be an object")

        with self._lock:
            proposal = self._proposal_index.get(proposal_id)
        if proposal is None:
            raise ValueError("unknown proposal_id")
        if proposal.session_id != session_id:
            raise ValueError("proposal session does not match")
        if proposal.town_name != town_name:
            raise ValueError("proposal town does not match")

        cleaned: dict[str, dict[str, float]] = {}
        for raw_key, raw_value in list(raw_changes.items())[:64]:
            key = _clean_key(raw_key)
            if key not in proposal.changes or not isinstance(raw_value, Mapping):
                continue
            before = max(MIN_PRICE, _finite(raw_value.get("before"), proposal.changes[key].observed_price))
            after = max(MIN_PRICE, _finite(raw_value.get("after"), before))
            percent = ((after - before) / before) * 100.0
            if abs(percent) > MAX_PRICE_STEP_PERCENT + 0.05 and not undone:
                raise ValueError(f"{key} exceeds the {MAX_PRICE_STEP_PERCENT:.1f}% authority cap")
            cleaned[key] = {"before": round(before, 4), "after": round(after, 4)}
        if not cleaned:
            raise ValueError("no valid market-price changes were supplied")

        application = MarketAuthorityApplication(
            application_id=f"{proposal_id}:{int(time.time() * 1000)}:{'undo' if undone else 'apply'}",
            proposal_id=proposal_id,
            session_id=session_id,
            town_name=town_name,
            applied_at_ms=int(time.time() * 1000),
            source=source,
            undone=undone,
            changes=cleaned,
        )
        with self._lock:
            self._applications.append(application)
        return application

    def status(self, session_id: str | None = None) -> dict[str, Any]:
        with self._lock:
            proposal = self._latest_by_session.get(session_id) if session_id else None
            if proposal is None and self._latest_by_session:
                proposal = next(reversed(self._latest_by_session.values()))
            applications = list(self._applications)
        return {
            "status": "ready" if proposal else "waiting",
            "version": "0.27",
            "mode": "manual-market-price-pilot",
            "authoritative_scope": "market_prices_manual_only",
            "max_step_percent": MAX_PRICE_STEP_PERCENT,
            "latest_proposal": proposal.to_dict() if proposal else None,
            "application_count": len(applications),
            "latest_application": applications[-1].to_dict() if applications else None,
        }

    def history(self, limit: int = 30) -> list[dict[str, Any]]:
        limit = max(1, min(MAX_AUTHORITY_HISTORY, int(limit)))
        with self._lock:
            values = list(self._applications)[-limit:]
        return [value.to_dict() for value in values]

    def reset(self) -> None:
        with self._lock:
            self._latest_by_session.clear()
            self._proposal_index.clear()
            self._applications.clear()
