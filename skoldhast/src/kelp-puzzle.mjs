/* P6: untie the living kelp, ride its released current, then weigh down the
 * seabed fold. Runtime, drawing and Klo read the same pose and crease geometry.
 * Only completed physical stages are saved; a loose map piece always waits. */
import { HL, nearestOnLine } from './sim.mjs';
import { seabedFoldGeometry } from './folded-seabed.mjs';

const clamp = n => Math.max(0, Math.min(1, n));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const hand = p => ({ x: p.x + p.facing * .28 * HL, y: p.y - .5 * HL });
const definition = G => G.scenes.kelp?.kelpPuzzle;
const isFree = G => G.flags.has('p6_kelp_freed') || G.flags.has('p6_flat') || G.flags.has('mark_sea');
const isFlat = G => G.flags.has('p6_flat') || G.flags.has('mark_sea');

export function createP6State() {
    return { grabbed: false, owner: null, origin: null, pull: 0,
        contact: false, press: 0, freedAt: null, releasedAt: null, releaseHand: null };
}

/** A scene change or restored save retains flags, but drops any unfinished grip. */
export function resetP6(G) { G.puz.p6 = createP6State(); }

function pullDirection(def) {
    const dx = def.tether.pullTarget.x - def.tether.loose.x;
    const dy = def.tether.pullTarget.y - def.tether.loose.y;
    const length = Math.hypot(dx, dy);
    return { x: dx / length, y: dy / length };
}

/** Pure pose: no animation clock besides simulation time and no rendering state. */
export function p6Pose(G) {
    const def = definition(G), s = G.puz.p6 || createP6State();
    if (!def) return null;
    const collected = G.flags.has('mark_sea'), kelpFreed = isFree(G), flatDone = isFlat(G);
    const pulling = !kelpFreed && s.grabbed && s.owner === G.player && G.sceneId === 'kelp';
    const flat = flatDone ? 1 : clamp(s.press / def.pressSeconds);
    const phase = collected ? 'complete' : flatDone ? 'collect-fragment' : kelpFreed
        ? s.contact ? 'press-fold' : 'reach-fold' : pulling ? 'pull-kelp' : 'free-kelp';
    const rise = flatDone ? s.releasedAt === null ? 1 : clamp((G.time - s.releasedAt) / def.fragment.riseSeconds) : 0;
    const eased = rise * rise * (3 - 2 * rise);
    const from = def.fragment.from, to = def.fragment.to;
    return { phase, kelpFreed, pulling, pull: clamp(s.pull), flat,
        release: kelpFreed ? s.freedAt === null ? 1 : clamp((G.time - s.freedAt) / .8) : 0,
        tetherEnd: pulling ? hand(G.player) : s.releaseHand || def.tether.loose,
        fragment: { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased,
            visible: flatDone && !collected, collected, rise } };
}

/** Pure goal shared by the compass and Klo's explanations. */
export function p6Progress(G) {
    const def = definition(G), pose = p6Pose(G);
    if (!def || !pose) return null;
    const p = G.player, s = G.puz.p6 || createP6State();
    const at = point => ({ scene: 'kelp', x: point.x, y: point.y });
    let target = def.tether.loose, action = 'move', fraction = 0;
    if (pose.phase === 'free-kelp') {
        if (G.sceneId === 'kelp' && dist(p, target) <= def.tether.grabRadius) action = p.hidden ? 'emerge' : 'act';
    } else if (pose.phase === 'pull-kelp') {
        const dir = pullDirection(def);
        target = { x: s.origin.x + dir.x * def.tether.pullDistance, y: s.origin.y + dir.y * def.tether.pullDistance };
        fraction = pose.pull;
    } else if (pose.phase === 'reach-fold') {
        target = def.fold;
        if (G.sceneId === 'kelp') {
            const vortex = G.sceneDef.vortices?.find(v => v.id === 'kelphjartat');
            const lane = G.sceneDef.lanes?.find(l => l.id === 'lane-kelp-release');
            const inCurrent = (vortex && dist(p, vortex) < vortex.r + 250)
                || (lane && (nearestOnLine(lane.pts, p.x, p.y).d < lane.width / 2
                    || dist(p, { x: lane.pts[0][0], y: lane.pts[0][1] }) < lane.suck));
            if (inCurrent) action = p.hidden ? null : 'hide';
        }
    } else if (pose.phase === 'press-fold') {
        const geometry = seabedFoldGeometry({ ...def.fold, flat: pose.flat });
        target = { x: geometry.peak[0], y: geometry.peak[1] - def.shellContactOffset };
        fraction = pose.flat; action = p.hidden ? null : 'hide';
    } else if (pose.phase === 'collect-fragment') {
        target = pose.fragment; fraction = 1; action = p.hidden ? 'emerge' : 'move';
    } else { target = def.fragment.to; fraction = 1; action = null; }
    return { phase: pose.phase, fraction, target: at(target), action };
}

