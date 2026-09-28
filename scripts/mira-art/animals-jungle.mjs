/*
 * Djungeln – the misty rainforest island.
 *
 * Animals (sheet 'animals-jungle'): monkey, macaw, toucan, sloth, chameleon
 * (green + pink), blue morpho, dart frogs (blue + red) and a kind tigress.
 * Props (sheet 'props-jungle'): giant trees, palm, big leaves, vines, fern,
 * orchid, banana plant and a friendly stone head.
 *
 * Everything faces right; the game mirrors sprites to face left.
 *
 * Painters draw on the "canvas" sizes noted in the comments; at the bottom of
 * the file pad() moves some animations into slightly bigger frames so the
 * automatic outline never gets cut off (anchors move with the drawing).
 */
import { Sprite, ramp, rng } from './kit.mjs';

const EYE = '#2a1a1a';
const SPARK = '#ffffff';
const MOUTH = '#9c3048';
const TONGUE = '#ff9aaa';
const BLUSH = '#ff9fae';

/** 2×2 eye with a sparkle, closed line or happy arch. */
function eye2(s, x, y, mode = 'open', col = EYE) {
    if (mode === 'open') {
        s.rect(x, y, 2, 2, col);
        s.px(x + 1, y, SPARK);
    } else if (mode === 'closed') {
        s.hline(x, x + 1, y + 1, col);
    } else if (mode === 'happyL') {
        s.px(x, y + 1, col);
        s.px(x + 1, y, col);
    } else if (mode === 'happyR') {
        s.px(x, y, col);
        s.px(x + 1, y + 1, col);
    }
}

/** Two eyes; 'happy' picks mirrored arches. */
function eyes2(s, x1, x2, y, mode, col = EYE) {
    if (mode === 'happy') {
        eye2(s, x1, y, 'happyL', col);
        eye2(s, x2, y, 'happyR', col);
    } else {
        eye2(s, x1, y, mode, col);
        eye2(s, x2, y, mode, col);
    }
}

/** Plot a list of [x, y] pixels. */
function dots(s, pts, c, dx = 0, dy = 0) {
    for (const [x, y] of pts) s.px(x + dx, y + dy, c);
}

/** A sprite that shifts every drawing call by (ox, oy): used to pad frames without redrawing. */
class OffsetSprite extends Sprite {
    constructor(w, h, ox = 0, oy = 0) {
        super(w, h);
        this.ox = ox;
        this.oy = oy;
    }
    px(x, y, c) { return super.px(x + this.ox, y + this.oy, c); }
    get(x, y) { return super.get(x + this.ox, y + this.oy); }
    opaque(x, y) { return super.opaque(x + this.ox, y + this.oy); }
    point(name, x, y) { return super.point(name, x + this.ox, y + this.oy); }
}

/**
 * Give the outline room: repaint an animation moved by (dx, dy) inside a frame
 * that is ew×eh pixels bigger. The anchor moves with the drawing.
 */
function padAnim(def, anim, dx, dy, ew, eh) {
    const spec = def.anims[anim];
    const frames = Array.isArray(spec) ? spec : spec.frames;
    const w = (!Array.isArray(spec) && spec.w) || def.w;
    const h = (!Array.isArray(spec) && spec.h) || def.h;
    const anchor = (!Array.isArray(spec) && spec.anchor) || def.anchor;
    def.anims[anim] = {
        w: w + ew,
        h: h + eh,
        anchor: [anchor[0] + dx, anchor[1] + dy],
        frames: frames.map((paint) => (s, i) => {
            const t = new OffsetSprite(s.w, s.h, dx, dy);
            paint(t, i);
            s.data.set(t.data);
            Object.assign(s.points, t.points);
        })
    };
}

function pad(def, dx, dy, ew, eh, anims = Object.keys(def.anims)) {
    const plain = Array.isArray(def.anims[anims[0]]);
    for (const a of anims) padAnim(def, a, dx, dy, ew, eh);
    if (plain) {
        def.w += ew;
        def.h += eh;
        def.anchor = [def.anchor[0] + dx, def.anchor[1] + dy];
    }
    return def;
}

/** Paint on a W×H scratch sprite, then copy it onto s moved by (dx, dy), points included. */
function offsetPaint(s, W, H, dx, dy, paint) {
    const tmp = new s.constructor(W, H);
    paint(tmp);
    s.stamp(tmp, dx, dy);
    for (const [k, [x, y]] of Object.entries(tmp.points)) s.point(k, x + dx, y + dy);
}

// ===========================================================================
// MONKEY – a cheeky brown capuchin with a cream face and a curly tail
// ===========================================================================
const MK = ramp('#94603c');
const MK_CAP = '#5b3226';
const MK_FACE = { b: '#f8dab4', l1: '#fff2df', d1: '#e8b690', d2: '#c98d6c' };
const MK_CREAM = { b: '#f3e1c2', l1: '#fff4e2', d1: '#dcc09a' };
const MK_HAND = '#e9b18c';

/** Head in a 10×10 box at (x, y). look: 1 = turned right (3/4), 0 = facing us. */
function monkeyHead(s, x, y, { eyes = 'open', mouth = 'smile', look = 1, big = false } = {}) {
    // ears stick out at the sides
    s.oval(x - 2, y + 3, 4, 4, MK.b);
    s.oval(x + 8, y + 3, 4, 4, MK.d1);
    s.px(x - 1, y + 4, MK_FACE.d1);
    s.px(x - 1, y + 5, MK_FACE.d2);
    s.px(x + 10, y + 4, MK_FACE.d2);
    s.px(x + 10, y + 5, MK_FACE.d2);
    // round head with a dark capuchin cap
    s.ball(x, y, 10, 10, MK);
    s.oval(x + 2, y, 6, 3, MK_CAP);
    s.px(x + 3, y, MK.d1);
    // heart-shaped cream face mask
    const f = x + look;
    s.oval(f + 1, y + 2, 4, 5, MK_FACE.b);
    s.oval(f + 5, y + 2, 4, 5, MK_FACE.b);
    s.oval(f + 2, y + 4, 6, 6, MK_FACE.b);
    s.px(f + 2, y + 3, MK_FACE.l1);
    s.hline(f + 3, f + 6, y + 9, MK_FACE.d1);
    // eyes
    const ey = y + 4;
    if (big && eyes === 'open') {
        s.rect(f + 2, ey - 1, 2, 3, EYE);
        s.rect(f + 6, ey - 1, 2, 3, EYE);
        s.px(f + 3, ey - 1, SPARK);
        s.px(f + 7, ey - 1, SPARK);
    } else {
        eyes2(s, f + 2, f + 6, ey, eyes);
    }
    // nose and mouth
    s.px(f + 4, y + 6, MK_FACE.d2);
    s.px(f + 5, y + 6, MK_FACE.d2);
    if (mouth === 'smile') {
        s.px(f + 3, y + 7, MK_FACE.d2);
        s.px(f + 6, y + 7, MK_FACE.d2);
        s.hline(f + 4, f + 5, y + 8, MOUTH);
    } else if (mouth === 'open') {
        s.hline(f + 3, f + 6, y + 7, MOUTH);
        s.hline(f + 4, f + 5, y + 8, TONGUE);
    } else if (mouth === 'grin') {
        s.hline(f + 3, f + 6, y + 7, '#ffffff');
        s.hline(f + 4, f + 5, y + 8, MOUTH);
    } else if (mouth === 'chew') {
        s.hline(f + 4, f + 5, y + 8, MOUTH);
        s.px(f + 7, y + 7, MK_FACE.d1);
    }
}

/** Long curly tail as a pixel path (1 px wide, the outline makes it read). */
function monkeyTail(s, pts, dx = 0, dy = 0) {
    dots(s, pts, MK.b, dx, dy);
}

// Tail for the sitting monkey: out from behind, up, and a spiral at the tip.
const SIT_TAILS = [
    [[9, 15], [8, 15], [7, 15], [6, 15], [5, 14], [4, 13], [3, 12], [3, 11], [3, 10],
        [4, 9], [5, 9], [6, 10], [6, 11], [5, 12]],
    [[9, 15], [8, 15], [7, 15], [6, 15], [5, 14], [4, 13], [3, 12], [3, 11], [3, 10], [3, 9],
        [4, 8], [5, 8], [6, 9], [6, 10], [5, 11]]
];

/** Arm as a 2-px limb with a contour where it crosses the body. */
function limb(s, x0, y0, x1, y1, c, contour) {
    if (contour) s.thick(x0, y0, x1, y1, 4, contour, { onlyOver: true });
    s.thick(x0, y0, x1, y1, 2, c);
}

/** Round monkey hand or foot (2×2 with a light pixel). */
function paw(s, x, y, light = true) {
    s.rect(x, y, 2, 2, MK_HAND);
    if (light) s.px(x, y, MK_FACE.b);
}

function monkeySit(s, opts = {}) {
    // drawn on a 22×18 canvas, shown in a 22×17 frame (base row 16)
    offsetPaint(s, 22, 18, 0, -1, (q) => monkeySitRaw(q, opts));
}

function monkeySitRaw(s, { eyes = 'open', mouth = 'smile', bob = 0, look = 1, big = false, arms = 'down', tail = 0, banana = null } = {}) {
    // sits like a teddy, turned a little to the right; base row 17
    const by = 9 + bob;
    monkeyTail(s, SIT_TAILS[tail]);
    // far arm
    if (arms === 'down') limb(s, 17, by + 2, 18, by + 6, MK.d1);
    else if (arms === 'clap-open') limb(s, 17, by + 2, 19, by + 3, MK.d1);
    else limb(s, 17, by + 2, 17, by + 3, MK.d1);
    // round body with a cream belly
    s.ball(9, by, 10, 8, MK);
    s.oval(12, by + 1, 6, 6, MK_CREAM.b);
    s.px(13, by + 2, MK_CREAM.l1);
    s.hline(13, 16, by + 6, MK_CREAM.d1);
    // knees and peachy feet
    s.oval(10, 13 + bob, 4, 4 - bob, MK.b);
    s.px(11, 13 + bob, MK.l1);
    s.oval(15, 13 + bob, 4, 4 - bob, MK.d1);
    s.rect(11, 16, 3, 2, MK_HAND);
    s.px(11, 16, MK_FACE.b);
    s.rect(16, 16, 3, 2, MK_FACE.d1);
    s.hline(10, 19, 17, null);
    s.hline(11, 13, 17, MK_FACE.d1);
    s.hline(16, 18, 17, MK_FACE.d2);
    // head
    monkeyHead(s, 9, 2 + bob, { eyes, mouth, look, big });
    // near arm
    if (arms === 'down') {
        limb(s, 10, by + 2, 10, by + 6, MK.b, MK.d2);
        paw(s, 10, by + 6);
    } else if (arms === 'clap-open') {
        limb(s, 10, by + 2, 11, by + 4, MK.b, MK.d2);
        paw(s, 11, by + 4);
        paw(s, 19, by + 3, false);
    } else if (arms === 'clap') {
        limb(s, 10, by + 2, 14, by + 3, MK.b, MK.d2);
        s.rect(15, by + 2, 2, 3, MK_HAND);
        s.px(15, by + 2, MK_FACE.b);
        s.px(17, by + 2, MK_FACE.d1);
    } else if (arms === 'banana') {
        limb(s, 10, by + 2, 15, by + 3, MK.b, MK.d2);
    }
    if (banana) banana(s, bob + 1);
    s.point('head', 14, 2 + bob);
}

/** A banana held up to the mouth: a yellow crescent with a peeled tip. */
const BANANA = { Y: '#ffd84a', L: '#fff3a6', D: '#e0a12a', F: '#fff6d8', S: '#7a4a2a' };
function bananaHeld(s, bob, bite) {
    const rows = [
        bite ? '......' : '.F....',
        '.FF...',
        'Y.LY..',
        '..hhY.',
        '..hhYY',
        '.....S'
    ];
    s.map(15, 7 + bob, rows, { ...BANANA, h: MK_HAND });
    s.px(17, 10 + bob, MK_FACE.b);
}

