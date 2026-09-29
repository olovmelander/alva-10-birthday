import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { C, HL, STEP, snapshot } from '../skoldhast/src/sim.mjs';

function atMouth(direction, depth = C.floatDepth) {
    const G = createGame();
    G.goto('kelp', { x: 7 * HL - direction * 40, y: depth, facing: direction, mode: 'swim' });
    return G;
}

test('the connected cave and open sea have one water surface and preserve entry immersion', () => {
    const G = createGame();
    G.goto('kelp', 'fromLand');
    const [cave, sea] = G.terrain.waters;
    assert.equal(cave.x1, sea.x0, 'the cave mouth directly joins the sea');
    assert.equal(cave.top, sea.top, 'connected water cannot have a vertical step');
    assert.equal(G.player.water.id, 'cave');
    assert.ok(Math.abs(G.player.y - cave.top - 280) < 1e-8, 'the entry keeps its authored underwater immersion');
    assert.equal(snapshot(G.player, 1, G.terrain, 0).waterY, sea.top, 'the rig receives the same surface on arrival');
});

test('swimming or coasting through the cave mouth in either direction never snaps the body or waterline', () => {
    for (const direction of [-1, 1]) for (const input of [{ x: direction }, { x: direction, y: -1 }, {}]) {
        const G = atMouth(direction);
        G.player.vx = direction * 300;
        let maxStep = 0, crossed = false;
        for (let i = 0; i < 2 / STEP; i++) {
            const previousY = G.player.y;
            G.step(input);
            maxStep = Math.max(maxStep, Math.abs(G.player.y - previousY));
            assert.equal(G.player.mode, 'swim');
            assert.equal(snapshot(G.player, 1, G.terrain, G.time).waterY, 0, 'no waterline jump reaches the rig');
            if (G.player.water.id === (direction > 0 ? 'sea' : 'cave')) crossed = true;
        }
        assert.ok(crossed, `${direction}/${JSON.stringify(input)} crosses the mouth`);
        assert.ok(maxStep < 2, `surface motion stays continuous: ${maxStep} wu per fixed step`);
        assert.ok(Math.abs(G.player.y - (input.y ? C.floatDepth - 30 : C.floatDepth)) < 0.01, 'the same surface swimming depth applies on both sides');
    }
});

test('a shell can sink across the mouth, emerge and swim back to the shared surface', () => {
    for (const direction of [-1, 1]) {
        const G = atMouth(direction, 180);
        G.player.vx = direction * 300;
        G.step({ hide: true });
        for (let i = 0; i < 2 / STEP; i++) G.step({});
        assert.equal(G.player.hidden, true);
        assert.equal(G.player.water.id, direction > 0 ? 'sea' : 'cave', 'the shell glides across before settling');
        const depth = G.player.y;
        G.step({ hide: true });
        for (let i = 0; i < 3 / STEP; i++) G.step({ y: -1 });
        assert.equal(G.player.hidden, false);
        assert.equal(G.player.mode, 'swim');
        assert.ok(G.player.y < depth - 100, 'emerging restores upward swimming');
        assert.equal(G.player.y, C.floatDepth - 30, 'both sides use the same surface limit');
    }
});
