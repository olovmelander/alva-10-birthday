/*
 * Trollskogen – the enchanted Swedish forest island (golden afternoon light).
 *
 * Animals (sheet 'animals-forest') and forest props (sheet 'props-forest').
 * Everything faces right; ground animals stand with their feet on the last
 * row of the frame. Light comes from the top left.
 */
import { Sprite, ramp, rng } from './kit.mjs';

// ===========================================================================
// Shared helpers
// ===========================================================================
const INK = '#2a1a1a';
const SPARK = '#ffffff';
const W = '#ffffff';          // mask colour for vol()
const BLUSH = '#f7a3a3';

/** A view of `base` that draws everything shifted by (dx, dy). */
function shifted(base, dx, dy) {
    const t = Object.create(base);
    t.px = (x, y, c) => {
        base.px(Math.round(x) + dx, Math.round(y) + dy, c);
        return t;
    };
    t.get = (x, y) => base.get(x + dx, y + dy);
    t.opaque = (x, y) => base.opaque(x + dx, y + dy);
    t.inside = (x, y) => base.inside(x + dx, y + dy);
    t.point = (name, x, y) => {
        base.point(name, x + dx, y + dy);
        return t;
    };
    t.base = base;
    t.ox = dx;
    t.oy = dy;
    return t;
}

/** An empty scratch sprite with the same coordinate space as s. */
function blankLike(s) {
    return s.base ? shifted(new Sprite(s.base.w, s.base.h), s.ox, s.oy) : new Sprite(s.w, s.h);
}

let LIGHT_X = -1;   // light from the left (-1); +1 only while painting a sprite that gets rotated

/**
 * Build a shape on a scratch mask, then paint it with volume:
 * base colour, a 1-px light rim on the top/left, a shade rim on the bottom/right.
 * Returns the mask, so callers can clip details to the shape.
 */
function vol(s, r, build, { light = true, dark = true } = {}) {
    const m = blankLike(s);
    build(m);
    const k = (x, y) => m.opaque(x, y);
    const L = LIGHT_X;
    const ox = s.ox || 0;
    const oy = s.oy || 0;
    for (let y = -oy; y < s.h - oy; y += 1) {
        for (let x = -ox; x < s.w - ox; x += 1) {
            if (!k(x, y)) continue;
            let c = r.b;
            if (dark && (!k(x - L, y + 1) || !k(x, y + 1))) c = r.d1;
            else if (light && (!k(x + L, y - 1) || !k(x, y - 1) || !k(x + L, y))) c = r.l1;
            s.px(x, y, c);
        }
    }
    return m;
}

/**
 * Crop every animation of a definition to its drawing plus 1 px of air (for the
 * outline). Ground anchors (anchor on the last row) keep the feet on the last row.
 * Frames of one animation share size and anchor; the anchor stays on the same body spot.
 */
function fit(def) {
    const anims = {};
    for (const [name, spec] of Object.entries(def.anims)) {
        const frames = Array.isArray(spec) ? spec : spec.frames;
        const w = (!Array.isArray(spec) && spec.w) || def.w;
        const h = (!Array.isArray(spec) && spec.h) || def.h;
        const anchor = (!Array.isArray(spec) && spec.anchor) || def.anchor;
        const ground = anchor[1] === h - 1;
        const P = 24;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        frames.forEach((paint, i) => {
            const big = new Sprite(w + 2 * P, h + 2 * P);
            paint(shifted(big, P, P), i);
            const b = big.bounds();
            if (!b) return;
            minX = Math.min(minX, b.x - P);
            minY = Math.min(minY, b.y - P);
            maxX = Math.max(maxX, b.x + b.w - 1 - P);
            maxY = Math.max(maxY, b.y + b.h - 1 - P);
        });
        if (ground && maxY > anchor[1]) console.warn(`${def.name}.${name} draws ${maxY - anchor[1]} px below its ground row`);
        const left = minX - 1;
        const top = minY - 1;
        const right = maxX + 1;
        const bottom = ground ? anchor[1] : maxY + 1;
        anims[name] = {
            w: right - left + 1,
            h: bottom - top + 1,
            anchor: [anchor[0] - left, anchor[1] - top],
            frames: frames.map((paint) => (s, i) => paint(shifted(s, -left, -top), i))
        };
        if (!Array.isArray(spec) && spec.outline !== undefined) anims[name].outline = spec.outline;
    }
    const first = Object.values(anims)[0];
    return { ...def, w: first.w, h: first.h, anchor: first.anchor, anims };
}

/** 2×2 eye with a sparkle (medium and big animals). */
function eye2(s, x, y, state = 'open', c = INK) {
    if (state === 'open') {
        s.rect(x, y, 2, 2, c);
        s.px(x + 1, y, SPARK);
    } else if (state === 'wide') {
        s.rect(x, y - 1, 2, 3, c);
        s.px(x + 1, y - 1, SPARK);
        s.px(x, y, SPARK);
    } else if (state === 'happy') {
        s.px(x, y + 1, c);
        s.px(x + 1, y, c);
        s.px(x + 2, y + 1, c);
    } else {
        s.hline(x, x + 1, y + 1, c);
    }
}

// ===========================================================================
// EKORRE – red squirrel (~12×12)
// ===========================================================================
const SQ = ramp('#c95a2a');
const SQT = ramp('#dd6c30');
const SQ_CREAM = { b: '#fff2de', d1: '#efcfae' };
const SQ_NOSE = '#7a3036';

/** The bushy tail. v: 0 rest, 1 tip flicked back, 2 tall (chatter). */
function sqTail(s, v, dy) {
    const plume = [
        [[0, 4 + dy, 6, 7], [1, 3 + dy, 5, 4]],
        [[0, 5 + dy, 6, 6], [0, 3 + dy, 4, 4]],
        [[1, 3 + dy, 6, 8], [2, 2 + dy, 4, 3]]
    ][v];
    vol(s, SQT, (m) => {
        m.oval(3, 10, 4, 6, W);
        plume.forEach(([x, y, w, h]) => m.oval(x, y, w, h, W));
    });
    // fluffy edge notches and the curl line
    const curl = [[[3, 6], [2, 7], [2, 8]], [[2, 7], [1, 8], [1, 9]], [[4, 5], [3, 6], [3, 7]]][v];
    curl.forEach(([x, y]) => s.px(x, y + dy, SQT.d1));
    s.px(1, 5 + dy, SQT.l2);
}

function sqHeadSide(s, hx, hy, { eyes = 'open', mouth = 'shut', chew = false } = {}) {
    // pointed ear with a dark tuft, at the back of the head
    s.rect(hx + 1, hy - 2, 2, 3, SQ.b);
    s.px(hx + 1, hy - 2, SQ.l1);
    s.px(hx + 2, hy - 1, SQ.d2);
    s.px(hx + 2, hy - 3, SQ.d2);
    s.px(hx + 1, hy - 3, SQ.d2);
    // head: round with a short snout
    vol(s, SQ, (m) => {
        m.oval(hx, hy, 6, 6, W);
        m.oval(hx + 3, hy + 2, 4, 4, W);
    });
    // cream cheek and chin, a touch of blush
    s.px(hx + 4, hy + 5, SQ_CREAM.b);
    s.px(hx + 5, hy + 4, SQ_CREAM.b);
    s.px(hx + 3, hy + 5, SQ_CREAM.d1);
    s.px(hx + 2, hy + 4, chew ? SQ.l1 : BLUSH);
    eye2(s, hx + 3, hy + 2, eyes);
    s.px(hx + 6, hy + 3, SQ_NOSE);
    if (mouth === 'open') {
        s.px(hx + 6, hy + 4, '#9c3048');
        s.px(hx + 5, hy + 5, '#ff9aaa');
    }
}

function sqHeadFront(s, hx, hy) {
    // face turned to the camera: two tufted ears, two eyes, cream muzzle
    for (const ex of [hx, hx + 5]) {
        s.rect(ex, hy - 2, 2, 3, SQ.b);
        s.px(ex + (ex === hx ? 0 : 1), hy - 3, SQ.d2);
        s.px(ex + (ex === hx ? 1 : 0), hy - 1, SQ.d2);
    }
    vol(s, SQ, (m) => m.oval(hx, hy, 7, 6, W));
    s.oval(hx + 2, hy + 3, 3, 3, SQ_CREAM.b);
    eye2(s, hx + 1, hy + 2, 'open');
    eye2(s, hx + 4, hy + 2, 'open');
    s.px(hx + 3, hy + 3, SQ_NOSE);
    s.px(hx, hy + 4, BLUSH);
    s.px(hx + 6, hy + 4, BLUSH);
}

function pineCone(s, x, y) {
    // 3×4 cone, scales in a little checker, green stalk on top
    const c = ramp('#9a5a2c');
    s.rect(x, y, 3, 4, c.b);
    s.px(x, y, c.l1);
    s.px(x + 2, y + 1, c.d1);
    s.px(x + 1, y + 2, c.d1);
    s.px(x, y + 3, c.d1);
    s.px(x + 2, y + 3, c.d2);
    s.px(x + 1, y + 4, c.d1);
    s.px(x + 1, y - 1, '#6a8a3a');
}

/**
 * Sitting squirrel, feet on row 15.
 * pose: eyes, mouth, tail (0 rest, 1 flick, 2 tall), up (sits taller),
 *       paws ('chest' | 'cone'), chew, front (face to camera), bob
 */
function squirrelSit(s, p = {}) {
    const { eyes = 'open', mouth = 'shut', tail = 0, up = 0, paws = 'chest', chew = false, front = false, bob = 0 } = p;
    const dy = bob - up;
    sqTail(s, tail, dy);
    // torso and haunch
    const body = vol(s, SQ, (m) => {
        m.oval(6, 9 + dy, 6, 7 - dy, W);
        m.oval(5, 11, 5, 5, W);
    });
    // shadow line where the tail meets the back
    for (let y = 9 + dy; y <= 14; y += 1) {
        for (let x = 0; x < 12; x += 1) {
            if (body.opaque(x, y)) {
                s.px(x - 1, y, SQT.d2);
                break;
            }
        }
    }
    s.oval(9, 10 + dy, 3, 5 - dy, SQ_CREAM.b);
    s.px(9, 14, SQ_CREAM.d1);
    // haunch line and the foot
    s.px(6, 12, SQ.l1);
    s.px(7, 12, SQ.l1);
    s.px(9, 13, SQ.d1);
    s.hline(9, 12, 15, SQ.b);
    s.px(12, 15, SQ.l1);
    // head
    if (front) sqHeadFront(s, 7, 5 + dy);
    else sqHeadSide(s, 8, 5 + dy, { eyes, mouth, chew });
    s.px(8, 10 + dy, SQ.d1);
    // little front paws
    if (paws === 'cone') {
        pineCone(s, 13, 9 + dy + (chew ? 1 : 0));
        s.px(12, 11 + dy, SQ.b);
        s.px(12, 12 + dy, SQ.l1);
    } else {
        s.px(11, 11 + dy, SQ.b);
        s.px(12, 11 + dy, SQ.l1);
        s.px(11, 12 + dy, SQ.d1);
    }
    s.point('head', 10, 2 + dy);
}

/** Running squirrel, feet on row 14. f = 0..3 (gather, push, fly, land) */
function squirrelRun(s, f) {
    const G = 14;
    const y = -[0, 1, 2, 1][f];
    // tail streaming behind, waving up and down
    const tail = [
        [[2, 5, 4, 5], [0, 1, 6, 6], [1, 0, 4, 3]],
        [[2, 5, 4, 5], [0, 2, 6, 6], [0, 1, 4, 3]],
        [[2, 5, 4, 5], [0, 4, 6, 5], [0, 3, 4, 3]],
        [[2, 5, 4, 5], [0, 2, 6, 6], [1, 1, 4, 3]]
    ][f];
    vol(s, SQT, (m) => tail.forEach(([x, yy, w, h]) => m.oval(x, yy + y, w, h, W)));
    const cy = f === 2 ? 2 : 0;
    s.px(3, 4 + y + cy, SQT.d1);
    s.px(2, 5 + y + cy, SQT.d1);
    s.px(1, 3 + y + cy, SQT.l2);
    // legs: [hip x, hip y, foot x, foot y]; feet on the ground row stay put
    const L = [
        { hb: [8, 9, 10, G], hf: [8, 9, 11, G], fb: [13, 10, 13, G], ff: [13, 10, 14, G] },
        { hb: [7, 9, 4, 12], hf: [8, 9, 5, 13], fb: [13, 9, 16, 11], ff: [13, 9, 17, 12] },
        { hb: [7, 9, 4, 11], hf: [8, 9, 4, 12], fb: [13, 9, 17, 10], ff: [13, 9, 17, 11] },
        { hb: [8, 9, 10, 12], hf: [8, 9, 11, 13], fb: [13, 10, 14, G], ff: [13, 10, 15, G] }
    ][f];
    const leg = ([x0, y0, x1, y1], t, c) => s.thick(x0, y0 + y, x1, y1 === G ? G - t + 1 : y1 + y, t, c);
    leg(L.hb, 2, SQ.d1);
    leg(L.fb, 1, SQ.d1);
    // body: a round haunch and a short back, arched when gathered
    vol(s, SQ, (m) => {
        m.oval(5, 5 + y + (f === 0 ? -1 : 0), 6, 7, W);
        m.oval(7, 6 + y, 8, 5, W);
    });
    s.hline(10, 13, 10 + y, SQ_CREAM.b);
    s.px(6, 7 + y, SQ.l1);
    leg(L.hf, 2, SQ.b);
    leg(L.ff, 1, SQ.b);
    sqHeadSide(s, 12, 3 + y + (f === 3 ? 1 : 0), {});
}

/**
 * Climbing up a trunk that stands to the RIGHT (belly and paws on the bark, head up).
 * It is the running pose turned a quarter turn, painted with mirrored light so the
 * result is still lit from the top left.
 */
function squirrelClimb(s, f) {
    const src = new Sprite(20, 15);
    LIGHT_X = 1;
    squirrelRun(src, f ? 1 : 0);
    LIGHT_X = -1;
    let spark = null;
    for (let y = 0; y < 15; y += 1) {
        for (let x = 0; x < 20; x += 1) {
            const c = src.get(x, y);
            if (!c[3]) continue;
            s.px(y, 19 - x, c);
            if (c[0] === 255 && c[1] === 255 && c[2] === 255) spark = [y, 19 - x];
        }
    }
    // the eye sparkle belongs in the top-right corner of the eye
    if (spark) {
        s.px(spark[0], spark[1], INK);
        s.px(spark[0] + 1, spark[1], SPARK);
    }
}