const VINE_G = { b: '#4f9a3a', d1: '#357a2e', l1: '#7cc24e' };

function monkeyWalk(s, f) {
    // canvas 25×17, ground row 16; on all fours with the tail up in a curl
    const bob = f % 2 ? -1 : 0;
    // foot shifts for [far back, near back, far front, near front]
    const sw = [[2, -2, -2, 2], [0, 0, 0, 0], [-2, 2, 2, -2], [0, 0, 0, 0]][f];
    const up = [[0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 1, 0]][f];
    const G = 16;
    dots(s, [[5, 7], [4, 6], [3, 5], [3, 4], [3, 3], [4, 2], [5, 2], [6, 3], [6, 4], [5, 5]], MK.b, 0, bob);
    // far legs
    limb(s, 7, 11 + bob, 6 + sw[0], G - 1 - up[0], MK.d1);
    s.rect(6 + sw[0], G - 1 - up[0], 2, 2, MK_FACE.d2);
    limb(s, 15, 11 + bob, 15 + sw[2], G - 1 - up[2], MK.d1);
    s.rect(15 + sw[2], G - 1 - up[2], 2, 2, MK_FACE.d2);
    // body
    s.ball(4, 6 + bob, 13, 7, MK, { light: false });
    s.hline(6, 11, 6 + bob, MK.l1);
    s.px(5, 7 + bob, MK.l1);
    s.oval(13, 8 + bob, 4, 4, MK_CREAM.b);
    // near legs
    limb(s, 9, 11 + bob, 9 + sw[1], G - 1 - up[1], MK.b, MK.d2);
    paw(s, 9 + sw[1], G - 1 - up[1]);
    limb(s, 16, 11 + bob, 17 + sw[3], G - 1 - up[3], MK.b, MK.d2);
    paw(s, 17 + sw[3], G - 1 - up[3]);
    monkeyHead(s, 13, 1 + bob, {});
    s.point('head', 18, 1 + bob);
}

/** Hanging from a vine by one arm. a = -1, 0, 1 is the swing position. */
function monkeySwing(s, a) {
    // canvas 24×24, the hand grips the vine at (8, 1)
    const hx = 8;
    s.vline(hx, 0, 4, VINE_G.b);
    s.px(hx + 1, 0, VINE_G.d1);
    const sx = hx + 3 * a;
    const sy = 11 - Math.abs(a);
    const lag = -a;
    // tail curling below
    dots(s, [[sx + 2, sy + 6], [sx + 1, sy + 7], [sx, sy + 8], [sx, sy + 9], [sx, sy + 10], [sx + 1, sy + 11],
        [sx + 2, sy + 11], [sx + 3, sy + 10], [sx + 3, sy + 9], [sx + 2, sy + 9]], MK.b, lag, 0);
    // far leg and the free arm reaching out
    limb(s, sx + 7, sy + 6, sx + 8 + lag, sy + 9, MK.d1);
    s.rect(sx + 8 + lag, sy + 9, 2, 2, MK_FACE.d2);
    limb(s, sx + 8, sy + 1, sx + 12, sy - 1, MK.d1);
    paw(s, sx + 12, sy - 2, false);
    // body
    s.ball(sx + 1, sy, 9, 8, MK);
    s.oval(sx + 4, sy + 1, 5, 5, MK_CREAM.b);
    // near leg
    limb(s, sx + 4, sy + 6, sx + 4 + lag, sy + 10, MK.b, MK.d2);
    paw(s, sx + 4 + lag, sy + 10);
    // head, then the holding arm in front of the ear
    monkeyHead(s, sx + 1, sy - 8, { eyes: 'happy', mouth: 'open' });
    limb(s, hx, 2, sx, sy + 1, MK.b, MK.d2);
    s.rect(hx - 1, 1, 2, 2, MK_HAND);
    s.px(hx - 1, 1, MK_FACE.b);
    s.point('head', sx + 6, sy - 8);
}

/** Running off upright with Mira's hat held high ('carry' = bottom-centre of the hat brim). */
function monkeyRun(s, f) {
    // canvas 22×25, ground row 24
    const G = 24;
    const bob = f ? -1 : 0;
    // tail streaming behind
    const tail = f
        ? [[6, 19], [5, 19], [4, 18], [3, 17], [2, 17], [1, 16], [1, 15], [2, 14], [3, 14], [3, 15]]
        : [[6, 19], [5, 20], [4, 20], [3, 19], [2, 18], [1, 17], [1, 16], [2, 15], [3, 15], [3, 16]];
    dots(s, tail, MK.b, 0, bob);
    // legs: one forward, one back
    const [nearFoot, farFoot] = f ? [[7, G - 1], [13, G - 2]] : [[13, G - 1], [7, G - 2]];
    limb(s, 11, 19 + bob, farFoot[0] + 1, farFoot[1], MK.d1);
    s.rect(farFoot[0], farFoot[1], 3, 2, MK_FACE.d2);
    // far arm up
    limb(s, 13, 14 + bob, 16, 4, MK.d1);
    s.rect(16, 3, 2, 2, MK_FACE.d1);
    // body leaning forward
    s.ball(6, 13 + bob, 9, 8, MK);
    s.oval(9, 14 + bob, 5, 5, MK_CREAM.b);
    limb(s, 9, 19 + bob, nearFoot[0] + 1, nearFoot[1], MK.b, MK.d2);
    s.rect(nearFoot[0], nearFoot[1], 3, 2, MK_HAND);
    s.px(nearFoot[0], nearFoot[1], MK_FACE.b);
    monkeyHead(s, 6, 5 + bob, { mouth: 'grin' });
    // near arm up in front of the ear
    limb(s, 8, 14 + bob, 5, 4, MK.b, MK.d2);
    s.rect(4, 3, 2, 2, MK_HAND);
    s.px(4, 3, MK_FACE.b);
    s.point('carry', 11, 3);
    s.point('head', 11, 5 + bob);
}

const monkeyDef = {
    name: 'a-monkey',
    sheet: 'animals-jungle',
    w: 22,
    h: 17,
    anchor: [14, 16],
    anims: {
        idle: [(s) => monkeySit(s, {}), (s) => monkeySit(s, { bob: 1, tail: 1 })],
        blink: [(s) => monkeySit(s, { eyes: 'closed' })],
        look: [(s) => monkeySit(s, { look: 0, big: true })],
        eat: [
            (s) => monkeySit(s, { arms: 'banana', mouth: 'open', banana: (q, b) => bananaHeld(q, b, false) }),
            (s) => monkeySit(s, { arms: 'banana', mouth: 'chew', eyes: 'happy', bob: 1, banana: (q, b) => bananaHeld(q, b, true) })
        ],
        walk: { w: 25, h: 17, anchor: [11, 16], frames: [0, 1, 2, 3].map((f) => (s) => monkeyWalk(s, f)) },
        swing: { w: 24, h: 24, anchor: [8, 1], frames: [-1, 0, 1].map((a) => (s) => monkeySwing(s, a)) },
        special: { w: 22, h: 25, anchor: [10, 24], frames: [0, 1].map((f) => (s) => monkeyRun(s, f)) },
        laugh: [
            (s) => monkeySit(s, { arms: 'clap-open', eyes: 'happy', mouth: 'open' }),
            (s) => monkeySit(s, { arms: 'clap', eyes: 'happy', mouth: 'open', bob: 1 })
        ]
    }
};

// ===========================================================================
// PARROT – a scarlet macaw: red body, yellow and blue wings, white face
// ===========================================================================
const RED = ramp('#e8383c');
const YEL = ramp('#ffcf33');
const BLU = ramp('#2f7fe6');
const FACEW = { b: '#fff6ee', ring: '#e6c4c0' };
const IVORY = { b: '#f6ecda', l1: '#fffaf0', d1: '#d4c3a6' };
const BEAKD = '#3a2836';
const FEET = { b: '#9a8fa6', d1: '#6e6480' };

/** Eye on the white face patch: a soft ring frames the sparkle so it reads. */
function patchEye(s, x, y, mode) {
    if (mode === 'open') {
        s.px(x + 2, y, FACEW.ring);
        s.px(x + 1, y - 1, FACEW.ring);
        s.px(x + 2, y + 1, FACEW.ring);
    }
    eye2(s, x, y, mode);
}

function macawBeak(s, x, y, open = false) {
    // hooked ivory upper beak, dark lower beak
    s.map(x, y, open
        ? ['II..', 'IIIi', '.D.i', 'DD..']
        : ['II..', 'IIIi', 'DDIi', '.D.i'], { I: IVORY.b, i: IVORY.d1, D: BEAKD });
    s.px(x, y, IVORY.l1);
}

/** Perched macaw. Canvas 15×20, feet at (7, 15); the tail hangs below the perch. */
function macawPerch(s, { eyes = 'open', head = 0, lean = 0, tail = 0, foot = null, beakOpen = false, crest = false, look = false, food = -1 } = {}) {
    const hx = 4 + lean;
    const hy = 1 + head;
    // tail hanging below the perch
    const tx = 4 - tail;
    s.thick(5, 13, tx, 17, 2, RED.d1);
    s.line(6, 14, tx + 1, 18, RED.b);
    s.px(tx, 17, BLU.b);
    s.px(tx, 18, BLU.d1);
    s.px(tx + 1, 18, BLU.b);
    // body
    s.ball(3, 6 + Math.max(0, head - 1), 7, 9, RED);
    s.oval(6, 9, 3, 5, RED.l1);
    // folded wing: yellow shoulder, blue flight feathers
    s.poly([[2.5, 8], [7, 8.5], [7.5, 11], [6, 15], [4, 17.5], [2.5, 14]], BLU.b);
    s.poly([[2.5, 8], [7, 8.5], [7, 10.5], [3, 11]], YEL.b);
    s.hline(3, 6, 8, YEL.l1);
    s.hline(3, 6, 11, '#58b04a');
    s.line(4, 13, 4, 16, BLU.d1);
    s.px(3, 12, BLU.l1);
    s.px(6, 12, BLU.d1);
    // feet gripping the branch
    const feet = foot === 'left' ? [[6, 14], [7, 15], [8, 15]] : foot === 'right' ? [[6, 15], [7, 15], [8, 14]] : [[6, 15], [7, 15], [8, 15]];
    dots(s, feet, FEET.b);
    s.px(5, 15, FEET.d1);
    // head
    if (crest) {
        s.px(hx + 2, hy - 1, RED.l1);
        s.px(hx + 3, hy - 1, RED.b);
        s.px(hx + 1, hy, RED.l1);
    }
    if (look) {
        // facing us: white cheeks either side of the beak
        s.ball(hx - 1, hy, 9, 7, RED);
        s.oval(hx - 1, hy + 2, 3, 4, FACEW.b);
        s.oval(hx + 5, hy + 2, 3, 4, FACEW.b);
        if (eyes === 'open') {
            s.rect(hx, hy + 2, 2, 2, EYE);
            s.rect(hx + 5, hy + 2, 2, 2, EYE);
            s.px(hx + 1, hy + 2, SPARK);
            s.px(hx + 6, hy + 2, SPARK);
            s.px(hx + 1, hy + 1, RED.d1);
            s.px(hx + 6, hy + 1, RED.d1);
            s.px(hx + 2, hy + 2, RED.b);
            s.px(hx + 7, hy + 2, FACEW.ring);
        } else {
            eyes2(s, hx, hx + 5, hy + 2, eyes);
        }
        s.map(hx + 2, hy + 3, ['III', 'IIi', 'DiD', '.i.'], { I: IVORY.b, i: IVORY.d1, D: BEAKD });
        s.px(hx + 2, hy + 3, IVORY.l1);
    } else {
        s.ball(hx, hy, 7, 6, RED);
        s.oval(hx + 3, hy + 1, 4, 4, FACEW.b);
        patchEye(s, hx + 3, hy + 2, eyes);
        macawBeak(s, hx + 6, hy + 2, beakOpen);
    }
    if (food >= 0) {
        // parrots eat with their feet: a foot raised to the beak holding a piece of fruit
        s.line(8, 12, 10, 10, FEET.b);
        s.px(11, 10, FEET.b);
        s.rect(11, 8 + food, 2, 2 - food, '#e8404a');
        s.px(11, 8 + food, '#fff0d8');
    }
    s.point('head', hx + 3, hy);
}

