import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clipX } from '../skoldhast/src/terrain-shape.mjs';

test('an outline is cut exactly at both ends of a range, and its pieces rejoin', () => {
    const line = [[0, 0], [100, -10], [200, 10], [300, 0]];
    assert.deepEqual(clipX(line, 50, 250), [[50, -5], [100, -10], [200, 10], [250, 5]]);
    const before = clipX(line, -Infinity, 150), inside = clipX(line, 150, 250), after = clipX(line, 250, Infinity);
    assert.deepEqual(before.at(-1), inside[0], 'the first cut is shared');
    assert.deepEqual(inside.at(-1), after[0], 'the second cut is shared');
    assert.deepEqual([...before, ...inside.slice(1), ...after.slice(1)].filter(([x]) => [0, 100, 200, 300].includes(x)), line);
    assert.deepEqual(clipX(line, 400, 500), [], 'a range beside the outline is empty');
});

test('a vertical face inside the range stays whole', () => {
    const step = [[0, 0], [100, 0], [100, 40], [200, 40]];
    assert.deepEqual(clipX(step, 50, 150), [[50, 0], [100, 0], [100, 40], [150, 40]]);
});
