/*
 * The heroes: Mira (three outfits from her photos) and Nova, the lost tiger
 * cub. Everything faces right; feet sit on the bottom row of the frame.
 *
 * Mira's outfits
 *   a  "Fisketuren"   green bucket hat, blue dress, green rubber boots
 *   b  "Gondolen"     red cap with an A, white dress with butterflies
 *   c  "Sommarkväll"  sunglasses, pink flowery dress, green sandals
 */
import { ramp } from './kit.mjs';

// ===========================================================================
// MIRA
// ===========================================================================
const W = 24;
const H = 34;

const HAIR = { b: '#f4cf6a', l1: '#ffe79c', l2: '#fff6cf', d1: '#d9a24a', d2: '#b07a30' };
const SKIN = { b: '#ffdcc8', d1: '#f4b59c', d2: '#d98d7c', l1: '#fff0e6' };
const EYE = '#27306a';
const BLUSH = '#f8909c';
const MOUTH = '#c7485a';

const OUTFITS = {
    a: {
        dress: ramp('#4a72c4'),
        hem: '#a3c0f2',
        boots: ramp('#4f9150'),
        bootDots: '#dcef9f',
        hat: 'bucket'
    },
    b: {
        dress: { b: '#fbf7f2', l1: '#ffffff', l2: '#ffffff', d1: '#d8d0e4', d2: '#aea4c2' },
        hem: '#ffffff',
        butterflies: ['#ff6fb5', '#4fb0ff', '#ffc933', '#a877ff'],
        boots: ramp('#f06fa0'),
        bootDots: '#ffffff',
        shoes: 'sneakers',
        hat: 'cap'
    },
    c: {
        dress: ramp('#f4a1c6'),
        hem: '#ffd3e7',
        flowers: ['#ffffff', '#ff5f95', '#fff27a'],
        boots: ramp('#7fb87a'),
        shoes: 'sandals',
        hat: 'sunglasses'
    }
};

// Poses. Hands are absolute frame coordinates (before the body offsets).
// bob moves the upper body (breathing), lift moves everything (jumping).
const POSES = {
    idle: [
        { bob: 0, back: [9, 24], front: [16, 24] },
        { bob: 1, back: [9, 24], front: [16, 24] }
    ],
    blink: [{ bob: 0, back: [9, 24], front: [16, 24], eyes: 'closed' }],
    walk: [
        { bob: 0, back: [11, 24], front: [15, 23], legs: [2, -2] },
        { bob: -1, back: [9, 24], front: [16, 24], legs: [0, 0] },
        { bob: 0, back: [8, 23], front: [17, 24], legs: [-2, 2] },
        { bob: -1, back: [9, 24], front: [16, 24], legs: [0, 0] }
    ],
    camera: [
        { bob: 0, back: [15, 14], front: [20, 14], camera: 'up' },
        { bob: 0, back: [15, 14], front: [20, 14], camera: 'flash', eyes: 'wink' }
    ],
    cheer: [
        { lift: -2, back: [3, 9], front: [20, 10], eyes: 'happy', mouth: 'open' },
        { lift: -3, back: [2, 8], front: [21, 9], eyes: 'happy', mouth: 'open' }
    ],
    throw: [
        { bob: 0, back: [9, 24], front: [11, 13], hold: true },
        { bob: -1, back: [9, 24], front: [20, 13], hold: true, mouth: 'open' },
        { bob: 0, back: [9, 24], front: [20, 20] }
    ],
    flute: [
        { bob: 0, back: [17, 16], front: [20, 17], flute: true, eyes: 'closed' },
        { bob: 1, back: [17, 16], front: [20, 17], flute: true, eyes: 'closed' }
    ],
    bubbles: [
        { bob: 0, back: [9, 24], front: [17, 15], wand: true, mouth: 'o' },
        { bob: 0, back: [9, 24], front: [17, 15], wand: true, mouth: 'blow' }
    ],
    wave: [
        { bob: 0, back: [9, 24], front: [20, 10], mouth: 'open' },
        { bob: 0, back: [9, 24], front: [21, 12], mouth: 'open' }
    ],
    point: [{ bob: 0, back: [9, 24], front: [22, 17], mouth: 'open' }],
    surprised: [{ lift: -1, back: [9, 15], front: [18, 15], mouth: 'o', eyes: 'wide' }],
    laugh: [
        { bob: 0, back: [12, 22], front: [16, 22], eyes: 'happy', mouth: 'open' },
        { bob: 1, back: [12, 22], front: [16, 22], eyes: 'happy', mouth: 'open' }
    ],
    sad: [{ bob: 1, back: [10, 24], front: [15, 24], eyes: 'sad', mouth: 'flat' }],
    sit: [
        { bob: 5, back: [10, 27], front: [17, 21], sit: true, cone: true },
        { bob: 5, back: [10, 27], front: [16, 18], sit: true, cone: true, mouth: 'open' }
    ],
    cast: [
        { bob: 0, back: [12, 15], front: [13, 14], rod: true },
        { bob: -1, back: [18, 17], front: [20, 16], rod: true, mouth: 'open' },
        { bob: 0, back: [17, 20], front: [19, 19], rod: true }
    ],
    reel: [
        { bob: 0, back: [16, 21], front: [19, 19], rod: true },
        { bob: 0, back: [17, 20], front: [19, 20], rod: true }
    ],
    holdfish: [
        { lift: 0, back: [13, 20], front: [19, 20], eyes: 'happy', mouth: 'open', fish: true },
        { lift: -1, back: [13, 19], front: [19, 19], eyes: 'happy', mouth: 'open', fish: true }
    ],
    hug: [{ bob: 0, back: [18, 20], front: [21, 19], eyes: 'happy' }]
};

