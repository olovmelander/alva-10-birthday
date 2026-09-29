# Continued implementation — 29 September 2026

Branch: `codex/skoldhast-polish`. Starting point: `c93bbf6`.

This round follows the existing design, with small commits pushed as each
outcome is checked. The starting pure suite passed 66 tests. Fresh baseline
tours captured all 27 places at 844×390, 390×844 and 1440×900 before visual edits.

## Findings and order

| Priority | Finding | Outcome |
| --- | --- | --- |
| 1 | A background atlas could finish after close and remain in Pixi's shared cache. | Wait for pending bundles, then unload every successful request. |
| 2 | Abandoned drawings, prologue waits and renderer effects retained keyboard handlers or animation callbacks. | Cancel session-owned input, timers and animation frames; verify interruption and reopen. |
| 3 | Colouring was restricted to land; counts were global and included unknown save IDs. | Enable safe underwater colouring, shared visibility gates and regional progress from authored IDs. |
| 4 | Only the five chapter-one pencils existed. | Add two on Klippudden, four in Kelpskogen and four in Spegelviken, using the existing collection rules. |
| 5 | The final camera held over empty sea instead of showing the lit lighthouse. | Revisit the chapter-two lighthouse composition with both lamps visible in evening light, then return to Klo. |
| 6 | Collection testing found the completed P8 current could capture a returning pipe rider. | Stop that current after P8 completes, keeping the gallery reachable in free play. |
| 7 | A hidden tab could consume the WebGL recovery deadline and leave a stale restart prompt. | Allow two visible seconds after return, clear held input, and remove the prompt after a successful restore. |
| 8 | P1 and P8 allocated only two ink points, truncating the stroke after about 30 world units. | Allocate the complete polyline and clip it to the exact travelling tip in either direction. |
| 9 | The portrait goal note covered part of the regional pencil counter. | Move the counter under the notebook button and assert non-overlapping bounds. |
| 10 | The fresh keyboard journey caught repeated Enter postponing the new drawing confirmation timer. | Schedule confirmation once; test repeated Enter through completion and rerun all four fresh journeys. |

The new shell and pebble drawings have grey and coloured pencil versions. They
use the existing art pipeline; no downloaded imagery or audio is involved.
The five existing pencil IDs are unchanged. Old saves keep their discoveries
and colours, and the new discoveries remain available.

## Focused checks

- `npm test` includes delayed asset loading, collection gates, underwater
  colouring, save compatibility, fifteen collection routes, escape from a kelp
  bed and the post-ending pipe/gallery/stairs journey.
- `node tests/browser/skoldhast-lifecycle.mjs [390x844]`: replaced drawings,
  cancelled drawing confirmation, repeated Enter, ten close/reopen cycles rendering Klo's atlas,
  and leaving the real prologue at its first drawing.
- `node tests/browser/skoldhast-prologue-lifecycle.mjs [390x844]`: close during
  the opening wait and Klo's tween; no callbacks enter a closed session.
- `node tests/browser/skoldhast-view-lifecycle.mjs`: close during a fade, fold
  demonstration and lighthouse page turn, then reopen.
- `node tests/browser/skoldhast-notebook.mjs`: regional counts and menu input
  at 844×390, 390×844 and 320×700.
- `node tests/browser/skoldhast-collection.mjs --viewport 390x844 --input touch`:
  all fifteen pickups and colours, regional counts, portrait badge bounds and
  save round-trip. Also checked with keyboard and at 844×390 in both modes.
- `node tests/browser/skoldhast-context.mjs`: real WebGL loss/restore preserves
  mid-P1 ink and hoofprint pixels; background time does not consume the visible
  recovery window, and a late restore clears the restart prompt.
- `node tests/browser/skoldhast-ink.mjs`: twenty P1/P8 states, exact endpoints,
  full curved lines, shrinking progress and finite GPU vertices.
- `node tests/browser/skoldhast-finale.mjs --viewport 390x844 --less-motion`:
  the lighthouse and its reflection fit; the glimpse preserves game progress
  and returns to Klo. Also checked at 844×390 with normal page turns.

## Visual comparison

The original first-round evidence remains in `shots/k3/before/`. This continuation
has its own baseline. Each sheet contains the title and all 27 places:

