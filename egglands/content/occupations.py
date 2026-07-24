"""Occupations and target labor allocation for the Phase 2 prototype."""

from .definitions import OccupationDefinition

OCCUPATIONS: dict[str, OccupationDefinition] = {
    "farmer": OccupationDefinition("farmer", "Farmer", "grow_grain", 72, 0.25),
    "miller": OccupationDefinition("miller", "Miller", "mill_flour", 92, 0.06),
    "baker": OccupationDefinition("baker", "Baker", "bake_bread", 96, 0.08),
    "lumberjack": OccupationDefinition("lumberjack", "Lumberjack", "cut_timber", 88, 0.10),
    "quarry_worker": OccupationDefinition("quarry_worker", "Quarry Worker", "quarry_stone", 94, 0.08),
    "miner": OccupationDefinition("miner", "Miner", "mine_ore", 104, 0.08),
    "smith": OccupationDefinition("smith", "Smith", "forge_tools", 128, 0.05),
    "hunter": OccupationDefinition("hunter", "Hunter", "hunt_game", 102, 0.08),
    "weaver": OccupationDefinition("weaver", "Weaver", "weave_cloth", 90, 0.06),
    "merchant": OccupationDefinition("merchant", "Merchant", None, 110, 0.05),
    "builder": OccupationDefinition("builder", "Builder", None, 105, 0.04),
    "unemployed": OccupationDefinition("unemployed", "Unemployed", None, 0, 0.02),
}
