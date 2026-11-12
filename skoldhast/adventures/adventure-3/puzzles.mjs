/*
 * Äventyr 3 – the ten star-lights and the puzzles that earn them (pure: no DOM, no Pixi).
 * docs/skoldhast/adventure-3.md, section 9.
 *
 *   M1  Knuffa Nova's cereal box off Hyllan; it sinks slowly down to her (the Moon jump reaches the shelf)
 *   M2  the beam lifts a still, hidden shell out of Djupa kratern (game.mjs carries)
 *   M3  galloping beside Nova makes her angry, and her red lamps light Nattsidan for four seconds
 *   M4  a shell hidden in mid-air drops like a stone onto the ledge (game.mjs airHide)
 *   M5  the climb to Utsikten (story)
 *   S1  Karlavagnen's dashed line, drawn by the sim's own rule; each star rings a note
 *   S2  Orions bälte: land on the three stones in Nova's order (middle, left, right)
 *   S3  the bear's dashed nose (the sim's rule), after a run-up along his back
 *   S4  Pip's orbit takes a hidden shell round to him (game.mjs carries); a swimmer is kicked out
 *   R1  gravel showers push a visible sköldhäst back; hidden, it holds (as Äventyr 2's gusts)
 *   R2  the slingshot: a shell hidden in the air falls into one of three lanes (game.mjs carries)
 *   R3  Knuffa the ice block east into the sun, where it melts
 *   R4  Kometen's lane carries a hidden shell to Rastplatsen, where Kometen rests a breath each lap
 *   R5  Luckan's dashed arc, drawn between two showers (a shower knocks the drawing back)
 *   V1  dents in the paper, drawn by the sim's rule; V2  stillness lights the fog's dents (three times);
 *   V3  Suddet rubs Sista bron out behind the hooves, twice, then the beam carries the shell over
 *   V5  the sköldhäst draws its own outline back, one gallop stride a piece
 *   G1  Den stora galoppen: how far has been galloped along the comet's tail (never less)
 *
 * Completed steps are flags (they are what the save keeps). Moment-to-moment states (the anger light,
 * the shower phase, the rubbed outline's strokes) are never saved.
 */
import { HL, cond, heightOn } from '../../src/sim.mjs';
import { CONTEXT } from './content/sv.mjs';
import { LIGHT_IDS, TRAVEL } from './content/world.mjs';

const TOUCH = 0.85 * HL;
const TALK = 2.6 * HL;
const ROCKET_REACH = 2.2 * HL;

export function createPuzzleState() {
    return {
        box: null,           // M1: the cereal box's x on the shelf (null = at its start)
        boxFall: null,       // { t } while it sinks down to Nova's bed
        angryUntil: -1,      // M3: Nova's lamps are red (and light the dark) until this time
        litShown: false,     // M3: whether the dark is lit now (for 'nightLit' / 'nightOut')
        belt: [],            // S2: the stones lit so far, in order
        beltOn: null,        // S2: the stone stood on now
        ice: null,           // R3: the ice block's x (null = at its start)
        melt: null,          // { t } while it melts in the sun
        shower: null,        // R1/R5: { id, state: 'warn' | 'shower', s } where the sköldhäst is
        held: 0,             // R1: seconds a hidden shell has held out a shower
        fogStill: 0,         // V2: seconds hidden and still before the next dents
        bridgeRubs: 0,       // V3: how many times Suddet has rubbed the bridge out
        selfDrawn: 0,        // V5: pieces of the outline drawn back (0..12), never saved
        selfBeats: 0,        // V5: galloping hoofbeats since the last piece
        selfIdle: 0,         // V5: seconds standing still with the outline gone
        ride: 0,             // G1: how far has been galloped from the tip (world units)
        rideMarks: 0,        // G1: how many of the ride's marks have been passed
        pull: 0,             // seconds a swimmer has floated in a planet's pull
        beamStill: 0,        // seconds still and hidden on a ring of light
        cometPhase: 0        // R4: where Kometen is in its lap (0..1); resting while < rest/period
    };
}

export const lightFlag = (id) => 'light_' + id;
export function lightsFound(G) { return LIGHT_IDS.filter(id => G.flags.has(lightFlag(id))).length; }

export function collectLight(G, id) {
    if (G.flags.has(lightFlag(id))) return false;
    G.flag(lightFlag(id));
    G.emit('light', { id, n: lightsFound(G) });
    return true;
}

