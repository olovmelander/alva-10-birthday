# Sköldhästen och havet mellan sidorna

Game plan, version 2 — 28 September 2026

Version 2 replaces the first plan of the same date (v1). It was rewritten after a review of v1 from eight
angles. Each angle was checked by a second, skeptical pass against the repository (`main` at `f8daa8a`) and
against the photo of Alva's drawing, which Pappa supplied the same day. Section 9 lists what changed and why.

This is still a design proposal: nothing is built or measured yet. Numbers are starting values to tune, and
dates are suggestions until Pappa confirms them.

**Who reads this:** Pappa (Olov) for the decisions in section 0 and the checkpoints in section 7. Claude Code
sessions for everything else. Sections 1–6 describe the game. Sections 7–8 and the appendices describe how it
gets built.

---

## 0. Frågor till Pappa (answer before Stage 0, about 10 minutes)

1. **Original drawing.** Is there a flat scan, or a straight-on daylight photo, of the *original paper drawing*
   (not the magazine page)? With one, the hero can be cut from her real pencil strokes (route A, §5.4). Without
   one, it is traced in code (route B).
2. **Device.** Which phone or tablet and browser does Alva play on, and does she hold it upright or sideways?
   (The reference photo was taken on a Galaxy S22. Is that her device?)
3. **Surprise.** Is the game a surprise? Recommended: yes, until Kapitel 1 is finished (§7.2).
4. **Dates.** Suggested: Kapitel 1 by the first Sunday of Advent (29 Nov 2026), the full game by Christmas Eve,
   and her 11th birthday (around the end of March 2027) as the fallback.
5. **Her words and picture.** The repository and site are public.
   - May her printed text appear verbatim in the game (§2.1)?
   - May a creature-only crop of her drawing be committed as the art reference (EXIF stripped, no name, no
     magazine layout)?
6. **Family touches.** Which of these do you want?
   - A two-line Mira cameo in the epilogue.
   - The three star-tiger stars from Mira's epilogue twinkling outside the window.
   - Recorded voice lines (your neigh for the Gnägg button?).
7. **Dedication.** Will you write it? (Placeholder until then.)
8. **Mira.** Will Mira play it too? If so, it needs save slots and the easier help mode (§8.6). And can she keep
   the secret?

---

## 1. The game on one page

**Pitch.** Alva's published drawing comes alive. A small researcher-crab climbs out of the drawn sand, a
ruler-straight crease flicks across the page, and the wave splashing at the sköldhäst's hooves freezes in
mid-air.

The player *is* the sköldhäst. It gallops across the steppe and hides in the kelp forest, the two things Alva
wrote that sköldhästar love. It uses both halves of itself to find out who folded the page and why. In the end
the splash lands, her picture comes back exactly as she drew it, and the mystery she printed in the magazine
finally gets its researcher.

### Why it can be awesome, not just nice

1. **It is her picture, alive.** The first playable frame is her own composition: the beach at the waterline,
   the sun half behind outline clouds, the m-gulls, the splash, and her handwritten "SKÖLD häst". The last
   tableau is the same picture, restored.
2. **Both halves are fun to play.**
   - **Horse:** the gallop *does* things. It leaps gaps, inks dashed pencil paths, blows seed-fluff and drums on
     hollow planks.
   - **Turtle:** hiding *does* things. It stills water, lures shy creatures, sinks like a stone onto pressure
     plates and drifts with currents that swimmers can't ride.
3. **Someone finally takes on her mystery.** Professor Klo, a very precise crab, measures the sköldhäst with a
   stopwatch and two signs, SKÖLDPADDA and häst. This is the running joke, and it pays off at the very end
   (§3.4).
4. **Three big moments.**
   - The prologue freeze.
   - *Stora språnget*, the biggest leap in the game, off the steppe onto Klippudden.
   - The finale: PLASK, the page unfolds, and a no-fail gallop *with* the returning waves into golden evening.

### Design pillars

1. **Det är Alvas sköldhäst.** Her picture, her words, her medium (colored pencil) and her open question drive
   everything. Invented material serves hers and never replaces it.
2. **Galoppen ritar vägen – den som gömmer sig får se.** Speed solves some things and stillness solves others,
   and the best moments need both.
3. **Teckningen lever.** Paper, pencil strokes, dashed lines and folds are the physics of the world, not menu
   decoration.

### What the player does (details in §4)

| Verb | Half | What it does |
| --- | --- | --- |
| **Springa** (stick) | horse | Walk → trot → gallop. At gallop: *Språng* (automatic leap at marked edges), *Streck* (inks dashed lines), *Galoppvind* (blows fluff and bends grass), *Trumma* (hoofbeats turn ratchets). |
| **Simma** (stick, in water) | both | Buoyant two-axis swimming. Kelp fringes and tail float, and surfacing at speed gives a dolphin leap. |
| **Göm dig / Kom fram** (button) | turtle | Lie down under the shell. Still water settles and shy creatures come out. In deep water it sinks as a weight; in a current it drifts exactly with the flow. |
| **Hoppa / context** (button) | — | Hoppa by default (a buck at walk, a leap at speed). Near things it becomes Knuffa, Bär, Släpp, Dra, Prata, Skaka or Rita. |
| **Gnägg** (tap the sköldhäst, or N) | horse | A neigh on land, "blubb" under water. Gulls scatter and the crab drops its signs. Never needed. |
| **Alvas penna** | Alva | Only in the prologue, at one or two story moments, and for the final stroke. Tap or trace generous anchors; it can never fail. |

### Scope of version 1

About 55–75 minutes in three chapters, released one at a time. Kapitel 1 is a complete, lovable game on its
own (§7).

Not included: combat, lives, fail states, timers you can lose to, precision platforming, handwriting judgement,
a photo album (that is Mira's game), a rescue or reunion plot (also Mira's), online services or live AI.

---

## 2. Alva's creature: fidelity contract (from the photo)

The reference is Alva's colored-pencil drawing, printed in a children's magazine under the heading "Sköldhäst".
Working copies live in the session scratchpad. Nothing from the photo is committed until Pappa answers §0 Q5.

### 2.1 Her words (canon)

> "Sköldhästar är fantastiska. De trivs lika bra med att sträcka ut benen i en galopp över stäpperna, som att
> gömma sig i kelp-skogarna i havets djup. Ingen vet om det är världens snabbaste sköldpadda eller världens
> långsammaste häst. Jag hoppas att någon forskare ska ta sig an det mysteriet."

What the game takes from this:

- **Sköldhästar are a species.** The player is one sköldhäst, and there are others in the world, seen only in
  shy glimpses. Its name and pronoun are Alva's to choose after the reveal. Until then it is "sköldhästen" and
  "den".
- **The steppe gallop** gives the land region, *Stäppen*, and the horse verbs.
- **Hiding in the kelp forests** gives *Göm dig* and the sea region, *Kelpskogen*.
- **Her open question** stays open. The game gathers evidence for both answers and ends with
  "Forskningen fortsätter."
- **Her hoped-for researcher** is Professor Klo. Alva herself is the *chefsforskare* (§3.2).

With Pappa's OK, the text appears verbatim on the journal page "Fältanteckning av Alva". Without it, the game
quotes only the question.

### 2.2 Visible features (must hold in every pose unless marked)

| Feature | Requirement |
| --- | --- |
| Head | Horse head, fairly small for the body, facing right in a slight three-quarter turn toward the viewer. Cream face with warm tan under the forelock. Rounded dark-brown muzzle with a dark nostril. Dark eye with a white highlight and lid line: calm and alert. Ears are not clearly drawn. At most small tips hide in the forelock, so animate head and forelock rather than big ear poses. |
| Halter | Brown noseband and cheek strap running up behind the eye into the mane. It is part of her design, not "added equipment", so it stays on in every frame, underwater too. The marks under the jaw are ambiguous (a ring, or spots). Keep them as drawn. |
| Mane | Flame-like orange/copper tufts rising about one head-length above the poll, pointing up and back, with darker tips and a forelock. It runs to the front edge of the shell and overlaps it. It is hair: no glow, sparks or particles. |
| Neck and collar | Upright, thick, arched neck. A dark-brown collar strap at its base, in front of the shell. |
| Coat | Cream/off-white with soft grey-brown pencil shading. |
| Spots | Small dark grey-green oval spots, only on the upper foreleg and on the hindquarter under the rear rim of the shell. |
| Shell | A large green carapace sitting like a saddle from the withers to the croup. About three big plates along the ridge and about four side plates. Pale cream seams, mid-to-dark green with yellow-green highlights, and a segmented yellow-ochre rim. Rigid: it never stretches or squashes. Not a generic hex grid. |
| Chest and belly bands | Thin brown lines forming a grid on the chest and belly, a wide band behind the foreleg and a curved band over the forearm. It is **ambiguous whether this is a harness or a belly shell**. Draw it exactly as she did and never explain it in text until Alva does. |
| Legs | Sturdy, straight, draft-horse-like. Only the near fore and near hind are clearly visible, so the far legs are extrapolated, drawn one pencil darker and mostly hidden. |
| Kelp fringes | Long dark-green leaf-strands covering roughly the lower half of each leg down over the hoof, like draft-horse "feathers". They are the visible link to her kelp forests. |
| Hooves | Large, dark brown, with vertical pencil strokes. |
| Tail | **Very long**: orange-red with deep red streaks and paler peach outer strands. It falls from under the shell's rear rim to the ground and pools on the sand (about 1.4× the leg length). Never shorten it. |