const squirrelDef = {
    name: 'a-squirrel',
    sheet: 'animals-forest',
    w: 16,
    h: 16,
    anchor: [8, 15],
    anims: {
        idle: [(s) => squirrelSit(s, {}), (s) => squirrelSit(s, { tail: 1, bob: 1 })],
        blink: [(s) => squirrelSit(s, { eyes: 'closed' })],
        hop: { w: 20, h: 15, anchor: [10, 14], frames: [0, 1, 2, 3].map((f) => (s) => squirrelRun(s, f)) },
        climb: { w: 15, h: 20, anchor: [14, 8], frames: [0, 1].map((f) => (s) => squirrelClimb(s, f)) },
        eat: [
            (s) => { squirrelSit(s, { paws: 'cone', eyes: 'happy' }); s.point('mouth', 14, 9); },
            (s) => { squirrelSit(s, { paws: 'cone', chew: true, bob: 1, eyes: 'happy' }); s.point('mouth', 14, 10); }
        ],
        look: [(s) => squirrelSit(s, { front: true })],
        special: [(s) => squirrelSit(s, { tail: 2, up: 1, mouth: 'open' }), (s) => squirrelSit(s, { tail: 1, up: 1, mouth: 'shut' })]
    }
};

// ===========================================================================
// RÄV – red fox (~20×13)
// ===========================================================================
const FOX = ramp('#ec7a2e');
const FOX_W = { b: '#fff6ea', d1: '#ecd6c4', l1: '#ffffff' };
const SOCK = { b: '#4e3034', d1: '#3a2226', l1: '#6a4448' };
const FOX_NOSE = '#3a2226';

/** Side-view fox head. (hx, hy) = top-left of the skull; ears rise 2 px above. */
function foxHead(s, hx, hy, { eyes = 'open', mouth = 'shut', ears = 'up' } = {}) {
    // far ear, then near ear (dark backs/tips)
    const ey = ears === 'forward' ? 1 : 0;
    s.tri(hx + 1, hy + 2, hx + 2 + ey, hy - 2 + ey, hx + 4, hy + 1, FOX.d1);
    s.px(hx + 2 + ey, hy - 1 + ey, SOCK.d1);
    s.tri(hx + 3, hy + 2, hx + 5 + ey, hy - 2 + ey, hx + 7, hy + 2, FOX.b);
    s.px(hx + 5 + ey, hy - 1 + ey, SOCK.d1);
    s.px(hx + 5 + ey, hy + ey, SOCK.b);
    // skull and pointed snout
    vol(s, FOX, (m) => {
        m.oval(hx, hy, 8, 7, W);
        m.poly([[hx + 5, hy + 2], [hx + 9.5, hy + 3.5], [hx + 9.5, hy + 5.5], [hx + 6, hy + 7]], W);
    });
    // white cheek ruff and muzzle
    s.poly([[hx + 1, hy + 5], [hx + 6, hy + 4.5], [hx + 9.5, hy + 5], [hx + 7.5, hy + 7], [hx + 3, hy + 7.5]], FOX_W.b);
    s.px(hx + 2, hy + 7, FOX_W.d1);
    s.px(hx + 3, hy + 7, FOX_W.d1);
    // eye, nose, mouth
    eye2(s, hx + 5, hy + 2, eyes);
    s.rect(hx + 9, hy + 3, 1, 2, FOX_NOSE);
    if (mouth === 'open') {
        s.hline(hx + 6, hx + 8, hy + 6, '#9c3048');
        s.px(hx + 7, hy + 7, '#ff9aaa');
    } else if (mouth === 'eat') {
        s.hline(hx + 7, hx + 8, hy + 6, '#9c3048');
    }
    s.px(hx + 3, hy + 5, BLUSH);
}

/** Fox face turned to the camera (look / peek). (hx, hy) = top-left of the face box. */
function foxFace(s, hx, hy, { eyes = 'open' } = {}) {
    s.tri(hx, hy + 4, hx + 1, hy - 2, hx + 5, hy + 2, FOX.b);
    s.tri(hx + 7, hy + 2, hx + 11, hy - 2, hx + 12, hy + 4, FOX.b);
    s.px(hx + 1, hy - 1, SOCK.d1);
    s.px(hx + 11, hy - 1, SOCK.d1);
    s.px(hx + 2, hy + 1, FOX_W.d1);
    s.px(hx + 10, hy + 1, FOX_W.d1);
    vol(s, FOX, (m) => {
        m.oval(hx + 1, hy + 1, 11, 8, W);
        m.poly([[hx, hy + 5], [hx + 13, hy + 5], [hx + 6.5, hy + 11]], W);
    });
    // white cheeks meeting at the chin
    s.poly([[hx, hy + 5], [hx + 5, hy + 6], [hx + 6.5, hy + 11], [hx + 2, hy + 8]], FOX_W.b);
    s.poly([[hx + 13, hy + 5], [hx + 8, hy + 6], [hx + 6.5, hy + 11], [hx + 11, hy + 8]], FOX_W.b);
    s.rect(hx + 5, hy + 7, 3, 3, FOX_W.b);
    eye2(s, hx + 3, hy + 4, eyes);
    eye2(s, hx + 8, hy + 4, eyes);
    s.hline(hx + 5, hx + 7, hy + 7, FOX_NOSE);
    s.px(hx + 6, hy + 8, FOX_NOSE);
    s.px(hx + 5, hy + 9, FOX_W.d1);
    s.px(hx + 7, hy + 9, FOX_W.d1);
    s.px(hx + 2, hy + 7, BLUSH);
    s.px(hx + 10, hy + 7, BLUSH);
}

function foxLeg(s, x, top, foot, c, sock) {
    // 2-px leg with a dark sock; foot = ground row of the paw
    s.rect(x, top, 2, foot - top + 1, c);
    s.rect(x, foot - 2, 2, 3, sock);
    s.px(x + 2, foot, sock);
    s.px(x, foot - 2, c === FOX.b ? '#a8503a' : '#8a3e30');   // soft top edge of the sock
}

function foxTail(s, x, y, v = 0) {
    // big brush sweeping down behind, white tip; (x, y) = root on the rump
    if (v === 'up') {
        // raised in a happy curve
        vol(s, FOX, (m) => {
            m.oval(x - 5, y - 2, 6, 5, W);
            m.oval(x - 8, y - 5, 6, 5, W);
        });
        s.oval(x - 9, y - 6, 4, 4, FOX_W.b);
        s.px(x - 8, y - 6, FOX_W.l1);
        s.px(x - 3, y - 1, FOX.d1);
        s.px(x - 4, y - 3, FOX.l2);
        return;
    }
    vol(s, FOX, (m) => {
        m.oval(x - 4, y, 6, 5, W);
        m.oval(x - 6, y + 2 + v, 6, 5, W);
    });
    s.oval(x - 7, y + 4 + v * 2, 4, 4, FOX_W.b);
    s.px(x - 6, y + 4 + v * 2, FOX_W.l1);
    s.px(x - 4, y + 7 + v * 2, FOX_W.d1);
    s.px(x - 2, y + 2, FOX.d1);
    s.px(x - 3, y + 3, FOX.d1);
    s.px(x - 4, y + 1, FOX.l2);
}

/**
 * Standing / walking fox, feet on row 16.
 * legs: 4 horizontal paw offsets [backFar, backNear, frontFar, frontNear]; lift raises paws
 */
function foxStand(s, p = {}) {
    const { legs = [0, 0, 0, 0], lift = [0, 0, 0, 0], bob = 0, tail = 0, head = {}, front = false } = p;
    const G = 16;
    const y = bob;
    foxTail(s, 10, 6 + y, tail);
    // far legs
    foxLeg(s, 11 + legs[0], 9 + y, G - lift[0], FOX.d1, SOCK.d1);
    foxLeg(s, 14 + legs[2], 9 + y, G - lift[2], FOX.d1, SOCK.d1);
    // slim body
    vol(s, FOX, (m) => m.oval(7, 5 + y, 12, 6, W));
    s.hline(11, 15, 10 + y, FOX_W.d1);
    // near legs
    foxLeg(s, 8 + legs[1], 9 + y, G - lift[1], FOX.b, SOCK.b);
    foxLeg(s, 17 + legs[3], 9 + y, G - lift[3], FOX.b, SOCK.b);
    s.px(8 + legs[1], 10 + y, FOX.l1);
    // white chest
    s.oval(16, 7 + y, 4, 4, FOX_W.b);
    if (front) foxFace(s, 13, 2 + y);
    else foxHead(s, 15, 3 + y, head);
}

function foxEat(s, f) {
    // nose down to the ground, munching, tail up
    const G = 16;
    foxTail(s, 10, 6, 'up');
    foxLeg(s, 11, 9, G, FOX.d1, SOCK.d1);
    foxLeg(s, 14, 9, G, FOX.d1, SOCK.d1);
    vol(s, FOX, (m) => m.oval(7, 5, 12, 6, W));
    foxLeg(s, 8, 9, G, FOX.b, SOCK.b);
    foxLeg(s, 17, 9, G, FOX.b, SOCK.b);
    // neck dipping forward
    vol(s, FOX, (m) => m.poly([[15, 6], [19, 5], [22, 10], [18, 12]], W));
    s.poly([[17, 9], [20, 8], [21, 11], [18, 12]], FOX_W.b);
    // head tipped down, snout to the ground
    const hy = 6 + f;
    s.tri(17, hy + 2, 17, hy - 2, 20, hy + 1, FOX.d1);
    s.px(17, hy - 1, SOCK.d1);
    s.tri(19, hy + 1, 20, hy - 3, 23, hy + 1, FOX.b);
    s.px(20, hy - 2, SOCK.d1);
    vol(s, FOX, (m) => {
        m.oval(17, hy, 7, 6, W);
        m.poly([[21, hy + 3], [25.5, hy + 7.5], [24, hy + 9.5], [20, hy + 6]], W);
    });
    s.poly([[18, hy + 5], [21, hy + 5], [24.5, hy + 9.5], [22, hy + 9.5]], FOX_W.b);
    eye2(s, 21, hy + 2, 'happy');
    s.px(25, hy + 8, FOX_NOSE);
    s.px(25, hy + 9, FOX_NOSE);
    s.px(20, hy + 4, BLUSH);
    if (f) s.px(23, hy + 9, '#9c3048');
    s.point('mouth', 24, 16);
}

function foxPounce(s, f) {
    // ground row 27. 0 crouch, 1 spring up, 2 dive nose-first
    const G = 27;
    if (f === 0) {
        // crouched low, tail up, ears forward, eyes on the mouse
        vol(s, FOX, (m) => {
            m.oval(3, 15, 7, 5, W);
            m.oval(0, 13, 6, 5, W);
        });
        s.oval(0, 12, 4, 4, FOX_W.b);
        s.px(1, 12, FOX_W.l1);
        foxLeg(s, 11, 21, G, FOX.d1, SOCK.d1);
        foxLeg(s, 17, 21, G, FOX.d1, SOCK.d1);
        vol(s, FOX, (m) => m.oval(7, 17, 13, 7, W));
        foxLeg(s, 9, 21, G, FOX.b, SOCK.b);
        foxLeg(s, 19, 22, G, FOX.b, SOCK.b);
        s.oval(17, 19, 4, 5, FOX_W.b);
        foxHead(s, 17, 15, { ears: 'forward' });
        return;
    }
    if (f === 1) {
        // springing up in an arc: body tilted up, hind legs stretched down
        vol(s, FOX, (m) => {
            m.oval(2, 16, 7, 5, W);
            m.oval(0, 19, 5, 5, W);
        });
        s.oval(0, 20, 4, 4, FOX_W.b);
        s.px(1, 20, FOX_W.l1);
        s.thick(10, 18, 8, 26, 2, FOX.d1);
        s.rect(7, 23, 2, 4, SOCK.d1);
        vol(s, FOX, (m) => {
            m.oval(6, 13, 8, 8, W);
            m.oval(9, 10, 8, 8, W);
            m.oval(12, 7, 7, 7, W);
        });
        s.thick(9, 18, 10, 26, 2, FOX.b);
        s.rect(9, 23, 2, 4, SOCK.b);
        s.px(11, 26, SOCK.b);
        // front paws tucked under the chest
        s.thick(16, 13, 19, 15, 2, FOX.b);
        s.rect(19, 14, 2, 2, SOCK.b);
        s.poly([[14, 10], [18, 8], [20, 12], [16, 14]], FOX_W.b);
        foxHead(s, 15, 3, { ears: 'forward' });
        return;
    }
    // diving nose-first into the grass, tail and hind legs flying up behind
    vol(s, FOX, (m) => {
        m.oval(2, 2, 7, 6, W);
        m.oval(0, 0, 5, 5, W);
    });
    s.oval(0, 0, 4, 4, FOX_W.b);
    s.px(1, 0, FOX_W.l1);
    s.thick(9, 8, 5, 10, 2, FOX.d1);
    s.rect(3, 9, 3, 2, SOCK.d1);
    vol(s, FOX, (m) => {
        m.oval(6, 4, 8, 8, W);
        m.oval(9, 8, 8, 8, W);
        m.oval(12, 12, 7, 7, W);
    });
    s.thick(10, 9, 6, 12, 2, FOX.b);
    s.rect(4, 11, 3, 2, SOCK.b);
    // front paws stretched down by the nose
    s.thick(17, 17, 21, 24, 2, FOX.b);
    s.rect(21, 23, 2, 3, SOCK.b);
    s.px(23, 25, SOCK.b);
    s.poly([[15, 14], [18, 13], [20, 17], [17, 18]], FOX_W.b);
    // head pointing down at the ground, ears laid back
    s.tri(14, 17, 12, 13, 17, 16, FOX.d1);
    s.px(13, 14, SOCK.d1);
    vol(s, FOX, (m) => {
        m.oval(14, 15, 7, 7, W);
        m.poly([[17, 20], [21, 26.5], [19, 27.5], [15, 21]], W);
    });
    s.tri(16, 16, 15, 12, 19, 15, FOX.b);
    s.px(15, 13, SOCK.d1);
    s.poly([[14, 20], [17, 20], [20.5, 27], [18.5, 27.5]], FOX_W.b);
    s.px(18, 18, INK);
    s.px(19, 18, INK);
    s.px(19, 26, FOX_NOSE);
    s.px(20, 26, FOX_NOSE);
    s.px(20, 27, FOX_NOSE);
}

const foxDef = {
    name: 'a-fox',
    sheet: 'animals-forest',
    w: 26,
    h: 17,
    anchor: [13, 16],
    anims: {
        idle: [
            (s) => { foxStand(s, {}); s.point('head', 20, 1); },
            (s) => { foxStand(s, { tail: 1, head: { ears: 'forward' } }); s.point('head', 20, 1); }
        ],
        blink: [(s) => foxStand(s, { head: { eyes: 'closed' } })],
        walk: [0, 1, 2, 3].map((f) => (s) => foxStand(s, {
            legs: [[2, -2, -2, 2], [0, 0, 0, 0], [-2, 2, 2, -2], [0, 0, 0, 0]][f],
            lift: [[0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 1, 0]][f],
            bob: f % 2 ? -1 : 0,
            tail: f % 2
        })),
        eat: [(s) => foxEat(s, 0), (s) => foxEat(s, 1)],
        look: [(s) => foxStand(s, { front: true })],
        special: { w: 28, h: 28, anchor: [14, 27], frames: [0, 1, 2].map((f) => (s) => foxPounce(s, f)) },
        peek: { w: 15, h: 14, anchor: [7, 13], frames: [(s) => {
            s.rect(4, 10, 7, 4, FOX.b);
            s.rect(5, 10, 5, 4, FOX_W.b);
            foxFace(s, 1, 2);
        }] }
    }
};

