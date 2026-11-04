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
    // P9: the mushroom bounces the sköldhäst up to the branch with the egg
    await R.walkTo(96.5); await R.settle();
    await R.buck();
    await R.until(() => G.player.surface?.id === 'owl-branch', {}, 4, 'bounced onto the branch');
    await R.walkTo(95.3); await R.settle();
    assert.ok(R.has('egg_e3'), 'P9: the egg on the high branch');
    await R.until(() => G.player.surface?.id === 'ground-e', { x: -0.5 }, 6, 'down from the branch');
    await R.settle();
    // P4: the dark root cave; its seeds become the lantern
    await R.walkTo(88.6); await R.settle();
    await R.until(() => R.events.some(e => e.type === 'balk' && e.reason === 'dark'), { x: -0.5 }, 6, 'dark refusal');
    assert.ok(G.actors.tukan.x > 87.4 * HL, 'Tukankrabban does not walk into the dark either');
    await R.walkTo(89.7); await R.settle();
    await R.hide();
    await R.until(() => R.has('p4_lit'), {}, 6, 'P4: the flowers open round a still shell');
    await R.settle(); await R.emerge(); await R.settle();
    assert.ok(R.has('lantern'), 'a moonshine seed to carry as a lantern');
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
    assert.ok(G.actors.klo.x > 40 * HL, 'Klo cannot follow across Ravinen before the vine is pulled');
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
    assert.ok(R.has('storm_source'), 'the crown: the storm swirls round Åsktoppen');
    assert.equal(R.story.objective().id, 'peak');
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
    await R.settle(); await R.emerge(); await R.settle();
    await R.until(() => G.player.mode === 'ground' && G.player.x > 57 * HL, () => ({ x: 1, y: G.player.y > 0.7 * HL ? -1 : 0 }), 30, 'out east');
    await R.walkTo(69.3); await R.settle();
    const ladder = { 'skat-ground': 69.3, br1: 69.3, br2: 69.5, br3: 69.6, br4: 69.7 };
    for (let i = 0; i < 6 && G.player.surface?.id !== 'br5'; i++) {
        await R.walkTo(ladder[G.player.surface?.id] ?? 69.5, { tol: 0.08 });
        await R.buck();
    }
    assert.equal(G.player.surface?.id, 'br5', 'up Skatträdet branch by branch');
    for (const who of ['klo', 'tukan']) assert.ok(G.actors[who].y > -0.8 * HL, `${who} stays on the ground under the branches`);
    await R.walkTo(68.6); await R.settle();
    await R.context('give'); await R.settle();
    assert.ok(R.has('egg_e7'), 'P6: Skatan trades the egg for the coin');
    // P3: the waterfall, the cave behind it and the way into the mountain
    await R.until(() => G.player.mode === 'ground' && G.player.y > -0.8 * HL, { x: 0.5 }, 10, 'down from the tree');
    await R.walkTo(75.5); await R.settle();
    await R.until(() => G.player.mode === 'swim', { x: 1 }, 6, 'into the pool');
    await R.swimTo(86, 0.7, { max: 20 });
    await assert.rejects(R.swimTo(91, 0.7, { max: 4 }), /timed out/, 'the waterfall pushes a swimmer back');
    await R.swimTo(85.4, 0.7, { max: 10 });
    await R.hide();
    await R.until(() => G.player.x > 90 * HL, {}, 25, 'P3: the undertow carries the shell in');
    await R.until(() => G.player.resting || G.player.vy < 5, {}, 6, 'rest');
    await R.settle(); await R.emerge();
    await R.until(() => G.player.mode === 'ground', { x: 1 }, 8, 'climb out in the cave');
    await R.walkTo(93.4); await R.settle();
    assert.ok(R.has('cave_reached'));
}

