import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { describeGuidance } from '../skoldhast/src/guidance-state.mjs';
import { describeKloHelp, describeKloLocal } from '../skoldhast/src/klo-help.mjs';
import { p8Progress } from '../skoldhast/src/puzzles.mjs';
import { KLO_COMPANION as W, STORY, GUIDANCE } from '../skoldhast/src/content/sv.mjs';
import { HL } from '../skoldhast/src/sim.mjs';

function stage(scene = 'land', x = 106, y = -.4, flags = []) {
    const G = createGame();
    for (const flag of ['intro_done', 'klo_hidden', 'klo_ja', 'rule_demo', ...flags]) G.flags.add(flag);
    G.goto(scene, { x: x * HL, y: y * HL });
    return G;
}
function help(G, objective, settings = {}) {
    return describeKloHelp(G, describeGuidance(G, { objective, p8: p8Progress(G), ...settings }));
}
function storyStage(mode = 'ask') {
    const G = stage(), hints = [], sayings = [], reminders = [];
    G.helpLevel = mode;
    for (const beat of ['k1_enter', 'k1_stopwatch', 'k1_ja', 'k1_mapcorner', 'k1_clouds', 'k1_pool_purpose', 'k1_pool_klo']) G.flags.add('b:' + beat);
    G.story = createStory(G, {
        guide: { hint: text => hints.push(text), tip() {}, think() {} },
        ui: { say: async lines => sayings.push(...lines), toast() {}, pulse() {} },
        fx: async () => {}, save() {}
    });
    G.on('kloReminder', e => reminders.push(e));
    return { G, hints, sayings, reminders };
}

test('the first pool clue notices the mystery; only the third describes controls', () => {
    const G = stage();
    const approaching = help(G, 'pool');
    assert.equal(approaching.observation, W.help.pool[0]);
    assert.doesNotMatch(approaching.observation, /göm|tryck|skal/i);
    G.player.x = 102 * HL;
    const ready = help(G, 'pool', { touch: true, holdToHide: true });
    G.player.hidden = true;
    const hidden = help(G, 'pool');
    assert.equal(approaching.key, ready.key);
    assert.equal(hidden.key, ready.key, 'entering the shell cannot reset requested depth');
    assert.match(ready.instruction, /Håll Göm dig/);
    assert.match(hidden.instruction, /Stanna gömd/);
    assert.notEqual(ready.observation, ready.instruction);
    assert.notEqual(ready.nudge, ready.instruction);
});

test('stone, plank and each grown ramp are distinct committed tasks', () => {
    const G = stage('land', 100, -.4, ['p2_seen']);
    const stone = help(G, 'p2');
    G.player.hidden = true;
    assert.equal(help(G, 'p2').key, stone.key);
    G.puz.stone = G.scenes.land.rail.target;
    const plank = help(G, 'p2');
    assert.notEqual(stone.key, plank.key);
    assert.equal(plank.observation, W.help.plank[0]);
    G.player.hidden = false;
    const first = help(G, 'p3');
    G.puz.fluff.push({ target: 't1', t: .5 });
    assert.equal(help(G, 'p3').key, first.key, 'flying fluff is still the same uncommitted ramp');
    G.flags.add('p3_t1');
    const second = help(G, 'p3b');
    assert.notEqual(second.key, first.key);
    assert.equal(second.key, help(G, 'p3').key, 'legacy objective names share the same help record');
    G.flags.add('p3_t2'); G.flags.add('p3_t3');
    assert.equal(help(G, 'p3').observation, W.help.waveLedge[0]);
});

test('routing and the return rope answer the reachable task instead of an off-page puzzle', () => {
    const G = stage('kelp', 10, 3, ['ch2_open']);
    assert.equal(help(G, 'p4').observation, W.help.routeLand[0]);
    assert.match(help(G, 'p4').instruction, /tillbaka.*stranden/);
    G.goto('land', { x: 6 * HL, y: -4 * HL });
    G.flags.add('p4_leap'); G.flags.add('mark_land');
    const rope = help(G, 'toSea');
    assert.equal(rope.key, 'returnRope');
    assert.equal(rope.observation, W.help.returnRope[0]);
    assert.equal(rope.key, help(G, 'p4').key);
});

test('stranded fish help adapts while preserving the fish experiment depth', () => {
    const G = stage('kelp', 22.7, 7.8, ['ch2_open']);
    const first = help(G, 'p5');
    G.player.hidden = true; G.puz.school.state = 'follow';
    G.player.x = 20 * HL; G.player.y = 12 * HL;
    const recover = help(G, 'p5');
    assert.equal(first.key, recover.key);
    assert.equal(recover.observation, W.help.fishRecover[0]);
    assert.match(recover.instruction, /Kom fram.*strömmen/);
});

