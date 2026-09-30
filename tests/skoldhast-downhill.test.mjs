import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot } from './skoldhast-robot.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { HL, heightOn, p4MomentumProgress } from '../skoldhast/src/sim.mjs';

function stage(x, released = 3) {
    const R = createRobot({ released }); R.G.story = null;
    R.G.flag('intro_done');
    const plateau = R.G.scenes.land.surfaces.find(surface => surface.id === 'plateau');
    R.G.goto('land', { x: x * HL, y: heightOn(plateau.pts, x * HL), facing: -1 });
    return R;
}

for (const x of [25, 29, 30]) test(`a full downhill run from ${x} earns the actual speed needed for the gap`, async () => {
    const R = stage(x), velocities = [];
    R.G.on('leapStart', event => { if (event.id === 'sprang-p4') velocities.push(Math.abs(R.p().vx)); });
    await R.flag('p4_leap', { x: -1 }, 15);
    assert.ok(R.p().x < 8 * HL);
    assert.equal(R.has('ch2_open'), false, 'the physical slope works without an unrelated sea reveal');
    assert.equal(velocities.length, 1);
    const edge = R.G.scenes.land.edges.find(edge => edge.id === 'sprang-p4');
    assert.ok(velocities[0] >= edge.minSpeed);
});

for (const x of [15, 18]) test(`a short approach from ${x} stops safely before the gap without enough downhill speed`, async () => {
    const R = stage(x);
    await R.hold(8, { x: -1 });
    assert.equal(R.has('p4_leap'), false);
    assert.ok(R.p().x >= 13.05 * HL, 'a failed run remains safely on the near plateau');
    assert.equal(R.p().mode, 'ground');
    assert.ok(R.events.some(event => event.type === 'balk' && event.id === 'sprang-p4' && event.reason === 'runup'));
    assert.equal(p4MomentumProgress(R.p(), R.G.sceneDef).ready, false);
    await R.walkTo(29, { max: 60 });
    await R.flag('p4_leap', { x: -1 }, 15);
    assert.ok(R.has('p4_leap'), 'the failed attempt can be retried from the visible hill');
});

test('stopping on the lower slope loses momentum and restarting there cannot spend a saved charge', async () => {
    const R = stage(29);
    await R.until(() => R.p().x < 19 * HL, { x: -1 }, 10, 'build speed down the hill');
    assert.ok(Math.abs(R.p().vx) > 1200, 'gravity has added real speed above a flat gallop');
    await R.hold(2);
    assert.ok(Math.abs(R.p().vx) < 1);
    assert.equal(p4MomentumProgress(R.p(), R.G.sceneDef).ready, false);
    assert.equal(R.has('p4_leap'), false, 'a fast approach does not award a landing');
    await R.hold(8, { x: -1 });
    assert.equal(R.has('p4_leap'), false, 'the remaining short slope cannot recreate the full run-up');
});

test('reloading or leaving the scene discards velocity without changing completed leap saves', async () => {
    const R = stage(29);
    await R.until(() => R.p().x < 20 * HL, { x: -1 }, 10, 'gain actual downhill speed');
    assert.ok(Math.abs(R.p().vx) > 1200);
    const saved = R.G.serialize();
    R.G.restore(saved);
    assert.equal(R.p().vx, 0);
    assert.equal(p4MomentumProgress(R.p(), R.G.sceneDef).ready, false);
    const plateau = R.G.scenes.land.surfaces.find(surface => surface.id === 'plateau');
    R.G.goto('land', { x: 18 * HL, y: heightOn(plateau.pts, 18 * HL), facing: -1 });
    await R.hold(8, { x: -1 });
    assert.equal(R.has('p4_leap'), false);
    R.G.restore({ flags: ['intro_done', 'p4_leap', 'mark_land'], checkpoint: 'udden' });
    assert.ok(R.has('p4_leap') && R.has('mark_land'));
    assert.equal(R.p().vx, 0);
});

test('the release boundary still prevents a fast downhill leap into unreleased land', async () => {
    const R = stage(29, 1);
    await R.hold(8, { x: -1 });
    assert.equal(R.has('p4_leap'), false);
    assert.ok(R.p().x >= 13.05 * HL);
});


for (const batch of [1, 2, 4, 8]) test(`the downhill discovery preserves a valid run with ${batch} fixed steps per rendered frame`, async () => {
    const R = createRobot();
    R.G.restore({ flags: [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open',
        'p1_inked', 'p3_t1', 'p3_t2', 'p3_t3', 'p3_done', 'b:k1_p3'], checkpoint: 'ledge' });
    const plateau = R.G.scenes.land.surfaces.find(surface => surface.id === 'plateau');
    R.G.goto('land', { x: 25 * HL, y: heightOn(plateau.pts, 25 * HL), facing: -1 });
    assert.equal(R.has('b:k2_leap_purpose'), false, 'this is the first visit to the visible gap');
    for (let frame = 0; frame < 20 * 120 / batch && !R.has('p4_leap'); frame++) {
        for (let step = 0; step < batch; step++) R.G.step({ x: -1 });
        await new Promise(resolve => setImmediate(resolve));
    }
    assert.ok(R.has('p4_leap'), `reading the first discovery cannot consume earned speed at ${batch} steps/frame: ${R.where()}`);
    assert.ok(R.has('b:k2_leap_purpose'));
    assert.equal(R.events.some(event => event.type === 'balk' && event.id === 'sprang-p4' && event.reason === 'runup'), false);
});
