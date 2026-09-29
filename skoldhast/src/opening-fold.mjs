/* The first fold crosses the last point of Alva's shoreline, in paper space.
 * A triangular sea corner turns UNDER the remaining sheet. The back carries
 * paper only: lettering on the painted front is never mirrored. */
export function openingCrease(width, height, endpoint) {
    const [x, y] = endpoint;
    const top = (x * height - width * y) / (height - y);
    const a = [top, 0], b = [width, height];
    const length = Math.hypot(b[0] - a[0], height);
    return { a, b, tip: [width, 0], normal: [height / length, -(width - top) / length] };
}

export function foldPoint(point, crease, progress) {
    const angle = Math.PI * Math.max(0, Math.min(1, progress));
    const [nx, ny] = crease.normal;
    const d = (point[0] - crease.a[0]) * nx + (point[1] - crease.a[1]) * ny;
    // Foreshortening plus a slight cast towards the viewer at mid-lift.
    const lift = Math.sin(angle) * d;
    return [point[0] + nx * d * (Math.cos(angle) - 1),
        point[1] + ny * d * (Math.cos(angle) - 1) - lift * .16];
}

export function createOpeningFold(PIXI, { parent, sheet, front, paper, width, height, endpoint }) {
    const crease = openingCrease(width, height, endpoint);
    const { a, b, tip } = crease;
    const rest = [a, tip, b];
    const positions = new Float32Array(rest.flat());
    const frontUV = new Float32Array(rest.flatMap(([x, y]) => [x / width, y / height]));
    const backUV = new Float32Array(rest.flatMap(([x, y]) => [x / (paper?.width || width), y / (paper?.height || height)]));
    const indices = new Uint32Array([0, 1, 2]);
    const frontGeometry = new PIXI.MeshGeometry({ positions, uvs: frontUV, indices });
    const backGeometry = new PIXI.MeshGeometry({ positions: positions.slice(), uvs: backUV, indices: indices.slice() });
    const painted = new PIXI.Mesh({ geometry: frontGeometry, texture: front });
    const reverse = new PIXI.Mesh({ geometry: backGeometry, texture: paper || PIXI.Texture.WHITE });
    if (!paper) reverse.tint = 0xf4eddb;
    const flap = new PIXI.Container(); flap.label = 'opening-sea-flap';
    const outline = new PIXI.Graphics();
    flap.addChild(painted, reverse, outline);
    const mask = new PIXI.Graphics().poly([0, 0, ...a, ...b, 0, height]).fill(0xffffff);
    mask.label = 'opening-paper-mask';
    parent.addChild(mask); sheet.mask = mask;
    parent.addChildAt(flap, parent.getChildIndex(sheet) + 1);
    const edge = new PIXI.Graphics(); edge.label = 'opening-crease';
    parent.addChildAt(edge, parent.getChildIndex(flap) + 1);
    let dead = false;
    function set(progress, { lessMotion = false } = {}) {
        if (dead) return;
        const p = Math.max(0, Math.min(1, progress));
        // Reduced motion keeps the before/after states; no rotating paper.
        const geometryP = lessMotion ? (p < .5 ? 0 : 1) : p;
        const pts = rest.map(point => foldPoint(point, crease, geometryP));
        positions.set(pts.flat());
        frontGeometry.getBuffer('aPosition').update();
        backGeometry.getBuffer('aPosition').data.set(positions);
        backGeometry.getBuffer('aPosition').update();
        painted.visible = geometryP <= .5; reverse.visible = geometryP > .5;
        // The flap slips below the sheet as its reverse becomes visible.
        if (geometryP > .5) parent.setChildIndex(flap, Math.max(0, parent.getChildIndex(sheet) - 1));
        else parent.setChildIndex(flap, parent.getChildIndex(sheet) + 1);
        painted.tint = p < .5 ? 0xffffff - Math.round(Math.sin(p * Math.PI) * 30) * 0x010101 : 0xffffff;
        outline.clear().poly(pts.flat()).stroke({ width: 2, color: 0x63584b, alpha: .55 });
        edge.clear();
        if (p > 0) {
            // Layered narrow strokes give the paper thickness and a soft shadow.
            edge.moveTo(...a).lineTo(...b).stroke({ width: 16, color: 0x4c4033, alpha: .035 * p });
            edge.moveTo(...a).lineTo(...b).stroke({ width: 8, color: 0x4c4033, alpha: .07 * p });
            edge.moveTo(...a).lineTo(...b).stroke({ width: 3, color: 0x5b635e, alpha: .7 * p });
            edge.moveTo(a[0] - 3, a[1]).lineTo(b[0] - 3, b[1]).stroke({ width: 2, color: 0xfffbed, alpha: p });
            // A blue rim: the sea is tucked inside this paper, not erased.
            for (let i = 0; i < 12; i++) {
                const u = .47 + i * .025;
                const x = a[0] + (b[0] - a[0]) * u, y = height * u;
                edge.moveTo(x - 5, y).lineTo(x - 2, y + 10).stroke({ width: 2.5, color: 0x426d89, alpha: p * .65 });
            }
        }
        flap.label = p === 1 ? 'opening-sea-folded' : 'opening-sea-flap';
    }
    set(0);
    return { crease, set, destroy() {
        if (dead) return; dead = true;
        sheet.mask = null;
        flap.destroy({ children: true }); edge.destroy(); mask.destroy();
        frontGeometry.destroy(); backGeometry.destroy(); front.destroy(true);
    } };
}
