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

test('storage that throws (private mode) is reported as unavailable', () => {
    const keep = globalThis.window.localStorage;
    globalThis.window.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
    try {
        const s = createSave();
        assert.equal(s.available, false);
        assert.equal(s.store('alva', 'Alva', { flags: [] }), false);
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
