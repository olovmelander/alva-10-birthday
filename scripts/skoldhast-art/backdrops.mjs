/*
 * Sköldhästen — backdrops (full paper, stretched to the screen by the engine).
 *
 * Each backdrop is one sheet of Alva's paper coloured with her pencils: soft
 * blended skies (hatch, then burnish, then a few horizontal streaks), seas of
 * dense horizontal strokes darker toward the bottom, and never a drawn
 * horizon line. Sun, clouds, gulls and every solid object are props.
 */
import { Sheet, PENCILS as P, hashSeed, mix, rng, smooth, pressureMap } from './pencil.mjs';
import { PX, fbm, fmap, smoothstep, clamp01, lighten, toCanvasOpaque, qstroke, voronoiT, withTooth } from './materials.mjs';
import { createCanvas } from '@napi-rs/canvas';

const W = 2048, H = 1024;

/** Piecewise-linear profile through [t, value] stops. */
function prof(stops) {
    return (t) => {
        if (t <= stops[0][0]) return stops[0][1];
        for (let i = 1; i < stops.length; i++) {
            if (t <= stops[i][0]) {
                const [t0, v0] = stops[i - 1], [t1, v1] = stops[i];
                const u = (t - t0) / (t1 - t0);
                return v0 + (v1 - v0) * (u * u * (3 - 2 * u));
            }
        }
        return stops[stops.length - 1][1];
    };
}
/** Pressure map from a vertical profile times an optional modulation array. */
function vmap(f, mod = null, k = 1) {
    return pressureMap(W, H, (x, y) => f(y / H) * (mod ? mod[y * W + x] : 1) * k);
}
function sheet(name, paperColor = P.paper) {
    return new Sheet(W, H, { seed: hashSeed(name), grain: 1.5, paperColor });
}
/**
 * A blended pencil layer: low grain and its own roll of the tooth, so stacked
 * layers blend like her sky instead of piling up on the same tooth peaks.
 */
let washCount = 0;
function wash(S, color, opts) {
    const k = ++washCount;
    withTooth(S, (k * 397) % W, (k * 211) % H, () => S.hatch(color, { grain: 0.3, width: 2.6, ...opts }));
}
/** Long pale slivers pulled back toward the paper (her white streaks). */
function paleStreaks(S, seed, { n = 60, y0 = 0, y1 = H, len = [80, 380], width = [1.5, 4], amount = 0.5, weight = null, color = P.paper } = {}) {
    const r = rng(seed);
    const list = [];
    for (let k = 0; k < n; k++) {
        const y = y0 + r() * (y1 - y0);
        if (weight && r() > weight(y / H)) continue;
        const x = r() * W, l = len[0] + r() * (len[1] - len[0]);
        list.push([x - l / 2, y, x, y + (r() - 0.5) * 2, x + l / 2, y + (r() - 0.5) * 2, width[0] + r() * (width[1] - width[0]), 0.9]);
    }
    const cov = S.coverage((c) => { for (const k of list) qstroke(c, ...k, true); });
    lighten(S, cov, { amount, grain: 0.35, color });
}
/** Horizontal bands (for sky streaks and sea slivers): 0..1, long in x. */
function bands(seed, cx = 3, cy = 40, contrast = 2) {
    return fbm(W, H, seed, [[cx, cy, 0.55], [cx * 2, cy * 2, 0.3], [cx * 4, cy * 3, 0.15]], contrast);
}

/** Reserved-paper highlights: broken pencil marks, never a smooth light gradient. */
function reflectionPath(S, seed, { horizon = SEA_TOP, x = 0.66, warm = false, amount = 0.52 } = {}) {
    const r = rng(seed), list = [];
    for (let k = 0; k < 180; k++) {
        const u = Math.pow(r(), 1.35), y = H * (horizon + 0.012 + u * (0.97 - horizon));
        const spread = 38 + u * 330;
        const cx = W * x + (r() + r() - 1) * spread + Math.sin(u * 11) * 20;
        const len = 7 + r() * (18 + u * 72);
        list.push([cx - len / 2, y, cx, y - r() * 1.5, cx + len / 2, y,
            1.1 + u * 1.8 + r(), 0.55 + r() * 0.4]);
    }
    const cov = S.coverage((c) => { for (const q of list) qstroke(c, ...q, true); });
    lighten(S, cov, { amount, grain: 0.25, color: warm ? mix(P.paper, P.sunGlow, 0.35) : P.paper });
    if (warm) S.deposit(PX.eveningGold, cov, { pressure: 0.2, grain: 0.4 });
}

// ---------------------------------------------------------------------------
// Skies and seas shared by the beach variants
// ---------------------------------------------------------------------------
const SEA_TOP = 0.7; // the lower 30% is sea

