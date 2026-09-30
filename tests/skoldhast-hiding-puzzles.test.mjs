import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { p8Progress } from '../skoldhast/src/puzzles.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';

const step = (G, seconds, input = {}) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) G.step(i ? { ...input, hide: false, act: false } : input);
};
function swimming(scene, x, y, flags = []) {
    const G = createGame();
    for (const f of ['intro_done', 'ch2_open', 'ch3_open', 'viken_arrived', ...flags]) G.flags.add(f);
    G.goto(scene, { x: x * HL, y: y * HL, facing: 1, mode: 'swim' });
    return G;
}
const lineFlags = ['talk_done', 'p8_s1', 'p8_s2', 'p8_s3', 'p8_land'];

test('P2 commits each matching difference independently in either order, including a save between them', () => {
    for (const plankFirst of [false, true]) {
        const G = createGame(); G.flags.add('p2_seen');
        if (plankFirst) G.flag('p2_plank');
        G.goto('land', { x: 99.6 * HL, y: -0.1 * HL, facing: 1 });
        for (let i = 0; i < 4; i++) G.step({ act: true });
        assert.equal(G.puz.stone, 4);
        assert.ok(G.has('p2_stone'));
        assert.equal(G.has('p2_open'), plankFirst);
        const saved = G.serialize();
        G.goto('kelp', 'fromLand');
        assert.equal(G.puz.stone, 4, 'matching stone survives leaving its scene');
        const H = createGame(); H.restore(saved);
        assert.equal(H.puz.stone, 4, 'matching stone survives save/restore');
        H.goto('land', { x: 102.4 * HL, y: -0.1 * HL, facing: -1 });
        H.step({});
        assert.notEqual(H.context?.id, 'knuffa', 'a latched stone cannot be pushed away again');
        H.flag('p2_plank'); H.step({});
        assert.ok(H.has('p2_open'));
    }
});

test('unmatched stone and hiding transients reset while saved discoveries remain', () => {
    const G = createGame(); G.flags.add('p2_seen');
    G.goto('land', { x: 99.6 * HL, y: -0.1 * HL, facing: 1 });
    G.step({ act: true }); G.step({ act: true });
    assert.equal(G.puz.stone, 2);
    G.puz.deepest = 7; G.puz.shells.a = true;
    const saved = G.serialize();
    G.puz.pools.pool = { ripple: 0, still: true };
    G.puz.school = { state: 'follow', x: 10, y: 20, t: 1.1 };
    G.puz.plates.plate = 1;
    G.restore(saved);
    assert.equal(G.puz.stone, 0);
    assert.deepEqual(G.puz.pools, {});
    assert.equal(G.puz.school.state, 'home');
    assert.equal(G.puz.school.t, 0);
    assert.deepEqual(G.puz.plates, {});
    assert.equal(G.puz.deepest, 7);
    assert.equal(G.puz.shells.a, true);
});

test('P5 opens collision and its next current at the same commit, without waiting for dialogue', () => {
    for (const [x, y] of [[22.3, 7.85], [22.75, 7.85], [23.4, 9]]) {
        const G = swimming('kelp', x, y);
        step(G, 14, { hide: true });
        assert.ok(G.has('p5_lit'));
        assert.ok(G.player.x > 27 * HL, 'the school and shell enter the illuminated vault');
        assert.ok(!G.terrain.edges.some(e => e.id === 'vault-dark'));
    }
    const G = swimming('kelp', 23.9, 11.3);
    step(G, 3, { hide: true });
    assert.ok(G.player.anchored, 'the neighbouring kelp bed intentionally holds a shell');
    assert.equal(G.has('p5_lit'), false, 'hiding in a bed does not complete the drifting puzzle');
    G.step({ hide: true });
    const x = G.player.x; step(G, 2, { x: -1, y: -1 });
    assert.ok(!G.player.hidden && G.player.x < x - HL, 'emerging always gives swimming control back');
});

