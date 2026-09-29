/*
 * Sköldhästen's rig: pure math, no Pixi and no DOM.
 *
 * The animator turns the engine's state snapshot (SPEC §2) into a pose:
 * a transform for every part of the hero, hoof and shadow placement, eye and
 * mouth states, and the verlet spines of the mane tufts, forelock, tail and
 * kelp fringes. Everything is in the hero's local space: origin at (s.x, s.y),
 * facing right, y down, world units (1 HL = 200 wu). The view mirrors it for
 * facing left.
 *
 *   const an = createAnimator(rigJson, { mini });
 *   an.update(dt, s);     // no allocations
 *   an.pose               // see makePose()
 *
 * Locomotion is a phase machine driven by distance travelled: every leg has a
 * touchdown offset and a duty factor per gait. A leg in stance is locked to
 * the world (its sole never slides); a leg in swing travels in the world from
 * where it lifted to where it will land (leaving and landing at ground speed
 * zero) with the lift and the fore's tuck added in body space. Legs are solved
 * with two-bone IK (carpus bends back, hock bends forward), and a planted hoof
 * rolls on its toe or heel when the leg needs the reach. The body's pitch and
 * height follow the hooves: the support heights under the fore and hind legs
 * give the pitch, and the body sinks (a little) when a planted leg could not
 * reach. Hair and kelp are verlet chains carried by their parent part.
 *
 * update() allocates nothing: state lives in preallocated objects and typed
 * arrays, and the hot paths avoid helper calls with number arguments (V8 boxes
 * those when it does not inline them).
 */

