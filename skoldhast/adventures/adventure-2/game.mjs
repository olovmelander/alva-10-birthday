/*
 * Äventyr 2: Den magiska skogen – the game state and its fixed step (no DOM, no Pixi).
 *
 * Same shape as Adventure 1's game.mjs: G holds the scene, flags, the player,
 * puzzle state and actors; main.mjs calls G.step(input) at 120 Hz. The movement
 * is Adventure 1's own simulation (src/sim.mjs), unchanged.
 */
import { createPlayer, stepPlayer, Terrain, STEP, HL, C, cond } from '../../src/sim.mjs';
import { createGroundGuard } from '../../src/ground-guard.mjs';
import { createPuzzleState, stepPuzzles, contextAction, applyPushes, applyWinds, stepWeather, eggsFound, restorePuzzles } from './puzzles.mjs';
import { SCENES, CHECKPOINTS, EGG_TOTAL } from './content/world.mjs';

const SWIM_KEYS = ['vx', 'vy', 'hidden', 'hide', 'facing', 'submerge', 'speed', 'wetTimer'];
// moment-to-moment states kept as flags (so the sim's conditions can read them), never saved
const TRANSIENT = new Set(['flash', 'tailwind']);

export function createGame() {
    const listeners = new Map();
    const timers = [];
    // ground is solid from every side; every A2 hidden floor is a pit nobody enters on purpose
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
        camLook: null, // what the lines being said are about: the camera keeps it in the picture (story.mjs about)
        context: null,
        lastEvents: [],
        storm: 1,            // 1 = the full storm, 0 = moonlit calm (the view and audio read it)
        eggTotal: EGG_TOTAL,

        on(type, fn) { (listeners.get(type) || listeners.set(type, []).get(type)).push(fn); return () => G.off(type, fn); },
        off(type, fn) { const a = listeners.get(type); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
        emit(type, data = {}) {
            for (const fn of (listeners.get(type) || []).slice()) fn(data);
            for (const fn of (listeners.get('*') || []).slice()) fn(type, data);
        },
        later(sec, fn) { timers.push({ t: G.time + sec, fn }); },
        wait(sec) { return new Promise((r) => G.later(sec, r)); },

        flag(f) { if (!G.flags.has(f)) { G.flags.add(f); G.terrain?.refresh(); G.emit('flag', { flag: f }); } },
        has(f) { return G.flags.has(f); },
        cond(c) { return cond(c, G.flags); },
        eggs() { return eggsFound(G); },

        goto(sceneId, spawn, { swimState = null, unhide = false } = {}) {
            const prev = G.sceneId;
            G.sceneId = sceneId;
            G.sceneDef = SCENES[sceneId];
            G.terrain = new Terrain(G.sceneDef, G.flags);
            const s = typeof spawn === 'string' ? G.sceneDef.spots[spawn] : spawn;
            const keepWet = G.player.wet;
            G.player = createPlayer(s || G.sceneDef.spots.start || { x: 0, y: 0 });
            if (s?.hidden) { G.player.hidden = true; G.player.hide = 1; }
            G.player.wet = keepWet;
            const sup = G.terrain.support(G.player.x, G.player.y, 120, 400);
            if (G.player.mode === 'ground' && sup) { G.player.y = sup.y; G.player.surface = sup.s; }
            if (s?.mode === 'swim') {
                G.player.water = G.terrain.waterAt(G.player.x, G.player.y); G.player.submerge = 1;
                if (swimState) for (const key of SWIM_KEYS) G.player[key] = swimState[key];
                // a spring throws the shell up and open: it arrives swimming, not sinking back
                if (unhide) { G.player.hidden = false; G.player.hide = 0; G.player.vy = Math.min(0, G.player.vy); }
            }
            if (!G.sceneDef.lightning) G.flags.delete('flash');
            if (!G.sceneDef.winds) G.flags.delete('tailwind');
            G.sceneTime = 0;
            G.areas = new Set();
            G.emit('scene', { id: sceneId, from: prev });
        },

        /** One fixed step. hop jumps/emerges; act only interacts; duck only hides. */
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
            const emerge = !!inp.hop && (G.player.hidden || G.player.hideQueued);
            const simInput = { x: inp.x || 0, y: inp.y || 0, hop: !!inp.hop && !emerge,
                hide: !inp.hop && (!!inp.hide || (!!inp.duck && !G.player.hidden && !G.player.hideQueued)),
                hideRelease: !!inp.hideRelease || emerge, hopHeld: !!inp.hopHeld && !emerge };
            if (inp.act && !inp.hop && !simInput.hide && !G.player.hidden && G.context) {
                const c = G.context; G.emit('context', { id: c.id }); c.run();
            }
            if (!locked && inp.tapHero && !G.player.hidden) neigh();
            stepWeather(G, events);
            applyPushes(G, dt, events);
            applyWinds(G, dt, events);
            const before = { x: G.player.x, y: G.player.y };
            stepPlayer(G.player, simInput, { terrain: G.terrain, flags: G.flags }, dt, events);
            wadeOut(G, inp, events);
            bounce(G, events);
            groundGuard.walls(G, before, events);
            groundGuard.keep(G, before, events);
            groundGuard.net(G, events);
            stepPuzzles(G, events, dt);
            for (const e of events) G.emit(e.type, e);
            G.lastEvents = events;
            const p = G.player;
            for (const a of G.sceneDef.areas || []) {
                const inside = p.x >= a.x0 && p.x <= a.x1 && (a.y1 === undefined || p.y <= a.y1) && (a.y0 === undefined || p.y >= a.y0);
                if (inside && !G.areas.has(a.id)) { G.areas.add(a.id); G.emit('enter', { id: a.id }); }
                else if (!inside && G.areas.has(a.id)) { G.areas.delete(a.id); G.emit('leave', { id: a.id }); }
            }
            if (!locked) {
                for (const ex of G.sceneDef.exits || []) {
                    if (!ex.auto || !cond(ex.when, G.flags)) continue;
                    if (p.x < ex.x0 || p.x > ex.x1 || (ex.y0 !== undefined && p.y < ex.y0) || (ex.y1 !== undefined && p.y > ex.y1)
                        || (ex.dir && p.vx * ex.dir <= 0 && (inp.x || 0) * ex.dir <= 0)) continue;
                    let swimState = null;
                    if (p.mode === 'swim') swimState = Object.fromEntries(SWIM_KEYS.map(key => [key, p[key]]));
                    G.emit('exit', ex); G.goto(ex.to, ex.spawn, { swimState, unhide: !!ex.unhide }); break;
                }
            }
            if (G.story) G.story.step(dt);
        },

        // --- save ------------------------------------------------------------------
        serialize() {
            return {
                flags: [...G.flags].filter(f => !TRANSIENT.has(f)).sort(),
                checkpoint: G.checkpoint,
                puz: { ball: G.puz.ball, glitter: G.puz.glitter }
            };
        },
        restore(data) {
            G.flags.clear();
            for (const f of data.flags || []) G.flags.add(f);
            G.checkpoint = CHECKPOINTS[data.checkpoint] ? data.checkpoint : 'start';
            Object.assign(G.puz, createPuzzleState());
            restorePuzzles(G, data.puz || {});
            const cp = CHECKPOINTS[G.checkpoint];
            G.goto(cp.scene, cp.spot || cp.at);
        },
        setCheckpoint(name) { if (CHECKPOINTS[name] && G.checkpoint !== name) { G.checkpoint = name; G.emit('checkpoint', { id: name }); } },

        /** "Jag har fastnat": the nearest other checkpoint or spawn in this scene. */
        safeSpot() {
            const p = G.player, sc = G.sceneDef;
            const cands = [];
            for (const cp of Object.values(CHECKPOINTS)) if (cp.scene === G.sceneId) cands.push(cp.spot ? sc.spots[cp.spot] : cp.at);
            for (const [k, v] of Object.entries(sc.spots)) if (/^(start|from)/.test(k)) cands.push(v);
            let best = null, bd = Infinity;
            for (const c of cands) {
                if (!c) continue;
                const d = Math.hypot(c.x - p.x, c.y - p.y);
                if (d > HL * 0.8 && d < bd) { bd = d; best = c; }
            }
            return best;
        }
    };

    /**
     * Swimming up to a sloping shore: the sim keeps a swimmer at least its float
     * depth under the surface and never lets it climb a bank (Adventure 1 has no
     * shore to leave by). Where the bank just ahead is shallow enough to wade,
     * and the stick points at it, the sköldhäst stands up and wades out.
     */
    function wadeOut(G, inp, events) {
        const p = G.player, T = G.terrain;
        if (p.mode !== 'swim' || p.hidden || p.hideQueued || !p.water) return;
        const dir = Math.sign(inp.x || 0);
        if (!dir || Math.abs(inp.x) < 0.25) return;
        const ax = p.x + dir * 0.12 * HL;
        const s = T.support(ax, p.y + 0.3 * HL, 1.2 * HL, 0);
        if (!s || s.s.thin) return;
        const depth = s.y - p.water.top;
        if (depth > 110 || depth < -0.3 * HL) return;
        p.mode = 'ground'; p.x = p.px = ax; p.y = p.py = s.y; p.surface = s.s; p.vy = 0; p.vx = dir * 160; p.facing = dir;
        events.push({ type: 'swimEnd', x: p.x, y: p.water.top, wade: true });
    }

    /**
     * A magic mushroom is a trampoline: landing on it throws the sköldhäst
     * straight up (it keeps a little of its run), as high as the cap says.
     */
    function bounce(G, events) {
        const p = G.player, cap = p.surface;
        if (p.mode !== 'ground' || !cap?.bounce) return;
        if (!events.some(e => e.type === 'land')) return;
        p.mode = 'air'; p.surface = null;
        p.vy = -Math.sqrt(2 * C.gravity * cap.bounce);
        p.jump = { kind: 'hop', vx: p.vx * 0.25, limit: null, dir: p.facing, fromY: p.y };
        events.push({ type: 'bounce', id: cap.id, x: p.x, y: p.y });
    }

    function neigh() {
        const p = G.player;
        const under = p.mode === 'swim' && p.submerge > 0.6;
        p.action = 'neigh'; p.actionT = 0; p.actionDur = 0.8;
        G.emit('neigh', { under, x: p.x, y: p.y });
    }
    G.neigh = neigh;
    return G;
}

export { HL, STEP };