**Proportions** (measured on the crop; verify by overlay): shell length ≈ 2.2× head length; shell height ≈ ⅓ of
ground-to-shell-top; legs below the belly ≈ 0.55 of ground-to-shell-top; kelp fringe ≈ lower half of the leg;
overall silhouette about as tall as it is long.

**Allowed extrapolations**, reviewed against the drawing:
- Far legs, the rear and top of the shell, and the belly.
- The gait, based on a real horse's: walk and trot, a three-beat canter, and a four-beat gallop with a moment of
  suspension.
- Swimming, diving, the lying-down *Göm dig* pose, shaking off water, and talking. Talking is shown with head,
  forelock and small mouth motion plus text, never a cartoon human mouth.
- Motion: the mane and tail stream back at gallop and float under water; the kelp fringes bounce on land and
  sway under water.

**Never add**, unless Alva asks:
- Horns, wings, armour, saddle, rider or clothes.
- A glowing or fiery mane, or glowing shell patterns.
- A turtle beak or turtle head, or a head that retracts into the shell.
- Recoloured plates.

### 2.3 Her composition (prologue, first playable frame, final tableau)

- A sandy beach at the waterline, with the sköldhäst facing right and standing square.
- A white-foam wave splashing against its front hooves; foam drawn as outlined white shapes with blue droplets.
- Blue pencil gradients for sea and sky.
- A yellow sun with ray lines, half behind clouds drawn **as outlines only**, never coloured in.
- Three "m" gulls at the upper right.
- The pencil label **"SKÖLD häst"** (SKÖLD in capitals, häst in lowercase, underlined) to the right of the neck
  and chest.

All of this is recreated in code. The photo itself is never used as game art. The areas Pappa scribbled over,
and the magazine's arrow and layout, are not part of her drawing and are never reconstructed: the red circle
becomes plain sea.

### 2.4 Medium

Colored pencil on white paper: directional hatching, paper showing through, thin graphite contours and soft
blended build-up where she blended (her sky). **No watercolour, no pixel art.** Daylight is the default.

### 2.5 Credit and privacy

- **Title screen and credits:** "Sköldhästar är påhittade och ritade av Alva."
- **Journal title page:** "Sköldhäst – först beskriven av Alva". A Latin name such as *Chelonippus alvae*
  (Greek *chelōnē*, turtle, + *hippos*, horse) is offered as a suggestion she may rename.
- **Dedication:** written by Pappa.
- **Privacy:** first name only. Never her surname, the magazine's name, issue, school, town or portrait. The full
  page photo is never committed.
- **Sign-off:** Pappa approves the likeness before any scene art (§7). After the reveal, Alva has the final say.
  Her answers (the bands, the name, whether it talks, foals) become canon, credited "enligt chefsforskaren
  Alva".

---

## 3. Story

### 3.1 Premise, in words a 10-year-old can repeat

"Någon har vikt ihop sidan där sköldhästarna bor. Nu har vågen fastnat mitt i ett plask – och sköldhästen vill
ha tillbaka plasket på sina hovar."

The sköldhäst's want is small and concrete: the splash from her picture. The mystery is who folded the page,
and why.

### 3.2 Cast

- **Sköldhästen** (the player). Proud of its gallop, with dry humour, and slightly touchy about being "helt okej"
  as a horse.
  - Arc: a proud land-galloper finds that hiding and swimming are strengths too. It hits a low point at "Jag
    finns visst inte på kartan" and ends at "precis i mitten".
