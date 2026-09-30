# Depth, shorelines and grounding: the world around her picture

Review notes for `claude/skoldhast-visual-depth`, on top of `main` at `49ade5a`.
After a screenshot review of all 27 places, Pappa asked for the recommended
improvements, in this order: layered backdrops pinned to the world; shorelines,
posts and reflections; materials; grounding; underwater depth, life and evening
light. Each image under `shots/k3/visual-depth/` shows the same place before
(`Före`, `49ade5a`) and after (`Efter`). Her picture (the opening and the final
tableau, 105.8–112 HL on the beach) is unchanged: nothing new is drawn inside it.

## What was wrong, and why

| Seen | Cause |
| --- | --- |
| Under the pier in Spegelviken: sky and mountains behind the swimmer, who looked as if flying | One screen-fixed backdrop per scene, moving 5 % with the camera; the water veil is 26 % opaque, so the sky showed through. |
| Clouds and gulls sank below the horizon when climbing; a cloud lay across a mountain at the gallery | Sky props moved at half the camera's vertical speed while the backdrop moved at 5 %; the mountains were in the sky picture, behind the props. |
| The backdrop jumped sideways by 3 % of the screen every 40 HL | `cam.x % h(40)` in the backdrop's x. |
| The sky on the steppe and in the bay read as more sea | Skies were hatched in long level strokes, like the sea. |
| The Viken pier, the beach jetty and the hop logs floated; Spången was a solid block of wood | No posts or supports were drawn; Spången was a solid terrain column of `mat-wood`. |
| Foam on top of the jetty's deck | `foam-edge` props in the `mid` layer at deck height. |
| The pool's reflection (the arch and a fish) 250 px down in the sand | A fixed 3 HL mask under a 30-unit-deep pool; the fish swam at 0.9 HL. |
| The gully under Streckbron, the ditch and the cleft were holes to the sky | Nothing was drawn behind the terrain columns. |
| Sand and earth looked like planks; in portrait the ground was a flat band of stripes | All ground materials used long level strokes. |
| Props and hop spots did not touch the ground | No contact shade under anything but the sköldhäst. |
| The chains were ruled lines | A 60-unit sag on spans of up to 17 HL, at 50 % alpha. |
| Underwater was one even teal | A screen-fixed picture and a flat veil; no light from above. |
| The bay stayed grey under the golden finale sky | The evening bay water was drawn in cool blue-grey. |

## What changed

- **Layers (`backdrops.mjs`, `view.mjs`, `world.mjs`).** A backdrop is now a sky
  plus layers drawn *in front of* the sun, clouds and gulls (a new `bgFront`
  container). The steppe has three hill layers (`bg-steppe-far/-mid/-near`)
  that stand on the ground line and move at 4/10/20 % of the camera; the
  farthest is palest and most sky-coloured, with the thinnest outline. The bay
  has a sky (`bg-bay`) and a front (`bg-bay-front`: cliffs, water,
  reflections); under the surface hangs `bg-bay-under`, the bay's depths, from
  the real waterline. Clouds and gulls stay above the bay's painted horizon.
  The sideways jump is gone. Skies use short slanting strokes in two
  directions. The glimpse figure's hill is redrawn in the steppe's colours and
  fades into the valley haze.
- **Shores (`view.mjs`).** Where a sea or pool meets land (not her beach), the
  ground darkens with wet sand or wet stone, and the sea leaves paper-white foam
  at the edge. The seabed under a sea is tinted, thinning toward the shore.
  The pier stands on posts (`posts` on the surface) with a wet band, weed and
  ripples. The beach jetty's deck is thinner and its foam sits behind it, at
  the posts. Gully, ditch and cleft have a far wall (`backs` in `world.mjs`),
  paler and in shade, with a few fallen stones.
- **Reflection.** The pool's reflection is masked by a fading gradient: clear at
  the surface, thinning into the wet sand. The fish swims in the water.
- **Materials.** `mat-sand` (dry sand) is short strokes turning this way and
  that, grain specks and wind ripples; her wet beach keeps `mat-wetsand`.
  `mat-earth` is hatched on a slant over stronger strata lines. On land, the
  colouring thins into blank paper 1.15 HL below the nearest low ground
  (`paperBelow`), so a cliff stays coloured to its foot; there are roots under
  the turf, a few buried stones and shells, and grass lips over cliff edges.
- **Grounding.** Spången is a plank walk on posts over level sand
  (`boardwalk`; its collision is unchanged). Hop logs and the flat stone rest on
  humps of the ground (`mound`). Everything standing on the ground gets a soft
  contact shade (not inside her picture). The chains sag with their span.
- **Under water.** A world-anchored depth gradient (pale and green under the
  surface, darker toward the trench), a shining underside of the surface,
  dancing light on the shallow seabed, kelp leaning east with the currents on
  holdfasts (some on stones), a warm halo and light pool under the lyktfiskar,
  and two small far schools of fish.
- **Life and light.** One wind drives the grass, clouds and foam; grass bends
  aside as the sköldhäst passes; butterflies over each backsippa. The evening
  bay water holds the golden sky. The beach's sea underlay matches the painted
  rows in both lights.
- **Download.** Evening art moved to its own background bundle `evening`; the
  day steppe sky and bay sky are separate images. First playable:
  **2,557,913 bytes** (main: 2,783,057). Layers that scroll smaller than stored
  are mipmapped (`mip` in the manifest).

## Checks

- Pure suite **158/158** on the merged tree (robot included).
- Browser, all passing: launch, save, touch (844×390 and 390×844), guide,
  pages, finale, awakening, prologue lifecycle, view lifecycle, cloud colour,
  cloud sky, mirror vista, water alignment, hills. Launch timed out once under
  heavy parallel load and passed alone.
- `skoldhast-opening.mjs` fails with *"the surviving beach stays in place:
  217,190,147 → 244,176,101"*, **identically on clean `main` (`49ade5a`)**,
  so it predates this branch (it arrived with the slow-motion drop merge). Not
  investigated here.
- Contact sheets (27 places, three sizes) are refreshed in `shots/k3/`;
  the `49ade5a` sheets are in `shots/k3/visual-depth/before/`. Tours report no
  browser errors.

## Not done, and why

- **Rounded hilltops.** The drawn outline is the collision line; a smoothed
  outline would lift or sink the hooves by up to ~15 units mid-slope.
- **Warming through Kapitel 3.** The colour script keeps Spegelviken cool; only
  the finale is golden.
- **Cloud shadows on the steppe, a colour-script strip, outline boil on living
  things.** Not tried in this round.
- **Real-phone performance.** About 70 small light marks in the kelp scene, ~50
  contact shades and a few layers were added; measure with `?debug` on Alva's
  device.

## Questions for Pappa

- Is the paper showing through at the bottom of the portrait screen welcome
  (like her picture's margin), or should the ground stay coloured further down?
- Butterflies: keep, or are they too busy next to the backsippa puzzle?
