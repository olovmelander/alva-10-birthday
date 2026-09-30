/* P3: gallop wind carries real seeds onto local grass strips. Roots open each
 * strip; the middle one first needs its pinning stone moved out of the way.
 * Flights and unfinished pushes belong to this visit. Landed seeds, released
 * pins and opened ramps persist; older ramp flags already mean success. */
import { HL, C, cond, rampGrowthGeometry } from './sim.mjs';

const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => n * n * (3 - 2 * n);
const definition = G => G.scenes.land.hillPuzzle;
const seeded = (G, stage) => G.flags.has(stage.seedFlag) || G.flags.has(stage.flag);
const stoneClear = G => G.flags.has(definition(G).stone.flag) || G.flags.has('p3_t2');

export function createP3State() {
    return { roots: {}, stone: null, nextFlight: 0 };
}

export function resetP3(G) {
    G.puz.p3 = createP3State();
    G.puz.clumps = {};
    G.puz.fluff = [];
    // A successfully planted seed is never lost or requested a second time.
    for (const stage of definition(G)?.stages || []) {
        if (seeded(G, stage)) G.puz.p3.roots[stage.id] = definition(G).rootsSeconds;
    }
}

/** The particle's actual simulation trajectory, including its landing point. */
export function hillFlightPose(flight) {
    const t = clamp(flight.t);
    return { x: flight.x + (flight.tx - flight.x) * t,
        y: flight.y + (flight.ty - flight.y) * t - Math.sin(t * Math.PI) * flight.arc };
}

function stonePose(G) {
    const def = definition(G).stone, state = G.puz.p3;
    const moved = stoneClear(G), moving = !moved && !!state?.stone;
    const progress = moved ? 1 : moving ? clamp(state.stone.elapsed / def.duration) : 0;
    const amount = ease(progress);
    return { id: def.id, from: { x: def.x, y: def.y }, to: def.to,
        x: def.x + (def.to.x - def.x) * amount, y: def.y + (def.to.y - def.y) * amount,
        moved, moving, progress };
}

/** Pure presentation state. Every raised point is read from real collision. */
export function p3Pose(G) {
    const def = definition(G), land = G.scenes.land, state = G.puz.p3 || createP3State();
    if (!def) return null;
    const local = G.sceneId === 'land', stone = stonePose(G);
    const surfaces = local ? G.terrain.surfaces : land.surfaces.filter(s => cond(s.when, G.flags));
    const stages = def.stages.map(stage => {
        const source = land.clumps.find(c => c.id === stage.source);
        const receiver = land.tussocks.find(t => t.id === stage.receiver);
        const raw = land.surfaces.find(s => s.id === stage.ramp);
        const growth = local ? G.terrain.rampGrowth?.get(stage.ramp) : null;
        const complete = G.flags.has(stage.flag), hasSeed = seeded(G, stage);
        const root = hasSeed ? clamp((state.roots[stage.id] ?? def.rootsSeconds) / def.rootsSeconds) : 0;
        const unfold = complete ? growth ? ease(clamp(growth.elapsed / growth.duration)) : 1 : 0;
        const closed = rampGrowthGeometry(raw, surfaces);
        const flight = G.puz.fluff.find(f => f.target === stage.receiver);
        const pinned = !!stage.pin && !stone.moved;
        const phase = complete ? unfold < 1 ? 'unfolding' : 'complete'
            : hasSeed ? root < 1 ? 'roots' : pinned ? 'pinned' : 'roots'
            : flight ? 'flight' : 'seed';
        return { id: stage.id, source, receiver, seeded: hasSeed, complete, pinned, root, unfold, phase,
            points: (growth?.surface.pts || (complete ? raw.pts : closed.pts)).map(p => [...p]),
            basePoints: growth ? growth.surface.pts.map(([x], i) => [x, growth.base[i]]) : closed.pts,
            targetPoints: raw.pts.map(p => [...p]) };
    });
    return { stages, stone, flights: G.puz.fluff.map(f => ({ ...f, from: { x: f.x, y: f.y }, ...hillFlightPose(f) })) };
}

function canPush(G) {
    const p = G.player, stone = definition(G).stone;
    const dx = stone.x - p.x;
    return G.sceneId === 'land' && G.flags.has('p3_t1') && !stoneClear(G) && !G.puz.p3.stone
        && p.mode === 'ground' && !p.hidden && p.facing === 1
        && dx >= -.1 * HL && dx <= stone.reach && Math.abs(p.y - stone.y) < .45 * HL;
}

export function p3Context(G) {
    if (!definition(G) || !canPush(G)) return null;
    const stone = definition(G).stone, p = G.player;
    return { id: 'p3-push', dist: Math.abs(p.x - stone.x) / HL, run() {
        if (G.player !== p || !canPush(G)) return;
        G.puz.p3.stone = { elapsed: 0, owner: p };
        p.nudge = { x: p.x + .35 * HL, t: .7 };
        G.emit('push', { id: stone.id, target: 1 });
    } };
}

