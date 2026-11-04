/*
 * Äventyr 2: Den magiska skogen. A robot plays the whole adventure through the
 * real simulation, puzzles and story, with ordinary inputs only (like
 * tests/skoldhast-playthrough.test.mjs for Adventure 1). If a puzzle can't be
 * finished, it fails and says where the robot got stuck.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot, HL } from './skoldhast-a2-robot.mjs';
import { createGame } from '../skoldhast/adventures/adventure-2/game.mjs';
import { SCENES, CHECKPOINTS, EGG_IDS, EGG_TOTAL } from '../skoldhast/adventures/adventure-2/content/world.mjs';
import { STORY, TABLE, HINTS, GOALS } from '../skoldhast/adventures/adventure-2/content/sv.mjs';
import { heightOn } from '../skoldhast/src/sim.mjs';

async function begin(R) {
    R.G.goto('strand', 'start');
    R.story.start();
    await R.settle();
}

export async function digAndCocoa(R) {
    const { G } = R;
    await R.walkTo(30.4);
    await R.context('dig');
    await R.settle();
    assert.equal(G.eggs(), 1, 'E1: digging finds the first egg');
    await R.walkTo(21);
    await R.settle();
    for (let i = 0; i < 4 && !R.has('p1_fallen'); i++) {
        await R.gallopPast(13.5); await R.settle();
        if (R.has('p1_fallen')) break;
        await R.gallopPast(20.5); await R.settle();
    }
    assert.ok(R.has('p1_fallen'), 'P1: galloping over the hollow log shakes the egg down');
    await R.walkTo(13.3);
    await R.until(() => R.has('egg_e2'), {}, 3, 'pick up the fallen egg');
    await R.settle();
}

export async function bridgeAndForest(R) {
    const { G } = R;
    await R.walkTo(8.2); await R.settle();
    // a walk onto Mira's dashed bridge is refused
    await R.until(() => R.events.some(e => e.type === 'balk' && e.reason === 'thin'), { x: -0.4 }, 6, 'slow bridge refusal');
    assert.ok(!R.has('p2_bridge'));
    await R.walkTo(11); await R.settle();
    await R.gallopPast(0);
    await R.settle();
    assert.ok(R.has('p2_bridge'), 'P2: a full gallop draws the bridge whole');
    await R.until(() => G.sceneId === 'skog', { x: -1 }, 10, 'exit to the forest');
    await R.settle();
    await R.walkTo(96.6); await R.settle();
    assert.ok(R.has('egg_e3'), 'P2: the egg on the mushroom');
    // P4: the dark root cave
    await R.walkTo(88.6); await R.settle();
    await R.until(() => R.events.some(e => e.type === 'balk' && e.reason === 'dark'), { x: -0.5 }, 6, 'dark refusal');
    await R.walkTo(89.7); await R.settle();
    await R.hide();
    await R.until(() => R.has('p4_lit'), {}, 6, 'P4: the seeds open round a still shell');
    await R.emerge(); await R.settle();
    await R.walkTo(79.6); await R.settle();
    assert.ok(R.has('egg_e9'), 'P4: the egg in Rotgrottan');
    // P7: a short run is refused, the downhill run leaps
    await R.walkTo(52.0); await R.settle();
    await R.walkTo(41.5); await R.settle();
    await R.until(() => R.events.some(e => e.type === 'balk' && e.reason === 'runup'), { x: -1 }, 5, 'short run refusal');
    await R.walkTo(51.3); await R.settle();
    await R.until(() => G.player.mode === 'leap', { x: -1 }, 10, 'P7: the big leap');
    await R.until(() => G.player.mode === 'ground', {}, 4, 'land');
    await R.settle();
    await R.walkTo(31.6); await R.settle();
    assert.ok(R.has('egg_e10'), 'P7: the egg across Ravinen');
    await R.walkTo(33.9); await R.settle();
    await R.face(1);
    await R.context('pull'); await R.settle();
    assert.ok(R.has('p7_vine'), 'the vine makes the way back');
}

export async function climbTree(R) {
    const { G } = R;
    await R.walkTo(11.0); await R.settle();
    await R.buck();
    assert.equal(G.player.surface?.id, 'brB');
    await R.walkTo(21.8); await R.settle();
    await R.buck();
    assert.equal(G.player.surface?.id, 'brC');
    await R.walkTo(9.5, { max: 60 }); await R.settle();
    assert.ok(R.has('cloud_met'), 'the crown: the cloud is afraid of the dark');
}

export async function backToStrand(R) {
    const { G } = R;
    await R.walkTo(22.5); await R.settle();
    await R.walkTo(10.6); await R.settle();
    await R.walkTo(30); await R.settle();
    await R.walkTo(60, { max: 60 }); await R.settle();
    await R.until(() => G.sceneId === 'strand', { x: 1 }, 40, 'back to the river beach');
    await R.settle();
}

export async function eastBank(R) {
    const { G } = R;
    await R.walkTo(32.6); await R.settle();
    await R.until(() => G.player.mode === 'swim', { x: 1 }, 5, 'into the river');
    await R.swimTo(50, 0.6, { max: 30 });
    await R.until(() => G.player.mode === 'ground' && G.player.x > 57 * HL, { x: 1 }, 20, 'wade out on the east bank');
    // P5
    await R.walkTo(63.0); await R.settle();
    await R.walkTo(61.2); await R.settle();
    await R.face(1);
    await R.context('push');
    assert.ok(!R.has('p5_rolled'), 'pushing from the river side does not roll the ball');
    for (let i = 0; i < 6 && !R.has('p5_rolled'); i++) {
        await R.walkTo((G.puz.ball ?? G.scenes.strand.ball.x0) / HL + 0.65);
        await R.face(-1);
        await R.context('push');
        await R.hold(0.7);
    }
    await R.until(() => R.has('p5_washed'), {}, 5, 'P5: the river washes the ball');
    await R.settle();
    await R.walkTo(57.5); await R.settle();
    await R.until(() => R.has('egg_e6'), { x: -0.4 }, 6, 'P5: the washed egg');
    await R.settle();
    // P6: Skatan, then the coin in Djuphålan
    await R.walkTo(66.5); await R.settle();
    assert.ok(R.has('b:magpie'));
    await R.walkTo(57.6); await R.settle();
    await R.until(() => G.player.mode === 'swim', { x: -1 }, 6, 'into the river again');
    await R.swimTo(43, 0.6, { max: 30 });
    await assert.rejects(R.swimTo(43, 4.9, { max: 4 }), /timed out/, 'a swimmer is spun away from the coin');
    assert.ok(!R.has('coin_got'));
    await R.swimTo(43, 0.7, { max: 10 });
    await R.hide();
    await R.until(() => R.has('coin_got'), {}, 25, 'P6: a hidden shell spirals down to the coin');
    await R.emerge(); await R.settle();
    await R.until(() => G.player.mode === 'ground' && G.player.x > 57 * HL, () => ({ x: 1, y: G.player.y > 0.7 * HL ? -1 : 0 }), 30, 'out east');
    await R.walkTo(69.3); await R.settle();
    const ladder = { 'skat-ground': 69.3, br1: 69.3, br2: 69.5, br3: 69.6, br4: 69.7 };
    for (let i = 0; i < 6 && G.player.surface?.id !== 'br5'; i++) {
        await R.walkTo(ladder[G.player.surface?.id] ?? 69.5, { tol: 0.08 });
        await R.buck();
    }
    assert.equal(G.player.surface?.id, 'br5', 'up Skatträdet branch by branch');
    await R.walkTo(68.6); await R.settle();
    await R.context('give'); await R.settle();
    assert.ok(R.has('egg_e7') && R.has('egg_e8'), 'P6: Skatan trades both eggs for the coin');
    assert.ok(R.has('clue_cloudCries'));
    // P3: the waterfall
    await R.until(() => G.player.mode === 'ground' && G.player.y > -0.8 * HL, { x: 0.5 }, 10, 'down from the tree');
    await R.walkTo(75.5); await R.settle();
    await R.until(() => G.player.mode === 'swim', { x: 1 }, 6, 'into the pool');
    await R.swimTo(86, 0.7, { max: 20 });
    await assert.rejects(R.swimTo(91, 0.7, { max: 4 }), /timed out/, 'the waterfall pushes a swimmer back');
    await R.swimTo(85.4, 0.7, { max: 10 });
    await R.hide();
    await R.until(() => G.player.x > 90 * HL, {}, 25, 'P3: the undertow carries the shell in');
    await R.until(() => G.player.resting || G.player.vy < 5, {}, 6, 'rest');
    await R.emerge();
    await R.until(() => G.player.mode === 'ground', { x: 1 }, 8, 'climb out in the cave');
    await R.walkTo(95.0); await R.settle();
    assert.ok(R.has('egg_e4') && R.has('egg_e5'), 'P3: both cave eggs');
    await R.walkTo(92.0); await R.settle();
    await R.until(() => G.player.mode === 'swim', { x: -1 }, 6, 'back into the pool');
    await R.until(() => G.player.mode === 'ground', { x: -1 }, 20, 'out of the pool');
}

export async function wholeAdventure(R) {
    await begin(R);
    await digAndCocoa(R);
    await bridgeAndForest(R);
    await climbTree(R);
    await backToStrand(R);
    await eastBank(R);
    await R.walkTo(28, { max: 120 });
    await R.until(() => R.has('ended'), {}, 30, 'the finale');
    await R.settle();
}

if (!process.env.NO_TEST) {
test('Äventyr 2: a robot plays the whole adventure to the moon and the hatching', async () => {
    const R = createRobot();
    const { G } = R;
    await begin(R);
    assert.equal(R.story.objective().text, GOALS.eggs(0, EGG_TOTAL));
    assert.ok(R.has('clue_moonRule') && R.has('clue_noMoon'));
    await digAndCocoa(R);
    await bridgeAndForest(R);
    await climbTree(R);
    assert.equal(G.eggs(), 5);
    assert.equal(R.story.objective().id, 'eggs');
    await backToStrand(R);
    await eastBank(R);
    assert.equal(G.eggs(), EGG_TOTAL, 'all ten eggs');
    assert.equal(R.story.objective().id, 'nest');
    await R.walkTo(28, { max: 120 });
    await R.until(() => R.has('ended'), {}, 30, 'the finale');
    await R.settle();
    for (const f of ['eggs_in_nest', 'moon', 'hatched', 'watch_given', 'ended']) assert.ok(R.has(f), f);
    assert.equal(G.storm, 0, 'the storm is over');
    assert.ok(R.saves.some(s => s.ended), 'the ending saves its completion');
    const fx = R.log.filter(l => l.kind === 'fx').map(l => l.name);
    for (const name of ['eggsToNest', 'cloudArrive', 'moonDraw', 'moonrise', 'hatch', 'epilogue', 'ending'])
        assert.ok(fx.includes(name), 'finale moment ' + name);
    assert.ok(fx.indexOf('moonDraw') < fx.indexOf('hatch'), 'Mira draws the moon before the eggs hatch');
    assert.ok(fx.indexOf('moonDraw') < fx.indexOf('starsDraw') && fx.indexOf('starsDraw') < fx.indexOf('hatch'), 'Alva draws the stars round the moon');
    assert.ok(R.has('alva_stars'));
    const lines = R.log.filter(l => l.kind === 'say').flatMap(l => l.lines);
    assert.ok(lines.some(([who]) => who === 'mira'), 'Mira speaks during the adventure');
    const alva = lines.filter(([who]) => who === 'alva').length;
    assert.ok(alva >= 7, `Alva is with us through the adventure (${alva} lines)`);
    for (const n of [2, 4, 6, 8]) assert.ok(R.has('b:love' + n), 'Klo in love, after egg ' + n);
    assert.equal(R.story.objective().id, 'free');
});

test('the forest first, then the east: the cloud waits in the crown until all eggs are found', async () => {
    const R = createRobot();
    const { G } = R;
    await begin(R);
    for (const f of ['egg_e1', 'egg_e2', 'egg_e4', 'egg_e5', 'egg_e6', 'egg_e7', 'egg_e8', 'b:firstEgg', 'p2_bridge', 'p1_fallen', 'p5_rolled', 'p5_washed', 'coin_got', 'coin_given']) G.flags.add(f);
    G.goto('skog', 'fromStrand');
    await R.settle();
    await R.walkTo(96.6); await R.settle();
    await R.walkTo(89.7); await R.settle();
    await R.hide();
    await R.until(() => R.has('p4_lit'), {}, 6, 'lit');
    await R.emerge(); await R.settle();
    await R.walkTo(79.6); await R.settle();
    await R.walkTo(51.3); await R.settle();
    await R.until(() => G.player.mode === 'leap', { x: -1 }, 10, 'leap');
    await R.until(() => G.player.mode === 'ground', {}, 4, 'land');
    await R.settle();
    await R.walkTo(31.6); await R.settle();
    assert.equal(G.eggs(), EGG_TOTAL);
    await climbTree(R);
    await R.until(() => R.has('ended'), {}, 40, 'the cloud carries us home and the finale plays');
    assert.equal(G.sceneId, 'strand');
});

test('the world: shapes the simulation can walk, ten eggs, connected pages', () => {
    const ids = [];
    for (const sc of Object.values(SCENES)) {
        for (const s of sc.surfaces) for (let i = 1; i < s.pts.length; i++) assert.ok(s.pts[i][0] >= s.pts[i - 1][0], `${sc.id}/${s.id} runs left to right`);
        for (const e of sc.eggs || []) ids.push(e.id);
        for (const ex of sc.exits || []) {
            assert.ok(SCENES[ex.to], ex.id);
            assert.ok(SCENES[ex.to].spots[ex.spawn], ex.id + ' spawn');
            const sp = SCENES[ex.to].spots[ex.spawn];
            for (const back of SCENES[ex.to].exits || []) assert.ok(sp.x < back.x0 || sp.x > back.x1, 'a spawn never stands in an exit');
        }
    }
    assert.deepEqual([...ids].sort(), [...EGG_IDS].sort(), 'each egg is placed once');
    assert.equal(EGG_IDS.length, EGG_TOTAL);
    for (const [name, cp] of Object.entries(CHECKPOINTS)) {
        assert.ok(SCENES[cp.scene], name);
        assert.ok(cp.spot ? SCENES[cp.scene].spots[cp.spot] : cp.at, name);
    }
    // the ground-level eggs lie on the ground
    for (const sc of Object.values(SCENES)) for (const e of sc.eggs || []) {
        if (e.how === 'trade') continue;
        const ys = sc.surfaces.map(s => heightOn(s.pts, e.x)).filter(y => y !== null);
        assert.ok(ys.some(y => Math.abs(y - e.y) < 0.2 * HL), `${e.id} lies on a surface`);
    }
});

test('save and restore keep found eggs, solved puzzles and the place', async () => {
    const R = createRobot();
    const { G } = R;
    await begin(R);
    await R.walkTo(30.4);
    await R.context('dig');
    await R.settle();
    G.flags.add('p5_rolled'); // a roll cut short by closing
    G.puz.ball = 60.55 * HL;
    G.setCheckpoint('east');
    const data = JSON.parse(JSON.stringify(G.serialize()));
    const H = createGame();
    H.restore(data);
    assert.equal(H.eggs(), 1);
    assert.ok(H.flags.has('p5_washed'), 'an interrupted roll is finished on reload');
    assert.equal(H.sceneId, 'strand');
    assert.equal(H.checkpoint, 'east');
    assert.ok(Math.abs(H.player.x - CHECKPOINTS.east.at.x) < 1);
});

test('words: short boxes, no key names in help, Mira and Alva only as voices', () => {
    const all = [];
    const walk = (v) => { if (typeof v === 'string') all.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    walk(STORY); walk(TABLE);
    const lines = [];
    const collect = (v) => {
        if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string' && /^[a-z]+$/.test(v[0])) lines.push(v);
        else if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') Object.values(v).forEach(collect);
    };
    collect(STORY); collect(TABLE);
    for (const [who, text] of lines) assert.ok(text.length <= 100, `${who}: "${text}" is ${text.length} characters`);
    const groups = [];
    const boxes = (v) => { if (Array.isArray(v) && v.length && Array.isArray(v[0])) groups.push(v); else if (v && typeof v === 'object' && !Array.isArray(v)) Object.values(v).forEach(boxes); };
    boxes(STORY);
    for (const g of groups) assert.ok(g.length <= 3, 'at most three boxes before play returns: ' + g[0][1]);
    for (const set of Object.values(HINTS)) for (const h of set) assert.doesNotMatch(h, /(^|\s)(E|G|K|J)(?=[\s.,!]|$)|Mellanslag|Space|Enter|knappen/, h);
    assert.ok(all.every(t => !/Melander|efternamn/i.test(t)));
});
}
