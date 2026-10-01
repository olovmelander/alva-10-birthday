#!/usr/bin/env node
// A standard-mapping gamepad through main.mjs, with a scripted controller in the page:
// play (move, jump, hide, use, Klo), the note by the horse, and the pause menu.
//   node tests/browser/skoldhast-gamepad.mjs
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const server = await serve(), browser = await launch();
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
        const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
        window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons, mapping: 'standard', id: 'scripted' };
        navigator.getGamepads = () => [window.__pad];
        window.__press = (i, on) => { buttons[i].pressed = on; buttons[i].value = on ? 1 : 0; };
    });
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
        window.__hops = 0; G.on('hop', () => window.__hops++);
    });
    // Gamepads are polled once per frame; the software-rendered test browser can
    // run slowly, so each press is held until the game has seen it.
    const tap = async (i, until = null, arg = null) => {
        await page.evaluate(i => window.__press(i, true), i);
        if (until) await page.waitForFunction(until, arg, { timeout: 8000 });
        else await page.waitForTimeout(400);
        await page.evaluate(i => window.__press(i, false), i);
        await page.waitForTimeout(250);
    };
    const idle = () => page.waitForFunction(() => { const d = window.__skoldhast.debug;
        if (d.ui.dialogueOpen()) d.ui.advance(); return !d.ui.dialogueOpen() && !d.G.busy && !d.story.running(); });
    const A = 0, B = 1, X = 2, START = 9, DOWN = 13;
    await page.waitForFunction(() => window.__skoldhast.debug.G.context?.id === 'knuffa');
    await idle();
    await tap(A, () => window.__hops === 1);
    await page.waitForFunction(() => !window.__skoldhast.debug.G.player.jump);
    // The note names the gamepad's button, round like the button itself.
    await page.waitForFunction(() => document.querySelector('.sk-keynote')?.classList.contains('on')
        && document.querySelector('.sk-ui')?.classList.contains('sk-pad'));
    assert.equal(await page.locator('.sk-keynote .sk-keycap').textContent(), 'X');
    await tap(X, () => window.__skoldhast.debug.G.puz.stone === 1);
    await tap(B, () => window.__skoldhast.debug.G.player.hidden);
    await tap(A, () => !window.__skoldhast.debug.G.player.hidden);
    assert.equal(await page.evaluate(() => window.__hops), 1, 'A from the shell comes out without jumping');
    // A half-pushed stick walks; a full push gallops.
    const x0 = await page.evaluate(() => window.__skoldhast.debug.G.player.x);
    await page.evaluate(() => { window.__pad.axes[0] = -0.5; });
    await page.waitForTimeout(700);
    const walking = await page.evaluate(() => Math.abs(window.__skoldhast.debug.G.player.vx));
    await page.evaluate(() => { window.__pad.axes[0] = 0; });
    assert.ok(walking > 150 && walking < 900, `a half-pushed stick moves at a walk or trot (${walking})`);
    assert.ok(await page.evaluate(x0 => window.__skoldhast.debug.G.player.x < x0, x0));
    // Start pauses; the D-pad moves the focus in the menu, B goes back.
    await tap(START, () => window.__skoldhast.debug.ui.panelOpen());
    const before = await page.evaluate(() => document.activeElement?.textContent);
    await tap(DOWN, before => document.activeElement?.textContent !== before, before);
    const after = await page.evaluate(() => document.activeElement?.textContent);
    assert.notEqual(after, before, 'the D-pad moves the focus between menu buttons');
    assert.equal(await page.evaluate(() => window.__hops), 1, 'menu presses never reach the horse');
    await tap(B, () => !window.__skoldhast.debug.ui.panelOpen());
    assert.deepEqual(errors, []);
    console.log('gamepad play, prompt, menu focus and back work');
} finally {
    await browser.close(); server.close();
}
