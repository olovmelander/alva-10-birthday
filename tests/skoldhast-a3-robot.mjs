/*
 * A robot player for Äventyr 3's pure game logic (no DOM, no Pixi), like tests/skoldhast-a2-robot.mjs. It drives
 * G.step() with ordinary inputs (stick x/y, Hoppa, Göm dig, Använd) and stubs the UI so dialogues end at once.
 * Used by tests/skoldhast-a3-playthrough.test.mjs and tests/skoldhast-a3-order.test.mjs.
 */
import { createGame } from '../skoldhast/adventures/adventure-3/game.mjs';
import { createStory } from '../skoldhast/adventures/adventure-3/story.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';

const tick = () => new Promise((resolve) => setImmediate(resolve));

export function createRobot() {
    const G = createGame();
    const log = [];
    const ui = {
        say: async (lines) => { log.push({ t: G.time, kind: 'say', lines }); },
        think: (text) => log.push({ t: G.time, kind: 'think', text }),
        toast: (text) => log.push({ t: G.time, kind: 'toast', text }),
        caption: (text) => log.push({ t: G.time, kind: 'caption', text }),
        remark: (line) => log.push({ t: G.time, kind: 'say', lines: [line], remark: true })
    };
    const saves = [];
    const io = {
        ui, audio: null,
        save: (o) => saves.push({ t: G.time, checkpoint: G.checkpoint, ended: !!o?.ended, data: G.serialize() }),
        fx: async (name, data) => { log.push({ t: G.time, kind: 'fx', name, data }); if (data !== null) await G.wait(0.2); }
    };
    const story = createStory(G, io);
    G.story = story;
    const events = [];
    G.on('*', (type, e) => { if (type !== 'hoof' && type !== 'ink' && type !== 'paddle') events.push({ t: G.time, type, ...e }); });
    // the rocket's travel card: the robot answers it by calling the story directly (main.mjs opens ui.travel)
    let travelWanted = null;
    G.on('openTravel', () => { if (travelWanted) { const id = travelWanted; travelWanted = null; story.travelTo(id); } });

    const p = () => G.player;
    const where = () => {
        const q = p();
        return `${G.sceneId} x=${(q.x / HL).toFixed(2)} y=${(q.y / HL).toFixed(2)} mode=${q.mode} vx=${Math.round(q.vx)} vy=${Math.round(q.vy)}` +
            ` hidden=${q.hidden} busy=${G.busy} beat=${story.running()} surface=${q.surface?.id || '-'} ctx=${G.context?.id || '-'} carry=${G.carry?.def.id || '-'}`;
    };
    async function step(inp = {}) {
        G.step({ x: inp.x || 0, y: inp.y || 0, hop: !!inp.hop, hopHeld: !!inp.hopHeld, act: !!inp.act, hide: !!inp.hide, tapHero: !!inp.tapHero });
        await tick();
    }
    async function hold(seconds, inp = {}) {
        const n = Math.round(seconds / STEP);
        for (let i = 0; i < n; i++) await step(i === 0 ? inp : { ...inp, act: false, hide: false, hop: false, tapHero: false });
    }
    async function until(pred, input, maxSeconds, label) {
        const n = Math.round(maxSeconds / STEP);
        for (let i = 0; i < n; i++) {
            if (pred()) return i * STEP;
            await step(typeof input === 'function' ? input() : (input || {}));
        }
        if (pred()) return maxSeconds;
        const recent = events.slice(-16).map((e) => `${e.type}${e.id ? ':' + e.id : ''}${e.reason ? ':' + e.reason : ''}${e.flag ? ':' + e.flag : ''}`).join(' ');
        throw new Error(`robot timed out: ${label}\n  at ${where()}\n  recent events: ${recent}`);
    }
    async function settle(maxSeconds = 90) {
        let idle = 0;
        await until(() => { idle = G.busy === 0 && !story.running() && !G.carry ? idle + 1 : 0; return idle > 30; }, {}, maxSeconds, 'settle');
    }
    const has = (f) => G.flags.has(f);
    async function flag(f, input, maxSeconds = 30) { await until(() => has(f), input, maxSeconds, `flag ${f}`); }
    /** Walk (or gallop) to x on the ground, hopping up any step that stops the way, as a player would. */
    async function goTo(xHL, { gallop = false, tol = 0.15, max = 120, hopOver = [] } = {}) {
        const tx = xHL * HL;
        let stuck = 0, lastX = p().x;
        await until(() => Math.abs(p().x - tx) < tol * HL && Math.abs(p().vx) < 40 && p().mode === 'ground' && G.busy === 0 && !G.carry, () => {
            const q = p(), dx = tx - q.x;
            if (G.busy || G.carry) return {};
            if (q.hidden) return { hop: true };
            if (Math.abs(dx) < tol * HL) return {};
            const dir = Math.sign(dx), far = Math.abs(dx) > 4 * HL;
            const mag = gallop && far ? 1 : Math.min(0.7, Math.max(0.15, Math.abs(dx) / (2.2 * HL)));
            // a gap to hop over on the way
            for (const gx of hopOver) if (q.mode === 'ground' && (gx * HL - q.x) * dir > 0 && (gx * HL - q.x) * dir < 0.5 * HL) return { x: dir, hop: true };
            if (q.mode === 'ground' && Math.abs(q.x - lastX) < 1) stuck++; else stuck = 0;
            lastX = q.x;
            if (stuck > 30 && q.mode === 'ground') { stuck = 0; return { x: dir, hop: true }; }
            return { x: dir * mag };
        }, max, `goTo ${xHL}`);
    }
    async function gallopPast(xHL, { max = 60 } = {}) {
        const tx = xHL * HL, dir = Math.sign(tx - p().x);
        await until(() => (p().x - tx) * dir > 0 || G.busy > 0, () => ({ x: dir }), max, `gallopPast ${xHL}`);
    }
    /** Float (or swim) to a point. */
    async function floatTo(xHL, yHL, { tol = 0.3, max = 90 } = {}) {
        const tx = xHL * HL, ty = yHL * HL, scene = G.sceneId;
        await until(() => Math.hypot(p().x - tx, p().y - ty) < tol * HL || G.sceneId !== scene, () => {
            const q = p();
            if (q.mode === 'ground') return { hop: true, x: Math.sign(tx - q.x) * 0.4 };
            // steer for a speed that slows down near the point (floating has little drag: brake as a player would)
            const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(800, d * 2.4);
            let ix = (dx / d * sp - q.vx) / 500, iy = (dy / d * sp - q.vy) / 500;
            const m = Math.hypot(ix, iy);
            if (m > 1) { ix /= m; iy /= m; }
            return { x: ix, y: iy };
        }, max, `floatTo ${xHL},${yHL}`);
    }
    /** Float above a rock or a star-stone and come down on it. */
    async function landOn(xHL, yHL, { max = 60 } = {}) {
        await floatTo(xHL, yHL - 0.6, { tol: 0.2, max });
        await until(() => p().mode === 'ground' && Math.abs(p().y - yHL * HL) < 0.15 * HL, () => {
            const q = p();
            return { x: Math.max(-0.3, Math.min(0.3, (xHL * HL - q.x) / HL)), y: 0.45 };
        }, 8, `landOn ${xHL},${yHL}`);
    }
    async function act() { await step({ act: true }); await tick(); }
    async function hide() { await step({ hide: true }); }
    async function emerge() { await step({ hop: true }); }
    async function context(id, maxSeconds = 5) {
        await until(() => G.context?.id === id, {}, maxSeconds, `context ${id}`);
        await act();
    }
    async function face(dir) {
        if (p().facing === dir) return;
        await step({ x: dir * 0.15 });
        await until(() => Math.abs(p().vx) < 10, {}, 2, 'stop after turning');
    }
    /** Hide in the shell and wait still (the beam, the fog's seed). */
    async function hideStill(seconds) {
        await until(() => p().mode === 'ground' && Math.abs(p().vx) < 20 && !G.busy, {}, 5, 'still before hiding');
        if (!p().hidden) await hide();
        await hold(seconds);
    }
    /** Jump (from a run) and hide in the air once past x. */
    async function jumpHide(dir, hideAtHL, { run = true } = {}) {
        await step({ x: dir * (run ? 1 : 0.5), hop: true });
        await until(() => p().mode !== 'ground' && (p().x - hideAtHL * HL) * dir >= 0 || p().mode === 'ground' && G.time > 0 && false, () => ({ x: dir * (run ? 1 : 0.5) }), 4, `jump to ${hideAtHL}`);
        await step({ hide: true });
    }
    function travel(id) { travelWanted = id; }
    /** Hop up onto a rock above (the Moon's stairs): steer toward its middle in the air, as a player would. */
    async function climb(xHL, yHL, { max = 12 } = {}) {
        const tx = xHL * HL, ty = yHL * HL;
        await until(() => p().mode === 'ground' && Math.abs(p().y - ty) < 0.12 * HL && Math.abs(p().x - tx) < 0.7 * HL, () => {
            const q = p(), dx = tx - q.x;
            const steer = Math.max(-0.6, Math.min(0.6, dx / HL));
            if (q.mode !== 'ground') return { x: steer };
            if (Math.abs(q.y - ty) < 0.12 * HL) return { x: Math.max(-0.4, Math.min(0.4, dx / HL)) };
            // stand still near the rock's edge first, then hop toward it
            if (Math.abs(q.vx) > 60) return {};
            return { x: Math.sign(dx) * 0.35, hop: true };
        }, max, `climb ${xHL},${yHL}`);
    }
    return { G, story, log, saves, events, p, where, step, hold, until, settle, has, flag, goTo, gallopPast, floatTo, landOn, act, hide, emerge, context, face, hideStill, jumpHide, travel, climb };
}

export { HL };
