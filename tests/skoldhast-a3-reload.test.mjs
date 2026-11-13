/*
 * Äventyr 3: closing the game in the middle of a scene loses nothing (audit of 13 November). The save is taken as
 * pagehide, visibilitychange, Avsluta or a settings change take it: at the moment a line is shown. A fresh game is
 * then restored from it and started, as main.mjs's continueGame does. The scene must play again, and what it gives
 * (a light, a clue, a hypothesis, a fact, the rocket gone) must be there afterwards.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot, HL } from './skoldhast-a3-robot.mjs';
import * as route from './skoldhast-a3-route.mjs';
import { STORY } from '../skoldhast/adventures/adventure-3/content/sv.mjs';
import { rocketHere, travelPlaces } from '../skoldhast/adventures/adventure-3/puzzles.mjs';

async function at(scene, spot, flags = []) {
    const R = createRobot();
    for (const f of ['b:arrive', 'breakfast', 'b:breakfast', ...flags]) R.G.flags.add(f);
    R.G.goto(scene, spot);
    R.story.start();
    await R.settle();
    return R;
}
const AFTER_MOON = ['m5_view', 'fin_drawn', 'b:fin', 'b:view', 'visited_mane', 'light_l1', 'light_l2', 'light_l3', 'beam_used',
    'b:firstLight', 'b:beamTalk', 'b:nightDone', 'b:ledgeDone', 'b:rival1', 'b:rival2', 'b:rival3'];
/** The save as it is when these exact lines are first shown. */
function saveWhen(R, lines) {
    const out = { data: null };
    const push = R.log.push;
    R.log.push = function (e) {
        if (!out.data && e.kind === 'say' && e.lines === lines) out.data = JSON.parse(JSON.stringify(R.G.serialize()));
        return push.call(this, e);
    };
    return out;
}
async function reload(data) {
    assert.ok(data, 'the save was taken in the middle of the scene');
    const R = createRobot();
    R.G.restore(data);
    R.story.start();
    await R.settle();
    return R;
}
const said = (R, lines) => R.log.some(e => e.kind === 'say' && e.lines === lines);
const notes = (R) => { const n = R.story.notebook(); return { clues: n.clues.map(c => c.id), hyp: n.hypotheses.map(h => !!h.said), facts: n.facts.map(f => f.id) }; };

test('the bear talking: his light is given after a reload (it was lost for good, and the white never opened)', { timeout: 300000 }, async () => {
    const R = await at('stjarn', 'bearRock', [...AFTER_MOON, 'visited_stjarn', 'b:stjarnArrive', 'wagon_drawn', 'b:wagonDone', 'belt_lit', 'light_l4', 'b:beltDone']);
    R.G.setCheckpoint('bear');
    const save = saveWhen(R, STORY.bearWakes);
    await R.goTo(48.5);
    await R.gallopPast(67.8, { max: 30 });
    await R.flag('bear_nose', { x: 1 }, 10);
    await R.settle();
    assert.ok(!save.data.flags.includes('light_l5'), 'the save is from before the light was given');
    const Q = await reload(save.data);
    assert.ok(said(Q, STORY.bearWakes) && Q.has('light_l5') && Q.has('clue_rubber'), 'he wakes again and gives his light');
    assert.equal(Q.G.checkpoint, 'pip');
    for (const f of ['light_l6', 'light_l7', 'light_l8', 'light_l9']) Q.G.flags.add(f);
    assert.ok(travelPlaces(Q.G).find(t => t.id === 'sudd').open, 'nine lights: the white opens');
});

test('breakfast: the count, the first clue and hypothesis 1 come back after a reload', { timeout: 300000 }, async () => {
    const R = createRobot();
    const save = saveWhen(R, STORY.breakfast);
    await route.begin(R);
    await route.breakfast(R);
    const Q = await reload(save.data);
    await Q.hold(2); await Q.settle();
    assert.ok(said(Q, STORY.breakfast) && said(Q, STORY.count) && said(Q, STORY.hypothesis1));
    assert.deepEqual(notes(Q), notes(R));
    assert.equal(Q.story.objective()?.id, 'moon');
});

