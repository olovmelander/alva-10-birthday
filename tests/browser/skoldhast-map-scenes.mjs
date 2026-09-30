#!/usr/bin/env node
// Actual story beats: earned fragments, route repair, the keeper's separate
// classification sheet, and the repaired evidence returned at the finale.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { STORY } from '../../skoldhast/src/content/sv.mjs';
import { CODE_RESTORE } from '../../skoldhast/src/save.mjs';

const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const out = path.resolve(arg('--out') || 'docs/skoldhast/shots/maps/scenes');
const selectedSize = arg('--viewport');
const rotationOnly = process.argv.includes('--rotation-only');
const modes = selectedSize
    ? [{ size: selectedSize, big: process.argv.includes('--big-text'), reduced: process.argv.includes('--less-motion') }]
    : [{ size: '390x844', big: true, reduced: false }, { size: '844x390', big: true, reduced: true }, { size: '1440x900', big: false, reduced: false }];
const chapter2 = [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open', 'b:k2_note2', 'p4_leap', 'b:k2_leap', 'p5_lit', 'b:k2_lit'];
const guardianFlags = [...CODE_RESTORE[2].flags, 'ch3_open', 'viken_arrived', 'b:k3_arrive', 'shutter1', 'shutter2', 'shutter3', 'lamp_lit', 'b:k3_lamp', 'kv_met', 'talk1', 'b:k3_talk1'];
const separated = (a, b) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch(), errors = [], results = [];
let activePage = null, activeName = 'boot';
try {
    for (const mode of modes) {
        const [width, height] = mode.size.split('x').map(Number);
        const name = `${mode.size}${mode.big ? '-big' : ''}${mode.reduced ? '-reduced' : ''}`;
        const page = activePage = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1000, deviceScaleFactor: 1 });
        page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
        page.on('console', m => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.waitForSelector('.sk-title', { timeout: 60000 });
        await page.getByText('Jag har en kod').click();
        await page.fill('.sk-code-input', 'kelp mås skal');
        await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        async function settle() {
            await page.waitForFunction(() => {
                const { G, ui, story, view } = window.__skoldhast.debug;
                if (ui.dialogueOpen()) ui.advance();
                if (ui.panelOpen()) ui.closePanel();
                return G.sceneId && !G.busy && !story.running() && !view.mapAssembly && !ui.dialogueOpen() && !ui.panelOpen();
            }, null, { timeout: 60000 });
        }
        await settle();
        await page.evaluate(async () => {
            window.__mapSim = await import('/skoldhast/src/sim.mjs');
            const { assets } = window.__skoldhast.debug;
            await Promise.all(assets.bundles().map(bundle => assets.load(bundle)));
        });
        async function stage(flags, checkpoint, { trigger, spawn } = {}) {
            await page.evaluate(({ flags, checkpoint, trigger, spawn, mode }) => {
                const api = window.__skoldhast; api.pause();
                const { G, story, view, ui, guide, companion } = api.debug;
                window.__mapOff?.(); companion.restore([]);
                G.restore({ flags, checkpoint });
                if (spawn) G.goto(spawn.scene, spawn.at, { silent: true });
                story.restoreActors(); G.lessMotion = mode.reduced;
                view.setScene(G.sceneId); view.cam.snap = true;
                ui.showControls(true); ui.setBigText(mode.big); guide.clear();
                window.__mapRouteEvents = [];
                window.__mapOff = G.on('flag', e => {
                    if (e.flag === 'marks_both') window.__mapRouteEvents.push({ phase: view.mapAssembly?.phase, variant: view.mapAssembly?.variant, route: view.mapAssembly?.route });
                });
                if (trigger) G.emit('mark', { id: trigger });
                api.resume();
            }, { flags, checkpoint, trigger, spawn, mode });
        }
        async function read(line, expected, shotName, realHold = false) {
            activeName = `${name}-${shotName}`;
            await page.waitForFunction(text => document.querySelector('.sk-dialogue.on .sk-dlg-text')?.textContent === text, line[1], { timeout: 60000 });
            await page.waitForTimeout(420);
            const measure = () => page.evaluate(() => {
                const { G, ui, view } = window.__skoldhast.debug;
                function find(node) { if (node.label === 'map-assemble') return node; for (const child of node.children || []) { const found = find(child); if (found) return found; } }
                const effect = find(view.root), sheet = effect?.children.find(child => child.label === 'map-scene-sheet');
                const rectangle = b => ({ x: b.x, y: b.y, width: b.width, height: b.height });
                const content = effect?.children.filter(child => child === sheet || 'text' in child).map(child => ({ kind: child === sheet ? 'sheet' : 'caption', ...rectangle(child.getBounds()) }));
                const text = document.querySelector('.sk-dlg-text'), card = document.querySelector('.sk-dialogue.on');
                return { state: view.mapAssembly, content, card: rectangle(card.getBoundingClientRect()), text: text.textContent,
                    speaker: ui.speaker(), textFits: text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1,
                    routeOpen: G.has('marks_both'), routeEvents: window.__mapRouteEvents, flags: [...G.flags].sort(),
                    controlsHidden: ui.controls.classList.contains('off'), hudHidden: document.querySelector('.sk-hud').classList.contains('off'),
                    guideHidden: document.querySelector('.sk-guide').classList.contains('off'), busy: G.busy,
                    toastsHidden: getComputedStyle(document.querySelector('.sk-toasts')).visibility === 'hidden',
                    speechMarkHidden: getComputedStyle(document.querySelector('.sk-speaking')).visibility === 'hidden',
                    pieceIds: sheet?.children.filter(child => child.label?.startsWith('map-scene-piece-')).map(child => child.label.slice(16)),
                    missingIds: sheet?.children.filter(child => child.label?.startsWith('map-scene-missing-')).map(child => child.label.slice(18)),
                    guardian: !!sheet?.children.some(child => child.label === 'guardian-map-paper') };
            });
            let state = await measure();
            if (shotName === 'assembly-seam' && mode === modes[0]) {
                await page.setViewportSize({ width: height, height: width });
                await page.waitForFunction(w => window.__skoldhast.debug.app.screen.width === w, height);
                await page.waitForTimeout(400);
                const rotated = await measure();
                assert.equal(rotated.text, state.text);
                assert.equal(rotated.state.phase, state.state.phase);
                assert.equal(rotated.state.joined, state.state.joined);
                assert.equal(rotated.routeOpen, state.routeOpen);
                assert.deepEqual(rotated.flags, state.flags);
                assert.ok(rotated.textFits, `${activeName}: rotated dialogue text fits`);
                for (const box of rotated.content) {
                    assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= height + 1 && box.y + box.height <= width + 1,
                        `${activeName}: rotated ${box.kind} fits`);
                    assert.ok(separated(box, rotated.card), `${activeName}: rotated ${box.kind} clears dialogue`);
                }
                await page.setViewportSize({ width, height });
                await page.waitForFunction(w => window.__skoldhast.debug.app.screen.width === w, width);
                await page.waitForTimeout(400);
                const restored = await measure();
                assert.equal(restored.text, state.text);
                assert.equal(restored.state.phase, state.state.phase);
                assert.deepEqual(restored.flags, state.flags);
                state = restored;
                state.rotationVerified = true;
            }
            await sharp(await page.screenshot()).webp({ quality: 92 }).toFile(path.join(out, `${activeName}.webp`));
            assert.equal(state.speaker, line[0]);
            assert.ok(state.textFits, `${activeName}: text fits`);
            assert.ok(state.busy && state.controlsHidden && state.hudHidden && state.guideHidden, `${activeName}: gameplay controls yield to the real story`);
            assert.ok(state.toastsHidden && state.speechMarkHidden, `${activeName}: world toasts and speech marks cannot cover the close-up`);
            assert.ok(state.state, `${activeName}: the map is visible while its actual line is spoken`);
            for (const [key, value] of Object.entries(expected)) {
                assert.deepEqual(key === 'routeOpen' ? state.routeOpen : state.state[key], value, `${activeName}: ${key}`);
            }
            for (const box of state.content) {
                assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1,
                    `${activeName}: ${box.kind} fits viewport ${JSON.stringify(box)}`);
                assert.ok(separated(box, state.card), `${activeName}: ${box.kind} clears dialogue ${JSON.stringify({ box, card: state.card })}`);
            }
            assert.ok(state.content.length >= 2, `${activeName}: measured both artwork and caption`);
            if (state.state.variant === 'guardian') assert.ok(state.guardian && state.pieceIds.length === 0, 'the guardian diagram is distinct from the geographic map');
            if (state.state.variant === 'fragment') assert.deepEqual(state.pieceIds, [state.state.fragment], 'only the earned piece is displayed');
            if (state.state.variant === 'search') {
                assert.deepEqual(state.pieceIds, ['corner'], 'the plan only shows artwork on the earned corner');
                assert.deepEqual(state.missingIds, ['land', 'sea'], 'both missing pieces have empty torn outlines');
                assert.equal(state.state.route, 0, 'the search plan does not reveal the repaired route');
            }
            // Give the actual effect twelve seconds of presentation time while
            // leaving the real story and dialogue promise pending.
            await page.evaluate(() => {
                const api = window.__skoldhast; api.pause();
                const { G, view, app } = api.debug;
                view.render(window.__mapSim.snapshot(G.player, 1, G.terrain, G.time), 12); app.render();
                api.resume();
            });
            if (realHold) await page.waitForTimeout(12000);
            const held = await measure();
            assert.equal(held.text, state.text); assert.equal(held.state.phase, state.state.phase);
            assert.equal(held.state.joined, state.state.joined); assert.equal(held.state.reveal, state.state.reveal);
            assert.equal(held.routeOpen, state.routeOpen, `${activeName}: reading cannot unlock the route`);
            results.push({ name: activeName, mode, ...state });
            await page.locator('.sk-dlg-next').click({ force: true });
        }
        async function restored() {
            await settle();
            const state = await page.evaluate(() => {
                const { ui, view } = window.__skoldhast.debug;
                return { controls: !ui.controls.classList.contains('off'), hud: !document.querySelector('.sk-hud').classList.contains('off'), active: !!view.mapAssembly };
            });
            assert.deepEqual(state, { controls: true, hud: true, active: false });
        }

        if (!rotationOnly) {
            await stage(chapter2.filter(flag => flag !== 'b:k2_open'), 'trench');
            for (let i = 0; i < STORY.k2.open.length; i++) await read(STORY.k2.open[i], { variant: 'search', phase: 'observe', routeOpen: false }, `plan-${i + 1}`);
            await restored();
            for (const fragment of ['land', 'sea']) {
                if (fragment === 'sea') {
                    // This suite checks the reader-paced pickup presentation.
                    // skoldhast-exploration-order drives the actual kelp pull,
                    // shell pressure, floating paper and emerged collection.
                    await stage([...chapter2, 'p6_kelp_freed', 'p6_flat', 'mark_sea'], 'trench', { trigger: 'mark_sea' });
                } else await stage([...chapter2, 'mark_land'], 'udden', { trigger: 'mark_land' });
                const lines = fragment === 'land' ? [STORY.k2.landFound, STORY.k2.halfSea]
                    : [STORY.k2.cornerFlat, STORY.k2.seaFound, STORY.k2.half];
                for (let i = 0; i < lines.length; i++) await read(lines[i], { variant: 'fragment', fragment, phase: 'observe', routeOpen: false }, `${fragment}-${i + 1}`);
                await restored();
                console.log(`${name}: ${fragment} discovery passed`);
            }
        }
        await stage([...chapter2, 'mark_land', 'mark_sea', 'b:k2_mark_land', 'b:k2_mark_sea'], 'trench');
        await read(STORY.k2.fitPieces, { variant: 'assembly', phase: 'observe', joined: 0, routeOpen: false }, 'assembly-pieces', mode === modes[0] && !rotationOnly);
        await read(STORY.k2.torn, { variant: 'assembly', phase: 'joined', joined: 1, routeOpen: false }, 'assembly-seam');
        await read(STORY.k2.bothHalves, { variant: 'assembly', phase: 'complete', reveal: 1, routeOpen: true }, 'assembly-route');
        const routeEvents = await page.evaluate(() => window.__mapRouteEvents);
        assert.deepEqual(routeEvents, [{ phase: 'complete', variant: 'assembly', route: 1 }], `${name}: actual current opens after its drawn route`);
        await restored();
        if (rotationOnly) {
            await page.evaluate(() => window.__skoldhast.close());
            await page.close(); activePage = null;
            console.log(`${name}: held actual assembly survives rotation, restores its layout and opens the current in order`);
            continue;
        }

        await stage(guardianFlags, 'pierEnd', { spawn: { scene: 'viken', at: { x: 22 * 200, y: -.62 * 200, mode: 'ground' } } });
        await page.waitForFunction(() => window.__skoldhast.debug.G.context?.id === 'talk2');
        await page.keyboard.press('e');
        for (let i = 0; i < STORY.k3.talk2.length; i++) await read(STORY.k3.talk2[i], { variant: 'guardian', phase: i < 2 ? 'observe' : 'complete' }, `guardian-first-${i + 1}`);
        await restored();
        await page.waitForFunction(() => window.__skoldhast.debug.G.context?.id === 'talk3');
        await page.keyboard.press('e');
        for (let i = 0; i < STORY.k3.talk3.length; i++) await read(STORY.k3.talk3[i], { variant: 'guardian', phase: 'complete', reveal: 1 }, `guardian-proposal-${i + 1}`);
        await restored();

        await stage([...guardianFlags, 'talk2', 'talk_done', 'b:k3_line', 'p8_land', 'p8_s1', 'p8_s2', 'p8_s3', 'p8_sea', 'p8_done'], 'lineWindow');
        // Preserve and play the real small-wave proof; the drawing is already
        // committed, so this check need not duplicate tracing the same coast.
        await page.waitForFunction(text => {
            const { ui } = window.__skoldhast.debug;
            if (document.querySelector('.sk-dlg-text')?.textContent === text && ui.dialogueOpen()) return true;
            if (ui.dialogueOpen()) ui.advance();
            return false;
        }, STORY.k3.mapBack[1], { timeout: 60000 });
        await read(STORY.k3.mapBack, { variant: 'inspect', phase: 'complete', joined: 1, reveal: 1 }, 'return-evidence');
        await read(STORY.k3.sorry[0], { variant: 'inspect', phase: 'complete', joined: 1, reveal: 1 }, 'return-apology');
        await page.waitForFunction(text => document.querySelector('.sk-dialogue.on .sk-dlg-text')?.textContent === text, STORY.k3.sorry[1][1]);
        assert.deepEqual(await page.evaluate(() => {
            const { ui, view } = window.__skoldhast.debug;
            return { controls: !ui.controls.classList.contains('off'), active: !!view.mapAssembly };
        }), { controls: true, active: false });
        await page.evaluate(() => window.__skoldhast.close());
        await page.close(); activePage = null;
        console.log(`${name}: all actual map story variants, held reading, current unlock and controls passed`);
    }
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ results, errors }, null, 2));
    await fs.rm(path.join(out, 'failure.json'), { force: true });
    for (const file of await fs.readdir(out)) if (file.startsWith('FAIL-') && file.endsWith('.webp')) await fs.rm(path.join(out, file));
} catch (error) {
    if (activePage && !activePage.isClosed()) await sharp(await activePage.screenshot()).webp({ quality: 92 }).toFile(path.join(out, `FAIL-${activeName}.webp`));
    await fs.writeFile(path.join(out, 'failure.json'), JSON.stringify({ activeName, message: error.message, stack: error.stack, errors }, null, 2));
    throw error;
} finally { await browser.close(); server.close(); }