/** Goals, Klo and the view observe this same physical state. */
export function p3Progress(G) {
    const pose = p3Pose(G), def = definition(G);
    if (!pose) return null;
    const at = p => ({ scene: 'land', x: p.x, y: p.y });
    const current = pose.stages.find(s => !s.complete || s.unfold < 1);
    const completed = pose.stages.filter(s => s.complete).length;
    if (!current) return { phase: G.flags.has('p3_done') ? 'complete' : 'reach-ledge',
        stage: null, id: null, target: at(G.scenes.land.spots.kloLedge), action: 'move', control: 'move', fraction: 1, completed, runup: false };
    const stage = pose.stages.indexOf(current) + 1;
    let phase = 'approach-seed', target = current.source, action = 'move', control = 'gallop', fraction = 0;
    if (current.phase === 'unfolding') {
        phase = 'unfold-ramp'; target = current.receiver; action = control = null; fraction = current.unfold;
    } else if (current.pinned && (current.seeded || pose.stone.moving)) {
        phase = 'move-pin'; target = { x: def.stone.x - .8 * HL, y: def.stone.y };
        action = pose.stone.moving ? null : canPush(G) ? 'act' : 'move'; control = action; fraction = pose.stone.progress;
    } else if (current.phase === 'roots') {
        phase = 'grow-roots'; target = current.receiver; action = control = null; fraction = current.root;
    } else if (current.phase === 'flight') {
        phase = 'seed-flight'; target = current.receiver; action = control = null;
        fraction = G.puz.fluff.find(f => f.target === current.receiver.id)?.t || 0;
    }
    // A short upper shelf is no place to gain speed. Guide back to an authored
    // approach when necessary, while a horse already carrying wind can go on.
    const approach = current.source.runup;
    const runup = phase === 'approach-seed' && !!approach && G.player.x < approach.readyX
        && !(G.player.vx * current.source.dir >= C.gallopMin && G.player.x > current.source.x);
    if (runup) { target = approach; control = 'move'; }
    return { phase, stage, id: current.id, target: at(target), action, control, fraction, completed, runup };
}

function openStrip(G, stage) {
    if (G.flags.has(stage.flag)) return;
    G.flags.add(stage.flag);
    G.terrain.startRampGrowth(stage.ramp, definition(G).rampSeconds);
    G.terrain.refresh();
    G.emit('flag', { flag: stage.flag });
    G.emit('grow', { id: stage.receiver, flag: stage.flag, decor: false });
}

/** No delayed callbacks: a flight commits only when its visible seed arrives. */
export function stepP3(G, dt) {
    if (G.sceneId !== 'land') return;
    const def = definition(G), land = G.sceneDef, S = G.puz, state = S.p3, p = G.player;
    for (const key of Object.keys(S.clumps)) S.clumps[key] = Math.max(0, S.clumps[key] - dt);

    if (state.stone) {
        if (state.stone.owner !== p) state.stone = null;
        else {
            state.stone.elapsed += dt;
            if (state.stone.elapsed >= def.stone.duration) {
                state.stone = null;
                G.flag(def.stone.flag);
                G.emit('hillUnpinned', { id: def.stone.id, flag: def.stone.flag });
            }
        }
    }

    for (const f of S.fluff) {
        f.t = Math.min(1, f.t + dt / f.dur);
        if (f.t < 1 || !f.target) continue;
        const target = land.tussocks.find(t => t.id === f.target);
        if (!target || G.flags.has(target.flag)) continue;
        const stage = def.stages.find(s => s.receiver === target.id);
        if (stage) {
            if (seeded(G, stage)) continue;
            G.flag(stage.seedFlag); state.roots[stage.id] = 0;
            G.emit('seedLanded', { id: target.id, target: target.id, source: f.source,
                flag: stage.seedFlag, pinned: !!stage.pin && !stoneClear(G), decor: false });
        } else {
            G.flag(target.flag);
            G.emit('seedLanded', { id: target.id, target: target.id, source: f.source, flag: target.flag, pinned: false, decor: true });
            G.emit('grow', { id: target.id, flag: target.flag, decor: true });
        }
    }
    S.fluff = S.fluff.filter(f => f.t < 1);

    for (const stage of def.stages) {
        if (G.flags.has(stage.flag) || !seeded(G, stage)) continue;
        state.roots[stage.id] = Math.min(def.rootsSeconds, (state.roots[stage.id] ?? def.rootsSeconds) + dt);
        if (state.roots[stage.id] >= def.rootsSeconds && (!stage.pin || stoneClear(G))) openStrip(G, stage);
    }

    const galloping = (p.mode === 'ground' || p.mode === 'streck') && Math.abs(p.vx) >= C.gallopMin;
    if (!galloping) return;
    for (const source of land.clumps) {
        if (S.clumps[source.id] > 0 || !cond(source.needs, G.flags)) continue;
        const prerequisite = def.stages.find(s => s.flag === source.needs);
        if (prerequisite && G.terrain.rampGrowth?.has(prerequisite.ramp)) continue;
        const target = land.tussocks.find(t => t.id === source.target);
        const stage = def.stages.find(s => s.source === source.id);
        if (!target || G.flags.has(target.flag) || (stage && seeded(G, stage))
            || S.fluff.some(f => f.source === source.id)) continue;
        const crossed = (p.px - source.x) * (p.x - source.x) <= 0 && p.px !== p.x;
        if (!crossed || Math.abs(p.y - source.y) > .3 * HL) continue;
        const dir = Math.sign(p.x - p.px), arrives = dir === source.dir;
        S.clumps[source.id] = arrives ? 4 : .9;
        S.fluff.push({ id: ++state.nextFlight, source: source.id, x: source.x, y: source.y - .5 * HL,
            tx: arrives ? target.x : source.x + dir * Math.abs(target.x - source.x),
            ty: arrives ? target.y - .04 * HL : source.y - .2 * HL,
            t: 0, dur: source.duration, arc: source.arc, target: arrives ? target.id : null });
        G.emit('fluff', { id: source.id, dir, target: arrives ? target.id : null });
        if (!arrives && !source.teach) G.emit('fluffMiss', { id: source.id, dir });
    }
}
