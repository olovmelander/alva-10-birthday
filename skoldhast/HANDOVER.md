# Sköldhästen – handover

Last updated: 29 September 2026. The review branch is `codex/skoldhast-polish`, based on `main` at `1af945b`. The design is in `docs/skoldhast-game-plan.md` (v2); the working rules are in `skoldhast/CLAUDE.md`.

## State

The whole game is built in one pass:
- the prologue, Kapitel 1–3, the final, the epilogue;
- all eight puzzles P1–P8 and the optional delights O1–O6 and O8;
- the journal, save slots and word codes;
- synthesized music and effects;
- colored-pencil art drawn in code.

`RELEASED_CHAPTER` is **3**, so everything is playable. The fourth button on the ticket is **hidden** unless the page is opened with `?skoldhast` (or `#skoldhast`).

| Area | State |
| --- | --- |
| Engine (`sim`, `puzzles`, `story`, `game`, `save`) | Done. The robot playthrough finishes all three chapters. |
| Renderer (`view.mjs`) | Done. Scenes, water and reflections, kelp, currents, the whirl, paper covers, darkness, particles, the camera, and the story effects. |
| Hero (`hero.mjs`, `rig.mjs`, `scripts/skoldhast-art/hero.mjs`) | Done. Her sköldhäst traced in code (route B), rigged with gaits by distance, leg IK on the terrain, leaps, Göm dig, swimming and drifting, the actions, and verlet hair. `dev/hero.html` shows it all. |
| Characters, table, UI art | Done: Klo with the signs, Kartväktaren, the lyktfiskar, shy creatures, Signe, the table props, the title lettering, the icons. |
| Scenery art (materials, backdrops, props) | Done: land, sea and bay atlases, evening backdrops, pencil strokes. |
| Audio (`audio.mjs`) | Done. The theme "Sköldhästens visa" in D dorian in five arrangements, stingers, synthesized foley, place ambience and adaptive layers for speed, underwater and hiding. It still needs a human listen (`dev/audio.html`). |
| Ticket integration (`index.html`) | Done. A hidden fourth button, a loading overlay that prefetches `files.json`, Avbryt and retry, and Mira's launch-race guard. |

## Animation, movement, audio and visual polish (29 September)

This pass improves the existing three chapters; `RELEASED_CHAPTER` stays 3.
The before/after audit and acceptance evidence are in
`docs/skoldhast/polish-review.md`. The original contact sheets are preserved in
`docs/skoldhast/shots/k3/before/`; the three current sheets are in `shots/k3/`.

- **Klo:** separate pencil body parts, sideways leg cycle, eased scuttles,
  bobbing, eye blinks, claw gestures, instrument fidgets, hole entry/emergence,
  underwater floating and a soft sprite shadow. Lettered frames never mirror.
  Touch, mouse and **K** give a click, hop/wave and one of **36** shuffled Swedish
  jokes in the nonblocking hint bubble. A 5.2-second cooldown and visibility,
  story/dialogue/menu guards protect play. Hero taps, the stick and Följ fingret
  share input routing; canceled pointers cannot leave steering or gallop held.
- **Hills:** exposed terrain is one material contour, including exact cliff
  faces and ramp joins. Hooves query the reachable surface instead of buried
  ground. Earned ramps grow over 0.65 seconds using the same fixed-step geometry
  for drawing and collision. The former 121-unit jump is now at most 2.31 units
  per step in the measured midpoint case. See `docs/skoldhast/hills-review.md`.
- **Movement:** forward hops and stationary perch hops work, slope speed varies
  continuously, hurdles use actual landing support and canceled skids respond
  correctly. Actions survive display frames with no simulation step, and menus
  clear pending input. Hold-to-hide release cancels a queued tuck, and reopening
  after a pause starts a live session. Deterministic replay includes 30/60/120/144 Hz.
