/* Pencil evidence on Mörka valvet's back wall, revealed by the fish's light. */
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const n = clamp(value); return n * n * (3 - 2 * n); };

/** Keep evidence between the real roof and floor; never invent a separate card. */
export function layoutVaultDiscovery({ x0, x1, roofAt, groundAt }) {
    const width = x1 - x0;
    if (!(width > 0)) throw new RangeError('The vault must have a positive width.');
    const point = (u, v) => {
        const x = x0 + width * u, roof = roofAt(x), ground = groundAt(x);
        if (!Number.isFinite(roof) || !Number.isFinite(ground) || ground <= roof)
            throw new RangeError('The vault evidence needs a roof above its floor.');
        return { x, y: roof + (ground - roof) * v };
    };
    const route = Array.from({ length: 43 }, (_, i) => {
        const u = .01 + .945 * i / 42;
        // A lightly waving hand-drawn current, following the cave rather than
        // a screen rectangle. Leave the fish's lamp perches above it clear.
        return { ...point(u, .43 + Math.sin(u * Math.PI * 5) * .027), u };
    });
    const spiral = point(.78, .44), fold = point(.9, .43);
    const depth = groundAt(spiral.x) - roofAt(spiral.x);
    const scale = Math.min(width / 1150, depth / 510);
    return {
        route, spiral: { ...spiral, radius: 39 * scale },
        fold: { ...fold, size: 42 * scale }, scale,
        // Scenery is quiet and recognisably part of the same rock wall. It is
        // neither another mechanism nor a collectible map fragment.
        fossils: [point(.23, .76), point(.5, .77)],
        kelp: [point(.075, .95), point(.65, .95)],
        pebbles: [.17, .38, .57, .83].map(u => point(u, .965))
    };
}

