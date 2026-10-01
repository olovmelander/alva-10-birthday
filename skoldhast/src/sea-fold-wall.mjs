/* Veckmuren is a bent piece of the drawn ocean, never a pane of glass. */
export function seaFoldWallLayout({ x, top, bottom, width = 430 }) {
    if (![x, top, bottom, width].every(Number.isFinite) || bottom <= top || width <= 0)
        throw new RangeError('A sea fold needs finite bounds and a positive size.');
    const height = bottom - top;
    const lip = Math.min(88, height * .065), reverse = Math.min(38, width * .085);
    return {
        x, top, bottom, width, height, lip, reverse,
        // The graphite hinge is the collision boundary; artwork on the back
        // face lies beyond it. The narrow pale side is the paper's reverse.
        hinge: [[x, top + lip], [x, bottom]],
        face: [[x, top + lip], [x + width * .67, top], [x + width, top + lip * .18], [x + width, bottom], [x, bottom]],
        back: [[x - reverse, top + lip * 1.23], [x + width * .66, top - 13], [x + width, top + lip * .18], [x + width * .67, top], [x, top + lip], [x, bottom], [x - reverse * .55, bottom]],
        shadow: [[x - reverse - 24, top + lip * 1.23], [x - reverse, top + lip * 1.23], [x - reverse * .55, bottom], [x - reverse * .55 - 24, bottom]]
    };
}

/** The near crease stays authored; only its far painted face continues past
 * the camera. Nothing in this geometry changes the collision hinge. */
export function seaFoldFaceContinuation(layout, right) {
    const start = layout.x + layout.width, end = Math.max(start, right);
    const top = layout.top + layout.lip * .18;
    return { x0: start, x1: end, top, bottom: layout.bottom,
        points: [[start, top], [end, top], [end, layout.bottom], [start, layout.bottom]] };
}

function pencilLine(g, points, color, width, alpha = 1) {
    g.moveTo(...points[0]);
    for (const point of points.slice(1)) g.lineTo(...point);
    g.stroke({ color, width, alpha, cap: 'round', join: 'round' });
}

