import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleFoldDemo, FOLD_DEMO_DURATION } from '../skoldhast/src/fold-demo.mjs';
import { sampleMapAssemble } from '../skoldhast/src/map-assemble.mjs';

test('the little map causes the beach fold, holds the comparison, and restores it in order', () => {
    assert.equal(sampleFoldDemo(.6).map, 0);
    assert.equal(sampleFoldDemo(1.4).map, 1);
    assert.equal(sampleFoldDemo(1.4).world, 0, 'let the player see the cause before the beach responds');
    for (const t of [2.35, 3, 3.79]) {
        const s = sampleFoldDemo(t);
        assert.equal(s.map, 1); assert.equal(s.world, 1); assert.equal(s.phase, 'compare');
    }
    assert.equal(sampleFoldDemo(4.45).map, 0);
    assert.equal(sampleFoldDemo(4.45).world, 1, 'unfold the map before restoring its world');
    assert.equal(sampleFoldDemo(5.4).world, 0);
    const end = sampleFoldDemo(FOLD_DEMO_DURATION);
    assert.equal(end.map, 0); assert.equal(end.world, 0); assert.equal(end.opacity, 0); assert.equal(end.done, true);
});

test('fold demo timing is frame independent, finite and continuous', () => {
    let prev = sampleFoldDemo(0);
    for (let i = 1; i <= 800; i++) {
        const state = sampleFoldDemo(i / 120);
        for (const field of ['map', 'world', 'opacity']) {
            assert.ok(Number.isFinite(state[field]) && state[field] >= 0 && state[field] <= 1);
            assert.ok(Math.abs(state[field] - prev[field]) < .05);
        }
        prev = state;
    }
    assert.deepEqual(sampleFoldDemo(NaN), sampleFoldDemo(0));
    assert.deepEqual(sampleFoldDemo(-10), sampleFoldDemo(0));
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
