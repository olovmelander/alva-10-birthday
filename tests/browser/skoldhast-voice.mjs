#!/usr/bin/env node
/*
 * Sköldhästen's recorded voices in a real browser (Chromium): Äventyr 2's prologue at Alva's table
 * is played through with taps. Each caption and box fetches its clip as it is shown (the narrator
 * for captions, Mira and Alva for their lines), only then, and the prologue still reaches the nest:
 * waiting for a reading never holds the game up. And a box waits for a thought still being said
 * to end, so nobody is cut off mid-sentence.
 *
 *   NODE_PATH=$(npm root -g) node tests/browser/skoldhast-voice.mjs
 */
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { voiceKey } from '../../skoldhast/src/voice-key.mjs';
import { TABLE, STORY } from '../../skoldhast/adventures/adventure-2/content/sv.mjs';

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

await check('nobody is cut off mid-sentence: Klo\'s box waits for the sköldhäst\'s thought to end, then speaks', async () => {
    const SEEN = ['arrive', 'firstEgg', 'grove', 'klyft', 'fors', 'beetle', 'magpie', 'seeds', 'leapSeen', 'tree', 'skogArrive', 'lightning',
        'love2', 'love4', 'love6', 'love8', 'climb', 'crown', 'allEggs'].map(b => 'b:' + b);
    const save = { v: 2, contentVersion: 1, label: 'Alva', updated: 1, settings: {}, activeAdventure: 'adventure-2', completedAdventures: ['havet-mellan-sidorna'],
        adventures: { 'adventure-2': { contentVersion: 1, flags: SEEN, checkpoint: 'start', puz: {}, strokes: null, ended: false } } };
    const p = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript((s) => {
        localStorage.setItem('skoldhast.v2.index', JSON.stringify({ slots: ['alva'], last: 'alva', deleted: [] }));
        localStorage.setItem('skoldhast.v2.slot.alva', JSON.stringify(s));
    }, save);
    await p.goto(url);
    await p.waitForSelector('.a2-title .sk-pbtn.primary', { timeout: 30000 });
    await p.click('.a2-title .sk-pbtn.primary');
    await p.waitForFunction(() => { const d = window.__skoldhast2?.debug; return d?.mode === 'play' && !d.story.running() && !d.G.busy; }, null, { timeout: 30000 });
    const thought = STORY.thinRule, line = STORY.medvind.find(([who]) => who === 'klo')[1];
    const r = await p.evaluate(async ([thought, line]) => {
        const { ui } = window.__skoldhast2.debug, v = ui.voice, wait = ms => new Promise(res => setTimeout(res, ms));
        await v.ready;
        const t0 = performance.now();
        ui.guide.think(thought);
        const spoke = v.speaking;
        void ui.say([['klo', line]]); // the story moves on while the sköldhäst is still thinking aloud
        let boxAt = null, endAt = null;
        for (let i = 0; i < 600 && boxAt === null; i++) {
            if (endAt === null && v.speaking !== 'aside') endAt = performance.now() - t0;
            if (ui.dialogueOpen()) boxAt = performance.now() - t0;
            await wait(20);
        }
        await wait(300);
        return { spoke, clip: v.seconds('horse', thought) * 1000, boxAt, endAt, then: v.speaking };
    }, [thought, line]);
    assert.equal(r.spoke, 'aside', 'the thought is said aloud');
    assert.ok(r.boxAt !== null && r.endAt !== null && r.endAt <= r.boxAt + 40, `the box opens once the thought has ended (${Math.round(r.endAt)} ms, box ${Math.round(r.boxAt)} ms)`);
    assert.ok(r.boxAt >= r.clip - 400, `the thought is heard to its end (${Math.round(r.clip)} ms clip)`);
    assert.equal(r.then, 'say', "then Klo's own line is spoken");
    assert.deepEqual(errors, []);
    await p.close();
});

await browser.close();
server.close();
if (failures) { console.log(`${failures} failed`); process.exit(1); }
console.log('all checks passed');
