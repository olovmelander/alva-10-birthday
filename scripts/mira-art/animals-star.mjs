/*
 * Stjärnön – the magical last island under a starry night sky.
 *
 * Animals (sheet 'animals-star') and props (sheet 'props-star'). Everything
 * glows a little: aurora stripes, crystals, Lumas. Glow pixels (sparkles,
 * halos) are registered in GLOW so the automatic outline leaves them alone
 * and they read as light rather than as solid things.
 */
import { Sprite, ramp, mix, alpha, rgba, toHex } from './kit.mjs';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const GLOW = new Set();
/**
 * Mark a colour as light: the outline pass will not outline it. The colour
 * gets an invisible 1-bit tag (odd red, even green, odd blue) so it can never
 * collide with an ordinary body colour such as a white tail.
 */
function lit(c) {
    const [r, g, b, a] = rgba(c);
    const t = [r | 1, g & 254, b | 1, a];
    GLOW.add(`${t[0]},${t[1]},${t[2]}`);
    return toHex(t);
}
const outlineOptions = { skip: (r, g, b) => GLOW.has(`${r},${g},${b}`) };

/** Paint only where something is already drawn. */
function over(s, draw) {
    const proto = Object.getPrototypeOf(s).px;
    s.px = function px(x, y, c) {
        if (this.opaque(Math.round(x), Math.round(y))) proto.call(this, x, y, c);
        return this;
    };
    try { draw(); } finally { delete s.px; }
}

/** Filled disc with a float centre. */
function disc(s, cx, cy, r, c) {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y += 1) {
        for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x += 1) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            if (dx * dx + dy * dy <= r * r) s.px(x, y, c);
        }
    }
}

function bez(p, t) {
    const [p0, p1, p2, p3] = p;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/** A round tube along a cubic bezier; col(t) gives the colour at t. */
function tube(s, p, r0, r1, col, steps = 48) {
    for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const [x, y] = bez(p, t);
        disc(s, x, y, r0 + (r1 - r0) * t, col(t));
    }
}

/**
 * Rim shading for compound shapes drawn in one flat colour: light along the
 * top edge, shade along the bottom and right edges. Only touches pixels that
 * still have the flat base colour.
 */
function rimShade(s, R, { top = 1, bottom = 2, right = 1, deep = true, only = null } = {}) {
    const base = rgba(R.b).join(',');
    const op = (x, y) => s.opaque(x, y);
    const todo = [];
    for (let y = 0; y < s.h; y += 1) {
        for (let x = 0; x < s.w; x += 1) {
            if (!op(x, y) || s.get(x, y).join(',') !== base) continue;
            if (only && !only(x, y)) continue;
            let up = 1;
            while (up <= 3 && op(x, y - up)) up += 1;
            let dn = 1;
            while (dn <= 3 && op(x, y + dn)) dn += 1;
            let rt = 1;
            while (rt <= 2 && op(x + rt, y)) rt += 1;
            let c = null;
            if (dn <= bottom) c = deep && dn === 1 && bottom > 1 ? R.d2 || R.d1 : R.d1;
            else if (rt <= right) c = R.d1;
            else if (up <= top) c = R.l1;
            if (c) todo.push([x, y, c]);
        }
    }
    for (const [x, y, c] of todo) s.px(x, y, c);
}

/**
 * Translucent halo around the silhouette, `dist` steps (Manhattan) out, so
 * it sits just outside the automatic outline.
 */
function halo(s, color, a, dists = [2]) {
    const c = lit(alpha(color, a));
    const w = s.w;
    const h = s.h;
    const op = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) op[y * w + x] = s.get(x, y)[3] > 40 ? 1 : 0;
    const maxD = Math.max(...dists);
    const todo = [];
    for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
            if (op[y * w + x]) continue;
            let best = 99;
            for (let dy = -maxD; dy <= maxD; dy += 1) {
                for (let dx = -maxD; dx <= maxD; dx += 1) {
                    const d = Math.abs(dx) + Math.abs(dy);
                    if (d >= best) continue;
                    const xx = x + dx;
                    const yy = y + dy;
                    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
                    if (op[yy * w + xx]) best = d;
                }
            }
            if (dists.includes(best)) todo.push([x, y]);
        }
    }
    for (const [x, y] of todo) s.px(x, y, c);
}

/** A little four-pointed sparkle. size 0: single pixel, 1: plus, 2: long plus. */
function sparkle(s, x, y, size = 1, core = '#fffbe8', arm = '#ffe36a') {
    s.px(x, y, lit(core));
    if (size >= 1) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.px(x + dx, y + dy, lit(arm));
    }
    if (size >= 2) {
        const faint = lit(alpha(arm, 0.55));
        for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) s.px(x + dx, y + dy, faint);
    }
}

// ===========================================================================
// STJÄRNTIGRARNA – Nova's mother and father
// ===========================================================================
const COAT = { b: '#f59a32', l1: '#ffc267', l2: '#ffe3a8', d1: '#d56d22', d2: '#a4481b' };   // Nova's coat
const FAR = { b: '#d9782a', l1: '#e88a34', d1: '#b85a22', d2: '#8e3f1c' };
const CREAM = { b: '#fff4e3', l1: '#fffbf4', d1: '#f0d3b8', d2: '#d8b196' };
const EYE_D = '#2a1a1a';
const NOSE = '#ff8a9a';
const NOSE_D = '#e0667e';
const MOUTH_D = '#9c3048';
const EAR_IN = '#ffb3a6';
const STAR = '#ffe36a';
const STAR_C = '#fff7c2';

// aurora: each stripe glows in one of three hues; glow 0 calm, 1 bright, 2 calling
const AUR_HUES = [
    ['#2a9d9a', '#4fe6cf', '#b8fff0'],     // teal: edge, core, hot
    ['#2f78c8', '#62c8ff', '#d4f6ff'],     // cyan
    ['#6446c0', '#b08cff', '#efe2ff']      // violet
];

/**
 * Mamma Stjärntiger: her colours and her build. Pappa (DAD, further down) is
 * drawn by the same functions with his own colours and a bigger build. Each
 * build number is an offset from Mamma's shape and is 0 for her, so her pixels
 * are exactly what they were before Pappa joined the family.
 */
const MUM = {
    coat: COAT,
    far: FAR,                                  // far-side legs
    cream: CREAM,
    hues: AUR_HUES,                            // stripe light per hue: [edge, core, hot]
    edge: ['#3b2c78', '#4d3aa0'],              // stripe edges, calm and bright
    spark: ['#ffe36a', '#9ff6ff'],             // tail-tip sparkle, calm and glowing
    aura: ['#b8a0ff', '#b08cff', '#8ff0ff'],   // halo: calm, bright, calling
    // build offsets in px, all 0 for Mamma
    x: 0,            // the whole tiger moves right
    len: 0,          // a longer back: shoulders, front legs and head move forward
    rise: 0,         // longer legs: the back sits higher
    hock: 0,         // higher hocks
    chest: 0,        // heavier shoulders and a deeper chest
    haunch: 0,       // rounder hindquarters
    leg: 0,          // thicker legs
    paw: 0,          // wider paws
    headAt: [0, 0],  // head position
    lie: { up: 0, reach: 0, headAt: [0, 0] },   // lying down: taller body, longer front legs
    tail: { r: [2.1, 1.5], fill: [1.6, 1.1], band: 1.3, tuft: 1.9 },
    // body stripes [x (from the x offset), y (from the back), shape, hue], standing and lying
    stripes: [[15, 1, 'hip', 2], [19, 2, 'dash', 2], [22, 2, 'flank', 1], [26, 3, 'dash', 1], [28, 2, 'rib', 0], [33, 1, 'shoulder', 0], [11, 8, 'short', 2]],
    lieStripes: [[21, 1, 'dash', 2], [24, 1, 'flank', 1], [29, 1, 'rib', 0], [34, -1, 'shoulder', 0]],
    // leg stripes [x, y, rows, hue]: near front and hind leg (y from B), lying thigh (from B) and paw (from G)
    legStripes: [[38, 14, [[0, 2], [0, 1]], 0], [12, 12, [[0, 2], [1, 1]], 2]],
    lieLegStripes: [[12, 4, [[0, 2], [1, 2], [2, 1]], 2], [16, 3, [[0, 2], [1, 2], [1, 1]], 1]],
    lieArmStripe: [45, -5, [[0, 1], [0, 1], [1, 1]], 0],
    head: {
        w: 19, h: 16,     // head oval
        cx: 9,            // face centre column (one more when turned to the right)
        face: 0,          // eyes, muzzle and mouth drop this far (a taller forehead)
        muzzle: 0,        // wider muzzle, each side
        eye: 0,           // eyes further apart, each side
        shine: [[5, 8, 0], [3, 3, 1]],
        // fluffy cheek ruffs [x, y, map]: c cream, d cream shade
        ruffs: [
            [-3, 7, ['...cc', '..ccc', '.cccc', 'ccccc', '.cccc', 'ccccd', '.cdd.']],
            [17, 7, ['cc...', 'ccc..', 'cccc.', 'ccccc', 'cccc.', 'dcccc', '.ddc.']]
        ],
        // forehead stripes either side of the star [dx from the centre, y, hue, part]
        brow: [[3, 1, 1, 'edge'], [3, 2, 1, 'core'], [3, 3, 1, 'tip'], [5, 2, 2, 'edge'], [5, 3, 2, 'core']],
        // cheek stripes sweeping back over the ruffs [x, y, part] (hue 0)
        cheek: [[-1, 10, 'edge'], [0, 10, 'core'], [1, 11, 'tip'], [19, 10, 'edge'], [18, 10, 'core'], [17, 11, 'tip']]
    }
};

function stripeCols(hue, glow, T = MUM) {
    const [edge, core, hot] = T.hues[hue];
    const e = [T.edge[0], T.edge[1], mix(edge, '#ffffff', 0.2)][glow];
    return { edge: e, core: glow ? hot : core, tip: glow ? hot : core };
}

/**
 * A tiger stripe: rows of [dx, width] running down from (x, y). Dark edges
 * (indigo for Mamma, plum for Pappa) with a glowing core, so it reads as a
 * stripe and as light.
 */