/** Flying macaw, side view. w = wing phase 0 up, 1 level, 2 down. Canvas 26×19, centre (13, 9). */
function macawFly(s, w) {
    // long pointed tail streaming back
    s.poly([[0, 12], [2, 11], [11, 9], [11, 11], [3, 12.5]], RED.d1);
    s.line(1, 12, 10, 10, RED.b);
    s.px(0, 12, BLU.b);
    s.px(1, 12, BLU.b);
    s.px(2, 12, BLU.d1);
    // far wing
    if (w === 0) s.poly([[11, 8], [14, 8], [11, 1], [9, 2]], BLU.d1);
    if (w === 2) s.poly([[11, 10], [14, 10], [11, 17], [9, 16]], BLU.d1);
    // body
    s.ball(9, 7, 9, 5, RED);
    s.hline(11, 15, 11, RED.l1);
    // head
    s.ball(16, 5, 6, 6, RED);
    s.oval(18, 6, 4, 3, FACEW.b);
    patchEye(s, 18, 6, 'open');
    macawBeak(s, 21, 6);
    // near wing: red, a yellow band, then blue flight feathers
    if (w === 0) {
        s.poly([[10, 8], [15, 8], [14, 3], [10, 0], [7, 1], [9, 5]], BLU.b);
        s.poly([[10, 8], [15, 8], [14.5, 4], [9.5, 4.5]], YEL.b);
        s.poly([[11, 8], [15, 8], [15, 6], [11, 6]], RED.b);
        s.line(9, 2, 12, 1, BLU.d1);
        s.line(10, 4, 13, 3, BLU.l1);
    } else if (w === 1) {
        s.poly([[9, 8], [15, 8], [11, 5], [2, 4], [5, 7]], BLU.b);
        s.poly([[9, 8], [15, 8], [12, 5.5], [7, 5.5]], YEL.b);
        s.hline(11, 14, 8, RED.b);
        s.hline(12, 14, 7, RED.b);
        s.line(3, 5, 8, 5, BLU.l1);
        s.line(4, 6, 7, 7, BLU.d1);
    } else {
        s.poly([[10, 8], [15, 8], [14, 11], [12, 18], [9, 18], [8, 13]], BLU.b);
        s.poly([[9.5, 10], [14.5, 10], [14, 13], [9, 13]], YEL.b);
        s.poly([[10, 8], [15, 8], [15, 10], [10, 10]], RED.b);
        s.line(10, 14, 11, 17, BLU.d1);
        s.line(12, 14, 12, 16, BLU.l1);
    }
}

const parrotDef = {
    name: 'a-parrot',
    sheet: 'animals-jungle',
    w: 15,
    h: 20,
    anchor: [7, 15],
    anims: {
        idle: [(s) => macawPerch(s, {}), (s) => macawPerch(s, { head: 1, tail: 1 })],
        blink: [(s) => macawPerch(s, { eyes: 'closed' })],
        look: [(s) => macawPerch(s, { look: true })],
        eat: [
            (s) => macawPerch(s, { head: 1, beakOpen: true, food: 0, foot: 'right' }),
            (s) => macawPerch(s, { head: 1, eyes: 'happy', food: 1, foot: 'right' })
        ],
        fly: { w: 26, h: 19, anchor: [13, 9], frames: [0, 1, 2].map((w) => (s) => macawFly(s, w)) },
        special: [
            (s) => macawPerch(s, { head: -1, crest: true, foot: 'left', eyes: 'happy', beakOpen: true }),
            (s) => macawPerch(s, { head: 1, lean: 1, foot: 'right', eyes: 'happy', tail: 1 })
        ]
    }
};

// ===========================================================================
// TOUCAN – black with a white throat and a huge orange-yellow beak
// ===========================================================================
const TBLK = { b: '#35304c', l1: '#57507a', l2: '#7a72a4', d1: '#262238', d2: '#1c1a2c' };
const TWHT = { b: '#fff8e6', d1: '#e8d8bc', y: '#ffe98a' };
const TBEAK = { b: '#ff9a2a', l1: '#ffcf45', l2: '#fff08a', d1: '#e8641e', tip: '#3a2230' };
const TSKIN = '#ffb347';
const TRING = '#5ab8ff';
const TFEET = '#7a8ed0';
const TVENT = '#e8413c';
const TBEAK_KEY = { l: TBEAK.l1, L: TBEAK.l2, b: TBEAK.b, d: TBEAK.d1, t: TBEAK.tip };

// Beak maps (left column touches the face).
const TOUCAN_BEAKS = {
    closed: ['.Lll....', 'llbbll..', 'bbbbbbl.', 'bbbbbbbt', 'dddddtt.'],
    open: ['.Lll....', 'llbbll..', 'bbbbbbbt', '........', 'ddddtt..'],
    up: ['......lt', '....llbt', '..Llbbd.', 'llbbdd..', 'bbdd....'],
    front: ['.ll.', 'lbbl', 'bbbd', 'bbdd', '.tt.']
};

/** Perched toucan. Canvas 17×16, feet at (6, 12). */
function toucanPerch(s, { eyes = 'open', bob = 0, tail = 0, look = false, beak = 'closed', berry = null } = {}) {
    const y = bob;
    // tail below the perch
    s.rect(1 - tail, 11, 3, 4, TBLK.d1);
    s.vline(1 - tail, 11, 14, TBLK.b);
    // body and folded wing
    s.ball(1, 3 + y, 8, 10 - y, TBLK);
    s.poly([[1, 5 + y], [5, 5 + y], [5, 10], [2, 13], [0.5, 10]], TBLK.d1);
    s.line(2, 5 + y, 4, 5 + y, TBLK.l1);
    s.line(1, 6 + y, 1, 9, TBLK.l1);
    s.line(2, 11, 3, 10, TBLK.d2);
    // big white bib with a warm yellow edge
    s.oval(5, 3 + y, 4, 6, TWHT.b);
    s.px(6, 8 + y, TWHT.y);
    s.px(7, 8 + y, TWHT.y);
    s.px(8, 7 + y, TWHT.d1);
    // red under-tail and blue feet
    s.hline(4, 5, 11, TVENT);
    s.hline(5, 7, 12, TFEET);
    // head
    s.ball(2, y, 7, 5, TBLK);
    if (look) {
        // facing us: the huge beak points right at the camera
        s.map(0, y, [
            '...kkkk...',
            '..kkkkkk..',
            '.kuukkuuk.',
            'kuEwkkEwuk',
            'kuEELLEEuk',
            '.kuLllLuk.',
            '.wwlbbbww.',
            '..wbbbdw..',
            '...bbdd...',
            '....tt....'
        ], { k: TBLK.b, u: TRING, E: EYE, w: SPARK, L: TBEAK.l2, l: TBEAK.l1, b: TBEAK.b, d: TBEAK.d1, t: TBEAK.tip });
        s.point('head', 5, y);
        return;
    }
    s.oval(5, y, 4, 4, TSKIN);
    s.px(5, 2 + y, TRING);
    eye2(s, 6, 1 + y, eyes);
    if (beak === 'up') s.map(8, -3 + y, TOUCAN_BEAKS.up, TBEAK_KEY);
    else s.map(8, y, TOUCAN_BEAKS[beak], TBEAK_KEY);
    if (berry) berry(s);
    s.point('head', 5, y);
}

function berryAt(s, x, y) {
    s.rect(x, y, 2, 2, '#d8284a');
    s.px(x, y, '#ff7a8a');
    s.px(x + 1, y - 1, '#4f9a3a');
}

/** Flying toucan. w = 0 wings up, 1 wings down. Canvas 22×15, centre (10, 7). */
function toucanFly(s, w) {
    // tail
    s.poly([[0, 6], [4, 6], [4, 9], [0, 8]], TBLK.d1);
    s.px(0, 6, TBLK.b);
    // far wing
    if (w === 0) s.poly([[7, 6], [10, 6], [9, 1], [7, 1]], TBLK.d2);
    // body
    s.ball(3, 4, 9, 6, TBLK);
    s.oval(8, 5, 4, 4, TWHT.b);
    s.px(4, 9, TVENT);
    s.px(5, 9, TVENT);
    // head and beak
    s.ball(9, 2, 5, 5, TBLK);
    s.oval(11, 2, 3, 3, TSKIN);
    eye2(s, 11, 3, 'open');
    s.map(13, 2, TOUCAN_BEAKS.closed, TBEAK_KEY);
    // near wing with a lit leading edge
    if (w === 0) {
        s.poly([[4, 6], [10, 6], [9, 0], [6, 0], [3, 3]], TBLK.b);
        s.line(6, 0, 9, 0, TBLK.l1);
        s.line(5, 1, 5, 3, TBLK.l1);
        s.line(7, 2, 8, 4, TBLK.d1);
    } else {
        s.poly([[4, 7], [10, 7], [9, 10], [6, 14], [3, 13], [3, 10]], TBLK.b);
        s.hline(4, 9, 7, TBLK.l1);
        s.line(4, 10, 4, 12, TBLK.l1);
        s.line(6, 10, 7, 12, TBLK.d1);
    }
}

/** Same toucan, drawn 4 px lower in a taller frame (room for the tossed berry). */
function toucanPerchLow(s, opts) {
    const tmp = new s.constructor(17, 16);
    toucanPerch(tmp, { ...opts, berry: null });
    s.stamp(tmp, 0, 4);
    for (const [k, [x, y]] of Object.entries(tmp.points)) s.point(k, x, y + 4);
    if (opts.berry) opts.berry(s);
}

const toucanDef = {
    name: 'a-toucan',
    sheet: 'animals-jungle',
    w: 17,
    h: 16,
    anchor: [6, 12],
    anims: {
        idle: [(s) => toucanPerch(s, {}), (s) => toucanPerch(s, { bob: 1, tail: 1 })],
        blink: [(s) => toucanPerch(s, { eyes: 'closed' })],
        look: [(s) => toucanPerch(s, { look: true })],
        eat: [
            (s) => toucanPerch(s, { beak: 'open', berry: (q) => berryAt(q, 14, 3) }),
            (s) => toucanPerch(s, { eyes: 'happy', bob: 1 })
        ],
        fly: { w: 22, h: 15, anchor: [10, 7], frames: [0, 1].map((w) => (s) => toucanFly(s, w)) },
        // tosses a berry up (0) and catches it on the beak tip (1)
        special: {
            w: 17, h: 20, anchor: [6, 16],
            frames: [
                (s) => toucanPerchLow(s, { beak: 'up', berry: (q) => berryAt(q, 14, 0) }),
                (s) => toucanPerchLow(s, { eyes: 'happy', beak: 'open', berry: (q) => berryAt(q, 14, 6) })
            ]
        }
    }
};

// ===========================================================================
// SLOTH – hangs upside down from a branch with a sleepy smile
// ===========================================================================
const SL = ramp('#aa8f70');
const SL_FACE = { b: '#f6e8cf', l1: '#fff7e8', d1: '#e0c9a6' };
const SL_MASK = '#6b4a38';
const SL_CLAW = '#f2e3c8';
const BARK = ramp('#80563a');
const LEAF = ramp('#4fa446');

