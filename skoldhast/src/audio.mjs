/*
 * Sköldhästen – sound and music (plan §5.5, §8.5; contract in skoldhast/dev/SPEC.md §5)
 * ---------------------------------------------------------------------------------------
 * Everything is synthesized. Pitched instruments are computed in JavaScript into AudioBuffers
 * (a Karplus-Strong lyre tuned with a fractional-delay allpass, its harmonics, a shell and a
 * plank voice), so their tuning is exact; nothing pitched ever runs through a DelayNode loop.
 * The bowed pad and the sea drone are band-limited oscillators. Effects are rendered in JS on
 * first use (a few variants each, then reused with small random changes).
 *
 *   import { createAudio } from './audio.mjs';
 *   const audio = createAudio({ ctx });   // ctx: the page's AudioContext, or omit to create one
 *   await audio.ready;                     // never rejects; ~0.1–0.3 s of rendering in small slices
 *   audio.resume() / audio.suspend()       // Promises; on gestures / when hidden
 *   audio.setVolumes({ music, sfx, voice })
 *   audio.setArea('table' | 'land' | 'sea' | 'bay' | 'final' | 'quiet')   // crossfades; 'quiet' = no music
 *   audio.setEnvironment('beach' | 'steppe' | 'kelp' | 'bay' | 'table' | null) // null follows area
 *   audio.setMotion({ speed01, underwater, hidden })                      // every frame, allocation-free
 *   audio.stinger(name) → seconds          // aha reveal chapter freeze plask leap unfold discovery
 *   audio.freeze(on)                       // stop dead / start on the next downbeat
 *   audio.sfx(name, opts)                  // see SFX; every effect also takes { gain, pan }
 *   audio.phrase(n, { inst }) → seconds    // first n notes of the theme
 *   audio.note(i, { inst, vel })           // scale degree i (0 = D4) on lyre | shell | plank | bell-free
 *   audio.dispose()                        // stops and disconnects everything; closes only its own ctx
 *
 * The theme, "Sköldhästens visa": D dorian, 6/8, a 16-bar cycle (tune A + answer B). THEME exports
 * tune A for the game (e.g. plank k of Spången plays audio.note(THEME.degrees[k], { inst: 'plank' })).
 * freeze(true) and stinger('freeze') may be called together in either order: the music then runs on
 * under the short reverse swell and everything stops dead at its end. stinger('plask') unfreezes.
 *
 * Graph:  arrangement layers ─► duck ─► freeze gate ─► music low-pass ─► music volume ─┐
 *         (a parallel "wet" chain feeds the reverb)       stingers ─┘                     ├► trim ► compressor ► soft ceiling ► out
 *         effects (pan lanes) ─► sfx volume ─┘   ambience ─► amb low-pass ─► sfx volume ──┤
 *         reverb (ConvolverNode) ─► return ────────────────────────────────────────────────┘
 *
 * Browser support: Chrome, Firefox, Safari 15+ (webkitAudioContext fallback). OfflineAudioContext
 * works too (no timers: the QA script calls audio._tick() from ctx.suspend() callbacks).
 *
 * Lifecycle (plan §8.5): resume() on every gesture while ctx.state !== 'running' (covers iOS
 * "interrupted"), suspend() when the page is hidden. A shared context is never closed. The iOS
 * silent switch is respected on purpose (no navigator.audioSession / <audio> unlock tricks).
 * QA: node scripts/skoldhast-audio-check.mjs · listening page: skoldhast/dev/audio.html
 */

// =============================================================================================
// Music: key, theme, harmony, arrangements
// =============================================================================================

const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const TONIC = 62; // D4

/** Scale degree (0 = D4, 7 = D5, -1 = C4 …) of D dorian → MIDI note number. */
export function degreeToMidi(i) {
    const o = Math.floor(i / 7);
    return TONIC + 12 * o + DORIAN[i - o * 7];
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Tune A (bars 1–8) and its answer B (bars 9–16): [midi, length in eighths]
const TUNE_A = [
    [62, 1], [69, 2], [69, 1], [71, 1], [72, 1], //  D A A B C    the hop up and the dorian climb
    [74, 2], [72, 1], [69, 3], //                     D C A.
    [67, 2], [69, 1], [65, 2], [67, 1], //            G A F G
    [64, 2], [62, 1], [64, 3], //                     E D E.       an open question
    [62, 1], [69, 2], [69, 1], [71, 1], [72, 1], //  D A A B C
    [74, 2], [76, 1], [77, 2], [76, 1], //            D E F E      higher this time
    [74, 2], [72, 1], [69, 1], [71, 1], [72, 1], //  D C A B C
    [74, 6] //                                        D            the answer ("Ja.")
];
const TUNE_B = [
    [77, 3], [76, 2], [72, 1],
    [74, 2], [76, 1], [72, 3],
    [71, 2], [74, 1], [79, 2], [77, 1],
    [76, 3], [69, 3],
    [77, 2], [76, 1], [74, 2], [69, 1],
    [72, 2], [74, 1], [77, 2], [76, 1],
    [74, 2], [71, 1], [69, 2], [72, 1],
    [74, 6]
];

/** The theme as data, for the game (e.g. plank k plays audio.note(THEME.degrees[k])). */
export const THEME = Object.freeze({
    name: 'Sköldhästens visa',
    key: 'D dorian',
    meter: '6/8',
    midi: Object.freeze(TUNE_A.map((n) => n[0])),
    eighths: Object.freeze(TUNE_A.map((n) => n[1])),
    degrees: Object.freeze(TUNE_A.map((n) => midiToDegree(n[0])))
});
function midiToDegree(m) {
    const rel = m - TONIC;
    const o = Math.floor(rel / 12);
    const d = DORIAN.indexOf(rel - 12 * o);
    return d < 0 ? 0 : o * 7 + d;
}

// Chords: bass, arpeggio tones, strum voicing, pad voicing (MIDI)
const CHORDS = {
    Dm: { bass: 50, tones: [50, 57, 62, 65], strum: [50, 57, 62, 65, 69], pad: [57, 62, 65] },
    F: { bass: 53, tones: [53, 60, 65, 69], strum: [53, 60, 65, 69, 72], pad: [57, 60, 65] },
    G: { bass: 55, tones: [55, 62, 67, 71], strum: [55, 62, 67, 71, 74], pad: [59, 62, 67] },
    Am: { bass: 45, tones: [45, 57, 60, 64], strum: [45, 52, 57, 60, 64], pad: [57, 60, 64] },
    C: { bass: 48, tones: [48, 55, 60, 64], strum: [48, 55, 60, 64, 67], pad: [55, 60, 64] },
    D: { bass: 50, tones: [50, 57, 62, 66], strum: [50, 57, 62, 66, 69], pad: [57, 62, 66] }
};
// One chord per bar; bar 7 is split (Am | G). The final arrangement ends the cycle on D major.
const PROG = ['Dm', 'F', 'G', 'Am', 'Dm', 'C', 'Am', 'Dm', 'F', 'C', 'G', 'Am', 'Dm', 'F', 'G', 'Dm'];
const BAR_STEPS = 6;
const CYCLE_BARS = 16;
const CYCLE_STEPS = BAR_STEPS * CYCLE_BARS;

// Phrase dynamics per bar (a swell toward bar 6 of each tune, easing into the cadences) and the
// canter lilt: the short eighth after each beat lands a little late (seconds at 80 bpm, scaled)
const BAR_DYN = [0.92, 0.95, 0.9, 0.85, 0.95, 1, 0.97, 0.9, 0.95, 0.93, 0.97, 0.88, 0.96, 1, 0.95, 0.88];
const LILT = [0, 0.004, 0.009, 0, 0.004, 0.009];
// Precomputed step tables for the 16-bar cycle (no allocation while scheduling)
const MEL_MIDI = new Int16Array(CYCLE_STEPS).fill(-1);
const MEL_LEN = new Int8Array(CYCLE_STEPS);
(function buildMelody() {
    let s = 0;
    for (const [m, len] of TUNE_A.concat(TUNE_B)) {
        MEL_MIDI[s] = m;
        MEL_LEN[s] = len;
        s += len;
    }
})();
function chordNameAt(bar, pos, picardy) {
    if (bar === 6 && pos >= 3) return 'G';
    if (picardy && bar === 15) return 'D';
    return PROG[bar];
}

// Arrangements. Levels are linear layer gains; `send` is the reverb send of the layer.
const ARR = {
    table: {
        bpm: 66, underLP: 900, drone: 0,
        mel: { inst: 'lyre', level: 0.95, mode: 'full', send: 0.26 },
        acc: { mode: 'sparse', level: 1.1, send: 0.22, lp: 2800 },
        harm: { mode: 'echo', level: 0.9, send: 0.5 },
        tex: { level: 1.3, send: 0.08 }
    },
    land: {
        bpm: 80, underLP: 750, drone: 0,
        mel: { inst: 'lyre', level: 1, mode: 'full', send: 0.22 },
        acc: { mode: 'adaptive', level: 0.85, send: 0.18, lp: 2000 },
        pad: { level: 0.55, lp: 2200, attack: 0.45, send: 0.3 },
        drum: { level: 0.9, send: 0.1 }
    },
    sea: {
        bpm: 54, underLP: 2400, drone: 0.85,
        mel: { inst: 'harm', level: 1, mode: 'sparse', send: 0.55 },
        acc: { mode: 'sea', level: 1.2, send: 0.35 },
        pad: { level: 1, lp: 950, attack: 1.1, send: 0.45 }
    },
    bay: {
        bpm: 58, underLP: 1300, drone: 0.2,
        mel: { inst: 'lyre', level: 0.8, mode: 'sparse', send: 0.34 },
        acc: { mode: 'arp-soft', level: 0.7, send: 0.3, lp: 2200 },
        pad: { level: 0.5, lp: 1200, attack: 0.9, send: 0.4 },
        harm: { mode: 'double', level: 0.4, send: 0.55 }
    },
    final: {
        bpm: 84, underLP: 1000, drone: 0.25, picardy: true,
        mel: { inst: 'lyre', level: 1, mode: 'full', send: 0.22 },
        acc: { mode: 'strum', level: 0.75, send: 0.18, lp: 2200 },
        pad: { level: 0.55, lp: 3000, attack: 0.35, send: 0.3 },
        drum: { level: 0.95, min: 0.62, send: 0.1 },
        harm: { mode: 'double', level: 0.45, send: 0.45 }
    }
};
const LAYERS = ['mel', 'acc', 'pad', 'drum', 'harm', 'tex'];
const LAYER_PAN = { mel: 0, acc: -0.22, pad: 0, drum: 0.12, harm: 0.3, tex: -0.35 };

// Accompaniment and drum patterns: flat [pos, what, velocity] triples (pos in eighths)
const ARP = [0, -1, 0.5, 1, 1, 0.3, 2, 2, 0.32, 3, 3, 0.36, 4, 2, 0.3, 5, 1, 0.28]; // what: -1 bass, n tone
const ARP_SOFT = [0, -1, 0.45, 2, 2, 0.26, 4, 3, 0.22];
const STRUM_FULL = [0, 1, 0.8, 2, -1, 0.3, 3, 1, 0.58, 5, -1, 0.4]; // what: 1 down, -1 up
const STRUM_HALF = [0, 1, 0.66, 3, 1, 0.44];
const DRUMS = [
    [],
    [0, 'boom', 0.6, 3, 'tone', 0.34],
    [0, 'boom', 0.85, 2, 'tick', 0.4, 3, 'tone', 0.6, 5, 'tick', 0.45],
    [0, 'boom', 1, 1, 'ghost', 0.28, 2, 'tick', 0.55, 3, 'boom', 0.72, 4, 'ghost', 0.3, 5, 'tick', 0.6, 5.5, 'ghost', 0.26]
];
const FILL = [4, 'tone', 0.34, 4.5, 'tone', 0.42, 5, 'tone', 0.52, 5.5, 'tone', 0.64];

export const AREAS = Object.freeze(['table', 'land', 'sea', 'bay', 'final', 'quiet']);
export const STINGERS = Object.freeze(['aha', 'reveal', 'chapter', 'freeze', 'plask', 'leap', 'unfold', 'discovery']);
export const SFX = Object.freeze(['hoof', 'splash', 'drip', 'shake', 'bubble', 'swim', 'pencil', 'rustle', 'unfold',
    'crabclick', 'neigh', 'blubb', 'snort', 'stamp', 'gull', 'wind', 'whoosh', 'thud', 'latch', 'ratchet', 'gate', 'pop',
    'page', 'pickup', 'colorin', 'sparkle', 'stopwatch', 'write', 'ui', 'crabvoice']);
export const SURFACES = Object.freeze(['sand', 'wetsand', 'plank', 'pier', 'grass', 'rock', 'shallow']);
export const ENVIRONMENTS = Object.freeze(['beach', 'steppe', 'kelp', 'bay', 'table']);
// other names the world uses for what is underfoot
const SURFACE_ALIAS = { wood: 'plank', spangen: 'pier', cream: 'plank', seabed: 'wetsand', earth: 'grass', paper: 'grass', glass: 'rock', stone: 'rock', water: 'shallow' };
const VOICE_SFX = new Set(['crabvoice', 'neigh', 'blubb', 'snort']);
export const INSTRUMENTS = Object.freeze(['lyre', 'shell', 'plank', 'bell-free']);

// =============================================================================================
// DSP toolkit (pure JavaScript on Float32Arrays; no WebAudio needed)
// =============================================================================================

const TAU = Math.PI * 2;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};

function mulberry32(seed) {
    let a = seed >>> 0;
    return function rand() {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
}
const buf = (fs, sec) => new Float32Array(Math.max(1, Math.round(sec * fs)));
const rr = (rng, a, b) => a + (b - a) * rng();

// RBJ cookbook biquad, applied in place (transposed direct form II)
function bqCoefs(type, f, q, fs, gainDb = 0) {
    const w = (TAU * Math.min(f, fs * 0.45)) / fs;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const alpha = sw / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let b0;
    let b1;
    let b2;
    let a0;
    let a1;
    let a2;
    if (type === 'lp') {
        b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    } else if (type === 'hp') {
        b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    } else if (type === 'bp') {
        b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    } else if (type === 'peak') {
        b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
    } else { // 'hs' high shelf
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) + (A - 1) * cw + s);
        b1 = -2 * A * ((A - 1) + (A + 1) * cw);
        b2 = A * ((A + 1) + (A - 1) * cw - s);
        a0 = (A + 1) - (A - 1) * cw + s;
        a1 = 2 * ((A - 1) - (A + 1) * cw);
        a2 = (A + 1) - (A - 1) * cw - s;
    }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function biquad(x, c, from = 0, to = x.length) {
    const b0 = c[0];
    const b1 = c[1];
    const b2 = c[2];
    const a1 = c[3];
    const a2 = c[4];
    let z1 = 0;
    let z2 = 0;
    for (let i = from; i < to; i++) {
        const xi = x[i];
        const y = b0 * xi + z1;
        z1 = b1 * xi - a1 * y + z2;
        z2 = b2 * xi - a2 * y;
        x[i] = y;
    }
    return x;
}
const filt = (x, fs, type, f, q = 0.707, g = 0) => biquad(x, bqCoefs(type, f, q, fs, g));