function daySky(S, seed) {
    const vary = fbm(W, H, seed + 1, [[3, 2, 0.6], [7, 4, 0.4]], 1.2);
    const streak = bands(seed + 2, 3, 36, 2.2);
    // her sky: nearly paper at the top round the sun, soft light blue lower down,
    // bluest just above the sea, where it melts into the water with no line
    const sky = prof([[0, 0.1], [0.14, 0.2], [0.34, 0.42], [0.52, 0.52], [0.62, 0.6], [0.69, 0.66], [0.74, 0.62]]);
    S.hatch(P.skyPale, { angle: -0.01, gap: 2.6, len: [90, 240], width: 3, grain: 0.25, pmap: vmap(prof([[0, 0.25], [0.2, 0.6], [0.8, 0.8]])) });
    withTooth(S, 311, 97, () => S.hatch(P.skyBlue, { angle: -0.022, gap: 2.5, len: [70, 200], width: 3, grain: 0.25, pmap: vmap(sky, fmap(vary, (v) => 0.82 + 0.36 * v)) }));
    withTooth(S, 623, 211, () => S.hatch(P.skyBlue, { angle: 0.045, gap: 3.4, len: [50, 140], width: 2.6, grain: 0.3, pmap: vmap(sky, null, 0.35) }));
    S.burnish(null, 3, 0.62);
    // her horizontal streaks of a little more blue
    withTooth(S, 137, 401, () => S.hatch(P.skyBlue, { angle: -0.004, angleJitter: 0.01, gap: 2.8, len: [120, 420], width: 2.8, grain: 0.2,
        pmap: vmap(sky, fmap(streak, (v) => smoothstep(0.56, 0.88, v) * 0.9)) }));
    withTooth(S, 929, 53, () => S.hatch(mix(P.skyBlue, P.seaBlue, 0.35), { angle: 0.002, angleJitter: 0.008, gap: 5, len: [80, 260], width: 2.2, grain: 0.3,
        pmap: vmap(prof([[0.2, 0], [0.45, 0.3], [0.64, 0.45], [0.72, 0]]), fmap(streak, (v) => smoothstep(0.72, 0.96, v))) }));
    S.burnish(null, 1, 0.45);
}

function daySea(S, seed) {
    const gaps = bands(seed + 3, 2, 70, 2.3);
    const sliver = fmap(gaps, (v) => 1 - 0.75 * smoothstep(0.72, 0.93, v));
    // a soft join: the sea's first strokes start well above SEA_TOP and fade in
    const top = (t) => smoothstep(SEA_TOP - 0.05, SEA_TOP + 0.03, t);
    const depth = prof([[SEA_TOP - 0.05, 0], [SEA_TOP + 0.03, 0.46], [0.84, 0.72], [1, 0.9]]);
    withTooth(S, 401, 37, () => S.hatch(P.skyBlue, { angle: -0.008, angleJitter: 0.01, gap: 2, len: [70, 220], width: 2.6, grain: 0.3, pmap: vmap(top, null, 0.95) }));
    S.hatch(P.seaBlue, { angle: 0.004, angleJitter: 0.012, gap: 1.9, len: [50, 190], width: 2.5, grain: 0.45, pmap: vmap(depth, sliver) });
    withTooth(S, 777, 5, () => S.hatch(P.seaBlue, { angle: -0.016, angleJitter: 0.015, gap: 2.8, len: [30, 110], width: 2.2, grain: 0.45, pmap: vmap(depth, sliver, 0.4) }));
    withTooth(S, 1201, 71, () => S.hatch(P.seaDeep, { angle: 0.008, angleJitter: 0.01, gap: 3, len: [40, 150], width: 2.2, grain: 0.5, pmap: vmap(prof([[0.82, 0], [0.94, 0.22], [1, 0.36]]), sliver) }));
    S.burnish(S.mask([[0, H * (SEA_TOP - 0.06)], [W, H * (SEA_TOP - 0.06)], [W, H], [0, H]]), 1, 0.3);
    S.burnish(S.mask([[0, H * (SEA_TOP - 0.07)], [W, H * (SEA_TOP - 0.07)], [W, H * (SEA_TOP + 0.04)], [0, H * (SEA_TOP + 0.04)]], { feather: 12 }), 3, 0.55);
    paleStreaks(S, seed + 4, { n: 190, y0: H * (SEA_TOP + 0.01), y1: H, len: [60, 360], width: [1.4, 3.6], amount: 0.6,
        weight: prof([[SEA_TOP, 1], [0.85, 0.8], [1, 0.45]]) });
}

function bgBeach() {
    const S = sheet('bg-beach');
    daySky(S, 10);
    daySea(S, 20);
    return S;
}

