/* Vattenporten's inside: a quiet distant rock vault opening toward the kelp.
 * The ceiling stays above the swimming route; this is rear scenery, never a
 * new collision surface or an obstacle placed across the way back to land. */
import { HL, heightOn } from './sim.mjs';
import { pencilStyle } from './pencil-style.mjs';

export function createCoastalCave(PIXI, { def, texture = () => null }) {
    const container = new PIXI.Container(); container.label = 'coastal-cave';
    if (def.id !== 'kelp') return { container };
    const pen = pencilStyle(texture);
    const h = n => n * HL;
    const roof = new PIXI.Graphics(); roof.label = 'cave-distant-roof';
    function roofPath(g) {
        return g.moveTo(h(-12), h(-14)).lineTo(h(9), h(-14)).lineTo(h(9), h(-5.5))
            .bezierCurveTo(h(8.8), h(-3.3), h(7.6), h(-1.9), h(6.6), h(-1.7))
            .bezierCurveTo(h(4.8), h(-1.25), h(2.9), h(-.9), h(1.1), h(-1.25))
            .bezierCurveTo(h(-.5), h(-1.45), h(-1.6), h(-.05), h(-1.9), h(2.1))
            .lineTo(h(-12), h(3)).closePath();
    }
    // the same layered stone as the shore, cooled by the dim water light
    roofPath(roof).fill(pen.material('mat-rock', 1, 0x8baaa6));
    roofPath(roof).fill({ color: 0x5f8783, alpha: .34 });
    roofPath(roof).fill(pen.hatch(0x2c5254, .3));
    // darker toward its underside, where no daylight reaches
    roof.moveTo(h(-1.9), h(2.1))
        .bezierCurveTo(h(-1.6), h(-.05), h(-.5), h(-1.45), h(1.1), h(-1.25))
        .bezierCurveTo(h(2.9), h(-.9), h(4.8), h(-1.25), h(6.6), h(-1.7))
        .bezierCurveTo(h(7.6), h(-1.9), h(8.8), h(-3.3), h(9), h(-5.5))
        .lineTo(h(9), h(-6.2)).bezierCurveTo(h(8.6), h(-3.6), h(7.4), h(-2.4), h(6.5), h(-2.3))
        .bezierCurveTo(h(4.6), h(-1.9), h(2.8), h(-1.6), h(1), h(-1.9))
        .bezierCurveTo(h(-.7), h(-2.1), h(-1.9), h(-.7), h(-2.4), h(2.2)).closePath()
        .fill(pen.hatch(0x1d3a3c, .42));
    roof.moveTo(h(-1.9), h(2.1))
        .bezierCurveTo(h(-1.6), h(-.05), h(-.5), h(-1.45), h(1.1), h(-1.25))
        .bezierCurveTo(h(2.9), h(-.9), h(4.8), h(-1.25), h(6.6), h(-1.7))
        .bezierCurveTo(h(7.6), h(-1.9), h(8.8), h(-3.3), h(9), h(-5.5))
        .stroke(pen.line(0x34504d, 5, .85));
    // Long pressure-varied strata describe curved stone instead of repeating
    // bright scratches over the entire cave and its empty swimming space.
    for (let i = 0; i < 8; i++) {
        const y = -1.65 - i * .3;
        roof.moveTo(h(-2.4), h(y + .2)).bezierCurveTo(h(.3), h(y - .35), h(2.6), h(y + .22), h(4.2), h(y - .15))
            .bezierCurveTo(h(5.6), h(y - .46), h(6.9), h(y - .3), h(7.9), h(y - 1.1))
            .stroke(pen.line(i % 3 ? 0xbacac1 : 0x48655f, i % 3 ? 3 : 4, i % 3 ? .22 : .35));
    }
    container.addChild(roof);
    const floor = def.surfaces.find(s => s.id === 'cave-floor');
    const details = new PIXI.Graphics(); details.label = 'cave-bed-details';
    for (const [xHL, scale] of [[.45, .7], [2.8, .45], [4.1, .8], [5.7, .5], [6.45, .6]]) {
        const x = h(xHL), y = heightOn(floor.pts, x);
        details.moveTo(x - 42 * scale, y).quadraticCurveTo(x - 20 * scale, y - 43 * scale, x + 18 * scale, y - 22 * scale)
            .quadraticCurveTo(x + 36 * scale, y - 11 * scale, x + 42 * scale, y)
            .fill(pen.material('mat-rock', 1, 0x93afa7));
        details.moveTo(x - 42 * scale, y).quadraticCurveTo(x - 20 * scale, y - 43 * scale, x + 18 * scale, y - 22 * scale)
            .quadraticCurveTo(x + 36 * scale, y - 11 * scale, x + 42 * scale, y)
            .fill({ color: 0x6f9690, alpha: .3 }).stroke(pen.line(0x4b6a64, 2.2, .8));
        details.moveTo(x - 23 * scale, y - 15 * scale).lineTo(x + 12 * scale, y - 19 * scale)
            .stroke(pen.line(0xd0d8c4, 3, .5));
    }
    container.addChild(details);
    // Under the water the cave has walls too: its far wall in the dim, darker toward the back, with strata and weed
    // hanging from its ceiling, ending in the mouth's rim toward the kelp. (The roof lies above the surface, so in a
    // phone held sideways the cave read as open water, 6 November.)
    const wall = new PIXI.Graphics(); wall.label = 'cave-under-wall';
    const ground = (x) => heightOn(floor.pts, Math.min(Math.max(x, floor.pts[0][0]), floor.pts.at(-1)[0])) ?? h(4);
    const rim = [];
    for (let k = 0; k <= 10; k++) { const u = k / 10; rim.push([h(5.6) + Math.sin(u * Math.PI * .5) * h(1.5) + Math.sin(u * 9) * 10, h(.1) + u * (ground(h(7)) - h(.1))]); }
    const body = [[h(-1.8), h(.1)], ...rim, [h(-1.8), ground(h(-1)) + 20]];
    wall.poly(body.flat()).fill(pen.material('mat-rock', 1, 0x7f9f9b));
    wall.poly(body.flat()).fill({ color: 0x2c4a4c, alpha: .42 });
    wall.poly(body.flat()).fill(pen.hatch(0x1d3a3c, .25));
    // deeper into the cave, darker
    for (let k = 0; k < 5; k++) {
        const x1 = h(5.2 - k * 1.1);
        wall.poly([h(-1.8), h(.1), x1, h(.1), x1 - h(.6), ground(x1) + 20, h(-1.8), ground(h(-1)) + 20].flat()).fill({ color: 0x0f2426, alpha: .07 });
    }
    // strata across it
    for (let i = 0; i < 4; i++) {
        const y = h(.7 + i * .75);
        wall.moveTo(h(-1.6), y).bezierCurveTo(h(.8), y - h(.25), h(2.6), y + h(.2), h(4.6), y - h(.1)).stroke(pen.line(i % 2 ? 0xbacac1 : 0x48655f, 3, i % 2 ? .18 : .3));
    }
    // weed hanging from the ceiling, swaying a little in the dim
    for (const [xHL, len] of [[-.6, .9], [.9, 1.3], [2.2, .7], [3.4, 1.1], [4.6, .8]]) {
        const x = h(xHL), y0 = h(.12);
        wall.moveTo(x, y0).bezierCurveTo(x + 14, y0 + h(len) * .35, x - 14, y0 + h(len) * .7, x + 6, y0 + h(len)).stroke(pen.line(0x3e6a52, 4, .55));
    }
    // the mouth's rim toward the kelp
    wall.moveTo(rim[0][0], rim[0][1]); for (const [x, y] of rim.slice(1)) wall.lineTo(x, y);
    wall.stroke(pen.line(0x34504d, 4.5, .75));
    container.addChildAt(wall, 0);
    return { container };
}