export async function mountain(R) {
    const { G } = R;
    await R.until(() => G.sceneId === 'kristall', { x: 1 }, 10, 'into the mountain with the lantern');
    await R.settle();
    // K1: one gallop over the three crystal plates lights the chasm, and draws its bridge
    await R.walkTo(1.0); await R.settle();
    await R.until(() => R.has('k1_bridge'), { x: 1 }, 10, 'K1: plates and bridge');
    for (const f of ['k1_a', 'k1_b', 'k1_c', 'k1_lit']) assert.ok(R.has(f), f);
    await R.settle();
    await R.walkTo(22); await R.settle();
    // K2: the blue current goes round; the white one goes under the wall
    await R.walkTo(24.6); await R.settle();
    await R.until(() => G.player.mode === 'swim', { x: 1 }, 5, 'into the lake');
    await assert.rejects(R.swimTo(48, 3.2, { max: 5 }), /timed out/, 'a swimmer is pushed back under the wall');
    await R.swimTo(35.2, 3.3, { max: 20 }); await R.hide();
    await R.until(() => R.events.some(e => e.type === 'loopBack'), {}, 20, 'K2: the blue current loops back');
    await R.emerge(); await R.settle();
    await R.swimTo(30.2, 3.2, { max: 20 }); await R.hide();
    await R.until(() => R.has('egg_e4'), {}, 25, 'K2: the white current carries the shell through');
    await R.settle(); await R.emerge(); await R.settle();
    await R.until(() => G.player.mode === 'ground' && G.player.x > 53 * HL, () => ({ x: 1, y: G.player.y > 0.8 * HL ? -1 : 0 }), 30, 'out on the east side');
    await R.settle();
    // K3: one plate alone does not open the gate; the glitter ball and a still shell do
    await R.walkTo(57.3);
    await R.until(() => G.player.mode === 'swim', { x: 1 }, 5, 'into the gate pool');
    await R.swimTo(61.9, 1.4, { max: 10 }); await R.hide();
    await R.until(() => R.events.some(e => e.type === 'plateOn' && !e.ready), {}, 8, 'plate B alone');
    await R.hold(1.5);
    assert.ok(!R.has('k3_open'), 'one plate is not enough');
    await R.settle(); await R.emerge(); await R.settle();
    await R.until(() => G.player.mode === 'ground' && G.player.x < 57.6 * HL, () => ({ x: -1, y: G.player.y > 0.6 * HL ? -1 : 0 }), 20, 'back to the ball');
    await R.walkTo(55.6); await R.settle();
    for (let i = 0; i < 4 && !R.has('k3_pushed'); i++) {
        await R.walkTo((G.puz.glitter ?? G.scenes.kristall.glitterBall.x0) / HL - 0.65);
        await R.face(1);
        await R.context('push-glitter');
        await R.hold(0.7);
    }
    await R.until(() => R.has('k3_ball'), {}, 5, 'the glitter ball lies on plate A');
    await R.walkTo(57.3);
    await R.until(() => G.player.mode === 'swim', { x: 1 }, 5, 'into the pool again');
    await R.swimTo(61.9, 1.4, { max: 10 }); await R.hide();
    await R.until(() => R.has('k3_open'), {}, 10, 'K3: the gate opens');
    await R.settle(); await R.emerge(); await R.settle();
    await R.until(() => G.player.mode === 'ground' && G.player.x > 63.8 * HL, () => ({ x: 1, y: G.player.y > 0.8 * HL ? -1 : 0 }), 20, 'out of the pool');
    await R.walkTo(67.6); await R.settle();
    assert.ok(R.has('egg_e8'), 'K3: the egg behind the gate');
    // Källan: a swimmer is pushed down; a still shell rises
    await R.walkTo(69.0); await R.settle();
    await R.until(() => G.player.mode === 'swim', { x: 1 }, 5, 'into the spring pool');
    await R.swimTo(73, 1.6, { max: 10 }); await R.hide();
    await R.until(() => G.sceneId === 'topp', {}, 30, 'up the spring to Åsktoppen');
    await R.settle();
    assert.equal(G.player.hidden, false, 'the spring throws the shell up and open');
}