function tigerStripe(s, x, y, rows, hue, glow, T = MUM) {
    const c = stripeCols(hue, glow, T);
    over(s, () => {
        rows.forEach(([dx, w], i) => {
            const last = i === rows.length - 1;
            for (let k = 0; k < w; k += 1) {
                let col = c.edge;
                if (w === 3 && k === 1) col = c.core;
                if (w === 2 && k === 1 && i > 0) col = c.core;
                if (w === 1) col = last ? c.tip : c.core;
                s.px(x + dx + k, y + i, col);
            }
        });
    });
}

const STRIPE_SHAPES = {
    mid: [[0, 3], [0, 3], [0, 3], [-1, 2], [-1, 2], [-1, 1], [-2, 1]],
    short: [[0, 2], [0, 2], [-1, 2], [-1, 1]],
    // body pattern: varied lengths, curving back, some reaching forward
    hip: [[0, 3], [-1, 3], [-1, 2], [-2, 2], [-2, 2], [-3, 1], [-3, 1]],
    flank: [[0, 3], [0, 3], [0, 2], [0, 2], [1, 2], [1, 1], [1, 1], [2, 1]],
    dash: [[0, 2], [0, 2], [0, 1], [1, 1]],
    rib: [[0, 3], [0, 3], [1, 2], [1, 2], [1, 2], [2, 1], [2, 1], [3, 1]],
    shoulder: [[0, 2], [1, 2], [1, 2], [2, 1], [2, 1]],
    // Pappa's: the same pattern, a touch longer and bolder
    hipB: [[0, 3], [-1, 3], [-1, 3], [-2, 2], [-2, 2], [-3, 2], [-3, 1], [-4, 1]],
    dashB: [[0, 2], [0, 2], [0, 2], [0, 1], [1, 1]],
    flankB: [[0, 3], [0, 3], [0, 3], [0, 2], [1, 2], [1, 2], [1, 1], [2, 1], [2, 1]],
    ribB: [[0, 3], [0, 3], [1, 3], [1, 2], [1, 2], [2, 2], [2, 1], [3, 1], [3, 1], [4, 1]],
    shoulderB: [[0, 3], [1, 2], [1, 2], [2, 2], [2, 1], [3, 1]],
    shortB: [[0, 2], [0, 2], [-1, 2], [-1, 2], [-1, 1]]
};

function paw(s, x, y, R, near, T = MUM) {
    // x = left edge, y = top row of the paw (3 rows high, ends on y + 2)
    const C = T.cream;
    const r = x + 6 + T.paw;      // right column
    s.rect(x, y, 6 + T.paw, 3, R.b);
    s.px(r, y + 1, R.b);
    s.px(r, y + 2, R.b);
    if (near) {
        s.hline(x + 2, r, y + 2, C.b);
        s.hline(x + 3, r, y + 1, C.b);
        s.px(x + 4, y + 2, C.d1);
        s.px(r, y + 2, C.d1);
        s.hline(x, x + 1, y + 2, R.d1);
    } else {
        s.hline(x + 2, r, y + 2, C.d1);
        s.px(x + 4, y + 2, R.d1);
    }
}

function frontLeg(s, top, footX, lift, R, near, T = MUM) {
    const [x0, y0] = top;
    const fy = s.h - 3 - lift;    // paws stand on the ground row
    const k = T.leg;
    s.poly([[x0 - 3 - k, y0], [x0 + 3.5 + k, y0], [footX + 3 + k, fy], [footX - 2, fy]], R.b);
    if (near) {
        s.line(x0 - 2 - k, y0 + 2, footX - 2, fy - 1, R.l1);
        s.line(x0 + 3 + k, y0 + 3, footX + 2 + k, fy - 1, R.d1);
    }
    paw(s, footX - 3, fy, R, near, T);
}

function hindLeg(s, hip, footX, lift, R, near, T = MUM) {
    const [hx, hy] = hip;
    const fy = s.h - 3 - lift;
    const k = T.leg;
    const kx = footX - 3;
    const ky = fy - 5 - T.hock;
    s.poly([[hx - 4 - k, hy], [hx + 4 + k, hy], [kx + 3 + k, ky], [kx - 2, ky]], R.b);
    s.poly([[kx - 2, ky], [kx + 3 + k, ky], [footX + 3 + k, fy], [footX - 1, fy]], R.b);
    if (near) {
        s.line(kx - 1, ky + 1, footX - 1, fy - 1, R.l1);
    }
    paw(s, footX - 3, fy, R, near, T);
}

/** Head in a 19×16 box at (x, y) (T.head.w × T.head.h for Pappa). */
function tigerHead(s, x, y, o) {
    const { eyes = 'open', mouth = 'smile', glow = 0, look = false, ears = 'up', T = MUM } = o;
    const H = T.head;
    const { coat, cream } = T;
    const f = look ? 0 : 1;          // features turned a little to the right
    const cx = x + H.cx + f;         // centre column of the face
    const fy = y + H.face;           // eyes, muzzle and mouth hang from here
    // head and round ears (like Nova's), rim shaded as one shape
    const hs = new Sprite(s.w, s.h);
    const ey0 = ears === 'up' ? y - 2 : y;
    const eox = ears === 'up' ? 0 : 1;
    const earX = [x + 1 - eox, x + H.w - 7 + eox];
    for (const ex of earX) hs.oval(ex, ey0, 6, 5, coat.b);
    hs.oval(x, y, H.w, H.h, coat.b);
    rimShade(hs, coat, { top: 1, bottom: 1, right: 1, deep: false });
    for (const [a, b, dy] of H.shine) hs.hline(x + a, x + b, y + dy, coat.l2);
    for (const ex of earX) {
        hs.rect(ex + 2, ey0 + 1, 2, 2, EAR_IN);
        hs.px(ex + 2, ey0 + 1, '#ffd6cc');
    }
    s.stamp(hs, 0, 0);
    // fluffy cheek ruffs
    for (const [dx, dy, rows] of H.ruffs) s.map(x + dx, y + dy, rows, { c: cream.b, d: cream.d1 });
    // muzzle and chin
    const m = H.muzzle;
    s.oval(cx - 4 - m, fy + 9, 9 + 2 * m, 6, cream.b);
    s.oval(cx - 3 - m, fy + 12, 7 + 2 * m, 4, cream.b);
    s.hline(cx - 2 - m, cx + 2 + m, fy + 15, cream.d1);
    s.px(cx + 3 + m, fy + 14, cream.d1);
    // glowing forehead stripes either side of the star (Nova has the same two)
    const cols = [0, 1, 2].map((hue) => stripeCols(hue, glow, T));
    for (const side of [-1, 1]) {
        for (const [dx, dy, hue, part] of H.brow) s.px(cx + side * dx, y + dy, cols[hue][part]);
    }
    // cheek stripes sweeping back over the ruffs
    for (const [dx, dy, part] of H.cheek) s.px(x + dx, y + dy, cols[0][part]);
    // the star, exactly Nova's, with a soft warm glow: the family mark
    const gl = lit(alpha('#fff4a8', glow ? 0.7 : 0.45));
    for (const [gx, gy] of [[cx - 1, y + 1], [cx + 1, y + 1], [cx - 1, y + 4], [cx + 1, y + 4]]) s.px(gx, gy, gl);
    s.px(cx, y + 2, STAR);
    s.px(cx - 1, y + 3, STAR);
    s.px(cx + 1, y + 3, STAR);
    s.px(cx, y + 3, STAR_C);
    if (glow >= 2) {
        s.px(cx, y + 1, lit('#fffbe0'));
        s.px(cx - 2, y + 3, lit('#fff3a0'));
        s.px(cx + 2, y + 3, lit('#fff3a0'));
    }
    // eyes: big, round and kind
    const ey = fy + 6;
    const ex1 = cx - 5 - H.eye;
    const ex2 = cx + 4 + H.eye;
    if (eyes === 'open' || eyes === 'big') {
        for (const ex of [ex1, ex2]) {
            s.rect(ex, ey, 2, 3, EYE_D);
            s.px(ex + 1, ey, '#ffffff');
            s.px(ex, ey + 2, '#5c3a4a');
            if (eyes === 'big') {
                s.px(ex - 1, ey + 1, EYE_D);
                s.px(ex - 1, ey + 2, EYE_D);
                s.px(ex, ey + 2, '#ffffff');
            }
        }
    } else if (eyes === 'happy') {
        for (const ex of [ex1, ex2]) {
            s.px(ex - 1, ey + 2, EYE_D);
            s.hline(ex, ex + 1, ey + 1, EYE_D);
            s.px(ex + 2, ey + 2, EYE_D);
        }
    } else {
        s.hline(ex1 - 1, ex1 + 1, ey + 2, EYE_D);
        s.hline(ex2, ex2 + 2, ey + 2, EYE_D);
    }
    // blush
    s.px(ex1 - 1, ey + 4, '#ffa29a');
    s.px(ex2 + 2, ey + 4, '#ffa29a');
    // nose and mouth
    s.hline(cx - 1, cx + 1, fy + 10, NOSE);
    s.px(cx - 1, fy + 10, '#ffc0c8');
    s.px(cx, fy + 11, NOSE_D);
    if (mouth === 'open') {
        s.hline(cx - 1, cx + 1, fy + 12, MOUTH_D);
        s.px(cx, fy + 13, '#ff9aaa');
    } else if (mouth === 'call') {
        s.hline(cx - 1, cx + 1, fy + 12, MOUTH_D);
        s.px(cx - 1, fy + 13, MOUTH_D);
        s.px(cx, fy + 13, '#ff9aaa');
        s.px(cx + 1, fy + 13, MOUTH_D);
    } else {
        s.px(cx - 1, fy + 12, MOUTH_D);
        s.px(cx + 1, fy + 12, MOUTH_D);
    }
}

function tigerTail(s, p, glow, T = MUM) {
    const bands = [[0.3, 2], [0.52, 1], [0.74, 0]];
    const { r, fill, band, tuft } = T.tail;
    tube(s, p, r[0], r[1], () => T.coat.d1);
    tube(s, p.map(([x, y]) => [x - 0.5, y - 0.4]), fill[0], fill[1], () => T.coat.b);
    // glowing stripes wrap across the tail
    for (const [t, hue] of bands) {
        const [x, y] = bez(p, t);
        const [x2, y2] = bez(p, t + 0.03);
        const c = stripeCols(hue, glow, T);
        over(s, () => {
            disc(s, x, y, band, c.edge);
            disc(s, x2 - 0.4, y2 - 0.4, 0.75, c.core);
        });
    }
    const [tx, ty] = bez(p, 1);
    disc(s, tx, ty - 0.5, tuft, T.cream.b);
    s.px(Math.round(tx) - 1, Math.round(ty) - 2, T.cream.l1);
    return [Math.round(tx), Math.round(ty) - 4];
}

