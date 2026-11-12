/*
 * Äventyr 1 and 2's direction (docs/skoldhast/voices.md, design section 17.2): every line is recorded acted, with
 * the tags in `regi.mjs` beside each adventure's `sv.mjs`. Like Äventyr 3's (tests/skoldhast-a3-words.test.mjs):
 * every entry is exactly one line, no line has two, the tags are short English audio tags, and every line of
 * dialogue (a [speaker, text] pair in STORY or TABLE, the table's captions, Klo's jokes and his conversation, Alva's
 * opening notes, the chatter) has its own entry. Hints, thoughts and refusals take their voice's default.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { voiceScript, untag, directionFor, directionChanged, readRegi, DIRECTION } from '../scripts/skoldhast-voice.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SV = {
    a1: await import(pathToFileURL(path.join(root, 'skoldhast/src/content/sv.mjs')).href),
    a2: await import(pathToFileURL(path.join(root, 'skoldhast/adventures/adventure-2/content/sv.mjs')).href)
};
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const isPair = (v) => Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string' && /^[a-z]{2,7}$/.test(v[0]);
/** Every [speaker, text] pair under a value. */
function pairs(v, at, out = []) {
    if (isPair(v)) out.push({ who: v[0], text: v[1], at });
    else if (Array.isArray(v)) v.forEach((x, i) => pairs(x, `${at}.${i}`, out));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) pairs(x, `${at}.${k}`, out);
    return out;
}

for (const adv of ['a1', 'a2']) {
    test(`${adv === 'a1' ? 'Äventyr 1' : 'Äventyr 2'}: every entry of the direction is exactly one line, and every line of dialogue has one`, (t) => {
        const d = DIRECTION[adv];
        if (!d) { t.skip('no regi.mjs yet'); return; }
        const all = voiceScript({ pending: true });
        const lines = all.filter(l => l.src.startsWith(adv + ' '));
        const hits = new Map();
        for (const [voice, say] of d.LINES) {
            assert.match(say, /^\[[^\]]+\] /, `starts with its tag: ${say}`);
            for (const [, tag] of say.matchAll(/\[([^\]]*)\]/g)) {
                assert.match(tag, /^[a-z][a-z ,'-]*$/, `English audio tags, lower case: [${tag}]`);
                assert.ok(tag.split(/[ ,]+/).filter(Boolean).length <= 4, `two or three words: [${tag}]`);
            }
            const found = lines.filter(l => l.voice === voice && norm(l.text) === untag(say));
            assert.equal(found.length, 1, `exactly one line for ${voice}: ${say}`);
            assert.ok(!hits.has(found[0].key), `two directions for ${found[0].src}`);
            hits.set(found[0].key, say);
        }
        // the lines of dialogue that must have their own direction
        const own = lines.filter(l => /^a1 (KLO_JOKES|KLO_COMPANION|HER_TEXT)|^a2 (TABLE|CHATTER)/.test(l.src));
        const sv = SV[adv];
        for (const p of [...pairs(sv.STORY, 'STORY'), ...pairs(sv.TABLE || {}, 'TABLE')]) {
            const voice = p.who === 'caption' ? 'narrator' : p.who;
            const line = all.find(l => l.voice === voice && norm(l.text) === norm(p.text));
            if (line && line.src.startsWith(adv + ' ')) own.push(line);
        }
        for (const l of own) assert.ok(hits.has(l.key), `${l.src} has its own direction: ${l.voice}: ${l.text}`);
        for (const l of lines) assert.equal(directionFor(l).directed, true, `${l.src} is directed`);
        for (const v of new Set(lines.map(l => l.voice))) assert.ok(d.DEFAULT[v], `a default tag for ${v}`);
    });
}

test('every clip was recorded with the direction its line has now (skoldhast/voice/regi.json)', () => {
    const regi = readRegi();
    const stale = voiceScript().filter(l => directionChanged(l, regi));
    assert.equal(stale.length, 0, `record again with --changed: ${stale.slice(0, 5).map(l => `${l.src} (${l.voice})`).join(', ')}`);
    const keys = new Set(voiceScript({ pending: true }).map(l => l.key));
    for (const k of Object.keys(regi)) assert.ok(keys.has(k), `regi.json has a line no adventure says: ${k}`);
});
