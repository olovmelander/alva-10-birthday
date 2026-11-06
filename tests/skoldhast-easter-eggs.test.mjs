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

test('Äventyr 2: after the story, Tordyveln shows his ball of eggshells, the finest yet, deep in Kristallgrottan', async () => {
    const R = robot2(), { G } = R;
    for (const f of A2_DONE) G.flags.add(f);
    // everyone goes home after the story: Tordyveln is no longer by the nest, nor on his hill
    G.goto('strand', { x: G.scenes.strand.nest.x - 3.2 * HL, y: -0.42 * HL, facing: -1 });
    R.story.start(); await R.settle(); await R.hold(0.3);
    assert.notEqual(G.actors.dyvel?.scene, 'strand', 'he has gone into the mountain with his new ball');
    const kb = G.scenes.kristall.spots.beetle;
    G.goto('kristall', { x: kb.x + 0.6 * HL, y: kb.y, facing: -1 });
    await R.settle(); await R.hold(0.3);
    assert.equal(G.actors.dyvel.scene, 'kristall');
    assert.equal(G.context?.id, 'talk-dyvel');
    assert.equal(G.context.who, 'dyvel');
    await R.act(); await R.settle();
    for (const line of STORY2.dyvelShells) assert.ok(said(R, line), line[1]);
    assert.ok(G.flags.has('dyvel_shellball') && R.log.some(l => l.kind === 'fx' && l.name === 'shellBall'));
    await R.hold(0.3); await R.act(); await R.settle();
    assert.ok(said(R, STORY2.dyvelShellsAgain[0]), 'after that he is just proud of it');
    // before the end he talks about his old ball, as before
    const B = robot2();
    for (const f of ['b:arrive', 'b:firstEgg']) B.G.flags.add(f);
    B.G.goto('strand', { x: B.G.scenes.strand.spots.beetle.x + 0.6 * HL, y: B.G.scenes.strand.spots.beetle.y, facing: -1 });
    B.story.start(); await B.settle(); await B.hold(0.3);
    if (B.G.context?.id === 'talk-dyvel') { await B.act(); await B.settle(); }
    assert.ok(!B.G.flags.has('dyvel_shellball'));
});

test('Äventyr 2: after the story, Skatan is home in her tree and copies a whinny under it', async () => {
    const R = robot2(), { G } = R;
    for (const f of A2_DONE) G.flags.add(f);
    G.goto('strand', { x: G.scenes.strand.nest.x - 2.0 * HL, y: -0.42 * HL, facing: -1 });
    R.story.start(); await R.settle();
    const mp = G.scenes.strand.spots.magpie;
    assert.ok(Math.abs(G.actors.skata.x - mp.x) < 1 * HL && G.actors.skata.y < -2 * HL, 'back on her branch, not by the nest');
    await R.step({ tapHero: true }); await R.settle();
    assert.ok(!said(R, STORY2.skataMimic[0]), 'by the nest it is Molnet who answers, not Skatan');
    G.goto('strand', { x: G.scenes.strand.spots.magTree.x - 0.8 * HL, y: G.scenes.strand.spots.magTree.y, facing: -1 });
    await R.settle(); await R.hold(0.5);
    const joys = R.log.filter(l => l.kind === 'fx' && l.name === 'cloudJoy').length;
    await R.step({ tapHero: true }); await R.settle();
    assert.ok(said(R, STORY2.skataMimic[0]), 'Skatan answers');
    assert.ok(R.log.some(l => l.kind === 'fx' && l.name === 'skataMimic'));
    assert.equal(R.log.filter(l => l.kind === 'fx' && l.name === 'cloudJoy').length, joys, 'under her tree it is her turn, not Molnet\'s');
});

test('Äventyr 1: after the story, Kartväktaren\'s note at Streckbron says something new', async () => {
    const R = robot1(), { G } = R;
    G.restore({ flags: [...CODE_RESTORE[2].flags, 'ended', 'conclusion'], checkpoint: 'beachEnd' });
    G.goto('land', { x: G.sceneDef.spots.note1.x, y: -0.66 * 200, facing: -1 });
    await R.settle(); await R.hold(0.3);
    assert.equal(G.context?.id, 'read');
    await R.context('read'); await R.settle();
    assert.ok(said(R, STORY1.after.note1After), 'the new note');
    assert.ok(!said(R, STORY1.k1.note1), 'not the old one');
});

test('Äventyr 2: after the story, the hollow log is still a drum; the cocoa tree drops a fruit and Klo gives it to Tukankrabban again', async () => {
    const R = robot2(), { G } = R;
    for (const f of [...A2_DONE, 'p1_fallen', 'egg_e2']) G.flags.add(f);
    G.goto('strand', { x: 21 * HL, y: -0.6 * HL, facing: -1 });
    R.story.start(); await R.settle();
    const falls = () => R.log.filter(l => l.kind === 'fx' && l.name === 'cocoaFall').length;
    for (let i = 0; i < 4 && !falls(); i++) { await R.gallopPast(13.5); await R.settle(); if (falls()) break; await R.gallopPast(20.5); await R.settle(); }
    assert.equal(falls(), 1, 'a cocoa fruit falls');
    for (const line of STORY2.cocoaAgain) assert.ok(said(R, line), line[1]);
    await R.gallopPast(20.5); await R.settle();
    assert.equal(falls(), 1, 'the tree rests a while: no fruit on every gallop');
    await R.hold(6);
    for (let i = 0; i < 4 && falls() < 2; i++) { await R.gallopPast(13.5); await R.settle(); if (falls() >= 2) break; await R.gallopPast(20.5); await R.settle(); }
    assert.equal(falls(), 2, 'and later another');
    assert.equal(R.log.filter(l => l.kind === 'say' && l.lines.some(([, t]) => t === STORY2.cocoaAgain[0][1])).length, 1, 'the words only the first time');
    assert.ok(!G.flags.has('egg_e11') && G.flags.has('ended'));
    // after P1 but before the end, the log is quiet
    const B = robot2();
    for (const f of ['b:arrive', 'b:firstEgg', 'p1_fallen', 'egg_e2', 'b:fallen']) B.G.flags.add(f);
    B.G.goto('strand', { x: 21 * HL, y: -0.6 * HL, facing: -1 });
    B.story.start(); await B.settle();
    for (let i = 0; i < 3; i++) { await B.gallopPast(13.5); await B.settle(); await B.gallopPast(20.5); await B.settle(); }
    assert.ok(!B.log.some(l => l.kind === 'fx' && l.name === 'cocoaFall'));
});

