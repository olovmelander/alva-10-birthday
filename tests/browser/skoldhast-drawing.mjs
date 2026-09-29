#!/usr/bin/env node
// The real pencil UI: drafts, cancellation, pointer ownership, sparse traces and rotation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const outAt = process.argv.indexOf('--out'), out = outAt >= 0 ? process.argv[outAt + 1] : '/tmp/skoldhast-drawing';
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch();
try {
    for (const [width, height] of [[844, 390], [390, 844]]) {
        const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, deviceScaleFactor: 1 });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/menus.html?m=title&shot=1`);
        await page.waitForFunction(() => !!window.__menus);
        await page.evaluate(() => {
            window.__drawingResult = null;
            window.__geometry = () => {
                const bounds = innerWidth > innerHeight ? { x: 612, y: 105, width: 94, height: 80 } : { x: 280, y: 330, width: 69, height: 58.72 };
                const ghost = [[0.1, 0.65], [0.3, 0.25], [0.5, 0.65], [0.7, 0.25], [0.9, 0.65]].map(([x, y]) => [bounds.x + x * bounds.width, bounds.y + y * bounds.height]);
                return { bounds, ghost };
            };
            window.__menus.ui.draw({ prompt: 'Rita en mås!', ...window.__geometry(), getGeometry: window.__geometry }).then(p => { window.__drawingResult = p; });
        });
        const cdp = await context.newCDPSession(page);
        const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y, id = 1]) => ({ x, y, id })) });
        const pad = await page.locator('.sk-draw-pad').boundingBox();
        const at = (u, v, id = 1) => [pad.x + pad.width * u, pad.y + pad.height * v, id];
        assert.ok(pad.width >= 180 && pad.height >= 120, 'free drawing is large enough for a finger');
        const buttons = await page.locator('.sk-draw-actions button').evaluateAll(ns => ns.map(n => n.getBoundingClientRect()));
        assert.ok(buttons.every(b => b.width >= 44 && b.height >= 44));
        const prompt = await page.locator('.sk-draw-prompt').boundingBox();
        assert.ok(prompt.x >= 0 && prompt.x + prompt.width <= width, 'drawing title fits the viewport');
        // Outside taps and right-clicks are never accepted as drawings.
        await page.mouse.click(2, height / 2);
        await page.mouse.click(...at(0.4, 0.5).slice(0, 2), { button: 'right' });
        assert.equal(await page.locator('.sk-draw.preview').count(), 0);
        await touch('touchStart', [at(0.2, 0.7)]);
        await touch('touchMove', [at(0.6, 0.3)]);
        await touch('touchCancel', []);
        assert.equal(await page.evaluate(() => window.__drawingResult), null, 'touch cancellation cannot accept the drawing');
        assert.equal(await page.locator('.sk-draw.preview').count(), 0);
        // A second finger cannot finish, redraw or cancel the first finger's stroke.
        await page.evaluate(() => {
            window.__touchLog = [];
            for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) document.querySelector('.sk-draw canvas').addEventListener(type, e => window.__touchLog.push([type, e.pointerId, e.isPrimary]), { capture: true });
        });
        await touch('touchStart', [at(0.2, 0.7)]);
        await touch('touchMove', [at(0.4, 0.3)]);
        await touch('touchStart', [at(0.4, 0.3), at(0.8, 0.8, 2)]);
        await touch('touchEnd', [at(0.8, 0.8, 2)]);
        assert.equal(await page.locator('.sk-draw.drawing').count(), 1, 'primary finger still owns the stroke: ' + JSON.stringify(await page.evaluate(() => window.__touchLog)));
        await touch('touchMove', [at(0.8, 0.7)]);
        await touch('touchEnd', []);
        await page.waitForSelector('.sk-draw.preview');
        assert.equal(await page.evaluate(() => window.__drawingResult), null, 'a stroke is a preview until Klar');
        await page.locator('.sk-draw-redo').tap();
        await page.waitForSelector('.sk-draw.preview', { state: 'hidden' });
        // This recognizable three-point shape must survive the larger pad and rotation.
        await page.mouse.move(...at(0.15, 0.8).slice(0, 2)); await page.mouse.down();
        await page.mouse.move(...at(0.45, 0.2).slice(0, 2), { steps: 18 });
        await page.mouse.move(...at(0.83, 0.75).slice(0, 2), { steps: 18 }); await page.mouse.up();
        await page.waitForSelector('.sk-draw.preview');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.locator('.sk-draw-done').evaluate(n => n === document.activeElement), true, 'Shift+Tab starts at the last enabled action');
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('.sk-draw-redo').evaluate(n => n === document.activeElement), true, 'keyboard focus stays inside the drawing');
        await page.screenshot({ path: path.join(out, `draft-${width}x${height}.png`) });
        await page.setViewportSize({ width: height, height: width });
        await page.waitForFunction((w) => document.querySelector('.sk-draw canvas').width === w, height);
        assert.equal(await page.locator('.sk-draw.preview').count(), 1, 'rotation preserves the draft');
        await page.locator('.sk-draw-done').tap();
        const saved = await page.evaluate(() => ({ points: window.__drawingResult, bounds: window.__geometry().bounds }));
        assert.ok(saved.points.length >= 3 && saved.points.length <= 200);
        const normalize = p => [(p[0] - saved.bounds.x) / saved.bounds.width, (p[1] - saved.bounds.y) / saved.bounds.height];
        const first = normalize(saved.points[0]), last = normalize(saved.points.at(-1));
        assert.ok(Math.abs(first[0] - 0.15) < 0.012 && Math.abs(first[1] - 0.8) < 0.012, 'first point returns to current paper coordinates');
        assert.ok(Math.abs(last[0] - 0.83) < 0.012 && Math.abs(last[1] - 0.75) < 0.012, 'last point keeps its shape after orientation');
        assert.ok(saved.points.every(p => normalize(p).every(v => v >= 0 && v <= 1)), 'saved artwork remains inside its paper margin');

        await page.setViewportSize({ width, height });
        await page.evaluate(() => {
            window.__drawingResult = null;
            const y = innerHeight * 0.55;
            window.__menus.ui.draw({ prompt: 'Rita det sista strecket!', anchors: [[40, y], [140, y], [240, y], [340, y]], allowReverse: true }).then(p => { window.__drawingResult = p; });
        });
        await touch('touchStart', [[340, height * 0.55]]);
        await touch('touchMove', [[40, height * 0.55]]);
        await touch('touchCancel', []);
        await page.waitForTimeout(280);
        assert.equal(await page.evaluate(() => window.__drawingResult), null, 'cancelling a completed trace also cancels its pending confirmation');
        assert.equal(await page.locator('.sk-draw-progress').getAttribute('aria-valuenow'), '0', 'cancelled trace restores its checkpoint progress');
        await page.mouse.move(340, height * 0.55); await page.mouse.down();
        await page.mouse.move(40, height * 0.55, { steps: 1 }); await page.mouse.up();
        await page.waitForFunction(() => window.__drawingResult?.length === 4);
        assert.equal(await page.evaluate(() => window.__drawingResult[0][0]), 340, 'P8 accepts reverse tracing');
        await page.evaluate(() => {
            window.__drawingResult = null;
            const y = innerHeight * 0.55;
            window.__menus.ui.draw({ prompt: 'Rita strandkanten vidare!', anchors: [[180, y], [192, y], [204, y], [216, y]], stopAt: 3 }).then(p => { window.__drawingResult = p; });
        });
        await page.mouse.click(180, height * 0.55);
        assert.equal(await page.locator('.sk-draw-progress').getAttribute('aria-valuenow'), '1', 'a tap credits only one closely spaced point');
        assert.equal(await page.evaluate(() => window.__drawingResult), null);
        await page.mouse.move(192, height * 0.55); await page.mouse.down(); await page.mouse.move(216, height * 0.55, { steps: 1 }); await page.mouse.up();
        await page.waitForFunction(() => window.__drawingResult?.length === 3);
        // Keyboard and helper remain real, visible no-fail alternatives.
        await page.evaluate(() => { window.__drawingResult = null; window.__menus.ui.draw({ prompt: 'Rita en mås!', ...window.__geometry() }).then(p => { window.__drawingResult = p; }); });
        await page.locator('.sk-draw-example').tap();
        await page.waitForFunction(() => window.__drawingResult?.length);
        await page.evaluate(() => { window.__drawingResult = null; window.__menus.ui.draw({ prompt: 'Rita ett moln!', ...window.__geometry() }).then(p => { window.__drawingResult = p; }); });
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.__drawingResult?.length);
        assert.deepEqual(errors, []);
        await context.close();
        console.log(`drawing gestures, preview, paper mapping and rotation pass at ${width}x${height}`);
    }
} finally { await browser.close(); server.close(); }
