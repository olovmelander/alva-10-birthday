/* Audit-only staged screenshots: real pure-input route, restored for framing.
 * This is deliberately not a claim of a fresh browser/physical-phone playtest.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRobot } from '../skoldhast-robot.mjs';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
process.env.NO_TEST = '1';
const { chapter1, chapter2 } = await import('../skoldhast-playthrough.test.mjs');
const out = 'docs/skoldhast/shots/puzzle-audit/before/land';
fs.mkdirSync(out, { recursive: true });
const R = createRobot(), frames = [];
const take = (name, position) => {
    const p = R.p();
    frames.push({ name, save: R.G.serialize(), scene: R.G.sceneId,
        player: { x: p.x, y: p.y, facing: p.facing, mode: p.mode, hidden: p.hidden, hide: p.hide, ...position },
        puzzle: structuredClone(R.G.puz), time: R.G.time });
};
const originalWalk = R.walkTo, originalFlag = R.flag;
R.walkTo = async (x, opts) => {
    await originalWalk(x, opts);
    if (x === 104.1) take('p2-before');
    if (x === 81 && !R.has('p1_inked')) take('p1-before');
    if (x === 59.5) take('p3-first-ramp-before', { x: 51.8 * 200, y: -.8 * 200 });
    if (x === 30 && R.has('ch2_open')) take('p4-gap-before', { x: 14.4 * 200, y: -4 * 200 });
};
R.flag = async (flag, inp, max) => {
    await originalFlag(flag, inp, max);
    if (flag === 'p2_seen') { await R.settle(); take('p2-mirror'); }
    if (flag === 'p2_open') { await R.settle(); take('p2-open', { x: 101.8 * 200, y: -.1 * 200 }); }
    if (flag === 'p3_t1') take('p3-first-ramp-grown', { x: 48.8 * 200, y: -.8 * 200 });
    if (flag === 'p3_done') { await R.settle(); take('p3-wave-marks'); }
    if (flag === 'p4_leap') { await R.settle(); take('p4-map-ahead', { x: 5.2 * 200, y: -4 * 200 }); }
};
await chapter1(R);
await chapter2(R);
assert.ok(['p1_inked', 'p2_open', 'p3_done', 'p4_leap', 'mark_land'].every(R.has));
fs.writeFileSync(`${out}/route.json`, JSON.stringify({ frames, flags: [...R.G.flags], events: R.events.filter(e => ['inked', 'reflectionSeen', 'opened', 'grow', 'bigLanding', 'mark'].includes(e.type)) }, null, 2));
const server = await serve(), browser = await launch();
try {
    for (const [width, height] of [[844, 390], [390, 844]]) {
        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
        const pg = await ctx.newPage(), errors = [];
        pg.on('pageerror', e => errors.push(e.message));
        await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await pg.getByText('Jag har en kod').click();
        await pg.fill('.sk-code-input', 'fyr fjun klo');
        await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await pg.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'viken');
        for (let n = 0; n < 180; n++) {
            const ready = await pg.evaluate(() => { const { G, story, ui } = window.__skoldhast.debug; if (ui.dialogueOpen()) ui.advance(); if (ui.panelOpen()) ui.closePanel(); return G.has('b:k3_arrive') && !G.busy && !story.running(); });
            if (ready) break;
            await pg.waitForTimeout(100);
        }
        await pg.evaluate(() => window.__skoldhast.pause());
        for (const frame of frames) {
            await pg.evaluate(async f => {
                const d = window.__skoldhast.debug, { G, view, app, ui, guide } = d;
                const { snapshot } = await import('/skoldhast/src/sim.mjs');
                G.restore(f.save); G.goto(f.scene, f.player); Object.assign(G.player, f.player);
                Object.assign(G.puz, f.puzzle); G.time = f.time; G.camHint = null; G.busy = 0;
                view.setScene(f.scene); view.cam.snap = true;
                guide.clear(); guide.goal('Få havet att plaska igen'); guide.show(true); ui.showControls(true);
                for (let n = 0; n < 180; n++) view.render(snapshot(G.player, 0, G.terrain, G.time), 1 / 60);
                app.render();
            }, frame);
            await pg.waitForTimeout(650);
            await pg.screenshot({ path: `${out}/${frame.name}-${width}x${height}.png` });
        }
        assert.deepEqual(errors, []);
        await ctx.close();
    }
    console.log(`Captured ${frames.length * 2} staged land puzzle views; real pure-input P1–P4 route passed.`);
} finally { await browser.close(); server.close(); }