test('Äventyr 1: after the story, the lyktfiskar leave their lamps in Mörka valvet and dance round a hidden shell', async () => {
    const R = robot1(), { G } = R;
    G.restore({ flags: [...CODE_RESTORE[2].flags, 'ended', 'conclusion'], checkpoint: 'beachEnd' });
    assert.ok(G.flags.has('p5_lit'));
    G.goto('kelp', { x: 25.9 * 200, y: 11.5 * 200, facing: 1, mode: 'swim' });
    await R.settle(); await R.hold(0.2);
    assert.equal(G.puz.school.state, 'lit', 'at their lamps');
    await R.hide(); await R.hold(1);
    assert.equal(G.puz.school.state, 'dance', 'hidden under the roof, they come and dance');
    assert.ok(Math.hypot(G.puz.school.x - G.player.x, G.puz.school.y - G.player.y) < 0.5 * HL, 'round the shell');
    await R.hold(2); await R.settle();
    assert.ok(said(R, STORY1.after.lyktDance) || R.log.some(l => l.kind === 'remark' && l.line?.[1] === STORY1.after.lyktDance[1]), 'Klo writes it down');
    await R.hide(); await R.hold(0.3);
    assert.equal(G.puz.school.state, 'lit', 'back to their lamps when the shell comes out');
    // before the end they keep their lamps
    const B = robot1();
    B.G.restore({ flags: CODE_RESTORE[2].flags, checkpoint: 'viken' });
    B.G.goto('kelp', { x: 25.9 * 200, y: 11.5 * 200, facing: 1, mode: 'swim' });
    await B.settle(); await B.hide(); await B.hold(1.5);
    assert.equal(B.G.puz.school.state, 'lit');
});

test('Äventyr 2: after the story, the forest\'s mushroom giggles when it bounces the sköldhäst up', async () => {
    const bounceOnce = async (R) => {
        const { G } = R;
        G.goto('skog', { x: 98.5 * HL, y: -0.6 * HL, facing: -1 });
        R.story.start(); await R.settle();
        await R.walkTo(96.5); await R.settle();
        await R.buck();
        await R.until(() => G.player.surface?.id === 'owl-branch', {}, 4, 'bounced onto the branch');
        await R.settle();
    };
    const R = robot2();
    for (const f of [...A2_DONE, 'p2_bridge', 'egg_e3', 'b:skogArrive', 'b:bounce']) R.G.flags.add(f);
    await bounceOnce(R);
    assert.ok(R.log.some(l => l.kind === 'fx' && l.name === 'giggle'), 'it giggles');
    for (const line of STORY2.mushroomGiggle) assert.ok(said(R, line), line[1]);
    // before the end it only bounces
    const B = robot2();
    for (const f of ['b:arrive', 'b:firstEgg', 'p2_bridge', 'egg_e3', 'b:skogArrive']) B.G.flags.add(f);
    await bounceOnce(B);
    assert.ok(B.events.some(e => e.type === 'bounce'));
    assert.ok(!B.log.some(l => l.kind === 'fx' && l.name === 'giggle'));
});

test('Äventyr 2: after the story, standing still in Stormens öga brings a falling star from Alva\'s stars', async () => {
    const R = robot2(), { G } = R;
    for (const f of [...A2_DONE, 'topp_reached', 'storm_source']) G.flags.add(f);
    const top = G.scenes.topp.spots.summit;
    G.goto('topp', { x: top.x - 2 * HL, y: top.y, facing: 1 });
    R.story.start(); await R.settle(); await R.hold(1.5);
    assert.ok(!R.log.some(l => l.kind === 'fx' && l.name === 'starFall'), 'not at once');
    await R.hold(2); await R.settle();
    assert.ok(R.log.some(l => l.kind === 'fx' && l.name === 'starFall'), 'a star falls');
    for (const line of STORY2.starFall) assert.ok(said(R, line), line[1]);
    await R.hold(5); await R.settle();
    assert.equal(R.log.filter(l => l.kind === 'fx' && l.name === 'starFall').length, 1, 'not one after another');
    // before the end there are no stars to fall
    const B = robot2();
    for (const f of ['b:arrive', 'b:firstEgg', 'topp_reached', 'cloud_met', 'b:summit']) B.G.flags.add(f);
    B.G.goto('topp', { x: top.x - 2 * HL, y: top.y, facing: 1 });
    B.story.start(); await B.settle(); await B.hold(4); await B.settle();
    assert.ok(!B.log.some(l => l.kind === 'fx' && l.name === 'starFall'));
});
