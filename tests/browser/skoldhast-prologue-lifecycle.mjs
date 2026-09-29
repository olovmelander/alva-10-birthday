#!/usr/bin/env node
// Closing during the table's own wait/tween must cancel its callbacks.
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const [width, height] = (process.argv.find((a) => /^\d+x\d+$/.test(a)) || '844x390').split('x').map(Number);
const server = await serve(), browser = await launch();
try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?debug`);
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    await page.evaluate(() => {
        const { ui } = window.__skoldhast.debug;
        const say = ui.say;
        window.__closedUICalls = 0;
        ui.say = (...args) => {
            if (window.__skoldhast.state !== 'open') window.__closedUICalls++;
            return say(...args);
        };
    });
    await page.locator('.sk-title button', { hasText: /^Börja$/ }).click();
    await page.waitForSelector('.sk-ui.table-mode');
    await page.evaluate(() => window.__skoldhast.close());
    // The initial table wait is deliberately 0.9 s. Wait past its deadline so
    // an uncancelled callback cannot pass by merely running after the assertion.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1050)));
    assert.equal(await page.evaluate(() => window.__closedUICalls), 0, 'the abandoned table never opens dialogue after close');

    await page.evaluate(() => window.__skoldhast.open());
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    await page.locator('.sk-title button', { hasText: /^Börja$/ }).click();
    // The opening now begins with the shell stroke that wakes the drawing;
    // complete it the real way, then wait for the hero's first line.
    await page.waitForSelector('.sk-draw.on.guided', { timeout: 30000 });
    await page.keyboard.press('Enter');
    await page.waitForSelector('.sk-dialogue.on.who-horse', { timeout: 30000 });
    await page.evaluate(() => { window.__readableAt = performance.now() + 400; });
    await page.waitForFunction(() => performance.now() >= window.__readableAt);
    await page.evaluate(() => {
        // Close as soon as the first table tween schedules a frame. This avoids
        // racing a 0.5 s animation on slow software WebGL.
        const raf = window.requestAnimationFrame.bind(window);
        window.__tweenCallbacksAfterClose = 0;
        let armed = true;
        window.requestAnimationFrame = (callback) => {
            const tableFrame = /\/src\/prologue\.mjs/.test(new Error().stack || '');
            const id = raf((time) => {
                if (tableFrame && window.__skoldhast.state !== 'open') window.__tweenCallbacksAfterClose++;
                callback(time);
            });
            if (armed && tableFrame) {
                armed = false;
                queueMicrotask(async () => {
                    await window.__skoldhast.close();
                    window.__tweenClosed = true;
                });
            }
            return id;
        };
        window.__skoldhast.debug.ui.advance();
    });
    await page.waitForFunction(() => window.__tweenClosed, null, { timeout: 30000 });
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 600)));
    assert.equal(await page.evaluate(() => window.__tweenCallbacksAfterClose), 0, 'the destroyed table owns no live animation frames');
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.__skoldhast.open());
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    assert.deepEqual(errors, [], 'the next session opens without old table callbacks');
    await page.evaluate(() => window.__skoldhast.close());
    console.log(`prologue cancellation passed at ${width}x${height}`);
} finally { await browser.close(); server.close(); }
