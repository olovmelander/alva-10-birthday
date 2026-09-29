#!/usr/bin/env node
/*
 * QA without ears for Sköldhästen's audio (plan §5.5).
 *
 * Renders every area arrangement, stinger and effect of skoldhast/src/audio.mjs in an
 * OfflineAudioContext inside headless Chromium (the real module, the real node graph), then reports:
 *   - peak dBFS (must stay below -1 dBFS), RMS, DC offset, the largest sample step
 *   - loop seams: the 16-bar cycle boundary of each arrangement against its other bar boundaries,
 *     and the wrap point of each looping ambience buffer
 *   - a pitch check: single notes of every pitched instrument across the theme's range must have
 *     their fundamental within 10 cents of the target
 * and writes WAVs and spectrogram PNGs (log-frequency panel for music, linear panel for aliasing,
 * waveform strip on top; red where |x| > -1 dBFS) to the output directory. Exit code 1 on any failure.
 *
 *   node scripts/skoldhast-audio-check.mjs [--out DIR] [--only area-,sfx-neigh,pitch,...] [--no-images]
 *                                          [--sr 48000] [--stems]
 *
 * --only takes cue-name prefixes: area-*, scene-*, stinger-*, sfx-*, pitch-*, loops.
 * --stems also renders every layer of every area alone (for balancing the mix).
 * Output: --out, else $SKOLDHAST_AUDIO_OUT, else <tmp>/skoldhast-audio.
 * Needs the global Playwright (see scripts/skoldhast-shot.mjs) and Chromium in /opt/pw-browsers.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const fsp = fs.promises;
const DEFAULT_OUT = process.env.SKOLDHAST_AUDIO_OUT || path.join(os.tmpdir(), 'skoldhast-audio');

// =============================================================================================
// Analysis helpers
// =============================================================================================

const FFT_CACHE = new Map();
function fftTables(n) {
    let t = FFT_CACHE.get(n);
    if (t) return t;
    const rev = new Uint32Array(n);
    const bits = Math.log2(n);
    for (let i = 0; i < n; i++) {
        let r = 0;
        for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
        rev[i] = r;
    }
    const cos = new Float64Array(n / 2);
    const sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
        cos[i] = Math.cos((-2 * Math.PI * i) / n);
        sin[i] = Math.sin((-2 * Math.PI * i) / n);
    }
    t = { rev, cos, sin };
    FFT_CACHE.set(n, t);
    return t;
}
/** In-place radix-2 FFT of (re, im), length a power of two. */
export function fft(re, im) {
    const n = re.length;
    const { rev, cos, sin } = fftTables(n);
    for (let i = 0; i < n; i++) {
        const j = rev[i];
        if (i < j) {
            let t = re[i]; re[i] = re[j]; re[j] = t;
            t = im[i]; im[i] = im[j]; im[j] = t;
        }
    }
    for (let size = 2; size <= n; size <<= 1) {
        const half = size >> 1;
        const step = n / size;
        for (let i = 0; i < n; i += size) {
            for (let j = 0, k = 0; j < half; j++, k += step) {
                const a = i + j;
                const b = a + half;
                const tr = re[b] * cos[k] - im[b] * sin[k];
                const ti = re[b] * sin[k] + im[b] * cos[k];
                re[b] = re[a] - tr;
                im[b] = im[a] - ti;
                re[a] += tr;
                im[a] += ti;
            }
        }
    }
}
const nextPow2 = (n) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));
const dB = (x) => 20 * Math.log10(Math.max(1e-12, x));

export function mono(chs) {
    if (chs.length === 1) return chs[0];
    const n = chs[0].length;
    const m = new Float32Array(n);
    for (const c of chs) for (let i = 0; i < n; i++) m[i] += c[i] / chs.length;
    return m;
}

/** Level statistics of a (multi-channel) signal. */
export function levels(chs, fs) {
    let peak = 0;
    let sum = 0;
    let count = 0;
    let maxStep = 0;
    const dc = [];
    for (const c of chs) {
        let s = 0;
        for (let i = 0; i < c.length; i++) {
            const a = Math.abs(c[i]);
            if (a > peak) peak = a;
            sum += c[i] * c[i];
            s += c[i];
            if (i) {
                const d = Math.abs(c[i] - c[i - 1]);
                if (d > maxStep) maxStep = d;
            }
        }
        count += c.length;
        dc.push(s / c.length);
    }
    // loudest 400 ms window (short-term RMS)
    const m = mono(chs);
    const w = Math.round(0.4 * fs);
    let acc = 0;
    let best = 0;
    for (let i = 0; i < m.length; i++) {
        acc += m[i] * m[i];
        if (i >= w) acc -= m[i - w] * m[i - w];
        if (i >= w - 1 && acc > best) best = acc;
    }
    return {
        peakDb: dB(peak),
        rmsDb: dB(Math.sqrt(sum / count)),
        stRmsDb: dB(Math.sqrt(best / Math.min(w, m.length))),
        dc: Math.max(...dc.map(Math.abs)),
        maxStep
    };
}

