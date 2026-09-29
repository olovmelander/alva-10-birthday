/*
 * Sköldhästen – movement simulation (pure: no DOM, no Pixi).
 *
 * World units: 1 HL (horse length) = 200 wu, y points down.
 * The player's position is the ground contact point under the middle of the body.
 *
 * Terrain is a set of x-monotonic surfaces (polylines) that can switch on and off
 * with flags. Walls are implied where a surface meets a much higher one, plus a
 * few explicit walls. Edges (språngkanter and balk points) guard every gap, so
 * there are no pits: the sköldhäst refuses instead of falling.
 *
 * stepPlayer(p, input, world, dt, events) advances one fixed step (1/120 s) and
 * pushes events ({ type, ... }) for the game layer (sound, puzzles, effects).
 */

export const HL = 200;
export const STEP = 1 / 120;

export const C = {
    walk: 320, trot: 640, gallop: 1200, gallopMin: 1000,
    gallopDefl: 0.72,        // stick deflection that asks for a full gallop
    accel: 1350, brake: 2000, turnSkid: 0.35,
    stepUp: 52, snapDown: 70, maxSlope: Math.tan(36 * Math.PI / 180),
    gravity: 2600, hopHeight: 125, buckHeight: 105, hopBuffer: 0.18,
    swimMax: 520, swimAccel: 1250, swimDrag: 1.6, floatDepth: 130, surfaceBand: 200,
    wadeMax: 120, wadeExit: 80, sinkSpeed: 160, buoyancy: 60,
    hideTime: 0.3, unhideHold: 0.5,
    edgeMargin: 26,
    dolphinSpeed: 300, dolphinHeight: 150
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
export function heightOn(pts, x) {
    if (x < pts[0][0] - 0.01 || x > pts[pts.length - 1][0] + 0.01) return null;
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (pts[mid][0] <= x) lo = mid; else hi = mid;
    }
    const [x0, y0] = pts[lo], [x1, y1] = pts[hi];
    if (x1 === x0) return Math.min(y0, y1);
    const t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
    return y0 + (y1 - y0) * t;
}

export function slopeOn(pts, x) {
    for (let i = 1; i < pts.length; i++) {
        if (x <= pts[i][0] || i === pts.length - 1) {
            const dx = pts[i][0] - pts[i - 1][0];
            return dx ? (pts[i][1] - pts[i - 1][1]) / dx : 0;
        }
    }
    return 0;
}

/** Nearest point on a polyline: { d, t (0..1 along whole line), tx, ty (unit tangent), px, py, i } */
export function nearestOnLine(pts, x, y, lens) {
    let best = null, acc = 0;
    for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
        let u = ((x - ax) * dx + (y - ay) * dy) / (L * L);
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        const px = ax + dx * u, py = ay + dy * u;
        const d = Math.hypot(x - px, y - py);
        if (!best || d < best.d) best = { d, s: acc + u * L, tx: dx / L, ty: dy / L, px, py, i };
        acc += L;
    }
    if (best) best.t = best.s / (lens?.total || acc || 1);
    return best;
}

export function lineLength(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return L;
}

export function pointAt(pts, s) {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const L = Math.hypot(bx - ax, by - ay);
        if (acc + L >= s || i === pts.length - 1) {
            const u = L ? Math.min(1, Math.max(0, (s - acc) / L)) : 0;
            return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u, tx: (bx - ax) / (L || 1), ty: (by - ay) / (L || 1) };
        }
        acc += L;
    }
    const p = pts[pts.length - 1];
    return { x: p[0], y: p[1], tx: 1, ty: 0 };
}

/** Evaluate a flag condition: undefined → true; 'a' → has a; '!a' → not a; ['a','b'] → all. */
export function cond(c, flags) {
    if (c === undefined || c === null) return true;
    if (Array.isArray(c)) return c.every((k) => cond(k, flags));
    if (typeof c === 'function') return !!c(flags);
    if (c[0] === '!') return !flags.has(c.slice(1));
    return flags.has(c);
}