// ===========================================================================
// UGGLA – tawny owl (~11×13), perched
// ===========================================================================
const OWL = ramp('#a86a3c');
const OWL_DISC = { b: '#e9c796', d1: '#c99a66', l1: '#f7e2bc' };
const OWL_CHEST = { b: '#d9a56a', d1: '#b37a48', l1: '#ecc48e' };
const OWL_BEAK = '#f2c05a';
const OWL_FOOT = '#d8b060';
const OWL_EYE = '#2a1a2a';

/**
 * Perched owl, toes on row 14 (the branch).
 * pose: eyes ('open'|'closed'|'wide'|'sleep'), look (face turned to camera),
 *       tilt (-1|0|1 head tilt), fluff (sleeping puff), bob, beak ('shut'|'hoo')
 */
function owlPerched(s, p = {}) {
    const { eyes = 'open', look = false, tilt = 0, fluff = 0, bob = 0, beak = 'shut' } = p;
    const y = bob;
    const turn = look ? 0 : 1;          // idle face turned a little to the right
    // round body, fluffed wider when asleep
    vol(s, OWL, (m) => m.oval(2 - fluff, 5 + y, 10 + fluff * 2, 9 - y, W));
    // pale streaked chest
    s.oval(4 + turn, 8 + y, 6 - turn, 6 - y, OWL_CHEST.b);
    s.hline(5 + turn, 8, 13, OWL_CHEST.d1);
    for (const [cx, cy] of [[5, 9], [7, 10], [5, 11], [8, 11], [6, 12]]) s.px(cx + turn, cy + y, OWL_CHEST.d1);
    // folded near wing with a row of pale spots, far wing edge
    vol(s, OWL, (m) => m.oval(1 - fluff, 7 + y, 5, 7 - y, W));
    s.px(2 - fluff, 9 + y, OWL_DISC.l1);
    s.px(3 - fluff, 11 + y, OWL_DISC.l1);
    s.px(2 - fluff, 12 + y, OWL_DISC.l1);
    vol(s, OWL, (m) => m.oval(10 + fluff, 8 + y, 3, 5 - y, W), { light: false });
    // toes gripping the branch
    s.hline(4, 5, 14, OWL_FOOT);
    s.hline(8, 9, 14, OWL_FOOT);
    // big round head
    const hx = 1 + turn + tilt;
    const hy = y;
    vol(s, OWL, (m) => m.oval(hx - turn, hy, 12, 10, W));
    // facial discs with a darker rim, pale eyebrows in a V
    s.oval(hx, hy + 2, 5, 6, OWL.d1);
    s.oval(hx + 5, hy + 2, 5 - turn, 6, OWL.d1);
    s.oval(hx + 1, hy + 2, 4, 5, OWL_DISC.b);
    s.oval(hx + 5, hy + 2, 4 - turn, 5, OWL_DISC.b);
    s.px(hx + 1, hy + 3, OWL_DISC.b);
    s.line(hx + 3, hy + 1, hx + 4, hy + 3, OWL_DISC.l1);
    s.line(hx + 6, hy + 1, hx + 5, hy + 3, OWL_DISC.l1);
    // eyes (left eye a pixel higher when the head tilts right, and vice versa)
    const ey1 = hy + 3 + (tilt < 0 ? 1 : 0);
    const ey2 = hy + 3 + (tilt > 0 ? 1 : 0);
    const eyeAt = (ex, ey, w) => {
        if (eyes === 'open') {
            s.rect(ex, ey, w, 3, OWL_EYE);
            s.px(ex + w - 2, ey, SPARK);
        } else if (eyes === 'wide') {
            s.rect(ex, ey - 1, w, 4, OWL_EYE);
            s.px(ex + w - 2, ey - 1, SPARK);
            s.px(ex + w - 1, ey, SPARK);
        } else if (eyes === 'sleep') {
            s.px(ex, ey + 1, OWL_EYE);
            s.px(ex + 1, ey + 2, OWL_EYE);
            if (w > 2) s.px(ex + 2, ey + 1, OWL_EYE);
        } else {
            s.hline(ex, ex + w - 1, ey + 1, OWL_EYE);
        }
    };
    eyeAt(hx + 1, ey1, 3);
    eyeAt(hx + 6, ey2, 3 - turn);
    // beak
    const bx = hx + 4;
    s.px(bx, hy + 5, OWL_BEAK);
    s.px(bx + 1, hy + 5, OWL_BEAK);
    if (beak === 'hoo') {
        s.hline(bx, bx + 1, hy + 6, '#9c3048');
        s.hline(bx, bx + 1, hy + 7, OWL_BEAK);
    } else {
        s.px(bx, hy + 6, OWL_BEAK);
    }
    s.px(hx, hy + 6, BLUSH);
    s.px(hx + 9 - turn, hy + 6, BLUSH);
}

// Owl wings in flight (left wing; the shoulder is on the right edge)
const OWL_WINGS = [
    [
        '##..........',
        '###.........',
        '.####.......',
        '..######....',
        '...########.',
        '....########',
        '......######',
        '........####'
    ],
    [
        '....#####...',
        '.##########.',
        '############',
        '#.#.########',
        '......######',
        '........####'
    ],
    [
        '.......#####',
        '.....#######',
        '...########.',
        '..######....',
        '.#####......',
        '####........',
        '#.#.........'
    ]
];
const OWL_WING_Y = [0, 4, 6];
const OWL_WING_BARS = [[[3, 2], [6, 4], [9, 5]], [[3, 2], [6, 2], [9, 3]], [[3, 4], [6, 3], [9, 2]]];

function owlFly(s, f) {
    // front view with the wings spread, anchor = body centre
    const rows = OWL_WINGS[f];
    const wy = OWL_WING_Y[f];
    // far (right) wing, then body, then near (left) wing
    vol(s, OWL, (m) => mapMask(m, 15, wy, rows, true));
    vol(s, OWL, (m) => {
        m.oval(10, 4, 8, 10, W);
        m.tri(11, 12, 16, 12, 13.5, 15, W);
    });
    vol(s, OWL, (m) => mapMask(m, 0, wy, rows, false));
    for (const [bx, by] of OWL_WING_BARS[f]) {
        s.px(bx, wy + by, OWL_DISC.l1);
        s.px(26 - bx, wy + by, OWL_DISC.b);
    }
    // round face looking ahead
    s.oval(10, 4, 8, 7, OWL.d1);
    s.oval(10, 5, 4, 5, OWL_DISC.b);
    s.oval(14, 5, 4, 5, OWL_DISC.b);
    s.line(12, 4, 13, 5, OWL_DISC.l1);
    s.line(15, 4, 14, 5, OWL_DISC.l1);
    s.rect(11, 6, 2, 2, OWL_EYE);
    s.rect(15, 6, 2, 2, OWL_EYE);
    s.px(12, 6, SPARK);
    s.px(16, 6, SPARK);
    s.px(13, 8, OWL_BEAK);
    s.px(14, 8, OWL_BEAK);
    s.px(13, 9, OWL_BEAK);
    s.oval(11, 11, 6, 3, OWL_CHEST.b);
    s.px(12, 12, OWL_CHEST.d1);
    s.px(15, 12, OWL_CHEST.d1);
    s.hline(12, 13, 15, OWL_FOOT);
    s.hline(14, 15, 15, OWL_FOOT);
}

const owlDef = {
    name: 'a-owl',
    sheet: 'animals-forest',
    w: 14,
    h: 15,
    anchor: [6, 14],
    anims: {
        idle: [
            (s) => { owlPerched(s, {}); s.point('head', 7, 0); },
            (s) => { owlPerched(s, { bob: 1 }); s.point('head', 7, 1); }
        ],
        blink: [(s) => owlPerched(s, { eyes: 'closed' })],
        sleep: [(s) => owlPerched(s, { eyes: 'sleep', fluff: 1, bob: 1, look: true }), (s) => owlPerched(s, { eyes: 'sleep', fluff: 1, bob: 0, look: true })],
        look: [(s) => owlPerched(s, { look: true, eyes: 'wide' })],
        special: [
            (s) => { owlPerched(s, { eyes: 'wide', tilt: -1, beak: 'hoo' }); s.point('mouth', 5, 6); s.point('head', 6, 0); },
            (s) => { owlPerched(s, { eyes: 'wide', tilt: 1, beak: 'hoo' }); s.point('mouth', 7, 6); s.point('head', 8, 0); }
        ],
        fly: { w: 27, h: 17, anchor: [13, 9], frames: [0, 1, 2].map((f) => (s) => owlFly(s, f)) }
    }
};

// ===========================================================================
// RÅDJUR – roe deer (~22×22) and her spotted fawn (~14×14)
// ===========================================================================
const DEER = ramp('#b9643a');
const DEER_W = { b: '#fff4e6', d1: '#e8d0bc', l1: '#ffffff' };
const DEER_EAR = '#e9a98f';
const HOOF = '#3a2226';
const DEER_NOSE = '#2e1e24';

/** Thin leg from hip to hoof (the last row is the hoof). */
function hoofLeg(s, x0, y0, x1, y1, w, c, hoof = HOOF) {
    s.thick(x0, y0, x1, y1 - (w - 1), w, c);
    const off = Math.floor((w - 1) / 2);
    s.rect(x1 - off, y1, w, 1, hoof);
}

/** Hind leg with a hock: hip -> hock (a little back) -> hoof. */
function hindLeg(s, x0, y0, x1, y1, w, c, hoof = HOOF) {
    const hx = Math.round((x0 + x1) / 2) - 1;
    const hy = Math.round(y0 + (y1 - y0) * 0.45);
    s.thick(x0, y0, hx, hy, w, c);
    hoofLeg(s, hx, hy, x1, y1, w, c, hoof);
}

/** Paint colour c over the pixels of `mask` that fall inside an oval box. */
function clipOval(s, mask, x, y, w, h, c) {
    const t = blankLike(s);
    t.oval(x, y, w, h, W);
    for (let yy = y; yy < y + h; yy += 1) {
        for (let xx = x; xx < x + w; xx += 1) {
            if (t.opaque(xx, yy) && mask.opaque(xx, yy)) s.px(xx, yy, c);
        }
    }
}

