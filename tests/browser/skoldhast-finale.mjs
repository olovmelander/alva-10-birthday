#!/usr/bin/env node
/*
 * Browser check of the ending through the real UI (plan §3.4 final, §8.8): word code 2 →
 * Spegelviken, then (via the debug hooks) the state just before the window; the shell drifts
 * the sea half of P8, Alva's pencil draws the last stroke, PLASK, the gallop over the steppes,
 * Klo's conclusion, the table at dusk and the journal. Screenshots go to --out (a folder).
 *
 *   node tests/browser/skoldhast-finale.mjs [--out dir] [--viewport 844x390] [--less-motion]
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const out = args.out || null;
const [W, H] = String(args.viewport || '844x390').split('x').map(Number);
const lessMotion = process.argv.includes('--less-motion');
if (out) fs.mkdirSync(out, { recursive: true });

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const pg = await ctx.newPage();
const errors = [];
pg.on('pageerror', (e) => errors.push(e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
let n = 0;
const shot = async (name) => { if (out) await pg.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
const state = () => pg.evaluate(() => {
    const d = window.__skoldhast.debug;
    return { scene: d.G?.sceneId, flags: d.G ? [...d.G.flags] : [], dlg: d.ui?.dialogueOpen(), panel: d.ui?.panelOpen(), draw: !!document.querySelector('.sk-draw.on'), busy: d.G?.busy, x: d.G?.player.x / 200, mode: d.G?.player.mode, vista: d.view?.vista?.phase, viewScene: d.view?.sceneId };
});
/** Tap through dialogues and panels until pred(state) holds. */
async function playUntil(pred, maxMs, label) {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs) {
        const s = await state();
        if (pred(s)) return s;
        if (s.draw) {
            await shot('draw');
            await pg.keyboard.press('Enter'); // keyboard confirms the anchors
        } else if (s.dlg) {
            await pg.keyboard.press('Space');
        } else if (s.panel) {
            await shot('panel');
            // close whatever panel is open (the chapter report, the journal)
            await pg.evaluate(() => { const b = [...document.querySelectorAll('.sk-panel button')].find((q) => /Stäng|Fortsätt|Tillbaka|Klar|OK/i.test(q.textContent)); (b || document.querySelector('.sk-panel button'))?.click(); });
        }
        await pg.waitForTimeout(250);
    }
    throw new Error(`timed out: ${label}\n${JSON.stringify(await state())}`);
}

