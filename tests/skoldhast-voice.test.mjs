/*
 * Sköldhästen's recorded voices: the key, the player's rules (one voice at a time, asides only in
 * silence and not nagging), the recording script's choices, and that every line is recorded.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { voiceKey } from '../skoldhast/src/voice-key.mjs';
import { createVoice, ASIDE_GAP, LEVEL, levelGain } from '../skoldhast/src/voice.mjs';
import { voiceScript, spoken, match, VOICES, ttsBody, directionFor, untag, tagWordsHeard, judge } from '../scripts/skoldhast-voice.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';
import { STORY as STORY2, HINTS } from '../skoldhast/adventures/adventure-2/content/sv.mjs';

const tick = () => new Promise(r => setImmediate(r));

/** An audio engine with a fake WebAudio context: sources start and end when told. */
function rig(clips, lufs) {
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
        ? { ok: true, json: async () => ({ clips, lufs }) }
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

test('every clip is played at the same loudness', async () => {
    // 6 November: Kartväktaren was 5 dB louder than Klo, some of Tukankrabban's lines 6 dB quieter
    assert.equal(levelGain(LEVEL), 1);
    assert.ok(Math.abs(levelGain(LEVEL + 6) - 0.5) < 0.01, 'a clip 6 dB too loud is halved');
    assert.ok(Math.abs(levelGain(LEVEL - 3) - 1.41) < 0.01);
    assert.equal(levelGain(LEVEL - 20), 2, 'never raised more than 6 dB');
    assert.equal(levelGain(undefined), 1, 'a clip not measured plays as it is');
    const A = ['kv', 'Högt.'];
    const { voice, audio } = rig(clipsFor(A), { [voiceKey(...A)]: LEVEL + 5 });
    const made = [];
    audio.ctx.currentTime = 0;
    audio.ctx.createGain = () => { const g = { connect() {}, gain: { value: 1, setTargetAtTime() {} } }; made.push(g); return g; };
    await voice.ready;
    voice.play(...A);
    await tick(); await tick();
    assert.ok(Math.abs(made[0].gain.value - 10 ** (-5 / 20)) < 0.001, 'played 5 dB quieter');
    const dir = fileURLToPath(new URL('../skoldhast/voice/', import.meta.url));
    const m = JSON.parse(fs.readFileSync(dir + 'manifest.json', 'utf8'));
    assert.deepEqual(Object.keys(m.clips).filter(k => typeof m.lufs?.[k] !== 'number'), [],
        'measure them: node scripts/skoldhast-voice.mjs --level (needs ffmpeg)');
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
    // a pending adventure's line (Äventyr 3, recorded only when Pappa says so) is not left over
    const any = new Set(voiceScript({ pending: true }).map(l => l.key));
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4));
    assert.deepEqual(files.filter(k => !any.has(k)), [], 'remove them: node scripts/skoldhast-voice.mjs --prune');
    assert.deepEqual(Object.keys(clips).filter(k => !any.has(k)), []);
});

test('direction (section 17.1): a line is acted where its adventure has a regi.mjs, read plainly elsewhere', () => {
    const a1 = voiceScript().find(l => l.src.startsWith('a1 ') && l.voice === 'klo');
    const direction = {
        a3: { DEFAULT: { klo: 'helpful, curious' }, LINES: [['klo', '[relieved, shaky] Vi landade! [proud] Men vi landade.']] }
    };
    // Äventyr 1 has no direction (yet): sent as before, plain and with no settings
    const plain = ttsBody(a1, direction);
    assert.equal(plain.directed, false);
    assert.equal(plain.body.text, spoken(a1.text));
    assert.equal(plain.body.voice_settings, undefined);
    assert.equal(plain.body.model_id, 'eleven_v4');
    // a line with its own entry is sent as its `say`, freer (stability 0.35)
    const own = { key: 'x', src: 'a3 STORY.arrive.0', voice: 'klo', speaker: 'klo', text: 'Vi landade!  Men vi landade.' };
    const d = ttsBody(own, direction);
    assert.equal(d.body.text, '[relieved, shaky] Vi landade! [proud] Men vi landade.');
    assert.deepEqual(d.body.voice_settings, { stability: 0.35 });
    // a line with none takes its voice's default tag; a voice with no default is sent as it is
    assert.equal(directionFor({ ...own, text: 'Hej.' }, direction).say, '[helpful, curious] Hej.');
    assert.equal(directionFor({ ...own, voice: 'nova', text: 'Hej.' }, direction).say, 'Hej.');
    assert.equal(untag('[a, b] Hej [c] där.'), 'Hej där.');
    // a take: the audio events are no words, and a tag word heard as speech is caught (unless the line has it)
    const say = '[groggy, furious] VEM parkerar? [exasperated sigh] Före frukost?!';
    assert.deepEqual(tagWordsHeard(say, 'VEM parkerar? Före frukost?!', 'Vem parkerar? [suck] Före frukost?'), []);
    assert.deepEqual(tagWordsHeard(say, 'VEM parkerar? Före frukost?!', 'Groggy, vem parkerar? Före frukost?'), ['groggy']);
    const j = judge({ text: 'VEM parkerar? Före frukost?!' }, say, 'Vem parkerar? (suck) Före frukost?');
    assert.equal(j.score, 1); assert.deepEqual(j.tagsHeard, []);
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
