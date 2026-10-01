#!/usr/bin/env node
/* Series integration: the real launcher, legacy saves, permanent completion,
 * independent players, replay, pause/resume and the production ending route.
 * Future stories are deliberately unreleased in every case.
 * node tests/browser/skoldhast-adventures.mjs [--out docs/skoldhast/shots/adventures]
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { CODE_RESTORE } from '../../skoldhast/src/save.mjs';
import { UI, ADVENTURE_UI } from '../../skoldhast/src/content/sv.mjs';

const FIRST = 'havet-mellan-sidorna', SECOND = 'adventure-2', THIRD = 'adventure-3';
const outArg = process.argv.indexOf('--out');
const out = path.resolve(outArg < 0 ? 'docs/skoldhast/shots/adventures' : process.argv[outArg + 1]);
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch();
const base = `http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`;
const errors = [], results = [];
const card = (page, id) => page.locator(`.sk-adventure-card[data-adventure-id="${id}"]`);
const legacy = (extra = {}) => ({ v: 1, contentVersion: 1, label: 'Alva',
    flags: [...CODE_RESTORE[2].flags, 'b:k3_arrive', 'viken_arrived'], checkpoint: 'viken',
    settings: { lessMotion: true }, note: 'Min gamla forskningsbok', ...extra });
const legacyEntries = data => ({
    'skoldhast.v1.index': { slots: ['alva', 'mira'], last: 'alva' },
    'skoldhast.v1.slot.alva': data,
    'skoldhast.v1.slot.mira': legacy({ label: 'Mira', note: 'Miras egen bok', checkpoint: 'overlook' })
});

async function openPage(viewport, entries = {}) {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 1000, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(values => {
        // A once-only import also allows ordinary reloads to exercise persistence.
        if (sessionStorage.getItem('adventure-fixture')) return;
        for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
        sessionStorage.setItem('adventure-fixture', '1');
    }, entries);
    await page.goto(base);
    await page.waitForSelector('.sk-title');
    return { context, page };
}

async function profile(page, id = 'alva') {
    return page.evaluate(async slot => {
        const { createSave } = await import('/skoldhast/src/save.mjs');
        return createSave().loadProfile(slot)?.data || null;
    }, id);
}

async function picker(page, from = '.sk-title') {
    await page.locator(`${from} .sk-choose-adventure`).click();
    await page.waitForSelector('.sk-adventures');
    assert.equal(await page.locator('.sk-adventure-card').count(), 3, 'all three adventures have a place in the series');
    assert.equal(await card(page, FIRST).locator('.sk-adventure-play').count(), 1);
    for (const id of [SECOND, THIRD]) {
        assert.ok((await card(page, id).getAttribute('class')).includes('is-locked'), `${id} remains locked while unpublished`);
        assert.equal(await card(page, id).locator('.sk-adventure-play').count(), 0, `${id} has no launch action`);
        assert.ok((await card(page, id).locator('.sk-adventure-status').textContent()).trim(), 'the lock has a visible explanation');
    }
}

async function closePicker(page) {
    await page.locator('.sk-adventures-close').click();
    await page.waitForSelector('.sk-adventures', { state: 'hidden' });
}

async function settle(page, scene) {
    await page.waitForFunction(wanted => {
        const d = window.__skoldhast.debug;
        if (d.ui.dialogueOpen()) d.ui.advance();
        return d.G?.sceneId === wanted && d.view.built(wanted) && !d.G.busy && !d.story.running();
    }, scene, { timeout: 60000, polling: 120 });
}

async function reopen(page) {
    await page.evaluate(async () => { await window.__skoldhast.close(); await window.__skoldhast.open(); });
    await page.waitForSelector('.sk-title');
    assert.equal(await page.locator('.sk-root').count(), 1, 'reopening leaves one game root');
}

async function fits(page, name) {
    const state = await page.evaluate(() => ({
        width: innerWidth, height: innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        roots: [...document.querySelectorAll('.sk-root, .sk-adventures')].map(node => {
            const r = node.getBoundingClientRect();
            return { x: r.x, right: r.right, width: r.width, client: node.clientWidth, scroll: node.scrollWidth };
        }),
        close: (() => { const r = document.querySelector('.sk-adventures-close')?.getBoundingClientRect();
            return r ? { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null; })()
    }));
    assert.ok(state.documentWidth <= state.width + 1, `${name}: no page horizontal overflow`);
    for (const r of state.roots) {
        assert.ok(r.x >= -1 && r.right <= state.width + 1, `${name}: container fits the screen`);
        assert.ok(r.scroll <= r.client + 1, `${name}: no horizontal scrolling in the selector`);
    }
    if (state.close) {
        assert.ok(state.close.width >= 44 && state.close.height >= 44, `${name}: usable return target`);
        await page.locator('.sk-adventures-close').scrollIntoViewIfNeeded();
    }
    await sharp(await page.screenshot()).webp({ quality: 90 }).toFile(path.join(out, `${name}.webp`));
}

async function endingActionsFit(page, count) {
    // Let the paper's entrance animation finish before measuring its edges.
    await page.waitForTimeout(400);
    const geometry = await page.locator('.sk-ending').evaluate(node => {
        const card = node.getBoundingClientRect();
        return { scroll: node.scrollTop, top: Math.max(0, card.top), bottom: Math.min(innerHeight, card.bottom),
            width: innerWidth, buttons: [...node.querySelectorAll('button')].map(button => {
                const r = button.getBoundingClientRect();
                return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
            }) };
    });
    assert.equal(geometry.buttons.length, count);
    assert.equal(geometry.scroll, 0, 'ending opens at the top of its paper');
    assert.ok(geometry.buttons.every(r => r.width >= 44 && r.height >= 44 && r.x >= -1
        && r.right <= geometry.width + 1 && r.y >= geometry.top - 1 && r.bottom <= geometry.bottom + 1),
    'all ending actions fit initially in short landscape');
}

try {
    for (const [width, height] of [[390, 844], [844, 390], [1440, 900]]) {
        const { context, page } = await openPage({ width, height });
        assert.equal(await page.locator('.sk-title button').filter({ hasText: UI.cont }).count(), 0,
            'fresh player has no continue action');
        assert.match(await page.locator('.sk-title').innerText(), /Äventyr 1/);
        await fits(page, `fresh-title-${width}x${height}`);
        await picker(page);
        assert.equal(await card(page, FIRST).locator('.sk-adventure-play').textContent(), ADVENTURE_UI.begin);
        await fits(page, `fresh-selector-${width}x${height}`);
        // Escape restores the title and its keyboard focus.
        await page.keyboard.press('Escape');
        await page.waitForSelector('.sk-adventures', { state: 'hidden' });
        assert.equal(await page.locator('.sk-title').isVisible(), true);
        assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('sk-choose-adventure')), true);
        await picker(page);
        await closePicker(page);
        assert.equal(await page.locator('.sk-title').isVisible(), true);
        await context.close();
        results.push(`fresh selector and return: ${width}x${height}`);
    }

    {
        const original = legacy();
        const { context, page } = await openPage({ width: 844, height: 390 }, legacyEntries(original));
        await picker(page);
        assert.equal((await card(page, FIRST).getAttribute('class')).includes('is-complete'), false,
            'finishing the old internal chapters does not finish the whole adventure');
        await closePicker(page);
        await page.locator('.sk-title').getByRole('button', { name: UI.cont, exact: true }).click();
        await settle(page, 'viken');
        for (const flag of original.flags) assert.equal(await page.evaluate(f => window.__skoldhast.debug.G.has(f), flag), true);
        await page.locator('.sk-pause-btn').click();
        const before = await page.evaluate(() => {
            const { G } = window.__skoldhast.debug;
            return { x: G.player.x, y: G.player.y, scene: G.sceneId, time: G.time };
        });
        await picker(page, '.sk-pause');
        await page.waitForTimeout(250);
        const during = await page.evaluate(() => {
            const { G } = window.__skoldhast.debug;
            return { x: G.player.x, y: G.player.y, scene: G.sceneId, time: G.time };
        });
        assert.deepEqual(during, before, 'browsing stories keeps the current world paused in place');
        await fits(page, 'paused-selector-844x390');
        await closePicker(page);
        // The return may leave the pause menu visible or resume directly; both
        // must resume the same live world instead of rebuilding its checkpoint.
        if (await page.locator('.sk-pause').isVisible()) await page.locator('.sk-pause').getByRole('button', { name: UI.resume, exact: true }).click();
        await page.waitForFunction(time => window.__skoldhast.debug.G.time > time, before.time);
        const after = await page.evaluate(() => {
            const { G } = window.__skoldhast.debug;
            return { x: G.player.x, y: G.player.y, scene: G.sceneId };
        });
        assert.equal(after.scene, before.scene);
        assert.ok(Math.abs(after.x - before.x) < 10 && Math.abs(after.y - before.y) < 10, 'selector return preserves position');
        await reopen(page);
        const migrated = await profile(page);
        assert.equal(migrated.v, 2);
        assert.equal(migrated.adventures[FIRST].note, original.note);
        assert.deepEqual(migrated.completedAdventures, []);
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('skoldhast.v1.slot.alva')).note), original.note,
            'legacy source remains intact after migration');
        await page.locator('.sk-title').getByRole('button', { name: UI.switchResearcher, exact: true }).click();
        await page.locator('.sk-slots .sk-slot').filter({ hasText: 'Mira' }).click();
        await settle(page, 'kelp');
        await reopen(page);
        const mira = await profile(page, 'mira');
        assert.equal(mira.adventures[FIRST].note, 'Miras egen bok');
        assert.equal((await profile(page, 'alva')).adventures[FIRST].note, original.note);
        results.push('unfinished legacy migration, pause return, close/reopen, independent players');
        await context.close();
    }

    {
        // Some old saves record the ended flag without the redundant ended
        // property. They still qualify for the sequel as soon as it is released.
        const finished = legacy({ flags: [...legacy().flags, 'ended', 'b:k3_window'], checkpoint: 'beachEnd' });
        const { context, page } = await openPage({ width: 390, height: 844 }, legacyEntries(finished));
        await picker(page);
        assert.ok((await card(page, FIRST).getAttribute('class')).includes('is-complete'));
        assert.ok((await profile(page)).completedAdventures.includes(FIRST));
        await fits(page, 'completed-selector-390x844');
        await card(page, FIRST).locator('.sk-adventure-play').click();
        await settle(page, 'land');
        assert.equal(await page.evaluate(() => window.__skoldhast.debug.G.has('ended')), true);
        for (const id of [SECOND, THIRD]) {
            assert.equal(await page.evaluate(adventure => window.__skoldhast.switchAdventure(adventure), id), false,
                'direct launch also refuses an unreleased story');
            assert.equal(await page.evaluate(() => window.__skoldhast.activeAdventure), FIRST);
        }
        await reopen(page);

        // Stage another story's independent state as a future-version save;
        // replaying Adventure 1 must never remove that state or the unlock.
        const other = { flags: ['future-keepsake'], checkpoint: 'future-start', note: 'Orörd berättelse', puz: { keepsake: 7 }, ended: false };
        await page.evaluate(({ id, state }) => {
            const key = 'skoldhast.v2.slot.alva';
            const data = JSON.parse(localStorage.getItem(key));
            data.adventures[id] = state;
            localStorage.setItem(key, JSON.stringify(data));
        }, { id: SECOND, state: other });
        await page.reload(); await page.waitForSelector('.sk-title');
        const expectedOther = (await profile(page)).adventures[SECOND];
        await page.locator('.sk-title').getByRole('button', { name: UI.startOver, exact: true }).click();
        await page.locator('.sk-confirm').getByRole('button', { name: UI.yes, exact: true }).click();
        await page.waitForFunction(() => {
            const d = window.__skoldhast.debug;
            document.querySelector('.sk-notes-skip')?.click();
            if (d.ui.dialogueOpen()) d.ui.advance();
            document.querySelector('.sk-draw.on .sk-draw-example')?.click();
            document.querySelector('.sk-choice.on button')?.click();
            return d.G?.has('intro_done') && d.G.sceneId === 'land' && !document.querySelector('.sk-title');
        }, null, { timeout: 90000, polling: 120 });
        await reopen(page);
        const replay = await profile(page);
        assert.ok(replay.completedAdventures.includes(FIRST), 'replay cannot revoke permanent completion');
        assert.equal(replay.adventures[FIRST].flags.includes('ended'), false, 'the current story really restarted');
        assert.deepEqual(replay.adventures[SECOND], expectedOther, 'replay preserves the other story exactly');
        await picker(page);
        assert.ok((await card(page, FIRST).getAttribute('class')).includes('is-complete'));
        results.push('finished legacy migration, unpublished locks, replay preserves unlock and other adventure');
        await context.close();
    }

    {
        // Staged completed coast repair, then the actual story runs its final
        // splash, save and epilogue. This is ending integration, not a claim of
        // playing through the preceding puzzles in the browser.
        const finalFlags = [...legacy().flags, 'shutter1', 'shutter2', 'shutter3', 'lamp_lit', 'b:k3_lamp',
            'kv_met', 'talk1', 'b:k3_talk1', 'talk2', 'talk_done', 'b:k3_line', 'p8_s1', 'p8_s2', 'p8_s3',
            'p8_land', 'p8_sea', 'p8_done', 'p8_proven', 'unfolded'];
        const { context, page } = await openPage({ width: 844, height: 390 },
            legacyEntries(legacy({ flags: finalFlags, checkpoint: 'lineWindow' })));
        await page.locator('.sk-title').getByRole('button', { name: UI.cont, exact: true }).click();
        await page.waitForFunction(() => {
            const d = window.__skoldhast.debug;
            if (d.ui.dialogueOpen()) d.ui.advance();
            return !!document.querySelector('.sk-ending');
        }, null, { timeout: 90000, polling: 120 });
        const ended = await profile(page);
        assert.ok(ended.completedAdventures.includes(FIRST), 'completion is saved before dismissing the ending card');
        assert.equal(ended.adventures[FIRST].checkpoint, 'beachEnd');
        await endingActionsFit(page, 2);
        await fits(page, 'ending-844x390');
        await page.locator('.sk-ending .sk-choose-adventure').click();
        await page.waitForSelector('.sk-adventures');
        assert.ok((await card(page, FIRST).getAttribute('class')).includes('is-complete'));
        assert.equal(await card(page, SECOND).locator('.sk-adventure-play').count(), 0);
        await fits(page, 'ending-selector-844x390');
        await closePicker(page);
        await settle(page, 'land');
        assert.equal(await page.evaluate(() => window.__skoldhast.debug.G.has('ended')), true);
        results.push('production finale saves completion and opens selector, then returns to the beach');

        // Render a future released sequel without changing the real catalogue
        // or attempting to load a story that has not been built.
        await page.evaluate(() => {
            window.__skoldhast.pause();
            window.__adventureEndingResult = null;
            window.__skoldhast.debug.ui.ending({ nextAdventure: { id: 'adventure-2', number: 2, playable: true } })
                .then(action => { window.__adventureEndingResult = action; });
        });
        await endingActionsFit(page, 3);
        await fits(page, 'ending-next-844x390');
        await page.locator('.sk-next-adventure').click();
        await page.waitForFunction(() => !!window.__adventureEndingResult);
        assert.deepEqual(await page.evaluate(() => window.__adventureEndingResult), { type: 'next', adventureId: SECOND });
        results.push('future next-adventure ending action fits and identifies the selected story');
        await context.close();
    }
    assert.deepEqual(errors, [], 'no browser runtime or loading errors');
    await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ results, errors }, null, 2));
    console.log('Adventure browser checks passed:\n' + results.map(result => `- ${result}`).join('\n'));
} finally {
    await browser.close();
    server.close();
}
