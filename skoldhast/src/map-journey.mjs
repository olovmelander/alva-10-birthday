/* The crossing between Kelpskogen and Spegelviken, told on Kartväktaren's own
 * map: the route that the collected pieces made whole is the current that
 * carries the swimmer round the headland. What happens to the map happens to
 * the world, so the journey is drawn there. The last frame of the sea the
 * swimmer leaves stays underneath while the map arrives, and the new place
 * shows through as it leaves, so nothing on screen jumps. No input, no reading. */
import { MAP_FRAGMENTS, MAP_SCALE, MAP_ROUTES, MAP_HEART, fragmentPoints, mapLabels } from './map-layout.mjs';
import { MAP } from './content/sv.mjs';

const clamp = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
export const JOURNEY_TIMES = Object.freeze({ arrive: .55, travel: 2.1, hold: .5, depart: .6 });
export const JOURNEY_TIMES_STILL = Object.freeze({ arrive: .25, travel: 0, hold: 1.4, depart: .3 });
// the part of the map the journey frames (map units): the deep sea, the headland and the bay
const BOX = Object.freeze({ x: 290, y: 70, w: 340, h: 330 });

/** The leg of the sea route the outflow follows: from Kelphjärtat round to Spegelviken, under Bryggan. */
export function journeyRoute(direction = 'toBay') {
    const route = MAP_ROUTES.sea;
    let start = 0, best = Infinity;
    route.forEach(([x, y], i) => {
        const d = Math.hypot(x - MAP_HEART.x, y - MAP_HEART.y);
        if (d < best) { best = d; start = i; }
    });
    const leg = route.slice(start).map(p => [...p]);
    return direction === 'toKelp' ? leg.reverse() : leg;
}

/** A point `f` (0…1) of the way along a polyline, with the direction of travel there. */
export function pointAlong(pts, f) {
    const lengths = [0];
    for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = lengths.at(-1) || 1, at = clamp(f) * total;
    let i = 1;
    while (i < pts.length - 1 && lengths[i] < at) i++;
    const a = pts[i - 1], b = pts[i], u = (at - lengths[i - 1]) / ((lengths[i] - lengths[i - 1]) || 1);
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
        travelled: [...pts.slice(0, i), [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]] };
}

/** Pure timeline: how far the map has arrived, how far the swimmer has travelled. */
export function sampleJourney(seconds, { lessMotion = false } = {}) {
    const T = lessMotion ? JOURNEY_TIMES_STILL : JOURNEY_TIMES;
    const t = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const a = T.arrive, b = a + T.travel, c = b + T.hold, d = c + T.depart;
    const phase = t < a ? 'arrive' : t < b ? 'travel' : t < c ? 'hold' : t < d ? 'depart' : 'gone';
    return {
        phase,
        opacity: phase === 'arrive' ? ease(t / a) : phase === 'depart' ? 1 - ease((t - c) / T.depart) : phase === 'gone' ? 0 : 1,
        under: phase === 'arrive' ? 1 : 0, // the frame left behind, under the arriving map
        travel: lessMotion ? 1 : phase === 'arrive' ? 0 : phase === 'travel' ? ease((t - a) / T.travel) : 1,
        done: t >= d, duration: d
    };
}

/** A tiny sköldhäst in Kartväktaren's pencil, for the route: shell, mane and head. */
function marker(PIXI) {
    const g = new PIXI.Graphics(); g.label = 'map-journey-marker';
    g.ellipse(0, 0, 13, 9).fill(0x4f8f3a).stroke({ color: 0x2f3a2a, width: 1.8 });
    g.moveTo(-6, -7).lineTo(-3, 6).moveTo(3, -8).lineTo(5, 6).stroke({ color: 0x9cc25a, width: 1.4, alpha: .9 });
    g.circle(15, -5, 4.6).fill(0xefe6d4).stroke({ color: 0x3b3530, width: 1.4 });
    g.moveTo(9, -9).lineTo(12, -15).lineTo(13, -9).moveTo(12, -10).lineTo(16, -14).lineTo(15, -8)
        .stroke({ color: 0xe0782a, width: 2.2, cap: 'round', join: 'round' });
    g.moveTo(-13, 2).quadraticCurveTo(-20, 6, -22, 12).stroke({ color: 0xd4562a, width: 2.6, cap: 'round' });
    return g;
}