- **Professor Klo**, a small, very precise crab with a notebook, a stopwatch and two signs: **SKÖLDPADDA** and
  **häst** (lettered like Alva's label). It is the "forskare" from her text: pompous, loyal and funny.
  - It ducks into its hole at gallop noise and comes out when you hide.
  - It is never an obstacle and never a quest-giver chain.
- **Kartväktaren**, an old man of folded paper who lives in Pappersfyren. He is anxious and tidy, and writes with
  a ruler. His map has only two pages, LAND and HAV.
  - He saw Alva's new, unfinished line and feared it was a tear, so he folded the page along the shore to
    protect the drawing.
  - He is not a villain. He unfolds the page himself at the end, and redraws the shore in *blyerts* (pencil) so
    the waves can move it.
- **Alva**, the *chefsforskare* on the other side of the paper. We see her hands and pencil in first person and
  never draw her face. Her margin notes in the journal carry the hints, and she draws the final stroke.
- **Other sköldhästar**, seen in two to four shy distant glimpses. They are never lost, found or reunited: that
  is Mira's story.
- **Optional (§0 Q6):** Mira's and Pappa's lines in the epilogue, and the three star-tiger stars in the window.

### 3.3 World rules (set up early so the ending is fair)

1. **What happens to the map happens to the world.** Klo demonstrates this in Kapitel 1 with a torn map corner:
   it folds the corner and a dune folds up, then unfolds it.
2. **Where the page was folded, lines broke into dashes.** On land, a galloping sköldhäst inks dashes solid
   again. At sea, dashed current lines carry only a hidden shell.
3. **Time stopped with the wave.** The sun hangs at her noon for the whole adventure. The lighthouse is lit only
   in its reflection. When the splash lands, time starts again and the day runs into golden evening.
4. **Her outline clouds and m-gulls are her style, not damage.** A joke teaches this early:
   - Klo: "Molnen är inte färglagda!"
   - Sköldhästen: "De är fina så."

### 3.4 Beat outline

**Prolog: Ett streck till (about 1.5 min, first person)**

1. Her paper drawing on the table, recreated in code, with her hand and pencil. A caption shows her last two
   sentences, as if she is reading them (verbatim only with §0 Q5).
2. A tiny crab climbs out of the drawn sand: "Forskare? Här! Professor Klo – expert på allt som bor både på land
   och i vatten. Hittills mest krabbor."
3. The player traces three strokes in the white margin *outside* her finished picture:
   - "Rita en mås!" The m-gull flies off.
   - "Rita ett moln!" The outline cloud drifts.
   - "Rita stranden vidare – ut över kanten!" The waterline runs off the picture and the world grows.
4. *Prassel.* A dead-straight crease flicks across the horizon. The splash at the hooves stops in mid-air, the
   sun stops, and one drop rolls *upward* over the paper. This works visually even with the sound off.
5. The sköldhäst blinks and looks down: "Alva … vågen har fastnat."
6. Choice: **[Det var inte jag!]** or **[Jag vet inte!]**. Both lead to:
   - Sköldhästen: "Nej. Det där är ett veck. Någon har vikt sidan."
   - Klo: "Äntligen ett riktigt mysterium!"
   - Sköldhästen: "Då får vi forska på det."
7. The camera dives into the page. The first playable frame is exactly her composition.

**Kapitel 1: Stranden och stäppen (about 20–25 min)**

- **Her beach.** Walk, gallop, Hoppa and Gnägg; the gulls scatter; splash around the frozen wave-sculpture.
- **Klo's stopwatch gag** (by about 2:30):
  - "Fyrtiotvå komma sju kilometer i timmen!"
  - "För en sköldpadda är det världsrekord."
  - "För en häst är det … helt okej."
  - Sköldhästen: "Helt OKEJ?!"
- **Göm dig tutorial.** Klo ducks away from the gallop and only comes out when you hide. Then:
  - Klo: "Häst eller sköldpadda?"
  - Sköldhästen: "Ja."
  - Klo: "… Jag behöver tänka en stund."
- **Rule demo** with a torn map corner signed /K: "Det som händer med kartan händer med världen!"
- **P1 Streckbron.** A note on a post by the dashed arch says "OBS! OFÄRDIGT STRECK. RÖR EJ! /K". Klo: "Vem
  skriver så prydligt? Med linjal, dessutom."
- **Stäppen.** Galoppbanan (a free gallop of 40 s or more), fjädergräs, then P3 Backsippornas fjun up
  Vågmärkesbranten. Wave marks high above the water are a clue that the sea used to reach this far.
- **P2 Spegelpölen** opens Vattenporten into the sea. This is the swim, sink and drift tutorial in the kelp
  entry. Klo, whispering: "Du gömmer dig jättebra. Förutom manen. Den syns ända upp till ytan."
- **Chapter hook, Veckmuren.** A ruler-straight crease cuts through the sea like a glass wall, with water piled
  up behind it.
  - Sköldhästen: "Någon har vikt det här."
  - Klo: "Med linjal."
  - End card: Forskningsrapport nr 1. Beyond this point the page is still white paper: "Nästa sida kommer snart."

**Kapitel 2: Udden och djupet (about 20–25 min, P4 and P5–P6 in either order)**

- **P4 Stora språnget** onto Klippudden finds the *Landmärket*, half of a map mark, among the high wave marks.
  Klo: "Fem hästlängder! Nytt rekord för sköldpaddor. Och för krabbor."
- **From Klippudden:** "Fyren lyser – men bara i spegelbilden." A paper figure on the lighthouse balcony ducks
  out of sight.
- **P5 Lyktfiskarnas väg** and **P6 Strömkarusellen** in Kelpskogen find the *Havsmärket*, the other half, and
  open the sea route toward Spegelviken.
- **Along the way:** a second note ("Snälla, rör inte strecken. Det är för teckningens skull. /K"); the first
  shy glimpses of other sköldhästar ("Det finns fler!"); old hoofprints in the kelp sand.
- **End:** both half-marks sit side by side in the journal. Forskningsrapport nr 2.

**Kapitel 3: Pappersfyren (about 15–25 min)**

- **P7 Pappersfyrens tre luckor** lights the real lamp and brings out Kartväktaren. It is his first line on
  screen, though he has "spoken" through two notes.
- **The talk** (short and tender, at most three boxes at a time):
  - Kartväktaren: "Ett ofärdigt streck kan bli en reva. Och en reva kan bli ett hål."
  - Kartväktaren: "Så jag vek bort havet. Det var för teckningens skull!"
  - Kartväktaren (at his map): "Här står LAND. Och här står HAV. Var ska jag skriva dig?"
  - Sköldhästen (quietly): "Jag finns visst inte på kartan."
  - Klo: "Då är det kartan som är fel. Inte du."
  - Sköldhästen: "Strandkanten ska inte vara färdig. Den flyttar sig med varje våg."
  - Sköldhästen: "Det är där jag bor – precis i mitten."
- **P8 Den sista linjen.** The waterline Alva drew "ut över kanten" in the prologue appears as one glowing dashed
  line:
  - The land half is galloped.
  - The sköldhäst leaps off the pier's end.
  - The sea half is drifted while hidden.
  - Alva's pencil draws the last stroke.
- **Kartväktaren chooses:** "Jag ritar den i blyerts. Då kan vågorna flytta den." He unfolds the page.

**Final: Havet hittar hem (about 3 min)**

- **PLASK.** The splash lands on the hooves, and the view holds on her exact composition while "SKÖLD häst" writes
  itself in pencil.
- **Klo folds PADDA off its SKÖLDPADDA sign.** Held next to "häst", it now reads "SKÖLD häst", her own label.
  - Klo: "Slutsats: För en sköldpadda – världsrekord. För en häst – helt okej. För en sköldhäst – precis lagom."
  - Klo: "Snabbaste sköldpaddan eller långsammaste hästen? Mer forskning behövs!"
- **Time starts.** The sköldhäst gallops *with* the returning waves for 60–90 s: no fail, nothing chasing, with
  an automatic speed boost. The run passes through the restored places into golden evening. Distant sköldhästar
  run along the horizon only if the player spotted them earlier. A reduced-motion variant is included.
- **Epilogue at the table, at dusk.** A wet hoofprint beside her drawing and a new note: "Världens snabbaste
  sköldpadda eller världens långsammaste häst? Forskningen fortsätter."
  - Optional: Mira: "Varför är teckningen blöt?" / Alva: "Forskning."
  - Optional: three stars twinkle in the window.
- **The journal's last page:** "Slutsats: Sköldhästar är fantastiska. Forskningen fortsätter." then an empty
  "Din anteckning:". Free exploration continues.

### 3.5 The theme, in one image

The **shore** is the place where land meets sea. Every wave redraws it, so it is *meant* to stay unfinished, and
a creature that is both horse and turtle belongs exactly there. That single image carries both of v1's themes:
"you don't have to choose half of yourself" and "an unfinished line is room to continue". It also fits the
title: the sea between the pages is the part that got folded away.

The theme is *played*, not narrated. The finale needs the land half (gallop) and the sea half (drift) of the
same line.

### 3.6 Tone and reading budget

- **Tone map:**
  - Land (Stranden, Stäppen) is energetic and comic.
  - Kelpskogen and Spegelviken are quiet wonder, with visual jokes only (the orange mane sticking out of the
    kelp).
  - Pappersfyren is tender.
- **Budget:**
  - About 130 dialogue boxes in total, each at most about 90 characters.
  - At most three boxes before control returns.
  - Every joke must also land without text (a sign flips, fish scatter, a "blubb" bubble).
- **Swedish style:**
  - Speaker boxes as in Mira (`mira/mira-content.js:597–625`); address the player as *du*.
  - Swedish quotation marks (” ”) and dashes (–); decimal comma.
  - Child words over loanwords: vattenpöl, not pool; slut, not final; ström, not flöde.
  - All strings live in `content/sv.mjs`.
  - Pappa reads every line aloud once before each chapter release.

---

## 4. Play

### 4.1 Controls

| Action | Touch (phone/tablet) | Keyboard |
| --- | --- | --- |
| Move | Floating stick: appears where the left thumb lands; horizontal on land, two-axis in water | Arrows / WASD |
| Hoppa / context verb | Right button, 56 CSS px, always visible, label changes | Space or E |
| Göm dig / Kom fram | Right button, 56 CSS px, toggle (`aria-pressed`) | G |
| Gnägg | Tap the sköldhäst (throttled) | N |
| Forskningsdagbok / paus | Top corners, 48 px, spaced | J / Esc |

- **Portrait:** the play view uses the top ~70% of the screen and the controls sit in a band below. Speech
  bubbles are anchored at the top. Landscape uses corner overlays. The ground line sits high enough that thumbs
  never cover hooves or the waterline.
- **Settings:**
  - *Galopplås* (off by default): after gallop is reached, letting go keeps galloping until reversed.
  - *Följ fingret*: the sköldhäst follows a held finger. This disables tap-to-neigh.
  - Hold mode instead of toggle for Göm dig.
  - Bigger text, less motion, and separate volumes for music, effects and voices.
- **No gesture needs timing, mashing or two simultaneous inputs.** There is no double-tap and no tap-anywhere
  jump.
- The camera leads ahead of a galloping sköldhäst. In portrait the hero keeps its minimum size, and hurdles are
  signposted early instead of zooming out.

### 4.2 Verb rules (starting values; HL = one horse length)

**Springa (land)**
- Walk 1.6 HL/s, trot 3.2 HL/s, and gallop 6 HL/s after about 1.2 s of full input. "Galopp" means at least
  5 HL/s.
- Release the stick and it stops in about 0.6 s with a settle pose. Reversing at gallop is a 0.35 s skid turn.
- Lips up to 0.25 HL are stepped over; slopes up to 35° are walkable.
- Hooves have their own sounds for sand, wet sand, planks and shallows. Drums join the music at trot, and the
  whole band plays at gallop.
- **Gallop feats**, all automatic and never timed:
  - **Språng**: at an authored *språngkant* (flattened grass plus a hoof mark), a gallop leaps an authored arc.
    Too slow, and the sköldhäst balks: it stops at the edge, looks down and snorts. There are no pits anywhere.
  - **Streck**: a dashed pencil line is refused at walk and inked at gallop.
    - Once on a dashed segment (10 HL long at most), speed is held until its end, even if the stick is
      released.
    - Inked segments stay and become solid ground.
    - Gallop hoofprints on marked wet sand turn to graphite, which is how the idea is taught.
  - **Galoppvind**: a short wind trail behind the gallop bends grass, blows seed-fluff in the running direction
    and spins pinwheels. The flattened grass stays as a trail, so no information is ever time-limited.
  - **Trumma**: each gallop footfall on hollow planks advances a drum ratchet one notch, and ratchets never slip
    back. Walking only makes them wobble.
- **Hoppa button:** a buck at walk, a leap at trot or gallop, and a dolphin leap when crossing the surface
  upward.
  - Pressing it at a språngkant does the same as galloping off it.
  - Free jumps top out at 0.5 HL, and every required barrier is at least 1 HL, so jumping can never skip a
    puzzle.

**Simma (water)**
- Swimming starts when water is deeper than 0.6 HL and ends below 0.4 HL (hysteresis).
- Two-axis movement at up to 2.2 HL/s; the glide settles in about 0.8 s.
- Buoyancy is near-neutral below a one-HL surface band, so lingering in "havets djup" is easy.
- The shell tilts up to ±30° with heading and the head stays nearly upright.
- A swimmer rides a current at 40% of its speed and can always swim out sideways. Kelp halves speed but is never
  a wall.
- Shore exits are authored ramps, tested in both directions. Leaving the water offers *Skaka* for 3 s.

**Göm dig / Kom fram**
- **Pose:** the horse lies down with its legs folded and its neck low, the shell on top, and the mane tuft and
  tail still showing. It stays recognisable and easy to find, and it passes the likeness contract. There is no
  head retracted into the shell.
- Tucking in or out takes 0.3 s. While hidden there is no steering. The sköldhäst comes out with the button, or
  by holding the stick for 0.5 s on flat ground. In a current, a visible "Kom fram" label stays up.
- Rules:
  1. **Still.** Water within 5 HL settles to a mirror in 1 s. A standing sköldhäst still drips and shifts, so
     only hiding makes a true mirror. Shy creatures within 4 HL come out after 1–1.5 s. Walking or swimming near
     them sends them home, and they always return to their start.
  2. **Deep water: weight.** It sinks at about 0.8 HL/s and rests on the bottom. Pressure plates react only to a
     hidden shell ("tung som en sten").
  3. **Currents: drift.** It moves exactly with the flow, including dashed current lines that only a hidden
     shell can follow. Every current ends in a calm pool with an exit.
  4. **Kelp beds: anchored.** The kelp fringes blend in, a visual joke with the mane sticking out.

**Context verbs** (on the Hoppa button when slow and within about 1.2 HL of a target, shown with a marker):
- *Knuffa* moves an object one notch along a short rail.
- *Bär* and *Släpp*: carry one item in the mouth and snap it into a socket. An invalid drop returns the item home.
- *Dra* pulls a rope or flap; press again to let go.
- *Prata*, *Läs*, *Skaka* and *Rita* do what they say.
- At gallop the button always reads Hoppa.

### 4.3 Kindness rules

- There are no lives, timers you can lose to, drowning, pits or lost progress.
- The sköldhäst **refuses instead of failing**: it balks at an edge, snorts at a thin dashed line, or bobs back
  up. A refusal always shows *why* through a pose or a glance.
- Every puzzle is a small state machine with:
  - a **commit point**, after which it never resets;
  - a **local reset** for objects before that point;
  - a **save rule**: on load, uncommitted objects return to their start;
  - three authored hints;
  - a portrait framing note.
- **"Jag har fastnat"** asks: "Vill du gå tillbaka till en trygg plats?" **[Ja]** **[Nej, jag fortsätter]**.
  Going back never undoes discoveries.
- The ending never depends on optional content, help settings or collectibles.

### 4.4 Hints

The hint ladder is the same everywhere:

| Level | What happens |
| --- | --- |
| 0 | Automatic and inside the world: the sköldhäst balks or glances, or the key detail shimmers after 40 s with no progress. |
| 1 | A gull (above water) or a small fish (below) circles the spot after 90 s. |
| 2 | *Visa en ledtråd*: Alva's margin note on the current journal page. |
| 3 | *En ledtråd till*: a pencil ghost-sketch of the action (a still frame under reduced motion). |

- *Utforska i lugn och ro* keeps these timings.
- *Lite mer klurigt* doubles the timers.

### 4.5 Puzzle catalogue (8 required)

At most two puzzles rely on reflections. At least three need speed. Every puzzle is taught before it is tested.

| # | Name | Where | Verbs | The aha |
| --- | --- | --- | --- | --- |
| P1 | Streckbron | Stranden, the dry tide gully to the steppe | Springa (Streck) | "Galoppen ritar färdigt." |
| P2 | Spegelpölen | Stranden, the rock pool by the sealed Vattenporten | Göm dig (still), Knuffa, Streck | "The reflection shows the world as she drew it. Make it match." |
| P3 | Backsippornas fjun | Stäppen, Vågmärkesbranten | Galoppvind | "The fluff flies the way I run." |
| P4 | Stora språnget | Stäppen plateau → Klippudden | Springa (Språng) | "I need a longer run-up. Where can I get one?" |
| P5 | Lyktfiskarnas väg | Kelpskogen, Mörka valvet | Simma, Göm dig (drift, shy creatures) | "Drifting counts as hiding." |
| P6 | Strömkarusellen | Kelpskogen, Kelphjärtat | Göm dig (drift, weight) | "Don't fight the whirl. Let go." |
| P7 | Pappersfyrens tre luckor | Spegelviken, Pappersfyren | Trumma, Göm dig (weight, drift), Dra | "Each shutter needs a different half of me." |
| P8 | Den sista linjen | Stranden → Trumbryggan → under Spegelviken | Streck, Språng, Göm dig (drift), Alvas penna | "The horse draws the land, the turtle draws the sea." |

**P1 Streckbron**
- **Setup:** a dashed pencil arch spans a 4 HL gully, with packed wet-sand runways on both sides.
- **Solution:** walking onto it balks; galloping inks it solid.
- **Taught:** in the first minute, walk prints fade but gallop prints turn to graphite, and a small dashed dune
  step on the natural running line gets inked by accident.
- **Hint 1:** "Titta på hovspåren i sanden. Vilka blir kvar?"

**P2 Spegelpölen**
- **Setup:** the pool ripples whenever the sköldhäst moves nearby. Hidden, it goes mirror-still, and the
  reflection shows the cliff with an open arch and a small fish swimming through it. It also shows two
  differences from the real beach:
  - a round stone that sits at the arch's foot in the reflection, but four rail-notches away in reality;
  - a plank over a rock crack that is dashed in reality but solid in the reflection.
- **Solution:** push the stone (Knuffa) and gallop the plank from a beach run-up. When the world matches, the
  arch draws itself open and Vattenporten leads into the sea. Each difference latches when matched.
- **Taught:** Klo (Göm dig), P1 (Streck), and the pool rippling as the sköldhäst trots past.
- **Hint 1:** "Lägg dig still vid pölen och jämför spegelbilden med stranden."

**P3 Backsippornas fjun**
- **Setup:** three dotted empty tussocks sit on ledges up the escarpment. Galloping through a clump of giant
  backsippa seed heads blows its fluff on a fixed arc in the running direction. Fluff landing on a dotted tussock
  grows it into a grass step.
- **Solution:**
  - The first ledge works with a natural rightward run.
  - The second needs a leftward run, because a boulder leaves the runway only on the right.
  - The third needs a run along the first ledge.
  - Fluff regrows in 4 s, and the landing spot is fixed for each clump and direction.
- **Taught:** at the steppe entrance, one lone backsippa fills a small tussock by the path.
- **Hint 1:** "Titta vart fjunet flyger när du springer förbi."

**P4 Stora språnget**
- **Setup:** Klippudden lies across a 5 HL dry cleft. The near runway is short and uphill, so the sköldhäst only
  reaches trot and balks.
- **Solution:** gallop the long Galoppbanan loop around the hill and come down the long slope, reaching full
  gallop at the edge. That gives the biggest leap in the game, with a short slow-down at the top of the arc and a
  music sting.
- **Taught:** the small språngkant on Galoppbanan, which has a flat runway.
- **Reward:** Landmärket, Klo's measurement, and the view of the reflection-only lighthouse. A rope plank lowered
  with *Dra* makes the way back a walk.
- **Hint 1:** "Kan du få mer fart någon annanstans?"

**P5 Lyktfiskarnas väg**
- **Setup:** Mörka valvet is too dark, so the sköldhäst balks at its mouth. A school of *lyktfiskar* (invented
  fantasy fish) hides from swimmers and circles a still, hidden shell. A slow current lane brushes their kelp bed
  and then runs into the vault.
- **Solution:** hide upstream in the lane. The drifting shell passes the bed, the school follows and lights the
  vault, and the fish stay there.
- **Taught:** riding the kelp-entry lane hidden, and how Klo's shy behaviour works.
- **Hint 1:** "Titta på lyktfiskarna när du ligger helt stilla. Vad gör de?"

**P6 Strömkarusellen**
- **Setup:** this is the current that "only goes round and round". A ring about 3 HL in radius circles a calm eye
  where a folded paper corner sticks up. Swimmers in the ring keep only 30% control and are gently pushed out.
  Loose kelp leaves visibly spiral into the eye.
- **Solution:** hide. The hidden shell is drawn inward at about 0.8 HL/s and reaches the eye in about 4 s, then
  sinks onto the corner and flattens it. Havsmärket appears, and the ring unrolls into an outflow toward
  Spegelviken.
- **Taught:** P5 (drift), and a small paper flap flattened by accident at the kelp entry.
- **Framing:** zoom no lower than 0.8×, and the hidden shell never spins, for reduced motion.
- **Hint 1:** "Titta vart de lösa kelpbladen tar vägen i strömmen."

**P7 Pappersfyrens tre luckor**
- **Setup:** the real lamp is dark. Hidden on the calm pier, the player sees in the reflection a lit lamp with
  three open shutters. Each real shutter is linked by a visible pencil chain to one mechanism:
  1. *Trumbryggan*: galloping the hollow pier turns a ratchet, and about two passes open the shutter.
  2. *Sänkplattan*: a seabed plate that only a sunk, hidden shell presses. It latches after 2 s.
  3. *Strömröret*: an upward current pipe. Swimmers are pushed out of its side vents, but a hidden shell rides it
     up to the lamp gallery, where *Dra* opens the shutter.
- **Solution:** open all three, in any order. Each match draws a glowing line to its reflection. When all three
  match, the real lamp lights and Kartväktaren appears.
- **Taught:** P2 (reflections), Spången (the drum), P6 (weight) and P5 (drift).
- **Hint 1:** "Lägg dig still på bryggan och räkna luckorna i spegelbilden."

**P8 Den sista linjen**
- **Setup:** the waterline from the prologue is one glowing dashed line. It runs from her beach along the pier in
  segments of 10 HL at most, with runways between them. It goes off the pier's end at a språngkant, then
  continues under water as a dashed current lane to the lighthouse's lower window.
- **Solution:** gallop the land segments, leap into the sea, then hide and drift the sea half. At the window the
  two half-marks glow, and Alva's pencil draws the last stroke (tap or trace; it can't fail).