/** Filled ellipse centred at (cx, cy) with radii rx, ry, rotated by `a` radians. */
function tiltOval(m, cx, cy, rx, ry, a) {
    const pts = [];
    for (let i = 0; i < 24; i += 1) {
        const t = (Math.PI * 2 * i) / 24;
        const x = rx * Math.cos(t);
        const y = ry * Math.sin(t);
        pts.push([cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
    }
    m.poly(pts, W);
}

/** Big leaf-shaped deer ears; mode 'up' | 'alert' | 'back'. (hx, hy) = skull top-left. */
function deerEars(s, R, hx, hy, mode, k = 0) {
    const tips = {
        up: { far: [hx + 4, hy - 4 + k], near: [hx - 1, hy - 3 + k] },
        alert: { far: [hx + 5, hy - 5 + k], near: [hx + 1, hy - 5 + k] },
        back: { far: [hx + 1, hy - 3 + k], near: [hx - 3, hy - 1 + k] }
    }[mode];
    const leaf = (m, [tx, ty], bx) => m.poly([[bx - 1, hy + 1.5], [tx - 1.2, ty + 1.5], [tx, ty], [tx + 1.2, ty + 1], [bx + 1.8, hy + 1]], W);
    vol(s, { b: R.d1, d1: R.d2, l1: R.b }, (m) => leaf(m, tips.far, hx + 3));
    vol(s, R, (m) => leaf(m, tips.near, hx + 1));
    // warm inner ear
    const [nx, ny] = tips.near;
    s.line(nx + 1, ny + 2, hx + 1, hy, DEER_EAR);
}

/** Side-view deer head; (hx, hy) = top-left of the skull. small = fawn proportions. */
function deerHead(s, hx, hy, { eyes = 'open', ears = 'up', mouth = 'shut', small = false } = {}) {
    const R = small ? FAWN : DEER;
    const k = small ? 1 : 0;
    deerEars(s, R, hx, hy, ears, k);
    // round skull and a slim, blunt muzzle
    vol(s, R, (m) => {
        m.oval(hx, hy, 7 - k, 6, W);
        m.poly([[hx + 4, hy + 1.5], [hx + 9.5 - k * 2, hy + 3], [hx + 9.5 - k * 2, hy + 5.5], [hx + 5, hy + 6.5 - k]], W);
    });
    // black nose, white upper lip and chin
    const nx = hx + 9 - k * 2;
    s.px(nx, hy + 3, DEER_NOSE);
    s.px(nx, hy + 4, DEER_NOSE);
    s.px(nx - 1, hy + 3, DEER_NOSE);
    s.px(nx - 1, hy + 5, DEER_W.b);
    s.px(nx - 2, hy + 5, DEER_W.b);
    if (!small) s.px(nx - 1, hy + 4, DEER_W.b);
    if (mouth === 'eat') s.px(nx, hy + 5, '#6aa84a');
    eye2(s, hx + 4 - k, hy + 2, eyes);
    s.px(hx + 2, hy + 4, BLUSH);
}

/** Deer face turned to the camera; (hx, hy) = top-left of the face (9 wide). */
function deerFace(s, hx, hy, { small = false } = {}) {
    const R = small ? FAWN : DEER;
    const k = small ? 1 : 0;
    // big ears angled up and out
    const earL = (m) => m.poly([[hx + 2, hy + 2.5], [hx - 2, hy + 1], [hx - 3.5, hy - 1], [hx - 1, hy - 1.5], [hx + 2.5, hy + 0.5]], W);
    const earR = (m) => m.poly([[hx + 7 - k, hy + 2.5], [hx + 11 - k, hy + 1], [hx + 12.5 - k, hy - 1], [hx + 10 - k, hy - 1.5], [hx + 6.5 - k, hy + 0.5]], W);
    vol(s, R, (m) => { earL(m); earR(m); });
    s.line(hx - 1, hy, hx + 1, hy + 1, DEER_EAR);
    s.line(hx + 10 - k, hy, hx + 8 - k, hy + 1, DEER_EAR);
    // round brow tapering to the muzzle
    vol(s, R, (m) => {
        m.oval(hx, hy - 1, 9 - k, 7, W);
        m.oval(hx + 2, hy + 3, 5 - k, 6 - k, W);
    });
    const cx = hx + 4 - (k ? 1 : 0);
    s.rect(cx - 1, hy + 7 - k, 3, 1, DEER_W.b);
    s.hline(cx - 1, cx + 1, hy + 6 - k, DEER_NOSE);
    s.px(cx, hy + 7 - k, DEER_NOSE);
    eye2(s, hx + 1, hy + 2, 'open');
    eye2(s, hx + 6 - k, hy + 2, 'open');
    s.px(hx + 1, hy + 4, BLUSH);
    s.px(hx + 7 - k, hy + 4, BLUSH);
}

/**
 * Standing / walking roe deer, hooves on row 23.
 * legs: hoof x offsets [backFar, backNear, frontFar, frontNear]; lift raises hooves.
 */
function deerStand(s, p = {}) {
    const { legs = [0, 0, 0, 0], lift = [0, 0, 0, 0], bob = 0, head = {}, front = false, neck = 0 } = p;
    const G = 23;
    const y = bob;
    // far legs
    hindLeg(s, 9, 15 + y, 9 + legs[0], G - lift[0], 2, DEER.d1);
    hoofLeg(s, 16, 15 + y, 16 + legs[2], G - lift[2], 2, DEER.d1);
    // body with the white rump patch inside its outline
    const body = vol(s, DEER, (m) => m.oval(4, 10 + y, 15, 7, W));
    s.hline(8, 15, 16 + y, DEER.d1);
    clipOval(s, body, 3, 10 + y, 4, 6, DEER_W.b);
    s.px(4, 11 + y, DEER_W.l1);
    // near legs
    hindLeg(s, 7, 15 + y, 7 + legs[1], G - lift[1], 2, DEER.b);
    hoofLeg(s, 17, 15 + y, 17 + legs[3], G - lift[3], 2, DEER.b);
    s.px(7, 15 + y, DEER.l1);
    // neck, leaning forward to the head
    const hy = 4 + y - neck;
    vol(s, DEER, (m) => m.poly([[14, 12 + y], [17, hy + 3], [21, hy + 4], [19, 14 + y]], W));
    s.line(18, hy + 6, 18, 11 + y, DEER.l1);
    if (front) deerFace(s, 15, hy);
    else deerHead(s, 17, hy, head);
}

function deerGraze(s, f) {
    // head down in the grass, munching
    const G = 23;
    hindLeg(s, 9, 15, 9, G, 2, DEER.d1);
    hoofLeg(s, 16, 15, 17, G, 2, DEER.d1);
    const body = vol(s, DEER, (m) => m.oval(4, 10, 15, 7, W));
    s.hline(8, 15, 16, DEER.d1);
    clipOval(s, body, 3, 10, 4, 6, DEER_W.b);
    s.px(4, 11, DEER_W.l1);
    hindLeg(s, 7, 15, 7, G, 2, DEER.b);
    hoofLeg(s, 18, 15, 19, G, 2, DEER.b);
    // neck arching down
    vol(s, DEER, (m) => m.poly([[15, 11], [19, 10], [23, 17], [20, 19]], W));
    // head tipped down, muzzle in the grass
    const hy = 13 + f;
    deerEars(s, DEER, 18, hy, 'back');
    vol(s, DEER, (m) => {
        m.oval(19, hy, 6, 6, W);
        m.poly([[21, hy + 3], [25.5, hy + 7.5], [24, hy + 9.5], [19.5, hy + 5]], W);
    });
    s.px(25, hy + 8, DEER_NOSE);
    s.px(25, hy + 7, DEER_NOSE);
    s.px(23, hy + 8, DEER_W.b);
    eye2(s, 21, hy + 2, 'happy');
    s.px(20, hy + 4, BLUSH);
    if (f === 0) s.px(26, hy + 9, '#6aa84a');
    s.point('mouth', 25, 23);
}

function deerLeap(s, f) {
    // ground row 29. 0 alert, 1 push off, 2 bounding leap
    const G = 29;
    if (f === 0) {
        // standing tall: head high, ears up, eyes wide, rump flared
        hindLeg(s, 11, 21, 11, G, 2, DEER.d1);
        hoofLeg(s, 18, 21, 18, G, 2, DEER.d1);
        const body = vol(s, DEER, (m) => m.oval(6, 16, 15, 7, W));
        s.hline(10, 17, 22, DEER.d1);
        clipOval(s, body, 5, 15, 5, 7, DEER_W.b);
        s.px(6, 17, DEER_W.l1);
        hindLeg(s, 9, 21, 9, G, 2, DEER.b);
        hoofLeg(s, 19, 21, 19, G, 2, DEER.b);
        vol(s, DEER, (m) => m.poly([[16, 18], [19, 9], [23, 9], [21, 20]], W));
        deerHead(s, 18, 6, { ears: 'alert', eyes: 'wide' });
        return;
    }
    if (f === 1) {
        // gathering to spring: hind legs crouched, front legs folded, body tipped up
        s.thick(9, 23, 6, 26, 2, DEER.d1);
        hoofLeg(s, 6, 26, 9, G, 2, DEER.d1);
        s.thick(19, 20, 22, 23, 2, DEER.d1);
        s.thick(22, 23, 20, 25, 2, DEER.d1);
        const body = vol(s, DEER, (m) => tiltOval(m, 13.5, 21, 8, 3.8, -0.38));
        clipOval(s, body, 4, 20, 5, 6, DEER_W.b);
        s.px(6, 21, DEER_W.l1);
        s.thick(11, 23, 8, 27, 2, DEER.b);
        hoofLeg(s, 8, 27, 11, G, 2, DEER.b);
        s.thick(20, 19, 24, 22, 2, DEER.b);
        s.thick(24, 22, 22, 24, 2, DEER.b);
        s.px(22, 25, HOOF);
        s.px(21, 25, HOOF);
        vol(s, DEER, (m) => m.poly([[16, 18], [19, 10], [23, 11], [21, 19]], W));
        deerHead(s, 19, 7, { ears: 'back' });
        return;
    }
    // flying through the air, legs stretched fore and aft
    hoofLeg(s, 8, 15, 3, 20, 2, DEER.d1);
    hoofLeg(s, 19, 15, 25, 18, 2, DEER.d1);
    const body = vol(s, DEER, (m) => m.oval(5, 10, 16, 7, W));
    s.hline(9, 17, 16, DEER.d1);
    clipOval(s, body, 4, 10, 4, 6, DEER_W.b);
    s.px(5, 11, DEER_W.l1);
    hoofLeg(s, 7, 15, 1, 18, 2, DEER.b);
    hoofLeg(s, 18, 15, 25, 16, 2, DEER.b);
    vol(s, DEER, (m) => m.poly([[16, 12], [19, 5], [23, 6], [21, 14]], W));
    deerHead(s, 18, 2, { ears: 'back' });
}

const deerDef = {
    name: 'a-deer',
    sheet: 'animals-forest',
    w: 28,
    h: 24,
    anchor: [12, 23],
    anims: {
        idle: [
            (s) => { deerStand(s, {}); s.point('head', 19, 0); },
            (s) => { deerStand(s, { bob: 1, head: { ears: 'alert' } }); s.point('head', 19, 0); }
        ],
        blink: [(s) => deerStand(s, { head: { eyes: 'closed' } })],
        walk: [0, 1, 2, 3].map((f) => (s) => deerStand(s, {
            legs: [[2, -2, -2, 2], [0, 0, 0, 0], [-2, 2, 2, -2], [0, 0, 0, 0]][f],
            lift: [[0, 0, 0, 0], [2, 0, 0, 2], [0, 0, 0, 0], [0, 2, 2, 0]][f],
            bob: f % 2 ? -1 : 0
        })),
        eat: [(s) => deerGraze(s, 0), (s) => deerGraze(s, 1)],
        look: [(s) => deerStand(s, { front: true })],
        special: { w: 31, h: 30, anchor: [14, 29], frames: [0, 1, 2].map((f) => (s) => deerLeap(s, f)) }
    }
};

// ---------------------------------------------------------------------------
// The fawn: short body, long legs, big head, white spots along the back
// ---------------------------------------------------------------------------
const FAWN = ramp('#c9824a');
const SPOT = '#fff3de';

function fawnSpots(s, x, y) {
    for (const [dx, dy] of [[1, 1], [4, 0], [7, 1], [3, 2], [6, 3], [9, 2], [0, 3], [5, 2]]) s.px(x + dx, y + dy, SPOT);
}

/** Fawn, hooves on row 16. */
function fawnStand(s, p = {}) {
    const { legs = [0, 0, 0, 0], lift = [0, 0, 0, 0], bob = 0, head = {}, front = false } = p;
    const G = 16;
    const y = bob;
    hoofLeg(s, 6, 10 + y, 6 + legs[0], G - lift[0], 1, FAWN.d1);
    hoofLeg(s, 11, 10 + y, 11 + legs[2], G - lift[2], 1, FAWN.d1);
    const body = vol(s, FAWN, (m) => m.oval(3, 7 + y, 11, 5, W));
    clipOval(s, body, 2, 7 + y, 3, 4, DEER_W.b);
    fawnSpots(s, 4, 7 + y);
    hoofLeg(s, 4, 10 + y, 4 + legs[1], G - lift[1], 1, FAWN.b);
    hoofLeg(s, 13, 10 + y, 13 + legs[3], G - lift[3], 1, FAWN.b);
    s.px(5, 11 + y, FAWN.b);
    s.px(12, 11 + y, FAWN.b);
    vol(s, FAWN, (m) => m.poly([[10, 9 + y], [12, 6 + y], [15, 7 + y], [14, 10 + y]], W));
    if (front) deerFace(s, 9, 3 + y, { small: true });
    else deerHead(s, 11, 3 + y, { small: true, ...head });
}

function fawnGraze(s, f) {
    const G = 16;
    hoofLeg(s, 6, 10, 6, G, 1, FAWN.d1);
    hoofLeg(s, 11, 10, 12, G, 1, FAWN.d1);
    const body = vol(s, FAWN, (m) => m.oval(3, 7, 11, 5, W));
    clipOval(s, body, 2, 7, 3, 4, DEER_W.b);
    fawnSpots(s, 4, 7);
    hoofLeg(s, 4, 10, 4, G, 1, FAWN.b);
    hoofLeg(s, 13, 10, 14, G, 1, FAWN.b);
    vol(s, FAWN, (m) => m.poly([[10, 8], [13, 7], [16, 11], [14, 13]], W));
    const hy = 8 + f;
    deerEars(s, FAWN, 13, hy, 'back', 1);
    vol(s, FAWN, (m) => {
        m.oval(14, hy, 5, 5, W);
        m.poly([[15, hy + 3], [19.5, hy + 6.5], [18, hy + 7.5], [14, hy + 5]], W);
    });
    s.px(19, hy + 6, DEER_NOSE);
    s.px(18, hy + 6, DEER_NOSE);
    eye2(s, 15, hy + 1, 'happy');
    s.px(15, hy + 3, BLUSH);
    if (f === 0) s.px(19, hy + 7, '#6aa84a');
    s.point('mouth', 18, 16);
}

function fawnHop(s, f) {
    // playful spring: 0 crouch on the ground, 1 all four hooves in the air (ground row 22)
    if (f === 0) fawnStand(shifted(s, 0, 6), { bob: 1, head: { eyes: 'happy' } });
    else fawnStand(s, { legs: [-1, 1, 1, 2], lift: [2, 2, 2, 2], head: { eyes: 'happy', ears: 'alert' } });
}

const fawnDef = {
    name: 'a-fawn',
    sheet: 'animals-forest',
    w: 20,
    h: 17,
    anchor: [9, 16],
    anims: {
        idle: [
            (s) => { fawnStand(s, {}); s.point('head', 12, 0); },
            (s) => { fawnStand(s, { head: { ears: 'alert' } }); s.point('head', 12, 0); }
        ],
        blink: [(s) => fawnStand(s, { head: { eyes: 'closed' } })],
        walk: [0, 1, 2, 3].map((f) => (s) => fawnStand(s, {
            legs: [[1, -1, -1, 1], [0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][f],
            lift: [[0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 1, 0]][f],
            bob: f % 2 ? -1 : 0
        })),
        eat: [(s) => fawnGraze(s, 0), (s) => fawnGraze(s, 1)],
        look: [(s) => fawnStand(s, { front: true })],
        special: { w: 20, h: 23, anchor: [9, 22], frames: [0, 1].map((f) => (s) => fawnHop(s, f)) }
    }
};

// ===========================================================================
// BJÖRN – brown bear (~30×24)
// ===========================================================================
const BEAR = ramp('#8e5a36');
const BEAR_MUZ = { b: '#dcae7c', d1: '#bb8a5a', l1: '#f2cf9f' };
const BEAR_NOSE = '#2e1e24';
const BERRY = { b: '#4a5fc4', l1: '#9fb2ff', d1: '#2f3a86' };

/** Side-view bear head; (hx, hy) = top-left of the 12×11 skull. */
function bearHead(s, hx, hy, { eyes = 'open', mouth = 'shut', ear = 0 } = {}) {
    // round ears
    vol(s, BEAR, (m) => m.oval(hx + 1, hy - 2 + ear, 5, 5, W));
    s.rect(hx + 2, hy - 1 + ear, 2, 2, BEAR_MUZ.d1);
    vol(s, BEAR, (m) => m.oval(hx + 6, hy - 3, 5, 5, W));
    s.rect(hx + 7, hy - 2, 2, 2, BEAR_MUZ.d1);
    // big round head with a light muzzle
    vol(s, BEAR, (m) => {
        m.oval(hx, hy, 12, 11, W);
        m.oval(hx + 8, hy + 4, 6, 6, W);
    });
    s.oval(hx + 8, hy + 5, 6, 5, BEAR_MUZ.b);
    s.hline(hx + 9, hx + 12, hy + 5, BEAR_MUZ.l1);
    s.hline(hx + 9, hx + 12, hy + 9, BEAR_MUZ.d1);
    // nose, eye, mouth
    s.rect(hx + 12, hy + 5, 2, 2, BEAR_NOSE);
    s.px(hx + 12, hy + 5, '#6a4a4e');
    eye2(s, hx + 7, hy + 3, eyes);
    if (mouth === 'open') {
        s.rect(hx + 10, hy + 7, 3, 2, '#9c3048');
        s.px(hx + 11, hy + 8, '#ff9aaa');
    } else if (mouth === 'chew') {
        s.hline(hx + 11, hx + 12, hy + 8, '#9c3048');
    } else {
        s.px(hx + 12, hy + 7, '#7a4a3a');
        s.px(hx + 11, hy + 8, '#7a4a3a');
    }
    s.px(hx + 5, hy + 6, BLUSH);
    s.px(hx + 6, hy + 6, BLUSH);
}

/** Bear face turned to the camera; (hx, hy) = top-left of the 13×11 face. */
function bearFace(s, hx, hy, { eyes = 'open', mouth = 'smile' } = {}) {
    for (const ex of [hx, hx + 9]) {
        vol(s, BEAR, (m) => m.oval(ex, hy - 2, 5, 5, W));
        s.rect(ex + 1, hy - 1, 2, 2, BEAR_MUZ.d1);
    }
    vol(s, BEAR, (m) => m.oval(hx, hy, 14, 11, W));
    s.oval(hx + 4, hy + 5, 6, 5, BEAR_MUZ.b);
    s.hline(hx + 5, hx + 8, hy + 5, BEAR_MUZ.l1);
    s.rect(hx + 6, hy + 5, 2, 2, BEAR_NOSE);
    s.px(hx + 6, hy + 5, '#6a4a4e');
    eye2(s, hx + 3, hy + 3, eyes);
    eye2(s, hx + 9, hy + 3, eyes);
    if (mouth === 'open') {
        s.rect(hx + 6, hy + 8, 2, 1, '#9c3048');
    } else {
        s.px(hx + 5, hy + 8, '#7a4a3a');
        s.px(hx + 8, hy + 8, '#7a4a3a');
        s.hline(hx + 6, hx + 7, hy + 8, BEAR_MUZ.d1);
    }
    s.px(hx + 2, hy + 6, BLUSH);
    s.px(hx + 11, hy + 6, BLUSH);
}

function bearLeg(s, x, top, foot, c, pad) {
    s.rect(x, top, 5, foot - top + 1, c);
    s.hline(x + 1, x + 4, foot, pad);
    s.px(x + 5, foot, c);
}

/**
 * Bear on all fours, paws on row 26.
 * legs: paw x offsets [backFar, backNear, frontFar, frontNear]; lift raises paws.
 */
function bearStand(s, p = {}) {
    const { legs = [0, 0, 0, 0], lift = [0, 0, 0, 0], bob = 0, head = {}, front = false, breathe = 0 } = p;
    const G = 26;
    const y = bob;
    // far legs
    bearLeg(s, 11 + legs[0], 17 + y, G - lift[0], BEAR.d1, BEAR.d2);
    bearLeg(s, 17 + legs[2], 17 + y, G - lift[2], BEAR.d1, BEAR.d2);
    // chunky body with a shoulder hump and a stubby tail
    vol(s, BEAR, (m) => {
        m.oval(3, 8 + y - breathe, 22, 13 + breathe, W);
        m.oval(13, 6 + y, 12, 11, W);
    });
    s.px(3, 10 + y, BEAR.b);
    s.px(2, 11 + y, BEAR.b);
    s.px(4, 11 + y, BEAR.l2);
    // fur tufts
    s.px(8, 10 + y, BEAR.l1);
    s.px(12, 9 + y, BEAR.l1);
    s.px(17, 8 + y, BEAR.l1);
    // near legs
    bearLeg(s, 5 + legs[1], 17 + y, G - lift[1], BEAR.b, BEAR.d1);
    bearLeg(s, 22 + legs[3], 17 + y, G - lift[3], BEAR.b, BEAR.d1);
    s.vline(5 + legs[1], 18 + y, G - 1 - lift[1], BEAR.l1);
    s.vline(22 + legs[3], 18 + y, G - 1 - lift[3], BEAR.l1);
    if (front) bearFace(s, 20, 4 + y, head);
    else bearHead(s, 22, 4 + y, head);
}

function bearEat(s, f) {
    // sitting on its bottom, a paw full of blueberries at its mouth; ground row 27
    const G = 27;
    // back: big round rump and belly
    vol(s, BEAR, (m) => {
        m.oval(3, 11, 20, 17, W);
        m.oval(6, 5, 15, 16, W);
    });
    s.oval(10, 13, 9, 11, BEAR_MUZ.b);
    s.hline(11, 17, 13, BEAR_MUZ.l1);
    // hind leg stretched forward with the sole showing
    vol(s, BEAR, (m) => m.oval(12, 20, 12, 8, W));
    s.oval(21, 20, 4, 7, BEAR_MUZ.d1);
    s.rect(22, 22, 2, 3, BEAR_MUZ.b);
    // head, tipped up a little, mouth by the paw
    bearHead(s, 10, 2 + f, { eyes: 'happy', mouth: f ? 'chew' : 'open' });
    // front paw holding berries up to the mouth
    const py = f ? 13 : 11;
    vol(s, BEAR, (m) => m.poly([[13, 16], [17, 14], [23, py], [24, py + 3], [17, 19]], W));
    vol(s, BEAR, (m) => m.oval(21, py - 1, 5, 5, W));
    // a little heap of blueberries in the paw
    for (const [bx, by] of [[21, py - 2], [23, py - 2], [25, py - 2], [22, py - 4], [24, py - 4]]) {
        s.px(bx, by, BERRY.l1);
        s.px(bx + 1, by, BERRY.b);
        s.px(bx, by + 1, BERRY.b);
        s.px(bx + 1, by + 1, BERRY.d1);
    }
    if (f) {
        s.px(19, 12, BERRY.b);
        s.px(20, 12, BERRY.d1);
    }
    s.point('mouth', 22, 9 + f);
}

function bearWave(s, f) {
    // standing up on the hind legs; feet on row 37
    const G = 37;
    const rise = f === 0;
    // hind legs and feet
    vol(s, BEAR, (m) => {
        m.rect(8, 28, 6, G - 28, W);
        m.rect(15, 28, 6, G - 28, W);
    });
    s.hline(8, 14, G, BEAR.d2);
    s.hline(15, 21, G, BEAR.d2);
    s.hline(15, 21, G, BEAR.d1);
    // tall round body, tan belly
    if (rise) {
        vol(s, BEAR, (m) => m.poly([[7, 30], [9, 18], [17, 13], [25, 16], [24, 30]], W));
        vol(s, BEAR, (m) => m.oval(6, 20, 20, 12, W));
        s.oval(14, 21, 8, 9, BEAR_MUZ.b);
        bearHead(s, 12, 7, { eyes: 'open' });
        // front paws coming up
        vol(s, BEAR, (m) => m.oval(21, 20, 6, 5, W));
        s.px(26, 22, BEAR_MUZ.d1);
        return;
    }
    vol(s, BEAR, (m) => {
        m.oval(5, 12, 19, 21, W);
        m.oval(7, 25, 16, 9, W);
    });
    s.oval(9, 16, 11, 14, BEAR_MUZ.b);
    s.hline(11, 17, 16, BEAR_MUZ.l1);
    s.px(13, 22, BEAR_MUZ.d1);
    s.px(15, 25, BEAR_MUZ.d1);
    // far arm resting on the belly
    vol(s, BEAR, (m) => m.poly([[18, 17], [22, 18], [20, 25], [16, 25]], W));
    // head facing the camera, smiling
    bearFace(s, 7, 4, { eyes: f === 2 ? 'happy' : 'open', mouth: 'open' });
    // near arm raised high, waving
    const hand = f === 1 ? [3, 1] : [1, 4];
    vol(s, BEAR, (m) => {
        m.poly([[5, 17], [8, 16], [hand[0] + 3, hand[1] + 3], [hand[0], hand[1] + 3]], W);
        m.oval(hand[0] - 1, hand[1] - 1, 5, 5, W);
    });
    s.rect(hand[0], hand[1], 3, 2, BEAR_MUZ.d1);
    s.px(hand[0] + 1, hand[1] + 1, BEAR_MUZ.b);
}

const bearDef = {
    name: 'a-bear',
    sheet: 'animals-forest',
    w: 38,
    h: 27,
    anchor: [17, 26],
    anims: {
        idle: [
            (s) => { bearStand(s, {}); s.point('head', 29, 1); },
            (s) => { bearStand(s, { breathe: 1, head: { ear: 1 } }); s.point('head', 29, 1); }
        ],
        blink: [(s) => bearStand(s, { head: { eyes: 'closed' } })],
        walk: [0, 1, 2, 3].map((f) => (s) => bearStand(s, {
            legs: [[2, -2, -2, 2], [0, 0, 0, 0], [-2, 2, 2, -2], [0, 0, 0, 0]][f],
            lift: [[0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 1, 0]][f],
            bob: f % 2 ? -1 : 0
        })),
        eat: { w: 30, h: 28, anchor: [14, 27], frames: [0, 1].map((f) => (s) => bearEat(s, f)) },
        look: [(s) => bearStand(s, { front: true })],
        special: { w: 30, h: 38, anchor: [15, 37], frames: [0, 1, 2].map((f) => (s) => bearWave(s, f)) }
    }
};

// ===========================================================================
// ÄLG – moose, the king of the forest (~36×34)
// ===========================================================================
const MOOSE = ramp('#6c4531');
const MOOSE_LEG = ramp('#b8a088');
const ANTLER = ramp('#ecd6a2');
const ANTLER_FAR = { b: '#c9b08a', l1: '#dcc6a0', d1: '#a48c6a' };
const MOOSE_NOSE = { b: '#8a5c46', d1: '#603d2e', l1: '#a8765c' };

// A broad palmate antler (left-hand palm, the beam leaves at the bottom right).
const PALM = [
    '#..#..#.....',
    '#..#..#..#..',
    '##.##.##.#..',
    '##########..',
    '.##########.',
    '..#########.',
    '....#######.',
    '.......####.',
    '.........###'
];
const PALM_SMALL = [
    '#..#.#....',
    '##.#.##.#.',
    '#########.',
    '.#########',
    '...######.',
    '......####'
];

function mapMask(m, x, y, rows, flip) {
    rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i += 1) {
            if (row[i] !== '#') continue;
            m.px(flip ? x + row.length - 1 - i : x + i, y + j, W);
        }
    });
}

