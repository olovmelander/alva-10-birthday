/*
 * Äventyr 3: De försvunna stjärnorna – the game state and its fixed step (no DOM, no Pixi).
 *
 * Same shape as Äventyr 2's game.mjs: G holds the scene, flags, the player, puzzle state and actors;
 * main.mjs calls G.step(input) at 120 Hz. The movement is Äventyr 1's own simulation (src/sim.mjs),
 * unchanged. What space needs is done here, around it (docs/skoldhast/adventure-3.md, section 18.2):
 *
 *   - Low gravity on the Moon (rule 2): while the sköldhäst is not hidden the sim steps with gravity × 0.4
 *     and jump heights × 2.5, so the take-off is the same and a jump goes 2.5 times as high and as far.
 *     A hidden shell falls at full weight.
 *   - Hiding in mid-air (M4, R2, F1): the sim only queues a hide in the air; here it happens at once,
 *     and on the Moon the shell drops straight down like a stone.
 *   - Floating (rule 3): a `space` volume is a water the sim swims in, without a surface, without
 *     sinking for a hidden shell, and with asteroids to stand on (`swim: false`).
 *   - Carries: a still, hidden shell is taken along a path (Nova's beam, Pip's orbit, Kometen's lane,
 *     the slingshot, the catch), and the drawing Suddet rubs out sets the sköldhäst back.
 *   - The rubbed-out outline (V5) and the great gallop (G1) are counted in puzzles.mjs.
 */
import { createPlayer, stepPlayer, Terrain, STEP, HL, C, cond, heightOn, pointAt, lineLength } from '../../src/sim.mjs';
import { createGroundGuard } from '../../src/ground-guard.mjs';
import { createPuzzleState, stepPuzzles, contextAction, applyShowers, stepShowers, lightsFound, restorePuzzles } from './puzzles.mjs';
import { SCENES, CHECKPOINTS, LIGHT_TOTAL } from './content/world.mjs';

const SWIM_KEYS = ['vx', 'vy', 'hidden', 'hide', 'facing', 'submerge', 'speed', 'wetTimer'];
// moment-to-moment states kept as flags (so the sim's conditions can read them), never saved
const TRANSIENT = new Set(['novaLit']);
// the climax is one unit for the save (section 18.4): from the first bite until the sköldhäst is whole again,
// a save keeps what was true on Smulhögen before the first bite
const CLIMAX_FROM = 'climax';
const CLIMAX_TO = 'self_drawn';

const MOON_G = 0.4;
const FLOAT_MAX = 820, FLOAT_ACCEL = 1700;

