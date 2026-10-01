/*
 * Sköldhästen — props, particles and decals (atlases at scale 1: 1 px = 1 wu).
 *
 * Every prop is "paper cut out along its outline, with pencil on it": a solid
 * paper silhouette, pencil layers clipped to it, and a graphite contour round
 * solid things (dark-blue round foam and droplets). Line-only things (her
 * m-gulls, rays, dotted outlines) are pure pigment with alpha. Clouds are
 * outline only with a paper-white inside that covers the sun.
 *
 * Atlases: `props` (boot) plus `props-land`, `props-sea`, `props-bay` for the
 * later bundles. All frames face right; anchors per SPEC §3.
 */
import { PENCILS as P, hashSeed, rng, mix, smooth, resample, ellipse, transform, pressureMap, edgeBand, unionMasks } from './pencil.mjs';
import { PX, spriteSheet, addSolid, finish, ribbon, lighten, dotted, fmap, smoothstep, clamp01, withTooth, voronoiT } from './materials.mjs';
import { runupShape, surfaceGround, SPLASH_BASE } from '../../skoldhast/src/stuck-wave-shape.mjs';
import { SCENES } from '../../skoldhast/src/content/world.mjs';

// ---------------------------------------------------------------------------
// Pencils only the props need
// ---------------------------------------------------------------------------
const PP = {
    pink: '#f0b3c2', peach: '#f6c39c', lilac: '#c7b4e2', mint: '#aedcc6', lemon: '#f2e19a', powder: '#b4d2ef',
    pinkDeep: '#d77f97', peachDeep: '#de9a66', lilacDeep: '#9b83c4', mintDeep: '#6fb394', lemonDeep: '#d6b84e', powderDeep: '#7ea9d6',
    drift: '#b9ada0', driftDark: '#857868', sandstone: '#dbb27a', sandstoneDark: '#a8794a', cave: '#1d3a52',
    bark: '#7a5a3c', iron: PX.iron, flag: P.red, hut: PX.falu, boatBlue: '#3d6fae', leaf: PX.leaf
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const ATLASES = {
    props: { bundle: 'boot', quality: 70 },
    'props-land': { bundle: 'land' },
    'props-sea': { bundle: 'sea' },
    'props-bay': { bundle: 'bay' }
};
export const ITEMS = [];
function item(atlas, name, anchor, draw) { ITEMS.push({ atlas, name, anchor, draw }); }

// ---------------------------------------------------------------------------
// Shape helpers
// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;
/** An irregular smooth closed blob. */
function blob(cx, cy, rx, ry, r, { n = 9, j = 0.14, rot = 0, flat = 0 } = {}) {
    const pts = [];
    const ph = r() * TAU;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + ph;
        const k = 1 + (r() - 0.5) * 2 * j;
        let x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
        if (flat && y > 0) y *= 1 - flat;
        pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return smooth(pts, { steps: 8, tension: 0.5 });
}
function rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function roundRect(x, y, w, h, rad, n = 5) {
    const out = [];
    const c = [[x + w - rad, y + rad, -Math.PI / 2], [x + w - rad, y + h - rad, 0], [x + rad, y + h - rad, Math.PI / 2], [x + rad, y + rad, Math.PI]];
    for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; out.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
    return out;
}
function arc(cx, cy, rx, ry, a0, a1, n = 24) {
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return out;
}
/** A closed shape around a spine with a width profile (tongues, blades, logs). */
function around(spine, wfn, { steps = 60, capTip = true } = {}) {
    const q = resample(smooth(spine, { closed: false, steps: 10 }), 2);
    const n = q.length;
    const acc = [0];
    for (let i = 1; i < n; i++) acc.push(acc[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const L = acc[n - 1] || 1;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
        const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
        const [wl, wr] = [].concat(wfn(acc[i] / L, i));
        left.push([q[i][0] + ty * wl, q[i][1] - tx * wl]);
        right.push([q[i][0] - ty * (wr ?? wl), q[i][1] + tx * (wr ?? wl)]);
    }
    return left.concat(right.reverse());
}
function shift(poly, dx, dy) { return poly.map(([x, y]) => [x + dx, y + dy]); }
function bounds(poly) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return [x0, y0, x1, y1];
}

/**
 * Contours of a mask (marching squares at `level`): closed polylines in pixel
 * coordinates, simplified to points about `step` px apart.
 */
function contours(mask, w, h, { level = 0.5, step = 2.5, minLen = 12 } = {}) {
    const v = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
    const segs = [];
    const lerpE = (x0, y0, x1, y1) => { const a = v(x0, y0), b = v(x1, y1); const t = (level - a) / ((b - a) || 1e-6); return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]; };
    for (let y = -1; y < h; y++) for (let x = -1; x < w; x++) {
        const a = v(x, y) >= level, b = v(x + 1, y) >= level, c = v(x + 1, y + 1) >= level, d = v(x, y + 1) >= level;
        const idx = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const T = () => lerpE(x, y, x + 1, y), R = () => lerpE(x + 1, y, x + 1, y + 1), B = () => lerpE(x, y + 1, x + 1, y + 1), L = () => lerpE(x, y, x, y + 1);
        const table = {
            1: [[L, B]], 2: [[B, R]], 3: [[L, R]], 4: [[T, R]], 5: [[L, T], [B, R]], 6: [[T, B]], 7: [[L, T]],
            8: [[L, T]], 9: [[T, B]], 10: [[L, B], [T, R]], 11: [[T, R]], 12: [[L, R]], 13: [[B, R]], 14: [[L, B]]
        }[idx];
        for (const [p, q] of table) segs.push([p(), q()]);
    }
    const key = (p) => `${Math.round(p[0] * 64)},${Math.round(p[1] * 64)}`;
    const ends = new Map();
    segs.forEach((sg, i) => { for (const e of [0, 1]) { const k = key(sg[e]); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(i); } });
    const used = new Uint8Array(segs.length);
    const out = [];
    for (let i = 0; i < segs.length; i++) {
        if (used[i]) continue;
        used[i] = 1;
        const line = [segs[i][0], segs[i][1]];
        let grew = true;
        while (grew) {
            grew = false;
            const k = key(line[line.length - 1]);
            for (const j of ends.get(k) || []) {
                if (used[j]) continue;
                used[j] = 1;
                const sg = segs[j];
                line.push(key(sg[0]) === k ? sg[1] : sg[0]);
                grew = true;
                break;
            }
        }
        if (line.length * 1 >= minLen) out.push(resample(line, step));
    }
    return out;
}
/** Circles along a curved spine, radius r0 → r1 (for lobed foam). */
function lobes(spine, r0, r1, rnd, { n = 7, j = 0.25 } = {}) {
    const q = resample(smooth(spine, { closed: false, steps: 10 }), 1);
    const out = [];
    for (let k = 0; k < n; k++) {
        const t = k / (n - 1);
        const p = q[Math.min(q.length - 1, Math.round(t * (q.length - 1)))];
        const rr = (r0 + (r1 - r0) * t) * (1 + (rnd() - 0.5) * j);
        out.push(ellipse(p[0] + (rnd() - 0.5) * rr * 0.4, p[1] + (rnd() - 0.5) * rr * 0.4, rr, rr * (0.85 + rnd() * 0.25), 20));
    }
    return out;
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------
/** Paper body: the silhouette becomes opaque paper. Returns its mask. */
function body(S, poly, { feather = 0 } = {}) {
    const m = S.mask(poly, { feather });
    addSolid(S, m);
    return m;
}
/** Pencil layer clipped to a mask. */
function pen(S, color, mask, o = {}) {
    S.hatch(color, { gap: 2.2, width: 1.7, len: [10, 30], grain: 0.55, alpha: [0.6, 1], jitter: 0.9, clip: mask, ...o });
}
/** Blended layer with its own tooth roll (no speckle when stacking). */
let rollN = 0;
function soft(S, color, mask, o = {}) {
    const k = ++rollN;
    withTooth(S, (k * 97) % S.w, (k * 57) % S.h, () => pen(S, color, mask, { grain: 0.35, ...o }));
}
/** A contour. */
function ink(S, pts, { color = P.graphite, width = 2.4, closed = true, pressure = 0.95, wobble = 0.7, passes = 2, grain = 0.6, alpha = 0.95 } = {}) {
    S.outline(color, pts, { width, closed, pressure, wobble, passes, grain, alpha, opaque: false });
}
/** The part of `mask` not covered by the same shape shifted by (dx, dy): a rim on one side. */
function rim(S, poly, mask, dx, dy, feather = 2) {
    const m2 = S.mask(shift(poly, dx, dy), { feather });
    return fmap(mask, (v, i) => v * (1 - m2[i]));
}
/** Pressure map along a direction (0 at p0, 1 at p1). */
function ramp(S, x0, y0, x1, y1, v0 = 0, v1 = 1) {
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    return pressureMap(S.w, S.h, (x, y) => v0 + (v1 - v0) * clamp01(((x - x0) * dx + (y - y0) * dy) / L2));
}
/** Radial pressure map. */
function radial(S, cx, cy, r0, r1, v0 = 1, v1 = 0, ry = null) {
    const k = ry ? r1 / ry : 1;
    return pressureMap(S.w, S.h, (x, y) => { const d = Math.hypot(x - cx, (y - cy) * k); return v0 + (v1 - v0) * smoothstep(r0, r1, d); });
}
/** Lines (open polylines) drawn as pencil marks. */
function lines(S, color, list, { width = 1.4, pressure = 0.8, grain = 0.6, clip = null } = {}) {
    const cov = S.coverage((c) => {
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (const l of list) {
            const pts = l.pts || l;
            c.lineWidth = l.width || width; c.globalAlpha = l.alpha ?? 0.9;
            c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
        }
    });
    S.deposit(color, cov, { pressure, grain, clip });
}
/** Tapered ribbon mark (wrapper). */
function mark(S, color, pts, width, o = {}) { ribbon(S, color, pts, { width, grain: 0.55, ...o }); }
function done(S) { return finish(S); }
/** Finish with an alpha envelope (0..1 per pixel) so a sprite melts into what is behind it. */
function doneFade(S, fade) {
    const cv = finish(S);
    const ctx = cv.getContext('2d');
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const d = img.data;
    for (let i = 0, j = 3; i < fade.length; i++, j += 4) d[j] = Math.round(d[j] * clamp01(fade[i]));
    ctx.putImageData(img, 0, 0);
    return cv;
}

// ---------------------------------------------------------------------------
// SKY (boot): sun, clouds, m-gulls
// ---------------------------------------------------------------------------
item('props', 'sun', [0.5, 0.5], () => {
    const W = 264, C = W / 2, R = 84;
    const S = spriteSheet(W, W, 'sun');
    const r = rng(7);
    // soft glow: paper whitening the sky, tinted yellow, fading out
    const glow = S.mask(ellipse(C, C, R * 1.46, R * 1.46, 64), { feather: 16 });
    addSolid(S, fmap(glow, (v) => v * 0.78));
    soft(S, P.sunGlow, glow, { angle: 0.5, gap: 2.6, len: [10, 28], width: 2, pmap: radial(S, C, C, R * 0.9, R * 1.5, 0.9, 0) });
    soft(S, P.sunGlow, glow, { angle: -0.7, gap: 3.2, len: [8, 20], width: 1.8, pmap: radial(S, C, C, R * 0.95, R * 1.3, 0.55, 0) });
    // the disc: pale on top, pressed harder toward the lower edge
    const disc = ellipse(C, C, R, R, 72);
    const dm = body(S, disc);
    soft(S, P.sunGlow, dm, { angle: 0.6, gap: 2.3, len: [14, 40], width: 2, pressure: 0.95 });
    soft(S, P.sunYellow, dm, { angle: 0.55, gap: 2.4, len: [14, 44], width: 2, pmap: ramp(S, C, C - R, C, C + R, 0.25, 0.85) });
    soft(S, P.sunYellow, dm, { angle: -0.35, gap: 3.2, len: [10, 30], width: 1.8, pmap: ramp(S, C, C - R, C, C + R, 0.05, 0.5) });
    pen(S, PX.sunDeep, dm, { angle: 0.4, gap: 2.6, len: [8, 24], width: 1.7, grain: 0.5, pmap: fmap(edgeBand(dm, W, W, 12), (v, i) => 0.7 * v * clamp01((Math.floor(i / W) - C) / R + 0.1)) });
    S.burnish(dm, 1, 0.3);
    ink(S, disc, { color: PX.sunLine, width: 2, pressure: 0.85, wobble: 0.6 });
    // ray lines in graphite, unevenly spaced, starting a little off the disc
    const rays = [];
    const n = 13;
    for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + (r() - 0.5) * 0.28 + 0.12;
        const r0 = R * (1.12 + r() * 0.08), r1 = R * (1.34 + r() * 0.18);
        rays.push([[C + Math.cos(a) * r0, C + Math.sin(a) * r0], [C + Math.cos(a) * r1, C + Math.sin(a) * r1]]);
    }
    for (const ray of rays) ink(S, ray, { closed: false, width: 1.9, pressure: 0.7, wobble: 0.4, passes: 1 });
    return done(S);
});

/** Her clouds: long, slanting, a pointed tail on the left, lobes along the top. */
const CLOUDS = {
    'cloud-1': { w: 520, h: 150,
        top: [[0.00, 0.93], [0.06, 0.86], [0.13, 0.79], [0.17, 0.7], [0.21, 0.72], [0.26, 0.62], [0.33, 0.52], [0.38, 0.43], [0.43, 0.45], [0.47, 0.35], [0.55, 0.26], [0.62, 0.2], [0.67, 0.22], [0.72, 0.13], [0.8, 0.07], [0.88, 0.05], [0.95, 0.08], [0.99, 0.17]],
        bottom: [[0.99, 0.17], [0.97, 0.28], [0.9, 0.33], [0.84, 0.34], [0.86, 0.42], [0.8, 0.47], [0.7, 0.47], [0.6, 0.52], [0.5, 0.6], [0.44, 0.66], [0.38, 0.64], [0.33, 0.72], [0.24, 0.8], [0.14, 0.88], [0.06, 0.94], [0.00, 0.93]],
        curls: [[[0.84, 0.34], [0.8, 0.31], [0.76, 0.33]], [[0.38, 0.64], [0.37, 0.57], [0.34, 0.56]], [[0.21, 0.72], [0.22, 0.77]]] },
    'cloud-2': { w: 400, h: 128,
        top: [[0.00, 0.9], [0.08, 0.8], [0.15, 0.74], [0.2, 0.62], [0.26, 0.64], [0.33, 0.5], [0.42, 0.4], [0.5, 0.34], [0.55, 0.24], [0.62, 0.26], [0.7, 0.15], [0.8, 0.1], [0.9, 0.12], [0.97, 0.2], [0.99, 0.32]],
        bottom: [[0.99, 0.32], [0.94, 0.42], [0.86, 0.44], [0.88, 0.52], [0.8, 0.58], [0.7, 0.56], [0.6, 0.62], [0.48, 0.68], [0.4, 0.66], [0.32, 0.76], [0.2, 0.84], [0.1, 0.9], [0.00, 0.9]],
        curls: [[[0.86, 0.44], [0.82, 0.4], [0.78, 0.42]], [[0.26, 0.64], [0.27, 0.7]]] },
    'cloud-3': { w: 300, h: 110,
        top: [[0.00, 0.62], [0.04, 0.44], [0.12, 0.36], [0.2, 0.42], [0.26, 0.3], [0.38, 0.2], [0.5, 0.24], [0.58, 0.12], [0.72, 0.08], [0.86, 0.12], [0.96, 0.22], [0.99, 0.36]],
        bottom: [[0.99, 0.36], [0.95, 0.5], [0.84, 0.54], [0.74, 0.5], [0.68, 0.62], [0.72, 0.74], [0.62, 0.84], [0.46, 0.84], [0.36, 0.76], [0.24, 0.84], [0.1, 0.84], [0.03, 0.76], [0.00, 0.62]],
        curls: [[[0.74, 0.5], [0.7, 0.44], [0.65, 0.45]], [[0.2, 0.42], [0.22, 0.5], [0.27, 0.52]]] }
};
for (const [name, c] of Object.entries(CLOUDS)) {
    item('props', name, [0.5, 0.5], () => {
        const pad = 8, W = c.w + pad * 2, H = c.h + pad * 2;
        const S = spriteSheet(W, H, name);
        const map = (pts) => pts.map(([x, y]) => [pad + x * c.w, pad + y * c.h]);
        const top = smooth(map(c.top), { closed: false, steps: 8, tension: 0.5 });
        const bot = smooth(map(c.bottom), { closed: false, steps: 8, tension: 0.5 });
        const outline = top.concat(bot.slice(1));
        body(S, outline);
        ink(S, top, { closed: false, width: 2.1, pressure: 0.85, wobble: 0.8 });
        ink(S, bot, { closed: false, width: 2, pressure: 0.82, wobble: 0.8 });
        for (const cu of c.curls) ink(S, smooth(map(cu), { closed: false, steps: 6 }), { closed: false, width: 1.8, pressure: 0.75, passes: 1 });
        return done(S);
    });
}

/** Her m-gulls: one blue-grey stroke, pressed hardest at the wing tops. */
const GULLS = [
    // [inner wing angle (up), tip droop, span]
    ['gull-m-1', 0.95, 0.15, 50],   // wings high
    ['gull-m-2', 0.55, 0.62, 56],   // her m
    ['gull-m-3', 0.18, 0.45, 60],   // glide
    ['gull-m-4', -0.35, 0.2, 54]    // wings down
];
for (const [name, up, droop, span] of GULLS) {
    item('props', name, [0.5, 0.5], () => {
        const W = 68, H = 44, cx = W / 2, cy = H / 2 + 2;
        const S = spriteSheet(W, H, name);
        const half = span / 2;
        const inner = half * 0.5, outer = half * 0.5;
        const wy = -Math.sin(up) * inner, wx = Math.cos(up) * inner;
        const tipx = wx + Math.cos(droop) * outer, tipy = wy + Math.sin(droop) * outer;
        const wing = (s) => smooth([[cx, cy], [cx + s * wx * 0.55, cy + wy * 0.85 - 1.5], [cx + s * wx, cy + wy - 1.2], [cx + s * (wx + (tipx - wx) * 0.55), cy + wy + (tipy - wy) * 0.45 - 0.8], [cx + s * tipx, cy + tipy]], { closed: false, steps: 8 });
        for (const s of [-1, 1]) {
            const pts = wing(s);
            // a faint blue smudge under the wing, as she rubbed it
            mark(S, PX.gullSmudge, shift(pts, 0, 2.2), 4.2, { pressure: 0.35, grain: 0.3, profile: (t) => Math.sin(Math.PI * Math.min(1, t * 1.1)) });
            mark(S, PX.gull, pts, 2.7, { pressure: 1, grain: 0.45, profile: (t) => 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95)) });
        }
        return done(S);
    });
}

// ---------------------------------------------------------------------------
// Shared painters
// ---------------------------------------------------------------------------
/** Stone: base tone, facet hatching lit from the upper left, a dark lower rim, a highlight. */
function paintStone(S, poly, m, { base = P.rock, dark = P.rockDark, speck = null, lightK = 0.5 } = {}) {
    const [x0, y0, x1, y1] = bounds(poly);
    soft(S, mix(base, P.paper, 0.35), m, { angle: -0.45, gap: 2.2, len: [8, 24], pressure: 0.9 });
    pen(S, base, m, { angle: 0.75, gap: 2.3, len: [6, 20], pmap: ramp(S, x0, y0, x1 * 0.4 + x0 * 0.6, y1, 0.35, 1) });
    pen(S, base, m, { angle: -0.6, gap: 3, len: [6, 16], pressure: 0.35 });
    const lower = rim(S, poly, m, -Math.max(4, (x1 - x0) * 0.08), -Math.max(4, (y1 - y0) * 0.16), 3);
    pen(S, dark, lower, { angle: 0.9, gap: 2, len: [5, 16], pressure: 0.9, grain: 0.5 });
    const upper = rim(S, poly, m, Math.max(3, (x1 - x0) * 0.06), Math.max(3, (y1 - y0) * 0.12), 3);
    lighten(S, upper, { amount: lightK, grain: 0.3 });
    if (speck) {
        const r = rng(hashSeed(String(x0 + y1)));
        const pts = [];
        for (let k = 0; k < (x1 - x0) * (y1 - y0) / 60; k++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); pts.push([x, y, 0.6 + r() * 0.8]); }
        S.dots(speck, pts, { rx: 1.2, ry: 1, alpha: 0.8, clip: m, grain: 0.5 });
    }
}
/** Wood: base, long grain lines along the angle, darker lower edge. */
function paintWood(S, poly, m, { base = P.wood, dark = P.woodDark, angle = 0, grain = 7, lightK = 0.35 } = {}) {
    const [x0, y0, x1, y1] = bounds(poly);
    soft(S, mix(base, P.paper, 0.3), m, { angle, gap: 2.1, len: [20, 60], pressure: 0.9 });
    pen(S, base, m, { angle, gap: 2.3, len: [20, 70], pressure: 0.75, angleJitter: 0.02 });
    const r = S.rand;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const L = Math.hypot(x1 - x0, y1 - y0);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const gl = [];
    for (let k = 0; k < grain * 3; k++) {
        const off = (r() - 0.5) * L;
        const st = (r() - 0.5) * L * 0.8, len = L * (0.15 + r() * 0.4);
        const pts = [];
        const ph = r() * 6;
        for (let t = 0; t <= len; t += 4) pts.push([cx + ca * (st + t) - sa * off + Math.sin(t * 0.05 + ph) * sa * 1.2, cy + sa * (st + t) + ca * off + Math.sin(t * 0.05 + ph) * 1.2]);
        gl.push({ pts, width: 1 + r() * 0.6, alpha: 0.5 + r() * 0.4 });
    }
    lines(S, dark, gl, { pressure: 0.6, clip: m });
    const lower = rim(S, poly, m, 0, -Math.max(3, (y1 - y0) * 0.22), 2);
    pen(S, dark, lower, { angle: angle + 0.9, gap: 2.2, len: [5, 14], pressure: 0.7 });
    lighten(S, rim(S, poly, m, 0, Math.max(2, (y1 - y0) * 0.12), 2), { amount: lightK, grain: 0.3 });
}
function lum(c) { const [r, g, b] = typeof c === 'string' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c; return (0.3 * r + 0.59 * g + 0.11 * b) / 255; }

// ---------------------------------------------------------------------------
// STRANDEN (boot)
// ---------------------------------------------------------------------------
item('props', 'driftwood-1', [0.5, 1], () => {
    const W = 262, H = 78;
    const S = spriteSheet(W, H, 'driftwood-1');
    const log = smooth([[14, 22], [60, 16], [120, 19], [170, 15], [210, 22], [238, 30], [250, 44], [246, 58], [222, 66], [160, 70], [90, 72], [30, 73], [12, 62], [8, 42]], { steps: 6 });
    const m = body(S, log);
    paintWood(S, log, m, { base: PP.drift, dark: PP.driftDark, angle: 0.02, grain: 9 });
    // a broken branch stub
    const stub = [[174, 22], [186, 5], [198, 11], [190, 24]];
    const sm = body(S, stub);
    paintWood(S, stub, sm, { base: PP.drift, dark: PP.driftDark, angle: -1.0, grain: 2 });
    const sf = ellipse(192, 8, 6.5, 3.2, 16, 0.5);
    body(S, sf);
    soft(S, mix(PP.drift, P.sand, 0.45), S.mask(sf), { pressure: 0.9 });
    ink(S, [[174, 22], [186, 5]], { closed: false, width: 2.3 });
    ink(S, [[198, 11], [190, 24]], { closed: false, width: 2.3 });
    ink(S, sf, { width: 1.8 });
    // the cut end with its rings
    const face = ellipse(18, 46, 12, 26, 32);
    const fm = body(S, face);
    soft(S, mix(PP.drift, P.sand, 0.45), fm, { angle: 0.3, pressure: 0.9 });
    for (const k of [0.75, 0.5, 0.25]) ink(S, ellipse(19, 46, 12 * k, 26 * k, 24), { color: PP.driftDark, width: 1.2, pressure: 0.7, passes: 1 });
    ink(S, [[20, 30], [24, 44]], { closed: false, color: P.graphite, width: 1.3, pressure: 0.7, passes: 1 });
    // cracks and knots
    lines(S, P.graphite, [[[70, 40], [96, 38], [110, 41]], [[140, 52], [168, 50]], [[212, 36], [226, 40]]], { width: 1.3, pressure: 0.7, clip: m });
    ink(S, ellipse(128, 34, 7, 4, 20), { color: PP.driftDark, width: 1.4, pressure: 0.8, passes: 1 });
    ink(S, log, { width: 2.7 });
    ink(S, face, { width: 2.3 });
    return done(S);
});

