/*
 * Sköldhästen: the recorded voices.
 *
 * Builds the voice script from the adventures' Swedish text (src/content/sv.mjs,
 * adventures/adventure-2/content/sv.mjs and adventures/adventure-3/content/sv.mjs), records every line that has no
 * clip yet with ElevenLabs, checks each clip by reading it back with speech-to-text, and writes
 * skoldhast/voice/<key>.mp3 and skoldhast/voice/manifest.json. The game looks a clip up by
 * who speaks and what is shown (src/voice-key.mjs); a line without a clip stays silent.
 * docs/skoldhast/voice-audit.md says what is voiced, by whom, and why.
 *
 *   node scripts/skoldhast-voice.mjs                 # the script: lines, characters and clips per voice
 *   node scripts/skoldhast-voice.mjs --missing       # what is not recorded yet
 *   … --a3                                           # with Äventyr 3's lines too (pending: see PENDING)
 *   NODE_USE_ENV_PROXY=1 ELEVENLABS_API_KEY=… SKOLDHAST_NARRATOR_VOICE=<voice id> \
 *     node scripts/skoldhast-voice.mjs --record [--only klo] [--limit 20] [--report out.json]
 *   … --record --redo out.json [--below 0.9] [--tries 5]   # retake what a report heard badly; keep the better clip
 *   node scripts/skoldhast-voice.mjs --prune         # remove clips no line uses, rewrite the manifest
 *   node scripts/skoldhast-voice.mjs --level         # measure every clip's loudness (EBU R128, ffmpeg) into the manifest
 *
 * The characters are the voices named "Sköldhästen – <roll>" in Pappa's ElevenLabs account; the
 * narrator is his own voice, given by id. Recording is Eleven v4 in Swedish, 24 kHz mono, MP3 48 kbit/s.
 *
 * Direction (docs/skoldhast/adventure-3.md, section 17.1): an adventure with a `regi.mjs` beside its `sv.mjs` is
 * recorded acted. Each line is sent as its own entry's `say` (English audio tags in square brackets around the shown
 * words), or with its voice's default tag; Eleven v4 at stability 0.35; read back with the audio events heard, and a
 * take is kept only when no tag word comes back as speech. An adventure without a `regi.mjs` is read plainly, as
 * Äventyr 1 and 2 were recorded (until their direction is written, section 17.2).
 *
 * Pending: an adventure in PENDING is left out of the voice script (and of the check that every line is recorded)
 * unless asked for with --a3. Äventyr 3 waited there until Pappa said it was finished (12 November 2026); it is
 * recorded now, and PENDING is empty.
 *
 * Pappa's PC: its ffmpeg has no libmp3lame. Set SKOLDHAST_FFMPEG to the Lenovo ffmpeg (it has ebur128); then
 * ElevenLabs is asked for MP3 (44.1 kHz, 64 kbit/s) directly, and that ffmpeg only measures and decodes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { voiceKey } from '../skoldhast/src/voice-key.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'skoldhast/voice');
const MANIFEST = path.join(OUT, 'manifest.json');
const A1 = await import(pathToFileURL(path.join(root, 'skoldhast/src/content/sv.mjs')).href);
const A2 = await import(pathToFileURL(path.join(root, 'skoldhast/adventures/adventure-2/content/sv.mjs')).href);
const A3 = await import(pathToFileURL(path.join(root, 'skoldhast/adventures/adventure-3/content/sv.mjs')).href);
const { splitSentences } = await import(pathToFileURL(path.join(root, 'skoldhast/src/opening-notes.mjs')).href);

/** Adventures written but not to be recorded yet. Äventyr 3 waited until Pappa said it was finished; on 12 November
 *  2026, after its last playthrough, he said "Spela in rösterna nu!". */
export const PENDING = Object.freeze([]);

