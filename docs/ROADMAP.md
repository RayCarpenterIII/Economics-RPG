# Roadmap

## Phase 0 — Foundation (done)

- [x] Single-file game: valley, three towns, dungeon, combat, gathering, crafting, grid inventory, skill trees, quests.
- [x] Deterministic living-world simulation: Cobb-Douglas markets, needs, traits, memories, rumors, relationships, households, councils, public Chronicle.
- [x] Bounded LLM planner for household plans and council policy.
- [x] Swappable local backends: OpenAI-compatible servers (Ollama / LM Studio / llama.cpp / vLLM) and in-browser WebLLM.
- [x] Mobile touch HUD + PWA manifest; LAN play from a phone.

## Phase 1 — LLM dialogue with real grounding

- [ ] Route the free-text NPC conversation box through the local LLM, with the villager's traits, needs, memories, rumors, and relationship to the player injected as context.
- [ ] Strict output contract (say / offer / refuse) so dialogue can never mutate state directly.
- [ ] Per-villager voice: derive a compact persona block (bias, speech style) from traits + class + history.
- [ ] Dialogue memory: conversations become event memories the villager can reference later.

## Phase 2 — Persona documents and self-update

- [ ] Persistent per-NPC persona document (bias, reflections, desires, relationship summaries).
- [ ] Nightly reflection pass: the LLM consolidates the day's memories into short reflections and may propose bounded edits to its own persona.
- [ ] Validation layer for self-edits (size caps, schema, no game-state claims).
- [ ] Persona persistence in save files; export/import a villager.

## Phase 3 — Depth and scale

- [ ] Priority scheduler: budget LLM calls across the population (important villagers and on-screen villagers think more often; everyone gets a turn).
- [ ] Life-cycle depth: aging, apprenticeship outcomes, inheritance, migration between towns driven by utility gaps.
- [ ] Player base-building: found and grow a settlement that real villagers choose to migrate to.
- [ ] Larger populations via simulation LOD (full sim near player, statistical sim far away).

## Phase 4 — Packaging

- [ ] Proper PWA offline support (service worker) and installability polish.
- [ ] Optional desktop shell (Tauri) bundling a llama.cpp server so "download and play" needs zero setup.
- [ ] Optional mobile wrapper (Capacitor) with an on-device inference option for capable phones.

## Non-goals

- Cloud LLM dependencies, accounts, or telemetry.
- Letting any language model bypass the deterministic simulation's validation.
