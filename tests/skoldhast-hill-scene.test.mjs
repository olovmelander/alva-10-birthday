import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { createGame } from '../skoldhast/src/game.mjs';
import { createHillPuzzleScene, hillStripGeometry } from '../skoldhast/src/hill-scene.mjs';
import { p3Pose, hillFlightPose } from '../skoldhast/src/hill-puzzle.mjs';
import { p4MomentumProgress, C } from '../skoldhast/src/sim.mjs';

const game = () => {
    const G = createGame(); G.restore({ flags: ['p2_open', 'p1_inked'], checkpoint: 'cave' }); return G;
};
const scene = G => createHillPuzzleScene(PIXI, { def: G.scenes.land, sprite: () => new PIXI.Sprite(PIXI.Texture.WHITE) });

test('each grass paper upper edge is the real collision throughout opening and after restore', () => {
    const G = game(), view = scene(G);
    for (const def of G.scenes.land.hillPuzzle.stages) {
        const closed = p3Pose(G).stages.find(s => s.id === def.id);
        assert.deepEqual(hillStripGeometry(closed).top, closed.basePoints);
        assert.ok(hillStripGeometry(closed).curl > 0);
        G.flags.add(def.seedFlag); G.puz.p3.roots[def.id] = G.scenes.land.hillPuzzle.rootsSeconds;
        G.flags.add(def.flag); G.terrain.startRampGrowth(def.ramp, 1); G.terrain.refresh();
        for (const dt of [0, .2, .3, .5]) {
            G.terrain.advance(dt);
            const pose = p3Pose(G), stage = pose.stages.find(s => s.id === def.id);
            const collision = G.terrain.surfaces.find(s => s.id === def.ramp).pts;
            for (const lessMotion of [false, true]) {
                const drawn = view.update(pose, { lessMotion }).stages.find(s => s.id === def.id);
                assert.deepEqual(drawn.top, collision, 'reduced motion cannot skip or lag the playable strip');
                assert.deepEqual(drawn.top, stage.points);
            }
        }
        assert.equal(hillStripGeometry(p3Pose(G).stages.find(s => s.id === def.id)).curl, 0);
    }
    const oldSave = game(); oldSave.restore({ flags: ['p2_open', 'p1_inked', 'p3_t1', 'p3_t2', 'p3_t3'], checkpoint: 'cave' });
    const restored = scene(oldSave);
    const drawn = restored.update(p3Pose(oldSave));
    assert.ok(drawn.stages.every(s => s.curl === 0 && s.root === 1), 'old completed ramps must not replay their transformation');
    assert.equal(drawn.flights.length, 0);
    view.container.destroy({ children: true }); restored.container.destroy({ children: true });
});

test('visible seed and pin follow the simulation, with no idle flights or leftover sprites', () => {
    const G = game(), view = scene(G);
    assert.equal(view.update(p3Pose(G)).flights.length, 0);
    const source = G.scenes.land.clumps.find(s => s.id === 'c1');
    const receiver = G.scenes.land.tussocks.find(s => s.id === 't1');
    const f = { id: 1, source: source.id, target: receiver.id, x: source.x, y: source.y - 100,
        tx: receiver.x, ty: receiver.y - 8, dur: source.duration, arc: source.arc, t: 0 };
    G.puz.fluff.push(f);
    for (const t of [0, .23, .5, .92, 1]) {
        f.t = t;
        for (const lessMotion of [false, true]) {
            const drawn = view.update(p3Pose(G), { lessMotion }).flights[0];
            assert.deepEqual({ x: drawn.x, y: drawn.y }, hillFlightPose(f));
        }
    }
    G.puz.fluff = [];
    assert.equal(view.update(p3Pose(G)).flights.length, 0);
    assert.equal(view.container.children.find(s => s.label === 'p3-seed-flights').children.length, 0);
    G.flags.add('p3_t1');
    G.puz.p3.stone = { owner: G.player, elapsed: 0 };
    for (const t of [0, .2, .5, .9]) {
        G.puz.p3.stone.elapsed = G.scenes.land.hillPuzzle.stone.duration * t;
        const pose = p3Pose(G), drawn = view.update(pose);
        assert.deepEqual(drawn.stone, { x: pose.stone.x, y: pose.stone.y });
    }
    G.flags.add('p3_stone_clear');
    assert.deepEqual(view.update(p3Pose(G)).stone, G.scenes.land.hillPuzzle.stone.to);
    view.container.destroy({ children: true });
    assert.equal(PIXI.Texture.WHITE.destroyed, false);
});

test('downhill wake appears only for real momentum earned on the runup surface', () => {
    const G = game(), view = scene(G), p = G.player;
    Object.assign(p, { mode: 'ground', hidden: false, hideQueued: false,
        surface: G.scenes.land.surfaces.find(s => s.id === 'plateau'), vx: -C.gallop });
    const draw = () => view.update(p3Pose(G), { player: p, momentum: p4MomentumProgress(p, G.scenes.land), showRunup: true });
    draw(); assert.equal(view.wake.visible, false);
    p.vx = -1400; draw(); assert.equal(view.wake.visible, true);
    p.vx = 1400; draw(); assert.equal(view.wake.visible, false);
    p.vx = -1400; p.surface = G.scenes.land.surfaces.find(s => s.id === 'L1');
    draw(); assert.equal(view.wake.visible, false);
    view.container.destroy({ children: true });
});
