import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURES, FIRST_ADVENTURE, getAdventure, adventureStatus, previewIds, withPreview } from '../skoldhast/src/adventures.mjs';

test('three adventures have stable identities; Den magiska skogen is released, the third is not', () => {
    assert.deepEqual(ADVENTURES.map(({ id, number, requires, released }) => ({ id, number, requires, released })), [
        { id: FIRST_ADVENTURE, number: 1, requires: null, released: true },
        { id: 'adventure-2', number: 2, requires: FIRST_ADVENTURE, released: true },
        { id: 'adventure-3', number: 3, requires: 'adventure-2', released: false }
    ]);
    assert.equal(getAdventure(FIRST_ADVENTURE).module, './main.mjs');
    assert.equal(getAdventure('adventure-2').module, '../adventures/adventure-2/main.mjs');
    // built and previewable (dev/play.html?adventure=3), but not released: nobody can choose it yet
    assert.equal(getAdventure('adventure-3').module, '../adventures/adventure-3/main.mjs');
    assert.equal(getAdventure('adventure-3').released, false);
    assert.equal(getAdventure('missing'), null);
    assert.deepEqual(adventureStatus(FIRST_ADVENTURE), { unlocked: true, released: true, playable: true, completed: false });
});

test('completion earns the next unlock but cannot publish unfinished adventures', () => {
    const profile = { completedAdventures: [FIRST_ADVENTURE], released: true, adventures: { 'adventure-3': { released: true } } };
    assert.deepEqual(adventureStatus('adventure-2', profile), { unlocked: true, released: true, playable: true, completed: false });
    assert.deepEqual(adventureStatus('adventure-2', { completedAdventures: [] }), { unlocked: false, released: true, playable: false, completed: false },
        'Den magiska skogen waits until Äventyr 1 is finished');
    assert.equal(adventureStatus('adventure-3', profile).unlocked, false);
    assert.deepEqual(adventureStatus('adventure-3', { completedAdventures: [FIRST_ADVENTURE, 'adventure-2'], adventures: { 'adventure-3': { released: true } } }),
        { unlocked: true, released: false, playable: false, completed: false }, 'a save cannot publish the third adventure');
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
    assert.equal(adventureStatus('adventure-2', firstDone).playable, true, 'the shipped catalogue has Den magiska skogen');
    assert.equal(adventureStatus('adventure-3', secondDone).playable, false, 'the shipped catalogue has no third adventure yet');
});

test('a release flag alone cannot launch an adventure without an entry module', () => {
    const incompleteRelease = ADVENTURES.map((adventure) => ({ ...adventure, released: true, module: adventure.id === 'adventure-3' ? null : adventure.module }));
    assert.equal(adventureStatus('adventure-3', { completedAdventures: [FIRST_ADVENTURE, 'adventure-2'] }, incompleteRelease).playable, false);
});

test('?adventure=2 opens Den magiska skogen without its unlock; nothing else changes', () => {
    assert.deepEqual(previewIds('?adventure=2'), ['adventure-2']);
    assert.deepEqual(previewIds('?skoldhast&adventure=2'), ['adventure-2']);
    assert.deepEqual(previewIds('#adventure=2'), ['adventure-2']);
    // Äventyr 3 is built and can be previewed before it is released; a number with no adventure cannot
    assert.deepEqual(previewIds('?adventure=3'), ['adventure-3']);
    assert.deepEqual(previewIds('?adventure=4'), [], 'an adventure that does not exist cannot be previewed');
    assert.deepEqual(previewIds(''), []);
    const previewed = withPreview(ADVENTURES, previewIds('?adventure=2'));
    assert.equal(adventureStatus('adventure-2', { completedAdventures: [] }, previewed).playable, true);
    assert.equal(adventureStatus('adventure-2', { completedAdventures: [] }).playable, false, 'the shipped catalogue still asks for Äventyr 1 first');
    assert.equal(withPreview(ADVENTURES, []), ADVENTURES);
});