const STAND = { nf: [0, 0], ff: [0, 0], nb: [0, 0], fb: [0, 0] };

function tigerBody(s, B, glow, { lying = false, T = MUM } = {}) {
    const { coat, cream } = T;
    const X = T.x;                 // hind part
    const F = T.x + T.len;         // front part
    const c = T.chest;
    const h = T.haunch;
    const body = new Sprite(s.w, s.h);
    if (lying) {
        body.oval(9, B + 3, 17, 14, coat.b);          // hip, resting
        body.oval(17, B + 5, 24, 12, coat.b);
        body.oval(31, B + 1, 16, 16, coat.b);
        body.oval(38, B - 2, 10, 10, coat.b);
    } else {
        body.oval(10 + X - h, B + 1 - h, 16 + 2 * h, 15 + 2 * h, coat.b);   // haunch
        body.oval(18 + X, B + 2, 20 + T.len, 13 + h, coat.b);               // barrel
        body.oval(31 + F - c, B - c, 17 + 2 * c, 17 + 2 * c, coat.b);       // shoulders and deep chest
        body.oval(38 + F, B - 3 - c, 10 + c, 10 + c, coat.b);               // neck
    }
    rimShade(body, coat, { top: 1, bottom: 2, right: 0 });
    body.hline(15 + X, 20 + X, B + 1 - h, coat.l2);
    body.hline(25 + X, 31 + F - 2 * c, B + 2, coat.l2);
    // cream underside and bib
    over(body, () => {
        const u = lying ? 3 : 0;
        body.oval(20 + X, B + 12 + u + h, 20 + T.len, 6, cream.d1);
        body.oval(21 + X, B + 12 + u + h, 18 + T.len, 4, cream.b);
        body.oval(40 + F + c, B + 3, 9, 14 + c, cream.b);
        body.oval(43 + F + c, B + 3, 6, 14 + c, cream.d1);
        body.oval(40 + F + c, B + 3, 7, 13 + c, cream.b);
    });
    const S = STRIPE_SHAPES;
    for (const [sx, sy, shape, hue] of T.stripes) tigerStripe(body, X + sx, B + sy, S[shape], hue, glow, T);
    s.stamp(body, 0, 0);
}

/**
 * A Star Tiger standing. Body rows are measured from B (the top of the
 * back), legs always reach the ground row.
 */
function drawTiger(s, o = {}) {
    const { bob = 0, legs = STAND, head = [0, 0], tail = 0, glow = 0, aura = false, T = MUM } = o;
    const X = T.x;
    const F = T.x + T.len;
    const B = s.h - 24 - T.rise + bob;     // Mamma's back is 23 rows above the ground row
    const tp = [[13 + X, B + 5], [6 + X, B + 7], [1 + tail + X, B - 1], [5 + tail * 2 + X, B - 7]];
    const tip = tigerTail(s, tp, glow, T);
    // far legs
    frontLeg(s, [35 + F, B + 10], 36 + F + legs.ff[0], legs.ff[1], T.far, false, T);
    hindLeg(s, [21 + X, B + 10], 21 + X + legs.fb[0], legs.fb[1], T.far, false, T);
    tigerBody(s, B, glow, { T });
    // near legs
    frontLeg(s, [40 + F, B + 10], 41 + F + legs.nf[0], legs.nf[1], T.coat, true, T);
    hindLeg(s, [16 + X, B + 9], 16 + X + legs.nb[0], legs.nb[1], T.coat, true, T);
    for (const [sx, sy, rows, hue] of T.legStripes) tigerStripe(s, X + sx, B + sy, rows, hue, glow, T);
    // head (tilt > 0 bows it forward: columns further right sit lower)
    const hx = 42 + F + T.headAt[0] + head[0];
    const hy = B - 7 + T.headAt[1] + head[1];
    if (o.tilt) {
        const hs = new Sprite(s.w, s.h);
        tigerHead(hs, hx, hy, o);
        for (let x = 0; x < s.w; x += 1) {
            const dy = Math.max(0, Math.round((x - hx - 2) * o.tilt));
            for (let y = s.h - 1; y >= 0; y -= 1) {
                const c = hs.get(x, y);
                if (c[3]) s.px(x, y + dy, c);
            }
        }
    } else {
        tigerHead(s, hx, hy, o);
    }
    s.point('head', hx + T.head.cx + 1, hy - 3);
    sparkle(s, tip[0], tip[1], glow ? 2 : 1, '#ffffff', T.spark[glow ? 1 : 0]);
    tigerAura(s, aura ? Math.max(1, glow) : 0, T);
    return { hx, hy };
}

/** Lying down like a sphinx, head up, front paws stretched out. */
function drawTigerLying(s, o = {}) {
    const { glow = 0, T = MUM } = o;
    const { coat, far, cream } = T;
    const X = T.x;
    const F = T.x + T.len;
    const c = T.chest;
    const h = T.haunch;
    const k = T.leg;
    const r = T.lie.reach;
    const G = s.h - 1;
    const B = G - 14 - T.lie.up;
    // tail curling up behind
    const tp = [[12 + X, B + 7], [4 + X, B + 11], [0 + X, B + 5], [4 + X, B - 2]];
    const tip = tigerTail(s, tp, glow, T);
    // far front leg stretched forward, its paw peeking out ahead
    s.rect(40 + F, G - 5, 13 + r, 3, far.b);
    paw(s, 51 + F + r, G - 4, far, false, T);
    // body, low on the ground, chest propped up
    const body = new Sprite(s.w, s.h);
    body.oval(10 + X - h, B - h, 18 + 2 * h, 15 + 2 * h, coat.b);
    body.oval(18 + X, B + 1, 22 + T.len, 14 + T.lie.up, coat.b);
    body.oval(32 + F - c, B - 3 - c, 15 + 2 * c, 18 + c, coat.b);
    body.oval(37 + F, B - 7 - c, 11 + c, 11 + c, coat.b);
    rimShade(body, coat, { top: 1, bottom: 1, right: 0 });
    body.hline(15 + X, 20 + X, B - h, coat.l2);
    body.hline(25 + X, 31 + F - 2 * c, B + 1, coat.l2);
    over(body, () => {
        body.oval(40 + F + c, B - 1, 8, 14 + c, cream.b);
        body.oval(43 + F + c, B - 1, 5, 14 + c, cream.d1);
        body.oval(40 + F + c, B - 1, 6, 13 + c, cream.b);
    });
    const S = STRIPE_SHAPES;
    for (const [sx, sy, shape, hue] of T.lieStripes) tigerStripe(body, X + sx, B + sy, S[shape], hue, glow, T);
    s.stamp(body, 0, 0);
    // folded hind leg: a big round thigh with a contour, the paw tucked forward
    const thigh = new Sprite(s.w, s.h);
    thigh.oval(10 + X - h, B + 2 - h, 15 + 2 * h, 13 + 2 * h, coat.b);
    thigh.rect(18 + X, G - 2, 9 + T.paw, 3, coat.b);
    rimShade(thigh, coat, { top: 1, bottom: 1, right: 1 });
    thigh.hline(13 + X, 18 + X, B + 2 - h, coat.l1);
    for (let y = B + 4; y < G - 2; y += 1) {
        let x = s.w - 1;
        while (x > 0 && !thigh.opaque(x, y)) x -= 1;
        if (x > 0) thigh.px(x, y, coat.d2);
    }
    s.stamp(thigh, 0, 0);
    for (const [sx, sy, rows, hue] of T.lieLegStripes) tigerStripe(s, X + sx, B + sy, rows, hue, glow, T);
    paw(s, 24 + X + h, G - 2, coat, true, T);
    // near front leg stretched forward
    const leg = new Sprite(s.w, s.h);
    leg.poly([[36 + F, G - 7 - k], [42 + F + k, G - 7 - k], [52 + F + r, G - 3], [52 + F + r, G], [37 + F, G]], coat.b);
    rimShade(leg, coat, { top: 1, bottom: 1, right: 0 });
    s.stamp(leg, 0, 0);
    paw(s, 50 + F + r, G - 2, coat, true, T);
    const [ax, ay, arows, ahue] = T.lieArmStripe;
    tigerStripe(s, X + ax, G + ay, arows, ahue, glow, T);
    // head up
    const hx = 41 + F + T.lie.headAt[0];
    const hy = B - 13 + T.lie.headAt[1];
    tigerHead(s, hx, hy, o);
    s.point('head', hx + T.head.cx + 1, hy - 3);
    sparkle(s, tip[0], tip[1], 1, '#ffffff', T.spark[0]);
    tigerAura(s, 0, T);
}

/** Soft aura: faint all the time, stronger while the tiger calls. */
function tigerAura(s, glow, T = MUM) {
    const [calm, bright, call] = T.aura;
    if (!glow) {
        halo(s, calm, 0.14, [2]);
        return;
    }
    halo(s, glow >= 2 ? call : bright, glow >= 2 ? 0.34 : 0.22, [2]);
    halo(s, bright, glow >= 2 ? 0.16 : 0.1, [3]);
}

// walk: diagonal pairs, [dx, lift] per foot
const WALK = [
    { nf: [3, 0], fb: [3, 0], ff: [-3, 0], nb: [-3, 0], bob: 0 },
    { nf: [0, 0], fb: [0, 0], ff: [0, 2], nb: [0, 2], bob: -1 },
    { nf: [-3, 0], fb: [-3, 0], ff: [3, 0], nb: [3, 0], bob: 0 },
    { nf: [0, 2], fb: [0, 2], ff: [0, 0], nb: [0, 0], bob: -1 }
];

const TW = 68;
const TH = 36;
const GROUND = TH - 1;

