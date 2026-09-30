#!/usr/bin/env node
// Reader-paced map → world cause/consequence with real dialogue, textured
// deformation, phone/desktop framing and lifecycle checks. Optional --out DIR.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
const oi = process.argv.indexOf('--out'), out = oi < 0 ? null : process.argv[oi + 1];
const raceOnly = process.argv.includes('--race-only');
if (out) fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch(), errors = [];
try {
    for (const mode of raceOnly ? ['844x390'] : ['844x390', '390x844', '1440x900', '390x844-reduced']) {
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
        }, mode.endsWith('reduced'));
        if (mode === '844x390') {
            const races = await page.evaluate(async () => {
                const { assets, view, app } = window.__skoldhast.debug;
                await assets.load('map');
                const load = assets.load, releases = [];
                assets.load = function(name, ...args) {
                    return name === 'map' ? new Promise(resolve => releases.push(resolve)) : load.call(this, name, ...args);
                };
                const settle = () => new Promise(resolve => setTimeout(resolve, 0));
                const start = record => {
                    void view.fx('foldDemo', { x: 105.2 * 200, y: -.39 * 200,
                        whileVisible: () => { record.called = true; return new Promise(() => {}); }
                    }).then(() => { record.resumed = true; });
                };
                const attached = () => view.layers.fx.children.some(c => c.label === 'fold-demo');
                try {
                    const canceled = { called: false, resumed: false };
                    start(canceled);
                    view.setScene('kelp'); view.setScene('land'); releases.shift()();
                    await settle();
                    const abandoned = { ...canceled, active: view.foldDemo, attached: attached() };

                    const rebuilt = { called: false, resumed: false };
                    start(rebuilt); view.setScene('land', { keepCam: true }); releases.shift()();
                    await settle();
                    const sameScene = { ...rebuilt, attached: attached() };
                    view.setScene('kelp'); view.setScene('land');

                    const first = { called: false, resumed: false }, second = { called: false, resumed: false };
                    start(first); start(second); releases.shift()(); releases.shift()();
                    await settle();
                    const latest = { first: { ...first }, second: { ...second }, attached: attached() };
                    view.setScene('kelp'); view.setScene('land');

                    const mapAttached = () => view.root.children.some(layer => layer.children?.some(c => c.label === 'map-assemble'));
                    const mapClass = () => app.canvas.parentElement.classList.contains('sk-map-scene');
                    const mapLeases = [];
                    const startMap = record => {
                        void view.fx('mapAssemble', { whileVisible: () => {
                            record.called = true;
                            return new Promise(resolve => mapLeases.push(resolve));
                        } }).then(() => { record.resumed = true; });
                    };
                    const canceledMap = { called: false, resumed: false };
                    startMap(canceledMap);
                    view.setScene('kelp'); view.setScene('land'); releases.shift()();
                    await settle();
                    const mapAbandoned = { ...canceledMap, active: view.mapAssembly, attached: mapAttached(), suppressed: mapClass() };

                    const rebuiltMap = { called: false, resumed: false };
                    startMap(rebuiltMap); view.setScene('land', { keepCam: true }); releases.shift()();
                    await settle();
                    const mapSameScene = { ...rebuiltMap, attached: mapAttached(), suppressed: mapClass() };
                    const heldMap = view.mapAssembly;
                    view.setScene('land', { keepCam: true });
                    const mapActiveRebuild = { unchanged: JSON.stringify(view.mapAssembly) === JSON.stringify(heldMap), attached: mapAttached(), suppressed: mapClass() };
                    view.setScene('kelp'); view.setScene('land'); mapLeases.shift()();
                    await settle();
                    const mapAfterCancel = { ...rebuiltMap, active: view.mapAssembly, attached: mapAttached(), suppressed: mapClass() };

                    const firstMap = { called: false, resumed: false }, secondMap = { called: false, resumed: false };
                    startMap(firstMap); startMap(secondMap); releases.shift()(); releases.shift()();
                    await settle();
                    const mapLatest = { first: { ...firstMap }, second: { ...secondMap }, attached: mapAttached(), suppressed: mapClass() };
                    view.setScene('kelp'); view.setScene('land'); mapLeases.shift()();
                    await settle();
                    const mapLatestCanceled = { resumed: secondMap.resumed, attached: mapAttached(), suppressed: mapClass() };
                    return { abandoned, sameScene, latest, mapAbandoned, mapSameScene, mapActiveRebuild, mapAfterCancel, mapLatest, mapLatestCanceled };
                } finally { assets.load = load; }
            });
            assert.deepEqual(races.abandoned, { called: false, resumed: false, active: null, attached: false },
                'leaving and returning while map loads cannot revive the abandoned story');
            assert.deepEqual(races.sameScene, { called: true, resumed: false, attached: true },
                'an atlas rebuild while map loads preserves the current request');
            assert.deepEqual(races.latest, { first: { called: false, resumed: false }, second: { called: true, resumed: false }, attached: true },
                'only the most recent pending experiment may attach');
            assert.deepEqual(races.mapAbandoned, { called: false, resumed: false, active: null, attached: false, suppressed: false },
                'abandoned map scene never attaches or suppresses toasts after its delayed art arrives');
            assert.deepEqual(races.mapSameScene, { called: true, resumed: false, attached: true, suppressed: true },
                'a same-scene atlas rebuild preserves a pending map scene');
            assert.deepEqual(races.mapActiveRebuild, { unchanged: true, attached: true, suppressed: true },
                'an active map scene and its toast suppression survive a same-scene rebuild');
            assert.deepEqual(races.mapAfterCancel, { called: true, resumed: false, active: null, attached: false, suppressed: false },
                'canceling a held map restores toasts and cannot resume its abandoned callback');
            assert.deepEqual(races.mapLatest, { first: { called: false, resumed: false }, second: { called: true, resumed: false }, attached: true, suppressed: true },
                'only the most recent pending map scene may attach and suppress toasts');
            assert.deepEqual(races.mapLatestCanceled, { resumed: false, attached: false, suppressed: false },
                'the last map lease also restores toast visibility when canceled');
            console.log('fold/map scenes: deferred-load cancellation, rebuild, latest-request and toast-suppression races passed');
            if (raceOnly) { await page.close(); continue; }
        }
        async function start() {
            await page.evaluate(() => {
                const { view } = window.__skoldhast.debug;
                window.__foldCompleted = false; window.__foldControl = null;
                void view.fx('foldDemo', { x: 105.2 * 200, y: -.39 * 200,
                    whileVisible: async control => {
                        window.__foldControl = control;
                        await new Promise(resolve => { window.__foldFinish = resolve; });
                    }
                }).then(() => { window.__foldCompleted = true; });
            });
            await page.waitForFunction(() => !!window.__foldControl);
        }
        async function render(dt = 0, geometry = false) {
            return page.evaluate(({ dt, geometry }) => {
                const { G, view, app } = window.__skoldhast.debug;
                view.render(window.__foldSim.snapshot(G.player, 1, G.terrain, G.time), dt);
                app.render();
                const effect = view.layers.fx.children.find(c => c.label === 'fold-demo'), b = effect?.getBounds();
                const meshes = [];
                function visit(node) {
                    if (node.geometry?.getBuffer) {
                        const data = node.geometry.getBuffer('aPosition')?.data;
                        if (data) meshes.push({ label: node.label, vertices: [...data] });
                    }
                    for (const child of node.children || []) visit(child);
                }
                if (effect && geometry) visit(effect);
                const beach = view.layers.objects.children.find(c => c.label === 'fold-demo-beach');
                if (beach && geometry) visit(beach);
                const d = document.querySelector('.sk-dialogue.on')?.getBoundingClientRect();
                return { ...view.foldDemo, meshes,
                    screen: b && { x: b.x, y: b.y, width: b.width, height: b.height },
                    dialog: d && { x: d.x, y: d.y, width: d.width, height: d.height }, width: app.screen.width, height: app.screen.height };
            }, { dt, geometry });
        }
        function fitted(state, name, reading = false) {
            const b = state.screen, d = state.dialog, e = 1;
            assert.ok(b, `${mode} ${name}: demonstration is visible`);
            assert.ok(b.x >= -e && b.x + b.width <= state.width + e, `${mode} ${name}: entire demonstration horizontally visible`);
            assert.ok(b.y >= -e && b.y + b.height <= state.height + e, `${mode} ${name}: entire demonstration vertically visible`);
            if (reading && d) assert.ok(b.x + b.width <= d.x || b.x >= d.x + d.width || b.y + b.height <= d.y || b.y >= d.y + d.height,
                `${mode} ${name}: dialogue leaves both pictures visible`);
        }
        async function capture(name) {
            if (out) await sharp(await page.screenshot()).webp({ quality: 90 }).toFile(path.join(out, `${mode}-${name}.webp`));
        }
        async function stage(name) {
            await page.evaluate(name => {
                window.__foldStageDone = false;
                void window.__foldControl[name]().then(() => { window.__foldStageDone = true; });
            }, name);
            const state = await render(3);
            await page.waitForFunction(() => window.__foldStageDone);
            return state;
        }
        async function reading(text, phase, map, world, name) {
            await page.evaluate(text => {
                window.__foldDialogueDone = false;
                void window.__skoldhast.debug.ui.say([['klo', text]]).then(() => { window.__foldDialogueDone = true; });
            }, text);
            await page.waitForSelector('.sk-dialogue.on');
            await page.evaluate(() => new Promise(requestAnimationFrame));
            const state = await render(.1, true);
            await capture(name);
            fitted(state, name, true);
            assert.equal(state.phase, phase); assert.equal(state.map, map); assert.equal(state.world, world);
            const held = await render(20);
            assert.equal(held.phase, phase, `${mode} ${name}: the picture waits for the reader`);
            assert.equal(held.map, map); assert.equal(held.world, world);
            assert.equal(await page.evaluate(() => window.__foldDialogueDone), false);
            await page.waitForFunction(() => {
                const { ui } = window.__skoldhast.debug;
                if (ui.dialogueOpen()) ui.advance();
                return window.__foldDialogueDone;
            });
            return state;
        }
        await start();
        await stage('arrive');
        const observe = await reading('Titta på snäckan. Samma snäcka finns på kartan och här på stranden.', 'observe', 0, 0, 'observe');
        await page.evaluate(() => { void window.__foldControl.fold(); });
        let mapFirst = null;
        for (let i = 0; i < 30; i++) {
            const s = await render(.08);
            if (s.map >= .98 && s.world === 0) { mapFirst = s; break; }
        }
        assert.ok(mapFirst, `${mode}: the map changes before the beach`);
        fitted(mapFirst, 'map first'); await capture('map-first'); await render(3);
        const compare = await reading('Oj! Stranden vek sig också. Titta, snäckan följde med!', 'compare', 1, 1, 'compare');
        for (const label of ['fold-map-ink', 'fold-beach-ink']) {
            const flat = observe.meshes.find(mesh => mesh.label === label);
            const folded = compare.meshes.find(mesh => mesh.label === label);
            assert.ok(flat && folded, `${mode}: ${label} paints the actual drawing`);
            assert.notDeepEqual(folded.vertices, flat.vertices, `${mode}: ${label} travels with its fold`);
        }
        await page.evaluate(() => { void window.__foldControl.unfold(); });
        let mapRestored = null;
        for (let i = 0; i < 30; i++) {
            const s = await render(.08);
            if (s.map === 0 && s.world >= .98) { mapRestored = s; break; }
        }
        assert.ok(mapRestored, `${mode}: the map opens before its beach`);
        await capture('map-restored'); await render(3);
        const restored = await reading('Nu är stranden hel igen. När kartan ändras, ändras världen!', 'restored', 0, 0, 'restored');
        assert.deepEqual(restored.meshes, observe.meshes, `${mode}: both drawings return exactly to their original geometry`);
        await stage('depart');
        await page.evaluate(() => { window.__foldFinish(); });
        await page.waitForFunction(() => window.__foldCompleted);
        const end = await page.evaluate(async () => {
            const { G, view } = window.__skoldhast.debug;
            view.render(window.__foldSim.snapshot(G.player, 1, G.terrain, G.time), 1);
            await Promise.resolve(); await Promise.resolve();
            return { done: window.__foldCompleted, active: view.foldDemo, restored: G.camHint === window.__foldBeforeHint,
                unchanged: window.__foldBefore === JSON.stringify({ flags: [...G.flags], player: G.player, actors: G.actors }) };
        });
        assert.deepEqual(end, { done: true, active: null, restored: true, unchanged: true });
        await start(); await stage('arrive'); await stage('fold');
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
        fitted(await render(), 'rebuilt after rotation');
        await capture('rotated-rebuilt');
        const abandoned = await page.evaluate(async () => {
            const { view } = window.__skoldhast.debug;
            view.setScene('kelp'); window.__foldFinish();
            await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
            return { active: view.foldDemo, resumed: window.__foldCompleted };
        });
        assert.deepEqual(abandoned, { active: null, resumed: false });
        await page.setViewportSize({ width, height });
        await page.waitForFunction(w => window.__skoldhast.debug.app.screen.width === w, width);
        await page.evaluate(() => {
            const { G, view } = window.__skoldhast.debug;
            G.goto('kelp', { x: 36.5 * 200, y: 8.4 * 200, mode: 'swim' }, { silent: true });
            view.setScene('kelp');
            window.__mapCompleted = false; window.__mapControl = null;
            void view.fx('mapAssemble', { whileVisible: async control => {
                window.__mapControl = control;
                await new Promise(resolve => { window.__mapFinish = resolve; });
            } }).then(() => { window.__mapCompleted = true; });
        });
        await page.waitForFunction(() => !!window.__mapControl);
        for (const [action, name] of [['arrive', 'separate'], ['join', 'joined'], ['reveal', 'route']]) {
            const state = await page.evaluate(async action => {
                const { G, view, app } = window.__skoldhast.debug;
                void window.__mapControl[action]();
                view.render(window.__foldSim.snapshot(G.player, 1, G.terrain, G.time), 2); app.render();
                await Promise.resolve();
                const b = view.mapAssembly.bounds;
                return { ...view.mapAssembly, fitted: b.x >= 0 && b.x + b.width <= app.screen.width && b.y >= 0 && b.y + b.height <= app.screen.height };
            }, action);
            assert.equal(state.fitted, true, `${mode}: map assembly fits`);
            if (name === 'joined') { assert.equal(state.joined, 1); assert.equal(state.route, 0); }
            if (name === 'route') assert.equal(state.route, 1);
            await capture(`assembly-${name}`);
        }
        const mapRebuilt = await page.evaluate(() => {
            const { view } = window.__skoldhast.debug, before = view.mapAssembly;
            view.setScene('kelp', { keepCam: true });
            return { before, after: view.mapAssembly };
        });
        assert.deepEqual(mapRebuilt.after, mapRebuilt.before, `${mode}: late atlas rebuild preserves joined map`);
        const assembled = await page.evaluate(async () => {
            const { G, view } = window.__skoldhast.debug;
            void window.__mapControl.depart();
            view.render(window.__foldSim.snapshot(G.player, 1, G.terrain, G.time), 1);
            window.__mapFinish();
            await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
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
        console.log(`fold demo: ${mode} passed`);
    }
    assert.deepEqual(errors, []);
    if (!raceOnly) console.log('fold demo: reader-paced textured folds, ordered restoration, dialogue framing, desktop/phone/reduced motion, rotation, rebuild and cancellation pass');
} finally { await browser.close(); server.close(); }
