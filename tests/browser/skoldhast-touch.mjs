#!/usr/bin/env node
/*
 * Browser check of touch play on a phone-sized screen (plan §4.1, §8.4): the floating stick
 * moves the sköldhäst, a tap on Hoppa hops, a tap on Göm dig hides, and a quick tap on the
 * sköldhäst neighs. Uses Chromium's touch emulation (CDP Input.dispatchTouchEvent).
 *
 *   node tests/browser/skoldhast-touch.mjs [--viewport 844x390]
 */
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const vp = (process.argv.find((a) => /^\d+x\d+$/.test(a)) || '844x390').split('x').map(Number);
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launch();
// DPR 1: this checks input logic; software WebGL at DPR 2 renders so slowly here that a 60 ms tap arrives as a long press
const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
const errors = [];
pg.on('pageerror', (e) => errors.push(e.message));
const cdp = await ctx.newCDPSession(pg);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], i) => ({ x, y, id: i + 1 })) });
const G = (fn) => pg.evaluate(fn);

await pg.goto(`${base}/skoldhast/dev/play.html`, { waitUntil: 'load' });
await pg.waitForSelector('.sk-title');
await pg.getByText('Jag har en kod').tap();
await pg.fill('.sk-code-input', 'kelp mås skal');
await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).tap();
await pg.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'kelp', null, { timeout: 30000 });
// finish the chapter opening, then stand on her beach
for (let i = 0; i < 30; i++) {
    const busy = await G(() => { const d = window.__skoldhast.debug; if (d.ui.dialogueOpen()) d.ui.advance(); return d.G.busy || d.story.running(); });
    if (!busy && i > 3) break;
    await pg.waitForTimeout(300);
}
await G(() => { const { G, view } = window.__skoldhast.debug; G.goto('land', 'start'); view.setScene('land'); });
await pg.waitForTimeout(600);

// the stick: touch in the left band and drag left, hold
const zone = await pg.locator('.sk-stick-zone').boundingBox();
const sx = zone.x + zone.width * 0.45, sy = zone.y + zone.height * 0.55;
const x0 = await G(() => window.__skoldhast.debug.G.player.x);
await touch('touchStart', [[sx, sy]]);
for (let i = 1; i <= 6; i++) { await touch('touchMove', [[sx - i * 12, sy]]); await pg.waitForTimeout(16); }
await pg.waitForTimeout(1500);
const moving = await G(() => ({ x: window.__skoldhast.debug.G.player.x, vx: window.__skoldhast.debug.G.player.vx }));
await touch('touchEnd', []);
assert.ok(moving.x < x0 - 200, `the stick moves the sköldhäst west (${x0} → ${moving.x})`);
assert.ok(moving.vx < -900, `full stick gallops (vx ${moving.vx})`);
// (software WebGL can run below 12 fps here, where game time slows down: wait for the stop, don't time it)
await pg.waitForFunction(() => Math.abs(window.__skoldhast.debug.G.player.vx) < 30, null, { timeout: 8000 }).catch(() => {});
const after = await G(() => { const { G, input } = window.__skoldhast.debug; return { vx: G.player.vx, x: G.player.x / 200, mode: G.player.mode, busy: G.busy, inp: input.state() }; });
assert.ok(Math.abs(after.vx) < 30, 'letting go stops ' + JSON.stringify(after));

// Hoppa: a tap hops (a buck in place when standing), away from anything the button could offer instead
await G(() => { const { G, view } = window.__skoldhast.debug; G.goto('land', { x: 95.6 * 200, y: -0.66 * 200, facing: -1 }); G.player.wet = 0; G.player.wetTimer = 0; view.cam.snap = true; });
await pg.waitForTimeout(400);
assert.equal(await pg.locator('.sk-act').textContent(), 'Hoppa');
const hopBefore = await G(() => window.__skoldhast.debug.G.player.y);
const act = await pg.locator('.sk-btn.act, .sk-act').first().boundingBox();
await G(() => { window.__minY = Infinity; const G = window.__skoldhast.debug.G; G.on('hop', () => { window.__hop = true; }); });
await touch('touchStart', [[act.x + act.width / 2, act.y + act.height / 2]]);
await pg.waitForFunction(() => window.__hop, null, { timeout: 3000 }).catch(() => {});
await touch('touchEnd', []);
assert.ok(await G(() => !!window.__hop), 'Hoppa hops');
void hopBefore;
await pg.waitForTimeout(800);

// Göm dig: a tap hides, another tap comes out
const hide = await pg.locator('.sk-btn.hide, .sk-hide').first().boundingBox();
await pg.waitForFunction(() => window.__skoldhast.debug.G.player.mode === 'ground' && !window.__skoldhast.debug.G.player.jump, null, { timeout: 5000 });
await touch('touchStart', [[hide.x + hide.width / 2, hide.y + hide.height / 2]]); await touch('touchEnd', []);
await pg.waitForFunction(() => window.__skoldhast.debug.G.player.hidden, null, { timeout: 5000 }).catch(() => {});
assert.equal(await G(() => window.__skoldhast.debug.G.player.hidden), true, 'Göm dig hides');
await touch('touchStart', [[hide.x + hide.width / 2, hide.y + hide.height / 2]]); await touch('touchEnd', []);
await pg.waitForFunction(() => !window.__skoldhast.debug.G.player.hidden, null, { timeout: 5000 }).catch(() => {});
assert.equal(await G(() => window.__skoldhast.debug.G.player.hidden), false, 'a second tap comes out');

// Gnägg: a quick tap on the sköldhäst
const hs = await G(() => { const { G, view } = window.__skoldhast.debug; const p = G.player; return { x: view.world.position.x + p.x * view.world.scale.x, y: view.world.position.y + (p.y - 110) * view.world.scale.y }; });
const neighs = await G(() => { window.__neighs = 0; window.__skoldhast.debug.G.on('neigh', () => window.__neighs++); return 0; });
void neighs;
await G(() => { document.addEventListener('pointerdown', (e) => { window.__pd = [e.target.className, e.pointerType, Math.round(e.clientX), Math.round(e.clientY)]; }, true); document.addEventListener('pointerup', (e) => { window.__pu = [e.target.className, Math.round(e.timeStamp - 0)]; }, true); });
await touch('touchStart', [[hs.x, hs.y]]); await pg.waitForTimeout(60); await touch('touchEnd', []);
await pg.waitForFunction(() => window.__neighs >= 1, null, { timeout: 3000 }).catch(() => {});
const why = await G(() => { const { G, ui } = window.__skoldhast.debug; return { n: window.__neighs, busy: G.busy, hidden: G.player.hidden, mode: G.player.mode, dlg: ui.dialogueOpen(), panel: ui.panelOpen(), pd: window.__pd, pu: window.__pu, tap: window.__skoldhast.debug.input.lastTap }; });
const el = await G(`document.elementFromPoint(${hs.x}, ${hs.y})?.className + ' hit=' + window.__skoldhast.debug.heroHit(${hs.x}, ${hs.y}) + ' at=' + JSON.stringify(window.__skoldhast.debug.heroScreen())`);
assert.ok(why.n >= 1, 'a tap on the sköldhäst neighs ' + JSON.stringify({ ...why, el, hs }));
assert.deepEqual(errors, []);
console.log('touch play works');
await browser.close();
server.close();