/** A short leafy branch piece along the top of hanging sprites (top row y). */
function branch(s, x0, x1, y) {
    s.rect(x0, y, x1 - x0 + 1, 2, BARK.b);
    s.hline(x0, x1, y, BARK.l1);
    s.hline(x0, x1, y + 1, BARK.d1);
    for (let x = x0 + 3; x < x1; x += 7) s.px(x, y, BARK.b);
    // leaf tufts at both ends
    for (const [lx, flip] of [[x0, -1], [x1, 1]]) {
        s.oval(lx - 1 + flip, y - 2, 3, 3, LEAF.b);
        s.px(lx + flip, y - 2, LEAF.l1);
        s.oval(lx - 1 + 2 * flip, y + 1, 3, 3, LEAF.d1);
    }
}

/** Sloth head (11×9 box at x, y), face turned to us. */
function slothFace(s, x, y, { eyes = 'sleepy', mouth = 'smile', leaf = 0 } = {}) {
    s.ball(x, y, 11, 9, SL);
    // pale face with a darker fur cap
    s.oval(x + 1, y + 2, 9, 7, SL_FACE.b);
    s.px(x + 2, y + 3, SL_FACE.l1);
    s.hline(x + 3, x + 7, y + 8, SL_FACE.d1);
    // dark eye stripes sloping down and out (the sloth's "mascara")
    const e1 = x + 2;
    const e2 = x + 7;
    const ey = y + 4;
    s.rect(e1 - 1, ey - 1, 3, 3, SL_MASK);
    s.rect(e2, ey - 1, 3, 3, SL_MASK);
    s.px(e1 - 1, ey + 2, SL_MASK);
    s.px(e2 + 2, ey + 2, SL_MASK);
    s.px(e1 + 2, ey - 1, SL_FACE.b);
    s.px(e2 - 1, ey - 1, SL_FACE.b);
    if (eyes === 'open') {
        s.rect(e1, ey, 2, 2, EYE);
        s.rect(e2, ey, 2, 2, EYE);
        s.px(e1 + 1, ey, SPARK);
        s.px(e2 + 1, ey, SPARK);
    } else if (eyes === 'sleepy') {
        // half-closed, content eyes: a lid line with the eye peeking below
        s.hline(e1, e1 + 1, ey, EYE);
        s.hline(e2, e2 + 1, ey, EYE);
        s.px(e1 + 1, ey + 1, EYE);
        s.px(e2 + 1, ey + 1, EYE);
    } else {
        s.px(e1, ey + 1, EYE);
        s.px(e1 + 1, ey + 1, EYE);
        s.px(e2, ey + 1, EYE);
        s.px(e2 + 1, ey + 1, EYE);
    }
    // nose and a gentle, sleepy smile
    s.hline(x + 4, x + 6, y + 5, '#4a302c');
    s.px(x + 5, y + 5, '#2a1a1a');
    if (mouth === 'smile') {
        s.px(x + 4, y + 6, '#7a3a3e');
        s.px(x + 5, y + 7, '#7a3a3e');
        s.px(x + 6, y + 6, '#7a3a3e');
    } else if (mouth === 'o') {
        s.px(x + 5, y + 7, '#7a3a3e');
    }
    s.px(x + 1, y + 6, BLUSH);
    s.px(x + 9, y + 6, BLUSH);
    if (leaf) {
        // a leaf sticking out of the munching mouth
        s.px(x + 6, y + 7, LEAF.b);
        s.px(x + 7, y + 7, LEAF.l1);
        if (leaf > 1) s.px(x + 8, y + 8, LEAF.b);
    }
}

/** Claws hooked over the branch top at (x, y). */
function claws(s, x, y, c = SL_CLAW) {
    s.px(x, y - 1, c);
    s.px(x + 1, y - 1, c);
    s.px(x + 2, y, c);
}

function limbL(s, x0, y0, x1, y1, c, contour) {
    if (contour) s.thick(x0, y0, x1, y1, 4, contour, { onlyOver: true });
    s.thick(x0, y0, x1, y1, 2, c);
}

/**
 * Sloth hanging under a branch. Canvas 23×22, the branch top is y = 2 and the
 * anchor (between the gripping claws) is (10, 2).
 */
function slothHang(s, { eyes = 'sleepy', sag = 0, head = 0, wave = null, mouth = 'smile', leaf = 0 } = {}) {
    const B = 2;
    branch(s, 3, 19, B);
    const by = 6 + sag;
    // far limbs (behind)
    limbL(s, 6, by + 1, 7, B + 1, SL.d1);
    limbL(s, 13, by + 1, 15, B + 1, SL.d1);
    claws(s, 7, B, '#d9c7a8');
    claws(s, 15, B, '#d9c7a8');
    // round shaggy body
    s.ball(2, by, 15, 9, SL);
    s.hline(5, 12, by + 1, SL.l1);
    dots(s, [[4, by + 5], [6, by + 7], [3, by + 3], [14, by + 3], [9, by + 3]], SL.d1);
    // near back limb
    limbL(s, 4, by + 2, 4, B + 1, SL.b, SL.d2);
    claws(s, 4, B);
    // near front arm: gripping (behind the head), or waving
    if (!wave) {
        limbL(s, 13, by + 2, 12, B + 1, SL.b, SL.d2);
        claws(s, 12, B);
    }
    // head hanging under the front of the body, face turned to us
    slothFace(s, 8, by + 5 + head, { eyes, mouth, leaf });
    if (wave) {
        const [wx, wy] = wave;
        limbL(s, 15, by + 3, wx, wy, SL.b, SL.d2);
        s.px(wx + 1, wy - 1, SL_CLAW);
        s.px(wx + 2, wy, SL_CLAW);
        s.px(wx + 2, wy + 1, SL_CLAW);
    }
    s.point('head', 13, by + 5 + head);
}

const slothDef = {
    name: 'a-sloth',
    sheet: 'animals-jungle',
    w: 23,
    h: 22,
    anchor: [10, 2],
    anims: {
        idle: [(s) => slothHang(s, {}), (s) => slothHang(s, { sag: 1 })],
        blink: [(s) => slothHang(s, { eyes: 'closed' })],
        sleep: [(s) => slothHang(s, { eyes: 'closed', head: 1, sag: 1, mouth: 'o' })],
        eat: [
            (s) => slothHang(s, { eyes: 'closed', mouth: 'o', leaf: 2 }),
            (s) => slothHang(s, { eyes: 'closed', mouth: 'o', leaf: 1, sag: 1 })
        ],
        look: [(s) => slothHang(s, { eyes: 'open' })],
        // a very slow wave with the free front arm, clear of the face
        special: [
            (s) => slothHang(s, { wave: [19, 6] }),
            (s) => slothHang(s, { wave: [20, 10] })
        ]
    }
};

// ===========================================================================
// CHAMELEON – curled tail, turret eyes, walks slowly along branches
// ===========================================================================
const CHAM_COLORS = {
    green: { body: ramp('#5cc44c'), stripe: '#e3f79c', crest: '#2f7a3a', spot: '#3d9a46', cone: '#b4ee8a' },
    pink: { body: ramp('#f27ab8'), stripe: '#ffe2f3', crest: '#8a40a8', spot: '#c65cc0', cone: '#ffc6e6' }
};

// Open spiral tail (relative to the rump), wide enough that the sky shows inside the curl.
const CHAM_TAILS = [
    [[0, 0], [-1, 0], [-2, 0], [-3, 0], [-4, 0], [-5, 1], [-6, 2], [-6, 3], [-6, 4], [-5, 5], [-4, 6], [-3, 6],
        [-2, 5], [-1, 4], [-1, 3], [-2, 2], [-3, 3]],
    [[0, 0], [-1, -1], [-2, -1], [-3, -1], [-4, -1], [-5, 0], [-6, 1], [-6, 2], [-6, 3], [-5, 4], [-4, 5], [-3, 5],
        [-2, 4], [-2, 3], [-3, 2], [-4, 3]]
];

/** Chameleon side view in a 23×13 frame, feet on row 11. */
function chameleon(s, col, { legs = 0, eyes = 'open', pupil = 1, look = false, tail = 0, mouth = false } = {}) {
    const C = CHAM_COLORS[col];
    const B = C.body;
    const X = 7;   // body offset (room for the tail)
    const Y = 1;   // room for the casque
    // walk: diagonal pairs step in turn (near back + far front, then the others)
    const step = [1, 0, -1, 0][legs];
    const liftA = legs === 1 ? 1 : 0;   // near back + far front in the air
    const liftB = legs === 3 ? 1 : 0;   // far back + near front in the air
    const leg = (x, dx, lift, c, foot) => {
        s.rect(X + x, Y + 7, 2, 2 - lift, c);
        s.rect(X + x + dx, Y + 9 - lift, 2, 1, c);
        s.hline(X + x + dx - 1, X + x + dx + 2, Y + 10 - lift, foot);
    };
    // far legs peek out behind the near ones
    leg(2, -step, liftB, B.d2, B.d2);
    leg(9, step, liftA, B.d2, B.d2);
    // tail
    dots(s, CHAM_TAILS[tail], B.b, X + 1, Y + 4);
    s.px(X - 1, Y + 4 - tail, B.l1);
    // arched body
    s.poly([[X - 0.5, Y + 8], [X, Y + 5], [X + 2, Y + 2.5], [X + 5, Y + 1.5], [X + 8, Y + 1.5], [X + 11, Y + 3], [X + 11, Y + 8]], B.b);
    s.line(X + 1, Y + 4, X + 3, Y + 2, B.l1);
    s.hline(X + 4, X + 7, Y + 2, B.l1);
    s.hline(X + 1, X + 10, Y + 7, B.d1);
    s.hline(X + 1, X + 10, Y + 5, C.stripe);
    dots(s, [[X + 3, Y + 4], [X + 6, Y + 3], [X + 8, Y + 4], [X + 5, Y + 6]], C.spot);
    dots(s, [[X + 3, Y + 2], [X + 5, Y + 1], [X + 7, Y + 1]], C.crest);
    // head: a tall helmet casque, a pointed snout and a smiling mouth
    s.poly([[X + 8, Y + 2], [X + 9, Y - 1], [X + 11, Y - 1], [X + 12, Y + 1], [X + 15, Y + 4], [X + 15, Y + 6], [X + 13, Y + 8], [X + 9, Y + 8]], B.b);
    s.line(X + 9, Y - 1, X + 10, Y - 1, B.l1);
    s.px(X + 8, Y + 1, C.crest);
    s.line(X + 11, Y + 7, X + 14, Y + 6, B.d2);
    s.px(X + 14, Y + 5, B.d2);
    // near legs
    leg(1, step, liftA, B.b, B.d1);
    leg(8, -step, liftB, B.b, B.d1);
    s.px(X + 1, Y + 7, B.l1);
    s.px(X + 8, Y + 7, B.l1);
    if (mouth) {
        s.hline(X + 11, X + 15, Y + 6, '#8a2a48');
        s.hline(X + 12, X + 15, Y + 7, B.d1);
    }
    if (look) {
        // turned to us: both turret eyes and a wide smile
        for (const ex of [X + 8, X + 12]) {
            s.circle(ex + 1, Y + 3, 2, B.d2);
            s.oval(ex, Y + 2, 3, 3, C.cone);
            s.rect(ex, Y + 2, 2, 2, EYE);
            s.px(ex + 1, Y + 2, SPARK);
        }
        s.hline(X + 10, X + 12, Y + 7, B.d2);
        s.px(X + 9, Y + 6, B.d2);
        s.px(X + 13, Y + 6, B.d2);
    } else {
        // turret eye: a big round cone with a dark ring and a pupil
        s.circle(X + 11, Y + 3, 2, B.d2);
        s.oval(X + 10, Y + 2, 3, 3, C.cone);
        s.px(X + 10, Y + 2, '#ffffff');
        if (eyes === 'open') {
            const px = X + 11 + pupil;
            s.rect(px, Y + 3, 1, 2, EYE);
            if (!pupil) s.px(px, Y + 2, EYE);
        } else {
            s.hline(X + 10, X + 12, Y + 3, B.d2);
            s.px(X + 10, Y + 2, C.cone);
        }
    }
    s.point('head', X + 10, 0);
}

