/*
 * Savannen – the golden-hour savanna island of "Miras Stjärnsafari".
 *
 * Animals go on the 'animals-savanna' sheet, props on 'props-savanna'.
 * Everything faces right; ground animals and props stand on the bottom row
 * (anchor = bottom centre of the feet). Swimmers are cut at the waterline.
 *
 * Each species has one parametric painter; the frames are built from it.
 */
import { ramp, mix, rgba, toHex } from './kit.mjs';

// ===========================================================================
// Shared helpers
// ===========================================================================
const EYE = '#2a1a1a';
const SPARK = '#ffffff';
const BLUSH = '#f7919c';
const MOUTH = '#9c3048';
const MOUTH_IN = '#b23d5c';
const TONGUE = '#ff9aaa';
const TOOTH = '#fff8ec';

const hex = (c) => toHex(rgba(c));

// Effect colours (water drops, dust, snorts). The outline pass skips them so
// small drops and puffs stay light and airy instead of turning into dark beads.
const WATER = ['#fdfeff', '#c4ecff', '#8ad0fb', '#5cb2ec'];
const DUST = ['#f3e2c0', '#e0c79e', '#c9ab82'];
const PUFF = ['#fbf8f4', '#e6e1ea', '#fff3b8'];
const FX = new Set([...WATER, ...DUST, ...PUFF].map((c) => c.toLowerCase()));
const fxSkip = (r, g, b) => FX.has(toHex([r, g, b]));

/** Draw into a bigger frame with an offset (so one painter serves several frame sizes). */
function view(s, dx, dy) {
    const v = Object.create(s);
    v.base = s.base || s;
    v.dx = (s.dx || 0) + dx;
    v.dy = (s.dy || 0) + dy;
    v.px = (x, y, c) => { s.px(Math.round(x) + dx, Math.round(y) + dy, c); return v; };
    v.get = (x, y) => s.get(x + dx, y + dy);
    v.opaque = (x, y) => s.opaque(x + dx, y + dy);
    v.inside = (x, y) => s.inside(x + dx, y + dy);
    v.point = (n, x, y) => { s.point(n, x + dx, y + dy); return v; };
    return v;
}

function colorAt(s, x, y) {
    const [r, g, b, a] = s.get(x, y);
    return a ? toHex([r, g, b]) : null;
}

/** Recolour pixels where test(x, y) holds, through a colour->colour map (keeps shading). */
function remap(s, test, map) {
    const base = s.base || s;
    const dx = s.dx || 0;
    const dy = s.dy || 0;
    const m = {};
    for (const [k, v] of Object.entries(map)) m[hex(k)] = v;
    for (let y = 0; y < base.h; y += 1) {
        for (let x = 0; x < base.w; x += 1) {
            if (!test(x - dx, y - dy)) continue;
            const c = colorAt(base, x, y);
            if (c && m[c]) base.px(x, y, m[c]);
        }
    }
}

function rampMap(from, to) {
    const m = {};
    for (const k of ['d2', 'd1', 'b', 'l1', 'l2']) if (from[k] && to[k]) m[from[k]] = to[k];
    return m;
}

/** Erase everything below row y (swimmers, animals popping out of holes). */
function clipBelow(s, y) {
    const base = s.base || s;
    const yy0 = y + (s.dy || 0) + 1;
    for (let yy = yy0; yy < base.h; yy += 1) {
        for (let x = 0; x < base.w; x += 1) base.px(x, yy, null);
    }
}

/** Recolour the pixels along a line (stripes painted onto existing fur). */
function stripeLine(s, x0, y0, x1, y1, map) {
    const pts = new Set();
    const probe = { px: (x, y) => { pts.add(`${Math.round(x)},${Math.round(y)}`); } };
    s.line.call(Object.assign(Object.create(Object.getPrototypeOf(s.base || s)), probe), x0, y0, x1, y1, '#000');
    remap(s, (x, y) => pts.has(`${x},${y}`), map);
}

function hash(a, b) {
    let h = (a * 374761393 + b * 668265263) >>> 0;
    h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}

/** Side-view eye: 2×2 with a sparkle, or closed / happy / wide. */
function eye(s, x, y, mode = 'open', color = EYE) {
    if (mode === 'open') {
        s.rect(x, y, 2, 2, color);
        s.px(x + 1, y, SPARK);
    } else if (mode === 'closed') {
        s.hline(x, x + 1, y + 1, color);
    } else if (mode === 'happy') {
        s.px(x, y + 1, color);
        s.px(x + 1, y, color);
        s.px(x + 2, y + 1, color);
    } else if (mode === 'sleepy') {
        s.hline(x, x + 1, y + 1, color);
        s.px(x - 1, y + 1, color);
    }
}

/**
 * A leg from the hip (hx, hy) down to the ground, the foot shifted by dx and
 * lifted by lift. Returns the foot box for hooves/paws.
 */
function leg(s, hx, hy, dx, lift, ground, t, col, hoof = null, hoofH = 1) {
    const off = Math.floor((t - 1) / 2);
    const fx = hx + dx;
    const fy = ground - lift - (t - 1) + off;
    s.thick(hx, hy, fx, fy, t, col);
    if (hoof) s.rect(fx - off, ground - lift - hoofH + 1, t, hoofH, hoof);
    return { x: fx - off, y: ground - lift, w: t };
}

// Four-frame walk: pair a = near front + far back, pair b = far front + near back.
const GAIT = [
    { a: [1, 0], b: [-1, 0], bob: 0 },
    { a: [0, 0], b: [0, 1], bob: -1 },
    { a: [-1, 0], b: [1, 0], bob: 0 },
    { a: [0, 1], b: [0, 0], bob: -1 }
];

function legsFor(phase, stride = 1, liftScale = 1) {
    if (phase === null || phase === undefined) {
        const z = [0, 0];
        return { nf: z, fb: z, ff: z, nb: z, bob: 0 };
    }
    const g = GAIT[phase];
    const a = [g.a[0] * stride, g.a[1] * liftScale];
    const b = [g.b[0] * stride, g.b[1] * liftScale];
    return { nf: a, fb: a, ff: b, nb: b, bob: g.bob };
}

const frames = (list, fn) => list.map((o) => (s) => fn(s, o));

/**
 * Give every animation of a definition some air (default 2 px left, right and
 * top) so the automatic outline is never cut off. Anchors and points move with
 * the drawing; the ground row stays the last row.
 */
function padDef(def, { l = 2, r = 2, t = 2 } = {}) {
    const anims = {};
    for (const [name, spec] of Object.entries(def.anims)) {
        const list = Array.isArray(spec) ? spec : spec.frames;
        const w = (!Array.isArray(spec) && spec.w) || def.w;
        const h = (!Array.isArray(spec) && spec.h) || def.h;
        const anchor = (!Array.isArray(spec) && spec.anchor) || def.anchor;
        anims[name] = {
            ...(Array.isArray(spec) ? {} : spec),
            w: w + l + r,
            h: h + t,
            anchor: [anchor[0] + l, anchor[1] + t],
            frames: list.map((paint) => (s, i) => paint(view(s, l, t), i))
        };
    }
    return { ...def, w: def.w + l + r, h: def.h + t, anchor: [def.anchor[0] + l, def.anchor[1] + t], anims };
}


/**
 * Reticulated pattern (giraffe patches): jittered seeds on a grid, each pixel
 * belongs to its nearest seed, and pixels near a cell border stay light.
 */
function reticulate(s, x0, y0, test, map, { cell = 5, gap = 1.15, seed = 1, keep = null } = {}) {
    remap(s, (x, y) => {
        if (!test(x, y)) return false;
        const gx = Math.floor((x - x0) / cell);
        const gy = Math.floor((y - y0) / cell);
        let d1 = 1e9;
        let d2 = 1e9;
        let near = null;
        for (let j = gy - 1; j <= gy + 1; j += 1) {
            for (let i = gx - 1; i <= gx + 1; i += 1) {
                const h = hash(i + seed * 31, j + seed * 17);
                const sx = x0 + i * cell + 1 + (h % (cell - 1));
                const sy = y0 + j * cell + 1 + ((h >>> 8) % (cell - 1));
                const d = Math.hypot(x + 0.5 - sx, y + 0.5 - sy);
                if (d < d1) { d2 = d1; d1 = d; near = [sx, sy]; } else if (d < d2) d2 = d;
            }
        }
        if (keep && !keep(near[0], near[1])) return false;
        return d2 - d1 > gap;
    }, map);
}

// ===========================================================================
// GIRAFFE – very tall, orange-brown patches on cream, ossicones
// ===========================================================================
const GIR = ramp('#f7dfb2');
const GSPOT = ramp('#d9782f');
const GMUZ = ramp('#fcebd2');
const GHOOF = '#5a3830';
const GKNOB = '#5e3529';
const GTONGUE = ramp('#8a52b4');

/** Side head; (x, y) is the top-left of its box (ossicones on row y). */
function giraffeHeadSide(s, x, y, { eyes = 'open', mouth = 'smile', leaves = 0 } = {}) {
    // ear pointing back
    s.poly([[x + 2, y + 4], [x - 2, y + 3], [x - 2, y + 5], [x + 2, y + 6]], GIR.d1);
    s.px(x - 1, y + 4, '#f3b7a8');
    // ossicones with dark round tips
    s.vline(x + 4, y + 1, y + 3, GIR.d1);
    s.vline(x + 7, y + 1, y + 3, GIR.d1);
    s.hline(x + 3, x + 4, y, GKNOB);
    s.hline(x + 6, x + 7, y, GKNOB);
    s.px(x + 4, y + 1, GKNOB);
    s.px(x + 7, y + 1, GKNOB);
    // cranium and a soft muzzle
    s.ball(x + 1, y + 2, 9, 8, GIR);
    s.ball(x + 6, y + 4, 7, 6, GMUZ);
    s.px(x + 3, y + 3, GSPOT.b);                      // a little patch on the forehead
    s.px(x + 11, y + 5, GIR.d2);                      // nostril
    const ex = x + 4;
    const ey = y + 4;
    eye(s, ex, ey, eyes);
    s.px(ex, ey + 3, BLUSH);
    s.px(ex + 1, ey + 3, BLUSH);
    if (mouth === 'smile') {
        s.hline(x + 9, x + 10, y + 8, MOUTH);
        s.px(x + 11, y + 7, MOUTH);
    } else if (mouth === 'chew') {
        s.hline(x + 9, x + 11, y + 8, MOUTH);
    } else if (mouth === 'open') {
        s.hline(x + 9, x + 11, y + 7, MOUTH);
        s.hline(x + 9, x + 10, y + 8, TONGUE);
    }
    s.point('mouth', x + 10, y + 8);
    if (leaves) {
        // a sprig of acacia leaves in the mouth
        const lx = x + 11;
        const ly = y + 8 + (leaves === 2 ? 1 : 0);
        s.line(lx - 1, ly, lx + 3, ly - 2, '#6d5a3a');
        s.px(lx + 1, ly - 2, '#8fb04a');
        s.px(lx + 2, ly, '#6f9338');
        s.px(lx + 3, ly - 3, '#a9c65a');
        s.px(lx + 4, ly - 2, '#8fb04a');
        s.px(lx + 3, ly - 1, '#6f9338');
    }
}

/** Front-facing head; (cx, y) is the top centre. */
function giraffeHeadFront(s, cx, y, { eyes = 'open', mouth = 'smile', tongue = 0 } = {}) {
    // ears sticking out sideways
    s.poly([[cx - 3, y + 4], [cx - 7, y + 3], [cx - 7, y + 5], [cx - 3, y + 6]], GIR.b);
    s.poly([[cx + 4, y + 4], [cx + 8, y + 3], [cx + 8, y + 5], [cx + 4, y + 6]], GIR.d1);
    s.px(cx - 6, y + 4, '#f3b7a8');
    s.px(cx + 7, y + 4, '#f3b7a8');
    // ossicones
    s.vline(cx - 2, y + 1, y + 3, GIR.d1);
    s.vline(cx + 3, y + 1, y + 3, GIR.d1);
    s.hline(cx - 3, cx - 2, y, GKNOB);
    s.hline(cx + 3, cx + 4, y, GKNOB);
    s.px(cx - 2, y + 1, GKNOB);
    s.px(cx + 3, y + 1, GKNOB);
    // head: rounded top, narrower muzzle below
    s.ball(cx - 4, y + 2, 10, 8, GIR);
    s.ball(cx - 3, y + 7, 8, 5, GMUZ);
    s.px(cx, y + 3, GSPOT.b);
    s.px(cx + 1, y + 3, GSPOT.b);
    s.px(cx, y + 4, GSPOT.d1);
    const ey = y + 5;
    const e1 = cx - 3;
    const e2 = cx + 2;
    if (eyes === 'open') {
        eye(s, e1, ey, 'open');
        eye(s, e2, ey, 'open');
    } else if (eyes === 'happy') {
        s.px(e1, ey + 1, EYE);
        s.px(e1 + 1, ey, EYE);
        s.px(e2, ey, EYE);
        s.px(e2 + 1, ey + 1, EYE);
    } else {
        s.hline(e1, e1 + 1, ey + 1, EYE);
        s.hline(e2, e2 + 1, ey + 1, EYE);
    }
    s.px(e1 - 1, ey + 2, BLUSH);
    s.px(e2 + 2, ey + 2, BLUSH);
    s.px(cx - 1, y + 8, GIR.d2);                      // nostrils
    s.px(cx + 2, y + 8, GIR.d2);
    const my = y + 10;
    s.point('mouth', cx, my);
    if (tongue) {
        const T = GTONGUE;
        s.hline(cx - 1, cx + 2, my, MOUTH);
        if (tongue === 1) {
            // tongue peeking out
            s.rect(cx, my + 1, 2, 2, T.b);
            s.px(cx, my + 1, T.l1);
            s.px(cx + 1, my + 2, T.d1);
            s.point('tongue', cx + 1, my + 2);
        } else {
            // a long, floppy purple "bleh!" tongue with a round tip
            s.rect(cx - 1, my + 1, 4, 2, T.b);
            s.thick(cx, my + 2, cx + 3, my + 8, 4, T.b);
            s.oval(cx + 1, my + 7, 6, 5, T.b);
            s.line(cx - 1, my + 1, cx + 1, my + 6, T.l1);
            s.px(cx, my + 1, T.l2);
            s.px(cx + 2, my + 8, T.l1);
            s.line(cx + 2, my + 3, cx + 4, my + 8, T.d1);
            s.hline(cx + 3, cx + 5, my + 11, T.d1);
            s.px(cx + 6, my + 9, T.d1);
            s.point('tongue', cx + 4, my + 11);
        }
        } else if (mouth === 'smile') {
        s.px(cx - 1, my - 1, MOUTH);
        s.hline(cx, cx + 1, my, MOUTH);
        s.px(cx + 2, my - 1, MOUTH);
    } else {
        s.hline(cx, cx + 1, my - 1, MOUTH);
    }
}