/** Antler with its beam at (bx, by); side -1 spreads left, 1 spreads right. */
function antler(s, bx, by, side, R, rows = PALM) {
    const w = rows[0].length;
    const h = rows.length;
    const x = side < 0 ? bx - w + 1 : bx;
    vol(s, R, (m) => mapMask(m, x, by - h + 1, rows, side > 0));
}

/** Side-view moose head; (hx, hy) = skull top-left. pose 'up' raises the muzzle to bellow. */
function mooseHead(s, hx, hy, { eyes = 'open', pose = 'level', ear = 0, open = 1 } = {}) {
    // far antler spreads forward, near antler back
    antler(s, hx + 5, hy + 1, 1, ANTLER_FAR, PALM_SMALL);
    // long ears pointing back
    vol(s, MOOSE, (m) => m.poly([[hx + 2, hy + 1], [hx - 4, hy - ear], [hx - 4, hy + 2 - ear], [hx + 2, hy + 4]], W));
    s.hline(hx - 3, hx, hy + 1 - ear, MOOSE.l1);
    if (pose === 'up') {
        // head raised, muzzle pointing forward and up, mouth wide open
        vol(s, MOOSE, (m) => {
            m.oval(hx, hy, 9, 8, W);
            m.poly([[hx + 4, hy + 1], [hx + 9, hy - 2], [hx + 13, hy - 4], [hx + 15, hy - 1], [hx + 12, hy + 2], [hx + 7, hy + 6]], W);
        });
        vol(s, MOOSE_NOSE, (m) => m.oval(hx + 11, hy - 5, 6, 5, W));
        s.px(hx + 15, hy - 4, MOOSE.d2);
        // lower jaw dropped, mouth open
        vol(s, MOOSE, (m) => m.poly([[hx + 6, hy + 6], [hx + 12, hy + 3 + open], [hx + 14, hy + 4 + open], [hx + 9, hy + 8 + open]], W));
        s.poly([[hx + 7, hy + 5], [hx + 13, hy + 1], [hx + 14, hy + 3 + open], [hx + 8, hy + 7]], '#9c3048');
        s.px(hx + 11, hy + 4, '#ff9aaa');
        s.hline(hx + 3, hx + 5, hy + 1, MOOSE.l1);
        eye2(s, hx + 4, hy + 2, 'happy');
        s.px(hx + 3, hy + 5, BLUSH);
        s.px(hx + 4, hy + 5, BLUSH);
    } else {
        vol(s, MOOSE, (m) => {
            m.oval(hx, hy, 9, 8, W);
            m.poly([[hx + 5, hy + 1], [hx + 10, hy + 2], [hx + 14, hy + 5], [hx + 14, hy + 9], [hx + 11, hy + 11], [hx + 6, hy + 9]], W);
        });
        // jaw line separating the head from the neck
        s.line(hx + 1, hy + 6, hx + 5, hy + 8, MOOSE.d1);
        s.px(hx + 6, hy + 9, MOOSE.d1);
        // big soft overhanging nose
        vol(s, MOOSE_NOSE, (m) => m.oval(hx + 10, hy + 4, 6, 7, W));
        s.px(hx + 14, hy + 6, MOOSE.d2);
        s.px(hx + 14, hy + 7, MOOSE.d2);
        s.hline(hx + 11, hx + 13, hy + 10, MOOSE.d2);
        // eye under a light brow
        s.hline(hx + 4, hx + 6, hy + 1, MOOSE.l1);
        eye2(s, hx + 5, hy + 2, eyes);
        s.px(hx + 4, hy + 5, BLUSH);
        s.px(hx + 5, hy + 5, BLUSH);
    }
    antler(s, hx + 3, hy + 1, -1, ANTLER, PALM);
}

/** Moose face to the camera: antlers spread like a crown; (hx, hy) = top-left of the face. */
function mooseFace(s, hx, hy) {
    antler(s, hx + 1, hy + 1, -1, ANTLER, PALM);
    antler(s, hx + 8, hy + 1, 1, ANTLER, PALM);
    // ears out to the sides
    vol(s, MOOSE, (m) => {
        m.oval(hx - 3, hy + 2, 5, 3, W);
        m.oval(hx + 8, hy + 2, 5, 3, W);
    });
    s.hline(hx - 2, hx, hy + 3, MOOSE.l1);
    s.hline(hx + 9, hx + 11, hy + 3, MOOSE.l1);
    // long face with a wide soft nose
    vol(s, MOOSE, (m) => {
        m.oval(hx, hy, 10, 9, W);
        m.rect(hx + 2, hy + 5, 6, 5, W);
    });
    vol(s, MOOSE_NOSE, (m) => m.oval(hx + 1, hy + 8, 8, 7, W));
    s.px(hx + 3, hy + 11, MOOSE.d2);
    s.px(hx + 6, hy + 11, MOOSE.d2);
    s.hline(hx + 4, hx + 5, hy + 13, MOOSE.d2);
    s.hline(hx + 1, hx + 2, hy + 2, MOOSE.l1);
    s.hline(hx + 7, hx + 8, hy + 2, MOOSE.l1);
    eye2(s, hx + 1, hy + 3, 'open');
    eye2(s, hx + 7, hy + 3, 'open');
    s.px(hx + 1, hy + 6, BLUSH);
    s.px(hx + 8, hy + 6, BLUSH);
    // the dewlap under the chin
    s.rect(hx + 4, hy + 15, 2, 3, MOOSE.d1);
}

function mooseLeg(s, x, top, foot, c, low) {
    s.rect(x, top, 3, foot - top + 1, c);
    s.rect(x, top + 7, 3, foot - top - 6, low);
    s.hline(x, x + 2, foot, HOOF);
}

function mooseBody(s, y, legs, lift, G) {
    mooseLeg(s, 12 + legs[0], 22 + y, G - lift[0], MOOSE.d1, MOOSE_LEG.d1);
    mooseLeg(s, 23 + legs[2], 22 + y, G - lift[2], MOOSE.d1, MOOSE_LEG.d1);
    // long body with the high shoulder hump and a stubby tail
    vol(s, MOOSE, (m) => {
        m.oval(5, 14 + y, 25, 11, W);
        m.oval(18, 10 + y, 12, 10, W);
    });
    s.px(5, 16 + y, MOOSE.b);
    s.px(4, 17 + y, MOOSE.b);
    s.px(19, 11 + y, MOOSE.l2);
    s.px(20, 11 + y, MOOSE.l1);
    s.px(12, 15 + y, MOOSE.l1);
    mooseLeg(s, 8 + legs[1], 22 + y, G - lift[1], MOOSE.b, MOOSE_LEG.b);
    mooseLeg(s, 27 + legs[3], 22 + y, G - lift[3], MOOSE.b, MOOSE_LEG.b);
    s.vline(8 + legs[1], 29 + y, G - 1 - lift[1], MOOSE_LEG.l1);
    s.vline(27 + legs[3], 29 + y, G - 1 - lift[3], MOOSE_LEG.l1);
}

