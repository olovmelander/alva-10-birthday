# Sköldhästen — build spec (shared contract between modules)

This file is the contract between the game engine and the art, hero and audio modules. The design itself is
`docs/skoldhast-game-plan.md`. Read the plan's §2 (fidelity contract) and §5 (look and sound) before drawing
anything.

## 1. Global conventions

- **World units (wu).** 1 HL (horse length, muzzle to rump, tail excluded) = **200 wu**. y points **down**.
- **Texture density.** Each atlas declares `scale` = texture pixels per wu. Pixi uses it as the texture
  resolution, so a sprite made from a frame is already sized in world units.
  - Hero, characters: `scale 1.5`.
  - Props, particles, decals: `scale 1`.
  - Materials (tiling): `scale 1` (512×512 px tile = 512×512 wu).
  - Backdrops: stretched to the screen by the engine, any size up to 2048×1024.
  - UI images for the DOM: `scale 2` (drawn at 2× CSS size).
- **Anchors.** Things that stand on the ground: `[0.5, 1]` (bottom centre = the ground contact point).
  Particles and floating things: `[0.5, 0.5]`. Anything else is stated per asset.
- **Facing.** Everything is drawn facing **right**; the engine mirrors with `scale.x = -1`.
- **Style.** Only the pencil toolkit (`scripts/skoldhast-art/pencil.mjs`) and its `PENCILS` box. Colored pencil
  on white paper, graphite contours (`PENCILS.graphite`) around solid things, dark-blue outlines
  (`PENCILS.foamLine`) around foam and droplets, tooth showing in light strokes, no watercolour, no pixel art, no
  black fills, no gradients made without strokes. Clouds are **outline only** with a paper-white interior (never
  coloured in). Gulls are Alva's **"m" strokes**.
- **Seeds.** Every Sheet gets a fixed seed (`pencil.hashSeed(name)`), so builds are reproducible.
- **Files.** Art modules live in `scripts/skoldhast-art/<module>.mjs` and export `async function build(api)`
  (see `scripts/build-skoldhast-assets.mjs`). Build one module with
  `node scripts/build-skoldhast-assets.mjs --only <module>`. Output goes to `skoldhast/assets/`.
- **Review.** Render contact sheets to the scratchpad, never into the repo. Look at them (Read the PNG) next to
  the reference crop.
- **Do not** commit, push, or edit files owned by another module.

## 2. Hero (module `hero`, runtime `skoldhast/src/rig.mjs` + `skoldhast/src/hero.mjs`)

Atlas `hero` (scale 1.5, bundle `boot`) with the part textures, plus data `hero-rig` (pivots, joint positions,
z-order, part attachment offsets in wu).

Runtime API (ES module, imports nothing but what it is given):

```js
import { createHero } from './hero.mjs';
const hero = createHero(PIXI, { textures, rig, mini = false });
//   textures: { [frameName]: PIXI.Texture } from the hero atlas
//   rig: the parsed hero-rig.json
//   mini: a cheap far-away variant (no strip physics), used for distant sköldhästar
hero.view        // PIXI.Container. Origin = ground contact point under the middle of the body. Faces right.
hero.update(dt, s)   // dt in seconds (frame time), s = state snapshot (below)
hero.destroy()
```

State snapshot `s` (world units, y down; missing fields mean "neutral"):

| field | meaning |
| --- | --- |
| `x, y` | feet position in the world (already interpolated) |
| `facing` | `1` right, `-1` left |
| `gait` | `'stand' \| 'walk' \| 'trot' \| 'canter' \| 'gallop' \| 'skid'` |
| `speed` | horizontal speed, wu/s (walk ≈ 320, trot ≈ 640, gallop ≈ 1200) |
| `mode` | `'ground' \| 'air' \| 'swim' \| 'hidden'` |
| `action` | one-shot or held pose: `null \| 'balk' \| 'buck' \| 'leap' \| 'neigh' \| 'shake' \| 'stamp' \| 'talk' \| 'lookdown' \| 'nod' \| 'rear-small'` |
| `actionT` | 0..1 progress through the action |
| `airT` | 0..1 progress through a leap arc (takeoff → suspension → landing) |
| `vx, vy` | velocity, for pitch in the air and in water |
| `groundAngle` | slope under the body (radians, positive = ground rising to the right) |
| `groundAt(x)` | function: terrain height (y) at world x, for planting each hoof; may return `null` |
| `submerge` | 0 dry … 1 fully under water |
| `waterY` | y of the water surface when swimming (for floating hair) |
| `wet` | 0..1: coat darker and dripping |
| `hide` | 0 standing … 1 lying down under the shell (the *Göm dig* pose) |
| `lookAt` | `{x, y}` or `null`: head turns toward it (within limits) |
| `emote` | `null \| 'happy' \| 'sad' \| 'surprised' \| 'sleepy'` (eye and head only) |
| `time` | seconds since start (for idle cycles, blinking) |

