#!/usr/bin/env node
/*
 * Builds every piece of Sköldhästen's art from code (see scripts/skoldhast-art/)
 * into skoldhast/assets/, then writes:
 *   - skoldhast/assets/manifest.json  (atlases, images, data, bundles)
 *   - skoldhast/files.json            (the files the loader prefetches before the game starts)
 * and checks the download budget of the first playable bundle.
 *
 *   node scripts/build-skoldhast-assets.mjs            # everything
 *   node scripts/build-skoldhast-assets.mjs --only hero,props
 *
 * Each art module exports `build(api)`:
 *   api.atlas(name, { scale, bundle })          declare an atlas (scale = texture px per world unit)
 *   api.frame(atlas, frameName, canvas, [ax, ay]) add a frame (anchor in 0..1)
 *   api.image(name, canvas, { bundle, repeat, quality })  a standalone texture (materials, backdrops)
 *   api.data(name, object, { bundle })          JSON data next to the art (e.g. the hero rig)
 * plus the pencil toolkit (api.Sheet, api.P, api.pencil.*).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as pencil from './skoldhast-art/pencil.mjs';
import { writeAtlas, writeImage } from './skoldhast-art/atlas.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'skoldhast', 'assets');
const MODULES = ['hero', 'npcs', 'props', 'materials', 'backdrops', 'ui'];
const BOOT_BUDGET = 3 * 1024 * 1024; // first playable, compressed

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null;

async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    const PARTS = path.join(OUT, '.parts');
    fs.mkdirSync(PARTS, { recursive: true });

    for (const mod of MODULES) {
        if (only && !only.includes(mod)) continue;
        const file = path.join(ROOT, 'scripts', 'skoldhast-art', `${mod}.mjs`);
        if (!fs.existsSync(file)) { console.log(`- ${mod}: (no module yet)`); continue; }
        const t0 = Date.now();
        const part = { atlases: {}, images: {}, data: {} };
        const atlases = {};
        const images = [];
        const datas = [];
        const api = {
            Sheet: pencil.Sheet, P: pencil.PENCILS, pencil,
            atlas(name, { scale = 1, bundle = 'boot', quality = 82 } = {}) { atlases[name] ||= { scale, bundle, quality, frames: [] }; },
            frame(atlas, name, canvas, anchor = [0.5, 0.5]) {
                if (!atlases[atlas]) throw new Error(`declare atlas ${atlas} first`);
                atlases[atlas].frames.push({ name, canvas, anchor });
            },
            image(name, canvas, { bundle = 'boot', repeat = false, quality = 80, scale = 1 } = {}) { images.push({ name, canvas, bundle, repeat, quality, scale }); },
            data(name, obj, { bundle = 'boot' } = {}) { datas.push({ name, obj, bundle }); }
        };
        const m = await import(pathToFileURL(file).href);
        await m.build(api);
        for (const [name, a] of Object.entries(atlases)) {
            if (!a.frames.length) continue;
            const files = await writeAtlas(OUT, name, a.frames, a.scale, { quality: a.quality });
            part.atlases[name] = { bundle: a.bundle, scale: a.scale, files: files.map((f) => f.json), images: files.map((f) => f.image), bytes: files.reduce((s, f) => s + f.bytes, 0), frames: a.frames.length };
        }
        for (const im of images) {
            const f = await writeImage(OUT, im.name, im.canvas, { quality: im.quality });
            part.images[im.name] = { bundle: im.bundle, file: f.image, bytes: f.bytes, w: f.w, h: f.h, repeat: im.repeat, scale: im.scale };
        }
        for (const d of datas) {
            fs.writeFileSync(path.join(OUT, `${d.name}.json`), JSON.stringify(d.obj));
            part.data[d.name] = { bundle: d.bundle, file: `${d.name}.json` };
        }
        fs.writeFileSync(path.join(PARTS, `${mod}.json`), JSON.stringify(part));
        console.log(`- ${mod}: ${Object.keys(atlases).length} atlases, ${images.length} images, ${datas.length} data in ${Date.now() - t0} ms`);
    }

    // merge every module's part into the manifest (safe when modules are built separately)
    const manifestPath = path.join(OUT, 'manifest.json');
    const manifest = { version: 1, atlases: {}, images: {}, data: {} };
    for (const f of fs.readdirSync(PARTS).filter((n) => n.endsWith('.json')).sort()) {
        const part = JSON.parse(fs.readFileSync(path.join(PARTS, f), 'utf8'));
        Object.assign(manifest.atlases, part.atlases);
        Object.assign(manifest.images, part.images);
        Object.assign(manifest.data, part.data);
    }

    // bundles
    const bundles = {};
    const add = (b, f, bytes) => { (bundles[b] ||= { files: [], bytes: 0 }); bundles[b].files.push(f); bundles[b].bytes += bytes; };
    for (const a of Object.values(manifest.atlases)) {
        a.files.forEach((f) => add(a.bundle, `assets/${f}`, 0));
        a.images.forEach((f) => add(a.bundle, `assets/${f}`, 0));
        bundles[a.bundle].bytes += a.bytes;
    }
    for (const im of Object.values(manifest.images)) add(im.bundle, `assets/${im.file}`, im.bytes);
    for (const d of Object.values(manifest.data)) add(d.bundle, `assets/${d.file}`, fs.statSync(path.join(OUT, d.file)).size);
    manifest.bundles = bundles;
    manifest.built = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

    // files the loader prefetches: all game modules, Pixi, the css and the boot bundle
    const src = [];
    const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith('.mjs')) src.push(path.relative(path.join(ROOT, 'skoldhast'), p));
        }
    };
    walk(path.join(ROOT, 'skoldhast', 'src'));
    const files = ['vendor/pixi-8.21.0.min.mjs', ...src.sort(), 'skoldhast.css', 'assets/manifest.json', ...(bundles.boot?.files || [])];
    fs.writeFileSync(path.join(ROOT, 'skoldhast', 'files.json'), JSON.stringify({ files }, null, 1));

    // budget: JS/CSS/JSON counted gzipped (GitHub Pages compresses text), images as-is
    let total = 0;
    for (const f of files) {
        const p = path.join(ROOT, 'skoldhast', f);
        if (!fs.existsSync(p)) continue;
        const buf = fs.readFileSync(p);
        total += /\.(mjs|js|css|json)$/.test(f) ? zlib.gzipSync(buf).length : buf.length;
    }
    console.log(`first playable: ${(total / 1024 / 1024).toFixed(2)} MB (budget ${(BOOT_BUDGET / 1024 / 1024).toFixed(1)} MB)`);
    for (const [b, v] of Object.entries(bundles)) console.log(`  bundle ${b}: ${(v.bytes / 1024).toFixed(0)} KB in ${v.files.length} files`);
    if (total > BOOT_BUDGET) { console.error('first-playable budget exceeded'); process.exitCode = 1; }
}

main().catch((e) => { console.error(e); process.exit(1); });
