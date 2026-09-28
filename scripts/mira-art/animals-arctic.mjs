/*
 * Norrskensisen – arctic ice under the northern lights.
 * Animals (sheet 'animals-arctic'), arctic fish (sheet 'fish2') and props
 * (sheet 'props-arctic'). Everything faces right.
 */
import { Sprite, alpha } from './kit.mjs';

const INK = '#2a2140';
const SPARK = '#ffffff';
const BLUSH = '#f4a7c4';
const MOUTH_D = '#8a3a5a';
const MOUTH_L = '#ff9aaa';
// White animals get a cool night outline instead of the warm auto one.
const NIGHT_LINE = '#383670';
// Effect colours (snow puffs, sparkles, spray) are left without an outline.
const FX_SNOW = '#eef4ff';
const FX_SPARK = '#fff7c4';
const FX_SPRAY = '#dcefff';
const FX_SPRAY2 = '#a9d4f5';
const FX_GLOW = '#b8f4ff';
const FX_KEYS = new Set([FX_SNOW, FX_SPARK, FX_SPRAY, FX_SPRAY2, FX_GLOW].map((c) => c.slice(1).match(/../g).map((h) => parseInt(h, 16)).join(',')));
const fxSkip = (r, g, b) => FX_KEYS.has(`${r},${g},${b}`);

// White fur in the night: cream/white lit parts, pale blue and lavender shade.
const BEAR = { l2: '#ffffff', l1: '#fffbf0', b: '#f5ecd6', d1: '#cbd3ee', d2: '#9ea6d6' };
const BEAR_FAR = { b: '#cbd3ee', d1: '#a9b1dd', l1: '#dfe4f6' };
const BEAR_BODY = { l1: '#fffbf0', b: '#f5ecd6', d1: '#cbd3ee', d2: '#aeb6df' };
const EAR_IN = '#c8b6d6';

function openEye(s, x, y, { tall = 2, sparkle = SPARK, color = INK } = {}) {
    s.rect(x, y, 2, tall, color);
    if (sparkle) s.px(x + 1, y, sparkle);
}

/** Two eyes, 2×2 with a sparkle, or closed / happy variants. */
function faceEyes(s, x1, x2, y, eyes = 'open', opts = {}) {
    const c = opts.color || INK;
    const t = (opts.tall || 2) - 2;
    for (const x of [x1, x2]) {
        if (eyes === 'open') openEye(s, x, y, opts);
        else if (eyes === 'closed') s.hline(x, x + 1, y + 1 + t, c);
        else if (eyes === 'happy') {
            s.px(x, y + 1 + t, c);
            s.px(x + 1, y + t, c);
            s.px(x + 2, y + 1 + t, c);
        }
    }
}


/** Filled rotated ellipse centred on (cx, cy) (continuous coords), angle in degrees. */
function ell(s, cx, cy, rx, ry, deg, c) {
    const a = (deg * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const R = Math.ceil(Math.max(rx, ry)) + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y += 1) {
        for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x += 1) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            const u = (dx * ca + dy * sa) / rx;
            const v = (-dx * sa + dy * ca) / ry;
            if (u * u + v * v <= 1.05) s.px(x, y, c);
        }
    }
}

/** Rotated ellipse with top-left light and bottom-right shade, like s.ball(). */
function ellBall(s, cx, cy, rx, ry, deg, P) {
    const a = (deg * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const inside = (px, py, ox, oy) => {
        const dx = px + 0.5 - (cx + ox);
        const dy = py + 0.5 - (cy + oy);
        const u = (dx * ca + dy * sa) / rx;
        const v = (-dx * sa + dy * ca) / ry;
        return u * u + v * v <= 1.05;
    };
    const R = Math.ceil(Math.max(rx, ry)) + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y += 1) {
        for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x += 1) {
            if (!inside(x, y, 0, 0)) continue;
            let c = P.b;
            if (!inside(x, y, -0.9, -1.1)) c = P.d1;
            else if (!inside(x, y, 0.9, 1.1) && y + 0.5 < cy + 1 && x + 0.5 < cx + rx * 0.4) c = P.l1;
            if (P.d2 && !inside(x, y, -1.6, -2) && y + 0.5 > cy + ry * 0.3) c = P.d2;
            s.px(x, y, c);
        }
    }
}

/** Paint into a scratch sprite, then copy it with a horizontal shear (lean) and offset. */
function sheared(s, painter, { lean = 0, pivotY = s.h - 1, dx = 0, dy = 0 } = {}) {
    const t = new Sprite(s.w, s.h);
    painter(t);
    const off = (y) => Math.round(((pivotY - y) * lean) / Math.max(1, pivotY)) + dx;
    for (let y = 0; y < t.h; y += 1) {
        for (let x = 0; x < t.w; x += 1) {
            const c = t.get(x, y);
            if (c[3] > 0) s.px(x + off(y), y + dy, c);
        }
    }
    for (const [k, [px, py]] of Object.entries(t.points)) s.point(k, px + off(py), py + dy);
}

/** Sample a Catmull-Rom curve through pts; returns [[x, y, t], ...]. */
function curve(pts, steps = 6) {
    const out = [];
    const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
    for (let i = 0; i < pts.length - 1; i += 1) {
        const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
        for (let k = 0; k < steps; k += 1) {
            const t = k / steps;
            const t2 = t * t;
            const t3 = t2 * t;
            const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
            out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), (i + t) / (pts.length - 1)]);
        }
    }
    const last = pts[pts.length - 1];
    out.push([last[0], last[1], 1]);
    return out;
}

/** Paint discs along a curve; radii is a list interpolated along the stroke. */
function brush(s, pts, radii, c, { dx = 0, dy = 0, shrink = 0 } = {}) {
    const rAt = (t) => {
        const f = t * (radii.length - 1);
        const i = Math.min(radii.length - 2, Math.floor(f));
        if (radii.length === 1) return radii[0];
        return radii[i] + (radii[i + 1] - radii[i]) * (f - i);
    };
    for (const [x, y, t] of curve(pts)) {
        const r = rAt(t) - shrink;
        if (r <= 0) continue;
        const cx = x + dx;
        const cy = y + dy;
        for (let yy = Math.floor(cy - r - 1); yy <= Math.ceil(cy + r + 1); yy += 1) {
            for (let xx = Math.floor(cx - r - 1); xx <= Math.ceil(cx + r + 1); xx += 1) {
                const ex = xx + 0.5 - cx;
                const ey = yy + 0.5 - cy;
                if (ex * ex + ey * ey <= r * r + 0.3) s.px(xx, yy, c);
            }
        }
    }
}

/** A lit volume along a curve: shade underneath, base, then a light core to the top-left. */
function brushBall(s, pts, radii, P, { light = true } = {}) {
    brush(s, pts, radii, P.d1);
    brush(s, pts, radii, P.b, { dx: -0.5, dy: -0.7, shrink: 0.5 });
    if (light) brush(s, pts, radii, P.l1, { dx: -1, dy: -1.3, shrink: 1.4 });
}

/**
 * A soft glow ring around everything drawn so far, starting two pixels out so
 * the outline still sits snugly on the silhouette. Uses an effect colour.
 */
function glowHalo(s, alphas = [0.34, 0.16], color = FX_GLOW) {
    const W = s.w;
    const H = s.h;
    const dist = new Array(W * H).fill(99);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (s.get(x, y)[3] > 40) dist[y * W + x] = 0;
    for (let pass = 0; pass < alphas.length + 1; pass += 1) {
        const next = dist.slice();
        for (let y = 0; y < H; y += 1) {
            for (let x = 0; x < W; x += 1) {
                let d = dist[y * W + x];
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const xx = x + dx;
                    const yy = y + dy;
                    if (xx >= 0 && yy >= 0 && xx < W && yy < H) d = Math.min(d, dist[yy * W + xx] + 1);
                }
                next[y * W + x] = d;
            }
        }
        for (let i = 0; i < next.length; i += 1) dist[i] = next[i];
    }
    for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
            const d = dist[y * W + x];
            if (d >= 2 && d - 2 < alphas.length && s.get(x, y)[3] === 0) s.px(x, y, alpha(color, alphas[d - 2]));
        }
    }
}

// ===========================================================================
// POLAR BEAR
// ===========================================================================
function bearLeg(s, x, top, bottom, w, P, near, off = 0) {
    // hip fixed at x, the paw swings by `off`: a slanted stride
    s.poly([[x - 0.01, top], [x + w, top], [x + off + w, bottom + 1], [x + off, bottom + 1]], P.b);
    if (near) {
        s.line(x + w - 1, top + 2, x + off + w - 1, bottom - 1, P.d1);
        s.line(x, top + 3, x + off, bottom - 1, P.l1);
    }
    // paw pointing forward, darker sole line
    s.px(x + off + w, bottom, P.b);
    s.hline(x + off, x + off + w, bottom, P.d1);
}

function bearHeadSide(s, x, y, { eyes = 'open', mouth = 'smile' } = {}) {
    // round ears (far one darker)
    s.oval(x + 6, y, 4, 4, BEAR.d1);
    s.oval(x + 1, y, 4, 4, BEAR.b);
    s.px(x + 2, y + 1, EAR_IN);
    // head and a long snout
    s.ball(x, y + 1, 11, 10, BEAR);
    s.oval(x + 6, y + 5, 8, 5, BEAR.l1);
    s.hline(x + 8, x + 12, y + 9, BEAR.d1);
    s.px(x + 13, y + 8, BEAR.d1);
    // nose at the tip
    s.rect(x + 12, y + 5, 2, 2, INK);
    s.px(x + 12, y + 5, '#5b5280');
    faceEyes(s, x + 3, x + 7, y + 2, eyes, { tall: 3 });
    if (mouth === 'open') {
        s.rect(x + 9, y + 8, 3, 2, MOUTH_D);
        s.px(x + 10, y + 9, MOUTH_L);
    } else if (mouth === 'eat') {
        s.hline(x + 9, x + 11, y + 8, MOUTH_D);
    } else {
        s.px(x + 11, y + 7, BEAR.d2);
        s.px(x + 10, y + 8, BEAR.d2);
    }
    s.px(x + 3, y + 6, BLUSH);
}

function bearHeadFront(s, x, y, { eyes = 'open', mouth = 'smile' } = {}) {
    s.oval(x, y, 4, 4, BEAR.b);
    s.oval(x + 9, y, 4, 4, BEAR.b);
    s.px(x + 1, y + 1, EAR_IN);
    s.px(x + 11, y + 1, EAR_IN);
    s.ball(x, y + 1, 13, 10, BEAR);
    s.oval(x + 4, y + 6, 5, 4, BEAR.l1);
    s.rect(x + 5, y + 6, 3, 2, INK);
    s.px(x + 5, y + 6, '#5b5280');
    if (mouth === 'open') {
        s.px(x + 6, y + 8, MOUTH_D);
        s.px(x + 6, y + 9, MOUTH_L);
    } else {
        s.px(x + 6, y + 8, BEAR.d2);
    }
    faceEyes(s, x + 3, x + 8, y + 3, eyes, { tall: 3 });
    s.px(x + 2, y + 7, BLUSH);
    s.px(x + 10, y + 7, BLUSH);
}

function polarBear(s, o = {}) {
    const { legs = [0, 0, 0, 0], lift = [0, 0, 0, 0], bob = 0, head = 'side', headY = 0, eyes, mouth } = o;
    const G = 21;
    const by = 6 + bob;
    // far legs
    bearLeg(s, 10, by + 8, G - lift[1], 4, BEAR_FAR, false, legs[1]);
    bearLeg(s, 23, by + 8, G - lift[3], 4, BEAR_FAR, false, legs[3]);
    // stubby tail
    s.oval(1, by + 3, 3, 3, BEAR.b);
    // body: rounded haunch and shoulder
    s.ball(2, by, 26, 12, BEAR_BODY);
    // near legs
    bearLeg(s, 5, by + 8, G - lift[0], 5, BEAR, true, legs[0]);
    bearLeg(s, 19, by + 8, G - lift[2], 5, BEAR, true, legs[2]);
    // head
    const hx = 22;
    const hy = 2 + bob + headY;
    if (head === 'front') bearHeadFront(s, hx, hy, { eyes, mouth });
    else bearHeadSide(s, hx, hy, { eyes, mouth });
    s.point('head', hx + 6, hy);
    if (headY > 3) s.point('mouth', hx + 12, hy + 8);
}

const PAD = '#9189bd';

/** An upturned paw: a stubby leg from (x0,y0) up to (x1,y1) with a padded sole on top. */
function upPaw(s, x0, y0, x1, y1, P, pads = true) {
    s.thick(x0, y0, x1, y1, 4, P.b);
    s.oval(x1 - 2, y1 - 2, 5, 3, P.b);
    s.hline(x1 - 1, x1 + 1, y1 - 2, P.d1);
    if (pads) {
        s.px(x1, y1 - 1, PAD);
        s.px(x1 - 1, y1 - 2, PAD);
        s.px(x1 + 1, y1 - 2, PAD);
        s.px(x1, y1 - 2, P.l1);
    }
}

/** Rolling onto its back. f = 0 flopped on its side, 1–2 on its back, paws wiggling. */
function polarBearRoll(s, f) {
    if (f === 0) {
        // lying on its side, legs sticking out forward
        bearLeg(s, 26, 14, 18, 3, BEAR_FAR, false);
        s.ball(3, 10, 27, 11, BEAR);
        s.oval(10, 15, 14, 5, BEAR.l1);
        s.thick(8, 17, 5, 19, 4, BEAR.b);
        s.thick(24, 17, 29, 17, 4, BEAR.b);
        s.px(30, 17, BEAR.d1);
        s.px(30, 18, BEAR.d1);
        bearHeadSide(s, 24, 7, { eyes: 'happy', mouth: 'open' });
        s.point('head', 30, 7);
        return;
    }
    const w = f === 1 ? 0 : 1;
    // on its back: belly up, paws in the air in a happy V
    upPaw(s, 7, 14, 4 - w, 8 + w, BEAR_FAR, false);
    upPaw(s, 21, 14, 24 + w, 8 + w, BEAR_FAR, false);
    s.oval(0, 15, 3, 3, BEAR.b);
    s.ball(2, 11, 26, 11, BEAR);
    s.oval(7, 11, 16, 5, BEAR.l1);
    upPaw(s, 10, 14, 8 + w, 6 - w, BEAR);
    upPaw(s, 17, 14, 19 - w, 6 + w, BEAR);
    // head resting on the ice, laughing at the sky
    bearHeadFront(s, 24, 10 + (f === 2 ? 1 : 0), { eyes: 'happy', mouth: 'open' });
    s.point('head', 30, 10);
}

