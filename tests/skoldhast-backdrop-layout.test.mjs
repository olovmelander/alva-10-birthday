import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';
import { backdropLayout, preserveBackdropState } from '../skoldhast/src/backdrop-layout.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('../skoldhast/assets/manifest.json', import.meta.url)));
const sizes = [[320, 568], [390, 844], [844, 390], [1440, 900]];
function input(definition, width, height, cam, extra = {}) {
    const dimensions = definition => ({ definition, textureWidth: manifest.images[definition.image].w,
        textureHeight: manifest.images[definition.image].h });
    return { ...dimensions(definition), width, height, cam, layers: (definition.layers || []).map(dimensions),
        depth: definition.under ? dimensions(definition.under) : null, waterTop: 0, ...extra };
}
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-7, `${message}: ${a} vs ${b}`);

test('the bay horizon stays at actual world water while its sky covers gallery and underwater cameras', () => {
    const bay = SCENES.viken.backdrop[0];
    for (const [width, height] of sizes) for (const y of [-1800, -700, 0, 1200, 2600]) {
        for (const vista of [false, true]) {
            const args = input(bay, width, height, { x: 5800, y, zoom: .7 }, { vista });
            const layout = backdropLayout(args), sky = layout.base;
            const waterY = height / 2 - y * .7;
            near(layout.layers[0].y + bay.horizon * args.textureHeight * sky.scale, waterY, 'painted and physical sea agree');
            near(layout.skyFloor, waterY, 'sky props use that same waterline');
            assert.ok(sky.x <= 0 && sky.x + args.textureWidth * sky.scale >= width);
            assert.ok(sky.y <= 0 && sky.y + args.textureHeight * sky.scale >= height);
            assert.equal(layout.depths.visible, !vista && waterY < height);
            if (layout.depths.below) {
                assert.ok(layout.depths.below.y <= layout.depths.y + layout.depths.height);
                near(layout.depths.below.y + layout.depths.below.height, height, 'depth underlay reaches the screen bottom');
            }
        }
    }
});

test('portrait backgrounds retain full width and the opening picture keeps its original centred fit', () => {
    for (const scene of Object.values(SCENES)) for (const definition of scene.backdrop) {
        for (const [width, height] of sizes) for (const x of [definition.x0, (definition.x0 + definition.x1) / 2, definition.x1]) {
            const args = input(definition, width, height, { x, y: -600, zoom: .525 });
            const layout = backdropLayout(args);
            assert.ok(layout.base.x <= 1e-8 && layout.base.x + args.textureWidth * layout.base.scale >= width - 1e-8);
            for (const layer of layout.layers) assert.ok(layer.x <= 1e-8 && layer.x + layer.width >= width - 1e-8);
            for (const fill of [layout.underlay, ...layout.layers.map(layer => layer.below)].filter(Boolean)) {
                assert.equal(fill.x, 0); assert.equal(fill.width, width);
                near(fill.y + fill.height, height, 'continuation fills the lower edge');
            }
            const picture = backdropLayout({ ...args, picture: true });
            const scale = Math.max(width / args.textureWidth, height / args.textureHeight);
            near(picture.base.scale, scale, 'the prologue keeps the authored image scale');
            near(picture.base.x, (width - args.textureWidth * scale) / 2, 'centred picture x');
            near(picture.base.y, (height - args.textureHeight * scale) / 2, 'centred picture y');
        }
    }
});

test('a picture render restores every backdrop layer, tile and live graphics context exactly', () => {
    const texture = new PIXI.Texture({ source: new PIXI.TextureSource({ width: 64, height: 32 }) });
    const alternate = new PIXI.Texture({ source: new PIXI.TextureSource({ width: 128, height: 64 }) });
    const sprite = () => new PIXI.Sprite(texture);
    const fill = () => new PIXI.Graphics().rect(0, 7, 844, 383).fill({ color: 0x123456, alpha: .4 });
    const sky = sprite(); sky._under = fill();
    const band = new PIXI.TilingSprite({ texture, width: 844, height: 200 }); band._below = fill();
    const depths = new PIXI.TilingSprite({ texture, width: 844, height: 390 }); depths._below = fill();
    sky._layers = [band]; sky._depths = depths;
    const nodes = [sky, sky._under, band, band._below, depths, depths._below];
    const read = node => ({ x: node.x, y: node.y, sx: node.scale.x, sy: node.scale.y,
        alpha: node.alpha, visible: node.visible, tint: node.tint, img: node._img, texture: node.texture,
        context: node.context, instructions: node.context ? [...node.context.instructions] : null,
        tile: node.tileScale ? [node.width, node.height, node.tileScale.x, node.tileScale.y, node.tilePosition.x, node.tilePosition.y] : null });
    nodes.forEach((node, i) => {
        node.position.set(i * 3, i * 17); node.scale.set(.8 + i / 10, .7 + i / 10);
        node.alpha = .7; node.visible = i % 2 === 0; node.tint = 0xddeeff; node._img = `live-${i}`;
        if (node.tileScale) { node.tileScale.set(.6, .8); node.tilePosition.set(-143, 32); }
    });
    const before = nodes.map(read), restore = preserveBackdropState([sky]);
    const temporary = nodes.filter(node => node.context).map(node => node.context);
    nodes.forEach(node => {
        node.position.set(999, 999); node.scale.set(3, 4); node.alpha = .1; node.visible = !node.visible; node.tint = 0x112233;
        node._img = 'picture';
        if (node.context) node.clear().rect(7, 9, 40, 80).fill({ color: 0xff0000 });
        else node.texture = alternate;
        if (node.tileScale) { node.width = 320; node.height = 568; node.tileScale.set(4, 5); node.tilePosition.set(40, 50); }
    });
    restore();
    assert.deepEqual(nodes.map(read), before);
    assert.ok(temporary.every(context => context.destroyed), 'temporary snapshot geometry is disposed');
    nodes.forEach(node => node.destroy({ children: true }));
    assert.equal(texture.destroyed, false); assert.equal(alternate.destroyed, false);
    texture.destroy(true); alternate.destroy(true);
});
