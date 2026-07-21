# The Egg Lands

A browser-based economics RPG and living-settlement simulation.

This repository bundle contains the current **v34 HD-2D foundation build**, the recent release history, development injections, and an asset metadata template for creating future 32-pixel artwork.

## Play

Open `index.html` in a modern browser.

The v34 build keeps the existing 16-world-unit simulation grid while introducing a 32-pixel art contract, larger foot-anchored characters, depth sorting, 16:9 framing, lighting, atmosphere, and scalable asset metadata.

### First-launch note

The current composed build may require an internet connection on its first launch to retrieve its pinned base source. It caches the composed game after a successful connected launch. The in-game Settings menu also includes an **Export standalone HTML** option.

## Repository layout

```text
index.html                         Current playable v34 build
assets/templates/                  HD-2D asset metadata templates
docs/                              Roadmap and architecture notes
releases/                          Archived playable builds v20-v34
development/injections/            Incremental development injection files
VERSION.json                       Machine-readable current-version metadata
CHECKSUMS.sha256                   Integrity hashes for bundled files
```

## Current major systems

- Utility-driven citizens, households, schedules, memories, relationships, factions, romance, and optional local-LLM dialogue
- Government choices, voting, town focus, raids, relations, civic projects, and public works
- Physical gathering, farms, livestock, wildlife, biomes, elevation, roads, bridges, and infrastructure
- Timed workshops and intermediate production chains
- Combat, classes, equipment, crafting, dungeons, caravans, markets, and save/load
- HD-2D rendering foundation with independent visual dimensions and collision footprints

## Updating GitHub

1. Extract this ZIP.
2. Copy the extracted contents into the root of `RayCarpenterIII/Economics-RPG`.
3. Review the changed files.
4. Commit with a message such as:

```bash
git add .
git commit -m "Add v34 HD-2D rendering foundation and archive recent builds"
git push
```

The root `index.html` is the current playable build. The `releases/` copies are archival and may be removed later if repository size becomes a concern.

## Next recommended work

1. Split the composed game into maintainable source modules.
2. Replace procedural placeholders with authored 32-pixel terrain and 40x56 character sprite sheets.
3. Add texture atlases and chunked terrain caching.
4. Build multi-layer building assets and interiors.
5. Add weather, stronger lighting, water effects, and WebGL rendering after Canvas parity is stable.
6. Resume production-chain depth, housing expansion, and diplomacy after the visual migration is stable.
