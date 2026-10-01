/* Small habitats along the drawn path. Their roots use the same ground as the
 * horse; composed gaps keep the map, giant backsippa and paper mechanisms clear.
 * Built once per scene, with bounded culling and transform-only wind updates. */
import { HL, cond, heightOn } from './sim.mjs';

const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const patches = [
    [1.55, .48, 'ridge'], [5.95, .5, 'ridge'],
    [17.8, .65, 'ridge'], [19.8, .6, 'ridge'], [24.65, .65, 'ridge'],
    [30.8, .65, 'ridge'], [32.3, .55, 'ridge'],
    [54.8, .55, 'steppe'], [58.85, .55, 'steppe'], [60.0, .32, 'steppe'],
    [63.5, .4, 'steppe'], [64.45, .55, 'steppe'], [69.2, .5, 'steppe'],
    [70.55, .6, 'steppe'], [74.5, .4, 'steppe'],
    [81.9, .3, 'dune'], [92.8, .32, 'dune'], [95.7, .52, 'dune'], [97.1, .38, 'dune']
];

function availableGround(surfaces, flags, x) {
    let best = null;
    for (const s of surfaces) {
        if (s.thin || s.hidden || !cond(s.when, flags)) continue;
        const y = heightOn(s.pts, x);
        if (y !== null && (!best || y < best.y)) best = { y, surfaceId: s.id };
    }
    return best;
}

/** A pure plan lets visual QA check every root and important negative space. */
export function planLandScenery(def, { flags = new Set(), surfaces = def.surfaces } = {}) {
    if (def.id !== 'land') return [];
    const clear = [
        ...(def.clumps || []).map(p => [p.x, 1.2 * HL]),
        ...(def.tussocks || []).map(p => [p.x, 1.4 * HL]),
        ...(def.edges || []).map(p => [p.x, .65 * HL]),
        ...['landmark', 'kloLedge'].flatMap(key => def.spots[key] ? [[def.spots[key].x, 1.1 * HL]] : [])
    ];
    if (def.hillPuzzle) clear.push([def.hillPuzzle.stone.x, 1.5 * HL], [def.hillPuzzle.stone.to.x, 1.2 * HL]);
    const keep = def.pictureX || [Infinity, -Infinity];
    const out = [];
    for (let i = 0; i < patches.length; i++) {
        const [center, spread, biome] = patches[i];
        for (let j = 0; j < 6; j++) {
            const seed = i * 61 + j * 7, x = (center + (hash(seed) * 2 - 1) * spread) * HL;
            if (x > keep[0] - HL && x < keep[1] + HL || x > 99 * HL && x < 105 * HL) continue;
            if (clear.some(([cx, r]) => Math.abs(x - cx) < r)) continue;
            const ground = availableGround(surfaces, flags, x);
            if (!ground || (def.waters || []).some(w => x > w.x0 && x < w.x1 && ground.y > w.top)) continue;
            const kind = j === 0 ? 'rosette' : j === 1 && biome === 'ridge' ? 'lichen'
                : j === 2 || j === 4 ? 'plume' : 'grass';
            out.push({ id: `habitat-${i}-${j}`, x, y: ground.y, surfaceId: ground.surfaceId,
                kind, biome, scale: .38 + hash(seed + 2) * .25, flip: hash(seed + 3) > .5 ? 1 : -1,
                phase: hash(seed + 4) * Math.PI * 2 });
        }
    }
    return out;
}

function drawGrass(PIXI, plan) {
    const g = new PIXI.Graphics(), dune = plan.biome === 'dune';
    const colors = dune ? [0x8b9972, 0xb2b88b, 0xd4d5aa] : [0x658161, 0x91a27a, 0xbdc8a3];
    // The roots spread wider than the tips: small, grounded fans, not identical
    // sticks at regular intervals. Paired strokes suggest pencil pressure.
    for (let i = 0; i < 11; i++) {
        const n = plan.x * .03 + i * 11, root = (hash(n) - .5) * 48;
        const reach = (hash(n + 1) - .5) * 125, height = 42 + hash(n + 2) * 98;
        g.moveTo(root, 0).quadraticCurveTo(root + reach * .12, -height * .58, reach, -height)
            .stroke({ color: colors[i % colors.length], width: 2.4 + i % 3 * .6, alpha: .92, cap: 'round' });
        if (i % 3 === 0) g.moveTo(root + 2, -3).quadraticCurveTo(root + reach * .12 + 2, -height * .55, reach + 1, -height + 11)
            .stroke({ color: 0xe3e6c9, width: 1.2, alpha: .65, cap: 'round' });
    }
    return g;
}