item('props', 'driftwood-2', [0.5, 1], () => {
    const W = 204, H = 104;
    const S = spriteSheet(W, H, 'driftwood-2');
    // a thick log lying on the sand with a broken branch rising from it
    const branch = [[104, 80], [128, 52], [150, 30], [166, 12], [180, 20], [164, 42], [142, 66], [124, 86]];
    const bm = body(S, smooth(branch, { steps: 5 }));
    paintWood(S, smooth(branch, { steps: 5 }), bm, { base: PP.drift, dark: PP.driftDark, angle: -0.9, grain: 4 });
    const bface = ellipse(173, 16, 8, 4, 18, 0.62);
    body(S, bface);
    soft(S, mix(PP.drift, P.sand, 0.45), S.mask(bface), { pressure: 0.9 });
    ink(S, smooth(branch, { steps: 5 }).slice(0, 25), { closed: false, width: 2.4 });
    ink(S, smooth(branch, { steps: 5 }).slice(28), { closed: false, width: 2.4 });
    ink(S, bface, { width: 1.8 });
    const log = smooth([[14, 70], [60, 72], [110, 76], [160, 80], [190, 84], [198, 92], [192, 101], [140, 101], [80, 101], [20, 101], [10, 90]], { steps: 6 });
    const m = body(S, log);
    paintWood(S, log, m, { base: PP.drift, dark: PP.driftDark, angle: 0.06, grain: 7 });
    lines(S, P.graphite, [[[40, 86], [80, 84], [96, 87]], [[130, 90], [160, 92]]], { width: 1.3, pressure: 0.65, clip: m });
    const face = ellipse(16, 86, 9, 16, 24);
    const fm = body(S, face);
    soft(S, mix(PP.drift, P.sand, 0.45), fm, { pressure: 0.9 });
    for (const k of [0.6, 0.3]) ink(S, ellipse(16.5, 86, 9 * k, 16 * k, 16), { color: PP.driftDark, width: 1.1, pressure: 0.7, passes: 1 });
    ink(S, log, { width: 2.6 });
    ink(S, face, { width: 2.2 });
    return done(S);
});

item('props', 'rock-flat', [0.5, 1], () => {
    const W = 156, H = 48;
    const S = spriteSheet(W, H, 'rock-flat');
    const poly = smooth([[8, 40], [14, 22], [34, 12], [70, 8], [112, 10], [138, 16], [150, 30], [148, 44], [110, 46], [50, 46]], { steps: 6 });
    const m = body(S, poly);
    paintStone(S, poly, m, { base: P.rock, dark: P.rockDark });
    lines(S, P.graphite, [[[60, 20], [74, 26], [90, 24]], [[118, 22], [126, 32]]], { width: 1.2, pressure: 0.6, clip: m });
    ink(S, poly, { width: 2.5 });
    return done(S);
});

const ROCKS = [
    ['rock-1', 56, 38, P.rock, P.rockDark, null, 0.12],
    ['rock-2', 44, 30, mix(P.rock, P.earth, 0.4), mix(P.rockDark, P.woodDark, 0.4), null, 0.2],
    ['rock-3', 66, 44, mix(P.rock, P.skyBlue, 0.15), P.rockDark, P.rockDark, 0.1]
];
for (const [name, w, h, base, dark, speck, flat] of ROCKS) {
    item('props', name, [0.5, 1], () => {
        const S = spriteSheet(w + 6, h + 4, name);
        const r = rng(hashSeed(name));
        const poly = blob(w / 2 + 3, h / 2 + 3, w / 2, h / 2, r, { n: 8, j: 0.12, flat: 0.4 });
        const [, , , by] = bounds(poly);
        const pl = shift(poly, 0, h + 2 - by);
        const m = body(S, pl);
        paintStone(S, pl, m, { base, dark, speck });
        ink(S, pl, { width: 2.3 });
        return done(S);
    });
}

/** Big musical shells, lying on the sand, pastel. */
const SHELLS = {
    'shell-1': { w: 58, h: 50, col: PP.pink, deep: PP.pinkDeep, kind: 'scallop' },
    'shell-2': { w: 64, h: 40, col: PP.peach, deep: PP.peachDeep, kind: 'conch' },
    'shell-3': { w: 50, h: 44, col: PP.lilac, deep: PP.lilacDeep, kind: 'cockle' },
    'shell-4': { w: 48, h: 50, col: PP.mint, deep: PP.mintDeep, kind: 'turban' },
    'shell-5': { w: 54, h: 32, col: PP.lemon, deep: PP.lemonDeep, kind: 'cowrie' },
    'shell-6': { w: 52, h: 42, col: PP.powder, deep: PP.powderDeep, kind: 'moon' }
};
for (const [name, sh] of Object.entries(SHELLS)) {
    item('props', name, [0.5, 1], () => {
        const W = sh.w + 8, H = sh.h + 6;
        const S = spriteSheet(W, H, name);
        const cx = W / 2, by = H - 3;
        let poly, details = [];
        if (sh.kind === 'scallop') {
            // a fan standing on its hinge, ribs radiating from the bottom
            const R = sh.h - 6, hx = cx, hy = by - 4;
            poly = [];
            for (let i = 0; i <= 14; i++) { const a = Math.PI * (1.08 + 0.84 * i / 14); poly.push([hx + Math.cos(a) * R * 0.98 * (1 + 0.05 * Math.sin(i * 1.8 * Math.PI)), hy + Math.sin(a) * R]); }
            poly = poly.concat([[hx + 10, hy + 2], [hx + 12, by], [hx - 12, by], [hx - 10, hy + 2]]);
            poly = smooth(poly, { steps: 3, tension: 0.4 });
            for (let i = 1; i < 9; i++) { const a = Math.PI * (1.12 + 0.76 * i / 9); details.push([[hx, hy], [hx + Math.cos(a) * R * 0.95, hy + Math.sin(a) * R * 0.95]]); }
            details.push([[hx - 12, hy + 1], [hx + 12, hy + 1]]);
        } else if (sh.kind === 'conch') {
            // lying on its side: the spire points left, the big whorl and its opening on the right
            poly = smooth([[3, by - 16], [8, by - 19], [12, by - 24], [16, by - 21], [22, by - 29], [28, by - 26], [36, by - 35], [46, by - 36], [56, by - 31], [63, by - 21], [64, by - 11], [60, by - 3], [46, by - 1], [30, by - 4], [18, by - 9], [8, by - 13]], { steps: 4, tension: 0.45 });
            details = [smooth([[16, by - 21], [17, by - 15], [15, by - 10]], { closed: false }), smooth([[28, by - 26], [29, by - 15], [27, by - 5]], { closed: false }),
                smooth([[40, by - 33], [44, by - 30], [48, by - 32]], { closed: false }), smooth([[50, by - 32], [54, by - 29], [58, by - 30]], { closed: false })];
            details.push(ellipse(54, by - 14, 5, 9.5, 18));
        } else if (sh.kind === 'cockle') {
            poly = smooth([[cx, by], [cx - 20, by - 8], [cx - 24, by - 24], [cx - 16, by - 38], [cx, by - 42], [cx + 16, by - 38], [cx + 24, by - 24], [cx + 20, by - 8]], { steps: 6 });
            for (let i = -3; i <= 3; i++) details.push(smooth([[cx + i * 2.5, by - 2], [cx + i * 6, by - 22], [cx + i * 5, by - 39]], { closed: false }));
        } else if (sh.kind === 'turban') {
            // a rounded top shell standing on its opening, spiral bands climbing to the tip
            poly = smooth([[cx - 21, by - 2], [cx - 24, by - 10], [cx - 23, by - 20], [cx - 18, by - 29], [cx - 11, by - 37], [cx - 4, by - 43], [cx, by - 45], [cx + 4, by - 43], [cx + 11, by - 37], [cx + 18, by - 29], [cx + 23, by - 20], [cx + 24, by - 10], [cx + 21, by - 2]], { steps: 5 });
            const band = (y, hw, rise) => smooth([[cx - hw, y + rise], [cx - hw * 0.3, y + rise * 0.2 + 3.5], [cx + hw * 0.4, y - rise * 0.1 + 2.5], [cx + hw, y - rise]], { closed: false });
            details.push(band(by - 13, 24, 3), band(by - 25, 21, 3), band(by - 35, 14, 2.5));
            details.push(ellipse(cx + 8, by - 6, 7, 4, 16));
        } else if (sh.kind === 'cowrie') {
            poly = smooth([[4, by - 6], [8, by - 20], [22, by - 28], [36, by - 28], [48, by - 20], [52, by - 8], [44, by - 1], [12, by - 1]], { steps: 6 });
            details = [smooth([[10, by - 5], [26, by - 8], [44, by - 5]], { closed: false })];
        } else {
            // moon snail: a round spiral
            poly = smooth([[4, by - 4], [6, by - 20], [18, by - 34], [34, by - 36], [46, by - 26], [48, by - 10], [40, by - 1], [16, by]], { steps: 6 });
            const sp = [];
            for (let t = 0; t < 2.6 * Math.PI; t += 0.2) { const rr = 3 + t * 2.4; sp.push([30 - Math.cos(t) * rr * 0.9, by - 18 - Math.sin(t) * rr * 0.8]); }
            details = [sp];
        }
        const m = body(S, poly);
        soft(S, sh.col, m, { angle: -0.5, gap: 2.1, len: [6, 18], pressure: 0.95 });
        const [x0, y0, x1, y1] = bounds(poly);
        pen(S, sh.col, m, { angle: 0.6, gap: 2.2, len: [5, 14], pmap: ramp(S, x0, y0, x1, y1, 0.2, 0.9) });
        pen(S, sh.deep, rim(S, poly, m, -3, -5, 2), { angle: 0.8, gap: 2, len: [4, 12], pressure: 0.8 });
        if (sh.kind === 'cowrie') {
            const r = rng(5);
            const sp = [];
            for (let k = 0; k < 14; k++) sp.push([10 + r() * 36, by - 10 - r() * 16, 0.6 + r() * 0.8]);
            S.dots(sh.deep, sp, { rx: 2, ry: 1.5, clip: m, grain: 0.4 });
        }
        lines(S, sh.deep, details, { width: sh.kind === 'turban' || sh.kind === 'conch' ? 1.7 : 1.3, pressure: 0.9, clip: m });
        lighten(S, rim(S, poly, m, 3, 5, 2), { amount: 0.55, grain: 0.3 });
        ink(S, poly, { width: 2.2 });
        return done(S);
    });
}

const DUNE = [['dune-grass-1', 80, 70, 9], ['dune-grass-2', 104, 96, 12], ['dune-grass-3', 124, 122, 15]];
for (const [name, W, H, n] of DUNE) {
    item('props', name, [0.5, 1], () => {
        const S = spriteSheet(W, H, name);
        const r = rng(hashSeed(name));
        const cols = [P.grassSilver, mix(P.grassGreen, P.grassSilver, 0.45), P.grassOchre, P.grassSilver, P.grassGreen, mix(P.grassSilver, P.grassOchre, 0.5)];
        const bx = W / 2, by = H - 2;
        const blades = [];
        for (let k = 0; k < n; k++) {
            const lean = (k / (n - 1) - 0.5) * 1.5 + 0.25 + (r() - 0.5) * 0.3;
            const len = H * (0.55 + r() * 0.42);
            const x0 = bx + (r() - 0.5) * W * 0.3;
            const tipx = x0 + Math.sin(lean) * len, tipy = by - Math.cos(lean) * len;
            const mid = [x0 + Math.sin(lean * 0.5) * len * 0.5, by - Math.cos(lean * 0.5) * len * 0.55];
            blades.push({ pts: smooth([[x0, by], mid, [tipx, tipy]], { closed: false, steps: 10 }), w: 4.6 + r() * 2.2, c: cols[k % cols.length] });
        }
        blades.sort(() => r() - 0.5);
        for (const b of blades) {
            mark(S, b.c, b.pts, b.w, { pressure: 0.95, grain: 0.45, profile: (t) => Math.pow(1 - t, 0.7) * Math.min(1, t * 8 + 0.4) });
            mark(S, mix(P.grassGreen, P.graphite, 0.3), shift(b.pts, 1.2, 0), 1.2, { pressure: 0.45, grain: 0.6, profile: (t) => (1 - t) * 0.9 });
        }
        return done(S);
    });
}

item('props', 'seaweed-1', [0.5, 1], () => {
    const W = 96, H = 30;
    const S = spriteSheet(W, H, 'seaweed-1');
    const r = rng(9);
    for (let k = 0; k < 6; k++) {
        const y = H - 5 - r() * 10, x0 = 6 + r() * 20, x1 = W - 6 - r() * 20;
        const pts = [];
        for (let x = x0; x <= x1; x += 4) pts.push([x, y + Math.sin(x * 0.12 + k) * 3.5 - (x - x0) * 0.04 * (k % 2 ? 1 : -1)]);
        const poly = around(pts, (t) => 3.2 * Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.02)) + 0.8);
        const m = body(S, poly);
        pen(S, k % 2 ? P.kelp : mix(P.kelp, P.wood, 0.45), m, { angle: 0.1, gap: 1.8, len: [6, 16], pressure: 1 });
        pen(S, P.kelpDark, rim(S, poly, m, 0, -2), { pressure: 0.9 });
        ink(S, poly, { color: P.kelpDark, width: 1.4, pressure: 0.85, passes: 1 });
    }
    const bl = [];
    for (let k = 0; k < 9; k++) bl.push([10 + r() * (W - 20), H - 8 - r() * 12, 0.9 + r() * 0.5]);
    S.dots(mix(P.kelp, P.sand, 0.4), bl, { rx: 2.6, ry: 2, grain: 0.4 });
    return done(S);
});

item('props', 'klo-hole', [0.5, 1], () => {
    const W = 48, H = 20;
    const S = spriteSheet(W, H, 'klo-hole');
    const mound = smooth([[2, H - 1], [8, 8], [18, 4], [30, 4], [40, 8], [46, H - 1]], { steps: 6 });
    const m = body(S, mound);
    pen(S, P.sand, m, { angle: -0.2, pressure: 1, len: [5, 14] });
    pen(S, P.sandShade, m, { angle: 0.6, pressure: 0.6, len: [4, 10], pmap: ramp(S, 0, 4, 0, H, 0.2, 1) });
    const hole = ellipse(24, 8, 10, 4, 24);
    const hm = S.mask(hole);
    pen(S, P.sandShadow, hm, { angle: 0.2, gap: 1.6, pressure: 1, grain: 0.3, len: [4, 12] });
    pen(S, P.graphite, S.mask(ellipse(24, 8.8, 7, 2.6, 20)), { angle: -0.3, gap: 1.6, pressure: 0.9, grain: 0.3, len: [4, 10] });
    ink(S, hole, { width: 1.6, pressure: 0.85 });
    ink(S, mound.slice(0, -1), { closed: false, width: 2, pressure: 0.8 });
    return done(S);
});

item('props', 'post-note', [0.5, 1], () => {
    const W = 64, H = 142;
    const S = spriteSheet(W, H, 'post-note');
    const post = [[20, 12], [44, 5], [44, H - 2], [20, H - 2]];
    const pm = body(S, post);
    paintWood(S, post, pm, { base: P.wood, dark: P.woodDark, angle: Math.PI / 2, grain: 4 });
    pen(S, P.woodDark, rim(S, post, pm, -6, 0), { angle: 1.4, gap: 2, pressure: 0.7 });
    ink(S, post, { width: 2.5 });
    // the note, pinned a little crooked
    const note = transform(rect(-13, -16, 26, 32), { x: 32, y: 50, rot: -0.08 });
    const nm = body(S, note);
    soft(S, P.paperCream, nm, { angle: -0.4, pressure: 0.8 });
    const sc = [];
    for (let k = 0; k < 4; k++) { const y = -8 + k * 6; const pts = []; for (let x = -9; x <= 8 - (k === 3 ? 7 : 0); x += 2) pts.push([x, y + Math.sin(x * 0.9 + k) * 0.8]); sc.push({ pts: transform(pts, { x: 32, y: 50, rot: -0.08 }), width: 1.1, alpha: 0.9 }); }
    lines(S, P.graphite, sc, { pressure: 0.75 });
    ink(S, note, { width: 1.8, pressure: 0.85 });
    const pin = S.mask(ellipse(31, 37, 3, 3, 12));
    pen(S, P.red, pin, { gap: 1.2, pressure: 1, grain: 0.3, len: [3, 6] });
    ink(S, ellipse(31, 37, 3, 3, 12), { width: 1.2, pressure: 0.9, passes: 1 });
    return done(S);
});

// ---------------------------------------------------------------------------
// Her foam: paper-white shapes outlined in dark blue over blue hatching
// ---------------------------------------------------------------------------
/** A splash tongue: a wavy, rounded flame of water around a curved spine. */
function tongue(base, ctrl, tip, w, r) {
    const ph = r() * 6, ph2 = r() * 6;
    const poly = around([base, ctrl, tip], (u) => {
        const k = (1 - 0.72 * Math.pow(u, 0.9)) * (1 + 0.14 * Math.sin(u * 11 + ph));
        const k2 = (1 - 0.72 * Math.pow(u, 0.9)) * (1 + 0.14 * Math.sin(u * 13 + ph2));
        return [w / 2 * k, w / 2 * k2];
    });
    return smooth(poly.filter((_, i) => i % 2 === 0), { steps: 3, tension: 0.5 });
}
function droplet(x, y, len, ang, fat = 0.55) {
    // a slightly pointed oval, long axis along the flight direction
    const pts = [];
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        const rr = 1 + 0.18 * Math.max(0, Math.cos(a));
        pts.push([Math.cos(a) * len / 2 * rr, Math.sin(a) * len / 2 * fat]);
    }
    return transform(pts, { x, y, rot: ang });
}
/** Paint water hatched in blues (clip), deeper toward `deep` side. */
function waterHatch(S, m, pdeep, { angle = -0.35, dark = 1 } = {}) {
    soft(S, P.skyBlue, m, { angle, gap: 2, len: [10, 30], width: 1.9, pressure: 0.9 });
    pen(S, P.seaBlue, m, { angle, gap: 2, len: [10, 34], width: 1.8, grain: 0.5, pmap: pdeep });
    pen(S, P.seaBlue, m, { angle: angle + 0.5, gap: 3, len: [8, 20], width: 1.6, grain: 0.5, pmap: fmap(pdeep, (v) => v * 0.5) });
    pen(S, P.foamLine, m, { angle, gap: 4, len: [8, 22], width: 1.5, grain: 0.55, pmap: fmap(pdeep, (v) => Math.max(0, v - 0.55) * dark) });
}

/**
 * A foam crest along a base curve (points ordered so the water lies to the
 * right-hand side of travel): a scalloped outer edge, a wavy inner edge, and
 * the white band between them. Returns { top, inner, cap }.
 */