/** Where a star-light is drawn and whether it can be touched. */
export function lightState(G, light) {
    const F = G.flags;
    if (F.has(lightFlag(light.id))) return { state: 'got', x: light.x, y: light.y };
    switch (light.how) {
        case 'touch': return cond(light.when, F) ? { state: 'loose', x: light.x, y: light.y } : { state: 'held', x: light.x, y: light.y };
        case 'belt': return F.has('belt_lit') ? { state: 'loose', x: light.x, y: light.y } : { state: 'held', x: light.x, y: light.y };
        case 'melt': {
            if (F.has('ice_melted')) return { state: 'loose', x: light.x, y: light.y };
            return { state: 'ice', x: iceX(G) + 0.05 * HL, y: light.y };
        }
        case 'given': return { state: 'given', x: light.x, y: light.y };
        case 'tail': return { state: 'tail', x: light.x, y: light.y };
        case 'trace': return { state: 'dent', x: light.x, y: light.y };
        default: return { state: 'loose', x: light.x, y: light.y };
    }
}

// --- M1: the cereal box -------------------------------------------------------------------------
function boxDef(G) { return G.scenes.mane.box; }
export function boxX(G) { return G.puz.box ?? boxDef(G).x0; }
/** Where the box is (for the view): on the shelf, sinking down, or at Nova's bed (eaten after breakfast). */
export function boxPose(G) {
    const b = boxDef(G), P = G.puz, F = G.flags;
    if (F.has('breakfast') || F.has('box_landed')) return { x: b.fallTo.x, y: b.fallTo.y, state: F.has('breakfast') ? 'empty' : 'bed' };
    if (P.boxFall) {
        const u = Math.min(1, P.boxFall.t / b.fallSeconds), e = u * u * (3 - 2 * u);
        return { x: b.edge + (b.fallTo.x - b.edge) * e, y: b.y + (b.fallTo.y - b.y) * e, state: 'falling', u };
    }
    return { x: boxX(G), y: b.y, state: 'shelf' };
}
function pushBox(G) {
    const b = boxDef(G), p = G.player;
    if (G.flags.has('box_pushed') || G.puz.boxFall) return;
    G.puz.box = boxX(G) - b.step;
    p.action = 'push'; p.actionT = 0; p.actionDur = 0.5;
    p.nudge = { x: G.puz.box + 0.62 * HL, t: 0.6 };
    G.emit('push', { x: G.puz.box });
    if (G.puz.box <= b.edge) {
        G.flag('box_pushed');
        G.puz.boxFall = { t: 0 };
        G.emit('boxFalls', {});
    }
}

// --- R3: the ice block --------------------------------------------------------------------------
function iceDef(G) { return G.scenes.ring.ice; }
export function iceX(G) { return G.puz.ice ?? iceDef(G).x0; }
export function icePose(G) {
    const d = iceDef(G), P = G.puz, F = G.flags;
    if (F.has('ice_melted')) return { x: Math.max(iceX(G), d.sunX), y: d.y, melt: 1 };
    return { x: iceX(G), y: d.y, melt: P.melt ? Math.min(1, P.melt.t / d.melt) : 0 };
}
function pushIce(G) {
    const d = iceDef(G), p = G.player;
    if (G.flags.has('ice_melted') || G.puz.melt) return;
    G.puz.ice = iceX(G) + d.step;
    p.action = 'push'; p.actionT = 0; p.actionDur = 0.5;
    p.nudge = { x: G.puz.ice - 0.62 * HL, t: 0.6 };
    G.emit('push', { x: G.puz.ice });
    if (G.puz.ice >= d.sunX) { G.puz.melt = { t: 0 }; G.emit('iceInSun', {}); }
}

// --- R1/R5: gravel showers (Äventyr 2's gusts with new pictures) ----------------------------------
export function stepShowers(G, events) {
    const sc = G.sceneDef, p = G.player, F = G.flags;
    const all = sc?.showers || [];
    let now = null;
    // only where the sköldhäst is: far from the ring's showers there is none (the warning used to come at Isbryggan)
    const here = all.filter(s => p.x >= s.x0 - 4 * HL && p.x <= s.x1 + 4 * HL);
    for (const s of here) {
        const t = (G.time + s.phase) % s.period;
        const state = t < s.shower ? 'shower' : t > s.period - s.warn ? 'warn' : null;
        if (state) { now = { id: s.id, state, s }; break; }
    }
    const was = G.puz.shower?.state || null;
    G.puz.shower = now;
    if ((now?.state || null) !== was) events.push({ type: 'shower', state: now?.state || null, id: now?.id });
    void F;
}
/** Is x under a shower and out of its shelter? */
export function showerAt(G, x) {
    const g = G.puz.shower;
    if (!g || g.state !== 'shower') return null;
    const s = g.s;
    if (x < s.x0 || x > s.x1) return null;
    if ((s.shelter || []).some(([a, b]) => x >= a && x <= b)) return null;
    return s;
}
export function applyShowers(G, dt, events) {
    const p = G.player, P = G.puz;
    if (G.busy > 0) return;
    const s = p.mode === 'ground' ? showerAt(G, p.x) : null;
    if (!s) { P.hit = false; if (!P.shower || P.shower.state !== 'shower') P.held = 0; return; }
    if (p.hidden || p.hideQueued) {
        p.vx *= Math.exp(-12 * dt);
        P.held += dt;
        if (P.held > 0.6 && !G.flags.has('gravel_held')) { G.flag('gravel_held'); events.push({ type: 'gravelHeld' }); }
        return;
    }
    const k = Math.min(1, dt * 5);
    p.vx += (-s.strength - p.vx) * k;
    if (!P.hit) { P.hit = true; events.push({ type: 'gravelHit', id: s.id }); }
}