/** Each adventure's text folder, by the prefix its lines' `src` starts with. Its direction is `regi.mjs` there. */
const CONTENT = { a1: 'skoldhast/src/content', a2: 'skoldhast/adventures/adventure-2/content', a3: 'skoldhast/adventures/adventure-3/content' };
/** Every adventure's direction that exists: { a1?: { DEFAULT, LINES }, a2?: …, a3?: … }. */
export const DIRECTION = {};
for (const [id, dir] of Object.entries(CONTENT)) {
    const file = path.join(root, dir, 'regi.mjs');
    if (fs.existsSync(file)) DIRECTION[id] = await import(pathToFileURL(file).href);
}

/** The voice of each role: the account's voice name, or the narrator's id from the environment. */
export const VOICES = {
    narrator: null, horse: 'Sköldhästen', klo: 'Professor Klo', kv: 'Kartväktaren', signe: 'Sköldpaddan Signe',
    alva: 'Alva', mira: 'Mira', tukan: 'Tukankrabban', moln: 'Molnet', dyvel: 'Tordyveln', skata: 'Skatan',
    // Äventyr 3 (docs/skoldhast/adventure-3.md, section 17): designed on 12 November, no lines recorded yet
    nova: 'Nova', sudd: 'Suddet', bjorn: 'Stora björnen', komet: 'Kometen'
};

// Äventyr 1: bare strings in STORY are Klo's hint bubbles, except these.
const A1_CAPTIONS = new Set(['prolog.thinking', 'prolog.wakeCaption', 'prolog.foldCaption', 'prolog.afterFreezeCaption',
    'final.unfoldCaption', 'final.wet']);
const A1_THOUGHTS = new Set(['rescued', 'k1.fluffWrongWay', 'k1.fluffMiss', 'k1.thinRule', 'k1.thinRuleKnown', 'k1.teachStreck']);
// card titles, fallbacks for text that is set, and lines no code plays
const A1_SILENT = new Set(['prolog.captionFallback', 'final.noteFallback', 'k2.mapAssemble', 'k3.memoryCaption',
    'k3.guardianCaption', 'k3.mapCaption', 'prolog.fold', 'prolog.research', 'k1.paper', 'k2.whirlHint']);
// Äventyr 2: bare strings in STORY are the sköldhäst's thoughts, except these.
const A2_CAPTIONS = new Set(['rideCaption', 'moonCaption', 'watchCaption']);
const A2_SILENT = new Set(['darkCave', 'chasm']); // the BALK copies are the ones played

const isPair = v => Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string' && /^[a-z]{2,6}$/.test(v[0]);
function walk(v, at, visit) {
    if (typeof v === 'string' || isPair(v)) visit(v, at);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, at ? `${at}.${i}` : String(i), visit));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, at ? `${at}.${k}` : k, visit);
}
const strip = at => at.replace(/\.\d+(?=\.|$)/g, '');

// Äventyr 3: bare strings in STORY are the sköldhäst's thoughts, except these lists of another voice's remarks
// and the caption; Pip is a sound, not a voice, so his lines are never recorded.
const A3_STRINGS = { novaGallop: 'nova', suddTalk: 'sudd', finaleCaption: 'narrator' };
const A3_SILENT = new Set(['pip']);

/** Every voiced line: { key, speaker, text, voice, src }. One entry per key. With `pending`, the adventures that are
 *  written but not to be recorded yet (PENDING) are in it too. */
