/*
 * The stuck wave's shape, shared by the game (stuck-wave.mjs) and the art
 * build (scripts/skoldhast-art/props.mjs, 'frozen-runup'), so the drawn run-up
 * and the live one are the same water. World units, y down. Pure: no PIXI.
 */
import { heightOn } from './sim.mjs';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// The frozen-splash sprite (232x192, anchored at its bottom centre) and the
// control points of its water's top (props.mjs 'frozen-splash' base curve).
export const SPRITE_W = 232, SPRITE_H = 192;
export const SPLASH_BASE = [[10, 150], [20, 128], [36, 112], [58, 104], [82, 104], [106, 110], [132, 118], [160, 124], [190, 128], [214, 131]];
const BODY_TOP = [[58, 104], [82, 104], [106, 110], [132, 118], [160, 124], [190, 128], [214, 131], [232, 133]];

/** The highest non-thin surface at x, from a scene's surfaces. */
export function surfaceGround(surfaces) {
    const solid = surfaces.filter(s => !s.thin);
    return (x) => {
        let best = null;
        for (const s of solid) { const y = heightOn(s.pts, x); if (y !== null && (best === null || y < best)) best = y; }
        return best;
    };
}

/**
 * The run-up from the splash at (x, y) down the sand to where the ground meets
 * the sea level. `frame` is the world rectangle the drawn run-up covers.
 */
export function runupShape({ ground, x, y, seaTop = 0 }) {
    const at = (sx, sy) => [x - SPRITE_W / 2 + sx, y - SPRITE_H + sy];
    let shoreX = x + SPRITE_W / 2 + 40;
    for (let sx = x; sx < x + 1600; sx += 4) {
        const g = ground(sx);
        if (g !== null && g >= seaTop) { shoreX = sx; break; }
    }
    for (let i = 0, lo = shoreX - 4, hi = shoreX; i < 12; i++) {
        const mid = (lo + hi) / 2, g = ground(mid);
        if (g !== null && g >= seaTop) hi = mid; else lo = mid;
        shoreX = hi;
    }
    const groundAt = (gx) => Math.min(ground(gx) ?? seaTop, seaTop);
    // Under the sprite the crest IS the sprite's water top; past it, a cubic
    // descends with the sand's slope to the shore.
    const bodyTop = BODY_TOP.map(([sx, sy]) => at(sx, sy));
    const [ex, ey] = bodyTop.at(-1);
    const shoreSlope = (groundAt(shoreX) - groundAt(shoreX - 40)) / 40;
    const m0 = (bodyTop.at(-1)[1] - bodyTop.at(-2)[1]) / (bodyTop.at(-1)[0] - bodyTop.at(-2)[0]);
    const span = Math.max(40, shoreX - ex);
    const crestAt = (cx) => {
        if (cx <= ex) {
            for (let i = 1; i < bodyTop.length; i++) {
                const [ax, ay] = bodyTop[i - 1], [bx, by] = bodyTop[i];
                if (cx <= bx) return ay + (by - ay) * clamp((cx - ax) / (bx - ax), 0, 1);
            }
            return bodyTop[0][1];
        }
        const t = clamp((cx - ex) / span, 0, 1), t2 = t * t, t3 = t2 * t;
        const h = (2 * t3 - 3 * t2 + 1) * ey + (t3 - 2 * t2 + t) * m0 * span
            + (-2 * t3 + 3 * t2) * seaTop + (t3 - t2) * shoreSlope * .5 * span;
        return Math.min(h, groundAt(cx) - (1 - t) * 3);
    };
    const x0 = Math.floor(x - SPRITE_W / 2 + 8);
    const top = Math.floor(y - SPRITE_H + 104 - 12);
    const frame = { x: x0, y: top, w: Math.ceil(shoreX + 10 - x0), h: Math.ceil(seaTop + 10 - top) };
    return { shoreX, ex, ey, span, x0, crestAt, groundAt, frame, at };
}