function eveningSky(S, seed, horizon = SEA_TOP) {
    const vary = fbm(W, H, seed + 1, [[3, 2, 0.6], [7, 4, 0.4]], 1.2);
    const streak = bands(seed + 2, 3, 36, 2.2);
    const h = horizon;
    // lilac high up → warm yellow → rose and peach near the horizon
    wash(S, P.sunGlow, { angle: -0.01, gap: 2.4, len: [80, 220], pmap: vmap(prof([[0, 0.45], [0.3, 0.9], [h, 0.95], [h + 0.08, 0.3]])) });
    wash(S, PX.eveningGold, { angle: -0.022, gap: 2.5, len: [60, 190], pmap: vmap(prof([[0.06, 0], [0.3, 0.5], [0.52, 0.62], [h - 0.05, 0.35], [h + 0.04, 0]]), fmap(vary, (v) => 0.8 + 0.4 * v)) });
    wash(S, PX.rose, { angle: 0.03, gap: 2.6, len: [60, 180], pmap: vmap(prof([[0.38, 0], [h - 0.1, 0.5], [h, 0.65], [h + 0.06, 0]])) });
    wash(S, P.tailPeach, { angle: -0.01, gap: 3, len: [60, 200], pmap: vmap(prof([[h - 0.2, 0], [h - 0.06, 0.45], [h, 0.55], [h + 0.06, 0]])) });
    wash(S, PX.eveningLilac, { angle: -0.03, gap: 2.6, len: [60, 200], pmap: vmap(prof([[0, 0.6], [0.16, 0.4], [0.32, 0]])) });
    S.burnish(null, 3, 0.62);
    wash(S, PX.rose, { angle: -0.004, angleJitter: 0.01, gap: 3, len: [120, 420], grain: 0.2,
        pmap: vmap(prof([[0.2, 0], [0.45, 0.45], [h - 0.02, 0.6], [h + 0.02, 0]]), fmap(streak, (v) => smoothstep(0.6, 0.9, v))) });
    wash(S, PX.eveningGold, { angle: 0.004, angleJitter: 0.01, gap: 3.4, len: [120, 380], grain: 0.2,
        pmap: vmap(prof([[0.1, 0], [0.3, 0.45], [0.55, 0.35], [h - 0.05, 0]]), fmap(streak, (v) => smoothstep(0.2, 0.45, 1 - v))) });
    S.burnish(null, 1, 0.45);
}

function bgBeachEvening() {
    const S = sheet('bg-beach-evening');
    eveningSky(S, 30);
    // the sea: blue with a lilac dusk and warm light lying on it
    const gaps = bands(33, 2, 70, 2.3);
    const sliver = fmap(gaps, (v) => 1 - 0.4 * smoothstep(0.8, 0.96, v));
    // near the horizon the water mirrors the warm sky, then turns lilac and blue toward us
    const depth = prof([[SEA_TOP, 0], [SEA_TOP + 0.09, 0.34], [0.86, 0.7], [1, 0.92]]);
    wash(S, P.tailPeach, { angle: -0.008, gap: 2.4, len: [70, 220], pmap: vmap(prof([[SEA_TOP - 0.03, 0], [SEA_TOP + 0.02, 0.45], [SEA_TOP + 0.1, 0.25], [0.9, 0]])) });
    wash(S, PX.eveningLilac, { angle: -0.008, gap: 2.1, len: [70, 220], pmap: vmap(prof([[SEA_TOP - 0.03, 0], [SEA_TOP + 0.05, 0.5], [0.86, 0.55], [1, 0.35]]), sliver) });
    wash(S, P.seaBlue, { angle: 0.004, angleJitter: 0.012, gap: 1.9, len: [50, 190], width: 2.5, grain: 0.45, pmap: vmap(depth, sliver, 0.92) });
    wash(S, P.seaDeep, { angle: 0.008, angleJitter: 0.01, gap: 2.6, len: [40, 150], width: 2.2, grain: 0.45, pmap: vmap(prof([[0.82, 0], [0.94, 0.28], [1, 0.45]]), sliver) });
    wash(S, PX.rose, { angle: -0.01, gap: 3, len: [60, 200], width: 2.2, pmap: vmap(prof([[SEA_TOP - 0.03, 0.15], [SEA_TOP + 0.02, 0.35], [0.8, 0.2], [0.9, 0]])) });
    S.burnish(S.mask([[0, H * (SEA_TOP - 0.06)], [W, H * (SEA_TOP - 0.06)], [W, H], [0, H]]), 1, 0.3);
    S.burnish(S.mask([[0, H * (SEA_TOP - 0.07)], [W, H * (SEA_TOP - 0.07)], [W, H * (SEA_TOP + 0.04)], [0, H * (SEA_TOP + 0.04)]], { feather: 12 }), 3, 0.55);
    paleStreaks(S, 34, { n: 55, y0: H * (SEA_TOP + 0.012), y1: H, len: [60, 300], width: [1.4, 3.2], amount: 0.4, weight: prof([[SEA_TOP, 1], [0.9, 0.5], [1, 0.2]]) });
    // warm highlights lying on the water
    const warm = rng(35);
    const list = [];
    for (let k = 0; k < 170; k++) {
        const t = SEA_TOP + 0.012 + Math.pow(warm(), 1.6) * 0.27;
        const y = t * H, x = warm() * W, l = 30 + warm() * 170;
        list.push([x - l / 2, y, x, y + (warm() - 0.5) * 1.5, x + l / 2, y, 1.6 + warm() * 1.8, 0.95]);
    }
    const cov = S.coverage((c) => { for (const k of list) qstroke(c, ...k, true); });
    lighten(S, cov, { amount: 0.45, grain: 0.3, color: P.paper });
    S.deposit(PX.eveningGold, cov, { pressure: 0.95, grain: 0.4 });
    S.deposit(P.tailPeach, cov, { pressure: 0.25, grain: 0.4, pmap: vmap(prof([[SEA_TOP, 0], [0.8, 0.6], [1, 1]])) });
    reflectionPath(S, 36, { warm: true, amount: 0.72 });
    return S;
}

