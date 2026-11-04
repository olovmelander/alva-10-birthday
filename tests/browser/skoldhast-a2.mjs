#!/usr/bin/env node
/*
 * Äventyr 2 (Den magiska skogen) in a real browser, through the launcher's preview
 * (dev/play.html?adventure=2): the title, the whole prologue at Alva's table (Mira's
 * cloud drawn with "Rita åt mig"), the arrival at the nest, staged views of both
 * pages, and the finale from a saved game with all ten eggs: Mira's moon traced,
 * the hatching, the epilogue and the ending card, with the completion saved.
 *
 *   node tests/browser/skoldhast-a2.mjs [--out dir] [--quick]
 *
 * --quick skips the prologue (the slowest part under software WebGL).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const out = outArg >= 0 ? args[outArg + 1] : null;
const quick = args.includes('--quick');
if (out) fs.mkdirSync(out, { recursive: true });

const server = await serve(), browser = await launch();
const url = `http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?adventure=2&debug`;
const EGGS = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10'].map(e => 'egg_' + e);
const SEEN = ['arrive', 'firstEgg', 'grove', 'klyft', 'fors', 'beetle', 'magpie', 'seeds', 'leapSeen', 'tree', 'skogArrive', 'lightning',
    'love2', 'love4', 'love6', 'love8', 'climb', 'crown', 'allEggs'].map(b => 'b:' + b);
let failures = 0;

async function page(viewport, save) {
    const p = await browser.newPage({ viewport });
    p.errors = [];
    p.on('pageerror', e => p.errors.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') p.errors.push(m.text()); });
    if (save) await p.addInitScript((s) => {
        localStorage.setItem('skoldhast.v2.index', JSON.stringify({ slots: ['alva'], last: 'alva', deleted: [] }));
        localStorage.setItem('skoldhast.v2.slot.alva', JSON.stringify(s));
    }, save);
    await p.goto(url);
    await p.waitForSelector('.a2-title .sk-pbtn.primary', { timeout: 30000 });
    return p;
}
const profile = (flags, checkpoint = 'start') => ({ v: 2, contentVersion: 1, label: 'Alva', updated: 1, settings: {}, activeAdventure: 'adventure-2',
    completedAdventures: ['havet-mellan-sidorna'], adventures: { 'adventure-2': { contentVersion: 1, flags, checkpoint, puz: {}, strokes: null, ended: false } } });
const dbg = (p, fn, arg) => p.evaluate(fn, arg);
const shot = async (p, name) => { if (out) await p.screenshot({ path: path.join(out, name + '.png') }); };

/** Answers dialogue and drawing prompts until done() is true. */
async function playThrough(p, done, { maxSeconds = 240, onDraw = null, label = '' } = {}) {
    const end = Date.now() + maxSeconds * 1000;
    while (Date.now() < end) {
        if (await done()) return;
        if (await p.$('.sk-draw.on')) {
            await onDraw?.(await p.textContent('.sk-draw.on .sk-draw-prompt'));
            await p.click('.sk-draw.on .sk-draw-example', { timeout: 2000, force: true }).catch(() => {});
            await p.waitForTimeout(1600);
            await p.click('.sk-draw.on .sk-draw-done', { timeout: 2000, force: true }).catch(() => {});
        } else if (await p.$('.sk-panel.on .sk-ending')) {
            await p.click('.sk-panel.on .sk-ending .sk-pbtn.primary', { timeout: 2000, force: true }).catch(() => {});
        } else if (await p.$('.sk-dialogue.on')) {
            await p.waitForTimeout(380);
            await p.click('.sk-dialogue.on .sk-dlg-next', { timeout: 1000, force: true }).catch(() => {});
        }
        await p.waitForTimeout(150);
    }
    throw new Error('timed out: ' + label);
}

async function check(name, fn) {
    try { await fn(); console.log('ok -', name); }
    catch (err) { failures++; console.log('not ok -', name, '\n  ', err.message.split('\n').join('\n   ')); }
}

if (!quick) await check('the prologue at Alva\'s table leads to the nest (844×390)', async () => {
    const p = await page({ width: 844, height: 390 });
    await shot(p, 'a2-title-844x390');
    await p.click('.a2-title .sk-pbtn.primary');
    const drawn = [];
    await playThrough(p, () => dbg(p, () => { const d = window.__skoldhast2?.debug; return d?.mode === 'play' && !d.table.shown; }),
        { label: 'prologue', onDraw: async (prompt) => { drawn.push(prompt); await shot(p, `a2-draw${drawn.length}-844x390`); } });
    assert.ok(drawn.some(t => /Alva/.test(t)) && drawn.some(t => /Miras/.test(t)), 'the player draws with Alva\'s pencil (the first egg) and Mira\'s (the cloud): ' + drawn.join(' | '));
    await playThrough(p, () => dbg(p, () => { const { G, story } = window.__skoldhast2.debug; return G.flags.has('b:arrive') && !story.running() && !G.busy; }), { label: 'arrival' });
    const st = await dbg(p, () => { const { G } = window.__skoldhast2.debug; return { scene: G.sceneId, tukan: G.actors.tukan?.visible, klo: G.actors.klo?.visible, clues: [...G.flags].filter(f => f.startsWith('clue_')) }; });
    assert.equal(st.scene, 'strand'); assert.ok(st.tukan && st.klo, 'Tukankrabban and Klo are at the nest');
    assert.ok(st.clues.includes('clue_moonRule'));
    const eggs = await p.textContent('.a2-eggs');
    assert.match(eggs, /0 av 10/);
    await shot(p, 'a2-arrival-844x390');
    assert.deepEqual(p.errors, []);
    await p.close();
});

