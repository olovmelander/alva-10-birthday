#!/usr/bin/env node
// Map → world cause/consequence in real world coordinates, phone framing,
// rotation, reduced motion and abandonment. Optional --out /tmp/fold-demo.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
const oi = process.argv.indexOf('--out'), out = oi < 0 ? null : process.argv[oi + 1];
if (out) fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch(), errors = [];
try {
    for (const mode of ['844x390', '390x844', '390x844-reduced']) {
        const [width, height] = mode.split('-')[0].split('x').map(Number);
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.waitForSelector('.sk-title');
        await page.getByText('Jag har en kod').click();
        await page.fill('.sk-code-input', 'kelp mås skal');
        await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await page.waitForFunction(() => {
            const d = window.__skoldhast.debug;
            if (d.ui.dialogueOpen()) d.ui.advance();
            return d.G.sceneId === 'kelp' && !d.G.busy && !d.story.running();
        }, null, { timeout: 60000 });
        await page.evaluate(async (reduced) => {
            window.__skoldhast.pause();
            window.__foldSim = await import('/skoldhast/src/sim.mjs');
            const { G, view, ui, guide } = window.__skoldhast.debug;
            G.story = null; G.busy = 0; G.lessMotion = reduced; guide.show(false); ui.showControls(false);
            G.goto('land', { x: 106.2 * 200, y: -.41 * 200, facing: -1 }, { silent: true });
            Object.assign(G.actors.klo, { visible: true, scene: 'land', x: 106.8 * 200, y: -.39 * 200, pose: 'map-corner', walk: null, inHole: false, pop: 0 });
            view.setScene('land');
            G.camHint = { x: G.player.x, y: G.player.y };
            window.__foldBeforeHint = G.camHint;
            window.__foldBefore = JSON.stringify({ flags: [...G.flags], player: G.player, actors: G.actors });
            window.__foldCompleted = false;
            void view.fx('foldDemo', { x: 105.2 * 200, y: -.39 * 200 }).then(() => { window.__foldCompleted = true; });
        }, mode.endsWith('reduced'));
        for (const [t, name] of [[1.4, 'map'], [3, 'both'], [4.5, 'map-restored'], [5.5, 'beach-restored']]) {
            const state = await page.evaluate(t => {
                const { G, view, app } = window.__skoldhast.debug;
                view.render(window.__foldSim.snapshot(G.player, 1, G.terrain, G.time), t - view.foldDemo.elapsed);
                app.render();
                const bounds = view.layers.fx.children.find(c => c.label === 'fold-demo').getBounds();
                return { ...view.foldDemo, screen: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, width: app.screen.width, height: app.screen.height };
            }, t);
            assert.ok(state.screen.x >= 0 && state.screen.x + state.screen.width <= state.width, `${mode} ${name}: entire demonstration horizontally visible`);
            assert.ok(state.screen.y >= 0 && state.screen.y + state.screen.height <= state.height, `${mode} ${name}: demonstration vertically visible`);
            if (name === 'map') { assert.equal(state.map, 1); assert.equal(state.world, 0); }
            if (name === 'both') { assert.equal(state.map, 1); assert.equal(state.world, 1); }
            if (out) await page.screenshot({ path: path.join(out, `${mode}-${name}.png`) });
        }
        const end = await page.evaluate(async () => {
            const { G, view } = window.__skoldhast.debug;
            view.render(window.__foldSim.snapshot(G.player, 1, G.terrain, G.time), 1);
            await Promise.resolve(); await Promise.resolve();
            return { done: window.__foldCompleted, active: view.foldDemo, restored: G.camHint === window.__foldBeforeHint,
                unchanged: window.__foldBefore === JSON.stringify({ flags: [...G.flags], player: G.player, actors: G.actors }) };
        });
        assert.deepEqual(end, { done: true, active: null, restored: true, unchanged: true });
        await page.evaluate(() => {
            const { G, view } = window.__skoldhast.debug;
            window.__foldCompleted = false;
            void view.fx('foldDemo', { x: 105.2 * 200, y: -.39 * 200 }).then(() => { window.__foldCompleted = true; });
            view.render(window.__foldSim.snapshot(G.player, 1, G.terrain, G.time), 3);
        });
        await page.setViewportSize({ width: height, height: width });
        await page.waitForFunction(w => window.__skoldhast.debug.app.screen.width === w, height);
        const rotated = await page.evaluate(() => {
            const { G, view, app } = window.__skoldhast.debug;
            view.resize(); view.render(window.__foldSim.snapshot(G.player, 1, G.terrain, G.time), 0); app.render();
            const b = view.layers.fx.children.find(c => c.label === 'fold-demo').getBounds();
            return b.x >= 0 && b.x + b.width <= app.screen.width && b.y >= 0 && b.y + b.height <= app.screen.height;
        });
        assert.equal(rotated, true, `${mode}: refitted after rotation`);
        const rebuilt = await page.evaluate(() => {
            const { view } = window.__skoldhast.debug, before = view.foldDemo;
            view.setScene('land', { keepCam: true });
            return { before, after: view.foldDemo, visible: view.layers.fx.children.some(c => c.label === 'fold-demo') };
        });
        assert.deepEqual(rebuilt.after, rebuilt.before, `${mode}: late atlas rebuild preserves current experiment`);
        assert.equal(rebuilt.visible, true);
        const abandoned = await page.evaluate(async () => {
            const { view } = window.__skoldhast.debug;
            view.setScene('kelp'); await Promise.resolve();
            return { active: view.foldDemo, resumed: window.__foldCompleted };
        });
        assert.deepEqual(abandoned, { active: null, resumed: false });
        await page.setViewportSize({ width, height });
        await page.waitForFunction(w => window.__skoldhast.debug.app.screen.width === w, width);
        await page.evaluate(() => {
            const { G, view } = window.__skoldhast.debug;
            G.goto('kelp', { x: 36.5 * 200, y: 8.4 * 200, mode: 'swim' }, { silent: true });
            view.setScene('kelp');
            window.__mapCompleted = false;
            void view.fx('mapAssemble', {}).then(() => { window.__mapCompleted = true; });
        });
        for (const [t, name] of [[.35, 'separate'], [1.1, 'joined'], [2.1, 'route']]) {
            const state = await page.evaluate(t => {
                const { G, view, app } = window.__skoldhast.debug;
                view.render(window.__foldSim.snapshot(G.player, 1, G.terrain, G.time), t - view.mapAssembly.elapsed); app.render();
                const effect = view.root.children.flatMap(c => c.children).find(c => c.label === 'map-assemble'), b = effect.getBounds();
                return { ...view.mapAssembly, fitted: b.x >= 0 && b.x + b.width <= app.screen.width && b.y >= 0 && b.y + b.height <= app.screen.height };
            }, t);
            assert.equal(state.fitted, true, `${mode}: map assembly fits`);
            if (name === 'joined') { assert.equal(state.joined, 1); assert.equal(state.route, 0); }
            if (name === 'route') assert.equal(state.route, 1);
            if (out) await page.screenshot({ path: path.join(out, `${mode}-assembly-${name}.png`) });
        }
        const mapRebuilt = await page.evaluate(() => {
            const { view } = window.__skoldhast.debug, before = view.mapAssembly;
            view.setScene('kelp', { keepCam: true });
            return { before, after: view.mapAssembly };
        });
        assert.deepEqual(mapRebuilt.after, mapRebuilt.before, `${mode}: late atlas rebuild preserves joined map`);
        const assembled = await page.evaluate(async () => {
            const { G, view } = window.__skoldhast.debug;
            view.render(window.__foldSim.snapshot(G.player, 1, G.terrain, G.time), 1);
            await Promise.resolve(); await Promise.resolve();
            return { done: window.__mapCompleted, active: view.mapAssembly };
        });
        assert.deepEqual(assembled, { done: true, active: null });
        const canceledMap = await page.evaluate(async () => {
            const { view } = window.__skoldhast.debug;
            window.__mapCompleted = false;
            void view.fx('mapAssemble', {}).then(() => { window.__mapCompleted = true; });
            view.setScene('land'); await Promise.resolve();
            return { done: window.__mapCompleted, active: view.mapAssembly };
        });
        assert.deepEqual(canceledMap, { done: false, active: null });
        await page.close();
    }
    assert.deepEqual(errors, []);
    console.log('fold demo: ordered map/world changes, phone framing, rotation, reduced motion, restoration and scene cancellation pass');
} finally { await browser.close(); server.close(); }
