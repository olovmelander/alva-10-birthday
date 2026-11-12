/*
 * Äventyr 3's words (docs/skoldhast/adventure-3.md, sections 7, 11, 12 and 17.1): the direction matches the lines
 * one to one, the boxes are short, every hint ladder has three steps, and nothing is said too early.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voiceScript, untag, directionFor, VOICES, PENDING } from '../scripts/skoldhast-voice.mjs';
import { STORY, TABLE, HINTS, GOALS, POINT, CHATTER, BALK, NAMES, WORDS } from '../skoldhast/adventures/adventure-3/content/sv.mjs';
import { DEFAULT, LINES } from '../skoldhast/adventures/adventure-3/content/regi.mjs';

const a3 = () => voiceScript({ pending: true }).filter(l => l.src.startsWith('a3 '));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const isPair = (v) => Array.isArray(v) && v.length === 2 && typeof v[1] === 'string' && (v[0] === 'caption' || v[0] in NAMES);

/** Every [who, text] of STORY and TABLE, with where it is. */
function dialogue() {
    const out = [];
    const walk = (v, at) => {
        if (isPair(v)) out.push({ at, who: v[0], text: v[1] });
        else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}.${i}`));
        else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${at}.${k}`);
    };
    walk(STORY, 'STORY');
    for (const [k, v] of Object.entries(TABLE)) out.push(Array.isArray(v) ? { at: `TABLE.${k}`, who: v[0], text: v[1] } : { at: `TABLE.${k}`, who: 'caption', text: v });
    return out;
}

test('Äventyr 3 waits to be recorded: its lines are in the voice script only when asked for', () => {
    assert.ok(PENDING.includes('a3'), 'Pappa: nothing of Äventyr 3 is recorded until he says it is finished');
    assert.equal(voiceScript().filter(l => l.src.startsWith('a3 ')).length, 0);
    const lines = a3();
    assert.ok(lines.length > 450, `about 520 clips are expected, got ${lines.length}`);
    for (const l of lines) assert.ok(l.voice in VOICES, `${l.src}: unknown voice ${l.voice}`);
    assert.ok(!lines.some(l => l.speaker === 'pip'), 'Pip is a sound, not a voice');
    // hints in both companions' voices, Nova's pointing words in hers, captions in the narrator's
    const voices = (text) => new Set(lines.filter(l => l.text === text).map(l => l.voice));
    assert.deepEqual([...voices(HINTS.m2[2])].sort(), ['klo', 'nova']);
    assert.deepEqual([...voices(POINT.up)], ['nova']);
    assert.deepEqual([...voices(STORY.launch[0][1])], ['narrator']);
    assert.deepEqual([...voices(TABLE.darker)], ['narrator']);
    assert.deepEqual([...voices(STORY.drawSelf)], ['horse']);
    assert.deepEqual([...voices(STORY.novaGallop[1])], ['nova']);
    assert.deepEqual([...voices(STORY.suddTalk[0])], ['sudd']);
    assert.deepEqual([...voices(CHATTER.novaAfter)], ['nova']);
    // what is read, not heard, is not in it
    assert.ok(!lines.some(l => l.text === WORDS.drawFin || l.text === GOALS.view));
});

test('the direction: every entry is exactly one line, and no line has two', () => {
    const lines = a3();
    const hits = new Map();
    for (const [voice, say] of LINES) {
        assert.match(say, /^\[[^\]]+\] /, `starts with its tag: ${say}`);
        for (const [, tag] of say.matchAll(/\[([^\]]*)\]/g)) {
            assert.match(tag, /^[a-z][a-z ,'-]*$/, `English audio tags, lower case: [${tag}]`);
            assert.ok(tag.split(/[ ,]+/).filter(Boolean).length <= 4, `two or three words: [${tag}]`);
        }
        const found = lines.filter(l => l.voice === voice && norm(l.text) === untag(say));
        assert.equal(found.length, 1, `${voice}: ${say}`);
        const key = found[0].key;
        assert.ok(!hits.has(key), `two directions for ${found[0].src}`);
        hits.set(key, say);
    }
    // every spoken story and table line has its own direction (thoughts, hints and remarks take the default); a line
    // Äventyr 1 or 2 already has, word for word in the same voice, is their clip ("Slut – men forskningen fortsätter.")
    const all = voiceScript({ pending: true });
    for (const d of dialogue()) {
        if (d.who === 'pip') continue;
        const line = all.find(l => norm(l.text) === norm(d.text) && l.voice === (d.who === 'caption' ? 'narrator' : d.who));
        assert.ok(line, `${d.at} is in the voice script`);
        if (!line.src.startsWith('a3 ')) continue;
        assert.ok(hits.has(line.key), `${d.at} has its direction`);
        assert.equal(directionFor(line).say, hits.get(line.key));
    }
    for (const who of ['horse', 'klo', 'nova', 'sudd', 'bjorn', 'komet', 'alva', 'mira', 'tukan', 'moln', 'narrator']) assert.ok(DEFAULT[who], `a default for ${who}`);
});

