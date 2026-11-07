/*
 * Äventyr 2's research notebook (7 November): what story.notebook() and story.notes() hand the book, as the story goes.
 * Klo's notes never repeat and stop when there is no more; the hypotheses are stamped when the story proves them;
 * facts the moon made untrue are marked; the map names a page once the story has; the secrets fill in after the end.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot, HL } from './skoldhast-a2-robot.mjs';
import { HINTS, NOTEBOOK, NEXT_EGG } from '../skoldhast/adventures/adventure-2/content/sv.mjs';
import { SECRETS, MEASURES } from '../skoldhast/adventures/adventure-2/story.mjs';

function at(flags, scene, x, y = -0.6) {
    const R = createRobot();
    for (const f of flags) R.G.flags.add(f);
    R.G.goto(scene, { x: x * HL, y: y * HL, facing: -1 });
    R.story.start();
    return R;
}

test('Klo\'s notes in a puzzle: one more each time, all of them kept, and no button once the last is out', async () => {
    const R = at(['b:arrive', 'b:firstEgg', 'egg_e1', 'b:grove'], 'strand', 16.5);
    await R.settle(); await R.hold(0.3);
    assert.equal(R.story.activePuzzle(), 'p1');
    assert.deepEqual(R.story.notes(), { given: [], more: true }, 'nothing yet, and a hint to ask for');
    R.story.hint();
    assert.deepEqual(R.story.notes(), { given: HINTS.p1.slice(0, 1), more: true });
    R.story.hint(); R.story.hint();
    assert.deepEqual(R.story.notes(), { given: HINTS.p1, more: false }, 'all three, and no more to ask for');
    R.story.hint();
    assert.deepEqual(R.story.notes().given, HINTS.p1, 'asking again never adds the last one twice');
});

test('A plain "where is the next egg" note is given once, then the button goes', async () => {
    const R = at(['b:arrive', 'b:firstEgg', 'egg_e1', 'egg_e2', 'p1_fallen', 'b:grove', 'b:fallen'], 'strand', 27);
    await R.settle(); await R.hold(0.3);
    const n0 = R.story.notes();
    assert.equal(n0.given.length, 0); assert.equal(n0.more, true);
    const h = R.story.hint();
    assert.ok(h.text.startsWith(NEXT_EGG('').slice(0, 12)), h.text);
    assert.deepEqual(R.story.notes(), { given: [h.text], more: false });
});

test('After the story there are no hint notes; the secrets page fills in as they are found', async () => {
    const R = at(['b:arrive', 'b:firstEgg', 'cloud_met', 'eggs_in_nest', 'moon', 'alva_stars', 'hatched', 'ended', 'b:finale'], 'strand', 27);
    await R.settle();
    assert.equal(R.story.notes(), null);
    let nb = R.story.notebook();
    assert.equal(nb.ended, true); assert.equal(nb.hatched, true);
    assert.equal(nb.secrets.length, SECRETS.length);
    assert.equal(nb.secrets.filter(s => s.found).length, 0);
    for (const s of nb.secrets) { assert.ok(NOTEBOOK.secret[s.id], 'every secret has its line: ' + s.id); assert.ok(NOTEBOOK.secretWhere[s.page]); }
    R.G.flags.add('b:molnJoy'); R.G.flags.add('dyvel_shellball');
    nb = R.story.notebook();
    assert.deepEqual(nb.secrets.filter(s => s.found).map(s => s.id), ['molnJoy', 'dyvelShells']);
});

test('The hypotheses appear as Tukankrabban says them and are stamped as the story proves them', () => {
    const R = at(['b:arrive', 'b:firstEgg'], 'strand', 27);
    let h = R.story.notebook().hypotheses;
    assert.deepEqual(h.map(x => [x.said, x.confirmed]), [[true, false], [false, false], [false, false]]);
    R.G.flags.add('clue_darkStorm'); R.G.flags.add('storm_source');
    h = R.story.notebook().hypotheses;
    assert.deepEqual(h.map(x => [x.said, x.confirmed]), [[true, true], [true, false], [false, false]], 'one is proved from the crown');
    R.G.flags.add('b:medvind');
    assert.deepEqual(R.story.notebook().hypotheses[2], { said: true, confirmed: false });
    R.G.flags.add('gap_crossed'); R.G.flags.add('cloud_met');
    h = R.story.notebook().hypotheses;
    assert.ok(h.every(x => x.said && x.confirmed), 'all three stamped once the wind has carried them over and the cloud is met');
    assert.equal(R.story.notebook().answered, true);
});

test('The map names a page once the story has, and shows its eggs once visited', () => {
    const R = at(['b:arrive', 'b:firstEgg', 'visited_strand'], 'strand', 27);
    const by = () => Object.fromEntries(R.story.notebook().places.map(p => [p.id, p]));
    let P = by();
    assert.equal(P.strand.named, true); assert.equal(P.strand.here, true);
    assert.equal(P.skog.named, false); assert.equal(P.topp.named, false);
    R.G.flags.add('p2_bridge'); R.G.flags.add('storm_source');
    P = by();
    assert.equal(P.skog.named, true, 'Klo names Djupa skogen when the bridge is drawn');
    assert.equal(P.topp.named, true, 'Åsktoppen is named from the crown');
    assert.equal(P.topp.visited, false);
});

test('The facts the moon made untrue are the ones the notebook strikes out', () => {
    const R = at(['b:arrive', 'b:firstEgg', 'clue_moonRule', 'clue_noMoon', 'clue_darkStorm', 'clue_lightning', 'moon', 'cloud_met'], 'strand', 27);
    const nb = R.story.notebook();
    assert.equal(nb.moon, true);
    const ids = nb.clues.map(c => c.id);
    for (const id of Object.keys(NOTEBOOK.struck)) assert.ok(ids.includes(id), `${id} is listed, to be struck out with "${NOTEBOOK.struck[id]}"`);
    for (const id of Object.keys(NOTEBOOK.answered)) if (ids.includes(id)) assert.ok(NOTEBOOK.answered[id], id);
    assert.ok(!Object.keys(NOTEBOOK.struck).includes('moonRule'), 'what is still true is never struck out');
});

test('Häst eller sköldpadda?: Klo writes in what was done with the hooves and with the shell, as it happens', () => {
    for (const m of MEASURES) assert.ok(NOTEBOOK.measure[m.id], 'every measurement has its line: ' + m.id);
    assert.ok(MEASURES.filter(m => m.kind === 'horse').length >= 4 && MEASURES.filter(m => m.kind === 'turtle').length >= 4, 'both sides have room to win');
    const R = at(['b:arrive', 'b:firstEgg'], 'strand', 27);
    assert.deepEqual(R.story.notebook().measures, [], 'nothing measured yet');
    for (const f of ['p1_fallen', 'p2_bridge', 'cave_reached', 'b:love4']) R.G.flags.add(f);
    const got = R.story.notebook().measures;
    assert.deepEqual(got.map(m => m.id), ['drum', 'bridge', 'falls', 'heart']);
    assert.deepEqual(got.map(m => m.kind), ['horse', 'horse', 'turtle', 'other']);
});

test('Klo says a word as he writes his measurements: the first hästsak, the first sköldpaddssak, the leap, an even score', async () => {
    const { STORY } = await import('../skoldhast/adventures/adventure-2/content/sv.mjs');
    const R = at(['b:arrive', 'b:firstEgg'], 'strand', 27);
    await R.settle();
    const remarks = () => R.log.filter(l => l.remark).map(l => l.lines[0][1]);
    R.G.flag('p1_fallen'); await R.hold(2); await R.settle();
    assert.deepEqual(remarks(), [STORY.measure.firstHorse[1]], 'the first hästsak');
    R.G.flag('cave_reached'); await R.hold(2); await R.settle();
    assert.deepEqual(remarks().slice(1), [STORY.measure.firstTurtle[1]], 'the first sköldpaddssak (and it stands even: one line at a time)');
    R.G.flag('p2_bridge'); await R.hold(2); R.G.flag('p4_lit'); await R.hold(2); await R.settle();
    assert.ok(remarks().includes(STORY.measure.even[1]), 'two against two: it stands even');
    R.G.flag('k1_lit'); R.G.flag('coin_got'); await R.hold(2); await R.settle();
    assert.equal(remarks().filter(t => t === STORY.measure.even[1]).length, 1, 'said once');
    R.G.flag('b:leapDone'); await R.hold(2); await R.settle();
    assert.equal(remarks().at(-1), STORY.measure.leap[1], 'the leap over the ravine');
    assert.equal(R.G.busy, 0, 'none of it stops play');
});

test('After the story, the first talk with Klo gives his conclusion; before it, he says nothing of the kind', async () => {
    const { STORY } = await import('../skoldhast/adventures/adventure-2/content/sv.mjs');
    const R = at(['b:arrive', 'b:firstEgg', 'cloud_met', 'eggs_in_nest', 'moon', 'alva_stars', 'hatched', 'ended', 'b:finale'], 'strand', 27);
    await R.settle();
    R.G.emit('talk', { who: 'klo' }); await R.settle();
    for (const line of STORY.measureEnd) assert.ok(R.log.some(l => l.kind === 'say' && l.lines.some(([w, t]) => w === line[0] && t === line[1])), line[1]);
    const n = R.log.length;
    R.G.emit('talk', { who: 'klo' }); await R.settle();
    assert.ok(!R.log.slice(n).some(l => l.kind === 'say' && l.lines.some(([, t]) => t === STORY.measureEnd[1][1])), 'only once; then his usual chatter');
    const B = at(['b:arrive', 'b:firstEgg'], 'strand', 27);
    await B.settle(); B.G.emit('talk', { who: 'klo' }); await B.settle();
    assert.ok(!B.log.some(l => l.kind === 'say' && l.lines.some(([, t]) => t === STORY.measureEnd[1][1])));
});

test('Prata reaches both companions when they stand close: the nearer first, then the other, and back', async () => {
    const R = at(['b:arrive', 'b:firstEgg', 'egg_e1'], 'strand', 27);
    await R.settle();
    const { G } = R;
    // as they stand when the sköldhäst stops: Klo about one length behind, Tukankrabban nearly two
    Object.assign(G.actors.klo, { scene: 'strand', visible: true, x: G.player.x + 1.0 * HL, y: G.player.y, follow: false });
    Object.assign(G.actors.tukan, { scene: 'strand', visible: true, x: G.player.x + 1.7 * HL, y: G.player.y, follow: false });
    await R.hold(0.2);
    assert.equal(G.context?.who, 'klo', 'the nearer one first (Tukankrabban used to answer every time)');
    const talked = () => R.log.filter(l => l.kind === 'say' && !l.remark).map(l => l.lines[0][0]);
    await R.act(); await R.settle(); await R.hold(0.2);
    assert.equal(talked().at(-1), 'klo');
    assert.equal(G.context?.who, 'tukan', 'then the other');
    await R.act(); await R.settle(); await R.hold(0.2);
    assert.equal(talked().at(-1), 'tukan');
    assert.equal(G.context?.who, 'klo', 'and back');
    // with only one of them near, it is always that one
    G.actors.tukan.x = G.player.x + 6 * HL; await R.hold(0.2);
    assert.equal(G.context?.who, 'klo');
});
