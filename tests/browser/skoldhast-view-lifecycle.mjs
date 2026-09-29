#!/usr/bin/env node
// View-owned effects must stop before their scene and renderer are destroyed.
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const server = await serve(), browser = await launch();
try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?debug`);
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    await page.evaluate(() => {
        const raf = window.requestAnimationFrame.bind(window);
        window.__effectFramesAfterClose = 0;
        window.requestAnimationFrame = (callback) => {
            const viewFrame = /\/src\/view\.mjs/.test(new Error().stack || '');
            return raf((time) => {
                if (viewFrame && window.__skoldhast.state !== 'open') window.__effectFramesAfterClose++;
                callback(time);
            });
        };
    });
    for (const effect of ['fade', 'foldDemo', 'vista']) {
        if (effect !== 'fade') {
            await page.evaluate(() => window.__skoldhast.open());
            await page.waitForSelector('.sk-title', { timeout: 30000 });
        }
        await page.evaluate(async (name) => {
            const { view, G, assets } = window.__skoldhast.debug;
            await Promise.all(assets.bundles().map((bundle) => assets.load(bundle)));
            G.goto('land', 'start'); view.setScene('land');
            window.__effectCompleted = false;
            const effect = name === 'fade' ? view.fadeTo(1, 0.25) : name === 'foldDemo' ? view.fx(name, { x: 600, y: 0 }) :
                view.fx(name, { scene: 'viken', lighthouse: true, x: 5960, y: -1440, hold: 1 });
            effect.then(() => { window.__effectCompleted = true; });
            // Both RAF effects and a page-turn effect now await their next frame.
            await window.__skoldhast.close();
        }, effect);
        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 350)));
        const stopped = await page.evaluate(() => ({ frames: window.__effectFramesAfterClose, completed: window.__effectCompleted, roots: document.querySelectorAll('.sk-root').length }));
        assert.deepEqual(stopped, { frames: 0, completed: false, roots: 0 }, `${effect}: close cancels its work without advancing the abandoned story`);
        assert.deepEqual(errors, [], `${effect}: no callbacks touch destroyed sprites or restore an old vista`);
    }
    await page.evaluate(() => window.__skoldhast.open());
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.__skoldhast.close());
    console.log('view effects cancel cleanly and reopen');
} finally { await browser.close(); server.close(); }