test('short boxes: about 90 characters, never over 100', () => {
    const texts = [...dialogue().map(d => [d.at, d.text])];
    const strings = (v, at) => typeof v === 'string' ? [[at, v]] : Array.isArray(v) && !isPair(v) ? v.flatMap((x, i) => strings(x, `${at}.${i}`)) : [];
    for (const [k, v] of Object.entries(STORY)) texts.push(...strings(v, `STORY.${k}`));
    for (const [k, v] of Object.entries(HINTS)) texts.push(...v.map((t, i) => [`HINTS.${k}.${i}`, t]));
    for (const [k, v] of Object.entries(BALK)) texts.push([`BALK.${k}`, v]);
    for (const [k, v] of Object.entries(POINT)) texts.push([`POINT.${k}`, v]);
    for (const [k, v] of Object.entries(GOALS)) texts.push([`GOALS.${k}`, typeof v === 'function' ? v(10, 10) : v]);
    texts.push(...CHATTER.nova.map(t => ['CHATTER.nova', t]), ...CHATTER.klo.map(t => ['CHATTER.klo', t]), ['CHATTER.novaAfter', CHATTER.novaAfter]);
    const long = texts.filter(([, t]) => t.length > 100).map(([at, t]) => `${at} (${t.length})`);
    assert.deepEqual(long, []);
    // a beat holds the controls for at most three boxes
    for (const [k, v] of Object.entries(STORY)) if (Array.isArray(v) && isPair(v[0]) && k !== 'rideRemarks') assert.ok(v.length <= 3, `STORY.${k}`);
});

test('every hint ladder has three steps', () => {
    for (const [k, v] of Object.entries(HINTS)) {
        if (k === 'pickup') continue; // a plain line, as in Äventyr 2
        assert.equal(v.length, 3, `HINTS.${k}`);
        for (const t of v) assert.ok(t && !/[{}<>]|\b[a-z]+[A-Z][a-zA-Z]*\b/.test(t), `no key names in help: ${t}`);
    }
});

test('nothing is said too early (section 7): no eraser before hypothesis 3, no crooked stars before Kometen', () => {
    // the help on pages 1–3 can be read in any order, before Kometen has said a word
    const early = ['m1', 'm2', 'm3', 'm4', 'm5', 'fin', 's1', 's2', 's3', 's4', 'r1', 'r2', 'r3', 'r4', 'r5', 'more', 'pickup'];
    const goals = ['breakfast', 'breakfastWhy', 'moon', 'moonWhy', 'view', 'viewWhy', 'rocket', 'rocketWhy', 'lights', 'lightsWhy'];
    const texts = [...early.flatMap(k => HINTS[k].map(t => [`HINTS.${k}`, t])),
        ...goals.map(k => [`GOALS.${k}`, typeof GOALS[k] === 'function' ? GOALS[k](3, 10) : GOALS[k]])];
    for (const [at, t] of texts) {
        assert.ok(!/sudd/i.test(t), `${at}: "${t}"`);
        assert.ok(!/\bsned/i.test(t), `${at}: "${t}"`);
    }
    // the beats and thoughts of pages 1–3 that can come before hypothesis 3 (the Moon, the fin, the stars up to Pip's
    // photograph, the ring up to the gap): no "sudd"; before Kometen's word, no crooked stars (the fin is the rocket's)
    const beforeHyp3 = ['arrive', 'arrive2', 'arrive3', 'shelfSeen', 'boxFalls', 'breakfast', 'count', 'hypothesis1', 'crater',
        'firstLight', 'firstLight2', 'beam', 'beamKick', 'beamUp', 'beamDone', 'night', 'night2', 'nightDark', 'nightLit', 'nightOut',
        'nightAngry', 'nightFace', 'nightDone', 'ledge', 'ledgeFloat', 'drop', 'ledgeDone', 'rival1', 'rival2', 'rival3', 'view0', 'view',
        'view2', 'view3', 'hypothesis2', 'fin', 'finDone', 'stjarnArrive', 'stjarnArrive2', 'wagon', 'wagonThin', 'wagonStar',
        'wagonDone', 'belt', 'beltWrong', 'beltOne', 'beltWrongNova', 'beltDone', 'bear', 'bear2', 'bearNose', 'bearWakes', 'bearGives',
        'bearStands', 'pip', 'pip2', 'orbitKick', 'orbit', 'pipDone', 'ringArrive', 'ringo', 'gravel', 'gravelSoon', 'gravelHit',
        'sling', 'sling2', 'slingBack', 'slingGo', 'slingDone', 'ice', 'iceWrong', 'iceMelts', 'comet', 'comet2', 'cometLane',
        'cometRest', 'gap', 'lightLine', 'novaGallop', 'rival1'];
    const said = (v) => typeof v === 'string' ? [v] : isPair(v) ? [v[1]] : Array.isArray(v) ? v.flatMap(said) : [];
    for (const k of beforeHyp3) {
        for (const t of said(STORY[k])) {
            assert.ok(!/sudd/i.test(t), `STORY.${k}: "${t}"`);
            if (k !== 'fin' && k !== 'finDone') assert.ok(!/\bsned/i.test(t), `STORY.${k}: "${t}"`);
        }
    }
    // the one allowed early word: Mira at the table
    assert.match(STORY.eraserGone[0][1], /suddet/);
});
