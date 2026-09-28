/*
 * Blomsterängen – the flower meadow island (soft morning light, pastel).
 * Animals go on the 'animals-meadow' sheet, props on 'props-meadow'.
 *
 * Conventions (see the art brief):
 *   - Everything faces right; ground sprites stand on the bottom row and are
 *     anchored at bottom-centre. Frames of one animation share size/anchor, and
 *     every animation of an animal keeps the anchor on the same body spot, so
 *     switching animations never makes the animal jump.
 *   - Swimmers (duck swim + tail-up dive, duckling swim) are anchored on the
 *     waterline row ('water' point); 1-2 px are drawn below it for the game's
 *     water to cover.
 *   - Butterflies: 'fly' is anchored at the body centre, 'idle'/'special'
 *     (resting on a flower) at the feet.
 *   - Points: 'head' on every idle frame (top of the head), 'mouth' where a
 *     grazing animal's mouth meets the ground, 'water' on swim frames,
 *     'seat' on the fence (a sitting animal's feet go on that row),
 *     'door'/'chimney' on the cottage, 'text' on the sign, 'apple' on the tree.
 *   - Props have one 'idle' animation (flowers and grass: 2 sway frames).
 */
import { Sprite } from './kit.mjs';

// ---------------------------------------------------------------------------
// Shared face colours (same family as Nova)
// ---------------------------------------------------------------------------
const EYE = '#2a1a1a';
const SPARK = '#ffffff';
const NOSE = '#ff8a9a';
const MOUTH = '#9c3048';
const TONGUE = '#ff9aaa';
const BLUSH = '#ffa3b3';

/** 2×2 eye with a sparkle; 'closed' = a lash line, 'happy' = an arch. */
function eye2(s, x, y, mode = 'open', color = EYE) {
    if (mode === 'open') {
        s.rect(x, y, 2, 2, color);
        s.px(x + 1, y, SPARK);
    } else if (mode === 'closed') {
        s.hline(x, x + 1, y + 1, color);
    } else if (mode === 'happy') {
        s.px(x, y + 1, color);
        s.px(x + 1, y, color);
    } else if (mode === 'wide') {
        s.rect(x, y, 2, 2, color);
        s.px(x + 1, y, SPARK);
        s.px(x, y - 1, color);
    }
}

/**
 * Paint a silhouette with rim lighting: whatever \`shape(m)\` draws into a mask
 * is filled with R.b, the top/top-left rims get R.l1, the bottom/bottom-right
 * rims R.d1 and the lowest row R.d2. Every bump of a bumpy outline (wool,
 * leaves) therefore gets its own little highlight and shadow.
 */
function litShape(s, shape, R, { lo = true, hi = true, deep = true, x0 = 0, y0 = 0 } = {}) {
    const m = new Sprite(s.w, s.h);
    shape(m);
    const out = (x, y) => !m.opaque(x, y);
    const b = m.bounds();
    if (!b) return;
    const midY = b.y + b.h * 0.45;
    const midX = b.x + b.w * 0.55;
    for (let y = b.y; y < b.y + b.h; y += 1) {
        for (let x = b.x; x < b.x + b.w; x += 1) {
            if (!m.opaque(x, y)) continue;
            let c = R.b;
            if (lo && (out(x, y + 1) || (out(x + 1, y) && y > midY) || (out(x + 1, y + 1) && x > midX))) c = R.d1;
            if (lo && deep && R.d2 && out(x, y + 1) && (x > midX || out(x, y + 2))) c = R.d2;
            if (hi && (out(x, y - 1) || (out(x - 1, y) && y < midY) || (out(x - 1, y - 1) && x < midX)) && c === R.b) c = R.l1;
            s.px(x, y, c);
        }
    }
}

/** A line whose pixels always share an edge (no corner-only steps), for stripes. */
function line4(s, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    s.px(x0, y0, c);
    while (x0 !== x1 || y0 !== y1) {
        if (2 * err > -dy && (err * 2 >= dx - dy || y0 === y1)) {
            err -= dy;
            x0 += sx;
        } else {
            err += dx;
            y0 += sy;
        }
        s.px(x0, y0, c);
    }
}

/** Paint shifted right by dx (keeps 1 px of air for the outline); points move too. */
function shiftX(dx, paint) {
    return (s, i) => {
        const t = new Sprite(s.w, s.h);
        paint(t, i);
        s.stamp(t, dx, 0);
        for (const [k, [x, y]] of Object.entries(t.points)) s.point(k, x + dx, y);
    };
}

// ===========================================================================
// RABBIT – kanin
// ===========================================================================
const RAB = { d2: '#6e514c', d1: '#8c6e62', b: '#a88d7c', l1: '#c4ad99', l2: '#dccbb8' };
const RAB_CREAM = { b: '#f1e4d4', d1: '#d8c3b0' };
const EAR_PINK = { b: '#f4a9b2', d1: '#dd8b98' };
const TAIL = { b: '#ffffff', d1: '#e4dbe6' };

const RAB_KEY = {
    D: RAB.d2, d: RAB.d1, b: RAB.b, l: RAB.l1, L: RAB.l2,
    c: RAB_CREAM.b, C: RAB_CREAM.d1, p: EAR_PINK.b, P: EAR_PINK.d1,
    t: TAIL.b, T: TAIL.d1, n: NOSE
};

// profile head, 8×6, top-left at (x, y)
const RAB_HEAD = [
    '..lbbb..',
    '.lbbbbb.',
    'lbbbbbbb',
    'bbbbbbbb',
    'dbbbbccc',
    '.dbbccC.'
];
// front-facing head for 'look', 9×7
const RAB_FACE = [
    '..lbbbb..',
    '.lbbbbbbb',
    'lbbbbbbbb',
    'bbbbbbbbb',
    'bbbcccbbd',
    '.bcccccd.',
    '..dcccd..'
];

function rabbitEars(s, x, y, mode, flick) {
    // x, y = base of the near ear (on the head top)
    if (mode === 'back') {
        // laid back along the neck (hopping, eating)
        s.map(x - 6, y - 1, ['ddd...', '.dddd.'], RAB_KEY);
        s.map(x - 5, y - 2, ['lbb...', '.lppbb', '...bbb'], RAB_KEY);
        return;
    }
    if (mode === 'front') {
        // both ears straight up, seen from the front
        s.map(x - 2, y - 6, ['.lb.', 'lbb.', 'lpb.', 'lpb.', 'lpb.', '.bb.'], RAB_KEY);
        s.map(x + 3, y - 6, ['.bb.', '.bpd', '.bpd', '.bpd', '.bpd', '.bd.'], RAB_KEY);
        return;
    }
    const tall = mode === 'tall' ? 1 : 0;
    // far ear, leaning back a little
    const far = tall
        ? ['.d.', 'dd.', 'dd.', 'dd.', 'dd.', '.dd']
        : ['dd..', 'dd..', '.dd.', '.dd.', '..dd'];
    s.map(x - (tall ? 2 : 4), y - 5 - tall, far, RAB_KEY);
    // near ear: light fur edge, pink inside, fur edge
    const near = flick
        ? ['lb..', 'lbb.', '.lpb', '.lpb', '.lpb']
        : ['.lb', 'lbb', 'lpb', 'lpb', 'lpb'];
    s.map(x - (flick ? 1 : 0), y - 5 - tall, near, RAB_KEY);
    if (tall) s.map(x, y - 1, ['lpb'], RAB_KEY);
}

function rabbitHead(s, x, y, { eyes = 'open', nose = 0, ears = 'up', earFlick = 0, munch = 0 } = {}) {
    rabbitEars(s, x + 2, y, ears, earFlick);
    s.map(x, y, RAB_HEAD, RAB_KEY);
    s.px(x + 7, y + 3 - nose, NOSE);
    s.px(x + 4, y + 3, BLUSH);
    if (munch) {
        s.px(x + 6, y + 5, RAB_CREAM.b);
        s.px(x + 7, y + 4, RAB_CREAM.d1);
    }
    eye2(s, x + 4, y + 1, eyes);
}

function rabbitFace(s, x, y, { eyes = 'open' } = {}) {
    rabbitEars(s, x + 2, y + 1, 'front', 0);
    s.map(x, y, RAB_FACE, RAB_KEY);
    eye2(s, x + 1, y + 2, eyes);
    eye2(s, x + 6, y + 2, eyes);
    s.px(x + 4, y + 4, NOSE);
    s.px(x + 4, y + 5, RAB_CREAM.d1);
    s.px(x + 1, y + 4, BLUSH);
    s.px(x + 7, y + 4, BLUSH);
}

function rabbitSitBody(s, by, { squash = 0 } = {}) {
    // cotton tail
    s.oval(1, by + 1 + squash, 4, 4, TAIL.b);
    s.px(3, by + 4 + squash, TAIL.d1);
    // body loaf
    s.ball(2, by - 1 + squash, 10, 7 - squash, RAB);
    // haunch line
    s.line(4, by + 3, 6, by + 1 + squash, RAB.d1);
    s.px(7, by + 1 + squash, RAB.d1);
    // hind foot
    s.hline(3, 8, by + 5, RAB.d1);
    s.hline(4, 8, by + 5, RAB.b);
    // front paws
    s.rect(10, by + 4, 2, 2, RAB_CREAM.b);
    s.px(10, by + 5, RAB_CREAM.d1);
}

function drawRabbit(s, pose = {}) {
    const kind = pose.kind || 'sit';
    const G0 = s.h - 1;
    if (kind === 'sit') {
        const by = G0 - 5;
        rabbitSitBody(s, by);
        if (pose.look) {
            rabbitFace(s, 6, by - 4, pose);
            s.point('head', 10, by - 10);
        } else {
            rabbitHead(s, 7, by - 4, pose);
            s.point('head', 10, by - 10);
        }
        return;
    }
    if (kind === 'eat') {
        // hunched, head down in the grass, ears up
        const y = G0 - 14;
        s.oval(1, y + 8, 4, 4, TAIL.b);
        s.px(3, y + 11, TAIL.d1);
        s.ball(2, y + 5, 10, 10, RAB);
        s.line(4, y + 12, 6, y + 10, RAB.d1);
        s.px(7, y + 10, RAB.d1);
        s.hline(3, 8, y + 14, RAB.d1);
        s.hline(4, 8, y + 14, RAB.b);
        rabbitHead(s, 8, y + 9, { ...pose, ears: 'up', earFlick: pose.munch ? 1 : 0 });
        s.point('mouth', 15, G0);
        return;
    }
    if (kind === 'up') {
        // sitting up tall on the hind legs, sniffing, ears straight up
        const by = G0;
        s.oval(2, by - 5, 4, 4, TAIL.b);
        s.px(4, by - 2, TAIL.d1);
        s.ball(3, by - 9, 8, 9, RAB);
        s.oval(7, by - 8, 3, 5, RAB_CREAM.b);            // chest
        s.hline(3, 9, by, RAB.d1);                        // big hind foot
        s.hline(4, 9, by, RAB.b);
        s.line(4, by - 2, 6, by - 4, RAB.d1);             // haunch
        s.map(8, by - 6, ['dbl', '.dc'], RAB_KEY);        // paws tucked at the chest
        rabbitHead(s, 5, by - 13, { ...pose, ears: 'tall' });
        s.point('head', 8, by - 20);
        return;
    }
    // hop cycle: 0 gather, 1 push off, 2 flight, 3 landing (feet on the bottom row)
    const f = pose.hop;
    const G = G0;
    if (f === 0) {
        rabbitSitBody(s, G - 5, { squash: 1 });
        rabbitHead(s, 8, G - 8, { ...pose, earFlick: 1 });
    } else if (f === 1) {
        // push off: body rising at the front, hind feet still on the ground
        s.thick(4, G - 4, 2, G, 2, RAB.d1);              // hind leg extended back
        s.hline(1, 3, G, RAB.d1);
        s.oval(1, G - 9, 4, 4, TAIL.b);
        s.px(3, G - 6, TAIL.d1);
        s.ball(3, G - 11, 10, 8, RAB);
        s.line(5, G - 5, 7, G - 7, RAB.d1);              // haunch
        s.map(11, G - 4, ['cc', '.C'], RAB_KEY);          // front paws tucked
        rabbitHead(s, 9, G - 14, { ...pose, ears: 'back' });
    } else if (f === 2) {
        // flight: round ball in the air, feet tucked
        const y = G - 12;
        s.oval(1, y + 2, 4, 4, TAIL.b);
        s.px(3, y + 5, TAIL.d1);
        s.thick(2, y + 7, 4, y + 7, 2, RAB.d1);          // hind feet trailing
        s.ball(3, y + 1, 10, 7, RAB);
        s.line(5, y + 6, 7, y + 4, RAB.d1);
        s.map(11, y + 7, ['cc.', '.cC'], RAB_KEY);        // front paws reaching
        rabbitHead(s, 9, y - 2, { ...pose, ears: 'back' });
    } else {
        // landing: front paws touch down, back end still up
        s.oval(1, G - 11, 4, 4, TAIL.b);
        s.px(3, G - 8, TAIL.d1);
        s.thick(2, G - 6, 4, G - 5, 2, RAB.d1);          // hind legs up behind
        s.ball(3, G - 11, 10, 8, RAB);
        s.line(5, G - 6, 7, G - 8, RAB.d1);
        s.map(11, G - 3, ['bc.', '.cc', '.cc', '..C'], RAB_KEY); // front paws reaching down
        rabbitHead(s, 9, G - 10, { ...pose, ears: 'back' });
    }
}

