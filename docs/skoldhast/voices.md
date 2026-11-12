# Voices: who speaks, with which voice, and how it is recorded

Everything about Sköldhästen's recorded voices in one place, for whoever records next (12 November 2026). The details
behind it: `docs/skoldhast/voice-audit.md` (what is voiced and why, 5 November) and `docs/skoldhast/adventure-3.md`
section 17 (Äventyr 3's voices and the direction).

## Where things stand

| Adventure | Lines | Recorded | Direction |
| --- | --- | --- | --- |
| Äventyr 1 and 2 | 921 | Yes, every line (plain, as written) | **To be recorded again with direction, every line** (Pappa, 12 November). Not started: waits for Pappa's word. |
| Äventyr 3 | 567 (about 26,800 characters) | **No.** Pending until Pappa says the adventure is completely finished. | Written: every story and table line has its tags in `adventures/adventure-3/content/regi.mjs`. |

Nothing is recorded until Pappa says so. The recording script cannot record Äventyr 3 by accident: it needs `--a3`.

## The cast: the voice of every role

All voices are in Pappa's ElevenLabs account, named "Sköldhästen – <namn>" (the names `VOICES` in
`scripts/skoldhast-voice.mjs` expects), made with ElevenLabs Voice Design except the narrator. ElevenLabs does not
design children's voices: Alva and Mira are young adult women, and descriptions must be written as adult voices.

| Role (key) | Voice in the account | Chosen | How it was designed |
| --- | --- | --- | --- |
| Berättaren (`narrator`, captions) | Pappa's own cloned voice, given to the script by id (`SKOLDHAST_NARRATOR_VOICE`; **the id is not in `.env`**) | 5 November | Public on the site by Pappa's decision |
| Sköldhästen (`horse`) | Sköldhästen – Sköldhästen | 5 November | Soft, neither man nor woman (sounds female). Its pronoun stays "den". |
| Professor Klo (`klo`) | Sköldhästen – Professor Klo | 5 November | A small, precise, nervous crab |
| Kartväktaren (`kv`, and his notes) | Sköldhästen – Kartväktaren | 5 November | An old, anxious man of paper |
| Sköldpaddan Signe (`signe`) | Sköldhästen – Sköldpaddan Signe | 5 November | Dry and deadpan |
| Alva (`alva`) | Sköldhästen – Alva | 5 November | A young adult woman |
| Mira (`mira`) | Sköldhästen – Mira | 5 November | A young adult woman |
| Tukankrabban (`tukan`) | Sköldhästen – Tukankrabban | 5 November | An eager researcher |
| Molnet (`moln`) | Sköldhästen – Molnet | 5 November | Small, soft and shy |
| Tordyveln (`dyvel`) | Sköldhästen – Tordyveln | 5 November | Grumpy and gravelly |
| Skatan (`skata`) | Sköldhästen – Skatan | 5 November | Chatty and vain |
| **Nova** (`nova`) | Sköldhästen – Nova | 12 November, first round's first proposal | A grumpy space crab whose shell is a little flying saucer, who knows everything about space. Low, dry, slightly hoarse adult female voice, unhurried and deadpan, as if just woken and not pleased about it. Never shrill, warmth hidden underneath. |
| **Suddet** (`sudd`) | Sköldhästen – Suddet | 12 November, "Ljus och oskuldsfull" | A little pink eraser, innocent and sincere. A light, clear, bright and simple young adult voice with a naive, wide-eyed tone, plain and honest, gentle and unhurried. |
| **Stora björnen** (`bjorn`) | Sköldhästen – Stora björnen | 12 November, "Jättelik bas" | An enormous bear made of stars, as big as the sky. A huge, booming, cavernous, resonant bass male voice, extremely deep and slow, like a friendly giant. |
| **Kometen** (`komet`) | Sköldhästen – Kometen | 12 November, "Hes sportkommentator" | An over-excited sports commentator of a comet. A hoarse, loud, rapid-fire adult male voice, shouting with excitement, breathless and thrilled. |
| Pip (`pip`) | none | | A sound, not a voice: his lines are shown, never spoken; the game plays a small "pip". |

The four new voices were chosen by ear by Pappa and Alva on the audition page "Röstprov" (two rounds, eight proposals
each in the second). Every proposal's id, description and clip is on Pappa's PC in `rymdkrabban/roster/` with
`roster.json` (gitignored: the repository is public). Nothing has been recorded with the four new voices, so changing
one still costs nothing.

## Direction: every line is acted

Pappa's word after the first auditions: the lines had no feeling. The second audition round read two scenes four ways
(plain; with direction; with direction and the lines around it as context; the whole scene in one take), and Pappa
chose **direction, line by line**. A third round (before and after: 31 lines of Äventyr 1 and 2 in six scenes, as the
game plays them and recorded again with direction) was won by direction in all six scenes.

