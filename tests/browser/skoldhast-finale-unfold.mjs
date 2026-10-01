#!/usr/bin/env node
// Kartväktaren unfolds the page: at Alva's table her picture lies folded as the opening left
// it, the corner swings out again with Bryggan and the lit lighthouse, and the view dives into
// her beach for the splash (prologue.mjs unfold, story.mjs finale).
// node tests/browser/skoldhast-finale-unfold.mjs [--out <dir>]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { STORY } from '../../skoldhast/src/content/sv.mjs';

const outAt = process.argv.indexOf('--out');
const out = outAt >= 0 ? process.argv[outAt + 1] : null;
if (out) await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch();
const base = `http://127.0.0.1:${server.address().port}`;

try {
    for (const { width, height, less } of [{ width: 844, height: 390, less: false }, { width: 390, height: 844, less: false }, { width: 390, height: 844, less: true }]) {
        const page = await browser.newPage({ viewport: { width, height }, reducedMotion: less ? 'reduce' : 'no-preference' });
        const errors = [], stem = `${width}x${height}${less ? '-less' : ''}`;
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        await page.goto(`${base}/skoldhast/dev/play.html`);
        await page.getByText('Jag har en kod').click();
        await page.fill('.sk-code-input', 'kelp mås skal');
        await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await page.waitForFunction(() => { const d = window.__skoldhast.debug; if (d.ui.dialogueOpen()) d.ui.advance(); return d.G?.sceneTime > .5 && !d.G.busy && !d.story.running() && !d.ui.dialogueOpen(); }, null, { timeout: 60000, polling: 100 });
        await page.evaluate(async () => { const { assets } = window.__skoldhast.debug; await Promise.all(assets.bundles().map(b => assets.load(b))); });
        const from = await page.evaluate(() => window.__skoldhast.debug.G.sceneId);
        // Watch every frame: the phases, what the paper shows in each, and the world under the table.
        await page.evaluate(() => {
            const { app, view, G } = window.__skoldhast.debug;
            const find = (node, label) => node.label === label ? node : (node.children || []).reduce((hit, c) => hit || find(c, label), null);
            const rec = window.__unfold = { phases: [], seen: {}, covered: null, done: false };
            const watch = () => {
                const table = app.stage.children.find(c => c.label === 'story-table'), phase = table?.storyPhase;
                if (phase && phase !== rec.phases.at(-1)) rec.phases.push(phase);
                if (phase && !rec.seen[phase]) {
                    const paper = table.children.find(c => c.label === 'story-paper');
                    rec.seen[phase] = {
                        folded: !!find(paper, 'opening-sea-folded'), flap: !!find(paper, 'opening-sea-flap'),
                        lighthouse: find(paper, 'opening-lighthouse')?.children.length || 0, jetty: !!find(paper, 'opening-jetty'),
                        world: view.sceneId, alpha: table.alpha
                    };
                }
                if (!rec.done) requestAnimationFrame(watch);
            };
            watch();
            window.__unfoldRun = view.fx('unfoldPage', { onCovered: () => {
                rec.covered = { table: app.stage.children.find(c => c.label === 'story-table').alpha, world: view.sceneId };
                G.goto('land', 'start', { silent: true });
            } }).then(() => { rec.done = true; });
        });
        if (out) {
            await page.waitForFunction(() => window.__unfold.phases.includes('unfolded'), null, { timeout: 30000 });
            await page.screenshot({ path: path.join(out, `unfolded-${stem}.png`) });
        }
        await page.waitForFunction(() => window.__unfold.done, null, { timeout: 45000 });
        const r = await page.evaluate(() => {
            const { app, view, G } = window.__skoldhast.debug;
            const table = app.stage.children.find(c => c.label === 'story-table');
            return { ...window.__unfold, after: { table: table.visible, world: view.sceneId, scene: G.sceneId, x: G.player.x / 200 } };
        });
        assert.deepEqual(r.phases.filter(p => p !== 'idle'), ['unfold-folded', 'unfolding', 'unfolded'], `${stem}: folded, unfolding, unfolded, in order`);
        assert.ok(r.seen['unfold-folded'].folded, `${stem}: her picture starts folded as the opening left it`);
        assert.ok(r.seen['unfold-folded'].world === from, `${stem}: the world behind the fading table stays where the player was`);
        assert.ok(r.covered && r.covered.table >= .999, `${stem}: the world moves only once the table covers it`);
        assert.ok(r.seen.unfolded.lighthouse > 0 && r.seen.unfolded.jetty, `${stem}: the lighthouse is back in her margin, Bryggan whole`);
        assert.ok(!r.seen.unfolded.folded && !r.seen.unfolded.flap, `${stem}: nothing is folded any more`);
        assert.equal(r.seen.unfolded.world, 'land', `${stem}: the view under the table is her beach before the dive`);
        assert.equal(r.after.table, false, `${stem}: the table is gone after the dive`);
        assert.ok(r.after.world === 'land' && r.after.scene === 'land', `${stem}: the dive lands on her beach`);
        assert.ok(Math.abs(r.after.x - 108.6) < .5, `${stem}: at the start, by the hanging splash`);
        assert.deepEqual(errors, [], `${stem}: no page errors`);
        console.log(`finale unfold ${stem}: folded → unfolding → unfolded → beach (${STORY.final.unfoldCaption})`);
        await page.close();
    }
} finally {
    await browser.close();
    server.close();
}