const starTiger = {
    name: 'a-startiger',
    sheet: 'animals-star',
    w: TW,
    h: TH,
    anchor: [30, GROUND],
    outlineOptions,
    anims: {
        idle: [
            (s) => drawTiger(s, {}),
            (s) => drawTiger(s, { bob: 1, tail: 1 })
        ],
        blink: [(s) => drawTiger(s, { eyes: 'closed' })],
        walk: WALK.map((w, i) => (s) => drawTiger(s, { legs: w, bob: w.bob, tail: i % 2 })),
        look: [(s) => drawTiger(s, { look: true, eyes: 'big' })],
        lie: { w: TW, h: 32, anchor: [30, 31], frames: [(s) => drawTigerLying(s, {})] },
        nuzzle: [0, 1].map((f) => (s) => {
            const { hx } = drawTiger(s, { head: [3 - f, -1 + f], tilt: 0.2, eyes: 'happy', ears: 'back' });
            s.point('cub', hx + 13 + f, GROUND);
        }),
        special: [
            (s) => drawTiger(s, { glow: 1, mouth: 'open', head: [0, -1], eyes: 'closed', aura: true }),
            (s) => drawTiger(s, { glow: 2, mouth: 'call', head: [0, -2], eyes: 'closed', tail: 1, aura: true })
        ]
    }
};

// ===========================================================================
// PAPPA STJÄRNTIGER – Nova's father. The same family and the same little star
// on his forehead, a size bigger, with heavy shoulders, big fluffy sideburns
// and a warm sunrise glow where Mamma has her aurora.
// ===========================================================================
const DAD_COAT = { b: '#ee8a2a', l1: '#fdb65a', l2: '#ffdc9e', d1: '#cc621f', d2: '#9a3f19' };
const DAD_FAR = { b: '#d06c25', l1: '#e2802f', d1: '#b0501f', d2: '#863a19' };
// sunrise light: gold, amber and rose (same order as AUR_HUES: edge, core, hot)
const SUN_HUES = [
    ['#caa030', '#ffea60', '#fffad0'],     // gold
    ['#c87a1a', '#ffbf2e', '#ffeab0'],     // amber
    ['#b84a78', '#ff96bb', '#ffe2ec']      // rose
];

const DAD = {
    ...MUM,
    coat: DAD_COAT,                            // a deeper, richer orange; the same cream
    far: DAD_FAR,
    hues: SUN_HUES,
    edge: ['#48204e', '#5c2a62'],              // plum stripe edges, a touch bolder
    spark: ['#ffe36a', '#ffc8d8'],
    aura: ['#ffc45a', '#ffa63c', '#ffd84a'],   // warm gold halo
    // about 12% bigger than Mamma, heaviest at the shoulders and chest
    x: 3,
    len: 3,
    rise: 3,
    hock: 1,
    chest: 3,
    haunch: 1,
    leg: 1,
    paw: 1,
    headAt: [1, 0],
    lie: { up: 2, reach: 3, headAt: [1, 0] },
    tail: { r: [2.3, 1.7], fill: [1.8, 1.2], band: 1.4, tuft: 2.1 },
    stripes: [[15, 0, 'hipB', 2], [19, 2, 'dashB', 2], [22, 2, 'flankB', 1], [27, 3, 'dashB', 1], [29, 2, 'ribB', 0], [35, 0, 'shoulderB', 0], [10, 9, 'shortB', 2]],
    lieStripes: [[21, 1, 'dashB', 2], [24, 1, 'flankB', 1], [29, 1, 'ribB', 0], [35, -2, 'shoulderB', 0]],
    legStripes: [[41, 15, [[0, 2], [0, 2], [0, 1]], 0], [11, 13, [[0, 2], [1, 2], [2, 1]], 2]],
    lieLegStripes: [[11, 4, [[0, 2], [1, 2], [2, 2], [3, 1]], 2], [16, 3, [[0, 2], [1, 2], [1, 1]], 1]],
    lieArmStripe: [49, -6, [[0, 1], [0, 1], [1, 1]], 0],
    // a broader head with a taller brow and big sideburns flaring out and down
    head: {
        w: 21, h: 17, cx: 10, face: 1, muzzle: 1, eye: 0,
        shine: [[6, 9, 0], [4, 4, 1]],
        ruffs: [
            [-5, 6, [
                '.....cc',
                '....ccc',
                '...cccc',
                '.cccccc',
                'cdccccc',
                '..ccccc',
                '.cccccc',
                'cdcccdc',
                '...cccd',
                '..cddd.',
                '.....d.'
            ]],
            [19, 6, [
                'cc.....',
                'ccc....',
                'cccc...',
                'cccccc.',
                'cccccdc',
                'ccccc..',
                'cccccc.',
                'cdcccdc',
                'dccc...',
                '.dddc..',
                '.d.....'
            ]]
        ],
        brow: [[3, 1, 1, 'edge'], [3, 2, 1, 'edge'], [3, 3, 1, 'core'], [3, 4, 1, 'tip'], [5, 2, 2, 'edge'], [5, 3, 2, 'core'], [5, 4, 2, 'tip'], [7, 3, 0, 'edge'], [7, 4, 0, 'edge']],
        cheek: [
            [-3, 10, 'edge'], [-2, 10, 'edge'], [-1, 10, 'core'], [0, 11, 'core'], [1, 11, 'tip'], [-3, 12, 'edge'], [-2, 12, 'core'], [-1, 13, 'tip'],
            [23, 10, 'edge'], [22, 10, 'edge'], [21, 10, 'core'], [20, 11, 'core'], [19, 11, 'tip'], [23, 12, 'edge'], [22, 12, 'core'], [21, 13, 'tip']
        ]
    }
};

// a bigger cat takes longer steps: Mamma's walk with 4 px strides instead of 3
const DAD_WALK = WALK.map((w) => {
    const long = ([dx, lift]) => [(dx * 4) / 3, lift];
    return { nf: long(w.nf), ff: long(w.ff), nb: long(w.nb), fb: long(w.fb), bob: w.bob };
});

const DW = 79;
const DH = 44;
const DGROUND = DH - 1;
const DAD_ROOMY = { ...DAD, x: DAD.x + 3 };
const dad = (o) => (s) => drawTiger(s, { ...o, T: DAD });

const starTigerDad = {
    name: 'a-startiger-dad',
    sheet: 'animals-star',
    w: DW,
    h: DH,
    anchor: [34, DGROUND],
    outlineOptions,
    anims: {
        idle: [dad({}), dad({ bob: 1, tail: 1 })],
        blink: [dad({ eyes: 'closed' })],
        walk: DAD_WALK.map((w, i) => dad({ legs: w, bob: w.bob, tail: i % 2 })),
        look: [dad({ look: true, eyes: 'big' })],
        lie: { w: DW, h: 36, anchor: [34, 35], frames: [(s) => drawTigerLying(s, { T: DAD })] },
        // head bowed down to the cub standing under his chin
        nuzzle: [0, 1].map((f) => (s) => {
            // a 0.22 bow keeps the happy eyes, star, nose and mouth unbroken
            const { hx } = drawTiger(s, { T: DAD, head: [1 - f, 1 + f], tilt: 0.22, eyes: 'happy', ears: 'back' });
            s.point('cub', hx + 14 + f, DGROUND);
        }),
        // calling with his sunrise aura; a roomier frame so the whole glow fits
        special: {
            w: DW + 6,
            h: DH + 2,
            anchor: [34 + 3, DH + 1],
            frames: [
                (s) => drawTiger(s, { T: DAD_ROOMY, glow: 1, mouth: 'open', head: [0, -1], eyes: 'closed', aura: true }),
                (s) => drawTiger(s, { T: DAD_ROOMY, glow: 2, mouth: 'call', head: [0, -2], eyes: 'closed', tail: 1, aura: true })
            ]
        }
    }
};

// ===========================================================================
// STJÄRNVALEN – a gentle whale swimming through the starry sky
// ===========================================================================
const WHALE = { b: '#5053b8', l1: '#6d78dc', l2: '#94a4f2', d1: '#3a3890', d2: '#282468' };
const WBELLY = { b: '#d9ecff', l1: '#f4fbff', d1: '#a9c6f0', d2: '#8aa6dc' };
const WW = 92;
const WH = 44;

/**
 * phase: 0..3 swim phase (tail up, level, down, level); amp: how far the tail
 * swings; mouth: 'smile' | 'sing'; eye: 'open' | 'look' | 'closed'
 */