const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth01 = (t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
/** 0 before a, rises to 1 at b, stays until c, falls to 0 at d. */
export const window4 = (t, a, b, c, d) => smooth01((t - a) / (b - a)) * (1 - smooth01((t - c) / (d - c)));
const frac = (x) => x - Math.floor(x);
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const wrapHalf = (d) => d - Math.round(d); // phase difference in -0.5..0.5
/** |(x, y)| without Math.hypot (which boxes its arguments in V8 and allocates every call). */
const len2 = (x, y) => Math.sqrt(x * x + y * y);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const LEG_ORDER = ['hindF', 'foreF', 'hindN', 'foreN'];

/**
 * Gait table. offsets: phase of each leg's touchdown; duty: stance share of the cycle;
 * stride: wu per cycle at the nominal speed v; lift: swing height [fore, hind];
 * bob: body height wave [amplitude, cycles per stride, phase]; pitch/neck likewise (radians);
 * low: extra crouch (wu); lean: neck forward (rad); fold: extra fold of the fore swing.
 */
export const GAITS = {
    walk: {
        v: 320, stride: 190, duty: 0.6, offsets: { hindN: 0, foreN: 0.25, hindF: 0.5, foreF: 0.75 },
        lift: [15, 11], bob: [1.6, 2, 0.1], pitch: [0.012, 2, 0.35], neck: [0.05, 2, 0.05], low: 1, lean: 0.02, fold: 0.2
    },
    trot: {
        v: 640, stride: 270, duty: 0.42, offsets: { hindN: 0, foreF: 0, hindF: 0.5, foreN: 0.5 },
        lift: [27, 19], bob: [3.5, 2, 0.38], pitch: [0.01, 2, 0.1], neck: [0.035, 2, 0.35], low: 2, lean: 0.04, fold: 0.55
    },
    canter: {
        v: 900, stride: 360, duty: 0.33, offsets: { hindF: 0, hindN: 0.2, foreF: 0.22, foreN: 0.42 },
        lift: [34, 24], bob: [5, 1, 0.72], pitch: [0.06, 1, 0.12], neck: [0.1, 1, 0.3], low: 4, lean: 0.1, fold: 0.8
    },
    gallop: {
        v: 1200, stride: 460, duty: 0.27, offsets: { hindF: 0, hindN: 0.12, foreF: 0.34, foreN: 0.46 },
        lift: [50, 30], bob: [7, 1, 0.85], pitch: [0.075, 1, 0.15], neck: [0.13, 1, 0.22], low: 7, lean: 0.26, fold: 1
    }
};
const GAIT_KEYS = ['walk', 'trot', 'canter', 'gallop'];

// ---------------------------------------------------------------------------
// Two-bone IK
// ---------------------------------------------------------------------------
/**
 * Solve a two-bone chain from the root (rx, ry) toward the target (tx, ty).
 * bend = +1 puts the middle joint on the side of (dy, -dx) (for a leg pointing
 * down, toward +x: a carpus that points forward, so the lower leg folds back);
 * bend = -1 the other side (a hock that points back, so the lower leg folds forward).
 * Writes out.mx, out.my (middle joint), out.ex, out.ey (end, clamped to reach) and
 * out.reach (distance / (l1 + l2)).
 */
export function twoBoneIK(rx, ry, tx, ty, l1, l2, bend, out) {
    let dx = tx - rx, dy = ty - ry;
    let d = len2(dx, dy);
    const max = (l1 + l2) * 0.9995, min = Math.abs(l1 - l2) + 1e-3;
    if (d < 1e-6) { dx = 0; dy = 1; d = 1e-6; }
    const ux = dx / d, uy = dy / d;
    out.reach = d / (l1 + l2);
    const dc = d > max ? max : d < min ? min : d;
    // distance along the root->target line to the foot of the middle joint, and its offset
    const a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const px = uy * bend, py = -ux * bend;
    out.mx = rx + ux * a + px * h;
    out.my = ry + uy * a + py * h;
    out.ex = rx + ux * dc;
    out.ey = ry + uy * dc;
    return out;
}

// ---------------------------------------------------------------------------
// Verlet spines (hair, tail, kelp)
// ---------------------------------------------------------------------------
/**
 * A chain of points with a pinned root, bending springs toward the rest shape,
 * gravity or buoyancy, drag toward the moving frame's wind, and ground collision.
 * rest: [[x, y], ...] in the parent's rest frame (body space), root first.
 * stiff: [first free point, tip] = share of the way pulled toward the rest shape
 * per 1/60 s (the first free point toward its carried rest place, the others
 * toward their rest angle relative to the segment before them).
 */
export function createChain(rest, { pinned = 1, stiff = [0.3, 0.05], collide = false, maxTurn = 1.2 } = {}) {
    const n = rest.length;
    const ch = {
        n, pinned, collide, maxTurn,
        restX: new Float64Array(n), restY: new Float64Array(n), len: new Float64Array(n), rel: new Float64Array(n),
        x: new Float64Array(n), y: new Float64Array(n), vx: new Float64Array(n), vy: new Float64Array(n),
        ox: new Float64Array(n), oy: new Float64Array(n), cx: new Float64Array(n), cy: new Float64Array(n),
        tx: new Float64Array(n), ty: new Float64Array(n), k: new Float64Array(n), fresh: true, total: 0, spread: 1
    };
    for (let i = 0; i < n; i++) {
        ch.restX[i] = rest[i][0]; ch.restY[i] = rest[i][1];
        const t = n - 1 > pinned ? Math.max(0, i - pinned) / (n - 1 - pinned) : 0;
        ch.k[i] = stiff[0] + (stiff[1] - stiff[0]) * t;
        if (i > 0) {
            ch.len[i] = len2(rest[i][0] - rest[i - 1][0], rest[i][1] - rest[i - 1][1]);
            ch.total += ch.len[i];
        }
        if (i > 1) {
            const a0 = Math.atan2(rest[i - 1][1] - rest[i - 2][1], rest[i - 1][0] - rest[i - 2][0]);
            const a1 = Math.atan2(rest[i][1] - rest[i - 1][1], rest[i][0] - rest[i - 1][0]);
            let d = a1 - a0;
            while (d > Math.PI) d -= TAU;
            while (d < -Math.PI) d += TAU;
            ch.rel[i] = d;
        }
    }
    return ch;
}

/**
 * Advance a chain. The targets ch.tx/ch.ty must hold the rest shape carried by
 * its parent (local space) before calling. env: { gx, gy (gravity, wu/s²), gyW
 * (buoyancy below the water line), water (local y of the water line; +huge for
 * none), wx, wy (air velocity relative to the frame, wu/s), drag, dragW (1/s, in
 * air and in water), ax, ay (frame acceleration, subtracted), ground (local y or
 * NaN), bend (scale of the springs) }. Integration is position-based with
 * follow-the-leader length constraints and DFTL velocity damping (Müller et al.
 * 2012), so a strand never stretches and never explodes.
 */
export function stepChain(ch, dt, env) {
    const n = ch.n;
    if (ch.fresh) {
        for (let i = 0; i < n; i++) { ch.x[i] = ch.tx[i]; ch.y[i] = ch.ty[i]; ch.vx[i] = 0; ch.vy[i] = 0; }
        ch.fresh = false;
        return;
    }
    if (dt <= 0) return;
    const steps = Math.min(4, Math.max(1, Math.ceil(dt * 60 - 0.01)));
    const h = dt / steps, h60 = h * 60;
    const bend = env.bend === undefined ? 1 : env.bend;
    for (let st = 0; st < steps; st++) {
        for (let i = 0; i < n; i++) {
            ch.ox[i] = ch.x[i]; ch.oy[i] = ch.y[i];
            if (i < ch.pinned) {
                // pinned points follow their carried places (interpolated across substeps)
                ch.x[i] = ch.x[i] + (ch.tx[i] - ch.x[i]) * (1 / (steps - st));
                ch.y[i] = ch.y[i] + (ch.ty[i] - ch.y[i]) * (1 / (steps - st));
                continue;
            }
            // a point below the water line floats and drags in water; above it, gravity and air
            const wet = ch.y[i] > env.water;
            const drag = wet ? env.dragW : env.drag;
            const ax = env.gx - env.ax + (env.wx - ch.vx[i]) * drag;
            const ay = (wet ? env.gyW : env.gy) - env.ay + (env.wy - ch.vy[i]) * drag;
            ch.vx[i] += ax * h; ch.vy[i] += ay * h;
            ch.x[i] += ch.vx[i] * h; ch.y[i] += ch.vy[i] * h;
        }
        // bending springs, root to tip
        for (let i = ch.pinned; i < n; i++) {
            const k = 1 - Math.pow(1 - Math.min(0.95, ch.k[i] * bend), h60);
            let gx, gy;
            if (i === ch.pinned || i < 2) {
                gx = ch.tx[i] - ch.tx[i - 1] + ch.x[i - 1]; gy = ch.ty[i] - ch.ty[i - 1] + ch.y[i - 1];
            } else {
                const a = Math.atan2(ch.y[i - 1] - ch.y[i - 2], ch.x[i - 1] - ch.x[i - 2]) + ch.rel[i];
                gx = ch.x[i - 1] + Math.cos(a) * ch.len[i]; gy = ch.y[i - 1] + Math.sin(a) * ch.len[i];
            }
            ch.x[i] += (gx - ch.x[i]) * k; ch.y[i] += (gy - ch.y[i]) * k;
            // never fold: limit the turn from the previous segment's direction (relative to rest)
            if (i >= 2) {
                const a0 = Math.atan2(ch.y[i - 1] - ch.y[i - 2], ch.x[i - 1] - ch.x[i - 2]);
                let d = Math.atan2(ch.y[i] - ch.y[i - 1], ch.x[i] - ch.x[i - 1]) - a0 - ch.rel[i];
                d -= TAU * Math.round(d / TAU);
                const m = ch.maxTurn;
                if (d > m || d < -m) {
                    const a = a0 + ch.rel[i] + (d > 0 ? m : -m);
                    const L = ch.len[i];
                    ch.x[i] = ch.x[i - 1] + Math.cos(a) * L; ch.y[i] = ch.y[i - 1] + Math.sin(a) * L;
                }
            }
        }
        // length constraints: follow the leader (the child moves), exact in one pass;
        // remember each correction for the DFTL velocity damping (Müller et al. 2012)
        for (let i = Math.max(1, ch.pinned); i < n; i++) {
            const dx = ch.x[i] - ch.x[i - 1], dy = ch.y[i] - ch.y[i - 1];
            const d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
            const k = ch.len[i] / d;
            const nx = ch.x[i - 1] + dx * k, ny = ch.y[i - 1] + dy * k;
            ch.cx[i] = nx - ch.x[i]; ch.cy[i] = ny - ch.y[i];
            ch.x[i] = nx; ch.y[i] = ny;
        }
        if (ch.collide && env.ground === env.ground) {
            // the tip rests and slides on the ground
            const g = env.ground - 1.5;
            for (let i = ch.pinned; i < n; i++) if (ch.y[i] > g) ch.y[i] = g;
        }
        for (let i = ch.pinned; i < n; i++) {
            let vx = (ch.x[i] - ch.ox[i]) / h, vy = (ch.y[i] - ch.oy[i]) / h;
            if (i + 1 < n) { vx -= 0.9 * ch.cx[i + 1] / h; vy -= 0.9 * ch.cy[i + 1] / h; }
            ch.vx[i] = vx; ch.vy[i] = vy;
            if (!(Math.abs(vx) < 8000) || !(Math.abs(vy) < 8000)) { ch.vx[i] = 0; ch.vy[i] = 0; ch.x[i] = ch.tx[i]; ch.y[i] = ch.ty[i]; }
        }
    }
}

// ---------------------------------------------------------------------------
// Transforms: q -> R(r)(q - c) + t
// ---------------------------------------------------------------------------
function makeXf() { return { cx: 0, cy: 0, tx: 0, ty: 0, r: 0, c: 1, s: 0 }; }
// The per-frame transforms take their numbers from fields, never as arguments: a fractional
// double passed to a call V8 did not inline is boxed, and update() must not allocate.
/** The body: turns by an.pitch about its pivot, shifted by (an.bodyOX, an.bodyOY). */
function bodyXf(an) {
    const f = an.body, c = an.rig.body.pivot;
    f.r = an.pitch; f.cx = c[0]; f.cy = c[1]; f.tx = c[0] + an.bodyOX; f.ty = c[1] + an.bodyOY;
    f.c = Math.cos(f.r); f.s = Math.sin(f.r);
}
/** A joint turning by f.r about its rest position c. */
function jointXf(f, c) { f.cx = c[0]; f.cy = c[1]; f.tx = c[0]; f.ty = c[1]; f.c = Math.cos(f.r); f.s = Math.sin(f.r); }
const P = { x: 0, y: 0 };
function apply(f, x, y, out = P) {
    const dx = x - f.cx, dy = y - f.cy;
    out.x = f.tx + dx * f.c - dy * f.s;
    out.y = f.ty + dx * f.s + dy * f.c;
    return out;
}

/** Affine 2×3 matrix of a transform q -> R(r)(q - c) + t, into m. */
function xfToMat(f, m) {
    m[0] = f.c; m[1] = -f.s; m[2] = f.tx - f.c * f.cx + f.s * f.cy;
    m[3] = f.s; m[4] = f.c; m[5] = f.ty - f.s * f.cx - f.c * f.cy;
}
/** Inverse of a rotation+translation matrix. */
function invertRigid(m, out) {
    out[0] = m[0]; out[1] = m[3]; out[2] = -(m[0] * m[2] + m[3] * m[5]);
    out[3] = m[1]; out[4] = m[4]; out[5] = -(m[1] * m[2] + m[4] * m[5]);
}
/** out = A ∘ B (apply B, then A). out may not alias A or B. */
function matMul(out, A, B) {
    out[0] = A[0] * B[0] + A[1] * B[3]; out[1] = A[0] * B[1] + A[1] * B[4]; out[2] = A[0] * B[2] + A[1] * B[5] + A[2];
    out[3] = A[3] * B[0] + A[4] * B[3]; out[4] = A[3] * B[1] + A[4] * B[4]; out[5] = A[3] * B[2] + A[4] * B[5] + A[5];
}
const TMP_A = new Float64Array(6), TMP_B = new Float64Array(6);
/** Body, neck (body∘neck) and head (body∘neck∘head) matrices for this frame. */
function updateMatrices(an) {
    xfToMat(an.body, an.mBody);
    xfToMat(an.neck, TMP_A);
    matMul(an.mNeck, an.mBody, TMP_A);
    xfToMat(an.head, TMP_B);
    matMul(an.mHead, an.mNeck, TMP_B);
}
/** A leg's lower-leg matrix (body∘lower): rest points of the cannon turn about the rest middle joint onto the solved knee. */
function updateLowerMatrix(an, leg) {
    const a = leg.lowerRot, c = Math.cos(a), s = Math.sin(a), m = TMP_A;
    m[0] = c; m[1] = -s; m[2] = leg.kx - c * leg.mx + s * leg.my;
    m[3] = s; m[4] = c; m[5] = leg.ky - s * leg.mx - c * leg.my;
    matMul(leg.mLower, an.mBody, m);
}

// ---------------------------------------------------------------------------
// The animator
// ---------------------------------------------------------------------------
function makePart() { return { x: 0, y: 0, rot: 0, sx: 1, sy: 1, alpha: 1, visible: true }; }

export function createAnimator(rig, { mini = false } = {}) {
    const an = {
        rig, mini,
        time: 0, phase: 0, phaseAcc: 0, swimPhase: 0, lastGroundRevision: -1, gaitW: { wWalk: 0, wTrot: 0, wCanter: 0, wGallop: 0 }, moveW: 0, // (not GAITS' keys: a map shared with GAITS would box these)
        g: { stride: 190, duty: 0.6, liftF: 15, liftH: 11, bobA: 0, bobH: 2, bobP: 0, pitchA: 0, pitchH: 1, pitchP: 0, neckA: 0, neckH: 2, neckP: 0, low: 0, lean: 0, fold: 0 },
        facing: 1, lastX: NaN, lastY: NaN, vx: 0, vy: 0, ax: 0, ay: 0,
        body: makeXf(), neck: makeXf(), head: makeXf(),
        mBody: new Float64Array(6), mBodyInv: new Float64Array(6), mNeck: new Float64Array(6), mHead: new Float64Array(6),
        bodyOY: 0, bodyVY: 0, bodyOX: 0, pitch: 0, pitchV: 0, supPitch: 0,
        neckAng: 0, headAng: 0, wSwim: 0, wHide: 0, wAir: 0, wasAir: false, skidW: 0,
        blinkT: 1.5, blinkPhase: -1, eye: 0, mouth: 0,
        shiftT: 3, shift: 0, shiftTarget: 0, swishT: 1.7, twitchT: 1.1, kickTail: 0, kickForelock: 0,
        settleCool: 0, wet: 0,
        legs: [], chains: [], legIndex: {},
        f: { dt: 0, x: 0, y: 0, mode: 'ground', time: 0, first: true, jumped: true, facing: 1, fvx: 0, fvy: 0, speed: 0, vLocal: 0,
            hideT: 0, inAir: false, groundChanged: false, wGround: 1, groundW: 1, act: null, aT: 0, airT: 0, emote: null, gaitName: 'stand', moving: false },
        tg: { oy: 0, ox: 0, pitch: 0, neck: 0, head: 0, mouth: 0, foreLift: 0, hindKick: 0, stampLift: 0, rearW: 0 },
        hindGround: 0, tailLift: 0, lastMode: 'ground', gsQ: 0, gsX: new Float64Array(16), gsY: new Float64Array(16), gsN: 0, gsI: 0, waterLine: 1e9, wadeLow: 0, wadeMid: 0, wadeHigh: 0,
        ctx: { x: 0, y: 0, facing: 1, liftF: 0, liftH: 0, wGround: 1, wSwim: 0, wAir: 0, wHide: 0, airT: 0, time: 0, hindKick: 0, foreLift: 0, stampLift: 0, rearW: 0, act: null, aT: 0, g: null, fvx: 0, fvy: 0 },
        acc: { w: 0.5, stride: 0, duty: 0, liftF: 0, liftH: 0, bobA: 0, bobH: 0, bobP: 0, pitchA: 0, pitchH: 0, pitchP: 0, neckA: 0, neckH: 0, neckP: 0, low: 0, lean: 0, fold: 0 },
        pose: null
    };
    // legs
    for (const name of LEG_ORDER) {
        const L = rig.legs[name];
        const leg = {
            name, front: L.front, near: L.near, bend: L.bend,
            rx: L.root[0], ry: L.root[1], mx: L.mid[0], my: L.mid[1], ex: L.end[0], ey: L.end[1],
            l1: L.l1 * 1.004, l2: L.l2 * 1.004, sole: L.sole,
            upA: Math.atan2(L.mid[1] - L.root[1], L.mid[0] - L.root[0]),
            loA: Math.atan2(L.end[1] - L.mid[1], L.end[0] - L.mid[0]),
            // state (world space for locks and swing ends)
            pvLx: 0, pvLy: 0, pvA: 0, pvR: 0.5, pvX: 0, pvY: 0, pvOutA: 0, ikTx: 0, ikTy: 0, reach: 1, lifted: 0, fromWX: 0, fromWY: 0,
            gLock: { q: 0, x: 0, y: 0, a: 0, edge: 0, ok: false }, gTarget: { q: 0, x: 0, y: 0, a: 0, edge: 0, ok: false }, mLower: new Float64Array(6),
            stance: true, lockX: 0, lockY: 0, u: 1, timeSwing: false, swingDur: 0.25, stAcc0: 0, swAcc0: 0, swSpan: 1, targetWX: 0, toSupport: 0,
            // outputs (body space, except the sole, which is local)
            soleX: 0, soleY: 0, kx: 0, ky: 0, hx: 0, hy: 0, upperRot: 0, lowerRot: 0, hoofRot: 0,
            fringe: null, p0: -1,
            offset: GAITS.walk.offsets[name] + 0.0001,
            offW: GAITS.walk.offsets[name] + 0.0001, offT: GAITS.trot.offsets[name] + 0.0001,
            offC: GAITS.canter.offsets[name] + 0.0001, offG: GAITS.gallop.offsets[name] + 0.0001
        };
        an.legIndex[name] = an.legs.length;
        an.legs.push(leg);
    }
    // chains
    const addChain = (def, group, idx, opts) => {
        const ch = createChain(def.rest, opts);
        ch.group = group; ch.idx = idx; ch.parent = def.parent; ch.width = def.width; ch.texture = def.texture;
        ch.spread = 1;
        an.chains.push(ch);
        return ch;
    };
    if (!mini) {
        rig.mane.forEach((m, i) => addChain(m, 'mane', i, { stiff: [0.55, 0.16], maxTurn: 0.9 }));
        rig.forelock.forEach((m, i) => addChain(m, 'forelock', i, { stiff: [0.45, 0.12], maxTurn: 0.9 }));
        addChain(rig.tail, 'tail', 0, { stiff: [0.24, 0.025], collide: true, maxTurn: 0.75 });
        for (const leg of an.legs) {
            const L = rig.legs[leg.name];
            leg.fringe = addChain(L.fringeStrip, 'fringe', an.legIndex[leg.name], { pinned: L.fringeStrip.pinned || 2, stiff: [0.35, 0.25], maxTurn: 0.55 });
        }
    } else {
        // mini: fewer tufts and no physics (the spines just follow their parents with a sway)
        [1, 2, 4].forEach((i) => addChain(rig.mane[i], 'mane', i, {}));
        addChain(rig.forelock[1], 'forelock', 1, {});
        addChain(rig.tail, 'tail', 0, { collide: true });
        for (const leg of an.legs) leg.fringe = addChain(rig.legs[leg.name].fringeStrip, 'fringe', an.legIndex[leg.name], { pinned: 2 });
    }
    for (const ch of an.chains) {
        ch.mat = ch.parent === 'neck' ? an.mNeck : ch.parent === 'head' ? an.mHead : ch.parent === 'body' ? an.mBody
            : an.legs[an.legIndex[ch.parent]].mLower;
    }
    an.pose = makePose(an);
    an.update = (dt, s) => update(an, dt, s);
    an.reset = () => { an.lastX = NaN; };
    primeDoubles(an, rig, new Set());
    return an;
}

/**
 * V8 picks each field's number format from the first values stored in it: a field that starts
 * as a small integer (0, 1) and later gets fractions changes its object's map in the middle of
 * play, and the per-frame stores that saw several maps go megamorphic and box every number they
 * write. Writing a fraction into every number field once, here, settles the maps before update()
 * runs, so it can run without allocating.
 */
function primeDoubles(o, skip, seen) {
    if (!o || typeof o !== 'object' || o === skip || seen.has(o) || ArrayBuffer.isView(o)) return;
    seen.add(o);
    if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) primeDoubles(o[i], skip, seen); return; }
    for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === 'number') { o[k] = 0.5; o[k] = v; } else primeDoubles(v, skip, seen);
    }
}

