/*
 * Sköldhästen's recorded voices: the key, the player's rules (one voice at a time, asides only in
 * silence and not nagging), the recording script's choices, and that every line is recorded.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { voiceKey } from '../skoldhast/src/voice-key.mjs';
import { createVoice, ASIDE_GAP } from '../skoldhast/src/voice.mjs';
import { voiceScript, spoken, match, VOICES } from '../scripts/skoldhast-voice.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';
import { STORY as STORY2, HINTS } from '../skoldhast/adventures/adventure-2/content/sv.mjs';

const tick = () => new Promise(r => setImmediate(r));

/** An audio engine with a fake WebAudio context: sources start and end when told. */
function rig(clips) {
    const sources = [];
    let now = 0;
    const audio = {
        voiceInput: {}, ducked: 0,
        duckSpeech() { audio.ducked++; },
        ctx: {
            decodeAudioData: async () => ({ duration: 2 }),
            createBufferSource() {
                const s = { connect() {}, start() { s.playing = true; }, stop() { s.playing = false; s.onended?.(); }, onended: null };
                sources.push(s);
                return s;
            }
        }
    };
    const fetch = async (url) => String(url).endsWith('manifest.json')
        ? { ok: true, json: async () => ({ clips }) }
        : { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
    const voice = createVoice({ audio: () => audio, base: 'https://example.test/voice/', fetch, clock: () => now });
    return { voice, audio, sources, at: (t) => { now = t; } };
}
const clipsFor = (...lines) => Object.fromEntries(lines.map(([s, t]) => [voiceKey(s, t), 2]));

test('the key: who speaks and what is shown, with wrapped whitespace ignored', () => {
    assert.equal(voiceKey('klo', 'Hej  där\nKlo'), voiceKey('klo', 'Hej där Klo'));
    assert.notEqual(voiceKey('klo', 'Ja.'), voiceKey('horse', 'Ja.'));
    assert.match(voiceKey('caption', 'x'), /^[0-9a-f]{14}$/);
});

test('one voice at a time: a box silences what came before, its tap silences itself', async () => {
    const A = ['klo', 'Första.'], B = ['horse', 'Andra.'], N = ['caption', 'Berättat.'];
    const { voice, sources, audio } = rig(clipsFor(A, B, N));
    await voice.ready;
    assert.equal(voice.play('klo', 'Ingen inspelning.'), null, 'a line without a clip stays silent');
    const first = voice.play(...A);
    await tick(); await tick();
    assert.equal(sources.length, 1); assert.ok(sources[0].playing); assert.equal(audio.ducked, 1, 'the music is lowered');
    voice.play(...B);
    await first; // the first clip ended when the next box opened
    await tick(); await tick();
    assert.equal(sources[0].playing, false); assert.ok(sources[1].playing);
    const read = voice.play(...N, 'narration');
    await tick(); await tick();
    voice.stop('say'); // a box's tap does not cut the narrator
    assert.ok(sources[2].playing);
    let ended = false; read.then(() => { ended = true; });
    sources[2].onended(); await tick();
    assert.ok(ended, 'a caption can be waited for until its reading ends');
});

test('asides only in silence, and a repeated thought is shown but not said again for a while', async () => {
    const T = ['horse', 'För långsamt!'], S = ['klo', 'Hej!'];
    const { voice, sources, at } = rig(clipsFor(T, S));
    await voice.ready;
    voice.play(...S);
    await tick(); await tick();
    assert.equal(voice.play(...T, 'aside'), null, 'a thought never talks over a line');
    sources[0].onended(); await tick();
    assert.ok(voice.play(...T, 'aside'));
    await tick(); await tick();
    sources[1].onended(); await tick();
    at(ASIDE_GAP - 1);
    assert.equal(voice.play(...T, 'aside'), null, 'the same thought again at once stays silent');
    at(ASIDE_GAP + 1);
    assert.ok(voice.play(...T, 'aside'), 'and is said again after a while');
});

test('nobody is cut off mid-sentence: a box can wait for a thought, and a stopped voice fades', async () => {
    const T = ['horse', 'Ett ofärdigt streck …'], S = ['klo', 'Hej!'];
    const { voice, sources, audio } = rig(clipsFor(T, S));
    await voice.ready;
    let waited = false;
    await voice.asideEnd(6).then(() => { waited = true; });
    assert.ok(waited, 'with nothing said, there is nothing to wait for');
    voice.play(...T, 'aside');
    await tick(); await tick();
    let ended = false; voice.asideEnd(6).then(() => { ended = true; });
    await tick();
    assert.equal(ended, false, 'the thought is still being said');
    sources[0].onended(); await tick(); await tick();
    assert.ok(ended, 'the box may open once the thought has ended');
    // with a real context the voice runs through its own gain and fades when stopped
    const ramps = [];
    audio.ctx.currentTime = 10;
    audio.ctx.createGain = () => ({ connect() {}, gain: { setTargetAtTime: (v, t) => ramps.push([v, t]) } });
    voice.play(...S);
    await tick(); await tick();
    let stoppedAt = null; sources[1].stop = (t) => { stoppedAt = t; };
    voice.stop();
    assert.deepEqual(ramps, [[0, 10]], 'it fades to silence from now');
    assert.ok(stoppedAt > 10 && stoppedAt < 10.3, 'and stops a moment later, not at once');
});

test('voices off: nothing is fetched or played, and what was playing stops', async () => {
    const A = ['klo', 'Första.'];
    const { voice, sources } = rig(clipsFor(A));
    await voice.ready;
    voice.play(...A);
    await tick(); await tick();
    voice.setEnabled(false);
    assert.equal(sources[0].playing, false);
    assert.equal(voice.play(...A), null);
    assert.equal(voice.seconds(...A), 0);
});

test('the voice script: each line has one of the cast, read as written but for the signature and the capitals', () => {
    const lines = voiceScript();
    assert.ok(lines.length > 800);
    for (const l of lines) assert.ok(l.voice in VOICES, `${l.src}: unknown voice ${l.voice}`);
    assert.equal(new Set(lines.map(l => l.key)).size, lines.length);
    assert.equal(spoken('Rör ej! /Kartväktaren'), 'Rör ej! – Kartväktaren');
    assert.equal(spoken('Här står LAND. Och här står HAV.'), 'Här står Land. Och här står Hav.');
    assert.equal(spoken('P-p-professor Klo … ägg.'), 'P-p-professor Klo … ägg.');
    assert.ok(match('Klart du får, i stället.', 'Klart du får istället') > 0.99);
    const voiceOf = (speaker, text) => lines.find(l => l.key === voiceKey(speaker, text))?.voice;
    // his notes in his own voice; her printed words in Pappa's, as narrator
    assert.equal(voiceOf('note', STORY.k1.note1[1]), 'kv');
    assert.equal(lines.find(l => l.speaker === 'note' && l.text.endsWith('Forskningen fortsätter.')).voice, 'narrator');
    assert.equal(voiceOf('horse', STORY.k1.thinRule), 'horse');
    assert.equal(voiceOf('caption', STORY2.rideCaption), 'narrator');
    // either companion in Äventyr 2 can give any hint
    assert.equal(voiceOf('klo', HINTS.p1[0]), 'klo'); assert.equal(voiceOf('tukan', HINTS.p1[0]), 'tukan');
    // lines no code plays, and card titles, are not recorded
    for (const t of [STORY.prolog.fold[1], STORY.prolog.research[1], STORY.k3.mapCaption]) assert.ok(!lines.some(l => l.text === t), t);
    assert.ok(!lines.some(l => l.src === 'a2 STORY.darkCave'), 'its BALK copy is the one played');
    assert.equal(voiceOf('horse', STORY2.darkCave), 'horse');
});

test('every line in the voice script is recorded, and no clip is left over', () => {
    const dir = fileURLToPath(new URL('../skoldhast/voice/', import.meta.url));
    const { clips } = JSON.parse(fs.readFileSync(dir + 'manifest.json', 'utf8'));
    const keys = new Set(voiceScript().map(l => l.key));
    const missing = [...keys].filter(k => !clips[k] || !fs.existsSync(dir + k + '.mp3'));
    assert.deepEqual(missing.map(k => voiceScript().find(l => l.key === k).src), [],
        'record them: NODE_USE_ENV_PROXY=1 node scripts/skoldhast-voice.mjs --record');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4));
    assert.deepEqual(files.filter(k => !keys.has(k)), [], 'remove them: node scripts/skoldhast-voice.mjs --prune');
    assert.deepEqual(Object.keys(clips).filter(k => !keys.has(k)), []);
});

test('a voice never holds the game up: before the first tap the context is suspended, and nothing waits', async () => {
    const A = ['caption', 'Berättat.'];
    const { voice, audio } = rig(clipsFor(A));
    await voice.ready;
    audio.ctx.state = 'suspended';
    assert.equal(voice.play(...A, 'narration'), null, 'ui.caption then resolves at once');
    audio.ctx.state = 'running';
    assert.ok(voice.play(...A, 'narration'));
    voice.stop();
});
