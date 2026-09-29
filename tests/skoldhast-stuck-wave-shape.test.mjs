import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCENES } from '../skoldhast/src/content/world.mjs';
import { runupShape, surfaceGround } from '../skoldhast/src/stuck-wave-shape.mjs';
import { seaAnchorY } from '../skoldhast/src/scenery.mjs';

const land = SCENES.land;
const wave = land.decor.find(it => it.frozen);
const ground = surfaceGround(land.surfaces);
const shape = runupShape({ ground, x: wave.x, y: wave.y });

test('the stuck wave runs down to exactly where her sand meets the sea', () => {
    assert.ok(shape.shoreX >= 22320 && shape.shoreX <= 22330, `shore at ${shape.shoreX}`);
    assert.ok(Math.abs(ground(shape.shoreX)) <= .5, 'the sand is at sea level there');
    assert.ok(Math.abs(shape.crestAt(shape.shoreX)) <= .5, 'the crest meets the sea surface line');
    assert.ok(Math.abs(shape.crestAt(shape.ex - .01) - shape.crestAt(shape.ex + .01)) <= .5, 'the crest leaves the splash without a step');
    for (let x = shape.ex; x < shape.shoreX; x += 10) assert.ok(shape.crestAt(x) <= ground(x) + .01, 'the water never dips below the sand');
});

test('the drawn run-up matches the beach it was drawn for', () => {
    // The art is generated from this same shape. After any change to the beach,
    // the splash position or the sea level: node scripts/build-skoldhast-assets.mjs --only props
    const atlas = JSON.parse(fs.readFileSync(new URL('../skoldhast/assets/props-land.json', import.meta.url)));
    const frame = atlas.frames['frozen-runup'];
    assert.ok(frame, 'the run-up art exists');
    assert.deepEqual([frame.sourceSize.w, frame.sourceSize.h], [shape.frame.w, shape.frame.h]);
});

test('her painted sea sits at the same height in play as in her picture', () => {
    const bg = land.backdrop.find(b => b.seaY !== undefined);
    const th = 512, start = land.spots.start;
    // her picture: 740 × 560 paper units, the backdrop fitted to it (snapshot)
    const picture = seaAnchorY({ H: 560, th, sc: 560 / th, seaY: bg.seaY, seaRow: bg.seaRow, camY: start.y - 200, zoom: 740 / 1060 });
    assert.ok(Math.abs(picture) < 1, `the picture's own fit already places it (${picture})`);
    for (let camY = -600; camY <= 200; camY += 20) {
        assert.ok(seaAnchorY({ H: 900, th, sc: 1440 / 1024 * 1.08, seaY: bg.seaY, seaRow: bg.seaRow, camY, zoom: .95 }) <= 0, 'the top of the screen stays covered');
    }
});
