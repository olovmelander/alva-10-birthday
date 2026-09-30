#!/usr/bin/env node
// Real scene checks: found paper, its shared ink, and the keeper's stationary table.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const oi = process.argv.indexOf('--out'), out = oi < 0 ? null : process.argv[oi + 1];
if (out) fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch(), errors = [], records = [];
try {
    for (const [width, height] of [[1280, 800], [844, 390], [390, 844]]) {
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.waitForSelector('.sk-title');
        await page.getByText('Jag har en kod').click();
        await page.fill('.sk-code-input', 'fyr fjun klo');
        await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await page.waitForFunction(() => {
            const d = window.__skoldhast.debug;
            if (d.ui.dialogueOpen()) d.ui.advance();
            return d.G?.sceneId === 'viken' && d.view.built('viken') && !d.G.busy && !d.story.running();
        }, null, { timeout: 60000 });
        await page.evaluate(async () => {
            window.__skoldhast.pause();
            const { G, assets, guide } = window.__skoldhast.debug;
            await Promise.all(['map', 'land', 'sea', 'bay'].map(bundle => assets.load(bundle)));
            window.__mapPropSim = await import('/skoldhast/src/sim.mjs');
            G.story = null; G.busy = 0; guide.show(false);
        });
        async function capture(name) {
            const state = await page.evaluate(name => {
                const { G, view, app, assets } = window.__skoldhast.debug;
                const { snapshot } = window.__mapPropSim;
                const find = (node, label) => node.label === label ? node : node.children?.map(child => find(child, label)).find(Boolean);
                for (const actor of Object.values(G.actors)) Object.assign(actor, { visible: false, walk: null, pop: 0 });
                for (const flag of ['mark_land', 'mark_sea', 'clue_mark_sea', 'p6_flat', 'talk_done']) G.flags.delete(flag);
                G.flags.add('ch2_open'); G.flags.add('p5_lit'); G.flags.add('lamp_lit');
                G.camHint = null; G.hideHero = false; G.lessMotion = true;
                let target, targetScene;
                if (name === 'land') {
                    targetScene = 'land'; target = G.scenes.land.spots.landmark;
                    G.goto('land', { x: target.x - 180, y: target.y, facing: 1 }, { silent: true });
                } else if (name === 'sea') {
                    targetScene = 'kelp'; target = G.scenes.kelp.corners[0];
                    G.goto('kelp', { x: target.x - 240, y: target.y - 30, mode: 'swim', facing: 1 }, { silent: true });
                    G.flags.add('p6_flat');
                } else {
                    targetScene = 'viken';
                    const pier = G.scenes.viken.spots.kvPier, gallery = G.scenes.viken.spots.kvGallery;
                    target = name === 'gallery' ? gallery : pier;
                    G.goto('viken', { x: target.x - 290, y: target.y, facing: 1 }, { silent: true });
                    Object.assign(G.actors.kv, { scene: 'viken', visible: true, x: target.x, y: target.y,
                        facing: -1, pose: name === 'gallery' ? 'worry' : 'point' });
                    if (name === 'gallery') delete G.actors.kv.map;
                    else G.actors.kv.map = name === 'closed' ? 'closed' : 'open';
                    if (name === 'shore') G.flags.add('talk_done');
                }
                view.setScene(targetScene); view.cam.snap = true;
                for (let i = 0; i < 3; i++) view.render(snapshot(G.player, 1, G.terrain, G.time), 1 / 60);
                const fragment = name === 'land' || name === 'sea' ? find(view.root, `map-fragment-${name}`) : null;
                if (name === 'sea') {
                    // The freed paper rests on the seabed below the vortex eye.
                    G.player.x = fragment.x - 230; G.player.y = fragment.y - 30;
                    view.cam.snap = true;
                    for (let i = 0; i < 3; i++) view.render(snapshot(G.player, 1, G.terrain, G.time), 1 / 60);
                }
                app.render();
                const table = view.layers.objects.children.find(child => child.texture === assets.tex('map-open') || child.texture === assets.tex('map-closed'));
                const paper = find(view.root, 'guardian-map-paper');
                const ink = fragment && find(fragment, 'map-fragment-ink');
                const b = fragment?.getBounds();
                return { name, scene: view.sceneId, zoom: view.cam.zoom, width: app.screen.width, height: app.screen.height,
                    fragment: fragment && { visible: fragment.visible, actualMap: ink?.texture === assets.tex('map-page'),
                        bounds: { x: b.x, y: b.y, width: b.width, height: b.height } },
                    table: table && { visible: table.visible, x: table.x, y: table.y },
                    paper: paper && { visible: paper.visible, mirrored: paper.scale.x < 0,
                        shore: find(paper, 'guardian-map-shore')?.visible } };
            }, name);
            records.push({ size: `${width}x${height}`, ...state });
            if (out) await sharp(await page.screenshot()).webp({ quality: 91 }).toFile(path.join(out, `${name}-${width}x${height}.webp`));
            return state;
        }
        for (const name of ['land', 'sea']) {
            const s = await capture(name), b = s.fragment?.bounds;
            assert.equal(s.fragment?.visible, true, `${name}: paper is available to collect`);
            assert.equal(s.fragment?.actualMap, true, `${name}: exactly the shared map drawing`);
            assert.ok(b.width >= 44 && b.width < width / 2, `${name}: useful collectible size at gameplay zoom`);
            assert.ok(b.x >= 0 && b.x + b.width <= width && b.y >= 0 && b.y + b.height <= height,
                `${name}: collectible remains on screen beside the player`);
            const gone = await page.evaluate(name => {
                const { G, view } = window.__skoldhast.debug;
                const find = (node, label) => node.label === label ? node : node.children?.map(child => find(child, label)).find(Boolean);
                G.flags.add(name === 'land' ? 'mark_land' : 'clue_mark_sea');
                view.render(window.__mapPropSim.snapshot(G.player, 1, G.terrain, G.time), 0);
                return find(view.root, `map-fragment-${name}`).visible;
            }, name);
            assert.equal(gone, false, `${name}: collection removes the displayed paper`);
        }
        const gallery = await capture('gallery');
        assert.equal(gallery.table.visible, false, 'no table is conjured on the lighthouse gallery');
        const closed = await capture('closed');
        assert.equal(closed.table.visible, true); assert.equal(closed.paper.visible, false);
        const open = await capture('open');
        assert.equal(open.paper.visible, true); assert.equal(open.paper.mirrored, false); assert.equal(open.paper.shore, false);
        const shore = await capture('shore');
        assert.equal(shore.paper.shore, true);
        const moved = await page.evaluate(() => {
            const { G, view, assets } = window.__skoldhast.debug;
            G.actors.kv.x += 330; G.actors.kv.y -= 100;
            view.render(window.__mapPropSim.snapshot(G.player, 1, G.terrain, G.time), 0);
            const table = view.layers.objects.children.find(child => child.texture === assets.tex('map-open'));
            return { visible: table.visible, x: table.x, y: table.y };
        });
        assert.deepEqual(moved, shore.table, 'the table remains anchored to the pier while its owner moves');
        await page.close();
        console.log(`map props: ${width}x${height} passed`);
    }
    assert.deepEqual(errors, []);
    if (out) fs.writeFileSync(path.join(out, 'states.json'), JSON.stringify({ records, errors }, null, 2));
} finally { await browser.close(); server.close(); }
