/*
 * Sköldhästen — tiling materials, stroke textures and the paper overlay.
 *
 * Everything is drawn with the colored-pencil toolkit (pencil.mjs) on the same
 * white paper as Alva's drawing. This file also holds the small helper library
 * the scenery modules (backdrops.mjs, props.mjs) share:
 *   - periodic noise, so tiles repeat without seams;
 *   - tile-safe hatching (every stroke is drawn once per period, wrapped at the
 *     edges by the Sheet's tile mode);
 *   - a wrap-around burnish for tiles;
 *   - `finish`: turns a transparent sheet into a sprite. Paper inside the solid
 *     silhouette stays opaque, and pencil outside it becomes pigment with alpha
 *     (colour-to-alpha against the paper), so light strokes never leave a white
 *     halo over coloured backgrounds.
 *
 * Materials are 512×512 (scale 1: 1 px = 1 wu), strokes 256×24 (seamless
 * horizontally, the line through the middle), paper-tooth 256×256.
 */
import { createCanvas } from '@napi-rs/canvas';
import {
    Sheet, PENCILS as P, rng, hashSeed, rgb, mix, smooth, resample, ellipse, maskBounds, boxBlur, pressureMap
} from './pencil.mjs';

// ---------------------------------------------------------------------------
// Extra named pencils for the scenery (the box in pencil.mjs has the rest)
// ---------------------------------------------------------------------------
export const PX = {
    gull: '#4a6684',        // her blue-grey m-gull pencil
    gullSmudge: '#b9d2e6',  // the faint blue she rubbed under a gull
    sunDeep: '#efc53c',     // the harder-pressed yellow on the sun's lower half
    sunLine: '#b5a452',     // the thin olive line round her sun
    glassPale: '#e3eff6',   // frozen sea, palest
    tealLight: '#9fd0cf',   // sunlit water under the surface
    lilac: '#b7a3cf',       // backsippa fluff
    lilacDeep: '#7b6399',
    rose: '#e8a08e',        // evening sky near the horizon
    eveningGold: '#f7c75c',
    eveningLilac: '#b8b3d6',
    bayGrey: '#9fb1c0',     // Spegelviken's cool sky and stone
    bayDeep: '#56738c',
    deskWood: '#cc9a5e',    // the prologue's table
    deskWoodDark: '#8f5f35',
    iron: '#5d5a58',
    falu: '#a8392b',        // the beach hut red
    leaf: '#6f9a45'
};

// ---------------------------------------------------------------------------
// Small math helpers
// ---------------------------------------------------------------------------
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Periodic value noise: nx × ny cells across the sheet (tileable at w × h). */
export function pnoise(w, h, nx, ny, seed) {
    nx = Math.max(1, Math.round(nx)); ny = Math.max(1, Math.round(ny));
    const r = rng(seed >>> 0 || 1);
    const grid = new Float32Array(nx * ny);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    const out = new Float32Array(w * h);
    const cx = nx / w, cy = ny / h;
    const x0s = new Int32Array(w), x1s = new Int32Array(w), sxs = new Float32Array(w);
    for (let x = 0; x < w; x++) {
        const gx = x * cx, i0 = Math.floor(gx), f = gx - i0;
        x0s[x] = i0 % nx; x1s[x] = (i0 + 1) % nx; sxs[x] = f * f * (3 - 2 * f);
    }
    for (let y = 0; y < h; y++) {
        const gy = y * cy, j0 = Math.floor(gy), f = gy - j0, sy = f * f * (3 - 2 * f);
        const r0 = (j0 % ny) * nx, r1 = ((j0 + 1) % ny) * nx;
        const row = y * w;
        for (let x = 0; x < w; x++) {
            const a = grid[r0 + x0s[x]], b = grid[r0 + x1s[x]], c = grid[r1 + x0s[x]], d = grid[r1 + x1s[x]];
            const top = a + (b - a) * sxs[x], bot = c + (d - c) * sxs[x];
            out[row + x] = top + (bot - top) * sy;
        }
    }
    return out;
}

/** Fractal periodic noise, normalised to 0..1 and stretched to full contrast. */
export function fbm(w, h, seed, octaves = [[4, 4, 0.55], [9, 9, 0.3], [21, 21, 0.15]], contrast = 1) {
    const out = new Float32Array(w * h);
    let tw = 0;
    octaves.forEach(([nx, ny, wt], k) => {
        const n = pnoise(w, h, nx, ny, (seed * 31 + k * 977 + 3) >>> 0);
        for (let i = 0; i < out.length; i++) out[i] += n[i] * wt;
        tw += wt;
    });
    let lo = 1, hi = 0;
    for (let i = 0; i < out.length; i++) { out[i] /= tw; if (out[i] < lo) lo = out[i]; if (out[i] > hi) hi = out[i]; }
    const k = 1 / Math.max(1e-6, hi - lo);
    for (let i = 0; i < out.length; i++) out[i] = clamp01(0.5 + ((out[i] - lo) * k - 0.5) * contrast);
    return out;
}

/** Map a Float32Array in place (or into a new one). */
export function fmap(src, f) {
    const out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i++) out[i] = f(src[i], i);
    return out;
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------
/** A tileable sheet whose tooth (and paper mottle) repeat exactly at w × h. */
export function tileSheet(w, h, seed, { paper = true, paperColor = P.paper, tooth = 0.85, grain = 1.35 } = {}) {
    const S = new Sheet(w, h, { seed, paper, tile: true, tooth, grain, paperColor });
    const s = Math.max(0.5, grain);
    const n1 = pnoise(w, h, w / (1.6 * s), h / (1.6 * s), seed * 7 + 11);
    const n2 = pnoise(w, h, w / (3.8 * s), h / (3.8 * s), seed * 7 + 12);
    const n3 = pnoise(w, h, w / (11 * s), h / (11 * s), seed * 7 + 13);
    for (let i = 0; i < w * h; i++) {
        const t = 0.52 * n1[i] + 0.33 * n2[i] + 0.15 * n3[i];
        S.tooth[i] = clamp01(0.5 + (t - 0.5) * 1.9 * tooth);
    }
    const pc = rgb(paperColor);
    for (let i = 0; i < w * h; i++) {
        const m = paper ? 1 - 0.018 * (1 - n3[i]) - 0.01 * (1 - n2[i]) : 1;
        S.r[i] = pc[0] * m; S.g[i] = pc[1] * m; S.b[i] = pc[2] * m;
    }
    return S;
}

/** A transparent sprite sheet plus the solid (paper) silhouette accumulator. */
export function spriteSheet(w, h, name, opts = {}) {
    const S = new Sheet(Math.ceil(w), Math.ceil(h), { seed: hashSeed(name), paper: false, ...opts });
    S.solid = new Float32Array(S.w * S.h);
    return S;
}

/** Add a mask to the sprite's solid paper silhouette. */
export function addSolid(S, m, k = 1) {
    for (let i = 0; i < m.length; i++) { const v = m[i] * k; if (v > S.solid[i]) S.solid[i] = v; }
}
// ---------------------------------------------------------------------------
// Stroke drawing on a coverage context
// ---------------------------------------------------------------------------
export function qstroke(c, x0, y0, mx, my, x1, y1, width, alpha, taper = true) {
    c.lineWidth = width;
    if (taper) {
        c.globalAlpha = alpha * 0.45;
        c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke();
        const ax = x0 + (mx - x0) * 0.35, ay = y0 + (my - y0) * 0.35;
        const bx = x1 + (mx - x1) * 0.35, by = y1 + (my - y1) * 0.35;
        c.globalAlpha = alpha * 0.6;
        c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(mx, my, bx, by); c.stroke();
    } else {
        c.globalAlpha = alpha;
        c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke();
    }
}

