/* The very same map as the research notebook: the one drawing (map-page), cut
 * along the same torn silhouettes, with the same place names on top
 * (map-layout.mjs). Klo's first corner stays put while the two recovered pieces
 * join it and reveal one sea route.
 * Once joined, a ruler-straight crease runs along the tear: the map ripped where
 * the page was folded (docs/skoldhast/story-kartvaktaren.md). Kapitel 3 replays
 * it in Kartväktaren's hands without the route. */
import { MAP_FRAGMENTS, MAP_SCALE, MAP_ROUTES, MAP_COAST, MAP_WATERLINE, fragmentPoints, mapLabels } from './map-layout.mjs';
import { MAP } from './content/sv.mjs';

/** Is (x, y) inside the polygon `pts` (flat list)? */
function inside(x, y, pts) {
    let hit = false;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
        const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
}

const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export function sampleMapAssemble(t) {
    return { joined: ease((t - .4) / .7), crease: ease((t - 1.0) / .45), route: ease((t - 1.15) / .7), opacity: ease(t / .2) * (1 - ease((t - 2.55) / .4)), done: t >= 2.95 };
}
// the fold, straight across the torn seam between the land pieces and the sea piece
export const MAP_CREASE = Object.freeze({ x0: 24, x1: 616, y: 227 });
export function createMapAssemble(PIXI, { texture, caption, lessMotion = false, route: showRoute = true }) {
    const container = new PIXI.Container(); container.label = 'map-assemble';
    const ink = 0x625b50, blue = 0x457d98;
    const sheet = new PIXI.Container(); container.addChild(sheet);
    const captionPaper = new PIXI.Graphics();
    captionPaper.poly([48, -77, 591, -74, 594, -13, 46, -10]).fill({ color: 0xf7eed8, alpha: .96 }).stroke({ color: 0x8c7651, width: 1.5, alpha: .5 });
    sheet.addChild(captionPaper);
    const pieces = [];
    const routePoints = MAP_ROUTES.sea;
    const line = (g, points, color = ink, alpha = .8, width = 2.4) => {
        g.moveTo(...points[0]); for (let i = 1; i < points.length; i++) g.lineTo(...points[i]);
        g.stroke({ color, alpha, width, cap: 'round', join: 'round' });
    };
    const art = texture('map-page');
    const names = mapLabels(true), texts = [];
    // Ordered as the notebook: the familiar corner, the recovered land, then sea.
    for (const fragment of MAP_FRAGMENTS) {
        const c = new PIXI.Container(), points = fragmentPoints(fragment).flat();
        const back = new PIXI.Graphics();
        back.poly(points.map((v, i) => v + (i % 2 ? 3 : 2))).fill({ color: 0x514532, alpha: .16 });
        back.poly(points).fill({ color: 0xf6eed8 });
        let pic;
        if (art) { pic = new PIXI.Sprite(art); pic.scale.set(1 / MAP_SCALE); }
        else { // the drawing still loading: plain washes in the same places
            pic = new PIXI.Graphics().rect(0, 0, 640, 420).fill({ color: 0x8fbfd6 });
            pic.poly([MAP_WATERLINE[0][0], -10, ...MAP_WATERLINE.flat(), -10, MAP_WATERLINE.at(-1)[1], -10, -10]).fill({ color: 0xefd9a4 });
            pic.poly([MAP_COAST[0][0], -10, ...MAP_COAST.flat(), -10, MAP_COAST.at(-1)[1], -10, -10]).fill({ color: 0xb9c98f });
        }
        const mask = new PIXI.Graphics().poly(points).fill(0xffffff); pic.mask = mask;
        const labels = new PIXI.Container();
        for (const l of names) {
            if (!inside(l.x, l.y - 4, points)) continue;
            const t = new PIXI.Text({ text: MAP.places[l.key], style: { fontFamily: '"Patrick Hand", cursive', fontSize: l.minor ? 16 : 22,
                fill: 0x354f50, stroke: { color: 0xfbf4df, width: 4, join: 'round' } } });
            t.anchor.set(.5, .8); t.position.set(l.x, l.y);
            if (l.vertical) t.rotation = -Math.PI / 2;
            labels.addChild(t); texts.push({ t, size: l.minor ? 16 : 22, min: l.minor ? 11 : 14 });
        }
        const seam = new PIXI.Graphics().poly(points).stroke({ width: 1.2, color: 0x8c7651, alpha: .75 });
        c.addChild(back, pic, mask, labels, seam); sheet.addChild(c); pieces.push({ id: fragment.id, c });
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
                const [ex, ey] = routePoints.at(-1);
                route.circle(ex, ey - 22, 14).fill({ color: 0xf6da8c, alpha: .55 });
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
            // on a small screen the names grow a little on the map, so they stay readable
            for (const { t, size, min } of texts) { const want = Math.max(size, min / scale); if (Math.abs(t.style.fontSize - want) > .1) t.style.fontSize = want; }
        },
        destroy() { container.parent?.removeChild(container); if (!container.destroyed) container.destroy({ children: true }); }
    };
}