function arm(s, sx, sy, hx, hy, { skin, light, contour, sleeve, sleeveLight }) {
    // contour first (only over the body), then the limb, then the sleeve cap
    s.thick(sx, sy, hx, hy, 4, contour, { onlyOver: true });
    s.thick(sx, sy, hx, hy, 2, skin);
    s.rect(hx - 1, hy - 1, 2, 2, skin);
    if (light) s.px(hx - 1, hy - 1, light);
    s.rect(sx - 1, sy - 1, 3, 3, sleeve);
    s.px(sx - 1, sy - 1, sleeveLight);
}

function feet(s, o, x, y, front) {
    const c = o.boots;
    const skin = front ? SKIN.b : SKIN.d1;
    if (o.shoes === 'sandals') {
        s.rect(x + 1, y, 2, 3, skin);
        s.rect(x + 1, y + 3, 4, 1, skin);
        s.rect(x + 1, y + 2, 3, 1, front ? c.b : c.d1);
        s.hline(x + 1, x + 4, y + 4, front ? c.d1 : c.d2);
        return;
    }
    if (o.shoes === 'sneakers') {
        s.rect(x + 1, y, 2, 2, skin);
        s.rect(x + 1, y + 2, 4, 2, front ? c.b : c.d1);
        s.px(x + 3, y + 2, o.bootDots);
        s.hline(x + 1, x + 4, y + 4, front ? '#ffffff' : '#d8d0e4');
        return;
    }
    // rubber boots with a tall shaft and a round toe
    const b = front ? c.b : c.d1;
    s.rect(x + 1, y, 3, 5, b);
    s.rect(x + 3, y + 3, 2, 2, b);
    s.vline(x + 1, y, y + 3, front ? c.l1 : c.b);
    s.px(x + 2, y + 1, o.bootDots);
    s.px(x + 3, y + 3, o.bootDots);
    s.hline(x + 1, x + 4, y + 4, front ? c.d2 : '#27402a');
}

function legs(s, o, pose, U, L) {
    const [fo, bo] = pose.legs || [0, 0];
    if (pose.sit) {
        // sitting on a bench, seen from the side: thighs forward, shins down
        s.rect(11, 25 + U - 2, 7, 2, SKIN.d1);
        s.rect(16, 25 + U - 1, 2, 5, SKIN.d1);
        s.rect(12, 25 + U - 1, 6, 2, SKIN.b);
        s.rect(18, 25 + U, 2, 4, SKIN.b);
        feet(s, o, 15, 29, false);
        feet(s, o, 17, 29, true);
        return;
    }
    const top = 26 + U;
    const footY = 29 + L;
    s.rect(10 + bo, top, 2, footY - top, SKIN.d1);
    s.rect(13 + fo, top, 2, footY - top, SKIN.b);
    feet(s, o, 9 + bo, footY, false);
    feet(s, o, 12 + fo, footY, true);
}

