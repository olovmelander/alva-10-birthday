#!/usr/bin/env node
/*
 * Sköldhästen's recorded voices in a real browser (Chromium): Äventyr 2's prologue at Alva's table
 * is played through with taps. Each caption and box fetches its clip as it is shown (the narrator
 * for captions, Mira and Alva for their lines), only then, and the prologue still reaches the nest:
 * waiting for a reading never holds the game up.
 *
 *   NODE_PATH=$(npm root -g) node tests/browser/skoldhast-voice.mjs
 */
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { voiceKey } from '../../skoldhast/src/voice-key.mjs';
import { TABLE } from '../../skoldhast/adventures/adventure-2/content/sv.mjs';

const server = await serve(), browser = await launch();
const url = `http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?adventure=2&debug`;
let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok -', name); }
    catch (err) { failures++; console.log('not ok -', name, '\n  ', err.message.split('\n').join('\n   ')); }
}

await check('the table is read aloud: the narrator, Mira and Alva, clip by clip, and the prologue reaches the nest', async () => {
    const p = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = [], fetched = [], early = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('response', (r) => {
        const m = /\/skoldhast\/voice\/([0-9a-f]{14})\.mp3$/.exec(r.url());
        if (m) fetched.push({ key: m[1], status: r.status(), type: r.headers()['content-type'] || '' });
    });
    await p.goto(url);
    await p.waitForSelector('.a2-title .sk-pbtn.primary', { timeout: 30000 });
    early.push(...fetched); // nothing is fetched before the first line is shown
    await p.click('.a2-title .sk-pbtn.primary');
    const t0 = Date.now();
    while (Date.now() - t0 < 240000) {
        const done = await p.evaluate(() => { const d = window.__skoldhast2?.debug; return d?.mode === 'play' && !d.table.shown; });
        if (done) break;
        if (await p.$('.sk-draw.on')) {
            await p.click('.sk-draw.on .sk-draw-example', { timeout: 2000, force: true }).catch(() => {});
            await p.waitForTimeout(1600);
            await p.click('.sk-draw.on .sk-draw-done', { timeout: 2000, force: true }).catch(() => {});
        } else if (await p.$('.sk-dialogue.on')) {
            await p.waitForTimeout(1200); // listen a little before tapping on
            await p.click('.sk-dialogue.on .sk-dlg-next', { timeout: 1000, force: true }).catch(() => {});
        }
        await p.waitForTimeout(150);
    }
    assert.ok(await p.evaluate(() => !window.__skoldhast2.debug.table.shown), 'the prologue ended');
    assert.deepEqual(early, [], 'no clip is part of the first download');
    const keys = new Set(fetched.map(f => f.key));
    const want = [['caption', TABLE.newPage], TABLE.ask, TABLE.yes, ['caption', TABLE.storm], TABLE.eggsAway];
    for (const [who, text] of want) assert.ok(keys.has(voiceKey(who, text)), `heard ${who}: ${text}`);
    for (const f of fetched) { assert.equal(f.status, 200); assert.match(f.type, /audio\/mpeg/); }
    assert.deepEqual(errors, []);
    console.log(`   ${fetched.length} clips fetched in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    await p.close();
});

await browser.close();
server.close();
if (failures) { console.log(`${failures} failed`); process.exit(1); }
console.log('all checks passed');
