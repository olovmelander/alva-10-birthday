#!/usr/bin/env node
/* Integrated companion checks and an authored-arrival visual audit.
 * node tests/browser/skoldhast-companion.mjs [--viewport 844x390] [--out path]
 * Puzzle/story completion stays with the journey robot; these staged locations
 * isolate calls, clue disclosure, simulation suspension and presentation.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const arg = name => { const i = process.argv.indexOf('--' + name); return i < 0 ? null : process.argv[i + 1]; };
const out = path.resolve(arg('out') || 'docs/skoldhast/shots/klo-companion');
const extrasOnly = process.argv.includes('--extras-only');
const sizes = extrasOnly ? [] : arg('viewport') ? arg('viewport').split(',') : ['844x390', '390x844', '1440x900'];
const capturesOnly = extrasOnly || process.argv.includes('--captures-only');
fs.mkdirSync(out, { recursive: true });
const beatFlags = [...fs.readFileSync('skoldhast/src/story.mjs', 'utf8').matchAll(/beat\('([^']+)'/g)].map(m => 'b:' + m[1]);
const places = [
    { name: 'beach', scene: 'land', x: 108, y: -.35, kind: 'sand' },
    { name: 'pool', scene: 'land', x: 102.2, y: -.09, kind: 'pool' },
    { name: 'wood', scene: 'land', x: 87, y: -.887, kind: 'wood' },
    { name: 'grass', scene: 'land', x: 54, y: -.785, kind: 'grass' },
    { name: 'cliff', scene: 'land', x: 4, y: -4.03, kind: 'cliff' },
    { name: 'kelp', scene: 'kelp', x: 15, y: 5.65, swim: true, kind: 'kelp' },
    { name: 'vault', scene: 'kelp', x: 28.8, y: 11.25, swim: true, kind: 'vault' },
    { name: 'current', scene: 'kelp', x: 35, y: 8.2, swim: true, kind: 'current' },
    { name: 'pier', scene: 'viken', x: 9, y: -.62, kind: 'pier' },
    { name: 'gallery', scene: 'viken', x: 29, y: -7.3, kind: 'gallery' }
];
const server = await serve(), browser = await launch();
const errors = [], records = [];
const auditPath = path.join(out, 'audit.json');
let previousRecords = [];
try {
    const auditTime = fs.statSync(auditPath).mtimeMs;
    previousRecords = (JSON.parse(fs.readFileSync(auditPath, 'utf8')).records || []).filter(r => !sizes.includes(r.size)).map(r => {
        const shot = path.join(out, `${r.place}-${r.size}-ready.webp`);
        return fs.existsSync(shot) && fs.statSync(shot).mtimeMs > auditTime
            ? { ...r, layout: undefined, geometryNote: 'Screenshot refreshed in a later run; earlier geometry omitted.' }
            : r;
    });
} catch { /* First visual audit. */ }
let page;
const waitReady = () => page.waitForFunction(() => window.__skoldhast.debug.companion.phase === 'talking', null, { timeout: 12000 });
const phase = () => page.evaluate(() => window.__skoldhast.debug.companion.phase);

