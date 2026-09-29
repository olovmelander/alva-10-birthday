# Story and puzzle flow — 29 September 2026

Branch: `codex/skoldhast-story-flow`, starting at merged main `b24ee42`.
Baseline: 117/117 tests, including the complete-game robot. This pass keeps the
three chapters, their puzzle solutions, Alva's creature and the privacy rules.

## Audit before changes

The story has a strong destination but leaves several causes unstated. The
player should be able to explain each action as part of getting the frozen
splash back, without having to reconstruct the design document.

| Area | Observed problem | Intended change |
| --- | --- | --- |
| Opening | The drawn shoreline vanishes with its input overlay. A 0.35-second line appears 150 paper units above it, but no paper actually folds. Both questions receive the same answer. | Keep the player's unfinished stroke on the paper; show a deliberate fold moving the sea and stopping the splash; answer the chosen question and give the hero a concrete wish. |
| First map demonstration | A rock sprite flips vertically. Neither the held map nor the dune visibly explains the map/world rule; the effect can be outside the camera. | Frame map and matching sand together, show map first and world second, hold the result, then restore both. |
| P1 | A warning and joke set up an obstacle but barely connect its broken line to the crease or the investigation. | Explain the damage and why the repaired crossing leads towards evidence. |
| P2/P3 | The reflection and high wave marks are separate discoveries. Visiting the sea first can send the goal towards a chapter gate before the wave marks are studied. After all ramps grow, guidance still targets a flower. | Connect reflection and wave marks to the folded coastline; give a correct return route and then a ledge destination. |
| P4–P6 | The two marks feel like a collection requirement; the fish are introduced after their help. | Establish where the torn map leads and why each ability reveals its missing route; acknowledge discoveries in either order. |
| P7 | The figure and lighthouse are not strongly connected on arrival. | Make reopening the keeper's shutters the next investigative step, reusing the reflection rule. |
| P8/finale | The line is not explicitly Alva's interrupted shoreline. The apology implies the problem was simply an unfinished drawing. | Return to the opening stroke; show why land and sea need both halves of the sköldhäst, and affirm that a moving shoreline is allowed to change. |

Story thread: **get the splash back → investigate the fold → assemble its map →
reach the keeper → finish the interrupted shoreline together**. Prefer replacing
existing lines and short remarks during play over adding long conversations.

Before captures are made from an isolated archive of the baseline, so they
cannot accidentally include changes made during this pass. After captures,
test outcomes and remaining observations will be recorded below.