/** Kometen's lap on the ring page: where it is (0..1) and whether it rests at Rastplatsen now. */
export function cometState(G) {
    const c = G.scenes.ring.comet;
    const ph = (G.time % c.period) / c.period;
    return { phase: ph, resting: ph * c.period < c.rest };
}

// --- the step --------------------------------------------------------------------------------------
export function stepPuzzles(G, events, dt) {
    const p = G.player, F = G.flags, P = G.puz, sc = G.sceneDef;
    if (!sc) return;
    // M1: the box sinks down to Nova's bed
    if (P.boxFall) {
        P.boxFall.t += dt;
        if (P.boxFall.t >= boxDef(G).fallSeconds) { P.boxFall = null; G.flag('box_landed'); G.emit('boxLanded', {}); }
    }
    // M3 (and everywhere): hoofbeats close to Nova make her angry; on Nattsidan her red lamps are the light
    const nova = G.actors.nova;
    if (nova?.visible && nova.scene === G.sceneId && nova.follow) {
        for (const e of events) {
            if (e.type !== 'hoof' || e.speed < (sc.dark?.minSpeed ?? 950)) continue;
            if (Math.abs(p.x - nova.x) > (sc.dark?.reach ?? 3 * HL)) continue;
            const was = G.time < P.angryUntil;
            P.angryUntil = G.time + (sc.dark?.seconds ?? 4);
            if (!was) G.emit('novaAngry', { x: nova.x });
        }
    }
    // after Utsikten Nova is furious at the thief ("En stjärntjuv. På MIN himmel."): her lamps burn red all the way
    // back to the rocket, so the night side is not a chore the second time
    if (sc.dark && nova?.visible && nova.scene === G.sceneId && nova.follow && F.has('m5_view') && !F.has('fin_drawn') && !F.has('ended'))
        P.angryUntil = Math.max(P.angryUntil, G.time + 0.5);
    if (sc.dark) {
        const inDark = p.x >= sc.dark.x0 - 2 * HL && p.x <= sc.dark.x1;
        const lit = G.time < P.angryUntil;
        if (lit !== F.has(sc.dark.flag)) {
            if (lit) F.add(sc.dark.flag); else F.delete(sc.dark.flag);
            G.terrain?.refresh();
        }
        if (inDark && lit !== P.litShown) { P.litShown = lit; G.emit(lit ? 'nightLit' : 'nightOut', {}); }
        if (!inDark) P.litShown = false;
    }
    // S2: Orions bälte, the stones landed on in order
    if (sc.belt && !F.has(sc.belt.flag)) {
        const on = p.mode === 'ground' ? p.surface?.belt || null : null;
        if (on && on !== P.beltOn) {
            const next = sc.belt.order[P.belt.length];
            if (on === next) {
                P.belt.push(on);
                G.emit('beltOne', { id: on, n: P.belt.length, of: sc.belt.order.length });
                if (P.belt.length === sc.belt.order.length) { G.flag(sc.belt.flag); G.emit('beltLit', {}); }
            } else if (!P.belt.includes(on)) {
                P.belt = [];
                G.emit('beltWrong', { id: on });
            }
        }
        P.beltOn = on;
    }
    // R3: the ice block melts in the sun
    if (P.melt) {
        P.melt.t += dt;
        if (P.melt.t >= iceDef(G).melt) { P.melt = null; G.flag('ice_melted'); G.emit('iceMelts', {}); }
    }
    // R4: Kometen rests at Rastplatsen a breath each lap; standing there then, the light in its tail is in reach
    if (sc.comet) {
        const cs = cometState(G);
        P.cometPhase = cs.phase;
        if (cs.resting && !F.has('comet_rest') && p.mode === 'ground' && p.surface?.id === 'rest') G.emit('cometRest', {});
    }
    // R5: a shower on the gap knocks the drawing back to its start
    if (p.mode === 'streck' && p.streck?.d.id === 'gapArc' && P.shower?.state === 'shower' && showerAt(G, p.x)) {
        p.streck.d._ink = 0;
        G.emit('streckBroken', { id: 'gapArc' });
        G.setBack?.('gapArc');
    }
    // V2: in the fog, a still, hidden shell lets Klo's seed light the next dents
    for (const fg of sc.fogGroups || []) {
        if (F.has(fg.flag)) continue;
        const prevLit = fg.n === 1 || F.has(sc.fogGroups[fg.n - 2].flag);
        const still = prevLit && p.mode === 'ground' && p.hidden && p.hide > 0.95 && Math.abs(p.vx) < 5 && p.x >= fg.x0 && p.x <= fg.x1;
        if (still) {
            P.fogStill += dt;
            if (P.fogStill >= fg.seconds) { P.fogStill = 0; G.flag(fg.flag); G.emit('fogLit', { n: fg.n }); }
        } else if (p.x >= fg.x0 && p.x <= fg.x1 && prevLit) P.fogStill = Math.max(0, P.fogStill - dt * 2);
        break;
    }
    // V3: Suddet rubs Sista bron out once the hooves have drawn it this far
    if (sc.bridge && !F.has(sc.bridge.flag) && p.mode === 'streck' && p.streck?.d.id === sc.bridge.dashed && p.streck.d._ink >= sc.bridge.rubAt) {
        P.bridgeRubs++;
        p.streck.d._ink = 0;
        G.emit('bridgeRubbed', { n: P.bridgeRubs });
        if (P.bridgeRubs >= sc.bridge.times) G.flag(sc.bridge.flag);
        G.setBack?.('lastBridge');
    }
    // V5: with its outline rubbed out, every galloping stride draws a piece of the sköldhäst back (a walk draws nothing)
    if (F.has('outline_gone') && !F.has('self_drawn') && G.selfDrawing) {
        let galloped = false;
        for (const e of events) {
            if (e.type !== 'hoof' || e.speed < 1000) continue;
            galloped = true;
            if (++P.selfBeats >= 4) {
                P.selfBeats = 0;
                if (P.selfDrawn < 12) { P.selfDrawn++; G.emit('selfStroke', { n: P.selfDrawn }); }
                if (P.selfDrawn >= 12) G.emit('selfDrawn', {});
            }
        }
        const still = Math.abs(p.vx) < 20 && p.mode === 'ground';
        P.selfIdle = galloped || !still ? 0 : P.selfIdle + dt;
        if (P.selfIdle > 7) { P.selfIdle = 0; G.emit('selfWait', {}); }
    }
    // G1: the great gallop: how far along the tail (never less), and the marks passed
    if (sc.ride && F.has('ride') && !F.has('ride_done')) {
        const r = sc.ride, got = Math.max(0, Math.min(r.length, r.tip - p.x));
        if (got > P.ride) P.ride = got;
        while (P.rideMarks < r.marks.length && P.ride >= r.marks[P.rideMarks].at) { G.emit('rideMark', { mark: r.marks[P.rideMarks], i: P.rideMarks }); P.rideMarks++; }
        if (p.x <= h(8) && p.mode === 'ground') G.emit('rideDone', {});
    }
    // star-lights that lie loose are picked up by touch (floating or standing)
    for (const light of sc.lights || []) {
        if (F.has(lightFlag(light.id))) continue;
        const st = lightState(G, light);
        if (st.state !== 'loose') continue;
        if (Math.hypot(p.x - st.x, (p.y - h(0.35) - st.y) * 0.8) < TOUCH) collectLight(G, light.id);
    }
}
const h = (v) => v * HL;