// ---------------------------------------------------------------------------
// Terrain view of a scene under the current flags
// ---------------------------------------------------------------------------
export class Terrain {
    constructor(scene, flags) {
        this.scene = scene;
        this.flags = flags;
        this.refresh();
    }
    refresh() {
        this.revision = (this.revision || 0) + 1;
        this.dirty = false;
        const s = this.scene, f = this.flags, previous = this.surfaces || [];
        this.rampAddedAt ||= new Map();
        this.rampGrowth ||= new Map();
        this.surfaces = (s.surfaces || []).filter((q) => cond(q.when, f)).map(q => this.rampGrowth.get(q.id)?.surface || q);
        for (const ramp of this.surfaces) if (ramp.ramp && !previous.some(q => q.id === ramp.id)) this.rampAddedAt.set(ramp.id, this.revision);
        this.walls = (s.walls || []).filter((q) => cond(q.when, f));
        this.edges = (s.edges || []).filter((q) => cond(q.when, f));
        this.waters = (s.waters || []).filter((q) => cond(q.when, f));
        this.lanes = (s.lanes || []).filter((q) => cond(q.when, f));
        this.vortices = (s.vortices || []).filter((q) => cond(q.when, f));
        this.kelpBeds = (s.kelpBeds || []).filter((q) => cond(q.when, f));
        this.dashed = (s.dashed || []).filter((q) => cond(q.when, f) && !f.has(q.flag));
        this.hurdles = (s.hurdles || []).filter((q) => cond(q.when, f));
        for (const l of this.lanes) if (!l._len) l._len = lineLength(l.pts);
        for (const d of this.dashed) if (!d._len) d._len = lineLength(d.pts);
    }
    /** A newly earned ramp rises from the old shelf. Restored flags have no transient growth state. */
    startRampGrowth(id, duration = 0.65) {
        const raw = this.scene.surfaces.find(s => s.id === id && s.ramp);
        if (!raw || this.rampGrowth.has(id) || this.surfaces.some(s => s.id === id)) return false;
        const x0 = raw.pts[0][0], x1 = raw.pts.at(-1)[0];
        const underneath = this.surfaces.filter(s => s.id !== id && !s.thin);
        const xs = [...new Set([x0, x1, ...raw.pts.map(p => p[0]), ...underneath.flatMap(s => s.pts.map(p => p[0]).filter(x => x > x0 && x < x1))])].sort((a, b) => a - b);
        const base = [], target = [], pts = [];
        for (const x of xs) {
            // At a terrace endpoint, sample inward so the old upper ledge does not
            // masquerade as the lower shelf from which the ramp grows.
            const sx = x === x0 ? x + 0.1 : x === x1 ? x - 0.1 : x;
            let floor = Infinity;
            for (const s of underneath) {
                const y = heightOn(s.pts, sx);
                if (y !== null && y < floor) floor = y;
            }
            const to = heightOn(raw.pts, x), from = floor === Infinity ? to : Math.max(to, floor);
            base.push(from); target.push(to); pts.push([x, from]);
        }
        this.rampGrowth.set(id, { elapsed: 0, duration: Math.max(STEP, duration), base, target, surface: { ...raw, pts, growing: true } });
        return true;
    }
    /** Called only by the fixed simulation step; rendering reads these same active points. */
    advance(dt) {
        if (!this.rampGrowth.size) return false;
        for (const [id, growth] of this.rampGrowth) {
            growth.elapsed = Math.min(growth.duration, growth.elapsed + dt);
            const t = growth.elapsed / growth.duration, eased = t * t * (3 - 2 * t);
            for (let i = 0; i < growth.surface.pts.length; i++) growth.surface.pts[i][1] = growth.base[i] + (growth.target[i] - growth.base[i]) * eased;
            if (t === 1) this.rampGrowth.delete(id);
        }
        this.refresh();
        return true;
    }
    /** Topmost surface at x whose height is at or below `yFeet - up` (i.e. not higher than a step above the feet). */
    support(x, yFeet, up = C.stepUp, down = Infinity, skip = null) {
        let best = null, by = Infinity;
        for (const s of this.surfaces) {
            if (skip && s.id === skip) continue;
            const y = heightOn(s.pts, x);
            if (y === null) continue;
            if (y < yFeet - up || y > yFeet + down) continue;
            if (y < by) { by = y; best = s; }
        }
        return best ? { s: best, y: by } : null;
    }
    /** Highest surface at x that is above the feet by more than a step (a wall), within `reach`. */
    wallAbove(x, yFeet, reach = 400) {
        for (const s of this.surfaces) {
            if (s.thin) continue;
            const y = heightOn(s.pts, x);
            if (y === null) continue;
            if (y < yFeet - C.stepUp && y > yFeet - reach) return s;
        }
        for (const w of this.walls) {
            if (Math.abs(w.x - x) < 8 && yFeet > w.y0 && yFeet - 40 < w.y1) return w;
        }
        return null;
    }
    /** Is there an explicit wall between x0 and x1 at this height? */
    wallBetween(x0, x1, yFeet, dir) {
        for (const w of this.walls) {
            // only a wall ahead counts: one just behind (touching it from its own side) must never hold the sköldhäst
            if (dir > 0 ? (w.x >= x0 && w.x <= x1) : (w.x <= x0 && w.x >= x1)) {
                if (yFeet > w.y0 && yFeet - 60 < w.y1 && (w.dir === undefined || w.dir === dir)) return w;
            }
        }
        return null;
    }
    floorAt(x, fromY = -1e9) { const r = this.support(x, fromY, 0); return r ? r.y : null; }
    /** The nearest surface at or below y (for swimmers and falling things). */
    floorBelow(x, y, up = 30) { const r = this.support(x, y, up, Infinity); return r ? r.y : null; }
    /** Is (x, y) inside solid ground (below the top of a non-thin surface)? */
    insideSolid(x, y, tol = 12) {
        for (const s of this.surfaces) {
            if (s.thin) continue;
            const sy = heightOn(s.pts, x);
            if (sy !== null && sy < y - tol) return true;
        }
        return false;
    }
    groundBelow(x, yFeet) { const r = this.support(x, yFeet, C.stepUp); return r ? r.y : null; }
    /** Ground a hoof could stand on near the feet (null over a gap or an edge: the rig then keeps to the ground it has). */
    groundNear(x, yFeet, down = 90) { const r = this.support(x, yFeet, C.stepUp, down); return r ? r.y : null; }
    /** Follow the reachable surface to a projected hoof, not a floor hidden beneath an uphill ramp. */
    hoofGround(x, fromX, yFeet) {
        const steps = Math.max(1, Math.ceil(Math.abs(x - fromX) / 24));
        let y = yFeet;
        for (let i = 1; i <= steps; i++) {
            const sx = fromX + (x - fromX) * i / steps;
            let next = Infinity;
            for (const surface of this.surfaces) {
                const sy = heightOn(surface.pts, sx);
                if (sy !== null && sy >= y - C.stepUp && sy <= y + 90 && sy < next) next = sy;
            }
            if (next === Infinity) return null;
            y = next;
        }
        return y;
    }
    waterAt(x, y) {
        for (const w of this.waters) {
            if (x >= w.x0 && x <= w.x1 && y > w.top - 4 && (w.bottom === undefined || y < w.bottom)) return w;
        }
        return null;
    }
    waterColumn(x) {
        for (const w of this.waters) if (x >= w.x0 && x <= w.x1) return w;
        return null;
    }
    edgeCrossed(x0, x1, y, dir) {
        let best = null;
        for (const e of this.edges) {
            if (e.dir !== dir) continue;
            if (Math.abs(y - e.y) > (e.dy ?? 90)) continue;
            const hit = dir > 0 ? (x0 <= e.x && x1 > e.x - 0.001) : (x0 >= e.x && x1 < e.x + 0.001);
            if (hit && (!best || Math.abs(e.x - x0) < Math.abs(best.x - x0))) best = e;
        }
        return best;
    }
    dashedStart(x0, x1, y, dir) {
        for (const d of this.dashed) {
            if (d.kind === 'lane') continue;
            if (d.inkWhen && !cond(d.inkWhen, this.flags)) continue; // drawn, but not inkable yet
            const start = dir > 0 ? d.pts[0] : d.pts[d.pts.length - 1];
            if (!d.bothWays && dir !== (d.dir || 1)) continue;
            const hit = dir > 0 ? (x0 <= start[0] && x1 >= start[0] - 0.01) : (x0 >= start[0] && x1 <= start[0] + 0.01);
            if (hit && Math.abs(y - start[1]) < 60) return d;
        }
        return null;
    }
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
export function createPlayer(spawn = {}) {
    return {
        x: spawn.x || 0, y: spawn.y || 0, px: spawn.x || 0, py: spawn.y || 0,
        vx: 0, vy: 0, facing: spawn.facing || 1,
        mode: spawn.mode || 'ground',
        hidden: false, hide: 0, hideQueued: false, stickHold: 0,
        speed: 0, gait: 'stand', gaitPhase: 0, lastBeat: 0,
        groundAngle: 0, groundSlope: 0, stride: 190, terrainRevision: 0, surface: null,
        water: null, submerge: 0, wet: 0, wetTimer: 0,
        action: null, actionT: 0, actionDur: 0,
        airT: 0, leap: null, streck: null, jump: null,
        skid: 0, balkCooldown: 0, lockInput: 0, hopBuf: 0, dropThrough: null, dropY: 0,
        still: 0, moveNoise: 0,
        auto: null, // scripted run: { dir, speed }
        nudge: null, // a short scripted step: { x, t } (after Knuffa the sköldhäst follows the stone)
        inLane: null, inVortex: null, anchored: false, resting: false
    };
}

function setAction(p, name, dur, events) {
    p.action = name; p.actionT = 0; p.actionDur = dur;
    if (events) events.push({ type: 'action', name });
}

function gaitFor(speed) {
    if (speed < 20) return 'stand';
    if (speed < 480) return 'walk';
    if (speed < 860) return 'trot';
    if (speed < 1000) return 'canter';
    return 'gallop';
}
// Match the rig's nominal distance per cycle and touchdown offsets.
const STRIDE = { walk: 190, trot: 270, canter: 360, gallop: 460 };
const GAIT_SPEED = { walk: 320, trot: 640, canter: 900, gallop: 1200 };
const BEATS = { walk: [0, 0.25, 0.5, 0.75], trot: [0, 0.5], canter: [0, 0.2, 0.42], gallop: [0, 0.12, 0.34, 0.46] };
const FEET = { walk: [2, 3, 0, 1], trot: [2, 0], canter: [0, 2, 3], gallop: [0, 2, 1, 3] };

/**
 * One fixed step.
 * input: { x, y, hop, hide, auto }  (x, y in -1..1; hop/hide are "pressed this step")
 */
export function stepPlayer(p, input, world, dt, events) {
    const T = world.terrain;
    T.advance(dt);
    p.px = p.x; p.py = p.y;
    if (p.terrainRevision !== T.revision) {
        if (p.mode === 'ground' && p.surface) {
            let grown = null, y = p.y;
            for (const ramp of T.surfaces) {
                if (!ramp.ramp || (T.rampAddedAt.get(ramp.id) || 0) <= p.terrainRevision) continue;
                const ry = heightOn(ramp.pts, p.x);
                if (ry !== null && ry < y) { y = ry; grown = ramp; }
            }
            if (grown) {
                const rise = p.y - y;
                p.y = p.py = y; p.surface = grown; p.vy = 0;
                events.push({ type: 'rampLift', id: grown.id, x: p.x, y, rise });
            }
        }
        p.terrainRevision = T.revision;
    }
    if (p.balkCooldown > 0) p.balkCooldown -= dt;
    if (p.lockInput > 0) p.lockInput -= dt;
    // Hoppa pressed a moment before landing still hops when the hooves touch down
    if (p.hopBuf > 0) p.hopBuf -= dt;
    if (input.hop && (p.mode === 'air' || p.mode === 'leap')) p.hopBuf = C.hopBuffer;
    if (p.action) {
        p.actionT += dt / (p.actionDur || 1);
        if (p.actionT >= 1) { p.action = null; p.actionT = 0; }
    }
    let ix = p.lockInput > 0 ? 0 : (input.x || 0);
    let iy = p.lockInput > 0 ? 0 : (input.y || 0);
    if (p.auto) { ix = p.auto.dir; iy = 0; }
    if (p.nudge) {
        p.nudge.t -= dt;
        const ndx = p.nudge.x - p.x;
        if (p.nudge.t <= 0 || Math.abs(ndx) < 6 || p.mode !== 'ground' || p.hidden) p.nudge = null;
        else { ix = Math.sign(ndx) * Math.min(0.6, Math.max(0.15, Math.abs(ndx) / 150)); iy = 0; } // slows down as it arrives
    }

    // --- Göm dig toggle -------------------------------------------------------
    if (input.hide && p.lockInput <= 0 && !p.auto) {
        if (p.hidden) unhide(p, events);
        else if (p.mode === 'leap' || p.mode === 'streck' || p.mode === 'air' || p.jump) p.hideQueued = true;
        else p.hideQueued = true;
    }
    if (p.hideQueued && !p.hidden && (p.mode === 'ground' || p.mode === 'swim') && !p.jump) {
        if (p.mode === 'swim' || Math.abs(p.vx) < 60) {
            p.hidden = true; p.hideQueued = false; p.resting = false;
            events.push({ type: 'hide' });
        }
    }
    const hideTarget = p.hidden ? 1 : 0;
    p.hide += Math.sign(hideTarget - p.hide) * Math.min(Math.abs(hideTarget - p.hide), dt / C.hideTime);

    // coming out by holding the stick on flat ground
    if (p.hidden && p.mode === 'ground') {
        if (Math.abs(ix) > 0.5) { p.stickHold += dt; if (p.stickHold >= C.unhideHold) unhide(p, events); }
        else p.stickHold = 0;
    }

    // down on a plank over water (the pier): drop in
    if (p.mode === 'ground' && iy > 0.7 && Math.abs(ix) < 0.5 && Math.abs(p.vx) < 300 && p.surface?.dropIn && !p.hidden) dropIn(p, world, events);

    switch (p.mode) {
        case 'ground': stepGround(p, ix, input, world, dt, events); break;
        case 'air': stepAir(p, ix, input, world, dt, events); break;
        case 'leap': stepLeap(p, world, dt, events); break;
        case 'streck': stepStreck(p, world, dt, events); break;
        case 'swim': stepSwim(p, ix, iy, input, world, dt, events); break;
    }

    // wet coat
    if (p.submerge > 0.05) { p.wet = 1; p.wetTimer = 30; }
    else if (p.wetTimer > 0) { p.wetTimer -= dt; if (p.wetTimer <= 0) p.wet = 0; }

    // stillness around (for pools): moving makes ripples
    const moving = Math.hypot(p.x - p.px, p.y - p.py) / dt;
    p.moveNoise = moving > 5 || p.action === 'shake' || p.action === 'stamp' ? 1 : (p.hidden && p.hide > 0.95 ? 0 : 0.3);
    p.speed = p.mode === 'swim' ? Math.hypot(p.vx, p.vy) : Math.abs(p.vx);
    if (p.mode === 'ground' || p.mode === 'streck') {
        p.gait = p.skid > 0 ? 'skid' : gaitFor(Math.abs(p.vx));
        stepBeats(p, dt, events);
    } else if (p.mode !== 'swim') p.gait = p.leap ? 'gallop' : p.gait;
    else p.gait = 'stand';
    if (T.dirty) T.refresh();
}

function stepBeats(p, dt, events) {
    const g = p.gait;
    if (!STRIDE[g]) { p.gaitPhase = 0; return; }
    const prev = p.gaitPhase;
    const stride = STRIDE[g] * Math.max(0.55, Math.min(1.25, Math.sqrt(Math.abs(p.vx) / GAIT_SPEED[g])));
    p.stride += (stride - p.stride) * (1 - Math.exp(-9 * dt));
    p.gaitPhase = (p.gaitPhase + Math.abs(p.vx) * dt / p.stride) % 1;
    for (let foot = 0; foot < BEATS[g].length; foot++) {
        const b = BEATS[g][foot];
        const crossed = prev <= p.gaitPhase ? (b > prev && b <= p.gaitPhase) : (b > prev || b <= p.gaitPhase);
        if (crossed) events.push({ type: 'hoof', foot: FEET[g][foot], surface: p.surface?.mat || 'sand', hollow: !!p.surface?.hollow, speed: Math.abs(p.vx), x: p.x, y: p.y, wading: p.submerge > 0 });
    }
}

function unhide(p, events) {
    p.hidden = false; p.hideQueued = false; p.stickHold = 0; p.anchored = false; p.resting = false;
    events.push({ type: 'unhide' });
}

// --- ground -----------------------------------------------------------------
function stepGround(p, ix, input, world, dt, events) {
    const T = world.terrain;
    const dir = Math.sign(ix);
    const defl = Math.abs(ix);
    let target = 0;
    if (!p.hidden && !p.hideQueued && dir !== 0) {
        target = defl >= C.gallopDefl ? C.gallop : (defl / C.gallopDefl) * 850;
        if (p.auto) target = p.auto.speed || C.gallop;
    }
    // uphill/downhill feel
    const slope = p.surface ? slopeOn(p.surface.pts, p.x) : 0;
    p.groundSlope += (slope - p.groundSlope) * (1 - Math.exp(-10 * dt));
    const along = p.groundSlope * Math.sign(p.vx || dir || p.facing);
    target *= 1 + Math.max(-0.1, Math.min(0.08, along * 0.22));

    // skid when reversing at speed
    if (p.skid > 0) {
        p.skid -= dt;
        p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), C.brake * 1.4 * dt);
        if (p.skid <= 0 || Math.abs(p.vx) < 1) {
            p.skid = 0;
            if (dir) p.facing = dir; // releasing/correcting the stick must not force an unwanted turn
        }
    } else if (dir !== 0 && dir !== Math.sign(p.vx) && Math.abs(p.vx) > 700 && !p.hidden) {
        p.skid = C.turnSkid;
        events.push({ type: 'skid' });
    } else {
        const cur = p.vx * (dir || Math.sign(p.vx) || 1);
        if (dir !== 0 && !p.hidden && !p.hideQueued) {
            p.facing = dir;
            const v = Math.abs(p.vx) * (Math.sign(p.vx) === dir ? 1 : -1);
            let nv;
            if (v < target) nv = Math.min(target, v + C.accel * (v < 300 ? 1.5 : 1) * dt * (p.auto ? 1.4 : 1));
            else nv = Math.max(target, v - C.brake * dt);
            p.vx = nv * dir;
        } else {
            const s = Math.sign(p.vx);
            p.vx -= s * Math.min(Math.abs(p.vx), C.brake * dt);
            void cur;
        }
    }
    if (p.action === 'balk' || p.action === 'shake' || p.action === 'stamp') p.vx *= 0.8;

    // Hoppa (or a press buffered just before landing)
    if ((input.hop || p.hopBuf > 0) && !p.hidden && !p.jump) {
        p.hopBuf = 0;
        startHop(p, world, events);
        if (p.mode !== 'ground') return;
    }

    let nx = p.x + p.vx * dt;
    const mdir = Math.sign(p.vx);
    if (mdir !== 0) {
        // dashed lines: gallop onto them, or refuse
        const d = T.dashedStart(p.x, nx, p.y, mdir);
        if (d) {
            if (Math.abs(p.vx) >= C.gallopMin && !p.hideQueued) { startStreck(p, d, mdir, events); return; }
            if (d.balk !== false) { balk(p, (mdir > 0 ? d.pts[0][0] : d.pts[d.pts.length - 1][0]) - mdir * C.edgeMargin, 'thin', events, d); return; }
        }
        // edges
        const e = T.edgeCrossed(p.x, nx, p.y, mdir);
        if (e) {
            if (e.kind === 'sprang' && Math.abs(p.vx) >= C.gallopMin && cond(e.needs, world.flags)) { startLeap(p, e, events); return; }
            if (e.kind !== 'pass') {
                const reason = e.kind === 'sprang' ? (!cond(e.needs, world.flags) ? (e.needsReason || 'edge') : 'slow') : (e.reason || e.kind);
                balk(p, e.x - mdir * C.edgeMargin, reason, events, e); return;
            }
        }
        // explicit walls
        const w = T.wallBetween(p.x, nx, p.y, mdir);
        if (w) {
            // stop short of the wall (never behind where we were)
            nx = mdir > 0 ? Math.max(Math.min(p.x, w.x - 1), w.x - 30) : Math.min(Math.max(p.x, w.x + 1), w.x + 30);
            if (Math.abs(p.vx) > 200) events.push({ type: 'bump', wall: w.id });
            p.vx = 0;
            if (w.balk) balk(p, nx, w.balk, events, w);
        }
    }
    // hurdles: automatic little leaps at speed
    if (mdir !== 0 && Math.abs(p.vx) > 850 && !p.jump) {
        for (const h of T.hurdles) {
            const dx = (h.x - p.x) * mdir;
            if (dx > 0 && dx < 70 && startHurdle(p, h, input, world, events)) return;
        }
    }
    const sup = T.support(nx, p.y, C.stepUp, C.snapDown);
    if (sup) {
        const rise = p.y - sup.y;
        const run = Math.abs(nx - p.x) || 1e-6;
        // a steeper surface just overhead (e.g. under a grown ramp): keep to the one underfoot if it goes on
        const cur = sup.s !== p.surface && p.surface && T.surfaces.includes(p.surface) ? heightOn(p.surface.pts, nx) : null;
        if (rise > 0 && rise / run > C.maxSlope && rise > 6 && cur !== null && Math.abs(cur - p.y) <= C.snapDown) {
            p.x = nx; p.y = cur;
        } else if (rise > 0 && rise / run > C.maxSlope && rise > 6) {
            nx = p.x; p.vx *= 0.3; // too steep: behave like a wall
            const s2 = T.support(nx, p.y, C.stepUp, C.snapDown);
            if (s2) { p.y = s2.y; p.surface = s2.s; }
        } else {
            p.x = nx; p.y = sup.y; p.surface = sup.s;
        }
    } else {
        // nothing within a step: a wall above, or a drop below
        const wall = T.wallAbove(nx, p.y);
        if (wall) {
            if (Math.abs(p.vx) > 250) events.push({ type: 'bump' });
            p.vx = 0;
        } else {
            p.x = nx; p.mode = 'air'; p.vy = 0; p.surface = null;
        }
    }
    p.groundAngle = p.surface ? -Math.atan(slopeOn(p.surface.pts, p.x)) : 0;
    // water while standing
    updateWading(p, world, events);
}

