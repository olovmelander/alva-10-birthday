import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAP_SCENE_PHASES, sampleMapScene, mapSceneLayout } from '../skoldhast/src/map-assemble.mjs';
import { MAP_FRAGMENTS } from '../skoldhast/src/map-layout.mjs';

test('map pieces join before a route can be revealed and every reading pose holds', () => {
    for (const phase of ['observe', 'joined', 'complete']) {
        const first = sampleMapScene(phase, 0);
        for (const t of [12, 120, 3600]) assert.deepEqual(sampleMapScene(phase, t), first);
        assert.equal(first.done, false);
    }
    for (const t of [0, .5, 1.2, 50]) assert.equal(sampleMapScene('join', t).reveal, 0);
    for (const t of [0, .5, 1.45]) assert.equal(sampleMapScene('reveal', t).joined, 1);
    assert.equal(sampleMapScene('complete').reveal, 1);
});

test('map actions are continuous and end exactly in their held poses', () => {
    const holds = { arrive: 'observe', join: 'joined', reveal: 'complete', depart: 'gone' };
    for (const [phase, duration] of Object.entries(MAP_SCENE_PHASES)) {
        let previous = sampleMapScene(phase, 0);
        for (let t = 1 / 120; t <= duration; t += 1 / 120) {
            const state = sampleMapScene(phase, t);
            for (const key of ['joined', 'reveal', 'opacity']) {
                assert.ok(state[key] >= 0 && state[key] <= 1);
                assert.ok(Math.abs(state[key] - previous[key]) < .04);
            }
            previous = state;
        }
        assert.equal(sampleMapScene(phase, duration - .001).done, false);
        const end = sampleMapScene(phase, duration), hold = sampleMapScene(holds[phase]);
        assert.equal(end.done, true);
        for (const key of ['joined', 'reveal', 'opacity']) assert.equal(end[key], hold[key]);
    }
});

test('a found fragment, the guardian diagram and the returned map arrive intact', () => {
    for (const variant of ['fragment', 'guardian', 'inspect']) {
        for (const phase of ['arrive', 'observe', 'reveal', 'complete']) {
            assert.equal(sampleMapScene(phase, .2, variant).joined, 1);
        }
    }
    assert.equal(sampleMapScene('observe', 100, 'assembly').joined, 0);
});

test('map and caption fit the actual reading space across phone orientations', () => {
    const boxes = [{ x: -30, y: 0, w: 700, h: 475 }, { x: 0, y: 0, w: 640, h: 420 },
        ...MAP_FRAGMENTS.map(f => ({ x: f.box[0] - 12, y: f.box[1] - 12, w: f.box[2] + 24, h: f.box[3] + 24 }))];
    for (const [width, height] of [[390, 844], [844, 390], [1440, 900], [320, 568], [568, 320]]) {
        const insets = { left: 20, right: 20, top: height > width ? 220 : 18, bottom: height > width ? 24 : 145 };
        for (const box of boxes) {
            const layout = mapSceneLayout(width, height, box, insets), b = layout.bounds;
            assert.ok(layout.scale > 0);
            assert.ok(b.x >= insets.left && b.x + b.width <= width - insets.right + .001);
            assert.ok(b.y >= insets.top && b.y + b.height <= height - insets.bottom + .001);
            assert.ok(layout.titleWidth <= width - insets.left - insets.right);
        }
    }
});
