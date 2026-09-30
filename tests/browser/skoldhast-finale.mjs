#!/usr/bin/env node
/* Real UI: drift to the folded coast, trace it, watch the wave, return home.
 * node tests/browser/skoldhast-finale.mjs [--out dir] [--viewport 844x390]
 *   [--less-motion] [--rotate] [--resume drawn|unfolded]
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a, []));
const out = args.out;
const [W, H] = String(args.viewport || '844x390').split('x').map(Number);
if (out) fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch();
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true });
const pg = await context.newPage(), errors = [];
pg.on('pageerror', e => errors.push(e.stack || e.message));
pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
let n = 0;
const shot = async name => { if (out) await pg.screenshot({ path: out + '/' + String(++n).padStart(2, '0') + '-' + name + '.png' }); };
const state = () => pg.evaluate(() => {
    const { G, ui, view } = window.__skoldhast.debug;
    return { scene: G?.sceneId, flags: [...G.flags], dlg: ui.dialogueOpen(), panel: ui.panelOpen(),
        draw: !!document.querySelector('.sk-draw.on'), ending: !!document.querySelector('.sk-ending'),
        table: ui.root.classList.contains('table-mode'), busy: G.busy, x: G.player.x / 200, y: G.player.y / 200,
        hidden: G.player.hidden, lane: G.player.inLane?.id,
        checkpoint: G.checkpoint, trial: view.shoreTrial, vista: !!view.vista,
        dialogue: document.querySelector('.sk-dialogue')?.textContent };
});
async function playUntil(pred, label, maxMs = 40000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
        const s = await state();
        if (pred(s)) return s;
        assert.equal(s.draw, false, 'unexpected drawing while waiting for ' + label);
        if (s.dlg) await pg.keyboard.press('Space');
        else if (s.panel && !s.ending) await pg.evaluate(() => window.__skoldhast.debug.ui.closePanel());
        await pg.waitForTimeout(180);
    }
    throw Error('timed out: ' + label + JSON.stringify(await state()));
}
try {
    await pg.goto('http://127.0.0.1:' + server.address().port + '/skoldhast/dev/play.html?debug', { waitUntil: 'load' });
    await pg.getByText('Jag har en kod').click();
    await pg.fill('.sk-code-input', 'fyr fjun klo');
    await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
    await playUntil(s => s.scene === 'viken' && s.flags.includes('b:k3_arrive') && !s.busy, 'Spegelviken');
    await pg.evaluate(({ less, resume }) => {
        const { G } = window.__skoldhast.debug;
        G.lessMotion = less;
        for (const f of ['shutter1', 'shutter2', 'shutter3', 'lamp_lit', 'b:k3_lamp', 'kv_met', 'talk1', 'b:k3_talk1', 'talk2', 'talk_done', 'b:k3_line', 'p8_s1', 'p8_s2', 'p8_s3', 'p8_land']) G.flags.add(f);
        Object.assign(G.actors.kv, { scene: 'viken', x: 23.2 * 200, y: -.62 * 200, visible: true, pose: 'stand', facing: -1 });
        G.terrain.refresh();
        if (resume) {
            G.flags.add('p8_sea'); G.flags.add('p8_done');
            if (resume === 'unfolded') G.flags.add('unfolded');
            G.checkpoint = 'lineWindow';
            G.goto('viken', { ...G.sceneDef.spots.window, mode: 'swim', facing: 1 });
        } else G.goto('viken', { x: 25.7 * 200, y: 200, mode: 'swim', facing: 1 });
    }, { less: process.argv.includes('--less-motion'), resume: args.resume });
    if (!args.resume) {
        await pg.waitForTimeout(400); await pg.keyboard.press('g');
        await playUntil(s => s.draw, 'Alva’s interrupted coast');
        await pg.waitForTimeout(250);
        await shot('coast-drawing');
        // Asset arrivals must not abandon an awaited drawing or its experiment.
        await pg.evaluate(() => { const { view, G } = window.__skoldhast.debug; view.setScene(G.sceneId, { keepCam: true }); });
        if (process.argv.includes('--rotate')) {
            await pg.setViewportSize({ width: H, height: W });
            await pg.waitForTimeout(350); await shot('coast-rotated');
        }
        const s = await state(), size = pg.viewportSize();
        assert.equal(s.trial.phase, 'draw'); assert.equal(s.trial.joined, false);
        for (const [x, y] of s.trial.anchors) assert.ok(x > 0 && y > 0 && x < size.width && y < size.height, 'every pencil endpoint fits');
        const [first, ...rest] = s.trial.anchors;
        await pg.mouse.move(...first); await pg.mouse.down();
        for (const point of rest) await pg.mouse.move(...point, { steps: 10 });
        await pg.mouse.up();
        await pg.waitForSelector('.sk-draw.on', { state: 'hidden' });
        await shot('coast-traced');
        if (process.argv.includes('--rotate')) await pg.setViewportSize({ width: W, height: H });
    }
    if (args.resume !== 'unfolded') {
        await playUntil(s => s.trial?.phase === 'wave', 'small wave experiment');
        await pg.waitForFunction(() => window.__skoldhast.debug.view.shoreTrial?.travel > .5);
        assert.equal((await state()).flags.includes('p8_proven'), false, 'the drawing alone proves nothing');
        await shot('wave-crossing');
        await playUntil(s => s.trial?.phase === 'proof' && s.dlg, 'keeper sees intact wet paper');
        const proof = await state();
        assert.ok(proof.trial.proven && proof.trial.wet === 1 && proof.flags.includes('p8_proven'));
        assert.ok(proof.hidden && proof.lane === 'p8-lane' && Math.abs(proof.y - 2.6) < .1,
            'the shell stays at the repaired coast instead of being carried up the adjacent pipe');
        assert.match(proof.dialogue, /papperet.*höll/s);
        await shot('wet-and-whole');
    }
    await playUntil(s => s.scene === 'land' && s.dlg, 'return to the original beach');
    const beach = await state();
    assert.ok(Math.abs(beach.x - 108.6) < 1.5); assert.equal(beach.vista, false);
    assert.match(beach.dialogue, /strand.*våg/s);
    await shot('original-beach');
    await playUntil(s => s.flags.includes('plask') && s.dlg, 'promised splash');
    await shot('plask');
    await playUntil(s => s.table && s.dlg, 'back at Alva’s table');
    await shot('alvas-table');
    await playUntil(s => s.ending, 'explicit completion card');
    const ending = await state();
    assert.ok(ending.flags.includes('ended')); assert.equal(ending.checkpoint, 'beachEnd');
    assert.equal(ending.flags.includes('final_run'), false);
    await shot('adventure-complete');
    await pg.getByRole('button', { name: 'Tillbaka till stranden – utforska fritt' }).click();
    await playUntil(s => !s.table && !s.busy && !s.panel, 'free exploration on the beach');
    const fin = await state();
    assert.equal(fin.scene, 'land'); assert.ok(Math.abs(fin.x - 108.6) < 1.5);
    await shot('free-beach');
    assert.deepEqual(errors, []);
    console.log('Finale passed: ' + W + '×' + H + ', reduced motion ' + process.argv.includes('--less-motion') + ', resume ' + (args.resume || 'no'));
} finally { await browser.close(); server.close(); }
