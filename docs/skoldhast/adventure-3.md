# Äventyr 3: De försvunna stjärnorna

Design for the third Sköldhästen adventure, 12 November 2026. Pappa asked for the perfect space adventure for this
game, written out so completely that it can be implemented from this document: the story, **Rymdkrabban** (Alva's
new creature, painted by her on 9 November), the worlds, every puzzle, the script, the notebook, and how to build it.

Title on the title page: **Sköldhästen och de försvunna stjärnorna**. In the adventure picker: **De försvunna
stjärnorna**. Catalogue id: `adventure-3` (it already exists in `src/adventures.mjs`, unreleased, with no module).

Everything here follows the two finished adventures. Where this document says "as in Äventyr 2", the code to copy
is in `skoldhast/adventures/adventure-2/`, and its design is `docs/skoldhast/adventure-2.md`.

## Contents

0. The promise: the most epic adventure
1. Premise
2. What is decided
3. Rymdkrabban Nova: the drawing, the character, what she can do
4. The cast
5. World rules
6. The story in five acts
7. The red thread: question, hypotheses, clues
8. Four worlds and the ride home (five pages)
9. Puzzles (10 stars, 24 steps)
10. Beats, in play order
11. The script (Swedish)
12. Help: goals and hints
13. The notebook
14. Klo's research: häst eller sköldpadda, in space
15. After the story: secrets
16. Pictures, light and sound
17. Voices
18. Implementation: files, engine work, data
19. Tests and checks
20. Build order (one PR, one visible outcome)
21. Risks and what to tune
22. Frågor till Alva och Pappa

## 0. The promise: the most epic adventure

Pappa, 12 November: "Jag vill att Äventyr 3 ska vara det mest episka äventyret." This section says what that means
here, as things a builder can check. Epic never means hard: nothing can fail and nothing is timed, as before.

1. **The largest stage.** The first adventure was a beach, the second a forest and a mountain. This one is the whole
   sky, and it ends by changing that sky for good: a Milky Way and a new constellation that were not there before.
2. **Stakes that grow, step by step, and reach home.**

   | When | What is rubbed out | What it costs |
   | --- | --- | --- |
   | The table | One star, by Alva herself | Nothing, she thinks |
   | The same night | All ten of Alva's stars | The forest below grows dimmer |
   | End of the Moon | The rocket's fin | They cannot fly on |
   | Pages 2 and 3 | The bear's nose, a stretch of the ring | Friends are harmed too |
   | Arriving in the white | **The whole rocket** | No way home |
   | The climax | **The Moon, bite by bite** | Nova's home; the light of the whole sky; and in the magic forest the dark comes back, and with it Molnet's storm |
| The climax | **Klo's notes, and then the sköldhäst's own outline** | The player's notebook loses a page; the hero itself begins to go |

   The Moon's row is the one that matters most: the player spent a whole adventure giving that cloud a moon.
3. **Seven big pictures**, each the largest the series has drawn at that point (section 16):
   the launch from Utsiktskullen · the view from Kanten · Stora björnen standing up · the slingshot round the ring
   planet · the white page · **Den stora galoppen** · the finished sky.
4. **Everyone comes back.** The forest's friends see the heroes off and watch the sky at the end. Every friend helped
   on the way (the bear, Karlavagnen, Pip, Kometen) returns for the great gallop. Nothing the player did is small.
5. **A real low point.** In the white hole there is no rocket, no map, no stars, and the one who knows everything
   about space says "Jag vet inte vägen."
6. **A real fright.** Pappa, 12 November: "Gör månen så läskig du bara kan." The rubbing-out of the Moon is the
   scariest thing in the three adventures, on purpose (section 16.1 says exactly how, and where its limits are). An
   adventure is only as big as what is nearly lost in it.
7. **A climax the player wins with their own hooves, and then a word.** When the sköldhäst's own outline is rubbed
   away, the player gallops and draws it back. After that nobody is defeated: Alva says what she did, and the eraser
   that stranded them draws their road home.
8. **A heroic moment for each of the three.** The sköldhäst offers itself to be rubbed out instead of its friends,
   and later gallops the Milky Way into being. Klo, who is still only when he thinks of Tukankrabban, lights the way
   through the fog. Nova, who is "ingen taxi", carries them all.
9. **The player's own hand, three times in the finale:** the tenth star, the Moon's rim, the constellation.
10. **Quiet, for contrast.** The white hole is nearly silent, and Suddet has the smallest voice in the game. The big
    moments are big because of it.

Stretch, if there is time after release: once Äventyr 3 is finished, the night skies of Äventyr 2 (the moonlit
forest) show Vintergatan and the constellation too. The player has changed the sky of the whole series.

## 1. Premise

In words a 10-year-old can repeat:

"Alvas tio stjärnor försvinner från himlen, en efter en. Sköldhästen och Professor Klo åker upp i rymden i Miras
raket. Där bor rymdkrabban Nova. Hon kan allt om rymden – men hon är sur på morgonen. Vem tar stjärnorna, och
varför?"

The answer, kept until the fourth page: **Suddet**, the eraser from Alva's table. Alva rubbed out one star because it
came out crooked. Suddet thought that was its job, and went on rubbing out every crooked star. It is not bad. It is
doing the only thing it knows, and each time it helps, something disappears and it gets a little smaller.

What the adventure is about underneath: **what you draw by hand is allowed to be crooked**, and an eraser is not only
for mistakes. On a dark sky an eraser can *draw*: it rubs out small white points, and those are stars.

Length and shape: the longest of the three. Five pages (four worlds and the ride home), ten things to find (ten
stars: Alva drew one for every year when she turned ten), 24 puzzle steps, about 330 dialogue boxes, a robot play time of about 8
minutes (Äventyr 2: four pages, 21 steps, about 175 boxes, 5 minutes).

## 2. What is decided

**Decided by Pappa (12 November):**
- Äventyr 3 is set in space.
- The story is the one above: Alva's stars vanish, the eraser took them, four worlds (the Moon, the constellations,
  the ring planet, the erased place), ten stars, the constellation Sköldhästen in the finale.
- There is a new crab, Rymdkrabban. **She is good at everything that has to do with space, easily annoyed, and
  grumpy in the morning.** Alva has painted her (section 3).
- The rocket seen from Utsiktskullen after Äventyr 2 was a glimpse of this adventure.
- **It is to be the most epic of the adventures** (section 0).
- **Her name is Nova** ("Nova och supernova blir ett perfekt namn på rymdkrabban"). A nova is a star that suddenly
  flares up, which is what her temper does. When she is in a bad mood Klo calls her "Surnova"; in the finale, for the
  first time, she is in a brilliant mood, and that is a **Supernova**.
- **The white hole is one-way.** The rocket is rubbed out on arrival, and there is no way back until the story is
  over (section 8.6).
- **The Moon is to be as scary as it can be** when it is rubbed out (section 16.1).

**Decided by Pappa on 12 November, on this document's recommendation** ("Gör det du rekommenderar"), instead of
waiting for answers from Alva:
- Her shell is a **flying saucer** (that is what the painting looks like).
- The blue-violet strokes under her are a **beam of light** she hovers on and can lift things with.
- The five dots are **lamps** that show her mood.
- Her breakfast is **kometflingor**.
- She is crazy about **stjärnbilder, frukost och att ha rätt**.
- She is grumpy in the morning for no reason at all. She just is, and nobody in the game asks why.
- In the fog stands Alva's first, rubbed-out try at a sköldhäst, **"med fel ben"**, as written.
- There is **no setting to soften the Moon**: "Mindre läskigt", drafted in section 16.1, is removed.

- **Tukankrabban stays at home.** Klo writes to her, and at the end she writes back (sections 4 and 13.6).
- **Mira's ring planet is called Ringo**, by Mira. Nova says "Ringplaneten". Klo writes down both.
- **The ten stars stay ten**, and are true whenever the adventure is played: "Jag ritade en för varje år när jag
  fyllde tio." For the years after, Suddet rubs out a new one (the epilogue, and Suddet's own line on the Moon).
- **The four new voices are chosen by ear** (Pappa and Alva, 12 November): Nova as first made, Suddet "Ljus och
  oskuldsfull", Stora björnen "Jättelik bas", Kometen "Hes sportkommentator" (section 17).
- **Every line is acted** (section 17.1): English audio tags beside each line, recorded with a freer setting. Chosen
  over plain reading, context and whole-scene takes.
- **Äventyr 1 and 2 are to be recorded again with direction, every line** (Pappa, 12 November, after a before-and-after
  trial where the directed take won in all six scenes; section 17.2). Not started: it waits for Pappa's word.
- **It is released whole, when it is finished; the day to aim for is julafton** (section 20.1).

Nova is still Alva's creature. If Alva says something else about her, or adds facts of her own as she did for the
tukankrabba, her word wins and this document is changed.

## 3. Rymdkrabban Nova

### 3.1 Alva's painting (fidelity contract)

Pappa sent six photos of Alva's painting on 12 November 2026 (pencil outline, filled with **watercolour**). The
photos are not committed: everything in the repository is public, and the folder `rymdkrabban/` is in `.gitignore`.
These are the features every drawing of her in the game must keep:

- **The shell is a purple dome, like a flying saucer.** A tall half-round dome in lilac and magenta watercolour,
  darkest and speckled in the middle. On the dome's left side an **unpainted white wedge**, like the shine on glass.