function foamCrest(base, r, { scallop = 4.5, period = 16, capW = 11, taper = 0, ends = null } = {}) {
    const q = resample(base, 2);
    const L = q.length;
    const top = [], inner = [];
    let acc = 0;
    const ph = r() * 5, ph2 = r() * 5;
    for (let i = 0; i < L; i++) {
        const a = q[Math.max(0, i - 1)], b = q[Math.min(L - 1, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
        const nx = -ty, ny = tx; // points into the water
        if (i) acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
        const u = i / (L - 1);
        const end = ends ? ends(q[i], u) : taper ? smoothstep(0, taper, u) * smoothstep(0, taper, 1 - u) : 1;
        const per = period * (1 + 0.25 * Math.sin(acc * 0.031 + ph));
        const sc = Math.pow(Math.abs(Math.sin(Math.PI * acc / per)), 0.6) * scallop * end;
        top.push([q[i][0] - nx * sc, q[i][1] - ny * sc]);
        const cw = capW * (1 + 0.35 * Math.sin(acc * 0.045 + ph2) + 0.2 * Math.sin(acc * 0.14)) * end;
        inner.push([q[i][0] + nx * cw, q[i][1] + ny * cw]);
    }
    return { top, inner, cap: top.concat(inner.slice().reverse()), q };
}
/** Round-tipped splash finger leaving the crest. */
function finger(x, y, ang, len, w, bend, r) {
    const spine = [];
    for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        const a = ang + bend * t * t;
        const px = x + Math.cos(ang) * len * t * 0.5 + Math.cos(a) * len * t * 0.5;
        const py = y + Math.sin(ang) * len * t * 0.5 + Math.sin(a) * len * t * 0.5;
        spine.push([px, py]);
    }
    const ph = r() * 6;
    const side = around(spine, (u) => w / 2 * (0.75 + 0.35 * Math.sin(Math.PI * (0.2 + 0.7 * u))) * (1 + 0.12 * Math.sin(u * 9 + ph)) * (1 - 0.35 * u));
    // round the tip
    const n = side.length / 2;
    const l = side[n - 1], rr = side[n];
    const tip = spine[spine.length - 1], prev = spine[spine.length - 2];
    const ta = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
    const rad = Math.hypot(l[0] - rr[0], l[1] - rr[1]) / 2;
    const cap = [];
    for (let k = 1; k < 8; k++) { const a = ta - Math.PI / 2 + (k / 8) * Math.PI; cap.push([tip[0] + Math.cos(a) * rad * 1.05, tip[1] + Math.sin(a) * rad * 1.05]); }
    return side.slice(0, n).concat(cap.reverse()).concat(side.slice(n));
}

item('props', 'frozen-splash', [0.5, 1], () => {
    const W = 232, H = 192;
    const S = spriteSheet(W, H, 'frozen-splash');
    const r = rng(31);
    // a low wave running in from the right and bursting against the hooves on the left
    const base = smooth([[10, 150], [20, 128], [36, 112], [58, 104], [82, 104], [106, 110], [132, 118], [160, 124], [190, 128], [214, 131], [W + 10, 133]], { closed: false, steps: 8 });
    const crest = foamCrest(base, r, { scallop: 4, period: 13, capW: 10 });
    const bodyPoly = crest.top.concat([[W + 12, H + 8], [-4, H + 8]]);
    const bodyM = S.mask(bodyPoly);
    addSolid(S, bodyM);
    const capM = fmap(S.mask(crest.cap), (v, i) => v * bodyM[i]);
    // spray: foam thrown up and to the left in short curling tongues
    const plume = [];
    plume.push(...lobes([[46, 112], [36, 84], [36, 60], [48, 44], [60, 46]], 13, 5, r, { n: 10, j: 0.45 }));
    plume.push(...lobes([[66, 106], [74, 80], [90, 64], [108, 62], [116, 70]], 11, 4.5, r, { n: 9, j: 0.45 }));
    plume.push(...lobes([[30, 122], [20, 104], [16, 88]], 10, 4.5, r, { n: 6, j: 0.45 }));
    plume.push(...lobes([[54, 110], [58, 90], [62, 76]], 12, 8, r, { n: 5, j: 0.35 }));
    for (let k = 0; k < 16; k++) {
        const src = plume[Math.floor(r() * plume.length)];
        const p = src[Math.floor(r() * src.length)];
        const rr = 2.5 + r() * 3.5;
        plume.push(ellipse(p[0], p[1], rr, rr * 0.9, 14));
    }
    const plumeM = unionMasks(...plume.map((q) => S.mask(q)));
    // droplets flying off the spray
    const drops = [];
    for (const [x, y, l, a] of [[24, 30, 8, -2.2], [60, 22, 8, -1.7], [14, 52, 7, -2.5], [96, 38, 7, -1.2], [126, 52, 6, -0.8], [134, 76, 6, -0.6], [2, 70, 6, -2.8], [80, 30, 5, -1.5], [44, 14, 6, -1.9], [8, 26, 5, -2.3], [150, 90, 5, -0.4], [110, 22, 5, -1.3], [70, 8, 4.5, -1.8]]) drops.push(droplet(x, y, l, a, 0.52 + r() * 0.2));
    const dm = drops.map((d) => S.mask(d));
    // her little white loops all over the water
    const patches = [];
    for (let k = 0; k < 17; k++) {
        const x = 20 + r() * 200, y = 124 + r() * 58;
        if (x > 200 && y > 170) continue;
        patches.push(blob(x, y, 5 + r() * 9, 2.4 + r() * 3, r, { n: 9, j: 0.3, rot: -0.35 + r() * 0.3 }));
    }
    const pm = patches.map((q) => S.mask(q));
    const foamM = unionMasks(capM, plumeM);
    addSolid(S, plumeM);
    for (const m of [...dm, ...pm]) addSolid(S, m);
    const white = unionMasks(foamM, ...dm, ...pm);
    const wm = fmap(bodyM, (v, i) => v * (1 - white[i]));
    waterHatch(S, wm, pressureMap(W, H, (x, y) => 0.55 + 0.4 * smoothstep(110, 190, y) + 0.15 * smoothstep(40, 220, x)), { angle: -0.2 });
    S.burnish(wm, 1, 0.25);
    soft(S, P.skyBlue, foamM, { angle: -0.6, gap: 2.4, len: [5, 14], pmap: ramp(S, 20, 40, 90, 120, 0.05, 0.45) });
    for (let k = 0; k < patches.length; k++) soft(S, P.skyBlue, rim(S, patches[k], pm[k], 0, -2, 1), { angle: -0.4, gap: 2.4, len: [4, 10], pressure: 0.4 });
    const curls = [smooth([[32, 78], [38, 70], [46, 73]], { closed: false }), smooth([[78, 82], [84, 75], [92, 78]], { closed: false }), smooth([[46, 100], [52, 93], [60, 96]], { closed: false }), smooth([[18, 108], [23, 101], [30, 104]], { closed: false })];
    for (const c of curls) ink(S, c, { closed: false, color: P.foamLine, width: 1.5, pressure: 0.8, passes: 1, wobble: 0.3 });
    // the envelope: the water melts away at the bottom and at both ends
    const fade = pressureMap(W, H, (x, y) => {
        const bottom = 1 - smoothstep(H - 46, H - 2, y) * (1 - white[y * W + x] * 0.4);
        const right = 1 - smoothstep(W - 50, W - 2, x);
        const left = smoothstep(0, 26, x);
        return Math.min(1, bottom * right * left + white[y * W + x] * (y < H - 30 ? 1 : 0) * right * Math.max(left, 0.9));
    });
    for (const c of contours(foamM, W, H, { step: 2.5 })) {
        if (c.length < 4) continue;
        const pts = smooth(c, { closed: true, steps: 2 });
        const runs = [];
        let cur = [];
        for (const p of pts) { const f = fade[Math.min(W * H - 1, Math.floor(p[1]) * W + Math.floor(Math.min(W - 1, Math.max(0, p[0]))))]; if (p[1] > H - 3 || p[0] > W - 3 || f < 0.2) { if (cur.length > 2) runs.push(cur); cur = []; } else cur.push(p); }
        if (cur.length > 2) runs.push(cur);
        for (const run of runs) ink(S, run, { closed: false, color: P.foamLine, width: 1.9, pressure: 0.95, wobble: 0.5 });
    }
    for (const d of drops) ink(S, d, { color: P.foamLine, width: 1.5, pressure: 0.95, wobble: 0.3, passes: 1 });
    for (const q of patches) ink(S, q, { color: P.foamLine, width: 1.5, pressure: 0.9, wobble: 0.4 });
    return doneFade(S, fade);
});

item('props', 'foam-edge', [0.5, 1], () => {
    const W = 304, H = 58;
    const S = spriteSheet(W, H, 'foam-edge');
    const r = rng(29);
    const fadeX = pressureMap(W, H, (x) => smoothstep(0, 30, x) * (1 - smoothstep(W - 30, W, x)));
    // the frozen foam lies along a gently wavy line; glassy water below it
    const base = [];
    for (let x = -6; x <= W + 6; x += 6) base.push([x, 24 + Math.sin(x * 0.035) * 3 + Math.sin(x * 0.11 + 1) * 1.5]);
    const crest = foamCrest(base, r, { scallop: 4.5, period: 15, capW: 12, taper: 0.1 });
    const bodyPoly = crest.top.concat([[W + 6, H + 6], [-6, H + 6]]);
    const bm = S.mask(bodyPoly);
    addSolid(S, fmap(bm, (v, i) => v * fadeX[i]));
    const capM = fmap(S.mask(crest.cap), (v, i) => v * bm[i]);
    const holes = [];
    for (let k = 0; k < 9; k++) {
        const x = 24 + (k + r() * 0.6) * ((W - 48) / 9);
        const p = crest.q[Math.min(crest.q.length - 1, Math.max(0, Math.round((x + 6) / 2)))];
        holes.push(ellipse(x, p[1] + 6 + r() * 3, 2.5 + r() * 3, 1.6 + r() * 1.4, 12));
    }
    const patches = [];
    for (let k = 0; k < 6; k++) patches.push(blob(30 + r() * (W - 60), 44 + r() * 7, 7 + r() * 8, 2.6 + r() * 1.6, r, { n: 8, j: 0.25 }));
    const pm = patches.map((q) => S.mask(q));
    for (const m of pm) addSolid(S, m);
    const white = unionMasks(capM, ...pm);
    const wm = fmap(bm, (v, i) => v * (1 - white[i]) * fadeX[i]);
    soft(S, PX.glassPale, wm, { angle: 0, gap: 2, len: [20, 60], pressure: 0.9 });
    pen(S, P.skyBlue, wm, { angle: -0.02, gap: 2, len: [20, 70], grain: 0.45, pmap: pressureMap(W, H, (x, y) => (0.55 + 0.45 * smoothstep(30, H, y)) * fadeX[y * W + x]) });
    pen(S, P.seaBlue, wm, { angle: 0.01, gap: 3, len: [20, 60], grain: 0.5, pmap: pressureMap(W, H, (x, y) => 0.5 * smoothstep(34, H, y) * fadeX[y * W + x]) });
    soft(S, P.skyBlue, capM, { angle: -0.4, gap: 2.6, len: [5, 12], pressure: 0.3 });
    // her little foam loops: paper white, outlined in dark-blue pencil (no solid blue dots, plan §2.3)
    for (const h of holes) {
        ink(S, h, { color: P.foamLine, width: 1.2, pressure: 0.8, passes: 1, wobble: 0.2 });
    }
    const edgeFade = (x) => smoothstep(4, 40, x) * (1 - smoothstep(W - 40, W - 4, x));
    const seg = (pts, w, p) => {
        for (let i = 0; i < pts.length - 3;) {
            const n = 10 + Math.floor(r() * 16);
            const sgm = pts.slice(i, Math.min(pts.length, i + n));
            const k = edgeFade(sgm[Math.floor(sgm.length / 2)][0]);
            if (sgm.length > 2 && k > 0.05) ink(S, sgm, { closed: false, color: P.foamLine, width: w, pressure: p * k, wobble: 0.4, passes: 1 });
            i += n - 1;
        }
    };
    seg(crest.top, 2, 0.95);
    const innerParts = [];
    for (let i = 0; i < crest.inner.length - 4;) { const n = 8 + Math.floor(r() * 14); innerParts.push(crest.inner.slice(i, i + n)); i += n + 3 + Math.floor(r() * 6); }
    for (const pp of innerParts) seg(pp, 1.6, 0.8);
    for (const q of patches) ink(S, q, { color: P.foamLine, width: 1.6, pressure: 0.85 * edgeFade(bounds(q)[0] + 8), wobble: 0.4 });
    return done(S);
});

// ---------------------------------------------------------------------------
// The sandstone cliff with Vattenporten's arch (sealed / open)
// ---------------------------------------------------------------------------
function cliff(name, open) {
    const W = 704, H = 704;
    const S = spriteSheet(W, H, 'cliff');   // same seed for both: identical rock
    const r = rng(17);
    const poly = smooth([[2, H], [10, 604], [28, 540], [18, 474], [38, 420], [40, 344], [60, 300], [54, 240], [78, 190], [70, 132], [98, 96], [152, 70], [232, 58], [300, 62], [372, 48], [452, 56], [520, 74], [560, 98], [574, 142], [604, 180], [626, 236], [660, 262], [678, 302], [664, 362], [684, 424], [680, 502], [694, 584], [702, H]], { steps: 5, tension: 0.32 });
    const m = body(S, poly);
    // sandstone: a warm base, strata in horizontal bands, lit from the left
    soft(S, mix(PP.sandstone, P.paper, 0.25), m, { angle: -0.1, gap: 2, len: [45, 110], width: 3.2, pressure: .86 });
    const strata = [];
    let y = 70;
    while (y < H) { strata.push(y); y += 68 + r() * 52; }
    const layer = pressureMap(W, H, (x, yy) => {
        let k = 0;
        for (let i = 0; i < strata.length; i++) if (yy > strata[i] + Math.sin(x * 0.012 + i) * 6) k = i;
        return 0.5 + 0.45 * ((k * 37) % 5) / 4;
    });
    pen(S, PP.sandstone, m, { angle: -0.05, gap: 2.2, len: [35, 100], width: 3, grain: .25, pmap: layer });
    pen(S, PP.sandstone, m, { angle: 0.55, gap: 3, len: [14, 40], width: 1.8, grain: .3, pressure: .25 });
    // shade: right side and under the ledges
    pen(S, PP.sandstoneDark, m, { angle: 0.9, gap: 2.4, len: [12, 34], width: 1.8, grain: .3, pmap: ramp(S, 250, 0, 700, 0, 0, 0.8) });
    pen(S, PP.sandstoneDark, rim(S, poly, m, -14, -10, 4), { angle: 0.8, gap: 2.2, len: [10, 26], width: 1.7, pressure: 0.85 });
    lighten(S, rim(S, poly, m, 12, 14, 4), { amount: 0.35, grain: 0.3 });
    // blend the sandstone like her sand: soft, so the strata and cracks carry the drawing
    S.burnish(m, 3, .7);
    // strata lines and joints
    const sl = [];
    for (let i = 0; i < strata.length; i++) {
        const pts = [];
        for (let x = 0; x <= W; x += 6) pts.push([x, strata[i] + Math.sin(x * 0.012 + i) * 6 + Math.sin(x * 0.05 + i * 2) * 1.5]);
        let j = 0;
        while (j < pts.length - 1) { const n = 6 + Math.floor(r() * 18); if (r() < 0.75) sl.push({ pts: pts.slice(j, j + n + 1), width: 1.5 + r() * 0.8, alpha: 0.5 + r() * 0.4 }); j += n + Math.floor(r() * 5); }
        for (let q = 0; q < 2; q++) {
            const x = 60 + r() * (W - 120), y0 = strata[i] + Math.sin(x * 0.012 + i) * 6, y1 = (strata[i + 1] || H) + Math.sin(x * 0.012 + i + 1) * 6;
            sl.push({ pts: [[x, y0], [x + (r() - 0.5) * 8, (y0 + y1) / 2], [x + (r() - 0.5) * 6, y1]], width: 1.4, alpha: 0.7 });
        }
    }
    lines(S, mix(PP.sandstoneDark, P.graphite, 0.4), sl, { pressure: .62, clip: m });
    // ledges: shade under a few strata
    for (let i = 1; i < strata.length; i += 2) {
        const band = pressureMap(W, H, (x, yy) => { const d = yy - (strata[i] + Math.sin(x * 0.012 + i) * 6); return d > 0 && d < 16 ? (1 - d / 16) * 0.8 : 0; });
        pen(S, PP.sandstoneDark, m, { angle: 0.1, gap: 2, len: [10, 30], pmap: band });
    }
    // tufts of grass on the top
    for (const [gx, gy] of [[150, 62], [300, 50], [410, 42], [520, 78]]) {
        for (let k = 0; k < 7; k++) {
            const a = -Math.PI / 2 + (k - 3) * 0.25 + (r() - 0.5) * 0.2, l = 10 + r() * 12;
            mark(S, k % 2 ? P.grassGreen : P.grassSilver, [[gx + k * 2 - 6, gy + 4], [gx + k * 2 - 6 + Math.cos(a) * l, gy + 4 + Math.sin(a) * l]], 3.4, { pressure: 0.95, profile: (t) => 1 - t * 0.85 });
        }
    }
    // the arch: drawn in the base of the cliff
    const ax = 392, aw = 118, top = 432, spring = 560;
    const archPts = [[ax - aw, H + 2], [ax - aw + 2, spring + 40], [ax - aw + 4, spring]].concat(arc(ax + 2, spring, aw - 2, spring - top, Math.PI, TAU, 28).slice(1)).concat([[ax + aw - 1, spring + 40], [ax + aw, H + 2]]);
    const am = S.mask(archPts);
    if (!open) {
        // sealed: the opening is filled in with rock, cross-hatched and blocked
        pen(S, PP.sandstone, am, { angle: 0.8, gap: 2.2, len: [10, 30], width: 1.8, grain: .3, pressure: 0.7 });
        pen(S, PP.sandstoneDark, am, { angle: -0.75, gap: 2.6, len: [10, 28], width: 1.7, grain: .3, pressure: 0.5 });
        const bl = [];
        for (const yy of [610, 660]) bl.push({ pts: [[ax - aw + 6, yy], [ax + aw - 6, yy + 2]], width: 1.6, alpha: 0.8 });
        for (const [xx, y0, y1] of [[ax - 40, 560, 610], [ax + 50, 560, 610], [ax, 610, 660], [ax - 80, 612, 660], [ax + 90, 612, 660], [ax - 30, 662, H], [ax + 60, 662, H], [ax + 10, 470, 560]]) bl.push({ pts: [[xx, y0], [xx + 2, y1]], width: 1.5, alpha: 0.75 });
        bl.push({ pts: arc(ax + 2, spring, aw - 40, spring - top - 38, Math.PI * 1.05, Math.PI * 1.95, 16), width: 1.5, alpha: 0.75 });
        lines(S, mix(PP.sandstoneDark, P.graphite, 0.45), bl, { pressure: 0.8, clip: am });
        ink(S, archPts.slice(1, -1), { closed: false, width: 3, pressure: 0.95 });
    } else {
        // open: a dark cave with water inside
        lighten(S, am, { amount: 1, grain: 0 });
        const cave = pressureMap(W, H, (x, yy) => 0.55 + 0.5 * (1 - smoothstep(0, aw, Math.abs(x - ax))) * (1 - smoothstep(top, H, yy) * 0.4));
        soft(S, P.deepTeal, am, { angle: 0.3, gap: 2, len: [12, 34], width: 2, pmap: cave });
        soft(S, PP.cave, am, { angle: -0.4, gap: 2, len: [12, 34], width: 2, grain: 0.3, pmap: cave });
        soft(S, P.graphite, am, { angle: 0.9, gap: 2.4, len: [10, 28], width: 1.8, grain: 0.3, pmap: fmap(cave, (v) => v * 0.5) });
        S.burnish(am, 1, 0.4);
        // thickness of the rock just inside the arch
        const inner = S.mask(archPts.map(([x, yy]) => [ax + (x - ax) * 0.86, yy + (yy < H ? 16 : 0)]));
        const lip = fmap(am, (v, i) => v * (1 - inner[i]));
        lighten(S, lip, { amount: 0.8, grain: 0.1 });
        pen(S, PP.sandstone, lip, { angle: 1.2, gap: 2, len: [8, 20], pressure: 0.95 });
        pen(S, PP.sandstoneDark, lip, { angle: 1.2, gap: 2.2, len: [8, 20], pressure: 0.7 });
        // The cliff's foot is at -56 world units and the pool is at -60.
        // Keep its baked water at that same level; a higher painted line made
        // the entrance look like a second pool perched above the real surface.
        const wl = H - 4;
        const wm = fmap(inner, (v, i) => (Math.floor(i / W) > wl ? v : 0));
        lighten(S, wm, { amount: 0.65, grain: 0.2 });
        waterHatch(S, wm, pressureMap(W, H, (x, yy) => 0.55 + 0.5 * smoothstep(wl, H, yy)), { angle: 0, dark: 1.2 });
        const glint = S.coverage((c) => { for (const [x0, yy, l] of [[ax - 60, wl + 14, 50], [ax + 10, wl + 26, 70], [ax - 30, wl + 44, 40]]) { c.lineWidth = 2.5; c.globalAlpha = 0.9; c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + l, yy); c.stroke(); } });
        lighten(S, glint, { amount: 0.6, grain: 0.3, clip: wm });
        ink(S, [[ax - aw * 0.86, wl], [ax + aw * 0.86, wl]], { closed: false, color: P.foamLine, width: 2.2, pressure: 0.85 });
        ink(S, archPts.slice(1, -1), { closed: false, width: 3.2, pressure: 1 });
        ink(S, archPts.slice(1, -1).map(([x, yy]) => [ax + (x - ax) * 0.86, yy + 16]), { closed: false, width: 1.8, pressure: 0.7, passes: 1 });
    }
    ink(S, poly.filter(([, yy]) => yy < H - 1), { closed: false, width: 3.2, pressure: 1 });
    return done(S);
}
item('props', 'cliff-sealed', [0.5, 1], () => cliff('cliff-sealed', false));
item('props', 'cliff-open', [0.5, 1], () => cliff('cliff-open', true));

// ---------------------------------------------------------------------------
// Puzzle pieces on the beach (boot)
// ---------------------------------------------------------------------------
item('props', 'rail-stone', [0.5, 1], () => {
    const W = 76, H = 72;
    const S = spriteSheet(W, H, 'rail-stone');
    const poly = smooth([[38, 2], [58, 8], [71, 24], [73, 44], [64, 62], [44, 70], [22, 68], [8, 56], [3, 36], [10, 16], [22, 6]], { steps: 6 });
    const m = body(S, poly);
    soft(S, mix(P.rock, P.paper, 0.3), m, { angle: -0.6, gap: 2.2, len: [8, 22], pressure: 0.9 });
    pen(S, P.rock, m, { angle: 0.7, gap: 2.2, len: [6, 18], pmap: radial(S, 26, 22, 8, 64, 0.2, 1.05) });
    pen(S, P.rockDark, m, { angle: -0.5, gap: 2.3, len: [5, 14], pmap: radial(S, 26, 22, 30, 70, 0, 0.95) });
    lighten(S, S.mask(ellipse(26, 22, 9, 6, 16, -0.5), { feather: 3 }), { amount: 0.6, grain: 0.3 });
    const r = rng(3);
    const sp = [];
    for (let k = 0; k < 26; k++) sp.push([10 + r() * 56, 10 + r() * 54, 0.6 + r() * 0.7]);
    S.dots(P.rockDark, sp, { rx: 1.3, ry: 1, clip: m, grain: 0.5 });
    lines(S, P.graphite, [smooth([[44, 30], [50, 38], [48, 48]], { closed: false })], { width: 1.3, pressure: 0.6, clip: m });
    ink(S, poly, { width: 2.6 });
    return done(S);
});

item('props', 'rail-groove', [0.5, 0.5], () => {
    const W = 304, H = 30;
    const S = spriteSheet(W, H, 'rail-groove');
    // a channel pressed into the sand: dark under its upper lip, lit on its lower lip
    const groove = roundRect(4, 8, W - 8, 14, 7);
    const m = S.mask(groove, { feather: 0.6 });
    addSolid(S, fmap(m, (v) => v * 0.001));
    pen(S, P.sandShade, m, { angle: -0.05, gap: 1.8, len: [16, 40], pressure: 1, grain: 0.4 });
    pen(S, P.sandShadow, m, { angle: 0.02, gap: 1.8, len: [16, 40], grain: 0.4, pmap: ramp(S, 0, 8, 0, 22, 1, 0.1) });
    lighten(S, rim(S, groove, m, 0, -3, 1), { amount: 0.3 });
    // four notches: little cups along the channel
    for (let k = 0; k < 4; k++) {
        const x = 50 + k * ((W - 100) / 3);
        const cup = ellipse(x, 15, 6, 5, 16);
        const cm = S.mask(cup);
        pen(S, P.sandShadow, cm, { angle: 0.4, gap: 1.4, len: [3, 8], pressure: 1, grain: 0.3 });
        ink(S, cup, { color: mix(P.sandShadow, P.graphite, 0.5), width: 1.3, pressure: 0.85, passes: 1 });
    }
    ink(S, groove.filter(([, y]) => y < 15.5), { closed: false, color: mix(P.sandShadow, P.graphite, 0.5), width: 1.9, pressure: 0.9 });
    ink(S, groove.filter(([, y]) => y >= 15.5), { closed: false, color: P.sandShadow, width: 1.4, pressure: 0.6, passes: 1 });
    return done(S);
});

item('props', 'plank-solid', [0.5, 0.5], () => {
    const W = 222, H = 30;
    const S = spriteSheet(W, H, 'plank-solid');
    const plank = smooth([[3, 6], [110, 4], [219, 6], [220, 24], [110, 26], [3, 24]], { steps: 3, tension: 0.3 });
    const m = body(S, plank);
    paintWood(S, plank, m, { base: P.wood, dark: P.woodDark, angle: 0, grain: 6 });
    S.dots(P.graphite, [[10, 11], [10, 19], [212, 11], [212, 19]].map(([x, y]) => [x, y, 1]), { rx: 1.8, ry: 1.8, grain: 0.4 });
    ink(S, plank, { width: 2.4 });
    return done(S);
});

function gate(name, open) {
    const W = 196, H = 206;
    const S = spriteSheet(W, H, 'gate');
    const postL = [[8, 14], [30, 10], [30, H - 2], [8, H - 2]], postR = [[166, 10], [188, 14], [188, H - 2], [166, H - 2]];
    const caps = [ellipse(19, 13, 11, 4, 16), ellipse(177, 13, 11, 4, 16)];
    // the gate panel: two rails, five boards, a diagonal brace
    const panel = [];
    let panelPoly;
    if (!open) {
        panelPoly = [[32, 40], [164, 40], [164, 176], [32, 176]];
        for (let k = 0; k < 5; k++) { const x0 = 36 + k * 26; panel.push([[x0, 44], [x0 + 22, 44], [x0 + 22, 174], [x0, 174]]); }
    } else {
        // swung open toward us: seen nearly edge-on beside the left post
        panelPoly = [[32, 36], [58, 46], [58, 170], [32, 180]];
        for (let k = 0; k < 5; k++) { const a = 34 + k * 4.8, b = a + 4.2; panel.push([[a, 38 + k * 1.9], [b, 39.5 + k * 1.9], [b, 178 - k * 1.9], [a, 179 - k * 1.9]]); }
    }
    for (const [pp, k] of [[postL, 0], [postR, 1]]) {
        const m = body(S, pp);
        paintWood(S, pp, m, { base: P.woodDark, dark: mix(P.woodDark, P.graphite, 0.4), angle: Math.PI / 2, grain: 3 });
        ink(S, pp, { width: 2.6 });
        const cm = body(S, caps[k]);
        soft(S, mix(P.wood, P.paper, 0.3), cm, { pressure: 0.9 });
        ink(S, caps[k], { width: 1.8 });
    }
    for (const b of panel) {
        const m = body(S, b);
        paintWood(S, b, m, { base: P.wood, dark: P.woodDark, angle: Math.PI / 2, grain: 2 });
        ink(S, b, { width: 1.8, pressure: 0.85, passes: 1 });
    }
    // rails and brace
    const rails = open ? [[[32, 58], [58, 64], [58, 74], [32, 68]], [[32, 146], [58, 144], [58, 154], [32, 156]]]
        : [[[32, 56], [164, 56], [164, 70], [32, 70]], [[32, 146], [164, 146], [164, 160], [32, 160]], [[40, 150], [52, 150], [156, 66], [144, 66]]];
    for (const rl of rails) {
        const m = body(S, rl);
        paintWood(S, rl, m, { base: mix(P.wood, P.woodDark, 0.4), dark: P.woodDark, angle: 0, grain: 2 });
        ink(S, rl, { width: 2, pressure: 0.9, passes: 1 });
    }
    // the big bolt: an iron bar through two staples (open: drawn back, only the post's staple shows)
    const boltX = 150;
    const bar = [[boltX - 44, 100], [boltX + 30, 100], [boltX + 30, 110], [boltX - 44, 110]];
    const staple = [[166, 96], [180, 96], [180, 114], [166, 114]];
    for (const pp of open ? [staple] : [bar, staple]) {
        const m = body(S, pp);
        soft(S, PP.iron, m, { angle: 0.2, gap: 1.8, pressure: 0.9 });
        pen(S, P.graphite, rim(S, pp, m, 0, -3), { gap: 1.8, pressure: 0.7 });
        lighten(S, rim(S, pp, m, 0, 3), { amount: 0.5, grain: 0.2 });
        ink(S, pp, { width: 1.9, pressure: 0.95, passes: 1 });
    }
    const knob = open ? ellipse(56, 104, 3.5, 6, 14) : ellipse(boltX - 20, 96, 4.5, 7, 16);
    const km = body(S, knob);
    soft(S, PP.iron, km, { pressure: 0.9 });
    ink(S, knob, { width: 1.6, passes: 1 });
    if (open) {
        // the bolt, drawn back along the edge of the open gate
        const st2 = [[50, 98], [60, 101], [60, 111], [50, 108]];
        const m = body(S, st2);
        soft(S, PP.iron, m, { pressure: 0.9 });
        ink(S, st2, { width: 1.6, passes: 1 });
    }
    return done(S);
}
item('props', 'gate-closed', [0.5, 1], () => gate('gate-closed', false));
item('props', 'gate-open', [0.5, 1], () => gate('gate-open', true));