Required looks (all from the fidelity contract in the plan §2.2, no new equipment):

- **Idle:** breathing, blink, forelock twitch, tail swish, weight shift.
- **Gaits:** walk (4-beat), trot (diagonal pairs), canter (3-beat) and gallop (4-beat with suspension). Cycles
  are driven by distance travelled, and hooves plant on `groundAt` (two-bone IK, carpus bends back, hock bends
  forward). The shell stays rigid on the body. Mane and tail stream back with speed.
- **Skid** (reversing at gallop), **balk** (stops at an edge, looks down, snorts), **buck** (small hop),
  **leap** (takeoff, stretched suspension, landing absorb), **stamp**, **neigh** (head up), **shake** (after
  water: whole-body shake, droplets are the engine's), **talk** and **nod** (head only), **lookdown**.
- **Swim:** body near horizontal, legs paddle, kelp fringes and mane float up, the tail fans and trails; head
  stays up; tilt with `vy`.
- **Göm dig (`hide`):** the horse lies down, legs folded under, neck low, head resting; the shell is on top;
  the mane tuft and the tail still show. Blend smoothly with `hide` 0 → 1. In water, the same pose.
- **Wet:** coat slightly darker.
- **Contact shadow:** a hatched brown shadow under the planted hooves (hidden when swimming).
- **Mini:** the same parts, simplified animation, used at 0.25–0.4 scale.

Dev page: `skoldhast/dev/hero.html` shows the hero on a strip of ground with buttons for every state, so it can
be screenshotted with `node scripts/skoldhast-shot.mjs`.

## 3. Scenery art (modules `materials`, `backdrops`, `props`)

### Materials — `api.image(name, canvas, { repeat: true, bundle })`, 512×512, seamless in both directions

| name | bundle | look |
| --- | --- | --- |
| `mat-sand` | boot | dry sand: ochre crosshatch, light, grainy |
| `mat-wetsand` | boot | wet sand: darker ochre-brown, smoother, a few horizontal streaks |
| `mat-grass` | land | the steppe ground: silver-green and pale-ochre strokes, mostly vertical-ish short strokes |
| `mat-earth` | land | escarpment soil: warm earth with faint horizontal layers and wave marks |
| `mat-rock` | boot | grey stone: blocky hatching, cracks |
| `mat-wood` | boot | planks (horizontal boards with seams every 64 px, wood grain) |
| `mat-seabed` | sea | sea-floor sand seen under water: seabed ochre with blue-green tint |
| `mat-water` | boot | sea water from the side: horizontal blue strokes like her sea, dense (used with alpha) |
| `mat-deep` | sea | deep water volume: blue-teal, darker, softer strokes |
| `mat-glass` | sea | the frozen sea (not used by the engine yet, so not in the first download): pale blue with long glassy streaks and white highlights |
| `mat-paper` | boot | blank white paper with tooth only (unreleased/"white paper" places) |
| `mat-cream` | bay | cream folded paper (Pappersfyren) with faint fold creases |
| `paper-tooth` | boot | 256×256 greyscale tooth for the screen-fixed multiply overlay (white with light-grey tooth) |
| `desk-wood` | boot | the table top for the prologue: warm wood, soft |

### Strokes — `api.image`, 256×24, seamless horizontally, the line runs through the middle (for ropes)

`stroke-graphite` (contour), `stroke-blue` (waterline, dark blue), `stroke-dash` (graphite dashes: 18 px on,
10 px off), `stroke-dashblue` (blue dashes for currents), `stroke-glow` (a soft yellow pencil halo for the
glowing P8 line), `stroke-chain` (the pencil chain linking shutters: small linked ovals), `stroke-crease` (a
dead-straight fold: thin graphite line with a soft grey fold shadow on one side).

### Backdrops — `api.image`, up to 2048×1024

A backdrop is a **sky** (full paper, covering the screen) plus optional **layers** drawn in front of the
sun, clouds and gulls (`layer: true`: transparent above their silhouette, finished with `finish()`).
A world backdrop entry (`world.mjs` `backdrop`) may list:

- `layers: [{ image, par, y?, repeat?, fill? }]`. Each layer is as wide as the sky's frame and moves
  sideways at `par` × the camera (farther = smaller). With `ref` (a ground height in wu) on the entry,
  a layer's top row sits `y` frame heights above the ground line on screen, and climbing lowers
  every layer by its own `par` (the steppe). Without `ref` it keeps the sky's frame (the bay).
  `repeat` tiles it sideways; `fill` paints its own colour below it where no ground covers the screen.
- `under: { image, water, span, par, fill }`: a tile hung from the named water's real surface, `span` wu
  wide (the bay's depths, so a swimmer never sees the sky under the pier).
- `horizon` (0–1 of the sky's height): clouds and gulls stay above it.
- `ref`, `skyRow`: the sky's row `skyRow` sits just above the ground line.

Evening swaps every image named in the scene's `evening` map. Day land art is in `boot`/`land`; the
evening art is its own background bundle (only the finale needs it).

| name | bundle | content |
| --- | --- | --- |
| `bg-beach` | boot | Her picture's sky and sea: soft blended blue sky (pale near the horizon), sea as dense horizontal blue strokes getting darker toward the bottom, **no horizon line**. No sun, clouds or gulls (those are props). The lower 30% is sea. |
| `bg-beach-evening` | evening | The same in golden evening light (warm yellow sky, orange-pink near the horizon, sea with warm highlights). |
| `bg-steppe` | land | The steppe's sky only: short slanting strokes in two directions (never long level ones, which read as sea), bluest high up, palest and a little warm just above the far hills. |
| `bg-steppe-far` / `-mid` / `-near` | land | Layers, 2048×512 (the far one stored at half size), tiling sideways: the two farthest hill bands (lightest, most sky-coloured, thinnest outline), the middle band, the nearest band with grass strokes. Each band is clearest at its crest and hazes toward its foot. |
| `bg-steppe-evening`, `bg-steppe-*-evening` | evening | The same, golden evening. |
| `bg-under` | sea | Under water: light teal at the top with hatched daylight shafts slanting down, deepening to blue-green. |
| `bg-bay` | bay | Spegelviken's sky only: cool blue-grey, bluest high, palest in a haze just above the water. |
| `bg-bay-front` | bay | Layer: pale grey cliffs at both sides and the calm sea with their reflections, horizon at 60%. |
| `bg-bay-evening`, `bg-bay-front-evening` | bay | The same at golden evening (half size); the still water holds the warm sky. |
| `bg-bay-under` | bay | Layer, 1024×1024, tiling sideways: the bay's water below its surface (clear above a ragged top), light shafts, pale far stones, darkening with depth. |
| `bg-fold` | sea | Beyond Veckmuren: a pale, flattened grey-blue (the folded-under sea), for the white side of the crease. |

Materials: `mat-sand` is **dry** sand (the dunes, the bay's shore) in short strokes turning this way and that,
with grain specks and wind ripples; her beach and the runway keep `mat-wetsand`'s long strokes. `mat-earth`
is hatched on a slant across wavy strata lines. Level parallel strokes are kept for water and wood.

### Props — atlas `props` (scale 1, bundle `boot`) unless stated; anchors `[0.5, 1]` unless stated

Sizes are in wu (1 HL = 200 wu).

**Sky (boot):** `sun` (her yellow sun with ray lines and soft glow, ~260 wu wide, anchor centre),
`cloud-1`…`cloud-3` (outline-only clouds, paper-white inside so they cover the sun, 300–520 wu wide, anchor
centre), `gull-m-1`…`gull-m-4` (her "m" gulls, single blue-grey stroke, 40–60 wu, anchor centre; 4 wing
positions for flapping).

**Stranden (boot):** `driftwood-1`, `driftwood-2` (60–100 wu high logs to hop onto), `rock-flat`, `rock-1`…
`rock-3` (small beach stones), `shell-1`…`shell-6` (big musical shells lying on sand, 40–60 wu, pastel colours),
`dune-grass-1`…`dune-grass-3` (tufts), `seaweed-1` (on sand), `klo-hole` (crab hole in sand, 40 wu),
`post-note` (a wooden post with a small paper note pinned, 140 wu high), `frozen-splash` (her splash frozen:
paper-white foam and droplets outlined in dark blue over blue hatching, ~220 wu wide × 180 high, anchor bottom
centre), `foam-edge` (a strip of frozen foam lying along the glassy sea edge, 300 wu wide, anchor bottom centre),
`cliff-sealed` (a sandstone cliff ~700 wu wide × 700 high with an arch-shaped **drawn but filled-in** outline:
the arch is sealed rock), `cliff-open` (the same cliff with the arch open: a dark cave opening with water
inside), `rail-stone` (round stone ~70 wu), `rail-groove` (a groove track decal, 300 wu wide, anchor
[0.5, 0.5]), `plank-solid` (a plank bridge piece 220 wu wide, anchor [0.5, 0.5]), `gate-closed`,
`gate-open` (a wooden pier gate with a big bolt, ~200 wu high), `jetty-post` (a wooden post, 160 wu high),
`flagpole` (a pole 260 wu high, anchor bottom), `flag` (small pennant, anchor [0, 0.5] at the pole end),
`ratchet-wheel` (a wooden ratchet wheel 60 wu, anchor centre), `hoofprint` (decal, 40 wu, anchor centre),
`hoofprint-graphite` (the same as a graphite pencil mark), `label-skold-hast` (Alva's handwritten label traced:
see plan §2.3 — capitals SKÖLD with the Ö drawn as a small o with a short bar above; lowercase häst with a bar
over the a; one wavy underline under both words rising to the right; the label slants up to the right; ~420 wu
wide; anchor centre).

**Stäppen (land):** `feathergrass-1`…`feathergrass-4` (fjädergräs: silvery plumes, 80–160 wu high),
`backsippa` (a clump of giant pasqueflower seed heads, fluffy silvery-purple, 140 wu high), `backsippa-bare`
(the same after the fluff is blown away), `tussock-dotted` (a dotted empty outline of a tussock, 160 wu wide ×
60 high), `grass-ramp` (a grassy ramp piece that the engine stretches: 200×120 wu, anchor [0, 1]),
`hurdle-log` (a low log 110 wu wide × 50 high), `boulder` (160 wu), `wave-marks` (decal of wavy pencil lines,
300 wu wide, anchor centre), `rope-plank-up` (a plank bridge rolled up on the far side, 80 wu),
`rope-plank-down` (the plank bridge lowered across a 5 HL cleft: 1000 wu wide × 60 high, anchor [0, 0.5]),
`mark-land` and `mark-sea` (the two halves of Kartväktaren's map mark: a compass-like pencil symbol cut in
half, 120 wu, anchor centre), `mark-empty` (the whole mark as an empty outline), `pinwheel` (a paper pinwheel
on a stick, 120 wu high; anchor bottom), `pinwheel-head` (the spinning part, anchor centre), `edge-tick` (the
språngkant marker: a hoof mark plus a short pencil tick, 60 wu, anchor [0.5, 1]).

**Kelp forest (sea):** `kelp-strip` (a single tall kelp frond as a vertical strip 96×900 px, used as a rope; the
base at the bottom), `kelp-bed` (a dense low clump, 300 wu wide × 180 high), `kelp-float` (floating kelp at the
surface, 160 wu, anchor centre), `seabed-rock-1`…`seabed-rock-3`, `shell-under`, `vault-mouth` (no longer
placed: Mörka valvet is drawn by the engine from its `slabs` roof in `world.mjs`), `paper-flap` (a small paper flap sticking up from
the seabed, 60 wu, and `paper-flap-flat`), `paper-corner` (a folded paper corner sticking up in the vortex
eye, 120 wu, and `paper-corner-flat`), `veckmuren` (the crease wall seen from the side: a vertical, glassy,
ruler-straight wall with water piled up behind it, 360 wu wide × 1400 high, anchor [0.5, 1]).

**Spegelviken (bay):** `lighthouse` (Pappersfyren: a tall folded-paper lighthouse, cream paper with ink-blue
lines, ~1300 wu high × 420 wide, anchor [0.5, 1]; the lamp room at the top with three shutter openings),
`shutter-closed`, `shutter-open` (65×90 wu, anchor centre), `lamp-dark`, `lamp-lit` (the lamp glow, 300 wu,
anchor centre), `window-lower` (the lighthouse's lower window under water, 140 wu, anchor centre),
`pier-end-rail` (the rail at the end of the pier, 120 wu high), `plate-up`, `plate-down` (a round seabed
pressure plate, 160 wu wide), `pipe` (Strömröret: a vertical paper pipe with side vents, 180 wu wide × 900
high, anchor [0.5, 1]), `stair` (the spiral stair from the pier deck to the gallery floor, 340 wu wide, its top landing's
top edge at the anchor [0.5, 0] and its bottom landing 1336 wu below; landings reach left to the pier and
right to the gallery), `stair-gate`, `stair-gate-open` (the gate at the stair's foot, bolted from the stair
side, 118 wu high, anchor [0.5, 1]), `basin` (small
basin at the top of the pipe, 220 wu wide), `map-closed`, `map-open` (Kartväktaren's map on a table: pages LAND
and HAV, 300 wu wide).

**Färgpennor props (boot):** `pencil-pickup` (a colored pencil lying at an angle with a small glint, 70 wu,
anchor centre), and six props in two states each (`-grey` hatched grey only, `-color` coloured in):
`kite`, `boat`, `hut`, `flowers`, `bucket`, `windmill` (60–200 wu).

**Particles (boot, anchor centre):** `p-drop` (her droplet: paper-white oval outlined in dark blue, 14 wu),
`p-foam` (foam bit), `p-sand` (tiny sand fleck), `p-bubble` (small outlined bubble), `p-fluff` (backsippa seed
fluff), `p-glow` (soft yellow halo), `p-star` (a small 5-point pencil star), `p-note` (a tiny music note),
`p-dust`.

## 4. Characters and UI art (modules `npcs`, `ui`)

Atlas `npcs` (scale 1.5, bundle `boot`), anchors `[0.5, 1]`, facing right:

- **Professor Klo** (a small, very precise crab, ~80 wu wide, round red-orange shell, big friendly eyes on
  stalks, pencil-drawn): `klo-idle-1`, `klo-idle-2`, `klo-walk-1`…`klo-walk-4` (sideways scuttle),
  `klo-signs` (holding both signs up), `klo-sign-left` (raising the SKÖLDPADDA sign), `klo-sign-right` (raising
  the häst sign), `klo-sign-folded` (holding the folded sign that now reads SKÖLD next to häst),
  `klo-stopwatch`, `klo-notebook`, `klo-point`, `klo-whisper`, `klo-peek` (only the eyes above the hole),
  `klo-map-corner` (holding a torn map corner), `klo-happy`. Signs: `sign-skoldpadda`, `sign-hast`,
  `sign-skold` (SKÖLD and häst traced from Alva's label, PADDA lettered to match; small wooden signs on sticks).
- **Kartväktaren** (an old man of folded paper, ~180 wu tall, cream paper with ink-blue fold lines, a ruler under
  the arm, anxious and kind): `kv-stand`, `kv-worry`, `kv-point`, `kv-peek` (head and hands only, peeking
  round a shutter), `kv-walk-1`, `kv-walk-2`, `kv-bow` (apologising), `kv-draw` (drawing with a pencil),
  `kv-unfold` (arms wide, unfolding).
- **Creatures:** `lyktfisk-1`, `lyktfisk-2` (small fish with a glowing warm spot, 40 wu, anchor centre),
  `fish-1`, `fish-2` (small shy fish, anchor centre), `hermit-1`, `hermit-2` (a tiny hermit crab in a shell),
  `eel-1`, `eel-2` (a sand eel peeking up from the sand), `turtle-signe` (a proud ordinary turtle, 140 wu, for
  the after-game race; 2 walk frames `turtle-signe-1`, `turtle-signe-2`).
- **Table scene (boot, atlas `table`, scale 1):** `alva-pencil` (a colored pencil held for drawing, with a
  sleeve cuff at the upper end; the tip at the anchor `[0.08, 0.95]`), `pencils-lying` (a few colored pencils
  lying on the table), `eraser`, `hoofprint-wet` (a wet hoofprint on paper), `window-dusk` (a window with
  evening sky, 900 wu wide, anchor centre), `star-1` (small star for the window).

UI images for the DOM (module `ui`, `api.image`, scale 2, bundle `boot`): `ui-title` (the game title lettering
"Sköldhästen" in pencil, plus a subtitle band "och havet mellan sidorna"; transparent), `ui-paper` (a
512×512 seamless paper texture for panels, light), `ui-claw` (Klo's small claw doodle, 64×64),
`ui-journal` (a pencil icon of a notebook, 96×96), `ui-pause` (two pencil strokes, 96×96), `ui-hint-mark`
(a small wiggly pencil mark, 48×48), `ui-stick-base`, `ui-stick-knob` (the floating stick drawn in pencil,
256×256 and 128×128), `ui-btn` (a round pencil-drawn button ring, 160×160).
The menus' notebook adds `ui-icons` (the journal's tab icons), `ui-hatch` (pencil hatching), `ui-grunge` (paper
wear), `ui-frame` and `ui-frame-sm` (pencil frames for cards) and `ui-tape` (a strip of tape); the header of
`scripts/skoldhast-art/ui.mjs` describes each. The handwriting font is `skoldhast/fonts/patrick-hand-latin.woff2`
(SIL OFL 1.1, see `OFL.txt`).

## 5. Audio (runtime `skoldhast/src/audio.mjs`)

Everything synthesized with WebAudio (plan §5.5): the theme "Sköldhästens visa" in 6/8 with a modal melody,
a JavaScript Karplus-Strong lyre (computed into AudioBuffers, fractional-delay tuned; never a `DelayNode`
feedback loop for pitched sound), a soft bowed pad and hand-drum hoofbeats. No Mira presets (see the plan).

```js
import { createAudio } from './audio.mjs';
const audio = createAudio({ ctx });          // ctx: an existing AudioContext (the page's), or undefined to create one
await audio.ready;                            // instruments rendered
audio.resume();  audio.suspend();             // on user gesture / on hidden
audio.setVolumes({ music, sfx, voice });      // 0..1 each
audio.setArea(area);                          // 'table' | 'land' | 'sea' | 'bay' | 'final' | 'quiet' — crossfades arrangements
audio.setMotion({ speed01, underwater, hidden }); // every frame: adaptive layers (drums with speed, low-pass under water, near-solo hidden)
audio.stinger(name);                          // 'aha' | 'reveal' | 'chapter' | 'freeze' | 'plask' | 'leap' | 'unfold' | 'discovery'
audio.freeze(on);                             // prologue: the music stops dead (time stops) / starts again
audio.sfx(name, opts);                        // see list
audio.phrase(n);                              // play the first n notes of the theme on the lyre (Spången planks, shells)
audio.note(i, { inst });                      // single scale degree i on 'lyre' | 'shell' | 'plank' | 'bell-free'
audio.dispose();                              // stop everything this module owns; never closes a shared ctx
```

Effects for `audio.sfx(name, opts)`: `hoof` `{surface: 'sand'|'wetsand'|'plank'|'grass'|'rock'|'shallow', speed01}`,
`splash` `{size: 0..1}`, `drip`, `shake`, `bubble`, `swim`, `pencil` `{len: seconds}`, `rustle` (paper fold),
`unfold`, `crabclick`, `neigh`, `blubb`, `snort`, `stamp`, `gull`, `wind`, `whoosh`, `thud` (sink onto the
bottom), `latch`, `ratchet`, `gate`, `pop` (UI), `page` (journal page), `pickup` (färgpenna), `colorin`
(colouring a prop), `sparkle` (discovery, soft), `stopwatch`, `write` (Klo's notebook).
