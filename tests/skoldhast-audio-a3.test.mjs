/*
 * Äventyr 3's music and sounds (docs/skoldhast/adventure-3.md section 16, "Sound"): one melody, Vintergatans visa,
 * set five ways and never heard whole before the great gallop; Äventyr 1 and 2's music untouched; the new effects
 * safe; the API there even without sound.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { __dsp, AREAS, SFX, SURFACES, STAR_THEME, THEME, createAudio } from '../skoldhast/src/audio.mjs';

const { ARR, SONGS, CHORDS, BAR_STEPS } = __dsp;
const A3 = ['moon', 'stars', 'ring', 'white', 'gallop', 'sky', 'starTable'];
const LYDIAN_C = new Set([0, 2, 4, 6, 7, 9, 11]);

test('Vintergatans visa: sixteen bars of 6/8 in C lydian, singable', () => {
    assert.equal(STAR_THEME.midi.length, STAR_THEME.eighths.length);
    assert.equal(STAR_THEME.eighths.reduce((a, b) => a + b, 0), 16 * 6, 'sixteen bars of six eighths');
    for (const m of STAR_THEME.midi) {
        assert.ok(LYDIAN_C.has(m % 12), `${m} is in C lydian`);
        assert.ok(m >= 64 && m <= 84, `${m} is in a singable range (E4–C6)`);
    }
    // the bars add up: no note runs over a bar line
    let pos = 0;
    for (const len of STAR_THEME.eighths) { assert.ok(Math.floor(pos / 6) === Math.floor((pos + len - 1) / 6), 'a note stays inside its bar'); pos += len; }
    // it asks (ends the first half on C, an octave below its top) and answers (climbs to high C before it ends)
    assert.equal(STAR_THEME.midi[STAR_THEME.midi.length - 1], 72);
    assert.equal(Math.max(...STAR_THEME.midi), 84);
});

test('every bar\'s first note is a tone of its chord', () => {
    const song = SONGS.stars;
    for (let bar = 0; bar < 16; bar++) {
        for (const pos of song.split(bar) ? [0, 3] : [0]) {
            const s = bar * BAR_STEPS + pos;
            const m = song.midi[s];
            if (m < 0) continue;
            const ch = CHORDS[song.chord(bar, pos)];
            assert.ok(ch.tones.some(t => (t - m) % 12 === 0), `bar ${bar + 1}${pos ? ' (second half)' : ''}: ${m} in ${song.chord(bar, pos)}`);
        }
    }
});

test('five settings of it, and the melody is never whole before the gallop', () => {
    for (const a of A3) {
        assert.ok(AREAS.includes(a), a + ' is an area');
        assert.equal(ARR[a].song, 'stars', a + ' plays Vintergatans visa');
    }
    // before the gallop: a phrase (the Moon), a longer phrase (the stars), its rhythm only (the ring), almost nothing
    assert.deepEqual(ARR.moon.mel.bars, [...STAR_THEME.phrases.moon]);
    assert.deepEqual(ARR.stars.mel.bars, [...STAR_THEME.phrases.stars]);
    assert.ok(ARR.moon.mel.bars.length < ARR.stars.mel.bars.length && ARR.stars.mel.bars.length < 16, 'a phrase, then a longer one, never all');
    assert.equal(ARR.ring.mel.mode, 'rhythm', 'the ring has its rhythm, not its pitches');
    assert.equal(ARR.white.mel, undefined, 'the white hole has no melody');
    // the cycle's turn is quiet before the gallop: no phrase starts on the first bar (no seam where the cycle loops)
    assert.ok(!ARR.moon.mel.bars.includes(0) && !ARR.stars.mel.bars.includes(0));
    // whole for the first time in the gallop, then in the finished sky and at the table; the gallop follows the hooves
    for (const a of ['gallop', 'sky', 'starTable']) assert.ok(ARR[a].mel && !ARR[a].mel.bars && ARR[a].mel.mode === 'full', a + ' plays all of it');
    assert.ok(ARR.gallop.mel.motion && ARR.gallop.drum, 'the gallop grows with the gallop, the hoofbeats its drum');
});

test('Äventyr 1 and 2 sound as before', () => {
    assert.deepEqual(AREAS.slice(0, 6), ['table', 'land', 'sea', 'bay', 'final', 'quiet']);
    for (const a of ['table', 'land', 'sea', 'bay', 'final']) assert.equal(ARR[a].song, undefined, a + ' plays Sköldhästens visa');
    assert.equal(THEME.name, 'Sköldhästens visa');
    assert.deepEqual([...THEME.midi.slice(0, 8)], [62, 69, 69, 71, 72, 74, 72, 69]);
    assert.ok(SONGS.visa.split(6) && !SONGS.visa.split(5), 'its bar 7 is still the split one');
});

test('the new sounds: Suddet\'s rubbing, a bite, the beam, the lamps, Pip, ice, moon dust and star-lines', () => {
    for (const n of ['rub', 'rubTear', 'beam', 'lamp', 'pip', 'ice']) {
        assert.ok(SFX.includes(n), n + ' is listed');
        const r = __dsp.SFX_RENDER[n](24000, __dsp.mulberry32(5), {});
        const x = r.ch[0];
        let peak = 0;
        for (const v of x) { assert.ok(Number.isFinite(v)); peak = Math.max(peak, Math.abs(v)); }
        assert.ok(peak > 0.05 && peak <= 0.5, n + ' is heard and not too loud');
        assert.ok(Math.abs(x[x.length - 1]) < 1e-4, n + ' fades out');
    }
    // the rubbing is three strokes and a pause: three bursts of sound with quiet between
    const rub = __dsp.SFX_RENDER.rub(24000, __dsp.mulberry32(9), {}).ch[0];
    const win = 2400, levels = [];
    for (let i = 0; i + win <= rub.length; i += win) { let e = 0; for (let k = i; k < i + win; k++) e += rub[k] * rub[k]; levels.push(Math.sqrt(e / win)); }
    const loud = Math.max(...levels), runs = levels.reduce((n, v, i) => n + (v > loud * 0.35 && !(levels[i - 1] > loud * 0.35) ? 1 : 0), 0);
    assert.ok(runs >= 3 && runs <= 4, `three strokes (heard ${runs})`);
    for (const s of ['moon', 'star', 'ice']) assert.ok(SURFACES.includes(s), s + ' is a surface for hooves');
});

test('without sound, Äventyr 3\'s calls are safe', async () => {
    const audio = createAudio();
    await audio.ready;
    assert.equal(typeof audio.melodyNote, 'function');
    assert.equal(typeof audio.melodyPhrase, 'function');
    assert.equal(typeof audio.has, 'function');
    audio.melodyNote(3, { inst: 'shell' });
    audio.melodyPhrase(5);
    audio.setArea('gallop'); audio.setArea('white'); audio.setArea('quiet');
    audio.sfx('rub', { gain: 0.5, pan: -0.4 });
    audio.sfx('hoof', { surface: 'moon', speed01: 1 });
    audio.dispose();
});