function makePose(an) {
    const parts = {};
    for (const k of ['body', 'torso', 'shell', 'neck', 'head', 'eye', 'mouth']) parts[k] = makePart();
    for (const leg of an.legs) {
        leg.pUpper = parts[`${leg.name}.upper`] = makePart();
        leg.pLower = parts[`${leg.name}.lower`] = makePart();
        leg.pHoof = parts[`${leg.name}.hoof`] = makePart();
        leg.pShadow = parts[`${leg.name}.shadow`] = makePart();
    }
    return {
        parts, eye: 0, mouth: 0, mouthOpen: false, wet: 0, tint: 0xffffff,
        shadow: { x: 0, y: 0, w: 1, alpha: 0 }, chains: an.chains, legs: an.legs,
        bodyX: 0, bodyY: 0, pitch: 0, neck: 0, head: 0
    };
}

// scratch
const Q = { x: 0, y: 0 };
const Q2 = { x: 0, y: 0, a: 0 };

function update(an, dtIn, s) {
    const f = an.f;
    frameMotion(an, s, dtIn);
    gaitPhase(an, s);
    poseTargets(an, s);
    if (f.jumped) replant(an, s);
    else if (f.groundChanged) {
        // Flags can grow a ramp under a stationary foot: its cached height is no longer valid.
        for (const leg of an.legs) {
            leg.gLock.ok = false; leg.gTarget.ok = false;
            if (leg.stance && f.mode === 'ground') {
                leg.gLock.q = leg.lockX;
                leg.lockY = groundCached(an, s, leg.gLock).y;
            }
        }
    }
    bodyFromSupports(an, s);
    legPhases(an, s);
    bodyHeight(an, s);
    const C = an.ctx;
    C.x = f.x; C.y = f.y; C.facing = f.facing; C.liftF = an.g.liftF; C.liftH = an.g.liftH; C.wGround = f.wGround; C.wSwim = an.wSwim;
    C.wAir = an.wAir; C.wHide = an.wHide; C.airT = f.airT; C.time = f.time; C.hindKick = an.tg.hindKick; C.foreLift = an.tg.foreLift;
    C.stampLift = an.tg.stampLift; C.rearW = an.tg.rearW; C.act = f.act; C.aT = f.aT; C.g = an.g; C.fvx = f.fvx; C.fvy = f.fvy;
    for (let li = 0; li < 4; li++) solveLeg(an, an.legs[li], s, C);
    headAndEyes(an);
    writePose(an, s);
    stepChains(an, f.dt, s, C);
    sanity(an);
    return an.pose;
}

/** Should anything ever run away (a NaN from the engine, a numerical blow-up), start over next frame. */
function sanity(an) {
    const b = an.bodyOY, p = an.pitch;
    let ok = b > -1500 && b < 1500 && p > -6 && p < 6;
    for (let ci = 0; ci < an.chains.length; ci++) {
        const ch = an.chains[ci], i = ch.n - 1;
        const dx = ch.x[i] - ch.x[0], dy = ch.y[i] - ch.y[0];
        if (!(dx * dx + dy * dy < 9 * ch.total * ch.total + 1)) { ch.fresh = true; ok = false; }
    }
    if (!ok) { an.lastX = NaN; an.bodyOY = 0; an.bodyVY = 0; an.pitch = 0; an.pitchV = 0; }
}

/** Frame motion (local), teleports, facing flips and the mode weights. */
function frameMotion(an, s, dtIn) {
    const f = an.f;
    const dt = dtIn > 0 ? (dtIn < 0.1 ? dtIn : 0.1) : 0;
    const x = s.x || 0, y = s.y || 0;
    const facing = s.facing === -1 ? -1 : 1;
    const mode = s.mode || 'ground';
    f.dt = dt; f.x = x; f.y = y; f.mode = mode;
    f.groundChanged = s.terrainRevision !== undefined && s.terrainRevision !== an.lastGroundRevision;
    if (s.terrainRevision !== undefined) an.lastGroundRevision = s.terrainRevision;
    f.time = s.time !== undefined ? s.time : an.time + dt;
    an.time = f.time;
    // the first frame, or a teleport (a scene change, a checkpoint): everything snaps to its
    // target instead of springing there, and the hooves are planted afresh
    const first = an.lastX !== an.lastX || Math.abs(x - an.lastX) > 400 || Math.abs(y - an.lastY) > 400
        || (f.groundChanged && mode === 'ground' && an.lastMode === 'ground' && Math.abs(y - an.lastY) > 52);
    f.first = first;
    f.jumped = first;
    if (!f.jumped && facing !== an.facing) {
        // mirror world locks about the hero so planted hooves keep their local places
        for (let li = 0; li < 4; li++) an.legs[li].lockX = x - (an.legs[li].lockX - x);
    }
    an.facing = facing; f.facing = facing;
    // on the ground the origin can jump (a lip, a step): keep the body and the hair where
    // they are in the world and let the springs carry them to the new height
    if (!f.jumped && mode === 'ground' && an.lastMode === 'ground') {
        const dy = y - an.lastY;
        if (dy !== 0) {
            an.bodyOY -= dy;
            for (let ci = 0; ci < an.chains.length; ci++) {
                const ch = an.chains[ci];
                for (let i = 0; i < ch.n; i++) ch.y[i] -= dy;
            }
        }
    }
    an.lastMode = mode;
    let fvx = 0, fvy = 0;
    if (!f.jumped && dt > 0) { fvx = (x - an.lastX) / dt; fvy = (y - an.lastY) / dt; }
    if (f.jumped) { an.ax = 0; an.ay = 0; }
    if (s.vx !== undefined) fvx = s.vx;
    if (s.vy !== undefined) fvy = s.vy;
    const nvx = fvx * facing; // along facing
    if (dt > 0 && !f.jumped) {
        const k = 1 - Math.exp(-12 * dt);
        let axT = (nvx - an.vx) / dt, ayT = (fvy - an.vy) / dt;
        axT = axT < -3000 ? -3000 : axT > 3000 ? 3000 : axT;
        ayT = ayT < -3000 ? -3000 : ayT > 3000 ? 3000 : ayT;
        an.ax += (axT - an.ax) * k; an.ay += (ayT - an.ay) * k;
    }
    an.vx = nvx; an.vy = fvy;
    an.lastX = x; an.lastY = y;
    f.fvx = fvx; f.fvy = fvy;
    f.speed = s.speed !== undefined ? Math.abs(s.speed) : Math.abs(nvx);
    f.vLocal = s.vx !== undefined ? nvx : (s.speed !== undefined ? s.speed : nvx);
    // mode weights
    const swimT = mode === 'swim' ? 1 : 0;
    an.wSwim = first ? swimT : an.wSwim + (swimT - an.wSwim) * (1 - Math.exp(-7 * dt));
    let hideT = s.hide || 0;
    hideT = hideT < 0 ? 0 : hideT > 1 ? 1 : hideT;
    f.hideT = hideT;
    an.wHide = first ? hideT : an.wHide + (hideT - an.wHide) * (1 - Math.exp(-18 * dt));
    const inAir = mode === 'air';
    f.inAir = inAir;
    const airW = inAir ? 1 : 0;
    an.wAir = first ? airW : an.wAir + (airW - an.wAir) * (1 - Math.exp(-(inAir ? 14 : 10) * dt));
    f.wGround = (1 - an.wSwim) * (1 - an.wAir);
    f.groundW = f.wGround * (1 - an.wHide);
    an.wet = s.wet || 0;
    f.act = s.action || null;
    let aT = s.actionT || 0, airT = s.airT || 0;
    f.aT = aT < 0 ? 0 : aT > 1 ? 1 : aT;
    f.airT = airT < 0 ? 0 : airT > 1 ? 1 : airT;
    f.emote = s.emote || null;
}

/** Gait weights, blended parameters and the distance-driven phase. */
function gaitPhase(an, s) {
    const f = an.f, dt = f.dt;
    const gaitName = s.gait || 'stand';
    f.gaitName = gaitName;
    const moving = (gaitName === 'walk' || gaitName === 'trot' || gaitName === 'canter' || gaitName === 'gallop') && f.mode === 'ground' && f.hideT < 0.5 && f.speed > 4;
    f.moving = moving;
    const skid = gaitName === 'skid' && f.mode === 'ground';
    an.skidW += ((skid ? 1 : 0) - an.skidW) * (1 - Math.exp(-(skid ? 16 : 6) * dt));
    const k9 = f.first ? 1 : 1 - Math.exp(-9 * dt);
    const gw = an.gaitW;
    gw.wWalk += ((moving && gaitName === 'walk' ? 1 : 0) - gw.wWalk) * k9;
    gw.wTrot += ((moving && gaitName === 'trot' ? 1 : 0) - gw.wTrot) * k9;
    gw.wCanter += ((moving && gaitName === 'canter' ? 1 : 0) - gw.wCanter) * k9;
    gw.wGallop += ((moving && gaitName === 'gallop' ? 1 : 0) - gw.wGallop) * k9;
    const mT = moving ? 1 : 0;
    an.moveW = f.first ? mT : an.moveW + (mT - an.moveW) * (1 - Math.exp(-(moving ? 10 : 5) * dt));
    blendGait(an);
    if (moving) {
        const dph = typeof s.gaitPhase === 'number' ? frac(s.gaitPhase - an.phase) : Math.abs(f.vLocal * dt) / an.g.stride;
        // The fixed-step phase drives both hoof beats and legs; dev previews integrate locally.
        const advance = dph < 0.5 ? dph : 0;
        an.phase = typeof s.gaitPhase === 'number' ? s.gaitPhase : frac(an.phase + advance);
        an.phaseAcc += advance;
    }
    if (f.mode === 'swim') {
        an.swimPhase = typeof s.gaitPhase === 'number' ? s.gaitPhase
            : frac(an.swimPhase + (0.65 + Math.min(1, len2(an.vx, an.vy) / 520) * 0.95) * dt);
    }
}

