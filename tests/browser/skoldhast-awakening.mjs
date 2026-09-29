#!/usr/bin/env node
// A real pencil gesture awakens the still drawing; Klo emerges at his full scale.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { UI, STORY } from '../../skoldhast/src/content/sv.mjs';

const outAt = process.argv.indexOf('--out');
const out = outAt >= 0 ? process.argv[outAt + 1] : '/tmp/skoldhast-awakening';
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch();
const results = [];

async function start(page, lessMotion = false) {
    await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
    await page.waitForSelector('.sk-title');
    await page.evaluate(() => {
        const ui = window.__skoldhast.debug.ui, draw = ui.draw.bind(ui);
        const record = window.__awakening = { phases: [], samples: [], activeDraw: null, alive: true };
        ui.draw = opts => { record.activeDraw = opts; return draw(opts); };
        const all = node => [node, ...(node.children || []).flatMap(all)];
        window.__awakeningState = () => {
            const table = window.__skoldhast.debug.app?.stage.children.find(c => c.label === 'story-table');
            if (!table) return null;
            const nodes = all(table), find = name => nodes.find(n => n.label === name);
            const hero = find('opening-hero'), splash = find('opening-splash'), ink = find('opening-wake-stroke');
            const klo = find('opening-klo'), parts = find('opening-klo-parts');
            const question = find('opening-klo-mark-question'), exclaim = find('opening-klo-mark-exclaim');
            return {
                at: performance.now(), phase: table.storyPhase, awake: table.openingAwake,
                caption: document.querySelector('.sk-caption.on')?.textContent || '',
                line: document.querySelector('.sk-dialogue.on .sk-dlg-text')?.textContent || '',
                // Local sprite transforms exclude the intentional camera pullback.
                hero: hero ? all(hero).filter(n => ['torso', 'shell', 'head', 'neck', 'eye'].includes(n.label))
                    .map(n => [n.label, n.x, n.y, n.rotation, n.scale.x, n.scale.y, n.visible, n.texture?.uid]) : [],
                splash: splash ? { alpha: splash.alpha, sy: splash.scale.y, visible: splash.visible } : null,
                ink: ink ? ink.context.instructions.length : 0,
                klo: klo ? { stage: klo.openingKloStage, progress: klo.openingKloProgress,
                    sx: klo.scale.x, sy: klo.scale.y, x: parts?.x, y: parts?.y,
                    partSx: parts?.scale.x, partSy: parts?.scale.y,
                    mark: question?.visible ? '?' : exclaim?.visible ? '!' : '' } : null
            };
        };
        const watch = () => {
            if (!record.alive) return;
            const state = window.__awakeningState();
            if (state) {
                if (record.phases.at(-1) !== state.phase) record.phases.push(state.phase);
                if (record.samples.length < 2000) record.samples.push(state);
            }
            requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
    });
    await page.locator('.sk-title button').first().click();
    await page.waitForFunction(() => !!window.__skoldhast.debug.G);
    await page.evaluate(less => { window.__skoldhast.debug.G.lessMotion = less; }, lessMotion);
    await page.waitForFunction(prompt => {
        const d = window.__skoldhast.debug;
        if (d.ui.dialogueOpen()) d.ui.advance();
        return document.querySelector('.sk-draw.on .sk-draw-prompt')?.textContent === prompt;
    }, UI.drawWake);
}

async function drawWake(page, input) {
    const geometry = await page.evaluate(() => {
        const opts = window.__awakening.activeDraw;
        return opts.getGeometry?.() || opts;
    });
    const { width, height } = page.viewportSize();
    assert.ok(geometry.anchors?.length >= 2, 'awakening provides a guided shell contour');
    assert.ok(geometry.anchors.every(([x, y]) => x >= 0 && x <= width && y >= 0 && y <= height), 'every awakening anchor is reachable');
    if (input === 'keyboard') await page.keyboard.press('Enter');
    else {
        const cdp = await page.context().newCDPSession(page);
        try {
            const [first, ...rest] = geometry.anchors;
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: first[0], y: first[1], id: 1 }] });
            for (const [x, y] of rest) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } finally { await cdp.detach(); }
    }
}

