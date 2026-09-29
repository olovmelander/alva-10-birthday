# Sköldhästen och havet mellan sidorna

Game plan, version 2 — 28 September 2026

Version 2 replaces the first plan of the same date (v1). It was rewritten after a review of v1 from eight
angles. Each angle was checked by a second, skeptical pass against the repository (`main` at `f8daa8a`) and
against the photo of Alva's drawing, which Pappa supplied the same day. The rewrite was then checked again from
six angles, and every fix that survived verification is included. Section 9 lists what changed and why.

This is still a design proposal: nothing is built or measured yet. Numbers are starting values to tune, and
dates are suggestions until Pappa confirms them.

**Who reads this:** Pappa (Olov) for the decisions in section 0 and the checkpoints in section 7. Claude Code
sessions for everything else. Sections 1–6 describe the game. Sections 7–8 and the appendices describe how it
gets built.

---

## 0. Frågor till Pappa (answer before Stage 0, about 10 minutes)

1. **Original drawing.** Is there a flat scan (at least 300 dpi), or a straight-on daylight photo that fills the
   frame, of the *original paper drawing* (not the magazine page)?
   - With one, the hero can be cut from her real pencil strokes (route A, §5.4).
   - Without one, it is traced in code (route B). The magazine photo is only 624×890 px, so it works as a
     reference, not as art.
2. **Device.** Which phone or tablet, which iOS or Android version, and which browser does Alva play on? Does
   she hold it upright or sideways?
   - iOS 15 or newer is a safe floor.
   - The reference photo was taken on a Galaxy S22. Is that her device?
   - If it is an iPhone or iPad: may the birthday page get a home-screen icon (a small web-app manifest)?
     Home-screen web apps keep their saves, which Safari otherwise deletes after 7 days without a visit.
   - On any device: may `index.html#skoldhast` open the game directly, so return visits skip the scroll story?
     No game files load until that hash is seen.
3. **Surprise.** Is the game a surprise? Recommended: yes, until Kapitel 1 is finished (§7.2).
4. **Dates.** Suggested: Kapitel 1 by the first Sunday of Advent (29 Nov 2026), Kapitel 2 around Lucia
   (13 Dec), and the full game by Christmas Eve. Her 11th birthday (around the end of March 2027) is the
   fallback.
5. **Her words and picture.** The repository and site are public. Until you answer, this plan only paraphrases
   her printed text.
   - **Her text:** may it appear (a) verbatim, (b) only her question and "Sköldhästar är fantastiska", or (c)
     only paraphrased? Lines that depend on this are marked † in §3.4.
     - Did she write "kelp-skogarna" with a hyphen, or is that the magazine breaking the word across two lines?
     - Note: the first pushed version of this plan (commit `d843277` on this branch) quoted her full text. If
       the answer is not (a), squash the branch before merging, or ask Claude to rewrite it.
   - **Reference crop:** may a creature-only crop of her drawing be committed as the art reference? It would
     have EXIF stripped, your red scribble cropped out or painted over as plain sea, no name, and no magazine
     layout.
   - **With a scan:** may pieces cut from it be committed as the hero's game art (route A)? May the whole
     drawing be shown once in the credits?
6. **Family touches.** Which of these do you want?
   - A two-line Mira cameo in the epilogue, heard but not drawn.
   - The three star-tiger stars from Mira's epilogue twinkling outside the window.
   - A small "Publicerad!" clipping on the wall in the table scenes (no magazine name or layout).
   - Recorded voice lines: your neigh for Gnägg? Mira as Klo? Alva after the reveal? Like the rest of the game,
     they would be public.
7. **Dedication.** Will you write it? (Placeholder until then.)
8. **Mira.** Will Mira play it too? If yes, she gets her own save slot (§8.6) with the easier help mode (§4.4).
   Can she keep the secret?

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
   the sun half behind outline clouds, the m-gulls, the splash, and her handwritten "SKÖLD häst". The tableau
   near the end is the same picture, restored.
2. **Both halves are fun to play.**
   - **Horse:** the gallop *does* things. It leaps gaps, inks dashed pencil paths, blows seed-fluff and drums on
     hollow planks.
   - **Turtle:** hiding *does* things. It stills water, lures shy creatures, sinks like a stone onto pressure
     plates and drifts with currents that swimmers can't ride.
3. **Someone finally takes on her mystery.** Professor Klo, a very precise crab, measures the sköldhäst with a
   stopwatch and two signs, SKÖLDPADDA and häst. This is the running joke. At the very end, folding the sign
   turns it into her own label (§3.4).
4. **Three big moments.**
   - The prologue freeze.
   - *Stora språnget*, the biggest leap in the game, off the steppe onto Klippudden.
   - The finale: PLASK, the page unfolds, and a no-fail gallop *with* the returning waves over the steppe into
     golden evening, ending in Stora språnget again.

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
| **Hoppa / context** (button) | — | Hoppa by default (a buck at walk, a leap at speed). Near things it becomes Knuffa, Dra, Prata, Läs, Skaka, Färglägg or Rita. |
| **Gnägg** (tap the sköldhäst, or N) | horse | A neigh on land, "blubb" under water. Gulls scatter and the crab drops its signs. Never needed. |
| **Alvas penna** | Alva | In the prologue she draws a gull and a cloud *freely*, and they live on in the world. Elsewhere (one or two story moments and the final stroke) she taps or traces generous anchors. It can never fail. |

### Scope of version 1

About 55–75 minutes in three chapters, released one at a time. Kapitel 1 is a complete, lovable game on its
own (§7).

Not included: combat, lives, fail states, timers you can lose to, precision platforming, handwriting judgement,
a photo album (that is Mira's game), a rescue or reunion plot (also Mira's), online services or live AI.

---

## 2. Alva's creature: fidelity contract (from the photo)

The reference is Alva's colored-pencil drawing, printed in a children's magazine under the heading "Sköldhäst".
Pappa holds the photo, and working copies live only in the session scratchpad. **Nothing from the photo,
including her exact wording, is committed until Pappa answers §0 Q5.**

### 2.1 Her words (canon, paraphrased here until §0 Q5)

Her printed text is four sentences:
1. Sköldhästar are fantastic.
2. They are as happy stretching their legs in a gallop over the steppes ("stäpperna") as hiding in the kelp
   forests of the deep sea ("gömma sig i kelp-skogarna").
3. Nobody knows whether it is the world's fastest turtle or the world's slowest horse.
4. She hopes some researcher ("någon forskare") will take on that mystery.

What the game takes from this:

- **Sköldhästar are a species.** The player is one sköldhäst, and there are others in the world, seen only far
  away. Its name and pronoun are Alva's to choose after the reveal. Until then it is "sköldhästen" and "den".
- **The steppe gallop** gives the land region, *Stäppen*, and the horse verbs.
- **Hiding in the kelp forests** gives *Göm dig* and the sea region, *Kelpskogen*.
- **Her open question** stays open. The game gathers evidence for both answers and ends with
  "Forskningen fortsätter."
- **Her hoped-for researcher** is Professor Klo. Alva herself is the *chefsforskare* (§3.2).

How her text is used depends on §0 Q5:
- **(a)** it appears verbatim on the journal page "Fältanteckning av Alva";
- **(b)** only her question and "Sköldhästar är fantastiska" are quoted;
- **(c)** everything is paraphrased, using the fallback lines marked † in §3.4.

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
| Legs | Sturdy, straight, draft-horse-like. Only the near fore and near hind are clearly visible, so the far legs are hidden or overlapping, extrapolated and drawn one pencil darker. |
| Kelp fringes | Long dark-green leaf-strands covering roughly the lower half of each leg down over the hoof, like draft-horse "feathers". They are the visible link to her kelp forests. |
| Hooves | Large, dark brown, with vertical pencil strokes. |
| Tail | **Very long**: orange-red with deep red streaks and paler peach outer strands. It falls from under the shell's rear rim and fans out a little. It reaches the sand and ends in a tapered point just behind the hind hoof (about 1.4× the leg length). Never shorten it. |
| Ground shadow | A brown, loosely hatched shadow patch on the sand under and between the hooves. In play it becomes a hatched contact-shadow sprite that follows the planted hooves and fades out in water. |

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
- **Other sköldhästar** use her palette unchanged, varied only in size, pose and pencil pressure (never
  recoloured plates, mane or coat), until Alva says how other sköldhästar look.

**Never add**, unless Alva asks:
- Horns, wings, armour, saddle, rider or clothes.
- A glowing or fiery mane, or glowing shell patterns.
- A turtle beak or turtle head, or a head that retracts into the shell.
- Recoloured plates.

### 2.3 Her composition (prologue, first playable frame, final tableau)

- A sandy beach at the waterline, with the sköldhäst facing right and standing square.
- Her brown shadow patch on the sand under the hooves.
- A white-foam wave splashing against its front hooves. Foam and flying droplets are paper-white shapes outlined
  in dark-blue pencil over blue hatching, with no solid blue dots.
- Blue pencil gradients for sky and sea, blending with no drawn horizon line.
- A dark-blue pencil **waterline**, where the sea meets the sand, running straight across behind the legs. This
  is the line the prologue's third stroke continues.
- Ochre sand.
- A yellow sun with ray lines and a soft yellow glow, half hidden behind clouds drawn **as outlines only**. Each
  cloud's inside is plain white paper that covers the sun and is never coloured in.
- Three "m" gulls at the upper right.
- **The label "SKÖLD häst"**, hand-lettered in dark graphite. Trace it from the reference; never set it in a
  font.
  - SKÖLD is in capitals, except that the Ö is a small o with a short bar above it instead of two dots. The L is
    full height.
  - "häst" is in lowercase, with a bar over the a instead of dots.
  - One wavy underline runs under both words, rising to the right, and the whole label slants up to the right.
  - It sits over the sea just right of the head, from muzzle height down to collar height.

All of this is recreated in code; the photo itself is never used as game art. The magazine's arrow and layout
are not part of her drawing. Pappa's red scribble is filled by continuing the neighbouring sea hatching, the
waterline and the edge of the foam, adding no new objects. With a scan (§0 Q1), use what she drew there.

### 2.4 Medium

Colored pencil on white paper: directional hatching, paper showing through, thin graphite contours and soft
blended build-up where she blended (her sky). **No watercolour, no pixel art.** Daylight is the default.

