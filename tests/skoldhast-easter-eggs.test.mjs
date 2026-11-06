/*
 * Small surprises for whoever plays on after the story (6 November): two in each adventure, only after the end,
 * each from the story's own characters. Äventyr 2: the ten little researchers follow the sköldhäst, and Molnet flashes
 * for joy. Äventyr 1: Vattenporten's echo goes into Klo's measurements, and Kartväktaren sets a paper boat on the bay.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot as robot1, HL } from './skoldhast-robot.mjs';
import { createRobot as robot2 } from './skoldhast-a2-robot.mjs';
import { STORY as STORY1, JOURNAL } from '../skoldhast/src/content/sv.mjs';
import { STORY as STORY2 } from '../skoldhast/adventures/adventure-2/content/sv.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';

const said = (R, line) => R.log.some(l => l.kind === 'say' && l.lines.some(([who, text]) => who === line[0] && text === line[1]));
const A2_DONE = ['b:arrive', 'b:firstEgg', 'cloud_met', 'eggs_in_nest', 'moon', 'alva_stars', 'hatched', 'watch_given', 'skata_gift', 'ended', 'b:finale'];

test('Äventyr 2: after the story, the ten little researchers follow the sköldhäst from the nest, and go home again', async () => {
    const R = robot2(), { G } = R;
    for (const f of A2_DONE) G.flags.add(f);
    G.goto('strand', { x: G.scenes.strand.nest.x + 1.2 * HL, y: -0.42 * HL, facing: -1 });
    R.story.start(); await R.settle();
    assert.ok(!G.hatchFollow);
    await R.hide(); await R.hold(2);
    assert.equal(G.hatchFollow, true, 'hidden by the nest, they gather and follow');
    await R.settle();
    assert.ok(said(R, STORY2.hatchlingsFollow[0]), 'Tukankrabban says so, once');
    await R.emerge(); await R.hold(0.5); await R.hide(); await R.hold(2);
    assert.equal(G.hatchFollow, false, 'hidden by the nest again, they go home');
    await R.emerge(); await R.hold(0.5); await R.hide(); await R.hold(2);
    assert.equal(G.hatchFollow, true);
    G.goto('skog', 'fromStrand');
    assert.equal(G.hatchFollow, false, 'they stay by their nest when the page turns');
    assert.equal(R.log.filter(l => l.kind === 'say' && l.lines.some(([, t]) => t === STORY2.hatchlingsFollow[0][1])).length, 1);
});

test('Äventyr 2: before the end, hiding by the nest does nothing of the kind', async () => {
    const R = robot2(), { G } = R;
    for (const f of ['b:arrive', 'b:firstEgg']) G.flags.add(f);
    G.goto('strand', { x: G.scenes.strand.nest.x + 1.2 * HL, y: -0.42 * HL, facing: -1 });
    R.story.start(); await R.settle();
    await R.hide(); await R.hold(2.5);
    assert.ok(!G.hatchFollow);
});

test('Äventyr 2: after the story, a whinny under Molnet makes it flash for joy (not before the moon)', async () => {
    const R = robot2(), { G } = R;
    for (const f of A2_DONE) G.flags.add(f);
    G.goto('strand', { x: G.scenes.strand.spots.cloudSky.x + 0.5 * HL, y: -0.42 * HL, facing: -1 });
    R.story.start(); await R.settle();
    await R.step({ tapHero: true }); await R.settle();
    assert.ok(R.log.some(l => l.kind === 'fx' && l.name === 'cloudJoy'), 'Molnet flashes');
    assert.ok(said(R, STORY2.molnJoy[0]), 'and says why, once');
    await R.hold(3); await R.step({ tapHero: true }); await R.settle();
    assert.equal(R.log.filter(l => l.kind === 'fx' && l.name === 'cloudJoy').length, 2, 'again, without the words');
    // before the story's end there is no such flash
    const B = robot2();
    for (const f of ['b:arrive', 'b:firstEgg', 'cloud_met']) B.G.flags.add(f);
    B.G.goto('strand', { x: B.G.scenes.strand.spots.cloudSky.x + 0.5 * HL, y: -0.42 * HL, facing: -1 });
    B.story.start(); await B.settle();
    await B.step({ tapHero: true }); await B.settle();
    assert.ok(!B.log.some(l => l.kind === 'fx' && l.name === 'cloudJoy'));
});

test('Äventyr 1: after the story, Vattenporten answers a whinny twice, and Klo writes it down once', async () => {
    const R = robot1(), { G } = R;
    G.restore({ flags: [...CODE_RESTORE[2].flags, 'ended', 'conclusion'], checkpoint: 'beachEnd' });
    G.goto('land', { x: 101.6 * 200, y: -0.2 * 200, facing: -1 });
    await R.settle();
    await R.step({ tapHero: true }); await R.hold(3); await R.settle();
    assert.ok(G.flags.has('exp_eko'), 'a new measurement');
    assert.ok(R.log.some(l => l.kind === 'toast' && l.text.includes(JOURNAL.experiments.eko.slice(0, 10))));
    assert.ok(said(R, STORY1.after.echo), 'Klo says so');
    const n = R.log.filter(l => l.kind === 'toast').length;
    await R.hold(1); await R.step({ tapHero: true }); await R.hold(3); await R.settle();
    assert.equal(R.log.filter(l => l.kind === 'toast').length, n, 'only once');
    // before the end, the arch does not answer
    const B = robot1();
    B.G.restore({ flags: CODE_RESTORE[2].flags, checkpoint: 'viken' });
    B.G.goto('land', { x: 101.6 * 200, y: -0.2 * 200, facing: -1 });
    await B.settle();
    await B.step({ tapHero: true }); await B.hold(3);
    assert.ok(!B.G.flags.has('exp_eko'));
});

test('Äventyr 1: after the story, Kartväktaren sets a paper boat on the bay', async () => {
    const R = robot1(), { G } = R;
    G.restore({ flags: [...CODE_RESTORE[2].flags, 'ch3_open', 'viken_arrived', 'b:k3_arrive', 'kv_met', 'talk1', 'talk2', 'talk_done', 'lamp_lit', 'ended', 'conclusion'], checkpoint: 'beachEnd' });
    G.goto('viken', { x: 22.4 * 200, y: -0.62 * 200, facing: 1 });
    await R.settle(); await R.hold(0.3);
    assert.equal(G.context?.id, 'kvBoat');
    assert.equal(G.context.who, 'kv', 'the note shows his face');
    await R.context('kvBoat'); await R.settle();
    assert.ok(R.log.some(l => l.kind === 'fx' && l.name === 'paperBoat'));
    assert.ok(G.flags.has('kv_boat'));
    for (const line of STORY1.after.kvBoat) assert.ok(said(R, line), line[1]);
    await R.hold(0.3);
    assert.notEqual(G.context?.id, 'kvBoat', 'once');
});