item('props', 'jetty-post', [0.5, 1], () => {
    const W = 50, H = 162;
    const S = spriteSheet(W, H, 'jetty-post');
    const post = smooth([[10, 10], [24, 5], [40, 9], [41, 80], [42, H - 2], [8, H - 2], [9, 80]], { steps: 3, tension: 0.3 });
    const m = body(S, post);
    paintWood(S, post, m, { base: P.wood, dark: P.woodDark, angle: Math.PI / 2, grain: 5 });
    pen(S, P.woodDark, rim(S, post, m, -8, 0), { angle: 1.4, gap: 2, pressure: 0.7 });
    // wet, darker foot with a little green weed
    pen(S, mix(P.woodDark, P.seaDeep, 0.25), m, { angle: 1.3, gap: 1.9, len: [8, 20], pmap: ramp(S, 0, H - 44, 0, H, 0, 0.9) });
    const r = rng(8);
    for (let k = 0; k < 6; k++) { const x = 11 + r() * 28, y = H - 20 - r() * 20; mark(S, P.kelp, [[x, y], [x + (r() - 0.5) * 6, y + 10 + r() * 8]], 2.6, { pressure: 0.9 }); }
    const top = ellipse(25, 9, 15, 4.5, 20);
    body(S, top);
    soft(S, mix(P.wood, P.sand, 0.4), S.mask(top), { pressure: 0.9 });
    for (const k of [0.6, 0.3]) ink(S, ellipse(25, 9, 15 * k, 4.5 * k, 16), { color: P.woodDark, width: 1, pressure: 0.6, passes: 1 });
    // a rope ring
    ink(S, ellipse(25, 44, 18, 5, 24), { color: PP.driftDark, width: 3, pressure: 0.9, passes: 2 });
    ink(S, post, { width: 2.5 });
    ink(S, top, { width: 1.8 });
    return done(S);
});

item('props', 'flagpole', [0.5, 1], () => {
    const W = 40, H = 262;
    const S = spriteSheet(W, H, 'flagpole');
    const pole = [[18, 12], [22, 12], [23, H - 16], [17, H - 16]];
    const pm = body(S, pole);
    soft(S, mix(P.paper, P.rock, 0.4), pm, { angle: 1.5, gap: 1.6, pressure: 0.8 });
    pen(S, P.rockDark, rim(S, pole, pm, -2, 0), { angle: 1.5, gap: 1.6, pressure: 0.6 });
    ink(S, pole, { width: 1.7 });
    const ball = ellipse(20, 8, 6, 6, 16);
    const bm = body(S, ball);
    soft(S, P.sunYellow, bm, { pressure: 1 });
    pen(S, PX.sunDeep, rim(S, ball, bm, -2, -2), { pressure: 0.8 });
    ink(S, ball, { width: 1.6 });
    // the halyard
    lines(S, P.graphiteSoft, [[[24, 14], [26, 120], [25, H - 30]]], { width: 1, pressure: 0.7 });
    const foot = [[6, H - 18], [34, H - 18], [36, H - 2], [4, H - 2]];
    const fm = body(S, foot);
    paintStone(S, foot, fm);
    ink(S, foot, { width: 2 });
    // a cleat
    const cleat = [[23, H - 44], [30, H - 46], [30, H - 40], [23, H - 38]];
    body(S, cleat);
    ink(S, cleat, { width: 1.4, passes: 1 });
    return done(S);
});

item('props', 'flag', [0, 0.5], () => {
    const W = 92, H = 50;
    const S = spriteSheet(W, H, 'flag');
    const flag = smooth([[2, 4], [30, 9], [58, 16], [88, 25], [58, 32], [30, 39], [2, 46]], { closed: true, steps: 5, tension: 0.4 });
    const m = body(S, flag);
    soft(S, P.red, m, { angle: -0.3, gap: 2, len: [6, 18], pressure: 0.95 });
    pen(S, mix(P.red, P.graphite, 0.3), m, { angle: 0.5, gap: 2.4, len: [5, 14], pmap: ramp(S, 0, 4, 0, 46, 0.2, 0.8) });
    // a white stripe along it, and the fold wave
    const stripe = S.mask(smooth([[2, 20], [40, 22], [80, 25], [40, 28], [2, 30]], { steps: 4 }));
    lighten(S, stripe, { amount: 0.9, grain: 0.2 });
    lines(S, mix(P.red, P.graphite, 0.4), [smooth([[30, 10], [34, 24], [30, 38]], { closed: false })], { width: 1.3, pressure: 0.6, clip: m });
    ink(S, flag, { width: 2 });
    lines(S, P.graphite, [[[1, 2], [1, 48]]], { width: 2, pressure: 0.8 });
    return done(S);
});

item('props', 'ratchet-wheel', [0.5, 0.5], () => {
    const W = 66, C = 33, R = 28, r0 = 22;
    const S = spriteSheet(W, W, 'ratchet-wheel');
    const n = 12, pts = [];
    for (let k = 0; k < n; k++) {
        const a0 = (k / n) * TAU, a1 = ((k + 0.82) / n) * TAU, a2 = ((k + 1) / n) * TAU;
        pts.push([C + Math.cos(a0) * r0, C + Math.sin(a0) * r0], [C + Math.cos(a1) * R, C + Math.sin(a1) * R], [C + Math.cos(a2 - 0.001) * R * 0.98, C + Math.sin(a2 - 0.001) * R * 0.98]);
    }
    const m = body(S, pts);
    soft(S, mix(P.wood, P.paper, 0.2), m, { angle: 0.4, pressure: 0.95 });
    pen(S, P.wood, m, { angle: -0.6, gap: 2.2, len: [5, 14], pmap: radial(S, C - 6, C - 6, 6, 34, 0.2, 1) });
    pen(S, P.woodDark, edgeBand(m, W, W, 5), { angle: 1, gap: 2, pressure: 0.6 });
    // spokes and hub
    const sp = [];
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.3; sp.push({ pts: [[C + Math.cos(a) * 7, C + Math.sin(a) * 7], [C + Math.cos(a) * 18, C + Math.sin(a) * 18]], width: 2, alpha: 0.9 }); }
    lines(S, P.woodDark, sp, { pressure: 0.85 });
    ink(S, ellipse(C, C, 18.5, 18.5, 32), { color: P.woodDark, width: 1.5, pressure: 0.8, passes: 1 });
    const hub = ellipse(C, C, 6.5, 6.5, 18);
    const hm = S.mask(hub);
    soft(S, PP.iron, hm, { pressure: 0.95 });
    ink(S, hub, { width: 1.6, passes: 1 });
    S.dots(P.graphite, [[C, C, 1]], { rx: 2, ry: 2, grain: 0.3 });
    ink(S, pts, { width: 2.2, wobble: 0.4 });
    return done(S);
});

function hoof(S, cx, cy, graphite) {
    // an unshod hoof seen from above, toe up: the rim of the hoof wall, the V of the frog, two heel bulbs
    const outer = smooth([[cx, cy - 17], [cx + 11, cy - 14], [cx + 16, cy - 4], [cx + 16, cy + 8], [cx + 12, cy + 16], [cx + 6, cy + 17], [cx + 2, cy + 12], [cx - 2, cy + 12], [cx - 6, cy + 17], [cx - 12, cy + 16], [cx - 16, cy + 8], [cx - 16, cy - 4], [cx - 11, cy - 14]], { steps: 5, tension: 0.45 });
    const sole = smooth([[cx, cy - 11], [cx + 8, cy - 8], [cx + 11, cy], [cx + 10, cy + 9], [cx + 4, cy + 8], [cx, cy + 2], [cx - 4, cy + 8], [cx - 10, cy + 9], [cx - 11, cy], [cx - 8, cy - 8]], { steps: 4, tension: 0.45 });
    const frog = [[cx, cy - 3], [cx + 5, cy + 11], [cx, cy + 8], [cx - 5, cy + 11]];
    const m = S.mask(outer, { feather: 0.6 });
    const sm = S.mask(sole);
    const fm = S.mask(frog);
    const wall = fmap(m, (v, i) => v * (1 - sm[i]));
    if (!graphite) {
        // pressed into the sand: the rim is deepest, the sole a little less
        addSolid(S, fmap(m, (v) => v * 0.001));
        pen(S, P.sandShade, wall, { angle: -0.5, gap: 1.6, len: [4, 10], pressure: 1, grain: 0.35 });
        pen(S, P.sandShadow, wall, { angle: 0.7, gap: 2.2, len: [4, 10], pmap: ramp(S, cx, cy - 18, cx, cy + 18, 0.75, 0.15) });
        pen(S, P.sandShade, fmap(sm, (v, i) => v * (1 - fm[i])), { angle: 0.6, gap: 2, len: [4, 10], pressure: 0.6, grain: 0.4 });
        pen(S, P.sand, fm, { gap: 1.8, pressure: 0.5 });
        ink(S, outer.slice(0, Math.floor(outer.length * 0.55)), { closed: false, color: P.sandShadow, width: 1.4, pressure: 0.7, passes: 1 });
    } else {
        pen(S, P.graphiteSoft, wall, { angle: -0.6, gap: 1.8, len: [4, 10], pressure: 0.95, grain: 0.4 });
        pen(S, P.graphiteSoft, fmap(sm, (v, i) => v * (1 - fm[i])), { angle: 0.7, gap: 2.4, len: [4, 10], pressure: 0.5, grain: 0.5 });
        ink(S, outer, { color: P.graphite, width: 2, pressure: 1, passes: 1 });
        ink(S, sole, { color: P.graphite, width: 1.4, pressure: 0.75, passes: 1 });
        ink(S, frog, { color: P.graphite, width: 1.4, pressure: 0.8, passes: 1 });
    }
}
item('props', 'hoofprint', [0.5, 0.5], () => { const S = spriteSheet(42, 42, 'hoofprint'); hoof(S, 21, 21, false); return done(S); });
item('props', 'hoofprint-graphite', [0.5, 0.5], () => { const S = spriteSheet(42, 42, 'hoofprint-graphite'); hoof(S, 21, 21, true); return done(S); });

// Her label, traced from the drawing (coordinates in a 880×400 tracing space).
const LABEL = {
    S: [[100, 180], [80, 184], [58, 198], [48, 222], [62, 246], [88, 268], [100, 294], [94, 320], [74, 338], [52, 340], [40, 326]],
    K1: [[120, 168], [126, 240], [132, 318]],
    K2: [[188, 190], [160, 232], [136, 266]],
    K3: [[140, 266], [168, 288], [198, 302]],
    Oo: 'o',
    Obar: [[204, 172], [262, 161]],
    L1: [[290, 128], [294, 200], [298, 264]],
    L2: [[298, 264], [314, 262], [330, 257]],
    D1: [[318, 140], [320, 196], [322, 248]],
    D2: [[318, 140], [350, 134], [376, 156], [386, 194], [372, 228], [344, 246], [322, 248]],
    h1: [[450, 82], [456, 160], [462, 238]],
    h2: [[460, 188], [470, 164], [490, 156], [504, 170], [508, 200], [510, 232]],
    a1: [[580, 164], [564, 150], [544, 158], [534, 182], [542, 204], [562, 212], [578, 196]],
    a2: [[582, 150], [583, 184], [588, 214]],
    abar: [[546, 96], [608, 88]],
    s1: [[656, 112], [634, 104], [614, 114], [616, 134], [640, 148], [656, 166], [646, 186], [620, 192], [602, 180]],
    t1: [[734, 30], [738, 90], [746, 136], [768, 146], [792, 134]],
    t2: [[690, 78], [792, 62]],
    U: [[48, 380], [80, 360], [120, 338], [160, 318], [200, 306], [250, 297], [300, 290], [350, 281], [400, 273], [450, 268], [500, 259], [560, 245], [620, 228], [680, 212], [740, 198], [790, 189], [836, 187]]
};
item('props', 'label-skold-hast', [0.5, 0.5], () => {
    const k = 0.52, pad = 10;
    const x0 = 40, y0 = 24;
    const W = Math.ceil((840 - x0) * k) + pad * 2, H = Math.ceil((392 - y0) * k) + pad * 2;
    const S = spriteSheet(W, H, 'label-skold-hast');
    const tr = (pts) => pts.map(([x, y]) => [pad + (x - x0) * k, pad + (y - y0) * k]);
    const strokeW = 6.8;
    const stroke = (pts, w = strokeW, press = 1) => {
        const q = smooth(tr(pts), { closed: false, steps: 8, tension: 0.5 });
        const ph = S.rand() * 6;
        mark(S, P.graphite, q, w, { pressure: press, grain: 0.35, rough: 0.12, profile: (t) => (0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.9))) * (0.9 + 0.1 * Math.sin(t * 7 + ph)) });
    };
    for (const [key, pts] of Object.entries(LABEL)) {
        if (key === 'Oo') {
            const o = ellipse(238, 239, 23, 31, 28, 0.12).concat([ellipse(238, 239, 23, 31, 28, 0.12)[0]]);
            stroke(o);
            continue;
        }
        if (key === 'U') { stroke(pts, 5.6, 0.95); continue; }
        stroke(pts, key.endsWith('bar') ? 5.4 : strokeW);
    }
    return done(S);
});

// ---------------------------------------------------------------------------
// Färgpennor: a pencil to pick up, and props in grey and in colour
// ---------------------------------------------------------------------------
item('props', 'pencil-pickup', [0.5, 0.5], () => {
    const W = 74, H = 46;
    const S = spriteSheet(W, H, 'pencil-pickup');
    const rot = -0.42, cx = 36, cy = 26;
    const T = (pts) => transform(pts, { x: cx, y: cy, rot });
    const bodyP = T([[-26, -4], [14, -4], [14, 4], [-26, 4]]);
    const face = T([[-26, -4], [14, -4], [14, -1.3], [-26, -1.3]]);
    const cone = T([[14, -4], [25, -1], [25, 1], [14, 4]]);
    const tip = T([[22, -1.1], [29, 0], [22, 1.1]]);
    const end = T([[-29, -4], [-26, -4], [-26, 4], [-29, 4]]);
    const bm = body(S, bodyP);
    soft(S, P.red, bm, { angle: rot, gap: 1.6, len: [6, 16], pressure: 1 });
    lighten(S, S.mask(face), { amount: 0.35, grain: 0.2 });
    pen(S, mix(P.red, P.graphite, 0.35), S.mask(T([[-26, 1.5], [14, 1.5], [14, 4], [-26, 4]])), { angle: rot, gap: 1.6, pressure: 0.7 });
    const cm = body(S, cone);
    soft(S, P.sand, cm, { angle: rot + 1, gap: 1.6, pressure: 0.9 });
    const tm = body(S, tip);
    soft(S, mix(P.red, P.graphite, 0.2), tm, { gap: 1.2, pressure: 1 });
    const em = body(S, end);
    soft(S, P.paperCream, em, { pressure: 0.6 });
    ink(S, bodyP, { width: 1.6, passes: 1 });
    ink(S, cone, { width: 1.4, passes: 1 });
    ink(S, end, { width: 1.3, passes: 1 });
    // a small glint by the tip
    const g = [cx + 24, cy - 17];
    const star = [];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU - Math.PI / 2, rr = k % 2 ? 2.2 : 8; star.push([g[0] + Math.cos(a) * rr, g[1] + Math.sin(a) * rr]); }
    const sm = body(S, star);
    soft(S, P.sunGlow, sm, { pressure: 0.9 });
    ink(S, star, { color: PX.sunLine, width: 1.3, passes: 1, wobble: 0.2 });
    return done(S);
});

/** Colour or its grey twin (same value, graphite hatching only). */
function tint(colored) {
    return (c) => {
        if (colored) return c;
        const v = lum(c);
        return mix(P.graphiteSoft, P.paper, clamp01(0.15 + v * 0.9));
    };
}
function twin(name, W, H, anchor, draw) {
    for (const colored of [false, true]) {
        item('props', `${name}-${colored ? 'color' : 'grey'}`, anchor, () => {
            const S = spriteSheet(W, H, name); // same seed: identical strokes in both states
            draw(S, tint(colored), colored);
            return done(S);
        });
    }
}

twin('kite', 96, 150, [0.5, 1], (S, c) => {
    // a diamond kite leaning on its tail, the tail with bows coiling on the sand
    const kite = [[52, 4], [86, 40], [50, 98], [18, 42]];
    const km = body(S, kite);
    const halves = [[[52, 4], [86, 40], [51, 42]], [[52, 4], [51, 42], [18, 42]], [[51, 42], [86, 40], [50, 98]], [[18, 42], [51, 42], [50, 98]]];
    const cols = [P.red, P.sunYellow, P.seaBlue, P.red];
    halves.forEach((h, k) => { const m = S.mask(h); soft(S, c(cols[k]), m, { angle: 0.5 + k, gap: 2.1, len: [6, 18], pressure: 0.95 }); });
    lines(S, c(P.woodDark), [[[52, 5], [50, 97]], [[19, 42], [85, 40]]], { width: 2, pressure: 0.9 });
    ink(S, kite, { width: 2.3 });
    const tail = smooth([[50, 98], [44, 112], [52, 124], [66, 132], [70, 142], [56, 146], [36, 144], [22, 138]], { closed: false, steps: 8 });
    lines(S, P.graphite, [tail], { width: 1.5, pressure: 0.85 });
    const bows = [[46, 114], [62, 131], [60, 145], [34, 144]];
    bows.forEach(([x, y], k) => {
        const b = [[x - 7, y - 4], [x, y], [x - 7, y + 4], [x + 7, y - 4], [x, y], [x + 7, y + 4]];
        const l = S.mask([b[0], b[1], b[2]]), r2 = S.mask([b[3], b[4], b[5]]);
        addSolid(S, l); addSolid(S, r2);
        soft(S, c([P.sunYellow, P.red, P.seaBlue, P.sunYellow][k]), unionMasks(l, r2), { pressure: 0.95, gap: 1.6 });
        ink(S, [b[0], b[1], b[2]], { width: 1.2, passes: 1 });
        ink(S, [b[3], b[4], b[5]], { width: 1.2, passes: 1 });
    });
});

twin('boat', 206, 92, [0.5, 1], (S, c) => {
    // a small rowing boat pulled up on the sand
    const hull = smooth([[4, 34], [40, 40], [100, 42], [160, 40], [202, 26], [196, 50], [178, 72], [140, 86], [70, 88], [30, 78], [12, 58]], { steps: 6, tension: 0.4 });
    const hm = body(S, hull);
    soft(S, c(PP.boatBlue), hm, { angle: -0.1, gap: 2, len: [12, 36], pressure: 0.95 });
    pen(S, c(mix(PP.boatBlue, P.graphite, 0.3)), hm, { angle: 0.4, gap: 2.3, len: [8, 22], pmap: ramp(S, 0, 40, 0, 88, 0.1, 0.9) });
    // a white stripe and the planks
    const stripe = S.mask(smooth([[8, 44], [100, 50], [196, 36], [192, 44], [100, 58], [12, 52]], { steps: 5 }));
    lighten(S, stripe, { amount: 0.95, grain: 0.15 });
    lines(S, c(mix(PP.boatBlue, P.graphite, 0.5)), [smooth([[14, 62], [80, 72], [170, 62]], { closed: false }), smooth([[24, 74], [90, 82], [156, 74]], { closed: false })], { width: 1.3, pressure: 0.7, clip: hm });
    // the inside and gunwale
    const inside = smooth([[8, 34], [60, 30], [120, 30], [180, 26], [200, 24], [160, 40], [100, 42], [40, 40]], { steps: 5 });
    const im = body(S, inside);
    soft(S, c(P.wood), im, { angle: 0, gap: 1.8, pressure: 0.95 });
    pen(S, c(P.woodDark), im, { angle: 0.2, gap: 2.2, pressure: 0.5 });
    ink(S, inside, { width: 1.8, passes: 1 });
    // an oar across
    const oar = [[40, 26], [160, 12], [161, 16], [41, 30]];
    const om = body(S, oar);
    soft(S, c(mix(P.wood, P.sand, 0.4)), om, { pressure: 0.9 });
    const blade = smooth([[158, 10], [190, 4], [196, 10], [190, 16], [160, 18]], { steps: 4 });
    const blm = body(S, blade);
    soft(S, c(P.red), blm, { pressure: 0.9 });
    ink(S, oar, { width: 1.4, passes: 1 });
    ink(S, blade, { width: 1.6, passes: 1 });
    ink(S, hull, { width: 2.6 });
});

twin('hut', 170, 196, [0.5, 1], (S, c) => {
    // a Swedish beach hut: falu-red boards, white trim, a gable roof, a door and a round window
    const walls = [[18, 74], [152, 74], [152, 192], [18, 192]];
    const wm = body(S, walls);
    soft(S, c(PP.hut), wm, { angle: Math.PI / 2, gap: 2, len: [16, 40], pressure: 0.95 });
    const boards = [];
    for (let x = 30; x < 152; x += 12) boards.push({ pts: [[x, 76], [x + 0.5, 190]], width: 1.3, alpha: 0.8 });
    lines(S, c(mix(PP.hut, P.graphite, 0.45)), boards, { pressure: 0.7, clip: wm });
    pen(S, c(mix(PP.hut, P.graphite, 0.3)), wm, { angle: 1.4, gap: 2.4, pmap: ramp(S, 0, 74, 0, 110, 0.9, 0) });
    const roof = [[4, 80], [85, 8], [166, 80], [156, 86], [85, 24], [14, 86]];
    const rm = body(S, roof);
    soft(S, c(P.graphiteSoft), rm, { angle: -0.7, gap: 2, pressure: 0.8 });
    const gable = [[26, 74], [85, 22], [144, 74]];
    const gm = body(S, gable);
    soft(S, c(PP.hut), gm, { angle: Math.PI / 2, gap: 2.2, pressure: 0.8 });
    const door = [[62, 110], [100, 110], [100, 192], [62, 192]];
    const dm = body(S, door);
    soft(S, c(P.paper), dm, { pressure: 0.3 });
    pen(S, c(PP.boatBlue), dm, { angle: 1.4, gap: 2.2, pressure: 0.85 });
    ink(S, door, { width: 2 });
    S.dots(P.graphite, [[92, 152, 1]], { rx: 2.3, ry: 2.3, grain: 0.3 });
    const win = ellipse(85, 56, 11, 11, 20);
    const winm = body(S, win);
    lighten(S, winm, { amount: 1, grain: 0 });
    soft(S, c(P.skyBlue), winm, { pressure: 0.7 });
    lines(S, P.graphite, [[[74, 56], [96, 56]], [[85, 45], [85, 67]]], { width: 1.4, pressure: 0.8 });
    ink(S, win, { width: 2 });
    // white trim
    for (const tpts of [[[16, 74], [16, 192]], [[154, 74], [154, 192]]]) lines(S, P.graphiteSoft, [tpts], { width: 1.2, pressure: 0.5 });
    ink(S, walls, { width: 2.4 });
    ink(S, roof, { width: 2.4 });
});

twin('flowers', 76, 70, [0.5, 1], (S, c) => {
    // a clump of beach flowers: sea pinks, yellow and a blue one
    const r = rng(41);
    const heads = [[20, 22, P.red], [38, 12, PP.pinkDeep], [56, 20, P.sunYellow], [30, 34, PP.powderDeep], [50, 36, PP.pink], [64, 34, PP.pinkDeep], [12, 38, P.sunYellow]];
    const stems = heads.map(([x, y]) => smooth([[38 + (x - 38) * 0.3, 68], [38 + (x - 38) * 0.6, (68 + y) / 2 + 4], [x, y + 3]], { closed: false }));
    for (const st of stems) mark(S, c(P.grassGreen), st, 2.4, { pressure: 0.95, profile: () => 1 });
    for (let k = 0; k < 7; k++) { const x = 20 + r() * 36; mark(S, c(PP.leaf), [[x, 68], [x + (r() - 0.5) * 30, 44 + r() * 12]], 4, { pressure: 0.9, profile: (t) => Math.sin(Math.PI * Math.min(1, 0.1 + t)) }); }
    heads.forEach(([x, y, col]) => {
        const petals = [];
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + r(); petals.push(ellipse(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 4.4, 3.2, 12, a)); }
        const pm = unionMasks(...petals.map((q) => S.mask(q)));
        addSolid(S, pm);
        soft(S, c(col), pm, { gap: 1.6, len: [3, 8], pressure: 1 });
        for (const q of petals) ink(S, q, { width: 1.1, pressure: 0.8, passes: 1, wobble: 0.2 });
        S.dots(c(PX.sunDeep), [[x, y, 1]], { rx: 2, ry: 2, grain: 0.3 });
    });
});

twin('bucket', 70, 66, [0.5, 1], (S, c) => {
    // a sand pail with a handle, and a spade stuck in the sand beside it
    const spade = [[52, 4], [56, 4], [57, 40], [53, 40]];
    const blade = smooth([[48, 40], [62, 40], [63, 56], [55, 64], [47, 56]], { steps: 4 });
    const sm = body(S, spade);
    soft(S, c(P.wood), sm, { pressure: 0.9 });
    const blm = body(S, blade);
    soft(S, c(P.red), blm, { pressure: 0.95, gap: 1.6 });
    ink(S, spade, { width: 1.4, passes: 1 });
    ink(S, blade, { width: 1.7 });
    const pail = [[6, 22], [46, 22], [41, 64], [11, 64]];
    const pm = body(S, pail);
    soft(S, c(P.sunYellow), pm, { angle: 1.3, gap: 1.8, pressure: 1 });
    pen(S, c(PX.sunDeep), pm, { angle: 1.3, gap: 2, pmap: ramp(S, 6, 0, 46, 0, 0.1, 0.9) });
    const rimP = ellipse(26, 22, 20, 5, 24);
    const rmk = body(S, rimP);
    soft(S, c(PX.sunDeep), rmk, { pressure: 0.8 });
    pen(S, c(P.sandShade), S.mask(ellipse(26, 23, 16, 3.4, 20)), { pressure: 0.9 });
    lines(S, c(P.red), [[[8, 34], [44, 34]]], { width: 3, pressure: 0.8, clip: pm });
    ink(S, pail, { width: 2 });
    ink(S, rimP, { width: 1.7 });
    lines(S, P.graphite, [smooth([[8, 24], [10, 6], [26, 2], [42, 6], [44, 24]], { closed: false })], { width: 1.6, pressure: 0.9 });
});

