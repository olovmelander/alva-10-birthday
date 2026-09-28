#!/usr/bin/env node
/*
 * Builds the sprite sheets for "Miras Stjärnsafari".
 *
 *   npm run build:mira-sprites
 *       draws every sprite module in scripts/mira-art/, packs the frames into
 *       PNG sheets in mira/sprites/ and writes mira/sprites/atlas.js
 *
 *   node scripts/build-mira-sprites.mjs --preview characters --out preview.png [--scale 4]
 *       renders one module as a labelled contact sheet for reviewing art
 *
 *   node scripts/build-mira-sprites.mjs --only characters,gondola
 *       builds just those modules (handy while other modules are unfinished)
 *
 * A sprite module exports an array of sprite definitions:
 *   {
 *     name: 'mira-a',            // looked up by the game
 *     sheet: 'characters',       // which PNG it is packed into
 *     w: 20, h: 34,              // frame size (per animation override allowed)
 *     anchor: [10, 33],          // pivot, usually bottom centre (feet)
 *     outline: 'auto',           // or a colour, or false
 *     anims: {
 *       idle: [(s) => {...}, (s) => {...}],       // one painter per frame
 *       big:  { w, h, anchor, frames: [...] }     // per-animation overrides
 *     }
 *   }
 * A painter receives a Sprite (see kit.mjs) and may set named points with
 * s.point('hand', x, y); they end up in the atlas next to the frame.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { Sprite } from './mira-art/kit.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ART_DIR = path.join(__dirname, 'mira-art');
const OUT_DIR = path.join(__dirname, '..', 'mira', 'sprites');
const SHEET_WIDTH = 512;
const PAD = 1;

function parseArgs(argv) {
    const args = { preview: null, out: null, scale: 4, modules: null };
    for (let i = 2; i < argv.length; i += 1) {
        const a = argv[i];
        if (a === '--preview') args.preview = argv[++i];
        else if (a === '--out') args.out = argv[++i];
        else if (a === '--scale') args.scale = Number(argv[++i]);
        else if (a === '--only') args.modules = argv[++i].split(',');
    }
    return args;
}

async function loadModule(name) {
    const file = path.join(ART_DIR, `${name}.mjs`);
    const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
    const defs = mod.default;
    if (!Array.isArray(defs)) throw new Error(`${name}.mjs must export an array of sprite definitions`);
    return defs;
}

function moduleNames() {
    return fs.readdirSync(ART_DIR)
        .filter((f) => f.endsWith('.mjs') && f !== 'kit.mjs' && !f.startsWith('_'))
        .map((f) => f.replace(/\.mjs$/, ''))
        .sort();
}

/** Paint every frame of a definition. Returns [{ sprite, anim, index, frame }]. */
function renderDef(def) {
    const out = [];
    for (const [anim, spec] of Object.entries(def.anims)) {
        const frames = Array.isArray(spec) ? spec : spec.frames;
        const w = (!Array.isArray(spec) && spec.w) || def.w;
        const h = (!Array.isArray(spec) && spec.h) || def.h;
        const anchor = (!Array.isArray(spec) && spec.anchor) || def.anchor || [Math.floor(w / 2), h - 1];
        const outline = (!Array.isArray(spec) && spec.outline !== undefined) ? spec.outline : (def.outline ?? 'auto');
        frames.forEach((paint, index) => {
            const s = new Sprite(w, h);
            paint(s, index);
            if (outline) s.outline(outline, def.outlineOptions || {});
            out.push({ def, anim, index, sprite: s, anchor, bounds: s.bounds() });
        });
    }
    return out;
}

/** Shelf packing, tallest first. */
function pack(frames, width) {
    const order = frames.map((f, i) => i).sort((a, b) => frames[b].sprite.h - frames[a].sprite.h || frames[b].sprite.w - frames[a].sprite.w);
    let x = PAD;
    let y = PAD;
    let shelf = 0;
    const places = new Array(frames.length);
    for (const i of order) {
        const { w, h } = frames[i].sprite;
        if (x + w + PAD > width) {
            x = PAD;
            y += shelf + PAD;
            shelf = 0;
        }
        places[i] = { x, y };
        x += w + PAD;
        shelf = Math.max(shelf, h);
    }
    return { places, height: y + shelf + PAD };
}

function blit(ctx, sprite, x, y) {
    const img = ctx.createImageData(sprite.w, sprite.h);
    img.data.set(sprite.data);
    ctx.putImageData(img, x, y);
}

