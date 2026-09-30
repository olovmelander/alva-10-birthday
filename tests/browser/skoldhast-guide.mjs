#!/usr/bin/env node
/*
 * Browser check of the explicitly enabled Guida mig mode (src/guide.mjs):
 * through Alva's table (the pencil prompts are confirmed with Enter), then Kapitel 1 must say
 * what to do at every step without a word from anyone:
 *   - the goal note asks for a gallop past Klo, and a tip explains the gallop;
 *   - Klo's hint bubble speaks up by itself;
 *   - after the stopwatch the goal turns to hiding, and hiding by the hole makes Klo say Ja;
 *   - a refusal shows a thought bubble.
 *
 *   node tests/browser/skoldhast-guide.mjs [--out <dir>]   (screenshots of each step with --out)
 */
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { GOALS, TIPS, STORY, BALK } from '../../skoldhast/src/content/sv.mjs';

const outIdx = process.argv.indexOf('--out');
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
const errors = [];
pg.on('pageerror', (e) => errors.push(e.message));
const D = (fn, a) => pg.evaluate(fn, a);
const shot = async (name) => { if (OUT) await pg.screenshot({ path: `${OUT}/guide-${name}.png` }); };
const text = (sel) => pg.locator(sel).first().textContent();

await pg.goto(`${base}/skoldhast/dev/play.html`, { waitUntil: 'load' });
await pg.waitForSelector('.sk-title');
await D(() => window.__skoldhast.debug.ui.settings());
await pg.locator('.sk-radio').filter({ has: pg.locator('input[value="guided"]') }).click();
await D(() => window.__skoldhast.debug.ui.closePanel());
await pg.locator('.sk-title button').first().click(); // Börja
await pg.waitForFunction(() => { const b = document.querySelector('.sk-notes-skip'); b?.click(); return !!b || !!document.querySelector('.sk-draw.on'); }, null, { timeout: 60000, polling: 100 }); // skip Alva's notes (skoldhast-notes.mjs plays them)

// Alva's table: tap through the words, confirm the pencil prompts with Enter, take the first choice
for (let i = 0; i < 400; i++) {
    const s = await D(() => {
        const d = window.__skoldhast.debug;
        if (d.ui.dialogueOpen()) d.ui.advance();
        return { intro: d.G?.flags.has('intro_done'), draw: !!document.querySelector('.sk-draw.on'), choice: !!document.querySelector('.sk-choice.on button') };
    });
    if (s.intro) break;
    if (s.draw) await pg.keyboard.press('Enter');
    if (s.choice) await pg.locator('.sk-choice.on button').first().click();
    await pg.waitForTimeout(150);
}
assert.ok(await D(() => window.__skoldhast.debug.G.flags.has('intro_done')), 'the table leads into Kapitel 1');

// Kapitel 1 begins: the goal note and the gallop tip
await pg.waitForFunction(() => !window.__skoldhast.debug.G.busy && document.querySelector('.sk-goal:not(.empty)'), null, { timeout: 20000 });
assert.equal(await text('.sk-goal-text'), GOALS.explore, 'the goal note asks for a gallop past Klo');
await pg.waitForFunction(() => document.querySelector('.sk-tip.on'), null, { timeout: 10000 });
assert.equal(await text('.sk-tip-text'), TIPS.gallop.keys, 'a tip explains how to gallop');
await pg.waitForFunction(() => document.querySelector('.sk-hintbubble.on'), null, { timeout: 10000 });
assert.equal(await text('.sk-hint-text'), STORY.k1.enterHint, 'Klo says what he wants');
await shot('1-start');

// gallop west past Klo: the stopwatch, then Klo hides and the goal turns to hiding
await pg.keyboard.down('ArrowLeft');
await pg.waitForFunction(() => window.__skoldhast.debug.G.flags.has('klo_hidden') || window.__skoldhast.debug.G.busy, null, { timeout: 20000 });
await pg.keyboard.up('ArrowLeft');
for (let i = 0; i < 200; i++) {
    const s = await D(() => { const d = window.__skoldhast.debug; if (d.ui.dialogueOpen()) d.ui.advance(); return d.G.flags.has('klo_hidden') && !d.G.busy && !d.story.running(); });
    if (s) break;
    await pg.waitForTimeout(150);
}
await pg.waitForFunction((t) => document.querySelector('.sk-goal-text')?.textContent === t, GOALS.hide, { timeout: 10000 });
await shot('2-hide-goal');

// walk back to the hole, stop, hide: Klo says Ja
const hole = await D(() => window.__skoldhast.debug.G.sceneDef.spots.kloHole.x);
for (let i = 0; i < 400; i++) {
    const s = await D(() => { const { G } = window.__skoldhast.debug; return { x: G.player.x, vx: G.player.vx }; });
    const dx = hole - s.x;
    if (Math.abs(dx) < 60 && Math.abs(s.vx) < 20) break;
    const key = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
    await pg.keyboard.down(key); await pg.waitForTimeout(Math.min(120, Math.abs(dx) / 4)); await pg.keyboard.up(key);
    await pg.waitForTimeout(120);
}
await pg.keyboard.press('g');
for (let i = 0; i < 300; i++) {
    const s = await D(() => { const d = window.__skoldhast.debug; if (d.ui.dialogueOpen()) d.ui.advance(); return d.G.flags.has('klo_ja'); });
    if (s) break;
    await pg.waitForTimeout(150);
}
assert.ok(await D(() => window.__skoldhast.debug.G.flags.has('klo_ja')), 'hiding by the hole makes Klo come out and say Ja');

// a refusal shows a thought bubble with the reason
await D(() => { const { G } = window.__skoldhast.debug; G.emit('balk', { reason: 'thin', id: 'test' }); });
await pg.waitForFunction(() => document.querySelector('.sk-think.on'), null, { timeout: 5000 });
assert.equal(await text('.sk-think-text'), BALK.thin);
await shot('3-think');

assert.deepEqual(errors, []);
console.log('the first minutes are guided');
await browser.close();
server.close();
