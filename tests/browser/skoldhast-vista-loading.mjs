#!/usr/bin/env node
/* Cold bay artwork: block real asset requests, earn the land pickup from staged
 * nearby prerequisites, then release the request or close during the wait.
 * Optional --action release|close runs only the selected case. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { CODE_RESTORE } from '../../skoldhast/src/save.mjs';
const out = path.resolve('docs/skoldhast/shots/geography/loading');
const actionIndex = process.argv.indexOf('--action');
const actions = actionIndex < 0 ? ['release', 'close'] : [process.argv[actionIndex + 1]];
assert.ok(actions.every(a => ['release', 'close'].includes(a)));
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch(), results = [], errors = [];
try {
    for (const action of actions) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        page.on('pageerror', e => errors.push(`${action}: ${e.message}`));
        await page.addInitScript(flags => {
            localStorage.setItem('skoldhast.v1.index', JSON.stringify({ slots: ['cold-land'], last: 'cold-land' }));
            localStorage.setItem('skoldhast.v1.slot.cold-land', JSON.stringify({ v: 1, contentVersion: 1, label: 'Cold land test', flags, checkpoint: 'start' }));
        }, CODE_RESTORE[2].flags);
        let release, requests = 0, gated = true;
        const gate = new Promise(r => { release = r; });
        await page.route(/\/assets\/(?:props-bay\.json|npcs-bay\.json|bg-bay(?:[-a-z]*)?\.webp)(?:\?.*)?$/, async route => {
            requests++; if (gated) await gate;
            await route.continue().catch(() => {});
        });
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.waitForSelector('.sk-title');
        await page.getByRole('button', { name: 'Fortsätt', exact: true }).click();
        await page.waitForFunction(() => {
            const { G, ui, story, view } = window.__skoldhast.debug;
            if (ui.dialogueOpen()) ui.advance();
            if (ui.panelOpen()) ui.closePanel();
            return G.sceneId === 'land' && view.built('land') && !G.busy && !story.running();
        }, null, { timeout: 60000 });
        const waiting = await page.evaluate(async () => {
            const api = window.__skoldhast; api.pause();
            const d = window.__cold = api.debug, { G, ui, assets, story, view, input, app, guide, companion } = d;
            const { CODE_RESTORE } = await import('/skoldhast/src/save.mjs');
            const { snapshot } = await import('/skoldhast/src/sim.mjs');
            await Promise.all(['land', 'sea'].map(b => assets.load(b)));
            const keep = ['intro_done', 'b:k1_enter', 'b:k1_stopwatch', 'klo_hidden', 'b:k1_ja', 'klo_ja', 'b:k1_mapcorner', 'rule_demo', 'clue_map_corner'];
            const remove = [...CODE_RESTORE[1].flags.filter(f => !keep.includes(f)), 'mark_land', 'b:k2_mark_land', 'clue_mark_land', 'clue_lighthouse', 'marks_both', 'b:k2_end', 'ch2_end', 'ch2_open', 'b:k2_open', 'b:k2_note2', 'clue_note2', 'p5_lit', 'b:k2_lit', 'b:k2_lanterns', 'p6_flat', 'mark_sea', 'b:k2_mark_sea', 'clue_mark_sea'];
            companion.restore([]); G.restore({ flags: CODE_RESTORE[2].flags.filter(f => !remove.includes(f)), checkpoint: 'start' });
            G.goto('land', { x: 920, y: -804, facing: -1 }); G.helpLevel = 'guided';
            story.restoreActors(); view.setScene('land'); view.cam.snap = true; ui.showControls(true); guide.clear(); input.release = () => {};
            d.calls = { bayLoads: 0, vista: 0, lines: [] };
            const load = assets.load.bind(assets); assets.load = b => { if (b === 'bay') d.calls.bayLoads++; return load(b); };
            const fx = view.fx.bind(view); view.fx = (name, options) => { if (name === 'vista') d.calls.vista++; return fx(name, options); };
            const say = ui.say.bind(ui); ui.say = (...args) => { d.calls.lines.push(args[0]); return say(...args); };
            const key = (name, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: name, bubbles: true }));
            d.render = () => {
                if (G.sceneId !== view.sceneId && !G.vista) view.setScene(G.sceneId);
                view.render(snapshot(G.player, 1, G.terrain, G.time), .1);
                ui.updateSpeaker(ui.speaker(), view.speakerBounds(ui.speaker())); guide.show(!G.busy && !ui.dialogueOpen() && !G.vista); guide.update(); app.render();
            };
            d.pump = async stop => {
                for (let i = 0; i < 18000; i++) {
                    if (stop()) return;
                    G.step({ ...input.state(), ...input.consume() }); await Promise.resolve();
                    if (G.has('mark_land')) key('ArrowLeft', false);
                    if (i % 12 === 0) d.render();
                    if (ui.dialogueOpen()) { await new Promise(r => setTimeout(r, 100)); ui.advance(); }
                    if (ui.panelOpen()) ui.closePanel();
                    if (G.busy && i % 30 === 0) await new Promise(requestAnimationFrame);
                }
                throw Error('cold vista timed out: ' + JSON.stringify(d.calls));
            };
            key('ArrowLeft', true);
            await d.pump(() => d.calls.bayLoads > 0);
            d.render();
            return { calls: d.calls, bayLoaded: assets.loaded('bay'), scene: view.sceneId, vista: !!view.vista, pickedUp: G.has('mark_land'), finished: G.has('b:k2_mark_land') };
        });
        assert.ok(requests > 0, 'real bay HTTP requests were blocked');
        assert.equal(waiting.bayLoaded, false); assert.equal(waiting.scene, 'land');
        assert.equal(waiting.vista, false); assert.equal(waiting.calls.vista, 0);
        assert.equal(waiting.pickedUp, true); assert.equal(waiting.finished, false);
        const blockedAtDiscovery = requests;
        const linesBefore = waiting.calls.lines.length;
        if (action === 'close') await page.evaluate(() => { window.__closeWhileLoading = window.__skoldhast.close(); });
        gated = false; release();
        let after;
        if (action === 'close') {
            await page.evaluate(() => window.__closeWhileLoading);
            after = await page.evaluate(() => ({ state: window.__skoldhast.state, calls: window.__cold.calls, finished: window.__cold.G.has('b:k2_mark_land') }));
            assert.equal(after.state, 'closed'); assert.equal(after.calls.vista, 0);
            assert.equal(after.calls.lines.length, linesBefore); assert.equal(after.finished, false);
            await page.evaluate(() => window.__skoldhast.open()); await page.waitForSelector('.sk-title');
        } else {
            await page.waitForFunction(() => window.__cold.assets.loaded('bay'), null, { timeout: 60000 });
            await page.evaluate(async () => {
                const d = window.__cold;
                await d.pump(() => !!d.view.vista && d.ui.dialogueOpen());
                for (let i = 0; i < 60; i++) d.render();
            });
            await sharp(await page.screenshot()).webp({ quality: 90 }).toFile(path.join(out, 'cold-lighthouse-ready.webp'));
            after = await page.evaluate(() => { const d = window.__cold; return { loaded: d.assets.loaded('bay'), built: d.view.built('viken'), scene: d.view.sceneId, vista: !!d.view.vista, calls: d.calls,
                toastVisibility: getComputedStyle(document.querySelector('.sk-toasts')).visibility }; });
            assert.equal(after.loaded, true); assert.equal(after.built, true); assert.equal(after.scene, 'viken'); assert.equal(after.vista, true);
            assert.equal(after.toastVisibility, 'hidden', 'fast-reader clue toast cannot obscure the reflection');
            assert.equal(after.calls.vista, 1); assert.ok(after.calls.lines.length > linesBefore);
            await page.evaluate(async () => { const d = window.__cold; await d.pump(() => d.G.has('b:k2_mark_land')); });
            const restored = await page.evaluate(() => ({ vistaClass: document.querySelector('.sk-vista') !== null,
                toastVisibility: getComputedStyle(document.querySelector('.sk-toasts')).visibility }));
            assert.equal(restored.vistaClass, false); assert.notEqual(restored.toastVisibility, 'hidden', 'ordinary clue toasts return after the held vista');
            after.restored = restored;
        }
        results.push({ action, blockedRequests: blockedAtDiscovery, totalRequests: requests, waiting, after });
        console.log(`PASS cold bay ${action}: ${blockedAtDiscovery} real artwork requests held at discovery`);
        await page.close();
    }
    assert.deepEqual(errors, []);
    if (actionIndex >= 0) {
        try {
            const previous = JSON.parse(await fs.readFile(path.join(out, 'results.json'), 'utf8'));
            results.push(...previous.results.filter(r => !actions.includes(r.action)));
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ results, errors }, null, 2));
} finally { await browser.close(); server.close(); }
