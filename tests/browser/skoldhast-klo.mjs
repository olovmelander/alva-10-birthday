#!/usr/bin/env node
/* Real pointer/touch/key checks for Klo, including his overlap with the stick band.
 * node tests/browser/skoldhast-klo.mjs [844x390 | 390x844] [--out <dir>] */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
const vp = (process.argv.find((a) => /^\d+x\d+$/.test(a)) || '844x390').split('x').map(Number);
const oi = process.argv.indexOf('--out');
const out = oi >= 0 ? process.argv[oi + 1] : null;
if (out) fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch();
const errors = [];
try {
    const context = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, hasTouch: true, deviceScaleFactor: 1 });
    const pg = await context.newPage(); pg.on('pageerror', (e) => errors.push(e.message));
    const cdp = await context.newCDPSession(pg);
    const touch = (type, points, timestamp) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], i) => ({ x, y, id: i + 1 })), timestamp });
    await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
    await pg.waitForSelector('.sk-title');
    await pg.getByText('Jag har en kod').click();
    await pg.fill('.sk-code-input', 'kelp mås skal');
    await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
    await pg.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'kelp', null, { timeout: 30000 });
    await pg.waitForFunction(() => {
        const d = window.__skoldhast.debug;
        if (d.ui.dialogueOpen()) d.ui.advance();
        return d.G.sceneTime > 1 && !d.G.busy && !d.story.running();
    }, null, { timeout: 60000 });
    await pg.evaluate(() => {
        const { G, view } = window.__skoldhast.debug;
        G.goto('land', { x: 106.8 * 200, y: -0.4 * 200 }); view.setScene('land');
        Object.assign(G.actors.klo, { visible: true, scene: 'land', x: 106.3 * 200, y: -0.4 * 200, pop: 0, inHole: false, pose: 'idle' });
        window.__kloTaps = []; G.on('kloTap', (e) => window.__kloTaps.push(e));
        window.__kloScreen = () => {
            const d = window.__skoldhast.debug;
            if (!d.kloOnScreen()) return null;
            const b = d.view.kloBounds(); return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
        };
        window.__neighs = 0; G.on('neigh', () => window.__neighs++);
    });
    await pg.waitForFunction(() => {
        const d = window.__skoldhast.debug; return !d.G.busy && !d.story.running() && !!window.__kloScreen();
    }, null, { timeout: 30000 });
    // Put his ground point in the touch band's interior after the camera settles.
    const zone = await pg.locator('.sk-stick-zone').boundingBox();
    await pg.evaluate(({ x, y }) => {
        const { G, view } = window.__skoldhast.debug, w = view.world;
        Object.assign(G.actors.klo, { x: (x - w.x) / w.scale.x, y: (y - w.y) / w.scale.y + 35, pose: 'notebook' });
    }, { x: zone.x + zone.width * 0.45, y: zone.y + zone.height * 0.5 });
    await pg.waitForFunction(() => {
        const d = window.__skoldhast.debug, b = window.__kloScreen();
        return b && d.kloHit(b.x, b.y) && document.elementFromPoint(b.x, b.y)?.classList.contains('sk-stick-zone');
    }, null, { timeout: 10000 });
    const spot = await pg.evaluate(() => window.__kloScreen());
    const stamp = Date.now() / 1000;
    await touch('touchStart', [[spot.x, spot.y]], stamp); await touch('touchEnd', [], stamp + 0.08);
    await pg.waitForFunction(() => window.__kloTaps.length === 1, null, { timeout: 10000 }).catch(async (error) => {
        const detail = await pg.evaluate(({x,y}) => { const d = window.__skoldhast.debug; return { taps: window.__kloTaps, busy: d.G.busy, running: d.story.running(), dialogue: d.ui.dialogueOpen(), panel: d.ui.panelOpen(), hit: d.kloHit(x,y), onscreen: d.kloOnScreen(), actor: {...d.G.actors.klo, walk:null}, input: d.input.state(), lastTap: d.input.lastTap, spot: window.__kloScreen(), element: document.elementFromPoint(x,y)?.className }; }, spot);
        throw new Error(error.message + ' ' + JSON.stringify(detail));
    });
    assert.equal(await pg.evaluate(() => window.__neighs), 0, 'Klo tap does not neigh');
    assert.match(await pg.locator('.sk-hintbubble').textContent(), /Professor Klo/);
    assert.equal(await pg.evaluate(() => window.__skoldhast.debug.ui.dialogueOpen()), false, 'joke never opens a modal dialogue');
    await pg.keyboard.press('k');
    assert.equal(await pg.evaluate(() => window.__kloTaps.length), 1, 'immediate second tap is rate limited');
    await pg.evaluate(() => { window.__skoldhast.debug.G.time += 6; });
    await pg.keyboard.press('k'); await pg.waitForFunction(() => window.__kloTaps.length === 2);
    assert.notEqual(...await pg.evaluate(() => window.__kloTaps.map((e) => e.line)));
    // Mouse click uses exactly the same small target, whether the band overlays it or not.
    await pg.evaluate(() => { window.__skoldhast.debug.G.time += 6; });
    const mouseSpot = await pg.evaluate(() => window.__kloScreen());
    await pg.mouse.click(mouseSpot.x, mouseSpot.y);
    await pg.waitForFunction(() => window.__kloTaps.length === 3);
    for (const key of ['inHole', 'busy']) {
        await pg.evaluate((key) => { const { G } = window.__skoldhast.debug; G.time += 6; if (key === 'busy') G.busy++; else G.actors.klo.inHole = true; }, key);
        await pg.keyboard.press('k');
        assert.equal(await pg.evaluate(() => window.__kloTaps.length), 3, key + ' blocks the tap');
        await pg.evaluate((key) => { const { G } = window.__skoldhast.debug; if (key === 'busy') G.busy--; else G.actors.klo.inHole = false; }, key);
    }
    await pg.evaluate(() => {
        const { G, ui } = window.__skoldhast.debug; G.time += 6;
        window.__testDialogue = ui.say([['klo', window.__kloTaps[0].line]]);
    });
    await pg.waitForFunction(() => window.__skoldhast.debug.ui.dialogueOpen());
    await pg.keyboard.press('k');
    assert.equal(await pg.evaluate(() => window.__kloTaps.length), 3, 'dialogue blocks taps');
    await pg.waitForFunction(() => { const { ui } = window.__skoldhast.debug; if (ui.dialogueOpen()) ui.advance(); return !ui.dialogueOpen(); });
    await pg.evaluate(() => { const { G } = window.__skoldhast.debug; G.actors.klo.x = -100000; });
    await pg.waitForFunction(() => !window.__kloScreen());
    await pg.keyboard.press('k'); assert.equal(await pg.evaluate(() => window.__kloTaps.length), 3, 'offscreen Klo cannot be summoned');
    const hs = await pg.evaluate(() => window.__skoldhast.debug.heroScreen());
    const heroStamp = Date.now() / 1000;
    await touch('touchStart', [[hs.x, hs.y]], heroStamp); await touch('touchEnd', [], heroStamp + 0.08);
    await pg.waitForFunction(() => window.__neighs > 0);
    const dragStamp = Date.now() / 1000;
    const sx = zone.x + zone.width * 0.45, sy = zone.y + zone.height * 0.5;
    await touch('touchStart', [[sx, sy]], dragStamp);
    await touch('touchMove', [[sx + 60, sy]], dragStamp + 0.08);
    await pg.waitForFunction(() => window.__skoldhast.debug.G.player.vx > 300, null, { timeout: 10000 });
    await touch('touchEnd', [], Date.now() / 1000);
    await pg.waitForFunction(() => Math.abs(window.__skoldhast.debug.G.player.vx) < 30, null, { timeout: 10000 });
    if (out) {
        await pg.evaluate(() => { const { G } = window.__skoldhast.debug; Object.assign(G.actors.klo, { x: G.player.x + 140, y: G.player.y, pose: 'idle' }); });
        await pg.waitForFunction(() => !!window.__kloScreen());
        await pg.screenshot({ path: path.join(out, `klo-${vp.join('x')}.png`) });
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ viewport: vp.join('x'), taps: 3, touch: 'pass', mouse: 'pass', key: 'pass', guards: 'pass', errors }, null, 2));
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
