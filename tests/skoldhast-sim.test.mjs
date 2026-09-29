/*
 * Sköldhästen: the movement simulation is deterministic and the outcome of a
 * run does not depend on the display's frame rate (plan §8.2, §8.8).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { STEP, HL } from '../skoldhast/src/sim.mjs';

/** Run main.mjs's accumulator loop at a display rate: input is read once per frame, presses go to the first step. */
function run(hz, seconds, input, setup) {
    const G = createGame();
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

test('the big leap needs Kapitel 2 and a gallop', () => {
    const onHill = (flags) => (G) => { flags.forEach((f) => G.flags.add(f)); G.goto('land', { x: 28 * HL, y: -6.35 * HL, facing: -1 }); };
    const early = run(60, 8, () => ({ x: -1 }), onHill(['intro_done']));
    assert.ok(early.player.x > 12.9 * HL, 'the white page stops the leap before Kapitel 2');
    const later = run(60, 8, () => ({ x: -1 }), onHill(['intro_done', 'ch2_open']));
    assert.ok(later.flags.has('p4_leap'), 'the leap lands on Klippudden');
    assert.ok(later.player.x < 8 * HL);
    const walk = run(60, 30, () => ({ x: -0.3 }), onHill(['intro_done', 'ch2_open']));
    assert.ok(!walk.flags.has('p4_leap'), 'no leap at a walk');
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
