# The Egg Lands v0.27 — Release Notes

## Primary addition

Trusted trade allies now provide active escort and combat support.

- Invite an eligible trade ally from the villager dialogue panel.
- Up to two allies can follow the player.
- Allies follow through world and dungeon scenes.
- Allies detect and attack nearby enemies.
- Allies track health, become temporarily downed, recover, and resume duty.
- Escort state and health persist through saves.
- Recall and dismiss controls are available under Settings with mouse and touch.

## Preserved systems

- Python-authoritative living economy
- Direct villager trade and formal markets
- Three-territory internal empire market
- Human, Tiefling, and Khajit characters
- Warrior, Mage, and Noble classes
- Raptor mounting and byte-backed raptor sound effects
- Standalone HTML operation
- Windows, macOS, and Linux local launchers

## Validation

- 25 Python unit tests passed.
- 33 controlled character/browser checks passed.
- 15 live HTTP server integration checks passed.
- Outer loader, bridge, audio, economy, and ally JavaScript all passed Node syntax validation.
- No function key is required for diagnostics or escort controls.

## Known boundary

The execution environment cannot load the remote pinned legacy base game during direct Chromium navigation, so the compiled patch layers were executed in a controlled headless character shell. The actual local Python server and APIs were tested separately end to end.
