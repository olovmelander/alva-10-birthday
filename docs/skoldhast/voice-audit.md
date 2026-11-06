# Voices: the script checked before recording (5 November)

Pappa listened to voice samples and chose a voice for every role. Before any line is recorded, he asked for a final
check of the story, every conversation, the narration and everything that will have a voice, so that the red thread
holds. This is what will be voiced, what the check found and changed, and the rules for the recording step.

The listening samples stayed out of the repository. The recordings are in `skoldhast/voice/`: Pappa decided on
5 November that his own voice, the narrator, may be public on the site.

## The cast

| Role | Voice (in Pappa's ElevenLabs account) |
| --- | --- |
| Berättaren | Pappa's own cloned voice |
| Sköldhästen | "Sköldhästen – Sköldhästen", designed: soft, described as neither man nor woman, sounds female. Its pronoun stays "den" (Pappa, 5 November). |
| Professor Klo | "Sköldhästen – Professor Klo", designed: a small, precise, nervous crab |
| Tukankrabban | "Sköldhästen – Tukankrabban", designed: an eager researcher |
| Molnet | "Sköldhästen – Molnet", designed: small, soft and shy |
| Tordyveln | "Sköldhästen – Tordyveln", designed: grumpy and gravelly |
| Skatan | "Sköldhästen – Skatan", designed: chatty and vain |
| Alva, Mira | "Sköldhästen – Alva", "Sköldhästen – Mira", designed young adult women (ElevenLabs does not design children's voices) |
| Kartväktaren | "Sköldhästen – Kartväktaren", designed: an old, anxious man of paper |
| Sköldpaddan Signe | "Sköldhästen – Sköldpaddan Signe", designed: dry and deadpan |

Model: Eleven v4, Swedish. In a test with Klo's voice, v4 kept "P-p-professor" and said "Klo"; v3 lost the stutter and
said "Clo".

## What gets a voice

| On screen | Voice | Where the words are |
| --- | --- | --- |
| Speech boxes (`say`) | The speaker | `STORY` pairs; Äventyr 2's `TABLE` pairs |
| Klo's hint bubbles from the story (`hintOnce`) | Klo (Sköldhästen where marked `'horse'`) | `STORY.k1–k3` strings |
| Thought bubbles | Sköldhästen | `BALK`, story strings passed to `think` |
| Story captions | Berättaren | `STORY.prolog.*Caption`, `STORY.final.*`, Äventyr 2's `TABLE` strings and `caption` beats |
| Klo's notebook and tap jokes | Klo | `KLO_COMPANION` (not `ui` or `places`), `KLO_JOKES` |
| Talking to a companion in Äventyr 2 | Klo or Tukankrabban: every line in both voices | `HINTS`, `NEXT_EGG` × `WHERE`, `CHATTER` |
| Kartväktaren's paper notes (`note`) | Open question (see below) | `STORY.k1.note1`, `STORY.k2.note2` |
| Alva's printed sentences: the prologue caption and the last note | Open question (see below) | `HER_TEXT`, verbatim |

**Not voiced:** buttons and menus, toasts (egg count, clues, measurements), goal notes, the journal (`THREAD`,
`JOURNAL`), Äventyr 1's guided help (`HINTS`, `GUIDANCE`, which carry key names), control tips (`TIPS`), sound captions
like "(gnägg!)", page names, card titles such as "Kartväktarens karta", and drawing prompts.

**Never played, so never recorded:**
- Äventyr 1: `STORY.prolog.fold`, `prolog.research`, `k1.paper`, `k2.whirlHint`.
- Äventyr 2: `STORY.darkCave` and `STORY.chasm`. The `BALK` copies are the ones played.

**Size:**
- About 960 clips and 51,000 characters.
- By voice:
  - Klo: about 30,000, of which the notebook is about 23,000.
  - Tukankrabban: about 8,900.
  - Sköldhästen: about 6,800.
  - Each of the others: under 1,000.
- On v4 that is roughly 22,000 ElevenLabs credits.

## How it was checked

- **Play order.** The robots played Äventyr 1's whole route and Äventyr 2 in two orders: the usual one, and from the
  lantern straight up the mountain. Every box, thought and caption was read in the order it is heard.
- **Every string.** Each string in both `sv.mjs` files was listed, traced to the code that shows it, and given a voice
  or none.
- **Two independent editor reads.** One read each adventure, focusing on the red thread and on how each line sounds
  spoken. Every finding was checked against the code and the play order before anything changed.
- **Speech hazards.** A scan looked for capitals, digits, symbols, stutters and interjections. The risky lines were
  generated with the chosen voices and read back with speech-to-text.

## What changed

### The red thread

| Found | Changed |
| --- | --- |
| Äventyr 1, Kapitel 2 opening: Klo "saw him at the tower" even for players who chose "Vad hände?" in the prologue, and he gave away the torn-map discovery that the assembly scene presents later. | "tornet" is "fyren" everywhere. Klo now reasons "Där bor nog han med linjalen!", and only says the map is torn. |
| Land first: "strömmen till tornet" arrived without the map-is-the-world rule. | `openWithLand` restates the rule and says "fyren". |
| Klo's wave marks asked a question nothing answers. | "Havet har en gång nått ända hit." This also prepares "vågorna får flytta den" at the end. |
| The small-wave trial had no reason. The hero's argument from the plan (wet every day and still whole) had been lost. | "Blöt om hovarna varje dag – och ändå hel!" / "Hel … fast du är blöt? En liten våg, då." / "Kan ni laga den?" |
| The hero asked "Kan jag rita klart det i full galopp?" after it had already said so at the dunes. | `thinRuleKnown` plays when the dunes taught it. |
| The cloud joke compared with "de andra molnen" when the player's own cloud was white. | `cloudsWhite`: "Varför är molnen inte färglagda?" / "Moln är vita, Klo." |
| Äventyr 2: "Hypotesen stämmer!" came right after hypothesis three, so heard aloud it confirmed the wrong one. | "Hypotes nummer två stämmer!" |
| Hypothesis three ("stormen snurrar") was already known and never confirmed. | It is an if-then ("om stormen snurrar, blåser den åt andra hållet här uppe!"), and Klo's wind measurement confirms it. |
| Hypothesis two said "där", but the clue and the answer are about "när". | "när det är som mörkast", also in the journal. |
| Mountain first, hypothesis one was never confirmed. | `toppFirst` confirms it on the top when the crown has not been seen. A crown visited after the top does not confirm it again. |
| The seeds "glow only when still", yet the lantern glows while walking. | The flowers open only when still. Tukankrabban's gift pays off the lantern: "Här är vår lykta." |
| Klo heard "regn i öronen" inside the mountain. | "Det är … stormen. Den mullrar så." |
| The egg behind the gate said "Snart är ni alla samlade", even as egg 2 of 10 when the mountain comes first. | "Ett ägg bakom porten! Tack för lånet, Tordyveln." |
| At the crown after the dark cave, Tukankrabban spoke of the passage as a rumour. | `sourceLitKnown`. |
| Mira "hann inte" finish the bridge but drew on at once. | She "glömmer" it, as she later forgets the moon. |

### Spoken aloud

- "Här står ”Kartväktaren”" sounds like "he is standing here". It is now "Och ett namn: Kartväktaren."
- "man" (mane) is heard as "a man", so it became "manen" in three places: Klo's first words, a tap joke, and the wind
  thought.
- Klo called his listener "Sköldhästen" in the third person in the notebook recap.
- In Äventyr 2, Tukankrabban said her own name in the coin hint, because she can say any hint.
- "Brr" became "Usch", and "reglad" became "låst".
- Ambiguous "den" and "det" were fixed in two of Klo's lines. "rev sönder" got its object.
- One hint was 111 characters long. It is shorter now.

### Repetition

Recorded speech makes a repeat stand out far more than text does. These changed:
- **Fyren's shutters.** The second shutter has its own line.
- **The flat fold and the torn edges.** "Vecket är platt" and "rivkanterna" are no longer said back to back.
- **"spana efter kartbiten".** It was said four times on Stäppen.
- **Streckbron in guided help.** A refusal no longer gets three "i full galopp" lines at once (`firstThin` is gone).
- **The swim tip.** It no longer opens with the same sentence as the hero's thought just before it.
- **Äventyr 2:**
  - The sköldhäst no longer echoes Tukankrabban's "Alla tio".
  - Tordyveln's "Ja ja. Jag rullar en ny" is not repeated when you talk to him.
  - Skatan's "liten sol" is not repeated, and she now shows her vanity.
  - The lantern is not announced twice.
  - Neither is the wind tip.

The robots now check that no line is said twice in one playthrough, and that each hypothesis is put forward before it
is confirmed, in both orders. With the old shutter line the check fails.

## Proposed but kept

- **Narration that starts with "…".** "… och nio ägg till." and "… och en storm blåser …" continue the picture, the way
  a parent reading aloud does.
- **Stutters and interjections.** "P-p-professor" survives v4. "J-ja", "Snyft", "Hmpf", "Pling, plong" and "Schhh" stay
  written as they are; listen to them first.
- **Capitals.** v4 read LAND, HAV, OKEJ and OBS as words. They stay on screen; the recorder lowercases them anyway.
- **Kept on purpose:**
  - Klo's wave jokes.
  - The egg that "glimmar som en pärla". It sets up Skatan's pearl.
  - Molnet's question "Då blir det ljust på riktigt?". The moon answers it.

## Recording and playback (5 November)

**Recording.** `scripts/skoldhast-voice.mjs` builds the voice script from both `sv.mjs` files with the rules above.
- It records every line that has no clip yet: Eleven v4, Swedish, 24 kHz mono, MP3 48 kbit/s.
- It reads each clip back with speech-to-text and records it again, up to three times, if fewer than 80 % of the
  words come back.
- It writes `skoldhast/voice/<key>.mp3` and `manifest.json`, which holds each clip's length and loudness
  (LUFS, EBU R128, measured with ffmpeg as each clip is written).
- The key is who speaks plus what is shown (`src/voice-key.mjs`). A line kept under two keys is recorded once.

Spoken text is the shown text, with two exceptions. The signature "/Kartväktaren" is read without the slash, which is
otherwise read as "snedstreck". Words in capitals are read as words.

**After any text change**, record what is missing and remove what no line uses:

```sh
NODE_USE_ENV_PROXY=1 ELEVENLABS_API_KEY=… SKOLDHAST_NARRATOR_VOICE=<id> node scripts/skoldhast-voice.mjs --record
node scripts/skoldhast-voice.mjs --prune
```

`node scripts/skoldhast-voice.mjs --level` measures every clip's loudness again (about ten minutes).

`tests/skoldhast-voice.test.mjs` fails until every line is recorded and measured, and no clip is left over. The robots fail if they
hear a line that is not in the voice script.

**Playback** (`src/voice.mjs`, the same in both adventures).
- **What plays:** a line plays only if it has a clip. Everything else is silent, so the script alone decides what is
  voiced.
- **Download:** clips are fetched only as a line is shown, never in the first download. They play through the audio
  engine's voice input, so the "Röster" slider sets their volume and 0 turns them off. The music is lowered under
  speech. A voiced box has no crab chirp or pencil sound.
- **The same loudness:** every clip plays at −20.5 LUFS, moved at most 6 dB up or 7 dB down (`LEVEL`,
  `levelGain`). Measured on 6 November, Kartväktaren (Pappa's own voice) and his notes were about 5 dB louder than
  Klo, and some of Tukankrabban's lines 6 dB quieter. Per voice, the medians ran from −23 (Skatan) to −15.7
  (Kartväktaren).
- **One voice at a time:**
  - A speech box silences what came before, and its tap silences itself.
  - A caption is the narrator. The table scenes and the prologue wait for its reading before the next line, and a
    caption stays up as long as it is read.
  - Thoughts, hint bubbles and Klo's tap jokes speak only in silence. The same one is said at most once every 20
    seconds, while the bubble still shows each time.
- **Never in the way:** a voice never holds the game up.
  - Before the first tap, or in a hidden tab, nothing is said.
  - A clip that has not loaded within 4 seconds is skipped.
  - A clip that does not report its end is let go 1.5 seconds after its length.
- **Klo's notebook** reads his answer aloud and stops when it closes.
- **Alva's field note** in Äventyr 1's prologue is read by Pappa sentence by sentence as her pencil writes it. Each
  sentence is heard to its end unless the reader taps to hurry, and "Hoppa över" stops it.

## Decided by Pappa (5 November)

1. Kartväktaren's paper notes are read in his own voice, so the player hears him before meeting him at the fyren.
2. Alva's own printed sentences are read by Pappa as the narrator:
   - her field note, as it is written;
   - her hope, as a caption;
   - her question, on the last note.

   They stay word for word.
3. Klo's guided-help bubbles, which carry key names, stay text.
4. His own voice may be public: the narrator's clips are on the site with the rest.
