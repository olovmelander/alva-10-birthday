#!/usr/bin/env node
// Real keyboard routing through main.mjs, without visible control overlays.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const server = await serve(), browser = await launch();
let page;
try {
    page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
    await page.getByText('Jag har en kod').click();
    await page.fill('.sk-code-input', 'kelp mås skal');
    await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
    await page.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'kelp');
    await page.waitForFunction(() => {
        const d = window.__skoldhast.debug;
        if (d.ui.dialogueOpen()) d.ui.advance();
        return d.G.sceneTime > .5 && !d.G.busy && !d.story.running() && !d.ui.dialogueOpen();
    }, null, { timeout: 30000, polling: 100 });
    await page.evaluate(() => {
        const { G, view } = window.__skoldhast.debug;
        G.goto('land', { x: 99.6 * 200, y: -.1 * 200, facing: 1 });
        G.flags.delete('p2_stone'); G.flags.delete('p2_open'); G.puz.stone = 0;
        view.setScene('land');
        window.__hops = 0;
        G.on('hop', () => window.__hops++);
    });
    const read = () => page.evaluate(() => {
        const { G, input } = window.__skoldhast.debug;
        return { hidden: G.player.hidden, jump: !!G.player.jump, mode: G.player.mode, stone: G.puz.stone, hops: window.__hops, input: input.state() };
    });
    await page.waitForFunction(() => window.__skoldhast.debug.G.context?.id === 'knuffa');
    assert.equal(await page.locator('.sk-act').textContent(), 'Knuffa');
    assert.equal(await page.locator('.sk-hop').textContent(), 'Hoppa');
    // Focus on a HUD button must not steal Space from gameplay.
    await page.locator('.sk-pause-btn').focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__hops === 1);
    assert.equal((await read()).stone, 0);
    await page.waitForFunction(() => !window.__skoldhast.debug.G.player.jump);
    await page.keyboard.press('e');
    await page.waitForFunction(() => window.__skoldhast.debug.G.puz.stone === 1);
    assert.equal((await read()).hops, 1);
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => window.__skoldhast.debug.G.player.hidden);
    await page.keyboard.down('s');
    await page.keyboard.down('s'); // browser auto-repeat
    await page.keyboard.up('s');
    assert.equal((await read()).hidden, true);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => !window.__skoldhast.debug.G.player.hidden);
    assert.equal((await read()).hops, 1, 'emerging does not jump');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__hops === 2);
    await page.waitForFunction(() => !window.__skoldhast.debug.G.player.jump);

    // An actual authored drawing uses the independent action button.
    const pencil = await page.evaluate(() => {
        const { G, view } = window.__skoldhast.debug;
        const pc = G.scenes.land.pencils.find(pc => pc.prop === 'kite');
        G.flags.add('penna_' + pc.id); G.flags.delete('color_' + pc.id);
        G.goto('land', { ...pc.propAt, facing: 1 });
        view.cam.snap = true;
        return pc.id;
    });
    await page.waitForFunction(() => window.__skoldhast.debug.G.context?.id === 'farglagg');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__hops === 3);
    assert.equal(await page.evaluate(id => window.__skoldhast.debug.G.has('color_' + id), pencil), false);
    await page.waitForFunction(() => window.__skoldhast.debug.G.context?.id === 'farglagg');
    await page.keyboard.press('e');
    await page.waitForFunction(id => window.__skoldhast.debug.G.has('color_' + id), pencil);
    assert.equal((await read()).hops, 3);

    // Hold mode still allows Space to emerge while Down remains held.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
    await page.locator('.sk-settings summary', { hasText: 'Tangenter' }).click();
    const keyList = page.locator('.sk-settings .sk-key-list');
    assert.equal(await keyList.isVisible(), true);
    const keyText = await keyList.textContent();
    for (const key of ['Mellanslag', '↓ / S', 'E:', '↑ / W', 'X dyk', 'J:', 'K:']) assert.ok(keyText.includes(key), `${key} appears in Settings`);
    await page.getByText('Håll inne för att gömma dig', { exact: true }).click();
    assert.equal(await page.getByLabel('Håll inne för att gömma dig', { exact: true }).isChecked(), true);
    await page.locator('.sk-settings .sk-pbtn', { hasText: /^Stäng$/ }).click();
    await page.keyboard.down('s');
    await page.waitForFunction(() => window.__skoldhast.debug.G.player.hidden);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => !window.__skoldhast.debug.G.player.hidden);
    await page.keyboard.down('s');
    assert.equal((await read()).hidden, false, 'held Down does not tuck again after Space');
    await page.keyboard.up('s');
    await page.keyboard.down('s');
    await page.waitForFunction(() => window.__skoldhast.debug.G.player.hidden);
    await page.keyboard.up('s');
    await page.waitForFunction(() => !window.__skoldhast.debug.G.player.hidden);

    // Dialogue accepts Space without passing the same press into a jump.
    await page.evaluate(() => {
        window.__dialogueDone = false;
        window.__skoldhast.debug.ui.say([['horse', 'Ett kontrolltest.']]).then(() => window.__dialogueDone = true);
        window.__readAt = performance.now() + 400;
    });
    await page.waitForFunction(() => performance.now() >= window.__readAt);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__dialogueDone);
    assert.equal((await read()).hops, 3);

    // Keyboard play stays free of control overlays at every viewport size.
    await fs.mkdir('docs/skoldhast/shots/controls', { recursive: true });
    for (const [width, height] of [[390, 844], [844, 390], [1440, 900]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => { window.__layoutAt = performance.now() + 350; });
        await page.waitForFunction(() => performance.now() >= window.__layoutAt);
        for (const selector of ['.sk-controls', '.sk-hop', '.sk-hide', '.sk-act', '.sk-context-control']) {
            assert.equal(await page.locator(selector).isVisible(), false, `${selector} stays hidden during keyboard play`);
        }
        assert.equal(await page.locator('.sk-key-help, .sk-key-reference').count(), 0);
        assert.equal(await page.locator('.sk-context-control').evaluate(node => getComputedStyle(node).display), 'none');
        await sharp(await page.screenshot()).webp({ quality: 85 }).toFile(`docs/skoldhast/shots/controls/${width}x${height}.webp`);
    }
    assert.deepEqual(errors, []);
    console.log('keyboard controls, hold mode, dialogue, painting and stone work without control overlays');
} catch (error) {
    console.error(await page?.evaluate(() => {
        const d = window.__skoldhast?.debug, G = d?.G, p = G?.player;
        return { scene: G?.sceneId, busy: G?.busy, lock: G?.inputLock, context: G?.context?.id,
            stone: G?.puz.stone, player: p && { x: p.x, y: p.y, mode: p.mode, hidden: p.hidden },
            dialogue: document.querySelector('.sk-dialogue.on')?.textContent, panel: d?.ui.panelOpen(), input: d?.input.state() };
    }));
    throw error;
} finally {
    await browser.close();
    server.close();
}
