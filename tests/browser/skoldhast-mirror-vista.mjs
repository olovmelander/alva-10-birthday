#!/usr/bin/env node
/* P7's real hide-triggered mirror explanation: both phones, full and reduced motion.
 * node tests/browser/skoldhast-mirror-vista.mjs [--out /tmp/mirror-vista]
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { STORY } from '../../skoldhast/src/content/sv.mjs';

const i = process.argv.indexOf('--out'), out = i >= 0 ? process.argv[i + 1] : null;
if (out) fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch();
const results = [];
try {
    for (const [width, height, lessMotion] of [[844, 390, false], [390, 844, true]]) {
        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
        const pg = await ctx.newPage(), errors = [];
        pg.on('pageerror', e => errors.push(e.message));
        pg.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
        await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await pg.getByText('Jag har en kod').click();
        await pg.fill('.sk-code-input', 'fyr fjun klo');
        await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await pg.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'viken');
        for (let tries = 0; tries < 100; tries++) {
            const ready = await pg.evaluate(() => {
                const { G, story, ui } = window.__skoldhast.debug;
                if (ui.dialogueOpen()) ui.advance();
                if (ui.panelOpen()) ui.closePanel();
                return G.has('b:k3_arrive') && !G.busy && !story.running();
            });
            if (ready) break;
            await pg.waitForTimeout(100);
        }
        await pg.evaluate(less => {
            const { G } = window.__skoldhast.debug;
            if (!G.has('b:k3_arrive') || G.busy) throw new Error('the arrival has not finished');
            G.lessMotion = less;
            G.goto('viken', { x: 19.5 * 200, y: -0.62 * 200, facing: 1 });
        }, lessMotion);
        await pg.waitForFunction(() => window.__skoldhast.debug.G.player.surface?.id === 'pier');
        await pg.keyboard.press('g');
        await pg.waitForFunction(expected => {
            const { view, ui } = window.__skoldhast.debug;
            if (view.vista?.phase !== 'holding' || !ui.dialogueOpen()) return false;
            const dialogue = document.querySelector('.sk-dialogue'), text = dialogue.querySelector('.sk-dlg-text');
            if (Number(getComputedStyle(dialogue).opacity) <= .999 || text.textContent !== expected || document.fonts.status !== 'loaded') return false;
            const r = dialogue.getBoundingClientRect();
            const free = s => { const b = s.getBounds(); return b.maxX < r.left || b.minX > r.right || b.maxY < r.top || b.minY > r.bottom; };
            return free(view.vista.lamp) && free(view.vista.reflection._lamp);
        }, STORY.k3.mirror[1], { timeout: 45000 });
        await pg.evaluate(() => window.__skoldhast.pause());
        const shown = await pg.evaluate(() => {
            const { G, view, ui } = window.__skoldhast.debug, v = view.vista;
            const bounds = s => { const b = s.getBounds(); return { x0: b.minX, x1: b.maxX, y0: b.minY, y1: b.maxY }; };
            const dialogue = document.querySelector('.sk-dialogue'), text = dialogue.querySelector('.sk-dlg-text');
            const rect = dialogue.getBoundingClientRect(), style = getComputedStyle(dialogue), ink = getComputedStyle(text);
            return { scene: G.sceneId, viewScene: view.sceneId, x: G.player.x, y: G.player.y,
                hidden: G.player.hidden, hiddenHero: G.hideHero, flags: [...G.flags].sort(), checkpoint: G.checkpoint,
                realLamp: { alpha: v.lamp.alpha, bounds: bounds(v.lamp) },
                reflectedLamp: { alpha: v.reflection._inner.alpha, bounds: bounds(v.reflection._lamp) },
                dialogue: { x0: rect.left, x1: rect.right, y0: rect.top, y1: rect.bottom,
                    opacity: Number(style.opacity), text: text.textContent, color: ink.color, paper: style.backgroundColor },
                dialogueOpen: ui.dialogueOpen(), controlsOff: ui.controls.classList.contains('off') };
        });
        assert.equal(shown.scene, 'viken');
        assert.equal(shown.viewScene, 'viken');
        assert.equal(shown.hidden, true);
        assert.equal(shown.hiddenHero, true);
        assert.equal(shown.dialogueOpen, true);
        assert.equal(shown.controlsOff, true);
        assert.ok(shown.dialogue.opacity > .98, 'capture the completed dialogue fade');
        assert.equal(shown.dialogue.text, STORY.k3.mirror[1], 'the entire explanation is visible');
        assert.ok(shown.realLamp.alpha < .1, 'the actual lamp is still dark');
        assert.ok(shown.reflectedLamp.alpha > .55, 'the mirror clearly shows the lit answer');
        for (const lamp of [shown.realLamp, shown.reflectedLamp]) {
            const b = lamp.bounds, d = shown.dialogue;
            assert.ok(b.x0 >= 0 && b.x1 <= width && b.y0 >= 0 && b.y1 <= height, 'both lamps fit on the phone');
            assert.ok(b.x1 < d.x0 || b.x0 > d.x1 || b.y1 < d.y0 || b.y0 > d.y1, 'dialogue never covers either lamp');
        }
        if (out) await pg.screenshot({ path: `${out}/p7-mirror-${width}x${height}.png` });
        await pg.evaluate(() => window.__skoldhast.resume());
        // A dialogue ignores presses for 350 ms after a line appears (no accidental
        // double taps), so press again like a player would until it closes.
        for (let n = 0; n < 12 && await pg.evaluate(() => window.__skoldhast.debug.ui.dialogueOpen()); n++) {
            await pg.keyboard.press('Space');
            await pg.waitForTimeout(250);
        }
        await pg.waitForFunction(() => {
            const { G, view, story } = window.__skoldhast.debug;
            return G.has('b:k3_mirror') && !story.running() && !view.vista;
        }, null, { timeout: 30000 });
        const returned = await pg.evaluate(() => {
            const { G, view, ui } = window.__skoldhast.debug;
            return { scene: G.sceneId, viewScene: view.sceneId, x: G.player.x, y: G.player.y, hidden: G.player.hidden,
                hiddenHero: !!G.hideHero, vista: !!G.vista, checkpoint: G.checkpoint, flags: [...G.flags].sort(),
                dialogue: ui.dialogueOpen(), controlsOff: ui.controls.classList.contains('off') };
        });
        assert.equal(returned.scene, shown.scene);
        assert.equal(returned.viewScene, shown.viewScene);
        assert.deepEqual([returned.x, returned.y], [shown.x, shown.y], 'the comparison never moves the hidden player');
        assert.equal(returned.hidden, true);
        assert.equal(returned.hiddenHero, false);
        assert.equal(returned.vista, false);
        assert.equal(returned.dialogue, false);
        assert.equal(returned.controlsOff, false);
        assert.equal(returned.checkpoint, 'pier', 'the completed mirror lesson records its authored checkpoint');
        for (const flag of shown.flags) assert.ok(returned.flags.includes(flag), 'the comparison preserves every discovery');
        assert.ok(!returned.flags.some(f => /^shutter|lamp_lit|p8_/.test(f)), 'looking does not solve a shutter or the final line');
        assert.deepEqual(errors, []);
        results.push({ viewport: `${width}x${height}`, lessMotion, shown, returned });
        await ctx.close();
    }
    if (out) fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
    console.log('P7 mirror stays visible through its dialogue and restores play at both phone sizes');
} finally { await browser.close(); server.close(); }
