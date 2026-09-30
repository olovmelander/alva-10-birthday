import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { createMapFragmentProp, createGuardianMapPaper } from '../skoldhast/src/map-props.mjs';
import { MAP_FRAGMENTS, MAP_SCALE, fragmentPoints } from '../skoldhast/src/map-layout.mjs';
import { MAP } from '../skoldhast/src/content/sv.mjs';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} differs from ${expected}`);
const find = (node, label) => node.label === label ? node : node.children?.map(child => find(child, label)).find(Boolean);
const texture = (width, height) => new PIXI.Texture({ source: new PIXI.TextureSource({ width, height }) });

test('collectible paper uses every actual torn outline, at the requested width and ground anchor', () => {
    for (const fragment of MAP_FRAGMENTS) {
        const prop = createMapFragmentProp(PIXI, { texture: () => null, fragment, width: 148 });
        prop.position.set(400, 700);
        const paper = prop.children[0], points = fragmentPoints(fragment).map(([x, y]) => paper.toGlobal(new PIXI.Point(x, y)));
        const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x));
        close(right - left, 148);
        close((left + right) / 2, 400);
        close(Math.max(...points.map(p => p.y)), 700);
        // Neither the rest of the map nor an old circular compass enlarges the collectible.
        const bounds = prop.getLocalBounds();
        assert.ok(bounds.width < 153);
        assert.ok(bounds.maxY < 4);
        assert.equal(prop.label, `map-fragment-${fragment.id}`);
        prop.destroy({ children: true });
    }
});

test('late map art replaces the fallback in place without changing anchor or destroying shared art', () => {
    let available = null;
    const prop = createMapFragmentProp(PIXI, { texture: () => available, fragment: 'sea' });
    const before = prop.getLocalBounds().clone();
    assert.equal(prop.refreshTexture(), false);
    const shared = available = texture(1920, 1260);
    assert.equal(prop.refreshTexture(), true);
    const ink = find(prop, 'map-fragment-ink');
    assert.equal(ink.texture, shared);
    assert.equal(ink.visible, true);
    close(ink.scale.x, 1 / MAP_SCALE);
    const after = prop.getLocalBounds();
    for (const key of ['minX', 'maxX', 'minY', 'maxY']) close(after[key], before[key]);
    prop.destroy({ children: true });
    assert.equal(ink.destroyed, true);
    assert.equal(shared.destroyed, false, 'scene teardown must preserve the notebook and other fragments');
    assert.equal(prop.refreshTexture(), false);
    shared.destroy(true);
});

test('guardian close-up starts as LAND and HAV, and reveals STRAND only on request', () => {
    const paper = texture(512, 512);
    const map = createGuardianMapPaper(PIXI, { texture: () => paper });
    assert.deepEqual(map.bounds, { x0: 0, y0: 0, x1: 640, y1: 420 });
    const labels = map.container.children.filter(child => child instanceof PIXI.Text).map(child => child.text);
    assert.deepEqual(labels, [MAP.guardian.land, MAP.guardian.sea]);
    const shore = find(map.container, 'guardian-map-shore');
    assert.equal(shore.visible, false);
    assert.equal(shore.children.find(child => child instanceof PIXI.Text).text, MAP.guardian.shore);
    map.setShore(.4);
    assert.equal(shore.visible, true); close(shore.alpha, .4);
    map.setShore(2); close(shore.alpha, 1);
    map.setShore(0); assert.equal(shore.visible, false);
    map.container.destroy({ children: true });
    assert.equal(paper.destroyed, false);
    paper.destroy(true);
});
