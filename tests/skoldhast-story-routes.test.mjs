import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { describeGuidance } from '../skoldhast/src/guidance-state.mjs';
import { p8Progress } from '../skoldhast/src/puzzles.mjs';
import { GUIDANCE as W, GOALS, HINTS, THREAD } from '../skoldhast/src/content/sv.mjs';
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

test('all three grown ramps lead to the cliff evidence before the final leap', () => {
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

test('opening Vattenporten makes its underwater overlook the next discovery in every land state', () => {
    for (const land of [[], ['p1_inked'], ['p1_inked', 'p3_t1'], ['p1_inked', 'p3_t1', 'p3_t2', 'p3_t3'], ['p1_inked', 'p3_done']]) {
        const G = stage('land', 101.8, -.3, ['klo_hidden', 'p2_open', ...land]);
        const story = createStory(G, { ui: {} });
        assert.equal(story.objective(), 'kelp');
        assert.equal(story.guidance().target.x, G.scenes.land.spots.arch.x);
        assert.equal(story.guidance().action, 'act');
        G.goto('kelp', { x: 20.8 * HL, y: 3.4 * HL, mode: 'swim' });
        assert.equal(story.objective(), 'hook');
        assert.notEqual(story.guidance().instruction, W.route.land);
        assert.ok(story.guidance().target.x >= 19 * HL, 'the discovery ahead remains the goal');
    }
});

test('the map search guides the real bridge, ramp and leap route without skipping unsolved land puzzles', () => {
    const routes = [
        { flags: [], objective: 'p1', copy: 'p1Map' },
        { flags: ['p1_inked'], objective: 'p3', copy: 'p3Map' },
        { flags: ['p1_inked', 'p3_t1'], objective: 'p3b', copy: 'p3bMap' },
        { flags: ['p1_inked', 'p3_t1', 'p3_t2', 'p3_t3'], objective: 'p3', copy: 'p3Map' },
        { flags: ['p1_inked', 'p3_done'], objective: 'p4', copy: 'p4' }
    ];
    for (const route of routes) for (const scene of ['land', 'kelp']) {
        const flags = ['klo_hidden', 'p2_open', 'ch1_end', 'ch2_open', ...route.flags];
        if (scene === 'kelp') flags.push('mark_sea');
        const G = stage(scene, scene === 'land' ? 101.8 : 20.8, scene === 'land' ? -.3 : 3.4, flags);
        const story = createStory(G, { ui: {} }), before = [...G.flags];
        assert.equal(story.objective(), route.objective);
        const goal = GOALS[route.copy], n = route.objective === 'p4' ? Number(G.has('mark_sea'))
            : ['p3_t1', 'p3_t2', 'p3_t3'].filter(flag => G.has(flag)).length;
        assert.ok(goal, 'the map route has an authored goal');
        assert.equal(story.goal(), typeof goal === 'function' ? goal(n) : goal);
        assert.equal(story.guidance().hint.q, HINTS[route.copy].q, 'local instructions retain the map-search question');
        assert.equal(story.guidance().thread.why, THREAD.why[route.copy]);
        if (scene === 'kelp') {
            assert.equal(story.guidance().target.x, 0, 'the first local step is the cave exit');
            assert.equal(story.guidance().instruction, W.route.land);
            G.player.hidden = true;
            assert.equal(story.guidance().action, 'emerge', 'release the eastbound current to return');
        }
        assert.deepEqual([...G.flags], before, 'guidance never awards skipped puzzles');
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
