/* Klo's small experiment: change the map first, let the matching beach answer,
 * then undo it in the same order. No terrain, save or actor state is changed. */
export const FOLD_DEMO_DURATION = 6.4;
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const between = (t, a, b) => ease((t - a) / (b - a));

/** Seconds, sampled by the view clock. Separate map/world timings make cause and
 * consequence readable even without audio, and leave a long comparison hold. */
export function sampleFoldDemo(t) {
    t = Math.max(0, Number.isFinite(t) ? t : 0);
    return {
        map: between(t, .7, 1.4) * (1 - between(t, 3.8, 4.45)),
        world: between(t, 1.65, 2.35) * (1 - between(t, 4.7, 5.4)),
        opacity: between(t, 0, .3) * (1 - between(t, 5.9, FOLD_DEMO_DURATION)),
        phase: t < .7 ? 'observe' : t < 1.65 ? 'map-fold' : t < 2.35 ? 'world-fold' : t < 3.8 ? 'compare' : t < 4.7 ? 'map-open' : t < 5.4 ? 'world-open' : 'restored',
        done: t >= FOLD_DEMO_DURATION
    };
}

/** Small textured facets, graphite hatching and matching blue pencil marks.
 * Reduced motion crossfades between the two poses, keeping the same evidence. */
export function createFoldDemo(PIXI, { texture, x, y, leftY = y, rightY = y, mapX, mapY, clawX, clawY, labels, lessMotion = false }) {
    const container = new PIXI.Container();
    container.label = 'fold-demo';
    const ink = 0x625b50, blue = 0x457d98, paper = 0xf7eed8;
    const shadow = new PIXI.Graphics();
    const link = new PIXI.Graphics();
    const dune = [new PIXI.Graphics(), new PIXI.Graphics()];
    const map = [new PIXI.Graphics(), new PIXI.Graphics()];
    const hand = [new PIXI.Graphics(), new PIXI.Graphics()];
    const origin = new PIXI.Graphics();
    container.addChild(shadow, link, ...dune, ...map, origin, ...hand);
    const W = 220, MW = 174, MH = 132;
    for (const g of hand) {
        g.scale.set(.24);
        g.position.set(clawX - (mapX + MW / 2) * .24, clawY - (mapY + MH / 2) * .24);
    }
    const label = (text, px, py) => {
        const s = new PIXI.Text({ text, style: { fontFamily: '"Patrick Hand", cursive', fontSize: 27, fill: ink } });
        s.anchor.set(.5, 1); s.position.set(px, py); container.addChild(s); return s;
    };
    const captions = [label(labels.map, mapX + MW / 2, mapY - 7), label(labels.world, x, Math.min(leftY, rightY) - 136)];
    const drawPoly = (g, pts, mat, color) => {
        g.poly(pts.flat());
        const t = texture(mat);
        g.fill(t ? { texture: t, textureSpace: 'global' } : { color });
    };
    const line = (g, pts, color = ink, alpha = .7, width = 2.3) => {
        g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]);
        g.stroke({ color, alpha, width, cap: 'round', join: 'round' });
    };
    const marks = (g, px, py, scale = 1) => {
        for (let i = -1; i <= 1; i++) line(g, [[px + i * 11 * scale - 4 * scale, py + 2 * scale], [px + i * 11 * scale, py - 4 * scale], [px + i * 11 * scale + 4 * scale, py + 2 * scale]], blue, .85, 2 * scale);
    };
    function drawDune(g, amount) {
        g.clear();
        const a = [x - W / 2, leftY], b = [x + W / 2, rightY];
        const tip = [x - 10 * amount, y - 102 * amount];
        const lower = [tip[0] + 18 * amount, tip[1] + 20 * amount + 3];
        drawPoly(g, [a, tip, b, [b[0], b[1] + 8], [a[0], a[1] + 8]], 'mat-sand', 0xe8cc8e);
        if (amount > .002) {
            drawPoly(g, [a, tip, lower], 'mat-paper', paper);
            g.poly([tip[0], tip[1], b[0], b[1], lower[0], lower[1]]).fill({ color: 0xa98758, alpha: .14 });
            for (let i = 1; i <= 9; i++) {
                const q = i / 11, px = tip[0] + (b[0] - tip[0]) * q, py = tip[1] + (b[1] - tip[1]) * q;
                line(g, [[px, py + 3], [px - 8 * amount, py + 9 * amount]], ink, .2, 1.5);
            }
        }
        line(g, [a, tip, b], ink, .64, 2.8);
        line(g, [[a[0] + 2, a[1] - 1], [tip[0], tip[1] - 2], [b[0] - 3, b[1] - 1]], 0xfff8d8, .58, 1.8);
        marks(g, tip[0], tip[1] - 10);
    }
    function drawMap(g, amount) {
        g.clear();
        const px = mapX, py = mapY;
        const corners = [[px, py + 3], [px + MW, py], [px + MW - 3, py + MH - 10], [px + MW - 18, py + MH - 6], [px + MW - 24, py + MH], [px + 4, py + MH - 2]];
        drawPoly(g, corners, 'mat-paper', paper);
        line(g, [...corners, corners[0]], ink, .56, 2.2);
        for (let i = 0; i < 5; i++) line(g, [[px + 13, py + 13 + i * 7], [px + 43, py + 12 + i * 7], [px + 85, py + 15 + i * 7], [px + MW - 12, py + 12 + i * 7]], blue, .24, 1.6);
        line(g, [[px + 8, py + 53], [px + 50, py + 48], [px + 93, py + 55], [px + MW - 8, py + 50]], blue, .65, 2.5);
        const a = [px + 13, py + 104], b = [px + MW - 13, py + 104], tip = [px + MW * .46, py + 102 - 49 * amount];
        drawPoly(g, [a, tip, b, [b[0], py + 119], [a[0], py + 119]], 'mat-sand', 0xe8cc8e);
        if (amount > .002) {
            drawPoly(g, [a, tip, [tip[0] + 13 * amount, tip[1] + 13 * amount]], 'mat-paper', paper);
            line(g, [[tip[0], tip[1]], [tip[0] + 13 * amount, tip[1] + 13 * amount], b], ink, .23, 1.6);
        }
        line(g, [a, tip, b], ink, .7, 2.2);
        marks(g, tip[0], tip[1] - 7, .7);
    }
    // A magnified corner belongs to the physical sheet in Klo's claw. The leader
    // ends there, rather than presenting an unexplained second floating map.
    line(origin, [[clawX, clawY], [mapX + MW * .5, mapY + MH + 5]], ink, .35, 1.8);
    origin.circle(clawX, clawY, 8).stroke({ color: ink, alpha: .45, width: 1.8 });
    for (let i = 0; i < 4; i++) shadow.ellipse(x + 9, y + 9, W * .53 + i * 3, 8 + i * 3).fill({ color: 0x5f513d, alpha: .027 });
    drawDune(dune[0], 0); drawDune(dune[1], 1);
    for (const pair of [map, hand]) { drawMap(pair[0], 0); drawMap(pair[1], 1); }
    function update(t) {
        const state = sampleFoldDemo(t);
        container.alpha = state.opacity;
        shadow.alpha = state.world;
        if (lessMotion) {
            dune[0].alpha = 1 - state.world; dune[1].alpha = state.world;
            for (const pair of [map, hand]) { pair[0].alpha = 1 - state.map; pair[1].alpha = state.map; }
        } else {
            dune[1].visible = false;
            drawDune(dune[0], state.world);
            for (const pair of [map, hand]) { pair[1].visible = false; drawMap(pair[0], state.map); }
        }
        // The pencil trail only appears after the map has changed, in the
        // direction of its matching patch, then fades before both flatten.
        link.clear();
        const showLink = between(t, 1.3, 1.6) * (1 - between(t, 3.4, 3.8));
        link.visible = showLink > .001;
        if (showLink > .001) {
            const ax = mapX + 4, ay = mapY + MH * .58, bx = x + 17, by = y - 122;
            for (let i = 0; i < 9; i++) {
                const q = i / 9, r = (i + .55) / 9;
                line(link, [[ax + (bx - ax) * q, ay + (by - ay) * q], [ax + (bx - ax) * r, ay + (by - ay) * r]], blue, .5 * showLink, 2.2);
            }
        }
        return state;
    }
    update(0);
    return {
        container, update,
        bounds: { x0: x - W * .7, x1: mapX + MW + 22, y0: mapY - 59, y1: y + 32 },
        fit(zoom) {
            const size = Math.max(27, 16 / Math.max(.1, zoom));
            for (const c of captions) if (Math.abs(c.style.fontSize - size) > .1) c.style.fontSize = size;
        },
        destroy() { container.parent?.removeChild(container); if (!container.destroyed) container.destroy({ children: true }); }
    };
}
