#!/usr/bin/env node
// Alva's notes open the game: her own words written by her pencil, her world
// drawing itself as she writes, thought bubbles, then her sköldhäst's picture.
// node tests/browser/skoldhast-notes.mjs --out /tmp/notes
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { HER_TEXT, JOURNAL, UI, STORY } from '../../skoldhast/src/content/sv.mjs';
import { splitSentences } from '../../skoldhast/src/opening-notes.mjs';

const outAt = process.argv.indexOf('--out');
const out = outAt >= 0 ? process.argv[outAt + 1] : '/tmp/skoldhast-notes';
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch();
const base = `http://127.0.0.1:${server.address().port}`;
const paragraph = splitSentences(HER_TEXT.full || JOURNAL.fieldFallback).join(' ');
const results = [];

async function open(page, less = false) {
    await page.goto(`${base}/skoldhast/dev/play.html`);
    await page.waitForSelector('.sk-title');
    await page.evaluate(() => {
        const rec = window.__notes = { phases: [], sentences: [], bubbles: [], body: '', masked: [], captions: [], skip: false };
        const all = (n) => [n, ...(n.children || []).flatMap(all)];
        const watch = () => {
            const app = window.__skoldhast.debug.app;
            const table = app?.stage.children.find(c => c.label === 'story-table');
            if (table) {
                if (rec.phases.at(-1) !== table.storyPhase) rec.phases.push(table.storyPhase);
                if (table.notesSentence !== undefined && rec.sentences.at(-1) !== table.notesSentence) rec.sentences.push(table.notesSentence);
                const nodes = all(table);
                for (const n of nodes) if (/^notes-bubble-/.test(n.label || '') && !rec.bubbles.includes(n.label)) rec.bubbles.push(n.label);
                const body = nodes.find(n => n.label === 'notes-body');
                if (body) rec.body = body.text;
                const hero = nodes.find(n => n.label === 'opening-hero');
                if (table.storyPhase === 'notes') rec.masked.push(!!hero?.mask);
                if (document.querySelector('.sk-notes-skip')) rec.skip = true;
            }
            const cap = document.querySelector('.sk-caption.on')?.textContent;
            if (cap && rec.captions.at(-1) !== cap) rec.captions.push(cap);
            requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
    });
    await page.locator('.sk-title button').first().click();
    await page.waitForFunction(() => !!window.__skoldhast.debug.G);
    await page.evaluate(less => { window.__skoldhast.debug.G.lessMotion = less; }, less);
}
const phase = (page) => page.evaluate(() => window.__skoldhast.debug.app?.stage.children.find(c => c.label === 'story-table')?.storyPhase);
const waitDraw = (page, timeout = 90000) => page.waitForFunction(p => document.querySelector('.sk-draw.on .sk-draw-prompt')?.textContent === p, UI.drawWake, { timeout, polling: 100 });

try {
    for (const { width, height, less, tap } of [
        { width: 844, height: 390, less: false, tap: false },
        { width: 390, height: 844, less: false, tap: true },
        { width: 390, height: 844, less: true, tap: false }
    ]) {
        const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < height });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        const stem = `${width}x${height}${less ? '-less' : ''}${tap ? '-tap' : ''}`;
        try {
            await open(page, less);
            await page.waitForFunction(() => window.__notes.phases.includes('notes'), null, { timeout: 30000 });
            const t0 = Date.now();
            let shots = 0;
            // photograph each sentence as it is written; tap to hurry on the touch run
            while (!(await page.evaluate(() => window.__notes.phases.includes('drawing-wake')))) {
                if (shots < 6) { await page.screenshot({ path: path.join(out, `${stem}-${shots++}.png`) }); }
                if (tap && await phase(page) === 'notes') await page.touchscreen.tap(width * .3, height * .3);
                await page.waitForTimeout(tap ? 400 : 1500);
                assert.ok(Date.now() - t0 < 120000, 'the notes end');
            }
            const elapsed = (Date.now() - t0) / 1000;
            const rec = await page.evaluate(() => window.__notes);
            assert.equal(rec.body.replace(/\n/g, ' ').replace(/\s+/g, ' '), paragraph, 'her whole note is written out, word for word');
            assert.deepEqual([...new Set(rec.sentences)], [0, 1, 2, 3].slice(0, splitSentences(paragraph).length), 'one sentence after another');
            assert.deepEqual(rec.bubbles, ['notes-bubble-steppe', 'notes-bubble-kelp', 'notes-bubble-mystery', 'notes-bubble-researcher'], 'her thoughts appear as she writes their words');
            assert.ok(rec.masked[0] === true, 'the sköldhäst is not drawn until she writes about it');
            assert.ok(rec.skip, 'a skip button is offered');
            assert.equal(await page.locator('.sk-notes-skip').count(), 0, 'and removed afterwards');
            assert.ok(rec.captions.includes(STORY.prolog.thinking), 'the player is told we are in her head');
            assert.ok(rec.captions.includes(STORY.prolog.wakeCaption), 'and that her sköldhäst is exactly as she imagines it');
            const order = ['notes', 'notes-end', 'drawing-wake'];
            for (const [i, p] of order.entries()) if (i) assert.ok(rec.phases.indexOf(p) > rec.phases.indexOf(order[i - 1]), `${p} follows ${order[i - 1]}`);
            const hero = await page.evaluate(() => {
                const all = (n) => [n, ...(n.children || []).flatMap(all)];
                const table = window.__skoldhast.debug.app.stage.children.find(c => c.label === 'story-table');
                const nodes = all(table);
                return { mask: !!nodes.find(n => n.label === 'opening-hero')?.mask, notes: !!nodes.find(n => n.label === 'opening-notes') };
            });
            assert.equal(hero.mask, false, 'the sköldhäst is fully drawn before it wakes');
            assert.equal(hero.notes, false, 'her notebook has gone when the picture takes over');
            await page.screenshot({ path: path.join(out, `${stem}-picture.png`) });
            assert.deepEqual(errors, []);
            results.push({ viewport: stem, seconds: Math.round(elapsed), phases: rec.phases, bubbles: rec.bubbles });
            console.log(`Alva's notes pass at ${stem} (${elapsed.toFixed(1)} s)`);
        } finally { await context.close(); }
    }

    // Skipping goes straight to her picture; closing during the notes leaves nothing behind.
    const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
        await open(page);
        await page.waitForSelector('.sk-notes-skip', { timeout: 30000 });
        const t0 = Date.now();
        await page.locator('.sk-notes-skip').click();
        await waitDraw(page, 20000);
        assert.ok(Date.now() - t0 < 12000, 'skipping reaches the picture quickly');
        await page.evaluate(() => window.__skoldhast.close());
        await page.evaluate(() => window.__skoldhast.open());
        await page.waitForSelector('.sk-title');
        await page.locator('.sk-title button').first().click();
        await page.waitForSelector('.sk-notes-skip', { timeout: 30000 });
        await page.evaluate(() => window.__skoldhast.close());
        await page.evaluate(() => window.__skoldhast.open());
        await page.waitForSelector('.sk-title');
        await page.waitForTimeout(1500);
        assert.equal(await page.locator('.sk-notes-skip, .sk-caption.on, .sk-draw.on').count(), 0, 'closing during her notes leaves nothing behind');
        assert.deepEqual(errors, []);
        console.log('skip and close during the notes pass');
        results.push({ skip: true, close: true });
    } finally { await context.close(); }
    await fs.writeFile(path.join(out, 'notes-results.json'), JSON.stringify(results, null, 2));
} finally { await browser.close(); server.close(); }
