/*
 * Äventyr 3: what the audit of 13 November found in play, each with the case that showed it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot, HL } from './skoldhast-a3-robot.mjs';
import { STORY, HINTS, OWN_HINTS, POINT } from '../skoldhast/adventures/adventure-3/content/sv.mjs';
import { SCENES, CHECKPOINTS } from '../skoldhast/adventures/adventure-3/content/world.mjs';

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
const STJARN = [...AFTER_MOON, 'visited_stjarn', 'b:stjarnArrive'];
const WHITE = [...AFTER_MOON, 'rocket_gone', 'b:suddArrive', 'dent1', 'dent2', 'dent3', 'dent4', 'fog1_lit', 'fog2_lit', 'fog3_lit', 'fogd1', 'fogd2',
    'fogd3', 'b:fog', ...['l4', 'l5', 'l6', 'l7', 'l8', 'l9'].map(l => 'light_' + l)];
const sinceLog = (R, n) => R.log.slice(n);

test('Orions bälte: talking to Nova there blinks the order again, as the hint says', { timeout: 120000 }, async () => {
    const R = await at('stjarn', 'beltRock', [...STJARN, 'wagon_drawn', 'b:wagonDone']);
    assert.ok(R.G.areas.has('belt'));
    const n0 = R.log.length;
    R.G.emit('talk', { who: 'nova' });
    await R.settle();
    const after = sinceLog(R, n0);
    assert.ok(after.some(l => l.kind === 'fx' && l.name === 'beltBlink'), 'her lamps blink the order');
    assert.ok(after.some(l => l.kind === 'say' && l.lines[0] === STORY.belt[2]), 'and she says to watch them');
    assert.match(HINTS.s2[1], /Prata med/);
});

test('Karlavagnen is drawn before anyone floats on to Orions bälte', { timeout: 120000 }, async () => {
    // floating above the dashed line, not galloping along it (the audit's robot reached the belt so)
    const R = await at('stjarn', 'dock', STJARN);
    await R.floatTo(39.8, -4, { max: 25 }).catch(() => {});
    assert.ok(!R.has('wagon_drawn'));
    assert.ok(R.p().x < 31 * HL, `stopped before the belt (x ${(R.p().x / HL).toFixed(1)})`);
    assert.ok(R.events.some(e => e.type === 'balk' && e.reason === 'thin'), 'with "Strecket håller inte än"');
    R.G.flag('wagon_drawn'); R.G.flags.add('b:wagonDone');
    await R.floatTo(39.8, -4, { max: 25 });
    assert.ok(R.p().x > 31 * HL, 'once it is drawn the way is open');
});

test('Grusregnet: the shell\'s measurement is written even for a player who never hid (åtta mot åtta)', { timeout: 120000 }, async () => {
    const R = await at('ring', 'icedock', [...AFTER_MOON, 'visited_ring', 'b:ringArrive']);
    R.G.goto('ring', 'ringEnd');
    await R.until(() => R.G.areas.has('sling'), () => ({ x: 0.5 }), 6, 'off the ring\'s end, into the slingshot');
    assert.ok(R.has('gravel_passed') && R.has('gravel_held'));
});

test('"Jag har fastnat" never skips a stretch of open space (the slingshot, Kometen\'s lane)', { timeout: 120000 }, async () => {
    const R = await at('ring', 'icedock', [...AFTER_MOON, 'visited_ring', 'b:ringArrive']);
    for (const [x, beyond] of [[28.6, 30.15], [61.8, 63.15]]) {
        const sup = R.G.terrain.support(x * HL, -5 * HL, 0, 10 * HL);
        R.G.goto('ring', { x: x * HL, y: sup ? sup.y : 0, facing: 1 });
        const s = R.G.safeSpot();
        assert.ok(!s || s.x < beyond * HL, `from x ${x}: not to ${(s?.x / HL).toFixed(1)}, across the space`);
    }
});

test('Sista bron: a hop where it begins just lands (the Moon\'s floating ledge rule is the Moon\'s)', { timeout: 120000 }, async () => {
    for (const extra of [[], ['bridge_refused', 'b:bridge']]) {
        const R = await at('sudd', 'bridgeStart', [...WHITE, ...extra]);
        const e0 = R.events.length, n0 = R.log.length;
        await R.step({ hop: true });
        await R.hold(2.5);
        assert.ok(!R.events.slice(e0).some(e => e.type === 'balk' && e.reason === 'float'), 'no float');
        assert.ok(!sinceLog(R, n0).some(l => l.text === STORY.ledgeFloat), 'no Moon thought');
        assert.equal(R.p().mode, 'ground');
        assert.ok(Math.abs(R.p().x - SCENES.sudd.spots.bridgeStart.x) < 1.2 * HL, 'still at the bridge');
    }
});

test('Sista bron: before it is rubbed out the help is the marks\', after it Nova\'s ring of light', { timeout: 120000 }, async () => {
    const R = await at('sudd', 'bridgeStart', WHITE);
    R.G.goto('sudd', { x: 49 * HL, y: SCENES.sudd.spots.bridgeStart.y });
    await R.hold(0.2);
    assert.ok(R.G.areas.has('lastBridge'));
    assert.ok(HINTS.v1.includes(R.story.hint({ peek: true }).text), 'gallop the mark');
    R.G.flag('bridge_refused'); R.G.flags.add('b:bridge');
    assert.ok(HINTS.v3.includes(R.story.hint({ peek: true }).text), 'then the ring of light');
});

test('after the story, Kometen home: the save is on the Moon, not on the comet', { timeout: 180000 }, async () => {
    const all = [...AFTER_MOON, 'rocket_gone', 'b:suddArrive', 'climax', 'moon_bitten', 'outline_gone', 'clue_sudd', 'self_drawn', 'tenth_drawn', 'ride',
        'ride_done', 'caught', 'moon_whole', 'lights_home', 'gold', 'constellation', 'telescope', 'notes_ink', 'ended', 'b:landed', 'b:rimHeals', 'b:finale',
        'b:drawnSelf', 'b:lift', 'visited_stjarn', 'visited_ring', 'visited_sudd', 'visited_vinter', ...['l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'].map(l => 'light_' + l)];
    const R = await at('mane', 'home', all);
    R.G.setCheckpoint('home');
    await R.goTo(3.6);
    R.travel('vinter');
    await R.context('travel', 5);
    await R.settle();
    assert.equal(R.G.sceneId, 'vinter');
    await R.until(() => R.p().x < 9 * HL, () => ({ x: -1 }), 60, 'to the head');
    await R.goTo(8.5);
    await R.until(() => R.p().x < 0.6 * HL, () => ({ x: -1 }), 6, 'run to the head');
    await R.step({ x: -1, hop: true }); await R.hold(0.15, { x: -1 }); await R.step({ hide: true });
    await R.until(() => R.G.sceneId === 'mane' && !R.G.carry, {}, 15, 'carried to the Moon');
    await R.settle();
    assert.equal(CHECKPOINTS[R.G.checkpoint].scene, 'mane');
});

test('Den stora galoppen: a reload does not say every passed remark at once', { timeout: 180000 }, async () => {
    const flags = [...AFTER_MOON, 'rocket_gone', 'b:suddArrive', 'climax', 'moon_bitten', 'outline_gone', 'clue_sudd', 'self_drawn', 'tenth_drawn', 'ride',
        'b:drawnSelf', ...['l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'].map(l => 'light_' + l)];
    const R = await at('vinter', 'tailTip', flags);
    R.G.setCheckpoint('tailTip');
    await R.until(() => R.p().x < 60 * HL, () => ({ x: -1 }), 40, 'gallop');
    const passed = R.G.puz.rideMarks;
    assert.ok(passed > 2);
    const Q = createRobot();
    Q.G.restore(JSON.parse(JSON.stringify(R.G.serialize())));
    Q.story.start();
    const e0 = Q.events.length;
    await Q.hold(0.5);
    assert.equal(Q.events.slice(e0).filter(e => e.type === 'rideMark').length, 0);
    assert.equal(Q.G.puz.rideMarks, passed, 'the remarks already passed stay passed');
});

test('the first light found, wherever it is, says what a star-light is; the crater\'s beam talk only if needed', { timeout: 120000 }, async () => {
    const R = await at('mane', 'start', ['visited_mane']);
    R.G.flag('light_l2'); R.G.emit('light', { id: 'l2', n: 1 });
    await R.settle();
    assert.ok(R.log.some(l => l.kind === 'say' && l.lines === STORY.firstLight) && R.has('clue_light'), 'on the night side');
    R.G.flag('beam_used');
    const n0 = R.log.length;
    R.G.flag('light_l1'); R.G.emit('light', { id: 'l1', n: 2 });
    await R.settle();
    assert.ok(!sinceLog(R, n0).some(l => l.kind === 'say' && (l.lines === STORY.firstLight || l.lines === STORY.beam)), 'not again, and no beam talk');
});

test('the help on the Moon before travel, and at nine lights, is recorded and says where to go', { timeout: 120000 }, async () => {
    const R = await at('mane', 'start', ['visited_mane']);
    assert.equal(R.story.hint({ peek: true }).ladder, 'moon', 'not "Res dit det fattas ljus" before the rocket can travel');
    const Q = await at('mane', 'start', [...AFTER_MOON, ...['l4', 'l5', 'l6', 'l7', 'l8', 'l9'].map(l => 'light_' + l)]);
    assert.equal(Q.story.hint({ peek: true }).ladder, 'white');
    assert.ok(HINTS.white.includes(Q.story.hint({ peek: true }).text));
});

test('a hint in the companion\'s own words: Nova says "min krater", Klo "mina klor"', { timeout: 120000 }, async () => {
    const all = [...AFTER_MOON, 'rocket_gone', 'climax', 'moon_bitten', 'outline_gone', 'clue_sudd', 'self_drawn', 'tenth_drawn', 'ride', 'ride_done',
        'caught', 'moon_whole', 'b:landed', 'b:rimHeals', ...['l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'].map(l => 'light_' + l)];
    const R = await at('mane', 'start', all);
    R.G.goto('mane', { x: 4 * 200, y: 0 });
    await R.hold(0.2);
    assert.equal(R.story.hint({ peek: true, who: 'nova' }).text, OWN_HINTS.nova['home.0']);
    assert.equal(R.story.hint({ peek: true, who: 'klo' }).text, HINTS.home[0]);
    const n0 = R.log.length;
    R.G.emit('talk', { who: 'nova' });
    await R.settle();
    assert.ok(sinceLog(R, n0).some(l => l.kind === 'say' && l.lines[0][0] === 'nova' && l.lines[0][1] === OWN_HINTS.nova['home.0']));
});

test('the notebook writes what is said when it is said: the Moon\'s postcard, the Karlavagnen fact, Kometen\'s clue', { timeout: 120000 }, async () => {
    const R = await at('mane', 'nightStart', ['visited_mane', 'light_l1', 'b:firstLight', 'beam_used', 'b:beamTalk', 'b:rival1', 'b:night', 'b:nightFace']);
    assert.ok(!R.story.notebook().postcards.includes('mane'), 'not at the first light');
    R.G.flag('light_l2'); R.G.emit('light', { id: 'l2', n: 2 });
    await R.settle();
    assert.ok(!R.has('b:rival2') && !R.story.notebook().postcards.includes('mane'), 'nor at the second: Klo has not said it yet');
    // (Klo and Nova's scenes have places of their own since 14 November: this one at Kanten, before the stairs)
    R.G.goto('mane', 'edgeStart');
    await R.hold(3);
    await R.settle();
    assert.ok(R.has('b:rival2') && R.story.notebook().postcards.includes('mane'), 'when Klo says he writes one');
    const S = await at('stjarn', 'beltRock', [...STJARN, 'wagon_drawn', 'b:wagonDone']);
    assert.ok(!S.story.notebook().facts.some(f => f.id === 'wagon'), 'Karlavagnen is the bear\'s back: written when the bear is met');
    const C = await at('ring', 'icedock', [...AFTER_MOON, 'visited_ring', 'b:ringArrive', 'comet_rest', 'light_l8']);
    assert.ok(!C.has('clue_crooked') || C.has('b:crooked'), 'the crooked clue comes with Nova\'s "De raka stjärnorna är kvar"');
});

test('Nova\'s claw says "Långt." only when the light is far', { timeout: 120000 }, async () => {
    const R = await at('stjarn', 'pipArrive', [...STJARN, 'wagon_drawn', 'b:wagonDone', 'belt_lit', 'light_l4', 'b:beltDone', 'bear_nose', 'b:bearWakes', 'light_l5']);
    const l6 = SCENES.stjarn.lights.find(l => l.id === 'l6');
    for (const [dx, dir] of [[4, 'aside'], [8, 'side']]) {
        Object.assign(R.G.player, { x: l6.x - dx * HL, y: l6.y + 0.4 * HL });
        assert.equal(R.story.pointer()?.dir, dir, `${dx} lengths away`);
    }
    assert.ok(!/Långt/.test(POINT.aside) && /Långt/.test(POINT.side));
});