// ===========================================================================
// SHEEP and LAMB – får och lamm (one painter; the lamb is smaller and leggier)
// ===========================================================================
const WOOL = { l1: '#ffffff', b: '#f2ede8', d1: '#d8ccd8', d2: '#b3a2bb' };
const SHEEP_FACE = { l1: '#7a7186', b: '#5d5668', d1: '#48424f', d2: '#35303d' };
const LAMB_FACE = { l1: '#8e869a', b: '#716a7c', d1: '#5a5463', d2: '#433e4b' };
const HOOF = '#2e2a36';

function woolKey(F) {
    return {
        f: F.b, F: F.l1, d: F.d1, D: F.d2,
        w: WOOL.b, W: WOOL.l1, s: WOOL.d1, S: WOOL.d2,
        p: '#ff9aaa', P: '#e0859b', q: '#f4a9b2',
        o: '#ffffff', e: '#1c1420', m: MOUTH, t: TONGUE
    };
}

// a cloud of wool with scalloped edges
const SHEEP_BODY = [
    '...WW..WWW..WW....',
    '..WwwWWwwwWWwwW...',
    '.WwwwwwwwwwwwwwW..',
    'WwwwwwwwwwwwwwwwW.',
    'Wwwwwwswwwwwwwwww.',
    '.wwwwwwswwwwswwww.',
    'swwwwwwwwwwwwswwws',
    'swwswwwwwwwwwwwwss',
    '.sswswwwwwwwwwwss.',
    '..sssswwssssssss..',
    '...SSS..SSSSSSS...'
];
const LAMB_BODY = [
    '..WW.WWW....',
    '.WwwWwwwWW..',
    'WwwwwwwwwwW.',
    'Wwwwwswwwwww',
    'swwwwwwwwwws',
    'swwswwwwwwss',
    '.sswwwwssss.',
    '..SSS..SSS..'
];
// heads: face front-on (like Nova), ears out to the sides, a woolly fringe
const SHEEP_HEAD = [
    '...WWW.WW...',
    '..WwwwWwwW..',
    'ddswwwwwwsdd',
    '.dfsfffffsd.',
    '..f11f22fF..',
    '..f11f22ff..',
    '..Pffffffp..',
    '...ffNNff...',
    '....fMMf....'
];
const LAMB_HEAD = [
    '..WW.WW..',
    '.WwwWwwW.',
    'dqswwwsqd',
    '.dfsffsd.',
    '.f11f22f.',
    '.f11f22F.',
    '.Pffffff.',
    '..ffNNf..',
    '...fMf...'
];

function sheepHead(s, x, y, F, { eyes = 'open', mouth = 'smile', look = false, ear = 0, lamb = false } = {}) {
    const K = woolKey(F);
    const map = lamb ? LAMB_HEAD : SHEEP_HEAD;
    // ears droop a pixel on the flick frame
    const rows = map.map((r) => r);
    if (ear) {
        rows[2] = rows[2].replace(/^(d[dq]?)/, (m) => '.'.repeat(m.length)).replace(/([dq]?d)$/, (m) => '.'.repeat(m.length));
    }
    s.map(x, y, rows.map((r) => r.replace(/[12NM]/g, 'f')), K);
    if (ear) {
        const w = map[2].length;
        s.map(x, y + 3, lamb ? ['dq', '.d'] : ['dd', '.d'], K);
        s.map(x + w - 2, y + 3, lamb ? ['qd', 'd.'] : ['dd', 'd.'], K);
    }
    // eyes: white with the pupil towards where it looks
    const at = (ch) => {
        for (let j = 0; j < map.length; j += 1) {
            const i = map[j].indexOf(ch);
            if (i >= 0) return [x + i, y + j];
        }
        return null;
    };
    const [e1x, e1y] = at('1');
    const [e2x, e2y] = at('2');
    for (const [ex, ey, side] of [[e1x, e1y, 1], [e2x, e2y, -1]]) {
        // on the dark face, shut eyes are drawn as light little lines so they show
        if (eyes === 'closed') {
            s.hline(ex, ex + 1, ey + 1, '#e6e0ec');
        } else if (eyes === 'happy') {
            s.px(ex, ey + 1, '#ffffff');
            s.px(ex + 1, ey, '#ffffff');
        } else if (look) {
            // looking straight at the camera: pupils on the inner side
            s.rect(ex, ey, 2, 2, '#ffffff');
            s.vline(side > 0 ? ex + 1 : ex, ey, ey + 1, '#1c1420');
        } else {
            s.rect(ex, ey, 2, 2, '#ffffff');
            s.vline(ex + 1, ey, ey + 1, '#1c1420');
        }
    }
    const [nx, ny] = at('N');
    const [mx, my] = at('M');
    s.hline(nx, nx + 1, ny, K.p);
    if (mouth === 'open') {
        s.rect(mx, my, lamb ? 1 : 2, 2, MOUTH);
        s.px(mx, my + 1, TONGUE);
    } else if (mouth === 'munch') {
        s.hline(mx - 1, mx + (lamb ? 1 : 2), my, F.d2);
    } else {
        s.px(mx, my, F.d2);
        if (!lamb) s.px(mx + 1, my, F.d1);
    }
}

/**
 * The sheep / lamb painter.
 * kind: 'stand' (idle, walk, jump) | 'graze'
 * legs: [dx, up] for [back-far, back-near, front-far, front-near]
 * lift: whole animal up (jumps), bob: body up/down with the feet planted
 */
function drawSheep(s, o = {}) {
    const lamb = !!o.lamb;
    const F = lamb ? LAMB_FACE : SHEEP_FACE;
    const K = woolKey(F);
    const G = s.h - 1;
    const body = lamb ? LAMB_BODY : SHEEP_BODY;
    const head = lamb ? LAMB_HEAD : SHEEP_HEAD;
    const legLen = lamb ? 3 : 3;
    const lift = o.lift || 0;
    const bob = o.bob || 0;
    const bx = 1;
    const by = G - legLen - body.length + 2 - lift + bob;
    const legTop = by + body.length - 3;
    const legX = lamb ? [2, 3, 8, 9] : [6, 3, 14, 11];
    const legW = lamb ? 1 : 2;
    const legs = o.legs || [[0, 0], [0, 0], [0, 0], [0, 0]];
    const leg = (i) => {
        const near = i % 2 === 1;
        const col = near ? F.b : F.d1;
        const [dx, up] = legs[i];
        const x = bx + legX[i];
        const bottom = G - lift - up;
        if (o.splay) {
            // all four legs kicked out in a happy boing
            const dir = i < 2 ? -1 : 1;
            const fx = x + dir * 2;
            s.thick(x, legTop, fx, bottom - 1, legW, col);
            s.hline(fx, fx + legW - 1, bottom, HOOF);
            return;
        }
        s.rect(x + dx, legTop, legW, bottom - legTop + 1, col);
        if (near && !lamb) s.px(x + dx, legTop + 3, F.l1);
        s.hline(x + dx, x + dx + legW - 1, bottom, HOOF);
    };
    leg(0);
    leg(2);
    s.map(bx, by, body, K);
    leg(1);
    leg(3);
    const bw = body[0].length;
    if (o.kind === 'graze') {
        const hx = bx + bw - (lamb ? 5 : 8);
        const hy = G - head.length + 1 - (o.munch ? 0 : 1);
        sheepHead(s, hx, hy, F, { eyes: o.eyes || 'happy', mouth: o.munch ? 'munch' : 'smile', lamb });
        s.point('mouth', hx + Math.floor(head[0].length / 2), G);
        return;
    }
    const hx = bx + bw - (lamb ? 5 : 8);
    const hy = by - (lamb ? 4 : 5) + (o.nod || 0);
    sheepHead(s, hx, hy, F, o);
    s.point('head', hx + Math.floor(head[0].length / 2), hy);
}

// ===========================================================================
// COW – ko (Holstein spots, pink muzzle, little horns, golden bell)
// ===========================================================================
const COW_W = { l1: '#ffffff', b: '#f4f0ee', d1: '#d9cfd9', d2: '#ab9db5' };
const COW_K = { l1: '#5a5264', b: '#39333f', d1: '#29242f' };
const MUZZLE = { l1: '#ffdce2', b: '#f9bcc6', d1: '#e89aaa', d2: '#b8607a' };
const HORN = { b: '#f6ead0', d1: '#d8c49a' };
const BELL = { l1: '#fff3a8', b: '#ffd34a', d1: '#e0a020', d2: '#a86a10' };
const COLLAR = { b: '#e0503f', d1: '#b03a34' };
const COW_HOOF = '#4a3a3a';

/** Paint only over pixels that are already drawn (spots on a hide). */
function over(s, draw) {
    const m = new Sprite(s.w, s.h);
    draw(m);
    for (let y = 0; y < s.h; y += 1) {
        for (let x = 0; x < s.w; x += 1) {
            if (m.opaque(x, y) && s.opaque(x, y)) s.px(x, y, m.get(x, y));
        }
    }
}

/** Front-on cow head; (x, y) = top-left of a 13×13 box. */
function cowHead(s, x, y, { eyes = 'open', mouth = 'smile', look = false, ear = 0 } = {}) {
    // ears out to the sides: one black, one white, pink inside
    s.map(x, y + 4 + ear, ['KKK.', '.Kpp'], { K: COW_K.b, p: '#f4a9b2' });
    s.map(x + 9, y + 4 + ear, ['.www', 'ppw.'], { w: COW_W.d1, p: '#e0859b' });
    // little horns
    s.map(x + 3, y, ['h.', 'hh'], { h: HORN.b });
    s.map(x + 8, y, ['.h', 'hH'], { h: HORN.b, H: HORN.d1 });
    // face
    s.ball(x + 2, y + 2, 9, 9, COW_W);
    // black patch on the forehead
    over(s, (m) => {
        m.oval(x + 1, y + 1, 6, 4, COW_K.b);
        m.px(x + 2, y + 5, COW_K.b);
    });
    s.px(x + 3, y + 2, COW_K.l1);
    s.px(x + 4, y + 2, COW_K.l1);
    // wide soft muzzle
    s.ball(x + 2, y + 8, 9, 5, MUZZLE);
    s.hline(x + 4, x + 8, y + 8, MUZZLE.l1);
    const ey = y + 5;
    for (const e of [x + 4, x + 7]) {
        if (look && eyes === 'open') {
            s.rect(e, ey - 1, 2, 3, EYE);
            s.px(e + 1, ey - 1, SPARK);
        } else {
            eye2(s, e, ey, eyes);
        }
    }
    s.px(x + 4, y + 10, MUZZLE.d2);
    s.px(x + 8, y + 10, MUZZLE.d2);
    if (mouth === 'open') {
        s.hline(x + 5, x + 7, y + 11, MOUTH);
        s.px(x + 6, y + 12, TONGUE);
    } else if (mouth === 'moo') {
        s.oval(x + 5, y + 10, 3, 3, MOUTH);
        s.px(x + 6, y + 11, TONGUE);
    } else if (mouth === 'munch') {
        s.hline(x + 5, x + 7, y + 11, MUZZLE.d2);
        s.px(x + 6, y + 12, '#8fcf5a');
    } else {
        s.px(x + 5, y + 11, MUZZLE.d2);
        s.px(x + 7, y + 11, MUZZLE.d2);
        s.px(x + 6, y + 12, MUZZLE.d1);
    }
    s.px(x + 3, y + 7, BLUSH);
    if (look) s.px(x + 9, y + 7, BLUSH);
}

function cowBell(s, x, y, swing = 0) {
    // collar under the chin, bell hanging from it
    s.hline(x - 3, x + 3, y, COLLAR.b);
    s.px(x + 3, y, COLLAR.d1);
    const bx = x + swing;
    s.map(bx - 1, y + 1, ['.l.', 'lbb', 'bbd', 'DkD'], { l: BELL.l1, b: BELL.b, d: BELL.d1, D: BELL.d2, k: '#6a4a20' });
    return [bx, y + 4];
}

/**
 * kind: 'stand' | 'graze' | 'moo'
 * legs: [dx, up] for [back-far, back-near, front-far, front-near]
 */
