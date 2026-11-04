/*
 * Äventyr 2 is free to play in any order once the lantern is found, so the story must
 * follow what the player has really been through. The main robot
 * (tests/skoldhast-a2-playthrough.test.mjs) plays one order; this one plays the other
 * extreme: from the lantern straight up the mountain to the cloud, then back for
 * everything else, all the way to the hatching. The rest pins each place where the story
 * or a puzzle depended on that order, and the gate and page ends a jump used to pass.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NO_TEST = '1';
const { createRobot, HL } = await import('./skoldhast-a2-robot.mjs');
const P = await import('./skoldhast-a2-playthrough.test.mjs');
const { STORY, HINTS, GOALS } = await import('../skoldhast/adventures/adventure-2/content/sv.mjs');
const { collectEgg } = await import('../skoldhast/adventures/adventure-2/puzzles.mjs');

const lineOf = (entry) => entry[1];
const said = (R) => R.log.filter(l => l.kind === 'say').flatMap(l => l.lines.map(lineOf));
const thought = (R) => R.log.filter(l => l.kind === 'think').map(l => l.text);
const K1 = ['k1_a', 'k1_b', 'k1_c', 'k1_lit', 'k1_bridge'];
const LANTERN = ['b:arrive', 'b:firstEgg', 'egg_e1', 'p2_bridge', 'p4_lit', 'lantern'];
const MOUNTAIN = [...LANTERN, 'storm_source', 'visited_kristall', 'b:kristall', 'b:plates', 'b:lake'];

async function at(R, flags, scene, spot) {
    for (const f of flags) R.G.flags.add(f);
    R.G.goto(scene, spot);
    R.story.start();
    await R.settle();
}

async function swimOut(R, dir, past) {
    const { G } = R;
    await R.until(() => G.player.mode === 'ground' && (G.player.x - past * HL) * dir > 0,
        () => ({ x: dir, y: G.player.mode === 'swim' && G.player.y > 0.7 * HL ? -1 : 0 }), 40, `out of the water past ${past}`);
    await R.settle();
}

test('any order: the lantern, straight up to the cloud, then back for all the rest, to the hatching', { timeout: 600000 }, async () => {
    const R = createRobot(), { G } = R;
    G.goto('strand', 'start'); R.story.start(); await R.settle();

    // only the bridge and the seeds in the west
    await R.walkTo(11); await R.settle();
    await R.gallopPast(0); await R.settle();
    await R.until(() => G.sceneId === 'skog', { x: -1 }, 10, 'the forest'); await R.settle();
    await R.walkTo(89.7); await R.settle();
    await R.hide(); await R.until(() => R.has('p4_lit'), {}, 6, 'the seeds'); await R.settle(); await R.emerge(); await R.settle();
    await R.until(() => G.sceneId === 'strand', { x: 1 }, 40, 'back to the beach'); await R.settle();

    // east past Tordyveln and Skatan, solving neither
    await R.walkTo(32.6); await R.settle();
    await R.until(() => G.player.mode === 'swim', { x: 1 }, 5, 'the river');
    await R.swimTo(50, 0.6, { max: 30 });
    await swimOut(R, 1, 57);
    await R.walkTo(75.5, { max: 60 }); await R.settle();
    await R.until(() => G.player.mode === 'swim', { x: 1 }, 6, 'the pool');
    await R.swimTo(85.4, 0.7, { max: 20 }); await R.hide();
    await R.until(() => G.player.x > 90 * HL, {}, 25, 'the undertow');
    await R.until(() => G.player.resting || G.player.vy < 5, {}, 6, 'rest');
    await R.settle(); await R.emerge();
    await R.until(() => G.player.mode === 'ground', { x: 1 }, 8, 'into the cave');
    await R.walkTo(93.4); await R.settle();
    assert.equal(G.eggs(), 0, 'nothing but the lantern so far');

    await P.mountain(R);
    assert.equal(R.story.objective().text, GOALS.summit, 'on the mountain top the goal is the eye of the storm');
    await P.peak(R);
    assert.ok(R.has('cloud_met') && !R.has('ended'));
    assert.ok(said(R).includes(lineOf(STORY.homeWait[0])));
    const metAt = said(R).length;

    // back for the rest: the sand and the cocoa tree
    await R.walkTo(30.4); await R.context('dig'); await R.settle();
    await R.walkTo(21); await R.settle();
    for (let i = 0; i < 4 && !R.has('p1_fallen'); i++) {
        await R.gallopPast(13.5); await R.settle();
        if (!R.has('p1_fallen')) { await R.gallopPast(20.5); await R.settle(); }
    }
    await R.walkTo(13.3); await R.until(() => R.has('egg_e2'), {}, 3, 'the cocoa egg'); await R.settle();

    // the forest: the mushroom, Rotgrottan, the leap, the crown
    await R.walkTo(0, { max: 40 }); await R.settle();
    await R.until(() => G.sceneId === 'skog', { x: -1 }, 10, 'the forest again'); await R.settle();
    await R.walkTo(96.5); await R.settle();
    await R.buck();
    await R.until(() => G.player.surface?.id === 'owl-branch', {}, 4, 'the owl branch');
    await R.walkTo(95.3); await R.settle();
    await R.until(() => G.player.surface?.id === 'ground-e', { x: -0.5 }, 6, 'down'); await R.settle();
    await R.walkTo(79.6); await R.settle();
    await R.walkTo(52.0); await R.settle();
    await R.walkTo(51.3); await R.settle();
    await R.until(() => G.player.mode === 'leap', { x: -1 }, 10, 'the big leap');
    await R.until(() => G.player.mode === 'ground', {}, 4, 'land'); await R.settle();
    await R.walkTo(31.6); await R.settle();
    assert.ok(said(R).includes(lineOf(STORY.vineAsk[0])), 'she asks for the vine as soon as the egg is taken');
    await R.walkTo(33.9); await R.settle();
    await R.face(1); await R.context('pull'); await R.settle();
    await P.climbTree(R).catch(() => {}); // it also asserts the goal of the usual order
    await R.settle();
    assert.ok(R.has('b:source'), 'the crown is reached');
    await P.backToStrand(R);

    // the east bank last, with the egg still in the earth ball
    await P.eastBank(R);
    assert.equal(G.eggs(), 10, 'all ten eggs, in the other order');
    await swimOut(R, -1, 76);
    await R.walkTo(58.5, { max: 60 }); await R.settle();
    await R.until(() => G.player.mode === 'swim', { x: -1 }, 6, 'the river again');
    await R.swimTo(40, 0.6, { max: 30 });
    await swimOut(R, -1, 33);
    await R.until(() => R.has('ended'), { x: -0.5 }, 90, 'the finale at the nest');
    await R.settle();

    const all = said(R), late = all.slice(metAt);
    // the crown knows the cloud has been met
    for (const stale of [STORY.sourceMira[0], STORY.sourceMira[1], STORY.source[1], STORY.source[2], STORY.sourceLit[0], STORY.sourceLateGo[0]])
        assert.ok(!all.includes(lineOf(stale)), `not after the summit: ${stale[1]}`);
    assert.ok(late.includes(lineOf(STORY.sourceAfter[2])), 'the crown is only a view now');
    // the mysteries are not asked again once they are answered
    for (const stale of [...STORY.lightning, STORY.trade[2], ...STORY.tradeThanks])
        assert.ok(!late.includes(lineOf(stale)), `not after the summit: ${stale[1]}`);
    assert.ok(late.includes(lineOf(STORY.tradeThanksLate[0])));
    // Tordyveln: the glitter ball came before the earth ball was washed
    assert.ok(all.includes(lineOf(STORY.glitterEarly[0])));
    assert.ok(!all.includes(lineOf(STORY.glitter[0])), 'he cannot talk of a new ball while the old one is still whole');
    assert.ok(late.includes(lineOf(STORY.washedLate[0])));
    assert.ok(!all.includes(lineOf(STORY.washed[1])));
});

test('the crown after Kristallgrottan, before the cloud: Mira still wonders, but nobody looks for the way', async () => {
    const R = createRobot();
    await at(R, [...MOUNTAIN, 'p7_vine', 'egg_e10', 'b:leapSeen', 'egg_e2', 'b:love2'], 'skog', { x: 21.8 * HL, y: -8.3 * HL, facing: -1 });
    await R.buck();
    await R.walkTo(9.5, { max: 60 }); await R.settle();
    const lines = said(R);
    assert.ok(lines.includes(lineOf(STORY.sourceLate[1])));
    assert.ok(lines.includes(lineOf(STORY.sourceMira[0])));
    assert.ok(lines.includes(lineOf(STORY.sourceLateGo[0])));
    assert.ok(!lines.includes(lineOf(STORY.sourceLit[0])), 'the way in is no rumour any more');
});

test('a jump does not pass the closed gate in Kristallgrottan, and the gate says so', async () => {
    for (let x0 = 64.2; x0 < 66; x0 += 0.15) {
        for (const stick of [1, 0.45]) {
            const R = createRobot(), { G } = R;
            await at(R, [...MOUNTAIN, ...K1, 'k2_through', 'b:throughWall', 'b:glitter', 'egg_e4'], 'kristall', { x: 64.05 * HL, y: -0.42 * HL, facing: 1 });
            let jumped = false;
            for (let i = 0; i < 480; i++) {
                const hop = !jumped && G.player.x >= x0 * HL;
                if (hop) jumped = true;
                await R.step({ x: stick, hop, hopHeld: hop });
                assert.ok(G.player.x < 66.2 * HL, `stopped at the gate, jumping from ${x0.toFixed(2)}`);
            }
            assert.ok(!R.has('egg_e8'));
        }
    }
    const R = createRobot(), { G } = R;
    await at(R, [...MOUNTAIN, ...K1, 'k2_through', 'b:throughWall', 'b:glitter', 'egg_e4'], 'kristall', { x: 65.1 * HL, y: -0.43 * HL, facing: 1 });
    await R.until(() => G.player.x > 65.6 * HL, { x: 1 }, 3, 'towards the gate');
    await R.step({ x: 1, hop: true, hopHeld: true });
    await R.until(() => R.events.some(e => e.type === 'balk' && e.reason === 'gate'), { x: 1 }, 3, 'the gate refuses');
    // opened, the same jump goes through
    G.flag('k3_open');
    await R.until(() => G.player.x > 66.8 * HL, { x: 1 }, 3, 'through the open gate');
});

test('the forest page holds at both ends, whatever the sköldhäst does there', async () => {
    // a running jump at the paper's edge lands past it, and the next steps walked off the page
    for (const from of [-0.8, -1.2, -1.6, -2.0]) {
        const R = createRobot(), { G } = R;
        await at(R, LANTERN, 'skog', { x: 6 * HL, y: -0.6 * HL, facing: -1 });
        await R.until(() => G.player.x < from * HL, { x: -1 }, 5, 'gallop to the west end');
        await R.step({ x: -1, hop: true, hopHeld: true });
        await R.hold(2.5, { x: -1 });
        assert.ok(G.player.x >= -2.61 * HL, `a jump from ${from} stops at the page's end`);
        assert.ok(!R.events.some(e => e.type === 'rescued'));
    }

    // a scene that starts just as it gallops into the exit must not carry it off the paper
    const S = createRobot(), H = S.G;
    await at(S, LANTERN, 'skog', { x: 92 * HL, y: -0.6 * HL, facing: 1 });
    await S.until(() => H.player.x > 101.3 * HL, { x: 1 }, 8, 'gallop to the east end');
    H.busy++;
    await S.hold(1.5);
    assert.equal(H.sceneId, 'skog');
    assert.ok(H.player.x < 102 * HL && H.player.mode === 'ground', `still on the page, at ${(H.player.x / HL).toFixed(2)}`);
    H.busy--;
    await S.until(() => H.sceneId === 'strand', { x: 1 }, 3, 'and on to the beach');
    assert.ok(!S.events.some(e => e.type === 'rescued'));
});

test('inside the mountain the help and the goal lead up, never back out for an egg', async () => {
    const R = createRobot(), { G } = R;
    await at(R, MOUNTAIN, 'kristall', { x: 2 * HL, y: -0.42 * HL, facing: 1 });
    assert.equal(R.story.objective().why, GOALS.peakInside);
    assert.equal(R.story.hint({ peek: true }).text, HINTS.k1[0]);
    for (const f of K1) G.flags.add(f);
    assert.equal(R.story.hint({ peek: true }).text, HINTS.k2[0]);
    for (const f of ['egg_e4', 'k2_through']) G.flags.add(f);
    assert.equal(R.story.hint({ peek: true }).text, HINTS.k3[0]);
    for (const f of ['k3_ball', 'k3_pushed', 'k3_open', 'egg_e8']) G.flags.add(f);
    assert.equal(R.story.hint({ peek: true }).text, HINTS.spring[0]);
    G.flags.add('topp_reached');
    G.goto('topp', { x: 5.4 * HL, y: -0.45 * HL, facing: 1 });
    assert.equal(R.story.objective().text, GOALS.summit);
    assert.equal(R.story.hint({ peek: true }).text, HINTS.t1[0]);
    G.flags.add('wind_passed');
    assert.equal(R.story.hint({ peek: true }).text, HINTS.t2[0]);
    G.flags.add('t2_bridge');
    assert.equal(R.story.hint({ peek: true }).text, HINTS.summit[0]);
    // out in the forest the eggs still lead
    G.goto('strand', 'start');
    assert.match(R.story.hint({ peek: true }).text, /ägg/);
});

test('the lightning clue waits for the open sky, and is never asked after the cloud has answered it', async () => {
    const R = createRobot(), { G } = R;
    await at(R, [...MOUNTAIN, ...K1, 'egg_e2', 'b:love2', 'b:fallen'], 'kristall', { x: 2 * HL, y: -0.42 * HL, facing: 1 });
    collectEgg(G, 'e4'); await R.settle();
    assert.ok(!said(R).includes(lineOf(STORY.lightning[0])), 'not inside the mountain');
    G.goto('strand', 'start'); await R.settle();
    assert.ok(said(R).includes(lineOf(STORY.lightning[0])), 'out under the sky it comes');

    const S = createRobot();
    await at(S, [...MOUNTAIN, 'egg_e2', 'egg_e4', 'cloud_met', 'b:love2', 'b:fallen'], 'strand', 'start');
    collectEgg(S.G, 'e6'); await S.settle();
    assert.ok(!said(S).includes(lineOf(STORY.lightning[0])));
});

test('the cave: turned back by the dark, then back with the lantern, without the same words twice', async () => {
    const R = createRobot(), { G } = R;
    const toCave = async () => {
        G.goto('strand', { x: 85.4 * HL, y: 0.7 * HL, facing: 1, mode: 'swim' });
        await R.hide();
        await R.until(() => G.player.x > 90 * HL, {}, 25, 'the undertow');
        await R.hold(4); await R.settle(); await R.emerge();
        await R.until(() => G.player.mode === 'ground', { x: 1 }, 8, 'out in the cave');
        await R.walkTo(93.4); await R.settle();
    };
    for (const f of ['b:arrive', 'b:firstEgg', 'egg_e1', 'b:fors']) G.flags.add(f);
    G.goto('strand', 'start'); R.story.start(); await R.settle();
    await toCave();
    assert.ok(said(R).includes(lineOf(STORY.caveDark[1])));
    assert.ok(thought(R).includes(STORY.undertow), 'a shell left to drift hears the undertow');
    for (const f of ['p2_bridge', 'p4_lit', 'lantern']) G.flags.add(f);
    await toCave();
    assert.ok(said(R).includes(lineOf(STORY.caveLitBack[0])));
    assert.equal(said(R).filter(t => t === lineOf(STORY.caveLit[0])).length, 1, 'the discovery is told once');
});

test('the coin before Skatan: she is told about it, and the talk after the trade is not lost', async () => {
    const R = createRobot(), { G } = R;
    await at(R, ['b:arrive', 'b:firstEgg', 'egg_e1', 'b:miraRiver', 'coin_got', 'b:coin', 'b:beetle'], 'strand', { x: 64.8 * HL, y: -0.9 * HL, facing: 1 });
    await R.walkTo(69.3, { max: 40 }); await R.settle();
    assert.ok(said(R).includes(lineOf(STORY.magpieCoin[0])));
    assert.ok(!said(R).includes(lineOf(STORY.magpie2[0])), 'nobody tells her where a coin we already have fell');

    G.flags.add('coin_given'); G.flags.add('egg_e7'); G.flags.add('b:trade');
    G.goto('strand', { x: 68.6 * HL, y: -2.85 * HL, facing: 1 });
    await R.settle();
    await R.context('talk-skata'); await R.settle();
    assert.ok(said(R).includes(lineOf(STORY.skataAfter[0])));
});

test('Tordyveln in the mountain talks about the ball that is there', async () => {
    const R = createRobot(), { G } = R;
    await at(R, [...MOUNTAIN, ...K1, 'b:glitter', 'p5_rolled', 'p5_washed'], 'kristall', { x: 54.6 * HL, y: -0.42 * HL, facing: 1 });
    await R.context('talk-dyvel'); await R.settle();
    assert.ok(said(R).includes(lineOf(STORY.glitterTalk[0])));
    G.flags.add('k3_ball'); G.flags.add('k3_pushed');
    await R.context('talk-dyvel'); await R.settle();
    assert.ok(said(R).includes(lineOf(STORY.glitterAfter[0])));
    assert.ok(!said(R).includes(lineOf(STORY.beetleAfter[0])));
});

test('K1: one gallop lights all three, and the reveal of the bridge is heard', async () => {
    const R = createRobot(), { G } = R;
    await at(R, MOUNTAIN, 'kristall', { x: 1 * HL, y: -0.42 * HL, facing: 1 });
    await R.until(() => R.has('k1_lit'), { x: 1 }, 10, 'the plates');
    assert.ok(thought(R).includes(STORY.crystalAll));
    await R.until(() => R.has('k1_bridge'), { x: 1 }, 5, 'the bridge');
    assert.ok(G.player.x > 17 * HL);
});

test('P4: standing in plain sight does not open the flowers, and the sköldhäst notices why', async () => {
    const R = createRobot();
    await at(R, ['b:arrive', 'b:firstEgg', 'egg_e1', 'p2_bridge', 'b:seeds'], 'skog', { x: 89.7 * HL, y: -0.6 * HL, facing: -1 });
    await R.hold(3.6);
    assert.ok(thought(R).includes(STORY.seedsWatched));
    assert.ok(!R.has('p4_lit'));
    await R.hide();
    await R.until(() => R.has('p4_lit'), {}, 6, 'hidden, they open');
});
