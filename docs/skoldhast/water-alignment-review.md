# Cave and water alignment — 29 September 2026

The cave's physical surface was at y=180 world units while the adjoining sea and
the drawn air boundary were at y=0. This made a second apparent horizon above
the cave's water. A sköldhäst swimming back across x=7 HL could jump vertically
by 180 units in one 1/120-second simulation step. Separately, the land entrance
had a waterline painted into its cliff texture 70 units above the actual pool.

The connected cave and sea now share y=0. The entry spawn moved up by the same
180 units to preserve its previous immersion. Buoyancy, swimming and the rig
still use the existing deterministic simulation. The air band and atmosphere
take their level from the authored water. Pencil surface ropes include their
exact endpoints, and the cliff's painted water now meets the exterior pool.
Small pencil wave motion remains around the physical mean level.

The real entrance capture also exposed a camera issue on landscape phones: the
underwater camera targeted a point below the feet, leaving the head behind the
goal note or outside the screen near the surface. It now frames the torso, with
the existing smooth follow preserved. The browser check measures the actual head
sprite and goal-note bounds as well as the waterline and entrance/exit states.

## Paired views

These before views were captured from an isolated copy before the water fixes.
They include the earlier story and cloud work.

| View | Before | After |
| --- | --- | --- |
| Land entrance, landscape | [Before](shots/k3/water-alignment/before/844x390-land-cave-mouth.webp) | [After](shots/k3/water-alignment/after/844x390-land-cave-mouth.webp) |
| Cave entry, portrait | [Before](shots/k3/water-alignment/before/390x844-actual-cave-entry.webp) | [After](shots/k3/water-alignment/after/390x844-actual-cave-entry.webp) |
| Cave side of join, landscape | [Before](shots/k3/water-alignment/before/844x390-cave-surface-west.webp) | [After](shots/k3/water-alignment/after/844x390-cave-surface-west.webp) |
| Sea side of join, portrait | [Before](shots/k3/water-alignment/before/390x844-sea-surface-east.webp) | [After](shots/k3/water-alignment/after/390x844-sea-surface-east.webp) |

## Verification

Three new pure regressions first failed against the old geometry, then passed
after the fix. They cover connected levels and entry immersion, swimming and
coasting in both directions, and sinking/emerging across the join without being
trapped. The targeted movement suite and complete-game robot pass together.

Final browser checks pass at 844×390 and 390×844 with zero captured errors. Real
keyboard swimming crosses in both directions with **0 vertical displacement** at
the join. The check also uses the actual doorway action and automatic return,
validates air and animated-line geometry, and confirms the head clears both the
viewport and goal note. The full pure suite is **141/141**; the rebuilt first
playable is **2,769,354 bytes**.

```sh
node --test tests/skoldhast-waterline.test.mjs
node tests/browser/skoldhast-water-alignment.mjs --out /tmp/water-alignment
npm test
npm run build:skoldhast -- --check
```
