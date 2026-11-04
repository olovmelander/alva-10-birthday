# Äventyr 2: audit and the long version (4 November)

Pappa asked for Äventyr 2 to be much longer, more polished, with a better story and more puzzles, and for
everything to hang together: "gör en audit, fixa allting som behöver fixas och förbättra och förläng". This
is what the audit found in the first build, what was fixed, and what was added. The design itself is
`docs/skoldhast/adventure-2.md`.

## How it was audited

- Played start to end with the robot (`tests/skoldhast-a2-robot.mjs`), which drives the real simulation,
  puzzles and story with ordinary inputs, and read every dialogue box in order.
- Read every Swedish line, hint, goal and clue against the story: who knows what, and when.
- Checked each puzzle for its "why" (does the player know what to do and why), its hints, and what happens
  if the player does things in another order, reloads, or walks away halfway.
- Looked at every page in a real browser at 390×844, 844×390 and 1440×900.

## Story

| Found | Fixed |
| --- | --- |
| The mystery was never asked out loud. The player collected eggs without a question to answer. | The arrival asks "Men vem är det som stormar – och varför?" and Tukankrabban states her first hypothesis. The journal shows the open question and her latest hypothesis, which change as the clues come in. |
| The answer was found halfway (the cloud sat in Jätteträdet) and the rest was errands. | The crown now shows *where* the storm comes from: Åsktoppen, the mountain behind the waterfall. The second half of the adventure is the journey there: Kristallgrottan, then Åsktoppen, then the cloud in the eye of the storm. |
| The prologue contradicted itself: Mira's cloud was there to stay, then the storm came from nowhere. | Alva asks "Mira, du ritar väl månen sen?" – "Mm … blixtar först!", and the cloud flees east across the page before the storm. |
| Mira did not recognise her own cloud, and nobody said why the moon was not drawn at once. | On the summit Mira says sorry to her cloud; Alva explains that the moon waits for the nest, or the eggs would hatch alone in the forest. |
| The cloud gave nothing back and the way home was a cut. | The cloud has kept the last egg warm on its nest of fluff, and carries everyone home: a short picture of the ride over the forest and the river. |
| Tordyveln and Skatan disappeared after their puzzles. | Tordyveln turns up in the mountain with a new glitter ball (K3); both come to the nest for the finale, and Skatan brings a gift. |
| Clues arrived in an order that answered questions before they were asked. | `CLUE_ORDER` follows the story: moon rule, no moon, lightning, the dark storm, the crying cloud, the source, the lantern, the fear, the moon. |
| The gold coin could be found before Skatan wanted anything, and the scene then talked about her. | Found first, it gets its own scene ("Mitt guldmynt! Det glänser nästan som ett ägg."), and the trade still works later. |
| Mira was silent on the east bank. | She speaks at the river and the waterfall. |

## Puzzles and flow

