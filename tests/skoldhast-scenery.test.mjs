import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { createAtmosphere, createWaterLight } from '../skoldhast/src/scenery.mjs';
import { kelpGardenLayout } from '../skoldhast/src/underwater-garden.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';
import { heightOn, HL } from '../skoldhast/src/sim.mjs';

const pose = view => view.children.map(child => [child.visible, child.x, child.y, child.scale.x, child.scale.y, child.alpha]);
const base = { cam: { x: 1000, y: 300, zoom: .7 }, width: 844, height: 390, time: 0 };

test('surface highlights and underwater atmosphere reuse a fixed geometry pool across camera travel', () => {
    for (const effect of [createWaterLight(PIXI, { x0: 0, x1: 4000, top: 0 }), createAtmosphere(PIXI, { scene: 'kelp' })]) {
        const children = [...effect.view.children];
        const geometry = children.map(child => ({ context: child.context, instructions: [...child.context.instructions] }));
        for (let frame = 0; frame < 120; frame++) {
            effect.update({ ...base, time: frame / 5, cam: { x: frame * 50 - 1000, y: frame % 3 * 300, zoom: .7 },
                lessMotion: frame % 3 === 0, evening: frame > 60 });
            assert.deepEqual(effect.view.children, children);
            children.forEach((child, i) => {
                assert.equal(child.context, geometry[i].context);
                assert.deepEqual(child.context.instructions, geometry[i].instructions);
            });
        }
        effect.view.destroy({ children: true });
        assert.ok(children.every(child => child.destroyed));
    }
});

test('water light stays inside its shore edges and stops for frozen sea or reduced motion', () => {
    const water = { x0: 413, x1: 1247, top: 0 }, light = createWaterLight(PIXI, water);
    const frame = { ...base, cam: { x: 830, y: 0, zoom: .7 } };
    for (const mode of [{ frozen: true }, { lessMotion: true }]) {
        light.update({ ...frame, ...mode });
        const still = pose(light.view);
        assert.ok(light.view.visible && light.view.children.some(child => child.visible));
        for (const mark of light.view.children.filter(child => child.visible)) {
            assert.ok(mark.x - mark.scale.x / 2 >= water.x0 && mark.x + mark.scale.x / 2 <= water.x1);
            assert.ok(mark.y > water.top, 'surface glints cannot enter the sky');
        }
        light.update({ ...frame, ...mode, time: 1000 });
        assert.deepEqual(pose(light.view), still);
    }
    light.update({ ...frame, cam: { x: 830, y: 2000, zoom: .7 } });
    assert.equal(light.view.visible, false, 'offscreen waterline does not leave floating light');
    light.view.destroy({ children: true });
    const atmosphere = createAtmosphere(PIXI, { scene: 'kelp' });
    atmosphere.update({ ...base, lessMotion: true });
    const still = pose(atmosphere.view);
    atmosphere.update({ ...base, time: 1000, lessMotion: true });
    assert.deepEqual(pose(atmosphere.view), still);
    const marks = atmosphere.view.children.slice(atmosphere.view.atmosphere.rays);
    assert.ok(marks.filter(mark => mark.visible).every(mark => mark.y > 0));
    atmosphere.view.destroy({ children: true });
});

test('kelp habitats are deterministic, rooted below roofs and leave the real puzzle path clear', () => {
    const def = SCENES.kelp;
    const groundAt = x => {
        const ys = def.surfaces.filter(s => !s.thin).map(s => heightOn(s.pts, x)).filter(y => y !== null);
        return ys.length ? Math.min(...ys) : null;
    };
    const roofAt = x => {
        const ys = def.slabs.map(s => heightOn(s.bottom, x)).filter(y => y !== null);
        return ys.length ? Math.max(...ys) : null;
    };
    let count = 0;
    for (const interval of def.decor.filter(item => item.kelp)) {
        const plants = kelpGardenLayout(def, interval, groundAt, roofAt);
        assert.deepEqual(plants, kelpGardenLayout(def, interval, groundAt, roofAt));
        assert.ok(plants.length <= interval.kelp);
        count += plants.length;
        for (const plant of plants) {
            assert.ok(plant.x >= interval.x0 && plant.x <= interval.x1);
            assert.equal(plant.fy, groundAt(plant.x));
            const roof = roofAt(plant.x);
            if (roof !== null) assert.ok(plant.fy - plant.H >= roof + .25 * HL - 1e-8);
            assert.ok(Math.abs(plant.x - def.school.home.x) >= .9 * HL);
            assert.ok(plant.x <= def.kelpPuzzle.tether.root.x - .45 * HL
                || plant.x >= def.kelpPuzzle.fragment.to.x + 1.35 * HL);
        }
    }
    assert.ok(count > 0);
    const interval = { kelp: 9, x0: 0, x1: 10 * HL };
    assert.deepEqual(kelpGardenLayout(def, interval, () => null), [], 'plants cannot hang over a missing floor');
    assert.deepEqual(kelpGardenLayout(def, interval, () => 100, () => 0), [], 'an opening too short for a frond stays open');
});