/** Standing up. f = 0 rearing, 1 fully upright. */
function polarBearStand(s, f) {
    const G = 33;
    if (f === 0) {
        // rearing up diagonally, front paws off the ground
        bearLeg(s, 13, 27, G, 4, BEAR_FAR, false);
        s.thick(24, 18, 27, 24, 4, BEAR_FAR.b);
        s.oval(4, 25, 3, 3, BEAR.b);
        ellBall(s, 16, 21, 12, 7.5, -48, BEAR);
        ell(s, 17, 22, 7, 3.5, -48, BEAR.l1);
        bearLeg(s, 8, 26, G, 5, BEAR, true);
        s.thick(22, 17, 25, 24, 4, BEAR.b);
        s.hline(24, 27, 25, BEAR.d1);
        bearHeadSide(s, 20, 3, { mouth: 'open' });
        s.point('head', 26, 3);
        return;
    }
    // fully upright like a big teddy, waving hello with one paw
    bearLeg(s, 17, 27, G, 4, BEAR_FAR, false);
    s.oval(7, 26, 3, 3, BEAR.b);
    // far arm hanging in front of the tummy
    s.thick(22, 15, 25, 21, 4, BEAR_FAR.b);
    s.hline(23, 26, 23, BEAR_FAR.d1);
    s.ball(9, 11, 16, 20, BEAR_BODY);
    s.oval(12, 17, 10, 12, BEAR.l1);
    bearLeg(s, 11, 26, G, 5, BEAR, true);
    // near arm raised beside the head, paw open
    s.thick(21, 15, 27, 8, 4, BEAR.b);
    s.oval(26, 4, 5, 5, BEAR.b);
    s.px(27, 5, PAD);
    s.px(28, 6, PAD);
    s.px(29, 5, PAD);
    s.px(28, 4, BEAR.l1);
    s.line(22, 17, 26, 12, BEAR.d1);
    bearHeadFront(s, 9, 1, { mouth: 'open', eyes: 'happy' });
    // a little wave motion mark
    s.px(32, 3, FX_SNOW);
    s.px(32, 6, FX_SNOW);
    s.px(33, 4, FX_SNOW);
    s.point('head', 15, 1);
}

const polarBearDef = {
    name: 'a-polarbear',
    sheet: 'animals-arctic',
    w: 38,
    h: 22,
    anchor: [18, 21],
    outline: NIGHT_LINE,
    anims: {
        idle: [(s) => polarBear(s), (s) => polarBear(s, { bob: 1 })],
        blink: [(s) => polarBear(s, { eyes: 'closed' })],
        walk: [
            (s) => polarBear(s, { legs: [-2, 2, 2, -2] }),
            (s) => polarBear(s, { legs: [0, 1, 1, 0], lift: [2, 0, 0, 2], bob: -1 }),
            (s) => polarBear(s, { legs: [2, -2, -2, 2] }),
            (s) => polarBear(s, { legs: [1, 0, 0, 1], lift: [0, 2, 2, 0], bob: -1 })
        ],
        eat: [(s) => polarBear(s, { headY: 6, mouth: 'eat', eyes: 'happy' }), (s) => polarBear(s, { headY: 7, mouth: 'open', eyes: 'happy' })],
        look: [(s) => polarBear(s, { head: 'front' })],
        special: { w: 38, h: 22, anchor: [18, 21], frames: [0, 1, 2].map((f) => (s) => polarBearRoll(s, f)) },
        stand: { w: 34, h: 34, anchor: [17, 33], frames: [0, 1].map((f) => (s) => polarBearStand(s, f)) }
    }
};

// ===========================================================================
// POLAR BEAR CUB
// ===========================================================================
function cubHead(s, x, y, { eyes = 'open', mouth = 'smile', front = false } = {}) {
    if (front) {
        s.oval(x, y, 3, 3, BEAR.b);
        s.oval(x + 6, y, 3, 3, BEAR.b);
        s.px(x + 1, y + 1, EAR_IN);
        s.px(x + 7, y + 1, EAR_IN);
        s.ball(x, y + 1, 9, 7, BEAR);
        s.oval(x + 3, y + 4, 3, 3, BEAR.l1);
        s.px(x + 4, y + 5, INK);
        s.px(x + 4, y + 6, mouth === 'open' ? MOUTH_D : BEAR.d2);
        if (eyes === 'open') {
            for (const ex of [x + 1, x + 6]) {
                s.rect(ex, y + 3, 2, 2, INK);
                s.px(ex + 1, y + 3, FOX_GLINT);
            }
        } else smallEyes(s, x + 2, x + 6, y + 3, eyes);
        s.px(x + 1, y + 5, BLUSH);
        s.px(x + 7, y + 5, BLUSH);
        return;
    }
    s.oval(x + 4, y, 3, 3, BEAR.d1);
    s.oval(x + 1, y, 3, 3, BEAR.b);
    s.px(x + 2, y + 1, EAR_IN);
    s.ball(x, y + 1, 8, 7, BEAR);
    s.oval(x + 4, y + 4, 5, 3, BEAR.l1);
    s.px(x + 8, y + 4, INK);
    if (mouth === 'open') s.px(x + 7, y + 6, MOUTH_D);
    else s.px(x + 7, y + 6, BEAR.d2);
    smallEyes(s, x + 3, x + 5, y + 2, eyes);
    s.px(x + 2, y + 5, BLUSH);
}

/** Tiny eyes: 1×2 dark, closed = 1 px low, happy = 1 px high. */
function smallEyes(s, x1, x2, y, eyes = 'open', color = INK) {
    for (const x of [x1, x2]) {
        if (eyes === 'open') s.vline(x, y, y + 1, color);
        else if (eyes === 'closed') s.px(x, y + 1, color);
        else if (eyes === 'happy') s.px(x, y, color);
    }
}

function polarCub(s, o = {}) {
    const { lift = [0, 0, 0, 0], legs = [0, 0, 0, 0], bob = 0, headY = 0, eyes, mouth, front = false } = o;
    const G = 12;
    const by = 5 + bob;
    const leg = (x, i, P) => {
        const bottom = G - lift[i];
        s.poly([[x - 0.01, by + 4], [x + 2, by + 4], [x + legs[i] + 2, bottom + 1], [x + legs[i], bottom + 1]], P.b);
        s.px(x + legs[i] + 1, bottom, P.d1);
    };
    leg(4, 1, BEAR_FAR);
    leg(9, 3, BEAR_FAR);
    s.px(1, by + 2, BEAR.b);
    s.ball(1, by, 11, 6, BEAR_BODY);
    leg(2, 0, BEAR);
    leg(7, 2, BEAR);
    cubHead(s, 8, 0 + bob + headY, { eyes, mouth, front });
    s.point('head', 12, bob + headY);
    if (headY > 0) s.point('mouth', 16, bob + headY + 6);
}

function polarCubSlide(s, f) {
    // tobogganing on its tummy: front paws stretched out ahead, hind paws trailing
    const G = 10;
    // hind legs trailing, soles showing
    s.thick(5, 8, 1, 9, 2, BEAR_FAR.b);
    s.thick(6, 7, 2, 7, 2, BEAR.b);
    s.px(1, 7, PAD);
    s.px(1, 8, BEAR.d1);
    s.ball(3, 4, 13, 6, BEAR_BODY);
    s.hline(5, 14, G - 1, BEAR.d1);
    // front paws out in front like a superhero
    s.thick(14, 8, 20, 8, 2, BEAR.b);
    s.px(21, 8, BEAR.d1);
    s.px(21, 9, BEAR.d1);
    cubHead(s, 11, 1, { eyes: 'happy', mouth: 'open' });
    // snow spraying off the front
    const puff = f ? [[22, 6], [23, 8], [22, 10], [0, 5]] : [[23, 6], [22, 7], [23, 10], [0, 4]];
    for (const [x, y] of puff) s.px(x, y, FX_SNOW);
    s.point('head', 15, 1);
}

const polarCubDef = {
    name: 'a-polarcub',
    sheet: 'animals-arctic',
    w: 19,
    h: 13,
    anchor: [9, 12],
    outline: NIGHT_LINE,
    anims: {
        idle: [(s) => polarCub(s), (s) => polarCub(s, { bob: 1 })],
        blink: [(s) => polarCub(s, { eyes: 'closed' })],
        walk: [
            (s) => polarCub(s, { legs: [-1, 1, 1, -1] }),
            (s) => polarCub(s, { lift: [1, 0, 0, 1], bob: -1 }),
            (s) => polarCub(s, { legs: [1, -1, -1, 1] }),
            (s) => polarCub(s, { lift: [0, 1, 1, 0], bob: -1 })
        ],
        eat: [(s) => polarCub(s, { headY: 3, mouth: 'open', eyes: 'happy' }), (s) => polarCub(s, { headY: 4, eyes: 'happy' })],
        look: [(s) => polarCub(s, { front: true })],
        special: { w: 24, h: 11, anchor: [11, 10], frames: [0, 1].map((f) => (s) => polarCubSlide(s, f)) }
    }
};

// ===========================================================================
// PENGUIN
// ===========================================================================
const PENG = { d2: '#191a33', d1: '#23254a', b: '#2e325c', l1: '#4b568d', l2: '#7688c4' };
const PWHITE = { l1: '#ffffff', b: '#f3f5ff', d1: '#c8d0ee', d2: '#9fa8d6' };
const PYEL = { l1: '#ffe486', b: '#ffbe45', d1: '#f28c2c' };
const PFEET = { b: '#ff9f45', d1: '#d8702a' };

/** Standing penguin in a 13×16 frame, feet on row 15. */
function penguinBody(s, o = {}) {
    const { flip = 'down', eyes = 'open', feet = [0, 0], beak = 'shut', headDown = 0 } = o;
    const G = 15;
    // feet
    const foot = (x, lift, c) => {
        s.hline(x, x + 2, G - lift, c);
        s.px(x, G - 1 - lift, c);
    };
    foot(3, feet[0], PFEET.d1);
    // far flipper when spread (pale underside toward us)
    if (flip === 'out') { s.thick(9, 6, 12, 9, 2, PENG.d1); s.px(12, 10, PWHITE.d1); }
    if (flip === 'up') { s.thick(9, 6, 12, 3, 2, PENG.d1); s.px(12, 2, PWHITE.d1); }
    // tail
    s.px(1, 13, PENG.d1);
    s.px(2, 13, PENG.b);
    // body
    s.ball(2, 4, 9, 11, PENG);
    // white belly
    s.oval(5, 6, 6, 9, PWHITE.b);
    s.px(10, 13, PWHITE.d1);
    s.px(9, 14, PWHITE.d1);
    s.px(6, 7, PWHITE.l1);
    foot(6, feet[1], PFEET.b);
    // head
    const hy = 1 + headDown;
    s.ball(3, hy, 7, 6, PENG);
    // neck patch
    s.px(7, hy + 5, PYEL.b);
    s.px(8, hy + 5, PYEL.l1);
    s.px(8, hy + 4, PYEL.b);
    s.px(9, hy + 5, PYEL.b);
    // eye: white with a dark pupil looking forward
    if (eyes === 'open') {
        s.px(6, hy + 2, PWHITE.b);
        s.px(7, hy + 2, INK);
        s.px(7, hy + 3, INK);
        s.px(6, hy + 3, PWHITE.d1);
    } else if (eyes === 'happy') {
        s.px(6, hy + 3, PWHITE.b);
        s.px(7, hy + 2, PWHITE.b);
    } else {
        s.hline(6, 7, hy + 3, PWHITE.d1);
    }
    // beak
    s.hline(9, 11, hy + 3, '#3a3654');
    s.hline(9, 10, hy + 4, beak === 'open' ? MOUTH_D : PFEET.b);
    if (beak === 'open') s.px(11, hy + 5, PFEET.b);
    // near flipper
    if (flip === 'down') {
        s.thick(4, 7, 3, 11, 2, PENG.d2);
        s.px(4, 7, PENG.l1);
    } else if (flip === 'rest') {
        s.thick(4, 7, 2, 11, 2, PENG.d2);
        s.px(4, 7, PENG.l1);
    } else if (flip === 'out') {
        s.thick(3, 7, 0, 10, 2, PENG.d2);
        s.line(3, 8, 0, 11, PWHITE.d1);
        s.px(3, 7, PENG.l1);
    } else if (flip === 'up') {
        s.thick(3, 7, 0, 4, 2, PENG.d2);
        s.line(3, 6, 0, 3, PENG.l2);
        s.px(0, 3, PWHITE.d1);
    }
    s.point('head', 6, hy);
    if (headDown) s.point('mouth', 11, hy + 4);
}

/** The penguin turning to face us (look): symmetric, white-dot eyes, beak in the middle. */
function penguinFront(s, { eyes = 'open' } = {}) {
    const G = 15;
    // feet
    s.hline(3, 5, G, PFEET.b);
    s.hline(7, 9, G, PFEET.b);
    s.px(3, G - 1, PFEET.d1);
    s.px(9, G - 1, PFEET.d1);
    // flippers at both sides
    s.thick(2, 7, 1, 11, 2, PENG.d2);
    s.thick(10, 7, 11, 11, 2, PENG.d2);
    s.px(0, 11, PWHITE.d1);
    s.px(12, 11, PWHITE.d1);
    // body and white tummy
    s.ball(2, 4, 9, 11, PENG);
    s.oval(3, 6, 7, 9, PWHITE.b);
    s.vline(9, 9, 13, PWHITE.d1);
    s.px(4, 7, PWHITE.l1);
    // head
    s.ball(3, 1, 7, 6, PENG);
    s.px(3, 5, PYEL.b);
    s.px(9, 5, PYEL.b);
    s.px(3, 6, PYEL.d1);
    s.px(9, 6, PYEL.d1);
    s.px(4, 6, PYEL.l1);
    s.px(8, 6, PYEL.l1);
    if (eyes === 'open') {
        for (const x of [4, 8]) {
            s.px(x, 3, PWHITE.l1);
            s.px(x, 4, PWHITE.d1);
        }
    } else {
        s.px(4, 4, PWHITE.d1);
        s.px(8, 4, PWHITE.d1);
    }
    s.px(6, 4, PFEET.b);
    s.px(6, 5, PFEET.d1);
    s.point('head', 6, 1);
}

function penguinWalk(s, f) {
    const lean = [-1, 0, 1, 0][f];
    const feet = [[0, 1], [0, 0], [1, 0], [0, 0]][f];
    sheared(s, (t) => penguinBody(t, { feet }), { lean, dy: f % 2 ? -1 : 0 });
    if (f % 2) {
        // keep both feet on the ground on the passing frames
        s.hline(3, 5, 15, PFEET.d1);
        s.hline(6, 8, 15, PFEET.b);
    }
}

