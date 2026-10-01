/* Drawn landscape continues beyond the playable page. Collision, gates and
 * internal pits remain authored; only the two outside ends receive bleed. */
import { terrainShape } from './terrain-shape.mjs';

const CELL = 800;

/** Grow the painted extent in coarse cells, so a held wide view can reveal
 * more scenery without rebuilding the ground for every camera pixel. */
export function landscapeCoverage(bounds, viewport = null, previous = null) {
    return {
        x0: Math.floor(Math.min(bounds.x0 - CELL, viewport ? viewport.x0 - CELL / 2 : Infinity, previous?.x0 ?? Infinity) / CELL) * CELL,
        x1: Math.ceil(Math.max(bounds.x1 + CELL, viewport ? viewport.x1 + CELL / 2 : -Infinity, previous?.x1 ?? -Infinity) / CELL) * CELL,
        y1: Math.ceil(Math.max(bounds.y1 + CELL, viewport ? viewport.y1 + CELL / 2 : -Infinity, previous?.y1 ?? -Infinity) / CELL) * CELL
    };
}

/** Start with the exact authored tangent, then settle into a low, irregular
 * ridge. The depth is bounded even when a camera frames a very wide page. */
function continuation(endpoint, neighbour, edgeX, side) {
    const distance = Math.abs(edgeX - endpoint[0]);
    if (distance < 1e-6) return [];
    const dx = endpoint[0] - neighbour[0];
    const slope = dx ? (endpoint[1] - neighbour[1]) / dx : 0;
    const settle = 240 / Math.max(.12, Math.abs(slope));
    const count = Math.min(96, Math.max(8, Math.ceil(distance / 90)));
    const points = [];
    for (let i = 1; i <= count; i++) {
        // More samples at the visible join preserve its tangent. Distant
        // scenery can be coarser without using a vast offscreen mesh.
        const d = distance * (i / count) ** 1.5;
        const envelope = (1 - Math.exp(-d / 450)) ** 2;
        const drift = slope * side * settle * (1 - Math.exp(-d / settle));
        const ridge = (Math.sin(d / 370) * 21 + Math.sin(d / 810) * 13) * envelope;
        points.push([endpoint[0] + side * d, endpoint[1] + drift + ridge]);
    }
    return points;
}

export function landscapeShape(surfaces, coverage) {
    // An authored underwater tail already describes the preferred coastline.
    // Include it before finding the outside edges rather than painting over it.
    const drawn = surfaces.map(s => s.tail?.length ? { ...s, pts: [...s.pts, ...s.tail] } : s);
    const shape = terrainShape(drawn);
    if (!shape.runs.length) return { ...shape, extensions: [], coverage: { ...coverage } };
    const runs = shape.runs.map(run => ({ ...run, pts: run.pts.map(p => [...p]) }));
    const first = runs[0], last = runs.at(-1), extensions = [];
    const left = first.pts[0], right = last.pts.at(-1);
    if (coverage.x0 < left[0]) {
        const extra = continuation(left, first.pts[1], coverage.x0, -1).reverse();
        first.pts.unshift(...extra);
        extensions.push({ side: 'left', source: first.s.id, join: [...left], points: [...extra, [...left]] });
    }
    if (coverage.x1 > right[0]) {
        const extra = continuation(right, last.pts.at(-2), coverage.x1, 1);
        last.pts.push(...extra);
        extensions.push({ side: 'right', source: last.s.id, join: [...right], points: [[...right], ...extra] });
    }
    // Join exactly as terrainShape does: a disconnected internal contour stays
    // disconnected, and real vertical terrace faces stay fully outlined.
    const outlines = [];
    for (const run of runs) {
        const previous = outlines.at(-1), a = run.pts[0];
        if (previous && Math.abs(previous.at(-1)[0] - a[0]) < 1e-6) {
            if (Math.abs(previous.at(-1)[1] - a[1]) > 1e-6) previous.push(a);
            previous.push(...run.pts.slice(1));
        } else outlines.push(run.pts.slice());
    }
    return { runs, outlines, extensions, coverage: { ...coverage } };
}
