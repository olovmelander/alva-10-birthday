/*
 * Äventyr 3: what playing it through in a real browser found (14 November; design section 20.4), each with the case
 * that shows it in the pure game. The pictures themselves are looked at with tests/browser/skoldhast-a3-play.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot, HL } from './skoldhast-a3-robot.mjs';
import { STORY } from '../skoldhast/adventures/adventure-3/content/sv.mjs';
import { SCENES } from '../skoldhast/adventures/adventure-3/content/world.mjs';

async function at(scene, spot, flags = []) {
    const R = createRobot();
    for (const f of ['b:arrive', 'breakfast', 'b:breakfast', 'visited_mane', ...flags]) R.G.flags.add(f);
    R.G.goto(scene, spot);
    R.story.start();
    await R.settle();
    return R;
}
const AFTER_MOON = ['m5_view', 'fin_drawn', 'b:fin', 'b:view', 'light_l1', 'light_l2', 'light_l3', 'beam_used', 'b:firstLight', 'b:beamTalk',
    'b:nightDone', 'b:ledgeDone', 'b:rival1', 'b:rival2', 'b:rival3', 'b:nightFace', 'b:ledge'];
const said = (R, lines) => R.log.findIndex(l => l.kind === 'say' && l.lines === lines);

test('the night side: her lamps do not burn down while a scene is told', { timeout: 120000 }, async () => {
    const R = await at('mane', 'nightStart', ['light_l1', 'beam_used', 'b:firstLight', 'b:beamTalk', 'b:beamDone', 'b:rival1', 'b:night']);
    await R.until(() => R.has('novaLit'), () => ({ x: 1 }), 6, 'a gallop beside Nova lights her lamps');
    R.G.busy++;
    await R.hold(9);
    assert.ok(R.has('novaLit'), 'still lit after nine seconds of talk (they burn four)');
    R.G.busy--;
    await R.hold(6);
    assert.ok(!R.has('novaLit'), 'and they burn down again in play');
});

test('the night side: its talk is told in the dark, also when it is galloped into', { timeout: 120000 }, async () => {
    const R = await at('mane', 'deepWest', ['light_l1', 'beam_used', 'b:firstLight', 'b:beamTalk', 'b:beamDone', 'b:rival1', 'b:crater']);
    // where the beam sets the shell down on the crater's east rim: in the light, west of where the night begins
    const set = SCENES.mane.carries.find(c => c.id === 'beamDeepE').path.at(-1);
    assert.ok(set[0] < SCENES.mane.dark.x0 - 2 * HL, 'the beam sets the shell down in the light');
    R.G.goto('mane', { x: set[0], y: set[1], facing: 1 });
    await R.until(() => said(R, STORY.night) >= 0, () => ({ x: 1 }), 8, 'the night side\'s talk');
    await R.hold(0.1);
    assert.ok(!R.has('novaLit'), 'her lamps are out for "Det är kolsvart"');
    assert.ok(!R.log.slice(0, said(R, STORY.night)).some(l => l.remark && l.lines[0] === STORY.nightAngry[0]), 'and nothing was said about them before it');
    await R.until(() => R.has('night_lit'), () => ({ x: 1 }), 8, 'then a gallop lights them');
    assert.ok(R.log.some(l => l.remark && l.lines[0] === STORY.nightAngry[0]), 'and she says so');
});

test('a scene at an edge is told before the edge: Slungan, Karlavagnen, Luckan', { timeout: 120000 }, async () => {
    // Slungan: at the ring's end, standing on the ice (it used to begin in the jump off it)
    const S = await at('ring', 'ringEnd', [...AFTER_MOON, 'visited_ring', 'b:ringArrive', 'b:ringo', 'b:gravel', 'gravel_passed', 'gravel_held']);
    assert.ok(S.has('b:sling') && S.p().mode === 'ground' && S.p().x < 30 * HL, 'Slungan is talked about on the ice');
    // Karlavagnen: on Hamnstenen, in front of the dashed line (it used to begin on the line, which then drew itself)
    const K = await at('stjarn', 'dock', [...AFTER_MOON, 'visited_stjarn', 'b:stjarnArrive']);
    await K.until(() => K.has('b:wagon'), () => ({ x: 1 }), 8, 'the talk about the line');
    await K.hold(0.3);
    assert.ok(!K.has('wagon_drawn') && K.p().surface?.id === 'dock' && Math.abs(K.p().vx) < 30, 'the sköldhäst stands on Hamnstenen for it');
    // Luckan: a gallop up to the gap stops for the talk, and the ice is not drawn while it is told
    const L = await at('ring', 'rest', [...AFTER_MOON, 'visited_ring', 'b:ringArrive', 'b:ringo', 'b:comet', 'comet_rest', 'b:cometRest', 'light_l7', 'light_l8', 'ice_melted', 'slung']);
    L.G.goto('ring', { x: 71 * HL, y: 0, facing: 1 });
    await L.until(() => L.has('b:gap'), () => ({ x: 1 }), 8, 'the talk at the gap');
    await L.hold(0.3);
    assert.ok(!L.has('gap_drawn') && L.p().mode === 'ground', 'the gap is still to be drawn');
});

test('a line drawn to its end stops the gallop there: the bear\'s nose', { timeout: 120000 }, async () => {
    const R = await at('stjarn', 'bearRock', [...AFTER_MOON, 'visited_stjarn', 'b:stjarnArrive', 'wagon_drawn', 'b:wagonDone', 'belt_lit', 'light_l4', 'b:beltDone', 'b:bear']);
    let end = null;
    R.G.on('streckDone', (e) => { if (e.flag === 'bear_nose') R.G.later(0.05, () => { end = { x: R.p().x, vx: R.p().vx, mode: R.p().mode }; }); });
    await R.goTo(48.5);
    await R.gallopPast(67.8, { max: 30 });
    await R.flag('bear_nose', { x: 1 }, 10);
    await R.hold(0.2);
    assert.ok(end && end.mode === 'ground' && end.vx === 0 && end.x <= 70.6 * HL && end.x > 69.6 * HL, `it stands on the nose (${JSON.stringify(end)})`);
});

test('the Moon\'s scenes have places of their own: none follows a light\'s scene at once', { timeout: 120000 }, async () => {
    // rival1 on Hoppfälten, on the way out
    const R = await at('mane', 'start');
    await R.goTo(31, { gallop: true, max: 60 });
    await R.settle();
    assert.ok(R.has('b:rival1'), 'Klo has measured the Moon by Hoppfälten');
    // the first light: its own scene only; the beam is talked about at the crater's wall
    const C = await at('mane', 'deepWest', ['b:rival1', 'b:crater']);
    C.G.goto('mane', { x: 49.6 * HL, y: 4 * HL, facing: 1 });
    await C.flag('light_l1', { x: 0.4 }, 6);
    await C.settle();
    assert.ok(C.has('b:firstLight') && !C.has('b:beamTalk') && !C.has('b:rival2'), 'at the light: what a star-light is, and no more');
    await C.goTo(52.6);
    await C.settle();
    assert.ok(C.has('b:beamTalk'), 'at the wall: the walls are too high, and the ring of light');
    // rival2 at Kanten before the stairs (with the Moon's postcard), the ledge at their foot, rival3 on the way back
    const E = await at('mane', 'edgeStart', ['light_l1', 'light_l2', 'beam_used', 'b:firstLight', 'b:beamTalk', 'b:rival1', 'b:night', 'b:nightDone']);
    await E.hold(3);
    await E.settle();
    assert.ok(E.has('b:rival2') && E.has('card_mane') && !E.has('b:ledge'), 'the postcard at Kanten');
    await E.goTo(81.2);
    await E.settle();
    assert.ok(E.has('b:ledge'), 'the ledge at the foot of the stairs');
    const B = await at('mane', 'start', [...AFTER_MOON.filter(f => f !== 'b:rival3' && f !== 'fin_drawn' && f !== 'b:fin')]);
    // (a few seconds after the last scene, never back to back with it)
    B.G.goto('mane', { x: 30 * HL, y: 0, facing: -1 });
    await B.hold(1);
    assert.ok(!B.has('b:rival3'), 'not at once after another scene');
    await B.hold(5);
    await B.settle();
    assert.ok(B.has('b:rival3'), '"Han är kär" on the way back from Utsikten');
});