async function assertDormant(page) {
    await page.waitForFunction(() => {
        const samples = window.__awakening.samples.filter(s => s.phase === 'drawing-wake');
        return samples.length >= 8 && samples.at(-1).at - samples[0].at >= 400;
    });
    const samples = await page.evaluate(() => window.__awakening.samples.filter(s => s.phase === 'drawing-wake'));
    assert.ok(samples.every(s => s.hero.length >= 5), 'the existing hero rig is visible before the stroke');
    assert.ok(samples.every(s => !s.awake), 'the uncompleted drawing never awakens by itself');
    assert.ok(samples.every(s => JSON.stringify(s.hero) === JSON.stringify(samples[0].hero)), 'head, body and eyes stay exactly still before the player draws');
    assert.ok(samples.every(s => !s.splash || !s.splash.visible || s.splash.alpha === 0), 'the splash waits for the first pencil gesture');
    assert.ok(samples.every(s => !s.klo || s.klo.stage === 'hidden'), 'Klo does not appear before the awakening');
    const overlappingToasts = await page.evaluate(() => {
        const toolbar = document.querySelector('.sk-draw.on .sk-draw-toolbar').getBoundingClientRect();
        return [...document.querySelectorAll('.sk-toast')].filter(node => {
            const style = getComputedStyle(node), r = node.getBoundingClientRect();
            return Number(style.opacity) > .01 && style.visibility !== 'hidden'
                && r.right > toolbar.left && r.left < toolbar.right && r.bottom > toolbar.top && r.top < toolbar.bottom;
        }).map(node => node.textContent);
    });
    assert.deepEqual(overlappingToasts, [], 'temporary notes never cover the first drawing prompt or progress');
    return samples.at(-1);
}

async function readableDialogue(page, expected) {
    await page.waitForFunction(text => {
        const box = document.querySelector('.sk-dialogue.on');
        return box && Number(getComputedStyle(box).opacity) > .99
            && box.querySelector('.sk-dlg-text')?.textContent === text;
    }, expected);
}

