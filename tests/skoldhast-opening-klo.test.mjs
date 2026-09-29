import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleOpeningKlo, OPENING_KLO_HOLD, OPENING_KLO_STAGES } from '../skoldhast/src/opening-klo.mjs';

const ORDER = ['drop', 'plip', 'periscope', 'search', 'gaze', 'rise', 'backstep', 'awe', 'toss', 'double-take', 'split',
    'crouch', 'take', 'land', 'research', 'ready'];

test('Klo wakes behind the horse, stares in wonder, does a double take, leaps and starts researching', () => {
    const stages = [];
    let previous = sampleOpeningKlo(0), highest = Infinity;
    assert.equal(previous.stage, 'hidden');
    for (let i = 1; i <= 2000; i++) {
        const pose = { ...sampleOpeningKlo(i / 2000) };
        if (stages.at(-1) !== pose.stage) stages.push(pose.stage);
        for (const key of ['x', 'y', 'rotation', 'hole', 'walk', 'eyeWide', 'crouch']) assert.ok(Number.isFinite(pose[key]), key);
        assert.ok(Math.abs(pose.x - previous.x) < 1, 'sideways travel has no pose-boundary jump');
        assert.ok(Math.abs(pose.y - previous.y) < 1, 'emergence and the leap have no pose-boundary jump');
        if (pose.stage === 'land' || pose.stage === 'research' || pose.stage === 'ready') assert.equal(pose.y, 0);
        highest = Math.min(highest, pose.y);
        previous = pose;
    }
    assert.deepEqual(stages, ORDER);
    const peek = sampleOpeningKlo(.19);
    assert.ok(peek.y > 40, 'the full-size body stays below the soil while the eye stalks peek');
    const hold = sampleOpeningKlo(OPENING_KLO_HOLD);
    assert.equal(hold.stage, 'awe', 'the prologue holds on his stare');
    assert.equal(hold.y, 0); assert.equal(hold.mark, '?'); assert.equal(hold.eyeWide, 1);
    assert.ok(hold.eyeAim[0] < 0 && hold.eyeAim[1] < 0, 'both eyes lean up to the shell');
    const toss = sampleOpeningKlo(.58);
    assert.ok(toss.eyeAim[0] < -.65 && toss.eyeAim[1] < -.65, 'both eyes follow the tossed mane up');
    const looks = new Set();
    for (let i = 0; i <= 200; i++) looks.add(sampleOpeningKlo(.63125 + i * .0625 / 200).eyeAim[0]);
    assert.ok(Math.max(...looks) - Math.min(...looks) >= .6, 'the double take whips between the mane and the hooves');
    const split = sampleOpeningKlo(.71);
    assert.ok(split.eyeAim[0] < -.5 && split.eyeAim[1] > .2, 'one eye on the turtle half, one on the horse half');
    for (let i = 0; i <= 1000; i++) {
        const x = sampleOpeningKlo(i / 1000).x;
        assert.ok(x >= -17 && x <= 6, 'he stays on the narrow dry sand between the shells and the tail');
    }
    assert.equal(hold.book, 'sand');
    assert.equal(hold.bookX, 34); assert.ok(Math.abs(hold.bookRot) < .3, 'the notebook lies flat');
    assert.ok(Math.abs(hold.bookX - hold.x) > 45, 'and clearly apart from him');
    assert.deepEqual([...OPENING_KLO_STAGES], ORDER.slice(0, -1));
    assert.equal(sampleOpeningKlo(.77).mark, '!', 'the leap is an exclamation');
    assert.ok(highest < -15, 'the leap physically lifts Klo above the beach');
    assert.equal(sampleOpeningKlo(.4).book, 'sand', 'in his wonder he drops his notebook');
    assert.equal(sampleOpeningKlo(.9).scribble, 1, 'and researches the moment he has it back');
    assert.equal(previous.x, 0); assert.equal(previous.y, 0); assert.equal(previous.pose, 'notebook');
});

test('reduced-motion Klo keeps every cause and beat without a leap, tilt, crouch or tremble', () => {
    let previous = sampleOpeningKlo(0, true);
    const stages = new Set();
    for (let i = 1; i <= 2000; i++) {
        const pose = { ...sampleOpeningKlo(i / 2000, true) };
        stages.add(pose.stage);
        assert.ok(pose.y >= 0, 'no hop');
        assert.equal(pose.rotation, 0);
        assert.equal(pose.crouch, 0);
        assert.equal(pose.tremble, 0);
        assert.ok(Math.abs(pose.y - previous.y) < 1, 'still continuous through the rise');
        previous = pose;
    }
    assert.deepEqual([...stages], ORDER);
    const reused = {};
    assert.equal(sampleOpeningKlo(1, true, reused), reused);
    assert.equal(reused.stage, 'ready');
    assert.equal(sampleOpeningKlo(NaN).stage, 'hidden');
    assert.equal(sampleOpeningKlo(10).stage, 'ready');
});