// Topology-preserving state-variable filter; the cutoff may follow a function of time (seconds).
// mode 0 = low-pass, 1 = band-pass (unity peak), 2 = high-pass
function svf(x, fs, fc, q, mode, from = 0, to = x.length) {
    const k = 1 / q;
    const fn = typeof fc === 'function' ? fc : null;
    let ic1 = 0;
    let ic2 = 0;
    let a1 = 0;
    let a2 = 0;
    let a3 = 0;
    for (let i = from; i < to; i++) {
        if (((i - from) & 15) === 0) {
            const f = fn ? fn((i - from) / fs) : fc;
            const g = Math.tan((Math.PI * clamp(f, 10, fs * 0.45)) / fs);
            a1 = 1 / (1 + g * (g + k));
            a2 = g * a1;
            a3 = g * a2;
        }
        const v0 = x[i];
        const v3 = v0 - ic2;
        const v1 = a1 * ic1 + a2 * v3;
        const v2 = ic2 + a2 * ic1 + a3 * v3;
        ic1 = 2 * v1 - ic1;
        ic2 = 2 * v2 - ic2;
        x[i] = mode === 0 ? v2 : mode === 1 ? k * v1 : v0 - k * v1 - v2;
    }
    return x;
}
// one-pole low-pass run forwards and backwards (zero phase), used to soften excitations
function softenZP(x, fs, fc) {
    const a = Math.exp((-TAU * fc) / fs);
    let y = 0;
    for (let i = 0; i < x.length; i++) x[i] = y = (1 - a) * x[i] + a * y;
    y = 0;
    for (let i = x.length - 1; i >= 0; i--) x[i] = y = (1 - a) * x[i] + a * y;
    return x;
}
function dcBlock(x, fs, fc = 18) {
    const R = 1 - (TAU * fc) / fs;
    let px = 0;
    let py = 0;
    for (let i = 0; i < x.length; i++) {
        const y = x[i] - px + R * py;
        px = x[i];
        x[i] = py = y;
    }
    return x;
}
function fadeIn(x, fs, sec) {
    const n = Math.min(x.length, Math.round(sec * fs));
    for (let i = 0; i < n; i++) x[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    return x;
}
function fadeOut(x, fs, sec) {
    const n = Math.min(x.length, Math.round(sec * fs));
    const s = x.length - n;
    for (let i = 0; i < n; i++) x[s + i] *= 0.5 + 0.5 * Math.cos((Math.PI * (i + 1)) / n);
    return x;
}
function peakOf(x) {
    let p = 0;
    for (let i = 0; i < x.length; i++) {
        const a = x[i] < 0 ? -x[i] : x[i];
        if (a > p) p = a;
    }
    return p;
}
function scaleTo(x, target, measured) {
    if (measured > 1e-9) {
        const g = target / measured;
        for (let i = 0; i < x.length; i++) x[i] *= g;
    }
    return x;
}
function rmsOf(x, from = 0, to = x.length) {
    let s = 0;
    to = Math.min(to, x.length);
    for (let i = from; i < to; i++) s += x[i] * x[i];
    return Math.sqrt(s / Math.max(1, to - from));
}
function mixInto(dst, src, at = 0, g = 1) {
    const n = Math.min(src.length, dst.length - at);
    for (let i = 0; i < n; i++) dst[at + i] += src[i] * g;
    return dst;
}
function white(n, rng) {
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = rng() * 2 - 1;
    return x;
}
function pink(n, rng) {
    const x = new Float32Array(n);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < n; i++) {
        const w = rng() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        x[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
    return x;
}
function brown(n, rng) {
    const x = new Float32Array(n);
    let y = 0;
    for (let i = 0; i < n; i++) {
        y = 0.995 * y + (rng() * 2 - 1) * 0.1;
        x[i] = y * 1.8;
    }
    return x;
}
// crackle: sparse grains of random size, each decaying over `decay` seconds
function grains(n, fs, rng, ratePerSec, decay, floor = 0) {
    const x = new Float32Array(n);
    const p = ratePerSec / fs;
    const d = Math.exp(-1 / (decay * fs));
    let lvl = 0;
    for (let i = 0; i < n; i++) {
        if (rng() < p) lvl = 0.25 + 0.75 * rng();
        else lvl *= d;
        x[i] = floor + lvl;
    }
    return x;
}
// attack/decay envelope (linear attack, exponential decay with time constant tau)
const envAD = (t, a, tau) => (t < a ? t / a : Math.exp(-(t - a) / tau));
// Sample a control function of time every 16 samples; linear in between (cheap, click-free)
function ctl(n, fs, fn, B = 16) {
    const out = new Float32Array(n);
    let prev = fn(0);
    for (let i = 0; i < n; i += B) {
        const m = Math.min(B, n - i);
        const next = fn((i + m) / fs);
        const d = (next - prev) / m;
        for (let j = 0; j < m; j++) out[i + j] = prev + d * j;
        prev = next;
    }
    return out;
}
// A sine with frequency f (Hz or f(t)) and amplitude e (number or e(t)), added into `out` at t0.
// Rotation oscillator: the controls are evaluated every 16 samples, the phase stays continuous.
function addTone(out, fs, t0, dur, f, e, ph = 0) {
    const i0 = Math.round(t0 * fs);
    const n = Math.min(Math.round(dur * fs), out.length - i0);
    if (n <= 0) return out;
    const ff = typeof f === 'function' ? f : null;
    const ef = typeof e === 'function' ? e : null;
    let s = Math.sin(ph);
    let c = Math.cos(ph);
    let eA = ef ? ef(0) : e;
    for (let b = 0; b < n; b += 16) {
        const m = Math.min(16, n - b);
        const w = (TAU * (ff ? ff((b + m * 0.5) / fs) : f)) / fs;
        const cw = Math.cos(w);
        const sw = Math.sin(w);
        const eB = ef ? ef((b + m) / fs) : e;
        const de = (eB - eA) / m;
        let a = eA;
        const o = i0 + b;
        for (let j = 0; j < m; j++) {
            out[o + j] += s * a;
            const ns = s * cw + c * sw;
            c = c * cw - s * sw;
            s = ns;
            a += de;
        }
        eA = eB;
        const r = 1 / Math.sqrt(s * s + c * c);
        s *= r;
        c *= r;
    }
    return out;
}
// damped modes [[freq, amp, tau], ...] (fixed frequency: a recursive oscillator per mode)
function addModes(out, fs, t0, modes, attack = 0.0008) {
    const i0 = Math.round(t0 * fs);
    for (const [f, a, tau] of modes) {
        const n = Math.min(Math.round(tau * 7 * fs), out.length - i0);
        const w = (TAU * f) / fs;
        const k2 = 2 * Math.cos(w);
        const d = Math.exp(-1 / (tau * fs));
        const na = Math.max(1, Math.round(attack * fs));
        let y1 = -Math.sin(w); // sin(w n) at n = -1
        let y2 = -Math.sin(2 * w); // … and at n = -2
        let env = a;
        for (let i = 0; i < n; i++) {
            const y = k2 * y1 - y2;
            y2 = y1;
            y1 = y;
            out[i0 + i] += y * env * (i < na ? i / na : 1);
            env *= d;
        }
    }
    return out;
}
// band-limited noise burst added into out; tau is a decay time constant or an envelope e(t)
function addNoise(out, fs, rng, t0, dur, { mode = 1, fc = 1000, q = 0.8, amp = 1, attack = 0.002, tau = 0.05, grain = null, src = null } = {}) {
    const i0 = Math.round(t0 * fs);
    const n = Math.min(Math.round(dur * fs), out.length - i0);
    if (n <= 0) return out;
    const x = src ? src.subarray(0, n) : white(n, rng);
    if (grain) {
        const g = grains(n, fs, rng, grain[0], grain[1], grain[2] || 0);
        for (let i = 0; i < n; i++) x[i] *= g[i];
    }
    svf(x, fs, fc, q, mode);
    const ef = typeof tau === 'function' ? tau : null;
    const na = Math.max(1, Math.round(attack * fs));
    const d = ef ? 1 : Math.exp(-1 / (tau * fs));
    const env = ef ? ctl(n, fs, ef) : null;
    const nf = Math.min(n, Math.round(0.004 * fs));
    let e = 1;
    for (let i = 0; i < n; i++) {
        let a;
        if (env) a = env[i];
        else if (i < na) a = i / na;
        else {
            a = e;
            e *= d;
        }
        if (i >= n - nf) a *= (n - i) / nf;
        out[i0 + i] += x[i] * a * amp;
    }
    return out;
}
// a water drop: a sine whose pitch rises quickly (the bubble resonance)
function addDrip(out, fs, t0, f1, f2, amp, len = 0.06, rise = 0.018) {
    const r = Math.log(f2 / f1) / rise;
    addTone(out, fs, t0, len * 1.6, (t) => (t < rise ? f1 * Math.exp(r * t) : f2), (t) => amp * envAD(t, 0.0015, len / 4.5));
    return out;
}
// A glottal/syrinx-like harmonic source (Chebyshev recurrence, band-limited). f0 and amp are
// functions of time, sampled every 16 samples; harmonic k gets k^-tilt, fading out above `top` Hz.
function harmonicSource(out, fs, t0, dur, f0, amp, { tilt = 1, top = 9000, maxK = 40 } = {}) {
    const i0 = Math.round(t0 * fs);
    const n = Math.min(Math.round(dur * fs), out.length - i0);
    if (n <= 0) return out;
    const base = new Float32Array(maxK + 1);
    for (let k = 1; k <= maxK; k++) base[k] = Math.pow(k, -tilt);
    const wk = new Float32Array(maxK + 1);
    let s = 0;
    let c = 1;
    let aA = amp(0);
    for (let b = 0; b < n; b += 16) {
        const m = Math.min(16, n - b);
        const f = f0((b + m * 0.5) / fs);
        const aB = amp((b + m) / fs);
        const w = (TAU * f) / fs;
        const cw = Math.cos(w);
        const sw = Math.sin(w);
        const kTop = Math.min(maxK, Math.floor((fs * 0.45) / f));
        for (let k = 1; k <= kTop; k++) {
            const fk = k * f;
            wk[k] = base[k] * (fk < top ? 1 : fk < top * 1.3 ? 1 - (fk - top) / (top * 0.3) : 0);
        }
        const da = (aB - aA) / m;
        let a = aA;
        for (let j = 0; j < m; j++) {
            const ns = s * cw + c * sw;
            c = c * cw - s * sw;
            s = ns;
            if (a !== 0) {
                const c2 = 2 * c;
                let sk = s;
                let skm = 0;
                let acc = 0;
                for (let k = 1; k <= kTop; k++) {
                    acc += wk[k] * sk;
                    const nx = c2 * sk - skm;
                    skm = sk;
                    sk = nx;
                }
                out[i0 + b + j] += acc * a;
            }
            a += da;
        }
        aA = aB;
        const r = 1 / Math.sqrt(s * s + c * c);
        s *= r;
        c *= r;
    }
    return out;
}
// Smooth random curve (for jitter): values in -1..1 changing at about `rate` Hz
function wobble(rng, rate) {
    let t0 = 0;
    let a = rng() * 2 - 1;
    let b = rng() * 2 - 1;
    return (t) => {
        while (t - t0 > 1 / rate) {
            t0 += 1 / rate;
            a = b;
            b = rng() * 2 - 1;
        }
        const u = (t - t0) * rate;
        return lerp(a, b, u * u * (3 - 2 * u));
    };
}
// loop a buffer seamlessly: render n + xf samples, then fold the tail over the head (equal power)
function foldLoop(x, xf) {
    const n = x.length - xf;
    const y = x.slice(0, n);
    for (let i = 0; i < xf; i++) {
        const u = i / xf;
        y[i] = x[i] * Math.sin((u * Math.PI) / 2) + x[n + i] * Math.cos((u * Math.PI) / 2);
    }
    return y;
}

// ---------------------------------------------------------------------------------------------
// The Karplus-Strong string (extended: linear-phase damping FIR + exact fractional-delay allpass)
// ---------------------------------------------------------------------------------------------
// Loop: s[n] = exc[n] + rho * AP(FIR(s[n - L])). FIR = [p, 1-2p, p] (delay exactly 1),
// AP = first-order allpass with phase delay D at f0, so the period is exactly L + 1 + D = fs / f0.
function ksString(fs, f0, dur, o, exc) {
    const n = Math.round(dur * fs);
    const out = new Float32Array(n);
    const N = fs / f0;
    const L = Math.floor(N - 1.2);
    const D = N - 1 - L; // 0.2 … 1.2
    const w0 = (TAU * f0) / fs;
    const C = Math.sin(((1 - D) * w0) / 2) / Math.sin(((1 + D) * w0) / 2);
    const p = o.p;
    const q = 1 - 2 * p;
    const H = q + 2 * p * Math.cos(w0);
    let rho = Math.pow(10, -3 / (f0 * o.t60)) / H;
    if (rho > 0.99997) rho = 0.99997;
    const E = exc.length;
    let d0 = 0;
    let d1 = 0;
    let d2 = 0;
    let apx = 0;
    let apy = 0;
    for (let i = 0; i < n; i++) {
        const a = i - L;
        d2 = d1;
        d1 = d0;
        d0 = a >= 0 ? out[a] : 0;
        const f = p * d0 + q * d1 + p * d2;
        const y = C * f + apx - C * apy;
        apx = f;
        apy = y;
        out[i] = (i < E ? exc[i] : 0) + rho * y;
    }
    return out;
}
function pluckExcitation(fs, f0, rng, { pos = 0.18, noise = 0.35, soft = 4000 } = {}) {
    const E = Math.max(4, Math.round(fs / f0));
    const e = new Float32Array(E);
    for (let i = 0; i < E; i++) {
        const u = (i + 0.5) / E;
        const tri = u < pos ? u / pos : (1 - u) / (1 - pos);
        e[i] = (1 - noise) * tri + noise * (rng() * 2 - 1) * 0.7;
    }
    softenZP(e, fs, soft);
    let m = 0;
    for (let i = 0; i < E; i++) m += e[i];
    m /= E;
    for (let i = 0; i < E; i++) e[i] -= m;
    return e;
}
const LYRE_BODY = [['peak', 190, 0.9, 4.5], ['peak', 440, 1.1, 2.5], ['peak', 1100, 1.4, 1], ['hs', 3100, 0.7, -7], ['hp', 65, 0.7, 0]];

function renderLyre(fs, midi, rng, { dur = 1.6 } = {}) {
    const f0 = mtof(midi);
    const t60 = 3.05 * Math.pow(150 / f0, 0.3);
    const p = 0.135 * Math.min(1, Math.pow(650 / f0, 1.4));
    const exc = pluckExcitation(fs, f0, rng, { pos: rr(rng, 0.20, 0.27), noise: 0.23, soft: 4100 });
    const x = ksString(fs, f0, dur, { t60, p }, exc);
    // A small wooden soundboard bloom, below the string rather than a second detuned note.
    const body = peakOf(x) * 0.065;
    addModes(x, fs, 0.003, [[183, body, 0.028], [367, body * 0.5, 0.018]], 0.003);
    addNoise(x, fs, rng, 0, 0.015, { fc: 1700, q: 0.7, amp: 0.018, attack: 0.001, tau: 0.003 });
    for (const [type, f, q, g] of LYRE_BODY) filt(x, fs, type, f, q, g);
    dcBlock(x, fs);
    fadeIn(x, fs, 0.0015);
    fadeOut(x, fs, 0.28);
    const lowComp = midi < 55 ? 1.25 : midi < 60 ? 1.1 : 1;
    return scaleTo(x, 0.1 * lowComp, rmsOf(x, 0, Math.round(0.3 * fs)));
}
// Lyre harmonic (flageolet): the string touched at its middle — an almost pure, glassy tone.
function renderHarm(fs, midi, rng, { dur = 2.0 } = {}) {
    const f0 = mtof(midi);
    const E = Math.max(4, Math.round(fs / f0));
    const exc = new Float32Array(E);
    const ph2 = rng() * TAU;
    for (let i = 0; i < E; i++) {
        const u = (TAU * i) / E;
        exc[i] = Math.sin(u) + 0.18 * Math.sin(2 * u + ph2) + 0.06 * Math.sin(3 * u);
    }
    const x = ksString(fs, f0, dur, { t60: 3.2 * Math.pow(440 / f0, 0.25), p: 0.012 }, exc);
    addNoise(x, fs, rng, 0, 0.014, { fc: 1900, q: 0.8, amp: 0.012, attack: 0.001, tau: 0.003 });
    filt(x, fs, 'hp', 80, 0.7);
    dcBlock(x, fs);
    fadeIn(x, fs, 0.0035);
    fadeOut(x, fs, 0.45);
    return scaleTo(x, 0.085, rmsOf(x, 0, Math.round(0.3 * fs)));
}
// A shell rung by a falling drop: dark, hollow ring with a small drop "plip" on top
function renderShell(fs, midi, rng) {
    const f0 = mtof(midi);
    const E = Math.max(4, Math.round(fs / f0));
    const exc = new Float32Array(E);
    const w = Math.max(3, Math.round(E * 0.35));
    for (let i = 0; i < w; i++) exc[i] = Math.sin((Math.PI * i) / w);
    for (let i = 0; i < E; i++) exc[i] += (rng() * 2 - 1) * 0.06;
    softenZP(exc, fs, 3000);
    const x = ksString(fs, f0, 1.3, { t60: 1.0 * Math.pow(440 / f0, 0.3), p: 0.2 }, exc);
    const hollow = x.slice();
    filt(hollow, fs, 'bp', f0 * 2, 5);
    mixInto(x, hollow, 0, 0.9);
    const drop = new Float32Array(x.length);
    const pk = peakOf(x);
    addDrip(drop, fs, 0, rr(rng, 1300, 1700), rr(rng, 2300, 2900), pk * 0.12, 0.05);
    mixInto(x, drop);
    filt(x, fs, 'hp', 90, 0.7);
    dcBlock(x, fs);
    fadeIn(x, fs, 0.001);
    fadeOut(x, fs, 0.3);
    return scaleTo(x, 0.1, rmsOf(x, 0, Math.round(0.25 * fs)));
}
// A tuned hollow plank (Spången): a short, dark, knocked string over a wooden body
function renderPlank(fs, midi, rng) {
    const f0 = mtof(midi);
    const exc = pluckExcitation(fs, f0, rng, { pos: 0.5, noise: 0.6, soft: 2400 });
    const x = ksString(fs, f0, 0.8, { t60: 0.55 * Math.pow(300 / f0, 0.2), p: 0.2 }, exc);
    const body = new Float32Array(x.length);
    addModes(body, fs, 0, [[rr(rng, 140, 155), 0.1, 0.025]]);
    addNoise(body, fs, rng, 0, 0.04, { fc: 1100, q: 2.2, amp: 0.3, attack: 0.0008, tau: 0.005 });
    const pk = peakOf(x);
    mixInto(x, body, 0, pk * 0.8);
    for (const [type, f, q, g] of [['peak', 250, 1.2, 3], ['hs', 3000, 0.7, -6], ['hp', 80, 0.7, 0]]) filt(x, fs, type, f, q, g);
    dcBlock(x, fs);
    fadeIn(x, fs, 0.0008);
    fadeOut(x, fs, 0.2);
    return scaleTo(x, 0.12, rmsOf(x, 0, Math.round(0.2 * fs)));
}
const INST_RENDER = { lyre: renderLyre, harm: renderHarm, shell: renderShell, plank: renderPlank };

// ---------------------------------------------------------------------------------------------
// Hand drum (the hoofbeats of the music): membrane modes + skin noise
// ---------------------------------------------------------------------------------------------
const MEMBRANE = [1, 1.59, 2.14, 2.3, 2.65, 2.92];
function renderDrum(fs, kind, rng) {
    const x = buf(fs, kind === 'boom' ? 0.9 : kind === 'tone' ? 0.6 : 0.3);
    if (kind === 'boom' || kind === 'tone') {
        const f1 = kind === 'boom' ? rr(rng, 84, 92) : rr(rng, 158, 172);
        const drop = kind === 'boom' ? 1.28 : 1.1;
        const decay = kind === 'boom' ? 0.19 : 0.16;
        MEMBRANE.forEach((r, k) => {
            const a = [1, 0.55, 0.38, 0.3, 0.2, 0.14][k] * (kind === 'tone' ? 1 : 0.85);
            const tau = (decay / (1 + k * 0.9)) * rr(rng, 0.9, 1.1);
            addTone(x, fs, 0, tau * 7, (t) => f1 * r * (1 + (drop - 1) * Math.exp(-t / 0.035)), (t) => a * envAD(t, 0.0012, tau), rng() * TAU);
        });
        addNoise(x, fs, rng, 0, 0.05, { fc: kind === 'boom' ? 700 : 1300, q: 0.9, amp: 0.5, attack: 0.0005, tau: 0.009 });
        addNoise(x, fs, rng, 0, 0.02, { mode: 2, fc: 3000, q: 0.7, amp: 0.1, attack: 0.0003, tau: 0.003 });
        addModes(x, fs, 0, kind === 'boom' ? [[rr(rng, 300, 330), 0.22, 0.03], [rr(rng, 520, 560), 0.1, 0.02]] : [[rr(rng, 480, 520), 0.16, 0.025]]);
    } else {
        const soft = kind === 'ghost';
        addNoise(x, fs, rng, 0, 0.08, { fc: rr(rng, 2000, 2500), q: 1.6, amp: soft ? 0.5 : 0.8, attack: 0.0006, tau: soft ? 0.012 : 0.018 });
        addModes(x, fs, 0, [[rr(rng, 680, 720), 0.25, 0.012], [rr(rng, 1150, 1250), 0.16, 0.008], [1650, 0.1, 0.006]]);
    }
    filt(x, fs, 'hp', 40, 0.7);
    dcBlock(x, fs);
    fadeIn(x, fs, 0.0006);
    fadeOut(x, fs, kind === 'boom' ? 0.25 : 0.08);
    return scaleTo(x, kind === 'ghost' ? 0.35 : 0.8, peakOf(x));
}

// ---------------------------------------------------------------------------------------------
// Reverb impulse: early reflections + a diffuse tail that darkens as it decays (stereo)
// ---------------------------------------------------------------------------------------------
function renderReverb(fs, rng, { seconds = 1.85, t60 = 1.45, pre = 0.016 } = {}) {
    const n = Math.round(seconds * fs);
    const out = [new Float32Array(n), new Float32Array(n)];
    for (let c = 0; c < 2; c++) {
        const d = out[c];
        const p0 = Math.round(pre * fs);
        for (let k = 0; k < 12; k++) {
            const t = pre + 0.003 + rng() * 0.075;
            const i = Math.round(t * fs);
            if (i < n) d[i] += (rng() < 0.5 ? -1 : 1) * 0.7 * Math.exp(-t * 22);
        }
        let lp = 0;
        let a = 0;
        let env = 1.4;
        const dec = Math.exp(-6.9078 / (t60 * fs));
        const ramp = 0.025 * fs;
        for (let i = p0; i < n; i++) {
            const j = i - p0;
            if ((j & 31) === 0) a = Math.exp((-TAU * (1500 + 6500 * Math.exp(-j / fs / 0.3))) / fs);
            lp = (1 - a) * (rng() * 2 - 1) + a * lp;
            d[i] += lp * env * (j < ramp ? j / ramp : 1);
            env *= dec;
        }
        fadeOut(d, fs, 0.2);
    }
    let e = 0;
    for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) e += out[c][i] * out[c][i];
    const g = Math.sqrt(1 / (e / 2));
    for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) out[c][i] *= g;
    return out;
}