function penguinSlide(s, f) {
    // tobogganing on its belly: head up and forward, flippers swept back
    const G = 12;
    // feet trailing behind
    s.hline(0, 2, 9, PFEET.d1);
    s.hline(0, 2, 10, PFEET.b);
    // body lying flat
    s.ball(2, 5, 14, 7, PENG);
    s.oval(4, 9, 12, 3, PWHITE.b);
    s.hline(6, 13, G - 1, PWHITE.d1);
    // head raised at the front
    s.ball(12, 2, 7, 6, PENG);
    s.px(15, 7, PYEL.b);
    s.px(16, 7, PYEL.l1);
    s.px(17, 6, PYEL.b);
    s.px(16, 4, PWHITE.b);
    s.px(15, 5, PWHITE.b);
    s.hline(18, 20, 5, '#3a3654');
    s.hline(18, 19, 6, PFEET.b);
    // flipper swept back
    s.thick(10, 7, 6, 8, 2, PENG.d2);
    s.px(10, 7, PENG.l1);
    // snow spray at the front
    const spray = f ? [[20, 9], [21, 7], [19, 11]] : [[20, 10], [21, 8], [21, 11]];
    for (const [x, y] of spray) s.px(x, y, FX_SNOW);
    s.point('head', 15, 2);
}

const penguinDef = {
    name: 'a-penguin',
    sheet: 'animals-arctic',
    w: 13,
    h: 16,
    anchor: [6, 15],
    outline: NIGHT_LINE,
    anims: {
        idle: [(s) => penguinBody(s), (s) => penguinBody(s, { flip: 'rest' })],
        blink: [(s) => penguinBody(s, { eyes: 'closed' })],
        walk: [0, 1, 2, 3].map((f) => (s) => penguinWalk(s, f)),
        flap: [(s) => penguinBody(s, { flip: 'out', beak: 'open' }), (s) => penguinBody(s, { flip: 'up', beak: 'open', eyes: 'happy' })],
        eat: [(s) => penguinBody(s, { headDown: 2, beak: 'open' }), (s) => penguinBody(s, { headDown: 3 })],
        look: [(s) => penguinFront(s)],
        special: { w: 23, h: 13, anchor: [11, 12], frames: [0, 1].map((f) => (s) => penguinSlide(s, f)) }
    }
};

// ===========================================================================
// SEAL
// ===========================================================================
const SEAL = { l2: '#eef0f8', l1: '#ccd0e4', b: '#a6aac3', d1: '#7e81a1', d2: '#5c5c7e' };
const SEAL_SPOT = '#6c6e91';

function sealHead(s, x, y, { eyes = 'open', mouth = 'smile', front = false } = {}) {
    if (front) {
        s.ball(x, y, 11, 9, SEAL);
        s.oval(x + 3, y + 5, 5, 4, SEAL.l1);
        s.hline(x + 5, x + 5, y + 5, INK);
        s.px(x + 4, y + 5, INK);
        s.px(x + 6, y + 5, INK);
        if (mouth === 'open') s.px(x + 5, y + 7, MOUTH_D);
        else {
            s.px(x + 4, y + 7, SEAL.d2);
            s.px(x + 6, y + 7, SEAL.d2);
        }
        for (const [dx, dy] of [[3, 6], [7, 6]]) s.px(x + dx, y + dy, SEAL.d1);
        faceEyes(s, x + 2, x + 7, y + 1, eyes, { tall: 3 });
        s.px(x + 1, y + 5, BLUSH);
        s.px(x + 9, y + 5, BLUSH);
        return;
    }
    s.ball(x, y, 10, 8, SEAL);
    s.oval(x + 5, y + 4, 6, 4, SEAL.l1);
    s.hline(x + 9, x + 10, y + 4, INK);
    if (mouth === 'open') {
        s.hline(x + 8, x + 9, y + 6, MOUTH_D);
    } else {
        s.px(x + 9, y + 6, SEAL.d2);
        s.px(x + 8, y + 7, SEAL.d1);
    }
    s.px(x + 6, y + 6, SEAL.d1);
    s.px(x + 7, y + 6, SEAL.d1);
    faceEyes(s, x + 2, x + 6, y + 1, eyes, { tall: 3 });
    s.px(x + 1, y + 5, BLUSH);
}

/** Seal lying on the ice in a 26×13 frame; clap raises the chest with the flippers out front. */
function seal(s, o = {}) {
    const { tail = 0, bob = 0, eyes, mouth, front = false, headY = 0, clap = 0 } = o;
    const G = s.h - 1;
    const Y = G - 11;
    // hind flippers
    s.poly([[0, Y + 5 - tail], [4, Y + 8], [0, Y + 11 - tail]], SEAL.d1);
    s.px(1, Y + 7 - tail, SEAL.b);
    // body lying flat, chest raised toward the head
    s.ball(2, Y + 6 + bob, 17, 6 - bob, SEAL);
    const lift = clap ? 4 : 0;
    ellBall(s, 15, Y + 6.5 + bob - lift * 0.5, 4.2, 3.8 + lift * 0.4, -35 - lift * 8, SEAL);
    s.oval(5, Y + 9 + bob, 12, 3, SEAL.l1);
    s.hline(4, 17, G, SEAL.d1);
    for (const [x, y] of [[5, 7], [8, 6], [11, 7], [7, 9], [13, 6], [10, 9]]) s.px(x, Y + y + bob, SEAL_SPOT);
    const hx = front ? 13 : 13 - (clap ? 1 : 0) + 1;
    const hy = Y + bob + headY - lift - (clap ? 1 : 0);
    // flipper: a paddle from the chest out to (x1, y1)
    const flip = (x0, y0, x1, y1, c) => {
        s.thick(x0, y0, x1, y1, 2, c);
        s.rect(x1, y1 - 1, 2, 3, c);
    };
    // far flipper behind the chest while clapping
    if (clap === 1) flip(18, Y + 6, 23, Y + 3, SEAL.d2);
    if (clap === 2) flip(18, Y + 6, 23, Y + 5, SEAL.d2);
    sealHead(s, hx, hy, { eyes, mouth, front });
    // near flipper
    if (!clap) {
        s.thick(13, Y + 9 + bob, 15, Y + 10 + bob, 2, SEAL.d1);
    } else if (clap === 1) {
        flip(18, Y + 8, 23, Y + 10, SEAL.d1);
    } else {
        flip(18, Y + 8, 23, Y + 7, SEAL.d1);
        for (const [x, y] of [[25, Y + 3], [26, Y + 6], [25, Y + 9]]) s.px(x, y, FX_SPARK);
    }
    s.point('head', hx + 5, Math.max(0, hy));
    if (headY > 0) s.point('mouth', hx + 10, hy + 5);
}

function sealSwim(s, f) {
    // head and neck above the waterline (row 10), a sliver below
    const W = 10;
    const y = f ? 1 : 2;
    s.rect(2, y + 5, 8, W - y - 3, SEAL.b);
    s.vline(9, y + 6, W + 1, SEAL.d1);
    s.vline(2, y + 6, W + 1, SEAL.l1);
    sealHead(s, 1, y, {});
    for (const [x, yy] of [[4, y + 8], [7, y + 9]]) s.px(x, yy, SEAL_SPOT);
    s.point('head', 6, y);
}

const sealDef = {
    name: 'a-seal',
    sheet: 'animals-arctic',
    w: 26,
    h: 13,
    anchor: [11, 12],
    anims: {
        idle: [(s) => seal(s), (s) => seal(s, { tail: 2 })],
        blink: [(s) => seal(s, { eyes: 'closed' })],
        look: [(s) => seal(s, { front: true })],
        eat: [(s) => seal(s, { headY: 3, mouth: 'open', eyes: 'happy' }), (s) => seal(s, { headY: 3, eyes: 'happy' })],
        special: { w: 27, h: 17, anchor: [11, 16], frames: [(s) => seal(s, { clap: 1, mouth: 'open', eyes: 'happy' }), (s) => seal(s, { clap: 2, mouth: 'open', eyes: 'happy', tail: 2 })] },
        swim: { w: 14, h: 13, anchor: [6, 10], frames: [0, 1].map((f) => (s) => sealSwim(s, f)) }
    }
};

// ===========================================================================
// ARCTIC FOX
// ===========================================================================
const FOX = { l2: '#ffffff', l1: '#ffffff', b: '#f2f4fd', d1: '#c9d0ef', d2: '#9da5d6' };
const FOX_FAR = { b: '#c3cbeb', d1: '#a1aad8', l1: '#dde2f6' };
const FOX_EAR = '#eab4cd';

const FOX_GLINT = '#8580c4';

function foxEyes(s, x1, x2, y, eyes) {
    for (const x of [x1, x2]) {
        if (eyes === 'open') {
            s.rect(x, y, 2, 2, INK);
            s.px(x + 1, y, FOX_GLINT);
        } else if (eyes === 'closed') {
            s.hline(x, x + 1, y + 1, INK);
        } else if (eyes === 'happy') {
            s.px(x, y + 1, INK);
            s.px(x + 1, y, INK);
            s.px(x + 2, y + 1, INK);
        }
    }
}

function foxHead(s, x, y, { eyes = 'open', mouth = 'smile', front = false } = {}) {
    if (front) {
        s.tri(x - 0.5, y + 5, x + 0.5, y - 0.5, x + 4.5, y + 3, FOX.b);
        s.tri(x + 5.5, y + 3, x + 9.5, y - 0.5, x + 10.5, y + 5, FOX.b);
        s.px(x + 1, y + 2, FOX_EAR);
        s.px(x + 8, y + 2, FOX_EAR);
        s.px(x + 1, y + 3, FOX_EAR);
        s.px(x + 8, y + 3, FOX_EAR);
        s.ball(x, y + 2, 10, 7, FOX);
        // fluffy cheeks and a pointed chin
        s.px(x - 1, y + 7, FOX.b);
        s.px(x + 10, y + 7, FOX.d1);
        s.oval(x + 3, y + 6, 4, 3, FOX.l1);
        s.px(x + 4, y + 9, FOX.d1);
        s.px(x + 5, y + 9, FOX.d1);
        s.hline(x + 4, x + 5, y + 6, INK);
        s.px(x + 4, y + 8, mouth === 'open' ? MOUTH_D : FOX.d2);
        s.px(x + 5, y + 8, mouth === 'open' ? MOUTH_D : FOX.d2);
        foxEyes(s, x + 2, x + 6, y + 4, eyes);
        s.px(x + 1, y + 6, BLUSH);
        s.px(x + 8, y + 6, BLUSH);
        return;
    }
    // far ear, near ear
    s.tri(x + 3.5, y + 4, x + 6.5, y - 0.5, x + 8.5, y + 4, FOX.d1);
    s.tri(x - 0.5, y + 4, x + 1.5, y - 0.5, x + 4.5, y + 3, FOX.b);
    s.px(x + 1, y + 2, FOX_EAR);
    s.px(x + 2, y + 2, FOX_EAR);
    s.px(x + 6, y + 2, FOX.d2);
    // head, cheek ruff and a long pointy snout
    s.ball(x, y + 2, 8, 7, FOX);
    s.px(x - 1, y + 7, FOX.b);
    s.px(x - 1, y + 6, FOX.d1);
    s.poly([[x + 5, y + 5], [x + 12, y + 6.4], [x + 12, y + 7.4], [x + 5, y + 9]], FOX.l1);
    s.hline(x + 6, x + 10, y + 8, FOX.d1);
    s.hline(x + 10, x + 11, y + 6, INK);
    if (mouth === 'open') {
        s.hline(x + 8, x + 10, y + 7, MOUTH_D);
    } else {
        s.px(x + 9, y + 7, FOX.d2);
    }
    foxEyes(s, x + 2, x + 5, y + 4, eyes);
    s.px(x + 1, y + 6, BLUSH);
}

/** Sitting fox (idle) in a 24×15 frame, the big tail curling up behind like on the hat logo. */
function foxSitting(s, o = {}) {
    const { tail = 0, bob = 0, eyes, mouth, front = false, headY = 0 } = o;
    const X = 2;
    // big bushy tail lying behind, the tip curling up away from the back
    brushBall(s, [[X + 7, 13.2], [X + 3.5, 13], [X + 1, 11.4], [X + 0.2, 8.8], [X + 0.6 - tail * 0.5, 6.2], [X + 1.8 - tail, 4.6]], [1.3, 2.1, 2.5, 2.3, 1.8, 1.1], FOX);
    s.px(X + 1 - tail, 3, FOX.l2);
    // haunch and chest
    s.ball(X + 4, 7, 9, 8, FOX);
    s.line(X + 5, 9, X + 5, 12, FOX.d1);
    s.ball(X + 8, 4 + bob, 7, 10 - bob, FOX);
    // front legs
    s.rect(X + 13, 9, 2, 6, FOX_FAR.b);
    s.rect(X + 11, 9, 2, 6, FOX.b);
    s.vline(X + 12, 10, 13, FOX.d1);
    s.px(X + 13, 14, FOX.d1);
    // fluffy chest
    s.oval(X + 11, 5 + bob, 4, 5, FOX.l1);
    const hx = X + (front ? 8 : 9);
    const hy = bob + headY;
    foxHead(s, hx, hy, { eyes, mouth, front });
    s.point('head', hx + 4, hy);
    if (headY > 0) s.point('mouth', hx + 11, hy + 7);
}

/** Walking fox in a 26×13 frame. */
function foxWalking(s, f) {
    const G = 12;
    const bob = f % 2 ? -1 : 0;
    const lift = [[0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 1, 0]][f];
    const off = [[-2, 2, 2, -2], [0, 1, 1, 0], [2, -2, -2, 2], [1, 0, 0, 1]][f];
    const leg = (x, i, P) => {
        const top = 7 + bob;
        const bottom = G - lift[i];
        s.poly([[x - 0.01, top], [x + 2, top], [x + off[i] + 2, bottom + 1], [x + off[i], bottom + 1]], P.b);
        s.px(x + off[i] + 2, bottom, P.b);
    };
    // tail streaming out behind
    const wag = f % 2;
    brushBall(s, [[8, 6 + bob], [4.5, 5.5 + bob], [2, 4 + bob - wag]], [1.8, 2.6, 2], FOX);
    leg(8, 1, FOX_FAR);
    leg(15, 3, FOX_FAR);
    s.ball(6, 4 + bob, 12, 6, FOX);
    leg(6, 0, FOX);
    leg(13, 2, FOX);
    s.oval(13, 6 + bob, 4, 3, FOX.l1);
    foxHead(s, 14, bob - 1, {});
    s.point('head', 18, bob - 1);
}

