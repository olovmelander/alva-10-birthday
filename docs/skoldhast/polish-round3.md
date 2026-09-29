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
