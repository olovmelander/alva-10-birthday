import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));

for (const controlsInitiallyOn of [true, false]) {
    test(`the first map waits for its reader and restores controls initially ${controlsInitiallyOn ? 'on' : 'off'}`, async () => {
        const G = createGame(), phases = [], cards = [];
        for (const flag of ['intro_done', 'b:k1_enter', 'b:k1_stopwatch', 'klo_hidden', 'klo_ja', 'b:k1_ja']) G.flags.add(flag);
        G.goto('land', G.scenes.land.spots.kloBeach);
        let controlsOn = controlsInitiallyOn, attached = false, pose = 'absent', next = null;
        G.story = createStory(G, {
            ui: {
                controls: { classList: { contains: name => name === 'off' && !controlsOn } },
                showControls: on => { controlsOn = on; },
                async say(lines) {
                    for (const line of lines) {
                        cards.push({ line, attached, pose, controlsOn });
                        await new Promise(resolve => { next = resolve; });
                    }
                },
                toast() {}, pulse() {}
            },
            async fx(name, data) {
                assert.equal(name, 'foldDemo');
                assert.equal(controlsOn, false, 'game controls are hidden before the map arrives');
                attached = true;
                try {
                    await data.whileVisible(Object.fromEntries(['arrive', 'fold', 'unfold', 'depart'].map(phase => [phase, async () => {
                        assert.ok(G.busy, 'gameplay stays locked between the dialogue cards');
                        assert.equal(controlsOn, false);
                        phases.push(phase);
                        pose = phase;
                    }])));
                } finally { attached = false; }
            },
            save() {}
        });
        async function step(seconds = STEP) {
            for (let frame = 0; frame < Math.round(seconds / STEP); frame++) {
                G.step({ x: 1, hopHeld: true });
                await tick();
            }
        }
        async function advance() {
            assert.ok(next, 'a card is waiting for the reader');
            const resolve = next; next = null; resolve(); await tick();
        }

        await step();
        assert.equal(G.story.running(), true);
        assert.deepEqual(cards[0].line, STORY.k1.mapCorner[0]);
        await advance();
        assert.deepEqual(cards[1].line, STORY.k1.mapCorner[1]);
        assert.deepEqual(phases, ['arrive']);

        // Longer than the entire old automatic demonstration: no pose, card,
        // discovery flag or busy lock is allowed to advance by elapsed time.
        await step(9);
        assert.equal(cards.length, 2);
        assert.deepEqual(phases, ['arrive']);
        assert.equal(G.has('rule_demo'), false);
        assert.ok(G.busy);
        await advance();
        assert.deepEqual(cards[2].line, STORY.k1.mapCorner[2]);
        assert.deepEqual(phases, ['arrive']);
        await advance();
        assert.deepEqual(cards[3].line, STORY.k1.mapCorner[3]);
        assert.deepEqual(phases, ['arrive', 'fold']);
        await step(9);
        assert.equal(cards.length, 4);
        assert.equal(pose, 'fold', 'the folded beach remains visible until the reader continues');
        await advance();
        assert.deepEqual(cards[4].line, STORY.k1.mapCorner[4]);
        assert.deepEqual(phases, ['arrive', 'fold', 'unfold']);
        await advance();
        assert.deepEqual(cards[5].line, STORY.k1.mapCorner[5]);
        assert.equal(attached, true, 'the restored map and beach remain visible through the goal connection');
        assert.equal(G.has('rule_demo'), false);
        await advance();

        assert.deepEqual(phases, ['arrive', 'fold', 'unfold', 'depart']);
        assert.equal(attached, false);
        assert.equal(controlsOn, controlsInitiallyOn);
        assert.equal(G.actors.klo.pose, 'idle');
        assert.equal(G.busy, 0);
        assert.ok(G.has('rule_demo'));
        assert.ok(G.has('clue_map_corner'));
        assert.ok(cards.slice(1).every(card => card.attached && !card.controlsOn));
        assert.deepEqual(cards.slice(1).map(card => card.pose), ['arrive', 'arrive', 'fold', 'unfold', 'unfold']);
    });
}

