/*
 * Sköldhästen: the movement simulation is deterministic and the outcome of a
 * run does not depend on the display's frame rate (plan §8.2, §8.8).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { STEP, HL } from '../skoldhast/src/sim.mjs';

/** Run main.mjs's accumulator loop at a display rate: input is read once per frame, presses go to the first step. */
function run(hz, seconds, input, setup, options) {
    const G = createGame(options);
    setup(G);
    let acc = 0;
    const frames = Math.round(seconds * hz);
    for (let f = 0; f < frames; f++) {
        acc += 1 / hz;
        const inp = input(G);
        let first = true, steps = 0;
        while (acc >= STEP && steps < 10) {
            G.step({ ...inp, act: first && !!inp.act, hide: first && !!inp.hide });
            first = false; acc -= STEP; steps++;
        }
    }
    return G;
}
/** A press that happens once, the first frame after t seconds. */
function pressAt(t, what, held = {}) {
    let done = false;
    return (G) => (!done && G.time >= t ? (done = true, { ...held, [what]: true }) : { ...held });
}

const h1 = (v) => v * HL;
const atRunway = (G) => { G.flags.add('intro_done'); G.goto('land', { x: 90.5 * HL, y: -0.9 * HL, facing: -1 }); };

test('the same inputs give the same result', () => {
    const a = run(60, 6, () => ({ x: -1 }), atRunway);
    const b = run(60, 6, () => ({ x: -1 }), atRunway);
    assert.equal(a.player.x, b.player.x);
    assert.equal(a.player.y, b.player.y);
    assert.deepEqual([...a.flags].sort(), [...b.flags].sort());
});

test('Streckbron inks at 30, 60, 120 and 144 Hz', () => {
    const xs = [];
    for (const hz of [30, 60, 120, 144]) {
        const G = run(hz, 6, () => ({ x: -1 }), atRunway);
        assert.ok(G.flags.has('p1_inked'), `inked at ${hz} Hz`);
        xs.push(G.player.x);
    }
    const spread = Math.max(...xs) - Math.min(...xs);
    assert.ok(spread < 0.5 * HL, `end positions agree within half a horse length (spread ${(spread / HL).toFixed(2)} HL)`);
});

test('walking onto Streckbron balks; nothing falls through the gully', () => {
    const G = run(60, 5, () => ({ x: -0.3 }), atRunway);
    assert.ok(!G.flags.has('p1_inked'));
    assert.ok(G.player.x > 80 * HL, 'stopped before the arch');
    assert.equal(G.player.mode, 'ground');
});

test('Göm dig on land needs the sköldhäst to be nearly still', () => {
    const G = run(60, 1.5, pressAt(1.0, 'hide', { x: -1 }), atRunway);
    assert.equal(G.player.hidden, false, 'no hiding at a gallop (the press waits until it stops)');
    for (const hz of [30, 60, 144]) {
        const H = run(hz, 2, pressAt(0.5, 'hide'), atRunway);
        assert.equal(H.player.hidden, true, `hidden at ${hz} Hz`);
    }
});

test('the released land route needs a real gallop but no underwater chapter discovery', () => {
    const onHill = (flags) => (G) => { flags.forEach((f) => G.flags.add(f)); G.goto('land', { x: 28 * HL, y: -6.35 * HL, facing: -1 }); };
    const early = run(60, 8, () => ({ x: -1 }), onHill(['intro_done']));
    assert.ok(early.flags.has('p4_leap'), 'a full gallop reaches the already drawn Klippudden');
    assert.ok(early.player.x < 8 * HL);
    assert.equal(early.has('ch2_open'), false, 'crossing the hills cannot invent the sea reveal');
    const walk = run(60, 30, () => ({ x: -0.3 }), onHill(['intro_done']));
    assert.ok(!walk.flags.has('p4_leap'), 'a slow walk still cannot leap across the real gap');
    const release1 = run(60, 8, () => ({ x: -1 }), onHill(['intro_done']), { released: 1 });
    assert.equal(release1.has('p4_leap'), false, 'unreleased content retains its boundary');
    assert.ok(release1.player.x > 12.9 * HL);
});