- **Taught:** Streck (P1), Språng (P4) and drift (P5–P6).
- **Hint 1:** "Följ den streckade linjen med blicken. Var fortsätter den efter bryggan?"

### 4.6 Optional delights (never required)

| # | Name | What it is | Tier |
| --- | --- | --- | --- |
| O1 | Professor Klos mätningar | Four to six one-minute experiments that fill the journal with funny one-liners, never scores. *Fartfällan* (stopwatch), *Djupmätaren* (dive past a depth line), *Smaktestet* (grass or kelp? It eats both), *Gömleken* (hide until the fish think you are a rock), *Gnäggtestet* (a neigh on land, "blubb" under water), *Språnglängden* (at P4). | MUST (K1 has the first two) |
| O2 | Snäckklockspelet | *Skaka* after swimming sends drops onto a row of shells. Shake at each shell in order and they play the theme. | MUST (K1) |
| O3 | Spången | A hollow dune boardwalk: each plank is a note, a gallop plays a rhythm, and it teaches *Trumma*. | MUST (K1) |
| O4 | Sandpapperet | A wide flat of wet sand where gallop prints stay as pencil lines, so you draw with the horse. The tide wipes it clean after the ending. | SHOULD |
| O5 | Glimtar av flocken | Hide at marked spots to see distant sköldhästar, and find old hoofprints in the kelp sand. | SHOULD (K2) |
| O6 | Färgpennor | About 15 hidden coloured pencils. Each colours one grey-hatched prop (a kite, a boat, a beach hut), with one visible counter per region. They never colour her clouds or the creature. | SHOULD (K2–K3) |
| O7 | Flytbryggan | v1's buoyant platform as a toy: gallop on and it dips and splashes; hide on it and fish gather under the shell. | STRETCH |
| O8 | Kapplöpning mot Sköldpaddan Signe | After the ending, race a proud ordinary turtle. You always win. Signe: "Jag vann i stil." | STRETCH |