export async function peak(R) {
    const { G } = R;
    await R.until(() => G.player.mode === 'ground' && G.player.x > 4.6 * HL, () => ({ x: 1, y: G.player.y > 0.8 * HL ? -1 : 0 }), 20, 'out of the spring pool');
    await R.settle();
    const sheltered = (g) => (g.w.shelter || []).some(([a, b]) => G.player.x >= a && G.player.x <= b);
    const windStep = () => {
        const g = G.puz.gust;
        if (g && G.player.x < g.w.x1 && G.player.x > g.w.x0 - 0.3 * HL && !sheltered(g)) return G.player.hidden ? {} : { hide: Math.abs(G.player.vx) < 60 };
        return G.player.hidden ? { hop: true } : { x: 0.7 };
    };
    // T1: walking on into a gust pushes the sköldhäst back
    await R.until(() => R.events.some(e => e.type === 'blown'), { x: 0.7 }, 15, 'T1: a gust pushes back');
    await R.settle();
    await R.until(() => G.player.x > 21.0 * HL && !G.player.hidden, windStep, 120, 'T1: over Vindkanten, hiding in the gusts');
    await R.settle();
    // T2: in the dark there is no bridge; in a flash the hooves draw it
    await R.walkTo(21.0); await R.settle();
    await R.until(() => !G.flags.has('flash'), {}, 8, 'dark');
    await R.until(() => R.events.some(e => e.type === 'balk' && e.reason === 'storm'), () => (G.flags.has('flash') ? {} : { x: 0.7 }), 10, 'T2: refused in the dark');
    await R.walkTo(21.0); await R.settle();
    await R.until(() => G.flags.has('flash'), {}, 8, 'a flash');
    await R.until(() => !G.flags.has('flash'), {}, 8, 'flash over');
    await R.until(() => G.flags.has('flash'), {}, 8, 'next flash');
    await R.gallopPast(24.5);
    await R.until(() => R.has('t2_bridge'), {}, 4, 'T2: the hooves draw the bridge of light');
    await R.settle();
    await R.until(() => G.player.x > 45.5 * HL && !G.player.hidden, windStep, 120, 'up to the summit');
    await R.until(() => R.has('cloud_met'), { x: 0.5 }, 10, 'the cloud in the eye of the storm');
    await R.until(() => G.sceneId === 'strand' && !R.story.running(), {}, 60, 'the cloud carries everyone home');
    await R.settle();
    assert.ok(R.has('egg_e5'), 'the cloud kept the last egg');
}

export async function wholeAdventure(R) {
    await begin(R);
    await digAndCocoa(R);
    await bridgeAndForest(R);
    await climbTree(R);
    await backToStrand(R);
    await eastBank(R);
    await mountain(R);
    await peak(R);
    await R.until(() => R.has('ended'), {}, 60, 'the finale');
    await R.settle();
}