function dress(s, o, U) {
    const c = o.dress;
    const y = 17 + U;
    s.rect(12, y, 2, 1, SKIN.d1);                                  // neck
    s.rect(10, y + 1, 6, 4, c.b);                                  // bodice
    s.poly([[9.5, y + 4], [16.5, y + 4], [18.5, y + 10], [7.5, y + 10]], c.b);
    s.vline(10, y + 1, y + 4, c.l1);                               // light edge
    s.line(9, y + 5, 8, y + 8, c.l1);
    s.vline(15, y + 2, y + 4, c.d1);                               // shade edge
    s.line(16, y + 5, 17, y + 8, c.d1);
    s.hline(11, 14, y + 1, c.l1);                                  // collar light
    s.hline(10, 15, y + 4, c.d1);                                  // waist
    s.hline(8, 17, y + 9, o.hem);                                  // ruffled hem
    for (let x = 8; x <= 17; x += 2) s.px(x, y + 10, o.hem);
    if (o.butterflies) {
        const spots = [[11, y + 6], [15, y + 7], [9, y + 8], [13, y + 2], [16, y + 5]];
        spots.forEach(([bx, by], i) => {
            const col = o.butterflies[i % o.butterflies.length];
            s.px(bx, by, col);
            s.px(bx + 1, by + 1, col);
            s.px(bx, by + 1, col);
        });
    }
    if (o.flowers) {
        const spots = [[11, y + 6], [15, y + 6], [13, y + 8], [11, y + 2], [16, y + 8], [9, y + 8], [14, y + 3]];
        spots.forEach(([fx, fy], i) => s.px(fx, fy, o.flowers[i % o.flowers.length]));
    }
}

function hairBack(s, U) {
    const y = 5 + U;
    s.oval(5, y, 13, 12, HAIR.b);
    // wavy locks down the back to the shoulders
    s.poly([[4, y + 6], [11, y + 6], [11, y + 15], [9, y + 17], [6, y + 16], [4, y + 12]], HAIR.b);
    s.line(6, y + 8, 5, y + 12, HAIR.d1);
    s.line(6, y + 13, 7, y + 15, HAIR.d1);
    s.line(8, y + 9, 9, y + 13, HAIR.d1);
    s.px(9, y + 16, HAIR.d1);
    s.line(7, y + 2, 9, y + 1, HAIR.l1);
    s.px(6, y + 5, HAIR.l1);
    s.px(7, y + 10, HAIR.l1);
    // lock on the far side of the face
    s.vline(18, y + 5, y + 11, HAIR.d1);
    s.vline(17, y + 10, y + 12, HAIR.b);
}