function chameleonTongue(s, col, stage) {
    chameleon(s, col, { pupil: 1, mouth: true });
    // the long sticky tongue shoots out of the mouth
    const x0 = 23;
    const len = stage ? 14 : 3;
    s.hline(x0 - 1, x0 + len, 7, '#ff8fb0');
    s.rect(x0 + len, 6, 3, 3, '#ff6f9c');
    s.px(x0 + len, 6, '#ffc0d4');
    s.point('tongue', x0 + len + 1, 7);
}

function chameleonDef(name, col) {
    return {
        name,
        sheet: 'animals-jungle',
        w: 24,
        h: 13,
        anchor: [13, 11],
        anims: {
            idle: [(s) => chameleon(s, col, {}), (s) => chameleon(s, col, { pupil: -1, tail: 1 })],
            blink: [(s) => chameleon(s, col, { eyes: 'closed' })],
            walk: [0, 1, 2, 3].map((f) => (s) => chameleon(s, col, { legs: f })),
            look: [(s) => chameleon(s, col, { look: true })],
            eat: [
                (s) => chameleon(s, col, { mouth: true }),
                (s) => chameleon(s, col, { eyes: 'closed', tail: 1 })
            ],
            special: { w: 43, h: 13, anchor: [13, 11], frames: [0, 1].map((f) => (s) => chameleonTongue(s, col, f)) }
        }
    };
}

// ===========================================================================
// BLUE MORPHO – shimmering electric-blue wings with black edges
// ===========================================================================
const MORPHO_KEY = {
    k: '#1d1a3c', w: '#ffffff', B: '#2266dc', b: '#2e9bff', c: '#76dcff', C: '#dcfaff',
    y: '#3a2838', a: '#4a3848', p: '#9a6a44', P: '#704a32', l: '#c4935e', e: '#ffcf4a', E: '#2a1a1a'
};

/** Build a symmetric top view from left halves (5 px) and the body column. */
function butterflyRows(halves, body) {
    return halves.map((h, i) => {
        const right = h.split('').reverse().join('');
        return h + body[i] + right;
    });
}

const MORPHO_FLY = [
    // wings wide open
    butterflyRows(['...a.', '....a', 'kkbbb', 'kwbcc', 'kbcCc', '.kbcc', '..Bbb', '.Bbcc', '.Bbbb', '..BB.'],
        '..yyyyyyy.'),
    // wings tilted up
    butterflyRows(['...a.', '.kk.a', '.kwbb', '.kbcC', '..bcc', '..Bbb', '..Bbc', '..Bbb', '...B.', '.....'],
        '..yyyyyy..'),
    // closed above the body: brown undersides with an eyespot flash past
    butterflyRows(['.....', '...la', '...lp', '...pe', '...pp', '...pp', '....p', '....P', '.....', '.....'],
        '..yyyyyy..'),
    // on the way down
    butterflyRows(['...a.', '....a', '.kkbb', '.kwbc', '.kbcC', '..bcc', '..Bbb', '..Bbc', '..BB.', '.....'],
        '..yyyyyy..')
];

/**
 * Resting on a leaf with the wings raised together in a narrow V, showing the
 * brown undersides with eyespots. Frame 1 opens them a crack: a blue flash.
 */
const MORPHO_REST = [
    butterflyRows(['.l...', '.pl..', 'lppa.', 'pEep.', 'pppl.', '.pEp.', '..pl.', '..pp.', '....y', '.....'],
        '...yyyy...'),
    butterflyRows(['l....', 'pl...', 'ppl.a', 'pEeca', 'pppc.', '.pEpc', '..ppc', '..pp.', '....y', '.....'],
        '...yyyy...')
];

const morphoDef = {
    name: 'a-morpho',
    sheet: 'animals-jungle',
    w: 13,
    h: 12,
    anchor: [6, 6],
    anims: {
        fly: MORPHO_FLY.map((rows) => (s) => s.map(1, 1, rows, MORPHO_KEY)),
        idle: {
            w: 13, h: 11, anchor: [6, 9],
            frames: MORPHO_REST.map((rows) => (s) => {
                s.map(1, 1, rows, MORPHO_KEY);
                s.point('head', 6, 2);
            })
        }
    }
};

// ===========================================================================
// DART FROGS – tiny, glossy, bright blue (or red) with dark spots
// ===========================================================================
const FROG_COLORS = {
    blue: { body: ramp('#2e8cff'), spot: '#1c1a3c', belly: '#a6dcff' },
    red: { body: ramp('#ff3b3b'), spot: '#2a1624', belly: '#ffb0a0' }
};

// Dart frog facing us: eye bumps on top, a U-shaped smile, dark spots, feet out.
// b body, l light, d leg, D dark line, s spot, E eye, w sparkle, t tongue
const FROG = {
    sit: ['..lb...lb.', '.bEwb.bEwb', 'bbEEbsbEEb', 'bsbbbbbbsb', 'bbDbbbbDbb', 'dbbDDDDbbd', 'dd.d..d.dd'],
    blink: ['..lb...lb.', '.bbbb.bbbb', 'bbDDbsbDDb', 'bsbbbbbbsb', 'bbDbbbbDbb', 'dbbDDDDbbd', 'dd.d..d.dd'],
    look: ['..lb...lb.', '.bEwb.bEwb', 'bbEEbsbEEb', 'bsbbbbbbsb', 'bbDbbbbDbb', 'dbbDttDbbd', 'dd.d..d.dd'],
    crouch: ['..lb...lb.', '.bEwb.bEwb', 'bbEEbsbEEb', 'bsbDbbDbsb', 'dbbbDDbbbd', 'ddd.dd.ddd'],
    leap: ['..lb...lb.', '.bEwb.bEwb', 'bbEEbsbEEb', 'bsbbbbbbsb', 'bbDbbbbDbb', '.bbDDDDbb.', '..d.bb.d..', '.dd....dd.']
};

/** Dart frog. Canvas 12×10, feet on row 9. pose: sit, crouch, leap. */
function dartFrog(s, col, { eyes = 'open', pose = 'sit', throat = 0, look = false } = {}) {
    const C = FROG_COLORS[col];
    const B = C.body;
    const key = { b: B.b, l: B.l1, d: B.d1, D: B.d2, s: C.spot, E: EYE, w: SPARK, t: '#ff8fb0' };
    const rows = look ? FROG.look : pose !== 'sit' ? FROG[pose] : eyes === 'closed' ? FROG.blink : FROG.sit;
    const top = pose === 'leap' ? 0 : 10 - rows.length;
    s.map(1, top, rows, key);
    if (throat) s.hline(5, 6, top + 5, C.belly);
    s.point('head', 5, top);
}

function dartFrogDef(name, col) {
    return {
        name,
        sheet: 'animals-jungle',
        w: 12,
        h: 10,
        anchor: [6, 9],
        anims: {
            idle: [(s) => dartFrog(s, col, {}), (s) => dartFrog(s, col, { throat: 1 })],
            blink: [(s) => dartFrog(s, col, { eyes: 'closed' })],
            look: [(s) => dartFrog(s, col, { look: true })],
            eat: [(s) => dartFrog(s, col, { look: true }), (s) => dartFrog(s, col, { eyes: 'closed', throat: 1 })],
            hop: [
                (s) => dartFrog(s, col, { pose: 'crouch' }),
                (s) => dartFrog(s, col, { pose: 'leap' }),
                (s) => dartFrog(s, col, { pose: 'crouch' })
            ]
        }
    };
}

// ===========================================================================
// TIGRESS – a big, gentle tiger mother (same colours as Nova)
// ===========================================================================
const TG = { b: '#f59a32', l1: '#ffc267', l2: '#ffe3a8', d1: '#d56d22', d2: '#a4481b' };
const TG_STRIPE = '#3a1f1f';
const TG_WHITE = { b: '#fff4e3', l1: '#ffffff', d1: '#f0d3b8', d2: '#dcb89c' };
const TG_EAR = '#ffb3a6';
const TG_NOSE = '#ff8a9a';

/**
 * Tigress head in a 16×13 box at (x, y): a grown-up Nova head.
 * look: 1 = turned a little to the right, 0 = straight at us.
 * eyes: open, closed, happy, squeeze; mouth: smile, open, yawn, yawnBig.
 */
function tigerHead(s, x, y, { eyes = 'open', mouth = 'smile', look = 1, big = false } = {}) {
    // round ears with pink insides
    s.oval(x + 1, y, 5, 5, TG.b);
    s.oval(x + 10, y, 5, 5, TG.b);
    s.hline(x + 2, x + 3, y + 2, TG_EAR);
    s.hline(x + 12, x + 13, y + 2, TG_EAR);
    s.px(x + 3, y + 3, TG_EAR);
    s.px(x + 12, y + 3, TG_EAR);
    // head
    s.ball(x, y + 2, 16, 11, TG);
    const f = x + look;
    // forehead stripes
    s.vline(f + 5, y + 3, y + 4, TG_STRIPE);
    s.vline(f + 10, y + 3, y + 4, TG_STRIPE);
    s.hline(f + 7, f + 8, y + 3, TG_STRIPE);
    s.px(f + 7, y + 4, TG_STRIPE);
    // cheek stripes and a little white fluff at the sides
    s.hline(x, x + 1, y + 7, TG_STRIPE);
    s.hline(x + 14, x + 15, y + 7, TG_STRIPE);
    s.px(x, y + 9, TG_WHITE.b);
    s.px(x + 1, y + 10, TG_WHITE.b);
    s.px(x + 15, y + 9, TG_WHITE.d1);
    s.px(x + 14, y + 10, TG_WHITE.d1);
    // white muzzle
    s.oval(f + 4, y + 8, 8, 5, TG_WHITE.b);
    s.px(f + 5, y + 8, TG_WHITE.l1);
    // eyes
    const ex1 = f + 4;
    const ex2 = f + 10;
    const ey = y + 6;
    if (eyes === 'open' && big) {
        s.rect(ex1, ey - 1, 2, 3, EYE);
        s.rect(ex2, ey - 1, 2, 3, EYE);
        s.px(ex1 + 1, ey - 1, SPARK);
        s.px(ex2 + 1, ey - 1, SPARK);
    } else if (eyes === 'open') {
        eye2(s, ex1, ey, 'open');
        eye2(s, ex2, ey, 'open');
    } else if (eyes === 'happy') {
        eyes2(s, ex1, ex2, ey, 'happy');
    } else if (eyes === 'squeeze') {
        // tightly shut for a big yawn
        s.px(ex1 - 1, ey, EYE);
        s.hline(ex1, ex1 + 1, ey + 1, EYE);
        s.hline(ex2, ex2 + 1, ey + 1, EYE);
        s.px(ex2 + 2, ey, EYE);
    } else {
        s.hline(ex1, ex1 + 1, ey + 1, EYE);
        s.hline(ex2, ex2 + 1, ey + 1, EYE);
    }
    // soft blush
    s.px(f + 3, y + 9, BLUSH);
    s.px(f + 12, y + 9, BLUSH);
    // nose and mouth
    const nx = f + 7;
    s.hline(nx, nx + 1, y + 9, TG_NOSE);
    if (mouth === 'smile') {
        s.px(nx - 1, y + 10, MOUTH);
        s.px(nx + 2, y + 10, MOUTH);
    } else if (mouth === 'open') {
        s.rect(nx - 1, y + 10, 4, 2, '#9c3048');
        s.hline(nx, nx + 1, y + 11, TONGUE);
    } else if (mouth === 'chew') {
        s.hline(nx - 1, nx + 2, y + 10, MOUTH);
        s.px(nx + 3, y + 9, TG_WHITE.d1);
    } else if (mouth === 'yawn' || mouth === 'yawnBig') {
        const big = mouth === 'yawnBig';
        s.rect(nx - 1, y + 10, 4, big ? 4 : 3, '#8a2440');
        if (big) s.vline(nx - 2, y + 11, y + 12, '#8a2440');
        if (big) s.vline(nx + 3, y + 11, y + 12, '#8a2440');
        s.hline(nx, nx + 1, y + (big ? 13 : 12), TONGUE);
        s.px(nx - 1, y + 10, '#ffffff');
        s.px(nx + 2, y + 10, '#ffffff');
    }
}

