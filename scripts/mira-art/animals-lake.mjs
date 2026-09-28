/*
 * Glittersjön – the glittering lake at sunset.
 *
 * Animals (sheet 'animals-lake'), fish (sheet 'fish') and lake props
 * (sheet 'props-lake'). Everything faces right.
 *
 * Swimmers use the waterline anchor: the anchor row is the water surface,
 * the game draws the water over the rows below it.
 */
import { Sprite, mix, alpha } from './kit.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A view of `s` whose origin is moved by (dx, dy): lets one draw function serve
 *  frames of different sizes while the body stays put relative to the anchor. */
function shifted(s, dx, dy, w = s.w - dx, h = s.h - dy) {
    if (!dx && !dy && w === s.w && h === s.h) return s;
    const t = Object.create(Sprite.prototype);
    t.w = w;                      // painters that size things from s.w / s.h
    t.h = h;                      // see the base frame, not the margins
    t.data = s.data;
    t.points = s.points;
    t.px = (x, y, c) => { s.px(x + dx, y + dy, c); return t; };
    t.get = (x, y) => s.get(x + dx, y + dy);
    t.opaque = (x, y) => s.opaque(x + dx, y + dy);
    t.inside = (x, y) => s.inside(x + dx, y + dy);
    t.point = (n, x, y) => { s.point(n, x + dx, y + dy); return t; };
    return t;
}

/** Animation spec from a base frame { w, h, anchor } grown by margins. */
function grow(base, painters, { l = 0, r = 0, t = 0, b = 0 } = {}) {
    return {
        w: base.w + l + r,
        h: base.h + t + b,
        anchor: [base.anchor[0] + l, base.anchor[1] + t],
        frames: painters.map((p) => (s, i) => p(shifted(s, l, t, base.w, base.h), i))
    };
}

/** Grow every animation of a definition by the same margins (keeps anchors). */
function padDef(def, { l = 0, r = 0, t = 0, b = 0 }) {
    const wrap = (painters, w, h) => painters.map((p) => (s, i) => p(shifted(s, l, t, w, h), i));
    const anims = {};
    for (const [name, spec] of Object.entries(def.anims)) {
        anims[name] = Array.isArray(spec)
            ? wrap(spec, def.w, def.h)
            : { ...spec, w: spec.w + l + r, h: spec.h + t + b, anchor: [spec.anchor[0] + l, spec.anchor[1] + t], frames: wrap(spec.frames, spec.w, spec.h) };
    }
    return { ...def, w: def.w + l + r, h: def.h + t + b, anchor: [def.anchor[0] + l, def.anchor[1] + t], anims };
}

/** 2×2 eye with a sparkle (medium animals). */
function eye2(s, x, y, dark = EYE, sparkle = '#ffffff') {
    s.rect(x, y, 2, 2, dark);
    s.px(x + 1, y, sparkle);
}

/** Tilted ball: an oval rotated by `ang` (radians, + = clockwise) with the same
 *  top-left light and bottom-right shade as Sprite.ball. Centre (cx, cy). */
function rball(s, cx, cy, rx, ry, ang, { b, l1, d1, l2 = null }, { light = true, dark = true } = {}) {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const inE = (px, py, ox, oy, k = 1) => {
        const dx = px - (cx + ox);
        const dy = py - (cy + oy);
        const u = (dx * ca + dy * sa) / rx;
        const v = (-dx * sa + dy * ca) / ry;
        return u * u + v * v <= k;
    };
    const R = Math.ceil(Math.max(rx, ry)) + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y += 1) {
        for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x += 1) {
            const px = x + 0.5;
            const py = y + 0.5;
            if (!inE(px, py, 0, 0, 1.08)) continue;
            let c = b;
            if (dark && !inE(px, py, 0.9, 1.1)) c = d1;
            else if (light && !inE(px, py, -0.9, -1.1) && py - cy < 0.2 * ry && px - cx < 0.4 * rx) c = l1;
            if (l2 && light && inE(px, py, -rx * 0.38, -ry * 0.42, 0.09)) c = l2;
            s.px(x, y, c);
        }
    }
    return s;
}

const EYE = '#2a1a2a';
const BLUSH = '#f7a0b0';
const WAKE = { a: '#e4f5ff', b: '#b8e0f7' };           // ripples on the surface
const SPLASH = { b: '#d6f0ff', l: '#f4fbff', d: '#a6d6f2' };
// water ripples and splash drops are never outlined
const WATER_SKIP = (r, g, b) => ['e4f5ff', 'b8e0f7', 'd6f0ff', 'f4fbff', 'a6d6f2'].includes(
    [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));

// ===========================================================================
// SWAN (svan) – mute swan: white, orange bill with a black knob, S-neck.
// ===========================================================================
const SW = { b: '#f7f3f7', l1: '#ffffff', l2: '#ffffff', d1: '#d8cfe4', d2: '#ada1c6' };
const SWBILL = { b: '#f5892e', l1: '#ffb35c', d1: '#cf5f22' };
const KNOB = '#2e2030';
const SWAN = { w: 26, h: 22, anchor: [12, 18] };   // anchor row = waterline (y 18)
const WL = 18;

// ripple dashes on the water surface around a swimmer
function wake(s, spots, f) {
    for (const [x, len, dir] of spots) {
        const x0 = x + (f ? dir : 0);
        for (let i = 0; i < len; i += 1) s.px(x0 + i, WL, i === 0 || i === len - 1 ? WAKE.b : WAKE.a);
    }
}

function swanBody(s, { y = 1, tilt = 0 } = {}) {
    // tail: the rear end sweeps up to a point
    s.poly([[0.5, 7.5 + y - tilt], [8, 11 + y], [8, 16 + y], [3, 14 + y]], SW.b);
    s.px(1, 8 + y - tilt, SW.l1);
    s.px(2, 9 + y - tilt, SW.l1);
    // body: a round boat
    s.ball(3, 10 + y, 17, 9, SW);
    s.hline(5, 16, 17 + y, SW.d1);
}

function swanWingFolded(s, { y = 1, tilt = 0 } = {}) {
    // folded wing: a soft teardrop on the back, front end at the shoulder
    s.poly([[2.5, 9.5 + y - tilt], [7, 7.5 + y], [12, 7.5 + y], [16.5, 10 + y], [16.5, 13.5 + y], [6, 14.5 + y], [3, 12 + y]], SW.b);
    s.hline(7, 11, 8 + y, SW.l1);
    s.hline(5, 7, 9 + y, SW.l1);
    s.px(4, 10 + y - tilt, SW.l1);
    s.px(12, 8 + y, SW.l1);
    // lower edge of the wing and the long feathers at the back
    s.hline(7, 15, 14 + y, SW.d1);
    s.px(16, 13 + y, SW.d1);
    s.px(6, 13 + y, SW.d1);
    s.line(3, 11 + y - tilt, 5, 13 + y, SW.d1);
    s.line(6, 11 + y, 7, 12 + y, SW.d1);
}

// one raised wing, built from separate feathers fanned out from the arm
// (outer primaries first), so the tips read as "fingers".
function swanWing(s, { sh, wr, tips }, c) {
    const n = tips.length;
    for (let i = n - 1; i >= 0; i -= 1) {
        const t = n === 1 ? 0 : i / (n - 1);
        const bx = wr[0] + (sh[0] - wr[0]) * t * 0.8;
        const by = wr[1] + (sh[1] - wr[1]) * t * 0.8;
        const [tx, ty] = tips[i];
        s.thick(bx, by, tx, ty, 3, c.b);
        // shadow line on the underside of each feather
        s.line(Math.round(bx + (tx - bx) * 0.35), Math.round(by + (ty - by) * 0.35) + 1, tx + (tx < bx ? 1 : 0), ty + 1, c.d1);
    }
    // coverts: the soft top of the wing along the arm
    s.thick(sh[0], sh[1], wr[0], wr[1], 3, c.b);
    s.line(sh[0] - 1, sh[1] - 1, wr[0] - 1, wr[1], c.l1);
    s.px(wr[0], wr[1] - 1, c.l1);
}

function swanWingsUp(s, { y = 1, spread = 0 } = {}) {
    const far = { b: SW.d1, l1: SW.b, d1: SW.d2 };
    if (spread === 0) {
        // wings raised straight up like two sails, fingers to the sky
        swanWing(s, { sh: [16, 10 + y], wr: [16, 1 + y], tips: [[15, -5 + y], [13, -5 + y], [12, -3 + y]] }, far);
        swanWing(s, { sh: [14, 11 + y], wr: [12, 1 + y], tips: [[10, -5 + y], [7, -5 + y], [5, -3 + y], [4, 0 + y], [5, 4 + y], [7, 8 + y]] }, SW);
    } else {
        // wings spread wide and high
        swanWing(s, { sh: [16, 10 + y], wr: [16, 0 + y], tips: [[14, -6 + y], [11, -6 + y], [9, -4 + y]] }, far);
        swanWing(s, { sh: [14, 11 + y], wr: [9, 0 + y], tips: [[5, -5 + y], [1, -4 + y], [-2, -1 + y], [-2, 3 + y], [0, 7 + y], [3, 10 + y]] }, SW);
    }
}

// a soft lavender contour along the top of the body, so raised white
// wings behind it stay readable
function swanBackContour(s, y) {
    const cx = 11.5;
    const cy = 14.5 + y;
    for (let x = 5; x <= 15; x += 1) {
        const dx = (x + 0.5 - cx) / 8.5;
        const top = Math.round(cy - 4.5 * Math.sqrt(Math.max(0, 1 - dx * dx)));
        s.px(x, top, SW.d1);
    }
}

// neck + head maps. Origin = top-left of the map, placed at (11, y).
const SWAN_KEY = {
    L: SW.l1, W: SW.b, D: SW.d1, E: EYE, S: '#ffffff', K: KNOB,
    O: SWBILL.b, o: SWBILL.l1, n: SWBILL.d1, P: BLUSH
};
const SWAN_NECK = [
    '..WWWD....',
    '.LWWD.....',
    'LWWD......',
    'LWWD......',
    'LWWWD.....',
    '.LWWWD....',
    '..LWWWD...'
];
const SWAN_HEAD_SIDE = [
    '..LLL.....',
    '.LLWWWK...',
    '.LWESDKoO.',
    '.WWEEWOOOn',
    '.DPWWWOn..'
];
const SWAN_HEAD_FRONT = [
    '..LLLLL..',
    '.LLWWWWWD',
    '.ESWWWESD',
    '.EEWKWEED',
    '.PWOOOWPD',
    '..WWOWD..',
    '...WnD...'
];

function swanHead(s, y, { eyes = 'open', look = false } = {}) {
    s.map(11, y + 5, SWAN_NECK, SWAN_KEY);
    if (look) {
        s.map(10, y, SWAN_HEAD_FRONT, SWAN_KEY);
        if (eyes === 'closed') {
            s.rect(11, y + 2, 2, 2, SW.b);
            s.rect(16, y + 2, 2, 2, SW.b);
            s.hline(11, 12, y + 3, EYE);
            s.hline(16, 17, y + 3, EYE);
        }
        return;
    }
    s.map(11, y, SWAN_HEAD_SIDE, SWAN_KEY);
    if (eyes === 'closed') {
        s.rect(14, y + 2, 2, 2, SW.b);
        s.px(16, y + 2, SW.b);
        s.hline(14, 15, y + 3, EYE);
    } else if (eyes === 'happy') {
        s.rect(14, y + 2, 2, 2, SW.b);
        s.px(16, y + 2, SW.b);
        s.px(14, y + 3, EYE);
        s.px(15, y + 2, EYE);
        s.px(16, y + 3, EYE);
    }
}

// head under water: the neck bows forward and down into the lake
function swanNeckDip(s, y, deep) {
    const d = deep ? 1 : 0;
    const path = [[15, 11 + y], [16, 9 + y + d], [18, 8 + y + d], [20, 9 + y + d], [21 + d, 11 + y + d], [21 + d, 14 + y], [22 + d, WL + 1]];
    for (let i = 1; i < path.length; i += 1) s.thick(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1], 3, SW.b);
    // light along the top of the bend, shade on the inside and the far edge
    s.hline(16, 19, 7 + y + d, SW.l1);
    s.px(15, 8 + y + d, SW.l1);
    s.px(21, 8 + y + d, SW.l1);
    s.vline(23 + d, 11 + y + d, WL, SW.d1);
    s.px(19 + d, 10 + y + d, SW.d1);
    s.vline(20 + d, 12 + y + d, WL, SW.d1);
}

