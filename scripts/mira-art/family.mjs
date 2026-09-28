/*
 * Mira's family and the summer town (the story's first and last scenes).
 *
 * People (sheet 'family') are built like drawMira in characters.mjs: 2×2 eyes
 * with a sparkle, blush pixels, limbs with a contour where they cross the
 * body, feet on the bottom row, facing right.
 *
 *   alva   Mira's big sister (turning 10): honey-brown wavy hair, blue
 *          patterned snapback, teal t-shirt with a little print, dark shorts
 *   pappa  their dad: short dark-blond hair, black sunglasses, stubble,
 *          navy t-shirt, dark jeans
 *
 * Town props (sheet 'props-town'): a Swedish small town on a warm summer
 * evening, anchored at the bottom centre.
 */
import { Sprite, ramp, alpha, rgba } from './kit.mjs';

const SKIN = { b: '#ffdcc8', d1: '#f4b59c', d2: '#d98d7c', l1: '#fff0e6' };
const EYE = '#27306a';
const BLUSH = '#f8909c';
const MOUTH = '#c7485a';
const MOUTH_D = '#7d2440';
const TONGUE = '#ff8d9d';

// ---------------------------------------------------------------------------
// shared body parts
// ---------------------------------------------------------------------------
/** Arm from shoulder to hand with a contour over the body and a sleeve cap. */
function arm(s, sx, sy, hx, hy, { skin, light = null, contour, sleeve, sleeveLight, sleeveLen = 3, width = 2, hand = 2 }) {
    s.thick(sx, sy, hx, hy, width + 2, contour, { onlyOver: true });
    s.thick(sx, sy, hx, hy, width, skin);
    s.rect(hx - 1, hy - 1, hand, hand, skin);
    if (light) s.px(hx - 1, hy - 1, light);
    // sleeve: a short stretch of the arm from the shoulder
    const len = Math.hypot(hx - sx, hy - sy) || 1;
    const ex = sx + ((hx - sx) / len) * (sleeveLen - 1);
    const ey = sy + ((hy - sy) / len) * (sleeveLen - 1);
    s.thick(sx, sy, Math.round(ex), Math.round(ey), width + 1, sleeve);
    s.px(sx - 1, sy - 1, sleeveLight);
}

function eyes2(s, e1, e2, ey, kind, color = EYE) {
    const open = (x) => {
        s.rect(x, ey, 2, 2, color);
        s.px(x + 1, ey, '#ffffff');
    };
    if (kind === 'open') {
        open(e1);
        open(e2);
    } else if (kind === 'closed') {
        s.hline(e1, e1 + 1, ey + 1, color);
        s.hline(e2, e2 + 1, ey + 1, color);
    } else if (kind === 'happy') {
        s.px(e1, ey + 1, color);
        s.px(e1 + 1, ey, color);
        s.px(e2, ey, color);
        s.px(e2 + 1, ey + 1, color);
    }
}

// ===========================================================================
// ALVA – the big sister
// ===========================================================================
const AW = 28;
const AH = 41;
const A_HAIR = { b: '#c98f55', l1: '#e3b477', l2: '#f3d59c', d1: '#a36a3c', d2: '#7a4a2c' };
const A_SHIRT = { b: '#2aa39b', l1: '#5cc9bd', l2: '#9fe6da', d1: '#1f7d80', d2: '#175c66' };
const A_SHORTS = { b: '#3a3d66', l1: '#52578a', d1: '#2a2c4e', d2: '#1e1f3a' };
const A_CAP = { b: '#3b6fd6', l1: '#6b9bf0', l2: '#a8c8ff', d1: '#2a4fa8', d2: '#1f3a80' };
const A_SHOE = { b: '#f6f2fa', d1: '#d6cce4', accent: '#ff6fa8', sole: '#c8bfd8' };

const ALVA_POSES = {
    idle: [
        { bob: 0, back: [10, 27], front: [18, 27] },
        { bob: 1, back: [10, 27], front: [18, 27] }
    ],
    blink: [{ bob: 0, back: [10, 27], front: [18, 27], eyes: 'closed' }],
    wave: [
        { bob: 0, back: [10, 27], front: [22, 12], mouth: 'open' },
        { bob: 0, back: [10, 27], front: [23, 15], mouth: 'open' }
    ],
    walk: [
        { bob: 0, back: [12, 27], front: [16, 26], legs: [2, -2] },
        { bob: -1, back: [10, 27], front: [18, 27], legs: [0, 0] },
        { bob: 0, back: [9, 26], front: [19, 27], legs: [-2, 2] },
        { bob: -1, back: [10, 27], front: [18, 27], legs: [0, 0] }
    ],
    hug: [{ bob: 0, back: [22, 21], front: [24, 22], eyes: 'happy', mouth: 'open' }],
    laugh: [
        { bob: 0, back: [13, 25], front: [17, 25], eyes: 'happy', mouth: 'open' },
        { bob: 1, back: [13, 25], front: [17, 25], eyes: 'happy', mouth: 'open' }
    ]
};

