import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { createGame } from '../skoldhast/src/game.mjs';
import { createFoldedSeabed, seabedFoldGeometry } from '../skoldhast/src/folded-seabed.mjs';
import { createKelpPuzzleScene } from '../skoldhast/src/kelp-scene.mjs';
import { p6Pose } from '../skoldhast/src/kelp-puzzle.mjs';

test('numeric shell pressure and the visible crease always share one contact height', () => {
    const def = createGame().scenes.kelp.kelpPuzzle.fold;
    for (const reducedMotion of [false, true]) {
        const fold = createFoldedSeabed(PIXI, { ...def, texture: () => null });
        for (const flat of [0, .12, .5, .87, 1, 0]) {
            assert.deepEqual(fold.update({ flat, dt: 1 / 120, reducedMotion }), seabedFoldGeometry({ ...def, flat }),
                'rendering must not add lag, skip pressure or retain pressure after an interrupted attempt');
        }
        fold.container.destroy({ children: true });
    }
});

test('kelp mechanism follows physical release and fragment positions through every stage and survives teardown', () => {
    const G = createGame();
    G.restore({ flags: ['p2_open', 'ch2_open'], checkpoint: 'trench' });
    const def = G.scenes.kelp.kelpPuzzle;
    const shared = new PIXI.Texture({ source: new PIXI.TextureSource({ width: 1920, height: 1260 }) });
    const scene = createKelpPuzzleScene(PIXI, { texture: key => key === 'map-page' ? shared : null, def });
    const fragment = scene.container.children.find(child => child.label === 'p6-fragment');
    const state = G.puz.p6;
    const check = (phase, visible) => {
        const pose = p6Pose(G); assert.equal(pose.phase, phase);
        for (const lessMotion of [false, true]) {
            const rendered = scene.update(pose, { lessMotion });
            assert.deepEqual(rendered, seabedFoldGeometry({ ...def.fold, flat: pose.flat }));
            assert.equal(fragment.visible, visible);
            assert.equal(fragment.x, pose.fragment.x); assert.equal(fragment.y, pose.fragment.y);
        }
        return pose;
    };
    check('free-kelp', true);
    Object.assign(state, { grabbed: true, owner: G.player, pull: .6 });
    check('pull-kelp', true);
    G.flags.add('p6_kelp_freed');
    Object.assign(state, { grabbed: false, freedAt: G.time, releaseHand: { ...def.tether.pullTarget } });
    assert.equal(check('reach-fold', true).release, 0);
    G.time += .4; assert.equal(check('reach-fold', true).release, .5);
    G.time += .4; assert.equal(check('reach-fold', true).release, 1);
    state.contact = true; state.press = def.pressSeconds / 2;
    assert.equal(check('press-fold', true).flat, .5);
    G.flags.add('p6_flat'); state.contact = false; state.releasedAt = G.time;
    const first = check('collect-fragment', true).fragment;
    assert.equal(first.x, def.fragment.from.x); assert.equal(first.y, def.fragment.from.y);
    G.time += def.fragment.riseSeconds / 2;
    const middle = check('collect-fragment', true).fragment;
    assert.ok(middle.x > first.x && middle.x < def.fragment.to.x);
    assert.ok(middle.y < first.y && middle.y > def.fragment.to.y);
    G.time += def.fragment.riseSeconds / 2;
    const last = check('collect-fragment', true).fragment;
    assert.equal(last.x, def.fragment.to.x); assert.equal(last.y, def.fragment.to.y);
    G.flags.add('mark_sea'); check('complete', false);
    scene.container.destroy({ children: true });
    assert.equal(fragment.destroyed, true);
    assert.equal(shared.destroyed, false, 'removing the scene must not destroy the map artwork used by the notebook');
    shared.destroy(true);
});