function drawSwan(s, o = {}) {
    const { bob = 0, eyes = 'open', look = false, wake: wk = null, wings = 'folded', spread = 0, dip = null } = o;
    const y = 1 + bob;
    const tilt = dip === 1 ? 2 : 0;
    if (wings === 'up') swanWingsUp(s, { y, spread });
    swanBody(s, { y, tilt });
    if (wings === 'folded') swanWingFolded(s, { y, tilt });
    else swanBackContour(s, y);
    if (dip !== null) {
        swanNeckDip(s, y, dip === 1);
        // rings where the head went in
        s.px(19 + dip, WL, WAKE.b);
        s.px(24 + dip, WL, WAKE.b);
        s.px(25 + dip, WL - 1 - dip, WAKE.a);
        s.px(23, WL - 2 - dip, WAKE.a);
    } else {
        const hy = y - (wings === 'up' ? spread : 0);
        swanHead(s, hy, { eyes, look });
        s.point('head', 14, hy);
    }
    if (wk !== null) wake(s, [[20, 3, 1], [0, 3, -1]], wk);
}

const swanDef = {
    name: 'a-swan',
    sheet: 'animals-lake',
    ...SWAN,
    outlineOptions: { skip: WATER_SKIP },
    anims: {
        idle: [(s) => drawSwan(s, {}), (s) => drawSwan(s, { bob: 1 })],
        blink: [(s) => drawSwan(s, { eyes: 'closed' })],
        look: [(s) => drawSwan(s, { look: true })],
        swim: grow(SWAN, [(s) => drawSwan(s, { wake: 0 }), (s) => drawSwan(s, { bob: 1, wake: 1 })], { l: 1, r: 1 }),
        special: grow(SWAN, [(s) => drawSwan(s, { wings: 'up', spread: 0, eyes: 'happy' }), (s) => drawSwan(s, { wings: 'up', spread: 1, bob: -1, eyes: 'happy' })], { l: 4, t: 8 }),
        eat: grow(SWAN, [(s) => drawSwan(s, { dip: 0 }), (s) => drawSwan(s, { dip: 1 })], { r: 2 })
    }
};

// ===========================================================================
// CYGNET – a grey, fluffy baby swan.
// ===========================================================================
const CY = { b: '#b9aeb6', l1: '#dcd3da', l2: '#f1ebef', d1: '#94879a', d2: '#716479' };
const CYBILL = { b: '#5a4f5f', l: '#86767f' };
const CYGNET = { w: 14, h: 12, anchor: [6, 9] };   // anchor row = waterline (y 9)
const CWL = 9;
const CYGNET_KEY = { l: CY.l2, L: CY.l1, B: CY.b, D: CY.d1, d: CY.d2, E: EYE, S: '#ffffff', n: CYBILL.b, m: CYBILL.l, P: BLUSH };
// profile, origin (0, 0); rows 10+ are under water
const CYGNET_SIDE = [
    '..............',
    '......LLL.....',
    '.....LlBBB....',
    '.....LBESBm...',
    '.....BBEEBnn..',
    '.....BPBBD....',
    '..l...BBBD....',
    '.LBLLLDBBBD...',
    '.BBBBBBBBBBD..',
    '.DBBBBBBBBD...',
    '..DDDDDDDD....',
    '...dddddd.....'
];
const CYGNET_FRONT = [
    '..............',
    '......LLL.....',
    '.....LlBBBB...',
    '....LESBESB...',
    '....BEEmEEB...',
    '....BPBnBPD...',
    '..l...BBBD....',
    '.LBLLLDBBBD...',
    '.BBBBBBBBBBD..',
    '.DBBBBBBBBD...',
    '..DDDDDDDD....',
    '...dddddd.....'
];

function drawCygnet(s, { bob = 0, eyes = 'open', look = false, wake: wk = null, tail = 0 } = {}) {
    s.map(0, bob, look ? CYGNET_FRONT : CYGNET_SIDE, CYGNET_KEY);
    // little wing
    s.line(3, 8 + bob, 6, 8 + bob, CY.d1);
    if (tail) {
        s.px(2, 6 + bob, null);
        s.px(3, 6 + bob, CY.l2);
    }
    if (eyes === 'closed') {
        for (const x of look ? [5, 8] : [7]) {
            s.rect(x, 3 + bob, 2, 2, CY.b);
            s.hline(x, x + 1, 4 + bob, EYE);
        }
    }
    if (wk !== null) {
        s.px(11 + wk, CWL, WAKE.a);
        s.px(12 + wk, CWL, WAKE.b);
        s.px(wk ? 0 : 1, CWL, WAKE.b);
    }
    s.point('head', 7, 1 + bob);
}

const cygnetDef = {
    name: 'a-cygnet',
    sheet: 'animals-lake',
    ...CYGNET,
    outlineOptions: { skip: WATER_SKIP },
    anims: {
        idle: [(s) => drawCygnet(s, {}), (s) => drawCygnet(s, { bob: 1, tail: 1 })],
        blink: [(s) => drawCygnet(s, { eyes: 'closed' })],
        swim: [(s) => drawCygnet(s, { wake: 0 }), (s) => drawCygnet(s, { bob: 1, wake: 1 })],
        look: [(s) => drawCygnet(s, { look: true })]
    }
};

// ===========================================================================
// FROG (groda) – sits on a lily pad; big eye bumps on top.
// ===========================================================================
const FG = { b: '#5fbf45', l1: '#98e068', l2: '#c8f59a', d1: '#3a8c3c', d2: '#2a6234' };
const FBELLY = { b: '#e6f3a2', d1: '#c2d77a' };
const FTONGUE = '#ff7fa6';
const FROG = { w: 13, h: 10, anchor: [5, 9] };

// frog maps, 3/4 view facing right, feet on row 9.
// far eye bump (dark) at x 2..5, near eye bump at x 6..9.
const FROG_KEY = { G: FG.b, L: FG.l1, l: FG.l2, D: FG.d1, d: FG.d2, E: EYE, S: '#ffffff', Y: FBELLY.b, y: FBELLY.d1, P: BLUSH, M: '#2c5a34' };
const FROG_SIT = [
    '...........',
    '...DG.LLG..',
    '..DESDGESG.',
    '..DEEDGEEG.',
    '.LLGGGGGGGG',
    'LGGGGGGGPGG',
    'GGDGGGMMMMd',
    'GLGDGGYYYG.',
    'GGGGDGYYyG.',
    'DDDDDD.DGGD'
];
const FROG_CROUCH = [
    '...........',
    '...........',
    '...DG.LLG..',
    '..DESDGESG.',
    '..DEEDGEEG.',
    'LLGGGGGGPGG',
    'GGDGGGMMMMd',
    'GLGDGGYYYG.',
    'GGGGDGYYyG.',
    'DDDDDD.DGGD'
];
// in the air: body stretched up and forward, legs trailing (origin x-3, y-6)
const FROG_LEAP = [
    '..........DG.LLG.',
    '.........DESDGESG',
    '.........DEEDGEEG',
    '........LLGGGGGGG',
    '.......LGGGGGGPGG',
    '......LGGGGGMMMMd',
    '.....LGGDGGYYYG..',
    '....DGGGDGYYy.GG.',
    '...DGD..DD.....D.',
    '..DD.....D.......',
    '.DD......D.......',
    'dD.......dd......'
];
// landing: front legs reach down first, hind legs still behind (origin x-2, y-2)
const FROG_LAND = [
    '...........DG.LLG',
    '..........DESDGES',
    '..........DEEDGEE',
    '........LLGGGGGGG',
    '......LLGGGGGGPGG',
    '....LGGGGGGGMMMMd',
    '..DDGGDGGGGYYYG..',
    '.DD.DDGGDGYYyGG..',
    'dD.....DD....G...',
    '.............GD..',
    '.................'
];

function frogEyesShut(s, x0, y0, far, near, happy) {
    for (const [x, c] of [[far, FG.d1], [near, FG.b]]) {
        s.rect(x0 + x, y0, 2, 2, c);
        if (happy) { s.px(x0 + x, y0 + 1, EYE); s.px(x0 + x + 1, y0, EYE); }
        else s.hline(x0 + x, x0 + x + 1, y0 + 1, EYE);
    }
}

// pose: 'sit' (default), 'crouch', 'leap', 'land'
function drawFrog(s, o = {}) {
    const { pose = 'sit', eyes = 'open', bubble = 0, tongue = null, look = false, throat = 0 } = o;
    if (look) {
        // facing the viewer: wide smile, two eyes on top, belly between the arms
        s.ball(1, 3, 10, 7, FG);
        s.oval(3, 5, 6, 4, FBELLY.b);
        for (const x of [0, 7]) {
            s.oval(x, 1, 4, 4, FG.b);
            s.px(x + 1, 1, FG.l1);
            if (eyes === 'closed') s.hline(x + 1, x + 2, 3, EYE);
            else eye2(s, x + 1, 2);
        }
        s.hline(3, 8, 5, FG.d2);
        s.px(2, 4, FG.d2);
        s.px(9, 4, FG.d2);
        s.px(2, 5, BLUSH);
        s.px(9, 5, BLUSH);
        s.hline(2, 3, 9, FG.d1);
        s.hline(8, 9, 9, FG.d1);
        s.point('head', 5, 1);
        return;
    }
    if (pose === 'leap' || pose === 'land') {
        const leap = pose === 'leap';
        const [ox, oy] = leap ? [-3, -6] : [-2, -2];
        s.map(ox, oy, leap ? FROG_LEAP : FROG_LAND, FROG_KEY);
        if (eyes !== 'open') frogEyesShut(s, ox + (leap ? 10 : 11), oy + 1, 0, 4, eyes === 'happy');
        s.point('head', ox + 14, oy);
        return;
    }
    const dy = pose === 'sit' ? 0 : 1;
    s.map(0, 0, pose === 'sit' ? FROG_SIT : FROG_CROUCH, FROG_KEY);
    if (eyes !== 'open') frogEyesShut(s, 3, 2 + dy, 0, 4, eyes === 'happy');
    if (throat) s.hline(6, 8, 9, FBELLY.d1);
    if (tongue) {
        const [tx, ty] = tongue;
        s.px(10, 6 + dy, '#9c2c55');
        s.line(10, 5 + dy, tx, ty, FTONGUE);
        s.rect(tx - 1, ty - 1, 2, 2, FTONGUE);
    }
    if (bubble) {
        // croak: the throat puffs up into a shiny bubble
        const w = bubble === 1 ? 4 : 6;
        const h = bubble === 1 ? 3 : 5;
        s.oval(7, 6 + dy, w, h, '#fbf3dc');
        s.px(8, 7 + dy, '#ffffff');
        s.hline(8, 7 + w - 2, 6 + dy + h - 1, '#eadbb8');
    }
    s.point('head', 7, 1 + dy);
}

function fly(s, x, y, f) {
    s.px(x, y, '#3a2a4a');
    s.px(x + 1, y, '#3a2a4a');
    s.px(x + (f ? 0 : 1), y - 1, '#e8f4ffcc');
}

const frogDef = {
    name: 'a-frog',
    sheet: 'animals-lake',
    ...FROG,
    anims: {
        idle: [(s) => drawFrog(s, {}), (s) => drawFrog(s, { throat: 1 })],
        blink: [(s) => drawFrog(s, { eyes: 'closed' })],
        look: [(s) => drawFrog(s, { look: true })],
        eat: grow(FROG, [(s) => drawFrog(s, { bubble: 1 }), (s) => drawFrog(s, { bubble: 2, eyes: 'happy' })], { r: 2 }),
        special: grow(FROG, [
            (s) => { drawFrog(s, {}); fly(s, 16, 1, 0); },
            (s) => { drawFrog(s, { tongue: [16, 2] }); fly(s, 15, 1, 1); }
        ], { r: 6 }),
        hop: grow(FROG, [
            (s) => drawFrog(s, { pose: 'crouch' }),
            (s) => drawFrog(s, { pose: 'leap' }),
            (s) => drawFrog(s, { pose: 'land' })
        ], { t: 7, l: 4, r: 3 })
    }
};