// ---------------------------------------------------------------------------
// Stäppen
// ---------------------------------------------------------------------------
/** A ridge line y(x) from a few sines (px). */
function ridge(base, amp, seed, parts = 5) {
    const r = rng(seed);
    const waves = [];
    for (let k = 0; k < parts; k++) waves.push([1 + k * 1.7 + r() * 1.2, r() * Math.PI * 2, (1 / (k + 1)) * (0.6 + r() * 0.8)]);
    const norm = waves.reduce((s, w) => s + w[2], 0);
    return (x) => base + amp * waves.reduce((s, [f, ph, a]) => s + a * Math.sin((x / W) * Math.PI * 2 * f + ph), 0) / norm;
}
function ridgePoly(fy, y1 = H + 20) {
    const pts = [];
    for (let x = -20; x <= W + 20; x += 8) pts.push([x, fy(x)]);
    pts.push([W + 20, y1], [-20, y1]);
    return pts;
}
function ridgeLine(fy) {
    const pts = [];
    for (let x = -10; x <= W + 10; x += 6) pts.push([x, fy(x)]);
    return pts;
}

function steppe(S, name, evening) {
    const seed = hashSeed(name) % 997;
    const vary = fbm(W, H, seed, [[3, 2, 0.6], [7, 4, 0.4]], 1.2);
    // sky: paler than the beach's, so the hills carry the picture
    if (!evening) {
        wash(S, P.skyPale, { angle: -0.01, gap: 2.5, len: [80, 220], pmap: vmap(prof([[0, 0.5], [0.3, 0.8], [0.62, 0.8]])) });
        wash(S, P.skyBlue, { angle: -0.022, gap: 2.5, len: [60, 190], pmap: vmap(prof([[0, 0.28], [0.12, 0.42], [0.35, 0.5], [0.55, 0.28], [0.63, 0.12]]), fmap(vary, (v) => 0.8 + 0.4 * v)) });
        S.burnish(null, 3, 0.62);
        wash(S, P.skyBlue, { angle: -0.004, angleJitter: 0.01, gap: 3, len: [120, 420], grain: 0.2,
            pmap: vmap(prof([[0.05, 0.25], [0.35, 0.45], [0.58, 0.15]]), fmap(bands(seed + 3, 3, 36, 2.2), (v) => smoothstep(0.6, 0.9, v))) });
        S.burnish(null, 1, 0.45);
    } else {
        eveningSky(S, seed + 7, 0.64);
    }

    // hills: a far ridge at ~60 %, then nearer bands; each band is clearest at its crest
    // and fades into haze toward its foot, so the next band's crest stands out
    const layers = [
        { fy: ridge(H * 0.6, 40, 1), col: evening ? mix(PX.eveningLilac, P.grassSilver, 0.45) : mix(P.grassSilver, P.skyBlue, 0.4), p: 0.85, fade: 0.55, depth: 90, line: 0.32 },
        { fy: ridge(H * 0.685, 56, 2), col: evening ? mix(P.grassSilver, PX.eveningLilac, 0.25) : mix(P.grassSilver, P.skyBlue, 0.15), p: 0.85, fade: 0.45, depth: 110, line: 0.36, ochre: 0.3 },
        { fy: ridge(H * 0.78, 66, 3), col: P.grassSilver, p: 0.9, fade: 0.3, depth: 140, line: 0.42, ochre: 0.62, green: 0.2 },
        { fy: ridge(H * 0.9, 44, 4), col: P.grassSilver, p: 0.95, fade: 0.15, depth: 160, line: 0.48, ochre: 0.7, green: 0.28 }
    ];
    layers.forEach((L, k) => {
        const m = S.mask(ridgePoly(L.fy));
        const tilt = -0.2 + k * 0.05;
        const haze = pressureMap(W, H, (x, y) => (1 - L.fade * smoothstep(L.fy(x) + 6, L.fy(x) + L.depth, y)) * m[y * W + x]);
        wash(S, L.col, { angle: tilt, gap: 2.2, len: [40, 130], clip: m, pmap: haze, pressure: L.p, grain: 0.3 + k * 0.06 });
        wash(S, L.col, { angle: tilt + 0.35, gap: 3.4, len: [30, 90], clip: m, pmap: haze, pressure: L.p * 0.4, grain: 0.35 });
        if (L.ochre) wash(S, evening ? mix(P.grassOchre, PX.eveningGold, 0.35) : P.grassOchre, { angle: tilt + 0.08, gap: 2.8, len: [40, 150], clip: m, grain: 0.35 + k * 0.05,
            pmap: fmap(vary, (v, i) => L.ochre * (0.5 + v) * haze[i]) });
        if (L.green) wash(S, P.grassGreen, { angle: tilt - 0.06, gap: 3, len: [30, 110], clip: m, grain: 0.4,
            pmap: pressureMap(W, H, (x, y) => L.green * smoothstep(L.fy(x) + 25, L.fy(x) + 140, y) * (0.6 + 0.6 * vary[y * W + x])) });
        // wind-combed stripes (lighter, slanting) on the nearer bands
        if (k >= 2) {
            const r = rng(seed + 20 + k);
            const list = [];
            for (let i = 0; i < 150; i++) {
                const x = r() * W, y = L.fy(x) + 14 + r() * (H - L.fy(x)), l = 70 + r() * 150;
                list.push([x, y, x + l * 0.5, y - l * 0.14, x + l, y - l * 0.26, 3 + r() * 3, 0.9]);
            }
            const cov = S.coverage((c) => { for (const q of list) qstroke(c, ...q, true); });
            lighten(S, cov, { amount: 0.32, grain: 0.3, clip: m, color: evening ? mix(P.paper, P.sunGlow, 0.5) : P.paper });
        }
        if (evening) wash(S, PX.eveningGold, { angle: tilt, gap: 3, len: [30, 100], grain: 0.3,
            pmap: pressureMap(W, H, (x, y) => 0.55 * (1 - smoothstep(L.fy(x), L.fy(x) + 50, y)) * m[y * W + x]) });
        S.burnish(m, k < 2 ? 2 : 1, k < 2 ? 0.5 : 0.3);
        // a pencil line along the top of each band, firmer when nearer
        S.outline(k < 2 ? mix(P.graphiteSoft, P.skyBlue, 0.3) : mix(P.graphiteSoft, P.grassGreen, 0.35), ridgeLine(L.fy),
            { closed: false, width: 1.8 + k * 0.35, wobble: 1, alpha: 0.9, pressure: L.line, passes: 1, opaque: false, grain: 0.5 });
    });
    // short upright grass strokes along the two nearest ridges
    const r = rng(seed + 5);
    for (const k of [2, 3]) {
        const L = layers[k];
        const list = [];
        for (let i = 0; i < (k === 2 ? 700 : 1100); i++) {
            const x = r() * W, y = L.fy(x) + 2 + Math.pow(r(), 1.6) * (k === 2 ? 50 : 80);
            const l = (k === 2 ? 5 : 8) + r() * (k === 2 ? 7 : 11), a = -Math.PI / 2 + 0.25 + (r() - 0.5) * 0.5;
            list.push([x, y, x + Math.cos(a) * l * 0.5 + 0.8, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l, 1.3, 0.8]);
        }
        const cov = S.coverage((c) => { for (const q of list) qstroke(c, ...q, true); });
        S.deposit(evening ? mix(P.grassGreen, PX.eveningGold, 0.3) : mix(P.grassGreen, P.grassSilver, 0.35), cov, { pressure: 0.55, grain: 0.5 });
    }
    return S;
}

