"""Typed content contracts for The Egg Lands.

Phase 2 keeps all authoritative content declarations in Python. The preserved
browser game still owns legacy gameplay while the Python economy runs as a
headless, deterministic simulation beside it.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal

Direction = Literal["down", "left", "right", "up"]
CharacterSize = Literal["large", "small"]


@dataclass(frozen=True, slots=True)
class SpriteContract:
    frame_width: int
    frame_height: int
    directions: tuple[Direction, ...]
    frames_per_direction: int
    ground_anchor_x: int
    ground_anchor_y: int

    @property
    def sheet_width(self) -> int:
        return self.frame_width * self.frames_per_direction

    @property
    def sheet_height(self) -> int:
        return self.frame_height * len(self.directions)

    def to_dict(self) -> dict[str, object]:
        result = asdict(self)
        result["sheet_width"] = self.sheet_width
        result["sheet_height"] = self.sheet_height
        return result


@dataclass(frozen=True, slots=True)
class RaceDefinition:
    id: str
    label: str
    size: CharacterSize
    sprite: SpriteContract
    supports_horns: bool = False
    supports_tail: bool = False
    supports_fur: bool = False
    supports_ears: bool = False

    def to_dict(self) -> dict[str, object]:
        result = asdict(self)
        result["sprite"] = self.sprite.to_dict()
        return result


@dataclass(frozen=True, slots=True)
class ClassDefinition:
    id: str
    label: str
    description: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class ItemDefinition:
    id: str
    label: str
    category: str
    base_price_cents: int
    stack_limit: int = 999
    perishable: bool = False

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class RecipeDefinition:
    id: str
    label: str
    occupation_id: str
    labor_minutes: int
    inputs: dict[str, int]
    outputs: dict[str, int]
    building_id: str

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class OccupationDefinition:
    id: str
    label: str
    recipe_id: str | None
    base_daily_wage_cents: int
    target_worker_share: float

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class BuildingDefinition:
    id: str
    label: str
    capacity_per_building: int
    worker_capacity: int

    def to_dict(self) -> dict[str, object]:
        return asdict(self)
