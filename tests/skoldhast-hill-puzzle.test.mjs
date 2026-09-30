import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot } from './skoldhast-robot.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';
import { p3Progress } from '../skoldhast/src/hill-puzzle.mjs';

function stage(flags = [], x = 59.5, y = -.83) {
    const R = createRobot(); R.G.story = null;
    R.G.restore({ flags: ['intro_done', 'p1_inked', ...flags], checkpoint: 'steppe' });
    R.G.goto('land', { x: x * HL, y: y * HL, facing: -1 });
    return R;
}
async function launchFirst(R) {
    await R.until(() => R.G.puz.fluff.some(flight => flight.target === 't1'), { x: -1 }, 10, 'send the first seed into the air');
}
async function middleSeed(R) {
    await R.walkTo(58.5, { gallop: true });
    await R.gallopPast(41);
    await R.flag('p3_seed_t2', {}, 8);
}
async function clearPin(R) {
    if (R.p().x > 60 * HL) await R.walkTo(58.5, { gallop: true });
    await R.walkTo(39.0, { tol: .04 }); await R.walkTo(39.5, { tol: .04 });
    await R.context('p3-push');
    assert.equal(R.has('p3_stone_clear'), false, 'pressing starts a visible stone roll');
    await R.flag('p3_stone_clear', {}, 5);
}

for (const fps of [30, 60, 120, 144]) test(`a wind seed commits only on its deterministic flight arrival at ${fps} Hz`, () => {
    const R = stage(), { G } = R;
    let elapsed = 0, started = null, seeded = null, grown = null, duration = null;
    for (let frame = 0; frame < fps * 7; frame++) {
        elapsed += 1 / fps;
        while (elapsed + 1e-10 >= STEP) {
            G.step({ x: -1 }); elapsed -= STEP;
            const flight = G.puz.fluff.find(f => f.target === 't1');
            if (flight && started === null) { started = G.time; duration = flight.dur; }
            if (seeded === null && G.has('p3_seed_t1')) seeded = G.time;
            if (grown === null && G.has('p3_t1')) grown = G.time;
        }
    }
    assert.ok(started !== null && seeded !== null && grown !== null);
    assert.ok(Math.abs((seeded - started) - duration) <= STEP * 2, 'the seed arrives when its visible flight ends');
    assert.ok(grown > seeded + .5, 'roots must grow before the ramp unfolds');
});

test('reading freezes a flying seed with the world instead of completing an invisible timer', async () => {
    const R = stage(); await launchFirst(R);
    const flight = R.G.puz.fluff.find(f => f.target === 't1'), before = flight.t;
    R.G.worldInspection = { player: R.p() };
    await R.hold(5);
    assert.equal(flight.t, before);
    assert.equal(R.has('p3_seed_t1'), false);
    assert.equal(R.has('p3_t1'), false);
    R.G.worldInspection = null;
    await R.flag('p3_seed_t1', {}, 5);
    await R.flag('p3_t1', {}, 5);
});

for (const reset of ['leave', 'reload']) test(`${reset} cancels an unlanded seed without awarding an offscreen ramp`, async () => {
    const R = stage(); await launchFirst(R);
    assert.equal(R.has('p3_seed_t1'), false);
    if (reset === 'leave') R.G.goto('kelp', 'fromLand');
    else R.G.restore(R.G.serialize());
    await R.hold(5);
    assert.equal(R.G.puz.fluff.length, 0);
    assert.equal(R.has('p3_seed_t1'), false);
    assert.equal(R.has('p3_t1'), false);
    R.G.goto('land', { x: 59.5 * HL, y: -.83 * HL, facing: -1 });
    await launchFirst(R); await R.flag('p3_seed_t1', {}, 5); await R.flag('p3_t1', {}, 5);
    assert.ok(R.has('p3_t1'), 'the flower remains usable after the abandoned flight');
});