function drawCow(s, o = {}) {
    const G = s.h - 1;
    const bob = o.bob || 0;
    const legs = o.legs || [[0, 0], [0, 0], [0, 0], [0, 0]];
    const bx = 4;
    const bw = 21;
    const bh = 11;
    const by = G - 5 - bh + 2 + bob;
    const legTop = by + bh - 3;
    const legX = [6, 3, 19, 16];
    const leg = (i) => {
        const near = i % 2 === 1;
        const [dx, up] = legs[i];
        const x = bx + legX[i] + dx;
        const bottom = G - up;
        s.rect(x, legTop, 3, bottom - legTop + 1, near ? COW_W.b : COW_W.d1);
        if (near) s.vline(x, legTop + 2, bottom - 1, COW_W.l1);
        else s.vline(x + 2, legTop + 2, bottom - 1, COW_W.d2);
        s.hline(x, x + 2, bottom, COW_HOOF);
        if (near) s.px(x, bottom, '#6a5656');
    };
    // tail, hanging from the rump with a black tuft
    const sw = o.tail || 0;
    s.line(bx + 1, by + 2, bx - 1 + sw, by + 8, COW_W.d1);
    s.line(bx, by + 2, bx - 2 + sw, by + 8, COW_W.b);
    s.map(bx - 3 + sw, by + 8, ['.K', 'KK', 'KK'], { K: COW_K.b });
    leg(0);
    leg(2);
    // barrel body
    litShape(s, (m) => {
        m.oval(bx, by, bw, bh, '#fff');
        m.rect(bx + 2, by, bw - 5, bh - 1, '#fff');
    }, COW_W);
    // spots
    over(s, (m) => {
        m.oval(bx + 3, by - 1, 7, 6, COW_K.b);
        m.oval(bx + 12, by + 3, 6, 5, COW_K.b);
        m.oval(bx - 1, by + 5, 4, 5, COW_K.b);
    });
    s.px(bx + 5, by + 1, COW_K.l1);
    s.px(bx + 6, by + 1, COW_K.l1);
    s.px(bx + 13, by + 4, COW_K.l1);
    // udder
    s.map(bx + 7, by + bh - 1, ['PPPP', '.p.p'], { P: MUZZLE.b, p: MUZZLE.d1 });
    leg(1);
    leg(3);
    if (o.kind === 'graze') {
        const hx = bx + bw - 7;
        const hy = G - 12 + (o.munch ? 1 : 0);
        cowHead(s, hx, hy, { eyes: 'happy', mouth: o.munch ? 'munch' : 'smile' });
        s.point('mouth', hx + 6, G);
        return;
    }
    const up = o.kind === 'moo' ? -2 : 0;
    const hx = bx + bw - 6;
    const hy = by - 6 + up + (o.nod || 0);
    cowBell(s, hx + 6, hy + 13, o.swing || 0);
    cowHead(s, hx, hy, o);
    s.point('head', hx + 6, hy);
    if (o.kind === 'moo') s.point('mouth', hx + 6, hy + 10);
}

// ===========================================================================
// HORSE – häst (a Nordic fjord horse: cream dun, upright two-tone mane)
// ===========================================================================
const DUN = { l2: '#fff6e2', l1: '#fbe8c2', b: '#efd4a2', d1: '#d6b27c', d2: '#b08a5c' };
const DUN_LEG = { b: '#c9a071', d1: '#a98058', d2: '#86623f' };
const MANE_PALE = '#fff8ea';
const MANE_DARK = '#4a3226';
const HORSE_HOOF = '#4a3a34';
const HORSE_NOSE = { b: '#f6e6cc', d1: '#e0c8a6', n: '#9a7456' };

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** Filled ellipse rotated by a (radians). */
function rotOval(m, cx, cy, rx, ry, a, c) {
    const r = Math.ceil(Math.max(rx, ry)) + 1;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
            const [u, v] = rot(x + 0.5 - cx, y + 0.5 - cy, -a);
            if ((u / rx) ** 2 + (v / ry) ** 2 <= 1.05) m.px(x, y, c);
        }
    }
}

const HORSE_KEY = {
    e: DUN.d1, E: DUN.b, c: DUN.b, C: DUN.l1, d: DUN.d1, D: DUN.d2,
    n: HORSE_NOSE.b, N: HORSE_NOSE.d1, o: HORSE_NOSE.n,
    k: MANE_DARK, w: MANE_PALE, p: BLUSH, m: MOUTH, t: TONGUE
};
// profile heads; '1' marks the eye's top-left (drawn separately)
const HORSE_HEAD = [
    '..eE.......',
    '.weEE......',
    'wkCCCcc....',
    'wkC1cccc...',
    'wkdcccccc..',
    'wkdcccccnn.',
    'wk.dpccnnon',
    'wk..dcnnnnn',
    'wk...dNNNn.'
];
const HORSE_NEIGH = [
    '..eE.......',
    '.weEE......',
    'wkCCCcc....',
    'wkC1cccc...',
    'wkdcccccc..',
    'wkdcccccnn.',
    'wk.dpccnnon',
    'wk..dcnnmn.',
    'wk...dNnmt.',
    '.......NN..'
];
// front-on face for 'look' (ears, two-tone forelock, eyes, soft muzzle)
const HORSE_FRONT = [
    '.Ee...eE.',
    '.EEwkwEE.',
    '..cwkwc..',
    '.cCCkCcc.',
    '.c1ccc2c.',
    '.cccCcccd',
    '.pccCccpd',
    '..ccccc..',
    '..nnnnn..',
    '..onnno..',
    '..NnnnN..',
    '...NNN...'
];
const HORSE_GRAZE = [
    '.eE...',
    'weEE..',
    'wkCCc.',
    'wkCccc',
    'wk1ccc',
    'wkcccc',
    'wkdccc',
    '.kdpcc',
    '..dccn',
    '..dnnn',
    '..nnon',
    '..NnnN',
    '...NN.'
];

function horseHead(s, x, y, map, { eyes = 'open', munch = 0, mouth = 'smile' } = {}) {
    s.map(x, y, map.map((r) => r.replace(/[12]/g, 'c')), HORSE_KEY);
    for (let j = 0; j < map.length; j += 1) {
        for (const ch of ['1', '2']) {
            const i = map[j].indexOf(ch);
            if (i >= 0) eye2(s, x + i, y + j, eyes);
        }
    }
    if (map === HORSE_FRONT && mouth === 'open') {
        s.hline(x + 3, x + 5, y + 10, MOUTH);
        s.px(x + 4, y + 11, TONGUE);
    }
    if (munch) {
        const last = map.length - 1;
        const i = map[last].indexOf('N');
        s.px(x + i + 2, y + last, '#8fcf5a');
    }
}

/**
 * Fjord horse painter. Keypoints are in a body frame whose origin is the
 * near hind hoof (on the ground); pitch tilts the body round it (rearing).
 * legs: [hind-far, hind-near, fore-far, fore-near], each [dx, up] or 'tuck' / 'kick'.
 */
function drawHorse(s, o = {}) {
    const G = s.h - 1;
    const pitch = o.pitch || 0;
    const ox = o.ox ?? 7;
    const bob = o.bob || 0;
    const W = (u, v, withBob = true) => {
        const [x, y] = rot(u, v, pitch);
        return [Math.round(ox + x), Math.round(G + y + (withBob ? bob : 0))];
    };
    const legs = o.legs || [[0, 0], [0, 0], [0, 0], [0, 0]];
    const leg = (i) => {
        const near = i % 2 === 1;
        const fore = i >= 2;
        const col = near ? DUN_LEG.b : DUN_LEG.d1;
        const upper = near ? DUN.b : DUN.d1;
        const bx = fore ? (near ? 14 : 11) : (near ? 1 : 4);
        const [tx, ty] = W(bx, -9);
        const L = legs[i];
        if (L === 'tuck' || L === 'kick') {
            // foreleg folded up while rearing (or striking out)
            const kx = tx + (L === 'kick' ? 3 : 2);
            const ky = ty + 3;
            const [hx, hy] = L === 'kick' ? [kx + 3, ky] : [kx - 1, ky + 3];
            s.thick(tx, ty, kx, ky, 2, upper);
            s.thick(kx, ky, hx, hy, 2, col);
            s.hline(hx, hx + 1, hy + 1, HORSE_HOOF);
            return;
        }
        const [dx, up] = L;
        const fy = G - up;
        const fx = tx + dx;
        if (fore) {
            // straight foreleg, the knee bends forward when lifted
            const ky = ty + 4;
            const kx = tx + (up > 0 ? 1 : 0);
            s.thick(tx, ty, kx, ky, 2, upper);
            s.thick(kx, ky, fx, fy - 1, 2, col);
        } else {
            // hind leg: thigh, hock a little behind, then the cannon down
            const ky = ty + 4;
            const kx = tx - 1;
            s.thick(tx, ty, kx, ky, 2, upper);
            s.thick(kx, ky, fx, fy - 1, 2, col);
        }
        s.hline(fx, fx + 1, fy, HORSE_HOOF);
        if (near) s.px(fx + 1, fy - 1, DUN_LEG.d2);
    };
    // where the head goes (top-left of its map)
    const kind = o.kind || 'stand';
    const map = kind === 'graze' ? HORSE_GRAZE : o.look ? HORSE_FRONT : (o.mouth === 'open' ? HORSE_NEIGH : HORSE_HEAD);
    const hp = kind === 'graze' ? [18, -13] : o.look ? [16, -28] : (o.head || [16, -29]);
    const [hx, hy] = W(hp[0], hp[1]);
    // tail: pale outer hair round a dark centre, swishing
    const [rx, ry] = W(-2, -15);
    const sw = o.tail || 0;
    const tip = pitch ? [rx - 3 + sw, Math.min(G - 1, ry + 8)] : [rx - 2 + sw, ry + 10];
    const mid = pitch ? [rx - 2, ry + 2] : [rx - 2, ry + 3];
    s.thick(rx, ry, mid[0], mid[1], 3, MANE_PALE);
    s.thick(mid[0], mid[1], tip[0], tip[1], 3, MANE_PALE);
    s.line(rx - 1, ry + 1, tip[0], tip[1] - 1, MANE_DARK);
    leg(0);
    leg(2);
    const neckTop = kind === 'graze' ? [hx + 2, hy + 3] : o.look ? [hx + 3, hy + 8] : [hx + 3, hy + 6];
    litShape(s, (m) => {
        const [cx, cy] = W(7, -13);
        rotOval(m, cx, cy, 9, 4.4, pitch, '#fff');
        // neck: a thick wedge from the chest up to the head
        const [c1x, c1y] = W(14, -12);
        const [c2x, c2y] = W(11, -16);
        m.thick(c1x, c1y, neckTop[0] + 1, neckTop[1], 5, '#fff');
        m.thick(c2x, c2y, neckTop[0], neckTop[1] - 2, 4, '#fff');
    }, DUN);
    // dark dorsal stripe along the back
    const [d1x, d1y] = W(0, -17);
    const [d2x, d2y] = W(10, -17);
    s.line(d1x, d1y + 1, d2x, d2y + 1, DUN.d1);
    // upright, brushed two-tone mane along the crest: pale sides, dark centre
    const [m1x, m1y] = W(9, -17);
    const mt = o.look ? [hx + 1, hy + 4] : kind === 'graze' ? [hx, hy + 3] : [hx, hy + 3];
    s.thick(m1x - 1, m1y - 1, mt[0], mt[1], 3, MANE_PALE);
    line4(s, m1x, m1y - 1, mt[0] + 1, mt[1], MANE_DARK);
    // brush tips along the top edge
    const n = Math.max(Math.abs(mt[0] - m1x), Math.abs(mt[1] - m1y));
    for (let i = 1; i < n; i += 2) {
        const x = Math.round(m1x - 2 + ((mt[0] - m1x) * i) / n);
        const y = Math.round(m1y - 2 + ((mt[1] - m1y) * i) / n);
        s.px(x, y, MANE_PALE);
    }
    leg(1);
    leg(3);
    horseHead(s, hx, hy, map, o);
    s.point('head', hx + 3, hy - 1);
    if (o.mouth === 'open') s.point('mouth', hx + 9, hy + 8);
    if (kind === 'graze') s.point('mouth', hx + 4, G);
}

// ===========================================================================
// DUCK and DUCKLING – anka och ankunge
// ===========================================================================
const DUCK_W = { l1: '#ffffff', b: '#f7f4f0', d1: '#dcd2de', d2: '#b6a8c0' };
const BEAK = { l1: '#ffc870', b: '#ffa12e', d1: '#e67a1c', d2: '#b85a14' };
const CHICK = { l1: '#fff5a8', b: '#ffe05a', d1: '#f4b834', d2: '#d8902a' };
const RIPPLE = '#ffffffcc';

