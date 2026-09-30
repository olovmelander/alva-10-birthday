import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landPuzzleFrame, fitLandPuzzleFrame } from '../skoldhast/src/land-puzzle-focus.mjs';

test('every land explanation keeps the complete obstacle above its measured dialogue in either orientation', () => {
    for (const [width, height, dialogue] of [[844, 390, { top: 282, width: 790, height: 96 }], [390, 844, { top: 603, width: 370, height: 220 }]]) {
        for (const id of ['bridge', 'pool', 'ramp', 'waveMarks', 'leap', 'landmark']) {
            const frame = fitLandPuzzleFrame(landPuzzleFrame(id), width, height, [dialogue, { top: 8, width: 190, height: 54 }]);
            const pad = frame.insets, zoom = Math.min((width - pad.left - pad.right) / (frame.x1 - frame.x0), (height - pad.top - pad.bottom) / (frame.y1 - frame.y0));
            const cy = (frame.y0 + frame.y1) / 2 + (pad.bottom - pad.top) / (2 * zoom);
            const top = (frame.y0 - cy) * zoom + height / 2, bottom = (frame.y1 - cy) * zoom + height / 2;
            assert.ok(top >= 79.99, `${id}: clear of the HUD`);
            assert.ok(bottom <= dialogue.top - 17.99, `${id}: clear of the dialogue`);
            assert.ok(zoom > 0 && Number.isFinite(zoom));
        }
    }
});

test('pool focus includes the real and reflected stone, plank and doorway; fitting does not alter authored bounds', () => {
    const frame = landPuzzleFrame('pool'), before = { ...frame };
    for (const [x, y] of [[100.1, -.1], [101.9, -.1], [101.9, .8], [104.6, -.43], [102.93, .15]]) {
        assert.ok(x * 200 >= frame.x0 && x * 200 <= frame.x1);
        assert.ok(y * 200 >= frame.y0 && y * 200 <= frame.y1);
    }
    fitLandPuzzleFrame(frame, 390, 844);
    for (const key of ['x0', 'y0', 'x1', 'y1']) assert.equal(frame[key], before[key]);
    assert.throws(() => landPuzzleFrame('typo'), /Unknown/);
});