async function build(only) {
    const names = only || moduleNames();
    const sheets = new Map();   // sheet name -> frames[]
    const seen = new Set();
    for (const name of names) {
        const defs = await loadModule(name);
        for (const def of defs) {
            if (seen.has(def.name)) throw new Error(`Duplicate sprite name ${def.name} (${name}.mjs)`);
            seen.add(def.name);
            const frames = renderDef(def);
            const sheet = def.sheet || name;
            if (!sheets.has(sheet)) sheets.set(sheet, []);
            sheets.get(sheet).push(...frames);
        }
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    // Old sheets that are no longer produced would linger: clear our PNGs first.
    for (const f of fs.readdirSync(OUT_DIR)) {
        if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT_DIR, f));
    }
    const atlas = { sheets: [], sprites: {} };
    let totalFrames = 0;
    for (const [sheetName, frames] of [...sheets.entries()].sort()) {
        const { places, height } = pack(frames, SHEET_WIDTH);
        const canvas = createCanvas(SHEET_WIDTH, height);
        const ctx = canvas.getContext('2d');
        const sheetIndex = atlas.sheets.length;
        const file = `${sheetName}.png`;
        atlas.sheets.push(file);
        frames.forEach((f, i) => {
            const { x, y } = places[i];
            blit(ctx, f.sprite, x, y);
            const b = f.bounds || { x: 0, y: 0, w: 0, h: 0 };
            // [sheet, x, y, w, h, anchorX, anchorY, boundsX, boundsY, boundsW, boundsH, points?]
            const entry = [sheetIndex, x, y, f.sprite.w, f.sprite.h, f.anchor[0], f.anchor[1], b.x, b.y, b.w, b.h];
            if (Object.keys(f.sprite.points).length) entry.push(f.sprite.points);
            const spr = (atlas.sprites[f.def.name] ||= {});
            (spr[f.anim] ||= [])[f.index] = entry;
            totalFrames += 1;
        });
        fs.writeFileSync(path.join(OUT_DIR, file), canvas.toBuffer('image/png'));
        console.log(`  ${file}  ${SHEET_WIDTH}×${height}  ${frames.length} frames`);
    }
    const js = `/* Generated by scripts/build-mira-sprites.mjs – do not edit by hand. */\n` +
        `window.MIRA_ATLAS = ${JSON.stringify(atlas)};\n`;
    fs.writeFileSync(path.join(OUT_DIR, 'atlas.js'), js);
    console.log(`atlas.js: ${Object.keys(atlas.sprites).length} sprites, ${totalFrames} frames`);
}

async function preview(moduleName, outFile, scale) {
    const defs = await loadModule(moduleName);
    const frames = defs.flatMap(renderDef);
    const cellPad = 6;
    const label = 12;
    const maxW = 1600;
    // layout rows of frames, grouped by sprite+anim
    let x = cellPad;
    let y = cellPad;
    let rowH = 0;
    const cells = [];
    let lastKey = null;
    for (const f of frames) {
        const key = `${f.def.name}/${f.anim}`;
        const w = f.sprite.w * scale;
        const h = f.sprite.h * scale + label;
        if (x + w + cellPad > maxW || (lastKey && key.split('/')[0] !== lastKey.split('/')[0])) {
            x = cellPad;
            y += rowH + cellPad;
            rowH = 0;
        }
        cells.push({ f, x, y, key });
        x += w + cellPad;
        rowH = Math.max(rowH, h);
        lastKey = key;
    }
    const canvas = createCanvas(maxW, y + rowH + cellPad);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3a3550';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    for (const { f, x: cx, y: cy } of cells) {
        // checkerboard behind each frame so transparency is visible
        for (let j = 0; j < f.sprite.h; j += 1) {
            for (let i = 0; i < f.sprite.w; i += 1) {
                ctx.fillStyle = (i + j) % 2 ? '#8a86a3' : '#9d99b5';
                ctx.fillRect(cx + i * scale, cy + label + j * scale, scale, scale);
            }
        }
        for (let j = 0; j < f.sprite.h; j += 1) {
            for (let i = 0; i < f.sprite.w; i += 1) {
                const [r, g, b, a] = f.sprite.get(i, j);
                if (!a) continue;
                ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
                ctx.fillRect(cx + i * scale, cy + label + j * scale, scale, scale);
            }
        }
        ctx.fillStyle = '#ffe9a8';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${f.def.name}.${f.anim}${f.index}`, cx, cy + 9);
    }
    fs.writeFileSync(outFile, canvas.toBuffer('image/png'));
    console.log(`preview ${moduleName}: ${frames.length} frames -> ${outFile}`);
}

const args = parseArgs(process.argv);
if (args.preview) {
    await preview(args.preview, args.out || `${args.preview}-preview.png`, args.scale);
} else {
    await build(args.modules);
}
