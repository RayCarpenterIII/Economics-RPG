"""Headless town economy introduced in The Egg Lands v0.27.

The model intentionally starts as an aggregate economic simulation with
individual households and citizen attributes. It is deterministic, testable,
and independent of rendering. It does not replace the preserved browser game's
legacy economy yet.
"""

from __future__ import annotations

import math
import random
import time
from collections import Counter
from dataclasses import asdict, dataclass, field
from statistics import fmean
from typing import Any

from egglands.content.buildings import BUILDINGS
from egglands.content.items import ITEMS
from egglands.content.occupations import OCCUPATIONS
from egglands.content.recipes import RECIPES
from egglands.economy.matrix_backend import backend_name, matmul


@dataclass(frozen=True, slots=True)
class EconomyConfig:
    population: int = 1_000
    days: int = 365
    seed: int = 20_260_724
    town_name: str = "Eggford"

    def validate(self) -> None:
        if not 10 <= self.population <= 100_000:
            raise ValueError("population must be between 10 and 100000")
        if not 1 <= self.days <= 3_650:
            raise ValueError("days must be between 1 and 3650")


@dataclass(slots=True)
class PopulationState:
    household_id: list[int]
    age: list[int]
    occupation_id: list[str]
    skill: list[float]
    hunger: list[float]
    happiness: list[float]

    @property
    def size(self) -> int:
        return len(self.age)


@dataclass(slots=True)
class HouseholdState:
    size: list[int]
    wealth_cents: list[int]

    @property
    def count(self) -> int:
        return len(self.size)


@dataclass(slots=True)
class EconomyResult:
    version: str
    config: EconomyConfig
    elapsed_seconds: float
    matrix_backend: str
    household_count: int
    working_age_population: int
    employed_population: int
    employment_rate: float
    average_household_wealth_cents: int
    average_hunger: float
    average_happiness: float
    final_inventory: dict[str, int]
    final_prices_cents: dict[str, int]
    total_production: dict[str, int]
    total_consumption: dict[str, int]
    occupation_counts: dict[str, int]
    building_counts: dict[str, int]
    monthly_trace: list[dict[str, Any]]
    invariants: dict[str, bool]
    utility_matrix_shape: tuple[int, int]

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["config"] = asdict(self.config)
        data["utility_matrix_shape"] = list(self.utility_matrix_shape)
        return data


def _build_households(population: int, rng: random.Random) -> tuple[list[int], HouseholdState]:
    household_ids: list[int] = []
    household_sizes: list[int] = []
    household_wealth: list[int] = []
    remaining = population
    household_id = 0
    while remaining > 0:
        size = min(remaining, rng.choices([1, 2, 3, 4, 5], weights=[8, 24, 30, 26, 12], k=1)[0])
        household_sizes.append(size)
        household_wealth.append(rng.randint(4_000, 24_000))
        household_ids.extend([household_id] * size)
        remaining -= size
        household_id += 1
    return household_ids, HouseholdState(household_sizes, household_wealth)


def _assign_occupations(ages: list[int], rng: random.Random) -> list[str]:
    occupation_ids = list(OCCUPATIONS)
    weights = [OCCUPATIONS[key].target_worker_share for key in occupation_ids]
    total = sum(weights)
    normalized = [weight / total for weight in weights]
    assigned: list[str] = []
    for age in ages:
        if age < 16 or age > 72:
            assigned.append("dependent")
        elif rng.random() < 0.84:
            assigned.append(rng.choices(occupation_ids, weights=normalized, k=1)[0])
        else:
            assigned.append("unemployed")
    return assigned


def _create_population(config: EconomyConfig, rng: random.Random) -> tuple[PopulationState, HouseholdState]:
    household_ids, households = _build_households(config.population, rng)
    ages: list[int] = []
    for _ in range(config.population):
        bucket = rng.random()
        if bucket < 0.22:
            ages.append(rng.randint(0, 15))
        elif bucket < 0.86:
            ages.append(rng.randint(16, 64))
        else:
            ages.append(rng.randint(65, 88))
    occupations = _assign_occupations(ages, rng)
    skills = [rng.uniform(0.72, 1.28) if occupation not in {"dependent", "unemployed"} else 0.0 for occupation in occupations]
    return (
        PopulationState(
            household_id=household_ids,
            age=ages,
            occupation_id=occupations,
            skill=skills,
            hunger=[0.12 for _ in ages],
            happiness=[0.58 for _ in ages],
        ),
        households,
    )


