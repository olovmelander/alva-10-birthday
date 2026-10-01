import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landscapeCoverage, landscapeShape } from '../skoldhast/src/landscape-edges.mjs';
import { terrainShape } from '../skoldhast/src/terrain-shape.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';
import { Terrain, heightOn } from '../skoldhast/src/sim.mjs';

const top = (shape, x) => {
    const ys = shape.runs.map(r => heightOn(r.pts, x)).filter(y => y !== null);
    return ys.length ? Math.min(...ys) : null;
};

test('painted edges continue every scene beyond the viewport without changing physical surfaces', () => {
    const flags = new Set(['chapter2_available', 'p3_t1', 'p3_t2', 'p3_t3', 'ch2_open', 'p1_inked', 'p4_plank']);
    for (const def of Object.values(SCENES)) {
        const terrain = new Terrain(def, flags), saved = JSON.stringify(terrain.surfaces);
        const coverage = landscapeCoverage(def.bounds, { x0: def.bounds.x0 - 1300, x1: def.bounds.x1 + 2100, y1: def.bounds.y1 + 3000 });
        const physical = terrainShape(terrain.surfaces), drawn = landscapeShape(terrain.surfaces, coverage);
        assert.equal(drawn.runs[0].pts[0][0], coverage.x0);
        assert.equal(drawn.runs.at(-1).pts.at(-1)[0], coverage.x1);
        for (const run of physical.runs) for (let x = run.pts[0][0]; x <= run.pts.at(-1)[0]; x += 17) {
            assert.ok(Math.abs(top(drawn, x) - top(physical, x)) < 1e-6, `${def.id}: authored contact remains exact at ${x}`);
        }
        assert.equal(JSON.stringify(terrain.surfaces), saved, 'rendering never edits collision or persistence data');
        assert.equal(drawn.extensions.length, 2);
        for (const edge of drawn.extensions) for (const p of edge.points) {
            assert.ok(Math.abs(p[1] - edge.join[1]) <= 274.01, `${def.id}: distant tangent must not become an unbounded cliff`);
        }
    }
});

test('outer continuation leaves internal pits, leaps and every growing hill surface intact', () => {
    const flags = new Set(['chapter2_available']), terrain = new Terrain(SCENES.land, flags);
    for (const id of ['ramp1', 'ramp2', 'ramp3']) {
        const raw = SCENES.land.surfaces.find(s => s.id === id);
        flags.add(raw.when); terrain.startRampGrowth(id, 1); terrain.refresh();
        for (const dt of [0, .3, .4, .3]) {
            terrain.advance(dt);
            const physical = terrainShape(terrain.surfaces), drawn = landscapeShape(terrain.surfaces, landscapeCoverage(SCENES.land.bounds));
            for (let x = 7.95 * 200; x < 80.02 * 200; x += 13) {
                assert.ok(Math.abs(top(drawn, x) - top(physical, x)) < 1e-6);
            }
        }
    }
    const disjoint = [{ id: 'left', pts: [[0, 10], [30, 20]] }, { id: 'right', pts: [[50, 60], [100, 65]] }];
    const open = landscapeShape(disjoint, { x0: -500, x1: 600, y1: 800 });
    assert.equal(top(open, 40), null, 'an internal open gap cannot be painted closed');
    assert.equal(open.outlines.length, 2);
});

test('existing authored underwater tails remain exact before their outer continuation', () => {
    const s = SCENES.land.surfaces.find(s => s.id === 'shallows-bed');
    const drawn = landscapeShape([s], { x0: s.pts[0][0] - 800, x1: 26000, y1: 1600 });
    for (const [x, y] of s.tail) assert.equal(top(drawn, x), y);
    assert.deepEqual(drawn.extensions[1].join, s.tail.at(-1));
    const left = drawn.extensions[0].points, join = left.at(-1), before = left.at(-2);
    const authoredSlope = (s.pts[1][1] - s.pts[0][1]) / (s.pts[1][0] - s.pts[0][0]);
    assert.ok(Math.abs((join[1] - before[1]) / (join[0] - before[0]) - authoredSlope) < .025, 'the extension leaves the beach on its authored tangent');
});

test('wide camera coverage expands in cells and remains stable when returning to normal play', () => {
    const def = SCENES.kelp, initial = landscapeCoverage(def.bounds);
    const viewport = { x0: -14000, x1: 22500, y1: 6700 };
    const expanded = landscapeCoverage(def.bounds, viewport, initial);
    assert.ok(expanded.x0 < viewport.x0 && expanded.x1 > viewport.x1 && expanded.y1 > viewport.y1);
    assert.deepEqual(landscapeCoverage(def.bounds, { x0: 0, x1: 2000, y1: 800 }, expanded), expanded);
    const terrain = new Terrain(def, new Set(['ch2_open']));
    const draw = landscapeShape(terrain.surfaces, expanded);
    assert.ok(draw.extensions.every(edge => edge.points.length <= 97), 'very wide story shots have a fixed contour budget');
});