/** The famous arctic-fox pounce: leap, nose-dive, bottom-up in the snow. */
function foxPounce(s, f) {
    const SNOW = { b: '#e3ebfb', l1: '#ffffff', d1: '#b9c8ec' };
    if (f === 0) {
        // springing up in an arc, front paws tucked, tail flowing
        brushBall(s, [[8, 13], [4.5, 15], [2, 17.5]], [1.8, 2.5, 1.8], FOX);
        s.thick(8, 14, 5, 18, 2, FOX_FAR.b);
        s.thick(10, 13, 7, 17, 2, FOX.b);
        ellBall(s, 12.5, 10, 6.2, 3.4, -30, FOX);
        s.thick(16, 10, 18, 13, 2, FOX.b);
        s.px(19, 13, FOX.b);
        foxHead(s, 13, 1, { eyes: 'open', mouth: 'open' });
        s.point('head', 17, 1);
        return;
    }
    if (f === 1) {
        // nose-first dive: the body arcs over, tail and back legs trail up behind
        brushBall(s, [[7, 6], [4, 4.5], [2, 2.5]], [1.8, 2.4, 1.6], FOX);
        s.thick(8, 7, 5, 9, 2, FOX_FAR.b);
        s.thick(9, 6, 6, 3, 2, FOX.b);
        s.rect(5, 2, 2, 2, FOX.b);
        s.px(5, 2, PAD);
        brushBall(s, [[7.5, 6.5], [11, 5.5], [14, 8.5], [14.5, 12.5]], [2.6, 3.2, 3.2, 2.8], FOX);
        // head pointing down, ears toward the tail side
        s.tri(16, 12, 19.5, 10.5, 18, 15, FOX.d1);
        s.ball(11, 12, 7, 6, FOX);
        s.poly([[11.5, 16], [16.5, 16], [14, 20.5]], FOX.l1);
        s.hline(13, 14, 20, INK);
        s.hline(12, 13, 14, INK);
        s.hline(15, 16, 14, INK);
        s.px(12, 16, BLUSH);
        // front paws together beside the snout
        s.thick(11, 14, 10, 19, 2, FOX.b);
        s.px(10, 19, FOX.d1);
        // snow puffs where the nose goes in
        for (const [x, y] of [[8, 20], [18, 19], [6, 18], [19, 21], [11, 21]]) s.px(x, y, SNOW.l1);
        s.point('head', 12, 1);
        return;
    }
    // buried nose-deep: only the back legs and the fluffy tail stick out of the snow
    // back legs kicking, paw pads to the sky
    s.thick(10, 16, 6, 10, 2, FOX_FAR.b);
    s.rect(4, 8, 3, 3, FOX_FAR.b);
    s.px(5, 8, PAD);
    s.thick(15, 16, 18, 12, 2, FOX.b);
    s.thick(18, 12, 19, 8, 2, FOX.b);
    s.rect(18, 6, 3, 3, FOX.b);
    s.px(19, 6, PAD);
    s.px(20, 7, FOX.d1);
    // the tail curling up like a question mark
    brushBall(s, [[12.5, 15], [13, 10.5], [12.2, 6.5], [9.8, 4], [8, 4.8]], [2.2, 2.6, 2.4, 2, 1.4], FOX);
    s.px(7, 4, FOX.l2);
    // round bottom poking out
    s.ball(8, 13, 9, 7, FOX);
    s.line(12, 14, 12, 17, FOX.d1);
    // snow thrown up around the hole
    s.ball(4, 18, 17, 4, SNOW);
    s.hline(6, 18, 18, SNOW.l1);
    for (const [x, y] of [[3, 15], [21, 14], [2, 18], [22, 17], [16, 3], [3, 5]]) s.px(x, y, SNOW.l1);
    s.point('head', 12, 1);
}

function foxSleeping(s) {
    // curled up in a round bun, head on its paws, tail wrapped over the nose
    s.ball(1, 3, 13, 9, FOX);
    s.line(3, 5, 6, 4, FOX.l1);
    // ears
    s.tri(10.5, 4, 12, 0.5, 14, 3.5, FOX.d1);
    s.tri(13, 3.5, 15.5, 0.5, 17, 5, FOX.b);
    s.px(15, 3, FOX_EAR);
    s.px(15, 2, FOX_EAR);
    // head
    s.ball(10, 3, 8, 6, FOX);
    s.line(10, 4, 9, 8, FOX.d1);
    s.px(13, 5, INK);
    s.px(14, 6, INK);
    s.px(15, 6, INK);
    s.px(16, 5, INK);
    s.px(12, 7, BLUSH);
    // tail wraps round the front and over the snout
    s.line(2, 8, 15, 8, FOX.d1);
    s.px(16, 7, FOX.d1);
    s.px(17, 6, FOX.d1);
    brushBall(s, [[2.5, 10], [7, 10.2], [12, 9.8], [16, 8.8], [18.6, 7]], [1.5, 1.8, 1.9, 1.9, 1.3], FOX);
    s.px(18, 6, FOX.l2);
    s.px(19, 7, FOX.l2);
    s.point('head', 14, 1);
}

const arcticFoxDef = {
    name: 'a-arcticfox',
    sheet: 'animals-arctic',
    w: 26,
    h: 15,
    anchor: [13, 14],
    outline: NIGHT_LINE,
    anims: {
        idle: [(s) => foxSitting(s), (s) => foxSitting(s, { tail: 1 })],
        blink: [(s) => foxSitting(s, { eyes: 'closed' })],
        look: [(s) => foxSitting(s, { front: true })],
        eat: [(s) => foxSitting(s, { headY: 3, mouth: 'open', eyes: 'happy' }), (s) => foxSitting(s, { headY: 4, eyes: 'happy' })],
        walk: { w: 28, h: 13, anchor: [13, 12], frames: [0, 1, 2, 3].map((f) => (s) => foxWalking(s, f)) },
        special: { w: 24, h: 22, anchor: [12, 21], frames: [0, 1, 2].map((f) => (s) => foxPounce(s, f)) },
        sleep: { w: 21, h: 12, anchor: [10, 11], frames: [(s) => foxSleeping(s)] }
    }
};


// ===========================================================================
// REINDEER
// ===========================================================================
const REIN = { l2: '#d9c6ae', l1: '#b59d86', b: '#8f7866', d1: '#6d5851', d2: '#4b3c42' };
const REIN_BODY = { l1: '#b59d86', b: '#8f7866', d1: '#6d5851' };
const REIN_FAR = { b: '#6d5851', d1: '#56444a', l1: '#8f7866' };
const RNECK = { l2: '#ffffff', l1: '#ffffff', b: '#f0ecf2', d1: '#cbc8e2', d2: '#a3a0c9' };
const ANT = { l1: '#f6ead0', b: '#dcc59c', d1: '#ae9470', d2: '#7d6752' };
const HOOF = '#3a2c36';
const SPARKLE = FX_SPARK;

/**
 * A pair of antlers spreading from two bases like a crown: the back one sweeps
 * up and behind, the front one up and forward, each with tines.
 */
function antlers(s, x, y, { sparkle = 0, front = false } = {}) {
    const seg = (pts, c) => {
        for (let i = 0; i + 1 < pts.length; i += 1) s.line(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], c);
    };
    const back = (m, c) => {
        const M = (pts) => pts.map(([a, b]) => [a * m, b]);
        seg(M([[0, 0], [-1, -2], [-3, -4], [-4, -6], [-4, -8]]), c);
        seg(M([[-1, -2], [0, -4], [0, -5]]), c);
        seg(M([[-3, -4], [-6, -5]]), c);
        seg(M([[-4, -6], [-6, -8]]), c);
        seg(M([[-2, -3], [-2, -3]]), c);
    };
    if (front) {
        back(1, ANT.b);
        seg([[0, 0], [0, 0]], ANT.b);
        const r = (pts) => pts.map(([a, b]) => [a + 5, b]);
        seg(r([[0, 0], [1, -2], [3, -4], [4, -6], [4, -8]]), ANT.b);
        seg(r([[1, -2], [0, -4], [0, -5]]), ANT.b);
        seg(r([[3, -4], [6, -5]]), ANT.b);
        seg(r([[4, -6], [6, -8]]), ANT.b);
        s.px(x - 1, y - 1, ANT.l1);
        s.px(x + 6, y - 1, ANT.l1);
    } else {
        // far (front-pointing) antler first, darker
        const r = (pts) => pts.map(([a, b]) => [a + 2, b]);
        seg(r([[0, 0], [1, -2], [2, -4], [4, -6], [5, -8]]), ANT.d1);
        seg(r([[2, -4], [1, -7]]), ANT.d1);
        seg(r([[1, -1], [3, -1]]), ANT.d1);
        back(1, ANT.b);
        s.px(x, y - 1, ANT.l1);
        s.px(x - 3, y - 4, ANT.l1);
    }
    if (sparkle) {
        const pts = sparkle === 1 ? [[1, -6], [-7, -5], [7, -9], [-5, -10]] : [[-7, -9], [2, -8], [6, -5], [-3, -2]];
        pts.forEach(([px, py], i) => {
            s.px(x + px, y + py, SPARKLE);
            if (i < 2) {
                s.px(x + px - 1, y + py, SPARKLE);
                s.px(x + px + 1, y + py, SPARKLE);
                s.px(x + px, y + py - 1, SPARKLE);
                s.px(x + px, y + py + 1, SPARKLE);
                s.px(x + px, y + py, '#ffffff');
            }
        });
    }
}

function reindeerHead(s, x, y, { eyes = 'open', mouth = 'smile', front = false, sparkle = 0 } = {}) {
    if (front) {
        antlers(s, x + 2, y + 2, { sparkle, front: true });
        // ears
        s.oval(x - 2, y + 3, 3, 2, REIN.b);
        s.oval(x + 9, y + 3, 3, 2, REIN.b);
        s.px(x - 1, y + 4, REIN.d1);
        s.px(x + 10, y + 4, REIN.d1);
        s.ball(x, y + 1, 10, 9, REIN);
        s.oval(x + 2, y + 6, 6, 4, REIN.l2);
        s.rect(x + 3, y + 6, 4, 2, '#3b2a33');
        s.px(x + 3, y + 6, '#6b5566');
        s.px(x + 4, y + 9, mouth === 'open' ? MOUTH_D : REIN.d1);
        s.px(x + 5, y + 9, mouth === 'open' ? MOUTH_D : REIN.d1);
        faceEyes(s, x + 1, x + 7, y + 3, eyes);
        s.px(x + 1, y + 6, BLUSH);
        s.px(x + 8, y + 6, BLUSH);
        return;
    }
    antlers(s, x + 3, y + 1, { sparkle });
    // ear, leaf-shaped, pointing back
    s.oval(x - 2, y + 2, 4, 2, REIN.b);
    s.px(x - 1, y + 2, REIN.l1);
    // head and a long soft muzzle
    s.ball(x, y + 1, 8, 7, REIN);
    s.oval(x + 4, y + 4, 6, 4, REIN.l1);
    s.px(x + 5, y + 4, REIN.l2);
    s.rect(x + 8, y + 4, 2, 2, '#3b2a33');
    s.px(x + 8, y + 4, '#6b5566');
    if (mouth === 'open') s.hline(x + 7, x + 8, y + 7, MOUTH_D);
    else s.px(x + 8, y + 7, REIN.d1);
    faceEyes(s, x + 2, x + 5, y + 2, eyes);
    s.px(x + 2, y + 5, BLUSH);
}

/** Reindeer in a 33×32 frame, hooves on row 31. */
function reindeer(s, o = {}) {
    const { legsOff = [0, 0, 0, 0], lift = [0, 0, 0, 0], bob = 0, head = 'side', eyes, mouth, sparkle = 0, tilt = 0, tail = 0 } = o;
    const G = 31;
    const by = 16 + bob;
    const leg = (x, i, P, near) => {
        // hip stays put, the hoof swings: a slanted stride
        const hx = x + legsOff[i];
        const bottom = G - lift[i];
        s.rect(x, by + 5, 2, 3, P.b);
        s.thick(x, by + 7, hx, bottom - 1, 2, P.b);
        if (near) s.line(x + 1, by + 8, hx + 1, bottom - 2, P.d1);
        s.rect(hx, bottom - 1, 2, 2, HOOF);
        s.px(hx + 1, bottom - 1, '#5a4652');
    };
    leg(9, 1, REIN_FAR, false);
    leg(21, 3, REIN_FAR, false);
    // white tail
    s.oval(2, by + 1 - tail, 3, 3, RNECK.b);
    // body with a rounded haunch
    s.ball(3, by, 21, 9, REIN_BODY);
    s.ball(3, by + 1, 8, 8, REIN_BODY);
    s.hline(9, 19, by + 8, REIN.l1);
    leg(6, 0, REIN, true);
    leg(18, 2, REIN, true);
    // neck and the white shaggy ruff
    if (head === 'down') {
        s.poly([[17, by + 1], [22, by - 1], [27, by + 6], [23, by + 9], [18, by + 6]], REIN.b);
        s.poly([[20, by + 4], [23, by + 3], [26, by + 7], [23, by + 9]], RNECK.b);
        s.px(21, by + 6, RNECK.d1);
    } else {
        s.poly([[17, by + 1], [21, by - 6 + tilt], [25, by - 5 + tilt], [25, by + 4], [20, by + 7]], REIN.b);
        s.poly([[21, by - 3 + tilt], [25, by - 4 + tilt], [26, by + 4], [23, by + 8], [20, by + 6]], RNECK.b);
        s.line(25, by - 2 + tilt, 25, by + 4, RNECK.d1);
        s.px(21, by + 7, RNECK.b);
        s.px(24, by + 8, RNECK.b);
        s.px(22, by + 8, RNECK.d1);
    }
    // head
    if (head === 'down') {
        // head lowered to the snow, face turned toward us, muzzle nosing about
        reindeerHead(s, 23, by + 4, { eyes: 'happy', mouth: mouth || 'open', front: true });
        const puff = mouth === 'smile' ? [[23, G], [33, G - 1], [34, G - 3]] : [[22, G - 1], [33, G], [21, G - 3]];
        for (const [px, py] of puff) s.px(px, py, FX_SNOW);
        s.point('head', 28, by - 2);
        s.point('mouth', 28, by + 13);
    } else if (head === 'front') {
        reindeerHead(s, 19, by - 11, { eyes, mouth, front: true });
        s.point('head', 24, by - 17);
    } else {
        reindeerHead(s, 21, by - 10 + tilt, { eyes, mouth, sparkle });
        s.point('head', 24, by - 17 + tilt);
    }
}

const reindeerDef = {
    name: 'a-reindeer',
    sheet: 'animals-arctic',
    w: 33,
    h: 32,
    anchor: [15, 31],
    anims: {
        idle: [(s) => reindeer(s), (s) => reindeer(s, { bob: 1, tail: 1 })],
        blink: [(s) => reindeer(s, { eyes: 'closed' })],
        walk: [
            (s) => reindeer(s, { legsOff: [-2, 2, 2, -2] }),
            (s) => reindeer(s, { legsOff: [0, 1, 1, 0], lift: [2, 0, 0, 2], bob: -1 }),
            (s) => reindeer(s, { legsOff: [2, -2, -2, 2] }),
            (s) => reindeer(s, { legsOff: [1, 0, 0, 1], lift: [0, 2, 2, 0], bob: -1 })
        ],
        eat: { w: 36, h: 32, anchor: [15, 31], frames: [(s) => reindeer(s, { head: 'down' }), (s) => reindeer(s, { head: 'down', mouth: 'smile' })] },
        look: [(s) => reindeer(s, { head: 'front' })],
        special: [(s) => reindeer(s, { tilt: -1, sparkle: 1, eyes: 'happy' }), (s) => reindeer(s, { tilt: 1, sparkle: 2, eyes: 'happy' })]
    }
};