function giraffe(s, o = {}) {
    const { phase = null, bob = 0, head = 'side', eyes = 'open', mouth = 'smile', tail = 0, tongue = 0, reach = 0, leaves = 0 } = o;
    const G = 51;
    const L = legsFor(phase, 3, 2);
    const B = bob + L.bob;
    // far legs (darker, peeking out beside the near ones)
    const far = mix(GIR.d1, GIR.d2, 0.35);
    leg(s, 8, 33 + B, L.fb[0], L.fb[1], G, 2, far, GHOOF, 2);
    leg(s, 19, 33 + B, L.ff[0] + (phase === null ? -1 : 0), L.ff[1], G, 2, far, GHOOF, 2);
    // tail with a tuft
    const tx = tail ? 1 : 0;
    s.line(6, 28 + B, 4 - tx, 37 + B, GIR.d1);
    s.rect(3 - tx, 37 + B, 2, 3, GSPOT.d2);
    s.px(3 - tx, 37 + B, GSPOT.d1);
    // neck: from the shoulders up to the head (reach stretches it up for eating)
    const topX = 28 - reach;
    const topY = 12 - reach * 2;
    s.poly([[15, 28 + B], [25, 31 + B], [topX + 3, topY + 1], [topX - 2, topY - 1]], GIR.b);
    s.line(24, 30 + B, topX + 2, topY + 2, GIR.d1);        // throat shade
    // body with a higher shoulder
    s.ball(6, 26 + B, 18, 10, GIR);
    s.ball(14, 23 + B, 11, 11, GIR, { dark: false });
    s.hline(10, 20, 35 + B, GIR.d1);
    // patches on body and neck (not on the belly)
    reticulate(s, 4, 22 + B, (x, y) => y < 34 + B && y > topY + 2, rampMap(GIR, GSPOT),
        { cell: 5, seed: 3, keep: (sx, sy) => sy < 32 + B });
    // short mane along the back of the neck
    s.line(topX - 3, topY, 16, 26 + B, GSPOT.d1);
    s.line(topX - 2, topY, 17, 26 + B, GSPOT.b);
    // near legs
    leg(s, 11, 34 + B, L.nb[0] + (phase === null ? 1 : 0), L.nb[1], G, 2, GIR.b, GHOOF, 2);
    leg(s, 22, 34 + B, L.nf[0] + (phase === null ? 1 : 0), L.nf[1], G, 2, GIR.b, GHOOF, 2);
    s.vline(11, 36 + B, 40 + B, GIR.l1);
    if (head === 'side') {
        giraffeHeadSide(s, topX - 5, topY - 10, { eyes, mouth, leaves });
        s.point('head', topX, topY - 10);
    } else {
        giraffeHeadFront(s, topX, topY - 11, { eyes, mouth, tongue });
        s.point('head', topX, topY - 11);
    }
}

// taller frames for the reaching-up and the tongue poses
const giraffeUp = (o) => (s) => giraffe(view(s, 0, 5), o);

const giraffeDef = {
    name: 'a-giraffe',
    sheet: 'animals-savanna',
    w: 36,
    h: 52,
    anchor: [16, 51],
    anims: {
        idle: frames([{}, { bob: 1, tail: 1 }], giraffe),
        blink: frames([{ eyes: 'closed' }], giraffe),
        walk: frames([0, 1, 2, 3].map((phase) => ({ phase, tail: phase % 2 })), giraffe),
        eat: { w: 36, h: 57, anchor: [16, 56], frames: [
            giraffeUp({ reach: 3, leaves: 1, mouth: 'chew' }),
            giraffeUp({ reach: 3, leaves: 2, mouth: 'open', bob: 1 })
        ] },
        look: frames([{ head: 'front' }], giraffe),
        special: frames([{ head: 'front', tongue: 1, eyes: 'happy' }, { head: 'front', tongue: 2, eyes: 'happy' }], giraffe)
    }
};


// ===========================================================================
// ZEBRA – bold black-and-white stripes, upright mane
// ===========================================================================
const ZW = { l2: '#ffffff', l1: '#ffffff', b: '#f4f0ea', d1: '#d5cedd', d2: '#aca4bf' };
const ZS = { l2: '#4d4260', l1: '#433a55', b: '#302839', d1: '#282131', d2: '#211b29' };
const ZMUZ = ramp('#4b4152');
const ZHOOF = '#2a2233';
const Z2S = rampMap(ZW, ZS);

/** Zebra head in profile; (x, y) = top-left of the ears. */
function zebraHeadSide(s, x, y, { eyes = 'open', mouth = 'smile' } = {}) {
    // ears: white with dark tips and a pink inside
    s.rect(x + 1, y + 1, 2, 3, ZW.b);
    s.px(x + 1, y, ZS.b);
    s.px(x + 2, y + 2, '#f3b7c0');
    s.rect(x + 4, y + 1, 2, 3, ZW.d1);
    s.px(x + 5, y, ZS.d1);
    // a big round cranium and a soft snout, dark muzzle at the tip
    s.ball(x, y + 3, 9, 7, ZW);
    s.ball(x + 3, y + 5, 8, 6, ZW);
    remap(s, (px, py) => px >= x + 8 && py >= y + 5 && py <= y + 11, rampMap(ZW, ZMUZ));
    s.px(x + 9, y + 6, ZMUZ.l1);
    s.px(x + 10, y + 7, '#1f1a24');                   // nostril
    // stripes kept away from the eye: forehead, cheek and nose
    s.hline(x + 2, x + 4, y + 3, ZS.b);
    s.line(x, y + 6, x + 1, y + 8, ZS.b);
    s.vline(x + 3, y + 8, y + 9, ZS.b);
    s.vline(x + 6, y + 9, y + 10, ZS.b);
    eye(s, x + 5, y + 5, eyes);
    s.px(x + 5, y + 8, BLUSH);
    s.point('mouth', x + 9, y + 10);
    if (mouth === 'smile') {
        s.hline(x + 9, x + 10, y + 10, '#1f1a24');
    } else if (mouth === 'chew') {
        s.hline(x + 9, x + 10, y + 10, '#ff9aaa');
    }
}

/** Zebra face turned to the viewer; (cx, y) = top centre (ear tips). */
function zebraHeadFront(s, cx, y, { eyes = 'open' } = {}) {
    // ears
    s.rect(cx - 4, y + 1, 2, 3, ZW.b);
    s.rect(cx + 3, y + 1, 2, 3, ZW.d1);
    s.px(cx - 4, y, ZS.b);
    s.px(cx + 4, y, ZS.b);
    s.px(cx - 3, y + 2, '#f3b7c0');
    s.px(cx + 3, y + 2, '#f3b7c0');
    // long white face with a small dark muzzle
    s.ball(cx - 4, y + 3, 9, 8, ZW);
    s.ball(cx - 3, y + 7, 7, 6, ZW);
    s.oval(cx - 2, y + 10, 5, 3, ZMUZ.b);
    s.px(cx - 1, y + 10, ZMUZ.l1);
    s.px(cx + 1, y + 10, ZMUZ.l1);
    // stripes away from the eyes: forehead and nose bridge
    s.hline(cx - 2, cx - 1, y + 4, ZS.b);
    s.hline(cx + 1, cx + 2, y + 4, ZS.b);
    s.hline(cx - 1, cx + 1, y + 8, ZS.b);
    s.px(cx - 4, y + 8, ZS.b);
    s.px(cx + 4, y + 8, ZS.b);
    // forelock between the ears
    s.px(cx, y + 2, ZS.b);
    s.px(cx, y + 3, ZS.b);
    if (eyes === 'open') {
        eye(s, cx - 3, y + 5, 'open');
        eye(s, cx + 2, y + 5, 'open');
    } else {
        s.hline(cx - 3, cx - 2, y + 6, EYE);
        s.hline(cx + 2, cx + 3, y + 6, EYE);
    }
    s.px(cx - 3, y + 7, BLUSH);
    s.px(cx + 3, y + 7, BLUSH);
    s.point('mouth', cx, y + 12);
}

/** Head down to the grass; (x, y) = top-left of the ear. */
function zebraHeadGraze(s, x, y, { mouth = 'chew' } = {}) {
    s.rect(x, y, 2, 3, ZW.d1);                        // ear
    s.px(x, y, ZS.b);
    s.ball(x, y + 2, 7, 6, ZW);
    s.ball(x + 2, y + 5, 6, 6, ZW);
    remap(s, (px, py) => py >= y + 9 && px >= x + 2, rampMap(ZW, ZMUZ));
    s.hline(x + 3, x + 6, y + 7, ZS.b);
    s.px(x + 1, y + 4, ZS.b);
    eye(s, x + 3, y + 3, 'happy');
    s.px(x + 5, y + 6, BLUSH);
    s.point('mouth', x + 5, y + 10);
    if (mouth === 'open') s.hline(x + 4, x + 6, y + 10, '#ff9aaa');
}

// gallop poses: foot [dx, lift] per leg, body bob and head nod
const GALLOP = [
    { fb: [-4, 1], nb: [-5, 2], ff: [5, 3], nf: [6, 2], bob: -2, nod: -1 },
    { fb: [-2, 3], nb: [-1, 4], ff: [3, 1], nf: [1, 0], bob: -1, nod: 1 },
    { fb: [2, 3], nb: [3, 2], ff: [-2, 3], nf: [-3, 2], bob: -2, nod: 0 },
    { fb: [-1, 0], nb: [-2, 0], ff: [4, 4], nf: [3, 3], bob: 0, nod: -1 }
];

function zebra(s, o = {}) {
    const { phase = null, gallop = null, bob = 0, head = 'side', eyes = 'open', mouth = 'smile', tail = 0, graze = 0 } = o;
    const G = 24;
    let L = legsFor(phase, 2);
    let nod = 0;
    if (gallop !== null) {
        const g = GALLOP[gallop];
        L = { fb: g.fb, nb: g.nb, ff: g.ff, nf: g.nf, bob: g.bob };
        nod = g.nod;
    }
    const stand = phase === null && gallop === null;
    const B = bob + L.bob;
    // far legs
    const fl = [
        leg(s, 7, 14 + B, L.fb[0], L.fb[1], G, 2, ZW.d1),
        leg(s, 16, 14 + B, L.ff[0] + (stand ? 1 : 0), L.ff[1], G, 2, ZW.d1)
    ];
    // tail
    if (gallop !== null) {
        const w = gallop % 2;
        s.line(5, 11 + B, 2, 10 + B + w, ZW.d1);
        s.rect(0, 9 + B + w, 3, 2, ZS.b);
    } else {
        const tx = tail ? 1 : 0;
        s.line(5, 11 + B, 4 - tx, 17 + B, ZW.d1);
        s.rect(3 - tx, 17 + B, 2, 3, ZS.b);
    }
    // neck
    const hx = 20;
    const hy = nod;
    if (graze) {
        s.poly([[13, 10 + B], [20, 14 + B], [26, 17], [23, 13]], ZW.b);
        s.line(20, 14 + B, 25, 17, ZW.d1);
    } else {
        s.poly([[14, 11 + B], [20, 15 + B], [25, hy + 8], [21, hy + 4]], ZW.b);
        s.line(20, 14 + B, 24, hy + 8, ZW.d1);
    }
    // body
    s.ball(5, 9 + B, 17, 8, ZW);
    // stripes: vertical on the body, bending on the rump
    remap(s, (x, y) => {
        if (y > 15 + B || y < 9 + B) return false;
        if (x < 9) return (y - B + x) % 3 === 0;
        return x % 3 === 0 && x < 20;
    }, Z2S);
    // stripes across the neck
    if (graze) {
        for (const [a, b] of [[[16, 9 + B], [17, 14 + B]], [[19, 11 + B], [20, 15 + B]], [[22, 12], [22, 16]]]) stripeLine(s, a[0], a[1], b[0], b[1], Z2S);
    } else {
        for (const [a, b] of [[[16, 9 + B], [20, 13 + B]], [[18, 6 + B], [22, 10 + B]], [[20, hy + 4], [24, hy + 7]]]) stripeLine(s, a[0], a[1], b[0], b[1], Z2S);
    }
    s.hline(8, 18, 16 + B, ZS.d1);                                        // belly line
    // upright striped mane along the top of the neck
    const mane = (x, y, i) => s.vline(x, y - 2, y - 1, i % 2 ? '#e8e2ea' : ZS.b);
    if (!graze) {
        for (let i = 0; i <= 6; i += 1) mane(20 - i, hy + 4 + Math.round((i * (7 + B - hy)) / 6), i);
    } else {
        for (let i = 0; i <= 7; i += 1) mane(14 + i, 10 + B + Math.round(i * 0.45), i);
    }
    // near legs, striped on top
    const nl = [
        leg(s, 11, 15 + B, L.nb[0], L.nb[1], G, 2, ZW.b),
        leg(s, 20, 15 + B, L.nf[0], L.nf[1], G, 2, ZW.b)
    ];
    remap(s, (x, y) => y > 16 + B && y < G - 2 && y % 2 === 1, Z2S);
    for (const f of [...fl, ...nl]) s.hline(f.x, f.x + f.w - 1, f.y, ZHOOF);
    // head
    if (graze) {
        zebraHeadGraze(s, 22, 12 + (mouth === 'open' ? 1 : 0), { mouth });
    } else if (head === 'side') {
        zebraHeadSide(s, hx, hy, { eyes, mouth });
        s.point('head', hx + 2, hy);
    } else {
        zebraHeadFront(s, hx + 3, hy, { eyes });
        s.point('head', hx + 3, hy);
    }
}

