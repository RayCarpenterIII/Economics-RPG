# Technical Handoff — The Egg Lands v87

## Source of truth

`index.html` in this package is the source of truth for continued work.

Do not begin from an older repository `index.html`, an earlier downloaded artifact, or a reconstructed summary. Fetch or upload this exact file first.

## Current version markers

- Game version: `87`
- Display name: `The Egg Lands - Origin Character Creator v87`
- Base source commit: `544ceaaf1a60d4c26ac058a601256d2f49e3077b`
- Loader cache key: `egglands_v87_loader_source_544ceaaf`
- LPC asset revision: `b312d60647509b06339ba951c18f4f5ff9cb6b52`

## Core architecture

The outer HTML performs four jobs:

1. Fetches or restores the pinned base game HTML.
2. Applies an accumulated patch chain containing the approved game additions.
3. Composes and caches the resulting runnable document.
4. Writes the composed document into the current page.

The patch chain contains escaped script endings such as `<\/script>`. Do not normalize them to literal `</script>` inside JavaScript template strings, or the outer document can terminate its script early.

## Character System 2.0

The current character system has multiple generations of compatibility code. The intended active behavior is:

- v87 startup creator controls first-run identity and appearance.
- v85 open-LPC renderer is the preferred visual renderer.
- v86 unified rider capture should render the same modular character on the raptor.
- Procedural character rendering exists only as a fallback when open assets fail.
- Old blue rider rendering must not reappear during mounting.

When modifying character rendering, verify all of the following:

- Creator preview
- Player on foot
- NPC rendering
- Player mounted on the raptor
- Player shield and weapon layers
- Sit/mounted body frame
- Raptor head/body/rider depth order

## Raptor behavior that must be preserved

- Tameable and rideable
- Large, forgiving mount interaction radius
- No permanent interaction circle under the raptor
- Relaxed follow behavior with independent animal hunting
- Harmless playful pounces at peaceful villagers
- Whistle recall available only after taming
- Varied compact bite crunch
- Localized bite effect
- Original left/right run animations
- Diagonal projection only when depth movement requires it

## Mobile UI behavior that must be preserved

- Directly tap/click nearby people, buildings, resources, animals, and raptors
- Context-sensitive interaction circle
- Compact skill rail that avoids other controls
- Fullscreen button present
- Gameplay controls hidden while typing in dialogue
- Combined mobile attack/block behavior

## Save discipline

Each delivered version should:

- Increase snapshot/save metadata version
- Add defaults for missing new fields
- Avoid deleting unknown older fields
- Preserve deterministic NPC appearances
- Preserve completed character-creator status
- Preserve tamed raptor state and ability unlocks

## Editing strategy

Prefer a narrowly scoped appended patch over rewriting the base game.

For each update:

1. Copy the latest HTML to a new versioned filename.
2. Add one new patch block with a unique version ID.
3. Advance the title, loader text, cache keys, snapshot version, and exported metadata.
4. Validate the outer loader JavaScript.
5. Extract and validate the newly added runtime patch separately when practical.
6. Test the changed state with a small mock or browser run.
7. Deliver the complete updated HTML.

Avoid global replacements unless the exact number of expected matches is confirmed.

## Minimum release checklist

- [ ] New version number appears in title and loader
- [ ] New composed/cache key is unique
- [ ] Outer loader passes JavaScript syntax validation
- [ ] New runtime patch passes syntax validation
- [ ] New game initializes
- [ ] Existing save loads
- [ ] Character creator can complete
- [ ] Player remains customized on foot
- [ ] Player remains customized while mounted
- [ ] Mobile controls do not overlap
- [ ] Fullscreen button remains visible
- [ ] Raptor mount/whistle/bite still work
- [ ] Complete HTML artifact is returned

## Repository synchronization

The iterative workflow should use one local working copy after the initial GitHub retrieval. Do not repeatedly fetch the repository on every small request because that risks discarding unsynced work.

Only push updates when the user explicitly asks. When pushing:

- Commit the latest `index.html`
- Retain the versioned artifact when useful
- Update `README.md`, `HANDOFF.md`, and `PROJECT_STATE.json`
- Report the branch and commit SHA
