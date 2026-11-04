/*
 * Äventyr 2 – the ten eggs and the puzzles that earn them (pure: no DOM, no Pixi).
 *
 *   E1  Gräv in the sand by the nest
 *   P1  galloping hooves drum the hollow log until the cocoa tree drops its egg
 *   P2  the rope bridge is inked by the sim's own dashed-line rule (no code here)
 *   P3  a hidden shell sinks under the waterfall's push and rides the undertow in
 *   P4  a still, hidden shell beside the moonshine seeds makes them glow
 *   P5  Knuffa the beetle's ball off the plateau; the river washes the egg free
 *   P6  a hidden shell spirals down Djuphålan to the gold coin; Ge it to Skatan
 *   P7  the leap is the sim's downhill språng; Dra the vine to come back
 *
 * Completed steps are flags (they are what the save keeps). Transient motion
 * (a falling egg, the rolling ball) restarts as finished after a reload.
 */
import { HL, cond, heightOn } from '../../src/sim.mjs';
import { CONTEXT } from './content/sv.mjs';
import { EGG_IDS } from './content/world.mjs';

const FALL_SECONDS = 0.9;
const TOUCH = 0.85 * HL;
const TALK = 1.3 * HL;

export function createPuzzleState() {
    return {
        drum: 0, softDrum: 0,
        fall: null,          // { t } while the cocoa tree's egg falls
        ball: null,          // the beetle ball's x (null = at its start)
        roll: null,          // { t, phase: 'roll' | 'wash' }
        still: 0,            // seconds hidden and still beside the moonshine seeds
        pushed: {}           // push zones the swimmer is inside now
    };
}

export const eggFlag = (id) => 'egg_' + id;
export function eggsFound(G) { return EGG_IDS.filter(id => G.flags.has(eggFlag(id))).length; }

export function collectEgg(G, id) {
    if (G.flags.has(eggFlag(id))) return false;
    G.flag(eggFlag(id));
    const n = eggsFound(G);
    G.emit('egg', { id, n });
    return true;
}

function ballDef(G) { return G.scenes.strand.ball; }
export function ballX(G) { return G.puz.ball ?? ballDef(G).x0; }

/** Where an egg is drawn and whether it can be picked up. */
export function eggState(G, egg) {
    const F = G.flags, P = G.puz;
    if (F.has(eggFlag(egg.id))) return { state: 'got', x: egg.x, y: egg.y };
    switch (egg.how) {
        case 'dig': return { state: 'buried', x: egg.x, y: egg.y };
        case 'fall': {
            if (!F.has(egg.flag)) return { state: 'tree', x: egg.from.x, y: egg.from.y };
            if (P.fall && P.fall.t < FALL_SECONDS) {
                const u = P.fall.t / FALL_SECONDS;
                return { state: 'falling', x: egg.from.x + (egg.x - egg.from.x) * u, y: egg.from.y + (egg.y - egg.from.y) * u * u };
            }
            return { state: 'loose', x: egg.x, y: egg.y };
        }
        case 'wash': {
            if (F.has(egg.flag)) return { state: 'loose', x: egg.x, y: egg.y };
            return { state: 'ball', x: ballX(G), y: egg.y };
        }
        case 'trade': return { state: 'nest', x: egg.x, y: egg.y };
        default:
            if (!cond(egg.when, F)) return { state: 'dark', x: egg.x, y: egg.y };
            return { state: 'loose', x: egg.x, y: egg.y };
    }
}

/** Zones that push a visible swimmer; a hidden shell sinks straight through them. */
export function applyPushes(G, dt, events) {
    const p = G.player, zones = G.sceneDef?.pushes || [];
    for (const z of zones) {
        let inside = false;
        if (cond(z.when, G.flags) && p.mode === 'swim' && !(p.hidden && p.hide > 0.5)) {
            if (z.kind === 'box') {
                inside = p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1;
                if (inside) {
                    const k = Math.min(1, dt * 10);
                    if (z.vx !== undefined) p.vx += (z.vx - p.vx) * k;
                    if (z.vy !== undefined) p.vy += (z.vy - p.vy) * k;
                }
            } else if (z.kind === 'ring') {
                const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1;
                inside = d < z.r;
                if (inside) {
                    const k = Math.min(1, dt * 8), ux = dx / d, uy = dy / d;
                    // outward, and round a little, like water spun off a whirl
                    p.vx += (ux * z.speed - uy * z.speed * 0.5 - p.vx) * k;
                    p.vy += (uy * z.speed + ux * z.speed * 0.5 - p.vy) * k;
                }
            }
        }
        if (inside && !G.puz.pushed[z.id]) {
            const from = z.kind === 'box' ? (p.x < (z.x0 + z.x1) / 2 ? -1 : 1) : 0;
            events.push({ type: 'pushed', id: z.id, x: p.x, y: p.y, from });
        }
        G.puz.pushed[z.id] = inside;
    }
}

