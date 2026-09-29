/* Small, camera-bounded pencil highlights. No filters, render textures or RNG. */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/**
 * Adds only surface light, so a mirror puzzle's actual reflected answer stays
 * untouched. Geometry is built once; each frame changes transforms and alpha.
 * The finite pool and shore edges clip each little mark analytically.
 */
export function createWaterLight(PIXI, water, { underwater = false } = {}) {
    const view = new PIXI.Container();
    const marks = [];
    const count = 54, cell = 145;
    for (let i = 0; i < count; i++) {
        const line = new PIXI.Graphics();
        // Broken and slightly offset strokes preserve a pencil edge at phone size.
        line.moveTo(-0.5, 0).lineTo(-0.13, -0.6).moveTo(-0.07, -0.5).lineTo(0.5, 0)
            .stroke({ width: 1.7, color: 0xffffff, alpha: 0.65 });
        line.moveTo(-0.35, 1.2).lineTo(0.34, 1.5).stroke({ width: 0.75, color: 0xffffff, alpha: 0.38 });
        view.addChild(line);
        marks.push(line);
    }
    let previousColor = -1;
    return {
        view,
        update({ time, cam, width, height, frozen = false, evening = false, lessMotion = false, ripple = 1 }) {
            const left = Math.max(water.x0, cam.x - width / cam.zoom / 2 - 120);
            const right = Math.min(water.x1, cam.x + width / cam.zoom / 2 + 120);
            const top = cam.y - height / cam.zoom / 2, bottom = cam.y + height / cam.zoom / 2;
            view.visible = right > left && bottom > water.top && top < water.top + 185;
            if (!view.visible) return;
            const color = evening ? 0xffe8ae : underwater ? 0xcce7db : 0xfffbec;
            if (color !== previousColor) { for (const mark of marks) mark.tint = color; previousColor = color; }
            const first = Math.floor(left / cell), columns = Math.min(18, Math.ceil((right - first * cell) / cell));
            const t = frozen || lessMotion ? 0 : time;
            const mirror = water.mirror ? 0.65 : 1;
            for (let i = 0; i < count; i++) {
                const col = i % 18, row = Math.floor(i / 18), mark = marks[i];
                if (col >= columns) { mark.visible = false; continue; }
                const n = first + col, seed = n * 3 + row * 517;
                const x = (n + 0.12 + hash(seed) * 0.7) * cell;
                const depth = 11 + row * 49 + hash(seed + 1) * 29;
                const length = 26 + hash(seed + 2) * (row ? 59 : 37);
                const bob = Math.sin(t * 0.65 + seed) * (frozen ? 0 : 1 + clamp(ripple, 0, 1) * 1.5);
                const half = Math.min(length / 2, x - water.x0 - 3, water.x1 - x - 3);
                mark.visible = half > 4;
                if (!mark.visible) continue;
                mark.x = x; mark.y = water.top + depth + bob;
                mark.scale.x = half * 2;
                mark.alpha = (0.13 + 0.055 * Math.sin(t * 0.7 + seed * 1.3)) * (1 - row * 0.18) * mirror;
            }
        }
    };
}
