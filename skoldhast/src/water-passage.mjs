/* Two views along the same submerged headland. This is scenery beside the
 * swimming route, not a tunnel through Veckmuren or another collision roof. */
import { HL, heightOn } from './sim.mjs';

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

export function createWaterPassage(PIXI, { def, texture = () => null }) {
    const layout = waterPassageLayout(def);
    const container = new PIXI.Container(); container.label = 'water-passage-' + def.id;
    if (!layout) return { container, layout };
    container.waterPassage = layout;
    const rock = new PIXI.Graphics(); rock.label = 'headland-shale-shoulder';
    const { x, y, width: w, height: tall } = layout.shoulder, dir = layout.direction;
    const path = g => g.moveTo(x - dir * w * .56, y + 7)
        .bezierCurveTo(x - dir * w * .32, y - tall * .2, x - dir * w * .46, y - tall * .65, x - dir * w * .14, y - tall * .84)
        .bezierCurveTo(x + dir * w * .09, y - tall * 1.03, x + dir * w * .42, y - tall * .85, x + dir * w * .52, y - tall * .68)
        .lineTo(x + dir * w * .65, y + 12).closePath();
    path(rock).fill({ color: 0x849b93, alpha: .9 });
    const material = texture('mat-rock');
    if (material) path(rock).fill({ texture: material, textureSpace: 'global', color: 0xa9b8a0, alpha: .24 });
    // Broken pencil strata identify the same rounded headland from either
    // side. No luminous arch or enclosing edge suggests a magic doorway.
    for (let i = 0; i < 9; i++) {
        const yy = y - tall * (.12 + i * .072);
        rock.moveTo(x - dir * w * (.26 - i * .013), yy)
            .quadraticCurveTo(x + dir * w * .06, yy - 14, x + dir * w * .4, yy + 9)
            .stroke({ color: i % 3 === 0 ? 0xc8ceb3 : 0x536f6a, width: i % 3 === 0 ? 4.4 : 2.1,
                alpha: i % 3 === 0 ? .64 : .36, cap: 'round' });
    }
    container.addChild(rock);
    const bed = new PIXI.Graphics(); bed.label = 'headland-seabed-details';
    for (const stone of layout.pebbles) {
        const { x: at, y: floor, size } = stone;
        bed.moveTo(at - size, floor + 1).quadraticCurveTo(at - size * .4, floor - size * .75, at + size * .45, floor - size * .42)
            .quadraticCurveTo(at + size, floor - size * .26, at + size * 1.15, floor + 1)
            .fill({ color: 0x94a08c }).stroke({ color: 0x5e7970, width: 2, alpha: .66 });
        bed.moveTo(at - size * .6, floor - size * .23).lineTo(at + size * .44, floor - size * .32)
            .stroke({ color: 0xd2d1b4, width: 2.5, alpha: .72, cap: 'round' });
    }
    for (const frond of layout.fronds) {
        const { x: at, y: floor, height: tall } = frond;
        bed.ellipse(at, floor, 16, 5).fill({ color: 0x496d59, alpha: .35 });
        for (const offset of [-.22, .18]) {
            const tx = at + dir * tall * offset, ty = floor - tall * (offset < 0 ? 1 : .78);
            bed.moveTo(at, floor).bezierCurveTo(at - dir * 14, floor - tall * .32, tx + dir * 18, ty + tall * .27, tx, ty)
                .stroke({ color: 0x53785d, width: 5, alpha: .8, cap: 'round' });
            for (let j = 1; j < 4; j++) {
                const yy = floor - tall * j / 5;
                bed.moveTo(at, yy).quadraticCurveTo(at + dir * 22, yy - 15, at + dir * 29, yy - 28)
                    .stroke({ color: 0x82a377, width: 7, alpha: .82, cap: 'round' });
            }
        }
    }
    container.addChild(bed);
    return { container, layout };
}