export function stepPuzzles(G, events, dt) {
    const p = G.player, F = G.flags, P = G.puz, sc = G.sceneDef;
    if (!sc) return;
    // P1: hoofbeats on the hollow log
    if (sc.drum && !F.has('p1_fallen')) {
        for (const e of events) {
            if (e.type !== 'hoof' || p.surface?.id !== sc.drum.surface) continue;
            if (e.speed >= sc.drum.minSpeed) {
                P.drum++;
                G.emit('drum', { n: P.drum, of: sc.drum.beats });
                if (P.drum >= sc.drum.beats) {
                    G.flag('p1_fallen');
                    P.fall = { t: 0 };
                    G.emit('eggFall', { id: 'e2' });
                    break;
                }
            } else {
                P.softDrum++;
                G.emit('drumSoft', { n: P.softDrum });
            }
        }
    }
    if (P.fall && P.fall.t < FALL_SECONDS) {
        P.fall.t += dt;
        if (P.fall.t >= FALL_SECONDS) G.emit('eggLanded', { id: 'e2' });
    }
    // P5: the ball rolls down to the river, and the river washes it
    if (P.roll) {
        const b = ballDef(G);
        P.roll.t += dt;
        if (P.roll.phase === 'roll' && P.roll.t >= b.rollSeconds) {
            P.roll = { t: 0, phase: 'wash' };
            G.emit('ballSplash', {});
        } else if (P.roll.phase === 'wash' && P.roll.t >= b.washSeconds) {
            P.roll = null;
            G.flag('p5_washed');
            G.emit('ballWashed', {});
        }
    }
    // P4: the moonshine seeds open round a still, hidden shell
    if (sc.seeds && !F.has(sc.seeds.flag)) {
        const s = sc.seeds;
        const still = p.mode === 'ground' && p.hidden && p.hide > 0.95 && Math.abs(p.vx) < 5 && p.x >= s.x0 && p.x <= s.x1;
        P.still = still ? P.still + dt : Math.max(0, P.still - dt * 2);
        if (P.still >= s.seconds) { G.flag(s.flag); G.emit('seedsLit', {}); }
    }
    // P6: the coin waits in the whirlpool's eye
    for (const e of events) {
        if (e.type === 'vortexEye' && e.id === 'djuphalan' && !F.has('coin_got')) {
            G.flag('coin_got');
            G.emit('coin', {});
        }
        if (e.type === 'laneEnd' && e.id === 'undertow') G.emit('undertowIn', {});
    }
    // eggs that lie loose are picked up by touch
    for (const egg of sc.eggs || []) {
        if (F.has(eggFlag(egg.id)) || egg.how === 'dig' || egg.how === 'trade') continue;
        const st = eggState(G, egg);
        if (st.state !== 'loose') continue;
        if (Math.hypot(p.x - st.x, (p.y - st.y) * 0.8) < TOUCH) collectEgg(G, egg.id);
    }
}

