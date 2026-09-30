import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutVaultDiscovery } from '../skoldhast/src/vault-discovery.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';
import { heightOn } from '../skoldhast/src/sim.mjs';

test('vault evidence fits the actual cave wall below the fish and above the swimmer route', () => {
    const scene = SCENES.kelp;
    const roof = scene.slabs.find(slab => slab.id === 'vault-roof').bottom;
    const ground = scene.surfaces.find(surface => surface.id === 'trench').pts;
    const x0 = roof[0][0], x1 = roof.at(-1)[0];
    const roofAt = x => heightOn(roof, x), groundAt = x => heightOn(ground, x);
    const layout = layoutVaultDiscovery({ x0, x1, roofAt, groundAt });
    for (const { x, y } of layout.route) {
        assert.ok(x > x0 && x < x1);
        assert.ok(y > roofAt(x) + 115, 'clear of the fish perches');
        assert.ok(y < groundAt(x) - 100, 'above the low swimming route');
    }
    for (const { x, y } of [...layout.fossils, ...layout.kelp, ...layout.pebbles])
        assert.ok(y > roofAt(x) && y < groundAt(x), 'details stay on the existing wall');
    for (const { x, y, r } of [
        { ...layout.spiral, r: layout.spiral.radius },
        { ...layout.fold, r: layout.fold.size }
    ]) {
        assert.ok(x - r > x0 && x + r < x1);
        assert.ok(y - r > roofAt(x) && y + r < groundAt(x));
    }
    assert.ok(layout.route[0].x < layout.spiral.x && layout.spiral.x < layout.fold.x);
    assert.ok(layout.fold.x < layout.route.at(-1).x, 'the fold clue points onward through the right mouth');
});
