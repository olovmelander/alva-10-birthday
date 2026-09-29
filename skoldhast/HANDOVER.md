# Sköldhästen – handover

Last updated: 29 September 2026. The branch is `ccr-c498dbd6-rfd39d`. The design is in `docs/skoldhast-game-plan.md` (v2); the working rules are in `skoldhast/CLAUDE.md`.

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
| Audio (`audio.mjs`) | Done. The theme "Sköldhästens visa" in D dorian in five arrangements, eight stingers, 28 effects, and adaptive layers for speed, underwater and hiding. It still needs a human listen (`dev/audio.html`). |
| Ticket integration (`index.html`) | Done. A hidden fourth button, a loading overlay that prefetches `files.json`, Avbryt and retry, and Mira's launch-race guard. |

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
- **New checks:**
  - `node tests/browser/skoldhast-guide.mjs [--out dir]` plays a new game into Kapitel 1 and checks every guidance step;
  - sim tests for the pipe mouth, the plate pull and Knuffa from one spot.

## How to check it

- `npm test`: the pure tests, including a robot that plays the whole game (about 3 s).
- `node tests/browser/skoldhast-launch.mjs`: the launcher (no requests before the click, the loader, Avbryt, close and reopen, the Mira race).
- `node tests/browser/skoldhast-finale.mjs --out <dir>`: the ending through the real UI, from word code 2 to the table at dusk.
- `node tests/browser/skoldhast-tour.mjs --out <dir> [--viewport 390x844] [--sheet]`: photographs every place; `--sheet` composes one contact sheet per viewport.
- `node tests/browser/skoldhast-save.mjs` and `node tests/browser/skoldhast-touch.mjs [390x844]`: saving and continuing, and touch play (stick, Hoppa, Göm dig, a tap for Gnägg). The touch check stamps its CDP touch events, so a slow software frame can't stretch a tap into a long press.
- `node tests/browser/skoldhast-guide.mjs`: the first minutes of a new game, with the goal note, tips, Klo's hints and a thought bubble.
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

1. **Original drawing:** is there a flat scan or a straight photo of the paper drawing? With one, the hero can be cut from her real strokes (route A).
2. **Device:** which phone or tablet, which browser, upright or sideways? May `#skoldhast` open the game directly?
3. **Surprise and dates:** keep it hidden until Kapitel 1 is revealed? Which dates?
4. **Her words (Q5):** (a) verbatim, (b) only her question and "Sköldhästar är fantastiska", or (c) paraphrase only.
   - Hyphen or not in "kelp-skogarna"?
   - Commit `d843277` on this branch quoted her full text. If the answer isn't (a), squash the branch before merging, or ask Claude to rewrite its history.
5. **Reference crop:** may a creature-only crop of her drawing be committed? It would have no name, no magazine, EXIF stripped and your scribble removed.
6. **Family touches:** Mira's two lines in the epilogue? The three star-tiger stars (currently on)? A "Publicerad!" clipping? Recorded voices (your neigh, Mira as Klo)?
7. **Dedication:** would you like to write one?
8. **Mira:** her own save slot with the easier help? Can she keep the secret?

## Known issues and next steps

- **Performance on a real phone is unmeasured.** Headless Chromium renders WebGL in software (15–50 fps there), and the JS side takes 1–3 ms per frame. Measure with `?debug` on Alva's device and lower the resolution cap in `main.mjs` `sizes()` if needed.
- **Audio** has passed automatic checks (levels, seams, tuning) but needs a listen.
- **Not built** (optional in the plan):
  - O7 Flytbryggan (stretch);
  - the Kapitel 2–3 färgpennor (5 of about 15 exist, all in Kapitel 1);
  - the "Publicerad!" clipping;
  - the lit lighthouse seen from Klippudden in the final (the camera just holds on the sea).
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
- **Contact sheets** for all 27 places at 844×390, 390×844 and 1440×900 are in `docs/skoldhast/shots/k3/`.