function bgSteppe() { return steppe(sheet('bg-steppe'), 'bg-steppe', false); }
function bgSteppeEvening() { return steppe(sheet('bg-steppe-evening'), 'bg-steppe-evening', true); }

// ---------------------------------------------------------------------------
// Under water
// ---------------------------------------------------------------------------
function bgUnder() {
    const S = sheet('bg-under');
    // daylight shafts slanting down from the surface, widening and fading with depth
    const r = rng(41);
    const shafts = [];
    for (let k = 0; k < 6; k++) shafts.push({ x: (k + 0.15 + r() * 0.7) * (W / 6) - 260, w: 50 + r() * 70, spread: 0.12 + r() * 0.1, s: 0.65 + r() * 0.35 });
    const ang = 1.18;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const shaft = pressureMap(W, H, (x, y) => {
        let v = 0;
        for (const sh of shafts) {
            const along = y / sa;
            const cx = sh.x + along * ca;
            const half = sh.w + along * sh.spread;
            const d = Math.abs(x - cx) * sa;
            v = Math.max(v, sh.s * Math.pow(clamp01(1 - d / half), 1.2));
        }
        return v * (1 - smoothstep(0.05, 1, y / H) * 0.8);
    });
    const vary = fbm(W, H, 42, [[3, 3, 0.6], [7, 6, 0.4]], 1.2);
    const lightK = fmap(shaft, (v) => 1 - 0.8 * v);
    wash(S, PX.tealLight, { angle: -0.05, gap: 2.2, len: [50, 160], pressure: 0.95, pmap: fmap(lightK, (v) => 0.55 + 0.45 * v) });
    wash(S, P.deepTeal, { angle: -0.03, gap: 2.3, len: [50, 160], grain: 0.35,
        pmap: vmap(prof([[0, 0.1], [0.3, 0.45], [0.7, 0.8], [1, 0.95]]), fmap(lightK, (v, i) => v * (0.8 + 0.4 * vary[i]))) });
    wash(S, P.seaDeep, { angle: 0.04, gap: 2.6, len: [40, 140], grain: 0.4, pmap: vmap(prof([[0.35, 0], [0.7, 0.45], [1, 0.8]]), lightK) });
    wash(S, P.kelpForest, { angle: -0.08, gap: 3, len: [40, 120], grain: 0.4, pmap: vmap(prof([[0.6, 0], [0.85, 0.3], [1, 0.5]]), vary) });
    S.burnish(null, 3, 0.55);
    // A distant forest, pale enough to stay behind the playable fronds. Its
    // edges are pencil hatching rather than a second set of sharp colliders.
    const far = rng(46);
    for (let k = 0; k < 19; k++) {
        const x = far() * W, top = H * (0.36 + far() * 0.4), sway = 15 + far() * 30;
        const half = 5 + far() * 10, phase = far() * Math.PI * 2;
        const left = [], right = [];
        for (let j = 0; j <= 28; j++) {
            const u = j / 28, y = top + (H + 20 - top) * u;
            const cx = x + Math.sin(u * 7 + phase) * sway * (1 - u);
            const w = Math.sin(Math.PI * Math.min(0.97, u)) * half * (0.75 + 0.25 * Math.sin(u * 43));
            left.push([cx - w, y]); right.unshift([cx + w, y]);
        }
        const m = S.mask([...left, ...right], { feather: 3 });
        wash(S, mix(P.deepTeal, P.kelpForest, 0.18), { angle: 1.35, gap: 2.6, len: [16, 58], width: 2,
            clip: m, pressure: 0.2, grain: 0.5 });
    }
    // the shafts are hatched with light along their slant (broad, soft strokes kept inside them)
    const list = [];
    for (let k = 0; k < 3000; k++) {
        const x = r() * W, y = r() * H;
        const v = shaft[Math.floor(y) * W + Math.floor(x)];
        if (v < 0.3 || r() > v) continue;
        const l = 40 + r() * 120;
        list.push([x - ca * l / 2, y - sa * l / 2, x + (r() - 0.5) * 3, y, x + ca * l / 2, y + sa * l / 2, 3 + r() * 3, 0.85]);
    }
    const cov = S.coverage((c) => { for (const q of list) qstroke(c, ...q, true); });
    lighten(S, cov, { amount: 0.68, grain: 0.3, pmap: fmap(shaft, (v) => smoothstep(0.15, 0.6, v)), color: mix(P.paper, P.sunGlow, 0.22) });
    // a few faint horizontal current streaks
    wash(S, mix(P.deepTeal, P.seaDeep, 0.5), { angle: 0, angleJitter: 0.01, gap: 6, len: [100, 300], width: 2, grain: 0.35,
        pmap: vmap(prof([[0.2, 0.1], [0.6, 0.35], [1, 0.3]]), fmap(bands(43, 3, 30, 2), (v) => smoothstep(0.6, 0.9, v))) });
    S.burnish(null, 1, 0.3);
    const dust = [];
    for (let k = 0; k < 100; k++) {
        const x = r() * W, y = r() * H;
        dust.push([x, y, x + 1, y - 1, x + 2, y - 2, 1 + r(), 0.3 + r() * 0.35]);
    }
    const specks = S.coverage((c) => { for (const q of dust) qstroke(c, ...q, true); });
    lighten(S, specks, { amount: 0.38, grain: 0.4, color: P.skyPale });
    return S;
}

