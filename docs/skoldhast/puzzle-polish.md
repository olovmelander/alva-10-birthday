# Puzzle and notebook review — 29 September 2026

## Findings and changes

The initial review read the real puzzle/story routes, then used fresh-save
browser journeys to check the optional activities after the ending as well.

| Finding | Change | Regression evidence |
| --- | --- | --- |
| A dry coat lost `Skaka`, making an unfinished shell tune hard to discover. | Unfinished nearby shells continue to offer `Skaka`; repeated presses cannot stack an active shake. | Pure shell-tune test and the fresh journeys. |
| Signe's `Prata` could occupy every useful shell position. | Shells get distance priority outside a small, reliable talking area beside Signe. | Pure priority test; the journeys race, then finish the shells. |
| Signe also stood beside the grey bucket, obscuring `Färglägg`. | An unfinished drawing wins a close tie when the horse stands directly beside it; `Prata` returns after colouring. | Pure bucket test; all five props are coloured in each journey. |
| A wet coat replaced `Hoppa` under an unfinished hoppställe. Stationary hops were also too low for the two beach rewards. | Keep `Hoppa` beneath these rewards. The movement pass raises the stationary hop and fixes running-hop motion. | Wet-coat test plus all three real hoppställe landings in the journeys. |
| Tiny speed changes could alternate context labels. | Valid actions retain a small speed/distance margin; an active shake retains its label. | Context-action tests and the full route. |
| Spången notes depended on render frequency and wall time. | Board crossings emit `plankNote` from fixed simulation steps, with a simulation-time rate limit. | Identical note sequences at 30/60/120/144 Hz; each journey crosses the musical planks. |
| Notebook page changes/settings lacked their own quiet feedback. | Page turns and menu selections call the synthesized audio handler, including keyboard page navigation. | Notebook browser test and audio integration. |
| The narrowest notebook tabs fell below 44 px. | Keep 44 px tabs and allow their strip to scroll on narrow phones. | Notebook browser checks at 844×390, 390×844 and 320×700. |
| Guidance/toast clearance could be stale after wrapping or font loading. | Observe the top guidance band's actual size. | Notebook/browser visual review. |
| The menu preview called the string `GOALS.p5` as a function. | Use the string directly. | All notebook checks run through the actual preview. |
| The portrait prologue's cloud guide began beyond the right edge; its unscaled strokes also produced an oversized world cloud. | Transform every cloud point from paper coordinates to screen coordinates, as for the gull. | Every native touch drawing point must lie inside its viewport. |
| Free-play guidance still asked for pencils after the counter reached 5/5. | Switch both the goal and hints to a complete-collection message; replace the old hint as the last pencil is collected. An unfinished Signe race still takes priority. | Focused 4/5, 5/5 and race-priority tests. |

All new player-facing text remains in `src/content/sv.mjs`.

## Reproducible checks

```sh
node --test tests/skoldhast-puzzles.test.mjs
node tests/browser/skoldhast-notebook.mjs
node tests/browser/skoldhast-journey.mjs --viewport 844x390 --input keyboard --out /tmp/journey
node tests/browser/skoldhast-journey.mjs --viewport 390x844 --input keyboard --out /tmp/journey
node tests/browser/skoldhast-journey.mjs --viewport 844x390 --input touch --out /tmp/journey
node tests/browser/skoldhast-journey.mjs --viewport 390x844 --input touch --out /tmp/journey
```

The journey starts at `Börja` with a clean browser context. It plays the real
prologue, P1–P8, reports, final drawing and epilogue. It then wins Signe's race,
rings the shell tune, lands on all three hoppställen, collects all five pencils
and colours all five props. Smaktestet and Spången occur along the main route.
No puzzle flag or travel coordinate is supplied to skip the route.

Travel uses accelerated 1/120 s simulation steps, driven through `input.mjs`
with DOM keyboard/PointerEvents. The touch prologue uses Chromium CDP touch
traces; the final drawing uses DOM touch pointers. Dialogues and reports are
automatically acknowledged through their real UI handlers. The normal paused
RAF input cleanup is disabled only inside this harness while it owns input.
Screenshots let notification timers settle; the displayed debug FPS does not
measure game performance during this accelerated run.

These are automated route and layout checks, **not** a human playtest or a
physical-phone performance measurement. Native capture/multitouch behaviour
also has the separate `skoldhast-touch.mjs` check. The finale/page checks cover
normal rendering cadence and UI flow independently.

## Final matrix

The final result JSON and contact sheets are saved beside the chapter-three
screenshots under `shots/k3/journey/`. Each successful result records all solved
flags, all five `color_` flags, all three `hopp_` flags, the number of Spången
notes and the real fixed-step count. A success requires no page or console
errors.

| Input | Viewport | Fixed steps | Spången notes | Result |
| --- | --- | ---: | ---: | --- |
| Touch | 844×390 | 41,300 | 148 | P1–P8 and all listed extras complete |
| Touch | 390×844 | 42,007 | 148 | P1–P8 and all listed extras complete |
| Keyboard | 844×390 | 41,498 | 148 | P1–P8 and all listed extras complete |
| Keyboard | 390×844 | 41,678 | 148 | P1–P8 and all listed extras complete |

The final panel of each contact sheet is explicitly a **completed-save review**:
it restores the successful route's collected flags to inspect the last wording
correction, which was made after the full journeys. It is not presented as a
second full playthrough. The other five panels come directly from the fresh
route. The completed-collection branch additionally has a focused pure test.

Reviewed sheets:

- [Touch landscape](shots/k3/journey/journey-touch-844x390.webp)
- [Touch portrait](shots/k3/journey/journey-touch-390x844.webp)
- [Keyboard landscape](shots/k3/journey/journey-keyboard-844x390.webp)
- [Keyboard portrait](shots/k3/journey/journey-keyboard-390x844.webp)