const zebraDef = {
    name: 'a-zebra',
    sheet: 'animals-savanna',
    w: 32,
    h: 25,
    anchor: [14, 24],
    anims: {
        idle: frames([{}, { bob: 1, tail: 1 }], zebra),
        blink: frames([{ eyes: 'closed' }], zebra),
        walk: frames([0, 1, 2, 3].map((phase) => ({ phase, tail: phase % 2 })), zebra),
        eat: frames([{ graze: 1, mouth: 'chew' }, { graze: 1, mouth: 'open', bob: 1 }], zebra),
        look: frames([{ head: 'front' }], zebra),
        special: frames([0, 1, 2, 3].map((gallop) => ({ gallop })), zebra)
    }
};


// ===========================================================================
// ELEPHANT and CALF – grey, big ears, trunk, small tusks
// ===========================================================================
const EL = ramp('#9ca4c0');
const ELC = ramp('#abb1cc');
const EAR_PINK = '#e8a5b5';
const TUSK = { b: '#fff4dc', d1: '#e2d0aa' };
const NAIL = '#eee6d8';

/** A trunk (or any limb) along a polyline that gets thinner towards the tip. */
function taper(s, pts, widths, col) {
    for (let i = 0; i + 1 < pts.length; i += 1) {
        s.thick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], widths[i], col);
    }
}

/** Big flappy ear with a darker rim, so it reads on top of the body. */
function flapEar(s, x, y, w, h, R, { pink = false, flip = false } = {}) {
    s.oval(x, y, w, h, R.d2);
    s.ball(x + 1, y + 1, w - 2, h - 2, { b: R.b, l1: R.l1, d1: R.d1, l2: null, d2: null });
    if (pink) {
        // the pink inside shows along the front edge
        const ex = flip ? x + 1 : x + w - 2;
        s.vline(ex, y + 3, y + h - 4, EAR_PINK);
    }
}

/** The big side ear, shaped a bit like Africa; (x, y) = top-left; out = flapped out. */
function bigEar(s, x, y, R, out = 0) {
    const pts = out
        ? [[x + 2, y], [x + 12, y], [x + 13, y + 7], [x + 11, y + 14], [x + 7, y + 18], [x + 3, y + 17], [x - 2, y + 11], [x - 2, y + 5]]
        : [[x + 2, y], [x + 11, y], [x + 12, y + 7], [x + 10, y + 13], [x + 6, y + 17], [x + 3, y + 16], [x, y + 11], [x, y + 4]];
    s.poly(pts, R.d1);
    // inner shape one pixel in, lit from the top left
    const inner = pts.map(([px, py]) => [px + (px < x + 6 ? 1 : -1), py + (py < y + 8 ? 1 : -1)]);
    s.poly(inner, R.b);
    s.line(x + 3, y + 1, x + 9, y + 1, R.l1);
    s.line(x + 1 - out * 2, y + 5, x + 1 - out * 2, y + 9, R.l1);
    // two soft wrinkles and the pink inside at the front edge
    s.line(x + 4, y + 6, x + 6, y + 10, R.d1);
    s.line(x + 7, y + 4, x + 8, y + 8, R.d1);
    if (out) s.line(x + 11, y + 3, x + 11, y + 9, EAR_PINK);
}

function elephant(s, o = {}) {
    const { phase = null, bob = 0, head = 'side', eyes = 'open', mouth = 'smile', ear = 0, trunk = 'down', sway = 0 } = o;
    const G = 35;
    const R = EL;
    const L = legsFor(phase, 2);
    const B = bob + L.bob;
    const far = R.d1;
    // far legs
    leg(s, 7, 22 + B, L.fb[0], L.fb[1], G, 6, far);
    leg(s, 22, 22 + B, L.ff[0], L.ff[1], G, 6, far);
    // tail
    s.line(5, 12 + B, 3, 20 + B, R.d1);
    s.rect(2, 20 + B, 2, 3, R.d2);
    // body
    s.ball(4, 8 + B, 28, 19, R);
    s.hline(10, 24, 26 + B, R.d2);
    // near legs with toenails
    const feet = [leg(s, 12, 23 + B, L.nb[0], L.nb[1], G, 6, R.b), leg(s, 27, 23 + B, L.nf[0], L.nf[1], G, 6, R.b)];
    for (const f of feet) {
        s.hline(f.x, f.x + f.w - 1, f.y, R.d1);
        s.px(f.x + 2, f.y - 1, NAIL);
        s.px(f.x + 4, f.y - 1, NAIL);
        s.vline(f.x, f.y - 7, f.y - 2, R.l1);
    }
    if (head === 'front') {
        elephantFront(s, 31, 2 + B, { eyes, R });
        s.point('head', 31, 2 + B);
        return;
    }
    // head
    const hy = 3 + B;
    s.ball(23, hy, 15, 14, R);
    bigEar(s, 18, hy + 2, R, ear);
    // trunk
    const T = R.b;
    if (trunk === 'down') {
        taper(s, [[36, hy + 9], [38, hy + 18], [39 + sway, hy + 25], [41 + sway, hy + 26]], [5, 4, 3], T);
        for (let i = 0; i < 4; i += 1) s.px(39 + (i > 2 ? sway : 0), hy + 13 + i * 3, R.d1);
    } else if (trunk === 'curl') {
        // curled up to the mouth
        taper(s, [[36, hy + 9], [38, hy + 16], [36, hy + 20], [33, hy + 17]], [5, 4, 3], T);
        s.px(37, hy + 19, R.d1);
        s.px(35, hy + 20, R.d1);
    } else if (trunk === 'spray') {
        // raised up and forward, a fountain of water arcing out of it
        taper(s, [[35, hy + 9], [39, hy + 3], [43, hy - 3], [45, hy - 6]], [5, 4, 3], T);
        s.px(39, hy + 1, R.d1);
        s.px(42, hy - 2, R.d1);
        s.rect(44, hy - 8, 3, 2, R.l1);
        s.px(45, hy - 8, R.d2);
        const drop = (x, y, big) => {
            s.px(x, y, WATER[1]);
            if (big) {
                s.px(x, y + 1, WATER[2]);
                s.px(x + 1, y + 1, WATER[3]);
                s.px(x + 1, y, WATER[2]);
                s.px(x, y, WATER[0]);
            }
        };
        // three arcs: a steady jet near the trunk that breaks up into drops
        const arcs = [[0.95, 2.7, 0.21], [1.15, 2.0, 0.17], [1.3, 1.3, 0.14]];
        arcs.forEach(([vx, vy, g], j) => {
            for (let t = 1; t <= 15; t += 1) {
                const x = Math.round(46 + vx * t);
                const y = Math.round(hy - 9 - vy * t + g * t * t);
                if (t <= 3) {
                    s.px(x, y, WATER[t === 1 ? 0 : 1]);
                    s.px(x, y + 1, WATER[2]);
                } else if ((t + j) % 2 === 0) {
                    drop(x, y, (t + j) % 4 !== 2);
                }
            }
        });
        s.point('water', 53, hy - 18);
    } else {
        // raised high like a trumpet
        taper(s, [[35, hy + 9], [38, hy + 3], [40, hy - 4], [40, hy - 8]], [5, 4, 3], T);
        s.px(39, hy + 1, R.d1);
        s.px(40, hy - 2, R.d1);
        s.px(40, hy - 5, R.d1);
        s.rect(39, hy - 10, 4, 2, R.l1);                   // flared tip
        s.hline(40, 41, hy - 10, R.d2);
        if (trunk === 'toot') {
            // little "toot!" marks
            const Y = PUFF[2];
            s.line(37, hy - 12, 36, hy - 14, Y);
            s.line(41, hy - 13, 41, hy - 15, Y);
            s.line(44, hy - 12, 45, hy - 14, Y);
        }
    }
    // a small tusk curving forward and up
    s.hline(33, 36, hy + 13, TUSK.b);
    s.hline(33, 35, hy + 14, TUSK.d1);
    s.px(37, hy + 12, TUSK.b);
    // face
    s.point('mouth', 32, hy + 12);
    eye(s, 31, hy + 5, eyes);
    s.px(32, hy + 8, BLUSH);
    s.px(33, hy + 8, BLUSH);
    if (mouth === 'smile') {
        s.px(31, hy + 11, MOUTH);
        s.px(32, hy + 12, MOUTH);
        s.px(33, hy + 12, MOUTH);
    } else if (mouth === 'open') {
        s.rect(31, hy + 10, 3, 3, MOUTH_IN);
        s.hline(32, 33, hy + 12, TONGUE);
    } else if (mouth === 'chew') {
        s.hline(31, 33, hy + 12, MOUTH);
    }
    s.point('head', 30, hy);
}

/** Elephant face turned to the viewer; (cx, y) = top centre of the head. */
function elephantFront(s, cx, y, { eyes = 'open', R = EL, small = false } = {}) {
    const hw = small ? 10 : 14;
    const eh = small ? 10 : 15;
    const ew = small ? 7 : 10;
    // ears spread wide on both sides, pink inside
    for (const side of [-1, 1]) {
        const ex = side < 0 ? cx - hw / 2 - ew + 3 : cx + hw / 2 - 3;
        s.oval(ex, y + 1, ew, eh, R.d1);
        s.oval(ex + 1, y + 2, ew - 2, eh - 3, R.b);
        s.oval(ex + (side < 0 ? 2 : 1), y + 3, ew - 3, eh - 6, side < 0 ? EAR_PINK : mix(EAR_PINK, R.d1, 0.35));
    }
    s.ball(cx - hw / 2, y, hw, hw, R);
    // trunk down the middle, curling up at the tip
    const tl = small ? 6 : 10;
    const tw = small ? 3 : 4;
    const tx = cx - Math.floor(tw / 2);
    s.rect(tx, y + hw - 5, tw, tl, R.b);
    s.vline(tx, y + hw - 5, y + hw - 5 + tl - 2, R.l1);
    for (let i = 1; i < tl - 1; i += 2) s.hline(tx + 1, tx + tw - 1, y + hw - 5 + i, R.d1);
    s.rect(tx + tw, y + hw - 7 + tl, 2, 2, R.b);
    s.px(tx + tw + 1, y + hw - 8 + tl, R.b);
    // tusks
    if (!small) {
        s.vline(cx - 4, y + hw - 4, y + hw - 2, TUSK.b);
        s.vline(cx + 3, y + hw - 4, y + hw - 2, TUSK.d1);
        s.px(cx - 3, y + hw - 1, TUSK.b);
        s.px(cx + 2, y + hw - 1, TUSK.d1);
    }
    const ey = y + (small ? 4 : 5);
    const d = small ? 3 : 4;
    if (eyes === 'open') {
        eye(s, cx - d - 1, ey, 'open');
        eye(s, cx + d - 1, ey, 'open');
    } else {
        s.hline(cx - d - 1, cx - d, ey + 1, EYE);
        s.hline(cx + d - 1, cx + d, ey + 1, EYE);
    }
    s.px(cx - d - 2, ey + 3, BLUSH);
    s.px(cx + d + 1, ey + 3, BLUSH);
}

const elephantSpecial = (o) => (s) => elephant(view(s, 0, 16), o);

const elephantDef = {
    name: 'a-elephant',
    sheet: 'animals-savanna',
    w: 46,
    h: 36,
    anchor: [18, 35],
    outlineOptions: { skip: fxSkip },
    anims: {
        idle: frames([{}, { ear: 1, bob: 1, sway: 1 }], elephant),
        blink: frames([{ eyes: 'closed' }], elephant),
        walk: frames([0, 1, 2, 3].map((phase) => ({ phase, sway: phase % 2 })), elephant),
        eat: frames([{ trunk: 'curl', mouth: 'smile', eyes: 'happy' }, { trunk: 'curl', mouth: 'chew', eyes: 'happy', bob: 1 }], elephant),
        look: frames([{ head: 'front' }], elephant),
        special: { w: 67, h: 52, anchor: [18, 51], frames: [
            elephantSpecial({ trunk: 'up', mouth: 'open', eyes: 'happy' }),
            elephantSpecial({ trunk: 'toot', mouth: 'open', eyes: 'happy', ear: 1 }),
            elephantSpecial({ trunk: 'spray', mouth: 'smile', eyes: 'happy', ear: 1 })
        ] }
    }
};

function elephantCalf(s, o = {}) {
    const { phase = null, bob = 0, head = 'side', eyes = 'open', mouth = 'smile', ear = 0, trunk = 'down' } = o;
    const G = 19;
    const R = ELC;
    const L = legsFor(phase, 1);
    const B = bob + L.bob;
    leg(s, 5, 13 + B, L.fb[0], L.fb[1], G, 4, R.d1);
    leg(s, 13, 13 + B, L.ff[0], L.ff[1], G, 4, R.d1);
    s.line(3, 8 + B, 2, 12 + B, R.d1);                          // tail
    s.px(2, 13 + B, R.d2);
    s.ball(3, 5 + B, 15, 11, R);
    const feet = [leg(s, 8, 14 + B, L.nb[0], L.nb[1], G, 4, R.b), leg(s, 16, 14 + B, L.nf[0], L.nf[1], G, 4, R.b)];
    for (const f of feet) {
        s.hline(f.x, f.x + f.w - 1, f.y, R.d1);
        s.px(f.x + 1, f.y - 1, NAIL);
        s.px(f.x + 3, f.y - 1, NAIL);
    }
    if (head === 'front') {
        elephantFront(s, 17, 1 + B, { eyes, R, small: true });
        s.px(17, B, R.d2);                                        // hair tuft
        s.px(16, B, R.d1);
        s.point('head', 17, B);
        return;
    }
    const hy = 1 + B;
    s.ball(12, hy, 11, 11, R);
    s.px(15, hy - 1, R.d2);                                        // hair tuft
    s.px(16, hy - 1, R.d1);
    s.px(17, hy, R.d2);
    if (ear) flapEar(s, 7, hy + 2, 9, 11, R, { pink: true, flip: true });
    else flapEar(s, 9, hy + 3, 7, 9, R);
    const T = R.b;
    if (trunk === 'down') {
        taper(s, [[21, hy + 6], [22, hy + 11], [24, hy + 13]], [3, 2], T);
        s.px(22, hy + 9, R.d1);
    } else if (trunk === 'curl') {
        taper(s, [[21, hy + 6], [22, hy + 10], [20, hy + 12], [19, hy + 10]], [3, 2, 2], T);
    } else if (trunk === 'wiggle1') {
        // curled up in front of the face
        taper(s, [[21, hy + 6], [24, hy + 5], [24, hy + 2], [23, hy + 1]], [3, 2, 2], T);
        s.px(23, hy + 5, R.d1);
    } else if (trunk === 'wiggle2') {
        // swung forward, wiggling
        taper(s, [[21, hy + 6], [23, hy + 7], [24, hy + 9], [25, hy + 8]], [3, 2, 2], T);
        s.px(23, hy + 7, R.d1);
    }
    s.point('mouth', 19, hy + 9);
    eye(s, 17, hy + 4, eyes);
    s.px(18, hy + 7, BLUSH);
    s.px(19, hy + 7, BLUSH);
    if (mouth === 'smile') s.px(19, hy + 9, MOUTH);
    else if (mouth === 'open') { s.rect(18, hy + 8, 2, 2, MOUTH_IN); s.px(19, hy + 9, TONGUE); }
    else if (mouth === 'chew') s.hline(18, 19, hy + 9, MOUTH);
    s.point('head', 16, hy - 1);
}

