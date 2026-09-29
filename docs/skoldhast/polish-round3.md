# Visual clarity and mechanics — deeper audit

Branch: `codex/skoldhast-polish`. Baseline: `9836144`, 29 September 2026.
The baseline suite passes **76/76**, including the full-game robot.
This is a continuation of the existing game, with the same privacy rules,
three released chapters, code-drawn art and strict 3,000,000-byte first load.

## Findings before implementation

| Priority | Reproduced or inspected problem | Planned outcome |
| --- | --- | --- |
| 1 | P2's hint says standing still is enough, although exposed stillness clamps ripple above the trigger threshold. P7 hides its required action behind a stone metaphor. | Explicit, contextual hide instructions before the action; truthful working/progress/finished feedback from puzzle state. |
| 1 | P8 guidance points at the pier end before its first segment is inked. The dark pier outline and water texture obscure its route; `lineAppears` only waits. | One current subgoal shared by note, journal and world cue; a paper/graphite route with direction and endpoint shapes, plus a real reveal. |
| 1 | P8's end-hold marks the lane held, but the hidden-shell branch keeps sinking and repeatedly emits arrival. | A stable, single-arrival drawing position with an intentional emergence escape. |
| 1 | Signe moves 250 world units/s, 78% of normal walking speed, reaching her wait near the finish in about 2.24s. Saved one-off arrival flags prevent her spawning after reload. | A visibly slow, friendly turtle crawl, grounded feet, no losing timer, and reliable race availability after load. |
| 1 | A correctly matched P2 stone is not committed until the plank is also done. | Each solved substep stays solved across scene changes and saves. |
| 1 | A normal save after the lighthouse checkpoint records the character's arrival but does not restore the character itself, blocking further conversation after reload. | Reconstruct persistent actor locations and poses from story phase, without replaying introductions. |
| 2 | A cancelled drawing touch accepts the drawing; a second pointer can steal input; fast pointer segments skip intermediate anchors. One portrait shore tap consumes three closely spaced anchors. | Owned/cancellable gestures, segment-based tracing and intentional one-point taps, with bounded drafts and clear progress. |
| 2 | Free drawings immediately commit on lift, have no preview/retry, and a tiny tap silently substitutes the example. Geometry goes stale on orientation change. | A generous drawing pad with preview, redo, explicit example and done controls; current geometry and a keyboard path. |
| 2 | Kartväktaren is nine static whole sprites. No breath/blink/gesture cycle; turns mirror instantly. The glimpse renderer ignores the authored peek pose. | Articulated folded-paper character preserving the existing pencil silhouette, proper pose transitions and an actual peek. |
| 2 | Map discoveries are text and two abstract half-mark boxes; the map itself is four region labels. No piece can be inspected. | Inspectable textured fragments and an assembled illustrated map inside the existing notebook, based on existing discoveries and saves. |
| 3 | The distant steppe horse floats against a pale ridge; foreground kelp masks the hero; water texture competes with important details. | Ground the distant herd, preserve hero silhouette, and strengthen depth/light/material separation in every region. |
| 3 | Final unfold starts from a static hold; page sound is duplicated; several decorative motions ignore reduced motion, and one fade is tied to frame count. | Coherent paper anticipation/reveal, one sound per turn, elapsed-time fades and consistent reduced-motion behavior. |

Before evidence: three fresh 27-place tours in the session's
`/tmp/skoldhast-round3-before/`, plus focused P8/character/puzzle captures and
notebook/drawing captures. Baseline sheets and key exact views are preserved in
[`shots/k3/round3/before/`](shots/k3/round3/before/).
Static daylight tours do not establish drawing interaction or finale correctness.

| Exact before view | Evidence |
| --- | --- |
| Pier route blending into the timber | [Landscape](shots/k3/round3/before/01-p8-pier-start-844x390.webp), [portrait](shots/k3/round3/before/01-p8-pier-start-390x844.webp) |
| Sea route under the water texture | [View](shots/k3/round3/before/04-p8-sea-lane-844x390.webp) |
| Guardian walking in mid-air instead of peeking | [View](shots/k3/round3/before/09-guardian-peek-844x390.webp) |
| Map fragments reduced to text and half-discs | [Notebook](shots/k3/round3/before/clues-390x844.webp) |
| Drawing with no draft controls or progress | [Drawing](shots/k3/round3/before/drawing-844x390.webp) |

## Research translated into implementation decisions

