/*
 * One map, shown the same everywhere (map-layout.mjs): the drawing, the journal's
 * pieces, the pieces joining in the game and Klo's fold demo all use this layout.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MAP_FRAGMENTS as BOOK_FRAGMENTS } from '../skoldhast/src/mapbook.mjs';
import { MAP_FRAGMENTS, MAP_VIEW, MAP_SCALE, MAP_LABELS, MAP_DUNE, MAP_TOWER, MAP_HEART, MAP_VAULT, MAP_GATE,
    MAP_MARK, MAP_ROUTES, fragmentPoints, mapLabels } from '../skoldhast/src/map-layout.mjs';

function inside([x, y], pts) {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
}
const pieceAt = (p) => MAP_FRAGMENTS.filter(f => inside(p, fragmentPoints(f))).map(f => f.id);

test('the journal and the game cut the same pieces', () => {
    assert.equal(BOOK_FRAGMENTS, MAP_FRAGMENTS);
});

test('every place name sits wholly on one piece, never across a tear', () => {
    for (const l of MAP_LABELS) {
        const half = (l.minor ? 16 : 22) * 0.3 * 5; // about half the width of a short name
        const a = (l.angle || 0) * Math.PI / 180, dx = Math.cos(a) * half, dy = Math.sin(a) * half;
        const ends = l.angle ? [[l.x - dx, l.y - dy], [l.x + dx, l.y + dy]] : [[l.x - half, l.y - 4], [l.x + half, l.y - 4]];
        const on = new Set([...pieceAt([l.x, l.y - 4]), ...ends.flatMap(pieceAt)]);
        assert.equal(on.size, 1, `${l.key} lies on ${[...on]}`);
    }
});

test('the places are on the pieces the story finds them on', () => {
    assert.deepEqual(pieceAt([MAP_DUNE.x, MAP_DUNE.y]), ['corner'], 'Klo folds a dune on the corner he found on the beach');
    assert.deepEqual(pieceAt([MAP_GATE.x, MAP_GATE.y]), ['corner']);
    assert.deepEqual(pieceAt([MAP_TOWER.x, MAP_TOWER.y]), ['corner']);
    assert.deepEqual(pieceAt([MAP_VAULT.x, MAP_VAULT.y]), ['sea']);
    assert.deepEqual(pieceAt([MAP_HEART.x, MAP_HEART.y]), ['sea']);
    assert.deepEqual(pieceAt(MAP_ROUTES.land[0]), ['land'], 'the land way starts on the land piece');
    // the mark is torn where the three pieces meet
    for (const f of MAP_FRAGMENTS) assert.ok(fragmentPoints(f).some(([x, y]) => Math.hypot(x - MAP_MARK.x, y - MAP_MARK.y) < 20), `the mark touches ${f.id}`);
});

test('names become known with the story; all are shown on the finished map', () => {
    const keys = (flags) => mapLabels(flags).map(l => l.key);
    assert.ok(!keys(new Set()).includes('tower') && !keys(new Set()).includes('bay'));
    assert.ok(keys(new Set(['mark_land'])).includes('tower'));
    assert.equal(mapLabels(true).length, MAP_LABELS.length);
});

test('the drawing is built at the layout size', () => {
    const manifest = JSON.parse(fs.readFileSync(new URL('../skoldhast/assets/manifest.json', import.meta.url)));
    const image = manifest.images['map-page'];
    assert.ok(image, 'map-page is in the manifest');
    assert.equal(image.w, MAP_VIEW.w * MAP_SCALE);
    assert.equal(image.h, MAP_VIEW.h * MAP_SCALE);
    assert.notEqual(image.bundle, 'boot', 'the map loads in the background, outside the first download');
});