// ---------------------------------------------------------------------------
// Spegelviken
// ---------------------------------------------------------------------------
function bgBay(evening = false) {
    const S = sheet(evening ? 'bg-bay-evening' : 'bg-bay');
    const HOR = 0.6;
    const hy = H * HOR;
    const vary = fbm(W, H, 51, [[3, 2, 0.6], [7, 4, 0.4]], 1.2);
    // The evening starts with warm pencil strokes; the daytime stays shaded.
    if (evening) eveningSky(S, 57, HOR);
    else {
        // cool blue-grey sky
        wash(S, P.skyPale, { angle: -0.01, gap: 2.4, len: [80, 220], pressure: 0.85 });
        wash(S, PX.bayGrey, { angle: -0.022, gap: 2.4, len: [60, 190], pmap: vmap(prof([[0, 0.62], [0.3, 0.5], [0.55, 0.28], [0.6, 0.2]]), fmap(vary, (v) => 0.8 + 0.4 * v)) });
        wash(S, P.skyBlue, { angle: 0.04, gap: 3.2, len: [40, 140], pmap: vmap(prof([[0, 0.3], [0.4, 0.32], [0.6, 0.1]])) });
        S.burnish(null, 3, 0.6);
        wash(S, PX.bayGrey, { angle: -0.004, angleJitter: 0.01, gap: 3, len: [120, 420], grain: 0.2,
            pmap: vmap(prof([[0, 0.4], [0.5, 0.3], [0.6, 0]]), fmap(bands(52, 3, 36, 2.2), (v) => smoothstep(0.62, 0.9, v))) });
        S.burnish(null, 1, 0.4);
    }

    // calm water: pale at the far end, shaded blue-grey toward us
    const water = S.mask([[0, hy - 2], [W, hy - 2], [W, H], [0, H]]);
    const sl = fmap(bands(53, 2, 80, 2.3), (v) => 1 - 0.6 * smoothstep(0.8, 0.96, v));
    wash(S, mix(PX.bayGrey, P.skyPale, 0.45), { angle: 0, angleJitter: 0.008, gap: 2, len: [80, 240], clip: water, pressure: 0.9 });
    wash(S, PX.bayDeep, { angle: 0.003, angleJitter: 0.01, gap: 2, len: [60, 220], clip: water, grain: 0.45, pmap: vmap(prof([[HOR, 0.2], [0.75, 0.45], [1, 0.8]]), sl) });
    if (evening) wash(S, PX.rose, { angle: 0, gap: 2.8, len: [50, 180], clip: water, grain: 0.35,
        pmap: vmap(prof([[HOR, 0.65], [0.73, 0.36], [1, 0.05]]), sl) });

    // pale grey cliffs on both sides, and their mirror images in the still water
    const left = smooth([[-30, H * 0.14], [90, H * 0.12], [210, H * 0.17], [300, H * 0.16], [390, H * 0.26], [470, H * 0.33], [520, H * 0.45], [610, H * 0.53], [700, hy + 2], [-30, hy + 2]], { closed: true, steps: 6, tension: 0.4 });
    const right = smooth([[W + 30, H * 0.26], [W - 90, H * 0.22], [W - 170, H * 0.27], [W - 250, H * 0.3], [W - 330, H * 0.4], [W - 420, H * 0.47], [W - 470, H * 0.52], [W - 560, hy + 2], [W + 30, hy + 2]], { closed: true, steps: 6, tension: 0.4 });
    const flip = (poly) => poly.map(([x, y]) => [x, 2 * hy - y]);
    for (const cl of [left, right]) {
        const rm = S.mask(flip(cl), { feather: 2 });
        wash(S, mix(P.rock, PX.bayDeep, 0.3), { angle: 0, angleJitter: 0.01, gap: 2, len: [40, 160], clip: rm, grain: 0.4, pmap: fmap(sl, (v, i) => v * 0.6 * (1 - 0.5 * smoothstep(hy, H, Math.floor(i / W)))) });
    }
    S.burnish(water, 2, 0.45);
    paleStreaks(S, 54, { n: 110, y0: hy + 6, y1: H, len: [60, 360], width: [1.3, 3], amount: 0.55, weight: prof([[HOR, 1], [0.8, 0.6], [1, 0.3]]) });
    // shade over the water near the cliffs
    wash(S, PX.bayDeep, { angle: 0, gap: 2.8, len: [60, 200], clip: water, grain: 0.35,
        pmap: pressureMap(W, H, (x, y) => 0.35 * (1 - smoothstep(0.18, 0.4, Math.min(x, W - x) / W)) * smoothstep(hy, hy + 60, y)) });

    for (const [k, cl] of [[0, left], [1, right]]) {
        const m = S.mask(cl);
        const { id, edge, seeds } = voronoiT(W, H, 55 + k, 26, { sx: 0.8 });
        wash(S, mix(P.rock, P.paper, 0.45), { angle: -0.5, gap: 2.3, len: [30, 80], clip: m, pressure: 0.85, grain: 0.35 });
        const rr = rng(56 + k);
        const angs = [-0.8, -0.3, 0.3, 0.8, 1.2];
        seeds.forEach(([sx, sy], j) => {
            const fm = fmap(id, (v, i) => (v === j ? m[i] * smoothstep(0.5, 3, edge[i]) : 0));
            if (!fm.some((v) => v > 0.5)) return;
            const tone = 0.22 + rr() * 0.45;
            S.hatch(P.rock, { angle: angs[Math.floor(rr() * angs.length)], gap: 2.4, len: [20, 60], width: 2, clip: fm, grain: 0.5,
                pmap: pressureMap(W, H, (x, y) => tone * (0.75 + 0.5 * smoothstep(sy - 60, sy + 80, y))) });
        });
        const rim = fmap(edge, (v, i) => m[i] * Math.pow(1 - smoothstep(1, 14, v), 1.3));
        S.hatch(P.rockDark, { angle: 0.9, gap: 2.5, len: [10, 26], width: 1.7, pmap: rim, pressure: 0.5, grain: 0.55 });
        S.deposit(P.graphite, fmap(edge, (v, i) => m[i] * (1 - smoothstep(0.5, 2.4, v)) * 0.7), { pressure: 0.5, grain: 0.5 });
        // the side facing the bay is in shade
        wash(S, mix(P.rockDark, PX.bayDeep, 0.35), { angle: 1.1, gap: 2.6, len: [20, 60], clip: m, grain: 0.4,
            pmap: pressureMap(W, H, (x) => 0.5 * (k === 0 ? smoothstep(250, 700, x) : 1 - smoothstep(W - 700, W - 250, x))) });
        S.burnish(m, 1, 0.25);
        S.outline(P.graphite, cl.filter(([x, y]) => y < hy - 1 && x > -10 && x < W + 10), { closed: false, width: 2.4, wobble: 1.2, alpha: 0.85, pressure: 0.7, passes: 2, opaque: false, grain: 0.5 });
        if (evening) wash(S, P.sunGlow, { angle: -0.4, gap: 3, len: [22, 70], clip: m, grain: 0.4,
            pmap: pressureMap(W, H, (x, y) => 0.32 * (1 - smoothstep(hy * 0.3, hy, y))) });
    }
    // her dark-blue waterline where the cliffs meet the calm sea
    for (const [x0, x1] of [[0, 720], [W - 580, W]]) {
        S.outline(P.foamLine, [[x0, hy + 1], [(x0 + x1) / 2, hy + 1.5], [x1, hy + 1]], { closed: false, width: 2.2, wobble: 0.8, alpha: 0.85, pressure: 0.65, passes: 1, opaque: false, grain: 0.5 });
    }
    reflectionPath(S, 59, { horizon: HOR, x: 0.55, warm: evening, amount: evening ? 0.65 : 0.28 });
    return S;
}