/** What the body, neck and head want this frame: gait waves, idle, actions, look-at, emotes, modes. */
function poseTargets(an, s) {
    const f = an.f, g = an.g, tg = an.tg, dt = f.dt, time = f.time, ph = an.phase, act = f.act, aT = f.aT;
    const wSwim = an.wSwim, wHide = an.wHide, wAir = an.wAir, wGround = f.wGround;
    // idle: breathing, weight shift, a tail swish, a forelock twitch
    const idleW = (1 - an.moveW) * wGround * (1 - wHide) * (act ? 0.4 : 1);
    an.kickTail = 0; an.kickForelock = 0;
    if (!an.mini) {
        an.shiftT -= dt;
        if (an.shiftT <= 0) {
            an.shiftT = 4 + hash(Math.floor(time * 7.3)) * 5;
            an.shiftTarget = an.shiftTarget ? 0 : (hash(time) > 0.5 ? 1 : -1);
        }
        an.shift += (an.shiftTarget * idleW - an.shift) * (1 - Math.exp(-1.8 * dt));
        an.swishT -= dt; an.twitchT -= dt;
        if (an.swishT <= 0) { an.swishT = 2.5 + hash(Math.floor(time * 5.1) + 3) * 4.5; an.kickTail = idleW * (hash(time * 1.7) > 0.5 ? 1 : -1); }
        if (an.twitchT <= 0) { an.twitchT = 1.8 + hash(Math.floor(time * 3.7) + 9) * 3.5; an.kickForelock = idleW; }
    }
    const breath = Math.sin(time * TAU * 0.28);
    // gait waves
    const bobW = an.moveW * wGround;
    let oy = (g.bobA * -Math.cos(TAU * (g.bobH * ph - g.bobP)) + g.low) * bobW + breath * 0.5 * idleW;
    let pitchT = g.pitchA * Math.sin(TAU * (g.pitchH * ph - g.pitchP)) * bobW;
    let ox = an.shift * 2.2;
    let neckT = (g.neckA * Math.sin(TAU * (g.neckH * ph - g.neckP)) + g.lean) * an.moveW * wGround + breath * 0.012 * idleW;
    let headT = -g.lean * 0.5 * an.moveW * wGround;
    let mouthT = 0;
    // skid: haunches down, fores braced
    const sk = an.skidW;
    pitchT -= 0.13 * sk; ox -= 10 * sk; oy += 11 * sk; neckT -= 0.2 * sk; headT -= 0.12 * sk;
    // actions
    let foreLift = 0, hindKick = 0, stampLift = 0, rearW = 0;
    if (act === 'balk') {
        const w = window4(aT, 0, 0.18, 0.85, 1);
        ox -= 7 * w; pitchT -= 0.035 * w; oy += 2 * w;
        const look = window4(aT, 0.1, 0.3, 0.6, 0.75);
        neckT += 0.34 * look; headT += 0.42 * look;
        const snort = window4(aT, 0.62, 0.68, 0.72, 0.84);
        neckT -= 0.16 * snort; headT -= 0.12 * snort; if (snort * 0.6 > mouthT) mouthT = snort * 0.6;
    } else if (act === 'buck') {
        const gather = window4(aT, 0, 0.15, 0.2, 0.32);
        const kick = window4(aT, 0.18, 0.36, 0.5, 0.72);
        oy += 4 * gather - 3 * kick; pitchT += -0.03 * gather + 0.2 * kick;
        neckT += 0.28 * kick - 0.08 * gather; headT += 0.2 * kick;
        hindKick = kick;
    } else if (act === 'leap') {
        // a leap asked for as an action while still on the ground: crouch, then spring
        oy += 6 * window4(aT, 0, 0.3, 0.5, 0.8);
    } else if (act === 'neigh') {
        const w = window4(aT, 0, 0.2, 0.78, 1);
        neckT -= 0.36 * w; headT += -0.34 * w + Math.sin(time * 38) * 0.03 * window4(aT, 0.25, 0.3, 0.7, 0.78);
        const mo = window4(aT, 0.14, 0.22, 0.74, 0.84);
        if (mo > mouthT) mouthT = mo;
        pitchT -= 0.03 * w; oy -= 2 * w;
    } else if (act === 'rear-small') {
        const w = window4(aT, 0, 0.3, 0.65, 1);
        rearW = w; pitchT -= 0.2 * w; neckT -= 0.22 * w; headT += 0.1 * w;
        foreLift = w;
    } else if (act === 'shake') {
        const w = window4(aT, 0, 0.12, 0.8, 1);
        const fr = time * TAU * 7.5;
        pitchT += 0.06 * Math.sin(fr) * w; oy += 2.5 * Math.sin(fr * 2) * w; ox += 2 * Math.sin(fr + 1) * w;
        neckT += 0.22 * Math.sin(fr + 1.1) * w; headT += 0.3 * Math.sin(fr + 2.1) * w;
    } else if (act === 'stamp') {
        stampLift = window4(aT, 0.05, 0.35, 0.45, 0.55);
        const w = window4(aT, 0, 0.3, 0.6, 1);
        neckT += 0.1 * w; headT += 0.08 * w;
    } else if (act === 'talk') {
        const w = aT === 0 ? 1 : window4(aT, 0, 0.08, 0.92, 1);
        neckT += (0.035 * Math.sin(time * TAU * 1.7) + 0.02 * Math.sin(time * TAU * 3.1)) * w;
        headT += (0.05 * Math.sin(time * TAU * 2.3 + 1)) * w;
        const syll = Math.sin(time * TAU * 4.2) + 0.6 * Math.sin(time * TAU * 2.9 + 2);
        const mo = (syll > 0.55 ? 0.45 : 0) * w;
        if (mo > mouthT) mouthT = mo;
    } else if (act === 'nod') {
        const w = Math.sin(aT * Math.PI * 2);
        neckT += 0.16 * (w > 0 ? w : 0) + 0.06 * (w < 0 ? -w : 0); headT += 0.22 * (w > 0 ? w : 0);
    } else if (act === 'lookdown') {
        const w = aT === 0 ? 1 : window4(aT, 0, 0.25, 0.8, 1);
        neckT += 0.36 * w; headT += 0.46 * w;
    }
    // look at: head (and a little neck) toward a world point
    if (s.lookAt && wHide < 0.5) {
        const J = an.rig.joints;
        const hx = J.head[0] + 20, hy = J.head[1];
        const lx = (s.lookAt.x - f.x) * f.facing, ly = s.lookAt.y - f.y;
        let want = Math.atan2(ly - hy, Math.abs(lx - hx) + 1) - 0.35;
        want = (want < -0.5 ? -0.5 : want > 0.6 ? 0.6 : want) * (lx - hx < -40 ? 0.3 : 1);
        headT += want * 0.6; neckT += want * 0.35;
    }
    // emotes: eyes and head only
    const emote = f.emote;
    if (emote === 'sad') { neckT += 0.18; headT += 0.2; }
    else if (emote === 'happy') { neckT -= 0.06; headT -= 0.08; }
    else if (emote === 'surprised') { neckT -= 0.14; headT -= 0.1; }
    else if (emote === 'sleepy') { neckT += 0.12; headT += 0.16; }
    // swimming: level, tilted with vy; the head stays up
    if (wSwim > 0.001) {
        let tilt = Math.atan2(f.fvy, Math.abs(f.fvx) + 120) * 0.9;
        tilt = tilt < -0.52 ? -0.52 : tilt > 0.52 ? 0.52 : tilt;
        const depth = typeof s.waterY === 'number' ? f.y - s.waterY : 300;
        const surface = 1 - smooth01((depth - 150) / 100);
        const dive = smooth01((f.fvy - 60) / 220);
        tilt = tilt * (1 - surface * 0.55) - surface * 0.055;
        pitchT += (tilt - pitchT) * wSwim;
        const stroke = Math.sin(an.swimPhase * TAU * 2);
        oy += (Math.sin(time * TAU * 0.45) * (1.5 + surface) + stroke * 0.8 - oy) * wSwim;
        neckT += (-0.1 - surface * 0.12 - tilt * 0.65 + dive * 0.16 - neckT) * wSwim;
        headT += (-0.03 - tilt * 0.35 + dive * 0.06 - headT) * wSwim;
    }
    // air: pitch from vy, stretched
    if (wAir > 0.001) {
        let tilt = Math.atan2(f.fvy, Math.abs(f.fvx) + 200) * 0.7;
        tilt = tilt < -0.35 ? -0.35 : tilt > 0.4 ? 0.4 : tilt;
        const stretch = window4(f.airT, 0.05, 0.25, 0.6, 0.9);
        pitchT += (tilt - pitchT) * wAir;
        neckT += (0.08 + 0.1 * stretch - tilt * 0.4 - neckT) * wAir;
        headT += (-0.05 - tilt * 0.3 - headT) * wAir;
        oy += (-4 * stretch - oy) * wAir;
    }
    // hide: lie down under the shell
    if (wHide > 0.001) {
        const w = wHide * wHide * (3 - 2 * wHide);
        oy += (84 - oy) * w;
        pitchT += (0.035 - pitchT) * w;
        ox -= ox * w;
        neckT += (0.95 - neckT) * w;
        headT += (-0.45 - headT) * w;
    }
    tg.oy = oy; tg.ox = ox; tg.pitch = pitchT; tg.neck = neckT; tg.head = headT; tg.mouth = mouthT;
    tg.foreLift = foreLift; tg.hindKick = hindKick; tg.stampLift = stampLift; tg.rearW = rearW;
}

/** Pitch and height from where the hooves stand (ground only), then the body springs. */
function bodyFromSupports(an, s) {
    const f = an.f, tg = an.tg, dt = f.dt, y = f.y, rig = an.rig;
    let fY = 0, hY = 0;
    for (let li = 0; li < 4; li++) {
        const leg = an.legs[li];
        const sy = leg.stance ? leg.lockY - y : leg.toSupport;
        if (leg.front) fY += sy; else hY += sy;
    }
    fY *= 0.5; hY *= 0.5;
    an.hindGround = f.mode === 'swim' ? NaN : hY;
    const span = (rig.legs.foreN.end[0] - rig.legs.hindN.end[0]) || 90;
    const groundW = f.groundW;
    const supPitchT = Math.atan2(fY - hY, span) * groundW;
    an.supPitch = f.first ? supPitchT : an.supPitch + (supPitchT - an.supPitch) * (1 - Math.exp(-10 * dt));
    const sp = an.supPitch < -0.45 ? -0.45 : an.supPitch > 0.45 ? 0.45 : an.supPitch;
    tg.pitch += sp;
    // the body follows the hooves' ground, but never far: a hoof reaching past an edge must not drag it down
    const sup = (fY + hY) * 0.5;
    tg.oy += (sup < -70 ? -70 : sup > 70 ? 70 : sup) * groundW;
    // landing absorb: a dip when the air mode ends
    if (an.wasAir && !f.inAir) an.bodyVY += 260;
    an.wasAir = f.inAir;
    if (f.first) { an.pitch = tg.pitch; an.pitchV = 0; an.bodyOY = tg.oy; an.bodyVY = 0; an.bodyOX = tg.ox; }
    else {
        // a stiff spring: integrated in steps of at most 1/120 s, or a slow frame would blow it up
        const kp = 420, cp = 2 * Math.sqrt(kp) * 0.9, n = Math.ceil(dt * 120), h = n > 0 ? dt / n : 0;
        for (let i = 0; i < n; i++) {
            an.pitchV += ((tg.pitch - an.pitch) * kp - an.pitchV * cp) * h;
            an.pitch += an.pitchV * h;
        }
        an.bodyOX += (tg.ox - an.bodyOX) * (1 - Math.exp(-14 * dt));
    }
    // provisional body transform (height is finalized after the reach check)
    bodyXf(an);
}