/**
 * Standing / walking moose, hooves on row 37.
 * legs: hoof x offsets [backFar, backNear, frontFar, frontNear].
 */
function mooseStand(s, p = {}) {
    const { legs = [0, 0, 0, 0], lift = [0, 0, 0, 0], bob = 0, head = {}, front = false, lift2 = 0 } = p;
    const G = 37;
    const y = bob;
    mooseBody(s, y, legs, lift, G);
    // thick neck and the hanging dewlap
    const ny = y - lift2;
    vol(s, MOOSE, (m) => m.poly([[24, 12 + y], [30, 11 + ny], [34, 17 + ny], [28, 23 + y]], W));
    if (front) {
        mooseFace(s, 27, 10 + y);
        return;
    }
    vol(s, MOOSE, (m) => m.poly([[30, 18 + ny], [33, 17 + ny], [33, 22 + ny], [31, 25 + ny], [30, 23 + ny]], W), { light: false });
    mooseHead(s, 30, 9 + ny, head);
}

function mooseEat(s, f) {
    // head down, nibbling the grass
    const G = 37;
    mooseBody(s, 0, [0, 0, 1, 1], [0, 0, 0, 0], G);
    // neck reaching down
    vol(s, MOOSE, (m) => m.poly([[24, 12], [30, 12], [36, 23], [31, 26], [27, 21]], W));
    const hy = 21 + f;
    // head pointing down, antlers tipped forward
    antler(s, 37, hy, 1, ANTLER_FAR, PALM_SMALL);
    vol(s, MOOSE, (m) => {
        m.oval(31, hy, 8, 8, W);
        m.poly([[33, hy + 4], [39, hy + 8], [41, hy + 13], [37, hy + 15], [33, hy + 8]], W);
    });
    vol(s, MOOSE_NOSE, (m) => m.oval(36, hy + 9, 6, 6, W));
    s.px(40, hy + 12, MOOSE.d2);
    eye2(s, 35, hy + 3, 'happy');
    s.px(34, hy + 6, BLUSH);
    antler(s, 34, hy + 1, -1, ANTLER, PALM);
    if (f === 0) {
        s.px(42, 36, '#6aa84a');
        s.px(41, 35, '#8cc45a');
    }
    s.point('mouth', 39, 36);
}

const mooseDef = {
    name: 'a-moose',
    sheet: 'animals-forest',
    w: 46,
    h: 38,
    anchor: [20, 37],
    anims: {
        idle: [
            (s) => { mooseStand(s, {}); s.point('head', 33, 1); },
            (s) => { mooseStand(s, { head: { ear: 1 } }); s.point('head', 33, 1); }
        ],
        blink: [(s) => mooseStand(s, { head: { eyes: 'closed' } })],
        walk: [0, 1, 2, 3].map((f) => (s) => mooseStand(s, {
            legs: [[2, -2, -2, 2], [0, 0, 0, 0], [-2, 2, 2, -2], [0, 0, 0, 0]][f],
            lift: [[0, 0, 0, 0], [2, 0, 0, 2], [0, 0, 0, 0], [0, 2, 2, 0]][f],
            bob: f % 2 ? -1 : 0
        })),
        eat: [(s) => mooseEat(s, 0), (s) => mooseEat(s, 1)],
        look: [(s) => mooseStand(s, { front: true })],
        special: [
            (s) => { mooseStand(s, { head: { pose: 'up', open: 0 }, lift2: 1 }); s.point('mouth', 43, 9); },
            (s) => { mooseStand(s, { head: { pose: 'up', open: 2 }, lift2: 2 }); s.point('mouth', 43, 8); }
        ]
    }
};

// ===========================================================================
// HACKSPETT – great spotted woodpecker (~7×11), clinging to a trunk
// The trunk is on the RIGHT: the bird faces it, feet and stiff tail against
// the bark, beak pecking to the right. Anchor = the feet's grip on the bark.
// ===========================================================================
const WP = {
    K: '#2d2438',     // black
    k: '#4a3f58',     // black, lit edge
    W: '#fbf8f2',     // white
    w: '#e9dcc9',     // buff underside
    R: '#e2383e',     // red
    r: '#b3283c',     // red, shaded
    B: '#6a6070',     // beak
    b: '#9a90a0',     // beak, lit
    F: '#7a6e7c',     // feet
    e: INK,
    s: SPARK
};

const WP_HEAD = [
    '.rRRr.',
    'rRRRRR',
    'KWWeWW',
    'KKWWWW',
    '.KKKW.'
];
const WP_HEAD_FRONT = [
    '.rRRr.',
    'rRRRRr',
    'WeWWeW',
    'KWBBWK',
    '.KWWK.'
];
const WP_BODY = [
    '..kKWw.',
    '.kWWKw.',
    'KWWWKww',
    'KWKWKww',
    'KKKKKwR',
    '.KWKWRR',
    '..KKKRR',
    '...KKK.',
    '....KKK'
];

/** Woodpecker on the trunk (bark to the right). head: 0 rest, -1 drawn back, 1 forward (peck). */
function woodpecker(s, { head = 0, eyes = 'open', front = false } = {}) {
    s.map(2, 5, WP_BODY, WP);
    // feet gripping the bark
    s.hline(9, 10, 9, WP.F);
    s.hline(9, 10, 11, WP.F);
    s.px(9, 10, WP.F);
    if (front) {
        s.map(2, 1, WP_HEAD_FRONT, WP);
        return;
    }
    const hx = 3 + head;
    s.map(hx, 1, WP_HEAD, WP);
    // strong pointed beak toward the trunk
    s.hline(hx + 6, hx + 7 + (head > 0 ? 1 : 0), 3, WP.B);
    s.px(hx + 6, 3, WP.b);
    if (eyes === 'closed') {
        s.px(hx + 3, 3, WP.W);
        s.hline(hx + 2, hx + 3, 3, WP.B);
    } else {
        s.px(hx + 3, 3, INK);
    }
}

function woodpeckerFly(s, f) {
    // side view in flight, anchor = body centre
    const up = f === 0;
    if (up) s.poly([[7, 5], [6, 0], [9, 0], [10, 5]], '#3a3048');
    // tail, body and buff belly
    s.poly([[0, 4], [5, 5], [5, 7], [0, 6]], WP.K);
    s.oval(3, 3, 10, 5, WP.K);
    s.hline(6, 11, 7, WP.w);
    s.hline(8, 11, 6, WP.w);
    s.px(4, 7, WP.R);
    s.px(5, 7, WP.R);
    // head
    s.oval(10, 1, 5, 5, WP.W);
    s.hline(11, 13, 1, WP.R);
    s.hline(10, 14, 2, WP.R);
    s.px(12, 3, INK);
    s.hline(10, 13, 5, WP.K);
    s.px(10, 4, WP.K);
    s.hline(15, 16, 3, WP.B);
    // near wing with white bars
    if (up) {
        s.poly([[6, 5], [4, 0], [7, 0], [10, 5]], WP.K);
        s.px(6, 1, WP.W);
        s.px(7, 3, WP.W);
        s.px(8, 4, WP.W);
    } else {
        s.poly([[6, 5], [4, 11], [7, 11], [10, 5]], WP.K);
        s.px(6, 9, WP.W);
        s.px(7, 7, WP.W);
        s.px(6, 6, WP.W);
    }
}

const woodpeckerDef = {
    name: 'a-woodpecker',
    sheet: 'animals-forest',
    w: 12,
    h: 16,
    anchor: [10, 10],
    anims: {
        idle: [
            (s) => { woodpecker(s, {}); s.point('head', 6, 1); },
            (s) => { woodpecker(s, { head: -1 }); s.point('head', 5, 1); }
        ],
        blink: [(s) => woodpecker(s, { eyes: 'closed' })],
        special: [
            (s) => { woodpecker(s, { head: -1 }); s.point('beak', 9, 3); },
            (s) => { woodpecker(s, { head: 1 }); s.point('beak', 12, 3); }
        ],
        look: [(s) => woodpecker(s, { front: true })],
        fly: { w: 18, h: 13, anchor: [8, 6], frames: [0, 1].map((f) => (s) => woodpeckerFly(s, f)) }
    }
};

// ===========================================================================
// LODJUR – lynx (~22×16): a big, gentle spotted cat
// ===========================================================================
const LYNX = ramp('#c8a47c');
const LYNX_W = { b: '#f7ecdc', d1: '#dcc9b0', l1: '#ffffff' };
const LYNX_SPOT = '#8e684c';
const TUFT = '#2e2230';
const LYNX_NOSE = '#e0868e';

/** Lynx head, 3/4 or front. (hx, hy) = top-left of the 12×10 face; look shifts features. */
function lynxHead(s, hx, hy, { eyes = 'open', mouth = 'smile', look = 1, tongue = false } = {}) {
    // tall ears with black tufts
    for (const [ex, dir] of [[hx, -1], [hx + 8, 1]]) {
        s.tri(ex, hy + 3, ex + 1 + (dir > 0 ? 1 : 0), hy - 3, ex + 4, hy + 3, LYNX.b);
        s.px(ex + 1 + (dir > 0 ? 1 : 0), hy - 2, TUFT);
        s.px(ex + 1 + (dir > 0 ? 1 : 0), hy - 3, TUFT);
        s.px(ex + 2, hy + 1, LYNX_W.d1);
    }
    // cheek ruff flaring out below the ears
    vol(s, LYNX_W, (m) => {
        m.poly([[hx - 1, hy + 5], [hx + 2, hy + 4], [hx + 6, hy + 10], [hx + 1, hy + 10], [hx - 2, hy + 8]], W);
        m.poly([[hx + 13, hy + 5], [hx + 10, hy + 4], [hx + 6, hy + 10], [hx + 11, hy + 10], [hx + 14, hy + 8]], W);
    });
    s.px(hx, hy + 7, LYNX_SPOT);
    s.px(hx + 12, hy + 7, LYNX_SPOT);
    // round face
    vol(s, LYNX, (m) => m.oval(hx, hy + 1, 13, 9, W));
    // white muzzle, forehead marks
    s.oval(hx + 3 + look, hy + 5, 7, 4, LYNX_W.b);
    s.px(hx + 5 + look, hy + 2, LYNX_SPOT);
    s.px(hx + 7 + look, hy + 2, LYNX_SPOT);
    s.px(hx + 6 + look, hy + 3, LYNX_SPOT);
    // eyes
    const ey = hy + 4;
    const e1 = hx + 3 + look;
    const e2 = hx + 8 + look;
    if (eyes === 'open') {
        eye2(s, e1, ey, 'open');
        eye2(s, e2, ey, 'open');
    } else if (eyes === 'happy') {
        s.px(e1, ey + 1, INK); s.px(e1 + 1, ey, INK);
        s.px(e2, ey, INK); s.px(e2 + 1, ey + 1, INK);
    } else {
        s.hline(e1, e1 + 1, ey + 1, INK);
        s.hline(e2, e2 + 1, ey + 1, INK);
    }
    // nose and mouth
    s.hline(hx + 5 + look, hx + 7 + look, hy + 6, LYNX_NOSE);
    s.px(hx + 6 + look, hy + 7, LYNX_NOSE);
    if (mouth === 'open' || tongue) {
        s.px(hx + 5 + look, hy + 8, '#9c3048');
        s.px(hx + 7 + look, hy + 8, '#9c3048');
        s.px(hx + 6 + look, hy + 8, '#ff9aaa');
    } else {
        s.px(hx + 5 + look, hy + 8, '#a8706c');
        s.px(hx + 7 + look, hy + 8, '#a8706c');
    }
    s.px(hx + 2 + look, hy + 7, BLUSH);
    s.px(hx + 11 + look - (look > 0 ? 1 : 0), hy + 7, BLUSH);
}

/** Sitting lynx, paws on row 20. */
function lynxSit(s, p = {}) {
    const { head = {}, bob = 0, tail = 0, lick = 0 } = p;
    const G = 20;
    // short black-tipped tail lying behind
    s.thick(3, G - 1, 0, G - 2 - tail, 2, LYNX.b);
    s.rect(0, G - 3 - tail, 2, 2, TUFT);
    // haunch and chest
    vol(s, LYNX, (m) => {
        m.oval(2, 10 + bob, 13, 11 - bob, W);
        m.oval(6, 7 + bob, 10, 11, W);
    });
    s.oval(10, 10 + bob, 6, 8, LYNX_W.b);
    // spots
    for (const [x, yy] of [[4, 14], [6, 12], [5, 17], [8, 15], [7, 18], [9, 12]]) s.px(x, yy + bob, LYNX_SPOT);
    // haunch line and hind paw
    s.px(9, 16, LYNX.d1);
    s.px(10, 17, LYNX.d1);
    s.hline(6, 10, G, LYNX.b);
    // front legs, straight, big paws
    s.rect(11, 15, 2, G - 15, LYNX.d1);
    s.rect(14, 15, 2, G - 15, LYNX.b);
    s.px(14, 15, LYNX.l1);
    s.hline(10, 13, G, LYNX.d1);
    s.hline(13, 16, G, LYNX.b);
    s.px(16, G, LYNX.l1);
    lynxHead(s, 5, 2 + bob, head);
    if (lick) {
        // near front paw raised to the mouth, with a contour where it crosses the body
        const py = lick === 2 ? 11 : 10;
        s.thick(15, 16, 15, py + 1, 4, LYNX.d2, { onlyOver: true });
        s.oval(12, py - 2, 6, 5, LYNX.d2);
        s.thick(15, 16, 15, py + 2, 2, LYNX.b);
        s.vline(14, py + 3, 16, LYNX.l1);
        s.oval(13, py - 1, 4, 3, LYNX_W.b);
        s.px(13, py - 1, '#ffffff');
        s.px(16, py, LYNX_W.d1);
        s.px(14, py + 1, LYNX_W.d1);
        if (lick === 1) {
            s.px(12, py - 1, '#ff9aaa');
            s.px(12, py - 2, '#ff9aaa');
        }
    }
}

