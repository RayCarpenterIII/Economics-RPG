# The Egg Lands

A base-building economy RPG where every inhabitant lives a simulated life instead of following a script. Villagers have needs, memories, relationships, household plans, and town politics — all driven by a deterministic economic simulation, with an optional **local, open-source LLM** acting as a bounded planner on top. The goal: a retro-styled world that feels alive because of the *depth* of each NPC, not the pixel count.

The whole game is a single HTML file. It runs in any modern browser, on desktop and on phones (a translucent touch HUD appears automatically in landscape).

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

## The local LLM mind (optional)

The simulation is fully playable with its deterministic utility-driven planner. If you want villagers' households and town councils to be steered by a real language model running **on your own GPU/CPU**, see **[docs/LLM-SETUP.md](docs/LLM-SETUP.md)**. Two backends are supported, switchable in-game:

| Backend | Runs on | Good for |
|---|---|---|
| **Local server** (Ollama, LM Studio, llama.cpp, vLLM — anything OpenAI-compatible) | Your GPU/CPU | Desktop testing, bigger models, swapping models freely |
| **In-browser** (WebLLM over WebGPU) | The browser's GPU | Zero-install demos, phones with WebGPU |

To use it in-game: open **Menu → Help**, tick **God mode**, then open the **God mode** tab. Pick a backend, point it at your server (default `http://localhost:11434/v1`, Ollama's address), and press **Initialize local LLM**.

The LLM is deliberately *bounded*: it chooses among candidate plans that the simulation has already validated (with scores and rationales), and anything illegal it returns is rejected — the deterministic simulation stays authoritative. This keeps the world coherent while letting the model add judgment and flavor.

## How to play

Trade among three towns, keep a caravan alive, recover the Heartstone from the old mine, and construct a civic building.

| Input | Action |
|---|---|
| WASD / arrows | Move |
| Mouse | Aim (left-click attacks) |
| Space | Attack — time presses for a three-hit combo |
| E | Talk, trade, build, gather, enter |
| C / right-click | Block (last-moment block parries) |
| F / Q | Combat specialty / daily economic influence |
| Shift | Dash |
| M / K | Menu / Skills |

On a phone in landscape, the touch HUD provides all of the above.

## What is simulated

- **Markets**: Cobb-Douglas consumers, price formation from supply/demand pressure, treasuries, shortages, caravan trade between towns.
- **Villagers**: six needs (hunger, safety, belonging, comfort, status, purpose), personality traits, wealth, professions that switch when incentives demand it.
- **Memory & rumor**: villagers remember events they witnessed and *distort* the ones they only heard about, filtered through their traits.
- **Relationships**: affection, trust, respect, obligation, resentment, mentorship — per pair, asymmetric.
- **Households**: shared stocks, family plans chosen from scored candidates ("secure food", "seek office", …).
- **Institutions**: town councils, taxes, policies, public chronicles, festivals.

Turn on **God mode** (Menu → Help) to inspect any villager's private state and watch the planner think.

## Repository layout

```
index.html            the entire game (simulation, renderer, UI)
serve.js              zero-dependency dev server (desktop + LAN/phone)
run.bat               Windows one-click launcher
manifest.webmanifest  PWA manifest (install on phone)
docs/DESIGN.md        design vision and simulation architecture
docs/LLM-SETUP.md     running local models on your GPU/CPU
docs/ROADMAP.md       where this is going
```

## License

[MIT](LICENSE). Model weights you download for the LLM backends have their own licenses.
