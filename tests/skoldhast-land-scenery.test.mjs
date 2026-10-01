import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';
import { Terrain, heightOn, HL } from '../skoldhast/src/sim.mjs';
import { planLandScenery, createLandScenery } from '../skoldhast/src/land-scenery.mjs';

const def = SCENES.land, flags = new Set(['chapter2_available']);

test('land habitats use the exposed physical ground and stay put when distant ramps grow', () => {
    const terrain = new Terrain(def, flags);
    const initial = planLandScenery(def, { flags, surfaces: terrain.surfaces });
    assert.ok(initial.length > 0);
    assert.deepEqual(initial, planLandScenery(def, { flags, surfaces: terrain.surfaces }));
    assert.deepEqual(planLandScenery(SCENES.kelp), []);
    for (const plant of initial) {
        const ground = terrain.surfaces.find(s => s.id === plant.surfaceId);
        assert.equal(plant.y, heightOn(ground.pts, plant.x));
        const exposed = terrain.surfaces.filter(s => !s.thin && !s.hidden)
            .map(s => heightOn(s.pts, plant.x)).filter(y => y !== null);
        assert.equal(plant.y, Math.min(...exposed), 'roots cannot sit on a buried surface');
    }
    const growingFlags = new Set(flags);
    const growing = new Terrain(def, growingFlags);
    for (const [flag, ramp] of [['p3_t1', 'ramp1'], ['p3_t2', 'ramp2'], ['p3_t3', 'ramp3']]) {
        growingFlags.add(flag); growing.startRampGrowth(ramp); growing.refresh();
        for (const dt of [0, .2, 1]) {
            growing.advance(dt);
            assert.deepEqual(planLandScenery(def, { flags: growingFlags, surfaces: growing.surfaces }), initial,
                'a distant puzzle cannot rearrange the established habitats');
        }
    }
});

test('flora leaves the opening, pool puzzle, seed receivers and movable pin readable', () => {
    const plants = planLandScenery(def, { flags });
    const centers = [...def.clumps, ...def.tussocks, def.hillPuzzle.stone, def.hillPuzzle.stone.to];
    for (const plant of plants) {
        assert.ok(plant.x < 99 * HL, 'the opening beach and stone-pool scene retain their negative space');
        for (const center of centers) assert.ok(Math.abs(plant.x - center.x) >= HL,
            `${plant.id} cannot obscure a seed, receiver or movable pin`);
        for (const water of def.waters) assert.ok(!(plant.x > water.x0 && plant.x < water.x1 && plant.y > water.top));
    }
});

test('habitat updates cull and sway existing art without adding geometry, and teardown preserves textures', () => {
    const shared = new PIXI.Texture({ source: new PIXI.TextureSource({ width: 64, height: 64 }) });
    const scene = createLandScenery(PIXI, { def, flags, texture: () => shared });
    const groups = [...scene.container.children];
    const children = groups.flatMap(group => group.children);
    const graphics = children.filter(child => child.context).map(child => ({ child,
        context: child.context, instructions: [...child.context.instructions] }));
    for (let frame = 0; frame < 120; frame++) {
        scene.update({ cam: { x: frame * 180, y: -500, zoom: .7 }, width: 844, height: 390,
            time: frame / 10, lessMotion: frame % 2 === 0, evening: frame > 60 });
        assert.deepEqual(scene.container.children, groups);
        assert.deepEqual(groups.flatMap(group => group.children), children);
        for (const g of graphics) {
            assert.equal(g.child.context, g.context);
            assert.deepEqual(g.context.instructions, g.instructions, 'wind must not rebuild pencil geometry');
        }
    }
    const frame = { cam: { x: 60 * HL, y: -HL, zoom: .7 }, width: 844, height: 390, lessMotion: true };
    scene.update({ ...frame, time: 0 });
    const pose = () => groups.map(group => [group.visible, ...group.children.map(child => child.rotation)]);
    const still = pose();
    assert.ok(groups.some(group => group.visible) && groups.some(group => !group.visible));
    scene.update({ ...frame, time: 1000 });
    assert.deepEqual(pose(), still);
    scene.destroy(); scene.destroy();
    assert.ok(children.every(child => child.destroyed));
    assert.equal(shared.destroyed, false);
    shared.destroy(true);
});
