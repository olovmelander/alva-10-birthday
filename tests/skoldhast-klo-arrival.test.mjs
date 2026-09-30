import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { describeKloArrival, sampleKloArrival } from '../skoldhast/src/klo-arrival.mjs';

function at(scene, x, y, mode = 'ground') {
    const G = createGame();
    for (const flag of ['rule_demo', 'ch2_open', 'ch3_open']) G.flags.add(flag);
    G.goto(scene, { x, y, mode }, { silent: true });
    return G;
}

test('Klo selects performances from local height, water and footholds across all three scenes', () => {
    const cases = [
        ['land', 21600, -70, 'ground', 'sand'],
        ['land', 20300, -20, 'ground', 'pool'],
        ['land', 17500, -180, 'ground', 'wood'],
        ['land', 10900, -160, 'ground', 'grass'],
        ['land', 5000, -1200, 'ground', 'grass'],
        ['land', 1100, -800, 'ground', 'cliff'],
        ['kelp', 3000, 1120, 'swim', 'kelp'],
        ['kelp', 5180, 2280, 'swim', 'vault'],
        ['kelp', 7200, 1680, 'swim', 'current'],
        ['viken', 3000, -124, 'ground', 'pier'],
        ['viken', 5800, -1460, 'ground', 'gallery'],
        ['viken', 3000, 850, 'swim', 'current']
    ];
    for (const [scene, x, y, mode, kind] of cases) {
        const G = at(scene, x, y, mode), arrival = describeKloArrival(G);
        assert.equal(arrival.kind, kind, `${scene} at ${x},${y}`);
        assert.equal(arrival.underwater, mode === 'swim');
        assert.equal(arrival.portrait, false);
        assert.ok(!G.terrain.insideSolid(arrival.x, arrival.y, 4), 'a real, empty space');
        if (mode === 'ground') assert.ok(Math.abs(G.terrain.groundNear(arrival.x, arrival.y) - arrival.y) < 0.1);
    }
});

test('visible arrivals fit phone viewports and do not move or advance any simulation state', () => {
    for (const [width, height] of [[844, 390], [390, 844]]) {
        for (const G of [at('land', 21600, -70), at('kelp', 3000, 1120, 'swim'), at('viken', 5800, -1460)]) {
            G.player.hidden = true; G.player.vx = 193; G.player.vy = -88;
            const cam = { x: G.player.x, y: G.player.y - 100, zoom: 0.65 };
            const before = JSON.stringify({ player: G.player, puz: G.puz, flags: [...G.flags], time: G.time, actors: G.actors });
            const a = describeKloArrival(G, { cam, width, height });
            const sx = width / 2 + (a.x - cam.x) * cam.zoom, sy = height / 2 + (a.y - cam.y) * cam.zoom;
            assert.ok(sx >= 56 && sx <= width - 56, 'clear of side controls');
            assert.ok(sy >= 78 && sy <= height - 64, 'clear of top and bottom controls');
            assert.equal(before, JSON.stringify({ player: G.player, puz: G.puz, flags: [...G.flags], time: G.time, actors: G.actors }));
        }
    }
});

test('the lesson keeps Klo at his actual hole and offers a portrait when offscreen', () => {
    const G = at('land', 21500, -80); G.flags.delete('rule_demo');
    G.actors.klo = { scene: 'land', visible: true, x: 21240, y: -82, inHole: true, facing: 1 };
    const actual = { ...G.actors.klo };
    const visible = describeKloArrival(G);
    assert.equal(visible.kind, 'hole'); assert.equal(visible.tutorial, true);
    assert.equal(visible.x, actual.x); assert.equal(visible.y, actual.y);
    G.player.x = 18000;
    assert.equal(describeKloArrival(G).portrait, true);
    assert.deepEqual(G.actors.klo, actual);
    assert.equal(G.flags.has('klo_ja'), false);
});

test('a nearby visible professor greets in place; no second entrance or relocation', () => {
    const G = at('land', 21600, -70);
    G.actors.klo = { scene: 'land', visible: true, x: 21450, y: -78, facing: 1 };
    const a = describeKloArrival(G);
    assert.equal(a.kind, 'nearby'); assert.equal(a.nearby, true);
    assert.equal(a.x, G.actors.klo.x); assert.equal(a.y, G.actors.klo.y);
    const m = sampleKloArrival({ ...a, progress: 0.5, time: 0.5 });
    assert.equal(m.x, 0); assert.equal(m.y, 0); assert.equal(m.alpha, 1);
    assert.ok(m.eyeLift[0] > 3, 'his eyes acknowledge the call');
});