These are design applications, not claims of full accessibility conformance:

- [Xbox guideline 109: objectives](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109): make the current subtask reviewable and precise. Derive the goal, help and target from one state selector; do not show invented progress.
- [Xbox guideline 103: additional channels](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103) and [102: contrast](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102): separate puzzle cues with shape, text and luminance as well as colour. A brighter yellow alone will not fix a line on textured planks.
- [Xbox guideline 114: context](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/114) and [107: input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107): show the control when it matters and describe the actual toggle/hold setting.
- [W3C dragging alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html): map inspection and drawing help must work with taps and keyboard, without requiring a precise drag.
- [W3C pointer cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html): a cancelled gesture must not commit a drawing. Provide explicit draft controls and preserve already confirmed work.

## Work order and verification

1. Fix state/clarity defects and the turtle race; commit and push the verified outcome.
2. Improve route visibility and the paper guardian, then regional atmosphere and transitions.
3. Add the drawing interface and inspectable map; preserve the fixed notebook structure.
4. Re-run all puzzles/extras with keyboard and touch at both phone viewports, the required browser matrix, and the three tours. Check the strict download budget, clean console and close/reopen behavior.

No merge to main without approval. Device performance and subjective listening
still require the real device. Swedish speech was discussed as a possible separate
addition; the user's subsequent instruction explicitly excludes it from this round.

## Implemented outcomes

- **Puzzle clarity and recovery.** A shared state selector now supplies the
  notebook hint, current instruction and nearby world symbol. It distinguishes
  approaching, hiding, waiting, drifting, sinking and emerging, and reads the
  actual puzzle progress. Instructions match keyboard/touch and hold/toggle
  settings. P2 commits the matched stone separately; P5 opens collision at the
  same instant as its light; P8 holds the shell still, arrives once, saves its
  sea half and resumes the final drawing after reload.
- **Race and characters.** Signe now crawls at 70 world units/s instead of 250,
  72% slower. Her feet follow distance and ground height. Saved games reconstruct
  Klo, Signe and Kartväktaren from story phase. The guardian now blinks, breathes,
  walks, turns, gestures and peeks with separate pencil-drawn paper parts.
- **Lighthouse and scenery.** Reserved paper, graphite edges, arrows and endpoint
  shapes make P8 readable over both wood and water. The line visibly draws itself.
  Hatched light, clearer water, foreground kelp fading, a distant ridge and bounded
  rays/flecks improve regional depth. Reduced motion freezes decorative movement.
  The final page anticipates its unfold; fades use elapsed time and each page turn
  has one sound. P7 holds a clear tower/reflection comparison throughout its actual
  dialogue, with the picture fitted around the dialogue box.
- **Drawing.** A large paper pad offers draft preview, redo, explicit example and
  confirmation. One pointer owns a stroke; cancellation never commits it. Fast
  and reverse guided traces work, point taps remain intentional, rotation refreshes
  geometry, and saved art returns to the authored notebook margin. Keyboard
  alternatives and focus containment remain available.
- **Map fragments.** The existing three discoveries assemble one textured,
  illustrated map with shared torn edges and routes. Each piece has its own
  inspection view and find note. Tap, keyboard, zoom, pan buttons and reset work
  without a required drag. Existing saves need no migration or new fields. Short
  landscape places the map beside its controls; narrow portrait stacks choices.

## Critical visual review

The first new screenshots exposed issues that passing assertions alone missed:

1. The contextual card covered hooves at the bottom of landscape and the shell
   in portrait. It now sits above the controls or below the top note. The full
   tour then exposed left-facing camera overlap: a 45/55% hysteresis rule places
   the landscape card on the spare side, verified against rendered body bounds.
2. The first landscape map was too tall to inspect while using zoom/pan. A compact
   workspace keeps both visible; its sticky map stops before the discovery text.
   The320px pass also corrected the piece-label and footer-counter overflow.
3. A new distant ridge revealed its vertical fill edge in portrait. Its closing
   edges now end under the foreground. Lighthouse light that looked clear close
   up was still faint against the golden finale sky; reserved paper and graphite
   make the full-tower beam readable too.

These are regional rendering and interaction improvements. Existing backgrounds
remain code-drawn pencil art; this round does not replace every asset. All 27 tour
locations are reviewed at each of the three requested viewports. Real-device
performance and subjective movement/audio quality still need the intended phone.

## Verification and review points