/**
 * Storybook farm duck, profile facing right.
 * kind: 'stand' | 'swim' | 'dabble' | 'dive'
 */
function drawDuck(s, o = {}) {
    const kind = o.kind || 'stand';
    if (kind === 'dive') {
        // bottoms up! a white mound with the tail tip up and a webbed foot
        // kicking out on each side (the classic cartoon upended duck)
        const wl = s.h - 3;                       // waterline row
        const f = o.f || 0;
        const a = f ? 1 : 0;
        const b = 1 - a;
        // short legs, each ending in a flat webbed paddle, soles to the sky
        s.vline(3, wl - 4 - a, wl - 2, BEAK.d1);
        s.vline(12, wl - 4 - b, wl - 2, BEAK.d1);
        s.map(1, wl - 7 - a, ['l.l.', 'bbbb', '.bb.'], { b: BEAK.b, l: BEAK.l1 });
        s.map(11, wl - 7 - b, ['.l.l', 'bbbb', '.bb.'], { b: BEAK.b, l: BEAK.l1 });
        litShape(s, (m) => {
            m.oval(3, wl - 4, 10, 7, '#fff');
            m.poly([[5.5, wl - 3], [7.5, wl - 8], [8.5, wl - 8], [10.5, wl - 3]], '#fff');   // tail tip
        }, DUCK_W);
        s.px(7, wl - 7, DUCK_W.l1);
        s.px(6, wl - 5, DUCK_W.l1);
        s.line(8, wl - 6, 9, wl - 4, DUCK_W.d1);
        s.point('water', 8, wl);
        return;
    }
    const swim = kind === 'swim';
    const dab = kind === 'dabble';
    const G = s.h - 1;
    const wl = s.h - 3;                           // waterline when swimming
    const bob = o.bob || 0;
    const by = swim ? wl - 4 + bob : G - 7 - (o.lift || 0);
    if (!swim) {
        // short orange legs and webbed feet
        const fs = o.feet || [0, 0];
        [[6, BEAK.d1], [8, BEAK.b]].forEach(([x, col], i) => {
            const up = fs[i];
            s.vline(x, by + 6, G - up - 1, col);
            s.hline(x - 1, x + 1 + i, G - up, col);
        });
    }
    // body: a plump boat with the tail tipped up at the back
    litShape(s, (m) => {
        if (dab) rotOval(m, 7.2, by + 2.6, 5.4, 3.3, 0.42, '#fff');
        else m.oval(2, by, 11, 7, '#fff');
        if (dab) m.poly([[1, by - 4], [5, by - 1], [4, by + 1], [2, by - 1]], '#fff');
        else m.poly([[0, by - 2 - (o.wag || 0)], [5, by + 1], [4, by + 4], [1, by + 1]], '#fff');
        if (swim) m.rect(3, wl, 9, 2, '#fff');
    }, DUCK_W);
    // folded wing
    if (dab) {
        s.line(4, by, 9, by + 3, DUCK_W.d1);
        s.line(5, by, 8, by + 2, DUCK_W.l1);
    } else {
        s.line(4, by + 2, 9, by + 3, DUCK_W.d1);
        s.px(3, by + 1, DUCK_W.d1);
        s.hline(5, 8, by + 2, DUCK_W.l1);
    }
    s.px(dab ? 2 : 1, dab ? by - 3 : by - 1, DUCK_W.l1);
    if (swim) s.point('water', 7, wl);
    // head on a short neck
    let hx = 8;
    let hy = by - 5 + (o.nod || 0);
    if (dab) {
        hx = 10;
        hy = G - 5 + (o.peck ? 1 : 0);
    }
    litShape(s, (m) => {
        if (dab) m.thick(10, by + 3, hx + 2, hy + 2, 3, '#fff');
        else m.rect(hx + 1, hy + 4, 4, 3, '#fff');
        m.oval(hx, hy, 6, 6, '#fff');
    }, DUCK_W);
    if (o.look) {
        // front view: two eyes and a wide flat beak
        eye2(s, hx + 1, hy + 1, o.eyes);
        eye2(s, hx + 4, hy + 1, o.eyes);
        s.map(hx + 1, hy + 3, ['.bbbb.', 'bbbbbb', '.dddd.'], { b: BEAK.b, d: BEAK.d1 });
        s.px(hx + 2, hy + 3, BEAK.l1);
        s.px(hx, hy + 3, BLUSH);
        s.px(hx + 6, hy + 3, BLUSH);
        s.point('head', hx + 3, hy - 1);
        return;
    }
    // flat orange beak, level with the bottom of the eye
    const open = o.mouth === 'open';
    s.map(hx + 5, hy + 2, open ? ['lbb.', 'm...', 'dd..'] : ['lbbb', 'bddd'], { l: BEAK.l1, b: BEAK.b, d: BEAK.d1, m: MOUTH });
    eye2(s, hx + 3, hy + 1, o.eyes);
    s.px(hx + 3, hy + 3, BLUSH);
    if (!dab) s.point('head', hx + 3, hy - 1);
    else s.point('mouth', hx + 8, G);
}

/** Tiny yellow duckling (about 8×7), drawn from little pixel maps. */
const CHICK_KEY = { y: CHICK.b, Y: CHICK.l1, d: CHICK.d1, D: CHICK.d2, b: BEAK.b, B: BEAK.d1, e: EYE, p: '#ffb0a8' };
const CHICK_SIDE = [
    '...Yy...',
    '..YYyyy.',
    '..Yyyebb',
    'y.yypyB.',
    'yyYYyyy.',
    'yyyyyyd.',
    '.dyyydd.'
];
const CHICK_FRONT = [
    '..YYyy..',
    '.YYyyyy.',
    '.yeyyey.',
    '.pybbyp.',
    'yyYBByyd',
    'yyyyyyd.',
    '.dyyydd.'
];

function drawDuckling(s, o = {}) {
    const swim = o.kind === 'swim';
    const G = s.h - 1;
    const wl = s.h - 3;
    const top = swim ? wl - 5 + (o.bob || 0) : G - 7 - (o.lift || 0);
    let rows = (o.look ? CHICK_FRONT : CHICK_SIDE).slice();
    if (o.eyes === 'closed') rows = rows.map((r) => r.replace(/e/g, 'D'));
    if (swim) {
        // sit on the water: flat bottom a pixel below the waterline
        rows = rows.slice(0, 6);
        rows.push('yyyyyyy.');
    }
    if (!swim) {
        const fs = o.feet || [0, 0];
        s.hline(2, 3, G - fs[0], BEAK.d1);
        s.hline(4, 5, G - fs[1], BEAK.b);
    }
    s.map(1, top, rows, CHICK_KEY);
    if (swim) s.point('water', 4, wl);
    s.point('head', 5, top - 1);
}

// ===========================================================================
// BUTTERFLIES – fjärilar (one painter, three colours)
// ===========================================================================
const BUTTERFLY = {
    pink: { U: '#ff9ccf', L: '#ff6fb5', d: '#d9468f', s: '#ffffff', h: '#ffd6ec' },
    blue: { U: '#86c8ff', L: '#4fa0f0', d: '#2f6fc0', s: '#ffffff', h: '#d4ecff' },
    yellow: { U: '#ffe45a', L: '#ffcc33', d: '#e09a1a', s: '#ff9a3a', h: '#fff6b0' }
};
const BFLY_BODY = '#4a3040';

// flying, seen from the front/top: 0 open, 1 half, 2 closed up, 3 half.
// Fore- and hind-wings have a little waist between them so it reads as four
// lobes (a butterfly), not a heart.
const BFLY_FLY = [
    [
        'hUa...aUh',
        'UUUa.aUUU',
        'UUsUbUsUU',
        'dUUUbUUUd',
        '..dLbLd..',
        '.LLLbLLL.',
        '.LL...LL.'
    ],
    [
        '.........',
        '.hUa.aUh.',
        '.UsU.UsU.',
        '.dUUbUUd.',
        '..dLbLd..',
        '..LLbLL..',
        '..L...L..'
    ],
    [
        '...UhU...',
        '...UUU...',
        '..aUsUa..',
        '...UbU...',
        '...LbL...',
        '....b....',
        '.........'
    ]
];
// resting on a flower with the wings raised in a V (front view); feet on the
// bottom row. Frame 1 twitches the antennae.
const BFLY_REST = [
    [
        '.hU...Uh.',
        '.UUa.aUU.',
        '..UU.UU..',
        '..UsbsU..',
        '...UbU...',
        '..LLbLL..',
        '....b....',
        '...b.b...'
    ],
    [
        '.hUa.aUh.',
        '.UU...UU.',
        '..UU.UU..',
        '..UsbsU..',
        '...UbU...',
        '..LLbLL..',
        '....b....',
        '...b.b...'
    ]
];
// resting and slowly opening: half-open V, then wide open (front view)
const BFLY_OPEN = [
    [
        '...a.a...',
        '.hU.a.Uh.',
        'hUUU.UUUh',
        '.UsUbUsU.',
        '..dLbLd..',
        '...LbL...',
        '....b....',
        '...b.b...'
    ],
    [
        'hUa...aUh',
        'UUUa.aUUU',
        'UUsUbUsUU',
        'dUUUbUUUd',
        '..dLbLd..',
        '.LLLbLLL.',
        '.LL.b.LL.',
        '...b.b...'
    ]
];

function drawButterfly(s, color, map, ox, oy) {
    const C = BUTTERFLY[color];
    s.map(ox, oy, map, { U: C.U, L: C.L, d: C.d, s: C.s, h: C.h, a: BFLY_BODY, b: BFLY_BODY });
}

function butterflyDef(color) {
    return {
        name: `a-butterfly-${color}`,
        sheet: 'animals-meadow',
        w: 11,
        h: 9,
        anchor: [5, 4],
        anims: {
            fly: [0, 1, 2, 1].map((f) => (s) => {
                drawButterfly(s, color, BFLY_FLY[f], 1, 1);
                s.point('head', 5, 1);
            }),
            idle: { w: 11, h: 10, anchor: [5, 9], frames: [0, 1].map((f) => (s) => {
                drawButterfly(s, color, BFLY_REST[f], 1, 2);
                s.point('head', 5, 1);
            }) },
            special: { w: 11, h: 10, anchor: [5, 9], frames: [0, 1].map((f) => (s) => {
                drawButterfly(s, color, BFLY_OPEN[f], 1, 2);
                s.point('head', 5, 1);
            }) }
        }
    };
}

// ===========================================================================
// HEDGEHOG – igelkott
// ===========================================================================
const SPIKE = { l2: '#e6cba4', l1: '#b88c62', b: '#8a5e44', d1: '#684330', d2: '#4a2e24' };
const HEDGE_FACE = { l1: '#fff2dc', b: '#f2dcbc', d1: '#d9b995', d2: '#b8916e' };
const HEDGE_NOSE = '#2a1a1a';
const HEDGE_FOOT = '#6a4a3a';

/**
 * A spiky dome: a zigzag silhouette of quills round an oval, leaning back
 * (to the left), with pale quill tips. from/to = arc in degrees (0 = right,
 * 90 = down); the rest of the oval stays smooth (belly side).
 */
function spikyDome(s, x, y, w, h, { from = 150, to = 370, step = 26, len = 2 } = {}) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    const tips = [];
    litShape(s, (m) => {
        m.oval(x, y, w, h, '#fff');
        for (let a = from; a <= to; a += step) {
            const r = (a * Math.PI) / 180;
            const r2 = ((a + step * 0.5) * Math.PI) / 180;
            const bx1 = cx + Math.cos(r - 0.18) * (rx - 0.5);
            const by1 = cy + Math.sin(r - 0.18) * (ry - 0.5);
            const bx2 = cx + Math.cos(r2) * (rx - 0.5);
            const by2 = cy + Math.sin(r2) * (ry - 0.5);
            // the tip leans back towards the tail
            const tx = cx + Math.cos(r) * (rx + len) - 1.2;
            const ty = cy + Math.sin(r) * (ry + len) - 0.3;
            m.poly([[bx1, by1], [tx, ty], [bx2, by2]], '#fff');
            m.px(Math.round(tx - 0.5), Math.round(ty - 0.5), '#fff');
            tips.push([Math.round(tx - 0.5), Math.round(ty - 0.5)]);
        }
    }, SPIKE);
    for (const [tx, ty] of tips) if (s.opaque(tx, ty)) s.px(tx, ty, SPIKE.l2);
    // quill texture inside: short strokes leaning back, with pale tips
    for (let j = y + 2; j < y + h - 1; j += 2) {
        for (let i = x + 2 + (((j - y) / 2) % 2) * 2; i < x + w - 2; i += 4) {
            if (!s.opaque(i - 1, j - 1) || !s.opaque(i + 1, j + 1)) continue;
            s.px(i, j, SPIKE.d1);
            s.px(i + 1, j + 1, SPIKE.d1);
            s.px(i - 1, j - 1, SPIKE.l1);
        }
    }
}