/**
 * Off a plank into the water below (the pier in Spegelviken): a small hop out, then down through the
 * plank. Returns false where there is no water under the plank.
 */
export function dropIn(p, world, events) {
    const T = world.terrain;
    const s = p.surface;
    if (p.mode !== 'ground' || !s || !s.thin || p.hidden || p.jump) return false;
    const col = T.waterColumn(p.x + p.facing * 60);
    if (!col || col.swim === false || col.top < p.y) return false;
    p.dropThrough = s.id; p.dropY = p.y;
    p.jump = { kind: 'dive', vx: p.facing * 180, limit: null, dir: p.facing, fromY: p.y };
    p.vy = -Math.sqrt(2 * C.gravity * 45);
    p.mode = 'air'; p.surface = null;
    events.push({ type: 'hop', kind: 'dive', x: p.x, y: p.y });
    return true;
}

function balk(p, x, reason, events, src) {
    p.x = x;
    p.vx = 0;
    if (p.balkCooldown <= 0) {
        setAction(p, 'balk', 0.9, null);
        events.push({ type: 'balk', reason, id: src?.id, x });
        p.balkCooldown = 1.2;
    }
}

function updateWading(p, world, events) {
    const T = world.terrain;
    const w = T.waterColumn(p.x);
    if (w && !w.frozen && p.y > w.top) {
        const depth = p.y - w.top;
        if (!p.water) events.push({ type: 'splashIn', size: Math.min(1, Math.abs(p.vx) / 1200 + 0.2), x: p.x, y: w.top, water: w.id });
        p.water = w;
        p.submerge = Math.min(1, depth / 170);
        if (depth > C.wadeMax && w.swim !== false) {
            p.mode = 'swim'; p.vy = Math.max(0, p.vy); p.vx *= 0.35;
            events.push({ type: 'swimStart', x: p.x, y: w.top });
        }
    } else {
        if (p.water) events.push({ type: 'splashOut', x: p.x, y: p.water.top, water: p.water.id });
        p.water = null; p.submerge = 0;
    }
}