function alvaHairBack(s, U) {
    const H = A_HAIR;
    const y = 6 + U;
    s.oval(6, y, 14, 12, H.b);
    // long wavy hair falling down the back, curling at the ends
    s.poly([[6, y + 6], [13, y + 6], [13, y + 15], [12, y + 20], [10, y + 22], [8, y + 22], [6, y + 20], [5, y + 15], [5, y + 10]], H.b);
    for (const [x, yy] of [[4, y + 12], [4, y + 13], [5, y + 18], [7, y + 22], [11, y + 22]]) s.px(x, yy, H.b);
    // strands and waves
    s.line(7, y + 8, 6, y + 12, H.d1);
    s.line(6, y + 13, 7, y + 17, H.d1);
    s.line(7, y + 18, 8, y + 21, H.d1);
    s.line(9, y + 10, 10, y + 14, H.d1);
    s.line(10, y + 15, 9, y + 19, H.d1);
    s.line(12, y + 13, 12, y + 18, H.d1);
    s.px(11, y + 21, H.d1);
    s.line(7, y + 2, 9, y + 1, H.l1);
    s.line(6, y + 5, 6, y + 7, H.l1);
    s.line(8, y + 12, 8, y + 16, H.l1);
    s.line(11, y + 16, 11, y + 18, H.l1);
    s.px(9, y + 21, H.l1);
    // lock on the far side of the face
    s.vline(19, y + 5, y + 12, H.d1);
    s.vline(18, y + 11, y + 13, H.b);
}

function alvaFace(s, pose, U) {
    const y = 9 + U;
    s.oval(10, y, 9, 10, SKIN.b);
    s.hline(12, 16, y + 9, SKIN.d1);                               // jaw shade
    s.px(17, y + 8, SKIN.d1);
    s.px(11, y + 3, SKIN.l1);
    // side-swept bangs under the cap
    s.oval(9, y - 2, 11, 4, A_HAIR.b);
    s.px(11, y + 2, A_HAIR.b);
    s.px(14, y + 2, A_HAIR.b);
    s.px(17, y + 2, A_HAIR.b);
    s.px(18, y + 3, A_HAIR.d1);
    s.px(10, y + 2, A_HAIR.d1);
    s.line(11, y, 13, y, A_HAIR.l1);
    s.hline(15, 17, y + 1, A_HAIR.d1);
    // eyes
    const eyes = pose.eyes || 'open';
    const e1 = 12;
    const e2 = 16;
    const ey = y + 4;
    eyes2(s, e1, e2, ey, eyes);
    // cheeks and a warm smile
    s.px(e1 - 1, ey + 2, BLUSH);
    s.px(e2 + 2, ey + 2, BLUSH);
    const my = y + 7;
    const mouth = pose.mouth || 'smile';
    if (mouth === 'smile') {
        s.hline(14, 15, my, MOUTH);
    } else if (mouth === 'open') {
        s.hline(14, 15, my, MOUTH_D);
        s.hline(14, 15, my + 1, TONGUE);
    }
}

function alvaCap(s, U) {
    const C = A_CAP;
    const y = 2 + U;
    // crown
    s.oval(9, y + 1, 12, 8, C.b);
    s.hline(11, 17, y + 1, C.l1);
    s.px(10, y + 2, C.l1);
    s.px(10, y + 3, C.l1);
    s.vline(20, y + 3, y + 6, C.d1);
    // graffiti pattern
    const pat = [[12, y + 2, '#a8f0ff'], [13, y + 3, '#ffffff'], [15, y + 2, '#ff7ab8'], [16, y + 3, '#ffe066'], [17, y + 2, '#a8f0ff'], [14, y + 4, '#ff7ab8'], [18, y + 4, '#ffffff'], [12, y + 5, '#ffe066'], [16, y + 5, '#a8f0ff']];
    for (const [x, yy, c] of pat) s.px(x, yy, c);
    s.px(15, y + 1, C.l2);                                         // button on top
    // band and the flat snapback brim
    s.hline(9, 20, y + 7, C.d1);
    s.rect(17, y + 7, 9, 2, C.d2);
    s.hline(17, 25, y + 7, C.d1);
    s.hline(18, 24, y + 7, C.b);
}

function alvaShirt(s, U) {
    const T = A_SHIRT;
    const y = 20 + U;
    s.rect(13, y - 1, 3, 1, SKIN.d1);                               // neck
    s.rect(11, y, 8, 8, T.b);
    s.px(11, y + 7, T.d1);
    s.vline(11, y, y + 6, T.l1);
    s.vline(18, y + 1, y + 7, T.d1);
    s.hline(12, 17, y, T.l1);
    s.hline(13, 15, y, T.d1);                                      // collar
    s.hline(11, 18, y + 7, T.d1);                                  // hem
    // tiny print: "LOS ANGELES" and three little figures
    s.hline(13, 16, y + 2, '#e8fffb');
    s.px(13, y + 4, '#ffd08a');
    s.px(15, y + 4, '#ffffff');
    s.px(16, y + 4, '#c98f55');
    s.px(13, y + 5, '#5a4a6a');
    s.px(15, y + 5, '#5a4a6a');
    s.px(16, y + 5, '#5a4a6a');
}

