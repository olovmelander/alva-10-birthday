# Sköldhästen och havet mellan sidorna

Research, creative direction, and implementation plan — 28 September 2026

**Recommendation:** create a Swedish, painterly exploration adventure in which Alva's drawing comes alive and the player becomes Sköldhästen. Its defining pleasure is changing between a joyful gallop and quiet underwater discovery. Speed and stillness solve different parts of the same mystery.

This is a design proposal, not an implemented game. The repository audit is based on `main` at `f8daa8af2926b5e54a99b78265f2bf28e3ee6467`. The current games were inspected in source; no browser playthrough, device benchmark, or existing test-suite run was performed. Performance numbers below are proposed acceptance targets, not measured results.

Design for approximately age ten, inferred from the birthday repository. Alva's exact current age, reading preferences, and tolerance for suspense remain unconfirmed. The opening playtest should establish those through observation rather than delay the first prototype.

## 1. What belongs to Alva's creature

The attached photograph is the primary character reference. Its obscured text must remain unknown. The readable description says the creature enjoys galloping across the steppes and hiding in deep ocean kelp forests. It poses the question of whether this is the world's fastest turtle or slowest horse and invites someone to investigate.

Those are the creature's established traits. Moonlight abilities, the setting, characters, and story below are proposed additions, not claims about what Alva wrote.

### Character fidelity contract

| Visible feature | Requirement for game art |
| --- | --- |
| Horse-shaped head and upright neck | Retain the elongated muzzle, expressive dark eye, ears, and warm brown muzzle; the face must remain horse-like. |
| Cream/light tan coat | Preserve the warm body color and darker mottled markings visible around the legs. |
| Large green turtle shell | Keep the oval dome over the torso, varied green plates, pale seams, and lighter rim. Trace the visible arrangement rather than replacing it with a generic hexagonal sphere. |
| Orange/copper mane | Retain its upward, flame-like tufts and flowing volume. It is hair, not literal fire. |
| Long orange tail | Preserve the long, wavy silhouette and its different motion on land and underwater. |
| Green lower-leg covering | Preserve the moss/kelp-like fringes and dark hooves. The exact material is an artistic interpretation to resolve in the model sheet. |
| Brown straps/bands | Retain the visible neck/body details without adding a rider or new equipment. |
| Sturdy proportions | Preserve the relationship between head, shell, legs, and tail. Do not turn the animal into a small generic turtle with a horse head. |

No extra horn, wings, armor, or costume should be introduced by default. A single oblique photograph does not establish an exact rear view or unseen side: those are controlled extrapolations, reviewed against the visible silhouette.

**Art production order:** isolate the visible character reference → trace silhouette and color blocks → make a clean side view and restrained three-quarter view → review them beside the photograph → separate rig parts → animate → review at actual phone size. AI image assistance may help produce candidate painted assets from the supplied reference; it does not replace the likeness review or deliver a reliable animation rig by itself. Do not generate every animation frame independently: shell seams, anatomy, and markings would drift.

Use the supplied photograph as a reference, not the entire magazine/page as a game background. Only the relevant creature is needed in the finished prologue. Keep Alva credited in Swedish: **"Sköldhästen är skapad av Alva."**

## 2. What the three current games actually do

All code links below point to the audited commit, so the findings remain reproducible if `main` changes.

