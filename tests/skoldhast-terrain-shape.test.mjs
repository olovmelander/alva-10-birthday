import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainShape } from '../skoldhast/src/terrain-shape.mjs';
import { Terrain, heightOn } from '../skoldhast/src/sim.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';

test('visible hill contour equals active collision surfaces before and after every ramp', () => {
    for (const flags of [[], ['p3_t1'], ['p3_t1', 'p3_t2'], ['p3_t1', 'p3_t2', 'p3_t3']]) {
        const terrain = new Terrain(SCENES.land, new Set(flags));
        const shape = terrainShape(terrain.surfaces);
        for (let x = 13.1 * 200; x < 49 * 200; x += 7) {
            const actual = shape.runs.map(r => heightOn(r.pts, x)).filter(y => y !== null);
            const expected = terrain.surfaces.filter(s => !s.thin).map(s => heightOn(s.pts, x)).filter(y => y !== null);
            assert.ok(Math.abs(Math.min(...actual) - Math.min(...expected)) < 1e-6, `${flags} at ${x}`);
            const interiors = shape.runs.filter(r => x > r.pts[0][0] + 1e-6 && x < r.pts.at(-1)[0] - 1e-6);
            assert.ok(interiors.length <= 1, 'no overlapping opaque fill interiors (shared endpoints are allowed)');
        }
    }
});

test('cliff outlines span actual terrace heights and omit continuous material joins', () => {
    const shape = terrainShape(SCENES.land.surfaces.filter(s => !s.when));
    const pts = shape.outlines.flatMap(p => p.slice(1).map((b,i) => [p[i], b]));
    assert.ok(pts.some(([a,b]) => a[0] === 7200 && b[0] === 7200 && a[1] === -800 && b[1] === -590));
    assert.ok(!pts.some(([a,b]) => a[0] === 20760 && b[0] === 20760 && Math.abs(a[1]-b[1]) > 1e-6));
});

test('crossing surfaces split at their intersection, without drawing a buried edge', () => {
    const a = { pts: [[0,0],[10,10]] }, b = { pts: [[0,10],[10,0]] };
    assert.deepEqual(terrainShape([a,b]).outlines, [[[0,0],[5,5],[10,0]]]);
});
