import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/launcher.mjs';
import { ADVENTURES, FIRST_ADVENTURE } from '../skoldhast/src/adventures.mjs';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fixture({ catalogue = ADVENTURES, profile = {}, loadRuntime } = {}) {
    const events = [], runtimes = [];
    const saver = {
        last: () => 'alva', loadProfile: () => ({ data: profile }),
        selectAdventure: (slot, id) => { events.push(['select', slot, id]); profile.activeAdventure = id; }
    };
    const module = { createGame(options) {
        const runtime = { options, state: 'closed', debug: { id: options.adventureId },
            async open() { events.push(['open', options.adventureId]); this.state = 'open'; },
            async close() { if (this.state === 'closed') return; events.push(['close', options.adventureId]); this.state = 'closed'; options.onClose(); },
            pause() { events.push(['pause', options.adventureId]); },
            resume() { events.push(['resume', options.adventureId]); }
        };
        runtimes.push(runtime); return runtime;
    } };
    const game = createGame({ catalogue, saver,
        loadRuntime: loadRuntime ? entry => loadRuntime(entry, module) : async entry => { events.push(['load', entry.id]); return module; },
        onClose: () => events.push(['host-close'])
    });
    return { game, events, runtimes, saver };
}

test('unreleased adventures cannot load, even with every prerequisite completed', async () => {
    const { game, events } = fixture({ profile: { completedAdventures: [FIRST_ADVENTURE, 'adventure-2'] } });
    await game.open();
    assert.equal(game.activeAdventure, FIRST_ADVENTURE);
    assert.equal(await game.switchAdventure('adventure-2'), false);
    assert.equal(await game.switchAdventure('adventure-3'), false);
    assert.equal(await game.switchAdventure('unknown'), false);
    assert.deepEqual(events.filter(e => e[0] === 'load'), [['load', FIRST_ADVENTURE]]);
    await game.close();
});

test('a future released adventure waits for the old runtime to close and uses the same player store', async () => {
    const catalogue = ADVENTURES.map(a => ({ ...a, released: true, module: './fixture.mjs' }));
    const profile = { completedAdventures: [FIRST_ADVENTURE] };
    const { game, events, runtimes, saver } = fixture({ catalogue, profile });
    await game.open();
    const gate = deferred();
    const originalClose = runtimes[0].close.bind(runtimes[0]);
    runtimes[0].close = async () => { await gate.promise; await originalClose(); };
    const switchWork = game.switchAdventure('adventure-2');
    assert.equal(runtimes.length, 1);
    gate.resolve();
    assert.equal(await switchWork, true);
    assert.equal(game.activeAdventure, 'adventure-2');
    assert.equal(runtimes[1].options.saver, saver);
    assert.equal(runtimes[1].options.slotId, 'alva');
    assert.ok(events.findIndex(e => e[0] === 'close') < events.findIndex(e => e[0] === 'open' && e[1] === 'adventure-2'));
    assert.equal(events.some(e => e[0] === 'host-close'), false);
    assert.equal(await game.switchAdventure('adventure-3'), false, 'finishing one does not skip the second');
    assert.equal(await game.switchAdventure(FIRST_ADVENTURE), true, 'return to the completed world');
    await game.close();
});

test('opening an unavailable remembered adventure falls back to the first', async () => {
    const { game } = fixture({ profile: { activeAdventure: 'adventure-3', completedAdventures: [FIRST_ADVENTURE] } });
    await game.open();
    assert.equal(game.activeAdventure, FIRST_ADVENTURE);
    await game.close();
});

test('closing during a module download prevents construction and allows reopening', async () => {
    const gate = deferred();
    const { game, runtimes, events } = fixture({ loadRuntime: async (entry, module) => { await gate.promise; return module; } });
    const opening = game.open();
    await Promise.resolve();
    const closing = game.close();
    gate.resolve();
    await Promise.all([opening, closing]);
    assert.equal(game.state, 'closed');
    assert.equal(runtimes.length, 0);
    assert.equal(events.filter(e => e[0] === 'host-close').length, 1);
    await game.open();
    assert.equal(game.state, 'open');
    await game.close();
});

test('a runtime retry remains owned by the series launcher', async () => {
    const { game, runtimes } = fixture();
    await game.open();
    await runtimes[0].options.onRestart();
    assert.equal(runtimes.length, 2);
    assert.equal(game.state, 'open');
    assert.equal(game.debug, runtimes[1].debug);
    await game.close();
    assert.equal(runtimes[1].state, 'closed');
});

test('closing also cancels a switch queued behind a module download', async () => {
    const gate = deferred();
    const catalogue = ADVENTURES.map(a => ({ ...a, released: true, module: './fixture.mjs' }));
    const { game, runtimes } = fixture({ catalogue, profile: { completedAdventures: [FIRST_ADVENTURE] },
        loadRuntime: async (entry, module) => { await gate.promise; return module; } });
    const opening = game.open();
    const switching = game.switchAdventure('adventure-2');
    const closing = game.close();
    gate.resolve();
    await Promise.all([opening, closing]);
    assert.equal(await switching, false);
    assert.equal(game.state, 'closed');
    assert.equal(runtimes.length, 0);
});

test('a player change survives closing and reopening the launcher', async () => {
    const { game, runtimes } = fixture();
    await game.open();
    runtimes[0].options.onSlotChange('mira');
    await game.close();
    await game.open();
    assert.equal(runtimes[1].options.slotId, 'mira');
    await game.close();
});

test('a failed module download can be retried', async () => {
    let attempts = 0;
    const { game } = fixture({ loadRuntime: async (entry, module) => {
        if (++attempts === 1) throw new Error('offline');
        return module;
    } });
    await assert.rejects(game.open(), /offline/);
    assert.equal(game.state, 'closed');
    await game.open();
    assert.equal(game.state, 'open');
    await game.close();
});
