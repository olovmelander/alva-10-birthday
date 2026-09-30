import test from 'node:test';
import assert from 'node:assert/strict';
import { createPressQueue } from '../skoldhast/src/presses.mjs';
import { createGame } from '../skoldhast/src/game.mjs';
import { HL } from '../skoldhast/src/sim.mjs';

test('action edges survive rendered frames with no 120 Hz simulation step', () => {
    for (const fps of [30, 60, 120, 144, 240]) {
        const q = createPressQueue(); let acc = 0, actions = 0, hides = 0, hops = 0, ducks = 0;
        for (let frame = 0; frame < fps; frame++) {
            q.push(frame === 0 ? { act: true, hide: true, hop: true, duck: true } : {});
            acc += 1/fps;
            while (acc + 1e-9 >= 1/120) {
                const e = q.consume(); actions += !!e.act; hides += !!e.hide;
                hops += !!e.hop; ducks += !!e.duck;
                acc -= 1/120;
            }
        }
        assert.equal(actions, 1, `${fps} Hz action delivered exactly once`);
        assert.equal(hides, 1, `${fps} Hz hide delivered exactly once`);
        assert.equal(hops, 1, `${fps} Hz jump delivered exactly once`);
        assert.equal(ducks, 1, `${fps} Hz tuck delivered exactly once`);
    }
});

test('entering a panel or pause drops unconsumed gameplay presses', () => {
    const q = createPressQueue(); q.push({ act: true, tapHero: true }); q.clear();
    assert.deepEqual(q.consume(), {});
});

function holdGame() {
    const G = createGame();
    G.flags.add('intro_done');
    G.goto('land', { x: 88 * HL, y: -0.9 * HL, facing: 1 });
    return G;
}

test('hold-to-hide release wins when down and up reach the same actual game step', () => {
    const G = holdGame(), q = createPressQueue();
    q.push({ hide: true }); q.push({ hideUp: true });
    const edges = q.consume();
    G.step({ hide: edges.hide && !G.player.hidden, hideRelease: edges.hideUp });
    for (let i = 0; i < 120; i++) G.step({});
    assert.equal(G.player.hidden, false);
    assert.equal(G.player.hideQueued, false);
});

test('releasing hold-to-hide cancels a queued tuck while braking or airborne', () => {
    for (const airborne of [false, true]) {
        const G = holdGame();
        G.player.vx = 600;
        if (airborne) G.step({ hop: true });
        G.step({ hide: true });
        for (let i = 0; i < 5; i++) G.step({});
        assert.equal(G.player.hidden, false);
        assert.equal(G.player.hideQueued, true);
        G.step({ hideRelease: true });
        for (let i = 0; i < 180; i++) G.step({});
        assert.equal(G.player.hidden, false, airborne ? 'no tuck after landing' : 'no tuck after braking');
        assert.equal(G.player.hideQueued, false);
    }
});

test('releasing hold-to-hide emerges once, while ordinary toggle hiding stays unchanged', () => {
    const G = holdGame();
    G.step({ hide: true }); assert.equal(G.player.hidden, true);
    for (let i = 0; i < 10; i++) G.step({});
    assert.equal(G.player.hidden, true, 'toggle mode stays hidden without an explicit release');
    G.step({ hideRelease: true });
    assert.equal(G.player.hidden, false);
    assert.equal(G.lastEvents.filter(e => e.type === 'unhide').length, 1);
    G.step({ hideRelease: true });
    assert.equal(G.lastEvents.filter(e => e.type === 'unhide').length, 0);
});