await pg.goto(`${base}/skoldhast/dev/play.html?debug`, { waitUntil: 'load' });
await pg.waitForSelector('.sk-title');
await shot('title');
await pg.getByText('Jag har en kod').click();
await pg.fill('.sk-code-input', 'fyr fjun klo');
await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
await playUntil((s) => s.scene === 'viken' && s.flags.includes('b:k3_arrive') && !s.busy, 30000, 'arrive in Spegelviken');
await shot('viken');
await pg.evaluate((less) => { window.__skoldhast.debug.G.lessMotion = less; }, lessMotion);
// jump to just before the window: P7 and the talks done, the land half of P8 inked
await pg.evaluate(() => {
    const { G } = window.__skoldhast.debug;
    for (const f of ['shutter1', 'shutter2', 'shutter3', 'lamp_lit', 'b:k3_lamp', 'kv_met', 'talk1', 'b:k3_talk1', 'talk2', 'talk_done', 'b:k3_line', 'p8_s1', 'p8_s2', 'p8_s3', 'p8_land']) G.flags.add(f);
    G.terrain.refresh();
    Object.assign(G.actors.kv, { scene: 'viken', x: 23.2 * 200, y: -0.62 * 200, visible: true, pose: 'stand', facing: -1 });
    G.goto('viken', { x: 25.7 * 200, y: 1.0 * 200, mode: 'swim', facing: 1 });
});
await pg.waitForTimeout(400);
await pg.keyboard.press('g'); // Göm dig: the shell drifts the dashed lane to the window
await playUntil((s) => s.flags.includes('p8_done'), 30000, 'the last stroke');
await shot('last-stroke');
await playUntil((s) => s.flags.includes('final_run') && s.scene === 'land', 30000, 'PLASK');
await pg.waitForTimeout(1500);
await shot('plask');
await playUntil((s) => s.flags.includes('final_run') && s.x < 60, 60000, 'the gallop over the steppes');
await shot('final-gallop');
await playUntil((s) => s.vista === 'holding', 90000, 'the lit lighthouse and its reflection');
await pg.evaluate(() => window.__skoldhast.pause());
const vista = await pg.evaluate(() => {
    const { G, view } = window.__skoldhast.debug, v = view.vista;
    const bounds = (s) => { const b = s.getBounds(); return { x0: b.minX, x1: b.maxX, y0: b.minY, y1: b.maxY }; };
    return { scene: G.sceneId, viewScene: view.sceneId, evening: G.evening, hidden: G.hideHero, phase: v.phase, controlsOff: document.querySelector('.sk-controls').classList.contains('off'),
        lamp: { alpha: v.lamp.alpha, bounds: bounds(v.lamp) }, reflection: { alpha: v.reflection._inner.alpha, bounds: bounds(v.reflection._lamp) },
        x: G.player.x, y: G.player.y, checkpoint: G.checkpoint, flags: [...G.flags].sort(), time: G.time };
});
assert.equal(vista.scene, 'land', 'the player stays on Klippudden during the distant view');
assert.equal(vista.viewScene, 'viken');
assert.equal(vista.evening, true);
assert.equal(vista.hidden, true);
assert.equal(vista.controlsOff, true, 'the quiet view has no play controls over it');
assert.ok(vista.lamp.alpha > 0.8, 'the real lighthouse lamp is lit');
assert.ok(vista.reflection.alpha > 0.55, 'the reflected lamp is visible in calm water');
for (const [name, { bounds: b }] of Object.entries({ lamp: vista.lamp, reflection: vista.reflection })) {
    assert.ok(b.x0 > 0 && b.x1 < W && b.y0 > 0 && b.y1 < H, `${name} fits the ${W}×${H} view: ${JSON.stringify(b)}`);
}
assert.ok(vista.lamp.bounds.y1 < H / 2 && vista.reflection.bounds.y0 > H / 2, 'the two lights sit on opposite sides of the waterline');
await shot('lighthouse-lit-reflection');
await pg.evaluate(() => window.__skoldhast.resume());
await playUntil((s) => s.dlg && s.viewScene === 'land' && !s.vista, 30000, 'Klo back on Klippudden');
const returned = await pg.evaluate(() => {
    const { G, view } = window.__skoldhast.debug;
    return { scene: G.sceneId, hidden: !!G.hideHero, vista: !!G.vista, checkpoint: G.checkpoint, flags: [...G.flags].sort(),
        x: G.player.x, y: G.player.y, time: G.time, klo: { ...G.actors.klo, walk: null }, camera: { x: view.cam.x, y: view.cam.y } };
});
assert.equal(returned.scene, 'land');
assert.equal(returned.hidden, false);
assert.equal(returned.vista, false);
assert.equal(returned.checkpoint, vista.checkpoint, 'a vista never moves the checkpoint');
assert.deepEqual(returned.flags, vista.flags, 'a vista does not complete or collect anything');
assert.ok(Math.hypot(returned.x - vista.x, returned.y - vista.y) < 2, 'the hero remains on the landing');
assert.ok(returned.time - vista.time >= 1.7, 'the whole quiet lighthouse hold plays before the conclusion');
assert.equal(returned.klo.scene, 'land');
assert.equal(returned.klo.visible, true);
assert.equal(returned.klo.pose, 'sign-folded');
assert.ok(returned.x - returned.klo.x >= 300, 'Klo stands beside the hero instead of under the hooves');
await shot('klo-klippudden');
await playUntil((s) => s.flags.includes('conclusion'), 90000, 'the conclusion');
await playUntil((s) => !!document, 1, 'noop').catch(() => {});
await pg.waitForTimeout(2500);
await shot('epilogue');
await playUntil((s) => s.flags.includes('ended'), 60000, 'the end');
await pg.waitForTimeout(1500);
await shot('after');
const fin = await state();
assert.equal(fin.scene, 'land');
assert.ok(!fin.flags.includes('final_run'));
assert.ok(Math.abs(fin.x - 108.6) < 1.5, `back on her beach after the epilogue (x=${fin.x})`);
assert.deepEqual(errors, []);
console.log('the ending plays through the real UI');
await browser.close();
server.close();