test('lighthouse clues refer only to the selected local mechanism and change on latching', () => {
    const G = stage('viken', 14.2, 2, ['viken_arrived', 'p7_seen']); G.player.mode = 'swim';
    const plate = help(G, 'p7');
    assert.equal(plate.topic, 'plate');
    assert.doesNotMatch(plate.observation, /rep|galopp|rör/);
    G.player.hidden = true; G.player.y = 6.8 * HL; G.player.resting = true;
    assert.equal(help(G, 'p7').key, plate.key);
    G.flags.add('shutter2');
    const exit = help(G, 'p7');
    assert.equal(exit.topic, 'afterPlate');
    assert.notEqual(exit.key, plate.key);
    assert.ok(exit.instruction.startsWith(GUIDANCE.afterPlate));
    G.player.hidden = false; G.player.x = 28.6 * HL; G.player.y = -7.3 * HL;
    assert.equal(help(G, 'p7').topic, 'rope');
    G.flags.add('shutter3');
    assert.equal(help(G, 'p7').topic, 'drum');
});

test('the final line preserves the water task through jumping, approach, hiding and drift', () => {
    const G = stage('viken', 2, -.62, ['talk_done']); G.player.mode = 'ground';
    const first = help(G, 'p8');
    G.flags.add('p8_s1');
    assert.notEqual(help(G, 'p8').key, first.key);
    G.flags.add('p8_land');
    const jump = help(G, 'p8');
    G.player.mode = 'swim'; G.player.x = 25.6 * HL; G.player.y = .85 * HL;
    const water = help(G, 'p8');
    assert.equal(water.key, jump.key);
    assert.notEqual(water.nudge, jump.nudge);
    G.player.hidden = true; G.player.hide = 1; G.player.inLane = G.scenes.viken.lanes.find(l => l.id === 'p8-lane');
    assert.equal(help(G, 'p8').key, water.key);
    G.flags.add('p8_sea');
    assert.equal(help(G, 'p8').topic, 'p8Draw');
    assert.notEqual(help(G, 'p8').key, water.key);
});

test('recaps and local remarks reveal only earned facts, and descriptions never award evidence', () => {
    const G = stage('kelp', 23, 8, ['ch2_open']);
    const before = JSON.stringify({ flags: [...G.flags], puz: G.puz, player: G.player });
    assert.doesNotMatch(help(G, 'p5').recap, /fisk|rädd|skydda/i);
    assert.notEqual(describeKloLocal(G, 'vault'), W.local.litVault);
    assert.notEqual(describeKloLocal(G, 'vault', 0), describeKloLocal(G, 'vault', 1));
    assert.equal(JSON.stringify({ flags: [...G.flags], puz: G.puz, player: G.player }), before);
    G.flags.add('p5_lit');
    assert.equal(describeKloLocal(G, 'vault'), W.local.litVault);
    G.flags.add('talk1');
    assert.equal(help(G, 'talk').recap, W.recap.fear);
    G.flags.add('talk2');
    assert.equal(help(G, 'talk').recap, W.recap.mapTalk);
});

test('ask mode never reveals timed, nearby or repeated-refusal solutions; celebrations remain', () => {
    const { G, hints, reminders } = storyStage();
    G.player.x = 102 * HL;
    G.story.step(200);
    G.story.hintOnce('pool', STORY.k1.poolHint);
    for (let n = 0; n < 3; n++) G.emit('balk', { reason: 'thin', id: 'test-edge' });
    assert.deepEqual(hints, []);
    assert.deepEqual(reminders, []);
    assert.equal(G.story.hintInfo().level, 0);
    assert.equal(G.flags.has('hint_pool'), false, 'suppressed hints are not consumed');
    G.emit('grow', { decor: false });
    assert.deepEqual(hints, [STORY.k1.rampGrew]);
});

test('remind mode gives one answer-free invitation per task inactivity, unaffected by hiding', () => {
    const { G, hints, reminders } = storyStage('remind');
    G.story.step(46);
    assert.equal(reminders.length, 1);
    G.player.x = 102 * HL; G.player.hidden = true;
    G.story.step(100);
    assert.equal(reminders.length, 1);
    assert.deepEqual(hints, []);
    assert.deepEqual(Object.keys(reminders[0]), ['key']);
    G.emit('grow', { decor: false }); G.story.step(46);
    assert.equal(reminders.length, 2, 'committed progress starts a new inactivity window');
});

test('guided mode retains automatic help, and changing back to ask clears automatic marks', () => {
    const { G, hints } = storyStage('guided');
    G.story.step(31);
    assert.ok(hints.length > 0);
    assert.equal(G.story.hintInfo().level, .5);
    G.helpLevel = 'ask';
    assert.equal(G.story.hintInfo().level, 0);
});

test('an earned reflection keeps the discovery but does not recite its solution in ask mode', async () => {
    const { G, sayings } = storyStage();
    G.wait = async () => {};
    G.emit('reflectionSeen', { id: 'pool' }); G.story.step(0);
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(sayings.some(([, text]) => text === W.story.reflection[1]));
    assert.ok(G.flags.has('clue_reflection'));
    assert.ok(!sayings.some(([, text]) => text === STORY.k1.mirrorStone[1] || text === STORY.k1.mirrorPlank[1]));
});

test('an authored beat takes the single actor back from the companion before staging', () => {
    const { G } = storyStage();
    let handedBack = 0;
    G.companion = { yieldToStory() { handedBack++; assert.equal(G.story.running(), false); } };
    G.emit('reflectionSeen', { id: 'pool' }); G.story.step(0);
    assert.equal(handedBack, 1);
    assert.equal(G.story.running(), true);
    assert.equal(typeof G.story.restoreActors, 'function');
});