/**
 * kind: 'stand' | 'sniff' (eat) | 'ball' (sleep) | 'wave' (special)
 */
function drawHedgehog(s, o = {}) {
    const G = s.h - 1;
    const kind = o.kind || 'stand';
    if (kind === 'ball') {
        // curled into a spiky ball, breathing
        const b = o.breath || 0;
        spikyDome(s, 3, G - 7 - b, 9 + b, 8 + b, { from: 110, to: 420, step: 32, len: 1.6 });
        // the face tucked in at the front, just the nose peeking out
        s.map(10 + b, G - 3, ['ff', 'fn'], { f: HEDGE_FACE.d1, n: HEDGE_NOSE });
        s.px(9 + b, G - 3, HEDGE_FACE.d2);
        s.hline(4, 10 + b, G, SPIKE.d2);
        s.point('head', 7, G - 10 - b);
        return;
    }
    if (kind === 'wave') {
        // uncurled, sitting up on its bottom, waving a tiny paw
        spikyDome(s, 2, G - 9, 8, 10, { from: 110, to: 300, step: 30, len: 1.6 });
        s.oval(5, G - 7, 4, 7, HEDGE_FACE.b);             // pale tummy
        s.px(6, G - 6, HEDGE_FACE.l1);
        s.hline(4, 5, G, HEDGE_FOOT);
        s.hline(8, 9, G, HEDGE_FOOT);
        // face, front-on, peeking over the tummy
        litShape(s, (m) => m.oval(4, G - 12, 7, 5, '#fff'), HEDGE_FACE, { deep: false });
        s.px(4, G - 13, SPIKE.b);
        s.px(9, G - 13, SPIKE.b);
        eye2(s, 5, G - 11, o.eyes || 'happy');
        eye2(s, 8, G - 11, o.eyes || 'happy');
        s.px(7, G - 9, HEDGE_NOSE);
        s.px(4, G - 9, BLUSH);
        s.px(10, G - 9, BLUSH);
        s.px(7, G - 8, MOUTH);
        // the waving paw
        const f = o.f || 0;
        const tip = f ? [11, G - 10] : [12, G - 8];
        s.line(9, G - 5, tip[0], tip[1], HEDGE_FACE.d1);
        s.px(tip[0], tip[1], HEDGE_FACE.b);
        s.px(tip[0], tip[1] - 1, HEDGE_FACE.b);
        s.point('head', 7, G - 13);
        return;
    }
    const bob = o.bob || 0;
    const feet = o.feet || [0, 0];
    // tiny feet
    s.hline(3 + feet[0], 4 + feet[0], G, HEDGE_FOOT);
    s.hline(7 + feet[1], 8 + feet[1], G, HEDGE_FOOT);
    // pale belly under the quills
    s.oval(3, G - 3 + bob, 8, 3, HEDGE_FACE.d1);
    spikyDome(s, 1, G - 7 + bob, 10, 7, { from: 150, to: 330, step: 28, len: 1.6 });
    const down = kind === 'sniff' ? 2 : 0;
    const nose = o.nose || 0;
    const fx = 7;
    const fy = G - 5 + bob + down;
    if (o.look) {
        // turns its little face to the camera
        litShape(s, (m) => m.oval(fx - 1, fy - 1, 7, 6, '#fff'), HEDGE_FACE, { deep: false });
        s.px(fx - 1, fy - 2, SPIKE.b);
        s.px(fx + 4, fy - 2, SPIKE.b);
        eye2(s, fx, fy + 1, o.eyes);
        eye2(s, fx + 3, fy + 1, o.eyes);
        s.px(fx + 2, fy + 3, HEDGE_NOSE);
        s.px(fx - 1, fy + 3, BLUSH);
        s.px(fx + 5, fy + 3, BLUSH);
        s.point('head', 6, G - 10 + bob);
        return;
    }
    // face at the front with a pointy snout
    litShape(s, (m) => {
        m.oval(fx, fy, 5, 5, '#fff');
        m.poly([[fx + 3, fy + 1], [fx + 7, fy + 2.5 - nose], [fx + 3, fy + 4]], '#fff');
    }, HEDGE_FACE, { deep: false });
    s.px(fx + 1, fy - 1, SPIKE.b);                         // little ear
    s.px(fx + 1, fy, HEDGE_FACE.d2);
    s.px(fx + 7, fy + 2 - nose, HEDGE_NOSE);
    eye2(s, fx + 3, fy + 1, o.eyes);
    s.px(fx + 2, fy + 3, BLUSH);
    if (kind === 'sniff' && o.munch) s.px(fx + 6, fy + 4, MOUTH);
    if (kind === 'sniff') s.point('mouth', fx + 7, G);
    else s.point('head', 6, G - 10 + bob);
}

// ===========================================================================
// CAT – katt (grey tabby farm cat with white socks and bib)
// ===========================================================================
const CAT = { l2: '#d0cdd8', l1: '#afabba', b: '#8e8a9c', d1: '#6d687c', d2: '#4f4a60' };
const TABBY = '#57506a';
const CAT_WHITE = { l1: '#ffffff', b: '#f6f3f2', d1: '#d9d2de' };
const CAT_KEY = {
    c: CAT.b, C: CAT.l1, L: CAT.l2, d: CAT.d1, D: CAT.d2, t: TABBY,
    w: CAT_WHITE.b, W: CAT_WHITE.l1, v: CAT_WHITE.d1, p: '#f4a9b2', n: NOSE, m: MOUTH
};
// front-on head with pointy ears and the tabby "M"; '1' '2' mark the eyes
const CAT_HEAD = [
    '.C......c.',
    '.Cp....pc.',
    'cCCtcttCcd',
    'cC1ccc2ccd',
    'cCccccccdd',
    'tcwwnwwcdt',
    '.cwwmwwcd.',
    '..dwwwwd..'
];

function catHead(s, x, y, { eyes = 'open', mouth = 'smile', ear = 0 } = {}) {
    const rows = CAT_HEAD.map((r) => r.replace(/[12]/g, 'c'));
    if (ear) {
        // the far ear flicks sideways
        rows[0] = '.C........';
        rows[1] = '.Cp.....cc';
    }
    s.map(x, y, rows, CAT_KEY);
    if (eyes === 'big') {
        // looking straight into the camera: big round eyes with two sparkles
        for (const ex of [x + 2, x + 6]) {
            s.rect(ex, y + 2, 2, 3, EYE);
            s.px(ex + 1, y + 2, SPARK);
            s.px(ex, y + 4, '#5a4a6a');
        }
    } else {
        eye2(s, x + 2, y + 3, eyes);
        eye2(s, x + 6, y + 3, eyes);
    }
    if (mouth === 'open') {
        s.rect(x + 4, y + 6, 2, 2, MOUTH);
        s.px(x + 4, y + 7, TONGUE);
    } else if (mouth === 'yawn') {
        s.rect(x + 3, y + 5, 4, 3, MOUTH);
        s.hline(x + 4, x + 5, y + 7, TONGUE);
        s.px(x + 3, y + 5, CAT_WHITE.b);
        s.px(x + 6, y + 5, CAT_WHITE.b);
    }
    s.px(x + 1, y + 5, BLUSH);
    s.px(x + 8, y + 5, BLUSH);
}

/**
 * kind: 'sit' | 'walk' | 'eat' | 'stretch' | 'sleep'
 */
function drawCat(s, o = {}) {
    const G = s.h - 1;
    const kind = o.kind || 'sit';
    if (kind === 'sit') {
        const tail = o.tail || 0;
        // tail curled round the front paws
        s.thick(2, G - 1, 4, G, 2, CAT.d1);
        s.thick(4, G, 10, G, 2, CAT.b);
        s.px(11, G - 1 - tail, CAT.b);
        s.px(11, G - tail, CAT.d1);
        s.px(6, G, TABBY);
        s.px(8, G, TABBY);
        // body: haunch at the back, chest in front
        litShape(s, (m) => {
            m.oval(2, G - 7, 9, 8, '#fff');
            m.oval(5, G - 8, 6, 6, '#fff');
        }, CAT);
        s.oval(7, G - 6, 3, 5, CAT_WHITE.b);          // white bib
        s.px(7, G - 5, CAT_WHITE.l1);
        // tabby stripes on the haunch
        s.line(3, G - 5, 4, G - 4, TABBY);
        s.line(3, G - 2, 4, G - 1, TABBY);
        // white front paws
        s.map(7, G - 1, ['wwvw', 'vwvv'], CAT_KEY);
        catHead(s, 3, G - 13 + (o.bob || 0), o);
        s.point('head', 8, G - 14);
        return;
    }
    if (kind === 'sleep') {
        // curled up in a ball, tail round the nose
        litShape(s, (m) => m.oval(1, G - 6, 13, 7, '#fff'), CAT);
        s.line(3, G - 4, 4, G - 5, TABBY);
        s.line(6, G - 5, 7, G - 6, TABBY);
        catHead(s, 6, G - 8, { eyes: 'closed' });
        s.thick(2, G, 11, G, 2, CAT.d1);
        s.hline(3, 10, G - 1, CAT.b);
        s.px(11, G - 1, TABBY);
        s.point('head', 10, G - 9);
        return;
    }
    const legs = o.legs || [0, 0, 0, 0];   // lift of back-far, back-near, front-far, front-near
    if (kind === 'stretch') {
        // big front stretch: chest down, bottom up, tail high
        s.thick(3, G - 7, 1, G - 11, 2, CAT.b);
        s.px(1, G - 12, TABBY);
        s.rect(3, G - 3, 2, 4, CAT.d1);
        s.rect(5, G - 3, 2, 4, CAT.b);
        s.hline(3, 6, G, CAT_WHITE.b);
        litShape(s, (m) => {
            m.thick(4, G - 6, 11, G - 3, 4, '#fff');
        }, CAT);
        s.line(5, G - 7, 6, G - 6, TABBY);
        s.line(8, G - 6, 9, G - 5, TABBY);
        s.map(11, G - 1, ['wwwwv', 'vvwvv'], CAT_KEY);   // front legs stretched out flat
        catHead(s, 9, G - 9, { eyes: o.eyes || 'closed', mouth: o.mouth || 'yawn' });
        s.point('head', 14, G - 10);
        return;
    }
    // walking / eating: side body, head front-on
    const bob = o.bob || 0;
    const tailUp = kind === 'walk' ? 1 : 0;
    s.thick(3, G - 6 + bob, 1, G - 10 + bob - tailUp, 2, CAT.b);   // tail up
    s.px(1, G - 11 + bob - tailUp, TABBY);
    s.px(2, G - 8 + bob, TABBY);
    const lx = [4, 6, 10, 12];
    lx.forEach((x, i) => {
        if (i % 2) return;
        s.rect(x, G - 3, 2, 3 - legs[i] + 1, CAT.d1);
        s.hline(x, x + 1, G - legs[i], CAT_WHITE.d1);
    });
    litShape(s, (m) => m.oval(3, G - 8 + bob, 12, 6, '#fff'), CAT);
    s.oval(10, G - 5 + bob, 4, 2, CAT_WHITE.b);
    s.line(6, G - 7 + bob, 7, G - 6 + bob, TABBY);
    s.line(9, G - 7 + bob, 10, G - 6 + bob, TABBY);
    lx.forEach((x, i) => {
        if (!(i % 2)) return;
        s.rect(x, G - 3, 2, 3 - legs[i] + 1, CAT.b);
        s.rect(x, G - 1 - legs[i], 2, 2, CAT_WHITE.b);
    });
    if (kind === 'eat') {
        catHead(s, 10, G - 7 + (o.munch ? 1 : 0), { eyes: 'happy', mouth: o.munch ? 'open' : 'smile' });
        s.point('mouth', 15, G);
        return;
    }
    catHead(s, 10, G - 13 + bob, o);
    s.point('head', 15, G - 14 + bob);
}

// ===========================================================================
// PROPS – trees, bushes, flowers, the red cottage, fences, rocks, hay, sign
// ===========================================================================
const LEAF = { l2: '#d6f09c', l1: '#a9dc74', b: '#7fc45c', d1: '#5aa04a', d2: '#3f7c45' };
const BIRCH_LEAF = { l2: '#eef9b4', l1: '#cdeb86', b: '#a9d866', d1: '#80b852', d2: '#5d9448' };
const BARK = { l1: '#aa7c5c', b: '#875a40', d1: '#664131', d2: '#4a2f27' };
const BIRCH_BARK = { l1: '#ffffff', b: '#f2eee8', d1: '#d6ccc8', d2: '#aa9ea4' };
const BIRCH_MARK = '#3a2e36';
const APPLE = { l1: '#ff9a8a', b: '#e84a48', d1: '#b82e3c' };

