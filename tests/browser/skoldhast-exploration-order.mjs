#!/usr/bin/env node
/*
 * Real browser exploration after the prologue, through the cave, hills and map.
 * Movement uses DOM keyboard/touch input and real 1/120 s simulation. Only the
 * starting post-prologue state is staged; travel, puzzles and discoveries are
 * earned. Dialogues/reports use the real UI and are acknowledged by the robot.
 *
 * node tests/browser/skoldhast-exploration-order.mjs [--order cave-first|land-first]
 *   [--viewport 390x844] [--out docs/skoldhast/shots/exploration-order]
 * Default: cave-first at both phone sizes + desktop, land-first on desktop.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
process.env.NO_TEST = '1';
const routeModule = await import('../skoldhast-playthrough.test.mjs');
const routeNames = ['meetKlo', 'openCave', 'landApproach', 'caveReveal', 'chapter1', 'kelpFragment', 'seaFragment', 'returnToLand', 'landFragment', 'earlyLandFirst'];
const routeSource = routeNames.map(name => `const ${name} = (${routeModule[name].toString()});`).join('\n');
const arg = name => { const at = process.argv.indexOf(name); return at < 0 ? null : process.argv[at + 1]; };
const out = path.resolve(arg('--out') || 'docs/skoldhast/shots/exploration-order');
const orders = arg('--order') ? [arg('--order')] : ['cave-first', 'land-first'];
const sizes = arg('--viewport') ? [arg('--viewport')] : ['390x844', '844x390', '1440x900'];
const errors = [], results = [];
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch();
let current = null, active = '';
try {
    for (const order of orders) for (const size of sizes) {
        if (!arg('--order') && !arg('--viewport') && order === 'land-first' && size !== '1440x900') continue;
        const [width, height] = size.split('x').map(Number), touchMode = width < 1000;
        const mode = { order, size, touchMode, big: touchMode, reduced: size === '844x390' };
        const page = current = await browser.newPage({ viewport: { width, height }, hasTouch: touchMode, isMobile: touchMode, deviceScaleFactor: 1 });
        active = `${order}-${size}`;
        page.on('pageerror', e => errors.push(`${active}: ${e.message}`));
        await page.exposeFunction('explorationShot', async name => {
            await sharp(await page.screenshot()).webp({ quality: 90 }).toFile(path.join(out, `${active}-${name}.webp`));
            console.log(`${active}: ${name}`);
        });
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.waitForSelector('.sk-title', { timeout: 60000 });
        await page.getByText('Jag har en kod').click();
        await page.fill('.sk-code-input', 'fyr fjun klo');
        await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await page.waitForFunction(() => {
            const { G, ui, story, view } = window.__skoldhast.debug;
            if (ui.dialogueOpen()) ui.advance();
            if (ui.panelOpen()) ui.closePanel();
            window.__readyFrames = G.sceneId === 'viken' && view.built('viken') && !G.busy && !story.running() ? (window.__readyFrames || 0) + 1 : 0;
            return window.__readyFrames > 30;
        }, null, { timeout: 60000 });
        await page.evaluate(async mode => {
            const api = window.__skoldhast; api.pause();
            const { G, ui, view, assets, story, guide, companion } = api.debug;
            await Promise.all(assets.bundles().map(bundle => assets.load(bundle)));
            companion.restore([]); G.restore({ flags: ['intro_done'], checkpoint: 'start' });
            G.helpLevel = 'guided'; G.lessMotion = mode.reduced;
            story.restoreActors(); view.setScene('land'); view.cam.snap = true;
            ui.setBigText(mode.big); ui.root.classList.toggle('less-motion', mode.reduced);
            ui.showControls(true); guide.clear();
            const draw = ui.draw; ui.draw = opts => { window.__journeyDraw = opts; return draw(opts); };
        }, mode);
        const result = await page.evaluate(async ({ order, touchMode, routeSource }) => {
        const api = window.__skoldhast, d = api.debug;
        const { G, input, view, app, ui, story, guide } = d;
        const { snapshot, C, STEP } = await import('/skoldhast/src/sim.mjs');
        const { p6Pose, p6Progress } = await import('/skoldhast/src/kelp-puzzle.mjs');
        const { seabedFoldGeometry } = await import('/skoldhast/src/folded-seabed.mjs');
        api.pause();
        // The paused production RAF releases controls defensively every frame.
        // This test owns input while it drives fixed steps, so leave that RAF
        // free to service visual effects without clearing our held DOM input.
        input.release = () => {};
        const assert = { ok(v, m) { if (!v) throw Error(m || 'assertion failed'); }, equal(a, b, m) { if (a !== b) throw Error(`${m || 'not equal'}: ${a} !== ${b}`); } };
        const routes = new Function('assert', `${routeSource}; return {chapter1, seaFragment, returnToLand, landFragment, earlyLandFirst};`)(assert);
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
                if (y !== ky) { if (ky) key(ky < 0 ? 'ArrowUp' : 'x', false); if (y) key(y < 0 ? 'ArrowUp' : 'x', true); ky = y; }
            }
        }
        drive.pulse = 0;
        function render() {
            if (G.sceneId !== view.sceneId && !G.vista) view.setScene(G.sceneId);
            G.guidance = story.guidance();
            view.render(snapshot(G.player, 0, G.terrain, G.time), STEP * 12);
            ui.setContext(G.context?.label, G.player.hidden);
            ui.updateSpeaker(ui.speaker(), view.speakerBounds(ui.speaker()));
            const free = !G.busy && !ui.dialogueOpen() && !ui.panelOpen();
            G.showGuidance = free; guide.goal(G.guidance.goal);
            guide.context({ ...G.guidance, requested: false }); guide.show(free); guide.update();
        }
        async function panels() {
            while (ui.dialogueOpen() || ui.panelOpen() || document.querySelector('.sk-draw.on')) {
                render(); app.render();
                if (ui.dialogueOpen()) { await inspectHold(); await sleep(365); ui.advance(); }
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
            await inspectPuzzle();
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
            flag: async (f, inp, max = 30) => {
                await until(() => has(f), inp, max, `flag ${f}`);
                // Watch the released paper rise before emerging to collect it.
                // All movement still comes from the real current and physics.
                if (f === 'p6_flat') await until(() => p6Pose(G).fragment.rise === 1, {}, 8, 'paper reaches its safe kelp pocket');
            },
            act: () => step({ act: true }), hide: () => step({ hide: true }),
            hop: () => step({ hop: true }),
            gallopPast: async (x, { max = 60, hopHeld = false } = {}) => { const dir = Math.sign(x * 200 - p().x); await until(() => (p().x - x * 200) * dir > 0, { x: dir, hopHeld }, max, `gallop ${x}`); },
            context: async id => { await until(() => G.context?.id === id, {}, 5, `context ${id}`); await step({ act: true }); }
        };
        const held = [], captured = new Set(), puzzle = [], puzzleCaptured = new Set();
        async function inspectPuzzle() {
            if (G.sceneId !== 'kelp' || !has('ch2_open') || has('mark_sea') || G.busy || ui.dialogueOpen()) return;
            const pose = p6Pose(G), def = G.scenes.kelp.kelpPuzzle;
            const kind = G.context?.id === 'p6-grab' ? 'grab'
                : pose.pulling && pose.pull > .35 ? 'pull'
                : pose.phase === 'reach-fold' && p().hidden && p().hide > .95 ? 'carry'
                : pose.phase === 'press-fold' && pose.flat > .45 ? 'press'
                : pose.fragment.visible && pose.fragment.rise > .3 && pose.fragment.rise < .9 ? 'rising'
                : pose.fragment.visible && pose.fragment.rise === 1 ? 'pocket' : null;
            if (!kind || puzzleCaptured.has(kind)) return;
            puzzleCaptured.add(kind);
            for (let i = 0; i < 45; i++) render();
            app.render(); await sleep(100);
            const find = (node, label) => node.label === label ? node : (node.children || []).map(n => find(n, label)).find(Boolean);
            for (const label of ['kelp-puzzle-scene', 'p6-tether', 'p6-current', 'p6-pocket', 'p6-fragment', 'folded-illustrated-seabed']) assert.ok(find(view.world, label), `P6 renders ${label}`);
            const geometry = seabedFoldGeometry({ ...def.fold, flat: pose.flat });
            if (kind === 'press') {
                assert.ok(p().hidden, 'shell remains hidden while pressing');
                assert.ok(Math.abs(p().x - geometry.peak[0]) < 1 && Math.abs(p().y - (geometry.peak[1] - def.shellContactOffset)) < 1, 'visible shell and paper descend at the same contact point');
            }
            if (kind === 'rising' || kind === 'pocket') {
                assert.ok(p().hidden && !has('mark_sea'), 'released paper remains uncollected beneath the hidden shell');
                const prop = find(view.world, 'p6-fragment');
                assert.ok(prop.visible && Math.abs(prop.x - pose.fragment.x) < 1 && Math.abs(prop.y - pose.fragment.y) < 1, 'loose paper is drawn at its actual pickup position');
            }
            const points = [{ name: 'horse', x: p().x, y: p().y - 100 }];
            if (kind === 'grab') points.push({ name: 'loose end', ...def.tether.loose });
            if (kind === 'pull') points.push({ name: 'snag', ...def.tether.hook }, { name: 'grip', ...pose.tetherEnd });
            if (kind === 'carry' || kind === 'press') points.push({ name: 'crease', x: geometry.peak[0], y: geometry.peak[1] });
            if (kind === 'rising' || kind === 'pocket') points.push({ name: 'paper', x: pose.fragment.x, y: pose.fragment.y - 40 });
            const projected = points.map(pt => ({ name: pt.name, x: (pt.x - view.cam.x) * view.cam.zoom + innerWidth / 2, y: (pt.y - view.cam.y) * view.cam.zoom + innerHeight / 2 }));
            for (const pt of projected) assert.ok(pt.x >= 0 && pt.x <= innerWidth && pt.y >= 0 && pt.y <= innerHeight, `P6 ${kind}: ${pt.name} stays visible ${JSON.stringify(pt)}`);
            const obstacles = [...document.querySelectorAll('.sk-hintbubble.on, .sk-think.on, .sk-goal:not(.empty), .sk-controls:not(.off) .sk-btn')]
                .filter(el => getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > .1)
                .map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
            for (const pt of projected) for (const box of obstacles) assert.ok(pt.x < box.x || pt.x > box.x + box.width || pt.y < box.y || pt.y > box.y + box.height, `P6 ${kind}: ${pt.name} clears live guidance`);
            if (kind === 'rising' || kind === 'pocket') {
                const box = find(view.world, 'p6-fragment').getBounds();
                for (const card of obstacles) assert.ok(box.x + box.width <= card.x || card.x + card.width <= box.x || box.y + box.height <= card.y || card.y + card.height <= box.y, `P6 ${kind}: actual paper clears live guidance`);
            }
            const record = { kind, pose, progress: p6Progress(G), player: { x: p().x, y: p().y, hidden: p().hidden, hide: p().hide }, projected, obstacles, guidance: G.guidance };
            puzzle.push(record); await window.explorationShot(`p6-${kind}`);
        }
        const selectedFocus = new Set(['pool', 'sea-fold-reveal', 'vault-approach', 'ramp', 'waveMarks', 'land-search', 'land-route', 'landmark', 'leap', 'seabed-fold']);
        async function inspectHold() {
            const focus = view.landFocus, map = view.mapAssembly;
            if (!(focus && selectedFocus.has(focus.id)) && !map) return;
            const line = document.querySelector('.sk-dlg-text')?.textContent;
            const kind = focus?.id || `map-${map.variant}-${map.fragment || map.focus || 'route'}`;
            const key = `${kind}:${line}`;
            if (captured.has(key)) return;
            captured.add(key); drive(0, 0);
            for (let i = 0; i < 60; i++) render();
            app.render(); await sleep(100);
            const rect = r => ({ x: r.x, y: r.y, width: r.width, height: r.height });
            const card = rect(document.querySelector('.sk-dialogue.on').getBoundingClientRect());
            const textRange = document.createRange(); textRange.selectNodeContents(document.querySelector('.sk-dlg-text'));
            const text = rect(textRange.getBoundingClientRect());
            assert.ok(card.x >= -1 && card.y >= -1 && card.x + card.width <= innerWidth + 1 && card.y + card.height <= innerHeight + 1, `${kind}: card fits`);
            assert.ok(text.x >= card.x && text.x + text.width <= card.x + card.width + 1 && text.y >= card.y && text.y + text.height <= card.y + card.height + 1, `${kind}: text fits card`);
            const separated = (a, b) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
            const art = [];
            if (focus) {
                const f = focus.frame, c = view.cam;
                art.push({ kind: focus.id, x: (f.x0 - c.x) * c.zoom + innerWidth / 2, y: (f.y0 - c.y) * c.zoom + innerHeight / 2,
                    width: (f.x1 - f.x0) * c.zoom, height: (f.y1 - f.y0) * c.zoom });
                assert.ok(!map, `${kind}: map cannot cover world evidence`);
                assert.equal(getComputedStyle(document.querySelector('.sk-toasts')).visibility, 'hidden', `${kind}: notifications cannot cover world evidence`);
                if (focus.id === 'leap') {
                    const find = n => n.label === 'map-fragment-land' ? n : (n.children || []).map(find).find(Boolean);
                    const fragment = find(view.world), box = fragment?.getBounds();
                    assert.ok(fragment?.visible && box && box.width > 2 && box.x >= 0 && box.y >= 0 && box.x + box.width <= innerWidth && box.y + box.height <= innerHeight, 'cliff approach frames the actual uncollected land fragment');
                    assert.ok(separated(rect(box), card), 'the actual target clears dialogue');
                }
            } else {
                const find = n => n.label === 'map-assemble' ? n : (n.children || []).map(find).find(Boolean);
                const effect = find(view.root);
                for (const n of effect?.children || []) if (n.label === 'map-scene-sheet' || 'text' in n) art.push({ kind: n.label || 'caption', ...rect(n.getBounds()) });
                assert.ok(art.length >= 2, `${kind}: map art and caption exist`);
                if (map.variant === 'search') {
                    const sheet = effect.children.find(n => n.label === 'map-scene-sheet');
                    const labels = sheet.children.map(n => n.label);
                    const earnedLand = has('mark_land') || has('clue_mark_land');
                    const expected = ['map-scene-piece-corner', ...(earnedLand ? ['map-scene-piece-land'] : [])].sort().join(',');
                    assert.equal(labels.filter(l => l?.startsWith('map-scene-piece-')).sort().join(','), expected, 'planning shows exactly the earned artwork');
                    for (const id of ['map-scene-missing-sea', 'map-search-directions']) assert.ok(labels.includes(id), `search has ${id}`);
                    assert.equal(labels.includes('map-scene-missing-land'), !earnedLand, 'land is missing only until collected');
                    if (earnedLand) assert.ok(labels.includes('map-search-earned-land'), 'search acknowledges the early land discovery');
                    assert.equal(map.route, 0, 'search cannot show the completed route');
                }
            }
            for (const box of art) {
                assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= innerWidth + 1 && box.y + box.height <= innerHeight + 1, `${kind}: artwork fits ${JSON.stringify(box)}`);
                assert.ok(separated(box, card), `${kind}: artwork clears dialogue`);
            }
            assert.ok(ui.controls.classList.contains('off'), `${kind}: held scene owns controls`);
            const evidence = () => { const m = view.mapAssembly; return m ? [m.variant, m.phase, m.joined, m.reveal, m.route] : [view.landFocus?.id]; };
            const flags = [...G.flags].sort().join('|'), state = JSON.stringify(evidence());
            view.render(snapshot(G.player, 1, G.terrain, G.time), 4); app.render();
            assert.equal(document.querySelector('.sk-dlg-text')?.textContent, line, `${kind}: reading keeps dialogue`);
            assert.equal([...G.flags].sort().join('|'), flags, `${kind}: reading cannot commit next clue`);
            assert.equal(JSON.stringify(evidence()), state, `${kind}: evidence stays held`);
            const record = { kind, line, card, art, flags: [...G.flags], objective: story.objective() };
            held.push(record); await window.explorationShot(`${String(held.length).padStart(2, '0')}-${kind}`);
        }
        if (order === 'cave-first') {
            await routes.chapter1(R);
            assert.ok(has('ch1_end') && has('ch2_open') && has('b:k2_open'), 'cave reaches the full discovery and fragment plan');
            assert.ok(!has('p1_inked') && !has('p3_done') && !has('mark_land'), 'cave-first did not require the hills');
        } else {
            await routes.earlyLandFirst(R);
            assert.ok(has('mark_land') && !has('mark_sea'), 'land piece is earned before entering the sea');
            assert.ok(held.some(h => h.kind === 'map-fragment-land' && !h.flags.includes('p2_open') && !h.flags.includes('ch2_open')), 'early land discovery is shown before cave or sea unlock');
        }
        await routes.seaFragment(R);
        assert.ok(has('mark_sea'), 'physical sea puzzle ends in actual collection');
        if (order === 'cave-first') {
            assert.ok(!has('mark_land') && !has('marks_both'), 'sea discovery does not bypass the missing land fragment');
            await routes.returnToLand(R);
            await routes.landFragment(R);
        }
        await settle();
        for (const flag of ['p1_inked', 'p3_done', 'p4_leap', 'mark_land', 'mark_sea', 'marks_both', 'ch2_end']) assert.ok(has(flag), `natural route earns ${flag}`);
        assert.ok(held.some(h => h.kind === 'sea-fold-reveal'), 'sea reveal was player paced');
        assert.ok(held.some(h => h.kind.startsWith('map-search')), 'missing-fragment plan was visible');
        assert.ok(held.some(h => h.kind === 'ramp') && held.some(h => h.kind === 'waveMarks'), 'real hill path was explained');
        for (const phase of ['grab', 'pull', 'carry', 'press', 'rising', 'pocket']) assert.ok(puzzle.some(p => p.kind === phase), `physical puzzle shows ${phase}`);
        assert.ok(held.some(h => h.kind === 'map-fragment-sea'), 'actual collection opens the sea piece closeup');
        assert.equal(view.landFocus, null); assert.equal(view.mapAssembly, null);
        assert.ok(!ui.controls.classList.contains('off'), 'normal controls return after the story');
        assert.ok(getComputedStyle(document.querySelector('.sk-toasts')).visibility !== 'hidden', 'notifications restore after held evidence');
        return { order, steps, flags: [...G.flags], held, puzzle, log };
        }, { order, touchMode, routeSource });
        results.push({ ...mode, ...result });
        await fs.writeFile(path.join(out, `${active}-results.json`), JSON.stringify({ mode, result }, null, 2));
        await fs.rm(path.join(out, `FAIL-${active}.webp`), { force: true });
        console.log(`${active}: passed ${result.steps} steps, ${result.held.length} held evidence cards`);
        await page.close(); current = null;
    }
    assert.deepEqual(errors, [], 'no browser errors');
    await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ results, errors }, null, 2));
} catch (error) {
    if (current && !current.isClosed()) {
        await sharp(await current.screenshot()).webp({ quality: 90 }).toFile(path.join(out, `FAIL-${active}.webp`));
        console.error(await current.evaluate(() => { const { G, story, view } = window.__skoldhast.debug; return { scene: G.sceneId, player: [G.player.x, G.player.y], flags: [...G.flags], beat: story.running(), dialogue: document.querySelector('.sk-dlg-text')?.textContent, focus: view.landFocus, map: view.mapAssembly }; }).catch(() => null));
    }
    throw error;
} finally { await browser.close(); server.close(); }