const elephantCalfDef = {
    name: 'a-elephantcalf',
    sheet: 'animals-savanna',
    w: 27,
    h: 20,
    anchor: [11, 19],
    anims: {
        idle: frames([{}, { ear: 1, bob: 1 }], elephantCalf),
        blink: frames([{ eyes: 'closed' }], elephantCalf),
        walk: frames([0, 1, 2, 3].map((phase) => ({ phase })), elephantCalf),
        eat: frames([{ trunk: 'curl', eyes: 'happy' }, { trunk: 'curl', mouth: 'chew', eyes: 'happy', bob: 1 }], elephantCalf),
        look: frames([{ head: 'front' }], elephantCalf),
        special: frames([{ trunk: 'wiggle1', mouth: 'open', eyes: 'happy' }, { trunk: 'wiggle2', mouth: 'open', eyes: 'happy', ear: 1 }], elephantCalf)
    }
};


// ===========================================================================
// LIONS – the big friendly lion, the lioness and a spotted cub
// ===========================================================================
const LION = ramp('#e8ad58');
const MANE = ramp('#c9682d');
const LMUZ = ramp('#fbe7c6');
const LNOSE = '#d06a74';
const LPINK = '#f3a5a0';

/** Fluffy mane: a ball with little tufts poking out of its edge. */
function mane(s, x, y, w, h, R = MANE) {
    s.ball(x, y, w, h, R);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const n = Math.round((w + h) / 2.2);
    for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2 + 0.3;
        const tx = Math.round(cx - 0.5 + Math.cos(a) * (w / 2 + 0.3));
        const ty = Math.round(cy - 0.5 + Math.sin(a) * (h / 2 + 0.3));
        const lit = Math.cos(a) < 0.2 && Math.sin(a) < 0.3;
        s.px(tx, ty, lit ? R.l1 : R.b);
    }
    // a few lighter locks inside
    s.px(x + 2, y + Math.round(h * 0.35), R.l1);
    s.px(x + 3, y + Math.round(h * 0.35) + 1, R.l1);
    s.px(x + Math.round(w * 0.3), y + 2, R.l1);
    s.px(x + Math.round(w * 0.3) + 1, y + 3, R.l1);
    s.px(x + 2, y + Math.round(h * 0.65), R.d1);
    s.px(x + 3, y + Math.round(h * 0.65) + 1, R.d1);
}

/** Lion face in profile; (x, y) = top-left of the face box (11×9). */
function lionFaceSide(s, x, y, { eyes = 'open', mouth = 'smile', R = LION } = {}) {
    s.oval(x + 1, y - 1, 3, 3, R.b);                   // ear
    s.px(x + 2, y, LPINK);
    s.ball(x, y, 10, 9, R);
    s.ball(x + 5, y + 4, 6, 5, LMUZ);
    s.hline(x + 9, x + 10, y + 4, LNOSE);              // nose at the tip
    s.px(x + 10, y + 5, LNOSE);
    eye(s, x + 5, y + 2, eyes);
    s.px(x + 4, y + 5, BLUSH);
    s.px(x + 5, y + 5, BLUSH);
    s.point('mouth', x + 8, y + 7);
    if (mouth === 'smile') {
        s.px(x + 9, y + 6, MOUTH);
        s.hline(x + 7, x + 8, y + 7, MOUTH);
    } else if (mouth === 'chew') {
        s.hline(x + 7, x + 9, y + 7, MOUTH);
    } else if (mouth === 'open') {
        s.rect(x + 7, y + 6, 3, 2, MOUTH_IN);
        s.hline(x + 7, x + 8, y + 7, TONGUE);
    }
}

/** Lion face to the viewer, framed by the mane; (cx, y) = top centre of the mane. */
function lionFaceFront(s, cx, y, { eyes = 'open', mouth = 'smile', maneOn = true, R = LION, tilt = 0 } = {}) {
    if (maneOn) mane(s, cx - 8, y, 17, 16);
    const fy = y + 3 + tilt;
    // ears
    s.oval(cx - 5, fy - 1, 4, 4, R.b);
    s.oval(cx + 2, fy - 1, 4, 4, R.d1);
    s.px(cx - 4, fy, LPINK);
    s.px(cx + 3, fy, LPINK);
    s.ball(cx - 5, fy, 11, 10, R);
    s.ball(cx - 3, fy + 5, 7, 5, LMUZ);
    const ey = fy + 3;
    if (eyes === 'open') {
        eye(s, cx - 3, ey, 'open');
        eye(s, cx + 2, ey, 'open');
    } else if (eyes === 'happy') {
        s.px(cx - 3, ey + 1, EYE);
        s.px(cx - 2, ey, EYE);
        s.px(cx + 2, ey, EYE);
        s.px(cx + 3, ey + 1, EYE);
    } else if (eyes === 'squeeze') {
        // squeezed shut in a big yawn: > <
        s.px(cx - 3, ey, EYE);
        s.px(cx - 2, ey + 1, EYE);
        s.px(cx - 3, ey + 2, EYE);
        s.px(cx + 3, ey, EYE);
        s.px(cx + 2, ey + 1, EYE);
        s.px(cx + 3, ey + 2, EYE);
    } else {
        s.hline(cx - 3, cx - 2, ey + 1, EYE);
        s.hline(cx + 2, cx + 3, ey + 1, EYE);
    }
    s.px(cx - 4, ey + 3, BLUSH);
    s.px(cx + 4, ey + 3, BLUSH);
    // nose
    s.hline(cx - 1, cx + 1, fy + 5, LNOSE);
    s.px(cx, fy + 6, LNOSE);
    const my = fy + 7;
    s.point('mouth', cx, my);
    if (mouth === 'smile') {
        s.px(cx - 1, my, MOUTH);
        s.px(cx + 1, my, MOUTH);
    } else if (mouth === 'yawn1') {
        s.rect(cx - 1, my, 3, 2, MOUTH_IN);
        s.px(cx, my + 1, TONGUE);
    } else if (mouth === 'yawn2') {
        // a huge, round, friendly yawn with tiny teeth and a pink tongue
        s.oval(cx - 3, my - 1, 7, 6, MOUTH_IN);
        s.oval(cx - 2, my, 5, 4, '#e0647e');
        s.hline(cx - 1, cx + 1, my + 3, TONGUE);
        s.hline(cx - 2, cx + 2, my + 4, TONGUE);
        s.px(cx, my + 2, TONGUE);
        s.px(cx - 2, my - 1, TOOTH);
        s.px(cx + 2, my - 1, TOOTH);
        } else if (mouth === 'chew') {
        s.hline(cx - 1, cx + 1, my, MOUTH);
    }
}

function lionLying(s, o = {}) {
    const { head = 'side', eyes = 'open', mouth = 'smile', tail = 0, bob = 0, sleep = false, yawn = 0 } = o;
    const R = LION;
    const B = bob;
    // tail along the ground, tip curling up
    s.line(6, 20, 2, 21, R.d1);
    s.line(2, 21, 1, 19 - tail, R.d1);
    s.rect(0, 16 - tail, 2, 3, MANE.d1);
    s.px(0, 16 - tail, MANE.b);
    // far front leg
    s.rect(24, 18, 9, 3, R.d1);
    // body and haunch
    s.ball(7, 12 - B, 20, 11 + B, R);
    s.ball(4, 11 - B, 13, 12 + B, R);
    s.line(12, 14 - B, 15, 20, R.d1);                   // thigh line
    s.oval(14, 20, 5, 3, R.l1);                          // hind paw
    s.px(18, 21, R.d1);
    // near front leg and big paw
    s.rect(22, 20, 10, 3, R.b);
    s.hline(22, 31, 20, R.l1);
    s.oval(30, 19, 5, 4, R.b);
    s.px(31, 19, R.l1);
    s.px(33, 21, R.d1);
    s.px(34, 21, R.d1);
    if (head === 'front') {
        lionFaceFront(s, 26, 0 + (yawn === 2 ? -1 : 0), { eyes, mouth });
        s.point('head', 26, 0);
        return;
    }
    if (sleep) {
        // head resting on the paws
        mane(s, 18, 6, 14, 14);
        lionFaceSide(s, 23, 11, { eyes: 'closed', mouth: 'none' });
        s.px(31, 17, MOUTH);
        s.point('head', 25, 5);
        return;
    }
    mane(s, 18, 0, 14, 16);
    lionFaceSide(s, 23, 3 + (mouth === 'chew' ? 2 : 0), { eyes, mouth });
    s.point('head', 25, 0);
}

function lionStanding(s, o = {}) {
    const { phase = null, eyes = 'open', mouth = 'smile' } = o;
    const R = LION;
    const G = 25;
    const L = legsFor(phase, 2);
    const B = L.bob;
    leg(s, 7, 14 + B, L.fb[0], L.fb[1], G, 3, R.d1);
    leg(s, 20, 14 + B, L.ff[0], L.ff[1], G, 3, R.d1);
    // tail hanging in a curve, the tuft flicking up
    const tw = phase === null ? 0 : phase % 2;
    s.line(5, 10 + B, 2, 13 + B, R.d1);
    s.line(2, 13 + B, 1, 17 + B, R.d1);
    s.rect(0, 16 + B - tw, 2, 3, MANE.d1);
    s.px(0, 16 + B - tw, MANE.b);
    s.px(2, 18 + B - tw, MANE.d1);
    s.ball(4, 7 + B, 21, 10, R);
    s.hline(9, 20, 16 + B, R.d1);
    const feet = [leg(s, 10, 15 + B, L.nb[0], L.nb[1], G, 3, R.b), leg(s, 23, 15 + B, L.nf[0], L.nf[1], G, 3, R.b)];
    for (const f of feet) s.hline(f.x, f.x + 3, f.y, R.l1);
    mane(s, 18, 0 + B, 14, 17);
    lionFaceSide(s, 23, 3 + B, { eyes, mouth });
}

const lionDef = {
    name: 'a-lion',
    sheet: 'animals-savanna',
    w: 37,
    h: 23,
    anchor: [17, 22],
    anims: {
        idle: frames([{}, { tail: 1, bob: 1 }], lionLying),
        blink: frames([{ eyes: 'closed' }], lionLying),
        sleep: frames([{ sleep: true }, { sleep: true, bob: 1 }], lionLying),
        eat: frames([{ mouth: 'chew', eyes: 'happy' }, { mouth: 'open', eyes: 'happy' }], lionLying),
        look: frames([{ head: 'front' }], lionLying),
        special: frames([
            { head: 'front', mouth: 'yawn1', eyes: 'closed' },
            { head: 'front', mouth: 'yawn2', eyes: 'squeeze', yawn: 2 },
            { head: 'front', mouth: 'smile', eyes: 'happy' }
        ], lionLying),
        walk: { w: 37, h: 26, anchor: [17, 25], frames: frames([0, 1, 2, 3].map((phase) => ({ phase })), lionStanding) }
    }
};


// --- Lioness: sleek, no mane. Idle is sitting like a big cat. --------------
const LNS = ramp('#e3b16a');
const LEAR = '#8a5a3a';

function lionessHeadSide(s, x, y, o = {}) {
    // round ears with dark backs
    s.oval(x + 1, y - 2, 4, 4, LNS.b);
    s.px(x + 1, y - 1, LEAR);
    s.px(x + 2, y - 1, LPINK);
    lionFaceSide(s, x, y, { ...o, R: LNS });
}

function lionessSitting(s, o = {}) {
    const { eyes = 'open', mouth = 'smile', head = 'side', bob = 0, tail = 0, lower = 0 } = o;
    const R = LNS;
    const B = bob;
    // tail along the ground behind, tip curling up
    s.line(5, 21, 1, 21, R.d1);
    s.vline(1, 18 - tail, 21, R.d1);
    s.rect(0, 16 - tail, 2, 3, MANE.d1);
    // haunch and upright chest
    s.ball(3, 11 + B, 11, 10 - B, R);
    s.ball(8, 6 + B, 9, 14 - B, R);
    s.oval(11, 9 + B, 5, 9, LMUZ.d1);                    // pale chest
    s.oval(12, 9 + B, 4, 7, LMUZ.b);
    s.line(6, 13 + B, 9, 18, R.d1);                      // thigh line
    // legs and paws
    s.rect(15, 12 + B, 2, 10 - B, R.d1);
    s.rect(12, 12 + B, 3, 10 - B, R.b);
    s.vline(12, 12 + B, 20, R.l1);
    s.hline(12, 15, 21, R.l1);
    s.hline(15, 17, 21, R.d1);
    s.oval(7, 19, 5, 3, R.l1);
    if (head === 'front') {
        lionFaceFront(s, 15, 0 + B, { eyes, mouth, maneOn: false, R });
        s.px(11, 2 + B, LEAR);
        s.px(19, 2 + B, LEAR);
        s.point('head', 15, 1 + B);
        return;
    }
    lionessHeadSide(s, 11, 2 + B + lower, { eyes, mouth });
    s.point('head', 13, B + lower);
}