| Viewport | Before this continuation | Current |
| --- | --- | --- |
| 844×390 | [Before](shots/k3/round2/before/sheet-844x390.webp) | [After](shots/k3/sheet-844x390.webp) |
| 390×844 | [Before](shots/k3/round2/before/sheet-390x844.webp) | [After](shots/k3/sheet-390x844.webp) |
| 1440×900 | [Before](shots/k3/round2/before/sheet-1440x900.webp) | [After](shots/k3/sheet-1440x900.webp) |

- **Beach, steppe and hills:** no new terrain seams, gaps or hoof-contact
  discrepancies in the static comparisons. The previous movement and hill
  checks remain documented in [hills-review.md](hills-review.md).
- **Klippudden:** the two new pencils and their flowers/kite fit the plateau
  surface and existing coloured-pencil style.
- **Kelpskogen:** the added bucket, shell, boat and pebbles remain readable
  through the water. Light shafts, depth and seabed outlines remain intact.
  Foreground kelp still sometimes crosses the hero, as in the baseline.
- **Spegelviken:** the shore boat and pier windmill fit the existing scene;
  the shore action now offers colouring after its pencil is found. Pier,
  seabed and gallery geometry are unchanged.
- **Layout:** the regional counter changes from `/7` on land to `/4` in each
  water region and stays clear of the portrait goal. Guide text and fading
  hints vary with time: these tours begin from the Kapitel 3 word code and
  revisit earlier regions, rather than representing fresh-player guidance.
- **Evidence quality:** the tour now waits for decoded title atlas art before
  photographing it, waits for its opacity transitions, and fails on browser
  errors. The phone title tiles were refreshed after adding that final wait;
  their complete world captures were retained. The desktop sheet is reduced
  to 1176 pixels wide for review; runtime assets are unchanged by that export.
- **Remaining visual judgement:** the distant Galoppbanan horse can look
  suspended against the very pale ridge, especially in portrait. This was
  present before this continuation; it is not a gameplay collision defect.

Focused evidence complements the daylight tour:

- [P1/P8 ink before and after](shots/k3/round2/ink-before-after.webp), captured
  at identical positions and progress. The black P1 stroke now follows the
  entire arch. The straight P8 stroke is subtle against the plank outline;
  [before](shots/k3/round2/ink-before.json) and
  [after](shots/k3/round2/ink-after.json) record its exact geometry.
- Underwater colouring [before](shots/k3/round2/underwater-grey.webp) and
  [after](shots/k3/round2/underwater-coloured.webp), plus the
  [completed regional notebook](shots/k3/round2/regional-notebook.webp).
- The lit lighthouse and its reflection in
  [landscape](shots/k3/round2/lighthouse-844x390.webp) and
  [portrait](shots/k3/round2/lighthouse-390x844.webp), followed by
  [Klo's conclusion](shots/k3/round2/conclusion-844x390.webp).

## Acceptance

Final runtime snapshot: `d59f998e486d` (before the documentation and tour-harness
commits). `npm test`: **76/76**, including the whole-game robot and deterministic
frame-rate checks. The first-playable download is **2,723,140 bytes (2.723 MB)**;
the build now enforces the exact **3,000,000-byte** limit with `--check`.

The required launch, save, touch at both phone sizes, guide and pages checks
passed. All four fresh keyboard/touch journeys also passed: 43,672–44,397 fixed
steps each, covering P1–P8, the ending and implemented extras, with 148 Spången
notes per route and no browser errors. Their JSON records are in `shots/k3/round2/`.
Both focused finales passed: normal page turns at 844×390 and reduced motion
at 390×844. They verify both lit lamps in frame, the quiet hold, return to Klo,
unchanged checkpoint/flags and completion back on the beach. Session cleanup,
real WebGL recovery, notebook and all fifteen collection checks also pass.
All 27-place tours pass at the three requested viewports with no browser errors.
The compact acceptance record is [implementation-round2-qa.json](implementation-round2-qa.json).
No audio code changed in this continuation; the previous offline measurements
and exact six-step listening checklist remain in [audio-polish.md](audio-polish.md).

Device performance, subjective movement feel and listening on the family's
speakers/headphones still require the real device. The audio listening guide is
[audio-polish.md](audio-polish.md). Flytbryggan remains stretch work; the clipping
remains excluded by the privacy rules. Main requires the user's approval to merge.