twin('windmill', 150, 204, [0.5, 1], (S, c) => {
    // a small wooden post mill with four lattice sails
    const legs = [[[62, 150], [44, 202]], [[88, 150], [106, 202]], [[75, 150], [75, 202]]];
    for (const l of legs) { mark(S, c(P.woodDark), l, 5, { pressure: 0.95, profile: () => 1 }); ink(S, l, { closed: false, width: 1.3, pressure: 0.7, passes: 1 }); }
    const house = [[52, 88], [98, 88], [100, 154], [50, 154]];
    const hm = body(S, house);
    soft(S, c(PP.hut), hm, { angle: Math.PI / 2, gap: 2, pressure: 0.95 });
    const boards = [];
    for (let y = 98; y < 154; y += 9) boards.push({ pts: [[52, y], [99, y]], width: 1.2, alpha: 0.8 });
    lines(S, c(mix(PP.hut, P.graphite, 0.45)), boards, { pressure: 0.7, clip: hm });
    const roof = smooth([[46, 90], [52, 72], [75, 62], [98, 72], [104, 90]], { steps: 4 });
    const rm = body(S, roof);
    soft(S, c(P.graphiteSoft), rm, { angle: 0.3, gap: 2, pressure: 0.85 });
    const door = [[68, 128], [82, 128], [82, 154], [68, 154]];
    body(S, door);
    soft(S, c(P.wood), S.mask(door), { pressure: 0.8 });
    ink(S, door, { width: 1.4, passes: 1 });
    ink(S, house, { width: 2.2 });
    ink(S, roof, { width: 2.2 });
    // sails, hub at (75, 84)
    const hub = [75, 82];
    for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + 0.5;
        const T = (pts) => transform(pts, { x: hub[0], y: hub[1], rot: a });
        const sail = T([[8, -3], [70, -3], [70, 11], [14, 11]]);
        const sm = body(S, sail);
        soft(S, c(P.paperCream), sm, { pressure: 0.4 });
        const lat = [];
        for (let x = 20; x <= 70; x += 10) lat.push(T([[x, -3], [x, 11]]));
        lat.push(T([[8, 4], [70, 4]]));
        lines(S, c(P.woodDark), lat, { width: 1.2, pressure: 0.8 });
        mark(S, c(P.woodDark), T([[0, -2], [72, -2]]), 3.2, { pressure: 0.95, profile: () => 1 });
        ink(S, sail, { width: 1.5, passes: 1 });
    }
    const hb = ellipse(hub[0], hub[1], 5, 5, 14);
    body(S, hb);
    soft(S, c(PP.iron), S.mask(hb), { pressure: 0.95 });
    ink(S, hb, { width: 1.4, passes: 1 });
});

// Empty beach treasures, small enough to read beside the seabed's kelp. These
// twins colour their own drawings, never the sköldhäst or a living animal.
twin('sea-shell', 108, 86, [0.5, 1], (S, c) => {
    const shell = smooth([[46, 77], [33, 69], [16, 56], [7, 43], [8, 32], [17, 29],
        [18, 18], [29, 18], [36, 8], [47, 12], [58, 5], [67, 14], [79, 12],
        [85, 24], [96, 25], [96, 38], [103, 47], [90, 62], [67, 77]], { steps: 5, tension: 0.35 });
    const m = body(S, shell);
    soft(S, c(PP.peach), m, { angle: -0.8, gap: 1.9, len: [8, 24], pressure: 0.65 });
    pen(S, c(PP.pinkDeep), m, { angle: 0.9, gap: 2.6, len: [6, 18], pressure: 0.75,
        pmap: ramp(S, 54, 6, 54, 76, 0.1, 0.8) });
    // Each rib fans out from the hinge; paper highlights separate the pencil
    // bands, so the grey drawing is already a complete little shell.
    const tips = [[11, 37], [23, 22], [37, 12], [58, 9], [77, 17], [91, 29], [98, 45]];
    const ribs = tips.map(([x, y], k) => smooth([[53 + k * 0.8, 73],
        [48 + (x - 48) * 0.55, 49], [x, y]], { closed: false, steps: 8 }));
    for (let k = 0; k < ribs.length; k++) {
        lines(S, c(k % 2 ? PP.peachDeep : PP.pinkDeep), [ribs[k]], { width: 3.0, pressure: 0.75, clip: m });
        lines(S, c(P.paper), [ribs[k].map(([x, y]) => [x + 2.2, y])], { width: 1.8, pressure: 0.9, clip: m });
    }
    ink(S, shell, { width: 1.9, pressure: 0.85, wobble: 0.35 });
    const hinge = smooth([[43, 74], [54, 68], [67, 74], [64, 82], [46, 81]], { steps: 4 });
    const hm = body(S, hinge);
    soft(S, c(PP.lemon), hm, { angle: 0.3, gap: 1.6, len: [4, 9], pressure: 0.9 });
    ink(S, hinge, { width: 1.5, passes: 1, wobble: 0.3 });
});

twin('pebbles', 98, 96, [0.5, 1], (S, c) => {
    const r = rng(193);
    // A slightly lopsided cairn: rounded stones resting on each other, with
    // differently angled pencil strokes and a pale mineral vein on each one.
    const stones = [
        { x: 48, y: 79, rx: 42, ry: 12, rot: -0.02, col: PP.powder, shade: PP.powderDeep },
        { x: 51, y: 59, rx: 30, ry: 12, rot: 0.08, col: PP.peach, shade: PP.peachDeep },
        { x: 43, y: 39, rx: 23, ry: 11, rot: -0.08, col: PP.mint, shade: PP.mintDeep },
        { x: 48, y: 20, rx: 16, ry: 10, rot: 0.12, col: PP.lilac, shade: PP.lilacDeep }
    ];
    for (const [i, stone] of stones.entries()) {
        const { x, y, rx, ry, rot, col, shade } = stone;
        const shape = blob(x, y, rx, ry, r, { n: 10, j: 0.045, rot });
        const m = body(S, shape);
        soft(S, c(col), m, { angle: -0.3 + i * 0.5, gap: 1.8, len: [7, 20], pressure: 0.95 });
        pen(S, c(shade), m, { angle: 0.5, gap: 2.2, len: [5, 16], pressure: 0.8,
            pmap: ramp(S, x, y - ry, x, y + ry, 0, 1) });
        const vein = smooth([[x - rx * 0.68, y + 3], [x - rx * 0.2, y - 1],
            [x + rx * 0.2, y - 3], [x + rx * 0.66, y - 2]], { closed: false, steps: 6 });
        lines(S, c(P.paper), [vein], { width: 2.0, pressure: 0.9, grain: 0.4, clip: m });
        ink(S, shape, { width: 1.8, pressure: 0.8, wobble: 0.3 });
    }
});

// ---------------------------------------------------------------------------
// Particles (boot, anchor centre)
// ---------------------------------------------------------------------------
item('props', 'p-drop', [0.5, 0.5], () => {
    const S = spriteSheet(18, 18, 'p-drop');
    const d = droplet(9, 9, 13, -Math.PI / 2, 0.62);
    const m = body(S, d);
    soft(S, P.skyBlue, rim(S, d, m, 2, -1, 1), { gap: 1.4, len: [3, 6], pressure: 0.6 });
    ink(S, d, { color: P.foamLine, width: 1.6, passes: 1, wobble: 0.2 });
    return done(S);
});
item('props', 'p-foam', [0.5, 0.5], () => {
    const S = spriteSheet(26, 20, 'p-foam');
    const r = rng(4);
    const f = blob(13, 10, 10, 6.5, r, { n: 9, j: 0.25 });
    const m = body(S, f);
    soft(S, P.skyBlue, rim(S, f, m, 0, -2, 1), { gap: 1.5, len: [3, 7], pressure: 0.55 });
    ink(S, f, { color: P.foamLine, width: 1.5, passes: 1, wobble: 0.3 });
    return done(S);
});
item('props', 'p-sand', [0.5, 0.5], () => {
    const S = spriteSheet(8, 8, 'p-sand');
    const f = ellipse(4, 4, 2.6, 2, 10, 0.4);
    const m = body(S, f);
    soft(S, P.sandShade, m, { gap: 1, len: [2, 4], pressure: 1 });
    pen(S, P.sandShadow, m, { gap: 1.4, len: [2, 4], pressure: 0.7 });
    return done(S);
});
item('props', 'p-bubble', [0.5, 0.5], () => {
    const S = spriteSheet(18, 18, 'p-bubble');
    const b = ellipse(9, 9, 6.5, 6.5, 20);
    const m = S.mask(b);
    addSolid(S, fmap(m, (v) => v * 0.35));
    ink(S, b, { color: P.foamLine, width: 1.4, passes: 1, wobble: 0.2 });
    const hl = S.mask(ellipse(6.5, 6.5, 2, 1.4, 10, -0.7));
    addSolid(S, hl);
    return done(S);
});
item('props', 'p-fluff', [0.5, 0.5], () => {
    const S = spriteSheet(28, 28, 'p-fluff');
    const r = rng(6);
    const hairs = [];
    for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU + (r() - 0.5) * 0.3, l = 9 + r() * 4; hairs.push({ pts: smooth([[14, 14], [14 + Math.cos(a) * l * 0.5 + (r() - 0.5) * 2, 14 + Math.sin(a) * l * 0.5], [14 + Math.cos(a) * l, 14 + Math.sin(a) * l]], { closed: false, steps: 4 }), width: 1, alpha: 0.9 }); }
    lines(S, PX.lilac, hairs, { pressure: 0.8, grain: 0.4 });
    lines(S, P.grassSilver, hairs.filter((_, i) => i % 2), { pressure: 0.6, grain: 0.4 });
    S.dots(PX.lilacDeep, [[14, 14, 1]], { rx: 2, ry: 1.6, grain: 0.3 });
    return done(S);
});
item('props', 'p-glow', [0.5, 0.5], () => {
    const W = 64, C = 32;
    const S = spriteSheet(W, W, 'p-glow');
    const g = S.mask(ellipse(C, C, 30, 30, 40), { feather: 8 });
    addSolid(S, fmap(g, (v) => v * 0.55));
    soft(S, P.sunGlow, g, { angle: 0.6, gap: 2.2, len: [6, 14], pmap: radial(S, C, C, 4, 30, 1, 0) });
    soft(S, P.warmLight, g, { angle: -0.6, gap: 2.6, len: [5, 10], pmap: radial(S, C, C, 2, 18, 0.8, 0) });
    return done(S);
});
item('props', 'p-star', [0.5, 0.5], () => {
    const S = spriteSheet(26, 26, 'p-star');
    const st = [];
    for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU - Math.PI / 2, rr = k % 2 ? 4.6 : 11; st.push([13 + Math.cos(a) * rr, 13.5 + Math.sin(a) * rr]); }
    const m = body(S, st);
    soft(S, P.sunYellow, m, { gap: 1.5, len: [3, 8], pressure: 1 });
    ink(S, st, { color: PX.sunLine, width: 1.4, passes: 1, wobble: 0.2 });
    return done(S);
});
item('props', 'p-note', [0.5, 0.5], () => {
    const S = spriteSheet(20, 24, 'p-note');
    const head = ellipse(7, 18, 4.4, 3.2, 14, -0.4);
    const m = body(S, head);
    soft(S, P.graphite, m, { gap: 1.2, pressure: 1, grain: 0.3 });
    lines(S, P.graphite, [[[11, 17], [11.5, 3]], [[11.5, 3], [15, 6], [17, 10]]], { width: 1.8, pressure: 1 });
    return done(S);
});
item('props', 'p-dust', [0.5, 0.5], () => {
    const S = spriteSheet(12, 12, 'p-dust');
    const m = S.mask(ellipse(6, 6, 4.5, 4.5, 14), { feather: 1.5 });
    addSolid(S, fmap(m, (v) => v * 0.2));
    pen(S, mix(P.sandShade, P.paper, 0.4), m, { gap: 1.5, len: [2, 5], pressure: 0.6 });
    return done(S);
});

// ---------------------------------------------------------------------------
// STÄPPEN (land)
// ---------------------------------------------------------------------------
/** A feathery plume along a spine: a silvery paper ribbon with fine hairs leaning back along it. */
function plume(S, spine, { hair = 7, density = 0.9, col = mix(P.grassSilver, P.graphiteSoft, 0.25), stem = mix(P.grassSilver, P.grassGreen, 0.4), lean = 0.55, sheen = 0.9 } = {}) {
    const q = resample(smooth(spine, { closed: false, steps: 10 }), 1.5);
    const n = q.length;
    const r = S.rand;
    // the plume's silky body: paper, lightly tinted silver
    const bodyPoly = around(q, (t) => hair * 0.55 * Math.sin(Math.PI * Math.min(1, 0.05 + t * 1.02)) + 0.4);
    const bm = S.mask(bodyPoly, { feather: 1 });
    addSolid(S, fmap(bm, (v) => v * sheen));
    soft(S, mix(P.grassSilver, P.paper, 0.35), bm, { angle: Math.atan2(q[n - 1][1] - q[0][1], q[n - 1][0] - q[0][0]), gap: 2.2, len: [8, 20], pressure: 0.55 });
    const hairs = [];
    for (let i = 2; i < n - 1; i++) {
        if (r() > density) continue;
        const a = q[i - 1], b = q[i + 1];
        const ta = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const t = i / n;
        const len = hair * (0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, t * 1.05))) * (0.7 + r() * 0.5);
        for (const side of [-1, 1]) {
            const ha = ta + side * (Math.PI / 2 - lean) + (r() - 0.5) * 0.3;
            const ex = q[i][0] + Math.cos(ha) * len, ey = q[i][1] + Math.sin(ha) * len;
            hairs.push({ pts: [q[i], [(q[i][0] + ex) / 2 + Math.cos(ta) * len * 0.15, (q[i][1] + ey) / 2 + Math.sin(ta) * len * 0.15], [ex, ey]], width: 0.8 + r() * 0.3, alpha: 0.7 });
        }
    }
    lines(S, col, hairs, { pressure: 0.55, grain: 0.45 });
    lines(S, stem, [q], { width: 1.1, pressure: 0.75 });
}
const FEATHER = [['feathergrass-1', 76, 84, 4], ['feathergrass-2', 100, 112, 5], ['feathergrass-3', 120, 138, 6], ['feathergrass-4', 138, 162, 7]];
for (const [name, W, H, n] of FEATHER) {
    item('props-land', name, [0.5, 1], () => {
        const S = spriteSheet(W, H, name);
        const r = rng(hashSeed(name));
        const bx = W * 0.36, by = H - 2;
        // the tuft: thin upright silver-green blades
        for (let k = 0; k < 16; k++) {
            const a = -Math.PI / 2 + (k / 15 - 0.5) * 1.0 + (r() - 0.5) * 0.2;
            const l = H * (0.2 + r() * 0.22);
            const x0 = bx + (r() - 0.5) * W * 0.16;
            mark(S, [P.grassSilver, mix(P.grassGreen, P.grassSilver, 0.5), P.grassOchre][k % 3], smooth([[x0, by], [x0 + Math.cos(a) * l * 0.5, by + Math.sin(a) * l * 0.55], [x0 + Math.cos(a + 0.15) * l, by + Math.sin(a + 0.15) * l]], { closed: false }), 2.3, { pressure: 0.95, profile: (t) => 1 - t * 0.85 });
        }
        // long feathery awns: up from the tuft, then arching over to the right
        for (let k = 0; k < n; k++) {
            const x0 = bx + (r() - 0.5) * 8, y0 = by - H * 0.22;
            const top = [x0 + (k - n / 2) * 5 + r() * 6, H * (0.05 + r() * 0.14)];
            const end = [top[0] + W * (0.32 + r() * 0.24), top[1] + H * (0.22 + r() * 0.22)];
            // the bare stalk, then the plume on its upper part
            const stalk = smooth([[x0, y0], [x0 + (top[0] - x0) * 0.4, y0 - (y0 - top[1]) * 0.6], top, end], { closed: false, steps: 12 });
            const cut = Math.floor(stalk.length * 0.42);
            lines(S, mix(P.grassSilver, P.grassGreen, 0.4), [stalk.slice(0, cut + 1)], { width: 1.2, pressure: 0.8 });
            plume(S, stalk.slice(cut), { hair: 5.5 + H * 0.02 });
        }
        return done(S);
    });
}

function backsippa(S, bare) {
    const W = 120, H = 142;
    const r = rng(71);
    const bx = 60, by = H - 3;
    // feathery basal leaves
    for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + (k / 8 - 0.5) * 2.4;
        const l = 26 + r() * 14;
        const sp = [[bx + (r() - 0.5) * 10, by], [bx + Math.cos(a) * l * 0.5, by + Math.sin(a) * l * 0.4], [bx + Math.cos(a) * l, by + Math.sin(a) * l * 0.6]];
        plume(S, sp, { hair: 6, density: 0.9, col: mix(P.grassGreen, P.grassSilver, 0.3), stem: P.grassGreen, lean: 0.25, sheen: 0.5 });
    }
    // hairy stems to five seed heads
    const heads = [[32, 36, 21], [60, 22, 24], [88, 34, 20], [46, 66, 17], [76, 70, 16]];
    for (const [hx, hy] of heads) {
        const st = smooth([[bx + (hx - bx) * 0.2, by - 4], [bx + (hx - bx) * 0.55, (by + hy) / 2 + 10], [hx, hy + 6]], { closed: false });
        mark(S, mix(P.grassSilver, PX.lilacDeep, 0.35), st, 3.4, { pressure: 0.95, profile: () => 1 });
        lines(S, mix(P.grassSilver, P.paper, 0.2), resample(st, 3.5).map(([x, y], i) => [[x, y], [x + (i % 2 ? 3.5 : -3.5), y - 3]]), { width: 0.9, pressure: 0.7 });
    }
    for (const [hx, hy, R] of heads) {
        if (bare) {
            // after the fluff is blown away: a small bare knob with a few stubs
            const knob = ellipse(hx, hy + 5, 4.5, 3.8, 14);
            const km = body(S, knob);
            soft(S, mix(PX.lilacDeep, P.grassGreen, 0.4), km, { gap: 1.4, pressure: 0.95 });
            const stubs = [];
            for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k / 5 - 0.5) * 2; stubs.push([[hx + Math.cos(a) * 4, hy + 5 + Math.sin(a) * 3.5], [hx + Math.cos(a) * 8, hy + 5 + Math.sin(a) * 7]]); }
            lines(S, P.grassSilver, stubs, { width: 1, pressure: 0.8 });
            ink(S, knob, { width: 1.3, passes: 1 });
            continue;
        }
        // a fluffy seed head: silky plumes swirling out from the centre
        const ball = ellipse(hx, hy, R, R * 0.92, 32);
        const bm = S.mask(ball, { feather: 2 });
        addSolid(S, fmap(bm, (v) => v * 0.85));
        soft(S, PX.lilac, bm, { angle: 0.6, gap: 2.6, len: [4, 10], pmap: radial(S, hx, hy, 2, R, 0.75, 0.15) });
        const hs = [];
        for (let k = 0; k < 38; k++) {
            const a = (k / 38) * TAU + r() * 0.25;
            const l = R * (0.7 + r() * 0.5);
            const sw = 0.45 + r() * 0.45;
            hs.push({ pts: smooth([[hx, hy], [hx + Math.cos(a) * l * 0.5 + Math.cos(a + 1.6) * l * 0.12, hy + Math.sin(a) * l * 0.5 + Math.sin(a + 1.6) * l * 0.12], [hx + Math.cos(a + sw) * l, hy + Math.sin(a + sw) * l]], { closed: false, steps: 5 }), width: 1, alpha: 0.85 });
        }
        lines(S, PX.lilacDeep, hs, { pressure: 0.55, grain: 0.45 });
        lines(S, P.grassSilver, hs.filter((_, i) => i % 2), { pressure: 0.6, grain: 0.45 });
        S.dots(PX.lilacDeep, [[hx, hy, 1]], { rx: 2.6, ry: 2.2, grain: 0.3 });
    }
}
item('props-land', 'backsippa', [0.5, 1], () => { const S = spriteSheet(120, 142, 'backsippa'); backsippa(S, false); return done(S); });
item('props-land', 'backsippa-bare', [0.5, 1], () => { const S = spriteSheet(120, 142, 'backsippa'); backsippa(S, true); return done(S); });

item('props-land', 'tussock-dotted', [0.5, 1], () => {
    const W = 164, H = 64;
    const S = spriteSheet(W, H, 'tussock-dotted');
    const mound = smooth([[4, H - 2], [14, 44], [34, 30], [62, 24], [96, 22], [124, 28], [146, 40], [160, H - 2]], { closed: false, steps: 6 });
    dotted(S, P.graphite, mound, { spacing: 7, r: 1.9 });
    dotted(S, P.graphite, [[6, H - 2], [158, H - 2]], { spacing: 9, r: 1.5 });
    for (const [x, y, a] of [[36, 32, -0.35], [58, 25, -0.12], [82, 22, 0.05], [106, 23, 0.2], [128, 30, 0.4]]) {
        dotted(S, P.graphite, smooth([[x, y + 2], [x + Math.sin(a) * 10, y - 10], [x + Math.sin(a) * 22, y - 20]], { closed: false }), { spacing: 5, r: 1.35 });
    }
    return done(S);
});

item('props-land', 'grass-ramp', [0, 1], () => {
    const W = 200, H = 120;
    const S = spriteSheet(W, H, 'grass-ramp');
    // the walkable slope rises from the lower left to the upper right
    const top = []; for (let x = 0; x <= W; x += 5) top.push([x, H - 2 - (H - 8) * (x / W) + Math.sin(x * 0.12) * 1.2]);
    const poly = top.concat([[W, H], [0, H]]);
    const m = body(S, poly);
    soft(S, P.earth, m, { angle: -0.1, gap: 2.1, len: [12, 36], pressure: 0.85 });
    pen(S, mix(P.earth, P.woodDark, 0.3), m, { angle: 0.6, gap: 2.4, len: [8, 24], pmap: ramp(S, W, 0, W * 0.5, H, 0.2, 0.9) });
    const turf = S.mask(top.concat(top.slice().reverse().map(([x, y]) => [x, y + 16])));
    soft(S, P.grassSilver, turf, { angle: -0.5, gap: 1.8, len: [6, 16], pressure: 1 });
    pen(S, P.grassGreen, turf, { angle: -1.2, gap: 2, len: [5, 12], pressure: 0.85 });
    const bl = [];
    const r = rng(9);
    for (let k = 0; k < 70; k++) { const x = r() * W, y = H - 2 - (H - 8) * (x / W); bl.push([[x, y + 2], [x + 2 + r() * 3, y - 5 - r() * 7]]); }
    lines(S, P.grassGreen, bl, { width: 1.3, pressure: 0.85 });
    lines(S, P.grassSilver, bl.filter((_, i) => i % 2).map((b) => shift(b, 1.5, 0)), { width: 1.2, pressure: 0.8 });
    ink(S, top, { closed: false, width: 2, pressure: 0.85 });
    return done(S);
});

item('props-land', 'hurdle-log', [0.5, 1], () => {
    const W = 112, H = 52;
    const S = spriteSheet(W, H, 'hurdle-log');
    // two crossed sticks at each end hold a birch-grey log
    for (const x of [20, 92]) {
        for (const d of [-1, 1]) {
            const st = [[x - d * 10, H - 1], [x + d * 8, 10]];
            mark(S, P.woodDark, st, 4.2, { pressure: 0.95, profile: () => 1 });
            ink(S, st, { closed: false, width: 1.3, pressure: 0.7, passes: 1 });
        }
    }
    const log = smooth([[6, 14], [56, 12], [106, 14], [108, 22], [106, 30], [56, 32], [6, 30], [4, 22]], { steps: 4, tension: 0.35 });
    const m = body(S, log);
    paintWood(S, log, m, { base: PP.drift, dark: PP.driftDark, angle: 0, grain: 4 });
    const face = ellipse(8, 22, 5, 9, 18);
    body(S, face);
    soft(S, mix(PP.drift, P.sand, 0.4), S.mask(face), { pressure: 0.9 });
    ink(S, log, { width: 2.3 });
    ink(S, face, { width: 1.6 });
    return done(S);
});

