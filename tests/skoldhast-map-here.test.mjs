/*
 * Här är vi: the little sköldhäst on the journal's map stands where the player is in
 * the world, and the map shows what can be seen there, such as Bryggan, the bolted
 * jetty that runs from the beach to Pappersfyren (map-layout.mjs, mapbook.mjs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HL } from '../skoldhast/src/sim.mjs';
import { SCENES, SEA_BAY_LINK } from '../skoldhast/src/content/world.mjs';
import { MAP } from '../skoldhast/src/content/sv.mjs';
import { MAP_FRAGMENTS, MAP_WATERLINE, MAP_PIER, MAP_PIER_GATE, MAP_TOWER, MAP_GATE, MAP_ROUTES, MAP_WHERE,
    fragmentPoints, mapWhere, placeAt } from '../skoldhast/src/map-layout.mjs';
import { mapHere, hereLabelBelow } from '../skoldhast/src/mapbook.mjs';

function inside([x, y], pts) {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
}
const corner = fragmentPoints(MAP_FRAGMENTS.find(f => f.id === 'corner'));
const [pa, pb] = MAP_PIER;
/** How far a map point is from Bryggan, and whether it lies south of (under) it. */
function fromPier([x, y]) {
    const dx = pb[0] - pa[0], dy = pb[1] - pa[1], t = Math.max(0, Math.min(1, ((x - pa[0]) * dx + (y - pa[1]) * dy) / (dx * dx + dy * dy)));
    const px = pa[0] + dx * t, py = pa[1] + dy * t;
    return { d: Math.hypot(x - px, y - py), south: y > py };
}
/** The waterline's x at a height (the sea lies east of it there). */
function waterlineX(y) {
    for (let i = 1; i < MAP_WATERLINE.length; i++) {
        const [x0, y0] = MAP_WATERLINE[i - 1], [x1, y1] = MAP_WATERLINE[i];
        if ((y - y0) * (y - y1) <= 0 && y0 !== y1) return x0 + (x1 - x0) * (y - y0) / (y1 - y0);
    }
    return NaN;
}
const at = (scene, x) => { const p = mapWhere(scene, x); return [p.x, p.y]; };
const surface = (scene, id) => SCENES[scene].surfaces.find(s => s.id === id).pts.map(([x, y]) => [x / HL, y / HL]);

test('Bryggan is on the map: from the beach, bolted just past the waterline, out to Pappersfyren', () => {
    for (const p of [pa, pb, [MAP_PIER_GATE.x, MAP_PIER_GATE.y]]) assert.ok(inside(p, corner), `${p} is on the corner piece found on the beach`);
    assert.ok(pa[0] < waterlineX(pa[1]), 'it starts on the sand');
    assert.ok(MAP_PIER_GATE.x > waterlineX(MAP_PIER_GATE.y), 'its gate stands out over the water');
    assert.ok(fromPier([MAP_PIER_GATE.x, MAP_PIER_GATE.y]).d < 2, 'the gate is on the bridge');
    assert.ok(Math.hypot(pb[0] - MAP_TOWER.x, pb[1] - MAP_TOWER.y) < 24, 'it reaches the islet under the tower');
});

test('the world lies along the map: the jetty, its gate and the pier are on Bryggan', () => {
    const jetty = surface('land', 'jetty'), pier = surface('viken', 'pier');
    const gate = SCENES.land.walls.find(w => w.id === 'gate').x / HL;
    assert.ok(Math.hypot(...at('land', gate).map((v, i) => v - [MAP_PIER_GATE.x, MAP_PIER_GATE.y][i])) < 3, 'the bolted gate is where it is drawn');
    for (const [x] of [jetty[0], jetty.at(-1)]) assert.ok(fromPier(at('land', x)).d < 3, `land ${x} is on Bryggan`);
    for (const [x] of [pier[0], pier.at(-1)]) assert.ok(fromPier(at('viken', x)).d < 3, `viken ${x} is on Bryggan`);
    assert.deepEqual(at('land', 1e6), at('viken', -1e6), 'walking through the gate into Spegelviken does not jump on the map');
    const tower = SCENES.viken.surfaces.find(s => s.id === 'light-base').pts.map(([x]) => x / HL);
    assert.ok(Math.hypot(...at('viken', (tower[0] + tower[1]) / 2).map((v, i) => v - [MAP_TOWER.x, MAP_TOWER.y][i])) < 8, 'the tower foot');
    assert.ok(Math.hypot(...at('kelp', 0).map((v, i) => v - [MAP_GATE.x, MAP_GATE.y][i])) < 20, 'under water we start at Vattenporten');
    for (const list of Object.values(MAP_WHERE)) for (let i = 1; i < list.length; i++) assert.ok(list[i][0] > list[i - 1][0], 'anchors run west to east');
});

test('the sea way ends under Bryggan, where a swimmer comes up out of the current', () => {
    const end = MAP_ROUTES.sea.at(-1), under = fromPier(end);
    assert.ok(under.d < 10 && under.south, `the way stops just under the bridge (${JSON.stringify(under)})`);
    const spawn = at('viken', SEA_BAY_LINK.baySpawn / HL);
    assert.ok(Math.hypot(spawn[0] - end[0], spawn[1] - end[1]) < 10, 'the swimmer arrives where the way ends');
});

test('Här är vi names the place only when the player knows its name', () => {
    assert.equal(placeAt('land', 116, new Set()), 'pier', 'Bryggan can be seen from the beach from the start');
    assert.equal(placeAt('land', 20, new Set()), 'steppe');
    assert.equal(placeAt('viken', 10, new Set()), null, 'Spegelviken has no name until the story gives it');
    assert.equal(placeAt('viken', 10, new Set(['viken_arrived'])), 'bay');
    assert.equal(placeAt('viken', 29, new Set(['viken_arrived'])), 'tower');
    assert.equal(placeAt('nowhere', 3, new Set()), null);
    assert.equal(mapHere({ flags: new Set() }), null, 'no marker without a place in the world');
    assert.equal(mapHere({ flags: new Set(), where: { scene: 'nowhere', x: 3 } }), null);
    const here = mapHere({ flags: new Set(), where: { scene: 'land', x: 116 } });
    assert.equal(here.place, 'pier');
    assert.equal(here.text, MAP.hereAt(MAP.places.pier));
    assert.equal(mapHere({ flags: new Set(), where: { scene: 'viken', x: 10 } }).text, MAP.hereAt(null));
});

test('the words "Här är vi" keep clear of the place names', () => {
    const flags = new Set(['clue_map_corner', 'mark_land', 'mark_sea']);
    assert.equal(hereLabelBelow(mapWhere('land', 116), flags), true, 'on Bryggan, under it: Stranden and the signature are above');
    assert.equal(hereLabelBelow(mapWhere('land', 20), flags), true, 'on the steppe, under it: Stäppen is above');
    assert.equal(hereLabelBelow(mapWhere('kelp', 30), flags), false, 'by Mörka valvet, over it: its name is below');
});