/** First frame or teleport: every hoof planted under the body, the hair at rest, the ground memory cleared. */
function replant(an, s) {
    const f = an.f, x = f.x, facing = f.facing;
    an.bodyOX = an.tg.ox;
    an.gsN = 0; an.gsI = 0;
    for (let i = 0; i < 4; i++) {
        const leg = an.legs[i];
        leg.stance = true; leg.timeSwing = false; leg.u = 1; leg.stAcc0 = an.phaseAcc;
        leg.lockX = x + (leg.ex + an.bodyOX) * facing;
        leg.gLock.ok = false; leg.gTarget.ok = false;
        leg.gLock.q = leg.lockX;
        leg.lockY = groundCached(an, s, leg.gLock).y;
        leg.toSupport = leg.lockY - f.y;
        pushGround(an, leg);
    }
    for (let ci = 0; ci < an.chains.length; ci++) an.chains[ci].fresh = true;
}

/** The leg state machine: stance locks, lifts on the beat or when overreaching, swings, settling steps. */
function legPhases(an, s) {
    const f = an.f, g = an.g, dt = f.dt, x = f.x, y = f.y, facing = f.facing, mode = f.mode;
    const sweep = g.duty * g.stride, ph = an.phase, moving = f.moving;
    an.settleCool -= dt;
    let swinging = 0;
    for (let li = 0; li < 4; li++) if (!an.legs[li].stance) swinging++;
    for (let i = 0; i < 4; i++) {
        const leg = an.legs[i];
        const restSoleX = leg.ex;
        const fwd = leg.front ? 0.52 : 0.4; // share of the stance sweep ahead of the rest place
        if (f.jumped) continue; // planted by replant()
        if (mode === 'air' || mode === 'swim') {
            // off the ground the hooves are free; keep each lock under its hoof for the landing
            leg.stance = true; leg.timeSwing = false; leg.u = 1;
            leg.lockX = x + leg.soleX * facing;
            leg.lockY = mode === 'swim' ? y : (leg.gLock.q = leg.lockX, groundCached(an, s, leg.gLock)).y;
            leg.stAcc0 = an.phaseAcc;
            continue;
        }
        const p = frac(ph - leg.offset);
        if (moving) {
            if (leg.stance) {
                const lx = (leg.lockX - x) * facing;
                const since = an.phaseAcc - leg.stAcc0;
                const behind = lx < restSoleX + an.bodyOX - sweep * (1 - fwd) - 12;
                if ((p >= g.duty && since > g.duty * 0.45) || behind) {
                    // lift: on the beat, or early when the hoof has fallen too far behind
                    startSwing(an, leg, s, false);
                    const onBeat = p >= g.duty;
                    leg.swSpan = onBeat ? 1 - g.duty : (1 - p > 0.15 ? 1 - p : 0.15);
                    leg.swAcc0 = an.phaseAcc - (onBeat ? p - g.duty : 0);
                    swinging++;
                }
            } else if (leg.timeSwing) {
                // a settle step still going when we start moving: finish it on the phase
                leg.timeSwing = false;
                const r = 1 - p > 0.1 ? 1 - p : 0.1;
                leg.swSpan = r / (1 - leg.u > 0.05 ? 1 - leg.u : 0.05);
                leg.swAcc0 = an.phaseAcc - leg.u * leg.swSpan;
            }
            if (!leg.stance) {
                let u = (an.phaseAcc - leg.swAcc0) / (leg.swSpan > 0.02 ? leg.swSpan : 0.02);
                leg.u = u < 0 ? 0 : u > 1 ? 1 : u;
                // predicted landing (world): body travel until touchdown + the reach ahead
                const remain = (1 - leg.u) * leg.swSpan;
                leg.targetWX = x + (restSoleX + an.bodyOX + sweep * fwd + remain * g.stride) * facing;
                // step clear over a lip rather than onto its edge
                leg.gTarget.q = leg.targetWX;
                if (groundCached(an, s, leg.gTarget).edge) leg.targetWX += 11 * facing;
            }
        } else if (!leg.stance) {
            // settle: a time-driven step to the rest place
            if (!leg.timeSwing) { leg.timeSwing = true; leg.swingDur = 0.22; }
            const u = leg.u + dt / leg.swingDur;
            leg.u = u < 1 ? u : 1;
            leg.targetWX = x + (restSoleX + an.bodyOX) * facing;
        } else if (f.groundW > 0.5 && an.wHide < 0.05 && an.skidW < 0.1 && !f.act && swinging === 0 && an.settleCool <= 0) {
            // standing: step if this hoof is far from its rest place
            const lx = (leg.lockX - x) * facing;
            const err = Math.abs(lx - (restSoleX + an.bodyOX));
            if (err > 16 && err >= worstErr(an)) {
                startSwing(an, leg, s, true);
                leg.targetWX = x + (restSoleX + an.bodyOX) * facing;
                an.settleCool = 0.12;
                swinging++;
            }
        }
        // touchdown
        if (!leg.stance && leg.u >= 1) {
            leg.stance = true;
            leg.timeSwing = false;
            leg.lockX = leg.targetWX;
            leg.gLock.ok = false;
            leg.lockY = (leg.gLock.q = leg.lockX, groundCached(an, s, leg.gLock)).y;
            leg.stAcc0 = an.phaseAcc;
            pushGround(an, leg);
        }
        if (!leg.stance) leg.toSupport = (leg.gTarget.q = leg.targetWX, groundCached(an, s, leg.gTarget)).y - y;
    }
    // skid: planted hooves slide with the body
    if (an.skidW > 0.01) {
        let k = an.skidW * dt * 14;
        k = k > 1 ? 1 : k;
        for (let li = 0; li < 4; li++) {
            const leg = an.legs[li];
            if (!leg.stance) continue;
            const want = x + (leg.ex + (leg.front ? 30 : 12) + an.bodyOX) * facing;
            leg.lockX += (want - leg.lockX) * k;
            leg.lockY = (leg.gLock.q = leg.lockX, groundCached(an, s, leg.gLock)).y;
        }
    }
}

/** Final body height: sink (a little) when a planted leg could not reach; then the body matrices. */
function bodyHeight(an, s) {
    const f = an.f, tg = an.tg, dt = f.dt, x = f.x, y = f.y, facing = f.facing, groundW = f.groundW;
    const b = an.body;
    let need = -1e9;
    if (groundW > 0.01) {
        for (let li = 0; li < 4; li++) {
            const leg = an.legs[li];
            if (!leg.stance) continue;
            if (tg.hindKick > 0.2 && !leg.front) continue;
            if ((tg.foreLift > 0.2 || tg.stampLift > 0.2) && leg.front && (tg.foreLift > 0.2 || leg.near)) continue;
            const lx = (leg.lockX - x) * facing, ly = leg.lockY - y - leg.sole;
            // the root at the current pitch without the height offset
            const rdx = leg.rx - b.cx, rdy = leg.ry - b.cy;
            const rx0 = b.tx + rdx * b.c - rdy * b.s;
            const ry0 = b.ty + rdx * b.s + rdy * b.c - an.bodyOY;
            const dx = lx - rx0;
            const Lm = (leg.l1 + leg.l2) * 0.985 + 6; // a planted hoof can roll on its toe or heel
            const rr = Lm * Lm - dx * dx;
            const needOY = ly - ry0 - (rr > 0 ? Math.sqrt(rr) : 0);
            if (needOY > need) need = needOY;
        }
    }
    let targetOY = tg.oy;
    if (need > tg.oy + 22) need = tg.oy + 22; // never sink more than this; a leg that still cannot reach steps
    if (need > targetOY) targetOY += (need - targetOY) * groundW;
    if (f.first) { an.bodyOY = targetOY; an.bodyVY = 0; }
    else {
        const k = 900, c = 2 * Math.sqrt(k) * 0.85, n = Math.ceil(dt * 120), h = n > 0 ? dt / n : 0;
        for (let i = 0; i < n; i++) {
            an.bodyVY += ((targetOY - an.bodyOY) * k - an.bodyVY * c) * h;
            an.bodyOY += an.bodyVY * h;
        }
        // never let a planted leg hang: hard limit
        if (need > an.bodyOY && groundW > 0.5) an.bodyOY += (need - an.bodyOY) * 0.7;
    }
    bodyXf(an);
    xfToMat(an.body, an.mBody);
    invertRigid(an.mBody, an.mBodyInv);
}

/** Neck and head angles, their matrices, blinking and the mouth. */
function headAndEyes(an) {
    const f = an.f, tg = an.tg, dt = f.dt, J = an.rig.joints;
    if (f.first) { an.neckAng = tg.neck; an.headAng = tg.head; }
    else {
        an.neckAng += (tg.neck - an.neckAng) * (1 - Math.exp(-10 * dt));
        an.headAng += (tg.head - an.headAng) * (1 - Math.exp(-12 * dt));
    }
    const neckAng = an.neckAng < -0.7 ? -0.7 : an.neckAng > 1.1 ? 1.1 : an.neckAng;
    const headAng = an.headAng < -0.7 ? -0.7 : an.headAng > 0.8 ? 0.8 : an.headAng;
    an.neck.r = neckAng; jointXf(an.neck, J.neck);
    an.head.r = headAng; jointXf(an.head, J.head);
    updateMatrices(an);
    for (let li = 0; li < 4; li++) updateLowerMatrix(an, an.legs[li]);
    // blinking
    an.blinkT -= dt;
    if (an.blinkT <= 0 && an.blinkPhase < 0) { an.blinkPhase = 0; an.blinkT = 2.2 + hash(Math.floor(f.time * 3.1)) * 4; }
    let eye = 0;
    if (an.blinkPhase >= 0) {
        an.blinkPhase += dt;
        const bl = an.blinkPhase;
        eye = bl < 0.045 ? 1 : bl < 0.12 ? 2 : bl < 0.165 ? 1 : 0;
        if (bl >= 0.165) an.blinkPhase = -1;
    }
    const act = f.act, aT = f.aT, emote = f.emote;
    if ((emote === 'sleepy' || emote === 'happy') && eye === 0) eye = 1;
    if (an.wHide > 0.8 && eye === 0) eye = 1;
    if (act === 'balk' && aT > 0.6 && aT < 0.75 && eye === 0) eye = 1;
    if (act === 'neigh' && aT > 0.25 && aT < 0.7 && eye === 0) eye = 1;
    an.eye = eye;
    an.mouth = tg.mouth;
}