/** The action the button would do here, or null. Labels come from sv.mjs. */
export function contextAction(G) {
    const p = G.player, F = G.flags, sc = G.sceneDef;
    if (!sc || p.hidden || p.mode === 'air' || p.mode === 'leap' || p.mode === 'streck' || G.carry) return null;
    if (p.mode === 'ground') {
        // M1: Nova's cereal box, pushed west off Hyllan towards her bed
        if (sc.box && !F.has('box_pushed')) {
            const b = sc.box, bx = boxX(G), dx = p.x - bx;
            if (Math.abs(p.y - b.y) < 0.3 * HL && dx >= b.push.min && dx <= b.push.max && p.facing < 0) return { id: 'push', label: CONTEXT.push, run: () => pushBox(G) };
        }
        // after the story: a second box on the shelf (a secret)
        if (sc.box && F.has('ended') && F.has('box2_shelf') && !F.has('box2_pushed') && Math.abs(p.y - sc.box.y) < 0.3 * HL
            && p.x - sc.box.x0 >= sc.box.push.min && p.x - sc.box.x0 <= sc.box.push.max && p.facing < 0) {
            return { id: 'push2', label: CONTEXT.push, run: () => { G.flag('box2_pushed'); G.emit('secondBox', {}); } };
        }
        // R3: the ice block, pushed east into the sun
        if (sc.ice && !F.has('ice_melted') && !G.puz.melt && p.surface?.id === 'shade') {
            const d = sc.ice, dx = iceX(G) - p.x;
            if (dx >= d.push.min && dx <= d.push.max && p.facing > 0) return { id: 'push-ice', label: CONTEXT.push, run: () => pushIce(G) };
            if (-dx >= d.push.min && -dx <= d.push.max && p.facing < 0) return { id: 'push-ice', label: CONTEXT.push, run: () => G.emit('iceWrong', {}) };
        }
        // the rocket's door: "Res" (section 8.6)
        if (sc.rocketAt && rocketHere(G) && Math.abs(p.x - sc.rocketAt.x) < ROCKET_REACH && Math.abs(p.y - sc.rocketAt.y) < 0.6 * HL && G.travelOk?.()) {
            return { id: 'travel', label: CONTEXT.travel, run: () => G.emit('travel', {}) };
        }
        // after the story Suddet lives on the Moon, a small friend
        const s = G.actors.sudd;
        if (s?.visible && s.scene === G.sceneId && F.has('ended') && Math.hypot(p.x - s.x, p.y - s.y) < TALK) {
            return { id: 'talk-sudd', label: CONTEXT.talk, who: 'sudd', run: () => G.emit('talk', { who: 'sudd' }) };
        }
    }
    // a word with a companion: the nearer one first, then the other (as Äventyr 2 after 7 November)
    const near = ['klo', 'nova'].map(who => G.actors[who])
        .filter(a => a?.visible && a.follow && a.scene === G.sceneId && Math.abs(p.x - a.x) < TALK && Math.abs(p.y - a.y) < 1.4 * HL)
        .sort((a, b) => Math.abs(p.x - a.x) - Math.abs(p.x - b.x));
    if (near.length) {
        const who = (near.length > 1 && near[0].id === G.lastTalk ? near[1] : near[0]).id;
        return { id: 'talk-' + who, label: CONTEXT.talk, who, run: () => { G.lastTalk = who; G.emit('talk', { who }); } };
    }
    return null;
}

