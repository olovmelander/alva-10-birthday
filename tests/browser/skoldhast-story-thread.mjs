#!/usr/bin/env node
// Real UI with staged story states: mission, readable purpose, and working hints.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { THREAD } from '../../skoldhast/src/content/sv.mjs';

const i = process.argv.indexOf('--out');
const out = path.resolve(i < 0 ? '.codex/artifacts/skoldhast-story-thread' : process.argv[i + 1]);
fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch();
try {
    for (const [width, height] of [[844, 390], [390, 844], [320, 700]]) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/menus.html?m=journal&page=2&shot=1&less=1${width === 320 ? '&big=1' : ''}`);
        await page.waitForSelector('.sk-j-mission');
        assert.equal(await page.locator('.sk-j-mission').textContent(), THREAD.mission);
        assert.equal(await page.locator('.sk-j-purpose').textContent(), THREAD.why.p5);
        await page.screenshot({ path: path.join(out, `notebook-${width}x${height}.png`) });
        await page.locator('.sk-j-help').tap();
        await page.locator('.sk-j-help.more').tap();
        assert.match(await page.locator('.sk-j-sketch.on').textContent(), /strömmen/);
        const notebookFits = await page.locator('.sk-j-known').evaluate(n => n.scrollWidth <= n.clientWidth + 1);
        assert.ok(notebookFits, 'the added story explanation never overflows horizontally');
        await page.locator('.sk-x').tap();
        for (const state of ['start', 'p5', 'talk1', 'talk2', 'p8', 'end']) {
            const expected = await page.evaluate(async state => {
                const { createGame } = await import('/skoldhast/src/game.mjs');
                const { createStory } = await import('/skoldhast/src/story.mjs');
                const { CODE_RESTORE } = await import('/skoldhast/src/save.mjs');
                const G = createGame(), story = createStory(G, { ui: {} });
                let flags = ['intro_done'];
                if (state === 'p5') flags = [...CODE_RESTORE[1].flags, 'ch2_open'];
                else if (['talk1', 'talk2', 'p8', 'end'].includes(state)) flags = [...CODE_RESTORE[2].flags, 'viken_arrived', 'lamp_lit', 'kv_met', 'talk1'];
                if (['talk2', 'p8', 'end'].includes(state)) flags.push('talk2');
                if (['p8', 'end'].includes(state)) flags.push('talk_done');
                if (state === 'end') flags.push('ended');
                G.restore({ flags, checkpoint: state === 'start' ? 'start' : state === 'p5' ? 'trench' : 'pierEnd' });
                const cue = story.guidance(), { guide } = window.__menus;
                guide.clear(); guide.goal(cue.goal); guide.context(cue); guide.show(true);
                await document.fonts.ready;
                return { goal: cue.goal, mission: cue.thread.mission };
            }, state);
            assert.equal(await page.locator('.sk-goal-label').textContent(), expected.mission);
            assert.equal(await page.locator('.sk-goal-text').textContent(), expected.goal);
            const fits = await page.locator('.sk-goal').evaluate(n => {
                const r = n.getBoundingClientRect();
                return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && n.scrollWidth <= n.clientWidth + 1;
            });
            assert.ok(fits, `${state}: mission and next step fit at ${width}x${height}`);
            if (['start', 'p8', 'end'].includes(state)) await page.screenshot({ path: path.join(out, `${state}-${width}x${height}.png`) });
        }
        assert.deepEqual(errors, []);
        await page.close();
        console.log(`story mission, notebook and hints work at ${width}x${height}`);
    }
} finally { await browser.close(); server.close(); }
