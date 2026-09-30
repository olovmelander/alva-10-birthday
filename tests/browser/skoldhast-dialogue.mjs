#!/usr/bin/env node
// Speaker identity, character anchors, player-paced turns and phone layouts.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const outAt = process.argv.indexOf('--out');
const out = outAt < 0 ? null : process.argv[outAt + 1];
const sizeAt = process.argv.indexOf('--viewport');
const sizes = sizeAt < 0 ? [[844, 390], [390, 844], [1440, 900]] : [process.argv[sizeAt + 1].split('x').map(Number)];
if (out) await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch(), errors = [];
const shot = async (page, name) => { if (out) {
    await page.waitForTimeout(450);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await sharp(await page.screenshot()).webp({ quality: 85 }).toFile(path.join(out, name + '.webp'));
} };
const next = page => page.locator('.sk-dlg-next').click({ force: true }); // the pencil arrow gently animates
try {
    for (const [width, height] of process.argv.includes('--opening') ? [] : sizes) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1000 });
        page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.waitForSelector('.sk-title', { timeout: 60000 });
        await page.getByText('Jag har en kod').click();
        await page.fill('.sk-code-input', 'fyr fjun klo');
        await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await page.waitForFunction(() => {
            const d = window.__skoldhast.debug;
            if (d.ui.dialogueOpen()) d.ui.advance();
            return d.G?.sceneId === 'viken' && d.view.built('viken') && !d.G.busy && !d.story.running();
        }, null, { timeout: 60000 });
        await page.evaluate(() => {
            const { G, view, guide, ui } = window.__skoldhast.debug;
            G.story = null; G.busy = 0; G.hideHero = false; G.hideActors = false;
            G.goto('land', 'start'); view.setScene('land'); guide.clear(); ui.showControls(false);
            const p = G.player;
            Object.assign(G.actors.klo, { visible: true, inHole: false, scene: 'land', x: p.x - 190, y: p.y, pose: 'idle', walk: null });
            G.camHint = { x: p.x - 55, y: p.y - 125, zoom: innerWidth < 500 ? .85 : 1.1 };
            view.cam.snap = true;
            window.__dialogueDone = false;
            ui.say([['klo', 'Häst eller sköldpadda?'], ['horse', 'Ja.'], ['note', 'En anteckning.']]).then(() => { window.__dialogueDone = true; });
        });
        await page.waitForSelector('.sk-speaking.on[data-speaker="klo"]');
        await page.waitForSelector('.sk-dlg-name .face-klo .sk-art.on');
        assert.equal(await page.locator('.sk-dlg-name').textContent(), 'Professor Klo');
        assert.deepEqual(await page.evaluate(() => {
            const { G } = window.__skoldhast.debug;
            return [G.actors.klo.talking, G.actors.kv.talking];
        }), [true, false]);
        await shot(page, `klo-${width}x${height}`);
        // Long enough to exceed the old disappearing reply, without advancing.
        await page.waitForTimeout(2800);
        assert.equal(await page.locator('.sk-dlg-text').textContent(), 'Häst eller sköldpadda?');
        await next(page);
        await page.waitForSelector('.sk-speaking.on[data-speaker="horse"]');
        await page.waitForSelector('.sk-dlg-name .face-horse .sk-art.on');
        assert.equal(await page.locator('.sk-dlg-text').textContent(), 'Ja.');
        assert.equal(await page.evaluate(() => window.__skoldhast.debug.G.actors.klo.talking), false);
        const positions = await page.evaluate(() => {
            const { view } = window.__skoldhast.debug, b = view.speakerBounds('horse');
            const mark = document.querySelector('.sk-speaking').getBoundingClientRect();
            const card = document.querySelector('.sk-dialogue').getBoundingClientRect();
            return { distance: Math.abs(mark.x + mark.width / 2 - (b.minX + b.maxX) / 2),
                clear: mark.bottom <= b.minY, fits: card.left >= 0 && card.right <= innerWidth && card.bottom <= innerHeight };
        });
        assert.ok(positions.distance < 2 && positions.clear && positions.fits, JSON.stringify(positions));
        await shot(page, `horse-${width}x${height}`);
        await page.evaluate(() => { const d = window.__skoldhast.debug; d.G.lessMotion = true; d.ui.root.classList.add('less-motion'); });
        await page.waitForTimeout(450);
        assert.equal(await page.locator('.sk-speaking.on').count(), 1, 'reduced motion retains speaker identification');
        await next(page);
        await page.waitForFunction(() => window.__skoldhast.debug.ui.speaker() === 'note');
        await page.waitForFunction(() => !document.querySelector('.sk-speaking.on'));
        assert.equal(await page.locator('.sk-dlg-name .sk-speaker-face').count(), 0, 'notes have no character portrait');
        await page.waitForTimeout(400);
        await next(page);
        await page.waitForFunction(() => window.__dialogueDone);

        await page.evaluate(() => window.__skoldhast.debug.guide.hint('Jag antecknar!', 'klo', 6000));
        await page.waitForSelector('.sk-hintbubble.on .face-klo .sk-art.on');
        await page.waitForSelector('.sk-speaking.on[data-speaker="klo"]');
        await page.evaluate(() => window.__skoldhast.debug.guide.clear());

        // A returning off-screen speaker retains the portrait but no misplaced mark.
        await page.evaluate(() => {
            const { G, ui } = window.__skoldhast.debug;
            G.actors.klo.x += 10000;
            void ui.say([['klo', 'Jag antecknar!']]);
        });
        await page.waitForTimeout(450);
        assert.equal(await page.locator('.sk-speaking.on').count(), 0);
        assert.equal(await page.locator('.sk-dlg-name .face-klo').count(), 1);
        await next(page);

        // Later characters use their own artwork, including large text on phones.
        await page.evaluate(() => {
            const { G, view, ui } = window.__skoldhast.debug;
            G.goto('viken', { x: 4480, y: -124 }); view.setScene('viken');
            Object.assign(G.actors.kv, { visible: true, scene: 'viken', x: 4640, y: -124, pose: 'stand', walk: null });
            G.camHint = { x: 4540, y: -250, zoom: innerWidth < 500 ? .85 : 1.1 }; view.cam.snap = true;
            ui.setBigText(true); void ui.say([['kv', 'Jag vek undan havet.']]);
        });
        await page.waitForSelector('.sk-speaking.on[data-speaker="kv"]');
        await page.waitForSelector('.sk-dlg-name .face-kv .sk-art.on');
        assert.deepEqual(await page.evaluate(() => { const { G } = window.__skoldhast.debug; return [G.actors.klo.talking, G.actors.kv.talking]; }), [false, true]);
        await shot(page, `keeper-${width}x${height}`);
        await page.evaluate(() => window.__skoldhast.close());
        assert.equal(await page.locator('.sk-speaking').count(), 0, 'closing removes the speech mark');
        await page.close();
        console.log(`Dialogue passed at ${width}x${height}`);
    }
    for (const [width, height] of process.argv.includes('--opening') ? sizes : []) {
        const page = await browser.newPage({ viewport: { width, height } });
        page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.waitForSelector('.sk-title', { timeout: 60000 });
        await page.locator('.sk-title button').first().click();
        for (const who of ['horse', 'klo']) {
            let found = false;
            for (let i = 0; i < 600; i++) {
                const state = await page.evaluate(who => {
                    const { ui } = window.__skoldhast.debug;
                    document.querySelector('.sk-notes-skip')?.click();
                    if (ui.speaker() === who) return { found: true };
                    if (ui.dialogueOpen()) ui.advance();
                    return { draw: !!document.querySelector('.sk-draw.on') };
                }, who);
                if (state.found) { found = true; break; }
                if (state.draw) await page.keyboard.press('Enter');
                await page.waitForTimeout(150);
            }
            assert.ok(found, `opening reaches ${who}'s line`);
            await page.waitForSelector(`.sk-speaking.on[data-speaker="${who}"]`);
            await page.waitForSelector(`.sk-dlg-name .face-${who} .sk-art.on`);
            await shot(page, `opening-${who}-${width}x${height}`);
            await page.waitForTimeout(400);
            await next(page);
        }
        await page.evaluate(() => window.__skoldhast.close());
        assert.equal(await page.locator('.sk-speaking').count(), 0);
        await page.close();
        console.log(`Opening dialogue passed at ${width}x${height}`);
    }
    assert.deepEqual(errors, []);
} finally { await browser.close(); server.close(); }