def _initial_inventory(population: int) -> dict[str, int]:
    return {
        "grain": population * 5,
        "flour": population * 2,
        "bread": population * 3,
        "meat": population,
        "timber": population * 2,
        "stone": population * 2,
        "iron_ore": population // 2,
        "tools": max(30, population // 8),
        "hides": population // 3,
        "cloth": population // 4,
    }


def _building_counts(occupation_counts: Counter[str]) -> dict[str, int]:
    counts: dict[str, int] = {building_id: 0 for building_id in BUILDINGS}
    for occupation_id, occupation in OCCUPATIONS.items():
        if not occupation.recipe_id:
            continue
        recipe = RECIPES[occupation.recipe_id]
        worker_count = occupation_counts.get(occupation_id, 0)
        capacity = BUILDINGS[recipe.building_id].worker_capacity
        counts[recipe.building_id] = max(1 if worker_count else 0, math.ceil(worker_count / capacity))
    counts["market"] = max(1, math.ceil(occupation_counts.get("merchant", 0) / BUILDINGS["market"].worker_capacity))
    return counts


def _daily_demand(population: int, household_count: int) -> dict[str, int]:
    return {
        "bread": max(1, round(population * 0.50)),
        "meat": max(1, round(population * 0.11)),
        "cloth": max(1, round(population * 0.006)),
        "tools": max(1, round(household_count * 0.0025)),
    }


def _update_prices(
    prices: dict[str, int],
    inventory: dict[str, int],
    demand: dict[str, int],
) -> None:
    for item_id, item in ITEMS.items():
        daily = demand.get(item_id, max(1, inventory.get(item_id, 0) // 30))
        target_stock = max(5, daily * 10)
        stock = max(0, inventory.get(item_id, 0))
        scarcity = target_stock / max(1.0, stock + target_stock * 0.25)
        desired = item.base_price_cents * (0.62 + 0.72 * scarcity)
        minimum = item.base_price_cents * 0.35
        maximum = item.base_price_cents * 5.0
        smoothed = prices[item_id] * 0.88 + desired * 0.12
        prices[item_id] = int(round(min(maximum, max(minimum, smoothed))))


def _run_utility_batch(population: PopulationState) -> tuple[list[list[float]], tuple[int, int]]:
    features = [
        [
            citizen_hunger,
            1.0 - citizen_happiness,
            min(1.0, age / 80.0),
            skill,
            1.0,
        ]
        for citizen_hunger, citizen_happiness, age, skill in zip(
            population.hunger,
            population.happiness,
            population.age,
            population.skill,
            strict=True,
        )
    ]
    # eat, work, rest, socialize, shop, train
    weights = [
        [1.8, -0.4, 0.2, 0.0, 0.7, -0.2],
        [-0.2, 0.4, 0.5, 1.2, 0.1, 0.3],
        [0.0, -0.1, 0.6, 0.0, 0.0, -0.2],
        [-0.1, 0.8, -0.2, 0.3, 0.2, 1.1],
        [0.1, 0.2, 0.1, 0.1, 0.1, 0.1],
    ]
    scores = matmul(features, weights)
    return scores, (len(features), len(weights[0]))


def run_economy_scenario(config: EconomyConfig | None = None) -> EconomyResult:
    config = config or EconomyConfig()
    config.validate()
    started = time.perf_counter()
    rng = random.Random(config.seed)
    population, households = _create_population(config, rng)
    occupation_counts = Counter(population.occupation_id)
    working_age = sum(16 <= age <= 72 for age in population.age)
    employed = sum(occupation not in {"dependent", "unemployed"} for occupation in population.occupation_id)
    buildings = _building_counts(occupation_counts)
    inventory = _initial_inventory(config.population)
    prices = {item_id: item.base_price_cents for item_id, item in ITEMS.items()}
    production = {item_id: 0 for item_id in ITEMS}
    consumption = {item_id: 0 for item_id in ITEMS}
    demand = _daily_demand(config.population, households.count)
    monthly_trace: list[dict[str, Any]] = []
    utility_shape = (0, 0)

    skill_totals: Counter[str] = Counter()
    for occupation, skill in zip(population.occupation_id, population.skill, strict=True):
        skill_totals[occupation] += skill

    for day in range(1, config.days + 1):
        tool_bonus = 1.0 + min(0.18, inventory["tools"] / max(1, config.population) * 0.35)

        for occupation_id, occupation in OCCUPATIONS.items():
            if not occupation.recipe_id:
                continue
            workers = occupation_counts.get(occupation_id, 0)
            if workers <= 0:
                continue
            recipe = RECIPES[occupation.recipe_id]
            building = BUILDINGS[recipe.building_id]
            labor_minutes = skill_totals[occupation_id] * 7.5 * 60.0 * tool_bonus
            labor_batches = int(labor_minutes // recipe.labor_minutes)
            building_batches = buildings[recipe.building_id] * building.capacity_per_building
            input_batches = 2**31 - 1
            for item_id, quantity in recipe.inputs.items():
                input_batches = min(input_batches, inventory[item_id] // quantity)
            batches = max(0, min(labor_batches, building_batches, input_batches))
            if batches == 0:
                continue
            for item_id, quantity in recipe.inputs.items():
                inventory[item_id] -= quantity * batches
            for item_id, quantity in recipe.outputs.items():
                amount = quantity * batches
                inventory[item_id] += amount
                production[item_id] += amount

        # Tools decay slowly as production equipment wears down.
        worn_tools = min(inventory["tools"], max(0, employed // 550))
        inventory["tools"] -= worn_tools
        consumption["tools"] += worn_tools

        fulfilled: dict[str, int] = {}
        for item_id, requested in demand.items():
            amount = min(requested, inventory[item_id])
            inventory[item_id] -= amount
            consumption[item_id] += amount
            fulfilled[item_id] = amount

        bread_ratio = fulfilled["bread"] / demand["bread"]
        meat_ratio = fulfilled["meat"] / demand["meat"]
        food_ratio = min(1.0, bread_ratio * 0.78 + meat_ratio * 0.22)
        daily_hunger_change = (1.0 - food_ratio) * 0.10 - food_ratio * 0.025
        price_pressure = prices["bread"] / ITEMS["bread"].base_price_cents - 1.0

        for index in range(population.size):
            household_wealth = households.wealth_cents[population.household_id[index]]
            wealth_security = min(1.0, household_wealth / 18_000.0)
            population.hunger[index] = min(1.0, max(0.0, population.hunger[index] + daily_hunger_change))
            target_happiness = 0.68 - population.hunger[index] * 0.55 + wealth_security * 0.16 - max(0.0, price_pressure) * 0.05
            population.happiness[index] += (target_happiness - population.happiness[index]) * 0.035
            population.happiness[index] = min(1.0, max(0.0, population.happiness[index]))

        # Wages and household consumption costs are settled daily.
        household_income = [0 for _ in households.size]
        for citizen_index, occupation_id in enumerate(population.occupation_id):
            if occupation_id not in OCCUPATIONS or occupation_id == "unemployed":
                continue
            wage = OCCUPATIONS[occupation_id].base_daily_wage_cents
            household_income[population.household_id[citizen_index]] += wage
        daily_food_cost = fulfilled["bread"] * prices["bread"] + fulfilled["meat"] * prices["meat"]
        total_people = max(1, sum(households.size))
        for household_id, size in enumerate(households.size):
            expense = round(daily_food_cost * size / total_people)
            households.wealth_cents[household_id] = max(
                0,
                households.wealth_cents[household_id] + household_income[household_id] - expense,
            )

        _update_prices(prices, inventory, demand)

        if day % 7 == 0 or day == config.days:
            _, utility_shape = _run_utility_batch(population)

        if day % 30 == 0 or day == config.days:
            monthly_trace.append(
                {
                    "day": day,
                    "bread_price_cents": prices["bread"],
                    "bread_inventory": inventory["bread"],
                    "grain_inventory": inventory["grain"],
                    "average_hunger": round(fmean(population.hunger), 5),
                    "average_happiness": round(fmean(population.happiness), 5),
                    "average_household_wealth_cents": round(fmean(households.wealth_cents)),
                }
            )

    elapsed = time.perf_counter() - started
    invariants = {
        "nonnegative_inventory": all(quantity >= 0 for quantity in inventory.values()),
        "positive_prices": all(price > 0 for price in prices.values()),
        "population_preserved": population.size == config.population,
        "household_members_preserved": sum(households.size) == config.population,
        "bounded_hunger": all(0.0 <= value <= 1.0 for value in population.hunger),
        "bounded_happiness": all(0.0 <= value <= 1.0 for value in population.happiness),
    }

    return EconomyResult(
        version="0.27",
        config=config,
        elapsed_seconds=elapsed,
        matrix_backend=backend_name(),
        household_count=households.count,
        working_age_population=working_age,
        employed_population=employed,
        employment_rate=employed / max(1, working_age),
        average_household_wealth_cents=round(fmean(households.wealth_cents)),
        average_hunger=fmean(population.hunger),
        average_happiness=fmean(population.happiness),
        final_inventory=dict(sorted(inventory.items())),
        final_prices_cents=dict(sorted(prices.items())),
        total_production=dict(sorted(production.items())),
        total_consumption=dict(sorted(consumption.items())),
        occupation_counts=dict(sorted(occupation_counts.items())),
        building_counts=dict(sorted(buildings.items())),
        monthly_trace=monthly_trace,
        invariants=invariants,
        utility_matrix_shape=utility_shape,
    )
