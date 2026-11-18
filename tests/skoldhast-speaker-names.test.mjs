/*
 * Who speaks is written on the speech box's tab and the hint bubble, in every adventure (the UI audit of
 * 18 November): Äventyr 3's own characters spoke under a face alone, because the shared tab only knew
 * Äventyr 1 and 2's names. Nova's tab stays blank until she has said her name at breakfast (design section 7).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speakerNames } from '../skoldhast/adventures/adventure-3/ui.mjs';
import { STORY, TABLE, NAMES } from '../skoldhast/adventures/adventure-3/content/sv.mjs';
import { NAMES as SHARED } from '../skoldhast/src/content/sv.mjs';

/** Every [who, text] spoken in Äventyr 3's story and at its table. */
function lines() {
    const out = [];
    const walk = (v) => {
        if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string') out.push({ who: v[0], text: v[1] });
        else if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(STORY); walk(TABLE);
    return out;
}

test('Äventyr 3: every character who speaks has a name on the tab', () => {
    const name = speakerNames({ novaNamed: () => true });
    const speakers = new Set(lines().map(l => l.who).filter(w => w !== 'caption' && w !== 'note'));
    assert.ok(speakers.size >= 8, `expected the whole cast, got ${[...speakers]}`);
    for (const who of speakers) {
        const n = name(who, '');
        assert.equal(typeof n, 'string', `${who} is known to Äventyr 3`);
        assert.ok(n.length > 0, `${who} has a name on its tab`);
    }
    // the ones the shared tab never knew
    for (const who of ['bjorn', 'sudd', 'komet', 'pip', 'nova']) {
        assert.ok(!SHARED[who], `${who} is Äventyr 3's own`);
        assert.equal(name(who, ''), NAMES[who]);
    }
    // a speaker the adventure does not know falls back to the shared names
    assert.equal(name('kv', ''), undefined);
});

test('Äventyr 3: Nova\'s tab says "Nova" only from "Jag heter Nova." on', () => {
    const [first, second] = STORY.breakfast;
    assert.equal(first[0], 'nova');
    assert.match(second[1], /Jag heter Nova/);
    const name = speakerNames({ novaNamed: () => false });
    // before breakfast, and its first line
    assert.equal(name('nova', 'Hmpf. Jag sover.'), '');
    assert.equal(name('nova', first[1]), '');
    // the line where she says it, and every line after
    assert.equal(name('nova', second[1]), 'Nova');
    assert.equal(name('nova', 'Min klo lyser.'), 'Nova');
    // a saved game after breakfast names her from the start
    assert.equal(speakerNames({ novaNamed: () => true })('nova', 'Min klo lyser.'), 'Nova');
    // the others never wait
    assert.equal(speakerNames()('klo', 'Hej!'), 'Professor Klo');
});