// --- forgiving puzzle mechanics (hidden shells are heavy and blind, so the world meets them halfway) ---
const inViken = (at) => (G) => {
    for (const f of ['intro_done', 'ch2_end', 'ch3_open', 'viken_arrived']) G.flags.add(f);
    G.goto('viken', at);
};

test('a hidden shell that sinks near Strömröret is drawn into it and rides up', () => {
    // 1.6 HL west of the pipe's mouth, near the bottom of the bay
    const G = run(60, 12, pressAt(0.2, 'hide'), inViken({ x: 24.9 * HL, y: 5.2 * HL, facing: 1, mode: 'swim' }));
    assert.ok(G.player.y < -6 * HL, `up the pipe to the gallery (y ${(G.player.y / HL).toFixed(2)} HL)`);
});

test('a shell resting beside the plate slides onto it and opens the shutter', () => {
    const G = run(60, 8, pressAt(0.2, 'hide'), inViken({ x: 13.1 * HL, y: 6.3 * HL, facing: 1, mode: 'swim' }));
    assert.ok(G.flags.has('shutter2'), `the plate latches (x ${(G.player.x / HL).toFixed(2)} HL)`);
});

test('after Knuffa the sköldhäst steps after the stone, so it can push again', () => {
    const G = createGame();
    for (const f of ['intro_done', 'p2_seen']) G.flags.add(f);
    G.goto('land', { x: 99.6 * HL, y: -0.1 * HL, facing: 1 });
    const rail = G.sceneDef.rail;
    for (let push = 1; push <= rail.target; push++) {
        let t = 0;
        while (G.context?.id !== 'knuffa' && t++ < 240) G.step({ x: 0 });
        assert.equal(G.context?.id, 'knuffa', `Knuffa is offered for push ${push}`);
        G.step({ act: true });
        assert.equal(G.puz.stone, push);
    }
    for (let i = 0; i < 120; i++) G.step({});
    assert.equal(G.puz.stone, rail.target, 'four pushes from one spot, with no walking in between');
});

// --- from the fresh-eyes playtest: nothing may trap the sköldhäst -------------------------------------
test('on the pier before the last line, the sköldhäst can still get into the bay (Hoppa i, or down)', () => {
    for (const how of ['act', 'down']) {
        const G = run(60, 4, (G) => (how === 'act' ? (G.time > 0.2 && G.time < 0.25 ? { act: true } : {}) : { y: 1 }),
            inViken({ x: 12 * HL, y: -0.62 * HL, facing: 1 }));
        assert.equal(G.player.mode, 'swim', `${how}: swimming in the bay (at ${(G.player.x / HL).toFixed(2)}, ${(G.player.y / HL).toFixed(2)})`);
    }
});

test('a swimmer touching a wall can always swim away from it', () => {
    for (const gap of [0.0006, 0.005, 0.5, 20]) {
        const G = createGame();
        for (const f of ['intro_done', 'ch1_end', 'ch2_open']) G.flags.add(f);
        const wall = G.scenes.kelp.walls.find((w) => w.id === 'fold').x;
        G.goto('kelp', { x: wall - gap, y: G.scenes.kelp.waterPassage.y, facing: 1, mode: 'swim' });
        G.player.x = G.player.px = wall - gap;
        for (let i = 0; i < 240; i++) G.step({ x: -1 });
        assert.ok(G.player.x < wall - h1(0.5), `from ${gap} units left of the fold it swims left (x ${(G.player.x / HL).toFixed(2)} HL)`);
    }
});

test('a run-up past a backsippa the wrong way does not spoil the right pass', () => {
    const G = run(120, 6, (G) => ({ x: G.time < 1.6 ? 1 : -1 }), (G) => {
        for (const f of ['intro_done', 'exp_fart', 'klo_ja', 'p1_inked', 'b:k1_p1', 'entrance_fluff']) G.flags.add(f);
        G.goto('land', { x: 49.5 * HL, y: -0.8 * HL, facing: 1 });
    });
    for (let i = 0; i < 240; i++) G.step({});
    assert.ok(G.flags.has('p3_t1'), 'the first ramp grows after the run-up');
});
