#!/usr/bin/env node
// New cloud: native palette input, draft rotation/cancellation and actual save/reload.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { UI, DRAWING } from '../../skoldhast/src/content/sv.mjs';

const outAt = process.argv.indexOf('--out'), out = outAt >= 0 ? process.argv[outAt + 1] : '/tmp/skoldhast-cloud-color';
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch();
try {
    for (const [width, height] of [[844, 390], [390, 844]]) {
        const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, deviceScaleFactor: 1 });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.waitForSelector('.sk-title');
        await page.locator('.sk-title button').first().tap();
        await page.waitForFunction(() => { const b = document.querySelector('.sk-notes-skip'); b?.click(); return !!b || !!document.querySelector('.sk-draw.on'); }, null, { timeout: 60000, polling: 100 }); // skip Alva's notes (skoldhast-notes.mjs plays them)
        await page.waitForFunction(cloud => {
            const d = window.__skoldhast.debug;
            if (d.ui.dialogueOpen()) d.ui.advance();
            const drawing = document.querySelector('.sk-draw.on');
            if (!drawing) return false;
            if (drawing.querySelector('.sk-draw-prompt').textContent === cloud) return true;
            drawing.querySelector('.sk-draw-example').click();
            return false;
        }, UI.drawCloud, { timeout: 30000 });
        const pencils = page.locator('.sk-draw-pencil');
        assert.equal(await pencils.count(), 5);
        const bounds = await pencils.evaluateAll(ns => ns.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
        assert.ok(bounds.every(r => r.width >= 44 && r.height >= 44 && r.x >= 0 && r.x + r.width <= width));
        await page.getByRole('button', { name: DRAWING.cloudColors.rose, exact: true }).tap();
        assert.equal(await page.locator('[data-color="rose"]').getAttribute('aria-pressed'), 'true');
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('[data-color="peach"]').getAttribute('aria-pressed'), 'true', 'keyboard selects a pencil');
        await page.getByRole('button', { name: DRAWING.cloudColors.lavender, exact: true }).tap();
        const pad = await page.locator('.sk-draw-pad').boundingBox();
        assert.ok(pad.width >= 160 && pad.height >= 110, 'palette leaves usable drawing space');
        const cdp = await context.newCDPSession(page);
        const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y]) => ({ x, y, id: 1 })) });
        const at = (x, y) => [pad.x + x * pad.width, pad.y + y * pad.height];
        await touch('touchStart', [at(.2, .3)]); await touch('touchMove', [at(.6, .7)]); await touch('touchCancel', []);
        assert.equal(await page.locator('.sk-draw.preview').count(), 0, 'canceled cloud stays unfinished');
        for (let i = 0; i <= 36; i++) {
            const a = i / 36 * Math.PI * 2, r = 1 + .16 * Math.sin(5 * a);
            const p = at(.5 + Math.cos(a) * .34 * r, .5 + Math.sin(a) * .26 * r);
            await touch(i ? 'touchMove' : 'touchStart', [p]);
        }
        await touch('touchEnd', []); await page.waitForSelector('.sk-draw.preview');
        const beforeColor = await page.locator('.sk-draw canvas').evaluate(c => c.toDataURL());
        await page.getByRole('button', { name: DRAWING.cloudColors.peach, exact: true }).tap();
        const afterColor = await page.locator('.sk-draw canvas').evaluate(c => c.toDataURL());
        assert.notEqual(beforeColor, afterColor, 'changing the pencil recolors the existing draft');
        await page.getByRole('button', { name: DRAWING.cloudColors.lavender, exact: true }).tap();
        await page.screenshot({ path: path.join(out, `palette-${width}x${height}.png`) });
        await page.setViewportSize({ width: height, height: width });
        await page.waitForFunction(w => document.querySelector('.sk-draw canvas').width === w, height);
        assert.equal(await page.locator('.sk-draw.preview').count(), 1);
        assert.equal(await page.locator('[data-color="lavender"]').getAttribute('aria-pressed'), 'true');
        await page.locator('.sk-draw-done').tap();
        await page.waitForFunction(() => !!window.__skoldhast.debug.G.userCloud);
        await page.setViewportSize({ width, height });
        await page.waitForFunction(() => {
            const d = window.__skoldhast.debug;
            if (d.ui.dialogueOpen()) d.ui.advance();
            document.querySelector('.sk-draw.on .sk-draw-example')?.click();
            document.querySelector('.sk-choice.on button')?.click();
            return d.G.flags.has('intro_done');
        }, null, { timeout: 30000 });
        const saved = await page.evaluate(() => {
            const { G } = window.__skoldhast.debug;
            return { points: G.userStrokes.cloud, color: G.userStrokes.cloudColor, texture: G.userCloud.source.resource.toDataURL() };
        });
        assert.equal(saved.color, 'lavender'); assert.ok(saved.points.length >= 3 && saved.points.length <= 200);
        await page.screenshot({ path: path.join(out, `cloud-${width}x${height}.png`) });
        await page.evaluate(() => window.__skoldhast.close());
        await page.evaluate(() => window.__skoldhast.open());
        await page.waitForSelector('.sk-title');
        await page.locator('.sk-title button', { hasText: UI.cont }).tap();
        await page.waitForFunction(() => !!window.__skoldhast.debug.G?.userCloud);
        const restored = await page.evaluate(() => {
            const { G } = window.__skoldhast.debug;
            return { points: G.userStrokes.cloud, color: G.userStrokes.cloudColor, texture: G.userCloud.source.resource.toDataURL() };
        });
        assert.deepEqual(restored, saved, 'shape, chosen color and rendered pixels survive actual close/reopen');
        if (width > height) {
            await page.evaluate(async () => {
                await window.__skoldhast.close();
                const key = 'skoldhast.v2.slot.alva', saved = JSON.parse(localStorage.getItem(key));
                delete saved.adventures['havet-mellan-sidorna'].strokes.cloudColor; localStorage.setItem(key, JSON.stringify(saved));
                await window.__skoldhast.open();
            });
            await page.waitForSelector('.sk-title');
            await page.locator('.sk-title button', { hasText: UI.cont }).tap();
            await page.waitForFunction(() => !!window.__skoldhast.debug.G?.userCloud);
            const oldSave = await page.evaluate(() => {
                const { G } = window.__skoldhast.debug;
                return { points: G.userStrokes.cloud, color: G.userStrokes.cloudColor, texture: G.userCloud.source.resource.toDataURL() };
            });
            assert.deepEqual(oldSave.points, saved.points); assert.equal(oldSave.color, 'paper');
            assert.notEqual(oldSave.texture, saved.texture, 'legacy saves load with the original outline-only look');
        }
        assert.deepEqual(errors, []);
        console.log(`cloud palette and saved texture ${width}x${height}: pass`);
        await context.close();
    }
} finally { await browser.close(); server.close(); }