try {
    for (const { width, height, input, less } of [
        { width: 844, height: 390, input: 'touch', less: false },
        { width: 390, height: 844, input: 'touch', less: false },
        { width: 844, height: 390, input: 'keyboard', less: false },
        { width: 390, height: 844, input: 'keyboard', less: false },
        { width: 390, height: 844, input: 'touch', less: true }
    ]) {
        const context = await browser.newContext({ viewport: { width, height }, hasTouch: input === 'touch', deviceScaleFactor: 1 });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        const stem = `${width}x${height}-${input}${less ? '-less' : ''}`;
        try {
            await start(page, less);
            const dormant = await assertDormant(page);
            await page.screenshot({ path: path.join(out, `${stem}-before-pencil.png`) });
            await drawWake(page, input);
            await page.waitForFunction(() => window.__awakening.phases.includes('alive'));
            const alive = await page.evaluate(() => window.__awakeningState());
            assert.equal(alive.awake, true);
            assert.ok(alive.ink > 0, 'the real shell stroke survives after the input overlay closes');
            assert.notDeepEqual(alive.hero, dormant.hero, 'the player stroke awakens the head and body');
            assert.ok(alive.splash?.visible && alive.splash.alpha > .9, 'the pencil also brings the first splash to life');
            await readableDialogue(page, STORY.prolog.awake[1]);
            await page.screenshot({ path: path.join(out, `${stem}-awake.png`) });
            await page.waitForFunction(() => {
                const d = window.__skoldhast.debug;
                if (d.ui.dialogueOpen()) d.ui.advance();
                return window.__awakeningState()?.phase === 'klo-wonder';
            });
            // He stops, mesmerised, and whispers his first (wrong) guess.
            await readableDialogue(page, STORY.prolog.kloWonder[1]);
            await page.screenshot({ path: path.join(out, `${stem}-klo-wonder.png`) });
            await page.waitForFunction(() => {
                const d = window.__skoldhast.debug;
                if (d.ui.dialogueOpen()) d.ui.advance();
                return window.__awakeningState()?.phase === 'klo-ready';
            });
            await readableDialogue(page, STORY.prolog.kloResearch[1]);
            await page.screenshot({ path: path.join(out, `${stem}-klo-ready.png`) });
            await page.waitForFunction(() => {
                const d = window.__skoldhast.debug;
                if (d.ui.dialogueOpen()) d.ui.advance();
                return window.__awakeningState()?.phase === 'drawing-gull';
            });
            const recorded = await page.evaluate(() => ({ phases: window.__awakening.phases, samples: window.__awakening.samples }));
            const expected = ['drawing-wake', 'waking', 'alive', 'klo-entrance', 'klo-wonder', 'klo-take', 'klo-ready', 'drawing-gull'];
            for (const [i, phase] of expected.entries()) {
                assert.ok(recorded.phases.includes(phase), `observed ${phase}`);
                if (i) assert.ok(recorded.phases.indexOf(phase) > recorded.phases.indexOf(expected[i - 1]), `${phase} follows its cause`);
            }
            const emerging = recorded.samples.filter(s => (s.phase === 'klo-entrance' || s.phase === 'klo-take') && s.klo).map(s => s.klo);
            // Her question sets the scene before the researcher's eyes come up.
            assert.ok(recorded.samples.some(s => s.phase === 'klo-entrance' && (!s.klo || ['hidden', 'drop'].includes(s.klo.stage))
                && s.caption === STORY.prolog.captionFallback), 'the caption asks "Häst eller sköldpadda?" before Klo appears');
            const lines = [];
            let reading = false;
            for (const s of recorded.samples) {
                if (s.phase === 'alive') reading = true;
                if (s.phase === 'drawing-gull') break;
                if (reading && s.line && lines.at(-1) !== s.line) lines.push(s.line);
            }
            assert.deepEqual(lines, [STORY.prolog.awake[1], STORY.prolog.kloWonder[1], STORY.prolog.kloResearch[1]], 'three boxes before the first drawing');
            const wonder = recorded.samples.filter(s => s.phase === 'klo-wonder' && s.klo).map(s => s.klo);
            assert.ok(wonder.length && wonder.every(k => k.stage === 'awe' && k.mark === '?'), 'he holds his wide-eyed stare with a question while he whispers');
            assert.ok(recorded.samples.some(s => s.phase === 'klo-take' && s.klo?.mark === '!'), 'the double take ends in an exclamation');
            const final = recorded.samples.findLast(s => s.klo?.stage === 'ready')?.klo;
            assert.ok(emerging.length >= 2 && final, 'Klo physically emerges across real rendered frames');
            assert.ok(emerging.every(k => Math.abs(k.sx - final.sx) < 1e-8 && Math.abs(k.sy - final.sy) < 1e-8), 'Klo never stretches from a flattened sprite');
            assert.ok(emerging.every(k => k.partSx === 1 && k.partSy === 1), 'the crab parts retain full size');
            assert.ok(Math.max(...emerging.map(k => k.y)) - final.y > 15, 'the full-size crab rises out of the soil');
            if (less) assert.ok(emerging.every(k => k.y >= -1e-8), 'reduced motion omits the airborne pop');
            else assert.ok(emerging.some(k => k.y < -2), 'the normal emergence includes a little physical hop');
            assert.deepEqual(errors, []);
            results.push({ viewport: `${width}x${height}`, input, lessMotion: less, phases: recorded.phases,
                entranceFrames: emerging.length, stages: [...new Set(emerging.map(k => k.stage))], errors });
            console.log(`pencil awakening and full-size Klo entrance pass at ${stem}`);
        } finally { await context.close(); }
    }

    // Closing during the waking tween must not leave a story script that can
    // awaken or introduce Klo into a newly opened title screen.
    const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    try {
        await start(page); await drawWake(page, 'keyboard');
        await page.waitForFunction(() => window.__awakeningState()?.phase === 'waking');
        await page.evaluate(async () => {
            const api = window.__skoldhast;
            window.__awakening.alive = false;
            window.__abandonedAwakening = api.debug.app.stage.children.find(c => c.label === 'story-table');
            await api.close();
        });
        assert.equal(await page.evaluate(() => window.__abandonedAwakening.destroyed), true, 'closing destroys the awakening scene');
        assert.equal(await page.locator('.sk-draw.on, .sk-choice.on, .sk-dialogue.on').count(), 0);
        await page.evaluate(() => window.__skoldhast.open());
        await page.waitForSelector('.sk-title');
        await page.evaluate(() => {
            window.__reopenedAt = performance.now(); window.__reopenedFrames = 0;
            const count = () => { if (++window.__reopenedFrames < 180) requestAnimationFrame(count); };
            requestAnimationFrame(count);
        });
        await page.waitForFunction(() => window.__reopenedFrames >= 120 && performance.now() - window.__reopenedAt > 1800);
        assert.equal(await page.locator('.sk-title').count(), 1);
        assert.equal(await page.locator('.sk-draw.on, .sk-choice.on, .sk-dialogue.on').count(), 0, 'an old waking tween never continues into the new session');
        assert.equal(await page.evaluate(() => window.__skoldhast.debug.G?.flags.has('intro_done') || false), false);
        assert.deepEqual(errors, []);
        results.push({ lifecycle: 'close during awakening and reopen', errors });
        console.log('awakening cancellation and reopen pass');
    } finally { await context.close(); }
    await fs.writeFile(path.join(out, 'awakening-results.json'), JSON.stringify(results, null, 2));
} finally { await browser.close(); server.close(); }
