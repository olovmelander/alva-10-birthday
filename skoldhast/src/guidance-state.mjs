/* Pure descriptions of the next useful action. No timers, DOM or story writes. */
import { HL, nearestOnLine, p4MomentumProgress } from './sim.mjs';
import { GOALS, HINTS, TIPS, GUIDANCE as W } from './content/sv.mjs';
import { describeThread } from './story-thread.mjs';
import { p6Progress } from './kelp-puzzle.mjs';
import { p3Progress } from './hill-puzzle.mjs';

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const at = (scene, x, y) => ({ scene, x: x * HL, y: y * HL });
const point = (scene, p) => p ? { scene, x: p.x, y: p.y } : null;
const count = (F, ...flags) => flags.filter(f => F.has(f)).length;

/** One-off tips use the same control settings as the persistent instruction. */
export function controlTip(kind, settings = {}) {
    const device = settings.touch ? 'touch' : 'keys';
    if (kind === 'hide' && settings.holdToHide) return W.controls.hideTipHold[device];
    if (kind === 'gallop' && settings.touch && settings.followFinger) return W.controls.gallopTipFollow;
    return TIPS[kind]?.[device] || '';
}

/**
 * `objective` is the existing story ID. `p8` is puzzles.p8Progress(G), supplied
 * by story so this module never invents a second puzzle state machine.
 * All target coordinates are world coordinates and carry their scene ID.
 */