The baseline passed 76 tests; the integrated implementation passes 117, including
its deterministic simulation and whole-game robot. New checks cover saved actors,
puzzle substeps, P8 recovery, guidance, guardian poses, drawing and map flags.

Required browser checks pass: launch, save, touch 844×390 and 390×844, guide, pages,
and normal/reduced-motion finales. Additional checks cover WebGL recovery,
close/reopen, native drawing cancellation/rotation, guardian poses, eighteen
context states, both camera directions, P7 comparison framing and restoration,
and map inspection with keyboard/touch at 844×390,390×844 and 320×568.

The final fresh-save journeys exercise P1–P8 and the extras with keyboard and
touch at both phone sizes, through real DOM input and the actual drawing UI.
These are accelerated regression playthroughs, not a human-device playtest.
An initial heavily loaded run exhausted its virtual deadline before a fold effect
received a browser animation frame. The harness now yields an actual RAF while
busy, preserving the same predicates and time bounds; it never skips an effect
or grants a puzzle flag. The final four routes use that corrected harness.

| Final fresh journey | Fixed simulation steps | Result |
| --- | ---: | --- |
| Touch 844×390 | 43,268 | P1–P8, ending and extras pass |
| Touch 390×844 | 43,268 | P1–P8, ending and extras pass |
| Keyboard 844×390 | 43,503 | P1–P8, ending and extras pass |
| Keyboard 390×844 | 43,503 | P1–P8, ending and extras pass |

All four runs completed the 148-note Spången route and recorded zero browser
errors. Source changes stayed frozen during the final matrix.


**Final first-playable download: 2,753,951 bytes**, below the strict 3,000,000-byte gate (246,049 bytes spare). No new audio assets or text-to-speech were added. The previous
offline audio measurements and exact listening sequence remain in
[audio-polish.md](audio-polish.md); this round removes duplicate world page cues.


## Saved before/after evidence

| View | Before | After |
| --- | --- | --- |
| All 27 places, 844×390 | [Sheet](shots/k3/round3/before/sheet-844x390.webp) | [Sheet](shots/k3/sheet-844x390.webp) |
| All 27 places, 390×844 | [Sheet](shots/k3/round3/before/sheet-390x844.webp) | [Sheet](shots/k3/sheet-390x844.webp) |
| All 27 places, 1440×900 | [Sheet](shots/k3/round3/before/sheet-1440x900.webp) | [Sheet](shots/k3/sheet-1440x900.webp) |
| Exact P8 pier start | [View](shots/k3/round3/before/01-p8-pier-start-844x390.webp) | [View](shots/k3/round3/after/01-p8-pier-start-844x390.webp) |
| Exact P8 sea lane | [View](shots/k3/round3/before/04-p8-sea-lane-844x390.webp) | [View](shots/k3/round3/after/04-p8-sea-lane-844x390.webp) |
| Guardian window glimpse | [View](shots/k3/round3/before/09-guardian-peek-844x390.webp) | [View](shots/k3/round3/after/09-guardian-peek-844x390.webp) |
| Exact kelp silhouette | [View](shots/k3/round3/before/11-kelp-silhouette-844x390.webp) | [View](shots/k3/round3/after/11-kelp-silhouette-844x390.webp) |
| Notebook map | [Notebook](shots/k3/round3/before/clues-390x844.webp) | [Map](shots/k3/round3/after/map-390x844.webp) |

Additional review views: [landscape map inspection](shots/k3/round3/after/map-inspect-844x390.webp), [320px big text](shots/k3/round3/after/map-big-text-320x568.webp), [real prologue drawing](shots/k3/round3/after/drawing-844x390.webp), [P7 comparison](shots/k3/round3/after/p7-mirror-390x844.webp), [lamp closeup](shots/k3/round3/after/13-lit-lamp-gallery-844x390.webp), [full finale light](shots/k3/round3/after/finale-light-844x390.webp), and [left-facing hero/card](shots/k3/round3/after/14-left-facing-land-844x390.webp).

Review in the game: hide at Spegelpölen and the P7 plate; follow the complete P8
route; pause during the final drawing and reload; inspect every map fragment;
redraw a prologue picture; turn around by Galoppbanan; and walk alongside Signe.
For audio, use the six precise steps in the linked audio checklist. Speech remains
excluded. Flytbryggan is still optional stretch work; the publication clipping
remains excluded by the existing privacy rules. Main is not merged.
