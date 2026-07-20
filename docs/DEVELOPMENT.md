# Development workflow

The Egg Lands keeps an easy-to-upload, single-file release without keeping all editable code in one giant file.

## The rule

Edit files under `src/`. Do not hand-edit `index.html`, `dev.html`, or `dist/index.html`; `node build.js` regenerates all three.

## Commands

```bash
npm run dev
```

Builds the game and opens a local server in source mode. Each JavaScript system remains a separate browser request, which makes file names and line numbers useful in developer tools. Add `-- --lan` to make the development server available to a phone on the same Wi-Fi network.

```bash
npm test
```

Checks that the standalone build is current, parses the complete game script, tests important dialogue memory and save/load behavior, then simulates 40 days of NPC and market updates.

```bash
npm run build
```

Regenerates the standalone root `index.html`, modular `dev.html`, and deployable `dist/` directory.

## Source map

| File | Responsibility |
|---|---|
| `src/index.template.html` | Canvas, menus, dialogue, and touch-control markup |
| `src/styles/game.css` | Desktop, mobile, menus, HUD, and visual styling |
| `src/js/00-state-economy.js` | Shared state, constants, goods, towns, and utilities |
| `src/js/01-villages-npcs.js` | Households, agents, relationships, memories, councils |
| `src/js/02-world-terrain.js` | Procedural terrain, resources, depletion, and regrowth |
| `src/js/03-dungeon.js` | Old Mine rooms and dungeon state |
| `src/js/04-shops.js` | Enterable specialty buildings |
| `src/js/05-player-combat.js` | Classes, skills, movement, blocking, audio, attacks |
| `src/js/06-time-schedules.js` | Days, caravans, NPC schedules, distance-based updates |
| `src/js/07-markets-building.js` | Trading and civic construction |
| `src/js/08-interactions.js` | Contextual use/talk/gather behavior |
| `src/js/09-dialogue-llm.js` | Deterministic dialogue, LLM backends, important memory |
| `src/js/10-ui-panels.js` | Menus, settings, HUD, skills, and inspector |
| `src/js/11-save-load.js` | Persistent game snapshots and restoration |
| `src/js/12-rendering.js` | World, entities, effects, minimap, and frame rendering |
| `src/js/13-input-boot.js` | Keyboard, pointer, touch, fullscreen, and startup |

The JavaScript files are classic scripts loaded in the order listed in `build.js`, so their existing shared game state continues to work. When adding a new system file, add it to `jsFiles` in `build.js` at the point where its dependencies are already defined.

## Publishing to GitHub

For the simplest GitHub Pages setup, upload the full project to the repository root and publish from the root of the main branch. The generated `index.html`, manifest, and icon are already in the right place. The `src/`, docs, tests, and build script should also remain in the repository so future edits are maintainable.