/** A striped tail as a thick path. pts: [[x, y], ...] from base to tip. */
function tigerTail(s, pts) {
    for (let i = 0; i + 1 < pts.length; i += 1) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        s.thick(x0, y0, x1, y1, 3, TG.b);
    }
    // rings and a dark tip
    for (let i = 1; i < pts.length - 1; i += 1) {
        const [x, y] = pts[i];
        s.px(x, y, TG_STRIPE);
        s.px(x + 1, y, TG_STRIPE);
    }
    const [tx, ty] = pts[pts.length - 1];
    s.rect(tx - 1, ty - 1, 2, 2, TG_STRIPE);
    s.px(tx - 1, ty - 1, '#5a3030');
}

/** Tapered body stripes: short dark wedges from the back edge downward. */
function bodyStripes(s, list) {
    for (const [x, y, len, lean = 0] of list) {
        s.px(x, y, TG_STRIPE);
        s.px(x + 1, y, TG_STRIPE);
        s.line(x + lean, y + 1, x + lean + (lean ? lean : 0), y + len, TG_STRIPE);
    }
}

// ---------------------------------------------------------------------------
// Walking (side view), canvas 42×22, ground row 21.
// ---------------------------------------------------------------------------
function tigerLeg(s, x, top, foot, lift, c, stripes = true) {
    const fy = 21 - lift;
    s.rect(x, top, 4, fy - top, c);
    s.rect(x + foot, fy - 1, 5, 2, c === TG.b ? TG_WHITE.b : TG_WHITE.d1);
    if (stripes) {
        s.hline(x, x + 1, top + 3, TG_STRIPE);
        s.hline(x, x + 1, top + 5, TG_STRIPE);
    }
}

function tigerWalk(s, f) {
    const lift = [[0, 2, 2, 0], [0, 0, 0, 0], [2, 0, 0, 2], [0, 0, 0, 0]][f];
    const foot = [[1, -1, -1, 1], [0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][f];
    const bob = f % 2 ? 0 : -1;
    // tail up in a gentle curve
    const sway = f < 2 ? 0 : 1;
    tigerTail(s, [[8, 9 + bob], [4, 7 + bob], [2, 4 + bob + sway], [3, 1 + sway]]);
    // far legs
    tigerLeg(s, 9, 12 + bob, foot[0], lift[0], TG.d1, false);
    tigerLeg(s, 23, 12 + bob, foot[2], lift[2], TG.d1, false);
    // body with a white belly, hips and shoulders
    s.ball(6, 5 + bob, 24, 10, TG);
    s.oval(12, 11 + bob, 14, 4, TG_WHITE.b);
    s.hline(13, 24, 14 + bob, TG_WHITE.d1);
    bodyStripes(s, [[10, 6 + bob, 3], [14, 5 + bob, 4], [18, 5 + bob, 4], [22, 6 + bob, 3]]);
    s.line(7, 9 + bob, 8, 11 + bob, TG_STRIPE);
    // near legs
    tigerLeg(s, 11, 12 + bob, foot[1], lift[1], TG.b);
    tigerLeg(s, 25, 12 + bob, foot[3], lift[3], TG.b);
    s.px(11, 12 + bob, TG.l1);
    s.px(25, 12 + bob, TG.l1);
    // head at the front
    tigerHead(s, 25, bob, {});
    s.point('head', 33, bob);
}

// ---------------------------------------------------------------------------
// Sitting (side view, head turned to us), canvas 28×29, ground row 28.
// ---------------------------------------------------------------------------
function tigerSit(s, { eyes = 'open', mouth = 'smile', look = 1, bob = 0, tail = 0, headUp = 0, big = false } = {}) {
    const y = bob;
    // tail rising behind the back and curling forward, like Nova's
    tigerTail(s, tail
        ? [[5, 22], [2, 19], [1, 15], [2, 11], [5, 9]]
        : [[5, 22], [2, 19], [1, 16], [2, 12], [5, 10]]);
    // big round haunch with curved stripes
    s.ball(3, 15 + y, 14, 12 - y, TG);
    bodyStripes(s, [[6, 16 + y, 2], [10, 15 + y, 3]]);
    s.line(4, 20 + y, 5, 22 + y, TG_STRIPE);
    s.px(13, 17 + y, TG_STRIPE);
    // far front leg, just behind the near one
    s.rect(14, 18 + y, 3, 9 - y, TG.d1);
    s.rect(13, 26, 4, 2, TG_WHITE.d1);
    // chest and white bib
    s.ball(9, 10 + y, 12, 13, TG);
    s.oval(13, 12 + y, 7, 10, TG_WHITE.b);
    s.px(14, 13 + y, TG_WHITE.l1);
    bodyStripes(s, [[10, 13 + y, 3]]);
    // back foot on the ground
    s.rect(4, 25, 8, 3, TG.b);
    s.hline(4, 11, 27, TG.d1);
    s.rect(10, 25, 3, 3, TG_WHITE.b);
    s.px(12, 27, TG_WHITE.d1);
    // near front leg with a white paw
    s.rect(17, 18 + y, 3, 9 - y, TG.b);
    s.px(17, 18 + y, TG.l1);
    s.hline(17, 18, 21 + y, TG_STRIPE);
    s.hline(17, 18, 23 + y, TG_STRIPE);
    s.rect(17, 26, 4, 2, TG_WHITE.b);
    s.px(20, 27, TG_WHITE.d1);
    s.px(18, 27, TG_WHITE.d1);
    // head
    tigerHead(s, 8, 1 + y - headUp, { eyes, mouth, look, big });
    s.point('head', 16, 1 + y - headUp);
}

// ---------------------------------------------------------------------------
// Lying down with the head up (sphinx pose), canvas 42×20, ground row 19.
// ---------------------------------------------------------------------------
function tigerLie(s, { eyes = 'open', mouth = 'smile' } = {}) {
    // tail lying along the ground behind her, the tip curling up
    tigerTail(s, [[8, 17], [4, 18], [1, 17], [1, 14]]);
    // long body resting on the ground
    s.ball(5, 8, 25, 10, TG);
    bodyStripes(s, [[12, 8, 3], [16, 8, 4], [20, 8, 3]]);
    // round haunch with the hind paw tucked in front of it
    s.ball(5, 9, 12, 9, TG);
    s.line(8, 10, 9, 12, TG_STRIPE);
    s.line(11, 9, 12, 11, TG_STRIPE);
    s.px(6, 13, TG_STRIPE);
    s.rect(13, 16, 6, 2, TG_WHITE.d1);
    s.px(18, 16, TG_WHITE.b);
    s.hline(5, 29, 18, TG.d1);
    s.hline(19, 25, 17, TG_WHITE.b);
    // front legs stretched forward, white paws
    s.rect(24, 14, 12, 3, TG.d1);
    s.rect(33, 14, 4, 3, TG_WHITE.d1);
    s.rect(24, 16, 13, 3, TG.b);
    s.px(24, 16, TG.l1);
    s.rect(34, 16, 4, 3, TG_WHITE.b);
    s.px(37, 18, TG_WHITE.d1);
    s.hline(28, 29, 16, TG_STRIPE);
    s.hline(31, 31, 16, TG_STRIPE);
    // head up at the front
    tigerHead(s, 23, 1, { eyes, mouth });
    s.point('head', 31, 1);
}

const tigerDef = {
    name: 'a-tiger',
    sheet: 'animals-jungle',
    w: 28,
    h: 29,
    anchor: [14, 28],
    anims: {
        idle: [(s) => tigerSit(s, {}), (s) => tigerSit(s, { bob: 1, tail: 1 })],
        blink: [(s) => tigerSit(s, { eyes: 'closed' })],
        look: [(s) => tigerSit(s, { look: 0, big: true })],
        eat: [
            (s) => tigerSit(s, { eyes: 'happy', mouth: 'open' }),
            (s) => tigerSit(s, { eyes: 'happy', mouth: 'chew', bob: 1 })
        ],
        special: [
            (s) => tigerSit(s, { eyes: 'squeeze', mouth: 'yawn', headUp: 1 }),
            (s) => tigerSit(s, { eyes: 'squeeze', mouth: 'yawnBig', headUp: 2 })
        ],
        walk: { w: 42, h: 22, anchor: [20, 21], frames: [0, 1, 2, 3].map((f) => (s) => tigerWalk(s, f)) },
        lie: { w: 42, h: 20, anchor: [20, 19], frames: [(s) => tigerLie(s, {})] }
    }
};

// ===========================================================================
// PROPS – rainforest trees, big glossy leaves, vines and a friendly stone head
// ===========================================================================
const GD = ramp('#2c6b40');          // deep shade leaves
const GM = ramp('#3d8c46');          // mid leaves
const GL = ramp('#5cae4c');          // sunlit leaves
const GLOSS = ramp('#46a352');       // big glossy leaves
const TRUNK = ramp('#9c8670');       // pale rainforest bark
const MOSS = { b: '#6fae4a', l1: '#9fd06a', d1: '#4f8a3e' };
const PALMT = ramp('#a88a62');
const STONE = ramp('#8e98a2');

/** Leafy clump: a shaded ball with a scalloped top edge and a few glints. */
function clump(s, x, y, w, h, R, rnd) {
    s.ball(x, y, w, h, R);
    // scalloped top: little leaf bumps along the upper rim
    for (let i = 2; i < w - 2; i += 3) {
        const cx = x + i;
        const t = Math.round(y + h / 2 - (h / 2) * Math.sqrt(Math.max(0, 1 - ((i + 0.5 - w / 2) / (w / 2)) ** 2)));
        s.px(cx, t - 1, R.b);
        if (i < w / 2) s.px(cx, t, R.l1);
    }
    // glints and leaf tips
    const n = Math.round((w * h) / 40);
    for (let k = 0; k < n; k += 1) {
        const gx = x + 1 + Math.floor(rnd() * (w - 2));
        const gy = y + 1 + Math.floor(rnd() * (h - 2));
        const dx = (gx + 0.5 - (x + w / 2)) / (w / 2);
        const dy = (gy + 0.5 - (y + h / 2)) / (h / 2);
        if (dx * dx + dy * dy > 0.8) continue;
        if (dy < 0.1 && dx < 0.3) {
            s.px(gx, gy, R.l2);
            s.px(gx + 1, gy + 1, R.l1);
        } else {
            s.px(gx, gy, R.d1);
            s.px(gx - 1, gy, R.b);
        }
    }
}

/** Small hanging vine with alternating leaves (for trees). */
function hangVine(s, x, y0, y1, rnd) {
    for (let y = y0; y <= y1; y += 1) {
        const wx = x + Math.round(Math.sin((y - y0) / 3) * 0.6);
        s.px(wx, y, VINE_G.d1);
        if ((y - y0) % 4 === 2) s.px(wx + ((y >> 2) % 2 ? 1 : -1), y, rnd() > 0.5 ? GL.b : GL.l1);
    }
    s.px(x, y1 + 1, GL.b);
}

// ---------------------------------------------------------------------------
// Giant rainforest tree with buttress roots. 50×64, anchor bottom centre.
// ---------------------------------------------------------------------------
function jungleTree(s) {
    const rnd = rng(71);
    // trunk
    s.poly([[21, 20], [29, 20], [30, 52], [20, 52]], TRUNK.b);
    s.line(21, 22, 21, 50, TRUNK.l1);
    s.line(22, 24, 22, 44, TRUNK.l1);
    s.line(28, 22, 29, 50, TRUNK.d1);
    s.line(26, 26, 26, 46, TRUNK.d1);
    s.line(24, 30, 24, 40, TRUNK.d1);
    // moss patches
    s.oval(20, 36, 4, 6, MOSS.b);
    s.px(21, 37, MOSS.l1);
    s.oval(26, 27, 3, 4, MOSS.d1);
    // buttress roots: thin plank fins flaring out, with gaps between them
    const T2 = ramp('#7e6a58');
    s.rect(21, 44, 9, 20, TRUNK.b);
    s.vline(21, 44, 63, TRUNK.l1);
    s.vline(29, 44, 63, TRUNK.d1);
    s.vline(25, 50, 62, TRUNK.d1);
    // left fins (lit)
    s.poly([[21, 42], [21, 49], [9, 63.5], [4, 63.5]], TRUNK.b);
    s.line(21, 42, 5, 63, TRUNK.l1);
    s.line(21, 47, 9, 62, TRUNK.d1);
    s.poly([[22, 53], [22, 57], [18, 63.5], [13, 63.5]], TRUNK.l1);
    s.line(22, 53, 14, 63, TRUNK.l2);
    // right fins (in shade)
    s.poly([[29, 42], [29, 49], [41, 63.5], [46, 63.5]], T2.d1);
    s.line(29, 42, 45, 63, T2.b);
    s.poly([[28, 53], [28, 57], [32, 63.5], [37, 63.5]], TRUNK.d1);
    s.line(28, 53, 36, 63, TRUNK.b);
    // ground line and moss
    s.hline(4, 46, 63, T2.d2);
    s.px(8, 61, MOSS.b);
    s.px(9, 60, MOSS.l1);
    s.px(23, 60, MOSS.b);
    s.px(24, 61, MOSS.d1);
    s.px(40, 61, MOSS.d1);
    // side branches: a perch on the left, a hanging branch on the right
    s.thick(21, 33, 7, 29, 2, TRUNK.b);
    s.line(20, 32, 8, 28, TRUNK.l1);
    s.thick(29, 30, 44, 27, 2, TRUNK.d1);
    s.line(30, 29, 43, 26, TRUNK.b);
    clump(s, 1, 24, 9, 6, GM, rnd);
    clump(s, 41, 21, 9, 7, GM, rnd);
    // a red bromeliad on the right branch
    dots(s, [[35, 26], [36, 25], [37, 26], [36, 27]], '#e0405a');
    s.px(36, 26, '#ffd05a');
    // the canopy: dark clumps behind, sunlit clumps in front
    clump(s, 0, 8, 22, 16, GD, rnd);
    clump(s, 27, 6, 23, 17, GD, rnd);
    clump(s, 10, 1, 30, 17, GD, rnd);
    clump(s, 1, 11, 17, 12, GM, rnd);
    clump(s, 32, 11, 17, 12, GM, rnd);
    clump(s, 12, 13, 26, 10, GM, rnd);
    clump(s, 8, 3, 17, 13, GM, rnd);
    clump(s, 25, 2, 18, 13, GM, rnd);
    clump(s, 5, 6, 13, 10, GL, rnd);
    clump(s, 17, 0, 15, 11, GL, rnd);
    clump(s, 30, 5, 12, 9, GL, rnd);
    // hanging vines from the canopy
    hangVine(s, 6, 22, 36, rnd);
    hangVine(s, 15, 22, 30, rnd);
    hangVine(s, 38, 22, 34, rnd);
    s.point('perch', 10, 28);
    s.point('hang', 38, 27);
}

// ---------------------------------------------------------------------------
// Second tree: stilt roots and a two-tier umbrella canopy. 40×56.
// ---------------------------------------------------------------------------
function jungleTree2(s) {
    const rnd = rng(907);
    const T = ramp('#8a6a52');
    // stilt roots arching into the ground
    for (const [x0, x1] of [[18, 7], [19, 12], [21, 28], [22, 33], [20, 20]]) {
        s.line(x0, 42, x1, 55, T.d1);
        s.line(x0 + 1, 42, x1 + 1, 55, T.b);
    }
    s.hline(6, 34, 55, T.d2);
    // trunk
    s.poly([[17, 16], [23, 16], [23, 44], [17, 44]], T.b);
    s.vline(17, 18, 43, T.l1);
    s.vline(22, 18, 43, T.d1);
    s.vline(20, 22, 38, T.d1);
    s.oval(17, 30, 3, 5, MOSS.b);
    s.px(18, 31, MOSS.l1);
    // a lower tier of leaves on a side branch
    s.thick(22, 30, 32, 26, 2, T.b);
    clump(s, 27, 20, 13, 9, GD, rnd);
    clump(s, 29, 21, 10, 7, GM, rnd);
    s.point('perch', 31, 20);
    // the umbrella canopy
    clump(s, 0, 6, 18, 13, GD, rnd);
    clump(s, 22, 5, 18, 13, GD, rnd);
    clump(s, 7, 0, 26, 14, GD, rnd);
    clump(s, 3, 8, 15, 10, GM, rnd);
    clump(s, 21, 7, 16, 10, GM, rnd);
    clump(s, 12, 2, 16, 11, GM, rnd);
    clump(s, 7, 3, 11, 8, GL, rnd);
    clump(s, 18, 1, 11, 8, GL, rnd);
    // hanging roots and a flowering vine
    hangVine(s, 4, 17, 30, rnd);
    hangVine(s, 11, 18, 26, rnd);
    hangVine(s, 35, 16, 22, rnd);
    dots(s, [[11, 22], [4, 25]], '#ff7ab8');
}

// ---------------------------------------------------------------------------
// Palm tree with coconuts. 26×44.
// ---------------------------------------------------------------------------
function frond(s, pts, R) {
    // a palm frond: a spine with a comb of leaflets drooping from it
    for (let i = 0; i + 1 < pts.length; i += 1) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let k = 0; k <= steps; k += 1) {
            const x = Math.round(x0 + ((x1 - x0) * k) / steps);
            const y = Math.round(y0 + ((y1 - y0) * k) / steps);
            s.px(x, y + 1, R.b);
            if ((x + y) % 2 === 0) s.px(x, y + 2, R.d1);
        }
    }
    for (let i = 0; i + 1 < pts.length; i += 1) s.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], R.l1);
}

