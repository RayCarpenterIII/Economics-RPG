"""Authoritative multi-town economy for The Egg Lands v0.27.

This module is the first Python subsystem that owns live gameplay state instead
of merely comparing against it.  It keeps town inventories, prices,
employment, wages, production, consumption, market development, villager trade
relationships, and the initial empire internal-market rules.

The browser remains responsible for rendering and player controls.  When it is
connected to the local server it publishes observations and applies the town
state returned here.  The standalone HTML retains a smaller local fallback.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from hashlib import sha256
import json
import math
from pathlib import Path
from threading import RLock
import time
from typing import Any, Mapping

LIVE_ECONOMY_VERSION = "0.27"
TARGET_COVERAGE_DAYS = 8.0
EMPIRE_MARKET_TERRITORY_THRESHOLD = 3
MAX_TOWNS_PER_SESSION = 64
MAX_VILLAGERS_PER_TOWN = 512

# Demand is explicitly measured in units per resident per simulated day.
DEMAND_PER_CAPITA: dict[str, float] = {
    "fish": 0.105,
    "grain": 0.225,
    "bread": 0.49,
    "flour": 0.18,
    "meat": 0.105,
    "ore": 0.019,
    "iron_ore": 0.019,
    "cloth": 0.009,
    "log": 0.028,
    "logs": 0.028,
    "timber": 0.028,
    "stone": 0.026,
    "part": 0.006,
    "parts": 0.006,
    "hides": 0.006,
    "tools": 0.0032,
}

# Coins, not cents: these are aligned to the existing browser market arrays.
BASE_PRICES: dict[str, float] = {
    "fish": 1.0,
    "grain": 0.8,
    "bread": 1.3,
    "flour": 0.9,
    "meat": 1.7,
    "ore": 1.5,
    "iron_ore": 1.5,
    "cloth": 2.1,
    "log": 0.9,
    "logs": 0.9,
    "timber": 0.9,
    "stone": 1.0,
    "part": 1.8,
    "parts": 1.8,
    "hides": 1.7,
    "tools": 4.8,
}

# Output per worker-day before productivity and capital multipliers.
PRODUCTION_PER_WORKER: dict[str, float] = {
    "fish": 1.55,
    "grain": 3.6,
    "bread": 2.8,
    "flour": 3.2,
    "meat": 1.35,
    "ore": 0.82,
    "iron_ore": 0.82,
    "cloth": 0.48,
    "log": 1.4,
    "logs": 1.4,
    "timber": 1.4,
    "stone": 1.15,
    "part": 0.42,
    "parts": 0.42,
    "hides": 0.42,
    "tools": 0.16,
}

OCCUPATION_FOR_ITEM: dict[str, str] = {
    "fish": "fisher",
    "grain": "farmer",
    "bread": "baker",
    "flour": "miller",
    "meat": "hunter",
    "ore": "miner",
    "iron_ore": "miner",
    "cloth": "weaver",
    "log": "lumberjack",
    "logs": "lumberjack",
    "timber": "lumberjack",
    "stone": "quarry_worker",
    "part": "hunter",
    "parts": "hunter",
    "hides": "hunter",
    "tools": "smith",
}


# Processed outputs consume actual upstream inventory.  Aliases keep the legacy
# browser labels compatible with the richer Python item names.  Values are input
# units required per one output unit.
PRODUCTION_INPUTS: dict[str, tuple[tuple[tuple[str, ...], float], ...]] = {
    "flour": ((("grain",), 4.0 / 3.0),),
    "bread": ((("flour",), 2.0 / 3.0),),
    "cloth": ((("hides", "part", "parts"), 0.5),),
    "tools": ((("iron_ore", "ore"), 3.0), (("timber", "log", "logs"), 1.0)),
}

PRODUCTION_PRIORITY: dict[str, int] = {
    "grain": 0, "fish": 0, "meat": 0, "hides": 0, "part": 0, "parts": 0,
    "iron_ore": 0, "ore": 0, "timber": 0, "log": 0, "logs": 0, "stone": 0,
    "flour": 1, "cloth": 1, "tools": 1, "bread": 2,
}

OFFER_BY_ACTIVITY: tuple[tuple[tuple[str, ...], tuple[str, ...]], ...] = (
    (("fish", "fisher", "shore"), ("fish",)),
    (("farm", "grain", "harvest"), ("grain",)),
    (("mine", "ore", "smith"), ("ore", "iron_ore", "tools")),
    (("tree", "forest", "lumber"), ("logs", "log", "timber")),
    (("stone", "quarry"), ("stone",)),
    (("hunt", "game", "hide"), ("meat", "parts", "hides")),
    (("weav", "cloth", "tailor"), ("cloth",)),
    (("bake", "bread", "mill"), ("bread", "flour")),
)


def _clean_key(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_")[:64]


def _finite(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _numeric_map(value: Any) -> dict[str, float]:
    if not isinstance(value, Mapping):
        return {}
    result: dict[str, float] = {}
    for raw_key, raw_value in list(value.items())[:128]:
        key = _clean_key(raw_key)
        if key:
            result[key] = max(0.0, _finite(raw_value))
    return result


def _stable_fraction(*parts: object) -> float:
    digest = sha256("|".join(map(str, parts)).encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") / float(2**64 - 1)


def _round_map(values: Mapping[str, float], digits: int = 4) -> dict[str, float]:
    return {key: round(float(value), digits) for key, value in sorted(values.items())}


@dataclass(slots=True)
class ItemFlow:
    item_id: str
    inventory: float
    price: float
    base_price: float
    demand_per_day: float = 0.0
    production_per_day: float = 0.0
    consumed_last_step: float = 0.0
    produced_last_step: float = 0.0
    unmet_last_step: float = 0.0
    external_flow_last_step: float = 0.0
    intermediate_consumed_last_step: float = 0.0
    demand_ema: float = 0.0
    last_published_inventory: float | None = None

    def to_dict(self) -> dict[str, Any]:
        coverage = self.inventory / max(0.001, self.demand_per_day)
        return {
            "item_id": self.item_id,
            "inventory": round(self.inventory, 4),
            "price": round(self.price, 4),
            "base_price": round(self.base_price, 4),
            "demand_per_day": round(self.demand_per_day, 4),
            "production_per_day": round(self.production_per_day, 4),
            "consumed_last_step": round(self.consumed_last_step, 4),
            "produced_last_step": round(self.produced_last_step, 4),
            "unmet_last_step": round(self.unmet_last_step, 4),
            "external_flow_last_step": round(self.external_flow_last_step, 4),
            "intermediate_consumed_last_step": round(self.intermediate_consumed_last_step, 4),
            "coverage_days": round(coverage, 4),
        }


@dataclass(slots=True)
class VillagerLedger:
    villager_id: str
    name: str
    activity: str
    wealth: float
    trust: float = 0.0
    affinity: float = 0.0
    gratitude: float = 0.0
    lifetime_trade_value: float = 0.0
    trade_count: int = 0
    inventory: dict[str, float] = field(default_factory=dict)
    coins: float = 18.0

    @property
    def protection_score(self) -> float:
        return self.trust * 0.42 + self.affinity * 0.30 + self.gratitude * 0.18 + min(35.0, self.lifetime_trade_value * 0.12)

    @property
    def willing_to_defend(self) -> bool:
        return self.protection_score >= 35.0 and self.trade_count >= 3

    def to_dict(self) -> dict[str, Any]:
        return {
            "villager_id": self.villager_id,
            "name": self.name,
            "activity": self.activity,
            "wealth": round(self.wealth, 3),
            "trust": round(self.trust, 3),
            "affinity": round(self.affinity, 3),
            "gratitude": round(self.gratitude, 3),
            "lifetime_trade_value": round(self.lifetime_trade_value, 3),
            "trade_count": self.trade_count,
            "coins": round(self.coins, 3),
            "inventory": _round_map(self.inventory),
            "protection_score": round(self.protection_score, 3),
            "willing_to_defend": self.willing_to_defend,
        }


@dataclass(slots=True)
class TownEconomy:
    town_name: str
    population: int
    building_count: int
    world_day: float
    control: str = "independent"
    development_score: float = 0.0
    market_available: bool = False
    trade_mode: str = "villagers"
    working_age_population: int = 0
    employed_population: int = 0
    unemployed_population: int = 0
    employment_rate: float = 0.0
    average_daily_wage: float = 0.0
    household_wealth: float = 0.0
    payroll_last_step: float = 0.0
    consumption_spending_last_step: float = 0.0
    treasury: float = 0.0
    trade_volume: float = 0.0
    items: dict[str, ItemFlow] = field(default_factory=dict)
    employment: dict[str, int] = field(default_factory=dict)
    villagers: dict[str, VillagerLedger] = field(default_factory=dict)
    last_updated_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": LIVE_ECONOMY_VERSION,
            "town_name": self.town_name,
            "world_day": round(self.world_day, 5),
            "population": self.population,
            "building_count": self.building_count,
            "control": self.control,
            "development_score": round(self.development_score, 3),
            "market_available": self.market_available,
            "trade_mode": self.trade_mode,
            "working_age_population": self.working_age_population,
            "employed_population": self.employed_population,
            "unemployed_population": self.unemployed_population,
            "employment_rate": round(self.employment_rate, 5),
            "average_daily_wage": round(self.average_daily_wage, 4),
            "household_wealth": round(self.household_wealth, 3),
            "payroll_last_step": round(self.payroll_last_step, 3),
            "consumption_spending_last_step": round(self.consumption_spending_last_step, 3),
            "treasury": round(self.treasury, 3),
            "trade_volume": round(self.trade_volume, 3),
            "employment": dict(sorted(self.employment.items())),
            "market_inventory": _round_map({key: item.inventory for key, item in self.items.items()}),
            "market_prices": _round_map({key: item.price for key, item in self.items.items()}),
            "item_flows": {key: item.to_dict() for key, item in sorted(self.items.items())},
            "villager_count": len(self.villagers),
            "trade_allies": sum(v.willing_to_defend for v in self.villagers.values()),
            "last_updated_ms": self.last_updated_ms,
        }


@dataclass(slots=True)
class SessionEconomy:
    session_id: str
    towns: dict[str, TownEconomy] = field(default_factory=dict)
    empire_trade_unlocked: bool = False
    empire_territory_count: int = 0
    sync_count: int = 0
    last_sequence: int = 0
    updated_at_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": LIVE_ECONOMY_VERSION,
            "mode": "python-authoritative-town-economy",
            "authoritative": True,
            "session_id": self.session_id,
            "sync_count": self.sync_count,
            "last_sequence": self.last_sequence,
            "empire_trade_unlocked": self.empire_trade_unlocked,
            "empire_territory_count": self.empire_territory_count,
            "empire_market_threshold": EMPIRE_MARKET_TERRITORY_THRESHOLD,
            "towns": {name: town.to_dict() for name, town in sorted(self.towns.items())},
            "updated_at_ms": self.updated_at_ms,
        }


class LiveEconomyError(ValueError):
    pass


class LiveTownEconomyStore:
    """Thread-safe authoritative live economy with optional JSON persistence."""

    def __init__(self, persistence_path: Path | None = None) -> None:
        self._lock = RLock()
        self._sessions: dict[str, SessionEconomy] = {}
        self._latest_session_id: str | None = None
        self._persistence_path = persistence_path
        if persistence_path:
            self._load()

    def reset(self) -> None:
        with self._lock:
            self._sessions.clear()
            self._latest_session_id = None
            self._persist_locked()

    def _load(self) -> None:
        path = self._persistence_path
        if not path or not path.is_file():
            return
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            for session_data in data.get("sessions", []):
                session = SessionEconomy(session_id=str(session_data["session_id"]))
                session.sync_count = int(session_data.get("sync_count", 0))
                session.last_sequence = int(session_data.get("last_sequence", 0))
                for town_data in session_data.get("towns", []):
                    town = TownEconomy(
                        town_name=str(town_data["town_name"]),
                        population=int(town_data.get("population", 1)),
                        building_count=int(town_data.get("building_count", 0)),
                        world_day=float(town_data.get("world_day", 0)),
                        control=str(town_data.get("control", "independent")),
                        household_wealth=float(town_data.get("household_wealth", 0)),
                        treasury=float(town_data.get("treasury", 0)),
                        trade_volume=float(town_data.get("trade_volume", 0)),
                    )
                    for item_data in town_data.get("items", []):
                        item = ItemFlow(**item_data)
                        town.items[item.item_id] = item
                    for villager_data in town_data.get("villagers", []):
                        villager = VillagerLedger(**villager_data)
                        town.villagers[villager.villager_id] = villager
                    session.towns[town.town_name] = town
                self._refresh_empire(session)
                self._sessions[session.session_id] = session
            if self._sessions:
                self._latest_session_id = next(reversed(self._sessions))
        except Exception:
            # A corrupt development cache must never prevent the game from starting.
            self._sessions.clear()
            self._latest_session_id = None

    def _persist_locked(self) -> None:
        path = self._persistence_path
        if not path:
            return
        payload = {"version": LIVE_ECONOMY_VERSION, "sessions": []}
        for session in self._sessions.values():
            session_data = {
                "session_id": session.session_id,
                "sync_count": session.sync_count,
                "last_sequence": session.last_sequence,
                "towns": [],
            }
            for town in session.towns.values():
                session_data["towns"].append(
                    {
                        "town_name": town.town_name,
                        "population": town.population,
                        "building_count": town.building_count,
                        "world_day": town.world_day,
                        "control": town.control,
                        "household_wealth": town.household_wealth,
                        "treasury": town.treasury,
                        "trade_volume": town.trade_volume,
                        "items": [asdict(item) for item in town.items.values()],
                        "villagers": [asdict(villager) for villager in town.villagers.values()],
                    }
                )
            payload["sessions"].append(session_data)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        temporary.replace(path)

    @staticmethod
    def _normalise_town_observation(raw: Mapping[str, Any]) -> dict[str, Any]:
        name = str(raw.get("town_name") or raw.get("name") or "unknown")[:80]
        market_inventory = _numeric_map(raw.get("market_inventory"))
        market_prices = _numeric_map(raw.get("market_prices"))
        material_stock = _numeric_map(raw.get("material_stock"))
        material_prices = _numeric_map(raw.get("material_prices"))
        combined_inventory = dict(material_stock)
        combined_inventory.update(market_inventory)
        combined_prices = dict(material_prices)
        combined_prices.update(market_prices)
        return {
            "town_name": name,
            "population": max(1, int(_finite(raw.get("population", raw.get("town_population", 1)), 1))),
            "building_count": max(0, int(_finite(raw.get("building_count", raw.get("town_building_count", 0)), 0))),
            "world_day": max(0.0, _finite(raw.get("world_day"), 0.0)),
            "market_inventory": combined_inventory,
            "market_prices": combined_prices,
            "villagers": raw.get("villagers") if isinstance(raw.get("villagers"), list) else [],
        }

    @staticmethod
    def _initial_item(item_id: str, observed_stock: float | None, observed_price: float | None, population: int) -> ItemFlow:
        base = observed_price if observed_price is not None and observed_price > 0 else BASE_PRICES.get(item_id, 1.25)
        demand = max(0.08, population * DEMAND_PER_CAPITA.get(item_id, 0.012))
        stock = max(0.0, observed_stock) if observed_stock is not None else max(2.0, demand * (5.5 + _stable_fraction(item_id, population) * 6.0))
        return ItemFlow(
            item_id=item_id,
            inventory=stock,
            price=max(0.05, base),
            base_price=max(0.05, base),
            demand_per_day=demand,
            demand_ema=demand,
            last_published_inventory=stock,
        )

    def _ensure_town(self, session: SessionEconomy, observation: Mapping[str, Any]) -> TownEconomy:
        obs = self._normalise_town_observation(observation)
        name = obs["town_name"]
        if name not in session.towns:
            if len(session.towns) >= MAX_TOWNS_PER_SESSION:
                raise LiveEconomyError("session town limit reached")
            town = TownEconomy(
                town_name=name,
                population=obs["population"],
                building_count=obs["building_count"],
                world_day=obs["world_day"],
                household_wealth=obs["population"] * 6.0,
                treasury=obs["population"] * 2.5,
            )
            keys = sorted(set(obs["market_inventory"]) | set(obs["market_prices"]))
            if not keys:
                keys = ["fish", "grain", "ore", "cloth", "logs", "stone", "parts"]
            for item_id in keys:
                town.items[item_id] = self._initial_item(
                    item_id,
                    obs["market_inventory"].get(item_id),
                    obs["market_prices"].get(item_id),
                    town.population,
                )
            session.towns[name] = town
        town = session.towns[name]
        town.population = max(1, obs["population"])
        town.building_count = max(0, obs["building_count"])
        self._reconcile_observed_inventory(town, obs["market_inventory"])
        self._ingest_villagers(town, obs["villagers"])
        self._recompute_structure(town, session)
        return town

    @staticmethod
    def _reconcile_observed_inventory(town: TownEconomy, observed: Mapping[str, float]) -> None:
        for item_id, quantity in observed.items():
            if item_id not in town.items:
                town.items[item_id] = LiveTownEconomyStore._initial_item(item_id, quantity, 0.0, town.population)
                continue
            item = town.items[item_id]
            if item.last_published_inventory is None:
                item.last_published_inventory = item.inventory
                continue
            delta = quantity - item.last_published_inventory
            # Browser-side trade, construction, gathering, or legacy simulation is
            # treated as an external flow and reconciled into the authoritative ledger.
            if abs(delta) >= 0.005:
                item.inventory = max(0.0, item.inventory + delta)
                item.external_flow_last_step = delta
                town.trade_volume += abs(delta) * item.price
            else:
                item.external_flow_last_step = 0.0

    def _ingest_villagers(self, town: TownEconomy, villagers: list[Any]) -> None:
        for raw in villagers[:MAX_VILLAGERS_PER_TOWN]:
            if not isinstance(raw, Mapping):
                continue
            villager_id = str(raw.get("id") or raw.get("villager_id") or "")[:80]
            if not villager_id:
                continue
            ledger = town.villagers.get(villager_id)
            if ledger is None:
                wealth = max(0.0, _finite(raw.get("wealth"), 8.0 + _stable_fraction(town.town_name, villager_id) * 22.0))
                ledger = VillagerLedger(
                    villager_id=villager_id,
                    name=str(raw.get("name") or f"Villager {villager_id}")[:80],
                    activity=str(raw.get("activity") or raw.get("current_activity") or "village work")[:160],
                    wealth=wealth,
                    coins=max(4.0, wealth * 0.7),
                )
                town.villagers[villager_id] = ledger
            else:
                ledger.name = str(raw.get("name") or ledger.name)[:80]
                ledger.activity = str(raw.get("activity") or raw.get("current_activity") or ledger.activity)[:160]
                ledger.wealth = max(0.0, _finite(raw.get("wealth"), ledger.wealth))

    @staticmethod
    def _recompute_structure(town: TownEconomy, session: SessionEconomy) -> None:
        working = max(1, round(town.population * 0.62))
        item_keys = list(town.items)
        scores: dict[str, float] = {}
        for item_id in item_keys:
            item = town.items[item_id]
            coverage = item.inventory / max(0.05, item.demand_per_day or 0.05)
            scarcity = _clamp(TARGET_COVERAGE_DAYS / max(0.5, coverage), 0.25, 4.0)
            scores[item_id] = max(0.15, scarcity * (item.price / max(0.05, item.base_price)))
        productive_workers = max(1, round(working * _clamp(0.62 + town.building_count * 0.035, 0.55, 0.92)))
        total_score = sum(scores.values()) or 1.0
        employment: dict[str, int] = {}
        assigned = 0
        for index, item_id in enumerate(item_keys):
            workers = round(productive_workers * scores[item_id] / total_score)
            if index == len(item_keys) - 1:
                workers = max(0, productive_workers - assigned)
            workers = max(0, workers)
            assigned += workers
            occupation = OCCUPATION_FOR_ITEM.get(item_id, f"producer_{item_id}")
            employment[occupation] = employment.get(occupation, 0) + workers
        merchant_workers = max(0, min(working - assigned, round((town.population + town.trade_volume / 25.0) / 28.0)))
        if merchant_workers:
            employment["merchant"] = merchant_workers
            assigned += merchant_workers
        town.working_age_population = working
        town.employed_population = min(working, assigned)
        town.unemployed_population = max(0, working - town.employed_population)
        town.employment_rate = town.employed_population / working
        town.employment = employment
        merchant_count = employment.get("merchant", 0)
        town.development_score = (
            town.population * 0.58
            + town.building_count * 10.5
            + merchant_count * 7.5
            + min(36.0, town.trade_volume * 0.025)
        )
        organic_market = town.development_score >= 52.0 and (town.building_count >= 2 or town.population >= 45)
        empire_access = town.control == "conquered" and session.empire_trade_unlocked
        town.market_available = organic_market or empire_access
        town.trade_mode = "empire_market" if empire_access else "town_market" if organic_market else "villagers"

    @staticmethod
    def _advance_town(town: TownEconomy, days: float) -> None:
        if days <= 0:
            return
        days = min(days, 45.0)
        payroll = 0.0
        spending = 0.0
        total_wage_weight = 0.0
        total_workers = 0

        for item in town.items.values():
            item.produced_last_step = 0.0
            item.consumed_last_step = 0.0
            item.unmet_last_step = 0.0
            item.intermediate_consumed_last_step = 0.0

        # Produce raw goods before intermediate and final goods so a functioning
        # local supply chain can operate within the same simulated day.
        ordered_keys = sorted(town.items, key=lambda key: (PRODUCTION_PRIORITY.get(key, 0), key))
        utilization: dict[str, float] = {}
        for item_id in ordered_keys:
            item = town.items[item_id]
            occupation = OCCUPATION_FOR_ITEM.get(item_id, f"producer_{item_id}")
            workers = town.employment.get(occupation, 0)
            productivity = PRODUCTION_PER_WORKER.get(item_id, 0.55)
            capital_multiplier = _clamp(0.72 + town.building_count * 0.075, 0.72, 1.55)
            potential = workers * productivity * capital_multiplier * days
            produced = potential
            requirements = PRODUCTION_INPUTS.get(item_id, ())
            resolved_inputs: list[tuple[ItemFlow, float]] = []
            for aliases, units_per_output in requirements:
                source = next((town.items[name] for name in aliases if name in town.items), None)
                if source is None:
                    produced = 0.0
                    resolved_inputs = []
                    break
                produced = min(produced, source.inventory / max(0.0001, units_per_output))
                resolved_inputs.append((source, units_per_output))
            if produced > 0:
                for source, units_per_output in resolved_inputs:
                    used = min(source.inventory, produced * units_per_output)
                    source.inventory -= used
                    source.intermediate_consumed_last_step += used
                item.inventory += produced
            item.produced_last_step = produced
            item.production_per_day = produced / days
            utilization[item_id] = produced / potential if potential > 0 else 0.0

        for item_id, item in town.items.items():
            occupation = OCCUPATION_FOR_ITEM.get(item_id, f"producer_{item_id}")
            workers = town.employment.get(occupation, 0)
            productivity = PRODUCTION_PER_WORKER.get(item_id, 0.55)
            requested = max(0.02, town.population * DEMAND_PER_CAPITA.get(item_id, 0.012)) * days
            requested += item.demand_ema * 0.06 * days
            available = item.inventory
            consumed = min(available, requested)
            unmet = max(0.0, requested - available)
            item.inventory = max(0.0, available - consumed)
            item.consumed_last_step = consumed
            item.unmet_last_step = unmet
            item.demand_per_day = requested / days
            item.demand_ema = item.demand_ema * 0.82 + item.demand_per_day * 0.18

            coverage = item.inventory / max(0.05, item.demand_per_day)
            scarcity_gap = (TARGET_COVERAGE_DAYS - coverage) / TARGET_COVERAGE_DAYS
            unmet_ratio = unmet / max(0.05, requested)
            excess_supply = max(0.0, coverage - TARGET_COVERAGE_DAYS) / TARGET_COVERAGE_DAYS
            desired_multiplier = math.exp(_clamp(0.78 * scarcity_gap + 1.35 * unmet_ratio - 0.30 * excess_supply, -1.15, 1.65))
            desired_price = item.base_price * _clamp(desired_multiplier, 0.32, 5.25)

            wage_per_worker = max(0.35, item.price * productivity * 0.42)
            unit_labor_cost = wage_per_worker / max(0.05, productivity)
            desired_price = max(desired_price, unit_labor_cost * 1.08)
            adjustment = 1.0 - math.exp(-0.24 * days)
            item.price = max(0.03, item.price + (desired_price - item.price) * adjustment)

            # Workers still receive a floor for time spent, but input shortages
            # suppress payroll and signal that the job cannot operate at capacity.
            paid_utilization = 0.35 + 0.65 * utilization.get(item_id, 0.0)
            payroll += wage_per_worker * workers * days * paid_utilization
            spending += consumed * item.price
            total_wage_weight += wage_per_worker * paid_utilization * workers
            total_workers += workers

        merchant_wage = 0.75 + min(1.8, town.trade_volume / max(1.0, town.population * 50.0))
        merchant_workers = town.employment.get("merchant", 0)
        payroll += merchant_workers * merchant_wage * days
        total_wage_weight += merchant_workers * merchant_wage
        total_workers += merchant_workers
        town.average_daily_wage = total_wage_weight / max(1, total_workers)
        town.payroll_last_step = payroll
        town.consumption_spending_last_step = spending
        town.household_wealth = max(0.0, town.household_wealth + payroll - spending)
        sales_tax = spending * (0.025 if town.control != "conquered" else 0.045)
        town.treasury = max(0.0, town.treasury + sales_tax - town.building_count * 0.035 * days)
        town.last_updated_ms = int(time.time() * 1000)

    @staticmethod
    def _refresh_empire(session: SessionEconomy) -> None:
        count = sum(town.control == "conquered" for town in session.towns.values())
        session.empire_territory_count = count
        session.empire_trade_unlocked = count >= EMPIRE_MARKET_TERRITORY_THRESHOLD

    def sync(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        if not isinstance(payload, Mapping):
            raise LiveEconomyError("sync body must be an object")
        session_id = str(payload.get("session_id") or "")[:96]
        if not session_id:
            raise LiveEconomyError("session_id is required")
        sequence = max(0, int(_finite(payload.get("sequence"), 0)))
        world_day = max(0.0, _finite(payload.get("world_day"), 0.0))
        raw_towns = payload.get("towns")
        if not isinstance(raw_towns, list):
            raw_towns = []
        if not raw_towns and isinstance(payload.get("town"), Mapping):
            raw_towns = [payload["town"]]
        if not raw_towns:
            raise LiveEconomyError("at least one town observation is required")

        with self._lock:
            session = self._sessions.setdefault(session_id, SessionEconomy(session_id=session_id))
            if sequence and sequence < session.last_sequence:
                raise LiveEconomyError("sequence moved backwards")
            session.last_sequence = max(session.last_sequence, sequence)
            for raw in raw_towns[:MAX_TOWNS_PER_SESSION]:
                if not isinstance(raw, Mapping):
                    continue
                observation = dict(raw)
                observation.setdefault("world_day", world_day)
                town = self._ensure_town(session, observation)
                target_day = max(town.world_day, _finite(observation.get("world_day"), world_day))
                delta_days = max(0.0, target_day - town.world_day)
                if delta_days > 0:
                    self._advance_town(town, delta_days)
                    town.world_day = target_day
                self._recompute_structure(town, session)
            self._refresh_empire(session)
            if session.empire_trade_unlocked:
                self._pool_empire_network(session)
                for town in session.towns.values():
                    self._recompute_structure(town, session)
            for town in session.towns.values():
                for item in town.items.values():
                    item.last_published_inventory = item.inventory
            session.sync_count += 1
            session.updated_at_ms = int(time.time() * 1000)
            self._latest_session_id = session_id
            self._persist_locked()
            return session.to_dict()

    @staticmethod
    def _pool_empire_network(session: SessionEconomy) -> None:
        conquered = [town for town in session.towns.values() if town.control == "conquered"]
        if len(conquered) < EMPIRE_MARKET_TERRITORY_THRESHOLD:
            return
        population_total = max(1, sum(town.population for town in conquered))
        keys = sorted({key for town in conquered for key in town.items})
        for key in keys:
            total_inventory = sum(town.items[key].inventory for town in conquered if key in town.items)
            weighted_price = sum(town.items[key].price * town.population for town in conquered if key in town.items) / max(1, sum(town.population for town in conquered if key in town.items))
            for town in conquered:
                if key not in town.items:
                    town.items[key] = LiveTownEconomyStore._initial_item(key, 0.0, weighted_price, town.population)
                item = town.items[key]
                demand_total = sum(x.items[key].demand_per_day for x in conquered if key in x.items)
                share = item.demand_per_day / demand_total if demand_total > 0 else town.population / population_total
                item.inventory = total_inventory * share
                item.price += (weighted_price - item.price) * 0.35

    def _session_and_town(self, session_id: str, town_name: str) -> tuple[SessionEconomy, TownEconomy]:
        session = self._sessions.get(session_id)
        if not session:
            raise LiveEconomyError("unknown session; sync the game first")
        town = session.towns.get(town_name)
        if not town:
            raise LiveEconomyError("unknown town; sync the town first")
        return session, town

    def villager_profile(self, session_id: str, town_name: str, villager: Mapping[str, Any]) -> dict[str, Any]:
        with self._lock:
            session, town = self._session_and_town(session_id, town_name)
            self._ingest_villagers(town, [villager])
            villager_id = str(villager.get("id") or villager.get("villager_id") or "")[:80]
            if not villager_id or villager_id not in town.villagers:
                raise LiveEconomyError("villager id is required")
            ledger = town.villagers[villager_id]
            shortages = sorted(
                town.items.values(),
                key=lambda item: (item.inventory / max(0.05, item.demand_per_day), -item.price),
            )
            wants = [item.item_id for item in shortages[:3]]
            activity = ledger.activity.lower()
            offers: list[str] = []
            for terms, candidates in OFFER_BY_ACTIVITY:
                if any(term in activity for term in terms):
                    offers.extend(item for item in candidates if item in town.items)
            if not offers:
                productive = sorted(town.items.values(), key=lambda item: item.production_per_day, reverse=True)
                offers = [item.item_id for item in productive[:2] if item.production_per_day > 0]
            if not offers:
                offers = [key for key in sorted(town.items) if key not in wants][:2]
            relation_discount = _clamp((ledger.trust + ledger.affinity) / 400.0, 0.0, 0.18)
            want_rows = []
            for item_id in wants:
                item = town.items[item_id]
                premium = 1.10 + _clamp(item.unmet_last_step / max(0.05, item.demand_per_day), 0.0, 0.35)
                want_rows.append({"item_id": item_id, "quantity": max(1, round(item.demand_per_day * 0.35)), "price": round(item.price * premium * (1 + relation_discount * 0.25), 3)})
            offer_rows = []
            for item_id in offers[:3]:
                item = town.items[item_id]
                personal_stock = ledger.inventory.get(item_id)
                if personal_stock is None:
                    personal_stock = 1 + int(_stable_fraction(town_name, villager_id, item_id) * 4)
                    ledger.inventory[item_id] = float(personal_stock)
                markup = 1.18 - relation_discount
                offer_rows.append({"item_id": item_id, "quantity": int(max(0, personal_stock)), "price": round(item.price * markup, 3)})
            profile = ledger.to_dict()
            profile.update(
                {
                    "town_name": town_name,
                    "market_available": town.market_available,
                    "trade_mode": town.trade_mode,
                    "wants": want_rows,
                    "offers": offer_rows,
                    "demand_summary": ", ".join(row["item_id"] for row in want_rows) or "nothing urgently",
                    "relationship_label": "trade ally" if ledger.willing_to_defend else "trusted partner" if ledger.protection_score >= 20 else "regular customer" if ledger.trade_count else "new contact",
                }
            )
            self._persist_locked()
            return profile

    def trade(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        if not isinstance(payload, Mapping):
            raise LiveEconomyError("trade body must be an object")
        session_id = str(payload.get("session_id") or "")[:96]
        town_name = str(payload.get("town_name") or "")[:80]
        villager_raw = payload.get("villager") if isinstance(payload.get("villager"), Mapping) else {"id": payload.get("villager_id"), "name": payload.get("villager_name")}
        side = str(payload.get("side") or "").lower()
        item_id = _clean_key(payload.get("item_id"))
        quantity = max(1, min(99, int(_finite(payload.get("quantity"), 1))))
        if side not in {"buy", "sell"}:
            raise LiveEconomyError("side must be buy or sell")
        player_gold = max(0.0, _finite(payload.get("player_gold"), 0.0))
        player_inventory = _numeric_map(payload.get("player_inventory"))
        with self._lock:
            session, town = self._session_and_town(session_id, town_name)
            profile = self.villager_profile(session_id, town_name, villager_raw)
            villager_id = str(villager_raw.get("id") or villager_raw.get("villager_id") or "")[:80]
            ledger = town.villagers[villager_id]
            rows = profile["offers"] if side == "buy" else profile["wants"]
            row = next((entry for entry in rows if entry["item_id"] == item_id), None)
            if row is None:
                raise LiveEconomyError("villager is not offering that trade")
            available = int(row["quantity"])
            quantity = min(quantity, available)
            if quantity <= 0:
                raise LiveEconomyError("no quantity is currently available")
            unit_price = float(row["price"])
            total = round(unit_price * quantity, 3)
            player_delta: dict[str, Any] = {"gold": 0.0, "items": {item_id: 0.0}}
            if side == "buy":
                if player_gold + 1e-9 < total:
                    raise LiveEconomyError("player cannot afford this trade")
                if ledger.inventory.get(item_id, 0.0) + 1e-9 < quantity:
                    raise LiveEconomyError("villager stock changed; reopen the trade")
                ledger.inventory[item_id] = max(0.0, ledger.inventory.get(item_id, 0.0) - quantity)
                ledger.coins += total
                player_delta["gold"] = -total
                player_delta["items"][item_id] = float(quantity)
            else:
                if player_inventory.get(item_id, 0.0) + 1e-9 < quantity:
                    raise LiveEconomyError("player does not have enough of that item")
                if ledger.coins + 1e-9 < total:
                    affordable = int(ledger.coins // max(0.001, unit_price))
                    quantity = min(quantity, affordable)
                    total = round(unit_price * quantity, 3)
                if quantity <= 0:
                    raise LiveEconomyError("villager cannot afford even one unit")
                ledger.inventory[item_id] = ledger.inventory.get(item_id, 0.0) + quantity
                ledger.coins = max(0.0, ledger.coins - total)
                player_delta["gold"] = total
                player_delta["items"][item_id] = -float(quantity)
                if item_id in town.items:
                    town.items[item_id].demand_ema = max(0.0, town.items[item_id].demand_ema - quantity * 0.25)
            utility = total / max(0.25, town.items.get(item_id, ItemFlow(item_id, 0, 1, 1)).base_price)
            ledger.trade_count += 1
            ledger.lifetime_trade_value += total
            ledger.trust = _clamp(ledger.trust + 1.8 + min(4.0, utility * 0.45), -100, 100)
            ledger.affinity = _clamp(ledger.affinity + 0.8 + min(2.5, utility * 0.25), -100, 100)
            ledger.gratitude = _clamp(ledger.gratitude + (2.3 if side == "sell" else 1.1), -100, 100)
            town.trade_volume += total
            town.treasury += total * (0.01 if town.market_available else 0.0)
            self._recompute_structure(town, session)
            self._persist_locked()
            updated = self.villager_profile(session_id, town_name, villager_raw)
            return {
                "status": "accepted",
                "version": LIVE_ECONOMY_VERSION,
                "side": side,
                "item_id": item_id,
                "quantity": quantity,
                "unit_price": round(unit_price, 3),
                "total": total,
                "player_delta": player_delta,
                "villager": updated,
                "town": town.to_dict(),
            }

    def set_control(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        session_id = str(payload.get("session_id") or "")[:96]
        town_name = str(payload.get("town_name") or "")[:80]
        control = str(payload.get("control") or "independent").lower()
        if control not in {"independent", "friendly", "conquered"}:
            raise LiveEconomyError("control must be independent, friendly, or conquered")
        with self._lock:
            session, town = self._session_and_town(session_id, town_name)
            town.control = control
            self._refresh_empire(session)
            if session.empire_trade_unlocked:
                self._pool_empire_network(session)
            for value in session.towns.values():
                self._recompute_structure(value, session)
            self._persist_locked()
            return session.to_dict()

    def status(self, session_id: str | None = None) -> dict[str, Any]:
        with self._lock:
            key = session_id or self._latest_session_id
            session = self._sessions.get(key) if key else None
            return session.to_dict() if session else {
                "version": LIVE_ECONOMY_VERSION,
                "mode": "python-authoritative-town-economy",
                "authoritative": True,
                "status": "waiting",
                "session_count": len(self._sessions),
                "empire_market_threshold": EMPIRE_MARKET_TERRITORY_THRESHOLD,
            }

    def town_status(self, session_id: str, town_name: str) -> dict[str, Any]:
        with self._lock:
            session, town = self._session_and_town(session_id, town_name)
            data = town.to_dict()
            data["empire_trade_unlocked"] = session.empire_trade_unlocked
            data["empire_territory_count"] = session.empire_territory_count
            data["empire_market_threshold"] = EMPIRE_MARKET_TERRITORY_THRESHOLD
            return data