function lionessWalking(s, o = {}) {
    const { phase = null } = o;
    const R = LNS;
    const G = 19;
    const L = legsFor(phase, 2);
    const B = L.bob;
    leg(s, 8, 10 + B, L.fb[0], L.fb[1], G, 2, R.d1);
    leg(s, 19, 10 + B, L.ff[0], L.ff[1], G, 2, R.d1);
    const tw = phase % 2;
    s.line(5, 7 + B, 2, 11 + B, R.d1);
    s.line(2, 11 + B, 1, 14 + B, R.d1);
    s.rect(0, 13 + B - tw, 2, 3, MANE.d1);
    s.ball(4, 5 + B, 20, 8, R);
    s.hline(9, 20, 12 + B, R.d1);
    s.line(9, 7 + B, 11, 11 + B, R.d1);                  // thigh line
    const feet = [leg(s, 11, 11 + B, L.nb[0], L.nb[1], G, 2, R.b), leg(s, 22, 11 + B, L.nf[0], L.nf[1], G, 2, R.b)];
    for (const f of feet) s.hline(f.x, f.x + 2, f.y, R.l1);
    lionessHeadSide(s, 21, 2 + B, {});
}

const lionessDef = {
    name: 'a-lioness',
    sheet: 'animals-savanna',
    w: 24,
    h: 22,
    anchor: [11, 21],
    anims: {
        idle: frames([{}, { bob: 1, tail: 1 }], lionessSitting),
        blink: frames([{ eyes: 'closed' }], lionessSitting),
        eat: frames([{ lower: 2, mouth: 'chew', eyes: 'happy' }, { lower: 2, mouth: 'open', eyes: 'happy' }], lionessSitting),
        look: frames([{ head: 'front' }], lionessSitting),
        special: frames([{ eyes: 'happy', mouth: 'smile', head: 'front' }, { eyes: 'happy', mouth: 'smile', head: 'front', bob: 1, tail: 1 }], lionessSitting),
        walk: { w: 32, h: 20, anchor: [17, 19], frames: frames([0, 1, 2, 3].map((phase) => ({ phase })), lionessWalking) }
    }
};

// --- Lion cub: small, spotted, big eyes --------------------------------------
const CUB = ramp('#ecbd72');

function cubHead(s, x, y, { eyes = 'open', mouth = 'smile' } = {}) {
    const R = CUB;
    s.oval(x, y - 1, 3, 3, R.b);                         // ears
    s.oval(x + 4, y - 1, 3, 3, R.d1);
    s.px(x + 1, y, LPINK);
    s.ball(x, y, 8, 7, R);
    s.ball(x + 4, y + 3, 5, 4, LMUZ);
    s.px(x + 8, y + 3, LNOSE);
    eye(s, x + 3, y + 2, eyes);
    s.px(x + 3, y + 5, BLUSH);
    s.point('mouth', x + 7, y + 5);
    if (mouth === 'open') {
        s.rect(x + 6, y + 5, 2, 2, MOUTH_IN);
        s.px(x + 6, y + 6, TONGUE);
    } else if (mouth === 'chew') {
        s.hline(x + 6, x + 7, y + 5, MOUTH);
    } else {
        s.px(x + 7, y + 5, MOUTH);
    }
}

function cubSpots(s, pts) {
    // faint little rosettes: each spot is a short 2-px dash
    const all = pts.flatMap(([x, y]) => [[x, y], [x + 1, y]]);
    remap(s, (x, y) => all.some(([px, py]) => px === x && py === y), { [CUB.b]: CUB.d1, [CUB.l1]: CUB.b, [CUB.l2]: CUB.l1, [CUB.d1]: CUB.d2 });
}

function lionCub(s, o = {}) {
    const { phase = null, eyes = 'open', mouth = 'smile', head = 'side', tail = 0, lower = 0 } = o;
    const R = CUB;
    const G = 12;
    const L = legsFor(phase, 1);
    const B = L.bob;
    leg(s, 3, 8 + B, L.fb[0], L.fb[1], G, 2, R.d1);
    leg(s, 8, 8 + B, L.ff[0], L.ff[1], G, 2, R.d1);
    // tail up with a dark tip
    const tw = tail || (phase !== null && phase % 2) ? 1 : 0;
    s.line(3, 5 + B, 1 - tw, 2 + B, R.d1);
    s.px(1 - tw, 1 + B, MANE.d1);
    s.px(2 - tw, 1 + B, MANE.d1);
    s.ball(2, 4 + B, 9, 6, R);
    const legs = [leg(s, 5, 8 + B, L.nb[0], L.nb[1], G, 2, R.b), leg(s, 10, 8 + B, L.nf[0], L.nf[1], G, 2, R.b)];
    for (const f of legs) s.hline(f.x, f.x + 1, f.y, R.l1);
    cubSpots(s, [[3, 5 + B], [6, 5 + B], [4, 7 + B], [8, 7 + B]]);
    if (head === 'front') {
        // face to the viewer
        const cx = 11;
        const y = 1 + B;
        s.oval(cx - 4, y - 1, 3, 3, R.b);
        s.oval(cx + 2, y - 1, 3, 3, R.d1);
        s.px(cx - 3, y, LPINK);
        s.px(cx + 3, y, LPINK);
        s.ball(cx - 4, y, 9, 7, R);
        s.ball(cx - 2, y + 3, 5, 4, LMUZ);
        eye(s, cx - 3, y + 2, eyes);
        eye(s, cx + 2, y + 2, eyes);
        s.px(cx, y + 4, LNOSE);
        s.px(cx - 1, y + 6, MOUTH);
        s.px(cx + 1, y + 6, MOUTH);
        s.px(cx - 4, y + 5, BLUSH);
        s.px(cx + 4, y + 5, BLUSH);
        s.point('head', cx, y - 1);
        return;
    }
    cubHead(s, 7, 1 + B + lower, { eyes, mouth });
    s.point('head', 9, B + lower);
}

function lionCubPounce(s, f) {
    const R = CUB;
    if (f === 0) {
        // crouched, bottom wiggling in the air, eyes on the target
        s.line(3, 5, 1, 1, R.d1);
        s.rect(0, 0, 2, 2, MANE.d1);
        leg(s, 4, 8, -1, 0, 13, 2, R.d1);
        s.ball(2, 4, 8, 6, R);
        s.ball(7, 7, 7, 5, R);
        leg(s, 6, 9, -1, 0, 13, 2, R.b);
        s.rect(12, 11, 4, 2, R.b);                        // front paws flat on the ground
        s.hline(12, 15, 12, R.l1);
        s.rect(11, 11, 2, 2, R.d1);
        cubSpots(s, [[4, 5], [6, 6], [9, 8]]);
        cubHead(s, 11, 5, { eyes: 'open', mouth: 'smile' });
        s.point('head', 13, 4);
    } else {
        // mid-leap, paws stretched out
        s.line(4, 5, 0, 3, R.d1);
        s.rect(0, 2, 2, 2, MANE.d1);
        s.thick(5, 7, 2, 10, 2, R.d1);
        s.thick(12, 7, 16, 9, 2, R.d1);
        s.ball(3, 3, 11, 6, R);
        s.thick(6, 8, 3, 11, 2, R.b);
        s.thick(13, 8, 18, 10, 2, R.b);
        s.hline(17, 18, 11, R.l1);
        cubSpots(s, [[5, 4], [8, 5], [6, 6], [10, 4]]);
        cubHead(s, 11, 0, { eyes: 'happy', mouth: 'open' });
        s.point('head', 13, -1);
    }
}

const lionCubDef = {
    name: 'a-lioncub',
    sheet: 'animals-savanna',
    w: 16,
    h: 13,
    anchor: [7, 12],
    anims: {
        idle: frames([{}, { tail: 1 }], lionCub),
        blink: frames([{ eyes: 'closed' }], lionCub),
        walk: frames([0, 1, 2, 3].map((phase) => ({ phase })), lionCub),
        eat: frames([{ lower: 2, mouth: 'chew', eyes: 'happy' }, { lower: 2, mouth: 'open', eyes: 'happy' }], lionCub),
        look: frames([{ head: 'front' }], lionCub),
        special: { w: 20, h: 14, anchor: [8, 13], frames: [(s) => lionCubPounce(s, 0), (s) => lionCubPounce(s, 1)] }
    }
};


// ===========================================================================
// HIPPO – pinkish grey; swims with only eyes, ears, nostrils and back showing
// ===========================================================================
const HIP = ramp('#a98ca0');
const HPINK = ramp('#eaa9b5');
const HMOUTH = '#c9506c';
const HGUM = '#f08fa6';

const rot = ([x, y], a, [hx, hy]) => {
    const c = Math.cos(a);
    const sn = Math.sin(a);
    return [hx + (x - hx) * c + (y - hy) * sn, hy - (x - hx) * sn + (y - hy) * c];
};

/** Hippo head in profile (land); (x, y) = top-left of the skull. */
function hippoHead(s, x, y, { eyes = 'open', mouth = 'smile' } = {}) {
    const R = HIP;
    const P = (pts) => pts.map(([a, b]) => [x + a, y + b]);
    s.oval(x + 1, y - 2, 3, 3, R.b);                     // ear
    s.px(x + 2, y - 1, HPINK.d1);
    // skull, then the big boxy muzzle
    s.ball(x, y, 11, 11, R);
    s.poly(P([[5, 2], [14, 2], [16, 4], [16, 11], [14, 13], [6, 13], [4, 10]]), R.b);
    s.hline(x + 6, x + 14, y + 2, R.l1);
    s.vline(x + 16, y + 5, y + 10, R.d1);
    s.hline(x + 7, x + 14, y + 13, R.d1);
    s.poly(P([[7, 10], [15, 10], [14, 12], [8, 12]]), mix(R.b, HPINK.b, 0.55));   // soft pink lower lip
    s.vline(x, y + 3, y + 9, R.d1);                      // neck crease
    s.oval(x + 3, y - 3, 5, 4, R.b);                     // eye bump
    s.px(x + 4, y - 3, R.l1);
    s.oval(x + 12, y, 4, 3, R.b);                        // nostril bump
    s.px(x + 13, y + 1, R.d2);
    s.px(x + 15, y + 1, R.d2);
    eye(s, x + 4, y - 2, eyes);
    s.px(x + 5, y + 5, BLUSH);
    s.point('mouth', x + 13, y + 9);
    s.px(x + 6, y + 5, BLUSH);
    if (mouth === 'smile') {
        s.hline(x + 8, x + 15, y + 9, R.d2);
        s.px(x + 7, y + 8, R.d2);
    } else if (mouth === 'chew') {
        s.hline(x + 8, x + 15, y + 9, R.d2);
        s.hline(x + 11, x + 14, y + 10, HMOUTH);
    }
}

function hippoLand(s, o = {}) {
    const { phase = null, bob = 0, head = 'side', eyes = 'open', mouth = 'smile', lower = 0, ear = 0 } = o;
    const R = HIP;
    const G = 23;
    const L = legsFor(phase, 1);
    const B = bob + L.bob;
    leg(s, 7, 18 + B, L.fb[0], L.fb[1], G, 5, R.d1);
    leg(s, 21, 18 + B, L.ff[0], L.ff[1], G, 5, R.d1);
    s.line(3, 9 + B, 2, 12 + B, R.d1);                    // tiny tail
    s.rect(1, 12 + B, 2, 2, R.d2);
    s.ball(3, 5 + B, 25, 15, R);
    s.oval(8, 15 + B, 16, 5, mix(R.b, HPINK.b, 0.45));   // pinkish belly
    s.oval(9, 15 + B, 14, 4, mix(R.b, HPINK.b, 0.65));
    const feet = [leg(s, 11, 19 + B, L.nb[0], L.nb[1], G, 5, R.b), leg(s, 25, 19 + B, L.nf[0], L.nf[1], G, 5, R.b)];
    for (const f of feet) {
        s.hline(f.x, f.x + 4, f.y, R.d1);
        s.px(f.x + 1, f.y - 1, HPINK.l1);
        s.px(f.x + 3, f.y - 1, HPINK.l1);
    }
    if (head === 'front') {
        hippoFront(s, 28, 2 + B, { eyes });
        s.point('head', 28, 1 + B);
        return;
    }
    hippoHead(s, 20, 5 + B + lower, { eyes, mouth });
    if (ear) s.px(21, 3 + B, R.l1);
    s.point('head', 23, 1 + B + lower);
}

/** Hippo face to the viewer; (cx, y) = top centre. */
function hippoFront(s, cx, y, { eyes = 'open' } = {}) {
    const R = HIP;
    s.oval(cx - 7, y, 3, 3, R.b);                         // ears
    s.oval(cx + 5, y, 3, 3, R.d1);
    s.px(cx - 6, y + 1, HPINK.d1);
    s.px(cx + 6, y + 1, HPINK.d1);
    s.ball(cx - 6, y + 1, 13, 10, R);
    s.oval(cx - 5, y, 4, 4, R.b);                         // eye bumps
    s.oval(cx + 2, y, 4, 4, R.b);
    // big wide snout, a little pinker, with round nostrils on top
    const SN = { b: mix(R.b, HPINK.b, 0.3), l1: mix(R.l1, HPINK.l1, 0.3), d1: R.d1, l2: null, d2: null };
    s.ball(cx - 8, y + 7, 17, 10, SN);
    s.oval(cx - 6, y + 13, 13, 4, mix(R.b, HPINK.b, 0.6));
    s.oval(cx - 4, y + 8, 3, 3, R.d1);
    s.oval(cx + 2, y + 8, 3, 3, R.d1);
    s.px(cx - 3, y + 9, R.d2);
    s.px(cx + 3, y + 9, R.d2);
    if (eyes === 'open') {
        eye(s, cx - 4, y + 1, 'open');
        eye(s, cx + 3, y + 1, 'open');
    } else {
        s.hline(cx - 4, cx - 3, y + 2, EYE);
        s.hline(cx + 3, cx + 4, y + 2, EYE);
    }
    s.px(cx - 6, y + 5, BLUSH);
    s.px(cx + 6, y + 5, BLUSH);
    // wide smile
    s.hline(cx - 4, cx + 4, y + 13, R.d2);
    s.px(cx - 5, y + 12, R.d2);
    s.px(cx + 5, y + 12, R.d2);
}

/** Swimming: only the top of the head and the back above the waterline (row 9). */
function hippoSwim(s, f) {
    const R = HIP;
    const B = f;
    s.ball(3, 6 + B, 21, 9, R);                           // back
    s.ball(21, 3 + B, 12, 10, R);                         // head top
    s.ball(26, 5 + B, 10, 9, R);                          // snout
    s.oval(24, 1 + B, 5, 4, R.b);                         // eye bump
    s.px(25, 1 + B, R.l1);
    s.oval(22, 1 + B - (f ? 0 : 1), 3, 3, R.b);           // ear (flicks)
    s.px(23, 2 + B - (f ? 0 : 1), HPINK.d1);
    s.oval(32, 4 + B, 4, 3, R.b);                         // nostril bump
    s.px(33, 5 + B, R.d2);
    s.px(35, 5 + B, R.d2);
    eye(s, 25, 2 + B, 'open');
    s.px(28, 6 + B, BLUSH);
    s.px(29, 6 + B, BLUSH);
    clipBelow(s, 10);
    s.point('water', 17, 9);
}

