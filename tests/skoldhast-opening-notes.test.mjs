import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSentences, noteCues, wrapWords } from '../skoldhast/src/opening-notes.mjs';
import { HER_TEXT, JOURNAL } from '../skoldhast/src/content/sv.mjs';

test("her note is her four sentences, word for word", () => {
    const sentences = splitSentences(HER_TEXT.full);
    assert.equal(sentences.length, 4);
    assert.equal(sentences[0], HER_TEXT.first);
    assert.equal(sentences[2], HER_TEXT.question);
    assert.equal(sentences[3], HER_TEXT.hope);
    assert.equal(sentences.join(' '), HER_TEXT.full);
    assert.ok(splitSentences(JOURNAL.fieldFallback).length >= 1, 'the paraphrase still splits if her words are ever removed');
});

test('her words turn into pictures in the order she writes them', () => {
    const cues = noteCues(HER_TEXT.full);
    assert.deepEqual(cues.map(c => c.cue), ['creature', 'sparkle', 'world', 'steppe', 'kelp', 'mystery', 'researcher']);
    const word = (cue) => cues.find(c => c.cue === cue).word;
    assert.equal(word('creature'), 'Sköldhästar');
    assert.equal(word('steppe'), 'stäpperna');
    assert.equal(word('kelp'), 'kelp-skogarna');
    assert.equal(word('mystery'), 'sköldpadda');
    assert.equal(word('researcher'), 'forskare');
    for (const c of cues) assert.equal(HER_TEXT.full.slice(c.start, c.at), c.word);
});

test('word wrap keeps every word whole, in order, within the line width', () => {
    const measure = (s) => s.length * 10;
    for (const width of [120, 200, 333, 900]) {
        const lines = wrapWords(HER_TEXT.full, width, measure);
        const rebuilt = lines.map(l => HER_TEXT.full.slice(l.start, l.end)).join(' ');
        assert.equal(rebuilt, HER_TEXT.full, 'nothing lost or reordered');
        for (const l of lines) {
            const text = HER_TEXT.full.slice(l.start, l.end);
            assert.ok(measure(text) <= width || !text.includes(' '), `"${text}" fits ${width}`);
            assert.notEqual(text[0], ' '); assert.notEqual(text.at(-1), ' ');
        }
    }
    assert.deepEqual(wrapWords('', 100, s => s.length), []);
});