### 2.5 Credit and privacy

- **Title screen and credits:** "Sköldhästar är påhittade och ritade av Alva."
- **Journal title page:** "Sköldhäst – först beskriven av Alva". A Latin name such as *Chelonippus alvae*
  (Greek *chelōnē*, turtle, + *hippos*, horse) is offered as a suggestion she may rename.
- **Dedication:** written by Pappa.
- **Privacy:**
  - First name only. Never her surname, the magazine's name, issue, school, town or portrait.
  - The full page photo is never committed, and the areas Pappa scribbled over are never reconstructed.
  - A **scan of the original** (§0 Q1) is handled like the photo. The full scan stays out of the repository;
    only cut creature parts are committed, after Pappa's OK (§0 Q5) and a check that no name or signature is
    included.
  - **Voices:** any recording of Alva or Mira becomes public on release. Record only with Pappa's specific OK,
    and never with a surname, school or town in it.
- **Sign-off:** Pappa approves the likeness before any scene art (§7). After the reveal, Alva has the final say.
  Her answers (the bands, the name and pronoun, foals, and anything else she decides) become canon, credited
  "enligt chefsforskaren Alva".

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
- **Professor Klo**, a small, very precise crab with a notebook, a stopwatch and two signs, **SKÖLDPADDA** and
  **häst**. SKÖLD and häst are traced from Alva's label and PADDA is lettered to match, so the folded sign in the
  finale reads as her label.
  - It is the "forskare" from her text: pompous, loyal and funny.
  - It ducks into its hole when a gallop comes within 2 HL, but from farther off it times you with the
    stopwatch.
  - It is never an obstacle and never a quest-giver chain.
- **Kartväktaren**, an old man of folded paper who lives in Pappersfyren. He is anxious and tidy, and writes with
  a ruler. His map has only two pages, LAND and HAV.
  - The shore is never finished, because every wave redraws it, and he fears that an unfinished line will tear.
  - When the waterline began to run off the page, he folded the sea away along a ruler line out at sea, right
    across Alva's stroke, to protect the drawing.
  - **The mistake was his fear, never her line**, and he tells her so in Kapitel 3.
  - He is not a villain. He unfolds the page himself at the end, and redraws the shore in *blyerts* (pencil) so
    the waves can move it.
- **Alva**, the *chefsforskare* on the other side of the paper. We see her pencil in first person, and at most a
  sleeve cuff, never her face. She draws the prologue strokes and the final stroke. The journal is hers, but its
  hint notes are Klo's (§4.4).
- **Other sköldhästar**, seen in a few far-off glimpses: the first on Galoppbanan, more if she looks. They are
  never lost, found or reunited: that is Mira's story.
- **Optional (§0 Q6):** Mira and Pappa, heard in the epilogue in speech boxes. They are never drawn (at most a
  hand or sleeve, in pencil).

### 3.3 World rules (set up early so the ending is fair)

1. **What happens to the map happens to the world.** Klo demonstrates this in Kapitel 1 with a torn map corner:
   it folds the corner and a dune folds up, then unfolds it.
2. **Where the page was folded, lines broke into dashes.** On land, a galloping sköldhäst inks dashes solid
   again. At sea, dashed current lines carry only a hidden shell.
3. **Only the waves and the sun stopped.**
   - The splash hangs in mid-air, no wave reaches the shore, and the sun hangs at her noon.
   - Under the surface the currents still run.
   - When the splash lands, the waves and the day start again and run into golden evening.
4. **Still water shows the page as it should be, unfolded.** That is why the pool in P2 shows an open arch, and
   why the lighthouse is lit only in its reflection: on the folded page its shutters are shut. Klo says it once,
   at P2: "Spegelbilden visar hur sidan ska se ut!"
5. **The fold** is a ruler-straight line out at sea, parallel to the shore.
   - From the beach it is the crease along the horizon. The open sea beyond it is folded under: that is
     "havet mellan sidorna".
   - Under water the fold is **Veckmuren**, and it stays shut until Kartväktaren unfolds the page.
   - Mörka valvet, Kelphjärtat, the outflow and Spegelviken all lie on this side of it. Pappersfyren stands on
     the fold itself.
6. **Her outline clouds and m-gulls are her style, not damage.** A joke teaches this early:
   - Klo: "Varför är molnen inte färglagda?"
   - Sköldhästen: "Moln är vita, Klo."

### 3.4 Beat outline

† marks a line that uses her printed words, so it depends on §0 Q5 and has a fallback.

**Prolog: Ett streck till (about 1.5 min, first person)**

1. Her paper drawing on the table, recreated in code, with her pencil: its tip, its shadow, and a sleeve cuff at
   the frame edge.
   - A caption shows her last two sentences, as if she is reading them.†
   - Fallback (Q5 c): "Häst eller sköldpadda? Ingen vet. Det behövs en forskare!"
2. A tiny crab climbs out of the drawn sand:
   - Klo: "Forskare? Här! Professor Klo – expert på allt som bor både på land och i vatten."
   - Klo: "Hittills mest krabbor."
   - From this moment her foam loops, droplets fall and the sun's rays turn slowly, so the freeze will be
     visible later.
3. The player draws three strokes in the white margin, *outside* her finished picture.
   - **"Rita en mås!"** and **"Rita ett moln!"** are drawn freely over a faint ghost.
     - Any stroke is accepted, smoothed to at most about 200 points, drawn in pencil and saved in the slot. A
       stroke that is too short, or keyboard play, gives a plain m-gull or outline cloud.
     - The new gull flies off; later it is the hint gull (§4.4). The new cloud drifts over Stranden.
     - Neither ever enters her composition.
   - **"Rita strandkanten vidare – ut på det vita papperet!"** is traced along generous anchors, because P8
     reuses this line. The waterline starts to run off the picture, and the world starts to grow.
4. Halfway through that third stroke, at a fixed authored point so it cannot fail:
   - *Prassel.* A dead-straight crease flicks across the horizon from outside the page and cuts her line short.
   - The splash stops in mid-air, the sun stops, and one drop rolls *upward* over the paper. This works even with
     the sound off.
5. The sköldhäst blinks and looks down: "Alva … vågen har fastnat."
6. Choice: **[Vad hände?]** or **[Vem gjorde så?]**. Both lead to:
   - Sköldhästen: "Titta – ett veck. Någon har vikt sidan."
   - Klo: "Äntligen ett riktigt mysterium!"
   - Sköldhästen: "Då får vi forska på det."
7. The camera dives into the page. The first playable frame is exactly her composition.

**Kapitel 1: Stranden och stäppen (about 20–25 min)**

- **Her beach.** Walk, gallop, Hoppa and Gnägg; the gulls scatter.
  - The sea froze with the wave: beyond the foam line it stands still and glassy out to the horizon.
  - The sköldhäst can wade and splash in the shallows (under 0.6 HL) and Skaka at the shell row. It balks at the
    frozen foam, where Hoppa is a buck in place.
  - Until PLASK, Vattenporten is the only way into swimming water.
- **Klo's stopwatch gag** (by about 2:30). Klo times the gallop from behind a rock:
  - Klo: "Fyrtiotvå komma sju kilometer i timmen!"
  - Klo: "För en sköldpadda är det världsrekord. För en häst är det … helt okej."
  - Sköldhästen: "Helt OKEJ?!"
- **Göm dig tutorial.** The sköldhäst stamps, and the stamp sends Klo into its hole. It comes out only when the
  sköldhäst hides.
  - If the sköldhäst stands within 3 HL for 4 s without hiding, Klo's eyes peek out at the shell and the Göm dig
    button pulses once (no text).
  - Then: Klo: "Häst eller sköldpadda?" / Sköldhästen: "Ja." / Klo: "… Jag behöver tänka en stund."
- **Rule demo** with a torn map corner signed /K: "Det som händer med kartan händer med världen!"
- **Spången**, the hollow dune boardwalk on the way (O3), teaches Trumma.
- **P1 Streckbron.** A note on a post by the dashed arch says "OBS! Ofärdigt streck. Rör ej! /K". Klo:
  - "K? Det är inte jag! Jag kan inte ens hålla i en linjal."
  - "Men vem skriver så prydligt? Med linjal, dessutom!"
  - "Det här är ju Alvas streck. Då får vi väl rita vidare?"
- **Stäppen.**
  - Galoppbanan: a free gallop of 40 s or more, fjädergräs, and low hurdles cleared automatically.
  - The first distant sköldhäst watches from the ridge, then lies down under its shell and becomes a "rock" as
    you approach. Sköldhästen: "Det finns fler!"
  - P3 Backsippornas fjun, up Vågmärkesbranten to the wave-mark ledge. Klo: "Havet har varit här uppe!"
- **P2 Spegelpölen** opens Vattenporten into the sea.
  - The kelp entry is the swim, sink and drift tutorial, with a stretch of open surface and floating kelp to
    dolphin-leap over.
  - Klo, whispering: "Du gömmer dig jättebra. Förutom manen. Den syns ända upp till ytan."
- **Chapter hook, Veckmuren.** It plays once P2 and P3 are both done. P1 is implied, because it is the way to
  the steppe.
  - Until then, Veckmuren is visible from the kelp entry, and Klo says: "Vänta! Först måste vi mäta vågmärkena
    uppe på stäppen."
  - The hook: a ruler-straight crease cuts through the sea like a glass wall, with water piled up behind it.
    - Sköldhästen: "Någon har vikt det här."
    - Klo: "Med linjal."
    - Beyond the fold, on the white paper, a thin paper figure with a ruler hurries out of sight. Sköldhästen:
      "Vem var det där?!"
  - End card: Forskningsrapport nr 1.
  - Afterwards, play continues freely in Kapitel 1's world. The paths beyond it are white paper: "Nästa sida
    kommer snart."

**Kapitel 2: Udden och djupet (about 20–25 min, P4 and P5–P6 in either order)**

- **Opening at the kelp entry.** Klo's torn map corner shows a map mark torn in two, drawn as an empty outline.
  - The "Vad vet vi?" page reads: "Hitta märkets två halvor – en på land och en i havet."
  - Each half-mark, when found, is drawn into its half of the outline.
