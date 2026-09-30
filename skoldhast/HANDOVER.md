# Sköldhästen – handover

## Latest: one beautiful map, the same everywhere (30 September)

Branch `claude/skoldhast-intro-lighthouse` (on top of the lighthouse work). Pappa asked for the map in the game
and in the journal to look the same, and better: every piece and the whole map.

- **One drawing:** `map-page` (new art module `scripts/skoldhast-art/map.mjs`, bundle `map`, 1920×1260, loaded
  in the background so the first download is unchanged). Coloured pencil in the game's style: the steppe with
  tufts and pasque flowers, Klippudden and the cleft of Stora språnget, the sand beach with the pool, the dune,
  shells, hoofprints and Vattenporten, a sea deepening into Kelpskogen, Mörka valvet and Kelphjärtat,
  Spegelviken with Pappersfyren lit only in its reflection, the land and sea ways, the torn mark, a compass
  rose, and Kartväktaren's own touches: a ruled double border with a scale, the fold (Vecket) as a ruled line
  with the page beyond it shaded, and "/K".
- **One layout:** `skoldhast/src/map-layout.mjs` holds the torn pieces (moved from `mapbook.mjs`, still exported
  there), every place's position, the ways and the place names (with the flags that make each known).
- **Everywhere the same:** the journal's clue page (`mapbook.mjs`, an SVG `<image>` clipped per piece, names as
  SVG text), a thumbnail of it on "Vad vet vi?" (`createMapThumb`, replacing the old list of places), the pieces
  joining in the game (`map-assemble.mjs`, a sprite masked per piece, names as Pixi text that grow a little on
  a small screen), Klo's fold demo (`fold-demo.mjs`: the card is the real corner piece, and the dune he folds is
  the dune on its beach) and the corner in Klo's claw (`npcs.mjs` `heldMapCorner`, redrawn to match). Until the
  image has loaded, plain washes in the same places stand in.
- Tests: `tests/skoldhast-map-layout.test.mjs` (names never across a tear, places on the right pieces, the
  drawing at the layout size). The fold demo hides its flat dune overlay: an empty Graphics still counts in
  the bounds and pushed the demo's frame off screen.

## Latest: the real Pappersfyren in the prologue (30 September)

Branch `claude/skoldhast-intro-lighthouse`. Pappa asked for the game's own lighthouse in the intro instead of the
sketch.

- Her margin now holds the game's `lighthouse` drawing (props-bay) at about 200 paper units, on a bigger islet,
  with its shutters open and the lamp alight (the page as it should be; after the fold only the reflection
  shines, which is why Klo later says "Fyren lyser – men bara i spegelbilden"). It stands wholly in the corner
  that folds away. Until the bay art has loaded, the old folded-paper sketch stands in (`opening-canvas.mjs`).
- Kartväktaren now stands on its **gallery** (as in the game), in front of the left window; the ruler and the map
  scraps start from his hand there (`landmarks.hand` follows where he stands).
- **The view leans towards the lighthouse** (`towerFrame` in `prologue.mjs`) while the ruler takes its measure
  and he shrinks back, holds while his ruler flies to the fold, and eases back to the whole sheet while the
  corner turns under. A phone sees him clearly. Reduced motion keeps the wide view.
- The memory card in Kapitel 3 shows the same lighthouse with him on its gallery (`kv-memory.mjs`, two copies:
  the page and the folding corner).

## Why Kartväktaren folded the page (30 September)

Branch `claude/skoldhast-story-audit`. Pappa asked for a deeper story audit: when we meet Kartväktaren we must
understand, clearly, why he folded the page, and the whole game must point at the answer. The audit and the
answer are in `docs/skoldhast/story-kartvaktaren.md`; plan §3.2 and §3.4 follow it.

- **The answer:** he is made of paper and believes wet paper tears. Alva's shore ran out onto the white paper,
  the sea followed it towards his tower and her wave was about to splash there, so he folded the sea away in the
  middle of the splash. **The twist:** the fold tore his own map; its pieces are the ones the player collects.
- **Planted on the way:**
  - *Prologue:* a thin sheet of her sea runs along her new line towards the tower (`paintSeaFollows`), and three
    scraps of his map fly from the tower as it folds, one landing beside Klo (`launchScraps`). Klo's answers
    both name the ruler; "Vem gjorde det?" also names the tower and the scraps.
  - *Kapitel 1:* the map corner is "en av papperslapparna"; after the hook Klo notes the figure hurried away from
    the water.
  - *Kapitel 2:* note 2 lies sealed in a bottle (`note-bottle`, props-sea, `spots.note2`; the camera looks at it)
    and Klo concludes K fears water. When the pieces join, a ruler-straight crease runs along the tear
    (`map-assemble.mjs`) and Klo says the map tore where the page was folded. He slams the shutter: "Vad är han
    så rädd för?"
