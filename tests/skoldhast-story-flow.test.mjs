import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';
import { createRobot } from './skoldhast-robot.mjs';
import { kelpFragment } from './skoldhast-kelp-route.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
function stage(flags, spawn) {
    const G = createGame(), hints = [], sayings = [];
    for (const flag of flags) G.flags.add(flag);
    G.goto('kelp', spawn);
    G.story = createStory(G, {
        ui: { say: async lines => sayings.push(lines), toast() {}, pulse() {}, report: async () => {} },
        guide: { hint: text => hints.push(text), think() {}, tip() {} },
        fx: async () => {}, save() {}
    });
    return { G, hints, sayings };
}
async function frames(G, seconds, input = () => ({})) {
    let busy = 0;
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
        G.step(input(i)); busy = Math.max(busy, G.busy); await tick();
    }
    return busy;
}

test('the cave reveal advances the story without sending an early swimmer back to the hills', async () => {
    const R = createRobot();
    R.G.helpLevel = 'guided';
    const flags = ['intro_done', 'b:k1_enter', 'b:k1_kelp_first', 'b:k1_stopwatch',
        'b:k1_ja', 'b:k1_mapcorner', 'klo_hidden', 'klo_ja', 'rule_demo', 'p2_open'];
    R.G.restore({ flags, checkpoint: 'kelp' });
    await R.swimTo(20.8, 3.4);
    await R.flag('ch1_end', {}, 60);
    await R.settle();
    assert.ok(R.has('ch2_open') && R.has('clue_fold') && R.has('clue_figure'));
    assert.equal(R.has('p1_inked'), false);
    assert.equal(R.has('p3_done'), false);
    assert.equal(R.story.objective(), 'p5', 'the new underwater route follows its reveal');
    assert.equal(R.log.filter(e => e.kind === 'report' && e.n === 1).length, 1);
});