- **Swimming:** integrated alternating paddle strokes, surface head lift,
  diving, floating hair/tail, softer buoyancy and glide. Real world coordinate
  tests cover feet, hair, particles and shadows. See `docs/skoldhast/movement-polish.md`.
- **Puzzles/menus:** stable contextual labels, reachable shell tune beside
  Signe, wet perch hopping, deterministic Spången notes, soft menu cues and
  scrollable 44-pixel notebook tabs. Portrait prologue cloud tracing now uses
  the same paper-to-screen transform as the other drawings.
- **Audio:** warmer arrangements of Sköldhästens visa, gait-timed surface
  contacts including a hollow pier, water/pencil/page/menu cues, Klo chatter,
  four place ambiences, darker light reverb and independent volume buses.
  Offline Chromium/FFmpeg QA reports zero clipping/non-finite samples, maximum
  sample peak −1.72 dBFS and true peak −1.5 dBFS under extreme overlap. Exact
  listening instructions and measurements: `docs/skoldhast/audio-polish.md`.
- **Scenery:** gentler pencil materials, visible distant ridges, underwater
  shafts/depth, bounded water shimmer and a dedicated warm evening bay. No
  heavy filters or downloaded sound/art were added. See `docs/skoldhast/scenery-polish.md`.

First polish gate: **66/66 tests passed**, including the whole-game robot. Required
launch, save, touch (both phone sizes), guide, pages and finale browser checks
pass; focused Klo, notebook, hills, audio and fresh journey evidence is linked
from `docs/skoldhast/polish-review.md`.

Additional checks:

```sh
node tests/browser/skoldhast-klo.mjs 844x390
node tests/browser/skoldhast-klo.mjs 390x844
node tests/browser/skoldhast-notebook.mjs
node tests/browser/skoldhast-journey.mjs --viewport 844x390 --input touch --out /tmp/journey
node tests/browser/skoldhast-journey.mjs --viewport 390x844 --input keyboard --out /tmp/journey
node tests/browser/skoldhast-hills.mjs --viewport 844x390 --out /tmp/hills
node scripts/skoldhast-audio-check.mjs --out /tmp/audio --no-images
```

Run the journey for both input modes at both phone sizes. It starts a fresh
save through the real title/prologue and sends DOM/CDP input, then accelerates
the fixed simulation to cover P1–P8 and the implemented extras. It is an
automated playthrough, not a human usability or physical-device performance test.

The current first-playable bundle is **2,723,140 bytes (2.723 MB)**, below the
strict **3,000,000-byte** build gate. Human listening and performance/feel on Alva's actual device remain
unverified. Foreground kelp can still briefly soften/overlap the hero; no new
missing scenery or terrain seams were found in the 27-place review.

## Polish round (29 September): understandable, forgiving, springier

After the first playtest ("it is very unclear what to do", "I am a bit stuck sometimes"):

- **Guidance layer** (`src/guide.mjs`, words in `sv.mjs` `GOALS`, `TIPS`, `BALK`, new `STORY` lines).
  - A goal note ("Mål") at the top shows the nearest unfinished task, with counters. Tapping it opens the journal.
  - Klo's hint bubble speaks up after 30 and 75 seconds without progress. It also fires at the moments that used to pass in silence, and after three identical refusals in a row.
  - Every refusal shows a thought bubble beside the sköldhäst's head.
  - One-time tips point at the control they explain.
  - `story.objective()` picks the nearest unfinished puzzle, and Kapitel 3 has its own steps.
  - Layout rules:
    - the note and the hint share one column at the top;
    - on short landscape phones the hint briefly replaces the note, and speech moves to the bottom so the sköldhäst stays in view;
    - toasts start below the column (`--sk-guide-free`).