| Found | Fixed |
| --- | --- |
| Eight puzzles plus the climb: shorter than Pappa wanted. | Twenty steps on four pages (see the design's table): the mushroom bounce, the lantern, the crown's lookout, K1 crystal plates and bridge, K2 three currents, K3 glitter ball and two plates, the spring, T1 wind with shelter, T2 the lightning bridge, the summit. |
| The next-egg hint pointed across the map even when an egg was open on this page. | It prefers the nearest open puzzle on the page you are on. |
| Inside the mountain without the lantern, hints talked about eggs you could not reach. | The hint says what is missing first: the source, then the lantern. |
| "Guida mig" moved the hint ladder up every frame, so the first hint was skipped; "Påminn mig om Klo" did nothing in Äventyr 2. | Guided help reads the note without climbing the ladder (`hint({ peek })`). "Påminn mig om Klo" now gives Klo's hint once per puzzle after 45 seconds without progress. |
| Talking needed standing almost on top of someone. | Talk reach is 2.6 horse lengths. |
| Companions could cross a gap the player had not opened, or stand off screen while speaking. | They stop at closed edges, walls and unfinished lines, and the story brings them beside the horse before a scene. |
| The slow-drum line repeated on every hoofbeat. | Every sixth time. |

## Bugs

| Found | Fixed |
| --- | --- |
| A save closed between Skatan's promise and her egg lost the egg. | `start()` repairs it, and the same for the cloud's egg. |
| "Alla tio ägg!" could play after the ending, or at the nest during the finale. | It plays only before the ending and away from the nest. |
| A love scene could start in the middle of the summit. | Love scenes wait until the mountain top is behind you. |
| The cloud flew in at a speed that depended on the frame rate. | It moves on game time. |
| A misplaced line in `main.mjs` (the reminder) broke the page from loading. | Moved; the browser check now loads every page. |
| Dead code from the first build. | Removed. |

## Swedish

- "streckad" for Mira's unfinished lines everywhere; "Det första ägget"; "Tukankrabban" with a capital T as
  her name; "mot ravinen"; no "varje natt" (there is only one night).
- Every drawing prompt in one form: "Rita … med Miras/Alvas penna! Följ prickarna."
- Place names on the journal's map and in the captions: Flodstranden, Djupa skogen, Kristallgrottan,
  Åsktoppen.
- Dialogue boxes are at most 100 characters and at most three per group (the robot checks this), and hints
  never name keys.

## Pictures

- The sky depends on the page: the forest pages show Åsktoppen on the horizon with the storm turning round
  its top (calmer once the cloud is met); Kristallgrottan has a dark crystal wall instead of a sky, no rain,
  and a soft darkness round Tukankrabban's lantern; Åsktoppen has jagged mountains, heavier storm clouds,
  lightning on the bridge's schedule, and wind streaks in the gusts.
- Kristallgrottan: the cave roof with stalactites and crystals, crystal plates that glow as they ring, the
  chasm black until they are lit, the crystal bridge, the rock wall into the lake, the three marker crystals
  with their currents shown as bubbles, the glitter ball, plates that sink, the gate that lifts, the spring.
- Åsktoppen: boulders for shelter, grass bending in the gusts, the ravine, the bridge of light, the eye of
  the storm round the summit, the cloud's nest of fluff.
- Smaller: the mushroom squashes when it bounces, the tunnel into the mountain behind the waterfall, the
  cloud-ride picture.

## Length

The robot plays optimally and skips nothing; the prologue is not counted.

| | Robot play time | Dialogue boxes | Puzzle steps |
| --- | --- | --- | --- |
| Äventyr 1, Kapitel 1 | 0.7 min | 26 | 2 |
| Äventyr 1, all three chapters | 4.1 min | 94 | 8 |
| Äventyr 2, first build | 3.6 min | 112 | 8 + the climb |
| Äventyr 2, now | 4.8 min | 161 | 20 |

A child's real play time is several times the robot's (searching, failing a jump, reading); Äventyr 2 is
now longer than the whole of Äventyr 1.

## Not done, and why

- The new places are drawn in code like the rest of Äventyr 2; there is no new art download.
- Real play time with Alva is unmeasured.
- `adventure-2` is still `released: false`: Pappa plays it first.

## The story audit (4 November, evening)

Pappa asked for a second audit of the story, the conversations and the gameplay, so that the adventure holds
together, feels epic, keeps one red thread, and is fun and sweet. The whole adventure was dumped in play order
from the robot, about 250 lines, and read twice: once by this session and once by an independent story-editor
read. All the changes are in `adventures/adventure-2/content/sv.mjs` unless noted.

### The red thread

| Found | Fixed |
| --- | --- |
| The prologue said the cloud "blir rädd i mörkret". That gave away the answer to the big question in the first minute. | "Det blixtrar – och molnet flyger iväg, bort mot bergen." The fear is now revealed on the summit. |
| In the crown, Tukankrabban knew there was a cloud and a way into the mountain before anyone had told her. | She says her first hypothesis came true ("stormen kommer därifrån!") and repeats what is said about a way behind the waterfall. At the falls she only finds it. On the peak, Klo says the answer to their question is up there. |
| The research thread was silent. Hypothesis 2 existed only in the journal, so "Hypotesen stämmer!" on the summit pointed at nothing. | She says hypothesis 1 out loud and Klo praises it. Hypothesis 2 ("värst där det är mörkast") comes at the moonshine flowers. On the summit she draws the conclusion to the cloud's face. |
| Klo's stopwatch, his last gift, was never set up. | He measures his heartbeat "med stoppuret". |
| The cloud was forgiven but never said sorry. Mira's moon was given to no one in particular. | The cloud says "Förlåt för stormen" as it hands over the egg. Mira's sorry recalls "blixtar först!". Her moon is "till dig, lilla moln", and at the table the cloud sleeps under "världens största nattlampa". |
| The sköldhäst had no feeling of its own. | "Alla är rädda ibland. Jag gömmer mig i skalet – och du blixtrar." And at the nest: "Ut ur skalet nu, små ägg. Det har varit fint att bära er." |
| Small slips: the nest was both warm and too cold; Klo knew about the seeds before the researcher did; Tukankrabban knew where the coin fell; Tordyveln turned up inside the mountain with no explanation. | The storm would blow the egg away; Tukankrabban knows the seeds, and she saw the coin fall; Tordyveln rolled his new ball "ända hit in i berget". |
| The white current's line under the rock wall often never played. It needed the shell to be still hidden at the current's end. | It plays the first time the sköldhäst is in the water beyond the wall (`puzzles.mjs`). |

### Fun and charm

- Tukankrabban gets distracted by shiny things at last: "Kristallgrottan! Här inne ska vi … Åh! Det glittrar där. Och där. Och där!", and "Bara en vecka?" for the glitter ball. She has researched moonshine seeds for three years, "mest genom att äta dem".
- Klo gets "Briljant!", "Pling, plong! Du spelar ju xylofon med hovarna." and "Ta min klo …".
- Tordyveln's "Jag rullar en ny" comes once, and pays off as the glitter ball in the mountain.
- Each egg without a scene of its own gets its own thought (`STORY.eggLine`), so lines no longer repeat.
- The last line thanks Alva for drawing Tukankrabban.

### Swedish

`thinRule` was 105 characters. The test checks only dialogue boxes, not thoughts. These lines were also reworded:

- the doubled "i" in "Håll i dig i min klo";
- "Därifrån … ifrån";
- "med blixten som ljus";
- "glänste";
- "ledsamt";
- "Stora språnget i skogen".

Every line is now ≤ 100 characters.
