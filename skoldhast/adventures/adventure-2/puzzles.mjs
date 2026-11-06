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
 *   P9  the magic mushroom bounces the sköldhäst up to a high branch (game.mjs)
 *   K1  galloping hooves ring three crystal plates in turn, the next one blinking; lit, they make the chasm's bridge drawable
 *   K2  of three currents under Kristallsjön's wall only the white one carries a shell through
 *   K3  Knuffa Tordyveln's glitter ball onto one plate, press the other with a still shell
 *   T1  gusts push a visible sköldhäst back on the ridge; hidden, it holds (applyWinds)
 *   T2  the bridge of light is drawable only while the lightning shows it (stepWeather)
 *   T3  past the bridge the wind has turned: a visible sköldhäst is carried over the gap, a hidden shell stays
 *
 * Completed steps are flags (they are what the save keeps). Transient motion
 * (a falling egg, the rolling ball) restarts as finished after a reload.
 */
import { HL, cond, heightOn } from '../../src/sim.mjs';
import { CONTEXT } from './content/sv.mjs';
import { EGG_IDS } from './content/world.mjs';

const FALL_SECONDS = 0.9;
const TOUCH = 0.85 * HL;
const TALK = 2.6 * HL;

export function createPuzzleState() {
    return {
        drum: 0, softDrum: 0,
        fall: null,          // { t } while the cocoa tree's egg falls
        ball: null,          // the beetle ball's x (null = at its start)
        roll: null,          // { t, phase: 'roll' | 'wash' }
        still: 0,            // seconds hidden and still beside the moonshine seeds
        pushed: {},          // push zones the swimmer is inside now
        crystal: {},         // K1: galloping beats on each crystal plate
        glitter: null,       // K3: the glitter ball's x (null = at its start)
        glitterRoll: null,   // { t } while it rolls into the pool
        plate: 0,            // K3: seconds a still shell has lain on plate B
        gust: null           // T1: { id, state: 'warn' | 'gust' } on the ridge now
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
        case 'cloud': return { state: 'nest', x: egg.x, y: egg.y };
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

/** The weather on the peak: the lightning flag the bridge of light needs, and each gust's state. */
export function stepWeather(G, events) {
    const sc = G.sceneDef, F = G.flags;
    const L = sc?.lightning;
    if (L) {
        const on = !F.has('moon') && ((G.time + L.phase) % L.period) < L.on;
        if (on && !F.has(L.flag)) { F.add(L.flag); events.push({ type: 'flash', on: true }); }
        else if (!on && F.has(L.flag)) { F.delete(L.flag); events.push({ type: 'flash', on: false }); }
    }
    let gust = null;
    // the wind where the sköldhäst is sets the weather, so one stretch never takes a gust from the other
    const p = G.player, winds = sc?.winds || [], here = winds.filter(w => p.x >= w.x0 - 2.5 * HL && p.x <= w.x1 + 2.5 * HL);
    for (const w of here.length ? here : winds) {
        if (F.has('moon')) break;
        const t = (G.time + w.phase) % w.period;
        const state = t < w.gust ? 'gust' : t > w.period - w.warn ? 'warn' : null;
        if (state) { gust = { id: w.id, state, w }; break; }
    }
    const was = G.puz.gust?.state || null;
    G.puz.gust = gust;
    // the moment-to-moment flag T3's gap reads, like the lightning's for T2's bridge
    const tail = gust?.state === 'gust' && gust.w.dir > 0;
    if (tail) F.add('tailwind'); else F.delete('tailwind');
    if ((gust?.state || null) !== was) events.push({ type: 'gust', state: gust?.state || null, id: gust?.id });
}

/** Is x in a wind's reach and out of its shelter? */
export function windAt(G, x, y) {
    const g = G.puz.gust;
    if (!g || g.state !== 'gust') return null;
    const w = g.w;
    if (x < w.x0 || x > w.x1) return null;
    if ((w.shelter || []).some(([a, b]) => x >= a && x <= b)) return null;
    return w;
}

/** T1: a gust pushes a visible sköldhäst on open ground back west; tucked in its shell it holds. */
export function applyWinds(G, dt, events) {
    const p = G.player;
    const P = G.puz;
    // while the story holds the controls the wind holds too: at Klippan it used to carry the sköldhäst over the gap
    // while Alva was still reading "Så långt kan ingen hoppa" (5 November)
    if (G.busy > 0) { P.carried = 0; return; }
    const w = p.mode === 'ground' ? windAt(G, p.x, p.y) : null;
    if (!w?.dir) P.carried = 0;
    if (!w) return;
    if (p.hidden || p.hideQueued) {
        p.vx *= Math.exp(-12 * dt);
        if (w.dir > 0) events.push({ type: 'tailHidden' });
        return;
    }
    // a wind from behind lifts the sköldhäst along, even one standing still
    if (w.dir > 0) {
        if (!P.carried) events.push({ type: 'carried', id: w.id });
        P.carried = Math.min(1, (P.carried || 0) + dt * 3.5);
        p.vx = Math.max(p.vx, w.strength * P.carried);
        return;
    }
    const k = Math.min(1, dt * 5);
    p.vx += (-w.strength - p.vx) * k;
    if (!G.puz.blown) { G.puz.blown = true; events.push({ type: 'blown', id: w.id }); }
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
        if (P.wasStill && !still && P.still >= 0.6) G.emit('seedsShy', {});
        P.wasStill = still;
        // standing there in plain sight is not enough: the flowers can still see the sköldhäst
        const watched = p.mode === 'ground' && !p.hidden && Math.abs(p.vx) < 5 && p.x >= s.x0 && p.x <= s.x1;
        P.watched = watched ? (P.watched || 0) + dt : 0;
        if (P.watched >= 3) { P.watched = 0; G.emit('seedsWatched', {}); }
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
    // the moonshine seeds give a light to carry
    if (F.has('p4_lit') && !F.has('lantern')) G.flag('lantern');
    // K1: galloping hooves ring the crystal plates
    if (sc.crystals && !F.has(sc.crystals.flag)) {
        for (const e of events) {
            const id = p.surface?.crystal;
            if (e.type !== 'hoof' || !id || F.has(id)) continue;
            if (id !== sc.crystals.plates.find(c => !F.has(c))) { G.emit('crystalWait', { id }); continue; }
            if (e.speed < sc.crystals.minSpeed) { G.emit('crystalSoft', { id }); continue; }
            P.crystal[id] = (P.crystal[id] || 0) + 1;
            G.emit('crystalRing', { id, n: P.crystal[id] });
            if (P.crystal[id] >= sc.crystals.beats) {
                G.flag(id);
                const lit = sc.crystals.plates.filter(c => F.has(c)).length;
                G.emit('crystalLit', { id, lit, of: sc.crystals.plates.length });
                if (lit === sc.crystals.plates.length) G.flag(sc.crystals.flag);
            }
        }
    }
    // K3: the glitter ball rolls into the pool, onto plate A
    if (P.glitterRoll) {
        const b = sc.glitterBall || G.scenes.kristall.glitterBall;
        P.glitterRoll.t += dt;
        if (P.glitterRoll.t >= b.rollSeconds) { P.glitterRoll = null; G.flag(b.flag); G.emit('glitterIn', {}); }
    }
    // K3: a still shell on plate B, while the ball weighs down plate A
    for (const pl of sc.plates || []) {
        if (F.has(pl.flag)) continue;
        const on = p.mode === 'swim' && p.hidden && p.hide > 0.9 && p.resting && Math.abs(p.x - pl.x) < pl.w && Math.abs(p.y - pl.y) < 0.5 * HL;
        if (!on) { if (P.plate > 0.4) G.emit('plateOff', { id: pl.id }); P.plate = 0; continue; }
        if (P.plate === 0) G.emit('plateOn', { id: pl.id, ready: cond(pl.needs, F) });
        P.plate += dt;
        if (P.plate >= pl.hold && cond(pl.needs, F)) { G.flag(pl.flag); G.emit('plateOpen', { id: pl.id }); }
    }
    // K2: a current that only goes round, and the one that goes through
    for (const e of events) {
        if (e.type !== 'laneEnd') continue;
        const lane = sc.lanes?.find(l => l.id === e.id);
        if (lane?.loop) G.emit('loopBack', { id: e.id });
    }
    // T3: over the gap
    for (const e of events) if (e.type === 'land' && e.id === 'wind-gap' && !F.has('gap_crossed')) G.flag('gap_crossed');
    // K2: through, the first time the sköldhäst is in the water east of the rock wall (however it got there)
    if (sc.id === 'kristall' && !F.has('k2_through') && p.mode === 'swim' && p.x > 46.8 * HL && p.y > 1.5 * HL && p.x < 54 * HL) {
        G.flag('k2_through');
        G.emit('throughWall', {});
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
        // K3: Tordyveln's glitter ball, pushed east into the pool
        if (sc.glitterBall && !F.has('k3_pushed')) {
            const b = sc.glitterBall, bx = glitterX(G), dx = bx - p.x;
            const level = Math.abs(p.y - (heightOn(b.path, bx) ?? p.y)) < 0.45 * HL;
            if (level && dx >= b.push.min && dx <= b.push.max && p.facing > 0) {
                return { id: 'push-glitter', label: CONTEXT.push, run: () => pushGlitter(G) };
            }
        }
        // P6: Skatan on her branch
        if (sc.magpie && p.surface?.id === sc.magpie.surface && Math.abs(p.x - sc.magpie.x) < sc.magpie.reach && !F.has('eggs_in_nest')) {
            if (F.has('coin_got') && !F.has('coin_given')) return { id: 'give', label: CONTEXT.give, run: () => giveCoin(G) };
            return { id: 'talk-skata', label: CONTEXT.talk, who: 'skata', run: () => G.emit('talk', { who: 'skata' }) };
        }
        // P7: the vine across Ravinen
        if (sc.vinePull && !F.has(sc.vinePull.flag) && p.x >= sc.vinePull.x0 && p.x <= sc.vinePull.x1 && p.facing === sc.vinePull.facing && p.y > -1.2 * HL) {
            return { id: 'pull', label: CONTEXT.pull, run: () => { p.action = 'tug'; p.actionT = 0; p.actionDur = 0.8; G.flag(sc.vinePull.flag); G.emit('vine', {}); } };
        }
        // the grumpy beetle
        const beetle = G.actors.dyvel;
        if (beetle?.visible && beetle.scene === G.sceneId && Math.hypot(p.x - beetle.x, p.y - beetle.y) < TALK) {
            return { id: 'talk-dyvel', label: CONTEXT.talk, who: 'dyvel', run: () => G.emit('talk', { who: 'dyvel' }) };
        }
    }
    // a word with a companion: their help for what we are doing now
    for (const who of ['tukan', 'klo']) {
        const a = G.actors[who];
        if (!a?.visible || a.scene !== G.sceneId) continue;
        if (Math.abs(p.x - a.x) < TALK && Math.abs(p.y - a.y) < 0.8 * HL) {
            return { id: 'talk-' + who, label: CONTEXT.talk, who, run: () => G.emit('talk', { who }) };
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

export function glitterX(G) { return G.puz.glitter ?? G.scenes.kristall.glitterBall.x0; }

function pushGlitter(G) {
    const b = G.scenes.kristall.glitterBall, p = G.player;
    if (G.flags.has('k3_pushed') || G.puz.glitterRoll) return;
    G.puz.glitter = glitterX(G) + b.step;
    p.action = 'push'; p.actionT = 0; p.actionDur = 0.5;
    p.nudge = { x: G.puz.glitter - 0.62 * HL, t: 0.6 };
    G.emit('push', { x: G.puz.glitter });
    if (G.puz.glitter >= b.edge) {
        G.flag('k3_pushed');
        G.puz.glitterRoll = { t: 0 };
        G.emit('glitterRoll', {});
    }
}

/** Where the glitter ball is (for the view): on the shore, rolling in, or on plate A. */
export function glitterPose(G) {
    const b = G.scenes.kristall.glitterBall, P = G.puz, F = G.flags;
    if (F.has(b.flag)) return { x: b.stopX, y: b.path.at(-1)[1], spin: (b.stopX - b.x0) / (0.3 * HL) };
    if (P.glitterRoll) {
        const u = Math.min(1, P.glitterRoll.t / b.rollSeconds), e = u * u;
        const x = b.edge + (b.stopX - b.edge) * e;
        return { x, y: heightOn(b.path, Math.min(b.path.at(-1)[0], x)) ?? 0, spin: (x - b.x0) / (0.3 * HL) };
    }
    const x = glitterX(G);
    return { x, y: heightOn(b.path, x) ?? 0, spin: (x - b.x0) / (0.3 * HL) };
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
    G.puz.glitter = Number.isFinite(puz.glitter) ? puz.glitter : null;
    if (G.flags.has('k3_pushed') && !G.flags.has('k3_ball')) G.flags.add('k3_ball');
    if (G.flags.has('p4_lit')) G.flags.add('lantern');
    // an interrupted roll is finished on reload: the river has washed the ball
    if (G.flags.has('p5_rolled') && !G.flags.has('p5_washed')) G.flags.add('p5_washed');
}
