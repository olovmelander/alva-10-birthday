#!/usr/bin/env node
/*
 * Browser check of the turning pages (src/pageturn.mjs, used by view.mjs):
 *   1. moving to another scene turns the old picture away like a page, and the page is gone after;
 *   2. when Kapitel 2 opens in the kelp forest, the white paper over the trench peels away;
 *   3. the end of Kapitel 2 turns to the lighthouse page and back, and the chapter ends.
 *
 *   node tests/browser/skoldhast-pages.mjs [--out <dir>]   (a screenshot mid-turn of each with --out)
 */
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const outIdx = process.argv.indexOf('--out');
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : null;
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
const errors = [];
pg.on('pageerror', (e) => errors.push(e.message));
// a beat that throws is caught by the story and logged: count those too
pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const D = (fn, a) => pg.evaluate(fn, a);
const turning = () => D(() => { const r = window.__skoldhast.debug.view.root; return r.children[r.children.length - 1].children.length > 0; });
const peeling = () => D(() => window.__skoldhast.debug.view.layers.cover.children.some((c) => c.label === 'page'));
const advance = () => D(() => {
    const d = window.__skoldhast.debug;
    if (d.ui.dialogueOpen()) d.ui.advance();
    if (d.ui.panelOpen()) d.ui.closePanel();
    return d.G.busy || d.story.running();
});
async function settle(max = 80) { for (let i = 0; i < max; i++) { const b = await advance(); if (!b && i > 3) return; await pg.waitForTimeout(200); } }
async function shotPaused(name) {
    if (!OUT) return;
    await D(() => window.__skoldhast.pause());
    await pg.screenshot({ path: `${OUT}/pages-${name}.png` });
    await D(() => window.__skoldhast.resume());
}

await pg.goto(`${base}/skoldhast/dev/play.html`, { waitUntil: 'load' });
await pg.waitForSelector('.sk-title');
await pg.getByText('Jag har en kod').click();
await pg.fill('.sk-code-input', 'kelp mås skal');
await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
await pg.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'kelp', null, { timeout: 30000 });
await settle();

// 1. kelp → land: a page turns over the new scene, then it is gone
await D(() => window.__skoldhast.debug.G.goto('land', 'fromKelp'));
await pg.waitForFunction(() => { const r = window.__skoldhast.debug.view.root; return r.children[r.children.length - 1].children.length > 0; }, null, { timeout: 5000, polling: 16 });
await shotPaused('1-scene');
await pg.waitForFunction(() => { const r = window.__skoldhast.debug.view.root; return r.children[r.children.length - 1].children.length === 0; }, null, { timeout: 10000 });
assert.equal(await D(() => window.__skoldhast.debug.view.sceneId), 'land', 'the new scene is on');

// 2. Kapitel 2 opens at the overlook: Klo speaks, then the white page over the trench peels away
await D(() => {
    const { G, view } = window.__skoldhast.debug;
    for (const f of ['ch2_open', 'b:k2_open', 'peeled_trench-paper']) G.flags.delete(f);
    G.goto('kelp', { x: 19.8 * 200, y: 3.2 * 200, facing: 1, mode: 'swim' }); view.setScene('kelp'); view.cam.snap = true;
});
await pg.waitForTimeout(500);
await D(() => window.__skoldhast.debug.G.flags.add('ch2_open'));
let sawPeel = false;
for (let i = 0; i < 300 && !sawPeel; i++) {
    if (await peeling()) { sawPeel = true; await pg.waitForTimeout(300); await shotPaused('2-peel'); break; }
    await advance();
    await pg.waitForTimeout(50);
}
assert.ok(sawPeel, 'the white paper over the trench turns like a page');
await settle();
assert.ok(await D(() => window.__skoldhast.debug.G.flags.has('peeled_trench-paper')), 'and it is gone for good');

// 3. both halves of the mark: the lighthouse page and back, then the chapter ends
await D(() => {
    const { G, view } = window.__skoldhast.debug;
    for (const f of ['p5_lit', 'p6_flat', 'mark_land', 'mark_sea', 'marks_both']) G.flags.add(f);
    G.goto('kelp', { x: 36.5 * 200, y: 8.4 * 200, facing: 1, mode: 'swim' }); view.setScene('kelp'); view.cam.snap = true;
});
await pg.waitForTimeout(500);
await D(() => window.__skoldhast.debug.G.emit('marksBoth', {}));
let turns = 0, wasTurning = false;
for (let i = 0; i < 600 && !(await D(() => window.__skoldhast.debug.G.flags.has('ch2_end'))); i++) {
    const t = await turning();
    if (t && !wasTurning) { turns++; await shotPaused('3-vista-' + turns); }
    wasTurning = t;
    await advance();
    await pg.waitForTimeout(50);
}
assert.ok(await D(() => window.__skoldhast.debug.G.flags.has('ch2_end')), 'Kapitel 2 ends after the glimpse');
assert.ok(turns >= 2, `a page turns to the lighthouse and back (${turns} turns seen)`);
assert.equal(await D(() => window.__skoldhast.debug.view.sceneId), 'kelp', 'back on the kelp page');

assert.deepEqual(errors, []);
console.log('the pages turn');
await browser.close();
server.close();
