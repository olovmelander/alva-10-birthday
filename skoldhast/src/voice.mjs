/*
 * Sköldhästen: the recorded voices, played as the lines are shown (both adventures).
 *
 * A clip is found by who speaks and what is shown (voice-key.mjs) in voice/manifest.json, written
 * by scripts/skoldhast-voice.mjs. A line without a clip stays silent, so what is voiced is decided
 * by the recording script alone (docs/skoldhast/voice-audit.md). Clips are fetched only when a line
 * is about to be shown, never as part of the first download.
 *
 * One voice at a time, three kinds:
 *   'say'       a speech box the reader moves on from: it starts at once, silencing anything else;
 *               the box's tap stops it (ui.mjs). A box waits for a thought or hint that is still
 *               being said to end (asideEnd, up to 6 s), so nobody is cut off mid-sentence.
 * Whatever is stopped fades out over FADE seconds rather than being cut.
 *   'narration' a caption: the same, and the caller may wait for it (`await ui.caption(…)`).
 *   'aside'     a thought, a hint bubble, a joke: only when nobody is speaking, and the same line at
 *               most once every ASIDE_GAP seconds, so feedback that repeats is shown, not nagged.
 * Music is lowered while a clip plays (audio.duckSpeech) and the clip follows the voice volume.
 * Every clip is played at the same loudness (LEVEL): the manifest holds each clip's measured LUFS
 * (6 November: Kartväktaren and his notes were 5 dB louder than Klo, and some of
 * Tukankrabban's lines 6 dB quieter).
 */
import { voiceKey } from './voice-key.mjs';

export const ASIDE_GAP = 20;
const BASE = new URL('../voice/', import.meta.url);
const CACHE = 48;
// A voice never holds the game up: a clip that has not loaded by then is skipped, and one
// that does not report its end (a suspended page) is let go a little after its length.
const LOAD_WAIT = 4, END_SLACK = 1.5;
// a stopped voice fades out this quickly: soft, not a click, and too short to talk over the next one
const FADE = 0.12;
// the loudness every clip is played at (about the clips' median), and how far a clip is ever moved
export const LEVEL = -20.5;
export const levelGain = (lufs) => (typeof lufs === 'number' ? Math.min(2, Math.max(0.45, 10 ** ((LEVEL - lufs) / 20))) : 1);

/**
 * @param {object} o
 * @param {() => any} o.audio  the game's audio engine (createAudio), or null while it loads
 * @param {URL|string} [o.base] where manifest.json and the clips are
 * @param {Function} [o.fetch]
 * @param {() => number} [o.clock] seconds
 */
export function createVoice({ audio = () => null, base = BASE, fetch: get = globalThis.fetch?.bind(globalThis), clock = () => performance.now() / 1000 } = {}) {
    let clips = null, lufs = {}, enabled = true, cur = null;
    const buffers = new Map(), heard = new Map();
    const ready = !get ? Promise.resolve(clips = {}) : get(new URL('manifest.json', base))
        .then(r => (r.ok ? r.json() : null)).then(m => { clips = m?.clips || {}; lufs = m?.lufs || {}; }).catch(() => { clips = {}; });
    // only a running context can be waited for (before the first tap, or in a hidden tab, it is not)
    const engine = () => { const a = audio(); return a?.ctx && a.voiceInput && a.ctx.state !== 'suspended' && a.ctx.state !== 'closed' ? a : null; };

    function seconds(speaker, text) {
        return enabled && clips && text ? clips[voiceKey(speaker, text)] || 0 : 0;
    }
    function buffer(key, ctx) {
        let p = buffers.get(key);
        if (!p) {
            p = get(new URL(key + '.mp3', base)).then(r => (r.ok ? r.arrayBuffer() : null))
                .then(b => b && ctx.decodeAudioData(b)).catch(() => null);
            buffers.set(key, p);
            if (buffers.size > CACHE) buffers.delete(buffers.keys().next().value);
        }
        return p;
    }
    /** Start fetching the clips of lines that are about to be shown. */
    function prefetch(lines) {
        const a = engine();
        if (!a || !enabled || !clips) return;
        for (const [speaker, text] of lines || []) { const key = text && voiceKey(speaker, text); if (key && clips[key]) buffer(key, a.ctx); }
    }
    /** Stop the voice now speaking (only if it is of this kind, when a kind is given). */
    function stop(kind) {
        if (!cur || (kind && cur.kind !== kind)) return;
        const c = cur;
        cur = null;
        const t = audio()?.ctx?.currentTime;
        try {
            if (c.gain && typeof t === 'number') { c.gain.gain.setTargetAtTime(0, t, FADE / 3); c.node.stop(t + FADE); }
            else c.node?.stop();
        } catch { /* not started */ }
        c.finish();
    }
    /** Settles when no thought or hint is being said any more (at once if none is), or after max seconds. */
    function asideEnd(max = 6) {
        if (cur?.kind !== 'aside') return Promise.resolve();
        return Promise.race([cur.done, new Promise(r => setTimeout(r, max * 1000))]);
    }
    /**
     * Speak a shown line. Returns a promise that settles when the clip has ended or been stopped,
     * or null when nothing is said (no clip, voices off, an aside that must wait its turn).
     */
    function play(speaker, text, kind = 'say') {
        const a = engine();
        if (!a || !enabled || !clips || !text) return null;
        const key = voiceKey(speaker, text);
        if (!clips[key]) return null;
        const t = clock();
        if (kind === 'aside') {
            if (cur) return null;
            if (t - (heard.get(key) ?? -Infinity) < ASIDE_GAP) return null;
        } else stop();
        heard.set(key, t);
        let finish;
        const me = { key, kind, node: null, finish: () => finish(), done: new Promise(r => { finish = r; }) };
        cur = me;
        const late = setTimeout(() => { if (cur === me && !me.node) { cur = null; me.finish(); } }, LOAD_WAIT * 1000);
        buffer(key, a.ctx).then((buf) => {
            clearTimeout(late);
            if (cur !== me) return; // stopped, replaced or given up while it loaded
            if (!buf) { cur = null; me.finish(); return; }
            const src = a.ctx.createBufferSource();
            src.buffer = buf;
            // through its own gain, so that stop() can fade it
            const gain = a.ctx.createGain?.();
            // (and at the same loudness as every other clip)
            if (gain) { gain.gain.value = levelGain(lufs[key]); src.connect(gain); gain.connect(a.voiceInput); me.gain = gain; } else src.connect(a.voiceInput);
            src.onended = () => { if (cur === me) cur = null; me.finish(); };
            me.node = src;
            src.start();
            a.duckSpeech?.(buf.duration);
            setTimeout(() => { if (cur === me) cur = null; me.finish(); }, (buf.duration + END_SLACK) * 1000);
        });
        return me.done;
    }
    return {
        play, stop, asideEnd, seconds, prefetch, ready,
        setEnabled(on) { enabled = !!on; if (!enabled) stop(); },
        get speaking() { return cur?.kind || null; }
    };
}
