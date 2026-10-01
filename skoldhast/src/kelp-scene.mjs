/* The P6 mechanism, drawn from the same pose that drives its collisions.
 * Kelp catches the crease; freeing it opens the current; shell pressure lowers
 * the printed seabed; its real map fragment rises into a sheltered frond pocket. */
import { createFoldedSeabed } from './folded-seabed.mjs';
import { createMapFragmentProp } from './map-props.mjs';
import { MAP_FRAGMENTS, fragmentPoints } from './map-layout.mjs';
import { pencilStyle } from './pencil-style.mjs';

const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
let pen = pencilStyle(null);
const line = (g, points, color, width, alpha = 1) => {
    g.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) g.lineTo(p.x, p.y);
    g.stroke(pen.line(color, width, alpha));
};

/** A frond of the kelp forest's own drawn strip, bent along a spine given tip
 * first and holdfast last: the playable kelp is the same plant as its neighbours. */
function kelpStrip(PIXI, texture, n, width) {
    const t = texture?.('kelp-strip');
    if (!t) return null;
    const positions = new Float32Array((n + 1) * 4), uvs = new Float32Array((n + 1) * 4), indices = new Uint32Array(n * 6);
    for (let i = 0; i <= n; i++) {
        const v = i / n;
        uvs.set([0, v, 1, v], i * 4);
        if (i < n) indices.set([i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2], i * 6);
    }
    const mesh = new PIXI.Mesh({ geometry: new PIXI.MeshGeometry({ positions, uvs, indices }), texture: t });
    mesh.bend = (points) => {
        for (let i = 0; i <= n; i++) {
            const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(n, i + 1)];
            let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
            const half = width / 2 * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, (i + 1) / (n + 1)) * .5 + .4));
            positions.set([p.x - ty * half, p.y + tx * half, p.x + ty * half, p.y - tx * half], i * 4);
        }
        mesh.geometry.getBuffer('aPosition').update();
    };
    return mesh;
}