// --- hops, hurdles, leaps -----------------------------------------------------
function startHop(p, world, events) {
    const speed = Math.abs(p.vx);
    const T = world.terrain;
    if (speed < 300) {
        // buck in place
        p.jump = { kind: 'buck', vx: 0 };
        p.vy = -Math.sqrt(2 * C.gravity * C.buckHeight);
        setAction(p, 'buck', 2 * Math.sqrt(2 * C.buckHeight / C.gravity), null);
    } else {
        p.jump = { kind: 'hop', vx: p.vx };
        p.vy = -Math.sqrt(2 * C.gravity * C.hopHeight * (speed > 900 ? 1 : 0.8));
    }
    // never over an edge or balk line: find the stopping x in the running direction
    const dir = Math.sign(p.vx) || p.facing;
    const reach = Math.abs(p.jump.vx) * 0.62 + 20;
    const e = T.edgeCrossed(p.x, p.x + dir * reach, p.y, dir);
    const d = T.dashedStart(p.x, p.x + dir * reach, p.y, dir);
    let limit = null;
    if (e && e.kind !== 'pass') limit = e.x - dir * C.edgeMargin;
    if (d) { const sx = dir > 0 ? d.pts[0][0] : d.pts[d.pts.length - 1][0]; limit = limit === null ? sx - dir * C.edgeMargin : (dir > 0 ? Math.min(limit, sx - dir * C.edgeMargin) : Math.max(limit, sx - dir * C.edgeMargin)); }
    p.jump.limit = limit; p.jump.dir = dir;
    p.jump.fromY = p.y;
    p.mode = 'air';
    p.surface = null;
    events.push({ type: 'hop', kind: p.jump.kind, x: p.x, y: p.y });
}

