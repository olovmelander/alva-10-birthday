/*
 * A robot player for Äventyr 2's pure game logic (no DOM, no Pixi), like
 * tests/skoldhast-robot.mjs for Adventure 1. It drives G.step() with ordinary
 * inputs (stick x/y, Hoppa, Göm dig, Använd) and stubs the UI so dialogues end
 * at once. Used by tests/skoldhast-a2-playthrough.test.mjs.
 */
import { createGame } from '../skoldhast/adventures/adventure-2/game.mjs';
import { createStory } from '../skoldhast/adventures/adventure-2/story.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';

const tick = () => new Promise((resolve) => setImmediate(resolve));

export function createRobot() {
    const G = createGame();
    const log = [];
    const ui = {
        say: async (lines) => { log.push({ t: G.time, kind: 'say', lines }); },
        think: (text) => log.push({ t: G.time, kind: 'think', text }),
        toast: (text) => log.push({ t: G.time, kind: 'toast', text }),
        caption: (text) => log.push({ t: G.time, kind: 'caption', text })
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

    const p = () => G.player;
    const where = () => {
        const q = p();
        return `${G.sceneId} x=${(q.x / HL).toFixed(2)} y=${(q.y / HL).toFixed(2)} mode=${q.mode} vx=${Math.round(q.vx)} vy=${Math.round(q.vy)}` +
            ` hidden=${q.hidden} busy=${G.busy} beat=${story.running()} surface=${q.surface?.id || '-'} ctx=${G.context?.id || '-'}`;
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
        const recent = events.slice(-14).map((e) => `${e.type}${e.id ? ':' + e.id : ''}${e.reason ? ':' + e.reason : ''}${e.flag ? ':' + e.flag : ''}`).join(' ');
        throw new Error(`robot timed out: ${label}\n  at ${where()}\n  recent events: ${recent}`);
    }
    async function settle(maxSeconds = 60) {
        let idle = 0;
        await until(() => { idle = G.busy === 0 && !story.running() ? idle + 1 : 0; return idle > 30; }, {}, maxSeconds, 'settle');
    }
    const has = (f) => G.flags.has(f);
    async function flag(f, input, maxSeconds = 30) { await until(() => has(f), input, maxSeconds, `flag ${f}`); }
    async function walkTo(xHL, { gallop = false, tol = 0.12, max = 90 } = {}) {
        const tx = xHL * HL;
        await until(() => Math.abs(p().x - tx) < tol * HL && Math.abs(p().vx) < 40 && p().mode === 'ground' && G.busy === 0, () => {
            const dx = tx - p().x;
            if (Math.abs(dx) < tol * HL) return {};
            const far = Math.abs(dx) > 4 * HL;
            const mag = gallop && far ? 1 : Math.min(0.7, Math.max(0.12, Math.abs(dx) / (2.2 * HL)));
            return { x: Math.sign(dx) * mag };
        }, max, `walkTo ${xHL}`);
    }
    async function gallopPast(xHL, { max = 60 } = {}) {
        const tx = xHL * HL, dir = Math.sign(tx - p().x);
        await until(() => (p().x - tx) * dir > 0, () => ({ x: dir }), max, `gallopPast ${xHL}`);
    }
    async function swimTo(xHL, yHL, { tol = 0.3, max = 90 } = {}) {
        const tx = xHL * HL, ty = yHL * HL, scene = G.sceneId;
        await until(() => Math.hypot(p().x - tx, p().y - ty) < tol * HL || G.sceneId !== scene, () => {
            const dx = tx - p().x, dy = ty - p().y, d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / (0.5 * HL));
            return { x: (dx / d) * m, y: (dy / d) * m };
        }, max, `swimTo ${xHL},${yHL}`);
    }
    async function act() { await step({ act: true }); await tick(); }
    async function hide() { await step({ hide: true }); }
    async function emerge() { await step({ hop: true }); }
    /** Buck straight up (standing still) and wait to land on whatever is above. */
    async function buck() {
        await until(() => p().mode === 'ground' && Math.abs(p().vx) < 30 && G.busy === 0, {}, 5, 'still before buck');
        await step({ hop: true });
        await until(() => p().mode === 'ground', {}, 3, 'land after buck');
    }
    async function context(id, maxSeconds = 5) {
        await until(() => G.context?.id === id, {}, maxSeconds, `context ${id}`);
        await act();
    }
    async function face(dir) {
        if (p().facing === dir) return;
        await step({ x: dir * 0.15 });
        await until(() => Math.abs(p().vx) < 10, {}, 2, 'stop after turning');
    }
    return { G, story, log, saves, events, p, where, step, hold, until, settle, has, flag, walkTo, gallopPast, swimTo, act, hide, emerge, buck, context, face };
}

export { HL };
