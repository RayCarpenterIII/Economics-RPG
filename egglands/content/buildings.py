"""Initial production-building definitions."""

from .definitions import BuildingDefinition

BUILDINGS: dict[str, BuildingDefinition] = {
    "farm": BuildingDefinition("farm", "Farm", capacity_per_building=120, worker_capacity=20),
    "mill": BuildingDefinition("mill", "Mill", capacity_per_building=90, worker_capacity=12),
    "bakery": BuildingDefinition("bakery", "Bakery", capacity_per_building=100, worker_capacity=12),
    "lumber_camp": BuildingDefinition("lumber_camp", "Lumber Camp", 75, 16),
    "quarry": BuildingDefinition("quarry", "Quarry", 65, 18),
    "mine": BuildingDefinition("mine", "Mine", 55, 18),
    "smithy": BuildingDefinition("smithy", "Smithy", 30, 8),
    "hunter_lodge": BuildingDefinition("hunter_lodge", "Hunter Lodge", 45, 12),
    "weaver": BuildingDefinition("weaver", "Weaver", 45, 10),
    "market": BuildingDefinition("market", "Market", 300, 20),
}
