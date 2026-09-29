import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrace, fitRect, fromUnit, simplifyStroke, toUnit } from '../skoldhast/src/drawing-geometry.mjs';

test('a fast trace crosses intermediate anchors even when the browser coalesces movement', () => {
    const trace = createTrace([[40, 200], [140, 200], [240, 200], [340, 200]]);
    assert.equal(trace.begin([40, 200]), 1);
    assert.equal(trace.move([340, 200]), 3);
    assert.equal(trace.complete, true);
});

test('one tap cannot consume the whole tightly spaced prologue shore', () => {
    const trace = createTrace([[250, 550], [262, 550], [274, 550], [286, 550]], { stopAt: 3 });
    trace.begin([250, 550]); trace.move([250, 550]); trace.end();
    assert.equal(trace.progress, 1);
    assert.equal(trace.complete, false);
    trace.begin([262, 550]); trace.end();
    assert.equal(trace.progress, 2);
    trace.begin([274, 550]); trace.end();
    assert.equal(trace.complete, true);
    assert.equal(trace.total, 3);
});

test('cancelling a gesture preserves earlier taps but rolls back unfinished movement', () => {
    const trace = createTrace([[40, 200], [140, 200], [240, 200], [340, 200]]);
    trace.begin([40, 200]); trace.end();
    trace.begin([140, 200]); trace.move([340, 200]);
    assert.equal(trace.complete, true);
    trace.cancel();
    assert.equal(trace.progress, 1);
    trace.begin([140, 200]); trace.move([340, 200]); trace.end();
    assert.equal(trace.complete, true);
});

test('P8 can be traced backwards, while an authored halfway interruption stays in its intended order', () => {
    const points = [[0, 0], [100, 0], [200, 0], [300, 0]];
    const last = createTrace(points, { allowReverse: true });
    last.begin([300, 0]); last.move([0, 0]);
    assert.ok(last.complete);
    assert.deepEqual(last.points, points.slice().reverse());
    const shore = createTrace(points, { allowReverse: true, stopAt: 2 });
    shore.begin([300, 0]);
    assert.equal(shore.progress, 0);
    assert.deepEqual(shore.points, points);
});

test('a path far away from the next checkpoint does not finish the guided stroke', () => {
    const trace = createTrace([[40, 200], [140, 200], [240, 200]]);
    trace.begin([40, 200]); trace.move([240, 400]);
    assert.equal(trace.progress, 1);
    assert.equal(trace.complete, false);
});

test('drafts map back to the paper at real offset coordinates after rotating the device', () => {
    const original = { x: 704, y: 62, width: 80, height: 66 };
    const display = fitRect(original, { x: 20, y: 90, width: 350, height: 590 });
    const paperPoints = [[original.x + 10, original.y + 12], [original.x + 65, original.y + 49]];
    const draft = paperPoints.map(p => toUnit(p, original));
    const enlarged = draft.map(p => fromUnit(p, display));
    assert.ok(enlarged.every(p => p[0] >= 20 && p[0] <= 370 && p[1] >= 90 && p[1] <= 680));
    const rotated = { x: 278, y: 379, width: 69, height: 56.925 };
    const restored = enlarged.map(p => fromUnit(toUnit(p, display), rotated));
    restored.forEach((p, i) => {
        assert.ok(Math.abs(toUnit(p, rotated)[0] - draft[i][0]) < 1e-12);
        assert.ok(Math.abs(toUnit(p, rotated)[1] - draft[i][1]) < 1e-12);
    });
});

test('saved free strokes are bounded to 200 points without moving endpoints or flattening the shape', () => {
    const source = Array.from({ length: 6000 }, (_, i) => [i / 5999, 0.5 + Math.sin(i / 80) * 0.3]);
    const simplified = simplifyStroke(source);
    assert.ok(simplified.length <= 200 && simplified.length > 15);
    assert.deepEqual(simplified[0], source[0]);
    assert.deepEqual(simplified.at(-1), source.at(-1));
    assert.ok(Math.max(...simplified.map(p => p[1])) - Math.min(...simplified.map(p => p[1])) > 0.58);
    assert.equal(source.length, 6000, 'the original draft is not mutated');
});
