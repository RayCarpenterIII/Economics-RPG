# The Egg Lands

**Current handoff version:** v87 — Origin Character Creator  
**Primary playable file:** `index.html`

The Egg Lands is a browser-based RPG and living-economy simulation maintained as a single playable HTML file. Open `index.html` in a modern browser to play it without a build step or installation.

## Current milestone

v87 is a stable handoff point centered on the new character pipeline:

- Mandatory first-run character creator before class selection or gameplay
- Open-asset, layered character construction using Universal LPC sprite sheets
- Saved player identity, ancestry, body, hair, clothing, colors, and equipment appearance
- Deterministic modular appearances for NPCs
- Unified on-foot and raptor-mounted player appearance
- Tameable and rideable feathered raptors, including recall whistle and mounted bite
- Desktop and mobile controls with direct interaction and context-sensitive actions
- Persistent towns, NPC households, relationships, memories, conversations, government, production, inventory, crafting, combat, classes, and life skills
- Wide buildings with collision footprints and XYZ/depth-aware rendering

The in-game Help menu is the authoritative control reference because controls have changed across releases.

## Run the game

1. Extract the ZIP.
2. Open `index.html` in Chrome, Edge, Firefox, or another modern browser.
3. On the first run, remain online while the pinned base game source and open character assets are loaded.
4. Subsequent launches can reuse browser storage and cache, although clearing site data may require another online load.

No package manager, compiler, or local server is required for ordinary play.

## Important architecture note

The current `index.html` is a versioned loader and patch compositor rather than a fully independent offline source dump.

It loads the pinned base game from:

`RayCarpenterIII/Economics-RPG` at commit `544ceaaf1a60d4c26ac058a601256d2f49e3077b`

It then applies the accumulated game patches through v87 and caches the resulting source in browser storage.

The open character assets are loaded from the Universal LPC Spritesheet Character Generator at pinned revision:

`b312d60647509b06339ba951c18f4f5ff9cb6b52`

Do not casually replace either pin with a moving branch. A changed upstream source can invalidate patch anchors and cause older systems to disappear.

## Repository layout in this handoff

```text
index.html                         Current playable v87 build
README.md                          Player and repository overview
HANDOFF.md                         Technical continuation notes
ATTRIBUTION.md                     Open-asset licensing and attribution notes
PROJECT_STATE.json                 Machine-readable handoff metadata
PROMPT_1_UPLOAD_TO_GITHUB.md       Prompt for publishing this package
PROMPT_2_RETRIEVE_AND_CONTINUE.md  Prompt for iterative development from GitHub
tools/validate_build.py            Lightweight build/syntax validator
```

## Development contract

Continue using these rules unless the project owner explicitly changes them:

1. Keep a complete playable HTML build after every major update.
2. Increment the visible version for every delivered update: v88, v89, and so on.
3. Preserve existing approved systems and save compatibility.
4. Do not silently replace character art, raptor art, controls, or simulation systems.
5. Ask before making major creative decisions; implementation details can be handled directly.
6. Return the complete updated HTML file, not only code snippets.
7. Validate JavaScript syntax and obvious initialization failures before delivery.
8. Keep the character attribution/credits discoverable in the game.
9. Do not push to GitHub unless the user explicitly asks for a repository update.
10. Treat the most recently delivered HTML as the only authoritative working copy.

## Validation

Run:

```bash
python tools/validate_build.py index.html
```

The validator checks key handoff markers and uses `node --check` on the outer loader script when Node.js is available.

## Saves

The game uses browser storage. Updating `index.html` should not intentionally wipe existing saves. Any schema change must include a migration or safe default values for older saves.

Before a risky update, test with both:

- A new game
- An existing v87 save

## Known limitations at handoff

- A first-time launch requires network access because the pinned base source and LPC sprite sheets are fetched remotely.
- The patch chain is large, so broad search-and-replace operations can damage unrelated systems.
- Mounted character alignment may still require visual tuning for some body and clothing combinations.
- The project remains a large single HTML file. This is intentional for the current workflow, but future engine or multi-file migration should be treated as a separate approved project.
- Open LPC assets have per-file licenses and attribution requirements. Review `ATTRIBUTION.md` before commercial distribution.

## Recommended next development step

Do not immediately add more content. First visually test the v87 creator and mounted rider across:

- Every body type
- Every direction
- Idle, walk, run, attack, and mounted states
- Desktop and mobile layouts
- New and migrated saves

Record any clipping or old-renderer fallback before expanding the asset library.