// =============================================================================================
// Effects (rendered in JS; each returns { ch: [mono] | [L, R], send, musical? })
// =============================================================================================

// --- hooves -----------------------------------------------------------------------------------
function renderHoof(fs, rng, surface, speed) {
    const x = buf(fs, surface === 'pier' ? 0.55 : 0.38);
    const hard = 0.55 + 0.45 * speed;
    const toe = rr(rng, 0.012, 0.022) * (1.1 - speed * 0.35);
    const thump = (f, a, tau) => addTone(x, fs, 0, tau * 7, (t) => f * (1 + 0.35 * Math.exp(-t / 0.02)), (t) => a * envAD(t, 0.0015, tau), rng() * TAU);
    switch (surface) {
        case 'wetsand':
            thump(rr(rng, 85, 100), 0.6, 0.045);
            addNoise(x, fs, rng, 0.002, 0.16, { mode: 1, fc: (t) => 950 - 2600 * t, q: 2.2, amp: 0.45 * hard, attack: 0.004, tau: 0.035 });
            addNoise(x, fs, rng, 0, 0.05, { mode: 0, fc: 700, q: 0.7, amp: 0.35, attack: 0.001, tau: 0.012 });
            break;
        case 'plank':
            addModes(x, fs, 0, [[rr(rng, 230, 252), 0.5, 0.042], [rr(rng, 510, 550), 0.27, 0.025], [rr(rng, 1060, 1150), 0.12, 0.017]]);
            addModes(x, fs, toe, [[rr(rng, 390, 440), 0.22 * hard, 0.018], [1550, 0.055, 0.01]]);
            addNoise(x, fs, rng, 0, 0.03, { fc: 1600, q: 1.1, amp: 0.3 * hard, attack: 0.0008, tau: 0.004 });
            thump(110, 0.35, 0.03);
            break;
        case 'pier':
            // Broad boards over an air cavity: a lower, longer hollow knock than solid wood.
            addModes(x, fs, 0, [[rr(rng, 104, 119), 0.65, 0.1], [rr(rng, 245, 275), 0.32, 0.065], [rr(rng, 590, 645), 0.15, 0.038]]);
            addModes(x, fs, toe, [[rr(rng, 335, 375), 0.25 * hard, 0.042], [1280, 0.05, 0.012]]);
            addNoise(x, fs, rng, 0, 0.028, { fc: 1450, q: 0.8, amp: 0.35 * hard, attack: 0.0008, tau: 0.005 });
            break;
        case 'grass':
            thump(rr(rng, 90, 110), 0.4, 0.035);
            addNoise(x, fs, rng, 0.004, 0.14, { mode: 2, fc: 3200, q: 0.6, amp: 0.3 * hard, attack: 0.015, tau: 0.03 });
            break;
        case 'rock':
            addModes(x, fs, 0, [[rr(rng, 1700, 1900), 0.3, 0.018], [rr(rng, 3000, 3400), 0.2, 0.012], [rr(rng, 420, 470), 0.35, 0.025]]);
            addNoise(x, fs, rng, 0, 0.02, { mode: 2, fc: 2500, q: 0.7, amp: 0.55 * hard, attack: 0.0002, tau: 0.003 });
            thump(130, 0.35, 0.025);
            break;
        case 'shallow':
            thump(rr(rng, 90, 105), 0.35, 0.03);
            addNoise(x, fs, rng, 0.003, 0.22, { mode: 1, fc: (t) => 700 + 5000 * t, q: 1.1, amp: 0.5 * hard, attack: 0.006, tau: 0.045 });
            for (let k = 0; k < 3; k++) addDrip(x, fs, rr(rng, 0.04, 0.2), rr(rng, 900, 1500), rr(rng, 1800, 3200), rr(rng, 0.06, 0.14), 0.04);
            break;
        default: // sand
            thump(rr(rng, 95, 115), 0.55, 0.04);
            addNoise(x, fs, rng, 0.001, 0.12, { fc: rr(rng, 1800, 2600), q: 0.9, amp: 0.55 * hard, attack: 0.003, tau: 0.028, grain: [2600, 0.0006, 0.08] });
    }
    if (surface === 'sand' || surface === 'wetsand' || surface === 'grass') {
        // Weight sinks in, then grains/leaves release. Hard contacts push more material aside.
        addNoise(x, fs, rng, toe, 0.13 + speed * 0.055, {
            fc: surface === 'wetsand' ? 620 : surface === 'grass' ? 1900 : 1350,
            q: 0.65, amp: hard * 0.17, attack: 0.015, tau: 0.026 + speed * 0.009,
            grain: [surface === 'grass' ? 600 : 1400, 0.0014, 0.2]
        });
    }
    filt(x, fs, 'hp', 45, 0.7);
    dcBlock(x, fs);
    fadeIn(x, fs, 0.0005);
    fadeOut(x, fs, 0.05);
    return { ch: [scaleTo(x, surface === 'grass' ? 0.36 : surface === 'sand' ? 0.43 : 0.48, peakOf(x))], send: surface === 'pier' ? 0.22 : surface === 'plank' ? 0.14 : 0.05 };
}
function renderStamp(fs, rng) {
    const x = buf(fs, 0.5);
    addTone(x, fs, 0, 0.5, (t) => 72 * (1 + 0.45 * Math.exp(-t / 0.03)), (t) => envAD(t, 0.002, 0.09), rng() * TAU);
    addModes(x, fs, 0, [[160, 0.3, 0.05], [310, 0.18, 0.03]]);
    addNoise(x, fs, rng, 0.002, 0.2, { fc: 1800, q: 0.9, amp: 0.5, attack: 0.003, tau: 0.045, grain: [3000, 0.0006, 0.1] });
    for (let k = 0; k < 5; k++) addNoise(x, fs, rng, rr(rng, 0.05, 0.25), 0.03, { fc: rr(rng, 2500, 4500), q: 2, amp: rr(rng, 0.04, 0.1), attack: 0.001, tau: 0.004 });
    filt(x, fs, 'hp', 40, 0.7);
    dcBlock(x, fs);
    fadeOut(x, fs, 0.08);
    return { ch: [scaleTo(x, 0.62, peakOf(x))], send: 0.1 };
}

// --- water ------------------------------------------------------------------------------------
function renderSplash(fs, rng, size) {
    const s = clamp(size, 0, 1);
    const dur = 0.45 + 1.1 * s;
    const ch = [buf(fs, dur + 0.2), buf(fs, dur + 0.2)];
    for (let c = 0; c < 2; c++) {
        const x = ch[c];
        addNoise(x, fs, rng, 0, 0.03, { mode: 2, fc: 900, q: 0.7, amp: 0.5 + 0.4 * s, attack: 0.0005, tau: 0.006 });
        const top = 2600 + 1400 * s;
        const len = 0.18 + 0.5 * s;
        addNoise(x, fs, rng, 0.004, dur, { mode: 1, fc: (t) => 600 + top * Math.exp(-t / len), q: 0.9, amp: 0.8, attack: 0.012, tau: 0.06 + 0.2 * s });
        if (s > 0.4) {
            addTone(x, fs, 0, 0.5, (t) => 85 * (1 + 0.4 * Math.exp(-t / 0.05)), (t) => 0.25 * s * envAD(t, 0.004, 0.08), rng() * TAU);
            addNoise(x, fs, rng, 0.004, 0.3, { mode: 1, fc: 380, q: 1.2, amp: 0.5 * s, attack: 0.006, tau: 0.07 });
        }
        filt(x, fs, 'lp', 7500, 0.7);
        // An irregular curtain of tiny impacts, not a run of identical electronic chirps.
        addNoise(x, fs, rng, 0.08, dur * 0.8, { mode: 0, fc: 520, q: 0.65, amp: 0.22 + s * 0.15, attack: 0.06, tau: 0.1 + s * 0.13, src: pink(Math.ceil(dur * fs), rng) });
        const drops = Math.round(5 + 21 * s);
        for (let k = 0; k < drops; k++) {
            const t = rr(rng, 0.05, 0.2 + 1.0 * s);
            const f = rr(rng, 520, 1700);
            addDrip(x, fs, t, f, f * rr(rng, 1.15, 1.65), rr(rng, 0.035, 0.12) * Math.exp(-t * 1.2), rr(rng, 0.012, 0.04));
        }
        filt(x, fs, 'hp', 60, 0.7);
        dcBlock(x, fs);
        fadeOut(x, fs, 0.15);
    }
    const pk = Math.max(peakOf(ch[0]), peakOf(ch[1]));
    ch.forEach((x) => scaleTo(x, 0.35 + 0.33 * s, pk));
    return { ch, send: 0.16 };
}
function renderDrip(fs, rng) {
    const x = buf(fs, 0.16);
    addNoise(x, fs, rng, 0, 0.006, { fc: 5000, q: 1, amp: 0.1, attack: 0.0002, tau: 0.001 });
    addDrip(x, fs, 0.001, rr(rng, 700, 1200), rr(rng, 1600, 2800), 0.5, rr(rng, 0.04, 0.07), rr(rng, 0.012, 0.022));
    fadeOut(x, fs, 0.02);
    return { ch: [scaleTo(x, 0.34, peakOf(x))], send: 0.1 };
}
function renderBubble(fs, rng) {
    const x = buf(fs, 0.55);
    const count = 1 + Math.floor(rng() * 3.5);
    for (let k = 0; k < count; k++) {
        const t = k === 0 ? 0 : rr(rng, 0.05, 0.32);
        const f1 = rr(rng, 180, 620);
        const tau = rr(rng, 0.012, 0.026);
        addTone(x, fs, t, tau * 7, (u) => f1 * (1 + 0.38 * (1 - Math.exp(-u / 0.009))), (u) => (k ? 0.6 : 1) * envAD(u, 0.0015, tau), rng() * TAU);
        addNoise(x, fs, rng, t, 0.04, { fc: 480, q: 0.7, amp: 0.12, attack: 0.001, tau: 0.008 });
    }
    filt(x, fs, 'lp', 2200, 0.7);
    fadeOut(x, fs, 0.03);
    return { ch: [scaleTo(x, 0.23, peakOf(x))], send: 0.18 };
}
function renderSwim(fs, rng) {
    const x = buf(fs, 0.75);
    addNoise(x, fs, rng, 0, 0.7, { mode: 0, fc: (t) => 310 + 420 * Math.sin(Math.PI * Math.min(1, t / 0.55)), q: 0.8, amp: 1, tau: (t) => (t < 0.105 ? t / 0.105 : Math.exp(-(t - 0.105) / 0.13)) });
    addNoise(x, fs, rng, 0.08, 0.4, { fc: 1050, q: 0.85, amp: 0.23, attack: 0.055, tau: 0.08, grain: [130, 0.006, 0.4] });
    for (let k = 0; k < 3; k++) {
        const f = rr(rng, 270, 600);
        addDrip(x, fs, rr(rng, 0.16, 0.46), f, f * 1.4, rr(rng, 0.045, 0.095), 0.03);
    }
    filt(x, fs, 'lp', 1800, 0.7);
    dcBlock(x, fs);
    fadeOut(x, fs, 0.06);
    return { ch: [scaleTo(x, 0.4, peakOf(x))], send: 0.2 };
}
function renderShake(fs, rng) {
    const dur = 1.1;
    const ch = [buf(fs, dur), buf(fs, dur)];
    const rate = rr(rng, 13, 17);
    const env = (t) => smoothstep(0, 0.15, t) * (1 - smoothstep(0.5, 0.8, t));
    for (let c = 0; c < 2; c++) {
        const x = ch[c];
        const n = Math.round(0.85 * fs);
        const nz = white(n, rng);
        const g = ctl(n, fs, (t) => env(t) * Math.pow(0.5 + 0.5 * Math.sin(TAU * rate * t + c * 0.6), 2.5), 8);
        for (let i = 0; i < n; i++) nz[i] *= g[i];
        const lo = nz.slice();
        svf(lo, fs, 650, 0.9, 1);
        svf(nz, fs, 2600, 0.7, 2);
        mixInto(x, lo, 0, 0.9);
        mixInto(x, nz, 0, 0.12);
        filt(x, fs, 'lp', 6000, 0.7);
        for (let k = 0; k < 18; k++) {
            const t = rr(rng, 0.12, 0.98);
            addDrip(x, fs, t, rr(rng, 800, 1500), rr(rng, 1700, 3500), rr(rng, 0.12, 0.3), rr(rng, 0.03, 0.06));
        }
        dcBlock(x, fs);
        fadeOut(x, fs, 0.08);
    }
    const pk = Math.max(peakOf(ch[0]), peakOf(ch[1]));
    ch.forEach((x) => scaleTo(x, 0.42, pk));
    return { ch, send: 0.14 };
}
function renderThud(fs, rng) {
    const x = buf(fs, 0.9);
    addTone(x, fs, 0, 0.9, (t) => 52 * (1 + 0.35 * Math.exp(-t / 0.04)), (t) => envAD(t, 0.004, 0.16), rng() * TAU);
    addNoise(x, fs, rng, 0.005, 0.8, { mode: 0, fc: 320, q: 0.8, amp: 0.9, attack: 0.03, tau: 0.16 });
    addModes(x, fs, 0.003, [[rr(rng, 190, 215), 0.35, 0.05], [rr(rng, 420, 460), 0.15, 0.03]], 0.002);
    for (let k = 0; k < 4; k++) {
        const t = rr(rng, 0.1, 0.5);
        const f1 = rr(rng, 180, 320);
        addTone(x, fs, t, 0.14, (u) => f1 * (1 + u * 8), (u) => 0.12 * envAD(u, 0.003, 0.025), 0);
    }
    filt(x, fs, 'lp', 900, 0.7);
    filt(x, fs, 'hp', 30, 0.7);
    dcBlock(x, fs);
    fadeOut(x, fs, 0.1);
    return { ch: [scaleTo(x, 0.62, peakOf(x))], send: 0.2 };
}

