#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const SOURCE_PATH = path.join(projectRoot, 'goomba_sprite.png');
const OUTPUT_PATH = path.join(projectRoot, 'goomba_sprite_atlas.png');

const FRAME_WIDTH = 96;
const FRAME_HEIGHT = 104;
const FRAME_PADDING = 24;
const MIN_COMPONENT_PIXELS = 2000;
const OUTLINE_COLOR = [8, 6, 18];
const WHITE_COLOR = [247, 244, 252];

const PALETTES = [
    {
        name: 'gold',
        ramp: [
            [118, 74, 12],
            [244, 201, 58],
            [255, 244, 172]
        ]
    },
    {
        name: 'cyan',
        ramp: [
            [14, 93, 103],
            [78, 220, 255],
            [214, 253, 255]
        ]
    },
    {
        name: 'pink',
        ramp: [
            [112, 42, 116],
            [255, 117, 216],
            [255, 219, 243]
        ]
    },
    {
        name: 'green',
        ramp: [
            [52, 97, 20],
            [154, 255, 88],
            [238, 255, 197]
        ]
    }
];

function isBackground(r, g, b) {
    return g > 140 && g > r * 1.5 && g > b * 1.8;
}

function isNearWhite(r, g, b) {
    return r > 205 && g > 205 && b > 205;
}

function luminance(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function createMask(data, width, height, channels) {
    const mask = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = (y * width + x) * channels;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            mask[y * width + x] = isBackground(r, g, b) ? 0 : 1;
        }
    }

    return mask;
}

function findComponents(mask, width, height) {
    const visited = new Uint8Array(width * height);
    const components = [];
    const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const startIndex = y * width + x;
            if (!mask[startIndex] || visited[startIndex]) continue;

            let queueIndex = 0;
            const queueX = [x];
            const queueY = [y];
            visited[startIndex] = 1;

            let count = 0;
            let minX = x;
            let maxX = x;
            let minY = y;
            let maxY = y;

            while (queueIndex < queueX.length) {
                const currentX = queueX[queueIndex];
                const currentY = queueY[queueIndex];
                queueIndex += 1;
                count += 1;

                minX = Math.min(minX, currentX);
                maxX = Math.max(maxX, currentX);
                minY = Math.min(minY, currentY);
                maxY = Math.max(maxY, currentY);

                for (const [dx, dy] of directions) {
                    const nextX = currentX + dx;
                    const nextY = currentY + dy;
                    if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;

                    const nextIndex = nextY * width + nextX;
                    if (!mask[nextIndex] || visited[nextIndex]) continue;

                    visited[nextIndex] = 1;
                    queueX.push(nextX);
                    queueY.push(nextY);
                }
            }

            if (count >= MIN_COMPONENT_PIXELS) {
                components.push({
                    count,
                    minX,
                    maxX,
                    minY,
                    maxY,
                    width: maxX - minX + 1,
                    height: maxY - minY + 1
                });
            }
        }
    }

    return components;
}

function cropFrame(data, imageInfo, bounds) {
    const x0 = clamp(bounds.minX - FRAME_PADDING, 0, imageInfo.width - 1);
    const y0 = clamp(bounds.minY - FRAME_PADDING, 0, imageInfo.height - 1);
    const x1 = clamp(bounds.maxX + FRAME_PADDING, 0, imageInfo.width - 1);
    const y1 = clamp(bounds.maxY + FRAME_PADDING, 0, imageInfo.height - 1);
    const width = x1 - x0 + 1;
    const height = y1 - y0 + 1;
    const channels = imageInfo.channels;
    const buffer = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y += 1) {
        const sourceStart = ((y0 + y) * imageInfo.width + x0) * channels;
        const targetStart = y * width * channels;
        data.copy(buffer, targetStart, sourceStart, sourceStart + width * channels);
    }

    return { data: buffer, width, height, channels };
}

