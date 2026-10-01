import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { createSeaFoldWall, seaFoldWallLayout, seaFoldFaceContinuation } from '../skoldhast/src/sea-fold-wall.mjs';

test('far sea paper continues beyond wide cameras without moving or stretching the authored crease', () => {
    const authored = seaFoldWallLayout({ x: 9520, top: -140, bottom: 1845, width: 430 });
    const original = structuredClone(authored);
    for (const right of [9800, 10000, 10600, 14000]) {
        const extension = seaFoldFaceContinuation(authored, right);
        assert.equal(extension.x0, authored.x + authored.width);
        assert.ok(extension.x1 >= right);
        assert.deepEqual(extension.points[0], authored.face[2]);
        assert.deepEqual(extension.points.at(-1), authored.face[3]);
        assert.deepEqual(authored, original, 'hinge, pale reverse, lip and original artwork retain their proportions');
    }
    const texture = new PIXI.Texture({ source: new PIXI.TextureSource({ width: 64, height: 64 }) });
    const wall = createSeaFoldWall(PIXI, { texture: () => texture, ...original });
    const paper = wall.container.children[0], face = wall.container.children[2], marks = wall.container.children[3];
    const originalInk = [paper, face, marks].map(g => g.context.instructions.slice());
    const extension = wall.container.children.find(g => g.label === 'sea-fold-face-continuation');
    for (const right of [10080, 12300, 10500]) {
        wall.extendTo(right);
        assert.ok(extension.seaFoldCoverage.x1 >= right);
        assert.deepEqual([paper, face, marks].map(g => g.context.instructions), originalInk, 'camera coverage cannot stretch the fish or crease');
        assert.deepEqual(wall.layout, original);
    }
    wall.destroy();
    assert.equal(texture.destroyed, false, 'scene removal leaves shared paper and water textures alive');
    texture.destroy(true);
});
