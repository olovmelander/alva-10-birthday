import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seabedFoldGeometry } from '../skoldhast/src/folded-seabed.mjs';
import { HL, heightOn } from '../skoldhast/src/sim.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';

test('the P6 contact peak belongs to a fold hinged onto the actual seabed', () => {
    const c = SCENES.kelp.corners[0];
    const bed = SCENES.kelp.surfaces.find(s => s.id === 'trench');
    const groundY = heightOn(bed.pts, c.x);
    const options = { x: c.x, y: c.y + 24, groundY, width: HL * 3.1 };
    const raised = seabedFoldGeometry(options), flat = seabedFoldGeometry({ ...options, flat: 1 });
    assert.equal(raised.peak[0], c.x);
    assert.ok(Math.abs(raised.peak[1] - c.y) < 30, 'the visible tip matches the shell contact point');
    assert.ok(raised.rise > 2 * HL, 'the illustrated face reaches the ground instead of floating');
    assert.deepEqual(flat.left, raised.left, 'the ground hinge cannot drift');
    assert.deepEqual(flat.right, raised.right);
    assert.equal(flat.peak[1], groundY);
    assert.equal(flat.rise, 0);
    assert.ok(seabedFoldGeometry({ ...options, flat: .5 }).rise < raised.rise);
});
