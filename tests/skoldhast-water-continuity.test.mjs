import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { SCENES, SEA_BAY_LINK } from '../skoldhast/src/content/world.mjs';
import { Terrain, heightOn, HL, STEP } from '../skoldhast/src/sim.mjs';

const carried = ['vx', 'vy', 'hidden', 'hide', 'facing', 'submerge', 'speed', 'wetTimer', 'wet'];
const motion = player => Object.fromEntries(carried.map(key => [key, player[key]]));
function game(flags = ['marks_both']) {
    const G = createGame();
    for (const flag of ['ch2_open', ...flags]) G.flag(flag);
    return G;
}
function until(G, predicate, input, seconds = 12) {
    for (let i = 0; i < seconds / STEP && !predicate(); i++) G.step(typeof input === 'function' ? input() : input);
    assert.ok(predicate(), `${G.sceneId}: x=${G.player.x / HL}, y=${G.player.y / HL}, vx=${G.player.vx}`);
}

test('cave, outflow and bay share one waterline, with a matching physical shelf at the passage', () => {
    const sea = SCENES.kelp.waters.find(water => water.id === 'sea');
    const bay = SCENES.viken.waters.find(water => water.id === 'bay');
    const coast = SCENES.land.waters.find(water => water.kind === 'sea');
    assert.equal(sea.top, coast.top); assert.equal(bay.top, sea.top);
    const kelp = new Terrain(SCENES.kelp, new Set(['ch2_open', 'marks_both']));
    const viken = new Terrain(SCENES.viken, new Set(['marks_both']));
    assert.equal(kelp.floorAt(SEA_BAY_LINK.kelpExit, SEA_BAY_LINK.depth), SEA_BAY_LINK.bed);
    assert.equal(viken.floorAt(SEA_BAY_LINK.baySpawn, SEA_BAY_LINK.depth), SEA_BAY_LINK.bed);
    for (const [scene, terrain, spawn] of [[SCENES.kelp, kelp, 'fromViken'], [SCENES.viken, viken, 'fromKelp']]) {
        const position = scene.spots[spawn];
        assert.equal(position.y, SEA_BAY_LINK.depth);
        assert.ok(position.y > SEA_BAY_LINK.y0 && position.y < SEA_BAY_LINK.y1);
        assert.ok(terrain.floorAt(position.x, position.y) > position.y + .8 * HL, 'arrival leaves room for the whole swimmer');
    }
    const outflow = SCENES.kelp.lanes.find(lane => lane.id === 'lane-out');
    assert.equal(outflow.pts.at(-1)[1], SEA_BAY_LINK.depth);
    assert.ok(outflow.pts.at(-1)[0] > SEA_BAY_LINK.kelpExit, 'the real current carries the shell across the page seam');
    // The shallow shelf begins beyond the existing collectible and deep puzzle.
    const trench = SCENES.kelp.surfaces.find(surface => surface.id === 'trench');
    const pebbles = SCENES.kelp.pencils.find(pencil => pencil.id === 'p-kelp-pebbles').propAt;
    assert.ok(Math.abs(heightOn(trench.pts, pebbles.x) - pebbles.y) < .001);
});

