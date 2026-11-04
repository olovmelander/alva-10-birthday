# Äventyr 2: Den magiska skogen

Design for the second Sköldhästen adventure, 4 November 2026. Pappa asked for a whole new chapter in one
go: a good story, many puzzles, about as long as the first adventure, with **Tukankrabban** (Alva's new
creature) as a big part of it, **Mira** with us, and Professor Klo falling a little in love.

## Alva's facts about the tukankrabba (canon, not all of it has to be in the game)

A very rare creature that lives only in special forests, so-called magic forests. Builds nests in trees, on
beaches or along rivers. Lays up to 10 eggs at a time and buries them in the sand. Eats a special kind of
milk-chocolate cocoa beans, moonshine seeds (månskensfrön, instead of sunflower seeds), a kind of forest worm
and dung beetles. Loves everything that glitters and shines, such as pearl necklaces and gold coins. Most
important of all: she is crazy about research, just like Professor Klo.

What the game uses: the magic forest, the nest on the river beach, the **ten eggs buried in the sand**, the
**milk-chocolate cocoa tree**, the **moonshine seeds**, a **dung beetle** (a grumpy neighbour, never food),
her love of **pearls and gold coins** (her collection, the gold coin that buys back two eggs), and above all
that she is **a researcher**. Forest worms are left out on purpose: the little glowing creatures in the root
cave are friends, and nobody is eaten on screen.

## Alva's drawing of Tukankrabban (fidelity contract)

Pappa sent photos of Alva's coloured-pencil drawing on 4 November 2026. The photos are not committed (everything
in the repository is public); these are the features every drawing of her in the game must keep:

- A **round orange crab**: a dome-shaped shell in orange pencil, with a **curved line across it** like a smile.
- **Two big round eyes on thin orange stalks**: white, with a black pupil.
- **Eight thin orange legs**, four a side, with a dark outline.
- **Her claws are toucan heads**: each is a black head with a white eye and a black pupil, and an orange beak with
  a **black tip**. The beak's lower half is orange-red and opens like a pincer. One claw is held forward, the other
  raised with its beak pointing up.
- Alva's notes on the page: "Fakta: dem gillar att forska precis som professor Klo." and "Föda: frön och maskar"
  (a seed and a worm drawn beside them).

In code: `createTukan` and `createHatchling` in `characters.mjs` (the hatchlings are small copies of her), the
speaker-tab face in `ui.mjs`. `skoldhast/dev/a2-characters.html` shows them all in their poses. When the toucan
heads talk, both beaks open and shut.

## Premise, in words a 10-year-old can repeat

"En storm har blåst bort tukankrabbans tio ägg över hela den magiska skogen. Äggen kläcks bara i månsken –
men på den här sidan finns ingen måne. Vem är det som stormar, och varför?"

## Cast

- **Sköldhästen** (the player): same verbs as Äventyr 1. Its shell turns out to be the perfect egg basket
  ("varmt och tryggt").
- **Tukankrabban**: Alva's creature, drawn as in her picture (above): an orange crab with eyes on stalks whose two
  claws are toucan heads. A researcher like Klo:
  hypotheses, measurements, a glimmer-meter. Gets distracted by anything shiny in the middle of a sentence.
  She is not helpless: she counts, measures and plans; she needs a horse's gallop and a turtle's shell.
- **Professor Klo**: falls in love at first sight. Drops his stopwatch, stammers, measures his own heartbeat
  ("Hundrafyrtio slag i minuten! Det måste vara stormen"), draws hearts in his notebook and calls them
  diagrams. In the end he gives her the shiniest thing he owns: his stopwatch.