// ===========================================================================
// BEAVER (bäver) – brown, flat scaly tail, orange front teeth.
// Land poses stand on the bottom row; swim/special sit on the waterline.
// ===========================================================================
const BV = { b: '#a0663a', l1: '#c98f58', l2: '#e3b27a', d1: '#784526', d2: '#55301d' };
const BVH = { b: BV.b, l1: BV.l1, d1: BV.d1 };     // ball() without the l2 blotch
const BVMUZ = { b: '#dcae80', l: '#f0cfa2', d1: '#b98a62' };
const BVTAIL = { b: '#5b4a5a', l: '#7d6a7a', d: '#3e3140' };
const BVTEETH = { b: '#f7a43c', l: '#ffd48a', d: '#d9812c' };
const BVNOSE = '#3a2226';
const BEAVER = { w: 23, h: 14, anchor: [10, 13] };

// flat paddle tail with a criss-cross of scales
function beaverTail(s, x, y, w, h) {
    s.oval(x, y, w, h, BVTAIL.b);
    for (let j = 1; j < h - 1; j += 1) {
        for (let i = 1; i < w - 1; i += 1) {
            if (s.opaque(x + i, y + j) && (i + j) % 2 === 0) s.px(x + i, y + j, BVTAIL.l);
        }
    }
    s.hline(x + 1, x + w - 2, y + h - 1, BVTAIL.d);
    s.px(x + 1, y + 1, BVTAIL.l);
}

function beaverHead(s, x, y, { eyes = 'open', look = false, chew = 0 } = {}) {
    if (look) {
        // face to the viewer: round head, ears on top, big buck teeth
        s.circle(x + 1, y + 1, 1, BV.d1);
        s.circle(x + 8, y + 1, 1, BV.d1);
        s.px(x + 1, y + 1, BV.d2);
        s.px(x + 8, y + 1, BV.d2);
        s.ball(x, y + 1, 10, 8, BV);
        s.oval(x + 2, y + 5, 6, 4, BVMUZ.b);
        s.rect(x + 4, y + 5, 2, 1, BVNOSE);
        s.px(x + 4, y + 6, BVMUZ.d1);
        s.px(x + 5, y + 6, BVMUZ.d1);
        s.rect(x + 4, y + 8, 2, 2, BVTEETH.b);
        s.px(x + 4, y + 8, BVTEETH.l);
        s.px(x + 5, y + 9, BVTEETH.d);
        if (eyes === 'closed') {
            s.hline(x + 2, x + 3, y + 4, EYE);
            s.hline(x + 6, x + 7, y + 4, EYE);
        } else {
            eye2(s, x + 2, y + 3);
            eye2(s, x + 6, y + 3);
        }
        s.px(x + 1, y + 6, BLUSH);
        s.px(x + 8, y + 6, BLUSH);
        return;
    }
    // round ear sticking up at the back of the head
    s.circle(x + 2, y + 1, 1, BV.b);
    s.px(x + 2, y + 1, BV.d2);
    s.px(x + 1, y, BV.l1);
    s.ball(x, y + 1, 9, 8, BVH);
    // blunt muzzle that pokes out, dark nose on top, buck teeth below
    s.oval(x + 5, y + 3, 5, 5, BVMUZ.b);
    s.rect(x + 8, y + 3, 2, 1, BVNOSE);
    s.px(x + 9, y + 4, BVNOSE);
    s.px(x + 8, y + 4, BVMUZ.l);
    s.hline(x + 6, x + 8, y + 7, BVMUZ.d1);
    s.rect(x + 6, y + 8 - chew, 2, 2, BVTEETH.b);
    s.px(x + 6, y + 8 - chew, BVTEETH.l);
    s.px(x + 7, y + 9 - chew, BVTEETH.d);
    if (eyes === 'closed') s.hline(x + 4, x + 5, y + 3, EYE);
    else if (eyes === 'happy') { s.px(x + 4, y + 3, EYE); s.px(x + 5, y + 2, EYE); s.px(x + 6, y + 3, EYE); }
    else eye2(s, x + 4, y + 2);
    s.px(x + 4, y + 5, BLUSH);
}

// standing / walking on land. legs: [backFar, backNear, frontFar, frontNear] lifts
function drawBeaverLand(s, { legs = [0, 0, 0, 0], bob = 0, eyes = 'open', look = false, tail = 0 } = {}) {
    const y = bob;
    const G = 13;                                   // ground row
    // big flat paddle tail on the ground behind
    beaverTail(s, 0, 8 + y - tail, 9, 4);
    // far legs (darker, behind)
    s.rect(5, 10 + y, 2, G - 10 - y - legs[0] + 1, BV.d2);
    s.rect(11, 10 + y, 2, G - 10 - y - legs[2] + 1, BV.d2);
    // body: a round, hunched potato
    s.ball(3, 4 + y, 11, 8, BVH);
    s.px(6, 5 + y, BV.l2);
    // near legs with dark webbed feet
    s.rect(6, 10 + y, 2, G - 10 - y - legs[1], BV.d1);
    s.hline(5, 8, G - legs[1], BV.d2);
    s.rect(12, 10 + y, 2, G - 10 - y - legs[3], BV.d1);
    s.hline(12, 14, G - legs[3], BV.d2);
    if (look) beaverHead(s, 11, 1 + y, { eyes, look: true });
    else beaverHead(s, 12, 2 + y, { eyes });
    s.point('head', look ? 16 : 15, (look ? 1 : 2) + y);
}

// sitting up on the tail, gnawing a stick held in the front paws
function drawBeaverGnaw(s, f) {
    beaverTail(s, 0, 9, 10, 5);                     // tail flat on the ground behind
    s.ball(5, 3, 10, 11, BVH);                      // upright round body
    s.oval(9, 6, 5, 7, BVMUZ.b);                    // pale tummy
    s.px(10, 7, BVMUZ.l);
    s.hline(4, 9, 13, BV.d2);                       // big hind foot
    s.rect(6, 11, 3, 2, BV.d1);
    beaverHead(s, 9, -1, { eyes: 'happy', chew: f });
    // the stick with a leaf, held like a corn cob
    const sy = 8;
    s.hline(11, 23, sy, '#c9975c');
    s.hline(11, 22, sy + 1, '#8c6238');
    s.px(23, sy + 1, '#6e4a2a');
    if (f) s.px(16, sy, '#f0d6a6');                // fresh bite mark
    s.px(22, sy - 1, '#6fbf4a');
    s.px(23, sy - 2, '#8fdb62');
    s.px(21, sy - 2, '#6fbf4a');
    // front paws
    s.rect(12, sy - 1, 2, 3, BV.d1);
    s.px(12, sy - 1, BV.b);
    s.rect(18, sy, 2, 2, BV.d1);
    // wood chips
    if (f) { s.px(21, 2, '#e8c890'); s.px(23, 4, '#caa068'); }
    else s.px(20, 4, '#e8c890');
    s.point('head', 12, -1);
}

// in the water: only the head, the top of the back and the tail show.
const BVW = 7;                                 // waterline row in the water frames
function drawBeaverSwim(s, { f = 0, tail = 'flat', splash = false } = {}) {
    if (tail === 'up') {
        s.oval(0, BVW - 10, 4, 9, BVTAIL.b);
        s.px(1, BVW - 8, BVTAIL.l);
        s.px(2, BVW - 7, BVTAIL.l);
        s.px(1, BVW - 6, BVTAIL.l);
        s.px(2, BVW - 5, BVTAIL.l);
        s.vline(3, BVW - 8, BVW - 3, BVTAIL.d);
    }
    // back as a low hump
    s.ball(3, BVW - 3, 13, 6, BVH);
    s.px(6, BVW - 2, BV.l2);
    if (tail === 'flat') beaverTail(s, -1, BVW - 1, 7, 2);
    else if (tail === 'slap') beaverTail(s, -3, BVW - 1, 8, 2);
    beaverHead(s, 13, BVW - 6, { eyes: 'open' });
    // nose wake
    s.px(23 + f, BVW, WAKE.a);
    s.px(24 + f, BVW, WAKE.b);
    if (splash) {
        // a crown of drops where the tail hit the water
        for (const [dx, dy] of [[-4, -2], [-3, -4], [-1, -6], [1, -7], [3, -5], [5, -3], [6, -1]]) {
            s.px(dx, BVW + dy, SPLASH.b);
            s.px(dx, BVW + dy + 1, SPLASH.d);
        }
        s.px(-2, BVW - 8, SPLASH.l);
        s.px(4, BVW - 8, SPLASH.l);
        s.hline(-4, 5, BVW, SPLASH.l);
    }
}

const BEAVER_WATER = { w: 24, h: 10, anchor: [11, BVW] };
const beaverDef = {
    name: 'a-beaver',
    sheet: 'animals-lake',
    ...BEAVER,
    outlineOptions: { skip: WATER_SKIP },
    anims: {
        idle: [(s) => drawBeaverLand(s, {}), (s) => drawBeaverLand(s, { tail: 1 })],
        blink: [(s) => drawBeaverLand(s, { eyes: 'closed' })],
        look: [(s) => drawBeaverLand(s, { look: true })],
        walk: [
            (s) => drawBeaverLand(s, { legs: [0, 1, 1, 0] }),
            (s) => drawBeaverLand(s, { legs: [0, 0, 0, 0], bob: -1 }),
            (s) => drawBeaverLand(s, { legs: [1, 0, 0, 1] }),
            (s) => drawBeaverLand(s, { legs: [0, 0, 0, 0], bob: -1 })
        ],
        eat: grow(BEAVER, [0, 1].map((f) => (s) => drawBeaverGnaw(s, f)), { t: 2, r: 2 }),
        swim: grow(BEAVER_WATER, [(s) => drawBeaverSwim(s, { f: 0 }), (s) => drawBeaverSwim(s, { f: 1 })], { l: 2, r: 2, t: 1 }),
        special: grow(BEAVER_WATER, [
            (s) => drawBeaverSwim(s, { tail: 'up' }),
            (s) => drawBeaverSwim(s, { tail: 'slap', splash: true })
        ], { l: 6, t: 5, r: 2 })
    }
};

// ===========================================================================
// OTTER (utter) – floats on its back with a pebble on its tummy.
// Every pose sits on the waterline (anchor row OWL).
// ===========================================================================
const OT = { b: '#8d5a38', l1: '#b37c50', l2: '#d09c6c', d1: '#6a3f26', d2: '#4a2a1c' };
const OTH = { b: OT.b, l1: OT.l1, d1: OT.d1 };
const OTC = { b: '#f0dcbc', d1: '#d6b98f' };           // pale face, chest and tummy
const OTNOSE = '#2e1c1e';
const OTPAW = '#5a3622';
const PEBBLE = { b: '#9aa6ba', l: '#d8e0ee', d: '#6c7890' };
const MINNOW = { b: '#b9c9dc', l: '#e8f0fa', d: '#7d8fa8', fin: '#8fa3bf' };
const OTTER = { w: 22, h: 13, anchor: [10, 9] };
const OWL = 9;
const OTTER_KEY = { a: OT.d1, B: OT.b, L: OT.l1, C: OTC.b, c: OTC.d1, N: OTNOSE, E: EYE, S: '#ffffff', P: BLUSH, w: '#fff6e6' };
// profile head: brown on top, pale cheeks and chin, nose at the tip.
// The pale throat joins the pale tummy.
const OTTER_HEAD = [
    '.aLLL...',
    'aLBBBBB.',
    'BBBBESBN',
    'BBBBEECN',
    'BBPCCCCw',
    '.BCCCCC.',
    '..CCCC..'
];
// face to the viewer: tiny ears on the sides, pale muzzle, nose in the middle
const OTTER_FRONT = [
    '.aLLLLa.',
    'aLBBBBBa',
    'BESBBESB',
    'BEECCEEB',
    'BPCNNCPB',
    '.BCccCB.',
    '..CCCC..'
];

function otterHead(s, x, y, { eyes = 'open', look = false, mouth = 'smile', cheek = false } = {}) {
    s.map(x, y, look ? OTTER_FRONT : OTTER_HEAD, OTTER_KEY);
    if (look) {
        s.px(x - 1, y + 4, OTC.b);                    // whiskers
        s.px(x + 8, y + 4, OTC.b);
        if (eyes === 'closed') {
            for (const ex of [1, 5]) { s.rect(x + ex, y + 2, 2, 2, OT.b); s.hline(x + ex, x + ex + 1, y + 3, EYE); }
        }
        return;
    }
    s.px(x + 8, y + 4, OTC.d1);                       // whisker
    if (mouth === 'smile') s.px(x + 6, y + 5, OTC.d1);
    else if (mouth === 'chew') { s.hline(x + 5, x + 6, y + 5, OTC.d1); }
    if (cheek) s.px(x + 2, y + 6, OTC.b);
    if (eyes === 'closed') { s.rect(x + 4, y + 2, 2, 2, OT.b); s.hline(x + 4, x + 5, y + 3, EYE); }
    else if (eyes === 'happy') { s.rect(x + 4, y + 2, 2, 2, OT.b); s.px(x + 4, y + 3, EYE); s.px(x + 5, y + 2, EYE); s.px(x + 6, y + 3, EYE); }
}

