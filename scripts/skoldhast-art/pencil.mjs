/*
 * Colored-pencil toolkit for "Sköldhästen och havet mellan sidorna".
 *
 * Everything in the game is drawn with these functions, so it all looks like
 * Alva's drawing: colored pencil on white paper, with the paper's tooth
 * showing through light strokes, directional hatching, and graphite contours.
 *
 * Model
 *   A Sheet holds an RGB "paper" image plus an alpha channel. Every drawing
 *   operation first renders a COVERAGE map (0..1, how hard the pencil pressed
 *   at each pixel) with @napi-rs/canvas, then deposits pigment:
 *     - the paper has a tooth height t(x, y) in 0..1 (seeded noise);
 *     - light coverage only reaches the peaks, heavy coverage fills the valleys
 *       (that is what makes pencil look grainy when light and smooth when hard);
 *     - pigment is applied multiplicatively (like layered colored pencil):
 *       rgb *= 1 - deposit * (1 - color).
 *   Sprites (transparent sheets) also accumulate alpha from a silhouette mask,
 *   so an object is "paper cut out along its outline, with pencil on it".
 *
 * Conventions
 *   - Units are texture pixels. Callers scale their shapes themselves.
 *   - Colors are '#rrggbb' strings or [r, g, b] 0..255.
 *   - Paths are arrays of [x, y] points; closed shapes repeat nothing.
 *   - Every sheet is seeded, so builds are reproducible.
 */
import { createCanvas } from '@napi-rs/canvas';

// ---------------------------------------------------------------------------
// Random numbers and noise
// ---------------------------------------------------------------------------
export function rng(seed = 1) {
    let a = (seed >>> 0) || 1;
    const next = () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.range = (lo, hi) => lo + (hi - lo) * next();
    next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
    next.pick = (arr) => arr[Math.floor(next() * arr.length)];
    next.gauss = () => {
        let u = 0, v = 0;
        while (u === 0) u = next();
        while (v === 0) v = next();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return next;
}

export function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}

