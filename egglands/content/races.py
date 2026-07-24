"""Playable race definitions confirmed by the v92 character system."""

from .definitions import RaceDefinition, SpriteContract

DIRECTIONS = ("down", "left", "right", "up")

LARGE_SPRITE = SpriteContract(
    frame_width=32,
    frame_height=64,
    directions=DIRECTIONS,
    frames_per_direction=4,
    ground_anchor_x=16,
    ground_anchor_y=63,
)

SMALL_SPRITE = SpriteContract(
    frame_width=32,
    frame_height=32,
    directions=DIRECTIONS,
    frames_per_direction=4,
    ground_anchor_x=16,
    ground_anchor_y=31,
)

RACES: dict[str, RaceDefinition] = {
    "human": RaceDefinition(
        id="human",
        label="Human",
        size="large",
        sprite=LARGE_SPRITE,
    ),
    "tiefling": RaceDefinition(
        id="tiefling",
        label="Tiefling",
        size="large",
        sprite=LARGE_SPRITE,
        supports_horns=True,
        supports_tail=True,
    ),
    "khajit": RaceDefinition(
        id="khajit",
        label="Khajit",
        size="small",
        sprite=SMALL_SPRITE,
        supports_tail=True,
        supports_fur=True,
        supports_ears=True,
    ),
}
