/*
 * Atlas packing and export for Sköldhästen's code-drawn art.
 *
 * Frames are packed with a skyline packer into sheets of at most 2048×2048,
 * written as WebP plus a PixiJS spritesheet JSON. `meta.scale` is the texture
 * density (texture pixels per world unit), so a sprite made from a frame is
 * automatically sized in world units in the game.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const MAX = 2048;
const PAD = 3;

/** Pack frames ({name, canvas, anchor}) into one or more sheets. */
export function pack(frames, maxSize = MAX) {
    const items = frames.map((f) => ({ ...f, w: f.canvas.width, h: f.canvas.height }))
        .sort((a, b) => b.h - a.h || b.w - a.w);
    const sheets = [];
    let remaining = items;
    while (remaining.length) {
        const placed = [];
        const rest = [];
        // try a few sheet widths and keep the smallest area that fits most frames
        let width = 256;
        const totalArea = remaining.reduce((s, f) => s + (f.w + PAD) * (f.h + PAD), 0);
        while (width < maxSize && width * width < totalArea * 1.15) width *= 2;
        width = Math.min(maxSize, Math.max(width, ...remaining.map((f) => Math.min(maxSize, nextPow2(f.w + PAD * 2)))));
        const skyline = [{ x: 0, y: 0, w: width }];
        let height = 0;
        for (const f of remaining) {
            if (f.w + PAD * 2 > maxSize || f.h + PAD * 2 > maxSize) throw new Error(`frame ${f.name} too big (${f.w}×${f.h})`);
            const pos = findPosition(skyline, f.w + PAD * 2, f.h + PAD * 2, width);
            if (!pos || pos.y + f.h + PAD * 2 > maxSize) { rest.push(f); continue; }
            addSkyline(skyline, pos.index, pos.x, pos.y, f.w + PAD * 2, f.h + PAD * 2);
            placed.push({ ...f, x: pos.x + PAD, y: pos.y + PAD });
            height = Math.max(height, pos.y + f.h + PAD * 2);
        }
        if (!placed.length) throw new Error('could not place any frame');
        sheets.push({ width, height: nextPow2Ceil(height), frames: placed });
        remaining = rest;
    }
    return sheets;
}

function nextPow2(v) { let p = 1; while (p < v) p *= 2; return p; }
function nextPow2Ceil(v) { return Math.min(MAX, Math.max(64, Math.ceil(v / 16) * 16)); }

function findPosition(skyline, w, h, width) {
    let best = null;
    for (let i = 0; i < skyline.length; i++) {
        const x = skyline[i].x;
        if (x + w > width) break;
        let y = 0, remain = w, j = i;
        while (remain > 0 && j < skyline.length) {
            y = Math.max(y, skyline[j].y);
            remain -= skyline[j].w;
            j++;
        }
        if (remain > 0) continue;
        if (!best || y + h < best.y + best.h || (y + h === best.y + best.h && x < best.x)) best = { x, y, h, index: i };
    }
    return best;
}

function addSkyline(skyline, index, x, y, w, h) {
    const node = { x, y: y + h, w };
    skyline.splice(index, 0, node);
    for (let i = index + 1; i < skyline.length; i++) {
        const prev = skyline[i - 1], cur = skyline[i];
        if (cur.x < prev.x + prev.w) {
            const shrink = prev.x + prev.w - cur.x;
            cur.x += shrink; cur.w -= shrink;
            if (cur.w <= 0) { skyline.splice(i, 1); i--; } else break;
        } else break;
    }
    for (let i = 0; i < skyline.length - 1; i++) {
        if (skyline[i].y === skyline[i + 1].y) {
            skyline[i].w += skyline[i + 1].w;
            skyline.splice(i + 1, 1); i--;
        }
    }
}

/** Compose a packed sheet into one RGBA buffer. */
async function composeSheet(sheet) {
    const { createCanvas } = await import('@napi-rs/canvas');
    const cv = createCanvas(sheet.width, sheet.height);
    const ctx = cv.getContext('2d');
    for (const f of sheet.frames) {
        // extrude the edge pixels by 1 so bilinear filtering never picks up neighbours
        ctx.drawImage(f.canvas, f.x, f.y);
    }
    return cv;
}

export async function encodeWebp(canvas, { quality = 82, alphaQuality = 90, lossless = false } = {}) {
    const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    return sharp(Buffer.from(img.data.buffer), { raw: { width: canvas.width, height: canvas.height, channels: 4 } })
        .webp({ quality, alphaQuality, lossless, effort: 5, smartSubsample: true })
        .toBuffer();
}

/**
 * Write an atlas: frames → name-0.webp/.json (+ name-1 …). Returns the list of files written.
 * @param {string} outDir
 * @param {string} name
 * @param {Array} frames  [{name, canvas, anchor:[ax,ay], data?}]
 * @param {number} scale  texture pixels per world unit
 */
export async function writeAtlas(outDir, name, frames, scale = 1, { quality = 82 } = {}) {
    const sheets = pack(frames);
    const files = [];
    for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        const base = sheets.length > 1 ? `${name}-${i}` : name;
        const cv = await composeSheet(sheet);
        const webp = await encodeWebp(cv, { quality });
        fs.writeFileSync(path.join(outDir, `${base}.webp`), webp);
        const json = {
            frames: {},
            meta: { app: 'skoldhast-art', image: `${base}.webp`, format: 'RGBA8888', size: { w: sheet.width, h: sheet.height }, scale: String(scale) }
        };
        for (const f of sheet.frames) {
            json.frames[f.name] = {
                frame: { x: f.x, y: f.y, w: f.w, h: f.h },
                rotated: false, trimmed: false,
                spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
                sourceSize: { w: f.w, h: f.h },
                anchor: { x: f.anchor ? f.anchor[0] : 0.5, y: f.anchor ? f.anchor[1] : 0.5 }
            };
        }
        fs.writeFileSync(path.join(outDir, `${base}.json`), JSON.stringify(json));
        files.push({ json: `${base}.json`, image: `${base}.webp`, bytes: webp.length, w: sheet.width, h: sheet.height, count: sheet.frames.length });
    }
    return files;
}

/** Write a single image (materials, backdrops). */
export async function writeImage(outDir, name, canvas, { quality = 80 } = {}) {
    const webp = await encodeWebp(canvas, { quality });
    fs.writeFileSync(path.join(outDir, `${name}.webp`), webp);
    return { image: `${name}.webp`, bytes: webp.length, w: canvas.width, h: canvas.height };
}