/** Periodic value noise on a grid of `cells` (tileable when the sheet is `cells*cell` wide). */
function valueNoise(w, h, cell, rand, wrap) {
    const gw = Math.ceil(w / cell) + 1;
    const gh = Math.ceil(h / cell) + 1;
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    if (wrap) {
        const cw = Math.round(w / cell), ch = Math.round(h / cell);
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) grid[y * gw + x] = grid[(y % ch) * gw + (x % cw)];
    }
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
        const gy = y / cell, y0 = Math.floor(gy), fy = gy - y0, sy = fy * fy * (3 - 2 * fy);
        for (let x = 0; x < w; x++) {
            const gx = x / cell, x0 = Math.floor(gx), fx = gx - x0, sx = fx * fx * (3 - 2 * fx);
            const a = grid[y0 * gw + x0], b = grid[y0 * gw + x0 + 1];
            const c = grid[(y0 + 1) * gw + x0], d = grid[(y0 + 1) * gw + x0 + 1];
            out[y * w + x] = (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
export function rgb(c) {
    if (Array.isArray(c)) return c;
    const h = c.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
}

/**
 * Alva's pencil box: the named colors every asset uses. Picked by eye from her
 * drawing against its white paper. Keep additions few and named.
 */
export const PENCILS = {
    paper: '#fbf8f1',
    graphite: '#3b3530',
    graphiteSoft: '#6b635a',
    // sky and sea
    skyPale: '#cfe3f0',
    skyBlue: '#8fbfe0',
    seaBlue: '#3f86c6',
    seaDeep: '#1f5c9e',
    foamLine: '#244f8f',
    // sun
    sunYellow: '#f6dc5a',
    sunGlow: '#f8ec9c',
    // sand
    sand: '#e6c27a',
    sandShade: '#c99a52',
    sandShadow: '#9a6a3c',
    wetSand: '#b99462',
    // creature
    coat: '#efe6d4',
    coatShade: '#b8ada0',
    coatGrey: '#8f877e',
    muzzle: '#6e4230',
    muzzleDark: '#3d2419',
    halter: '#6b3f22',
    halterDark: '#4a2a16',
    mane: '#e0782a',
    maneLight: '#f2a24a',
    maneDark: '#9c4318',
    tail: '#d4562a',
    tailDeep: '#9e2f1c',
    tailPeach: '#f0a878',
    shellGreen: '#4f8f3a',
    shellDark: '#2f5e25',
    shellLight: '#9cc25a',
    shellRim: '#c9a64a',
    seam: '#e9e2b8',
    kelp: '#3e7a34',
    kelpDark: '#24501f',
    spot: '#4a5e4a',
    hoof: '#3f2c22',
    eye: '#1c1a18',
    // steppe
    grassSilver: '#a9b89a',
    grassGreen: '#7f9c6a',
    grassOchre: '#d8c38a',
    earth: '#b08a60',
    rock: '#a39b8f',
    rockDark: '#6d665e',
    // sea floor and kelp forest
    deepTeal: '#2c6f7a',
    kelpForest: '#2f6a3a',
    seabed: '#c7b58c',
    // lighthouse and paper world
    paperCream: '#f4ead2',
    inkBlue: '#2b4a78',
    wood: '#a0764a',
    woodDark: '#6b4a2c',
    red: '#c2412f',
    warmLight: '#ffd27a'
};

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------
export class Sheet {
    /**
     * @param {number} w
     * @param {number} h
     * @param {object} opts
     *   seed     - reproducible randomness
     *   paper    - true: opaque paper background; false: transparent sprite
     *   tile     - make the tooth noise tileable (for repeating materials)
     *   tooth    - tooth contrast (default 1)
     *   paperColor - background color (default PENCILS.paper)
     */
    constructor(w, h, { seed = 1, paper = true, tile = false, tooth = 0.85, paperColor = PENCILS.paper, grain = 1.35 } = {}) {
        this.w = w; this.h = h; this.tile = tile;
        this.rand = rng(seed);
        this.r = new Float32Array(w * h);
        this.g = new Float32Array(w * h);
        this.b = new Float32Array(w * h);
        this.a = new Float32Array(w * h);
        const pc = rgb(paperColor);
        this.r.fill(pc[0]); this.g.fill(pc[1]); this.b.fill(pc[2]);
        this.a.fill(paper ? 1 : 0);
        // tooth: fine grain + a coarser mottle + faint fibres
        const s = Math.max(0.5, grain);
        const n1 = valueNoise(w, h, 1.6 * s, rng(seed * 7 + 1), tile);
        const n2 = valueNoise(w, h, 3.8 * s, rng(seed * 7 + 2), tile);
        const n3 = valueNoise(w, h, 11 * s, rng(seed * 7 + 3), tile);
        this.tooth = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const t = 0.52 * n1[i] + 0.33 * n2[i] + 0.15 * n3[i];
            this.tooth[i] = Math.min(1, Math.max(0, 0.5 + (t - 0.5) * 1.9 * tooth));
        }
        // a faint paper mottle on opaque sheets
        if (paper) {
            for (let i = 0; i < w * h; i++) {
                const m = 1 - 0.018 * (1 - n3[i]) - 0.01 * (1 - n2[i]);
                this.r[i] *= m; this.g[i] *= m; this.b[i] *= m;
            }
        }
        this.scratch = createCanvas(w, h);
        this.sctx = this.scratch.getContext('2d');
    }

    // --- coverage helpers ---------------------------------------------------
    _begin() {
        const c = this.sctx;
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = 1;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, this.w, this.h);
        return c;
    }
    _read() {
        const d = this.sctx.getImageData(0, 0, this.w, this.h).data;
        const out = new Float32Array(this.w * this.h);
        for (let i = 0, j = 3; i < out.length; i++, j += 4) out[i] = d[j] / 255;
        return out;
    }
    /** Draw with a callback on the scratch canvas (white ink) and return the alpha as coverage. */
    coverage(draw, { additive = true } = {}) {
        const c = this._begin();
        c.strokeStyle = '#fff'; c.fillStyle = '#fff';
        c.lineCap = 'round'; c.lineJoin = 'round';
        if (additive) c.globalCompositeOperation = 'lighter';
        const wraps = this.tile ? [[0, 0], [-this.w, 0], [this.w, 0], [0, -this.h], [0, this.h],
            [-this.w, -this.h], [this.w, -this.h], [-this.w, this.h], [this.w, this.h]] : [[0, 0]];
        for (const [ox, oy] of wraps) {
            c.save(); c.translate(ox, oy); draw(c); c.restore();
        }
        return this._read();
    }
    /** A filled-path mask (0..1). `path` is points, or a function drawing a path on the context. */
    mask(path, { feather = 0, evenOdd = false } = {}) {
        const cov = this.coverage((c) => {
            c.globalCompositeOperation = 'source-over';
            if (feather) c.filter = `blur(${feather}px)`;
            c.beginPath();
            if (typeof path === 'function') path(c);
            else tracePath(c, path, true);
            c.fill(evenOdd ? 'evenodd' : 'nonzero');
            c.filter = 'none';
        }, { additive: false });
        return cov;
    }

    // --- pigment ------------------------------------------------------------
    /**
     * Deposit pigment of `color` where `cov` (0..1) says the pencil pressed.
     *   pressure  - overall multiplier
     *   pmap      - optional per-pixel pressure multiplier (Float32Array)
     *   clip      - optional mask (Float32Array) limiting where pigment lands
     *   grain     - how much the tooth shows (1 normal, 0 smooth like burnishing)
     *   opaque    - also raise alpha (for sprites): pigment makes the pixel exist
     */
    deposit(color, cov, { pressure = 1, pmap = null, clip = null, grain = 1, opaque = false, soft = 0.28 } = {}) {
        const [cr, cg, cb] = rgb(color);
        const fr = 1 - cr / 255, fg = 1 - cg / 255, fb = 1 - cb / 255;
        const n = this.w * this.h;
        for (let i = 0; i < n; i++) {
            let c = cov[i];
            if (c <= 0) continue;
            if (clip) { c *= clip[i]; if (c <= 0) continue; }
            if (pmap) c *= pmap[i];
            c *= pressure;
            if (c > 1) c = 1;
            // peaks first: pixel receives pigment when its tooth height exceeds 1 - c
            const t = this.tooth[i];
            const th = 1 - c * 1.08;
            let d = (t - th) / soft + 0.5;
            d = d < 0 ? 0 : d > 1 ? 1 : d;
            d = d * grain + c * (1 - grain);
            d *= 0.45 + 0.55 * c;
            if (d <= 0.002) continue;
            this.r[i] *= 1 - d * fr;
            this.g[i] *= 1 - d * fg;
            this.b[i] *= 1 - d * fb;
            if (opaque) this.a[i] = Math.max(this.a[i], Math.min(1, d * 1.6));
        }
    }

    /** Make the silhouette exist (sprites): paper inside `maskArr`, transparent outside. */
    cutout(maskArr) {
        const n = this.w * this.h;
        for (let i = 0; i < n; i++) this.a[i] = Math.max(this.a[i], maskArr[i]);
    }
    /** Remove everything outside `maskArr` (sprites). */
    clipAlpha(maskArr) {
        const n = this.w * this.h;
        for (let i = 0; i < n; i++) this.a[i] *= maskArr[i];
    }

    // --- drawing operations -------------------------------------------------
    /** Parallel hatching strokes at `angle` (radians) across the whole sheet or a clip. */
    hatch(color, {
        angle = 0, gap = 3, len = [18, 60], width = 1.4, jitter = 0.9, bow = 1.5, alpha = [0.55, 1],
        clip = null, pmap = null, pressure = 1, grain = 1, opaque = false, bounds = null, layers = 1,
        crossAngle = 0.5, angleJitter = 0.05, taper = true
    } = {}) {
        const rand = this.rand;
        const box = bounds || (clip ? maskBounds(clip, this.w, this.h) : [0, 0, this.w, this.h]);
        if (!box) return;
        const cov = this.coverage((c) => {
            for (let L = 0; L < layers; L++) {
                const ang = angle + L * crossAngle;
                const dx = Math.cos(ang), dy = Math.sin(ang);
                const nx = -dy, ny = dx;
                const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
                const R = Math.hypot(box[2] - box[0], box[3] - box[1]) / 2 + 8;
                for (let o = -R; o <= R; o += gap * (0.75 + rand() * 0.5)) {
                    let s = -R - rand() * len[1];
                    while (s < R) {
                        const l = len[0] + rand() * (len[1] - len[0]);
                        const a2 = ang + (rand() - 0.5) * angleJitter * 2;
                        const ddx = Math.cos(a2), ddy = Math.sin(a2);
                        const px = cx + nx * (o + (rand() - 0.5) * jitter * 2) + dx * s;
                        const py = cy + ny * (o + (rand() - 0.5) * jitter * 2) + dy * s;
                        const qx = px + ddx * l, qy = py + ddy * l;
                        const b = (rand() - 0.5) * bow * 2;
                        const mx = (px + qx) / 2 + nx * b, my = (py + qy) / 2 + ny * b;
                        const al = alpha[0] + rand() * (alpha[1] - alpha[0]);
                        strokeCurve(c, px, py, mx, my, qx, qy, width * (0.8 + rand() * 0.4), al, taper);
                        s += l + rand() * l * 0.35 - l * 0.2;
                    }
                }
            }
        });
        this.deposit(color, cov, { pressure, pmap, clip, grain, opaque });
    }

    /** Strokes that follow spines (hair, grass, kelp). Each spine is an array of [x, y]. */
    flow(color, spines, {
        count = 6, spread = 4, width = 1.4, alpha = [0.6, 1], clip = null, pmap = null, pressure = 1,
        grain = 1, opaque = false, startJitter = 0.15, lengthFrac = [0.5, 1], taper = true
    } = {}) {
        const rand = this.rand;
        const cov = this.coverage((c) => {
            for (const spine of spines) {
                if (spine.length < 2) continue;
                const pts = resample(spine, 24);
                for (let k = 0; k < count; k++) {
                    const off = (rand() - 0.5) * 2 * spread;
                    const t0 = rand() * startJitter;
                    const t1 = Math.min(1, t0 + lengthFrac[0] + rand() * (lengthFrac[1] - lengthFrac[0]));
                    const a = alpha[0] + rand() * (alpha[1] - alpha[0]);
                    const wv = width * (0.7 + rand() * 0.6);
                    drawOffsetStroke(c, pts, off, t0, t1, wv, a, taper, (rand() - 0.5) * spread * 0.6);
                }
            }
        });
        this.deposit(color, cov, { pressure, pmap, clip, grain, opaque });
    }

    /** A pencil contour along a path. */
    outline(color, path, {
        width = 1.6, closed = true, wobble = 0.8, alpha = 0.95, pressure = 1, passes = 2, grain = 0.8,
        opaque = true, clip = null, overshoot = 2, pmap = null
    } = {}) {
        const rand = this.rand;
        const cov = this.coverage((c) => {
            const base = closed ? [...path, path[0]] : path;
            const pts = resample(base, 3);
            for (let p = 0; p < passes; p++) {
                const ph = rand() * 100;
                const shaky = pts.map(([x, y], i) => [
                    x + Math.sin(i * 0.37 + ph) * wobble * 0.6 + (rand() - 0.5) * wobble * 0.5,
                    y + Math.cos(i * 0.29 + ph) * wobble * 0.6 + (rand() - 0.5) * wobble * 0.5
                ]);
                // split into strokes of varying pressure, like a hand going round a shape
                let i = 0;
                while (i < shaky.length - 1) {
                    const n = 8 + Math.floor(rand() * 18);
                    const seg = shaky.slice(Math.max(0, i - (i ? 1 : 0)), Math.min(shaky.length, i + n + 1));
                    if (seg.length >= 2) {
                        const a = alpha * (p === 0 ? 1 : 0.45) * (0.75 + rand() * 0.25);
                        const wv = width * (p === 0 ? 1 : 0.7) * (0.85 + rand() * 0.3);
                        polyStroke(c, seg, wv, a, overshoot * rand());
                    }
                    i += n;
                }
            }
        });
        this.deposit(color, cov, { pressure, pmap, clip, grain, opaque });
    }

    /** Small oval dots (spots, droplets, speckles). */
    dots(color, points, { rx = 3, ry = 2, angle = 0, alpha = 0.9, pressure = 1, clip = null, opaque = false, grain = 0.9 } = {}) {
        const rand = this.rand;
        const cov = this.coverage((c) => {
            for (const p of points) {
                c.save();
                c.translate(p[0], p[1]);
                c.rotate((p[3] ?? angle) + (rand() - 0.5) * 0.4);
                const s = p[2] ?? 1;
                c.globalAlpha = alpha;
                c.beginPath();
                c.ellipse(0, 0, rx * s * (0.8 + rand() * 0.4), ry * s * (0.8 + rand() * 0.4), 0, 0, Math.PI * 2);
                c.fill();
                c.restore();
            }
        });
        this.deposit(color, cov, { pressure, clip, grain, opaque });
    }

    /** A soft, even layer of color (scribbled densely) over a mask: base tones. */
    tone(color, clip, { pressure = 0.5, angle = -0.35, gap = 2.2, grain = 1, pmap = null, width = 1.8, len = [26, 70] } = {}) {
        this.hatch(color, { angle, gap, width, len, clip, pmap, pressure, grain, jitter: 1.2, bow: 2, alpha: [0.6, 1] });
    }

    /** Solid fill (no strokes), still grainy: for flat areas like paper-white interiors or dark hooves. */
    fill(color, clip, { pressure = 1, grain = 0.6, pmap = null, opaque = false } = {}) {
        this.deposit(color, clip, { pressure, grain, pmap, opaque });
    }

    /** Box-blur the pigment inside `clip` (a burnishing / blending pass). */
    burnish(clip, radius = 2, amount = 0.6) {
        const { w, h } = this;
        for (const ch of [this.r, this.g, this.b]) {
            const src = Float32Array.from(ch);
            const tmp = boxBlur(src, w, h, radius);
            for (let i = 0; i < w * h; i++) {
                const k = clip ? clip[i] * amount : amount;
                if (k > 0) ch[i] = ch[i] * (1 - k) + tmp[i] * k;
            }
        }
    }

    /** Export as an RGBA canvas. */
    toCanvas() {
        const cv = createCanvas(this.w, this.h);
        const ctx = cv.getContext('2d');
        const img = ctx.createImageData(this.w, this.h);
        const d = img.data;
        for (let i = 0, j = 0; i < this.w * this.h; i++, j += 4) {
            d[j] = clamp255(this.r[i]); d[j + 1] = clamp255(this.g[i]); d[j + 2] = clamp255(this.b[i]);
            d[j + 3] = clamp255(this.a[i] * 255);
        }
        ctx.putImageData(img, 0, 0);
        return cv;
    }
}