| Game | Existing experience | Evidence and implication |
| --- | --- | --- |
| Alva's Space Jump | Endless runner: tap/click to jump, collect Star Bits, stomp Goombas, avoid rocks; failure ends the run. DOM sprites, scrolling scenery, birthday framing. | [Controller](https://github.com/olovmelander/alva-10-birthday/blob/f8daa8af2926b5e54a99b78265f2bf28e3ee6467/index.html#L5139-L5476). Variable-step gravity, ground-only jump, phone pace profile. No save system found in this controller. The new game should not be another timed survival loop. |
| Super Alva Galaxy | Automatic forward platforming through ten galaxies, with jump height control, midair spin, power-ups, hearts, moving platforms, family memories, and a finale. | [Physics tuning](https://github.com/olovmelander/alva-10-birthday/blob/f8daa8af2926b5e54a99b78265f2bf28e3ee6467/super-alva-galaxy.js#L28-L82), [fixed loop](https://github.com/olovmelander/alva-10-birthday/blob/f8daa8af2926b5e54a99b78265f2bf28e3ee6467/super-alva-galaxy.js#L5111-L5147), [save](https://github.com/olovmelander/alva-10-birthday/blob/f8daa8af2926b5e54a99b78265f2bf28e3ee6467/super-alva-galaxy.js#L4625-L4642). Its 120 Hz pure simulation is a useful architectural example, not movement tuning to copy. |
| Miras Stjärnsafari | A guided gondola journey across seven floating islands: photograph animal behaviors, use apples/flute/bubbles, go fishing, and help Nova find her Star Tiger parents. Swedish story and persistent album/progression. | [Story/content](https://github.com/olovmelander/alva-10-birthday/blob/f8daa8af2926b5e54a99b78265f2bf28e3ee6467/mira/mira-content.js#L594-L649), [gondola movement](https://github.com/olovmelander/alva-10-birthday/blob/f8daa8af2926b5e54a99b78265f2bf28e3ee6467/mira/mira-ride.js#L991-L1035), [pixel renderer](https://github.com/olovmelander/alva-10-birthday/blob/f8daa8af2926b5e54a99b78265f2bf28e3ee6467/mira/mira-core.js#L195-L237). Already has gentle magic, glowing nature, animal reactions, dialogue, and a rescue narrative. This is the most important differentiation check. |

The fourth game's identity is **direct control of the creature, freely reversible land/sea travel, environmental reasoning, and Alva's drawing changing the world**. Progress comes from understanding places. A new sequence of pretty islands with another lost-animal rescue would overlap too much with Mira.

The repository is a static site. Its package scripts generate artwork; it has no tracked application bundler, test runner, or CI/deployment workflow in this checkout. The birthday background uses Three.js r128. Do not confuse that background with a shared modern game engine.

## 3. Research translated into decisions

These are primary sources: creators describing their own games, official platform/framework guidance, and the author of the physics article. They support design choices; none proves that a particular game will be fun for Alva.

| Source | Relevant finding | Decision for this game |
| --- | --- | --- |
| [A Short Hike — creator](https://adamgryu.itch.io/a-short-hike) | Self-directed routes, unhurried exploration, and music that develops with exploration. | One compact connected place, optional discoveries, and a clear destination without a global countdown. |
| [Alba — environment artist's production breakdown](https://ustwogames.co.uk/news/the-environment-art-of-alba-a-wildlife-adventure/) | The team used explicit childhood/nature pillars, economical art, mobile-led camera decisions, and hand-polished composition. | Establish camera, palette, and hero readability on a phone before producing all environments. Use authored views and restrained detail. |
| [TOEM — developer](https://www.somethingwemade.se/toem/) | Scandinavian-inspired places, calm music, and encouragement to slow down and observe. | Reward noticing a reflection, current, or movement pattern. Its photography loop is already close to Mira and will not be copied. |
| [Lost in Play — developer press kit](https://www.happyjuice.games/press-kit) | Childhood imagination, visual storytelling, magical creatures, and authored puzzles. | Express intent through poses and environmental reactions; Swedish text enriches rather than explains every action. |
| [Xbox XAG 107 — Input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107) | Addresses barriers from repeated presses, sustained holds, combinations, and restricted input options. | Two main action buttons, no mashing, toggle alternatives, and keyboard/tap equivalents for drawing. |
| [Xbox XAG 108 — Difficulty](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/108) | Supports adjustable assistance, saving, and access to the full story across difficulty preferences. | Independently adjustable movement help and puzzle hints. No ending or scene withheld for using help. |
| [Xbox XAG 109 — Objective clarity](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109) | Reviewable objectives, reminders, tutorials, and optional directional help support understanding. | A journal holds one current question and a short recap; hints progress from observation to solution. |
| [Game Accessibility Guidelines — Basic](https://gameaccessibilityguidelines.com/basic/) | Large spaced controls, readable captions, separate audio controls, and redundant sensory cues. | Readable Swedish DOM interface, 48–56 CSS-pixel action targets, captions, and visible equivalents of sound clues. |
| [PixiJS — Application](https://pixijs.com/8.x/guides/components/application) and [performance](https://pixijs.com/8.x/guides/concepts/performance-tips) | Supports WebGL rendering; sprite sheets aid batching while filters, masks, and texture usage need care. | One lazy-loaded renderer, atlas-based character art, limited effects, and explicit asset disposal. Pin the exact tested release during implementation. |
| [Phaser — Physics](https://docs.phaser.io/phaser/concepts/physics) | Arcade provides simple rectangle/circle collisions; Matter provides more general rigid-body behavior. | Neither is required by this initial movement/puzzle scope. Reconsider only if the prototype demonstrates a concrete need. |
| [Fix Your Timestep! — Glenn Fiedler](https://gafferongames.com/post/fix_your_timestep/) | Separating fixed simulation steps from render timing avoids frame-dependent behavior; catch-up needs limits and rendering benefits from interpolation. | Fixed simulation, bounded catch-up, render interpolation, and reproducible replay tests. |
| [MDN — Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) | Repeated drawing can be cached; resolution, layering, and expensive effects matter. | Canvas remains a valid simpler option, but existing tiny pixel renderers are not proof for this game's full-resolution effect budget. |
| [MDN — Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) | Audio needs appropriate user activation and explicit user controls. | Start/resume sound on the game's visible Börja/Fortsätt button; do not assume completion of an asynchronous loader retains activation. |

## 4. The game in one paragraph

**Sköldhästen och havet mellan sidorna** is a side-view, painterly adventure with layered depth. Alva finishes her drawing. Its orange mane moves, seawater spills out of the paper, and the player becomes Sköldhästen. Across a windswept meadow, a luminous kelp forest, and a half-submerged paper observatory, the creature investigates why the tide has stopped and parts of the coast are becoming unfinished outlines. Galloping, settling quietly, carrying reflected light, and completing a few meaningful pencil lines reconnect land and sea.

Use continuous movement within a scene and short, concealed transitions between connected areas. This is a small authored world with revisitable routes, not a seamless open-world production. The camera follows automatically; players never need to rotate it.

### Three design pillars

1. **This is Alva's creature.** Its appearance, two habitats, and funny unanswered question drive the whole game.
2. **Movement makes discovery enjoyable.** Galloping is exuberant; swimming feels buoyant; stopping reveals things that speed conceals.
3. **The drawing remains alive.** Pencil marks, paper edges, and watercolor are physical parts of the fiction, not just menu decoration.

## 5. Proposed story — in Swedish

### Prolog: Ett streck till

Alva sitter vid sitt ritbord. Utanför fönstret skymmer det. På papperet står Sköldhästen precis som hon har ritat den: med grön sköld, orange man och havet bakom sig.

Spelaren hjälper henne med tre enkla streck. Inget streck kan bli fel. När det sista når vattnet hörs ett mycket litet plask.

Sköldhästen blinkar.

"Du", säger den och tittar ner på sina hovar. "Ritade du havet så här tyst?"

Alva skakar på huvudet. En droppe rullar uppåt över papperet. Sedan syns ett hovspår på bordet.

"Då får vi undersöka det."

Kameran glider in genom teckningen. Nu styr spelaren Sköldhästen. Alva finns kvar på andra sidan papperet, genom små anteckningar och pennstreck.

### Mysteriet

I världen mellan sidorna brukar tidvattnet färdas från ängen genom kelpskogen och tillbaka. Det håller teckningens vägar samman. Men nu når tidvattnet inte längre stranden. Små strömmar rör sig fortfarande under ytan, fast de går runt i samma slinga. En del stigar slutar mitt i ett streck. Långt ute i viken blinkar en fyr bara i spegelbilden.

Sköldhästen hittar tre märkligheter: kelp som böjer sig mot strömmen, vågmärken högt ovanför vattnet och en karta där någon har vikt undan vägen mellan land och hav. Ledtrådarna pekar mot Pappersfyren.

På stranden möter den en mycket noggrann liten krabba.

"Häst eller sköldpadda?" frågar krabban och håller fram två skyltar.

"Ja", säger Sköldhästen.

Krabban behöver fundera en stund.

### Upptäckten

I Pappersfyren bor Kartväktaren, en gammal figur av hopvikt papper. När han såg den ofärdiga strandlinjen trodde han att teckningen höll på att gå sönder. Han vek undan havets väg för att skydda den. Därför har tidvattnet stannat.

Men den öppna linjen var ingen skada. Alva hade lämnat plats för en fortsättning.

Sköldhästen har redan lärt sig något som kartan inte visar: samma varelse kan höra hemma både på ängen och i djupet. Den behöver inte välja bort halva sig själv för att passa på en sida.

### Final: Där vägen fortsätter

Spelaren använder allt den har lärt sig. En galopp över en gammal trampbrygga driver ett synligt hjul som öppnar fyrens månljuslucka. Hjulet stannar i öppet läge, så ingen behöver skynda sig. En lugn färd genom kelpen leder till fyrens nedre fönster. Skölden bär månens spegling till den vikta kartan och visar samma märke som spelaren tidigare har hittat både vid strandens pool och under vattnet.

De två märkena är varsin halva av samma väg. Till sist hjälper Alvas penna till att dra förbindelsen mellan dem. Nu kan Kartväktaren se precis var sidan går att öppna utan att rivas.

Kartväktaren vecklar ut sidan. Havet får röra sig igen.

Finalen spelas: Sköldhästen följer den första mjuka tidvattenvågen genom miljöerna som nu svarar på varandra. Gräset böjer sig, kelpen lyser och fyren tänds både ovanför och under ytan.

Hemma vid ritbordet är teckningen nästan stilla. Bredvid den finns ett vått hovspår och en ny anteckning:

"Världens snabbaste sköldpadda eller världens långsammaste häst? Forskningen fortsätter."

Sköldhästen blinkar en gång till. Spelaren kan återvända till världen och upptäcka det som finns kvar.

### Narrative constraints

Keep the central creature the playable protagonist after the short opening; Alva is its creator and friend. Give the caretaker clues before the reveal so the resolution follows from investigation. The crab provides brief humor, not a chain of fetch quests. Wonder comes from understandable strange behavior, not exposition or jump scares. Use short readable Swedish lines; dialogue waits for the player and cutscenes can be paused or replayed.

## 6. What the player actually does

| Verb | Interaction | Meaningful outcome |
| --- | --- | --- |
| **Följ flödet** | Move freely left/right on land and in two axes underwater. Build into a gallop, wade, paddle, dive, float, and ride visible currents. | Reach places by understanding terrain and flow. A previously awkward route becomes joyful after a shortcut opens. |
| **Lyssna med skölden** | Toggle a quiet settled stance. The horse slows, plants its hooves or steadies itself in kelp, and its shell responds to nearby patterns. | Disturbed water settles into a useful reflection; kelp parts; marks become readable. Feedback begins immediately and the reveal takes roughly 1–2 seconds, not a long wait. |
| **Bind ihop** | At an authored spot, carry/align a reflection or connect a few generous drawing anchors through the context action. | Complete a moonlit crossing, reopen a current loop, or reveal a window in folded paper. These are deliberate changes to a place, not unlimited spell casting. |

Quiet stance is not complete immunity or global anchoring: in open water it damps movement but still allows drift. Authored kelp/shelter zones provide a stable place to settle. Currents are bounded and every required current has a safe exit.

Drawing pauses traversal. Touch users can trace loosely or tap anchors; keyboard users cycle and confirm the same anchors. The resulting world object always comes from a tested authored template. There is no handwriting classifier, beauty score, arbitrary generated collision geometry, or requirement to draw while simultaneously steering.

**A contrasting physical puzzle — Flytbryggan:** standing on the shore end of a buoyant platform lowers a small paper sluice until a visible catch engages. Swim under the platform to release the catch; with the horse's weight removed, the platform rises and lifts the gate, reopening a current. The linkage, weight change, and result are visible together. The mechanism is bounded, reversible, and has a local reset. This supplies a tactile cause-and-effect puzzle beyond repeated light alignment.

**Play for its own sake:** after emerging from water, the context button can offer **Skaka**. Droplets strike a row of musical shells; near the crab, they spin its two classification signs. This uses the planned shake animation and is immediately repeatable, never required for progress. Safe sand slopes and harmless current loops also provide places to enjoy movement without solving anything.

**Core loop:** notice an intriguing change → explore its surroundings → experiment with motion/stillness/light → understand the relationship → change the environment → uncover a story clue and a new route. Optional secrets deepen the journal; collecting all of them never blocks the ending.

### World and puzzle plan

Target a first complete release of **60–90 minutes**, in short resumable sessions. This is a content target to validate, not a promised playtime. Budget three regions, about twelve small connected scene spaces, eight substantial puzzles, and several optional observations.

| Chapter | Place and mood | Play and story progression |
| --- | --- | --- |
| Ett streck till | Warm lamplight, pencil sound, paper grain | Forgiving drawing prologue. The first blink establishes that this really is Alva's drawing. |
| Viskande stranden | Warm copper grass against turquoise water | Learn movement and settling. Follow hoofprints into a still pool; shell-reflected light reveals the first incomplete crossing. Two small connected puzzles. |
| Lyktkelpens skog | Deep teal, living green, floating amber specks | Swim through currents, settle among kelp, and reconnect a water loop. Find the fold mark that explains the interrupted tide. Two puzzles. |
| Spegelviken | Violet dusk, pale stone, enormous reflections | Revisit shore and submerged routes from a new angle. Align reflections and operate a buoyant platform/current lift; discover the way into the paper observatory. Two puzzles. |
| Pappersfyren | Moonlit cream paper and ink-blue water | Meet the caretaker, understand the map fold, and combine the learned verbs to reconnect the coast. Two linked finale puzzles. |
| Havet hittar hem | Earlier locations transformed by restored flow | Short playable celebration, desk epilogue, then optional free exploration. |

The lighthouse is a finale within the bay region, not a fourth full biome. The hub routes reopen visibly; revisits reveal consequences instead of replaying the same challenge.

### First 8–10 minutes: the production slice

| Time target | Experience | What this validates |
| --- | --- | --- |
| 0:00–1:15 | Draw three forgiving strokes; mane stirs; Sköldhästen speaks and steps into the picture. | Likeness, emotional hook, Swedish presentation, immediate response. |
| 1:15–3:00 | Walk and gallop across a short shore, disturb seed heads, wade into a pool. | Weight, gait, camera, thumb reach, world scale. |
| 3:00–5:30 | Once the pool settles, a tiny fish passes through the reflected arch, while the corresponding route above remains an unfinished line. Investigate the mismatch, use the shell, and complete the crossing. | A concrete prediction to test, followed by an observe/experiment/understand/change puzzle with useful hints. |
| 5:30–8:00 | Enter the opened channel, swim into a luminous kelp space, settle in shelter, notice a paper-fold mark. | Shore transition, buoyancy, actual representative visual load, mystery payoff. |
| 8:00–10:00 | Reach a checkpoint; return to menu and resume; explore a small optional alcove. | Save/lifecycle behavior and whether the player wants to continue. |

Use final-quality hero art, representative sound, and a genuinely finished puzzle in this slice. An empty grey prototype cannot validate the intended visual budget or atmosphere.

## 7. Visual and audio direction

**Art direction:** a living illustrated book. Colored-pencil edges, watercolor washes, layered foreground silhouettes, softly textured paper, and carefully placed luminous details. The orange mane is the warm focal point against green/blue environments. Avoid a pixel-art presentation, Mario imagery, and Mira's floating-island structure.

“2.5D” means flat painted layers and characters with parallax, light, and depth cues. Gameplay collision stays two-dimensional. A side-view camera protects the recognizable view in the photograph and removes camera-management demands on phones.

### Spend visual effort in this order

1. Faithful, expressive hero: face, shell, silhouette, gait, mane and tail.
2. Strong scene composition: landmarks, readable paths, color and depth.
3. Water transition and contact: hoof placement, ripples, buoyancy, wet surface response.
4. Light and environmental reaction: focused shell glows, kelp movement, reflection reveals.
5. Sparse atmospheric particles and optional decorative effects.

Character animation should cover idle/breathing, blink/ear attention, walk, trot/gallop, brake/settle, wade, swim/glide, dive/rise, emerge/shake, shell response, and story expressions. Use a small layered 2D rig with authored poses and state-driven secondary motion. Hooves need convincing contact and shell mass; the shell must not stretch like rubber. No full rigid-body simulation for every hair or leg.

Rig and animation sheet QA must include both directions, waterline crossing, silhouette against dark kelp, and portrait presentation. Maintain a minimum readable screen size for the hero; adapt framing rather than shrinking it to show an entire desktop scene.

**Sound:** one original musical theme with paper/desk, meadow, underwater, and finale arrangements. Use composed or properly licensed recorded stems for warmth, with procedural accents only where useful. Crossfade by location and discovery; allow silence before important reveals. Underwater filtering changes tone while captions/visual cues retain all puzzle information. Avoid constant sparkles and full-intensity music.

Swedish dialogue text is mandatory. Budget recorded Swedish narration as a separate asset-production task; it is desirable, not an assumed available resource. System speech synthesis can be an optional assist but cannot be the promised dramatic narrator. Never require microphone input or cloud speech/AI during play.

## 8. Phone, desktop, and accessibility

| Action | Phone/tablet | Desktop |
| --- | --- | --- |
| Move | Left thumb direction pad/stick; horizontal on land, two-axis in water | Arrows/WASD; pointer-operated on-screen controls also available |
| Quiet shell stance | Large **Lyssna** toggle | Space, rebindable |
| Context action | Large labeled **Gör** button, renamed for the current action | E/Enter; clickable equivalent |
| Drawing | Loose trace or tap-to-connect | Mouse trace or keyboard anchor selection |
| Journal/pause | Persistent, spaced buttons | J and Escape plus clickable buttons |

Acceleration supplies galloping without a separate sprint button. Tiny terrain lips are stepped over automatically; precision jumping is not a core mechanic. Inputs are action-based and rebindable. Add optional D-pad and movement assistance rather than making analog precision mandatory.

Landscape gives the broadest composition; portrait must remain fully completable. Frame critical clues and drawing anchors inside the narrow safe play area, use vertical scene staging where helpful, and never put a mandatory clue permanently outside portrait view. Reflow DOM controls around notches and browser bars. Pause safely during orientation changes without rebuilding the world state.

All menus, labels, errors, hints, journal entries, settings, and credits use Swedish. Proposed labels include **Börja**, **Fortsätt**, **Vad vet vi?**, **Visa en ledtråd**, **Ta mig till senaste trygga platsen**, and **Tillbaka till spelen**.

Use generous 48–56 CSS-pixel touch targets, visible focus, readable non-pixel text, and adjustable text size. Keep prose away from busy images. Captions must identify important sounds. Light puzzles use shape/motion as well as hue. Respect reduced motion; offer stronger reduction of distortion, parallax, and camera sway. Expose music, effects, and narration separately.

There are no lives, drowning countdowns, or lost progress. A bad route returns the creature to a nearby safe position. Hints are optional and staged: first draw attention to a detail, then explain the relationship, then show the exact action. **Utforska i lugn och ro** and **Lite mer klurigt** can change help prominence without changing the ending. Difficulty and readability are validated through play, not assumed from age.

## 9. Technical recommendation

Use **one independently lazy-loaded PixiJS WebGL renderer**, authored 2D assets, and a small custom simulation. Pin and self-host a verified stable PixiJS v8 release with its license; exact patch selection belongs to the implementation spike. Use WebGL as the initial tested path. WebGPU is not a release dependency.

| Option | Assessment |
| --- | --- |
| Canvas 2D | Viable for simpler painted scenes and fits existing code. Full-resolution layering and underwater effects require proof; Mira's deliberately tiny pixel buffer is a different workload. |
| PixiJS + custom simulation | Recommended for sprite batching, layered hero animation, controlled lighting/refraction, and small independent integration. Still needs real-device validation. |
| Phaser + physics engine | Capable, but brings systems not yet needed. Adopt only if measured prototype requirements outweigh the smaller custom controller. |
| Shared Three.js / full 3D | Adds model/rig/camera/world complexity and ties the game to an old host renderer. It offers no necessary improvement to fidelity to this side-view drawing. |

Do not build two renderers. Lower optional effect density/resolution in the same renderer when needed. If WebGL is unavailable or restoration fails, show a clear Swedish retry/back action. Do not promise compatibility before testing the selected devices.

### Physics and game-feel contract

- Fixed simulation at 60 Hz initially, independent render interpolation, maximum five catch-up steps per frame. Reset the accumulator on resume. Profile before increasing the simulation rate.
- World-space geometry independent of viewport size. Seed gameplay randomness, if any; decorative randomness cannot change puzzle outcomes. Fixed steps alone do not guarantee bit-identical results across engines.
- A compact player collider, authored terrain polylines, stable ground snap/slope limits, and swept collision at gallop speed. Do not physically simulate the drawn anatomy.
- Responsive acceleration/deceleration and slope-aware poses; tune controls through short feel tests. Decorative mane/tail springs never alter collision bounds.
- Gradual immersion changes gravity, buoyancy, and drag. Hysteresis prevents repeated land/water state flipping. Currents use bounded authored vector fields, with readable visual direction and escapable routes.
- Swim input can overcome required-route currents. Shore exit geometry is authored and tested in both directions. Settled stance in shelter damps motion; open-water stillness does not create an unexplained immovable anchor.
- Limited puzzle props only: one buoyant platform/current lift and a small number of scripted mechanisms. No general-purpose fluid simulation, deformable terrain, or large rigid-body sandbox in version one.
- Puzzle state is explicit and reversible before commitment. A safe-reset action restores a valid local state without undoing discoveries. Drawing produces known collision templates.

### Proposed source layout

```text
index.html                         fourth button, small lazy loader, host adapter
skoldhast/
  src/
    entry.mjs                      public createGame() and scene lifecycle
    input.mjs                      normalized keyboard/pointer/touch actions
    simulation.mjs                 pure movement/collision/water logic
    puzzles.mjs                    puzzle state transitions and safe reset
    renderer.mjs                   Pixi layers, quality settings, asset disposal
    character.mjs                  rig and animation driven by simulation
    camera.mjs                     framing, portrait/landscape adaptation
    audio.mjs                      owned audio buses, stems, captions
    save.mjs                       versioned validated checkpoint schema
    content/sv.mjs                 all player-facing Swedish strings
    content/world.mjs              scenes, colliders, water, currents, landmarks
    content/story.mjs              dialogue, clues, chapter progression
  skoldhast.css                     scoped accessible DOM interface
  assets/                          hero atlas, painted layers, audio, manifests
  dist/                            reproducible browser bundle and vendor chunk
scripts/
  build-skoldhast.mjs               scoped build; does not rebuild other games
  build-skoldhast-assets.mjs        atlas packing, manifest/size validation
tests/
  skoldhast-simulation.test.mjs     node:test, pure simulation and puzzles
  skoldhast-lifecycle.spec.mjs      browser lifecycle and four-game regression
docs/
  skoldhast-game-plan.md            this plan
  skoldhast-art-bible.md            later approved sheets, palettes, animation rules
  skoldhast-validation.md           later actual results and captured evidence
```

A scoped build can bundle the pinned npm renderer and the new ES modules, keeping the current static publishing model. Commit the reproducible `skoldhast/dist/` output and referenced assets for the existing static publishing path unless an actual hosting build step is verified or configured. Add a documented reproducible build command and retain license notices. Assets use URLs relative to the game entry/manifest, not root-absolute paths, so deployment under `/alva-10-birthday/` works. Do not migrate the other games or add a whole-site framework.

### Integration with the fourth button

The current buttons are in `index.html:2863–2866`; mobile selectors are around `1802–1812`. Add `play-skoldhast-btn` beside them with a short label **Sköldhästens äventyr**, and show the full title inside the game. Update the README's game list when an actual playable game is added.

Mira's loader at `index.html:5492–5527` demonstrates the intended on-demand behavior. The new loader imports only on click, shares a single pending load, shows Swedish progress, handles retry visibly, and cancels stale completion if the player leaves. No engine, scene art, or sound should be fetched merely by opening the birthday page. Any launcher illustration should be tiny and accounted for separately.

Provide a narrow host adapter created where existing page state is accessible. It snapshots page display, scroll, focus, background-music state, and ownership of the scene pause. Only one fullscreen game may own the host at a time. Acquire a shared launch guard synchronously, before asynchronous loading, covering pending and active launches across all four buttons. Guard every completion and release ownership on failure/cancel/exit. The existing Mira loader can otherwise finish after another game has opened; checking only the new game's state cannot prevent that race. Keep changes to existing games limited to this launch/ownership integration.

Proposed public API:

```js
const game = createGame({ host, assetBase });
await game.open();
game.pause({ reason: 'visibility' });
game.resume();
game.close();   // idempotent, saves, cancels owned work, restores host
game.dispose(); // final audio/GPU/listener/DOM cleanup
```

Reuse the host's `setSceneRenderPaused` hook. It skips background update/draw but still schedules a lightweight RAF callback (`index.html:4796–4805`); do not misreport this as stopping the page loop. Do not introduce another active render loop alongside Pixi's ticker: choose one owned scheduler and control it explicitly.

Bind session listeners with an AbortController. Capture pointer IDs and release all movement/actions on pointer cancellation, lost capture, blur, pause, or close. Keep world state intact on resize. Trap menu focus inside the overlay and restore it to the launch button on exit.

Use the visible **Börja/Fortsätt** gesture to create/resume game audio after loading. The game owns its audio resources and pauses the page's music through the adapter. On close it stops only its voices and resumes page music only if it was previously playing. Never close another game's shared AudioContext.

Closing while loading must invalidate pending completions before they can mount a scene. Close/dispose cancels the game's ticker, timers, listeners, speech, and voices, clears input, writes a checkpoint, releases scene textures, and restores the host exactly once. Decide explicitly which small immutable assets may remain cached; lazy loading alone does not solve retained GPU memory.

### Save model

Use a separate `skoldhast.v1` key with `schemaVersion`, `contentVersion`, `sceneId`, safe checkpoint ID, solved puzzle flags, known clues, chapter, settings, and ending state. Persist stable authored IDs, not raw Pixi objects or an arbitrary unsafe coordinate. Validate all loaded fields and provide migrations when content changes.

Write at completed interactions/checkpoints, exit, and pagehide, with best-effort handling of storage failure. Reload resumes at a safe anchor. Corrupt data offers a recoverable fresh start and a Swedish explanation; blocked storage allows play with a visible indication that progress cannot be retained. No server account or online service is required by the game design. Offline install/cache support is a separate feature, not implied by a static site.

## 10. Initial performance and quality budgets

These are proposed gates to measure on the representative slice. Revise them explicitly when evidence warrants; never claim them from the choice of engine.

| Area | Initial target / verification |
| --- | --- |
| Main page overhead | No new game JS/art/audio requests before launch; at most a small loader/button/style addition. Compare network traces against the audited baseline. |
| Loading | Immediate feedback within 100 ms. First-playable download target ≤4 MB compressed, including engine, opening art and essential audio. Target first control within 5 seconds on a defined 10 Mbps/100 ms cold-cache profile; record decode/startup separately. |
| Rendering | Target 60 FPS on physical Samsung S22 Chrome and a representative desktop, with p95 frame interval ≤20 ms over a representative ten-minute session outside explicit loading transitions. Measure thermal behavior, not just a short desktop capture. |
| Weaker device | Select an actual older iPhone/Safari test device. Conservative effects target ≥30 FPS; record model/browser. This is not a blanket mobile compatibility claim. |
| Backing buffer | Start with a mobile ceiling around 1.5 million pixels plus a DPR cap; retain sharp DOM text. Tune using side-by-side captures. |
| Effects | At most one full-scene effect pass; bounded low-resolution water/light effects, cached/baked glows, limited transparent overdraw. Reduce decorative load before compromising hero readability or puzzle cues. |
| Textures | Initial combined resident allocation target ≤96 MiB, including current/next scene textures, shared atlases, render targets and mipmaps. Measure transition peaks as well as steady play; stagger decode/upload and release obsolete resources. Measure browser behavior separately because compressed download size is not GPU memory. |
| CPU | Aim for p95 simulation/input work ≤4 ms. Avoid per-frame allocations, scene-wide searches, and text rebuilding where profiling shows a cost. |
| Lifecycle | Ten repeated open/play/close cycles with no steadily growing retained resources, no owned audio after close, no new game callbacks after close, and correct page/focus restoration. |
| Orientation/input | All required puzzles completable in portrait and landscape on touch and keyboard; repeated rotate/blur/cancel cannot leave movement held. |
| Persistence | Reload after every checkpoint restores a valid state; interrupted load, missing assets, blocked storage, and invalid saves have readable recovery paths. |

Full-resolution character art and the core scene palette stay consistent across quality levels. Optional distortion, reflection update rate, distant animation, and particle density can vary. Reduced motion is a player preference, not merely a performance preset.

## 11. Delivery sequence and review gates

| Stage | Deliverable | Exit gate |
| --- | --- | --- |
| 0. Reference and art proof | Creature sheet, approved palette, two key compositions, proposed control framing. | Side-by-side likeness review at phone size; shell, muzzle, mane, tail and legs remain recognizable. |
| 1. Movement and integration proof | Fourth-button development entry, lifecycle adapter, one shore, basic land/water controller, save skeleton. | Responsive locomotion, safe transitions, no host/music/input leak, and measured baseline on target devices. |
| 2. Finished opening slice | Drawing prologue, final hero animation, representative shore/kelp artwork, one complete puzzle, audio and a checkpoint. | Alva can start, move, discover the clue and solve the first puzzle without external instruction; she recognizes the creature and wants to continue. Performance measured with actual art. |
| 3. Connected adventure | Three regions, eight substantive puzzles, clues, caretaker reveal, finale and returning routes. | Every required state is reachable/recoverable; hints and recap support resuming after a break; ending completes without optional collectibles. |
| 4. Polish and release | Swedish edit, animation/sound polish, accessibility settings, asset licenses, browser/device and regression evidence. | All four games launch/play/close correctly; performance and persistence gates documented; no blocker remains. |

Do not commission every scene or expand to a large world before Stage 2. The main production costs will be faithful character animation, authored environmental art, puzzle iteration, and sound—not just writing the engine code. Exact calendar effort should be estimated after the slice establishes the asset and iteration cost.

### Meaningful tests to add during implementation

- Pure simulation replay under 30/60/120 Hz render schedules: equivalent authoritative positions/puzzle states within stated numerical tolerances.
- Ground/slope/gallop collision, thin obstacles, repeated shore entry/exit, immersion hysteresis, current escape, and safe reset.
- Puzzle transitions under repeated actions, interrupted dialogue, revisits, reloads, and all hint/assist settings; no softlock or duplicate reward.
- Loader cancellation/retry, double launch, close during asset fetch, and WebGL loss/recovery. Explicitly test Mira loading followed by Sköldhäst launch, the reverse order, and attempts to launch either older game while a download is pending.
- Pointer capture/cancel, multiple touches, keyboard rebinding, blur/hidden tab, browser back behavior, and orientation changes.
- Save schema validation/migration; blocked and corrupt localStorage; safe checkpoint restoration.
- Browser checks of the birthday reveal and all four games, including host music/scroll/focus restoration and absence of Sköldhäst downloads before launch.
- Visual evidence of key poses, waterline and interface at narrow portrait, landscape phone, and desktop sizes; reduced motion and text enlargement.

Pair automated checks with observed play: where does Alva hesitate, what makes her smile, does she understand why a puzzle worked, and does swimming feel enjoyable without an objective? These observations decide whether to simplify controls, shorten dialogue, or redesign a clue. They are stronger evidence of fun than a feature count.

## 12. Scope decisions and next action

Version one has no combat system, multiplayer, infinite world generation, equipment economy, mandatory racing, or live AI-generated story. It uses a few authored drawing interactions and a small connected world. This keeps the effort concentrated on the creature, atmosphere, movement, and complete story the user asked for.

The next implementation task is **Stage 0 followed by the shore-to-kelp slice**, based on the latest `main` at implementation time. Review changes since the audited commit before editing host integration. The slice must make Alva's original creature recognizable, feel good to move, contain one satisfying mystery, and run well on a real phone. That is the evidence needed before expanding the full adventure.