function alvaFeet(s, x, y, front) {
    const sock = front ? '#ffffff' : '#e4def0';
    s.px(x + 1, y, front ? SKIN.b : SKIN.d1);
    s.px(x + 2, y, front ? SKIN.b : SKIN.d1);
    s.hline(x + 1, x + 2, y + 1, sock);
    s.rect(x + 1, y + 2, 5, 2, front ? A_SHOE.b : A_SHOE.d1);
    s.px(x + 3, y + 2, A_SHOE.accent);
    s.px(x + 4, y + 3, A_SHOE.accent);
    s.hline(x + 1, x + 5, y + 4, A_SHOE.sole);
}

function alvaLegs(s, pose, U) {
    const [fo, bo] = pose.legs || [0, 0];
    const top = 28 + U;
    const footY = 36;
    // shorts
    const P = A_SHORTS;
    s.rect(11, top - 1, 8, 3, P.b);
    s.hline(11, 18, top - 1, P.d1);
    s.rect(11 + Math.min(0, bo), top + 1, 3, 2, P.d1);
    s.rect(15 + Math.max(0, fo) - 1, top + 1, 4, 2, P.b);
    s.px(12, top, P.l1);
    // legs
    s.rect(12 + bo, top + 3, 2, footY - top - 3, SKIN.d1);
    s.rect(15 + fo, top + 3, 2, footY - top - 3, SKIN.b);
    alvaFeet(s, 11 + bo, footY, false);
    alvaFeet(s, 14 + fo, footY, true);
}

function drawAlva(s, pose) {
    const U = pose.bob || 0;
    const sleeveBack = { sleeve: A_SHIRT.d1, sleeveLight: A_SHIRT.b };
    const sleeveFront = { sleeve: A_SHIRT.b, sleeveLight: A_SHIRT.l1 };
    const [bx, by] = pose.back;
    arm(s, 12, 21 + U, bx, by + U, { skin: SKIN.d1, contour: SKIN.d2, ...sleeveBack });
    alvaHairBack(s, U);
    alvaLegs(s, pose, U);
    alvaShirt(s, U);
    alvaFace(s, pose, U);
    alvaCap(s, U);
    const [fx, fy] = pose.front;
    arm(s, 17, 21 + U, fx, fy + U, { skin: SKIN.b, light: SKIN.l1, contour: SKIN.d2, ...sleeveFront });
    s.point('head', 15, 3 + U);
    s.point('hand', fx, fy + U);
}

const alvaDef = {
    name: 'alva',
    sheet: 'family',
    w: AW,
    h: AH,
    anchor: [14, AH - 1],
    anims: Object.fromEntries(Object.entries(ALVA_POSES).map(([k, frames]) => [k, frames.map((p) => (s) => drawAlva(s, p))]))
};

// ===========================================================================
// PAPPA – their dad
// ===========================================================================
const PW = 34;
const PH = 55;
const P_HAIR = { b: '#b8905a', l1: '#d6b27a', l2: '#ecd3a0', d1: '#8e6a3e', d2: '#6a4a2c' };
const P_SHIRT = { b: '#2f4290', l1: '#4a60b4', l2: '#6f86d4', d1: '#243270', d2: '#1a2452' };
const P_JEANS = { b: '#3a4262', l1: '#525c82', d1: '#2c3350', d2: '#20263c' };
const P_SHOE = { b: '#4a4a5e', l1: '#6a6a82', d1: '#34344a', sole: '#e8e4f0' };
const STUBBLE = '#e6b8a2';
const STUBBLE_D = '#d4a28e';
const LENS = '#1d1826';

// hands are absolute frame coordinates (before the bob)
const PAPPA_POSES = {
    idle: [
        { bob: 0, back: [10, 33], front: [24, 33] },
        { bob: 1, back: [10, 33], front: [24, 33] }
    ],
    blink: [{ bob: 0, back: [10, 33], front: [24, 33], tilt: true }],
    wave: [
        { bob: 0, back: [10, 33], front: [29, 11], mouth: 'open' },
        { bob: 0, back: [10, 33], front: [30, 15], mouth: 'open' }
    ],
    walk: [
        { bob: 0, back: [14, 33], front: [20, 32], legs: [3, -3] },
        { bob: -1, back: [10, 33], front: [24, 33], legs: [0, 0] },
        { bob: 0, back: [8, 32], front: [26, 32], legs: [-3, 3] },
        { bob: -1, back: [10, 33], front: [24, 33], legs: [0, 0] }
    ],
    laugh: [
        { bob: 0, back: [15, 30], front: [21, 30], mouth: 'laugh', head: -1 },
        { bob: 1, back: [15, 30], front: [21, 30], mouth: 'laugh', head: -1 }
    ]
};

