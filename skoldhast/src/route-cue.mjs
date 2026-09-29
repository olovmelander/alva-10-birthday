/* Reserved-paper route marks: bounded, built once, legible on wood and water. */
const clamp = n => Math.max(0, Math.min(1, n));

export function routePoint(points, distance) {
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (distance <= length || i === points.length - 1) {
            const k = clamp(distance / (length || 1));
            return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k,
                angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
        }
        distance -= length;
    }
    return { x: points[0][0], y: points[0][1], angle: 0 };
}

/** The white margin and repeated arrow shape remain readable without colour. */
export function createRouteCue(PIXI, points, { water = false, label = '' } = {}) {
    const container = new PIXI.Container();
    container.label = 'route-' + label;
    const length = points.slice(1).reduce((n, b, i) => n + Math.hypot(b[0] - points[i][0], b[1] - points[i][1]), 0);
    const marks = [], ink = water ? 0x244f68 : 0x433c32;
    function stroke(g, draw) {
        draw(g); g.stroke({ width: 17, color: 0x494237, alpha: .28, cap: 'round', join: 'round' });
        draw(g); g.stroke({ width: 13, color: 0xfffbeb, alpha: .96, cap: 'round', join: 'round' });
        draw(g); g.stroke({ width: 5, color: ink, alpha: .95, cap: 'round', join: 'round' });
    }
    const count = Math.max(2, Math.ceil(length / 78));
    for (let i = 0; i < count; i++) {
        const distance = (i + .45) / count * length, p = routePoint(points, distance);
        const g = new PIXI.Graphics(), arrow = i % 4 === 2;
        stroke(g, line => {
            line.moveTo(-22, 0).lineTo(22, 0);
            if (arrow) line.moveTo(10, -10).lineTo(23, 0).lineTo(10, 10);
        });
        // One broken grain stroke is enough to avoid a smooth neon edge.
        g.moveTo(-13, -2).lineTo(-3, -2).moveTo(7, 2).lineTo(15, 2)
            .stroke({ width: 1.1, color: 0xfffbeb, alpha: .7 });
        g.position.set(p.x, p.y - (water ? 0 : 7)); g.rotation = p.angle;
        container.addChild(g); marks.push({ g, at: distance / length, arrow });
    }
    // A hollow diamond marks the start; a double pencil tick marks the end.
    for (const end of [false, true]) {
        const p = routePoint(points, end ? length : 0), g = new PIXI.Graphics();
        stroke(g, line => end
            ? line.moveTo(-9, -13).lineTo(-9, 13).moveTo(7, -13).lineTo(7, 13)
            : line.moveTo(-11, 0).lineTo(0, -12).lineTo(11, 0).lineTo(0, 12).lineTo(-11, 0));
        g.position.set(p.x, p.y - (water ? 0 : 7)); g.rotation = p.angle;
        container.addChild(g); marks.push({ g, at: end ? 1 : 0, arrow: true });
    }
    const data = { length, count: marks.length, reveal: 1, completed: false, water };
    container.routeCue = data;
    return {
        container,
        update({ visible = true, completed = false, reveal = 1, time = 0, reducedMotion = false } = {}) {
            container.visible = visible;
            data.reveal = reveal; data.completed = completed;
            if (!visible) return;
            for (const mark of marks) {
                const shown = clamp((reveal - mark.at) * 10 + (reveal >= 1 ? 1 : 0));
                // Completed line keeps its quiet route edges beside the solid ink.
                mark.g.alpha = shown * (completed ? .34 : .91 + (reducedMotion ? 0 : Math.sin(time * 1.5 - mark.at * 4) * .06));
                mark.g.visible = shown > 0;
            }
        }
    };
}

/** A lighthouse beam is hatched paper light, never a filtered spotlight. */
export function createPencilBeam(PIXI) {
    const container = new PIXI.Container();
    container.label = 'lighthouse-pencil-beam';
    const edge = new PIXI.Graphics();
    edge.moveTo(0, -9).lineTo(-770, -84).moveTo(0, 9).lineTo(-770, 84)
        .stroke({ width: 3, color: 0x485764, alpha: .25 });
    edge.moveTo(-16, 0).lineTo(-340, 2).lineTo(-724, 5)
        .stroke({ width: 7, color: 0xfffbe9, alpha: .55 });
    edge.moveTo(-24, 4).lineTo(-346, 5).lineTo(-718, 8)
        .stroke({ width: 1.4, color: 0xcbb779, alpha: .45 });
    container.addChild(edge);
    for (let i = 0; i < 11; i++) {
        const offset = (i - 5) / 5, g = new PIXI.Graphics();
        const x = -590 - (i % 3) * 65;
        g.moveTo(-12, offset * 8).lineTo(x, offset * 73)
            .stroke({ width: 13, color: 0xfff6c8, alpha: .08 + (1 - Math.abs(offset)) * .065 });
        g.moveTo(-20, offset * 8).lineTo(x * .44, offset * 32).moveTo(x * .5, offset * 38).lineTo(x, offset * 73)
            .stroke({ width: 2.3, color: 0xfffbea, alpha: .23 + (1 - Math.abs(offset)) * .21 });
        container.addChild(g);
    }
    return container;
}