export function voiceScript({ pending = false } = {}) {
    const lines = new Map();
    const add = (speaker, text, voice, src) => {
        if (!text) return;
        const key = voiceKey(speaker, text);
        const had = lines.get(key);
        if (had && had.voice !== voice) throw new Error(`${src}: "${text}" has two voices (${had.voice}, ${voice})`);
        if (!had) lines.set(key, { key, speaker, text, voice, src });
    };
    const pairOrClo = (src, voiceOfString, silent = () => false) => (v, at) => {
        if (silent(strip(at))) return;
        if (Array.isArray(v)) add(v[0], v[1], v[0] === 'note' ? 'kv' : v[0], `${src}.${at}`);
        else { const voice = voiceOfString(strip(at)); if (voice) add(voice === 'narrator' ? 'caption' : voice, v, voice, `${src}.${at}`); }
    };

    // Äventyr 1
    walk(A1.STORY, '', pairOrClo('a1 STORY', at => A1_CAPTIONS.has(at) ? 'narrator' : A1_THOUGHTS.has(at) ? 'horse' : 'klo', at => A1_SILENT.has(at)));
    walk(A1.BALK, '', (t, at) => add('horse', t, 'horse', `a1 BALK.${at}`));
    walk(A1.KLO_JOKES, '', (t, at) => add('klo', t, 'klo', `a1 KLO_JOKES.${at}`));
    for (const [part, v] of Object.entries(A1.KLO_COMPANION)) {
        if (part === 'ui' || part === 'places') continue;
        walk(v, '', pairOrClo(`a1 KLO_COMPANION.${part}`, at => part === 'story' && at === 'fluffMiss' ? 'horse' : 'klo'));
    }
    // Alva's own printed words, read by Pappa: her field note sentence by sentence as it is written
    // (prologue.mjs), her hope as a caption, her question on the last note
    splitSentences(A1.HER_TEXT.full).forEach((s, i) => add('caption', s, 'narrator', `a1 HER_TEXT sentence ${i + 1} (the opening notes)`));
    add('caption', `”${A1.HER_TEXT.hope}”`, 'narrator', 'a1 HER_TEXT.hope (prologue caption)');
    add('note', `${A1.HER_TEXT.question} Forskningen fortsätter.`, 'narrator', 'a1 HER_TEXT.question (the last note)');

    // Äventyr 2
    walk(A2.STORY, '', pairOrClo('a2 STORY', at => {
        const top = at.split('.')[0];
        return A2_SILENT.has(top) ? null : A2_CAPTIONS.has(top) ? 'narrator' : 'horse';
    }));
    walk(A2.BALK, '', (t, at) => add('horse', t, 'horse', `a2 BALK.${at}`));
    walk(A2.TABLE, '', pairOrClo('a2 TABLE', () => 'narrator'));
    // talking to a companion: either of them can give any hint
    const both = (t, src) => { add('klo', t, 'klo', src); add('tukan', t, 'tukan', src); };
    walk(A2.HINTS, '', (t, at) => both(t, `a2 HINTS.${at}`));
    for (const [k, where] of Object.entries(A2.WHERE)) both(A2.NEXT_EGG(where), `a2 NEXT_EGG(WHERE.${k})`);
    for (const [who, list] of Object.entries(A2.CHATTER)) list.forEach((t, i) => add(who, t, who, `a2 CHATTER.${who}.${i}`));

    // Äventyr 3 (docs/skoldhast/adventure-3.md, section 17): pending until Pappa says it is finished
    if (pending || !PENDING.includes('a3')) {
        const speak = (src) => (v, at) => {
            if (Array.isArray(v)) {
                const [who, text] = v;
                if (A3_SILENT.has(who)) return;
                if (who === 'caption') add('caption', text, 'narrator', `${src}.${at}`);
                else add(who, text, who, `${src}.${at}`);
                return;
            }
            const voice = A3_STRINGS[strip(at).split('.')[0]] || 'horse';
            add(voice === 'narrator' ? 'caption' : voice, v, voice, `${src}.${at}`);
        };
        // (a pair here may be a caption: ['caption', text], which the shared walk would take for two thoughts)
        const pair3 = v => Array.isArray(v) && v.length === 2 && typeof v[1] === 'string' && (v[0] === 'caption' || v[0] in A3.NAMES);
        const walk3 = (v, at, visit) => {
            if (typeof v === 'string' || pair3(v)) visit(v, at);
            else if (Array.isArray(v)) v.forEach((x, i) => walk3(x, at ? `${at}.${i}` : String(i), visit));
            else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk3(x, at ? `${at}.${k}` : k, visit);
        };
        walk3(A3.STORY, '', speak('a3 STORY'));
        // the table: speech in Alva's and Mira's voices, captions read by the narrator
        for (const [k, v] of Object.entries(A3.TABLE)) {
            if (Array.isArray(v)) add(v[0], v[1], v[0], `a3 TABLE.${k}`);
            else add('caption', v, 'narrator', `a3 TABLE.${k}`);
        }
        walk(A3.BALK, '', (t, at) => add('horse', t, 'horse', `a3 BALK.${at}`));
        // talking to a companion: either of them can give any hint (Nova and Klo)
        walk(A3.HINTS, '', (t, at) => { add('klo', t, 'klo', `a3 HINTS.${at}`); add('nova', t, 'nova', `a3 HINTS.${at}`); });
        // Pekklon: where the nearest light is, in Nova's words
        for (const [k, t] of Object.entries(A3.POINT)) add('nova', t, 'nova', `a3 POINT.${k}`);
        A3.CHATTER.nova.forEach((t, i) => add('nova', t, 'nova', `a3 CHATTER.nova.${i}`));
        A3.CHATTER.klo.forEach((t, i) => add('klo', t, 'klo', `a3 CHATTER.klo.${i}`));
        add('nova', A3.CHATTER.novaAfter, 'nova', 'a3 CHATTER.novaAfter');
    }
    return [...lines.values()];
}

