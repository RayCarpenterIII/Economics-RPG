"""Content registry and deterministic manifest export."""

from __future__ import annotations

from dataclasses import dataclass

from .buildings import BUILDINGS
from .classes import CLASSES
from .items import ITEMS
from .occupations import OCCUPATIONS
from .races import RACES
from .recipes import RECIPES


@dataclass(frozen=True, slots=True)
class ContentRegistry:
    schema_version: int
    project_version: str
    legacy_game_version: int


CONTENT_REGISTRY = ContentRegistry(schema_version=4, project_version="0.27", legacy_game_version=92)


def build_content_manifest() -> dict[str, object]:
    """Return the stable v0.27 Python content manifest."""

    return {
        "schema_version": CONTENT_REGISTRY.schema_version,
        "project_version": CONTENT_REGISTRY.project_version,
        "legacy_game_version": CONTENT_REGISTRY.legacy_game_version,
        "phase": 3,
        "compatibility_mode": "python-authoritative-town-economy-plus-villager-trade",
        "races": {key: RACES[key].to_dict() for key in sorted(RACES)},
        "classes": {key: CLASSES[key].to_dict() for key in sorted(CLASSES)},
        "items": {key: ITEMS[key].to_dict() for key in sorted(ITEMS)},
        "recipes": {key: RECIPES[key].to_dict() for key in sorted(RECIPES)},
        "occupations": {key: OCCUPATIONS[key].to_dict() for key in sorted(OCCUPATIONS)},
        "buildings": {key: BUILDINGS[key].to_dict() for key in sorted(BUILDINGS)},
    }