- **Forgiving puzzles:**
  - P2: Knuffa reaches 1.5 HL, and the sköldhäst steps after the stone. After the reflection, a ghost stone and an arrow show where the stone belongs.
  - P3: a dotted arc of drifting seeds shows where the fluff will fly. Fluff finds a tuft within 1.5 HL. The sköldhäst wonders aloud when the fluff flies the wrong way.
  - Dashed lines you can draw glow when you are near.
  - The vault current is wider.
  - P7:
    - the drum needs 24 gallop steps (was 40), with a progress ring;
    - the plate is 1.6 HL wide and needs 1.2 s. It pulls a resting shell onto it, and a ring on the sand marks it;
    - the pipe mouth draws in a hidden shell within 2.2 HL (`suck`).
- **Physics:**
  - acceleration 1350 (was 1000);
  - full gallop at 72 % stick deflection, and the knob glows;
  - pencil speed lines at full gallop;
  - higher hops, and Hoppa pressed just before landing still hops;
  - the camera no longer bobs on small hops;
  - swimming is a little quicker.
- **Turning pages** (`src/pageturn.mjs`, used by `view.mjs`; tune it in `dev/pageturn.html`):
  - moving between land, the kelp forest and the bay turns the old picture away like a notebook page, forward or back in the page order `PAGE` in `main.mjs`;
  - the white paper over a new chapter peels away. The Kapitel 2 opening frames it first; other covers peel when a third of the screen shows them. A cosmetic flag `peeled_<id>` remembers it;
  - the lighthouse glimpse turns to the bay's page and back;
  - the final unfold lifts the page, and it turns away onto Alva's picture;
  - less motion turns each of these into a short crossfade.
- **New checks:**
  - `node tests/browser/skoldhast-guide.mjs [--out dir]` plays a new game into Kapitel 1 and checks every guidance step;
  - `node tests/browser/skoldhast-pages.mjs [--out dir]` checks a scene turn, the Kapitel 2 paper peel and the lighthouse glimpse;
  - sim tests for the pipe mouth, the plate pull and Knuffa from one spot.

## Menus: a hand-made research notebook (29 September)

