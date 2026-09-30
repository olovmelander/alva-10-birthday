/*
 * Why Kartväktaren folded the page (docs/skoldhast/story-kartvaktaren.md): his
 * memory card shows the prologue's fold one picture per line, and the ending
 * turns on two proofs (the line in the water holds; the fold tore his map).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot } from './skoldhast-robot.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { KV_MEMORY, sampleKvMemory } from '../skoldhast/src/kv-memory.mjs';
import { openingCrease } from '../skoldhast/src/opening-fold.mjs';
import { sampleMapAssemble } from '../skoldhast/src/map-assemble.mjs';
import { STORY, JOURNAL } from '../skoldhast/src/content/sv.mjs';

const litFlags = [...CODE_RESTORE[2].flags, 'ch3_open', 'viken_arrived', 'b:k3_arrive',
    'shutter1', 'shutter2', 'shutter3', 'lamp_lit', 'b:k3_lamp', 'kv_met'];
const said = (R) => R.log.filter(e => e.kind === 'say').flatMap(e => e.lines.map(([, text]) => text));

test('the memory card shows one picture per line, and the splash stops only at the fold', () => {
    const first = sampleKvMemory(0, 2);
    assert.equal(first.labels, 1, 'his ruled LAND and HAV');
    assert.equal(first.line, 0); assert.equal(first.fold, 0);
    const second = sampleKvMemory(1, 0);
    assert.equal(second.labels, 1, 'an earlier picture stays complete');
    assert.equal(second.line, 0);
    assert.equal(sampleKvMemory(1, 3).line, 1, 'her line reaches out onto the white paper');
    assert.equal(sampleKvMemory(1, 3).fold, 0, 'nothing folds while the sea is still coming');
    for (let s = 0; s <= 3; s += .05) {
        const p = sampleKvMemory(2, s);
        assert.equal(p.frozen, p.fold >= .45, 'the splash freezes with the fold, never before');
    }
    assert.equal(sampleKvMemory(2, 3).fold, 1);
    const calm = sampleKvMemory(2, .2, { lessMotion: true });
    assert.ok(calm.fold === 0 || calm.fold === 1, 'reduced motion never rotates paper');
});

test("the memory's fold is the prologue's: through the end of her line, clear of her picture, taking the sea towards his tower", () => {
    const { width: W, height: H, picture: P, endpoint: E, tower, keeper } = KV_MEMORY;
    const c = openingCrease(W, H, E);
    const xAt = (y) => c.a[0] + (c.b[0] - c.a[0]) * (y / H);
    assert.ok(Math.abs(xAt(E[1]) - E[0]) < 1e-6, 'the crease crosses the last point of her line');
    assert.ok(c.a[0] >= P.x + P.w, 'her picture stays whole');
    // its islet (half-width 42 at the card's 1.4 scale) and its roof (106 above the base)
    assert.ok(tower.x - 42 > xAt(tower.y + 6) && tower.x - 14 > xAt(tower.y - 106), 'his tower stands in the corner that folds under');
    // he stands on the lighthouse's gallery as in the prologue (or on the islet by the pencil
    // stand-in), about 24–34 units tall, and folds away with it
    for (const at of [keeper, KV_MEMORY.keeperSketch])
        assert.ok(at.x - 9 > xAt(at.y) && at.x - 9 > xAt(at.y - 34), 'Kartväktaren is on the folding corner too');
    // the lighthouse drawing (about 150 units high, 48 wide at its base) stands in the corner too
    assert.ok(tower.x - 25 > xAt(tower.y) && tower.x - 18 > xAt(tower.y - 150), 'the lighthouse folds away whole');
});

test('the assembled map shows its tear following the fold', () => {
    assert.equal(sampleMapAssemble(.9).crease, 0);
    assert.equal(sampleMapAssemble(1.5).crease, 1, 'the crease is drawn once the pieces have joined');
});

test('Kartväktaren explains why before anything else, and the journal keeps it', async () => {
    const R = createRobot();
    R.G.restore({ flags: litFlags, checkpoint: 'pierEnd' });
    await R.flag('talk1', {}, 5);
    await R.settle();
    const lines = said(R);
    assert.deepEqual(lines.slice(0, 3), STORY.k3.talk1.map(([, text]) => text));
    assert.ok(STORY.k3.talk1.every(([who]) => who === 'kv'));
    assert.ok(R.has('clue_kv_why'));
    assert.match(JOURNAL.clueText.kv_why, /papper/);
    assert.ok(R.log.some(e => e.kind === 'fx' && e.name === 'kvMemory'));
});

test('the ending turns on two proofs: the line holds in the water, and his own fold tore his map', async () => {
    const R = createRobot();
    R.G.restore({ flags: [...litFlags, 'talk1', 'b:k3_talk1', 'talk2', 'talk_done', 'b:k3_line',
        'p8_land', 'p8_s1', 'p8_s2', 'p8_s3', 'p8_sea'], checkpoint: 'lineWindow' });
    await R.until(() => R.log.some(e => e.kind === 'fx' && e.name === 'unfold'), {}, 30, 'the unfold');
    const texts = said(R), at = (line) => texts.indexOf(line[1]);
    const order = [STORY.k3.lastStroke, STORY.k3.proof, STORY.k3.mapBack, STORY.k3.sorry[0], STORY.k3.sorry[1]].map(at);
    assert.ok(order.every(i => i >= 0), 'every line of the resolution is spoken');
    assert.deepEqual([...order].sort((a, b) => a - b), order, 'in this order');
    const fx = R.log.filter(e => e.kind === 'fx').map(e => e.name);
    assert.ok(fx.indexOf('mapAssemble') >= 0 && fx.indexOf('mapAssemble') < fx.indexOf('unfold'), 'his map is whole again before he unfolds the sea');
    assert.ok(R.has('p8_done'));
});