/** The huge yawn in the water: the upper jaw swings open around the hinge. */
function hippoYawn(s, { open = 0.9, eyes = 'closed' } = {}) {
    const R = HIP;
    const W = 26;                                         // waterline row
    const hinge = [15, 19];
    const r = (p) => rot(p, open, hinge).map(Math.round);
    // back and lower jaw rest on the water
    s.ball(0, 18, 16, 10, R);
    s.poly([[12, 19], [30, 19], [33, 21], [32, 27], [12, 27]], R.b);
    s.hline(13, 30, 19, HGUM);
    // inside of the mouth and the tongue
    const tip = r([33, 17]);
    s.poly([hinge, r([31, 18]), [31, 19], [16, 21]], HMOUTH);
    s.oval(16, 16, 13, 5, HGUM);
    s.hline(18, 26, 16, '#ffb3c2');
    s.vline(29, 17, 18, TOOTH);                          // lower teeth
    s.vline(26, 17, 18, TOOTH);
    // upper jaw (snout), rotated open
    const snout = [[13, 10], [24, 10], [30, 11], [33, 13], [33, 17], [30, 18], [15, 19]];
    s.poly(snout.map(r), R.b);
    s.line(...r([15, 18]), ...r([30, 18]), HGUM);        // pink palate edge
    const tA = r([29, 18]);
    const tB = r([25, 18]);
    s.px(tA[0], tA[1] + 1, TOOTH);                       // upper teeth
    s.px(tB[0], tB[1] + 1, TOOTH);
    s.line(...r([16, 11]), ...r([29, 11]), R.l1);
    const n = r([31, 12]);
    s.px(n[0], n[1], R.d2);
    s.px(n[0] - 1, n[1] - 1, R.d2);
    // the skull dome stays put, eyes and ears on top
    s.ball(3, 8, 15, 13, R);
    s.oval(10, 5, 6, 5, R.b);                             // eye bump
    s.px(11, 5, R.l1);
    s.oval(5, 6, 3, 3, R.b);                              // ear
    s.px(6, 7, HPINK.d1);
    if (eyes === 'happy') {
        s.px(12, 7, EYE);
        s.px(13, 6, EYE);
        s.px(14, 7, EYE);
    } else {
        s.hline(12, 13, 7, EYE);
        s.px(14, 6, EYE);
    }
    s.px(15, 11, BLUSH);
    s.px(16, 11, BLUSH);
    clipBelow(s, W + 1);
    s.point('mouth', Math.round((tip[0] + 31) / 2), Math.round((tip[1] + 19) / 2));
}

const hippoDef = {
    name: 'a-hippo',
    sheet: 'animals-savanna',
    w: 38,
    h: 24,
    anchor: [16, 23],
    anims: {
        idle: frames([{}, { bob: 1, ear: 1 }], hippoLand),
        blink: frames([{ eyes: 'closed' }], hippoLand),
        walk: frames([0, 1, 2, 3].map((phase) => ({ phase })), hippoLand),
        eat: frames([{ lower: 2, mouth: 'chew', eyes: 'happy' }, { lower: 3, mouth: 'smile', eyes: 'happy' }], hippoLand),
        look: frames([{ head: 'front' }], hippoLand),
        swim: { w: 38, h: 12, anchor: [17, 9], frames: [(s) => hippoSwim(s, 0), (s) => hippoSwim(s, 1)] },
        special: { w: 36, h: 28, anchor: [16, 26], frames: [
            (s) => hippoYawn(s, { open: 0.4 }),
            (s) => hippoYawn(s, { open: 0.8 }),
            (s) => hippoYawn(s, { open: 0.2, eyes: 'happy' })
        ] }
    }
};


// ===========================================================================
// RHINO – warm grey, two horns, stamps and snorts
// ===========================================================================
const RH = ramp('#a69b92');
const HORN = ramp('#eadfc4');

function puff(s, x, y, size = 1, cols = PUFF) {
    // a little cloud: 2-3 round blobs
    s.oval(x, y, 3 + size, 3 + size, cols[1]);
    s.oval(x + 2 + size, y - 1, 3 + size, 3 + size, cols[1]);
    s.px(x + 1, y + 1, cols[0]);
    s.px(x + 3 + size, y, cols[0]);
    if (size > 1) s.oval(x + 1, y - 2, 3, 3, cols[0]);
}

function rhinoHead(s, x, y, { eyes = 'open', mouth = 'smile', lower = 0 } = {}) {
    const R = RH;
    const P = (pts) => pts.map(([a, b]) => [x + a, y + b + lower]);
    const Y = y + lower;
    // tube ears
    s.rect(x + 1, Y - 3, 2, 4, R.b);
    s.px(x + 1, Y - 3, R.l1);
    s.px(x + 2, Y - 2, R.d2);
    s.rect(x + 4, Y - 2, 2, 3, R.d1);
    // head sloping down to a square mouth
    s.poly(P([[0, 1], [6, 0], [10, 2], [13, 4], [13, 9], [11, 10], [3, 10], [0, 7]]), R.b);
    s.line(x + 1, Y + 1, x + 9, Y + 2, R.l1);
    s.hline(x + 3, x + 11, Y + 10, R.d1);
    s.vline(x, Y + 2, Y + 7, R.d1);                      // neck fold
    // horns: a big curved one on the nose, a small one behind it
    s.map(x + 9, Y - 6, [
        '..a..',
        '..ab.',
        '..ab.',
        '.aab.',
        '.aabb',
        '.aabb',
        'aaabb',
        'aaabb'
    ], { a: HORN.b, b: HORN.d1 });
    s.px(x + 11, Y - 6, HORN.l1);
    s.px(x + 10, Y - 3, HORN.l1);
    s.map(x + 5, Y - 2, [
        '.a.',
        '.ab',
        'aab'
    ], { a: HORN.b, b: HORN.d1 });
    eye(s, x + 5, Y + 3, eyes);
    s.px(x + 6, Y + 6, BLUSH);
    s.point('mouth', x + 11, Y + 9);
    s.px(x + 7, Y + 6, BLUSH);
    s.px(x + 12, Y + 6, R.d2);                           // nostril
    if (mouth === 'smile') {
        s.hline(x + 10, x + 11, Y + 9, R.d2);
        s.px(x + 9, Y + 8, R.d2);
    } else if (mouth === 'chew') {
        s.hline(x + 9, x + 12, Y + 9, R.d2);
        s.hline(x + 10, x + 11, Y + 10, MOUTH);
    }
}

function rhinoFront(s, cx, y, { eyes = 'open' } = {}) {
    const R = RH;
    s.rect(cx - 6, y, 2, 4, R.b);                         // ears
    s.rect(cx + 5, y, 2, 4, R.d1);
    s.px(cx - 5, y + 1, R.d2);
    s.px(cx + 5, y + 1, R.d2);
    s.ball(cx - 6, y + 2, 13, 11, R);
    s.ball(cx - 4, y + 7, 9, 8, R);                       // muzzle
    s.hline(cx - 3, cx + 3, y + 14, R.d1);
    // the big horn pointing up in the middle, a small one above
    s.poly([[cx - 2, y + 9], [cx + 3, y + 9], [cx + 1, y + 1], [cx, y + 1]], HORN.b);
    s.vline(cx - 1, y + 4, y + 8, HORN.l1);
    s.vline(cx + 2, y + 6, y + 8, HORN.d1);
    s.poly([[cx - 1, y + 3], [cx + 2, y + 3], [cx + 1, y], [cx, y]], HORN.d1);
    if (eyes === 'open') {
        eye(s, cx - 5, y + 6, 'open');
        eye(s, cx + 4, y + 6, 'open');
    } else {
        s.hline(cx - 5, cx - 4, y + 7, EYE);
        s.hline(cx + 4, cx + 5, y + 7, EYE);
    }
    s.px(cx - 5, y + 9, BLUSH);
    s.px(cx + 5, y + 9, BLUSH);
    s.px(cx - 2, y + 11, R.d2);                            // nostrils
    s.px(cx + 3, y + 11, R.d2);
    s.hline(cx - 1, cx + 2, y + 13, R.d2);
}

function rhino(s, o = {}) {
    const { phase = null, bob = 0, head = 'side', eyes = 'open', mouth = 'smile', lower = 0, tail = 0, stamp = null } = o;
    const R = RH;
    const G = 25;
    const L = legsFor(phase, 1);
    const B = bob + L.bob;
    leg(s, 7, 18 + B, L.fb[0], L.fb[1], G, 5, R.d1);
    leg(s, 20, 18 + B, L.ff[0], L.ff[1], G, 5, R.d1);
    const tx = tail ? 1 : 0;
    s.line(4, 10 + B, 2 - tx, 15 + B, R.d1);             // tail
    s.rect(1 - tx, 15 + B, 2, 2, R.d2);
    s.ball(3, 7 + B, 25, 14, R);
    s.ball(14, 5 + B, 13, 11, R, { dark: false });       // shoulder hump
    // skin folds
    s.line(20, 8 + B, 19, 16 + B, R.d1);
    s.line(10, 9 + B, 11, 17 + B, R.d1);
    s.hline(7, 23, 20 + B, R.d1);
    const feet = [leg(s, 11, 19 + B, L.nb[0], L.nb[1], G, 5, R.b)];
    if (stamp === 0) {
        // front foot lifted high, ready to stamp
        s.thick(24, 17 + B, 27, 19, 5, R.b);
        s.hline(25, 29, 21, R.d1);
        s.px(27, 20, HORN.b);
        s.px(29, 20, HORN.b);
    } else {
        feet.push(leg(s, 24, 19 + B, L.nf[0], L.nf[1], G, 5, R.b));
    }
    for (const f of feet) {
        s.hline(f.x, f.x + 4, f.y, R.d1);
        s.px(f.x + 1, f.y - 1, HORN.b);
        s.px(f.x + 3, f.y - 1, HORN.b);
    }
    if (head === 'front') {
        rhinoFront(s, 29, 1 + B, { eyes });
        s.point('head', 29, 1 + B);
        return;
    }
    rhinoHead(s, 23, 9 + B, { eyes, mouth, lower });
    s.point('head', 25, 4 + B + lower);
    if (stamp === 0) {
        puff(s, 37, 14 + B, 1);                               // snort!
    } else if (stamp === 1) {
        puff(s, 37, 15 + B, 2);
        // dust clouds where the foot came down
        const D = DUST;
        s.oval(20, 22, 4, 3, D[1]);
        s.oval(29, 22, 5, 3, D[1]);
        s.oval(31, 20, 3, 3, D[0]);
        s.oval(18, 21, 3, 3, D[0]);
        s.px(33, 21, D[2]);
        s.px(21, 23, D[2]);
    }
}

const rhinoDef = {
    name: 'a-rhino',
    sheet: 'animals-savanna',
    w: 38,
    h: 26,
    anchor: [16, 25],
    outlineOptions: { skip: fxSkip },
    anims: {
        idle: frames([{}, { bob: 1, tail: 1 }], rhino),
        blink: frames([{ eyes: 'closed' }], rhino),
        walk: frames([0, 1, 2, 3].map((phase) => ({ phase, tail: phase % 2 })), rhino),
        eat: frames([{ lower: 3, mouth: 'chew', eyes: 'happy' }, { lower: 4, mouth: 'smile', eyes: 'happy' }], rhino),
        look: frames([{ head: 'front' }], rhino),
        special: { w: 47, h: 26, anchor: [16, 25], frames: frames([{ stamp: 0, lower: -1 }, { stamp: 1, lower: 2, bob: 1, eyes: 'happy' }], rhino) }
    }
};


// ===========================================================================
// MEERKAT – tiny, stands upright on guard, dark eye patches
// ===========================================================================
const MK = ramp('#d8aa6e');
const MKB = ramp('#f2dbb0');
const MKD = '#3b2723';
const MKEY = {
    L: MK.l1, b: MK.b, d: MK.d1, D: MK.d2, c: MKB.b, C: MKB.l1,
    k: MKD, K: MKD, w: SPARK, n: MKD, t: MK.d1, T: MKD, p: MK.b, P: MK.d1, e: MKD
};

// standing guard (11×15): K = eye patch, w = sparkle, k = ear, n = nose
const MEER_STAND = [
    '...Lbbb....',
    '..Lbbbbbb..',
    '..kbKwbbbn.',
    '..bbKKbbd..',
    '...bbbbd...',
    '...Lbbd....',
    '..LbbccPp..',
    '..Lbbccdpp.',
    '..Lbbccd.P.',
    '.LbbbCcd...',
    '.bbbbccd...',
    'tbbbbbdd...',
    't.dbb.bb...',
    'T.ddd.bbb..'
];

// nibbling a seed held in the paws
const MEER_EAT = [
    '...Lbbb....',
    '..Lbbbbbb..',
    '..kbeebbbn.',
    '..bbbbbbpp.',
    '...bbbbpsp.',
    '...Lbbdd...',
    '..LbbccP...',
    '..Lbbccd...',
    '..Lbbccd...',
    '.LbbbCcd...',
    '.bbbbccd...',
    'tbbbbbdd...',
    't.dbb.bb...',
    'T.ddd.bbb..'
];

// face to the viewer
const MEER_LOOK = [
    '...LbbbL...',
    '..kbbbbbk..',
    '..KwbbbKw..',
    '..KKbbbKK..',
    '...bbnbb...',
    '....bcb....',
    '..LbbccbP..',
    '..LpcccpP..',
    '..Lbcccbd..',
    '.LbbcCccd..',
    '.bbbcccdd..',
    'tbbbbbbdd..',
    't.dbb.bbd..',
    'T.ddd.ddd..'
];