item('props-land', 'boulder', [0.5, 1], () => {
    const W = 164, H = 124;
    const S = spriteSheet(W, H, 'boulder');
    const poly = smooth([[8, H - 2], [4, 84], [16, 46], [44, 18], [86, 6], [124, 16], [150, 44], [160, 82], [156, H - 2]], { steps: 6, tension: 0.45 });
    const m = body(S, poly);
    paintStone(S, poly, m, { base: P.rock, dark: P.rockDark, speck: P.rockDark, lightK: 0.45 });
    // a facet line and a crack
    lines(S, P.graphite, [smooth([[60, 22], [74, 58], [70, 98]], { closed: false }), smooth([[112, 40], [124, 62], [118, 80]], { closed: false })], { width: 1.4, pressure: 0.6, clip: m });
    // lichen
    const r = rng(12);
    const lich = [];
    for (let k = 0; k < 22; k++) lich.push([30 + r() * 100, 20 + r() * 50, 0.6 + r() * 0.9]);
    S.dots(mix(P.grassOchre, P.sunYellow, 0.3), lich, { rx: 3.2, ry: 2.2, clip: m, grain: 0.45 });
    // grass at its foot
    for (let k = 0; k < 16; k++) { const x = 6 + r() * (W - 12); mark(S, k % 2 ? P.grassSilver : P.grassGreen, [[x, H - 1], [x + (r() - 0.3) * 8, H - 10 - r() * 12]], 2.2, { pressure: 0.9, profile: (t) => 1 - t * 0.8 }); }
    ink(S, poly, { width: 2.8 });
    return done(S);
});

item('props-land', 'wave-marks', [0.5, 0.5], () => {
    const W = 304, H = 70;
    const S = spriteSheet(W, H, 'wave-marks');
    const r = rng(14);
    for (let k = 0; k < 4; k++) {
        const y0 = 14 + k * 14, amp = 4 + r() * 1.5, per = 34 + r() * 8, ph = r() * 6;
        const pts = [];
        for (let x = 6 + r() * 14; x <= W - 6 - r() * 14; x += 2) pts.push([x, y0 + Math.sin((x / per) * TAU + ph) * amp]);
        ink(S, pts, { closed: false, color: k % 2 ? mix(P.seaBlue, P.graphite, 0.4) : P.graphite, width: 2, pressure: 0.85 - k * 0.1, wobble: 0.4, passes: 1 });
    }
    return done(S);
});

item('props-land', 'rope-plank-up', [0.5, 1], () => {
    const W = 84, H = 84;
    const S = spriteSheet(W, H, 'rope-plank-up');
    // the plank bridge rolled up: a spiral of planks seen from the end, tied with rope
    const cx = 42, cy = 44;
    const disc = ellipse(cx, cy, 38, 38, 40);
    const m = body(S, disc);
    soft(S, mix(P.wood, P.paper, 0.25), m, { angle: 0.4, pressure: 0.95 });
    pen(S, P.wood, m, { angle: -0.5, gap: 2.2, len: [6, 16], pmap: radial(S, cx - 10, cy - 10, 6, 50, 0.3, 1) });
    const sp = [];
    for (let t = 0; t < 5.2 * Math.PI; t += 0.12) { const rr = 4 + t * 2.1; sp.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]); }
    lines(S, P.woodDark, [sp], { width: 2.2, pressure: 0.9 });
    // plank ends: short radial ticks between the turns
    const ticks = [];
    for (let k = 0; k < 18; k++) { const a = k * 2.1, rr = 8 + (k % 5) * 6; ticks.push([[cx + Math.cos(a) * rr, cy + Math.sin(a) * rr], [cx + Math.cos(a) * (rr + 5), cy + Math.sin(a) * (rr + 5)]]); }
    lines(S, P.woodDark, ticks, { width: 1.5, pressure: 0.8 });
    // a rope round it
    const rope = [[cx - 30, cy - 24], [cx + 26, cy + 30]];
    mark(S, mix(P.sand, P.woodDark, 0.4), rope, 5, { pressure: 0.95, profile: () => 1 });
    ink(S, rope, { closed: false, width: 1.2, pressure: 0.8, passes: 1 });
    ink(S, disc, { width: 2.5 });
    return done(S);
});

item('props-land', 'rope-plank-down', [0, 0.5], () => {
    const W = 1004, H = 62;
    const S = spriteSheet(W, H, 'rope-plank-down');
    const sag = (x) => 4 * Math.sin(Math.PI * x / W);
    // planks seen side-on, a slight sag in the middle
    const r = rng(15);
    const deck = [];
    for (let x = 4; x < W - 4; x += 20) deck.push([x, x + 18 + (r() - 0.5) * 2]);
    for (const [x0, x1] of deck) {
        const y = 38 + sag((x0 + x1) / 2);
        const pl = [[x0, y], [x1, y + 0.5], [x1, y + 11], [x0, y + 10.5]];
        const m = body(S, pl);
        soft(S, P.wood, m, { angle: 0, gap: 1.8, len: [6, 14], pressure: 0.95 });
        pen(S, P.woodDark, rim(S, pl, m, 0, -3, 1), { gap: 1.6, pressure: 0.8 });
        ink(S, pl, { width: 1.5, pressure: 0.9, passes: 1, wobble: 0.3 });
    }
    // the ropes: a lower rope under the planks, a hand rope above, ties between
    const rope = (y0, dip) => { const pts = []; for (let x = 0; x <= W; x += 8) pts.push([x, y0 + sag(x) * dip]); return pts; };
    const top = rope(8, 1.6), low = rope(50, 1);
    for (const rp of [top, low]) { mark(S, mix(P.sand, P.woodDark, 0.45), rp, 3.6, { pressure: 0.95, profile: () => 1 }); lines(S, P.graphite, [rp], { width: 1, pressure: 0.6 }); }
    const ties = [];
    for (let x = 12; x < W; x += 40) ties.push([[x, 8 + sag(x) * 1.6], [x, 38 + sag(x)]]);
    lines(S, mix(P.sand, P.woodDark, 0.5), ties, { width: 1.6, pressure: 0.85 });
    return done(S);
});

/** Kartväktaren's map mark: a compass rose; halves meet along a torn line. */
function markRose(S, cx, cy, R, part) {
    const tear = [];
    for (let y = cy - R - 4; y <= cy + R + 4; y += 6) tear.push([cx + ((Math.round((y - cy) / 6) % 2) ? 3 : -3), y]);
    const leftClip = S.mask([[0, 0], ...tear.map(([x, y]) => [x, y]), [0, S.h]].concat([[0, S.h]]));
    const rightClip = fmap(leftClip, (v) => 1 - v);
    const clip = part === 'land' ? leftClip : part === 'sea' ? rightClip : null;
    const circle = ellipse(cx, cy, R, R, 48);
    const inner = ellipse(cx, cy, R * 0.72, R * 0.72, 40);
    const star = [];
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU - Math.PI / 2; const rr = k % 4 === 0 ? R * 0.98 : k % 2 === 0 ? R * 0.6 : R * 0.24; star.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    if (part === 'empty') {
        dotted(S, P.graphite, circle.concat([circle[0]]), { spacing: 7, r: 1.6 });
        dotted(S, P.graphite, star.concat([star[0]]), { spacing: 6, r: 1.4 });
        return;
    }
    const cm = fmap(S.mask(circle), (v, i) => v * clip[i]);
    addSolid(S, cm);
    const fill = part === 'land' ? P.grassGreen : P.seaBlue;
    const fill2 = part === 'land' ? P.grassOchre : P.skyBlue;
    soft(S, fill2, cm, { angle: 0.6, gap: 2.2, len: [6, 16], pressure: 0.7 });
    const sm = fmap(S.mask(star), (v, i) => v * clip[i]);
    pen(S, fill, sm, { angle: -0.6, gap: 1.8, len: [5, 12], pressure: 0.95 });
    // half of each star point shaded, like a drawn compass
    const shade = [];
    for (let k = 0; k < 16; k += 2) { const a = (k / 16) * TAU - Math.PI / 2, rr = k % 4 === 0 ? R * 0.98 : R * 0.6; shade.push([[cx, cy], [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr], [cx + Math.cos(a + TAU / 16) * R * 0.24, cy + Math.sin(a + TAU / 16) * R * 0.24]]); }
    for (const sh of shade) pen(S, P.graphite, fmap(S.mask(sh), (v, i) => v * clip[i]), { angle: 0.8, gap: 1.8, len: [4, 10], pressure: 0.7 });
    const draw = (pts, o) => {
        // ink only the part of a contour inside this half
        let cur = [];
        const runs = [];
        for (const p of resample(pts.concat([pts[0]]), 2)) {
            const i = Math.max(0, Math.min(S.w * S.h - 1, Math.round(p[1]) * S.w + Math.round(p[0])));
            if (clip[i] > 0.5) cur.push(p); else { if (cur.length > 1) runs.push(cur); cur = []; }
        }
        if (cur.length > 1) runs.push(cur);
        for (const rn of runs) ink(S, rn, { closed: false, ...o });
    };
    draw(circle, { width: 2.4 });
    draw(inner, { width: 1.4, pressure: 0.7, passes: 1 });
    draw(star, { width: 1.8, pressure: 0.95 });
    // the torn edge
    const te = tear.filter(([, y]) => Math.abs(y - cy) <= R + 1);
    ink(S, te, { closed: false, width: 1.6, pressure: 0.85, passes: 1 });
    // N / letters: a tiny L for land, H for hav
    if (part === 'land') lines(S, P.graphite, [[[cx - R * 0.55, cy - 6], [cx - R * 0.55, cy + 6], [cx - R * 0.55 + 6, cy + 6]]], { width: 1.8, pressure: 0.95 });
    else lines(S, P.graphite, [[[cx + R * 0.5, cy - 6], [cx + R * 0.5, cy + 6]], [[cx + R * 0.5 + 8, cy - 6], [cx + R * 0.5 + 8, cy + 6]], [[cx + R * 0.5, cy], [cx + R * 0.5 + 8, cy]]], { width: 1.8, pressure: 0.95 });
}
for (const part of ['land', 'sea', 'empty']) {
    item('props-land', `mark-${part}`, [0.5, 0.5], () => { const S = spriteSheet(124, 124, 'mark'); markRose(S, 62, 62, 56, part); return done(S); });
}

item('props-land', 'pinwheel', [0.5, 1], () => {
    // the stick only: pinwheel-head spins on the pin at (0, -110) wu from this sprite's anchor
    const W = 20, H = 122;
    const S = spriteSheet(W, H, 'pinwheel');
    const st = [[8, 8], [12, 8], [12.5, H - 2], [7.5, H - 2]];
    const m = body(S, st);
    soft(S, mix(P.wood, P.sand, 0.4), m, { angle: Math.PI / 2, gap: 1.6, pressure: 0.95 });
    pen(S, P.woodDark, rim(S, st, m, -2, 0, 1), { angle: Math.PI / 2, gap: 1.6, pressure: 0.7 });
    ink(S, st, { width: 1.5, passes: 1 });
    const pin = ellipse(10, 12, 3.4, 3.4, 12);
    body(S, pin);
    soft(S, P.red, S.mask(pin), { pressure: 1 });
    ink(S, pin, { width: 1.2, passes: 1 });
    return done(S);
});

item('props-land', 'pinwheel-head', [0.5, 0.5], () => {
    const W = 76, C = 38, R = 34;
    const S = spriteSheet(W, W, 'pinwheel-head');
    const cols = [P.red, P.sunYellow, P.seaBlue, P.grassGreen];
    for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU;
        const T = (pts) => transform(pts, { x: C, y: C, rot: a });
        // each blade: a paper triangle folded to the centre, one half shaded
        const blade = T([[0, 0], [R, -R * 0.02], [R * 0.7, R * 0.72]]);
        const fold = T([[0, 0], [R * 0.7, R * 0.72], [R * 0.08, R * 0.52]]);
        const bm = body(S, blade);
        soft(S, cols[k], bm, { angle: a + 0.5, gap: 1.8, len: [5, 12], pressure: 0.95 });
        const fm = body(S, fold);
        soft(S, cols[k], fm, { angle: a - 0.4, gap: 1.8, len: [5, 12], pressure: 0.55 });
        pen(S, P.graphite, fm, { angle: a + 1.2, gap: 2.4, len: [4, 10], pressure: 0.25 });
        ink(S, blade, { width: 1.6, passes: 1, wobble: 0.3 });
        ink(S, fold, { width: 1.3, pressure: 0.8, passes: 1, wobble: 0.3 });
    }
    const hub = ellipse(C, C, 4, 4, 12);
    body(S, hub);
    soft(S, P.red, S.mask(hub), { pressure: 1 });
    ink(S, hub, { width: 1.3, passes: 1 });
    return done(S);
});

item('props-land', 'edge-tick', [0.5, 1], () => {
    const W = 62, H = 62;
    const S = spriteSheet(W, H, 'edge-tick');
    // a graphite hoof mark standing on the ground line, and a pencil tick at the edge
    const k = 0.75;
    const tmp = spriteSheet(42, 42, 'edge-tick-hoof');
    hoof(tmp, 21, 21, true);
    for (let y = 0; y < 42; y++) for (let x = 0; x < 42; x++) {
        const tx = Math.round(4 + x * k), ty = Math.round(H - 34 + y * k);
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        const i = y * 42 + x, j = ty * W + tx;
        S.r[j] = Math.min(S.r[j], tmp.r[i]); S.g[j] = Math.min(S.g[j], tmp.g[i]); S.b[j] = Math.min(S.b[j], tmp.b[i]);
    }
    S.burnish(null, 1, 0.25);
    mark(S, P.graphite, [[46, H - 3], [50, 30], [55, 16]], 3.6, { pressure: 1, profile: (t) => 1 - 0.6 * t });
    lines(S, P.graphite, [[[2, H - 2], [60, H - 2]]], { width: 1.5, pressure: 0.65 });
    return done(S);
});

// ---------------------------------------------------------------------------
// KELPSKOGEN (sea)
// ---------------------------------------------------------------------------
/** One kelp blade: a long ruffled leaf around a spine. */
function kelpBlade(S, spine, width, { col = P.kelp, dark = P.kelpDark, light = mix(P.kelp, P.shellLight, 0.35), ruffle = 0.22, outline = true } = {}) {
    const r = S.rand;
    const ph = r() * 6;
    const poly = around(spine, (t) => {
        const w = width / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.04 + t * 0.98)), 0.7) * (1 + ruffle * Math.sin(t * 31 + ph));
        return [w, w * (1 + ruffle * 0.6 * Math.sin(t * 27 + ph * 2))];
    });
    const m = body(S, poly);
    soft(S, col, m, { angle: -1.3, gap: 1.8, len: [8, 24], pressure: 1 });
    soft(S, col, m, { angle: -0.7, gap: 2.6, len: [6, 16], pressure: 0.5 });
    const q = resample(smooth(spine, { closed: false, steps: 8 }), 2);
    const a0 = Math.atan2(q[q.length - 1][1] - q[0][1], q[q.length - 1][0] - q[0][0]);
    pen(S, dark, rim(S, poly, m, Math.cos(a0 + Math.PI / 2) * width * 0.25, Math.sin(a0 + Math.PI / 2) * width * 0.25, 1), { angle: a0 + 0.4, gap: 1.8, len: [6, 16], pressure: 0.85 });
    pen(S, light, rim(S, poly, m, -Math.cos(a0 + Math.PI / 2) * width * 0.3, -Math.sin(a0 + Math.PI / 2) * width * 0.3, 1), { angle: a0 - 0.3, gap: 2.2, len: [6, 14], pressure: 0.55 });
    lines(S, dark, [q], { width: 1.3, pressure: 0.75, clip: m });
    if (outline) ink(S, poly, { color: P.kelpDark, width: 1.5, pressure: 0.85, passes: 1, wobble: 0.4 });
    return poly;
}

item('props-sea', 'kelp-strip', [0.5, 1], () => {
    const W = 96, H = 900;
    const S = spriteSheet(W, H, 'kelp-strip');
    const r = rng(81);
    const cx = W / 2;
    // the stipe runs up the middle and wavers a little
    const stipe = [];
    for (let y = H - 6; y >= 30; y -= 30) stipe.push([cx + Math.sin(y * 0.011) * 6, y]);
    const sx = (y) => cx + Math.sin(y * 0.011) * 6;
    // blades alternate left and right all the way up, pointing upward
    let y = H - 70, side = 1;
    const blades = [];
    while (y > 20) {
        const len = 90 + r() * 70;
        const reach = 30 + r() * 12;
        const x0 = sx(y), y0 = y;
        blades.push([[x0, y0], [x0 + side * reach * 0.6, y0 - len * 0.35], [x0 + side * reach, y0 - len * 0.7], [x0 + side * (reach - 6), y0 - len]]);
        y -= 34 + r() * 16;
        side = -side;
    }
    // a top blade continuing the stipe
    blades.push([[sx(60), 60], [sx(60) + 4, 30], [sx(60) - 2, 4]]);
    const stipePoly = around(stipe, (t) => 3.4 - t * 1.4);
    const stm = body(S, stipePoly);
    soft(S, P.kelp, stm, { angle: Math.PI / 2, gap: 1.4, pressure: 1 });
    pen(S, P.kelpDark, stm, { angle: Math.PI / 2 + 0.3, gap: 1.6, pressure: 0.9, grain: 0.4 });
    for (const b of blades) kelpBlade(S, b, 22 + r() * 8);
    ink(S, stipePoly, { color: P.kelpDark, width: 1.3, pressure: 0.8, passes: 1 });
    // a holdfast at the base
    const hold = [];
    for (let k = 0; k < 7; k++) { const a = Math.PI * (0.1 + 0.8 * k / 6); hold.push(smooth([[cx, H - 16], [cx + Math.cos(a) * 12, H - 10], [cx + Math.cos(a) * 24, H - 2]], { closed: false })); }
    for (const h of hold) { mark(S, P.kelpDark, h, 3.2, { pressure: 0.95, profile: () => 1 }); }
    // air bladders at a few blade roots
    for (let k = 1; k < blades.length - 1; k += 3) {
        const [bx, by] = blades[k][0];
        const f = ellipse(bx, by - 6, 5, 6.5, 14);
        const fm = body(S, f);
        soft(S, mix(P.kelp, P.shellLight, 0.5), fm, { pressure: 0.95 });
        ink(S, f, { color: P.kelpDark, width: 1.2, passes: 1 });
    }
    return done(S);
});

item('props-sea', 'kelp-bed', [0.5, 1], () => {
    const W = 304, H = 184;
    const S = spriteSheet(W, H, 'kelp-bed');
    const r = rng(83);
    const cols = [P.kelp, P.kelpForest, mix(P.kelp, P.shellLight, 0.3), mix(P.kelpForest, P.deepTeal, 0.3)];
    // back row darker and shorter, front row brighter
    for (let row = 0; row < 3; row++) {
        const n = [9, 11, 8][row];
        for (let k = 0; k < n; k++) {
            const x0 = 14 + r() * (W - 28), y0 = H - 4;
            const len = [120, 150, 100][row] * (0.7 + r() * 0.4);
            const lean = (r() - 0.5) * 0.9;
            const sp = [[x0, y0], [x0 + Math.sin(lean) * len * 0.3 + (r() - 0.5) * 16, y0 - len * 0.35], [x0 + Math.sin(lean) * len * 0.7, y0 - len * 0.72], [x0 + Math.sin(lean) * len + (r() - 0.5) * 20, y0 - len]];
            kelpBlade(S, sp, 16 + r() * 12, { col: row === 0 ? mix(cols[k % 4], P.deepTeal, 0.35) : cols[k % 4], ruffle: 0.25 });
        }
    }
    // stones among the roots
    for (const [x, w] of [[60, 34], [170, 26], [250, 30]]) {
        const st = blob(x, H - 8, w / 2, 9, r, { n: 8, flat: 0.6 });
        const m = body(S, st);
        paintStone(S, st, m, { base: mix(P.rock, P.deepTeal, 0.3), dark: mix(P.rockDark, P.deepTeal, 0.3) });
        ink(S, st, { width: 1.8 });
    }
    return done(S);
});

item('props-sea', 'kelp-float', [0.5, 0.5], () => {
    const W = 164, H = 56;
    const S = spriteSheet(W, H, 'kelp-float');
    const r = rng(85);
    for (let k = 0; k < 6; k++) {
        const y0 = 22 + (r() - 0.5) * 16, x0 = 6 + r() * 30, x1 = W - 6 - r() * 30;
        const sp = [];
        for (let x = x0; x <= x1; x += 12) sp.push([x, y0 + Math.sin(x * 0.07 + k) * 5]);
        kelpBlade(S, sp, 12 + r() * 6, { ruffle: 0.3 });
    }
    for (let k = 0; k < 5; k++) {
        const f = ellipse(20 + r() * (W - 40), 18 + r() * 18, 6, 5, 14);
        const fm = body(S, f);
        soft(S, mix(P.kelp, P.shellLight, 0.55), fm, { pressure: 0.95 });
        lighten(S, S.mask(ellipse(f[0][0] - 8, f[0][1] - 3, 2, 1.5, 8)), { amount: 0.8 });
        ink(S, f, { color: P.kelpDark, width: 1.3, passes: 1 });
    }
    return done(S);
});

const SEAROCKS = [['seabed-rock-1', 132, 82], ['seabed-rock-2', 92, 62], ['seabed-rock-3', 184, 110]];
for (const [name, w, h] of SEAROCKS) {
    item('props-sea', name, [0.5, 1], () => {
        const S = spriteSheet(w + 8, h + 6, name);
        const r = rng(hashSeed(name));
        const poly = blob(w / 2 + 4, h / 2 + 4, w / 2, h / 2, r, { n: 9, j: 0.16, flat: 0.5 });
        const [, , , by] = bounds(poly);
        const pl = shift(poly, 0, h + 4 - by);
        const m = body(S, pl);
        paintStone(S, pl, m, { base: mix(P.rock, P.deepTeal, 0.28), dark: mix(P.rockDark, P.seaDeep, 0.3), speck: mix(P.rockDark, P.deepTeal, 0.2), lightK: 0.35 });
        // a green-blue wash from the water above, and a few barnacles and weed
        soft(S, P.deepTeal, m, { angle: -0.2, gap: 2.6, len: [10, 26], pressure: 0.3 });
        const bar = [];
        for (let k = 0; k < w / 12; k++) bar.push([10 + r() * w, 8 + r() * h * 0.6, 0.8 + r() * 0.6]);
        S.dots(P.paper, bar, { rx: 2.4, ry: 1.8, clip: m, grain: 0.2 });
        for (let k = 0; k < 4; k++) { const x = 12 + r() * (w - 16); const topY = bounds(pl.filter(([px]) => Math.abs(px - x) < 8))[1] || 10; mark(S, P.kelp, [[x, topY + 4], [x + (r() - 0.5) * 10, topY - 10 - r() * 10]], 3.2, { pressure: 0.9 }); }
        ink(S, pl, { width: 2.4 });
        return done(S);
    });
}

item('props-sea', 'shell-under', [0.5, 1], () => {
    const W = 68, H = 50;
    const S = spriteSheet(W, H, 'shell-under');
    // a big ribbed shell half-sunk in the seabed sand
    const hx = 34, hy = H - 6, R = 38;
    let poly = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI * (1.1 + 0.8 * i / 16); poly.push([hx + Math.cos(a) * R * 0.95 * (1 + 0.05 * Math.sin(i * 1.6 * Math.PI)), hy + Math.sin(a) * R * 0.95]); }
    poly = smooth(poly.concat([[hx + 8, hy + 3], [hx - 8, hy + 3]]), { steps: 3, tension: 0.4 });
    const m = body(S, poly);
    soft(S, mix(PP.peach, PP.lilac, 0.4), m, { angle: -0.5, gap: 2, len: [6, 16], pressure: 0.95 });
    soft(S, P.deepTeal, m, { angle: 0.4, gap: 2.6, len: [6, 14], pressure: 0.3 });
    const ribs = [];
    for (let i = 1; i < 10; i++) { const a = Math.PI * (1.12 + 0.76 * i / 10); ribs.push([[hx, hy], [hx + Math.cos(a) * R * 0.93, hy + Math.sin(a) * R * 0.93]]); }
    lines(S, mix(PP.peachDeep, PP.lilacDeep, 0.5), ribs, { width: 1.3, pressure: 0.85, clip: m });
    ink(S, poly, { width: 2.2 });
    const sand = smooth([[2, H - 1], [10, H - 9], [30, H - 8], [52, H - 10], [66, H - 1]], { steps: 5 });
    const sm = body(S, sand);
    soft(S, P.seabed, sm, { pressure: 0.95 });
    pen(S, mix(P.seabed, P.deepTeal, 0.4), sm, { angle: 0.3, pressure: 0.5 });
    ink(S, sand.slice(0, 4), { closed: false, width: 1.5, pressure: 0.7, passes: 1 });
    return done(S);
});

