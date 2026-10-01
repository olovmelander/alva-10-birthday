#!/usr/bin/env node
/*
 * Browser check of saving and continuing (plan §8.6): a word code restores the end of Kapitel 1
 * and saves; after closing and reopening, the title offers Fortsätt, which continues at the saved
 * checkpoint with the story intact (no beat replays, Kapitel 2 open). Requested Klo clues
 * survive too, while an active conversation, suspension and target marker do not.
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
// Let the chapter opening play (tap through). Then request precise help and
// close the game while that conversation is still actively suspending play.
for (let i = 0; i < 30; i++) {
    const busy = await pg.evaluate(() => { const d = window.__skoldhast.debug; if (d.ui.dialogueOpen()) d.ui.advance(); return d.G.busy || d.story.running(); });
    if (!busy && i > 3) break;
    await pg.waitForTimeout(300);
}
await pg.waitForFunction(() => {
    const { G, story, ui } = window.__skoldhast.debug;
    const call = document.querySelector('.sk-klo-call');
    return !G.busy && !story.running() && !ui.dialogueOpen() && call && !call.hidden && !call.disabled;
}, null, { timeout: 30000 });
await pg.locator('.sk-klo-call').click();
await pg.waitForFunction(() => window.__skoldhast.debug.companion.phase === 'talking');
for (let level = 1; level <= 3; level++) {
    await pg.locator('[data-choice="hint"]').click();
    assert.equal(await pg.evaluate(() => window.__skoldhast.debug.companion.journal().level), level);
}
const before = await pg.evaluate(() => {
    const { G, companion } = window.__skoldhast.debug;
    const help = companion.journal();
    return { cp: G.checkpoint, flags: [...G.flags].sort(), key: help.key, depth: help.level,
        hints: companion.serialize(), phase: companion.phase, suspended: companion.suspended(), marker: companion.markerActive() };
});
assert.equal(before.phase, 'talking');
assert.equal(before.suspended, true, 'save from an active conversation, not an already closed visit');
assert.equal(before.marker, true, 'precise help has authorized a temporary world target');
assert.ok(before.hints.some(([key, depth]) => key === before.key && depth === 3));
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
    const { G, story, ui, companion } = window.__skoldhast.debug;
    const help = companion.journal();
    return { scene: G.sceneId, cp: G.checkpoint, flags: [...G.flags].sort(), dialogue: ui.dialogueOpen(), beat: story.running(),
        key: help.key, depth: help.level, text: help.text, instruction: help.instruction, hints: companion.serialize(),
        phase: companion.phase, visit: companion.visit, suspended: companion.suspended(), marker: companion.markerActive(),
        actorVisit: !!G.actors.klo.companion, time: G.time };
});
assert.equal(after.cp, before.cp, 'same checkpoint');
for (const f of before.flags) assert.ok(after.flags.includes(f), `flag ${f} kept`);
assert.ok(after.flags.includes('ch2_open'), 'Kapitel 2 is open');
assert.equal(after.dialogue, false, 'no story beat replays on continue');
assert.equal(after.key, before.key, 'continuing at the checkpoint resumes the same help task');
assert.equal(after.depth, before.depth, 'the requested third clue survives close and reopen');
assert.deepEqual(after.hints, before.hints, 'main saves and restores the bounded clue memory');
assert.equal(after.text, after.instruction, 'the journal remembers the previously requested exact answer');
assert.equal(after.phase, 'idle');
assert.equal(after.visit, null, 'a visit is never restored from the save');
assert.equal(after.suspended, false, 'continuing cannot inherit a reading suspension');
assert.equal(after.marker, false, 'saved clue depth does not automatically restore world markers');
assert.equal(after.actorVisit, false, 'the story owns Klo again after loading');
assert.equal(await pg.locator('.sk-klo-layer').isVisible(), false);
await pg.waitForFunction(time => window.__skoldhast.debug.G.time > time + .05, after.time,
    { timeout: 10000 });
// The rendered journal uses the same restored depth, without replaying a visit
// or spending another clue merely because its page was opened.
await pg.locator('.sk-journal-btn').click();
await pg.locator('.sk-j-tab').nth(2).click(); // the remembered-help page, after cover and field note
await pg.waitForSelector('.sk-j-known .sk-j-help');
assert.equal(await pg.locator('.sk-j-known .sk-j-help').textContent(), 'Visa ledtråden igen');
assert.equal(await pg.locator('.sk-j-known .sk-j-margin').textContent(), after.text);
assert.equal(await pg.evaluate(() => window.__skoldhast.debug.companion.markerActive()), false);
await pg.keyboard.press('Escape');
assert.deepEqual(errors, []);
console.log('save and continue preserve story and requested clues without restoring a transient Klo visit');
await browser.close();
server.close();
