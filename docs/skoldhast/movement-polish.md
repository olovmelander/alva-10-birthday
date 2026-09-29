# Movement and swimming review — 29 September 2026

## Findings and changes

- **Running hops were stuck at takeoff.** `Terrain.floorAt()` searched with an impossible upper bound, returned `null`, and the jump's gap guard stopped horizontal movement. The floor query now searches downward from the supplied height. Ordinary running hops travel, and authored edge/balk restrictions still apply.
- **Stationary hops missed the optional perches.** The old 55 wu buck could not reach the 80–95 wu driftwood and rock tops. A 105 wu buck now reaches all three real reward perches, without increasing running-hop height.
- **Slopes and landings:** the slope speed adjustment fades continuously; a cancelled skid respects the final input; automatic hurdles target the actual landing surface and respect puzzle boundaries. Ground-angle signs now follow the documented convention.
- **Uphill hooves were querying a floor beneath the ramp.** A projected fore hoof can be more than 52 wu above the body contact point. The old nearest-ground query then selected buried ground. Hoof queries now follow the reachable surface from the body to the foot, and swing arcs stay clear of convex uphill joints. The trace allocates no temporary support objects.
- **New ramps:** earned ramps rise from the existing shelf over 0.65 seconds, using a smooth curve advanced only by the fixed simulation. Collision and drawing read the same transient surface points. Terrain revisions invalidate planted-foot caches as it rises. At the three midpoint checks, each 1/120 s lift stays below 3 wu. Saved flags load the complete authored ramp immediately; transient growth clocks are deliberately not saved. A defensive safe lift/replant also handles a newly enabled complete ramp outside the normal puzzle growth path.
- **Swimming:** normalized propulsion preserves diagonal control; the surface buoyancy spring fades gradually to neutral buoyancy at depth; releasing movement leaves a glide. Sink, kelp anchoring and current drift still use the existing hide/come-out rules.
- **Swim animation:** an integrated phase replaces absolute time multiplied by changing speed. Alternating fore/hind legs have a backward power stroke and tucked forward recovery, with surface head lift, a dive tilt, soft bobbing and a floating trailing tail. The game supplies the same fixed-step phase to the animation and paddle effects.
- **Sound synchronization:** hoof events use the rig's gait cycle lengths and touchdown offsets, with a foot index for contact variation. Paddle events mark the two front-leg strokes and carry explicit water/hoof world coordinates.
- **Shadows:** contact-shadow height uses local coordinates throughout, so a horse on the high plateau retains the same shadow as an identical pose near sea level.

## Evidence

`tests/skoldhast-movement-polish.test.mjs` covers 14 targeted cases: forward hops and protected edges; real stationary reward perches; skid cancellation; sloped hurdle landings; walking/galloping the full hill route in both directions; surface/deep buoyancy and glide; escape from sink/kelp/current; exact simulation replay at 30/60/120/144 Hz; translation-invariant swim/hair at real world coordinates; paddle-phase continuity; elevation-invariant shadows; rendered hoof clearance at x47 HL; safe support/cache changes when a complete ramp appears; and smooth, frame-rate-independent growth of all three ramps with exact final geometry and completed-save semantics.

The complete `npm test` suite passed after the first integration (55 tests at that point), including the three-chapter robot. The focused suite also passed after removing temporary allocations from hoof tracing. The subsequent shared growth-clock change is covered by an additional deterministic test for all three ramps.

[Swim visual review](shots/k3/swim-sheet.webp) shows surface swimming at two phases, diving, and deep swimming. These are controlled poses in the real game renderer at x4356–4445 wu and y130/380/1000 wu. Head position, alternating feet, dive angle and attached floating hair were checked visually; no page errors occurred. The image is a pose comparison, not a performance benchmark.

The hill browser harness and its before/after frames are recorded separately in the terrain review. Real phone frame rate and the subjective feel of running/swimming still need the family-device check.

## Recheck

```sh
node --test tests/skoldhast-movement-polish.test.mjs
npm test
node tests/browser/skoldhast-hills.mjs --out /tmp/skoldhast-hills --viewport 844x390
node tests/browser/skoldhast-touch.mjs 844x390
node tests/browser/skoldhast-touch.mjs 390x844
```

In `skoldhast/dev/hero.html`, select **swim**, then toggle **facing left**. In the game, look at the surface head position, the folded recovery stroke, the tail while accelerating/turning, and a downward dive. Run west up ramp1 at x47 HL, turn on the plateau, and try a stationary Hoppa onto the driftwood at x94.55 and x98.48 HL.