/** Is Mira's rocket standing on this page now? (Rubbed out on arrival in the white; a new one after the story.) */
export function rocketHere(G) {
    const F = G.flags;
    if (!G.sceneDef?.rocketAt) return false;
    // after the story Mira has drawn a new rocket ("ännu snedare"): it stands at every page's dock
    if (F.has('ended')) return true;
    return !F.has('rocket_gone');
}

/** The pages the rocket can go to now (section 8.6). */
export function travelPlaces(G) {
    const n = lightsFound(G);
    return TRAVEL.map(t => ({ id: t.id, open: !!t.open(G.flags, n) && t.id !== G.sceneId, here: t.id === G.sceneId,
        visible: t.id !== 'vinter' || G.flags.has('ended') }));
}

export function restorePuzzles(G, puz) {
    G.puz.box = Number.isFinite(puz.box) ? puz.box : null;
    G.puz.ice = Number.isFinite(puz.ice) ? puz.ice : null;
    G.puz.ride = Number.isFinite(puz.ride) ? puz.ride : 0;
    G.puz.belt = Array.isArray(puz.belt) ? puz.belt.filter(x => typeof x === 'string') : [];
    G.puz.bridgeRubs = Number.isFinite(puz.bridgeRubs) ? puz.bridgeRubs : 0;
    // an interrupted fall or melt is finished on reload
    if (G.flags.has('box_pushed') && !G.flags.has('box_landed')) G.flags.add('box_landed');
    if (G.puz.ice !== null && G.puz.ice >= G.scenes.ring.ice.sunX && !G.flags.has('ice_melted')) G.flags.add('ice_melted');
    if (G.flags.has('belt_lit')) G.puz.belt = [...G.scenes.stjarn.belt.order];
    void cond; void heightOn;
}
