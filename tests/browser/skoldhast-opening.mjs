#!/usr/bin/env node
// Real opening gestures, visible cause/consequence, choices, rotation and cancellation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { STORY, UI } from '../../skoldhast/src/content/sv.mjs';

const outAt = process.argv.indexOf('--out');
const out = outAt >= 0 ? process.argv[outAt + 1] : '/tmp/skoldhast-opening';
const lessOnly = process.argv.includes('--less-motion');
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch();
const base = `http://127.0.0.1:${server.address().port}`;
const results = [];

async function open(page, lessMotion = false) {
    await page.goto(`${base}/skoldhast/dev/play.html`);
    await page.waitForSelector('.sk-title');
    await page.evaluate(shorePrompt => {
        const ui = window.__skoldhast.debug.ui, draw = ui.draw.bind(ui);
        window.__opening = { phases: [], samples: [], framing: [], shore: null, geometry: null, collecting: true, drawCount: 0, completedDraw: 0 };
        ui.draw = opts => {
            const id = ++window.__opening.drawCount;
            window.__opening.activeDraw = opts;
            if (opts.prompt === shorePrompt) window.__opening.geometry = opts.getGeometry?.() || opts;
            return draw(opts).then(points => {
                window.__opening.completedDraw = id;
                if (opts.prompt === shorePrompt) window.__opening.shore = points;
                return points;
            });
        };
        const watch = () => {
            const r = window.__opening, app = window.__skoldhast.debug.app;
            if (!r.collecting || !app) return;
            const table = app.stage.children.find(c => c.label === 'story-table');
            if (table) {
                const phase = table.storyPhase;
                if (r.phases.at(-1) !== phase) r.phases.push(phase);
                const paper = table.children.find(c => c.label === 'story-paper');
                if (paper && (phase === 'klo-ready' || phase === 'drawing-gull')) r.framing.push({ phase, scale: paper.scale.x });
                const flap = paper?.children.find(c => /^opening-sea-/.test(c.label || ''));
                const all = node => [node, ...(node.children || []).flatMap(all)];
                const splash = paper ? all(paper).find(c => c.label === 'opening-splash') : null;
                if (phase === 'folding' && flap && splash) r.samples.push({
                    at: performance.now(), splash: splash.scale.y,
                    vertices: Array.from(flap.children[0].geometry.getBuffer('aPosition').data)
                });
            }
            requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
    }, UI.drawShore);
    await page.locator('.sk-title button').first().click();
    await page.waitForFunction(() => !!window.__skoldhast.debug.G);
    await page.evaluate(less => { window.__skoldhast.debug.G.lessMotion = less; }, lessMotion);
}

async function advanceDialogue(page) {
    const before = await page.locator('.sk-dialogue.on .sk-dlg-text').textContent();
    // The actual button honors its reading guard; poll for the resulting state.
    await page.waitForFunction(text => {
        const node = document.querySelector('.sk-dialogue.on .sk-dlg-text');
        if (!node || node.textContent !== text) return true;
        document.querySelector('.sk-dialogue.on .sk-dlg-next')?.click();
        return false;
    }, before);
}

async function reachShore(page) {
    for (let n = 0; n < 20; n++) {
        await page.waitForFunction(() => document.querySelector('.sk-dialogue.on, .sk-draw.on'));
        if (await page.locator('.sk-draw.on').count()) {
            const prompt = await page.locator('.sk-draw-prompt').textContent();
            if (prompt === UI.drawShore) return;
            if (prompt === UI.drawWake) {
                const { id, anchors } = await page.evaluate(() => {
                    const r = window.__opening, opts = r.activeDraw;
                    return { id: r.drawCount, anchors: (opts.getGeometry?.() || opts).anchors };
                });
                assert.ok(anchors?.length >= 2, 'the awakening uses its actual guided shell stroke');
                await stroke(page, anchors);
                await page.waitForFunction(id => window.__opening.completedDraw >= id, id);
                continue;
            }
            const pad = await page.locator('.sk-draw-pad').boundingBox();
            const pts = prompt === UI.drawCloud
                ? Array.from({ length: 33 }, (_, i) => {
                    const a = i / 32 * Math.PI * 2, r = 1 + .12 * Math.sin(a * 5);
                    return [.5 + Math.cos(a) * .36 * r, .5 + Math.sin(a) * .23 * r];
                }) : [[.13, .7], [.3, .28], [.5, .68], [.7, .28], [.88, .7]];
            await stroke(page, pts.map(([x, y]) => [pad.x + pad.width * x, pad.y + pad.height * y]));
            await page.waitForSelector('.sk-draw.preview');
            await page.locator('.sk-draw-done').click();
        } else await advanceDialogue(page);
    }
    throw new Error('shoreline drawing was not reached');
}

async function stroke(page, points) {
    const { width, height } = page.viewportSize();
    if (width < height) {
        const cdp = await page.context().newCDPSession(page);
        const point = ([x, y]) => [{ x, y, id: 1 }];
        try {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(points[0]) });
            for (const p of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(p) });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } finally { await cdp.detach(); }
    } else {
        await page.mouse.move(...points[0]); await page.mouse.down();
        for (const p of points.slice(1)) await page.mouse.move(...p, { steps: 5 });
        await page.mouse.up();
    }
}