function pappaHead(s, pose, U) {
    const y = 4 + U + (pose.head || 0);
    // ear at the back of the head
    s.oval(10, y + 5, 3, 4, SKIN.d1);
    s.px(11, y + 6, SKIN.d2);
    // face
    s.oval(11, y, 12, 12, SKIN.b);
    s.px(12, y + 4, SKIN.l1);
    s.hline(14, 20, y + 11, SKIN.d1);                             // jaw shade
    s.px(21, y + 10, SKIN.d1);
    // light stubble along the jaw and chin
    for (const [x, yy] of [[13, y + 9], [14, y + 10], [16, y + 11], [18, y + 11], [20, y + 10], [15, y + 10], [19, y + 10], [17, y + 10]]) s.px(x, yy, STUBBLE);
    for (const [x, yy] of [[15, y + 11], [17, y + 11], [19, y + 11]]) s.px(x, yy, STUBBLE_D);
    // short dark-blond hair with a soft quiff swept to the right
    const H = P_HAIR;
    s.oval(10, y - 4, 14, 7, H.b);
    s.rect(11, y, 2, 4, H.b);                                     // sideburn
    s.px(12, y + 4, H.d1);
    s.poly([[13, y - 1], [20, y - 4], [24, y - 3], [23, y], [19, y], [15, y + 1]], H.b);
    s.line(13, y - 3, 17, y - 4, H.l1);
    s.line(18, y - 4, 22, y - 3, H.l1);
    s.px(15, y - 2, H.l2);
    s.px(20, y - 3, H.l2);
    s.line(15, y, 22, y - 1, H.d1);
    s.px(23, y - 1, H.d1);
    s.vline(11, y - 2, y, H.d1);
    s.px(14, y - 1, H.d1);
    // black sunglasses
    const gy = y + 4;
    s.rect(14, gy, 3, 3, LENS);
    s.rect(19, gy, 3, 3, LENS);
    s.hline(16, 19, gy, LENS);
    s.line(13, gy, 12, gy + 1, LENS);
    s.px(14, gy, '#77769a');
    s.px(19, gy, '#77769a');
    s.px(15, gy + 1, '#3c3450');
    s.px(20, gy + 1, '#3c3450');
    // a kind smile
    const my = y + 9;
    const mouth = pose.mouth || 'smile';
    if (mouth === 'smile') {
        s.px(16, my - 1, MOUTH);
        s.hline(17, 19, my, MOUTH);
        s.px(20, my - 1, MOUTH);
    } else if (mouth === 'open') {
        s.hline(16, 20, my - 1, MOUTH_D);
        s.hline(17, 19, my, MOUTH_D);
        s.px(18, my, TONGUE);
    } else if (mouth === 'laugh') {
        s.hline(16, 20, my - 1, '#ffffff');
        s.hline(16, 20, my, MOUTH_D);
        s.hline(17, 19, my + 1, TONGUE);
    }
    // cheeks
    s.px(13, y + 8, alpha(BLUSH, 0.7));
    s.px(22, y + 8, alpha(BLUSH, 0.7));
}

function pappaShirt(s, U) {
    const T = P_SHIRT;
    const y = 18 + U;
    s.rect(14, y - 2, 6, 2, SKIN.d1);                              // neck
    s.poly([[9.5, y + 2], [11, y], [23, y], [24.5, y + 2], [23.5, y + 15], [10.5, y + 15]], T.b);
    s.line(10, y + 2, 11, y + 14, T.l1);
    s.line(24, y + 2, 23, y + 14, T.d1);
    s.hline(12, 22, y, T.l1);
    s.hline(15, 19, y, T.d1);                                      // crew neck
    s.px(14, y, T.d1);
    s.px(20, y, T.d1);
    s.hline(11, 23, y + 14, T.d1);                                 // hem
    s.line(19, y + 4, 21, y + 9, T.d1);                            // a fold
}

function pappaFeet(s, x, y, front) {
    const c = P_SHOE;
    s.rect(x, y, 5, 2, front ? c.b : c.d1);
    s.rect(x + 1, y + 2, 6, 1, front ? c.b : c.d1);
    s.hline(x, x + 3, y, front ? c.l1 : c.b);
    s.px(x + 4, y + 1, '#ffffff');
    s.hline(x, x + 6, y + 3, front ? c.sole : '#c8c2d4');
}

function pappaLegs(s, pose, U) {
    const [fo, bo] = pose.legs || [0, 0];
    const J = P_JEANS;
    const hip = 33 + U;
    const footY = 50;
    // belt and hips
    s.rect(11, hip, 13, 4, J.b);
    s.hline(11, 23, hip, '#4a3a3a');
    s.px(18, hip, '#d8c890');
    // back leg, then front leg, as tapered columns from the hip to the ankle
    const leg = (x0, dx, c, light) => {
        s.poly([[x0, hip + 3], [x0 + 5, hip + 3], [x0 + 5 + dx, footY], [x0 + dx, footY]], c);
        if (light) s.line(x0 + 1, hip + 4, x0 + 1 + dx, footY - 1, J.l1);
    };
    leg(12, bo, J.d1, false);
    leg(17, fo, J.b, true);
    s.line(17, hip + 4, 17 + fo, footY - 1, J.d2);
    pappaFeet(s, 12 + bo, footY + 1, false);
    pappaFeet(s, 17 + fo, footY + 1, true);
}

