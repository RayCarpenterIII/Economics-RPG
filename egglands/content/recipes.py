"""Initial production recipes for the Phase 2 town economy."""

from .definitions import RecipeDefinition

RECIPES: dict[str, RecipeDefinition] = {
    "grow_grain": RecipeDefinition("grow_grain", "Grow Grain", "farmer", 60, {}, {"grain": 10}, "farm"),
    "mill_flour": RecipeDefinition("mill_flour", "Mill Flour", "miller", 30, {"grain": 4}, {"flour": 3}, "mill"),
    "bake_bread": RecipeDefinition("bake_bread", "Bake Bread", "baker", 20, {"flour": 2}, {"bread": 3}, "bakery"),
    "cut_timber": RecipeDefinition("cut_timber", "Cut Timber", "lumberjack", 55, {}, {"timber": 4}, "lumber_camp"),
    "quarry_stone": RecipeDefinition("quarry_stone", "Quarry Stone", "quarry_worker", 65, {}, {"stone": 4}, "quarry"),
    "mine_ore": RecipeDefinition("mine_ore", "Mine Iron Ore", "miner", 75, {}, {"iron_ore": 3}, "mine"),
    "forge_tools": RecipeDefinition("forge_tools", "Forge Tools", "smith", 120, {"iron_ore": 3, "timber": 1}, {"tools": 1}, "smithy"),
    "hunt_game": RecipeDefinition("hunt_game", "Hunt Game", "hunter", 80, {}, {"meat": 4, "hides": 1}, "hunter_lodge"),
    "weave_cloth": RecipeDefinition("weave_cloth", "Weave Cloth", "weaver", 90, {"hides": 1}, {"cloth": 2}, "weaver"),
}