function face(s, pose, U, headwear) {
    const y = 8 + U;
    s.oval(9, y, 9, 9, SKIN.b);
    s.hline(11, 15, y + 8, SKIN.d1);                               // jaw shade
    s.px(16, y + 7, SKIN.d1);
    s.px(10, y + 2, SKIN.l1);
    // bangs with jagged tips
    s.oval(8, y - 3, 11, 5, HAIR.b);
    s.px(10, y + 2, HAIR.b);
    s.px(13, y + 2, HAIR.b);
    s.px(16, y + 2, HAIR.b);
    s.px(17, y + 3, HAIR.d1);
    s.line(10, y, 13, y - 1, HAIR.l1);
    s.px(12, y, HAIR.l2);
    s.hline(14, 16, y + 1, HAIR.d1);
    // eyes: 2×2 with a sparkle
    const eyes = pose.eyes || 'open';
    const e1 = 11;
    const e2 = 15;
    const ey = y + 3;
    const openEye = (x) => {
        s.rect(x, ey, 2, 2, EYE);
        s.px(x + 1, ey, '#ffffff');
    };
    if (eyes === 'open') {
        openEye(e1);
        openEye(e2);
    } else if (eyes === 'wide') {
        openEye(e1);
        openEye(e2);
        s.hline(e1, e1 + 1, ey - 1, EYE);
        s.hline(e2, e2 + 1, ey - 1, EYE);
    } else if (eyes === 'closed') {
        s.hline(e1, e1 + 1, ey + 1, EYE);
        s.hline(e2, e2 + 1, ey + 1, EYE);
    } else if (eyes === 'happy') {
        s.px(e1, ey + 1, EYE);
        s.px(e1 + 1, ey, EYE);
        s.px(e2, ey, EYE);
        s.px(e2 + 1, ey + 1, EYE);
    } else if (eyes === 'wink') {
        openEye(e1);
        s.hline(e2, e2 + 1, ey + 1, EYE);
    } else if (eyes === 'sad') {
        openEye(e1);
        openEye(e2);
        s.px(e1 - 1, ey - 1, HAIR.d2);
        s.px(e2 + 2, ey - 1, HAIR.d2);
    }
    // cheeks and mouth
    s.px(e1 - 1, ey + 2, BLUSH);
    s.px(e2 + 2, ey + 2, BLUSH);
    const mouth = pose.mouth || 'smile';
    const my = y + 6;
    if (mouth === 'smile') {
        s.px(13, my, MOUTH);
        s.px(14, my, MOUTH);
    } else if (mouth === 'open') {
        s.hline(13, 14, my, '#7d2440');
        s.hline(13, 14, my + 1, '#ff8d9d');
    } else if (mouth === 'o') {
        s.px(14, my, '#7d2440');
        s.px(14, my + 1, '#7d2440');
    } else if (mouth === 'blow') {
        s.px(15, my, '#7d2440');
    } else if (mouth === 'flat') {
        s.hline(13, 14, my + 1, MOUTH);
    }
    if (headwear === 'sunglasses') {
        const lens = '#33202e';
        s.rect(e1 - 1, ey - 1, 3, 3, lens);
        s.rect(e2, ey - 1, 3, 3, lens);
        s.hline(e1 + 2, e2 - 1, ey - 1, lens);
        s.px(e1 - 1, ey - 1, '#a48a9c');
        s.px(e2, ey - 1, '#a48a9c');
        s.line(e1 - 2, ey - 1, e1 - 3, ey, lens);
    }
}

function hat(s, o, U) {
    const y = U;
    if (o.hat === 'bucket') {
        const g = ramp('#7d8d40');
        s.poly([[9, y + 5], [10, y + 1], [17, y + 1], [18, y + 5]], g.b);
        s.hline(10, 16, y + 1, g.l1);
        s.px(10, y + 2, g.l1);
        s.vline(17, y + 2, y + 3, g.d1);
        const band = ['#d9483b', '#f4c64e', '#3fa9a2', '#f4c64e'];
        for (let x = 9; x <= 18; x += 1) s.px(x, y + 4, band[(x - 9) % band.length]);
        s.px(15, y + 2, '#e98a2e');       // little fox logo
        s.px(16, y + 2, '#e98a2e');
        s.px(15, y + 3, '#fff1d6');
        s.poly([[6, y + 7], [8, y + 5], [19, y + 5], [21, y + 7], [21, y + 8], [6, y + 8]], g.b);
        s.hline(8, 19, y + 5, g.l1);
        s.hline(7, 20, y + 8, g.d1);
        s.px(6, y + 8, g.d2);
        s.px(21, y + 8, g.d2);
    } else if (o.hat === 'cap') {
        const r = ramp('#e2443f');
        s.oval(8, y + 2, 11, 8, r.b);
        s.hline(10, 15, y + 2, r.l1);
        s.px(9, y + 4, r.l1);
        s.hline(8, 18, y + 8, r.d1);
        s.poly([[16, y + 7], [23, y + 7], [23, y + 8], [16, y + 9]], r.d1);
        s.hline(17, 22, y + 7, r.b);
        s.px(13, y + 3, '#ffffff');       // the "A"
        s.px(12, y + 4, '#ffffff');
        s.px(14, y + 4, '#ffffff');
        s.hline(12, 14, y + 5, '#ffffff');
        s.px(12, y + 6, '#ffffff');
        s.px(14, y + 6, '#ffffff');
        s.px(13, y + 1, r.d1);
    }
}