async function traceShore(page) {
    const anchors = await page.evaluate(() => window.__opening.geometry.anchors.slice(0, 3));
    await stroke(page, anchors);
    await page.waitForFunction(() => window.__opening.shore?.length === 3);
}

const phase = (page, value) => page.waitForFunction(wanted => window.__skoldhast.debug.app?.stage.children.find(c => c.label === 'story-table')?.storyPhase === wanted, value);
const shot = (page, stem, name) => page.screenshot({ path: path.join(out, `${stem}-${name}.png`) });
const settleQuestion = page => page.evaluate(async () => {
    const elements = [...document.querySelectorAll('.sk-dialogue, .sk-choice')];
    await Promise.all(elements.flatMap(node => node.getAnimations()).map(a => a.finished.catch(() => {})));
});

async function sampleRetainedPaper(page) {
    const point = await page.evaluate(() => {
        const table = window.__skoldhast.debug.app.stage.children.find(c => c.label === 'story-table');
        const paper = table.children.find(c => c.label === 'story-paper');
        return { x: paper.x + 80 * paper.scale.x, y: paper.y + 585 * paper.scale.y };
    });
    const crop = await sharp(await page.screenshot()).extract({ left: Math.round(point.x) - 2, top: Math.round(point.y) - 2, width: 5, height: 5 }).removeAlpha().png().toBuffer();
    const pixel = await sharp(crop).stats();
    return pixel.channels.map(c => c.mean);
}