### 4.7 Forskningsdagbok: one book, fixed pages

This replaces v1's journal and every other collection screen.

1. Title page: "Sköldhäst – först beskriven av Alva".
2. "Fältanteckning av Alva": her text (with §0 Q5).
3. "Vad vet vi?": the current question, plus a pencil map showing the fold and the regions visited.
4. "Professor Klos mätningar": at most six one-liners, with no stars or counters.
5. "Ledtrådar": sketches, including the two half-marks.
6. One chapter-report page per chapter, three or four lines each, with the chapter's word code (§8.6).
7. "Din anteckning:", left empty for Alva.

Hints appear as Alva's margin notes on the current page.

### 4.8 World map and chapter table

Layout, left to right, as in her picture (land on the left, sea on the right):

```
Stäppen (Galoppbanan, Vågmärkesbranten, plateau ─ cleft ─ Klippudden)
   │ P1 Streckbron
Stranden (hub: her composition, Spegelpölen, Spången) ── Trumbryggan (pier) ── Pappersfyren
   │ P2 Vattenporten                                                         │
Kelpskogen (kelp entry, Veckmuren, Mörka valvet, Kelphjärtat) ── outflow ── Spegelviken
```

Shortcuts open from the far side: arriving in Spegelviken unbolts the pier gate back to Stranden. Revisits show
consequences (inked bridges, coloured props, restored water) rather than repeated challenges.

| Chapter | Places | Required | Ends on | Estimate |
| --- | --- | --- | --- | --- |
| Prolog | Her table | Three margin strokes | The freeze | 1.5 min |
| Kapitel 1 | Stranden, Stäppen, kelp entry | P1, P2, P3 | Veckmuren: "Med linjal." | 20–25 min |
| Kapitel 2 | Klippudden, Kelpskogen | P4, P5, P6 | Both half-marks; the reflection-only lighthouse | 20–25 min |
| Kapitel 3 | Spegelviken, Pappersfyren | P7, P8 | PLASK, the gallop with the waves, the epilogue | 15–25 min |

Re-estimate these from timed greybox play in Stage 1–2. The first ten minutes, as Alva should experience them:

| Time | Experience | What it proves |
| --- | --- | --- |
| 0:00–1:30 | The prologue: her picture, "Forskare? Här!", three strokes, the freeze, the blink, the choice | Likeness, the hook, the tone; it works without sound |
| 1:30–3:00 | Her beach: gallop, Hoppa, Gnägg, gulls scatter, splashing around the frozen wave; Klo's stopwatch gag | Game feel, joy with no goal, humour |
| 3:00–4:30 | Klo hides from the gallop; *Göm dig* brings it out; "Häst eller sköldpadda?" "Ja."; the map-corner rule | Both halves are fun; the world rules |
| 4:30–7:00 | P1 Streckbron and the /K note; Galoppbanan with gull flocks and low hurdles cleared automatically | Speed solves things; the mystery has a culprit |
| 7:00–10:00 | P3 or P2, in her chosen order; a checkpoint as she arrives somewhere beautiful, never a menu test | Real puzzles, an aha and a hook |

---

## 5. Look and sound

### 5.1 Visual legend (in the art bible, taught in play)

| Mark | Means |
| --- | --- |
| Dashed graphite line on land | "Galoppera här": the gallop inks it |
| Dashed blue line under water | A current only a hidden shell can follow |
| Dotted empty tussock | A fluff target (P3) |
| Grey hatching with no colour, plus a pencil-tip glint | A prop a färgpenna can colour |
| Outline-only clouds and m-gulls | **Alva's style**: never interactive, never coloured in |
| A dead-straight paper crease | Kartväktaren's fold |

### 5.2 Colour script (daylight first, pencil on white)

| Place | Palette and light |
| --- | --- |
| The table (prologue) | Warm daylight on white paper, her drawing in the centre |
| Stranden | Her palette: blue pencil sky-to-sea gradient, ochre sand, white foam, the frozen noon sun behind outline clouds |
| Stäppen | Silver-green and pale-ochre grass: fjädergräs, backsippa and wind-combed stripes. **Never copper or gold**, so the mane and tail stay the only big orange shapes and it doesn't look like Mira's Savannen. |
| Kelpskogen | Blue-green depths with hatched daylight shafts, dark-green kelp, lyktfiskar as small warm points (reserved paper plus a yellow halo) |
| Spegelviken | A shaded bay: cool blue-grey stone and big still reflections |
| Pappersfyren | Cream folded paper, ink-blue water, crisp graphite ruler lines |
| Final | Time resumes: golden evening, long warm light, everything in colour |
| Epilogue | Dusk at the table, a lamp, and optionally three stars in the window |

### 5.3 Beauty budget (where effort shows most)