function props(s, pose, U) {
    if (pose.camera) {
        const x = 16;
        const y = 11 + U;
        s.rect(x, y, 6, 4, '#4a8fd6');
        s.hline(x, x + 5, y, '#8cc4ff');
        s.rect(x + 2, y + 1, 2, 2, '#1d2340');
        s.px(x + 3, y + 1, '#bfe6ff');
        s.px(x + 5, y + 1, pose.camera === 'flash' ? '#ffffff' : '#ffe27a');
        s.point('flash', x + 6, y + 1);
    }
    if (pose.flute) {
        const y = 14 + U;
        s.line(15, y, 23, y + 3, '#f2c35a');
        s.px(19, y + 1, '#8a5a1e');
        s.px(21, y + 2, '#8a5a1e');
        s.point('notes', 23, y + 1);
    }
    if (pose.wand) {
        const y = 12 + U;
        s.line(17, y + 3, 19, y, '#ff8fcf');
        s.oval(18, y - 4, 5, 5, '#ff8fcf');
        s.rect(19, y - 3, 3, 3, null);
        s.point('bubbles', 21, y - 3);
    }
    if (pose.hold) s.point('hold', pose.front[0], pose.front[1] + U - 1);
    if (pose.rod) s.point('rod', pose.front[0], pose.front[1] + U);
    if (pose.fish) s.point('fish', 16, 19 + U);
    if (pose.cone) {
        const hx = pose.front[0];
        const hy = pose.front[1] + U;
        s.tri(hx - 1, hy, hx + 2, hy, hx + 0.5, hy + 4, '#d99a4e');
        s.px(hx, hy + 1, '#b27434');
        s.oval(hx - 2, hy - 3, 5, 4, '#ffcfe3');
        s.px(hx - 1, hy - 3, '#ffffff');
        s.px(hx + 1, hy - 2, '#ff8fb8');
    }
}

export function drawMira(s, outfitKey, pose, { withHat = true } = {}) {
    const o = OUTFITS[outfitKey];
    const L = pose.lift || 0;
    const U = (pose.bob || 0) + L;
    const headwear = withHat ? o.hat : 'none';
    const sleeveBack = { sleeve: o.dress.d1, sleeveLight: o.dress.b };
    const sleeveFront = { sleeve: o.dress.b, sleeveLight: o.dress.l1 };
    // the far arm goes behind the hair, so a raised arm doesn't paint over it
    const [bx, by] = pose.back;
    arm(s, 10, 19 + U, bx, by + U, { skin: SKIN.d1, contour: SKIN.d2, ...sleeveBack });
    hairBack(s, U);
    legs(s, o, pose, U, L);
    dress(s, o, U);
    face(s, pose, U, headwear);
    if (withHat) hat(s, o, U);
    const [fx, fy] = pose.front;
    arm(s, 15, 19 + U, fx, fy + U, { skin: SKIN.b, light: SKIN.l1, contour: SKIN.d2, ...sleeveFront });
    props(s, pose, U);
    s.point('head', 13, 1 + U);
}

function miraDef(outfit) {
    const anims = {};
    for (const [name, frames] of Object.entries(POSES)) {
        anims[name] = frames.map((pose) => (s) => drawMira(s, outfit, pose));
    }
    // without headwear, for when a cheeky monkey runs off with it
    for (const name of ['idle', 'blink', 'surprised', 'point', 'throw', 'laugh', 'sad', 'cheer']) {
        anims[`${name}-nohat`] = POSES[name].map((pose) => (s) => drawMira(s, outfit, pose, { withHat: false }));
    }
    return { name: `mira-${outfit}`, sheet: 'characters', w: W, h: H, anchor: [12, 33], anims };
}

// ===========================================================================
// NOVA – the tiger cub who fell from the stars
// ===========================================================================
const TIGER = { b: '#f59a32', l1: '#ffc267', l2: '#ffe3a8', d1: '#d56d22', d2: '#a4481b' };
const STRIPE = '#3a1f1f';
const WHITE = { b: '#fff4e3', d1: '#f0d3b8' };
const STAR = '#ffe36a';

