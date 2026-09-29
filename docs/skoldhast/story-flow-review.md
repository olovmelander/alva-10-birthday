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

## Implemented connections

- The sköldhäst asks Alva to extend the shore because it wants the next wave on
  its hooves. An outside ruler interrupts that exact stroke. A textured corner
  of the painted sheet folds underneath, and the falling droplets stop during
  the fold. The shoreline remains on the surviving paper. The questions now
  distinguish what happened from who might have done it.
- Klo's map experiment shows the cause first and its effect second. The small
  sheet in his claw, its magnified view and the matching sand patch share blue
  marks. The map folds, the beach responds, both pause for comparison, and then
  the map and beach unfold in the same order. This establishes the rule before
  any puzzle depends on it.
- P1 repairs a path towards the wave evidence. P2 shows a route under the frozen
  surface. P3 connects the displaced shore to Klippudden. The two valid orders
  retain different, accurate next steps.
- P4–P6 recover the missing parts of that route. The collected fragments use the
  notebook's same torn silhouettes in a new assembly moment; a continuous blue
  route then reaches the lighthouse. The camera follows that consequence into
  the bay.
- P7's shutter mechanisms call back to the musical boardwalk, the heavy shell
  and riding currents with the fish. The purpose is to reach the person seen
  with the ruler. P8 explicitly continues Alva's opening shoreline, and the
  keeper's apology accepts a shore that can move rather than blaming her drawing.

Existing puzzle solutions and chapter gates stay intact. Extra observations are
short remarks during play. The school of fish no longer stops for a blocking
success dialogue, and the early kelp reminder no longer repeatedly locks input
during its cooldown.

The route fixes also cover growing all three ramps before visiting the ledge,
returning by the rope after either fragment order, using the earned beach shortcut
back to the lighthouse, and showing the actual interaction at Vattenporten.

## Alva's coloured cloud

The opening drawing has five pencil choices: sky blue, lavender, peach, rose and
paper white. Changing pencil recolours the draft without losing its shape. The
coloured versions have translucent pigment and fine pencil hatching; paper white
retains the outline style. The same painter makes the drawing preview, paper
picture and restored game texture. Only the player's new cloud is coloured.

The chosen colour and at most 200 finite points are saved. Old saves without a
colour keep their outline cloud. Texture dimensions are bounded, and the fill is
drawn once rather than using a filter every frame. During the prologue the cloud
settles completely inside the sky that survives the fold. In the game it has
gentle distant drift and bounded parallax, preserves the drawn aspect ratio and
clears the actual sun sprite, including its rays. Short landscape screens use the
open sky to the left of the hero, away from the large handwritten label. Picture
snapshots also use that open space. Reduced motion removes decorative drift.

## Visual evidence

Before sheets and focused views:
[`shots/k3/story-flow/before/`](shots/k3/story-flow/before/).
These were captured from `b24ee42`, before source edits.

After sheets and focused views:
[`shots/k3/story-flow/after/`](shots/k3/story-flow/after/).
The three current sheets in `shots/k3/` are refreshed too. Each sheet covers the
title and all 27 places. The tours start without a player drawing; the separate
cloud views exercise actual drawn/saved colour and real land coordinates.

| Look at | Before | After |
| --- | --- | --- |
| Interrupted shoreline, landscape | [Shore](shots/k3/story-flow/before/opening-shore-844x390.webp) | [Retained stroke](shots/k3/story-flow/after/opening-shore-844x390.webp) |
| Opening fold, landscape | [Line and question](shots/k3/story-flow/before/opening-crease-choice-844x390.webp) | [Moving paper](shots/k3/story-flow/after/opening-midfold-844x390.webp), [folded result](shots/k3/story-flow/after/opening-question-844x390.webp) |
| Opening fold, portrait | [Line and question](shots/k3/story-flow/before/opening-crease-choice-390x844.webp) | [Moving paper](shots/k3/story-flow/after/opening-midfold-390x844.webp), [folded result](shots/k3/story-flow/after/opening-question-390x844.webp) |
| Klo's experiment | [Old rock effect](shots/k3/story-flow/before/map-demo-staged-844x390.webp) | [Matching map and beach](shots/k3/story-flow/after/map-demo-844x390.webp) |
| Both map fragments | — | [Assembled route](shots/k3/story-flow/after/map-assembled-844x390.webp) |
| Cloud drawing and reload | — | [Five pencils](shots/k3/story-flow/after/cloud-palette-844x390.webp), [restored portrait cloud](shots/k3/story-flow/after/cloud-restored-390x844.webp) |
| Cloud placement with real scenery | — | [Landscape](shots/k3/story-flow/after/cloud-sky-844x390.webp), [portrait](shots/k3/story-flow/after/cloud-sky-390x844.webp), [desktop](shots/k3/story-flow/after/cloud-sky-1440x900.webp) |

