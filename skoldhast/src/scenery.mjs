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
            const mirror = water.mirror ? 0.7 : 1;
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
                mark.alpha = (0.22 + (lessMotion || frozen ? 0 : 0.065 * Math.sin(t * 0.7 + seed * 1.3))) * (1 - row * 0.18) * mirror;
            }
        }
    };
}

/** A finite field of pencil dust and underwater daylight. All geometry is
 * constructed once and stays behind the actors. Camera bounds, not world
 * length, determine the work. The waterline clips the shafts analytically. */
export function createAtmosphere(PIXI, { scene = 'land' } = {}) {
    const view = new PIXI.Container(); view.label = 'pencil-atmosphere';
    const rays = [], marks = [];
    for (let i = 0; i < 6; i++) {
        const ray = new PIXI.Graphics();
        ray.poly([-24, 0, 24, 0, 244, 1000, 76, 1000]).fill({ color: 0xfffce5, alpha: .035 });
        for (let j = 0; j < 7; j++) {
            const x = -21 + j * 7, y = 80 + (j % 3) * 46;
            ray.moveTo(x + y * .15, y).lineTo(x + 54 + j * 5, 480)
                .moveTo(x + 74 + j * 6, 610).lineTo(x + 128 + j * 12, 1000)
                .stroke({ width: 2 + j % 2, color: 0xfffbea, alpha: .08 + j % 3 * .012 });
        }
        view.addChild(ray); rays.push(ray);
    }
    for (let i = 0; i < 24; i++) {
        const mark = new PIXI.Graphics();
        mark.moveTo(-2.5, 1.5).lineTo(1, -1.5).moveTo(-1, 3).lineTo(3, -.3)
            .stroke({ width: 1.4, color: 0xffffff, alpha: .6 });
        view.addChild(mark); marks.push(mark);
    }
    const state = { count: marks.length, rays: rays.length, region: scene, reducedMotion: false };
    view.atmosphere = state;
    return {
        view,
        update({ cam, width, height, time, lessMotion = false, evening = false, waterTop = 0 }) {
            const underwater = scene === 'kelp' || scene === 'viken' && cam.y > waterTop - 250;
            const steppe = scene === 'land' && cam.x > 2000 && cam.x < 15700;
            view.visible = underwater || steppe;
            if (!view.visible) return;
            state.reducedMotion = lessMotion;
            const left = cam.x - width / cam.zoom / 2, top = cam.y - height / cam.zoom / 2;
            const right = cam.x + width / cam.zoom / 2, bottom = cam.y + height / cam.zoom / 2;
            const t = lessMotion ? 0 : time;
            const firstRay = Math.floor(left / 620) - 1;
            for (let i = 0; i < rays.length; i++) {
                const ray = rays[i];
                ray.visible = underwater && !evening && bottom > waterTop && i < Math.ceil((right - left) / 620) + 2;
                if (!ray.visible) continue;
                const cell = firstRay + i;
                ray.x = cell * 620 + hash(cell + 83) * 210;
                ray.y = waterTop;
                ray.scale.y = Math.max(.2, (bottom - waterTop + 220) / 1000);
                ray.alpha = (scene === 'kelp' ? 1 : .5) * clamp(1 - Math.max(0, cam.y - waterTop) / 7500, .3, 1);
            }
            const columns = Math.min(6, Math.max(2, Math.ceil((right - left) / 300)));
            const rows = Math.ceil(marks.length / columns), cellH = (bottom - top + 180) / rows;
            const driftX = steppe ? t * 13 : Math.sin(t * .17) * 11, driftY = underwater ? t * 7 : -t * 1.5;
            const firstX = Math.floor((left - driftX) / 300), firstY = Math.floor((top + driftY) / cellH);
            for (let i = 0; i < marks.length; i++) {
                const mark = marks[i], col = firstX + i % columns, row = firstY + Math.floor(i / columns);
                const seed = col * 157 + row * 31;
                mark.x = (col + .1 + hash(seed) * .8) * 300 + driftX;
                mark.y = (row + .14 + hash(seed + 1) * .7) * cellH - driftY;
                mark.visible = mark.x > left - 20 && mark.x < right + 20 && mark.y > top - 20 && mark.y < bottom + 20 && (!underwater || mark.y > waterTop + 14);
                mark.tint = evening ? 0xffeabd : underwater ? 0xe1f0df : 0xe1ddbf;
                mark.alpha = underwater ? .34 : .5;
                mark.scale.set(underwater ? .7 + hash(seed + 2) * .6 : 1.2, underwater ? 1 : .6);
            }
        }
    };
}