function drawPappaBody(s, pose) {
    const U = pose.bob || 0;
    const sleeveBack = { sleeve: P_SHIRT.d1, sleeveLight: P_SHIRT.b };
    const [bx, by] = pose.back;
    arm(s, 12, 20 + U, bx, by + U, { skin: SKIN.d1, contour: SKIN.d2, ...sleeveBack, sleeveLen: 5, width: 3, hand: 3 });
    pappaLegs(s, pose, U);
    pappaShirt(s, U);
    return U;
}

function drawPappa(s, pose) {
    const U = drawPappaBody(s, pose);
    if (pose.tilt) {
        // no eyes to blink behind the sunglasses: a tiny friendly head tilt
        const hs = new Sprite(s.w, s.h);
        pappaHead(hs, pose, U);
        for (let x = 0; x < s.w; x += 1) {
            const dy = x >= 17 ? 1 : 0;
            for (let y = s.h - 1; y >= 0; y -= 1) {
                const c = hs.get(x, y);
                if (c[3]) s.px(x, y + dy, c);
            }
        }
    } else {
        pappaHead(s, pose, U);
    }
    const [fx, fy] = pose.front;
    arm(s, 22, 20 + U, fx, fy + U, { skin: SKIN.b, light: SKIN.l1, contour: SKIN.d2, sleeve: P_SHIRT.b, sleeveLight: P_SHIRT.l1, sleeveLen: 5, width: 3, hand: 3 });
    s.point('head', 17, U + (pose.head || 0));
    s.point('hand', fx, fy + U);
}

/** Paint on a scratch sprite and stamp it dy px lower (points follow), leaving air above the hair. */
function lowered(paint, dy) {
    return (s) => {
        const t = new Sprite(s.w, s.h);
        paint(t);
        s.stamp(t, 0, dy);
        for (const [k, [x, y]] of Object.entries(t.points)) s.point(k, x, y + dy);
    };
}

const pappaDef = {
    name: 'pappa',
    sheet: 'family',
    w: PW,
    h: PH + 2,
    anchor: [17, PH + 1],
    anims: Object.fromEntries(Object.entries(PAPPA_POSES).map(([k, frames]) => [k, frames.map((p) => lowered((s) => drawPappa(s, p), 2))]))
};

// ===========================================================================
// THE SUMMER TOWN – props on sheet 'props-town'
// ===========================================================================
const WOOD = ramp('#b8763e');
const IRON = { b: '#2f2b40', l1: '#4b4764', d1: '#211d30' };
const WHITE = { b: '#f6f1ea', l1: '#ffffff', d1: '#d9d0cc', d2: '#b8aeb0' };
const GLASS = { b: '#ffdf8e', l1: '#fff2c4', d1: '#e8b45e', frame: '#f6f1ea' };

/** Local rim shading on everything drawn in `base`: light top, shade bottom/right. */
function rim(s, R, o = {}) {
    const { top = 1, bottom = 1, right = 1 } = o;
    const key = rgba(R.b).join(',');
    const op = (x, y) => s.opaque(x, y);
    const todo = [];
    for (let y = 0; y < s.h; y += 1) {
        for (let x = 0; x < s.w; x += 1) {
            if (!op(x, y) || s.get(x, y).join(',') !== key) continue;
            let up = 1;
            while (up <= top && op(x, y - up)) up += 1;
            let dn = 1;
            while (dn <= bottom && op(x, y + dn)) dn += 1;
            let rt = 1;
            while (rt <= right && op(x + rt, y)) rt += 1;
            if (dn <= bottom) todo.push([x, y, R.d1]);
            else if (rt <= right) todo.push([x, y, R.d1]);
            else if (up <= top) todo.push([x, y, R.l1]);
        }
    }
    for (const [x, y, c] of todo) s.px(x, y, c);
}