// ===========================================================================
// SNOWY OWL
// ===========================================================================
const OWL = { l2: '#ffffff', l1: '#ffffff', b: '#f3f4fc', d1: '#cbd1ee', d2: '#a0a7d4' };
const OWL_SPECK = '#5f5b8a';
const OWL_EYE = '#ffcf3a';
const OWL_BEAK = '#4a4668';

/** Big round owl eyes: 3×3 yellow with a dark pupil and a glint. */
function owlEyes(s, x1, x2, y, eyes) {
    for (const x of [x1, x2]) {
        if (eyes === 'open') {
            s.rect(x, y, 3, 3, OWL_EYE);
            s.rect(x + 1, y + 1, 1, 2, INK);
            s.px(x + 2, y, '#fff6c8');
            s.px(x, y + 2, '#e0a82a');
        } else if (eyes === 'happy') {
            s.px(x, y + 2, INK);
            s.px(x + 1, y + 1, INK);
            s.px(x + 2, y + 2, INK);
        } else {
            s.hline(x, x + 2, y + 2, INK);
        }
    }
}

/** Perched owl; feet grip on the bottom row. ox shifts it right (for the wing stretch frame). */
function owl(s, o = {}) {
    const { eyes = 'open', front = false, bob = 0, headY = 0, wing = 0, beak = 'shut', ox = 0 } = o;
    const G = 15;
    const X = (v) => v + ox;
    // stretched wing (special): long and tapered, feather fingers along the trailing edge
    if (wing) {
        const L = wing === 2 ? -3 : 0;
        const pts = [[4, 6], [0, 4 + L * 0.4], [-4, 3 + L * 0.7], [-7, 2 + L], [-7, 4 + L], [-6, 5 + L * 0.7], [-5, 5 + L * 0.7],
            [-4, 7 + L * 0.5], [-3, 7 + L * 0.5], [-2, 9 + L * 0.3], [-1, 9 + L * 0.3], [1, 11], [4, 11]];
        s.poly(pts.map(([x, y]) => [X(x), y]), OWL.b);
        s.line(X(3), 6, X(-6), Math.round(3 + L), OWL.l1);
        s.line(X(2), 9, X(-4), Math.round(5 + L * 0.7), OWL.d1);
        for (const [x, y] of [[-5, 4 + L], [-2, 4 + L * 0.5], [1, 5], [-3, 6 + L * 0.5], [0, 7], [2, 8]]) s.px(X(x), Math.round(y), OWL_SPECK);
    }
    // body
    s.ball(X(2), 5 + bob, 11, 10 - bob, OWL);
    // folded wing with a few speckle bars
    if (!wing) {
        s.poly([[X(3), 7 + bob], [X(7), 7 + bob], [X(8), 13], [X(4), 14], [X(2), 11]], OWL.d1);
        s.line(X(3), 8 + bob, X(6), 8 + bob, OWL.b);
        for (const [x, y] of [[4, 10], [6, 11], [4, 12]]) s.px(X(x), y, OWL_SPECK);
    }
    for (const [x, y] of [[9, 10], [11, 12]]) s.px(X(x), y, OWL_SPECK);
    // tail tip
    s.px(X(1), 14, OWL.d1);
    // feathered feet gripping, dark talons
    s.rect(X(5), G - 1, 2, 2, OWL.b);
    s.rect(X(8), G - 1, 2, 2, OWL.b);
    s.px(X(5), G, OWL_SPECK);
    s.px(X(9), G, OWL_SPECK);
    // head: big and round with a pale face disc
    const hy = 1 + bob + headY;
    s.ball(X(2), hy, 11, 8, OWL);
    s.px(X(4), hy + 1, OWL_SPECK);
    s.px(X(7), hy, OWL_SPECK);
    if (front) {
        s.oval(X(3), hy + 2, 9, 5, OWL.l1);
        owlEyes(s, X(3), X(9), hy + 2, eyes);
        s.px(X(7), hy + 5, OWL_BEAK);
        s.px(X(7), hy + 6, beak === 'open' ? MOUTH_D : OWL.d2);
    } else {
        s.oval(X(4), hy + 2, 9, 5, OWL.l1);
        owlEyes(s, X(5), X(9), hy + 2, eyes);
        s.px(X(8), hy + 5, OWL_BEAK);
        s.px(X(8), hy + 6, beak === 'open' ? MOUTH_D : OWL.d2);
        s.px(X(12), hy + 5, OWL.d1);
    }
    s.point('head', X(7), hy);
    if (headY > 0) s.point('mouth', X(10), hy + 6);
}

/** Flying owl in a 25×17 frame, anchor at the body centre. f = 0 wings up, 1 level, 2 down. */
function owlFly(s, f) {
    const cy = 9;
    // a broad wing with three feather fingers at the tip; dir -1 = far (left), 1 = near (right)
    const wing = (dir, P) => {
        const lift = [-7, -1, 5][f];
        const root = [12 + dir * 2, cy - 1];
        const tip = [12 + dir * 11, cy + lift];
        const mid = [12 + dir * 7, cy + lift * 0.6 - 1];
        const fingers = [];
        for (let k = 0; k < 3; k += 1) fingers.push([tip[0] - dir * k * 2, tip[1] + 1 + k * 1.5 + (f === 0 ? k * 0.5 : 0)]);
        const pts = [root, mid, tip, ...fingers, [12 + dir * 5, cy + lift * 0.4 + 3], [12 + dir * 2, cy + 3]];
        s.poly(pts, P.b);
        s.line(root[0], root[1], tip[0], tip[1], P.l1 || P.b);
        for (const [x, y] of fingers) s.px(x, y, P.d1);
        for (let k = 0; k < 3; k += 1) s.px(12 + dir * (5 + k * 2), Math.round(cy + 1 + (lift * (5 + k * 2)) / 11), OWL_SPECK);
    };
    wing(-1, { b: OWL.d1, d1: OWL.d2, l1: OWL.b });
    s.ball(8, cy - 3, 9, 8, OWL);
    s.px(9, cy + 4, OWL.d1);
    s.rect(10, cy + 4, 2, 2, OWL.b);
    wing(1, OWL);
    // head looking ahead
    s.ball(11, cy - 8, 10, 8, OWL);
    s.oval(12, cy - 6, 9, 5, OWL.l1);
    owlEyes(s, 13, 17, cy - 6, 'open');
    s.px(16, cy - 3, OWL_BEAK);
    s.point('head', 16, cy - 8);
}

const owlDef = {
    name: 'a-snowyowl',
    sheet: 'animals-arctic',
    w: 15,
    h: 16,
    anchor: [7, 15],
    outline: NIGHT_LINE,
    anims: {
        idle: [(s) => owl(s), (s) => owl(s, { bob: 1 })],
        blink: [(s) => owl(s, { eyes: 'closed' })],
        look: [(s) => owl(s, { front: true })],
        eat: [(s) => owl(s, { headY: 2, beak: 'open', eyes: 'happy' }), (s) => owl(s, { headY: 1, eyes: 'happy' })],
        special: { w: 22, h: 16, anchor: [14, 15], frames: [(s) => owl(s, { wing: 1, ox: 7 }), (s) => owl(s, { wing: 2, ox: 7, eyes: 'happy' })] },
        fly: { w: 25, h: 17, anchor: [12, 9], frames: [0, 1, 2].map((f) => (s) => owlFly(s, f)) }
    }
};

// ===========================================================================
// WALRUS
// ===========================================================================
const WAL = { l2: '#f4d6c7', l1: '#e3ae98', b: '#c98b79', d1: '#a1675f', d2: '#74464c' };
const WAL_BODY = { l1: '#e3ae98', b: '#c98b79', d1: '#a1675f', d2: '#8a5556' };
const WAL_PAD = { b: '#ecc2ad', d1: '#c99582', dot: '#8a5a52' };
const TUSK = { b: '#fffaf0', d1: '#ddd0b8' };

function walrusHead(s, x, y, { eyes = 'open', mouth = 'smile', front = false } = {}) {
    if (front) {
        s.ball(x, y, 13, 11, WAL_BODY);
        // whisker pad: two round lobes
        s.oval(x + 1, y + 5, 6, 5, WAL_PAD.b);
        s.oval(x + 6, y + 5, 6, 5, WAL_PAD.b);
        s.px(x + 6, y + 9, WAL_PAD.d1);
        for (const [dx, dy] of [[2, 7], [4, 8], [8, 7], [10, 8], [3, 9], [9, 9]]) s.px(x + dx, y + dy, WAL_PAD.dot);
        s.hline(x + 5, x + 7, y + 5, WAL.d2);
        // tusks
        s.rect(x + 3, y + 10, 2, 6, TUSK.b);
        s.rect(x + 8, y + 10, 2, 6, TUSK.b);
        s.vline(x + 4, y + 11, y + 15, TUSK.d1);
        s.vline(x + 9, y + 11, y + 15, TUSK.d1);
        if (mouth === 'open') s.hline(x + 5, x + 7, y + 10, MOUTH_D);
        faceEyes(s, x + 3, x + 8, y + 2, eyes);
        s.px(x + 1, y + 4, BLUSH);
        s.px(x + 11, y + 4, BLUSH);
        return;
    }
    s.ball(x, y, 11, 10, WAL_BODY);
    // big mustache pad
    s.oval(x + 5, y + 4, 8, 6, WAL_PAD.b);
    s.hline(x + 7, x + 11, y + 9, WAL_PAD.d1);
    for (const [dx, dy] of [[7, 6], [9, 6], [11, 6], [8, 8], [10, 8]]) s.px(x + dx, y + dy, WAL_PAD.dot);
    s.hline(x + 10, x + 11, y + 4, WAL.d2);
    // tusks
    s.rect(x + 8, y + 9, 2, 7, TUSK.b);
    s.vline(x + 9, y + 10, y + 15, TUSK.d1);
    s.rect(x + 11, y + 9, 1, 6, TUSK.d1);
    if (mouth === 'open') s.hline(x + 9, x + 11, y + 9, MOUTH_D);
    faceEyes(s, x + 3, x + 7, y + 2, eyes);
    s.px(x + 3, y + 5, BLUSH);
}

/** Walrus lying on the ice in a 34×21 frame. flop: 1 rearing up, 2 belly-flopped flat. */
function walrus(s, o = {}) {
    const { bob = 0, eyes, mouth, front = false, headY = 0, flop = 0, tail = 0 } = o;
    const G = 20;
    const rise = flop === 1 ? -3 : 0;
    // hind flippers
    s.poly([[5, 15], [0, 12 - tail], [1, 17], [0, 20], [5, 19]], WAL.d1);
    s.line(1, 13 - tail, 3, 16, WAL.d2);
    // body
    if (flop === 2) {
        s.ball(1, 10, 27, 11, WAL_BODY);
        s.ball(14, 7, 15, 14, WAL_BODY);
    } else {
        s.ball(2, 7 + bob, 23, 14 - bob, WAL_BODY);
        s.ball(13, 3 + bob + rise, 14, 16 - bob - rise, WAL_BODY);
    }
    // a couple of soft skin folds
    s.line(17, 11 + bob + (flop === 2 ? 2 : 0), 16, 14, WAL.d1);
    s.line(9, 11 + bob, 8, 14, WAL.d1);
    s.hline(4, 24, G, WAL.d1);
    // near front flipper: resting, or flung out while rearing
    if (flop === 1) {
        s.poly([[19, 12], [23, 11], [30, 15], [29, 18], [21, 16]], WAL.d1);
        s.line(22, 13, 29, 16, WAL.d2);
    } else {
        s.poly([[20, 15], [24, 15], [27, 20], [20, 20]], WAL.d1);
        s.line(22, 17, 24, 20, WAL.d2);
    }
    const hx = front ? 18 : 19;
    const hy = 1 + bob + headY + rise + (flop === 2 ? 5 : 0);
    walrusHead(s, hx, hy, { eyes, mouth, front });
    if (flop === 2) {
        for (const [x, y] of [[0, 18], [1, 15], [3, 19], [31, 18], [32, 15], [30, 20], [33, 19]]) s.px(x, y, FX_SNOW);
    }
    s.point('head', hx + 5, Math.max(0, hy));
    if (headY > 0) s.point('mouth', hx + 11, hy + 8);
}

function walrusSwim(s, f) {
    // head above the waterline (row 12), tusks dipping under
    const y = f ? 1 : 2;
    s.rect(2, y + 6, 10, 14 - y - 5, WAL.b);
    walrusHead(s, 1, y, {});
    s.point('head', 6, y);
}

const walrusDef = {
    name: 'a-walrus',
    sheet: 'animals-arctic',
    w: 34,
    h: 21,
    anchor: [16, 20],
    outline: '#4a2833',
    anims: {
        idle: [(s) => walrus(s), (s) => walrus(s, { bob: 1, tail: 1 })],
        blink: [(s) => walrus(s, { eyes: 'closed' })],
        look: [(s) => walrus(s, { front: true })],
        eat: [(s) => walrus(s, { headY: 2, mouth: 'open', eyes: 'happy' }), (s) => walrus(s, { headY: 3, eyes: 'happy' })],
        special: { w: 34, h: 24, anchor: [16, 23], frames: [(s) => sheared(s, (t) => walrus(t, { flop: 1, eyes: 'happy', mouth: 'open' }), { dy: 3 }), (s) => sheared(s, (t) => walrus(t, { flop: 2, eyes: 'happy', mouth: 'open', tail: 1 }), { dy: 3 })] },
        swim: { w: 15, h: 15, anchor: [7, 12], frames: [0, 1].map((f) => (s) => walrusSwim(s, f)) }
    }
};

// ===========================================================================
// HUMPBACK WHALE
// ===========================================================================
const WH = { l2: '#9db2e2', l1: '#7389c2', b: '#52659c', d1: '#3c497c', d2: '#2b335d' };
const WH_BELLY = { l1: '#f5f8ff', b: '#dde5f7', d1: '#b1bde0' };
const WH_GROOVE = '#a3b0d6';
const WH_FIN = { l1: '#f7f9ff', b: '#e1e8f8', d1: '#b3bfe2', edge: '#7282b8' };

/** Sampled spine with tangent normals: [{ x, y, t, nx, ny }]. */
function spineSamples(spine, steps = 8) {
    const c = curve(spine, steps);
    return c.map(([x, y, t], i) => {
        const a = c[Math.max(0, i - 1)];
        const b = c[Math.min(c.length - 1, i + 1)];
        let tx = b[0] - a[0];
        let ty = b[1] - a[1];
        const l = Math.hypot(tx, ty) || 1;
        tx /= l;
        ty /= l;
        return { x, y, t, nx: -ty, ny: tx };
    });
}

