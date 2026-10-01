/* Vattenporten's inside: a quiet distant rock vault opening toward the kelp.
 * The ceiling stays above the swimming route; this is rear scenery, never a
 * new collision surface or an obstacle placed across the way back to land. */
import { HL, heightOn } from './sim.mjs';

export function createCoastalCave(PIXI, { def, texture = () => null }) {
    const container = new PIXI.Container(); container.label = 'coastal-cave';
    if (def.id !== 'kelp') return { container };
    const h = n => n * HL;
    const roof = new PIXI.Graphics(); roof.label = 'cave-distant-roof';
    function roofPath(g) {
        return g.moveTo(h(-12), h(-14)).lineTo(h(9), h(-14)).lineTo(h(9), h(-5.5))
            .bezierCurveTo(h(8.8), h(-3.3), h(7.6), h(-1.9), h(6.6), h(-1.7))
            .bezierCurveTo(h(4.8), h(-1.25), h(2.9), h(-.9), h(1.1), h(-1.25))
            .bezierCurveTo(h(-.5), h(-1.45), h(-1.6), h(-.05), h(-1.9), h(2.1))
            .lineTo(h(-12), h(3)).closePath();
    }
    roofPath(roof).fill({ color: 0x8baaa6 });
    const rock = texture('mat-rock');
    if (rock) roofPath(roof).fill({ texture: rock, textureSpace: 'global', alpha: .24 });
    roof.moveTo(h(-1.9), h(2.1))
        .bezierCurveTo(h(-1.6), h(-.05), h(-.5), h(-1.45), h(1.1), h(-1.25))
        .bezierCurveTo(h(2.9), h(-.9), h(4.8), h(-1.25), h(6.6), h(-1.7))
        .bezierCurveTo(h(7.6), h(-1.9), h(8.8), h(-3.3), h(9), h(-5.5))
        .stroke({ color: 0x5b7977, width: 5, alpha: .7, cap: 'round' });
    // Long pressure-varied strata describe curved stone instead of repeating
    // bright scratches over the entire cave and its empty swimming space.
    for (let i = 0; i < 8; i++) {
        const y = -1.65 - i * .3;
        roof.moveTo(h(-2.4), h(y + .2)).bezierCurveTo(h(.3), h(y - .35), h(2.6), h(y + .22), h(4.2), h(y - .15))
            .bezierCurveTo(h(5.6), h(y - .46), h(6.9), h(y - .3), h(7.9), h(y - 1.1))
            .stroke({ color: i % 3 ? 0xbacac1 : 0x678881, width: i % 3 ? 3 : 4.5, alpha: .27, cap: 'round' });
    }
    container.addChild(roof);
    const floor = def.surfaces.find(s => s.id === 'cave-floor');
    const details = new PIXI.Graphics(); details.label = 'cave-bed-details';
    for (const [xHL, scale] of [[.45, .7], [2.8, .45], [4.1, .8], [5.7, .5], [6.45, .6]]) {
        const x = h(xHL), y = heightOn(floor.pts, x);
        details.moveTo(x - 42 * scale, y).quadraticCurveTo(x - 20 * scale, y - 43 * scale, x + 18 * scale, y - 22 * scale)
            .quadraticCurveTo(x + 36 * scale, y - 11 * scale, x + 42 * scale, y)
            .fill({ color: 0x93afa7 }).stroke({ color: 0x617f79, width: 2.1, alpha: .65 });
        details.moveTo(x - 23 * scale, y - 15 * scale).lineTo(x + 12 * scale, y - 19 * scale)
            .stroke({ color: 0xd0d8c4, width: 3, alpha: .55 });
    }
    container.addChild(details);
    return { container };
}