/**
 * Round deciduous tree. clumps: [[cx, cy, r], ...] (painted bottom-up as leaf bunches).
 * trunk: { x, top, w } (x = left edge), frame bottom is the ground.
 */
function tree(s, clumps, trunk, R = LEAF, { speck = 7, seed = 3 } = {}) {
    const G = s.h - 1;
    const { x, top, w } = trunk;
    // trunk with flared roots and a branch fork into the crown
    litShape(s, (m) => {
        m.poly([[x - 2, G + 1], [x, G - 2], [x, top], [x + w, top], [x + w, G - 2], [x + w + 2, G + 1]], '#fff');
        m.thick(x + 1, top + 3, x - 3, top - 3, 2, '#fff');
        m.thick(x + w - 2, top + 2, x + w + 3, top - 4, 2, '#fff');
    }, BARK, { deep: false });
    s.vline(x + 1, top + 2, G - 2, BARK.l1);
    s.vline(x + w - 2, top + 4, G - 3, BARK.d1);
    s.px(x + 2, G - 5, BARK.d1);
    s.px(x + 2, G - 6, BARK.d1);
    s.hline(x - 1, x + w, G, BARK.d2);
    // crown
    const b = crown(s, clumps, R, { seed, specks: speck });
    return b;
}

/** Tiny local xorshift so the props do not depend on draw order elsewhere. */
function rngLocal(seed) {
    let v = seed >>> 0 || 1;
    return () => {
        v ^= v << 13;
        v ^= v >>> 17;
        v ^= v << 5;
        return ((v >>> 0) % 10000) / 10000;
    };
}

/** One bunch of leaves: base colour, a 2-px shaded underside, a lit top rim. */
function leafBunch(s, cx, cy, r, R) {
    const inside = (x, y, ox, oy, rr = r) => ((x + 0.5 - (cx + ox)) ** 2 + (y + 0.5 - (cy + oy)) ** 2) <= rr * rr + 0.4;
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y += 1) {
        for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x += 1) {
            if (!inside(x, y, 0, 0)) continue;
            let c = R.b;
            if (!inside(x, y, -1.4, -2.2)) c = R.d1;
            else if (!inside(x, y, 1, 1.3) && y < cy + r * 0.2) c = R.l1;
            if (r >= 4 && inside(x, y, -r * 0.4, -r * 0.45, Math.max(1, r * 0.28))) c = R.l2;
            s.px(x, y, c);
        }
    }
}

/**
 * Leafy crown from round clumps, painted as stacked leaf bunches: each clump is
 * a little lit ball, drawn from the bottom up, so every bunch's shaded
 * underside overlaps the sunny top of the bunch below it. Then the whole
 * silhouette gets a darker underside and a few sunlit sparkles.
 */
function crown(s, clumps, R, { seed = 1, specks = 10 } = {}) {
    const order = clumps.map((c, i) => [c, i]).sort((a, b) => (b[0][1] + b[0][2] * 0.3) - (a[0][1] + a[0][2] * 0.3));
    const m = new Sprite(s.w, s.h);
    for (const [cx, cy, r] of clumps) m.circle(cx, cy, r, '#fff');
    const bb = m.bounds();
    for (const [[cx, cy, r]] of order) leafBunch(s, cx, cy, r, R);
    // deeper shade on the lower part of the crown and its underside
    const inU = (x, y) => m.opaque(x, y);
    for (let y = bb.y; y < bb.y + bb.h; y += 1) {
        for (let x = bb.x; x < bb.x + bb.w; x += 1) {
            if (!inU(x, y)) continue;
            const low = (y - bb.y) / bb.h;
            if (!inU(x, y + 1) || (!inU(x, y + 2) && low > 0.6)) s.px(x, y, R.d2);
            else if (low > 0.78) {
                const cur = s.get(x, y);
                const hex = '#' + cur.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
                if (hex === R.b) s.px(x, y, R.d1);
                else if (hex === R.l1 || hex === R.l2) s.px(x, y, R.b);
            }
        }
    }
    // a few sunlit sparkles on the top-left
    const rnd = rngLocal(seed);
    for (let i = 0; i < specks * 4; i += 1) {
        const x = bb.x + Math.floor(rnd() * bb.w * 0.7);
        const y = bb.y + Math.floor(rnd() * bb.h * 0.6);
        if (!s.opaque(x, y)) continue;
        const cur = s.get(x, y);
        const hex = '#' + cur.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
        if (hex === R.l1 && rnd() < 0.5) s.px(x, y, R.l2);
    }
    return bb;
}

function drawOak(s) {
    tree(s, [
        [12, 22, 9], [28, 21, 9], [20, 15, 10], [11, 13, 7], [29, 12, 7], [20, 25, 9], [20, 8, 7]
    ], { x: 17, top: 28, w: 6 }, LEAF, { seed: 5 });
}

function drawOak2(s) {
    // a broad spreading crown held up by a forked trunk you can see beneath it
    const G = s.h - 1;
    litShape(s, (m) => {
        m.poly([[16, G + 1], [18, G - 2], [18, 30], [23, 30], [23, G - 2], [25, G + 1]], '#fff');
        m.thick(19, 31, 12, 21, 3, '#fff');
        m.thick(22, 31, 29, 21, 3, '#fff');
        m.thick(20, 30, 21, 18, 2, '#fff');
    }, BARK, { deep: false });
    s.vline(19, 31, G - 2, BARK.l1);
    s.vline(22, 32, G - 3, BARK.d1);
    s.px(20, G - 6, BARK.d1);
    s.px(20, G - 7, BARK.d1);
    s.hline(17, 24, G, BARK.d2);
    crown(s, [
        [7, 20, 6], [33, 20, 6], [13, 15, 8], [27, 14, 8], [20, 10, 8], [20, 19, 7], [10, 22, 5], [30, 22, 5]
    ], LEAF, { seed: 11 });
}

function drawAppleTree(s) {
    tree(s, [
        [10, 17, 7], [23, 17, 7], [16, 12, 8], [17, 20, 7], [11, 10, 5], [23, 10, 5]
    ], { x: 14, top: 24, w: 5 }, LEAF, { seed: 21 });
    // red apples hanging in the crown
    for (const [ax, ay] of [[9, 15], [15, 9], [22, 13], [19, 20], [12, 21], [26, 18], [20, 6], [7, 11]]) {
        s.rect(ax, ay, 2, 2, APPLE.b);
        s.px(ax, ay, APPLE.l1);
        s.px(ax + 1, ay + 1, APPLE.d1);
        s.px(ax + 1, ay - 1, BARK.d1);
    }
    s.point('apple', 20, 21);        // the lowest apple, if the game wants one to fall
}

function drawBirch(s) {
    const G = s.h - 1;
    const tx = 10;
    // slender white trunk rising almost to the top, a touch of a lean
    litShape(s, (m) => {
        m.poly([[tx - 1, G + 1], [tx, G - 2], [tx + 1, 6], [tx + 3, 6], [tx + 4, G - 2], [tx + 5, G + 1]], '#fff');
    }, BIRCH_BARK, { deep: false });
    // thin dark branches reaching out into the crown
    for (const [x0, y0, x1, y1] of [[tx + 1, 30, tx - 5, 22], [tx + 3, 26, tx + 9, 18], [tx + 1, 18, tx - 4, 11], [tx + 3, 14, tx + 8, 8]]) {
        s.line(x0, y0, x1, y1, '#6a5a60');
    }
    // black birch marks
    for (const [mx, my, len] of [[tx, G - 3, 2], [tx + 2, G - 7, 2], [tx + 1, G - 12, 3], [tx + 3, G - 16, 1], [tx, G - 19, 2], [tx + 2, 33, 2], [tx + 1, 27, 2], [tx + 2, 21, 1], [tx + 1, 15, 2], [tx + 2, 10, 1]]) {
        s.hline(mx, mx + len - 1, my, BIRCH_MARK);
    }
    s.hline(tx - 1, tx + 4, G, '#8a7c80');
    s.px(tx, G - 1, BIRCH_MARK);
    // airy crown: small bunches with sky between them, drooping twigs
    const clumps = [
        [12, 5, 3], [8, 9, 3], [16, 9, 3], [5, 15, 3], [12, 12, 3], [18, 15, 3], [4, 22, 3],
        [10, 19, 3], [17, 22, 3], [7, 27, 3], [14, 27, 2], [19, 29, 2], [3, 30, 2], [11, 32, 2]
    ];
    // hanging twig strands under the bunches
    for (const [x, y0, y1] of [[2, 30, 36], [5, 27, 34], [8, 30, 37], [15, 28, 34], [19, 30, 37], [12, 33, 38], [20, 16, 22], [3, 16, 22]]) {
        s.vline(x, y0, y1, BIRCH_LEAF.d1);
        s.px(x, y1, BIRCH_LEAF.b);
    }
    const order = clumps.slice().sort((a, b) => b[1] - a[1]);
    for (const [cx, cy, r] of order) leafBunch(s, cx, cy, r, BIRCH_LEAF);
    // loose little leaves round the edges so the crown looks airy, not round
    for (const [lx, ly] of [[9, 2], [15, 5], [19, 11], [21, 18], [1, 18], [2, 12], [6, 5], [20, 25], [1, 26], [14, 31], [6, 32], [16, 2], [5, 20], [20, 32]]) {
        s.px(lx, ly, BIRCH_LEAF.l1);
    }
    // the white trunk shows through the gaps in the lower crown
    for (const y of [24, 25, 30, 31, 35, 36, 37]) s.hline(tx + 1, tx + 3, y, y % 2 ? BIRCH_BARK.b : BIRCH_BARK.l1);
    s.hline(tx + 1, tx + 2, 36, BIRCH_MARK);
}

function drawBush(s, big) {
    const G = s.h - 1;
    const cl = big
        ? [[4, G - 3, 3], [14, G - 3, 3], [7, G - 5, 4], [12, G - 5, 4], [9, G - 3, 4]]
        : [[4, G - 3, 3], [10, G - 3, 3], [7, G - 5, 4]];
    crown(s, cl, LEAF, { seed: big ? 7 : 9, specks: 3 });
    s.hline(cl[0][0] - 2, cl[1][0] + 2, G, LEAF.d2);
    if (!big) {
        // a few wild-rose flowers
        for (const [fx, fy] of [[4, G - 5], [9, G - 7], [11, G - 3]]) {
            s.px(fx, fy, '#ffffff');
            s.px(fx + 1, fy, '#ffc4d8');
            s.px(fx, fy + 1, '#ffc4d8');
            s.px(fx + 1, fy + 1, '#ffe27a');
        }
    }
}

// --- flowers and grass (2 sway frames each) ---------------------------------
const STEM = { b: '#5aa04a', d1: '#3f7c45', l1: '#86c860' };

function stem(s, x0, y0, x1, y1, col = STEM.b) {
    s.line(x0, y0, x1, y1, col);
}

/** kind: daisy | poppy | cornflower | buttercup; sway: 0 or 1 (frame 2 leans) */
function drawFlowers(s, kind, sway) {
    const G = s.h - 1;
    // a little clump: [stem base x, height, head x offset]; heads at different
    // heights so their outlines do not melt together
    const plants = {
        daisy: [[2, 4, 0], [5, 7, 0], [8, 3, 0]],
        poppy: [[3, 7, 0], [6, 4, 1]],
        cornflower: [[2, 4, 0], [5, 7, 1], [8, 2, 0]],
        buttercup: [[2, 5, 0], [6, 7, 0], [8, 3, 0]]
    }[kind];
    // leaves at the base
    s.px(1, G, STEM.d1);
    s.px(2, G - 1, STEM.b);
    s.px(7, G, STEM.d1);
    s.px(6, G - 1, STEM.l1);
    for (const [bx, h, dx] of plants) {
        const hx = bx + dx + (h > 3 ? sway : 0);
        const hy = G - h;
        stem(s, bx, G, hx, hy + 1, h > 4 ? STEM.b : STEM.d1);
    }
    for (const [bx, h, dx] of plants) {
        const hx = bx + dx + (h > 3 ? sway : 0);
        const hy = G - h;
        if (kind === 'daisy') {
            s.px(hx, hy - 1, '#ffffff');
            s.px(hx - 1, hy, '#ffffff');
            s.px(hx + 1, hy, '#f2eef6');
            s.px(hx, hy + 1, '#e4dcec');
            s.px(hx, hy, '#ffd84a');
        } else if (kind === 'poppy') {
            s.map(hx - 1, hy - 1, ['rRr', 'rkr', '.r.'], { r: '#ec3b3b', R: '#ff7a6a', k: '#3a1f2a' });
        } else if (kind === 'cornflower') {
            if (h <= 2) {
                s.px(hx, hy, '#6a9cf4');
                continue;
            }
            s.map(hx - 1, hy - 1, ['B.B', '.b.', 'bdb'], { b: '#5a8cf0', B: '#9cc6ff', d: '#3552b8' });
        } else {
            if (h <= 3) {
                s.px(hx, hy, '#ffd83a');
                s.px(hx, hy - 1, '#fff3a0');
                continue;
            }
            s.map(hx - 1, hy - 1, ['Y.y', 'yyy', '.d.'], { y: '#ffd83a', Y: '#fff3a0', d: '#e6a820' });
        }
    }
}