/** The large world fold. No scene state, animation clock or collision writes. */
export function createSeaFoldWall(PIXI, { texture, ...options } = {}) {
    const layout = seaFoldWallLayout(options);
    const { x, top, bottom, width, height, lip, reverse } = layout;
    const container = new PIXI.Container(); container.label = 'drawn-sea-fold';
    const paper = new PIXI.Graphics(), sea = new PIXI.Graphics(), marks = new PIXI.Graphics();
    const continuation = new PIXI.Graphics(); continuation.label = 'sea-fold-face-continuation';
    container.addChild(paper, continuation, sea, marks);
    paper.poly(layout.shadow.flat()).fill({ color: 0x384b48, alpha: .16 });
    paper.poly(layout.back.flat()).fill(0xeee2c4).stroke({ color: 0x82775f, width: 2.4, alpha: .9 });
    const paperTexture = texture?.('mat-paper'), seaTexture = texture?.('mat-deep');
    if (paperTexture) paper.poly(layout.back.flat()).fill({ texture: paperTexture, textureSpace: 'global', alpha: .68 });
    // Irregular pencil pressure across the reverse, not vertical glass glints.
    for (let y = top + lip * 1.3; y < bottom - 12; y += 19) {
        const depth = (y - top) / height, a = x - reverse * (1 - depth * .42);
        pencilLine(paper, [[a + 3, y + 5], [x - 3, y - 5]], 0x988666, 1.5, .24);
    }
    sea.poly(layout.face.flat()).fill(0x79a7ae);
    if (seaTexture) sea.poly(layout.face.flat()).fill({ texture: seaTexture, textureSpace: 'global', color: 0xbad3c2, alpha: .5 });
    // Broad changes in pencil pressure give depth while retaining paper grain.
    const bodyTop = top + lip;
    for (let i = 0; i < 22; i++) {
        const y0 = bodyTop + (bottom - bodyTop) * i / 22, y1 = bodyTop + (bottom - bodyTop) * (i + 1) / 22;
        sea.rect(x, y0, width, y1 - y0 + .5).fill({ color: 0x37637c, alpha: .08 + i / 22 * .24 });
    }
    for (let y = bodyTop + 14, row = 0; y < bottom - 8; y += 14, row++) {
        const phase = Math.sin(row * 2.39), start = x + 7 + (row % 3) * 10;
        for (let k = 0; k < 4; k++) {
            const xa = start + k * width * .25, xb = Math.min(x + width - 4, xa + width * (.15 + .07 * (1 + phase) / 2));
            if (xb <= xa) continue;
            pencilLine(sea, [[xa, y], [xb, y - 2 + phase * 2]], row % 4 ? 0x477c8b : 0xb2c3b0, 1.6 + row % 2 * .4, row % 4 ? .28 : .24);
        }
    }
    // Traces from the painted sea continue around the crease onto its raised
    // face. The interrupted curves make the material turn readable at a glance.
    for (const [v, span] of [[.22, .42], [.5, .7], [.77, .54]]) {
        const y = bodyTop + (bottom - bodyTop) * v;
        marks.moveTo(x - 98, y + 17).quadraticCurveTo(x - 45, y + 1, x - reverse, y + 5)
            .stroke({ color: 0x658e97, width: 3.2, alpha: .65, cap: 'round' });
        marks.moveTo(x + 5, y + 3).quadraticCurveTo(x + width * .21, y - 34, x + width * span, y - 23)
            .stroke({ color: 0xadc4b7, width: 3.5, alpha: .65, cap: 'round' });
        marks.moveTo(x + 7, y + 8).quadraticCurveTo(x + width * .22, y - 25, x + width * span, y - 17)
            .stroke({ color: 0x355b72, width: 1.9, alpha: .56, cap: 'round' });
    }
    // These fish are drawn ON the page: static blue pencil and no glow.
    for (const [u, v, size] of [[.56, .34, 24], [.7, .62, 17]]) {
        const fx = x + width * u, fy = bodyTop + (bottom - bodyTop) * v;
        const s = size * Math.min(1.2, width / 430);
        marks.moveTo(fx - s, fy).quadraticCurveTo(fx, fy - s * .6, fx + s, fy)
            .quadraticCurveTo(fx, fy + s * .55, fx - s, fy)
            .lineTo(fx - s * 1.5, fy - s * .6).lineTo(fx - s * 1.5, fy + s * .6).lineTo(fx - s, fy)
            .stroke({ color: 0x426c80, width: 2.1, alpha: .65, cap: 'round', join: 'round' });
        marks.circle(fx + s * .53, fy - s * .05, 1.8).fill({ color: 0x3d5968, alpha: .65 });
    }
    // Kelp ink bends onto the upright page near its foot instead of looking
    // like free-floating vegetation behind a transparent slab.
    const fy = bottom - 18;
    for (let i = 0; i < 3; i++) {
        const fx = x + width * (.33 + i * .16), stalk = 88 + i * 19;
        marks.moveTo(fx, fy).quadraticCurveTo(fx - 16, fy - stalk * .5, fx + 9, fy - stalk)
            .stroke({ color: 0x547668, width: 4, alpha: .6, cap: 'round' });
        for (let j = 1; j <= 3; j++) {
            const yy = fy - stalk * j / 4, direction = j % 2 ? 1 : -1;
            marks.moveTo(fx, yy).quadraticCurveTo(fx + direction * 19, yy - 8, fx + direction * 23, yy - 24)
                .stroke({ color: 0x698a72, width: 3.4, alpha: .58, cap: 'round' });
        }
    }
    // A firm graphite crease replaces the old slab's white specular streaks.
    pencilLine(marks, layout.hinge, 0x535b53, 4, .92);
    pencilLine(marks, [[x + 4, top + lip + 9], [x + 5, bottom - 4]], 0x304956, 1.5, .35);
    pencilLine(marks, layout.face.slice(0, 3), 0x476a76, 2.7, .8);
    let destroyed = false;
    let coveredRight = x + width;
    return {
        container, layout,
        extendTo(right) {
            if (destroyed || !Number.isFinite(right) || right <= coveredRight) return;
            coveredRight = Math.ceil(right / 200) * 200;
            const shape = seaFoldFaceContinuation(layout, coveredRight);
            continuation.clear().poly(shape.points.flat()).fill(0x79a7ae);
            if (seaTexture) continuation.poly(shape.points.flat()).fill({ texture: seaTexture,
                textureSpace: 'global', color: 0xbad3c2, alpha: .5 });
            for (let i = 0; i < 22; i++) {
                const y0 = bodyTop + (bottom - bodyTop) * i / 22, y1 = bodyTop + (bottom - bodyTop) * (i + 1) / 22;
                continuation.rect(shape.x0, y0, shape.x1 - shape.x0, y1 - y0 + .5)
                    .fill({ color: 0x37637c, alpha: .08 + i / 22 * .24 });
            }
            for (let y = bodyTop + 14, row = 0; y < bottom - 8; y += 14, row++) {
                const phase = Math.sin(row * 2.39), start = x + 7 + (row % 3) * 10;
                for (let k = 4; start + k * width * .25 < coveredRight; k++) {
                    const xa = start + k * width * .25, xb = Math.min(coveredRight - 4, xa + width * (.15 + .07 * (1 + phase) / 2));
                    if (xb <= xa) continue;
                    pencilLine(continuation, [[xa, y], [xb, y - 2 + phase * 2]], row % 4 ? 0x477c8b : 0xb2c3b0,
                        1.6 + row % 2 * .4, row % 4 ? .28 : .24);
                }
            }
            pencilLine(continuation, shape.points.slice(0, 2), 0x476a76, 2.7, .8);
            continuation.seaFoldCoverage = shape;
        },
        destroy() {
            if (destroyed) return; destroyed = true;
            container.parent?.removeChild(container);
            if (!container.destroyed) container.destroy({ children: true });
        }
    };
}