/** The shown words of a directed line: the tags in square brackets taken out, the spaces evened. */
export function untag(say) {
    return String(say).replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
}
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
/** The English words of a line's tags (three letters or more): the words that must never be heard as speech. */
export function tagWords(say) {
    return [...String(say).matchAll(/\[([^\]]*)\]/g)].flatMap(m => m[1].toLowerCase().split(/[^a-z]+/)).filter(w => w.length > 2);
}
/** Tag words that came back from speech-to-text as speech (the audio events in brackets do not count), and that
 *  are not words of the line itself. */
export function tagWordsHeard(say, text, heard) {
    const own = new Set(String(text).toLowerCase().split(/[^\p{L}]+/u));
    const speech = String(heard).replace(/[[(][^\])]*[\])]/g, ' ');
    return [...new Set(tagWords(say))].filter(w => !own.has(w) && new RegExp(`\\b${w}\\b`, 'i').test(speech));
}
/**
 * How a line is to be read (section 17.1): { say, directed, entry }. In an adventure with a regi.mjs, its own entry
 * (matched by voice and by the shown text once the tags are out), else its voice's default tag; elsewhere the plain
 * text. `say` is what the voice is given, before spoken().
 */
export function directionFor(line, direction = DIRECTION) {
    const adv = String(line.src).split(' ')[0];
    const d = direction[adv];
    if (!d) return { say: line.text, directed: false, entry: null };
    const entry = (d.LINES || []).find(([voice, say]) => voice === line.voice && untag(say) === norm(line.text)) || null;
    if (entry) return { say: entry[1], directed: true, entry };
    const tag = d.DEFAULT?.[line.voice];
    return { say: tag ? `[${tag}] ${line.text}` : line.text, directed: true, entry: null };
}

/** What the voice is given: the signature slash is not read aloud, and capitals are words, not letters. */
export function spoken(text) {
    return text.replace(/\s*\/(?=\p{Lu})/gu, ' – ').replace(/(?<!\p{L})\p{Lu}{2,}(?!\p{L})/gu, w => w[0] + w.slice(1).toLowerCase());
}

