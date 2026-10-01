#!/usr/bin/env node
/* Matched visual audit, not a gameplay/progression test. Fixed authored player
 * positions and flags exercise the production camera and world drawing.
 * node tests/browser/skoldhast-world-art.mjs --out docs/skoldhast/shots/world-art/before
 *   [--root /absolute/immutable/repo] [--revision SHA] [--viewport 1440x900]
 *   [--only land,kelp] [--skip 25-viken-evening] [--tables] [--metrics] [--verify] [--rotate]
 * Tables are live prologue / staged finale UI. Metrics are diagnostic manual
 * render costs and scene counts on the same browser, not hardware FPS claims.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const out = path.resolve(arg('--out') || 'docs/skoldhast/shots/world-art/after');
const root = arg('--root') || process.cwd();
const revision = arg('--revision') || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sizes = arg('--viewport') ? arg('--viewport').split(',') : ['1440x900', '844x390', '390x844'];
const batch = arg('--batch') ? '-' + arg('--batch').replace(/[^a-z0-9-]/gi, '') : '';
const stages = [
    { name: '01-land-beach', scene: 'land', x: 108.6, y: -.34, facing: -1 },
    { name: '02-land-pool', scene: 'land', x: 101.8, y: -.1, facing: -1 },
    { name: '03-land-cave-open', scene: 'land', x: 103.2, y: -.18, facing: -1 },
    { name: '04-land-bridge', scene: 'land', x: 78, y: -1.2, facing: -1 },
    { name: '05-land-backdrop-boundary', scene: 'land', x: 79.5, y: -.75, facing: -1 },
    { name: '06-land-steppe', scene: 'land', x: 58, y: -.8, facing: -1 },
    { name: '07-land-hill', scene: 'land', x: 41, y: -1.916, facing: -1 },
    { name: '08-land-crest', scene: 'land', x: 28, y: -6.35, facing: -1 },
    { name: '09-land-cliff', scene: 'land', x: 14, y: -4, facing: -1 },
    { name: '10-land-west-edge', scene: 'land', x: 1.2, y: -4.03, facing: -1 },
    { name: '11-land-jetty-transition', scene: 'land', x: 117.6, y: -.16 },
    { name: '12-kelp-cave-entry', scene: 'kelp', x: .6, y: 2.4 },
    { name: '13-kelp-entry', scene: 'kelp', x: 14, y: 4 },
    { name: '14-kelp-overlook', scene: 'kelp', x: 21, y: 3.8 },
    { name: '15-kelp-vault-dark', scene: 'kelp', x: 26.6, y: 11.1, dark: true },
    { name: '16-kelp-vault-lit', scene: 'kelp', x: 28.4, y: 11.4 },
    { name: '17-kelp-heart', scene: 'kelp', x: 36, y: 9 },
    { name: '18-kelp-east-fold', scene: 'kelp', x: 47, y: 4.8 },
    { name: '19-viken-shore-transition', scene: 'viken', x: .6, y: -.16 },
    { name: '20-viken-sea-entry', scene: 'viken', x: 8.6, y: 3, swim: true },
    { name: '21-viken-pier', scene: 'viken', x: 20.5, y: -.62 },
    { name: '22-viken-lighthouse-high', scene: 'viken', x: 29, y: -7.3 },
    { name: '23-viken-underwater', scene: 'viken', x: 14.2, y: 6.4, swim: true },
    { name: '24-viken-east-edge', scene: 'viken', x: 34.8, y: 2, swim: true },
    { name: '25-viken-evening', scene: 'viken', x: 20.5, y: -.62, evening: true, lit: true },
    { name: '26-land-evening', scene: 'land', x: 108.6, y: -.34, evening: true },
    { name: '28-land-west-wide', scene: 'land', x: 1.2, y: -4.03, facing: -1, camera: { x: 0, y: -650, zoom: .55 } },
    { name: '29-kelp-east-wide', scene: 'kelp', x: 47, y: 4.8, camera: { x: 9600, y: 1500, zoom: .55 }, sizes: ['1440x900', '844x390'] },
    { name: '30-kelp-active-pull', scene: 'kelp', x: 39.3, y: 9.5, p6: 'pull', sizes: ['844x390', '390x844'] },
    { name: '31-kelp-active-pocket', scene: 'kelp', x: 39.0, y: 7.7, p6: 'pocket', sizes: ['844x390', '390x844'] }
];
await fs.mkdir(out, { recursive: true });
const server = await serve(root), browser = await launch(), errors = [], records = [];
const base = `http://127.0.0.1:${server.address().port}`;
async function shot(page, name, size, metadata, metadataBatch = batch) {
    const file = `${name}-${size}.webp`;
    await sharp(await page.screenshot()).webp({ quality: 90 }).toFile(path.join(out, file));
    records.push({ viewport: size, file, ...metadata });
    await fs.writeFile(path.join(out, `states-${size}${metadataBatch}.json`), JSON.stringify({ type: 'staged diagnostic views; not progression evidence', revision, root, records: records.filter(r => r.viewport === size), errors }, null, 2));
    console.log(file);
}
try {
    for (const size of sizes) {
        const [width, height] = size.split('x').map(Number);
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1000, deviceScaleFactor: 1 });
        page.on('pageerror', e => errors.push(`${size}: ${e.message}`));
        await page.goto(base + '/skoldhast/dev/play.html');
        await page.waitForSelector('.sk-title');
        if (process.argv.includes('--tables') && !process.argv.includes('--finale-only')) {
            await page.getByRole('button', { name: 'Börja', exact: true }).click();
            await page.waitForSelector('.sk-notes-skip', { timeout: 60000 });
            await page.locator('.sk-notes-skip').click();
            await page.waitForSelector('.sk-draw.on', { timeout: 60000 });
            await shot(page, '00-prologue-drawing', size, { type: 'live prologue at first drawing prompt' });
            await page.evaluate(() => window.__skoldhast.close());
            await page.reload(); await page.waitForSelector('.sk-title');
        }
        await page.getByText('Jag har en kod').click();
        await page.fill('.sk-code-input', 'fyr fjun klo');
        await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await page.waitForFunction(() => {
            const { G, ui, story, view } = window.__skoldhast.debug;
            if (ui.dialogueOpen()) ui.advance();
            return G.sceneId === 'viken' && view.built('viken') && !G.busy && !story.running();
        }, null, { timeout: 60000 });
        await page.evaluate(async () => {
            const api = window.__skoldhast, { G, assets, guide } = api.debug;
            api.pause(); await Promise.all(assets.bundles().map(b => assets.load(b)));
            await document.fonts.ready;
            window.__worldSim = await import('/skoldhast/src/sim.mjs');
            window.__worldSave = await import('/skoldhast/src/save.mjs');
            G.story = null; guide.clear();
        });
        for (const stage of stages) {
            if (stage.sizes && !stage.sizes.includes(size)) continue;
            if (arg('--only') && !arg('--only').split(',').some(part => stage.name.includes(part))) continue;
            if (arg('--skip') && arg('--skip').split(',').some(part => stage.name.includes(part))) continue;
            const record = await page.evaluate(stage => {
                const { G, view, app, ui, guide, companion } = window.__skoldhast.debug;
                G.restore({ flags: [...window.__worldSave.CODE_RESTORE[2].flags, 'ch3_open', 'viken_arrived', 'gate_open', 'b:k3_arrive'], checkpoint: 'viken' });
                if (stage.dark) G.flags.delete('p5_lit');
                if (stage.lit) for (const f of ['shutter1', 'shutter2', 'shutter3', 'lamp_lit']) G.flags.add(f);
                if (stage.p6) {
                    for (const f of ['mark_sea', 'clue_mark_sea', 'marks_both', 'ch2_end', 'p6_kelp_freed', 'p6_flat']) G.flags.delete(f);
                    if (stage.p6 === 'pocket') { G.flags.add('p6_flat'); G.flags.add('p6_kelp_freed'); }
                }
                G.time = 12; G.busy = 0; G.evening = !!stage.evening; G.lessMotion = true;
                G.hideHero = false; G.vista = false; G.finalRun = false; G.freeze = false; G.camHint = stage.camera || null; G.guidance = null;
                const mode = stage.scene === 'kelp' || stage.swim ? 'swim' : 'ground';
                G.goto(stage.scene, { x: stage.x * 200, y: stage.y * 200, facing: stage.facing ?? 1, mode }, { silent: true });
                Object.assign(G.player, { x: stage.x * 200, y: stage.y * 200, px: stage.x * 200, py: stage.y * 200, vx: 0, vy: 0, speed: 0, gait: 'stand', gaitPhase: .2 });
                if (stage.p6 === 'pull') Object.assign(G.puz.p6, { grabbed: true, owner: G.player, origin: { x: 38.8 * 200, y: 9.75 * 200 }, pull: .35 });
                for (const actor of Object.values(G.actors)) Object.assign(actor, { visible: false, talking: false, walk: null });
                if (stage.scene === 'kelp') Object.assign(G.puz.school, { state: stage.dark ? 'home' : 'lit', ...G.sceneDef.school[stage.dark ? 'home' : 'lit'] });
                const oldRandom = Math.random; let seed = 6021;
                Math.random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
                try { view.setScene(stage.scene); } finally { Math.random = oldRandom; }
                view.cam.snap = true; guide.clear(); guide.show(false); companion.restore([]);
                ui.setContext(null, false); ui.showControls(true); ui.setBigText(false);
                for (let i = 0; i < 90; i++) view.render(window.__worldSim.snapshot(G.player, 1, G.terrain, G.time), 1 / 60);
                app.render();
                const cam = { ...view.cam }, bounds = G.sceneDef.bounds;
                const worldViewport = { x0: cam.x - innerWidth / (2 * cam.zoom), x1: cam.x + innerWidth / (2 * cam.zoom), y0: cam.y - innerHeight / (2 * cam.zoom), y1: cam.y + innerHeight / (2 * cam.zoom) };
                const landscape = view.layers.terrainBack.children.find(node => node.label === 'landscape-ground')?.landscape;
                let activePuzzle = null;
                if (stage.p6) {
                    const def = G.sceneDef.kelpPuzzle, targets = stage.p6 === 'pull' ? [{ name: 'snag', ...def.tether.hook }, { name: 'hand', x: G.player.x + 56, y: G.player.y - 100 }] : [{ name: 'paper pocket', ...def.fragment.to }];
                    const points = targets.map(point => ({ name: point.name, x: (point.x - cam.x) * cam.zoom + innerWidth / 2, y: (point.y - cam.y) * cam.zoom + innerHeight / 2 }));
                    const find = (node, label) => node.label === label ? node : (node.children || []).map(child => find(child, label)).find(Boolean);
                    const labels = ['p6-tether', 'p6-pocket', 'p6-fragment'].map(label => { const node = find(view.world, label); return { label, present: !!node, visible: !!node?.visible }; });
                    const buttons = [...document.querySelectorAll('.sk-controls:not(.off) .sk-btn')].map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
                    activePuzzle = { phase: stage.p6, points, labels, buttons };
                }
                return { stage, type: stage.p6 ? 'staged active puzzle pose, no progression claimed' : stage.camera ? 'staged authored diagnostic wide camera' : 'staged natural camera, completed accessible terrain', flags: [...G.flags], cam, bounds, worldViewport, landscape, activePuzzle, player: { x: G.player.x, y: G.player.y, mode }, built: view.built(stage.scene) };
            }, stage);
            assert.ok(record.built, stage.name + ': scene artwork loaded');
            if (record.activePuzzle) {
                assert.ok(record.activePuzzle.labels.every(item => item.present), 'active puzzle retains authored props');
                for (const point of record.activePuzzle.points) {
                    assert.ok(point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height, `${stage.name}: ${point.name} stays visible`);
                    for (const box of record.activePuzzle.buttons) assert.ok(point.x < box.x || point.x > box.x + box.width || point.y < box.y || point.y > box.y + box.height, `${stage.name}: ${point.name} clears controls`);
                }
                if (stage.p6 === 'pocket') assert.ok(record.activePuzzle.labels.find(item => item.label === 'p6-fragment').visible, 'actual paper is visible in its pocket');
            }
            if (process.argv.includes('--verify')) {
                const cover = record.landscape?.coverage, frame = record.worldViewport;
                assert.ok(cover, `${stage.name}: ground has explicit visual coverage`);
                assert.ok(cover.x0 <= frame.x0 && cover.x1 >= frame.x1 && cover.y1 >= frame.y1, `${stage.name}: painted ground covers the camera bounds`);
            }
            if (process.argv.includes('--metrics') && ['07-', '13-', '21-', '28-', '29-'].some(prefix => stage.name.startsWith(prefix))) record.metrics = await page.evaluate(() => {
                const { G, view, app } = window.__skoldhast.debug;
                const count = node => 1 + (node.children || []).reduce((sum, child) => sum + count(child), 0);
                const gl = app.renderer.gl || app.renderer.context?.gl, original = {}, draws = {};
                for (const key of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) if (gl?.[key]) {
                    original[key] = gl[key]; draws[key] = 0;
                    gl[key] = function(...args) { draws[key]++; return original[key].apply(this, args); };
                }
                const samples = [];
                try {
                    for (let i = 0; i < 30; i++) {
                        const start = performance.now();
                        view.render(window.__worldSim.snapshot(G.player, 1, G.terrain, G.time), 1 / 60); app.render();
                        samples.push(performance.now() - start);
                    }
                } finally { for (const [key, fn] of Object.entries(original)) gl[key] = fn; }
                samples.sort((a, b) => a - b);
                return { samples: 30, manualRenderMs: { median: samples[14], p95: samples[28] }, drawCalls: draws,
                    rootObjects: count(view.root), layerObjects: Object.fromEntries(Object.entries(view.layers).map(([name, layer]) => [name, count(layer)])),
                    heapUsed: performance.memory?.usedJSHeapSize ?? null, renderer: app.renderer.type,
                    caveat: 'Static diagnostic costs under software Chromium; not real-device FPS. GPU completion is not forced.' };
            });
            await shot(page, stage.name, size, record);
            if (process.argv.includes('--rotate') && size === '844x390' && stage.name === '22-viken-lighthouse-high') {
                await page.setViewportSize({ width: 390, height: 844 });
                await page.waitForTimeout(500);
                const rotated = await page.evaluate(() => {
                    const api = window.__skoldhast, { G, view, app } = api.debug;
                    api.pause();
                    for (let i = 0; i < 90; i++) view.render(window.__worldSim.snapshot(G.player, 1, G.terrain, G.time), 1 / 60);
                    app.render();
                    const cam = { ...view.cam }, coverage = view.layers.terrainBack.children.find(node => node.label === 'landscape-ground')?.landscape?.coverage;
                    return { type: 'staged gallery after actual viewport rotation; reduced motion enabled', cam, coverage,
                        worldViewport: { x0: cam.x - innerWidth / (2 * cam.zoom), x1: cam.x + innerWidth / (2 * cam.zoom), y1: cam.y + innerHeight / (2 * cam.zoom) },
                        canvas: { width: app.screen.width, height: app.screen.height }, lessMotion: G.lessMotion };
                });
                assert.deepEqual(rotated.canvas, { width: 390, height: 844 }); assert.equal(rotated.lessMotion, true);
                if (process.argv.includes('--verify')) assert.ok(rotated.coverage.x0 <= rotated.worldViewport.x0 && rotated.coverage.x1 >= rotated.worldViewport.x1 && rotated.coverage.y1 >= rotated.worldViewport.y1, 'rotation retains painted scene coverage');
                await shot(page, stage.name + '-rotated', '390x844', rotated, '-rotation');
                await page.setViewportSize({ width, height }); await page.waitForTimeout(500);
                await page.evaluate(() => window.__skoldhast.pause());
            }
        }
        if (process.argv.includes('--tables')) {
            await page.evaluate(() => {
                const api = window.__skoldhast, { G, view } = api.debug;
                G.flags.add('ended'); G.flags.add('unfolded'); G.flags.add('conclusion'); G.evening = true;
                G.camHint = null; G.guidance = null;
                G.goto('land', 'start', { silent: true }); view.setScene('land');
                view.cam.snap = true;
                api.resume(); view.fx('epilogue', {});
            });
            await page.waitForSelector('.table-mode', { timeout: 10000 });
            await page.waitForTimeout(3500);
            const finale = await page.evaluate(() => {
                const { app } = window.__skoldhast.debug;
                const table = app.stage.children.find(node => node.label === 'story-table');
                const paper = table.children.find(node => node.label === 'story-paper');
                const picture = paper.children[0].children[1].getBounds();
                const caption = document.querySelector('.sk-caption.on').getBoundingClientRect();
                const rect = r => ({ x: r.x, y: r.y, width: r.width, height: r.height });
                return { type: 'staged ended state invoking production epilogue', caption: rect(caption), picture: rect(picture) };
            });
            assert.ok(finale.caption.x >= 0 && finale.caption.y >= 0 && finale.caption.x + finale.caption.width <= width && finale.caption.y + finale.caption.height <= height, 'finale caption fits viewport');
            await shot(page, '27-finale-table', size, finale);
        }
        await page.close();
    }
    assert.deepEqual(errors, [], 'no browser errors');
    console.log(`${records.length} staged visual captures; no browser errors`);
} finally { await browser.close(); server.close(); }