function meerkatMap(s, rows, dx, dy, { eyes = 'open' } = {}) {
    s.map(dx, dy, rows, { ...MKEY, s: '#8fb04a' });
    if (eyes !== 'open') {
        // close the eye inside the dark patch
        rows.forEach((row, j) => {
            for (let i = 0; i < row.length; i += 1) if (row[i] === 'w') s.px(dx + i, dy + j, MKD);
        });
        rows.forEach((row, j) => {
            for (let i = 0; i < row.length; i += 1) if (row[i] === 'K' && rows[j + 1] && rows[j + 1][i] === 'K') s.px(dx + i, dy + j, MK.d1);
        });
    }
}

function meerkatStand(s, { eyes = 'open', bob = 0, rows = MEER_STAND } = {}) {
    // the upper body stretches up by `bob`, feet stay down
    if (bob) {
        meerkatMap(s, rows.slice(0, 12), 0, -bob, { eyes });
        meerkatMap(s, rows.slice(11), 0, 11, { eyes });
    } else {
        meerkatMap(s, rows, 0, 0, { eyes });
    }
}

/** Popping out of a burrow: the hole sits on the ground row, the meerkat is cut at its rim. */
function meerkatPop(s, f) {
    const up = [8, 4, 0][f];
    const RIM = ramp('#caa070');
    // back rim and the dark hole
    s.oval(0, 11, 13, 4, RIM.d1);
    s.oval(2, 12, 9, 3, '#3e241e');
    s.hline(3, 9, 12, '#2c1a17');
    meerkatMap(s, MEER_STAND, 1, 1 + up, { eyes: 'open' });
    if (f < 2) clipBelow(s, 13);
    // front lip of sand
    s.oval(0, 13, 13, 3, RIM.b);
    s.hline(2, 10, 13, RIM.l1);
    s.px(1, 14, RIM.l1);
    s.px(11, 15, RIM.d1);
    s.px(12, 14, RIM.d1);
    s.point('head', 5, 1 + up);
}

function meerkatWalk(s, phase) {
    const L = legsFor(phase, 1);
    const B = L.bob;
    const G = 9;
    const R = MK;
    leg(s, 4, 6 + B, L.fb[0], L.fb[1], G, 2, R.d1);
    leg(s, 9, 6 + B, L.ff[0], L.ff[1], G, 2, R.d1);
    // tail held out behind with a dark tip
    s.line(3, 5 + B, 0, 3 + B, R.d1);
    s.px(0, 3 + B, MKD);
    s.ball(2, 3 + B, 10, 5, R);
    s.hline(4, 10, 7 + B, MKB.b);
    leg(s, 5, 7 + B, L.nb[0], L.nb[1], G, 2, R.b);
    leg(s, 10, 7 + B, L.nf[0], L.nf[1], G, 2, R.b);
    // head with the pointy snout
    s.map(9, 0 + B, [
        '.Lbb..',
        'kbKwbb',
        'bbKKbbn',
        '.bbbd..'
    ], MKEY);
}

function meerkatDig(s, f) {
    const R = MK;
    // bottom up, head down, front paws scraping
    s.line(3, 3, 0, 1, R.d1);
    s.px(0, 1, MKD);
    s.thick(4, 6, 3, 8, 2, R.d1);
    s.ball(2, 2, 9, 5, R);
    s.ball(7, 4, 5, 4, R);
    s.thick(5, 6, 5, 8, 2, R.b);
    s.map(9, 5, [
        '.Lbb.',
        'kbKwb',
        'bbKKbn'
    ], MKEY);
    // paws digging
    if (f === 0) s.thick(10, 7, 12, 8, 2, R.d1);
    else s.thick(10, 7, 8, 9, 2, R.d1);
    // a little pile of sand and flying bits
    const D = DUST;
    s.oval(0, 7, 5, 3, D[1]);
    s.px(1, 7, D[0]);
    if (f === 0) {
        s.px(1, 3, D[2]);
        s.px(0, 5, D[1]);
        s.px(3, 1, D[1]);
    } else {
        s.px(2, 2, D[2]);
        s.px(0, 4, D[1]);
        s.px(4, 0, D[1]);
        s.px(1, 1, D[0]);
    }
}

const meerkatDef = {
    name: 'a-meerkat',
    sheet: 'animals-savanna',
    w: 11,
    h: 14,
    anchor: [4, 13],
    outlineOptions: { skip: fxSkip },
    anims: {
        idle: [(s) => { meerkatStand(s, {}); s.point('head', 5, 0); }, (s) => { meerkatStand(s, { bob: 1 }); s.point('head', 5, -1); }],
        blink: [(s) => meerkatStand(s, { eyes: 'closed' })],
        eat: [(s) => { meerkatStand(s, { rows: MEER_EAT }); s.point('mouth', 8, 4); }, (s) => { meerkatStand(s, { rows: MEER_EAT, bob: 1 }); s.point('mouth', 8, 3); }],
        look: [(s) => meerkatStand(s, { rows: MEER_LOOK })],
        special: { w: 13, h: 16, anchor: [6, 15], frames: [0, 1, 2].map((f) => (s) => meerkatPop(s, f)) },
        walk: { w: 16, h: 10, anchor: [8, 9], frames: [0, 1, 2, 3].map((f) => (s) => meerkatWalk(s, f)) },
        dig: { w: 15, h: 10, anchor: [7, 9], frames: [0, 1].map((f) => (s) => meerkatDig(s, f)) }
    }
};


// ===========================================================================
// FLAMINGO – pink, S-neck, bent black-tipped beak, one-legged rest
// ===========================================================================
const FL = ramp('#f794ba');
const FLW = ramp('#ee6d9b');
const FLEG = ramp('#e9799a');
const BEAK = '#fbe8e4';
const BEAKD = '#e7c4c4';
const BLACKF = '#33243a';

/** Head in profile with the bent beak; (x, y) = top-left of the head. */
function flamingoHead(s, x, y, { eyes = 'open' } = {}) {
    s.ball(x, y, 5, 4, FL);
    // pale beak that bends down into a black tip
    s.map(x + 4, y, [
        'bbb.',
        'bbbk',
        '..kk',
        '..k.'
    ], { b: BEAK, k: BLACKF });
    s.hline(x + 5, x + 6, y + 1, BEAKD);
    if (eyes === 'open') {
        s.px(x + 2, y + 1, EYE);
        s.px(x + 2, y + 2, EYE);
    } else {
        s.px(x + 2, y + 2, EYE);
        s.px(x + 1, y + 2, EYE);
    }
    s.px(x + 3, y + 3, BLUSH);
}

/** Head upside down in the water (eating); (x, y) = top-left. */
function flamingoHeadDown(s, x, y) {
    s.ball(x + 1, y, 4, 4, FL);
    s.map(x - 1, y + 2, [
        '..bb.',
        '.bbb.',
        'kbb..',
        'k....'
    ], { b: BEAK, k: BLACKF });
    s.px(x + 3, y + 1, EYE);
}

// S-shaped neck from the chest up to the head
const NECK_S = [[9, 4], [8, 5], [7, 6], [7, 7], [8, 8], [9, 9], [10, 10], [10, 11]];

function flamingoBody(s, x, y, { wing = 'fold' } = {}) {
    s.px(x - 1, y + 3, FL.d1);                          // tail feathers
    s.px(x - 1, y + 4, FL.d1);
    s.px(x, y + 5, BLACKF);
    s.ball(x, y, 11, 7, FL);
    if (wing === 'fold') {
        s.ball(x + 2, y + 1, 8, 4, FLW);
        s.hline(x + 1, x + 3, y + 4, BLACKF);            // black flight feathers peek out
        s.px(x + 1, y + 3, BLACKF);
    }
}

function flamingoLeg(s, hip, knee, foot, col) {
    s.line(hip[0], hip[1], knee[0], knee[1], col);
    s.line(knee[0], knee[1], foot[0], foot[1], col);
    s.px(knee[0] + 1, knee[1], col);                     // the knobbly "knee"
    s.hline(foot[0] - 1, foot[0] + 2, foot[1], col);
}

function flamingoStand(s, o = {}) {
    const { eyes = 'open', bob = 0, head = 'side', lift = 0 } = o;
    const G = 28;
    // standing leg and the tucked-up one
    flamingoLeg(s, [7, 17], [7, 22], [7, G], FLEG.b);
    s.line(8, 17 + bob, 10, 20 - lift, FLEG.d1);
    s.line(10, 20 - lift, 7, 21 - lift, FLEG.d1);
    flamingoBody(s, 2, 11 + bob);
    for (const [nx, ny] of NECK_S) s.rect(nx, ny + bob, 2, 1, FL.b);
    for (const [nx, ny] of NECK_S) s.px(nx, ny + bob, FL.l1);
    if (head === 'front') {
        // face to the viewer: two little eyes, beak pointing down
        const y = bob;
        s.ball(7, y, 6, 5, FL);
        s.px(8, y + 2, EYE);
        s.px(11, y + 2, EYE);
        s.px(8, y + 3, BLUSH);
        s.px(11, y + 3, BLUSH);
        s.rect(9, y + 3, 2, 2, BEAK);
        s.rect(9, y + 5, 2, 1, BEAKD);
        s.hline(9, 10, y + 6, BLACKF);
        s.point('head', 9, y);
        return;
    }
    flamingoHead(s, 8, bob, { eyes });
    s.point('head', 10, bob);
}

// walk: [far hip->knee->foot, near hip->knee->foot], body bob
const FL_WALK = [
    { far: [[6, 22], [4, 28]], near: [[9, 22], [10, 28]], bob: 0 },
    { far: [[8, 22], [5, 24]], near: [[8, 22], [8, 28]], bob: -1 },
    { far: [[8, 22], [9, 28]], near: [[6, 22], [5, 28]], bob: 0 },
    { far: [[7, 22], [7, 28]], near: [[8, 22], [6, 25]], bob: -1 }
];

function flamingoWalk(s, f) {
    const w = FL_WALK[f];
    const B = w.bob;
    flamingoLeg(s, [7, 17 + B], w.far[0], w.far[1], FLEG.d1);
    flamingoBody(s, 2, 11 + B);
    for (const [nx, ny] of NECK_S) s.rect(nx + (f % 2 ? 0 : 1), ny + B, 2, 1, FL.b);
    for (const [nx, ny] of NECK_S) s.px(nx + (f % 2 ? 0 : 1), ny + B, FL.l1);
    flamingoHead(s, 8 + (f % 2 ? 0 : 1), B);
    flamingoLeg(s, [8, 17 + B], w.near[0], w.near[1], FLEG.b);
}

function flamingoEat(s, f) {
    const G = 28;
    flamingoLeg(s, [7, 17], [6, 22], [5, G], FLEG.d1);
    flamingoBody(s, 2, 11);
    // neck arcs forward and all the way down to the water
    const sw = f;
    const neck = [[12, 12], [13, 11], [14, 11], [15, 12], [16, 13], [16, 14], [16, 15], [16, 16], [16, 17], [16, 18], [16, 19], [16, 20], [15 + sw, 21], [15 + sw, 22]];
    for (const [nx, ny] of neck) s.rect(nx, ny, 2, 1, FL.b);
    for (const [nx, ny] of neck.slice(0, 4)) s.px(nx, ny, FL.l1);
    flamingoHeadDown(s, 14 + sw, 23);
    flamingoLeg(s, [8, 17], [9, 22], [9, G], FLEG.b);
    s.point('mouth', 14 + sw, 27);
}

/** One wing as a fan of feathers from the shoulder, black flight feathers at the edge. */
function flamingoWing(s, pts, blackPts, R, light = null) {
    s.poly(pts, R.b);
    s.poly(blackPts, BLACKF);
    if (light) s.line(light[0], light[1], light[2], light[3], R.l1);
}

function flamingoWings(s, f) {
    // wing display: pink wings open, black flight feathers showing
    const G = 26;
    flamingoLeg(s, [7, 17], [7, 22], [7, G], FLEG.d1);
    flamingoLeg(s, [8, 17], [9, 22], [10, G], FLEG.b);
    if (f === 0) {
        // both wings raised high above the back
        flamingoWing(s, [[6, 13], [1, 3], [1, -2], [4, -3], [7, 5], [9, 12]], [[1, -2], [4, -3], [3, -1], [2, 1], [1, 1]], { b: FLW.d1, l1: FLW.b });
        flamingoBody(s, 2, 11, { wing: 'none' });
        flamingoWing(s, [[5, 14], [4, 5], [6, -1], [9, -2], [11, 6], [10, 14]], [[6, -1], [9, -2], [9, 0], [7, 2], [5, 2]], FLW, [6, 12, 6, 3]);
        s.px(4, 6, BLACKF);
        s.px(4, 8, BLACKF);
    } else {
        // wings swept out behind, flight feathers fanned
        flamingoWing(s, [[7, 12], [-2, 5], [-3, 7], [5, 14]], [[-2, 5], [-3, 7], [-4, 6], [-3, 4]], { b: FLW.d1, l1: FLW.b });
        flamingoBody(s, 2, 11, { wing: 'none' });
        flamingoWing(s, [[9, 13], [0, 9], [-3, 11], [-2, 13], [6, 16]], [[0, 9], [-3, 11], [-2, 13], [-4, 13], [-5, 10]], FLW, [8, 13, 0, 10]);
        s.px(1, 13, BLACKF);
        s.px(3, 14, BLACKF);
    }
    for (const [nx, ny] of NECK_S) s.rect(nx, ny, 2, 1, FL.b);
    for (const [nx, ny] of NECK_S) s.px(nx, ny, FL.l1);
    flamingoHead(s, 8, 0, { eyes: 'closed' });
    s.point('head', 10, 0);
}

function flamingoFly(s, f) {
    // body level, neck stretched forward, legs trailing behind
    s.line(12, 8, 2, 9, FLEG.b);
    s.hline(0, 2, 9, FLEG.d1);
    s.line(12, 9, 3, 10, FLEG.d1);
    if (f === 0) {
        s.poly([[13, 6], [9, -1], [12, -1], [19, 6]], FLW.d1);
        s.poly([[9, -1], [12, -1], [10, -3], [8, -2]], BLACKF);
    } else {
        s.poly([[13, 9], [10, 15], [13, 15], [19, 9]], FLW.d1);
        s.poly([[10, 15], [13, 15], [11, 17], [9, 16]], BLACKF);
    }
    s.ball(11, 5, 10, 5, FL);
    s.rect(20, 6, 6, 2, FL.b);
    s.hline(20, 25, 6, FL.l1);
    flamingoHead(s, 25, 4);
    if (f === 0) {
        s.poly([[14, 6], [13, 0], [16, -1], [19, 6]], FLW.b);
        s.poly([[13, 0], [16, -1], [15, -3], [13, -2]], BLACKF);
    } else {
        s.poly([[14, 8], [13, 14], [16, 15], [19, 8]], FLW.b);
        s.poly([[13, 14], [16, 15], [15, 17], [12, 16]], BLACKF);
    }
}