await check('both pages draw at phone portrait size (390×844)', async () => {
    const views = [['strand', 28.2, -0.39, -1], ['strand', 16.5, -0.6, -1], ['strand', 69.3, -1.95, -1], ['skog', 90.3, -0.6, -1], ['skog', 17, -6.58, 1]];
    const p = await page({ width: 390, height: 844 }, profile([...SEEN, 'p2_bridge', 'p7_vine']));
    await p.click('.a2-title .sk-pbtn.primary');
    await p.waitForFunction(() => window.__skoldhast2?.debug?.mode === 'play', null, { timeout: 20000 });
    for (const [scene, x, y, facing] of views) {
        await dbg(p, ([scene, x, y, facing]) => { const { G, view } = window.__skoldhast2.debug; G.goto(scene, { x: x * 200, y: y * 200, facing }); view.cam.snap = true; }, [scene, x, y, facing]);
        await p.waitForTimeout(1500);
        const r = await dbg(p, () => { const { G, view } = window.__skoldhast2.debug; const s = view.heroScreen(); return { scene: view.sceneId, x: s.x, y: s.y, w: innerWidth, h: innerHeight, sceneG: G.sceneId }; });
        assert.equal(r.scene, r.sceneG, 'the view shows the page the game is on');
        assert.ok(r.x > 0 && r.x < r.w && r.y > 0 && r.y < r.h, `the sköldhäst is on screen at ${scene} ${x}`);
        await shot(p, `a2-${scene}-${x}-390x844`);
    }
    assert.deepEqual(p.errors, []);
    await p.close();
});

await check('the finale: ten eggs in the nest, Mira\'s moon, the hatching, the table, completion saved (1440×900)', async () => {
    const p = await page({ width: 1440, height: 900 }, profile([...SEEN, ...EGGS, 'p2_bridge', 'p7_vine', 'p4_lit', 'cloud_met', 'coin_got', 'coin_given', 'clue_cloudCries', 'clue_afraid']));
    await p.click('.a2-title .sk-pbtn.primary');
    await p.waitForFunction(() => window.__skoldhast2?.debug?.mode === 'play', null, { timeout: 20000 });
    const before = await dbg(p, () => window.__skoldhast2.debug.story.objective().id);
    assert.equal(before, 'nest', 'the goal is the nest');
    // walk to the nest with the real keyboard
    await p.keyboard.down('ArrowLeft');
    await p.waitForFunction(() => window.__skoldhast2.debug.G.areas.has('nest') || window.__skoldhast2.debug.story.running(), null, { timeout: 15000 });
    await p.keyboard.up('ArrowLeft');
    const traced = [];
    let sawHatch = false, sawTable = false;
    await playThrough(p, async () => {
        const s = await dbg(p, () => { const { G, table } = window.__skoldhast2.debug; return { ended: G.flags.has('ended'), hatched: G.flags.has('hatched'), table: table.shown }; });
        if (s.hatched && !sawHatch) { sawHatch = true; await shot(p, 'a2-hatched-1440x900'); }
        if (s.table && !sawTable) { sawTable = true; await p.waitForTimeout(1500); await shot(p, 'a2-epilogue-1440x900'); }
        return s.ended && !s.table && !(await p.$('.sk-panel.on')) && !(await p.$('.sk-dialogue.on')) && (await dbg(p, () => !window.__skoldhast2.debug.story.running()));
    }, { label: 'finale', maxSeconds: 300, onDraw: async (prompt) => { traced.push(prompt); await shot(p, `a2-finale-draw${traced.length}-1440x900`); } });
    assert.ok(/Mira/.test(traced[0]) && /Alva/.test(traced[1]), 'Mira traces the moon, then Alva the stars: ' + traced.join(' | '));
    assert.ok(sawHatch && sawTable, 'the eggs hatch and the table shows the page');
    await p.waitForTimeout(1500);
    await shot(p, 'a2-moonlit-1440x900');
    const saved = await dbg(p, () => JSON.parse(localStorage.getItem('skoldhast.v2.slot.alva')));
    assert.ok(saved.completedAdventures.includes('adventure-2'), 'finishing saves the completion');
    assert.ok(saved.adventures['adventure-2'].ended);
    const st = await dbg(p, () => { const { G } = window.__skoldhast2.debug; return { storm: G.storm, obj: window.__skoldhast2.debug.story.objective().id }; });
    assert.equal(st.storm, 0); assert.equal(st.obj, 'free');
    assert.deepEqual(p.errors, []);
    await p.close();
});

await browser.close(); server.close();
if (failures) { console.log(`${failures} check(s) failed`); process.exit(1); }
console.log('all checks passed');