// ---------------------------------------------------------------------------
// Geometry helpers (exported: asset scripts use them to build shapes)
// ---------------------------------------------------------------------------
export function tracePath(c, pts, closed = true) {
    if (!pts.length) return;
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (closed) c.closePath();
}

/** Catmull-Rom smoothing of a control polygon; returns a denser point list. */
export function smooth(pts, { closed = true, steps = 8, tension = 0.5 } = {}) {
    const out = [];
    const n = pts.length;
    if (n < 3) return pts.slice();
    const get = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
        const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
        for (let s = 0; s < steps; s++) {
            const t = s / steps, t2 = t * t, t3 = t2 * t;
            const m1x = (p2[0] - p0[0]) * tension, m1y = (p2[1] - p0[1]) * tension;
            const m2x = (p3[0] - p1[0]) * tension, m2y = (p3[1] - p1[1]) * tension;
            const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
            out.push([h00 * p1[0] + h10 * m1x + h01 * p2[0] + h11 * m2x, h00 * p1[1] + h10 * m1y + h01 * p2[1] + h11 * m2y]);
        }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
}

/** Resample a polyline to points roughly `step` apart. */
export function resample(pts, step) {
    const out = [pts[0]];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const d = Math.hypot(x1 - x0, y1 - y0);
        if (d === 0) continue;
        let t = (step - acc) / d;
        while (t <= 1) {
            out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
            t += step / d;
        }
        acc = (acc + d) % step;
    }
    const lastP = pts[pts.length - 1];
    const o = out[out.length - 1];
    if (Math.hypot(o[0] - lastP[0], o[1] - lastP[1]) > 0.5) out.push(lastP);
    return out;
}

