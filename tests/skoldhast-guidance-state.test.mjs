import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { HL } from '../skoldhast/src/sim.mjs';
import { p8Progress } from '../skoldhast/src/puzzles.mjs';
import { describeGuidance, controlTip } from '../skoldhast/src/guidance-state.mjs';
import { GUIDANCE as W } from '../skoldhast/src/content/sv.mjs';

function stage(scene, x, y, flags = []) {
    const G = createGame();
    for (const f of ['intro_done', 'rule_demo', ...flags]) G.flags.add(f);
    G.goto(scene, { x: x * HL, y: y * HL });
    return G;
}
const cue = (G, objective, opts = {}) => describeGuidance(G, { objective, p8: p8Progress(G), ...opts });
const hide = G => { G.player.hidden = true; G.player.hide = 1; };

test('Klo needs an explicit emergence after Ja, and it clears immediately on emergence', () => {
    const G = stage('land', 106.2, -.41, ['klo_ja']); G.flags.delete('rule_demo'); hide(G);
    assert.equal(cue(G, 'pool').instruction, W.afterKlo);
    assert.equal(cue(G, 'pool').action, 'emerge');
    G.player.hidden = false;
    assert.notEqual(cue(G, 'pool').action, 'emerge');
    assert.notEqual(cue(G, 'pool').instruction, W.afterKlo);
});

test('pool guidance distinguishes approach, hide, real calming and coming out', () => {
    const G = stage('land', 106.5, -.4);
    assert.equal(cue(G, 'pool').state, 'approach');
    G.player.x = 102 * HL;
    assert.equal(cue(G, 'pool').action, 'hide');
    hide(G); G.puz.pools.pool = { ripple: .53, still: false };
    assert.equal(cue(G, 'pool').state, 'working');
    assert.ok(Math.abs(cue(G, 'pool').progress.value - .5) < 1e-9);
    G.flags.add('p2_seen');
    assert.equal(cue(G, 'p2').instruction, W.afterMirror);
    G.player.hidden = false;
    assert.equal(cue(G, 'p2').instruction, W.steps.stone);
    G.puz.stone = G.scenes.land.rail.target;
    assert.equal(cue(G, 'p2').instruction, W.steps.plank);
});

test('control instructions respect touch, hold-to-hide and follow-finger settings', () => {
    const G = stage('land', 102, -.3);
    assert.equal(cue(G, 'pool').controlText, W.controls.hide.keys);
    assert.equal(cue(G, 'pool', { touch: true, holdToHide: true }).controlText, W.controls.hideHold.touch);
    hide(G);
    assert.equal(cue(G, 'pool', { touch: true }).controlText, W.controls.stay.touch);
    assert.equal(cue(G, 'p2', { touch: true, holdToHide: true }).controlText, W.controls.emergeHold.touch);
    assert.equal(controlTip('hide', { holdToHide: true }), W.controls.hideTipHold.keys);
    assert.equal(controlTip('gallop', { touch: true, followFinger: true }), W.controls.gallopTipFollow);
    G.player.hidden = false;
    assert.equal(cue(G, 'p1', { touch: true, followFinger: true }).controlText, W.controls.followGallop);
});

test('P3 follows the next unfilled tuft and its actual flying fluff', () => {
    const G = stage('land', 53, -.8), first = G.scenes.land.clumps.find(c => c.id === 'c1');
    assert.equal(cue(G, 'p3').target.x, first.runup.x);
    G.player.x = 55.6 * HL;
    assert.equal(cue(G, 'p3').target.x, first.x);
    G.puz.fluff.push({ target: 't1', t: .4 });
    assert.equal(cue(G, 'p3').instruction, W.steps.p3Flight);
    assert.equal(cue(G, 'p3').progress.value, .4);
    assert.equal(cue(G, 'p3').action, null, 'a flying seed needs time rather than another gallop');
    G.puz.fluff = []; G.flags.add('p3_t1');
    assert.equal(cue(G, 'p3b').target.x, G.scenes.land.clumps.find(c => c.id === 'c2').x);
    assert.equal(cue(G, 'p3b').progress.value, 1);
});

