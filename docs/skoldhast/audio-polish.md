# Audio polish — 29 September 2026

## Before: audit and implementation plan

The existing engine already has a correctly tuned fractional-delay lyre, five
arrangements of the same theme, synthesized foley, a stereo room and a protected
master bus. Keep that musical identity and refine its materials and integration.

| Finding before edits | Planned correction |
| --- | --- |
| Hollow piers use the same `plank` sample as solid wood. All hoof speeds share one mid-speed rendering. | A separate resonant pier, heel/toe contacts, and gentle/hard contact banks. Keep the real simulation's gait timing. |
| Lyre excitation and pad harmonics emphasize a bright, slightly thin upper range. | Soften the excitation, add a restrained soundboard response and warmer harmonics without changing the theme's pitch or tempo. |
| Water effects use conspicuous rising tones; pencil strokes have a fairly uniform bright hiss. | More soft displacement, irregular air pockets and pressure changes; quieter, less metallic droplets. |
| Klo has only a short high click. Synthesized character sounds all use the effects slider; the voice slider has no audible role. | A separate brief shell chatter, voice bus, and matching reverb send. Keep physical claw clicks on effects. |
| Land ambience contains wind only and does not distinguish the beach from the steppe. | An explicit environment selector that blends beach wash, steppe wind, kelp hush and bay lapping. |
| The notebook has a page sound but no dedicated soft open/close/tab/confirm cues. | Small paper/wood UI cues, plus page-turn integration in the host. |
| Offline QA reports peaks/RMS and pitch but does not count clipped or non-finite samples, check bus isolation, or preserve a machine-readable report. | Extend the real Chromium OfflineAudioContext checks and add renderer regressions. |

Initial audio renders are in the working session's `/tmp/skoldhast-audio-before`.
Audio changes do not affect the visual before contact sheets.

## Integration contract

- `setEnvironment('beach' | 'steppe' | 'kelp' | 'bay' | 'table' | null)`;
  `null` follows the music area. Update only when the place changes.
- `sfx('hoof', { surface: 'pier', speed01, foot })` for hollow walkable wood;
  other materials retain their names. `foot` is optional.
- `sfx('crabvoice')` for a short spoken reaction; `crabclick` remains a claw click.
- `sfx('ui', { kind: 'open' | 'close' | 'tab' | 'confirm' })` for notebook controls.
- `sfx('page')` when a notebook/world page actually turns.

## Verification and listening

Implemented the changes above with synthesized buffers only. The theme's melody,
D dorian harmony, five arrangements and tempi stay intact. The lyre has softer
excitation and a small wooden-body response; the harmonic voice has more low
partials; the pad has a gentler overtone roll-off and vibrato. Reverb now has a
shorter, darker tail. Hoof samples distinguish seven surfaces and two contact
strengths; the existing simulation decides when the contacts happen.

`node --test tests/skoldhast-audio.test.mjs` passes three regressions: every cue's
finite/bounded samples and quiet ending, the pier's longer hollow resonance, and
safe fallback when Web Audio is unavailable.

The full browser check passes at 48 kHz:

```sh
node scripts/skoldhast-audio-check.mjs --out /tmp/skoldhast-audio-after --no-images
```

- 60 rendered cues/scenes, including all arrangements, stingers, effects, each
  ambience and an intentionally excessive overlapping maximum-volume scene.
- 79 pitched notes within the 10-cent tolerance; all loop-seam checks pass.
- **Zero clipped or non-finite samples.** The worst sample peak is **−1.72 dBFS**;
  reconstructed true peak is **−1.5 dBFS** in the extreme overlap scene.
- All three volume buses pass isolation: muted signals below −100 dBFS; their
  assigned sounds remain audible when the other two sliders are zero.
- No page errors. The machine-readable results are in `audio-qa.json`.
- Chromium renders the actual audio graph; FFmpeg measures EBU R128 integrated
  loudness and true peaks from those rendered WAVs. FFmpeg is optional when
  rerunning the script elsewhere; sample peaks/RMS and bus checks always run.

| Arrangement | Before sample peak | After sample peak | After integrated loudness |
| --- | ---: | ---: | ---: |
| Table | −10.20 dBFS | −11.13 dBFS | −23.7 LUFS |
| Land | −6.44 dBFS | −6.24 dBFS | −21.3 LUFS |
| Sea | −9.78 dBFS | −9.52 dBFS | −22.0 LUFS |
| Bay | −11.94 dBFS | −12.19 dBFS | −26.3 LUFS |
| Final | −5.42 dBFS | −5.84 dBFS | −20.6 LUFS |

The first true-peak stress check reached the −1 dBFS safety boundary despite no
sample clipping. Lowering the master ceiling from 0.87 to 0.82 supplies the margin
above, without changing quiet passages. The bay remains deliberately softer than
the finale. Perceived quality still needs a human listen on the intended device.

### Exact listen checklist in `skoldhast/dev/audio.html`

1. Press **Starta ljudet**. Select **table**, **land**, **sea**, **bay**, then
   **final**; listen for the same warm tune in each. On land move **speed01** from
   0.25 to 1, then toggle **hidden** and **underwater** to hear the arrangement thin
   and soften. Restore both checkboxes afterwards.
2. Enable **hoofbeats follow speed on**. Compare **sand**, **wetsand**, **grass**,
   **plank**, and **pier** at speed 0.25 and 0.9. The pier should be distinctly
   hollow, grass soft, and gallop grouped with a suspension gap. Turn hoofbeats off.
3. Select **quiet**, set **music** to zero and compare the **beach**, **steppe**,
   **kelp**, and **bay** ambience buttons. Select **table** ambience for silence.
4. Play **splash** at small and large sizes, then **swim**, **bubble**, **pencil**,
   **page**, and all four **notebook** buttons. Listen for water weight, small air
   pockets, paper movement and unobtrusive menu feedback.
5. Play **crabclick** then **crabvoice**. Set **voice** to zero and repeat:
   chatter should stop while the claw click remains. Restore voice, set **sfx** to
   zero and repeat: chatter should remain while the claw click stops. Restore sfx.
6. Restore music to 0.8. Play **land**, then **freeze** and **plask**; check the
   intentional stop and warm return without clicks or harsh peaks.