function drawGrass(s, variant, sway) {
    const G = s.h - 1;
    const blades = variant === 0
        ? [[1, 4, -1], [2, 6, 0], [3, 7, 1], [4, 5, 1], [5, 6, 2], [3, 3, -1]]
        : [[1, 5, -1], [2, 7, 0], [4, 6, 1], [5, 4, 2], [3, 5, 0]];
    blades.forEach(([bx, h, lean], i) => {
        const tx = bx + lean + (h > 4 ? sway : 0);
        const col = i % 3 === 0 ? LEAF.d1 : i % 3 === 1 ? LEAF.b : LEAF.l1;
        s.line(bx, G, tx, G - h, col);
    });
}

// --- the Falu-red cottage -----------------------------------------------------
const FALU = { l1: '#d45a48', b: '#b8352e', d1: '#962a2c', d2: '#71202a' };
const TRIM = { l1: '#ffffff', b: '#f6f1ea', d1: '#d8cfd0' };
const ROOF = { l1: '#5c5670', b: '#46405a', d1: '#35304a', d2: '#28243a' };
const GLASS = { b: '#a8d8f0', l1: '#e4f6ff', d1: '#78a8d0' };
const DOOR = { l1: '#7fc0a8', b: '#5aa08a', d1: '#3f7c6c' };
const STONE = { l1: '#d8d4dc', b: '#b4aebc', d1: '#8c8698', d2: '#6a6478' };

function window4(s, x, y, w = 7, h = 7) {
    // white frame with a cross, sky reflections in the panes
    s.rect(x, y, w, h, TRIM.b);
    s.rect(x + 1, y + 1, w - 2, h - 2, GLASS.b);
    s.vline(x + Math.floor(w / 2), y + 1, y + h - 2, TRIM.b);
    s.hline(x + 1, x + w - 2, y + Math.floor(h / 2), TRIM.b);
    s.px(x + 1, y + 1, GLASS.l1);
    s.px(x + 2, y + 1, GLASS.l1);
    s.px(x + 1, y + 2, GLASS.l1);
    s.px(x + w - 2, y + h - 2, GLASS.d1);
    s.px(x + Math.floor(w / 2) + 1, y + Math.floor(h / 2) + 1, GLASS.l1);
    s.hline(x, x + w - 1, y + h - 1, TRIM.d1);
    // flower box underneath
    s.rect(x, y + h, w, 2, BARK.b);
    s.hline(x, x + w - 1, y + h, BARK.l1);
    for (let i = 0; i < w; i += 2) s.px(x + i, y + h - 1, ['#ff6f9a', '#ffd84a', '#ffffff'][(i / 2) % 3]);
}

function drawCottage(s) {
    const G = s.h - 1;
    const wx0 = 4;
    const wx1 = 41;
    const wy = 19;                 // top of the wall
    // chimney (behind the roof ridge)
    s.rect(31, 3, 5, 9, TRIM.b);
    s.vline(31, 3, 11, TRIM.l1);
    s.vline(35, 4, 11, TRIM.d1);
    s.rect(30, 2, 7, 2, ROOF.d1);
    s.hline(30, 36, 2, ROOF.b);
    // wall with vertical boards
    s.rect(wx0, wy, wx1 - wx0 + 1, G - wy - 1, FALU.b);
    for (let x = wx0 + 3; x < wx1; x += 3) s.vline(x, wy + 1, G - 3, FALU.d1);
    s.vline(wx0 + 2, wy + 1, G - 3, FALU.l1);
    s.hline(wx0, wx1, wy, FALU.d2);
    s.hline(wx0, wx1, wy + 1, FALU.d1);
    // white corner boards
    s.rect(wx0, wy, 2, G - wy - 1, TRIM.b);
    s.vline(wx0, wy, G - 2, TRIM.l1);
    s.rect(wx1 - 1, wy, 2, G - wy - 1, TRIM.d1);
    s.vline(wx1 - 1, wy, G - 2, TRIM.b);
    // stone foundation
    s.rect(wx0 - 1, G - 2, wx1 - wx0 + 3, 3, STONE.b);
    s.hline(wx0 - 1, wx1 + 1, G - 2, STONE.l1);
    s.hline(wx0 - 1, wx1 + 1, G, STONE.d1);
    for (let x = wx0 + 2; x < wx1; x += 5) s.px(x, G - 1, STONE.d1);
    // windows
    window4(s, 8, 23, 7, 7);
    window4(s, 30, 23, 7, 7);
    // door with a porch (farstukvist)
    const dx = 19;
    s.rect(dx, 25, 7, G - 27, TRIM.b);                 // frame
    s.rect(dx + 1, 26, 5, G - 28, DOOR.b);
    s.vline(dx + 1, 26, G - 3, DOOR.l1);
    s.vline(dx + 5, 26, G - 3, DOOR.d1);
    s.rect(dx + 2, 27, 3, 2, GLASS.b);
    s.px(dx + 2, 27, GLASS.l1);
    s.px(dx + 4, 31, '#ffd84a');                        // door knob
    // porch posts
    s.rect(dx - 2, 24, 2, G - 26, TRIM.b);
    s.vline(dx - 2, 24, G - 3, TRIM.l1);
    s.rect(dx + 7, 24, 2, G - 26, TRIM.d1);
    s.vline(dx + 7, 24, G - 3, TRIM.b);
    // steps
    s.rect(dx - 2, G - 2, 11, 2, STONE.l1);
    s.rect(dx - 3, G - 1, 13, 2, STONE.b);
    s.hline(dx - 3, dx + 9, G, STONE.d1);
    // roof: dark tiles, white eave board and gable trim
    s.poly([[0, 19.5], [8, 8], [38, 8], [46, 19.5]], ROOF.b);
    for (let y = 11; y < 19; y += 3) {
        const inset = Math.round((19.5 - y) * 0.7);
        s.hline(inset + 1, 45 - inset, y, ROOF.d1);
    }
    s.hline(9, 37, 8, ROOF.l1);
    s.hline(8, 38, 9, ROOF.l1);
    s.line(0, 19, 8, 8, TRIM.b);
    s.line(1, 19, 9, 8, TRIM.d1);
    s.line(46, 19, 38, 8, TRIM.d1);
    s.hline(0, 46, 19, TRIM.b);
    s.hline(1, 45, 20, ROOF.d2);
    // re-draw the chimney top above the ridge
    s.rect(31, 3, 5, 5, TRIM.b);
    s.vline(31, 3, 7, TRIM.l1);
    s.vline(35, 4, 7, TRIM.d1);
    s.rect(30, 2, 7, 2, ROOF.d1);
    s.hline(30, 36, 2, ROOF.b);
    // little attic window in the roof
    s.map(20, 10, ['.ww.', 'wggw', 'wGgw', 'wwww'], { w: TRIM.b, g: GLASS.b, G: GLASS.l1 });
    // the porch (farstukvist): a little gabled roof over the door, in front
    s.map(dx - 4, 18, [
        '.......W.......',
        '......WRW......',
        '.....WRRRW.....',
        '....WRRfRRW....',
        '...WRRfwfRRW...',
        '..WRRfffffRRW..',
        '.WRRRRRRRRRRRV.',
        '..DDDDDDDDDDD..'
    ], { W: TRIM.b, V: TRIM.d1, R: ROOF.b, f: FALU.b, w: TRIM.b, D: ROOF.d2 });
    s.point('door', dx + 3, G);
    s.point('chimney', 33, 1);
}

// --- fence, rocks, hay bale, signpost -----------------------------------------
const WOOD_GREY = { l1: '#d6cfc8', b: '#b3aaa6', d1: '#8d8389', d2: '#6a6170' };
const WOOD = { l1: '#d8a56e', b: '#b8844e', d1: '#916238', d2: '#6a462c' };

function fencePost(s, x, top) {
    const G = s.h - 1;
    s.rect(x, top + 1, 3, G - top, WOOD_GREY.b);
    s.hline(x + 1, x + 1, top, WOOD_GREY.l1);           // rounded, weathered top
    s.vline(x, top + 1, G, WOOD_GREY.l1);
    s.vline(x + 2, top + 1, G, WOOD_GREY.d1);
    s.px(x + 1, top + 3, WOOD_GREY.d1);                 // grain and a knot
    s.px(x + 1, top + 4, WOOD_GREY.d1);
    s.px(x + 1, G - 2, WOOD_GREY.d2);
    s.px(x + 1, G, WOOD_GREY.d1);
}

function drawFence(s) {
    const G = s.h - 1;
    // two weathered rails running edge to edge so segments tile seamlessly
    [G - 8, G - 4].forEach((ry, k) => {
        s.rect(0, ry, s.w, 2, WOOD_GREY.b);
        s.hline(0, s.w - 1, ry, WOOD_GREY.l1);
        // grain streaks and knots
        for (let x = 1 + k * 3; x < s.w; x += 6) s.hline(x, x + 2, ry + 1, WOOD_GREY.d1);
        s.px(13 - k * 9, ry, WOOD_GREY.d1);
    });
    fencePost(s, 8, G - 9);
    // a cat (or bird) sits with its feet on this row, just above the top rail
    s.point('seat', 15, G - 9);
}

function drawRock(s, mossy) {
    const G = s.h - 1;
    const w = mossy ? 8 : 12;
    const h = mossy ? 5 : 7;
    litShape(s, (m) => {
        m.oval(1, G - h + 1, w, h + 1, '#fff');
        m.rect(1, G - 1, w, 2, '#fff');
    }, STONE);
    if (!mossy) {
        s.line(6, G - 4, 7, G - 2, STONE.d1);
        s.px(4, G - 5, STONE.l1);
        s.px(9, G - 3, STONE.d1);
        // a tuft of moss
        s.map(3, G - 6, ['.gg.', 'ggGg'], { g: LEAF.b, G: LEAF.l1 });
    } else {
        // mossy top
        s.map(2, G - 4, ['.gGGg.', 'gggGgg', 'g.gg.g'], { g: LEAF.d1, G: LEAF.b });
        s.px(3, G - 4, LEAF.l1);
    }
}

function drawHayBale(s) {
    const G = s.h - 1;
    const HAY = { l2: '#fff2b0', l1: '#f6dd84', b: '#e8c05a', d1: '#c8983c', d2: '#9c7030' };
    // the round bale seen a little from the side: body, then the spiral face
    litShape(s, (m) => {
        m.rect(1, G - 10, 6, 11, '#fff');
        m.oval(1, G - 10, 4, 11, '#fff');
    }, HAY);
    for (let y = G - 8; y < G; y += 2) s.hline(2, 5, y, HAY.d1);
    litShape(s, (m) => m.oval(4, G - 11, 11, 12, '#fff'), HAY);
    // the spiral
    s.map(6, G - 9, [
        '..ddd..',
        '.d...d.',
        'd..d..d',
        'd.d.d.d',
        'd..dd.d',
        '.d....d',
        '..dddd.'
    ], { d: HAY.d1 });
    s.px(9, G - 6, HAY.l2);
    // loose straws
    s.px(0, G - 6, HAY.l1);
    s.px(15, G - 4, HAY.b);
    s.px(3, G - 11, HAY.l1);
}

function drawSign(s) {
    const G = s.h - 1;
    // post
    s.rect(6, 6, 2, G - 5, WOOD.b);
    s.vline(6, 6, G, WOOD.l1);
    s.hline(5, 8, G, WOOD.d1);
    // blank board made of two planks, with nails
    s.rect(1, 1, 12, 8, WOOD.b);
    s.hline(1, 12, 1, WOOD.l1);
    s.vline(1, 1, 8, WOOD.l1);
    s.hline(1, 12, 4, WOOD.d1);
    s.hline(1, 12, 5, WOOD.l1);
    s.hline(1, 12, 8, WOOD.d1);
    s.vline(12, 2, 8, WOOD.d1);
    s.px(2, 2, WOOD.d2);
    s.px(11, 2, WOOD.d2);
    s.px(2, 6, WOOD.d2);
    s.px(11, 6, WOOD.d2);
    s.px(4, 3, WOOD.d1);
    s.px(9, 7, WOOD.d1);
    s.point('text', 7, 5);
}

const PROP = (name, w, h, paint, extra = {}) => ({
    name, sheet: 'props-meadow', w, h, anchor: [Math.floor(w / 2), h - 1],
    anims: { idle: Array.isArray(paint) ? paint : [paint] }, ...extra
});

