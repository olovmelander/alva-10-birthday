import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleFoldDemo, FOLD_DEMO_PHASES, FOLD_BEACH, foldMapPoint, foldBeachPoint } from '../skoldhast/src/fold-demo.mjs';
import { MAP_FRAGMENTS, MAP_SHELL, fragmentPoints } from '../skoldhast/src/map-layout.mjs';
import { sampleMapAssemble } from '../skoldhast/src/map-assemble.mjs';

test('the map folds and unfolds before the beach follows, with time to see each cause', () => {
    for (const t of [1.05, 1.3, 1.5]) {
        const fold = sampleFoldDemo('fold', t), unfold = sampleFoldDemo('unfold', t);
        assert.equal(fold.map, 1); assert.equal(fold.world, 0);
        assert.equal(unfold.map, 0); assert.equal(unfold.world, 1);
    }
    const folding = sampleFoldDemo('fold', 2), unfolding = sampleFoldDemo('unfold', 2);
    assert.ok(folding.world > 0 && folding.world < 1);
    assert.ok(unfolding.world > 0 && unfolding.world < 1);
    assert.equal(sampleFoldDemo('fold', 2.7).world, 1);
    assert.equal(sampleFoldDemo('unfold', 2.7).world, 0);
    for (const [phase, duration] of Object.entries(FOLD_DEMO_PHASES)) {
        assert.equal(sampleFoldDemo(phase, duration - .001).done, false);
        assert.equal(sampleFoldDemo(phase, duration).done, true);
    }
    const end = sampleFoldDemo('depart', FOLD_DEMO_PHASES.depart);
    assert.equal(end.map, 0); assert.equal(end.world, 0); assert.equal(end.opacity, 0);
});

test('observation, folded comparison and restored beach hold for arbitrarily slow readers', () => {
    for (const [phase, amount] of [['observe', 0], ['compare', 1], ['restored', 0]]) {
        for (const seconds of [0, 9, 90, 3600, 1e9]) {
            assert.deepEqual(sampleFoldDemo(phase, seconds), { phase, map: amount, world: amount, opacity: 1, done: false });
        }
    }
});

test('each action is finite, continuous, monotonic and independent of previous frame sampling', () => {
    for (const [phase, duration] of Object.entries(FOLD_DEMO_PHASES)) {
        let prev = sampleFoldDemo(phase, 0);
        const direction = phase === 'unfold' || phase === 'depart' ? -1 : 1;
        for (let i = 1; i <= Math.ceil((duration + 1) * 120); i++) {
            const state = sampleFoldDemo(phase, i / 120);
            for (const field of ['map', 'world', 'opacity']) {
                assert.ok(Number.isFinite(state[field]) && state[field] >= 0 && state[field] <= 1);
                assert.ok(Math.abs(state[field] - prev[field]) < .05);
                assert.ok(direction * (state[field] - prev[field]) >= 0);
            }
            prev = state;
        }
        const direct = sampleFoldDemo(phase, duration / 2);
        sampleFoldDemo(phase, duration * 10);
        assert.deepEqual(sampleFoldDemo(phase, duration / 2), direct);
        for (const invalid of [NaN, Infinity, -10]) assert.deepEqual(sampleFoldDemo(phase, invalid), sampleFoldDemo(phase, 0));
    }
    for (const [action, hold] of [['arrive', 'observe'], ['fold', 'compare'], ['unfold', 'restored']]) {
        const end = sampleFoldDemo(action, FOLD_DEMO_PHASES[action]), start = sampleFoldDemo(hold, 0);
        for (const field of ['map', 'world', 'opacity']) assert.equal(end[field], start[field], `${action} does not jump into its held pose`);
    }
});

test('the pink shell rises with its sand, while the beach sides and bottom stay attached', () => {
    const shell = [0, -25], sand = [0, 0];
    for (const amount of [0, .25, .5, .75, 1]) {
        const liftedShell = foldBeachPoint(shell, amount), liftedSand = foldBeachPoint(sand, amount);
        assert.equal(liftedShell[0], liftedSand[0]);
        assert.equal(liftedShell[1] - liftedSand[1], -25, 'the shell stays printed on the moving patch');
        for (const y of [-FOLD_BEACH.above, -25, 0, 70, FOLD_BEACH.below]) {
            for (const x of [-FOLD_BEACH.width / 2, FOLD_BEACH.width / 2]) assert.deepEqual(foldBeachPoint([x, y], amount), [x, y]);
        }
        for (const x of [-100, -50, 0, 50, 100]) assert.deepEqual(foldBeachPoint([x, FOLD_BEACH.below], amount), [x, FOLD_BEACH.below]);
    }
    assert.equal(foldBeachPoint(shell, 1)[1], shell[1] - FOLD_BEACH.lift);
    assert.ok(foldMapPoint([MAP_SHELL.x, MAP_SHELL.y], 1)[1] < MAP_SHELL.y, 'the same pink shell rises on the map');
});

test('map and beach geometry move continuously and return to their exact printed positions', () => {
    const outline = fragmentPoints(MAP_FRAGMENTS.find(fragment => fragment.id === 'corner'));
    const edge = FOLD_BEACH.width / 2, rows = [-FOLD_BEACH.above, -25, 0, 70, FOLD_BEACH.below];
    const beachPoints = [-edge, -100, -50, 0, 50, 100, edge].flatMap(x => rows.map(y => [x, y]));
    for (const [deform, points, field] of [[foldMapPoint, [...outline, [MAP_SHELL.x, MAP_SHELL.y]], 'map'], [foldBeachPoint, beachPoints, 'world']]) {
        for (const point of points) {
            let prev = deform(point, 0);
            assert.deepEqual(prev, point);
            for (let i = 1; i <= 100; i++) {
                const next = deform(point, i / 100);
                assert.ok(next.every(Number.isFinite));
                assert.ok(next[1] <= prev[1], 'paper only rises as the fold increases');
                assert.ok(Math.hypot(next[0] - prev[0], next[1] - prev[1]) < 3, 'nearby fold amounts do not tear or jump');
                prev = next;
            }
            assert.deepEqual(deform(point, sampleFoldDemo('unfold', FOLD_DEMO_PHASES.unfold)[field]), point);
        }
    }
    // The shallow pleat never reverses the left-to-right order of beach ink.
    for (const amount of [0, .25, .5, .75, 1]) {
        for (const y of rows) {
            let previousX = -Infinity;
            for (let x = -edge; x <= edge; x += 4) {
                const [drawnX] = foldBeachPoint([x, y], amount);
                assert.ok(drawnX > previousX); previousX = drawnX;
            }
        }
    }
});

test('map fragments align before their completed sea route is revealed', () => {
    assert.equal(sampleMapAssemble(.4).joined, 0);
    assert.equal(sampleMapAssemble(1.1).joined, 1);
    assert.equal(sampleMapAssemble(1.1).route, 0);
    assert.equal(sampleMapAssemble(1.85).route, 1);
    assert.equal(sampleMapAssemble(2.5).opacity, 1);
    assert.equal(sampleMapAssemble(2.95).opacity, 0);
    assert.equal(sampleMapAssemble(2.95).done, true);
});