| Share | Where |
| --- | --- |
| 30% | The hero at rest and in motion: likeness, planted hooves, the flame mane, the ground-length tail, the kelp fringes |
| 12% | The pencil material system and a fixed "pencil box" of 16–20 named colours; this multiplies every asset |
| 12% | The first frame: her beach recreated, and the move from the table into the page |
| 12% | The waterline: foam outlines, splashes, wading, the underwater change |
| 12% | The theme, adaptive layers, and hoof, wave and pencil foley |
| 10% | Scene compositions per the colour script |
| 8% | Outline-to-colour reveals when lines are restored |
| 4% | Ambient props and particles |

Do **not** spend on: watercolour simulation, dynamic lighting or normal maps, bloom, a full-screen displacement
filter, per-hair physics, many facial expressions (three eye states are enough), or hunting for licensed music.

### 5.4 Art pipeline (executable by a coding agent)

There is no image generator, illustrator or composer on this project. Everything is drawn in code, as Mira's
sprites are, but with a new colored-pencil toolkit. Mira's `kit.mjs` is a pixel toolkit with no anti-aliasing,
so only its build-and-pack pipeline is reused.

1. **Stage 0a: reference and pencil box.**
   - Grid and overlay tools on the reference crop.
   - Landmark points (eye, muzzle, poll, withers, shell apex and rims, hooves, tail tip).
   - 16–20 named pencils picked by eye against a white reference.
2. **Stage 0b: pencil renderer** (`scripts/skoldhast-art/pencil.mjs`, seeded, `@napi-rs/canvas`):
   - Paper tooth; pigment that catches tooth peaks first.
   - Directional hatching per region, plus a blend/burnish pass for her soft sky.
   - Flow strokes for the mane, tail, kelp and grass; pressure-varied outlines.
   - **Exit:** material swatches placed next to crops of her drawing and judged by eye, not "reads as pencil".
3. **Stage 0c: the hero, in two routes.**
   - **Route A** (only with a scan): cut the parts from her real strokes.
   - **Route B:** trace the parts in code.
   - Parts, about 17–19: head with halter, forelock and tufts, neck with collar, torso with bands, the rigid shell,
     four upper legs, four lower legs with kelp and hooves, and the tail.
   - **Review sheet:** reference | rest pose | 50% onion overlay | a 150-CSS-px phone thumbnail | greyscale, plus
     a 12-frame gallop strip. Automatic landmark checks are only a regression lock; the eye and Pappa decide
     likeness.
   - **Pivot rule:** if neither route passes after two sessions and one correction, simplify the style (clean
     outlines with flat pencil fills) before any scene art.
4. **Runtime rig** (`hero.mjs`):
   - Keyframed gait cycles driven by distance travelled.
   - Two-bone leg IK with a bend direction per joint, and stance feet locked to the terrain.
   - The shell stays rigid.
   - The tail and flame tufts are textured strip meshes (100 vertices or fewer) deformed along verlet spines.
     Pixi's constant-width MeshRope can't give her tapering, pooling tail. Kelp fringes are short ropes.
   - A gentle outline "boil" on a separate outline atlas at about 8 fps, off under reduced motion.
5. **Scenes: a kit of parts, not huge painted layers.**
   - Tiling pencil materials (sky, sea, sand, grass, paper) plus a prop atlas.
   - Far layers at half resolution; mipmaps for layers drawn below about 0.6× scale.
   - Outline twins only where reveals happen.
   - A screen-fixed paper-tooth overlay with multiply blend, so paper never slides against itself in parallax.
   - Collision and water lines come from the same scene script as the art, so they never disagree.
6. **Review loop.**
   - Playwright contact sheets at 390×844, 844×390 and 1440×900; a greyscale check of hero vs background; a 25%
     thumbnail for path readability.
   - Iteration renders stay in a gitignored folder; only approved sheets are committed.
   - Recording and listening tools stay outside the published path.

### 5.5 Sound

- **One theme, "Sköldhästens visa", with its own identity, clearly not Mira's music box.**
  - A 6/8 canter pulse and a modal, Nordic *visa*-like melody.
  - Instruments: a Karplus-Strong lyre pluck, a soft bowed pad, and hand-drum hoofbeats.
- **Four arrangements:**
  - The table: solo pluck and pencil.
  - Land: pluck and drum, adapting to speed.
  - Sea: low-passed pad and slow bells.
  - Final: everything.
- **Adaptive layers:** gallop speed brings in drums and strum; entering water sweeps a low-pass filter and adds
  the sea layer; hiding thins to a near-solo; a reveal gives 1–2 s of silence, then the motif.
- **All effects are synthesized:**
  - Pencil scratches that follow the stroke speed; hooves on each surface; waves, bubbles and crab clicks.
  - A neigh needs a recording to be convincing: a CC0 clip, or Pappa's own (§0 Q6).
  - Optional CC0 wave and gull loops of at most 150 KB each, with `LICENSES.md`.
- **QA without ears.**
  - The agent renders each cue offline to WAV in Playwright, then checks level, loop seams and a spectrogram.
  - Pappa rates the cues on a private listening page, thumbs up or down with notes.
- **Voices** (optional, stretch): Pappa as narrator, Mira as Klo, recorded on a phone. Captions are always on,
  with a separate volume slider. Alva's own voice is added only after the reveal.

---

## 6. What we keep from v1 (and why)

- **Kindness:** no lives, no fail, no lost progress; hints that go from pointing, to explaining, to showing.
- **Presentation:** Swedish throughout; direct control of her creature; free land and sea travel.
- **Moments:** the blink, the drop rolling upward, the wet hoofprint on the table, "Forskningen fortsätter", and
  the crab's "Ja.".
- **Process:** a slice-first build; lazy loading with no requests before launch; careful lifecycle and
  audio-ownership rules; a versioned, validated save.
- **Accessibility:** the XAG and Game Accessibility Guidelines decisions (§8 and the appendix).
- **Flytbryggan**, now an optional toy.

---

## 7. Delivery plan

### 7.1 Roles

- **Pappa (Olov):**
  - Answers §0.
  - Judges likeness (H1).
  - Does the sofa tests on the real device (H2, H3).
  - Reads the Swedish aloud, merges PRs and runs the reveal.
  - Realistic time: about 10–14 hours over about three months.
- **Claude Code sessions:**
  - All code, code-drawn art, synthesized audio and tests.
  - Handover notes and the "Frågor till Pappa" list.
  - Each session ends with main still playable.
- **Alva:** the player. After the reveal she becomes *chefsforskare*: she answers open questions and may draw
  new creatures or places for later chapters ("Nästa sida").
- **Mira** (optional): tester of the easy help mode and a voice for Klo, only if she can keep the secret.

### 7.2 Surprise and reveal

- The fourth button stays **hidden behind `?skoldhast`** until Kapitel 1 is released. `main` is live on GitHub
  Pages, so unfinished work must never appear to Alva by accident.
- **H4, the reveal**, is Alva's first play of Kapitel 1. It doubles as the only real playtest:
  - Don't help for the first 10 minutes.
  - Note where she hesitates, smiles or asks.
  - Afterwards ask her three things: what lives deepest in the kelp, what the crab should be called, and what the
    sköldhäst should find next.
- Her answers shape Kapitel 2–3.

### 7.3 Stages and checkpoints (sizes in agent sessions)

| Stage | Sessions | Deliverable | Pappa checkpoint |
| --- | --- | --- | --- |
| 0. Decisions and likeness | Pappa evening + 2–3 | Pencil kit, hero review sheet (route A and/or B), gallop strip, portrait and landscape greybox mockups of the beach at gallop and at the pool | **H1** (15 min): likeness yes or no, at most three corrections |
| 1. Feel | 1–2 | A hidden test page: rig, walk/trot/gallop, Språng, swim, Göm dig; the beach and pool greyboxed with P1 and P2; a `?debug` overlay | **H2** (20-min sofa test): Is it her sköldhäst? Is galloping fun for two minutes with no goal? |
| 2. Kapitel 1 | 4–6 + 1 buffer | Prologue, Stranden/Stäppen/kelp-entry art, P1–P3, Klo, journal, theme and effects, hints, save slots, hidden integration, tests. Art and puzzles are separate sessions. | **H3** (45 min): the whole chapter on the real device. **H4**: the reveal. |
| 3. Kapitel 2 | 3–4 + 1 buffer | Alva's feedback first, then P4–P6, flock glimpses, färgpennor, Forskningsrapport nr 2 | Sofa test, then release |
| 4. Kapitel 3 | 3–5 + 1 buffer | P7–P8, Kartväktaren, the final run, the epilogue, a Swedish copy-edit, polish | A fresh-save playthrough, then release |