function palm(s) {
    // curved, ringed trunk
    const pts = [];
    for (let y = 43; y >= 12; y -= 1) pts.push([Math.round(12 + Math.sin((43 - y) / 14) * 3), y]);
    for (const [x, y] of pts) {
        s.hline(x - 1, x + 1, y, PALMT.b);
        s.px(x - 1, y, PALMT.l1);
        s.px(x + 1, y, PALMT.d1);
        if (y % 3 === 0) s.hline(x - 1, x + 1, y, PALMT.d1);
    }
    s.hline(9, 14, 43, PALMT.d1);
    const [tx, ty] = pts[pts.length - 1];
    // coconuts
    for (const [cx, cy] of [[tx - 2, ty + 2], [tx + 1, ty + 3], [tx - 1, ty + 4]]) {
        s.rect(cx, cy, 2, 2, '#7a5230');
        s.px(cx, cy, '#a8784a');
    }
    // crown of fronds
    const F = GM;
    frond(s, [[tx, ty], [tx - 4, ty - 3], [tx - 8, ty - 3], [tx - 11, ty - 1], [tx - 12, ty + 2]], GD);
    frond(s, [[tx, ty], [tx + 4, ty - 3], [tx + 8, ty - 3], [tx + 11, ty - 1], [tx + 12, ty + 2]], GD);
    frond(s, [[tx, ty], [tx - 3, ty - 6], [tx - 6, ty - 8], [tx - 10, ty - 8]], F);
    frond(s, [[tx, ty], [tx + 3, ty - 6], [tx + 7, ty - 8], [tx + 10, ty - 7]], F);
    frond(s, [[tx, ty], [tx - 5, ty + 1], [tx - 8, ty + 4], [tx - 9, ty + 7]], F);
    frond(s, [[tx, ty], [tx + 5, ty + 1], [tx + 8, ty + 4], [tx + 9, ty + 7]], F);
    frond(s, [[tx, ty], [tx - 1, ty - 5], [tx + 1, ty - 9], [tx + 3, ty - 10]], GL);
    s.rect(tx - 1, ty - 1, 3, 2, GL.b);
    s.point('perch', tx, ty - 2);
}

// ---------------------------------------------------------------------------
// Big glossy leaves
// ---------------------------------------------------------------------------
/**
 * Rasterise a leaf around (cx, cy): length 2·len along angle a (degrees,
 * 0 = pointing right, -90 = up), half-width wid. Options: heart (notch at the
 * stem end), slits (monstera splits from the edges), tip (pointiness).
 */
function leaf(s, cx, cy, len, wid, a, R, { heart = true, slits = 0, tip = 0.35 } = {}) {
    const ca = Math.cos((a * Math.PI) / 180);
    const sa = Math.sin((a * Math.PI) / 180);
    const r = Math.ceil(Math.max(len, wid)) + 1;
    for (let y = Math.floor(cy - r); y <= cy + r; y += 1) {
        for (let x = Math.floor(cx - r); x <= cx + r; x += 1) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            const u = (dx * ca + dy * sa) / len;       // along the midrib, -1 stem .. 1 tip
            const v = (-dx * sa + dy * ca) / wid;      // across, negative = upper/left side
            // leaf outline: wide near the stem, pointed at the tip
            const w = u > 0 ? 1 - tip * u * u - (1 - tip) * Math.max(0, u - 0.3) ** 2 / 0.49 : 1;
            if (u * u + (v / Math.max(w, 0.05)) ** 2 > 1 || Math.abs(v) > w) continue;
            if (heart && u < -0.62 && Math.abs(v) < (u + 1.02) * 0.9) continue;
            if (slits) {
                let cut = false;
                for (let k = 0; k < slits; k += 1) {
                    const at = -0.35 + (k * 0.95) / Math.max(1, slits - 1) * 0.9;
                    const along = u - at - Math.abs(v) * 0.35;
                    if (Math.abs(v) > 0.38 && Math.abs(along) < 0.075 * (1.4 / len) * 5) cut = true;
                }
                if (cut) continue;
            }
            let c = R.b;
            if (Math.abs(v) < 0.1 && u > -0.7 && u < 0.85) c = R.d1;
            else if (v < -0.55 && u < 0.4) c = R.l1;
            else if (v > 0.5) c = R.d1;
            s.px(x, y, c);
        }
    }
    // a glossy glint on the lit half
    const gx = cx + len * 0.2 * ca + wid * 0.45 * sa;
    const gy = cy + len * 0.2 * sa - wid * 0.45 * ca;
    s.px(gx, gy, R.l2);
}