// --- park bench, seen from the front ------------------------------------------
function bench(s) {
    const G = s.h - 1;
    const x0 = 2;
    const x1 = s.w - 3;
    // iron ends: back posts, curly armrests, bowed legs
    for (const [x, dir] of [[x0 + 1, -1], [x1 - 1, 1]]) {
        s.vline(x, 1, G - 3, IRON.b);
        s.px(x, 1, IRON.l1);
        s.line(x, G - 3, x + dir * 2, G, IRON.b);             // splayed leg
        s.line(x, G - 3, x - dir, G, IRON.b);
        s.hline(x - 1, x + 1, 7, IRON.b);                      // armrest
        s.px(x + dir * 2, 7, IRON.b);
        s.px(x + dir * 2, 8, IRON.b);
        s.px(x + dir, 9, IRON.b);
        s.px(x - 1, 7, IRON.l1);
    }
    // wooden back slats
    for (const y of [2, 5]) {
        s.rect(x0 + 1, y, x1 - x0 - 1, 2, WOOD.b);
        s.hline(x0 + 1, x1 - 1, y, WOOD.l1);
        s.hline(x0 + 1, x1 - 1, y + 1, WOOD.b);
    }
    // seat: top surface and front edge
    s.rect(x0, 9, x1 - x0 + 1, 3, WOOD.b);
    s.hline(x0, x1, 9, WOOD.l1);
    s.hline(x0 + 1, x1 - 1, 10, WOOD.b);
    s.hline(x0, x1, 11, WOOD.d1);
    // wood grain and plank ends
    for (const [x, y] of [[8, 3], [19, 6], [27, 3], [13, 10], [24, 10], [6, 10]]) s.px(x, y, WOOD.d1);
    // iron braces under the seat
    s.hline(x0 + 1, x0 + 3, 12, IRON.b);
    s.hline(x1 - 3, x1 - 1, 12, IRON.b);
    // where Mira's sitting anchor goes: her bottom on the seat, left of centre
    s.point('seat', 13, 9);
}

// --- wooden houses -------------------------------------------------------------
function window4(s, x, y, w, h, { box = false } = {}) {
    // white frame, four warm lit panes, a sill
    s.rect(x, y, w, h, WHITE.b);
    s.rect(x + 1, y + 1, w - 2, h - 2, GLASS.b);
    s.hline(x + 1, x + w - 2, y + 1, GLASS.l1);
    s.px(x + 1, y + 2, GLASS.l1);
    s.vline(x + Math.floor(w / 2), y + 1, y + h - 2, WHITE.b);
    s.hline(x + 1, x + w - 2, y + Math.floor(h / 2), WHITE.b);
    s.hline(x + 1, x + w - 2, y + h - 2, GLASS.d1);
    s.hline(x - 1, x + w, y + h, WHITE.b);
    s.hline(x - 1, x + w, y + h + 1, WHITE.d1);
    if (box) {
        // a window box with red geraniums
        s.rect(x - 1, y + h + 1, w + 2, 2, '#8a5a3a');
        for (let i = 0; i < w + 2; i += 2) {
            s.px(x - 1 + i, y + h, '#e0394a');
            s.px(x + i, y + h, '#4f9a3c');
        }
    }
}

function door(s, x, y, w, h, R) {
    s.rect(x, y, w, h, WHITE.b);
    s.rect(x + 1, y + 1, w - 2, h - 1, R.b);
    s.vline(x + 1, y + 1, y + h - 1, R.l1);
    s.rect(x + 2, y + 2, w - 4, 3, GLASS.b);
    s.px(x + 2, y + 2, GLASS.l1);
    s.rect(x + 2, y + 7, w - 4, h - 9, R.d1);
    s.px(x + w - 3, y + Math.floor(h / 2) + 1, '#e8c86a');   // handle
}

function planks(s, x0, x1, y0, y1, R, step = 3) {
    for (let y = y0 + step - 1; y <= y1; y += step) {
        s.hline(x0, x1, y, R.d1);
        for (let x = x0 + ((y * 7) % 11); x <= x1; x += 13) s.px(x, y - 1, R.l1);
    }
}

function redHouse(s) {
    const G = s.h - 1;
    const R = { b: '#a8362c', l1: '#c24a3a', d1: '#8a2a26', d2: '#6a1e22' };
    const roof = { b: '#3e3650', l1: '#5a5070', d1: '#2c2640' };
    const wx0 = 4;
    const wx1 = s.w - 5;
    const top = 13;
    // chimney
    s.rect(40, 1, 5, 9, '#8a3a34');
    s.rect(39, 0, 7, 2, '#5a4a5a');
    s.vline(40, 2, 9, '#a4504a');
    // roof: a long saddle roof with tiles
    s.poly([[wx0 - 3, top + 1], [wx0 + 4, 3], [wx1 - 4, 3], [wx1 + 3, top + 1]], roof.b);
    for (let y = 5; y <= top; y += 3) s.hline(wx0 + 2, wx1 - 2, y, roof.d1);
    s.hline(wx0 + 4, wx1 - 4, 3, roof.l1);
    s.hline(wx0 - 3, wx1 + 3, top + 1, WHITE.d1);
    // walls with horizontal panelling
    s.rect(wx0, top + 2, wx1 - wx0 + 1, G - top - 3, R.b);
    planks(s, wx0 + 2, wx1 - 2, top + 2, G - 3, R);
    // white corner boards and eaves
    s.rect(wx0, top + 2, 2, G - top - 3, WHITE.b);
    s.rect(wx1 - 1, top + 2, 2, G - top - 3, WHITE.d1);
    s.hline(wx0, wx1, top + 2, WHITE.b);
    // stone foundation
    s.rect(wx0 - 1, G - 1, wx1 - wx0 + 3, 2, '#8a8494');
    s.hline(wx0 - 1, wx1 + 1, G - 1, '#a8a2b2');
    for (let x = wx0; x < wx1; x += 5) s.px(x, G, '#6a6478');
    // windows: two storeys
    for (const x of [9, 20, 33, 44]) window4(s, x, top + 5, 6, 8);
    for (const x of [9, 20, 44]) window4(s, x, top + 18, 6, 8, { box: x === 9 });
    // front door with a little porch roof and steps
    door(s, 32, G - 13, 8, 12, { b: '#f6f1ea', l1: '#ffffff', d1: '#d9d0cc' });
    s.poly([[30, G - 13], [36, G - 17], [42, G - 13]], WHITE.b);
    s.hline(30, 42, G - 13, WHITE.d1);
    s.rect(31, G - 1, 10, 2, '#b0aabc');
    s.hline(31, 40, G - 1, '#cbc6d6');
}

