/* The very same torn silhouettes as the research notebook. Klo's first corner
 * stays put while the two recovered pieces join it and reveal one sea route.
 * Once joined, a ruler-straight crease runs along the tear: the map ripped where
 * the page was folded (docs/skoldhast/story-kartvaktaren.md). Kapitel 3 replays
 * it in Kartväktaren's hands without the route. */
import { MAP_FRAGMENTS } from './mapbook.mjs';

const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export function sampleMapAssemble(t) {
    return { joined: ease((t - .4) / .7), crease: ease((t - 1.0) / .45), route: ease((t - 1.15) / .7), opacity: ease(t / .2) * (1 - ease((t - 2.55) / .4)), done: t >= 2.95 };
}
// the fold, straight across the torn seam between the land pieces and the sea piece
export const MAP_CREASE = Object.freeze({ x0: 24, x1: 616, y: 227 });
export function createMapAssemble(PIXI, { texture, caption, lessMotion = false, route: showRoute = true }) {
    const container = new PIXI.Container(); container.label = 'map-assemble';
    const ink = 0x625b50, blue = 0x457d98, gold = 0xb48a49;
    const sheet = new PIXI.Container(); container.addChild(sheet);
    const captionPaper = new PIXI.Graphics();
    captionPaper.poly([48, -77, 591, -74, 594, -13, 46, -10]).fill({ color: 0xf7eed8, alpha: .96 }).stroke({ color: 0x8c7651, width: 1.5, alpha: .5 });
    sheet.addChild(captionPaper);
    const pieces = [];
    const routePoints = [[314, 216], [306, 245], [313, 268], [336, 283], [371, 297], [400, 317], [436, 333], [470, 332], [493, 315], [507, 290], [522, 252], [535, 210], [535, 165], [530, 104]];
    const line = (g, points, color = ink, alpha = .8, width = 2.4) => {
        g.moveTo(...points[0]); for (let i = 1; i < points.length; i++) g.lineTo(...points[i]);
        g.stroke({ color, alpha, width, cap: 'round', join: 'round' });
    };
    // Ordered as the notebook: the familiar corner, the recovered land, then sea.
    for (const fragment of MAP_FRAGMENTS) {
        const c = new PIXI.Container(), paper = new PIXI.Graphics(), art = new PIXI.Graphics(), mask = new PIXI.Graphics();
        const points = fragment.path.match(/-?\d+(?:\.\d+)?/g).map(Number);
        paper.poly(points).fill({ color: 0xf7eed8 });
        if (texture('mat-paper')) paper.poly(points).fill({ texture: texture('mat-paper'), textureSpace: 'global', alpha: .8 });
        paper.poly(points).stroke({ width: 2.2, color: 0x8c7651, alpha: .7 });
        art.poly([26, 25, 321, 25, 363, 141, 290, 225, 26, 237]).fill({ color: 0xb1bd8b, alpha: .5 });
        art.poly([27, 235, 294, 220, 340, 228, 386, 160, 381, 32, 618, 32, 618, 397, 24, 397]).fill({ color: 0x8db5bf, alpha: .4 });
        line(art, [[31, 211], [126, 217], [182, 194], [287, 181], [340, 177], [353, 137], [335, 51]], ink, .8, 2.1);
        for (let i = 0; i < 34; i++) {
            const x = 40 + i * 97 % 555, y = 244 + i * 41 % 137;
            line(art, [[x, y], [x + 6, y - 3], [x + 12, y], [x + 18, y - 3], [x + 24, y]], blue, .34, 1.8);
        }
        for (let i = 0; i < 30; i++) {
            const x = 43 + i * 67 % 240, y = 44 + i * 43 % 165;
            line(art, [[x - 3, y - 8], [x, y], [x + 4, y - 6]], 0x607955, .4, 1.8);
        }
        line(art, [[43, 82], [66, 52], [92, 82]], ink, .7);
        line(art, [[297, 222], [297, 201], [303, 190], [314, 185], [325, 190], [329, 202], [329, 222]], ink, .8);
        for (let i = 0; i < routePoints.length - 1; i++) {
            const a = routePoints[i], b = routePoints[i + 1];
            line(art, [a, [a[0] + (b[0] - a[0]) * .48, a[1] + (b[1] - a[1]) * .48]], blue, .4, 3);
        }
        // The destination has the same tower outline and position as the journal.
        art.poly([511, 128, 517, 80, 543, 80, 549, 128]).fill({ color: 0xf7eed8 }).stroke({ color: ink, width: 2.2 });
        line(art, [[515, 79], [530, 64], [546, 79]], ink, .8, 2.6);
        art.rect(521, 89, 18, 10).fill({ color: 0xf3d47c }).stroke({ color: ink, width: 1.6 });
        art.circle(287, 227, 18).stroke({ color: gold, width: 3.3 });
        line(art, [[276, 238], [298, 216]], gold, .9, 3);
        mask.poly(points).fill({ color: 0xffffff }); art.mask = mask;
        c.addChild(paper, art, mask); sheet.addChild(c); pieces.push({ id: fragment.id, c });
    }
    const crease = new PIXI.Graphics(); crease.label = 'map-crease'; sheet.addChild(crease);
    const route = new PIXI.Graphics(); sheet.addChild(route);
    const title = new PIXI.Text({ text: caption, style: { fontFamily: '"Patrick Hand", cursive', fontSize: 34, fill: ink } });
    title.anchor.set(.5, 1); title.position.set(320, -24); sheet.addChild(title);
    function update(t) {
        const state = sampleMapAssemble(t);
        container.alpha = state.opacity;
        for (const { id, c } of pieces) {
            const off = 1 - state.joined;
            c.position.set(lessMotion ? 0 : (id === 'land' ? -40 : id === 'sea' ? 22 : 0) * off,
                lessMotion ? 0 : (id === 'land' ? -14 : id === 'sea' ? 65 : 0) * off);
            c.alpha = lessMotion && id !== 'corner' ? .3 + .7 * state.joined : 1;
        }
        crease.clear(); crease.visible = state.crease > 0;
        if (state.crease > 0) {
            // drawn along a ruler, left to right: a paper highlight over a fold shadow
            const { x0, x1, y } = MAP_CREASE, x = x0 + (x1 - x0) * (lessMotion ? 1 : state.crease);
            line(crease, [[x0, y - 1.6], [x, y - 1.6]], 0xfffaf0, .85, 3.2);
            line(crease, [[x0, y + 1], [x, y + 1]], 0x8c7651, .6, 1.7);
        }
        route.clear(); route.visible = showRoute && state.route > 0;
        if (route.visible) {
            const len = (routePoints.length - 1) * state.route, n = Math.floor(len), pts = routePoints.slice(0, n + 1);
            if (n < routePoints.length - 1) {
                const a = routePoints[n], b = routePoints[n + 1], f = len - n;
                pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
            }
            if (pts.length > 1) { line(route, pts, 0xfff9dc, .9, 9); line(route, pts, blue, .92, 4.3); }
            if (state.route === 1) {
                route.circle(530, 97, 14).fill({ color: 0xf6da8c, alpha: .65 });
                line(route, [[523, 115], [530, 104], [537, 115]], blue, .9, 3.3);
            }
        }
        return state;
    }
    update(0);
    return {
        container, update,
        fit(width, height) {
            const scale = Math.min((width - 54) / 735, (height - (height > width ? 290 : 132)) / 500, 1);
            sheet.scale.set(scale);
            sheet.position.set(width / 2 - 320 * scale, (height - (height > width ? 90 : 54)) / 2 - 210 * scale);
            title.style.fontSize = Math.max(34, 16 / scale);
        },
        destroy() { container.parent?.removeChild(container); if (!container.destroyed) container.destroy({ children: true }); }
    };
}