// --- horse voice ------------------------------------------------------------------------------
// A short friendly whinny: a high, trilling start (F0 ≈ 1.1 kHz with ~12 Hz frequency pulses),
// a long falling middle, and a low breathy "hu-hu" end; plus a weaker, independent low tone
// (horses whinny with two fundamentals), aspiration noise and nasal formants.
function neighVoice(fs, rng, { dur, under = false }) {
    const n = Math.round(dur * fs);
    const src = new Float32Array(n);
    const fHi = rr(rng, 1020, 1180);
    const fMid = rr(rng, 760, 860);
    const fLo = rr(rng, 390, 470);
    const t1 = 0.1;
    const t2 = dur * rr(rng, 0.56, 0.62);
    const rate0 = rr(rng, 11.5, 13.5);
    const rate1 = 7.5;
    const jit = wobble(rng, 35);
    const contour = (t) => {
        if (t < t1) return lerp(fHi * 0.66, fHi, 1 - Math.pow(1 - t / t1, 2));
        if (t < t2) return lerp(fHi, fMid, Math.pow((t - t1) / (t2 - t1), 1.3));
        return lerp(fMid, fLo, Math.pow(Math.min(1, (t - t2) / (dur - t2)), 0.8));
    };
    // the trill: frequency pulses at rate0, slowing to rate1 over the falling end (closed-form phase)
    const vib = (t) => {
        const u = t < t2 ? 0 : t - t2;
        const cyc = rate0 * t + ((rate1 - rate0) * u * u) / (2 * (dur - t2));
        return Math.sin(TAU * cyc);
    };
    const fcur = ctl(n, fs, (t) => {
        const depth = 0.02 + 0.03 * smoothstep(t1 - 0.03, t1 + 0.05, t) + 0.03 * smoothstep(t2 - 0.06, t2 + 0.06, t);
        return contour(t) * (1 + depth * vib(t) + 0.006 * jit(t));
    }, 8);
    const shape = ctl(n, fs, (t) => {
        const v = vib(t);
        const amDepth = 0.1 + 0.25 * smoothstep(t1 - 0.03, t1 + 0.05, t) + 0.35 * smoothstep(t2 - 0.06, t2 + 0.06, t);
        const env = Math.min(1, t / 0.035) * (t > dur - 0.12 ? Math.max(0, (dur - t) / 0.12) : 1) * (t > t2 ? lerp(1, 0.55, (t - t2) / (dur - t2)) : 1);
        return env * (1 - amDepth * (0.5 - 0.5 * v));
    }, 8);
    const at = (arr) => (t) => arr[Math.min(n - 1, Math.round(t * fs))];
    harmonicSource(src, fs, 0, dur, at(fcur), at(shape), { tilt: 1.05, top: 7000, maxK: 30 });
    // second, lower fundamental (biphonation)
    const g0 = rr(rng, 380, 440);
    const g0w = wobble(rng, 6);
    harmonicSource(src, fs, 0, dur, (t) => g0 * (1 + 0.03 * g0w(t)), (t) => 0.22 * shape[Math.min(n - 1, Math.round(t * fs))] * (t < t2 ? 1 : Math.max(0, 1 - (t - t2) / 0.15)), { tilt: 1.4, top: 4000, maxK: 10 });
    // formants (nasal) in parallel with a little of the raw source
    const out = new Float32Array(n);
    for (const [f, q, g] of [[1050, 1.6, 1], [2250, 2.5, 0.5], [3500, 3, 0.22]]) {
        const b = src.slice();
        filt(b, fs, 'bp', f, q);
        mixInto(out, b, 0, g);
    }
    mixInto(out, src, 0, 0.12);
    // breath
    addNoise(out, fs, rng, 0, dur, { fc: 2600, q: 0.8, amp: 0.05, tau: (t) => 0.25 + (t > t2 ? (1.2 * (t - t2)) / (dur - t2) : 0) * (t > dur - 0.1 ? (dur - t) / 0.1 : 1) });
    filt(out, fs, 'lp', under ? 700 : 6500, 0.7);
    if (under) filt(out, fs, 'lp', 900, 0.7);
    return { out, shape, t2 };
}
function renderNeigh(fs, rng) {
    const dur = rr(rng, 1.0, 1.2);
    const { out } = neighVoice(fs, rng, { dur });
    // the ending exhale ("hhh") after the voice
    const x = buf(fs, dur + 0.35);
    mixInto(x, out);
    addNoise(x, fs, rng, dur - 0.08, 0.35, { fc: 1400, q: 0.7, amp: 0.05, attack: 0.05, tau: 0.08 });
    filt(x, fs, 'lp', 7000, 0.7);
    filt(x, fs, 'hp', 150, 0.7);
    dcBlock(x, fs);
    fadeIn(x, fs, 0.004);
    fadeOut(x, fs, 0.06);
    return { ch: [scaleTo(x, 0.55, peakOf(x))], send: 0.22 };
}
function renderBlubb(fs, rng) {
    const dur = rr(rng, 0.75, 0.9);
    const { out, shape } = neighVoice(fs, rng, { dur, under: true });
    const x = buf(fs, dur + 0.5);
    // bubbly: chop the muffled voice into blubs and add bubbles on each blub
    const rate = rr(rng, 8, 10);
    const chop = ctl(out.length, fs, (t) => 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(TAU * rate * t), 2), 8);
    for (let i = 0; i < out.length; i++) x[i] = out[i] * chop[i];
    const blubs = Math.floor(dur * rate);
    for (let k = 0; k < blubs; k++) {
        const t = k / rate + rr(rng, 0, 0.03);
        const i = Math.min(shape.length - 1, Math.round(t * fs));
        const f1 = rr(rng, 260, 420) * (1 - 0.3 * (k / blubs));
        addTone(x, fs, t, 0.14, (u) => f1 * (1 + 1.3 * Math.min(1, u / 0.07)), (u) => 0.5 * (shape[i] + 0.2) * envAD(u, 0.003, 0.03), 0);
    }
    for (let k = 0; k < 6; k++) {
        const t = rr(rng, dur * 0.6, dur + 0.3);
        const f1 = rr(rng, 350, 700);
        addTone(x, fs, t, 0.12, (u) => f1 * (1 + u * 7), (u) => 0.18 * envAD(u, 0.002, 0.02), 0);
    }
    filt(x, fs, 'lp', 1600, 0.7);
    filt(x, fs, 'hp', 90, 0.7);
    dcBlock(x, fs);
    fadeIn(x, fs, 0.005);
    fadeOut(x, fs, 0.06);
    return { ch: [scaleTo(x, 0.52, peakOf(x))], send: 0.28 };
}
function renderSnort(fs, rng) {
    const dur = rr(rng, 0.32, 0.42);
    const x = buf(fs, dur + 0.1);
    const rate = rr(rng, 28, 40);
    const nz = white(Math.round(dur * fs), rng);
    const g = ctl(nz.length, fs, (t) => Math.min(1, t / 0.012) * Math.exp(-t / (dur * 0.45)) * (0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(TAU * rate * t), 1.5)), 8);
    for (let i = 0; i < nz.length; i++) nz[i] *= g[i];
    const a = nz.slice();
    svf(a, fs, rr(rng, 700, 900), 1.1, 1);
    const b = nz.slice();
    svf(b, fs, rr(rng, 1900, 2300), 1.6, 1);
    const c = nz.slice();
    svf(c, fs, 260, 0.9, 1);
    mixInto(x, a, 0, 1);
    mixInto(x, b, 0, 0.4);
    mixInto(x, c, 0, 0.7);
    filt(x, fs, 'lp', 4500, 0.7);
    filt(x, fs, 'hp', 90, 0.7);
    dcBlock(x, fs);
    fadeOut(x, fs, 0.05);
    return { ch: [scaleTo(x, 0.46, peakOf(x))], send: 0.12 };
}

// --- birds, air -------------------------------------------------------------------------------
function renderGull(fs, rng) {
    const calls = 2 + Math.floor(rng() * 2);
    const x = buf(fs, calls * 0.3 + 0.4);
    let t = 0;
    for (let k = 0; k < calls; k++) {
        const len = rr(rng, 0.2, 0.26) * (k === calls - 1 ? 1.25 : 1);
        const base = rr(rng, 1150, 1300) * (1 - 0.06 * k);
        const peak = base * rr(rng, 1.28, 1.42);
        const jit = wobble(rng, 80);
        harmonicSource(x, fs, t, len, (u) => {
            const r = u < 0.045 ? lerp(base, peak, u / 0.045) : lerp(peak, base * 0.88, Math.pow((u - 0.045) / (len - 0.045), 0.7));
            return r * (1 + 0.025 * jit(t + u));
        }, (u) => (1 - 0.15 * k) * smoothstep(0, 0.03, u) * (1 - 0.35 * (u / len)) * (1 - smoothstep(len - 0.07, len, u)), { tilt: 1.25, top: 6000, maxK: 10 });
        t += len + rr(rng, 0.06, 0.1);
    }
    const y = x.slice();
    filt(y, fs, 'bp', 2600, 1.4);
    mixInto(x, y, 0, 1.1);
    filt(x, fs, 'lp', 4200, 0.7);
    filt(x, fs, 'lp', 5000, 0.7);
    filt(x, fs, 'hp', 500, 0.7);
    fadeOut(x, fs, 0.05);
    return { ch: [scaleTo(x, 0.3, peakOf(x))], send: 0.38 };
}
function renderWind(fs, rng) {
    const dur = rr(rng, 2.2, 3);
    const ch = [buf(fs, dur), buf(fs, dur)];
    const bell = (t) => Math.sin(Math.PI * clamp(t / dur, 0, 1));
    const e = ctl(ch[0].length, fs, (t) => Math.pow(bell(t), 1.6));
    for (let c = 0; c < 2; c++) {
        const x = pink(ch[c].length, rng);
        svf(x, fs, (t) => 360 + 520 * bell(t) + 80 * Math.sin(TAU * 1.3 * t + c), 1.3, 1);
        const w = white(ch[c].length, rng);
        svf(w, fs, (t) => 1050 + 380 * bell(t), 22, 1);
        for (let i = 0; i < x.length; i++) ch[c][i] = (x[i] * 2.2 + w[i] * 0.35) * e[i];
    }
    const pk = Math.max(peakOf(ch[0]), peakOf(ch[1]));
    ch.forEach((x) => scaleTo(x, 0.3, pk));
    return { ch, send: 0.2 };
}
function renderWhoosh(fs, rng) {
    const dur = rr(rng, 0.45, 0.6);
    const ch = [buf(fs, dur), buf(fs, dur)];
    const peakAt = rr(rng, 0.5, 0.65);
    const env = (u) => (u < peakAt ? Math.pow(u / peakAt, 2) : Math.pow(Math.max(0, 1 - (u - peakAt) / (1 - peakAt)), 1.5));
    const dir = rng() < 0.5 ? -1 : 1;
    for (let c = 0; c < 2; c++) {
        const x = white(ch[c].length, rng);
        svf(x, fs, (t) => 380 + 2400 * env(t / dur), 1.4, 1);
        const g = ctl(x.length, fs, (t) => {
            const u = t / dur;
            const pan = dir * lerp(-0.6, 0.6, u);
            return env(clamp(u, 0, 1)) * (c === 0 ? Math.cos(((pan + 1) * Math.PI) / 4) : Math.sin(((pan + 1) * Math.PI) / 4));
        });
        for (let i = 0; i < x.length; i++) ch[c][i] = x[i] * g[i];
    }
    const pk = Math.max(peakOf(ch[0]), peakOf(ch[1]));
    ch.forEach((x) => scaleTo(x, 0.4, pk));
    return { ch, send: 0.15 };
}

// --- paper and pencil -------------------------------------------------------------------------
function renderPencil(fs, rng, len = 0.4, speed = 0.6) {
    const L = clamp(len, 0.04, 4);
    const x = buf(fs, L + 0.03);
    const n = x.length;
    const nz = white(n, rng);
    const g = grains(n, fs, rng, 500 + 1500 * speed, 0.0007, 0.35);
    const wob = ctl(n, fs, wobble(rng, 4 + 5 * speed));
    const pressure = ctl(n, fs, (t) => 0.64 + 0.36 * Math.pow(Math.sin(TAU * (2.2 + speed) * t + 0.7), 2));
    for (let i = 0; i < n; i++) nz[i] *= g[i] * (0.66 + 0.34 * wob[i]) * pressure[i];
    const hi = nz.slice();
    svf(hi, fs, 3400 + 1100 * speed, 0.7, 1);
    svf(nz, fs, 1250, 0.85, 1);
    const e = ctl(n, fs, (t) => Math.min(1, t / 0.012) * (t > L ? Math.max(0, 1 - (t - L) / 0.025) : 1), 8);
    for (let i = 0; i < n; i++) x[i] = (hi[i] * 0.65 + 0.65 * nz[i]) * e[i];
    filt(x, fs, 'hp', 550, 0.7);
    filt(x, fs, 'lp', 7200, 0.7);
    fadeOut(x, fs, 0.01);
    return { ch: [scaleTo(x, 0.16 + 0.1 * speed, peakOf(x))], send: 0.06 };
}
function renderScribble(fs, rng, dur, rate) {
    const p = renderPencil(fs, rng, dur, 0.8).ch[0];
    const g = ctl(p.length, fs, (t) => 0.45 + 0.55 * Math.abs(Math.sin(Math.PI * rate * t)), 8);
    for (let i = 0; i < p.length; i++) p[i] *= g[i];
    return p;
}
function crackle(x, fs, rng, t0, dur, density, { lo = 2000, hi = 7000, amp = 1, env = null } = {}) {
    const count = Math.round(density * dur);
    for (let k = 0; k < count; k++) {
        const u = rng();
        const t = t0 + u * dur;
        const a = amp * (0.3 + 0.7 * rng()) * (env ? env(u) : 1);
        addNoise(x, fs, rng, t, 0.012, { fc: rr(rng, lo, hi), q: rr(rng, 1.5, 4), amp: a, attack: 0.0002, tau: rr(rng, 0.0008, 0.003) });
    }
    return x;
}
function renderRustle(fs, rng) {
    const dur = rr(rng, 0.5, 0.65);
    const x = buf(fs, dur + 0.25);
    crackle(x, fs, rng, 0, dur, 420, { amp: 0.6, env: (u) => Math.sin(Math.PI * u) });
    addNoise(x, fs, rng, 0, dur, { fc: 3500, q: 0.6, amp: 0.16, tau: (t) => Math.sin(Math.PI * clamp(t / dur, 0, 1)) });
    // the crease flicks: a quick swish and a crisp snap
    addNoise(x, fs, rng, dur - 0.06, 0.12, { mode: 1, fc: (t) => 1500 + 30000 * t, q: 1, amp: 0.4, attack: 0.04, tau: 0.02 });
    addNoise(x, fs, rng, dur + 0.05, 0.03, { mode: 2, fc: 2500, q: 0.8, amp: 0.8, attack: 0.0002, tau: 0.004 });
    addModes(x, fs, dur + 0.05, [[1900, 0.12, 0.01], [3100, 0.08, 0.008]]);
    filt(x, fs, 'hp', 500, 0.7);
    fadeOut(x, fs, 0.03);
    return { ch: [scaleTo(x, 0.5, peakOf(x))], send: 0.12 };
}
function renderUnfold(fs, rng) {
    const dur = 1.6;
    const ch = [buf(fs, dur + 0.3), buf(fs, dur + 0.3)];
    for (let c = 0; c < 2; c++) {
        const x = ch[c];
        crackle(x, fs, rng, 0, dur, 90, { lo: 1200, hi: 5000, amp: 0.55, env: (u) => 0.4 + 0.6 * Math.sin(Math.PI * u) });
        for (const [t0, len] of [[0.15, 0.5], [0.75, 0.75]]) {
            addNoise(x, fs, rng, t0, len, { mode: 0, fc: (t) => 250 + 500 * Math.sin((Math.PI * t) / len), q: 0.8, amp: 0.9, tau: (t) => Math.pow(Math.sin((Math.PI * clamp(t / len, 0, 1))), 1.5) });
        }
        addTone(x, fs, 1.35, 0.4, (t) => 70 + 30 * Math.exp(-t / 0.05), (t) => 0.25 * envAD(t, 0.02, 0.08), 0);
        filt(x, fs, 'hp', 50, 0.7);
        dcBlock(x, fs);
        fadeOut(x, fs, 0.1);
    }
    const pk = Math.max(peakOf(ch[0]), peakOf(ch[1]));
    ch.forEach((x) => scaleTo(x, 0.4, pk));
    return { ch, send: 0.22 };
}
function renderPage(fs, rng) {
    const dur = rr(rng, 0.34, 0.42);
    const x = buf(fs, dur + 0.15);
    addNoise(x, fs, rng, 0, dur, { fc: (t) => 1200 + 3000 * (t / dur), q: 0.8, amp: 0.5, tau: (t) => Math.pow(Math.sin(Math.PI * clamp(t / dur, 0, 1)), 0.8) });
    crackle(x, fs, rng, 0.02, dur * 0.8, 40, { amp: 0.35 });
    addNoise(x, fs, rng, dur - 0.02, 0.12, { mode: 0, fc: 350, q: 0.8, amp: 0.8, attack: 0.008, tau: 0.03 });
    filt(x, fs, 'hp', 120, 0.7);
    dcBlock(x, fs);
    fadeOut(x, fs, 0.03);
    return { ch: [scaleTo(x, 0.3, peakOf(x))], send: 0.1 };
}
// The notebook is close and small: fingertips, paper and a soft wooden pencil tap.
function renderUI(fs, rng, { kind = 'tab' } = {}) {
    const open = kind === 'open';
    const close = kind === 'close';
    const confirm = kind === 'confirm';
    const x = buf(fs, open || close ? 0.3 : 0.16);
    addNoise(x, fs, rng, 0, open ? 0.22 : 0.09, { fc: open ? 1700 : 1100, q: 0.7, amp: 0.22, attack: 0.009, tau: open ? 0.065 : 0.023, grain: [400, 0.001, 0.3] });
    const t = close ? 0.07 : 0.012;
    addModes(x, fs, t, [[close ? 210 : 440, 0.12, 0.016], [close ? 510 : 970, 0.06, 0.009]], 0.002);
    if (confirm) addModes(x, fs, 0.065, [[660, 0.08, 0.025], [1320, 0.025, 0.016]], 0.004);
    filt(x, fs, 'lp', 4100);
    dcBlock(x, fs);
    fadeOut(x, fs, 0.025);
    return { ch: [scaleTo(x, 0.115, peakOf(x))], send: 0.035 };
}
function renderWrite(fs, rng) {
    const x = buf(fs, 1.25);
    let t = 0.02;
    const strokes = 4 + Math.floor(rng() * 2);
    for (let k = 0; k < strokes; k++) {
        const len = rr(rng, 0.07, 0.19);
        mixInto(x, renderPencil(fs, rng, len, rr(rng, 0.5, 0.9)).ch[0], Math.round(t * fs), rr(rng, 0.7, 1));
        t += len + rr(rng, 0.04, 0.11);
    }
    mixInto(x, renderPencil(fs, rng, 0.025, 1).ch[0], Math.round((t + 0.05) * fs), 1); // the full stop
    fadeOut(x, fs, 0.02);
    return { ch: [scaleTo(x, 0.26, peakOf(x))], send: 0.06 };
}

