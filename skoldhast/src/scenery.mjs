/* Small, camera-bounded pencil highlights. No filters, render textures or RNG. */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** Screen y for a backdrop whose painted sea row `seaRow` (0…1 of its height)
 * should sit at world height `seaY`, never uncovering the top of the screen. */
export function seaAnchorY({ H, th, sc, seaY, seaRow, camY, zoom }) {
    return Math.min(0, H / 2 + (seaY - camY) * zoom - seaRow * th * sc);
}
const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/**
 * Adds only surface light, so a mirror puzzle's actual reflected answer stays
 * untouched. Geometry is built once; each frame changes transforms and alpha.
 * The finite pool and shore edges clip each little mark analytically.
 */
export function createWaterLight(PIXI, water, { underwater = false } = {}) {
    const view = new PIXI.Container();
    const marks = [];
    const count = 36, cell = 185;
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
                const depth = 13 + row * 61 + hash(seed + 1) * 27;
                const length = 22 + hash(seed + 2) * (row ? 45 : 32);
                const bob = Math.sin(t * 0.65 + seed) * (frozen ? 0 : 1 + clamp(ripple, 0, 1) * 1.5);
                const half = Math.min(length / 2, x - water.x0 - 3, water.x1 - x - 3);
                mark.visible = half > 4;
                if (!mark.visible) continue;
                mark.x = x; mark.y = water.top + depth + bob;
                mark.scale.x = half * 2;
                mark.alpha = (0.17 + (lessMotion || frozen ? 0 : 0.04 * Math.sin(t * 0.7 + seed * 1.3))) * (1 - row * 0.28) * mirror;
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
    for (let i = 0; i < 4; i++) {
        const ray = new PIXI.Graphics();
        // Sparse broken hatching over a little reserved paper. The shafts have
        // real world depth; moving the camera cannot stretch them to the floor.
        // A soft wedge of light with only a few short, faint strokes inside it:
        // long thin parallel lines read as rain falling through the water.
        ray.poly([-18, 0, 18, 0, 180, 1000, 104, 1000]).fill({ color: 0xe9f0d5, alpha: .034 });
        ray.poly([-8, 0, 8, 0, 150, 1000, 128, 1000]).fill({ color: 0xf4f4d9, alpha: .028 });
        for (let j = 0; j < 3; j++) {
            const x = -10 + j * 10;
            for (let part = 0; part < 3; part++) {
                const y = 60 + part * 300 + j % 3 * 41, end = y + 70 - part * 10;
                ray.moveTo(x + y * .14, y).lineTo(x + end * .14 + j * 2, end)
                    .stroke({ width: 3 + j % 2, color: 0xf4f4d9, alpha: (.06 - part * .015) });
            }
        }
        view.addChild(ray); rays.push(ray);
    }
    for (let i = 0; i < 24; i++) {
        // A speck of sunlit pollen (or drifting plankton): reserved paper with
        // a faint halo and one short pencil mark, never a star or a glint,
        // which belong to the colouring pencils that can be picked up.
        const mark = new PIXI.Graphics();
        mark.circle(0, 0, 4.2).fill({ color: 0xffffff, alpha: .16 });
        mark.circle(0, 0, 1.7).fill({ color: 0xffffff, alpha: .85 });
        mark.moveTo(-2.5, 1.5).lineTo(1, -1.5).stroke({ width: 1.1, color: 0xffffff, alpha: .45 });
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
            const rayCell = 850, firstRay = Math.floor((left - 260) / rayCell);
            for (let i = 0; i < rays.length; i++) {
                const ray = rays[i], cell = firstRay + i;
                const depth = 1450 + hash(cell + 21) * 750;
                ray.visible = underwater && !evening && bottom > waterTop && top < waterTop + depth
                    && cell * rayCell < right + 60;
                if (!ray.visible) continue;
                ray.x = cell * rayCell + hash(cell + 83) * 145;
                // The land entrance is a roofed coastal tunnel. Open-water
                // daylight starts seaward of that ceiling, at seven horse lengths.
                if (scene === 'kelp' && ray.x < 1400) { ray.visible = false; continue; }
                ray.y = waterTop;
                ray.scale.y = depth / 1000;
                ray.alpha = scene === 'kelp' ? 1 : .45;
            }
            const cellW = underwater ? 620 : 300;
            const columns = Math.min(6, Math.max(2, Math.ceil((right - left) / cellW)));
            const cellH = underwater ? 580 : (bottom - top + 180) / Math.ceil(marks.length / columns);
            const driftX = steppe ? t * 13 : Math.sin(t * .17) * 9, driftY = underwater ? t * 4 : -t * 1.5;
            const firstX = Math.floor((left - driftX) / cellW), firstY = Math.floor((top + driftY) / cellH);
            for (let i = 0; i < marks.length; i++) {
                const mark = marks[i], col = firstX + i % columns, row = firstY + Math.floor(i / columns);
                const seed = col * 157 + row * 31;
                mark.x = (col + .1 + hash(seed) * .8) * cellW + driftX;
                mark.y = (row + .14 + hash(seed + 1) * .7) * cellH - driftY;
                mark.visible = mark.x > left - 20 && mark.x < right + 20 && mark.y > top - 20 && mark.y < bottom + 20 && (!underwater || mark.y > waterTop + 14);
                mark.tint = evening ? 0xffeabd : underwater ? 0xe6f4e2 : 0xfff3cf;
                // a slow twinkle as each speck turns in the light (still with reduced motion)
                const twinkle = .62 + .38 * Math.sin(t * (.7 + hash(seed + 3) * .8) + seed);
                mark.alpha = (underwater ? .3 : .62) * twinkle;
                mark.scale.set(underwater ? .7 + hash(seed + 2) * .6 : .8 + hash(seed + 2) * .5);
            }
        }
    };
}