- **Total:** about 15–22 sessions. The session counts are guesses until Stage 0 shows what full-resolution pencil
  art costs. Pixel sprites were fast; this art will iterate more.
- **Pivot rules:**
  - A "no" at H1 or H2 gets one correction session.
  - A second "no" means switching route (H1) or simplifying the style or controls before building any content.
- **Suggested dates** (§0 Q4):
  - Kapitel 1 by 29 Nov 2026 (first Sunday of Advent).
  - Kapitel 2 around Lucia (13 Dec).
  - Kapitel 3 by Christmas Eve.
  - Fallback for anything that slips: her 11th birthday.

### 7.4 Tiers and cut order

- **MUST** (never cut):
  - Likeness, and her composition as the first and last frame.
  - The gallop with Språng and Streck; Göm dig; both habitats.
  - The frozen-wave spine and the researcher crab.
  - P1–P8; the no-fail final run.
  - Swedish text, saving and the credit.
- **SHOULD:** Gnägg with a good neigh, Klo's full set of experiments, färgpennor, flock glimpses, Sandpapperet,
  chapter word codes.
- **STRETCH:** Flytbryggan toy, the turtle race, family voices, a "Rita en egen sköldhäst" page, "Nästa sida"
  chapters built from Alva's new drawings.
- **Cut order if late:** färgpennor → flock glimpses → Sandpapperet → fewer music arrangements (keep the theme)
  → a shorter Galoppbanan. Never cut a MUST; move the date instead.

### 7.5 Session handover rules (write into `skoldhast/CLAUDE.md`)

1. **Start:**
   - Read `skoldhast/HANDOVER.md`.
   - Run `node --test` and the scripted robot playthrough.
   - Confirm that `main` plays.
2. **One PR, one visible outcome.** Don't start the next chapter's content.
3. **End:**
   - `main` still plays.
   - `HANDOVER.md` is updated: done, next, decisions, known bugs, and "Frågor till Pappa".
   - The PR has small WebP contact-sheet screenshots at 390×844, 844×390 and 1440×900 (Playwright records
     WebM, not GIF, and there is no ffmpeg).
4. **Where things live:**
   - All player-facing text in `content/sv.mjs`.
   - All art built from `scripts/skoldhast-art/` by one command.
   - Every chapter PR includes a save-compatibility test: saves from earlier chapters must load.
5. The button stays hidden until H4.

### 7.6 Asset inventory

- **Hero:** about 17–19 parts; 3 eye states; strip meshes for the tail and tufts; ropes for the kelp; 4 palette
  variants for distant sköldhästar.
- **Characters:**
  - Professor Klo, with 2 signs (one foldable), a stopwatch and a notebook.
  - Kartväktaren, with a map and a ruler.
  - A school of lyktfiskar, gulls, and 2–3 shy creature types.
- **Scenes:**
  - About 12 spaces built from about 6 tiling materials and a prop atlas.
  - Props: dashed segments, rail stone, seed clumps, dotted tussocks, drum planks and ratchets, a pressure plate,
    a current pipe, three shutters, the crease wall, the map, about 15 pencil props.
- **UI:**
  - A title lettering traced from her "SKÖLD häst".
  - Two action buttons and the floating stick.
  - Journal pages, speech boxes, the choice buttons, the loading and error screens.
- **Audio:** the theme in 4 arrangements, 3 ambiences, and about 25 effects.

---

## 8. Technical design (for agent sessions)

### 8.1 Runtime: plain ES modules, no bundler

```text
index.html               hidden 4th button (?skoldhast), loading overlay, about 40 lines
skoldhast/
  CLAUDE.md  HANDOVER.md  skoldhast.css
  vendor/pixi-8.21.0.min.mjs  vendor/PIXI-LICENSE     (self-contained ESM, MIT, ~234 KB gzipped)
  src/main.mjs      open/close, host glue
      loop.mjs      fixed step + interpolation
      input.mjs     stick, buttons, keyboard, pointer capture
      sim.mjs       pure: movement, water, currents, hiding
      puzzles.mjs   pure: P1–P8 state machines
      view.mjs      Pixi layers, camera, reflections
      hero.mjs      rig, gait, strips and ropes
      audio.mjs     theme, adaptive buses, effects
      save.mjs      slots, validation, migration
      ui.mjs        DOM: HUD, dialogue, journal, menus
      content/sv.mjs  content/world.mjs  content/story.mjs
  assets/           WebP atlases, material tiles, manifest.json
scripts/skoldhast-art/          pencil.mjs, palette.mjs, hero/, scenes/, review.mjs
scripts/build-skoldhast-assets.mjs   packs atlases, fails over the size budgets
tests/skoldhast-*.test.mjs           node:test (pure)
tests/browser/                       playwright library scripts (Chromium is at /opt/pw-browsers)
docs/skoldhast-game-plan.md          this plan
```

- The loader calls `import('./skoldhast/src/main.mjs')` with relative URLs, so the game works under
  `/alva-10-birthday/`.
- **ES modules don't load from `file://`.** Play via the Pages URL, or locally via `npx http-server` (installed
  globally here).

### 8.2 Renderer and loop

- **Pixi setup:** `Application.init({ preference: ['webgl'], autoStart: false, antialias: false, resolution:
  Math.min(devicePixelRatio, 2) })`, with a backing buffer of at most about 1.5 Mpx.
  - Use the **array** form: the string `'webgl'` can silently fall back to Pixi's canvas renderer.
  - Wrap it in try/catch and assert that the renderer is WebGL. If not, show "Den här webbläsaren kan tyvärr inte
    visa spelet." with **[Försök igen]** and **[Tillbaka till biljetten]**.
- **One scheduler.** The game runs its own `requestAnimationFrame` and calls `app.render()`, as Galaxy does.
  - Fixed step of 1/120 s, at most 10 steps per frame.
  - The accumulator resets on open, resume and visibility change.
  - **Interpolate the hero, the camera and moving props from the start**, because a gallop camera judders on
    90–144 Hz screens otherwise.
- **Close:** call `app.destroy(true, { children: true, texture: true, textureSource: true })`, which releases the
  GL context. The page's Three.js context stays allocated while paused, so measure one full-tab session
  (Galaxy → Mira → Sköldhästen) on the family's device.

### 8.3 Integration with the ticket page

- **The loading overlay is the launch guard.** It covers the page, including the other buttons, and shows:
  - progress: "Laddar Sköldhästen …";
  - a cancel button, **[Avbryt]**;
  - a failure message, "Något gick fel när spelet laddades.", with **[Försök igen]** and
    **[Tillbaka till biljetten]**.
  A load token makes a cancelled load's completion do nothing.
- **Existing bug** (verified and reproduced): press Mira's button and then Galaxy's while Mira is still loading,
  and both overlays open. A one-line guard in Mira's `.then` (skip `open()` if `#mario-content` is hidden) fixes
  it. That is a separate tiny PR.
- **Host glue** in `main.mjs`, guarded with `typeof` as Galaxy and Mira do:
  - Pause the page scene with `setSceneRenderPaused(true)`, which skips update and draw; the page's
    `requestAnimationFrame` still ticks.
  - Pause and restore the page music exactly as Mira does (`mira/mira-audio.js:220–238`).
  - Reuse the shared `audioCtx`.
  - Restore focus to the button on exit.
- **Keep the page's changes minimal:**
  - The button, and its selector in the ≤480 px block at `index.html:1802–1812`.
  - Moving the "NYTT!" badge on release.
  - The loader.

### 8.4 Input and platform

- Pointer capture per touch ID. All held input is released on `pointercancel`, lost capture, blur, pause or close.
- `touch-action: none`, `user-select: none` and `-webkit-touch-callout: none` on controls;
  `overscroll-behavior: none` while open; safe-area insets.
- Session listeners are bound through an `AbortController`.
- Orientation change pauses safely without rebuilding world state.
- UI text is DOM text, readable and resizable.

### 8.5 Audio

- Audio is created or resumed on **Börja/Fortsätt** and on the first tap if it is not running.
- The iOS silent switch is **not** overridden: captions carry all puzzle information, and the prologue works
  silently.
- The game owns only its own voices, and never closes a shared context.

### 8.6 Save

- **Slots.** A "Välj forskare" screen offers named slots (default "Alva", "Mira", "Ny forskare"). Each slot is a
  key `skoldhast.v1.<slot>`. **[Börja om]** always asks first.
- **Contents:** `{ v, contentVersion, chapter, checkpoint, flags[], clues[], pencils[], settings, ended }`. It
  stores stable authored IDs only.