// --- clicks and mechanics ---------------------------------------------------------------------
function renderCrabclick(fs, rng) {
    const x = buf(fs, 0.35);
    const clicks = 2 + Math.floor(rng() * 2);
    let t = 0;
    for (let k = 0; k < clicks; k++) {
        addModes(x, fs, t, [[rr(rng, 1800, 2200), 0.5, 0.009], [rr(rng, 3600, 4100), 0.18, 0.004], [rr(rng, 850, 1100), 0.3, 0.014]], 0.0006);
        addNoise(x, fs, rng, t, 0.008, { fc: 2400, q: 0.7, amp: 0.24, attack: 0.0003, tau: 0.0015 });
        t += rr(rng, 0.045, 0.09);
    }
    filt(x, fs, 'hp', 450, 0.7);
    fadeOut(x, fs, 0.02);
    return { ch: [scaleTo(x, 0.25, peakOf(x))], send: 0.1 };
}
function renderCrabvoice(fs, rng) {
    const x = buf(fs, 0.62);
    const count = 3 + Math.floor(rng() * 3);
    const pitch = rr(rng, 0.9, 1.12);
    let t = 0;
    for (let k = 0; k < count; k++) {
        const lift = k === count - 1 ? 1.16 : 1 - k * 0.025;
        const a = k & 1 ? 0.62 : 1;
        addModes(x, fs, t, [[760 * pitch * lift, a * 0.35, 0.025], [1370 * pitch * lift, a * 0.2, 0.015], [2450, a * 0.07, 0.008]], 0.0015);
        addNoise(x, fs, rng, t, 0.023, { fc: 1650, q: 0.7, amp: a * 0.11, attack: 0.001, tau: 0.005 });
        t += rr(rng, 0.055, 0.1);
    }
    filt(x, fs, 'lp', 4800);
    dcBlock(x, fs);
    fadeOut(x, fs, 0.06);
    return { ch: [scaleTo(x, 0.24, peakOf(x))], send: 0.09 };
}
function renderLatch(fs, rng) {
    const x = buf(fs, 0.45);
    addModes(x, fs, 0, [[rr(rng, 2250, 2450), 0.35, 0.02], [rr(rng, 4000, 4300), 0.25, 0.014], [6700, 0.12, 0.008]], 0.0002);
    addNoise(x, fs, rng, 0, 0.01, { mode: 2, fc: 2500, q: 0.7, amp: 0.4, attack: 0.0001, tau: 0.0015 });
    const t2 = rr(rng, 0.05, 0.065);
    addModes(x, fs, t2, [[rr(rng, 880, 950), 0.45, 0.035], [rr(rng, 1650, 1780), 0.3, 0.025], [140, 0.4, 0.04]], 0.0004);
    addNoise(x, fs, rng, t2, 0.02, { fc: 1500, q: 1, amp: 0.4, attack: 0.0002, tau: 0.003 });
    filt(x, fs, 'hp', 70, 0.7);
    dcBlock(x, fs);
    fadeOut(x, fs, 0.05);
    return { ch: [scaleTo(x, 0.42, peakOf(x))], send: 0.14 };
}
function renderRatchet(fs, rng) {
    const x = buf(fs, 0.28);
    const k0 = rr(rng, 0.94, 1.06);
    for (let k = 0; k < 3; k++) {
        const t = k * rr(rng, 0.007, 0.01);
        const a = k === 2 ? 1 : 0.35;
        addModes(x, fs, t, [[640 * k0, 0.35 * a, 0.025], [1520 * k0, 0.25 * a, 0.018], [2650 * k0, 0.15 * a, 0.01]], 0.0002);
        addNoise(x, fs, rng, t, 0.008, { fc: 2200, q: 1, amp: 0.3 * a, attack: 0.0001, tau: 0.0015 });
    }
    filt(x, fs, 'hp', 150, 0.7);
    fadeOut(x, fs, 0.03);
    return { ch: [scaleTo(x, 0.4, peakOf(x))], send: 0.14 };
}
function renderGate(fs, rng) {
    const x = buf(fs, 1.6);
    // the bolt slides
    addNoise(x, fs, rng, 0, 0.28, { fc: 2900, q: 3, amp: 0.3, tau: (t) => Math.sin(Math.PI * clamp(t / 0.28, 0, 1)), grain: [900, 0.002, 0.3] });
    addModes(x, fs, 0.27, [[1100, 0.3, 0.05], [2900, 0.18, 0.03], [4600, 0.1, 0.02]], 0.0003);
    // the creak: stick-slip pulses through wooden resonances
    const t0 = 0.4;
    const len = rr(rng, 0.55, 0.7);
    const pulses = new Float32Array(Math.round(len * fs));
    let ph = 0;
    for (let i = 0; i < pulses.length; i++) {
        const u = i / pulses.length;
        ph += (lerp(55, 115, u) * (1 + 0.25 * (rng() - 0.5))) / fs;
        if (ph >= 1) {
            ph -= 1;
            pulses[i] = 1;
        }
    }
    const creak = new Float32Array(pulses.length);
    for (const [f, q, g] of [[560, 7, 1], [1260, 9, 0.7], [2300, 7, 0.35]]) {
        const b = pulses.slice();
        filt(b, fs, 'bp', f * rr(rng, 0.95, 1.05), q);
        mixInto(creak, b, 0, g);
    }
    for (let i = 0; i < creak.length; i++) creak[i] *= Math.sin((Math.PI * i) / creak.length);
    mixInto(x, creak, Math.round(t0 * fs), 1.2);
    // it swings open against the post
    addModes(x, fs, t0 + len + 0.05, [[190, 0.5, 0.07], [430, 0.3, 0.05], [900, 0.12, 0.03]], 0.0006);
    filt(x, fs, 'hp', 70, 0.7);
    dcBlock(x, fs);
    fadeOut(x, fs, 0.1);
    return { ch: [scaleTo(x, 0.42, peakOf(x))], send: 0.18 };
}
function renderStopwatch(fs, rng) {
    const x = buf(fs, 1.05);
    const click = (t, a, k) => {
        addModes(x, fs, t, [[4100 * k, 0.4 * a, 0.012], [6300 * k, 0.25 * a, 0.008], [2700 * k, 0.2 * a, 0.01]], 0.0001);
        addNoise(x, fs, rng, t, 0.005, { mode: 2, fc: 3500, q: 0.7, amp: 0.3 * a, attack: 0.0001, tau: 0.0008 });
    };
    click(0, 1, 1);
    click(0.035, 0.8, 0.8);
    for (let k = 0; k < 4; k++) click(0.28 + k * 0.2, 0.3, 1.1);
    filt(x, fs, 'hp', 800, 0.7);
    fadeOut(x, fs, 0.03);
    return { ch: [scaleTo(x, 0.32, peakOf(x))], send: 0.1 };
}
function renderPop(fs, rng) {
    const x = buf(fs, 0.14);
    const f1 = rr(rng, 480, 540);
    addTone(x, fs, 0, 0.14, (t) => f1 * (1 + 0.55 * Math.min(1, t / 0.025)), (t) => envAD(t, 0.002, 0.022), 0);
    addTone(x, fs, 0, 0.1, (t) => 2 * f1 * (1 + 0.55 * Math.min(1, t / 0.025)), (t) => 0.15 * envAD(t, 0.002, 0.012), 0);
    fadeOut(x, fs, 0.02);
    return { ch: [scaleTo(x, 0.3, peakOf(x))], send: 0 };
}
// musical effects: JS noise part + notes scheduled on the harmonic/lyre voices
function renderPickupNoise(fs, rng) {
    const x = buf(fs, 0.2);
    addModes(x, fs, 0, [[rr(rng, 1900, 2100), 0.3, 0.012], [3300, 0.18, 0.008]], 0.0002);
    addModes(x, fs, 0.045, [[rr(rng, 1700, 1850), 0.22, 0.01], [3000, 0.12, 0.007]], 0.0002);
    filt(x, fs, 'hp', 600, 0.7);
    fadeOut(x, fs, 0.02);
    return { ch: [scaleTo(x, 0.2, peakOf(x))], send: 0.1 };
}
function renderColorinNoise(fs, rng) {
    const x = renderScribble(fs, rng, 0.7, rr(rng, 8, 10));
    fadeOut(x, fs, 0.05);
    return { ch: [scaleTo(x, 0.22, peakOf(x))], send: 0.08 };
}

const SFX_RENDER = {
    splash: (fs, rng, o) => renderSplash(fs, rng, o.size == null ? 0.6 : o.size),
    drip: renderDrip,
    shake: renderShake,
    bubble: renderBubble,
    swim: renderSwim,
    pencil: (fs, rng, o) => renderPencil(fs, rng, o.len == null ? 0.4 : o.len, o.speed01 == null ? 0.6 : o.speed01),
    rustle: renderRustle,
    unfold: renderUnfold,
    crabclick: renderCrabclick,
    crabvoice: renderCrabvoice,
    neigh: renderNeigh,
    blubb: renderBlubb,
    snort: renderSnort,
    stamp: renderStamp,
    gull: renderGull,
    wind: renderWind,
    whoosh: renderWhoosh,
    thud: renderThud,
    latch: renderLatch,
    ratchet: renderRatchet,
    gate: renderGate,
    pop: renderPop,
    page: renderPage,
    ui: renderUI,
    pickup: renderPickupNoise,
    colorin: renderColorinNoise,
    sparkle: null, // purely musical
    stopwatch: renderStopwatch,
    write: renderWrite
};
// how many variants each effect keeps before reusing them (and how many may overlap)
const SFX_VARIANTS = { drip: 6, bubble: 6, crabclick: 5, crabvoice: 5, ratchet: 5, pop: 3, splash: 2, wind: 2, unfold: 2, gate: 2, shake: 2, blubb: 2 };
const SFX_POLY = { hoof: 8, drip: 6, bubble: 6, ratchet: 4, pencil: 3, splash: 4, crabvoice: 1, ui: 3 };

// --- ambience beds (seamless loops) -------------------------------------------------------------
function renderBed(fs, rng, name) {
    const sec = name === 'waves' ? 8 : 6;
    const xf = Math.round(0.6 * fs);
    const n = Math.round(sec * fs) + xf;
    let x;
    if (name === 'wind') {
        x = pink(n, rng);
        svf(x, fs, (t) => 520 + 200 * Math.sin((TAU * t) / sec) + 90 * Math.sin((TAU * 3 * t) / sec + 1), 0.8, 1);
        const g = ctl(n, fs, (t) => 0.7 + 0.3 * Math.sin((TAU * 2 * t) / sec), 32);
        for (let i = 0; i < n; i++) x[i] *= g[i];
    } else if (name === 'under') {
        x = brown(n, rng);
        svf(x, fs, (t) => 260 + 60 * Math.sin((TAU * t) / sec), 0.9, 0);
        for (let k = 0; k < 7; k++) {
            const t = rr(rng, 0.2, sec - 0.2);
            const f1 = rr(rng, 250, 520);
            addTone(x, fs, t, 0.15, (u) => f1 * (1 + u * 8), (u) => 0.05 * envAD(u, 0.003, 0.03), 0);
        }
    } else if (name === 'waves') {
        x = new Float32Array(n);
        const nz = pink(n, rng);
        const hiss = white(n, rng);
        svf(nz, fs, (t) => 380 + 900 * Math.pow(0.5 - 0.5 * Math.cos((TAU * (t % 4)) / 4), 2), 0.7, 1);
        svf(hiss, fs, 3000, 0.6, 2);
        svf(hiss, fs, 9000, 0.7, 0);
        const w = ctl(n, fs, (t) => 0.25 + 0.75 * Math.pow(0.5 - 0.5 * Math.cos((TAU * (t % 4)) / 4), 1.5), 32);
        const crest = ctl(n, fs, (t) => 0.25 * Math.pow(Math.max(0, Math.sin((TAU * ((t % 4) - 1.6)) / 4)), 6), 32);
        for (let i = 0; i < n; i++) x[i] = nz[i] * w[i] + hiss[i] * crest[i];
    } else { // 'lap': calm bay
        x = new Float32Array(n);
        for (let k = 0; k < 14; k++) {
            const t = rr(rng, 0, sec + 0.3);
            addNoise(x, fs, rng, t, 0.45, { mode: 0, fc: rr(rng, 400, 700), q: 1.2, amp: rr(rng, 0.3, 0.6), tau: (u) => Math.sin(Math.PI * clamp(u / 0.4, 0, 1)) });
        }
        for (let k = 0; k < 4; k++) addDrip(x, fs, rr(rng, 0.3, sec), rr(rng, 700, 1100), rr(rng, 1500, 2400), 0.05, 0.05);
    }
    dcBlock(x, fs);
    const y = foldLoop(x, xf);
    return scaleTo(y, name === 'waves' ? 0.3 : 0.22, peakOf(y));
}

// The "freeze" gesture: a Dm lyre chord, smeared and played backwards, swelling into a dead stop
function renderReverseSwell(fs, rng) {
    const len = Math.round(1.3 * fs);
    const x = new Float32Array(len);
    [50, 57, 62, 65, 69].forEach((m, k) => mixInto(x, renderLyre(fs, m, rng).subarray(0, len - k * 200), k * 200, 0.8));
    // smear with a few feedforward echoes (a little room)
    const y = x.slice();
    for (const [d, g] of [[0.031, 0.5], [0.047, 0.42], [0.071, 0.33], [0.113, 0.25], [0.167, 0.18]]) mixInto(y, x, Math.round(d * fs), g);
    y.reverse();
    const out = y.subarray(y.length - Math.round(0.42 * fs)).slice();
    fadeIn(out, fs, 0.3);
    fadeOut(out, fs, 0.004);
    return scaleTo(out, 0.3, peakOf(out));
}

// soft ceiling for the master: linear up to `knee`, approaching `ceil` (< -1 dBFS) smoothly
function ceilingCurve(n = 4096, knee = 0.60, ceil = 0.82) {
    const c = new Float32Array(n);
    const p = (1 - knee) / (ceil - knee);
    for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        const ax = Math.abs(x);
        const y = ax <= knee ? ax : knee + (ceil - knee) * (1 - Math.pow(1 - (ax - knee) / (1 - knee), p));
        c[i] = x < 0 ? -y : y;
    }
    return c;
}

/** Internal DSP renderers, exported for the QA and dev tools only (not part of the game API). */
export const __dsp = {
    renderLyre, renderHarm, renderShell, renderPlank, renderDrum, renderReverb, renderHoof, renderBed,
    renderReverseSwell, SFX_RENDER, mulberry32, mtof, ksString, ceilingCurve
};

// =============================================================================================
// The engine
// =============================================================================================

const LOOKAHEAD = 0.3; // seconds of music scheduled ahead on the audio clock
const TICK_MS = 50;
const TRIM = 0.9; // into the master compressor
const MUSIC_GAIN = 1.4; // music bus make-up (+3 dB) relative to effects
const VERB_RETURN = 0.55;
const PAD_LEVEL = 0.03; // per oscillator
const DRONE_LEVEL = 0.022;
const BED_LEVEL = { wind: 0.12, under: 0.2, waves: 0.32, lap: 0.22 };
const AREA_BEDS = { table: {}, land: { wind: 1 }, sea: { under: 1 }, bay: { lap: 1 }, final: { waves: 1, wind: 0.4 } };
const ENV_BEDS = { table: {}, beach: { waves: 0.5, wind: 0.2 }, steppe: { wind: 1 }, kelp: { under: 1 }, bay: { lap: 1, wind: 0.12 } };
const HIDE_MUL = { mel: 0.85, acc: 0.12, pad: 0.3, drum: 0, harm: 0.8, tex: 0.4 };
const INST_GAIN = { lyre: 0.6, harm: 0.8, shell: 0.55, plank: 0.6 };
const INST_ALIAS = { lyre: 'lyre', shell: 'shell', plank: 'plank', 'bell-free': 'harm', harm: 'harm' };
const volCurve = (v) => {
    const x = clamp(Number.isFinite(v) ? v : 1, 0, 1);
    return x * x;
};

function silentAudio() {
    const noop = () => {};
    return {
        ready: Promise.resolve(),
        ctx: null,
        resume: () => Promise.resolve(),
        suspend: () => Promise.resolve(),
        setVolumes: noop,
        setArea: noop,
        setEnvironment: noop,
        setMotion: noop,
        stinger: () => 0,
        freeze: noop,
        sfx: noop,
        phrase: () => 0,
        note: noop,
        dispose: noop
    };
}

