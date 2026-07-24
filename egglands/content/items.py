"""Initial Phase 2 economic item catalog."""

from .definitions import ItemDefinition

ITEMS: dict[str, ItemDefinition] = {
    "grain": ItemDefinition("grain", "Grain", "food_input", 4, perishable=True),
    "flour": ItemDefinition("flour", "Flour", "food_input", 9, perishable=True),
    "bread": ItemDefinition("bread", "Bread", "food", 16, perishable=True),
    "meat": ItemDefinition("meat", "Meat", "food", 28, perishable=True),
    "timber": ItemDefinition("timber", "Timber", "material", 18),
    "stone": ItemDefinition("stone", "Stone", "material", 14),
    "iron_ore": ItemDefinition("iron_ore", "Iron Ore", "material", 25),
    "tools": ItemDefinition("tools", "Tools", "equipment", 180, stack_limit=100),
    "hides": ItemDefinition("hides", "Hides", "material", 34),
    "cloth": ItemDefinition("cloth", "Cloth", "material", 55),
}