export function describeGuidance(G, settings = {}) {
    const { objective = 'explore', touch = false, holdToHide = false, followFinger = false, p8 } = settings;
    const F = G.flags, p = G.player, S = G.puz, scenes = G.scenes;
    const scene = G.sceneId || G.sceneDef.id, hidden = !!p.hidden;
    const device = touch ? 'touch' : 'keys';
    const n = objective === 'p7' ? count(F, 'shutter1', 'shutter2', 'shutter3')
        : ['p3', 'p3b'].includes(objective) ? count(F, 'p3_t1', 'p3_t2', 'p3_t3')
        : objective === 'p2' ? Number(S.stone === scenes.land.rail.target) + Number(F.has('p2_plank'))
        : count(F, 'mark_land', 'mark_sea');
    const p3 = ['p3', 'p3b'].includes(objective) ? p3Progress(G) : null;
    const p4 = objective === 'p4' && !F.has('p4_leap') ? p4MomentumProgress(p, scenes.land) : null;
    const p4Airborne = p4 && p.mode === 'leap' && p.leap?.id === 'sprang-p4';
    const p4Running = p4 && (p4Airborne || p4.active
        || (p.mode === 'ground' && p.surface?.id === 'plateau' && p.x <= 30 * HL
            && (p.x >= 25 * HL || p.vx < 0)));
    const p3Text = p3 && ({ 'seed-flight': 'p3Flight', 'grow-roots': 'p3Roots', 'move-pin': 'p3Pin',
        'unfold-ramp': 'p3Unfold', 'reach-ledge': 'p3Ledge', complete: 'p3Ledge' }[p3.phase]
        || (p3.stage === 3 ? 'p3Upper' : p3.stage === 2 ? 'p3SecondSeed' : F.has('ch2_open') ? 'p3Map' : 'p3'));
    const p6 = objective === 'p6' ? p6Progress(G) : null;
    const p6Text = { 'free-kelp': 'p6Free', 'pull-kelp': 'p6Pull', 'reach-fold': 'p6Reach',
        'press-fold': 'p6Press', 'collect-fragment': 'p6Collect', complete: 'p6Collect' };
    const textKey = p3Text || (p6 ? p6Text[p6.phase]
        : p4 && !p4Running && F.has('b:k2_leap_purpose') ? 'p4Runup'
        : objective === 'p4' && !F.has('ch2_open') ? F.has('b:k2_leap_purpose') ? 'p4Find' : 'p4Explore'
        : F.has('ch2_open') && ['p1', 'p3', 'p3b'].includes(objective) ? objective + 'Map' : objective);
    const text = GOALS[textKey];
    const cue = { key: objective, objective, goal: typeof text === 'function' ? text(n) : text || '',
        hint: HINTS[textKey] || null, action: null, state: 'approach', instruction: '', controlText: '', progress: null, target: null };
    cue.thread = describeThread(F, objective, textKey);
    if (cue.thread.conversation) {
        cue.goal = cue.thread.conversation.goal;
        cue.hint = cue.thread.conversation.hint;
    }
    let control = null;
    const near = (target, radius = 2) => target?.scene === scene && Math.hypot(p.x - target.x, p.y - target.y) < radius * HL;
    function step(key, target, action = 'move', state = 'approach', instruction = W.steps[key]) {
        if (action === 'act' && !near(target, 1.3)) action = 'move';
        cue.key = objective + ':' + key; cue.target = target; cue.action = action; cue.state = state;
        cue.instruction = instruction || ''; control = action;
    }
    function progress(value, total, label) { cue.progress = { value: clamp(value || 0, 0, total), total, label }; }
    function emerge(instruction = W.emerge) { cue.key += ':emerge'; cue.action = 'emerge'; cue.state = 'ready'; cue.instruction = instruction; cue.progress = null; control = 'emerge'; }
    function hiding(key, target, ready, { waiting, label, value = 0, total = 1 } = {}) {
        if (!ready) step(key + 'Approach', target);
        else if (!hidden) step(key + 'Ready', target, 'hide', 'ready');
        else {
            step(waiting || key + 'Wait', target, 'hide', 'working');
            if (label) progress(value, total, label);
        }
    }
    function calm(id) { return clamp((1 - (S.pools[id]?.ripple ?? 1)) / .94); }

    const returnRope = scenes.land.ropes[0];
    const outlet = scenes.kelp.lanes.find(lane => lane.id === 'lane-out').pts.at(-1);
    const outflowTarget = () => point('kelp', { x: outlet[0], y: outlet[1] });
    const cliffEdge = scenes.land.edges.find(e => e.id === 'klipp-edge');
    const needsCliffExit = ['toSea', 'toViken', 'pool', 'p2', 'kelp'].includes(objective) && scene === 'land'
        && F.has('p4_leap') && !F.has('p4_plank') && p.x <= cliffEdge.x && p.y < cliffEdge.y + HL;

    if (hidden && F.has('klo_ja') && !F.has('rule_demo') && scene === 'land') {
        step('afterKlo', point('land', scenes.land.spots.kloHole), 'emerge', 'ready', W.afterKlo);
        cue.goal = W.afterKlo;
    } else if (needsCliffExit) {
        // Finding the mark changes the objective immediately. Keep the physical
        // way home visible before directing either puzzle order toward the sea.
        step('returnRope', point('land', returnRope), 'act');
    } else if (objective === 'hide') {
        const target = point('land', scenes.land.spots.kloHole);
        hiding('hide', target, scene === 'land' && Math.abs(p.x - target.x) < 3 * HL);
    } else if (objective === 'pool') {
        const water = scenes.land.waters.find(w => w.id === 'pool'), target = at('land', 102.4, -.3);
        const d = Math.abs(p.x - clamp(p.x, water.x0, water.x1)) + Math.max(0, Math.abs(p.y - water.top) - 1.5 * HL);
        hiding('pool', target, scene === 'land' && d < 2.2 * HL, { label: W.progress.calm, value: calm('pool') });
    } else if (objective === 'p2') {
        const rail = scenes.land.rail;
        if (S.stone !== rail.target) step('stone', point('land', { x: rail.x0 + S.stone * rail.step - .75 * HL, y: rail.y }), 'act');
        else { step('plank', at('land', 103.4, -.43)); control = 'gallop'; }
        if (hidden) emerge(W.afterMirror);
    } else if (objective === 'p1') {
        step('bridge', at('land', p.x > 80 * HL ? 82 : 80.1, -.66)); control = 'gallop';
        const dl = scenes.land.dashed.find(d => d.flag === 'p1_inked');
        if (S.inkT[dl.id] > 0) { cue.state = 'working'; progress(S.inkT[dl.id], 1, W.progress.ink); }
    } else if (objective === 'p3' || objective === 'p3b') {
        const key = p3.phase === 'move-pin' ? p3.action === 'act' ? 'p3PinPush' : 'p3PinApproach'
            : p3.phase === 'seed-flight' ? 'p3Flight' : p3.phase === 'grow-roots' ? 'p3Roots'
            : p3.phase === 'unfold-ramp' ? 'p3Unfold' : ['reach-ledge', 'complete'].includes(p3.phase) ? 'p3Ledge'
            : p3.runup ? p3.stage === 3 ? 'p3UpperRunup' : 'p3SeedRunup'
            : p3.stage === 3 ? 'p3UpperSeed' : p3.stage === 2 ? 'p3SecondSeed' : 'ramp';
        step(key, p3.target, p3.action, ['seed-flight', 'grow-roots', 'unfold-ramp'].includes(p3.phase) ? 'working' : 'approach');
        control = p3.control;
        const label = { 'seed-flight': W.progress.seedFlight, 'grow-roots': W.progress.roots,
            'unfold-ramp': W.progress.unfold }[p3.phase];
        if (label) progress(p3.fraction, 1, label);
        else progress(p3.completed, 3, W.progress.ramps(p3.completed));
    } else if (objective === 'p4') {
        if (F.has('mark_land') && !F.has('p4_plank')) step('returnRope', point('land', scenes.land.ropes[0]), 'act');
        else if (F.has('p4_leap')) step('landmark', point('land', scenes.land.spots.landmark));
        else if (p4Airborne) {
            step('leapFlight', at('land', 7, -4), null, 'working');
        } else {
            step(p4Running ? 'leap' : 'leapRunup', p4Running ? at('land', 13.1, -4) : p4.target);
            control = p4Running ? 'gallop' : 'move';
            if (p4.active) progress(p4.fraction, 1, W.progress.runupSpeed);
        }
    } else if (objective === 'p5') {
        const lane = scenes.kelp.lanes.find(l => l.id === 'lane-vault'), target = point('kelp', { x: lane.pts[0][0], y: lane.pts[0][1] });
        const inLane = scene === 'kelp' && p.inLane?.id === lane.id;
        const onWay = scene === 'kelp' && nearestOnLine(lane.pts, p.x, p.y).d <= lane.width / 2;
        const ready = inLane || (near(target, 1.8) && onWay);
        if (hidden && inLane && S.school.state === 'follow') {
            step('fishDrift', point('kelp', scenes.kelp.spots.vault), 'hide', 'working');
            const line = nearestOnLine(lane.pts, p.x, p.y);
            progress(line.t, 1, W.progress.drifting);
        } else if (hidden && (inLane || ready)) {
            step('fishWait', target, 'hide', 'working'); progress(S.school.t, 1.2, W.progress.waiting);
        } else if (hidden && S.school.state === 'follow') step('fishRecover', target, 'emerge', 'ready');
        else hiding('fish', target, ready);
    } else if (objective === 'p6') {
        const key = p6.phase === 'free-kelp' ? p6.action === 'act' ? 'p6GrabKelp' : 'p6ApproachKelp'
            : p6.phase === 'pull-kelp' ? 'p6PullKelp'
            : p6.phase === 'reach-fold' ? hidden ? 'p6Drift' : p6.action === 'hide' ? 'p6Hide' : 'p6ReachFold'
            : p6.phase === 'press-fold' ? 'p6Press' : 'p6Collect';
        step(key, p6.target, p6.action, ['pull-kelp', 'press-fold'].includes(p6.phase) ? 'working' : 'approach');
        if (p6.phase === 'pull-kelp') progress(p6.fraction, 1, W.progress.kelpLoose);
        if (p6.phase === 'press-fold') progress(p6.fraction, 1, W.progress.flattening);
    } else if (objective === 'toViken' && hidden && scene === 'kelp' && p.inLane?.id === 'lane-out') {
        step('toViken', outflowTarget(), 'hide', 'working', HINTS.toViken.sketch);
    } else if (objective === 'p7') {
        const bay = scenes.viken, plate = bay.plates[0], pipe = bay.lanes.find(l => l.id === 'pipe');
        const gallery = scene === 'viken' && p.y < -6.4 * HL && p.x > 26 * HL;
        const onMirror = scene === 'viken' && p.surface?.id === 'pier' && p.x >= bay.mirrorZone.x0 && p.x <= bay.mirrorZone.x1;
        const pipeNear = scene === 'viken' && Math.hypot(p.x - pipe.pts[0][0], p.y - pipe.pts[0][1]) < 2.2 * HL;
        if (!F.has('shutter3') && gallery) step('rope', point('viken', bay.spots.rope), 'act', 'ready');
        else if (!F.has('p7_seen') && onMirror && !F.has('shutter1') && !F.has('shutter2') && !F.has('shutter3')) {
            hiding('mirror', point('viken', bay.spots.viewPier), true, { label: W.progress.calm, value: calm('bay') });
        } else if (!F.has('shutter3') && (pipeNear || p.inLane?.id === 'pipe' || F.has('shutter2'))) {
            const target = point('viken', { x: pipe.pts[0][0], y: pipe.pts[0][1] });
            hiding('pipe', target, scene === 'viken' && (pipeNear || p.inLane?.id === 'pipe'), {
                label: W.progress.drifting, value: (pipe.pts[0][1] - p.y) / (pipe.pts[0][1] - pipe.pts.at(-1)[1])
            });
        } else if (!F.has('shutter2')) {
            const ready = scene === 'viken' && p.mode === 'swim' && Math.abs(p.x - plate.x) < plate.pull && p.y < plate.y + .5 * HL;
            hiding('plate', point('viken', plate), ready, { waiting: p.resting ? 'plateWait' : 'plateSink', label: p.resting ? W.progress.plate : W.progress.sinking,
                value: p.resting ? S.plates[plate.id] || 0 : p.y / plate.y, total: p.resting ? plate.hold : 1 });
        } else {
            const drum = bay.drums[0], hits = S.drums[drum.id] || 0;
            step('drum', at('viken', 13, -.62)); control = 'gallop';
            progress(hits, drum.notches, W.progress.ratchet(Math.min(hits, drum.notches), drum.notches));
        }
        if (hidden && F.has('shutter2') && Math.abs(p.x - plate.x) < 2 * HL && p.y > 5 * HL) emerge(W.afterPlate);
    } else if (objective === 'p8' && p8) {
        const key = { runup: 'p8Runup', land: 'p8Land', jump: 'p8Jump', approach: 'p8Approach', hide: 'p8Hide', drift: 'p8Drift', draw: 'p8Draw', done: 'p8Draw' }[p8.phase];
        const action = ['hide', 'drift'].includes(p8.phase) ? 'hide' : ['draw', 'done'].includes(p8.phase) ? null : 'move';
        step(key, p8.target, action, p8.phase === 'drift' ? 'working' : ['draw', 'done'].includes(p8.phase) ? 'done' : 'ready');
        if (['runup', 'land', 'jump'].includes(p8.phase)) { control = 'gallop'; progress(p8.landDone, p8.landTotal, W.progress.lines(p8.landDone)); }
        else if (['hide', 'drift'].includes(p8.phase)) progress(p8.fraction, 1, W.progress.drifting);
    } else {
        const targets = {
            explore: point('land', G.actors.klo), kelp: point('land', scenes.land.spots.arch),
            hook: at('kelp', 20.8, 3.4), toSea: point('land', scenes.land.spots.arch),
            toViken: outflowTarget(), talk: point('viken', G.actors.kv), signe: point('land', G.actors.signe)
        };
        if (targets[objective]) step(objective, targets[objective], ['kelp', 'toSea', 'talk', 'signe'].includes(objective) ? 'act' : 'move', 'approach', W.steps[objective] || HINTS[objective]?.sketch);
        if (objective === 'explore') control = 'gallop';
    }

    // A mark on another page is useless: point to this page's route instead.
    if (cue.target && cue.target.scene !== scene) {
        let target, instruction, action = 'move';
        if (scene === 'land' && cue.target.scene === 'viken' && F.has('gate_open')) {
            const exit = scenes.land.exits.find(e => e.to === 'viken');
            target = point('land', { x: (exit.x0 + exit.x1) / 2, y: scenes.land.spots.fromViken.y });
            instruction = W.route.bay;
        } else if (scene === 'land') {
            target = point('land', scenes.land.spots.arch); instruction = W.route.kelp;
            if (F.has('p2_open')) action = 'act';
        } else if (scene === 'kelp' && cue.target.scene === 'viken' && F.has('marks_both')) { target = outflowTarget(); instruction = W.route.viken; }
        else if (scene === 'kelp') { target = at('kelp', 0, 2.3); instruction = W.route.land; }
        else { target = point('viken', scenes.viken.spots.fromLand); instruction = W.route.bayExit; }
        step('route-' + cue.target.scene, target, action, 'approach', instruction); cue.progress = null;
    }
    if (hidden && cue.action && !['hide', 'emerge'].includes(cue.action)) emerge();
    if (control === 'hide') control = hidden && !holdToHide ? 'stay' : holdToHide ? 'hideHold' : 'hide';
    if (control === 'emerge' && holdToHide) control = 'emergeHold';
    cue.controlText = touch && followFinger && control === 'move' ? W.controls.follow
        : touch && followFinger && control === 'gallop' ? W.controls.followGallop : W.controls[control]?.[device] || '';
    if (cue.instruction) cue.hint = { q: cue.hint?.q || cue.goal, note: cue.instruction, sketch: [cue.instruction, cue.controlText].filter(Boolean).join(' ') };
    return cue;
}
