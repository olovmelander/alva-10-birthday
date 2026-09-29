import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { describeGuidance } from '../skoldhast/src/guidance-state.mjs';
import { p8Progress } from '../skoldhast/src/puzzles.mjs';
import { GUIDANCE as W } from '../skoldhast/src/content/sv.mjs';
import { HL } from '../skoldhast/src/sim.mjs';

function stage(scene, x, y, flags = []) {
    const G = createGame();
    for (const flag of ['intro_done', 'klo_ja', 'rule_demo', ...flags]) G.flags.add(flag);
    G.goto(scene, { x: x * HL, y: y * HL });
    return G;
}
function cue(G, objective, options = {}) {
    return describeGuidance(G, { objective, p8: p8Progress(G), ...options });
}

test('all three grown ramps lead to the wave evidence before the chapter can continue', () => {
    const G = stage('land', 39, -2.95, ['p1_inked', 'p3_t1', 'p3_t2', 'p3_t3']);
    const ledge = G.scenes.land.areas.find(a => a.id === 'ledge');
    assert.equal(typeof W.steps.waveLedge, 'string');
    for (const objective of ['p3', 'p3b']) for (const touch of [false, true]) {
        const next = cue(G, objective, { touch });
        assert.equal(next.instruction, W.steps.waveLedge);
        assert.equal(next.action, 'move');
        assert.equal(next.controlText, W.controls.move[touch ? 'touch' : 'keys']);
        assert.ok(next.target.x > ledge.x0 && next.target.x < ledge.x1 && next.target.y < ledge.y1,
            'the target is inside the real evidence trigger, not another flower');
        assert.equal(next.progress.value, 3);
    }
    assert.equal(G.flags.has('p3_done'), false, 'guidance does not award evidence before it is reached');
});

test('an unfinished wave investigation routes an early sea visit back to land, even after the ramps grow', () => {
    for (const grown of [[], ['p3_t1'], ['p3_t1', 'p3_t2', 'p3_t3']]) {
        const G = stage('kelp', 20, 3.4, ['p1_inked', 'p2_open', ...grown]);
        const next = cue(G, 'p3');
        assert.equal(next.target.scene, 'kelp');
        assert.equal(next.target.x, 0);
        assert.equal(next.instruction, W.route.land);
        assert.equal(next.progress, null, 'local travel does not display remote ramp progress');
        G.player.hidden = true;
        assert.equal(cue(G, 'p3').action, 'emerge', 'the shell can release the eastbound current to return');
    }
});

test('the story chooses the missing land evidence when the player enters the sea first', () => {
    const routes = [
        { flags: [], objective: 'p1' },
        { flags: ['p1_inked'], objective: 'p3' },
        { flags: ['p1_inked', 'p3_t1'], objective: 'p3b' },
        { flags: ['p1_inked', 'p3_t1', 'p3_t2', 'p3_t3'], objective: 'p3' }
    ];
    for (const route of routes) {
        const G = stage('kelp', 20.8, 3.4, ['klo_hidden', 'p2_open', ...route.flags]);
        const story = createStory(G, { ui: {} });
        assert.equal(story.objective(), route.objective);
        assert.equal(story.guidance().instruction, W.route.land);
        assert.ok(story.guidance().target.x < G.player.x, 'the usable return path is west, away from the chapter barrier');
        G.flags.add('p3_done');
        assert.equal(story.objective(), 'hook');
        assert.ok(story.guidance().target.x >= 19 * HL, 'after the evidence the overlook becomes the goal');
    }
});

test('both mark collection orders explain the return rope before leaving Klippudden', () => {
    for (const extra of [[], ['mark_sea', 'marks_both', 'ch2_end']]) {
        const G = stage('land', 3.2, -4.05, ['ch2_open', 'p4_leap', 'mark_land', 'p2_open', ...extra]);
        const story = createStory(G, { ui: {} });
        const objective = story.objective();
        assert.equal(objective, extra.length ? 'toViken' : 'toSea');
        assert.equal(story.guidance().instruction, W.steps.returnRope,
            'the real objective transition must retain the only way off the cliff');
        assert.equal(story.guidance().target.x, G.scenes.land.ropes[0].x);
        G.player.x = 7.2 * HL;
        assert.equal(story.guidance().action, 'act');
        G.flags.add('p4_plank');
        assert.notEqual(story.guidance().instruction, W.steps.returnRope);
        assert.equal(story.guidance().target.x, G.scenes.land.spots.arch.x);
    }
    const G = stage('land', 50, -.8, ['ch2_open', 'p4_leap', 'mark_land']);
    assert.notEqual(cue(G, 'toSea').instruction, W.steps.returnRope,
        'an older checkpoint already across the gap must not send the player backwards');
});

test('the earned shore shortcut leads back to the guardian and final line', () => {
    const G = stage('land', 110, -.2, ['gate_open', 'ch2_end', 'talk_done']);
    assert.equal(typeof W.route.bay, 'string');
    for (const objective of ['p7', 'p8']) {
        const next = cue(G, objective);
        const exit = G.scenes.land.exits.find(e => e.to === 'viken');
        assert.equal(next.target.scene, 'land');
        assert.ok(next.target.x >= exit.x0 && next.target.x <= exit.x1);
        assert.equal(next.instruction, W.route.bay);
        assert.equal(next.action, 'move', 'the shore shortcut opens by walking, without a button');
    }
    G.flags.delete('gate_open');
    assert.equal(cue(G, 'p8').target.x, G.scenes.land.spots.arch.x,
        'before the shortcut opens, the original water route is retained');
});

test('a route through Vattenporten shows its real action when the player reaches it', () => {
    const G = stage('land', 110, -.2, ['p2_open', 'ch2_end', 'talk_done']);
    assert.equal(cue(G, 'p8').action, 'move');
    G.player.x = G.scenes.land.spots.arch.x;
    G.player.y = G.scenes.land.spots.arch.y;
    for (const touch of [false, true]) {
        const next = cue(G, 'p8', { touch });
        assert.equal(next.action, 'act');
        assert.equal(next.controlText, W.controls.act[touch ? 'touch' : 'keys']);
    }
});