test('Pip and Kometen: the photograph and the crooked clue come back after a reload', { timeout: 300000 }, async () => {
    {
        const R = await at('stjarn', 'pipArrive', [...AFTER_MOON, 'visited_stjarn', 'b:stjarnArrive', 'wagon_drawn', 'b:wagonDone', 'belt_lit', 'light_l4',
            'b:beltDone', 'bear_nose', 'b:bearWakes', 'light_l5', 'clue_rubber']);
        const save = saveWhen(R, STORY.pipDone);
        await R.floatTo(77.15, -0.55, { tol: 0.15 });
        await R.hide();
        await R.flag('pip_met', {}, 20);
        await R.settle();
        const Q = await reload(save.data);
        assert.ok(said(Q, STORY.pipDone) && Q.has('light_l6'));
        assert.deepEqual(notes(Q), notes(R), 'the photo clue and hypothesis 3');
    }
    {
        const R = await at('ring', 'cometEdge', [...AFTER_MOON, 'visited_ring', 'b:ringArrive', 'slung', 'gravel_passed', 'ice_melted', 'light_l7']);
        const save = saveWhen(R, STORY.cometRest);
        await R.until(() => R.p().mode !== 'ground', () => ({ x: 0.4 }), 4, 'off the end');
        await R.step({ hide: true });
        await R.until(() => R.p().surface?.id === 'rest' && R.p().mode === 'ground' && !R.G.carry, {}, 15, 'on Rastplatsen');
        await R.emerge();
        await R.flag('comet_rest', {}, 12);
        await R.settle();
        const Q = await reload(save.data);
        await Q.hold(4, { x: 0.2 }); await Q.settle();
        assert.ok(said(Q, STORY.cometRest) && Q.has('light_l8'));
        assert.deepEqual(notes(Q), notes(R), 'the crooked clue and the tail fact');
    }
});

test('arrivals: Stjärnbildsfältet and Det vita hålet play again after a reload, and the rocket is gone', { timeout: 300000 }, async () => {
    async function go(to, flags, lines) {
        const R = await at('mane', 'start', flags);
        const save = saveWhen(R, lines);
        await R.goTo(3.6);
        R.travel(to);
        await R.context('travel', 5);
        await R.settle();
        const Q = await reload(save.data);
        await Q.hold(3, { x: 0.3 }); await Q.settle();
        return { R, Q };
    }
    {
        const { R, Q } = await go('stjarn', [...AFTER_MOON, 'visited_ring', 'b:ringArrive'], STORY.stjarnArrive);
        assert.ok(said(Q, STORY.stjarnArrive) && Q.has('b:stjarnArrive') && Q.has('clue_gone'));
        assert.deepEqual(notes(Q), notes(R), 'the twinkle fact and the eraser gone from the table');
    }
    {
        const nine = ['light_l4', 'light_l5', 'light_l6', 'light_l7', 'light_l8', 'light_l9', 'visited_stjarn', 'visited_ring', 'b:stjarnArrive',
            'b:ringArrive', 'b:eraserGone', 'clue_gone', 'b:gapDone'];
        const { Q } = await go('sudd', [...AFTER_MOON, ...nine], STORY.suddArrive);
        assert.ok(said(Q, STORY.suddArrive) && Q.has('rocket_gone') && !rocketHere(Q.G), 'the rocket is rubbed out: the white is one way');
        assert.ok(Q.G.actors.sudd?.visible, 'Suddet waits ahead');
    }
});

test('Utsikten: a reload in the middle plays the view again, with hypothesis 2', { timeout: 300000 }, async () => {
    const moon = ['visited_mane', 'light_l1', 'light_l2', 'light_l3', 'beam_used', 'b:firstLight', 'b:beamTalk', 'b:nightDone', 'b:ledgeDone',
        'b:rival1', 'b:rival2', 'b:rival3', 'm4_drop', 'night_lit'];
    const top = { x: 96.2 * HL, y: -7.8 * HL };   // the top of Spiran, in Utsikten
    const R = await at('mane', 'edgeStart', moon);
    R.G.setCheckpoint('edge');
    const save = saveWhen(R, STORY.hypothesis2);
    R.G.goto('mane', top);
    await R.flag('m5_view', {}, 30);
    await R.settle();
    assert.ok(R.has('b:hypothesis2') && R.has('b:view'));
    assert.ok(!save.data.flags.includes('m5_view'), 'm5_view is written when the view ends');
    const Q = await reload(save.data);
    assert.equal(Q.story.objective()?.id, 'view', 'the goal says to climb up again');
    Q.G.goto('mane', top);
    await Q.flag('m5_view', {}, 30);
    await Q.settle();
    assert.ok(said(Q, STORY.hypothesis2) && Q.has('clue_white') && Q.has('b:view'));
});