test('the P7 plate accepts ordinary hiding approaches and allows emergence', () => {
    for (const x of [13.1, 14.2, 15.5]) {
        const G = swimming('viken', x, 6);
        step(G, 10, { hide: true });
        assert.ok(G.has('shutter2'));
        G.step({ hide: true }); const y = G.player.y; step(G, 1, { y: -1 });
        assert.ok(G.player.y < y - HL, 'emerging leaves the latched plate freely');
    }
});

test('P8 arrives once, waits calmly for drawing, and can still emerge and rejoin', () => {
    const G = swimming('viken', 25.8, 0.7, lineFlags);
    let arrivals = 0; G.on('windowReached', () => arrivals++);
    step(G, 5, { hide: true });
    assert.equal(arrivals, 1);
    assert.ok(G.has('p8_sea'));
    assert.equal(G.checkpoint, 'lineWindow');
    const at = [G.player.x, G.player.y];
    step(G, 12);
    assert.deepEqual([G.player.x, G.player.y], at, 'no sinking or pipe capture while the prompt is open');
    assert.equal(G.player.inLane?.id, 'p8-lane');
    assert.equal(arrivals, 1);
    G.step({ hide: true }); step(G, 1, { x: -1, y: -1 });
    assert.ok(!G.player.hidden && G.player.x < at[0] - HL);
    assert.ok(G.has('p8_land'), 'emerging never erases completed land segments');
    G.goto('viken', { x: 25.8 * HL, y: 0.7 * HL, mode: 'swim' });
    step(G, 5, { hide: true });
    assert.equal(arrivals, 1, 'returning cannot enqueue a second final drawing');
});

test('P8 progress follows completed segments and actual drift geometry', () => {
    const G = swimming('viken', 25.8, 0.7, ['talk_done']);
    let progress = p8Progress(G);
    assert.equal(progress.phase, 'runup');
    assert.equal(progress.landDone, 0);
    assert.ok(progress.target.x < 4 * HL, 'first cue marks the run-up, not the pier end');
    G.flag('p8_s1');
    assert.equal(p8Progress(G).landDone, 1);
    G.flag('p8_s2'); G.flag('p8_s3'); G.step({});
    assert.equal(p8Progress(G).phase, 'hide');
    G.step({ hide: true }); step(G, 0.6);
    progress = p8Progress(G);
    assert.equal(progress.phase, 'drift');
    assert.ok(progress.fraction > 0 && progress.fraction < 1);
    const before = progress.fraction; step(G, 0.25);
    assert.ok(p8Progress(G).fraction > before);
    step(G, 4);
    assert.equal(p8Progress(G).phase, 'draw');
    assert.equal(p8Progress(G).fraction, 1);
    assert.equal(p8Progress(G).target.scene, 'viken');
});

test('the completed P8 drawing keeps its calm landing throughout the wave proof and on reload', () => {
    const G = swimming('viken', 25.8, .7, lineFlags);
    step(G, 5, { hide: true });
    assert.ok(G.has('p8_sea'));
    G.flag('p8_done'); G.terrain.refresh();
    for (const game of [G, (() => { const H = createGame(); H.restore(G.serialize()); return H; })()]) {
        const at = [game.player.x, game.player.y];
        step(game, 20);
        assert.deepEqual([game.player.x, game.player.y], at, 'the adjacent upward pipe cannot steal the resting shell');
        assert.ok(game.player.hidden, 'the demonstration preserves the hidden shell');
        assert.equal(game.player.inLane?.id, 'p8-lane');
        game.flag('unfolded'); game.terrain.refresh();
        assert.equal(game.terrain.lanes.some(l => l.id === 'p8-lane'), false, 'the landing releases after the sea unfolds');
    }
});

