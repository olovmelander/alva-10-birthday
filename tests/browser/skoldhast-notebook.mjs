#!/usr/bin/env node
// Real notebook pages: phone-size tabs, page sounds, settings and closing.
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
const server = await serve(), browser = await launch();
try {
    for (const [width, height] of [[844, 390], [390, 844], [320, 700]]) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, deviceScaleFactor: 1 });
        const errors = [], sounds = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', e => { if (e.text().includes('menu-sound')) sounds.push(e.text().split(' ').at(-1)); });
        const base = `http://127.0.0.1:${server.address().port}/skoldhast/dev/menus.html`;
        await page.goto(`${base}?m=journal&page=2&shot=1`);
        await page.waitForSelector('.sk-j-tab');
        const widths = await page.locator('.sk-j-tab').evaluateAll(ns => ns.map(n => n.getBoundingClientRect().width));
        assert.ok(widths.every(w => w >= 44), `44px tabs at ${width}: ${widths}`);
        await page.locator('.sk-j-tab').nth(6).tap();
        await page.waitForFunction(() => document.querySelector('.sk-j-tab[aria-selected="true"]')?.classList.contains('t6'));
        await page.waitForFunction(() => !document.querySelector('.sk-j-flip'));
        assert.ok(sounds.includes('page'), 'a page turn requests the paper sound');
        await page.locator('.sk-x').tap();
        assert.equal(await page.locator('.sk-panel').evaluate(n => n.classList.contains('on')), false);
        assert.ok(sounds.includes('ui'), 'closing requests a soft UI sound');
        await page.goto(`${base}?m=settings&shot=1`);
        await page.waitForSelector('.sk-settings');
        await page.locator('.sk-toggle').nth(3).tap();
        assert.ok(await page.locator('.sk-ui').evaluate(n => n.classList.contains('big-text')));
        await page.locator('.sk-x').tap();
        assert.deepEqual(errors, []);
        await page.close();
        console.log(`notebook works at ${width}x${height}`);
    }
} finally { await browser.close(); server.close(); }