async function verifyFold(page, lessMotion) {
    const actual = await page.evaluate(() => {
        const app = window.__skoldhast.debug.app;
        const table = app.stage.children.find(c => c.label === 'story-table');
        const paper = table.children.find(c => c.label === 'story-paper');
        const sheet = paper.children.find(c => c.children?.some(n => n.label === 'opening-shoreline'));
        const shore = sheet.children.find(c => c.label === 'opening-shoreline');
        const flap = paper.children.find(c => c.label === 'opening-sea-folded');
        const points = window.__opening.shore.map(([x, y]) => [(x - paper.x) / paper.scale.x, (y - paper.y) / paper.scale.y]);
        return { points, vertices: Array.from(flap.children[0].geometry.getBuffer('aPosition').data),
            shorePaths: shore.context.instructions.map(i => ({ action: i.action, path: i.data.path?.instructions.map(p => ({ action: p.action, data: p.data })) })),
            phases: window.__opening.phases, samples: window.__opening.samples, framing: window.__opening.framing };
    });
    const [ax, ay, , , bx, by] = actual.vertices;
    const last = actual.points.at(-1);
    const distance = Math.abs((bx - ax) * (last[1] - ay) - (by - ay) * (last[0] - ax)) / Math.hypot(bx - ax, by - ay);
    assert.ok(distance < .001, `fold crosses the actual last traced point (${distance})`);
    const persisted = actual.shorePaths.find(p => p.action === 'stroke')?.path.map(p => p.data.slice(0, 2));
    assert.equal(persisted?.length, actual.points.length, 'all shoreline points persist after the drawing overlay closes');
    assert.ok(persisted.every((p, i) => Math.hypot(p[0] - actual.points[i][0], p[1] - actual.points[i][1]) < .001), 'the exact authored shoreline survives');
    const expectedPhases = ['drawing-wake', 'waking', 'alive', 'klo-entrance', 'klo-wonder', 'klo-take', 'klo-ready', 'drawing-gull', 'drawing-cloud', 'shoreline', 'fold-anticipation', 'folding', 'folded', 'frozen'];
    for (const [index, name] of expectedPhases.entries()) {
        assert.ok(actual.phases.includes(name), `observed ${name}`);
        if (index) assert.ok(actual.phases.indexOf(name) > actual.phases.indexOf(expectedPhases[index - 1]), `${name} follows its visible cause`);
    }
    const framingScales = new Set(actual.framing.map(s => Math.round(s.scale * 1e6)));
    assert.ok(actual.framing.some(s => s.phase === 'klo-ready') && actual.framing.some(s => s.phase === 'drawing-gull'), 'observed the close and wide drawing compositions');
    if (lessMotion) assert.equal(framingScales.size, 2, 'reduced motion cuts directly from the close drawing to the wide paper');
    else assert.ok(framingScales.size > 2, 'normal motion smoothly pulls back between the two compositions');
    assert.ok(actual.samples.length >= 4, 'physical folding was observed across frames');
    const tail = actual.samples.slice(-4);
    assert.ok(tail.every(s => s.splash === tail[0].splash), 'the splash stops while the paper is still folding');
    if (!lessMotion) {
        assert.ok(actual.samples.some(s => s.splash !== tail[0].splash), 'the wave moves before the fold freezes it');
        const still = actual.samples.filter(s => s.splash === tail[0].splash);
        assert.ok(still.length >= 3 && Math.hypot(still[0].vertices[2] - still.at(-1).vertices[2], still[0].vertices[3] - still.at(-1).vertices[3]) > 2,
            'paper visibly continues folding after the wave stops');
    } else {
        const shapes = new Set(actual.samples.map(s => s.vertices.map(v => Math.round(v)).join(',')));
        assert.ok(shapes.size <= 2, 'reduced motion changes between flat and folded geometry without rotation');
    }
    return { endpointDistance: distance, observedFrames: actual.samples.length, framingScales: framingScales.size, phases: actual.phases };
}