test('P8 calm arrival is deterministic across render schedules', () => {
    const states = [];
    for (const hz of [30, 60, 120, 144]) {
        const G = swimming('viken', 25.8, 0.7, lineFlags);
        let acc = 0, pendingHide = true, arrivals = 0;
        G.on('windowReached', () => arrivals++);
        for (let frame = 0; frame < hz * 8; frame++) {
            acc += 1 / hz;
            while (acc >= STEP - 1e-12) { G.step({ hide: pendingHide }); pendingHide = false; acc -= STEP; }
        }
        states.push([G.player.x, G.player.y, G.player.vx, G.player.vy, arrivals, G.has('p8_sea')]);
    }
    for (const state of states.slice(1)) assert.deepEqual(state, states[0]);
});

test('a saved P8 sea half resumes its final drawing with fresh screen geometry', async () => {
    const G = swimming('viken', 25.8, 0.7, [...CODE_RESTORE[2].flags, ...lineFlags,
        'b:k3_arrive', 'b:k3_line', 'lamp_lit', 'kv_met', 'b:k3_lamp', 'talk1', 'b:k3_talk1', 'talk2']);
    step(G, 5, { hide: true });
    const H = createGame();
    let drawing, scale = 1, saves = 0;
    H.story = createStory(H, { ui: { draw: opts => { drawing = opts; return new Promise(() => {}); }, say: async () => {} },
        save() { saves++; }, toScreen: (x, y) => ({ x: x * scale, y: y * scale }) });
    H.restore(G.serialize());
    assert.ok(H.player.hidden, 'the save restores the calm shell at the window');
    for (let i = 0; i < 240 && !drawing; i++) { H.step({}); await new Promise(resolve => setImmediate(resolve)); }
    assert.ok(drawing, 'the committed sea half resumes without another gallop or drift');
    assert.equal(saves, 1);
    assert.equal(drawing.allowReverse, true);
    assert.equal(drawing.anchors.length, 4);
    scale = 0.5;
    assert.deepEqual(drawing.getGeometry().anchors, drawing.anchors.map(([x, y]) => [x * 0.5, y * 0.5]));
    const at = [H.player.x, H.player.y]; step(H, 5);
    assert.deepEqual([H.player.x, H.player.y], at);
    assert.equal(H.has('p8_done'), false, 'an unfinished or abandoned drawing never commits the ending');
});

test('P5: the lyktfiskar wait where they are when the shell comes out, and follow again when it hides near them', () => {
    // beside the bed, outside the current that would carry the shell into the vault
    const G = swimming('kelp', 23.1, 10.6);
    step(G, 2, { hide: true });
    assert.equal(G.puz.school.state, 'follow', 'hiding by the bed calls the school out');
    step(G, 0.15, { hide: true });
    step(G, 0.6, { x: -1, y: -1 });
    assert.equal(G.puz.school.state, 'wait', 'swimming off makes them stop, not flee home');
    const { x, y } = G.puz.school;
    step(G, 1, {});
    assert.ok(Math.hypot(G.puz.school.x - x, G.puz.school.y - y) < 1, 'they wait in place');
    step(G, 1.5, { hide: true });
    assert.equal(G.puz.school.state, 'follow', 'hiding near them again brings them back');
    const H = swimming('kelp', 23.1, 10.6);
    step(H, 2, { hide: true }); step(H, 0.15, { hide: true });
    step(H, 8, { x: -0.3, y: -1 });
    assert.equal(H.puz.school.state, 'home', 'swimming far away sends them home');
});

test('Mörka valvet has a solid roof and is dark from both mouths until it is lit', () => {
    const G = swimming('kelp', 28.6, 7.6);
    step(G, 3, { y: 1 });
    assert.ok(G.player.y < 8.6 * HL, 'a swimmer cannot pass down through the roof');
    const E = swimming('kelp', 32.2, 11.3);
    step(E, 2, { x: -1 });
    assert.ok(E.player.x > 31 * HL, 'the back way in is dark too');
    const L = swimming('kelp', 32.2, 11.3, ['p5_lit']);
    step(L, 2, { x: -1 });
    assert.ok(L.player.x < 30.5 * HL, 'once lit, the vault can be swum through');
    assert.ok(L.player.y > 10.6 * HL, 'under the roof');
});