async function stage(place, { freshHints = true } = {}) {
    await page.evaluate(({ place, freshHints, beatFlags }) => {
        const { G, view, companion, app, guide } = window.__skoldhast.debug;
        companion.cancel();
        if (freshHints) companion.restore([]);
        G.flags.clear();
        for (const flag of [...beatFlags, 'intro_done', 'klo_hidden', 'klo_ja', 'rule_demo', 'ch2_open',
            'ch3_open', 'p1_inked', 'p3_done', 'p4_plank', 'marks_both', 'gate_open', 'viken_arrived', 'tip_callKlo']) G.flags.add(flag);
        if (place.name !== 'pool') G.flags.add('p2_open');
        else for (const flag of ['ch2_open', 'ch3_open', 'marks_both', 'gate_open', 'viken_arrived']) G.flags.delete(flag);
        G.busy = 0; G.hideHero = false; G.hideActors = false; G.vista = false; G.freeze = false;
        G.goto(place.scene, { x: place.x * 200, y: place.y * 200, mode: place.swim ? 'swim' : 'ground', facing: 1 }, { silent: true });
        Object.assign(G.player, { x: place.x * 200, y: place.y * 200, px: place.x * 200, py: place.y * 200,
            hidden: false, hide: 0, vx: 0, vy: 0, inLane: null, resting: false, facing: 1 });
        Object.assign(G.actors.klo, { x: -100000, scene: place.scene, visible: false, inHole: false, pop: 0, walk: null });
        G.camHint = { x: G.player.x, y: G.player.y - 130, zoom: 1 };
        view.setScene(place.scene); view.cam.snap = true; guide.clear();
        for (let i = 0; i < 12; i++) view.render(window.__companionSim.snapshot(G.player, 1, G.terrain, G.time), 1 / 60);
        app.render();
    }, { place, freshHints, beatFlags });
    await page.waitForFunction(() => {
        const d = window.__skoldhast.debug, b = document.querySelector('.sk-klo-call');
        return !d.G.busy && !d.story.running() && b && !b.hidden && !b.disabled;
    });
}

async function capture(name) {
    await sharp(await page.screenshot({ type: 'png' })).webp({ quality: 84 }).toFile(path.join(out, name + '.webp'));
}

