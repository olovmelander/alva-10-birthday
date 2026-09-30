import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleOpeningKlo, OPENING_KLO_HOLD, OPENING_KLO_STAGES, openingKloAt, openingKloBeats, openingKloDuration } from '../skoldhast/src/opening-klo.mjs';

const ORDER = ['drop', 'fall', 'plip', 'periscope', 'search', 'gaze', 'rise', 'backstep', 'awe', 'toss', 'double-take', 'split',
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

test('the drop falls and Klo rises in slow motion; reduced motion keeps every beat at normal speed', () => {
    for (const less of [false, true]) {
        const beats = openingKloBeats(less);
        assert.deepEqual(beats.map(b => b.name), ['shake', 'fall', 'impact', 'still', 'wake', 'rise', 'settle']);
        let previous = -1, at = {};
        const total = openingKloDuration(less);
        for (let s = 0; s <= total + .001; s += total / 400) {
            openingKloAt(s, less, at);
            assert.ok(at.progress >= previous - 1e-9, 'progress never runs backwards');
            assert.ok(at.speed > 0 && at.speed <= 1);
            if (less) assert.equal(at.speed, 1, 'no slow motion with reduced motion');
            previous = at.progress;
        }
        assert.ok(Math.abs(openingKloAt(total, less).progress - OPENING_KLO_HOLD) < 1e-9, 'it ends on his held stare');
        for (const b of beats) assert.ok(b.p1 >= b.p0);
    }
    assert.ok(openingKloDuration(false) > 9, 'a long, dramatic entrance');
    const fall = openingKloAt(.35 + 1.5, false);
    assert.equal(fall.beat, 'fall'); assert.ok(fall.speed < .2, 'the world nearly stops while the drop falls');
    assert.equal(sampleOpeningKlo(fall.progress).stage, 'fall');
    assert.ok(sampleOpeningKlo(fall.progress).drop > 0, 'and the drop is in the air');
    const still = openingKloAt(.35 + 2.8 + 1.05 + .5, false);
    assert.equal(still.beat, 'still'); assert.ok(still.speed > .9, 'time snaps back after the landing');
    assert.equal(sampleOpeningKlo(.125).impact > 0, true, 'the landing throws up a crown');
    assert.equal(sampleOpeningKlo(.16).eyeFrame, 'blink', 'his eyes are still shut as the stalks come up');
    assert.equal(sampleOpeningKlo(.18).eyeFrame, 'open', 'then they pop open');
    assert.ok(sampleOpeningKlo(.37).pour > 0, 'sand pours off him as he rises');
});