item('props-sea', 'vault-mouth', [0.5, 1], () => {
    const W = 504, H = 424;
    const S = spriteSheet(W, H, 'vault-mouth');
    const r = rng(87);
    const face = smooth([[2, H], [8, 300], [30, 200], [70, 120], [130, 60], [210, 22], [300, 18], [380, 44], [440, 100], [480, 180], [496, 280], [502, H]], { steps: 5, tension: 0.4 });
    const m = body(S, face);
    const base = mix(P.rock, P.deepTeal, 0.35), dark = mix(P.rockDark, P.seaDeep, 0.35);
    const { id, edge, seeds } = voronoiT(W, H, 88, 22, { sx: 0.8 });
    soft(S, mix(base, P.paper, 0.3), m, { angle: -0.5, gap: 2.2, len: [16, 40], pressure: 0.9 });
    seeds.forEach(([sx2, sy], j) => {
        const fm = fmap(id, (v, i) => (v === j ? m[i] * smoothstep(0.5, 3, edge[i]) : 0));
        const tone = 0.35 + r() * 0.5;
        pen(S, base, fm, { angle: [-0.8, -0.3, 0.3, 0.8][j % 4], gap: 2.3, len: [12, 36], pmap: pressureMap(W, H, (x, y) => tone * (0.8 + 0.5 * smoothstep(sy - 50, sy + 60, y))) });
    });
    S.deposit(P.graphite, fmap(edge, (v, i) => m[i] * (1 - smoothstep(0.5, 2.2, v)) * 0.75), { pressure: 0.5, grain: 0.5 });
    pen(S, dark, fmap(edge, (v, i) => m[i] * Math.pow(1 - smoothstep(1, 12, v), 1.4)), { angle: 0.9, gap: 2.3, len: [8, 20], pressure: 0.55 });
    // the dark mouth: an irregular arch, darkest deep inside
    const mouth = smooth([[140, H + 2], [136, 330], [150, 250], [190, 190], [252, 168], [316, 186], [356, 240], [370, 320], [366, H + 2]], { steps: 6, tension: 0.45 });
    const mm = S.mask(mouth);
    lighten(S, mm, { amount: 1, grain: 0 });
    const deep = radial(S, 254, 330, 10, 150, 1.1, 0.55);
    soft(S, P.seaDeep, mm, { angle: 0.3, gap: 1.9, len: [12, 30], width: 2, pmap: deep });
    soft(S, PP.cave, mm, { angle: -0.5, gap: 1.9, len: [12, 30], width: 2, pmap: deep });
    soft(S, P.graphite, mm, { angle: 0.9, gap: 2.2, len: [10, 26], width: 1.8, pmap: fmap(deep, (v) => Math.max(0, v - 0.45)) });
    S.burnish(mm, 1, 0.4);
    // rock thickness round the rim
    const inner = S.mask(mouth.map(([x, y]) => [254 + (x - 254) * 0.9, y + (y < H ? 14 : 0)]));
    const lip = fmap(mm, (v, i) => v * (1 - inner[i]));
    lighten(S, lip, { amount: 0.85, grain: 0.1 });
    pen(S, base, lip, { angle: 1.2, gap: 2, len: [6, 16], pressure: 0.95 });
    pen(S, dark, lip, { angle: 1.2, gap: 2.3, len: [6, 16], pressure: 0.6 });
    ink(S, mouth.filter(([, y]) => y < H - 1), { closed: false, width: 3, pressure: 1 });
    // weed and kelp hanging at the edges
    for (let k = 0; k < 7; k++) { const x = 150 + r() * 210; const y = bounds(mouth.filter(([px]) => Math.abs(px - x) < 12))[1] || 180; kelpBlade(S, [[x, y - 2], [x + (r() - 0.5) * 8, y + 18], [x + (r() - 0.5) * 10, y + 34 + r() * 16]], 8, { ruffle: 0.3 }); }
    ink(S, face.filter(([, y]) => y < H - 1), { closed: false, width: 3 });
    return done(S);
});

/** Paper pieces: cream paper, ink-blue edges, a graphite crease. */
function paperPiece(S, poly, fold, { up = true } = {}) {
    const m = body(S, poly);
    soft(S, P.paperCream, m, { angle: -0.6, gap: 2.2, len: [8, 20], pressure: 0.8 });
    if (fold) {
        const fm = S.mask(fold);
        pen(S, mix(P.paperCream, P.graphiteSoft, 0.5), fm, { angle: 0.5, gap: 2, len: [6, 16], pressure: up ? 0.75 : 0.35 });
    }
    ink(S, poly, { color: P.inkBlue, width: 1.9, pressure: 0.9 });
}
item('props-sea', 'paper-flap', [0.5, 1], () => {
    const W = 64, H = 58;
    const S = spriteSheet(W, H, 'paper-flap');
    // a flap of the seabed's paper lifted up along a straight crease
    const base = [[4, H - 3], [60, H - 3], [58, H - 1], [6, H - 1]];
    const flap = [[10, H - 3], [54, H - 3], [40, 6]];
    paperPiece(S, flap, [[10, H - 3], [30, H - 3], [40, 6]]);
    const bm = body(S, base);
    soft(S, P.seabed, bm, { pressure: 0.9 });
    lines(S, P.graphite, [[[8, H - 3], [56, H - 3]]], { width: 1.8, pressure: 0.95 });
    return done(S);
});
item('props-sea', 'paper-flap-flat', [0.5, 1], () => {
    const W = 64, H = 14;
    const S = spriteSheet(W, H, 'paper-flap-flat');
    const flap = [[8, H - 3], [56, H - 3], [48, 4], [14, 5]];
    paperPiece(S, flap, null, { up: false });
    lines(S, P.graphite, [[[8, H - 3], [56, H - 3]]], { width: 1.6, pressure: 0.8 });
    return done(S);
});
item('props-sea', 'paper-corner', [0.5, 1], () => {
    const W = 124, H = 122;
    const S = spriteSheet(W, H, 'paper-corner');
    // a big folded corner of the page sticking up: the dog-ear shows its paler underside
    const sheet = [[6, H - 3], [118, H - 3], [118, 60], [70, 12]];
    const under = [[70, 12], [118, 60], [82, 68]];
    paperPiece(S, sheet, [[6, H - 3], [70, 12], [60, H - 3]]);
    const um = body(S, under);
    soft(S, mix(P.paperCream, P.paper, 0.6), um, { angle: 0.8, pressure: 0.5 });
    pen(S, P.graphiteSoft, rim(S, under, um, 4, -4, 1), { gap: 1.8, pressure: 0.5 });
    ink(S, under, { color: P.inkBlue, width: 1.7 });
    lines(S, P.graphite, [[[70, 12], [118, 60]]], { width: 1.4, pressure: 0.9 });
    // faint ruled lines on the paper
    lines(S, mix(P.inkBlue, P.paper, 0.5), [[[20, 96], [110, 96]], [[36, 78], [110, 78]]], { width: 1, pressure: 0.6 });
    return done(S);
});
item('props-sea', 'paper-corner-flat', [0.5, 1], () => {
    const W = 124, H = 20;
    const S = spriteSheet(W, H, 'paper-corner-flat');
    const sheet = [[6, H - 3], [118, H - 3], [110, 6], [20, 4]];
    paperPiece(S, sheet, null, { up: false });
    lines(S, P.graphite, [[[20, 4], [110, 6]]], { width: 1.2, pressure: 0.6 });
    return done(S);
});

item('props-sea', 'veckmuren', [0.5, 1], () => {
    const W = 360, H = 1400;
    const S = spriteSheet(W, H, 'veckmuren');
    const r = rng(89);
    const X = 120, G = 66; // the crease line, and the glass slab's width
    // the piled-up water behind the wall bulges above the sea on the far side
    const pile = [[X, 70], [X + 60, 30], [X + 150, 14], [W, 8], [W, H], [X, H]];
    const pm = body(S, smooth(pile, { closed: true, steps: 5, tension: 0.35 }));
    const depth = ramp(S, 0, 0, 0, H, 0.55, 1.1);
    soft(S, P.seaBlue, pm, { angle: 0.02, gap: 2, len: [30, 90], width: 2, pmap: depth });
    soft(S, P.seaDeep, pm, { angle: -0.03, gap: 2.2, len: [30, 90], width: 2, pmap: fmap(depth, (v) => v * 0.8) });
    pen(S, P.foamLine, pm, { angle: 0, gap: 4, len: [30, 100], pressure: 0.45 });
    // pressure lines: the water leaning on the wall
    const pl = [];
    for (let k = 0; k < 40; k++) { const y = 60 + r() * (H - 80); const x0 = X + G + r() * 60; pl.push(smooth([[x0 + 120, y + 6], [x0 + 50, y + 2], [x0, y]], { closed: false })); }
    lines(S, mix(P.skyBlue, P.paper, 0.3), pl, { width: 2, pressure: 0.5 });
    // the glass slab: pale, vertical streaks, white highlights
    const slab = [[X, 70], [X + G, 44], [X + G, H], [X, H]];
    const sm = body(S, slab);
    lighten(S, sm, { amount: 1, grain: 0 });
    soft(S, PX.glassPale, sm, { angle: Math.PI / 2, gap: 1.9, len: [80, 260], width: 2, pressure: 0.95 });
    pen(S, P.skyBlue, sm, { angle: Math.PI / 2, gap: 2.2, len: [80, 300], width: 2, pmap: ramp(S, X, 0, X + G, 0, 0.35, 0.9) });
    const streaks = [];
    for (let k = 0; k < 9; k++) { const x = X + 6 + r() * (G - 12); streaks.push({ pts: [[x, 60 + r() * 200], [x + (r() - 0.5) * 2, H - r() * 300]], width: 1.2 + r(), alpha: 0.8 }); }
    lines(S, P.seaBlue, streaks, { pressure: 0.55 });
    const hi = S.coverage((c) => { c.lineCap = 'round'; for (const [x, w] of [[X + 12, 5], [X + 22, 2.5], [X + G - 10, 3]]) { c.lineWidth = w; c.globalAlpha = 0.95; c.beginPath(); c.moveTo(x, 90); c.lineTo(x + 1, H - 40); c.stroke(); } });
    lighten(S, hi, { amount: 0.9, grain: 0.2 });
    // the crease: a ruler-straight graphite line, with the fold's grey shadow on our side
    const sh = pressureMap(W, H, (x, y) => (x < X && x > X - 14 && y > 72 ? Math.pow(1 - (X - x) / 14, 1.6) * 0.8 : 0));
    addSolid(S, fmap(sh, (v) => v * 0.5));
    S.deposit(P.graphiteSoft, sh, { pressure: 0.5, grain: 0.35 });
    const ln = S.coverage((c) => { c.lineCap = 'butt'; c.lineWidth = 2; c.globalAlpha = 1; c.beginPath(); c.moveTo(X, 68); c.lineTo(X, H); c.stroke(); c.lineWidth = 1.4; c.beginPath(); c.moveTo(X + G, 44); c.lineTo(X + G, H); c.stroke(); }, { additive: false });
    S.deposit(P.graphite, ln, { pressure: 1, grain: 0.3 });
    // the top of the piled water: her foam line along its crest
    const crest = smooth([[X, 70], [X + 60, 30], [X + 150, 14], [W, 8]], { closed: false, steps: 8 });
    ink(S, crest, { closed: false, color: P.foamLine, width: 2.4, pressure: 0.95 });
    return done(S);
});

// ---------------------------------------------------------------------------
// SPEGELVIKEN (bay): Pappersfyren and its mechanisms
// ---------------------------------------------------------------------------
/** Ruler-straight ink line (no wobble). */
function ruler(S, pts, { color = P.inkBlue, width = 1.6, pressure = 0.95 } = {}) {
    const cov = S.coverage((c) => { c.lineCap = 'round'; c.lineJoin = 'miter'; c.lineWidth = width; c.globalAlpha = 1; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }, { additive: false });
    S.deposit(color, cov, { pressure, grain: 0.35 });
}
/** Folded paper facet: cream with a tone depending on how it faces the light. */
function paperFacet(S, poly, tone, { angle = Math.PI / 2 } = {}) {
    const m = body(S, poly);
    soft(S, P.paperCream, m, { angle, gap: 2.2, len: [20, 60], pressure: 0.85 });
    if (tone > 0) pen(S, mix(P.paperCream, P.graphiteSoft, 0.55), m, { angle: angle + 0.3, gap: 2.2, len: [16, 50], pressure: tone });
    return m;
}
// Lighthouse geometry (texture px, origin top-left; the anchor is bottom centre).
// Attachment points relative to the lighthouse anchor, in wu:
//   shutter openings (shutter-closed/-open) at (-78, -1100), (0, -1100), (78, -1100);
//   lamp (lamp-dark/-lit) at (0, -1100); gallery floor at y = -1000; lower window (window-lower) at (0, -182).
const LH = { W: 424, H: 1320, cx: 212, baseW: 380, topW: 230, towerTop: 1000, lampY: 1100, shutterDX: 78, lowerY: 180 };
item('props-bay', 'lighthouse', [0.5, 1], () => {
    const { W, H, cx } = LH;
    const S = spriteSheet(W, H, 'lighthouse');
    const yb = H - 2, yt = H - LH.towerTop;
    const hb = LH.baseW / 2, ht = LH.topW / 2;
    // the tower: three folded facets (left in shade, middle lit, right half-shade)
    const xL = (y, k) => cx + (-1 + k * 2 / 3) * (hb + (ht - hb) * ((yb - y) / (yb - yt)));
    const facet = (k) => [[xL(yt, k), yt], [xL(yt, k + 1), yt], [xL(yb, k + 1), yb], [xL(yb, k), yb]];
    const tones = [0.55, 0, 0.25];
    for (let k = 0; k < 3; k++) paperFacet(S, facet(k), tones[k]);
    // ink-blue bands: every 120 px a pair of ruled lines, the band between hatched lightly
    for (let y = yb - 110; y > yt + 40; y -= 150) {
        const band = [[xL(y, 0), y], [xL(y, 3), y], [xL(y + 40, 3), y + 40], [xL(y + 40, 0), y + 40]];
        const bm = S.mask(band);
        pen(S, P.inkBlue, bm, { angle: 0.8, gap: 2.8, len: [10, 30], pressure: 0.45, grain: 0.5 });
        ruler(S, [[xL(y, 0), y], [xL(y, 3), y]], { width: 1.5 });
        ruler(S, [[xL(y + 40, 0), y + 40], [xL(y + 40, 3), y + 40]], { width: 1.5 });
    }
    // fold lines and outline, ruler-straight graphite
    for (const k of [1, 2]) ruler(S, [[xL(yt, k), yt], [xL(yb, k), yb]], { color: P.graphite, width: 1.8 });
    ruler(S, [[xL(yt, 0), yt], [xL(yb, 0), yb]], { color: P.graphite, width: 2.4 });
    ruler(S, [[xL(yt, 3), yt], [xL(yb, 3), yb]], { color: P.graphite, width: 2.4 });
    // small windows up the tower, and the lower window's frame (window-lower sits on it)
    for (const wy of [yb - 460, yb - 700]) {
        const wv = [[cx - 18, wy - 30], [cx + 18, wy - 30], [cx + 18, wy + 30], [cx - 18, wy + 30]];
        const wm = body(S, wv);
        soft(S, P.inkBlue, wm, { angle: 0.6, gap: 1.8, pressure: 0.8 });
        ruler(S, wv.concat([wv[0]]), { color: P.graphite, width: 1.8 });
    }
    const lw = ellipse(cx, yb - LH.lowerY, 62, 62, 48);
    const lwm = body(S, lw);
    soft(S, P.inkBlue, lwm, { angle: 0.6, gap: 2, pressure: 0.6 });
    ink(S, lw, { color: P.graphite, width: 2.2 });
    // the gallery: a wider ledge with a railing
    const gy = yt;
    const ledge = [[cx - 160, gy - 6], [cx + 160, gy - 6], [cx + 150, gy + 14], [cx - 150, gy + 14]];
    paperFacet(S, ledge, 0.35, { angle: 0 });
    ruler(S, ledge.concat([ledge[0]]), { color: P.graphite, width: 2 });
    const rail = [];
    for (let x = cx - 150; x <= cx + 150; x += 25) rail.push([[x, gy - 6], [x, gy - 44]]);
    for (const rl of rail) ruler(S, rl, { color: P.graphite, width: 1.6 });
    ruler(S, [[cx - 152, gy - 44], [cx + 152, gy - 44]], { color: P.graphite, width: 2.2 });
    // the lamp room: a folded box with three openings for the shutters
    const ry0 = H - LH.lampY - 90, ry1 = gy - 6;
    const room = [[cx - 124, ry0], [cx + 124, ry0], [cx + 124, ry1], [cx - 124, ry1]];
    paperFacet(S, room, 0.1);
    for (const k of [-1, 0, 1]) {
        const ox = cx + k * LH.shutterDX, oy = H - LH.lampY;
        const op = [[ox - 30, oy - 43], [ox + 30, oy - 43], [ox + 30, oy + 43], [ox - 30, oy + 43]];
        const om = body(S, op);
        soft(S, P.inkBlue, om, { angle: 0.7, gap: 1.8, pressure: 0.95 });
        soft(S, P.graphite, om, { angle: -0.7, gap: 2.2, pressure: 0.45 });
        ruler(S, op.concat([op[0]]), { color: P.graphite, width: 2 });
    }
    ruler(S, room.concat([room[0]]), { color: P.graphite, width: 2.4 });
    // the roof: a folded paper cone with a ball on top
    const roof = [[cx - 142, ry0 + 2], [cx, ry0 - 104], [cx + 142, ry0 + 2]];
    const rl = [[cx - 142, ry0 + 2], [cx, ry0 - 104], [cx - 20, ry0 + 2]];
    paperFacet(S, roof, 0.2, { angle: -0.6 });
    paperFacet(S, rl, 0.5, { angle: -0.6 });
    ruler(S, roof.concat([roof[0]]), { color: P.graphite, width: 2.4 });
    ruler(S, [[cx, ry0 - 104], [cx - 20, ry0 + 2]], { color: P.graphite, width: 1.6 });
    const ball = ellipse(cx, ry0 - 114, 11, 11, 18);
    const bm = body(S, ball);
    soft(S, P.inkBlue, bm, { pressure: 0.8 });
    ink(S, ball, { color: P.graphite, width: 1.8 });
    // a door at the foot
    const door = [[cx - 26, yb - 96], [cx + 26, yb - 96], [cx + 26, yb], [cx - 26, yb]];
    const dm = body(S, door);
    soft(S, mix(P.paperCream, P.inkBlue, 0.25), dm, { angle: Math.PI / 2, pressure: 0.8 });
    ruler(S, [[cx - 26, yb], [cx - 26, yb - 96], [cx + 26, yb - 96], [cx + 26, yb]], { color: P.graphite, width: 2 });
    return done(S);
});

function shutter(open) {
    const W = 66, H = 90;
    const S = spriteSheet(W, H, 'shutter');
    if (!open) {
        for (const [x0, x1] of [[2, 33], [33, 64]]) {
            const leaf = [[x0, 2], [x1, 2], [x1, 88], [x0, 88]];
            paperFacet(S, leaf, x0 < 30 ? 0.2 : 0.05);
            for (let y = 14; y < 88; y += 12) ruler(S, [[x0 + 4, y], [x1 - 4, y]], { width: 1.2, pressure: 0.75 });
            ruler(S, leaf.concat([leaf[0]]), { color: P.graphite, width: 1.8 });
        }
        // a little latch
        const lt = [[30, 42], [36, 42], [36, 50], [30, 50]];
        body(S, lt);
        soft(S, PP.iron, S.mask(lt), { pressure: 0.9 });
        ruler(S, lt.concat([lt[0]]), { color: P.graphite, width: 1.2 });
    } else {
        // folded back: two narrow leaves at the sides, the opening empty between them
        for (const side of [0, 1]) {
            const leaf = side === 0 ? [[2, 0], [12, 6], [12, 84], [2, 90]] : [[64, 0], [54, 6], [54, 84], [64, 90]];
            paperFacet(S, leaf, 0.35);
            for (let y = 16; y < 84; y += 12) ruler(S, side === 0 ? [[4, y], [10, y + 1]] : [[62, y], [56, y + 1]], { width: 1, pressure: 0.7 });
            ruler(S, leaf.concat([leaf[0]]), { color: P.graphite, width: 1.8 });
        }
    }
    return done(S);
}
item('props-bay', 'shutter-closed', [0.5, 0.5], () => shutter(false));
item('props-bay', 'shutter-open', [0.5, 0.5], () => shutter(true));

function lamp(lit) {
    const W = 300, C = 150;
    const S = spriteSheet(W, W, 'lamp');
    if (lit) {
        const glow = S.mask(ellipse(C, C, 146, 146, 64), { feather: 24 });
        addSolid(S, fmap(glow, (v) => v * 0.7));
        soft(S, P.sunGlow, glow, { angle: 0.5, gap: 2.4, len: [10, 28], pmap: radial(S, C, C, 20, 146, 1, 0) });
        soft(S, P.warmLight, glow, { angle: -0.6, gap: 2.8, len: [8, 20], pmap: radial(S, C, C, 10, 90, 0.9, 0) });
        const rays = [];
        for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU + 0.1; rays.push([[C + Math.cos(a) * 58, C + Math.sin(a) * 58], [C + Math.cos(a) * (96 + (k % 2) * 22), C + Math.sin(a) * (96 + (k % 2) * 22)]]); }
        for (const ry of rays) ink(S, ry, { closed: false, color: PX.sunLine, width: 1.8, pressure: 0.6, passes: 1, wobble: 0.3 });
    }
    // the lens: a beehive of glass rings
    const lens = roundRect(C - 30, C - 40, 60, 80, 22);
    const lm = body(S, lens);
    if (lit) {
        soft(S, P.sunYellow, lm, { angle: 0.6, gap: 1.8, pressure: 0.9 });
        lighten(S, S.mask(ellipse(C, C, 16, 24, 20), { feather: 6 }), { amount: 0.8, grain: 0.1 });
    } else {
        soft(S, mix(PX.bayGrey, P.inkBlue, 0.3), lm, { angle: 0.6, gap: 1.8, pressure: 0.8 });
        pen(S, P.graphite, lm, { angle: -0.6, gap: 2.4, pressure: 0.3 });
    }
    for (let y = C - 30; y <= C + 30; y += 10) ruler(S, [[C - 28, y], [C + 28, y]], { color: lit ? PX.sunLine : P.inkBlue, width: 1.2, pressure: 0.8 });
    ink(S, lens, { color: P.graphite, width: 2 });
    return done(S);
}
item('props-bay', 'lamp-dark', [0.5, 0.5], () => lamp(false));
item('props-bay', 'lamp-lit', [0.5, 0.5], () => lamp(true));

item('props-bay', 'window-lower', [0.5, 0.5], () => {
    const W = 140, C = 70;
    const S = spriteSheet(W, W, 'window-lower');
    const frame = ellipse(C, C, 66, 66, 56);
    paperFacet(S, frame, 0.15);
    const glass = ellipse(C, C, 48, 48, 48);
    const gm = S.mask(glass);
    lighten(S, gm, { amount: 1, grain: 0 });
    soft(S, P.deepTeal, gm, { angle: 0.5, gap: 2, pressure: 0.7 });
    soft(S, P.seaBlue, gm, { angle: -0.4, gap: 2.4, pressure: 0.5, pmap: radial(S, C + 14, C + 14, 4, 60, 1, 0.3) });
    lighten(S, S.mask(smooth([[C - 34, C - 12], [C - 24, C - 30], [C - 12, C - 36], [C - 20, C - 24], [C - 30, C - 6]], { steps: 4 })), { amount: 0.7, grain: 0.2 });
    ruler(S, [[C - 48, C], [C + 48, C]], { color: P.inkBlue, width: 2.2 });
    ruler(S, [[C, C - 48], [C, C + 48]], { color: P.inkBlue, width: 2.2 });
    ink(S, glass, { color: P.graphite, width: 2 });
    ink(S, frame, { color: P.graphite, width: 2.4 });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; S.dots(P.inkBlue, [[C + Math.cos(a) * 57, C + Math.sin(a) * 57, 1]], { rx: 2.4, ry: 2.4, grain: 0.3 }); }
    return done(S);
});

item('props-bay', 'pier-end-rail', [0.5, 1], () => {
    const W = 124, H = 122;
    const S = spriteSheet(W, H, 'pier-end-rail');
    for (const x of [14, 110]) {
        const post = [[x - 7, 10], [x + 7, 8], [x + 7, H - 2], [x - 7, H - 2]];
        const m = body(S, post);
        paintWood(S, post, m, { base: P.wood, dark: P.woodDark, angle: Math.PI / 2, grain: 3 });
        ink(S, post, { width: 2.2 });
    }
    for (const y of [22, 62]) {
        const rl = [[4, y], [120, y - 2], [120, y + 11], [4, y + 13]];
        const m = body(S, rl);
        paintWood(S, rl, m, { base: mix(P.wood, P.sand, 0.2), dark: P.woodDark, angle: 0, grain: 3 });
        ink(S, rl, { width: 2 });
    }
    return done(S);
});