- The title, the journal (Forskningsdagboken), pause, settings, the word-code and researcher cards, and the chapter reports are drawn as her notebook.
  - They are built in `src/ui.mjs` and `skoldhast.css`, with the words in `sv.mjs` (`MENU` holds the journal's tab names, the stamp and the map label).
  - New UI images (`ui-icons`, `ui-hatch`, `ui-grunge`, `ui-frame`, `ui-frame-sm`, `ui-tape`) are drawn in `scripts/skoldhast-art/ui.mjs`; its header lists them.
- **Font:** Patrick Hand, SIL OFL 1.1, a 24 KB latin subset in `skoldhast/fonts/` with `OFL.txt`. It is prefetched and counted in the budget.
- **Preview:** `skoldhast/dev/menus.html` shows every menu without WebGL. It takes options such as `?m=journal&page=2&hint=2`, `&big=1` and `&less=1`.
- **Contact sheets** of the menus are in `docs/skoldhast/shots/menus/`, at 390×844, 844×390, 667×375 and 1440×900.
- Every panel has an ✕, and a tap on the backdrop closes it (on a report it means continue). J and Esc close panels.
- Settings opened from the pause menu keep the game paused.
- **Known:**
  - the earlier 320 px tab-size issue is fixed by a scrollable row of 44 px targets;
  - only headless Chromium has been used, never a real phone.

## Fresh-eyes playtest (29 September) and what it changed

An agent played for about two hours with the keyboard at 844×390. Its report, with screenshots and repro scripts, was in the session's scratchpad. Fixed:

- **Pier trap in Kapitel 3:**
  - "Hoppa i" (or down on the stick) now hops off the pier into the bay. Surfaces marked `dropIn` in `world.mjs` allow it, and `dropIn()` in `sim.mjs` does it.
  - Skaka is not offered on the pier.
  - The P7 hints go plate → pipe → pier.
- **Stuck at walls:** `wallBetween` only counts a wall ahead, and swimmers stay clear of its line.
- **Sinking into gaps:**
  - hooves only find ground near the feet (`Terrain.groundNear`);
  - the rig clamps the body's ground offset;
  - on a dashed line the hooves stand on the line.
- **P3 run-up the wrong way:** a miss no longer spends the backsippa (it grows back in 0.9 s).
- **"Jag har fastnat"** goes to the nearest safe spot in the scene (`G.safeSpot()`).
- **Currents are visible:** a pale band with flowing streaks. Klo says so if you hide by the lyktfiskar outside the current.
- **Smaller fixes:**
  - the rope hint on Klippudden;
  - the Kapitel 3 mirror camera, and the glimpse camera;
  - side remarks are non-blocking bubbles;
  - goal wording, and counters only for the goal's own steps;
  - MAS works for MÅS;
  - J and Esc close panels;
  - Klo's hint keeps off the sköldhäst's head on short landscape screens.
- **Handed to the menus redesign:**
  - panels that can't be closed at 390 px height (✕ and a sticky close row);
  - Enter and focus in the word-code field;
  - map chips that look like buttons;
  - the bottom speech box covering the buttons, and toasts on the head.
- **Not changed:** the one-time journal tip can overlap the sköldhäst for a few seconds on a short landscape screen.

## How to check it

- `npm test`: the pure tests, including a robot that plays the whole game (about 3 s).
- `node tests/browser/skoldhast-launch.mjs`: the launcher (no requests before the click, the loader, Avbryt, close and reopen, the Mira race).
- `node tests/browser/skoldhast-finale.mjs --out <dir>`: the ending through the real UI, from word code 2 to the table at dusk.
- `node tests/browser/skoldhast-tour.mjs --out <dir> [--viewport 390x844] [--sheet]`: photographs every place; `--sheet` composes one contact sheet per viewport.
- `node tests/browser/skoldhast-save.mjs` and `node tests/browser/skoldhast-touch.mjs [390x844]`: saving and continuing, and touch play (stick, Hoppa, Göm dig, a tap for Gnägg). The touch check stamps its CDP touch events, so a slow software frame can't stretch a tap into a long press.
- `node tests/browser/skoldhast-guide.mjs`: the first minutes of a new game, with the goal note, tips, Klo's hints and a thought bubble.
- `node tests/browser/skoldhast-pages.mjs`: the turning pages (scene change, chapter paper, lighthouse glimpse).
- `skoldhast/dev/play.html?debug`: the game without the ticket page, with an fps overlay. `window.__skoldhast.debug` exposes `G`, `view`, `ui` and more.
- `skoldhast/dev/hero.html`: the hero's gaits and actions. `skoldhast/dev/audio.html`: every sound.
- `npm run build:skoldhast`: rebuilds all art (`--only hero,npcs,…` for one module) and checks the 3 MB first-playable budget.

## Decisions made while Pappa's answers are pending (plan §0)

| Question | Default in the code | Where to change it |
| --- | --- | --- |
| Q1 original drawing | No scan, so the hero is traced in code (route B) | `scripts/skoldhast-art/hero.mjs` |
| Q2 device, `#skoldhast` | `?skoldhast` or `#skoldhast` only *shows* the button; nothing opens by itself | loader at the end of `index.html` |
| Q3 surprise | Yes: the button is hidden | `index.html` |
| Q5 her words | (c) paraphrase only; every `HER_TEXT` field is `null`, so the fallback lines are used | `src/content/sv.mjs` `HER_TEXT` |
| Q6 family touches | Stars on; Mira cameo off; no clipping; no recorded voices | `sv.mjs` `FAMILY` |
| Q7 dedication | none (`FAMILY.dedication = null`) | `sv.mjs` |
| Q8 Mira's slot | off (`FAMILY.miraSlot = false`); "Ny forskare" is always there | `sv.mjs` |

## Frågor till Pappa (still open)

- Which phone/tablet and browser should receive the final listening, performance
  and touch-feel check?
- After reviewing this branch, should it be merged to main?

The current instruction is definitive: first name only, `HER_TEXT` stays null,
no photos/scans, and the ticket button stays hidden behind `?skoldhast` (the
existing `#skoldhast` alias only reveals the button). Earlier requests for scans
or permission to quote her printed words are superseded. No new public reveal
or additional chapter release is part of this branch.

## Known issues and next steps

### Deeper visual and mechanics polish (29 September)

- Audit and exact before views: `docs/skoldhast/polish-round3.md`. Text-to-speech
  is explicitly excluded from this round by the user.
- Signe now strolls at 70 world units/s, down from 250, with ground-following
  feet and distance-driven walk phase. She still waits before the finish so
  the player can pause or walk gently and win; her return is equally slow.
- Saved story phases reconstruct Kartväktaren, Signe and Klo. Reloading the
  lighthouse checkpoint no longer loses the keeper and blocks the last puzzle;
  saved conversations resume without replaying introductions. Six focused
  story/race regressions and the full-game robot pass.

### Continued implementation, small pushed steps (29 September)

- Baseline for this continuation: 66 passing tests; fresh before contact sheets
  at all three viewports. Continue on `codex/skoldhast-polish`, pushing each
  verified outcome before starting the next integration step.
- Asset cleanup now waits for background bundles before unloading them. Late
  atlas, image and data responses cannot repopulate a closed session. Three
  regression tests cover delayed loads, shared-cache reopen and failed requests.
- Drawing overlays now cancel their keyboard listener and pending completion
  when replaced or closed. Closing stops UI input before asset unloading, and
  cancels delayed orientation callbacks. `node tests/browser/skoldhast-lifecycle.mjs`
  checks drawing cancellation and ten reopen cycles with rendered atlas pixels.
- Fresh keyboard play caught repeated Enter presses postponing drawing
  confirmation indefinitely. Confirmation now schedules once; the lifecycle
  check holds repeated Enter through completion and asserts exactly one result.
- The table prologue also cancels its own waits and animation frames on close.
  `tests/browser/skoldhast-prologue-lifecycle.mjs` reproduces closing during the
  opening wait and Klo's first tween, then verifies a clean reopen at both phone sizes.
- Renderer fades, fold demonstrations and page turns stop on close as well;
  destroying a lighthouse glimpse cannot rebuild the abandoned scene.
  `tests/browser/skoldhast-view-lifecycle.mjs` covers each interruption.
- WebGL recovery grants two visible seconds after a backgrounded tab returns,
  and removes a stale restart prompt when restoration succeeds. The real
  `WEBGL_lose_context` browser check preserves mid-P1 progress, ink pixels and
  Sandpapperet hoofprints, then verifies that P1 still finishes.
- Collection foundations now allow colouring while swimming, keep hidden or
  fast-moving players out of contextual colouring, and share chapter/clue gates
  between pickup, props and rendering. The HUD counts the current region; the
  notebook lists visited regions. Counts use authored IDs, preserving existing
  collected/coloured pencils while ignoring stray save flags.
- All **15 pencils** now exist: **7** on land, **4** in Kelpskogen and **4** in
  Spegelviken. New shell/pebble drawings have matching grey/colour frames.
  Four pure route checks and four keyboard/touch browser variants verify every
  pickup, colouring and regional counter. The completed P8 current now switches
  off, so free exploration can ride the pipe back to the gallery and return by
  the stairs. Run `tests/browser/skoldhast-collection.mjs` (see its header).
  `npm run build:skoldhast -- --check` refreshes the prefetch list and enforces
  a strict **3,000,000-byte** first-playable limit without rebuilding art.
- The regional pencil badge sits clear of the goal note in portrait; the
  collection browser check asserts that the two never overlap.
- The finale now revisits the distant lighthouse view introduced in Kapitel 2:
  the real lamp and its reflection both glow in evening light, followed by a
  quiet 1.8-second hold. Klo stands beside the hero for his conclusion. Focused
  finale checks pass in landscape and reduced-motion portrait, preserving the
  player's scene, checkpoint, flags and camera across the glimpse.
- The ink meshes for P1/P8 now retain the whole line. They previously had only
  two points, truncating a completed stroke after about 30 world units. The
  focused ink browser check covers 20 drawing states, both directions, exact
  endpoints, curved joins and finite GPU vertices; no new asset is needed.
- The continuation's implementation is complete, with **76/76 pure tests**.
  The required browser matrix passes, including touch at both phone sizes,
  plus four fresh keyboard/touch journeys and normal/reduced-motion finales.
  The all-fifteen collection routes, lifecycle, notebook, context restoration
  and full-ink checks also pass with no game browser errors.
  Findings, focused commands and fresh before/after evidence are in
  `docs/skoldhast/implementation-round2.md`. Next: review the real-device feel
  and audio, then ask before merging. The clipping remains excluded by the
  privacy rules, and Flytbryggan remains stretch work.

- **Performance on a real phone is unmeasured.** Headless Chromium renders WebGL in software, so its frame rate is not a device benchmark. Measure with `?debug` on Alva's device and lower the resolution cap in `main.mjs` `sizes()` if needed.
- **Audio** has passed automatic checks (levels, seams, tuning) but needs a listen.
- **Not built** (optional in the plan):
  - O7 Flytbryggan (stretch);
  - the "Publicerad!" clipping;
- **Design changes the robot forced (worth knowing):**
  - Klo's hole moved east among the shells (106.2 HL), so the pool's reflection and Klo's "Ja" don't fire together.
  - The P2 plank inks only after the reflection has been seen.
  - The lyktfisk kelp bed moved beside the vault lane.
  - The P8 dashed segments start 4 HL out on the pier, which leaves room for a run-up.
  - The P8 sea lane starts where the pier leap lands and wins over the pipe current.
- **Art:** `skoldhast/dev/SPEC.md` is the contract between the engine and the art modules.
  - Frames with lettering (Klo's signs, `klo-map-corner`) must never be mirrored; `view.mjs` keeps them unmirrored.
  - Attachment points:
    - the pinwheel head sits 110 units above the stick;
    - the lighthouse is drawn at ×1.37 so that its gallery (1000 px above its base) meets the walkable gallery at −7.3 HL;
    - the shutters and the lamp sit at its lamp room (±78 and −1100 px, scaled).
  - `kelp-strip` is a vertical texture, so `view.mjs` bends it as a strip mesh, not a rope.
  - Signe wears a small race tag "1" (the characters agent's joke); it is a few lines in `npcs.mjs` to remove.
- **The hero's pose is local to the feet** while its hooves and hair live in world space. Always test it with real world coordinates; a test at x = 0 hid a bug that lifted it and sent its hair far away.
- **Headless Chromium renders WebGL in software**, so browser checks must wait for state rather than time it. A 60 ms tap can arrive as a long press at DPR 2 (`tests/browser/skoldhast-touch.mjs` runs at DPR 1 for that reason).
- **Contact sheets** for all 27 places at 844×390, 390×844 and 1440×900 are in `docs/skoldhast/shots/k3/` (refreshed after the polish round). The menus are in `docs/skoldhast/shots/menus/`.

### Deeper polish: lighthouse route and paper guardian

- P8 now uses reserved-paper dashes, directional arrows and distinct endpoint marks, readable over both planks and water. The route draws itself on arrival; completed segments remain quiet. The lamp and its reflection have a bounded, hatched beam.
- Kartväktaren has articulated paper limbs, blinks, breathing, hem movement, walking, talking gestures and smooth pose changes. His window glimpse correctly shows his head and hands. Map lettering is never mirrored; reduced motion removes idle movement.
- Signe's foot cycle follows actual travel distance, including her newly gentle race speed.
- Checks: five guardian pure tests; 18 guardian poses across both phone aspects; 22 focused scene captures plus two reveal states; the full ink-mesh regression. No game browser errors. Run `tests/browser/skoldhast-guardian.mjs` and `tests/browser/skoldhast-polish-scenes.mjs` (headers document options).

### Deeper polish: honest puzzle progress and recovery

- The goal note, notebook hint and world target share one semantic guidance selector. Context cards name the actual next action and distinguish approach, hiding, waiting, sinking/drifting and emergence. Control wording follows hold/toggle and follow-finger settings; progress comes from the puzzle state.
- P2 commits the stone independently of the plank, including old saves. P5 refreshes collision when the lanternfish light the passage. P8 arrives once, holds the shell still, saves the sea half and resumes the final drawing after reload. Emerging always releases the hold.
- Tests cover puzzle ordering, save/reload, deterministic P8 schedules and eleven guidance situations. The integrated pure suite currently passes117 tests, including drawing/map work in progress. Focused context shots cover eighteen states at both phone sizes.

### Deeper polish: drawing drafts and forgiving tracing

- Free drawings use a large paper pad with a preview, Rita om, Rita åt mig and Klar. Cancelled or tiny touches cannot silently commit a replacement drawing. Finished strokes map back into the original notebook margin and remain bounded to200 points.
- Guided strokes accept fast segments or intentional point taps, support the final line in either direction, own one pointer, cancel cleanly and keep their geometry correct after rotation. Keyboard help and focus containment remain available.
- Checks: seven geometry tests, the native pointer/cancel/rotation/focus browser suite at both phone sizes, ten close/reopen cycles, and fresh P1–P8 plus extra-activity journeys on touch at both phone sizes and keyboard landscape. Run `tests/browser/skoldhast-drawing.mjs` and `tests/browser/skoldhast-journey.mjs`.

### Deeper polish: atmosphere, paper transitions and mirror staging

- Water's foreground pencil veil is lighter; bounded highlights/rays and drifting flecks add depth without filters or new assets. Foreground kelp fades near the hero. A faint real ridge supports the distant steppe figure.
- Nearby action symbols and their progress use the exact same guidance object as the HUD. They distinguish a shell, emergence, travel and interaction without depending on colour.
- Reduced motion freezes decorative water, fronds, lanes, vortex motes and clouds. Paper-cover fades use elapsed time, the final page lifts before unfolding, and each world page turn has one sound.
- P7's mirror explanation uses a reversible lighthouse comparison throughout the dialogue, keeping the dark real lamp and lit reflection visible in either phone orientation. It restores the scene, hidden hero, camera and controls; the temporary layout observer is destroyed on close.
- Focused renderer check:30 recorded states across both phone sizes, zero errors. P7 uses a real hiding trigger; the mirror-vista browser test checks framing and restoration. Pages and renderer lifecycle checks pass.

### Deeper polish: inspectable map fragments

- The notebook's Ledtrådar page assembles three torn, textured pieces from existing discovery flags. Each can be inspected separately with its find location and explanation; the pieces share one illustrated coastline, route and layout. Missing pieces remain silhouettes.
- Tap the map or choose a piece, then zoom, pan with arrow buttons, reset or return to the whole map. The existing paper texture is reused. No new saves or art downloads are needed. Older clue aliases work too.
- The current-hint page links directly to the map. The existing seven-page notebook structure remains. At320px the piece choices stack, and footer arrows/count remain usable.
- Four pure collection tests and keyboard/touch browser checks pass at844×390,390×844 and320×568, including big text, zoom/pan limits, old saves and rebuilds; zero console errors. Preview `dev/menus.html?m=journal&page=4&map=all` (`map=none`, `corner`, `land` also work).