function pebble(s, x, y) {
    s.oval(x, y, 3, 2, PEBBLE.b);
    s.px(x, y, PEBBLE.l);
    s.px(x + 2, y + 1, PEBBLE.d);
}

function minnow(s, x, y, bitten = false) {
    // a small silver fish, head to the right (bitten: the head is gone)
    const n = bitten ? 3 : 5;
    s.hline(x + 1, x + n, y, MINNOW.b);
    s.hline(x + 1, x + n, y + 1, MINNOW.d);
    s.hline(x + 2, x + Math.min(n, 3), y, MINNOW.l);
    s.vline(x, y - 1, y + 2, MINNOW.fin);
    if (!bitten) s.px(x + 5, y, EYE);
}

// floating on the back: feet up at the left, head up at the right.
// hold: 'pebble' | 'toss' | 'fish' | 'fish2'.  kick: foot phase 0/1.
function drawOtterFloat(s, { eyes = 'open', hold = 'pebble', kick = 0, breathe = 0, look = false, wake: wk = null } = {}) {
    const y = OWL;
    // tail lying on the water behind
    s.thick(0, y - 1, 4, y - 2, 2, OT.d1);
    s.px(0, y - 1, OT.d2);
    // hind feet sticking up out of the water, soles showing
    s.rect(4, y - 6 + kick, 2, 3, OT.d2);
    s.rect(1, y - 7 + (1 - kick), 3, 3, OTPAW);
    s.px(1, y - 8 + (1 - kick), OTPAW);
    s.px(3, y - 8 + (1 - kick), OTPAW);
    s.px(2, y - 6 + (1 - kick), '#8a5a44');
    // body: a low dome, tummy up
    s.ball(2, y - 4 - breathe, 13, 7 + breathe, OTH);
    s.oval(4, y - 4 - breathe, 10, 2, OTC.b);
    s.hline(6, 10, y - 4 - breathe, '#fbf0dc');
    // head raised at the right end
    otterHead(s, 12, y - 8, {
        eyes: !look && (hold === 'toss' || hold === 'fish2') ? 'happy' : eyes,
        look,
        mouth: hold === 'fish2' ? 'chew' : 'smile',
        cheek: hold === 'fish2'
    });
    // front paws and whatever they hold
    const py = y - 5 - breathe;
    if (hold === 'pebble') {
        pebble(s, 7, py - 1);
        s.px(6, py, OTPAW);
        s.px(10, py, OTPAW);
    } else if (hold === 'toss') {
        s.px(7, py - 1, OTPAW);
        s.px(9, py - 1, OTPAW);
        pebble(s, 7, py - 7);
    } else if (hold === 'fish' || hold === 'fish2') {
        // a fish lying on the tummy, nibbled from the head end
        minnow(s, 6, py - 1, hold === 'fish2');
        s.px(6, py, OTPAW);
        s.px(10, py, OTPAW);
    }
    if (wk !== null) {
        s.px(1 - wk, y, WAKE.a);
        s.px(3 + wk, y, WAKE.b);
    }
    s.point('head', 15, y - 8);
}

// rolling over and diving: 0 = back arching in, 1 = only the tail left
function drawOtterDive(s, f) {
    const y = OWL;
    if (f === 0) {
        s.thick(0, y - 1, 4, y - 3, 2, OT.d1);
        s.ball(3, y - 4, 12, 7, OTH);
        s.px(7, y - 4, OT.l2);
        s.px(8, y - 4, OT.l2);
        // head dipping under at the right
        s.ball(13, y - 3, 5, 4, OTH);
        s.px(15, y - 2, OT.l1);
        s.px(18, y, SPLASH.l);
        s.px(19, y - 1, SPLASH.b);
        s.px(17, y - 2, SPLASH.b);
    } else {
        // the tail flicks up as the otter slips under
        s.thick(8, y, 5, y - 4, 2, OT.b);
        s.thick(5, y - 4, 3, y - 6, 1, OT.d1);
        s.px(9, y - 1, OT.l1);
        for (const [dx, dy] of [[10, -2], [12, -3], [2, -2], [13, -1], [1, -1]]) s.px(dx, y + dy, SPLASH.b);
        s.hline(3, 12, y, SPLASH.l);
    }
}

const otterDef = {
    name: 'a-otter',
    sheet: 'animals-lake',
    ...OTTER,
    outlineOptions: { skip: WATER_SKIP },
    anims: {
        idle: [(s) => drawOtterFloat(s, {}), (s) => drawOtterFloat(s, { breathe: 1 })],
        swim: [(s) => drawOtterFloat(s, { kick: 0, wake: 0 }), (s) => drawOtterFloat(s, { kick: 1, wake: 1 })],
        blink: [(s) => drawOtterFloat(s, { eyes: 'closed' })],
        look: [(s) => drawOtterFloat(s, { look: true })],
        special: grow(OTTER, [
            (s) => drawOtterFloat(s, { hold: 'toss' }),
            (s) => drawOtterFloat(s, { hold: 'pebble', eyes: 'happy' })
        ], { t: 4 }),
        eat: [(s) => drawOtterFloat(s, { hold: 'fish' }), (s) => drawOtterFloat(s, { hold: 'fish2' })],
        dive: [(s) => drawOtterDive(s, 0), (s) => drawOtterDive(s, 1)]
    }
};

// ===========================================================================
// GREY HERON (häger) – long legs, S-neck, black crest stripe, yellow bill.
// ===========================================================================
const HG = { b: '#a3abc2', l1: '#c9cfdf', l2: '#e2e6f0', d1: '#7c84a0', d2: '#5a6180' };
const HW = { b: '#f3f1f6', d1: '#d4d0de' };               // white neck and face
const HBLACK = '#2e2638';
const HBILL = { b: '#f2bf3a', l: '#ffe07a', d: '#c98e24' };
const HLEG = { b: '#c9a45e', d: '#9a7a40' };
const HFLIGHT = '#4a4f6a';                                 // dark flight feathers
const HERON = { w: 25, h: 28, anchor: [8, 27] };

function heronHead(s, x, y, { eyes = 'open', look = false, fish = false } = {}) {
    if (look) {
        // turned towards the viewer: both eyes, the bill coming at us, short
        s.oval(x, y, 7, 5, HW.b);
        s.px(x + 6, y + 4, HW.d1);
        s.hline(x, x + 2, y, HBLACK);
        s.line(x - 1, y + 1, x - 4, y + 3, HBLACK);
        s.hline(x + 4, x + 5, y, HBLACK);
        if (eyes === 'closed') {
            s.hline(x + 1, x + 2, y + 2, EYE);
            s.hline(x + 4, x + 5, y + 2, EYE);
        } else {
            eye2(s, x + 1, y + 1);
            eye2(s, x + 4, y + 1);
        }
        s.px(x + 1, y + 3, BLUSH);
        s.px(x + 6, y + 3, BLUSH);
        // foreshortened bill pointing down and forward
        s.poly([[x + 2.5, y + 3], [x + 5.5, y + 3], [x + 6.5, y + 7]], HBILL.b);
        s.px(x + 3, y + 3, HBILL.l);
        s.px(x + 4, y + 3, HBILL.l);
        s.px(x + 5, y + 5, HBILL.d);
        s.px(x + 6, y + 6, HBILL.d);
        return;
    }
    s.oval(x, y, 6, 4, HW.b);
    s.px(x + 5, y + 3, HW.d1);
    // black stripe through the eye, ending in the long plume behind
    s.hline(x, x + 2, y + 1, HBLACK);
    s.line(x - 1, y + 2, x - 4, y + 3, HBLACK);
    if (eyes === 'closed') s.hline(x + 3, x + 4, y + 2, EYE);
    else if (eyes === 'happy') { s.px(x + 3, y + 2, EYE); s.px(x + 4, y + 1, EYE); }
    else eye2(s, x + 3, y + 1);
    s.px(x + 2, y + 3, BLUSH);
    // long, slim dagger bill
    s.hline(x + 6, x + 12, y + 2, HBILL.b);
    s.hline(x + 6, x + 9, y + 1, HBILL.l);
    s.hline(x + 6, x + 10, y + 3, HBILL.d);
    s.px(x + 13, y + 2, HBILL.d);
    if (fish) {
        // a little silver fish held crosswise
        s.vline(x + 10, y - 1, y + 5, MINNOW.b);
        s.vline(x + 11, y, y + 4, MINNOW.d);
        s.px(x + 10, y - 1, EYE);
        s.hline(x + 9, x + 11, y + 6, MINNOW.fin);
    }
}

// the slim S-neck through a list of points (base -> head): grey behind,
// white in front with a dotted black streak down the throat
function heronNeck(s, pts) {
    for (let i = 1; i < pts.length; i += 1) s.thick(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2, HW.b);
    for (let i = 0; i < pts.length; i += 1) {
        const [x, y] = pts[i];
        s.px(x, y, HW.d1);
        if (i % 2 === 1 && i < pts.length - 1) s.px(x + 1, y, HBLACK);
    }
}

// body with the folded wing. (x, y) = top-left of the body box
function heronBody(s, x, y, { tilt = -0.35 } = {}) {
    // long wing tips / tail at the back
    s.thick(x + 1, y + 6, x - 1, y + 8, 2, HFLIGHT);
    rball(s, x + 6.5, y + 4, 6.4, 3.4, tilt, HG);
    // wing line and the dark shoulder patch
    s.line(x + 3, y + 5, x + 9, y + 3, HG.d1);
    s.px(x + 2, y + 6, HFLIGHT);
    s.px(x + 3, y + 7, HFLIGHT);
    s.rect(x + 10, y + 1, 2, 2, HBLACK);
    // pale breast plumes hanging at the front
    s.vline(x + 12, y + 2, y + 6, HW.b);
    s.vline(x + 11, y + 4, y + 7, HW.d1);
    s.px(x + 12, y + 7, HW.d1);
}

function heronLeg(s, hip, knee, foot, far = false) {
    const c = far ? HLEG.d : HLEG.b;
    s.line(hip[0], hip[1], knee[0], knee[1], c);
    s.line(knee[0], knee[1], foot[0], foot[1], c);
}

function heronFoot(s, x, y, far = false) {
    const c = far ? HLEG.d : HLEG.b;
    s.hline(x - 1, x + 2, y, c);
}

// standing / walking. step: null = on one leg (idle), 0..3 = walk phase
function drawHeron(s, { step = null, eyes = 'open', look = false, bob = 0, plume = 0, head = 'up' } = {}) {
    const G = 27;
    const by = 12 + bob;                         // body box top
    if (step === null) {
        // on one leg; the other is tucked up into the belly feathers
        heronLeg(s, [8, by + 7], [8, 22], [8, G - 1]);
        heronFoot(s, 8, G);
        s.line(9, by + 8, 10, by + 10, HLEG.d);
        s.px(9, by + 11, HLEG.d);
    } else {
        const L = [
            { f: [[8, by + 7], [10, 23], [11, G - 1]], b: [[7, by + 7], [6, 23], [5, G - 1]] },
            { f: [[8, by + 7], [8, 23], [8, G - 1]], b: [[7, by + 7], [5, 21], [6, 24]] },
            { f: [[8, by + 7], [6, 23], [5, G - 1]], b: [[7, by + 7], [9, 23], [11, G - 1]] },
            { f: [[8, by + 7], [7, 21], [8, 24]], b: [[7, by + 7], [8, 23], [8, G - 1]] }
        ][step];
        heronLeg(s, ...L.b, true);
        if (L.b[2][1] === G - 1) heronFoot(s, L.b[2][0], G, true);
        else s.px(L.b[2][0] + 1, L.b[2][1] + 1, HLEG.d);
        heronLeg(s, ...L.f);
        if (L.f[2][1] === G - 1) heronFoot(s, L.f[2][0], G);
        else s.px(L.f[2][0] + 1, L.f[2][1] + 1, HLEG.b);
    }
    heronBody(s, 1, by);
    const hx = step === 1 || step === 3 ? 1 : 0;
    const neck = [[11, by + 2], [11, by + 1], [10, by], [9, by - 1], [9, by - 2], [9, by - 3], [10, by - 4], [10, by - 5], [11, by - 6]];
    heronNeck(s, neck.map(([x, y]) => [x + hx, y]));
    if (look) heronHead(s, 9 + hx, by - 10, { eyes, look });
    else heronHead(s, 9 + hx, by - 9 - plume, { eyes });
    s.point('head', 11 + hx, by - 10);
}

