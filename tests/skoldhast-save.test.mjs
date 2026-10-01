/*
 * Sköldhästen: saving, loading, migration and word codes (plan §8.6).
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.window = {
    localStorage: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { store.set(k, String(v)); },
        removeItem: (k) => { store.delete(k); }
    }
};
globalThis.navigator ??= {};
const { createSave, codeToChapter, CODE_RESTORE } = await import('../skoldhast/src/save.mjs');
const { FIRST_ADVENTURE, adventureStatus } = await import('../skoldhast/src/adventures.mjs');
const { WORD_CODES } = await import('../skoldhast/src/content/sv.mjs');
const { CHECKPOINTS } = await import('../skoldhast/src/content/world.mjs');

beforeEach(() => store.clear());

test('a slot round-trips', () => {
    const s = createSave();
    assert.ok(s.available);
    s.store('alva', 'Alva', { flags: ['intro_done', 'p1_inked'], checkpoint: 'steppe', puz: { tally: 2 }, note: 'hej', settings: { music: 0.5 } });
    const got = s.load('alva');
    assert.deepEqual(got.data.flags, ['intro_done', 'p1_inked']);
    assert.equal(got.data.checkpoint, 'steppe');
    assert.equal(got.data.note, 'hej');
    assert.equal(s.last(), 'alva');
    assert.deepEqual(s.slots().map((x) => x.id), ['alva']);
});

test('broken or odd data never throws', () => {
    const s = createSave();
    store.set('skoldhast.v1.slot.alva', '{not json');
    assert.deepEqual(s.load('alva'), { corrupt: true });
    store.set('skoldhast.v1.slot.alva', JSON.stringify({ flags: 'nope' }));
    assert.deepEqual(s.load('alva'), { corrupt: true });
    store.set('skoldhast.v1.slot.alva', JSON.stringify({ flags: ['ok', 5, null, 'x'.repeat(80)], note: 'y'.repeat(500) }));
    const got = s.load('alva').data;
    assert.deepEqual(got.flags, ['ok']);
    assert.equal(got.note.length, 200);
    assert.equal(got.checkpoint, 'start');
    assert.equal(s.load('nobody'), null);
});

test('removing a slot updates the index', () => {
    const s = createSave();
    s.store('alva', 'Alva', { flags: [] });
    s.store('r-pappa', 'Pappa', { flags: [] });
    s.remove('r-pappa');
    assert.deepEqual(s.slots().map((x) => x.id), ['alva']);
});

test('legacy migration preserves a complete adventure and leaves its original untouched', () => {
    const legacy = { v: 1, contentVersion: 1, label: 'Alva', updated: 123,
        flags: ['intro_done', 'ended'], checkpoint: 'viken', puz: { tally: 3 },
        companionHints: [['kelp', 2]], note: 'Tillbaka vid havet',
        strokes: { gull: [[1, 2], [3, 4]], cloudColor: '#abc' }, settings: { music: 0.25, lessMotion: true } };
    const raw = JSON.stringify(legacy);
    store.set('skoldhast.v1.slot.alva', raw);
    store.set('skoldhast.v1.index', JSON.stringify({ slots: ['alva'], last: 'alva' }));
    const s = createSave();
    const profile = s.loadProfile('alva').data;
    assert.equal(profile.activeAdventure, FIRST_ADVENTURE);
    assert.deepEqual(profile.completedAdventures, [FIRST_ADVENTURE]);
    const data = s.load('alva').data;
    for (const field of ['flags', 'checkpoint', 'puz', 'companionHints', 'note', 'strokes', 'settings', 'label']) {
        assert.deepEqual(data[field], legacy[field], field);
    }
    assert.equal(data.ended, true);
    assert.equal(store.has('skoldhast.v2.slot.alva'), false, 'reading does not rewrite saves');
    s.store('alva', 'Alva', data);
    assert.equal(JSON.parse(store.get('skoldhast.v2.slot.alva')).v, 2);
    assert.equal(store.get('skoldhast.v1.slot.alva'), raw);
    assert.deepEqual(createSave().loadProfile('alva').data.completedAdventures, [FIRST_ADVENTURE]);
});

test('legacy whole-story endings unlock the sequel while internal chapters do not', () => {
    for (const [id, state, completed] of [
        ['unfinished', { flags: ['ch1_end', 'ch2_end'], ended: false }, false],
        ['boolean', { flags: ['intro_done'], ended: true }, true],
        ['flag', { flags: ['ended'] }, true],
        ['malformed', { flags: ['intro_done'], ended: 'false' }, false]
    ]) {
        store.set('skoldhast.v1.slot.' + id, JSON.stringify(state));
        const profile = createSave().loadProfile(id).data;
        assert.equal(adventureStatus('adventure-2', profile).unlocked, completed, id);
        assert.equal(adventureStatus('adventure-2', profile).playable, false, id);
    }
});

test('adventures and players retain separate progress while settings follow the player', () => {
    const s = createSave();
    s.store('alva', 'Alva', { flags: ['ended'], checkpoint: 'viken', strokes: { gull: [[1, 2]] }, settings: { music: 0.4, lessMotion: true } });
    s.store('alva', 'Alva', { flags: ['second_intro'], checkpoint: 'second-start', settings: { music: 0.1 } }, 'adventure-2');
    s.store('pappa', 'Pappa', { flags: ['intro_done'], checkpoint: 'start', settings: { music: 0.8 } });
    assert.equal(s.load('alva').data.checkpoint, 'viken');
    assert.deepEqual(s.load('alva').data.strokes, { gull: [[1, 2]] });
    assert.equal(s.load('alva', 'adventure-2').data.checkpoint, 'second-start');
    assert.deepEqual(s.load('alva').data.settings, { music: 0.1, lessMotion: true });
    assert.equal(s.load('pappa').data.settings.music, 0.8);
    assert.deepEqual(s.loadProfile('pappa').data.completedAdventures, []);
    assert.equal(s.load('pappa', 'adventure-2'), null);
    assert.equal(s.loadProfile('alva').data.activeAdventure, 'adventure-2');
    const fromDisk = createSave();
    assert.equal(fromDisk.load('alva', 'adventure-2').data.checkpoint, 'second-start');
    assert.equal(fromDisk.load('pappa').data.checkpoint, 'start');
});

test('replaying any completed adventure preserves earned unlocks and the other story', () => {
    const s = createSave();
    s.store('alva', 'Alva', { flags: ['ended'], ended: true });
    s.store('alva', 'Alva', { flags: ['ended'], checkpoint: 'second-end' }, 'adventure-2');
    s.store('alva', 'Alva', { flags: [], checkpoint: 'start', ended: false });
    assert.equal(s.load('alva').data.ended, false);
    assert.deepEqual(s.loadProfile('alva').data.completedAdventures, [FIRST_ADVENTURE, 'adventure-2']);
    assert.equal(s.load('alva', 'adventure-2').data.checkpoint, 'second-end');
    s.store('alva', 'Alva', { flags: [], ended: false }, 'adventure-2');
    assert.deepEqual(createSave().loadProfile('alva').data.completedAdventures, [FIRST_ADVENTURE, 'adventure-2']);
    assert.equal(adventureStatus('adventure-3', s.loadProfile('alva').data).unlocked, true);
});

test('selecting an available adventure changes only the active selection', () => {
    const s = createSave();
    s.store('alva', 'Alva', { flags: ['ended'], checkpoint: 'viken' });
    s.store('alva', 'Alva', { flags: ['second_intro'], checkpoint: 'second-start' }, 'adventure-2');
    const before = s.loadProfile('alva').data;
    assert.equal(s.selectAdventure('alva', FIRST_ADVENTURE), true);
    const after = s.loadProfile('alva').data;
    assert.equal(after.activeAdventure, FIRST_ADVENTURE);
    assert.deepEqual(after.adventures, before.adventures);
    assert.deepEqual(after.completedAdventures, before.completedAdventures);
    assert.equal(s.selectAdventure('alva', 'adventure-2'), false, 'unreleased adventures cannot be selected');
    assert.equal(s.selectAdventure('alva', 'missing'), false);
    assert.equal(s.selectAdventure('missing', FIRST_ADVENTURE), false);
});

test('legacy and current slot indexes combine without duplication', () => {
    store.set('skoldhast.v1.index', JSON.stringify({ slots: ['alva', 'pappa', 'alva', 42], last: 'pappa' }));
    store.set('skoldhast.v1.slot.alva', JSON.stringify({ flags: [], label: 'Alva' }));
    store.set('skoldhast.v1.slot.pappa', JSON.stringify({ flags: [], label: 'Pappa' }));
    const s = createSave();
    assert.equal(s.last(), 'pappa');
    s.store('alva', 'Alva', { flags: ['intro_done'] });
    s.store('gäst', 'Gäst', { flags: [] });
    const fromDisk = createSave();
    assert.deepEqual(fromDisk.slots().map((slot) => slot.id), ['alva', 'pappa', 'gäst']);
    assert.equal(fromDisk.last(), 'gäst');
    s.remove('alva');
    assert.equal(createSave().load('alva'), null, 'removal cannot resurrect the legacy original');
    assert.ok(store.has('skoldhast.v1.slot.alva'));
    s.store('alva', 'Alva', { flags: [] });
    assert.deepEqual(createSave().load('alva').data.flags, []);
});

test('corrupt or newer profiles block writes and never fall back to an older save', () => {
    for (const bad of ['{broken', 'null', JSON.stringify({ v: 3, adventures: {} }),
        JSON.stringify({ v: 2, adventures: [] }), JSON.stringify({ v: 2, adventures: { [FIRST_ADVENTURE]: { flags: 'wrong' } } })]) {
        store.set('skoldhast.v2.slot.alva', bad);
        store.set('skoldhast.v1.slot.alva', JSON.stringify({ flags: ['intro_done'] }));
        const s = createSave();
        assert.deepEqual(s.loadProfile('alva'), { corrupt: true });
        assert.deepEqual(s.load('alva'), { corrupt: true });
        assert.equal(s.store('alva', 'Alva', { flags: [] }), false);
        assert.equal(store.get('skoldhast.v2.slot.alva'), bad);
        assert.equal(s.selectAdventure('alva', FIRST_ADVENTURE), false);
    }
    store.delete('skoldhast.v2.slot.alva');
    const newerLegacy = JSON.stringify({ v: 2, flags: [] });
    store.set('skoldhast.v1.slot.alva', newerLegacy);
    assert.equal(createSave().store('alva', 'Alva', { flags: [] }), false);
    assert.equal(store.get('skoldhast.v1.slot.alva'), newerLegacy);
});

test('malformed optional profile fields are normalized without granting completion', () => {
    store.set('skoldhast.v2.slot.alva', JSON.stringify({ v: 2, label: 8, updated: 'yesterday',
        settings: [], activeAdventure: 'missing', completedAdventures: [null, 5, 'missing', FIRST_ADVENTURE, FIRST_ADVENTURE],
        adventures: { [FIRST_ADVENTURE]: { flags: ['intro_done', 8, null], checkpoint: 7,
            puz: [], companionHints: 'wrong', strokes: [], note: 12, ended: 'true' } } }));
    const s = createSave();
    const profile = s.loadProfile('alva').data;
    assert.equal(profile.label, 'alva');
    assert.equal(profile.updated, 0);
    assert.equal(profile.activeAdventure, FIRST_ADVENTURE);
    assert.deepEqual(profile.settings, {});
    assert.deepEqual(profile.completedAdventures, [FIRST_ADVENTURE]);
    assert.deepEqual(s.load('alva').data, { contentVersion: 1, flags: ['intro_done'], checkpoint: 'start', puz: {}, companionHints: [], note: '', strokes: null, ended: false, settings: {}, label: 'alva' });
    assert.equal(s.store('alva', 'Alva', { flags: [] }, 'missing'), false);
});

test('failed writes retain the session state while the previous durable save remains intact', () => {
    const s = createSave();
    s.store('alva', 'Alva', { flags: ['intro_done'], checkpoint: 'start' });
    const persisted = store.get('skoldhast.v2.slot.alva');
    const originalSet = window.localStorage.setItem;
    window.localStorage.setItem = () => { throw new Error('quota full'); };
    try {
        assert.equal(s.store('alva', 'Alva', { flags: ['ended'], checkpoint: 'viken' }), false);
        assert.equal(s.load('alva').data.checkpoint, 'viken');
        assert.equal(adventureStatus('adventure-2', s.loadProfile('alva').data).unlocked, true);
        assert.equal(store.get('skoldhast.v2.slot.alva'), persisted);
        const readOnly = createSave();
        assert.equal(readOnly.available, false);
        assert.equal(readOnly.load('alva').data.checkpoint, 'start', 'quota failure still allows reading existing saves');
    } finally { window.localStorage.setItem = originalSet; }
});

test('persistent profiles are reread so another tab can update progress', () => {
    const s = createSave();
    s.store('alva', 'Alva', { flags: [], checkpoint: 'start' });
    const profile = JSON.parse(store.get('skoldhast.v2.slot.alva'));
    profile.adventures[FIRST_ADVENTURE].checkpoint = 'viken';
    profile.adventures[FIRST_ADVENTURE].flags = ['ended'];
    store.set('skoldhast.v2.slot.alva', JSON.stringify(profile));
    assert.equal(s.load('alva').data.checkpoint, 'viken');
    assert.deepEqual(s.loadProfile('alva').data.completedAdventures, [FIRST_ADVENTURE]);
});

test('word codes are forgiving about case, spaces and punctuation', () => {
    assert.equal(codeToChapter(WORD_CODES[1]), 1);
    assert.equal(codeToChapter(WORD_CODES[1].toLowerCase().replace(/ /g, '  ')), 1);
    assert.equal(codeToChapter(WORD_CODES[2].replace(/ /g, '-')), 2);
    assert.equal(codeToChapter('  ' + WORD_CODES[2].toLowerCase() + '!'), 2);
    assert.equal(codeToChapter('hej hopp'), 0);
    assert.equal(codeToChapter(''), 0);
});

test('word codes restore to real checkpoints', () => {
    for (const r of Object.values(CODE_RESTORE)) {
        assert.ok(CHECKPOINTS[r.checkpoint], r.checkpoint);
        assert.ok(r.flags.includes('intro_done'));
    }
});

test('word codes match the new chapter boundary without awarding the unfinished land route', () => {
    for (const flag of ['p2_open', 'clue_fold', 'clue_figure', 'ch1_end']) assert.ok(CODE_RESTORE[1].flags.includes(flag), flag);
    for (const flag of ['p1_inked', 'p3_t1', 'p3_t2', 'p3_t3', 'p3_done', 'clue_wave_marks']) {
        assert.equal(CODE_RESTORE[1].flags.includes(flag), false, `chapter one does not award ${flag}`);
        assert.ok(CODE_RESTORE[2].flags.includes(flag), `chapter two preserves ${flag}`);
    }
});

test('blocked storage reports unavailable while keeping progress and completion for this session', () => {
    const keep = globalThis.window.localStorage;
    globalThis.window.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
    try {
        const s = createSave();
        assert.equal(s.available, false);
        assert.equal(s.store('alva', 'Alva', { flags: ['ended'] }), false);
        assert.deepEqual(s.slots().map((slot) => slot.id), ['alva']);
        assert.equal(s.load('alva').data.ended, true);
        assert.deepEqual(s.loadProfile('alva').data.completedAdventures, [FIRST_ADVENTURE]);
        s.store('alva', 'Alva', { flags: [] });
        assert.equal(adventureStatus('adventure-2', s.loadProfile('alva').data).unlocked, true);
        s.remove('alva');
        assert.equal(s.load('alva'), null);
        assert.deepEqual(s.slots(), []);
    } finally { globalThis.window.localStorage = keep; }
});


test('chapter availability comes from the running release and cannot be injected by a saved flag', async () => {
    const { createGame } = await import('../skoldhast/src/game.mjs');
    const full = createGame();
    assert.ok(full.has('chapter2_available'));
    assert.equal(full.serialize().flags.includes('chapter2_available'), false);
    const limited = createGame({ released: 1 });
    limited.restore({ flags: [...CODE_RESTORE[1].flags, 'chapter2_available'], checkpoint: 'ledge' });
    assert.equal(limited.has('chapter2_available'), false);
    assert.equal(limited.has('p4_leap'), false);
    full.restore({ flags: ['intro_done'], checkpoint: 'start' });
    assert.ok(full.has('chapter2_available'), 'loading an older save does not erase released land');
});