- **Under the dome, three bands**, each a little narrower than the last:
  1. a **dark violet rim**, wider than the dome, like the brim of the saucer;
  2. a **pale pink band with five round magenta dots** in a row (the saucer's lamps);
  3. a short, narrower **magenta block** under the middle.
- **Under that, a wide skirt of blue-violet brush strokes** that fans out downwards, in separate vertical stripes.
  It is far bigger than the dome is tall. There are no legs.
- **Two eyes on stalks**, rising from the top of the dome. Each stalk stands in a **dark violet curved collar** on the
  dome, and is thin at the bottom and wider at the top. The eyes are big and round: a pale lilac ring, a grey-blue
  iris, a black pupil. **A line runs across each eye, and the upper lid hangs half way down.** She looks as if she has
  just been woken. The left eye sits a little lower than the right.
- **Two claws on long thin arms.** The left arm rises from the dome's left side and holds its claw up high: a
  rounded pink-magenta pincer with a slit, and **a pink glow around it**. The right arm bends out from the dome's
  right side in a wide arc and hangs down to a large claw held low, pointing down and inwards.
- **No mouth.**
- The colours are watercolour: uneven washes, darker where the paint pooled, the pencil line showing through.

In code: `createNova` in `adventures/adventure-3/characters.mjs`, and her face on the speaker tab in `ui.mjs`. A dev
page `skoldhast/dev/a3-characters.html` shows her and the others in every pose, as `a2-characters.html` does.

**She is painted, not pencilled.** Everything else in the game is coloured pencil. Nova should keep her watercolour
look: soft edges, a wash that is not flat, a visible pencil outline. That is also story (rule 9, section 5): an eraser
cannot rub out watercolour, so Suddet can never harm her.

### 3.2 How the painting becomes a character

| In the painting | In the game |
| --- | --- |
| The dome | Her shell, a flying saucer. Found star-lights are kept under it: **"under kupan"**. The dome fills with small lights as they are found, so she is also the adventure's counter. |
| The five dots | **Her five lamps.** They show her mood (section 3.4), light up the dark when she is angry (M3), and blink a sequence when she teaches a star order (S2). |
| The blue-violet skirt | **Strålen**, a beam of light. She hovers on it and never walks. It can lift one thing at a time: a still shell, a box, Professor Klo. |
| The half-closed eyelids | Her resting face. The lids go lower when she is annoyed, shut when she sleeps, and open fully only twice: at the view from Kanten, and in the finale. |
| The raised claw with a glow | **Pekklon.** It glows pink when a star-light is near, and brighter the nearer it is. |
| The big hanging claw | She carries things in it: her cereal box, her star chart. She points with it when she is cross. |
| No mouth | When she talks, her lamps flicker in time with the words. |

### 3.3 Who she is

- **She knows everything about space.** Every star by name, how gravity pulls, why a comet has a tail. Her facts are
  true (section 13.5 lists them), so the adventure teaches real astronomy in her voice.
- **She is easily annoyed.** By hoofbeats ("klapper"), by being measured, by questions before breakfast, by anyone who
  parks on her moon. Her anger is aimed at things and at the situation, never cruelly at a friend, and she helps every
  single time anyway. She is the grumpy aunt who drives you to practice at six in the morning and complains the whole
  way.
- **She is grumpy in the morning, and in space morning comes often.** After every nap she is morning-grumpy again,
  and she naps in the rocket on every journey. So each new page begins with her waking up cross. Running gag: "Inte
  före frukost."
- **She is crazy about three things:** *stjärnbilder* (she loves order in the sky, every star in its place),
  *frukost* (kometflingor, her cereal), and *att ha rätt*.
- **She has had space to herself for a long time** and says she likes it that way. She does not, quite.
- **What changes:** her hypothesis is wrong, and she has to say so ("Jag hade … inte helt rätt"). She lets a horse-
  turtle and a crab professor help her. And at the very end she is, once, in a brilliant mood.
- **What does not change:** she is still grumpy the next morning. Nobody fixes her, and nobody needs to. The friends
  learn how to be around her: leave her be before breakfast, and bring the cereal.

How she talks: short sentences. Facts stated flat. "Det vet alla." after things nobody knows. Capital letters for one
word when she is cross ("MIN måne"). She never says thank you in so many words until the last scene; before that it
is "Det där var inte dåligt."

### 3.4 Her lamps (mood)

The five lamps are always visible on her. They are feedback and comedy, never a meter the player can fail.

| Lamps | Mood | When |
| --- | --- | --- |
| Off, eyes shut | Asleep | In her crater at the start; in the rocket between pages |
| Dim violet, slow | Morning-grumpy | After every waking, until something has been done about it |
| Pink, steady | Ordinary (a little cross) | Most of the time |
| Red, blinking fast, a puff of steam | Angry | Hoofbeats close by, being measured, Suddet |
| Gold, all five, pulsing | **Supernova** | Once: the finale |

Galloping right beside her turns the lamps red for about 4 s, with one of her short remarks the first few times
(section 11.14). That is just her character, except on the Moon's night side (M3), where it is the solution.

### 3.5 What she can do (companion abilities)

The player's own verbs do not change: walk, gallop, jump, hide in the shell, the action button, swim. Nova adds three
things, all through verbs the player already has.

1. **Strålen lifts a still shell.** Where a beam spot is marked (a pale ring of light on the ground under where she
   hovers), **hide** there and the beam lifts the shell to the ledge or across the gap. A kicking horse is not lifted:
   "Sluta sprattla." This is the turtle half's new trick, and it follows the series' rule that only a still shell is
   carried (by currents in the sea, by the spring in the mountain, now by light).
2. **The lamps light the dark when she is angry** (M3 only).
3. **Pekklon points to star-lights.** When a star-light is within about 12 lengths and not yet found, her raised claw
   glows, and "Prata" with her says which way ("Uppåt. Långt uppåt."). This replaces the "next egg" hint of Äventyr 2.

She also carries Klo in the beam over any gap he could not cross ("Jag är ingen taxi."), which solves a problem
Äventyr 2 had to work around: companions that cannot follow.

## 4. The cast

- **Sköldhästen** (the player). Same verbs as before. New in space: it is light on the Moon and weightless among the
  stars, but **the shell is always heavy**.
- **Tukankrabban stays at home**, with ten small researchers to look after (decided 12 November). The adventure is
  better for it: the forest has someone in it to be afraid for when the dark comes; Klo's lantern, his postcards and
  his stillness in the fog all come from missing her; and there is room for Nova. She is in the launch, in the two
  pictures of the forest, and in the notebook, where at the end she writes back.
- **Professor Klo.** Out of his depth: "Expert på land och vatten" has nothing to say about space, and Nova tells him
  so. He copes by measuring everything anyway, and by becoming, slowly, her assistant and then her colleague. He
  misses Tukankrabban, carries the moonshine seed she gave him ("det lyser bara när dina klor är stilla"), and writes
  her a postcard from every page (section 13.6). His question gets a new chapter: in space nothing weighs anything.
- **Nova, rymdkrabban.** Section 3.
- **Alva and Mira**, at the table, heard and never drawn, with us the whole way. Alva paints Nova and owns the ten
  stars. Mira draws the rocket with its crooked fin, of which she is very proud. Mira is the counterweight to the
  theme: she has never once thought a drawing of hers was wrong.
- **Suddet.** Alva's eraser: small, pink, a rounded block, worn at one corner, grey with pencil dust on its rubbing
  end. It has no face drawn on it until Mira gives it one in the finale; before that it shows feeling by how it
  tilts, hops and shrinks back. It talks in short, plain, earnest sentences. It thinks it is helping.
- **Stora björnen.** A constellation: a huge bear made of stars and thin lines, asleep. Also grumpy when woken, which
  delights Nova ("Äntligen någon som förstår."). Slow, deep, kind.
- **Pip.** A small old satellite that tumbles in orbit and says only "pip". Nova translates, unwillingly. It takes
  photographs.
- **Kometen.** Always in a hurry, laps the ring planet without pause, talks fast, never stops ("Hinner inte!"). Vain
  about its straight tail. The opposite of Nova in tempo; they cannot stand each other for about four lines. In the
  end it is Kometen who, for once, is in time.
- **From Äventyr 2:** Tukankrabban, the ten hatchlings, Skatan, Tordyveln and Molnet see the rocket off from
  Utsiktskullen. Molnet follows it up as far as the air reaches. They are seen again twice, in short pictures of the
  forest: when the Moon is bitten and the dark comes back, and when the light returns.

## 5. World rules

1. **Everything from the first two adventures still holds.** Alva's pencil is in the hooves: a full gallop draws
   what is dashed. The shell is heavy, sinks, lies still, and is carried by what carries only a shell.
2. **On the Moon everything is light, except the shell.** A jump goes two and a half times as high and as far, and
   comes down slowly. Hidden in the shell, the sköldhäst drops like a stone, even from mid-air.
3. **Between the stars there is no up or down.** The sköldhäst floats and steers in every direction (the swimming
   controls). On an asteroid or a star-line it stands and gallops as usual. A hidden shell does not sink there: it
   hangs still, and drifts only where something pulls it.
4. **A planet pulls.** Round the ring planet run lanes of pull ("dragningsbanor"). A swimmer is too light and kicks
   itself out of them; a still shell is carried round, like the currents in the sea.
5. **Constellations are dot-to-dot.** The stars are there; the lines between them are only dashed until someone
   draws them. A drawn constellation becomes what it shows: a wagon rolls, a bear wakes.
6. **What is rubbed out is not gone.** The lines become crumbs ("suddsmulor"), a faint dent stays in the paper where
   the line was (it shows as a dashed line), and **the light drifts away**. That is why Alva's ten star-lights are
   scattered over all of space, and why they can be found.
7. **Suddet rubs out what is crooked, and only what is drawn in pencil.** Straight things it leaves alone.
8. **Under the dark sky there is white paper.** Where Suddet has rubbed, the sky has white holes. The whitest place
   of all, Det vita hålet, is where it lives. Nothing is drawn there, so there is nothing to stand on until hooves
   draw it.
9. **Colour cannot be rubbed out.** Not coloured pencil, not watercolour. The sköldhäst is coloured in; Nova is
   painted. Alva's stars were only pencil: "Jag skulle färglägga dem sen."
10. **In space no sound is heard.** (They talk anyway. Alva: "Det har jag bestämt.") A whinny is silent out there,
    though Nova's claw picks it up.
11. **An eraser on a dark sky draws white.** The rule the finale turns on.
12. **Kometen's tail is straight** ("linjalsvans"). Suddet does not rub out what is straight, so the tail is the one
    road across the sky that will hold.
13. **The forest below lives by this sky.** Alva's stars and Mira's moon are its night light. With the stars gone it
    is dimmer; without the Moon it is dark, and Molnet is afraid of the dark (Äventyr 2).
14. **A drawing is held together by its outline.** With its rim rubbed away, the Moon does not hold: its light runs
    out of it. Draw the rim again and the light runs back and fills every hole.
15. **Even what is coloured in has pencil lines round it.** Suddet cannot take the colour, but it can take the
    outline. And the one whose hooves hold Alva's pencil can draw its own outline back.

Rule 6 answers the question a careful player will ask: if the stars were rubbed out by the Moon, why are they found on
a comet's tail? Only their marks are by the Moon. Their lights blew away.

## 6. The story in five acts

1. **The crooked star** (the table, the launch, the Moon). Alva and Mira make a new page: the night sky above the
   magic forest. Alva paints Nova. Mira draws a rocket on Utsiktskullen. Alva looks at her ten stars from the last
   page, finds one crooked, and rubs it out. Then, one after another, the rest go out, and the forest grows dimmer.
   Everyone from the forest comes to the hill to see the sköldhäst and Klo off. Molnet follows the rocket up until
   the air ends. They land, crookedly, on Nova's moon, before breakfast. Nova has counted: ten are missing. Her
   hypothesis: a black hole.
2. **The Moon** (page 1). They learn to move where everything is light, learn what Nova's beam and lamps can do, and
   find three star-lights. From the edge of the Moon they see the sky: the holes where the stars were are **white**,
   not black. A black hole it is not. Somebody rubs out the rocket's fin while they are away; Mira draws it back.
3. **The constellations and the ring planet** (pages 2 and 3, in either order once both are open). Karlavagnen,
   Orions bälte, Stora björnen, Pip, the rings, the meteor showers, the slingshot, Kometen. Six star-lights. The clues
   gather: crumbs that are rubber, a photograph of something small, pink and square, a smell of rubber, and Kometen's
   observation that **only the crooked ones are taken**. At the table, Mira cannot find the eraser.
4. **The white hole** (page 4). As they step out, something small and pink rubs out **the whole rocket** behind them
   and hops away into the white. There is no way back, so they follow. It is a place with nothing drawn in it, and
   Nova, for the first time, does not know the way. Hooves draw the ground; Klo's lantern lights the fog; Suddet rubs
   out the last bridge, because hoof-lines are crooked; the shell, which is no line, is lifted across. Suddet is tiny
   now, and it turns to the one thing left: Mira's moon, which is not quite round. **It rubs three bites out of the
   Moon.** With each, everything grows darker, and when the third is done the holes are a face, looking down, and
   the Moon's light goes out. Far below, the forest is black, and Molnet's storm comes back. Suddet rubs out Klo's
   notes. The sköldhäst steps between: "Sudda mig då." And Suddet does: the sköldhäst's outline goes, and only its
   colours are left hanging in the dark. But colour cannot be rubbed out, and Alva's pencil is in its hooves. **The
   player gallops, and the sköldhäst draws itself back.** Suddet has never seen anything it rubbed out come back.
   That is what stops it. Then Alva says what she did. The tenth star is the one she rubbed out herself, and she draws it again,
   crooked, on purpose.
5. **The great gallop and the new sky** (the ride, the Moon, the table). They are stranded, and Suddet has only ever
   known one thing to do. Nova asks it what happens when you rub on something dark. Pip has seen everything and
   called for help, and for once Kometen is in time. Its tail is straight, the one road Suddet would never rub out.
   With Suddet on the shell, the sköldhäst gallops the whole length of the comet's tail across the whole sky, and
   Suddet rubs a river of small white stars behind them: **Vintergatan**. The bear, Karlavagnen and Pip run
   alongside. Kometen cannot brake: they jump, and Nova catches and carries them all. On the Moon the hooves draw
   the bitten rim whole, and the light comes back to the forest. The ten lights return to their marks, Alva colours
   them gold so that nothing can rub them out, and joins them, dot to dot, into a constellation: **Sköldhästen**.
   Nova's lamps go gold. At the table the eraser is back, with a gold star on it, and the real window shows the
   same stars.

## 7. The red thread

**The question** (asked aloud on the Moon, shown in the notebook): *Vem tar Alvas stjärnor – och varför?*

**Hypotheses**, numbered as they are spoken, each stamped in the notebook when the story settles it:

| # | Whose | Hypothesis | Settled |
| --- | --- | --- | --- |
| 1 | Nova | "Ett svart hål slukar dem." | **Stämmer inte** at Kanten (the holes are white). Nova takes it badly. |
| 2 | Klo | "Någon samlar på dem. Som Skatan." | **Stämmer inte** at the white hole (nothing was kept). |
| 3 | Klo and Nova together | "Någon suddar ut dem." | **Stämmer!** after Pip's photograph and the bear's nose (rubber). |
| 4 | Kometen's observation, Nova's conclusion | "Den tar bara de sneda." | **Stämmer!** in the white hole. |

A wrong hypothesis is new for the series (Äventyr 2's were all right). It is good research: Nova, the expert, is
wrong, and says so. The stamp "Stämmer inte" is drawn like "Stämmer!" but in grey, with Nova's lamp beside it.

**Clues**, in the order they can be found (`CLUE_ORDER`):

1. `ten`: Alvas tio stjärnor är borta. Hon ritade en för varje år när hon fyllde tio.
2. `light`: Stjärnans ljus blir kvar när stjärnan försvinner. Det driver iväg.
3. `white`: Hålen i himlen är vita. Ett svart hål är det inte.
4. `crumbs`: Vid raketen låg rosa smulor. Fenan var bortsuddad.
5. `rubber`: Smulorna är gummi. Stora björnen känner lukten.
6. `photo`: Pip har tagit en bild av tjuven: liten, rosa och kantig.
7. `crooked`: Bara de sneda stjärnorna är borta. De raka är kvar.
8. `gone`: Vid Alvas bord är suddet försvunnet.
9. `sudd`: Det är Suddet. Det suddar ut allt som är snett, för det tror att det hjälper.
10. `colour`: Färg går inte att sudda. Bara blyerts.
11. `milky`: Ett sudd kan rita på en mörk himmel. Så blev Vintergatan till.

**Fair play.** A watchful player can solve it before the reveal:
- In the prologue Alva uses the eraser on screen. After that the eraser is simply not on the desk any more (no caption
  says so).
- The crumbs at the rocket are pink.
- Mira's line from the table on page 2 or 3: "Alva, har du sett suddet?"
- Klo joked in Äventyr 1: "Tänk om månen är ett suddgummi som någon glömt kvar på himlen." Nova answers that joke in
  the finale.

**What nobody may say too early** (the audits of Äventyr 2 found this kind of slip): after the prologue, nobody
calls the missing stars "sneda" before Kometen does; nobody says "sudd" or "sudda" before hypothesis 3, except Mira's
one line at the table, which does not connect it (this holds for hints and goals too, whichever of pages 2 and 3 is
played first); the prologue does not show the eraser entering the page; and the thief is never seen before the
rocket is rubbed out, and then only as a pink blur. Nobody says "Nova" before she does, at breakfast ("Jag heter
Nova."): until then she is "rymdkrabban", in the hints, the goal, the sköldhäst's thoughts and the notebook (Pappa,
13 November: Klo's first hint named her).

## 8. Four worlds and the ride home (five pages)

Lengths are in horse lengths (HL), as in `world.mjs`. The numbers are starting values for the builder and the robot
to tune. The four worlds are about 90 to 105 HL wide, like Äventyr 2's pages; the ride home is one long strip.

### 8.1 `mane` — Månen (west → east)

Mira's moon from the last adventure, close up: pale yellow pencil, grey craters, a black sky with a few of the
"straight" stars and, low on the horizon, the magic forest's page seen from above. **Low gravity** (rule 2).

| HL | Place | What is there |
| --- | --- | --- |
| −14–0 | **Västra kanten** | The Moon's western rim, a long gentle curve with the best view of the stars. Nothing to do here at first. In the climax this is where the bite is taken: the rim becomes a dashed arc 12 HL long (F2). |
| 0–8 | **Landningsplatsen** | Mira's rocket, standing crooked. Start. The way to the other pages (the rocket's door). |
| 8–20 | **Novas krater** | A shallow crater. Her sleeping hollow with a blanket of moon dust. **Hyllan**, a rock shelf 1.2 HL up with the cereal box (M1). |
| 20–36 | **Hoppfälten** | Three rifts, 4.5, 5.5 and 6 HL wide. A gallop and a jump carries about 8 HL here. Low rocks to bound between. Free play with the new jump. |
| 36–48 | **Djupa kratern** | 4 HL deep with steep walls. The first star-light at the bottom. A beam spot (M2). |
| 48–66 | **Nattsidan** | The Moon's night side. Pitch dark: the ground, two pits and a ridge cannot be seen (M3). In Nova's red light one crater looks like a face: two round hollows and a long crack. It is only a crater. It is also what the Moon will look like in the climax. |
| 66–82 | **Kanten** | The Moon's edge. Loose rocks hang in a staircase out over nothing, up to **Spiran**. Under an overhang, a ledge that cannot be jumped to (M4). |
| 82–90 | **Utsikten** | The top of Spiran. The view of the whole sky (M5). |

### 8.2 `stjarn` — Stjärnbildsfältet (west → east)

Open space: deep blue-black pencil, far nebulas in soft colour, many small stars. **No gravity** (rule 3). Small
asteroids are islands with their own ground. The constellations are huge figures of stars and dashed lines.

| HL | Place | What is there |
| --- | --- | --- |
| 0–8 | **Hamnstenen** | The asteroid where the rocket docks. |
| 8–34 | **Karlavagnen** | Seven stars, joined by one long dashed line with a bend: the shaft, then the wagon's box. It starts on Hamnstenen (S1). |
| 34–50 | **Orions bälte** | Three star-stones in a row, 3 HL apart, floating free. Under the middle one hangs a star-light (S2). |
| 50–72 | **Stora björnen** | The bear lies along the page, asleep, built of stars. His back is a slope of star-lines; his nose-star is rubbed out (S3). When he wakes he **stands up**: he is as tall as the screen, the heroes are on his back, and he carries them to Pips omlopp in three strides. |
| 72–90 | **Pips omlopp** | A small dark rock with a ring-shaped lane of pull round it. Pip tumbles in the lane (S4). |

### 8.3 `ring` — Ringplaneten (west → east)

Mira's planet: big, striped in her favourite colours, tilted, with wide rings of ice. The rings are the ground: flat
floes of ice in a long arc, with the planet's huge curve behind and below. Half of the page lies in the planet's
shadow (a visible, sharp line between sun and shade on the ice). Normal gravity on the ice; **lanes of pull** round
the planet (rule 4).

| HL | Place | What is there |
| --- | --- | --- |
| 0–8 | **Isbryggan** | The floe where the rocket docks. |
| 8–30 | **Grusregnet** | The ring, with showers of gravel across it and blocks of ice to shelter behind (R1). |
| 30–44 | **Slungan** | The ring ends. Three lanes of pull start off its end, at three heights (R2). |
| 44–62 | **Skuggsidan** | The far ring, in the planet's shadow. A block of ice with a star-light frozen in it; the line where the sunlight begins is 9 HL east (R3). |
| 62–76 | **Kometens bana** | Kometen's lane crosses the ring here, and it rests for a breath at **Rastplatsen** (R4). |
| 76–90 | **Luckan** | A gap in the ring, rubbed out: a dashed arc 7 HL long, with gravel showers over it. The last floe beyond (R5). |

### 8.4 `sudd` — Det vita hålet (west → east)

The dark sky ends in a ragged, rubbed edge, and beyond it is **white paper**: the grain of the paper, grey smears,
pink crumbs, faint dents where lines used to be. It is the brightest page in the game and the emptiest. The picture
should be a small shock after three dark pages.

| HL | Place | What is there |
| --- | --- | --- |
| 0–8 | **Kanten av himlen** | The last dark ground. The rocket lands here, and is rubbed out a moment later: only its dashed outline and a heap of pink crumbs are left. |
| 8–30 | **Märkena** | Nothing to stand on. Dashed dents lead out in three or four routes at different heights (V1). Far ahead, something small and pink hops away. |
| 30–46 | **Blyertsdimman** | Grey smudge fog. The dents cannot be seen in it (V2). A slow squeak of rubbing, somewhere ahead. **Things stand in the fog: the dents of everything Alva has ever rubbed out.** A house without a roof, a dragon without a head, and a first try at a sköldhäst, with the wrong legs. |
| 46–62 | **Sista bron** | One long dashed line. Suddet rubs it out behind every gallop. A beam spot at its start (V3). |
| 62–78 | **Smulhögen** | A hill of pink crumbs at the far edge of the white, where the dark sky begins again. **The Moon hangs huge and far too close beyond it**, filling the top of the screen, and the white reaches right up to its rim. Suddet. The dent of the first star. The climax (V4, V5; section 16.1). |

### 8.5 `vinter` — Vintergatan (east → west, one way)

The ride home. One straight, glowing road: **Kometens svans**, about 160 HL long, running across the whole sky from
the white hole to the Moon. The sköldhäst gallops along it from the tip to Kometen's head. The sky behind it is the
darkest and emptiest in the game when the ride starts, and the fullest when it ends.

| HL (from the tip) | What passes |
| --- | --- |
| 0–20 | The white hole falls behind. The first stars appear in the trail. |
| 20–60 | **Ringplaneten** goes by below, huge and slow. Kometen's own lane, seen from outside. Mira: "Hej Ringo!" |
| 60–110 | **Stjärnbildsfältet.** Karlavagnen rolls up alongside with Stora björnen pulling it, Klo riding in the wagon. Pip tumbles past and takes a photograph. |
| 110–150 | Open sky. The trail is now a river of stars the whole width of the page. The music is at its fullest. |
| 150–160 | **Kometens huvud.** The Moon ahead, with the bite in its rim. Kometen cannot brake (F1). |

The background moves in three depths, so the speed is felt. The road itself is ordinary ground: the gallop is real,
with real hoofbeats, and the player may slow down or stop without losing anything.

### 8.6 How the pages connect

The rocket is the door between pages (a page turn, as between Äventyr 2's pages). `Prata`-style action at the rocket's
door: **Res** opens a small picture of the places; those not yet reachable are shown as "?".

- `mane` → open from the start.
- `stjarn` and `ring` → both open after M5 and the fin (act 2's end). Either order.
- `sudd` → opens when nine star-lights are found (Kometen has said where; Nova: "Bortom ringarna. Det vita.").
  **It is one way**: the rocket is rubbed out on arrival. Everything a player might want from the other pages is
  already done by then (nine lights are needed to come here), and the checkpoint is saved on arrival.
- `vinter` → entered from Smulhögen after the talk, left at Kometen's head for the Moon. One way.
- After the story everything is open again: Mira has drawn a new rocket ("ännu snedare"), and "Res" also offers
  Vintergatan, as a road to gallop for the joy of it.

Nova naps on every journey and wakes grumpy at each arrival. Each page's arrival scene begins with that (short, and
different each time).

## 9. Puzzles

Ten star-lights: Månen 3, Stjärnbildsfältet 3, Ringplaneten 3, Det vita hålet 1. 24 steps. "Half" says which half of
the sköldhäst the step needs, for Klo's count (section 14).

| # | Where | Star | What you do | Half |
| --- | --- | --- | --- | --- |
| M1 | Novas krater | — | **Frukosten.** Nova will not talk, or fly, before breakfast. Her kometflingor stand on Hyllan. Jump: on the Moon a jump reaches. **Knuffa** the box off the shelf; it sinks slowly down to her. Teaches the Moon jump and the action button. | horse |
| M2 | Djupa kratern | 1 | Jump down. The star-light lies at the bottom: touch it. The walls are too high even for a Moon jump. Stand on the ring of light and **hide**: Nova's beam lifts the shell out. Teaches the beam. | turtle |
| M3 | Nattsidan | 2 | Pitch dark, and the sköldhäst will not walk where it cannot see. Nova's lamps shine brightest when she is angry, and hoofbeats make her angry: **gallop**, and the lamps light the ground for about 4 s at a time. In the light, two pits to jump and the star-light on a ridge. | horse |
| M4 | Kanten | 3 | A ledge under an overhang, with a star-light on it. No jump lands there: every jump floats past. Jump out over it and **hide in the air**: the shell drops like a stone onto the ledge. Back up by the beam spot on the ledge. | turtle |
| M5 | Spiran | — | Bound from rock to rock up to Utsikten. The view: the holes in the sky are white. Hypothesis 1 falls. | horse |
| Fenan | Landningsplatsen | — | Back at the rocket: the crooked fin is rubbed out, pink crumbs lie under it. **Trace it with Mira's pencil** (the guide line is crooked; any line is accepted). The rocket can fly. | Mira |
| S1 | Karlavagnen | — | The dashed line through seven stars. A walk is refused; a full gallop draws it, star by star, each with its own note. The wagon is drawn, rolls, and carries everyone to Orions bälte. Teaches star-lines. | horse |
| S2 | Orions bälte | 4 | Three star-stones. Nova's lamps blink an order (middle, left, right). Float to them in that order and land on each: it lights and rings. A wrong one puts them all out; Nova blinks it again. When the belt is lit, the star-light under it comes loose. | — |
| S3 | Stora björnen | 5 | The bear sleeps on a star-light ("den är varm"). He cannot be woken: no sound in space. His nose-star is rubbed out. Gallop up the star-lines of his back for a run-up and on along the dashed nose: it is drawn, he smells breakfast, wakes, sneezes, and gives the star-light. He smells rubber. | horse |
| S4 | Pips omlopp | 6 | Pip tumbles in a lane of pull round a rock. A swimmer is kicked out of the lane. Float into it and **hide**: the shell goes into orbit and meets Pip. Pip hands over the star-light caught on its panel, and its photograph. | turtle |
| R1 | Grusregnet | — | Showers of gravel sweep the ring. Standing, the sköldhäst is pushed back. **Hide** when the streaks show (a warning comes first), or wait behind a block of ice. | turtle |
| R2 | Slungan | — | The ring ends. Three lanes of pull: the low one and the high one bend back to the start. The middle one is marked by pink crumbs. Take a run, **jump** off the end and **hide** in the air: the shell falls into the lane and is slung round the planet. | both |
| R3 | Skuggsidan | 7 | A star-light frozen in a block of ice, in the planet's shadow. **Knuffa** the block along the ring, over the line into the sunlight. It melts. | horse |
| R4 | Kometens bana | 8 | Kometen cannot be caught by galloping, and will not stop to talk. Its lane crosses the ring: float in and **hide**, and the shell rides the lane to Rastplatsen, where Kometen pauses each lap. The star-light is tangled in its tail: touch it. Kometen has seen the thief. | turtle |
| R5 | Luckan | 9 | A gap in the ring, rubbed out. Gallop out on the dashed arc between two showers and the hooves draw the ice back. The star-light waits on the last floe. | horse |
| V1 | Märkena | — | Nothing to stand on. Every dent in the paper is a dashed line: gallop and it is drawn under the hooves. Routes at different heights; any of them leads on. | horse |
| V2 | Blyertsdimman | — | In the fog the dents cannot be seen. Tukankrabban's moonshine seed shines only when Klo's claws are still, and Klo is still only when the sköldhäst is: **hide**, wait, and the seed lights the next dents. Three times. | turtle |
| V3 | Sista bron | — | Gallop draws the bridge; Suddet rubs it out behind you and you are set back, twice. Hoof-lines are crooked. A shell is not a line: **hide** on the ring of light and Nova's beam carries the shell over. | both |
| V4 | Smulhögen | — | **Månen suddas.** Nothing to do but watch and call out: three bites, the face, the dark, the storm in the forest, Klo's notes. The sköldhäst steps in front of its friends. | — |
| V5 | Smulhögen | 10 | **Rita dig själv.** Suddet rubs out the sköldhäst's outline: its colours hang in the dark without edges. The controls come back. **Gallop**, anywhere on the hill, and every stride draws a piece of the outline back. No time limit; standing still, nothing more is lost. Then Suddet stops, Alva speaks, and the tenth star is drawn: **trace a star with Alva's pencil**. The guide is a crooked star, and it stays crooked. | horse, and Alva |
| G1 | Vintergatan | — | **Den stora galoppen.** The rocket is gone. Kometen comes. Suddet rides on the shell. A full gallop the whole length of the comet's tail, 160 lengths across the whole sky, and Suddet rubs a river of small white stars behind you. The friends run alongside. Stopping loses nothing. | horse |
| F1 | Kometens huvud | — | **Novas lyft.** Kometen cannot brake, and the Moon is too far to jump. Take a run, **jump** off the comet's head and **hide in the air**: Nova catches the shell in her beam and carries everyone down. Miss, and Kometen swings round again. | turtle |
| F2 | Västra kanten | — | **Månens kant.** The Moon is dark underfoot: the only light is the Milky Way just made, and Nova's lamps. The bitten rim is a dashed arc. Gallop it in the Moon's long, light strides and the hooves draw the Moon whole. Its light runs back and fills the holes; the face is gone. The light returns to the forest. | horse |
| Finale | Novas krater | — | The ten lights fly from under Nova's dome to their marks. Alva colours them gold. **Trace the constellation Sköldhästen**: ten numbered dots, joined in order. | Alva and the player |

**New against the first two adventures**, so that it does not feel like the forest again:
- the Moon jump, and bounding as a way to travel (M1, Hoppfälten, M5);
- **hiding in mid-air** to drop (M4), and jump-then-hide (R2);
- a companion who lifts the shell (M2, M4, V3);
- making a friend angry on purpose, with her consent, to get light (M3);
- drawing figures that come alive (S1, S3);
- an order to remember, given by lamps (S2);
- orbit (S4, R4);
- a page with no ground at all (V1), and an antagonist who undoes your drawing (V3);
- **the hero itself rubbed out, and drawn back by the player** (V5): the rule of the whole series, "Alvas penna
  sitter i hovarna", turned on the sköldhäst itself;
- a finale you gallop, on a comet, with everyone you helped beside you (G1);
- every skill of the adventure in one move: run, jump, hide in the air, be caught (F1);
- drawing the Moon itself (F2), and a ten-point dot-to-dot (Finale).

**The big moments are played, not watched.** The launch and the two pictures of the forest are short pictures. The
view, the bear, the slingshot, the gallop, the catch and the Moon's rim all happen with the controls in the player's
hands.

**Kept on purpose**, because they are the game: gallop draws what is dashed (S1, S3, R5, V1); the shell is carried by
what carries only a shell (S4, R2, R4); the shell is a shield (R1); stillness makes light (V2, with Äventyr 2's own
seed). Nothing can fail, nothing is timed, and showers and laps come round again every few seconds.

**Order and gates** (for `story.mjs` and the order test):
- M1 gates everything (Nova does not follow, lift or point before breakfast).
- M2, M3, M4 in any order. M3 and M4 lie east of M2, but none needs another's result.
- M5 needs nothing; its scene differs with the number of stars found. The fin scene needs M5.
- `stjarn`: S1 first (it is the way in). Then S2, S3, S4 in the order of the page, but S3 and S4 can be reached
  without S2's star (the wagon passes Orions bälte).
- `ring`: R1, R2 in order; then R3, R4, R5 in page order, each optional to pass.
- `sudd` needs nine. Its steps are in order, and there is no way back (8.6).
- G1, F1, F2 and the finale follow in order. A save made anywhere in them resumes at that step's checkpoint.

## 10. Beats, in play order

1. **Prologue at the table** (section 11.1). A new page, at night. Alva paints Nova; the player draws the rocket's
   flame with Mira's pencils (free drawing, kept and used as the rocket's flame all through the adventure, as the
   cloud was in Äventyr 2). Alva rubs out the crooked star. The stars go out.
2. **The launch** (a picture, section 11.1b). Utsiktskullen at night, the rocket on its top, the whole forest there to
   wave: Tukankrabban and the ten small ones, Skatan, Tordyveln. Tukankrabban says what is at stake. Molnet flies
   beside the rocket up through the sky until the air ends. Then the forest is a small lit page far below, and the
   Moon fills the picture. **The landing:** the rocket comes down crooked in a cloud of slow dust. Nova wakes. "Inte
   före frukost."
3. **Breakfast (M1).** Then she talks: her name, the count, hypothesis 1, the question. Alva: her ten-year stars, one for every year.
4. **The Moon, freely** (M2–M4). After the first star: what a star-light is, and "under kupan". Klo and Nova's
   rivalry in three short scenes, after stars 1, 2 and 3 (section 11.5).
5. **The view (M5).** White holes. Nova's hypothesis falls; her lamps go red, then dim.
6. **The fin.** Crumbs. Mira draws it back. "Den SKA vara sned." Both new pages open.
7. **Stjärnbildsfältet.** Karlavagnen rolls; Orion's order; the bear and his nose; Pip and the photograph.
8. **Ringplaneten.** Gravel; the slingshot; the ice; Kometen ("Den tar bara de sneda."); the gap.
9. **At the table**, once, on whichever of the two pages is entered second: Mira cannot find the eraser.
10. **Nine stars.** Nova knows where the white is. At the table, Mira sees that Molnet on the last page has begun to
    flash again, just a little. Kometen's promise, shouted as it passes: whoever catches up may ride its tail.
11. **Det vita hålet: the rocket is rubbed out.** The thief is seen for the first time, as a small pink blur. No
    way back. They follow it into the white.
12. **The low point.** No ground, no stars, no map. Nova does not know the way. Then: drawing the ground; the fog,
    and what stands in it (everything Alva has rubbed out, and a first sköldhäst with the wrong legs); the seed
    (Klo thinks of her); the bridge that is rubbed out, twice; the shell carried over. The music has stopped. The
    squeak comes nearer.
13. **Månen suddas** (sections 11.10 and 16.1). Three bites. The face. The light goes out. **The forest, in
    lightning:** the storm is back, and the wind takes the smallest one; Tukankrabban catches him. The Moon's light
    runs out of it. Klo's notes are rubbed out (and the page in the player's notebook with them). "Sudda mig då."
    The sköldhäst loses its outline. **The player gallops it back.** Suddet stops. Alva's confession. The tenth
    star.
14. **The new job.** "Vad händer när man suddar på något svart?" But they are stranded. Pip has called. Kometen is in
    time.
15. **Den stora galoppen (G1).** Vintergatan, with everyone alongside.
16. **Novas lyft (F1)** and **Månens kant (F2).** The Moon is whole. **The forest is light again** (a picture: Molnet
    glows, Tukankrabban shows the small ones the road of stars).
17. **Finale in Novas krater** (section 11.12). The lights go home, the gold, the constellation, Supernova, the
    telescope.
18. **Epilogue at the table** (section 11.13). The eraser with a gold star, a new rocket, the real window.
19. **Free play.** The ending card; then every page open, with Vintergatan and the constellation in every sky,
    Suddet as a small friend on the Moon, Vintergatan as a road to gallop, and eight secrets (section 15).

## 11. The script

Style as in both adventures (`sv.mjs` headers): short boxes, about 90 characters at most, at most three boxes before
control returns, "du" to the player, plain child words, Swedish dashes. Speaker keys: `horse`, `klo`, `nova`, `sudd`,
`bjorn`, `komet`, `pip`, `alva`, `mira`, `tukan`, `moln`. Captions are the narrator's. Thoughts are the sköldhäst's.

Every line below is a draft for `content/sv.mjs`. All of them will be recorded, so settle the words before
recording (section 17).

### 11.1 The table (prologue)

- caption: En ny sida i forskningsdagboken. Den här gången är det natt.
- mira: Alva! Nu ritar vi rymden. Jag ritar en raket!
- alva: Och jag målar den som bor där uppe. Med vattenfärg.
- caption: Alva målar en lila krabba. Skalet ser ut som ett flygande tefat.
- alva: Det är rymdkrabban. Hon kan allt om rymden.
- mira: Är hon snäll?
- alva: Ja. Men inte på morgonen.
- caption: Mira ritar raketen. Ena fenan blir sned.
- mira: Den ska vara sned. Då svänger den bättre.
- *(the player draws)* prompt: Rita raketens eld med Miras penna!
- alva: Titta, mina tio stjärnor! Jag ritade en för varje år när jag fyllde tio.
- alva: Fast den där blev sned …
- caption: Alva suddar ut den sneda stjärnan.
- caption: Då slocknar en stjärna till. Och en till.
- mira: Alva! Dina stjärnor försvinner!
- alva: Jag suddade bara EN!
- caption: Under den mörka himlen blir hela den magiska skogen mörkare.

### 11.1b The launch (a picture)

`launch`:
- caption: Miras raket står på Utsiktskullen. Hela skogen har kommit för att vinka.
- tukan: Professor Klo! Ta med lyktan. Och kom hem igen.
- klo: J-ja! Jag skriver! Från varenda planet!

`launch2`:
- tukan: Utan stjärnor mörknar skogen. Och du vet vem som är rädd för mörkret.
- moln: Jag är inte rädd. Inte än. Jag följer er så högt jag når!
- mira: Tre, två, ett … SVÄNG!

`launch3` *(the rocket curves up; Molnet beside it; the forest shrinks)*:
- caption: Raketen svänger upp genom natten. Molnet följer med, ända tills luften tar slut.
- moln: Längre än så här når jag inte. Hälsa stjärnorna!
- horse: Vi hittar dem. Jag lovar.

### 11.2 The landing and breakfast (M1)

`arrive`:
- klo: Vi landade! Lite snett. Men vi landade.
- horse: Jag känner mig så lätt! Hovarna vill uppåt av sig själva.
- nova: VEM parkerar en raket på MIN måne? Före frukost?!

`arrive2`:
- klo: P-professor Klo. Expert på land och vatten. Vi letar efter …
- nova: Inte före frukost.
- horse: Vad äter du till frukost?

`arrive3`:
- nova: Kometflingor. De står på hyllan. Jag flyger inte före frukost.
- klo: Hyllan sitter väldigt högt.
- horse: Inte här. Här hoppar jag hur högt som helst!

Thoughts: `shelfSeen` "Där uppe står asken. På månen når jag nog." · `boxFalls` "Den faller så långsamt! Som en
fjäder."

`breakfast` (lamps go from violet to pink):
- nova: Så. Nu går det att prata med mig. Lite.
- nova: Jag heter Nova. Jag kan allt om rymden. Fråga inget dumt.
- horse: Alvas stjärnor försvinner. Vet du vem som tar dem?

`count`:
- nova: Tio är borta sedan i natt. Jag håller reda på varenda stjärna på himlen.
- alva: Det är mina tioårsstjärnor. En för varje år. Snälla, hitta dem!
- horse: Vem tar Alvas stjärnor – och varför?

`hypothesis1`:
- nova: Hypotes nummer ett: ett svart hål. Svarta hål slukar allt. Det vet alla.
- klo: Jag är också forskare! Får man mäta hålet?
- nova: Man får hålla sig ur vägen.

### 11.3 The first star-light and the beam (M2)

`crater`:
- nova: Min klo lyser. Det ligger något där nere.
- horse: Det är djupt. Ner kommer jag. Men upp?
- klo: Jag antecknar: ner är lätt. Upp är forskning.

`firstLight`:
- nova: Det här är bara ljuset. Stjärnan är borta, men ljuset blev kvar.
- nova: Jag lägger det under kupan. Där är det tryggt.
- klo: En stjärnburk med ögon. Jag antecknar.

`firstLight2`:
- nova: Jag hörde det där.
- alva: Det var min första! Den lyser ju fortfarande. Nio kvar!

`beam`:
- horse: Väggarna är för höga. Till och med här.
- nova: Ställ dig i ljusringen. Jag lyfter dig. Men sluta sprattla.
- klo: Ett skal som ligger stilla, kanske? Det brukar fungera.

Thoughts: `beamKick` "Hon lyfter inte en häst som sprattlar. Jag gömmer mig i skalet." · `beamUp` "Jag flyger! I
ett skal. I en ljusstråle."

`beamDone`:
- nova: Tung var du. För en häst.
- klo: För en sköldpadda är det helt normalt.
- nova: Bestäm er.

### 11.4 The night side (M3) and the ledge (M4)

`night`:
- horse: Det är kolsvart. Jag ser inte var jag sätter hovarna.
- nova: Det är natt på den här sidan. Natten på månen varar i två veckor.
- klo: Två veckor! Har du en lampa?

`night2`:
- nova: Fem stycken. De lyser bäst när jag är arg.
- klo: Och när blir du arg?
- nova: Av klapper. Hovklapper. Säg inget.

Thoughts: `nightDark` "För mörkt. Jag ser ingenting." · `nightLit` "Hon lyser! Röd som en lykta. Jag ser marken!" ·
`nightOut` "Lamporna slocknade. Hon har lugnat sig. Mer klapper!"

`nightAngry` (first time, while galloping): nova: Det där var MED FLIT. … Bra. Fortsätt.

`nightFace` (in the red light, at the crater):
- horse: Den där kratern … den ser ut som ett ansikte.
- nova: Det är en krater. Kratrar tittar inte. Det vet alla.
- klo: Jag antecknar ändå att den tittar.

`nightDone`:
- nova: Jag har inte varit så arg sedan en meteor landade i mina flingor.
- horse: Förlåt.
- nova: Det lyste bra. Vi säger inget mer om det.

`ledge`:
- nova: Min klo lyser igen. Där, under klippan.
- horse: Jag hoppar förbi varje gång. Jag svävar för långt!
- klo: Allt är lätt här. Utom … ett visst skal?

Thoughts: `ledgeFloat` "Jag svävar förbi. Jag skulle behöva falla som en sten." · `drop` "Skalet faller rakt ner!
Som en sten – fast på månen."

`ledgeDone`:
- klo: Från svävande häst till fallande sköldpadda på en sekund!
- nova: Tyngden beror på vad man är. Det vet alla.
- klo: Just det vet ingen! Det är min forskning!

### 11.5 Klo and Nova (after stars 1, 2 and 3)

`rival1`:
- klo: Jag har mätt månen. Den är … stor.
- nova: Tretusenfyrahundrasjuttiofyra kilometer tvärs över.
- klo: Jag skriver ”stor”.

`rival2`:
- klo: Jag skriver ett vykort hem. Till en … forskarkollega.
- horse: Till Tukankrabban.
- nova: Hans lampor blinkar. Jag menar ögon. Vad är det för fel på honom?

`rival3`:
- horse: Han är kär.
- nova: Det finns ingenting om det i mina stjärnkartor.
- klo: Det är ett vetenskapligt mysterium. Det har jag skrivit upp.

### 11.6 The view (M5) and the fin

`view0`:
- horse: Där nere ligger den magiska skogen! Så liten.
- klo: Det är mörkare där än när vi for. Jag ser knappt boet.
- nova: Tio stjärnor mindre. Det märks ända dit ner.

`view`:
- horse: Hela himlen! Och där … hålen där Alvas stjärnor satt.
- klo: De är vita. Jag antecknar: vita hål.
- nova: Vita hål finns inte. Svarta hål är svarta. Det vet alla.

`view2`:
- klo: Men titta. Vitt. Som … papper.
- nova: … Hypotes nummer ett stämmer inte.
- horse: Nova? Dina lampor slocknade.

`view3`:
- nova: Jag har aldrig haft fel om rymden förut.
- klo: Fel är också forskning! Jag har fel hela tiden.
- nova: Det märks. … Tack.

*(That "Tack." is small and fast, and Klo nearly falls off the rock. It is the only one before the finale.)*

`hypothesis2`:
- klo: Hypotes nummer två: någon samlar på dem! Som Skatan med sina pärlor.
- nova: En stjärntjuv. På MIN himmel.
- horse: Då letar vi vidare. Till raketen!

`fin`:
- horse: Raketens fena! Den är borta. Det är bara ett streck kvar.
- klo: Och här ligger smulor. Rosa smulor. Jag tar ett prov.
- mira: MIN fena! Jag ritar dit den igen!

`finDraw` prompt: Rita fenan igen med Miras penna! Sned ska den vara.

`finDone`:
- mira: Så! Lika sned som förut.
- nova: Den där raketen kommer att svänga.
- mira: Det är det som är meningen!

### 11.7 Stjärnbildsfältet

`stjarnArrive` (Nova wakes in the rocket):
- nova: Är vi framme? Väck mig inte.
- klo: Vi är framme.
- nova: Då är det morgon. Igen. Rör mig inte.

`stjarnArrive2`:
- horse: Jag väger ingenting! Jag simmar – fast det finns inget vatten.
- nova: Här finns inget upp och inget ner. Bara stjärnbilder.
- nova: Det där är Karlavagnen. Sju stjärnor. Strecken är inte dragna.

`wagon`:
- klo: Streckade linjer! Det kan vi. Eller hur?
- horse: I full galopp ritar hovarna klart dem.
- nova: Klapper. Naturligtvis.

Thoughts: `wagonThin` "Strecket håller inte än. Jag behöver full galopp." · `wagonStar` "Varje stjärna klingar när
jag springer förbi!"

`wagonDone`:
- horse: Den rullar! Karlavagnen är en riktig vagn!
- nova: En stjärnbild blir det den föreställer. Det vet alla.
- klo: Det visste jag inte. Jag antecknar allt hon säger.

`belt`:
- nova: Orions bälte. Tre stjärnor på rad. De tänds i en viss ordning.
- klo: Vilken ordning?
- nova: Titta på mina lampor. Jag visar en gång. Kanske två.

Thoughts: `beltWrong` "Fel ordning. Alla slocknade." · `beltOne` "Den tändes! Vilken blinkade hon sen?"

`beltWrongNova` (remark, at most every third miss): nova: Fel. Igen. Titta på lamporna.

`beltDone`:
- horse: Alla tre lyser – och där lossnade ett stjärnljus!
- nova: Mitten, vänster, höger. Det är inte svårt.
- klo: Jag antecknade ”vänster, mitten, hö…”. Jag stryker det.

`bear`:
- horse: En björn! Av stjärnor. Den sover.
- nova: Stora björnen. Karlavagnen är hans rygg och svans.
- nova: Min klo lyser. Han ligger på ett stjärnljus.

`bear2`:
- klo: Vi väcker honom! Hallå! HALLÅ!
- nova: Det hörs inget i rymden. Tur för dig. Han är värre än jag på morgonen.
- horse: Titta på hans nos. Den är bara streckad.

Thought: `bearNose` "Nosen är utsuddad. Om jag tar sats över ryggen kan jag rita den."

`bearWakes`:
- bjorn: … Snnff. Det luktar … frukost?
- nova: Äntligen någon som förstår.
- bjorn: Vem ritade min nos? Jag har inte känt en doft på hela natten.

`bearGives`:
- bjorn: Den här låg jag på. Den är varm. Ta den – den är inte min.
- bjorn: Snnff. Era smulor luktar gummi.
- klo: Gummi! Det skriver jag upp. Rosa smulor av gummi.

`bearStands` *(he rises; the heroes are on his back; the camera pulls far out)*:
- horse: Han reser sig! Vi står på en björn av stjärnor!
- klo: Jag antecknar: högt. Väldigt högt. Jag tittar inte ner.
- bjorn: Håll i er. Jag bär er en bit. Tre kliv, så är vi framme.

`pip`:
- pip: Pip.
- nova: Det är Pip. En satellit. Han säger bara pip.
- klo: Vad betyder det?

`pip2`:
- nova: Att han snurrar. Det ser jag väl.
- pip: Pip pip!
- nova: Och att han har fångat något. Ni får hämta det själva. Jag snurrar inte.

Thoughts: `orbitKick` "Jag sparkar mig ur banan! Jag är för lätt." · `orbit` "Skalet går i omlopp! Jag är en liten
måne."

`pipDone`:
- pip: Pip. Pip pip. Pip!
- nova: Han har tagit en bild av tjuven. Liten. Rosa. Kantig.
- klo: Liten, rosa, kantig – och smulor av gummi …

`hypothesis3`:
- klo: Hypotes nummer tre: någon suddar ut dem!
- nova: Det var min hypotes. Jag hann bara inte säga den.
- horse: Den är bådas. Ni forskar ju tillsammans.

*(Hypothesis 3 plays when both `photo` and `rubber` are known, wherever that happens.)*

### 11.8 Ringplaneten

`ringArrive`:
- nova: Morgon. Igen. Vem bestämde att det ska vara morgon så ofta?
- mira: Det är min planet! Den har ringar. Den heter Ringo.
- nova: Den heter Ringplaneten. Ringarna är is och sten, precis som Saturnus.

`ringo`:
- mira: Ringo.
- nova: Jag bråkar inte med någon före frukost. … Ringplaneten.
- klo: Jag antecknar båda.

`gravel`:
- horse: Aj! Det regnar grus!
- nova: Småsten från ringen. Det kommer i skurar. Jag hatar det.
- klo: Ett skal är en utmärkt sköld. Det har vi mätt förut.

Thoughts: `gravelSoon` "Det glimmar till där borta – nu kommer en skur!" · `gravelHit` "Gruset knuffar mig bakåt!
I skalet känns det inte."

`sling`:
- horse: Ringen tar slut. Och det är långt till andra sidan.
- nova: Planeten drar. Det går banor runt den. Tre stycken härifrån.
- klo: Det ligger rosa smulor i den mellersta!

`sling2`:
- nova: En som sparkar åker ur banan. En som ligger still följer med.
- horse: Ta sats, hoppa – och gömma mig i luften. Som på månen.
- nova: Det där var inte dumt. För att vara före lunch.

Thoughts: `slingBack` "Den banan gick tillbaka hit. Jag provar en annan." · `slingGo` "Det går fort! Hela planeten
snurrar förbi!"

`slingDone`:
- klo: Du blev slungad runt en hel planet! Jag hann inte ens mäta.
- nova: Tjugotvå sekunder.
- klo: … Du mätte åt mig.

`ice`:
- nova: Min klo lyser. Det sitter ett stjärnljus i isen.
- horse: Is smälter i sol. Men här är det skugga.
- klo: Planeten skuggar. Solen börjar där borta, vid strecket.

Thoughts: `iceWrong` "Blocket ska in i solen. Jag får knuffa från andra hållet." · `iceMelts` "Det smälter! Där
är stjärnljuset."

`comet`:
- komet: Hinner inte! Hinner inte! Ur vägen!
- nova: Kometen. Den har aldrig tid. Jag står inte ut med den.
- horse: Det sitter något i dess svans. Det lyser!

`comet2`:
- klo: Hallå! Stanna! Vi vill bara …
- komet: Hinner inte! Varv femtusentolv! Rekord!
- nova: Den stannar bara vid Rastplatsen. Ett andetag per varv.

Thought: `cometLane` "Dess bana korsar ringen. Om skalet följer med banan kommer jag till Rastplatsen."

`cometRest`:
- komet: Puh. Ett andetag. Vad vill ni? Fort!
- horse: Du har ett stjärnljus i svansen.
- komet: Jaså den! Den har kittlats i tre varv. Ta den!

`cometSaw`:
- komet: Jag ser allt från min bana. En liten rosa en. Den tar bara de sneda.
- komet: Mina streck är raka. Jag har linjalsvans. Den som hinner ikapp får åka på den! Hej!
- nova: Ingen hinner ikapp den. … Bara de sneda, sa den.

`crooked`:
- nova: Det stämmer. De raka stjärnorna är kvar. Alvas är borta.
- alva: Mina är sneda. Jag ritar på fri hand.
- klo: Hypotes nummer fyra: den tar bara det som är snett.

`gap`:
- horse: Ringen är utsuddad här. Bara ett streck kvar – och grusskurar.
- nova: Min klo lyser. Det sista ligger på andra sidan.
- klo: Galopp mellan skurarna. Hovarna ritar isen igen.

`gapDone`:
- horse: Nio! Bara ett kvar.
- nova: Nio under kupan. Det börjar bli trångt. Och varmt.
- nova: Jag vet var det tionde är. Bortom ringarna. Det vita.

`nine` (at the table, right after):
- mira: Alva! Molnet på förra sidan blixtrar igen. Bara lite.
- alva: Det är för mörkt där nere. Skynda er!
- klo: Tänk om den som suddar … suddar oss?

### 11.9 At the table (once, on the second of pages 2 and 3)

`eraserGone`:
- mira: Alva, har du sett suddet? Jag ritade fel på en ring.
- alva: Det låg här nyss. Rita över, så länge.
- mira: Jag ritar aldrig fel. Jag ritar om.

### 11.10 Det vita hålet

`suddArrive`:
- nova: Jag sov inte. Jag blundade argt.
- horse: Himlen tar slut. Det är … vitt. Det finns ingenting.
- klo: Inget land. Inget vatten. Inte ens rymd. Jag är expert på ingenting här.

`rocketGone` *(a squeak behind them; a pink blur; three strokes, and the rocket is a dashed outline)*:
- mira: MIN RAKET! Någon suddade HELA raketen!
- klo: Där! Något litet och rosa! Det hoppade in i det vita!
- horse: Då kommer vi inte hem.

`suddArrive2`:
- nova: Efter den. Vi har ändå ingen annan väg.
- nova: Fast … här finns inga stjärnor. Inga kartor. Jag vet inte vägen.
- klo: Du vet alltid vägen!

`suddArrive3`:
- nova: Inte här. Här är jag ingen expert. Här är jag bara sur.
- horse: Titta på papperet. Det finns märken där streck har suttit.
- klo: Märken är streckade linjer! Och streckade linjer …

Thoughts: `whiteThin` "Det finns inget att stå på. Jag måste rita det – i full galopp." · `whiteDraw` "Marken ritas
under hovarna! Jag ritar vägen själv."

`fog`:
- horse: Det är grått överallt. Jag ser inga märken.
- nova: Blyertsdimma. Det blir så när någon suddar mycket.
- klo: Jag har en lykta. Den jag fick av … henne. Den lyser bara när jag är stilla.

`fog2`:
- horse: Och du är bara stilla när jag är det.
- klo: Jag kan vara stilla! Titta. … Nej. Jo. … Nej.
- nova: Göm dig i skalet, så håller han sig lugn. Kanske.

Thought: `fogSqueak` "Det gnisslar där framme. Långsamt. Någon suddar."

`fogGhosts` (when the seed lights the second group of dents):
- horse: Det står saker i dimman. Halva saker. Ett hus utan tak. En drake utan huvud.
- nova: Märken. Hit kommer allt som någon har suddat ut.
- horse: Och den där … det där är jag. Fast med fel ben.

`fogGhosts2`:
- alva: Det var mitt första försök. Det blev fel. Jag suddade det.
- horse: Jag vill inte titta på den.
- klo: Titta på mig i stället. Jag är väldigt röd. Det brukar hjälpa.

`fogLit` (first time the seed lights):
- klo: Den lyser! Jag tänkte på henne. Då blev klorna alldeles stilla.
- nova: Är det där också ett vetenskapligt mysterium?
- klo: Det största.

`bridge` (after the second rub-out):
- horse: Den suddar ut bron så fort jag har ritat den!
- klo: Den suddar det som är snett. Och dina streck …
- nova: Är sneda allihop. Du ritar med hovar.

`bridge2`:
- horse: Jag kan inte rita rakt. Jag är en sköldhäst.
- nova: Ett skal är inget streck. Det går inte att sudda.
- nova: Ljusringen. Du vet hur man gör. Och sluta …

`bridge3`:
- horse: … sprattla. Jag vet.

The climax. How it looks, sounds and is limited is in section 16.1; these are its words.

`sudd1` *(no music; the Moon fills the sky beyond the crumbs; the slow squeak; Suddet at the Moon's rim)*:
- sudd: Vänta. Jag är snart klar. Bara en sak kvar. Den där är inte rund.
- mira: Det är MIN måne! Den är visst rund! … Nästan.
- nova: Rör den inte. Det är mitt hem. Mina flingor står där!

`bite1` *(a squeal; a white bite in the rim; everything dims one step; Nova's lamps go red)*:
- nova: MIN MÅNE!
- horse: Sluta! Hör du inte? SLUTA!
- sudd: Snart. Den är sned här också.

`bite2` *(a second bite, round, beside the first; darker again; pink crumbs fall like snow)*:
- klo: Jag ser knappt mina egna klor.
- mira: Alva. Månen har fått ögon.
- alva: Det är bara hål, Mira. … Titta inte på den.

`bite3` *(the third, long and jagged, under the two: a mouth. The Moon is a face. Then its light goes out.)*:
- mira: Den tittar på mig! Alva, DEN TITTAR PÅ MIG!
- nova: Det där är inte min måne längre.

*(Darkness. Only the white paper lights them, from below. Nova's lamps are out. Two seconds of nothing at all.)*

`forestDark` (a picture, seen only in flashes of lightning):
- caption: I den magiska skogen blir det kolsvart.
- moln: Mörkt … det är mörkt … Jag vill inte blixtra! Jag vill inte!

*(It does. The storm of Äventyr 2 is back: thunder, rain, the trees bent over. In one flash, through the clouds,
the Moon's face.)*

`forestDark2`:
- tukan: In under mig, ungar! Allihop! … Var är Lilla Klo?!
- tukan: Jag har dig. Jag har dig. Han kommer hem. Det har han lovat.

*(Between her two lines, one flash: the smallest one in the air, taken by the wind, and a toucan claw closing
round him.)*

`drain` *(back in the white: the Moon's yellow is running out of it in slow threads)*:
- nova: Kanten är borta. Utan kant håller månen inte ihop. Den rinner ut!
- horse: Det är du som tar Alvas stjärnor. Och nu månen!
- sudd: Jag tar ingenting. Jag suddar. Sneda streck ska bort.

`sudd2`:
- sudd: Det är det enda jag kan. Jag hjälper till.
- klo: Hjälper?! Jag har mätt dig. Du är nästan slut! Och allt du gör är att …

`notes` *(Suddet turns to Klo's notebook: three strokes, and the pages are grey smears)*:
- klo: Mina anteckningar! Alla mätningar! Häst eller sköldpadda – BORTA!
- sudd: De var sneda. Du skriver med klo.
- horse: Nu räcker det. Du rör inte mina vänner.

`offer`:
- horse: Jag är sned överallt. Häst fram, sköldpadda bak. Ingen vet ens vad jag är.
- horse: Sudda mig då.
- klo: NEJ!

`rubbed` *(Suddet rubs. The sköldhäst's outline goes faint, then dashed, then is gone: its colours hang in the dark
with no edges, drifting a little apart)*:
- horse: Jag … känner inte mina kanter. Klo? Var slutar jag?
- klo: Den är min forskning! Den är min VÄN! Ge tillbaka den!
- alva: Mina streck! … Men färgen. Färgen sitter kvar!

Thought, as the controls return (V5): `drawSelf` "Alvas penna sitter i mina hovar. Jag kan rita. Jag kan rita
MIG!" · while galloping: `drawSelf2` "Ett ben! Ryggen! Skalet!" · if the player stands still for a while:
`drawSelfWait` "Jag finns kvar. Färgen håller. Men jag behöver galoppera."

`drawnSelf` *(the last line closes; the sköldhäst stands whole, a little differently drawn than before)*:
- horse: Jag är här. Sned. Men här.
- sudd: Du … gick inte bort.
- nova: Färg går inte att sudda. Bara blyerts. Det vet alla.

`sudd4`:
- sudd: Och strecken ritade du tillbaka. Själv. Det har ingen gjort förut.
- sudd: Då är du inget misstag.

`alva1`:
- alva: Suddet. Det var jag. Jag suddade den första stjärnan.
- alva: Den blev sned, och jag blev arg på den. Sen ångrade jag mig.
- sudd: Så jag … hjälpte inte?

`alva2`:
- alva: Du gjorde precis det jag bad om. Det var jag som hade fel om stjärnan.
- alva: De sneda är mina. Jag ritar på fri hand. Det ska synas.
- mira: Jag tycker att de sneda är finast.

`tenth`:
- horse: Där är märket efter den första. Kan du rita den igen, Alva?
- alva: Ja. Och den får bli precis lika sned.
- prompt: Rita stjärnan igen med Alvas penna! Sned får den vara.

`tenthDone`:
- nova: Tio. Alla tio under kupan.
- sudd: Vad ska jag göra nu? Jag kan bara sudda.
- nova: … Titta upp. Vad händer när man suddar på något svart?

`newJob`:
- sudd: Det blir vitt. Små vita prickar.
- nova: Det heter stjärnor. Jag kan allt om dem.
- sudd: Kan jag … rita? Med sudd?

`stranded`:
- klo: Men vi har ingen raket. Och månen har ett hål. Hur kommer vi hem?
- pip: Pip! Pip pip pip!
- nova: Det är Pip. Han har sett alltihop. Han har ropat på … nej. Inte den.

`cometComes` *(a streak of light; the long straight tail sweeps in and lies still along the edge of the white)*:
- komet: HINNER! För en gångs skull hinner jag! Upp på svansen!
- sudd: Den är rak. Den suddar jag aldrig.
- horse: Suddet, hoppa upp på skalet. Jag galopperar – och du ritar!

### 11.11 Den stora galoppen (G1), the catch (F1) and the Moon's rim (F2)

Thoughts while galloping: `ride1` "Det blir stjärnor bakom oss! Hundratals!" · `ride2` "Fortare! Över hela
himlen!" · `ride3` "Jag har aldrig galopperat så här långt. Jag vill aldrig sluta!"

During the gallop (remarks: they never stop the gallop), each where its picture passes (8.5):
- komet: Jag har aldrig haft någon på svansen förut! Spring! SPRING!
- sudd: Jag ritar! Jag ritar med sudd!
- mira: Där är Ringo! Hej Ringo!
- bjorn: Snnff. Nu luktar hela himlen stjärnor.
- klo: Jag åker Karlavagnen! Jag har slutat räkna vid tusen!
- pip: Pip!
- nova: Det heter Vintergatan. Jag visste inte att man kunde göra den själv.

`lift` (at Kometens huvud):
- komet: Månen! Jag hinner inte bromsa! Hoppa!
- horse: Det är för långt. Och månen har ett hål där vi ska landa!
- nova: Hoppa. Göm dig i luften. Jag fångar dig.

Thoughts: `liftMiss` "Jag sprattlade. Kometen svänger runt – jag försöker igen." · `liftCaught` "Hon har mig!
Mitt i luften!"

`lift2` *(the beam holds the shell, Suddet on it, Klo below; her lamps blaze)*:
- nova: Jag är ingen taxi. … Håll i er. Allihop.
- klo: Hon bär oss alla! Sköldhäst, sudd och professor!
- nova: Säg … inget. Det är … tungt.

`landed`:
- sudd: Jag blev inte mindre. Inte ett dugg.
- nova: Man blir inte mindre av att rita. Det … visste jag inte heller.
- mira: Sen ritar jag ögon på suddet. Så det ser vad det gör!

`rim`:
- horse: Månens kant är utsuddad. Men märket finns kvar.
- sudd: Förlåt. Den var visst rund. Nästan.
- mira: Rita den precis så! Nästan rund!

Thought: `rimDraw` "Långa, lätta kliv – och månen ritas hel under hovarna!"

`rimHeals` *(the last stride closes the rim; the yellow runs back into the Moon and fills the three holes)*:
- mira: Ögonen försvinner! Den tittar inte längre!
- nova: Det var aldrig ögon. Det var hål. … Jag tittade inte heller.
- klo: Jag antecknar att den är rund. Nästan.

`forestLight` (a picture: the storm stops in the middle of a flash; the moonlight falls on the forest again, and
across the sky above it lies a road of stars):
- caption: Månskenet faller över den magiska skogen igen. Stormen tystnar.
- moln: Det är ljust! Jag slutade! Och titta – en hel väg av stjärnor!
- tukan: Titta, ungar! Titta, Lilla Klo! Där uppe galopperar han som bar er.

`rimDone`:
- horse: Månen är hel. Nu ska stjärnorna hem.
- nova: Till min krater. Där satt de. Rakt ovanför min säng.
- nova: Jag har tittat på dem varje morgon. Sur. Men jag har tittat.

### 11.12 Finale in Novas krater

`finale`:
- nova: Ut med er. En i taget. Tillbaka till era platser.
- horse: Alla tio. Precis där de satt.
- sudd: Jag rör dem inte. Jag lovar.

`gold`:
- alva: Nu färglägger jag dem. Med guldpenna.
- alva: Färgpenna går inte att sudda. Det sa Nova.
- nova: Det vet alla. … Nu.

`constellation`:
- alva: Och så ritar jag ihop dem. Tio stjärnor – en stjärnbild.
- prompt: Rita stjärnbilden med Alvas penna! Följ stjärnorna från ett till tio.

`constellationDone`:
- horse: Det är … jag! Hovar fram och skal bak!
- alva: Sköldhästen. En alldeles egen stjärnbild.
- klo: Häst eller sköldpadda? Det står på himlen nu: både och.

`supernova` *(all five lamps go gold; her eyes open wide)*:
- klo: Nova … dina lampor är guld. Alla fem.
- nova: Det kallas supernova. Det händer nästan aldrig.
- nova: Tack. Allihop. Säg det inte till någon.

`telescope`:
- nova: Professorn. Den här är till dig. Mitt gamla teleskop.
- klo: Till mig? Men jag kan ingenting om rymden!
- nova: Nej. Men du antecknar bra.

`ink`:
- sudd: Förlåt för anteckningarna. De var inte sneda. De var dina.
- klo: Jag kan dem utantill. Jag skriver om dem. Med bläck den här gången.
- nova: Bläck går inte heller att sudda. Det vet … ja, ja.

`moonJoke`:
- klo: Jag sa en gång att månen kanske var ett suddgummi som någon glömt på himlen.
- nova: Månen är sten. Suddgummit är han där.
- sudd: Jag är inte glömd längre.

caption: Över hela himlen lyser Vintergatan. Mitt i den galopperar en stjärnbild.

### 11.13 The table (epilogue)

- caption: Vid Alvas bord. Det är kväll.
- mira: Där är ju suddet! Det har ögon. Dem har jag ritat.
- alva: Och en guldstjärna. Den har jag ritat. Sned.
- mira: Och jag har ritat en ny raket. Ännu snedare.
- alva: Tio stjärnor för tio år. Vad gör jag när jag fyller elva?
- mira: Då får Suddet sudda fram en till!
- mira: Får suddet sova i pennfodralet?
- alva: Ja. Det har jobbat hela natten.
- mira: Varför är rymdkrabban så sur?
- alva: Hon har inte ätit frukost.
- caption: Utanför fönstret tänds stjärnorna. En av stjärnbilderna har hovar.
- caption: Slut – men forskningen fortsätter.

Ending card: title "Tio stjärnor – och en hel vintergata!" · body "Du hittade Alvas tio stjärnor och gav Suddet ett
nytt jobb. Nu galopperar Sköldhästen över himlen varje natt." · button "Utforska rymden".

### 11.14 Small lines

Nova when galloped beside (remarks, in turn, then silent): "Klapper." · "MÅSTE du?" · "Jag försöker vara sur i
fred." · "Nu räknar jag till fem. Lampa för lampa."

Nova's chatter (`CHATTER.nova`, when "Prata" has no hint to give):
- Solen är en stjärna. Det vet alla. Nästan.
- Jag är inte sur. Jag är på morgonhumör. Hela dagen.
- Fråga mig efter frukost. Nästa frukost.
- Jag har haft rymden för mig själv i tusen år. Det var … tyst.
- Stjärnor blinkar inte här uppe. Det är er luft som blinkar.
- Mina lampor är inte till för att tittas på.
- Ringo är inget namn på en planet. … Det är ett ganska bra namn. *(only after the story)*

Klo's chatter (`CHATTER.klo`):
- Här väger jag ingenting. Mitt hjärta väger lika mycket som vanligt.
- Jag antecknar allt hon säger. Hon säger väldigt mycket.
- Expert på land och vatten. Och, från och med nu, lite på rymden.
- Lyktan lyser när jag tänker på henne. Den lyser ganska ofta.

After the story: Suddet on the Moon (`suddTalk`): "Jag ritar en ny stjärna varje natt. En liten." · "När Alva
fyller år suddar jag fram en stor. Det har Mira bestämt." · "Mira ritade
mina ögon. Nu ser jag vad jag gör." · "Jag suddar bara när någon ber om det. Och frågar två gånger."

Refusals (`BALK`): `paper` "Här tar sidan slut." · `dark` (M3) · `thin` "Strecket håller inte än. I full galopp
ritar hovarna klart det." · `float` "Jag svävar förbi. Så kommer jag inte dit." · `high` "För högt. Till och med
här." · `white` "Där finns inget att stå på. Inte än." · `rubbed` "Den suddade ut det igen!" · `gravel` · `kick`
"Jag sparkar mig ur banan. Jag är för lätt."

## 12. Help

As in Äventyr 2: the goal note says what and why; every puzzle has an intro that gives the reason; up to three hints
in a companion's words, never key names. Either companion can give any hint ("Prata" alternates between them, as
after #32), so each hint is recorded in both voices. Hints are plain enough for either to say, except where the plain
words would have the speaker name itself ("Men Nova kan lyfta."): then that one has its own words (`OWN_HINTS`, audit of
13 November; nobody names themselves, as in Äventyr 1 and 2), listed after the ladders below.

### 12.1 Goals (`GOALS`)

| When | Goal | Why |
| --- | --- | --- |
| Before M1 | Hitta rymdkrabbans frukost | Hon pratar inte före frukost – och hon vet allt om rymden. |
| Moon, before the first light | Hitta Alvas stjärnor (0 av 10) | Tio stjärnor är borta sedan i natt. Nova vet allt om rymden – följ med och leta. |
| Moon, stars left there | Hitta Alvas stjärnor (n av 10) | Stjärnornas ljus har drivit iväg över hela rymden. Novas klo lyser när ett är nära. |
| All three Moon stars, before M5 | Klättra upp till Utsikten | Därifrån ser man hela himlen – och hålen där stjärnorna satt. |
| After M5, before the fin | Gå tillbaka till raketen | Stjärnljusen har drivit längre bort än månen. |
| Pages 2 and 3 | Hitta Alvas stjärnor (n av 10) | Någon tar dem. Vem – och varför? |
| Nine | Res till det vita hålet | Det tionde ljuset är där. Och den som suddar. |
| In `sudd`, before Suddet | Ta dig genom det vita | Här finns inget ritat. Hovarna får rita vägen. |
| Rubbed out (V5) | Rita dig själv | Suddet tog dina streck. Färgen sitter kvar – och Alvas penna sitter i hovarna. |
| After the talk (G1) | Galoppera hem på Kometens svans | Raketen är borta. Suddet rider på skalet och ritar stjärnor hela vägen hem. |
| At Kometens huvud (F1) | Hoppa till månen | Kometen hinner inte bromsa. Nova fångar ett skal som ligger stilla. |
| On the bitten Moon (F2) | Rita månens kant hel | Utan måne är det mörkt i skogen – och Molnet är rädd för mörkret. |
| The Moon whole | Gå till Novas krater | Stjärnorna ska tillbaka till sina platser, rakt ovanför hennes säng. |
| After | Utforska rymden | Forskningen fortsätter – ända ut i Vintergatan. |

### 12.2 Hints (`HINTS`), three steps each

- **m1**: Rymdkrabbans flingor står på hyllan ovanför hennes krater. · På månen hoppar du mycket högre än hemma. · Hoppa
  upp på hyllan och knuffa ner asken.
- **m2**: Stjärnljuset ligger på kraterns botten. Ner kommer du lätt. · Väggarna är för höga att hoppa upp för. Men
  Nova kan lyfta. · Ställ dig i ljusringen och göm dig. Strålen lyfter ett skal som ligger still.
- **m3**: På nattsidan behövs ljus. Novas lampor lyser bäst när hon är arg. · Hon blir arg av hovklapper. · Galoppera
  bredvid Nova. Gå vidare medan lamporna lyser, och galoppera igen när de slocknar.
- **m4**: Stjärnljuset ligger på en avsats under klippan. · Varje hopp svävar förbi. Du behöver falla rakt ner. ·
  Hoppa ut över avsatsen och göm dig mitt i luften. Skalet faller som en sten.
- **m5**: Från Utsikten ser man hela himlen. · Stenarna hänger som en trappa ut över kanten. · Hoppa från sten till
  sten ända upp. Här bär varje hopp långt.
- **moon** (on the Moon before Utsikten, where no puzzle is): Här finns inget mer att hitta. Vi letar längre bort på
  månen. · Månen är stor. Fortsätt bort från raketen, så långt det går. · Leta i den djupa kratern, på nattsidan och
  under klippan vid kanten.
- **fin** (the way back from Utsikten; the fin is found, and drawn, at the rocket): Raketen står kvar där vi landade. ·
  Gå samma väg tillbaka, förbi kratrarna. · Gå hela vägen tillbaka till raketen.
- **s1**: Karlavagnens streck är inte dragna. · Dina hovar ritar när du springer riktigt fort. · Ta sats på
  Hamnstenen och galoppera ut längs det streckade strecket, förbi alla sju stjärnorna.
- **s2**: De tre stjärnorna tänds i en viss ordning. · Novas lampor blinkar ordningen. Prata med henne, så visar hon
  igen. · Sväva till stjärnorna i den ordningen och landa på var och en: mitten, vänster, höger.
- **s3**: Björnen sover på ett stjärnljus, och ingen kan väcka honom. · Hans nos är utsuddad. Utan nos känner han
  ingen doft av frukost. · Ta sats över hans rygg och galoppera längs den streckade nosen.
- **s4**: Pip snurrar i en bana runt stenen. · Den som simmar sparkar sig ur banan. Ett skal som ligger stilla följer
  med. · Sväva in i banan och göm dig. Skalet går i omlopp och möter Pip.
- **r1**: Grusskurarna knuffar dig bakåt. · I skalet känns gruset inte. Bakom isblocken är det lä. · Göm dig när det
  glimmar, och gå vidare när skuren har dragit förbi.
- **r2**: Tre banor går runt planeten. Bara en går hela vägen. · Någon har lämnat rosa smulor i en av dem. · Ta
  sats, hoppa från ringens ände mot den mellersta banan och göm dig i luften.
- **r3**: Stjärnljuset sitter fast i isen. Is smälter i sol. · Solen börjar vid strecket längre fram på ringen. ·
  Ställ dig bakom blocket och knuffa det ända in i solen.
- **r4**: Kometen stannar inte för någon. Men den vilar ett andetag vid Rastplatsen. · Dess bana korsar ringen. Ett
  skal följer med banan. · Sväva in i Kometens bana och göm dig. Vid Rastplatsen plockar du ljuset ur svansen.
- **r5**: Ringen är utsuddad, men märket finns kvar. · Hovarna ritar isen igen i full galopp. Vänta ut skuren
  först. · Ta sats och galoppera ut på det streckade strecket precis när en skur har dragit förbi.
- **v1**: Här finns inget ritat. Men papperet minns var strecken satt. · Märkena är streckade linjer. · Galoppera
  längs ett märke, så ritas marken under hovarna.
- **v2**: I dimman syns inga märken. · Klos lykta lyser bara när hans klor är stilla. Han är stilla när du är det. ·
  Göm dig i skalet och vänta en stund. Lyktan visar nästa märke.
- **v3**: Suddet suddar ut bron bakom dig. Dina streck är sneda. · Ett skal är inget streck. Det går inte att sudda. ·
  Göm dig i ljusringen vid brons början. Nova lyfter skalet över.
- **v5**: Suddet har suddat dina konturer. Men färgen sitter kvar. · Alvas penna sitter i dina hovar. Den ritar när
  du springer fort. · Galoppera! Varje kliv ritar en bit av dig själv.
- **g1**: Kometens svans är rak. Den suddar Suddet aldrig. · Suddet rider på ditt skal och ritar stjärnor när du
  springer fort. · Galoppera längs hela svansen, ända fram till Kometens huvud. Stannar du går inget förlorat.
- **f1**: Kometen kan inte bromsa, och månen är för långt bort för ett hopp. · Nova fångar ett skal som ligger stilla.
  Precis som i kratern. · Ta sats, hoppa från Kometens huvud och göm dig mitt i luften.
- **f2**: Månens kant är utsuddad, men märket finns kvar. · Hovarna ritar i full galopp. På månen blir kliven
  långa. · Ta sats och galoppera längs hela den streckade kanten.
- **home**: Alla tio ljusen ligger under Novas kupa. · Stjärnornas märken sitter kvar ovanför Novas krater. · Gå till
  Novas krater.
- **more**: Det finns fler stjärnljus. Novas klo lyser när ett är nära. · Titta på stjärnkartan i dagboken: där står
  hur många du har hittat på varje plats. · Res dit det fattas ljus, och prata med Nova där.
- **white** (nine lights): Det tionde ljuset är i det vita hålet. · Raketen kan resa dit nu. · Gå till raketen och res
  till det vita hålet.

In Nova's own words (`OWN_HINTS.nova`): m2 "… Men jag kan lyfta dig." · m3 "Mina lampor lyser bäst när jag är arg." /
"Jag blir arg av hovklapper." / "Galoppera bredvid mig. …" · s2 "Mina lampor blinkar ordningen. Prata med mig, så visar
jag igen." · v3 "… Jag lyfter skalet över." · f1 "Jag fångar ett skal som ligger stilla. …" · home "… under min kupa." /
"… ovanför min krater." / "Gå till min krater." · more "… Min klo lyser när ett är nära." / "… och prata med mig där."
In Klo's (`OWN_HINTS.klo`): v2 "Lyktan lyser bara när mina klor är stilla. Och jag är stilla när du är det."

Pekklon's words (`POINT`, when "Prata" with Nova and a light is near): "Min klo lyser. Uppåt." · "… Neråt." · "… Åt
det hållet. Långt." · "… Alldeles nära. Titta bättre."

## 13. The notebook

The shared book (`book()` in `src/ui.mjs`), filled by `adventures/adventure-3/ui.mjs`, as Äventyr 2 does. Head:
**Forskningsdagbok · De försvunna stjärnorna**. Seven tabs:

1. **Framsida.** The title, Nova's face (grumpy), "En ny sida i forskningsdagboken. Den här gången är det natt.",
   the team: Sköldhästen, Professor Klo, Nova. After the end, Suddet is added, with eyes.
2. **Vad vet vi?** Vårt uppdrag, Därför, then **Novas kupa**: a drawing of her dome with ten places, a light in each
   one found. After the finale it shows the constellation instead. Här är vi. Nästa steg with the hints given so far
   as taped slips (the same ladder as "Prata").
3. **Stjärnkartan.** The four places as a sky chart: the Moon, the constellations, the ring planet, the white hole
   (a white patch, "?" until it is named), with the rocket's routes between them and "n av t" lights for each. A
   place is named once the story has named it (the ring planet is printed "Ringplaneten", with "Ringo" beside it in
   Mira's pencil). Listed as text underneath as well. After the great gallop the chart
   gains **Vintergatan**, drawn right across it, and after the finale the constellation Sköldhästen by the Moon.
4. **Frågan.** The question, the numbered hypotheses with their stamps (**Stämmer!** in red; **Stämmer inte** in
   grey, for the first time in the series), and Svaret once Suddet is met.
5. **Det vet vi.** The clues of section 7. After the end, "Hålen i himlen är vita" gets "Nu är de fyllda." and "Vid
   Alvas bord är suddet försvunnet" gets "Det sover i pennfodralet." Below the clues: **Novas rymdfakta** (13.5).
6. **Mätningar.** Häst eller sköldpadda? (section 14), then **Vykort hem** (13.6). **From the moment Suddet rubs
   out Klo's notes until the finale, this page is rubbed out too:** grey smears where the lines were, a few dashed
   remains of letters, pink crumbs in the fold, and one line in the sköldhäst's hand: "Suddet tog Klos anteckningar."
   The tab's mark shows that something has happened to the page. The postcards are untouched (they were posted).
   After `ink` in the finale the page is back, every line of it, in dark blue ink, with "Skrivet med bläck den här
   gången." at its foot.
7. **Hemligt.** Sealed until the end; then the eight secrets of section 15.

### 13.5 Novas rymdfakta

True facts in her voice, each written in when she first says it (or when its place is reached). They are the
adventure's quiet schoolbook, and they must stay correct.

| Id | Written in at | Fact |
| --- | --- | --- |
| `sixth` | M1 | På månen väger du bara en sjättedel av vad du väger hemma. |
| `prints` | Hoppfälten | Det finns ingen luft och ingen vind på månen. Ett hovspår ligger kvar i miljoner år. |
| `night` | M3 | Natten på månen varar i två veckor. |
| `side` | M5 | Månen vänder alltid samma sida mot jorden. |
| `sound` | S3 | I rymden hörs inget ljud. Det finns ingen luft som kan bära det. |
| `wagon` | S1 | Karlavagnen är en del av stjärnbilden Stora björnen. |
| `belt` | S2 | Orions bälte är tre stjärnor på rad. |
| `twinkle` | `stjarn` arrival | Stjärnor blinkar inte i rymden. Det är jordens luft som får dem att blinka. |
| `rings` | `ring` arrival | Saturnus ringar är gjorda av is och sten. |
| `tail` | R4 | En komets svans pekar alltid bort från solen. |
| `sun` | chatter | Solen är en stjärna. |
| `milky` | G1 | Vintergatan är vår galax. I den finns flera hundra miljarder stjärnor. |

(Checked against ordinary school astronomy on 12 November 2026. If one is ever doubted, change the fact, not the
truth.)

### 13.6 Vykort hem

Klo writes Tukankrabban a postcard from each page. Each is written into the notebook when the page's first star is
found, with a small drawn stamp. They are read, not spoken (no recording needed).

- **Månen:** "Kära Tukankrabban! Här väger jag ingenting. Det gör inte mitt hjärta heller, när jag tänker på dig.
  Hälsa ungarna. /Klo"
- **Stjärnbildsfältet:** "Kära Tukankrabban! Här glänser allt. Du skulle bli tokig. Jag har träffat en forskare som
  kan mer än jag. Jag antecknar. /Klo"
- **Ringplaneten:** "Kära Tukankrabban! Lyktan du gav mig lyser varje gång jag skriver till dig. Hur växer Lilla
  Klo? /Klo"
- **Det vita hålet:** "Kära Tukankrabban! Här finns ingenting alls. Då märker man vad man saknar. /Klo"
- **After the end:** "Kära Tukankrabban! Titta upp i natt. Den nya stjärnbilden har hovar. Jag kommer hem med ett
  teleskop. /Din Klo"
- **Her answer**, the last thing written into the notebook, a little while into free play (the notebook button
  marks it): "Käre Klo! Vi såg allt härifrån. Lilla Klo har ritat av stjärnbilden, med elva ben. Den glänser mer än
  guldmyntet. Kom hem snart. Ta med teleskopet – och den sura. /Din Tukankrabba"

## 14. Klo's research: häst eller sköldpadda, in space

The same machinery as Äventyr 2 (`MEASURES`, the tally, Klo's spoken remarks at the first of each kind and when it
stands even).

| Kind | Id | Written in when | Text in the notebook |
| --- | --- | --- | --- |
| horse | `moonJump` | M1 | Hoppade upp på en hylla. På månen. |
| horse | `angry` | M3 | Klapprade så att en rymdkrabba lyste. |
| horse | `wagon` | S1 | Ritade Karlavagnen med hovarna. |
| horse | `nose` | S3 | Ritade en björns nos i full galopp. |
| horse | `ice` | R3 | Knuffade ett isblock ut i solen. |
| horse | `gap` | R5 | Ritade en ring av is. |
| horse | `milky` | G1 | Galopperade fram Vintergatan. På en komet. |
| horse | `rim` | F2 | Ritade månen hel med hovarna. |
| turtle | `beam` | M2 | Lyftes i en ljusstråle. Sprattlade inte. |
| turtle | `drop` | M4 | Föll som en sten. På månen. |
| turtle | `orbit` | S4 | Gick i omlopp som en liten måne. |
| turtle | `gravel` | R1 | Skalet höll för en grusskur. |
| turtle | `comet` | R4 | Åkte snålskjuts i en komets bana. |
| turtle | `still` | V2 | Låg så stilla att en lykta tändes. |
| turtle | `noLine` | V3 | Ett skal är inget streck. Gick inte att sudda. |
| turtle | `caught` | F1 | Fångades mitt i luften. Av en rymdkrabba. |
| other | `weight` | M1 | Vikt på månen: en sjättedel. Av en häst eller av en sköldpadda? |
| other | `sling` | R2 | Ett varv runt en planet: tjugotvå sekunder (Novas mätning). |
| other | `mornings` | `sudd` arrival | Nova har varit morgonsur fyra gånger i dag. |
| other | `self` | V5 (written in ink, after the finale) | Ritade sina egna kanter. Det gör varken hästar eller sköldpaddor. |

Eight horse, eight turtle: it ends even, as it must.

Spoken: "Hovar! Även i rymden. Jag antecknar en hästsak." (first horse) · "Skalet igen! En sköldpaddssak – med
utsikt." (first turtle) · "Det står lika. Till och med här uppe." (first time even).

The conclusion, after the end, first talk with Klo (`measureEnd`):
- klo: I rymden väger ingen någonting. Då borde det inte gå att väga häst mot sköldpadda.
- klo: Men det står lika ändå. Åtta mot åtta.
- nova: Den är ingetdera. Den är en egen stjärnbild. Det vet alla. Nu.

## 15. After the story: secrets

Eight, written into "Hemligt" as they are found, as in Äventyr 2 (`SECRETS`).

| Id | Page | What happens | Text in the notebook |
| --- | --- | --- | --- |
| `silentNeigh` | any, in space | Whinny: no sound, only a small "…" bubble. Nova's claw glows: "Jag hörde det där." | Ett gnägg hörs inte i rymden. Men Novas klo hör allt. |
| `earthrise` | Månen, Utsikten | Stand still: the magic forest's page rises over the edge, with Molnet flashing a greeting. | Från Utsikten ser man den magiska skogen. Molnet blinkar hej. |
| `suddStar` | Månen, Novas krater | Stand still beside Suddet: it rubs one new small star into the sky above. | Suddet ritar en ny stjärna varje natt. En liten. |
| `secondBox` | Månen | Push the second cereal box (now on the shelf) down too. Nova: "Två frukostar. … Supernova." A short gold blink. | Två askar kometflingor ger en liten supernova. |
| `bearSnore` | Stjärnbildsfältet | Hide beside the bear: he falls asleep again and the stars of his back rise and fall. | Stora björnen somnar om när man ligger stilla bredvid. |
| `pipPhoto` | Stjärnbildsfältet | Orbit with Pip again: a flash, and the photograph appears on this notebook page. | Pip har tagit en bild av dig i omlopp. |
| `cometRace` | Ringplaneten | Gallop one whole lap of the ring: Kometen passes and says "Inte illa. För en … vad du nu är." | Kometen tycker att du är snabb. För en vad-du-nu-är. |
| `whiteDraw` | Det vita hålet | The white page is a blank sheet now: every gallop leaves a pencil line that stays (the last 300 points are kept). Draw whatever you like with your hooves. | Det vita hålet är ett tomt papper. Det du ritar där får vara kvar. |

Not a secret, but kept for the pleasure of it: the hoofprints on the Moon stay where they were made, all through the
adventure and between visits (Nova's fact `prints`), and Vintergatan can be galloped again from "Res".

## 16. Pictures, light and sound

**Style.** Still one hand: coloured pencil on paper, drawn in code. Space is new ground for the style, so it must be
set down.

- **A dark sky is pencil laid thick**: deep blue-black hatching in several directions, the paper's grain showing
  through as tiny pale specks. Never flat black, never a gradient.
- **Stars.** "Straight" stars (not Alva's) are small neat four-point crosses. Alva's are five-pointed, drawn free-
  hand, each a little different and a little crooked. The difference must be visible at a glance: it is a clue.
- **Holes.** Where a star was rubbed out: a ragged white patch with grey smears round it and the star's dent as a
  faint dashed outline.
- **Nova** is watercolour (3.1). **Suddet** is flat pink pencil with a grey rubbed end; its crumbs are pink and
  curled.
- **Star-lights**: a small, soft, pale-gold glow with no outline (the outline is what was rubbed out).
- **Det vita hålet**: the paper itself, at full brightness. The sköldhäst, in full colour, should look more solid
  there than anywhere else in the game.

**Atmosphere** (`src/atmosphere.mjs` moods; add four):
- `moon`: cool grey-gold light from the upper left, slow dust that hangs after every landing, no haze (no air).
- `space`: no ground haze, slow drifting specks at three depths, a faint nebula glow, no vignette darkening the
  centre.
- `ring`: warm light on the sunny half, blue shade on the other, glints on ice, gravel streaks during showers.
- `white`: no bloom, no vignette, soft grey smears drifting; the grade is lifted, not darkened.

**The seven big pictures** (section 0). Each is composed for all three sizes (390×844, 844×390, 1440×900) and gets
its own contact sheet. In each, the camera does something it has not done before in the series.

1. **The launch.** Utsiktskullen from the side, the crowd small on the hill, the rocket (as it was seen in Äventyr 2:
   red nose and fins, a round window, a small gold star on its side, and now the player's own flame under it). It
   rises in a curve, because of the fin. The picture follows it up: treetops, Molnet alongside, the forest becoming
   a page, the page becoming small, the Moon growing until it fills the frame.
2. **The view from Kanten** (M5), as the crown was in Äventyr 2: the camera turns to the whole sky, the Moon's edge
   below, the forest page far down and dimmer than it was, and ten white holes. Redrawn in layers at every size.
3. **Stora björnen stands up** (S3). The camera pulls back until the bear fills the height of the screen and the
   heroes are small on his back. This is the first time the game shows something truly huge and alive.
4. **The slingshot** (R2). The shell goes round the planet: the planet's curve fills the screen, the rings flash
   past edge-on, and the sun rises over the planet's limb as the shell comes out of the shadow.
5. **The white page** (arriving in `sudd`). After three dark pages the screen goes to bright paper, in silence. The
   rocket is rubbed out in three strokes.
6. **Den stora galoppen** (G1). The camera starts close on the hooves and pulls back, a little at a time, for the
   whole ride, until the comet's tail and the river of stars behind it run the full width of the screen and the
   friends are all in the picture. On phones the trail must read at 390 px wide (thick enough, bright enough).
7. **The finished sky** (the finale). Vintergatan across it, the Moon whole, the ten gold stars, the lines of the
   constellation. The camera rises slowly from Nova's crater until all of it is in view, and holds.

**The two pictures of the forest** (`forestDark`, `forestLight`) are short and drawn simply, from far above, like the
cloud's ride home in Äventyr 2: the page, the nest as a point of light, Molnet over it. They need no part of
Äventyr 2's view code.

### 16.1 Månen suddas: how it frightens, and where it stops

Pappa asked for the Moon to be as scary as it can be. This is the plan for that: about two minutes, from the first
bite to the moment the controls come back, built from the things that actually frighten a ten-year-old in a story:
the dark, a sound with no source, something familiar turned wrong, something of your own taken, and nobody who can
help. It uses no monsters, no blood, no death, no chase, and no sudden loud noise in silence.

**The approach (from V2 on).** The dread starts long before the scene.
- **The music stops** at the edge of the fog and does not come back until the gallop. It is the first true silence
  in the series.
- **The squeak.** A dry, slow rubbing: three strokes, a pause, three strokes. It is first heard in the fog, far off
  and to the right, and it grows nearer through V2 and V3. It never speeds up. When Suddet is finally seen it is tiny,
  and the sound is still coming from it. Small and unstoppable is worse than big.
- **What stands in the fog**: the dents of everything rubbed out. They are seen only when the seed lights them, for
  a few seconds, at the edge of the light.
- **The Moon rises over Smulhögen too large**: its lower edge behind the hill, its top out of the frame. The player
  has stood on it; now it hangs over them.

**The three bites.** Each is a held moment: the squeak, then one tearing squeal, then the change.

| | The Moon | The light | The picture |
| --- | --- | --- | --- |
| Before | Whole, pale yellow | Cool moonlight from above | The white page, the crumbs, long soft shadows |
| Bite 1 | A notch in the rim, upper right | One step darker; Nova's lamps red | Crumbs begin to fall |
| Bite 2 | A round hole inside the rim, upper left | Two steps darker; colours greying | Crumbs fall like pink snow |
| Bite 3 | A long jagged gash below them | **Out.** | The holes are two eyes and a mouth. The Moon is a face, looking down. |

- The face is never drawn as a face. It is three holes, each rubbed for its own reason, and the eye of whoever
  looks at it does the rest. Mira is the one who sees it, and says so; Alva tells her not to look. After that the
  player cannot not see it. It is the crater from Nattsidan (the foreshadowing in M3).
- **The light going out** is the centre of the scare. The moonlight from above is cut. For two full seconds nothing
  is said and nothing moves. Then the white paper is the only light, **from below**: every face is lit from
  underneath, every shadow is thrown upward, and the colours of the heroes are thin and grey.
- Nova's five lamps, which have been on since the first minute of the adventure, are out.

**The forest.** Not a look at the forest: flashes of it. The screen is black; each stroke of lightning shows one
still picture for a quarter of a second, with its thunder a moment after.
1. The treetops bent flat by wind, the nest a small dark ring.
2. Molnet, huge now, black, twisted round itself, its own flash inside it.
3. Through a tear in the clouds: the Moon's face.
4. The hatchlings running for Tukankrabban. Nine reach her.
5. The tenth, the smallest, in the air, turning over, taken by the wind.
6. A toucan claw closed round him.
The storm is the one the player ended in Äventyr 2, with the same thunder and the same wind sounds. That is the
point: everything that was won last time is being lost. Tukankrabban's last line is steady, and it is a promise.

**The Moon runs out.** Back in the white, the yellow leaves the Moon in slow threads from the three holes, drifting
down toward the paper, where it fades. It goes on through the whole talk, behind the speakers. Nobody has to say that
there is not much time; it can be seen. (There is as much time as the player needs. The threads are drawn, not
counted.)

**The notes.** Suddet turns from the Moon to the nearest crooked thing: the notebook in Klo's claws. Three strokes.
From this moment **the Mätningar page of the player's own notebook is rubbed out** (section 13), and the notebook
button's mark shows it. A child who opens the book now finds the smears. Nothing in the game has touched the
notebook before.

**The sköldhäst.** It steps between Suddet and its friends and offers itself, and Suddet, which is only doing its
job, rubs.
- The outline of the sköldhäst goes faint, breaks into dashes, and is gone. This takes four seconds and is the
  quietest part of the scene: one continuous squeak, no music, no thunder.
- What is left is colour without edges: the green of the shell, the orange of the mane, the white of the body, as
  soft patches that hang in the dark and drift a few pixels apart, as if about to come loose from each other.
- Its eyes are still there. It still speaks, more quietly: "Var slutar jag?"
- Klo's voice breaks for the only time in the series.
- **Then the controls come back**, with the patches still drifting, and the thought: "Jag kan rita MIG!"

**Rita dig själv (V5).** The release, and the best moment in the adventure if it is done right.
- The first stride of a gallop draws one hoof and its leg, in a fresh dark pencil line, with the pencil sound and a
  single low note. Each stride after it draws another piece: the legs, the belly, the back, the shell and its plates,
  the neck, the head, the mane, the tail. About twelve strides, each with the next note of the melody (section 16,
  sound): **the player gallops the theme into being, one note a stride.**
- A walk draws nothing. Standing still loses nothing: the patches stop drifting.
- The new outline is drawn a little differently than the old one, by the same hand. It stays that way for the rest
  of the adventure, and in free play: the sköldhäst that comes home is the one the player drew.
- With the last line a warm light comes up on the hill. It is not the Moon. It is the sköldhäst.

**How it is paid back.** Every thing taken is given back on screen before the end, and each return is bigger than
the loss: the sköldhäst by the player's own hooves, at once; the rocket's loss by a gallop across the sky; the Moon
by the hooves, and its holes by its own light (F2); the forest's light, and the storm stopping in the middle of a
flash; the notes in ink; the stars in gold.

**Limits** (these are fixed, whatever else is tuned):
- Nothing can be lost and nothing is timed. The scene waits for the player at every point where the controls are
  theirs.
- Nobody is hurt. The smallest hatchling is caught within the same picture, before the next line.
- Suddet never looks or sounds evil, and never chases anyone. It is small, earnest and wrong.
- No sudden loud sound out of silence. Each squeal and each thunderclap follows something seen.
- A friend's voice is heard in every dark stretch: Alva's or Mira's from the table, Klo's, Nova's.
- From the first bite to the controls coming back: under two minutes with every box read at an ordinary pace.
- It cannot be left half-way in a bad state: a save made anywhere inside the scene resumes from Smulhögen before
  the first bite (section 18.4).
- **Mindre rörelse** stills the lightning to slow fades and the drifting patches to a hold.
- **There is one version of this scene.** A setting to soften it ("Mindre läskigt") was drafted and removed at
  Pappa's word on 12 November: everyone who plays meets the same Moon.

**Sound.** There is no sound in space, said the script, so the *world* is quiet out there: no wind, no birds.
What is heard is close and soft: hooves on moon dust (dull thumps), hooves on star-lines (each star a note, as
the crystals had), ice (glassy), the beam (a rising hum), Nova's lamps (small clicks when they change), Suddet (a
rubbing squeak), Pip (pip). Music: one theme per page in the existing synthesiser (`src/audio.mjs`), sparse and slow
on the Moon, wide in the constellations, rolling on the ring, almost nothing in the white hole. **One melody runs
through all of them, never complete**: a phrase on the Moon, a longer one among the stars, its rhythm on the ring.
It is heard whole for the first time in the great gallop, with the hoofbeats as its drum, and once more, quietly, at
the table.

## 17. Voices

Every spoken line is recorded (ElevenLabs, `scripts/skoldhast-voice.mjs`; the key is in `.env`).

**The four new voices are chosen** (Pappa and Alva, 12 November, by ear, on the audition page "Röstprov Äventyr 3":
two rounds, eight proposals each in the second). They are in the ElevenLabs account under the names the recording
script expects (ElevenLabs Voice Design, category "generated", labels `game: skoldhasten`, `language: sv` and the
role), and in `VOICES` in `scripts/skoldhast-voice.mjs`.

| Role | Voice in the account | Chosen from | Designed as |
| --- | --- | --- | --- |
| `nova` | Sköldhästen – Nova | the first round's first proposal | A grumpy space crab whose shell is a little flying saucer, and who knows everything about space. Low, dry, slightly hoarse adult female voice, unhurried and deadpan, as if just woken and not pleased about it. Never shrill, warmth hidden underneath. |
| `sudd` | Sköldhästen – Suddet | "Ljus och oskuldsfull" | A little pink eraser, innocent and sincere. A light, clear, bright and simple young adult voice with a naive, wide-eyed tone, plain and honest, gentle and unhurried. |
| `bjorn` | Sköldhästen – Stora björnen | "Jättelik bas" | An enormous bear made of stars, as big as the sky. A huge, booming, cavernous, resonant bass male voice, extremely deep and slow, like a friendly giant. |
| `komet` | Sköldhästen – Kometen | "Hes sportkommentator" | An over-excited sports commentator of a comet. A hoarse, loud, rapid-fire adult male voice, shouting with excitement, breathless and thrilled. |

- Every proposal's id, description and audition clip is in `rymdkrabban/roster/` on Pappa's PC (gitignored), with
  `roster.json`. Nothing is recorded with these voices yet, so a change still costs nothing; after recording it means
  recording that character again.
- Pip is a sound, not a voice.

### 17.1 Direction: every line is acted

Pappa's word after the first auditions: the lines had no feeling. Äventyr 1 and 2 are recorded as plain text, one
line at a time. The second round read two scenes four ways (plain; with direction; with direction and the lines
around it as context; the whole scene in one take), and Pappa chose **direction, line by line** (way B). So, for every
spoken line of Äventyr 3, and of Äventyr 1 and 2 when they are recorded again (section 17.2):

- **The line carries its direction:** English audio tags in square brackets, before the words they colour, and as
  many as the line needs, mid-line too:
  `[groggy, furious] VEM parkerar en raket på MIN måne? [exasperated sigh] Före frukost?!`
  Eleven v4 acts the tags and does not read them aloud (checked on 12 November: speech-to-text hears the words, and
  hears a sigh or a yawn where one was asked for).
- **The tags never touch what is shown.** The clip is found by who speaks and the shown text (`src/voice-key.mjs`),
  and the speech box must not show brackets. So the direction lives beside the text, in a file of its own that the
  game never loads: `regi.mjs` next to each adventure's `sv.mjs` (`src/content/regi.mjs`,
  `adventures/adventure-2/content/regi.mjs`, `adventures/adventure-3/content/regi.mjs`). It exports `DEFAULT` (the
  default tag per voice) and `LINES`, a list of `[voice, say]`, where `say` is the line as shown with its tags in:
  `['nova', '[groggy, furious] VEM parkerar en raket på MIN måne? [exasperated sigh] Före frukost?!']`. A side file
  rather than a third element in `sv.mjs`, because Äventyr 1 and 2 also have bare strings (hints, thoughts) that
  have nowhere to carry one, and because the game's text then stays exactly as it is. The recording script matches
  each entry to its line by voice and by `say` with the tags removed. A test asserts that every entry matches exactly
  one line of `voiceScript()` (so a changed line cannot keep a stale direction) and that no line has two.
- **Lines with no entry** (hints, Nova's pointing words, chatter, remarks, thoughts) still get acted: the `DEFAULT`
  tag of their voice. For Äventyr 3: Nova `[dry, deadpan]`, Klo `[helpful, a little nervous]`, the sköldhäst
  `[thoughtful, to itself]` for thoughts, Suddet `[earnest]`, the narrator `[warm, storytelling]`. A line's own entry
  always wins.
- **Settings:** Eleven v4, Swedish, `voice_settings: { stability: 0.35 }` (freer than the default, which is what lets
  a sigh or a laugh through). No `previous_text`/`next_text` (way C was not chosen), no whole-scene takes (way D).
- **Writing the direction is part of build step 11** (section 20), together with reading the script aloud: each box
  of section 11 gets its tags then, in the spirit of the auditions (the lines on the audition page are the model).
  The tags describe what the character feels, not how loud the recording is; keep them short, two or three words.
- **Checking a take:** speech-to-text with audio events on (`tag_audio_events: true`). A take is kept when the words
  come back (80 % or more) and no tag word is heard as speech. A tag that is spoken aloud means it was put where the
  model read it as text: move it or shorten it.

Existing voices used: Sköldhästen, Professor Klo, Alva, Mira, Tukankrabban and Molnet (the launch and the two
pictures of the forest), the narrator.

Add to `voiceScript()` a section "Äventyr 3" beside "Äventyr 2" (`VOICES` is done), with hints for both companions
(`klo` and `nova`). Roughly 520 new clips: about 330 story boxes, 24 hint ladders × 3 steps × 2 voices, the pointers,
chatter and remarks.

**Settle the words before recording.** The night playtest of 8 November showed what happens otherwise: a changed line
means a new clip. Read the whole script aloud once (the voice audit's method, `docs/skoldhast/voice-audit.md`) before
the first recording.

Note for recording on Pappa's PC: its ffmpeg has no `libmp3lame`. Ask ElevenLabs for MP3 directly
(`output_format=mp3_44100_64`) and measure loudness with the local ffmpeg, as the re-recorded map hint was on
8 November (the handover of that day).

### 17.2 Äventyr 1 and 2 recorded again with direction

**Decided, not started.** On 12 November Pappa and Alva listened to a before-and-after trial on the audition page
(round three): 31 lines in six scenes, each as the game plays it today and recorded again with direction, at the
game's loudness. The directed take won in all six: "Klo träffar Sköldhästen", "Stoppuret", "Kartväktaren i fyren",
"Molnet på Åsktoppen", "Klo är kär", and the plain hints with only their voice's default tag. Pappa's choice: **record
every line of Äventyr 1 and 2 again with direction** (not only the story). **Nothing is recorded until Pappa says
so.**

The trial is the model. Its 31 lines, their tags and the speech-to-text of each take are in
`rymdkrabban/roster/omgang3/omgang3.json` on Pappa's PC (gitignored), with the clips. Those takes are approved and
can be kept as they are instead of recorded again. Default tags used in the trial: Klo `[helpful, curious]`,
Tukankrabban `[curious, bubbly]`, the sköldhäst `[thoughtful, to itself]`.

What comes first, before the first clip, in this order:

1. **Direction in the recording script** (`scripts/skoldhast-voice.mjs`): read the `regi.mjs` files (section 17.1);
   send `say`, or the line with its voice's default tag; Eleven v4 at `stability: 0.35`; speech-to-text with audio
   events, and no tag word heard as speech. The test in `tests/skoldhast-voice.test.mjs` for the entries.
2. **A way to record existing lines again.** Today `--record` takes only lines without a clip. Keep, beside the
   clips but outside the manifest the game loads, which `say` each clip was recorded with (for example
   `skoldhast/voice/regi.json`, key → `say`). A line is to be recorded again when its current `say` differs; a
   run can then stop and go on, and a direction changed later re-records only that line. A take that fails the
   check keeps the old clip.
3. **Write the direction.** Own tags for the story (about 400 lines in `regi.mjs`, the trial's 31 included),
   `DEFAULT` for every voice: Sköldhästen, Klo, Kartväktaren, Signe, Alva, Mira, Tukankrabban, Molnet, Tordyveln,
   Skatan and the narrator. Hints, greetings and small talk (about 520 lines) get the default only, as the trial's
   hint scene did.
4. **The narrator's voice id.** The narrator is Pappa's own voice, given to the script as
   `SKOLDHAST_NARRATOR_VOICE`; it is not in `.env`. Pappa gives it, or the narrator's 25 lines stay as they are.
5. **Record in parts**: Äventyr 1, then Äventyr 2, a voice at a time; measure loudness (`--level`); listen to a
   sample of each voice on the audition page before the next; then commit. The old clips stay in git history, so a
   single line can go back.

Cost: about 920 lines and 51,000 characters, plus a fifth to a third for retakes: about 60,000–65,000, roughly 40 %
of the account's month. On Pappa's PC, whose ffmpeg has no `libmp3lame`, the clips come as `mp3_44100_64` from
ElevenLabs: a third larger than today's 48 kbit/s (the voice folder is 28 MB; clips load one line at a time and are
not in the first download).

## 18. Implementation

### 18.1 Files

A new folder, the same shape as Äventyr 2's, outside the shared prefetch tree:

```
skoldhast/adventures/adventure-3/
  main.mjs          runtime, loop, title, save (copy adventure-2/main.mjs and adapt)
  game.mjs          state, flags, step wrapper (gravity, float, beam, erasing)
  puzzles.mjs       pure puzzle logic for M1–F2
  story.mjs         beats, goals, hints, clues, hypotheses, measures, secrets
  view.mjs          the five pages, the sky, effects, the big pictures
  characters.mjs    Nova, Suddet, Stora björnen, Pip, Kometen, the rocket
  table.mjs         prologue and epilogue at Alva's table
  ui.mjs            the counter (Novas kupa), the notebook's pages, the ending card, the journey picker
  a3.css
  content/sv.mjs    every player-facing string (section 11–15)
  content/regi.mjs  the direction for the recordings, never loaded by the game (section 17.1)
  content/world.mjs the five pages
```

Shared code used as it is: `src/sim.mjs`, `src/ground-guard.mjs`, the hero rig, Professor Klo, input, audio, voice,
`book()`, the drawing overlay, `src/atmosphere.mjs` (new moods), `src/frame-guard.mjs`, the launcher and save.
`src/sim.mjs` stays unchanged, as in every session so far: what space needs is done in the adventure's own step
wrapper, the way Äventyr 2 applies its winds.

Catalogue (`src/adventures.mjs`): give `adventure-3` its `module: '../adventures/adventure-3/main.mjs'` and keep
`released: false` until the release PR. `ADVENTURE_UI.titles['adventure-3'] = 'De försvunna stjärnorna'`. The picker
icon: `star`. Preview: `dev/play.html?adventure=3`.

### 18.2 Engine work, by rule

Each item names the rule it serves and the nearest existing code.

1. **Low gravity (rule 2), `game.mjs`.** The sim has one constant, `C.gravity`. After each sim step on `mane`, while
   the player is in the air and not hidden, add back `(1 − g) · C.gravity · dt` to `vy`, with `g = 0.4`. Take-off
   speed is unchanged, so height and distance both become 2.5 times as large (hop 1.56 HL, buck 1.3 HL, a gallop
   jump about 8 HL). Hidden: no correction, so the shell falls at full weight. **Verify first** that the sim lets
   the player hide while in the air; if it does not, the wrapper sets the hidden state itself on a hide press in the
   air (and the hero rig needs the tuck pose in the air, which the long-fall work of 29 September may already give).
   The ground guard must be told the larger jump reach.
2. **Floating (rule 3).** `stjarn` and the space round the ring are one large water volume of a new `kind: 'space'`:
   swim controls, no surface, no splash, no bubbles, no "wet". A hidden shell there has no sink speed. The view draws
   nothing for the volume. Asteroids and drawn star-lines are ordinary surfaces; stepping onto one from the float is
   the existing "wade out".
3. **Lanes of pull (rule 4).** Currents as in Kelpskogen and Kristallsjön (`waters[].currents`), closed into loops
   (Pip's orbit, Kometen's lane) or arcs (the three sling lanes; two of them return like K2's blue and green). The
   existing rule "a swimmer is pushed out, a hidden shell is carried" is K2's and P6's.
4. **Star-lines (rule 5).** Thin dashed surfaces, as Mira's bridge and the crystal bridge (`thin`, drawn by gallop,
   refused at a walk). New: a line may bend (a polyline), and "stars" along it ring a note when passed
   (`crystals.notes` gives the pattern). A finished constellation sets a flag that its figure reacts to (the wagon's
   ride is an fx; the bear's waking is a beat).
5. **Nova (3.5).** A companion actor like Tukankrabban, with: hover height; follow that may cross gaps; carrying Klo
   across them; `beamSpots` in the world (x, y, target) that lift a hidden player along a short path (the spring in
   Kristallgrottan is the nearest code); `lamps` state with a mood and an `angryUntil` time; `pointer` (nearest
   unfound light within 12 HL).
6. **Anger light (M3).** A `dark` zone as Rotgrottan's, lit while `G.time < nova.angryUntil`; a gallop within 3 HL of
   Nova sets it 4 s ahead. A moment-to-moment state, never saved (as `flash`).
7. **Gravel showers (R1, R5).** Äventyr 2's gusts (`stepWeather`, `applyWinds`) with new pictures: period 5 s, 1.7 s
   of shower, 0.8 s of warning, shelters behind ice blocks.
8. **Ice block (R3).** The beetle's ball (`pushBall`) on a flat path, with a `sunX` line: past it, a melt timer.
9. **Order of three (S2).** A small state machine: target order, lit count, reset on a wrong landing. Nova's lamps
   replay the order on arrival, on "Prata", and after a reset.
10. **Drawing the ground (V1).** A network of thin dashed surfaces, as star-lines. Nothing else is solid on the page,
    so the ground guard's "put back where it last stood" is the safety net for a fall.
11. **The seed in the fog (V2).** P4's stillness timer, three times, each revealing the next group of dents.
12. **Suddet rubs out the bridge (V3).** After the bridge is drawn and the player reaches its middle, Suddet's fx
    rubs it out from the far end, the surface is un-drawn, and the player is set back on the start ledge (a short
    float down, not a fall). After two rub-outs the beam spot's ring lights and the `bridge` talk plays. From then on
    the bridge is not offered.
13. **Den stora galoppen (G1).** Its own page, `vinter`: one solid surface 160 HL long (the comet's tail), normal
    gravity. While `suddRiding` and at full gallop, a trail emitter leaves stars; progress is the furthest x reached,
    so stopping loses nothing. The trail is saved as one number (how far) and redrawn from it. The background is
    three scrolling layers (the white hole, the ring planet, the constellations, the Moon) keyed to progress, not to
    time. The friends are actors placed by progress as well (the bear and the wagon enter at 60 HL, Pip at 85), and
    each remark plays when its mark is passed. The camera's zoom is a function of progress.
14. **Three tracings** (the fin, the tenth star, the constellation) with the existing drawing overlay. New for the
    constellation: **numbers beside the dots** (1–10), and the finished line stays in the sky as drawn (the player's
    own stroke, stored like the cloud's stroke in Äventyr 2, with the neat guide as fallback).
15. **The flame.** The prologue's free drawing, with colour choice, stored like Äventyr 2's cloud (`strokes`) and
    used as the rocket's flame texture.
16. **The rocket as a door.** A context action "Res" at the rocket opening a small card with the four places.
17. **The counter.** `Novas kupa` in the HUD where the egg count was: a small dome with "n av 10". On a narrow phone
    it sits where upstream put the egg count (not under the goal note; see the night playtest).
18. **Cameras.** Every staged talk uses the group fit added on 8 November (`fit`, `portraitFit`) with Nova in it: she
    hovers high, so the fit must include her dome, not only her x.
19. **The pursuit in the white (V1–V3).** Suddet is an actor that stays ahead: it waits at the far end of each
    stretch and hops on when the player comes within about 10 HL. It is never reachable before Smulhögen. The
    rocket's rubbing-out on arrival is an fx (three strokes, the outline left dashed) that sets `rocket_gone`.
20. **The catch (F1).** At the comet's head a `catchZone` in the air: a hidden shell entering it is taken by Nova's
    beam (the beam-spot code, with a moving start) and carried along a fixed path to Västra kanten. A jump that is
    not hidden falls short onto a lower loop of the tail, which carries the player back to the head ("Kometen
    svänger runt"): a miss costs about four seconds and nothing else.
21. **The Moon's rim (F2).** While `moon_bitten`, the surface of Västra kanten is replaced by a thin dashed arc
    (star-line code, low gravity). Drawing it sets `moon_whole`. While it lasts, the bite is drawn wherever the Moon
    is in the picture: from Smulhögen and during the last stretch of `vinter`.
22. **Pictures without play:** fx `launch`, `forestDark`, `forestLight`, built as Äventyr 2's `cloudRide` is: a few
    drawn layers, captions and speech, no simulation.
23. **The bear stands (S3).** His star-lines are surfaces that move along a short authored path with the player on
    them (a moving platform, new to the engine: the player's position is carried by the surface's motion each
    step). Keep it simple: the player's controls are held for the three strides, as during a leap.
24. **The Moon's states (V4, F2).** `moonBites` 0–3 and `moonLit`, drawn wherever the Moon is in the picture (the
    sky of Smulhögen, the end of `vinter`, the Moon page itself). The bites are fixed shapes placed so that three of
    them read as a face at every screen size, upright and on its side (check all three sizes: on a narrow phone the
    Moon is cut by the frame, and the face must still be whole). The draining light is a few slow particle threads.
25. **Light from below.** A new atmosphere mood, `dread`: no bloom, no shafts, the paper's glow as a soft gradient
    from the bottom edge, a strong vignette, and the heroes' sprites tinted cool and a little grey. It blends in
    over each bite (the moods already blend over 1.5 s) and out when the sköldhäst is whole.
26. **The forest in flashes.** fx `forestDark`: six still pictures drawn from simple layers (as `cloudRide`), each
    shown for about 0.25 s inside a white flash, black between, thunder after each. Äventyr 2's thunder and wind are
    in `src/audio.mjs` and can be called as they are.
27. **The sköldhäst without its outline (V5).** The hero is drawn in code (`scripts/skoldhast-art/hero.mjs`), so the
    art build can write a second set of frames with the colour fills only, no pencil lines (`hero-fill`), and the
    outline as its own set of strokes in drawing order. In the scene the rig shows the fill frames with a soft edge,
    each colour region offset by a few pixels that grow slowly; the outline is a list of about twelve stroke groups,
    each revealed by one gallop stride (`puz.selfDrawn`, 0–12). When all are drawn, the rig swaps to a third set,
    `hero-redrawn`: the same hero with the outline redrawn by hand, a little differently (a different noise seed
    in the pencil toolkit is enough). That set is used from then on, and after the story. All three load only with
    Äventyr 3, outside the first-playable budget; check their size against the 10 MB total.
28. **The notebook page rubbed out.** A flag `notes_rubbed` makes `ui.mjs` draw the Mätningar page as smears (the
    lines' positions kept, the text replaced by dashed fragments); `notes_ink` draws it back in ink. `story.measure`
    keeps counting underneath, so nothing is really lost.
29. **Silence, and the squeak.** `audio` needs a way to fade the music to nothing and hold it (today it changes
    area), and one new sound, the rubbing, with its volume and pan set from Suddet's distance and side.

### 18.3 World data (`content/world.mjs`)

Per page, as Äventyr 2: `bounds`, `surfaces`, `waters` (with `kind: 'space'` and lanes), `spots`, `areas`,
`checkpoints`, plus:

- `gravity` (0.4 on `mane`, 1 elsewhere, ignored inside `space` volumes);
- `lights`: the ten star-lights, each `{ id, x, y, how }` with `how` one of `touch`, `given` (bear, Pip), `melt`,
  `tail`, `belt`, `trace`;
- `beamSpots`, `darkZones`, `starLines` (with their stars and notes), `showers`, `iceBlock`, `beltStones`, `dents`
  (V1), `fogGroups` (V2), `lastBridge` (V3), and on `vinter` the `tail`, its `marks` (where each picture and remark
  comes) and the `catchZone` (F1); on `mane` the `rim` (F2).

`LIGHT_IDS`, `LIGHT_TOTAL = 10`, and lights per page (3, 3, 3, 1) are exported for the tests, as `EGG_IDS` is.

Checkpoints (each must stand on ground or float, as the ground audit of 4 November requires): `start`, `crater`,
`night`, `edge`, `view` · `dock`, `belt`, `bear`, `pip` · `icedock`, `sling`, `shade`, `cometLane`, `gap` ·
`whiteEdge`, `fog`, `lastBridge`, `crumbs` · `tailTip`, `tailMid`, `cometHead` (on `vinter`) · `westRim`, `home`
(the Moon, for F2 and the finale).

### 18.4 Save

The existing adventure-aware save (`flags`, `checkpoint`, `puz`, `strokes`, `ended`). `strokes` holds the flame, the
fin, the tenth star and the constellation. `puz` holds the ice block's x, the belt's progress, the ride's distance.
Moment states (anger light, shower phase) are not saved. **The climax is one unit for the save:** from the first
bite until the sköldhäst is whole, `checkpoint` stays at `crumbs` and the flags `moonBites`, `notes_rubbed` and the
rubbed-out state are set only in memory; they are written when `drawnSelf` has played. A game closed in the middle of
the scare opens again on Smulhögen with the Moon whole and Suddet at its rim. `puz.selfDrawn` is therefore never
saved either. As the audit of 4 November found for eggs: **a light that is
being handed over when the game closes must not be lost** (restore gives it on reload).

### 18.5 Budget and performance

No new download beyond code and voice clips: everything is drawn in code on the existing pencil tiles, as in
Äventyr 2. The first-playable budget is untouched (the adventure's folder is fetched only when it is chosen). The
dark sky is the risk: many small stars are sprites on one painted texture, not separate graphics. The ride's trail is
capped (about 400 points, thinned behind the camera). The frame guard stays as the safety net.

## 19. Tests and checks

As for Äventyr 2, and a PR is not done without them.

- `tests/skoldhast-a3-playthrough.test.mjs` with `tests/skoldhast-a3-robot.mjs`: a robot plays from a new game through
  all five pages to the ending with ordinary inputs, and reports play time and dialogue boxes. It asserts: ten lights;
  every flag of the finale; every measure written in; every hypothesis stamped; every fact written in.
- `tests/skoldhast-a3-order.test.mjs`: a second robot in another order (ring before constellations; M4 before M2;
  the view before any star), and random players at every gate, as on 4 November: M2's walls cannot be jumped even on
  the Moon; the ledge of M4 cannot be landed on without the drop; the dark cannot be crossed unlit; Pip's and Kometen's
  lanes throw a swimmer out; the two false sling lanes return; the gap of R5 and the white page cannot be crossed at a
  walk; `sudd` is closed before nine; nothing gets stuck in 100 runs of free play per page; nothing leaves a page.
  For the one-way pages: a save and reload at every checkpoint of `sudd`, `vinter` and the bitten Moon resumes and
  can still finish; Suddet cannot be reached before Smulhögen; the Moon cannot be reached from the comet without
  the catch; a missed catch always comes round again; a player who stops on the tail for a minute loses nothing.
- The climax: the robot plays V4 and V5 through (and asserts that a walk draws nothing, that standing still for
  30 s changes nothing, that twelve strides complete the outline); a save taken at every beat inside the scene
  restores to `crumbs` before the first bite and can still finish; the notebook's Mätningar page is rubbed between
  `notes` and `ink` and whole before and after, with the same lines.
- Words: short boxes, no key names in help, Alva and Mira only as voices, nobody says "sned" or "sudd" before its
  time (section 7), every hint ladder has three steps.
- `tests/skoldhast-voice.test.mjs` already fails until every line is recorded and nothing is left over.
- `tests/browser/skoldhast-a3.mjs`: the prologue and the launch, all five pages at 390×844, each of the seven big
  pictures at three sizes, the ending saved, no page errors. Speaker checks as #32 added (who speaks is in the
  picture). In the great gallop: the sköldhäst, Suddet on its shell and the trail are all on screen at every size
  from the first stride to the last.
- Contact sheets under `docs/skoldhast/shots/a3/` at 390×844, 844×390 and 1440×900: one sheet per page, and one for
  the seven big pictures.
- The climax in a real browser at all three sizes, with a screenshot at each of its states (before, bite 1, 2, 3,
  dark, each of the six forest flashes, the drain, the notes, the outline going, colour only, half drawn, whole):
  the face reads at every size; in the dark every speaker can still be told apart; the colour patches are on screen
  and the stride count shows; nothing is pure black for more than the two seconds asked for. The same with "Mindre
  rörelse".
- A check with Större text and Mindre rörelse. With less motion, the launch, the bear's rising, the slingshot, the
  gallop's scrolling sky and the catch each have a calm version (a cross-fade between two still pictures instead of a
  sweep), and the story still plays to the end.
- Frame rate: the great gallop is the heaviest scene. Measure it with `?debug` on Alva's device before release.

## 20. Build order

One PR, one visible outcome (`skoldhast/CLAUDE.md`). `released` stays `false` until the last.

1. **Nova stands on the Moon.** The folder, the catalogue module, `dev/play.html?adventure=3`, the `mane` page's
   ground and sky, low gravity, Nova drawn from the contract (with the dev character page), following and hovering.
   No story. *Outcome: bound across Hoppfälten with her behind you.*
2. **The Moon plays.** M1–M5, the beam, the anger light, the drop, three lights, the counter, the first notebook
   pages, the view. Robot for page 1.
3. **The table, the launch and the rocket.** Prologue (Nova painted, the flame drawn), the launch picture with the
   forest's friends, the landing, the fin, "Res".
4. **Stjärnbildsfältet.** Floating, star-lines, Karlavagnen's ride, the belt, the bear (who stands), Pip.
5. **Ringplaneten.** Showers, the sling with its picture, the ice, Kometen, the gap.
6. **Det vita hålet.** The white page, the rocket rubbed out, the pursuit, the fog and what stands in it, the
   bridge, Suddet, the tenth star. The climax as a plain stand-in first (the talk only, the Moon untouched), so
   that the page plays from end to end. The stand-in is never released.
6b. **Månen suddas.** The full climax of section 16.1: the three bites and the face, the `dread` light, the forest
   in flashes, the notes, the sköldhäst without its outline and **Rita dig själv**. *Its own PR,
   with its own contact sheet. Play it with the sound on before merging.*
7. **Den stora galoppen.** The `vinter` page, the trail, the friends alongside, the catch, the Moon's rim, the light
   back in the forest. *This PR is the heart of the adventure; give it the time.*
8. **The finale and the epilogue.** The finished sky, the gold, the constellation, Supernova, the table, the ending
   card, free play with the sky changed on every page.
9. **The notebook complete, the secrets, Klo's count.**
10. **Music.** The one melody and its five settings.
11. **Read aloud, direct, then record.** The voice audit; then the direction for every line (section 17.1); then
    all clips.
12. **Audits.** Play-order audit, ground audit, phone audit, a critic's read for "is it epic?" against section 0,
    contact sheets (the audits Äventyr 2 needed after release, done before it this time).
13. **Release.** `released: true`, the tests that expect Äventyr 3 locked changed on purpose, the handover.

### 20.1 When it is released

Decided 12 November, on this document's recommendation:

- **All of it at once, and only when it is finished.** No first part. The mystery is one arc, the white hole is
  one-way, and the gallop is the reward for everything before it; a half would spend the surprise.
- **The occasion to aim for is julafton, 24 December 2026**: an adventure this size deserves a day, and six weeks is
  a fair time for thirteen steps, the recording and the audits. Merge it in the evening of 23 December (GitHub Pages
  caches for ten minutes, and nobody should be merging on the day).
- **The gate, all of it, or it waits:**
  1. build steps 1–12 are merged;
  2. `npm test` and `tests/browser/skoldhast-a3.mjs` pass, and every line has its clip;
  3. the play-order audit, the ground audit and the phone audit are done and their findings fixed;
  4. Pappa has played it from the table to the table on the device Alva uses, with the sound on, and has watched the
     Moon be rubbed out (16.1) with his own eyes;
  5. Alva has finished Äventyr 2 in her own save, since that is what unlocks Äventyr 3.
- **If the gate is not met by 20 December, it is not a Christmas present.** It is released when the gate is met, on
  the next day that is an occasion. A late adventure is forgotten in a week; one that breaks in the white hole,
  where there is no way back, is not.
- Until then nothing of it shows: `released: false`, and the only glimpse stays the rocket from Utsiktskullen.

### 20.2 What the build changed (12 November)

Pappa asked for the whole adventure in one go ("implementera hela Äventyr 3 i ett svep"), with the recording left until
he says the adventure is finished. Steps 1–9 of the build order were built together; step 10 (the music: the melody
`STAR_THEME`, "Vintergatans visa", in seven settings) and step 12 (the audits, `docs/skoldhast/adventure-3-audit.md`,
and the contact sheets in `docs/skoldhast/shots/a3/`) followed the same evening; step 11 (recording) waits for
Pappa's word, and step 13 (release) for the rest of the gate. The robots
(`tests/skoldhast-a3-playthrough.test.mjs`, `tests/skoldhast-a3-order.test.mjs`) play it from breakfast to the gold
stars with ordinary inputs (about 330 s, 310 boxes). What playing it changed against this document:

- **Words.** Nobody may say "sudd" before hypothesis 3 (section 7), and some drafted lines did: `bearNose` and the
  second hint of `s3` now say "bara streckad"; `gap` and the first hint of `r5` say "Ringen är borta här"; the clue
  `crumbs` says "Fenan var borta"; the first hint of `v3` begins "Något suddar …". New refusals: `BALK.gravel`,
  `BALK.breakfast` (before breakfast the way east refuses) and `BALK.fog`. The ninth light, wherever it is found,
  plays `gapDone` and `nine` (the ring's last light is not always the ninth).
- **The Moon jump.** A jump pressed standing still with the stick held goes forward as high as a running one, and on
  the Moon the stick steers a jump a little in the air, so a rock a length wide can be landed on. Not over the ledge
  (M4): there every jump floats past, and a jump that comes down on it without hiding floats on past it; the ledge's
  light can be taken only after the shell has dropped there. Played on a phone (13 November), a thumb holds the stick
  all the way: a jump that would sail over a rock higher than its take-off now comes down on it, the stairs refuse a
  walk off their far ends, and a shell hidden in the air within half a length of the ledge drifts onto it as it drops
  (Göm dig works 0.1–0.8 s after the jump, not only 0.3–0.6 s).
- **The Moon's shapes.** Positions are as in `content/world.mjs` (Hoppfälten 20–44, Djupa kratern 44–56, Nattsidan
  56–76 with five lengths of run-up before the dark, Kanten 76–95, Utsikten 95–100; the stairs rise at most 1.35
  lengths). Walls that must hold (the crater, Hyllan) are explicit walls beside separate floors: a slope nearly
  vertical can be crept up in the shared sim, and a wall exactly vertical drops whoever pushes on it through the floor.
- **Space.** Floating is faster than swimming (about four lengths a second); a hidden shell hangs still unless
  something pulls it; Hoppa beside a rock or a floe climbs onto it. The kick of Pip's lane always throws a swimmer
  outward (from his rock too: he is not a trap).
- **The ring goes round.** On past the last floe the page wraps to Isbryggan; a fourth lane takes a hidden shell from
  Skuggsidan's west end back to the ring's end. A swimmer under the ring is pulled back onto the ice after a moment.
- **The rocket's door** answers from 2.2 lengths. After the story Mira's new rocket stands at every page's dock, the
  white hole's too.

### 20.3 What the audit changed (13 November)

Three read-only audits after the release (the story's order and who says what; the runtime; the notebook, this
document and the Swedish), and what came of them. Every change has a test (`tests/skoldhast-a3-reload.test.mjs`,
`tests/skoldhast-a3-fixes.test.mjs`, `tests/skoldhast-a3-words.test.mjs`).

- **Nobody says "Nova" before she does** (Pappa's find): section 7. Until breakfast she is "rymdkrabban".
- **Closing in the middle of a scene loses nothing**: a scene a one-time event started (the box landing, a light, a drawn
  line, Pip's photograph, Kometen's rest, an arrival) is played again after a restore if it did not end. Before, the
  bear's light could be lost for good, and with it the white page.
- **Play**: Karlavagnen is drawn before anyone floats on to Orions bälte; talking to Nova at the belt blinks the order;
  the gravel measurement is written for every player, so "åtta mot åtta" holds; "Jag har fastnat" never skips open
  space; the floating ledge rule is the Moon's only; the bridge hints wait for the bridge to be rubbed out; after the
  story the comet ride home saves on the Moon.
- **Words**: the first star-light's scene plays on whichever light is found first; the hints above that were added
  (moon, white) or rewritten (fin, m5) and the own words; "galopperar den som bar er" (Tukankrabban: the sköldhäst is
  "den" in the series); Klo's "smulor vid raketen" at Pip (Pip can come before the bear's rubber).
- **The notebook**: the Moon's postcard is written when Klo says he writes it (rival2); the Karlavagnen fact when the
  bear is met; Kometen's clue with Nova's "De raka stjärnorna är kvar"; "Stjärnljus" over the kupa until the first light;
  "Inga hypoteser än" before the first.
- **This document follows the build** where it had drifted: the white page's postcard is written on arrival (13.6), the
  pipPhoto secret shows no photograph on the page, and cometRace is any wrap at a gallop (15).

## 21. Risks and what to tune

- **The Moon jump may feel floaty rather than fun.** Tune `g` between 0.35 and 0.5 with a real child's hands. The
  rifts' widths follow from it.
- **Hiding in mid-air** is the one new input skill (M4, R2). M4 teaches it with no pressure: the overhang is wide,
  and a miss just lands on the ground below, beside the beam spot.
- **M3 asks the player to annoy a friend.** The script makes Nova suggest it and approve it ("Det där var MED FLIT.
  … Bra. Fortsätt."). If it still reads wrong when played, change the cause from anger to effort (her lamps flare
  when she has to fly fast to keep up with a gallop) and keep the puzzle.
- **S2 is a memory task** in a game that has had none. Three items only; she repeats whenever asked; a miss costs
  nothing.
- **V3 undoes the player's work twice.** It must be quick and funny, not a punishment: the rub-out takes about a
  second, the set-back is two lengths, and the talk follows at once.
- **The white page on a phone in sunlight**: the dashed dents must be dark enough to see. Check on a real device.
- **Nova's grumpiness must stay likeable.** If a line reads as mean when spoken, cut it. She is funny because she
  helps anyway.
- **Suddet must never be frightening.** No chase, no threat to the heroes that the player believes for more than a
  line. The one moment it rubs at the sköldhäst is played for the squeak.
- **Continuity:** in Äventyr 2's finale the star was drawn with "Alvas penna" and shines yellow. This adventure says
  they were pencil, to be coloured later. Keep the prologue line ("Jag skulle färglägga dem sen") near the front if
  anyone asks.
- **The Moon is meant to frighten** (section 16.1), and that is a decision, not a risk. The risk is the wrong kind
  of fright: one that feels unfair, that goes on too long, or that leaves a child alone in it. So: the player is
  never chased and never loses; a friend's voice is heard in every dark moment; the worst of it (from the first bite
  to the controls coming back) is under two minutes; and every thing taken is given back before the end, on screen.
  Play it once with Alva, and with Mira beside her, before release. There is no softer version to fall back on
  (Pappa removed the setting), so if it proves too much, the scene itself is what gets tuned: the number of bites,
  the two seconds of dark, the hatchling in the wind.
- **A one-way page.** `sudd` cannot be left. The gate (nine lights) makes sure nothing is left behind, and the tests
  in section 19 must prove a save anywhere in it can still finish.
- **The great gallop could be long and empty, or long and wonderful.** 160 lengths is about 25 seconds at a full
  gallop. Something new must enter the picture every four or five seconds (section 8.5's marks), and the camera
  must never stop pulling back. If it drags when played, shorten the road before cutting any of its marks.
- **Epic is mostly contrast.** If every scene is loud, none is. Keep the Moon playful, the white hole silent, and
  the talk with Suddet small and still, so that the gallop has somewhere to rise from.
- **Words.** The script here has about 330 boxes against Äventyr 2's 175. That is right for the longest adventure,
  but the read-aloud pass (step 11) should cut whatever does not earn its place: the start of Äventyr 2 went from 18
  boxes to 12 after its critic's read, and lost nothing. No scene should hold the controls for more than nine boxes.
- **Size.** This is the biggest of the three: about a third more to build than Äventyr 2's long version. The build order
  lets it stop being built after any step and still show something whole, and steps 1 to 5 are an adventure in
  themselves if the last third has to wait.

## 22. Frågor till Alva och Pappa

**Settled on 12 November.** Pappa answered, or said to go with this document's recommendation:

| Question | Answer |
| --- | --- |
| Vad heter rymdkrabban? | **Nova** (sur: "Surnova", jätteglad: "Supernova"). |
| Är skalet ett flygande tefat? | Ja. |
| Vad är det blålila under henne? | En ljusstråle. Hon svävar på den och lyfter saker med den. |
| Vad är prickarna på skalet? | Fem lampor som visar hennes humör. |
| Vad äter hon till frukost? | Kometflingor. |
| Vad är hon galen i? | Stjärnbilder, frukost och att ha rätt. |
| Varför är hon morgonsur? | Av ingen anledning. Hon är det bara. |
| Hur läskig ska månen vara? | "Gör månen så läskig du bara kan." Section 16.1. |
| En inställning som gör månen snällare? | Nej. "Mindre läskigt" är borttagen. |
| Får det vita hålet vara enkelriktat? | Ja. |
| Alvas första, utsuddade försök till en sköldhäst i dimman? | Det står där "med fel ben", som skrivet. |

| Ska Tukankrabban följa med upp i rymden? | Nej. Hon stannar hemma med ungarna, Klo skriver till henne, och på slutet skriver hon tillbaka. |
| Ska ringplaneten heta "Ringo"? | Ja, av Mira. Nova säger "Ringplaneten". |
| "Tio stjärnor, en för varje år" efter att Alva har fyllt elva? | De är hennes tioårsstjärnor: "Jag ritade en för varje år när jag fyllde tio." Suddet suddar fram en ny för varje år efter det. |
| Vem skapar de fyra nya rösterna? | De är skapade, och valda på gehör av Pappa och Alva (section 17). |
| Hur ska replikerna låta levande? | Regi på varje replik: ljudtaggar bredvid texten, inspelade friare (section 17.1). |
| Ska Äventyr 1 och 2 spelas in igen med regi? | Ja, alla repliker. Regin vann i alla sex scener i före-och-efter-provet. Inte påbörjat (section 17.2). |
| När ska äventyret släppas? | Helt och färdigt, inte i delar. Sikta på julafton 2026; grinden i section 20.1 avgör. |
| Är Suddet rätt som den som tar stjärnorna, med Alvas egen utsuddade stjärna som orsak? | Ja. ("Allt som du skrivit låter bra!") |

**Still open, for Alva** (none of it blocks the build):

1. **Har Nova fler fakta**, som tukankrabbans lista? Alla fakta från Alva blir kanon, som förra gången.
2. Om något i tabellen ovan är fel om hennes egen krabba, är det Alva som har rätt.

**For Pappa to do** (not questions any more):

1. **Play it through before release**, on Alva's device, as the gate in section 20.1 asks.
2. **Say when Äventyr 1 and 2 may be recorded again**, and give the narrator voice's id (section 17.2).