for (const hidden of [false, true]) test(`the linked passage preserves exact swim state before scene observers run, hidden ${hidden}`, () => {
    const G = game();
    G.goto('kelp', { x: 46.1 * HL, y: SEA_BAY_LINK.depth, mode: 'swim', hidden });
    G.player.wet = .63; G.player.wetTimer = 1.7;
    let source, arrived;
    G.on('exit', exit => {
        if (!exit.waterLink) return;
        source = { state: motion(G.player), depth: G.player.y - G.player.water.top, lane: G.player.inLane };
    });
    G.on('scene', event => {
        if (event.id !== 'viken') return;
        arrived = { state: motion(G.player), depth: G.player.y - G.player.water.top,
            x: G.player.x, y: G.player.y, px: G.player.px, py: G.player.py,
            lane: G.player.inLane, vortex: G.player.inVortex, mode: G.player.mode };
    });
    until(G, () => G.sceneId === 'viken', hidden ? {} : { x: 1 });
    assert.ok(source?.lane && arrived, 'the production current and exit perform the transfer');
    assert.deepEqual(arrived.state, source.state);
    assert.equal(arrived.depth, source.depth);
    assert.equal(arrived.mode, 'swim'); assert.equal(arrived.x, SEA_BAY_LINK.baySpawn);
    assert.equal(arrived.px, arrived.x); assert.equal(arrived.py, arrived.y, 'interpolation starts on the new page');
    assert.equal(arrived.lane, null); assert.equal(arrived.vortex, null, 'no old-scene current references survive');
    for (let i = 0; i < 60; i++) G.step({});
    assert.equal(G.sceneId, 'viken', 'arrival cannot instantly bounce into the reverse exit');
});

test('ordinary swimming can return through the same corridor without an immediate forward bounce', () => {
    const G = game(), crossings = [];
    G.goto('kelp', { x: 46.1 * HL, y: SEA_BAY_LINK.depth, mode: 'swim' });
    G.on('exit', exit => crossings.push({ id: exit.id, depth: G.player.y - G.player.water.top, state: motion(G.player) }));
    until(G, () => G.sceneId === 'viken', { x: 1 });
    until(G, () => G.sceneId === 'kelp', () => ({ x: -1, y: Math.max(-.3, Math.min(.3, (SEA_BAY_LINK.depth - G.player.y) / HL)) }));
    assert.deepEqual(crossings.map(crossing => crossing.id), ['to-viken', 'to-kelp']);
    assert.equal(G.player.y - G.player.water.top, crossings[1].depth);
    assert.deepEqual(motion(G.player), crossings[1].state);
    assert.equal(G.player.x, SEA_BAY_LINK.kelpSpawn);
    for (let i = 0; i < 60; i++) G.step({ x: -1 });
    assert.equal(G.sceneId, 'kelp'); assert.equal(crossings.length, 2);
    G.setCheckpoint('viken');
    const resumed = createGame(); resumed.restore(G.serialize());
    assert.equal(resumed.sceneId, 'viken');
    assert.equal(resumed.player.y, SEA_BAY_LINK.depth);
    for (let i = 0; i < 30; i++) resumed.step({});
    assert.equal(resumed.sceneId, 'viken', 'the saved entry checkpoint is also clear of its reverse exit');
});

test('the outflow needs the revealed map route and only transfers swimmers crossing its submerged opening', () => {
    for (const flags of [[], ['mark_land'], ['mark_sea'], ['mark_land', 'mark_sea']]) {
        const G = game(flags);
        G.goto('kelp', { x: 46.7 * HL, y: SEA_BAY_LINK.depth, mode: 'swim' });
        assert.equal(G.terrain.lanes.some(lane => lane.id === 'lane-out'), false);
        for (let i = 0; i < 240; i++) G.step({ x: 1 });
        assert.equal(G.sceneId, 'kelp', 'inventory alone does not open the unrevealed route');
    }
    for (const depth of [SEA_BAY_LINK.y0 - .3 * HL, SEA_BAY_LINK.y1 + .15 * HL]) {
        const G = game(); G.goto('kelp', { x: 46.95 * HL, y: depth, mode: 'swim' });
        for (let i = 0; i < 12; i++) G.step({ x: 1 });
        assert.equal(G.sceneId, 'kelp', 'swimming above or below the opening stays on the current page');
    }
    const G = game(); G.goto('kelp', { x: 46.95 * HL, y: SEA_BAY_LINK.depth, mode: 'swim' });
    G.player.vx = -200;
    for (let i = 0; i < 12; i++) G.step({ x: -1 });
    assert.equal(G.sceneId, 'kelp', 'leaving the doorway toward its own scene is not an exit');
});