/** Side-view lynx head: tufted ears, cheek ruff, short muzzle. (hx, hy) = skull top-left. */
function lynxHeadSide(s, hx, hy, { eyes = 'open', mouth = 'smile' } = {}) {
    // far ear, near ear, black tufts
    s.tri(hx, hy + 2, hx + 1, hy - 2, hx + 3, hy + 1, LYNX.d1);
    s.vline(hx + 1, hy - 4, hy - 2, TUFT);
    s.tri(hx + 3, hy + 2, hx + 5, hy - 3, hx + 7, hy + 2, LYNX.b);
    s.vline(hx + 5, hy - 5, hy - 3, TUFT);
    s.px(hx + 5, hy - 1, LYNX_W.d1);
    s.px(hx + 5, hy, LYNX_W.d1);
    // round head with a short muzzle
    vol(s, LYNX, (m) => {
        m.oval(hx, hy, 9, 7, W);
        m.oval(hx + 5, hy + 2, 5, 4, W);
    });
    // cheek ruff hanging below the jaw, with dark streaks
    vol(s, LYNX_W, (m) => m.poly([[hx, hy + 4], [hx + 5, hy + 5], [hx + 6, hy + 8], [hx + 3, hy + 9], [hx - 1, hy + 7]], W));
    s.px(hx + 1, hy + 6, LYNX_SPOT);
    s.px(hx + 3, hy + 8, LYNX_SPOT);
    // white muzzle, pink nose, spots on the brow
    s.oval(hx + 6, hy + 3, 4, 3, LYNX_W.b);
    s.px(hx + 9, hy + 3, LYNX_NOSE);
    s.px(hx + 8, hy + 3, LYNX_NOSE);
    s.px(hx + 2, hy + 1, LYNX_SPOT);
    s.px(hx + 4, hy + 1, LYNX_SPOT);
    eye2(s, hx + 5, hy + 2, eyes);
    if (mouth === 'open') {
        s.px(hx + 8, hy + 5, '#9c3048');
        s.px(hx + 9, hy + 5, '#ff9aaa');
    }
    s.px(hx + 3, hy + 4, BLUSH);
}

/** Standing / walking lynx, paws on row 15. */
function lynxStand(s, p = {}) {
    const { legs = [0, 0, 0, 0], lift = [0, 0, 0, 0], bob = 0, head = {}, headDown = 0 } = p;
    const G = 15;
    const y = bob;
    const leg = (x, dx, l, c) => {
        s.rect(x + dx, 10 + y, 2, G - 10 - y - l + 1, c);
        s.rect(x + dx, G - l, 3, 1, c);
    };
    leg(8, legs[0], lift[0], LYNX.d1);
    leg(14, legs[2], lift[2], LYNX.d1);
    // short black-tipped tail, perked up
    s.thick(6, 7 + y, 3, 4 + y, 2, LYNX.b);
    s.rect(2, 3 + y, 2, 2, TUFT);
    // long body with spots
    vol(s, LYNX, (m) => m.oval(5, 6 + y, 14, 6, W));
    s.hline(8, 15, 11 + y, LYNX_W.d1);
    for (const [x, yy] of [[7, 8], [10, 7], [13, 8], [9, 10], [12, 10], [16, 9]]) s.px(x, yy + y, LYNX_SPOT);
    leg(6, legs[1], lift[1], LYNX.b);
    leg(16, legs[3], lift[3], LYNX.b);
    lynxHeadSide(s, 15, 3 + y + headDown, head);
}

function lynxEat(s, f) {
    lynxStand(s, { headDown: 3 + f, head: { eyes: 'happy', mouth: f ? 'smile' : 'open' } });
    s.point('mouth', 24, 14);
}

const lynxDef = {
    name: 'a-lynx',
    sheet: 'animals-forest',
    w: 20,
    h: 21,
    anchor: [9, 20],
    anims: {
        idle: [
            (s) => { lynxSit(s, {}); s.point('head', 11, 0); },
            (s) => { lynxSit(s, { tail: 1, bob: 0, head: { look: 1 } }); s.point('head', 11, 0); }
        ],
        blink: [(s) => lynxSit(s, { head: { eyes: 'closed' } })],
        walk: { w: 30, h: 16, anchor: [12, 15], frames: [0, 1, 2, 3].map((f) => (s) => lynxStand(s, {
            legs: [[2, -2, -2, 2], [0, 0, 0, 0], [-2, 2, 2, -2], [0, 0, 0, 0]][f],
            lift: [[0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 1, 0]][f],
            bob: f % 2 ? -1 : 0
        })) },
        eat: { w: 30, h: 16, anchor: [12, 15], frames: [0, 1].map((f) => (s) => lynxEat(s, f)) },
        look: [(s) => lynxSit(s, { head: { look: 0 } })],
        special: [
            (s) => lynxSit(s, { lick: 1, head: { eyes: 'happy', tongue: true, look: 1 } }),
            (s) => lynxSit(s, { lick: 2, head: { eyes: 'happy', look: 1 } })
        ]
    }
};

// ===========================================================================
// PROPS – sheet 'props-forest' (anchor bottom-centre unless noted)
// ===========================================================================
const NEEDLE = ramp('#2f5c42');           // spruce needles, blue-green
const GOLD_EDGE = '#c9d67a';              // afternoon sun on the needles
const BARK = ramp('#6f4a36');
const PINE_BARK = ramp('#c8743e');
const MOSS = ramp('#6f9e3a');
const STONE = ramp('#8d8c98');
const WOOD = ramp('#d8b07a');

/** Conical Swedish spruce: drooping tiers from the tip down, trunk stub at the base. */
function spruce(s, cx, base, height, halfW, tiers) {
    const top = base - height + 1;
    // trunk stub
    s.rect(cx - 1, base - 5, 3, 6, BARK.b);
    s.vline(cx - 1, base - 5, base, BARK.l1);
    s.vline(cx + 1, base - 5, base, BARK.d1);
    s.hline(cx - 2, cx + 2, base, BARK.d1);
    const canopyBottom = base - 4;
    const span = canopyBottom - top;
    // bottom tier first, so each tier above overlaps the one below
    for (let k = tiers - 1; k >= 0; k -= 1) {
        const y0 = top + Math.round((span * k) / (tiers + 0.5)) - (k ? 2 : 0);
        const y1 = top + Math.round((span * (k + 1)) / tiers);
        const hw = Math.max(2, Math.round(halfW * (0.25 + 0.75 * (k + 1) / tiers)));
        // tier outline: apex, drooping tips, scalloped skirt
        const pts = [[cx + 0.5, y0], [cx + hw * 0.5 + 0.5, y0 + (y1 - y0) * 0.6], [cx + hw + 0.5, y1 + 1.5]];
        const teeth = Math.max(2, Math.round(hw / 2.5));
        for (let t = teeth - 1; t >= 1; t -= 1) {
            const x = cx - hw + (2 * hw * t) / teeth + 0.5;
            pts.push([x + 1, y1 - 0.5]);
            pts.push([x, y1 + 1]);
        }
        pts.push([cx - hw + 0.5, y1 + 1.5]);
        pts.push([cx - hw * 0.5 + 0.5, y0 + (y1 - y0) * 0.6]);
        const m = vol(s, NEEDLE, (mm) => mm.poly(pts, W));
        for (let y = y0; y <= y1 + 2; y += 1) {
            let first = true;
            for (let x = cx - hw - 1; x <= cx + hw + 1; x += 1) {
                if (!m.opaque(x, y)) continue;
                const lowest = !m.opaque(x, y + 1);
                if (lowest) s.px(x, y, NEEDLE.d2);
                else if (x > cx + 1 + (y - y0) * 0.12) s.px(x, y, NEEDLE.d1);
                else if (first) s.px(x, y, (y - y0) % 3 === 1 ? GOLD_EDGE : NEEDLE.l1);
                first = false;
            }
        }
        // sunlit tip of the left branch and a highlight tuft near the apex
        s.px(cx - hw, y1, GOLD_EDGE);
        s.px(cx - hw + 1, y1, NEEDLE.l1);
        s.px(cx - 1, y0 + 2, NEEDLE.l1);
    }
    s.px(cx, top - 1, NEEDLE.l1);
}

/** Leafy clump with volume and a warm sunlit rim on its upper left. */
function clump(s, R, x, y, w, h, gold) {
    const m = vol(s, R, (mm) => mm.oval(x, y, w, h, W));
    for (let xx = x; xx < x + w; xx += 1) {
        for (let yy = y; yy < y + h; yy += 1) {
            if (!m.opaque(xx, yy)) continue;
            const edgeTop = !m.opaque(xx, yy - 1);
            const u = (xx - x) / w;
            if (edgeTop && u < 0.55) s.px(xx, yy, gold);
            else if (edgeTop && u < 0.8) s.px(xx, yy, R.l1);
            else if (!m.opaque(xx, yy - 2) && u < 0.35) s.px(xx, yy, R.l1);
            if (!m.opaque(xx, yy + 1) && u > 0.3) s.px(xx, yy, R.d2);
        }
    }
    return m;
}

/** Tall Scots pine: long orange trunk, a flat clumpy crown at the top. */
function pine(s, cx, base) {
    // trunk: grey-brown at the foot, glowing orange higher up
    for (let y = 17; y <= base; y += 1) {
        // grey-brown at the foot, orange higher up, dithered where they meet
        const t = base - 14 - y;
        const low = t < 0 || (t < 3 && (y + (t === 1 ? 1 : 0)) % 2 === 0 && t !== 2);
        const R = low ? BARK : PINE_BARK;
        const wTrunk = y > base - 3 ? 5 : 3;
        const x0 = cx - Math.floor(wTrunk / 2);
        s.hline(x0, x0 + wTrunk - 1, y, R.b);
        s.px(x0, y, R.l1);
        s.px(x0 + wTrunk - 1, y, R.d1);
        // flaky bark plates
        if (y % 4 === 0) s.px(cx, y, R.d1);
        if (y % 4 === 2) s.px(cx + 1, y, R.d2);
        if (y % 6 === 1 && !low) s.px(cx - 1, y, PINE_BARK.l2);
    }
    s.px(cx - 2, base, BARK.d1);
    s.px(cx + 2, base, BARK.d1);
    // two bare branches reaching for the crown
    s.line(cx, 24, cx - 5, 19, PINE_BARK.d1);
    s.line(cx + 1, 21, cx + 6, 15, PINE_BARK.d1);
    // crown: flat clumps of needles like soft clouds
    const clumps = [
        [cx - 11, 8, 12, 7], [cx - 2, 3, 13, 8], [cx + 3, 10, 9, 6],
        [cx - 7, 1, 10, 6], [cx - 12, 14, 9, 5], [cx + 2, 13, 8, 5]
    ];
    const PN = ramp('#3d6b3e');
    clumps.forEach(([x, y, w, h]) => clump(s, PN, x, y, w, h, GOLD_EDGE));
}

/** Big old tree with a hollow in the trunk; sets points 'hollow' (centre) and 'sill'. */
function bigTree(s) {
    const cx = 22;
    const base = 55;
    const TR = ramp('#7a5a44');
    // gnarled trunk with root flares spreading over the ground
    vol(s, TR, (m) => {
        m.poly([
            [cx - 14, base + 0.5], [cx - 11, base - 2], [cx - 8, base - 6], [cx - 8, 44], [cx - 9, 38], [cx - 7, 30], [cx - 7, 24],
            [cx + 8, 24], [cx + 9, 30], [cx + 8, 36], [cx + 8, base - 6], [cx + 11, base - 2], [cx + 15, base + 0.5]
        ], W);
        m.poly([[cx - 4, base + 0.5], [cx - 1, base - 3], [cx + 3, base - 3], [cx + 6, base + 0.5]], W);
    });
    // bark furrows, a knot, a lit edge on the sunny side
    for (const [x0, y0, x1, y1] of [[cx - 4, 26, cx - 5, 32], [cx - 6, 47, cx - 5, 53], [cx + 5, 25, cx + 6, 31], [cx + 4, 46, cx + 5, 52], [cx, 49, cx - 1, 54], [cx + 2, 24, cx + 1, 28], [cx - 3, 46, cx - 3, 50]]) {
        s.line(x0, y0, x1, y1, TR.d1);
    }
    s.line(cx - 7, 26, cx - 8, 40, TR.l1);
    s.line(cx - 7, 41, cx - 7, base - 7, TR.l1);
    s.oval(cx + 3, 29, 3, 3, TR.d2);
    s.px(cx + 3, 29, TR.l1);
    s.px(cx + 4, 31, TR.l1);
    // moss creeping up the roots
    for (const [x, y] of [[cx - 13, base], [cx - 12, base - 1], [cx - 11, base - 2], [cx - 10, base - 3], [cx - 9, base - 4], [cx - 9, base - 5], [cx - 8, base - 6], [cx + 12, base - 1], [cx + 13, base], [cx + 14, base], [cx - 3, base - 1], [cx - 2, base - 2]]) s.px(x, y, MOSS.b);
    for (const [x, y] of [[cx - 12, base - 2], [cx - 10, base - 4], [cx - 8, base - 7]]) s.px(x, y, MOSS.l1);
    // the hollow: dark oval with a lit lower lip and a shaded upper rim
    const hx = cx - 5;
    const hy = 33;
    s.oval(hx - 1, hy - 1, 12, 14, TR.d1);
    s.oval(hx, hy, 10, 12, '#2a1a24');
    s.oval(hx + 1, hy + 1, 8, 9, '#1f1420');
    s.hline(hx + 2, hx + 7, hy + 12, TR.l1);
    s.hline(hx + 1, hx + 8, hy + 12, TR.l1);
    s.point('hollow', hx + 5, hy + 6);
    s.point('sill', hx + 5, hy + 11);
    // branches into the crown
    s.thick(cx - 6, 26, cx - 13, 18, 3, TR.b);
    s.thick(cx + 6, 25, cx + 13, 17, 3, TR.b);
    s.thick(cx, 24, cx, 16, 4, TR.b);
    // broad leafy crown of clumps
    const CR = ramp('#4d7d38');
    const clumps = [
        [2, 10, 16, 13], [26, 9, 17, 13], [9, 2, 16, 14], [20, 1, 15, 13],
        [13, 12, 18, 11], [0, 17, 12, 9], [32, 16, 12, 9], [6, 19, 11, 7], [27, 19, 11, 7]
    ];
    clumps.forEach(([x, y, w, h]) => clump(s, CR, x, y, w, h, '#d2d879'));
    // a few leaf flecks
    const r = rng(7);
    for (let i = 0; i < 30; i += 1) {
        const x = Math.round(3 + r() * 38);
        const y = Math.round(4 + r() * 20);
        if (s.opaque(x, y - 1) && s.opaque(x, y + 1) && s.opaque(x - 1, y) && s.opaque(x + 1, y)) s.px(x, y, r() < 0.6 ? CR.d1 : CR.l1);
    }
}

function flyAgaric(s, big) {
    const CAP = ramp('#e2322f');
    const STEM = { b: '#f6f0e6', d1: '#dcd0c4', l1: '#ffffff' };
    if (big) {
        // 7×8: dome cap with white dots, a ringed white stem
        vol(s, STEM, (m) => {
            m.rect(2, 3, 3, 5, W);
            m.rect(1, 7, 5, 1, W);
        });
        s.hline(1, 5, 5, STEM.b);
        s.px(5, 5, STEM.d1);
        vol(s, CAP, (m) => m.oval(0, 0, 7, 4, W));
        s.hline(1, 5, 3, CAP.d2);
        for (const [x, y] of [[1, 1], [3, 0], [5, 1], [3, 2]]) s.px(x, y, '#ffffff');
    } else {
        // 5×6
        vol(s, STEM, (m) => m.rect(1, 2, 3, 4, W));
        s.hline(1, 3, 3, STEM.l1);
        vol(s, CAP, (m) => m.oval(0, 0, 5, 3, W));
        s.hline(1, 3, 2, CAP.d2);
        s.px(1, 0, '#ffffff');
        s.px(3, 1, '#ffffff');
    }
}