The fold uses a few textured triangles, pencil edges and layered shadow strokes;
the map effects use bounded vector shapes. No external art, filters, audio files
or text-to-speech were added. Reduced motion retains the ordered evidence through
static poses and fades. No physical terrain changes are made by the demonstration.

## Recorded checks

- Pure suite: **141/141 pass**, including the complete-game robot and deterministic
  frame-rate checks. First playable: **2,769,354 bytes / 3,000,000** after the water
  correction and rebuilt entrance art.
- Final full tours after the water/camera fix: **84 captures, zero browser
  errors** (title plus all 27 places at each of three viewports). Every stop was
  compared with its baseline. No new terrain, art or UI regressions were found.
  The desktop sheets are stored at 1176 pixels wide for repository size; before
  and after use the same scaling.
- Opening: both phone sizes, normal and reduced motion; both answers, rotation
  and close/reopen. The crease meets the actual traced endpoint within 0.00001
  paper units. Retained-paper pixel checks catch snapshot/mask regressions.
- Map effects: both phones and reduced motion; ordered map/world action,
  assembly, framing, rotation, restored state, scene rebuild and cancellation.
- Cloud drawing: both phones, real mouse/touch strokes, pencil selection by
  pointer and keyboard, recolouring, cancellation and rotation. Actual
  close/reopen produces identical texture pixels; legacy saves retain outlines.
- Cloud sky: four pure tests and 50 browser states, including round/wide shapes,
  facing directions, gallop zoom, real terrain, sun rays, lettering, rotation,
  picture snapshots and reduced motion. Zero captured browser errors.
- Four fresh journeys: keyboard/touch at 844×390 and 390×844, covering the real
  prologue, P1–P8, ending and all extras. Keyboard journeys used 44,451 fixed
  steps; touch used 44,217. Each played 148 boardwalk notes. Landscape runs
  preceded the cloud palette; portrait runs included it. Water was subsequently
  covered by its dedicated crossing/entry regressions and the full robot.
- Required browser gates passed: launch, save, touch at both phone sizes, guide,
  pages and normal finale. The normal finale loaded the final camera adjustment;
  the water check directly covers that adjustment during entrance, surface
  swimming and exit. Reduced finale and cancellation checks also passed during
  the story pass. Save and WebGL recovery were rechecked after adding the cloud.
  All reported zero captured errors.

The later cave/pool correction and matched views are documented separately in
[`water-alignment-review.md`](water-alignment-review.md).

## Checks to repeat

```sh
npm test
npm run build:skoldhast -- --check
node tests/browser/skoldhast-opening.mjs --out /tmp/opening
node tests/browser/skoldhast-fold-demo.mjs --out /tmp/fold-demo
node tests/browser/skoldhast-cloud-color.mjs --out /tmp/cloud-color
node tests/browser/skoldhast-cloud-sky.mjs --out /tmp/cloud-sky
node tests/browser/skoldhast-journey.mjs --viewport 844x390 --input touch --out /tmp/journey
```

Run the journey in both input modes and both phone orientations. The opening
check uses real drawing gestures, compares the surviving paper before/after,
checks that the crease meets the traced endpoint, observes the freeze while the
fold is moving, exercises both answers, rotation, reduced motion and cancellation.
The map effects check framing, ordered causes, restored state, same-scene asset
rebuilds and cancellation when leaving a scene.

These are automated interaction and rendering checks. A fresh player's ability
to explain the story without prompting still needs a human playtest; physical
phone performance and listening retain the previous handover's limitations.
