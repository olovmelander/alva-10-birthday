/*
 * The page's half of tests/browser/skoldhast-a3-play.mjs: a robot player inside the real game. It is added to the page
 * once the title is up, replaces the inputs of G.step() (the real loop, view and UI keep running) and follows the
 * same route as the node robot (tests/skoldhast-a3-route.mjs, loaded from the server), in step with the simulation.
 * The same helpers as tests/skoldhast-a3-robot.mjs, but a step here is a step of the running game: a dialogue
 * takes the time it takes, and the node side takes a picture of every line before it is advanced.
 */
window.__installRobot = async function (opts = {}) {
    const sim = await import('/skoldhast/src/sim.mjs');
    const HL = sim.HL, STEP = sim.STEP;
    const d = () => window.__skoldhast3.debug;
    const G = d().G, ui = d().ui, story = d().story;
    const FULL = !!opts.fullStick;        // quantise the stick to -1/0/1, as arrow keys and a thumb pushed all the way
    const events = [];
    const P = { events, error: null, done: false, stage: 'init', wantTravel: null, draw: null, log: [] };
    window.__P = P;

    // ---- what the player is told, logged for the node side ----
    const wrap = (obj, name, kind) => {
        const orig = obj[name];
        if (typeof orig !== 'function') return;
        obj[name] = function (...a) {
            try { events.push({ kind, t: G.time, scene: G.sceneId, x: +(G.player.x / HL).toFixed(2), text: typeof a[0] === 'string' ? a[0] : JSON.stringify(a[0]) }); } catch { /* ignore */ }
            return orig.apply(this, a);
        };
    };
    wrap(ui, 'think', 'think'); wrap(ui, 'toast', 'toast'); wrap(ui, 'caption', 'caption'); wrap(ui, 'remark', 'remark');
    const origDraw = ui.draw;
    ui.draw = function (o) {
        const geo = o.getGeometry?.() || {};
        P.draw = { guided: !!(o.anchors || geo.anchors)?.length, anchors: o.anchors || geo.anchors || null, bounds: o.bounds || geo.bounds || null, prompt: o.prompt, numbers: !!o.numbers };
        events.push({ kind: 'draw', t: G.time, text: o.prompt });
        return origDraw.call(this, o).finally(() => { P.draw = null; });
    };
    G.on('flag', ({ flag }) => events.push({ kind: 'flag', t: G.time, scene: G.sceneId, x: +(G.player.x / HL).toFixed(2), text: flag }));
    G.on('balk', (e) => events.push({ kind: 'balk', t: G.time, scene: G.sceneId, x: +(G.player.x / HL).toFixed(2), text: e.reason || '' }));

    // ---- the step hook ----
    let task = null, held = { x: 0, y: 0 }, on = true, steps = 0;
    const origStep = G.step.bind(G);
    const p = () => G.player;
    const where = () => {
        const q = p();
        return `${G.sceneId} x=${(q.x / HL).toFixed(2)} y=${(q.y / HL).toFixed(2)} mode=${q.mode} vx=${Math.round(q.vx)} vy=${Math.round(q.vy)}` +
            ` hidden=${q.hidden} busy=${G.busy} beat=${story.running()} surface=${q.surface?.id || '-'} ctx=${G.context?.id || '-'} carry=${G.carry?.def?.id || '-'}`;
    };
    P.where = where;
    const quant = (v) => !FULL ? (v || 0) : (Math.abs(v || 0) < 0.12 ? 0 : Math.sign(v));
    G.step = (inp) => {
        if (!on) return origStep(inp);
        if (ui.panelOpen() || ui.dialogueOpen()) return origStep(inp);
        let use = { x: held.x, y: held.y };
        if (task) {
            let fin = false;
            try { fin = task.pred(); } catch (e) { const t = task; task = null; t.reject(e); }
            if (task && fin) { const t = task; task = null; t.resolve(); }
            else if (task) {
                const i = typeof task.input === 'function' ? task.input() : (task.input || {});
                use = i || {}; held = { x: use.x || 0, y: use.y || 0 };
                if (--task.left <= 0) { const t = task; task = null; held = { x: 0, y: 0 }; t.reject(new Error('robot timed out: ' + t.label + '\n  at ' + where())); }
            }
        }
        steps++;
        return origStep({ x: quant(use.x), y: quant(use.y), hopHeld: !!use.hopHeld, hop: !!use.hop, act: !!use.act, duck: false, hide: !!use.hide, hideRelease: false, tapHero: !!use.tapHero });
    };
    P.off = () => { on = false; };

    function until(pred, input, maxSeconds, label) {
        return new Promise((resolve, reject) => { task = { pred, input, left: Math.round(maxSeconds / STEP), resolve, reject, label }; });
    }
    async function step(inp = {}) {
        let fired = false;
        await until(() => fired, () => { fired = true; return inp; }, 5, 'step');
    }
    async function hold(seconds, inp = {}) {
        const t0 = G.time; let first = true;
        await until(() => G.time - t0 >= seconds, () => { if (first) { first = false; return inp; } return { ...inp, act: false, hide: false, hop: false, tapHero: false }; }, seconds + 30, 'hold');
        held = { x: 0, y: 0 };
    }
    async function settle(maxSeconds = 240) {
        let idle = 0;
        await until(() => { idle = G.busy === 0 && !story.running() && !G.carry && d().mode === 'play' ? idle + 1 : 0; return idle > 30; }, {}, maxSeconds, 'settle');
    }
    const has = (f) => G.flags.has(f);
    async function flag(f, input, maxSeconds = 30) { await until(() => has(f), input, maxSeconds, `flag ${f}`); }
    async function goTo(xHL, { gallop = false, tol = 0.15, max = 120, hopOver = [] } = {}) {
        const tx = xHL * HL;
        let stuck = 0, lastX = p().x, tap = 0;
        await until(() => Math.abs(p().x - tx) < tol * HL && Math.abs(p().vx) < 40 && p().mode === 'ground' && G.busy === 0 && !G.carry, () => {
            const q = p(), dx = tx - q.x;
            if (G.busy || G.carry) return {};
            if (q.hidden) return { hop: true };
            if (Math.abs(dx) < tol * HL) return {};
            const dir = Math.sign(dx), far = Math.abs(dx) > 4 * HL;
            let mag = gallop && far ? 1 : Math.min(0.7, Math.max(0.15, Math.abs(dx) / (2.2 * HL)));
            if (FULL) {
                // arrow keys: hold while far, then short taps to nudge the last bit
                if (Math.abs(dx) > 1.6 * HL) mag = 1;
                else { tap = (tap + 1) % 24; mag = (tap < 6 && Math.abs(q.vx) < 260) ? 1 : 0; }
            }
            for (const gx of hopOver) if (q.mode === 'ground' && (gx * HL - q.x) * dir > 0 && (gx * HL - q.x) * dir < 0.5 * HL) return { x: dir, hop: true };
            if (q.mode === 'ground' && Math.abs(q.x - lastX) < 1) stuck++; else stuck = 0;
            lastX = q.x;
            if (stuck > (FULL ? 90 : 30) && q.mode === 'ground') { stuck = 0; return { x: dir, hop: true }; }
            return { x: dir * mag };
        }, max, `goTo ${xHL}`);
        held = { x: 0, y: 0 };
    }
    async function gallopPast(xHL, { max = 60 } = {}) {
        const tx = xHL * HL, dir = Math.sign(tx - p().x);
        await until(() => (p().x - tx) * dir > 0 || G.busy > 0, () => ({ x: dir }), max, `gallopPast ${xHL}`);
    }
    async function floatTo(xHL, yHL, { tol = 0.3, max = 90 } = {}) {
        const tx = xHL * HL, ty = yHL * HL, scene = G.sceneId;
        await until(() => Math.hypot(p().x - tx, p().y - ty) < tol * HL || G.sceneId !== scene, () => {
            const q = p();
            if (q.mode === 'ground') return { hop: true, x: Math.sign(tx - q.x) * 0.4 };
            const dx = tx - q.x, dy = ty - q.y, dd = Math.hypot(dx, dy) || 1, sp = Math.min(800, dd * 2.4);
            let ix = (dx / dd * sp - q.vx) / 500, iy = (dy / dd * sp - q.vy) / 500;
            const m = Math.hypot(ix, iy);
            if (m > 1) { ix /= m; iy /= m; }
            return { x: ix, y: iy };
        }, max, `floatTo ${xHL},${yHL}`);
        held = { x: 0, y: 0 };
    }
    async function landOn(xHL, yHL, { max = 60 } = {}) {
        await floatTo(xHL, yHL - 0.6, { tol: 0.2, max });
        await until(() => p().mode === 'ground' && Math.abs(p().y - yHL * HL) < 0.15 * HL, () => {
            const q = p();
            return { x: Math.max(-0.3, Math.min(0.3, (xHL * HL - q.x) / HL)), y: 0.45 };
        }, 8, `landOn ${xHL},${yHL}`);
        held = { x: 0, y: 0 };
    }
    async function act() { await step({ act: true }); }
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
    async function hideStill(seconds) {
        await until(() => p().mode === 'ground' && Math.abs(p().vx) < 20 && !G.busy, {}, 5, 'still before hiding');
        if (!p().hidden) await hide();
        await hold(seconds);
    }
    function travel(id) { P.wantTravel = id; }
    async function climb(xHL, yHL, { max = 12 } = {}) {
        const tx = xHL * HL, ty = yHL * HL;
        await until(() => p().mode === 'ground' && Math.abs(p().y - ty) < 0.12 * HL && Math.abs(p().x - tx) < 0.7 * HL, () => {
            const q = p(), dx = tx - q.x;
            const steer = Math.max(-0.6, Math.min(0.6, dx / HL));
            if (q.mode !== 'ground') return { x: FULL ? Math.sign(dx) : steer };
            if (Math.abs(q.y - ty) < 0.12 * HL) return { x: Math.max(-0.4, Math.min(0.4, dx / HL)) };
            if (!FULL && Math.abs(q.vx) > 60) return {};
            return { x: Math.sign(dx) * (FULL ? 1 : 0.35), hop: true };
        }, max, `climb ${xHL},${yHL}`);
        held = { x: 0, y: 0 };
    }
    const assert = { ok(v, m) { if (!v) throw new Error('assert: ' + m + '\n  at ' + where()); }, equal(a, b, m) { if (a !== b) throw new Error(`assert: ${m} (${a} !== ${b})\n  at ${where()}`); } };
    const R = { G, story, p, where, step, hold, until, settle, has, flag, goTo, gallopPast, floatTo, landOn, act, hide, emerge, context, face, hideStill, travel, climb };
    P.R = R;

    // ---- the route: the node robot's own (tests/skoldhast-a3-route.mjs), with its two imports stood in for ----
    const routeSrc = (await (await fetch('/tests/skoldhast-a3-route.mjs')).text()).replace(/^import .*$/gm, '');
    window.__a3assert = assert;
    const route = await import(URL.createObjectURL(new Blob([`const assert = window.__a3assert, HL = ${HL};`, routeSrc], { type: 'text/javascript' })));
    // the game is begun by the title's button, the prologue and the launch: wait for play instead of starting it
    const begin = async () => {
        await new Promise((resolve) => { const t = setInterval(() => { if (d().mode === 'play') { clearInterval(t); resolve(); } }, 100); });
        await R.settle();
    };
    // the rocket's travel card is answered by the node side (a real click), and the page turn takes real time
    const travelTo = async (id, rocketX) => {
        await R.goTo(rocketX);
        R.travel(id);
        await R.context('travel', 5);
        await new Promise((resolve, reject) => { const t0 = Date.now(); const t = setInterval(() => { if (G.sceneId === id) { clearInterval(t); resolve(); } else if (Date.now() - t0 > 120000) { clearInterval(t); reject(new Error('travel to ' + id + ' did not happen')); } }, 100); });
        await R.settle();
    };

    const order = opts.order || ['stjarn', 'ring'];
    const ROCKET_AT = { mane: 3.6, stjarn: 3.4, ring: 2.4 };
    P.run = (async () => {
        try {
            P.stage = 'begin'; await begin();
            P.stage = 'breakfast'; await route.breakfast(R);
            P.stage = 'moon'; await route.moon(R);
            for (const id of order) {
                P.stage = 'travel ' + id; await travelTo(id, ROCKET_AT[G.sceneId]);
                P.stage = id; await (id === 'stjarn' ? route.constellations(R) : route.ring(R));
            }
            P.stage = 'travel sudd'; await travelTo('sudd', ROCKET_AT[G.sceneId]);
            P.stage = 'white'; await route.white(R);
            P.stage = 'climax'; await route.climax(R);
            P.stage = 'home'; await route.home(R);
            P.stage = 'ended'; P.done = true;
        } catch (e) { P.error = String(e.stack || e); }
    })();
    return true;
};