test('the seeded middle ramp guides the real stone before asking for the upper flower', () => {
    const G = stage('land', 44, -1.91, ['p3_t1', 'p3_seed_t2']);
    const approach = cue(G, 'p3b');
    assert.equal(approach.instruction, W.steps.p3PinApproach);
    assert.equal(approach.action, 'move');
    G.player.x = 39.5 * HL; G.player.y = -1.91 * HL; G.player.facing = 1;
    assert.equal(cue(G, 'p3b').instruction, W.steps.p3PinPush);
    assert.equal(cue(G, 'p3b').action, 'act');
    G.flags.add('p3_stone_clear'); G.step({});
    assert.equal(cue(G, 'p3b').instruction, W.steps.p3Unfold);
    assert.equal(cue(G, 'p3b').action, null);
});

test('P4 changes from runup to leap to landmark and return rope', () => {
    const G = stage('land', 50, -.8);
    assert.equal(cue(G, 'p4').instruction, W.steps.leapRunup);
    G.player.x = 26 * HL; G.player.y = -6 * HL; G.player.vx = -1200;
    G.player.surface = G.scenes.land.surfaces.find(surface => surface.id === 'plateau');
    assert.equal(cue(G, 'p4').instruction, W.steps.leap);
    G.flags.add('p4_leap');
    assert.equal(cue(G, 'p4').target.x, G.scenes.land.spots.landmark.x);
    G.flags.add('mark_land');
    assert.equal(cue(G, 'p4').instruction, W.steps.returnRope);
});

test('the real long leap keeps its landing goal while airborne instead of pointing back up the hill', () => {
    const G = stage('land', 11.8, -4.8, ['ch2_open', 'b:k2_leap_purpose']);
    const edge = G.scenes.land.edges.find(edge => edge.id === 'sprang-p4');
    G.player.mode = 'leap';
    G.player.leap = { id: edge.id, to: { x: edge.to[0], y: edge.to[1] } };
    G.player.vx = -1400;
    const airborne = cue(G, 'p4');
    assert.equal(airborne.instruction, W.steps.leapFlight);
    assert.equal(airborne.action, null, 'a committed jump needs no new input');
    assert.equal(airborne.target.x, edge.to[0]);
    assert.ok(airborne.target.x < G.player.x, 'the goal stays ahead on the actual landing side');
});

test('fish guidance uses the lane, real wait and drift; a stranded shell can recover', () => {
    const G = stage('kelp', 22.7, 7.8, ['ch2_open']);
    assert.equal(cue(G, 'p5').action, 'hide');
    hide(G); G.player.inLane = G.scenes.kelp.lanes.find(l => l.id === 'lane-vault');
    G.puz.school.t = .6;
    assert.equal(cue(G, 'p5').progress.value, .6);
    assert.equal(cue(G, 'p5').progress.total, 1.2);
    G.puz.school.state = 'follow'; G.player.x = 24.3 * HL; G.player.y = 10.4 * HL;
    const following = cue(G, 'p5');
    assert.equal(following.instruction, W.steps.fishDrift);
    assert.ok(following.progress.value > .4 && following.progress.value < 1);
    G.player.inLane = null; G.player.x = 20 * HL; G.player.y = 12 * HL;
    assert.equal(cue(G, 'p5').action, 'emerge');
    assert.equal(cue(G, 'p5').instruction, W.steps.fishRecover);
});

test('P6 guidance follows the real grip, pressure and loose-fragment phases', () => {
    const G = stage('kelp', 30, 8.4, ['ch2_open', 'p5_lit']);
    assert.equal(cue(G, 'p6').action, 'move');
    assert.equal(cue(G, 'p6').instruction, W.steps.p6ApproachKelp);
    G.player.x = 38.8 * HL; G.player.y = 9.75 * HL; G.player.mode = 'swim';
    assert.equal(cue(G, 'p6').action, 'act');
    assert.equal(cue(G, 'p6').instruction, W.steps.p6GrabKelp);
    G.step({ act: true });
    assert.equal(cue(G, 'p6').instruction, W.steps.p6PullKelp);
    assert.equal(cue(G, 'p6').progress.value, 0);
    G.flags.add('p6_kelp_freed');
    assert.equal(cue(G, 'p6').action, 'hide');
    hide(G); G.puz.p6.contact = true; G.puz.p6.press = 1.5;
    assert.equal(cue(G, 'p6').instruction, W.steps.p6Press);
    assert.equal(cue(G, 'p6').progress.value, .5);
    G.flags.add('p6_flat');
    assert.equal(cue(G, 'p6').action, 'emerge');
    G.player.hidden = false;
    const collect = cue(G, 'p6');
    assert.equal(collect.action, 'move');
    assert.equal(collect.instruction, W.steps.p6Collect);
    assert.equal(collect.target.x, 39.5 * HL);
    assert.equal(collect.target.y, 7.1 * HL);
});