export function polyline(c, pts, width, alpha) {
    if (pts.length < 2) return;
    c.lineWidth = width; c.globalAlpha = alpha;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
}

/**
 * Hatching in rows, safe for tiles: a stroke is kept only when its midpoint
 * lies inside the box, so on a tile sheet each stroke exists exactly once per
 * period and the Sheet's wrap copies carry it over the edges. Strokes are
 * generated before drawing, because Sheet.coverage() calls the draw callback
 * once per wrap offset.
 */
export function hatchT(S, color, {
    angle = 0, gap = 3, len = [18, 60], width = 1.4, jitter = 0.9, bow = 1.5, alpha = [0.55, 1],
    angleJitter = 0.05, taper = true, clip = null, pmap = null, pressure = 1, grain = 1, box = null,
    layers = 1, crossAngle = 0.5, opaque = false, keep = null
} = {}) {
    const rand = S.rand;
    let b = box || (clip ? maskBounds(clip, S.w, S.h) : [0, 0, S.w, S.h]);
    if (!b) return;
    if (!box && !S.tile) { const e = len[1] / 2 + 2; b = [b[0] - e, b[1] - e, b[2] + e, b[3] + e]; }
    const [bx0, by0, bx1, by1] = b;
    const list = [];
    for (let L = 0; L < layers; L++) {
        const ang = angle + L * crossAngle;
        const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
        const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
        const R = Math.hypot(bx1 - bx0, by1 - by0) / 2 + len[1];
        for (let o = -R; o <= R; o += gap * (0.75 + rand() * 0.5)) {
            let s = -R - rand() * len[1];
            while (s < R) {
                const l = len[0] + rand() * (len[1] - len[0]);
                const a2 = ang + (rand() - 0.5) * angleJitter * 2;
                const ddx = Math.cos(a2), ddy = Math.sin(a2);
                const o2 = o + (rand() - 0.5) * jitter * 2;
                const px = cx + nx * o2 + dx * s, py = cy + ny * o2 + dy * s;
                const qx = px + ddx * l, qy = py + ddy * l;
                const bw = (rand() - 0.5) * bow * 2;
                const al = alpha[0] + rand() * (alpha[1] - alpha[0]);
                const wv = width * (0.8 + rand() * 0.4);
                const mx = (px + qx) / 2, my = (py + qy) / 2;
                if (mx >= bx0 && mx < bx1 && my >= by0 && my < by1 && (!keep || keep(mx, my))) {
                    list.push([px, py, mx + nx * bw, my + ny * bw, qx, qy, wv, al]);
                }
                s += l + rand() * l * 0.35 - l * 0.2;
            }
        }
    }
    const cov = S.coverage((c) => { for (const k of list) qstroke(c, k[0], k[1], k[2], k[3], k[4], k[5], k[6], k[7], taper); });
    S.deposit(color, cov, { pressure, pmap, clip, grain, opaque });
}

/** Scattered short strokes (blades, flecks) with centres uniform in the box. */
export function scatterT(S, color, {
    count = 500, angle = -Math.PI / 2, angleJitter = 0.3, len = [6, 18], width = 1.2, bow = 1.2,
    alpha = [0.5, 1], clip = null, pmap = null, pressure = 1, grain = 1, box = null, taper = true, where = null
} = {}) {
    const rand = S.rand;
    const [bx0, by0, bx1, by1] = box || [0, 0, S.w, S.h];
    const list = [];
    let tries = 0;
    while (list.length < count && tries < count * 20) {
        tries++;
        const mx = bx0 + rand() * (bx1 - bx0), my = by0 + rand() * (by1 - by0);
        if (where && rand() > where(mx, my)) continue;
        const a = angle + (rand() - 0.5) * 2 * angleJitter;
        const l = len[0] + rand() * (len[1] - len[0]);
        const dx = Math.cos(a) * l / 2, dy = Math.sin(a) * l / 2;
        const bw = (rand() - 0.5) * bow * 2;
        list.push([mx - dx, my - dy, mx - Math.sin(a) * bw, my + Math.cos(a) * bw, mx + dx, my + dy,
            width * (0.8 + rand() * 0.4), alpha[0] + rand() * (alpha[1] - alpha[0])]);
    }
    const cov = S.coverage((c) => { for (const k of list) qstroke(c, k[0], k[1], k[2], k[3], k[4], k[5], k[6], k[7], taper); });
    S.deposit(color, cov, { pressure, pmap, clip, grain });
}

/** Precomputed-randomness helpers for tile sheets (the toolkit's own draw per wrap copy). */
export function strokesT(S, color, list, { pressure = 1, grain = 0.8, clip = null, pmap = null, taper = true } = {}) {
    // list: [x0, y0, mx, my, x1, y1, width, alpha]
    const cov = S.coverage((c) => { for (const k of list) qstroke(c, k[0], k[1], k[2], k[3], k[4], k[5], k[6], k[7], taper); });
    S.deposit(color, cov, { pressure, grain, clip, pmap });
}
export function linesT(S, color, lines, { pressure = 1, grain = 0.8, clip = null, pmap = null, cap = 'round' } = {}) {
    // lines: [{ pts, width, alpha }]
    const cov = S.coverage((c) => { c.lineCap = cap; for (const l of lines) polyline(c, l.pts, l.width, l.alpha); });
    S.deposit(color, cov, { pressure, grain, clip, pmap });
}
export function dotsT(S, color, pts, { rx = 1, ry = 0.8, alpha = 0.8, pressure = 1, grain = 0.8, clip = null } = {}) {
    const r = S.rand;
    const list = pts.map(([x, y, s = 1, a = null]) => [x, y, rx * s * (0.8 + r() * 0.4), ry * s * (0.8 + r() * 0.4), a ?? r() * Math.PI]);
    const cov = S.coverage((c) => {
        c.globalAlpha = alpha;
        for (const [x, y, a, b, rot] of list) { c.beginPath(); c.ellipse(x, y, a, b, rot, 0, Math.PI * 2); c.fill(); }
    });
    S.deposit(color, cov, { pressure, grain, clip });
}
/** A filled ribbon along a polyline with a width profile (tapered pencil marks, letters, blades). */
export function ribbon(S, color, pts, {
    width = 3, profile = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.5),
    pressure = 1, grain = 0.8, clip = null, alpha = 1, rough = 0.12, step = 1.5, pmap = null
} = {}) {
    const q = resample(pts, step);
    if (q.length < 2) return;
    const n = q.length;
    const acc = [0];
    for (let i = 1; i < n; i++) acc.push(acc[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const total = acc[n - 1] || 1;
    const rand = S.rand;
    const ph = rand() * 10;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
        const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
        const t = acc[i] / total;
        const wv = width / 2 * profile(t) * (1 + rough * Math.sin(acc[i] * 0.21 + ph) * 0.8 + rough * (rand() - 0.5) * 0.6);
        L.push([q[i][0] - ty * wv, q[i][1] + tx * wv]);
        R.push([q[i][0] + ty * wv, q[i][1] - tx * wv]);
    }
    const poly = L.concat(R.reverse());
    const cov = S.coverage((c) => {
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = alpha;
        c.beginPath(); c.moveTo(poly[0][0], poly[0][1]);
        for (let i = 1; i < poly.length; i++) c.lineTo(poly[i][0], poly[i][1]);
        c.closePath(); c.fill();
    }, { additive: false });
    S.deposit(color, cov, { pressure, grain, clip, pmap });
}

/** Box blur that wraps around (tiles). */
export function blurWrap(src, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    const k = 2 * r + 1;
    for (let y = 0; y < h; y++) {
        const row = y * w;
        let acc = 0;
        for (let x = -r; x <= r; x++) acc += src[row + ((x % w) + w) % w];
        for (let x = 0; x < w; x++) {
            tmp[row + x] = acc / k;
            acc += src[row + (x + r + 1) % w] - src[row + ((x - r) % w + w) % w];
        }
    }
    for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let y = -r; y <= r; y++) acc += tmp[(((y % h) + h) % h) * w + x];
        for (let y = 0; y < h; y++) {
            out[y * w + x] = acc / k;
            acc += tmp[((y + r + 1) % h) * w + x] - tmp[(((y - r) % h) + h) % h * w + x];
        }
    }
    return out;
}