export function transform(pts, { x = 0, y = 0, sx = 1, sy = 1, rot = 0 } = {}) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return pts.map(([px, py]) => {
        const X = px * sx, Y = py * sy;
        return [x + X * c - Y * s, y + X * s + Y * c];
    });
}

export function ellipse(cx, cy, rx, ry, n = 40, rot = 0) {
    const out = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
        out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return out;
}

/** Bounding box [x0, y0, x1, y1] of the non-zero pixels of a mask. */
export function maskBounds(m, w, h) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) {
            if (m[row + x] > 0.01) {
                if (x < x0) x0 = x; if (x > x1) x1 = x;
                if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
        }
    }
    return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
}

/** Per-pixel pressure map from a function f(x, y) -> multiplier. */
export function pressureMap(w, h, f) {
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = f(x, y);
    return out;
}

/** Linear gradient pressure map from (x0, y0) → (x1, y1), values p0 → p1. */
export function gradientMap(w, h, x0, y0, x1, y1, p0, p1) {
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    return pressureMap(w, h, (x, y) => {
        let t = ((x - x0) * dx + (y - y0) * dy) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        return p0 + (p1 - p0) * t;
    });
}

/** A band just inside the edge of a mask (for rim shading). width in px. */
export function edgeBand(mask, w, h, width = 6) {
    const b = boxBlur(mask, w, h, Math.max(1, Math.round(width / 2)));
    const b2 = boxBlur(b, w, h, Math.max(1, Math.round(width / 2)));
    const out = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
        const v = mask[i] * Math.min(1, Math.max(0, (1 - b2[i]) * 2.2));
        out[i] = v;
    }
    return out;
}