test('P7 plate explains sinking, actual hold progress, and departure after latching', () => {
    const G = stage('viken', 14.2, 2, ['viken_arrived', 'p7_seen']); G.player.mode = 'swim';
    assert.equal(cue(G, 'p7').instruction, W.steps.plateReady);
    hide(G);
    assert.equal(cue(G, 'p7').instruction, W.steps.plateSink);
    G.player.y = 6.86 * HL; G.player.resting = true; G.puz.plates.plate = .6;
    assert.equal(cue(G, 'p7').instruction, W.steps.plateWait);
    assert.equal(cue(G, 'p7').progress.value / cue(G, 'p7').progress.total, .5);
    G.flags.add('shutter2');
    assert.equal(cue(G, 'p7').instruction, W.afterPlate);
    G.player.hidden = false;
    assert.equal(cue(G, 'p7').instruction, W.steps.pipeApproach);
});

test('P7 selects the nearby pipe and gallery rope even with other shutters unfinished', () => {
    const G = stage('viken', 26.5, 5.2, ['viken_arrived']); G.player.mode = 'swim';
    assert.equal(cue(G, 'p7').instruction, W.steps.pipeReady);
    hide(G); G.player.inLane = G.scenes.viken.lanes.find(l => l.id === 'pipe'); G.player.y = -1 * HL;
    assert.equal(cue(G, 'p7').instruction, W.steps.pipeWait);
    G.player.hidden = false; G.player.inLane = null; G.player.x = 28.6 * HL; G.player.y = -7.3 * HL;
    assert.equal(cue(G, 'p7').instruction, W.steps.rope);
    assert.equal(cue(G, 'p7').action, 'act');
    G.flags.add('shutter2'); G.flags.add('shutter3'); G.puz.drums.shutter1 = 12;
    assert.equal(cue(G, 'p7').instruction, W.steps.drum);
    assert.equal(cue(G, 'p7').progress.value, 12);
});

test('P8 presents the actual three land parts, water entry and committed sea arrival', () => {
    const G = stage('viken', 2, -.62, ['talk_done']); G.player.mode = 'ground';
    assert.equal(cue(G, 'p8').instruction, W.steps.p8Runup);
    G.flags.add('p8_s1');
    assert.equal(cue(G, 'p8').instruction, W.steps.p8Land);
    assert.equal(cue(G, 'p8').progress.value, 1);
    G.flags.add('p8_land');
    assert.equal(cue(G, 'p8').instruction, W.steps.p8Jump);
    G.player.mode = 'swim'; G.player.x = 25.6 * HL; G.player.y = .85 * HL;
    assert.equal(cue(G, 'p8').action, 'hide');
    hide(G); G.player.inLane = G.scenes.viken.lanes.find(l => l.id === 'p8-lane'); G.player.y = 1.7 * HL;
    assert.equal(cue(G, 'p8').instruction, W.steps.p8Drift);
    assert.ok(cue(G, 'p8').progress.value > 0);
    G.flags.add('p8_sea');
    assert.equal(cue(G, 'p8').state, 'done');
    assert.equal(cue(G, 'p8').action, null);
});

test('off-page goals point to a local exit, and selection never mutates simulation state', () => {
    const G = stage('kelp', 10, 3, ['ch2_open']);
    const before = JSON.stringify({ p: G.player, puz: G.puz, flags: [...G.flags] });
    const help = cue(G, 'p4');
    assert.equal(help.target.scene, 'kelp');
    assert.equal(help.target.x, 0);
    assert.equal(help.instruction, W.route.land);
    assert.equal(JSON.stringify({ p: G.player, puz: G.puz, flags: [...G.flags] }), before);
});
