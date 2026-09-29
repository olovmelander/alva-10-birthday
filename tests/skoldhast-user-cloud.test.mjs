import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { CLOUD_PENCILS, cloudColor, cloudPoints, paintUserCloud } from '../skoldhast/src/user-cloud.mjs';

const outline = [[40, 65], [30, 48], [43, 30], [60, 34], [74, 21], [92, 34], [112, 31], [130, 48], [119, 65], [40, 65]];
function render(color) {
    const canvas = createCanvas(180, 100), ctx = canvas.getContext('2d');
    paintUserCloud(ctx, outline, { color });
    return { canvas, pixels: ctx.getImageData(0, 0, 180, 100).data };
}
test('every saved cloud pencil has deterministic, distinct pigment inside the player outline', () => {
    const outputs = new Set();
    for (const { id } of CLOUD_PENCILS) {
        const first = render(id), again = render(id);
        assert.deepEqual(first.pixels, again.pixels, `${id} survives texture reconstruction exactly`);
        const center = (50 * 180 + 80) * 4;
        assert.equal(first.pixels[center + 3] > 0, id !== 'paper', 'old paper clouds remain outline-only');
        assert.equal(first.pixels[(90 * 180 + 170) * 4 + 3], 0, 'pigment stays inside the drawn silhouette');
        outputs.add(first.canvas.toBuffer('image/png').toString('base64'));
    }
    assert.equal(outputs.size, CLOUD_PENCILS.length);
});
test('legacy and malformed cloud saves have bounded, validated texture input', () => {
    for (const invalid of [undefined, null, '#ff0000', '__proto__', {}, 1]) assert.equal(cloudColor(invalid), 'paper');
    assert.equal(cloudColor('lavender'), 'lavender');
    assert.deepEqual(cloudPoints(null), []);
    assert.deepEqual(cloudPoints([[1, 2], [NaN, 4], [9e8, 1], [3, 4, 7], 'bad']), [[1, 2], [3, 4]]);
    const input = Array.from({ length: 2400 }, (_, i) => [i / 12, 80 + Math.sin(i * .3) * 20]);
    const kept = cloudPoints(input);
    assert.ok(kept.length <= 200);
    assert.deepEqual(kept[0], input[0]); assert.deepEqual(kept.at(-1), input.at(-1));
});
