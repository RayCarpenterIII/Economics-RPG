# Prompt 1 — Publish or Update the GitHub Repository

Copy and paste the prompt below into a new capable coding/GitHub session, then attach this entire ZIP file.

---

I am handing you the current authoritative build of my browser game, **The Egg Lands v87**. The attached ZIP is the source of truth.

Your job is to publish it to or update my GitHub repository cleanly and safely.

Repository: `[PASTE OWNER/REPOSITORY HERE]`  
Target branch: `[PASTE BRANCH, OR USE main]`

## Required workflow

1. Inspect the entire attached ZIP before changing GitHub.
2. Read `README.md`, `HANDOFF.md`, `PROJECT_STATE.json`, and `ATTRIBUTION.md`.
3. Treat the ZIP's `index.html` as the authoritative current game. Do not substitute the older repository version.
4. Inspect the target repository and preserve unrelated files and commit history.
5. Before overwriting an existing game build, create a safe backup using a branch, tag, or clearly named versioned copy such as `releases/the-egg-lands-v87.html`.
6. Put the current playable build at the repository root as `index.html`.
7. Add or update these handoff files in the repository:
   - `README.md`
   - `HANDOFF.md`
   - `ATTRIBUTION.md`
   - `PROJECT_STATE.json`
   - `PROMPT_1_UPLOAD_TO_GITHUB.md`
   - `PROMPT_2_RETRIEVE_AND_CONTINUE.md`
   - `tools/validate_build.py`
8. Do not redesign the game or change gameplay during this publishing task.
9. Run the included validator and any additional safe HTML/JavaScript syntax checks available.
10. Confirm that the committed `index.html` is v87 and contains these exact pins:
    - Base source commit: `544ceaaf1a60d4c26ac058a601256d2f49e3077b`
    - LPC asset commit: `b312d60647509b06339ba951c18f4f5ff9cb6b52`
11. Commit with a clear message such as:
    `Handoff The Egg Lands v87 origin character creator`
12. Push the target branch only after validation succeeds.

## Return to me

Report:

- Repository and branch updated
- Commit SHA
- Files created or changed
- Backup branch/tag/versioned copy created
- Validation performed and its result
- Any repository conflict or limitation you encountered

Do not claim a push succeeded unless GitHub confirms it.

---