function plate(up) {
    const W = 164, H = up ? 58 : 36;
    const S = spriteSheet(W, H, 'plate');
    const top = up ? 12 : 12, side = up ? 28 : 8;
    // a round stone disc on the seabed: its top face and (when up) its side
    const face = ellipse(82, top + 6, 76, 13, 48);
    const sideP = arc(82, top + 6, 76, 13, 0, Math.PI, 24).concat(arc(82, top + 6 + side, 76, 13, Math.PI, 0, 24));
    const sm = body(S, sideP);
    soft(S, mix(P.rock, P.deepTeal, 0.3), sm, { angle: 1.3, gap: 2, pressure: 0.9 });
    pen(S, mix(P.rockDark, P.seaDeep, 0.3), sm, { angle: 1.3, gap: 2.2, pmap: ramp(S, 0, 0, W, 0, 0.2, 0.9) });
    const fm = body(S, face);
    soft(S, mix(P.rock, P.paper, 0.35), fm, { angle: -0.3, gap: 2, pressure: 0.9 });
    // an ink-blue ring and a pencil mark: this is a mechanism of the paper world
    ink(S, ellipse(82, top + 6, 50, 8.5, 40), { color: P.inkBlue, width: 1.8, pressure: 0.9 });
    ink(S, ellipse(82, top + 6, 22, 3.8, 24), { color: P.inkBlue, width: 1.6, pressure: 0.9 });
    ink(S, face, { width: 2.2 });
    ink(S, sideP, { width: 2.2 });
    if (!up) {
        const sand = smooth([[2, H - 1], [10, H - 12], [40, H - 14], [82, H - 12], [124, H - 14], [154, H - 12], [162, H - 1]], { steps: 4 });
        const sd = body(S, sand);
        soft(S, P.seabed, sd, { pressure: 0.9 });
        ink(S, sand.slice(0, 6), { closed: false, width: 1.4, pressure: 0.6, passes: 1 });
    }
    return done(S);
}
item('props-bay', 'plate-up', [0.5, 1], () => plate(true));
item('props-bay', 'plate-down', [0.5, 1], () => plate(false));

item('props-bay', 'pipe', [0.5, 1], () => {
    const W = 184, H = 904;
    const S = spriteSheet(W, H, 'pipe');
    const x0 = 22, x1 = 162;
    const tube = [[x0, 14], [x1, 14], [x1, H - 2], [x0, H - 2]];
    const m = body(S, tube);
    soft(S, P.paperCream, m, { angle: Math.PI / 2, gap: 2.2, len: [30, 80], pressure: 0.85 });
    // round shading: darker at both sides, lit left of centre
    pen(S, mix(P.paperCream, P.graphiteSoft, 0.55), m, { angle: Math.PI / 2, gap: 2.2, len: [30, 80], pmap: pressureMap(W, H, (x) => { const u = (x - x0) / (x1 - x0); return 0.85 * Math.pow(Math.abs(u - 0.38) / 0.62, 1.6); }) });
    // the rolled paper's seam spiralling, and ring bands
    for (let y = 60; y < H - 20; y += 110) {
        ruler(S, [[x0, y], [x1, y + 8]], { width: 1.5 });
        ruler(S, [[x0, y + 6], [x1, y + 14]], { width: 1, pressure: 0.6 });
    }
    // side vents: louvred slots on both sides
    for (let y = 140; y < H - 60; y += 170) {
        for (const [vx, dir] of [[x0 + 2, 1], [x1 - 30, -1]]) {
            const vent = [[vx, y], [vx + 28, y], [vx + 28, y + 60], [vx, y + 60]];
            const vm = body(S, vent);
            soft(S, P.inkBlue, vm, { angle: 0.7, gap: 1.8, pressure: 0.85 });
            for (let k = 0; k < 5; k++) ruler(S, [[vx + 1, y + 8 + k * 11], [vx + 27, y + 8 + k * 11 + dir * 4]], { color: P.paperCream, width: 3.4, pressure: 0.9 });
            ruler(S, vent.concat([vent[0]]), { color: P.graphite, width: 1.6 });
        }
    }
    // the mouth at the top: an ellipse showing the inside
    const mouth = ellipse(92, 14, 70, 11, 40);
    const mm = body(S, mouth);
    soft(S, P.inkBlue, mm, { angle: 0, gap: 1.8, pressure: 0.8 });
    ink(S, mouth, { color: P.graphite, width: 2.2 });
    ruler(S, [[x0, 14], [x0, H - 2]], { color: P.graphite, width: 2.6 });
    ruler(S, [[x1, 14], [x1, H - 2]], { color: P.graphite, width: 2.6 });
    return done(S);
});

// The spiral stair from the pier to the lamp gallery (anchor: the top landing's
// top edge, which is the gallery's floor line). Its bottom landing's top is
// STAIR.rise below that, level with the pier deck; it reaches out left to the
// pier and its top landing reaches out right to the gallery.
const STAIR = { W: 340, rise: 1336, cx: 170, landing: 26 };
item('props-bay', 'stair', [0.5, 0], () => {
    const { W, rise, cx, landing } = STAIR, H = rise + landing + 6;
    const S = spriteSheet(W, H, 'stair');
    // the central post, from the gallery down to the pier deck (a piling continues it in the water)
    const post = [[cx - 9, 2], [cx + 9, 2], [cx + 10, H - 2], [cx - 10, H - 2]];
    paperFacet(S, post, 0.3);
    ruler(S, post.concat([post[0]]), { color: P.graphite, width: 1.8 });
    // treads spiralling round it: seen from the side they swing left and right
    const steps = 52, lo = rise - 16, hi = landing + 22, step = (lo - hi) / steps;
    for (let k = 0; k < steps; k++) {
        const y = lo - k * step;
        const a = k * 0.62;
        const reach = Math.cos(a) * 118;
        const front = Math.sin(a) > 0;
        const t = [[cx, y], [cx + reach, y - 3], [cx + reach, y + 7], [cx, y + 9]];
        const m = body(S, t);
        soft(S, P.paperCream, m, { angle: 0, gap: 2, pressure: 0.85 });
        if (!front) pen(S, mix(P.paperCream, P.graphiteSoft, 0.6), m, { angle: 0.4, gap: 2, pressure: 0.6 });
        ruler(S, t.concat([t[0]]), { color: front ? P.graphite : P.graphiteSoft, width: front ? 1.6 : 1.2 });
    }
    // the handrail: a helix of ink-blue
    const rail = [];
    for (let k = 0; k <= steps * 4; k++) { const a = (k / 4) * 0.62; const y = lo - (k / 4) * step - 40; rail.push([cx + Math.cos(a) * 122, y]); }
    lines(S, P.inkBlue, [rail], { width: 2, pressure: 0.85 });
    // the landings: at the bottom out to the pier (left), at the top out to the gallery (right)
    for (const [x0, x1, y] of [[0, cx + 30, rise], [cx - 30, W, 0]]) {
        const slab = [[x0, y], [x1, y], [x1, y + landing], [x0, y + landing]];
        paperFacet(S, slab, 0.25, { angle: 0 });
        ruler(S, slab.concat([slab[0]]), { color: P.graphite, width: 2 });
        // a rail on the landing's outer edge, and a bracket under it
        const rx = x0 === 0 ? x0 + 8 : x1 - 8;
        ruler(S, [[rx, y], [rx, y - 60]], { color: P.graphite, width: 2 });
        ruler(S, [[x0 === 0 ? x0 + 4 : cx - 20, y - 56], [x0 === 0 ? cx - 14 : x1 - 4, y - 56]], { color: P.inkBlue, width: 2 });
        // the top landing hangs out over the water on a bracket down to the post
        if (!y) ruler(S, [[x1 - 30, landing], [cx + 10, landing + 90]], { color: P.graphiteSoft, width: 1.6 });
    }
    return done(S);
});

// The little gate at the stair's foot: it is bolted from the stair side, so it
// opens only for someone coming down (then the stair works both ways).
function stairGate(open) {
    const W = open ? 40 : 78, H = 118;
    const S = spriteSheet(W, H, open ? 'stair-gate-open' : 'stair-gate');
    const bars = open ? [[10, 30]] : [[8, 70]];
    for (const [a, b] of bars) {
        const frame = [[a, 14], [b, 14], [b, H - 4], [a, H - 4]];
        const m = body(S, frame);
        soft(S, P.paperCream, m, { angle: Math.PI / 2, gap: 2.2, pressure: 0.8 });
        ruler(S, frame.concat([frame[0]]), { color: P.graphite, width: 2 });
        if (!open) {
            for (let x = a + 12; x < b - 4; x += 12) ruler(S, [[x, 18], [x, H - 8]], { color: P.graphiteSoft, width: 1.3 });
            // the bolt, on the stair side
            ruler(S, [[b - 4, 56], [b + 4, 56]], { color: P.inkBlue, width: 4 });
        }
    }
    return done(S);
}
item('props-bay', 'stair-gate', [0.5, 1], () => stairGate(false));
item('props-bay', 'stair-gate-open', [0.5, 1], () => stairGate(true));

item('props-bay', 'basin', [0.5, 1], () => {
    const W = 224, H = 84;
    const S = spriteSheet(W, H, 'basin');
    const bowl = smooth([[4, 18], [60, 22], [164, 22], [220, 18], [206, 50], [170, 74], [112, 82], [54, 74], [18, 50]], { steps: 6 });
    paperFacet(S, bowl, 0.3, { angle: 0.3 });
    const water = ellipse(112, 20, 104, 12, 48);
    const wm = body(S, water);
    soft(S, P.skyBlue, wm, { angle: 0, gap: 1.8, pressure: 0.95 });
    pen(S, P.seaBlue, wm, { angle: 0, gap: 2.2, pressure: 0.6 });
    lighten(S, S.mask(ellipse(80, 17, 30, 3, 20)), { amount: 0.7 });
    ink(S, water, { color: P.foamLine, width: 1.8 });
    for (let y = 36; y < 76; y += 14) ruler(S, [[30 + (y - 36) * 0.4, y], [194 - (y - 36) * 0.4, y]], { width: 1.2, pressure: 0.6 });
    ink(S, bowl, { color: P.graphite, width: 2.4 });
    return done(S);
});

/** Hand-lettered capitals (graphite strokes) for the map: L A N D H V. */
function letter(S, ch, x, y, h, w = h * 0.62, width = 2.4) {
    const L = {
        L: [[[0, 0], [0, 1], [0.8, 1]]],
        A: [[[0, 1], [0.5, 0], [1, 1]], [[0.22, 0.6], [0.78, 0.6]]],
        N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
        D: [[[0, 0], [0, 1]], [[0, 0], [0.55, 0.05], [0.95, 0.5], [0.55, 0.95], [0, 1]]],
        H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
        V: [[[0, 0], [0.5, 1], [1, 0]]]
    }[ch];
    for (const st of L) mark(S, P.graphite, smooth(st.map(([u, v]) => [x + u * w, y + v * h]), { closed: false, steps: ch === 'D' ? 6 : 1 }), width, { pressure: 1, profile: () => 1 });
}
function mapTable(open) {
    const W = 304, H = 164;
    const S = spriteSheet(W, H, 'map-table');
    // the table
    const topP = [[10, 70], [294, 70], [300, 84], [4, 84]];
    const tm = body(S, topP);
    paintWood(S, topP, tm, { base: P.wood, dark: P.woodDark, angle: 0, grain: 4 });
    ink(S, topP, { width: 2.2 });
    for (const x of [30, 262]) {
        const leg = [[x, 84], [x + 12, 84], [x + 12, H - 2], [x, H - 2]];
        const m = body(S, leg);
        paintWood(S, leg, m, { base: P.woodDark, dark: mix(P.woodDark, P.graphite, 0.4), angle: Math.PI / 2, grain: 2 });
        ink(S, leg, { width: 2 });
    }
    if (!open) {
        // the map folded shut, a ruler lying on it
        const book = [[70, 50], [234, 44], [240, 70], [66, 72]];
        paperFacet(S, book, 0.15, { angle: 0 });
        ruler(S, book.concat([book[0]]), { color: P.graphite, width: 2 });
        ruler(S, [[70, 58], [236, 52]], { width: 1.2, pressure: 0.6 });
        const rl = [[90, 36], [210, 30], [211, 38], [91, 44]];
        const rm = body(S, rl);
        soft(S, mix(P.sunYellow, P.wood, 0.4), rm, { pressure: 0.9 });
        for (let k = 0; k < 12; k++) ruler(S, [[96 + k * 10, 36 - k * 0.5], [96 + k * 10, 40 - k * 0.5]], { color: P.graphite, width: 1, pressure: 0.8 });
        ruler(S, rl.concat([rl[0]]), { color: P.graphite, width: 1.5 });
    } else {
        // open: two pages, LAND and HAV, tilted toward us
        const left = [[34, 16], [152, 24], [152, 72], [26, 70]];
        const right = [[152, 24], [270, 16], [278, 70], [152, 72]];
        paperFacet(S, left, 0.08, { angle: 0 });
        paperFacet(S, right, 0.02, { angle: 0 });
        letter(S, 'L', 58, 28, 14); letter(S, 'A', 70, 28, 14); letter(S, 'N', 82, 28, 14); letter(S, 'D', 94, 28, 14);
        letter(S, 'H', 190, 28, 14); letter(S, 'A', 202, 28, 14); letter(S, 'V', 214, 28, 14);
        // a little land sketch and a little sea sketch
        const hill = smooth([[40, 64], [70, 50], [100, 56], [130, 48], [146, 62]], { closed: false });
        ink(S, hill, { closed: false, color: P.grassGreen, width: 1.6, pressure: 0.9, passes: 1 });
        for (const yy of [52, 60]) { const w = []; for (let x = 162; x < 266; x += 3) w.push([x, yy + Math.sin(x * 0.25) * 2]); ink(S, w, { closed: false, color: P.seaBlue, width: 1.5, pressure: 0.9, passes: 1 }); }
        ruler(S, left.concat([left[0]]), { color: P.graphite, width: 1.8 });
        ruler(S, right.concat([right[0]]), { color: P.graphite, width: 1.8 });
        ruler(S, [[152, 24], [152, 72]], { color: P.graphite, width: 1.4 });
    }
    return done(S);
}
item('props-bay', 'map-closed', [0.5, 1], () => mapTable(false));
item('props-bay', 'map-open', [0.5, 1], () => mapTable(true));

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
export function renderItem(name) {
    const it = ITEMS.find((x) => x.name === name);
    if (!it) throw new Error(`unknown prop ${name}`);
    return it.draw();
}

export async function build(api) {
    for (const [name, a] of Object.entries(ATLASES)) api.atlas(name, { scale: 1, bundle: a.bundle, quality: a.quality || 82 });
    for (const it of ITEMS) api.frame(it.atlas, it.name, it.draw(), it.anchor);
}

// ---------------------------------------------------------------------------
// The stuck wave's run-up (props-land): the splash's own water carried on
// down Alva's beach to the waterline, drawn on the playable beach's profile.
// Appended last so no earlier prop's tooth roll (rollN) changes.
// ---------------------------------------------------------------------------
item('props-land', 'frozen-runup', [0, 0], () => {
    const land = SCENES.land, it = land.decor.find((d) => d.frozen);
    const G = runupShape({ ground: surfaceGround(land.surfaces), x: it.x, y: it.y });
    const { x: X0, y: Y0, w: W, h: H } = G.frame;
    const S = spriteSheet(W, H, 'frozen-runup');
    const px = (wx) => wx - X0, py = (wy) => wy - Y0;
    const exP = px(G.ex), span = G.span, shoreP = px(G.shoreX);
    const gy = new Float32Array(W), cy = new Float32Array(W);
    for (let x = 0; x < W; x++) { gy[x] = py(G.groundAt(X0 + x + 0.5)); cy[x] = py(G.crestAt(X0 + x + 0.5)); }
    const col = (x) => Math.max(0, Math.min(W - 1, Math.round(x)));
    // 1. the crest: the splash's own base curve and seed, so the scallops line up
    //    under the splash's fading right end, then the run-up to the sea level
    const base = SPLASH_BASE.map(([sx, sy]) => G.at(sx, sy)).map(([wx, wy]) => [px(wx), py(wy)]);
    for (let wx = G.ex + 12; wx < G.shoreX - 6; wx += 12) base.push([px(wx), py(G.crestAt(wx))]);
    base.push([shoreP, py(0)], [W + 4, py(0)]);
    const capEnd = (p) => 1 - smoothstep(exP + 0.2 * span, exP + 0.66 * span, p[0]);
    const crest = foamCrest(smooth(base, { closed: false, steps: 8 }), rng(31), { scallop: 4, period: 13, capW: 10, ends: capEnd });
    const topY = new Float32Array(W).fill(H);
    for (let i = 1; i < crest.top.length; i++) {
        const [ax, ay] = crest.top[i - 1], [bx, by] = crest.top[i];
        for (let x = Math.max(0, Math.ceil(Math.min(ax, bx))); x <= Math.min(W - 1, Math.floor(Math.max(ax, bx))); x++) topY[x] = Math.min(topY[x], ay + (by - ay) * ((x - ax) / ((bx - ax) || 1)));
    }
    const ground = [];
    for (let x = W + 4; x >= -4; x -= 3) ground.push([x, Math.min(H + 2, gy[col(x)] + 6)]);
    const bodyM = S.mask(crest.top.concat(ground));
    addSolid(S, bodyM);
    const capM = fmap(S.mask(crest.cap), (v, i) => v * bodyM[i]);
    // 2. her little white loops, lying in the water's slope where it is deep enough
    const rr = rng(37), patches = [];
    for (let k = 0; k < 80 && patches.length < 15; k++) {
        const x = exP - 40 + rr() * (0.7 * span + 40), c = col(x), d = gy[c] - cy[c];
        if (d < 22) continue;
        const y = cy[c] + 13 + rr() * (d - 22), k2 = Math.min(1, d / 50);
        const slope = Math.atan2(cy[col(x + 6)] - cy[col(x - 6)], 12);
        patches.push(blob(x, y, (5 + rr() * 8) * k2, (2.4 + rr() * 2.6) * k2, rr, { n: 9, j: 0.3, rot: -0.3 + rr() * 0.25 + slope * 0.7 }));
    }
    const pm = patches.map((q) => S.mask(q));
    for (const m of pm) addSolid(S, m);
    const white = unionMasks(capM, ...pm);
    const wm = fmap(bodyM, (v, i) => v * (1 - white[i]));
    // 3. the splash's hatching, turning into her sea's long level strokes towards the shore
    const toSea = (x) => smoothstep(exP + 0.2 * span, exP + 0.85 * span, x);
    const pdeep = pressureMap(W, H, (x, y) => {
        const c = cy[x], g = gy[x], rel = clamp01((y - c) / Math.max(8, g - c));
        return (0.55 + 0.4 * rel + 0.15) * (0.5 + 0.5 * smoothstep(4, 30, g - c));
    });
    waterHatch(S, fmap(wm, (v, i) => v * (1 - toSea(i % W))), pdeep, { angle: -0.2 });
    const seaPart = fmap(wm, (v, i) => v * toSea(i % W));
    soft(S, P.skyBlue, seaPart, { angle: -0.012, gap: 1.8, len: [40, 130], width: 2, pressure: 0.95 });
    pen(S, P.seaBlue, seaPart, { angle: 0.008, gap: 1.8, len: [30, 120], width: 1.9, grain: 0.6, pmap: pdeep });
    pen(S, P.seaBlue, seaPart, { angle: -0.025, gap: 2.6, len: [20, 70], width: 1.7, pressure: 0.5, grain: 0.6 });
    S.burnish(wm, 1, 0.25);
    soft(S, P.skyBlue, capM, { angle: -0.6, gap: 2.4, len: [5, 14], pressure: 0.3 });
    for (let k = 0; k < patches.length; k++) soft(S, P.skyBlue, rim(S, patches[k], pm[k], 0, -2, 1), { angle: -0.4, gap: 2.4, len: [4, 10], pressure: 0.4 });
    // 4. the envelope: melts into the sand, fades in under the splash, thins at the shore;
    //    the waterline itself stays at full strength to the sea's own line
    const lineFrom = exP + 0.5 * span;
    const fade = pressureMap(W, H, (x, y) => {
        const i = y * W + x, g = gy[x], d = g - cy[x];
        const bottom = 1 - smoothstep(g - 10, g + 5, y) * (1 - white[i] * 0.4);
        const ends = smoothstep(0, 24, x) * (1 - smoothstep(shoreP + 2, W - 1, x));
        const thin = 0.45 + 0.55 * smoothstep(3, 28, d);
        const line = smoothstep(lineFrom - 24, lineFrom + 10, x) * (1 - smoothstep(1.5, 3.5, Math.abs(y - topY[x] - 0.7)));
        return Math.max(bottom * Math.min(1, thin + white[i] * 0.3), line) * ends;
    });
    // 5. pencil: the foam's outline as on the splash, then the sea's two pencils to the shore
    for (const c of contours(capM, W, H, { step: 2.5 })) {
        if (c.length < 4) continue;
        const pts = smooth(c, { closed: true, steps: 2 });
        const runs = [];
        let cur = [];
        for (const p of pts) { const f = fade[col(p[1]) * 0 + Math.min(H - 1, Math.max(0, Math.floor(p[1]))) * W + col(p[0])]; if (p[0] > lineFrom + 10 || f < 0.2) { if (cur.length > 2) runs.push(cur); cur = []; } else cur.push(p); }
        if (cur.length > 2) runs.push(cur);
        for (const run of runs) ink(S, run, { closed: false, color: P.foamLine, width: 1.9, pressure: 0.95, wobble: 0.5 });
    }
    const wl = crest.top.filter(([x]) => x >= lineFrom - 24 && x <= W + 2);
    ink(S, wl, { closed: false, color: P.foamLine, width: 2.6, pressure: 1, wobble: 0.5, passes: 2 });
    ink(S, wl.map(([x, y]) => [x, y + 1.5]), { closed: false, color: P.seaBlue, width: 2, pressure: 0.35, wobble: 0.8, passes: 1 });
    for (const q of patches) ink(S, q, { color: P.foamLine, width: 1.5, pressure: 0.9, wobble: 0.4 });
    return doneFade(S, fade);
});

// ---------------------------------------------------------------------------
// Kartväktaren's second note, sealed in a bottle on the seabed (props-sea): he
// could not bear to let paper get wet (docs/skoldhast/story-kartvaktaren.md).
// Appended last so no earlier prop's tooth roll (rollN) changes.
// ---------------------------------------------------------------------------
item('props-sea', 'note-bottle', [0.5, 1], () => {
    const W = 108, H = 50;
    const S = spriteSheet(W, H, 'note-bottle');
    const tilt = { x: 54, y: 30, rot: -0.1 };
    const glass = transform(roundRect(-44, -13, 64, 26, 12), tilt);
    const neck = transform([[18, -7], [36, -6], [38, -8], [42, -8], [42, 8], [38, 8], [36, 6], [18, 7]], tilt);
    const cork = transform(rect(41, -6, 9, 12), tilt);
    const gm = body(S, glass), nm = body(S, neck), cm = body(S, cork);
    soft(S, PP.mint, gm, { angle: -0.3, gap: 2.4, pressure: 0.45 });
    soft(S, PP.mint, nm, { angle: -0.3, gap: 2.4, pressure: 0.55 });
    pen(S, PP.mintDeep, rim(S, glass, gm, 0, -5), { angle: 0.3, gap: 2, pressure: 0.55 });
    paintWood(S, cork, cm, { base: P.wood, dark: P.woodDark, angle: Math.PI / 2, grain: 2 });
    // the rolled note inside, with miniature writing; reading it shows his full signature
    const note = transform(rect(-34, -7, 44, 13), tilt);
    const noteM = body(S, note);
    soft(S, P.paperCream, noteM, { angle: -0.2, pressure: 0.9 });
    const sc = [];
    for (let k = 0; k < 2; k++) sc.push({ pts: transform([[-30, -3 + k * 5], [2 - k * 10, -3 + k * 5]], tilt), width: 1.1, alpha: 0.85 });
    sc.push({ pts: transform([[-2, 3], [1, -1], [3, 3], [5, -1]], tilt), width: 1.2, alpha: 0.9 });
    lines(S, P.graphite, sc, { pressure: 0.8 });
    ink(S, note, { width: 1.3, pressure: 0.7, passes: 1 });
    // the glass: a highlight, then the outline
    lines(S, '#ffffff', [{ pts: transform([[-36, -9], [10, -10]], tilt), width: 2.4, alpha: 0.85 }], { pressure: 0.9, grain: 0.2 });
    ink(S, glass, { color: PP.mintDeep, width: 2, pressure: 0.9 });
    ink(S, neck, { color: PP.mintDeep, width: 1.8, pressure: 0.9 });
    ink(S, cork, { width: 1.6, pressure: 0.85 });
    return done(S);
});
