import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';
import { createRobot } from './skoldhast-robot.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
const chapter2 = [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open', 'b:k2_note2', 'p4_leap', 'b:k2_leap', 'p5_lit', 'b:k2_lit'];
const guardian = [...CODE_RESTORE[2].flags, 'ch3_open', 'viken_arrived', 'b:k3_arrive', 'shutter1', 'shutter2', 'shutter3', 'lamp_lit', 'b:k3_lamp', 'kv_met', 'talk1', 'b:k3_talk1'];

function reader(flags, checkpoint = 'udden') {
    const G = createGame(), cards = [], effects = [], motions = [];
    G.restore({ flags, checkpoint });
    let active = null, controlsOn = true, cardDone = null, motionDone = null;
    G.story = createStory(G, {
        ui: {
            controls: { classList: { contains: name => name === 'off' && !controlsOn } },
            showControls: on => { controlsOn = on; },
            async say(lines) {
                for (const line of lines) {
                    cards.push({ line, phase: active?.phase, variant: active?.variant, controlsOn, routeOpen: G.has('marks_both') });
                    await new Promise(resolve => { cardDone = resolve; });
                }
            },
            toast() {}, pulse() {}, report: async () => {}
        },
        async fx(name, data) {
            if (name !== 'mapAssemble') { await data.whileVisible?.(); return; }
            effects.push({ variant: data.variant, fragment: data.fragment, focus: data.focus });
            active = { ...effects.at(-1), phase: 'attached' };
            const demo = Object.fromEntries(['arrive', 'join', 'reveal', 'depart'].map(phase => [phase, async () => {
                assert.ok(G.busy, 'the story owns input throughout map motion');
                assert.equal(controlsOn, false);
                motions.push(phase); active.phase = phase + '-moving';
                await new Promise(resolve => { motionDone = resolve; });
                active.phase = { arrive: 'observe', join: 'joined', reveal: 'revealed', depart: 'gone' }[phase];
            }]));
            try { await data.whileVisible(demo); }
            finally { active = null; }
        },
        save() {}
    });
    async function step(seconds = STEP) {
        for (let i = 0; i < Math.round(seconds / STEP); i++) { G.step({}); await tick(); }
    }
    async function until(predicate) {
        for (let i = 0; i < 600 && !predicate(); i++) await step();
        assert.ok(predicate(), 'the requested story stage starts');
    }
    return { G, cards, effects, motions, step, until, get active() { return active; }, get controlsOn() { return controlsOn; },
        async card() { assert.ok(cardDone); const done = cardDone; cardDone = null; done(); await tick(); },
        async motion() { assert.ok(motionDone); const done = motionDone; motionDone = null; done(); await tick(); }
    };
}

test('the repaired route stays closed until its visible reveal and every assembly observation waits for the reader', async () => {
    const R = reader([...chapter2, 'mark_land', 'mark_sea', 'b:k2_mark_land', 'b:k2_mark_sea']);
    await R.step();
    assert.deepEqual(R.effects, [{ variant: 'assembly', fragment: undefined, focus: 'route' }]);
    assert.equal(R.cards.length, 0, 'the actual pieces arrive before the explanation');
    assert.equal(R.G.has('marks_both'), false);
    await R.motion();
    assert.deepEqual(R.cards.at(-1).line, STORY.k2.fitPieces);
    await R.step(12);
    assert.deepEqual(R.motions, ['arrive'], 'a slow reader cannot miss the separated pieces');
    await R.card();
    assert.equal(R.active.phase, 'join-moving');
    assert.equal(R.G.has('marks_both'), false);
    await R.motion();
    assert.deepEqual(R.cards.at(-1).line, STORY.k2.torn);
    assert.equal(R.cards.at(-1).phase, 'joined');
    await R.step(12);
    assert.equal(R.active.phase, 'joined');
    assert.equal(R.G.has('marks_both'), false);
    await R.card();
    assert.equal(R.active.phase, 'reveal-moving');
    assert.equal(R.G.has('marks_both'), false, 'joining inventory does not open the current before the route is drawn');
    await R.motion();
    assert.equal(R.G.has('marks_both'), true);
    assert.deepEqual(R.cards.at(-1).line, STORY.k2.bothHalves);
    assert.equal(R.cards.at(-1).phase, 'revealed');
    await R.step(12);
    assert.equal(R.active.phase, 'revealed');
    assert.ok(R.cards.every(card => card.variant === 'assembly' && !card.controlsOn));
    await R.card(); await R.motion();
    assert.equal(R.active, null);
    assert.deepEqual(R.motions, ['arrive', 'join', 'reveal', 'depart']);
});

for (const landFoundEarly of [false, true]) test(`the chapter-two plan explains only the missing pieces with early land discovery ${landFoundEarly}`, async () => {
    const R = reader([...chapter2.filter(flag => flag !== 'b:k2_open'), ...(landFoundEarly ? ['mark_land', 'b:k2_mark_land'] : [])]);
    await R.until(() => R.effects.length > 0);
    assert.equal(R.effects[0].variant, 'search');
    assert.equal(R.effects[0].fragment, undefined, 'a plan does not present uncollected pieces as discoveries');
    await R.motion();
    for (const expected of landFoundEarly ? STORY.k2.openWithLand : STORY.k2.open) {
        assert.deepEqual(R.cards.at(-1).line, expected);
        assert.equal(R.cards.at(-1).phase, 'observe');
        await R.card();
    }
    await R.motion();
    assert.deepEqual(R.motions, ['arrive', 'depart']);
    assert.equal(R.controlsOn, true);
});

for (const fragment of ['land', 'sea']) test(`the newly found ${fragment} fragment stays visible while Klo identifies it and the missing piece`, async () => {
    const R = reader([...chapter2, `mark_${fragment}`], fragment === 'land' ? 'udden' : 'trench');
    R.G.emit('mark', { id: `mark_${fragment}` });
    await R.step();
    await R.until(() => R.effects.length > 0);
    const firstMapCard = R.cards.length;
    assert.equal(R.effects[0].variant, 'fragment');
    assert.equal(R.effects[0].fragment, fragment, 'only the actual discovery is presented');
    await R.motion();
    if (fragment === 'sea') {
        assert.deepEqual(R.cards.at(-1).line, STORY.k2.cornerFlat, 'the collected piece is acknowledged inside its map close-up');
        assert.equal(R.cards.at(-1).variant, 'fragment');
        await R.card();
    }
    assert.deepEqual(R.cards.at(-1).line, fragment === 'land' ? STORY.k2.landFound : STORY.k2.seaFound);
    await R.card();
    assert.deepEqual(R.cards.at(-1).line, fragment === 'land' ? STORY.k2.halfSea : STORY.k2.half);
    await R.step(12);
    assert.deepEqual(R.motions, ['arrive']);
    assert.equal(R.G.has('marks_both'), false);
    assert.ok(R.cards.slice(firstMapCard).every(card => card.variant === 'fragment' && card.phase === 'observe' && !card.controlsOn));
    await R.card(); await R.motion();
    assert.equal(R.active, null);
    assert.deepEqual(R.motions, ['arrive', 'depart']);
});

test('the guardian first shows his restrictive diagram, then holds the proposed shore through both replies', async () => {
    const R = reader(guardian, 'pierEnd');
    R.G.goto('viken', { x: 22 * HL, y: -.62 * HL, mode: 'ground' });
    const action = R.G.story.actions().find(action => action.id === 'talk2');
    assert.ok(action); action.run(); await tick();
    assert.equal(R.effects.at(-1).variant, 'guardian');
    await R.motion();
    assert.deepEqual(R.cards.at(-1).line, STORY.k3.talk2[0]);
    assert.equal(R.cards.at(-1).phase, 'observe');
    await R.card();
    assert.deepEqual(R.cards.at(-1).line, STORY.k3.talk2[1]);
    assert.equal(R.active.phase, 'observe', 'the missing place is still visible while the horse answers');
    await R.card();
    assert.equal(R.active.phase, 'reveal-moving');
    await R.motion();
    assert.deepEqual(R.cards.at(-1).line, STORY.k3.talk2[2]);
    await R.step(12);
    assert.equal(R.active.phase, 'revealed');
    assert.equal(R.G.has('talk2'), false, 'the diagram cannot finish itself while its answer is being read');
    await R.card(); await R.motion();
    assert.equal(R.G.has('talk2'), true);
    assert.equal(R.controlsOn, true);
    const next = R.G.story.actions().find(action => action.id === 'talk3');
    assert.ok(next); next.run(); await tick();
    await R.motion();
    assert.equal(R.active.phase, 'reveal-moving');
    await R.motion();
    for (const expected of STORY.k3.talk3) {
        assert.deepEqual(R.cards.at(-1).line, expected);
        assert.equal(R.cards.at(-1).phase, 'revealed');
        await R.card();
    }
    await R.motion();
    assert.equal(R.G.has('talk_done'), true);
    assert.equal(R.controlsOn, true);
});

test('returning the map shows the repaired evidence without assembling it again, through the apology', async () => {
    const R = createRobot();
    R.G.restore({ flags: [...guardian, 'talk2', 'talk_done', 'b:k3_line', 'p8_land', 'p8_s1', 'p8_s2', 'p8_s3', 'p8_sea'], checkpoint: 'lineWindow' });
    await R.until(() => R.log.some(event => event.kind === 'fx' && event.name === 'unfold'), {}, 30, 'the final unfolding');
    const start = R.log.findIndex(event => event.kind === 'fx' && event.name === 'mapAssemble');
    assert.ok(start >= 0);
    assert.equal(R.log[start].variant, 'inspect');
    assert.equal(R.log[start].focus, 'crease');
    const end = R.log.findIndex((event, index) => index > start && event.kind === 'fxPhase' && event.name === 'mapAssemble' && event.phase === 'depart');
    const onMap = R.log.slice(start, end);
    assert.deepEqual(onMap.filter(event => event.kind === 'fxPhase').map(event => event.phase), ['arrive', 'reveal']);
    assert.deepEqual(onMap.filter(event => event.kind === 'say').flatMap(event => event.lines), [STORY.k3.mapBack, STORY.k3.sorry[0]]);
    assert.ok(R.log.slice(end).some(event => event.kind === 'say' && event.lines.some(line => line[1] === STORY.k3.sorry[1][1])));
});
