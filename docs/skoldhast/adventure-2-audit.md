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

## The play-order audit (4 November, night)

Pappa asked to investigate the story again and to check that every puzzle and the red thread work as intended. The
audits above read the adventure in the one order the robot plays. The adventure is open, so this one tested the others.

### How it was checked

- **Other orders:** a second robot plays from the lantern straight up to the cloud and then back for everything else,
  to the hatching. Shorter routes cover the dark cave before the lantern, the coin before Skatan, and the crown after
  Kristallgrottan. Every line was read in play order.
- **Random players:** 60 runs of 50 s at each of nine puzzle gates, and 104 runs of 80 s of free play over all pages.
- **Line coverage:** every line in `STORY` was compared with what the robot actually said.
- **Measurements:** where a hidden shell ends up from every point of Kristallsjön, the run-up T2 needs, how far the wind
  moves someone reading a dialogue, and every way back.
- **Real browser:** the gate, K1, the crown after the cloud, the goal note and T2, with the real keyboard, read on screen.

### The red thread

| Found | Fixed |
| --- | --- |
| The crown after the summit replayed the discovery: Mira asked if it was her cloud after saying sorry to it, and Tukankrabban called the way in a rumour. | `sourceAfter` is a view with the cloud safe, and `sourceLate` covers the crown after Kristallgrottan. |
| The lightning clue ("Som om någon vill se något i mörkret") could come right after the cloud had answered it, or inside the mountain ("lyser upp hela skogen"). | It waits for the open sky, and is skipped once the cloud is met. |
| With the egg still in his earth ball, Tordyveln talked about his "new" ball in the mountain. Later he lost the old ball as if nothing had happened. | `glitterEarly` and `washedLate`. In the mountain he talks about the glitter ball, not the forest. |
| Klo said "Stoppuret tickar lika fort som mitt hjärta" after giving the stopwatch away. | "Mitt hjärta tickar som ett stoppur. Fast stoppuret har hon nu." |
| The discovery at the cave was told twice for someone turned back by the dark. | `caveLitBack`. |
| The falls repeated what the crown had just said about the way in. | `forsKnown`. |
| The coin found before Skatan never led to the trade. | `magpieCoin`: "Något som glänser mer? Vi har ju mitt guldmynt!" |
| "Den kommer alltid. Tror jag." was never paid off. | Tukankrabban says it again when the moon rises. |
| Skatan's crying cloud was only a clue in the journal. | It is heard just before the top, after the bridge of light. |

### Puzzles and flow

| Found | Fixed |
| --- | --- |
| **A running jump passed the closed gate (K3).** The sim checks explicit walls only on the ground and in water. The puzzle was skipped, and its egg stayed dark behind the player. 17 % of random runs got through. | `walls()` in `src/ground-guard.mjs`: walls hold in the air too, and the gate says "Porten är stängd." |
| The same jump passed the forest's west page edge, and a scene starting at its east exit carried the sköldhäst off the page (22 rescues). | The same guard, and a wall at the forest's east end. |
| Inside the mountain the hints sent the player back out for an egg, and on the mountain top the goal still said to get up there. | `peakStep` follows the way up. New goals: `peakInside`, and `summit` with its reason. |
| Tukankrabban's request for the vine played only on coming back, and she stands on the far side. | It plays as soon as the egg is taken: "Vi kommer inte över!" |
| "Alla tre lyser" was lost to the thought before it in a gallop. It is the moment the bridge appears. | The last plate's thought cannot be dropped. |
| Skatan's thanks could never be heard: the talk ended with the trade. | She can be talked to until she leaves for the nest. |
| Hiding at the surface works at the falls and the whirlpool, but in Kristallsjön it always means a ring current, even over the white crystal. Hiding in plain sight beside the flowers gave no reaction. | The world is right, so the words help: the ring's thought says to swim down and choose, and `seedsWatched` tells why the flowers stay shut. |

### Checked, and left as it was

- K2 is a real choice: from the bottom, the blue and green crystals loop and the rest of the floor rides the white current.
- P2, P3, P4, K1, K2, the spring, T2 and the dark passage held against every random run.
- Nothing got stuck in free play. Every way back works: out of the cave, over the river, under the rock wall, down the
  spring.
- The wind moves someone reading a dialogue only 0.5 lengths.
- T2 is fair: about 1.8 lengths of run-up, a 2.4 s flash, and under a second to the edge. Too close gives "För långsamt!".
- "Strömmen längs botten …" does play, for a shell left to drift. The robot came out of its shell too early to hear it.

### Not changed

`sourceDark` and `GOALS.peakDark` cannot be reached today, because the crown lies behind the seeds, so the lantern
always comes first. They are harmless and stay.
