# Äventyr 3: the audits before release (12 November)

The design's build step 12 asks for three audits before release: the play order, the ground and the phone. Pappa asked
for all of it to be done (everything but the recording, which waits for his word). This is what each audit did, what it
found, and what was changed. The scripts that ran them are described so they can be run again; the robot is
`tests/skoldhast-a3-robot.mjs` with the route in `tests/skoldhast-a3-route.mjs`.

## The play order

**How:** the robot played the whole adventure twice, the constellations before the ring planet and the ring planet
before the constellations, and wrote down in order everything said, thought, staged and written into the notebook,
with the goal note and the next hint at every place it entered. The two transcripts (about 500 lines each) were read
as a player would meet them.

**Found and changed:**
- **"Hypotes nummer fyra" before number three.** With the ring planet first, Kometen's observation came before the
  photograph and the rubber, so Klo numbered four before three. Kometen's words are kept; Nova's and Klo's conclusion
  (`crooked`) now waits until hypothesis three has been said, and follows it at once.
- **The fin was found forty lengths from the rocket.** Its scene started on entering Hoppfälten on the way back from
  Utsikten, and the camera turned away to the rocket. It now starts at the rocket (Landningsplatsen).
- **Nothing said "travel on".** After the fin, and whenever a page's lights were all found, the goal note still said
  "Hitta Alvas stjärnor"; only the third hint mentioned the rocket. A new goal, "Res vidare med raketen", shows when
  this page has no more lights (never on the one-way pages).
- **A shower warning before anyone had spoken.** At Isbryggan, before the arrival scene, the sköldhäst thought "nu
  kommer en skur!": showers far away counted as here. A shower is now only where it falls (within four lengths).
- **The slingshot's words in the wrong order.** The shell passes over Skuggsidan while it is carried, so the ice
  block's introduction played before "Du blev slungad runt en hel planet!". Places passed over while carried are now
  entered only where the shell is set down.
- **Klo and Nova's first squabble in the middle of the beam's instructions.** It now waits until the beam has lifted
  the shell out of Djupa kratern.
- **Pip's lane kicked the sköldhäst out after Pip had given his light.** It no longer does.
- **Smulhögen had no hints of its own** before the Moon is touched ("Det finns fler stjärnljus …"). It has three now,
  which do not name Suddet: "Den lilla rosa är uppe på smulhögen."

## The ground

**How:** random players (a new stick, Hoppa, Göm dig and Använd every 0.4 s) on every page, in 18 states (each page
from each of its checkpoints, the white page before and after the dents, the bitten Moon, after the story), 30 s a
run, 12 runs each; the robot tests' own free play runs 6 more per page every time `npm test` runs. Looked for: falls
out of a page, numbers that are not numbers, being held fast (less than half a length of movement in ten seconds of
random input, not hidden, not carried, not in a scene), rescue loops (five rescues in six seconds), and places where
"Jag har fastnat" finds no safe spot.

**Found:** nothing held fast, nothing out of a page, no rescue loop. Rescues happen where they should (the night
side's pits, falls off the comet's head). From inside Djupa kratern and up on Spiran "Jag har fastnat" finds no
nearer safe spot (the crater's walls and the stairs' edges count as closed), and takes the player to the last
checkpoint, which is right.

## The phone

**How:** every conversation (25 scenes, from the arrival to the finale) was played in a real browser at 390×844, each
from a save made just before it, with every line read for about half a second. For every line it was recorded whether
the one speaking was shown (the speaking mark over them, or the edge badge pointing to them, as in Äventyr 2's check),
and every new line was photographed.

**Found and changed:**
- **Suddet unseen on the Moon.** After the catch and in the finale Suddet speaks five times, but was drawn on the
  Moon only after the story. It now rides on the shell from the catch until the rim is whole, hops down, and follows
  the sköldhäst through the finale.
- **Kometen and Pip unseen in the white.** The comet that comes for them vanished as soon as it had landed, and Pip
  was not on the page at all. Kometen now lies still along the edge of the white while it calls them up, and Pip
  tumbles into the picture before his "Pip! Pip pip pip!".
- **Kometen flew off while it talked.** It rests at Rastplatsen for a breath each lap, and the talk is longer than a
  breath: it now stays until the talk is over.
- **The sköldhäst cut at the edge in the climax.** Upright, the Moon's face comes first; the sköldhäst is now kept at
  least most of a length inside the picture.
- **Stora björnen's talk** framed all twenty lengths of the bear, and the sköldhäst fell out of the picture on a
  phone: it now frames the part of him beside the sköldhäst.

After the changes every line of every scene shows its speaker at 390×844.

**Found earlier, while building** (design section 20.2): a nearly vertical slope could be crept up in the shared sim
(Djupa kratern could be climbed out of), and a wall exactly vertical dropped whoever pushed on it through the floor.
Both are now separate floors with explicit walls.
