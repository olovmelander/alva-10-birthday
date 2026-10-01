import test from 'node:test';
import assert from 'node:assert/strict';
import { seaFoldWallLayout } from '../skoldhast/src/sea-fold-wall.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';
import { heightOn } from '../skoldhast/src/sim.mjs';

test('the drawn ocean folds at the real boundary and meets the existing seabed', () => {
    const scene = SCENES.kelp, wall = scene.walls.find(item => item.id === 'fold');
    const ground = scene.surfaces.find(surface => surface.id === 'trench').pts;
    const bottom = heightOn(ground, wall.x) + 35;
    const fold = seaFoldWallLayout({ x: wall.x, top: -140, bottom });
    assert.ok(fold.hinge.every(point => point[0] === wall.x), 'the visible crease must match the blocking plane');
    assert.equal(fold.hinge.at(-1)[1], bottom);
    assert.ok(fold.face.every(point => point[0] >= wall.x), 'painted folded face stays beyond the barrier');
    assert.ok(fold.reverse < fold.width * .1, 'paper reverse is an edge, not a blank wall');
    assert.ok(fold.face.every(point => point[0] < scene.bounds.x1), 'no slab extending outside the page');
    const sea = scene.waters.find(water => water.id === 'sea');
    assert.ok(fold.hinge[0][1] <= sea.top && fold.hinge.at(-1)[1] >= bottom,
        'the fold spans from above the actual water surface to the actual seabed');
});