- **Mira** and **Alva**: at the table, on the other side of the paper. Heard in speech boxes, never drawn
  (the same rule as Äventyr 1, plan §3.2), and both with us through the whole adventure. Alva draws the
  tukankrabba and the first egg (the player traces it with her pencil); Mira draws the forest, the river, a
  rope bridge (a bit dashed: she didn't finish it) and a little cloud with lightning (the player draws it).
  In the finale Mira draws the moon and Alva the stars round it. Alva speaks at the nest, at Mira's bridge,
  about her own facts (shiny things, moonshine seeds instead of sunflower seeds), at the big leap, when Klo
  is plainly in love, in the crown and at the table.
- **Molnet** (Mira's little storm cloud): the player draws its shape with Mira's lilac pencil in the
  prologue. It is not bad: it is afraid of the dark, so it thunders and flashes to see. Nobody drew a moon.
- **Skatan**: a magpie who collects shiny things too. She found two eggs and thinks they are pearls. A rival
  collector, then a friend: she trades them for the tukankrabba's gold coin.
- **Tordyveln**: a grumpy dung beetle who rolled an egg into his earth ball by mistake.

## World rules

1. Everything from Äventyr 1 still holds: Alva's pencil is in the hooves (full gallop draws unfinished
   lines), the shell sinks like a stone in water and drifts with currents only a shell can ride.
2. **What Mira drew dashed is unfinished**, and galloping finishes it (the rope bridge). Inside the mountain
   a dashed line can be drawn only when something lights it: the crystals for the crystal bridge, the
   lightning for the bridge of light on Åsktoppen.
3. **The storm grows in the dark and quiets in light**: the lightning is the cloud trying to see.
4. **Moonshine seeds open only when everything is still**: hide by them and they light up. One of them is
   Tukankrabban's lantern from then on; without it the way into the mountain is pitch dark.
5. **Crystals ring under galloping hooves**, and a crystal that has rung enough lights up.
6. **Wind cannot take a hidden shell**, and behind a boulder there is shelter.
7. **Tukankrabba eggs hatch only in moonlight, in the warm sand of the nest.** That is why the moon is drawn
   last: drawn in the mountains, the eggs would hatch alone out in the forest.

## Four pages

`strand` — **Flodstranden** (west → east): Klyftan with Mira's dashed rope bridge (P2, exit to the forest) ·
Kakaolunden with the cocoa tree and the hollow log (P1) · Sandbanken with the nest and her shiny collection
(start, E1) · Glimmerfloden with a gentle current and Djuphålan's whirlpool (the gold coin) · the east bank
with Tordyvelbacken (P5) and Skatträdet (P6) · Forsen, the waterfall, with the cave behind it (P3) and the
dark tunnel into the mountain.

`skog` — **Djupa skogen** (east → west): the bridge's end and the bouncing mushroom (up to the owl's branch
and its egg) · Rotgrottan, dark until the moonshine seeds light it (P4, and the lantern) · Utsiktskullen and
Rutschstammen, the fallen trunk to slide-gallop down for the big leap over Ravinen (P7), with a vine to pull
back · Jätteträdet, climbed by its branches to the crown, where you see where the storm comes from.

`kristall` — **Kristallgrottan**, inside the mountain (west → east): the tunnel from the beach · three
crystal plates in the floor and the black chasm (K1) · Kristallsjön with three crystals on its floor and a
rock wall down into the water (K2) · Tordyveln's new glitter ball and the gate's pool with two plates (K3) ·
Källan, the spring that rises through the mountain.

`topp` — **Åsktoppen**, the mountain top in the storm: the spring's pool · Vindkanten, gusts with boulders for
shelter (T1) · Blixtbron, a ravine with a bridge that shows only in the lightning (T2) · Klippan, more gusts ·
Stormens öga, the calm summit where the cloud sits on its nest of fluff.

## The story, in five acts

1. **The empty nest** (the table, Sandbanken). The storm takes the eggs; Tukankrabban's rule says they hatch
   only in moonlight, and there is no moon. The question, asked out loud: *vem är det som stormar – och
   varför?* Her first hypothesis: the storm comes from somewhere.