try {
    for (const { width, height, less, choice } of [
        { width: 844, height: 390, less: false, choice: 0 },
        { width: 390, height: 844, less: false, choice: 1 },
        { width: 390, height: 844, less: true, choice: 0 }
    ].filter(c => !lessOnly || c.less)) {
        const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        const stem = `${width}x${height}${less ? '-less' : ''}`;
        try {
            await open(page, less); await reachShore(page);
            const retainedBefore = await sampleRetainedPaper(page);
            await shot(page, stem, 'shore'); await traceShore(page);
            if (!less) {
                await page.waitForFunction(() => {
                    const tip = window.__opening.samples.at(-1)?.vertices[2];
                    return tip <= 850 && tip >= 600;
                });
                await shot(page, stem, 'midfold');
            }
            await phase(page, 'folded'); await shot(page, stem, 'folded');
            const retainedAfter = await sampleRetainedPaper(page);
            assert.ok(retainedBefore.every((v, i) => Math.abs(v - retainedAfter[i]) < 8),
                `the surviving beach stays in place: ${retainedBefore} -> ${retainedAfter}`);
            await phase(page, 'frozen');
            const geometry = await verifyFold(page, less);
            await advanceDialogue(page); await phase(page, 'question'); await settleQuestion(page); await shot(page, stem, 'question');
            const buttons = await page.locator('.sk-choice.on button').evaluateAll(nodes => nodes.map(n => {
                const b = n.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height };
            }));
            assert.ok(buttons.every(b => b.width >= 44 && b.height >= 44 && b.x >= 0 && b.y >= 0 && b.x + b.width <= width && b.y + b.height <= height), 'both choices fit and are easy to tap');
            if (width < height && !less) {
                await page.setViewportSize({ width: height, height: width });
                await page.waitForFunction(w => window.__skoldhast.debug.app.screen.width === w, height);
                assert.equal(await page.locator('.sk-choice.on button').count(), 2, 'rotation keeps the question and both choices');
                await shot(page, stem, 'rotated-question');
                await page.setViewportSize({ width, height });
                await page.waitForFunction(w => window.__skoldhast.debug.app.screen.width === w, width);
            }
            await page.locator('.sk-choice.on button').nth(choice).tap();
            const expected = choice ? STORY.prolog.choiceWhoAnswer[1] : STORY.prolog.choiceWhatAnswer[1];
            await page.waitForFunction(text => document.querySelector('.sk-dialogue.on .sk-dlg-text')?.textContent === text, expected);
            assert.notEqual(STORY.prolog.choiceWhatAnswer[1], STORY.prolog.choiceWhoAnswer[1], 'the two questions get distinct answers');
            for (let i = 0; i < 8; i++) {
                if (await page.evaluate(() => window.__skoldhast.debug.G.flags.has('intro_done'))) break;
                await page.waitForFunction(() => window.__skoldhast.debug.G.flags.has('intro_done') || document.querySelector('.sk-dialogue.on'));
                if (await page.locator('.sk-dialogue.on').count()) await advanceDialogue(page);
            }
            await page.waitForFunction(() => window.__skoldhast.debug.G.flags.has('intro_done'));
            assert.equal(await page.evaluate(() => document.querySelector('.table-mode') !== null), false, 'the table releases the playable world');
            assert.deepEqual(errors, []);
            results.push({ viewport: `${width}x${height}`, lessMotion: less, choice, ...geometry, errors });
            console.log(`opening gestures, fold, freeze and choice pass at ${stem}`);
        } finally { await context.close(); }
    }
    if (!lessOnly) {
    // Close while the fold owns meshes, a mask and scheduled callbacks, then
    // reopen the same game API. The abandoned opening must never reach its choice.
    const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    try {
        await open(page); await reachShore(page); await traceShore(page);
        await page.waitForFunction(() => window.__opening.samples.length >= 4);
        await page.evaluate(async () => {
            const api = window.__skoldhast;
            window.__opening.collecting = false;
            window.__oldOpening = api.debug.app.stage.children.find(c => c.label === 'story-table');
            await api.close();
        });
        assert.equal(await page.evaluate(() => window.__oldOpening.destroyed), true, 'closing destroys the folded paper and its children');
        assert.equal(await page.locator('.sk-draw.on, .sk-choice.on, .sk-dialogue.on').count(), 0, 'closing removes all opening input');
        await page.evaluate(() => window.__skoldhast.open());
        await page.waitForSelector('.sk-title');
        // Wait on a rendered-frame counter through the abandoned effect's
        // completion window, rather than advancing game state or its promises.
        await page.evaluate(() => {
            window.__reopenFrames = 0;
            const count = () => { if (++window.__reopenFrames < 180) requestAnimationFrame(count); };
            requestAnimationFrame(count);
        });
        await page.waitForFunction(() => window.__reopenFrames >= 180);
        assert.equal(await page.locator('.sk-title').count(), 1, 'reopening leaves one live title');
        assert.equal(await page.locator('.sk-choice.on, .sk-dialogue.on').count(), 0, 'an old fold never resumes into the new session');
        assert.deepEqual(errors, []);
        results.push({ lifecycle: 'close during fold and reopen', errors });
        console.log('opening fold cancellation and reopen pass');
    } finally { await context.close(); }
    }
    await fs.writeFile(path.join(out, 'opening-results.json'), JSON.stringify(results, null, 2));
} finally { await browser.close(); server.close(); }