- **P4 Stora språnget** onto Klippudden finds the *Landmärket* among the high wave marks.
  - Klo: "Fem hästlängder! Nytt rekord för sköldpaddor. Och för krabbor."
  - From Klippudden: "Fyren lyser – men bara i spegelbilden."
- **P5 Lyktfiskarnas väg** and **P6 Strömkarusellen** in Kelpskogen find the *Havsmärket*.
- **Along the way:**
  - A second note: "Snälla, rör inte strecken. Det är för teckningens skull. /K"
  - More far-off glimpses of other sköldhästar, and old hoofprints in the kelp sand.
- **End**, the same whichever half-mark is found last:
  - The outflow from Kelphjärtat opens, and the view follows it to the mouth of Spegelviken. The lamp shines in
    the reflection. On the real lighthouse, the paper figure peeks out through a shutter and snaps it shut.
  - Klo: "Nu vet han att vi kommer."
  - Forskningsrapport nr 2, then "Nästa sida kommer snart."

**Kapitel 3: Pappersfyren (about 15–25 min, including the final)**

- **P7 Pappersfyrens tre luckor** lights the real lamp and brings out Kartväktaren. It is his first line on
  screen, though he has "spoken" through two notes.
- **The talk** has two points where control returns, so it is never more than three boxes at a time.
  - Kartväktaren: "Strandkanten blir aldrig färdig. Och ett ofärdigt streck kan bli en reva."
  - Kartväktaren: "Så jag vek bort havet. Det var för teckningens skull!"
  - *Control returns; the player walks to the map and presses Prata.*
  - Kartväktaren: "Här står LAND. Och här står HAV. Var ska jag skriva dig?"
  - Sköldhästen (quietly): "Jag finns visst inte på kartan."
  - Klo: "Då är det kartan som är fel. Inte du."
  - *Klo climbs onto the map and taps its shoreline; the player presses Prata at the map.*
  - Sköldhästen: "Strandkanten ska inte vara färdig. Den flyttar sig med varje våg."
  - Sköldhästen: "Det är där jag bor – precis i mitten."
- **P8 Det sista strecket.** The line Alva began in the prologue, cut short by the fold, appears as one glowing
  dashed line.
  - The land half is galloped.
  - The sköldhäst leaps off the pier's end.
  - The sea half is drifted while hidden.
  - Alva's pencil finishes her own line with the last stroke.
- **Kartväktaren chooses.** He unfolds the page.
  - Kartväktaren: "Förlåt, Alva. Det var inget fel på ditt streck. Det var bara inte färdigt än."
  - Kartväktaren: "Jag ritar strandkanten i blyerts. Då kan vågorna flytta den."

**Final: Havet hittar hem (about 3 min, counted in Kapitel 3)**

- **PLASK.** The splash lands on the hooves and time starts in the same instant: the waves roll, the gulls fly,
  the foam moves. The view holds her exact composition for 2–3 s, with her three gulls back in place, while
  "SKÖLD häst" writes itself in pencil.
- **Galoppen över stäpperna** (45–60 s). No fail, nothing chasing, with an automatic speed boost.
  - The route is not P8's pier. It runs left along the surf line, where the returning waves splash the hooves as
    in her drawing:
    - over Spången, whose planks play the first phrase of the theme;
    - across the inked Streckbron, where gulls burst up;
    - through the fjädergräs and backsippa fluff of Stäppen;
    - round the Galoppbanan loop and down the long slope.
  - Three automatic språng rise in height. Hoppa adds a mane-and-tail flourish but is never needed.
  - Other sköldhästar run along the far ridge and never come close: always the one from Galoppbanan, more if she
    saw more.
  - **The peak** is Stora språnget onto Klippudden in golden-evening light, with the slow-down at the top of the
    arc and the full arrangement. Then 1–2 s of silence on the view from Kapitel 2, now with Pappersfyren lit
    both above the water and in its reflection.
  - A reduced-motion variant is included.
- **Klo's conclusion, on Klippudden, as the cool-down.** Klo folds PADDA off its SKÖLDPADDA sign. Held next to
  "häst", it now reads "SKÖLD häst", her own label.
  - Klo: "Slutsats: För en sköldpadda – världsrekord. För en häst – helt okej."
  - Klo: "För en sköldhäst … precis lagom."
  - Klo: "Mer forskning behövs!"
- **Epilogue at the table, at dusk.**
  - A wet hoofprint beside her drawing and a new note: her question, in her own words,† followed by
    "Forskningen fortsätter."
  - Fallback (Q5 c): "Snabbaste sköldpaddan eller långsammaste hästen? Forskningen fortsätter."
  - Optional, off-screen: Mira: "Varför är teckningen blöt?" / Alva: "Forskning."
  - Optional: three stars twinkle in the window.
- **The journal's last page:** "Slutsats: Sköldhästar är fantastiska.† Forskningen fortsätter.", then
  "Din anteckning:", where she can write her own finding. Free exploration continues.
  - Fallback (Q5 c): "Slutsats: Mer forskning behövs."

### 3.5 The theme, in one image

The **shore** is the place where land meets sea. Every wave redraws it, so it is *meant* to stay unfinished, and
a creature that is both horse and turtle belongs exactly there.

Kartväktaren fears that unfinished line; the sköldhäst lives on it. That single image carries both of v1's
themes: "you don't have to choose half of yourself" and "an unfinished line is room to continue". It also fits
the title: the sea between the pages is the part that got folded away.

The theme is *played*, not narrated. The last puzzle needs the land half (gallop) and the sea half (drift) of the
same line, and then Alva's own stroke.

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
- **The sköldhäst's lines** are never voiced, stay one box at a time, and live under `horse.*` in
  `content/sv.mjs`. If Alva decides it doesn't talk, they become narration in one strings patch, and Klo says the
  key lines instead.