/** Burnish (blend) the pigment; wraps on tile sheets. */
export function burnishT(S, clip, radius = 2, amount = 0.6) {
    if (!S.tile) { S.burnish(clip, radius, amount); return; }
    const { w, h } = S;
    for (const ch of [S.r, S.g, S.b]) {
        const tmp = blurWrap(ch, w, h, radius);
        for (let i = 0; i < w * h; i++) {
            const k = clip ? clip[i] * amount : amount;
            if (k > 0) ch[i] = ch[i] * (1 - k) + tmp[i] * k;
        }
    }
}

/** White pencil / eraser: pull the colour back toward the paper where `cov` says. */
export function lighten(S, cov, { amount = 1, color = P.paper, grain = 0.5, clip = null, pmap = null } = {}) {
    const [cr, cg, cb] = rgb(color);
    for (let i = 0; i < S.w * S.h; i++) {
        let c = cov[i];
        if (c <= 0) continue;
        if (clip) c *= clip[i];
        if (pmap) c *= pmap[i];
        c *= amount;
        const t = S.tooth[i];
        let d = c * (1 - grain) + grain * clamp01((t - (1 - c * 1.1)) / 0.3 + 0.5) * c;
        d = clamp01(d);
        if (d <= 0) continue;
        S.r[i] += (cr - S.r[i]) * d; S.g[i] += (cg - S.g[i]) * d; S.b[i] += (cb - S.b[i]) * d;
    }
}

/**
 * Run `fn` with the sheet's tooth rolled by (dx, dy). Blended layers (skies,
 * washes) then catch different peaks instead of piling onto the same ones,
 * which would otherwise turn a light wash into dark specks.
 */
export function withTooth(S, dx, dy, fn) {
    const { w, h } = S;
    const orig = S.tooth;
    const t = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
        const sy = ((y + dy) % h + h) % h;
        for (let x = 0; x < w; x++) t[y * w + x] = orig[sy * w + (((x + dx) % w) + w) % w];
    }
    S.tooth = t;
    try { fn(); } finally { S.tooth = orig; }
}

