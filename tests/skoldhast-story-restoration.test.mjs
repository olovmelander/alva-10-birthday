import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot } from './skoldhast-robot.mjs';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';

const litFlags = [...CODE_RESTORE[2].flags, 'ch3_open', 'viken_arrived', 'b:k3_arrive',
    'shutter1', 'shutter2', 'shutter3', 'lamp_lit', 'b:k3_lamp', 'kv_met'];
const endedFlags = [...litFlags, 'talk1', 'talk2', 'talk_done', 'b:k3_talk1', 'b:k3_line',
    'p8_land', 'p8_s1', 'p8_s2', 'p8_s3', 'p8_done', 'b:k3_window', 'ended', 'signe_met', 'b:after_signe'];

function restore(flags, checkpoint = 'pierEnd') {
    const R = createRobot();
    R.G.restore({ flags, checkpoint });
    return R;
}

const tick = () => new Promise(resolve => setImmediate(resolve));

function heldRace(holdAt) {
    const G = createGame(), lines = [];
    let release;
    G.story = createStory(G, {
        ui: {
            say(spoken) {
                lines.push(spoken);
                return lines.length === holdAt ? new Promise(resolve => { release = resolve; }) : Promise.resolve();
            },
            toast() {}, pulse() {}
        },
        save() {}
    });
    G.restore({ flags: endedFlags, checkpoint: 'beachEnd' });
    const r = G.scenes.land.race;
    G.goto('land', { x: r.signe.x - HL, y: r.signe.y });
    return {
        G, lines,
        async start() { G.story.actions().find(action => action.id === 'race').run(); await tick(); },
        async release() { release(); await tick(); }
    };
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
    G.story = createStory(G, { ui: { say: () => new Promise(resolve => { finish = resolve; }), toast() {} }, fx() {}, save() {} });
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

test('Signe restores, keeps strolling through the finish, and offers a rematch after winning', async () => {
    const R = restore(endedFlags, 'beachEnd');
    assert.equal(R.G.actors.signe.visible, true);
    assert.equal(R.G.actors.signe.scene, 'land');
    await R.walkTo(R.G.scenes.land.race.signe.x / HL - 1);
    assert.equal(R.log.filter(e => e.kind === 'say').length, 0, 'her introduction stays committed');
    await R.context('race');
    await R.until(() => R.G.actors.signe.racing, {}, 5, 'race begins');
    const sg = R.G.actors.signe, start = sg.x;
    await R.hold(1);
    assert.ok(Math.abs((start - sg.x) - 70) < 0.001, '70 world units per second, well below a normal walk');
    assert.ok(sg.walkPhase > 0 && sg.walkPhase < 1, 'distance drives the turtle leg cycle');
    assert.equal(sg.y, R.G.terrain.support(sg.x, sg.y, 80, 80).y);
    await R.flag('signe_raced', {}, 12);
    assert.equal(sg.x, R.G.sceneDef.race.finish, 'Signe reaches the actual finish line');
    assert.ok(R.p().x > sg.x, 'the stationary player has not reached the line');
    assert.equal(sg.racing, false);
    assert.equal(R.has('signe_race'), false, 'a turtle win is not recorded as a horse win');
    assert.deepEqual(R.log.filter(e => e.kind === 'say').at(-1).lines, STORY.after.signeWin);
    assert.equal(R.log.filter(e => e.kind === 'say' && e.lines === STORY.after.signeWin).length, 1);
    assert.notEqual(R.story.objective(), 'signe', 'finishing either way completes the optional activity');
    await R.settle(20);
    assert.equal(sg.x, R.G.sceneDef.race.signe.x);
    assert.equal(sg.speed, 0);
    await R.walkTo(R.G.scenes.land.race.signe.x / HL - 1);
    await R.context('race');
    await R.until(() => sg.racing, {}, 5, 'race can be repeated');
    assert.deepEqual(R.log.filter(e => e.kind === 'say').at(-1).lines, STORY.after.signeAgain);
});

test('Signe can beat a slowly moving horse, while an ordinary walk still wins', async () => {
    for (const [input, winner] of [[-0.04, 'signe'], [-0.15, 'horse']]) {
        const R = restore(endedFlags, 'beachEnd');
        await R.walkTo(R.G.scenes.land.race.signe.x / HL - 1);
        await R.context('race');
        await R.until(() => R.G.actors.signe.racing, {}, 5, 'race begins');
        await R.flag('signe_raced', { x: input }, 15);
        const r = R.G.sceneDef.race;
        assert.ok(R.p().x < r.start.x, 'the player moved along the course');
        assert.equal(R.has('signe_race'), winner === 'horse');
        assert.equal(R.p().x <= r.finish, winner === 'horse');
        assert.deepEqual(R.log.filter(e => e.kind === 'say').at(-1).lines,
            winner === 'horse' ? STORY.after.signeLose : STORY.after.signeWin);
        await R.settle(20);
        assert.equal(R.G.actors.signe.x, r.signe.x);
        assert.equal(R.G.busy, 0);
        await R.walkTo(r.signe.x / HL - 1);
        await R.context('race');
        await R.until(() => R.G.actors.signe.racing, {}, 5, 'either outcome allows replay');
        assert.deepEqual(R.log.filter(e => e.kind === 'say').at(-1).lines, STORY.after.signeAgain);
    }
});

test('leaving Signe’s race cancels it without blocking return or replay', async () => {
    const R = restore(endedFlags, 'beachEnd');
    await R.walkTo(R.G.scenes.land.race.signe.x / HL - 1);
    await R.context('race');
    await R.until(() => R.G.actors.signe.racing, {}, 5, 'race begins');
    await R.hold(2);
    const before = R.log.filter(e => e.kind === 'say').length;
    R.G.goto('kelp', 'fromLand');
    await R.settle(20);
    assert.equal(R.G.busy, 0);
    assert.equal(R.G.actors.signe.racing, false);
    assert.equal(R.has('signe_race'), false);
    assert.equal(R.has('signe_raced'), false);
    assert.equal(R.log.filter(e => e.kind === 'say').length, before, 'no abandoned race dialogue follows into the sea');
    R.G.goto('land', { x: R.G.scenes.land.race.signe.x - HL, y: -0.30 * HL, facing: 1 });
    await R.context('race');
    await R.until(() => R.G.actors.signe.racing, {}, 5, 'race is available after returning');
});

test('leaving or reloading during the countdown cannot start a stale race', async () => {
    for (const scene of ['kelp', 'land']) {
        const R = heldRace(1);
        await R.start();
        assert.equal(R.G.busy, 1);
        assert.deepEqual(R.lines, [STORY.after.signeGo]);
        R.G.goto(scene, scene === 'kelp' ? 'fromLand' : R.G.scenes.land.race.signe);
        await R.release();
        R.G.step({}); await tick();
        assert.equal(R.G.busy, 0);
        assert.equal(R.G.actors.signe.racing, false);
        assert.equal(R.G.story.running(), false);
        assert.equal(R.G.has('signe_raced'), false);
        assert.equal(R.G.has('signe_race'), false);
        assert.deepEqual(R.lines, [STORY.after.signeGo]);
        R.G.goto('land', { x: R.G.scenes.land.race.signe.x - HL, y: R.G.scenes.land.race.signe.y });
        assert.ok(R.G.story.actions().some(action => action.id === 'race'), 'returning offers a fresh race');
    }
});

test('Signe’s result waits for its reader and is saved before the dialogue closes', async () => {
    const R = heldRace(2);
    const before = { x: R.G.player.x };
    R.G.camHint = before;
    await R.start();
    assert.equal(R.G.actors.signe.racing, true);
    for (let i = 0; i < 12 / STEP && R.lines.length < 2; i++) { R.G.step({}); await tick(); }
    assert.deepEqual(R.lines.at(-1), STORY.after.signeWin);
    assert.equal(R.G.actors.signe.x, R.G.sceneDef.race.finish);
    assert.equal(R.G.actors.signe.speed, 0);
    assert.equal(R.G.actors.signe.racing, false);
    assert.equal(R.G.busy, 1);
    assert.ok(R.G.camHint.frame.x0 < R.G.actors.signe.x && R.G.camHint.frame.x1 > R.G.actors.signe.x,
        'the victory camera includes Signe even when the player is still at the start');
    assert.ok(R.G.serialize().flags.includes('signe_raced'));
    assert.equal(R.G.has('signe_race'), false);
    for (let i = 0; i < 2 / STEP; i++) { R.G.step({}); await tick(); }
    assert.equal(R.lines.length, 2, 'the victory is announced once');
    assert.equal(R.G.actors.signe.x, R.G.sceneDef.race.finish, 'Signe stays at the finish while the joke is read');
    R.G.goto('kelp', 'fromLand');
    await R.release();
    assert.equal(R.G.busy, 0);
    assert.equal(R.G.camHint, before, 'leaving the result releases its temporary camera');
    assert.equal(R.G.actors.signe.walk, null, 'the abandoned result cannot start an off-scene return walk');
    assert.equal(R.G.has('signe_raced'), true, 'leaving after the finish preserves the earned result');
});

test('both racers crossing in one step awards the earlier crossing, with ties to the horse', async () => {
    for (const [fraction, winner] of [[0.25, 'horse'], [0.75, 'signe'], [0.5, 'horse']]) {
        const R = heldRace(2);
        await R.start();
        const r = R.G.sceneDef.race;
        R.G.actors.signe.x = r.finish + r.speed * STEP * 0.5;
        R.G.player.px = r.finish + fraction;
        R.G.player.x = r.finish - (1 - fraction);
        R.G.story.step(STEP); await tick();
        assert.deepEqual(R.lines.at(-1), winner === 'horse' ? STORY.after.signeLose : STORY.after.signeWin);
        assert.equal(R.G.has('signe_race'), winner === 'horse');
        assert.equal(R.G.has('signe_raced'), true);
        await R.release();
        assert.equal(R.G.camHint, null, 'dismissing either result restores normal framing');
    }
});
