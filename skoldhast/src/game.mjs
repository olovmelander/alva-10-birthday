/*
 * Sköldhästen – the game state and its fixed-step update (no DOM, no Pixi).
 *
 * G holds everything the view, the story and the save need: the current scene,
 * flags, the player, puzzle objects, actors (Klo, Kartväktaren, …) and a small
 * event bus. main.mjs calls G.step(input) at 120 Hz and renders in between.
 */
import { createPlayer, stepPlayer, Terrain, STEP, HL, cond } from './sim.mjs';
import { createPuzzleState, stepPuzzles, contextAction, shakeShells, resetUncommitted } from './puzzles.mjs';
import { SCENES, CHECKPOINTS, RELEASED_CHAPTER } from './content/world.mjs';

export function createGame({ released = RELEASED_CHAPTER } = {}) {
    const listeners = new Map();
    const timers = [];
    const G = {
        scenes: SCENES,
        released,
        sceneId: null, sceneDef: null, terrain: null,
        flags: new Set(),
        player: createPlayer({}),
        puz: createPuzzleState(),
        actors: {},
        time: 0, sceneTime: 0,
        busy: 0,           // > 0 while a cutscene runs (input ignored)
        inputLock: 0,
        areas: new Set(),
        checkpoint: 'start',
        story: null,       // set by the story director
        auto: null,        // scripted run
        freeze: false,     // time stopped (prologue/final), for effects
        evening: false,
        camHint: null,     // { x, y, zoom, t } a camera target set by the story
        lastEvents: [],
        stats: { gallopTime: 0, maxSpeed: 0, leaps: 0 },

        on(type, fn) { (listeners.get(type) || listeners.set(type, []).get(type)).push(fn); return () => G.off(type, fn); },
        off(type, fn) { const a = listeners.get(type); if (a) a.splice(a.indexOf(fn), 1); },
        emit(type, data = {}) {
            for (const fn of (listeners.get(type) || []).slice()) fn(data);
            for (const fn of (listeners.get('*') || []).slice()) fn(type, data);
        },
        later(sec, fn) { timers.push({ t: G.time + sec, fn }); },
        wait(sec) { return new Promise((r) => G.later(sec, r)); },

        flag(f) { if (!G.flags.has(f)) { G.flags.add(f); G.terrain?.refresh(); G.emit('flag', { flag: f }); } },
        has(f) { return G.flags.has(f); },
        cond(c) { return cond(c, G.flags); },

        /** Load a scene and place the player at a spot name or {x, y, facing, mode}. */
        goto(sceneId, spawn, { silent = false } = {}) {
            const prev = G.sceneId;
            G.sceneId = sceneId;
            G.sceneDef = SCENES[sceneId];
            G.terrain = new Terrain(G.sceneDef, G.flags);
            const s = typeof spawn === 'string' ? G.sceneDef.spots[spawn] : spawn;
            const keepWet = G.player.wet;
            G.player = createPlayer(s || G.sceneDef.spots.start || { x: 0, y: 0 });
            G.player.wet = keepWet;
            // settle on the ground or in the water
            const sup = G.terrain.support(G.player.x, G.player.y, 120, 400);
            if (G.player.mode === 'ground' && sup) { G.player.y = sup.y; G.player.surface = sup.s; }
            if (s?.mode === 'swim') { G.player.water = G.terrain.waterAt(G.player.x, G.player.y); G.player.submerge = 1; }
            G.sceneTime = 0;
            G.areas = new Set();
            resetUncommitted(G);
            G.emit('scene', { id: sceneId, from: prev, silent });
        },

        stair(st) {
            const to = G.sceneDef.spots[st.to];
            G.emit('stair', { from: { x: G.player.x, y: G.player.y }, to });
            G.busy++;
            G.later(0.5, () => {
                G.player.x = G.player.px = to.x; G.player.y = G.player.py = to.y; G.player.vx = 0;
                G.player.facing = to.facing || -1;
                const sup = G.terrain.support(to.x, to.y, 60, 60); if (sup) G.player.surface = sup.s;
                G.busy--;
            });
        },

        shake() {
            G.player.action = 'shake'; G.player.actionT = 0; G.player.actionDur = 0.9;
            G.emit('shake', { x: G.player.x, y: G.player.y });
            shakeShells(G);
            G.later(0.9, () => { G.player.wet = Math.max(0, G.player.wet - 0.35); if (G.player.wet < 0.1) { G.player.wet = 0; G.player.wetTimer = 0; } });
        },

        context: null,
        storyActions() { return G.story ? G.story.actions() : []; },

        /** One fixed step of the whole game. input: { x, y, hop, hide, act, tapHero } */
        step(input) {
            const dt = STEP;
            G.time += dt; G.sceneTime += dt;
            // timers
            for (let i = timers.length - 1; i >= 0; i--) {
                if (timers[i].t <= G.time) { const t = timers.splice(i, 1)[0]; t.fn(); }
            }
            const locked = G.busy > 0 || G.inputLock > 0;
            if (G.inputLock > 0) G.inputLock -= dt;
            const inp = locked ? { x: 0, y: 0 } : input;
            // the context button: an action here, or Hoppa
            G.context = locked ? null : contextAction(G);
            const events = [];
            const simInput = { x: inp.x || 0, y: inp.y || 0, hop: false, hide: !!inp.hide, hopHeld: !!inp.hopHeld };
            if (inp.act) {
                if (G.context) { const c = G.context; G.emit('context', { id: c.id }); c.run(); }
                else simInput.hop = true;
            }
            if (G.auto) { G.player.auto = G.auto; } else G.player.auto = null;
            if (!locked && inp.tapHero && !G.player.hidden) neigh();
            stepPlayer(G.player, simInput, { terrain: G.terrain, flags: G.flags }, dt, events);
            stepPuzzles(G, events, dt);
            // stats for Klo's measurements
            const sp = Math.abs(G.player.vx);
            if (G.player.mode === 'ground' && sp >= 1000) G.stats.gallopTime += dt; else G.stats.gallopTime = 0;
            G.stats.maxSpeed = Math.max(G.stats.maxSpeed * 0.999, sp);
            for (const e of events) G.emit(e.type, e);
            G.lastEvents = events;
            // areas
            const p = G.player;
            for (const a of G.sceneDef.areas || []) {
                const inside = p.x >= a.x0 && p.x <= a.x1 && (a.y1 === undefined || p.y <= a.y1) && (a.y0 === undefined || p.y >= a.y0);
                if (inside && !G.areas.has(a.id)) { G.areas.add(a.id); G.emit('enter', { id: a.id }); }
                else if (!inside && G.areas.has(a.id)) { G.areas.delete(a.id); G.emit('leave', { id: a.id }); }
            }
            // automatic exits
            if (!locked) {
                for (const ex of G.sceneDef.exits || []) {
                    if (!ex.auto || !cond(ex.when, G.flags)) continue;
                    if (p.x >= ex.x0 && p.x <= ex.x1 && (ex.y1 === undefined || p.y <= ex.y1)) { G.emit('exit', ex); G.goto(ex.to, ex.spawn); break; }
                }
            }
            if (G.story) G.story.step(dt);
        },

        // --- save ------------------------------------------------------------------
        serialize() {
            return {
                flags: [...G.flags].sort(),
                checkpoint: G.checkpoint,
                puz: { deepest: G.puz.deepest, tally: G.puz.tally, shells: G.puz.shells }
            };
        },
        restore(data) {
            // mutate the set in place: the story, the terrain and the view hold references to it
            G.flags.clear();
            for (const f of data.flags || []) G.flags.add(f);
            G.checkpoint = CHECKPOINTS[data.checkpoint] ? data.checkpoint : 'start';
            Object.assign(G.puz, { deepest: data.puz?.deepest || 0, tally: data.puz?.tally || 0, shells: data.puz?.shells || {} });
            if (G.flags.has('p2_open')) G.puz.stone = SCENES.land.rail.target;
            chapterFlags();
            const cp = CHECKPOINTS[G.checkpoint];
            G.goto(cp.scene, cp.spot || cp.at);
        },
        setCheckpoint(name) { if (CHECKPOINTS[name]) { G.checkpoint = name; G.emit('checkpoint', { id: name }); } },

        /**
         * "Jag har fastnat": the nearest safe place in this scene (a checkpoint or a spawn), in the water if you
         * are swimming, never under blank paper and never on the far side of a wall that is closed now.
         */
        safeSpot() {
            const p = G.player, sc = G.sceneDef;
            const cands = [];
            for (const cp of Object.values(CHECKPOINTS)) if (cp.scene === G.sceneId) cands.push(cp.spot ? sc.spots[cp.spot] : cp.at);
            for (const [k, v] of Object.entries(sc.spots)) if (/^(start|from)/.test(k)) cands.push(v);
            const blank = (x) => (sc.paper || []).some((pc) => !G.flags.has(pc.until) && x >= pc.x0 && x <= pc.x1);
            const walled = (x) => G.terrain.walls.some((w) => (w.x - p.x) * (w.x - x) < 0);
            const swimming = p.mode === 'swim';
            let best = null, bd = Infinity;
            for (const c of cands) {
                if (!c || blank(c.x) || walled(c.x)) continue;
                const same = (c.mode === 'swim') === swimming;
                const d = Math.hypot(c.x - p.x, c.y - p.y) + (same ? 0 : 40 * HL);
                if (d > HL * 0.8 && d < bd) { bd = d; best = c; } // somewhere else than right here
            }
            return best;
        }
    };

    function neigh() {
        const p = G.player;
        const under = p.mode === 'swim' && p.submerge > 0.6;
        p.action = 'neigh'; p.actionT = 0; p.actionDur = 0.8;
        G.emit('neigh', { under, x: p.x, y: p.y });
        if (under) G.puz.neighs.water = true; else G.puz.neighs.land = true;
    }
    G.neigh = neigh;

    function chapterFlags() {
        if (G.flags.has('ch1_end') && G.released >= 2) G.flags.add('ch2_open');
        if (G.flags.has('ch2_end') && G.released >= 3) G.flags.add('ch3_open');
    }
    G.chapterFlags = chapterFlags;
    G.on('flag', chapterFlags);
    return G;
}

export { HL, STEP };
