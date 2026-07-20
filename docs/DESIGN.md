# Design vision

## The premise

Most base-building games fake their inhabitants: NPCs are animation loops with a job title. The Emberfold Valley starts from the opposite end — **the economy and the people are the real game**, and the RPG you play happens inside their world. The player is one inhabitant among many, not the center of the universe.

The design bet: a world feels alive not because of graphical fidelity but because of the **depth of each individual** — their needs, their imperfect memories, their grudges and loyalties, their plans that sometimes fail. Retro pixel visuals are a feature here: they set expectations low so the behavioral depth lands harder.

## Two-layer minds: simulation below, language model above

Every villager is driven by two cooperating layers:

### Layer 1 — the deterministic economic simulation (always on)

This is the ground truth, built on real microeconomics:

- **Consumers** maximize Cobb-Douglas utility over food, shelter, status, training, and leisure; each villager's preference weights (alphas) are individually jittered, so no two villagers value things identically.
- **Producers** choose labor vs. leisure from real wage signals, and switch professions when relative prices make their current trade a bad deal.
- **Markets** clear with price pressure from supply and demand; towns hold treasuries; caravans arbitrage price differences between settlements; buildings (granary, academy, court, workshop) shift comparative advantage.
- **Needs** (hunger, safety, belonging, comfort, status, purpose) accumulate and decay from lived experience, not scripts.
- **Households** pool food, coins, and shelter condition, and adopt week-long plans chosen from scored candidates.
- **Institutions**: town councils rank policy candidates (food reserve, road patrols, apprenticeships, festivals, housing repair, market fairs) and enact the winner; every significant event enters a public Chronicle.
- **Memory and rumor**: villagers store first-hand event memories, and second-hand *rumors* that are distorted through their personality traits ("Some say the danger was worse than reported…"). Relationships (affection, trust, respect, obligation, resentment, mentorship) update from shared events, asymmetrically.

This layer alone produces a playable, coherent world. It is cheap (thousands of agents are feasible), reproducible, and impossible for a language model to break.

### Layer 2 — the bounded LLM planner (optional, local, swappable)

A local open-weights LLM adds judgment on top. Critically, it is **bounded**:

1. The simulation generates *legal candidate plans*, each with a utility score and a rationale.
2. The LLM receives the household/town state plus the candidate list and must return `{"choice": "<candidate id>", "rationale": "..."}`.
3. Anything outside the legal list is rejected; the deterministic choice stands. The LLM can *never* invent resources, actions, or physics.

This architecture is the answer to the classic LLM-NPC failure modes (hallucinated items, incoherent economies, prompt injection via chat): the model supplies *personality and judgment*, the simulation supplies *truth*.

The model itself is fully swappable — any OpenAI-compatible local server (Ollama, LM Studio, llama.cpp, vLLM) or in-browser WebLLM. See [LLM-SETUP.md](LLM-SETUP.md).

## Where this goes: NPCs as persistent selves

The end state (see [ROADMAP.md](ROADMAP.md)) is that each villager owns a **persona document** — a compact, evolving system prompt containing:

- **Bias/voice**: personality traits, values, and speech style seeded at birth and drifted by life events.
- **Memory stream**: salient episodic memories plus periodically *consolidated reflections* ("I no longer trust the council since the granary failed") written by the LLM itself during quiet simulation ticks.
- **Skills and history**: profession record, mentors, achievements.
- **Relationships**: standing summaries of the people who matter to them.
- **Desires**: current goals ranked by the needs model.

The key mechanic is **self-update**: at low frequency (nightly, in simulation time), the LLM rewrites parts of its own persona document based on what happened — always through validated, size-bounded edits, so a persona can grow bitter or hopeful but cannot grow game-breaking. Deep NPCs, bounded costs: the expensive language model runs rarely per villager, while the cheap simulation runs every tick.

## Player experience principles

- **RPG at heart**: classes, skill trees, gear with grid inventory, combat with combos/parries, a dungeon, quests. The simulation is the setting, not homework.
- **Legibility**: everything the simulation "thinks" is inspectable in God mode — needs bars, relationship ledgers, plan rationales, the LLM's last decision. Ordinary play hides it; curiosity reveals it.
- **One file, every screen**: the entire game is a single HTML file that runs on desktop and mobile browsers, installable as a PWA. No build step, no engine, no asset pipeline — the lowest possible barrier for contributors.
- **Local-first AI**: no cloud calls, no cost per decision, no telemetry. Your villagers think on your hardware.