test('lighting the vault explains the route while the fish and hidden shell continue through it', async () => {
    const flags = [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open', 'b:k2_note2', 'b:k2_vault_purpose'];
    const { G, hints, sayings } = stage(flags, { x: 23.4 * HL, y: 9 * HL, mode: 'swim' });
    const busy = await frames(G, 14, i => i ? {} : { hide: true });
    assert.equal(busy, 0, 'the payoff never pauses the current ride');
    assert.ok(G.has('p5_lit'));
    assert.ok(G.player.x > 27 * HL, 'the swimmer entered the illuminated vault');
    assert.ok(hints.includes(STORY.k2.vaultReveal[1]));
    assert.equal(sayings.length, 0);
});

for (const first of ['land', 'sea']) test(`the map story joins both pieces with ${first} first and a save between discoveries`, async () => {
    let R = createRobot();
    for (const flag of [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open', 'b:k2_note2',
        'p5_lit', 'b:k2_lit', 'p4_leap', 'b:k2_leap']) R.G.flags.add(flag);
    async function collect(which) {
        if (which === 'land') {
            R.G.goto('land', R.G.scenes.land.spots.landmark);
            await R.flag('mark_land', {}, 3);
        } else {
            R.G.goto('kelp', { x: 33.2 * HL, y: 9.2 * HL, mode: 'swim' });
            await kelpFragment(R);
        }
        await R.settle();
    }
    await collect(first);
    assert.equal(R.has('marks_both'), false);
    const firstLog = [...R.log], saved = R.G.serialize();
    R = createRobot(); R.G.restore(saved);
    await collect(first === 'land' ? 'sea' : 'land');
    await R.flag('ch2_end', {}, 30); await R.settle();
    const lines = [...firstLog, ...R.log].filter(e => e.kind === 'say').flatMap(e => e.lines.map(([, text]) => text));
    assert.ok(R.has('marks_both'));
    assert.equal(lines.filter(t => t === STORY.k2.bothHalves[1]).length, 1);
    assert.equal(lines.filter(t => t === STORY.k2.seaFound[1]).length, 1);
    assert.equal(lines.filter(t => t === STORY.k2.half[1]).length, first === 'sea' ? 1 : 0,
        'Klo never sends the player after a land piece already in the notebook');
    assert.equal(lines.filter(t => t === STORY.k2.halfSea[1]).length, first === 'land' ? 1 : 0,
        'Klo never sends the player after a sea piece already in the notebook');
    assert.equal(R.log.filter(e => e.kind === 'report' && e.n === 2).length, 1);
    assert.equal(R.story.objective(), 'toViken');
});

test('asking for hints only still introduces the cave purpose and the trapped fragment before solving', async () => {
    const R = createRobot();
    R.G.helpLevel = 'ask';
    R.G.restore({ flags: [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open', 'b:k2_note2'], checkpoint: 'trench' });
    R.G.goto('kelp', { x: 23.1 * HL, y: 8.4 * HL, mode: 'swim' });
    await R.settle();
    const lines = () => R.log.filter(e => e.kind === 'say').flatMap(e => e.lines.map(([, text]) => text));
    assert.ok(lines().includes(STORY.k2.vaultPurpose[0][1]));
    assert.equal(R.has('p5_lit'), false, 'learning the purpose does not solve the fish puzzle');
    R.G.flag('p5_lit');
    R.G.goto('kelp', { x: 33.2 * HL, y: 9.2 * HL, mode: 'swim' });
    await R.settle();
    assert.ok(lines().includes(STORY.k2.cornerPurpose[0][1]));
    assert.equal(R.has('mark_sea'), false, 'the fragment remains trapped until the kelp is pulled and the fold pressed');
    await kelpFragment(R); await R.settle();
    const freed = R.events.find(e => e.type === 'kelpFreed');
    const flat = R.events.find(e => e.type === 'flattened' && e.id === 'corner');
    const collected = R.events.find(e => e.type === 'mark' && e.id === 'mark_sea');
    assert.ok(freed && flat && collected && freed.t < flat.t && flat.t < collected.t, 'physical freeing, pressing and pickup are distinct ordered actions');
    assert.ok(lines().indexOf(STORY.k2.cornerFlat[1]) > lines().indexOf(STORY.k2.cornerPurpose[0][1]));
    assert.ok(lines().indexOf(STORY.k2.seaFound[1]) > lines().indexOf(STORY.k2.cornerFlat[1]),
        'the player sees the physical release before the fragment close-up');
});

test('an explorer can discover the fold over the roof, save it, repair the map and later light the cave', async () => {
    let R = createRobot();
    R.G.restore({ flags: [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open', 'b:k2_note2',
        'p1_inked', 'p3_t1', 'p3_t2', 'p3_t3', 'p3_done', 'b:k1_p3'], checkpoint: 'trench' });
    R.G.goto('kelp', { x: 23 * HL, y: 6 * HL, mode: 'swim' });
    await R.swimTo(30, 8, { max: 45 });
    await R.swimTo(33.2, 9.2); await R.settle();
    assert.equal(R.story.objective(), 'p6', 'finding the fold never sends an explorer back for an unrelated switch');
    await kelpFragment(R); await R.settle();
    assert.equal(R.has('p5_lit'), false);
    const saved = R.G.serialize(); R = createRobot(); R.G.restore(saved);
    assert.ok(R.has('p6_flat') && R.has('mark_sea'));
    assert.equal(R.has('p5_lit'), false);
    // Start the separate land approach, then earn the real leap and fragment.
    R.G.goto('land', { x: 30 * HL, y: -6.3 * HL, facing: -1 });
    await R.gallopPast(9); await R.flag('p4_leap', {}, 10); await R.settle();
    await R.walkTo(3.2); await R.flag('ch2_end', {}, 60); await R.settle();
    assert.ok(R.has('marks_both') && R.has('ch3_open'));
    assert.equal(R.has('p5_lit'), false, 'the repaired route requires the actual fragments');
    R.G.goto('kelp', { x: 23.4 * HL, y: 9 * HL, mode: 'swim' });
    await R.hide(); await R.flag('p5_lit', {}, 20); await R.settle();
    assert.equal(R.G.puz.school.state, 'lit', 'the optional cave still works after completing the map');
});

for (const checkpoint of ['trench', 'udden']) test(`a save during the sea fragment release resumes its discovery from ${checkpoint}`, async () => {
    const R = createRobot();
    const flags = [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open', 'b:k2_note2', 'p6_flat', 'mark_sea'];
    if (checkpoint === 'udden') flags.push('mark_land', 'p4_leap', 'b:k2_leap', 'b:k2_mark_land');
    R.G.restore({ flags, checkpoint });
    await R.settle();
    assert.ok(R.has('clue_mark_sea') && R.has('b:k2_mark_sea'), 'committed inventory gets its missing presentation');
    const lines = R.log.filter(e => e.kind === 'say').flatMap(e => e.lines.map(([, text]) => text));
    assert.equal(lines.filter(t => t === STORY.k2.seaFound[1]).length, 1);
    if (checkpoint === 'udden') {
        assert.ok(R.has('ch2_end'));
        assert.ok(lines.indexOf(STORY.k2.seaFound[1]) < lines.indexOf(STORY.k2.bothHalves[1]));
        assert.equal(R.log.some(e => e.kind === 'fx' && e.name === 'landFocus' && e.id === 'freed-map-fragment'), false, 'no underwater world effect replays over a land checkpoint');
    }
});

test('collecting the last piece waits for the visible map repair, and a save during assembly recovers it', async () => {
    let R = createRobot();
    R.G.restore({ flags: [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open', 'b:k2_note2',
        'p5_lit', 'b:k2_lit', 'p6_flat', 'mark_sea', 'b:k2_mark_sea', 'p4_leap', 'b:k2_leap'], checkpoint: 'udden' });
    R.G.goto('land', R.G.scenes.land.spots.landmark);
    await R.flag('mark_land', {}, 3);
    assert.equal(R.has('marks_both'), false, 'inventory alone does not open the current');
    await R.until(() => R.log.some(e => e.kind === 'fx' && e.name === 'mapAssemble' && e.variant === 'assembly'), {}, 12, 'map repair begins');
    assert.equal(R.has('marks_both'), false, 'the route stays closed while the pieces are joining');
    const saved = R.G.serialize();
    R = createRobot(); R.G.restore(saved);
    await R.flag('ch2_end', {}, 30); await R.settle();
    assert.ok(R.has('marks_both'), 'the recovered assembly opens the route');
    assert.equal(R.log.filter(e => e.kind === 'fx' && e.name === 'mapAssemble' && e.variant === 'assembly').length, 1);
    assert.equal(R.log.filter(e => e.kind === 'report' && e.n === 2).length, 1);
    R.G.goto('kelp', R.G.scenes.kelp.spots.fromLand);
    assert.ok(R.G.terrain.lanes.some(l => l.id === 'lane-out'), 'the repaired current is usable in the world');
});

test('an older save with the current open still finishes its unreported map discovery', async () => {
    const R = createRobot();
    R.G.restore({ flags: CODE_RESTORE[2].flags.filter(f => !['ch2_end', 'b:k2_end'].includes(f)), checkpoint: 'overlook' });
    assert.ok(R.has('marks_both'));
    await R.flag('ch2_end', {}, 30); await R.settle();
    assert.equal(R.log.filter(e => e.kind === 'report' && e.n === 2).length, 1);
    assert.equal(R.story.objective(), 'toViken');
});


test('an older chapter-one save retains its completed hills and follows the remaining map route', async () => {
    const R = createRobot();
    const oldLandFlags = ['b:k1_note', 'note1_read', 'teach_streck', 'p1_inked', 'b:k1_p1',
        'entrance_fluff', 'glimpse1', 'b:k1_glimpse', 'b:k1_branten', 'p3_t1', 'p3_t2', 'p3_t3',
        'p3_done', 'b:k1_p3', 'clue_note1', 'clue_wave_marks', 'clue_glimpse', 'exp_fart', 'exp_fart_logged', 'spangen_flag'];
    R.G.restore({ flags: [...CODE_RESTORE[1].flags, ...oldLandFlags], checkpoint: 'overlook' });
    await R.settle();
    assert.equal(R.story.objective(), 'p5');
    assert.ok(oldLandFlags.every(flag => R.has(flag)), 'previously earned discoveries survive');
    assert.equal(R.log.filter(e => e.kind === 'report' && e.n === 1).length, 0);
    await R.swimTo(12, 4.4); await R.swimTo(4, 2.6); await R.swimTo(-.4, 2.4);
    await R.until(() => R.G.sceneId === 'land', { x: -1 }, 10, 'return from an older completed cave');
    await R.settle();
    assert.equal(R.story.objective(), 'p4', 'the player is not asked to repeat completed ramps');
});