function drawWhale(s, { phase = 0, amp = 2, mouth = 'smile', eye = 'open', fin = 0, notes = -1 } = {}) {
    const w = new Sprite(s.w, s.h);
    const cy = 22;
    // --- flukes (a fan pointing back) and the tail stock
    w.poly([[6, cy - 9], [12, cy - 3], [15, cy - 1], [15, cy + 2], [12, cy + 3], [5, cy + 7], [3, cy + 6], [8, cy + 1], [8, cy - 1], [3, cy - 7], [4, cy - 9]], WHALE.d1);
    w.poly([[12, cy - 4], [34, cy - 7], [34, cy + 6], [12, cy + 3]], WHALE.b);
    // --- body and big round head
    w.oval(22, cy - 11, 44, 22, WHALE.b);
    w.oval(46, cy - 14, 40, 28, WHALE.b);
    rimShade(w, WHALE, { top: 2, bottom: 0, right: 1, deep: false });
    // back highlight
    w.line(50, cy - 13, 66, cy - 13, WHALE.l2);
    w.line(34, cy - 10, 48, cy - 12, WHALE.l1);
    // --- luminous belly with long grooves
    over(w, () => {
        w.oval(26, cy + 1, 42, 12, WBELLY.d1);
        w.oval(28, cy + 1, 58, 13, WBELLY.b);
        w.oval(60, cy + 2, 26, 11, WBELLY.b);
        w.hline(30, 52, cy + 3, WBELLY.l1);
        w.hline(58, 80, cy + 3, WBELLY.l1);
        for (const [x0, x1, y] of [[40, 80, cy + 6], [44, 78, cy + 8], [50, 74, cy + 10]]) {
            for (let x = x0; x <= x1; x += 1) {
                const t = (x - x0) / (x1 - x0);
                const yy = y + Math.round(Math.sin(t * Math.PI) * 1.2);
                if ((x + y) % 7 !== 0) w.px(x, yy, WBELLY.d1);
            }
        }
    });
    // mouth: a long gentle smile from the nose back under the eye
    const my = cy + 2;
    if (mouth === 'sing') {
        w.poly([[64, my + 1], [85, my - 1], [85, my + 4], [74, my + 6], [67, my + 4]], '#4a1f52');
        w.oval(72, my + 3, 11, 3, '#ff8fb0');
        w.hline(74, 80, my + 3, '#ffb8cc');
        w.line(62, my + 1, 85, my - 1, WHALE.d2);
        w.px(61, my, WHALE.d2);
    } else {
        w.line(62, my + 1, 85, my - 1, WHALE.d2);
        w.px(61, my, WHALE.d2);
        w.px(60, my - 1, WHALE.d2);
    }
    // pectoral fin
    const fy = cy + 8;
    const tipY = fy + 7 - fin * 3;
    w.poly([[48, fy - 1], [54, fy - 1], [45, tipY + 2], [41, tipY + 3], [42, tipY]], WHALE.d1);
    w.line(50, fy, 43, tipY + 1, WHALE.b);
    // eye
    const ex = 64;
    const ey = cy - 3;
    if (eye === 'open') {
        w.rect(ex, ey, 2, 2, '#1c1638');
        w.px(ex + 1, ey, '#ffffff');
    } else if (eye === 'look') {
        w.rect(ex - 1, ey - 1, 3, 3, '#1c1638');
        w.px(ex + 1, ey - 1, '#ffffff');
        w.px(ex - 1, ey + 1, '#8f98ea');
        w.px(ex - 1, ey + 3, '#ff9ec0');
        w.px(ex + 2, ey + 3, '#ff9ec0');
    } else {
        w.px(ex - 1, ey + 1, '#1c1638');
        w.hline(ex, ex + 1, ey, '#1c1638');
        w.px(ex + 2, ey + 1, '#1c1638');
    }
    w.px(ex + 3, ey + 3, '#ff9ec0');
    // constellation along the back: Karlavagnen (the Big Dipper)
    const S7 = [[31, cy - 9], [38, cy - 11], [45, cy - 12], [51, cy - 12], [52, cy - 7], [59, cy - 6], [60, cy - 11]];
    const link = alpha('#bfe6ff', 0.5);
    for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]) {
        w.line(S7[i][0], S7[i][1], S7[j][0], S7[j][1], link);
    }
    S7.forEach(([x, y], i) => {
        if (i === 3 || i === 6 || i === 0) sparkle(w, x, y, 1, '#ffffff', '#9ff0ff');
        else w.px(x, y, lit('#fffef0'));
    });
    // --- undulate: shift columns, more towards the tail
    const ph = [1, 0, -1, 0][phase % 4];
    const ph2 = [0, 1, 0, -1][phase % 4];
    for (let x = 0; x < s.w; x += 1) {
        const k = Math.max(0, (46 - x) / 42);
        const dy = Math.round(-(ph * amp) * k * k - ph2 * 0.6 * k);
        for (let y = 0; y < s.h; y += 1) {
            const c = w.get(x, y);
            if (c[3]) s.px(x, y + dy, c);
        }
    }
    halo(s, '#9fb4ff', 0.18, [2]);
    // singing: sparkly notes
    if (notes >= 0) {
        const note = (nx, ny, c) => {
            s.map(nx, ny, ['.cc', '.c.', 'cc.', 'cc.'], { c: lit(c) });
            s.px(nx + 2, ny + 1, lit(alpha(c, 0.5)));
        };
        const o = notes;
        note(84, 6 - o, '#fff2a0');
        note(76, 2 + o, '#9ff6ff');
        sparkle(s, 88, 12 - o, 1, '#ffffff', '#ffb8e8');
        sparkle(s, 81, 10 + o, 0, '#ffffff', '#ffffff');
    }
    s.point('head', 70, 8);
}

const starWhale = {
    name: 'a-starwhale',
    sheet: 'animals-star',
    w: WW,
    h: WH,
    anchor: [46, 22],
    outlineOptions,
    anims: {
        idle: [
            (s) => drawWhale(s, { phase: 1, amp: 1 }),
            (s) => drawWhale(s, { phase: 3, amp: 1, fin: 1 })
        ],
        swim: [0, 1, 2, 3].map((p) => (s) => drawWhale(s, { phase: p, fin: p === 0 ? 1 : p === 2 ? 0 : 0.5 })),
        look: [(s) => drawWhale(s, { phase: 1, eye: 'look' })],
        special: [
            (s) => drawWhale(s, { phase: 1, mouth: 'sing', eye: 'closed', notes: 0 }),
            (s) => drawWhale(s, { phase: 3, mouth: 'sing', eye: 'closed', notes: 2, fin: 1 })
        ]
    }
};

// ===========================================================================
// LUMAS – plump little star creatures (like in Super Mario Galaxy)
// ===========================================================================
const LUMA_COLORS = {
    yellow: '#ffd23f',
    blue: '#4aa8ff',
    pink: '#ff8cc6',
    orange: '#ff9838'
};

// 11×12 hand-drawn shapes. b = body; the shading is added afterwards.
const LUMA_SHAPES = {
    front: [
        '......b....',
        '.....bb....',
        '....bbbb...',
        '...bbbbbb..',
        '.bbbbbbbbb.',
        'bbbbbbbbbbb',
        '.bbbbbbbbb.',
        '..bbbbbbb..',
        '..bbbbbbb..',
        '..bbbbbbb..',
        '..bbb.bbb..',
        '..bb...bb..'
    ],
    squash: [
        '......b....',
        '.....bb....',
        '...bbbbbb..',
        '.bbbbbbbbb.',
        'bbbbbbbbbbb',
        'bbbbbbbbbbb',
        '.bbbbbbbbb.',
        '.bbbbbbbbb.',
        '..bbbbbbb..',
        '..bbb.bbb..',
        '..bb...bb..'
    ],
    tilt: [
        '........b..',
        '.......bb..',
        '..b..bbbb..',
        '..bbbbbbbb.',
        '..bbbbbbbb.',
        '.bbbbbbbbbb',
        '..bbbbbbbbb',
        '..bbbbbbbb.',
        '.bbbbbbbb..',
        '.bbbbbbbb..',
        '..bbb.bb...',
        '...b..b....'
    ],
    side: [
        '.....b.....',
        '....bb.....',
        '....bbb....',
        '...bbbb....',
        '...bbbbb...',
        '..bbbbbb...',
        '...bbbbb...',
        '...bbbb....',
        '...bbbb....',
        '...bbbb....',
        '...bbbb....',
        '...bb.b....'
    ]
};

function drawLuma(s, color, { shape = 'front', eyes = 'open', bob = 0 } = {}) {
    const R = ramp(LUMA_COLORS[color]);
    const rows = LUMA_SHAPES[shape];
    const ox = 3;
    const oy = 2 + bob + (12 - rows.length);
    const body = new Sprite(s.w, s.h);
    body.map(ox, oy, rows, { b: R.b });
    rimShade(body, R, { top: 1, bottom: 1, right: 1, deep: false });
    s.stamp(body, 0, 0);
    // soft highlight on the dome
    const top = shape === 'squash' ? 2 : 3;
    if (shape === 'front' || shape === 'squash') {
        s.px(ox + 4, oy + top - 1, R.l2);
        s.px(ox + 3, oy + top, R.l1);
    }
    // feet a shade darker
    const last = rows.length - 1;
    for (let x = 0; x < 11; x += 1) if (rows[last][x] === 'b') s.px(ox + x, oy + last, R.d1);
    // face
    const ey = oy + (shape === 'squash' ? 4 : 5);
    const EYE = '#2a1f3a';
    const face = (e1, e2) => {
        if (eyes === 'open') {
            s.rect(e1, ey, 2, 2, EYE);
            s.rect(e2, ey, 2, 2, EYE);
            s.px(e1 + 1, ey, '#ffffff');
            s.px(e2 + 1, ey, '#ffffff');
        } else if (eyes === 'happy') {
            s.px(e1, ey + 1, EYE);
            s.px(e1 + 1, ey, EYE);
            s.px(e2, ey, EYE);
            s.px(e2 + 1, ey + 1, EYE);
        } else if (eyes === 'closed') {
            s.hline(e1, e1 + 1, ey + 1, EYE);
            s.hline(e2, e2 + 1, ey + 1, EYE);
        }
        s.px(e1 - 1, ey + 2, mix(R.b, '#ff5a8a', 0.45));
        s.px(e2 + 2, ey + 2, mix(R.b, '#ff5a8a', 0.45));
    };
    if (shape === 'front' || shape === 'squash') face(ox + 3, ox + 6);
    else if (shape === 'tilt') face(ox + 3, ox + 6);
    // soft glow around
    halo(s, R.l1, 0.3, [2]);
    halo(s, R.l1, 0.12, [3]);
    s.point('head', ox + 6, oy - 1);
}

function lumaDef(color) {
    const d = (o) => (s) => drawLuma(s, color, o);
    return {
        name: `a-luma-${color}`,
        sheet: 'animals-star',
        w: 17,
        h: 18,
        anchor: [8, 8],
        outlineOptions,
        anims: {
            idle: [d({}), d({ bob: 1 })],
            blink: [d({ eyes: 'closed' })],
            float: [d({ bob: -1 }), d({ bob: 1 })],
            eat: [d({ shape: 'squash', eyes: 'happy' }), d({ eyes: 'happy', bob: -1 })],
            look: [d({ eyes: 'happy' })],
            special: [d({ shape: 'tilt', eyes: 'happy' }), d({ shape: 'side', eyes: 'none' })]
        }
    };
}

// ===========================================================================
// ELDFLUGA – a firefly
// ===========================================================================
function drawFirefly(s, f) {
    const cx = 4;
    const cy = 4;
    // glow first so the body sits on top
    const g = f ? 0.5 : 0.32;
    for (const [dx, dy] of [[-2, 0], [-1, -1], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 1], [-2, 1], [-3, 0], [1, 0], [0, 2], [-1, 2]]) {
        s.px(cx + dx, cy + dy, lit(alpha('#e8ff7a', g * (Math.abs(dx) + Math.abs(dy) > 2 ? 0.45 : 1))));
    }
    s.px(cx - 1, cy, lit(f ? '#ffffff' : '#fbffc8'));   // glowing tail
    s.px(cx, cy, lit('#d8ff4a'));
    s.px(cx + 1, cy, '#4a3a5a');                        // head
    // wings
    const wc = alpha('#e8f4ff', 0.85);
    if (f) { s.px(cx, cy - 1, wc); s.px(cx - 1, cy - 1, wc); } else { s.px(cx, cy - 1, wc); s.px(cx + 1, cy - 2, wc); s.px(cx - 1, cy - 2, wc); }
}