// Monstera leaves: heart-shaped with the classic comb of splits along the edges.
// o shade edge, b base, l light, L glint, m midrib; k/q/K/n the darker back leaf.
const MONSTERA_FRONT = [
    '.bbb..bbb.',
    'bllbb.bbbo',
    'bLlbmbbbbo',
    '..lbmbbb..',
    'bllbbmbbbo',
    '..lbbmbb..',
    '.llbbmbbo.',
    '...lbmbb..',
    '...bbmbo..',
    '....bmo...',
    '.....o....'
];
const MONSTERA_BACK = [
    'kkk....',
    'kqqkk..',
    '.qqkkk.',
    'kq.knkk',
    '.kkknkK',
    '..kKnK.',
    '....Kn.'
];
const MONSTERA_KEY = { o: GLOSS.d1, b: GLOSS.b, l: GLOSS.l1, L: GLOSS.l2, m: GLOSS.d1, k: GD.b, q: GD.l1, K: GD.d1, n: GD.d1 };
const mirror = (rows) => rows.map((r) => r.split('').reverse().join(''));

function monstera(s, big) {
    if (big) {
        // 16×14: a dark leaf behind on the left, a big split leaf in front
        s.map(0, 0, MONSTERA_BACK, MONSTERA_KEY);
        s.line(6, 6, 7, 12, GD.b);
        s.line(11, 10, 8, 12, GD.b);
        s.map(6, 1, MONSTERA_FRONT, MONSTERA_KEY);
        s.hline(6, 9, 13, GD.d2);
    } else {
        // 14×12: the big leaf on the left, a young leaf behind on the right
        s.map(7, 1, mirror(MONSTERA_BACK), MONSTERA_KEY);
        s.line(8, 7, 7, 10, GD.b);
        s.line(5, 9, 6, 10, GD.b);
        s.map(0, 0, MONSTERA_FRONT, MONSTERA_KEY);
        s.hline(5, 8, 11, GD.d2);
    }
}

function bigLeaf(s) {
    // 18×10: three long glossy leaves fanning out from the base
    s.line(9, 9, 5, 7, GD.b);
    s.line(9, 9, 13, 7, GD.b);
    leaf(s, 4.5, 6.4, 5, 2.6, -165, GD, { heart: false, tip: 0.6 });
    leaf(s, 13.6, 6.2, 5, 2.6, -15, GLOSS, { heart: false, tip: 0.6 });
    leaf(s, 8.6, 4.2, 5.2, 3, -95, GL, { heart: false, tip: 0.5 });
    s.hline(7, 11, 9, GD.d2);
}

// ---------------------------------------------------------------------------
// Hanging vines (anchor at the top)
// ---------------------------------------------------------------------------
function vine(s, h, seed, flowers) {
    const rnd = rng(seed);
    const cx = 2;
    s.oval(0, 0, 5, 3, GM.b);
    s.px(1, 0, GM.l1);
    let side = 1;
    for (let y = 2; y < h - 1; y += 1) {
        const x = cx + Math.round(Math.sin(y / 4) * 1);
        s.px(x, y, VINE_G.d1);
        if (y % 4 === 1) {
            s.px(x + side, y, GL.b);
            s.px(x + 2 * side, y, rnd() > 0.4 ? GL.l1 : GL.b);
            s.px(x + side, y + 1, GL.d1);
            side = -side;
        }
        if (flowers && y % 11 === 7) s.px(x - side, y, '#ff7ab8');
    }
    // curled tip
    const ex = cx + Math.round(Math.sin((h - 1) / 4));
    s.px(ex, h - 1, VINE_G.d1);
    s.px(ex + 1, h - 1, VINE_G.b);
    s.point('grip', ex, h - 2);
}

// ---------------------------------------------------------------------------
// Fern, orchid, banana plant
// ---------------------------------------------------------------------------
/** Arching fern frond: a curved spine with leaflets on both sides. */
function fernFrond(s, pts, R) {
    for (let i = 0; i + 1 < pts.length; i += 1) s.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], R.b);
    for (let i = 1; i < pts.length - 1; i += 1) {
        const [x, y] = pts[i];
        s.px(x, y - 1, R.l1);
        s.px(x, y + 1, R.d1);
    }
}

function fernJungle(s) {
    // 14×10: fronds arching out of the ground like a fountain
    fernFrond(s, [[6, 9], [4, 6], [2, 5], [0, 6]], GD);
    fernFrond(s, [[7, 9], [9, 6], [11, 5], [13, 6]], GD);
    fernFrond(s, [[6, 9], [5, 5], [4, 2], [2, 1]], GM);
    fernFrond(s, [[7, 9], [8, 5], [10, 2], [12, 2]], GM);
    fernFrond(s, [[7, 9], [7, 5], [7, 2], [6, 0]], GL);
    s.px(1, 7, GD.b);
    s.px(12, 7, GD.b);
    s.hline(5, 8, 9, GD.d2);
}

function orchid(s) {
    // 7×8 (about 6×7 drawn): two broad leaves, an arching stem with two open blossoms
    s.map(0, 0, [
        '.PpP...',
        '.pyp...',
        '.PpPPpP',
        '..s.pyp',
        '..s.PpP',
        '...ss..',
        'gGG.GGg',
        '.gggggg'
    ], { p: '#d85ad0', P: '#ffb8ec', y: '#ffe36a', s: '#4f8a3e', g: GM.d1, G: GL.b });
}

function bananaPlant(s) {
    const T = ramp('#8fb04a');
    // pseudo-stem
    s.rect(7, 9, 3, 13, T.b);
    s.vline(7, 9, 21, T.l1);
    s.vline(9, 10, 21, T.d1);
    s.px(8, 14, T.d1);
    s.px(8, 18, T.d1);
    // long leaves, a little torn
    const L = GLOSS;
    s.poly([[8, 9], [0, 4], [0, 7], [5, 10]], L.d1);
    s.poly([[8, 9], [2, 0], [5, 0], [9, 7]], L.b);
    s.poly([[9, 9], [14, 1], [16, 3], [11, 9]], L.b);
    s.line(8, 9, 2, 1, L.l1);
    s.line(9, 9, 14, 2, L.l1);
    s.px(1, 6, null);
    s.px(3, 5, L.l2);
    // a big bunch of bananas curving up, and the purple flower bud below
    s.line(10, 9, 12, 11, '#6a8a3a');
    s.map(9, 10, [
        '..sss..',
        '.LYLYL.',
        'YyYyYyY',
        'YyYyYyY',
        '.YyYyY.',
        '..dYd..',
        '...v...',
        '..vVv..',
        '...v...'
    ], { Y: '#ffd23f', y: '#eaa82c', L: '#fff09a', d: '#8a6a2a', s: '#6a8a3a', v: '#7a3a6a', V: '#b0648e' });
    s.hline(6, 10, 21, T.d2);
    s.point('bananas', 13, 12);
}

// ---------------------------------------------------------------------------
// A friendly mossy stone head, smiling in the jungle. 20×20.
// ---------------------------------------------------------------------------
function stoneHead(s) {
    // head block with rounded corners
    s.ball(1, 2, 18, 18, STONE);
    s.rect(3, 18, 14, 2, STONE.d1);
    // ear plugs on the sides
    s.rect(0, 9, 2, 4, STONE.d1);
    s.rect(18, 9, 2, 4, STONE.d2);
    s.px(0, 9, STONE.b);
    // carved face: brow line, happy closed eyes, round nose, big smile
    s.hline(4, 8, 7, STONE.d1);
    s.hline(11, 15, 7, STONE.d1);
    happyEyeCarved(s, 5, 9);
    happyEyeCarved(s, 12, 9);
    s.rect(9, 9, 2, 4, STONE.l1);
    s.px(9, 12, STONE.d1);
    s.px(10, 12, STONE.d1);
    s.px(5, 13, STONE.d1);
    s.hline(6, 13, 14, STONE.d2);
    s.px(14, 13, STONE.d1);
    s.hline(7, 12, 15, STONE.d1);
    // rosy moss cheeks and cracks
    s.px(4, 11, '#c9a0a8');
    s.px(15, 11, '#c9a0a8');
    s.line(16, 4, 14, 6, STONE.d1);
    s.line(3, 15, 4, 17, STONE.d1);
    // moss cap and a little plant on top
    s.oval(2, 1, 16, 5, MOSS.b);
    s.hline(4, 9, 1, MOSS.l1);
    s.px(3, 5, MOSS.d1);
    s.px(16, 5, MOSS.d1);
    s.px(2, 6, MOSS.b);
    s.px(17, 7, MOSS.b);
    s.px(1, 8, MOSS.d1);
    s.line(11, 1, 12, -1, GL.b);
    s.px(13, 0, GL.l1);
    s.px(12, 0, '#ff7ab8');
    // vines creeping down one side
    s.vline(17, 5, 15, VINE_G.d1);
    s.px(18, 8, GL.b);
    s.px(16, 12, GL.l1);
    s.point('perch', 9, 1);
}

function happyEyeCarved(s, x, y) {
    s.px(x, y + 1, STONE.d2);
    s.px(x + 1, y, STONE.d2);
    s.px(x + 2, y, STONE.d2);
    s.px(x + 3, y + 1, STONE.d2);
}

const prop = (name, w, h, paint, anchor = [Math.floor(w / 2), h - 1]) => ({
    name, sheet: 'props-jungle', w, h, anchor, anims: { idle: [paint] }
});

const PROPS = [
    prop('p-jungletree', 50, 64, jungleTree),
    prop('p-jungletree2', 40, 56, jungleTree2),
    prop('p-palm', 26, 44, palm, [12, 43]),
    prop('p-monstera', 16, 14, (s) => monstera(s, true)),
    prop('p-monstera2', 14, 12, (s) => monstera(s, false)),
    prop('p-bigleaf', 18, 10, bigLeaf, [9, 9]),
    prop('p-vine', 6, 40, (s) => vine(s, 40, 11, false), [2, 0]),
    prop('p-vine2', 5, 30, (s) => vine(s, 30, 23, true), [2, 0]),
    prop('p-fernj', 14, 10, fernJungle, [7, 9]),
    prop('p-orchid', 7, 8, orchid, [3, 7]),
    prop('p-bananas', 17, 22, bananaPlant, [8, 21]),
    prop('p-ruin', 20, 20, stoneHead, [10, 19])
];

// Room for the outline where a drawing reaches the frame edge (ground rows and
// the vines' top attachment stay on the edge on purpose).
pad(monkeyDef, 0, 1, 1, 1, ['walk']);
pad(monkeyDef, 0, 0, 2, 0, ['swing']);
pad(parrotDef, 0, 2, 1, 2, ['idle', 'blink', 'look', 'eat', 'special']);
pad(parrotDef, 1, 1, 2, 1, ['fly']);
pad(toucanDef, 1, 1, 1, 1, ['idle', 'blink', 'look', 'eat', 'fly']);
pad(toucanDef, 1, 2, 1, 2, ['special']);
pad(slothDef, 1, 1, 2, 2);
const chameleons = [chameleonDef('a-chameleon', 'green'), chameleonDef('a-chameleon-pink', 'pink')];
chameleons.forEach((d) => pad(d, 0, 1, 0, 1));
const frogs = [dartFrogDef('a-dartfrog', 'blue'), dartFrogDef('a-dartfrog-red', 'red')];
frogs.forEach((d) => pad(d, 0, 1, 0, 1));
pad(tigerDef, 1, 2, 1, 2, ['idle', 'blink', 'look', 'eat', 'special']);
pad(tigerDef, 0, 2, 0, 2, ['walk']);
pad(tigerDef, 1, 1, 1, 1, ['lie']);
for (const d of PROPS) {
    if (d.name.startsWith('p-vine')) pad(d, 2, 0, 4, 1);
    else if (d.name === 'p-palm') pad(d, 1, 1, 3, 1);
    else if (/p-jungletree|p-ruin/.test(d.name)) pad(d, 1, 2, 2, 2);
    else pad(d, 1, 1, 2, 1);
}

export default [
    monkeyDef, parrotDef, toucanDef, slothDef, ...chameleons,
    morphoDef, ...frogs, tigerDef,
    ...PROPS
];
