/*
 * Sköldhästen: the recorded voices.
 *
 * Builds the voice script from both adventures' Swedish text (src/content/sv.mjs and
 * adventures/adventure-2/content/sv.mjs), records every line that has no clip yet with
 * ElevenLabs, checks each clip by reading it back with speech-to-text, and writes
 * skoldhast/voice/<key>.mp3 and skoldhast/voice/manifest.json. The game looks a clip up by
 * who speaks and what is shown (src/voice-key.mjs); a line without a clip stays silent.
 * docs/skoldhast/voice-audit.md says what is voiced, by whom, and why.
 *
 *   node scripts/skoldhast-voice.mjs                 # the script: lines, characters and clips per voice
 *   node scripts/skoldhast-voice.mjs --missing       # what is not recorded yet
 *   NODE_USE_ENV_PROXY=1 ELEVENLABS_API_KEY=… SKOLDHAST_NARRATOR_VOICE=<voice id> \
 *     node scripts/skoldhast-voice.mjs --record [--only klo] [--limit 20] [--report out.json]
 *   … --record --redo out.json [--below 0.9] [--tries 5]   # retake what a report heard badly; keep the better clip
 *   node scripts/skoldhast-voice.mjs --prune         # remove clips no line uses, rewrite the manifest
 *   node scripts/skoldhast-voice.mjs --level         # measure every clip's loudness (EBU R128, ffmpeg) into the manifest
 *
 * The characters are the voices named "Sköldhästen – <roll>" in Pappa's ElevenLabs account; the
 * narrator is his own voice, given by id. Recording is Eleven v4 in Swedish, 24 kHz mono, MP3 48 kbit/s.
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
const { splitSentences } = await import(pathToFileURL(path.join(root, 'skoldhast/src/opening-notes.mjs')).href);

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

/** Every voiced line: { key, speaker, text, voice, src }. One entry per key. */
export function voiceScript() {
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
    return [...lines.values()];
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
/** A clip's integrated loudness in LUFS (EBU R128, measured by ffmpeg), or null without ffmpeg. */
function loudness(file) {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
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
async function recordOne(line, voiceId) {
    const r = await api(`/v1/text-to-speech/${voiceId}?output_format=pcm_24000`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spoken(line.text), model_id: 'eleven_v4', language_code: 'sv' })
    });
    const pcm = Buffer.from(await r.arrayBuffer());
    const mp3 = spawnSync('ffmpeg', ['-v', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', 'pipe:0',
        '-c:a', 'libmp3lame', '-b:a', '48k', '-f', 'mp3', 'pipe:1'], { input: pcm, maxBuffer: 1 << 28 });
    if (mp3.status !== 0) throw new Error('ffmpeg: ' + mp3.stderr);
    return { mp3: mp3.stdout, seconds: pcm.length / 2 / 24000 };
}
async function heard(mp3) {
    const form = new FormData();
    form.append('model_id', 'scribe_v1');
    form.append('language_code', 'sv');
    form.append('tag_audio_events', 'false');
    form.append('file', new Blob([mp3], { type: 'audio/mpeg' }), 'clip.mp3');
    return (await (await api('/v1/speech-to-text', { method: 'POST', body: form })).json()).text || '';
}

async function record({ only, limit, report, redo, below = 0.9, tries = 3, word = null }) {
    if (!KEY) throw new Error('set ELEVENLABS_API_KEY');
    const ids = await resolveVoices();
    const m = readManifest();
    // a retake: lines a report heard below `below` (digits mean the words were right but written as numbers)
    const retake = redo ? new Map(JSON.parse(fs.readFileSync(redo, 'utf8')).filter(l => l.match < below && !/\d/.test(l.heard)).map(l => [l.key, l.match])) : null;
    // a name the voices sometimes blur: retake its lines until it is heard
    const name = word?.toLowerCase();
    const todo = voiceScript().filter(l => name ? l.text.toLowerCase().includes(name) : retake ? retake.has(l.key) : !m.clips[l.key] || !fs.existsSync(path.join(OUT, l.key + '.mp3')))
        .filter(l => !only || l.voice === only).slice(0, limit || Infinity);
    console.log(`recording ${todo.length} clips`);
    const log = [];
    let done = 0;
    const work = async (line) => {
        let best = null;
        for (let attempt = 0; attempt < tries; attempt++) {
            const clip = await recordOne(line, ids[line.voice]);
            const back = await heard(clip.mp3);
            const score = match(spoken(line.text), back);
            const named = !name || back.toLowerCase().includes(name);
            if (!best || (named && !best.named) || (named === best.named && score > best.score)) best = { ...clip, back, score, named };
            if (name ? named : score >= (retake ? 0.99 : 0.8)) break;
        }
        if (name && !best.named) { log.push({ key: line.key, voice: line.voice, src: line.src, text: line.text, heard: best.back, match: Math.round(best.score * 100) / 100, kept: 'old' }); done++; return; }
        // a retake replaces the clip only when it is heard better
        if (retake && best.score <= retake.get(line.key)) { log.push({ key: line.key, voice: line.voice, src: line.src, text: line.text, heard: best.back, match: Math.round(best.score * 100) / 100, kept: 'old' }); done++; return; }
        fs.writeFileSync(path.join(OUT, line.key + '.mp3'), best.mp3);
        m.clips[line.key] = Math.round(best.seconds * 100) / 100;
        (m.lufs ||= {})[line.key] = loudness(path.join(OUT, line.key + '.mp3'));
        if (m.lufs[line.key] === null) delete m.lufs[line.key];
        log.push({ key: line.key, voice: line.voice, src: line.src, text: line.text, heard: best.back, match: Math.round(best.score * 100) / 100 });
        if (++done % 20 === 0) { writeManifest(m); console.log(`${done}/${todo.length}`); }
    };
    fs.mkdirSync(OUT, { recursive: true });
    const queue = [...todo];
    await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await work(queue.shift()); }));
    writeManifest(m);
    const low = log.filter(l => l.match < 0.8).sort((a, b) => a.match - b.match);
    console.log(`done: ${done} clips; ${low.length} below 0.8 after three tries`);
    for (const l of low) console.log(`  ${l.match} ${l.voice} ${l.src}\n    said:  ${l.text}\n    heard: ${l.heard}`);
    if (report) fs.writeFileSync(report, JSON.stringify(log, null, 1));
}

function prune() {
    const keep = new Set(voiceScript().map(l => l.key));
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

function summary(missingOnly) {
    const lines = voiceScript(), m = readManifest();
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
    if (process.argv.includes('--record')) await record({ only: arg('--only'), limit: Number(arg('--limit')) || 0, report: arg('--report'),
        redo: arg('--redo'), below: Number(arg('--below')) || 0.9, word: arg('--word'), tries: Number(arg('--tries')) || (arg('--redo') || arg('--word') ? 6 : 3) });
    else if (process.argv.includes('--prune')) prune();
    else if (process.argv.includes('--level')) level();
    else summary(process.argv.includes('--missing'));
}