function chanterelles(s) {
    // two little golden trumpets with wavy caps (7×4)
    const C = ramp('#f0a534');
    s.map(0, 0, [
        'lLLl...',
        '.bbd.Ll',
        '..b..bd',
        '..d..d.'
    ], { L: C.l2, l: C.l1, b: C.b, d: C.d1 });
}

function berryBush(s, kind) {
    const lingon = kind === 'lingon';
    const L = lingon ? ramp('#2f6b40') : ramp('#4f8a3a');
    const B = lingon ? { b: '#e33a3c', l1: '#ffb0a0', d1: '#9c2233' } : { b: '#4a5ccc', l1: '#b8c6ff', d1: '#2c3480' };
    const w = lingon ? 10 : 12;
    const h = lingon ? 6 : 7;
    // leafy mound made of small leaf clusters
    vol(s, L, (m) => {
        m.oval(0, 2, w, h - 2, W);
        m.oval(2, 0, w - 5, h - 2, W);
        m.oval(w - 5, 1, 5, h - 2, W);
    });
    // leaf texture: small light leaves on top, dark gaps below
    const leaves = lingon
        ? [[1, 3], [4, 1], [7, 2], [3, 4], [8, 4]]
        : [[1, 3], [4, 1], [7, 2], [10, 3], [3, 5], [6, 4], [9, 5]];
    for (const [x, y] of leaves) {
        s.px(x, y, L.l1);
        s.px(x + 1, y + 1, L.d1);
    }
    // round berries with a glint
    const spots = lingon
        ? [[2, 2], [5, 3], [6, 3], [3, 4], [7, 1]]
        : [[2, 3], [5, 2], [8, 3], [6, 5], [10, 4]];
    for (const [x, y] of spots) {
        s.px(x, y, B.b);
        s.px(x + 1, y, B.d1);
        s.px(x, y + 1, B.d1);
        s.px(x + 1, y + 1, B.d1);
        s.px(x, y, B.l1);
        s.px(x + 1, y, B.b);
        s.px(x, y + 1, B.b);
    }
}

/** One fern frond: a narrow lance with a serrated (leaflet) edge and a light midrib. */
function frond(s, x0, y0, x1, y1, width, R, parity = 0) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const L = Math.hypot(dx, dy);
    const nx = -dy / L;
    const ny = dx / L;
    const mx = x0 + dx * 0.45;
    const my = y0 + dy * 0.45;
    const m = blankLike(s);
    m.poly([
        [x0 + 0.5 + nx * 0.6, y0 + 0.5 + ny * 0.6], [mx + 0.5 + nx * width / 2, my + 0.5 + ny * width / 2],
        [x1 + 0.5, y1 + 0.5],
        [mx + 0.5 - nx * width / 2, my + 0.5 - ny * width / 2], [x0 + 0.5 - nx * 0.6, y0 + 0.5 - ny * 0.6]
    ], W);
    const ox = s.ox || 0;
    const oy = s.oy || 0;
    for (let y = -oy; y < s.h - oy; y += 1) {
        for (let x = -ox; x < s.w - ox; x += 1) {
            if (!m.opaque(x, y)) continue;
            const edge = !m.opaque(x - 1, y) || !m.opaque(x + 1, y) || !m.opaque(x, y - 1) || !m.opaque(x, y + 1);
            if (edge && (x + y + parity) % 2 === 0 && Math.hypot(x - x0, y - y0) > 1.5) continue;
            const below = !m.opaque(x, y + 1);
            s.px(x, y, below ? R.d1 : edge ? R.b : R.b);
        }
    }
    s.line(x0, y0, x1, y1, R.l1);
    s.px(x1, y1, R.l2);
}

function fern(s, big) {
    const F = ramp('#5c9c3c');
    const back = { b: F.d1, d1: F.d2, l1: F.b, l2: F.l1 };
    if (big) {
        // 12×10: five fronds fanning out of one crown
        frond(s, 6, 9, 0, 6, 4, back, 1);
        frond(s, 6, 9, 12, 6, 4, back, 0);
        frond(s, 6, 9, 1, 1, 5, F, 0);
        frond(s, 6, 9, 11, 1, 5, F, 1);
        frond(s, 6, 9, 6, 0, 4, F, 1);
    } else {
        // 9×8
        frond(s, 4, 7, 0, 3, 4, back, 1);
        frond(s, 4, 7, 8, 3, 4, back, 0);
        frond(s, 4, 7, 4, 0, 4, F, 0);
    }
}

function mossyLog(s) {
    // 26×8 fallen log with a cut end on the right
    const B = BARK;
    vol(s, B, (m) => m.rect(0, 1, 23, 7, W));
    s.px(0, 1, null);
    s.px(0, 7, null);
    // bark cracks
    for (const [x, y] of [[4, 4], [5, 4], [9, 5], [10, 5], [14, 3], [15, 3], [18, 5], [19, 5], [7, 6], [16, 6]]) s.px(x, y, B.d1);
    // cut end with rings
    s.oval(21, 0, 5, 8, WOOD.d1);
    s.oval(22, 1, 3, 6, WOOD.b);
    s.px(23, 3, WOOD.d1);
    s.px(23, 4, WOOD.d1);
    s.px(22, 1, WOOD.l1);
    // moss blanket along the top
    const r = rng(3);
    for (let x = 1; x < 21; x += 1) {
        const d = r() < 0.4 ? 1 : 0;
        s.px(x, 1, MOSS.b);
        if (d || x % 4 === 1) s.px(x, 2, MOSS.d1);
        if (r() < 0.35) s.px(x, 0, MOSS.l1);
    }
    s.px(6, 0, MOSS.l2);
    s.px(12, 0, MOSS.l2);
    // a tiny fly agaric sprouting from the log
    s.hline(16, 18, -2, '#e2322f');
    s.px(17, -2, '#ffffff');
    s.px(15, -1, null);
    s.hline(16, 18, -1, '#b3283c');
    s.px(17, 0, '#f6f0e6');
}

function stump(s) {
    // 10×8 stump: rings on top, roots flaring at the foot
    vol(s, BARK, (m) => {
        m.rect(1, 2, 8, 6, W);
        m.rect(0, 6, 10, 2, W);
    });
    s.vline(3, 4, 6, BARK.d1);
    s.vline(6, 3, 5, BARK.d1);
    s.oval(1, 0, 8, 4, WOOD.b);
    s.hline(2, 7, 0, WOOD.l1);
    s.oval(3, 1, 4, 2, WOOD.d1);
    s.px(4, 1, WOOD.b);
    s.px(5, 1, WOOD.b);
    s.px(0, 7, MOSS.b);
    s.px(1, 6, MOSS.l1);
    s.px(9, 7, MOSS.d1);
}

function mossRock(s, big) {
    const w = big ? 16 : 10;
    const h = big ? 10 : 7;
    const m = vol(s, STONE, (mm) => {
        mm.oval(0, 1, w, h - 1, W);
        mm.rect(1, h - 2, w - 2, 2, W);
    });
    // moss cap spilling over the top
    for (let x = 0; x < w; x += 1) {
        for (let y = 0; y < h; y += 1) {
            if (!m.opaque(x, y)) continue;
            const top = !m.opaque(x, y - 1);
            if (top) {
                s.px(x, y, MOSS.l1);
                const drop = (x * 5 + 3) % 4 === 0 ? 2 : 1;
                for (let d = 1; d <= drop; d += 1) if (m.opaque(x, y + d) && y + d < h - 2) s.px(x, y + d, MOSS.b);
                if (x % 3 === 0 && m.opaque(x, y + 1)) s.px(x, y + 1, MOSS.b);
                break;
            }
        }
    }
    s.px(2, 2, MOSS.l2);
    // lichen dots and a crack
    s.px(w - 4, h - 3, '#c9c7a8');
    s.px(3, h - 3, STONE.l1);
    if (big) {
        s.line(9, 4, 11, 7, STONE.d1);
        s.px(6, 6, '#c9c7a8');
    }
}

function troll(s) {
    // 24×18: a sleeping, moss-haired boulder troll with a big round nose
    const T = ramp('#8e9488');
    const G = 17;
    // lumpy boulder body with stone ears
    vol(s, T, (m) => {
        m.oval(1, 3, 22, 15, W);
        m.oval(0, 9, 7, 9, W);
        m.oval(17, 8, 7, 10, W);
        m.rect(1, 14, 22, 4, W);
    });
    vol(s, T, (m) => {
        m.oval(-1, 8, 4, 5, W);
        m.oval(21, 8, 4, 5, W);
    });
    s.px(0, 10, T.d1);
    s.px(22, 10, T.d1);
    // shaggy moss hair draped over the crown, strands hanging over the brow
    vol(s, MOSS, (m) => {
        m.oval(2, 0, 20, 9, W);
        for (const [x, len] of [[3, 2], [5, 3], [7, 1], [9, 2], [12, 3], [14, 1], [16, 2], [18, 3], [20, 1]]) {
            m.rect(x, 6, 2, 2 + len, W);
        }
    });
    for (const [x, y] of [[5, 3], [9, 2], [13, 3], [17, 2], [8, 5], [15, 5]]) s.px(x, y, MOSS.d1);
    for (const [x, y] of [[4, 1], [6, 1], [8, 0], [11, 1]]) s.px(x, y, MOSS.l2);
    // a little fly agaric and a flower growing in the moss
    s.hline(15, 17, -1, '#e2322f');
    s.px(16, -1, '#ffffff');
    s.hline(14, 18, 0, '#e2322f');
    s.px(15, 0, '#ffffff');
    s.px(17, 0, '#b3283c');
    s.px(16, 1, '#f6f0e6');
    s.px(6, 2, '#ffe36a');
    s.px(5, 2, '#f7b8d0');
    s.px(7, 2, '#f7b8d0');
    s.px(6, 1, '#f7b8d0');
    s.px(6, 3, '#f7b8d0');
    // sleepy closed eyes (soft arcs)
    for (const ex of [5, 15]) {
        s.px(ex, 11, '#3a3438');
        s.hline(ex + 1, ex + 2, 12, '#3a3438');
        s.px(ex + 3, 11, '#3a3438');
    }
    // big round friendly nose
    vol(s, { b: '#b3a8a0', l1: '#d2c8bf', d1: '#8a807c' }, (m) => m.oval(8, 9, 8, 7, W));
    s.px(10, 10, '#ece4da');
    s.px(11, 10, '#dcd2c8');
    // a sleepy smile and rosy cheeks
    s.px(8, 16, '#5e5a58');
    s.hline(9, 14, 17 - 0, T.d1);
    s.hline(9, 14, 16, '#5e5a58');
    s.px(15, 16, '#5e5a58');
    s.px(8, 16, '#5e5a58');
    s.px(15, 15, '#5e5a58');
    s.px(8, 15, '#5e5a58');
    s.rect(3, 13, 2, 1, '#e6a3a0');
    s.rect(19, 13, 2, 1, '#e6a3a0');
    // lichen spots, moss at the foot
    s.px(3, 16, '#c9c7a8');
    s.px(20, 15, '#c9c7a8');
    s.px(19, 4 + 12, '#c9c7a8');
    s.hline(0, 4, G, MOSS.b);
    s.hline(1, 2, G - 1, MOSS.l1);
    s.hline(19, 23, G, MOSS.d1);
    s.px(21, G - 1, MOSS.b);
}

/** Half an ellipse standing on row `base`. */
function dome(m, cx, base, rx, ry) {
    const pts = [];
    for (let i = 0; i <= 16; i += 1) {
        const a = (Math.PI * i) / 16;
        pts.push([cx + rx * Math.cos(a), base + 0.5 - ry * Math.sin(a)]);
    }
    m.poly(pts, W);
}

function anthill(s) {
    // 14×9 dome of spruce needles, a few ants marching over it
    const N = ramp('#9a6a40');
    vol(s, N, (m) => {
        dome(m, 7, 8, 7.2, 7.5);
        m.oval(5, 0, 5, 4, W);
    });
    // needle texture: short light and dark strokes
    const strokes = [[3, 5, 1], [6, 3, 1], [9, 4, -1], [5, 7, -1], [10, 7, 1], [2, 7, -1], [8, 6, 1], [7, 2, -1], [11, 6, 1]];
    for (const [x, y, d] of strokes) {
        s.px(x, y, N.l1);
        s.px(x + d, y + 1, N.d1);
    }
    s.px(6, 1, N.l2);
    s.px(5, 2, N.l1);
    // ants: tiny two-pixel bodies
    for (const [x, y] of [[4, 4], [9, 5], [6, 7]]) {
        s.px(x, y, '#2a1a1a');
        s.px(x + 1, y, '#3a2424');
    }
}

/** A single-frame prop whose base sits on row `base`; anchor = (ax, base). */
function prop(name, base, ax, paint) {
    return { name, sheet: 'props-forest', w: 48, h: base + 1, anchor: [ax, base], anims: { idle: [paint] } };
}

const propDefs = [
    prop('p-spruce', 57, 13, (s) => spruce(s, 13, 57, 57, 12, 7)),
    prop('p-spruce2', 45, 10, (s) => spruce(s, 10, 45, 45, 9, 6)),
    prop('p-pine', 61, 12, (s) => {
        pine(s, 12, 61);
        // where a woodpecker or a climbing squirrel grips the bare trunk:
        // 'trunk' on the left (facing right), 'trunk2' on the right
        s.point('trunk', 10, 38);
        s.point('trunk2', 14, 38);
        s.point('trunktop', 10, 30);
    }),
    prop('p-bigtree', 55, 22, (s) => bigTree(s)),
    prop('p-flyagaric', 7, 3, (s) => flyAgaric(s, true)),
    prop('p-flyagaric2', 5, 2, (s) => flyAgaric(s, false)),
    prop('p-chanterelle', 3, 3, (s) => chanterelles(s)),
    prop('p-blueberry', 6, 6, (s) => berryBush(s, 'blueberry')),
    prop('p-lingon', 5, 5, (s) => berryBush(s, 'lingon')),
    prop('p-fern', 9, 6, (s) => fern(s, true)),
    prop('p-fern2', 7, 4, (s) => fern(s, false)),
    prop('p-log', 7, 12, (s) => mossyLog(s)),
    prop('p-stump', 7, 5, (s) => stump(s)),
    prop('p-mossrock', 9, 8, (s) => mossRock(s, true)),
    prop('p-mossrock2', 6, 5, (s) => mossRock(s, false)),
    prop('p-troll', 17, 12, (s) => troll(s)),
    prop('p-anthill', 8, 7, (s) => anthill(s))
];

export default [squirrelDef, foxDef, owlDef, deerDef, fawnDef, bearDef, mooseDef, woodpeckerDef, lynxDef, ...propDefs].map(fit);