try {
    page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
    await page.waitForSelector('.sk-title');
    await page.getByText('Jag har en kod').click();
    await page.fill('.sk-code-input', 'kelp mås skal');
    await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
    await page.waitForFunction(() => {
        const d = window.__skoldhast.debug;
        if (d.ui.dialogueOpen()) d.ui.advance();
        return d.G?.sceneId === 'kelp' && !d.G.busy && !d.story.running() && d.G.sceneTime > .5;
    }, null, { timeout: 60000 });
    await page.evaluate(async () => {
        const d = window.__skoldhast.debug;
        await Promise.all(d.assets.bundles().map(b => d.assets.load(b)));
        await document.fonts.ready;
        window.__companionSim = await import('/skoldhast/src/sim.mjs');
    });

    if (!capturesOnly) {
    // The first two requests are clues only. The third authorizes world help.
    await stage(places.find(p => p.name === 'pool'));
    const defaults = await page.evaluate(() => {
        const d = window.__skoldhast.debug;
        const marker = d.view.layers.hints.children.find(c => c.label === 'world-action-cue');
        return { context: document.querySelector('.sk-context-guide').hidden, marker: marker?.visible,
            mode: d.G.helpLevel, depth: d.companion.journal().level, flags: [...d.G.flags].sort() };
    });
    assert.equal(defaults.mode, 'ask'); assert.equal(defaults.context, true); assert.equal(defaults.marker, false);
    assert.equal(defaults.depth, 0);
    await page.keyboard.press('k');
    await page.waitForFunction(() => window.__skoldhast.debug.companion.suspended());
    assert.equal(await page.locator('.sk-klo-choices').isVisible(), false);
    // A second press brings up the choices immediately; holding K cannot toggle them.
    await page.keyboard.press('k'); await waitReady();
    await page.keyboard.down('k'); await page.keyboard.down('k'); await page.keyboard.up('k');
    await page.waitForFunction(() => window.__skoldhast.debug.companion.phase === 'watching');
    assert.equal(await phase(), 'watching');
    await page.keyboard.press('k'); await waitReady();
    const beforeQuestion = await page.evaluate(() => ({ level: window.__skoldhast.debug.companion.journal().level,
        flags: [...window.__skoldhast.debug.G.flags].sort() }));
    assert.equal(beforeQuestion.level, 0); assert.deepEqual(beforeQuestion.flags, defaults.flags, 'calling commits no discoveries');
    const answers = [];
    for (let level = 1; level <= 3; level++) {
        await page.locator('[data-choice="hint"]').click();
        const result = await page.evaluate(() => {
            const d = window.__skoldhast.debug;
            return { level: d.companion.journal().level, marker: d.companion.markerActive(),
                text: document.querySelector('.sk-klo-response').textContent, journal: d.companion.journal().text };
        });
        assert.equal(result.level, level); assert.equal(result.marker, level === 3);
        assert.equal(result.text, result.journal); answers.push(result.text);
    }
    assert.equal(new Set(answers).size, 3, 'three independently authored disclosure levels');
    await page.locator('[data-choice="close"]').click();
    await page.waitForFunction(() => !document.querySelector('.sk-context-guide').hidden);
    assert.equal(await page.evaluate(() => window.__skoldhast.debug.companion.suspended()), false);
    await page.waitForFunction(() => window.__skoldhast.debug.view.layers.hints.children.find(c => c.label === 'world-action-cue').visible);
    await capture('pool-precise-help-844x390');
    await page.locator('.sk-help-dismiss').click();
    await page.waitForFunction(() => document.querySelector('.sk-context-guide').hidden);

    await page.locator('.sk-journal-btn').click();
    await page.locator('.sk-j-tab').nth(1).click();
    await page.waitForFunction(() => document.querySelector('.sk-j-known .sk-j-margin')?.textContent === window.__skoldhast.debug.companion.journal().text);
    assert.equal(await page.locator('.sk-j-known .sk-j-help').textContent(), 'Visa ledtråden igen');
    await page.keyboard.press('Escape');

    // A hidden swimmer keeps exactly the same position, velocity and puzzle time.
    await stage(places.find(p => p.name === 'current'));
    await page.evaluate(() => {
        const { G } = window.__skoldhast.debug;
        Object.assign(G.player, { hidden: true, hide: 1, vx: 130, vy: 25, mode: 'swim', submerge: 1 });
    });
    await page.keyboard.press('k'); await waitReady();
    const frozen = await page.evaluate(() => {
        const { G } = window.__skoldhast.debug;
        return { time: G.time, sceneTime: G.sceneTime, x: G.player.x, y: G.player.y, vx: G.player.vx, vy: G.player.vy,
            hidden: G.player.hidden, puz: JSON.stringify(G.puz) };
    });
    await page.waitForTimeout(250);
    assert.deepEqual(await page.evaluate(() => {
        const { G } = window.__skoldhast.debug;
        return { time: G.time, sceneTime: G.sceneTime, x: G.player.x, y: G.player.y, vx: G.player.vx, vy: G.player.vy,
            hidden: G.player.hidden, puz: JSON.stringify(G.puz) };
    }), frozen, 'conversation suspends simulation without changing momentum');
    await page.keyboard.press('Escape');
    await page.waitForFunction(time => window.__skoldhast.debug.G.time > time + .08, frozen.time);
    assert.equal(await page.evaluate(() => window.__skoldhast.debug.G.player.hidden), true);

    // Scene and scripted ownership cancel a visit and release the suspension.
    await page.keyboard.press('k'); await waitReady();
    await page.evaluate(() => window.__skoldhast.debug.G.goto('land', { x: 108 * 200, y: -.35 * 200 }, { silent: true }));
    await page.waitForFunction(() => !window.__skoldhast.debug.companion.suspended());
    assert.equal(await page.locator('.sk-klo-layer').isVisible(), false);
    await stage(places[0]); await page.keyboard.press('k'); await waitReady();
    await page.evaluate(() => { window.__skoldhast.debug.G.busy++; });
    await page.waitForFunction(() => !window.__skoldhast.debug.companion.suspended());
    await page.evaluate(() => { window.__skoldhast.debug.G.busy = 0; });

    // Touch/mouse taps on the actor share the global call, including under the
    // movement surface and with optional follow-finger steering enabled.
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', {
        type, touchPoints: points.map(([x, y], id) => ({ x, y, id }))
    });
    async function actorInStickBand() {
        await stage(places[0]);
        const zone = await page.locator('.sk-stick-zone').boundingBox();
        await page.evaluate(({ x, y }) => {
            const { G, view } = window.__skoldhast.debug, world = view.world;
            Object.assign(G.actors.klo, { x: (x - world.x) / world.scale.x, y: (y - world.y) / world.scale.y + 35,
                scene: G.sceneId, visible: true, inHole: false, pop: 0, pose: 'notebook' });
        }, { x: zone.x + zone.width * .43, y: zone.y + zone.height * .5 });
        await page.waitForFunction(() => {
            const d = window.__skoldhast.debug, b = d.view.kloBounds();
            if (!b) return false;
            const x = (b.minX + b.maxX) / 2, y = (b.minY + b.maxY) / 2;
            return d.kloHit(x, y) && document.elementFromPoint(x, y)?.classList.contains('sk-stick-zone');
        });
        return page.evaluate(() => { const b = window.__skoldhast.debug.view.kloBounds(); return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }; });
    }
    for (const kind of ['touch', 'mouse', 'followFinger']) {
        if (kind === 'followFinger') {
            await page.evaluate(() => window.__skoldhast.debug.ui.settings());
            await page.getByText('Följ fingret', { exact: true }).click();
            assert.equal(await page.getByLabel('Följ fingret', { exact: true }).isChecked(), true);
            await page.evaluate(() => window.__skoldhast.debug.ui.closePanel());
        }
        const spot = await actorInStickBand();
        if (kind === 'mouse') await page.mouse.click(spot.x, spot.y);
        else { await touch('touchStart', [[spot.x, spot.y]]); await touch('touchEnd', []); }
        await waitReady();
        assert.equal(await page.evaluate(() => window.__skoldhast.debug.input.state().x), 0, kind + ' does not leave steering held');
        await page.keyboard.press('Escape');
        console.log(JSON.stringify({ input: kind, result: 'passed' }));
    }
    await page.evaluate(() => window.__skoldhast.debug.ui.settings());
    await page.getByText('Följ fingret', { exact: true }).click();
    assert.equal(await page.getByLabel('Följ fingret', { exact: true }).isChecked(), false);
    await page.evaluate(() => window.__skoldhast.debug.ui.closePanel());

    // The opening hole remains an actual hiding lesson even when called offscreen.
    await stage(places[0]);
    await page.evaluate(() => {
        const { G } = window.__skoldhast.debug;
        G.flags.delete('rule_demo'); G.flags.delete('klo_ja');
        Object.assign(G.actors.klo, { x: 106.3 * 200, y: -.4 * 200, inHole: true, visible: true });
    });
    const hole = await page.evaluate(() => { const k = window.__skoldhast.debug.G.actors.klo; return { x: k.x, y: k.y }; });
    await page.keyboard.press('k'); await waitReady();
    assert.equal(await page.evaluate(() => window.__skoldhast.debug.companion.visit.kind), 'hole');
    assert.deepEqual(await page.evaluate(() => { const k = window.__skoldhast.debug.G.actors.klo; return { x: k.x, y: k.y }; }), hole);
    assert.equal(await page.evaluate(() => window.__skoldhast.debug.G.flags.has('klo_ja')), false);
    assert.equal(await page.evaluate(() => window.__skoldhast.debug.G.actors.klo.inHole), true);
    await capture('hole-844x390-ready');
    await page.keyboard.press('Escape');
    }

    for (const size of sizes) {
        const [width, height] = size.split('x').map(Number);
        await page.setViewportSize({ width, height });
        for (const place of places) {
            await stage(place);
            await page.locator('.sk-klo-call').click();
            // Pin the authored presentation to the same midpoint on slow and fast
            // devices; the game loop keeps rendering and the world stays suspended.
            await page.waitForFunction(() => {
                const d = window.__skoldhast.debug;
                if (d.companion.phase !== 'arriving' || (d.G.actors.klo.companion?.progress || 0) < .5) return false;
                window.__companionTick = d.companion.tick; d.companion.tick = () => {};
                d.G.actors.klo.companion.progress = .55;
                d.G.actors.klo.companion.time = d.companion.visit.duration * .55;
                return true;
            }, null, { timeout: 12000 });
            const arrival = await page.evaluate(() => {
                const d = window.__skoldhast.debug;
                return { kind: d.companion.visit.kind, entrance: d.companion.visit.entrance, bounds: d.view.kloBounds(),
                    player: { x: d.G.player.x, y: d.G.player.y }, progress: d.G.actors.klo.companion.progress };
            });
            await capture(`${place.name}-${size}-arrival`);
            await page.evaluate(() => { window.__skoldhast.debug.companion.tick = window.__companionTick; });
            await waitReady();
            const layout = await page.evaluate(() => {
                const d = window.__skoldhast.debug, rect = n => n.getBoundingClientRect().toJSON();
                const sheet = document.querySelector('.sk-klo-sheet');
                return { sheet: rect(sheet), answer: document.querySelector('.sk-klo-answer').clientHeight,
                    buttons: [...sheet.querySelectorAll('button')].map(rect), actor: d.view.kloBounds(),
                    greeting: document.querySelector('.sk-klo-response').textContent };
            });
            assert.ok(layout.sheet.x >= 0 && layout.sheet.right <= width + 1 && layout.sheet.bottom <= height, `${size} ${place.name}: sheet fits`);
            assert.ok(layout.buttons.every(b => b.y >= layout.sheet.y && b.bottom <= layout.sheet.bottom + 2), `${size} ${place.name}: buttons fit`);
            assert.ok(layout.answer >= 32, `${size} ${place.name}: readable response area`);
            assert.ok(layout.actor && layout.actor.minX >= 0 && layout.actor.maxX <= width && layout.actor.minY >= 0 && layout.actor.maxY <= height,
                `${size} ${place.name}: Klo stays in view`);
            assert.equal(layout.actor.minX < layout.sheet.right && layout.actor.maxX > layout.sheet.x &&
                layout.actor.minY < layout.sheet.bottom && layout.actor.maxY > layout.sheet.y, false,
                `${size} ${place.name}: notebook leaves Klo visible`);
            await capture(`${place.name}-${size}-ready`);
            records.push({ size, place: place.name, expected: place.kind, ...arrival, layout });
            console.log(JSON.stringify({ size, place: place.name, kind: arrival.kind, progress: arrival.progress }));
            await page.keyboard.press('Escape');
        }
    }

    // A long answer remains scrollable with large text and reduced motion.
    await page.setViewportSize({ width: 390, height: 844 });
    await stage(places.find(p => p.name === 'kelp'));
    await page.evaluate(() => window.__skoldhast.debug.ui.settings());
    const labels = await page.evaluate(async () => { const { UI } = await import('/skoldhast/src/content/sv.mjs'); return { big: UI.bigText, reduced: UI.lessMotion }; });
    await page.getByText(labels.big, { exact: true }).click();
    await page.getByText(labels.reduced, { exact: true }).click();
    await page.evaluate(() => window.__skoldhast.debug.ui.closePanel());
    await page.locator('.sk-klo-call').click(); await waitReady();
    await page.evaluate(() => window.__skoldhast.debug.kloUI.update({ topic: 'recap', text: 'Vi undersöker havet tillsammans. '.repeat(28) }));
    assert.equal(await page.evaluate(() => { const a = document.querySelector('.sk-klo-answer'); return a.scrollHeight > a.clientHeight && a.clientHeight > 40; }), true);
    const accessible = await page.evaluate(() => {
        const d = window.__skoldhast.debug, a = d.view.kloBounds(), s = document.querySelector('.sk-klo-sheet').getBoundingClientRect();
        return { reduced: d.G.lessMotion, big: d.ui.root.classList.contains('big-text'),
            overlap: a.minX < s.right && a.maxX > s.x && a.minY < s.bottom && a.maxY > s.y };
    });
    assert.equal(accessible.reduced, true); assert.equal(accessible.big, true); assert.equal(accessible.overlap, false);
    await capture('kelp-390x844-large-text');
    await page.keyboard.press('Escape');

    // With no reachable perch during a jump, a page-margin visit still keeps
    // Klo visible and cannot land or teleport the player behind the dialogue.
    await page.evaluate(() => window.__skoldhast.debug.ui.settings());
    await page.getByText(labels.big, { exact: true }).click();
    await page.getByText(labels.reduced, { exact: true }).click();
    await page.evaluate(() => window.__skoldhast.debug.ui.closePanel());
    await stage(places[0]);
    await page.evaluate(() => {
        const { G } = window.__skoldhast.debug;
        Object.assign(G.player, { y: -700, py: -700, vy: -80, mode: 'air', jump: null, leap: null });
    });
    await page.keyboard.press('k'); await waitReady();
    const margin = await page.evaluate(() => {
        const d = window.__skoldhast.debug, a = d.view.kloBounds(), s = document.querySelector('.sk-klo-sheet').getBoundingClientRect();
        return { kind: d.companion.visit.kind, mode: d.G.player.mode,
            inView: a.minX >= 0 && a.maxX <= 390 && a.minY >= 0 && a.maxY <= 844,
            overlap: a.minX < s.right && a.maxX > s.x && a.minY < s.bottom && a.maxY > s.y };
    });
    assert.equal(margin.kind, 'margin'); assert.equal(margin.mode, 'air'); assert.equal(margin.inView, true); assert.equal(margin.overlap, false);
    await capture('margin-390x844-ready');
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    for (const size of sizes) {
        const [width, height] = size.split('x').map(Number), thumbW = 330, thumbH = Math.round(height / width * thumbW);
        const tiles = await Promise.all(places.map(async (place, i) => ({
            input: await sharp(path.join(out, `${place.name}-${size}-ready.webp`)).resize(thumbW, thumbH).toBuffer(),
            left: (i % 5) * thumbW, top: Math.floor(i / 5) * thumbH
        })));
        await sharp({ create: { width: thumbW * 5, height: thumbH * 2, channels: 3, background: '#f6f0df' } })
            .composite(tiles).webp({ quality: 86 }).toFile(path.join(out, `overview-${size}.webp`));
    }
    for (const name of ['failure.webp', 'partial-audit.json']) {
        const failureFile = path.join(out, name);
        if (fs.existsSync(failureFile)) fs.unlinkSync(failureFile);
    }
    fs.writeFileSync(auditPath, JSON.stringify({ checks: capturesOnly ? 'capture geometry passed' : 'behavior and capture geometry passed', errors, records: [...previousRecords, ...records] }, null, 2));
    console.log(JSON.stringify({ ok: true, checks: capturesOnly ? 'capture geometry' : 'calls, progressive clues, shared journal, suspension, cancellation, input routes, layout', screenshots: records.length * 2 + (capturesOnly ? 2 : 4), out }));
} catch (error) {
    fs.writeFileSync(path.join(out, 'partial-audit.json'), JSON.stringify({ errors, records }, null, 2));
    if (page) {
        await capture('failure').catch(() => {});
        console.error(JSON.stringify(await page.evaluate(() => {
            const d = window.__skoldhast?.debug;
            return { phase: d?.companion?.phase, scene: d?.G?.sceneId, busy: d?.G?.busy,
                running: d?.story?.running(), flags: d?.G ? [...d.G.flags] : [], cue:d?.story?.guidance(),
                hints: d?.view?.layers?.hints?.children.map(n=>({label:n.label,visible:n.visible,data:n.guidanceCue})), errors: window.__errors };
        }).catch(() => ({}))));
    }
    console.error('Browser errors:', errors); throw error;
} finally { await browser.close(); server.close(); }
