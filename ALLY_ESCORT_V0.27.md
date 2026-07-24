# Trade Ally Escort v0.27

## Eligibility

The escort system does not create loyalty from nothing. A villager must first become a v0.26 trade ally by crossing the existing protection threshold through repeated mutually useful trade.

## Player controls

Open an eligible villager's dialogue and select **Invite to escort**. Settings contains **Recall active allies** and **Dismiss all escorts**, so the system works on keyboards without function keys and on touch devices.

## Following

The escort maintains a trailing position relative to the player's facing direction. If the ally becomes separated by a very large distance, the patch safely recalls the ally near the player rather than allowing permanent pathing drift.

## Combat

An active escort searches for a living enemy within the engagement radius. It approaches, attacks on a cooldown, tracks health, and may become temporarily downed. Downed allies recover after a short delay and resume duty. Ally defeats do not grant duplicate player combat rewards.

## Persistence

The save payload stores active state, current and maximum health, downed recovery time, and escort mode by stable villager ID. The original v0.26 trade relationship remains the source of eligibility.

## Performance boundary

The initial release allows at most two active escorts. This is a deliberate update-cost and screen-crowding boundary, not a permanent design limit.