// the fishing strike: 0 = poised with the neck pulled in, 1 = stab into the
// water in front of the feet, 2 = back up with a fish in the bill
function drawHeronStrike(s, f) {
    const G = 27;
    const by = 12 + (f === 1 ? 1 : 0);
    heronLeg(s, [8, by + 7], [8, 22], [8, G - 1]);
    heronFoot(s, 8, G);
    s.line(9, by + 8, 10, by + 10, HLEG.d);
    s.px(9, by + 11, HLEG.d);
    heronBody(s, 1, by, { tilt: f === 1 ? -0.15 : -0.35 });
    if (f === 0) {
        // crouched, neck coiled, eyeing the water
        heronNeck(s, [[11, by + 2], [11, by], [10, by - 1], [10, by - 2], [11, by - 3]]);
        heronHead(s, 10, by - 6, {});
    } else if (f === 1) {
        // neck shoots out, bill stabs into the water
        const pts = [[11, by + 2], [13, by + 3], [15, by + 5], [17, by + 7]];
        heronNeck(s, pts);
        // head pointing down-right
        s.oval(16, by + 6, 4, 5, HW.b);
        s.line(16, by + 7, 14, by + 5, HBLACK);
        s.px(18, by + 7, EYE);
        s.px(19, by + 7, '#ffffff');
        s.px(18, by + 8, EYE);
        s.line(19, by + 10, 22, G - 1, HBILL.b);
        s.line(20, by + 10, 23, G - 2, HBILL.d);
        // splash where the bill went in
        for (const [dx, dy] of [[19, G - 2], [20, G - 4], [24, G - 3], [25, G - 5], [26, G - 1]]) s.px(dx, dy, SPLASH.b);
        s.hline(20, 26, G, SPLASH.l);
    } else {
        heronNeck(s, [[11, by + 2], [11, by + 1], [10, by], [9, by - 1], [9, by - 3], [10, by - 4], [10, by - 5], [11, by - 6]]);
        heronHead(s, 9, by - 9, { eyes: 'happy', fish: true });
        // drips off the fish
        s.px(20, by - 2, SPLASH.b);
        s.px(18, by + 1, SPLASH.b);
    }
    s.point('head', 11, by - 9);
}

// swallowing the catch: head tipped up, then a gulp going down the neck
function drawHeronGulp(s, f) {
    const G = 27;
    const by = 12;
    heronLeg(s, [8, by + 7], [8, 22], [8, G - 1]);
    heronFoot(s, 8, G);
    s.line(9, by + 8, 10, by + 10, HLEG.d);
    s.px(9, by + 11, HLEG.d);
    heronBody(s, 1, by);
    heronNeck(s, [[11, by + 2], [11, by + 1], [10, by], [9, by - 1], [9, by - 2], [9, by - 3], [10, by - 4], [10, by - 5], [11, by - 6]]);
    if (f === 0) {
        // head tipped back, bill up, the fish's tail sticking out
        s.oval(9, by - 10, 5, 5, HW.b);
        s.hline(9, 10, by - 8, HBLACK);
        s.line(8, by - 7, 6, by - 5, HBLACK);
        eye2(s, 11, by - 9);
        s.line(12, by - 11, 15, by - 16, HBILL.b);
        s.line(13, by - 11, 16, by - 15, HBILL.d);
        s.px(16, by - 17, MINNOW.fin);
        s.px(17, by - 17, MINNOW.fin);
        s.px(16, by - 16, MINNOW.b);
    } else {
        heronHead(s, 9, by - 9, { eyes: 'happy' });
        // the lump of the fish sliding down
        s.px(8, by - 2, HW.b);
        s.px(11, by - 2, HW.b);
        s.px(11, by - 3, HW.b);
    }
    s.point('head', 11, by - 10);
}

// flying with the neck tucked in and the legs trailing. up: wings raised
function drawHeronFly(s, up) {
    const cy = 9;
    // legs trailing behind
    s.line(9, cy + 1, 1, cy + 2, HLEG.b);
    s.line(9, cy + 2, 2, cy + 3, HLEG.d);
    s.hline(0, 1, cy + 2, HLEG.b);
    // far wing peeking out behind the near one
    if (up) s.poly([[16, cy - 1], [19, cy - 7], [21, cy - 6], [19, cy - 1]], HG.d1);
    else s.poly([[16, cy + 1], [19, cy + 7], [21, cy + 6], [19, cy + 1]], HG.d1);
    // body
    rball(s, 15, cy + 0.5, 6.5, 2.8, 0.05, HG);
    // neck folded into a bulge under the head, head and bill forward
    s.oval(19, cy - 1, 5, 4, HW.b);
    s.px(19, cy + 2, HW.d1);
    s.px(20, cy + 2, HW.d1);
    heronHead(s, 21, cy - 4, {});
    // near wing: broad and arched, pale in front, dark flight feathers behind
    const k = up ? -1 : 1;
    const Y = (d) => cy + k * d;
    s.poly([[10, Y(0.5)], [18, Y(0.5)], [18, Y(3)], [16, Y(8)], [12, Y(10)], [8, Y(10)], [6, Y(7)], [8, Y(3)]], HG.b);
    // dark flight feathers along the trailing edge and the fingered tip
    s.poly([[6, Y(7)], [8, Y(10)], [12, Y(10)], [13, Y(8)], [10, Y(7)], [8, Y(3)]], HFLIGHT);
    s.px(9, Y(10), null);
    s.px(11, Y(10), null);
    s.px(12, Y(9), HFLIGHT);
    // light leading edge, a covert line
    s.line(17, Y(1), 16, Y(6), HG.l1);
    s.line(11, Y(1), 16, Y(1), HG.l1);
    s.line(10, Y(5), 14, Y(5), HG.d1);
}

const heronDef = {
    name: 'a-heron',
    sheet: 'animals-lake',
    ...HERON,
    outlineOptions: { skip: WATER_SKIP },
    anims: {
        idle: [(s) => drawHeron(s, {}), (s) => drawHeron(s, { bob: 1 })],
        blink: [(s) => drawHeron(s, { eyes: 'closed' })],
        look: [(s) => drawHeron(s, { look: true })],
        walk: [0, 1, 2, 3].map((f) => (s) => drawHeron(s, { step: f, bob: f % 2 ? -1 : 0 })),
        special: grow(HERON, [0, 1, 2].map((f) => (s) => drawHeronStrike(s, f)), { r: 3 }),
        eat: grow(HERON, [0, 1].map((f) => (s) => drawHeronGulp(s, f)), { t: 6 }),
        fly: { w: 38, h: 22, anchor: [16, 11], frames: [1, 0].map((up) => (s) => drawHeronFly(shifted(s, 1, 2), up)) }
    }
};

// ===========================================================================
// DRAGONFLY (trollslända) – blue body, big shiny eyes, glassy wings.
// Anchor = centre of the body. Wings are translucent and not outlined.
// ===========================================================================
const DF = { b: '#3a8ff0', l1: '#86c8ff', d1: '#2860c4', d2: '#1f3d8a' };
const DFEYE = { b: '#39d0e0', l: '#b8fbff' };
const WING = { fill: '#d9f6ff88', rim: '#f4fdffcc', glint: '#ffd6f4aa', spot: '#27306acc' };
const DRAGONFLY = { w: 17, h: 12, anchor: [8, 6] };

// one glassy wing from the root (rx, ry) to the tip (tx, ty)
function dfWing(s, rx, ry, tx, ty, { faint = false } = {}) {
    const a = faint ? 0.45 : 1;
    const fill = alpha(WING.fill.slice(0, 7), 0.53 * a);
    const rim = alpha(WING.rim.slice(0, 7), 0.8 * a);
    s.thick(rx, ry, tx, ty, 2, fill);
    s.line(rx, ry, tx, ty, rim);
    if (!faint) {
        s.px(tx, ty, WING.spot);
        s.px(Math.round((rx + tx) / 2), Math.round((ry + ty) / 2), WING.glint);
    }
}

function drawDragonfly(s, { wings = 'up', ghost = null, tilt = 0 } = {}) {
    const y = 6;
    const pose = (w, faint) => {
        if (w === 'up') {
            dfWing(s, 10, y - 1, 8, y - 5, { faint });
            dfWing(s, 9, y - 1, 4, y - 4, { faint });
        } else if (w === 'down') {
            dfWing(s, 10, y + 1, 8, y + 4, { faint });
            dfWing(s, 9, y + 1, 5, y + 3, { faint });
        } else {
            dfWing(s, 10, y - 1, 6, y - 2, { faint });
            dfWing(s, 9, y - 1, 3, y - 1, { faint });
        }
    };
    if (ghost) pose(ghost, true);
    // long thin abdomen with dark rings, tail tip dipping
    for (let x = 3; x <= 9; x += 1) s.px(x, y + (x < 5 ? tilt : 0), x % 2 ? DF.b : DF.d1);
    s.px(2, y + 1 + tilt, DF.d2);
    s.px(6, y - 1, DF.l1);
    // thorax
    s.rect(10, y - 1, 2, 2, DF.d1);
    s.px(10, y - 1, DF.b);
    s.px(10, y + 1, DF.d2);
    s.px(11, y + 1, DF.d2);
    // head: one big shiny eye (the sparkle stays inside the head, so the
    // pale-colour outline skip for the wings never opens the silhouette)
    s.rect(12, y - 2, 4, 3, DFEYE.b);
    s.px(12, y - 2, DFEYE.l);
    s.px(13, y - 2, DFEYE.l);
    s.rect(13, y - 1, 2, 2, EYE);
    s.px(14, y - 1, '#ffffff');
    s.px(12, y + 1, DF.d1);
    pose(wings, false);
    s.point('head', 13, y - 3);
}

const dragonflyDef = {
    name: 'a-dragonfly',
    sheet: 'animals-lake',
    ...DRAGONFLY,
    outlineOptions: { skip: (r, g, b) => (r > 200 && g > 200 && b > 200) || (r === 0x27 && g === 0x30 && b === 0x6a) },
    anims: {
        idle: [(s) => drawDragonfly(s, { wings: 'up', ghost: 'down' }), (s) => drawDragonfly(s, { wings: 'down', ghost: 'up' })],
        fly: [(s) => drawDragonfly(s, { wings: 'up' }), (s) => drawDragonfly(s, { wings: 'level', tilt: 1 })]
    }
};

// ===========================================================================
// FISH – side view facing right, anchor = body centre, 'swim' = 2 tail wags.
// s.point('mouth') marks where the hook/line sits.
// ===========================================================================

/** Piecewise-linear edge: [[x, y], ...] -> y at column x. */
function edgeAt(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i += 1) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return pts[pts.length - 1][1];
}

/** Fill a fish body between a top and a bottom edge. colorAt(v) gets the
 *  vertical position 0 (back) .. 1 (belly) and returns a colour. */
function fishBody(s, top, bot, colorAt) {
    const x0 = Math.max(top[0][0], bot[0][0]);
    const x1 = Math.min(top[top.length - 1][0], bot[bot.length - 1][0]);
    for (let x = x0; x <= x1; x += 1) {
        const t = Math.round(edgeAt(top, x));
        const b = Math.round(edgeAt(bot, x));
        for (let y = t; y <= b; y += 1) s.px(x, y, colorAt(b > t ? (y - t) / (b - t) : 0.5, x, y));
    }
}

/** Standard countershading: dark back, lit flank line, pale belly. */
function shaded(back, flank, belly, { lit = null, shadow = null } = {}) {
    return (v) => {
        if (v < 0.2) return back;
        if (lit && v < 0.34) return lit;
        if (v < 0.62) return flank;
        if (shadow && v > 0.93) return shadow;
        return belly;
    };
}

function fishEye(s, x, y, { ring = null, sparkle = '#ffffff' } = {}) {
    if (ring) {
        s.px(x - 1, y, ring);
        s.px(x - 1, y + 1, ring);
        s.hline(x, x + 1, y - 1, ring);
    }
    s.rect(x, y, 2, 2, EYE);
    s.px(x + 1, y, sparkle);
}