function cleanFrame(frame) {
    const { data, width, height, channels } = frame;
    const cleaned = Buffer.alloc(width * height * 4);
    const alphaMask = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const sourceOffset = (y * width + x) * channels;
            const targetOffset = (y * width + x) * 4;
            let r = data[sourceOffset];
            let g = data[sourceOffset + 1];
            let b = data[sourceOffset + 2];
            const keep = !isBackground(r, g, b);

            if (!keep) continue;

            if (g > r + 18 && g > b + 18) {
                g = Math.round((r + b) * 0.45 + 10);
            }

            cleaned[targetOffset] = r;
            cleaned[targetOffset + 1] = g;
            cleaned[targetOffset + 2] = b;
            cleaned[targetOffset + 3] = 255;
            alphaMask[y * width + x] = 1;
        }
    }

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = y * width + x;
            if (!alphaMask[index]) continue;

            let touchesTransparency = false;
            for (let dy = -1; dy <= 1 && !touchesTransparency; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height || !alphaMask[ny * width + nx]) {
                        touchesTransparency = true;
                        break;
                    }
                }
            }

            if (touchesTransparency) {
                cleaned[index * 4 + 3] = 228;
            }
        }
    }

    return cleaned;
}

async function normalizeFrame(frame) {
    const cleaned = cleanFrame(frame);

    const buffer = await sharp(cleaned, {
        raw: {
            width: frame.width,
            height: frame.height,
            channels: 4
        }
    })
        .resize({
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
            fit: 'contain',
            position: 'south',
            kernel: sharp.kernel.nearest,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .raw()
        .toBuffer();

    return {
        data: buffer,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT
    };
}

function recolorFrame(frame, palette) {
    const out = Buffer.alloc(frame.data.length);

    for (let offset = 0; offset < frame.data.length; offset += 4) {
        const alpha = frame.data[offset + 3];
        if (!alpha) continue;

        const r = frame.data[offset];
        const g = frame.data[offset + 1];
        const b = frame.data[offset + 2];
        const lightness = luminance(r, g, b);

        let color;
        if (lightness < 0.12) {
            color = OUTLINE_COLOR;
        } else if (isNearWhite(r, g, b)) {
            color = WHITE_COLOR;
        } else if (lightness < 0.40) {
            color = palette.ramp[0];
        } else if (lightness < 0.70) {
            color = palette.ramp[1];
        } else {
            color = palette.ramp[2];
        }

        out[offset] = color[0];
        out[offset + 1] = color[1];
        out[offset + 2] = color[2];
        out[offset + 3] = alpha;
    }

    return out;
}

function blitFrame(target, targetWidth, source, sourceWidth, sourceHeight, targetX, targetY) {
    for (let y = 0; y < sourceHeight; y += 1) {
        const sourceStart = y * sourceWidth * 4;
        const targetStart = ((targetY + y) * targetWidth + targetX) * 4;
        source.copy(target, targetStart, sourceStart, sourceStart + sourceWidth * 4);
    }
}

async function main() {
    const { data, info } = await sharp(SOURCE_PATH).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const mask = createMask(data, info.width, info.height, info.channels);
    const components = findComponents(mask, info.width, info.height)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
        .sort((a, b) => a.minX - b.minX);

    if (components.length !== 4) {
        throw new Error(`Expected 4 goomba components, found ${components.length}.`);
    }

    const normalizedFrames = [];
    for (const component of components) {
        const cropped = cropFrame(data, info, component);
        normalizedFrames.push(await normalizeFrame(cropped));
    }

    const atlasWidth = FRAME_WIDTH * normalizedFrames.length;
    const atlasHeight = FRAME_HEIGHT * PALETTES.length;
    const atlas = Buffer.alloc(atlasWidth * atlasHeight * 4);

    PALETTES.forEach((palette, row) => {
        normalizedFrames.forEach((frame, column) => {
            const recolored = recolorFrame(frame, palette);
            blitFrame(atlas, atlasWidth, recolored, FRAME_WIDTH, FRAME_HEIGHT, column * FRAME_WIDTH, row * FRAME_HEIGHT);
        });
    });

    await sharp(atlas, {
        raw: {
            width: atlasWidth,
            height: atlasHeight,
            channels: 4
        }
    }).png().toFile(OUTPUT_PATH);

    console.log(`Generated ${path.basename(OUTPUT_PATH)} from ${components.length} goomba frames.`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