// ---------------------------------------------------------------------------
// Beyond Veckmuren: the folded-under sea
// ---------------------------------------------------------------------------
function bgFold() {
    const S = sheet('bg-fold');
    const vary = fbm(W, H, 61, [[3, 2, 0.6], [6, 4, 0.4]], 1.1);
    wash(S, mix(P.skyPale, PX.bayGrey, 0.35), { angle: 0, angleJitter: 0.006, gap: 2.3, len: [120, 320], pressure: 0.8, pmap: fmap(vary, (v) => 0.75 + 0.35 * v) });
    wash(S, mix(P.skyBlue, PX.bayGrey, 0.5), { angle: 0.004, angleJitter: 0.006, gap: 3.4, len: [120, 360], width: 2.2, grain: 0.35, pmap: vmap(prof([[0, 0.15], [0.5, 0.3], [1, 0.45]])) });
    S.burnish(null, 4, 0.7);
    // the pressed ghost of waves, flattened
    const r = rng(62);
    const lines = [];
    for (let k = 0; k < 40; k++) {
        const y = 60 + r() * (H - 100), x0 = r() * W, l = 160 + r() * 420, amp = 1 + r() * 1.5, per = 60 + r() * 50;
        const pts = [];
        for (let x = 0; x <= l; x += 6) pts.push([x0 + x, y + Math.sin((x / per) * Math.PI * 2) * amp]);
        lines.push(pts);
    }
    const cov = S.coverage((c) => { c.lineCap = 'round'; for (const pts of lines) { c.lineWidth = 1.6; c.globalAlpha = 0.5; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); } });
    S.deposit(mix(P.seaBlue, PX.bayGrey, 0.5), cov, { pressure: 0.3, grain: 0.8 });
    // a few dead-straight crease lines
    for (const [y, a] of [[H * 0.31, 0.75], [H * 0.62, 0.55], [H * 0.83, 0.4]]) {
        const sh = S.coverage((c) => { c.lineCap = 'butt'; c.lineWidth = 7; c.globalAlpha = 0.4; c.beginPath(); c.moveTo(-10, y + 4); c.lineTo(W + 10, y + 4); c.stroke(); }, { additive: false });
        S.deposit(PX.bayGrey, sh, { pressure: a, grain: 0.3 });
        const ln = S.coverage((c) => { c.lineCap = 'butt'; c.lineWidth = 1.4; c.globalAlpha = 1; c.beginPath(); c.moveTo(-10, y); c.lineTo(W + 10, y); c.stroke(); }, { additive: false });
        S.deposit(P.graphiteSoft, ln, { pressure: a, grain: 0.25 });
        const hl = S.coverage((c) => { c.lineCap = 'butt'; c.lineWidth = 2; c.globalAlpha = 1; c.beginPath(); c.moveTo(-10, y - 2.2); c.lineTo(W + 10, y - 2.2); c.stroke(); }, { additive: false });
        lighten(S, hl, { amount: 0.5 * a, grain: 0.1 });
    }
    return S;
}

