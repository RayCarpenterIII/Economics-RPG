# The Egg Lands

A base-building economy RPG where every inhabitant lives a simulated life instead of following a script. Villagers have needs, memories, relationships, household plans, and town politics — all driven by a deterministic economic simulation, with an optional **local, open-source LLM** acting as a bounded planner on top. The goal: a retro-styled world that feels alive because of the *depth* of each NPC, not the pixel count.

The release is still a single `index.html` game that runs in modern desktop and phone browsers. For maintainability, the editable source is split into focused files under `src/`; a zero-dependency build script combines them back into the standalone HTML release.

## Play online

**▶ https://raycarpenteriii.github.io/Economics-RPG/** — nothing to install, works on phones (add to home screen for fullscreen). The default villager mind is a tiny 4-bit SmolLM2 135M model that runs through CPU/WASM, so WebGPU is not required. It downloads and caches when you begin the first conversation.

## Quick start

You need [Node.js](https://nodejs.org) (any recent version — used only as a tiny static file server).

```
git clone https://github.com/RayCarpenterIII/Economics-RPG.git
cd Economics-RPG
node serve.js
```

or on Windows just double-click **run.bat**. The game opens at `http://localhost:8420`.

To play on your phone (same Wi-Fi network):

```
node serve.js --lan
```

and open the printed `http://<your-pc-ip>:8420` URL on the phone. Add it to your home screen to play fullscreen as an installed app.

## Editing and building

Edit the files in `src/`, not the generated root `index.html`. No packages need to be installed:

```bash
npm run dev       # rebuild, then serve separate source files for debugging
npm test          # verify the build plus dialogue/NPC simulation
npm run build     # regenerate index.html and dist/index.html
```

The generated root `index.html` remains the GitHub Pages entry point. The `dist/` folder is the smallest deployable version; the full repository ZIP contains both editable source and deployable output.

## The villager mind

The default is **HuggingFaceTB/SmolLM2-135M-Instruct**, quantized to 4-bit and run in the browser on CPU/WASM. It is dedicated to quick villager conversations while the deterministic simulation handles household and council planning. Villagers carry recent conversation turns and save only important personal facts you explicitly share, such as your name, promises, home, preferences, or goals.

For stronger dialogue and model-assisted planning, the one-command setup — `setup-llm.bat` (Windows) or `./setup-llm.sh` (macOS/Linux) — installs Ollama and pulls a larger model. Details and alternatives are in **[docs/LLM-SETUP.md](docs/LLM-SETUP.md)**. Three backends are switchable in-game:

| Backend | Runs on | Good for |
|---|---|---|
| **Lightweight browser CPU** (default) | Browser CPU/WASM | Smooth zero-setup conversations, including phones without WebGPU |
| **Local server** (Ollama, LM Studio, llama.cpp, vLLM — anything OpenAI-compatible) | Your GPU/CPU | Desktop testing, bigger models, swapping models freely |
| **WebGPU** (experimental) | The browser's GPU | Larger zero-install models on compatible hardware |

To use it in-game: open **Menu → Settings**. The lightweight default loads automatically on the first conversation, or you can select a different backend and press **Load / connect**. God mode is also under Settings and only controls access to the private village inspector.

The LLM is deliberately *bounded* when taking action: it chooses among candidate plans that the simulation has already validated (with scores and rationales), and anything illegal it returns is rejected — the deterministic simulation stays authoritative. In conversation, the model is grounded in the villager's actual family, traits, work, needs, relationships, memories, rumors, and town state, with recent dialogue turns carried forward so a villager can sustain a real exchange.

## How to play

Trade among three towns, keep a caravan alive, recover the Heartstone from the old mine, and construct a civic building.

| Input | Action |
|---|---|
| WASD / arrows | Move |
| Mouse | Aim (left-click attacks) |
| Space | Attack — time presses for a three-hit combo |
| X | Jump; press again in midair to double-jump over low attacks |
| E | Talk, trade, build, gather, enter |
| C / right-click | Block (last-moment block parries) |
| F / Q | Combat specialty / daily economic influence |
| Shift | Dash |
| M / K | Menu / Skills |

On a phone in landscape, the touch HUD has Attack, Jump, Use, Skill (hold for daily influence), and a dedicated wide Block button. Double-tap a direction to dash.

## What is simulated

- **Markets**: Cobb-Douglas consumers, price formation from supply/demand pressure, treasuries, shortages, caravan trade between towns.
- **Villagers**: the starting world is intentionally intimate—four residents in Egg Lands (one of each economic type) and one three-person household in each smaller settlement. Each has six needs (hunger, safety, belonging, comfort, status, purpose), personality traits, wealth, and a profession that responds to incentives.
- **Memory & rumor**: villagers remember events they witnessed and *distort* the ones they only heard about, filtered through their traits.
- **Relationships**: affection, trust, respect, obligation, resentment, mentorship — per pair, asymmetric.
- **Households**: shared stocks, family plans chosen from scored candidates ("secure food", "seek office", …).
- **Scarcity and terrain**: varied meadows, marshes, beaches, forests, and highlands affect travel. Individual trees yield logs and disappear when felled; rocks yield stone and collapse to rubble, with both changes saved until natural regrowth. Villagers also make visible gathering trips, and shortages ripple into prices.
- **Institutions**: town councils, taxes, policies, public chronicles, festivals — including raising a palisade wall with a gate that physically keeps raiders out.

## NPC update regime

The game separates visual movement from expensive decisions so additional villagers do not require every system to run every rendered frame:

- **Visible NPCs** update every frame for smooth movement and combat.
- **Nearby off-screen NPCs** update at 10 Hz.
- **Distant NPCs** update at roughly 3 Hz and are not submitted to the renderer.
- Schedule targets and guard threat scans are cached and refreshed at tier-appropriate intervals.
- Markets, needs, households, councils, migration, and life-cycle events update once per five-minute game day rather than every frame.
- The lightweight LLM runs only for player-requested dialogue. It is never called for every NPC every frame, and deterministic rules remain responsible for background planning.

Run the zero-dependency build, dialogue, and simulation test suite with:

```bash
npm test
```

Turn on **God mode** in **Menu → Settings** to reveal the private village inspector.

## Repository layout

```
src/index.template.html  shared HTML structure
src/styles/game.css      game and mobile interface styles
src/js/                  ordered simulation, combat, dialogue, UI, and rendering systems
build.js                 combines source into the standalone release
index.html               generated GitHub Pages entry point
dev.html                 generated source-file development entry point
dist/                    minimal deployable standalone build
serve.js              zero-dependency dev server (desktop + LAN/phone)
package.json          build, development, and test commands (no dependencies)
run.bat               Windows one-click launcher
setup-llm.bat/.sh     one-command Ollama install + model pull
manifest.webmanifest  PWA manifest (install on phone)
docs/DESIGN.md        design vision and simulation architecture
docs/DEVELOPMENT.md   source map, build workflow, and publishing guide
docs/LLM-SETUP.md     running local models on your GPU/CPU
docs/ROADMAP.md       where this is going
```

## License

[MIT](LICENSE). Model weights you download for the LLM backends have their own licenses.