function stageAtShell({ x = 105.35 * HL, facing = 1 } = {}) {
    const G = createGame(), cards = [], phases = [];
    for (const flag of ['intro_done', 'b:k1_enter', 'b:k1_stopwatch', 'klo_hidden', 'klo_ja', 'b:k1_ja']) G.flags.add(flag);
    G.goto('land', { x, y: -.4 * HL, mode: 'ground', facing });
    let next = null;
    G.story = createStory(G, {
        ui: {
            async say(lines) {
                for (const line of lines) {
                    cards.push(line);
                    await new Promise(resolve => { next = resolve; });
                }
            },
            toast() {}, pulse() {}
        },
        async fx(name, data) {
            assert.equal(name, 'foldDemo');
            await data.whileVisible(Object.fromEntries(['arrive', 'fold', 'unfold', 'depart'].map(phase => [phase, async () => { phases.push(phase); }])));
        },
        save() {}
    });
    Object.assign(G.actors.klo, G.scenes.land.spots.kloHole, { pose: 'idle', scene: 'land', visible: true });
    async function step() { G.step({}); await tick(); }
    async function until(predicate, message) {
        for (let i = 0; i < 600 && !predicate(); i++) await step();
        assert.ok(predicate(), message);
    }
    return { G, cards, phases, step, until, async advance() { assert.ok(next); const resolve = next; next = null; resolve(); await tick(); } };
}

for (const facing of [-1, 1]) test(`the first-map experiment clears an obscuring horse facing ${facing} with a real ground step`, async () => {
    const R = stageAtShell({ facing }), { G } = R, player = G.player;
    const marker = player.storyTestMarker = { keep: true }, startX = player.x;
    await R.step();
    assert.equal(player.x, startX, 'starting the story does not teleport the horse');
    assert.equal(R.cards.length, 0, 'the map introduction waits for both actors to settle');
    assert.equal(player.nudge.x, G.sceneDef.spots.kloHole.x);
    assert.ok(G.actors.klo.walk, 'Klo first walks out of the hole to his beach position');
    await R.until(() => player.x > startX + 30 && R.cards.length === 0, 'the horse visibly walks before the map is introduced');
    await R.until(() => R.cards.length > 0, 'both actors finish their short staging movement');
    assert.strictEqual(G.player, player);
    assert.strictEqual(player.storyTestMarker, marker, 'staging keeps unrelated player state');
    assert.ok(Math.abs(player.x - G.sceneDef.spots.kloHole.x) < 12);
    assert.equal(player.facing, -1, 'the horse looks back towards the raised shell');
    assert.equal(player.nudge, null);
    assert.equal(player.vx, 0);
    assert.equal(player.mode, 'ground');
    assert.equal(G.actors.klo.x, G.sceneDef.spots.kloBeach.x);
    assert.equal(G.actors.klo.walk, null);
    assert.deepEqual(R.cards[0], STORY.k1.mapCorner[0]);
    await R.advance();
    assert.deepEqual(R.phases, ['arrive']);
    assert.deepEqual(R.cards[1], STORY.k1.mapCorner[1], 'the shell comparison waits for the visible map');
});

test('a horse already clear of the shell keeps its position and facing', async () => {
    const R = stageAtShell({ x: 107.4 * HL, facing: 1 }), player = R.G.player, x = player.x;
    await R.until(() => R.cards.length > 0, 'Klo reaches his presentation spot');
    assert.equal(player.x, x);
    assert.equal(player.facing, 1);
    assert.equal(player.nudge, null);
});

test('leaving during staging clears only its owned step and never completes the abandoned map discovery', async () => {
    const R = stageAtShell(), { G } = R, oldPlayer = G.player;
    await R.step();
    assert.ok(oldPlayer.nudge);
    G.goto('land', { x: 108 * HL, y: -.4 * HL, mode: 'ground' });
    const replacement = G.player, replacementNudge = replacement.nudge = { x: 109 * HL, t: 3 };
    for (let i = 0; i < 20; i++) await R.step();
    assert.equal(oldPlayer.nudge, null);
    assert.strictEqual(replacement.nudge, replacementNudge, 'the abandoned beat cannot clear a replacement player’s movement');
    assert.equal(R.cards.length, 0);
    assert.equal(G.has('rule_demo'), false);
    assert.equal(G.has('b:k1_mapcorner'), false);
});
