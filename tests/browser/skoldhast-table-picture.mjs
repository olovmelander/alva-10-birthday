#!/usr/bin/env node
/*
 * Her picture on the table (the unfold and the epilogue) is a snapshot of the land scene
 * (view.snapshot). It must not depend on the screen it is played on: the live screen's air
 * (vignette, haze, bloom) once got baked into it, laid out for the phone, which left a dark
 * seam down her drawing in portrait. As in the finale, the picture is taken right after leaving the
 * sea, at 844×390 and 390×844, and compared on a coarse grid of brightness.
 *
 *   NODE_PATH=$(npm root -g) node tests/browser/skoldhast-table-picture.mjs
 */
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const server = await serve(), browser = await launch();
const grids = {};
try {
    for (const [width, height] of [[844, 390], [390, 844]]) {
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.getByText('Jag har en kod').click();
        await page.fill('.sk-code-input', 'kelp mås skal');
        await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await page.waitForFunction(() => { const d = window.__skoldhast.debug; if (d.ui.dialogueOpen()) d.ui.advance(); return d.G?.sceneId === 'kelp' && d.G.sceneTime > .5 && !d.story.running(); }, null, { timeout: 60000, polling: 100 });
        await page.evaluate(async () => { const { assets } = window.__skoldhast.debug; await Promise.all(assets.bundles().map(b => assets.load(b))); });
        await page.waitForTimeout(2500); // the sea's air settles over the live screen
        grids[`${width}x${height}`] = await page.evaluate(() => {
            const { view, app, G } = window.__skoldhast.debug;
            const W = 740, H = 560, N = 16, M = 12;
            // as the finale does (story.mjs, unfoldPage): straight from the sea to her beach, then the picture
            G.goto('land', 'start', { silent: true }); view.setScene('land');
            const rt = view.snapshot({ x: 21790, y: -268, zoom: W / 1060, width: W, height: H, skyFactor: .33 });
            const { pixels } = app.renderer.extract.pixels({ target: rt });
            rt.destroy(true);
            const g = [];
            for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
                let s = 0, n = 0;
                for (let y = Math.floor(j * H / M); y < Math.floor((j + 1) * H / M); y += 3) for (let x = Math.floor(i * W / N); x < Math.floor((i + 1) * W / N); x += 3) {
                    const k = (y * W + x) * 4; s += pixels[k] + pixels[k + 1] + pixels[k + 2]; n++;
                }
                g.push(s / n / 3);
            }
            return g;
        });
        assert.deepEqual(errors, []);
        await page.close();
    }
    const [a, b] = Object.values(grids);
    const diff = a.map((v, i) => Math.abs(v - b[i])), worst = Math.max(...diff);
    console.log(`brightness grid: worst difference ${worst.toFixed(1)} of 255 between 844×390 and 390×844`);
    assert.ok(worst < 14, 'her picture on the table looks the same on any screen');
    console.log('the table picture does not depend on the screen');
} finally { await browser.close(); server.close(); }