- **Tags.** English audio tags in square brackets, before the words they colour, two or three words each, as many as
  the line needs, mid-line too: `[groggy, furious] VEM parkerar en raket på MIN måne? [exasperated sigh] Före
  frukost?!` Eleven v4 acts them and does not read them aloud. Tags describe what the character feels, never how
  loud the recording is.
- **Beside the text, never in it.** The shown text is the clip's key (`src/voice-key.mjs`), so the direction lives in
  a side file the game never loads: `regi.mjs` next to each adventure's `sv.mjs`. It exports `DEFAULT` (a tag per
  voice, for every line without its own) and `LINES` (`[voice, say]`). With its tags taken out, `say` is exactly the
  shown text; a test checks that every entry matches exactly one line.
  - `skoldhast/adventures/adventure-3/content/regi.mjs`: written (352 lines and the defaults).
  - `skoldhast/src/content/regi.mjs` (Äventyr 1) and `skoldhast/adventures/adventure-2/content/regi.mjs`: to be
    written when the re-recording begins. The trial's 31 lines and their tags are the model; they are in
    `rymdkrabban/roster/omgang3/omgang3.json` on Pappa's PC, with their approved clips.
  - Default tags used in the trial for Äventyr 1 and 2: Klo `[helpful, curious]`, Tukankrabban `[curious, bubbly]`,
    the sköldhäst `[thoughtful, to itself]`. Äventyr 3's defaults: Nova `[dry, deadpan]`, Klo `[helpful, a little
    nervous]`, the sköldhäst `[thoughtful, to itself]`, Suddet `[earnest]`, Stora björnen `[slow, deep, kind]`,
    Kometen `[rushed, excited]`, Alva `[warm, bright]`, Mira `[eager, playful]`, Tukankrabban `[warm, bubbly]`, Molnet
    `[soft, timid]`, the narrator `[warm, storytelling]`.
- **Settings.** Eleven v4, Swedish, `voice_settings: { stability: 0.35 }` (freer than the default: it lets a sigh or a
  laugh through). No `previous_text`/`next_text`, no whole-scene takes.
- **Checking a take.** Speech-to-text (`scribe_v1`) with `tag_audio_events: true`. A take is kept when the words come
  back (80 % or more) and no tag word is heard as speech; numbers written as digits count as right. A tag that is
  spoken aloud was put where the model read it as text: move it or shorten it. A failed take never replaces a clip.

## Recording, when Pappa says so

`scripts/skoldhast-voice.mjs` (its header has every option). The key is `ELEVENLABS_API_KEY` in `.env` (never printed,
never committed).

```
node scripts/skoldhast-voice.mjs                     # the script: lines, characters and clips per voice
node scripts/skoldhast-voice.mjs --missing --a3      # what is not recorded yet, Äventyr 3 included
NODE_USE_ENV_PROXY=1 ELEVENLABS_API_KEY=… SKOLDHAST_NARRATOR_VOICE=<id> node scripts/skoldhast-voice.mjs --record --a3
node scripts/skoldhast-voice.mjs --level             # every clip's loudness (EBU R128) into the manifest
node scripts/skoldhast-voice.mjs --prune             # remove clips no line uses
```

- **Äventyr 3:** when Pappa says the adventure is finished, empty `PENDING` in the script (or record with `--a3`);
  read the script aloud once first (design section 20, step 11), since a changed line means a new clip.
- **Äventyr 1 and 2 again with direction** (design section 17.2, in this order): write the two `regi.mjs` files; let
  the script record existing lines again where their direction has changed (keep which `say` each clip was recorded
  with beside the clips, e.g. `skoldhast/voice/regi.json`, so a run can stop and go on); record a voice at a time,
  Äventyr 1 then Äventyr 2; listen to a sample of each voice before the next; then commit. The old clips stay in git
  history, so a single line can go back.
- **On Pappa's PC** the ffmpeg has no `libmp3lame`: ask ElevenLabs for `output_format=mp3_44100_64` directly and
  measure loudness with the local ffmpeg (the Lenovo one has `ebur128`).
- **The narrator** is Pappa's own voice. Its id is not in `.env`: without it the narrator's lines keep their present
  clips (25 in Äventyr 1 and 2).
- **Cost** (the account's month is 168,382 characters): Äventyr 1 and 2 again about 51,000 characters plus a fifth to
  a third for retakes; Äventyr 3 about 26,800 plus retakes. Both together fit in one month.

## Tests

- `tests/skoldhast-voice.test.mjs` fails until every recorded adventure's line has its clip and loudness, and nothing
  is left over; Äventyr 3's lines are pending and not asked for yet.
- `tests/skoldhast-a3-words.test.mjs` checks Äventyr 3's direction (every entry matches exactly one line, no line has
  two, every story line has one) and its words (short boxes, three-step hints, nothing said too early).
