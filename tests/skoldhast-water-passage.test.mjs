import test from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { SCENES, SEA_BAY_LINK } from '../skoldhast/src/content/world.mjs';
import { heightOn } from '../skoldhast/src/sim.mjs';
import { createWaterPassage, waterPassageLayout } from '../skoldhast/src/water-passage.mjs';

test('both sides repeat the headland motif beside the real swimming corridor', () => {
    for (const id of ['kelp', 'viken']) {
        const def = SCENES[id], before = JSON.stringify(def);
        const layout = waterPassageLayout(def);
        assert.equal(layout.waterTop, 0);
        assert.equal(layout.mouth.y, SEA_BAY_LINK.depth);
        assert.ok((layout.shoulder.x - layout.mouth.x) * layout.direction > 0,
            'the distant headland shoulder stays beyond the transition, never across its approach');
        for (const prop of [layout.shoulder, ...layout.pebbles, ...layout.fronds]) {
            assert.ok(def.surfaces.filter(s => !s.thin).some(s => heightOn(s.pts, prop.x) === prop.y),
                'the same stone and frond motifs must root in the authored shelf rather than float');
        }
        assert.equal(JSON.stringify(def), before, 'scenery must not change passage or collision data');
    }
});

test('the drawn connection rebuilds without destroying borrowed pencil material', () => {
    const texture = new PIXI.Texture({ source: new PIXI.TextureSource({ width: 128, height: 128 }) });
    for (const id of ['kelp', 'viken', 'kelp']) {
        const { container, layout } = createWaterPassage(PIXI, { def: SCENES[id], texture: () => texture });
        assert.equal(container.waterPassage, layout);
        assert.ok(container.children.some(c => c.label === 'headland-shale-shoulder'));
        assert.ok(container.children.some(c => c.label === 'headland-seabed-details'));
        container.destroy({ children: true });
        assert.equal(texture.destroyed, false);
        assert.equal(texture.source.destroyed, false);
    }
    texture.destroy(true);
});