/** The action the button would do here, or null. Labels come from sv.mjs. */
export function contextAction(G) {
    const p = G.player, F = G.flags, sc = G.sceneDef, P = G.puz;
    if (!sc || p.hidden || p.mode === 'air' || p.mode === 'leap' || p.mode === 'streck') return null;
    if (p.mode === 'ground') {
        // E1: dig where the sand glimmers
        const dig = (sc.eggs || []).find(e => e.how === 'dig' && !F.has(eggFlag(e.id)));
        if (dig && Math.abs(p.x - dig.x) < 0.95 * HL && Math.abs(p.y - dig.y) < 0.5 * HL) {
            return { id: 'dig', label: CONTEXT.dig, run: () => { p.action = 'stamp'; p.actionT = 0; p.actionDur = 0.6; G.emit('dug', { id: dig.id }); collectEgg(G, dig.id); } };
        }
        // P5: the beetle's ball, pushed from the beetle's side towards the river
        if (sc.ball && !F.has('p5_rolled')) {
            const b = sc.ball, bx = ballX(G), dx = p.x - bx;
            const level = Math.abs(p.y - (heightOn(b.path, bx) ?? p.y)) < 0.45 * HL;
            if (level && dx >= b.push.min && dx <= b.push.max && p.facing < 0) {
                return { id: 'push', label: CONTEXT.push, run: () => pushBall(G) };
            }
            if (level && -dx >= b.push.min && -dx <= b.push.max && p.facing > 0) {
                return { id: 'push', label: CONTEXT.push, run: () => G.emit('pushWrong', {}) };
            }
        }
        // P6: Skatan on her branch
        if (sc.magpie && p.surface?.id === sc.magpie.surface && Math.abs(p.x - sc.magpie.x) < sc.magpie.reach && !F.has('coin_given')) {
            if (F.has('coin_got')) return { id: 'give', label: CONTEXT.give, run: () => giveCoin(G) };
            return { id: 'talk-skata', label: CONTEXT.talk, run: () => G.emit('talk', { who: 'skata' }) };
        }
        // P7: the vine across Ravinen
        if (sc.vinePull && !F.has(sc.vinePull.flag) && p.x >= sc.vinePull.x0 && p.x <= sc.vinePull.x1 && p.facing === sc.vinePull.facing && p.y > -1.2 * HL) {
            return { id: 'pull', label: CONTEXT.pull, run: () => { p.action = 'tug'; p.actionT = 0; p.actionDur = 0.8; G.flag(sc.vinePull.flag); G.emit('vine', {}); } };
        }
        // the grumpy beetle
        const beetle = G.actors.dyvel;
        if (beetle?.visible && beetle.scene === G.sceneId && Math.hypot(p.x - beetle.x, p.y - beetle.y) < TALK) {
            return { id: 'talk-dyvel', label: CONTEXT.talk, run: () => G.emit('talk', { who: 'dyvel' }) };
        }
    }
    // a word with a companion: their help for what we are doing now
    for (const who of ['tukan', 'klo']) {
        const a = G.actors[who];
        if (!a?.visible || a.scene !== G.sceneId || a.away) continue;
        if (Math.abs(p.x - a.x) < TALK && Math.abs(p.y - a.y) < 0.8 * HL) {
            return { id: 'talk-' + who, label: CONTEXT.talk, run: () => G.emit('talk', { who }) };
        }
    }
    return null;
}

function pushBall(G) {
    const sc = G.sceneDef, b = sc.ball, p = G.player;
    if (G.flags.has('p5_rolled') || G.puz.roll) return;
    G.puz.ball = ballX(G) - b.step;
    p.action = 'push'; p.actionT = 0; p.actionDur = 0.5;
    p.nudge = { x: G.puz.ball + 0.62 * HL, t: 0.6 };
    G.emit('push', { x: G.puz.ball });
    if (G.puz.ball <= b.edge) {
        G.flag('p5_rolled');
        G.puz.roll = { t: 0, phase: 'roll' };
        G.emit('ballRoll', {});
    }
}

function giveCoin(G) {
    if (G.flags.has('coin_given')) return;
    G.flag('coin_given');
    // the story lets Skatan speak first, then hands over both eggs (collectEgg)
    G.emit('trade', {});
}

/** Where the rolling ball is now (for the view): along its path, then sinking in the shallows. */
export function ballPose(G) {
    const b = G.scenes.strand.ball, P = G.puz, F = G.flags;
    if (F.has('p5_washed')) return null;
    if (!P.roll) {
        const x = ballX(G);
        return { x, y: heightOn(b.path, x) ?? 0, spin: (b.x0 - x) / (0.35 * HL), wash: 0 };
    }
    if (P.roll.phase === 'roll') {
        const u = Math.min(1, P.roll.t / b.rollSeconds), e = u * u;
        const x = b.edge + (b.stopX - b.edge) * e;
        const y = heightOn(b.path, Math.max(b.path[0][0], Math.min(b.path.at(-1)[0], x))) ?? 0;
        return { x, y, spin: (b.x0 - x) / (0.35 * HL), wash: 0 };
    }
    return { x: b.stopX, y: b.path[0][1], spin: (b.x0 - b.stopX) / (0.35 * HL), wash: Math.min(1, P.roll.t / b.washSeconds) };
}

export function restorePuzzles(G, puz) {
    G.puz.ball = Number.isFinite(puz.ball) ? puz.ball : null;
    // an interrupted roll is finished on reload: the river has washed the ball
    if (G.flags.has('p5_rolled') && !G.flags.has('p5_washed')) G.flags.add('p5_washed');
}