test('Klo stays on this side of cliffs, closed rails, the dark arch and puzzle objects', () => {
    const cliff = at('land', 1560, -800), c = describeKloArrival(cliff);
    assert.ok(c.x < 1590, 'does not cross the cleft');
    const rail = at('viken', 4760, -124), r = describeKloArrival(rail);
    assert.ok(r.x < 4830, 'does not cross the closed pier rail');
    const dark = at('kelp', 5080, 2280, 'swim'), d = describeKloArrival(dark);
    assert.ok(d.x < 5160, 'does not appear beyond the unlit vault mouth');
    const gallery = at('viken', 5630, -1460), g = describeKloArrival(gallery);
    assert.ok(Math.abs(g.x - 5720) >= 74, 'does not cover the puzzle rope');
    const plate = at('viken', 2840, 1372, 'swim'), p = describeKloArrival(plate);
    assert.ok(Math.abs(p.x - 2840) >= 204 || Math.abs(p.y - 1372) >= 100, 'leaves the plate readable');
});

test('narrow airborne positions use a visible paper perch rather than an imaginary floor', () => {
    const G = at('land', 21000, -80);
    G.player.y = -1900; G.player.mode = 'air';
    const a = describeKloArrival(G);
    assert.equal(a.kind, 'margin'); assert.equal(a.portrait, true);
    assert.ok(Math.abs(a.y - G.player.y) < 200);
});

test('entrances stage eyes, claws and body differently, then settle exactly at their anchor', () => {
    const kinds = ['sand', 'pool', 'wood', 'grass', 'cliff', 'kelp', 'vault', 'current', 'pier', 'gallery', 'nearby', 'hole', 'margin'];
    for (const kind of kinds) {
        for (const variant of [0, 1]) {
            for (const leaving of [false, true]) for (let i = 0; i <= 20; i++) {
                const c = Object.freeze({ kind, variant, leaving, progress: i / 20, time: i / 12, facing: -1 });
                const m = sampleKloArrival(c);
                for (const key of ['x', 'y', 'tilt', 'alpha', 'body', 'activity', 'particles']) assert.ok(Number.isFinite(m[key]), `${kind}/${key}`);
                assert.ok(Math.abs(m.x) <= 92 && Math.abs(m.y) <= 61);
                assert.ok(m.alpha >= 0 && m.alpha <= 1);
            }
            const done = sampleKloArrival({ kind, variant, progress: 1, time: 6 });
            assert.ok(Math.abs(done.x) < 1e-8 && Math.abs(done.y) < 1e-8 && Math.abs(done.tilt) < 1e-8, 'settled local transform');
        }
    }
    const sand = sampleKloArrival({ kind: 'sand', progress: 0.18 });
    assert.equal(sand.y, 55); assert.equal(sand.mask, true); assert.ok(sand.eyeLift[0] > 1.5);
    const hoist = sampleKloArrival({ kind: 'gallery', progress: 0.2 });
    assert.ok(Math.abs(hoist.arms[0]) > 1 && Math.abs(hoist.arms[1]) > 1, 'claws precede body');
    assert.ok(hoist.arms[0] > 0 && hoist.arms[1] < 0 && hoist.armLift[0] > 20, 'both claws reach upward to the deck');
    assert.notEqual(sampleKloArrival({ kind: 'current', progress: 0.25 }).tilt, sampleKloArrival({ kind: 'current', progress: 0.75 }).tilt);
});

test('reduced motion uses a static readable pose and fade with no travel, spin or debris', () => {
    for (const kind of ['sand', 'gallery', 'grass', 'kelp', 'current']) for (const progress of [0, 0.2, 0.7, 1]) {
        const m = sampleKloArrival({ kind, progress, time: 0.7 }, { reducedMotion: true });
        assert.deepEqual([m.x, m.y, m.tilt, m.activity, m.particles, m.foliage, m.fluff], [0, 0, 0, 0, 0, 0, 0]);
        assert.equal(m.mask, false);
        if (progress === 1) assert.equal(m.alpha, 1);
    }
});
