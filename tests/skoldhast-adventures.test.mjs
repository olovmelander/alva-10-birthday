import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURES, FIRST_ADVENTURE, getAdventure, adventureStatus } from '../skoldhast/src/adventures.mjs';

test('three adventures have stable identities and only the existing story ships', () => {
    assert.deepEqual(ADVENTURES.map(({ id, number, requires, released }) => ({ id, number, requires, released })), [
        { id: FIRST_ADVENTURE, number: 1, requires: null, released: true },
        { id: 'adventure-2', number: 2, requires: FIRST_ADVENTURE, released: false },
        { id: 'adventure-3', number: 3, requires: 'adventure-2', released: false }
    ]);
    assert.equal(getAdventure(FIRST_ADVENTURE).module, './main.mjs');
    assert.equal(getAdventure('adventure-2').module, null);
    assert.equal(getAdventure('adventure-3').module, null);
    assert.equal(getAdventure('missing'), null);
    assert.deepEqual(adventureStatus(FIRST_ADVENTURE), { unlocked: true, released: true, playable: true, completed: false });
});

test('completion earns the next unlock but cannot publish unfinished adventures', () => {
    const profile = { completedAdventures: [FIRST_ADVENTURE], released: true, adventures: { 'adventure-2': { released: true } } };
    assert.deepEqual(adventureStatus('adventure-2', profile), { unlocked: true, released: false, playable: false, completed: false });
    assert.equal(adventureStatus('adventure-3', profile).unlocked, false);
    assert.equal(adventureStatus(FIRST_ADVENTURE, profile).completed, true);
    assert.equal(adventureStatus('adventure-2', { completedAdventures: 'havet-mellan-sidorna' }).unlocked, false);
    assert.deepEqual(adventureStatus('missing', profile), { unlocked: false, released: false, playable: false, completed: false });
});

test('released sequels become playable sequentially using previously earned completions', () => {
    const released = ADVENTURES.map((adventure) => ({ ...adventure, released: true, module: './fixture.mjs' }));
    const before = { completedAdventures: [] };
    const firstDone = { completedAdventures: [FIRST_ADVENTURE] };
    const secondDone = { completedAdventures: [FIRST_ADVENTURE, 'adventure-2'] };
    assert.equal(adventureStatus('adventure-2', before, released).playable, false);
    assert.equal(adventureStatus('adventure-2', firstDone, released).playable, true);
    assert.equal(adventureStatus('adventure-3', firstDone, released).playable, false);
    assert.equal(adventureStatus('adventure-3', secondDone, released).playable, true);
    assert.equal(adventureStatus('adventure-2', firstDone).playable, false, 'the shipped release is still unavailable');
});

test('a release flag alone cannot launch an adventure without an entry module', () => {
    const incompleteRelease = ADVENTURES.map((adventure) => ({ ...adventure, released: true }));
    assert.equal(adventureStatus('adventure-2', { completedAdventures: [FIRST_ADVENTURE] }, incompleteRelease).playable, false);
});
