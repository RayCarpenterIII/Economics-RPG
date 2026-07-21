# HD-2D Migration Architecture

## Foundational decision

The game keeps a **16-world-unit logical tile** and adopts a **32x32-pixel standard art tile**.

```js
const WORLD_TILE = 16;
const ART_TILE = 32;
const PIXELS_PER_WORLD_UNIT = ART_TILE / WORLD_TILE;
```

This preserves pathfinding, saves, collision coordinates, farms, roads, towns, and economic simulation while allowing higher-detail artwork.

## Coordinate spaces

The renderer should maintain three distinct spaces:

1. **Tile coordinates** for map authoring and terrain indexing.
2. **World coordinates** for simulation, collision, interaction, and saves.
3. **Screen/output coordinates** for camera transforms and rendering.

No simulation logic should depend on artwork dimensions.

## Entity contract

Every visible entity should separate its world transform, collider, visual dimensions, anchor, and animation state.

```js
entity.transform = { x: 100, y: 120 };
entity.collider = { offsetX: -6, offsetY: -7, width: 12, height: 8 };
entity.visual = {
  spriteId: "human_farmer_01",
  width: 40,
  height: 56,
  anchorX: 20,
  anchorY: 52,
  depthOffset: 0
};
```

The world position represents the character's feet. Tall artwork extends upward from that point.

## Render order

1. Base terrain
2. Terrain transitions and decals
3. Roads, paths, bridges, farms, and ground details
4. Ground shadows
5. Low props
6. Depth-sorted entities and building bases
7. Roofs, canopies, and foreground occluders
8. Atmosphere and weather
9. Lighting and color grading
10. Interface

## Standard target sizes

| Asset | Recommended art size |
|---|---:|
| Ground tile | 32x32 |
| Adult character | 36x54 or 40x56 |
| Child | 24x36 or 26x38 |
| Chicken | 16x16 to 20x20 |
| Goat | 28x24 |
| Tree | 48x72 to 64x96 |
| Small house | 96x96 minimum |
| Workshop | 128x112 or larger |
| Civic building | 160x128 or larger |

## Development waves

### Wave 1: Architecture

- Modularize source code.
- Remove rendering calls from simulation logic.
- Centralize coordinate conversion.
- Preserve existing gameplay and save behavior.

### Wave 2: Spatial presentation

- Foot anchors and compact colliders.
- Y-depth sorting.
- Foreground occlusion layers.
- Smooth pixel-stable camera.
- 640x360 logical viewport and 1280x720 presentation output.

### Wave 3: Authored art

- 32-pixel terrain tiles and deterministic variants.
- Four-direction character sprite sheets.
- Multi-tile buildings, trees, props, farms, animals, and workshops.
- Equipment overlays and animation state machines.

### Wave 4: HD effects

- Time-of-day lighting.
- Local lights.
- Shadows.
- Weather and atmospheric particles.
- Water and reflection effects.

### Wave 5: Scale and tooling

- Texture atlases.
- Chunked terrain caching.
- Asset validation.
- Tiled/Aseprite import workflow.
- WebGL/Pixi renderer after visual parity.

## Completion criteria

- Artwork can change resolution without altering simulation results.
- Characters pass correctly in front of and behind world objects.
- Sprite dimensions and collision dimensions are independent.
- Existing saves retain valid positions.
- New assets can be registered through metadata rather than custom rendering code.
- Desktop and mobile performance remain acceptable.
