/* The little grass pages of Branten. The terrain owns every contact point;
 * this layer shows the paper edge and roots that make that movement legible. */
import { heightOn } from './sim.mjs';
import { hillFlightPose } from './hill-puzzle.mjs';

const clamp = value => Math.max(0, Math.min(1, value || 0));
const lerp = (a, b, t) => a + (b - a) * t;
const line = (g, points, color, width, alpha = 1) => {
    if (!points.length) return;
    g.moveTo(...points[0]);
    for (const p of points.slice(1)) g.lineTo(...p);
    g.stroke({ color, width, alpha, cap: 'round', join: 'round' });
};

/** The paper's upper edge is the physical surface, with no second animation. */
export function hillStripGeometry(stage) {
    const top = stage.points.map(p => [...p]);
    const base = stage.basePoints.map(p => [...p]);
    const lower = top.map(([x, y]) => [x, Math.max(y + 24, (heightOn(base, x) ?? y) + 24)]);
    return { top, lower, curl: 44 * (1 - clamp(stage.unfold)), root: clamp(stage.root) };
}

function seedDrawing(PIXI) {
    const g = new PIXI.Graphics();
    // A brown seed and its pale umbrella are one carried object. Dark pencil
    // underneath keeps it visible over both paper sky and grassy hillside.
    for (const [color, width] of [[0x665346, 5], [0xfff4d6, 2.8]]) {
        g.moveTo(0, 7).lineTo(-7, -26).stroke({ color, width, cap: 'round' });
        for (let i = 0; i < 7; i++) {
            const a = -Math.PI + i / 6 * Math.PI;
            g.moveTo(-7, -26).quadraticCurveTo(-7 + Math.cos(a) * 26, -30 + Math.sin(a) * 24,
                -7 + Math.cos(a) * 40, -23 + Math.sin(a) * 32).stroke({ color, width, cap: 'round' });
        }
    }
    g.ellipse(0, 8, 7, 13).fill(0x795743).stroke({ color: 0xf6e5bd, width: 2 });
    return g;
}