if (!process.env.NO_TEST) {
test('Äventyr 2: a robot plays the whole adventure over four pages, to the moon and the hatching', { timeout: 600000 }, async (t) => {
    const R = createRobot();
    const { G } = R;
    await begin(R);
    assert.equal(R.story.objective().text, GOALS.eggs(0, EGG_TOTAL));
    assert.ok(R.has('clue_moonRule') && R.has('clue_noMoon'));
    await digAndCocoa(R);
    await bridgeAndForest(R);
    await climbTree(R);
    assert.equal(G.eggs(), 5);
    await backToStrand(R);
    await eastBank(R);
    await mountain(R);
    await peak(R);
    assert.equal(G.eggs(), EGG_TOTAL, 'all ten eggs');
    await R.until(() => R.has('ended'), {}, 60, 'the finale');
    await R.settle();
    t.diagnostic(`the end at ${(G.time / 60).toFixed(1)} min of game time; ${R.log.filter(l => l.kind === 'say').reduce((n, l) => n + l.lines.length, 0)} dialogue boxes`);
    for (const f of ['eggs_in_nest', 'moon', 'alva_stars', 'hatched', 'watch_given', 'skata_gift', 'ended']) assert.ok(R.has(f), f);
    for (const p of ['strand', 'skog', 'kristall', 'topp']) assert.ok(R.has('visited_' + p), 'visited ' + p);
    assert.equal(G.storm, 0, 'the storm is over');
    assert.ok(R.saves.some(s => s.ended), 'the ending saves its completion');
    const fx = R.log.filter(l => l.kind === 'fx').map(l => l.name);
    for (const name of ['cloudRide', 'eggsToNest', 'cloudArrive', 'moonDraw', 'starsDraw', 'moonrise', 'hatch', 'epilogue', 'ending'])
        assert.ok(fx.includes(name), 'moment ' + name);
    assert.ok(fx.indexOf('moonDraw') < fx.indexOf('starsDraw') && fx.indexOf('starsDraw') < fx.indexOf('hatch'), 'Mira\'s moon, then Alva\'s stars, then the hatching');
    const lines = R.log.filter(l => l.kind === 'say').flatMap(l => l.lines);
    const who = (w) => lines.filter(([s]) => s === w).length;
    assert.ok(who('mira') >= 5, `Mira speaks through the adventure (${who('mira')})`);
    assert.ok(who('alva') >= 8, `Alva speaks through the adventure (${who('alva')})`);
    assert.ok(who('skata') >= 3 && who('dyvel') >= 4, 'Skatan and Tordyveln come back');
    for (const n of [2, 4, 6, 8]) assert.ok(R.has('b:love' + n), 'Klo in love, after egg ' + n);
    assert.ok(R.has('b:windKlo'), 'Klo holds on to her in the wind');
    const finale = lines.findIndex(([, text]) => text === STORY.finale[0][1]);
    assert.ok(finale > 0 && !lines.slice(finale).some(([, text]) => text === STORY.allEggs[0][1]), '"Alla tio" never comes after the finale has begun');
    assert.equal(R.story.objective().id, 'free');
});

test('help: a peek at the next hint does not use up the ladder', async () => {
    const R = createRobot();
    await begin(R);
    await R.walkTo(16.5); await R.settle();
    const a = R.story.hint({ peek: true }), b = R.story.hint({ peek: true });
    assert.equal(a.text, b.text);
    assert.equal(a.level, 0);
    assert.equal(R.story.hint().level, 0);
    assert.equal(R.story.hint().level, 1);
});

test('a save closed in the middle of a handing-over still gets its egg', async () => {
    const R = createRobot();
    await begin(R);
    R.G.flags.add('coin_got'); R.G.flags.add('coin_given');
    const H = createRobot();
    H.G.restore(JSON.parse(JSON.stringify(R.G.serialize())));
    H.story.start();
    assert.ok(H.has('egg_e7'), 'the traded egg is handed over on reload');
});

test('a save on the peak after meeting the cloud gets the cloud\'s egg and rides home on reload', async () => {
    const R = createRobot();
    await begin(R);
    for (const f of ['p4_lit', 'lantern', 'storm_source', 'topp_reached', 'wind_passed', 't2_bridge', 'cloud_met']) R.G.flags.add(f);
    R.G.goto('topp', 'summit');
    R.G.setCheckpoint('summit');
    const H = createRobot();
    H.G.restore(JSON.parse(JSON.stringify(R.G.serialize())));
    H.story.start();
    await H.settle();
    assert.ok(H.has('egg_e5'), 'the cloud\'s egg is handed over on reload');
    assert.equal(H.G.sceneId, 'strand', 'the cloud carries everyone home');
});

test('into the mountain before the crown: the cave tells where the storm comes from', async () => {
    const R = createRobot();
    const { G } = R;
    await begin(R);
    for (const f of ['egg_e1', 'b:firstEgg', 'p2_bridge', 'p4_lit', 'lantern', 'cave_reached']) G.flags.add(f);
    G.goto('strand', { x: 93.2 * HL, y: -0.31 * HL, facing: 1 });
    await R.settle();
    await R.until(() => G.sceneId === 'kristall', { x: 1 }, 10, 'into the mountain');
    await R.settle();
    assert.ok(R.has('storm_source'), 'inside the mountain the storm is heard on the peak');
    assert.equal(R.story.objective().id, 'peak');
});

test('no lantern, no mountain: the dark passage refuses, and the hint points to the light', async () => {
    const R = createRobot();
    const { G } = R;
    await begin(R);
    for (const f of ['egg_e1', 'b:firstEgg', 'b:fors', 'cave_reached', 'storm_source']) G.flags.add(f);
    G.goto('strand', { x: 93.2 * HL, y: -0.31 * HL, facing: 1 });
    await R.settle();
    await R.until(() => R.events.some(e => e.type === 'balk' && e.reason === 'darkCave'), { x: 1 }, 8, 'refused in the dark');
    assert.equal(G.sceneId, 'strand');
    await R.settle();
    assert.match(R.story.hint().text, /kolsvart|lyser|ljus/);
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
            for (const back of SCENES[ex.to].exits || []) assert.ok(sp.x < back.x0 || sp.x > back.x1
                || (back.y0 !== undefined && sp.y < back.y0) || (back.y1 !== undefined && sp.y > back.y1), 'a spawn never stands in an exit');
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
