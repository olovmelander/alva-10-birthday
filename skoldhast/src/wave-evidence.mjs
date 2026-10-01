/* Old tide marks belong to an exposed rock face, never to the empty sky.
 * The face is the shore's own layered rock, lit from the upper left like
 * every boulder, with the tide band, ripples and shells drawn in pencil. */
import { pencilStyle } from './pencil-style.mjs';

export function createWaveEvidence(PIXI, { texture, x, ground, scale = 1 } = {}) {
    const pen = pencilStyle(texture);
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
    g.poly(poly).fill(pen.material('mat-rock', 1, 0xd2cfbd));
    // its form: the right-hand slope and the foot turned away from the light
    const shade = [[45, at(45) - 233], [140, at(140) - 170], [213, at(213) - 105], [240, at(240)], [240, at(240) + 8], [-150, at(-150) + 8], [-120, at(-120) - 40], [30, at(30) - 150]];
    g.poly(shade.flat()).fill(pen.hatch(0x5f5a50, .28));
    g.poly([[-235, at(-235)], [-212, at(-212) - 110], [-165, at(-165) - 194], [-65, at(-65) - 248], [-90, at(-90) - 205], [-170, at(-170) - 150], [-205, at(-205) - 60]].flat())
        .fill({ color: 0xfbf8f1, alpha: .22 });
    // A washed tide band with pencil-blue ripples and shell impressions.
    const band = [-172, -178, -125, -186, -66, -172, -7, -181, 63, -169, 123, -143, 143, -74,
        82, -91, 16, -95, -51, -88, -111, -101, -171, -97];
    g.poly(band).fill(pen.hatch(0x6f9fa0, .55));
    g.poly(band).fill({ color: 0xa6c4bb, alpha: .18 });
    for (let row = 0; row < 3; row++) {
        const yy = -164 + row * 29;
        g.moveTo(-159, yy);
        for (let k = 0; k < 4; k++) {
            const xx = -159 + k * 65;
            g.quadraticCurveTo(xx + 17, yy - 11, xx + 33, yy).quadraticCurveTo(xx + 49, yy + 11, xx + 65, yy);
        }
        g.stroke(pen.line(0x2f5f74, row === 1 ? 3.6 : 3, .85));
    }
    for (const [sx, sy, r] of [[-120, -58, 16], [-31, -68, 19], [64, -43, 13]]) {
        g.moveTo(sx, sy).quadraticCurveTo(sx - r * 1.2, sy - r * 1.4, sx, sy - r * 1.6)
            .quadraticCurveTo(sx + r * 1.2, sy - r * 1.4, sx, sy).fill(pen.fill(0xf1e5c8, .92))
            .stroke(pen.line(0x7c705e, 2, .85));
        for (const dx of [-.55, 0, .55]) g.moveTo(sx, sy - 2).lineTo(sx + dx * r, sy - r * 1.3).stroke(pen.line(0xa99b80, 1.5));
    }
    g.poly(poly).stroke(pen.line(0x4a463d, 3.2, .85));
    // turf and a few blades growing against its foot
    for (let k = 0; k < 7; k++) {
        const xx = -176 + k * 44, yy = at(xx);
        g.moveTo(xx, yy + 2).lineTo(xx - 10, yy - 17).moveTo(xx + 3, yy + 2).lineTo(xx + 8, yy - 21)
            .stroke(pen.line(0x7f9c6a, 2.5, .85));
    }
    container.scale.set(scale); container.addChild(g);
    return container;
}
