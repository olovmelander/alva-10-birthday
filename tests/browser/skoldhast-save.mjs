#!/usr/bin/env node
/*
 * Browser check of saving and continuing (plan §8.6): a word code restores the end of Kapitel 1
 * and saves; after closing and reopening, the title offers Fortsätt, which continues at the saved
 * checkpoint with the story intact (no beat replays, Kapitel 2 open).
 *
 *   node tests/browser/skoldhast-save.mjs
 */
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const pg = await ctx.newPage();
const errors = [];
pg.on('pageerror', (e) => errors.push(e.message));
await pg.goto(`${base}/skoldhast/dev/play.html`, { waitUntil: 'load' });
await pg.waitForSelector('.sk-title');
assert.equal(await pg.locator('.sk-title button', { hasText: 'Fortsätt' }).count(), 0, 'no Fortsätt without a save');
await pg.getByText('Jag har en kod').click();
await pg.fill('.sk-code-input', 'KELP MÅS SKAL');
await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
await pg.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'kelp', null, { timeout: 30000 });
// let the chapter opening play (tap through), then close: close() saves
for (let i = 0; i < 30; i++) {
    const busy = await pg.evaluate(() => { const d = window.__skoldhast.debug; if (d.ui.dialogueOpen()) d.ui.advance(); return d.G.busy || d.story.running(); });
    if (!busy && i > 3) break;
    await pg.waitForTimeout(300);
}
const before = await pg.evaluate(() => { const { G } = window.__skoldhast.debug; return { cp: G.checkpoint, flags: [...G.flags].sort() }; });
await pg.evaluate(() => window.__skoldhast.close());
// a fresh open, like coming back another day
await pg.evaluate(() => window.__skoldhast.open());
await pg.waitForSelector('.sk-title');
const cont = pg.locator('.sk-title button', { hasText: 'Fortsätt' });
assert.equal(await cont.count(), 1, 'the title offers Fortsätt');
await cont.click();
await pg.waitForFunction(() => window.__skoldhast.debug.G?.sceneId, null, { timeout: 30000 });
await pg.waitForTimeout(1500);
const after = await pg.evaluate(() => {
    const { G, story, ui } = window.__skoldhast.debug;
    return { scene: G.sceneId, cp: G.checkpoint, flags: [...G.flags].sort(), dialogue: ui.dialogueOpen(), beat: story.running() };
});
assert.equal(after.cp, before.cp, 'same checkpoint');
for (const f of before.flags) assert.ok(after.flags.includes(f), `flag ${f} kept`);
assert.ok(after.flags.includes('ch2_open'), 'Kapitel 2 is open');
assert.equal(after.dialogue, false, 'no story beat replays on continue');
assert.deepEqual(errors, []);
console.log('save and continue work');
await browser.close();
server.close();
