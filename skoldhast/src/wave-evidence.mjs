/* Old tide marks belong to an exposed rock face, never to the empty sky. */
export function createWaveEvidence(PIXI, { texture, x, ground, scale = 1 } = {}) {
    const container = new PIXI.Container();
    container.label = 'raised-sea-evidence';
    const y = ground(x) ?? 0;
    container.position.set(x, y);
    const at = localX => ((ground(x + localX * scale) ?? y) - y) / scale;
    const xs = [-235, -212, -165, -65, 45, 140, 213, 240];
    const heights = [0, 110, 194, 248, 233, 170, 105, 0];
    const outline = xs.map((xx, i) => [xx, at(xx) - heights[i]]);
    for (let i = xs.length - 2; i > 0; i--) outline.push([xs[i], at(xs[i]) + 8]);
    const g = new PIXI.Graphics(), poly = outline.flat();
    g.poly(poly).fill(0xd2cfbd);
    const rock = texture?.('mat-rock');
    if (rock) g.poly(poly).fill({ texture: rock, textureSpace: 'global', alpha: .56 });
    g.poly(poly).stroke({ color: 0x6b695a, width: 3, alpha: .72, join: 'round' });
    // A washed tide band with pencil-blue ripples and shell impressions.
    g.poly([-172, -178, -125, -186, -66, -172, -7, -181, 63, -169, 123, -143, 143, -74,
        82, -91, 16, -95, -51, -88, -111, -101, -171, -97]).fill({ color: 0xa6c4bb, alpha: .42 });
    for (let row = 0; row < 3; row++) {
        const yy = -164 + row * 29;
        g.moveTo(-159, yy);
        for (let k = 0; k < 4; k++) {
            const xx = -159 + k * 65;
            g.quadraticCurveTo(xx + 17, yy - 11, xx + 33, yy).quadraticCurveTo(xx + 49, yy + 11, xx + 65, yy);
        }
        g.stroke({ color: 0x416b7a, width: row === 1 ? 4 : 3.3, alpha: .86, cap: 'round' });
    }
    for (const [sx, sy, r] of [[-120, -58, 16], [-31, -68, 19], [64, -43, 13]]) {
        g.moveTo(sx, sy).quadraticCurveTo(sx - r * 1.2, sy - r * 1.4, sx, sy - r * 1.6)
            .quadraticCurveTo(sx + r * 1.2, sy - r * 1.4, sx, sy).fill({ color: 0xf1e5c8, alpha: .9 })
            .stroke({ color: 0x8c8170, width: 2, alpha: .8 });
        for (const dx of [-.55, 0, .55]) g.moveTo(sx, sy - 2).lineTo(sx + dx * r, sy - r * 1.3).stroke({ color: 0xa99b80, width: 1.5 });
    }
    for (let k = 0; k < 7; k++) {
        const xx = -176 + k * 44, yy = at(xx);
        g.moveTo(xx, yy + 2).lineTo(xx - 10, yy - 17).moveTo(xx + 3, yy + 2).lineTo(xx + 8, yy - 21)
            .stroke({ color: 0x8c9874, width: 2.5, alpha: .85 });
    }
    container.scale.set(scale); container.addChild(g);
    return container;
}