function novaHead(s, x, y, { eyes = 'open', mouth = 'smile', ears = 'up', look = 0 } = {}) {
    // ears
    if (ears === 'up') {
        s.oval(x + 1, y, 4, 4, TIGER.b);
        s.oval(x + 7, y, 4, 4, TIGER.b);
        s.px(x + 2, y + 1, '#ffb3a6');
        s.px(x + 8, y + 1, '#ffb3a6');
    } else {
        s.oval(x, y + 2, 4, 3, TIGER.d1);
        s.oval(x + 8, y + 2, 4, 3, TIGER.d1);
    }
    // round head
    s.ball(x, y + 1, 12, 10, TIGER);
    // white muzzle and cheeks
    s.oval(x + 3 + look, y + 6, 8, 4, WHITE.b);
    s.px(x + 1, y + 7, WHITE.b);
    s.px(x + 11, y + 7, WHITE.b);
    // forehead stripes and the little star
    s.vline(x + 4, y + 2, y + 3, STRIPE);
    s.vline(x + 8, y + 2, y + 3, STRIPE);
    s.px(x + 6, y + 2, STAR);
    s.px(x + 5, y + 3, STAR);
    s.px(x + 7, y + 3, STAR);
    s.px(x + 6, y + 3, '#fff7c2');
    s.px(x, y + 5, STRIPE);
    s.px(x + 11, y + 5, STRIPE);
    // eyes
    const ey = y + 4;
    const ex1 = x + 3 + look;
    const ex2 = x + 8 + look;
    if (eyes === 'open') {
        s.rect(ex1, ey, 2, 2, '#2a1a1a');
        s.rect(ex2, ey, 2, 2, '#2a1a1a');
        s.px(ex1 + 1, ey, '#ffffff');
        s.px(ex2 + 1, ey, '#ffffff');
    } else if (eyes === 'happy') {
        s.px(ex1, ey + 1, '#2a1a1a');
        s.px(ex1 + 1, ey, '#2a1a1a');
        s.px(ex2, ey, '#2a1a1a');
        s.px(ex2 + 1, ey + 1, '#2a1a1a');
    } else {
        s.hline(ex1, ex1 + 1, ey + 1, '#2a1a1a');
        s.hline(ex2, ex2 + 1, ey + 1, '#2a1a1a');
    }
    // nose and mouth
    s.px(x + 6 + look, y + 6, '#ff8a9a');
    if (mouth === 'open') {
        s.rect(x + 5 + look, y + 7, 3, 2, '#9c3048');
        s.px(x + 6 + look, y + 8, '#ff9aaa');
    } else if (mouth === 'eat') {
        s.hline(x + 5 + look, x + 7 + look, y + 8, '#9c3048');
    } else {
        s.px(x + 5 + look, y + 7, '#9c3048');
        s.px(x + 7 + look, y + 7, '#9c3048');
    }
}

function novaSitting(s, { eyes, mouth, ears, tail = 0, bob = 0, look = 0 } = {}) {
    const y = 2 + bob;
    // tail curling up behind
    const tx = 1;
    s.thick(tx + 1, 12, tx, 8 - tail, 2, TIGER.b);
    s.thick(tx, 8 - tail, tx + 2, 5 - tail, 2, TIGER.b);
    s.px(tx, 9 - tail, STRIPE);
    s.px(tx + 1, 6 - tail, STRIPE);
    s.px(tx + 2, 4 - tail, TIGER.d2);
    // body
    s.ball(2, y + 6, 11, 8, TIGER);
    s.oval(8, y + 7, 5, 6, WHITE.b);
    s.px(4, y + 8, STRIPE);
    s.px(5, y + 9, STRIPE);
    s.px(3, y + 10, STRIPE);
    // front paws
    s.rect(9, 13, 2, 2, WHITE.b);
    s.rect(11, 13, 2, 2, WHITE.d1);
    novaHead(s, 5, y - 2, { eyes, mouth, ears, look });
}

function novaWalking(s, f) {
    const legs = [[0, 1, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0], [1, 0, 0, 1]][f];
    const bob = f % 2 ? -1 : 0;
    // tail up behind
    s.thick(2, 6 + bob, 0, 2 + bob, 2, TIGER.b);
    s.px(0, 3 + bob, STRIPE);
    // legs (back pair darker)
    s.rect(4, 10 - legs[0], 2, 3 + legs[0], TIGER.d1);
    s.rect(10, 10 - legs[2], 2, 3 + legs[2], TIGER.d1);
    s.ball(2, 5 + bob, 12, 7, TIGER);
    s.oval(7, 9 + bob, 6, 3, WHITE.b);
    s.px(5, 6 + bob, STRIPE);
    s.px(6, 7 + bob, STRIPE);
    s.px(8, 6 + bob, STRIPE);
    s.rect(6, 10 - legs[1], 2, 3 + legs[1], TIGER.b);
    s.rect(12, 10 - legs[3], 2, 3 + legs[3], TIGER.b);
    s.px(6, 12, WHITE.b);
    s.px(12, 12, WHITE.b);
    novaHead(s, 10, bob - 3, {});
}