/** World-space art only. The caller owns light progression and story timing. */
export function createVaultDiscovery(PIXI, options = {}) {
    const { texture } = options, layout = layoutVaultDiscovery(options);
    const container = new PIXI.Container(); container.label = 'vault-discovery';
    const scenery = new PIXI.Container(); scenery.label = 'vault-wall-life';
    const evidence = new PIXI.Container(); evidence.label = 'vault-current-evidence';
    container.addChild(scenery, evidence);
    const scale = layout.scale, width = Math.max(1.5, 3.4 * scale);
    const segments = [], pencil = 0x365e6a, palePencil = 0xb9c8b0;
    const stroke = (g, points, color = pencil, weight = width, alpha = 1) => {
        g.moveTo(points[0].x, points[0].y);
        for (const p of points.slice(1)) g.lineTo(p.x, p.y);
        g.stroke({ color, width: weight, alpha, cap: 'round', join: 'round' });
    };

    // Deliberately layered, slightly offset pencil strokes. They remain marks
    // on rock instead of becoming an illuminated HUD route or a neon cable.
    for (let i = 0; i < layout.route.length - 1; i++) {
        const a = layout.route[i], b = layout.route[i + 1];
        const g = new PIXI.Graphics();
        const entrance = a.u < .13;
        // The spiral and folded-coast drawing occupy this section of the line.
        if (a.u < .73 || a.u > .94) {
            stroke(g, [{ x: a.x, y: a.y + 2.7 * scale }, { x: b.x, y: b.y + 3 * scale }], 0x263f43, width * 1.8, .26);
            stroke(g, [a, b], entrance ? 0xdfd7b4 : palePencil, width * (entrance ? 4 : 2.4), entrance ? .95 : .32);
            stroke(g, [a, b], pencil, width * (entrance ? 1.7 : 1), .94);
            if (i % 5 !== 4) stroke(g, [{ x: a.x, y: a.y - 2 * scale }, { x: b.x - 3 * scale, y: b.y - 2.5 * scale }], 0x769598, width * .5, .7);
            if ([3, 14, 23, 40].includes(i)) {
                const angle = Math.atan2(b.y - a.y, b.x - a.x), size = (entrance ? 25 : 15) * scale;
                const wings = [-1, 1].map(sign => ({
                    x: b.x - Math.cos(angle + sign * .55) * size,
                    y: b.y - Math.sin(angle + sign * .55) * size
                }));
                if (entrance) stroke(g, [wings[0], b, wings[1]], 0xdfd7b4, width * 3.4, .9);
                stroke(g, [wings[0], b, wings[1]], pencil, width * (entrance ? 1.4 : .9), .9);
            }
        }
        evidence.addChild(g); segments.push({ graphic: g, u: a.u });
    }

    // A drawn whirl followed by an upturned seafloor is a destination clue,
    // not the map fragment itself. Its blue line uses the same pencil as the
    // current and the actual folded sea page further along the route.
    const destination = new PIXI.Graphics(); destination.label = 'vault-fold-clue';
    const { spiral, fold } = layout, coil = [];
    for (let i = 0; i <= 60; i++) {
        const t = i / 60, angle = -.3 + t * Math.PI * 3.8, radius = spiral.radius * (1 - t * .78);
        coil.push({ x: spiral.x + Math.cos(angle) * radius, y: spiral.y + Math.sin(angle) * radius * .72 });
    }
    stroke(destination, coil.map(p => ({ x: p.x + 2 * scale, y: p.y + 2 * scale })), palePencil, width * 2, .45);
    stroke(destination, coil, pencil, width, .95);
    const s = fold.size, fx = fold.x, fy = fold.y;
    const foldOutline = [
        { x: fx - s, y: fy + s * .35 }, { x: fx - s * .45, y: fy + s * .38 },
        { x: fx + s * .25, y: fy - s * .55 }, { x: fx + s * .78, y: fy + s * .4 },
        { x: fx + s, y: fy + s * .43 }
    ];
    stroke(destination, foldOutline, palePencil, width * 2.5, .28);
    stroke(destination, foldOutline, pencil, width, .96);
    stroke(destination, [{ x: fx - s * .45, y: fy + s * .38 }, { x: fx + s * .15, y: fy + s * .52 }, { x: fx + s * .25, y: fy - s * .55 }], pencil, width * .72, .7);
    for (let i = 0; i < 5; i++) {
        const x = fx - s * .29 + i * s * .14;
        stroke(destination, [{ x, y: fy + s * .32 }, { x: x + s * .1, y: fy + s * .23 }], 0x867650, width * .55, .6);
    }
    // Tiny kelp leaves on the folded face identify it as the drawn seabed.
    stroke(destination, [{ x: fx + s * .25, y: fy + s * .16 }, { x: fx + s * .32, y: fy - s * .14 }], 0x547257, width * .7, .9);
    stroke(destination, [{ x: fx + s * .28, y: fy + s * .02 }, { x: fx + s * .14, y: fy - s * .06 }], 0x547257, width * .7, .9);
    evidence.addChild(destination); segments.push({ graphic: destination, u: .77 });

    const details = new PIXI.Graphics();
    for (let i = 0; i < layout.fossils.length; i++) {
        const at = layout.fossils[i], r = (i ? 23 : 32) * scale;
        // Half-buried fan-shell impressions, hatched into the far wall.
        details.moveTo(at.x - r, at.y).quadraticCurveTo(at.x - r * .88, at.y - r, at.x, at.y - r * .9)
            .quadraticCurveTo(at.x + r, at.y - r, at.x + r, at.y)
            .quadraticCurveTo(at.x + r * .3, at.y + r * .18, at.x, at.y + r * .34)
            .quadraticCurveTo(at.x - r * .5, at.y + r * .14, at.x - r, at.y)
            .fill({ color: 0xb8a57a, alpha: .28 }).stroke({ color: 0x7e8975, width: width * .72, alpha: .78 });
        for (let j = -2; j <= 2; j++) {
            details.moveTo(at.x, at.y + r * .17).quadraticCurveTo(at.x + j * r * .16, at.y - r * .25, at.x + j * r * .33, at.y - r * (.84 - Math.abs(j) * .06))
                .stroke({ color: 0x9faa8b, width: width * .6, alpha: .68 });
        }
    }
    const rockTexture = texture?.('mat-seabed');
    for (let i = 0; i < layout.pebbles.length; i++) {
        const at = layout.pebbles[i], r = (17 + i % 2 * 6) * scale;
        details.ellipse(at.x + 4 * scale, at.y + 4 * scale, r * 1.2, r * .22).fill({ color: 0x203838, alpha: .2 });
        const shape = [at.x - r, at.y, at.x - r * .6, at.y - r * .7, at.x + r * .5, at.y - r * .65, at.x + r, at.y];
        details.poly(shape).fill({ color: 0x7b897e, alpha: .48 });
        if (rockTexture) details.poly(shape).fill({ texture: rockTexture, textureSpace: 'global', alpha: .22 });
        details.poly(shape).stroke({ color: 0x4b6666, width: width * .55, alpha: .62 });
    }
    for (let i = 0; i < layout.kelp.length; i++) {
        const at = layout.kelp[i];
        for (let j = 0; j < 3; j++) {
            const height = (30 + 13 * j + i * 5) * scale, offset = (j - 1) * 10 * scale;
            details.moveTo(at.x + offset, at.y).quadraticCurveTo(at.x + offset - 11 * scale, at.y - height * .6, at.x + offset + 5 * scale, at.y - height)
                .stroke({ color: 0x638166, width: width * (1.2 - j * .16), alpha: .66, cap: 'round' });
        }
    }
    scenery.addChild(details);
    let previous = '', destroyed = false;
    function update({ lit = false, light = 0, reducedMotion = false } = {}) {
        if (destroyed) return;
        const amount = clamp(Number.isFinite(light) ? light : 0), key = `${lit}|${Math.round(amount * 180)}|${reducedMotion}`;
        if (key === previous) return; previous = key;
        scenery.alpha = .08 + .76 * amount;
        for (const { graphic, u } of segments) {
            const reveal = reducedMotion ? amount : smooth((amount - u * .57) / .43);
            // The entrance offers a visible question before the fish arrive;
            // the continuation and destination remain lost in the dark.
            const beforeLight = u < .13 ? .95 : .035;
            graphic.alpha = beforeLight + reveal * (.965 - beforeLight);
        }
    }
    update();
    return {
        container, update, layout,
        destroy() {
            if (destroyed) return; destroyed = true;
            container.parent?.removeChild(container);
            if (!container.destroyed) container.destroy({ children: true });
        }
    };
}