export function createMapJourney(PIXI, { texture = () => null, direction = 'toBay', lessMotion = false, flags = true, under = null }) {
    const container = new PIXI.Container(); container.label = 'map-journey';
    const behind = under ? new PIXI.Sprite(under) : null;
    if (behind) { behind.label = 'map-journey-left-behind'; container.addChild(behind); }
    const veil = new PIXI.Container(); container.addChild(veil);
    const shade = new PIXI.Graphics(); veil.addChild(shade);
    const sheet = new PIXI.Container(); sheet.label = 'map-journey-sheet'; veil.addChild(sheet);
    const art = texture('map-page');
    for (const f of MAP_FRAGMENTS) {
        const points = fragmentPoints(f), flat = points.flat();
        const back = new PIXI.Graphics();
        for (let i = 3; i >= 1; i--) back.poly(points.map(([x, y]) => [x + i * 1.8, y + i * 2.4]).flat()).fill({ color: 0x3a332b, alpha: .05 });
        back.poly(flat).fill(0xf8f0df);
        const pic = art ? new PIXI.Sprite(art) : new PIXI.Graphics().rect(0, 0, 640, 420).fill(0x8fbfd6);
        if (art) pic.scale.set(1 / MAP_SCALE);
        const mask = new PIXI.Graphics().poly(flat).fill(0xffffff); pic.mask = mask;
        // the tears Klo mended stay visible: the map is whole again, not new
        const seam = new PIXI.Graphics().poly(flat).stroke({ width: 1.3, color: 0x8c7651, alpha: .6 });
        sheet.addChild(back, pic, mask, seam);
    }
    for (const l of mapLabels(flags).filter(l => ['kelp', 'heart', 'bay', 'pier', 'tower'].includes(l.key))) {
        const t = new PIXI.Text({ text: MAP.places[l.key], style: {
            fontFamily: '"Patrick Hand", cursive', fontSize: l.minor ? 17 : 22,
            fill: 0x354f50, stroke: { color: 0xfbf4df, width: 4, join: 'round' } } });
        t.anchor.set(.5, .8); t.position.set(l.x, l.y); sheet.addChild(t);
    }
    const route = journeyRoute(direction);
    const path = new PIXI.Graphics(); path.label = 'map-journey-route'; sheet.addChild(path);
    const ride = marker(PIXI); sheet.addChild(ride);
    const title = new PIXI.Text({ text: MAP.journey[direction] || '', style: {
        fontFamily: '"Patrick Hand", cursive', fontSize: 24, fill: 0x514d42, align: 'center', wordWrap: true, wordWrapWidth: 420,
        stroke: { color: 0xfff9e9, width: 5, join: 'round' } } });
    title.anchor.set(.5, 0); veil.addChild(title);

    let elapsed = 0, state = sampleJourney(0, { lessMotion }), dead = false, resolve = null, lastTravel = -1;
    const done = new Promise(r => { resolve = r; });
    const line = (pts, color, width, alpha) => {
        if (pts.length < 2) return;
        path.moveTo(...pts[0]); for (const p of pts.slice(1)) path.lineTo(...p);
        path.stroke({ color, width, alpha, cap: 'round', join: 'round' });
    };
    function paint() {
        state = sampleJourney(elapsed, { lessMotion });
        veil.alpha = state.opacity;
        if (behind) behind.visible = state.under > 0;
        if (state.travel === lastTravel) return;
        lastTravel = state.travel;
        const at = pointAlong(route, state.travel);
        path.clear();
        // the whole leg in the map's own faint ink, the travelled part bold and blue
        line(route, 0x397c98, 3, .35);
        line(at.travelled, 0xfff7d8, 11, .92);
        line(at.travelled, 0x397c98, 4.4, .96);
        ride.position.set(at.x, at.y);
        const facing = Math.cos(at.angle) < 0 ? -1 : 1;
        ride.scale.set(facing, 1);
        ride.rotation = lessMotion ? 0 : facing > 0 ? at.angle * .35 : (at.angle - Math.PI) * .35;
    }
    paint();
    return {
        container, done, route,
        get state() { return state; },
        update(dt) {
            if (dead) return state;
            elapsed += Math.max(0, Number.isFinite(dt) ? dt : 0);
            paint();
            if (state.done && resolve) { const r = resolve; resolve = null; r(); }
            return state;
        },
        fit(width, height) {
            if (behind) { behind.width = width; behind.height = height; }
            shade.clear().rect(0, 0, width, height).fill({ color: 0xece7da, alpha: .94 });
            const titleSpace = 44, margin = 18;
            const scale = Math.max(.1, Math.min((width - margin * 2) / BOX.w, (height - titleSpace - margin * 2) / BOX.h, 2.2));
            sheet.scale.set(scale);
            sheet.position.set(width / 2 - (BOX.x + BOX.w / 2) * scale, (height + titleSpace) / 2 - (BOX.y + BOX.h / 2) * scale);
            title.style.fontSize = Math.min(26, Math.max(18, width / 26));
            title.style.wordWrapWidth = Math.min(width - 24, 460);
            title.position.set(width / 2, Math.max(8, (height - titleSpace - BOX.h * scale) / 2 - 6));
        },
        destroy() {
            if (dead) return; dead = true;
            if (resolve) { const r = resolve; resolve = null; r(); }
            container.parent?.removeChild(container);
            container.destroy({ children: true });
            under?.destroy(true);
        }
    };
}
