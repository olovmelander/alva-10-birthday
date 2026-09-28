#!/usr/bin/env node
/*
 * Development helper: serve the repository and take screenshots in headless
 * Chromium (WebGL via SwiftShader). Used by the art review loop and the
 * browser checks of Sköldhästen.
 *
 *   node scripts/skoldhast-shot.mjs --url "/index.html?skoldhast" --out shot.png \
 *        [--viewport 390x844] [--dpr 2] [--wait 1500] [--eval "js in page"] [--steps "js;js"]
 *
 * --eval runs once after the page settles (may return a promise).
 * --steps runs several snippets separated by ';;' with --wait between them and
 * writes out-1.png, out-2.png, ...
 * Console messages and page errors are printed to stdout.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
function loadPlaywright() {
    try { return require('playwright'); } catch { /* fall through */ }
    return require('/opt/node22/lib/node_modules/playwright');
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav'
};

export function serve(root = ROOT, { latency = 0 } = {}) {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://x');
        let file = path.join(root, decodeURIComponent(url.pathname));
        if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        const send = () => {
            fs.readFile(file, (err, data) => {
                if (err) { res.writeHead(404); res.end('not found'); return; }
                res.writeHead(200, {
                    'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
                    'cache-control': 'no-store'
                });
                res.end(data);
            });
        };
        if (latency) setTimeout(send, latency); else send();
    });
    return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

export async function launch() {
    const { chromium } = loadPlaywright();
    return chromium.launch({
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
            '--autoplay-policy=no-user-gesture-required']
    });
}

function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const next = argv[i + 1];
            if (next === undefined || next.startsWith('--')) out[key] = true;
            else { out[key] = next; i++; }
        }
    }
    return out;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const url = args.url || '/index.html';
    const [w, h] = String(args.viewport || '844x390').split('x').map(Number);
    const dpr = Number(args.dpr || 1);
    const wait = Number(args.wait || 1500);
    const outFile = args.out || 'shot.png';
    const server = await serve();
    const port = server.address().port;
    const browser = await launch();
    const context = await browser.newContext({
        viewport: { width: w, height: h }, deviceScaleFactor: dpr,
        hasTouch: !!args.touch, isMobile: !!args.touch
    });
    const page = await context.newPage();
    page.on('console', (m) => console.log(`[console.${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}\n${e.stack || ''}`));
    await page.goto(`http://127.0.0.1:${port}${url}`, { waitUntil: 'load' });
    await page.waitForTimeout(wait);
    if (args.eval) {
        const r = await page.evaluate(args.eval);
        if (r !== undefined) console.log('[eval]', typeof r === 'string' ? r : JSON.stringify(r));
        await page.waitForTimeout(Number(args.after || 600));
    }
    if (args.steps) {
        const steps = String(args.steps).split(';;');
        for (let i = 0; i < steps.length; i++) {
            const r = await page.evaluate(steps[i]);
            if (r !== undefined) console.log(`[step ${i + 1}]`, typeof r === 'string' ? r : JSON.stringify(r));
            await page.waitForTimeout(Number(args.after || wait));
            await page.screenshot({ path: outFile.replace(/\.png$/, `-${i + 1}.png`) });
        }
    } else {
        await page.screenshot({ path: outFile });
    }
    await browser.close();
    server.close();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main().catch((e) => { console.error(e); process.exit(1); });
}