function startHurdle(p, h, input, world, events) {
    const style = !!input.hop || !!input.hopHeld;
    const dir = Math.sign(p.vx);
    const dist = 220 + (style ? 60 : 0);
    const T = world.terrain, endX = p.x + dir * dist;
    const edge = T.edgeCrossed(p.x, endX, p.y, dir);
    // A decorative hurdle can never leap across an unearned puzzle boundary.
    if ((edge && edge.kind !== 'pass') || T.dashedStart(p.x, endX, p.y, dir)) return false;
    const landing = T.support(endX, p.y, dist * C.maxSlope, dist * C.maxSlope);
    if (!landing || T.wallBetween(p.x, endX, p.y, dir)) return false;
    const from = { x: p.x, y: p.y };
    p.leap = { from, to: { x: endX, y: landing.y }, peak: style ? 150 : 95, t: 0, dur: dist / Math.abs(p.vx), style, hurdle: true };
    p.mode = 'leap'; p.airT = 0;
    events.push({ type: 'leapStart', hurdle: true, style, x: p.x, y: p.y });
    return true;
}

function startLeap(p, e, events) {
    const to = e.to;
    const dist = Math.hypot(to[0] - e.x, to[1] - e.y);
    const speed = Math.max(Math.abs(p.vx), C.gallop);
    p.leap = { from: { x: e.x, y: e.y }, to: { x: to[0], y: to[1] }, peak: e.peak || 160, t: 0, dur: Math.max(0.45, dist / speed), slow: e.slow || 0, id: e.id, pan: !!e.pan, toWater: !!e.toWater };
    p.x = e.x; p.y = e.y;
    p.mode = 'leap'; p.airT = 0; p.surface = null;
    events.push({ type: 'leapStart', id: e.id, big: !!e.slow, x: p.x, y: p.y, to: e.to });
}