function novaSleeping(s, f) {
    // curled up asleep: head resting on her paws, tail wrapped round the front
    const breathe = f ? 1 : 0;
    // body
    s.ball(1, 6 - breathe, 13, 8 + breathe, TIGER);
    s.line(4, 6 - breathe, 3, 8, STRIPE);
    s.line(7, 6 - breathe, 7, 8 - breathe, STRIPE);
    s.line(10, 6 - breathe, 11, 8, STRIPE);
    // tail curling along the bottom to the front
    s.thick(1, 12, 3, 13, 2, TIGER.b);
    s.thick(3, 13, 11, 13, 2, TIGER.b);
    s.px(5, 13, STRIPE);
    s.px(8, 13, STRIPE);
    s.rect(10, 13, 2, 1, STRIPE);
    // head resting on the paws
    s.ball(9, 4, 9, 8, TIGER);
    s.oval(10, 2, 3, 4, TIGER.b);
    s.px(11, 3, '#ffb3a6');
    s.oval(14, 3, 3, 3, TIGER.d1);
    s.oval(13, 8, 5, 3, WHITE.b);
    s.px(17, 8, '#ff8a9a');
    // sleepy closed eyes (a little smile) and the star
    s.px(11, 7, '#2a1a1a');
    s.px(12, 8, '#2a1a1a');
    s.px(13, 8, '#2a1a1a');
    s.px(14, 7, '#2a1a1a');
    s.px(13, 5, STAR);
    s.px(12, 5, '#fff7c2');
    // paws under the chin
    s.rect(13, 12, 4, 2, WHITE.b);
    s.px(15, 12, WHITE.d1);
}

const novaDef = {
    name: 'nova',
    sheet: 'characters',
    w: 18,
    h: 15,
    anchor: [8, 14],
    anims: {
        sit: [(s) => novaSitting(s, {}), (s) => novaSitting(s, { tail: 1 })],
        blink: [(s) => novaSitting(s, { eyes: 'closed' })],
        meow: [(s) => novaSitting(s, { mouth: 'open' })],
        happy: [(s) => novaSitting(s, { eyes: 'happy', mouth: 'open', bob: -1 }), (s) => novaSitting(s, { eyes: 'happy', mouth: 'open', tail: 1, bob: -2 })],
        sad: [(s) => novaSitting(s, { ears: 'down', mouth: 'smile', eyes: 'open', bob: 1 })],
        look: [(s) => novaSitting(s, { look: -1 })],
        eat: [(s) => novaSitting(s, { mouth: 'eat', eyes: 'happy' }), (s) => novaSitting(s, { mouth: 'open', eyes: 'happy', bob: 1 })],
        walk: { w: 22, h: 15, anchor: [10, 14], frames: [0, 1, 2, 3].map((f) => (s) => novaWalking(s, f)) },
        sleep: { w: 18, h: 15, anchor: [8, 14], frames: [0, 1].map((f) => (s) => novaSleeping(s, f)) }
    }
};

// Mira's headwear on its own, for when the monkey runs off with it
function hatDef(outfit) {
    return {
        name: `hat-${outfit}`,
        sheet: 'characters',
        w: 24,
        h: 10,
        anchor: [13, 9],
        anims: {
            idle: [(s) => {
                const o = OUTFITS[outfit];
                if (o.hat === 'sunglasses') {
                    const lens = '#33202e';
                    s.rect(8, 5, 3, 3, lens);
                    s.rect(13, 5, 3, 3, lens);
                    s.hline(11, 12, 5, lens);
                    s.px(8, 5, '#a48a9c');
                    s.px(13, 5, '#a48a9c');
                    s.line(7, 5, 5, 7, lens);
                    s.line(16, 5, 18, 7, lens);
                } else {
                    hat(s, o, 1);
                }
            }]
        }
    };
}

export default [miraDef('a'), miraDef('b'), miraDef('c'), novaDef, hatDef('a'), hatDef('b'), hatDef('c')];
