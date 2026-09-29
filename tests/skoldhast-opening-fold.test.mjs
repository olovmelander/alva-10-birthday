import test from 'node:test';
import assert from 'node:assert/strict';
import { openingCrease, foldPoint } from '../skoldhast/src/opening-fold.mjs';

test('opening fold is hinged exactly at the interrupted shoreline', () => {
    for (const point of [[854, 520], [854, 526], [854, 540]]) {
        const c = openingCrease(1000, 760, point);
        assert.ok(c.a[0] > 0 && c.a[0] < 1000);
        for (let p = 0; p <= 1; p += .025) {
            const moved = foldPoint(point, c, p);
            assert.ok(Math.hypot(moved[0] - point[0], moved[1] - point[1]) < 1e-9);
        }
    }
});

test('painted corner stays rigid and folds completely underneath the remaining paper', () => {
    const c = openingCrease(1000, 760, [854, 526]);
    assert.deepEqual(foldPoint(c.tip, c, 0), c.tip);
    const side = ([x, y]) => (x - c.a[0]) * c.normal[0] + (y - c.a[1]) * c.normal[1];
    assert.ok(side(c.tip) > 0);
    const end = foldPoint(c.tip, c, 1);
    assert.ok(side(end) < 0, 'the folded sea is beneath the surviving side');
    assert.ok(Math.abs(Math.hypot(end[0] - c.a[0], end[1] - c.a[1]) - Math.hypot(c.tip[0] - c.a[0], c.tip[1] - c.a[1])) < 1e-8);
    for (const p of [-1, 0, .25, .5, .75, 1, 2]) {
        assert.deepEqual(foldPoint(c.a, c, p), c.a);
        assert.ok(foldPoint(c.tip, c, p).every(Number.isFinite));
    }
});