// --- Perch (abborre): green-gold, dark bands, spiky dorsal, red-orange fins --
const PERCH = { back: '#5b7a2e', lit: '#a6b346', flank: '#c4bf45', belly: '#f3e7b0', band: '#3d4a22', fin: '#f2622e', finL: '#ff9a52', spine: '#7c8a5a', membrane: '#b3b98a', spot: '#2a2630' };
function drawPerch(s, f) {
    const w = f ? 1 : 0;
    // tail: forked, olive above and orange-red below
    s.poly([[5.5, 6.2], [1, 1.5 + w], [3.6, 7], [1, 12.5 + w], [5.5, 8.6]], PERCH.spine);
    s.poly([[5.5, 7.4], [3.6, 7.2], [1, 12.5 + w], [5.5, 8.6]], PERCH.fin);
    s.px(1, 2 + w, PERCH.back);
    s.px(3, 9 + w, PERCH.finL);
    // soft second dorsal and the red-orange anal and pelvic fins
    s.poly([[5.5, 4.5], [7, 2.5], [9, 3], [9, 4.5]], PERCH.spine);
    s.poly([[6, 9.5], [8, 12], [9.5, 12], [9.5, 9.5]], PERCH.fin);
    s.poly([[13, 10.5], [13.5, 13], [15.5, 13], [15.5, 10.5]], PERCH.fin);
    s.px(14, 12, PERCH.finL);
    s.px(7, 11, PERCH.finL);
    // spiky first dorsal fin: dark spines, pale membranes, black spot at the back
    for (const [x, tip] of [[10, 0], [11, 2], [12, 0], [13, 2], [14, 0], [15, 2], [16, 3]]) {
        s.vline(x, tip, 3, x % 2 ? PERCH.membrane : PERCH.back);
    }
    s.px(10, 1, PERCH.spot);
    s.px(10, 2, PERCH.spot);
    s.px(11, 2, PERCH.spot);
    // the humped body
    const top = [[5, 6], [8, 4], [11, 2.6], [14, 2.4], [17, 3.6], [20, 6]];
    const bot = [[5, 8], [8, 9.6], [12, 10.6], [16, 10], [19, 8.6], [20, 7.4]];
    fishBody(s, top, bot, shaded(PERCH.back, PERCH.flank, PERCH.belly, { lit: PERCH.lit, shadow: '#dcc98a' }));
    // bold dark bars from the back, tapering towards the belly
    for (const [x, len] of [[6, 3], [9, 5], [12, 6], [15, 4]]) {
        const t = Math.round(edgeAt(top, x));
        s.vline(x, t, t + len - 1, PERCH.band);
        s.px(x + 1, t, PERCH.band);
        s.px(x + 1, t + 1, mix(PERCH.band, PERCH.lit, 0.4));
        s.px(x, t + len, mix(PERCH.band, PERCH.flank, 0.5));
    }
    // golden shine on the flank
    s.px(8, 6, '#e6e07a');
    s.px(11, 7, '#e6e07a');
    // gill cover, pectoral fin, face
    s.line(16, 4, 17, 8, '#8f8e36');
    s.px(15, 8, PERCH.finL);
    s.px(16, 9, PERCH.fin);
    fishEye(s, 17, 4, { ring: '#f2b33a' });
    s.px(19, 7, '#7a3a2a');
    s.px(18, 8, '#7a3a2a');
    s.px(17, 7, BLUSH);
    s.point('mouth', 20, 7);
}

// --- Roach (mört): silvery, red eyes, red fins ---------------------------------
const ROACH = { back: '#5f6f8f', lit: '#c9d3e2', flank: '#dfe6ef', belly: '#f8fbff', fin: '#e8483a', finL: '#ff7a5a' };
function drawRoach(s, f) {
    const w = f ? 1 : 0;
    s.poly([[4, 5.5], [1, 2 + w], [2.5, 6], [1, 10 + w], [4, 7.5]], ROACH.fin);
    s.px(1, 2 + w, ROACH.finL);
    s.poly([[8, 3], [9.5, 0.5], [11.5, 1], [12, 3]], ROACH.fin);
    s.px(10, 1, ROACH.finL);
    s.poly([[6, 8.5], [7, 10.5], [9, 10.5], [9, 8.5]], ROACH.fin);
    s.poly([[12, 9], [12.5, 11], [14, 11], [14, 9]], ROACH.fin);
    const top = [[4, 5.5], [7, 4], [11, 2.6], [15, 3], [18, 5.2]];
    const bot = [[4, 7.5], [8, 8.8], [12, 9.4], [16, 8.4], [18, 6.6]];
    fishBody(s, top, bot, shaded(ROACH.back, ROACH.flank, ROACH.belly, { lit: ROACH.lit, shadow: '#c6cfdc' }));
    // lateral line and scale glints
    s.line(6, 6, 14, 5, '#b8c3d4');
    s.px(9, 4, '#ffffff');
    s.px(12, 7, '#ffffff');
    s.line(14, 4, 15, 7, '#a9b4c8');
    s.px(13, 7, ROACH.finL);
    // red eye
    fishEye(s, 15, 4, { ring: '#e8303a' });
    s.px(17, 6, '#7a4050');
    s.px(15, 6, BLUSH);
    s.point('mouth', 18, 6);
}

// --- Pike (gädda): long, olive with pale spots, duck-bill snout ----------------
const PIKE = { back: '#3d5a2a', lit: '#6c8a3a', flank: '#7f9c42', belly: '#e3e9bb', spot: '#dfe79a', fin: '#c07a3a', finD: '#8a4e26' };
function drawPike(s, f) {
    const w = f ? 1 : 0;
    // forked tail
    s.poly([[5, 5.5], [1, 1 + w], [3, 6], [1, 11 + w], [5, 7.5]], PIKE.fin);
    s.px(2, 3 + w, PIKE.finD);
    s.px(2, 9 + w, PIKE.finD);
    // dorsal and anal fins sit far back, near the tail
    s.poly([[7, 4], [9, 1.5], [12, 2], [12, 4]], PIKE.fin);
    s.px(10, 2, PIKE.finD);
    s.poly([[7, 8.5], [9, 11], [12, 11], [12, 8.5]], PIKE.fin);
    s.px(10, 10, PIKE.finD);
    s.poly([[20, 9], [21, 11], [23, 11], [23, 9]], PIKE.fin);
    const top = [[5, 5.4], [9, 3.8], [14, 3], [21, 2.8], [26, 3.2], [29, 4.6], [33, 5.6]];
    const bot = [[5, 7.6], [10, 8.6], [16, 9.2], [22, 9.2], [27, 8.4], [30, 7.4], [33, 6.6]];
    fishBody(s, top, bot, shaded(PIKE.back, PIKE.flank, PIKE.belly, { lit: PIKE.lit, shadow: '#c5cc98' }));
    // rows of pale spots
    for (const [x, y] of [[8, 5], [11, 4], [13, 6], [15, 4], [17, 6], [19, 4], [21, 6], [23, 4], [10, 7], [14, 8], [18, 8]]) s.px(x, y, PIKE.spot);
    // gill cover
    s.line(25, 4, 26, 8, '#5a7a30');
    s.px(24, 7, PIKE.fin);
    // the long flat duck-bill with a friendly smile
    s.hline(28, 33, 6, '#51702c');
    s.px(33, 6, '#51702c');
    s.hline(28, 31, 7, '#b9c38a');
    fishEye(s, 27, 3);
    s.px(26, 6, BLUSH);
    s.point('mouth', 33, 6);
}

// --- Bream (braxen): tall, bronze body, dark fins ------------------------------
const BREAM = { back: '#6a5030', lit: '#c99a48', flank: '#b8893a', belly: '#ecd9a0', fin: '#5d5566', finL: '#7e7688' };
function drawBream(s, f) {
    const w = f ? 1 : 0;
    s.poly([[5, 7], [1, 1 + w], [3, 7.5], [1, 14 + w], [5, 9]], BREAM.fin);
    s.px(2, 2 + w, BREAM.finL);
    // tall pointed dorsal and the long anal fin along the belly
    s.poly([[11, 2.5], [12.5, -0.5], [14, 0], [15, 2.5]], BREAM.fin);
    s.px(12, 0, BREAM.finL);
    s.poly([[6, 11], [8, 14], [14, 14], [15, 12]], BREAM.fin);
    s.px(9, 13, BREAM.finL);
    const top = [[5, 7], [8, 4.6], [11, 2.6], [14, 2.2], [17, 3.4], [20, 5.6], [22, 7.6]];
    const bot = [[5, 9], [8, 11.6], [11, 13], [15, 13], [19, 11.4], [22, 8.8]];
    fishBody(s, top, bot, shaded(BREAM.back, BREAM.flank, BREAM.belly, { lit: BREAM.lit, shadow: '#cdb67e' }));
    s.px(11, 6, '#e6c47a');
    s.px(14, 9, '#e6c47a');
    s.line(18, 5, 19, 10, '#8f6b30');
    s.poly([[17, 9], [16, 11], [18, 11]], BREAM.fin);
    fishEye(s, 19, 6);
    s.px(22, 8, '#6a4030');
    s.px(19, 9, BLUSH);
    s.point('mouth', 22, 8);
}

// --- Zander (gös): grey-green, dark bands, big glassy eyes ---------------------
const ZANDER = { back: '#556452', lit: '#8e9c86', flank: '#a9b59e', belly: '#e8ede2', band: '#48544a', fin: '#8b927e', finD: '#4d5448', glass: '#e8f4f4' };
function drawZander(s, f) {
    const w = f ? 1 : 0;
    s.poly([[5, 5.5], [1, 1.5 + w], [3, 6.2], [1, 10.5 + w], [5, 7.5]], ZANDER.fin);
    s.px(2, 3 + w, ZANDER.finD);
    // spiny first dorsal with dark spots, soft second dorsal
    for (const [x, tip] of [[13, 1], [14, 0], [15, 1], [16, 0], [17, 1]]) s.vline(x, tip, 3, ZANDER.fin);
    s.px(14, 1, ZANDER.finD);
    s.px(16, 2, ZANDER.finD);
    s.poly([[7, 4], [8.5, 1.5], [11, 2], [11, 4]], ZANDER.fin);
    s.px(9, 3, ZANDER.finD);
    s.poly([[8, 8.5], [9, 10.5], [11, 10.5], [11, 8.5]], ZANDER.fin);
    s.poly([[17, 9], [17.5, 11], [19, 11], [19, 9]], ZANDER.fin);
    const top = [[5, 5.4], [9, 4], [14, 3.2], [20, 3], [24, 4], [27, 5.6]];
    const bot = [[5, 7.6], [10, 8.6], [15, 9.2], [21, 8.8], [25, 7.8], [27, 6.8]];
    fishBody(s, top, bot, shaded(ZANDER.back, ZANDER.flank, ZANDER.belly, { lit: ZANDER.lit, shadow: '#cdd3c5' }));
    for (const x of [8, 11, 14, 17, 20]) {
        const t = Math.round(edgeAt(top, x));
        s.vline(x, t, t + 3, ZANDER.band);
    }
    s.line(21, 4, 22, 8, '#76816e');
    // big glassy eye
    s.rect(22, 3, 3, 3, ZANDER.glass);
    s.rect(23, 4, 2, 2, EYE);
    s.px(24, 4, '#ffffff');
    s.px(22, 3, '#ffffff');
    s.px(27, 6, '#4a5048');
    s.px(22, 7, BLUSH);
    s.point('mouth', 27, 6);
}

// --- Goldfish (guldfisk): shining gold, flowing veil fins, magic sparkle -------
const GOLD = { back: '#e8761c', lit: '#ffd24a', flank: '#ffa628', belly: '#ffe38a', shade: '#f09a2a', fin: '#ffb04acc', finL: '#ffe07acc', finD: '#f07a2acc' };
function drawGoldfish(s, f) {
    const w = f ? 1 : 0;
    // long flowing veil tail
    s.poly([[6, 6], [3, 1 + w], [0, 3 + w], [1.5, 7.5], [0, 12 + w], [3, 13 + w], [6, 8.5]], GOLD.fin);
    s.line(5, 6, 2, 2 + w, GOLD.finL);
    s.line(5, 8, 2, 12 + w, GOLD.finD);
    s.px(1, 4 + w, GOLD.finL);
    // flowing dorsal and belly fins
    s.poly([[9, 3], [9, 0.5], [12, -0.5 + w], [13, 1], [13, 3]], GOLD.fin);
    s.px(10, 1, GOLD.finL);
    s.poly([[10, 10], [9, 13 + w], [11, 13], [12, 10]], GOLD.fin);
    const top = [[6, 6], [8, 3.6], [11, 2.4], [14, 2.6], [17, 4.4], [19, 6.4]];
    const bot = [[6, 8], [8, 10], [11, 10.8], [14, 10.4], [17, 9], [19, 7.4]];
    fishBody(s, top, bot, shaded(GOLD.back, GOLD.flank, GOLD.belly, { lit: GOLD.lit, shadow: GOLD.shade }));
    // shine
    s.hline(10, 12, 4, '#fff3b0');
    s.px(9, 5, '#fff3b0');
    s.px(13, 8, '#ffcb52');
    s.line(15, 3, 16, 8, '#e8861c');
    fishEye(s, 16, 4);
    s.px(18, 7, '#b04a2a');
    s.px(16, 7, BLUSH);
    // the magic sparkle twinkles
    const [sx, sy] = f ? [12, 6] : [8, 2];
    s.px(sx, sy, '#ffffff');
    s.px(f ? 19 : 17, f ? 1 : 0, '#fffbe0');
    if (!f) { s.px(16, 0, '#fff6c0aa'); s.px(18, 0, '#fff6c0aa'); s.px(17, 1, '#fff6c0aa'); }
    s.point('mouth', 19, 7);
}

