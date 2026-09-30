#!/usr/bin/env node
/*
 * Accelerated fresh-save journey through P1–P8 and the optional activities.
 *
 * Real DOM keyboard / touch PointerEvents enter input.mjs; the resulting state
 * feeds the real game and story at 1/120 s. Travel is accelerated, never skipped
 * with coordinates or solved flags. Dialogue, reports and drawing use the real
 * UI (automatically acknowledged). The prologue runs at normal browser speed.
 * This is a regression route, not a claim of a human or physical-phone playtest.
 *
 * node tests/browser/skoldhast-journey.mjs --viewport 844x390 --input touch --out /tmp/journey
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

process.env.NO_TEST = '1';
const { chapter1, chapter2, chapter3 } = await import('../skoldhast-playthrough.test.mjs');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a, []));
const [width, height] = (args.viewport || '844x390').split('x').map(Number);
const touchMode = args.input === 'touch';
const out = args.out || '/tmp/skoldhast-journey';
fs.mkdirSync(out, { recursive: true });
const server = await serve();
const browser = await launch();
let pg;
try {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touchMode, isMobile: touchMode, deviceScaleFactor: 1 });
    pg = await ctx.newPage();
    const errors = [];
    pg.on('pageerror', e => errors.push(e.message));
    pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await pg.exposeFunction('journeyShot', async name => {
        await pg.screenshot({ path: path.join(out, `${name}-${args.input || 'keyboard'}-${width}x${height}.png`) });
        console.log('journey:', name);
    });
    await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?debug`);
    await pg.waitForSelector('.sk-title');
    await pg.evaluate(() => {
        const ui = window.__skoldhast.debug.ui, draw = ui.draw;
        ui.draw = opts => { window.__journeyDraw = opts; return draw(opts); };
    });
    await pg.locator('.sk-title button').first()[touchMode ? 'tap' : 'click']();
    await pg.waitForFunction(() => { const b = document.querySelector('.sk-notes-skip'); b?.click(); return !!b || !!document.querySelector('.sk-draw.on'); }, null, { timeout: 60000, polling: 100 }); // skip Alva's notes (skoldhast-notes.mjs plays them)
    const prologueDeadline = Date.now() + 90000;
    let cloudPhotographed = false;
    for (let i = 0; i < 500 && Date.now() < prologueDeadline; i++) {
        const state = await pg.evaluate(() => {
            const d = window.__skoldhast.debug;
            if (d.ui.dialogueOpen()) d.ui.advance();
            const opts = window.__journeyDraw, geometry = opts?.getGeometry?.() || opts;
            let points = geometry?.anchors || geometry?.ghost;
            const pad = document.querySelector('.sk-draw.free.on .sk-draw-pad')?.getBoundingClientRect();
            if (pad && geometry.bounds && geometry.ghost) points = geometry.ghost.map(([x, y]) => [pad.x + (x - geometry.bounds.x) / geometry.bounds.width * pad.width, pad.y + (y - geometry.bounds.y) / geometry.bounds.height * pad.height]);
            return { intro: d.G.flags.has('intro_done'), draw: !!document.querySelector('.sk-draw.on'), preview: !!document.querySelector('.sk-draw.on.preview'), prompt: document.querySelector('.sk-draw-prompt')?.textContent, points, choice: !!document.querySelector('.sk-choice.on button') };
        });
        if (state.intro) break;
        if (i && i % 20 === 0) console.log('prologue waiting:', state.draw ? `${state.prompt} (${state.points?.length} points)` : 'dialogue / animation');
        if (state.draw) {
            if (!cloudPhotographed && state.prompt === 'Rita ett moln!') {
                await pg.screenshot({ path: path.join(out, `00-prologue-cloud-${args.input || 'keyboard'}-${width}x${height}.png`) });
                cloudPhotographed = true;
            }
            if (state.preview) await pg.locator('.sk-draw-done')[touchMode ? 'tap' : 'click']();
            else if (touchMode && state.points?.length) {
                // A real touch trace for Alva's three prologue drawings.
                const cdp = await ctx.newCDPSession(pg);
                const points = state.points;
                assert.ok(points.every(([x, y]) => x >= 0 && x <= width && y >= 0 && y <= height), `${state.prompt}: every drawing point is reachable on the ${width}x${height} screen`);
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points[0][0], y: points[0][1], id: 1 }] });
                for (const [x, y] of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await cdp.detach();
                if (await pg.locator('.sk-draw.on.free.preview').count()) await pg.locator('.sk-draw-done').tap();
            } else await pg.keyboard.press('Enter');
        }
        if (state.choice) await pg.locator('.sk-choice.on button').first()[touchMode ? 'tap' : 'click']();
        await pg.waitForTimeout(100);
    }
    await pg.waitForFunction(() => window.__skoldhast.debug.G.flags.has('intro_done') && window.__skoldhast.debug.G.sceneId === 'land');
    const result = await pg.evaluate(async ({ touchMode, routes }) => {
        const api = window.__skoldhast, d = api.debug;
        const { G, input, view, app, ui, story, guide } = d;
        const { snapshot, C, STEP } = await import('/skoldhast/src/sim.mjs');
        api.pause();
        // The paused production RAF releases controls defensively every frame.
        // This test owns input while it drives fixed steps, so leave that RAF
        // free to service visual effects without clearing our held DOM input.
        input.release = () => {};
        const assert = { ok(v, m) { if (!v) throw Error(m || 'assertion failed'); }, equal(a, b, m) { if (a !== b) throw Error(`${m || 'not equal'}: ${a} !== ${b}`); } };
        const chapter = routes.map(s => new Function('assert', `return (${s})`)(assert));
        const log = [], events = [], notes = [];
        G.on('*', (type, e) => { if (!['hoof', 'paddle', 'ink'].includes(type)) events.push({ t: G.time, type, ...e }); });
        G.on('plankNote', e => notes.push(e.note));
        const originalReport = ui.report;
        ui.report = async n => { log.push({ kind: 'report', n }); return originalReport(n); };
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        let steps = 0, stickOn = false, kx = 0, ky = 0;
        const zone = ui.stickZone;
        const pointer = (node, type, x, y) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 71, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
        // Synthetic DOM pointers have no native capture target. Ignore capture
        // only inside this test; native CDP capture is covered by skoldhast-touch.
        for (const n of [zone, ui.actBtn, ui.hopBtn, ui.hideBtn]) n.setPointerCapture = () => {};
        const key = (name, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: name, bubbles: true, cancelable: true }));
        const button = (node, keyName) => {
            if (touchMode) { const r = node.getBoundingClientRect(); pointer(node, 'pointerdown', r.x + r.width / 2, r.y + r.height / 2); pointer(node, 'pointerup', r.x + r.width / 2, r.y + r.height / 2); }
            else { document.activeElement?.blur(); key(keyName, true); key(keyName, false); }
        };
        function drive(ix, iy) {
            if (touchMode) {
                const r = zone.getBoundingClientRect(), x = r.x + r.width * .5, y = r.y + r.height * .5;
                if (!stickOn && (ix || iy)) { pointer(zone, 'pointerdown', x, y); stickOn = true; }
                if (stickOn) {
                    pointer(zone, 'pointermove', x + ix * 58, y + iy * 58);
                    if (!ix && !iy) { pointer(zone, 'pointerup', x, y); stickOn = false; }
                }
            } else {
                // Short key pulses give the robot a walking approach; a human
                // would release the arrow before the target in the same way.
                let x = Math.sign(ix), y = Math.sign(iy);
                if (G.player.mode === 'ground' && Math.abs(ix) < C.gallopDefl && G.player.vx * x > Math.abs(ix) / C.gallopDefl * 850) x = 0;
                if (G.player.mode === 'swim') {
                    const pulse = drive.pulse++ % 10 / 10;
                    if (Math.abs(ix) < .95 && pulse >= Math.abs(ix)) x = 0;
                    if (Math.abs(iy) < .95 && pulse >= Math.abs(iy)) y = 0;
                }
                if (x !== kx) { if (kx) key(kx < 0 ? 'ArrowLeft' : 'ArrowRight', false); if (x) key(x < 0 ? 'ArrowLeft' : 'ArrowRight', true); kx = x; }
                if (y !== ky) { if (ky) key(ky < 0 ? 'ArrowUp' : 'ArrowDown', false); if (y) key(y < 0 ? 'ArrowUp' : 'ArrowDown', true); ky = y; }
            }
        }
        drive.pulse = 0;
        function render() {
            if (G.sceneId !== view.sceneId && !G.vista) view.setScene(G.sceneId);
            view.render(snapshot(G.player, 0, G.terrain, G.time), STEP * 12);
            ui.setContext(G.context?.label, G.player.hidden);
            guide.goal(story.goal()); guide.show(!G.busy && !ui.dialogueOpen() && !ui.panelOpen()); guide.update();
        }
        async function panels() {
            while (ui.dialogueOpen() || ui.panelOpen() || document.querySelector('.sk-draw.on')) {
                render(); app.render();
                if (ui.dialogueOpen()) { await sleep(365); ui.advance(); }
                else if (document.querySelector('.sk-draw.on')) {
                    const opts = window.__journeyDraw, geometry = opts?.getGeometry?.() || opts, layer = document.querySelector('.sk-draw.on');
                    if (layer.classList.contains('preview')) layer.querySelector('.sk-draw-done').click();
                    else if (touchMode && (geometry?.anchors || geometry?.ghost)?.length) {
                        const canvas = layer.querySelector('canvas'); canvas.setPointerCapture = () => {};
                        let points = geometry.anchors || geometry.ghost;
                        if (!geometry.anchors && geometry.bounds) {
                            const pad = layer.querySelector('.sk-draw-pad').getBoundingClientRect(), b = geometry.bounds;
                            points = points.map(([x, y]) => [pad.x + (x - b.x) / b.width * pad.width, pad.y + (y - b.y) / b.height * pad.height]);
                        }
                        pointer(canvas, 'pointerdown', ...points[0]);
                        for (const pt of points.slice(1)) pointer(canvas, 'pointermove', ...pt);
                        pointer(canvas, 'pointerup', ...points.at(-1));
                        if (layer.classList.contains('preview')) layer.querySelector('.sk-draw-done').click();
                    } else { key('Enter', true); key('Enter', false); }
                    await sleep(320);
                }
                else { ui.closePanel(); }
                await Promise.resolve();
            }
        }
        const where = () => `${G.sceneId} ${(G.player.x / 200).toFixed(2)},${(G.player.y / 200).toFixed(2)} ${G.player.mode} beat=${story.running()} vx=${G.player.vx.toFixed(0)}`;
        async function step(inp = {}) {
            await panels();
            // The epilogue's table uses real-time DOM/RAF tweens, rather than
            // simulation timers. Do not spend virtual travel time awaiting it.
            while (G.flags.has('conclusion') && ui.root.classList.contains('table-mode')) {
                drive(0, 0); await panels(); await sleep(16);
            }
            drive(inp.x || 0, inp.y || 0);
            // Accelerated steps can discover an action between rendered frames.
            // Present that enabled button before tapping it, as real play does.
            if (inp.act) ui.setContext(G.context?.label, G.player.hidden);
            if (inp.act) button(ui.actBtn, 'e');
            if (inp.hop) button(ui.hopBtn, ' ');
            if (inp.hide) button(ui.hideBtn, 'g');
            const cont = input.state(), e = input.consume();
            G.step({ ...cont, hop: e.hop, act: e.act, duck: e.duck, hide: e.hide, tapHero: e.tapHero || e.neigh });
            await Promise.resolve();
            if (++steps % 12 === 0) render();
            // Effects such as the map demonstration own RAF callbacks. Give
            // them a real frame: a zero-time timer can exhaust the virtual
            // deadline before software WebGL delivers an animation frame.
            if (G.busy && steps % 30 === 0) { app.render(); await new Promise(requestAnimationFrame); }
            if (steps % 600 === 0) await sleep(0);
        }
        async function until(pred, inp, seconds, label) {
            for (let i = 0; i < seconds / STEP; i++) { if (pred()) return; await step(typeof inp === 'function' ? inp() : (inp || {})); }
            if (!pred()) throw Error(`journey timed out: ${label}; ${where()}; ${JSON.stringify(events.slice(-8))}`);
        }
        const has = f => G.flags.has(f), p = () => G.player;
        async function hold(sec, inp = {}) { for (let i = 0; i < sec / STEP; i++) await step(i ? { ...inp, act: false, hide: false } : inp); }
        async function settle(max = 60) { let n = 0; await until(() => { n = !G.busy && !story.running() ? n + 1 : 0; return n > 30; }, {}, max, 'settle'); }
        async function walkTo(x, { gallop = false, tol = .12, max = 90 } = {}) {
            await until(() => Math.abs(p().x - x * 200) < tol * 200 && Math.abs(p().vx) < 40 && p().mode === 'ground', () => {
                const dx = x * 200 - p().x;
                if (Math.abs(dx) < tol * 200) return {};
                const mag = gallop && Math.abs(dx) > 800 ? 1 : Math.min(.7, Math.max(.15, Math.abs(dx) / 440));
                return { x: Math.sign(dx) * mag };
            }, max, `walk ${x}`);
        }
        async function swimTo(x, y, { tol = .3, max = 90 } = {}) {
            const scene = G.sceneId;
            await until(() => Math.hypot(p().x - x * 200, p().y - y * 200) < tol * 200 || G.sceneId !== scene, () => {
                const dx = x * 200 - p().x, dy = y * 200 - p().y, len = Math.hypot(dx, dy) || 1, m = Math.min(1, len / 100);
                return { x: dx / len * m, y: dy / len * m };
            }, max, `swim ${x},${y}`);
        }
        const R = { G, log, events, story, p, has, where, step, hold, until, settle, walkTo, swimTo,
            flag: (f, inp, max = 30) => until(() => has(f), inp, max, `flag ${f}`),
            act: () => step({ act: true }), hide: () => step({ hide: true }),
            hop: () => step({ hop: true }),
            gallopPast: async (x, { max = 60, hopHeld = false } = {}) => { const dir = Math.sign(x * 200 - p().x); await until(() => (p().x - x * 200) * dir > 0, { x: dir, hopHeld }, max, `gallop ${x}`); },
            context: async id => { await until(() => G.context?.id === id, {}, 5, `context ${id}`); await step({ act: true }); }
        };
        const shot = async name => {
            drive(0, 0); render(); app.render();
            // Notification lifetimes use wall time. Travel acceleration can
            // otherwise photograph minutes of notifications in one stack.
            await sleep(4000); render(); app.render(); await window.journeyShot(name);
        };
        // chapter1's two initial lines set the prologue's existing flag/spawn;
        // both already came from the real prologue, so prevent that reset here.
        const realFlag = G.flag, realGoto = G.goto;
        let firstFlag = true, firstGoto = true;
        G.flag = function(f) { if (firstFlag && f === 'intro_done') { firstFlag = false; assert.ok(has(f)); return; } return realFlag(f); };
        G.goto = function(id, spawn, opts) { if (firstGoto && id === 'land' && spawn === 'start') { firstGoto = false; return; } return realGoto(id, spawn, opts); };
        await chapter[0](R); G.flag = realFlag; G.goto = realGoto; await shot('01-chapter1');
        await chapter[1](R); await shot('02-chapter2');
        await chapter[2](R); await shot('03-ending');
        await R.flag('signe_met', {}, 20); await settle();
        await walkTo(G.sceneDef.race.signe.x / 200 - 1); await R.context('race');
        await until(() => G.busy === 0 && G.actors.signe.pose !== 'idle', {}, 10, 'race starts');
        await until(() => has('signe_race'), { x: -.2 }, 90, 'Signe race'); await settle();
        for (const x of [105.35, 106.3, 107.8]) { await walkTo(x, { tol: .03 }); await R.context('skaka'); await hold(1.1); }
        assert.ok(has('shells_tune'), `all shells ring: ${JSON.stringify(G.puz.shells)} at ${where()}`); await shot('04-shell-tune');
        for (const hs of G.sceneDef.hoppstallen) { await walkTo(hs.x / 200, { gallop: true, max: 160 }); await R.hop(); await hold(1.3); assert.ok(has('hopp_' + hs.id), `hoppställe ${hs.id}`); }
        for (const pc of G.sceneDef.pencils) {
            if (!has('penna_' + pc.id)) await walkTo(pc.x / 200, { gallop: true, max: 160 });
            await walkTo(pc.propAt.x / 200, { gallop: true, max: 160 }); await R.context('farglagg'); await hold(.5);
            assert.ok(has('penna_' + pc.id) && has('color_' + pc.id), `${pc.id}: collected and coloured`);
        }
        assert.ok(notes.length > 8, 'Spången plays notes along the walk');
        await shot('05-extras');
        return { flags: [...G.flags], notes: notes.length, elapsedGameMinutes: G.time / 60, steps, errors: [] };
    }, { touchMode, routes: [chapter1, chapter2, chapter3].map(f => f.toString()) });
    assert.deepEqual(errors, [], 'no browser errors');
    for (const flag of ['p1_inked', 'p2_open', 'p3_done', 'p4_leap', 'p5_lit', 'p6_flat', 'lamp_lit', 'p8_done', 'ended', 'exp_smak', 'signe_race', 'shells_tune']) assert.ok(result.flags.includes(flag), flag);
    fs.writeFileSync(path.join(out, `journey-${args.input || 'keyboard'}-${width}x${height}.json`), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ viewport: `${width}x${height}`, input: args.input || 'keyboard', steps: result.steps, notes: result.notes, gameMinutes: result.elapsedGameMinutes }));
} catch (error) {
    if (pg) {
        await pg.screenshot({ path: path.join(out, `failure-${args.input || 'keyboard'}-${width}x${height}.png`) }).catch(() => {});
        console.error(await pg.evaluate(() => ({ draw: window.__journeyDraw, flags: [...window.__skoldhast.debug.G.flags], prompt: document.querySelector('.sk-draw-prompt')?.textContent })).catch(() => null));
    }
    throw error;
} finally { await browser.close(); server.close(); }
