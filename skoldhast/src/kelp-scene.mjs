/* The P6 mechanism, drawn from the same pose that drives its collisions.
 * Kelp catches the crease; freeing it opens the current; shell pressure lowers
 * the printed seabed; its real map fragment rises into a sheltered frond pocket. */
import { createFoldedSeabed } from './folded-seabed.mjs';
import { createMapFragmentProp } from './map-props.mjs';
import { MAP_FRAGMENTS, fragmentPoints } from './map-layout.mjs';

const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const line = (g, points, color, width, alpha = 1) => {
    g.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) g.lineTo(p.x, p.y);
    g.stroke({ color, width, alpha, cap: 'round', join: 'round' });
};

export function createKelpPuzzleScene(PIXI, { texture, def, groundAt, flat = 0 }) {
    const container = new PIXI.Container(); container.label = 'kelp-puzzle-scene';
    const current = new PIXI.Graphics(); current.label = 'p6-current';
    const pocket = new PIXI.Graphics(); pocket.label = 'p6-pocket';
    const fragmentWidth = 200;
    const fragment = createMapFragmentProp(PIXI, { texture, fragment: 'sea', width: fragmentWidth }); fragment.label = 'p6-fragment';
    // An exposed cream paper edge, rather than a glow, separates the blue ink
    // from the blue water when the whole cause is framed on a narrow phone.
    const points = fragmentPoints(MAP_FRAGMENTS.find(piece => piece.id === 'sea'));
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const centreX = (Math.min(...xs) + Math.max(...xs)) / 2, bottomY = Math.max(...ys);
    const paperScale = fragmentWidth / (Math.max(...xs) - Math.min(...xs));
    const paperEdge = new PIXI.Graphics().poly(points.map(([x, y]) => [(x - centreX) * paperScale, (y - bottomY) * paperScale]).flat())
        .stroke({ color: 0xfff1c5, width: 8, alpha: .96, join: 'round' });
    fragment.addChildAt(paperEdge, 0);
    const fold = createFoldedSeabed(PIXI, { texture, ...def.fold, flat });
    const tether = new PIXI.Graphics(); tether.label = 'p6-tether';
    const detail = new PIXI.Graphics(); detail.label = 'p6-release-detail';
    container.addChild(current, pocket, fragment, fold.container, tether, detail);

    // A quiet, open-centred cradle identifies the safe destination before the
    // paper moves. The fronds sit behind its silhouette instead of covering it.
    const destination = def.fragment.to;
    for (const side of [-1, 1]) {
        const x = destination.x + side * 180;
        const root = { x, y: groundAt?.(x) ?? def.fold.groundY };
        const tip = { x: destination.x + side * 175, y: destination.y - 80 };
        pocket.moveTo(root.x, root.y).bezierCurveTo(root.x + side * 86, root.y - 175,
            tip.x + side * 130, tip.y + 170, tip.x, tip.y)
            .stroke({ color: 0x365f50, width: 12, alpha: .82, cap: 'round' });
        pocket.moveTo(root.x - side * 3, root.y).bezierCurveTo(root.x + side * 74, root.y - 175,
            tip.x + side * 122, tip.y + 170, tip.x, tip.y)
            .stroke({ color: 0x87a465, width: 4, alpha: .82, cap: 'round' });
        for (let i = 0; i < 5; i++) {
            const y = lerp(root.y - 90, tip.y + 75, i / 4), x = root.x + side * Math.sin(i / 5 * Math.PI) * 65;
            pocket.moveTo(x, y).quadraticCurveTo(x + side * 75, y - 8, x + side * 96, y - 58)
                .quadraticCurveTo(x + side * 28, y - 50, x, y - 12)
                .fill({ color: i % 2 ? 0x718c59 : 0x587c55, alpha: .85 })
                .stroke({ color: 0x3e624d, width: 2, alpha: .75 });
        }
        pocket.ellipse(root.x, root.y + 4, 35, 10).fill({ color: 0x2c554b, alpha: .4 });
    }
    pocket.ellipse(destination.x, groundAt?.(destination.x) ?? def.fold.groundY, 240, 25).fill({ color: 0x254f4c, alpha: .13 });

    let lastKey = '';
    function update(pose, { lessMotion = false } = {}) {
        const shape = fold.update({ flat: pose.flat });
        // Before release the fold, drawn above this same prop, conceals most
        // of the ink. Its exposed torn edge is evidence, not a pickup yet.
        fragment.visible = !pose.fragment.collected;
        fragment.position.set(pose.fragment.x, pose.fragment.y);
        fragment.rotation = !lessMotion && pose.flat >= 1 ? Math.sin(clamp((def.fragment.from.y - pose.fragment.y)
            / (def.fragment.from.y - destination.y)) * Math.PI) * -.075 : 0;
        if (fragment.visible) fragment.refreshTexture();
        const released = clamp(pose.release), pulling = clamp(pose.pull);
        const end = pose.tetherEnd || def.tether.loose;
        const key = [pose.kelpFreed, pose.pulling, released.toFixed(3), pulling.toFixed(3), pose.flat.toFixed(3),
            end.x.toFixed(1), end.y.toFixed(1), pose.fragment.y.toFixed(1), pose.fragment.collected, lessMotion].join('/');
        if (key === lastKey) return shape; lastKey = key;
        current.clear(); tether.clear(); detail.clear();

        const root = def.tether.root;
        const hook = mix(def.tether.hook, { x: root.x + 50, y: root.y - 340 }, released);
        const loose = mix(end, { x: root.x + 190, y: root.y - 350 }, released);
        const tension = pose.pulling ? pulling : 0;
        const spine = [];
        for (let i = 0; i <= 12; i++) {
            const t = i / 12, p = mix(root, hook, t);
            p.x -= Math.sin(t * Math.PI) * lerp(34, 10, tension); spine.push(p);
        }
        for (let i = 1; i <= 16; i++) {
            const t = i / 16, p = mix(hook, loose, t);
            p.y += Math.sin(t * Math.PI) * lerp(82, 6, tension) * (1 - released); spine.push(p);
        }
        line(tether, spine, 0x294f44, 17, .95);
        line(tether, spine, 0x6d925b, 11);
        line(tether, spine.map(p => ({ x: p.x - 3, y: p.y - 3 })), 0xc0c58c, 2.2, .66);
        for (const i of [2, 5, 8, 16, 20, 24]) {
            const p = spine[i], next = spine[i + 1], length = Math.hypot(next.x - p.x, next.y - p.y) || 1;
            const side = i % 2 ? 1 : -1, nx = -(next.y - p.y) / length * side, ny = (next.x - p.x) / length * side;
            tether.moveTo(p.x, p.y).quadraticCurveTo(p.x + nx * 58, p.y + ny * 58, p.x + nx * 68 + 12, p.y + ny * 68 - 25)
                .quadraticCurveTo(p.x + nx * 21, p.y + ny * 21 - 28, p.x, p.y)
                .fill({ color: i % 2 ? 0x89a067 : 0x537950, alpha: .96 })
                .stroke({ color: 0x355c49, width: 2.3, alpha: .88 });
        }
        if (!pose.kelpFreed) {
            // This visible turn is the snag, exactly on the lip it restrains.
            tether.ellipse(hook.x + 7, hook.y + 8, 27, 21)
                .stroke({ color: 0x294f44, width: 10, alpha: .95 });
            tether.ellipse(hook.x + 7, hook.y + 8, 27, 21)
                .stroke({ color: 0x9aa46c, width: 5, alpha: .95 });
            tether.ellipse(loose.x, loose.y, 22, 11).fill(0xa6b879).stroke({ color: 0x355c49, width: 3 });
            // Small arrested strokes collect against the snag; no decorative
            // moving whirl promises a current before it has been released.
            for (let i = 0; i < 3; i++) current.moveTo(hook.x + 65 + i * 17, hook.y - 80)
                .quadraticCurveTo(hook.x + 113 + i * 17, hook.y - 45, hook.x + 73 + i * 17, hook.y - 8)
                .stroke({ color: 0xcfe8de, width: 3.5, alpha: .55 - i * .12, cap: 'round' });
        } else if (pose.flat < 1) {
            // Clockwise pencil arrows follow the actual current's spin. They
            // leave the crease face clear and stay readable with reduced motion.
            for (let arc = 0; arc < 3; arc++) {
                const a0 = -.85 * Math.PI + arc * Math.PI * 2 / 3, radius = 290 - arc * 35;
                const points = Array.from({ length: 15 }, (_, i) => {
                    const a = a0 + i / 14 * .44 * Math.PI;
                    return { x: def.fold.x + Math.cos(a) * radius, y: def.fold.y + Math.sin(a) * radius };
                });
                line(current, points, 0xf1f7e8, 7, .32 + released * .22);
                line(current, points, 0xa0cec9, 2.5, .65);
                const a = points.at(-2), b = points.at(-1), length = Math.hypot(b.x - a.x, b.y - a.y);
                const tx = (b.x - a.x) / length, ty = (b.y - a.y) / length;
                line(current, [{ x: b.x - tx * 25 - ty * 11, y: b.y - ty * 25 + tx * 11 }, b,
                    { x: b.x - tx * 25 + ty * 11, y: b.y - ty * 25 - tx * 11 }], 0xe5f2e0, 5, .9);
            }
        }
        if (pose.flat > 0 && pose.flat < 1) {
            const lift = Math.sin(pose.flat * Math.PI);
            for (let i = 0; i < 11; i++) detail.ellipse(def.fold.x + (i - 5) * 48,
                def.fold.groundY - 6 - ((i * 17) % 25) * lift, 4 + i % 3, 2.4)
                .fill({ color: 0xb6aa7c, alpha: .3 * lift });
        }
        if (pose.flat >= 1 && fragment.visible) {
            const rise = clamp((def.fragment.from.y - pose.fragment.y) / (def.fragment.from.y - destination.y));
            for (let i = 0; i < 5; i++) detail.circle(pose.fragment.x + (i % 2 ? -1 : 1) * (37 + i * 9),
                pose.fragment.y + 20 + i * 23, 4 + i % 3).stroke({ color: 0xe8f3de, width: 2, alpha: .68 * (1 - rise) });
        }
        return shape;
    }
    return { container, update };
}