export function createKelpPuzzleScene(PIXI, { texture, def, groundAt, flat = 0 }) {
    pen = pencilStyle(texture);
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
        .stroke(pen.line(0xfff1c5, 8, .96));
    fragment.addChildAt(paperEdge, 0);
    const fold = createFoldedSeabed(PIXI, { texture, ...def.fold, flat });
    const tether = new PIXI.Graphics(); tether.label = 'p6-tether';
    const detail = new PIXI.Graphics(); detail.label = 'p6-release-detail';
    // The cradle and the snagged frond, in the kelp forest's own drawn strip.
    const cradle = new PIXI.Container(); cradle.label = 'p6-cradle-kelp';
    const tetherKelp = kelpStrip(PIXI, texture, 28, 46);
    if (tetherKelp) tetherKelp.label = 'p6-tether-kelp';
    container.addChild(current, cradle, pocket, fragment, fold.container, ...(tetherKelp ? [tetherKelp] : []), tether, detail);

    // The playable fronds share the scenery's pencil material. Short veins
    // follow each leaf's actual curved edges instead of a flat vector sticker.
    // A direct sea save may arrive before the background land bundle.
    const leafGrain = texture?.('mat-grass') || texture?.('mat-seabed');
    const quadratic = (a, c, b, t) => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
        y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
    function leaf(g, base, upper, tip, lower, tail, color, alpha) {
        const path = () => g.moveTo(base.x, base.y).quadraticCurveTo(upper.x, upper.y, tip.x, tip.y)
            .quadraticCurveTo(lower.x, lower.y, tail.x, tail.y).closePath();
        path().fill(pen.fill(color, alpha * .82));
        if (leafGrain) path().fill({ texture: leafGrain, textureSpace: 'global', color: 0xc9d9b0, alpha: .3 });
        path().fill(pen.hatch(0x24501f, .32));
        path().stroke(pen.line(0x24501f, 1.9, .75));
        const middle = mix(base, tail, .5);
        line(g, [middle, mix(mix(upper, lower, .5), tip, .42), tip], 0x344f40, 1.6, .45);
        for (let i = 1; i < 7; i++) {
            const t = i / 8, a = quadratic(base, upper, tip, t), b = quadratic(tail, lower, tip, t);
            const centre = mix(a, b, .48);
            line(g, [mix(a, b, .13), { x: centre.x - 2, y: centre.y + 3 }], 0xd6d9a0, 1.4, .48);
            line(g, [{ x: centre.x + 1, y: centre.y - 2 }, mix(a, b, .83)], 0x3f6550, 1.2, .34);
        }
    }

    // A quiet, open-centred cradle identifies the safe destination before the
    // paper moves. The fronds sit behind its silhouette instead of covering it.
    const destination = def.fragment.to;
    for (const side of [-1, 1]) {
        const x = destination.x + side * 180;
        const root = { x, y: groundAt?.(x) ?? def.fold.groundY };
        const tip = { x: destination.x + side * 175, y: destination.y - 80 };
        const frond = kelpStrip(PIXI, texture, 18, 74);
        if (frond) {
            const c1 = { x: root.x + side * 86, y: root.y - 175 }, c2 = { x: tip.x + side * 130, y: tip.y + 170 };
            const at = t => ({ x: (1 - t) ** 3 * root.x + 3 * (1 - t) ** 2 * t * c1.x + 3 * (1 - t) * t * t * c2.x + t ** 3 * tip.x,
                y: (1 - t) ** 3 * root.y + 3 * (1 - t) ** 2 * t * c1.y + 3 * (1 - t) * t * t * c2.y + t ** 3 * tip.y });
            frond.bend(Array.from({ length: 19 }, (_, i) => at(1 - i / 18)));
            cradle.addChild(frond);
        } else {
            pocket.moveTo(root.x, root.y).bezierCurveTo(root.x + side * 86, root.y - 175,
                tip.x + side * 130, tip.y + 170, tip.x, tip.y)
                .stroke(pen.line(0x24501f, 12, .88));
            pocket.moveTo(root.x - side * 3, root.y).bezierCurveTo(root.x + side * 74, root.y - 175,
                tip.x + side * 122, tip.y + 170, tip.x, tip.y)
                .stroke(pen.line(0x6f9a45, 4, .85));
            for (let i = 0; i < 5; i++) {
                const y = lerp(root.y - 90, tip.y + 75, i / 4), x = root.x + side * Math.sin(i / 5 * Math.PI) * 65;
                leaf(pocket, { x, y }, { x: x + side * 75, y: y - 8 }, { x: x + side * 96, y: y - 58 },
                    { x: x + side * 28, y: y - 50 }, { x, y: y - 12 }, i % 2 ? 0x5e8a44 : 0x3e7a34, .9);
            }
        }
        pocket.ellipse(root.x, root.y + 4, 35, 10).fill(pen.hatch(0x1f3f37, .55));
    }
    pocket.ellipse(destination.x, groundAt?.(destination.x) ?? def.fold.groundY, 240, 25).fill(pen.hatch(0x254f4c, .2));

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
        if (tetherKelp) tetherKelp.bend(spine.toReversed());
        line(tether, spine, 0x24501f, tetherKelp ? 7 : 17, tetherKelp ? .7 : .95);
        if (!tetherKelp) line(tether, spine, 0x4f8a3e, 11, .88);
        for (let i = 0; i < spine.length - 2 && !tetherKelp; i += 3) {
            line(tether, spine.slice(i, i + 3).map(p => ({ x: p.x - 3, y: p.y - 2 })), 0xc0c58c, 2.1, .66);
            line(tether, spine.slice(i, i + 2).map(p => ({ x: p.x + 2, y: p.y + 1 })), 0x365d47, 1.3, .55);
        }
        for (const i of tetherKelp ? [] : [2, 5, 8, 16, 20, 24]) {
            const p = spine[i], next = spine[i + 1], length = Math.hypot(next.x - p.x, next.y - p.y) || 1;
            const side = i % 2 ? 1 : -1, nx = -(next.y - p.y) / length * side, ny = (next.x - p.x) / length * side;
            leaf(tether, p, { x: p.x + nx * 58, y: p.y + ny * 58 },
                { x: p.x + nx * 68 + 12, y: p.y + ny * 68 - 25 },
                { x: p.x + nx * 21, y: p.y + ny * 21 - 28 }, p, i % 2 ? 0x6f9a45 : 0x3e7a34, .96);
        }
        if (!pose.kelpFreed) {
            // This visible turn is the snag, exactly on the lip it restrains.
            tether.ellipse(hook.x + 7, hook.y + 8, 27, 21)
                .stroke(pen.line(0x24501f, 10, .95));
            tether.ellipse(hook.x + 7, hook.y + 8, 27, 21)
                .stroke(pen.line(0x8fae5a, 5, .95));
            tether.ellipse(loose.x, loose.y, 22, 11).fill(pen.fill(0x9cbf62)).stroke(pen.line(0x24501f, 3));
            // Small arrested strokes collect against the snag; no decorative
            // moving whirl promises a current before it has been released.
            for (let i = 0; i < 3; i++) current.moveTo(hook.x + 65 + i * 17, hook.y - 80)
                .quadraticCurveTo(hook.x + 113 + i * 17, hook.y - 45, hook.x + 73 + i * 17, hook.y - 8)
                .stroke(pen.line(0xcfe8de, 3.5, .55 - i * .12));
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
                .fill(pen.fill(0xb6aa7c, .3 * lift));
        }
        if (pose.flat >= 1 && fragment.visible) {
            const rise = clamp((def.fragment.from.y - pose.fragment.y) / (def.fragment.from.y - destination.y));
            for (let i = 0; i < 5; i++) detail.circle(pose.fragment.x + (i % 2 ? -1 : 1) * (37 + i * 9),
                pose.fragment.y + 20 + i * 23, 4 + i % 3).stroke(pen.line(0xe8f3de, 2, .68 * (1 - rise)));
        }
        return shape;
    }
    return { container, update };
}