function worstErr(an) {
    const x = an.f.x, facing = an.f.facing;
    let worst = 0;
    for (let li = 0; li < 4; li++) {
        const leg = an.legs[li];
        if (!leg.stance) continue;
        const lx = (leg.lockX - x) * facing;
        const e = Math.abs(lx - (leg.ex + an.bodyOX));
        if (e > worst) worst = e;
    }
    return worst;
}

/** Remember the ground where a hoof touched down (the tail looks up the ground behind the hooves here). */
function pushGround(an, leg) {
    an.gsX[an.gsI] = leg.lockX; an.gsY[an.gsI] = leg.lockY;
    an.gsI = (an.gsI + 1) & 15;
    if (an.gsN < 16) an.gsN++;
}
/** Ground (world y) nearest to world x among the remembered touchdowns; NaN when none. */
function groundNear(an) {
    const wx = an.gsQ;
    let best = 1e18, y = NaN;
    for (let i = 0; i < an.gsN; i++) {
        const d = Math.abs(an.gsX[i] - wx);
        if (d < best) { best = d; y = an.gsY[i]; }
    }
    return y;
}

/** Ground height and local slope at slot.q (a world x), cached in the slot {x, y, a} while x stays put. */
function groundCached(an, s, slot) {
    const wx = slot.q;
    if (slot.ok && Math.abs(slot.x - wx) < 1.5) return slot;
    slot.x = wx; slot.ok = true;
    slot.y = groundAtWorld(an, s, wx);
    if (typeof s.groundAt !== 'function') { slot.a = -(s.groundAngle || 0) * an.facing; slot.edge = 0; return slot; }
    const a = groundAtWorld(an, s, wx - 6), b = groundAtWorld(an, s, wx + 6);
    // a lip right here: a hoof should not stand half over it
    slot.edge = Math.abs(b - a) > 8 ? 1 : 0;
    slot.a = slot.edge ? 0 : Math.atan2(b - a, 12) * an.facing;
    return slot;
}

function groundAtWorld(an, s, wx) {
    const x0 = s.x || 0, y0 = s.y || 0;
    if (typeof s.groundAt === 'function') {
        const g = s.groundAt(wx);
        if (g !== null && g !== undefined && g === g) return g;
        // nothing there (a gap, past an edge): carry on the ground under the body, with the
        // slope measured from groundAt itself (no sign convention to get wrong)
        const b = s.groundAt(x0);
        if (b === null || b === undefined || b !== b) return y0;
        const dir = wx > x0 ? 1 : -1;
        const c = s.groundAt(x0 + dir * 24);
        let k = c === null || c === undefined || c !== c ? 0 : (c - b) / 24;
        k = k < -1 ? -1 : k > 1 ? 1 : k;
        return b + k * (wx - x0) * dir;
    }
    // SPEC §2: groundAngle > 0 means the ground rises to the right (world y is down)
    return y0 - Math.tan(s.groundAngle || 0) * (wx - x0);
}

function startSwing(an, leg, s, timed) {
    leg.stance = false;
    leg.timeSwing = timed;
    leg.u = 0;
    leg.p0 = -1;
    leg.swingDur = timed ? 0.24 : 0.25;
    // the swing starts where the sole is now (world)
    leg.fromWX = leg.lockX; leg.fromWY = leg.lockY;
    leg.targetWX = leg.lockX;
}

/** Where the sole goes this frame (local), then IK in body space. Inline matrix math: no helper calls with number arguments (V8 would box them). */
function solveLeg(an, leg, s, c) {
    const x = c.x, y = c.y, facing = c.facing;
    const mB = an.mBody, mI = an.mBodyInv;
    const restSoleX = leg.ex, restSoleY = leg.ey + leg.sole;
    // 1. ground locomotion target (local)
    let gx, gy, ga = 0, lifted = 0;
    if (leg.stance) {
        gx = (leg.lockX - x) * facing; gy = leg.lockY - y;
        ga = leg.gLock.ok ? leg.gLock.a : 0;
    } else {
        // world path from the lift point to the landing point: leaves and lands at ground speed 0
        const u = leg.u, e = u * u * (3 - 2 * u);
        const tg = (leg.gTarget.q = leg.targetWX, groundCached(an, s, leg.gTarget));
        const wx = leg.fromWX + (leg.targetWX - leg.fromWX) * e, wy = leg.fromWY + (tg.y - leg.fromWY) * e;
        const lx0 = (wx - x) * facing, ly0 = wy - y;
        let bx = mI[0] * lx0 + mI[1] * ly0 + mI[2], by = mI[3] * lx0 + mI[4] * ly0 + mI[5];
        const lift = (leg.front ? c.liftF : c.liftH) * (leg.timeSwing ? 0.5 : 1);
        const arc = Math.sin(Math.PI * Math.pow(u, leg.front ? 0.75 : 0.9));
        by -= lift * arc;
        if (!leg.timeSwing && leg.front) {
            // the fore flips its lower leg up and back early in the swing (a high tuck)
            const tu = u / 0.65;
            const tuck = Math.sin(Math.PI * (tu > 1 ? 1 : tu)) * c.g.fold;
            bx -= 12 * tuck; by -= 14 * tuck;
        }
        gx = mB[0] * bx + mB[1] * by + mB[2]; gy = mB[3] * bx + mB[4] * by + mB[5];
        // On a convex uphill joint the chord between two valid footsteps can cross the ground.
        const floor = groundAtWorld(an, s, x + gx * facing) - y;
        gy = Math.min(gy, floor - 2 * arc);
        lifted = arc;
        ga = tg.a * e;
    }
    // 2. body-relative poses for other modes (body space sole positions)
    let bx = 0, by = 0, w = 0, ba = 0;
    const pose = Q2;
    if (c.wSwim > 0.001) {
        swimPose(an, leg, c, pose);
        bx += pose.x * c.wSwim; by += pose.y * c.wSwim; w += c.wSwim; ba += pose.a * c.wSwim;
    }
    if (c.wAir > 0.001) {
        const wa = c.wAir * (1 - c.wSwim);
        airPose(leg, c.airT, pose);
        bx += pose.x * wa; by += pose.y * wa; w += wa; ba += pose.a * wa;
    }
    // actions that move legs relative to the body
    let ovW = 0, ovX = 0, ovY = 0, ovA = 0;
    if (!leg.front && c.hindKick > 0.001) {
        ovW = c.hindKick; ovX = restSoleX - 34 - (leg.near ? 0 : 6); ovY = restSoleY - 44 + (leg.near ? 0 : 4); ovA = 0.9;
    }
    if (leg.front && c.foreLift > 0.001) {
        ovW = c.foreLift; ovX = restSoleX + 14 + (leg.near ? 6 : 0); ovY = restSoleY - 48 - (leg.near ? 4 : 0); ovA = 1.1;
    }
    if (leg.front && leg.near && c.stampLift > 0.001) {
        ovW = c.stampLift; ovX = restSoleX + 8; ovY = restSoleY - 30; ovA = 0.6;
    }
    let lx = gx, ly = gy, la = ga;
    if (w > 0.001) {
        const qx = bx / w, qy = by / w, k = w < 1 ? w : 1;
        lx += (mB[0] * qx + mB[1] * qy + mB[2] - lx) * k;
        ly += (mB[3] * qx + mB[4] * qy + mB[5] - ly) * k;
        la += (ba / w + an.pitch - la) * k;
    }
    if (ovW > 0.001) {
        const k = ovW * ovW * (3 - 2 * ovW);
        lx += (mB[0] * ovX + mB[1] * ovY + mB[2] - lx) * k;
        ly += (mB[3] * ovX + mB[4] * ovY + mB[5] - ly) * k;
        la += (ovA + an.pitch - la) * k;
        if (k > lifted) lifted = k;
    }
    const hw = c.wHide;
    let free = w > ovW ? w : ovW;
    if (hw > free) free = hw;
    leg.soleX = lx; leg.soleY = ly;
    leg.lifted = leg.stance ? (lifted > free ? lifted : free) : (lifted > 0.2 ? lifted : 0.2);
    // 3. hoof angle (local, 0 = upright): flat on the ground in stance, flexed in the swing
    let hoofLocal = la;
    if (leg.stance && !leg.front && leg.near && free < 0.5) {
        // weight shifted forward: the near hind rests on the toe of its hoof
        const rest = (an.shift > 0 ? an.shift : 0) * (1 - an.moveW);
        if (rest > 0.01) { hoofLocal += 0.55 * rest; ly -= 2 * rest; }
    }
    if (!leg.stance && free < 0.5) {
        const fu = leg.u / 0.85;
        const flex = (leg.front ? 1.3 : 0.75) * Math.sin(Math.PI * (fu > 1 ? 1 : fu)) * (leg.timeSwing ? 0.4 : 1) * (0.4 + 0.6 * c.g.fold);
        let k = (leg.u - 0.8) / 0.2; k = k < 0 ? 0 : k > 1 ? 1 : k; k = k * k * (3 - 2 * k);
        hoofLocal = an.pitch + flex + (ga - an.pitch - flex) * k;
    }
    // pivot = sole + R(hoofLocal)·(0, -sole); planted hooves roll on the toe or heel to reach
    leg.pvLx = lx; leg.pvLy = ly; leg.pvA = hoofLocal;
    leg.pvR = 0; rollPivot(leg);
    if (leg.stance && free < 0.5) {
        const Lm = (leg.l1 + leg.l2) * 0.998, Lm2 = Lm * Lm;
        let qx = mI[0] * leg.pvX + mI[1] * leg.pvY + mI[2] - leg.rx, qy = mI[3] * leg.pvX + mI[4] * leg.pvY + mI[5] - leg.ry;
        if (qx * qx + qy * qy > Lm2) {
            const sign = qx < 0 ? 1 : -1;
            let lo = 0, hi = sign > 0 ? 0.75 : 0.35;
            for (let it = 0; it < 7; it++) {
                const mid = (lo + hi) / 2;
                leg.pvR = mid * sign; rollPivot(leg);
                qx = mI[0] * leg.pvX + mI[1] * leg.pvY + mI[2] - leg.rx; qy = mI[3] * leg.pvX + mI[4] * leg.pvY + mI[5] - leg.ry;
                if (qx * qx + qy * qy > Lm2) lo = mid; else hi = mid;
            }
            leg.pvR = hi * sign; rollPivot(leg);
        }
    }
    hoofLocal = leg.pvOutA;
    let pvx = leg.pvX, pvy = leg.pvY, relHide = 0;
    if (hw > 0.001) {
        // Göm dig: folded under the body. The fore folds its forearm forward along the ground
        // with the kelp boot tucked back beneath it; the hind leaves its hock behind and lays
        // the kelp boot forward under the belly. Targets are hoof pivots in body space.
        const k = hw * hw * (3 - 2 * hw);
        const tx = leg.rx + (leg.front ? (leg.near ? -14 : -9) : (leg.near ? 3 : 8));
        const ty = leg.ry + (leg.front ? (leg.near ? 22 : 24) : (leg.near ? 41 : 42));
        const qx = mB[0] * tx + mB[1] * ty + mB[2], qy = mB[3] * tx + mB[4] * ty + mB[5];
        const gyL = (leg.stance ? leg.lockY - y : leg.toSupport) - 3;
        pvx += (qx - pvx) * k; pvy += ((qy < gyL ? qy : gyL) - pvy) * k;
        relHide = k;
    }
    leg.ikTx = mI[0] * pvx + mI[1] * pvy + mI[2];
    leg.ikTy = mI[3] * pvx + mI[4] * pvy + mI[5];
    ikLeg(leg);
    leg.upperRot = Math.atan2(leg.ky - leg.ry, leg.kx - leg.rx) - leg.upA;
    const cannonA = Math.atan2(leg.hy - leg.ky, leg.hx - leg.kx);
    leg.lowerRot = cannonA - leg.loA;
    // the hoof sprite is drawn upright: its rotation in body space, within what a fetlock allows
    const cannon = cannonA - Math.PI / 2;
    let rel = hoofLocal - an.pitch - cannon;
    const relMax = leg.front ? 2.2 : 1.7;
    rel = rel < -0.9 ? -0.9 : rel > relMax ? relMax : rel;
    if (relHide > 0) rel += ((leg.front ? 0.5 : 0.35) - rel) * relHide;
    leg.hoofRot = cannon + rel;
}

