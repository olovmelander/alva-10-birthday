import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleOpeningKlo } from '../skoldhast/src/opening-klo.mjs';

test('Klo rises through the drawn ground, hops sideways, then plants his feet and recovers his notebook', () => {
    const stages = new Set();
    let previous = sampleOpeningKlo(0), highest = Infinity;
    for (let i = 1; i <= 1000; i++) {
        const pose = sampleOpeningKlo(i / 1000);
        stages.add(pose.stage);
        for (const key of ['x', 'y', 'rotation', 'hole', 'walk']) assert.ok(Number.isFinite(pose[key]));
        assert.ok(Math.abs(pose.x - previous.x) < 1, 'sideways travel has no pose-boundary jump');
        assert.ok(Math.abs(pose.y - previous.y) < 1, 'emergence has no pose-boundary jump');
        assert.ok(pose.x >= previous.x, 'he exits in one direction instead of wobbling through the hole');
        if (pose.stage === 'land' || pose.stage === 'notebook' || pose.stage === 'ready') assert.equal(pose.y, 0);
        highest = Math.min(highest, pose.y);
        previous = pose;
    }
    assert.deepEqual([...stages], ['sand', 'peek', 'brace', 'pop', 'land', 'notebook', 'ready']);
    assert.ok(sampleOpeningKlo(.3).y > 40, 'the full-size body stays below the mask while eye stalks peek');
    assert.ok(highest < -15, 'the pop physically lifts Klo above the beach');
    assert.equal(previous.x, 0); assert.equal(previous.y, 0); assert.equal(previous.pose, 'notebook');
});

test('reduced-motion Klo keeps the staged emergence without an airborne hop or tilt', () => {
    let previous = sampleOpeningKlo(0, true);
    for (let i = 1; i <= 1000; i++) {
        const pose = sampleOpeningKlo(i / 1000, true);
        assert.ok(pose.y >= 0, 'no hop');
        assert.equal(pose.rotation, 0);
        assert.ok(Math.abs(pose.y - previous.y) < 1, 'still continuous through anticipation');
        previous = pose;
    }
    const reused = {};
    assert.equal(sampleOpeningKlo(1, true, reused), reused);
    assert.equal(reused.stage, 'ready');
    assert.equal(sampleOpeningKlo(NaN).stage, 'hidden');
    assert.equal(sampleOpeningKlo(10).stage, 'ready');
});