- **Swedish style:**
  - Speaker boxes as in Mira (`mira/mira-content.js:597–625`); address the player as *du*.
  - Swedish quotation marks (” ”) and dashes (–); decimal comma.
  - Plain child words over loanwords and abstract words: *vattenpöl*, not *pool*; *ström*, not *flöde* (which
    sounds like a social-media feed).
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
- **Camera and scale.**
  - The camera leads ahead of a galloping sköldhäst and eases out with speed. At full gallop the view is at
    least 5 HL wide, with at least 3.5 HL ahead of the muzzle (about 0.6 s at 6 HL/s).
  - In portrait (360–390 px wide), that means the hero is drawn at about 75–80 CSS px while galloping. Within
    1 s of slowing, and always at rest and in puzzles, it returns to its portrait size of about 100–110 CSS px
    (at least 3.3 HL visible).
  - For Språng arcs longer than the view (P1, P4, P8, the final), a scripted pan starts at the språngkant, so
    the landing shows before touchdown.
  - Hurdles and språngkanter are signposted early.
  - As in the other two games, the start screen in portrait shows a rotate hint ("Rotera telefonen för bästa
    upplevelse"). Portrait stays fully playable.
- **Settings:**
  - *Håll kvar galoppen* (off by default): "När du släpper fortsätter sköldhästen att galoppera – tills du styr
    åt andra hållet."
  - *Följ fingret*: the sköldhäst follows a held finger. This disables tap-to-neigh.
  - *Håll inne för att gömma dig*: hold instead of toggle.
  - *Större text*, *Mindre rörelse*, and volume sliders for *Musik*, *Ljud* and *Röster*.
  - Help level (§4.4).
- **No gesture needs timing, mashing or two simultaneous inputs.** There is no double-tap and no tap-anywhere
  jump.

### 4.2 Verb rules (starting values; HL = one horse length)

**Springa (land)**
- Walk 1.6 HL/s, trot 3.2 HL/s, and gallop 6 HL/s after about 1.2 s of full input. "Galopp" means at least
  5 HL/s.
- Release the stick and it stops in about 0.6 s with a settle pose. Reversing at gallop is a 0.35 s skid turn.
- Lips up to 0.25 HL are stepped over; slopes up to 35° are walkable.
- Hooves have their own sounds for sand, wet sand, planks and shallows. Drums join the music at trot, and the
  whole band plays at gallop.
- **Gallop feats**, all automatic and never timed:
  - **Språng.** A gallop leaps an authored arc at a *språngkant*: a hoof mark and a pencil tick on the edge, or a
    scuffed plank end on wood (never flattened grass). Below gallop speed the sköldhäst balks: it stops at the
    edge, looks down and snorts. There are no pits anywhere.
  - **Streck.** A dashed pencil line is refused below gallop and inked at gallop.
    - Once on a dashed segment (10 HL long at most), speed is held until its end, even if the stick is
      released.
    - Inked segments stay and become solid ground.
    - Gallop hoofprints on marked wet sand turn to graphite, which is how the idea is taught. Prints appear only
      in authored wet-sand zones and clear when the player leaves the scene.
  - **Galoppvind.** A short wind trail behind the gallop bends grass, blows seed-fluff in the running direction
    and spins pinwheels. The bent grass stays as a trail, so no information is ever time-limited.
  - **Trumma.** Each gallop footfall on hollow planks advances a drum ratchet one notch, and ratchets never slip
    back. Walking only makes them wobble.
- **Hoppa button.**
  - A buck at walk, a leap at trot or gallop, and a dolphin leap when crossing the surface upward.
  - At a språngkant, Hoppa at gallop does the same as galloping off it. Below gallop the sköldhäst balks there,
    button or not.
  - A free jump or dolphin leap rises at most 0.5 HL, and never carries the sköldhäst past an edge or a balk
    line (such as the frozen foam at Stranden). Near any edge that is not a språngkant, Hoppa is a buck in place.
    Every required barrier is at least 1 HL high, so jumping can never skip a puzzle.
  - **Hoppa always pays off somewhere.** Each region has 3–5 *hoppställen* 0.3–0.5 HL high (driftwood, a flat
    rock, a dune crest), each with a small reward on top: a färgpenna, a shell that plays a note, or gulls that
    take off.
  - Pressing Hoppa on the run-up to an automatic hurdle (the last 3 HL) or during its leap gives a
    *stilsprång*: a higher arc, a tail whip and a burst of gulls. The hurdle is cleared either way.

**Simma (water)**
- Swimming starts when water is deeper than 0.6 HL and ends below 0.4 HL (hysteresis).
- Two-axis movement at up to 2.2 HL/s; the glide settles in about 0.8 s.
- Buoyancy is near-neutral below a one-HL surface band, so lingering in "havets djup" is easy.
- The shell tilts up to ±30° with heading and the head stays nearly upright.
- A swimmer rides a current at 40% of its speed and can always swim out sideways. Kelp halves speed but is never
  a wall.
- Shore exits are authored ramps, tested in both directions.
- **Wet coat and Skaka.** After swimming or wading, the sköldhäst stays wet (dripping, darker coat) until 30 s
  after it leaves the water, and wading keeps it wet.
  - While wet and standing still, the context button reads **Skaka**, unless a nearer target takes priority.
  - Each shake throws a spray of drops without drying the coat.
  - At walk, trot or gallop the button reads Hoppa.

**Göm dig / Kom fram**
- **Pose:** the horse lies down with its legs folded and its neck low, the shell on top, and the mane tuft and
  tail still showing. It stays recognisable and easy to find. There is no head retracted into the shell. The
  pose must pass the Stage 0 likeness review (§7.3).
- Tucking in or out takes 0.3 s. While hidden there is no steering.
  - The sköldhäst comes out with the button, or by holding the stick for 0.5 s on flat ground.
  - In a current, a visible "Kom fram" label stays up.
- **Pressed mid-motion:**
  - During a Språng or on a dashed segment, Göm dig waits until the sköldhäst lands or reaches the segment's end.
  - At trot or gallop, the sköldhäst first stops (about 0.6 s), then lies down.
  - A hidden shell on land never slides.
- **Rules:**
  1. **Still.** Water within 5 HL settles to a mirror in 1 s. A standing sköldhäst still drips and shifts, so
     only hiding makes a true mirror.
  2. **Deep water: weight.** It sinks at about 0.8 HL/s and rests on the bottom. Pressure plates react only to a
     hidden shell ("tung som en sten").
  3. **Currents: drift.** It moves exactly with the flow, including dashed current lines that only a hidden
     shell can follow. Every current ends in a calm pool with an exit.
  4. **Kelp beds: anchored.** The kelp fringes blend in, a visual joke with the mane sticking out.
- **Precedence while hidden:** kelp bed (anchored) > current or dashed current line (drift) > deep water (sink) >
  ground (still).
  - A sinking shell that enters a current starts drifting, and sinks again in the calm pool at its end.
  - No current lane runs through a kelp bed.
- **Shy creatures** within 4 HL of a hidden shell, still or drifting, come out after 1–1.5 s. Lyktfiskar also
  follow a drifting shell.
  - Walking or swimming near them sends them home.
  - Home is their start, unless a puzzle commit moves it: after P5 the lyktfiskar live in Mörka valvet.

**Context verbs** (on the Hoppa button when slow and within about 1.2 HL of a target, shown with a marker):
- *Knuffa* moves an object one notch along a short rail.
- *Dra* pulls a rope or flap; press again to let go.
- *Prata*, *Läs*, *Skaka* and *Rita* do what they say.
- *Färglägg* colours a grey-hatched prop with a found färgpenna (O6).
- At gallop the button always reads Hoppa.

### 4.3 Kindness rules

- There are no lives, timers you can lose to, drowning, pits or lost progress.
- The sköldhäst **refuses instead of failing**: it balks at an edge, snorts at a thin dashed line, or bobs back
  up. A refusal always shows *why* through a pose or a glance.
- Every puzzle is a small state machine with:
  - a **commit point**, after which it never resets;
  - a **local reset**: an unlatched object returns to its start when the sköldhäst leaves the puzzle area or uses
    "Jag har fastnat";
  - a **save rule**: on load, uncommitted objects return to their start;
  - a **return route**: every Språng works both ways or has a visible way back, and every current ends in a calm
    pool with an exit;
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
| 1 | After 90 s, Alva's own gull from the prologue (above water) or a small fish (below) circles the spot. At the same time the Forskningsdagbok button gets a small pencil mark that wiggles once. |
| 2 | *Visa en ledtråd*: opening the book goes straight to the current page, where a pencil note from Klo sits in the margin, marked with a small claw doodle (never "/K"). |
| 3 | *En ledtråd till*: a pencil ghost-sketch of the action (a still frame under reduced motion). |

Help levels are stored per save slot:
- **Utforska i lugn och ro** halves the timers (20 s and 45 s). It is suggested for Mira's slot.
- **Lagom**, the default, uses the timers above.
- **Lite mer klurigt** doubles them.

### 4.5 Puzzle catalogue (8 required)

- At most two puzzles rely on reflections, and at least three need speed.
- Every puzzle is taught before it is tested.
- Before its build session, each entry gets its commit point, local reset, save rule, hints 2–3, return route
  and portrait framing: P1–P3 in Stage 1, the others in the first session of their chapter.

| # | Name | Where | Verbs | The aha |
| --- | --- | --- | --- | --- |
| P1 | Streckbron | The dry tide gully between Stranden and Stäppen | Springa (Streck) | "Galoppen ritar färdigt." |
| P2 | Spegelpölen | Stranden, the rock pool by the sealed Vattenporten | Göm dig (still), Knuffa, Streck | "The reflection shows the page as it should be. Make it match." |
| P3 | Backsippornas fjun | Stäppen, Vågmärkesbranten | Galoppvind | "The fluff flies the way I run." |
| P4 | Stora språnget | Stäppen plateau → Klippudden | Springa (Språng) | "I need a longer run-up. Where can I get one?" |
| P5 | Lyktfiskarnas väg | Kelpskogen, Mörka valvet | Simma, Göm dig (drift, shy creatures) | "Drifting counts as hiding." |
| P6 | Strömkarusellen | Kelpskogen, Kelphjärtat | Göm dig (drift, weight) | "Don't fight the whirl. Let go." |
| P7 | Pappersfyrens tre luckor | Spegelviken, Pappersfyren | Trumma, Göm dig (weight, drift), Dra | "Each shutter needs a different half of me." |
| P8 | Det sista strecket | Stranden → Trumbryggan → under Spegelviken | Streck, Språng, Göm dig (drift), Alvas penna | "The horse draws the land, the turtle draws the sea." |

**P1 Streckbron**
- **Setup:** a dashed pencil arch spans a 4 HL gully, with packed wet-sand runways on both sides.
- **Solution:** walking onto it balks; galloping inks it solid.
- **Taught:** in the first minute, walk prints fade but gallop prints turn to graphite, and a small dashed dune
  step on the natural running line gets inked by accident.
- **Margin note (level 2):** "Titta på hovspåren i sanden. Vilka blir kvar?"

**P2 Spegelpölen**
- **Setup:** the pool ripples whenever the sköldhäst moves nearby. Hidden, it goes mirror-still, and the
  reflection shows the cliff with an open arch and a small fish swimming through it. Klo: "Spegelbilden visar
  hur sidan ska se ut!" The reflection also shows two differences from the real beach:
  - a round stone that sits at the arch's foot in the reflection, but four rail-notches away in reality;
  - a plank over a rock crack that is dashed in reality but solid in the reflection.
- **Solution:** push the stone (Knuffa) and gallop the plank from a beach run-up. When the world matches, the
  arch draws itself open and Vattenporten leads into the sea. Each difference latches when matched.
- **Taught:** Klo (Göm dig), the dashed dune step in the first minute (Streck), and the pool rippling as the
  sköldhäst trots past.
- **Margin note:** "Göm dig vid pölen och jämför spegelbilden med stranden."

**P3 Backsippornas fjun**
- **Setup:** three dotted empty tussocks sit on ledges up the escarpment. Galloping through a clump of giant
  backsippa seed heads blows its fluff on a fixed arc in the running direction. Fluff landing on a dotted tussock
  grows it into a walkable grass ramp (35° or less) up to the next ledge.
- **Solution:**
  - The first ledge works with a natural rightward run.
  - The second needs a leftward run, because a boulder leaves the runway only on the right.
  - The third needs a run along the first ledge.
  - Fluff regrows in 4 s, and the landing spot is fixed for each clump and direction.
- **Result:** the third ramp reaches the wave-mark ledge at the top. Klo measures the marks.
- **Taught:** at the steppe entrance, one lone backsippa fills a small tussock by the path.
- **Margin note:** "Titta vart fjunet flyger när du springer förbi."

**P4 Stora språnget**
- **Setup:** Klippudden lies across a 5 HL dry cleft. The near runway is short and uphill, so the sköldhäst only
  reaches trot and balks.
- **Solution:** gallop the long Galoppbanan loop around the hill and come down the long slope, reaching full
  gallop at the edge. That gives the biggest leap in the game, with a short slow-down at the top of the arc, a
  scripted pan to the landing, and a music sting.
- **Taught:** the small språngkant on Galoppbanan, which has a flat runway.
- **Reward:** Landmärket, Klo's measurement, and the view of the reflection-only lighthouse. A rope plank lowered
  with *Dra* makes the way back a walk.
- **Margin note:** "Kan du få mer fart någon annanstans?"

**P5 Lyktfiskarnas väg**
- **Setup:** Mörka valvet is too dark, so the sköldhäst balks at its mouth.
  - A school of *lyktfiskar* hides from swimmers and circles a hidden shell. (Lyktfiskar is the Swedish name of a
    real family of glowing fish; ours are drawn in her style and behave as the puzzle needs.)
  - A slow current lane passes along the edge of their kelp bed and then runs toward the vault. It ends in a calm
    pool at the vault mouth.
- **Solution:** hide upstream in the lane. The drifting shell passes the bed, the school follows and lights the
  vault, and the lane carries on inside. The fish then stay in the vault.
  - A shell that arrives without the school stops at the calm pool, where the sköldhäst peeks in and balks.
- **Taught:** riding the kelp-entry lane hidden, and how Klo's shy behaviour works.
- **Margin note:** "Titta på lyktfiskarna när du har gömt dig. Vad gör de?"

**P6 Strömkarusellen**
- **Setup:** this is the current that "only goes round and round". A ring about 3 HL in radius circles a calm eye
  where a folded paper corner sticks up. Swimmers in the ring keep only 30% control and are gently pushed out.
  Loose kelp leaves visibly spiral into the eye.
- **Solution:** hide. The hidden shell is drawn inward at about 0.8 HL/s and reaches the eye in about 4 s, then
  sinks onto the corner and flattens it. Havsmärket appears.
- **Result:**
  - When both half-marks are in the journal, the ring unrolls into an outflow toward Spegelviken; that is the
    Kapitel 2 end beat.
  - Until then the eye stays calm, and Klo says: "Halva märket fattas. Den andra halvan ligger nog högt upp –
    bland vågmärkena."
- **Taught:** P5 (drift), and a small paper flap flattened by accident at the kelp entry.
- **Framing:** zoom no lower than 0.8×, and the hidden shell never spins, for reduced motion.
- **Margin note:** "Titta vart de lösa kelpbladen tar vägen i strömmen."

**P7 Pappersfyrens tre luckor**
- **Setup:** the real lamp is dark. Hidden on the calm pier, the player sees in the reflection a lit lamp with
  three open shutters. Each real shutter is linked by a visible pencil chain to one mechanism:
  1. *Trumbryggan*: galloping the hollow pier turns a ratchet, and about two passes open the shutter. Until P8,
     the pier ends in a rail, so no pass ever launches into the sea.
  2. *Sänkplattan*: a seabed plate that only a sunk, hidden shell presses. It latches after 2 s.
  3. *Strömröret*: an upward current pipe. Swimmers are pushed out of its side vents, but a hidden shell rides it
     up to a small basin on the lamp gallery. There *Dra* opens the shutter, and a spiral stair leads back down
     to the pier.
- **Solution:** open all three, in any order. Each match draws a glowing line to its reflection. When all three
  match, the real lamp lights and Kartväktaren appears.
- **Taught:** P2 (reflections), Spången (Trumma), P6 (weight), P5 (drift) and P4's rope plank (Dra).
- **Margin note:** "Göm dig på bryggan och räkna luckorna i spegelbilden."

**P8 Det sista strecket**
- **Setup:** the line Alva began in the prologue, cut short by the fold, appears as one glowing dashed line.
  - It runs from her beach along the pier in segments of 10 HL at most, with runways between them.
  - The pier-end språngkant appears with the line.
  - The line continues under water as a dashed current lane to the lighthouse's lower window.
- **Solution:** gallop the land segments, leap into the sea, then hide and drift the sea half. At the window the
  two half-marks glow, and Alva's pencil draws the last stroke (tap or trace; it can't fail).
