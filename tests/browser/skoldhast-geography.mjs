#!/usr/bin/env node
/* Focused continuity regression. Prerequisite flags/nearby positions are staged;
 * map pickup and the kelp exit are triggered by ordinary DOM movement through
 * the production input, simulation and story. No full-route claim is made.
 * --baseline captures old behavior; default verifies the repaired vista.
 * --root PATH --out PATH --viewport 390x844,844x390,1440x900 --case early,sea,portal
 * --case outflow exercises interrupted assembly recovery from saved inventory.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
const arg = n => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const baseline = process.argv.includes('--baseline');
const out = path.resolve(arg('--out') || 'docs/skoldhast/shots/geography/after');
const sizes = (arg('--viewport') || '390x844,844x390,1440x900').split(',');
const cases = (arg('--case') || 'early,sea,portal').split(',');
await fs.mkdir(out, { recursive: true });
const server = await serve(arg('--root') || process.cwd()), browser = await launch();
const results = [], errors = [];
try {
    const prior = JSON.parse(await fs.readFile(path.join(out, 'states.json'), 'utf8'));
    results.push(...prior.results.filter(r => !sizes.some(size => cases.some(kind => r.name === `${kind}-${size}`))));
} catch { /* first capture batch */ }
try {
    for (const size of sizes) for (const kind of cases) {
        const [width, height] = size.split('x').map(Number), name = `${kind}-${size}`;
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1000, deviceScaleFactor: 1 });
        page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
        await page.exposeFunction('geoShot', async (part, state) => {
            const file = `${name}-${part}.webp`;
            await sharp(await page.screenshot()).webp({ quality: 90 }).toFile(path.join(out, file));
            results.push({ name, file, ...state });
            await fs.writeFile(path.join(out, 'states.json'), JSON.stringify({ baseline, setup: 'staged prerequisites; actual pickup/portal inputs and story', results, errors }, null, 2));
            console.log(file);
        });
        await page.exposeFunction('geoResize', async (width, height) => page.setViewportSize({ width, height }));
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.waitForSelector('.sk-title');
        await page.getByText('Jag har en kod').click();
        await page.fill('.sk-code-input', 'fyr fjun klo');
        await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await page.waitForFunction(() => {
            const { G, ui, story, view } = window.__skoldhast.debug;
            if (ui.dialogueOpen()) ui.advance();
            if (ui.panelOpen()) ui.closePanel();
            return G.sceneId === 'viken' && view.built('viken') && !G.busy && !story.running();
        }, null, { timeout: 60000 });
        const result = await page.evaluate(async ({ kind, baseline, big, width, height }) => {
            const api = window.__skoldhast; api.pause();
            const { G, ui, view, app, assets, story, input, guide, companion } = api.debug;
            const { CODE_RESTORE } = await import('/skoldhast/src/save.mjs');
            const { snapshot, STEP } = await import('/skoldhast/src/sim.mjs');
            await Promise.all(assets.bundles().map(b => assets.load(b)));
            input.release = () => {};
            companion.restore([]);
            let flags = [...CODE_RESTORE[2].flags];
            if (kind === 'outflow') flags = flags.filter(f => !['marks_both', 'b:k2_end', 'ch2_end'].includes(f));
            else if (kind !== 'portal') {
                const remove = ['mark_land', 'b:k2_mark_land', 'clue_mark_land', 'clue_lighthouse', 'marks_both', 'b:k2_end', 'ch2_end'];
                if (kind === 'early') remove.push(...CODE_RESTORE[1].flags.filter(f => !['intro_done', 'b:k1_enter', 'b:k1_stopwatch', 'klo_hidden', 'b:k1_ja', 'klo_ja', 'b:k1_mapcorner', 'rule_demo', 'clue_map_corner'].includes(f)), 'ch2_open', 'b:k2_open', 'b:k2_note2', 'clue_note2', 'p5_lit', 'b:k2_lit', 'b:k2_lanterns', 'p6_flat', 'mark_sea', 'b:k2_mark_sea', 'clue_mark_sea', 'peeled_trench-paper');
                flags = flags.filter(f => !remove.includes(f));
                flags.push('b:k2_leap_purpose');
            }
            G.restore({ flags, checkpoint: 'start' });
            const target = kind === 'outflow' ? { scene: 'kelp', x: 36, y: 8.5, mode: 'swim', facing: 1 } : kind === 'portal' ? { scene: 'kelp', x: 46.6, y: baseline ? 2.8 : 4.1, mode: 'swim', facing: 1 } : { scene: 'land', x: 4.6, y: -4.02, mode: 'ground', facing: -1 };
            G.goto(target.scene, { ...target, x: target.x * 200, y: target.y * 200 }, { silent: true });
            G.helpLevel = 'guided'; G.lessMotion = false; G.camHint = null;
            story.restoreActors(); view.setScene(target.scene); view.cam.snap = true;
            ui.setBigText(big); ui.showControls(true); guide.clear();
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k, bubbles: true, cancelable: true }));
            const events = []; G.on('*', (type, data) => { if (['mark', 'exit', 'scene', 'checkpoint'].includes(type)) events.push({ type, ...data, player: { x: G.player.x, y: G.player.y, mode: G.player.mode } }); });
            const render = () => {
                if (G.sceneId !== view.sceneId && !G.vista) view.setScene(G.sceneId);
                view.render(snapshot(G.player, 1, G.terrain, G.time), .1);
                ui.updateSpeaker(ui.speaker(), view.speakerBounds(ui.speaker()));
                const free = !G.busy && !G.vista && !ui.dialogueOpen() && !ui.panelOpen();
                G.guidance = story.guidance(); G.showGuidance = free;
                guide.goal(G.guidance.goal); guide.context({ ...G.guidance, requested: false }); guide.show(free); guide.update();
                app.render();
            };
            const rect = node => { const r = node?.getBounds?.(); return r && { x: r.x, y: r.y, width: r.width, height: r.height }; };
            const find = (node, label) => node.label === label ? node : (node.children || []).map(n => find(n, label)).find(Boolean);
            const state = () => {
                const dlg = document.querySelector('.sk-dialogue.on')?.getBoundingClientRect();
                const passage = find(view.world, 'water-passage-' + (G.sceneId === 'kelp' ? 'kelp' : 'viken'));
                const hud = [...document.querySelectorAll('.sk-goal, .sk-hintbubble.on, .sk-think.on')].filter(el => {
                    const css = getComputedStyle(el), r = el.getBoundingClientRect();
                    return css.visibility !== 'hidden' && Number(css.opacity) > .1 && r.width && r.height;
                }).map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
                return { scene: G.sceneId, shownScene: view.sceneId, player: { x: G.player.x, y: G.player.y, mode: G.player.mode, vx: G.player.vx, vy: G.player.vy, hidden: G.player.hidden }, cam: { ...view.cam }, camHint: G.camHint, focus: view.landFocus, beat: story.running(), flags: [...G.flags], dialogue: document.querySelector('.sk-dlg-text')?.textContent,
                    dialogueBox: dlg && { x: dlg.x, y: dlg.y, width: dlg.width, height: dlg.height }, hud, controlsOff: ui.controls.classList.contains('off'),
                    vista: view.vista && { phase: view.vista.phase, tower: rect(view.vista.tower), lamp: rect(view.vista.lamp), lampAlpha: view.vista.lamp.alpha, reflection: rect(view.vista.reflection), reflectionLamp: rect(view.vista.reflection._lamp), reflectionLampAlpha: view.vista.reflection._lamp.alpha },
                    map: view.mapAssembly?.phase, passage: passage?.waterPassage, events: [...events] };
            };
            const verifyVista = s => {
                if (!s.vista || s.shownScene !== 'viken' || !s.controlsOff) throw Error('lighthouse comparison must own the displayed bay and controls');
                if (s.vista.lampAlpha !== 0 || s.vista.reflectionLampAlpha <= 0) throw Error('only reflected lighthouse lens must shine');
                const d = s.dialogueBox;
                for (const [label, box] of [['tower', s.vista.tower], ['reflected lens', s.vista.reflectionLamp]]) {
                    if (!box || box.x < 0 || box.y < 0 || box.x + box.width > innerWidth || box.y + box.height > innerHeight) throw Error(label + ' clipped by viewport: ' + JSON.stringify(box));
                    if (d && box.x < d.x + d.width && box.x + box.width > d.x && box.y < d.y + d.height && box.y + box.height > d.y) throw Error(label + ' covered by dialogue');
                    for (const h of s.hud) if (box.x < h.x + h.width && box.x + box.width > h.x && box.y < h.y + h.height && box.y + box.height > h.y) throw Error(label + ' covered by live guidance');
                }
            };
            const verifyFocus = s => {
                const f = s.focus?.frame, c = s.cam, d = s.dialogueBox;
                if (!f || !s.controlsOff) throw Error('arrival must keep a held world frame');
                const b = { x: (f.x0 - c.x) * c.zoom + innerWidth / 2, y: (f.y0 - c.y) * c.zoom + innerHeight / 2, width: (f.x1 - f.x0) * c.zoom, height: (f.y1 - f.y0) * c.zoom };
                if (b.x < 0 || b.y < 0 || b.x + b.width > innerWidth || b.y + b.height > innerHeight) throw Error('held arrival frame clipped: ' + JSON.stringify(b));
                if (d && b.x < d.x + d.width && b.x + b.width > d.x && b.y < d.y + d.height && b.y + b.height > d.y) throw Error('held arrival frame covered by dialogue');
            };
            for (let i = 0; i < 60; i++) render();
            await window.geoShot('approach', state());
            const moveKey = kind === 'portal' ? 'ArrowRight' : 'ArrowLeft';
            if (kind !== 'outflow') key(moveKey, true);
            let released = false, cards = 0, lighthouse = null, arrival = null, lastText = '', hillRestored = null, held = false;
            for (let step = 0; step < 15000; step++) {
                const triggered = kind === 'portal' ? G.sceneId === 'viken' : G.has('mark_land');
                if (triggered && !released) { key(moveKey, false); released = true; }
                G.step({ ...input.state(), ...input.consume() });
                await Promise.resolve();
                if (step % 12 === 0) render();
                if (ui.dialogueOpen()) {
                    key(moveKey, false);
                    await sleep(420); for (let i = 0; i < 35; i++) render();
                    const text = document.querySelector('.sk-dlg-text')?.textContent || '';
                    if (text !== lastText) {
                        lastText = text; cards++;
                        const s = state();
                        await window.geoShot(`card-${String(cards).padStart(2, '0')}`, s);
                        if (/spegelbilden/i.test(text) && kind !== 'portal') lighthouse = s;
                        if (kind === 'portal') arrival = s;
                        if (!baseline && kind === 'portal' && /Samma hav/i.test(text) && s.focus?.id !== 'bay-inlet') throw Error('arrival lost ownership of its bay-inlet frame');
                        if (!baseline && s.focus) verifyFocus(s);
                        if (!baseline && s.vista) {
                            verifyVista(s);
                            if (!held && /spegelbilden/i.test(text)) {
                                held = true;
                                for (let i = 0; i < 840; i++) { G.step({}); if (i % 12 === 0) { render(); await Promise.resolve(); } }
                                await sleep(1500); for (let i = 0; i < 30; i++) render();
                                const after = state(); verifyVista(after);
                                if (after.dialogue !== s.dialogue || after.player.x !== s.player.x || after.player.y !== s.player.y) throw Error('slow reading changed comparison or player position');
                                await window.geoShot('held-lighthouse', after);
                                if (kind === 'early' && width === 390) {
                                    await window.geoResize(height, width); await sleep(500); for (let i = 0; i < 90; i++) render();
                                    const rotated = state(); verifyVista(rotated); await window.geoShot('held-rotated', rotated);
                                    await window.geoResize(width, height); await sleep(300); for (let i = 0; i < 90; i++) render();
                                }
                            }
                        }
                    }
                    ui.advance(); await sleep(100);
                } else if (ui.panelOpen()) ui.closePanel();
                if (G.busy && step % 30 === 0) await new Promise(requestAnimationFrame);
                if (kind !== 'portal' && kind !== 'outflow' && G.has('b:k2_mark_land') && !hillRestored) {
                    hillRestored = state(); await window.geoShot('hill-restored', hillRestored);
                }
                const done = kind === 'portal' ? G.has('b:k3_arrive') : kind === 'outflow' || kind === 'sea' && !baseline ? G.has('b:k2_end') : G.has('b:k2_mark_land');
                if (done) break;
                if (step === 14999) throw Error(`continuity timeout ${kind} ${JSON.stringify(state())}`);
            }
            key(moveKey, false); for (let i = 0; i < 90; i++) render();
            const restored = state(); await window.geoShot('restored', restored);
            return { kind, cards, lighthouse, arrival, restored, hillRestored, events, initialFlags: flags };
        }, { kind, baseline, big: width < 1000, width, height });
        if (kind === 'outflow') assert.ok(result.restored.flags.includes('ch2_end') && !result.initialFlags.includes('ch2_end'), 'saved inventory triggers actual underwater assembly and outflow reading');
        else assert.ok(result.events.some(e => e.type === (kind === 'portal' ? 'exit' : 'mark')), 'actual production trigger occurred');
        if (kind === 'early') assert.ok(!result.initialFlags.includes('ch1_end') && !result.initialFlags.includes('p2_open'), 'early land precedes the cave');
        if (kind !== 'portal' && kind !== 'outflow') {
            assert.ok(result.lighthouse, 'actual lighthouse line was shown');
            if (!baseline) { assert.equal(result.lighthouse.shownScene, 'viken'); assert.ok(result.lighthouse.vista); }
            assert.equal(result.restored.scene, 'land');
            if (!baseline) { assert.equal(result.hillRestored.shownScene, 'land'); assert.equal(result.hillRestored.vista, null); assert.equal(result.hillRestored.controlsOff, false); }
        }
        console.log(`PASS ${name}: ${result.cards} actual dialogue cards`);
        await page.close();
    }
    assert.deepEqual(errors, []);
} finally { await browser.close(); server.close(); }
