import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { contextAction, countPencils } from '../skoldhast/src/puzzles.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { GOALS, HINTS } from '../skoldhast/src/content/sv.mjs';

function beach(x = 105.35) {
    const G = createGame();
    G.flags.add('intro_done');
    G.goto('land', { x: x * HL, y: -.4 * HL, facing: 1 });
    return G;
}
const hold = (G, sec, inp = {}) => { for (let i = 0; i < Math.round(sec / STEP); i++) G.step(inp); };

test('the shell tune remains discoverable after drying; repeated presses do not stack shakes', () => {
    const G = beach(), events = [];
    G.on('*', (type, e) => events.push({ type, ...e }));
    assert.equal(G.player.wet, 0);
    for (const x of [105.35, 106.35, 107.35]) {
        // Positions stage this isolated puzzle; the browser journey walks here.
        G.goto('land', { x: x * HL, y: -.4 * HL });
        G.player.wet = 0;
        G.step({});
        assert.equal(G.context?.id, 'skaka');
        G.step({ act: true });
        const shakes = events.filter(e => e.type === 'shake').length;
        for (let i = 0; i < 24; i++) G.step({ act: true });
        assert.equal(events.filter(e => e.type === 'shake').length, shakes, 'one shake while it is already shaking');
        assert.equal(G.context?.id, 'skaka', 'label stays stable throughout the animation');
        hold(G, 1);
    }
    assert.ok(G.flags.has('shells_tune'));
    assert.equal(events.filter(e => e.type === 'shellTune').length, 1);
    assert.equal(G.context?.id, undefined, 'a dry coat offers Hoppa after the completed tune');
});

test('nearby actions stay stable across small speed changes without enabling them at a gallop', () => {
    const G = beach();
    G.player.wet = 1;
    G.player.vx = 35;
    G.context = contextAction(G);
    assert.equal(G.context?.id, 'skaka');
    G.player.vx = 45;
    assert.equal(contextAction(G)?.id, 'skaka');
    G.player.vx = 1000;
    assert.equal(contextAction(G), null);
    G.player.vx = 0; G.player.hidden = true;
    assert.equal(contextAction(G), null, 'hidden shells cannot shake');
});

test('Signe does not hide the unfinished shell tune, and can still be spoken to up close', () => {
    const G = beach(106.35);
    G.storyActions = () => [{ id: 'race', label: 'Prata', dist: Math.abs(G.player.x / HL - 106.9), run() {} }];
    assert.equal(contextAction(G)?.id, 'skaka', 'the nearby unfinished shell wins');
    G.player.x = 106.9 * HL;
    assert.equal(contextAction(G)?.id, 'race', 'standing beside Signe offers her race');
});

test('the grey bucket can be coloured even when Signe stands beside it', () => {
    const G = beach(106.9);
    G.flags.add('penna_p-bucket');
    G.storyActions = () => [{ id: 'race', label: 'Prata', dist: 0, run() {} }];
    const color = contextAction(G);
    assert.equal(color?.id, 'farglagg');
    color.run();
    assert.ok(G.flags.has('color_p-bucket'));
    assert.equal(contextAction(G)?.id, 'race');
});

test('a wet coat does not replace Hoppa beneath an uncollected hoppställe', () => {
    const G = beach(94.55);
    G.player.wet = 1;
    assert.equal(contextAction(G), null, 'Hoppa stays available under the pencil');
    G.step({ act: true });
    hold(G, 1.5);
    assert.ok(G.flags.has('hopp_hs-94'));
    assert.ok(G.flags.has('penna_p-kite'));
});

test('Spången note order is identical across display schedules and silent while standing still', () => {
    const sequences = [];
    for (const fps of [30, 60, 120, 144]) {
        const G = beach(91), notes = [];
        G.on('plankNote', e => notes.push(e.note));
        let acc = 0;
        for (let frame = 0; frame < fps * 4; frame++) {
            acc += 1 / fps;
            while (acc + 1e-10 >= STEP) { G.step({ x: -.4 }); acc -= STEP; }
        }
        hold(G, 1);
        const n = notes.length;
        hold(G, 2);
        assert.equal(notes.length, n, 'resting on a board does not replay its note');
        assert.ok(n >= 12, 'walking across the planks makes a melody');
        sequences.push(notes);
    }
    for (const seq of sequences.slice(1)) assert.deepEqual(seq, sequences[0]);
});

test('a pencil colours its own prop once and stays recorded after leaving the scene', () => {
    const G = beach(86.4);
    G.step({});
    assert.ok(G.flags.has('penna_p-hut'));
    assert.equal(countPencils(G), 1);
    G.goto('land', { x: 81.6 * HL, y: -.63 * HL });
    G.step({});
    assert.equal(G.context?.id, 'farglagg');
    const colors = [];
    G.on('colorin', e => colors.push(e));
    G.step({ act: true });
    G.step({});
    assert.ok(G.flags.has('color_p-hut'));
    assert.notEqual(G.context?.id, 'farglagg');
    assert.equal(colors.length, 1);
    G.goto('kelp', 'start');
    G.goto('land', { x: 86.4 * HL, y: -.92 * HL });
    G.step({});
    assert.equal(countPencils(G), 1);
});

test('free-play guidance celebrates the complete collection and keeps Signe as an unfinished goal', () => {
    const G = beach(), hints = [];
    const story = createStory(G, { ui: {}, guide: { hint: text => hints.push(text) } });
    G.flags.add('ended');
    assert.equal(story.goal(), GOALS.free);
    const pencils = Object.values(G.scenes).flatMap(sc => sc.pencils || []);
    for (const pc of pencils.slice(0, -1)) G.flags.add('penna_' + pc.id);
    assert.equal(story.objective(), 'free', '4/5 still asks for pencils');
    G.flags.add('penna_' + pencils.at(-1).id); G.emit('pickup', {});
    assert.equal(story.objective(), 'freeComplete');
    assert.equal(story.goal(), GOALS.freeComplete);
    assert.equal(hints.at(-1), HINTS.freeComplete.note, 'a stale search hint is replaced at pickup');
    G.flags.add('signe_met');
    assert.equal(story.objective(), 'signe');
    G.flags.add('signe_race');
    assert.equal(story.objective(), 'freeComplete');
});