/** Lines of dots along a path (dotted outlines). */
export function dotted(S, color, path, { spacing = 8, r = 1.8, closed = false, pressure = 1, jitter = 0.6 } = {}) {
    const base = closed ? [...path, path[0]] : path;
    const pts = resample(base, spacing).map(([x, y]) => [x + (S.rand() - 0.5) * jitter, y + (S.rand() - 0.5) * jitter, 0.85 + S.rand() * 0.3]);
    S.dots(color, pts, { rx: r, ry: r * 0.85, pressure, grain: 0.7 });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
/** Opaque sheet → canvas (materials, backdrops). */
export function toCanvasOpaque(S) {
    const cv = createCanvas(S.w, S.h);
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(S.w, S.h);
    const d = img.data;
    for (let i = 0, j = 0; i < S.w * S.h; i++, j += 4) {
        d[j] = c255(S.r[i]); d[j + 1] = c255(S.g[i]); d[j + 2] = c255(S.b[i]); d[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
}

/**
 * Transparent sheet → sprite canvas. Inside `S.solid` the pixel is paper with
 * pencil on it (opaque). Outside, the pencil becomes pigment with alpha: the
 * most transparent colour that looks the same on white paper.
 */
export function finish(S, { paper = P.paper, solid = S.solid, alphaGain = 1 } = {}) {
    const [pr, pg, pb] = rgb(paper);
    const cv = createCanvas(S.w, S.h);
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(S.w, S.h);
    const d = img.data;
    for (let i = 0, j = 0; i < S.w * S.h; i++, j += 4) {
        const m = solid ? Math.min(1, solid[i]) : 0;
        const R = S.r[i], G = S.g[i], B = S.b[i];
        const dr = Math.max(0, pr - R), dg = Math.max(0, pg - G), db = Math.max(0, pb - B);
        let ai = Math.max(dr / pr, dg / pg, db / pb);
        let ir = 0, ig = 0, ib = 0;
        if (ai > 1e-4) { ir = pr - dr / ai; ig = pg - dg / ai; ib = pb - db / ai; }
        ai = Math.min(1, ai * alphaGain);
        const A = m + (1 - m) * ai;
        if (A < 1 / 512) { d[j] = d[j + 1] = d[j + 2] = d[j + 3] = 0; continue; }
        d[j] = c255((m * R + (1 - m) * ai * ir) / A);
        d[j + 1] = c255((m * G + (1 - m) * ai * ig) / A);
        d[j + 2] = c255((m * B + (1 - m) * ai * ib) / A);
        d[j + 3] = c255(A * 255);
    }
    ctx.putImageData(img, 0, 0);
    return cv;
}

function c255(v) { return v < 0 ? 0 : v > 255 ? 255 : Math.round(v); }

// ---------------------------------------------------------------------------
// Materials (512 × 512, seamless)
// ---------------------------------------------------------------------------
const M = 512;

/** Random points in the tile (for flecks and grains). */
function scatterPts(seed, n, s0 = 0.6, s1 = 1.4) {
    const r = rng(seed);
    const out = [];
    for (let k = 0; k < n; k++) out.push([r() * M, r() * M, s0 + r() * (s1 - s0)]);
    return out;
}
/** Split a polyline into strokes of varying pressure, like a hand drawing a long line. */
function brokenLine(r, pts, { seg = [10, 40], gap = [0, 6], width = [1.1, 1.6], alpha = [0.3, 0.8] } = {}) {
    const out = [];
    let i = 0;
    while (i < pts.length - 1) {
        const n = seg[0] + Math.floor(r() * (seg[1] - seg[0]));
        out.push({ pts: pts.slice(i, i + n + 1), width: width[0] + r() * (width[1] - width[0]), alpha: alpha[0] + r() * (alpha[1] - alpha[0]) });
        i += n + gap[0] + Math.floor(r() * (gap[1] - gap[0] + 1));
    }
    return out;
}

function matSand() {
    // her sand: pale yellow ochre, strokes showing, brown shading in streaks
    const S = tileSheet(M, M, hashSeed('mat-sand'), { grain: 1.5 });
    const patch = fbm(M, M, 11, [[4, 4, 0.45], [8, 8, 0.35], [16, 16, 0.2]], 1.3);
    const streak = fbm(M, M, 12, [[3, 12, 0.6], [5, 24, 0.4]], 1.7);
    hatchT(S, mix(P.sand, P.paper, 0.5), { angle: -0.06, gap: 2.0, len: [40, 110], width: 2, pressure: 0.8, alpha: [0.55, 0.95], grain: 0.7 });
    hatchT(S, mix(P.sand, P.sunYellow, 0.45), { angle: 0.04, gap: 2.6, len: [40, 120], width: 2, pressure: 0.35, grain: 0.5 });
    hatchT(S, P.sand, { angle: -0.1, gap: 3, len: [24, 70], width: 1.8, pmap: fmap(patch, (v) => 0.22 + 0.4 * v), alpha: [0.6, 1], grain: 0.85 });
    hatchT(S, P.sand, { angle: 0.55, gap: 4.6, len: [12, 30], width: 1.4, pmap: fmap(patch, (v) => 0.08 + 0.3 * v), alpha: [0.4, 0.9] });
    hatchT(S, P.sandShade, { angle: -0.04, gap: 3.4, len: [24, 80], width: 1.6, angleJitter: 0.03, grain: 0.85,
        pmap: fmap(streak, (v, i) => smoothstep(0.6, 0.93, v) * (0.55 + 0.45 * patch[i]) * 0.62) });
    burnishT(S, null, 1, 0.35);
    dotsT(S, P.sandShadow, scatterPts(77, 320, 0.5, 1.1), { rx: 0.9, ry: 0.7, alpha: 0.5, grain: 0.5 });
    dotsT(S, P.sandShade, scatterPts(78, 120, 0.6, 1.1), { rx: 1.3, ry: 0.8, alpha: 0.5, grain: 0.5 });
    return S;
}

function matWetSand() {
    const S = tileSheet(M, M, hashSeed('mat-wetsand'), { grain: 1.5 });
    const patch = fbm(M, M, 21, [[4, 4, 0.5], [8, 8, 0.3], [16, 16, 0.2]], 1.2);
    const streak = fbm(M, M, 22, [[5, 22, 0.55], [9, 40, 0.45]], 1.8);
    hatchT(S, P.sand, { angle: -0.03, gap: 2.0, len: [50, 130], width: 2.1, pressure: 1, alpha: [0.6, 1], grain: 0.6 });
    hatchT(S, P.wetSand, { angle: -0.02, gap: 1.9, len: [50, 140], width: 2.1, pmap: fmap(patch, (v) => 0.57 + 0.16 * v), alpha: [0.6, 1], grain: 0.65 });
    hatchT(S, P.wetSand, { angle: 0.35, gap: 3.2, len: [20, 50], width: 1.5, pressure: 0.3 });
    burnishT(S, null, 2, 0.7);
    // a few long horizontal streaks: darker ones and paler ones
    hatchT(S, P.sandShadow, { angle: -0.01, angleJitter: 0.008, gap: 3.6, len: [60, 200], width: 1.5, grain: 0.8,
        pmap: fmap(streak, (v) => smoothstep(0.66, 0.92, v) * 0.42) });
    const r = rng(23);
    const pale = [];
    for (let k = 0; k < 10; k++) {
        const y = r() * M, x = r() * M, l = 80 + r() * 200;
        pale.push([x, y, x + l / 2, y + (r() - 0.5) * 3, x + l, y + (r() - 0.5) * 2, 2 + r() * 2.4, 0.85]);
    }
    const cov = S.coverage((c) => { for (const k of pale) qstroke(c, ...k, true); });
    lighten(S, cov, { amount: 0.42, grain: 0.3 });
    burnishT(S, null, 1, 0.25);
    return S;
}

function matGrass() {
    const S = tileSheet(M, M, hashSeed('mat-grass'), { grain: 1.4 });
    const patch = fbm(M, M, 31, [[4, 4, 0.5], [8, 8, 0.3], [16, 16, 0.2]], 1.3);
    // pale ochre and silver ground, strokes mostly upright
    hatchT(S, P.grassOchre, { angle: -1.35, gap: 2.2, len: [14, 34], width: 1.8, pressure: 0.8, alpha: [0.6, 1], grain: 0.75 });
    hatchT(S, P.grassSilver, { angle: -1.75, gap: 2.4, len: [12, 30], width: 1.7, grain: 0.8, pmap: fmap(patch, (v) => 0.45 + 0.45 * v) });
    burnishT(S, null, 1, 0.3);
    // short blades, combed a little to the right
    const blade = (color, count, pressure, len, width, bias = 0) => scatterT(S, color, {
        count, angle: -Math.PI / 2 + 0.2 + bias, angleJitter: 0.26, len, width, bow: 1.4, pressure, grain: 0.85,
        alpha: [0.55, 1], pmap: fmap(patch, (v) => 0.65 + 0.5 * v)
    });
    blade(P.grassSilver, 2600, 0.82, [10, 26], 1.5);
    blade(P.grassGreen, 1200, 0.7, [9, 22], 1.4, 0.05);
    blade(P.grassOchre, 1000, 0.85, [8, 20], 1.4, -0.1);
    blade(mix(P.grassGreen, P.kelpDark, 0.35), 320, 0.6, [7, 15], 1.25);
    return S;
}

function matEarth() {
    const S = tileSheet(M, M, hashSeed('mat-earth'), { grain: 1.45 });
    const patch = fbm(M, M, 41, [[4, 4, 0.5], [8, 8, 0.3], [16, 16, 0.2]], 1.2);
    const edges = [0, 58, 122, 176, 250, 318, 372, 440, 512];
    const wav = (x, k) => 3.5 * Math.sin((x / M) * Math.PI * 2 * 2 + k) + 2 * Math.sin((x / M) * Math.PI * 2 * 5 + k * 2.3);
    const layerTone = [0.55, 0.8, 0.62, 0.92, 0.5, 0.78, 0.66, 0.86];
    const band = new Float32Array(M * M);
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
        let k = 0;
        for (let j = 0; j < 8; j++) if (y >= edges[j] + wav(x, j) && y < edges[j + 1] + wav(x, j + 1)) k = j;
        band[y * M + x] = layerTone[k];
    }
    hatchT(S, mix(P.earth, P.sand, 0.45), { angle: -0.05, gap: 2.2, len: [30, 90], width: 1.9, pressure: 0.85, grain: 0.85 });
    hatchT(S, P.earth, { angle: -0.03, gap: 2.2, len: [30, 100], width: 1.8, grain: 0.85, pmap: fmap(band, (v, i) => v * (0.57 + 0.3 * patch[i])) });
    hatchT(S, P.earth, { angle: 0.5, gap: 3.6, len: [14, 36], width: 1.4, pmap: fmap(patch, (v) => 0.2 + 0.35 * v) });
    burnishT(S, null, 1, 0.35);
    const r = rng(43);
    const lines = [];
    for (let j = 0; j < 8; j++) {
        const pts = [];
        for (let x = -8; x <= M + 8; x += 4) pts.push([x, edges[j] + wav(x, j) + 1.5]);
        lines.push(...brokenLine(r, pts, { seg: [20, 60], gap: [0, 3], width: [1.3, 1.8], alpha: [0.5, 0.85] }));
    }
    for (let k = 0; k < 16; k++) {
        const j = Math.floor(r() * 8);
        const y0 = edges[j] + 10 + r() * Math.max(6, edges[j + 1] - edges[j] - 20);
        const x0 = r() * M, l = 60 + r() * 110, per = 22 + r() * 12, amp = 2.5 + r() * 2;
        const pts = [];
        for (let x = 0; x <= l; x += 2) pts.push([x0 + x, y0 + Math.sin((x / per) * Math.PI * 2) * amp + wav(x0 + x, j) * 0.8]);
        lines.push({ pts, width: 1.3, alpha: 0.5 + r() * 0.3 });
    }
    linesT(S, mix(P.woodDark, P.earth, 0.3), lines, { pressure: 0.52, grain: 0.8 });
    dotsT(S, P.woodDark, scatterPts(47, 240, 0.5, 1.3), { rx: 1.1, ry: 0.8, alpha: 0.5 });
    return S;
}

/** Periodic Voronoi facets: cell id, distance to the border, and the seeds. */
export function voronoiT(w, h, seed, n, { sx = 0.75, sy = 1 } = {}) {
    const r = rng(seed);
    const seeds = [];
    for (let k = 0; k < n; k++) seeds.push([r() * w, r() * h]);
    const id = new Int16Array(w * h), edge = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let d1 = 1e9, d2 = 1e9, k1 = 0;
        for (let k = 0; k < n; k++) {
            let dx = Math.abs(x - seeds[k][0]); dx = Math.min(dx, w - dx);
            let dy = Math.abs(y - seeds[k][1]); dy = Math.min(dy, h - dy);
            const d = Math.hypot(dx * sx, dy * sy);
            if (d < d1) { d2 = d1; d1 = d; k1 = k; } else if (d < d2) d2 = d;
        }
        id[y * w + x] = k1; edge[y * w + x] = d2 - d1;
    }
    return { id, edge, seeds };
}

function matRock() {
    const S = tileSheet(M, M, hashSeed('mat-rock'), { grain: 1.45 });
    const patch = fbm(M, M, 51, [[4, 4, 0.5], [8, 8, 0.3], [16, 16, 0.2]], 1.2);
    const brk = fbm(M, M, 54, [[6, 6, 0.6], [13, 13, 0.4]], 1.6);
    const { id, edge, seeds } = voronoiT(M, M, 52, 15, { sx: 0.72 });
    const r = rng(53);
    hatchT(S, mix(P.rock, P.paper, 0.3), { angle: -0.4, gap: 2.2, len: [16, 44], width: 1.8, pressure: 0.9, grain: 0.65 });
    const angles = [-0.8, -0.35, 0.3, 0.75, 1.2];
    seeds.forEach(([sx, sy], k) => {
        const m = fmap(id, (v, i) => (v === k ? smoothstep(0.3, 2.2, edge[i]) : 0));
        const a = angles[Math.floor(r() * angles.length)] + (r() - 0.5) * 0.25;
        const tone = 0.42 + r() * 0.62;
        // each facet: one dominant hatch direction, lit at the top, shaded toward its lower border
        const pm = pressureMap(M, M, (x, y) => {
            let dy = y - sy; if (dy > M / 2) dy -= M; if (dy < -M / 2) dy += M;
            return tone * (0.8 + 0.5 * smoothstep(-40, 50, dy)) * (0.8 + 0.35 * patch[y * M + x]);
        });
        hatchT(S, P.rock, { angle: a, gap: 2.2, len: [14, 46], width: 1.7, clip: m, pmap: pm, grain: 0.8 });
        if (tone > 0.7) hatchT(S, P.rockDark, { angle: a + 0.6, gap: 3, len: [10, 30], width: 1.4, clip: m, pressure: 0.35 + (tone - 0.7), grain: 0.9 });
    });
    // shadow just inside every border
    const rim = fmap(edge, (v) => Math.pow(1 - smoothstep(1, 11, v), 1.4));
    hatchT(S, P.rockDark, { angle: 0.9, gap: 2.2, len: [8, 20], width: 1.4, pmap: rim, pressure: 0.8, grain: 0.85 });
    burnishT(S, null, 1, 0.2);
    // cracks along the facet borders (broken here and there), plus a few hairlines
    const crack = fmap(edge, (v, i) => (1 - smoothstep(0.4, 2.1, v)) * smoothstep(0.25, 0.5, brk[i]));
    S.deposit(P.graphite, crack, { pressure: 0.85, grain: 0.55 });
    const hair = [];
    for (let k = 0; k < 12; k++) {
        let x = r() * M, y = r() * M, a = r() * Math.PI * 2;
        const pts = [[x, y]];
        const n = 4 + Math.floor(r() * 5);
        for (let s = 0; s < n; s++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * (6 + r() * 9); y += Math.sin(a) * (6 + r() * 9); pts.push([x, y]); }
        hair.push({ pts, width: 1.1, alpha: 0.8 });
    }
    linesT(S, P.graphite, hair, { pressure: 0.5, grain: 0.7 });
    burnishT(S, null, 1, 0.3);
    return S;
}

function matWood() {
    const S = tileSheet(M, M, hashSeed('mat-wood'), { grain: 1.4 });
    const r = rng(61);
    const grainN = fbm(M, M, 62, [[2, 16, 0.6], [5, 32, 0.4]], 1.4);
    hatchT(S, mix(P.wood, P.sand, 0.4), { angle: 0, angleJitter: 0.01, gap: 1.9, len: [60, 160], width: 1.9, pressure: 0.9, grain: 0.85 });
    const grainLines = [], seams = [], joints = [], nails = [];
    for (let k = 0; k < 8; k++) {
        const y0 = k * 64, y1 = y0 + 64;
        const board = S.mask([[-2, y0], [M + 2, y0], [M + 2, y1], [-2, y1]]);
        const tone = 0.55 + r() * 0.35;
        hatchT(S, P.wood, { angle: (r() - 0.5) * 0.01, angleJitter: 0.008, gap: 1.9, len: [80, 220], width: 1.9, clip: board, grain: 0.85,
            pmap: fmap(grainN, (v) => tone * (0.7 + 0.6 * v)) });
        const n = 7 + Math.floor(r() * 4);
        const ph = r() * 6, per = [1, 2, 3][Math.floor(r() * 3)];
        for (let g = 0; g < n; g++) {
            const yy = y0 + 5 + (g + r() * 0.6) * (54 / n);
            const pts = [];
            for (let x = -8; x <= M + 8; x += 4) pts.push([x, yy + Math.sin((x / M) * Math.PI * 2 * per + ph + g * 0.7) * 2.4 + Math.sin((x / M) * Math.PI * 2 * (per + 3) + g) * 0.8]);
            grainLines.push(...brokenLine(r, pts, { seg: [10, 40], gap: [0, 6], width: [1.1, 1.6], alpha: [0.35, 0.85] }));
        }
        if (r() < 0.55) {
            const kx = r() * M, ky = y0 + 18 + r() * 28;
            for (let q = 0; q < 3; q++) grainLines.push({ pts: ellipse(kx, ky, 4 + q * 4.5, 2 + q * 2.2, 24).concat([[kx + 4 + q * 4.5, ky]]), width: 1.2, alpha: 0.75 });
        }
        const sp = [];
        for (let x = -8; x <= M + 8; x += 8) sp.push([x, y0 + 0.8 + Math.sin((x / M) * Math.PI * 2 * 3 + k) * 0.4]);
        seams.push({ pts: sp, width: 2.3, alpha: 0.95 }, { pts: sp.map(([x, y]) => [x, y + 2.5]), width: 1.7, alpha: 0.35 });
        const jx = r() * M;
        joints.push({ pts: [[jx, y0 + 1], [jx + 0.6, y1 - 1]], width: 1.9, alpha: 0.9 });
        for (const ny of [y0 + 14, y1 - 14]) for (const nx of [jx - 7, jx + 7]) nails.push([nx, ny, 1]);
    }
    linesT(S, P.woodDark, grainLines, { pressure: 0.65, grain: 0.7 });
    linesT(S, P.graphite, seams.concat(joints), { pressure: 0.85, grain: 0.6, cap: 'butt' });
    dotsT(S, P.graphite, nails, { rx: 2, ry: 1.8, alpha: 0.95, grain: 0.4 });
    burnishT(S, null, 1, 0.4);
    return S;
}

function matSeabed() {
    const S = tileSheet(M, M, hashSeed('mat-seabed'), { grain: 1.45 });
    const patch = fbm(M, M, 71, [[4, 4, 0.5], [8, 8, 0.3], [16, 16, 0.2]], 1.3);
    hatchT(S, P.seabed, { angle: -0.1, gap: 1.9, len: [22, 64], width: 2, grain: 0.55, pmap: fmap(patch, (v) => 0.8 + 0.2 * v) });
    hatchT(S, P.seabed, { angle: 0.55, gap: 2.8, len: [12, 34], width: 1.6, pressure: 0.6, grain: 0.6 });
    hatchT(S, mix(P.deepTeal, P.skyBlue, 0.45), { angle: -0.05, gap: 2.6, len: [30, 90], width: 1.7, grain: 0.6, pmap: fmap(patch, (v) => 0.35 + 0.3 * (1 - v)) });
    burnishT(S, null, 1, 0.45);
    const r = rng(73);
    const rip = [];
    for (let k = 0; k < 22; k++) {
        const x0 = r() * M, y0 = r() * M, l = 40 + r() * 80;
        const pts = [];
        for (let x = 0; x <= l; x += 3) pts.push([x0 + x, y0 + Math.sin(x / l * Math.PI) * -3 + Math.sin(x * 0.2) * 0.6]);
        rip.push({ pts, width: 1.4, alpha: 0.6 });
    }
    linesT(S, mix(P.deepTeal, P.seabed, 0.4), rip, { pressure: 0.55 });
    dotsT(S, mix(P.rockDark, P.deepTeal, 0.3), scatterPts(74, 60, 0.8, 2.2), { rx: 2, ry: 1.3, alpha: 0.6, grain: 0.7 });
    dotsT(S, P.sandShadow, scatterPts(75, 380, 0.5, 1.1), { rx: 0.9, ry: 0.7, alpha: 0.5 });
    return S;
}

function matWater() {
    // drawn on paper like her sea; the alpha is a smooth veil (dense, a little see-through),
    // so the pencil texture lives in the colour and the tile stays light to download
    const S = tileSheet(M, M, hashSeed('mat-water'), { grain: 1.4 });
    const sl = fbm(M, M, 81, [[2, 48, 0.5], [3, 96, 0.3], [5, 170, 0.2]], 2.1);
    const gaps = fmap(sl, (v) => 1 - 0.8 * smoothstep(0.79, 0.95, v));
    hatchT(S, P.skyBlue, { angle: -0.012, angleJitter: 0.01, gap: 1.8, len: [40, 130], width: 2, pmap: gaps, pressure: 0.95, grain: 0.6 });
    hatchT(S, P.seaBlue, { angle: 0.008, angleJitter: 0.012, gap: 1.8, len: [30, 120], width: 1.9, grain: 0.6, pmap: fmap(gaps, (v, i) => v * (0.7 + 0.3 * sl[i])) });
    hatchT(S, P.seaBlue, { angle: -0.025, angleJitter: 0.015, gap: 2.6, len: [20, 70], width: 1.7, pmap: gaps, pressure: 0.5, grain: 0.6 });
    hatchT(S, P.seaDeep, { angle: 0.004, angleJitter: 0.01, gap: 4.2, len: [30, 100], width: 1.5, grain: 0.6, pmap: fmap(sl, (v) => 0.5 * (1 - v)) });
    burnishT(S, null, 1, 0.35);
    const pr = rgb(P.paper);
    const dens = new Float32Array(M * M);
    for (let i = 0; i < M * M; i++) dens[i] = clamp01(1 - (S.r[i] + S.g[i] + S.b[i]) / (pr[0] + pr[1] + pr[2]));
    const sm = blurWrap(blurWrap(dens, M, M, 3), M, M, 3);
    let lo = 1, hi = 0;
    for (const v of sm) { if (v < lo) lo = v; if (v > hi) hi = v; }
    S.waterAlpha = fmap(sm, (v) => 0.62 + 0.33 * clamp01((v - lo) / Math.max(1e-6, hi - lo)));
    return S;
}
function waterCanvas(S) {
    const cv = createCanvas(S.w, S.h);
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(S.w, S.h);
    const d = img.data;
    for (let i = 0, j = 0; i < S.w * S.h; i++, j += 4) {
        d[j] = c255(S.r[i]); d[j + 1] = c255(S.g[i]); d[j + 2] = c255(S.b[i]); d[j + 3] = c255(S.waterAlpha[i] * 255);
    }
    ctx.putImageData(img, 0, 0);
    return cv;
}

function matDeep() {
    // deep water volume: blue-teal, darker, soft blended strokes
    const S = tileSheet(M, M, hashSeed('mat-deep'), { grain: 1.6 });
    const patch = fbm(M, M, 91, [[2, 4, 0.5], [4, 9, 0.3], [8, 17, 0.2]], 1.2);
    hatchT(S, P.deepTeal, { angle: -0.05, gap: 1.9, len: [40, 120], width: 2.2, pressure: 0.95, grain: 0.35 });
    hatchT(S, P.seaDeep, { angle: 0.04, gap: 2.1, len: [40, 120], width: 2.1, pmap: fmap(patch, (v) => 0.45 + 0.4 * v), grain: 0.35 });
    hatchT(S, mix(P.kelpForest, P.deepTeal, 0.5), { angle: -0.35, gap: 3.2, len: [24, 60], width: 1.8, pressure: 0.35, grain: 0.4 });
    burnishT(S, null, 3, 0.6);
    hatchT(S, P.seaDeep, { angle: -0.02, gap: 5, len: [40, 120], width: 1.6, pmap: fmap(patch, (v) => 0.45 * v), grain: 0.45 });
    hatchT(S, mix(P.deepTeal, P.skyBlue, 0.4), { angle: 0.01, gap: 7, len: [60, 160], width: 2, pmap: fmap(patch, (v) => 0.3 * (1 - v)), grain: 0.4 });
    burnishT(S, null, 1, 0.35);
    return S;
}

function matGlass() {
    const S = tileSheet(M, M, hashSeed('mat-glass'), { grain: 1.5 });
    const band = fbm(M, M, 101, [[2, 8, 0.6], [3, 17, 0.4]], 1.6);
    hatchT(S, PX.glassPale, { angle: 0, angleJitter: 0.006, gap: 1.8, len: [120, 300], width: 2.1, pressure: 1, grain: 0.8 });
    hatchT(S, P.skyBlue, { angle: -0.012, angleJitter: 0.006, gap: 2.0, len: [120, 360], width: 1.9, pmap: fmap(band, (v) => 0.4 + 0.65 * v), grain: 0.75 });
    hatchT(S, P.skyBlue, { angle: 0.02, angleJitter: 0.006, gap: 3.5, len: [80, 220], width: 1.6, pressure: 0.45 });
    burnishT(S, null, 2, 0.55);
    const r = rng(103);
    const lines = [];
    for (let k = 0; k < 26; k++) {
        const y = r() * M, x = r() * M, l = 140 + r() * 320, sl = (r() - 0.5) * 3;
        lines.push([x, y, x + l / 2, y + sl, x + l, y + sl * 0.3, 1.1 + r() * 0.9, 0.55 + r() * 0.4]);
    }
    strokesT(S, P.seaBlue, lines, { pressure: 0.75, grain: 0.6 });
    const hi = [];
    for (let k = 0; k < 16; k++) {
        const y = r() * M, x = r() * M, l = 90 + r() * 260;
        hi.push([x, y, x + l / 2, y - 0.5, x + l, y, 2.2 + r() * 2.8, 0.95]);
    }
    for (let k = 0; k < 20; k++) {
        const y = r() * M, x = r() * M, l = 10 + r() * 22;
        hi.push([x, y, x + l * 0.5, y - l * 0.18, x + l, y - l * 0.35, 1.5, 0.9]);
    }
    const cov = S.coverage((c) => { for (const k of hi) qstroke(c, ...k, true); });
    lighten(S, cov, { amount: 0.95, grain: 0.15 });
    return S;
}

function toothShade(S, k = 0.05, fine = 0) {
    const soft = blurWrap(S.tooth, S.w, S.h, 1);
    // `fine` keeps only the small-scale grain (no cloudy mottle): tooth minus its local average
    const avg = fine ? blurWrap(blurWrap(S.tooth, S.w, S.h, 4), S.w, S.h, 4) : null;
    for (let i = 0; i < S.w * S.h; i++) {
        const t = fine ? clamp01(0.55 + (soft[i] - avg[i]) * 1.6) : soft[i];
        const v = 1 - k * Math.pow(clamp01(1 - t * 1.15), 1.4) * 1.6;
        S.r[i] *= v; S.g[i] *= v; S.b[i] *= v;
    }
}

function matPaper() {
    const S = tileSheet(M, M, hashSeed('mat-paper'), { grain: 1.5 });
    // undo the sheet's cloudy mottle, keep a fine even tooth
    const pc = rgb(P.paper);
    for (let i = 0; i < M * M; i++) { S.r[i] = pc[0]; S.g[i] = pc[1]; S.b[i] = pc[2]; }
    toothShade(S, 0.055, 1);
    return S;
}

function matCream() {
    const S = tileSheet(M, M, hashSeed('mat-cream'), { grain: 1.5, paperColor: P.paperCream });
    const pc = rgb(P.paperCream);
    for (let i = 0; i < M * M; i++) { S.r[i] = pc[0]; S.g[i] = pc[1]; S.b[i] = pc[2]; }
    toothShade(S, 0.055, 1);
    // faint fold creases: one level, one upright, one diagonal (each wraps exactly)
    const creases = [[[-20, 173], [M + 20, 173]], [[331, -20], [331, M + 20]], [[-40, 57], [M + 40, M + 137]]];
    const band = (off, w, a) => S.coverage((c) => {
        c.lineCap = 'butt';
        for (const [[x0, y0], [x1, y1]] of creases) {
            const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
            c.lineWidth = w; c.globalAlpha = a;
            c.beginPath(); c.moveTo(x0 + nx * off, y0 + ny * off); c.lineTo(x1 + nx * off, y1 + ny * off); c.stroke();
        }
    }, { additive: false });
    S.deposit(mix(P.paperCream, P.graphiteSoft, 0.45), blurWrap(band(3.5, 6, 0.4), M, M, 2), { pressure: 0.4, grain: 0.3 });
    S.deposit(P.graphiteSoft, band(0, 1, 0.8), { pressure: 0.4, grain: 0.5 });
    lighten(S, band(-2.5, 2, 1), { amount: 0.6, grain: 0.1, color: '#fffdf6' });
    return S;
}

function paperTooth() {
    const W = 256;
    const S = tileSheet(W, W, hashSeed('paper-tooth'), { grain: 1.3 });
    const fib = pnoise(W, W, 64, 16, 991);
    const soft = blurWrap(S.tooth, W, W, 1);
    const cv = createCanvas(W, W);
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(W, W);
    const d = img.data;
    for (let i = 0, j = 0; i < W * W; i++, j += 4) {
        const t = 0.7 * S.tooth[i] + 0.3 * soft[i];
        const valley = clamp01((0.62 - t) / 0.62);
        const v = c255(255 - 34 * Math.pow(valley, 1.25) - 5 * (1 - fib[i]));
        d[j] = d[j + 1] = d[j + 2] = v; d[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
}

function deskWood() {
    const S = tileSheet(M, M, hashSeed('desk-wood'), { grain: 1.6 });
    const grainN = fbm(M, M, 111, [[2, 12, 0.55], [3, 26, 0.3], [6, 48, 0.15]], 1.5);
    hatchT(S, mix(PX.deskWood, P.paper, 0.35), { angle: 0, angleJitter: 0.008, gap: 1.8, len: [80, 220], width: 2.1, pressure: 1, grain: 0.5 });
    hatchT(S, PX.deskWood, { angle: 0, angleJitter: 0.006, gap: 1.9, len: [100, 260], width: 2.1, grain: 0.6, pmap: fmap(grainN, (v) => 0.45 + 0.5 * v) });
    const r = rng(113);
    const gl = [];
    for (let g = 0; g < 46; g++) {
        const y0 = r() * M, per = 1 + Math.floor(r() * 2), ph = r() * 6, amp = 2 + r() * 5;
        const pts = [];
        for (let x = -8; x <= M + 8; x += 4) pts.push([x, y0 + Math.sin((x / M) * Math.PI * 2 * per + ph) * amp + Math.sin((x / M) * Math.PI * 2 * 4 + g) * 0.8]);
        gl.push(...brokenLine(r, pts, { seg: [12, 52], gap: [0, 10], width: [1.2, 2], alpha: [0.25, 0.7] }));
    }
    linesT(S, PX.deskWoodDark, gl, { pressure: 0.55, grain: 0.6 });
    burnishT(S, null, 2, 0.65);
    return S;
}

// ---------------------------------------------------------------------------
// Stroke textures (256 × 24, seamless horizontally; transparent)
// ---------------------------------------------------------------------------
const SW = 256, SH = 24, MID = 12;

function strokeSheet(name) {
    const S = tileSheet(SW, SH, hashSeed(name), { paper: false, grain: 1.2 });
    S.solid = new Float32Array(SW * SH);
    return S;
}

/** Overlapping hand strokes along the middle line (each drawn once per period). */
function handLine(S, color, { width = 2.4, wobble = 0.5, pressure = 0.9, segs = [30, 70], y = MID, grain = 0.75, alphaR = [0.7, 1] } = {}) {
    const r = S.rand;
    const list = [];
    for (let pass = 0; pass < 2; pass++) {
        let x = r() * 20;
        const end = x + SW;
        while (x < end) {
            const l = segs[0] + r() * (segs[1] - segs[0]);
            const yy = y + (r() - 0.5) * wobble * 2;
            const x0 = x - 4, x1 = x + l;
            const wv = width * (pass ? 0.7 : 1) * (0.85 + r() * 0.3);
            list.push([x0, yy, (x0 + x1) / 2, yy + (r() - 0.5) * wobble, x1, yy + (r() - 0.5) * wobble, wv, (pass ? 0.5 : 1) * (alphaR[0] + r() * (alphaR[1] - alphaR[0]))]);
            x += l * (0.72 + r() * 0.1);
        }
    }
    strokesT(S, color, list, { pressure, grain });
}

function strokeGraphite() {
    const S = strokeSheet('stroke-graphite');
    handLine(S, P.graphite, { width: 2.8, wobble: 0.45, pressure: 1 });
    return S;
}
function strokeBlue() {
    const S = strokeSheet('stroke-blue');
    handLine(S, P.foamLine, { width: 3, wobble: 0.5, pressure: 1 });
    handLine(S, P.seaBlue, { width: 2, wobble: 0.8, pressure: 0.35, y: MID + 1.5 });
    return S;
}
function dashes(S, color, { width = 2.6, pressure = 1 } = {}) {
    const n = 9, period = SW / n, on = period - 10;
    const r = S.rand;
    const list = [];
    for (let k = 0; k < n; k++) {
        const x0 = k * period + 1.5 + width / 2, x1 = x0 + on - width;
        const yy = MID + (r() - 0.5) * 0.8;
        list.push([x0, yy, (x0 + x1) / 2, yy + (r() - 0.5) * 0.8, x1, yy + (r() - 0.5) * 0.6, width * (0.9 + r() * 0.2), 1]);
    }
    const cov = S.coverage((c) => {
        c.lineCap = 'round';
        for (const k of list) {
            qstroke(c, ...k, true);
            qstroke(c, k[0] + 1, k[1] + 0.3, k[2], k[3] + 0.3, k[4] - 1, k[5] + 0.2, k[6] * 0.7, 0.8, false);
        }
    });
    S.deposit(color, cov, { pressure, grain: 0.7 });
}
function strokeDash() { const S = strokeSheet('stroke-dash'); dashes(S, P.graphite, { width: 2.8 }); return S; }
function strokeDashBlue() { const S = strokeSheet('stroke-dashblue'); dashes(S, P.foamLine, { width: 3 }); return S; }

function strokeGlow() {
    const S = strokeSheet('stroke-glow');
    for (let y = 0; y < SH; y++) {
        const d = Math.abs(y + 0.5 - MID);
        const a = 0.8 * Math.pow(clamp01(1 - d / 11.5), 1.6);
        for (let x = 0; x < SW; x++) S.solid[y * SW + x] = a;
    }
    const fall = new Float32Array(SW * SH);
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) fall[y * SW + x] = Math.pow(clamp01(1 - Math.abs(y + 0.5 - MID) / 11), 1.3);
    hatchT(S, P.sunGlow, { angle: 0.9, gap: 2.2, len: [8, 16], width: 1.5, pmap: fall, pressure: 1 });
    hatchT(S, PX.eveningGold, { angle: -0.9, gap: 2.8, len: [6, 12], width: 1.3, pmap: fmap(fall, (v) => v * v), pressure: 0.6 });
    handLine(S, P.sunYellow, { width: 3.4, wobble: 0.3, pressure: 0.9 });
    return S;
}

function strokeChain() {
    const S = strokeSheet('stroke-chain');
    const n = 24, pitch = SW / n;
    const cov = S.coverage((c) => {
        c.lineCap = 'round';
        for (let k = 0; k < n; k++) {
            const x = k * pitch + pitch / 2;
            c.globalAlpha = 0.95;
            if (k % 2 === 0) {
                // a flat link: an oval ring
                c.lineWidth = 1.7;
                c.beginPath(); c.ellipse(x, MID, 6.6, 4.3, 0, 0, Math.PI * 2); c.stroke();
            } else {
                // an edge-on link threading through its neighbours
                c.lineWidth = 1.5;
                c.beginPath(); c.ellipse(x, MID, 6.4, 1.3, 0, 0, Math.PI * 2); c.stroke();
            }
        }
    });
    S.deposit(P.graphite, cov, { pressure: 0.95, grain: 0.6 });
    return S;
}

function strokeCrease() {
    const S = strokeSheet('stroke-crease');
    for (let y = MID - 3; y < MID; y++) for (let x = 0; x < SW; x++) S.solid[y * SW + x] = 0.22 * (1 - (MID - 1 - y) / 3);
    const sh = new Float32Array(SW * SH);
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
        const d = y + 0.5 - MID;
        sh[y * SW + x] = d > 0 ? Math.pow(clamp01(1 - d / 9), 1.8) * 0.75 : 0;
    }
    S.deposit(P.graphiteSoft, sh, { pressure: 0.55, grain: 0.35 });
    const ln = S.coverage((c) => {
        c.lineCap = 'butt';
        c.lineWidth = 1.3; c.globalAlpha = 1;
        c.beginPath(); c.moveTo(-4, MID); c.lineTo(SW + 4, MID); c.stroke();
    }, { additive: false });
    S.deposit(P.graphite, ln, { pressure: 0.95, grain: 0.35 });
    return S;
}

// ---------------------------------------------------------------------------
// Registry and build
// ---------------------------------------------------------------------------
export const MATERIALS = [
    { name: 'mat-sand', bundle: 'boot', draw: () => matSand() },
    { name: 'mat-wetsand', bundle: 'boot', draw: matWetSand },
    { name: 'mat-grass', bundle: 'land', draw: matGrass },
    { name: 'mat-earth', bundle: 'land', draw: matEarth },
    { name: 'mat-rock', bundle: 'boot', draw: matRock, quality: 66 },
    { name: 'mat-wood', bundle: 'boot', draw: matWood, quality: 66 },
    { name: 'mat-seabed', bundle: 'sea', draw: matSeabed },
    { name: 'mat-water', bundle: 'boot', draw: matWater, transparent: true, quality: 68 },
    { name: 'mat-deep', bundle: 'sea', draw: matDeep },
    { name: 'mat-glass', bundle: 'boot', draw: matGlass },
    { name: 'mat-paper', bundle: 'boot', draw: matPaper },
    { name: 'mat-cream', bundle: 'bay', draw: matCream },
    { name: 'paper-tooth', bundle: 'boot', draw: paperTooth, canvas: true },
    { name: 'desk-wood', bundle: 'boot', draw: deskWood }
];

export const STROKES = [
    { name: 'stroke-graphite', draw: strokeGraphite },
    { name: 'stroke-blue', draw: strokeBlue },
    { name: 'stroke-dash', draw: strokeDash },
    { name: 'stroke-dashblue', draw: strokeDashBlue },
    { name: 'stroke-glow', draw: strokeGlow },
    { name: 'stroke-chain', draw: strokeChain },
    { name: 'stroke-crease', draw: strokeCrease }
];

/** Render one material or stroke by name → canvas. */
export function renderMaterial(name) {
    const m = MATERIALS.find((x) => x.name === name);
    if (m) {
        const out = m.draw();
        if (m.canvas) return out;
        return m.transparent ? waterCanvas(out) : toCanvasOpaque(out);
    }
    const s = STROKES.find((x) => x.name === name);
    if (s) return finish(s.draw());
    throw new Error(`unknown material ${name}`);
}

export async function build(api) {
    for (const m of MATERIALS) api.image(m.name, renderMaterial(m.name), { bundle: m.bundle, repeat: true, quality: m.quality || 72 });
    for (const s of STROKES) api.image(s.name, renderMaterial(s.name), { bundle: 'boot', repeat: true, quality: 90 });
}