function drawRosette(PIXI, plan) {
    const g = new PIXI.Graphics();
    for (let i = 0; i < 8; i++) {
        const angle = -Math.PI + i / 7 * Math.PI, length = 42 + hash(i + plan.x) * 33;
        const x = Math.cos(angle) * length, y = Math.sin(angle) * length - 8;
        g.moveTo(0, 0).quadraticCurveTo(x * .25 - 11, y * .65 - 5, x, y)
            .quadraticCurveTo(x * .55 + 11, y * .6 + 8, 0, 0)
            .fill({ color: i % 2 ? 0x98ab88 : 0x789476, alpha: .94 });
        g.moveTo(0, -2).quadraticCurveTo(x * .5, y * .65, x, y)
            .stroke({ color: 0xd1dac0, width: 2.3, alpha: .88, cap: 'round' });
        for (let k = 1; k <= 3; k++) {
            const t = k / 4;
            g.moveTo(x * t - 5, y * t - 2).lineTo(x * t + 4, y * t + 3)
                .stroke({ color: 0x607857, width: 1.2, alpha: .34 });
        }
    }
    return g;
}

function drawLichen(PIXI, texture) {
    const g = new PIXI.Graphics();
    const points = [-56, 1, -42, -20, -8, -33, 28, -27, 50, -10, 57, 1];
    g.poly(points).fill(texture ? { texture, textureSpace: 'local' } : { color: 0xa3aa94 });
    g.moveTo(-56, 1).lineTo(-42, -20).lineTo(-8, -33).lineTo(28, -27).lineTo(50, -10).lineTo(57, 1)
        .stroke({ color: 0x6c7769, width: 2.5, alpha: .8, join: 'round' });
    for (let i = 0; i < 12; i++) {
        const x = -28 + hash(i) * 61, y = -5 - hash(i + 6) * 16;
        g.moveTo(x - 3, y).lineTo(x + 3, y - 2).stroke({ color: i % 3 ? 0xc2c79a : 0x748d74, width: 4, alpha: .8, cap: 'round' });
    }
    return g;
}

export function createLandScenery(PIXI, { def, flags, surfaces, texture = () => null }) {
    const container = new PIXI.Container(); container.label = 'land-habitats';
    const plans = planLandScenery(def, { flags, surfaces });
    const views = [];
    for (const plan of plans) {
        const group = new PIXI.Container(); group.label = plan.id; group.position.set(plan.x, plan.y);
        const shadow = new PIXI.Graphics();
        // Broken contact strokes sit on the ground. No blurred floating halo.
        shadow.moveTo(-29, 3).lineTo(-7, 4).moveTo(0, 4).lineTo(26, 3)
            .stroke({ color: 0x59624e, width: 5, alpha: .16, cap: 'round' });
        group.addChild(shadow);
        let plant;
        if (plan.kind === 'plume') {
            const variant = 1 + Math.floor(hash(plan.x) * (plan.biome === 'dune' ? 3 : 4));
            const t = texture((plan.biome === 'dune' ? 'dune-grass-' : 'feathergrass-') + variant);
            if (t) { plant = new PIXI.Sprite(t); plant.anchor.set(.5, 1); }
        }
        plant ||= plan.kind === 'rosette' ? drawRosette(PIXI, plan)
            : plan.kind === 'lichen' ? drawLichen(PIXI, texture('mat-rock')) : drawGrass(PIXI, plan);
        plant.scale.set(plan.scale * plan.flip, plan.scale);
        group.addChild(plant); container.addChild(group); views.push({ group, plant, plan });
    }
    let disposed = false;
    return { container, plans,
        update({ cam, width, height, time = 0, lessMotion = false }) {
            if (disposed) return;
            const halfW = width / cam.zoom / 2 + 180, halfH = height / cam.zoom / 2 + 180;
            for (const { group, plant, plan } of views) {
                group.visible = Math.abs(plan.x - cam.x) < halfW && Math.abs(plan.y - cam.y) < halfH;
                if (!group.visible) continue;
                plant.rotation = lessMotion || plan.kind === 'lichen' ? 0
                    : Math.sin(time * .65 + plan.phase + plan.x * .002) * .022;
            }
        },
        destroy() { if (disposed) return; disposed = true; container.destroy({ children: true }); }
    };
}
