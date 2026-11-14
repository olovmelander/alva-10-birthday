#!/usr/bin/env node
/*
 * Äventyr 3 (De försvunna stjärnorna) played from "Börja" to the ending card in a real browser: the prologue at the
 * table with the flame drawn by hand, the launch, all five pages, the climax, the gallop, the finale and the
 * epilogue. A robot inside the page (tests/browser/skoldhast-a3-play-robot.js) follows the node robot's own route
 * through the running game, while this side advances the speech, draws with the pencils, answers the travel card
 * and takes a picture of every line, thought and moment of play.
 *
 *   node tests/browser/skoldhast-a3-play.mjs [--out dir] [--size 844x390] [--dpr 2] [--touch] [--gpu]
 *        [--order ring,stjarn] [--every 0.9] [--minutes 60]
 *
 * It fails if the robot cannot finish, if the page reports an error, or if the story is not ended. With --out it
 * also writes the pictures and log.json (what was said where), which is how the adventure is looked at as a player
 * sees it: the node robot (tests/skoldhast-a3-playthrough.test.mjs) ends every dialogue at once and has no picture,
 * so a scene that began in the middle of a jump, or a speaker behind the speech box, never showed there.
 *
 * --gpu uses the machine's own graphics (about 14 minutes); without it WebGL is software and the game runs slowly
 * (allow an hour). Playwright is found as in the other browser checks (NODE_PATH).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../../scripts/skoldhast-shot.mjs';

const require = createRequire(import.meta.url);
function loadPlaywright() {
    try { return require('playwright'); } catch { /* fall through */ }
    return require('/opt/node22/lib/node_modules/playwright');
}
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, def = null) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
const flag = (n) => args.includes(n);
const [W, H] = arg('--size', '844x390').split('x').map(Number);
const out = arg('--out');
const EVERY = Number(arg('--every', '0.9'));
if (out) fs.mkdirSync(out, { recursive: true });

