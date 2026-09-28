#!/usr/bin/env node
/*
 * Contact sheets: visit every place in the game and take a screenshot (plan §7.5).
 *
 *   node tests/browser/skoldhast-tour.mjs --out docs/skoldhast/shots/k3 [--viewport 844x390] [--only land]
 *
 * Starts from word code 2 (everything up to Kapitel 3 open) and teleports with the ?debug hooks.
 * Writes PNGs; add --webp to convert them with sharp.
 */
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const out = args.out || 'shots';
const [W, H] = String(args.viewport || '844x390').split('x').map(Number);
fs.mkdirSync(out, { recursive: true });

const STOPS = [
    ['land', 'start', 108.6, -0.34], ['land', 'shells', 106.3, -0.4], ['land', 'pool', 101.4, -0.1], ['land', 'dunes', 96, -0.6],
    ['land', 'spangen', 88, -0.9], ['land', 'streckbron', 80.8, -0.66], ['land', 'steppe-entrance', 71, -0.77], ['land', 'galoppbanan', 58, -0.82],
    ['land', 'branten', 44, -1.9], ['land', 'ledge', 35, -4.0], ['land', 'galoppbacken', 28, -6.35], ['land', 'plateau-edge', 14, -4.0],
    ['land', 'klippudden', 4.5, -4.02], ['land', 'jetty', 116, -0.16],
    ['kelp', 'cave', 3, 2.4, 'swim'], ['kelp', 'kelp-entry', 12, 3.4, 'swim'], ['kelp', 'overlook', 20.8, 3.4, 'swim'], ['kelp', 'lyktbed', 23.5, 10, 'swim'],
    ['kelp', 'vault', 28, 11.2, 'swim'], ['kelp', 'kelphjartat', 35, 7.6, 'swim'], ['kelp', 'veckmuren', 45.5, 5, 'swim'],
    ['viken', 'shore', 0.8, -0.16], ['viken', 'pier', 12, -0.62], ['viken', 'pier-end', 22, -0.62], ['viken', 'under-pier', 14, 5.5, 'swim'],
    ['viken', 'pipe', 25.6, 4.6, 'swim'], ['viken', 'gallery', 28.5, -7.3]
];

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const pg = await ctx.newPage();
pg.on('pageerror', (e) => console.log('[pageerror]', e.message));
await pg.goto(`${base}/skoldhast/dev/play.html`, { waitUntil: 'load' });
await pg.waitForSelector('.sk-title');
await pg.screenshot({ path: path.join(out, `00-title-${W}x${H}.png`) });
await pg.getByText('Jag har en kod').click();
await pg.fill('.sk-code-input', 'fyr fjun klo');
await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
await pg.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'viken', null, { timeout: 30000 });
// let the arrival beat finish (tap through its lines)
for (let i = 0; i < 40; i++) {
    const busy = await pg.evaluate(() => { const d = window.__skoldhast.debug; if (d.ui.dialogueOpen()) d.ui.advance(); return d.G.busy; });
    if (!busy && i > 4) break;
    await pg.waitForTimeout(300);
}
let n = 0;
for (const [scene, name, x, y, mode] of STOPS) {
    if (args.only && args.only !== scene) continue;
    await pg.evaluate(([scene, x, y, mode]) => {
        const { G, view } = window.__skoldhast.debug;
        G.goto(scene, { x: x * 200, y: y * 200, facing: -1, mode });
        if (view.sceneId !== scene) view.setScene(scene); else view.cam.snap = true;
    }, [scene, x, y, mode]);
    await pg.waitForTimeout(900);
    const file = path.join(out, `${String(++n).padStart(2, '0')}-${scene}-${name}-${W}x${H}.png`);
    await pg.screenshot({ path: file });
}
if (args.webp) {
    const sharp = (await import('sharp')).default;
    for (const f of fs.readdirSync(out).filter((q) => q.endsWith('.png'))) {
        await sharp(path.join(out, f)).webp({ quality: 80 }).toFile(path.join(out, f.replace(/\.png$/, '.webp')));
        fs.unlinkSync(path.join(out, f));
    }
}
console.log(`${n} places photographed into ${out}`);
await browser.close();
server.close();
