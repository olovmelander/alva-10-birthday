# Scenery polish — 29 September 2026

## Before review

Reviewed the 27 tour places at 844 × 390, 390 × 844 and 1440 × 900.
The fresh baseline is captured under `/tmp/skoldhast-before/<viewport>/`;
the previous committed tour confirms the same visual issues at all three sizes.

| Places | Observed issue | Planned correction |
| --- | --- | --- |
| 01–06, beach and dunes | Wet sand and earth repeat strong horizontal bands. They compete with the hero's pencil detail. | Lighter, less densely pressed material strokes; retain ochre and paper tooth. |
| 07–13, steppe and hills | Foreground ground hides most of the backdrop's hill crests. In landscape the background reads almost entirely as blue sky. | Lift the steppe backdrop slightly; retain the silver-green colour script. |
| 14, jetty; 22–27, bay | A single dark-blue line separates flat, repeating foreground water. Reflections have little surface light to make them feel like water. | Sparse, softly moving broken pencil highlights, with static highlights on the frozen sea. |
| 15–21, kelp forest | Shafts almost disappear behind the foreground water veil, and foreground fronds have little distant forest behind them. | Stronger hatched shafts, faint distant teal kelp silhouettes and suspended pencil specks. |
| Evening revisits | Beach highlights are scattered uniformly. Spegelviken has no evening backdrop mapping. | A broken, widening reflection path and a dedicated evening bay in the lazy bay bundle. |

The existing clouds, gulls, frozen splash, cream lighthouse and coloured-pencil
hero remain the visual reference. Clouds stay paper-white with outlines. No
glowing puzzle cues are added to scenery, and the frozen beach never animates
before time resumes. No filters or downloaded assets are used.

## Implementation

- Wet sand, earth and grass use gentler pencil pressure. Surface colours and
  silhouettes stay the same; earth strata no longer compete as strongly with
  the walkable graphite edge.
- `backdrops.mjs` adds faint distant kelp, brighter slanting pencil shafts and
  suspended specks. Evening beach and bay have broken reflection paths; the bay
  has its own warm evening sheet. The new far sheet is 1024 × 512, adding 2 MiB
  of uncompressed texture rather than 8 MiB, and belongs to the lazy bay bundle.
- `scenery.mjs` adds short, broken light strokes just under visible waterlines.
  At most 54 tiny marks per water body are allocated once. Only transforms and
  alpha change during play; marks are hidden when the waterline is offscreen.
  Mirror pools keep restrained highlights so their puzzle answers remain clear.
  Frozen sea and reduced-motion highlights stay still.
- The renderer lifts the steppe background slightly so its hills appear above
  the foreground, and selects the bay's new evening asset. A solved vault now
  starts without its darkness rectangle when revisiting the scene.
- Individual backdrop renders reset their deterministic stroke counter, so
  rendering one image produces the same strokes as rebuilding the whole module.

## Visual review

Targeted runtime screenshots of the steppe, kelp bed, daytime bay, evening bay
and evening beach were captured at all three viewports without page errors.
The raised distant ridges are particularly helpful in landscape; portrait
still leaves the hero's silhouette clear. Kelp light remains behind the hero
and foreground fronds. Evening bay has a warm horizon while retaining its
cool reflective water. Ground changes are deliberately subtle.

The all-place final sheets are `shots/k3/sheet-844x390.webp`,
`shots/k3/sheet-390x844.webp` and `shots/k3/sheet-1440x900.webp`.
The evening supplement is `shots/k3/scenery-evening.webp`: fixed debug states of
beach and bay at each viewport, paused so an arrival scene cannot move the camera
while the art is captured. Final art checks should
include the frozen beach, the still pool's
answer, the now-visible steppe ridges, kelp shafts and the bay after the finale.

`npm run build:skoldhast -- --only materials,backdrops` passed with the first
playable at 2.57 MB during this pass. The final combined budget is recorded in
the handover. Actual GPU memory use and frame rate still require a real phone;
these browser captures use software WebGL.
