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
  (the same rule as Äventyr 1, plan §3.2). Alva draws the tukankrabba; Mira draws the forest, the river, a
  rope bridge (a bit dashed: she didn't finish it) and a little cloud with lightning "because that is the
  coolest". In the finale Mira draws the moon.
- **Molnet** (Mira's little storm cloud): the player draws its shape with Mira's lilac pencil in the
  prologue. It is not bad: it is afraid of the dark, so it thunders and flashes to see. Nobody drew a moon.
- **Skatan**: a magpie who collects shiny things too. She found two eggs and thinks they are pearls. A rival
  collector, then a friend: she trades them for the tukankrabba's gold coin.
- **Tordyveln**: a grumpy dung beetle who rolled an egg into his earth ball by mistake.

## World rules

1. Everything from Äventyr 1 still holds: Alva's pencil is in the hooves (full gallop draws unfinished
   lines), the shell sinks like a stone in water and drifts with currents only a shell can ride.
2. **What Mira drew dashed is unfinished**, and galloping finishes it (the rope bridge).
3. **The storm grows in the dark and quiets in light**: the lightning is the cloud trying to see.
4. **Moonshine seeds open only when everything is still**: hide by them and they light up.
5. **Tukankrabba eggs hatch only in moonlight, in the warm sand of the nest.**

## Two pages

`strand` — **Flodstranden** (west → east): Klyftan with Mira's dashed rope bridge (P2, exit to the forest) ·
Kakaolunden with the cocoa tree and the hollow log (P1) · Sandbanken with the nest and her shiny collection
(start, E1) · Glimmerfloden with a gentle current and Djuphålan's whirlpool (the gold coin) · the east bank
with Tordyvelbacken (P5) and Skatträdet (P6) · Forsen, the waterfall, with the cave behind it (P3).

`skog` — **Djupa skogen** (east → west): the bridge's end and the mushroom (P2's egg) · Rotgrottan, dark
until the moonshine seeds light it (P4) · Utsiktskullen and Rutschstammen, the fallen trunk to slide-gallop
down for the big leap over Ravinen (P7), with a vine to pull back · Jätteträdet, climbed by its branches to
the crown where the cloud sits (the reveal).

## Puzzles (10 eggs)

| # | Where | Eggs | What you do | Half |
| --- | --- | --- | --- | --- |
| E1 | Sandbanken | 1 | Something glimmers in the sand: **Gräv** with a hoof. Teaches the action button and the egg basket. | — |
| P1 | Kakaolunden | 1 | An egg is stuck high in the cocoa tree. Gallop over the hollow log under it: the hoofbeats drum through the roots and shake the tree until the egg falls into the leaves. | horse |
| P2 | Klyftan | 1 | Mira's rope bridge is only dashed. Gallop across and the hooves draw it whole. The egg waits on the mushroom on the far side. | horse |
| P3 | Forsen | 2 | The waterfall pushes away everything that swims. Hide in the pool: the shell sinks under the falls and the undercurrent carries it into the cave, where two eggs lie on the ledge. | turtle |
| P4 | Rotgrottan | 1 | The root cave is pitch dark. Hide still beside the shy moonshine seeds until they open and glow; their light drifts in and shows the way to the egg. | turtle |
| P5 | Tordyvelbacken | 1 | The beetle rolled an egg into his earth ball. **Knuffa** it to the edge so it rolls into the river, which washes the earth off. Swim to the egg. | horse |
| P6 | Skatträdet + Djuphålan | 2 | The magpie trades her two "pearls" only for something shinier. The gold coin lies at the bottom of the whirlpool: swimmers are spun away, but a hidden shell spirals down to it. Climb the tree's branches and **Ge** her the coin. | both |
| P7 | Rutschstammen | 1 | The egg sits in an old nest across Ravinen. A normal gallop is too short: gallop down the fallen trunk for extra speed and make the big leap. **Dra** the vine to get back. | horse |
| — | Jätteträdet | — | Climb the branches to the crown and meet the cloud: the reveal. | — |
| Finale | the nest | — | With all ten eggs and the cloud along, the eggs go into the sand. Mira draws the moon (the player traces it with her pencil). The cloud stops being afraid, the storm ends, and ten little tukankrabbor hatch. | Mira |

Help follows Äventyr 1: every puzzle has an intro line that says why, and up to three hints in Klo's or
Tukankrabban's words (never key names). Nothing can fail and nothing is timed.

## Beats

1. **Prologue at the table.** A new page. Mira wants to draw too. Alva draws the tukankrabba and her nest of
   ten eggs; Mira draws the forest and the river, and then (the player) a little cloud with her lilac pencil.
   "Med blixtar!" The page darkens, the cloud rumbles, the eggs blow away like sparks. The sköldhäst and
   Klo gallop in from the sea page.
2. **The nest.** Tukankrabban digs in the empty nest. Klo falls in love. Her rule: eggs hatch only in
   moonlight. "Det finns ingen måne här." "Den kommer. Den kommer alltid." The first egg (E1).
3. **Free exploration** of both pages in any order (the forest needs P2). After eggs 2, 4, 6 and 8 a short
   Klo-and-Tukankrabban scene: the cocoa bean gift, the heartbeat measurement, the notebook hearts, a joint
   hypothesis about the storm.
4. **Clues** ("Vad vet vi?"): the storm grows when it is darkest; lightning lights the way as if someone
   wants to see; Skatan says the cloud in Jätteträdet cries every night; there is no moon on this page.
5. **The crown.** The cloud is afraid of the dark. The horse calls to Mira across the paper: "Du glömde
   månen!" Mira: "Jag tänkte rita den sist!" The cloud comes along to the nest.
6. **Finale and epilogue.** Ten eggs in the sand, Mira's moon, the hatching. Klo gives his stopwatch; she
   gives him a moonshine seed, and calls the smallest hatchling Lilla Klo. At the table: "Kan Klo och
   tukankrabban gifta sig?" "Forskning pågår." Then free exploration in the moonlit forest.

## Delivery

- Runtime: `skoldhast/adventures/adventure-2/` (outside the shared `src/` prefetch tree, plan §8.6). It reuses
  `src/sim.mjs`, the hero rig, Professor Klo, input, audio and the notebook UI; world, puzzles, story and
  view are its own. Everything new is drawn in code at runtime: no new asset download.
- Catalogue: `adventure-2` has its entry module; its `released` flag stays `false` until Pappa has played
  it. `dev/play.html?adventure=2` (or `index.html?skoldhast&adventure=2`) previews it without the unlock.
- Tests: `tests/skoldhast-a2-*.test.mjs` (world, puzzles, and a robot that plays the whole adventure);
  `tests/browser/skoldhast-a2.mjs` (real browser, three sizes).