/** The contextual button takes a grip; it never supplies the swimming pull. */
export function p6Context(G) {
    const def = definition(G), p = G.player, s = G.puz.p6;
    if (!def || G.sceneId !== 'kelp' || !G.flags.has('ch2_open') || isFree(G) || p.hidden || p.mode !== 'swim') return null;
    if (s.grabbed && s.owner === p) return { id: 'p6-release', dist: 0, run() {
        s.grabbed = false; s.owner = null; s.origin = null; s.pull = 0;
    } };
    const distance = dist(p, def.tether.loose);
    if (distance > def.tether.grabRadius) return null;
    return { id: 'p6-grab', dist: distance / HL, run() {
        if (G.sceneId !== 'kelp' || G.player !== p || p.hidden || isFree(G)) return;
        s.grabbed = true; s.owner = p; s.origin = { x: p.x, y: p.y }; s.pull = 0;
    } };
}

/** Advance after swimming. Returns true only on the physical fragment pickup. */
export function stepP6(G, dt) {
    const def = definition(G), p = G.player, s = G.puz.p6;
    if (!def || G.sceneId !== 'kelp' || !G.flags.has('ch2_open') || G.flags.has('mark_sea')) return false;
    if (!isFree(G)) {
        if (!s.grabbed) return false;
        if (s.owner !== p || p.hidden || p.mode !== 'swim') {
            s.grabbed = false; s.owner = null; s.origin = null; s.pull = 0; return false;
        }
        const dir = pullDirection(def);
        const dx = p.x - s.origin.x, dy = p.y - s.origin.y;
        s.pull = clamp((dx * dir.x + dy * dir.y) / def.tether.pullDistance);
        if (s.pull < 1) return false;
        s.releaseHand = hand(p); s.freedAt = G.time; s.grabbed = false; s.owner = null;
        G.flag('p6_kelp_freed'); G.emit('kelpFreed', { x: def.tether.hook.x, y: def.tether.hook.y });
        return false;
    }
    if (!isFlat(G)) {
        const hidden = p.hidden && p.hide > .9 && p.mode === 'swim';
        const geometry = seabedFoldGeometry({ ...def.fold, flat: clamp(s.press / def.pressSeconds) });
        const target = { x: geometry.peak[0], y: geometry.peak[1] - def.shellContactOffset };
        // The current delivers the shell onto a broad crest. Settle the last
        // short distance visibly; weight only counts once shell and paper touch.
        if (!hidden || (s.contact && dist(p, target) > def.foldCaptureRadius * 1.5)) {
            s.contact = false; s.press = 0; return false;
        }
        if (!s.contact && dist(p, target) <= def.foldCaptureRadius) s.contact = true;
        if (!s.contact) return false;
        const distance = dist(p, target), move = Math.min(distance, def.settleSpeed * dt);
        if (distance > .01) { p.x += (target.x - p.x) / distance * move; p.y += (target.y - p.y) / distance * move; }
        p.vx = 0; p.vy = 0;
        if (distance > def.contactTolerance) return false;
        p.resting = true;
        s.press = Math.min(def.pressSeconds, s.press + dt);
        const pressed = seabedFoldGeometry({ ...def.fold, flat: s.press / def.pressSeconds });
        p.x = pressed.peak[0]; p.y = pressed.peak[1] - def.shellContactOffset;
        if (s.press >= def.pressSeconds) {
            s.releasedAt = G.time; s.contact = false;
            G.flag('p6_flat'); G.emit('flattened', { id: 'corner', x: p.x, y: p.y });
        }
        return false;
    }
    const fragment = p6Pose(G).fragment;
    // The art's position is its lower anchor. An emerged swimmer reaches the
    // paper with its body; the shell beneath it cannot collect it accidentally.
    if (!p.hidden && p.hide < .1 && p.mode === 'swim'
        && dist({ x: p.x, y: p.y - .3 * HL }, { x: fragment.x, y: fragment.y - .12 * HL }) <= def.fragment.pickupRadius) {
        G.flag('mark_sea'); G.emit('mark', { id: 'mark_sea' }); return true;
    }
    return false;
}