function lerpList(list, t) {
    const f = t * (list.length - 1);
    const i = Math.min(list.length - 2, Math.floor(f));
    return list[i] + (list[i + 1] - list[i]) * (f - i);
}

function disc(s, cx, cy, r, c, onlyOver = false) {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y += 1) {
        for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x += 1) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            if (dx * dx + dy * dy > r * r + 0.3) continue;
            if (onlyOver && !s.opaque(x, y)) continue;
            s.px(x, y, c);
        }
    }
}

/** A long humpback flipper from (x0,y0) toward (x1,y1): white, knobbly front edge. */
function whaleFlipper(s, x0, y0, x1, y1, far = false) {
    const P = far ? { b: WH_FIN.d1, d1: WH.l1, edge: WH.d1 } : WH_FIN;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i += 1) {
        const t = i / n;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        const r = 1.9 * (1 - t) + 0.6;
        disc(s, x, y, r, P.b);
    }
    // darker leading edge with knobs
    const lx = -(y1 - y0) / n;
    const ly = (x1 - x0) / n;
    for (let i = 0; i <= n; i += 2) {
        const t = i / n;
        const r = 1.9 * (1 - t) + 0.6;
        s.px(x0 + (x1 - x0) * t + lx * r, y0 + (y1 - y0) * t + ly * r, P.edge);
    }
}

/**
 * Paint a humpback along a spine running from the snout tip to the tail.
 * belly: which side of the spine the pale throat is on (+1 / -1 of the left normal).
 */
function whaleAlong(s, spine, radii, o = {}) {
    const { belly = -1, eyes = 'open', flippers = [], fin = true, smile = true, pale = true } = o;
    const S = spineSamples(spine, 10);
    const R = (t) => lerpList(radii, t);
    // far flipper behind the body
    for (const f of flippers.filter((f) => f.far)) whaleFlipper(s, f.x0, f.y0, f.x1, f.y1, true);
    // body volume
    brushBall(s, spine, radii, WH);
    // pale grooved throat and belly
    for (const p of S) {
        if (p.t > 0.62 || !pale) continue;
        const r = R(p.t);
        disc(s, p.x + p.nx * belly * r * 0.55, p.y + p.ny * belly * r * 0.55, r * 0.55, WH_BELLY.b, true);
    }
    for (const k of (pale ? [0.3, 0.62] : [])) {
        for (const p of S) {
            if (p.t < 0.06 || p.t > 0.42) continue;
            const r = R(p.t);
            const x = p.x + p.nx * belly * r * k;
            const y = p.y + p.ny * belly * r * k;
            if (s.opaque(Math.round(x), Math.round(y))) s.px(x, y, WH_GROOVE);
        }
    }
    // knobbly head bumps on top
    for (const t of [0.03, 0.08, 0.13]) {
        const p = S[Math.round(t * (S.length - 1))];
        const r = R(t);
        s.px(p.x - p.nx * belly * r * 0.55, p.y - p.ny * belly * r * 0.55, WH.l2);
    }
    // smiling mouth line and eye
    let last = null;
    for (const p of S) {
        if (p.t > 0.2) break;
        const r = R(p.t);
        last = [p.x + p.nx * belly * r * 0.05, p.y + p.ny * belly * r * 0.05, p];
        if (smile) s.px(last[0], last[1], WH.d2);
    }
    if (last) {
        const [mx, my, p] = last;
        const ex = mx - p.nx * belly * 2.2 - (S[1].x - S[0].x) * 0;
        const ey = my - p.ny * belly * 2.2;
        if (eyes === 'open') {
            s.rect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2, INK);
            s.px(Math.round(ex), Math.round(ey) - 1, SPARK);
        } else if (eyes === 'closed') {
            s.hline(Math.round(ex) - 1, Math.round(ex), Math.round(ey), INK);
        }
        s.point('head', Math.round(ex), Math.max(0, Math.round(ey) - 4));
    }
    // dorsal fin on the back, two thirds along
    if (fin) {
        const p = S[Math.round(0.72 * (S.length - 1))];
        const r = R(0.72);
        const bx = p.x - p.nx * belly * (r + 0.5);
        const by = p.y - p.ny * belly * (r + 0.5);
        s.tri(bx - 2, by + 1, bx + 1.5, by + 1, bx - 1.5, by - 2.5, WH.d1);
    }
    for (const f of flippers.filter((f) => !f.far)) whaleFlipper(s, f.x0, f.y0, f.x1, f.y1, false);
}

/**
 * Splash: jets of water bursting up and curling outward, each ending in a round
 * drop, over a foamy base. Drawn in effect colours, so it gets no outline.
 */
function splash(s, cx, cy, w, h, seed = 1, { drops = 10, jets = 7 } = {}) {
    let r = seed * 9301 + 49297;
    const rnd = () => {
        r = (r * 9301 + 49297) % 233280;
        return r / 233280;
    };
    const J = [];
    for (let i = 0; i < jets; i += 1) {
        const u = jets === 1 ? 0 : (i / (jets - 1)) * 2 - 1;        // -1 .. 1 across
        const a = u * 62 + (rnd() - 0.5) * 10;
        const L = h * (1 - 0.55 * Math.abs(u)) * (0.8 + rnd() * 0.25);
        const bx = cx + u * w * 0.28;
        const dx = Math.sin((a * Math.PI) / 180);
        const dy = -Math.cos((a * Math.PI) / 180);
        const tip = [bx + dx * L + u * L * 0.12, cy + dy * L + L * 0.08];
        const pts = [[bx, cy], [bx + dx * L * 0.55, cy + dy * L * 0.55], tip];
        const base = Math.max(1.6, Math.min(3.4, w / (jets * 1.3)));
        J.push({ pts, radii: [base, base * 0.7, 0.9], tip, dx, dy, L });
    }
    for (const j of J) brush(s, j.pts, j.radii, FX_SPRAY2, { dx: 0.6, dy: 0.5 });
    for (const j of J) brush(s, j.pts, j.radii, FX_SPRAY);
    for (const j of J) brush(s, j.pts, j.radii, FX_SNOW, { dx: -0.5, dy: -0.4, shrink: 0.9 });
    for (const j of J) {
        const [tx, ty] = j.tip;
        disc(s, tx + j.dx * 2.6, ty + j.dy * 2.6, j.L > 8 ? 1.2 : 0.7, FX_SNOW);
    }
    // foam on the water
    for (let x = Math.round(cx - w / 2); x <= Math.round(cx + w / 2); x += 1) {
        const k = 1 - Math.abs(x - cx) / (w / 2 + 1);
        const top = Math.round(cy - 1 - k * 2.5 - (x % 3 === 0 ? 1 : 0));
        for (let y = top; y <= cy; y += 1) s.px(x, y, y === top ? FX_SNOW : FX_SPRAY);
    }
    s.hline(Math.round(cx - w / 2 - 3), Math.round(cx + w / 2 + 3), cy, FX_SPRAY2);
    for (let i = 0; i < drops; i += 1) {
        const a = Math.PI * (0.1 + rnd() * 0.8);
        const d = 0.8 + rnd() * 0.45;
        s.px(cx - Math.cos(a) * (w * 0.6) * d, cy - 2 - Math.sin(a) * h * d, rnd() < 0.6 ? FX_SNOW : FX_SPRAY);
    }
}

/** Clear everything more than `below` rows under the waterline (the game draws water there). */
function cutBelow(s, wl, below = 2) {
    for (let y = wl + below + 1; y < s.h; y += 1) for (let x = 0; x < s.w; x += 1) s.px(x, y, null);
}

const WL_BREACH = 40;
function whaleBreach(s, f) {
    const wl = WL_BREACH;
    if (f === 0) {
        // nose first out of the sea
        whaleAlong(s, [[40, 13], [38.5, 21], [36.5, 30], [35, 40], [34.5, 50]], [3, 6, 7.5, 8, 8], {
            belly: -1,
            flippers: [{ x0: 39, y0: 31, x1: 47, y1: 25 }],
            fin: false
        });
        splash(s, 36, wl, 24, 9, 3, { drops: 10, jets: 6 });
    } else if (f === 1) {
        // arched high in the air, flippers flung wide like wings
        whaleAlong(s, [[44, 2], [44, 9], [41.5, 17], [38, 26], [35.5, 35], [34.5, 44]], [3.4, 6.2, 7.6, 7.4, 6.2, 5], {
            belly: -1,
            flippers: [{ x0: 36, y0: 14, x1: 23, y1: 7, far: true }, { x0: 44, y0: 17, x1: 57, y1: 25 }],
            fin: false
        });
        splash(s, 35, wl, 18, 6, 5, { drops: 8, jets: 5 });
    } else if (f === 2) {
        // tipping over backwards
        whaleAlong(s, [[17, 12], [24, 14.5], [31, 19], [36, 27], [38.5, 36], [39, 45]], [3.4, 6, 7.4, 7.4, 6.2, 5], {
            belly: -1,
            flippers: [{ x0: 25, y0: 21, x1: 16, y1: 30, far: true }, { x0: 30, y0: 22, x1: 38, y1: 9 }],
            fin: false
        });
        splash(s, 37, wl, 26, 11, 7, { drops: 12, jets: 6 });
    } else {
        // SPLASH!
        splash(s, 36, wl, 40, 33, 11, { drops: 24, jets: 9 });
        s.point('head', 36, 8);
    }
    cutBelow(s, wl);
}

const WL_BACK = 26;
function whaleSpout(s, f) {
    const wl = WL_BACK;
    // only the broad back and the top of the head above the water
    whaleAlong(s, [[48, 29], [38, 28], [26, 29], [14, 31], [4, 34]], [4.5, 7.2, 7.6, 6, 3], { belly: -1, fin: true });
    s.hline(36, 37, 21, WH.d2);
    // bushy spray from the blowhole
    const top = f ? 1 : 9;
    for (let y = 20; y >= top; y -= 1) {
        const k = (20 - y) / (20 - top);
        const spread = 0.5 + k * (f ? 6 : 3.5);
        const c = k > 0.55 ? FX_SNOW : FX_SPRAY;
        disc(s, 36.5 - spread * 0.5, y, 0.9 + k * 1.1, c);
        disc(s, 36.5 + spread * 0.5, y, 0.9 + k * 1.1, c);
    }
    if (f) {
        disc(s, 32, 3, 2, FX_SNOW);
        disc(s, 41, 3, 2, FX_SNOW);
        for (const [x, y] of [[27, 6], [46, 7], [26, 11], [47, 12], [30, 0], [43, 0], [24, 15], [49, 16]]) s.px(x, y, FX_SPRAY);
    }
    s.point('spout', 36, 20);
    s.point('head', 36, top);
    cutBelow(s, wl);
}

const WL_SWIM = 15;
function whaleSwim(s, f) {
    const wl = WL_SWIM;
    if (f === 0) {
        // the long back rolling along the surface
        whaleAlong(s, [[50, 21], [40, 20], [28, 20], [16, 21.5], [6, 24]], [4, 6.8, 7.4, 6, 3], { belly: -1, fin: true, eyes: 'none', smile: false, pale: false });
    } else {
        // arching the back high before a dive
        whaleAlong(s, [[50, 27], [42, 20], [32, 16.5], [21, 17], [11, 21], [3, 27]], [4, 6.6, 7.4, 7, 5, 3], { belly: -1, fin: true, eyes: 'none', smile: false, pale: false });
    }
    for (const [x, y] of [[2, wl], [3, wl], [49, wl], [50, wl], [1, wl - 1], [51, wl - 1]]) s.px(x, y, FX_SPRAY);
    s.point('head', 30, 4);
    cutBelow(s, wl);
}

function whaleIdle(s, f) {
    // resting at the surface: back, a peeking eye and that big smile
    const wl = WL_BACK;
    whaleAlong(s, [[47, 26 + f], [38, 25 + f], [26, 26 + f], [14, 28 + f], [4, 31 + f]], [4.5, 7.2, 7.6, 6, 3], { belly: -1, fin: true, eyes: f ? 'closed' : 'open' });
    s.hline(36, 37, 19 + f, WH.d2);
    for (const [x, y] of [[1, wl], [2, wl], [49, wl], [50, wl]]) s.px(x, y, FX_SPRAY);
    cutBelow(s, wl);
}

const whaleDef = {
    name: 'a-whale',
    sheet: 'animals-arctic',
    w: 52,
    h: 29,
    anchor: [26, WL_BACK],
    anims: {
        idle: [0, 1].map((f) => (s) => whaleIdle(s, f)),
        spout: [0, 1].map((f) => (s) => whaleSpout(s, f)),
        swim: { w: 52, h: 18, anchor: [26, WL_SWIM], frames: [0, 1].map((f) => (s) => whaleSwim(s, f)) },
        breach: { w: 72, h: 43, anchor: [36, WL_BREACH], frames: [0, 1, 2, 3].map((f) => (s) => whaleBreach(s, f)) }
    }
};

// ===========================================================================
// ARCTIC FISH (sheet 'fish2') – side view facing right, anchor = body centre
// ===========================================================================
/** Fish profile: 0 at the tail root .. 1 at the snout; returns 0..1 of the half height. */
function fishProfile(u, peak = 0.6, tailW = 0.34) {
    if (u <= peak) return tailW + (1 - tailW) * Math.sin(((u / peak) * Math.PI) / 2);
    const k = (u - peak) / (1.05 - peak);
    return Math.sqrt(Math.max(0, 1 - k * k));
}

/**
 * Generic fish body from x0 (tail root) to x0+len (snout), centred on row cy.
 * P: { back, side, belly, fin, finD, sheen?, gill, mouth } colours.
 */