export function createGame() {
    const listeners = new Map();
    const timers = [];
    const groundGuard = createGroundGuard({ pits: true });
    const G = {
        scenes: SCENES,
        sceneId: null, sceneDef: null, terrain: null,
        flags: new Set(),
        player: createPlayer({}),
        puz: createPuzzleState(),
        actors: {},
        time: 0, sceneTime: 0,
        busy: 0,
        inputLock: 0,
        areas: new Set(),
        checkpoint: 'start',
        story: null,
        camHint: null,
        camLook: null,
        context: null,
        lastEvents: [],
        carry: null,          // { def, path, len, s, speed, visible } while a shell is carried
        lastStand: null,      // where the sköldhäst last stood (thin lines too: the white page has nothing else)
        frozen: null,         // the flags and checkpoint from before the climax (a save inside it keeps these)
        lightTotal: LIGHT_TOTAL,
        selfDrawing: false,   // V5: the controls are back and the hooves draw the outline

        on(type, fn) { (listeners.get(type) || listeners.set(type, []).get(type)).push(fn); return () => G.off(type, fn); },
        off(type, fn) { const a = listeners.get(type); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
        emit(type, data = {}) {
            for (const fn of (listeners.get(type) || []).slice()) fn(data);
            for (const fn of (listeners.get('*') || []).slice()) fn(type, data);
        },
        later(sec, fn) { timers.push({ t: G.time + sec, fn }); },
        wait(sec) { return new Promise((r) => G.later(sec, r)); },

        flag(f) {
            if (G.flags.has(f)) return;
            if (f === CLIMAX_FROM && !G.frozen) G.frozen = { flags: [...G.flags].filter(x => !TRANSIENT.has(x)), checkpoint: G.checkpoint, puz: savePuz() };
            G.flags.add(f);
            if (f === CLIMAX_TO) G.frozen = null;
            G.terrain?.refresh();
            G.emit('flag', { flag: f });
        },
        unflag(f) { if (G.flags.delete(f)) { G.terrain?.refresh(); G.emit('flag', { flag: f, off: true }); } },
        has(f) { return G.flags.has(f); },
        cond(c) { return cond(c, G.flags); },
        lights() { return lightsFound(G); },

        goto(sceneId, spawn, { swimState = null } = {}) {
            const prev = G.sceneId;
            G.sceneId = sceneId;
            G.sceneDef = SCENES[sceneId];
            G.terrain = new Terrain(G.sceneDef, G.flags);
            const s = typeof spawn === 'string' ? G.sceneDef.spots[spawn] : spawn;
            G.player = createPlayer(s || G.sceneDef.spots.start || { x: 0, y: 0 });
            if (s?.hidden) { G.player.hidden = true; G.player.hide = 1; }
            const sup = G.terrain.support(G.player.x, G.player.y, 120, 400);
            if (G.player.mode === 'ground' && sup) { G.player.y = sup.y; G.player.surface = sup.s; }
            if (s?.mode === 'swim') {
                G.player.water = G.terrain.waterAt(G.player.x, G.player.y); G.player.submerge = 0;
                if (swimState) for (const key of SWIM_KEYS) G.player[key] = swimState[key];
            }
            G.carry = null; G.lastStand = null;
            G.flags.delete('novaLit');
            G.puz.angryUntil = -1; G.puz.pull = 0; G.puz.beamStill = 0; G.puz.fogStill = 0;
            G.sceneTime = 0;
            G.areas = new Set();
            groundGuard.reset();
            G.emit('scene', { id: sceneId, from: prev });
        },

        /** One fixed step. hop jumps; act only interacts; duck only hides. */
        step(input) {
            const dt = STEP;
            G.time += dt; G.sceneTime += dt;
            for (let i = timers.length - 1; i >= 0; i--) {
                if (timers[i].t <= G.time) { const t = timers.splice(i, 1)[0]; t.fn(); }
            }
            const locked = G.busy > 0 || G.inputLock > 0;
            if (G.inputLock > 0) G.inputLock -= dt;
            const inp = locked ? { x: 0, y: 0 } : input;
            G.context = locked ? null : contextAction(G);
            const events = [];
            const p = G.player, sc = G.sceneDef;
            if (G.carry) {
                stepCarry(dt, events);
                finishStep(events, inp, locked, dt);
                return;
            }
            const emerge = !!inp.hop && (p.hidden || p.hideQueued);
            const simInput = { x: inp.x || 0, y: inp.y || 0, hop: !!inp.hop && !emerge,
                hide: !inp.hop && (!!inp.hide || (!!inp.duck && !p.hidden && !p.hideQueued)),
                hideRelease: !!inp.hideRelease || emerge, hopHeld: !!inp.hopHeld && !emerge };
            if (inp.act && !inp.hop && !simInput.hide && !p.hidden && G.context) {
                const c = G.context; G.emit('context', { id: c.id }); c.run();
            }
            if (!locked && inp.tapHero && !p.hidden) neigh();
            airHide(simInput, events);
            climbOut(simInput, events);
            stepShowers(G, events);
            applyShowers(G, dt, events);
            applyPushes(dt, events);
            const before = { x: p.x, y: p.y };
            const space = inSpace();
            const moon = (sc.gravity ?? 1) < 1 && !p.hidden;
            const saved = moon || space ? { g: C.gravity, hop: C.hopHeight, buck: C.buckHeight, sm: C.swimMax, sa: C.swimAccel } : null;
            try {
                if (moon) { C.gravity = saved.g * MOON_G; C.hopHeight = saved.hop / MOON_G; C.buckHeight = saved.buck / MOON_G; }
                if (space) { C.swimMax = FLOAT_MAX; C.swimAccel = FLOAT_ACCEL; }
                stepPlayer(G.player, simInput, { terrain: G.terrain, flags: G.flags }, dt, events);
            } finally {
                if (saved) { C.gravity = saved.g; C.hopHeight = saved.hop; C.buckHeight = saved.buck; C.swimMax = saved.sm; C.swimAccel = saved.sa; }
            }
            afterHop(simInput, events);
            airSteer(simInput, dt);
            spaceAfter(before, simInput, events);
            groundGuard.walls(G, before, events);
            groundGuard.keep(G, before, events);
            ledgeFloat(events);
            rescue(events);
            groundGuard.net(G, events);
            for (const e of events) if (e.type === 'streckDone' && e.flag) { G.flags.delete(e.flag); G.flag(e.flag); }
            stepPuzzles(G, events, dt);
            startCarries(dt, events);
            finishStep(events, inp, locked, dt);
        },

        /** V3 and R5: the drawing is rubbed out (or knocked back) and the sköldhäst floats back to where it began. */
        setBack(id) {
            const p = G.player;
            const back = id === 'lastBridge' ? G.sceneDef.bridge.back : { x: G.sceneDef.dashed.find(d => d.id === id).pts[0][0] - 0.7 * HL, y: G.sceneDef.dashed.find(d => d.id === id).pts[0][1] };
            p.streck = null;
            const path = [[p.x, p.y], [(p.x + back.x) / 2, Math.min(p.y, back.y) - 1.2 * HL], [back.x, back.y]];
            G.carry = { def: { id: 'setBack-' + id, kind: 'setBack', end: { x: back.x, y: back.y, mode: 'ground' } }, path, len: lineLength(path), s: 0, speed: 1100, visible: true };
            p.mode = 'air'; p.vx = 0; p.vy = 0;
        },

        // --- save ------------------------------------------------------------------
        serialize() {
            // inside the climax, what was true before it
            if (G.frozen) return { flags: [...G.frozen.flags].sort(), checkpoint: G.frozen.checkpoint, puz: G.frozen.puz };
            return { flags: [...G.flags].filter(f => !TRANSIENT.has(f)).sort(), checkpoint: G.checkpoint, puz: savePuz() };
        },
        restore(data) {
            G.flags.clear();
            for (const f of data.flags || []) G.flags.add(f);
            G.frozen = null;
            G.checkpoint = CHECKPOINTS[data.checkpoint] ? data.checkpoint : 'start';
            Object.assign(G.puz, createPuzzleState());
            restorePuzzles(G, data.puz || {});
            const cp = CHECKPOINTS[G.checkpoint];
            G.goto(cp.scene, cp.spot || cp.at);
        },
        setCheckpoint(name) {
            if (!CHECKPOINTS[name] || G.checkpoint === name) return;
            G.checkpoint = name;
            G.emit('checkpoint', { id: name });
        },

        /** "Jag har fastnat": the nearest other checkpoint or spawn in this scene (never past what is still closed). */
        safeSpot() {
            const p = G.player, sc = G.sceneDef, T = G.terrain;
            const cands = [];
            for (const cp of Object.values(CHECKPOINTS)) if (cp.scene === G.sceneId && sc.spots[cp.spot]) cands.push(sc.spots[cp.spot]);
            for (const [k, v] of Object.entries(sc.spots)) if (/^(start|dock)/.test(k)) cands.push(v);
            const x0 = p.x;
            const between = (x, a, b = a) => (x > x0 ? b > x0 && a <= x : a < x0 && b >= x);
            const shut = (x) => {
                for (const e of T.edges || []) { if (e.kind !== 'pass' && between(x, e.x)) return true; }
                for (const d of T.dashed || []) if (between(x, Math.min(d.pts[0][0], d.pts.at(-1)[0]), Math.max(d.pts[0][0], d.pts.at(-1)[0]))) return true;
                for (const w of T.walls || []) if (between(x, w.x)) return true;
                return false;
            };
            let best = null, bd = Infinity;
            for (const c of cands) {
                if (!c || shut(c.x) || !T.support(c.x, c.y - 4, 60, 120)) continue;
                const d = Math.hypot(c.x - p.x, c.y - p.y);
                if (d > HL * 0.8 && d < bd) { bd = d; best = c; }
            }
            return best;
        }
    };

    function savePuz() {
        const P = G.puz;
        return { box: P.box, ice: P.ice, ride: Math.round(P.ride), belt: [...P.belt], bridgeRubs: P.bridgeRubs };
    }

    function inSpace() {
        const p = G.player, T = G.terrain;
        const w = p.water || T?.waterColumn(p.x);
        return !!w && w.kind === 'space' && p.y > w.top;
    }

    /** M4, R2, F1: hiding in mid-air. On the Moon the shell drops straight down; elsewhere it keeps its way. */
    function airHide(simInput, events) {
        const p = G.player, sc = G.sceneDef;
        if (!simInput.hide || simInput.hideRelease || p.mode !== 'air' || p.hidden) return;
        p.hidden = true; p.hideQueued = false; p.resting = false;
        simInput.hide = false;
        const moon = (sc.gravity ?? 1) < 1;
        if (p.jump) { if (moon) p.jump.vx = 0; p.jump.limit = null; }
        else if (moon) p.vx = 0;
        p.vy = Math.max(p.vy, moon ? 160 : 0);
        p.action = null;
        events.push({ type: 'hide', air: true, x: p.x, y: p.y });
    }

    /** Floating beside a floe or an asteroid: Hoppa climbs up onto it (in space there is no shore to wade out on). */
    function climbOut(simInput, events) {
        const p = G.player, T = G.terrain;
        if (!simInput.hop || p.mode !== 'swim' || p.hidden || !inSpace()) return;
        for (const dx of [0, 0.5, -0.5, 1, -1]) {
            const x = p.x + (dx * p.facing) * HL;
            const s = T.support(x, p.y - 0.05 * HL, 1.8 * HL, 0);
            if (!s || s.s.hidden || s.y > p.y - 0.15 * HL) continue;
            const rise = p.y - s.y + 0.45 * HL;
            p.mode = 'air'; p.water = null; p.submerge = 0;
            p.vy = -Math.sqrt(2 * C.gravity * rise);
            p.jump = { kind: 'hop', vx: (x - p.x) * 1.8 + p.facing * 120, limit: null, dir: p.facing, fromY: p.y };
            simInput.hop = false;
            events.push({ type: 'hop', kind: 'climb', x: p.x, y: p.y });
            return;
        }
    }

    /**
     * After a hop: on the Moon (and everywhere here) a jump pressed while standing against a step goes forward when the
     * stick says so, and its reach is measured with the Moon's long arcs, never over a refusing edge (an edge marked
     * `hop: true` refuses only a walk).
     */
    function afterHop(simInput, events) {
        const p = G.player, sc = G.sceneDef, T = G.terrain;
        if (!events.some(e => e.type === 'hop' && e.kind !== 'climb' && e.kind !== 'dive') || !p.jump) return;
        const ix = simInput.x || 0;
        if (p.jump.kind === 'buck' && Math.abs(ix) > 0.3) {
            p.jump = { kind: 'hop', vx: Math.sign(ix) * 460, limit: null, dir: Math.sign(ix), fromY: p.y };
            // as high as a running hop (on the Moon the Moon's): a step up to a rock is a jump with the stick held
            p.vy = -Math.sqrt(2 * C.gravity * (sc.gravity ?? 1) * C.hopHeight / (sc.gravity ?? 1));
            p.facing = Math.sign(ix);
            p.action = null;
        }
        const g = (sc.gravity ?? 1) * C.gravity;
        const air = 2 * Math.abs(p.vy) / g + 0.2;
        const dir = Math.sign(p.jump.vx) || p.facing, reach = Math.abs(p.jump.vx) * air + 20;
        let limit = null;
        for (const e of T.edges) {
            if (e.kind === 'pass' || e.hop || e.dir !== dir || Math.abs(p.y - e.y) > (e.dy ?? 90) + h(2)) continue;
            const hit = dir > 0 ? (p.x <= e.x && p.x + reach > e.x) : (p.x >= e.x && p.x - reach < e.x);
            if (hit) { const lx = e.x - dir * C.edgeMargin; limit = limit === null ? lx : (dir > 0 ? Math.min(limit, lx) : Math.max(limit, lx)); }
        }
        const d = T.dashedStart(p.x, p.x + dir * reach, p.y, dir);
        if (d) { const sx = (dir > 0 ? d.pts[0] : d.pts.at(-1))[0] - dir * C.edgeMargin; limit = limit === null ? sx : (dir > 0 ? Math.min(limit, sx) : Math.max(limit, sx)); }
        p.jump.limit = limit;
    }

    /**
     * On the Moon a jump is long and slow: the stick may steer it a little in the air, so a rock a length wide can be
     * landed on. Not over the ledge at Kanten (M4), where every jump must float past and only a hidden shell drops.
     */
    function airSteer(simInput, dt) {
        const p = G.player, sc = G.sceneDef;
        if ((sc.gravity ?? 1) >= 1 || p.mode !== 'air' || !p.jump || p.hidden) return;
        if ((sc.noSteer || []).some(([a, b]) => p.x >= a && p.x <= b)) return;
        const want = (simInput.x || 0) * 560;
        p.jump.vx += (want - p.jump.vx) * Math.min(1, dt * 2.4);
        if (Math.abs(p.jump.vx) > 30) p.facing = Math.sign(p.jump.vx);
    }

    /** In space: a hidden shell hangs still unless something pulls it; nothing is wet; floating down onto a rock stands. */
    function spaceAfter(before, simInput, events) {
        const p = G.player, T = G.terrain, b = G.sceneDef.bounds;
        const w = p.water;
        if (w?.kind !== 'space') return;
        p.submerge = 0; p.wet = 0; p.wetTimer = 0;
        if (p.mode === 'swim') {
            if (p.hidden && !p.inLane && !p.inVortex) { p.y = before.y; p.vy = 0; }
            // the rescue floor lies far below: nobody floats down to it
            if (p.y > b.y1 - 1.2 * HL) { p.y = b.y1 - 1.2 * HL; p.vy = Math.min(0, p.vy); }
            if (p.y < b.y0 + 1.5 * HL) { p.y = b.y0 + 1.5 * HL; p.vy = Math.max(0, p.vy); }
            if (!p.hidden && p.vy >= -30) {
                const s = T.support(p.x, p.y, 8, 22);
                if (s && !s.s.hidden) {
                    p.mode = 'ground'; p.y = p.py = s.y; p.surface = s.s; p.vy = 0; p.jump = null;
                    events.push({ type: 'land', x: p.x, y: p.y, soft: true, float: true, id: s.s.id });
                }
            }
        }
    }

    /** A swimmer in Pip's lane (and others like it) is too light: it kicks itself out. */
    function applyPushes(dt, events) {
        const p = G.player, zones = G.sceneDef.pushes || [];
        for (const z of zones) {
            if (!cond(z.when, G.flags) || p.mode !== 'swim' || (p.hidden && p.hide > 0.5) || G.carry) { G.puz['push_' + z.id] = false; continue; }
            const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1;
            const inside = Math.abs(d - z.r) < z.band;
            if (inside) {
                // always outward: from outside it keeps a swimmer off the lane, from inside (Pip's rock) it throws it across
                const k = Math.min(1, dt * 8);
                p.vx += (dx / d * z.speed - p.vx) * k; p.vy += (dy / d * z.speed - p.vy) * k;
                if (!G.puz['push_' + z.id]) events.push({ type: 'kicked', id: z.id });
            }
            G.puz['push_' + z.id] = inside;
        }
        // a planet pulls a swimmer back up onto the ice it fell from
        for (const pl of G.sceneDef.pulls || []) {
            if (!cond(pl.when, G.flags)) continue;
            const inside = p.mode === 'swim' && !p.hidden && p.x >= pl.x0 && p.x <= pl.x1;
            if (!inside) continue;
            G.puz.pull += dt;
            if (G.puz.pull >= pl.after) {
                G.puz.pull = 0;
                const spot = G.sceneDef.spots[pl.to(p.x)];
                const path = [[p.x, p.y], [(p.x + spot.x) / 2, Math.min(p.y, spot.y) - 1.0 * HL], [spot.x, spot.y]];
                G.carry = { def: { id: 'pull-' + pl.id, kind: 'pull', end: { x: spot.x, y: spot.y, mode: 'ground' } }, path, len: lineLength(path), s: 0, speed: 900, visible: true };
                events.push({ type: 'kicked', id: pl.id });
            }
            return;
        }
        if (p.mode !== 'swim' || p.hidden) G.puz.pull = 0;
    }

    /** M4: a jump that comes down on the ledge without hiding floats on past it; only a shell dropping like a stone stays. */
    function ledgeFloat(events) {
        const p = G.player;
        if (p.mode !== 'ground' || p.hidden || !p.surface?.ledge || !events.some(e => e.type === 'land')) return;
        p.mode = 'air'; p.surface = null; p.vy = -240;
        p.jump = { kind: 'hop', vx: 520, limit: null, dir: 1, fromY: p.y };
        p.facing = 1;
        events.push({ type: 'balk', reason: 'float', id: 'ledge', x: p.x });
    }

    /** The white page has nothing to stand on but lines: put a fall back where it last stood (thin lines too). */
    function rescue(events) {
        const p = G.player, b = G.sceneDef.bounds;
        if (p.mode === 'ground' && p.surface && !p.surface.hidden && !p.hidden) {
            if (!G.lastStand || Math.abs(G.lastStand.x - p.x) > 0.25 * HL || Math.abs(G.lastStand.y - p.y) > 0.1 * HL) G.lastStand = { x: p.x, y: p.y, facing: p.facing };
        }
        const lost = p.y > b.y1 - 0.6 * HL || (p.mode === 'ground' && p.surface?.hidden);
        if (!lost || !G.lastStand) return;
        const ls = G.lastStand;
        const np = createPlayer({ x: ls.x - ls.facing * 0.4 * HL, y: ls.y - 4, facing: ls.facing });
        const sup = G.terrain.support(np.x, np.y, 120, 400) || G.terrain.support(ls.x, ls.y - 4, 120, 400);
        if (sup) { np.y = sup.y; np.surface = sup.s; if (!G.terrain.support(np.x, np.y, 10, 10)) np.x = ls.x; }
        G.player = np;
        events.push({ type: 'rescued', x: np.x, y: np.y });
    }

    // --- carries: the beam, the orbit, the lanes, the slingshot, the catch -----------------------------------------------
    function startCarries(dt, events) {
        const p = G.player, sc = G.sceneDef, F = G.flags;
        if (G.carry || G.busy > 0) return;
        let onRing = false;
        for (const c of sc.carries || []) {
            if (!cond(c.needs, F) || !cond(c.when, F)) continue;
            if (c.kind === 'beam') {
                const near = p.mode === 'ground' && Math.abs(p.x - c.spot.x) < 0.6 * HL && Math.abs(p.y - c.spot.y) < 0.4 * HL;
                if (!near) continue;
                onRing = true;
                const nova = G.actors.nova;
                if (!nova?.follow || nova.scene !== G.sceneId) continue;
                if (!p.hidden || p.hide < 0.9) { if (Math.abs(p.vx) < 30) G.emit('beamKick', { id: c.id }); continue; }
                G.puz.beamStill += dt;
                if (G.puz.beamStill < 0.35) continue;
                G.puz.beamStill = 0;
                begin(c, [[p.x, p.y], ...c.path], 380, events);
                return;
            }
            if (c.kind === 'orbit') {
                if (p.mode !== 'swim' || !p.hidden || p.hide < 0.5) continue;
                const d = Math.hypot(p.x - c.ring.x, p.y - c.ring.y);
                if (Math.abs(d - c.ring.r) > c.ring.width / 2) continue;
                const a0 = Math.atan2(p.y - c.ring.y, p.x - c.ring.x), pts = [];
                const n = 48;
                for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * c.turns * Math.PI * 2; pts.push([c.ring.x + Math.cos(a) * c.ring.r, c.ring.y + Math.sin(a) * c.ring.r]); }
                pts.push([c.end.x, c.end.y]);
                begin(c, [[p.x, p.y], ...pts], 480 * c.speed, events);
                return;
            }
            if (c.kind === 'sling' || c.kind === 'lane') {
                if (p.mode !== 'swim' || !p.hidden || p.hide < 0.5) continue;
                const z = c.zone;
                if (p.x < z.x0 || p.x > z.x1 || p.y < z.y0 || p.y > z.y1) continue;
                begin(c, [[p.x, p.y], ...c.path], c.kind === 'sling' ? 900 : 520, events);
                return;
            }
            if (c.kind === 'catch') {
                if (p.mode !== 'air' || !p.hidden) continue;
                const z = c.zone;
                if (p.x < z.x0 || p.x > z.x1 || p.y < z.y0 || p.y > z.y1) continue;
                begin(c, [[p.x, p.y], ...c.path], 760, events);
                return;
            }
            if (c.kind === 'loop') {
                if (p.mode !== 'ground' || p.surface?.id !== c.ground) continue;
                begin(c, [[p.x, p.y], ...c.path], 900, events, true);
                return;
            }
        }
        if (!onRing) G.puz.beamStill = 0;
    }
    function begin(def, path, speed, events, visible = false) {
        const p = G.player;
        G.carry = { def, path, len: lineLength(path), s: 0, speed, visible };
        p.vx = 0; p.vy = 0; p.jump = null; p.streck = null;
        if (!visible) { p.hidden = true; p.hide = Math.max(p.hide, 0.9); }
        events.push({ type: 'carryStart', id: def.id, kind: def.kind, x: p.x, y: p.y });
    }
    function stepCarry(dt, events) {
        const c = G.carry, p = G.player;
        c.s += c.speed * dt;
        const pt = pointAt(c.path, Math.min(c.s, c.len));
        p.px = p.x; p.py = p.y;
        p.x = pt.x; p.y = pt.y;
        if (Math.abs(pt.tx) > 0.2) p.facing = Math.sign(pt.tx);
        p.speed = c.speed; p.gait = 'stand';
        if (!c.visible) { p.hidden = true; p.hide = Math.min(1, p.hide + dt / 0.3); }
        if (c.s < c.len) return;
        const def = c.def, end = def.end || { x: c.path.at(-1)[0], y: c.path.at(-1)[1], mode: 'ground', unhide: true };
        G.carry = null;
        if (end.scene) {
            G.goto(end.scene, end.spot);
            if (!end.unhide) { G.player.hidden = true; G.player.hide = 1; }
        } else {
            const sup = G.terrain.support(end.x, end.y - 4, 0.6 * HL, 0.8 * HL);
            p.x = p.px = end.x; p.y = p.py = sup ? sup.y : end.y;
            p.surface = sup?.s || null; p.mode = sup ? 'ground' : 'air'; p.vx = 0; p.vy = 0; p.jump = null;
            p.water = null; p.inLane = null;
            if (end.unhide && p.hidden) { p.hidden = false; p.hideQueued = false; p.stickHold = 0; events.push({ type: 'unhide' }); }
        }
        events.push({ type: 'carryEnd', id: def.id, kind: def.kind, back: !!def.back, go: !!def.go });
    }

    function finishStep(events, inp, locked, dt) {
        for (const e of events) G.emit(e.type, e);
        G.lastEvents = events;
        const p = G.player;
        // a carried shell passes over places without entering them: they are entered where it is set down
        if (!G.carry) for (const a of G.sceneDef.areas || []) {
            const inside = p.x >= a.x0 && p.x <= a.x1 && (a.y1 === undefined || p.y <= a.y1) && (a.y0 === undefined || p.y >= a.y0);
            if (inside && !G.areas.has(a.id)) { G.areas.add(a.id); G.emit('enter', { id: a.id }); }
            else if (!inside && G.areas.has(a.id)) { G.areas.delete(a.id); G.emit('leave', { id: a.id }); }
        }
        if (!locked && !G.carry) {
            for (const ex of G.sceneDef.exits || []) {
                if (!ex.auto || !cond(ex.when, G.flags)) continue;
                if (p.x < ex.x0 || p.x > ex.x1 || (ex.dir && p.vx * ex.dir <= 0 && (inp.x || 0) * ex.dir <= 0)) continue;
                G.emit('exit', ex); G.goto(ex.to, ex.spawn); break;
            }
        }
        if (G.story) G.story.step(dt);
    }

    function neigh() {
        const p = G.player;
        p.action = 'neigh'; p.actionT = 0; p.actionDur = 0.8;
        // in space no sound is heard (rule 10): the view shows a small "…" instead
        G.emit('neigh', { silent: G.sceneId !== 'mane', x: p.x, y: p.y });
    }
    G.neigh = neigh;
    return G;
}

const h = (v) => v * HL;
export { HL, STEP, heightOn };