function paleHouse(s) {
    const G = s.h - 1;
    const R = { b: '#f3d6ca', l1: '#fce8de', d1: '#ddb7ac', d2: '#c09a94' };
    const roof = { b: '#8a4a4a', l1: '#a86060', d1: '#6a3638' };
    const cx = Math.floor(s.w / 2);
    const wx0 = 5;
    const wx1 = s.w - 6;
    const eave = 16;
    // gable roof facing us
    s.poly([[wx0 - 4, eave + 1], [cx, 0], [wx1 + 4, eave + 1]], roof.b);
    for (let y = 3; y <= eave; y += 3) {
        const half = Math.round(((y) / (eave + 1)) * (cx - wx0 + 4));
        s.hline(cx - half + 1, cx + half - 1, y, roof.d1);
    }
    s.line(cx, 0, wx0 - 4, eave + 1, roof.l1);
    // gable wall inside the roof, with white trim
    s.poly([[wx0 + 1, eave + 1], [cx, 5], [wx1 - 1, eave + 1]], R.b);
    s.line(cx, 5, wx0 + 1, eave + 1, WHITE.b);
    s.line(cx, 5, wx1 - 1, eave + 1, WHITE.b);
    // round window in the gable
    s.circle(cx, 11, 2, WHITE.b);
    s.circle(cx, 11, 1, GLASS.b);
    s.px(cx, 11, GLASS.l1);
    // walls
    s.rect(wx0, eave + 2, wx1 - wx0 + 1, G - eave - 3, R.b);
    planks(s, wx0 + 2, wx1 - 2, eave + 2, G - 3, R);
    s.hline(wx0 - 4, wx1 + 4, eave + 1, WHITE.b);
    s.rect(wx0, eave + 2, 2, G - eave - 3, WHITE.b);
    s.rect(wx1 - 1, eave + 2, 2, G - eave - 3, WHITE.d1);
    // decorative fretwork under the eaves
    for (let x = wx0 + 2; x < wx1 - 1; x += 3) s.px(x, eave + 2, WHITE.d1);
    // windows and a door
    window4(s, 9, eave + 6, 7, 9, { box: true });
    window4(s, 40, eave + 6, 7, 9, { box: true });
    door(s, 24, G - 14, 8, 13, { b: '#6fa8a0', l1: '#8cc4ba', d1: '#4f8880' });
    s.hline(22, 33, G - 15, WHITE.b);
    // foundation and steps
    s.rect(wx0 - 1, G - 1, wx1 - wx0 + 3, 2, '#8a8494');
    s.hline(wx0 - 1, wx1 + 1, G - 1, '#a8a2b2');
    s.rect(23, G - 1, 10, 2, '#b0aabc');
    s.hline(23, 32, G - 1, '#cbc6d6');
}

// --- street lamp, fence, hedge, tree ---------------------------------------
const lampGlow = alpha('#ffd98a', 0.34);
const lampGlowFaint = alpha('#ffe2a4', 0.16);
const LAMP_GLOW_KEYS = new Set([lampGlow, lampGlowFaint].map((c) => rgba(c).slice(0, 3).join(',')));

/** Soft round glow: pixels within r of (cx, cy) at least 2 steps from the drawing. */
function glowAround(s, cx, cy, r, inner, outer) {
    const todo = [];
    for (let y = cy - r; y <= cy + r; y += 1) {
        for (let x = cx - r; x <= cx + r; x += 1) {
            const d = Math.hypot(x - cx, y - cy);
            if (d > r || s.opaque(x, y)) continue;
            let near = false;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (s.opaque(x + dx, y + dy)) near = true;
            if (!near) todo.push([x, y, d < r * 0.6 ? inner : outer]);
        }
    }
    for (const [x, y, c] of todo) s.px(x, y, c);
}

