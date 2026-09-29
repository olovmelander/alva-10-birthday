# Sköldhästen och havet mellan sidorna – rules for working sessions

The game is designed in `docs/skoldhast-game-plan.md` (the plan). `HANDOVER.md` in this folder says
what is done, what is next and what Pappa still has to answer. Read both first.

## Start of a session

1. Read `skoldhast/HANDOVER.md`.
2. Run `npm test` (node:test). It includes a robot that plays the whole game through the real
   simulation, puzzles and story; if it fails, fix that first.
3. Open `skoldhast/dev/play.html?debug` (served over http, e.g. `npx http-server -c-1`) and check that
   the game still starts and plays. ES modules do not load from `file://`.

## One PR, one visible outcome

Do not start the next chapter's content in the same PR. Keep `RELEASED_CHAPTER`
(`src/content/world.mjs`) at the last released chapter; raising it *is* the release.

## End of a session

- The game still plays from the ticket page (`index.html?skoldhast`) and from `dev/play.html`.
- `npm test` passes. If you changed the world, the robot in `tests/skoldhast-playthrough.test.mjs`
  still finishes (adjust its route only when the design changed on purpose).
- Update `HANDOVER.md`: done, next, decisions, known bugs, "Frågor till Pappa".
- Contact sheets (WebP at 390×844, 844×390 and 1440×900) go under `docs/skoldhast/shots/<chapter>/`.
  `scripts/skoldhast-shot.mjs` takes screenshots in headless Chromium (usage in its header comment).

## Where things live

| What | Where |
| --- | --- |
| All player-facing Swedish text | `src/content/sv.mjs` |
| The world: surfaces, water, currents, puzzle objects, spots, checkpoints | `src/content/world.mjs` (in horse lengths, 1 HL = 200 world units, y down) |
| Movement (pure, fixed 1/120 s step) | `src/sim.mjs` |
| Puzzles P1–P8 (pure) | `src/puzzles.mjs` |
| Story beats, hints, objectives | `src/story.mjs` |
| Game state, events, save/restore | `src/game.mjs`, `src/save.mjs` |
| Rendering (PixiJS 8, WebGL) | `src/view.mjs`, `src/hero.mjs`, `src/rig.mjs` |
| DOM UI, input, the table prologue/epilogue | `src/ui.mjs`, `src/input.mjs`, `src/prologue.mjs` |
| Entry point, loop, host glue | `src/main.mjs` |
| Synthesized audio | `src/audio.mjs` |
| All art | drawn in code in `scripts/skoldhast-art/`, built by `npm run build:skoldhast` |

`scripts/build-skoldhast-assets.mjs` packs the atlases into `assets/`, writes `assets/manifest.json`
and `files.json` (what the loader in `index.html` prefetches) and fails if the first-playable
download grows over 3 MB. `skoldhast/dev/SPEC.md` is the contract between the engine and the art.

## Rules that protect Alva

- The fourth button stays hidden behind `?skoldhast` until Pappa reveals the game.
- Her printed words appear only as Pappa allows (plan §0 Q5); until then `HER_TEXT` stays null and
  the paraphrased fallback lines are used. Never put the magazine page or the photo of it in the repo.
- First name only. Never her surname, school, town, the magazine, or anything Pappa scribbled over.
- Everything in the repository and on the site is public.

## Releases

Merge at least 15 minutes before Alva plays: GitHub Pages caches every file for 10 minutes and
module imports carry no version, so a device can briefly mix old and new modules.