const HOOF_HALF = 13; // half the sole length: roll points (toe ahead, heel behind)
/** Pivot (coronet) for the sole at (leg.pvLx, leg.pvLy) with hoof angle leg.pvA, rolled by r about the toe (r > 0) or heel (r < 0). */
function rollPivot(leg) {
    const r = leg.pvR, a = leg.pvA, ca = Math.cos(a), sa = Math.sin(a);
    const px = r > 0 ? HOOF_HALF : r < 0 ? -HOOF_HALF : 0;
    const rx = leg.pvLx + px * ca, ry = leg.pvLy + px * sa;
    const b = a + r, cb = Math.cos(b), sb = Math.sin(b);
    const qx = -px, qy = -leg.sole;
    leg.pvX = rx + qx * cb - qy * sb;
    leg.pvY = ry + qx * sb + qy * cb;
    leg.pvOutA = b;
}

/** Two-bone IK for a leg toward (leg.ikTx, leg.ikTy) in body space: writes the knee (kx, ky) and end (hx, hy). */
function ikLeg(leg) {
    const rx = leg.rx, ry = leg.ry, l1 = leg.l1, l2 = leg.l2;
    let dx = leg.ikTx - rx, dy = leg.ikTy - ry;
    let d = Math.sqrt(dx * dx + dy * dy);
    const max = (l1 + l2) * 0.9995, min = (l1 > l2 ? l1 - l2 : l2 - l1) + 1e-3;
    if (d < 1e-6) { dx = 0; dy = 1; d = 1e-6; }
    const ux = dx / d, uy = dy / d;
    leg.reach = d / (l1 + l2);
    const dc = d > max ? max : d < min ? min : d;
    const a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc);
    const hh = l1 * l1 - a * a;
    const h = hh > 0 ? Math.sqrt(hh) : 0;
    const px = uy * leg.bend, py = -ux * leg.bend;
    leg.kx = rx + ux * a + px * h;
    leg.ky = ry + uy * a + py * h;
    leg.hx = rx + ux * dc;
    leg.hy = ry + uy * dc;
}

/** Swimming: legs paddle (body space sole positions, and the hoof angle). */
function swimPose(an, leg, c, out) {
    // A long backwards power stroke, then a tucked recovery forward. The phase is
    // integrated, never absolute time × speed (which jumps when the swimmer accelerates).
    const offset = (leg.near ? 0 : 0.5) + (leg.front ? 0 : 0.42);
    const phase = frac(an.swimPhase - offset), power = phase < 0.58;
    const u = power ? phase / 0.58 : (phase - 0.58) / 0.42;
    const e = smooth01(u), arc = Math.sin(Math.PI * u);
    const restX = leg.ex, restY = leg.ey + leg.sole;
    const reach = leg.front ? 29 : 22, back = leg.front ? -25 : -28;
    const base = leg.front ? 26 : 20;
    out.x = restX + (power ? lerp(reach, back, e) : lerp(back, reach, e));
    out.y = restY - base + (power ? 6 * arc : -(leg.front ? 30 : 22) * arc);
    out.a = power ? 0.12 + arc * 0.32 : 0.15 + arc * (leg.front ? 1.25 : 0.8);
    return out;
}

/** Leaping: takeoff, stretched suspension, landing reach (body space sole positions, hoof angle). */
function airPose(leg, t, out) {
    const restX = leg.ex, restY = leg.ey + leg.sole;
    const take = window4(t, -0.1, 0, 0.08, 0.28);    // pushing off
    const tuck = window4(t, 0.02, 0.18, 0.38, 0.62);  // knees up over the obstacle
    const reach = window4(t, 0.4, 0.62, 0.8, 1.05);   // fores reaching for the ground
    const land = smooth01((t - 0.72) / 0.28);
    if (leg.front) {
        const k = leg.near ? 1 : 0.85;
        out.x = restX + (8 * take + 6 * tuck + 30 * reach + 12 * land) * k;
        out.y = restY - (44 * take + 58 * tuck + 14 * reach + 2 * land) * k;
        out.a = 1.5 * take + 1.9 * tuck + 0.2 * reach - 0.1 * land;
    } else {
        const k = leg.near ? 1 : 0.9;
        // stretched back after the push, then gathering under the body for the landing
        out.x = restX + (-34 * take - 46 * Math.max(tuck, 0.6 * reach) + 22 * land) * k;
        out.y = restY - (4 * take + 34 * tuck + 20 * reach + 12 * land) * k;
        out.a = 0.8 * take + 1.4 * tuck + 0.9 * reach + 0.3 * land;
    }
    return out;
}

// ---------------------------------------------------------------------------
// Gait blending
// ---------------------------------------------------------------------------
function addGait(an, G) {
    // the weight travels in acc.w: a fractional double passed as an argument would be boxed
    const acc = an.acc, w = acc.w, sf0 = Math.sqrt((an.f.speed > 1 ? an.f.speed : 1) / G.v);
    const sf = sf0 < 0.55 ? 0.55 : sf0 > 1.25 ? 1.25 : sf0;
    acc.stride += G.stride * sf * w; acc.duty += G.duty * w;
    acc.liftF += G.lift[0] * w; acc.liftH += G.lift[1] * w;
    acc.bobA += G.bob[0] * w; acc.bobH += G.bob[1] * w; acc.bobP += G.bob[2] * w;
    acc.pitchA += G.pitch[0] * w; acc.pitchH += G.pitch[1] * w; acc.pitchP += G.pitch[2] * w;
    acc.neckA += G.neck[0] * w; acc.neckH += G.neck[1] * w; acc.neckP += G.neck[2] * w;
    acc.low += G.low * w; acc.lean += G.lean * w; acc.fold += G.fold * w;
}
/** Blend the gait parameters by the gait weights; ease the leg offsets toward the current gait's. */
function blendGait(an) {
    const g = an.g, acc = an.acc, gw = an.gaitW, f = an.f;
    acc.stride = 0; acc.duty = 0; acc.liftF = 0; acc.liftH = 0; acc.bobA = 0; acc.bobH = 0; acc.bobP = 0;
    acc.pitchA = 0; acc.pitchH = 0; acc.pitchP = 0; acc.neckA = 0; acc.neckH = 0; acc.neckP = 0; acc.low = 0; acc.lean = 0; acc.fold = 0;
    let wsum = 0;
    if (gw.wWalk > 1e-4) { acc.w = gw.wWalk; addGait(an, GAITS.walk); wsum += gw.wWalk; } else gw.wWalk = 0;
    if (gw.wTrot > 1e-4) { acc.w = gw.wTrot; addGait(an, GAITS.trot); wsum += gw.wTrot; } else gw.wTrot = 0;
    if (gw.wCanter > 1e-4) { acc.w = gw.wCanter; addGait(an, GAITS.canter); wsum += gw.wCanter; } else gw.wCanter = 0;
    if (gw.wGallop > 1e-4) { acc.w = gw.wGallop; addGait(an, GAITS.gallop); wsum += gw.wGallop; } else gw.wGallop = 0;
    if (wsum > 1e-4) {
        const iw = 1 / wsum, m = wsum < 1 ? wsum : 1; // amplitudes fade with the blend toward standing
        g.stride = acc.stride * iw; g.duty = acc.duty * iw; g.liftF = acc.liftF * iw; g.liftH = acc.liftH * iw;
        g.bobA = acc.bobA * iw * m; g.bobH = acc.bobH * iw; g.bobP = acc.bobP * iw;
        g.pitchA = acc.pitchA * iw * m; g.pitchH = acc.pitchH * iw; g.pitchP = acc.pitchP * iw;
        g.neckA = acc.neckA * iw * m; g.neckH = acc.neckH * iw; g.neckP = acc.neckP * iw;
        g.low = acc.low * iw * m; g.lean = acc.lean * iw * m; g.fold = acc.fold * iw;
    } else {
        g.bobA = 0; g.pitchA = 0; g.neckA = 0; g.low = 0; g.lean = 0;
    }
    // leg offsets move toward the current gait's (shortest way round)
    if (f.moving) {
        const n = f.gaitName, k = f.first ? 1 : 1 - Math.exp(-8 * f.dt);
        for (let li = 0; li < 4; li++) {
            const leg = an.legs[li];
            const target = n === 'walk' ? leg.offW : n === 'trot' ? leg.offT : n === 'canter' ? leg.offC : leg.offG;
            let d = target - leg.offset;
            d -= Math.round(d);
            let o = leg.offset + d * k;
            leg.offset = o - Math.floor(o);
        }
    }
}

// ---------------------------------------------------------------------------
// Pose output
// ---------------------------------------------------------------------------
function place(part, f, x, y, rot) {
    apply(f, x, y, Q);
    part.x = Q.x; part.y = Q.y; part.rot = rot;
}

