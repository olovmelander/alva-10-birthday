#!/usr/bin/env node
/*
 * Browser checks for Sköldhästen's launcher on the ticket page (plan §8.3, §8.8).
 * Needs Chromium (Playwright; preinstalled at /opt/pw-browsers here). Not part of `npm test`.
 *
 *   node tests/browser/skoldhast-launch.mjs
 *
 * 1. Without ?skoldhast the button is hidden and nothing under skoldhast/ is requested.
 * 2. With ?skoldhast the loader hides the ticket at once, prefetches files.json, and opens the game.
 * 3. Avbryt during loading restores the ticket, and the cancelled load never opens the game.
 * 4. close() restores the page; the game opens again afterwards.
 * 5. Pressing Mira's button and then Sköldhästen's while Mira loads opens only Sköldhästen.
 */
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const server = await serve(undefined, { latency: 60 });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launch();
let failures = 0;

async function page(url) {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const pg = await ctx.newPage();
    const requests = [];
    const errors = [];
    pg.on('request', (r) => requests.push(r.url().replace(base, '')));
    // only errors from the game count (the ticket page's CDN scripts may be blocked in a sandbox)
    pg.on('pageerror', (e) => { if (/skoldhast\/(src|vendor)/.test(e.stack || '')) errors.push(e.message); });
    pg.on('console', (m) => { if (m.type() === 'error' && /Sköldhästen|skoldhast/.test(m.text())) errors.push(m.text()); });
    await pg.goto(base + url, { waitUntil: 'load' });
    return { pg, ctx, requests, errors };
}
async function check(name, fn) {
    try { await fn(); console.log('ok  ', name); }
    catch (err) { failures++; console.log('FAIL', name, '\n     ', err.message.split('\n').join('\n      ')); }
}
const marioDisplay = (pg) => pg.evaluate(() => document.getElementById('mario-content').style.display);

await check('no ?skoldhast: hidden button, no requests to skoldhast/', async () => {
    const { pg, ctx, requests } = await page('/index.html');
    await pg.waitForTimeout(800);
    assert.equal(await pg.evaluate(() => document.getElementById('play-skoldhast-btn').hidden), true);
    assert.deepEqual(requests.filter((u) => u.includes('skoldhast/')), []);
    await ctx.close();
});

await check('?skoldhast: the loader opens the game and hides the ticket', async () => {
    const { pg, ctx, requests, errors } = await page('/index.html?skoldhast');
    assert.equal(await pg.evaluate(() => document.getElementById('play-skoldhast-btn').hidden), false);
    assert.deepEqual(requests.filter((u) => u.includes('skoldhast/')), [], 'nothing loads before the click');
    await pg.evaluate(() => document.getElementById('play-skoldhast-btn').click());
    assert.equal(await marioDisplay(pg), 'none', 'the ticket hides at once');
    assert.equal(await pg.evaluate(() => document.getElementById('skoldhast-loader').hidden), false);
    await pg.waitForSelector('.sk-root .sk-title', { timeout: 30000 });
    await pg.waitForFunction(() => document.getElementById('skoldhast-loader').hidden, null, { timeout: 5000 });
    assert.ok(requests.includes('/skoldhast/files.json'));
    assert.ok(requests.some((u) => u.startsWith('/skoldhast/assets/')));
    assert.deepEqual(errors, []);
    // close restores the page, and it opens again
    await pg.evaluate(() => window.__skoldhast.close());
    assert.equal(await pg.evaluate(() => !!document.querySelector('.sk-root')), false);
    assert.equal(await marioDisplay(pg), '');
    assert.equal(await pg.evaluate(() => document.documentElement.classList.contains('skoldhast-lock')), false);
    await pg.evaluate(() => document.getElementById('play-skoldhast-btn').click());
    await pg.waitForSelector('.sk-root .sk-title', { timeout: 30000 });
    await pg.evaluate(() => window.__skoldhast.close());
    assert.deepEqual(errors, []);
    await ctx.close();
});

await check('Avbryt while loading restores the ticket and never opens the game', async () => {
    const { pg, ctx } = await page('/index.html?skoldhast');
    await pg.evaluate(() => document.getElementById('play-skoldhast-btn').click());
    await pg.waitForTimeout(150);
    await pg.evaluate(() => document.querySelector('#skoldhast-loader [data-skl="cancel"]').click());
    assert.equal(await pg.evaluate(() => document.getElementById('skoldhast-loader').hidden), true);
    assert.equal(await marioDisplay(pg), '');
    await pg.waitForTimeout(4000);
    assert.equal(await pg.evaluate(() => !!document.querySelector('.sk-root')), false, 'the cancelled load stays closed');
    await ctx.close();
});

await check('Mira then Sköldhästen while Mira loads: only Sköldhästen opens', async () => {
    const { pg, ctx } = await page('/index.html?skoldhast');
    await pg.evaluate(() => { document.getElementById('play-mira-btn').click(); document.getElementById('play-skoldhast-btn').click(); });
    await pg.waitForSelector('.sk-root .sk-title', { timeout: 30000 });
    await pg.waitForTimeout(1500);
    const miraOpen = await pg.evaluate(() => !!document.querySelector('.mira-root.is-open, #mira-root.is-open, [class*="mira"].is-open'));
    assert.equal(miraOpen, false, 'Mira stays closed');
    await ctx.close();
});

await browser.close();
server.close();
if (failures) { console.log(`${failures} failed`); process.exit(1); }
console.log('all browser checks passed');