const firefly = {
    name: 'a-firefly',
    sheet: 'animals-star',
    w: 8,
    h: 7,
    anchor: [4, 4],
    outline: false,
    anims: { fly: [(s) => drawFirefly(s, 0), (s) => drawFirefly(s, 1)] }
};

// ===========================================================================
// STJÄRNHJORTEN – a pale lavender deer with crystal antlers
// ===========================================================================
const DEER = { b: '#c9b8f0', l1: '#e4d9ff', l2: '#f6f1ff', d1: '#a592d8', d2: '#7f6cbc' };
const DEER_FAR = { b: '#a896dc', l1: '#b8a6e6', d1: '#8a78c4', d2: '#6c5aa8' };
const HOOF = '#4a3a7a';
const CRYSTAL = { hi: '#ffffff', l: '#c8fbff', m: '#7fe6ff', d: '#4aa8e0', tip: '#ffb8f0' };

function crystalTine(s, pts, far) {
    // a faceted crystal branch through the points, tip in pink
    for (let i = 0; i < pts.length - 1; i += 1) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        s.line(x0, y0, x1, y1, lit(far ? CRYSTAL.d : CRYSTAL.m));
        s.line(x0 - 1, y0, x1 - 1, y1, lit(far ? CRYSTAL.m : CRYSTAL.l));
    }
    const [tx, ty] = pts[pts.length - 1];
    s.px(tx, ty, lit(far ? CRYSTAL.l : CRYSTAL.hi));
    s.px(tx - 1, ty, lit(CRYSTAL.tip));
}

function deerAntlers(s, x, y, front = false) {
    // x, y = top of the head between the ears; front = seen from the front
    if (front) {
        crystalTine(s, [[x - 2, y], [x - 4, y - 3], [x - 5, y - 6]], false);
        crystalTine(s, [[x - 4, y - 3], [x - 7, y - 4]], false);
        crystalTine(s, [[x + 3, y], [x + 5, y - 3], [x + 6, y - 6]], false);
        crystalTine(s, [[x + 5, y - 3], [x + 8, y - 4]], false);
    } else {
        crystalTine(s, [[x - 1, y], [x - 3, y - 3], [x - 3, y - 6]], true);
        crystalTine(s, [[x - 2, y - 2], [x - 5, y - 4]], true);
        crystalTine(s, [[x + 1, y], [x + 2, y - 3], [x + 2, y - 6]], false);
        crystalTine(s, [[x + 2, y - 3], [x + 5, y - 5]], false);
    }
}

/** A slender leg through joints [[x, y], ...]; the last point is the hoof. */
function deerLeg(s, pts, far) {
    const c = far ? DEER_FAR : DEER;
    for (let i = 0; i < pts.length - 1; i += 1) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        s.thick(x0, y0, x1, y1, 2, c.b);
    }
    if (!far) {
        const [x0, y0] = pts[0];
        const [x1, y1] = pts[1];
        s.line(x0, y0 + 1, x1, y1 - 1, c.l1);
    }
    const [hx, hy] = pts[pts.length - 1];
    s.hline(hx, hx + 1, hy, far ? '#3a2c64' : HOOF);
}

function deerHead(s, hx, hy, { eyes = 'open', mouth = 'smile', front = false } = {}) {
    if (front) {
        // facing the viewer
        s.oval(hx - 6, hy + 1, 4, 3, DEER.d1);            // ears
        s.oval(hx + 5, hy + 1, 4, 3, DEER.d1);
        s.px(hx - 5, hy + 2, '#ffb8d8');
        s.px(hx + 7, hy + 2, '#ffb8d8');
        s.ball(hx - 3, hy, 9, 8, DEER);
        s.oval(hx - 1, hy + 5, 5, 3, DEER.l2);
        s.px(hx + 1, hy + 5, '#5a3a6a');
        s.rect(hx - 2, hy + 3, 2, 2, '#2a1f3a');
        s.rect(hx + 3, hy + 3, 2, 2, '#2a1f3a');
        s.px(hx - 1, hy + 3, '#ffffff');
        s.px(hx + 4, hy + 3, '#ffffff');
        s.px(hx - 3, hy + 5, '#ff9ec0');
        s.px(hx + 5, hy + 5, '#ff9ec0');
        s.px(hx + 1, hy + 1, lit('#fff4b0'));
        deerAntlers(s, hx + 1, hy, true);
        return;
    }
    // ear pointing back
    s.poly([[hx + 1, hy + 2], [hx - 4, hy], [hx - 4, hy + 2], [hx, hy + 4]], DEER.d1);
    s.line(hx - 3, hy + 1, hx, hy + 2, '#ffb8d8');
    s.ball(hx, hy, 9, 7, DEER);
    s.oval(hx + 6, hy + 3, 5, 4, DEER.b);          // muzzle
    s.hline(hx + 6, hx + 9, hy + 3, DEER.l1);
    s.px(hx + 10, hy + 4, '#5a3a6a');              // nose
    s.px(hx + 9, hy + 6, DEER.d1);
    if (mouth === 'eat') s.hline(hx + 8, hx + 9, hy + 6, '#8a4a6a');
    const ex = hx + 5;
    const ey = hy + 2;
    if (eyes === 'open') {
        s.rect(ex, ey, 2, 2, '#2a1f3a');
        s.px(ex + 1, ey, '#ffffff');
    } else if (eyes === 'happy') {
        s.px(ex, ey + 1, '#2a1f3a');
        s.px(ex + 1, ey, '#2a1f3a');
        s.px(ex + 2, ey + 1, '#2a1f3a');
    } else {
        s.hline(ex, ex + 1, ey + 1, '#2a1f3a');
    }
    s.px(ex + 1, ey + 3, '#ff9ec0');
    // a little star on the forehead
    s.px(hx + 3, hy + 1, lit('#fff4b0'));
    deerAntlers(s, hx + 3, hy);
}

/**
 * legs: 'stand' or joint lists; dx per leg [nf, ff, nb, fb] with lifts for
 * walking; head: 'up' | 'down' | 'front'; lift raises the body (leap).
 */
function drawDeer(s, { legs = [[0, 0], [0, 0], [0, 0], [0, 0]], leap = null, bob = 0, lift = 0, head = 'up', eyes = 'open', mouth = 'smile', trail = 0 } = {}) {
    const G = s.h - 1;
    const B = G - 16 + bob - lift;
    const top = B + 6;
    // legs as joint lists
    let L;
    if (leap === 'crouch') {
        L = {
            nf: [[16, top], [17, G - 3], [16, G]], ff: [[14, top], [15, G - 3], [14, G]],
            nb: [[5, top], [2, G - 4], [4, G]], fb: [[7, top], [4, G - 4], [6, G]]
        };
    } else if (leap === 'up') {
        L = {
            nf: [[16, top], [19, top + 3], [17, top + 5]], ff: [[14, top], [17, top + 3], [15, top + 5]],
            nb: [[5, top], [1, top + 4], [-1, top + 7]], fb: [[7, top], [3, top + 4], [1, top + 7]]
        };
    } else if (leap === 'down') {
        L = {
            nf: [[16, top], [19, top + 4], [20, top + 8]], ff: [[14, top], [17, top + 4], [18, top + 8]],
            nb: [[5, top], [3, top + 3], [5, top + 5]], fb: [[7, top], [5, top + 3], [7, top + 5]]
        };
    } else {
        const leg = (x, [dx, l], hind) => (hind
            ? [[x, top], [x - 1 + dx / 2, G - 4 - l], [x + dx, G - l]]
            : [[x, top], [x + dx / 2, G - 4 - l], [x + dx, G - l]]);
        L = { nf: leg(16, legs[0]), ff: leg(14, legs[1]), nb: leg(5, legs[2], true), fb: leg(7, legs[3], true) };
    }
    // tail
    s.oval(1, B, 3, 3, DEER.l2);
    deerLeg(s, L.ff, true);
    deerLeg(s, L.fb, true);
    // body
    s.ball(2, B, 17, 8, DEER);
    s.oval(5, B + 4, 12, 4, DEER.l1);
    // neck
    if (head === 'down') {
        s.thick(15, B + 2, 19, B + 7, 4, DEER.b);
    } else {
        s.thick(15, B + 2, 18, B - 3, 4, DEER.b);
        s.line(16, B, 18, B - 2, DEER.l1);
    }
    // star speckles on the back
    for (const [x, y] of [[5, B + 2], [8, B + 1], [11, B + 2], [7, B + 4], [13, B + 1]]) s.px(x, y, lit('#fff8d8'));
    s.px(10, B + 3, lit('#ffe36a'));
    deerLeg(s, L.nf, false);
    deerLeg(s, L.nb, false);
    // head
    let hx = 16;
    let hy = B - 8;
    if (head === 'down') { hx = 18; hy = G - 7 - (mouth === 'eat' ? 0 : 1); }
    if (head === 'front') { hx = 18; hy = B - 9; }
    deerHead(s, hx, hy, { eyes, mouth, front: head === 'front' });
    if (trail === 1) {
        // a trail of sparkles along the arc of the leap, back to the take-off
        sparkle(s, 3, top + 10, 1, '#ffffff', '#9ff0ff');
        sparkle(s, 6, G - 3, 0, '#ffffff', '#ffffff');
        s.px(9, G - 1, lit('#ffb8f0'));
        s.px(1, top + 13, lit(alpha('#9ff0ff', 0.7)));
    } else if (trail === 2) {
        sparkle(s, 2, top + 5, 1, '#ffffff', '#ffb8f0');
        sparkle(s, 3, G - 5, 1, '#ffffff', '#9ff0ff');
        s.px(7, G - 1, lit('#fff4b0'));
        s.px(6, top + 9, lit(alpha('#ffffff', 0.7)));
    }
    s.point('head', hx + 4, hy - 7);
}

/** Paint into a scratch sprite and stamp it dx px to the right (points follow). */
function shifted(paint, dx) {
    return (s) => {
        const t = new Sprite(s.w, s.h);
        paint(t);
        s.stamp(t, dx, 0);
        for (const [k, [x, y]] of Object.entries(t.points)) s.point(k, x + dx, y);
    };
}

