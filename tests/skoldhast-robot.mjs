/*
 * A robot player for Sköldhästen's pure game logic (no DOM, no Pixi).
 *
 * It drives G.step() with ordinary inputs (stick x/y, Hoppa, Göm dig), exactly
 * as main.mjs does, and stubs the UI so dialogues finish at once. Between steps
 * it yields to the event loop so the story's async beats can move on.
 *
 * Used by tests/skoldhast-playthrough.test.mjs.
 */
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';

const tick = () => new Promise((resolve) => setImmediate(resolve));

export function createRobot({ released = 3, verbose = false } = {}) {
    const G = createGame({ released });
    const log = [];
    const ui = {
        say: async (lines) => { log.push({ t: G.time, kind: 'say', lines }); },
        choice: async () => 0,
        toast: (text) => log.push({ t: G.time, kind: 'toast', text }),
        pulse: () => {},
        caption: () => {},
        report: async (n) => { log.push({ t: G.time, kind: 'report', n }); },
        draw: async () => [],
        journal: () => {}
    };
    const io = {
        ui,
        audio: null,
        save: () => log.push({ t: G.time, kind: 'save', checkpoint: G.checkpoint }),
        fx: async (name, data) => {
            log.push({ t: G.time, kind: 'fx', name, variant: data?.variant, fragment: data?.fragment, focus: data?.focus });
            data?.onCovered?.();
            await G.wait(name === 'plask' ? 1 : 0.3);
            const phases = name === 'foldDemo' ? ['arrive', 'fold', 'unfold', 'depart'] : name === 'mapAssemble' ? ['arrive', 'join', 'reveal', 'depart'] : null;
            const controller = phases ? Object.fromEntries(
                phases.map(phase => [phase, async () => {
                    log.push({ t: G.time, kind: 'fxPhase', name, phase, variant: data?.variant });
                    await G.wait(0.1);
                }])
            ) : undefined;
            await data?.whileVisible?.(controller);
        }
    };
    const story = createStory(G, io);
    G.story = story;
    const events = [];
    G.on('*', (type, e) => { if (type !== 'hoof' && type !== 'ink' && type !== 'paddle') events.push({ t: G.time, type, ...e }); });

    const p = () => G.player;
    const where = () => {
        const q = p();
        return `${G.sceneId} x=${(q.x / HL).toFixed(2)} y=${(q.y / HL).toFixed(2)} mode=${q.mode} vx=${Math.round(q.vx)} vy=${Math.round(q.vy)}` +
            ` hidden=${q.hidden} busy=${G.busy} beat=${story.running()} surface=${q.surface?.id || '-'}`;
    };

    async function step(inp = {}) {
        G.step({ x: inp.x || 0, y: inp.y || 0, hopHeld: !!inp.hopHeld, act: !!inp.act, hide: !!inp.hide, tapHero: !!inp.tapHero });
        await tick();
    }
    /** Hold an input for some seconds (edges only on the first step). */
    async function hold(seconds, inp = {}) {
        const n = Math.round(seconds / STEP);
        for (let i = 0; i < n; i++) await step(i === 0 ? inp : { ...inp, act: false, hide: false, tapHero: false });
    }
    /** Step with input(fn) until pred() is true. */
    async function until(pred, input, maxSeconds, label) {
        const n = Math.round(maxSeconds / STEP);
        for (let i = 0; i < n; i++) {
            if (pred()) return i * STEP;
            await step(typeof input === 'function' ? input() : (input || {}));
        }
        if (pred()) return maxSeconds;
        const recent = events.slice(-12).map((e) => `${e.type}${e.id ? ':' + e.id : ''}${e.reason ? ':' + e.reason : ''}${e.flag ? ':' + e.flag : ''}`).join(' ');
        throw new Error(`robot timed out: ${label}\n  at ${where()}\n  recent events: ${recent}`);
    }
    /** Wait until no beat has run for a moment and input is free (beats can follow each other). */
    async function settle(maxSeconds = 60) {
        let idle = 0;
        await until(() => {
            idle = G.busy === 0 && !story.running() ? idle + 1 : 0;
            return idle > 30;
        }, {}, maxSeconds, 'settle');
    }
    const has = (f) => G.flags.has(f);
    async function flag(f, input, maxSeconds = 30) { await until(() => has(f), input, maxSeconds, `flag ${f}`); }

    /** Walk (or gallop) along the ground to x (in HL) and stop there. */
    async function walkTo(xHL, { gallop = false, tol = 0.12, max = 90 } = {}) {
        const tx = xHL * HL;
        await until(() => Math.abs(p().x - tx) < tol * HL && Math.abs(p().vx) < 40 && p().mode === 'ground', () => {
            const dx = tx - p().x;
            if (Math.abs(dx) < tol * HL) return {};
            const far = Math.abs(dx) > 4 * HL;
            const mag = gallop && far ? 1 : Math.min(0.7, Math.max(0.12, Math.abs(dx) / (2.2 * HL)));
            return { x: Math.sign(dx) * mag };
        }, max, `walkTo ${xHL}`);
    }
    /** Gallop in a direction until x passes xHL (no stopping). */
    async function gallopPast(xHL, { max = 60, hopHeld = false } = {}) {
        const tx = xHL * HL;
        const dir = Math.sign(tx - p().x);
        await until(() => (p().x - tx) * dir > 0, () => ({ x: dir, hopHeld }), max, `gallopPast ${xHL}`);
    }
    /** Swim to (x, y) in HL. */
    async function swimTo(xHL, yHL, { tol = 0.3, max = 90 } = {}) {
        const tx = xHL * HL, ty = yHL * HL;
        const scene = G.sceneId;
        await until(() => Math.hypot(p().x - tx, p().y - ty) < tol * HL || G.sceneId !== scene, () => {
            const dx = tx - p().x, dy = ty - p().y;
            const d = Math.hypot(dx, dy) || 1;
            const m = Math.min(1, d / (0.5 * HL)); // full stick, like a player, until close
            return { x: (dx / d) * m, y: (dy / d) * m };
        }, max, `swimTo ${xHL},${yHL}`);
    }
    async function act() { await step({ act: true }); await tick(); }
    async function hide() { await step({ hide: true }); }
    /** Press the context button when it offers `id`. */
    async function context(id, maxSeconds = 5) {
        await until(() => G.context?.id === id, {}, maxSeconds, `context ${id}`);
        await act();
    }

    return { G, story, log, events, p, where, step, hold, until, settle, has, flag, walkTo, gallopPast, swimTo, act, hide, context, verbose };
}

export { HL };