const flamingoDef = {
    name: 'a-flamingo',
    sheet: 'animals-savanna',
    w: 16,
    h: 29,
    anchor: [7, 28],
    anims: {
        idle: frames([{}, { bob: 1, lift: 1 }], flamingoStand),
        blink: frames([{ eyes: 'closed' }], flamingoStand),
        walk: { w: 16, h: 29, anchor: [7, 28], frames: [0, 1, 2, 3].map((f) => (s) => flamingoWalk(s, f)) },
        eat: { w: 21, h: 29, anchor: [7, 28], frames: [0, 1].map((f) => (s) => flamingoEat(s, f)) },
        look: frames([{ head: 'front' }], flamingoStand),
        special: { w: 21, h: 30, anchor: [12, 29], frames: [0, 1].map((f) => (s) => flamingoWings(view(s, 5, 3), f)) },
        fly: { w: 33, h: 22, anchor: [16, 11], frames: [0, 1].map((f) => (s) => flamingoFly(view(s, 1, 4), f)) }
    }
};


// ===========================================================================
// PROPS – golden-hour savanna scenery (anchor = bottom centre)
// ===========================================================================
const LEAF = ramp('#76903a');
const GOLDLIGHT = '#e7d97c';
const ABARK = ramp('#6f5345');
const BAO = ramp('#b8917c');
const GRASS = [ramp('#e4b75b'), ramp('#eac774'), ramp('#d59747')];
const TERM = ramp('#c47744');
const ROCK = ramp('#bea38a');
const TWIG = ramp('#9a7457');
const LOG = ramp('#d0bfa6');

/** Flat umbrella canopy made of leafy clumps, lit gold on top. */
function canopy(s, x, y, w, h, seed = 1) {
    const R = LEAF;
    s.oval(x, y + 1, w, h, R.d1);
    s.oval(x + 2, y, w - 4, h - 1, R.b);
    // lumpy top edge and dangling clumps
    const n = Math.floor(w / 5);
    for (let i = 0; i < n; i += 1) {
        const cx = x + 2 + Math.floor((i * (w - 6)) / Math.max(1, n - 1));
        const bump = (hash(i, seed) % 3) - 1;
        s.oval(cx - 2, y - 1 + bump, 6, 4, R.b);
        s.hline(cx - 1, cx + 2, y - 1 + bump, R.l1);
        s.px(cx, y - 1 + bump, GOLDLIGHT);
        s.px(cx + 1, y + bump, R.l1);
        s.oval(cx - 1, y + h - 2 + (hash(seed, i) % 2), 5, 3, R.d1);
    }
    // leafy texture: light specks on top, dark under the edge
    for (let yy = y; yy < y + h + 2; yy += 1) {
        for (let xx = x; xx < x + w; xx += 1) {
            if (!s.opaque(xx, yy)) continue;
            const hsh = hash(xx * 3 + seed, yy * 7);
            if (yy < y + h / 2 && hsh % 9 === 0) s.px(xx, yy, R.l1);
            if (yy >= y + h / 2 && hsh % 7 === 0) s.px(xx, yy, R.d2);
        }
    }
    s.hline(x + 3, x + w - 4, y + h, R.d2);
}

function acacia(s, big) {
    const W = big ? 50 : 38;
    const G = (big ? 42 : 33) - 1;
    const cx = Math.floor(W / 2);
    const R = ABARK;
    const top = big ? 27 : 21;
    const cy = big ? 6 : 5;
    const ch = big ? 9 : 7;
    // trunk with a flared foot
    s.thick(cx - 1, G, cx + 1, top, 3, R.b);
    s.vline(cx - 2, top + 2, G - 1, R.l1);
    s.hline(cx - 3, cx + 3, G, R.d1);
    s.px(cx - 3, G - 1, R.b);
    s.px(cx + 3, G - 1, R.d1);
    // branches fanning up into the canopy
    const spread = big ? [-15, -8, 5, 14] : [-11, -5, 5, 10];
    spread.forEach((dx, i) => {
        const bx = cx + dx;
        const by = cy + ch - 1;
        s.thick(cx + (dx < 0 ? 0 : 1), top, bx, by, 2, i % 2 ? R.b : R.d1);
        s.line(cx + Math.round(dx / 2), Math.round((top + by) / 2), bx + (dx < 0 ? -3 : 3), by, R.d1);
    });
    canopy(s, 1, cy, W - 2, ch, big ? 3 : 5);
    // bits of branch showing under the canopy
    for (const dx of spread) s.px(cx + dx, cy + ch, R.d1);
}

function baobab(s) {
    const R = BAO;
    const G = 45;
    // stubby root-like branches on top
    const br = [[[14, 14], [9, 7], [4, 5]], [[17, 13], [15, 5], [12, 1]], [[22, 13], [24, 5], [27, 2]], [[25, 14], [31, 9], [35, 8]]];
    for (const b of br) {
        s.thick(b[0][0], b[0][1], b[1][0], b[1][1], 3, R.d1);
        s.thick(b[1][0], b[1][1], b[2][0], b[2][1], 2, R.d1);
        s.line(b[0][0] - 1, b[0][1], b[1][0] - 1, b[1][1], R.b);
    }
    // a few leafy tufts at the tips
    for (const b of br) {
        const [tx, ty] = b[2];
        s.oval(tx - 2, ty - 2, 5, 3, LEAF.b);
        s.px(tx - 1, ty - 2, LEAF.l1);
        s.px(tx, ty - 2, GOLDLIGHT);
    }
    // the huge bottle-shaped trunk
    const trunk = [[9, G], [29, G], [31, 38], [31, 27], [28, 17], [25, 12], [13, 12], [10, 17], [7, 27], [7, 38]];
    s.poly(trunk, R.b);
    // light from the left, shade on the right
    remap(s, (x, y) => y >= 12 && x <= 12 - Math.floor((y - 12) / 9), { [R.b]: R.l1 });
    remap(s, (x, y) => y >= 12 && x <= 10 - Math.floor((y - 12) / 9) && y > 18 && y < 40, { [R.l1]: R.l2 });
    remap(s, (x, y) => y >= 12 && x >= 25 + Math.floor((y - 12) / 6), { [R.b]: R.d1 });
    // bark creases
    for (const [x0, y0, y1] of [[13, 18, 42], [17, 15, 40], [21, 16, 44], [25, 19, 41], [28, 26, 43]]) {
        s.vline(x0, y0, y1, R.d1);
    }
    s.px(20, 30, R.d2);                                  // a little knot hole
    s.px(19, 30, R.d2);
    s.hline(9, 29, G, R.d2);
    s.hline(13, 25, 12, R.l1);
}

const GRASS_SIZE = [[13, 11], [13, 14], [15, 9]];

function grassTuft(s, kind, f) {
    const R = GRASS[kind];
    const [gw, gh] = GRASS_SIZE[kind];
    const G = gh - 1;
    const sway = f ? 1 : 0;
    const cx = Math.floor(gw / 2);
    // [base dx, tip dx, height]: few blades, well apart so each one reads
    const blades = kind === 0
        ? [[-1, -5, 6], [0, -2, 9], [0, 2, 8], [1, 5, 5]]
        : kind === 1
            ? [[-1, -4, 7], [0, -1, 11], [1, 3, 9], [1, 5, 5]]
            : [[-1, -5, 4], [0, -2, 6], [0, 1, 5], [1, 4, 6], [1, 6, 3]];
    blades.forEach(([b0, dx, h], i) => {
        const tipX = cx + dx + sway;
        const tipY = G - h;
        const midX = cx + Math.round((b0 + dx) / 2) + (h > 6 ? sway : 0);
        const midY = G - Math.round(h / 2);
        s.line(cx + b0, G, midX, midY, R.b);
        s.line(midX, midY, tipX, tipY, i % 2 ? R.l1 : R.b);
        s.px(tipX, tipY, R.l2);
    });
    s.hline(cx - 1, cx + 1, G, R.d1);
    if (kind === 1) {
        // fluffy seed heads on the tall stalks
        for (const [dx, h] of [[-1, 11], [3, 9]]) {
            const tx = cx + dx + sway;
            s.px(tx, G - h - 1, R.l2);
            s.px(tx - 1, G - h, R.l1);
            s.px(tx + 1, G - h + 1, R.l1);
        }
    }
}

function termiteMound(s) {
    const R = TERM;
    const G = 19;
    s.poly([[1, G + 1], [13, G + 1], [11, 14], [10, 9], [9, 4], [8, 1], [6, 0], [5, 2], [4, 7], [3, 12]], R.b);
    s.ball(8, 7, 5, 7, R);                               // side turret
    s.poly([[9, 8], [11, 8], [11, 4], [10, 3]], R.b);
    s.px(10, 3, R.l1);
    // lit left side, shaded right
    remap(s, (x, y) => x <= 4 + Math.floor(y / 6), { [R.b]: R.l1 });
    remap(s, (x, y) => x >= 10 - Math.floor((19 - y) / 8) && y > 12, { [R.b]: R.d1 });
    s.line(6, 1, 5, 6, R.l2);
    // ridges and little holes
    s.line(6, 8, 7, 16, R.d1);
    s.line(4, 13, 5, 18, R.d1);
    s.px(7, 5, R.d2);
    s.px(5, 11, R.d2);
    s.px(10, 12, R.d2);
    s.hline(1, 12, G, R.d2);
}

function boulder(s, x, y, w, h) {
    const R = ROCK;
    s.oval(x, y, w, h, R.d2);                              // rim so stacked stones read apart
    s.ball(x + 1, y, w - 2, h - 1, R);
    s.px(x + Math.floor(w * 0.35), y + 1, R.l2);
    s.px(x + Math.floor(w * 0.35) + 1, y + 1, R.l2);
}

function kopje(s, big) {
    const R = ROCK;
    if (big) {
        boulder(s, 0, 7, 9, 6);
        boulder(s, 16, 7, 9, 6);
        boulder(s, 12, 2, 12, 10);
        boulder(s, 2, 0, 14, 13);
        s.line(8, 2, 10, 7, R.d1);                      // cracks
        s.line(19, 5, 18, 9, R.d1);
        s.hline(1, 23, 12, R.d2);
    } else {
        boulder(s, 7, 2, 10, 8);
        boulder(s, 0, 3, 9, 7);
        boulder(s, 5, 0, 7, 6);
        s.line(2, 5, 3, 8, R.d1);
        s.hline(1, 15, 9, R.d2);
    }
}

function dryBush(s) {
    const R = TWIG;
    const G = 11;
    // a loose dome of forked, thorny twigs
    const twigs = [[1, 5], [3, 2], [7, 0], [11, 1], [15, 3], [16, 7]];
    twigs.forEach(([tx, ty], i) => {
        const bx = 8 + (i < 3 ? -1 : 1);
        const mx = Math.round((bx + tx) / 2);
        const my = Math.round((G + ty) / 2) + 1;
        s.line(bx, G, mx, my, R.d1);
        s.line(mx, my, tx, ty, R.b);
        s.line(mx, my, mx + (tx < 8 ? 2 : -2), my - 3, R.b);     // fork
        s.px(tx, ty, R.l1);
    });
    s.hline(6, 10, G, R.d1);
    // olive leaves and pale thorns
    for (const [lx, ly] of [[2, 3], [6, 1], [11, 0], [14, 2], [4, 6], [12, 5], [9, 4]]) {
        s.px(lx, ly, '#9aa653');
        s.px(lx + 1, ly, '#7e8c40');
    }
    s.px(12, 0, GOLDLIGHT);
    for (const [tx, ty] of [[4, 3], [13, 3], [8, 2], [15, 6]]) s.px(tx, ty, '#f2e4c8');
}

function sunLog(s) {
    const R = LOG;
    s.rect(1, 2, 17, 5, R.b);
    s.hline(1, 17, 2, R.l1);
    s.hline(2, 16, 3, R.l2);
    s.hline(1, 17, 6, R.d1);
    s.px(0, 3, R.b);
    s.px(0, 5, R.d1);
    // cracks in the bleached wood
    s.line(4, 4, 9, 4, R.d1);
    s.line(11, 5, 15, 5, R.d1);
    // cut end with rings
    s.oval(16, 1, 5, 7, R.d1);
    s.oval(17, 2, 3, 5, R.l1);
    s.px(18, 4, R.d1);
    // broken branch stub
    s.rect(6, 0, 2, 2, R.b);
    s.px(6, 0, R.l1);
}

const prop = (name, w, h, paint, anim = null, extra = {}) => ({
    name,
    sheet: 'props-savanna',
    w,
    h,
    anchor: [Math.floor(w / 2), h - 1],
    anims: { idle: anim || [(s) => paint(s)] },
    ...extra
});
const SOFT = { outlineOptions: { strength: 0.5 } };

const props = [
    prop('p-acacia', 50, 42, (s) => acacia(s, true)),
    prop('p-acacia2', 38, 33, (s) => acacia(s, false)),
    prop('p-baobab', 38, 46, baobab),
    prop('p-savgrass', 13, 11, null, [0, 1].map((f) => (s) => grassTuft(s, 0, f)), SOFT),
    prop('p-savgrass2', 13, 14, null, [0, 1].map((f) => (s) => grassTuft(s, 1, f)), SOFT),
    prop('p-savgrass3', 15, 9, null, [0, 1].map((f) => (s) => grassTuft(s, 2, f)), SOFT),
    prop('p-termite', 14, 20, termiteMound),
    prop('p-kopje', 25, 13, (s) => kopje(s, true)),
    prop('p-kopje2', 17, 10, (s) => kopje(s, false)),
    prop('p-drybush', 18, 12, dryBush, null, SOFT),
    prop('p-sunlog', 22, 8, sunLog)
];

export default [
    giraffeDef, zebraDef, elephantDef, elephantCalfDef, lionDef, lionessDef, lionCubDef,
    hippoDef, rhinoDef, meerkatDef, flamingoDef, ...props
].map((def) => padDef(def, def === lionDef ? { t: 3 } : {}));
