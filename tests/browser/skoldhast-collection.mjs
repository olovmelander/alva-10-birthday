#!/usr/bin/env node
/*
 * Collection regression from an end save with no collected pencils. Chapter
 * travel is staged beside each discovery; actual DOM keyboard/stick/button
 * events feed input.mjs and the real fixed-step game for every pickup/colour.
 * Like the journey check, travel is accelerated, not skipped with flags.
 * Native browser taps/keys open the final regional notebook. This is not a
 * physical-device touch/performance test.
 *
 * node tests/browser/skoldhast-collection.mjs --viewport 844x390 --input keyboard
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { SCENES } from '../../skoldhast/src/content/world.mjs';
process.env.NO_TEST = '1';
const { COLLECTION_END_FLAGS, collectionStart } = await import('../skoldhast-collection-route.test.mjs');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a, []));
const [width, height] = (args.viewport || '844x390').split('x').map(Number);
const touchMode = args.input === 'touch', kind = touchMode ? 'touch' : 'keyboard';
const out = args.out || '/tmp/skoldhast-round2-collection';
fs.mkdirSync(out, { recursive: true });
const cases = Object.values(SCENES).flatMap(scene => (scene.pencils || []).map(pc => ({
    scene: scene.id, title: scene.title, pc, start: collectionStart(scene, pc),
    hop: (scene.hoppstallen || []).some(h => h.pencil === pc.id), total: scene.pencils.length
})));
const server = await serve(), browser = await launch();
try {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touchMode, isMobile: touchMode, deviceScaleFactor: 1 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.text().startsWith('collection:')) console.log(m.text()); });
    await page.addInitScript(flags => {
        localStorage.setItem('skoldhast.v1.index', JSON.stringify({ slots: ['alva'], last: 'alva' }));
        localStorage.setItem('skoldhast.v1.slot.alva', JSON.stringify({ v: 1, contentVersion: 1, label: 'Alva', flags,
            checkpoint: 'beachEnd', ended: true, settings: {}, puz: {}, note: '' }));
    }, [...COLLECTION_END_FLAGS, 'exp_djup', 'exp_djup_logged', 'exp_gom', 'exp_gom_logged',
        'tip_gallop', 'tip_swim', 'tip_dashed', 'tip_act', 'tip_hide', 'tip_journal']);
    await page.exposeFunction('collectionShot', async name => page.screenshot({ path: path.join(out, `${name}-${kind}-${width}x${height}.png`) }));
    await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
    await page.waitForSelector('.sk-title');
    await page.locator('.sk-title button', { hasText: /^Fortsätt$/ })[touchMode ? 'tap' : 'click']();
    await page.waitForFunction(() => window.__skoldhast.debug.G?.flags.has('ended') && window.__skoldhast.debug.G?.sceneId === 'land');
    const result = await page.evaluate(async ({ cases, touchMode }) => {
        const api = window.__skoldhast, { G, input, view, app, assets, ui, guide, story } = api.debug;
        const { snapshot, C, STEP } = await import('/skoldhast/src/sim.mjs');
        const { countPencils, pencilProgress } = await import('/skoldhast/src/puzzles.mjs');
        await Promise.all(assets.bundles().map(b => assets.load(b)));
        api.pause();
        // Production RAF releases held input while paused. This isolated
        // fixed-step driver owns those DOM inputs until it resumes the game.
        const release = input.release; input.release = () => {};
        const check = (yes, message) => { if (!yes) throw Error(message); };
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const zone = ui.stickZone;
        for (const node of [zone, ui.actBtn, ui.hideBtn]) node.setPointerCapture = () => {};
        const pointer = (node, type, x, y) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
            pointerId: 73, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
        const key = (name, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: name, bubbles: true, cancelable: true }));
        let kx = 0, ky = 0, stickOn = false, pulse = 0, steps = 0;
        function drive(ix, iy) {
            if (touchMode) {
                const r = zone.getBoundingClientRect(), x = r.x + r.width * .5, y = r.y + r.height * .5;
                if (!stickOn && (ix || iy)) { pointer(zone, 'pointerdown', x, y); stickOn = true; }
                if (stickOn) {
                    pointer(zone, 'pointermove', x + ix * 58, y + iy * 58);
                    if (!ix && !iy) { pointer(zone, 'pointerup', x, y); stickOn = false; }
                }
            } else {
                let x = Math.sign(ix), y = Math.sign(iy);
                if (G.player.mode === 'ground' && Math.abs(ix) < C.gallopDefl && G.player.vx * x > Math.abs(ix) / C.gallopDefl * 850) x = 0;
                if (G.player.mode === 'swim') {
                    const phase = pulse++ % 10 / 10;
                    if (Math.abs(ix) < .95 && phase >= Math.abs(ix)) x = 0;
                    if (Math.abs(iy) < .95 && phase >= Math.abs(iy)) y = 0;
                }
                if (x !== kx) { if (kx) key(kx < 0 ? 'ArrowLeft' : 'ArrowRight', false); if (x) key(x < 0 ? 'ArrowLeft' : 'ArrowRight', true); kx = x; }
                if (y !== ky) { if (ky) key(ky < 0 ? 'ArrowUp' : 'ArrowDown', false); if (y) key(y < 0 ? 'ArrowUp' : 'ArrowDown', true); ky = y; }
            }
        }
        function button(node, keyName) {
            if (touchMode) { const r = node.getBoundingClientRect(); pointer(node, 'pointerdown', r.x + r.width / 2, r.y + r.height / 2); pointer(node, 'pointerup', r.x + r.width / 2, r.y + r.height / 2); }
            else { document.activeElement?.blur(); key(keyName, true); key(keyName, false); }
        }
        function render() {
            if (G.sceneId !== view.sceneId) view.setScene(G.sceneId);
            view.render(snapshot(G.player, 0, G.terrain, G.time), STEP * 24);
            ui.setContext(G.context?.label, G.player.hidden);
            guide.goal(story.goal()); guide.show(!G.busy && !ui.dialogueOpen() && !ui.panelOpen()); guide.update();
        }
        const where = () => `${G.sceneId} (${(G.player.x / 200).toFixed(2)},${(G.player.y / 200).toFixed(2)}) ${G.player.mode} ${G.context?.id} ${story.running()}`;
        async function step(i = {}) {
            while (ui.dialogueOpen()) { render(); app.render(); await sleep(365); ui.advance(); }
            drive(i.x || 0, i.y || 0);
            if (i.act) button(ui.actBtn, ' ');
            const cont = input.state(), e = input.consume();
            G.step({ ...cont, act: e.act, hide: e.hide, tapHero: e.tapHero || e.neigh });
            await Promise.resolve();
            if (++steps % 24 === 0) render();
            if (steps % 600 === 0) await sleep(0);
        }
        async function until(pred, inp, seconds, label) {
            for (let i = 0; i < seconds / STEP; i++) { if (pred()) return; await step(typeof inp === 'function' ? inp() : inp); }
            check(pred(), `${label}: ${where()}`);
        }
        async function move(x, y, swimming) {
            if (swimming) await until(() => Math.hypot(G.player.x - x, G.player.y - y) < 40, () => {
                const dx = x - G.player.x, dy = y - G.player.y, len = Math.hypot(dx, dy) || 1, m = Math.min(1, len / 100);
                return { x: dx / len * m, y: dy / len * m };
            }, 45, 'swim approach');
            else await until(() => Math.abs(G.player.x - x) < 22 && Math.abs(G.player.vx) < 40 && G.player.mode === 'ground', () => {
                const dx = x - G.player.x;
                if (Math.abs(dx) < 22) return {};
                return { x: Math.sign(dx) * (Math.abs(dx) > 800 ? 1 : Math.min(.7, Math.max(.15, Math.abs(dx) / 440))) };
            }, 160, 'walk approach');
            drive(0, 0);
        }
        async function shot(name) {
            drive(0, 0); view.cam.snap = true; render(); app.render();
            await window.collectionShot(name);
        }
        const pickups = [], colours = [];
        G.on('pickup', e => pickups.push(e.id)); G.on('colorin', e => colours.push(e.id));
        for (const { scene, title, pc, start, hop, total } of cases) {
            drive(0, 0); G.goto(scene, start); view.setScene(scene); view.cam.snap = true; render();
            check(view.built(scene), `${scene}: no missing atlas frames`);
            check(!G.flags.has('penna_' + pc.id), `${pc.id}: not pre-collected`);
            check(document.querySelector('.sk-pencils').textContent.includes(`/${total}`), `${scene}: counter updates on entry`);
            check(document.querySelector('.sk-pencils').getAttribute('aria-label')?.includes(title), `${scene}: counter names region`);
            const badge = document.querySelector('.sk-pencils').getBoundingClientRect();
            const goal = document.querySelector('.sk-goal').getBoundingClientRect();
            check(badge.right <= goal.left || badge.left >= goal.right || badge.bottom <= goal.top || badge.top >= goal.bottom,
                `${scene}: the goal note cannot cover the regional counter`);
            await move(pc.x, pc.y, start.mode === 'swim');
            if (hop) { await step({ hop: true }); await until(() => G.flags.has('penna_' + pc.id), {}, 4, `${pc.id} perch hop`); }
            check(G.flags.has('penna_' + pc.id), `${pc.id}: contact pickup (${where()})`);
            await move(pc.propAt.x, pc.propAt.y - (start.mode === 'swim' ? 40 : 0), start.mode === 'swim');
            await until(() => G.context?.id === 'farglagg', {}, 5, `${pc.id} colour action`);
            render(); check(ui.actBtn.textContent === 'Färglägg', `${pc.id}: visible contextual label`);
            if (pc.id === 'p-kelp-shell') await shot('01-underwater-before');
            await step({ act: true });
            check(G.flags.has('color_' + pc.id), `${pc.id}: button colours its prop`);
            await step({});
            if (pc.id === 'p-kelp-shell') await shot('02-underwater-after');
            console.log('collection:', pc.id);
        }
        drive(0, 0);
        check(countPencils(G) === 15 && pickups.length === 15 && colours.length === 15, 'fifteen real pickups and colour actions');
        const regions = pencilProgress(G);
        check(regions.every(r => r.found === r.total), 'all regional collections complete');
        input.release = release; release(); api.resume();
        return { regions, pickups, colours, steps };
    }, { cases, touchMode });
    await page.locator('.sk-journal-btn')[touchMode ? 'tap' : 'click']();
    await page.waitForSelector('.sk-panel.on');
    await page.locator('.sk-j-tab').nth(6)[touchMode ? 'tap' : 'click']();
    await page.waitForFunction(() => document.querySelector('.sk-j-tab[aria-selected="true"]')?.classList.contains('t6') && !document.querySelector('.sk-j-flip'));
    const rows = await page.locator('.sk-j-pencil-regions').textContent();
    for (const region of result.regions) assert.ok(rows.includes(`${region.title}: ${region.total} / ${region.total}`), rows);
    await page.locator('.sk-j-pencil-regions').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `03-regional-notebook-${kind}-${width}x${height}.png`) });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, `collection-${kind}-${width}x${height}.json`), JSON.stringify({ ...result, errors }, null, 2));
    console.log(`all15 collection and regional notebook work: ${kind} ${width}x${height}`);
} finally { await browser.close(); server.close(); }
