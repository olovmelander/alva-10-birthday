import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, HL } from '../skoldhast/src/game.mjs';
import { contextAction, countPencils, pencilAvailable, pencilProgress } from '../skoldhast/src/puzzles.mjs';

function underwaterCollection() {
    const G = createGame();
    G.goto('kelp', { x: 10 * HL, y: 3 * HL, mode: 'swim' });
    const pc = { id: 'test-sea-pencil', x: 10 * HL, y: 3 * HL, chapter: 2, when: 'test_revealed', prop: 'boat', propAt: { x: 11 * HL, y: 3 * HL } };
    // An isolated authored object uses the real swimmer, puzzles and context routing.
    G.sceneDef = { ...G.sceneDef, pencils: [pc] };
    G.scenes = { ...G.scenes, kelp: G.sceneDef };
    return { G, pc };
}

test('pencil gates agree for collection and colouring before a chapter or clue opens', () => {
    const { G, pc } = underwaterCollection();
    G.step({});
    assert.equal(countPencils(G), 0);
    G.flags.add('test_revealed'); G.step({});
    assert.equal(pencilAvailable(pc, G.flags), false, 'chapter gate still applies');
    assert.equal(countPencils(G), 0);
    G.flags.add('ch2_open'); G.step({});
    assert.equal(pencilAvailable(pc, G.flags), true);
    assert.equal(countPencils(G), 1);
    G.player.x = pc.propAt.x;
    G.flags.delete('test_revealed');
    assert.notEqual(contextAction(G)?.id, 'farglagg', 'a closed clue gate also hides the action');
});

test('swimmers can colour once after emerging, with no action while hidden or rushing past', () => {
    const { G, pc } = underwaterCollection(), events = [];
    G.flags.add('ch2_open'); G.flags.add('test_revealed');
    G.on('colorin', e => events.push(e));
    G.step({});
    G.player.x = pc.propAt.x;
    G.player.hidden = true;
    assert.notEqual(contextAction(G)?.id, 'farglagg');
    G.player.hidden = false; G.player.vx = 700;
    assert.notEqual(contextAction(G)?.id, 'farglagg');
    G.player.vx = 0;
    const action = contextAction(G);
    assert.equal(action?.id, 'farglagg');
    G.step({ act: true });
    assert.ok(G.flags.has('color_' + pc.id));
    action.run(); G.step({ act: true });
    assert.equal(events.length, 1, 'a held/stale action cannot award colouring twice');
    assert.notEqual(contextAction(G)?.id, 'farglagg');
});

test('regional counts derive from authored save flags and ignore unknown or retired IDs', () => {
    const G = createGame();
    const original = G.scenes.land.pencils.slice(0, 5);
    for (const pc of original) { G.flags.add('penna_' + pc.id); G.flags.add('color_' + pc.id); }
    G.flags.add('penna_retired');
    const restored = createGame();
    restored.restore(G.serialize());
    assert.equal(countPencils(restored), 5, 'the existing five-pencil save remains intact');
    const regions = pencilProgress(restored);
    assert.equal(regions.find(r => r.id === 'land').found, 5);
    assert.equal(regions.find(r => r.id === 'kelp').found, 0);
    assert.equal(regions.find(r => r.id === 'viken').found, 0);
    assert.ok(original.every(pc => restored.flags.has('color_' + pc.id)), 'coloured props remain coloured');
});