/**
 * Fundamental estimate near `target` Hz: Hann window, heavy zero padding, parabolic interpolation
 * of the log magnitude. Also returns how the fundamental compares with the strongest peak and with
 * anything at half the frequency (octave errors).
 */
export function measurePitch(x, fs, target, { from = 0.05, len = 0.6 } = {}) {
    const i0 = Math.round(from * fs);
    const n = Math.min(Math.round(len * fs), x.length - i0);
    const N = nextPow2(n * 8);
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    for (let i = 0; i < n; i++) re[i] = x[i0 + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
    fft(re, im);
    const mag = new Float64Array(N / 2);
    let gmax = 0;
    for (let k = 1; k < N / 2; k++) {
        mag[k] = Math.hypot(re[k], im[k]);
        if (mag[k] > gmax) gmax = mag[k];
    }
    const binHz = fs / N;
    const lo = Math.floor((target * 2 ** (-80 / 1200)) / binHz);
    const hi = Math.ceil((target * 2 ** (80 / 1200)) / binHz);
    let kb = lo;
    for (let k = lo; k <= hi; k++) if (mag[k] > mag[kb]) kb = k;
    const a = Math.log(mag[kb - 1] + 1e-30);
    const b = Math.log(mag[kb] + 1e-30);
    const c = Math.log(mag[kb + 1] + 1e-30);
    const off = (0.5 * (a - c)) / (a - 2 * b + c);
    const f = (kb + off) * binHz;
    // strongest thing around half the frequency (a missing / wrong octave)
    const sl = Math.floor((target * 0.5 * 0.97) / binHz);
    const sh = Math.ceil((target * 0.5 * 1.03) / binHz);
    let sub = 0;
    for (let k = sl; k <= sh; k++) sub = Math.max(sub, mag[k]);
    return {
        f,
        cents: 1200 * Math.log2(f / target),
        relDb: dB(mag[kb] / gmax),
        subDb: dB(sub / mag[kb])
    };
}

/** Simple click detector: the largest |2nd difference| inside [t-w, t+w] (mono). */
function maxD2(m, fs, t, w = 0.02) {
    const a = Math.max(2, Math.round((t - w) * fs));
    const b = Math.min(m.length, Math.round((t + w) * fs));
    let best = 0;
    for (let i = a; i < b; i++) {
        const d = Math.abs(m[i] - 2 * m[i - 1] + m[i - 2]);
        if (d > best) best = d;
    }
    return best;
}
function windowRms(m, fs, t, w) {
    const a = Math.max(0, Math.round((t - w) * fs));
    const b = Math.min(m.length, Math.round((t + w) * fs));
    let s = 0;
    for (let i = a; i < b; i++) s += m[i] * m[i];
    return Math.sqrt(s / Math.max(1, b - a));
}
const median = (arr) => {
    const s = [...arr].sort((p, q) => p - q);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
};
/**
 * The cycle seam of an arrangement compared with all other bar boundaries: level around the
 * seam (a gap or pile-up would show) and the sharpest sample jump near it (a click would show).
 */
export function seamReport(chs, fs, barTimes, seamTime) {
    const m = mono(chs);
    const others = barTimes.filter((t) => Math.abs(t - seamTime) > 0.1 && t > 0.5 && t < m.length / fs - 0.5);
    const rmsOthers = median(others.map((t) => windowRms(m, fs, t, 0.3)));
    const d2Others = median(others.map((t) => maxD2(m, fs, t)));
    return {
        levelDb: dB(windowRms(m, fs, seamTime, 0.3) / Math.max(1e-9, rmsOthers)),
        clickRatio: maxD2(m, fs, seamTime) / Math.max(1e-9, d2Others)
    };
}
/** Discontinuity of a looping buffer at its wrap point, relative to its typical sample step. */
export function loopWrapReport(x) {
    const steps = [];
    for (let i = 1; i < x.length; i += 7) steps.push(Math.abs(x[i] - x[i - 1]));
    const typical = median(steps);
    const p99 = [...steps].sort((a, b) => a - b)[Math.floor(steps.length * 0.999)];
    const wrap = Math.abs(x[0] - x[x.length - 1]);
    return { wrap, typical, p999: p99, ratio: wrap / Math.max(1e-9, p99) };
}

// ---------------------------------------------------------------------------------------------
// Spectrogram PNG (log-frequency panel for music, linear panel for aliasing), waveform strip
// ---------------------------------------------------------------------------------------------
const MAGMA = [[0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129], [181, 54, 122], [229, 80, 100], [251, 135, 97], [254, 194, 135], [252, 253, 191]];
function colour(v) {
    const x = Math.max(0, Math.min(1, v)) * (MAGMA.length - 1);
    const i = Math.min(MAGMA.length - 2, Math.floor(x));
    const f = x - i;
    const a = MAGMA[i];
    const b = MAGMA[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
export function stft(m, fs, { win = 2048, cols = 1400 } = {}) {
    const hop = Math.max(32, Math.floor(Math.max(1, m.length - win) / cols));
    const frames = Math.max(1, Math.floor((m.length - win) / hop) + 1);
    const hann = new Float64Array(win);
    for (let i = 0; i < win; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1));
    const out = [];
    const re = new Float64Array(win);
    const im = new Float64Array(win);
    const norm = win / 4; // a full-scale sine → 0 dB
    for (let f = 0; f < frames; f++) {
        const o = f * hop;
        for (let i = 0; i < win; i++) {
            re[i] = (m[o + i] || 0) * hann[i];
            im[i] = 0;
        }
        fft(re, im);
        const col = new Float32Array(win / 2);
        for (let k = 0; k < win / 2; k++) col[k] = dB(Math.hypot(re[k], im[k]) / norm);
        out.push(col);
    }
    return { frames: out, hop, win };
}
export async function spectrogramPng(chs, fs, file, { title = '', notes = '', floorDb = -110, topDb = -6, width = 1400, logH = 380, linH = 260, fmin = 40 } = {}) {
    const { createCanvas } = require('@napi-rs/canvas');
    const m = mono(chs);
    const { frames, win } = stft(m, fs, { win: 4096, cols: width });
    const waveH = 70;
    const headH = 34;
    const H = headH + waveH + logH + linH + 20;
    const canvas = createCanvas(width + 60, H);
    const g = canvas.getContext('2d');
    g.fillStyle = '#111';
    g.fillRect(0, 0, width + 60, H);
    g.fillStyle = '#eee';
    g.font = '15px Liberation Sans';
    g.fillText(title, 8, 16);
    g.font = '12px Liberation Sans';
    g.fillStyle = '#bbb';
    g.fillText(notes, 8, 30);
    // waveform strip (min/max per column), red where |x| > -1 dBFS
    const cols = width;
    const per = m.length / cols;
    const mid = headH + waveH / 2;
    g.strokeStyle = '#555';
    g.beginPath();
    g.moveTo(40, mid);
    g.lineTo(40 + cols, mid);
    g.stroke();
    for (let cx = 0; cx < cols; cx++) {
        let lo = 0;
        let hi = 0;
        for (let i = Math.floor(cx * per); i < Math.floor((cx + 1) * per); i++) {
            for (const c of chs) {
                if (c[i] < lo) lo = c[i];
                if (c[i] > hi) hi = c[i];
            }
        }
        g.fillStyle = Math.max(-lo, hi) > 0.891 ? '#f33' : '#7cf';
        g.fillRect(40 + cx, mid - hi * (waveH / 2), 1, Math.max(1, (hi - lo) * (waveH / 2)));
    }
    const img = g.createImageData(cols, logH + linH);
    const binHz = fs / win;
    const nb = win / 2;
    const fmax = Math.min(16000, fs / 2);
    const colAt = (cx) => frames[Math.min(frames.length - 1, Math.floor((cx / cols) * frames.length))];
    const put = (x, y, v) => {
        const [r, gg, b] = colour((v - floorDb) / (topDb - floorDb));
        const o = (y * cols + x) * 4;
        img.data[o] = r;
        img.data[o + 1] = gg;
        img.data[o + 2] = b;
        img.data[o + 3] = 255;
    };
    for (let cx = 0; cx < cols; cx++) {
        const col = colAt(cx);
        for (let y = 0; y < logH; y++) {
            const fa = fmin * Math.pow(fmax / fmin, 1 - (y + 1) / logH);
            const fb = fmin * Math.pow(fmax / fmin, 1 - y / logH);
            const ka = Math.max(1, Math.floor(fa / binHz));
            const kb = Math.min(nb - 1, Math.max(ka, Math.ceil(fb / binHz)));
            let v = -200;
            for (let k = ka; k <= kb; k++) if (col[k] > v) v = col[k];
            put(cx, y, v);
        }
        for (let y = 0; y < linH; y++) {
            const fa = (fs / 2) * (1 - (y + 1) / linH);
            const fb = (fs / 2) * (1 - y / linH);
            const ka = Math.max(1, Math.floor(fa / binHz));
            const kb = Math.min(nb - 1, Math.max(ka, Math.ceil(fb / binHz)));
            let v = -200;
            for (let k = ka; k <= kb; k++) if (col[k] > v) v = col[k];
            put(cx, logH + y, v);
        }
    }
    const top = headH + waveH;
    g.putImageData(img, 40, top);
    // axes
    g.font = '10px Liberation Sans';
    g.fillStyle = '#ccc';
    for (const f of [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800]) {
        if (f < fmin || f > fmax) continue;
        const y = top + logH * (1 - Math.log(f / fmin) / Math.log(fmax / fmin));
        g.fillText(f >= 1000 ? `${f / 1000}k` : String(f), 2, y + 3);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(40, y, cols, 1);
        g.fillStyle = '#ccc';
    }
    for (const f of [0, 4000, 8000, 12000, 16000, 20000]) {
        if (f > fs / 2) continue;
        const y = top + logH + linH * (1 - f / (fs / 2));
        g.fillText(`${f / 1000}k`, 2, y + 3);
    }
    g.fillStyle = '#888';
    g.fillRect(40, top + logH, cols, 1);
    const dur = m.length / fs;
    for (let s = 0; s <= dur; s += dur > 12 ? 2 : dur > 4 ? 0.5 : 0.1) {
        const x = 40 + (s / dur) * cols;
        g.fillStyle = 'rgba(255,255,255,0.18)';
        g.fillRect(x, top, 1, logH + linH);
        g.fillStyle = '#ccc';
        g.fillText(s.toFixed(dur > 4 ? 1 : 2), x + 2, H - 6);
    }
    await fsp.writeFile(file, canvas.toBuffer('image/png'));
}

export function writeWav(file, chs, sr) {
    const n = chs[0].length;
    const nc = chs.length;
    const b = Buffer.alloc(44 + n * nc * 2);
    b.write('RIFF', 0);
    b.writeUInt32LE(36 + n * nc * 2, 4);
    b.write('WAVE', 8);
    b.write('fmt ', 12);
    b.writeUInt32LE(16, 16);
    b.writeUInt16LE(1, 20);
    b.writeUInt16LE(nc, 22);
    b.writeUInt32LE(sr, 24);
    b.writeUInt32LE(sr * nc * 2, 28);
    b.writeUInt16LE(nc * 2, 32);
    b.writeUInt16LE(16, 34);
    b.write('data', 36);
    b.writeUInt32LE(n * nc * 2, 40);
    let o = 44;
    for (let i = 0; i < n; i++) {
        for (let c = 0; c < nc; c++) {
            const v = Math.max(-1, Math.min(1, chs[c][i]));
            b.writeInt16LE(Math.round(v * 32767), o);
            o += 2;
        }
    }
    fs.writeFileSync(file, b);
}

// =============================================================================================
// Cues: what to render (times in seconds; actions are [time, method, ...args] on the audio API)
// =============================================================================================
const AREA_CUES = [
    { name: 'area-table', area: 'table', motion: {}, extra: 2 },
    { name: 'area-land', area: 'land', motion: { speed01: 0.8 }, extra: 2 },
    { name: 'area-sea', area: 'sea', motion: { underwater: true }, extra: 2.5 },
    { name: 'area-bay', area: 'bay', motion: {}, extra: 2.5 },
    { name: 'area-final', area: 'final', motion: { speed01: 1 }, extra: 2 }
];
const SCENES = [
    {
        name: 'scene-land-adaptive', dur: 30, notes: 'speed 0→1 (5–10 s), under water 15–19 s, hidden 20–25 s',
        actions: [[0, 'setArea', 'land'], [0, 'setMotion', { speed01: 0 }], ...Array.from({ length: 11 }, (_, k) => [5 + k * 0.5, 'setMotion', { speed01: k / 10 }]),
            [15, 'setMotion', { underwater: true }], [19, 'setMotion', { underwater: false }], [20, 'setMotion', { hidden: true, speed01: 0 }], [25, 'setMotion', { hidden: false }]]
    },
    {
        name: 'scene-crossfade', dur: 26, notes: 'land → sea (8 s) → bay (15 s) → quiet (21 s)',
        actions: [[0, 'setArea', 'land'], [0, 'setMotion', { speed01: 0.6 }], [8, 'setArea', 'sea'], [8, 'setMotion', { underwater: true }], [15, 'setMotion', { underwater: false }], [15, 'setArea', 'bay'], [21, 'setArea', 'quiet']]
    },
    {
        name: 'scene-prologue-freeze', dur: 18, notes: 'table; at 5 s freeze(true) + stinger(freeze) as prologue.mjs calls them; rustle 8 s; plask 12 s',
        actions: [[0, 'setArea', 'table'], [5, 'freeze', true], [5, 'stinger', 'freeze'], [8, 'sfx', 'rustle'], [12, 'stinger', 'plask'], [12.2, 'setArea', 'final'], [12.2, 'setMotion', { speed01: 1 }]]
    },
    {
        name: 'scene-freeze-direct', dur: 9, notes: 'land; freeze(true) at 3 s stops dead, freeze(false) at 5.5 s starts on the next downbeat',
        actions: [[0, 'setArea', 'land'], [0, 'setMotion', { speed01: 0.7 }], [3, 'freeze', true], [5.5, 'freeze', false]]
    },
    {
        name: 'scene-stingers-over-music', dur: 22, notes: 'land at gallop; reveal 3 s, discovery 9 s, leap 13 s, aha 18 s; hooves + neigh',
        actions: [[0, 'setArea', 'land'], [0, 'setMotion', { speed01: 1 }], [3, 'stinger', 'reveal'], [9, 'stinger', 'discovery'], [13, 'stinger', 'leap'], [18, 'stinger', 'aha'],
            ...Array.from({ length: 40 }, (_, k) => [0.2 + k * 0.53, 'sfx', 'hoof', { surface: k % 12 < 6 ? 'sand' : 'grass', speed01: 1 }]), [11, 'sfx', 'neigh'], [16.5, 'sfx', 'splash', { size: 1 }]]
    },
    {
        name: 'scene-toys', dur: 14, notes: 'phrase(8) lyre, phrase(5) shell, notes on plank, bell-free',
        actions: [[0.1, 'phrase', 8], [3.5, 'phrase', 5, { inst: 'shell' }], ...Array.from({ length: 8 }, (_, k) => [6.5 + k * 0.3, 'note', [0, 4, 4, 5, 6, 7, 6, 4][k], { inst: 'plank' }]), ...Array.from({ length: 6 }, (_, k) => [10 + k * 0.5, 'note', k * 2, { inst: 'bell-free' }])]
    }
];
const STINGER_NAMES = ['aha', 'reveal', 'chapter', 'freeze', 'plask', 'leap', 'unfold', 'discovery'];
const SFX_CUES = {
    hoof: { opts: null, dur: 7.4 },
    splash: { opts: [{ size: 0.15 }, { size: 0.5 }, { size: 1 }], gap: 1.9, dur: 6.5 },
    drip: { gap: 0.4, n: 6, dur: 3 },
    shake: { gap: 1.3, dur: 4.4 },
    bubble: { gap: 0.6, n: 5, dur: 3.6 },
    swim: { gap: 0.9, dur: 3.3 },
    pencil: { opts: [{ len: 0.2 }, { len: 0.6, speed01: 0.9 }, { len: 1.5, speed01: 0.4 }, { len: 2.6 }], gap: [0.4, 0.9, 1.8, 0], dur: 6.4 },
    rustle: { gap: 1.2, dur: 4 },
    unfold: { gap: 2.2, n: 2, dur: 5 },
    crabclick: { gap: 0.5, n: 5, dur: 3 },
    neigh: { gap: 1.8, dur: 6 },
    blubb: { gap: 1.5, dur: 5 },
    snort: { gap: 0.8, dur: 3 },
    stamp: { gap: 0.8, dur: 3 },
    gull: { gap: 1.4, dur: 4.8 },
    wind: { gap: 3.2, n: 2, dur: 7 },
    whoosh: { gap: 0.9, dur: 3.3 },
    thud: { gap: 1.2, dur: 4.2 },
    latch: { gap: 0.8, dur: 3 },
    ratchet: { gap: 0.25, n: 8, dur: 3 },
    gate: { gap: 1.8, n: 2, dur: 4.5 },
    pop: { gap: 0.4, n: 4, dur: 2 },
    page: { gap: 0.8, dur: 3 },
    pickup: { gap: 1, dur: 3.5 },
    colorin: { gap: 1.6, n: 2, dur: 4.5 },
    sparkle: { gap: 1.2, n: 2, dur: 4 },
    stopwatch: { gap: 1.3, n: 2, dur: 3.5 },
    write: { gap: 1.5, n: 2, dur: 3.6 }
};
function sfxActions(name) {
    const c = SFX_CUES[name];
    if (name === 'hoof') {
        const acts = [];
        let t = 0.1;
        for (const surface of ['sand', 'wetsand', 'plank', 'grass', 'rock', 'shallow']) {
            for (const sp of [0.3, 1]) {
                for (let k = 0; k < 2; k++) {
                    acts.push([t, 'sfx', 'hoof', { surface, speed01: sp }]);
                    t += sp > 0.5 ? 0.22 : 0.38;
                }
            }
            t += 0.12;
        }
        return acts;
    }
    const acts = [];
    const n = c.opts ? c.opts.length : c.n || 3;
    let t = 0.1;
    for (let k = 0; k < n; k++) {
        acts.push([t, 'sfx', name, c.opts ? c.opts[k] : undefined]);
        t += Array.isArray(c.gap) ? c.gap[k] : c.gap;
    }
    return acts;
}
// Pitch check: instrument → MIDI notes (every note the score and the toys use for that voice)
const PITCH_SETS = {
    lyre: [45, 48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 66, 67, 69, 71, 72, 74, 76, 77, 79, 81],
    shell: [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79],
    plank: [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79],
    'bell-free': [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 78, 79, 81, 83, 84, 86, 88, 91],
    pad: [55, 57, 59, 60, 62, 64, 65, 66, 67, 69, 71, 72, 74, 76, 77, 79],
    drone: [38]
};

// =============================================================================================
// In-page renderer (runs inside Chromium)
// =============================================================================================
async function pageRender(spec) {
    const { createAudio } = await import('/skoldhast/src/audio.mjs');
    const sr = spec.sr;
    const off = new OfflineAudioContext(2, Math.round(spec.dur * sr), sr);
    const t0 = performance.now();
    const audio = createAudio({ ctx: off, seed: spec.seed, warm: false });
    await audio.ready;
    const readyMs = performance.now() - t0;
    audio.setVolumes({ music: 0.8, sfx: 0.9, voice: 1 });
    const acts = spec.actions.slice().sort((a, b) => a[0] - b[0]);
    const results = [];
    const apply = (t) => {
        while (acts.length && acts[0][0] <= t + 1e-6) {
            const [, fn, ...args] = acts.shift();
            if (fn === 'playInst') audio._debug.playInst(...args);
            else if (fn === 'mute') audio._debug.mute(...args);
            else results.push(audio[fn](...args));
        }
        audio._tick();
    };
    apply(0);
    const step = 0.1;
    for (let k = 1; k * step < spec.dur - 0.05; k++) {
        const t = k * step;
        off.suspend(t).then(() => {
            apply(t);
            off.resume();
        });
    }
    const t1 = performance.now();
    const buf = await off.startRendering();
    const renderMs = performance.now() - t1;
    const enc = (f32) => {
        const u8 = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
        let s = '';
        for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
        return btoa(s);
    };
    const extra = {};
    if (spec.loops) extra.loops = audio._debug.loopBuffers().map((l) => ({ name: l.name, data: enc(l.data) }));
    if (spec.area) extra.bar = audio._debug.barSeconds(spec.area);
    if (spec.area) extra.cycle = audio._debug.cycleSeconds(spec.area);
    audio.dispose();
    return { ch: [enc(buf.getChannelData(0)), enc(buf.getChannelData(1))], readyMs, renderMs, extra, results };
}
const dec = (b64) => {
    const b = Buffer.from(b64, 'base64');
    return new Float32Array(b.buffer, b.byteOffset, b.length / 4);
};

// =============================================================================================
// Main
// =============================================================================================
function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith('--')) continue;
        const key = argv[i].slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) out[key] = true;
        else {
            out[key] = next;
            i++;
        }
    }
    return out;
}
const pad = (s, n) => String(s).padEnd(n);
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const OUT = path.resolve(args.out || DEFAULT_OUT);
    const sr = Number(args.sr || 48000);
    const only = args.only ? String(args.only).split(',') : null;
    const want = (n) => !only || only.some((o) => n === o || n.startsWith(o));
    const images = !args['no-images'];
    fs.mkdirSync(OUT, { recursive: true });
    const { serve, launch } = await import('./skoldhast-shot.mjs');
    const server = await serve();
    const browser = await launch();
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${m.type()}] ${m.text()}`);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/audio.html?qa`, { waitUntil: 'load' });
    const render = (spec) => page.evaluate(pageRender, { seed: 7, sr, ...spec });

    const rows = [];
    const failures = [];
    const check = (ok, msg) => {
        if (!ok) failures.push(msg);
        return ok ? 'ok' : 'FAIL';
    };
    async function analyse(name, spec, { seam = null, notes = '' } = {}) {
        const r = await render(spec);
        const chs = r.ch.map(dec);
        const lv = levels(chs, sr);
        const row = { name, dur: spec.dur, ...lv, readyMs: r.readyMs, renderMs: r.renderMs, speed: (spec.dur * 1000) / r.renderMs };
        let seamTxt = '';
        if (seam && r.extra.cycle) {
            const t0 = 0.08;
            const bars = [];
            for (let t = t0; t < spec.dur; t += r.extra.bar) bars.push(t);
            const sr2 = seamReport(chs, sr, bars, t0 + r.extra.cycle);
            row.seamDb = sr2.levelDb;
            row.seamClick = sr2.clickRatio;
            seamTxt = `seam ${fmt(sr2.levelDb)} dB, click x${fmt(sr2.clickRatio, 2)}`;
        }
        row.status = check(lv.peakDb < -1, `${name}: peak ${fmt(lv.peakDb, 2)} dBFS ≥ -1`);
        if (Math.abs(lv.dc) > 0.002) row.status = check(false, `${name}: DC offset ${lv.dc.toExponential(2)}`);
        if (row.seamDb != null && (Math.abs(row.seamDb) > 6 || row.seamClick > 3)) row.status = check(false, `${name}: loop seam ${seamTxt}`);
        rows.push(row);
        const base = path.join(OUT, name);
        writeWav(`${base}.wav`, chs, sr);
        if (images) {
            await spectrogramPng(chs, sr, `${base}.png`, {
                title: `${name}   peak ${fmt(lv.peakDb)} dBFS   rms ${fmt(lv.rmsDb)} dBFS   short-term max ${fmt(lv.stRmsDb)} dBFS   ${seamTxt}`,
                notes: notes || spec.notes || ''
            });
        }
        return { chs, r };
    }

    // 1. Areas (one full 16-bar cycle plus the seam)
    for (const c of AREA_CUES) {
        if (!want(c.name)) continue;
        const bar = (6 * 60) / { table: 66, land: 80, sea: 54, bay: 58, final: 84 }[c.area] / 3;
        const dur = Math.ceil(16 * bar + c.extra + 0.5);
        await analyse(c.name, { dur, area: c.area, actions: [[0, 'setArea', c.area], [0, 'setMotion', c.motion]] }, { seam: true, notes: `${c.area} arrangement, motion ${JSON.stringify(c.motion)}; the seam is the 16-bar cycle boundary` });
    }
    // 1b. Stems (--stems): each layer of each area alone, to compare their levels
    if (args.stems) {
        const LAYERS = ['mel', 'acc', 'pad', 'drum', 'harm', 'tex', 'drone', 'beds'];
        for (const c of AREA_CUES) {
            if (!want(c.name)) continue;
            for (const l of LAYERS) {
                await analyse(`stem-${c.area}-${l}`, { dur: 14, area: c.area, actions: [[0, 'mute', LAYERS.filter((x) => x !== l)], [0, 'setArea', c.area], [0, 'setMotion', c.motion]] }, { notes: `${c.area}: only the ${l} layer` });
            }
        }
    }
    // 2. Scenes
    for (const s of SCENES) if (want(s.name)) await analyse(s.name, s);
    // 3. Stingers (alone)
    for (const n of STINGER_NAMES) {
        const name = `stinger-${n}`;
        if (!want(name)) continue;
        await analyse(name, { dur: n === 'unfold' ? 7.5 : n === 'reveal' || n === 'chapter' ? 7 : 5, actions: [[0.1, 'stinger', n]] });
    }
    // 4. Effects
    for (const n of Object.keys(SFX_CUES)) {
        const name = `sfx-${n}`;
        if (!want(name)) continue;
        await analyse(name, { dur: SFX_CUES[n].dur, actions: sfxActions(n) });
    }
    // 5. Ambience loops: wrap seams of the looping buffers
    const loopRows = [];
    if (want('loops')) {
        const r = await render({ dur: 0.2, actions: [], loops: true });
        for (const l of r.extra.loops) {
            const x = dec(l.data);
            const w = loopWrapReport(x);
            const status = check(w.ratio < 1, `loop ${l.name}: wrap step ${w.wrap.toExponential(2)} vs p99.9 ${w.p999.toExponential(2)}`);
            loopRows.push({ name: l.name, sec: x.length / sr, ...w, status });
            if (images) {
                // the loop played twice, so the wrap is visible in the middle
                const twice = new Float32Array(x.length * 2);
                twice.set(x);
                twice.set(x, x.length);
                await spectrogramPng([twice], sr, path.join(OUT, `loop-${l.name}.png`), { title: `loop ${l.name} (played twice, the wrap is at ${fmt(x.length / sr, 2)} s)`, notes: `wrap step ${w.wrap.toExponential(2)}, typical step ${w.typical.toExponential(2)}, 99.9th pct ${w.p999.toExponential(2)}` });
            }
        }
    }
    // 6. Pitch check
    const pitchRows = [];
    {
        for (const inst of Object.keys(PITCH_SETS)) {
            if (!want(`pitch-${inst}`)) continue;
            const notes = PITCH_SETS[inst];
            const gap = inst === 'pad' ? 2.2 : 1.4;
            const acts = notes.map((m, k) => [0.1 + k * gap, 'playInst', inst === 'bell-free' ? 'harm' : inst, m, 0, 1, true]);
            const { chs } = await analyse(`pitch-${inst}`, { dur: 0.3 + notes.length * gap, actions: acts }, { notes: `single notes ${notes.join(' ')} (dry: no reverb send; through compressor and ceiling)` });
            const m = mono(chs);
            for (let k = 0; k < notes.length; k++) {
                const target = 440 * 2 ** ((notes[k] - 69) / 12);
                const from = 0.1 + k * gap + (inst === 'pad' ? 0.5 : inst === 'drone' ? 1 : 0.05);
                const len = inst === 'plank' ? 0.3 : inst === 'shell' ? 0.45 : inst === 'pad' ? 1.1 : 0.6;
                const p = measurePitch(m, sr, target, { from, len });
                const ok = Math.abs(p.cents) <= 10 && p.relDb > -20 && p.subDb < -12;
                pitchRows.push({ inst, midi: notes[k], target, ...p, status: check(ok, `pitch ${inst} ${notes[k]}: ${fmt(p.cents, 2)} cents (fundamental ${fmt(p.relDb)} dB vs strongest, sub-octave ${fmt(p.subDb)} dB)`) });
            }
        }
    }
    await browser.close();
    server.close();

    // ---- report ---------------------------------------------------------------------------------
    console.log(`\nSköldhästen audio QA  (sample rate ${sr} Hz, output ${OUT})\n`);
    console.log(`${pad('cue', 28)}${pad('dur s', 7)}${pad('peak dBFS', 11)}${pad('RMS dBFS', 10)}${pad('ST max', 8)}${pad('DC', 10)}${pad('max step', 10)}${pad('seam dB', 9)}${pad('seam click', 11)}${pad('ready ms', 10)}${pad('x realtime', 11)}status`);
    for (const r of rows) {
        console.log(`${pad(r.name, 28)}${pad(fmt(r.dur), 7)}${pad(fmt(r.peakDb, 2), 11)}${pad(fmt(r.rmsDb), 10)}${pad(fmt(r.stRmsDb), 8)}${pad(r.dc.toExponential(1), 10)}${pad(fmt(r.maxStep, 3), 10)}${pad(r.seamDb == null ? '' : fmt(r.seamDb), 9)}${pad(r.seamClick == null ? '' : 'x' + fmt(r.seamClick, 2), 11)}${pad(fmt(r.readyMs, 0), 10)}${pad(fmt(r.speed, 0), 11)}${r.status}`);
    }
    if (loopRows.length) {
        console.log(`\n${pad('ambience loop', 16)}${pad('sec', 6)}${pad('wrap step', 12)}${pad('typical', 12)}${pad('p99.9', 12)}status`);
        for (const l of loopRows) console.log(`${pad(l.name, 16)}${pad(fmt(l.sec), 6)}${pad(l.wrap.toExponential(2), 12)}${pad(l.typical.toExponential(2), 12)}${pad(l.p999.toExponential(2), 12)}${l.status}`);
    }
    if (pitchRows.length) {
        console.log('\npitch check (fundamental within 10 cents of target)');
        const byInst = {};
        for (const p of pitchRows) (byInst[p.inst] ||= []).push(p);
        for (const [inst, ps] of Object.entries(byInst)) {
            const worst = ps.reduce((a, b) => (Math.abs(b.cents) > Math.abs(a.cents) ? b : a));
            const bad = ps.filter((p) => p.status !== 'ok');
            console.log(`  ${pad(inst, 10)} ${pad(ps.length + ' notes', 9)} MIDI ${ps[0].midi}–${ps[ps.length - 1].midi}   worst ${fmt(worst.cents, 2)} cents (MIDI ${worst.midi})   weakest fundamental ${fmt(Math.min(...ps.map((p) => p.relDb)), 1)} dB   ${bad.length ? 'FAIL ' + bad.map((b) => b.midi).join(',') : 'ok'}`);
        }
    }
    if (pageErrors.length) {
        failures.push(...pageErrors.map((e) => `page error: ${e}`));
    }
    console.log(failures.length ? `\n${failures.length} problem(s):\n  - ${failures.join('\n  - ')}` : '\nall checks passed');
    process.exitCode = failures.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