// ---------------------------------------------------------------------------
export const BACKDROPS = [
    { name: 'bg-beach', bundle: 'boot', draw: bgBeach, quality: 62 },
    { name: 'bg-beach-evening', bundle: 'land', draw: bgBeachEvening, quality: 72 },
    { name: 'bg-steppe', bundle: 'land', draw: bgSteppe, quality: 72 },
    { name: 'bg-steppe-evening', bundle: 'land', draw: bgSteppeEvening, quality: 72 },
    { name: 'bg-under', bundle: 'sea', draw: bgUnder, quality: 72 },
    { name: 'bg-bay', bundle: 'bay', draw: () => bgBay(false), quality: 72 },
    { name: 'bg-bay-evening', bundle: 'bay', draw: () => bgBay(true), quality: 76, half: true },
    { name: 'bg-fold', bundle: 'sea', draw: bgFold, quality: 72 }
];

export function renderBackdrop(name) {
    const b = BACKDROPS.find((x) => x.name === name);
    if (!b) throw new Error(`unknown backdrop ${name}`);
    // Rendering an individual sheet must match rendering the whole module.
    washCount = 0;
    const canvas = toCanvasOpaque(b.draw());
    if (!b.half) return canvas;
    // A distant evening variant need not add another 8 MiB resident texture.
    const far = createCanvas(W / 2, H / 2), ctx = far.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, W / 2, H / 2);
    return far;
}

export async function build(api) {
    for (const b of BACKDROPS) api.image(b.name, renderBackdrop(b.name), { bundle: b.bundle, quality: b.quality });
}