- **Tolerant loading:** unknown IDs are dropped, and an unknown checkpoint maps to its chapter start.
- **When to write:** on checkpoints, close, `visibilitychange` → hidden, and `pagehide`.
- **Backups.** `navigator.storage.persist()` is a bonus, not a safeguard. Each chapter-report page shows a short
  Swedish **word code**, which restores that chapter's start on another device or after the browser clears
  storage.
- **Failure messages:**
  - "Spelet kan inte sparas i den här webbläsaren – men du kan spela ändå."
  - "Det sparade spelet gick inte att läsa." **[Börja om från början]**

### 8.7 Five gates (replacing v1's long budget table)

1. **No requests before launch:** zero Sköldhästen requests before the button is pressed.
2. **First playable:** at most 4 MB and under 5 s, on a throttled 10 Mbps / 100 ms profile.
3. **Textures:** estimated game textures of at most 96 MiB, plus one measured full-tab session on the family's
   device.
4. **Frame rate:** 60 fps (p95 frame time at most 20 ms) over 10 minutes on the family's devices, read from the
   `?debug` overlay.
5. **Lifecycle:** 10 open/close cycles with no leaks, no audio or callbacks after close, and focus and music
   restored.

### 8.8 Tests

- **`node --test` (pure):**
  - Simulation replay under 30/60/120 Hz render schedules, equal within tolerance.
  - Gallop, leap and slope collision; shore entry and exit hysteresis; current escape; hiding rules.
  - All eight puzzle state machines under repeated actions, reloads and every help setting: no softlock, no
    duplicate reward.
  - Save validation, migration and chapter compatibility.
- **Browser**, using the `playwright` library with CDN routes stubbed:
  - The launch race in both orders.
  - Ten lifecycle cycles.
  - No pre-launch requests.
  - A throttled first-playable measurement.
  - A **robot playthrough** that drives inputs through each chapter.
  - Screenshots at three viewports.
- **iOS and real devices:** by hand, from a written checklist.

---

## 9. Review of v1: what changed and why

Each angle's reviewer scored the v1 plan out of 10, and a skeptic then re-checked every finding. The table shows
those calibrated scores.

| Angle | Score | Main finding |
| --- | --- | --- |
| Fun for Alva | 5 | Kind and pretty, but not awesome: the gallop had almost nothing to do, and her joke and her wish for a researcher were side notes |
| Story and Swedish | 5 | The problem (a "too quiet" sea, a stopped tide) was invisible; the themes were told, not shown; the protagonist had no want; several Swedish slips ("trampbrygga", "passa på", "pool") |
| Gameplay and puzzles | 4 | Only about four of the eight promised puzzles existed; "Lyssna" was a reveal button; speed was needed once |
| Beauty and production | 5 | Watercolour was the wrong medium, since her drawing is colored pencil; the pipeline assumed painters, composers and image generators this project doesn't have |
| Technical accuracy | 7 | Every repo reference checked out, and the Mira launch race is real and reproducible; the bundler, `dist/` and the many gates were more than needed |
| Scope and process | 5 | No date, no minimum lovable version, no cut line, no roles, no handover between sessions, no surprise protection |
| The gift | 6 | Good instincts, but the fidelity contract missed the halter, collar, bands, spots and full tail; it ignored "sköldhästar" as a species and her wish for a researcher |
| Simulated playthrough | 5 | Minutes 1–3 had nothing to do; the slice ended on a menu test instead of a hook |

**Changes:**

1. **Story spine** rebuilt on her material: her frozen splash, her open line, Professor Klo as her researcher,
   Kartväktaren's LAND/HAV map, and the finale that turns the sign into "SKÖLD häst".
2. **Verbs:** *Lyssna med skölden* became **Göm dig** (her "gömma sig"). The gallop gained Språng, Streck,
   Galoppvind and Trumma. *Bind ihop* and *Följ flödet* were removed.
3. **A full puzzle catalogue:** P1–P8, each with an aha, where it is taught and a first hint, plus optional
   delights.
4. **Stäppen added** as her steppe; the world laid out left to right like her picture.
5. **Art direction** changed to colored pencil on white paper, daylight first. The fidelity contract was corrected
   from the photo, and a visual legend added so her outline clouds never read as broken.
6. **Honest production:** code-drawn art with a two-route hero proof, synthesized music with its own identity,
   and voices optional.
7. **The finale** split into agency (P8) and release (a no-fail gallop with the waves). The moonlight mechanics
   were dropped.
8. **Humour and toys** under a reading budget: the stopwatch gag, Gnägg, Klo's experiments, the mane in the kelp.
9. **Delivery:** chapter releases, a hidden button, roles, checkpoints, tiers, a cut order and handover rules.
10. **Technology simplified:** vendored Pixi ESM with no bundler; a loading overlay as the launch guard; save
    slots and word codes; five gates.

---

## Appendix A: verified repository facts (at `f8daa8a`)

| Claim | Status |
| --- | --- |
| Buttons at `index.html:2863–2866`; ≤480 px selectors at `1802–1812` | Verified |
| `setSceneRenderPaused` (`index.html:4796–4805`) skips update and draw but keeps scheduling `requestAnimationFrame` | Verified |
| The Mira loader (`index.html:5492–5529`) loads on demand, shares one pending promise and resets it on failure. It shows no progress or error, only a subtle `.is-loading` style, and cannot be cancelled. | Verified |
| Pressing Mira's then Galaxy's button during Mira's load opens both games | Verified and reproduced (headless Chromium, with a delayed script) |
| Space Jump (`index.html`, about 5134–5485): variable step, ground-only jump, pace profiles, no save | Verified |
| Galaxy: 1/120 s fixed step with up to 10 steps (`super-alva-galaxy.js:42–43`), accumulator loop (`5112–5150`), no render interpolation, save key `superAlvaGalaxy.v1` (`4625–4644`), full-resolution Canvas 2D with a backing cap | Verified |
| Mira: story at `mira-content.js:590–650`; gondola update at `mira-ride.js:985–1040`; small pixel buffer at `mira-core.js:194–238`; all sprites drawn in code (`scripts/mira-art/`); all audio synthesized | Verified |
| No bundler, test runner or CI; `package.json` only builds art | Verified |
| Three.js r128 (cdnjs and jsdelivr) | Verified |
| Published at `olovmelander.github.io/alva-10-birthday/` from the branch, with no workflow | Verified |
| PixiJS 8.21.0 is current on npm, MIT, and `dist/pixi.min.mjs` is self-contained | Verified |
| The v1 "Samsung S22" device | The reference photo's EXIF names a Galaxy S22 (S901B). Whether Alva plays on it is §0 Q2. |

## Appendix B: research that still informs the design

- **A Short Hike:** one compact place, optional discoveries, no countdown.
- **Alba:** decide camera and hero readability on a phone first.
- **Lost in Play:** tell the story through poses and reactions.
- **TOEM:** reward noticing. Its photo loop is avoided, because that's Mira's game.
- **Xbox Accessibility Guidelines 107/108/109:** no timing or holds, adjustable help, reviewable objectives.
- **Game Accessibility Guidelines (basic):** large controls, captions, separate volumes.
- **PixiJS performance guidance:** atlases, few filters, explicit disposal.
- **Glenn Fiedler, "Fix Your Timestep!":** fixed simulation, bounded catch-up, interpolation.
- **MDN Web Audio best practices:** start sound from a visible button.

Links are in v1 §3. They support the choices; they don't prove the game will be fun. Watching Alva play does
that (H4).

## Appendix C: Swedish corrections to v1 strings

| v1 | Problem | Now |
| --- | --- | --- |
| trampbrygga | not a Swedish word | Trumbryggan (the hollow pier) |
| "…för att passa på en sida" | *passa på* means "seize the chance" | "…för att få plats på en sida" |
| strandens pool | *pool* is a swimming pool | vattenpölen, Spegelpölen |
| Lyssna med skölden | shells don't hear, and it misses her "gömma sig" | Göm dig / Kom fram |
| Bind ihop, Följ flödet | unclear to a child; *flöde* sounds like a social-media feed | removed (the verbs in §4.2) |
| Gör | a flat label | the specific verb, Hoppa by default |
| Ta mig till senaste trygga platsen | too long for a phone button | "Jag har fastnat" → "Vill du gå tillbaka till en trygg plats?" |
| Tillbaka till spelen | inconsistent with Mira (`mira-ui.js:731`) | Tillbaka till biljetten |
| "Ritade du havet så här tyst?" | silence can't be seen | "Alva … vågen har fastnat." |
| Viskande stranden, Lyktkelpens skog | not her words | Stranden, Stäppen, Kelpskogen |
| ängen | Alva wrote *stäpperna* | stäppen |
| Sköldhästen är skapad av Alva. | she wrote about a species | Sköldhästar är påhittade och ritade av Alva. |
