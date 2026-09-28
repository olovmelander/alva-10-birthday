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
 * the world (its sole never slides); a leg in swing follows an arc, in body
 * space, from where it lifted to where it will land. Legs are solved with
 * two-bone IK (carpus bends back, hock bends forward). The body's pitch and
 * height follow the hooves: the support heights under the fore and hind legs
 * give the pitch, and the body sinks when a planted leg could not reach.
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
    let d = Math.hypot(dx, dy);
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
export function createChain(rest, { pinned = 1, stiff = [0.3, 0.05], collide = false, floatUp = 1 } = {}) {
    const n = rest.length;
    const ch = {
        n, pinned, collide, floatUp,
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
            ch.len[i] = Math.hypot(rest[i][0] - rest[i - 1][0], rest[i][1] - rest[i - 1][1]);
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
 * its parent (local space) before calling. env: { gx, gy (gravity or buoyancy,
 * wu/s²), wx, wy (air or water velocity relative to the frame, wu/s), drag (1/s),
 * ax, ay (frame acceleration, subtracted), ground (local y or NaN), bend (scale of
 * the springs) }.
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
        const f = (st + 1) / steps;
        for (let i = 0; i < n; i++) {
            ch.ox[i] = ch.x[i]; ch.oy[i] = ch.y[i];
            if (i < ch.pinned) {
                // pinned points follow their carried places (interpolated across substeps)
                ch.x[i] = ch.x[i] + (ch.tx[i] - ch.x[i]) * (1 / (steps - st));
                ch.y[i] = ch.y[i] + (ch.ty[i] - ch.y[i]) * (1 / (steps - st));
                continue;
            }
            const ax = env.gx - env.ax + (env.wx - ch.vx[i]) * env.drag;
            const ay = env.gy * ch.floatUp - env.ay + (env.wy - ch.vy[i]) * env.drag;
            ch.vx[i] += ax * h; ch.vy[i] += ay * h;
            ch.x[i] += ch.vx[i] * h; ch.y[i] += ch.vy[i] * h;
        }
        void f;
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
function setXf(f, cx, cy, tx, ty, r) { f.cx = cx; f.cy = cy; f.tx = tx; f.ty = ty; f.r = r; f.c = Math.cos(r); f.s = Math.sin(r); }
const P = { x: 0, y: 0 };
function apply(f, x, y, out = P) {
    const dx = x - f.cx, dy = y - f.cy;
    out.x = f.tx + dx * f.c - dy * f.s;
    out.y = f.ty + dx * f.s + dy * f.c;
    return out;
}
function applyInv(f, x, y, out = P) {
    const dx = x - f.tx, dy = y - f.ty;
    out.x = f.cx + dx * f.c + dy * f.s;
    out.y = f.cy - dx * f.s + dy * f.c;
    return out;
}

// ---------------------------------------------------------------------------
// The animator
// ---------------------------------------------------------------------------
function makePart() { return { x: 0, y: 0, rot: 0, sx: 1, sy: 1, alpha: 1, visible: true }; }

export function createAnimator(rig, { mini = false } = {}) {
    const bodyC = rig.body.pivot;
    const J = rig.joints;
    const an = {
        rig, mini,
        time: 0, phase: 0, phaseAcc: 0, gaitW: { walk: 0, trot: 0, canter: 0, gallop: 0 }, moveW: 0,
        g: { stride: 190, duty: 0.6, liftF: 15, liftH: 11, bobA: 0, bobH: 2, bobP: 0, pitchA: 0, pitchH: 1, pitchP: 0, neckA: 0, neckH: 2, neckP: 0, low: 0, lean: 0, fold: 0 },
        offsets: { hindF: 0.5, foreF: 0.75, hindN: 0, foreN: 0.25 },
        facing: 1, lastX: NaN, lastY: NaN, vx: 0, vy: 0, ax: 0, ay: 0,
        body: makeXf(), neck: makeXf(), head: makeXf(),
        bodyOY: 0, bodyVY: 0, bodyOX: 0, pitch: 0, pitchV: 0, supPitch: 0,
        neckAng: 0, headAng: 0, wSwim: 0, wHide: 0, wAir: 0, wasAir: false, skidW: 0,
        blinkT: 1.5, blinkPhase: -1, eye: 0, mouth: 0,
        idleT: 0, shiftT: 3, shift: 0, shiftTarget: 0, restLeg: -1, swishT: 1.7, twitchT: 1.1, kickTail: 0, kickForelock: 0,
        swimPhase: 0, settleCool: 0, wet: 0,
        legs: [], chains: [], legIndex: {},
        ctx: { x: 0, y: 0, facing: 1, liftF: 0, liftH: 0, wGround: 1, wSwim: 0, wAir: 0, wHide: 0, airT: 0, time: 0, hindKick: 0, foreLift: 0, stampLift: 0, rearW: 0, act: null, aT: 0, g: null, fvx: 0, fvy: 0 },
        acc: { stride: 0, duty: 0, liftF: 0, liftH: 0, bobA: 0, bobH: 0, bobP: 0, pitchA: 0, pitchH: 0, pitchP: 0, neckA: 0, neckH: 0, neckP: 0, low: 0, lean: 0, fold: 0 },
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
            // state (world space for locks, body space for swing starts)
            stance: true, lockX: 0, lockY: 0, lockA: 0, u: 1, timeSwing: false, swingDur: 0.25, stAcc0: 0, swAcc0: 0, swSpan: 1, targetWX: 0, toSupport: 0,
            fromBX: 0, fromBY: 0, toBX: 0, toBY: 0, lift: 0, planted: 1, desired: 1,
            // outputs
            soleX: 0, soleY: 0, hoofA: 0, kx: 0, ky: 0, hx: 0, hy: 0, upperRot: 0, lowerRot: 0, hoofRot: 0,
            fringe: null, override: 0, ovX: 0, ovY: 0, ovA: 0
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
        rig.mane.forEach((m, i) => addChain(m, 'mane', i, { stiff: [0.55, 0.16] }));
        rig.forelock.forEach((m, i) => addChain(m, 'forelock', i, { stiff: [0.45, 0.12] }));
        addChain(rig.tail, 'tail', 0, { stiff: [0.24, 0.025], collide: true });
        for (const leg of an.legs) {
            const L = rig.legs[leg.name];
            leg.fringe = addChain(L.fringeStrip, 'fringe', an.legIndex[leg.name], { pinned: L.fringeStrip.pinned || 2, stiff: [0.35, 0.25] });
        }
    } else {
        // mini: fewer tufts and no physics (the spines just follow their parents with a sway)
        [1, 2, 4].forEach((i) => addChain(rig.mane[i], 'mane', i, {}));
        addChain(rig.forelock[1], 'forelock', 1, {});
        addChain(rig.tail, 'tail', 0, { collide: true });
        for (const leg of an.legs) leg.fringe = addChain(rig.legs[leg.name].fringeStrip, 'fringe', an.legIndex[leg.name], { pinned: 2 });
    }
    an.pose = makePose(an);
    an.update = (dt, s) => update(an, dt, s);
    an.reset = () => { an.lastX = NaN; };
    return an;
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
        parts, eye: 0, mouth: 0, wet: 0, tint: 0xffffff,
        shadow: { x: 0, y: 0, w: 1, alpha: 0 }, chains: an.chains, legs: an.legs,
        bodyX: 0, bodyY: 0, pitch: 0, neck: 0, head: 0
    };
}

// scratch
const IK = { mx: 0, my: 0, ex: 0, ey: 0, reach: 0 };
const Q = { x: 0, y: 0 };
const Q2 = { x: 0, y: 0 };

function groundLocal(an, s, lx) {
    // terrain height (local y) at local x
    if (typeof s.groundAt === 'function') {
        const g = s.groundAt((s.x || 0) + lx * an.facing);
        if (g !== null && g !== undefined && g === g) return g - (s.y || 0);
    }
    const ga = s.groundAngle || 0;
    return -Math.tan(ga) * lx;
}

function update(an, dtIn, s) {
    const dt = clamp(dtIn || 0, 0, 0.1);
    const rig = an.rig;
    const bodyC = rig.body.pivot, J = rig.joints;
    const x = s.x || 0, y = s.y || 0;
    const facing = s.facing === -1 ? -1 : 1;
    const mode = s.mode || 'ground';
    const time = s.time !== undefined ? s.time : an.time + dt;
    an.time = time;

    // --- frame motion (local), teleports and facing flips -----------------------
    const first = an.lastX !== an.lastX;
    let jumped = first || Math.abs(x - an.lastX) > 400 || Math.abs(y - an.lastY) > 400;
    if (!jumped && facing !== an.facing) {
        // mirror world locks about the hero so planted hooves keep their local places
        for (let li = 0; li < 4; li++) an.legs[li].lockX = x - (an.legs[li].lockX - x);
    }
    an.facing = facing;
    let fvx = 0, fvy = 0;
    if (!jumped && dt > 0) { fvx = (x - an.lastX) / dt; fvy = (y - an.lastY) / dt; }
    if (s.vx !== undefined) fvx = s.vx;
    if (s.vy !== undefined) fvy = s.vy;
    const nvx = fvx * facing; // along facing
    if (dt > 0 && !jumped) {
        an.ax = damp(an.ax, clamp((nvx - an.vx) / dt, -3000, 3000), 12, dt);
        an.ay = damp(an.ay, clamp((fvy - an.vy) / dt, -3000, 3000), 12, dt);
    }
    an.vx = nvx; an.vy = fvy;
    an.lastX = x; an.lastY = y;
    const speed = s.speed !== undefined ? Math.abs(s.speed) : Math.abs(nvx);
    const vLocal = s.vx !== undefined ? nvx : (s.speed !== undefined ? s.speed : nvx);

    // --- mode weights ---------------------------------------------------------------
    const swimT = mode === 'swim' ? 1 : 0;
    an.wSwim = damp(an.wSwim, swimT, 7, dt);
    if (first) an.wSwim = swimT;
    const hideT = clamp(s.hide || 0, 0, 1);
    an.wHide = first ? hideT : damp(an.wHide, hideT, 18, dt);
    const inAir = mode === 'air';
    an.wAir = first ? (inAir ? 1 : 0) : damp(an.wAir, inAir ? 1 : 0, inAir ? 14 : 10, dt);
    const wSwim = an.wSwim, wHide = an.wHide * (1 - 0), wAir = an.wAir;
    const wGround = (1 - wSwim) * (1 - wAir);
    an.wet = s.wet || 0;

    // --- gait parameters (blended) --------------------------------------------------
    const gaitName = s.gait || 'stand';
    const moving = (gaitName === 'walk' || gaitName === 'trot' || gaitName === 'canter' || gaitName === 'gallop') && mode === 'ground' && hideT < 0.5 && speed > 4;
    const skid = gaitName === 'skid' && mode === 'ground';
    an.skidW = damp(an.skidW, skid ? 1 : 0, skid ? 16 : 6, dt);
    for (let gi = 0; gi < GAIT_KEYS.length; gi++) {
        const k = GAIT_KEYS[gi];
        const target = moving && gaitName === k ? 1 : 0;
        an.gaitW[k] = first ? target : damp(an.gaitW[k], target, 9, dt);
    }
    an.moveW = damp(an.moveW, moving ? 1 : 0, moving ? 10 : 5, dt);
    if (first) an.moveW = moving ? 1 : 0;
    blendGait(an, gaitName, moving, speed, dt, first);
    const g = an.g;

    // --- phase (distance driven) ----------------------------------------------------
    if (moving) {
        const dph = Math.abs(vLocal * dt) / g.stride;
        an.phase = frac(an.phase + dph);
        an.phaseAcc += dph;
    }
    const ph = an.phase;

    // --- body placement ------------------------------------------------------------------
    const act = s.action || null;
    const aT = clamp(s.actionT || 0, 0, 1);
    const airT = clamp(s.airT || 0, 0, 1);

    // idle: breathing and weight shift
    const idleW = (1 - an.moveW) * wGround * (1 - wHide) * (act ? 0.4 : 1);
    if (!an.mini) {
        an.shiftT -= dt;
        if (an.shiftT <= 0) {
            an.shiftT = 4 + hash(Math.floor(time * 7.3)) * 5;
            an.shiftTarget = an.shiftTarget ? 0 : (hash(time) > 0.5 ? 1 : -1);
        }
        an.shift = damp(an.shift, an.shiftTarget * idleW, 1.8, dt);
        // little signs of life: a tail swish, a forelock twitch
        an.swishT -= dt; an.twitchT -= dt;
        an.kickTail = 0; an.kickForelock = 0;
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
    pitchT += -0.13 * an.skidW; ox += -10 * an.skidW; oy += 11 * an.skidW; neckT += -0.2 * an.skidW; headT += -0.12 * an.skidW;

    // actions
    let foreLift = 0, hindKick = 0, stampLift = 0, rearW = 0;
    switch (act) {
        case 'balk': {
            const w = window4(aT, 0, 0.18, 0.85, 1);
            ox += -7 * w; pitchT += -0.035 * w; oy += 2 * w;
            const look = window4(aT, 0.1, 0.3, 0.6, 0.75);
            neckT += 0.34 * look; headT += 0.42 * look;
            const snort = window4(aT, 0.62, 0.68, 0.72, 0.84);
            neckT += -0.16 * snort; headT += -0.12 * snort; mouthT = Math.max(mouthT, snort * 0.6);
            break;
        }
        case 'buck': {
            const gather = window4(aT, 0, 0.15, 0.2, 0.32);
            const kick = window4(aT, 0.18, 0.36, 0.5, 0.72);
            oy += 4 * gather - 3 * kick; pitchT += -0.03 * gather + 0.2 * kick;
            neckT += 0.28 * kick - 0.08 * gather; headT += 0.2 * kick;
            hindKick = kick;
            break;
        }
        case 'leap': // a leap requested as an action on the ground: crouch then spring
            oy += 6 * window4(aT, 0, 0.3, 0.5, 0.8);
            break;
        case 'neigh': {
            const w = window4(aT, 0, 0.2, 0.78, 1);
            neckT += -0.36 * w; headT += -0.34 * w + Math.sin(time * 38) * 0.03 * window4(aT, 0.25, 0.3, 0.7, 0.78);
            mouthT = Math.max(mouthT, window4(aT, 0.14, 0.22, 0.74, 0.84));
            pitchT += -0.03 * w; oy += -2 * w;
            break;
        }
        case 'rear-small': {
            const w = window4(aT, 0, 0.3, 0.65, 1);
            rearW = w; pitchT += -0.2 * w; neckT += -0.22 * w; headT += 0.1 * w;
            foreLift = w;
            break;
        }
        case 'shake': {
            const w = window4(aT, 0, 0.12, 0.8, 1);
            const f = time * TAU * 7.5;
            pitchT += 0.06 * Math.sin(f) * w; oy += 2.5 * Math.sin(f * 2) * w; ox += 2 * Math.sin(f + 1) * w;
            neckT += 0.22 * Math.sin(f + 1.1) * w; headT += 0.3 * Math.sin(f + 2.1) * w;
            break;
        }
        case 'stamp': {
            stampLift = window4(aT, 0.05, 0.35, 0.45, 0.55);
            neckT += 0.1 * window4(aT, 0, 0.3, 0.6, 1); headT += 0.08 * window4(aT, 0, 0.3, 0.6, 1);
            break;
        }
        case 'talk': {
            const w = window4(aT, 0, 0.08, 0.92, 1) || (aT === 0 ? 1 : 0);
            neckT += (0.035 * Math.sin(time * TAU * 1.7) + 0.02 * Math.sin(time * TAU * 3.1)) * w;
            headT += (0.05 * Math.sin(time * TAU * 2.3 + 1)) * w;
            const syll = Math.sin(time * TAU * 4.2) + 0.6 * Math.sin(time * TAU * 2.9 + 2);
            mouthT = Math.max(mouthT, (syll > 0.55 ? 0.45 : 0) * w);
            break;
        }
        case 'nod': {
            const w = Math.sin(clamp(aT, 0, 1) * Math.PI * 2);
            neckT += 0.16 * Math.max(0, w) + 0.06 * Math.max(0, -w); headT += 0.22 * Math.max(0, w);
            break;
        }
        case 'lookdown': {
            const w = window4(aT, 0, 0.25, 0.8, 1) || (aT === 0 ? 1 : 0);
            neckT += 0.36 * w; headT += 0.46 * w;
            break;
        }
        default: break;
    }

    // look at: head (and a little neck) toward a world point
    if (s.lookAt && wHide < 0.5) {
        const hx = J.head[0] + 20, hy = J.head[1];
        const lx = (s.lookAt.x - x) * facing, ly = s.lookAt.y - y;
        const ang = Math.atan2(ly - hy, Math.abs(lx - hx) + 1);
        const want = clamp(ang - 0.35, -0.5, 0.6) * (lx - hx < -40 ? 0.3 : 1);
        headT += want * 0.6; neckT += want * 0.35;
    }
    // emotes: eyes and head only
    const emote = s.emote || null;
    if (emote === 'sad') { neckT += 0.18; headT += 0.2; }
    else if (emote === 'happy') { neckT -= 0.06; headT -= 0.08; }
    else if (emote === 'surprised') { neckT -= 0.14; headT -= 0.1; }
    else if (emote === 'sleepy') { neckT += 0.12; headT += 0.16; }

    // swimming: level, tilted with vy; head stays up
    if (wSwim > 0.001) {
        const tilt = clamp(Math.atan2(fvy, Math.abs(fvx) + 120) * 0.9, -0.52, 0.52);
        pitchT = lerp(pitchT, tilt, wSwim);
        oy = lerp(oy, Math.sin(time * TAU * 0.5) * 1.5, wSwim);
        neckT = lerp(neckT, -0.12 - tilt * 0.6 + Math.sin(time * TAU * 0.5 + 1) * 0.03, wSwim);
        headT = lerp(headT, -0.02 - tilt * 0.35, wSwim);
    }
    // air: pitch from vy, stretched
    if (wAir > 0.001) {
        const tilt = clamp(Math.atan2(fvy, Math.abs(fvx) + 200) * 0.7, -0.35, 0.4);
        const stretch = window4(airT, 0.05, 0.25, 0.6, 0.9);
        pitchT = lerp(pitchT, tilt, wAir);
        neckT = lerp(neckT, 0.08 + 0.1 * stretch - tilt * 0.4, wAir);
        headT = lerp(headT, -0.05 - tilt * 0.3, wAir);
        oy = lerp(oy, -4 * stretch, wAir);
    }
    // hide: lie down under the shell
    if (wHide > 0.001) {
        const w = smooth01(wHide);
        oy = lerp(oy, 80, w);
        pitchT = lerp(pitchT, 0.035, w);
        ox = lerp(ox, 0, w);
        neckT = lerp(neckT, 0.95, w);
        headT = lerp(headT, -0.45, w);
    }

    // --- supports: pitch and height from the hooves (ground only) -------------------
    const groundW = wGround * (1 - wHide);
    let fY = 0, hY = 0, nF = 0, nH = 0;
    for (let li = 0; li < 4; li++) {
        const leg = an.legs[li];
        const sy = leg.stance ? (leg.lockY - y) : (leg.toSupport !== undefined ? leg.toSupport : 0);
        if (leg.front) { fY += sy; nF++; } else { hY += sy; nH++; }
    }
    fY /= nF || 1; hY /= nH || 1;
    const span = (rig.legs.foreN.end[0] - rig.legs.hindN.end[0]) || 90;
    const supPitchT = Math.atan2(fY - hY, span) * groundW;
    an.supPitch = first ? supPitchT : damp(an.supPitch, supPitchT, 10, dt);
    const supY = (fY + hY) * 0.5 * groundW;
    pitchT += clamp(an.supPitch, -0.45, 0.45);
    oy += supY;

    // landing absorb: a dip when the air mode ends
    if (an.wasAir && !inAir) an.bodyVY += 260;
    an.wasAir = inAir;

    // pitch and height springs
    if (first) { an.pitch = pitchT; an.pitchV = 0; an.bodyOY = oy; an.bodyVY = 0; an.bodyOX = ox; }
    else {
        const kp = 420, cp = 2 * Math.sqrt(kp) * 0.9;
        an.pitchV += ((pitchT - an.pitch) * kp - an.pitchV * cp) * dt;
        an.pitch += an.pitchV * dt;
        an.bodyOX = damp(an.bodyOX, ox, 14, dt);
    }
    // set the body transform (height finalized after the reach check below)
    const bodyPivotX = bodyC[0], bodyPivotY = bodyC[1];

    // --- legs: targets --------------------------------------------------------------------
    // provisional body transform with the target height to compute body-relative targets
    let bodyOY = first ? oy : an.bodyOY;
    setXf(an.body, bodyPivotX, bodyPivotY, bodyPivotX + an.bodyOX, bodyPivotY + bodyOY, an.pitch);

    // leg phases and locks (ground locomotion)
    const liftF = g.liftF, liftH = g.liftH;
    const sweep = g.duty * g.stride;
    an.settleCool -= dt;
    let swinging = 0;
    for (let li = 0; li < 4; li++) if (!an.legs[li].stance) swinging++;
    for (let i = 0; i < 4; i++) {
        const leg = an.legs[i];
        const restSoleX = leg.ex;
        const fwd = leg.front ? 0.52 : 0.4; // share of the stance sweep ahead of the rest place
        if (jumped) {
            // plant under the body
            leg.stance = true; leg.timeSwing = false;
            leg.lockX = x + (restSoleX + an.bodyOX) * facing;
            leg.lockY = groundAtWorld(an, s, leg.lockX);
            leg.u = 1; leg.stAcc0 = an.phaseAcc;
            continue;
        }
        if (mode === 'air' || mode === 'swim') {
            // off the ground the hooves are free; keep each lock under its hoof for the landing
            leg.stance = true; leg.timeSwing = false; leg.u = 1;
            leg.lockX = x + leg.soleX * facing;
            leg.lockY = groundAtWorld(an, s, leg.lockX);
            leg.stAcc0 = an.phaseAcc;
            continue;
        }
        const p = frac(ph - an.offsets[leg.name]);
        if (moving) {
            if (leg.stance) {
                const lx = (leg.lockX - x) * facing;
                const since = an.phaseAcc - leg.stAcc0;
                const behind = lx < restSoleX + an.bodyOX - sweep * (1 - fwd) - 12;
                if ((p >= g.duty && since > g.duty * 0.45) || behind) {
                    // lift: on the beat, or early when the hoof has fallen too far behind
                    startSwing(an, leg, s, false);
                    const onBeat = p >= g.duty;
                    leg.swSpan = onBeat ? 1 - g.duty : Math.max(0.15, 1 - p);
                    leg.swAcc0 = an.phaseAcc - (onBeat ? p - g.duty : 0);
                    swinging++;
                }
            } else if (leg.timeSwing) {
                // a settle step still going when we start moving: finish it on the phase
                leg.timeSwing = false;
                const r = Math.max(0.1, 1 - p);
                leg.swSpan = r / Math.max(0.05, 1 - leg.u);
                leg.swAcc0 = an.phaseAcc - leg.u * leg.swSpan;
            }
            if (!leg.stance) {
                leg.u = clamp((an.phaseAcc - leg.swAcc0) / Math.max(0.02, leg.swSpan), 0, 1);
                // predicted landing (world): body travel until touchdown + the reach ahead
                const remain = (1 - leg.u) * leg.swSpan;
                leg.targetWX = x + (restSoleX + an.bodyOX + sweep * fwd + remain * g.stride) * facing;
            }
        } else if (!leg.stance) {
            // settle: a time-driven step to the rest place
            if (!leg.timeSwing) { leg.timeSwing = true; leg.swingDur = 0.22; }
            leg.u = Math.min(1, leg.u + dt / leg.swingDur);
            leg.targetWX = x + (restSoleX + an.bodyOX) * facing;
        } else if (groundW > 0.5 && wHide < 0.05 && an.skidW < 0.1 && !act && swinging === 0 && an.settleCool <= 0) {
            // standing: step if this hoof is far from its rest place
            const lx = (leg.lockX - x) * facing;
            const err = Math.abs(lx - (restSoleX + an.bodyOX));
            if (err > 16 && err >= worstErr(an, x, facing)) {
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
            leg.lockY = groundAtWorld(an, s, leg.lockX);
            leg.stAcc0 = an.phaseAcc;
        }
        if (!leg.stance) leg.toSupport = groundAtWorld(an, s, leg.targetWX) - y;
    }
    // skid: planted hooves slide with the body
    if (an.skidW > 0.01) {
        for (let li = 0; li < 4; li++) {
            const leg = an.legs[li];
            if (!leg.stance) continue;
            const want = x + (leg.ex + (leg.front ? 30 : 12) + an.bodyOX) * facing;
            leg.lockX = lerp(leg.lockX, want, clamp(an.skidW * dt * 14, 0, 1));
            leg.lockY = groundAtWorld(an, s, leg.lockX);
        }
    }

    // --- final body height: sink if a planted leg cannot reach ---------------------------
    let need = -1e9;
    if (groundW > 0.01) {
        for (let li = 0; li < 4; li++) {
            const leg = an.legs[li];
            if (!leg.stance) continue;
            if (leg.override > 0.5) continue;
            if (hindKick > 0.2 && !leg.front) continue;
            if ((foreLift > 0.2 || stampLift > 0.2) && leg.front && (foreLift > 0.2 || leg.near)) continue;
            const lx = (leg.lockX - x) * facing, ly = leg.lockY - y - leg.sole;
            // root at the current pitch without height offset
            apply(an.body, leg.rx, leg.ry, Q);
            const r0y = Q.y - bodyOY;
            const dx = lx - Q.x;
            const Lm = (leg.l1 + leg.l2) * 0.985 + 6; // a planted hoof can roll on its toe or heel
            const reachY = Math.sqrt(Math.max(0, Lm * Lm - dx * dx));
            const needOY = ly - r0y - reachY;
            if (needOY > need) need = needOY;
        }
    }
    let targetOY = oy;
    need = Math.min(need, oy + 22); // never sink more than this; a leg that still cannot reach steps
    if (need > targetOY) targetOY = lerp(targetOY, need, groundW);
    if (first) { an.bodyOY = targetOY; an.bodyVY = 0; }
    else {
        const k = 900, c = 2 * Math.sqrt(k) * 0.85;
        an.bodyVY += ((targetOY - an.bodyOY) * k - an.bodyVY * c) * dt;
        an.bodyOY += an.bodyVY * dt;
        // never let a planted leg hang: hard limit
        if (need > an.bodyOY && groundW > 0.5) { an.bodyOY = lerp(an.bodyOY, need, 0.7); }
    }
    bodyOY = an.bodyOY;
    setXf(an.body, bodyPivotX, bodyPivotY, bodyPivotX + an.bodyOX, bodyPivotY + bodyOY, an.pitch);

    // --- leg solve ---------------------------------------------------------------------------
    const C = an.ctx;
    C.x = x; C.y = y; C.facing = facing; C.liftF = liftF; C.liftH = liftH; C.wGround = wGround; C.wSwim = wSwim;
    C.wAir = wAir; C.wHide = wHide; C.airT = airT; C.time = time; C.hindKick = hindKick; C.foreLift = foreLift;
    C.stampLift = stampLift; C.rearW = rearW; C.act = act; C.aT = aT; C.g = g; C.fvx = fvx; C.fvy = fvy;
    for (let li = 0; li < 4; li++) solveLeg(an, an.legs[li], s, C);

    // --- neck and head ------------------------------------------------------------------------
    an.neckAng = first ? neckT : damp(an.neckAng, neckT, 10, dt);
    an.headAng = first ? headT : damp(an.headAng, headT, 12, dt);
    const neckAng = clamp(an.neckAng, -0.7, 1.1), headAng = clamp(an.headAng, -0.7, 0.8);
    setXf(an.neck, J.neck[0], J.neck[1], J.neck[0], J.neck[1], neckAng);
    setXf(an.head, J.head[0], J.head[1], J.head[0], J.head[1], headAng);

    // --- eyes and mouth ------------------------------------------------------------------------
    an.blinkT -= dt;
    if (an.blinkT <= 0 && an.blinkPhase < 0) { an.blinkPhase = 0; an.blinkT = 2.2 + hash(Math.floor(time * 3.1)) * 4; }
    let eye = 0;
    if (an.blinkPhase >= 0) {
        an.blinkPhase += dt;
        const b = an.blinkPhase;
        eye = b < 0.045 ? 1 : b < 0.12 ? 2 : b < 0.165 ? 1 : 0;
        if (b >= 0.165) an.blinkPhase = -1;
    }
    if (emote === 'sleepy' || (emote === 'happy' && eye === 0)) eye = Math.max(eye, 1);
    if (wHide > 0.8) eye = Math.max(eye, 1);
    if (act === 'balk' && aT > 0.6 && aT < 0.75) eye = Math.max(eye, 1);
    if (act === 'neigh' && aT > 0.25 && aT < 0.7) eye = Math.max(eye, 1);
    an.eye = eye;
    an.mouth = mouthT;

    writePose(an, s);
    // --- secondary motion ----------------------------------------------------------------------
    stepChains(an, dt, s, C);
    return an.pose;
}

function worstErr(an, x, facing) {
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

function groundAtWorld(an, s, wx) {
    if (typeof s.groundAt === 'function') {
        const g = s.groundAt(wx);
        if (g !== null && g !== undefined && g === g) return g;
    }
    const lx = (wx - (s.x || 0)) * an.facing;
    return (s.y || 0) - Math.tan(s.groundAngle || 0) * lx;
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

const HOOF_HALF = 13; // half the sole length: roll points (toe ahead, heel behind)
const ROLL = { x: 0, y: 0, a: 0 };

/** Pivot (coronet) for a sole contact at (sx, sy) with hoof angle a, rolled by r about the toe (r > 0) or heel (r < 0). */
function rolledPivot(sx, sy, a, r, sole, out) {
    const ca = Math.cos(a), sa = Math.sin(a);
    const px = r > 0 ? HOOF_HALF : r < 0 ? -HOOF_HALF : 0;
    // roll point on the ground
    const rx = sx + px * ca, ry = sy + px * sa;
    const b = a + r, cb = Math.cos(b), sb = Math.sin(b);
    // pivot relative to the roll point in the hoof frame: (-px, -sole)
    const qx = -px, qy = -sole;
    out.x = rx + qx * cb - qy * sb;
    out.y = ry + qx * sb + qy * cb;
    out.a = b;
    return out;
}

/** Where the sole goes this frame (local), then IK in body space. */
function solveLeg(an, leg, s, c) {
    const { x, y, facing } = c;
    const restSoleX = leg.ex, restSoleY = leg.ey + leg.sole;
    // 1. ground locomotion target (local)
    let gx, gy, ga = 0, lifted = 0;
    if (leg.stance) {
        gx = (leg.lockX - x) * facing; gy = leg.lockY - y;
        ga = groundSlope(an, s, leg.lockX);
    } else {
        // world path from the lift point to the landing point: leaves and lands at ground speed 0
        const u = leg.u, e = smooth01(u);
        const twx = leg.targetWX, twy = groundAtWorld(an, s, twx);
        const wx = lerp(leg.fromWX, twx, e), wy = lerp(leg.fromWY, twy, e);
        applyInv(an.body, (wx - x) * facing, wy - y, Q);
        let bx = Q.x, by = Q.y;
        const lift = (leg.front ? c.liftF : c.liftH) * (leg.timeSwing ? 0.5 : 1);
        const arc = Math.sin(Math.PI * Math.pow(u, leg.front ? 0.75 : 0.9));
        by -= lift * arc;
        if (!leg.timeSwing && leg.front) {
            // the fore flips its lower leg up and back early in the swing (a high tuck)
            const tuck = Math.sin(Math.PI * clamp(u / 0.65, 0, 1)) * c.g.fold;
            bx -= 12 * tuck; by -= 14 * tuck;
        }
        apply(an.body, bx, by, Q);
        gx = Q.x; gy = Q.y;
        lifted = arc;
        ga = groundSlope(an, s, twx) * e;
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
        apply(an.body, bx / w, by / w, Q);
        const k = Math.min(1, w);
        lx = lerp(lx, Q.x, k); ly = lerp(ly, Q.y, k); la = lerp(la, ba / w + an.pitch, k);
    }
    if (ovW > 0.001) {
        apply(an.body, ovX, ovY, Q);
        const k = smooth01(ovW);
        lx = lerp(lx, Q.x, k); ly = lerp(ly, Q.y, k); la = lerp(la, ovA + an.pitch, k);
        lifted = Math.max(lifted, k);
    }
    const hw = c.wHide;
    const free = Math.max(w, ovW, hw);
    leg.soleX = lx; leg.soleY = ly;
    leg.lifted = leg.stance ? Math.max(lifted, free) : Math.max(lifted, 0.2);
    // 3. hoof angle (local, 0 = upright): flat on the ground in stance, flexed in the swing
    let hoofLocal = la;
    if (leg.stance && !leg.front && leg.near && free < 0.5) {
        // weight shifted forward: the near hind rests on the toe of its hoof
        const rest = Math.max(0, an.shift) * (1 - an.moveW);
        if (rest > 0.01) { hoofLocal += 0.55 * rest; ly -= 2 * rest; }
    }
    if (!leg.stance && free < 0.5) {
        const flex = (leg.front ? 1.3 : 0.75) * Math.sin(Math.PI * clamp(leg.u / 0.85, 0, 1)) * (leg.timeSwing ? 0.4 : 1) * (0.4 + 0.6 * c.g.fold);
        hoofLocal = lerp(an.pitch + flex, ga, smooth01((leg.u - 0.8) / 0.2));
    }
    // pivot = sole + R(hoofLocal)·(0, -sole); planted hooves roll on the toe or heel to reach
    rolledPivot(lx, ly, hoofLocal, 0, leg.sole, ROLL);
    if (leg.stance && free < 0.5) {
        applyInv(an.body, ROLL.x, ROLL.y, Q);
        const Lm = (leg.l1 + leg.l2) * 0.998;
        if (Math.hypot(Q.x - leg.rx, Q.y - leg.ry) > Lm) {
            const sign = Q.x < leg.rx ? 1 : -1;
            const maxR = sign > 0 ? 0.75 : 0.35;
            let lo = 0, hi = maxR;
            for (let it = 0; it < 7; it++) {
                const mid = (lo + hi) / 2;
                rolledPivot(lx, ly, hoofLocal, mid * sign, leg.sole, ROLL);
                applyInv(an.body, ROLL.x, ROLL.y, Q);
                if (Math.hypot(Q.x - leg.rx, Q.y - leg.ry) > Lm) lo = mid; else hi = mid;
            }
            rolledPivot(lx, ly, hoofLocal, hi * sign, leg.sole, ROLL);
        }
    }
    hoofLocal = ROLL.a;
    let pvx = ROLL.x, pvy = ROLL.y, relHide = 0;
    if (hw > 0.001) {
        // Göm dig: folded under the body. The fore folds its forearm forward along the ground
        // with the kelp boot tucked back beneath it; the hind leaves its hock behind and lays
        // the kelp boot forward under the belly. Targets are hoof pivots in body space.
        const k = smooth01(hw);
        const tx = leg.rx + (leg.front ? (leg.near ? -14 : -9) : (leg.near ? 3 : 8));
        const ty = leg.ry + (leg.front ? (leg.near ? 22 : 24) : (leg.near ? 41 : 42));
        apply(an.body, tx, ty, Q);
        const gyL = groundLocal(an, s, Q.x) - 3;
        pvx = lerp(pvx, Q.x, k); pvy = lerp(pvy, Math.min(Q.y, gyL), k);
        relHide = k;
    }
    applyInv(an.body, pvx, pvy, Q);
    twoBoneIK(leg.rx, leg.ry, Q.x, Q.y, leg.l1, leg.l2, leg.bend, IK);
    leg.kx = IK.mx; leg.ky = IK.my; leg.hx = IK.ex; leg.hy = IK.ey; leg.reach = IK.reach;
    leg.upperRot = Math.atan2(IK.my - leg.ry, IK.mx - leg.rx) - leg.upA;
    leg.lowerRot = Math.atan2(IK.ey - IK.my, IK.ex - IK.mx) - leg.loA;
    // the hoof sprite is drawn upright: its rotation in body space, within what a fetlock allows
    const hr = hoofLocal - an.pitch;
    const cannon = Math.atan2(IK.ey - IK.my, IK.ex - IK.mx) - Math.PI / 2;
    let rel = clamp(hr - cannon, -0.9, leg.front ? 2.2 : 1.7);
    if (relHide > 0) rel = lerp(rel, leg.front ? 0.5 : 0.35, relHide);
    leg.hoofRot = cannon + rel;
}

function groundSlope(an, s, wx) {
    if (typeof s.groundAt !== 'function') return -(s.groundAngle || 0);
    const a = groundAtWorld(an, s, wx - 6), b = groundAtWorld(an, s, wx + 6);
    return Math.atan2(b - a, 12) * an.facing;
}

/** Swimming: legs paddle (body space sole positions, and the hoof angle). */
function swimPose(an, leg, c, out) {
    const f = c.time * TAU * (0.9 + Math.min(1.3, Math.hypot(an.vx, an.vy) / 300));
    const ph = f + (leg.front ? 0 : Math.PI * 0.9) + (leg.near ? 0 : Math.PI);
    const restX = leg.ex, restY = leg.ey + leg.sole;
    if (leg.front) {
        out.x = restX + 16 + Math.cos(ph) * 20;
        out.y = restY - 34 + Math.sin(ph) * 13;
        out.a = 0.9 + Math.sin(ph) * 0.4;
    } else {
        out.x = restX - 16 + Math.cos(ph) * 18;
        out.y = restY - 22 + Math.sin(ph) * 10;
        out.a = 0.2 + Math.sin(ph) * 0.4;
    }
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
const ACC_KEYS = ['stride', 'duty', 'liftF', 'liftH', 'bobA', 'bobH', 'bobP', 'pitchA', 'pitchH', 'pitchP', 'neckA', 'neckH', 'neckP', 'low', 'lean', 'fold'];
function blendGait(an, gaitName, moving, speed, dt, first) {
    const g = an.g, acc = an.acc;
    let wsum = 0;
    for (let k = 0; k < ACC_KEYS.length; k++) acc[ACC_KEYS[k]] = 0;
    for (let gi = 0; gi < GAIT_KEYS.length; gi++) {
        const key = GAIT_KEYS[gi];
        const w = an.gaitW[key];
        if (w < 1e-4) continue;
        const G = GAITS[key];
        const sf = clamp(Math.sqrt(Math.max(1, speed) / G.v), 0.55, 1.25);
        acc.stride += G.stride * sf * w; acc.duty += G.duty * w;
        acc.liftF += G.lift[0] * w; acc.liftH += G.lift[1] * w;
        acc.bobA += G.bob[0] * w; acc.bobH += G.bob[1] * w; acc.bobP += G.bob[2] * w;
        acc.pitchA += G.pitch[0] * w; acc.pitchH += G.pitch[1] * w; acc.pitchP += G.pitch[2] * w;
        acc.neckA += G.neck[0] * w; acc.neckH += G.neck[1] * w; acc.neckP += G.neck[2] * w;
        acc.low += G.low * w; acc.lean += G.lean * w; acc.fold += G.fold * w;
        wsum += w;
    }
    if (wsum > 1e-4) {
        for (let k = 0; k < ACC_KEYS.length; k++) g[ACC_KEYS[k]] = acc[ACC_KEYS[k]] / wsum;
        // amplitudes fade with the blend weight toward standing
        const m = Math.min(1, wsum);
        g.bobA *= m; g.pitchA *= m; g.neckA *= m; g.low *= m; g.lean *= m;
    } else {
        g.bobA = 0; g.pitchA = 0; g.neckA = 0; g.low = 0; g.lean = 0;
    }
    // leg offsets move toward the target gait's (shortest way round)
    if (moving && GAITS[gaitName]) {
        const T = GAITS[gaitName].offsets;
        for (let li = 0; li < LEG_ORDER.length; li++) {
            const leg = LEG_ORDER[li];
            const d = wrapHalf(T[leg] - an.offsets[leg]);
            an.offsets[leg] = first ? T[leg] : frac(an.offsets[leg] + d * (1 - Math.exp(-8 * dt)));
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
    const b = an.body;
    // body-level parts share the body transform
    place(parts.body, b, b.cx, b.cy, b.r);
    place(parts.torso, b, rig.parts.torso.pivot[0], rig.parts.torso.pivot[1], b.r);
    place(parts.shell, b, rig.parts.shell.pivot[0], rig.parts.shell.pivot[1], b.r);
    // neck: rotate about its base (body space), then the body
    apply(b, J.neck[0], J.neck[1], Q);
    parts.neck.x = Q.x; parts.neck.y = Q.y; parts.neck.rot = b.r + an.neck.r;
    // head: the head joint carried by the neck
    headPoint(an, J.head[0], J.head[1], false);
    parts.head.x = Q.x; parts.head.y = Q.y; parts.head.rot = b.r + an.neck.r + an.head.r;
    headPoint(an, J.eye[0], J.eye[1], true);
    parts.eye.x = Q.x; parts.eye.y = Q.y; parts.eye.rot = parts.head.rot;
    headPoint(an, J.mouth[0], J.mouth[1], true);
    parts.mouth.x = Q.x; parts.mouth.y = Q.y; parts.mouth.rot = parts.head.rot;
    parts.mouth.visible = an.mouth > 0.3;
    pose.eye = an.eye; pose.mouth = an.mouth;
    // legs
    let sx = 0, sw = 0, minX = 1e9, maxX = -1e9, sy = 0;
    for (let li = 0; li < 4; li++) {
        const leg = an.legs[li];
        const up = leg.pUpper, lo = leg.pLower, hf = leg.pHoof, sh = leg.pShadow;
        apply(b, leg.rx, leg.ry, Q); up.x = Q.x; up.y = Q.y; up.rot = b.r + leg.upperRot;
        apply(b, leg.kx, leg.ky, Q); lo.x = Q.x; lo.y = Q.y; lo.rot = b.r + leg.lowerRot;
        // the lower sprite is anchored at the rest middle joint: shift so it sits on the solved knee
        apply(b, leg.hx, leg.hy, Q); hf.x = Q.x; hf.y = Q.y; hf.rot = b.r + leg.hoofRot;
        // hoof shadows
        const planted = leg.stance ? clamp(1 - leg.lifted, 0, 1) : 0;
        const gy = groundLocal(an, s, leg.soleX);
        const hgt = Math.max(0, gy - leg.soleY);
        sh.x = leg.soleX; sh.y = gy; sh.alpha = clamp(1 - hgt / 30, 0, 1) * (1 - an.wSwim) * (leg.near ? 0.85 : 0.6);
        sh.sx = clamp(1 - hgt / 60, 0.4, 1);
        sx += leg.soleX * (0.3 + planted); sw += 0.3 + planted; sy += gy;
        if (leg.soleX < minX) minX = leg.soleX; if (leg.soleX > maxX) maxX = leg.soleX;
    }
    const cx = sx / sw;
    const gyc = groundLocal(an, s, cx);
    const bodyH = Math.max(0, gyc - (b.ty + 20) - (-(rig.body.pivot[1]) - 20));
    pose.shadow.x = cx;
    pose.shadow.y = gyc;
    pose.shadow.w = clamp((maxX - minX + 90) / 170, 0.55, 1.3) * (1 - 0.3 * an.wHide) + 0.25 * an.wHide;
    pose.shadow.alpha = clamp(1 - bodyH / 160, 0.15, 1) * (1 - an.wSwim) * 0.9;
    pose.bodyX = b.tx; pose.bodyY = b.ty; pose.pitch = b.r; pose.neck = an.neck.r; pose.head = an.head.r;
    pose.wet = an.wet;
}

/** A head-space point carried through head, neck and body transforms (into Q). */
function headPoint(an, x, y, withHead) {
    let px = x, py = y;
    if (withHead) { apply(an.head, px, py, Q); px = Q.x; py = Q.y; }
    apply(an.neck, px, py, Q); px = Q.x; py = Q.y;
    apply(an.body, px, py, Q);
    return Q;
}
function neckPoint(an, x, y) {
    apply(an.neck, x, y, Q);
    const px = Q.x, py = Q.y;
    apply(an.body, px, py, Q);
    return Q;
}

// ---------------------------------------------------------------------------
// Secondary motion
// ---------------------------------------------------------------------------
const ENV = { gx: 0, gy: 0, wx: 0, wy: 0, drag: 0, ax: 0, ay: 0, ground: NaN };

function stepChains(an, dt, s, c) {
    const swim = c.wSwim;
    // relative wind: the air (or water) at rest in the world, seen from the moving frame
    const wx = -an.vx, wy = -an.vy;
    // the dock lifts the tail with speed (and it trails level when swimming)
    const sp = Math.min(1, Math.abs(an.vx) / 1100);
    an.tailLift = damp(an.tailLift || 0, lerp(0.75 * sp * sp, 0.25 + 0.9 * sp, swim), 4, dt);
    for (let ci = 0; ci < an.chains.length; ci++) {
        const ch = an.chains[ci];
        // carried rest pose -> targets
        for (let i = 0; i < ch.n; i++) {
            const rx = ch.restX[i], ry = ch.restY[i];
            if (ch.parent === 'neck') neckPoint(an, rx, ry);
            else if (ch.parent === 'head') headPoint(an, rx, ry, true);
            else if (ch.parent === 'body') apply(an.body, rx, ry, Q);
            else {
                // a leg: carried by the lower leg (rotation about the rest middle joint, moved to the knee)
                const leg = an.legs[an.legIndex[ch.parent]];
                const a = leg.lowerRot, cs = Math.cos(a), sn = Math.sin(a);
                const dx = rx - leg.mx, dy = ry - leg.my;
                apply(an.body, leg.kx + dx * cs - dy * sn, leg.ky + dx * sn + dy * cs, Q);
            }
            ch.tx[i] = Q.x; ch.ty[i] = Q.y;
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
        // air: gravity + drag; water: buoyancy + strong drag
        const grav = isTail ? 820 : isFringe ? 700 : 520;
        ENV.gx = 0;
        ENV.gy = lerp(grav, isFringe ? -300 : isTail ? -120 : -260, swim);
        ENV.drag = lerp(isTail ? 1.6 : isFringe ? 1.8 : 2.8, 4.5, swim);
        // air pushes like v², so a walk barely lifts the hair and a gallop streams it
        const vq = Math.min(1.2, Math.abs(an.vx) / 900);
        const windK = lerp((isTail ? 1.35 : 1.1) * (0.25 + 0.75 * vq), 0.6, swim);
        ENV.wx = wx * windK; ENV.wy = wy * windK * 0.5;
        ENV.ax = an.ax * (isFringe ? 0.3 : 0.6); ENV.ay = an.ay * 0.2;
        ENV.ground = ch.collide ? groundLocal(an, s, ch.x[ch.n - 1] || 0) : NaN;
        if (isTail && an.kickTail) {
            // a swish: the lower tail flicks back and forth
            for (let i = 2; i < ch.n; i++) ch.vx[i] += an.kickTail * 150 * (i / (ch.n - 1));
        }
        if (ch.group === 'forelock' && an.kickForelock) {
            for (let i = 1; i < ch.n; i++) { ch.vy[i] -= 90 * (i / (ch.n - 1)); ch.vx[i] += 40 * (i / (ch.n - 1)); }
        }
        stepChain(ch, dt, ENV);
        // spread: the tail fans and the fringe flares under water
        ch.spread = 1 + swim * (isTail ? 0.35 : isFringe ? 0.3 : 0.1);
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