/**
 * Create the game's audio. See skoldhast/dev/SPEC.md §5.
 * @param {object} [o]
 * @param {BaseAudioContext} [o.ctx] the page's shared AudioContext (never closed here), or an
 *   OfflineAudioContext (QA). Omitted: a context is created and owned (closed on dispose).
 * @param {number} [o.seed] fixed random seed (QA); otherwise random
 * @param {boolean} [o.lifecycle] also install resume-on-gesture and suspend-on-hidden listeners
 * @param {boolean} [o.warm] pre-render effects in idle time after `ready` (default true, not offline)
 */
export function createAudio({ ctx: givenCtx, seed, lifecycle = false, warm = true } = {}) {
    let ctx = givenCtx || null;
    let ownCtx = false;
    if (!ctx && typeof window !== 'undefined') {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
            try {
                ctx = new AC({ latencyHint: 'interactive' });
            } catch {
                try {
                    ctx = new AC();
                } catch {
                    ctx = null;
                }
            }
            ownCtx = !!ctx;
        }
    }
    if (!ctx) return silentAudio();

    const offline = typeof ctx.startRendering === 'function';
    const fs = ctx.sampleRate;
    const baseSeed = (seed == null ? Math.floor(Math.random() * 4294967296) : seed) >>> 0;
    const rng = mulberry32(baseSeed ^ 0x9e3779b9);
    const rngFor = (key) => mulberry32((hashStr(key) ^ baseSeed) >>> 0);
    const canPan = typeof ctx.createStereoPanner === 'function';
    const owned = []; // persistent nodes, disconnected on dispose
    const live = new Set(); // playing one-shot sources
    const persistent = new Set(); // looping / long sources (drone, beds, LFOs)
    let disposed = false;
    let voices = 0;
    const sfxCount = Object.create(null);

    // ---- node helpers --------------------------------------------------------------------
    function G(v, dest) {
        const g = ctx.createGain();
        g.gain.value = v;
        if (dest) g.connect(dest);
        owned.push(g);
        return g;
    }
    function Pan(p, dest) {
        if (!canPan || !p) return G(1, dest);
        const n = ctx.createStereoPanner();
        n.pan.value = p;
        n.connect(dest);
        owned.push(n);
        return n;
    }
    function Filter(type, f, q, dest) {
        const b = ctx.createBiquadFilter();
        b.type = type;
        b.frequency.value = f;
        b.Q.value = q;
        if (dest) b.connect(dest);
        owned.push(b);
        return b;
    }
    function makeBuffer(chs) {
        const b = ctx.createBuffer(chs.length, chs[0].length, fs);
        for (let c = 0; c < chs.length; c++) b.getChannelData(c).set(chs[c]);
        return b;
    }
    const aim = (param, v, t, tau) => param.setTargetAtTime(v, t, tau);

    // ---- the graph -------------------------------------------------------------------------
    const out = G(1, ctx.destination);
    const shaper = ctx.createWaveShaper();
    shaper.curve = ceilingCurve();
    shaper.oversample = 'none';
    shaper.connect(out);
    owned.push(shaper);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 8;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    comp.connect(shaper);
    owned.push(comp);
    const trim = G(TRIM, comp);

    const verb = ctx.createConvolver();
    verb.normalize = false;
    owned.push(verb);
    const verbRet = G(VERB_RETURN, trim);
    verb.connect(verbRet);
    const verbIn = G(1, verb);

    // music: a dry chain and a parallel wet chain (so volume, low-pass and freeze also hold the reverb)
    const musicVol = G(volCurve(0.8) * MUSIC_GAIN, trim);
    const musicVolW = G(volCurve(0.8) * MUSIC_GAIN, verbIn);
    const musicLP = Filter('lowpass', 20000, -3, musicVol);
    const musicLPW = Filter('lowpass', 20000, -3, musicVolW);
    const freezeG = G(1, musicLP);
    const freezeGW = G(1, musicLPW);
    const duck = G(1, freezeG);
    const duckW = G(1, freezeGW);
    const arrDry = G(1, duck);
    const arrWet = G(1, duckW);
    const stingDry = G(1, musicLP);
    const stingWet = G(1, musicLPW);
    const STING = { dry: stingDry, wet: G(0.3, stingWet) };
    const STING_HI = { dry: stingDry, wet: G(0.6, stingWet) };
    const stingPad = [Pan(-0.4, stingDry), Pan(0.4, stingDry)];
    stingPad.forEach((p) => {
        const s = G(0.45, stingWet);
        p.connect(s);
    });
    const stingPadIn = stingPad.map((p) => G(1, p));

    // effects: pan lanes and three reverb sends
    const sfxVol = G(volCurve(0.9), trim);
    const sfxVolW = G(volCurve(0.9), verbIn);
    const sfxDry = G(1, sfxVol);
    const sfxWet = G(1, sfxVolW);
    const LANES = [-0.6, -0.3, 0, 0.3, 0.6];
    const sfxLanes = LANES.map((p) => Pan(p, sfxDry));
    const SENDS = [0.1, 0.25, 0.5];
    const sfxSends = SENDS.map((v) => G(v, sfxWet));
    const laneFor = (pan) => sfxLanes[Math.round((clamp(pan, -0.6, 0.6) + 0.6) / 0.3)];
    const sendFor = (v) => (v <= 0.02 ? null : sfxSends[v < 0.17 ? 0 : v < 0.37 ? 1 : 2]);
    const SFX_MUSIC = { dry: sfxLanes[2], wet: sfxSends[1] };
    const SFX_MUSIC_HI = { dry: sfxLanes[2], wet: sfxSends[2] };

    // ambience beds (on the sfx volume), muffled under water
    const ambLP = Filter('lowpass', 20000, -3, sfxVol);
    ambLP.connect(G(0.3, sfxWet));
    const ambBus = G(1, ambLP);

    // Character voices have their own dry AND wet volume paths. Claw taps remain effects.
    // Optional future recorded lines can still connect to audio.voiceInput.
    const voiceVol = G(1, trim);
    const voiceVolW = G(1, verbIn);
    const voiceLanes = LANES.map((p) => Pan(p, voiceVol));
    const voiceSend = G(0.1, voiceVolW);
    const voiceLaneFor = (pan) => voiceLanes[Math.round((clamp(pan, -0.6, 0.6) + 0.6) / 0.3)];

    // ---- instruments ----------------------------------------------------------------------
    const instCache = new Map();
    function instBuf(inst, midi) {
        const key = inst + ':' + midi;
        let b = instCache.get(key);
        if (!b) {
            b = makeBuffer([INST_RENDER[inst](fs, midi, rngFor(key))]);
            instCache.set(key, b);
        }
        return b;
    }
    const drumBank = { boom: [], tone: [], tick: [], ghost: [] };
    function drumBuf(kind) {
        const bank = drumBank[kind];
        if (bank.length < 3) {
            const b = makeBuffer([renderDrum(fs, kind, rngFor('drum:' + kind + ':' + bank.length))]);
            bank.push(b);
            return b;
        }
        return bank[Math.floor(rng() * bank.length)];
    }
    const padWave = (() => {
        const n = 25;
        const re = new Float32Array(n);
        const im = new Float32Array(n);
        for (let k = 1; k < n; k++) im[k] = (1 / Math.pow(k, 1.28)) * (1 + 0.45 * Math.exp(-Math.pow((k - 3) / 1.8, 2))) * (k > 10 ? Math.exp(-(k - 10) / 3) : 1);
        return ctx.createPeriodicWave(re, im);
    })();
    const droneWave = (() => {
        const amps = [0, 1, 0.55, 0.35, 0.22, 0.14, 0.09, 0.05, 0.03];
        return ctx.createPeriodicWave(new Float32Array(amps.length), Float32Array.from(amps));
    })();

    function onEnded() {
        live.delete(this);
        voices--;
        if (this._sfx) sfxCount[this._sfx]--;
    }
    // one-shot buffer voice → dest.dry (+ dest.wet)
    function play(buffer, t, dest, gain, rate = 1, release = 0, sfxName = null) {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        if (rate !== 1) src.playbackRate.value = rate;
        const g = ctx.createGain();
        g.gain.value = gain;
        src.connect(g);
        g.connect(dest.dry);
        if (dest.wet) g.connect(dest.wet);
        if (release) {
            g.gain.setValueAtTime(gain, t + release);
            g.gain.setTargetAtTime(0, t + release, 0.07);
        }
        src.onended = onEnded;
        if (sfxName) {
            src._sfx = sfxName;
            sfxCount[sfxName] = (sfxCount[sfxName] || 0) + 1;
        }
        live.add(src);
        voices++;
        src.start(Math.max(t, ctx.currentTime));
        if (release) src.stop(t + release + 0.5);
        return src;
    }
    function playNote(inst, midi, t, dest, gain, release = 0) {
        return play(instBuf(inst, midi), t, dest, gain * INST_GAIN[inst], 1, release);
    }
    // a bowed chord: two detuned oscillators per note (one per side), slow attack, gentle vibrato
    function padVoice(notes, t, dur, { attack = 0.6, release = 0.9, level = PAD_LEVEL, inL, inR }) {
        const gL = ctx.createGain();
        const gR = ctx.createGain();
        gL.connect(inL);
        gR.connect(inR);
        const end = t + dur + release;
        for (const g of [gL, gR]) {
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(level, t + attack);
            g.gain.setValueAtTime(level, t + dur);
            g.gain.linearRampToValueAtTime(0, end);
        }
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 3.5 + rng() * 0.6;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(2.6, t + attack + 0.8);
        lfo.connect(depth);
        const oscs = [lfo];
        for (const m of notes) {
            const f = mtof(m);
            for (let side = 0; side < 2; side++) {
                const o = ctx.createOscillator();
                o.setPeriodicWave(padWave);
                o.frequency.value = f;
                o.detune.value = (side ? 4 : -4) + (rng() - 0.5);
                depth.connect(o.detune);
                o.connect(side ? gR : gL);
                oscs.push(o);
            }
        }
        for (const o of oscs) {
            o.onended = onEnded;
            live.add(o);
            voices++;
            o.start(t);
            o.stop(end + 0.05);
        }
    }

    // ---- arrangement players ----------------------------------------------------------------
    const motion = { speed: 0, underwater: false, hidden: false };
    let applied = { speed: -1, underwater: null, hidden: null, area: null };
    const players = [];
    let current = null;
    let curArea = null;
    let frozen = false;
    let freezeAt = Infinity; // scheduled stop (the freeze stinger)
    let frozenAt = -1; // audio time of the last immediate freeze(true)
    let songBar = 0;
    const muted = Object.create(null); // dev/QA: layers left out of the arrangement

    function makePlayer(area, startStep, t0) {
        const spec = ARR[area];
        const P = { area, spec, eighth: 60 / spec.bpm / 3, step: startStep, nextTime: t0, fading: false, stopAt: Infinity, killAt: Infinity, L: {}, nodes: [] };
        const node = (n) => {
            P.nodes.push(n);
            return n;
        };
        P.out = node(ctx.createGain());
        P.wet = node(ctx.createGain());
        P.out.gain.value = 0;
        P.wet.gain.value = 0;
        P.out.connect(arrDry);
        P.wet.connect(arrWet);
        for (const name of LAYERS) {
            const cfg = spec[name];
            if (!cfg) continue;
            const send = node(ctx.createGain());
            send.gain.value = cfg.send;
            send.connect(P.wet);
            const L = { target: 0, gains: [], dest: null, cfg };
            const sides = name === 'pad' ? [-0.45, 0.45] : [LAYER_PAN[name]];
            for (const p of sides) {
                const g = node(ctx.createGain());
                g.gain.value = 0;
                let o = P.out;
                if (canPan && p) {
                    const pn = node(ctx.createStereoPanner());
                    pn.pan.value = p;
                    pn.connect(P.out);
                    o = pn;
                }
                g.connect(o);
                g.connect(send);
                L.gains.push(g);
            }
            L.dest = { dry: L.gains[0], wet: null };
            if (cfg.lp && name !== 'pad') {
                const f = node(ctx.createBiquadFilter());
                f.type = 'lowpass';
                f.frequency.value = cfg.lp;
                f.Q.value = -3;
                f.connect(L.gains[0]);
                L.dest = { dry: f, wet: null };
            }
            P.L[name] = L;
        }
        if (spec.pad) {
            P.padLP = [];
            for (const g of P.L.pad.gains) {
                const f = node(ctx.createBiquadFilter());
                f.type = 'lowpass';
                f.frequency.value = spec.pad.lp;
                f.Q.value = -3;
                f.connect(g);
                P.padLP.push(f);
            }
        }
        P.names = Object.keys(P.L);
        players.push(P);
        return P;
    }
    function layerTarget(P, name) {
        const cfg = P.spec[name];
        if (!cfg) return 0;
        let v = cfg.level;
        const sp = motion.speed;
        if (name === 'drum') v *= Math.max(cfg.min || 0, smoothstep(0.3, 0.75, sp)); // walk ≈ 0.27, trot ≈ 0.53, gallop = 1
        if (name === 'acc' && cfg.mode === 'adaptive') v *= 0.55 + 0.45 * smoothstep(0.1, 0.8, sp);
        if (motion.hidden) v *= HIDE_MUL[name];
        return v;
    }
    function applyLayers(P, now, tau) {
        const names = P.names;
        for (let i = 0; i < names.length; i++) {
            const L = P.L[names[i]];
            const v = layerTarget(P, names[i]);
            if (Math.abs(v - L.target) > 0.003) {
                L.target = v;
                for (let k = 0; k < L.gains.length; k++) aim(L.gains[k].gain, v, now, tau);
            }
        }
    }
    function fadePlayerOut(P, now, tau = 0.35) {
        P.fading = true;
        aim(P.out.gain, 0, now, tau);
        aim(P.wet.gain, 0, now, tau);
        P.stopAt = now + tau * 4;
        P.killAt = P.stopAt + 4.5;
    }
    function killPlayer(P) {
        for (const n of P.nodes) {
            try {
                n.disconnect();
            } catch {
                /* already disconnected */
            }
        }
        P.nodes.length = 0;
        const i = players.indexOf(P);
        if (i >= 0) players.splice(i, 1);
    }
    const hum = () => (rng() - 0.5) * 0.008;

    function stepPlayer(P, t) {
        const s = P.step % CYCLE_STEPS;
        const bar = (s / BAR_STEPS) | 0;
        const pos = s - bar * BAR_STEPS;
        const spec = P.spec;
        const e = P.eighth;
        const ch = CHORDS[chordNameAt(bar, pos, spec.picardy)];
        const sp = motion.speed;
        const busy = voices > 84; // voice budget: skip the accompaniment rather than pile up
        const dyn = BAR_DYN[bar];
        t += LILT[pos] * (e / 0.25);
        songBar = bar;
        const on = (name) => P.L[name] && !muted[name] && (P.L[name].target > 0.004 || P.L[name].gains[0].gain.value > 0.004);

        // melody
        if (spec.mel && on('mel')) {
            const m = MEL_MIDI[s];
            if (m >= 0 && (spec.mel.mode === 'full' || pos === 0 || pos === 3)) {
                const v = (pos === 0 ? 1 : pos === 3 ? 0.9 : 0.76) * dyn * (0.93 + 0.1 * rng());
                playNote(spec.mel.inst, m, t + hum(), P.L.mel.dest, v);
                if (spec.mel.inst === 'lyre' && spec.mel.mode === 'sparse' && MEL_LEN[s] >= 3) playNote('lyre', m - 12, t + 0.012, P.L.mel.dest, 0.35 * v);
            }
        }
        // lyre harmonics: echo phrase ends (table) or double strong beats an octave up (bay, final)
        if (spec.harm && on('harm') && !busy) {
            const m = MEL_MIDI[s];
            if (spec.harm.mode === 'echo') {
                if ((bar & 1) === 1 && pos === 3 && rng() < 0.8) {
                    const ref = MEL_MIDI[bar * BAR_STEPS] >= 0 ? MEL_MIDI[bar * BAR_STEPS] : 74;
                    playNote('harm', ref + 12, t + e * 0.5, P.L.harm.dest, 0.55);
                }
            } else if (m >= 0 && (pos === 0 || pos === 3)) {
                playNote('harm', m + 12, t + 0.01, P.L.harm.dest, pos === 0 ? 0.6 : 0.45);
            }
        }
        // pad: one chord per bar (bar 7 of tune A is split)
        if (spec.pad && on('pad') && (pos === 0 || (bar === 6 && pos === 3))) {
            const len = bar === 6 ? 3 : BAR_STEPS;
            padVoice(ch.pad, t, len * e, { attack: spec.pad.attack, release: Math.max(0.5, spec.pad.attack), inL: P.padLP[0], inR: P.padLP[1] });
        }
        // accompaniment
        if (spec.acc && on('acc') && !busy) {
            let mode = spec.acc.mode;
            if (mode === 'adaptive') mode = sp >= 0.62 ? 'strum' : sp >= 0.38 ? 'strum-half' : 'arp';
            const d = P.L.acc.dest;
            if (mode === 'arp' || mode === 'arp-soft') {
                const pat = mode === 'arp' ? ARP : ARP_SOFT;
                const boost = mode === 'arp' ? 0.8 + 0.4 * sp : 1;
                for (let i = 0; i < pat.length; i += 3) {
                    if (pat[i] !== pos) continue;
                    const m = pat[i + 1] < 0 ? ch.bass : ch.tones[pat[i + 1]];
                    playNote('lyre', m, t + hum(), d, pat[i + 2] * boost * dyn);
                }
            } else if (mode === 'strum' || mode === 'strum-half') {
                const pat = mode === 'strum' ? STRUM_FULL : STRUM_HALF;
                for (let i = 0; i < pat.length; i += 3) {
                    if (pat[i] !== pos) continue;
                    const up = pat[i + 1] < 0;
                    const v = pat[i + 2];
                    const notes = ch.strum;
                    const ring = pos === 0 ? 0 : e * 1.6;
                    for (let k = 0; k < notes.length; k++) {
                        const idx = up ? notes.length - 1 - k : k;
                        if (up && idx === 0) continue; // up-strums skip the bass string
                        playNote('lyre', notes[idx], t + k * (up ? 0.012 : 0.017) + hum() * 0.5, d, v * dyn * (0.8 + 0.2 * rng()) * 0.55, ring);
                    }
                }
            } else if (mode === 'sparse') {
                if (pos === 0) playNote('lyre', ch.bass, t + hum(), d, 0.55);
                else if (pos === 3) playNote('lyre', ch.tones[1 + (bar & 1)], t + hum(), d, 0.34);
            } else if (mode === 'sea') {
                if (pos === 0 && (bar & 1) === 0) playNote('lyre', ch.bass, t, d, 0.42);
            }
        }
        // hand drum
        if (spec.drum && on('drum') && !busy) {
            const lvl = Math.max(spec.drum.min || 0, sp);
            const idx = lvl < 0.3 ? 0 : lvl < 0.45 ? 1 : lvl < 0.72 ? 2 : 3; // none (walk) … canter figure (gallop)
            const pat = DRUMS[idx];
            const fill = idx >= 2 && (bar === 7 || bar === 15);
            for (let i = 0; i < pat.length; i += 3) {
                const p = pat[i];
                if (p !== pos && p !== pos + 0.5) continue;
                if (fill && p >= 4) continue;
                play(drumBuf(pat[i + 1]), t + (p - pos) * e + hum() * 0.5, P.L.drum.dest, pat[i + 2] * 0.45, 0.985 + 0.03 * rng());
            }
            if (fill) {
                for (let i = 0; i < FILL.length; i += 3) {
                    const p = FILL[i];
                    if (p !== pos && p !== pos + 0.5) continue;
                    play(drumBuf(FILL[i + 1]), t + (p - pos) * e, P.L.drum.dest, FILL[i + 2] * 0.45);
                }
            }
        }
        // pencil scratches in the gaps (the table)
        if (spec.tex && on('tex') && (pos === 1 || pos === 4) && rng() < 0.33) {
            pencilStroke(rr(rng, 0.15, 0.5), t + rr(rng, 0, e * 0.5), P.L.tex.dest, rr(rng, 0.5, 0.9));
        }
    }

    // ---- scheduler ---------------------------------------------------------------------------
    let timer = null;
    function tick() {
        if (disposed) return;
        const now = ctx.currentTime;
        const horizon = now + LOOKAHEAD;
        if (freezeAt !== Infinity && now >= freezeAt) {
            frozen = true;
            freezeAt = Infinity;
        }
        for (let i = players.length - 1; i >= 0; i--) {
            const P = players[i];
            if (now > P.killAt) {
                killPlayer(P);
                continue;
            }
            if (frozen) continue;
            if (P.nextTime < now - 0.02) {
                const k = Math.ceil((now + 0.03 - P.nextTime) / P.eighth);
                P.step += k;
                P.nextTime += k * P.eighth;
            }
            const limit = Math.min(horizon, P.stopAt, freezeAt);
            while (P.nextTime < limit) {
                stepPlayer(P, P.nextTime);
                P.step++;
                P.nextTime += P.eighth;
            }
        }
        manageDrone(now);
        manageBeds(now);
    }
    function startTimer() {
        if (offline || timer || disposed) return;
        timer = setInterval(tick, TICK_MS);
    }
    function stopTimer() {
        if (timer) clearInterval(timer);
        timer = null;
    }

    // ---- sea drone (global: the sea area, or any area while under water) ------------------------
    const droneOut = G(0, arrDry);
    droneOut.connect(G(0.35, arrWet));
    let drone = null;
    let droneTarget = 0;
    let droneIdle = 0;
    function manageDrone(now) {
        if (droneTarget > 0 && !drone) {
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 420;
            lp.Q.value = -1;
            lp.connect(droneOut);
            const breath = ctx.createGain();
            breath.gain.value = 1;
            breath.connect(lp);
            const nodes = [lp, breath];
            const srcs = [];
            for (const [m, a, det] of [[38, 1, -3], [45, 0.6, 3], [50, 0.45, -2], [50, 0.3, 4]]) {
                const o = ctx.createOscillator();
                o.setPeriodicWave(droneWave);
                o.frequency.value = mtof(m);
                o.detune.value = det;
                const g = ctx.createGain();
                g.gain.value = a;
                o.connect(g);
                g.connect(breath);
                nodes.push(g);
                srcs.push(o);
            }
            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.09;
            const lfoG = ctx.createGain();
            lfoG.gain.value = 0.25;
            lfo.connect(lfoG);
            lfoG.connect(breath.gain);
            const lfo2 = ctx.createOscillator();
            lfo2.frequency.value = 0.061;
            const lfo2G = ctx.createGain();
            lfo2G.gain.value = 140;
            lfo2.connect(lfo2G);
            lfo2G.connect(lp.frequency);
            nodes.push(lfoG, lfo2G);
            srcs.push(lfo, lfo2);
            for (const o of srcs) {
                persistent.add(o);
                o.start(now);
            }
            drone = { nodes, srcs };
        }
        if (drone) {
            if (droneTarget > 0) droneIdle = now;
            else if (now - droneIdle > 5) {
                for (const o of drone.srcs) {
                    try {
                        o.stop(now);
                    } catch {
                        /* stopped */
                    }
                    persistent.delete(o);
                }
                const d = drone;
                drone = null;
                for (const n of d.nodes.concat(d.srcs)) n.disconnect();
            }
        }
    }
    function updateDrone(now) {
        const areaLevel = current ? current.spec.drone || 0 : 0;
        const v = muted.drone ? 0 : Math.max(areaLevel, motion.underwater ? 0.6 : 0);
        if (Math.abs(v - droneTarget) > 0.001) {
            droneTarget = v;
            aim(droneOut.gain, v * DRONE_LEVEL, now, 0.7);
            if (v > 0) manageDrone(now);
        }
    }

    // ---- ambience beds ------------------------------------------------------------------------
    const bedCache = Object.create(null);
    const beds = Object.create(null); // name → { src, g, target, idle }
    let bedArea = null;
    let environment = null;
    function bedBuf(name) {
        if (!bedCache[name]) bedCache[name] = makeBuffer([renderBed(fs, rngFor('bed:' + name), name)]);
        return bedCache[name];
    }
    function updateBeds(now) {
        const want = Object.assign({}, bedArea === 'final' ? AREA_BEDS.final : ENV_BEDS[environment] || AREA_BEDS[bedArea] || {});
        if (motion.underwater) {
            for (const k in want) want[k] *= 0.5;
            want.under = 1;
        }
        for (const name of ['wind', 'under', 'waves', 'lap']) {
            const v = muted.beds ? 0 : (want[name] || 0) * BED_LEVEL[name];
            let b = beds[name];
            if (v > 0 && !b) {
                const src = ctx.createBufferSource();
                src.buffer = bedBuf(name);
                src.loop = true;
                const g = ctx.createGain();
                g.gain.value = 0;
                src.connect(g);
                g.connect(ambBus);
                persistent.add(src);
                src.start(now, rng() * 2);
                b = beds[name] = { src, g, target: -1, idle: now };
            }
            if (b && Math.abs(b.target - v) > 0.001) {
                b.target = v;
                aim(b.g.gain, v, now, v > 0 ? 0.8 : 0.5);
            }
        }
        aim(ambLP.frequency, motion.underwater ? 650 : 20000, now, 0.15);
    }
    function manageBeds(now) {
        for (const name in beds) {
            const b = beds[name];
            if (b.target > 0) b.idle = now;
            else if (now - b.idle > 4) {
                try {
                    b.src.stop(now);
                } catch {
                    /* stopped */
                }
                persistent.delete(b.src);
                b.src.disconnect();
                b.g.disconnect();
                delete beds[name];
            }
        }
    }

    // ---- effects --------------------------------------------------------------------------------
    const sfxBanks = Object.create(null);
    function bankGet(key, max, render) {
        let bank = sfxBanks[key];
        if (!bank) bank = sfxBanks[key] = { list: [], last: -1 };
        let i;
        if (bank.list.length < max) {
            const r = render(rngFor(key + ':' + bank.list.length));
            bank.list.push({ buffer: makeBuffer(r.ch), send: r.send });
            i = bank.list.length - 1;
        } else {
            i = Math.floor(rng() * bank.list.length);
            if (i === bank.last && bank.list.length > 1) i = (i + 1) % bank.list.length;
        }
        bank.last = i;
        return bank.list[i];
    }
    const PENCIL_LENGTHS = [0.3, 0.7, 1.4, 2.2];
    function pencilBuf(len) {
        let q = PENCIL_LENGTHS[PENCIL_LENGTHS.length - 1];
        for (let i = 0; i < PENCIL_LENGTHS.length; i++) {
            if (len <= PENCIL_LENGTHS[i]) {
                q = PENCIL_LENGTHS[i];
                break;
            }
        }
        return bankGet('pencil:' + q, 3, (r) => renderPencil(fs, r, q, 0.6)).buffer;
    }
    // a pencil stroke of `len` seconds: a rendered stroke at least that long, released at len
    function pencilStroke(len, t, dest, gain, rate = 1) {
        const b = pencilBuf(len);
        return play(b, t, dest, gain, rate, len < b.duration - 0.05 ? Math.max(0.03, len) : 0, 'pencil');
    }
    let resumeAsked = -1e9;
    const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const audible = () => !disposed && (offline || ctx.state === 'running' || nowMs() - resumeAsked < 1500);

    function sfx(name, opts) {
        if (!audible()) return;
        const o = opts || {};
        const t = ctx.currentTime + 0.005;
        const gm = o.gain == null ? 1 : clamp(o.gain, 0, 2);
        const poly = SFX_POLY[name] || 4;
        if ((sfxCount[name] || 0) >= poly || voices > 120) return;
        if (name === 'hoof') {
            const surface = SURFACES.indexOf(o.surface) >= 0 ? o.surface : SURFACE_ALIAS[o.surface] || 'sand';
            const sp = clamp(o.speed01 == null ? 0.5 : o.speed01, 0, 1);
            const hard = sp >= 0.62;
            const v = bankGet('hoof:' + surface + ':' + (hard ? 'hard' : 'soft'), 4, (r) => renderHoof(fs, r, surface, hard ? 0.9 : 0.3));
            const foot = Number.isInteger(o.foot) ? o.foot : null;
            const lane = o.pan == null ? (foot == null ? (rng() - 0.5) * 0.3 : (foot < 2 ? -0.16 : 0.16)) : o.pan;
            const accent = foot == null ? 1 : [0.94, 0.86, 1, 0.92][foot & 3];
            play(v.buffer, t, { dry: laneFor(lane), wet: sendFor(v.send) }, gm * accent * (0.4 + 0.5 * sp) * (0.93 + 0.14 * rng()), 0.96 + 0.06 * sp + 0.025 * (rng() - 0.5), 0, name);
            return;
        }
        if (name === 'sparkle') {
            const pool = [74, 76, 81, 83, 86, 88];
            let tt = t;
            for (let k = 0; k < 5; k++) {
                playNote('harm', pool[Math.floor(rng() * pool.length)], tt, SFX_MUSIC_HI, gm * (0.55 - 0.07 * k));
                tt += rr(rng, 0.07, 0.11);
            }
            return;
        }
        if (name === 'pickup' || name === 'colorin') {
            const v = bankGet(name, 3, (r) => SFX_RENDER[name](fs, r, o));
            play(v.buffer, t, { dry: laneFor(0), wet: sendFor(v.send) }, gm, 1, 0, name);
            const notes = name === 'pickup' ? (rng() < 0.5 ? [74, 81, 86] : [76, 81, 88]) : [74, 77, 81, 84];
            const t0 = name === 'pickup' ? t + 0.06 : t + 0.25;
            const gap = name === 'pickup' ? 0.075 : 0.12;
            notes.forEach((m, k) => playNote('harm', m, t0 + k * gap, SFX_MUSIC_HI, gm * (0.5 + 0.08 * k)));
            return;
        }
        const render = SFX_RENDER[name];
        if (!render) return;
        let key = name;
        let ro = o;
        let gain = gm;
        if (name === 'ui') {
            const kind = ['open', 'close', 'tab', 'confirm'].includes(o.kind) ? o.kind : 'tab';
            key = 'ui:' + kind;
            ro = { kind };
        } else if (name === 'splash') {
            const size = clamp(o.size == null ? 0.6 : o.size, 0, 1);
            const b = size < 0.34 ? 0 : size < 0.67 ? 1 : 2;
            key = 'splash:' + b;
            ro = { size: [0.2, 0.5, 0.85][b] };
            gain *= 0.75 + 0.35 * size;
        } else if (name === 'pencil') {
            const len = clamp(o.len == null ? 0.4 : o.len, 0.04, 4);
            if (len > 2.2) {
                const r = renderPencil(fs, rngFor('pencil-long:' + Math.floor(rng() * 1e9)), len, o.speed01 == null ? 0.6 : o.speed01);
                play(makeBuffer(r.ch), t, { dry: laneFor(o.pan || 0), wet: sendFor(r.send) }, gm, 1, 0, name);
                return;
            }
            const sp = clamp(o.speed01 == null ? 0.6 : o.speed01, 0, 1);
            pencilStroke(len, t, { dry: laneFor(o.pan || 0), wet: sfxSends[0] }, gm * (0.6 + 0.5 * sp), 0.95 + 0.1 * sp);
            return;
        }
        const v = bankGet(key, SFX_VARIANTS[name] || 3, (r) => render(fs, r, ro));
        const wide = name === 'gull' || name === 'drip' || name === 'bubble' || name === 'crabclick';
        const lane = o.pan == null ? (rng() - 0.5) * (wide ? 1 : 0.3) : o.pan;
        const rate = name === 'neigh' || name === 'blubb' || name === 'gull' ? 0.97 + 0.06 * rng() : 0.96 + 0.08 * rng();
        const dest = VOICE_SFX.has(name) ? { dry: voiceLaneFor(lane), wet: voiceSend } : { dry: laneFor(lane), wet: sendFor(v.send) };
        play(v.buffer, t, dest, gain * (0.9 + 0.16 * rng()), rate, 0, name);
    }

    // ---- stingers -------------------------------------------------------------------------------
    let duckUntil = 0;
    function duckFor(level, t0, t1, tauIn = 0.08, tauOut = 0.6) {
        duckUntil = Math.max(duckUntil, t1);
        for (const g of [duck, duckW]) {
            g.gain.cancelScheduledValues(t0);
            aim(g.gain, level, t0, tauIn);
            aim(g.gain, 1, duckUntil, tauOut);
        }
    }
    const lyreS = (m, t, v, dest = STING, release = 0) => playNote('lyre', m, t, dest, v, release);
    const harmS = (m, t, v) => playNote('harm', m, t, STING_HI, v);
    const padS = (notes, t, dur, attack = 0.4, level = PAD_LEVEL * 1.2) => padVoice(notes, t, dur, { attack, release: 0.9, level, inL: stingPadIn[0], inR: stingPadIn[1] });
    function strumS(notes, t, v, gap = 0.016) {
        notes.forEach((m, k) => lyreS(m, t + k * gap, v * (0.85 + 0.15 * rng())));
    }
    let swellBuf = null;
    function unfreeze(t) {
        frozen = false;
        freezeAt = Infinity;
        for (const g of [freezeG, freezeGW]) {
            g.gain.cancelScheduledValues(t);
            aim(g.gain, 1, t, 0.012);
        }
        verbRet.gain.cancelScheduledValues(t);
        aim(verbRet.gain, VERB_RETURN, t, 0.03);
        for (const P of players) {
            if (P.fading) continue;
            P.step = Math.ceil(P.step / BAR_STEPS) * BAR_STEPS;
            P.nextTime = t + 0.05;
        }
    }
    function freezeAtTime(t) {
        freezeAt = t;
        for (const g of [freezeG, freezeGW, verbRet]) {
            g.gain.cancelScheduledValues(t);
            g.gain.setTargetAtTime(0, t, 0.004);
        }
    }
    const STINGER_FN = {
        aha(t) {
            [69, 72, 74, 76].forEach((m, k) => lyreS(m, t + k * 0.075, 0.55 + 0.12 * k));
            harmS(81, t + 0.3, 0.55);
            duckFor(0.45, t, t + 1.1);
            return 1.6;
        },
        reveal(t) {
            const t1 = t + 1.6;
            const e = 0.24;
            duckFor(0, t, t1 + 3.2, 0.07, 1.1);
            let tt = t1;
            for (let k = 0; k < 8; k++) {
                const [m, len] = TUNE_A[k];
                lyreS(m, tt, k === 0 || k === 5 ? 0.95 : 0.8);
                tt += len * e;
            }
            padS(CHORDS.Dm.pad, t1, 6 * e, 0.5);
            padS(CHORDS.F.pad, t1 + 6 * e, 6 * e, 0.4);
            harmS(86, tt, 0.5);
            return tt - t + 1.5;
        },
        chapter(t) {
            const e = 0.3;
            duckFor(0.12, t, t + 4.6, 0.2, 1.3);
            const line = [[74, 2], [72, 1], [69, 1], [71, 1], [72, 1], [74, 6]];
            let tt = t;
            for (const [m, len] of line) {
                lyreS(m, tt, 0.85);
                tt += len * e;
            }
            const tEnd = t + 6 * e;
            padS(CHORDS.Am.pad, t, 3 * e, 0.3);
            padS(CHORDS.G.pad, t + 3 * e, 3 * e, 0.3);
            padS([57, 62, 64, 65], tEnd, 2.8, 0.25);
            strumS([50, 57, 62, 64, 65, 69], tEnd, 0.8, 0.022);
            harmS(86, tEnd + 0.35, 0.5);
            harmS(81, tEnd + 0.6, 0.45);
            [0.55, 0.38, 0.26, 0.17, 0.11].forEach((dt, k) => play(drumBuf('tone'), tEnd - dt, STING, 0.2 + 0.07 * k));
            play(drumBuf('boom'), tEnd, STING, 0.5);
            return tEnd - t + 3;
        },
        freeze(t) {
            if (!swellBuf) swellBuf = makeBuffer([renderReverseSwell(fs, rngFor('swell'))]);
            // freeze(true) called in the same moment: let the music run under the swell instead
            if (frozen && t - frozenAt < 0.12) {
                frozen = false;
                for (const g of [freezeG, freezeGW]) {
                    g.gain.cancelScheduledValues(frozenAt);
                    g.gain.setTargetAtTime(1, t - 0.02, 0.003);
                }
                verbRet.gain.cancelScheduledValues(frozenAt);
                verbRet.gain.setTargetAtTime(VERB_RETURN, t - 0.02, 0.003);
            }
            play(swellBuf, t, { dry: stingDry, wet: null }, 0.9);
            freezeAtTime(t + swellBuf.duration);
            return swellBuf.duration;
        },
        plask(t) {
            if (frozen || freezeAt !== Infinity) unfreeze(t);
            sfx('splash', { size: 1 });
            strumS([50, 57, 62, 66, 69, 76], t + 0.04, 0.9, 0.014);
            harmS(78, t + 0.3, 0.45);
            harmS(81, t + 0.42, 0.45);
            harmS(86, t + 0.56, 0.5);
            padS(CHORDS.D.pad.concat([64]), t + 0.04, 2.4, 0.25);
            play(drumBuf('boom'), t + 0.04, STING, 0.55);
            duckFor(0.4, t, t + 2.2);
            return 3.4;
        },
        leap(t) {
            const run = [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81];
            run.forEach((m, k) => lyreS(m, t + k * 0.045, 0.35 + (0.4 * k) / run.length));
            padS([55, 62, 67, 69, 71], t + 0.5, 1.5, 0.35);
            harmS(83, t + 0.62, 0.5);
            harmS(86, t + 0.9, 0.45);
            harmS(81, t + 1.2, 0.4);
            const tl = t + 2.1;
            strumS([50, 57, 62, 65, 69, 74], tl, 0.85);
            play(drumBuf('boom'), tl, STING, 0.55);
            padS(CHORDS.Dm.pad, tl, 1.4, 0.2);
            duckFor(0.25, t, t + 3.0);
            return 4;
        },
        unfold(t) {
            padS([57, 60, 65, 67], t, 1.5, 0.8);
            padS([59, 62, 67, 69], t + 1.4, 1.5, 0.6);
            padS(CHORDS.D.pad, t + 2.8, 2.6, 0.5);
            [53, 60, 65, 69, 72].forEach((m, k) => lyreS(m, t + 0.1 + k * 0.1, 0.55));
            [55, 62, 67, 71, 74].forEach((m, k) => lyreS(m, t + 1.5 + k * 0.1, 0.6));
            [50, 57, 62, 66, 69, 74, 78, 81].forEach((m, k) => lyreS(m, t + 2.9 + k * 0.09, 0.62 + 0.03 * k));
            harmS(86, t + 3.75, 0.5);
            duckFor(0.2, t, t + 5.2, 0.3, 1.2);
            return 6.2;
        },
        discovery(t) {
            [74, 77, 81, 84, 88].forEach((m, k) => harmS(m, t + k * 0.12, 0.6 - 0.05 * k));
            lyreS(50, t, 0.6);
            padS([57, 62, 64, 65], t, 2.2, 0.3, PAD_LEVEL);
            duckFor(0.5, t, t + 2);
            return 2.8;
        }
    };

    // ---- public API ----------------------------------------------------------------------------
    function applyMotion(force) {
        const now = ctx.currentTime;
        const speedMoved = Math.abs(motion.speed - applied.speed) > 0.03;
        const flags = motion.underwater !== applied.underwater || motion.hidden !== applied.hidden;
        const areaChanged = applied.area !== curArea;
        if (!force && !speedMoved && !flags && !areaChanged) return;
        applied.speed = motion.speed;
        applied.underwater = motion.underwater;
        applied.hidden = motion.hidden;
        applied.area = curArea;
        if (current) applyLayers(current, now, flags ? 0.3 : 0.25);
        if (flags || areaChanged || force) {
            const lp = motion.underwater ? (current ? current.spec.underLP : 800) : 20000;
            aim(musicLP.frequency, lp, now, motion.underwater ? 0.12 : 0.25);
            aim(musicLPW.frequency, lp, now, motion.underwater ? 0.12 : 0.25);
            updateDrone(now);
            updateBeds(now);
        }
    }

    function setArea(area) {
        if (disposed || (!ARR[area] && area !== 'quiet') || area === curArea) return;
        const now = ctx.currentTime;
        const prev = current;
        let start = 0;
        if (prev) {
            start = (Math.floor(prev.step / BAR_STEPS) + 1) * BAR_STEPS;
            fadePlayerOut(prev, now);
        }
        curArea = area;
        current = null;
        if (area !== 'quiet') {
            bedArea = area;
            current = makePlayer(area, start % CYCLE_STEPS, now + (prev ? 0.3 : 0.08));
            const tau = prev ? 0.6 : 0.15;
            aim(current.out.gain, 1, now, tau);
            aim(current.wet.gain, 1, now, tau);
        }
        applyMotion(true);
        tick();
    }

    function setMotion(m) {
        if (disposed || !m) return;
        if (m.speed01 != null) {
            const s = +m.speed01;
            motion.speed = s > 0 ? (s < 1 ? s : 1) : 0;
        }
        if (m.underwater != null) motion.underwater = !!m.underwater;
        if (m.hidden != null) motion.hidden = !!m.hidden;
        applyMotion(false);
    }

    function setEnvironment(name) {
        if (disposed || (name != null && !ENVIRONMENTS.includes(name)) || name === environment) return;
        environment = name == null ? null : name;
        updateBeds(ctx.currentTime);
    }

    function setVolumes(v) {
        if (disposed || !v) return;
        const now = ctx.currentTime;
        if (v.music != null) {
            aim(musicVol.gain, volCurve(v.music) * MUSIC_GAIN, now, 0.05);
            aim(musicVolW.gain, volCurve(v.music) * MUSIC_GAIN, now, 0.05);
        }
        if (v.sfx != null) {
            aim(sfxVol.gain, volCurve(v.sfx), now, 0.05);
            aim(sfxVolW.gain, volCurve(v.sfx), now, 0.05);
        }
        if (v.voice != null) {
            aim(voiceVol.gain, volCurve(v.voice), now, 0.05);
            aim(voiceVolW.gain, volCurve(v.voice), now, 0.05);
        }
    }

    function stinger(name) {
        const fn = STINGER_FN[name];
        if (!fn || !audible()) return 0;
        return fn(ctx.currentTime + 0.02);
    }

    function freeze(on) {
        if (disposed) return;
        const now = ctx.currentTime;
        if (on) {
            if (freezeAt !== Infinity && freezeAt - now < 1.5) return; // the freeze stinger stops it at the end of its swell
            if (!frozen) {
                freezeAtTime(now);
                frozenAt = now;
            }
            frozen = true;
            freezeAt = Infinity;
        } else if (frozen || freezeAt !== Infinity) {
            unfreeze(now);
            tick();
        }
    }

    function note(i, o) {
        if (!audible()) return;
        const opts = o || {};
        const inst = INST_ALIAS[opts.inst] || 'lyre';
        const d = Math.round(Number(i) || 0);
        const vel = opts.vel == null ? 1 : clamp(opts.vel, 0, 1.5);
        playNote(inst, degreeToMidi(clamp(d, -7, 14)), ctx.currentTime + 0.005, inst === 'harm' ? SFX_MUSIC_HI : SFX_MUSIC, vel);
    }

    function phrase(n, o) {
        if (!audible()) return 0;
        const opts = o || {};
        const inst = INST_ALIAS[opts.inst] || 'lyre';
        const count = clamp(Math.round(Number(n) || 0), 0, TUNE_A.length);
        const e = opts.eighth || 0.24;
        const t0 = ctx.currentTime + 0.02;
        let t = t0;
        for (let k = 0; k < count; k++) {
            const [m, len] = TUNE_A[k];
            playNote(inst, m, t, inst === 'harm' ? SFX_MUSIC_HI : SFX_MUSIC, k === 0 || len >= 2 ? 1 : 0.85);
            t += len * e;
        }
        return t - t0;
    }

    function resume() {
        if (disposed || offline) return Promise.resolve();
        startTimer();
        if (ctx.state !== 'running') {
            resumeAsked = nowMs();
            try {
                return ctx.resume().catch(() => {});
            } catch {
                return Promise.resolve();
            }
        }
        return Promise.resolve();
    }
    // The scheduler timer keeps running while suspended (it idles: the clock stands still), so music
    // also comes back if the host resumes the shared context itself.
    function suspend() {
        if (disposed || offline) return Promise.resolve();
        if (ctx.state === 'running') {
            try {
                return ctx.suspend().catch(() => {});
            } catch {
                return Promise.resolve();
            }
        }
        return Promise.resolve();
    }

    // optional listeners (the game may do this itself): resume on any gesture while not running,
    // suspend while the page is hidden
    let unlisten = null;
    if (lifecycle && !offline && typeof document !== 'undefined') {
        const kick = () => {
            if (ctx.state !== 'running') resume(); // also iOS 'interrupted' (a call, Siri, an app switch)
        };
        const vis = () => (document.hidden ? suspend() : resume());
        const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'touchend'];
        for (const ev of GESTURES) document.addEventListener(ev, kick, true);
        document.addEventListener('visibilitychange', vis);
        unlisten = () => {
            for (const ev of GESTURES) document.removeEventListener(ev, kick, true);
            document.removeEventListener('visibilitychange', vis);
        };
    }

    function dispose() {
        if (disposed) return;
        disposed = true;
        stopTimer();
        if (unlisten) unlisten();
        const now = ctx.currentTime;
        try {
            out.gain.cancelScheduledValues(now);
            out.gain.setTargetAtTime(0, now, 0.008);
        } catch {
            /* closed */
        }
        const stopAll = () => {
            for (const s of live) {
                try {
                    s.stop();
                } catch {
                    /* not started or stopped */
                }
            }
            for (const s of persistent) {
                try {
                    s.stop();
                } catch {
                    /* stopped */
                }
            }
            live.clear();
            persistent.clear();
            for (const P of players.slice()) killPlayer(P);
            if (drone) for (const n of drone.nodes.concat(drone.srcs)) n.disconnect();
            for (const n of owned) {
                try {
                    n.disconnect();
                } catch {
                    /* disconnected */
                }
            }
            if (ownCtx && ctx.state !== 'closed') ctx.close().catch(() => {});
        };
        if (offline || ctx.state !== 'running') stopAll();
        else setTimeout(stopAll, 80); // after a click-free fade
    }

    // ---- ready: render what the music needs now, the rest lazily / in idle time --------------------
    const LYRE_SET = [45, 48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 66, 67, 69, 71, 72, 74, 76, 77, 79, 81];
    const pause = () => new Promise((r) => setTimeout(r, 0));
    // never rejects: if something fails to render, the rest still plays (and renders lazily)
    const ready = (async () => {
        try {
            verb.buffer = makeBuffer(renderReverb(fs, rngFor('reverb')));
            for (const k of ['boom', 'tone', 'tick', 'ghost']) {
                await pause();
                for (let v = 0; v < 3; v++) drumBuf(k);
            }
            for (let i = 0; i < LYRE_SET.length; i += 6) {
                if (disposed) return;
                await pause();
                for (const m of LYRE_SET.slice(i, i + 6)) instBuf('lyre', m);
            }
        } catch (err) {
            if (typeof console !== 'undefined') console.warn('[skoldhast audio] ready:', err);
        }
        if (warm && !offline && !disposed) startWarm();
    })();
    function startWarm() {
        const jobs = [];
        for (const m of [62, 65, 67, 69, 71, 72, 74, 76, 77, 79]) jobs.push(() => instBuf('harm', m));
        for (const s of SURFACES) for (const hard of [false, true]) jobs.push(() => bankGet('hoof:' + s + ':' + (hard ? 'hard' : 'soft'), 4, (r) => renderHoof(fs, r, s, hard ? 0.9 : 0.3)));
        for (const n of ['splash', 'drip', 'bubble', 'pop', 'page', 'pencil', 'rustle', 'neigh', 'snort', 'gull', 'crabclick', 'stamp', 'swim', 'shake', 'blubb', 'whoosh', 'thud', 'ratchet', 'latch', 'stopwatch', 'write', 'wind', 'unfold', 'gate', 'pickup', 'colorin']) {
            jobs.push(() => {
                const key = n === 'splash' ? 'splash:1' : n;
                const ro = n === 'splash' ? { size: 0.5 } : {};
                if (n === 'pencil') pencilBuf(0.3);
                else bankGet(key, SFX_VARIANTS[n] || 3, (r) => SFX_RENDER[n](fs, r, ro));
            });
        }
        for (const m of [74, 81, 83, 86, 88, 78, 84]) jobs.push(() => instBuf('harm', m));
        for (const b of ['wind', 'under', 'lap', 'waves']) jobs.push(() => bedBuf(b));
        jobs.push(() => bankGet('crabvoice', 5, (r) => renderCrabvoice(fs, r)));
        for (const kind of ['open', 'close', 'tab', 'confirm']) jobs.push(() => bankGet('ui:' + kind, 3, (r) => renderUI(fs, r, { kind })));
        jobs.push(() => {
            if (!swellBuf) swellBuf = makeBuffer([renderReverseSwell(fs, rngFor('swell'))]);
        });
        for (let d = 0; d <= 10; d++) {
            jobs.push(() => instBuf('shell', degreeToMidi(d)));
            jobs.push(() => instBuf('plank', degreeToMidi(d)));
        }
        const idle = typeof requestIdleCallback === 'function' ? (f) => requestIdleCallback(f, { timeout: 400 }) : (f) => setTimeout(f, 40);
        const next = () => {
            if (disposed || !jobs.length) return;
            try {
                jobs.shift()();
            } catch (err) {
                if (typeof console !== 'undefined') console.warn('[skoldhast audio] warm:', err);
            }
            idle(next);
        };
        idle(next);
    }

    startTimer();

    return {
        ready,
        get ctx() {
            return ctx;
        },
        /** Connect recorded voice lines here (they follow the voice volume). */
        voiceInput: voiceVol,
        resume,
        suspend,
        setVolumes,
        setArea,
        setEnvironment,
        setMotion,
        stinger,
        freeze,
        sfx,
        phrase,
        note,
        dispose,
        // QA / dev hooks (not part of the game contract)
        _tick: tick,
        _debug: {
            get area() {
                return curArea;
            },
            get bar() {
                return songBar;
            },
            get voices() {
                return voices;
            },
            get frozen() {
                return frozen;
            },
            get environment() {
                return environment;
            },
            players: () => players.map((p) => ({ area: p.area, step: p.step, fading: p.fading, eighth: p.eighth })),
            mute(names) {
                for (const k of LAYERS.concat(['beds', 'drone'])) muted[k] = false;
                for (const k of names || []) muted[k] = true;
            },
            // one note of any voice; dry = without the reverb send (the pitch check measures the instrument)
            playInst(inst, midi, when = 0, gain = 1, dry = false) {
                const t = ctx.currentTime + when;
                if (inst === 'pad') padVoice([midi], t, 1.6, { attack: 0.2, release: 0.3, level: PAD_LEVEL * 3, inL: dry ? sfxLanes[1] : stingPadIn[0], inR: dry ? sfxLanes[3] : stingPadIn[1] });
                else if (inst === 'drone') {
                    droneTarget = 1;
                    aim(droneOut.gain, DRONE_LEVEL * 3, t, 0.05);
                    manageDrone(t);
                } else playNote(INST_ALIAS[inst] || inst, midi, t, dry ? { dry: sfxLanes[2], wet: null } : SFX_MUSIC, gain);
            },
            cycleSeconds: (area) => (ARR[area] ? (CYCLE_STEPS * 60) / ARR[area].bpm / 3 : 0),
            barSeconds: (area) => (ARR[area] ? (BAR_STEPS * 60) / ARR[area].bpm / 3 : 0),
            loopBuffers: () => ['wind', 'under', 'waves', 'lap'].map((b) => ({ name: b, data: bedBuf(b).getChannelData(0) })),
            // bytes held in rendered AudioBuffers (instruments, drums, effects, beds, reverb)
            memory() {
                const size = (b) => (b ? b.length * b.numberOfChannels * 4 : 0);
                let n = size(verb.buffer) + size(swellBuf);
                for (const b of instCache.values()) n += size(b);
                for (const k in drumBank) for (const b of drumBank[k]) n += size(b);
                for (const k in sfxBanks) for (const v of sfxBanks[k].list) n += size(v.buffer);
                for (const k in bedCache) n += size(bedCache[k]);
                return n;
            }
        }
    };
}