function fishBody(s, x0, cy, len, ht, P, o = {}) {
    const { wag = 0, tail = 'fork', tailLen = 4, dorsal = [[0.42, 0.66, 2]], anal = [[0.3, 0.44, 1]], peak = 0.6, belly = 0.42, backBand = 0.34 } = o;
    const hh = (u) => (ht / 2) * fishProfile(u, peak);
    const sh = wag ? 1 : 0;
    // tail fin
    const r0 = Math.max(1, Math.round(hh(0)));
    const spread = r0 + 2;
    if (tail === 'fork') {
        s.poly([[x0 + 1, cy - r0], [x0 - tailLen, cy - spread - 1 + sh], [x0 - tailLen + 2, cy + sh], [x0 - tailLen, cy + spread + 1 + sh], [x0 + 1, cy + r0]], P.fin);
    } else {
        s.poly([[x0 + 1, cy - r0], [x0 - tailLen, cy - spread + sh], [x0 - tailLen, cy + spread + 1 + sh], [x0 + 1, cy + r0 + 1]], P.fin);
    }
    s.line(x0, cy, x0 - tailLen + 1, cy + sh, P.finD);
    // dorsal and belly fins
    for (const [a, b, h] of dorsal) {
        const xa = x0 + len * a;
        const xb = x0 + len * b;
        s.poly([[xa, cy - hh(a) + 1], [xa + (xb - xa) * 0.3, cy - hh((a + b) / 2) - h], [xb, cy - hh((a + b) / 2) - h + 1], [xb + 1, cy - hh(b) + 1]], P.fin);
    }
    for (const [a, b, h] of anal) {
        const xa = x0 + len * a;
        const xb = x0 + len * b;
        s.poly([[xa, cy + hh(a)], [xa + (xb - xa) * 0.35, cy + hh((a + b) / 2) + h + 0.5], [xb, cy + hh(b)]], P.finLow || P.fin);
    }
    // body columns: back / side / belly bands
    for (let x = x0; x <= x0 + len; x += 1) {
        const u = (x - x0) / len;
        const h = hh(u);
        const top = Math.round(cy - h);
        const bot = Math.round(cy + h);
        for (let y = top; y <= bot; y += 1) {
            const v = (y + 0.5 - (cy - h)) / Math.max(1, 2 * h + 1);
            let c = P.side;
            if (v < backBand) c = P.back;
            else if (v > 1 - belly) c = P.belly;
            s.px(x, y, c);
        }
    }
    // gill, eye and mouth
    const gx = Math.round(x0 + len * 0.76);
    s.line(gx, Math.round(cy - hh(0.76) * 0.5), gx - 1, Math.round(cy + hh(0.76) * 0.6), P.gill);
    const ex = Math.round(x0 + len * 0.86);
    const ey = Math.round(cy - hh(0.86) * 0.45) - 1;
    s.rect(ex, ey, 2, 2, INK);
    s.px(ex + 1, ey, SPARK);
    s.px(x0 + len, Math.round(cy + 1), P.mouth);
    // pectoral fin behind the gill
    s.line(gx + 1, cy + 1, gx - 2, cy + 2, P.finD);
    return { hh, ex, ey };
}

// --- Arctic char (röding): dark green back, orange-red belly, pale spots, white-edged fins
const CHAR = { back: '#3f5f55', side: '#6f8f7d', belly: '#f06a3a', fin: '#557466', finLow: '#e25b36', finD: '#34503f', gill: '#2f4a3e', mouth: '#9c3a2a' };
function fishChar(s, wag) {
    const cy = 5;
    const f = fishBody(s, 5, cy, 14, 7, CHAR, { wag, tail: 'fork', tailLen: 4, dorsal: [[0.42, 0.62, 2]], anal: [[0.3, 0.42, 2], [0.6, 0.7, 1]] });
    s.hline(8, 16, cy + 2, '#ff8f5c');
    for (const [x, y] of [[7, 4], [10, 3], [13, 3], [9, 5], [12, 5], [15, 4], [16, 3]]) s.px(x, y, '#ffe2d2');
    // white leading edges on the lower fins
    s.px(Math.round(5 + 14 * 0.3), Math.round(cy + f.hh(0.3)) + 1, '#ffffff');
    s.px(Math.round(5 + 14 * 0.6), Math.round(cy + f.hh(0.6)) + 1, '#ffffff');
}

// --- Cod (torsk): speckled olive, pale lateral line, three dorsal fins, chin barbel
const COD = { back: '#6c6739', side: '#9b9356', belly: '#efe8c8', fin: '#857e46', finD: '#57522c', gill: '#57522c', mouth: '#57522c' };
function fishCod(s, wag) {
    const cy = 5;
    const f = fishBody(s, 4, cy, 17, 8, COD, { wag, tail: 'square', tailLen: 3, peak: 0.66, dorsal: [[0.2, 0.34, 1], [0.4, 0.54, 2], [0.6, 0.74, 2]], anal: [[0.22, 0.36, 1], [0.44, 0.56, 1]], belly: 0.36 });
    for (const [x, y] of [[6, 4], [8, 3], [10, 4], [12, 3], [14, 4], [16, 3], [9, 5], [13, 5], [7, 5], [11, 2], [15, 2]]) s.px(x, y, '#57522c');
    s.line(5, cy, 12, cy - 1, '#e7deaa');
    s.line(13, cy - 1, 17, cy - 1, '#e7deaa');
    // chin barbel: a little whisker under the chin
    const by = Math.round(cy + f.hh(0.94));
    s.px(20, by + 1, COD.finD);
    s.px(20, by + 2, COD.fin);
}

// --- Salmon (lax): silver with a pink sheen, little dark crosses, forked tail
const SALMON = { back: '#5d6f98', side: '#d3dae9', belly: '#f5f7fd', fin: '#8795ba', finD: '#56648d', gill: '#8a79a3', mouth: '#56648d' };
function fishSalmon(s, wag) {
    const cy = 5;
    fishBody(s, 5, cy, 20, 8, SALMON, { wag, tail: 'fork', tailLen: 5, dorsal: [[0.46, 0.62, 2], [0.12, 0.16, 1]], anal: [[0.2, 0.3, 1], [0.54, 0.62, 1]], belly: 0.4 });
    for (let x = 7; x <= 22; x += 1) s.px(x, cy, x % 3 ? '#f4b5c8' : '#f8cdda');
    s.hline(10, 20, cy - 1, '#eef1f9');
    for (const [x, y] of [[9, 3], [12, 2], [15, 3], [18, 2], [11, 4], [20, 3]]) s.px(x, y, '#3a4264');
}

// --- Aurora fish (norrskensfisk): magical, glowing greens and violets, flowing fins
function fishAurora(s, wag) {
    const cy = 5;
    const G = { l: '#b6ffd9', g: '#57f2a8', t: '#3fcfc8', b: '#5f8dff', v: '#a66bff', vd: '#7a47d6', p: '#ff9ee6' };
    // soft glow behind
    for (let y = 0; y < s.h; y += 1) {
        for (let x = 0; x < s.w; x += 1) {
            const dx = (x - 10) / 9.5;
            const dy = (y - cy) / 5.5;
            if (dx * dx + dy * dy < 1) s.px(x, y, '#9dffd820');
        }
    }
    // flowing tail and fins (translucent tips)
    const sh = wag ? 1 : 0;
    s.poly([[5, cy - 1], [0, cy - 5 + sh], [2, cy + sh], [0, cy + 5 + sh], [5, cy + 1]], G.v);
    s.line(4, cy, 1, cy - 4 + sh, G.p);
    s.line(4, cy, 1, cy + 4 + sh, G.b);
    s.poly([[8, cy - 2], [10, cy - 6 + sh], [14, cy - 3]], G.t);
    s.px(10, cy - 5 + sh, G.l);
    s.poly([[9, cy + 2], [10, cy + 5 - sh], [12, cy + 2]], G.v);
    // body: green head fading to violet tail
    s.oval(4, cy - 3, 14, 7, G.t);
    s.oval(9, cy - 3, 9, 7, G.g);
    s.oval(4, cy - 2, 6, 5, G.v);
    s.hline(7, 15, cy - 2, G.l);
    s.hline(6, 15, cy + 2, G.b);
    // glowing dots along the side
    for (const [x, y] of [[7, cy], [10, cy + 1], [13, cy]]) s.px(x, y, '#ffffff');
    // big cute eye
    s.rect(14, cy - 1, 2, 2, INK);
    s.px(15, cy - 1, SPARK);
    s.px(17, cy + 1, G.vd);
    // sparkles around (no outline)
    const sp = wag ? [[2, 1], [18, 9], [12, 10]] : [[3, 10], [18, 1], [8, 0]];
    for (const [x, y] of sp) s.px(x, y, FX_SPARK);
}

// --- Crab (krabba): red, big pincers up, googly eyes on stalks; two side-step frames
const CRAB = { l1: '#ff8a6a', b: '#e2483c', d1: '#b3303a', d2: '#86243a' };
function crab(s, f) {
    const o = f ? 1 : 0;
    // legs, alternating
    for (const [side, dir] of [[3, -1], [12, 1]]) {
        for (let k = 0; k < 3; k += 1) {
            const lx = side + o;
            const up = (k + f) % 2;
            s.line(lx, 6 + k, lx + dir * 2, 8 + k - up, CRAB.d1);
        }
    }
    // pincers raised
    const claw = (x, dir) => {
        s.line(x, 6, x + dir, 4, CRAB.b);
        s.oval(x + dir * 2 - 1, 0, 4, 4, CRAB.b);
        s.px(x + dir * 2 + (dir > 0 ? 1 : 0), 0, null);
        s.px(x + dir * 2 + (dir > 0 ? 1 : 0), 1, null);
        s.px(x + dir * 2 - (dir > 0 ? 0 : 1), 1, CRAB.l1);
    };
    claw(4 + o, -1);
    claw(11 + o, 1);
    // shell
    s.ball(3 + o, 4, 10, 6, CRAB);
    s.px(5 + o, 5, CRAB.l1);
    s.px(6 + o, 5, CRAB.l1);
    // eyes on stalks
    s.vline(6 + o, 3, 4, CRAB.d1);
    s.vline(9 + o, 3, 4, CRAB.d1);
    for (const x of [6 + o, 9 + o]) {
        s.px(x, 2, '#ffffff');
        s.px(x, 3, INK);
    }
    // smile
    s.px(7 + o, 7, CRAB.d2);
    s.px(8 + o, 7, CRAB.d2);
}

// --- Starfish (sjöstjärna): orange, bumpy, arms wiggle
const STAR_O = { l1: '#ffc27a', b: '#ff8d3f', d1: '#d9642c', dot: '#ffe0a6' };
function starfish(s, f) {
    const cx = 6.5;
    const cy = 6.5;
    const rot = f ? 0.12 : 0;
    const pts = [];
    for (let i = 0; i < 10; i += 1) {
        const a = -Math.PI / 2 + rot + (i * Math.PI) / 5;
        const r = i % 2 ? 2.4 : 6;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    s.poly(pts, STAR_O.b);
    // light on the upper-left arms, shade lower-right
    s.recolor((x, y) => (x - cx) + (y - cy) > 3.5, STAR_O.d1);
    s.recolor((x, y) => (x - cx) + (y - cy) < -3.5, STAR_O.l1);
    // bumpy dots down each arm
    for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + rot + (i * 2 * Math.PI) / 5;
        s.px(cx + Math.cos(a) * 3.2, cy + Math.sin(a) * 3.2, STAR_O.dot);
    }
    s.px(cx, cy, STAR_O.dot);
}

const fishDefs = [
    { name: 'f-char', w: 21, h: 11, anchor: [11, 5], paint: fishChar },
    { name: 'f-cod', w: 24, h: 12, anchor: [12, 5], paint: fishCod },
    { name: 'f-salmon', w: 28, h: 11, anchor: [14, 5], paint: fishSalmon },
    { name: 'f-aurorafish', w: 20, h: 11, anchor: [10, 5], paint: fishAurora },
    { name: 'f-crab', w: 17, h: 11, anchor: [8, 5], paint: crab },
    { name: 'f-starfish', w: 14, h: 14, anchor: [7, 7], paint: starfish }
].map(({ name, w, h, anchor, paint }) => ({
    name,
    sheet: 'fish2',
    w,
    h,
    anchor,
    anims: { swim: [0, 1].map((f) => (s) => paint(s, f)) }
}));

// ===========================================================================
// PROPS (sheet 'props-arctic') – anchor bottom-centre unless noted
// ===========================================================================
const ICE = { l2: '#ffffff', l1: '#e6f7ff', b: '#bde5fa', d1: '#8ec3ec', d2: '#6497d8', d3: '#4b73ba' };
const SNOW = { l2: '#ffffff', l1: '#ffffff', b: '#f1f5ff', d1: '#cbd6f2', d2: '#a3b2df' };
const SPRUCE = { l1: '#3f7862', b: '#2c5a4c', d1: '#1f4239', d2: '#173129' };
const WOOD = { l1: '#a8764e', b: '#855634', d1: '#633d26' };

/** Iceberg from facet polygons: [points, colour] in order; wl = waterline row. */
function iceberg(s, facets, cracks, wl, sparkles) {
    for (const [pts, c] of facets) s.poly(pts, c);
    for (const [x0, y0, x1, y1, c] of cracks) s.line(x0, y0, x1, y1, c);
    // foam at the waterline and a glimpse of the ice under the surface
    for (let x = 0; x < s.w; x += 1) {
        if (s.opaque(x, wl)) {
            s.px(x, wl, (x % 4) ? FX_SPRAY : FX_SNOW);
            s.px(x, wl + 1, '#5a8cd070');
        }
    }
    for (const [x, y] of sparkles) s.px(x, y, FX_SPARK);
}

function bigIceberg(s) {
    const wl = 31;
    iceberg(s, [
        [[[1, wl], [4, 24], [7, 19], [11, 12], [14, 6], [17, 2], [20, 1], [23, 6], [26, 9], [30, 8], [34, 11], [38, 17], [41, 24], [43, wl]], ICE.b],
        [[[1, wl], [4, 24], [7, 19], [11, 12], [14, 6], [17, 2], [20, 1], [18, 12], [13, 22], [9, wl]], ICE.l1],
        [[[22, wl], [24, 16], [26, 9], [30, 8], [34, 11], [38, 17], [41, 24], [43, wl]], ICE.d1],
        [[[30, wl], [31, 20], [34, 11], [38, 17], [41, 24], [43, wl]], ICE.d2],
        [[[16, 3], [17, 2], [20, 1], [22, 4], [19, 5], [17, 5]], SNOW.l2],
        [[[28, 9], [30, 8], [33, 10], [30, 11]], SNOW.b]
    ], [
        [18, 12, 13, 22, ICE.b],
        [24, 16, 22, wl, ICE.d2],
        [31, 20, 30, wl, ICE.d3],
        [6, 25, 9, 22, ICE.l2],
        [12, 14, 14, 11, ICE.l2],
        [36, 22, 38, 26, ICE.d3]
    ], wl, [[15, 9], [8, 21], [27, 14]]);
}

function smallIceberg(s) {
    const wl = 23;
    iceberg(s, [
        [[[1, wl], [4, 16], [9, 9], [13, 3], [16, 2], [19, 6], [23, 9], [27, 15], [30, wl]], ICE.b],
        [[[1, wl], [4, 16], [9, 9], [13, 3], [16, 2], [14, 12], [10, wl]], ICE.l1],
        [[[19, wl], [18, 14], [19, 6], [23, 9], [27, 15], [30, wl]], ICE.d1],
        [[[24, wl], [24, 16], [27, 15], [30, wl]], ICE.d2],
        [[[12, 4], [13, 3], [16, 2], [18, 4], [15, 5]], SNOW.l2]
    ], [
        [14, 12, 10, wl, ICE.b],
        [18, 14, 19, wl, ICE.d2],
        [6, 15, 8, 12, ICE.l2]
    ], wl, [[11, 8], [21, 12]]);
}

