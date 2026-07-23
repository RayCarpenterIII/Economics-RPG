# Prompt 2 — Retrieve Once and Continue Iterative Development

Copy and paste the prompt below into a new game-development session.

---

I want to continue developing **The Egg Lands** with the same workflow I used previously.

GitHub repository: `[PASTE OWNER/REPOSITORY HERE]`  
Branch: `[PASTE BRANCH, OR USE main]`

## Initial retrieval

1. Retrieve the repository once at the start of this conversation.
2. Read these files before editing:
   - `index.html`
   - `README.md`
   - `HANDOFF.md`
   - `PROJECT_STATE.json`
   - `ATTRIBUTION.md`
3. Materialize `index.html` as the local authoritative working copy.
4. Confirm its version and the pinned base/LPC revisions.
5. Do not repeatedly fetch GitHub on every later request. Continue from the latest local HTML you delivered in this conversation unless I explicitly ask you to pull again, compare branches, or sync with GitHub.

## How we will work after retrieval

After the initial retrieval, I will ask for changes one at a time. For every change:

1. Briefly state the implementation plan, then begin immediately.
2. Preserve all unrelated approved systems and existing save compatibility.
3. Ask before making major creative decisions, but do not interrupt for ordinary implementation details.
4. Keep the game as one complete playable HTML file with embedded CSS and JavaScript.
5. Increment the version for every delivered build. The baseline is v87, so the next delivery should be v88.
6. Update all visible and internal version markers consistently, including title, loader text, cache keys, save/snapshot version, and exported metadata.
7. Do not return only snippets. Return the complete updated HTML file as a downloadable artifact.
8. Validate JavaScript syntax, initialization paths, missing functions, patch composition, and obvious regressions before delivery.
9. When possible, run focused mock tests for the systems changed.
10. Be explicit about what was tested and what could not be visually tested.
11. Preserve the open LPC attribution and detailed-credit access.
12. Never let the old blue legacy rider replace the customized character when mounting the raptor.
13. Do not push changes to GitHub unless I explicitly ask you to sync or publish the current build.

## Critical current systems to preserve

- Mandatory first-run character creator
- Open-asset modular player and NPC appearance system
- Same customized character on foot and mounted
- Tameable/rideable feathered raptor
- Raptor whistle, bite crunch, relaxed follow, animal hunting, and harmless villager pounces
- Direct click/tap interactions and adaptive context control
- Fullscreen button and non-overlapping compact skill controls
- Mobile dialogue mode that hides gameplay controls while typing
- Wide buildings with matching collision footprints and XYZ/depth behavior
- Economy, towns, households, relationships, conversations, government, crafting, inventory, combat, classes, and skills

## Artifact delivery

Name each file descriptively, for example:

`the-egg-lands-v88-<short-feature-name>.html`

Then provide a direct download link and a concise summary of the implemented changes and validation.

After you confirm retrieval, wait for my first requested change rather than inventing a new feature.

---