export function multiplyMasks(a, b) {
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i];
    return out;
}
export function subtractMask(a, b) {
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = Math.max(0, a[i] - b[i]);
    return out;
}
export function unionMasks(...ms) {
    const out = new Float32Array(ms[0].length);
    for (const m of ms) for (let i = 0; i < out.length; i++) out[i] = Math.max(out[i], m[i]);
    return out;
}

function boxBlur(src, w, h, r) {
    const tmp = new Float32Array(w * h);
    const out = new Float32Array(w * h);
    const k = 2 * r + 1;
    for (let y = 0; y < h; y++) {
        let acc = 0;
        const row = y * w;
        for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x++) {
            tmp[row + x] = acc / k;
            acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
        }
    }
    for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) {
            out[y * w + x] = acc / k;
            acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
        }
    }
    return out;
}
export { boxBlur };

// --- low-level stroke drawing on the scratch context ------------------------
function strokeCurve(c, x0, y0, mx, my, x1, y1, width, alpha, taper) {
    c.lineWidth = width;
    if (taper) {
        c.globalAlpha = alpha * 0.45;
        c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke();
        // a firmer middle
        const ax = x0 + (mx - x0) * 0.35, ay = y0 + (my - y0) * 0.35;
        const bx = x1 + (mx - x1) * 0.35, by = y1 + (my - y1) * 0.35;
        c.globalAlpha = alpha * 0.6;
        c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(mx, my, bx, by); c.stroke();
    } else {
        c.globalAlpha = alpha;
        c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke();
    }
}

