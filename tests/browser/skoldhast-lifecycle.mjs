#!/usr/bin/env node
/*
 * Drawing cancellation and ten close/reopen cycles with a rendered atlas frame.
 *   node tests/browser/skoldhast-lifecycle.mjs [390x844]
 */
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const [width, height] = (process.argv.find((a) => /^\d+x\d+$/.test(a)) || '844x390').split('x').map(Number);
const server = await serve(), browser = await launch();
try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => { errors.push(error.message); console.error(error.stack || error.message); });
    page.on('console', (message) => { if (message.type() === 'error') { errors.push(message.text()); console.error(message.text()); } });
    const base = `http://127.0.0.1:${server.address().port}`;

    // A replaced drawing must not consume the next drawing's Enter or hide it later.
    await page.goto(`${base}/skoldhast/dev/menus.html?m=title&shot=1`);
    await page.waitForFunction(() => !!window.__menus);
    await page.evaluate(() => {
        const { ui } = window.__menus;
        window.__drawResults = [];
        ui.draw({ ghost: [[80, 80], [140, 100]] }).then(() => window.__drawResults.push('old'));
        ui.draw({ ghost: [[180, 180], [240, 200]] }).then(() => window.__drawResults.push('current'));
    });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__drawResults.includes('current'));
    assert.deepEqual(await page.evaluate(() => window.__drawResults), ['current'], 'replaced drawing cannot complete');

    // Anchor confirmation has a short visual delay. Destroy must cancel that pending callback.
    const canceled = await page.evaluate(async () => {
        const { ui } = window.__menus;
        ui.draw({ anchors: [[80, 80], [160, 80]] }).then(() => window.__drawResults.push('destroyed'));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
        ui.destroy();
        const key = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
        window.dispatchEvent(key);
        // Wait past the explicit 300 ms drawing completion timer, not a render-frame count.
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { prevented: key.defaultPrevented, results: window.__drawResults };
    });
    assert.equal(canceled.prevented, false, 'destroyed drawing releases the global keyboard listener');
    assert.deepEqual(canceled.results, ['current'], 'destroyed drawing cancels delayed confirmation');

    await page.goto(`${base}/skoldhast/dev/play.html?debug`);
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    for (let cycle = 0; cycle < 10; cycle++) {
        if (cycle) {
            await page.evaluate(() => window.__skoldhast.open());
            await page.waitForSelector('.sk-title', { timeout: 30000 });
        }
        const rendered = await page.evaluate(async () => {
            const PIXI = await import('/skoldhast/vendor/pixi-8.21.0.min.mjs');
            const { app, assets, ui } = window.__skoldhast.debug;
            const texture = assets.frame('klo-idle-1');
            if (!texture || texture.destroyed) return false;
            const sprite = new PIXI.Sprite(texture);
            const { pixels } = app.renderer.extract.pixels({ target: sprite });
            sprite.destroy();
            window.__closedDrawCompleted = false;
            ui.draw({ ghost: [[80, 80], [140, 100]] }).then(() => { window.__closedDrawCompleted = true; });
            return pixels.some((value, index) => index % 4 === 3 && value > 0);
        });
        assert.equal(rendered, true, `cycle ${cycle + 1}: reopened atlas renders nontransparent pixels`);
        await page.evaluate(() => window.__skoldhast.close());
        const after = await page.evaluate(async () => {
            const key = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
            window.dispatchEvent(key);
            await Promise.resolve();
            return {
                state: window.__skoldhast.state,
                roots: document.querySelectorAll('.sk-root').length,
                locked: document.documentElement.classList.contains('skoldhast-lock'),
                prevented: key.defaultPrevented,
                drawingCompleted: window.__closedDrawCompleted
            };
        });
        assert.deepEqual(after, { state: 'closed', roots: 0, locked: false, prevented: false, drawingCompleted: false }, `cycle ${cycle + 1}: closed session has no drawing input or continuation`);
        assert.deepEqual(errors, []);
        console.log(`lifecycle cycle ${cycle + 1}/10 passed`);
    }

    // Reach the real prologue drawing, then leave it unfinished. Space in the next
    // session must never continue the old prologue against its destroyed scene.
    await page.evaluate(() => window.__skoldhast.open());
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    await page.locator('.sk-title button', { hasText: /^Börja$/ }).click();
    await page.waitForSelector('.sk-dialogue.on.who-caption', { timeout: 30000 });
    for (let line = 0; line < 3; line++) {
        const previous = await page.locator('.sk-dlg-text').textContent();
        // say() deliberately gives each new line a 350 ms reading guard.
        await page.evaluate(() => { window.__readableAt = performance.now() + 400; });
        await page.waitForFunction(() => performance.now() >= window.__readableAt);
        await page.evaluate(() => window.__skoldhast.debug.ui.advance());
        await page.waitForFunction((text) => document.querySelector('.sk-draw.on') ||
            (document.querySelector('.sk-dialogue.on') && document.querySelector('.sk-dlg-text').textContent !== text), previous);
    }
    await page.waitForSelector('.sk-draw.on');
    await page.evaluate(() => window.__skoldhast.close());
    await page.evaluate(() => window.__skoldhast.open());
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    await page.keyboard.press('Space');
    assert.equal(await page.locator('.sk-draw.on').count(), 0, 'abandoned prologue cannot reopen its drawing');
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.__skoldhast.close());
    console.log(`drawing cleanup and lifecycle passed at ${width}x${height}`);
} finally {
    await browser.close();
    server.close();
}
