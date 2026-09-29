import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';

function opening() {
    const G = createGame(), sounds = [];
    G.story = createStory(G, {
        ui: { say: async () => {}, toast() {}, pulse() {} },
        audio: { sfx: name => sounds.push(name) },
        guide: { tip() {}, hint() {} },
        save() {}
    });
    G.goto('land', 'start', { silent: true });
    const step = async (input = {}) => {
        G.step(input);
        await new Promise(resolve => setImmediate(resolve));
    };
    return { G, sounds, step };
}

test('the opening crab continues onto the beach without a second entrance or locked controls', async () => {
    const { G, sounds, step } = opening();
    const start = G.sceneDef.spots.start, beach = G.sceneDef.spots.kloBeach;
    // He comes up in the dry sand just behind the horse, never inside the stuck wave.
    const from = start.x - 0.86 * HL;
    const wave = G.sceneDef.decor.find(it => it.frozen);
    assert.ok(from + 0.25 * HL < wave.x - 116, 'the opening crab stands clear of the wave');
    assert.ok(G.terrain.groundNear(from, start.y, 90) < 0, 'on dry sand above the sea');
    Object.assign(G.actors.klo, {
        scene: 'land', visible: true, x: from,
        y: G.terrain.groundNear(from, start.y, 90),
        pose: 'stopwatch', facing: -1, pop: 0, inHole: false, walk: null
    });
    G.flag('intro_done');
    G.goto('land', 'start'); // startPlay reloads the scene after the prologue.
    const klo = G.actors.klo;
    assert.equal(klo.x, from, 'scene restoration preserves the handoff position');
    assert.equal(klo.visible, true);

    await step();
    assert.equal(klo.x, from, 'the first story beat does not teleport Klo');
    assert.equal(klo.pop, 0);
    assert.equal(klo.walk.x, beach.x);
    assert.equal(G.busy, 0);
    assert.deepEqual(sounds, [], 'the same crab needs no second entrance click');

    const heroFrom = G.player.x;
    for (let i = 0; i < Math.ceil(3.3 / STEP); i++) {
        const previous = klo.x;
        // Walk briefly while Klo crosses the beach, then let the hero settle.
        await step(i < 60 ? { x: -.35 } : {});
        assert.ok(klo.x <= previous && previous - klo.x < 5, 'Klo scuttles continuously toward the lesson');
        assert.equal(klo.visible, true);
        assert.equal(klo.pop, 0);
        assert.equal(G.busy, 0, 'player input remains available during the handoff');
        if (i === Math.ceil(1.3 / STEP)) assert.ok(G.has('tip_gallop'), 'the original tip is not delayed by the walk');
    }
    assert.ok(G.player.x < heroFrom - 5, 'the real simulation accepts movement during the crab walk');
    assert.equal(klo.x, beach.x);
    assert.equal(klo.walk, null);
    assert.equal(klo.y, G.terrain.groundNear(klo.x, klo.y, 45), 'the crab finishes planted on the beach');
    assert.ok(G.has('b:k1_enter'), 'the original introduction timing is preserved');
    assert.deepEqual(sounds, []);
});

test('an intro_done save without the paper crab still introduces Klo for the first lesson', async () => {
    const { G, sounds, step } = opening();
    G.restore({ flags: ['intro_done'], checkpoint: 'start' });
    assert.equal(G.actors.klo.visible, false);
    await step();
    const klo = G.actors.klo, beach = G.sceneDef.spots.kloBeach;
    assert.equal(klo.visible, true);
    assert.equal(klo.scene, 'land');
    assert.equal(klo.x, beach.x);
    assert.equal(klo.pose, 'stopwatch');
    assert.equal(klo.pop, 1);
    assert.deepEqual(sounds, ['crabclick']);
    for (let i = 0; i < Math.ceil(3.3 / STEP); i++) await step();
    assert.ok(G.has('b:k1_enter'));
    assert.ok(G.has('tip_gallop'));
    assert.equal(klo.pop, 0);
    assert.deepEqual(sounds, ['crabclick'], 'the fallback entrance only plays once');
});