const PROPS = [
    PROP('p-oak', 42, 50, (s) => drawOak(s)),
    PROP('p-oak2', 42, 50, (s) => drawOak2(s)),
    PROP('p-appletree', 34, 42, (s) => drawAppleTree(s)),
    PROP('p-birch', 24, 54, (s) => drawBirch(s)),
    PROP('p-bush', 20, 13, (s) => drawBush(s, true)),
    PROP('p-bush2', 16, 11, (s) => drawBush(s, false)),
    ...['daisy', 'poppy', 'cornflower', 'buttercup'].map((k) =>
        PROP(`p-flower-${k}`, 11, 10, [(s) => drawFlowers(s, k, 0), (s) => drawFlowers(s, k, 1)])),
    PROP('p-grass', 11, 10, [shiftX(1, (s) => drawGrass(s, 0, 0)), shiftX(1, (s) => drawGrass(s, 0, 1))]),
    PROP('p-grass2', 11, 10, [shiftX(1, (s) => drawGrass(s, 1, 0)), shiftX(1, (s) => drawGrass(s, 1, 1))]),
    PROP('p-cottage', 50, 40, shiftX(1, (s) => drawCottage(s))),
    PROP('p-fence', 20, 11, (s) => drawFence(s)),
    PROP('p-fencepost', 5, 12, (s) => fencePost(s, 1, 1)),
    PROP('p-rock', 14, 9, (s) => drawRock(s, false)),
    PROP('p-rock2', 10, 7, (s) => drawRock(s, true)),
    PROP('p-haybale', 18, 14, shiftX(1, (s) => drawHayBale(s))),
    PROP('p-sign', 14, 18, (s) => drawSign(s))
];

export default [
    {
        name: 'a-rabbit',
        sheet: 'animals-meadow',
        w: 16,
        h: 16,
        anchor: [8, 15],
        anims: {
            idle: [(s) => drawRabbit(s, {}), (s) => drawRabbit(s, { earFlick: 1, nose: 1 })],
            blink: [(s) => drawRabbit(s, { eyes: 'closed' })],
            hop: { w: 18, h: 18, anchor: [8, 17], frames: [0, 1, 2, 3].map((f) => (s) => drawRabbit(s, { kind: 'hop', hop: f })) },
            eat: { w: 18, h: 16, anchor: [8, 15], frames: [(s) => drawRabbit(s, { kind: 'eat' }), (s) => drawRabbit(s, { kind: 'eat', munch: 1, eyes: 'happy' })] },
            look: [(s) => drawRabbit(s, { look: true })],
            special: { w: 16, h: 21, anchor: [8, 20], frames: [(s) => drawRabbit(s, { kind: 'up' }), (s) => drawRabbit(s, { kind: 'up', nose: 1 })] }
        }
    },
    sheepDef('a-sheep', false),
    sheepDef('a-lamb', true),
    {
        name: 'a-cow',
        sheet: 'animals-meadow',
        w: 35,
        h: 25,
        anchor: [17, 24],
        anims: {
            idle: [(s) => drawCow(s, {}), (s) => drawCow(s, { tail: 1, ear: 1 })],
            blink: [(s) => drawCow(s, { eyes: 'closed' })],
            walk: [
                [[-1, 0], [1, 1], [1, 1], [-1, 0]],
                [[0, 0], [0, 0], [0, 0], [0, 0]],
                [[1, 1], [-1, 0], [-1, 0], [1, 1]],
                [[0, 0], [0, 0], [0, 0], [0, 0]]
            ].map((legs, i) => (s) => drawCow(s, { legs, bob: i % 2 ? -1 : 0, swing: [1, 0, -1, 0][i], tail: i % 2 })),
            eat: [(s) => drawCow(s, { kind: 'graze' }), (s) => drawCow(s, { kind: 'graze', munch: 1, tail: 1 })],
            look: [(s) => drawCow(s, { look: true, mouth: 'open' })],
            special: [(s) => drawCow(s, { kind: 'moo', eyes: 'happy', mouth: 'open' }), (s) => drawCow(s, { kind: 'moo', eyes: 'closed', mouth: 'moo', tail: 1 })]
        }
    },
    {
        name: 'a-horse',
        sheet: 'animals-meadow',
        w: 36,
        h: 33,
        anchor: [17, 32],
        anims: {
            idle: [(s) => drawHorse(s, {}), (s) => drawHorse(s, { tail: 1, head: [16, -28] })],
            blink: [(s) => drawHorse(s, { eyes: 'closed' })],
            walk: [
                [[1, 0], [-1, 2], [2, 2], [-1, 0]],
                [[0, 0], [0, 0], [0, 0], [0, 0]],
                [[-1, 2], [1, 0], [-1, 0], [2, 2]],
                [[0, 0], [0, 0], [0, 0], [0, 0]]
            ].map((legs, i) => (s) => drawHorse(s, { legs, bob: i % 2 ? 0 : -1, tail: i % 2 })),
            eat: [(s) => drawHorse(s, { kind: 'graze', eyes: 'happy' }), (s) => drawHorse(s, { kind: 'graze', eyes: 'happy', munch: 1 })],
            look: [(s) => drawHorse(s, { look: true, mouth: 'open' })],
            special: { w: 37, h: 36, anchor: [28, 35], frames: [
                (s) => drawHorse(s, { ox: 18, pitch: -0.3, legs: [[0, 0], [1, 0], 'tuck', 'tuck'], mouth: 'open' }),
                (s) => drawHorse(s, { ox: 18, pitch: -0.6, legs: [[0, 0], [1, 0], 'tuck', 'kick'], mouth: 'open', eyes: 'happy', tail: 1 }),
                (s) => drawHorse(s, { ox: 18, pitch: -0.65, legs: [[0, 0], [1, 0], 'kick', 'tuck'], mouth: 'open', eyes: 'happy' })
            ] }
        }
    },
    {
        name: 'a-duck',
        sheet: 'animals-meadow',
        w: 19,
        h: 16,
        anchor: [9, 15],
        anims: {
            idle: [shiftX(1, (s) => drawDuck(s, {})), shiftX(1, (s) => drawDuck(s, { nod: 1, wag: 1 }))],
            blink: [shiftX(1, (s) => drawDuck(s, { eyes: 'closed' }))],
            walk: [[1, 0], [0, 0], [0, 1], [0, 0]].map((feet, i) => shiftX(1, (s) => drawDuck(s, { feet, lift: i % 2 }))),
            swim: { w: 19, h: 13, anchor: [9, 10], frames: [0, 1].map((f) => shiftX(1, (s) => drawDuck(s, { kind: 'swim', f, bob: f }))) },
            eat: { w: 21, h: 16, anchor: [9, 15], frames: [shiftX(1, (s) => drawDuck(s, { kind: 'dabble' })), shiftX(1, (s) => drawDuck(s, { kind: 'dabble', peck: 1, eyes: 'happy' }))] },
            look: [shiftX(1, (s) => drawDuck(s, { look: true }))],
            special: { w: 19, h: 13, anchor: [9, 10], frames: [0, 1].map((f) => shiftX(1, (s) => drawDuck(s, { kind: 'dive', f }))) }
        }
    },
    {
        name: 'a-duckling',
        sheet: 'animals-meadow',
        w: 11,
        h: 10,
        anchor: [5, 9],
        anims: {
            idle: [(s) => drawDuckling(s, {}), (s) => drawDuckling(s, { feet: [1, 0] })],
            blink: [(s) => drawDuckling(s, { eyes: 'closed' })],
            walk: [[1, 0], [0, 0], [0, 1], [0, 0]].map((feet, i) => (s) => drawDuckling(s, { feet, lift: i % 2 })),
            swim: { w: 11, h: 9, anchor: [5, 6], frames: [0, 1].map((f) => (s) => drawDuckling(s, { kind: 'swim', bob: f })) },
            look: [(s) => drawDuckling(s, { look: true })]
        }
    },
    butterflyDef('pink'),
    butterflyDef('blue'),
    butterflyDef('yellow'),
    {
        name: 'a-hedgehog',
        sheet: 'animals-meadow',
        w: 18,
        h: 14,
        anchor: [9, 13],
        anims: {
            idle: [shiftX(1, (s) => drawHedgehog(s, {})), shiftX(1, (s) => drawHedgehog(s, { nose: 1 }))],
            blink: [shiftX(1, (s) => drawHedgehog(s, { eyes: 'closed' }))],
            walk: [[1, 0], [0, 0], [0, 1], [0, 0]].map((f, i) => shiftX(1, (s) => drawHedgehog(s, { feet: [f[0], -f[1]], bob: i % 2 ? -1 : 0 }))),
            eat: [shiftX(1, (s) => drawHedgehog(s, { kind: 'sniff', eyes: 'happy' })), shiftX(1, (s) => drawHedgehog(s, { kind: 'sniff', eyes: 'happy', munch: 1 }))],
            look: [shiftX(1, (s) => drawHedgehog(s, { look: true }))],
            sleep: { w: 18, h: 14, anchor: [9, 13], frames: [0, 1].map((b) => shiftX(1, (s) => drawHedgehog(s, { kind: 'ball', breath: b }))) },
            special: { w: 16, h: 16, anchor: [8, 15], frames: [0, 1].map((f) => shiftX(1, (s) => drawHedgehog(s, { kind: 'wave', f, eyes: f ? 'happy' : 'open' }))) }
        }
    },
    {
        name: 'a-cat',
        sheet: 'animals-meadow',
        w: 15,
        h: 16,
        anchor: [7, 15],
        anims: {
            idle: [(s) => drawCat(s, {}), (s) => drawCat(s, { tail: 1, ear: 1 })],
            blink: [(s) => drawCat(s, { eyes: 'closed' })],
            walk: { w: 21, h: 16, anchor: [9, 15], frames: [
                [0, 1, 1, 0], [0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 0, 0]
            ].map((legs, i) => (s) => drawCat(s, { kind: 'walk', legs, bob: i % 2 ? -1 : 0 })) },
            eat: { w: 21, h: 16, anchor: [9, 15], frames: [(s) => drawCat(s, { kind: 'eat' }), (s) => drawCat(s, { kind: 'eat', munch: 1 })] },
            look: [(s) => drawCat(s, { mouth: 'open', eyes: 'big' })],
            special: { w: 20, h: 16, anchor: [9, 15], frames: [
                (s) => drawCat(s, { kind: 'stretch', eyes: 'closed', mouth: 'smile' }),
                (s) => drawCat(s, { kind: 'stretch', eyes: 'closed', mouth: 'yawn' })
            ] },
            sleep: { w: 17, h: 11, anchor: [7, 10], frames: [(s) => drawCat(s, { kind: 'sleep' })] }
        }
    },
    ...PROPS
];

function sheepDef(name, lamb) {
    const w = lamb ? 18 : 25;
    const h = lamb ? 18 : 21;
    const A = [lamb ? 8 : 12, h - 1];
    const L = (o) => (s) => drawSheep(s, { lamb, ...o });
    // walk: diagonal pairs (back-near + front-far, back-far + front-near) step together
    const step = [
        [[-1, 0], [1, 1], [1, 1], [-1, 0]],
        [[0, 0], [0, 0], [0, 0], [0, 0]],
        [[1, 1], [-1, 0], [-1, 0], [1, 1]],
        [[0, 0], [0, 0], [0, 0], [0, 0]]
    ];
    const jumpH = h + (lamb ? 5 : 8);
    const anims = {
        idle: [L({}), L({ ear: 1, nod: 1 })],
        blink: [L({ eyes: 'closed' })],
        walk: step.map((legs, i) => L({ legs, bob: i % 2 ? -1 : 0 })),
        eat: [L({ kind: 'graze' }), L({ kind: 'graze', munch: 1 })],
        look: [L({ look: true, mouth: 'open' })]
    };
    if (lamb) {
        // a skipping hop: push off with the back legs, then fly with legs tucked
        anims.special = { w, h: jumpH, anchor: [A[0], jumpH - 1], frames: [
            L({ legs: [[-1, 0], [-1, 0], [1, 0], [1, 0]], bob: 1, eyes: 'happy' }),
            L({ lift: 4, legs: [[-1, 1], [-1, 1], [1, 2], [1, 2]], eyes: 'happy', mouth: 'open' })
        ] };
    } else {
        // boing! squash, spring up, all four legs kicked out at the top
        anims.special = { w, h: jumpH, anchor: [A[0], jumpH - 1], frames: [
            L({ bob: 1, legs: [[0, 0], [0, 0], [0, 0], [0, 0]], eyes: 'happy' }),
            L({ lift: 4, legs: [[0, 1], [0, 1], [0, 1], [0, 1]], eyes: 'happy', mouth: 'open' }),
            L({ lift: 8, splay: true, eyes: 'happy', mouth: 'open' })
        ] };
    }
    return { name, sheet: 'animals-meadow', w, h, anchor: A, anims };
}
