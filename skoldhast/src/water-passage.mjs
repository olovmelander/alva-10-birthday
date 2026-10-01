/* Two views along the same submerged headland. This is scenery beside the
 * swimming route, not a tunnel through Veckmuren or another collision roof. */
import { HL, heightOn } from './sim.mjs';
import { pencilStyle } from './pencil-style.mjs';

const h = value => value * HL;

export function waterPassageLayout(def) {
    const passage = def.waterPassage;
    if (!passage) return null;
    const { x, y, dir } = passage;
    const floorAt = at => {
        for (const surface of def.surfaces) {
            if (surface.thin) continue;
            const ground = heightOn(surface.pts, at);
            if (ground !== null && ground !== undefined) return ground;
        }
        return passage.bed;
    };
    const rockX = x + dir * h(.78), rockY = floorAt(rockX);
    return {
        side: passage.side, mouth: { x, y }, direction: dir,
        waterTop: def.waters.find(w => w.id === passage.water).top,
        // A distant shoulder turns away from us; the near, open sea stays
        // unobstructed. The opposite view repeats its three pale shale veins.
        shoulder: { x: rockX, y: rockY, width: h(1.62), height: h(2.85) },
        pebbles: [.32, .94, 1.55, 2.12].map((offset, i) => {
            const at = x - dir * h(offset);
            return { x: at, y: floorAt(at), size: 17 + (i % 3) * 6 };
        }),
        fronds: [.58, 1.34].map((offset, i) => {
            const at = x - dir * h(offset);
            return { x: at, y: floorAt(at), height: h(.58 + i * .18) };
        })
    };
}

/** A closed outline through the midpoints of its corners: a hand-drawn soft outcrop. */
function softShape(g, pts) {
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const n = pts.length, first = mid(pts[n - 1], pts[0]);
    g.moveTo(...first);
    for (let i = 0; i < n; i++) g.quadraticCurveTo(...pts[i], ...mid(pts[i], pts[(i + 1) % n]));
    return g.closePath();
}

export function createWaterPassage(PIXI, { def, texture = () => null }) {
    const layout = waterPassageLayout(def);
    const container = new PIXI.Container(); container.label = 'water-passage-' + def.id;
    if (!layout) return { container, layout };
    container.waterPassage = layout;
    const pen = pencilStyle(texture);
    const rock = new PIXI.Graphics(); rock.label = 'headland-shale-shoulder';
    const { x, y, width: w, height: tall } = layout.shoulder, dir = layout.direction;
    // A weathered outcrop of the same layered rock as the shore, stepped and
    // leaning, never a smooth arch that could read as a doorway.
    // broad at its foot and stepped up its flanks: a mound of stone, never an upright slab
    const outline = [[-.78, .05], [-.64, -.1], [-.6, -.26], [-.47, -.37], [-.49, -.5], [-.34, -.6], [-.2, -.68],
        [-.04, -.72], [.08, -.84], [.24, -.82], [.35, -.71], [.41, -.57], [.54, -.49], [.6, -.33], [.74, -.19], [.88, .06]];
    const place = ([u, v]) => [x + dir * w * u, y + tall * v + (v > 0 ? 8 : 0)];
    const corners = outline.map(place);
    const shape = () => softShape(rock, corners);
    shape().fill(pen.material('mat-rock', 1, 0x849b93));
    // seen through the sea: cooled by the water in front of it, but still stone
    // (deeper in the kelp sea, whose own veil is lighter than the bay's)
    shape().fill({ color: def.underwater ? 0x3d6865 : 0x4f7c79, alpha: def.underwater ? .48 : .32 });
    shape().fill(pen.hatch(0x2c5254, .18));
    // the side turned from the light, laid in with the same hand's strokes
    softShape(rock, outline.map(([u, v]) => place([Math.max(u, .1), v]))).fill(pen.hatch(0x22474b, .3));
    softShape(rock, outline.map(([u, v]) => place([u, Math.max(v, -.32)]))).fill(pen.hatch(0x1e3f40, .2));
    // Broken pencil strata identify the same rounded headland from either
    // side. No luminous arch or enclosing edge suggests a magic doorway.
    for (let i = 0; i < 8; i++) {
        const yy = y - tall * (.1 + i * .09), reach = .5 - Math.abs(i - 3.5) * .035;
        rock.moveTo(x - dir * w * (reach - .06), yy + 6)
            .quadraticCurveTo(x + dir * w * .05, yy - 12 - (i % 3) * 3, x + dir * w * (reach + .02), yy + 8)
            .stroke(pen.line(i % 3 === 0 ? 0xc8ceb3 : 0x40605c, i % 3 === 0 ? 3.6 : 2, i % 3 === 0 ? .55 : .5));
    }
    shape().stroke(pen.line(0x2b4240, 3.6, .9));
    container.addChild(rock);
    const bed = new PIXI.Graphics(); bed.label = 'headland-seabed-details';
    for (const stone of layout.pebbles) {
        const { x: at, y: floor, size } = stone;
        bed.moveTo(at - size, floor + 1).quadraticCurveTo(at - size * .4, floor - size * .75, at + size * .45, floor - size * .42)
            .quadraticCurveTo(at + size, floor - size * .26, at + size * 1.15, floor + 1)
            .fill(pen.material('mat-rock', 1, 0x94a08c));
        bed.moveTo(at - size, floor + 1).quadraticCurveTo(at - size * .4, floor - size * .75, at + size * .45, floor - size * .42)
            .quadraticCurveTo(at + size, floor - size * .26, at + size * 1.15, floor + 1)
            .fill({ color: 0x7fa29a, alpha: .3 }).stroke(pen.line(0x4e6c64, 2.2, .75));
        bed.moveTo(at - size * .6, floor - size * .23).lineTo(at + size * .44, floor - size * .32)
            .stroke(pen.line(0xd2d1b4, 2.5, .6));
    }
    for (const frond of layout.fronds) {
        const { x: at, y: floor, height: tall } = frond;
        bed.ellipse(at, floor, 16, 5).fill(pen.hatch(0x2f4f42, .45));
        for (const offset of [-.22, .18]) {
            const tx = at + dir * tall * offset, ty = floor - tall * (offset < 0 ? 1 : .78);
            bed.moveTo(at, floor).bezierCurveTo(at - dir * 14, floor - tall * .32, tx + dir * 18, ty + tall * .27, tx, ty)
                .stroke(pen.line(0x3e6a4a, 5, .85));
            for (let j = 1; j < 4; j++) {
                const yy = floor - tall * j / 5;
                bed.moveTo(at, yy).quadraticCurveTo(at + dir * 22, yy - 15, at + dir * 29, yy - 28)
                    .stroke(pen.line(0x5f8f55, 7, .85));
            }
        }
    }
    container.addChild(bed);
    return { container, layout };
}
