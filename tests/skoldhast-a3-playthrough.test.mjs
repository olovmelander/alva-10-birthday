/*
 * Äventyr 3: De försvunna stjärnorna. A robot plays the whole adventure through the real simulation, puzzles and
 * story, with ordinary inputs only (design section 19): from breakfast on the Moon to the ten gold stars. If a
 * puzzle can't be finished, it fails and says where the robot got stuck.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot, HL } from './skoldhast-a3-robot.mjs';
import * as route from './skoldhast-a3-route.mjs';
import { createGame } from '../skoldhast/adventures/adventure-3/game.mjs';
import { createStory, MEASURES } from '../skoldhast/adventures/adventure-3/story.mjs';
import { SCENES, CHECKPOINTS, LIGHT_IDS, LIGHT_TOTAL, LIGHTS_ON } from '../skoldhast/adventures/adventure-3/content/world.mjs';
import { FACT_ORDER, CLUE_ORDER } from '../skoldhast/adventures/adventure-3/content/sv.mjs';

if (!process.env.NO_TEST) {
test('Äventyr 3: a robot plays the whole adventure over five pages, to the ten gold stars', { timeout: 900000 }, async (t) => {
    const R = createRobot();
    const { G, story } = R;
    await route.begin(R);
    await route.breakfast(R);
    await route.moon(R);
    assert.equal(G.lights(), 3, 'three lights on the Moon');
    await route.travel(R, 'stjarn', 3.6);
    await route.constellations(R);
    await route.travel(R, 'ring', 3.4);
    await route.ring(R);
    assert.equal(G.lights(), 9, 'nine lights before the white');
    await route.travel(R, 'sudd', 2.4);
    await route.white(R);
    await route.climax(R, {
        checks: async (r) => {
            const nb = r.story.notebook();
            assert.ok(nb.notesRubbed && !nb.notesInk, 'the notebook\'s Mätningar page is rubbed out with Klo\'s notes');
            // a walk draws nothing; standing still loses nothing
            await r.hold(2, { x: 0.3 });
            assert.equal(r.G.puz.selfDrawn, 0, 'a walk draws nothing of the outline');
            await r.hold(3);
            assert.equal(r.G.puz.selfDrawn, 0, 'standing still changes nothing');
            // a save inside the climax keeps what was true on Smulhögen before the first bite
            const saved = r.G.serialize();
            assert.equal(saved.checkpoint, 'crumbs');
            assert.ok(!saved.flags.includes('moon_bitten') && !saved.flags.includes('notes_rubbed') && !saved.flags.includes('outline_gone'),
                'the climax is one unit for the save');
        }
    });
    assert.equal(G.lights(), LIGHT_TOTAL, 'ten lights after the tenth star');
    await route.home(R);
    for (const f of ['moon_whole', 'lights_home', 'gold', 'constellation', 'notes_ink', 'telescope', 'ended']) assert.ok(R.has(f), 'the finale: ' + f);
    // Klo's count: eight and eight, even, as it must be
    const nb = story.notebook();
    assert.equal(nb.measures.filter(m => m.kind === 'horse').length, 8, 'eight horse things');
    assert.equal(nb.measures.filter(m => m.kind === 'turtle').length, 8, 'eight turtle things');
    // Suddet rubbed out what was written before the climax; what was measured after it was written in pencil again
    const rubbed = (id) => nb.measures.find(m => m.id === id)?.rubbed;
    assert.ok(rubbed('moonJump') && rubbed('noLine') && !rubbed('milky') && !rubbed('caught') && !rubbed('rim'), 'only the old lines were rubbed');
    assert.deepEqual(MEASURES.filter(m => !R.has(m.flag)).map(m => m.id), [], 'every measure written in');
    assert.deepEqual(nb.hypotheses.map(hh => [hh.said, hh.result]), [[true, 'no'], [true, 'no'], [true, 'yes'], [true, 'yes']], 'every hypothesis stamped');
    assert.deepEqual(nb.clues.map(c => c.id), CLUE_ORDER, 'every clue written in');
    // Nova's chatter after the story writes the last fact in
    await R.until(() => G.context?.who === 'nova', () => ({ x: -0.3 }), 10, 'beside Nova');
    for (let i = 0; i < 8 && !R.has('t:sunFact'); i++) { await R.act(); await R.settle(); }
    assert.deepEqual(story.notebook().facts.map(f => f.id), FACT_ORDER, 'every fact of Nova\'s written in');
    const boxes = R.log.filter(l => l.kind === 'say').reduce((n, l) => n + l.lines.length, 0);
    t.diagnostic(`play time ${Math.round(G.time)} s, ${boxes} dialogue boxes, ${R.log.filter(l => l.kind === 'think').length} thoughts`);
});
}

test('the world: every checkpoint stands on ground or floats, ten lights on four pages', () => {
    assert.equal(LIGHT_IDS.length, LIGHT_TOTAL);
    assert.deepEqual(Object.values(LIGHTS_ON).flat().sort(), [...LIGHT_IDS].sort());
    for (const [page, ids] of Object.entries(LIGHTS_ON)) {
        assert.deepEqual((SCENES[page].lights || []).map(l => l.id).sort(), [...ids].sort(), 'the lights of ' + page);
    }
    const G = createGame();
    // the flags that make every checkpoint's ground exist (the dents drawn, the Moon whole)
    for (const f of ['dent1', 'dent2', 'dent3', 'dent4', 'fogd1', 'fogd2', 'fogd3', 'breakfast']) G.flags.add(f);
    for (const [name, cp] of Object.entries(CHECKPOINTS)) {
        G.goto(cp.scene, cp.spot);
        const p = G.player;
        const sup = G.terrain.support(p.x, p.y, 10, 10);
        assert.ok(sup && !sup.s.hidden, `checkpoint ${name} stands on ground (${cp.scene} ${(p.x / HL).toFixed(1)})`);
    }
});

test('a save in the white resumes there and the page can still be finished', { timeout: 300000 }, async () => {
    const R = createRobot();
    for (const f of ['b:arrive', 'breakfast', 'm5_view', 'fin_drawn', 'rocket_gone', 'b:suddArrive', 'visited_sudd', ...LIGHT_IDS.slice(0, 9).map(id => 'light_' + id)]) R.G.flags.add(f);
    R.G.checkpoint = 'whiteEdge';
    const data = R.G.serialize();
    const R2 = createRobot();
    R2.G.restore(data);
    R2.story.start();
    await R2.settle();
    assert.equal(R2.G.sceneId, 'sudd');
    await route.white(R2);
    await route.climax(R2);
    assert.equal(R2.G.lights(), 10);
});

test('a save closed in the middle of the scare opens on Smulhögen with the Moon whole, and the scene plays again', { timeout: 300000 }, async () => {
    const R = createRobot();
    for (const f of ['b:arrive', 'breakfast', 'm5_view', 'fin_drawn', 'rocket_gone', 'b:suddArrive', 'visited_sudd', 'dent1', 'dent2', 'dent3', 'dent4',
        'fog1_lit', 'fog2_lit', 'fog3_lit', 'fogd1', 'fogd2', 'fogd3', 'bridge_refused', 'bridge_crossed', ...LIGHT_IDS.slice(0, 9).map(id => 'light_' + id)]) R.G.flags.add(f);
    R.G.checkpoint = 'crumbs';
    R.G.restore(R.G.serialize());
    R.story.start();
    await R.settle();
    await R.goTo(69.5);
    await R.until(() => R.has('moon_bitten'), {}, 60, 'the first bites');
    const data = R.G.serialize();
    assert.equal(data.checkpoint, 'crumbs');
    assert.ok(!data.flags.includes('moon_bitten'), 'the bitten Moon is not saved');
    const R2 = createRobot();
    R2.G.restore(data);
    R2.story.start();
    await R2.settle();
    assert.equal(R2.G.sceneId, 'sudd');
    assert.ok(!R2.has('moon_bitten'), 'on Smulhögen with the Moon whole');
    await R2.goTo(69.5);
    await R2.settle(120);
    assert.ok(R2.has('outline_gone'), 'the scene played again from the start');
    let dir = 1;
    await R2.until(() => R2.has('self_drawn'), () => { const q = R2.p(); if (q.x > 79 * HL) dir = -1; if (q.x < 63 * HL) dir = 1; return { x: dir }; }, 40, 'drawn back');
    await R2.settle(120);
    assert.equal(R2.G.sceneId, 'vinter');
});

test('the great gallop: stopping loses nothing, and a missed catch comes round again', { timeout: 300000 }, async () => {
    const R = createRobot();
    for (const f of ['b:arrive', 'breakfast', 'self_drawn', 'tenth_drawn', 'ride', ...LIGHT_IDS.map(id => 'light_' + id)]) R.G.flags.add(f);
    R.G.checkpoint = 'tailTip';
    R.G.restore(R.G.serialize());
    R.story.start();
    await R.settle();
    await R.hold(4, { x: -1 });
    await R.until(() => Math.abs(R.p().vx) < 5, {}, 3, 'stopped');
    const got = R.G.puz.ride;
    assert.ok(got > 10 * HL, 'galloped some way');
    await R.hold(20);
    assert.equal(R.G.puz.ride, got, 'a minute standing on the tail loses nothing');
    await R.until(() => R.has('ride_done') && !R.G.busy, () => ({ x: R.G.busy ? 0 : -1 }), 60, 'to the head');
    await R.settle();
    // a jump that is not hidden falls on the lower loop, and Kometen brings it round
    await R.goTo(8.5);
    await R.until(() => R.p().x < 0.6 * HL, () => ({ x: -1 }), 6, 'run to the head');
    await R.step({ x: -1, hop: true });
    await R.until(() => R.G.carry?.def.id === 'loopBack', () => ({ x: -1 }), 6, 'onto the loop');
    await R.until(() => !R.G.carry && R.p().mode === 'ground' && R.p().x > 3 * HL, {}, 10, 'back at the head');
    assert.ok(!R.has('caught'), 'not caught without hiding');
    assert.equal(R.G.sceneId, 'vinter');
});
