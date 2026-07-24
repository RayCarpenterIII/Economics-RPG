"""The three playable classes retained by the current game."""

from .definitions import ClassDefinition

CLASSES: dict[str, ClassDefinition] = {
    "warrior": ClassDefinition(
        id="warrior",
        label="Warrior",
        description="Physical combat specialist.",
    ),
    "mage": ClassDefinition(
        id="mage",
        label="Mage",
        description="Magic and specialty-action specialist.",
    ),
    "noble": ClassDefinition(
        id="noble",
        label="Noble",
        description="Hybrid class focused between combat and influence.",
    ),
}