function lamp(s) {
    const G = s.h - 1;
    const cx = Math.floor(s.w / 2);
    const key = { i: IRON.b, l: IRON.l1, d: IRON.d1, g: GLASS.b, G: GLASS.l1, o: GLASS.d1 };
    // lantern with a finial, a tapered lit glass and a bracket
    s.map(cx - 3, 0, [
        '...l...',
        '..iii..',
        '.liiii.',
        'iiiiiii',
        '.iGGgi.',
        '.iGggi.',
        '.igggi.',
        '..ioi..',
        '..iii..',
        '...i...'
    ], key);
    // post with a ring, a flared foot
    s.vline(cx, 10, G - 4, IRON.b);
    s.vline(cx + 1, 11, G - 5, IRON.d1);
    s.hline(cx - 1, cx + 1, 13, IRON.b);
    s.px(cx - 1, 13, IRON.l1);
    s.map(cx - 2, G - 4, [
        '.lii.',
        '.iid.',
        'liiid',
        'iiiid',
        'iiiid'
    ], key);
    // warm evening glow round the lantern, kept outside the outline ring
    glowAround(s, cx, 5, 6, lampGlow, lampGlowFaint);
    s.point('light', cx, 5);
}

function townFence(s) {
    // drawn without the automatic outline (the iron is dark already), so the
    // gaps between the bars stay open; rails run across the whole tile so
    // segments join up seamlessly (period 4 px, tile 24 px)
    const G = s.h - 1;
    s.hline(0, s.w - 1, 3, IRON.b);
    s.hline(0, s.w - 1, G - 1, IRON.b);
    s.hline(0, s.w - 1, G - 2, IRON.d1);
    for (let x = 1; x < s.w; x += 4) {
        s.vline(x, 1, G, IRON.b);
        s.px(x, 0, IRON.l1);                                   // spear tip
        s.px(x - 1, 1, IRON.d1);
        s.px(x + 1, 1, IRON.d1);
        s.px(x, 1, IRON.l1);
        // a little curl between the bars
        s.px(x + 2, 5, IRON.b);
        s.px(x + 2, 6, IRON.d1);
    }
}

function hedge(s) {
    const G = s.h - 1;
    const R = ramp('#4f9a3c');
    const h = new Sprite(s.w, s.h);
    h.rect(1, 2, s.w - 2, G - 1, R.b);
    h.rect(2, 1, s.w - 4, 1, R.b);
    rim(h, R, { top: 1, bottom: 2, right: 1 });
    // leafy texture
    for (let y = 2; y < G - 1; y += 2) {
        for (let x = 2 + (y % 4 === 0 ? 1 : 0); x < s.w - 2; x += 3) {
            h.px(x, y, (x + y) % 5 === 0 ? R.l2 : R.l1);
            h.px(x + 1, y + 1, R.d1);
        }
    }
    s.stamp(h, 0, 0);
}

function townTree(s) {
    const G = s.h - 1;
    const bark = ramp('#7a5238');
    const leaf = ramp('#5aa640');
    // trunk and roots
    const t = new Sprite(s.w, s.h);
    t.poly([[17, G + 1], [19, G - 4], [19, G - 18], [24, G - 18], [24, G - 4], [27, G + 1]], bark.b);
    t.thick(21, G - 16, 14, G - 24, 2, bark.b);
    t.thick(22, G - 16, 29, G - 25, 2, bark.b);
    rim(t, bark, { top: 0, bottom: 0, right: 1 });
    t.vline(20, G - 16, G - 3, bark.l1);
    s.stamp(t, 0, 0);
    // crown: overlapping leafy clumps, shaded as one mass
    const c = new Sprite(s.w, s.h);
    const clumps = [[3, 14, 16, 14], [25, 14, 17, 14], [8, 4, 16, 15], [21, 3, 16, 15], [13, 11, 20, 16], [2, 22, 14, 10], [29, 22, 13, 10], [14, 0, 14, 10]];
    for (const [x, y, w, hh] of clumps) c.oval(x, y, w, hh, leaf.b);
    rim(c, leaf, { top: 1, bottom: 2, right: 1 });
    // clump edges and sunny highlights
    for (const [x, y, w] of clumps) {
        c.hline(x + 3, x + w - 5, y + 1, leaf.l1);
        c.px(x + 4, y + 2, leaf.l2);
        c.px(x + 5, y + 2, leaf.l2);
    }
    for (const [x, y] of [[10, 18], [30, 17], [18, 22], [24, 9], [7, 12], [35, 25], [14, 28]]) {
        c.px(x, y, leaf.d1);
        c.px(x + 1, y, leaf.d1);
        c.px(x, y + 1, leaf.d2);
    }
    s.stamp(c, 0, 0);
}

const townProp = (name, w, h, paint, extra = {}) => ({
    name,
    sheet: 'props-town',
    w,
    h,
    anchor: [Math.floor(w / 2), h - 1],
    anims: { idle: [paint] },
    ...extra
});

const townProps = [
    townProp('p-bench', 36, 16, bench),
    townProp('p-house-red', 58, 46, redHouse),
    townProp('p-house-pale', 60, 44, paleHouse),
    townProp('p-lamp', 15, 34, lamp, { outlineOptions: { skip: (r, g, b) => LAMP_GLOW_KEYS.has(`${r},${g},${b}`) } }),
    townProp('p-townfence', 24, 10, townFence, { outline: false }),
    townProp('p-hedge', 30, 12, hedge),
    townProp('p-towntree', 44, 50, townTree)
];

export default [alvaDef, pappaDef, ...townProps];
