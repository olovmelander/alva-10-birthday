import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';
import { createRobot } from './skoldhast-robot.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
const clamp = v => Math.min(1, Math.max(-1, v));
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

test('visiting the fold before the wave marks gives a calm reminder and never seizes swimming control', async () => {
    const flags = ['intro_done', 'b:k1_enter', 'b:k1_kelp_first', 'b:k1_stopwatch',
        'klo_hidden', 'klo_ja', 'rule_demo', 'p1_inked', 'p2_open'];
    const { G, hints, sayings } = stage(flags, { x: 20.8 * HL, y: 3.4 * HL, mode: 'swim' });
    const busy = await frames(G, 23, () => ({
        x: clamp((20.8 * HL - G.player.x) / 100),
        y: clamp((3.4 * HL - G.player.y) / 100)
    }));
    assert.equal(busy, 0, 'a return-route reminder never locks the swimmer');
    assert.equal(hints.filter(t => t === STORY.k1.waitWaves[1]).length, 2, 'one reminder per cooldown');
    assert.equal(sayings.length, 0, 'no blocking conversation replaces play');
    assert.equal(G.has('ch1_end'), false, 'the actual discovery still needs its land evidence');
    const x = G.player.x;
    await frames(G, 1, () => ({ x: -1 }));
    assert.ok(G.player.x < x - HL, 'the player can leave for the beach immediately');
});

test('lighting the vault explains the route while the fish and hidden shell continue through it', async () => {
    const flags = [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open', 'b:k2_note2'];
    const { G, hints, sayings } = stage(flags, { x: 23.4 * HL, y: 9 * HL, mode: 'swim' });
    const busy = await frames(G, 14, i => i ? {} : { hide: true });
    assert.equal(busy, 0, 'the payoff never pauses the current ride');
    assert.ok(G.has('p5_lit'));
    assert.ok(G.player.x > 27 * HL, 'the swimmer entered the illuminated vault');
    assert.ok(hints.includes(STORY.k2.lanterns[1]));
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
            await R.hide(); await R.flag('mark_sea', {}, 25);
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
