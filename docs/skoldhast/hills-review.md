# Galoppbacken and Vågmärkesbranten review

29 September 2026. Baseline: frozen `main` checkout. Captures use real world coordinates and the actual `stepPlayer`, `snapshot` and renderer. They cover the plateau, Galoppbacken and all three grown ramps, x 13.5–52 HL (with the extra eastward ground providing a full-speed run-up).

## Issues recorded before changes

| Area | Observation | Evidence |
| --- | --- | --- |
| Ramp foot placement | Westward walking and galloping at x 47 place some hooves visibly inside the sloping fill even though the simulation's body root is exactly on the ramp. | [Walk west, x 47](shots/k3/hills/before/walk-west-x47-844x390.webp), [gallop west, x 47](shots/k3/hills/before/gallop-west-x47-844x390.webp) |
| Ground material continuity | Grown ramps use grass texture all the way down, while the adjoining plateau has an earth face and thin grass cap. The vertical texture seam is especially clear at x 38.5 and x 46. | [Walk east, x 38.5](shots/k3/hills/before/walk-east-x38_5-844x390.webp), [walk west, x 46](shots/k3/hills/before/walk-west-x46-844x390.webp) |
| Ramp growth | The first frame after the growth flag shows the complete ramp; there is no growth transition. A hero remaining on the old lower shelf can be covered by the new fill. The growth capture begins on the old lower shelf and advances ordinary physics to expose that transition. | [Ungrown](shots/k3/hills/before/ramp1-ungrown-844x390.webp), [first growth frame](shots/k3/hills/before/ramp1-growth-first-frame-844x390.webp) |
| Ground outline | The baseline draws fixed-length vertical strokes at every solid surface endpoint, irrespective of whether that endpoint is exposed or the neighbouring ground continues there. These become unnecessary seams when ramps join the terraces. | [Walk east, x 38.5](shots/k3/hills/before/walk-east-x38_5-844x390.webp) |
| Slope physics | The complete grown route is traversable without leaving the ground at both speeds in both directions. Baseline gallop falls to 1080 world units/s on slopes; walking fluctuates between about 319 and 354. No body-root penetration was measured. | [Machine-readable baseline](shots/k3/hills/before/hills-report-844x390.json) |

The baseline review did **not** reproduce a missing polygon or an open hole in the main plateau fill. The reproduced failures are hoof placement, material/outline joins and instant ramp appearance. The uphill and downhill route checks distinguish a rendering problem from a collision problem.

## Reproduction

```sh
node tests/browser/skoldhast-hills.mjs --out /tmp/hills-after --viewport 844x390
node tests/browser/skoldhast-hills.mjs --root /path/to/frozen-baseline --baseline --out /tmp/hills-before --viewport 844x390
```

The harness loads the real game through the chapter-three word code, waits for the arrival state to finish and for the land art to load, then pauses the ordinary frame loop. It advances movement at 120 Hz and animation at 60 Hz, rendering a screenshot only at a named state. Each capture records its player position, supporting surface and exact camera. UI overlays are hidden to expose the terrain. The body root is not teleported between capture points: it reaches each point using the ordinary walk or gallop input.

Routes: walking west, walking east, galloping west, galloping east. Captures: x 28, 34, 36, 38.5, 46 and 47 HL. The route also crosses x 14 and 48.5. The westbound approach begins at x 52 so full gallop is established before the first ramp. Separate fixed-camera captures expose ramp1 before, in the first growth frame, half a second later and after settling. The automated gate rejects console exceptions, non-finite movement, loss of ground contact on the completed route and any body-root/support mismatch.

[Before contact sheet](shots/k3/hills/before/hills-sheet-844x390.webp)

## After changes

The identical camera coordinates and routes were rerun after the terrain contour and movement changes. All 28 captures were inspected. No open ground gaps, extra vertical seams or buried planted hooves remain in these captures. The grown ramps now have the same thin grass cap and earth face as the adjoining hill. The actual exposed contour follows collision, including the full terrace faces before growth. Plateau and hill joints stayed grounded at walk and full gallop, in both directions.

[Before/after comparison](shots/k3/hills/hills-before-after-844x390.webp) · [After contact sheet](shots/k3/hills/after/hills-sheet-844x390.webp) · [After measurements](shots/k3/hills/after/hills-report-844x390.json)

| Route | Largest speed change per 120 Hz step, before | After | Airborne steps | Largest body-root/support error |
| --- | ---: | ---: | ---: | ---: |
| Walk west | 16.67 wu/s | 3.50 wu/s | 0 | 0 wu |
| Walk east | 16.67 wu/s | 3.05 wu/s | 0 | 0 wu |
| Gallop west | 16.67 wu/s | 11.53 wu/s | 0 | 0 wu |
| Gallop east | 16.67 wu/s | 10.34 wu/s | 0 | 0 wu |

The speed-change measurement begins after the first 1.5 seconds, excluding initial acceleration. It describes these specific routes, not frame rate or a general performance improvement. The browser run reported no page exceptions or console errors.

Ramp growth now unfolds over 0.65 seconds using the same moving polyline for drawing and collision. The hero rides that surface while its hooves replant. At x 47 the first frame raises the body root by only **0.059 wu**; the largest later step is **2.31 wu**. The first frame, half-second and settled captures all have zero support error. The final surface is reached without the earlier appearance jump or a player left inside the ground. The test enforces a 4 wu per-step limit at this spot, so a full-height pop cannot silently return.

| Growth moment | Lift from the old shelf | Body-root/support error |
| --- | ---: | ---: |
| First 1/120 s frame | 0.059 wu | 0 wu |
| Half a second later | 105.38 wu | 0 wu |
| Fully grown | 120 wu | 0 wu |

These are reproducible software-WebGL checks at 844×390. They do not establish real-phone frame rate. The separate full-place tour covers portrait and desktop framing.
