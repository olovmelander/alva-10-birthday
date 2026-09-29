#!/usr/bin/env node
/*
 * Reproducible terrain/hoof review. Drives the real fixed-step simulation through
 * x 13.5–52 HL at walk and gallop speeds, in both directions. Rendering is stepped
 * at 60 Hz but screenshots wait for explicit rendered states, not wall-clock time.
 *
 * node tests/browser/skoldhast-hills.mjs --out /tmp/hills-after [--viewport 844x390]
 * --root /path/to/baseline serves a frozen before checkout with the same harness.
 * --baseline records failures for comparison rather than rejecting old geometry.
 * Contact sheets retain the exact coordinates, pace, direction and camera in JSON.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((v, i, all) =>
    v.startsWith('--') ? [[v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : []));
const out = path.resolve(args.out || '/tmp/skoldhast-hills');
const [W, H] = String(args.viewport || '844x390').split('x').map(Number);
fs.mkdirSync(out, { recursive: true });
const server = await serve(args.root ? path.resolve(args.root) : undefined);
const browser = await launch();
const errors = [];
const files = [];
const report = { viewport: [W, H], baseline: !!args.baseline, traversals: [], captures: [], errors };
try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    // Particle timing is cosmetic; seed it so before/after frames are reviewable.
    await ctx.addInitScript(() => { let seed = 3929; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; });
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errors.push(e.message));
    pg.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`, { waitUntil: 'load' });
    await pg.waitForSelector('.sk-title');
    await pg.getByText('Jag har en kod').click();
    await pg.fill('.sk-code-input', 'fyr fjun klo');
    await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
    await pg.waitForFunction(() => {
        const d = window.__skoldhast?.debug;
        if (d?.ui.dialogueOpen()) d.ui.advance();
        return d?.G.sceneId === 'viken' && d.view.built('viken') && !d.G.busy && !d.story.running();
    }, null, { timeout: 60000 });
    await pg.evaluate(async () => {
        window.__skoldhast.pause();
        const d = window.__skoldhast.debug;
        await d.assets.load('land');
        const sim = await import('/skoldhast/src/sim.mjs');
        window.__hills = { sim, tick: 0, rendered: 0 };
        d.G.hideActors = true;
        d.G.hideHero = false;
        d.G.lessMotion = false;
        d.G.story = null;
        d.guide.show(false);
        // The gameplay UI is irrelevant to terrain comparison and may reflect the
        // word-code arrival. Hide only DOM overlays, keeping the actual game canvas.
        document.querySelectorAll('.sk-root > :not(canvas)').forEach((el) => { el.style.visibility = 'hidden'; });
        d.G.goto('land', { x: 49 * 200, y: -0.8 * 200, facing: -1 }, { silent: true });
        d.view.setScene('land');
    });
    await pg.waitForFunction(() => window.__skoldhast.debug.view.built('land'), null, { timeout: 30000 });

    const saveCapture = async (name, details) => {
        const file = `${name}-${W}x${H}.webp`;
        const png = await pg.screenshot();
        const sharp = (await import('sharp')).default;
        await sharp(png).webp({ quality: 86 }).toFile(path.join(out, file));
        report.captures.push({ file, ...details });
        files.push(file);
    };
    for (const pace of ['walk', 'gallop']) for (const direction of [-1, 1]) {
        const result = await pg.evaluate(({ pace, direction }) => {
            const { G, view } = window.__skoldhast.debug;
            const { sim } = window.__hills;
            for (const f of ['p3_t1', 'p3_t2', 'p3_t3']) G.flags.add(f);
            G.terrain.refresh();
            const x = (direction === -1 ? 52 : 13.5) * 200;
            const y = G.terrain.support(x, -10000, 0)?.y;
            G.goto('land', { x, y, facing: direction }, { silent: true });
            G.time = 10; G.camHint = null;
            view.cam.gal = 0; view.cam.snap = true;
            window.__hills.route = { pace, direction, events: [], maxGroundError: 0, airSteps: 0, maxSpeedDelta: 0, minSpeed: Infinity, finite: true, steps: 0, lastV: 0 };
            return { x, y };
        }, { pace, direction });
        assert.ok(Number.isFinite(result.y), 'route begins on real ground');
        const targets = [14, 28, 34, 36, 38.5, 46, 47, 48.5].sort((a, b) => direction * (a - b));
        for (const target of targets) {
            const details = await pg.evaluate(({ target, pace, direction }) => {
                const { G, view, app } = window.__skoldhast.debug;
                const { sim, route } = window.__hills;
                const p = G.player;
                let budget = 24000;
                while (direction * (p.x - target * 200) < 0 && budget-- > 0) {
                    const events = [];
                    sim.stepPlayer(p, { x: direction * (pace === 'walk' ? 0.3 : 1) }, { terrain: G.terrain, flags: G.flags }, sim.STEP, events);
                    G.time += sim.STEP;
                    route.steps++;
                    route.finite &&= [p.x, p.y, p.vx, p.vy].every(Number.isFinite);
                    if (p.mode !== 'ground') route.airSteps++;
                    else if (p.surface) route.maxGroundError = Math.max(route.maxGroundError, Math.abs(p.y - sim.heightOn(p.surface.pts, p.x)));
                    if (route.steps > 180) {
                        route.maxSpeedDelta = Math.max(route.maxSpeedDelta, Math.abs(Math.abs(p.vx) - route.lastV));
                        route.minSpeed = Math.min(route.minSpeed, Math.abs(p.vx));
                    }
                    route.lastV = Math.abs(p.vx);
                    for (const e of events) if (['balk', 'fall', 'land'].includes(e.type)) route.events.push({ ...e, x: p.x, y: p.y });
                    if (route.steps % 2 === 0) view.render(sim.snapshot(p, 1, G.terrain, G.time), sim.STEP * 2);
                }
                // Use the same world camera at every named spot in before/after.
                const cameraY = { 14: -4, 28: -6.35, 34: -4.02, 36: -4, 38.5: -2.95, 46: -1.9, 47: -1.4, 48.5: -0.8125 };
                const centerY = cameraY[target] * 200;
                G.camHint = { x: target * 200, y: centerY - 160, zoom: 1 };
                view.cam.snap = true;
                view.render(sim.snapshot(p, 1, G.terrain, G.time), 0);
                app.render();
                window.__hills.rendered++;
                return { target, pace, direction, reached: budget > 0, player: { x: p.x, y: p.y, vx: p.vx, mode: p.mode, surface: p.surface?.id }, camera: { x: view.cam.x, y: view.cam.y, zoom: view.cam.zoom }, route: structuredClone(route) };
            }, { target, pace, direction });
            assert.ok(details.reached, `${pace} ${direction}: reaches ${target} HL`);
            if ([28, 34, 36, 38.5, 46, 47].includes(target)) {
                const name = `${pace}-${direction < 0 ? 'west' : 'east'}-x${String(target).replace('.', '_')}`;
                await saveCapture(name, details);
            }
            if (target === targets.at(-1)) report.traversals.push(details.route);
        }
    }
    // A fixed-camera close-up of the same grown ramp before, during and after
    // growth. A 1/120 s first frame exposes pop-in and any missing vertical face.
    await pg.evaluate(() => {
        const { G, view } = window.__skoldhast.debug;
        for (const f of ['p3_t1', 'p3_t2', 'p3_t3']) G.flags.delete(f);
        G.terrain.refresh();
        G.goto('land', { x: 47 * 200, y: -0.8 * 200, facing: -1 }, { silent: true });
        window.__hills.growthStartY = G.player.y;
        view.setScene('land');
        G.camHint = { x: 47 * 200, y: -1.6 * 200, zoom: 1 };
        view.cam.snap = true;
    });
    for (const [name, grow, seconds] of [['ungrown', false, 0], ['growth-first-frame', true, 1 / 120], ['growth-half-second', false, 0.5], ['grown', false, 1]]) {
        const details = await pg.evaluate(({ grow, seconds }) => {
            const { G, view, app } = window.__skoldhast.debug;
            const { sim } = window.__hills;
            if (grow) {
                // Match the puzzle's earning order. Old builds have no growth
                // clock, so the same harness still reproduces their instant ramp.
                G.flags.add('p3_t1');
                G.terrain.startRampGrowth?.('ramp1');
                G.terrain.refresh();
                G.emit('grow', { id: 't1' });
            }
            const steps = Math.max(1, Math.round(seconds * 120));
            let maxStepLift = 0;
            for (let i = 0; i < steps; i++) {
                const previousY = G.player.y;
                if (seconds > 0) sim.stepPlayer(G.player, {}, { terrain: G.terrain, flags: G.flags }, sim.STEP, []);
                maxStepLift = Math.max(maxStepLift, Math.abs(G.player.y - previousY));
                G.time += seconds / steps;
                view.render(sim.snapshot(G.player, 1, G.terrain, G.time), seconds / steps);
            }
            app.render();
            const top = Math.min(...G.terrain.surfaces.filter((s) => !s.thin).map((s) => sim.heightOn(s.pts, G.player.x)).filter((y) => y !== null));
            return { grown: G.flags.has('p3_t1'), elapsed: seconds, groundError: G.player.y - top, lift: window.__hills.growthStartY - G.player.y, maxStepLift, player: { x: G.player.x, y: G.player.y, mode: G.player.mode, surface: G.player.surface?.id }, camera: { x: view.cam.x, y: view.cam.y, zoom: view.cam.zoom } };
        }, { grow, seconds });
        if (!args.baseline && details.grown) {
            assert.ok(Math.abs(details.groundError) < 0.01, `${name}: ramp growth keeps the player on the new support`);
            assert.ok(details.maxStepLift < 4, `${name}: ramp growth has no instantaneous vertical pop (${details.maxStepLift} wu)`);
        }
        await saveCapture(`ramp1-${name}`, details);
    }
    const sharp = (await import('sharp')).default;
    const tw = Math.round(W * 0.5), th = Math.round(H * 0.5), cols = W > H ? 4 : 6, labelH = 22;
    const composites = await Promise.all(files.map(async (file, i) => {
        const label = file.replace(`-${W}x${H}.webp`, '');
        const caption = Buffer.from(`<svg width="${tw}" height="${labelH}"><rect width="100%" height="100%" fill="#fbf8f1"/><text x="7" y="16" font-size="13" font-family="sans-serif" fill="#3b3530">${label}</text></svg>`);
        const thumb = await sharp(path.join(out, file)).resize(tw, th).extend({ bottom: labelH, background: '#fbf8f1' }).composite([{ input: caption, left: 0, top: th }]).toBuffer();
        return { input: thumb, left: (i % cols) * tw, top: Math.floor(i / cols) * (th + labelH) };
    }));
    await sharp({ create: { width: cols * tw, height: Math.ceil(files.length / cols) * (th + labelH), channels: 3, background: '#fbf8f1' } }).composite(composites).webp({ quality: 80 }).toFile(path.join(out, `hills-sheet-${W}x${H}.webp`));
    fs.writeFileSync(path.join(out, `hills-report-${W}x${H}.json`), JSON.stringify(report, null, 2) + '\n');
    assert.deepEqual(errors, [], 'no browser errors');
    for (const route of report.traversals) {
        assert.ok(route.finite, 'movement remains finite');
        if (!args.baseline) {
            assert.equal(route.airSteps, 0, `${route.pace}/${route.direction}: continuous ground contact on the complete grown route`);
            assert.ok(route.maxGroundError < 0.01, `${route.pace}/${route.direction}: body root follows its actual support`);
        }
    }
    console.log(JSON.stringify({ out, captures: files.length, traversals: report.traversals }, null, 2));
} finally {
    await browser.close();
    server.close();
}
