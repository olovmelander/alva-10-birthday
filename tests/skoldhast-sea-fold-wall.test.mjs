import test from 'node:test';
import assert from 'node:assert/strict';
import { seaFoldWallLayout, pageCreaseLayout } from '../skoldhast/src/sea-fold-wall.mjs';
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

test('above water the same fold is a crease: the jetty ends in it, just past the bolted gate', () => {
    const land = SCENES.land, crease = land.decor.find(item => item.sprite === 'page-crease');
    const jetty = land.surfaces.find(surface => surface.id === 'jetty').pts;
    const gate = land.walls.find(wall => wall.id === 'gate'), end = land.walls.find(wall => wall.id === 'east-end');
    const exit = land.exits.find(item => item.id === 'to-viken');
    assert.ok(crease, 'the beach shows the crease');
    assert.equal(crease.x, jetty.at(-1)[0], 'the jetty ends at the crease');
    assert.ok(gate.x < crease.x && crease.x - gate.x < 4 * 200, 'just past the bolted gate');
    assert.ok(end.x <= crease.x && exit.x0 < crease.x && exit.x1 >= crease.x, 'the beach ends there, and through it lies the bay');
    assert.equal(crease.when, '!unfolded', 'gone once Kartväktaren unfolds the page');
    const layout = pageCreaseLayout({ x: crease.x, top: land.bounds.y0, bottom: land.bounds.y1, waterY: 0 });
    assert.ok(layout.hinge.every(([x]) => x === crease.x), 'the drawn hinge stands exactly at the crease');
    assert.ok(layout.back.every(([x]) => x > crease.x) && layout.tower.x > crease.x, 'the folded corner and its lighthouse lie beyond it');
    const view = land.camViews.find(item => item.show[1] > crease.x);
    assert.ok(view && view.x0 < gate.x && view.x1 >= gate.x && land.bounds.x1 >= view.show[1], 'from the gate the view reaches past the crease');
});
