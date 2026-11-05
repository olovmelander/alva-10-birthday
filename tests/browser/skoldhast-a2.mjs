#!/usr/bin/env node
/*
 * Äventyr 2 (Den magiska skogen) in a real browser, through the launcher's preview
 * (dev/play.html?adventure=2): the title, the whole prologue at Alva's table (Mira's
 * cloud drawn with "Rita åt mig"), the arrival at the nest, staged views of all
 * four pages (Flodstranden, Djupa skogen, Kristallgrottan, Åsktoppen), and the
 * finale from a saved game with all ten eggs: Mira's moon traced, Alva's stars,
 * the hatching, the epilogue and the ending card, with the completion saved.
 *
 *   node tests/browser/skoldhast-a2.mjs [--out dir] [--quick] [--only <words in a check's name>]
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
const onlyArg = args.indexOf('--only');
const only = onlyArg >= 0 ? args[onlyArg + 1] : null;
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
    if (only && !name.includes(only)) return;
    try { await fn(); console.log('ok -', name); }
    catch (err) { failures++; console.log('not ok -', name, '\n  ', err.message.split('\n').join('\n   ')); }
}

if (!quick) await check('the prologue at Alva\'s table leads to the nest (844×390)', async () => {
    const p = await page({ width: 844, height: 390 });
    await shot(p, 'a2-title-844x390');
    // The sköldhäst that gallops in at the table must stand on its hooves. On 5 November its hooves reached for a
    // ground at the page's top (groundAt 0 under y 500), so it galloped in with its legs in the air.
    await dbg(p, () => {
        const legs = window.__a2Legs = { frames: 0, upside: 0 };
        const find = (n, test, found = []) => { if (test(n)) found.push(n); n.children?.forEach(c => find(c, test, found)); return found; };
        const tick = () => {
            const d = window.__skoldhast2?.debug, table = d && find(d.app.stage, n => n.label === 'a2-table')[0];
            for (const hero of table ? find(table, n => n.label === 'hero' && n.alpha > 0.3) : []) {
                const y = n => hero.toLocal(n.getGlobalPosition()).y;
                const head = find(hero, n => n.label === 'head')[0], hooves = find(hero, n => /\.hoof$/.test(n.label || ''));
                legs.frames++;
                // standing or galloping, every hoof is far below the head (about 200 below it in the hero's frame)
                if (!head || hooves.length !== 4 || hooves.some(h => y(h) < y(head) + 100)) legs.upside++;
            }
            requestAnimationFrame(tick);
        };
        tick();
    });
    await p.click('.a2-title .sk-pbtn.primary');
    const drawn = [];
    await playThrough(p, () => dbg(p, () => { const d = window.__skoldhast2?.debug; return d?.mode === 'play' && !d.table.shown; }),
        { label: 'prologue', onDraw: async (prompt) => { drawn.push(prompt); await shot(p, `a2-draw${drawn.length}-844x390`); } });
    assert.ok(drawn.some(t => /Alva/.test(t)) && drawn.some(t => /Miras/.test(t)), 'the player draws with Alva\'s pencil (the first egg) and Mira\'s (the cloud): ' + drawn.join(' | '));
    const legs = await dbg(p, () => window.__a2Legs);
    assert.ok(legs.frames > 10, `the sköldhäst gallops in at the table (${legs.frames} frames)`);
    assert.equal(legs.upside, 0, `the sköldhäst gallops in on its hooves (${legs.upside} of ${legs.frames} frames with a hoof up by its head)`);
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

await check('all four pages draw at phone portrait size (390×844)', async () => {
    const views = [['strand', 28.2, -0.39, -1], ['strand', 16.5, -0.6, -1], ['strand', 69.3, -1.95, -1], ['skog', 90.3, -0.6, -1], ['skog', 17, -6.58, 1],
        ['kristall', 3.0, -0.42, 1], ['kristall', 35, 2.2, 1], ['kristall', 56, -0.45, 1], ['topp', 12.6, -1.6, 1], ['topp', 49, -6.75, 1]];
    const p = await page({ width: 390, height: 844 }, profile([...SEEN, 'p2_bridge', 'p7_vine', 'p4_lit', 'lantern', 'storm_source', 'cave_reached',
        'b:kristall', 'b:caveLit', 'b:plates', 'b:lake', 'b:glitter', 'b:topp', 'b:gustSoon', 'b:windKlo', 'b:summit', 'topp_reached']));
    await p.click('.a2-title .sk-pbtn.primary');
    await p.waitForFunction(() => window.__skoldhast2?.debug?.mode === 'play', null, { timeout: 20000 });
    for (const [scene, x, y, facing] of views) {
        await dbg(p, ([scene, x, y, facing]) => { const { G, view } = window.__skoldhast2.debug; G.goto(scene, { x: x * 200, y: y * 200, facing, mode: y > 0.5 ? 'swim' : undefined }); view.cam.snap = true; }, [scene, x, y, facing]);
        // a new page is built on the next frames; wait for it rather than for a fixed time (software WebGL is slow)
        await p.waitForFunction(() => { const { G, view } = window.__skoldhast2.debug; return view.sceneId === G.sceneId; }, null, { timeout: 20000 });
        await dbg(p, () => { window.__skoldhast2.debug.view.cam.snap = true; });
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
    }, { label: 'finale', maxSeconds: 480, onDraw: async (prompt) => { traced.push(prompt); await shot(p, `a2-finale-draw${traced.length}-1440x900`); } });
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

// Seen, not just placed: the moon is drawn once without it and once with it, and the pixels inside its
// disc must change. Åsktoppen (portrait) and the forest (landscape) used to cover half of it or more.
await check('Mira\'s moon and Alva\'s stars are seen in the sky on phones (844×390, 390×844)', async () => {
    for (const vp of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
        const p = await page(vp, profile([...SEEN, ...EGGS, 'p2_bridge', 'p7_vine', 'p4_lit', 'cloud_met', 'coin_got', 'coin_given',
            'eggs_in_nest', 'moon', 'alva_stars', 'hatched', 'watch_given', 'skata_gift', 'ended'], 'nest'));
        await p.click('.a2-title .sk-pbtn.primary');
        await p.waitForFunction(() => window.__skoldhast2?.debug?.mode === 'play', null, { timeout: 20000 });
        // the finale's camera (cloudArrive), once the moon has risen
        await dbg(p, () => { const { G } = window.__skoldhast2.debug, c = G.sceneDef.spots.cloudSky; G.camHint = { x: c.x, y: c.y + 2.2 * 200, zoom: 0.85 }; });
        await p.waitForFunction(() => window.__skoldhast2.debug.view.moonParts().rise > 0.995, null, { timeout: 20000 });
        await p.waitForTimeout(1500);
        const seen = await dbg(p, () => {
            const { view, app } = window.__skoldhast2.debug, { moon, stars } = view.moonParts();
            const Rect = app.screen.constructor; // a PIXI.Rectangle, which extract needs for its frame
            const grab = (x, y, w, hgt) => app.renderer.extract.pixels({ target: app.stage, frame: new Rect(x, y, w, hgt) }).pixels;
            const changed = (part, x, y, w, hgt) => {
                part.visible = false; app.render(); const off = grab(x, y, w, hgt);
                part.visible = true; app.render(); const on = grab(x, y, w, hgt);
                return (i) => Math.abs(on[i] - off[i]) + Math.abs(on[i + 1] - off[i + 1]) + Math.abs(on[i + 2] - off[i + 2]);
            };
            const c = moon.getGlobalPosition(), r = Math.round(moon.scale.x * 60 * 0.8), x0 = Math.round(c.x - r), y0 = Math.round(c.y - r);
            const d = changed(moon, x0, y0, 2 * r, 2 * r);
            let inside = 0, differs = 0;
            for (let y = 0; y < 2 * r; y++) for (let x = 0; x < 2 * r; x++) {
                if ((x - r) ** 2 + (y - r) ** 2 > r * r) continue;
                inside++; if (d((y * 2 * r + x) * 4) > 30) differs++;
            }
            let starsSeen = 0;
            for (const s of stars.children) {
                const g = s.getGlobalPosition(), sx = Math.round(g.x - 3), sy = Math.round(g.y - 3);
                const ds = changed(s, sx, sy, 6, 6);
                let best = 0; for (let i = 0; i < 36; i++) best = Math.max(best, ds(i * 4));
                if (best > 40) starsSeen++;
            }
            return { moon: differs / inside, stars: starsSeen, of: stars.children.length, at: [Math.round(c.x), Math.round(c.y), r] };
        });
        assert.ok(seen.moon > 0.85, `${vp.width}×${vp.height}: the moon's disc is seen (${Math.round(seen.moon * 100)} % of it, at ${seen.at})`);
        assert.ok(seen.stars >= seen.of - 1, `${vp.width}×${vp.height}: Alva's stars are seen (${seen.stars} of ${seen.of})`);
        await shot(p, `a2-moon-sky-${vp.width}x${vp.height}`);
        await p.close();
    }
});

// K1's bridge lies over the chasm, under the pit's dark layer (L.fore over L.terrain): once the plates
// ring, that dark must sink below the deck, or the crystal bridge reads as a dark band.
await check('the crystal bridge over the lit chasm is seen, not under the pit\'s dark (844×390)', async () => {
    const flags = ['b:arrive', 'b:firstEgg', 'egg_e1', 'p2_bridge', 'p4_lit', 'lantern', 'storm_source', 'visited_kristall', 'b:kristall',
        'b:plates', 'cave_reached', 'k1_a', 'k1_b', 'k1_c', 'k1_lit', 'k1_bridge', 'b:k1Done'];
    const p = await page({ width: 844, height: 390 }, profile(flags, 'kristall'));
    await p.click('.a2-title .sk-pbtn.primary');
    await p.waitForFunction(() => window.__skoldhast2?.debug?.mode === 'play', null, { timeout: 20000 });
    for (let t = 0; t < 60; t++) { if (await dbg(p, () => { const { story, ui } = window.__skoldhast2.debug; if (ui.dialogueOpen()) ui.advance(); return !story.running(); })) break; await p.waitForTimeout(150); }
    await dbg(p, () => { const { G } = window.__skoldhast2.debug; G.goto('kristall', { x: 13.4 * 200, y: -0.3 * 200 }); });
    await p.waitForTimeout(3500); // the dark eases away
    const r = await dbg(p, () => {
        const { view, app } = window.__skoldhast2.debug;
        const find = (c) => { for (const ch of c.children || []) { if (ch.label === 'chasm-pit') return ch; const f = find(ch); if (f) return f; } return null; };
        const pit = find(app.stage), deck = view.toScreen(16.2 * 200, -0.2 * 200);
        const Rect = app.screen.constructor, frame = new Rect(Math.round(deck.x - 20), Math.round(deck.y - 2), 40, 6);
        const lum = () => { app.render(); const px = app.renderer.extract.pixels({ target: app.stage, frame }).pixels; let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i] + px[i + 1] + px[i + 2]; return s / (px.length / 4) / 3; };
        const shown = lum(); pit.visible = false; const bare = lum(); pit.visible = true;
        return { shown, bare };
    });
    assert.ok(r.shown > r.bare * 0.9, `the deck keeps its light under the lit chasm (${Math.round(r.shown)} of ${Math.round(r.bare)})`);
    await p.close();
});

await browser.close(); server.close();
if (failures) { console.log(`${failures} check(s) failed`); process.exit(1); }
console.log('all checks passed');
