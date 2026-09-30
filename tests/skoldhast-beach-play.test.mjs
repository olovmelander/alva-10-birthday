import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beachRaceMarkers } from '../skoldhast/src/beach-play.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';
import { HL } from '../skoldhast/src/sim.mjs';

test('Signe has clear sand beyond the shells and Klo, while race markings keep the original route', () => {
    const d=SCENES.land, marks=beachRaceMarkers(d);
    assert.ok(d.race.signe.x > Math.max(...d.shells.map(s=>s.x)) + HL);
    assert.ok(d.race.signe.x - d.spots.kloBeach.x > 2*HL);
    assert.deepEqual(marks.start,d.race.start);
    assert.equal(marks.finish.x,d.race.finish);
    assert.ok(Number.isFinite(marks.finish.y),'the flag stands on the authored pool bank');
    assert.equal((marks.start.x-marks.finish.x)/HL,3.8,'moving the chat spot does not change the race length');
});