// --- Old rubber boot (gammal stövel), dripping --------------------------------
const BOOT = { b: '#5e7a55', l1: '#86a377', d1: '#435a40', d2: '#2f3f33', sole: '#3a3036', patch: '#c9884e', weed: '#5fae4a' };
function drawBoot(s, f) {
    // shaft
    s.rect(3, 2, 6, 8, BOOT.b);
    s.vline(3, 2, 9, BOOT.l1);
    s.vline(8, 3, 9, BOOT.d1);
    // opening at the top
    s.hline(3, 8, 1, BOOT.d1);
    s.hline(4, 7, 2, BOOT.d2);
    // foot and toe
    s.poly([[3, 9], [9, 8], [12, 9], [13.5, 11], [13.5, 12.5], [3, 12.5]], BOOT.b);
    s.hline(10, 12, 9, BOOT.l1);
    s.hline(3, 13, 12, BOOT.sole);
    s.px(5, 12, BOOT.d2);
    s.px(9, 12, BOOT.d2);
    s.hline(4, 12, 11, BOOT.d1);
    // a patch and a hole
    s.rect(5, 5, 2, 2, BOOT.patch);
    s.px(5, 5, '#e3a96a');
    s.px(11, 10, BOOT.d2);
    // water weed hanging over the rim
    s.line(7, 0, 9, 2, BOOT.weed);
    s.px(9, 3, BOOT.weed);
    s.px(9, 4, '#4a8a3a');
    // drips
    s.px(13, 13 + f, SPLASH.d);
    if (f) s.px(2, 11, SPLASH.b);
    else s.px(13, 14, SPLASH.b);
    s.point('mouth', 5, 1);
}

// --- Message in a bottle (flaskpost) -------------------------------------------
const GLASS = { b: '#8fd6bfb0', l: '#e8fff6dd', d: '#4f9a8ab8' };
function drawBottle(s, f) {
    // glass body, neck and cork
    s.rect(2, 2, 10, 5, GLASS.b);
    s.px(2, 2, null);
    s.px(2, 6, null);
    s.rect(12, 3, 2, 3, GLASS.b);
    s.rect(14, 3, 2, 3, '#c8945a');
    s.px(14, 3, '#e6b87a');
    s.px(15, 5, '#9a6a3a');
    // the rolled letter inside, tied with a red ribbon
    s.rect(4, 3, 6, 2, '#f7ecd0');
    s.hline(4, 9, 5, '#d9c69c');
    s.px(4, 3, '#fffaf0');
    s.vline(7, 3, 5, '#e0443a');
    s.px(8, 5, '#e0443a');
    // glass highlights, and a glint that slides along
    s.hline(3, 11, 2, GLASS.l);
    s.hline(3, 11, 6, GLASS.d);
    s.px(12, 3, GLASS.l);
    s.px(f ? 10 : 3, 3, '#ffffff');
    s.px(f ? 11 : 3, f ? 4 : 4, '#ffffffaa');
    s.point('mouth', 15, 4);
}

function fishDef(name, w, h, anchor, painter, pad = { t: 1 }) {
    return padDef({ name, sheet: 'fish', w, h, anchor, outlineOptions: { skip: WATER_SKIP }, anims: { swim: [0, 1].map((f) => (s) => painter(s, f)) } }, pad);
}

const fishDefs = [
    fishDef('f-perch', 22, 14, [12, 7], drawPerch),
    fishDef('f-roach', 20, 12, [11, 6], drawRoach),
    fishDef('f-pike', 35, 13, [18, 6], drawPike),
    fishDef('f-bream', 24, 16, [13, 8], drawBream, { t: 2 }),
    fishDef('f-zander', 29, 12, [15, 6], drawZander),
    fishDef('f-goldfish', 21, 15, [12, 7], drawGoldfish, { t: 1, l: 1 }),
    fishDef('f-boot', 15, 16, [7, 7], drawBoot),
    fishDef('f-bottle', 17, 9, [8, 4], drawBottle)
];

// ===========================================================================
// PROPS (sheet 'props-lake') – anchor bottom-centre unless noted.
// ===========================================================================
const REED = { stalk: '#a3a23e', stalkD: '#76803a', leaf: '#86a844', leafL: '#b5cc5c', leafD: '#5c7c38', plume: '#8e5e6c', plumeL: '#c08e8a', plumeD: '#643e52' };

/** A stalk that bends with the wind: x offset grows with height (t 0..1). */
function swayX(x, t, sway) {
    return x + Math.round(sway * t * t);
}

function reedStalk(s, x, y0, y1, sway, { plume = true, c = REED.stalk } = {}) {
    for (let y = y0; y >= y1; y -= 1) {
        const t = (y0 - y) / (y0 - y1);
        s.px(swayX(x, t, sway), y, c);
    }
    if (plume) {
        // a slim, feathery plume leaning with the wind
        const tx = swayX(x, 1, sway);
        const ty = y1;
        s.px(tx, ty - 4, REED.plumeL);
        s.px(tx, ty - 3, REED.plumeL);
        s.px(tx + 1, ty - 3, REED.plume);
        s.px(tx, ty - 2, REED.plume);
        s.px(tx + 1, ty - 2, REED.plumeD);
        s.px(tx, ty - 1, REED.plume);
        s.px(tx + 1, ty - 1, REED.plumeD);
    }
}

// a long blade that leaves the stalk and arches over, tip drooping
function reedLeaf(s, x, y, dx, dy, sway) {
    const ex = x + dx + (sway && dx > 0 ? 1 : 0);
    s.line(x, y, ex, y + dy, REED.leaf);
    s.px(ex + (dx > 0 ? 1 : -1), y + dy + 1, REED.leafL);
}

function drawReeds(s, sway, big) {
    const G = s.h - 1;
    // leafy tuft at the base
    s.oval(1, G - 2, s.w - 2, 4, REED.leafD);
    s.hline(3, s.w - 4, G - 2, REED.leaf);
    if (big) {
        reedStalk(s, 2, G - 2, 9, sway, { c: REED.stalkD });
        reedStalk(s, 6, G - 2, 5, sway);
        reedStalk(s, 10, G - 2, 7, sway);
        reedLeaf(s, 6, 14, -3, -4, sway);
        reedLeaf(s, 10, 13, 2, -4, sway);
    } else {
        reedStalk(s, 2, G - 2, 7, sway);
        reedStalk(s, 6, G - 2, 4, sway, { c: REED.stalkD });
        reedLeaf(s, 6, 10, 2, -3, sway);
    }
}

const CATTAIL = { head: '#6e3f26', headL: '#9a6038', headD: '#4c2a1c', spike: '#b0a070' };
function drawCattail(s, sway) {
    const G = s.h - 1;
    s.oval(1, G - 2, 7, 3, REED.leafD);
    // long flat leaves
    for (const [x, top, bend] of [[2, 6, -1], [6, 8, 1], [3, 10, 0]]) {
        for (let y = G; y >= top; y -= 1) {
            const t = (G - y) / (G - top);
            s.px(swayX(x, t, sway + bend), y, y < top + 3 ? REED.leafL : REED.leaf);
        }
    }
    // the stalk with its brown sausage head and thin spike
    const x = 4;
    for (let y = G; y >= 2; y -= 1) s.px(swayX(x, (G - y) / (G - 2), sway), y, REED.stalk);
    const hx = swayX(x, 0.8, sway);
    s.rect(hx, 4, 2, 5, CATTAIL.head);
    s.vline(hx, 4, 7, CATTAIL.headL);
    s.px(hx + 1, 8, CATTAIL.headD);
    s.vline(swayX(x, 1, sway), 1, 3, CATTAIL.spike);
}

// lily pads: flat on the water, anchor on the waterline (the pad's last row)
const LILY = { b: '#4c9e48', l1: '#7cc45a', d1: '#357a3e', vein: '#3e8a40' };
function lilyPad(s, x, y, w, h) {
    s.oval(x, y, w, h, LILY.b);
    s.hline(x + 2, x + w - 3, y, LILY.l1);
    s.hline(x + 1, x + w - 2, y + h - 1, LILY.d1);
    // the notch
    const nx = x + Math.floor(w * 0.62);
    s.px(nx, y, null);
    s.px(nx, y + 1, LILY.d1);
    s.px(nx + 1, y, null);
    s.px(x + 3, y + 1, LILY.vein);
    if (w > 10) s.px(x + w - 3, y + 1, LILY.vein);
}

const NLILY = { petal: '#fff4f8', petalS: '#f5bcd6', petalD: '#e28ab2', core: '#ffd84a' };
function waterLily(s, x, y) {
    // white-pink water lily: pointed petals around a yellow heart
    s.px(x + 2, y, NLILY.petal);
    s.px(x, y + 1, NLILY.petalS);
    s.px(x + 1, y + 1, NLILY.petal);
    s.px(x + 3, y + 1, NLILY.petal);
    s.px(x + 4, y + 1, NLILY.petalS);
    s.px(x + 2, y + 1, NLILY.core);
    s.hline(x, x + 4, y + 2, NLILY.petalS);
    s.px(x + 2, y + 2, NLILY.petal);
    s.px(x - 1, y + 2, NLILY.petalD);
    s.px(x + 5, y + 2, NLILY.petalD);
}

// weeping willow
const WIL = { b: '#9cc24c', l1: '#cfe27a', l2: '#eef4a8', d1: '#6a9a3e', d2: '#44703a', deep: '#35522e' };
const BARK = { b: '#7a6656', l1: '#9e8a74', d1: '#574838', d2: '#3e3228' };
function drawWillow(s, sway) {
    const W = s.w;
    const G = s.h - 1;
    const cx = Math.floor(W / 2);
    // dark hollow under the crown
    s.oval(6, 12, W - 12, 26, WIL.deep);
    // trunk with a gentle lean and two big branches
    s.poly([[cx - 5, G + 0.5], [cx + 5, G + 0.5], [cx + 3, G - 6], [cx + 3, 20], [cx - 1, 20], [cx - 2, G - 6]], BARK.b);
    s.poly([[cx - 1, 24], [cx - 9, 12], [cx - 7, 11], [cx + 1, 21]], BARK.b);
    s.poly([[cx + 2, 23], [cx + 9, 13], [cx + 11, 14], [cx + 3, 25]], BARK.d1);
    s.vline(cx - 1, 22, G - 1, BARK.l1);
    s.vline(cx + 2, 24, G - 2, BARK.d1);
    s.line(cx, 30, cx + 1, 38, BARK.d2);
    s.px(cx - 4, G, BARK.d2);
    s.px(cx + 4, G, BARK.d2);
    // round crown made of big leafy clumps
    const clump = { b: WIL.b, l1: WIL.l1, d1: WIL.d1 };
    for (const [x, y, w, h] of [[4, 6, 18, 14], [14, 1, 20, 14], [26, 5, 18, 14], [8, 12, 14, 10], [26, 12, 15, 10], [17, 9, 14, 10]]) {
        s.ball(x, y, w, h, clump);
    }
    // long hanging fronds, like a curtain
    const fronds = [3, 5, 7, 9, 11, 13, 15, 29, 31, 33, 35, 37, 39, 41, 43];
    fronds.forEach((x, i) => {
        const len = 16 + ((i * 7) % 11) + (i % 3 === 0 ? 6 : 0);
        const y0 = 16 + (i % 2);
        const tipY = Math.min(G - 3, y0 + len);
        for (let y = y0; y <= tipY; y += 1) {
            const t = (y - y0) / (tipY - y0);
            const fx = x + Math.round(sway * t * t * (x < cx ? -1 : 1) * 0.5 + (t > 0.6 ? (i % 2 ? 1 : 0) * sway : 0));
            s.px(fx, y, i % 2 ? WIL.b : WIL.d1);
            if (i % 3 === 1 && y % 3 === 0) s.px(fx + 1, y, WIL.l1);
        }
    });
    // a few fronds in front of the trunk, with gaps so it shows through
    for (const [x, y0, len] of [[cx - 3, 18, 14], [cx + 4, 19, 12], [cx - 7, 17, 18], [cx + 7, 18, 16]]) {
        for (let y = y0; y < y0 + len; y += 1) s.px(x + (y > y0 + len - 4 ? sway : 0), y, y % 4 === 0 ? WIL.l1 : WIL.b);
    }
    // sunlit leaf sparkles on the crown
    for (const [x, y] of [[12, 7], [19, 3], [20, 3], [25, 5], [31, 8], [16, 10], [9, 10], [10, 9], [22, 11], [35, 9]]) s.px(x, y, WIL.l2);
}