function writePose(an, s) {
    const pose = an.pose, parts = pose.parts, rig = an.rig, J = rig.joints;
    const b = an.body, mB = an.mBody, mN = an.mNeck, mH = an.mHead;
    // body-level parts share the body transform
    place(parts.body, b, b.cx, b.cy, b.r);
    place(parts.torso, b, rig.parts.torso.pivot[0], rig.parts.torso.pivot[1], b.r);
    place(parts.shell, b, rig.parts.shell.pivot[0], rig.parts.shell.pivot[1], b.r);
    // neck turns about its base; the head joint and the eye/mouth ride on neck and head
    let px = J.neck[0], py = J.neck[1];
    parts.neck.x = mB[0] * px + mB[1] * py + mB[2]; parts.neck.y = mB[3] * px + mB[4] * py + mB[5];
    parts.neck.rot = b.r + an.neck.r;
    px = J.head[0]; py = J.head[1];
    parts.head.x = mN[0] * px + mN[1] * py + mN[2]; parts.head.y = mN[3] * px + mN[4] * py + mN[5];
    parts.head.rot = b.r + an.neck.r + an.head.r;
    px = J.eye[0]; py = J.eye[1];
    parts.eye.x = mH[0] * px + mH[1] * py + mH[2]; parts.eye.y = mH[3] * px + mH[4] * py + mH[5];
    parts.eye.rot = parts.head.rot;
    px = J.mouth[0]; py = J.mouth[1];
    parts.mouth.x = mH[0] * px + mH[1] * py + mH[2]; parts.mouth.y = mH[3] * px + mH[4] * py + mH[5];
    parts.mouth.rot = parts.head.rot;
    parts.mouth.visible = an.mouth > 0.2;
    pose.mouthOpen = an.mouth > 0.7;
    pose.eye = an.eye; pose.mouth = an.mouth;
    // legs and hoof shadows (ground heights come from the locks and landing targets)
    const y = s.y || 0;
    let sx = 0, sw = 0, minX = 1e9, maxX = -1e9, gsum = 0;
    for (let li = 0; li < 4; li++) {
        const leg = an.legs[li];
        const up = leg.pUpper, lo = leg.pLower, hf = leg.pHoof, sh = leg.pShadow;
        up.x = mB[0] * leg.rx + mB[1] * leg.ry + mB[2]; up.y = mB[3] * leg.rx + mB[4] * leg.ry + mB[5]; up.rot = b.r + leg.upperRot;
        lo.x = mB[0] * leg.kx + mB[1] * leg.ky + mB[2]; lo.y = mB[3] * leg.kx + mB[4] * leg.ky + mB[5]; lo.rot = b.r + leg.lowerRot;
        hf.x = mB[0] * leg.hx + mB[1] * leg.hy + mB[2]; hf.y = mB[3] * leg.hx + mB[4] * leg.hy + mB[5]; hf.rot = b.r + leg.hoofRot;
        const planted = leg.stance ? clamp(1 - leg.lifted, 0, 1) : 0;
        const gy = leg.stance ? leg.lockY - y : leg.toSupport;
        const hgt = Math.max(0, gy - leg.soleY);
        sh.x = leg.soleX; sh.y = gy;
        sh.alpha = clamp(1 - hgt / 30, 0, 1) * (1 - an.wSwim) * (1 - (s.submerge > 0 ? (s.submerge < 1 ? s.submerge : 1) : 0)) * (1 - an.wHide * 0.6) * (leg.near ? 0.85 : 0.6);
        sh.sx = clamp(1 - hgt / 60, 0.4, 1);
        sx += leg.soleX * (0.3 + planted); sw += 0.3 + planted; gsum += gy;
        if (leg.soleX < minX) minX = leg.soleX;
        if (leg.soleX > maxX) maxX = leg.soleX;
    }
    const gyc = gsum / 4;
    pose.shadow.x = sx / sw;
    pose.shadow.y = gyc;
    pose.shadow.w = clamp((maxX - minX + 90) / 170, 0.55, 1.3) * (1 - 0.3 * an.wHide) + 0.25 * an.wHide;
    // fades when the body is well above its standing height (a leap)
    const lift = Math.max(0, gyc - an.bodyOY); // both are local: elevation must not fade the shadow
    const sub = s.submerge > 0 ? (s.submerge < 1 ? s.submerge : 1) : 0;
    pose.shadow.alpha = clamp(1 - lift / 180, 0.2, 1) * (1 - an.wSwim) * (1 - sub) * 0.9;
    pose.bodyX = b.tx; pose.bodyY = b.ty; pose.pitch = b.r; pose.neck = an.neck.r; pose.head = an.head.r;
    pose.wet = an.wet;
}

// ---------------------------------------------------------------------------
// Secondary motion
// ---------------------------------------------------------------------------
const ENV = { gx: 0, gy: 0, gyW: 0, wx: 0, wy: 0, drag: 0, dragW: 0, water: 1e9, ax: 0, ay: 0, ground: NaN, bend: 1 };

function stepChains(an, dt, s, c) {
    const swim = c.wSwim;
    // the water line (local y): from waterY, or everything under water when swimming without one
    const sub = s.submerge > 0 ? (s.submerge < 1 ? s.submerge : 1) : 0;
    if (typeof s.waterY === 'number' && (swim > 0.01 || sub > 0)) an.waterLine = s.waterY - (s.y || 0);
    else if (swim > 0.5 || sub >= 1) an.waterLine = -1e9;
    else if (sub > 0) an.waterLine = -140 * sub; // wading without a water line: roughly how deep
    else an.waterLine = 1e9;
    // how wet each group is (fringes are low, the tail in the middle, the mane high)
    an.wadeLow = swim > sub * 3 ? swim : (sub * 3 < 1 ? sub * 3 : 1);
    an.wadeMid = swim > sub * 1.5 ? swim : (sub * 1.5 < 1 ? sub * 1.5 : 1);
    an.wadeHigh = swim > (sub - 0.6) * 2.5 ? swim : ((sub - 0.6) * 2.5 < 1 ? (sub - 0.6) * 2.5 : 1);
    // relative wind: the air (or water) at rest in the world, seen from the moving frame
    const wx = -an.vx, wy = -an.vy;
    // the dock lifts the tail with speed (and it trails level when swimming)
    const sp = Math.min(1, Math.abs(an.vx) / 1100);
    an.tailLift = damp(an.tailLift || 0, lerp(0.75 * sp * sp, 0.4 + 0.65 * Math.min(1, Math.abs(an.vx) / 520), swim), 4, dt);
    for (let ci = 0; ci < an.chains.length; ci++) {
        const ch = an.chains[ci];
        // carried rest pose -> targets
        const m = ch.mat;
        for (let i = 0; i < ch.n; i++) {
            const rx = ch.restX[i], ry = ch.restY[i];
            ch.tx[i] = m[0] * rx + m[1] * ry + m[2];
            ch.ty[i] = m[3] * rx + m[4] * ry + m[5];
        }
        if (ch.group === 'tail' && an.tailLift) {
            const cs = Math.cos(an.tailLift), sn = Math.sin(an.tailLift);
            for (let i = 1; i < ch.n; i++) {
                const dx = ch.tx[i] - ch.tx[0], dy = ch.ty[i] - ch.ty[0];
                ch.tx[i] = ch.tx[0] + dx * cs - dy * sn; ch.ty[i] = ch.ty[0] + dx * sn + dy * cs;
            }
        }
        if (an.mini) {
            // no physics: carried shape with a gentle sway
            const sway = Math.sin(c.time * 2.1 + ch.idx) * 0.04;
            for (let i = 0; i < ch.n; i++) {
                const t = i / (ch.n - 1);
                const dx = ch.tx[i] - ch.tx[0], dy = ch.ty[i] - ch.ty[0];
                const a = sway * t - (ch.group === 'tail' ? 0.25 : 0.12) * Math.min(1, Math.abs(an.vx) / 900) * t;
                const cs = Math.cos(a), sn = Math.sin(a);
                ch.x[i] = ch.tx[0] + dx * cs - dy * sn; ch.y[i] = ch.ty[0] + dx * sn + dy * cs;
            }
            continue;
        }
        const isTail = ch.group === 'tail', isFringe = ch.group === 'fringe';
        // air: gravity and light drag; water: buoyancy and strong drag, chosen per point by the water line
        ENV.gx = 0;
        ENV.gy = isTail ? 820 : isFringe ? 700 : 520;
        ENV.gyW = isFringe ? -260 : isTail ? -140 : -300;
        ENV.drag = isTail ? 1.6 : isFringe ? 1.8 : 2.8;
        ENV.dragW = 4.5;
        ENV.water = an.waterLine;
        // air pushes like v², so a walk barely lifts the hair and a gallop streams it
        const vq = Math.min(1.2, Math.abs(an.vx) / 900);
        const windK = lerp((isTail ? 1.35 : 1.1) * (0.25 + 0.75 * vq), 0.6, swim);
        ENV.wx = wx * windK + Math.sin(c.time * 1.8 + ch.idx * 0.8) * 8 * swim;
        ENV.wy = wy * windK * 0.5 + Math.sin(c.time * 1.5 + ch.idx) * 6 * swim;
        ENV.ax = an.ax * (isFringe ? 0.3 : 0.6); ENV.ay = an.ay * 0.2;
        // in water everything goes softer: kelp fringes lift and sway, the mane drifts
        const wetK = isFringe ? an.wadeLow : isTail ? an.wadeMid : an.wadeHigh;
        ENV.bend = 1 - wetK * (isFringe ? 0.3 : isTail ? 0.3 : 0.5);
        if (ch.collide) {
            // the ground under the tail tip, from where the hooves have stood (no terrain call)
            an.gsQ = (s.x || 0) + ch.x[ch.n - 1] * an.facing;
            const gy = an.gsN > 0 && an.hindGround === an.hindGround ? groundNear(an) : NaN;
            ENV.ground = gy === gy ? gy - (s.y || 0) : an.hindGround;
        } else ENV.ground = NaN;
        if (isTail && an.kickTail) {
            // a swish: the lower tail flicks back and forth
            for (let i = 2; i < ch.n; i++) ch.vx[i] += an.kickTail * 150 * (i / (ch.n - 1));
        }
        if (ch.group === 'forelock' && an.kickForelock) {
            for (let i = 1; i < ch.n; i++) { ch.vy[i] -= 90 * (i / (ch.n - 1)); ch.vx[i] += 40 * (i / (ch.n - 1)); }
        }
        stepChain(ch, dt, ENV);
        // spread: the tail fans and the fringe flares under water
        ch.spread = 1 + wetK * (isTail ? 0.35 : isFringe ? 0.18 : 0.1);
    }
}

// ---------------------------------------------------------------------------
// Convenience for tests: simulate from rest to time t and return a snapshot
// ---------------------------------------------------------------------------
/**
 * poseFor(rig, state, t) -> plain object with the body, every part transform
 * (local space), hoof soles and planted flags, eye and mouth states, and the
 * chain points. `state` is held constant except that x advances with speed
 * when a gait is moving (vx = speed * facing unless given).
 */
export function poseFor(rig, state, t, { dt = 1 / 60, mini = false } = {}) {
    const an = createAnimator(rig, { mini });
    const s = Object.assign({ x: 0, y: 0, facing: 1, gait: 'stand', speed: 0, mode: 'ground' }, state);
    const x0 = s.x;
    const moving = ['walk', 'trot', 'canter', 'gallop'].includes(s.gait);
    const v = moving ? (s.vx !== undefined ? s.vx : (s.speed || 0) * (s.facing || 1)) : (s.vx || 0);
    const n = Math.max(1, Math.round(t / dt));
    for (let i = 0; i <= n; i++) {
        const tt = i * dt;
        s.time = tt;
        s.x = x0 + v * tt;
        if (moving && s.vx === undefined) s.vx = v;
        an.update(i === 0 ? 0 : dt, s);
    }
    const parts = {};
    for (const [k, p] of Object.entries(an.pose.parts)) parts[k] = { x: p.x, y: p.y, rot: p.rot, visible: p.visible, alpha: p.alpha };
    return {
        t, phase: an.phase, pitch: an.pose.pitch, bodyX: an.pose.bodyX, bodyY: an.pose.bodyY,
        neck: an.pose.neck, head: an.pose.head, eye: an.pose.eye, mouth: an.pose.mouth,
        parts,
        legs: Object.fromEntries(an.legs.map((l) => [l.name, {
            stance: l.stance, soleX: l.soleX, soleY: l.soleY, worldX: l.stance ? l.lockX : null,
            knee: [l.kx, l.ky], hoof: [l.hx, l.hy], reach: l.reach, hoofRot: l.hoofRot
        }])),
        chains: an.chains.map((c) => ({ group: c.group, idx: c.idx, x: Array.from(c.x), y: Array.from(c.y) })),
        shadow: { ...an.pose.shadow }
    };
}

/** Which legs are in stance at a gait phase (for tests and debugging). */
export function stanceAt(gait, phase) {
    const G = GAITS[gait];
    const out = {};
    for (const leg of LEG_ORDER) out[leg] = frac(phase - G.offsets[leg]) < G.duty;
    return out;
}