const readManifest = () => { try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return { format: 'mp3', clips: {} }; } };
function writeManifest(m) {
    const clips = Object.fromEntries(Object.entries(m.clips).sort(([a], [b]) => a.localeCompare(b)));
    // each clip's loudness (LUFS): the player evens the voices out with it (src/voice.mjs)
    const lufs = Object.fromEntries(Object.entries(m.lufs || {}).filter(([k]) => clips[k]).sort(([a], [b]) => a.localeCompare(b)));
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(MANIFEST, JSON.stringify({ format: 'mp3', clips, lufs }) + '\n');
}
/** The ffmpeg to use: SKOLDHAST_FFMPEG if set (Pappa's PC: the Lenovo one, which has ebur128 but no libmp3lame). */
const FFMPEG = process.env.SKOLDHAST_FFMPEG || 'ffmpeg';
let lameChecked = null;
/** Can this ffmpeg encode MP3? Without libmp3lame ElevenLabs is asked for MP3 directly. */
function hasLame() {
    if (lameChecked === null) lameChecked = /libmp3lame/.test(spawnSync(FFMPEG, ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout || '');
    return lameChecked;
}
/** A clip's integrated loudness in LUFS (EBU R128, measured by ffmpeg), or null without ffmpeg. */
function loudness(file) {
    const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
    const m = /Integrated loudness:\s*I:\s*(-?[\d.]+) LUFS/.exec(r.stderr || '');
    return m ? Math.round(Number(m[1]) * 10) / 10 : null;
}
/** Measure every clip's loudness into the manifest (6 November: Kartväktaren was 5 dB louder than Klo). */
function level() {
    const m = readManifest();
    m.lufs = {};
    for (const key of Object.keys(m.clips)) {
        const l = loudness(path.join(OUT, key + '.mp3'));
        if (l === null) throw new Error('ffmpeg is needed to measure ' + key);
        m.lufs[key] = l;
    }
    writeManifest(m);
    const v = Object.values(m.lufs).sort((a, b) => a - b);
    console.log(`measured ${v.length} clips: ${v[0]} to ${v.at(-1)} LUFS, median ${v[Math.floor(v.length / 2)]}`);
}

// ---- recording --------------------------------------------------------------------------------
const API = 'https://api.elevenlabs.io';
const KEY = process.env.ELEVENLABS_API_KEY;
async function api(pathname, init = {}) {
    for (let attempt = 0; ; attempt++) {
        const r = await fetch(API + pathname, { ...init, headers: { 'xi-api-key': KEY, ...(init.headers || {}) } });
        if (r.ok) return r;
        const body = await r.text();
        if ((r.status === 429 || r.status >= 500) && attempt < 4) { await new Promise(res => setTimeout(res, 2000 * 2 ** attempt)); continue; }
        throw new Error(`${pathname}: ${r.status} ${body.slice(0, 300)}`);
    }
}
async function resolveVoices() {
    const r = await (await api('/v2/voices?page_size=100&search=' + encodeURIComponent('Sköldhästen'))).json();
    const ids = { narrator: process.env.SKOLDHAST_NARRATOR_VOICE };
    for (const [role, name] of Object.entries(VOICES)) {
        if (!name) continue;
        const v = r.voices.find(x => x.name === `Sköldhästen – ${name}`);
        if (!v) throw new Error(`no voice named "Sköldhästen – ${name}" in the account`);
        ids[role] = v.voice_id;
    }
    if (!ids.narrator) throw new Error('set SKOLDHAST_NARRATOR_VOICE to the narrator voice id');
    return ids;
}
const words = s => s.toLowerCase().replace(/i stället/g, 'istället').replace(/[^\p{L}\p{N} ]+/gu, ' ').split(/\s+/).filter(Boolean);
/** How much of the line came back from speech-to-text: 1 − word edit distance / length. */
export function match(a, b) {
    const x = words(a), y = words(b), d = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
    for (let j = 1; j <= y.length; j++) d[0][j] = j;
    for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    return 1 - d[x.length][y.length] / Math.max(1, x.length, y.length);
}
/** A directed line is acted more freely: stability 0.35 lets a sigh or a laugh through (section 17.1). */
export const DIRECTED_SETTINGS = Object.freeze({ stability: 0.35 });

/** What is sent for one line: the model, the text (directed or plain) and the settings. Never calls the API. */
export function ttsBody(line, direction = DIRECTION) {
    const d = directionFor(line, direction);
    const body = { text: spoken(d.say), model_id: 'eleven_v4', language_code: 'sv' };
    if (d.directed) body.voice_settings = { ...DIRECTED_SETTINGS };
    return { body, directed: d.directed, say: d.say };
}
async function recordOne(line, voiceId) {
    const { body, directed, say } = ttsBody(line);
    const tts = (format) => api(`/v1/text-to-speech/${voiceId}?output_format=${format}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    // without libmp3lame (Pappa's PC): MP3 straight from ElevenLabs, its length read back by decoding it
    if (!hasLame()) {
        const mp3 = Buffer.from(await (await tts('mp3_44100_64')).arrayBuffer());
        const pcm = spawnSync(FFMPEG, ['-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', '24000', 'pipe:1'], { input: mp3, maxBuffer: 1 << 28 });
        const seconds = pcm.status === 0 ? pcm.stdout.length / 2 / 24000 : mp3.length * 8 / 64000;
        return { mp3, seconds, directed, say };
    }
    const pcm = Buffer.from(await (await tts('pcm_24000')).arrayBuffer());
    const mp3 = spawnSync(FFMPEG, ['-v', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', 'pipe:0',
        '-c:a', 'libmp3lame', '-b:a', '48k', '-f', 'mp3', 'pipe:1'], { input: pcm, maxBuffer: 1 << 28 });
    if (mp3.status !== 0) throw new Error('ffmpeg: ' + mp3.stderr);
    return { mp3: mp3.stdout, seconds: pcm.length / 2 / 24000, directed, say };
}
/** Speech-to-text of a take. A directed take is heard with its audio events (a sigh, a laugh), which are kept out
 *  of the words compared. */
async function heard(mp3, { events = false } = {}) {
    const form = new FormData();
    form.append('model_id', 'scribe_v1');
    form.append('language_code', 'sv');
    form.append('tag_audio_events', events ? 'true' : 'false');
    form.append('file', new Blob([mp3], { type: 'audio/mpeg' }), 'clip.mp3');
    return (await (await api('/v1/speech-to-text', { method: 'POST', body: form })).json()).text || '';
}
/** How a take is judged: the words that came back (audio events left out), and any tag word heard as speech. */
export function judge(line, say, back) {
    const speech = String(back).replace(/[[(][^\])]*[\])]/g, ' ');
    return { score: match(spoken(line.text), speech), tagsHeard: tagWordsHeard(say, line.text, back) };
}

async function record({ only, limit, report, redo, below = 0.9, tries = 3, word = null, pending = false }) {
    if (!KEY) throw new Error('set ELEVENLABS_API_KEY');
    const ids = await resolveVoices();
    const m = readManifest();
    // a retake: lines a report heard below `below` (digits mean the words were right but written as numbers)
    const retake = redo ? new Map(JSON.parse(fs.readFileSync(redo, 'utf8')).filter(l => l.match < below && !/\d/.test(l.heard)).map(l => [l.key, l.match])) : null;
    // a name the voices sometimes blur: retake its lines until it is heard
    const name = word?.toLowerCase();
    const todo = voiceScript({ pending }).filter(l => name ? l.text.toLowerCase().includes(name) : retake ? retake.has(l.key) : !m.clips[l.key] || !fs.existsSync(path.join(OUT, l.key + '.mp3')))
        .filter(l => !only || l.voice === only).slice(0, limit || Infinity);
    console.log(`recording ${todo.length} clips`);
    const log = [];
    let done = 0;
    const entry = (line, best, extra = {}) => ({ key: line.key, voice: line.voice, src: line.src, text: line.text, say: best.say, heard: best.back,
        match: Math.round(best.score * 100) / 100, ...(best.tagsHeard?.length ? { tagsHeard: best.tagsHeard } : {}), ...extra });
    const work = async (line) => {
        let best = null;
        for (let attempt = 0; attempt < tries; attempt++) {
            const clip = await recordOne(line, ids[line.voice]);
            const back = await heard(clip.mp3, { events: clip.directed });
            const { score, tagsHeard } = judge(line, clip.say, back);
            const named = !name || back.toLowerCase().includes(name);
            // a take with a tag spoken aloud is never better than one without (the tag was read as words)
            const clean = !tagsHeard.length;
            const better = !best || (named && !best.named) || (named === best.named && (clean && !best.clean || clean === best.clean && score > best.score));
            if (better) best = { ...clip, back, score, named, tagsHeard, clean };
            if (name ? named : clean && score >= (retake ? 0.99 : 0.8)) break;
        }
        if (name && !best.named) { log.push(entry(line, best, { kept: 'old' })); done++; return; }
        // a retake replaces the clip only when it is heard better
        if (retake && best.score <= retake.get(line.key)) { log.push(entry(line, best, { kept: 'old' })); done++; return; }
        // a directed take whose tag was read aloud keeps the old clip if there is one
        if (!best.clean && m.clips[line.key]) { log.push(entry(line, best, { kept: 'old' })); done++; return; }
        fs.writeFileSync(path.join(OUT, line.key + '.mp3'), best.mp3);
        m.clips[line.key] = Math.round(best.seconds * 100) / 100;
        (m.lufs ||= {})[line.key] = loudness(path.join(OUT, line.key + '.mp3'));
        if (m.lufs[line.key] === null) delete m.lufs[line.key];
        log.push(entry(line, best));
        if (++done % 20 === 0) { writeManifest(m); console.log(`${done}/${todo.length}`); }
    };
    fs.mkdirSync(OUT, { recursive: true });
    const queue = [...todo];
    await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await work(queue.shift()); }));
    writeManifest(m);
    const low = log.filter(l => l.match < 0.8 || l.tagsHeard).sort((a, b) => a.match - b.match);
    console.log(`done: ${done} clips; ${low.length} below 0.8 or with a tag read aloud after three tries`);
    for (const l of low) console.log(`  ${l.match} ${l.voice} ${l.src}${l.tagsHeard ? ' (tag read aloud: ' + l.tagsHeard.join(', ') + ')' : ''}\n    said:  ${l.say}\n    heard: ${l.heard}`);
    if (report) fs.writeFileSync(report, JSON.stringify(log, null, 1));
}

function prune() {
    // clips of a pending adventure are kept too (a line of it may have been recorded on purpose, with --a3)
    const keep = new Set(voiceScript({ pending: true }).map(l => l.key));
    const m = readManifest();
    let removed = 0;
    for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) {
        const k = f.replace(/\.mp3$/, '');
        if (f.endsWith('.mp3') && !keep.has(k)) { fs.rmSync(path.join(OUT, f)); delete m.clips[k]; removed++; }
    }
    for (const k of Object.keys(m.clips)) if (!keep.has(k)) delete m.clips[k];
    writeManifest(m);
    console.log(`removed ${removed} clips no line uses`);
}

function summary(missingOnly, pending = false) {
    const lines = voiceScript({ pending }), m = readManifest();
    const by = {};
    for (const l of lines) {
        const s = by[l.voice] ??= { lines: 0, chars: 0, recorded: 0, seconds: 0 };
        s.lines++; s.chars += l.text.length;
        if (m.clips[l.key]) { s.recorded++; s.seconds += m.clips[l.key]; }
        else if (missingOnly) console.log(`${l.voice.padEnd(8)} ${l.src}: ${l.text}`);
    }
    for (const [v, s] of Object.entries(by)) console.log(`${v.padEnd(9)} ${String(s.lines).padStart(4)} lines ${String(s.chars).padStart(6)} chars  ${s.recorded} recorded, ${(s.seconds / 60).toFixed(1)} min`);
    console.log(`total ${lines.length} lines, ${lines.reduce((n, l) => n + l.text.length, 0)} chars`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
    // --a3: Äventyr 3's lines as well (pending: recorded only when Pappa says the adventure is finished)
    const pending = process.argv.includes('--a3');
    if (pending && process.argv.includes('--record')) console.warn('Recording Äventyr 3 too (--a3). Pappa said: only when the adventure is finished.');
    if (process.argv.includes('--record')) await record({ only: arg('--only'), limit: Number(arg('--limit')) || 0, report: arg('--report'), pending,
        redo: arg('--redo'), below: Number(arg('--below')) || 0.9, word: arg('--word'), tries: Number(arg('--tries')) || (arg('--redo') || arg('--word') ? 6 : 3) });
    else if (process.argv.includes('--prune')) prune();
    else if (process.argv.includes('--level')) level();
    else summary(process.argv.includes('--missing'), pending);
}