/** Snow-covered spruce: tiers from the top down, each with a snow blanket on its upper slope. */
function spruce(s, cx, top, tiers, trunkH) {
    const bottom = s.h - 1;
    const trunkTop = bottom - trunkH;
    s.rect(cx - 1, trunkTop, 3, trunkH + 1, WOOD.b);
    s.vline(cx - 1, trunkTop, bottom, WOOD.l1);
    s.vline(cx + 1, trunkTop, bottom, WOOD.d1);
    const n = tiers.length;
    tiers.forEach(([w, h], i) => {
        const y = top + Math.round(((trunkTop - top - h + 1) * i) / Math.max(1, n - 1));
        const half = w / 2;
        // green tier with drooping tips, shaded right side
        s.poly([[cx + 0.5, y], [cx + half + 0.5, y + h], [cx - half + 0.5, y + h]], SPRUCE.b);
        s.poly([[cx + 0.5, y], [cx + half + 0.5, y + h], [cx + 1.5, y + h]], SPRUCE.d1);
        s.hline(Math.round(cx - half + 1), Math.round(cx + half), y + h, SPRUCE.d2);
        s.line(cx, y + 2, Math.round(cx - half * 0.6), Math.round(y + h * 0.8), SPRUCE.l1);
        // snow blanket over the upper slope, with a wavy lower edge
        s.poly([[cx + 0.5, y - 0.5], [cx + half * 0.62 + 0.5, y + h * 0.55], [cx + half * 0.25, y + h * 0.42], [cx - half * 0.15, y + h * 0.58], [cx - half * 0.62 + 0.5, y + h * 0.5]], SNOW.b);
        s.line(cx + 1, y + 1, Math.round(cx + half * 0.55), Math.round(y + h * 0.5), SNOW.d1);
        s.px(Math.round(cx - half * 0.35), Math.round(y + h * 0.38), SNOW.l2);
        // snow on the branch tips
        s.px(Math.round(cx - half + 1), y + h - 1, SNOW.b);
        s.px(Math.round(cx + half - 1), y + h - 1, SNOW.d1);
    });
    s.px(cx, top - 1, SNOW.b);
}

function igloo(s) {
    const G = 17;
    // dome of snow blocks
    s.oval(1, 2, 26, 31, SNOW.b);
    for (let y = 18; y < s.h; y += 1) for (let x = 0; x < s.w; x += 1) if (y > G) s.px(x, y, null);
    s.recolor((x, y) => (x - 14) * 0.9 + (y - 12) * 0.2 > 7.5, SNOW.d1);
    s.recolor((x, y) => (x - 14) * 0.9 + (y - 12) * 0.2 < -9.5 && y < 12, SNOW.l2);
    // block joints
    const rows = [6, 10, 14];
    for (const ry of rows) {
        for (let x = 1; x < 27; x += 1) if (s.opaque(x, ry) && s.opaque(x, ry - 2)) s.px(x, ry, SNOW.d2);
    }
    for (const [x, y0] of [[8, 3], [18, 3], [5, 7], [13, 7], [22, 7], [9, 11], [17, 11], [25, 11], [5, 15], [13, 15], [21, 15]]) {
        for (let y = y0; y < y0 + 3; y += 1) if (s.opaque(x, y)) s.px(x, y, SNOW.d2);
    }
    // entrance tunnel with a warm glow inside
    s.oval(9, 9, 12, 17, SNOW.b);
    for (let y = 18; y < 26; y += 1) for (let x = 0; x < s.w; x += 1) s.px(x, y, null);
    s.recolor((x, y) => x >= 9 && x <= 20 && y >= 9 && (x - 15) > 3, SNOW.d1);
    s.hline(11, 18, 9, SNOW.l2);
    s.oval(12, 12, 6, 10, '#3a2f55');
    s.oval(13, 13, 4, 8, '#ffcf7a');
    s.rect(13, 16, 4, 2, '#ffe6a8');
    s.px(13, 13, '#3a2f55');
    s.px(16, 13, '#3a2f55');
    s.hline(9, 20, G, SNOW.d1);
}

function snowman(s) {
    // body and head
    s.ball(2, 8, 12, 11, SNOW);
    s.ball(4, 1, 9, 8, SNOW);
    // stick arms
    s.line(3, 11, 0, 8, WOOD.b);
    s.px(0, 7, WOOD.b);
    s.line(13, 11, 15, 8, WOOD.b);
    s.px(15, 7, WOOD.b);
    // coal eyes, smile and a carrot nose
    s.rect(6, 3, 1, 2, INK);
    s.rect(9, 3, 1, 2, INK);
    s.px(9, 3, '#6a6388');
    s.hline(9, 11, 5, '#ff8a2a');
    s.px(12, 5, '#e0661d');
    s.px(6, 6, '#4a4466');
    s.px(7, 7, '#4a4466');
    s.px(8, 7, '#4a4466');
    s.px(5, 5, BLUSH);
    // red scarf with a hanging end
    s.hline(4, 12, 8, '#e0483f');
    s.hline(4, 12, 9, '#b8323a');
    s.px(5, 8, '#ff7a6a');
    s.rect(10, 10, 2, 4, '#e0483f');
    s.px(11, 13, '#b8323a');
    s.px(10, 14, '#ffd0c8');
    // coal buttons
    s.px(7, 12, INK);
    s.px(7, 15, INK);
}

function iceCrystal(s, big, f, W, H) {
    const C = { l2: '#ffffff', l1: '#d8fbff', b: '#8fe6ff', d1: '#63aaf0', d2: '#8b7cf0' };
    // a pointed shard: lit left face, shaded right face, bright edge
    const shard = (x, top, w, lean) => {
        const bottom = H - 1;
        const tipH = w + 1;
        const tx = x + w / 2 + lean;
        s.poly([[x, bottom + 1], [x + lean * 0.4, top + tipH], [tx, top], [x + w + lean * 0.4, top + tipH], [x + w, bottom + 1]], C.b);
        s.poly([[tx, top], [x + w + lean * 0.4, top + tipH], [x + w, bottom + 1], [tx - lean * 0.5, bottom + 1]], C.d1);
        s.line(Math.round(x + lean * 0.4), top + tipH, Math.round(x), bottom, C.l1);
        s.px(Math.round(tx - 0.5), top + 1, C.l2);
    };
    if (big) {
        shard(0, 5, 3, -1);
        shard(6, 6, 3, 1);
        shard(2.5, 0, 4, 0);
    } else {
        shard(0, 3, 3, -1);
        shard(3, 0, 4, 0.5);
    }
    s.px(Math.round(W / 2) - 1, H - 1, C.d2);
    s.px(Math.round(W / 2), H - 1, C.d2);
    // twinkle
    const tw = f ? [[W - 1, 1], [0, Math.round(H / 2)]] : [[0, 1], [W - 1, Math.round(H / 2) + 1]];
    for (const [x, y] of tw) s.px(x, y, FX_SPARK);
}

function snowdrift(s) {
    s.poly([[0, 6], [3, 3], [8, 1], [14, 0], [19, 2], [23, 4], [25, 6]], SNOW.b);
    s.poly([[14, 0], [19, 2], [23, 4], [25, 6], [15, 6], [17, 3]], SNOW.d1);
    s.hline(5, 12, 1, SNOW.l2);
    s.hline(3, 7, 2, SNOW.l2);
    s.hline(2, 22, 6, SNOW.d1);
    s.px(9, 3, FX_SPARK);
}

function iceHole(s) {
    // a round hole in the ice, dark water inside, and a tiny wooden stool
    s.oval(7, 1, 15, 7, '#dbeafc');
    s.oval(8, 2, 13, 5, '#8fb6e6');
    s.oval(9, 3, 11, 4, '#1d3b6b');
    s.hline(11, 15, 3, '#2e5a95');
    s.px(16, 4, '#7fb2ff');
    s.px(12, 5, '#3f6fb0');
    s.hline(8, 20, 7, '#b9cdef');
    // tiny wooden stool with splayed legs
    s.hline(0, 5, 3, WOOD.l1);
    s.hline(0, 5, 4, WOOD.d1);
    s.line(1, 5, 0, 7, WOOD.b);
    s.line(4, 5, 5, 7, WOOD.b);
    s.hline(1, 4, 2, SNOW.b);
    s.px(2, 2, SNOW.l2);
}

function snowRock(s) {
    const ROCK = { l1: '#9b98b8', b: '#6f6c90', d1: '#524f72', d2: '#3d3a5c' };
    s.ball(0, 1, 16, 8, ROCK);
    s.px(9, 5, ROCK.d1);
    s.px(10, 6, ROCK.d1);
    // snow cap
    s.poly([[1, 4], [3, 2], [6, 1], [10, 1], [13, 2], [15, 4], [12, 3], [9, 4], [6, 3], [3, 5]], SNOW.b);
    s.hline(4, 9, 1, SNOW.l2);
    s.px(12, 4, SNOW.d1);
    s.px(3, 5, SNOW.d1);
}

const propDefs = [
    { name: 'p-iceberg', w: 50, h: 36, anchor: [25, 34], anims: { idle: [(s) => { sheared(s, bigIceberg, { dx: 3, dy: 3 }); glowHalo(s); }] } },
    { name: 'p-iceberg2', w: 37, h: 28, anchor: [18, 26], anims: { idle: [(s) => { sheared(s, smallIceberg, { dx: 3, dy: 3 }); glowHalo(s); }] } },
    { name: 'p-snowspruce', w: 24, h: 46, anchor: [12, 45], anims: { idle: [(s) => spruce(s, 11, 2, [[7, 7], [11, 9], [15, 10], [19, 11], [23, 12]], 4)] } },
    { name: 'p-snowspruce2', w: 20, h: 34, anchor: [10, 33], anims: { idle: [(s) => spruce(s, 9, 2, [[7, 7], [11, 8], [15, 9], [19, 10]], 3)] } },
    { name: 'p-igloo', w: 28, h: 18, anchor: [14, 17], anims: { idle: [(s) => igloo(s)] } },
    { name: 'p-snowman', w: 16, h: 20, anchor: [8, 19], anims: { idle: [(s) => snowman(s)] } },
    { name: 'p-icecrystal', w: 16, h: 16, anchor: [8, 15], anims: { idle: [0, 1].map((f) => (s) => { sheared(s, (t) => iceCrystal(t, true, f, 10, 13), { dx: 3, dy: 3 }); glowHalo(s, [0.4, 0.18]); }) } },
    { name: 'p-icecrystal2', w: 14, h: 13, anchor: [7, 12], anims: { idle: [0, 1].map((f) => (s) => { sheared(s, (t) => iceCrystal(t, false, f, 8, 10), { dx: 3, dy: 3 }); glowHalo(s, [0.4, 0.18]); }) } },
    { name: 'p-snowdrift', w: 26, h: 7, anchor: [13, 6], outline: '#8e9fd0', anims: { idle: [(s) => snowdrift(s)] } },
    { name: 'p-icehole', w: 23, h: 8, anchor: [11, 7], anims: { idle: [(s) => iceHole(s)] } },
    { name: 'p-snowrock', w: 16, h: 9, anchor: [8, 8], anims: { idle: [(s) => snowRock(s)] } }
].map((d) => ({ sheet: 'props-arctic', ...d }));


// ===========================================================================
// Air around the drawings: every animation gets padded where its drawing
// would touch the frame edge (so the outline is never clipped). The painters
// keep their own coordinates; the anchor moves with the padding.
// ===========================================================================
const PADS = {
    'a-polarbear': { special: { l: 1, r: 1 }, stand: { l: 1, r: 1 } },
    'a-polarcub': { '*': { t: 1 }, walk: { t: 2 }, special: {} },
    'a-penguin': { '*': { l: 1, r: 1, t: 1 }, special: { l: 1 } },
    'a-seal': { '*': { l: 1 }, special: { l: 1, r: 1, t: 1 }, swim: {} },
    'a-arcticfox': { '*': { l: 1, t: 1 }, walk: { l: 1, t: 2 }, special: { l: 1, r: 1, t: 1 }, sleep: { t: 1 } },
    'a-reindeer': { '*': { t: 2 }, look: { t: 2, r: 1 } },
    'a-snowyowl': { special: { l: 2, t: 2 } },
    'a-walrus': { '*': { l: 1 }, special: { l: 1, r: 1 }, swim: {} },
    'a-whale': { idle: { r: 2 }, spout: { t: 1, r: 2 }, swim: { r: 2 }, breach: { t: 2 } },
    'f-char': { '*': { t: 1 } },
    'f-cod': { '*': { t: 1 } },
    'f-salmon': { '*': { l: 1, t: 1 } },
    'f-aurorafish': { '*': { l: 1, r: 1, t: 1, b: 1 } },
    'f-crab': { '*': { t: 1, r: 1 } },
    'f-starfish': { '*': { t: 1 } },
    'p-snowspruce': { '*': { l: 1, r: 1 } },
    'p-snowspruce2': { '*': { l: 1, r: 1 } },
    'p-snowman': { '*': { l: 1, r: 1 } },
    'p-snowdrift': { '*': { l: 1, r: 1, t: 1 } },
    'p-icehole': { '*': { l: 1 } },
    'p-snowrock': { '*': { l: 1, r: 1 } }
};

function padDef(def) {
    const table = PADS[def.name];
    if (!table) return def;
    const anims = {};
    for (const [name, spec] of Object.entries(def.anims)) {
        const frames = Array.isArray(spec) ? spec : spec.frames;
        const w = (!Array.isArray(spec) && spec.w) || def.w;
        const h = (!Array.isArray(spec) && spec.h) || def.h;
        const anchor = (!Array.isArray(spec) && spec.anchor) || def.anchor;
        const { l = 0, r = 0, t = 0, b = 0 } = table[name] || table['*'] || {};
        if (!l && !r && !t && !b) {
            anims[name] = spec;
            continue;
        }
        anims[name] = {
            ...(Array.isArray(spec) ? {} : spec),
            w: w + l + r,
            h: h + t + b,
            anchor: [anchor[0] + l, anchor[1] + t],
            frames: frames.map((paint) => (s, i) => {
                const tmp = new Sprite(w, h);
                paint(tmp, i);
                s.stamp(tmp, l, t);
                for (const [k, [px, py]] of Object.entries(tmp.points)) s.point(k, px + l, py + t);
            })
        };
    }
    return { ...def, anims };
}

const ALL = [polarBearDef, polarCubDef, penguinDef, sealDef, arcticFoxDef, reindeerDef, owlDef, walrusDef, whaleDef, ...fishDefs, ...propDefs];

export default ALL.map((d) => ({ outlineOptions: { skip: fxSkip }, ...padDef(d) }));