function polyStroke(c, pts, width, alpha, overshoot) {
    c.lineWidth = width;
    c.globalAlpha = alpha;
    c.beginPath();
    let [x0, y0] = pts[0];
    if (overshoot > 0.3 && pts.length > 1) {
        const [x1, y1] = pts[1];
        const d = Math.hypot(x1 - x0, y1 - y0) || 1;
        x0 -= (x1 - x0) / d * overshoot; y0 -= (y1 - y0) / d * overshoot;
    }
    c.moveTo(x0, y0);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
}

function drawOffsetStroke(c, pts, off, t0, t1, width, alpha, taper, drift) {
    const n = pts.length;
    const i0 = Math.floor(t0 * (n - 1)), i1 = Math.max(i0 + 1, Math.floor(t1 * (n - 1)));
    const out = [];
    for (let i = i0; i <= i1 && i < n; i++) {
        const p = pts[i];
        const q = pts[Math.min(n - 1, i + 1)], r = pts[Math.max(0, i - 1)];
        let tx = q[0] - r[0], ty = q[1] - r[1];
        const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
        const u = (i - i0) / Math.max(1, i1 - i0);
        const o = off + drift * u;
        out.push([p[0] - ty * o, p[1] + tx * o]);
    }
    if (out.length < 2) return;
    if (!taper) { polyStroke(c, out, width, alpha, 0); return; }
    // taper: draw thinner, fainter ends
    const m = out.length;
    const a = Math.floor(m * 0.2), b = Math.ceil(m * 0.8);
    polyStroke(c, out, width * 0.6, alpha * 0.5, 0);
    polyStroke(c, out.slice(a, Math.max(a + 2, b)), width, alpha * 0.75, 0);
}

function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : Math.round(v); }