function stepLeap(p, world, dt, events) {
    const L = p.leap;
    let rate = 1;
    if (L.slow) {
        // slow down near the top of the arc (a short moment of wonder)
        const mid = 1 - Math.min(1, Math.abs(L.t - 0.5) * 3);
        rate = 1 - L.slow * mid;
    }
    L.t += dt / L.dur * rate;
    const t = Math.min(1, L.t);
    const dir = Math.sign(L.to.x - L.from.x) || p.facing;
    p.facing = dir;
    p.x = L.from.x + (L.to.x - L.from.x) * t;
    const base = L.from.y + (L.to.y - L.from.y) * t;
    p.y = base - 4 * L.peak * t * (1 - t);
    p.airT = t;
    p.vx = dir * Math.max(Math.abs(p.vx), (Math.abs(L.to.x - L.from.x) / L.dur));
    if (t >= 1) {
        p.leap = null; p.airT = 0;
        const T = world.terrain;
        const sup = T.support(p.x, p.y, 80, 200);
        if (sup) { p.y = sup.y; p.surface = sup.s; p.mode = 'ground'; }
        else { p.mode = 'air'; p.vy = 0; }
        if (L.toWater) { p.mode = 'air'; p.vy = 300; p.surface = null; p.jump = null; return; }
        events.push({ type: 'land', x: p.x, y: p.y, big: !!L.slow, id: L.id });
    }
}

function stepAir(p, ix, input, world, dt, events) {
    const T = world.terrain;
    p.vy += C.gravity * dt;
    let vx = p.jump ? p.jump.vx : p.vx;
    if (!p.jump && ix) vx += (ix * 400 - vx) * Math.min(1, dt * 2); // a little air control on plain falls
    let nx = p.x + vx * dt;
    if (p.jump && p.jump.limit !== null && p.jump.limit !== undefined) {
        const lim = p.jump.limit;
        if ((p.jump.dir > 0 && nx > lim) || (p.jump.dir < 0 && nx < lim)) { nx = lim; p.jump.vx = 0; }
    }
    // no flying over gaps: keep ground below within reach
    if (p.jump && T.floorAt(nx, p.y - 150) === null) { nx = p.x; if (p.jump) p.jump.vx = 0; }
    // walls
    const wallHere = T.wallAbove(nx, p.y, 600);
    if (wallHere && T.support(nx, p.y, 10, 30) === null) { nx = p.x; if (p.jump) p.jump.vx = 0; else vx = 0; }
    const ny = p.y + p.vy * dt;
    // landing (not back onto a plank we are dropping through)
    if (p.dropThrough && p.y > p.dropY + 40) p.dropThrough = null;
    if (p.vy >= 0) {
        const sup = T.support(nx, p.y, 8, (ny - p.y) + 8, p.dropThrough);
        if (sup) {
            p.x = nx; p.y = sup.y; p.surface = sup.s; p.mode = 'ground'; p.vy = 0; p.dropThrough = null;
            p.vx = p.jump ? p.jump.vx : vx;
            events.push({ type: 'land', x: p.x, y: p.y, soft: !p.jump || p.jump.kind === 'buck' });
            p.jump = null;
            updateWading(p, world, events);
            return;
        }
    }
    p.x = nx; p.y = ny;
    if (!p.jump) p.vx = vx;
    // falling into water
    const w = T.waterAt(p.x, p.y);
    if (w && !w.frozen && p.y > w.top + 20 && p.vy > 0) {
        const floor = T.floorBelow(p.x, p.y);
        if (floor === null || floor - w.top > C.wadeMax) {
            p.mode = 'swim'; p.jump = null; p.water = w; p.dropThrough = null;
            p.vy = Math.min(p.vy, 500) * 0.5;
            p.vx *= 0.35; // the water takes most of the run's speed
            events.push({ type: 'splashIn', size: 1, x: p.x, y: w.top, water: w.id, dive: true });
            events.push({ type: 'swimStart', x: p.x, y: w.top });
        }
    }
    if (p.y > 1e5) { p.y = 0; p.mode = 'ground'; }
}

// --- dashed lines (Streck) ---------------------------------------------------
function startStreck(p, d, dir, events) {
    p.streck = { d, dir, s: dir > 0 ? 0 : d._len, speed: Math.max(Math.abs(p.vx), C.gallopMin) };
    p.mode = 'streck';
    events.push({ type: 'streckStart', id: d.id });
}

