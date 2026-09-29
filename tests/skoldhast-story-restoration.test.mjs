import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot } from './skoldhast-robot.mjs';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { HL } from '../skoldhast/src/sim.mjs';

const litFlags = [...CODE_RESTORE[2].flags, 'ch3_open', 'viken_arrived', 'b:k3_arrive',
    'shutter1', 'shutter2', 'shutter3', 'lamp_lit', 'b:k3_lamp', 'kv_met'];
const endedFlags = [...litFlags, 'talk1', 'talk2', 'talk_done', 'b:k3_talk1', 'b:k3_line',
    'p8_land', 'p8_s1', 'p8_s2', 'p8_s3', 'p8_done', 'b:k3_window', 'ended', 'signe_met', 'b:after_signe'];

function restore(flags, checkpoint = 'pierEnd') {
    const R = createRobot();
    R.G.restore({ flags, checkpoint });
    return R;
}

test('the saved lighthouse checkpoint restores Kartväktaren and the remaining conversations', async () => {
    const R = restore(litFlags);
    assert.equal(R.G.actors.kv.visible, true);
    assert.equal(R.G.actors.kv.scene, 'viken');
    assert.equal(R.G.actors.kv.x, R.G.sceneDef.spots.kvPier.x);
    await R.flag('talk1', {}, 5);
    await R.settle();
    await R.walkTo(22.6);
    await R.context('talk2');
    await R.settle();
    const saved = R.G.serialize();
    const resumed = createRobot(); resumed.G.restore(saved);
    assert.equal(resumed.G.actors.kv.map, 'open');
    assert.equal(resumed.G.actors.klo.pose, 'point');
    assert.equal(resumed.G.actors.klo.scene, 'viken');
    await resumed.walkTo(22.6);
    await resumed.context('talk3');
    await resumed.flag('talk_done', {}, 5);
    assert.equal(resumed.log.filter(e => e.kind === 'say').length, 1, 'only the remaining conversation replays');
});

test('a save made just as the lamp lights can still introduce its keeper', async () => {
    const R = restore(litFlags.filter(f => !['kv_met', 'b:k3_lamp'].includes(f)));
    await R.flag('kv_met', {}, 15);
    await R.settle();
    assert.equal(R.G.actors.kv.visible, true);
    assert.equal(R.G.checkpoint, 'pierEnd');
});

test('Kartväktaren talks only while his real dialogue is open', async () => {
    const G = createGame();
    let finish;
    G.story = createStory(G, { ui: { say: () => new Promise(resolve => { finish = resolve; }) }, save() {} });
    G.restore({ flags: litFlags, checkpoint: 'pierEnd' });
    G.step({});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(G.actors.kv.talking, true);
    assert.equal(G.actors.klo.talking, false);
    finish();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(G.actors.kv.talking, false);
});

test('Klo comes back from a saved hole and remains visible through the hide lesson', async () => {
    const R = restore(['intro_done', 'b:k1_enter', 'b:k1_stopwatch', 'klo_hidden'], 'start');
    assert.equal(R.G.actors.klo.visible, true);
    assert.equal(R.G.actors.klo.inHole, true);
    assert.equal(R.G.actors.klo.x, R.G.sceneDef.spots.kloHole.x);
    await R.walkTo(106.9);
    await R.hide();
    await R.flag('klo_ja', {}, 8);
    assert.equal(R.G.actors.klo.visible, true);
    assert.equal(R.G.actors.klo.inHole, false);
    assert.equal(R.G.actors.klo.scene, 'land');
});

test('Signe restores without another introduction and strolls slowly on the beach', async () => {
    const R = restore(endedFlags, 'beachEnd');
    assert.equal(R.G.actors.signe.visible, true);
    assert.equal(R.G.actors.signe.scene, 'land');
    await R.walkTo(107.2);
    assert.equal(R.log.filter(e => e.kind === 'say').length, 0, 'her introduction stays committed');
    await R.context('race');
    await R.until(() => R.G.actors.signe.racing, {}, 5, 'race begins');
    const sg = R.G.actors.signe, start = sg.x;
    await R.hold(1);
    assert.ok(Math.abs((start - sg.x) - 70) < 0.001, '70 world units per second, well below a normal walk');
    assert.ok(sg.walkPhase > 0 && sg.walkPhase < 1, 'distance drives the turtle leg cycle');
    assert.equal(sg.y, R.G.terrain.support(sg.x, sg.y, 80, 80).y);
    await R.until(() => sg.pose === 'wave', {}, 10, 'Signe waits before the finish');
    const waiting = sg.x;
    await R.hold(12);
    assert.equal(sg.x, waiting, 'no timer can take the win away');
    assert.ok(sg.x > R.G.sceneDef.race.finish);
    assert.equal(R.has('signe_race'), false);
    await R.flag('signe_race', { x: -0.15 }, 20);
    assert.ok(R.p().x < sg.x, 'even a gentle walk wins');
    await R.settle(20);
    assert.equal(sg.x, R.G.sceneDef.race.signe.x);
    assert.equal(sg.speed, 0);
    await R.walkTo(107.2);
    await R.context('race');
    await R.until(() => sg.racing, {}, 5, 'race can be repeated');
});

test('leaving Signe’s race cancels it without blocking return or replay', async () => {
    const R = restore(endedFlags, 'beachEnd');
    await R.walkTo(107.2);
    await R.context('race');
    await R.until(() => R.G.actors.signe.racing, {}, 5, 'race begins');
    await R.hold(2);
    R.G.goto('kelp', 'fromLand');
    await R.settle(20);
    assert.equal(R.G.busy, 0);
    assert.equal(R.G.actors.signe.racing, false);
    assert.equal(R.has('signe_race'), false);
    R.G.goto('land', { x: 107.2 * HL, y: -0.37 * HL, facing: -1 });
    await R.context('race');
    await R.until(() => R.G.actors.signe.racing, {}, 5, 'race is available after returning');
});