- **The meeting:** his first words when the lamp lights ("Mina luckor! …"), framed beside the window. Talk 1
  plays over **his memory**, a sketch card with one picture per line (`src/kv-memory.mjs`, fx `kvMemory`):
  LAND | HAV ruled on her page; her line and the sea spreading to his tower while the wave curls; his ruler, the
  fold (the prologue's own crease geometry) and the frozen splash, with one scrap landing on her sand. The words
  never depend on the card: without it the three lines are said as one dialogue.
- **The ending on two proofs:** after P8 he sees the line hold in the water, then Klo gives back his map (the
  same assembly, captioned "Kartväktarens karta", no route). Then the apology and the unfold. In the finale vista
  he stands on his open gallery (the figure actor), and at the table the caption reads "Teckningen är lite blöt.
  Och alldeles hel."
- **We see him early, from far off** (Pappa's follow-up): in the prologue Kartväktaren stands on the islet by
  his tower as the game's own paper rig, small and faded by distance (`opening-canvas.mjs`, `setKeeper`). He
  measures her line (`point`), shrinks back as the sea comes (`worry`), and his ruler leaves his hand for the
  fold (`fold`); the ruler and the scraps start from his hand (`landmarks.hand`). Until the bay art has loaded a
  pencil stand-in takes his place. The memory card shows him on the same islet in the same poses (two rigs: one
  on the page, one on the corner that folds). Glimpses grow closer: prologue, K1 hook, K2 shutter, K3 meeting.
- The journal gains the clues `torn_map`, `kv_why` and `kv_map`; reports 1 and 2 ask who /K is and why he did it;
  the talk goal is "Fråga Kartväktaren varför han vek undan havet."
- Tests: `tests/skoldhast-kartvaktaren.test.mjs` (card stages, the fold geometry, the order of the resolution).
  Pure suite **168/168**; the finale browser check passes with the new ending.
- Three browser checks were fixed (all three failed on `main` too, or raced): `skoldhast-fold-demo` found the
  overlay by index (a `bgFront` layer moved it; it now finds the map by label); `skoldhast-mapbook` measured the
  journal while its entry animation was still tilting it (software GL on Windows can hold the first frame for
  over a second; it now waits for the animation to finish); `skoldhast-mirror-vista` pressed Space inside the
  dialogue's 350 ms double-tap guard (it now presses again until the dialogue closes, as a player would).

## Mörka valvet and the lighthouse stair (30 September)

Branch `claude/skoldhast-vault-stairs`, on `main` at `252423f`. Pappa asked whether the stairs should
reach from the ground to the top of the lighthouse, and for a better-looking and better-working dark vault.

- **The stair** now runs the whole height, from the pier's end to the lamp gallery (`stair` art redrawn,
  1336 wu, landings at both ends, its post standing in the bay). Its gate at the foot is bolted from the
  stair side: the way up the first time is still the pipe (P7), and walking down (`Gå ner`) opens it
  (`stair_open`), after which `Gå upp` at the pier's end goes up. Strömröret is drawn above the water too,
  a tube up the tower's side into the gallery basin, so riding up it reads.
- **Mörka valvet** is a real rock arch across the trench floor (`slabs` in `world.mjs`, new in `sim.mjs`
  `insideSolid`): a solid roof you swim under or over, a far wall that fades out at the mouths, and a
  darkness in its own shape instead of a rectangle. The dark lifts where the lyktfiskar are; once they
  light it they hang under the roof as a row of lamps with warm light on the wall. The back way in is
  refused too while dark (`vault-dark-e`).
- **The lyktfiskar** are gentler: when the sköldhäst comes out of hiding they stop and wait where they
  are (`wait`), come back when it hides near them again, and swim home (not jump) only if it goes far
  or leaves them 12 s. Klo says so once (`lyktWait`). They swim smoothly between places.
- The robot's two routes through the trench now go under the lit roof and over it; two new tests cover
  the waiting school and the roof. Pure suite **163/163**.

## Depth, shorelines and grounding (30 September)

Branch `claude/skoldhast-visual-depth` (from `49ade5a`), merged to `main` after the opening-notes merge. Pappa asked for the
recommended visual improvements, in order. Details, causes and before/after pairs:
[`docs/skoldhast/visual-depth-review.md`](../docs/skoldhast/visual-depth-review.md).

- **Layered backdrops.** Sky, then layers in front of the sun, clouds and gulls (`bgFront`): three
  steppe hill bands standing on the ground line at their own depth; the bay's cliffs and water in
  front of its sky, and its depths hung from the real surface (no sky under the pier). Clouds stay
  above the bay's horizon; the backdrop no longer jumps every 40 HL. Contract: `dev/SPEC.md` §3.
- **Shores and structure.** Wet sand and foam where water meets land (not her beach), pier posts
  with ripples, a thinner jetty with its foam behind the deck, far walls in the gully, ditch and
  cleft, a pool reflection that fades into the sand.
- **Ground.** Dry sand and earth have their own strokes; on land the colouring thins into paper
  below the ground (`paperBelow`), with roots, buried stones and shells, and grass lips on cliffs.
- **Grounding.** Spången drawn as a plank walk on posts (collision unchanged), hop logs on humps,
  contact shades, sagging chains.
- **Under water, life, evening.** Depth gradient, shining surface underside, light on the seabed,
  leaning kelp with holdfasts, lyktfisk light pool, far fish; one wind for grass, clouds and foam,
  grass that bends, butterflies; a golden evening bay.
- Her picture (105.8–112 HL, `pictureX` in `world.mjs`) is untouched. After merging onto the
  opening-notes work: first playable **2,569,283 bytes** (evening art is its own background
  bundle), pure suite **161/161**, browser matrix passing (launch needs to run alone: under heavy
  parallel load its 30 s loader wait times out).
- **Known flaky check:** `skoldhast-opening.mjs` "the surviving beach stays in place" samples one
  pixel whose value depends on timing (217,190,147 vs 244,176,101). It failed and passed on both
  clean `main` and this branch with the same two values.
- After changing hill or bay art: `node scripts/build-skoldhast-assets.mjs --only backdrops`
  (about 70 s).
- **Frågor till Pappa:** paper showing at the bottom of the portrait screen: welcome, or keep the
  ground coloured further down? Butterflies by the backsippa: keep?

## The opening begins in Alva's head (30 September)

Branch `claude/skoldhast-her-words`. Pappa: her note should open the game and set the scene, so the
player understands they are inside her thoughts; then, as she imagines it, the horse wakes and the
professor appears. See [`docs/skoldhast/alva-notes-opening.md`](../docs/skoldhast/alva-notes-opening.md).

- The room dims ("Alva tänker på sin sköldhäst …"), her notebook card slides in and her own pencil
  writes her four sentences in her handwriting. Her words turn into pictures as they are written:
  the sköldhäst colours in on a blank page, her world colours in around it, and thought bubbles
  rise (a steppe gallop, hiding in the kelp, turtle-or-horse race, a researcher's lens). Then the
  card slides away and the camera goes into her picture: "Precis som Alva tänker sig den." The
  awakening and Klo follow; her last sentence returns as the caption before Klo's drop.
- Tap/Enter hurries, *Hoppa över*/Esc skips. Reduced motion keeps every beat without movement.
  About 28 s at full pace on a device (40 s in the slow test browser), about 13 s when tapping.
- New `src/opening-notes.mjs`, `tests/skoldhast-opening-notes.test.mjs`,
  `tests/browser/skoldhast-notes.mjs`; the other browser checks skip her note. First playable
  2,794,317 bytes.
- The thought bubbles are small live scenes made from the game's own art (`src/thought-scenes.mjs`):
  the steppe gallop and the kelp forest look as they do in play, Signe races past Klo's signs, and
  a lens follows hoofprints to Klo's eyes. First playable 2,801,158 bytes.
- Frågor till Pappa: is ~28 s of her note the right length before the first drawing?

## Klo's slow-motion awakening (30 September)

Branch `claude/skoldhast-slowmo-drop`, from `main` at `8323bf0`. Pappa asked for a longer, more
dramatic entrance: the water drop from the sköldhäst to the sand should wake Klo, and he should
come up in slow motion.

- **The drop.** The horse shakes; time slows to 15 %. One drop is flung up and back off the
  shell rim, catches the sun (a glint at the top of its flight), and falls, wobbling and
  stretched along its path, with a short pencil trail and its shadow tightening on the sand. The
  camera pushes in and follows it down (`focus` in `prologue.mjs`). Two smaller drops from the
  same shake land short with tiny rings. The big one lands in slow motion: a crown of water, a
  jet that lets go of one bead, and a patch of wet sand that soaks in. Time snaps back.
- **Klo wakes.** A still beat; the sand trembles; the stalks come up with the eyes shut, the eyes
  pop open, blink, look the wrong way, climb the horse. The camera pulls back as he rises, and the
  rise is slowed again (45 %): sand pours off his shell with a soft puff where it lands. Then the
  stare, the whisper and the rest of the scene as before.
- **How.** `openingKloBeats()` in `opening-klo.mjs` gives the first half as authored beats (real
  seconds, entrance progress, world speed); `openingKloAt()` samples it, easing in and out of slow
  motion. The prologue scales its own clock (`worldSpeed`), so the horse, mane, wave spray and
  margin slow together; dialogue and input are never slowed. Part A is 10.35 s (was 4.2 s), or
  4.7 s with reduced motion, which keeps every beat and cue in the same order at normal speed
  and without camera moves. New stage `fall`; cues fire for every stage passed.
- **Visual fixes Claude recommended.** The dunes' dry sand and the pool's wet sand now blend over
  a short stretch instead of a ruler-straight seam down the page (`view.mjs`, any two sandy
  materials that meet on one surface). `mat-glass`, which the engine never draws, moved from the
  first download to the background `sea` bundle: first playable **2,783,057 bytes** (was
  2,815,239).
- **Checks.** Pure suite **158/158** (new: the beat timeline, slow motion off for reduced motion,
  the drop in the air during `fall`, the crown, eyes shut then open, sand pouring). The prologue
  lifecycle check now also closes the game while the drop falls, during the whisper and during
  the leap, and checks that nothing comes back. Browser results are listed at the end of
  [`docs/skoldhast/wave-waterline-review.md`](../docs/skoldhast/wave-waterline-review.md).
- **Alva's own words are in** (branch `claude/skoldhast-her-words`). Pappa allowed them and gave
  the text; `HER_TEXT` in `sv.mjs` holds her four printed sentences exactly, including her
  spelling "stäpperna" and "kelp-skogarna". They appear in the opening caption (her last two
  sentences, shown for up to 10 s while the camera finds Klo's sand; the table caption now wraps),
  the journal page "Fältanteckning av Alva" (all four), the evening note (her question +
  "Forskningen fortsätter.") and the journal's conclusion ("Slutsats: Sköldhästar är fantastiska.
  Forskningen fortsätter.", which was never wired up before). Her hope that "någon forskare"
  will take on the mystery now leads straight into Klo's entrance and his "Förlåt! Forskaren är
  här". The magazine page and its photo are not in the repository.

## Swedish text review and the P2 plank (29 September)

Committed in `c97e3ba` and merged to `main` in `8323bf0`.

- **Text:** 55 fixes in `src/content/sv.mjs` for grammar, idiom and facts after a
  six-lens review with three judges per change. Examples: `uppför` (not `upp för`), `Alla tre strecken`,
  `skriva in dig`, `som har bråttom`, `på himlen`. Also factual fixes: chain 3 runs to the gallery rope;
  the missing half of the mark lies on Klippudden; the P1 bridge is called Streckbron/bron, so `valvet`
  now means only Vattenporten and Mörka valvet.
- **The plank by the pool:** no crack is drawn, so the lines say `plankan vid pölen` instead of
  `plankan över sprickan`. The reflection's solid plank was drawn outside the pool's mask and never
  showed; it now sits at the east bank (`view.mjs` `buildReflection`). Once inked, the dashed line
  becomes a real wooden plank (`solid: 'plank-solid'` on `p2-plank` in `world.mjs`; visual only).
- **Pappa's decisions:** the stone goes `mitt framför valvet`; Stäppen is capitalised as a place name,
  including the scene title `Stranden och Stäppen` (the notebook browser test follows it); the field
  note keeps generic lowercase `stäppen`/`kelpskogen`; the goal line says `sköldpaddan Signe`; the pencil counter keeps
  `3 / 5`.
- **Checks:** pure suite 145/145; cloud-colour, guide and notebook browser checks pass.

## The tail: lying hidden, long falls, fast screens (29 September)

Pappa: the tail felt glitchy when the sköldhäst lay down to hide and after long falls. All in
`src/rig.mjs` (the verlet chains); committed in `c97e3ba`, merged in `8323bf0`.

- **Hidden tail flailed.** The ground was a y-only clamp after the length pass, and the DFTL term
  handed its push to the parent as a kick every step. Contact is now part of the length pass (a
  point lies on the ground at its segment's length), and the ground, not the parent, takes the push.
- **Falls.** The tail collided with remembered hoof touchdowns, which froze at the hilltop and
  stayed after landing. In the air it now uses only terrain a hoof could reach (`s.groundAt`), and
  the memory is reseeded on landing (`f.landed`, `reseedGround`).
- **Frame rate.** Chains stepped by the frame's own dt, but their springs and damping are per 1/60 s,
  so 90–144 Hz screens and uneven phone frames made all hair restless. Every chain now steps at a
  fixed 1/60 s (`advanceChain`) and draws a blend of the last two steps; at 60 Hz it is identical.
- A tail snapped fresh while hidden (teleport, reload) is laid on the ground at once.
- **Measured (real sim, mean °/s²):** hidden and still at Klo's hole 323,716 → 24 (60 Hz) and
  1,028,449 → 50 (144 Hz); lying down 109,528 → 39,359; a 900 wu fall's worst in-air tip jerk
  586 → 14 wu/frame², with no chain resets (was up to 3). `tests/skoldhast-tail.test.mjs` (7 tests)
  fails on the old rig and passes now. Pure suite 157/157; touch (both sizes), save and launch pass.
- **Not changed:** getting up still swings the tail forward under the belly for about 0.1 s, as
  before (tip up to ~95 wu forward); extra drag did not help. On sloped ground the hidden tail
  still rests on one horizontal line at hind-hoof height, so it can sink a little into an uphill slope.
  A waterline blend and chord normals in `hero.mjs` were tried and left out (they changed swimming).

## One stuck wave, one waterline, and Klo's first sight (merged in `8323bf0`)

Same review branch, `codex/skoldhast-living-opening`, on top of `dfc1c6d`.
Pappa's review of the opening and the first beach: the water, the wave and the
shoreline did not line up, and Klo just appeared. Paired views are in
[`docs/skoldhast/wave-waterline-review.md`](../docs/skoldhast/wave-waterline-review.md).

- **Klo's wonder.** First her question as a caption ("Häst eller sköldpadda?
  Ingen vet. Det behövs en forskare!", `captionFallback`; `HER_TEXT.lastTwo` when
  allowed) while the camera pushes in on the dry sand behind the horse (Klo at
  107.74 HL, never inside the wave). The horse shakes; one drop from the shell
  lands in his hole; his stalks peek, look the wrong way, climb hoof → leg →
  shell; he floats up open-mouthed, drops his notebook flat on the sand, stars
  twinkle, a pencil "?": *"Oj … vilket skal! En jättesköldpadda?"* The horse
  tosses its head (new rig action `toss`); both eyes follow the mane, the horse
  stamps and they whip between hooves and mane, then one eye on each half; he
  crouches, leaps ("!"), snatches up the notebook and scribbles as he scuttles
  over: *"Man och hovar?! Som en häst! Det här måste undersökas – från man till
  hov!"* After the cloud he remembers his manners: *"Förlåt! Forskaren är här:
  Professor Klo – expert på land och vatten." "Hittills mest krabbor."* Three
  boxes before the first drawing. The direct "Häst eller sköldpadda?" / "Ja."
  stays for Kapitel 1. Phases `klo-entrance`, `klo-wonder`, `klo-take`,
  `klo-ready`; cues fire for every stage passed even when a frame is skipped.
  New optional rig fields in `klo.mjs` (eyeAim, eyeLift, eyeWide, eyeFrame,
  tremble, crouch, scribble, mouth 'o', pose 'awe'); new art `klo-part-body-o`.
  Eye aims are measured from the drawn pupils. Reduced motion keeps every beat
  without leap, tilt, crouch or tremble. The playable Klo starts where this one
  ends (a shorter walk to his lesson).
- **One wave, from the sea to the hooves.** `src/stuck-wave.mjs` draws the
  frozen splash together with its run-up, which is now real art from the same
  pencil as the splash (`frozen-runup` in `props-land`, drawn by
  `scripts/skoldhast-art/props.mjs` on the shared geometry in
  `src/stuck-wave-shape.mjs`): the foam cap, hatching and white loops continue
  down the sand and thin into the sea's own surface line at the shore. In the
  opening the stamp calls the wave up the beach and it bursts as the hoof lands.
  At the fold it slows to a halt (no instant snap), cools slightly and glints
  along its edge; there is no drawn outline. The playable beach shows that exact
  frozen moment (`G.stuckWaveClock`, not saved; a restored save uses a fixed
  still moment). At the finale's plask it goes.
- **Her sea behind her beach.** The painted sea used to sink below the sand in
  play; `bg-beach` now pins its first full sea row to the world (`seaRow`,
  `seaY`), as in her picture, with an underlay for the screen's bottom edge that
  stays out of snapshots (`seaAnchorY` in `scenery.mjs`). Her dark-blue
  waterline (plan §2.3) replaces the graphite beach line from 105.25 HL to the
  shore (`waterline` in `world.mjs`, `clipX` in `terrain-shape.mjs`); it runs
  straight into the sea's surface line. The pebble at the shore lies behind the
  wave; `foam-edge` has paper-white loops instead of solid blue dots.
- **The run-up art is tied to the beach data.** After any change to the beach
  points, the splash position or the sea level, rebuild it with
  `node scripts/build-skoldhast-assets.mjs --only props`
  (`tests/skoldhast-stuck-wave-shape.test.mjs` fails until you do).
- **The sea ends at the shore.** Open-sky seas are split into the stretches where
  the ground really dips below the surface (`seaSpans` in `view.mjs`). The land
  shallows no longer paint a grey box and a blue line across the sand, and in
  Viken the waterline no longer runs over the shore sand or the lighthouse rock.
  The veil follows the seabed; the mirror pool no longer tints a box of sand. A drawn-only `tail` continues the shallows bed
  under the jetty, so the page no longer ends in a vertical wall of backdrop.
  Collision data is unchanged; the shallows' water box only reaches further.
- **The opening margin continues the picture.** Each pencil row takes the
  picture's own edge colour and thins out towards blank paper, with no ruled
  edges. The sand and seabed below follow the world's real bed; kelp stands on a
  shelf below the surface; the tower stands on a small islet with a reflection.
- **Guided strokes.** The shell accent's dots sit on the actual shell rim (from
  the live sprite, any pose) and the pigment follows the whole rim smoothly. The
  shoreline dots start where the wave's crest meets the sea, at sea level (they
  were 7 paper units low), and the result is a pencil line, not a 6-unit bar.
- **Small things.** The hero's ground shadow sits on the sand instead of smearing
  over the sea behind the beach line. The seaweed strand moved from under the
  tail into the shallows. The asset build writes `files.json` with forward
  slashes on Windows too (it wrote `src\\…` paths, which the loader cannot fetch).

Pure suite: **150/150**, robot included. First playable: **2,815,239 bytes**.
Browser checks are listed in the review. (The dunes/pool seam noted here was
fixed on 30 September.)
Frågor till Pappa: does "från man till hov" make Alva laugh when read aloud? Is
Klo's entrance (now about 16 s including the caption, plus three boxes before the gull) the right pace?
In portrait the sea band behind the beach is thin (one world anchor for all
sizes); raise it for portrait? Her blue waterline runs from the shells to the
shore: does that match her drawing?

## Previous continuation: the painting wakes under Alva's pencil

Review branch: `codex/skoldhast-living-opening`, based on merged main `3896886`;
merged to `main` in `8323bf0`. Research, staging decisions and comparison
images are in [`docs/skoldhast/living-opening-review.md`](../docs/skoldhast/living-opening-review.md).

The opening now starts with a completely still Sköldhäst. One forgiving shell
accent wakes the existing faithful drawing: head lift, breath, a hoof press and
the first splash. The camera moves closer for these small reactions. The gull,
coloured cloud and interrupted shoreline remain the next three drawing actions;
the hero follows the flying marks with its gaze. Keyboard completion produces
the same response as tracing. The initial rotation toast no longer covers the
portrait drawing prompt.

Klo uses the existing articulated crab rig. Sand stirs, eyes peek, a claw braces,
then he climbs, pops sideways and catches his notebook. His feet use the real
beach height. Dialogue moves his claws. When the camera enters the picture, the
same crab scuttles inland while control returns; there is no second entrance.
Saves and the robot retain a fallback introduction when no paper crab exists.

Pencil ridges, submerged kelp and a distant paper tower establish one coastline.
An anonymous measuring figure and a reflected ruler glint anticipate the fold.
The tower lamp remains unlit for P7. The existing physical fold still crosses
the exact last shoreline point, takes the painted sea underneath and stops the
wave during the motion. Kelp/current details keep moving below it. Mystery
answers describe observations; the keeper's identity and protective mistake
remain discoveries for Kapitel 3. The hero wants its first splash back.

Current pure suite: **145/145 passed**, including the robot and deterministic
frame-rate replays. First playable: **2,777,181 bytes**; no new art atlas, audio
sample, filter or TTS. The privacy and hidden-ticket rules are unchanged.

Focused checks:

```sh
node tests/browser/skoldhast-awakening.mjs --out /tmp/awakening
node tests/browser/skoldhast-opening.mjs --out /tmp/opening
node tests/browser/skoldhast-cloud-color.mjs --out /tmp/cloud-color
```

The awakening check covers native touch and keyboard at both phone sizes,
reduced motion, a still rig before input, visible wake reactions, full-size crab
emergence and closing/reopening during the wake. The fold check covers the
full causal phase order, actual tracing, retained paper, choices, rotation and
closing/reopening during folding. Required launch, save, touch at both phone sizes, guide, pages and finale
checks all pass. Both normal/reduced finales and cloud-colour persistence pass.
The three refreshed 27-place contact sheets and six before/after comparisons
are under `docs/skoldhast/shots/k3/`, with no captured browser errors. Exact
results and remaining human review are recorded in the review.

Remaining human review: does a fresh player understand what their stroke woke,
what the fold interrupted and what the Sköldhäst wants back? The distant figure
is deliberately a small clue, especially on portrait. Screenshots cannot prove
comprehension or physical-phone smoothness. The prologue sun is still part of
the static original picture; no new claim of rotating sun rays is made.

## Previous continuation: connected story, coloured cloud and aligned cave water (merged)

Merged from `codex/skoldhast-story-flow` in PR #9, main `3896886`.
The earlier polish was merged in PR #8.

Story audit and paired screenshots:
[`docs/skoldhast/story-flow-review.md`](../docs/skoldhast/story-flow-review.md).
The opening now keeps Alva's drawn shoreline, folds the painted sea at its exact
endpoint and freezes the splash during that movement. The two questions have
different answers. Klo demonstrates the map changing first and the beach
following it; collected fragments then join into a visible route to the keeper.
P1–P8 refer back to those discoveries and the final line resumes the interrupted
shore. Guidance covers either fragment order, the grown-ramp ledge and return
routes. Repeated reminders and the fish success no longer unnecessarily lock play.

The cloud drawing has five pencils and a translucent coloured-pencil fill. Its
shape and colour survive closing/reopening. Legacy drawings stay outline-only.
The cloud settles inside the retained opening sky and uses bounded distant drift
in play, clear of the sun, lettering and terrain. Picture snapshots restore their
temporary transforms immediately. Round and wide freehand shapes are checked.

The cave and sea now share one water level, removing a 180-unit swimming snap at
their join. Entry keeps its previous immersion. Air/light use the authored water
level, water strokes include both exact endpoints, and the entrance artwork's
painted water meets the pool. See
[`docs/skoldhast/water-alignment-review.md`](../docs/skoldhast/water-alignment-review.md).
Underwater camera framing now follows the torso so the head stays below the goal
note and inside the screen near the surface.

Current pure suite: **141/141 passed**, including the full-game robot and
deterministic frame-rate replays. First playable: **2,769,354 bytes**, below the
3,000,000-byte limit. Focused commands for this continuation:

```sh
node tests/browser/skoldhast-opening.mjs --out /tmp/opening
node tests/browser/skoldhast-fold-demo.mjs --out /tmp/fold-demo
node tests/browser/skoldhast-cloud-color.mjs --out /tmp/cloud-color
node tests/browser/skoldhast-cloud-sky.mjs --out /tmp/cloud-sky
node tests/browser/skoldhast-water-alignment.mjs --out /tmp/water-alignment
```

Required browser launch, save, touch at both phone sizes, guide, pages and normal
finale pass on this continuation. Reduced-motion finale and view cancellation also
pass; save and context recovery were rechecked after the cloud changes. The
opening passes both phone sizes in normal/reduced motion. Four keyboard/touch
journeys cover all puzzles and extras; see the review for the order of checks.
No captured browser errors. The updated full contact sheets cover all 27 places
at 844×390, 390×844 and 1440×900, alongside matched opening, cloud and water views.

No new chapters, TTS, external art or sound files. The privacy rules are unchanged.
Human understanding of the story and physical-phone smoothness still need a
human playtest; previous audio listening limitations remain.

## Previous continuation: deeper visual/mechanics polish (merged)

The deeper audit and implemented changes are documented in
[`docs/skoldhast/polish-round3.md`](../docs/skoldhast/polish-round3.md), with
paired before/after views and refreshed 27-place sheets at all three viewports.
The final pure suite passes **117/117**, and the first-playable build is
**2,753,951 bytes** (strict limit 3,000,000). Required browser checks, both finales,
drawing/map/guardian/guidance checks and the P7 comparison pass without captured
errors. Four fresh keyboard/touch journeys cover P1–P8 and extras.

Start review with the clearer lighthouse line, P7's visible mirror comparison,
Signe's much slower race, the current hide/wait/emerge prompts, the drawing draft
controls and individual map pieces in Ledtrådar. Physical-phone smoothness and
human listening remain unmeasured. Text-to-speech was explicitly deferred.
That work was merged from `codex/skoldhast-polish` in PR #8.


Last updated: 29 September 2026. The current review branch is `codex/skoldhast-living-opening`, based on `main` at `3896886`. The design is in `docs/skoldhast-game-plan.md` (v2); the working rules are in `skoldhast/CLAUDE.md`.

## State

The whole game is built in one pass:
- the prologue, Kapitel 1–3, the final, the epilogue;
- all eight puzzles P1–P8 and the optional delights O1–O6 and O8;
- the journal, save slots and word codes;
- synthesized music and effects;
- colored-pencil art drawn in code.

`RELEASED_CHAPTER` is **3**, so everything is playable. The fourth button on the ticket is **hidden** unless the page is opened with `?skoldhast` (or `#skoldhast`).

| Area | State |
| --- | --- |
| Engine (`sim`, `puzzles`, `story`, `game`, `save`) | Done. The robot playthrough finishes all three chapters. |
| Renderer (`view.mjs`) | Done. Scenes, water and reflections, kelp, currents, the whirl, paper covers, darkness, particles, the camera, and the story effects. |
| Hero (`hero.mjs`, `rig.mjs`, `scripts/skoldhast-art/hero.mjs`) | Done. Her sköldhäst traced in code (route B), rigged with gaits by distance, leg IK on the terrain, leaps, Göm dig, swimming and drifting, the actions, and verlet hair. `dev/hero.html` shows it all. |
| Characters, table, UI art | Done: Klo with the signs, Kartväktaren, the lyktfiskar, shy creatures, Signe, the table props, the title lettering, the icons. |
| Scenery art (materials, backdrops, props) | Done: land, sea and bay atlases, evening backdrops, pencil strokes. |
| Audio (`audio.mjs`) | Done. The theme "Sköldhästens visa" in D dorian in five arrangements, stingers, synthesized foley, place ambience and adaptive layers for speed, underwater and hiding. It still needs a human listen (`dev/audio.html`). |
| Ticket integration (`index.html`) | Done. A hidden fourth button, a loading overlay that prefetches `files.json`, Avbryt and retry, and Mira's launch-race guard. |

## Animation, movement, audio and visual polish (29 September)

This pass improves the existing three chapters; `RELEASED_CHAPTER` stays 3.
The before/after audit and acceptance evidence are in
`docs/skoldhast/polish-review.md`. The original contact sheets are preserved in
`docs/skoldhast/shots/k3/before/`; the three current sheets are in `shots/k3/`.

- **Klo:** separate pencil body parts, sideways leg cycle, eased scuttles,
  bobbing, eye blinks, claw gestures, instrument fidgets, hole entry/emergence,
  underwater floating and a soft sprite shadow. Lettered frames never mirror.
  Touch, mouse and **K** give a click, hop/wave and one of **36** shuffled Swedish
  jokes in the nonblocking hint bubble. A 5.2-second cooldown and visibility,
  story/dialogue/menu guards protect play. Hero taps, the stick and Följ fingret
  share input routing; canceled pointers cannot leave steering or gallop held.
- **Hills:** exposed terrain is one material contour, including exact cliff
  faces and ramp joins. Hooves query the reachable surface instead of buried
  ground. Earned ramps grow over 0.65 seconds using the same fixed-step geometry
  for drawing and collision. The former 121-unit jump is now at most 2.31 units
  per step in the measured midpoint case. See `docs/skoldhast/hills-review.md`.
- **Movement:** forward hops and stationary perch hops work, slope speed varies
  continuously, hurdles use actual landing support and canceled skids respond
  correctly. Actions survive display frames with no simulation step, and menus
  clear pending input. Hold-to-hide release cancels a queued tuck, and reopening
  after a pause starts a live session. Deterministic replay includes 30/60/120/144 Hz.
- **Swimming:** integrated alternating paddle strokes, surface head lift,
  diving, floating hair/tail, softer buoyancy and glide. Real world coordinate
  tests cover feet, hair, particles and shadows. See `docs/skoldhast/movement-polish.md`.
- **Puzzles/menus:** stable contextual labels, reachable shell tune beside
  Signe, wet perch hopping, deterministic Spången notes, soft menu cues and
  scrollable 44-pixel notebook tabs. Portrait prologue cloud tracing now uses
  the same paper-to-screen transform as the other drawings.
- **Audio:** warmer arrangements of Sköldhästens visa, gait-timed surface
  contacts including a hollow pier, water/pencil/page/menu cues, Klo chatter,
  four place ambiences, darker light reverb and independent volume buses.
  Offline Chromium/FFmpeg QA reports zero clipping/non-finite samples, maximum
  sample peak −1.72 dBFS and true peak −1.5 dBFS under extreme overlap. Exact
  listening instructions and measurements: `docs/skoldhast/audio-polish.md`.
- **Scenery:** gentler pencil materials, visible distant ridges, underwater
  shafts/depth, bounded water shimmer and a dedicated warm evening bay. No
  heavy filters or downloaded sound/art were added. See `docs/skoldhast/scenery-polish.md`.

First polish gate: **66/66 tests passed**, including the whole-game robot. Required
launch, save, touch (both phone sizes), guide, pages and finale browser checks
pass; focused Klo, notebook, hills, audio and fresh journey evidence is linked
from `docs/skoldhast/polish-review.md`.

Additional checks:

```sh
node tests/browser/skoldhast-klo.mjs 844x390
node tests/browser/skoldhast-klo.mjs 390x844
node tests/browser/skoldhast-notebook.mjs
node tests/browser/skoldhast-journey.mjs --viewport 844x390 --input touch --out /tmp/journey
node tests/browser/skoldhast-journey.mjs --viewport 390x844 --input keyboard --out /tmp/journey
node tests/browser/skoldhast-hills.mjs --viewport 844x390 --out /tmp/hills
node scripts/skoldhast-audio-check.mjs --out /tmp/audio --no-images
```

Run the journey for both input modes at both phone sizes. It starts a fresh
save through the real title/prologue and sends DOM/CDP input, then accelerates
the fixed simulation to cover P1–P8 and the implemented extras. It is an
automated playthrough, not a human usability or physical-device performance test.

At that earlier polish gate, the first-playable bundle was **2,723,140 bytes (2.723 MB)**, below the
strict **3,000,000-byte** build gate. Human listening and performance/feel on Alva's actual device remain
unverified. Foreground kelp can still briefly soften/overlap the hero; no new
missing scenery or terrain seams were found in the 27-place review.

## Polish round (29 September): understandable, forgiving, springier

After the first playtest ("it is very unclear what to do", "I am a bit stuck sometimes"):

- **Guidance layer** (`src/guide.mjs`, words in `sv.mjs` `GOALS`, `TIPS`, `BALK`, new `STORY` lines).
  - A goal note ("Mål") at the top shows the nearest unfinished task, with counters. Tapping it opens the journal.
  - Klo's hint bubble speaks up after 30 and 75 seconds without progress. It also fires at the moments that used to pass in silence, and after three identical refusals in a row.
  - Every refusal shows a thought bubble beside the sköldhäst's head.
  - One-time tips point at the control they explain.
  - `story.objective()` picks the nearest unfinished puzzle, and Kapitel 3 has its own steps.
  - Layout rules:
    - the note and the hint share one column at the top;
    - on short landscape phones the hint briefly replaces the note, and speech moves to the bottom so the sköldhäst stays in view;
    - toasts start below the column (`--sk-guide-free`).
- **Forgiving puzzles:**
  - P2: Knuffa reaches 1.5 HL, and the sköldhäst steps after the stone. After the reflection, a ghost stone and an arrow show where the stone belongs.
  - P3: a dotted arc of drifting seeds shows where the fluff will fly. Fluff finds a tuft within 1.5 HL. The sköldhäst wonders aloud when the fluff flies the wrong way.
  - Dashed lines you can draw glow when you are near.
  - The vault current is wider.
  - P7:
    - the drum needs 24 gallop steps (was 40), with a progress ring;
    - the plate is 1.6 HL wide and needs 1.2 s. It pulls a resting shell onto it, and a ring on the sand marks it;
    - the pipe mouth draws in a hidden shell within 2.2 HL (`suck`).
- **Physics:**
  - acceleration 1350 (was 1000);
  - full gallop at 72 % stick deflection, and the knob glows;
  - pencil speed lines at full gallop;
  - higher hops, and Hoppa pressed just before landing still hops;
  - the camera no longer bobs on small hops;
  - swimming is a little quicker.
- **Turning pages** (`src/pageturn.mjs`, used by `view.mjs`; tune it in `dev/pageturn.html`):
  - moving between land, the kelp forest and the bay turns the old picture away like a notebook page, forward or back in the page order `PAGE` in `main.mjs`;
  - the white paper over a new chapter peels away. The Kapitel 2 opening frames it first; other covers peel when a third of the screen shows them. A cosmetic flag `peeled_<id>` remembers it;
  - the lighthouse glimpse turns to the bay's page and back;
  - the final unfold lifts the page, and it turns away onto Alva's picture;
  - less motion turns each of these into a short crossfade.
- **New checks:**
  - `node tests/browser/skoldhast-guide.mjs [--out dir]` plays a new game into Kapitel 1 and checks every guidance step;
  - `node tests/browser/skoldhast-pages.mjs [--out dir]` checks a scene turn, the Kapitel 2 paper peel and the lighthouse glimpse;
  - sim tests for the pipe mouth, the plate pull and Knuffa from one spot.

## Menus: a hand-made research notebook (29 September)

- The title, the journal (Forskningsdagboken), pause, settings, the word-code and researcher cards, and the chapter reports are drawn as her notebook.
  - They are built in `src/ui.mjs` and `skoldhast.css`, with the words in `sv.mjs` (`MENU` holds the journal's tab names, the stamp and the map label).
  - New UI images (`ui-icons`, `ui-hatch`, `ui-grunge`, `ui-frame`, `ui-frame-sm`, `ui-tape`) are drawn in `scripts/skoldhast-art/ui.mjs`; its header lists them.
- **Font:** Patrick Hand, SIL OFL 1.1, a 24 KB latin subset in `skoldhast/fonts/` with `OFL.txt`. It is prefetched and counted in the budget.
- **Preview:** `skoldhast/dev/menus.html` shows every menu without WebGL. It takes options such as `?m=journal&page=2&hint=2`, `&big=1` and `&less=1`.
- **Contact sheets** of the menus are in `docs/skoldhast/shots/menus/`, at 390×844, 844×390, 667×375 and 1440×900.
- Every panel has an ✕, and a tap on the backdrop closes it (on a report it means continue). J and Esc close panels.
- Settings opened from the pause menu keep the game paused.
- **Known:**
  - the earlier 320 px tab-size issue is fixed by a scrollable row of 44 px targets;
  - only headless Chromium has been used, never a real phone.

## Fresh-eyes playtest (29 September) and what it changed

An agent played for about two hours with the keyboard at 844×390. Its report, with screenshots and repro scripts, was in the session's scratchpad. Fixed:

- **Pier trap in Kapitel 3:**
  - "Hoppa i" (or down on the stick) now hops off the pier into the bay. Surfaces marked `dropIn` in `world.mjs` allow it, and `dropIn()` in `sim.mjs` does it.
  - Skaka is not offered on the pier.
  - The P7 hints go plate → pipe → pier.
- **Stuck at walls:** `wallBetween` only counts a wall ahead, and swimmers stay clear of its line.
- **Sinking into gaps:**
  - hooves only find ground near the feet (`Terrain.groundNear`);
  - the rig clamps the body's ground offset;
  - on a dashed line the hooves stand on the line.
- **P3 run-up the wrong way:** a miss no longer spends the backsippa (it grows back in 0.9 s).
- **"Jag har fastnat"** goes to the nearest safe spot in the scene (`G.safeSpot()`).
- **Currents are visible:** a pale band with flowing streaks. Klo says so if you hide by the lyktfiskar outside the current.
- **Smaller fixes:**
  - the rope hint on Klippudden;
  - the Kapitel 3 mirror camera, and the glimpse camera;
  - side remarks are non-blocking bubbles;
  - goal wording, and counters only for the goal's own steps;
  - MAS works for MÅS;
  - J and Esc close panels;
  - Klo's hint keeps off the sköldhäst's head on short landscape screens.
- **Handed to the menus redesign:**
  - panels that can't be closed at 390 px height (✕ and a sticky close row);
  - Enter and focus in the word-code field;
  - map chips that look like buttons;
  - the bottom speech box covering the buttons, and toasts on the head.
- **Not changed:** the one-time journal tip can overlap the sköldhäst for a few seconds on a short landscape screen.

## How to check it

- `npm test`: the pure tests, including a robot that plays the whole game (about 3 s).
- `node tests/browser/skoldhast-launch.mjs`: the launcher (no requests before the click, the loader, Avbryt, close and reopen, the Mira race).
- `node tests/browser/skoldhast-finale.mjs --out <dir>`: the ending through the real UI, from word code 2 to the table at dusk.
- `node tests/browser/skoldhast-tour.mjs --out <dir> [--viewport 390x844] [--sheet]`: photographs every place; `--sheet` composes one contact sheet per viewport.
- `node tests/browser/skoldhast-save.mjs` and `node tests/browser/skoldhast-touch.mjs [390x844]`: saving and continuing, and touch play (stick, Hoppa, Göm dig, a tap for Gnägg). The touch check stamps its CDP touch events, so a slow software frame can't stretch a tap into a long press.
- `node tests/browser/skoldhast-guide.mjs`: the first minutes of a new game, with the goal note, tips, Klo's hints and a thought bubble.
- `node tests/browser/skoldhast-pages.mjs`: the turning pages (scene change, chapter paper, lighthouse glimpse).
- `skoldhast/dev/play.html?debug`: the game without the ticket page, with an fps overlay. `window.__skoldhast.debug` exposes `G`, `view`, `ui` and more.
- `skoldhast/dev/hero.html`: the hero's gaits and actions. `skoldhast/dev/audio.html`: every sound.
- `npm run build:skoldhast`: rebuilds all art (`--only hero,npcs,…` for one module) and checks the 3 MB first-playable budget.

## Decisions made while Pappa's answers are pending (plan §0)

| Question | Default in the code | Where to change it |
| --- | --- | --- |
| Q1 original drawing | No scan, so the hero is traced in code (route B) | `scripts/skoldhast-art/hero.mjs` |
| Q2 device, `#skoldhast` | `?skoldhast` or `#skoldhast` only *shows* the button; nothing opens by itself | loader at the end of `index.html` |
| Q3 surprise | Yes: the button is hidden | `index.html` |
| Q5 her words | (c) paraphrase only; every `HER_TEXT` field is `null`, so the fallback lines are used | `src/content/sv.mjs` `HER_TEXT` |
| Q6 family touches | Stars on; Mira cameo off; no clipping; no recorded voices | `sv.mjs` `FAMILY` |
| Q7 dedication | none (`FAMILY.dedication = null`) | `sv.mjs` |
| Q8 Mira's slot | off (`FAMILY.miraSlot = false`); "Ny forskare" is always there | `sv.mjs` |

## Frågor till Pappa (still open)

- Which phone/tablet and browser should receive the final listening, performance
  and touch-feel check?
- After reviewing this branch, should it be merged to main?


Still definitive: first name only, no photos or scans of the magazine page, and
the ticket button stays hidden behind `?skoldhast` (the existing `#skoldhast`
alias only reveals the button). No new public reveal or additional chapter
release is part of this branch.

## Known issues and next steps

### Deeper visual and mechanics polish (29 September)

- Audit and exact before views: `docs/skoldhast/polish-round3.md`. Text-to-speech
  is explicitly excluded from this round by the user.
- Signe now strolls at 70 world units/s, down from 250, with ground-following
  feet and distance-driven walk phase. She still waits before the finish so
  the player can pause or walk gently and win; her return is equally slow.
- Saved story phases reconstruct Kartväktaren, Signe and Klo. Reloading the
  lighthouse checkpoint no longer loses the keeper and blocks the last puzzle;
  saved conversations resume without replaying introductions. Six focused
  story/race regressions and the full-game robot pass.

### Continued implementation, small pushed steps (29 September)

- Baseline for this continuation: 66 passing tests; fresh before contact sheets
  at all three viewports. Continue on `codex/skoldhast-polish`, pushing each
  verified outcome before starting the next integration step.
- Asset cleanup now waits for background bundles before unloading them. Late
  atlas, image and data responses cannot repopulate a closed session. Three
  regression tests cover delayed loads, shared-cache reopen and failed requests.
- Drawing overlays now cancel their keyboard listener and pending completion
  when replaced or closed. Closing stops UI input before asset unloading, and
  cancels delayed orientation callbacks. `node tests/browser/skoldhast-lifecycle.mjs`
  checks drawing cancellation and ten reopen cycles with rendered atlas pixels.
- Fresh keyboard play caught repeated Enter presses postponing drawing
  confirmation indefinitely. Confirmation now schedules once; the lifecycle
  check holds repeated Enter through completion and asserts exactly one result.
- The table prologue also cancels its own waits and animation frames on close.
  `tests/browser/skoldhast-prologue-lifecycle.mjs` reproduces closing during the
  opening wait and Klo's first tween, then verifies a clean reopen at both phone sizes.
- Renderer fades, fold demonstrations and page turns stop on close as well;
  destroying a lighthouse glimpse cannot rebuild the abandoned scene.
  `tests/browser/skoldhast-view-lifecycle.mjs` covers each interruption.
- WebGL recovery grants two visible seconds after a backgrounded tab returns,
  and removes a stale restart prompt when restoration succeeds. The real
  `WEBGL_lose_context` browser check preserves mid-P1 progress, ink pixels and
  Sandpapperet hoofprints, then verifies that P1 still finishes.
- Collection foundations now allow colouring while swimming, keep hidden or
  fast-moving players out of contextual colouring, and share chapter/clue gates
  between pickup, props and rendering. The HUD counts the current region; the
  notebook lists visited regions. Counts use authored IDs, preserving existing
  collected/coloured pencils while ignoring stray save flags.
- All **15 pencils** now exist: **7** on land, **4** in Kelpskogen and **4** in
  Spegelviken. New shell/pebble drawings have matching grey/colour frames.
  Four pure route checks and four keyboard/touch browser variants verify every
  pickup, colouring and regional counter. The completed P8 current now switches
  off, so free exploration can ride the pipe back to the gallery and return by
  the stairs. Run `tests/browser/skoldhast-collection.mjs` (see its header).
  `npm run build:skoldhast -- --check` refreshes the prefetch list and enforces
  a strict **3,000,000-byte** first-playable limit without rebuilding art.
- The regional pencil badge sits clear of the goal note in portrait; the
  collection browser check asserts that the two never overlap.
- The finale now revisits the distant lighthouse view introduced in Kapitel 2:
  the real lamp and its reflection both glow in evening light, followed by a
  quiet 1.8-second hold. Klo stands beside the hero for his conclusion. Focused
  finale checks pass in landscape and reduced-motion portrait, preserving the
  player's scene, checkpoint, flags and camera across the glimpse.
- The ink meshes for P1/P8 now retain the whole line. They previously had only
  two points, truncating a completed stroke after about 30 world units. The
  focused ink browser check covers 20 drawing states, both directions, exact
  endpoints, curved joins and finite GPU vertices; no new asset is needed.
- The continuation's implementation is complete, with **76/76 pure tests**.
  The required browser matrix passes, including touch at both phone sizes,
  plus four fresh keyboard/touch journeys and normal/reduced-motion finales.
  The all-fifteen collection routes, lifecycle, notebook, context restoration
  and full-ink checks also pass with no game browser errors.
  Findings, focused commands and fresh before/after evidence are in
  `docs/skoldhast/implementation-round2.md`. Next: review the real-device feel
  and audio, then ask before merging. The clipping remains excluded by the
  privacy rules, and Flytbryggan remains stretch work.

- **Performance on a real phone is unmeasured.** Headless Chromium renders WebGL in software, so its frame rate is not a device benchmark. Measure with `?debug` on Alva's device and lower the resolution cap in `main.mjs` `sizes()` if needed.
- **Audio** has passed automatic checks (levels, seams, tuning) but needs a listen.
- **Not built** (optional in the plan):
  - O7 Flytbryggan (stretch);
  - the "Publicerad!" clipping;
- **Design changes the robot forced (worth knowing):**
  - Klo's hole moved east among the shells (106.2 HL), so the pool's reflection and Klo's "Ja" don't fire together.
  - The P2 plank inks only after the reflection has been seen.
  - The lyktfisk kelp bed moved beside the vault lane.
  - The P8 dashed segments start 4 HL out on the pier, which leaves room for a run-up.
  - The P8 sea lane starts where the pier leap lands and wins over the pipe current.
- **Art:** `skoldhast/dev/SPEC.md` is the contract between the engine and the art modules.
  - Frames with lettering (Klo's signs, `klo-map-corner`) must never be mirrored; `view.mjs` keeps them unmirrored.
  - Attachment points:
    - the pinwheel head sits 110 units above the stick;
    - the lighthouse is drawn at ×1.37 so that its gallery (1000 px above its base) meets the walkable gallery at −7.3 HL;
    - the shutters and the lamp sit at its lamp room (±78 and −1100 px, scaled).
  - `kelp-strip` is a vertical texture, so `view.mjs` bends it as a strip mesh, not a rope.
  - Signe wears a small race tag "1" (the characters agent's joke); it is a few lines in `npcs.mjs` to remove.
- **The hero's pose is local to the feet** while its hooves and hair live in world space. Always test it with real world coordinates; a test at x = 0 hid a bug that lifted it and sent its hair far away.
- **Headless Chromium renders WebGL in software**, so browser checks must wait for state rather than time it. A 60 ms tap can arrive as a long press at DPR 2 (`tests/browser/skoldhast-touch.mjs` runs at DPR 1 for that reason).
- **Contact sheets** for all 27 places at 844×390, 390×844 and 1440×900 are in `docs/skoldhast/shots/k3/` (refreshed after the polish round). The menus are in `docs/skoldhast/shots/menus/`.

### Deeper polish: lighthouse route and paper guardian

- P8 now uses reserved-paper dashes, directional arrows and distinct endpoint marks, readable over both planks and water. The route draws itself on arrival; completed segments remain quiet. The lamp and its reflection have a bounded, hatched beam.
- Kartväktaren has articulated paper limbs, blinks, breathing, hem movement, walking, talking gestures and smooth pose changes. His window glimpse correctly shows his head and hands. Map lettering is never mirrored; reduced motion removes idle movement.
- Signe's foot cycle follows actual travel distance, including her newly gentle race speed.
- Checks: five guardian pure tests; 18 guardian poses across both phone aspects; 22 focused scene captures plus two reveal states; the full ink-mesh regression. No game browser errors. Run `tests/browser/skoldhast-guardian.mjs` and `tests/browser/skoldhast-polish-scenes.mjs` (headers document options).

### Deeper polish: honest puzzle progress and recovery

- The goal note, notebook hint and world target share one semantic guidance selector. Context cards name the actual next action and distinguish approach, hiding, waiting, sinking/drifting and emergence. Control wording follows hold/toggle and follow-finger settings; progress comes from the puzzle state.
- P2 commits the stone independently of the plank, including old saves. P5 refreshes collision when the lanternfish light the passage. P8 arrives once, holds the shell still, saves the sea half and resumes the final drawing after reload. Emerging always releases the hold.
- Tests cover puzzle ordering, save/reload, deterministic P8 schedules and eleven guidance situations. The integrated pure suite currently passes 117 tests, including drawing/map work in progress. Focused context shots cover eighteen states at both phone sizes.

### Deeper polish: drawing drafts and forgiving tracing

- Free drawings use a large paper pad with a preview, Rita om, Rita åt mig and Klar. Cancelled or tiny touches cannot silently commit a replacement drawing. Finished strokes map back into the original notebook margin and remain bounded to 200 points.
- Guided strokes accept fast segments or intentional point taps, support the final line in either direction, own one pointer, cancel cleanly and keep their geometry correct after rotation. Keyboard help and focus containment remain available.
- Checks: seven geometry tests, the native pointer/cancel/rotation/focus browser suite at both phone sizes, ten close/reopen cycles, and fresh P1–P8 plus extra-activity journeys on touch at both phone sizes and keyboard landscape. Run `tests/browser/skoldhast-drawing.mjs` and `tests/browser/skoldhast-journey.mjs`.

### Deeper polish: atmosphere, paper transitions and mirror staging

- Water's foreground pencil veil is lighter; bounded highlights/rays and drifting flecks add depth without filters or new assets. Foreground kelp fades near the hero. A faint real ridge supports the distant steppe figure.
- Nearby action symbols and their progress use the exact same guidance object as the HUD. They distinguish a shell, emergence, travel and interaction without depending on colour.
- Reduced motion freezes decorative water, fronds, lanes, vortex motes and clouds. Paper-cover fades use elapsed time, the final page lifts before unfolding, and each world page turn has one sound.
- P7's mirror explanation uses a reversible lighthouse comparison throughout the dialogue, keeping the dark real lamp and lit reflection visible in either phone orientation. It restores the scene, hidden hero, camera and controls; the temporary layout observer is destroyed on close.
- Focused renderer check: 30 recorded states across both phone sizes, zero errors. P7 uses a real hiding trigger; the mirror-vista browser test checks framing and restoration. Pages and renderer lifecycle checks pass.

### Deeper polish: inspectable map fragments

- The notebook's Ledtrådar page assembles three torn, textured pieces from existing discovery flags. Each can be inspected separately with its find location and explanation; the pieces share one illustrated coastline, route and layout. Missing pieces remain silhouettes.
- Tap the map or choose a piece, then zoom, pan with arrow buttons, reset or return to the whole map. The existing paper texture is reused. No new saves or art downloads are needed. Older clue aliases work too.
- The current-hint page links directly to the map. The existing seven-page notebook structure remains. At 320px the piece choices stack, and footer arrows/count remain usable.
- Four pure collection tests and keyboard/touch browser checks pass at 844×390, 390×844 and 320×568, including big text, zoom/pan limits, old saves and rebuilds; zero console errors. Preview `dev/menus.html?m=journal&page=4&map=all` (`map=none`, `corner`, `land` also work).