/**
 * Optional edge for the chapter cover: the folded-over sea has a painted lip
 * facing the player and a narrow paper reverse. It does not reveal covered
 * chapter geometry or change the cover's state. Caller attaches to that cover.
 */
export function createSeaFoldCoverEdge(PIXI, { texture, x, top, bottom, width = 80 } = {}) {
    const g = new PIXI.Graphics(); g.label = 'sea-cover-fold-edge';
    const paper = texture?.('mat-paper');
    const face = [x - width, top, x - width * .22, top, x - width * .22, bottom, x - width, bottom];
    g.poly(face).fill({ color: 0x719ca7, alpha: .98 });
    const reverse = [x - width * .22, top, x + width * .16, top, x + width * .16, bottom, x - width * .22, bottom];
    g.poly(reverse).fill(0xe4d8ba);
    if (paper) g.poly(reverse).fill({ texture: paper, textureSpace: 'global', alpha: .6 });
    for (let y = top + 15, i = 0; y < bottom; y += 21, i++) {
        pencilLine(g, [[x - width + 4, y + 2], [x - width * .25, y - 3]], 0x3c697d, 1.9, .25);
        if (i % 7 === 0) {
            g.moveTo(x - width - 72, y + 5).quadraticCurveTo(x - width - 25, y - 7, x - width, y)
                .stroke({ color: 0x799fa5, width: 2.5, alpha: .55 });
        }
    }
    pencilLine(g, [[x - width * .22, top], [x - width * .22, bottom]], 0x5c665c, 3.2, .8);
    pencilLine(g, [[x + width * .16, top], [x + width * .16, bottom]], 0x897c63, 1.4, .6);
    return g;
}
