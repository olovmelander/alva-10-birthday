# Sköldhästen: a coherent pencil world

Visual direction for the whole-game art pass, September 2026. Baseline: clean
`6d8bfe9`, captured under `docs/skoldhast/shots/world-art/before/`. This extends
the existing colour script and material contract in the game plan; it does not
change the story, puzzle order, collision geometry or Alva's creature.

## What the references teach

These are composition and construction references, not assets to copy.

| Primary reference | What the source actually supports | Application here |
| --- | --- | --- |
| [Rex Crowle, Media Molecule: Tearaway concept development](https://blog.playstation.com/?p=190010), 2017 | The creative lead explains that a recognizably consistent paper material led to paper-specific gameplay; the team studied actual pop-up-book construction. | Show a fold's underside, crease and contact shadow consistently. A growing root must visibly lift its own strip. Keep our pencil texture: Tearaway's textureless construction paper is not this game's finish. |
| [Max Degen and Johannes Figlhuber: The Art of Ori and the Blind Forest](https://news.xbox.com/en-us/2015/03/17/games-the-artwork-of-ori-and-the-blind-forest/), 2015 | The lead artists describe character scale and the visible space ahead as deliberate gameplay and world-scale decisions. | Compose the approach, action and consequence together. Keep enough clear ground/water ahead to read the next action. Do not copy Ori's lighting or shrink the hero further. |
| [Joachim Barrum: Snufkin artwork](https://joachimart.com/blog/2024/3/11/snufkin-melody-of-moominvalley), 2024 | The artist identifies these as his commissioned cutscenes, animation and marketing artwork. In the inspected [valley vista](https://images.squarespace-cdn.com/content/v1/506a89dee4b00f5f2f4c4800/bdf5f0fd-5665-4338-8c56-b923fa700ffc/Snusmumriken_Screen1.jpg), distant land is pale, foreground shapes group at the edges, and river/path curves connect the scene. These are visual observations, not a claim about its game renderer. | Group our scenery into readable depth planes and connect places with repeated native motifs. Use existing sage, blue-grey and paper pencils; retain Alva's own outlines and shapes. |
| [Nomada Studio: GRIS](https://nomada.studio/gris-game/), official [tower screenshot](https://nomada.studio/wp-content/uploads/2018/08/GRIS-Screen-14.jpg) | The inspected image gives one dominant landmark room to read through large quiet areas and repeated smaller architectural shapes. | Give Pappersfyren and each puzzle one clear focal shape. Borrow restraint and rhythm, not the watercolour medium, architecture or palette. |

## What is visible in the baseline

| Capture | Observed issue | Needed change |
| --- | --- | --- |
| `01-land-beach`, `06-land-steppe`, `12-kelp-cave-entry` | Dense grain has similar strength in broad sky/water, distant forms and the playable foreground. Empty regions still demand attention because of texture. | Lower background stroke pressure and contrast. Preserve a stronger playable edge and the hero's original detail. |
| `06-land-steppe` | The glimpse hill is one large centred dome. Its fill is almost as assertive as the near ground. Small flowers and logs are isolated against large repeated textures. | Use quieter, asymmetric distant landforms and several scales of grouped vegetation. Keep the glimpse identifiable without making its hill the whole composition. |
| `05-land-backdrop-boundary`, `07-land-hill` | Large rectangular material changes and uniformly busy earth make construction seams more prominent than the local puzzle. | Blend material colour at joins; vary strata and roots beneath the surface while preserving the exact walkable outline. Keep paper-fold silhouettes distinct. |
| `10-land-west-edge` | The rock face visibly terminates inside the camera view, exposing scenery beyond a rectangular cut. | Continue decorative terrain beyond the playable limit, without extending collision or implying a new route. |
| `16-kelp-vault-lit`, `17-kelp-heart` | Water is dominated by horizontal hatching; decorative kelp is thin and isolated. The broad playable kelp has a flatter finish than the decorative fronds. Light pools and current bands compete locally. | Build grouped kelp at several depths; give playable and decorative plants the same pencil grammar. Keep the snag, loose end, shell, current and rising fragment unobstructed. |
| `20-viken-sea-entry`, `21-viken-pier`, `22-viken-lighthouse-high`, `25-viken-evening` | Dense horizontal water marks and equally detailed cliffs crowd the pier, supports and cream lighthouse. The warm finale changes colour but retains that competing texture. | Calm bay water and distant stone together. Preserve clear supports and ruler-line architecture, with restrained light that gives the lighthouse and final colour change room to read. |

The baseline already has valuable structure: shared named pencils, deterministic
texture generation, multiple steppe depth layers, real shoreline anchoring,
contact shadows, reserved-paper highlights and separate evening art. Improve
the hierarchy of these parts rather than replacing the drawing with filters.

## Shared direction

1. **One sheet, one pencil box.** Directional strokes follow the material:
   grass and kelp along their growth, rock along strata, water across its surface.
   Use existing named colours and a consistent paper tooth. Background burnish
   can be quiet without making the hero or puzzle props smooth plastic.
2. **Three readable depth roles.** Far scenery has pale colour, fewer marks and
   softer edges. The playable plane has clear contact and surface contours.
   Darker foreground framing stays sparse and toward the sides. Detail density
   is a composition decision, not a uniform scatter rate.
3. **Group, then leave space.** Reuse plants in irregular families with size
   variation, a few stones and quiet gaps. Keep the next path, seed flight,
   pushable stone, kelp end and collection pocket clear at phone size.
4. **Make the physical cause beautiful.** Roots emerge from the seed's tuft;
   paper shows a real underside while lifting; the stone shadows its contact;
   released kelp visibly leaves the lip; the current carries the shell to the
   crest. Decoration must support those observations.
5. **Preserve meaningful marks.** Dashed graphite, dashed blue, dotted tufts and
   ruler-straight folds keep their established meanings. Decorative markings
   must not look like new routes or interactable targets. White outline clouds
   and m-gulls remain finished drawings.
6. **Let the ending earn its light.** Until the final splash, the sun and shore
   waves stay stopped; currents, fish and kelp may move underwater. Only the
   finale brings the warm evening change. Keep creature colours intact under
   environmental grading; the orange mane and tail remain hair, without glow.

## Colour and motif by place

| Place | Shared pencils and shape language | Composition and continuity |
| --- | --- | --- |
| Table and opening drawing | Warm wood, cream-white paper, graphite; recognisable pencil tools. | Frame the drawing as the source of the world. Preserve the authored first and final beach tableaux. |
| Stranden and cave approach | `skyPale`, `skyBlue`, `seaBlue`, `sand`, white foam with `foamLine` outlines; shells and low dune grasses. | Broad quiet sky/sea, grouped shore details, a legible dark-blue waterline. Carry the same shell/stone/sand motifs toward the cave. No moving surf before release. |
| Stäppen and Galoppbacken | `grassSilver`, `grassGreen`, `grassOchre`, pale earth and blue-grey distance; feathergrass, backsippa, seeds, roots and slanting strata. | Pale overlapping ridges behind a crisp grassy route. Local vegetation groups frame folds; open run-up and landing space stays obvious. No copper or golden grass competing with the mane. |
| Klippudden | The same sage turf over cool rock, sparse salt-side grass and paper margins. | Continue geology through the cleft and beyond the camera edge. The real gap, reachable landing and map fragment carry the emphasis. |
| Kelpskogen and Mörka valvet | `tealLight`, `deepTeal`, `seaDeep`, dark green kelp; fronds, holdfast stones, small fish groups and paper-reserved light. | Pale upper water, quieter distant kelp, clear near silhouettes. Lanternfish remain small warm points that reveal the route. Keep the playable current distinct from ambient strokes. |
| Kelphjärtat and Veckmuren | Continue the kelp palette; cream paper underside, graphite crease and blue current. | Reserve clean water around the snag and safe collection pocket. The immense straight fold contrasts with organic kelp and preserves the mystery without extra symbols. |
| Spegelviken and Pappersfyren | `bayGrey`, `bayDeep`, cool stone, `paperCream`, `inkBlue`; still reflections, pier supports, ruled folds. | Group cliffs to frame the bay and lighthouse. Reflection remains a story clue; warm reflected light must not falsely indicate the real shutters are already open. |
| Released sea and return | Existing evening gold, rose and lilac mixed through the established palette. | Long warm pencil marks and resumed waves reward the finale. Keep cloud interiors white and creature colours recognisable. |

## Implementation and review record

The following changes are implemented; observed visual outcomes and completed
checks are listed separately below.

| Area | Implementation |
| --- | --- |
| Shared scenery assets | `backdrops.mjs`, `materials.mjs` and the cave cliff recipe in `props.mjs`: calmer pencil pressure, broader colour masses, more composed distant ridges, lighter sandstone and fewer competing scratches. Creature and cloud shapes stay intact. |
| Land habitats | `land-scenery.mjs`: deterministic groups of grass, plumes, rosettes and lichen rooted on real ground, with authored puzzle clearings and the original drawing excluded. |
| Connected places and evening | `coastal-cave.mjs` encloses the underwater entry with a rear vault. The distant glimpse ridge gains an asymmetric outline. Environment-only evening grading preserves the hero and white cloud interiors. |
| Underwater depth | `underwater-garden.mjs`, `scenery.mjs` and `view.mjs`: grouped kelp at distinct depths, quieter daylight shafts and surface marks, broken-pencil current bands, restrained lanternfish light and reduced-motion handling. |
| Playable kelp | `kelp-scene.mjs`: pencil grain, short leaf veins and broken stem highlights follow the existing P6 contours; the tether, crest and fragment positions stay unchanged. |
| World boundaries | `landscape-edges.mjs`: decorative terrain continues past scene limits; internal gaps, collision and puzzle geometry retain their existing meaning. |
| Camera and page continuity | `backdrop-layout.mjs` shares layout between live scenery and the opening picture, restores every layer after a snapshot, and anchors bay water below the high gallery. Page-turn rendering adjusts to orientation changes without leaving a stale viewport. |
| Closing caption | The table-mode caption uses existing cream paper and graphite UI tokens, with bounded padding, so the closing sentence reads over the dark window without covering the drawing. |

Final comparison evidence is **77 matched before/after views**: 30 at 1440×900,
32 at 844×390 and 15 at 390×844, plus an actual gallery rotation after-view.
Normal scene views use the production camera; the two wide boundary cases are
explicitly named. The matrix has no browser errors. Active P6 pull and fragment
pocket views at both phone sizes confirm that controls leave the snag, hand and
paper clear. The clean baseline pure suite passed **311/311**.

Reviewed desktop after-frames confirm the intended hierarchy:

- `06-land-steppe` and `07-land-hill`: quieter blue/sage ridges separate from
  the detailed hero; grouped native plants ground the route without covering
  flowers or tufts.
- `16-kelp-vault-lit` and `17-kelp-heart`: wall clues and thin current marks read
  against calmer water; P6 leaves now carry pencil veins and tooth, while the
  mechanism and collection space remain open.
- `12-kelp-cave-entry` and `10-land-west-edge`: a rear rock enclosure connects
  the underwater entrance; continuous terrain replaces the exposed left cut.
- `21-viken-pier` and `22-viken-lighthouse-high`: water remains below the pier
  and disappears below the high gallery instead of forming a false surface
  beside the lamp room. White clouds and creature colours remain recognisable.
- At 844×390, the hill, broad kelp leaves and dark-vault arrow retain clear
  silhouettes. At 390×844, the hill tuft, lit-vault wall clues and high-gallery
  shutters remain legible beside the touch controls.
- Refreshed finale captions have clear graphite-on-paper contrast. At 844×390,
  the compact caption ends at 31.55px, above the drawing's 37.04px top; the
  portrait caption is also separate from the drawing. The reviewed contact
  sheets are `after/contact-{1440x900,844x390,390x844}.webp`.

The modified pure suite passes **328/328** tests. The rebuilt first-playable
download is **2,218,538 bytes**, down from
**2,678,669 bytes** in the baseline (about **17.2%**), with unchanged asset
dimensions. The build budget check and `git diff --check` pass. The expanded
browser lifecycle check verifies exact snapshot restoration in all three
scenes, progress-preserving page rotation, texture disposal, cancellation and
reopen, and environmental tint that leaves the hero and user cloud untinted.
All five ticket-launcher checks pass.

Matched desktop renderer diagnostics (30 static samples per view):

| View | Display objects, before → after | Draw calls/frame, before → after |
| --- | --- | --- |
| Land hill | 695 → 963 | 38 → 39 |
| Kelp entry | 788 → 684 | 98 → 91 |
| Bay pier | 618 → 568 | 41 → 41 |

Land gains bounded habitat groups; the underwater layers use fewer objects.
These recorded samples precede the final single-Graphics sea-fold face
continuation, which adds one display object to the kelp scene.
These are renderer counts from software Chromium, not a real-phone frame-rate
benchmark. Records are in `before/states-1440x900-metrics.json` and
`after/states-1440x900.json` beside the captures.

For subsequent art changes, retain matching story states and viewports, inspect
motion as well as still captures, and keep the game plan's thumbnail/greyscale
review. Check material joins, camera boundaries, underwater depth, first/final
tableau fidelity, white clouds, frozen-world timing, reduced motion and effects
disabled. Keep first-playable download and scene texture budgets.