for (const first of ['seed', 'pin']) test(`the middle ramp needs both a landed seed and the moved stone, with ${first} first`, async () => {
    let R = stage(['p3_t1']);
    if (first === 'seed') {
        await middleSeed(R);
        await R.hold(3);
        assert.equal(R.has('p3_t2'), false, 'the pin holds down a seeded grass strip');
        await R.walkTo(38.65); await R.hold(2, { x: -1 });
        assert.equal(R.has('p3_seed_t3'), false, 'the third flower cannot be triggered from the lower terrace');
        assert.equal(R.events.some(event => event.type === 'fluff' && event.id === 'c3'), false);
    } else {
        await clearPin(R);
        await R.hold(3);
        assert.equal(R.has('p3_t2'), false, 'moving the stone does not invent a seed');
    }
    const saved = R.G.serialize();
    R = stage(); R.G.restore(saved);
    assert.ok(R.has(first === 'seed' ? 'p3_seed_t2' : 'p3_stone_clear'), 'the first completed action survives reload');
    assert.equal(R.has('p3_t2'), false);
    if (first === 'seed') await clearPin(R); else await middleSeed(R);
    await R.flag('p3_t2', {}, 8);
    await R.hold(1.3); // let the live collision ramp finish unfurling
    await R.walkTo(46); await R.gallopPast(37.8);
    await R.flag('p3_seed_t3', {}, 5); await R.flag('p3_t3', {}, 5);
    assert.ok(R.events.some(event => event.type === 'fluff' && event.id === 'c3'), 'the real upper flower releases the final seed');
    await R.walkTo(41); await R.walkTo(35);
    assert.ok(R.p().y < -3.5 * HL, 'all three physical ramps reach the upper path');
});

test('legacy completed ramp flags restore a traversable hill without replaying seed or stone work', async () => {
    const R = stage(['p3_t1', 'p3_t2', 'p3_t3'], 49, -.81);
    assert.ok(['ramp1', 'ramp2', 'ramp3'].every(id => R.G.terrain.surfaces.some(surface => surface.id === id)));
    await R.walkTo(35, { max: 60 });
    assert.ok(R.p().y < -3.5 * HL);
    assert.equal(R.events.some(event => event.type === 'grow'), false);
    assert.notEqual(R.G.context?.id, 'p3-push');
});

test('saving or leaving during the stone roll resets the unfinished push without a delayed release', async () => {
    for (const reset of ['leave', 'reload']) {
        const R = stage(['p3_t1', 'p3_seed_t2'], 39.3, -1.917);
        await R.walkTo(39.5, { tol: .04 }); await R.context('p3-push');
        assert.equal(R.has('p3_stone_clear'), false);
        if (reset === 'leave') R.G.goto('kelp', 'fromLand');
        else R.G.restore(R.G.serialize());
        await R.hold(2);
        assert.equal(R.has('p3_stone_clear'), false, 'the abandoned roll cannot unpin another scene or saved state');
        assert.equal(R.has('p3_t2'), false);
        assert.ok(R.has('p3_seed_t2'), 'the previously landed seed remains committed');
        R.G.goto('land', { x: 39.3 * HL, y: -1.917 * HL, facing: 1 });
        await clearPin(R); await R.flag('p3_t2', {}, 8);
        assert.ok(R.has('p3_t2'));
    }
});


test('seed guidance provides a usable run-up when a player stops beside or beyond a flower', () => {
    const R = stage(['p3_t1', 'p3_t2'], 38.2, -2.95);
    const third = R.G.scenes.land.clumps.find(clump => clump.id === 'c3');
    assert.equal(p3Progress(R.G).runup, true);
    assert.equal(p3Progress(R.G).target.x, third.runup.x, 'the short upper terrace needs a longer approach');
    R.p().x = 43 * HL; R.p().y = -1.91 * HL;
    assert.equal(p3Progress(R.G).runup, false);
    assert.equal(p3Progress(R.G).target.x, third.x, 'the approach now has enough space to gain speed');
    const pinFirst = stage(['p3_t1', 'p3_stone_clear'], 39.5, -1.91);
    const second = pinFirst.G.scenes.land.clumps.find(clump => clump.id === 'c2');
    assert.equal(p3Progress(pinFirst.G).runup, true);
    assert.equal(p3Progress(pinFirst.G).target.x, second.runup.x);
});
