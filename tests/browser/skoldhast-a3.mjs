#!/usr/bin/env node
/*
 * Äventyr 3 (De försvunna stjärnorna) in a real browser, through the launcher's preview (dev/play.html?adventure=3):
 * the title; saved games on each of the five pages and in the climax; the big pictures staged from the debug handle;
 * and the ending with the finished sky. Every page must open without page errors and show the sköldhäst.
 *
 *   node tests/browser/skoldhast-a3.mjs [--out dir] [--only <words in a check's name>] [--sizes phone,side,desk]
 *
 * (Design section 19: the three sizes, the seven big pictures, the climax's states. Run two or three browser checks
 * at once at most on Pappa's PC: software WebGL is slow.)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const out = outArg >= 0 ? args[outArg + 1] : null;
const onlyArg = args.indexOf('--only');
const only = onlyArg >= 0 ? args[onlyArg + 1] : null;
const sizesArg = args.indexOf('--sizes');
const SIZES = { phone: { width: 390, height: 844 }, side: { width: 844, height: 390 }, desk: { width: 1440, height: 900 } };
const sizes = (sizesArg >= 0 ? args[sizesArg + 1].split(',') : ['phone']).map(s => [s, SIZES[s]]);
if (out) fs.mkdirSync(out, { recursive: true });

const server = await serve(), browser = await launch();
const url = `http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?adventure=3&debug`;
const LIGHTS = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'].map(id => 'light_' + id);
let failures = 0;

const openPages = new Set();
async function page(viewport, save) {
    const p = await browser.newPage({ viewport });
    openPages.add(p); p.on('close', () => openPages.delete(p));
    p.errors = [];
    p.on('pageerror', e => p.errors.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) p.errors.push(m.text()); });
    if (save) await p.addInitScript((s) => {
        localStorage.setItem('skoldhast.v2.index', JSON.stringify({ slots: ['alva'], last: 'alva', deleted: [] }));
        localStorage.setItem('skoldhast.v2.slot.alva', JSON.stringify(s));
    }, save);
    await p.goto(url);
    await p.waitForSelector('.a3-title .sk-pbtn.primary', { timeout: 40000 });
    return p;
}
const profile = (flags, checkpoint, extra = {}) => ({ v: 2, contentVersion: 1, label: 'Alva', updated: 1, settings: {}, activeAdventure: 'adventure-3',
    completedAdventures: ['havet-mellan-sidorna', 'adventure-2'],
    adventures: { 'adventure-3': { contentVersion: 1, flags: ['b:arrive', ...flags], checkpoint, puz: extra.puz || {}, strokes: null, ended: !!extra.ended } } });
const dbg = (p, fn, arg) => p.evaluate(fn, arg);
const shot = async (p, name) => { if (out) await p.screenshot({ path: path.join(out, name + '.png') }); };
async function cont(p) {
    await p.click('.a3-title .sk-pbtn.primary');
    await p.waitForFunction(() => window.__skoldhast3?.debug?.mode === 'play', null, { timeout: 30000 });
    await p.waitForTimeout(1500);
}
async function check(name, fn) {
    if (only && !name.includes(only)) return;
    const t0 = Date.now();
    try { await fn(); console.log(`ok   ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
    catch (err) { failures++; console.log(`FAIL ${name}\n     ${String(err.stack || err).split('\n').slice(0, 4).join('\n     ')}`); }
    finally { for (const p of [...openPages]) await p.close().catch(() => {}); }
}

const MOON = ['breakfast', 'b:breakfast', 'b:hypothesis1', 'visited_mane'];
const AFTER_MOON = [...MOON, 'm5_view', 'b:view', 'fin_drawn', 'b:fin', 'light_l1', 'light_l2', 'light_l3', 'beam_used'];
const PAGES = [
    ['the Moon', [...MOON], 'start'],
    ['the night side', [...MOON, 'light_l1', 'beam_used'], 'night'],
    ['the view', [...MOON, 'light_l1', 'light_l2', 'light_l3', 'beam_used'], 'view'],
    ['the constellations', [...AFTER_MOON, 'visited_stjarn', 'b:stjarnArrive'], 'dock'],
    ['the bear', [...AFTER_MOON, 'visited_stjarn', 'b:stjarnArrive', 'wagon_drawn', 'belt_lit', 'light_l4'], 'bear'],
    ['the ring planet', [...AFTER_MOON, 'visited_ring', 'b:ringArrive', 'b:ringo'], 'icedock'],
    ['the white', [...AFTER_MOON, ...LIGHTS.slice(0, 9), 'visited_sudd', 'b:suddArrive', 'rocket_gone'], 'whiteEdge'],
    ['the great gallop', [...AFTER_MOON, ...LIGHTS, 'rocket_gone', 'self_drawn', 'tenth_drawn', 'ride', 'moon_bitten'], 'tailTip']
];

for (const [sizeName, viewport] of sizes) {
    await check(`${sizeName}: the title page`, async () => {
        const p = await page(viewport);
        await shot(p, `${sizeName}-title`);
        assert.deepEqual(p.errors, []);
    });
    for (const [name, flags, cp] of PAGES) {
        await check(`${sizeName}: ${name}`, async () => {
            const p = await page(viewport, profile(flags, cp));
            await cont(p);
            const s = await dbg(p, () => { const d = window.__skoldhast3.debug; return { scene: d.G.sceneId, mode: d.mode, hero: !!d.view?.world }; });
            assert.equal(s.mode, 'play', 'playing');
            await p.waitForTimeout(800);
            await shot(p, `${sizeName}-${name.replace(/\W+/g, '-')}`);
            assert.deepEqual(p.errors, [], 'no page errors on ' + name);
        });
    }
    await check(`${sizeName}: the climax`, async () => {
        const flags = [...AFTER_MOON, ...LIGHTS.slice(0, 9), 'visited_sudd', 'b:suddArrive', 'rocket_gone', 'dent1', 'dent2', 'dent3', 'dent4',
            'fog1_lit', 'fog2_lit', 'fog3_lit', 'fogd1', 'fogd2', 'fogd3', 'bridge_refused', 'bridge_crossed'];
        const p = await page(viewport, profile(flags, 'crumbs'));
        await cont(p);
        // up the hill to where it begins, below Suddet at the Moon's rim
        await dbg(p, () => { const G = window.__skoldhast3.debug.G; G.goto('sudd', { x: 70 * 200, y: -1.4 * 200, facing: 1 }); });
        // the scene plays by itself: through the bites to the outline rubbed out (lines advance at once)
        for (let i = 0; i < 240; i++) {
            const st = await dbg(p, () => { const d = window.__skoldhast3.debug; if (d.ui.dialogueOpen()) d.ui.advance(); return { gone: d.G.flags.has('outline_gone'), busy: d.G.busy, bites: d.G.moon?.bites }; });
            if (st.bites === 3 && i % 10 === 0) await shot(p, `${sizeName}-climax-${i}`);
            if (st.gone && !st.busy) break;
            await p.waitForTimeout(250);
        }
        await shot(p, `${sizeName}-climax-outline-gone`);
        assert.ok(await dbg(p, () => window.__skoldhast3.debug.G.flags.has('outline_gone')), 'the outline is rubbed out');
        assert.deepEqual(p.errors, []);
    });
    await check(`${sizeName}: the ending's sky`, async () => {
        const flags = [...AFTER_MOON, ...LIGHTS, 'rocket_gone', 'self_drawn', 'tenth_drawn', 'ride', 'ride_done', 'caught', 'moon_bitten', 'moon_whole',
            'lights_home', 'gold', 'constellation', 'notes_ink', 'telescope', 'ended', 'b:finale'];
        const p = await page(viewport, profile(flags, 'home', { ended: true }));
        await cont(p);
        await shot(p, `${sizeName}-ended`);
        await dbg(p, () => window.__skoldhast3.debug.G.emit('openTravel', {}));
        await p.waitForTimeout(600);
        await shot(p, `${sizeName}-travel`);
        assert.deepEqual(p.errors, []);
    });
}

await browser.close();
server.close();
if (failures) { console.log(`${failures} check(s) failed`); process.exit(1); }
console.log('all checks passed');