function stepStreck(p, world, dt, events) {
    const S = p.streck;
    S.s += S.dir * S.speed * dt;
    const done = S.dir > 0 ? S.s >= S.d._len : S.s <= 0;
    const s = Math.min(S.d._len, Math.max(0, S.s));
    const pt = pointAt(S.d.pts, s);
    p.x = pt.x; p.y = pt.y; p.vx = S.dir * S.speed; p.facing = S.dir;
    p.groundAngle = -Math.atan2(pt.ty, pt.tx);
    S.d._ink = S.dir > 0 ? s / S.d._len : 1 - s / S.d._len;
    events.push({ type: 'ink', id: S.d.id, t: S.d._ink, from: S.dir > 0 ? 0 : 1 });
    if (done) {
        p.streck = null;
        p.mode = 'ground';
        events.push({ type: 'streckDone', id: S.d.id, flag: S.d.flag });
        world.flags.add(S.d.flag);
        world.terrain.dirty = true;
        world.terrain.refresh();
        const sup = world.terrain.support(p.x, p.y, 80, 120);
        if (sup) { p.y = sup.y; p.surface = sup.s; } else { p.mode = 'air'; p.vy = 0; }
    }
}

// --- swimming ----------------------------------------------------------------
function stepSwim(p, ix, iy, input, world, dt, events) {
    const T = world.terrain;
    const w = T.waterAt(p.x, p.y) || T.waterColumn(p.x) || p.water;
    if (!w) { p.mode = 'air'; p.vy = 0; return; }
    p.water = w;
    const top = w.top;
    p.inLane = null; p.inVortex = null; p.anchored = false;

    // currents and the whirl
    let fx = 0, fy = 0;
    const hidden = p.hidden && p.hide > 0.5;
    let drift = false, whirl = false;
    // the nearest lane in reach carries the swimmer (dashed lanes carry only a hidden shell)
    let lane = null, ln = null, held = false;
    for (const l of T.lanes) {
        if (l.dashed && !hidden) continue;
        const n = nearestOnLine(l.pts, p.x, p.y);
        if (!n || n.d > l.width / 2) continue;
        if (n.s >= l._len - 6) {
            // the calm pool at its end; a lane with endHold keeps the shell there
            if (hidden) events.push({ type: 'laneEnd', id: l.id });
            if (l.endHold) { lane = null; ln = null; held = true; break; }
            continue;
        }
        const pr = l.priority || 0, best = lane?.priority || 0;
        if (!ln || pr > best || (pr === best && n.d < ln.d)) { lane = l; ln = n; }
    }
    // a lane with a mouth (`suck`) draws in a hidden shell that sank close to where it starts
    if (!lane && !held && hidden) {
        for (const l of T.lanes) {
            if (!l.suck) continue;
            const [sx, sy] = l.pts[0];
            const d = Math.hypot(sx - p.x, sy - p.y);
            if (d > 1 && d < l.suck) { fx += (sx - p.x) / d * 260; fy += (sy - p.y) / d * 260; drift = true; p.inLane = l; break; }
        }
    }
    for (const l of lane ? [lane] : []) {
        const n = ln;
        const fall = 1 - Math.pow(n.d / (l.width / 2), 3) * 0.5;
        const sp = l.speed * fall;
        if (l.eject && !hidden && w.kind === 'pipe') {
            // a pipe: swimmers are pushed out sideways through the vents
            const side = Math.sign(p.x - n.px) || -1;
            fx += side * 520; fy += 40;
        } else {
            fx += n.tx * sp; fy += n.ty * sp;
        }
        p.inLane = l;
        if (hidden) {
            drift = true;
            // keep the drifting shell on the lane's centre line
            fx += (n.px - p.x) * 3; fy += (n.py - p.y) * 3;
        }
        break;
    }
    for (const v of T.vortices) {
        const dx = p.x - v.x, dy = p.y - v.y, r = Math.hypot(dx, dy) || 1;
        if (r > v.r + 280) continue;
        p.inVortex = v;
        const tx = -dy / r * v.spin, ty = dx / r * v.spin;
        if (hidden) {
            if (r < v.eye) { fx = 0; fy = 0; drift = false; events.push({ type: 'vortexEye', id: v.id }); }
            else {
                // round and round, and steadily inward (about 0.8 HL/s): the shell reaches the eye in a few seconds
                const spin = v.speed * Math.min(1, Math.max(0.3, r / v.r));
                fx = tx * spin - dx / r * v.pull; fy = ty * spin - dy / r * v.pull;
                drift = true; whirl = true;
            }
        } else if (r > v.eye && Math.abs(r - v.r) < 280) {
            fx += tx * v.speed * 0.6; fy += ty * v.speed * 0.6;
            fx += dx / r * 300; fy += dy / r * 300; // gently expelled
        }
    }
    for (const k of T.kelpBeds) {
        if (p.x > k.x0 && p.x < k.x1 && p.y > k.y0 && p.y < k.y1 && hidden) p.anchored = true;
    }

    if (hidden) {
        if (p.anchored) { p.vx *= Math.exp(-6 * dt); p.vy *= Math.exp(-6 * dt); }
        else if (whirl) { p.vx = fx; p.vy = fy; } // the whirl steers the shell directly (a lagging velocity would fling it outward)
        else if (drift) { p.vx += (fx - p.vx) * Math.min(1, dt * 4); p.vy += (fy - p.vy) * Math.min(1, dt * 4); }
        else {
            // heavy as a stone: sink
            p.vx *= Math.exp(-3 * dt);
            p.vy += (C.sinkSpeed - p.vy) * Math.min(1, dt * 4);
        }
    } else {
        const inputLength = Math.max(1, Math.hypot(ix, iy));
        p.vx += ix / inputLength * C.swimAccel * dt; p.vy += iy / inputLength * C.swimAccel * dt;
        const drag = Math.exp(-C.swimDrag * dt * (ix || iy ? 0.6 : 1.2));
        p.vx *= drag; p.vy *= drag;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > C.swimMax) { p.vx *= C.swimMax / sp; p.vy *= C.swimMax / sp; }
        // near-neutral buoyancy: float up only in the band just under the surface
        const depth = p.y - top;
        if (!iy && w.kind !== 'pipe') {
            // A damped surface spring fades to neutral buoyancy at depth, without a force step.
            const band = Math.max(0, Math.min(1, (C.surfaceBand + C.floatDepth - depth) / C.surfaceBand));
            const buoy = band * band * (3 - 2 * band);
            p.vy += ((C.floatDepth - depth) * 3 - p.vy * 1.8) * buoy * dt;
        }
        p.vx += fx * 1.2 * dt; p.vy += fy * 1.2 * dt;
        if (ix) p.facing = Math.sign(ix);
        // dolphin leap out of the surface
        if (input.hop && depth < C.floatDepth + 50 && w.kind !== 'cave' && w.kind !== 'pipe') {
            p.mode = 'air'; p.vy = -Math.sqrt(2 * C.gravity * C.dolphinHeight);
            p.jump = { kind: 'dolphin', vx: p.vx || p.facing * 260, limit: null, dir: p.facing };
            p.y = top + 10;
            events.push({ type: 'dolphin', x: p.x, y: top });
            return;
        }
    }
    if (hidden && p.vx) p.facing = Math.sign(p.vx) || p.facing;
    let nx = p.x + p.vx * dt;
    let ny = p.y + p.vy * dt;
    const dir = Math.sign(nx - p.x) || p.facing;
    // rock: never swim into solid ground
    if (T.insideSolid(nx, ny)) {
        if (!T.insideSolid(p.x, ny)) { nx = p.x; p.vx = 0; }
        else if (!T.insideSolid(nx, p.y)) { ny = p.y; p.vy = 0; }
        else { nx = p.x; ny = p.y; p.vx = 0; p.vy = 0; }
    }
    // explicit walls (the fold, paper edges)
    const wall = T.wallBetween(p.x, nx, ny, dir);
    if (wall) {
        nx = dir > 0 ? Math.min(p.x, wall.x - 2) : Math.max(p.x, wall.x + 2); p.vx = 0; // clear of the wall's line
        if (wall.balk && p.balkCooldown <= 0) { events.push({ type: 'balk', reason: wall.balk, id: wall.id, x: p.x }); p.balkCooldown = 1.5; setAction(p, 'balk', 0.9); }
    }
    // edges in the water (the dark vault)
    const ed = T.edgeCrossed(p.x, nx, ny, dir);
    if (ed && ed.kind !== 'pass' && ed.water) {
        nx = ed.x - dir * C.edgeMargin; p.vx = 0;
        if (p.balkCooldown <= 0) { events.push({ type: 'balk', reason: ed.reason || 'dark', id: ed.id, x: nx }); p.balkCooldown = 1.5; setAction(p, 'balk', 0.9); }
    }
    // the floor
    const floorN = T.floorBelow(nx, p.y, 30);
    if (floorN !== null && ny > floorN) {
        ny = floorN; if (p.vy > 0) p.vy = 0;
        if (hidden && !drift && !p.anchored && !p.resting) { p.resting = true; events.push({ type: 'rest', x: nx, y: ny }); }
    } else if (hidden && (drift || p.vy > 20)) p.resting = false;
    // the surface (or the cave roof / top of a pipe)
    const minY = top + (hidden ? 60 : (w.kind === 'pipe' ? 40 : C.floatDepth - 30));
    if (ny < minY) { ny = minY; if (p.vy < 0) p.vy = 0; }
    p.x = nx; p.y = ny;
    // left the water sideways (e.g. out of a pipe)?
    const still = T.waterAt(p.x, p.y + 1);
    if (!still && w.kind === 'pipe') { p.mode = 'air'; p.vy = 0; return; }
    p.submerge = Math.min(1, (p.y - top) / 170);
    p.groundAngle = 0;
    // walking out on a shore
    if (floorN !== null && floorN - top < C.wadeExit && !hidden && p.y >= floorN - 40) {
        p.mode = 'ground'; p.y = floorN; p.vy = 0;
        const sup = T.support(p.x, p.y, 60, 60); if (sup) p.surface = sup.s;
        events.push({ type: 'swimEnd', x: p.x, y: top });
    }
    // paddling beats
    const sp = Math.hypot(p.vx, p.vy);
    const prev = p.gaitPhase;
    if (!hidden) p.gaitPhase = (p.gaitPhase + (0.65 + Math.min(1, sp / C.swimMax) * 0.95) * dt) % 1;
    if (!hidden && sp > 60) for (const beat of [0, 0.5]) {
        const crossed = prev <= p.gaitPhase ? (beat > prev && beat <= p.gaitPhase) : (beat > prev || beat <= p.gaitPhase);
        if (crossed) events.push({ type: 'paddle', x: p.x, y: p.y, waterY: top,
            hoofX: p.x + p.facing * 62, hoofY: p.y - 28, side: beat === 0 ? 1 : -1, surface: p.y - top < 200 });
    }
}