- **Taught:** Streck (P1), Språng (P4) and drift (P5–P6).
- **Margin note:** "Följ den streckade linjen med blicken. Var fortsätter den efter bryggan?"

### 4.6 Optional delights (never required for the ending)

| # | Name | What it is | Tier |
| --- | --- | --- | --- |
| O1 | Professor Klos mätningar | Four to six one-minute experiments that fill the journal with funny one-liners, never scores (below). | MUST (K1 has the first two) |
| O2 | Snäckklockspelet | After wading or swimming, *Skaka* sends drops onto a row of shells beside the frozen wave on her beach. Shake at each shell in order to play the theme; a rung shell keeps its note until the tune is complete. | MUST (K1) |
| O3 | Spången | A hollow dune boardwalk on the only path from her beach to Streckbron, so every player gallops it at least once. Each plank is a note, and the last planks turn a small ratchet that hoists a flag up a pole: the Trumma lesson for P7. Playing a whole tune is the optional part. | MUST (K1) |
| O4 | Sandpapperet | A wide flat of wet sand where gallop prints stay as pencil lines, so you draw with the horse. The tide wipes it clean after the ending. | SHOULD |
| O5 | Glimtar av flocken | Far-off glimpses of other sköldhästar (below). | MUST (the first glimpse, K1) · SHOULD (the rest, K2) |
| O6 | Färgpennor | About 15 hidden coloured pencils (below). | SHOULD (K1's five are built in Stage 2) |
| O7 | Flytbryggan | v1's buoyant platform as a toy: gallop on and it dips and splashes; hide on it and fish gather under the shell. | STRETCH |
| O8 | Kapplöpning mot Sköldpaddan Signe | After the ending, race a proud ordinary turtle. You always win. Signe: "Jag vann på stilpoäng." | SHOULD (K3 after-game) |

**O1, Professor Klos mätningar.**
- The experiments:
  - *Fartfällan*: the stopwatch.
  - *Djupmätaren*: dive past a depth line.
  - *Smaktestet*: grass or kelp? It eats both.
  - *Gömleken*: hide until the fish think you are a rock.
  - *Gnäggtestet*: a neigh on land, "blubb" under water.
  - *Språnglängden*: measured at P4.
- After each measurement Klo raises one sign, SKÖLDPADDA or häst, so the verdict tips back and forth and stays
  even until the finale. The tally is shown only by the signs, never as numbers.

**O5, Glimtar av flocken.**
- The first glimpse is on Galoppbanan (§3.4): a distant sköldhäst on the ridge becomes a "rock" as you approach.
- Later: hide at marked spots to see more, and find old hoofprints in the kelp sand.
- They are always far away, in her palette unchanged (§2.2).

**O6, Färgpennor.**
- About 15 in total: 5 in Kapitel 1 (on hoppställen and at Göm dig spots) and about 10 in Kapitel 2–3.
- Touching one picks it up. At a grey-hatched prop (a kite, a boat, a beach hut) the button reads *Färglägg*.
- One visible counter per region.
- They never colour her clouds or the creature.

### 4.7 Forskningsdagbok: one book, fixed pages

This replaces v1's journal and every other collection screen.

1. **Title page:** "Sköldhäst – först beskriven av Alva".
2. **"Fältanteckning av Alva":** her text, as §0 Q5 allows.
3. **"Vad vet vi?":** the current question, plus a pencil map showing the fold and the regions visited.
4. **"Professor Klos mätningar":** at most six one-liners, with no stars or counters.
5. **"Ledtrådar":** sketches, including the torn map mark. Its two halves are drawn in as they are found, under
   the caption "Två halvor av samma märke".
6. **Forskningsrapport nr 1 and nr 2:** three or four lines each, with their word codes (§8.6). Report 1, for
   example:
   - "Galopperar över stäpperna: bekräftat."
   - "Gömmer sig i kelpskogen: bekräftat."
   - "Fart: 42,7 km/h – helt okej för en häst."
   - "Sköldpadda eller häst? Det står lika. Forskningen fortsätter …"
7. **"Din anteckning:"** a text field of at most 200 characters, saved in her slot and shown on its card.

Hints appear as Klo's pencil notes in the margin. Only her printed text (§0 Q5) and her own later answers appear
under Alva's name.

### 4.8 World map, chapters and release boundaries

Layout, left to right, as in her picture (land on the left, sea on the right):

```
Stäppen (Galoppbanan, Vågmärkesbranten, plateau ─ cleft ─ Klippudden)
   │ P1 Streckbron ─ Spången
Stranden (hub: her composition, shell row, Spegelpölen) ── Trumbryggan (pier, gated) ── Pappersfyren (on the fold)
   │ P2 Vattenporten                                                                 │
Kelpskogen (kelp entry, Mörka valvet, Kelphjärtat; Veckmuren along its seaward edge) ── outflow ── Spegelviken
```

- **Shortcuts open from the far side.** Arriving in Spegelviken unbolts the pier gate back to Stranden.
- **Revisits** show consequences (inked bridges, coloured props, restored water) rather than repeated
  challenges.
- **Release boundaries.**
  - `content/world.mjs` holds `releasedChapter`. Places in later chapters are white paper with the pencil note
    "Nästa sida kommer snart.", and nothing leads into them.
  - In Kapitel 1 this covers the far side of the P4 cleft (its edge has no språngkant yet, so the sköldhäst
    simply balks) and the paths from the kelp entry toward Mörka valvet and Kelphjärtat.
  - `?skoldhast-dev` shows unreleased work.

| Chapter | Places | Required | Ends on | Estimate |
| --- | --- | --- | --- | --- |
| Prolog | Her table | Three margin strokes | The freeze | 1.5 min |
| Kapitel 1 | Stranden, Stäppen, kelp entry | P1, P2, P3 | Veckmuren, "Med linjal.", and a paper figure on the white paper | 20–25 min |
| Kapitel 2 | Klippudden, Kelpskogen | P4, P5, P6 | The mouth of Spegelviken; the paper figure snaps a shutter shut | 20–25 min |
| Kapitel 3 | Spegelviken, Pappersfyren, final | P7, P8 | PLASK, the gallop over the steppe, the epilogue | 15–25 min |

Re-estimate these from timed greybox play in Stage 1–2. The first ten minutes, as Alva should experience them:

| Time | Experience | What it proves |
| --- | --- | --- |
| 0:00–1:30 | The prologue: her picture, "Forskare? Här!", her own gull and cloud, the freeze, the blink, the choice | Likeness, the hook, the tone; it works without sound |
| 1:30–3:00 | Her beach: gallop, Hoppa onto driftwood, Gnägg, gulls scatter, splashing by the frozen wave, Skaka at the shell row; Klo's stopwatch gag | Game feel, joy with no goal, humour |
| 3:00–4:30 | The stamp sends Klo away; *Göm dig* brings it out; "Häst eller sköldpadda?" "Ja."; the map-corner rule | Both halves are fun; the world rules |
| 4:30–7:00 | Spången, P1 Streckbron and the /K note; Galoppbanan with gull flocks, low hurdles and the first distant sköldhäst | Speed solves things; the mystery has a culprit; there are more of them |
| 7:00–10:00 | P3 or P2, in her chosen order; a checkpoint as she arrives somewhere beautiful, never a menu test | Real puzzles, an aha and a hook |

---

## 5. Look and sound

### 5.1 Visual legend (in the art bible, taught in play)

| Mark | Means |
| --- | --- |
| Dashed graphite line on land | "Galoppera här": the gallop inks it |
| Dashed blue line under water | A current only a hidden shell can follow |
| Hoof mark plus a pencil tick at an edge | Språngkant: gallop off it to leap; slower, it balks |
| Dotted empty tussock | A fluff target (P3) |
| Grey hatching with no colour, plus a pencil-tip glint | A prop a färgpenna can colour |
| Outline-only clouds and m-gulls | **Alva's style**: never a puzzle object, never coloured in (her gulls may fly and her clouds may drift) |
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
| 30% | The hero at rest and in motion: likeness, planted hooves and contact shadow, the flame mane, the ground-length tail, the kelp fringes |
| 12% | The pencil material system and a fixed "pencil box" of 16–20 named colours; this multiplies every asset |
| 12% | The first frame: her beach recreated, and the move from the table into the page |
| 12% | The waterline: foam outlines, splashes, wading, the underwater change |
| 12% | The theme, adaptive layers, and hoof, wave and pencil foley |
| 10% | Scene compositions per the colour script |
| 8% | Reveals when lines are restored: dashed lines inking solid, grey-hatched props filling with colour, the page unfolding. Never outline-to-colour, because outline-only belongs to her clouds and gulls. |
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
   - **Route A** (only with a scan and §0 Q5): cut the parts from her real strokes.
   - **Route B:** trace the parts in code.
   - Parts, about 17–19: head with halter, forelock and tufts, neck with collar, torso with bands, the rigid shell,
     four upper legs, four lower legs with kelp and hooves, and the tail.
   - **One rig from the start.** Gait keyframes and two-bone IK live in a pure `skoldhast/src/rig.mjs` (no Pixi,
     no DOM). The review sheet and gallop strip are rendered by the real runtime (`hero.mjs` in headless
     Chromium), so the gallop approved at H1 is the one that ships. `@napi-rs/canvas` only draws the part
     textures.
   - **Review sheet:** reference | rest pose | 50% onion overlay | phone thumbnails at 150 and 110 CSS px |
     greyscale. It also includes an 80-px gallop thumbnail, a 12-frame gallop strip, and the *Göm dig* pose
     beside the rest pose.
   - Automatic landmark checks are only a regression lock; the eye and Pappa decide likeness.
   - Committed review sheets leave out the reference column unless §0 Q5 is yes.
   - **Pivot rule:** if neither route passes after two sessions and one correction, simplify the style (clean
     outlines with flat pencil fills) before any scene art.
4. **Runtime rig** (`hero.mjs`):
   - Keyframed gait cycles driven by distance travelled.
   - Two-bone leg IK with a bend direction per joint (carpus, hock), and stance feet locked to the terrain.
   - The shell stays rigid.
   - The tail and flame tufts are textured strip meshes (100 vertices or fewer) deformed along verlet spines.
     Pixi's constant-width MeshRope can't give her widening, tapering, ground-length tail. Kelp fringes are short
     ropes.
   - A gentle outline "boil" on a separate outline atlas at about 8 fps, off under reduced motion.
   - A hatched contact shadow under the planted hooves.
5. **Scenes: a kit of parts, not huge painted layers.**
   - Tiling pencil materials (sky, sea, sand, grass, paper) plus a prop atlas.
   - Far layers at half resolution; mipmaps for layers drawn below about 0.6× scale.
   - Grey-hatch twins only where reveals happen.
   - Every texture is at most 2048 px per side; wider strips are tiled or sliced. The hero parts fit one 2048²
     atlas plus its outline-boil atlas.
   - A screen-fixed paper-tooth overlay with multiply blend, so paper never slides against itself in parallax.
   - Collision and water lines come from the same scene script as the art, so they never disagree. The asset
     build reports estimated resident MiB per scene.
6. **Review loop.**
   - Playwright contact sheets at 390×844, 360×780, 844×390 and 1440×900; a greyscale check of hero vs
     background; a 25% thumbnail for path readability.
   - Iteration renders stay in a gitignored folder; only approved sheets are committed.

### 5.5 Sound

- **One theme, "Sköldhästens visa", with its own identity, clearly not Mira's music box.**
  - A 6/8 canter pulse and a modal, Nordic *visa*-like melody.
  - **The lyre pluck** is computed in JavaScript: Karplus-Strong on a `Float32Array`, tuned with a
    fractional-delay allpass, about 1.5 s per note, and rendered once per pitch into an `AudioBuffer` when the
    game starts. Never use a `DelayNode` feedback loop for pitched sound: a delay in a cycle adds at least 128
    frames and plays flat.
  - The other instruments: a soft bowed pad, and hand-drum hoofbeats.
  - **No Mira presets.** Never reuse the musicbox, kalimba, harp, marimba, bell, celesta, guitar or flute voices
    from `pluck()` in `mira/mira-audio.js`, or its four-chord 4/4 song loops. Reusing its bus, reverb and
    sequencer code is fine.
- **Four arrangements:**
  - The table: solo pluck and pencil.
  - Land: pluck and drum, adapting to speed.
  - Sea: low-passed pad, a low drone and slow lyre harmonics.
  - Final: everything.
- **Adaptive layers:** gallop speed brings in drums and strum; entering water sweeps a low-pass filter and adds
  the sea layer; hiding thins to a near-solo; a reveal gives 1–2 s of silence, then the motif.
- **All effects are synthesized:**
  - Pencil scratches that follow the stroke speed; hooves on each surface; waves, bubbles and crab clicks.
  - A neigh needs a recording to be convincing: a CC0 clip, or Pappa's own (§0 Q6).
  - Optional CC0 wave and gull loops of at most 150 KB each, with `LICENSES.md`.
- **QA without ears.**
  - The agent renders each cue offline to WAV in Playwright, then checks level, loop seams, a spectrogram, and a
    **pitch check**: each instrument's single notes across the score's range must be within 10 cents of target.
  - Pappa rates the cues on a listening page kept off `main` (for example a private Claude artifact, so the
    surprise holds): thumbs up or down with notes.
- **Voices** (optional, stretch): Pappa as narrator, Mira as Klo, recorded on a phone with his OK (§2.5).
  Captions are always on, with a separate volume slider. Alva's own voice is added only after the reveal.

---

## 6. What we keep from v1 (and why)

- **Kindness:** no lives, no fail, no lost progress; hints that go from pointing, to explaining, to showing.
- **Presentation:** Swedish throughout; direct control of her creature; free land and sea travel.
- **Moments:** the blink, the drop rolling upward, the wet hoofprint on the table, "Forskningen fortsätter", and
  the sköldhäst's "Ja." to the crab.
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
- **Alva:** the player. After the reveal she becomes *chefsforskare* and settles the open questions about her
  creature (§7.2).
- **Mira** (optional): tester of *Utforska i lugn och ro* (§4.4) and a voice for Klo, only if she can keep the
  secret.

### 7.2 Surprise and reveal

- The fourth button stays **hidden behind `?skoldhast`** until Kapitel 1 is released. `main` is live on GitHub
  Pages, so unfinished work must never appear to Alva by accident.
- After the reveal, every merge keeps `releasedChapter` at the last released chapter. Raising it *is* the
  release.
- **H4, the reveal**, is Alva's first play of Kapitel 1. It doubles as the only real playtest:
  - Don't help for the first 10 minutes.
  - Note where she hesitates, smiles or asks.
- **Afterwards, ask her three things:**
  1. What her sköldhäst is called, and whether it is han, hon, hen or den.
  2. What the brown bands on its chest are.
  3. What lives deepest in the kelp.
- **What happens with the answers:**
  - The first two become canon as small text patches, credited "enligt chefsforskaren Alva".
  - The third may appear as a background creature or a journal sketch in Kapitel 2, if Pappa approves.
  - Promise nothing else: Kapitel 2–3 are already designed. Asking "what should it find next?" would invite
    "its family", which is Mira's story.

### 7.3 Stages and checkpoints (sizes in agent sessions)

| Stage | Sessions | Deliverable | Pappa checkpoint |
| --- | --- | --- | --- |
| 0. Decisions and likeness | Pappa evening + 2–3 | Pencil kit; hero review sheet (route A and/or B) with the gallop strip and the Göm dig pose; portrait (360×780, 390×844) and landscape greybox mockups of the beach at gallop and at the pool, stating hero size and look-ahead | **H1** (15 min): likeness yes or no for the rest pose, the gallop strip and the Göm dig pose (at most three corrections), plus a two-minute look at the mockups on the real phone |
| 1. Feel | 1–2 | The one-line Mira launch-race fix, as its own PR (§8.3). A hidden test page: rig, walk/trot/gallop, Språng, Hoppa, swim, Göm dig; the beach and pool greyboxed with P1 and P2; a `?debug` overlay. The full P1–P3 specs. | **H2** (20-min sofa test): Is it her sköldhäst? Is galloping fun for two minutes with no goal? |
| 2. Kapitel 1 | 4–6 + 1 buffer | Prologue with free strokes; Stranden, Stäppen and kelp-entry art; P1–P3; Klo; O1 (first two), O2, O3; the first flock glimpse; five färgpennor; journal; theme and effects; hints; save slots; hidden integration; tests. Art and puzzles are separate sessions. | **H3** (45 min): the whole chapter on the real device. **H4**: the reveal. |
| 3. Kapitel 2 | 3–4 + 1 buffer | Alva's answers first (text patches). Klippudden and Kelpskogen art; P4–P6; more flock glimpses; the remaining färgpennor; Språnglängden; chapter word codes; Sandpapperet if time allows; Forskningsrapport nr 2 | Sofa test, then release |
| 4. Kapitel 3 | 3–5 + 1 buffer | Spegelviken and Pappersfyren art; evening versions of the places for the final run; P7–P8; Kartväktaren; the final; the epilogue; the turtle race if time allows; a Swedish copy-edit; polish | A fresh-save playthrough, then release |

- **Total:** about 16–23 sessions. The session counts are guesses until Stage 0 shows what full-resolution pencil
  art costs. Pixel sprites were fast; this art will iterate more.
- **Pivot rules:**
  - A "no" at H1 or H2 gets one correction session.
  - A second "no" means switching route (H1) or simplifying the style or controls before building any content.
- **Suggested dates:** see §0 Q4.

### 7.4 Tiers and cut order

- **MUST** (never cut):
  - Likeness, and her composition as the first frame and the final tableau.
  - The gallop with all four feats; Göm dig; both habitats.
  - The frozen-wave spine and the researcher crab.
  - P1–P8; the no-fail final gallop.
  - Klo's Fartfällan and Djupmätaren; Snäckklockspelet; Spången; the first flock glimpse.
  - Swedish text, saving and the credit.
- **SHOULD:** Gnägg with a good neigh, Klo's other experiments, the hoppställen, färgpennor, further flock
  glimpses, Sandpapperet, chapter word codes, the turtle race.
- **STRETCH:** Flytbryggan toy, family voices, a "Rita en egen sköldhäst" page, "Nästa sida" chapters built from
  Alva's new drawings.
- **Cut order if late:** the turtle race → further flock glimpses → Sandpapperet → Kapitel 2–3 färgpennor →
  fewer music arrangements (keep the theme) → Kapitel 1's five färgpennor → a shorter Galoppbanan. Never cut a
  MUST; move the date instead.

### 7.5 Session handover rules (in `skoldhast/CLAUDE.md`, plus a root `CLAUDE.md` pointer)

1. **Start:**
   - The repo has no root `CLAUDE.md`, so add a three-line one: "Working on Sköldhästen? Read
     skoldhast/CLAUDE.md and skoldhast/HANDOVER.md before anything else." A nested `CLAUDE.md` is only loaded
     once a session reads files in its folder.
   - Read `skoldhast/HANDOVER.md`.
   - Run `node --test`, which includes the robot playthrough.
   - Confirm that `main` plays.
2. **One PR, one visible outcome.** Don't start the next chapter's content.
3. **End:**
   - `main` still plays.
   - `HANDOVER.md` is updated: done, next, decisions, known bugs, and "Frågor till Pappa".
   - Contact sheets (WebP at 390×844, 844×390 and 1440×900) are committed under `docs/skoldhast/shots/<chapter>/`
     and embedded in the PR body by their raw GitHub URL on the PR branch. For motion, join frames into a small
     animated WebP with sharp; Playwright's bundled ffmpeg writes only WebM and PNG, so no GIF.
4. **Where things live:**
   - All player-facing text in `content/sv.mjs`.
   - All art built from `scripts/skoldhast-art/` by one command.
   - Every chapter PR includes a save-compatibility test: saves from earlier chapters must load.
5. **Visibility:** the button stays hidden until H4, and `releasedChapter` changes only at a release.
6. **Release timing:** merge at least 15 minutes before Alva plays. Pages caches every file for 10 minutes, and
   module imports carry no version, so a device can briefly mix old and new modules.

### 7.6 Asset inventory

- **Hero:** about 17–19 parts; 3 eye states; strip meshes for the tail and tufts; ropes for the kelp; a contact
  shadow. Distant sköldhästar reuse it, varied only in size, pose and pencil pressure.
- **Characters:**
  - Professor Klo, with 2 signs (one foldable), a stopwatch and a notebook.
  - Kartväktaren, with a map and a ruler.
  - A school of lyktfiskar, gulls, and 2–3 shy creature types.
- **Scenes:**
  - The table scene and Alva's pencil, with a tracing pose. A hand is drawn only if a Stage 0 sketch passes H1.
  - About 12 spaces built from about 6 tiling materials and a prop atlas.
  - Props: dashed segments, rail stone, seed clumps, dotted tussocks, hoppställen, drum planks and ratchets, a
    pressure plate, a current pipe, three shutters, the crease wall, the map, about 15 pencil props, and the shell
    row.
- **UI:**
  - A title lettering traced from her "SKÖLD häst".
  - Two action buttons and the floating stick.
  - Journal pages, speech boxes, the choice buttons, the loading and error screens.
- **Audio:** the theme in 4 arrangements, 3 ambiences, and about 25 effects.

---

## 8. Technical design (for agent sessions)

### 8.1 Runtime: plain ES modules, no bundler

```text
CLAUDE.md                pointer to skoldhast/CLAUDE.md and HANDOVER.md
index.html               hidden 4th button (?skoldhast), inline loading overlay and its CSS (about 120–150 lines)
skoldhast/
  CLAUDE.md  HANDOVER.md  skoldhast.css  files.json (first-playable file list, written by the asset build)
  vendor/pixi-8.21.0.min.mjs  vendor/PIXI-LICENSE     (self-contained ESM, MIT, ~234 KB gzipped)
  src/main.mjs      open/close, host glue
      loop.mjs      fixed step + interpolation
      input.mjs     stick, buttons, keyboard, pointer capture, press queue
      sim.mjs       pure: movement, water, currents, hiding
      puzzles.mjs   pure: P1–P8 state machines
      rig.mjs       pure: gait keyframes, IK
      view.mjs      Pixi layers, camera, reflections
      hero.mjs      Pixi rig rendering, strips and ropes
      audio.mjs     theme, adaptive buses, effects
      save.mjs      slots, validation, migration, word codes
      ui.mjs        DOM: HUD, dialogue, journal, menus
      content/sv.mjs  content/world.mjs  content/story.mjs
  assets/           WebP atlases, material tiles, manifest.json
scripts/skoldhast-art/          pencil.mjs, palette.mjs, hero/, scenes/, review.mjs
scripts/build-skoldhast-assets.mjs   packs atlases, writes files.json, fails over the size budgets
tests/skoldhast-*.test.mjs           node:test (pure, including the robot playthrough)
tests/browser/                       playwright library scripts (Chromium is at /opt/pw-browsers)
docs/skoldhast-game-plan.md          this plan
```

- The loader uses relative URLs, so the game works under `/alva-10-birthday/`. `skoldhast.css` loads with the
  game, not before.
- **ES modules don't load from `file://`.** Play via the Pages URL, or locally via `npx http-server -c-1`
  (installed globally here; `-c-1` turns off its default one-hour cache, so edits show up on reload).

### 8.2 Renderer and loop

- **Pixi setup:** `Application.init({ preference: ['webgl'], autoStart: false, antialias: false, resolution,
  autoDensity: true })`, where `resolution = min(devicePixelRatio, 2, sqrt(cap / (cssW × cssH)))`. Or size the
  canvas with CSS instead of using `autoDensity`.
  - The cap is 1.5 Mpx on phones and up to 2.6 Mpx on tablets (Galaxy's proven cap, `super-alva-galaxy.js:35`,
    3500), tuned with `?debug` on the family's device.
  - Use the **array** form of `preference`: the string `'webgl'` silently falls back to Pixi's canvas renderer
    (verified in Chromium).
  - Wrap it in try/catch and assert that the renderer is WebGL. If not, show "Den här webbläsaren kan tyvärr inte
    visa spelet." with **[Försök igen]** and **[Tillbaka till biljetten]**.
- **One scheduler.** The game runs its own `requestAnimationFrame` and calls `app.render()`, as Galaxy does.
  - Fixed step of 1/120 s, at most 10 steps per frame.
  - The accumulator resets on open, resume and visibility change.
  - **Interpolate the hero, the camera and moving props from the start**, because a gallop camera judders on
    90–144 Hz screens otherwise.
  - Input goes through a press queue (Galaxy's pattern, `super-alva-galaxy.js:5128–5131`), so no press is lost
    when a frame runs zero or several steps.
- **Close**, in this order:
  1. Stop the game's `requestAnimationFrame`.
  2. `await Assets.unloadBundle(...)` (or `Assets.unload(urls)`) for everything the game loaded.
  3. `app.destroy(true, { children: true })`.
  - Explicitly destroy only textures the game created itself (RenderTextures, generated textures).
  - Never pass `texture` or `textureSource: true` for Assets-loaded atlases. The Assets cache outlives the app, so
    the next open would get destroyed frames and crash; this was verified in Chromium with Pixi 8.21.
  - Call `Assets.init({ manifest })` once per page, at module scope.
  - `open()` awaits any close still in progress.
  - Destroy releases the GL context. The page's Three.js context stays allocated while paused, so measure one
    full-tab session (Galaxy → Mira → Sköldhästen) on the family's device.
- **Context loss.**
  - A RenderTexture is never the only record of something the player made. Inked dashes are sprite swaps driven
    by sim flags, and Sandpapperet's prints are stored as data and redrawn on `webglcontextrestored`.
  - Pixi restores atlases itself.
  - If the context hasn't come back within 2 s of the tab becoming visible, save, then close and reopen the game
    behind "Tryck för att fortsätta".

### 8.3 Integration with the ticket page

- **Launcher button:** "🌊 Sköldhästen", beside the three existing buttons (`index.html:2864–2866`), with its
  selector added to the ≤480 px block (`1802–1812`) and to the reduced-motion list. The "NYTT!" badge moves to
  it on release. The full title appears on the game's title screen.
- **The loading overlay is the launch guard.**
  - On click, the loader synchronously hides `#mario-content` and shows the overlay. Every game's `open()`
    already does this (`index.html:5190`, `super-alva-galaxy.js:4835–4836`, `mira-ui.js:414–415`).
  - **[Avbryt]** and the failure path restore it.
  - With Mira's one-line guard, this also covers the Mira → Sköldhästen order, and it takes the other buttons out
    of the tab order.
  - It shows:
    - progress: "Laddar Sköldhästen …";
    - a cancel button, **[Avbryt]**;
    - a failure message, "Något gick fel när spelet laddades.", with **[Försök igen]** and
      **[Tillbaka till biljetten]**.
  - A load token makes a cancelled load's completion do nothing.
- **Loading.**
  - A failed `import()` is remembered by the browser for the life of the page, so retrying `import()` never
    re-requests.
  - The loader first `fetch()`es every file in `skoldhast/files.json` (modules, Pixi and first-playable assets),
    with up to three tries per file and progress per file.
  - Only when everything has arrived does it call `import('./skoldhast/src/main.mjs')`, which the HTTP cache then
    serves.
  - **[Försök igen]** repeats the fetch step. If `import()` itself rejects, the button becomes
    **[Ladda om sidan]**.
  - With §0 Q2's yes, `#skoldhast` in the URL starts the same loader directly.
- **Existing bug** (verified and reproduced): press Mira's button and then Galaxy's while Mira is still loading,
  and both overlays open. A one-line guard in Mira's `.then` (skip `open()` if `#mario-content` is hidden) fixes
  it. It is a separate tiny PR, merged before the Sköldhästen button ships.
- **Host glue** in `main.mjs`, guarded with `typeof` as Galaxy and Mira do:
  - Pause the page scene with `setSceneRenderPaused(true)`, which skips update and draw; the page's
    `requestAnimationFrame` still ticks.
  - Pause and restore the page music exactly as Mira does (`mira/mira-audio.js:220–238`).
  - Reuse the shared `audioCtx`.
  - Restore focus to the button on exit.

### 8.4 Input and platform

- Pointer capture per touch ID. All held input is released on `pointercancel`, lost capture, blur, pause or close.
- On the game root and canvas: `touch-action: none`, `user-select: none`, `-webkit-user-select: none`,
  `-webkit-touch-callout: none` and `-webkit-tap-highlight-color: transparent`, as Galaxy's `#sag-ui` does
  (`index.html:1816–1830`).
- Text inputs (word code, slot name, "Din anteckning") get `user-select: text`; iOS won't let you type into them
  otherwise.
- While open: `html.skoldhast-lock, html.skoldhast-lock body { overflow: hidden; overscroll-behavior: none }`,
  as `mira/mira-safari.css:5–9` does; safe-area insets.
- Session listeners are bound through an `AbortController`.
- Orientation change pauses safely without rebuilding world state.
- UI text is DOM text, readable and resizable.

### 8.5 Audio

- Audio is resumed on **Börja/Fortsätt**, and on every `pointerdown`, `pointerup` and `keydown` while
  `audioCtx.state !== 'running'`.
  - This also covers iOS's "interrupted" state after a call, Siri or an app switch. Note that Mira's and Galaxy's
    `resume()` only check for "suspended".
  - Audio is suspended on `visibilitychange` → hidden and resumed on return, as Mira does
    (`mira/mira-ui.js:555–563`).
- The iOS silent switch is **not** overridden: captions carry all puzzle information, and the prologue works
  silently.
- The game owns only its own voices, and never closes a shared context.

### 8.6 Save

- **Slots.**
  - With no save on the device, **Börja** creates the "Alva" slot and goes straight to the prologue.
  - "Byt forskare" appears in the title menu once a save exists.
  - A "Mira" slot is offered only if Pappa answers yes to §0 Q8. "Ny forskare" is always available.
  - Each slot is a key `skoldhast.v1.<slot>`. **[Börja om]** always asks first.
- **Contents:** `{ v, contentVersion, chapter, checkpoint, flags[], clues[], pencils[], strokes, note, settings,
  ended }`. It stores stable authored IDs only.
- **Tolerant loading:** unknown IDs are dropped, and an unknown checkpoint maps to its chapter start.
- **When to write:** on checkpoints, close, `visibilitychange` → hidden, and `pagehide`.
- **Backups.**
  - `navigator.storage.persist()` is a bonus, not a safeguard. A home-screen icon on iOS is the real protection
    (§0 Q2).
  - Each Forskningsrapport shows a short Swedish **word code**: two or three words from a fixed list, for
    example "KELP SKAL MÅS". It encodes the finished chapter's end checkpoint plus the few optional flags later
    scenes read, such as flock glimpses seen.
  - Entering it under **[Jag har en kod]** on the "Byt forskare" screen restores that end checkpoint. Once the
    next chapter is released, play continues from there exactly as from a normal save.
  - A save lost between releases therefore never means replaying a chapter. A restore uses the default gull and
    cloud. Pappa photographs each code.
- **Failure messages:**
  - "Spelet kan inte sparas i den här webbläsaren – men du kan spela ändå."
  - "Det sparade spelet gick inte att läsa." **[Börja om från början]**

### 8.7 Five gates (replacing v1's long budget table)

1. **No requests before launch:** zero Sköldhästen requests before the button is pressed (or `#skoldhast` is
   seen).
2. **First playable:** at most 3 MB and under 5 s, on a throttled 10 Mbps / 100 ms profile, against a server
   that caches like Pages (max-age=600).
3. **Textures:** estimated game textures of at most 96 MiB, plus one measured full-tab session on the family's
   device.
4. **Frame rate:** 60 fps (p95 frame time at most 20 ms) over 10 minutes on the family's devices, read from the
   `?debug` overlay.
5. **Lifecycle:** 10 open/close cycles with no leaks, no audio or callbacks after close, and focus and music
   restored. Each cycle reopens and renders a known atlas frame, with no page errors.

### 8.8 Tests

- **`node --test` (pure):**
  - Simulation replay with scripted per-step inputs gives identical state under 30/60/120 Hz render schedules.
    The input adapter never loses a press when a frame runs zero or several steps.
  - Gallop, leap and slope collision; shore entry and exit hysteresis; current escape; hiding rules and their
    precedence; Hoppa never crossing a balk line.
  - All eight puzzle state machines under repeated actions, reloads and every help setting: no softlock, no
    duplicate reward.
  - A **robot playthrough**: scripted per-tick action streams drive `sim.mjs` and `puzzles.mjs` from a fresh save
    to each chapter end, and assert that every required puzzle is solved and the chapter-end flag is set.
  - Save validation, migration, word codes and chapter compatibility.
- **Browser**, using the `playwright` library with CDN routes stubbed:
  - The launch race in all orders (Mira then Sköldhästen, Sköldhästen then Mira, Mira then Galaxy).
  - Ten lifecycle cycles with atlas rendering.
  - No pre-launch requests.
  - A throttled first-playable measurement, and a failed-fetch retry.
  - WebGL context loss and restore mid-P1 and after drawing in Sandpapperet; inked lines and prints are still
    there.
  - A smoke test that loads a debug save at each checkpoint and screenshots it at three viewports.
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

**Changes from v1:**

1. **Story spine** rebuilt on her material: her frozen splash, her open line, Professor Klo as her researcher,
   Kartväktaren's LAND/HAV map, and the finale that turns the sign into "SKÖLD häst".
2. **Verbs:** *Lyssna med skölden* became **Göm dig** (her "gömma sig"). The gallop gained Språng, Streck,
   Galoppvind and Trumma. *Bind ihop* and *Följ flödet* were removed.
3. **A full puzzle catalogue:** P1–P8, each with an aha, where it is taught and a note, plus optional delights.
4. **Stäppen added** as her steppe; the world laid out left to right like her picture.
5. **Art direction** changed to colored pencil on white paper, daylight first. The fidelity contract was corrected
   from the photo, and a visual legend added so her outline clouds never read as broken.
6. **Honest production:** code-drawn art with a two-route hero proof, synthesized music with its own identity,
   and voices optional.
7. **The finale** split into agency (P8) and release (a no-fail gallop over the steppe that ends in Stora
   språnget). The moonlight mechanics were dropped.
8. **Humour and toys** under a reading budget: the stopwatch gag, Gnägg, Klo's experiments, the mane in the kelp.
9. **Delivery:** chapter releases, a hidden button, roles, checkpoints, tiers, a cut order and handover rules.
10. **Technology simplified:** vendored Pixi ESM with no bundler; a loading overlay as the launch guard; save
    slots and word codes; five gates.

**Second check of this version** (six angles, each verified): consistency 6/10, Swedish 8, the player 7,
fidelity and the gift 7, technical facts 7, coverage of the first review 8. The verified fixes are included
above. The most important were:

- **No blame on Alva:** the crease now cuts her line from outside the page, the prologue choice has no guilt in
  it, and Kartväktaren apologises.
- **Privacy:** her exact printed words are out of the repo until Pappa answers §0 Q5.
- **Rules:** Hoppa and Göm dig are specified so no puzzle can be skipped or softlocked, and Kapitel 1 stands
  alone.
- **The final:** it has a route and a peak, and the first flock glimpse is guaranteed.
- **Portrait:** gallop framing is specified.
- **Technical traps, each verified in Chromium and fixed in §8:**
  - Pixi's destroy-and-reopen crash with cached atlases.
  - The failed-`import()` retry dead end.
  - The out-of-tune `DelayNode` pluck.

---

## Appendix A: verified repository facts (at `f8daa8a`)

| Claim | Status |
| --- | --- |
| Buttons at `index.html:2863–2866`; ≤480 px selectors at `1802–1812` | Verified |
| `setSceneRenderPaused` (`index.html:4796–4805`) skips update and draw but keeps scheduling `requestAnimationFrame` | Verified |
| The Mira loader (`index.html:5492–5529`) loads on demand, shares one pending promise and resets it on failure. It shows no progress or error, only a subtle `.is-loading` style, and cannot be cancelled. | Verified |
| Pressing Mira's then Galaxy's button during Mira's load opens both games; a one-line guard fixes it | Verified and reproduced (headless Chromium, with a delayed script) |
| Space Jump (`index.html`, about 5134–5485): variable step, ground-only jump, pace profiles, no save | Verified |
| Galaxy: 1/120 s fixed step with up to 10 steps (`super-alva-galaxy.js:42–43`), accumulator loop (`5112–5150`), no render interpolation, save key `superAlvaGalaxy.v1` (`4625–4644`), full-resolution Canvas 2D with a 2.6 Mpx backing cap | Verified |
| Mira: story at `mira-content.js:590–650`; gondola update at `mira-ride.js:985–1040`; small pixel buffer at `mira-core.js:194–238`; save key `miraStjarnsafari.v1`; all sprites drawn in code (`scripts/mira-art/`); all audio synthesized | Verified |
| No bundler, test runner or CI; `package.json` only builds art | Verified |
| Three.js r128 (cdnjs and jsdelivr) | Verified |
| The repo is public, and the site is published at `olovmelander.github.io/alva-10-birthday/` from the branch (no workflow), with `cache-control: max-age=600` | Verified |
| PixiJS 8.21.0 is current on npm, MIT, and `dist/pixi.min.mjs` is self-contained | Verified |
| `preference: 'webgl'` (a string) falls back to the canvas renderer; `['webgl']` (an array) throws when WebGL is missing | Verified (Chromium with WebGL disabled) |
| `app.destroy(..., { texture: true, textureSource: true })` and then reopening with cached Assets atlases crashes; unloading the Assets first works | Verified (Pixi 8.21, Chromium) |
| A failed module `import()` is not re-requested by a later `import()` of the same URL | Verified (Chromium) |
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
| trampbrygga | not an established word; *tramp-* suggests pedals (trampbåt) | Trumbryggan (the hollow pier) |
| "…för att passa på en sida" | reads first as the particle verb *passa på* ("take the chance"); "fit on a page" is *få plats på en sida* | "…för att få plats på en sida" |
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

The existing games' rotate hint says "för bäst upplevelse". The standard form is "för bästa upplevelse", which
this game uses.
