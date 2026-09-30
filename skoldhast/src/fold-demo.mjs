/* Klo's small experiment: change the map first, let the matching beach answer,
 * then undo it in the same order. No terrain, save or actor state is changed.
 * The map card is the real corner piece: cut from the one map drawing (map-page)
 * along the same torn edges as in the journal (map-layout.mjs), and the dune he
 * folds is the dune drawn on its beach. */
import { MAP_FRAGMENTS, MAP_SCALE, MAP_DUNE, MAP_COAST, MAP_WATERLINE, fragmentPoints } from './map-layout.mjs';

export const FOLD_DEMO_DURATION = 6.4;
const CORNER = MAP_FRAGMENTS.find(f => f.id === 'corner');
const CORNER_PTS = fragmentPoints(CORNER);
const CX0 = Math.min(...CORNER_PTS.map(p => p[0])), CY0 = Math.min(...CORNER_PTS.map(p => p[1]));
const CW = Math.max(...CORNER_PTS.map(p => p[0])) - CX0, CH = Math.max(...CORNER_PTS.map(p => p[1])) - CY0;
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
    const W = 220, MW = 174, SC = MW / CW, MH = CH * SC;
    // the corner piece as a card: paper, the map drawing clipped to its torn edge, the seam
    const art = texture('map-page');
    function card() {
        const c = new PIXI.Container(), pts = CORNER_PTS.flatMap(([px, py]) => [mapX + (px - CX0) * SC, mapY + (py - CY0) * SC]);
        const back = new PIXI.Graphics();
        back.poly(pts.map((v, i) => v + (i % 2 ? 3 : 2))).fill({ color: 0x5f513d, alpha: .16 });
        back.poly(pts).fill({ color: paper });
        let pic;
        if (art) { pic = new PIXI.Sprite(art); pic.scale.set(SC / MAP_SCALE); pic.position.set(mapX - CX0 * SC, mapY - CY0 * SC); }
        else { // the drawing still loading: plain washes in the same places
            const at = ([px, py]) => [mapX + (px - CX0) * SC, mapY + (py - CY0) * SC];
            pic = new PIXI.Graphics().poly(pts).fill({ color: 0x8fbfd6 });
            pic.poly([...at([MAP_WATERLINE[0][0], -10]), ...MAP_WATERLINE.flatMap(at), ...at([-10, MAP_WATERLINE.at(-1)[1]])]).fill({ color: 0xefd9a4 });
            pic.poly([...at([MAP_COAST[0][0], -10]), ...MAP_COAST.flatMap(at), ...at([-10, MAP_COAST.at(-1)[1]])]).fill({ color: 0xb9c98f });
        }
        const mask = new PIXI.Graphics().poly(pts).fill(0xffffff); pic.mask = mask;
        const seam = new PIXI.Graphics().poly(pts).stroke({ width: 2, color: ink, alpha: .5 });
        const folds = [new PIXI.Graphics(), new PIXI.Graphics()];
        c.addChild(back, pic, mask, seam, ...folds);
        return { c, folds };
    }
    const map = card(), hand = card();
    const origin = new PIXI.Graphics();
    container.addChild(shadow, link, ...dune, map.c, origin, hand.c);
    hand.c.scale.set(.24);
    hand.c.position.set(clawX - (mapX + MW / 2) * .24, clawY - (mapY + MH / 2) * .24);
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
    /** The dune on the card's beach, folding up like the one on the sand. */
    function drawMap(g, amount) {
        g.clear();
        // flat: the dune drawn on the map shows (hidden, an empty Graphics would still count in the bounds)
        g.visible = amount > .002;
        if (!g.visible) return;
        const dx = mapX + (MAP_DUNE.x - CX0) * SC, dy = mapY + (MAP_DUNE.y - CY0) * SC;
        const a = [dx - 13, dy + 3], b = [dx + 13, dy + 3], tip = [dx - 3 * amount, dy + 3 - 34 * amount];
        drawPoly(g, [a, tip, b], 'mat-sand', 0xe8cc8e);
        drawPoly(g, [a, tip, [tip[0] + 9 * amount, tip[1] + 11 * amount]], 'mat-paper', paper);
        line(g, [[tip[0], tip[1]], [tip[0] + 9 * amount, tip[1] + 11 * amount], b], ink, .23, 1.6);
        line(g, [a, tip, b], ink, .7, 2.2);
        marks(g, tip[0], tip[1] - 7, .7);
    }
    // A magnified corner belongs to the physical sheet in Klo's claw. The leader
    // ends there, rather than presenting an unexplained second floating map.
    line(origin, [[clawX, clawY], [mapX + MW * .5, mapY + MH + 5]], ink, .35, 1.8);
    origin.circle(clawX, clawY, 8).stroke({ color: ink, alpha: .45, width: 1.8 });
    for (let i = 0; i < 4; i++) shadow.ellipse(x + 9, y + 9, W * .53 + i * 3, 8 + i * 3).fill({ color: 0x5f513d, alpha: .027 });
    drawDune(dune[0], 0); drawDune(dune[1], 1);
    for (const { folds } of [map, hand]) { drawMap(folds[0], 0); drawMap(folds[1], 1); }
    function update(t) {
        const state = sampleFoldDemo(t);
        container.alpha = state.opacity;
        shadow.alpha = state.world;
        if (lessMotion) {
            dune[0].alpha = 1 - state.world; dune[1].alpha = state.world;
            for (const { folds } of [map, hand]) { folds[0].alpha = 1 - state.map; folds[1].alpha = state.map; }
        } else {
            dune[1].visible = false;
            drawDune(dune[0], state.world);
            for (const { folds } of [map, hand]) { folds[1].visible = false; drawMap(folds[0], state.map); }
        }
        // The pencil trail only appears after the map has changed, in the
        // direction of its matching patch, then fades before both flatten.
        link.clear();
        const showLink = between(t, 1.3, 1.6) * (1 - between(t, 3.4, 3.8));
        link.visible = showLink > .001;
        if (showLink > .001) {
            const ax = mapX + (MAP_DUNE.x - CX0) * SC - 14, ay = mapY + (MAP_DUNE.y - CY0) * SC, bx = x + 17, by = y - 122;
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