// ---------------------------------------------------------------------------
// Snapshots for rendering (interpolated)
// ---------------------------------------------------------------------------
export function snapshot(p, alpha, terrain, time) {
    const x = p.px + (p.x - p.px) * alpha;
    const y = p.py + (p.y - p.py) * alpha;
    return {
        x, y, facing: p.facing, gait: p.gait, speed: p.speed,
        mode: p.mode === 'swim' ? 'swim' : (p.mode === 'air' || p.mode === 'leap') ? 'air' : 'ground',
        hiddenMode: p.hidden,
        action: p.action, actionT: p.actionT,
        airT: p.mode === 'leap' ? p.airT : p.mode === 'air' ? 0.5 : 0,
        vx: p.vx, vy: p.vy,
        groundAngle: p.groundAngle, gaitPhase: p.gaitPhase, terrainRevision: terrain.revision,
        dive: p.mode === 'swim' && p.vy > 80,
        // on a line being drawn the hooves stand on the line (the gully is far below); elsewhere only nearby ground
        groundAt: p.mode === 'streck' && p.streck ? (gx) => heightOn(p.streck.d.pts, gx) : (gx) => terrain.hoofGround(gx, x, y),
        submerge: p.submerge,
        waterY: p.water ? p.water.top : null,
        wet: p.wet,
        hide: p.hide,
        time
    };
}