const DEER_WALK = [
    [[2, 0], [-2, 0], [-2, 0], [2, 0]],
    [[0, 2], [0, 0], [0, 0], [0, 2]],
    [[-2, 0], [2, 0], [2, 0], [-2, 0]],
    [[0, 0], [0, 2], [0, 2], [0, 0]]
];

const starDeer = {
    name: 'a-stardeer',
    sheet: 'animals-star',
    w: 30,
    h: 32,
    anchor: [12, 31],
    outlineOptions,
    anims: {
        idle: [(s) => drawDeer(s, {}), (s) => drawDeer(s, { bob: 1 })],
        blink: [(s) => drawDeer(s, { eyes: 'closed' })],
        walk: DEER_WALK.map((l, i) => (s) => drawDeer(s, { legs: l, bob: i % 2 ? -1 : 0 })),
        eat: [(s) => drawDeer(s, { head: 'down', eyes: 'happy' }), (s) => drawDeer(s, { head: 'down', eyes: 'happy', mouth: 'eat' })],
        look: [(s) => drawDeer(s, { head: 'front' })],
        special: {
            w: 32,
            h: 38,
            anchor: [14, 37],
            frames: [
                shifted((s) => drawDeer(s, { leap: 'crouch', bob: 2 }), 2),
                shifted((s) => drawDeer(s, { leap: 'up', lift: 7, eyes: 'happy', trail: 1 }), 2),
                shifted((s) => drawDeer(s, { leap: 'down', lift: 4, eyes: 'happy', trail: 2 }), 2)
            ]
        }
    }
};

// ===========================================================================
// MÅNKANINEN – a white rabbit with a crescent moon on its side
// ===========================================================================
const BUNNY_KEY = {
    w: '#f4f0ff', s: '#d4caf0', e: '#cfc4ee', p: '#ffb6cc', k: '#2a1f3a', h: '#ffffff',
    n: '#ff8fb0', c: '#ffc2d4', l: '#ffffff', t: '#ffffff'
};
const BUNNY_MOON = { m: lit('#ffd86a'), M: lit('#fff3b8') };
// hand-drawn 13×14 maps, ground on the last row
const BUNNY_MAPS = {
    sit: [
        '.......ww....',
        '......wpw....',
        '.....ewpw....',
        '.....ewpw....',
        '.....ewww....',
        '....wwwwww...',
        '.sswwwwwkhw..',
        'swwwwwwwkkwn.',
        'twwwwwwwwwc..',
        'twwwwwsswss..',
        '.wwmwwwwww...',
        '.wmwwwwwwww..',
        '.wwmwwwswww..',
        '..sssss.ss...'
    ],
    crouch: [
        '....ww.......',
        '...ewpw......',
        '...ewppw.....',
        '....ewwwww...',
        '..sswwwwwww..',
        '.swwwwwwwkhw.',
        'twwwwwwwwkkwn',
        'twwmwwwwwwc..',
        '.wmwwwwwsss..',
        '.wwmwwwwwww..',
        '.swwwwwswwww.',
        '..sssss..sss.'
    ],
    rise: [
        '.........ww..',
        '........wpw..',
        '.......ewpw..',
        '.......ewww..',
        '......wwwwww.',
        '.....wwwwwkh.',
        '...sswwwwwkkn',
        '..wwwwwwwwwc.',
        '.twwwwwwwss..',
        '.twmwwwwww...',
        '.wmwwwwwww...',
        'wwwmwwss.ww..',
        'ss.ss.....s..'
    ],
    air: [
        '...eeww......',
        '....wwppw....',
        '.....wwwwww..',
        '...wwwwwwwkh.',
        '.sswwwwwwwkkn',
        'twwwwwwwwwwc.',
        'twwmwwwwwss..',
        '.wmwwwwwwwww.',
        'swwmwwwwsss..',
        'ss.ss........'
    ],
    land: [
        '......ww.....',
        '.....wpw.....',
        '....ewpw.....',
        '....ewwww....',
        '...wwwwwww...',
        '.sswwwwwwkh..',
        'swwwwwwwwkkn.',
        'twwmwwwwwwc..',
        'twmwwwwsss...',
        '.wwmwwwwwww..',
        'sswwwwwwwwww.',
        'ss..ss...sss.'
    ],
    eat: [
        '....eww......',
        '...ewpw......',
        '...ewpww.....',
        '..sswwwwww...',
        '.swwwwwwwww..',
        'twwwwwwwwkhw.',
        'twwmwwwwwkkwn',
        '.wmwwwwwwwwc.',
        '.wwmwwwsswww.',
        '.wwwwwwwwww..',
        '..sssss..ss..'
    ],
    eat2: [
        '....eww......',
        '...ewpw......',
        '...ewpww.....',
        '..sswwwwww...',
        '.swwwwwwwww..',
        'twwwwwwwwssw.',
        'twwmwwwwwwwwn',
        '.wmwwwwwwwwc.',
        '.wwmwwwsswww.',
        '.wwwwwwwwww..',
        '..sssss..ss..'
    ],
    front: [
        '...ww..ww....',
        '..wpw..wpw...',
        '..wpw..wpw...',
        '..wpw..wpw...',
        '..www..www...',
        '.wwwwwwwwww..',
        'wwwwwwwwwwww.',
        'wwkhwwwwkhww.',
        'wckkwnnwkkcw.',
        'wwwwwwwwwwww.',
        '.wwwwwwwwww..',
        '.wmwwwwwwww..',
        '.mwwwwwwwww..',
        '.wmwwwwwwww..',
        '..ssss.sss...'
    ],
    up: [
        '......ww.....',
        '.....wpw.....',
        '.....wpw.....',
        '....ewpw.....',
        '....ewww.....',
        '....wwwwwn...',
        '...wwwwkhw...',
        '...wwwwkkc...',
        '...swwwwww...',
        '...wwwwwll...',
        '..twwwwwl....',
        '..twwwwww....',
        '...wmwwwww...',
        '...mwwwwww...',
        '...wmwwwww...',
        '..sssss.ss...'
    ]
};

function drawBunny(s, pose, { eyes = 'open', lift = 0, sparkleSize = -1, earTwitch = false } = {}) {
    let rows = BUNNY_MAPS[pose];
    if (eyes === 'closed') rows = rows.map((r) => r.replace('kh', 'ww').replace('kk', 'kk'));
    if (earTwitch) rows = ['.............', '......www....', ...rows.slice(2)];
    const G = s.h - 1;
    const x0 = 1;
    const y0 = G - rows.length + 1 - lift;
    s.map(x0, y0, rows, { ...BUNNY_KEY, ...BUNNY_MOON });
    if (sparkleSize >= 0) sparkle(s, x0 + 11, y0 + 1 - sparkleSize, sparkleSize, '#ffffff', '#fff2a0');
    halo(s, '#dcd4ff', 0.2, [2]);
    // head: the top of the ears
    let top = 0;
    while (top < rows.length && !/[^.]/.test(rows[top])) top += 1;
    s.point('head', x0 + rows[top].search(/[^.]/), y0 + top - 1);
}

const bun = (pose, o) => (s) => drawBunny(s, pose, o);

const moonRabbit = {
    name: 'a-moonrabbit',
    sheet: 'animals-star',
    w: 16,
    h: 17,
    anchor: [6, 16],
    outlineOptions,
    anims: {
        idle: [bun('sit'), bun('sit', { earTwitch: true })],
        blink: [bun('sit', { eyes: 'closed' })],
        hop: {
            w: 16,
            h: 21,
            anchor: [6, 20],
            frames: [bun('crouch'), bun('rise', { lift: 2 }), bun('air', { lift: 5 }), bun('land', { lift: 1 })]
        },
        eat: [bun('eat'), bun('eat2')],
        look: [bun('front')],
        special: {
            w: 17,
            h: 21,
            anchor: [6, 20],
            frames: [bun('up', { sparkleSize: 0 }), bun('up', { sparkleSize: 1 })]
        }
    }
};

// ===========================================================================
// PROPS – crystals, star flowers, glowing mushrooms, the star tree
// ===========================================================================
const CRYS = {
    cyan: { b: '#5ad4ff', l1: '#a8f0ff', l2: '#e8fdff', d1: '#3a94e0', d2: '#2a62b8' },
    violet: { b: '#a47cff', l1: '#cdb4ff', l2: '#f0e6ff', d1: '#7a52e0', d2: '#5536b0' },
    pink: { b: '#ff7cc8', l1: '#ffb4e0', l2: '#fff0fa', d1: '#e0529e', d2: '#b0367a' }
};
const ROCK = { b: '#4a3d78', l1: '#6a5a9e', d1: '#342a5a', d2: '#241c44' };

/** One crystal prism: base centre (x, y), width w, height h, lean (px at the tip). */
function prism(s, x, y, w, h, lean, R) {
    const hw = w / 2;
    const tip = Math.max(2, Math.round(w * 0.7));
    const pts = [
        [x - hw, y + 1],
        [x - hw + lean * (1 - tip / h), y - h + tip],
        [x + lean, y - h],
        [x + hw + lean * (1 - tip / h), y - h + tip],
        [x + hw, y + 1]
    ];
    s.poly(pts, R.b);
    // lit left face, shaded right edge, bright ridge
    const leftFace = [[x - hw, y + 1], [x - hw + lean * (1 - tip / h), y - h + tip], [x + lean, y - h], [x + lean * 0.1, y + 1]];
    s.poly(leftFace, R.l1);
    s.line(Math.round(x + lean * 0.1), y, Math.round(x + lean), y - h + 1, R.l2);
    s.line(Math.round(x + hw - 1), y, Math.round(x + hw - 1 + lean * (1 - tip / h)), y - h + tip, R.d1);
    s.px(Math.round(x + lean), y - h, '#ffffff');
}

function rockBase(s, x0, x1, y) {
    // a few rounded stones the crystals grow out of
    const r = new Sprite(s.w, s.h);
    const w = x1 - x0 + 1;
    r.oval(x0, y - 2, Math.ceil(w * 0.55), 4, ROCK.b);
    r.oval(x0 + Math.floor(w * 0.35), y - 3, Math.ceil(w * 0.45), 5, ROCK.b);
    r.oval(x1 - Math.ceil(w * 0.35) + 1, y - 1, Math.ceil(w * 0.35), 3, ROCK.b);
    rimShade(r, ROCK, { top: 1, bottom: 1, right: 1 });
    s.stamp(r, 0, 0);
}