// the fishing pier. Deck top surface on row 4, 4 px thick, posts into the water.
const DOCK = { top: '#d6ae78', topL: '#ecc894', edge: '#a8804e', beam: '#7c5a3a', beamD: '#5a3f2a', gap: '#4a3226', post: '#8e6844', postL: '#b28a5c', postD: '#5e4430', wet: '#4a4a3e' };
function drawDock(s) {
    const W = s.w;
    // posts and cross braces under the deck
    for (const x of [2, 21, 40, 59]) {
        s.rect(x, 8, 3, 14, DOCK.post);
        s.vline(x, 8, 21, DOCK.postL);
        s.vline(x + 2, 8, 21, DOCK.postD);
        s.rect(x, 16, 3, 6, DOCK.wet);
        s.px(x, 16, '#6a6a54');
    }
    for (const x of [5, 43]) s.line(x, 9, x + 15, 15, DOCK.beamD);
    s.line(24, 15, 39, 9, DOCK.beamD);
    // deck: plank ends on top, then the long side beam (the left end meets the shore)
    s.hline(0, W - 2, 4, DOCK.top);
    s.hline(0, W - 2, 5, DOCK.edge);
    s.hline(0, W - 2, 6, DOCK.beam);
    s.hline(0, W - 2, 7, DOCK.beamD);
    for (let x = 0; x + 3 < W - 1; x += 4) {
        s.px(x + 1, 4, DOCK.topL);
        s.px(x + 3, 4, DOCK.gap);
        s.px(x + 3, 5, DOCK.gap);
    }
    // a nail head here and there
    for (const x of [10, 30, 50]) s.px(x, 6, '#c9b8a0');
    // a small tin bucket for the catch
    s.rect(27, 2, 4, 2, '#9aa6b8');
    s.hline(27, 30, 2, '#d4dcea');
    s.vline(30, 2, 3, '#6c7890');
    s.px(26, 1, '#6c7890');
    s.px(31, 1, '#6c7890');
    s.point('stand', 55, 3);
    s.point('nova', 42, 3);
}

// Falu-red boathouse (sjöbod) with white trim, gable end facing us
const FALU = { b: '#b23a2c', l1: '#cc5440', d1: '#8a2a24', d2: '#621e1e' };
const TRIM = { b: '#f6f2ea', d1: '#d8d0c4' };
const ROOF = { b: '#4a4152', l1: '#6a6070', d1: '#342d3c' };
function drawBoathouse(s) {
    const G = s.h - 1;
    // side wall and roof slope going back to the right (in shade)
    s.poly([[26, 13], [35, 10], [35, G - 1], [26, G - 1]], FALU.d1);
    for (let x = 28; x <= 34; x += 2) s.vline(x, 12, G - 2, FALU.d2);
    s.poly([[15, 1], [34, -1], [37, 10], [27, 13]], ROOF.b);
    s.line(16, 1, 34, -1, ROOF.l1);
    s.line(27, 13, 36, 10, ROOF.d1);
    // small side window
    s.rect(30, 16, 3, 3, '#3a3450');
    s.px(30, 16, '#8a86b8');
    s.hline(29, 33, 15, TRIM.d1);
    s.hline(29, 33, 19, TRIM.d1);
    // front gable wall
    s.poly([[3, 12], [15, 2], [27, 12], [27, G - 1], [3, G - 1]], FALU.b);
    for (let x = 5; x <= 25; x += 3) {
        for (let y = 3; y < G - 1; y += 1) if (s.opaque(x, y) && Math.abs(x - 15) < (y - 1) * 1.25) s.px(x, y, FALU.d1);
    }
    // white trim: barge boards along the gable, corner boards
    s.thick(2, 12, 15, 1, 2, TRIM.b);
    s.thick(15, 1, 28, 12, 2, TRIM.b);
    s.line(3, 13, 15, 3, TRIM.d1);
    s.line(16, 3, 27, 13, TRIM.d1);
    s.vline(3, 12, G - 1, TRIM.b);
    s.vline(27, 12, G - 1, TRIM.d1);
    // gable window
    s.rect(13, 6, 5, 4, TRIM.b);
    s.rect(14, 7, 3, 2, '#3a3450');
    s.px(14, 7, '#a8a4d8');
    s.px(15, 7, TRIM.b);
    s.px(15, 8, TRIM.b);
    // big double doors with white frames and Z braces
    s.rect(7, 14, 17, G - 14, TRIM.b);
    s.rect(8, 15, 7, G - 15, FALU.d1);
    s.rect(16, 15, 7, G - 15, FALU.d1);
    s.line(8, G - 1, 14, 15, TRIM.d1);
    s.line(16, G - 1, 22, 15, TRIM.d1);
    s.hline(8, 14, 21, TRIM.d1);
    s.hline(16, 22, 21, TRIM.d1);
    s.px(14, 22, '#e8c86a');
    s.px(16, 22, '#e8c86a');
    // stone footing
    s.hline(2, 36, G, '#8a8ea0');
    for (const x of [4, 9, 15, 22, 29, 34]) s.px(x, G, '#6a6e82');
}

// small wooden rowing boat (eka). Anchor on its waterline.
const EKA = { b: '#c77d3c', l1: '#e8a45e', d1: '#96552c', d2: '#6e3a22', rim: '#7a4424' };
function drawRowboat(s) {
    const WLr = 6;
    // hull: rising bow at the right, square stern at the left
    s.poly([[1, 1.5], [25, 1.5], [28.5, -0.5], [27, 3], [23, 7.5], [5, 8.5], [2, 5]], EKA.b);
    // clinker planks
    s.line(2, 3, 26, 3, EKA.d1);
    s.line(3, 5, 25, 5, EKA.d1);
    s.hline(4, 22, 4, EKA.l1);
    s.hline(3, 24, 2, EKA.l1);
    // gunwale and stern
    s.hline(1, 25, 1, EKA.rim);
    s.line(25, 1, 28, -1, EKA.rim);
    s.vline(1, 1, 4, EKA.rim);
    // an oar resting inside with its blade out over the stern
    s.line(6, 0, 20, 0, '#e2c48e');
    s.rect(1, -1, 4, 2, '#e2c48e');
    s.px(1, -1, '#f4dcaa');
    // oarlock
    s.px(14, 0, '#5a5a6a');
    s.hline(4, 22, WLr, EKA.d2);
}

// beaver dam: a heap of sticks and mud
const DAM = { mud: '#5c4636', mudL: '#7a5e48', mudD: '#40302a', stick: '#8a6440', stickL: '#b08a5c', peeled: '#e6cfa0' };
function drawBeaverDam(s) {
    const G = s.h - 1;
    s.ball(1, 2, s.w - 2, (G - 2) * 2, { b: DAM.mud, l1: DAM.mudL, d1: DAM.mudD });
    // clear the lower half of the oval: the heap sits on the ground
    for (let y = G + 1; y < s.h + 12; y += 1) s.hline(0, s.w - 1, y, null);
    // criss-cross sticks
    const sticks = [[2, 9, 12, 4], [8, 10, 20, 3], [14, 3, 27, 8], [5, 6, 15, 10], [18, 11, 29, 6], [10, 2, 17, 7], [21, 4, 25, 11], [3, 11, 9, 7], [24, 5, 30, 9]];
    sticks.forEach(([x0, y0, x1, y1], i) => {
        s.line(x0, y0, x1, y1, i % 3 === 0 ? DAM.stickL : DAM.stick);
        if (i % 4 === 1) s.px(x1, y1, DAM.peeled);
    });
    s.line(12, 1, 19, 2, DAM.peeled);
    s.line(6, 8, 10, 11, DAM.peeled);
    // sticks poking out of the heap
    s.line(3, 4, 7, 6, DAM.stick);
    s.line(0, 7, 3, 8, DAM.stickL);
    s.line(24, 1, 27, 4, DAM.stick);
    s.line(27, 5, 31, 8, DAM.stickL);
    s.line(15, 0, 16, 2, DAM.stick);
    // a few leaves still on the twigs
    s.px(20, 2, '#7cba4a');
    s.px(21, 1, '#9ad05c');
    s.px(7, 5, '#7cba4a');
    s.hline(1, s.w - 2, G, DAM.mudD);
}

// wet lake stone with a shine and a tuft of moss
const STONE = { b: '#8c90a6', l1: '#b4b8cc', l2: '#e6ecff', d1: '#62667e', d2: '#474a60' };
function drawLakeStone(s) {
    const G = s.h - 1;
    s.ball(1, 1, 12, 8, STONE);
    for (let x = 0; x < s.w; x += 1) s.px(x, G + 1, null);
    s.hline(2, 11, G, STONE.d2);
    s.px(4, 2, '#ffffff');
    s.px(5, 2, STONE.l2);
    s.px(3, 3, STONE.l2);
    // moss on top
    s.hline(7, 9, 1, '#7aa84a');
    s.px(8, 0, '#9ac85c');
    s.px(10, 2, '#5e8a3e');
}

function prop(name, w, h, anchor, frames, pad = null) {
    const def = { name, sheet: 'props-lake', w, h, anchor, anims: { idle: frames } };
    return pad ? padDef(def, pad) : def;
}

const propDefs = [
    prop('p-reeds', 15, 21, [8, 20], [0, 1].map((f) => (s) => drawReeds(shifted(s, 1, 0), f, true)), { r: 2, t: 1 }),
    prop('p-reeds2', 11, 16, [5, 15], [0, 1].map((f) => (s) => drawReeds(shifted(s, 1, 0), f, false)), { r: 2, t: 1 }),
    prop('p-cattail', 10, 18, [4, 17], [0, 1].map((f) => (s) => drawCattail(s, f))),
    prop('p-lilypad', 15, 5, [7, 3], [(s) => { lilyPad(s, 1, 1, 13, 3); s.point('sit', 7, 2); }]),
    prop('p-lilypad2', 11, 8, [5, 6], [(s) => { lilyPad(s, 1, 3, 8, 4); waterLily(s, 4, 1); s.point('sit', 3, 4); }]),
    // a big pad a frog can sit on with room to spare, a water lily at its edge
    prop('p-lilypad3', 24, 7, [11, 5], [(s) => { lilyPad(s, 1, 1, 21, 5); waterLily(s, 18, 0); s.point('sit', 9, 3); }]),
    prop('p-willow', 48, 52, [24, 51], [0, 1].map((f) => (s) => drawWillow(s, f))),
    prop('p-dock', 64, 22, [0, 7], [(s) => drawDock(s)]),
    prop('p-boathouse', 38, 31, [19, 30], [(s) => drawBoathouse(shifted(s, 0, 1))], { t: 1 }),
    prop('p-rowboat', 31, 11, [15, 7], [(s) => drawRowboat(shifted(s, 1, 1))], { t: 1, r: 1 }),
    prop('p-beaverdam', 32, 13, [16, 12], [(s) => drawBeaverDam(s)], { l: 1, r: 1, t: 1 }),
    prop('p-lakestone', 14, 8, [7, 7], [(s) => drawLakeStone(s)], { t: 1 })
];

export default [
    padDef(swanDef, { l: 1 }),
    cygnetDef,
    padDef(frogDef, { l: 1, t: 1 }),
    padDef(beaverDef, { l: 1 }),
    padDef(otterDef, { l: 1 }),
    padDef(heronDef, { l: 1 }),
    dragonflyDef,
    ...fishDefs,
    ...propDefs
];