const server = await serve();
const { chromium } = loadPlaywright();
const gl = flag('--gpu') ? ['--use-angle=d3d11', '--enable-gpu'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({ channel: flag('--gpu') ? 'chromium' : undefined, args: [...gl, '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: Number(arg('--dpr', '1')), hasTouch: flag('--touch'), isMobile: flag('--touch') });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });

const log = [];
let n = 0;
async function shot(kind, label, extra = {}) {
    const name = `${String(++n).padStart(4, '0')}-${kind}.jpg`;
    if (out) await page.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 82 }).catch(() => {});
    log.push({ n, file: name, kind, label, ...extra });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?adventure=3`);
await page.waitForSelector('.a3-title .sk-pbtn.primary', { timeout: 60000 });
await sleep(1200);
await shot('title', 'title');
await page.addScriptTag({ content: fs.readFileSync(path.join(HERE, 'skoldhast-a3-play-robot.js'), 'utf8') });
await page.evaluate((o) => window.__installRobot(o), { order: arg('--order', 'stjarn,ring').split(',') });
await page.click('.a3-title .sk-pbtn.primary');

const state = () => page.evaluate(() => {
    const P = window.__P, d = window.__skoldhast3.debug, G = d.G;
    const dlg = document.querySelector('.sk-dialogue.on');
    return {
        mode: d.mode, stage: P.stage, error: P.error, done: P.done, wantTravel: P.wantTravel, draw: P.draw,
        dlg: dlg ? { who: [...dlg.classList].find(c => c.startsWith('who-'))?.slice(4), text: dlg.querySelector('.sk-dlg-text')?.textContent } : null,
        panel: d.ui.panelOpen(), ending: !!document.querySelector('.a3-ending'),
        events: P.events.splice(0), scene: G.sceneId, x: +(G.player.x / 200).toFixed(2), y: +(G.player.y / 200).toFixed(2), t: +G.time.toFixed(2),
        lights: G.lights(), goal: document.querySelector('.sk-goal')?.textContent || '', where: P.where()
    };
});

/** A guided drawing (the fin, the tenth star, the constellation): the pencil follows the dots. */
async function drawGuided(d) {
    await sleep(900);
    await shot('draw', 'before: ' + d.prompt);
    const pts = d.anchors.map(a => Array.isArray(a) ? a : [a.x, a.y]);
    await page.mouse.move(pts[0][0], pts[0][1]);
    await page.mouse.down();
    for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const steps = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 8));
        for (let k = 1; k <= steps; k++) await page.mouse.move(x0 + (x1 - x0) * k / steps + Math.sin(k) * 2, y0 + (y1 - y0) * k / steps + Math.cos(k * 1.3) * 2);
        if (i === Math.floor(pts.length / 2)) await shot('draw', 'halfway: ' + d.prompt);
    }
    await page.mouse.up();
    await sleep(500);
    await shot('draw', 'after: ' + d.prompt);
}
/** The free drawing (the rocket's flame): a flame in the pad, then "Klar". */
async function drawFree(d) {
    await sleep(900);
    await shot('draw', 'before: ' + d.prompt);
    const b = await page.evaluate(() => { const r = document.querySelector('.sk-draw-pad').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const cx = b.x + b.width / 2, top = b.y + b.height * 0.12, bot = b.y + b.height * 0.85, rx = b.width * 0.22;
    const pts = [];
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; pts.push([cx + Math.sin(a) * rx * (0.6 + 0.4 * Math.sin(a / 2)), top + (1 - Math.cos(a)) / 2 * (bot - top) + Math.sin(a * 4) * 4]); }
    await page.mouse.move(pts[0][0], pts[0][1]);
    await page.mouse.down();
    for (const [x, y] of pts) await page.mouse.move(x, y, { steps: 3 });
    await page.mouse.up();
    await sleep(500);
    await shot('draw', 'drawn: ' + d.prompt);
    await page.click('.sk-draw-done');
}

const T0 = Date.now(), MAX_MS = Number(arg('--minutes', flag('--gpu') ? '40' : '90')) * 60000;
let lastDlg = '', lastShotT = -99, lastShotWall = 0, lastStage = '', failure = null, ended = false;
while (Date.now() - T0 < MAX_MS) {
    let s;
    try { s = await state(); } catch { await sleep(500); continue; }
    if (s.stage !== lastStage) { lastStage = s.stage; console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s] ${s.stage}  (${s.where})`); }
    for (const e of s.events) log.push({ n: 0, kind: 'event:' + e.kind, label: e.text, t: e.t, scene: e.scene, x: e.x });
    const told = s.events.filter(e => ['think', 'toast', 'caption', 'remark'].includes(e.kind));
    if (s.error) { failure = s.error; await shot('error', s.error); break; }
    if (s.dlg && s.dlg.who + '|' + s.dlg.text !== lastDlg) {
        lastDlg = s.dlg.who + '|' + s.dlg.text;
        await sleep(650);
        await shot('say', `${s.dlg.who}: ${s.dlg.text}`, { scene: s.scene, x: s.x, t: s.t, stage: s.stage, mode: s.mode });
        await page.evaluate(() => window.__skoldhast3.debug.ui.advance());
        lastShotT = s.t; lastShotWall = Date.now();
    } else if (s.dlg) {
        await page.evaluate(() => window.__skoldhast3.debug.ui.advance());
    } else if (s.draw) {
        try { if (s.draw.guided) await drawGuided(s.draw); else await drawFree(s.draw); } catch (e) { console.log('draw failed', e.message); }
        await sleep(800);
    } else if (s.ending) {
        await sleep(800);
        await shot('ending', 'ending card');
        ended = true;
        await page.click('.a3-ending .sk-pbtn.primary').catch(() => {});
    } else if (s.panel && s.wantTravel) {
        await sleep(700);
        await shot('travel', 'travel card to ' + s.wantTravel, { scene: s.scene });
        await page.evaluate(() => { window.__P.wantTravel = null; });
        await page.click(`button[data-place="${s.wantTravel}"]`).catch(e => console.log('travel click', e.message));
    } else if (told.length) {
        await sleep(450);
        await shot(told[0].kind, told.map(e => e.text).join(' | '), { scene: s.scene, x: s.x, t: s.t, stage: s.stage });
        lastShotT = s.t; lastShotWall = Date.now();
    } else if (s.mode === 'play' ? (s.t - lastShotT >= EVERY) : (Date.now() - lastShotWall >= 1800)) {
        await shot(s.mode === 'play' ? 'play' : s.mode, `${s.scene} x=${s.x} y=${s.y} goal=${s.goal}`, { scene: s.scene, x: s.x, y: s.y, t: s.t, stage: s.stage, lights: s.lights });
        lastShotT = s.t; lastShotWall = Date.now();
    }
    if (s.done) { await sleep(1500); await shot('done', 'done'); break; }
    await sleep(90);
}
const finished = await page.evaluate(() => ({ done: window.__P?.done, ended: window.__skoldhast3.debug.G.flags.has('ended'), lights: window.__skoldhast3.debug.G.lights() })).catch(() => ({}));
if (out) fs.writeFileSync(path.join(out, 'log.json'), JSON.stringify({ size: [W, H], errors, log }, null, 1));
await browser.close();
server.close();
console.log(`${n} pictures, ${log.filter(e => e.kind === 'say').length} lines, ${((Date.now() - T0) / 60000).toFixed(1)} min`);
try {
    assert.equal(failure, null, 'the robot played to the end');
    assert.ok(finished.done && finished.ended && finished.lights === 10 && ended, 'the story ended with ten lights and the ending card');
    assert.deepEqual(errors, [], 'no page errors');
    console.log('all checks passed');
} catch (err) { console.log('FAIL ' + String(err.message || err)); process.exit(1); }