/** clusters: list of [x, h, w, lean, colour] on a ground row; twinkle marks one tip. */
function crystalCluster(s, prisms, { twinkle = null, glow = 'cyan', rock = null } = {}) {
    const G = s.h - 1;
    for (const [x, h, w, lean, col] of prisms) prism(s, x, G - 2, w, h, lean, CRYS[col]);
    if (rock) rockBase(s, rock[0], rock[1], G - 1);
    halo(s, CRYS[glow].b, 0.28, [2]);
    halo(s, CRYS[glow].b, 0.1, [3]);
    if (twinkle) sparkle(s, twinkle[0], twinkle[1], 1, '#ffffff', CRYS[glow].l1);
}

/** A five-pointed star leaf/bloom at centre (cx, cy), 5×5. */
function star5(s, cx, cy, c, core) {
    s.map(cx - 2, cy - 2, ['..a..', '.aaa.', 'aaaaa', '.aaa.', '.a.a.'], { a: c });
    if (core) s.px(cx, cy, core);
}
/** Bigger star, 7×7. */
function star7(s, cx, cy, c, light, core) {
    s.map(cx - 3, cy - 3, [
        '...a...',
        '...a...',
        '.aaaaa.',
        'aaaaaaa',
        '..aaa..',
        '.aa.aa.',
        '.a...a.'
    ], { a: c });
    if (light) { s.px(cx - 1, cy - 1, light); s.px(cx, cy - 2, light); s.px(cx - 2, cy, light); }
    if (core) s.px(cx, cy, core);
}

function starFlower(s, { big = true, color = 'gold', twinkle = 0 } = {}) {
    const G = s.h - 1;
    const cx = Math.floor(s.w / 2);
    const P = {
        gold: ['#ffd84a', '#fff6c0'],
        pink: ['#ff8ad0', '#ffe0f4'],
        cyan: ['#6ae8ff', '#e0fcff']
    }[color];
    const stem = '#3aa88a';
    const leaf = '#52c89a';
    if (big) {
        s.vline(cx, G - 3, G, stem);
        s.px(cx - 1, G - 1, leaf);
        s.px(cx - 2, G - 2, leaf);
        s.px(cx + 1, G - 2, leaf);
        star5(s, cx, G - 5, lit(P[0]), lit(P[1]));
    } else {
        s.vline(cx, G - 2, G, stem);
        s.px(cx + 1, G - 1, leaf);
        s.px(cx - 1, G - 1, leaf);
        s.map(cx - 2, G - 5, ['..a..', 'aabaa', '.a.a.'], { a: lit(P[0]), b: lit(P[1]) });
    }
    halo(s, P[0], 0.26, [2]);
    if (twinkle) sparkle(s, cx + (big ? 3 : 2), G - (big ? 8 : 6), 0, '#ffffff', '#ffffff');
}

function glowShroom(s, { big = true, twinkle = 0 } = {}) {
    const G = s.h - 1;
    const cap = big ? ramp('#9a5ae8') : ramp('#4d7cf0');
    const spot = lit(big ? '#8ff6ff' : '#ffc4f0');
    const key = {
        c: cap.b, C: cap.l1, H: cap.l2, d: cap.d1, D: cap.d2, s: spot,
        g: lit('#c8f8ff'), w: '#ece4ff', W: '#ffffff', v: '#c4b8ec'
    };
    const rows = big ? [
        '...CCcc...',
        '..CHCcscd.',
        '.CCcccccdd',
        '.Csccsccd.',
        'CccccccsdD',
        'DdddddddDD',
        '.ggggggg..',
        '....Wwv...',
        '....wwv...',
        '...wwwvv..'
    ] : [
        '..CCc...',
        '.CHcsd..',
        'CcsccdD.',
        'cccccsdD',
        'Ddddddd.',
        '.ggggg..',
        '...Wv...',
        '..wwvv..'
    ];
    const x0 = Math.floor((s.w - rows[0].length) / 2);
    s.map(x0, G - rows.length + 1, rows, key);
    halo(s, big ? '#b88cff' : '#7aa8ff', 0.26, [2]);
    if (twinkle) sparkle(s, x0 + (big ? 8 : 6), G - rows.length - 1, 0, '#ffffff', '#ffffff');
}

function starTree(s, f) {
    const G = s.h - 1;
    const bark = { b: '#5a3f7a', l1: '#7a5c9e', d1: '#402a5c', d2: '#2c1c44' };
    // roots and a gently curving trunk
    const t = new Sprite(s.w, s.h);
    t.poly([[10, G + 1], [14, G - 3], [13, G - 9], [15, G - 15], [18, G - 15], [17, G - 9], [18, G - 3], [22, G + 1]], bark.b);
    t.thick(15, G - 14, 9, G - 19, 2, bark.b);
    t.thick(17, G - 14, 23, G - 20, 2, bark.b);
    rimShade(t, bark, { top: 0, bottom: 0, right: 1 });
    t.line(14, G - 3, 14, G - 8, bark.l1);
    t.line(15, G - 9, 16, G - 14, bark.l1);
    s.stamp(t, 0, 0);
    // crown: a dark foliage mass edged with big star-shaped leaves
    const leaf = ramp('#2fb8a8');
    const cx = 16;
    const cy = 14;
    s.oval(cx - 11, cy - 9, 23, 17, leaf.d1);
    const ring = [];
    for (let i = 0; i < 9; i += 1) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 9;
        ring.push([Math.round(cx + Math.cos(a) * 11), Math.round(cy + Math.sin(a) * 8)]);
    }
    for (const [x, y] of ring) star7(s, x, y, leaf.b, leaf.l1, null);
    for (const [x, y] of [[cx - 5, cy - 3], [cx + 5, cy - 3], [cx, cy + 2], [cx - 6, cy + 3], [cx + 6, cy + 3], [cx, cy - 5]]) star7(s, x, y, leaf.b, leaf.l1, null);
    // glowing star leaves
    const glowing = [[cx, cy - 7, '#ffd84a'], [cx - 7, cy - 1, '#ff8ad0'], [cx + 7, cy - 2, '#6ae8ff'], [cx - 2, cy + 3, '#ffd84a'], [cx + 5, cy + 5, '#b890ff']];
    glowing.forEach(([x, y, c], i) => {
        const bright = (i + f) % 2 === 0;
        star5(s, x, y, lit(bright ? c : mix(c, '#ffffff', 0.3)), lit('#ffffff'));
    });
    halo(s, '#7ff0e0', 0.16, [2]);
    if (f) sparkle(s, 29, 3, 1, '#ffffff', '#fff2a0');
    else sparkle(s, 3, 7, 1, '#ffffff', '#9ff6ff');
}

function moonStone(s, f) {
    const R = { b: '#8a86c8', l1: '#b4b2e8', l2: '#dcdcff', d1: '#62609e', d2: '#44427a' };
    const y = 3;
    s.poly([[2, y + 1], [5, y - 1], [10, y - 1], [13, y + 1], [11, y + 4], [8, y + 6], [5, y + 4]], R.b);
    s.hline(4, 11, y - 1, R.l1);
    s.hline(3, 12, y, R.l1);
    s.hline(6, 9, y - 1, R.l2);
    s.line(11, y + 2, 8, y + 5, R.d1);
    s.px(8, y + 6, R.d2);
    // a glowing crescent on its face
    s.map(6, y + 1, ['.m', 'm.', '.m'], { m: lit(f ? '#fff6c8' : '#ffe08a') });
    halo(s, '#c8c4ff', f ? 0.34 : 0.24, [2]);
    halo(s, '#c8c4ff', 0.1, [3]);
}

const prop = (name, w, h, frames, anchor) => ({
    name,
    sheet: 'props-star',
    w,
    h,
    anchor: anchor || [Math.floor(w / 2), h - 1],
    outlineOptions,
    anims: { idle: frames }
});

const starProps = [
    prop('p-crystal', 18, 21, [0, 1].map((f) => (s) => crystalCluster(s, [
        [6, 8, 4, -2, 'violet'], [12, 9, 4, 2, 'pink'], [9, 14, 5, 0, 'cyan']
    ], { glow: 'cyan', rock: [4, 14], twinkle: f ? [9, 3] : null }))),
    prop('p-crystal2', 16, 17, [0, 1].map((f) => (s) => crystalCluster(s, [
        [5, 6, 3, -2, 'cyan'], [9, 10, 4, 1, 'pink'], [11, 5, 3, 2, 'violet']
    ], { glow: 'pink', rock: [3, 13], twinkle: f ? [10, 3] : null }))),
    prop('p-crystal3', 22, 25, [0, 1].map((f) => (s) => crystalCluster(s, [
        [5, 9, 4, -3, 'cyan'], [16, 10, 4, 3, 'pink'], [8, 14, 5, -1, 'violet'], [13, 18, 6, 1, 'violet'], [11, 7, 3, 0, 'cyan']
    ], { glow: 'violet', rock: [3, 18], twinkle: f ? [14, 3] : null }))),
    prop('p-starflower', 10, 11, [0, 1].map((f) => (s) => starFlower(s, { big: true, color: 'gold', twinkle: f }))),
    prop('p-starflower2', 9, 10, [0, 1].map((f) => (s) => starFlower(s, { big: false, color: 'pink', twinkle: f }))),
    prop('p-glowshroom', 14, 14, [0, 1].map((f) => (s) => glowShroom(s, { big: true, twinkle: f }))),
    prop('p-glowshroom2', 12, 12, [0, 1].map((f) => (s) => glowShroom(s, { big: false, twinkle: f }))),
    prop('p-startree', 34, 38, [0, 1].map((f) => (s) => starTree(s, f))),
    prop('p-moonstone', 16, 12, [0, 1].map((f) => (s) => moonStone(s, f)), [8, 5])
];

export default [
    starTiger,
    starTigerDad,
    starWhale,
    ...Object.keys(LUMA_COLORS).map(lumaDef),
    firefly,
    starDeer,
    moonRabbit,
    ...starProps
];
