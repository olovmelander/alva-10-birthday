/* A fold of the illustrated seabed, with the illustration still on its face.
 * The cream reverse is only a narrow lip. World coordinates match the shell's
 * contact point; flattening lowers that point onto the seabed hinge. */
const clamp = n => Math.max(0, Math.min(1, n));

export function seabedFoldGeometry({ x, y, groundY, width, flat = 0 }) {
    const t = clamp(flat), floor = Math.max(y + 12, groundY);
    const peak = [x, y + (floor - y) * t];
    const left = [x - width * .56, floor + 8], right = [x + width * .44, floor + 8];
    return { peak, left, right, lip: [x - width * .13 * (1 - t), peak[1] + 26 * (1 - t)],
        rise: floor - peak[1], flat: t };
}

export function createFoldedSeabed(PIXI, { texture, x, y, groundY, width = 560, flat = false }) {
    const container = new PIXI.Container(); container.label = 'folded-illustrated-seabed';
    const shadow = new PIXI.Graphics(), face = new PIXI.Graphics(), ink = new PIXI.Graphics();
    container.addChild(shadow, face, ink);
    let amount = Number(flat), previous = -1;
    const stroke = (points, color, alpha, w = 2) => {
        ink.moveTo(...points[0]); for (const p of points.slice(1)) ink.lineTo(...p);
        ink.stroke({ color, alpha, width: w, cap: 'round', join: 'round' });
    };
    function draw() {
        if (Math.abs(amount - previous) < .001) return;
        previous = amount;
        const g = seabedFoldGeometry({ x, y, groundY, width, flat: amount });
        const { left: l, right: r, peak: p, lip } = g;
        shadow.clear(); face.clear(); ink.clear();
        shadow.ellipse(x, groundY + 10, width * .6, 17 + g.rise * .06)
            .fill({ color: 0x203d43, alpha: .08 + (1 - amount) * .2 });
        const reverse = [...l, ...lip, ...p, x + width * .07, groundY + 10];
        face.poly(reverse).fill(0xe9ddbc).stroke({ color: 0x726f5b, width: 2, alpha: .75 });
        const front = [...l, ...p, ...r];
        face.poly(front).fill(0xb8af83);
        const pigment = texture?.('mat-seabed');
        if (pigment) face.poly(front).fill({ texture: pigment, textureSpace: 'global', alpha: .68 });
        face.poly(front).fill({ color: 0x5a9290, alpha: .22 });
        // Pencil shading follows the sloping face instead of a white UI card.
        const at = (u, v) => [l[0] * (1 - u - v) + r[0] * u + p[0] * v,
            l[1] * (1 - u - v) + r[1] * u + p[1] * v];
        for (let i = 0; i < 25; i++) {
            const v = .08 + (i % 8) * .105, u = (.14 + ((i * 37) % 59) / 100) * (1 - v);
            const a = at(u, v), b = at(Math.min(1 - v, u + .06), v + .012);
            stroke([a, b], 0x526e62, .25, 1.3);
        }
        // The same kelp drawing bends with the paper and lies flat when pressed.
        for (const u of [.19, .52, .72]) {
            const pts = [.06, .16, .27, .39].map((v, i) => at(u * (1 - v) + (i % 2 ? .028 : 0), v));
            stroke(pts, 0x4b7159, .8, 3);
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i], b = at(u * (1 - (.09 + i * .1)) + (i % 2 ? -.055 : .075), .09 + i * .1);
                stroke([a, b], 0x63815c, .7, 4);
            }
        }
        stroke([l, p, r], 0x455d58, .8, 2.8);
        stroke([[l[0] + 6, l[1] - 5], [p[0], p[1] - 4], [r[0] - 6, r[1] - 5]], 0xf4ebcd, .78, 2);
        stroke([l, r], 0x66765e, .35, 2);
        // A small rounded pencil spiral is the same evidence found in the cave.
        const center = at(.29, .52), radius = Math.min(25, width * .06);
        const spiral = Array.from({ length: 29 }, (_, i) => {
            const a = i / 28 * Math.PI * 3.3, radiusAt = radius * (1 - i / 34);
            return [center[0] + Math.cos(a) * radiusAt, center[1] + Math.sin(a) * radiusAt * Math.max(.12, 1 - amount)];
        });
        stroke(spiral, 0x477e8b, .85, 2.7);
        return g;
    }
    draw();
    return { container, update({ flat: next, dt = 0, reducedMotion = false }) {
        const target = Number(!!next);
        amount = reducedMotion ? target : amount + (target - amount) * (1 - Math.exp(-Math.max(0, dt) * 4.5));
        if (Math.abs(target - amount) < .001) amount = target;
        draw();
        return seabedFoldGeometry({ x, y, groundY, width, flat: amount });
    } };
}