export function createHillPuzzleScene(PIXI, { sprite, def }) {
    const container = new PIXI.Container(); container.label = 'hill-puzzle-scene';
    const stages = new Map();
    for (const stage of def.hillPuzzle.stages) {
        const paper = new PIXI.Graphics(); paper.label = `p3-paper-${stage.id}`;
        const roots = new PIXI.Graphics(); roots.label = `p3-roots-${stage.id}`;
        const bed = new PIXI.Graphics(); bed.label = `p3-bed-${stage.id}`;
        container.addChild(paper, roots, bed); stages.set(stage.id, { paper, roots, bed, key: '' });
    }
    const pinShadow = new PIXI.Graphics(); pinShadow.label = 'p3-pin-contact';
    const stone = sprite('boulder'); stone.label = 'p3-pin-stone';
    const pinSeam = new PIXI.Graphics(); pinSeam.label = 'p3-pin-crease';
    container.addChild(pinShadow, stone, pinSeam);
    const flightLayer = new PIXI.Container(); flightLayer.label = 'p3-seed-flights';
    container.addChild(flightLayer);
    const flights = new Map();
    const runup = new PIXI.Graphics(); runup.label = 'p4-runup-marker';
    const wake = new PIXI.Graphics(); wake.label = 'p4-downhill-wake';
    container.addChild(runup, wake);
    const plateau = def.surfaces.find(s => s.id === 'plateau');
    const edge = def.edges?.find(e => e.id === 'sprang-p4');
    const crest = edge?.downhill?.runup;
    if (crest && plateau) {
        const crestGround = heightOn(plateau.pts, crest.x) ?? crest.y;
        // Hoof-shaped chalk strokes leave the crest in the direction of the
        // real descending ground; there is no floating command or remote gate.
        for (let i = 0; i < 4; i++) {
            const x = crest.x - i * 68, y = heightOn(plateau.pts, x) ?? crest.y;
            runup.moveTo(x + 10, y - 7).quadraticCurveTo(x - 18, y - 22, x - 27, y - 7)
                .stroke({ color: 0xf4e4bb, width: 8, alpha: .9, cap: 'round' });
            runup.moveTo(x + 8, y - 5).quadraticCurveTo(x - 14, y - 17, x - 24, y - 5)
                .stroke({ color: 0x786d53, width: 2, alpha: .78, cap: 'round' });
        }
        for (let i = 0; i < 3; i++) runup.moveTo(crest.x + 25 + i * 13, crestGround)
            .quadraticCurveTo(crest.x + 15, crestGround - 49 - i * 7, crest.x - 14 - i * 10, crestGround - 54 - i * 6)
            .stroke({ color: 0x8e9d61, width: 5, cap: 'round' });
    }

    function update(pose, { player, momentum, showRunup = false, lessMotion = false } = {}) {
        const geometry = [];
        for (const stage of pose.stages) {
            const view = stages.get(stage.id), shape = hillStripGeometry(stage); geometry.push({ id: stage.id, ...shape });
            const key = [stage.phase, shape.root.toFixed(3), stage.unfold.toFixed(3), ...shape.top.flat().map(n => n.toFixed(1))].join('/');
            if (key === view.key) continue; view.key = key;
            const { paper, roots, bed } = view; paper.clear(); roots.clear(); bed.clear();
            const { top, lower, curl, root } = shape;
            paper.poly([...top, ...lower.toReversed()].flat()).fill({ color: 0xf1dfb6, alpha: .98 })
                .stroke({ color: 0x877454, width: 2.3, alpha: .95, join: 'round' });
            // Pencil fibres on the exposed underside show that this is a
            // hinged grass-covered sheet, rather than a mound appearing.
            const left = top[0], right = top.at(-1);
            for (let i = 1; i < 12; i++) {
                const x = lerp(left[0], right[0], i / 12), y = heightOn(top, x), bottom = heightOn(lower, x);
                line(paper, [[x - 9, y + 7], [x + 8, bottom - 5]], 0xb7a57e, 1.7, .42);
            }
            line(paper, lower, 0x8b7655, 2.3, .66);
            line(paper, top, 0x4e6042, 7);
            line(paper, top.map(([x, y]) => [x, y - 2]), 0xa3b574, 4.2);
            // The paper curl is attached to the rising free tip. Its radius
            // closes exactly as the physical strip reaches the upper ledge.
            if (curl > .5) {
                const [x, y] = left;
                paper.moveTo(x, y + 22).bezierCurveTo(x + curl * 1.4, y + 25,
                    x + curl * 1.25, y - curl, x + curl * .35, y - curl * .62)
                    .quadraticCurveTo(x - curl * .12, y - curl * .4, x + curl * .1, y)
                    .fill(0xf4e4c0).stroke({ color: 0x857351, width: 3, join: 'round' });
                paper.moveTo(x + curl * .14, y - 1).quadraticCurveTo(x + curl * .7, y - curl * .2, x + curl * .38, y - curl * .48)
                    .stroke({ color: 0xbba777, width: 2.3, cap: 'round' });
            }
            const receiver = stage.receiver, seedY = heightOn(top, receiver.x) ?? receiver.y;
            bed.ellipse(receiver.x, seedY - 2, 57, 10).fill({ color: 0x6d6043, alpha: .3 });
            bed.ellipse(receiver.x, seedY - 2, 47, 8).stroke({ color: 0x8b6b4b, width: 3, alpha: .9 });
            if (stage.seeded) bed.ellipse(receiver.x, seedY - 9, 7, 11).fill(0x805a3b);
            if (root > 0) {
                for (const direction of [-1, 1]) {
                    const end = direction < 0 ? left[0] : right[0];
                    const rootLine = [];
                    for (let i = 0; i <= 18; i++) {
                        const x = lerp(receiver.x, end, root * i / 18);
                        rootLine.push([x, (heightOn(top, x) ?? receiver.y) + 12 + Math.sin(i * 1.1) * 3]);
                    }
                    line(roots, rootLine, 0x665b35, 5, .94);
                    line(roots, rootLine.map(([x, y]) => [x, y - 1]), 0xc4bc72, 2.2, .96);
                    for (let i = 3; i < rootLine.length; i += 4) {
                        const [x, y] = rootLine[i], bottom = heightOn(lower, x) ?? y + 18;
                        roots.moveTo(x, y).quadraticCurveTo(x + direction * 20, (y + bottom) / 2,
                            x + direction * 13, bottom - 4).stroke({ color: 0x7d7046, width: 2.6, alpha: .8, cap: 'round' });
                    }
                }
                for (let i = 0; i < 5; i++) {
                    const x = receiver.x + (i - 2) * 16, y = heightOn(top, x) ?? receiver.y;
                    bed.moveTo(x, y).quadraticCurveTo(x + (i - 2) * 9, y - 43 * root, x + (i - 2) * 13, y - (45 + i % 2 * 15) * root)
                        .stroke({ color: i % 2 ? 0x607347 : 0x879657, width: 4, cap: 'round' });
                }
            }
        }
        stone.position.set(pose.stone.x, pose.stone.y);
        // The boulder slides with the physical push; rotating its bottom anchor
        // would falsely lift the point of contact off the pinning crease.
        pinShadow.clear().ellipse(pose.stone.x, pose.stone.y + 3, 77, 10).fill({ color: 0x4d4939, alpha: .27 });
        pinSeam.clear();
        if (!pose.stone.moved) pinSeam.moveTo(pose.stone.x - 66, pose.stone.y + 5).lineTo(pose.stone.x + 68, pose.stone.y + 5)
            .stroke({ color: 0xf4e4c0, width: 6, cap: 'round' });

        const active = new Set();
        for (const f of pose.flights) {
            active.add(f.id);
            let view = flights.get(f.id);
            if (!view) {
                const trail = new PIXI.Graphics(); trail.label = `p3-flight-trail-${f.id}`;
                const seed = seedDrawing(PIXI); seed.label = `p3-flight-${f.id}`;
                flightLayer.addChild(trail, seed); view = { trail, seed }; flights.set(f.id, view);
            }
            view.seed.position.set(f.x, f.y);
            view.seed.rotation = lessMotion ? 0 : Math.sin(f.t * Math.PI * 2) * .15;
            view.trail.clear();
            // Only a wake behind an actual launched seed, never a looping
            // imitation that appears to land without changing the soil.
            for (let i = 1; i <= 4; i++) {
                const t = f.t - i * .025; if (t < 0) continue;
                const point = hillFlightPose({ ...f, ...f.from, t });
                view.trail.circle(point.x, point.y, 4.8 - i * .5).fill({ color: 0x8d789f, alpha: .52 - i * .09 });
            }
        }
        for (const [id, view] of flights) if (!active.has(id)) {
            view.trail.destroy(); view.seed.destroy(); flights.delete(id);
        }
        runup.visible = showRunup;
        wake.clear(); wake.visible = !!player && !!momentum?.active;
        if (wake.visible) {
            const strength = clamp(momentum.fraction);
            for (let i = 0; i < 3; i++) {
                const y = player.y - 40 - i * 52, x = player.x + 72 + i * 13;
                wake.moveTo(x, y).quadraticCurveTo(x + 70 + strength * 65, y - 7, x + 98 + strength * 150, y - 2)
                    .stroke({ color: momentum.ready ? 0xf7e4b9 : 0xe3e8d0, width: 3 + strength * 2,
                        alpha: .25 + strength * .5, cap: 'round' });
            }
        }
        return { stages: geometry, stone: { x: stone.x, y: stone.y }, flights: [...flights].map(([id, v]) => ({ id, x: v.seed.x, y: v.seed.y })) };
    }
    return { container, update, stages, flights, stone, runup, wake };
}