2. **Eggs across the forest** (Flodstranden, Djupa skogen). Free order. Tordyveln, Skatan and the gold coin,
   Mira's bridge, the mushroom, the moonshine seeds (which give the lantern), the big leap. Klo falls in love
   one step at a time (after eggs 2, 4, 6 and 8).
3. **Where the storm comes from** (Jätteträdet's crown). From the top they see the storm swirl round
   Åsktoppen, the mountain behind the waterfall. Mira wonders if it is her cloud. Alva: "Det får vi ta reda
   på. Det är det forskare gör." The goal changes from eggs to the peak.
4. **Through the mountain** (Forsen's cave, Kristallgrottan, Åsktoppen). The lantern shows the way. The
   crystals ring, the white current runs under the wall, Tordyveln lends his glitter ball, the spring carries
   the shell up, the wind is crossed in the shell, the bridge is drawn in a flash of lightning.
5. **The eye of the storm and the way home** (the summit, the nest). The cloud is afraid of the dark; Mira
   knows her cloud and says sorry; Alva says why the moon must wait for the nest. The cloud gives back the
   egg it kept warm and carries everyone home over the whole forest. With ten eggs in the nest: everyone
   gathers, Mira draws the moon, Alva the stars, the eggs hatch, Klo gives his stopwatch.

## Puzzles (10 eggs, 20 steps)

| # | Where | Eggs | What you do | Half |
| --- | --- | --- | --- | --- |
| E1 | Sandbanken | 1 | Something glimmers in the sand: **Gräv** with a hoof. Teaches the action button and the egg basket. | — |
| P1 | Kakaolunden | 1 | An egg is stuck high in the cocoa tree. Gallop over the hollow log under it: the hoofbeats drum through the roots and shake the tree until the egg falls into the leaves. | horse |
| P2 | Klyftan | — | Mira's rope bridge is only dashed. Gallop across and the hooves draw it whole. | horse |
| Svamp | Djupa skogen | 1 | The egg is up on the owl's branch. Jump onto the big mushroom: it bounces the sköldhäst up. | horse |
| P3 | Forsen | — | The waterfall pushes away everything that swims. Hide in the pool: the shell sinks under the falls and the undercurrent carries it into the cave. The tunnel behind is pitch dark. | turtle |
| P4 | Rotgrottan | 1 | Hide still beside the shy moonshine seeds until they open and glow; their light shows the way to the egg, and one seed becomes the lantern. | turtle |
| P5 | Tordyvelbacken | 1 | The beetle rolled an egg into his earth ball. **Knuffa** it into the river, which washes the earth off. | horse |
| P6 | Djuphålan + Skatträdet | 1 | The magpie trades her "pearl" for something shinier. A hidden shell spirals down the whirlpool to the gold coin; climb the tree and **Ge** her the coin. | both |
| P7 | Rutschstammen | 1 | The egg sits in an old nest across Ravinen. Gallop down the fallen trunk for the big leap; **Dra** the vine to get back. | horse |
| — | Jätteträdet | — | Climb the branches to the crown and see the storm over Åsktoppen. | — |
| K1 | Kristallgrottan | — | Gallop over the three crystal plates until all three ring and glow; the light shows the dashed crystal bridge over the chasm, and a gallop draws it. | horse |
| K2 | Kristallsjön | 1 | Three currents start by three crystals on the lake floor; the blue and the green loop back. Hide by the white one ("vit som ett ägg"): it carries the shell under the wall. | turtle |
| K3 | the gate's pool | 1 | **Knuffa** Tordyveln's glitter ball into the pool onto plate A, then lie hidden on plate B: the gate opens. | both |
| Källan | Kristallgrottan | — | The falling water pushes a swimmer down; a still shell rides the spring up to the mountain top. | turtle |
| T1 | Vindkanten, Klippan | — | Gusts blow a standing sköldhäst back; hide when the wind howls (a warning comes first), or wait behind a boulder. | turtle |
| T2 | Blixtbron | — | The bridge of light shows only in the lightning: gallop out onto it in a flash and draw it. | horse |
| Toppen | Stormens öga | 1 | Climb to the calm summit and meet the cloud: the reveal, and the egg it kept. | — |
| Finale | the nest | — | Everyone gathers. Mira draws the moon and Alva the stars (the player traces both). The storm ends and ten little tukankrabbor hatch. | Mira and Alva |

Eggs per page: Flodstranden 4, Djupa skogen 3, Kristallgrottan 2, Åsktoppen 1. The journal's hand-drawn map
shows each page with its eggs found and left, and the open question with Tukankrabban's latest hypothesis.

Help follows Äventyr 1: every puzzle has an intro line that says why, and up to three hints in Klo's or
Tukankrabban's words (never key names). Nothing can fail and nothing is timed; the gusts and the lightning
come back every few seconds.

## Beats

1. **Prologue at the table.** A new page. Mira wants to draw too. Alva draws the tukankrabba and her nest
   (the player traces the first egg with Alva's pencil); Mira draws the forest and the river, and then (the
   player) a little cloud with her lilac pencil. "Mira, du ritar väl månen sen?" "Mm … blixtar först!" The
   cloud flees east, the page darkens, the eggs blow away like sparks.
2. **The nest.** Tukankrabban digs in the empty nest. Klo falls in love. Her rule: eggs hatch only in
   moonlight. "Det finns ingen måne här." The question: who is storming, and why? The first egg (E1).
3. **Free exploration** of both forest pages in any order (the forest needs P2). After eggs 2, 4, 6 and 8 a
   short Klo-and-Tukankrabban scene (deferred while on the mountain top): the cocoa bean gift, the heartbeat
   measurement, the notebook hearts, a joint hypothesis.
4. **Clues** ("Vad vet vi?"): the moon rule; no moon on this page; lightning lights the way as if someone
   wants to see; the storm grows when it is darkest; the cloud cries; the storm comes from Åsktoppen;
   a moonshine seed is a lantern; the cloud is afraid of the dark; the moon.
5. **The crown.** The storm swirls round Åsktoppen. Mira: "Är det mitt moln som stormar?" The goal becomes the
   peak; without the lantern, the way in is dark and the next goal says so.
6. **Kristallgrottan and Åsktoppen.** The cave is lit by the lantern; Tordyveln turns up with his glitter
   ball; the spring throws them up the mountain; in the wind Klo holds Tukankrabban's claw ("Min hjälte!");
   Mira's lightning draws the bridge.
7. **The summit.** "Det är ju mitt moln! Förlåt, lilla moln – jag glömde att ge dig en måne." The cloud
   gives back the egg it kept and carries everyone home (a short picture of the ride over the forest).
8. **Finale and epilogue.** Skatan and Tordyveln come to the nest; ten eggs in the sand; Mira's moon, Alva's
   stars, the hatching. Klo gives his stopwatch; she gives him a moonshine seed, and calls the smallest
   hatchling Lilla Klo. At the table: "Kan Klo och Tukankrabban gifta sig?" "Forskning pågår." Then free
   exploration in the moonlit forest.

## Delivery

- Runtime: `skoldhast/adventures/adventure-2/` (outside the shared `src/` prefetch tree, plan §8.6). It reuses
  `src/sim.mjs`, the hero rig, Professor Klo, input, audio and the notebook UI; world, puzzles, story and
  view are its own. Everything new is drawn in code at runtime: no new asset download.
- Catalogue: `adventure-2` has its entry module; its `released` flag stays `false` until Pappa has played
  it. `dev/play.html?adventure=2` (or `index.html?skoldhast&adventure=2`) previews it without the unlock.
- Tests: `tests/skoldhast-a2-*.test.mjs` (world, puzzles, and a robot that plays the whole adventure through
  all four pages); `tests/browser/skoldhast-a2.mjs` (real browser, three sizes, all four pages).
- The audit behind the long version: `docs/skoldhast/adventure-2-audit.md`.
