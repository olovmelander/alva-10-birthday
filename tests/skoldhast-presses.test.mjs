import test from 'node:test';
import assert from 'node:assert/strict';
import { createPressQueue } from '../skoldhast/src/presses.mjs';

test('action edges survive rendered frames with no 120 Hz simulation step', () => {
    for (const fps of [30, 60, 120, 144, 240]) {
        const q = createPressQueue(); let acc = 0, actions = 0, hides = 0;
        for (let frame = 0; frame < fps; frame++) {
            q.push(frame === 0 ? { act: true, hide: true } : {});
            acc += 1/fps;
            while (acc + 1e-9 >= 1/120) {
                const e = q.consume(); actions += !!e.act; hides += !!e.hide;
                acc -= 1/120;
            }
        }
        assert.equal(actions, 1, `${fps} Hz action delivered exactly once`);
        assert.equal(hides, 1, `${fps} Hz hide delivered exactly once`);
    }
});

test('entering a panel or pause drops unconsumed gameplay presses', () => {
    const q = createPressQueue(); q.push({ act: true, tapHero: true }); q.clear();
    assert.deepEqual(q.consume(), {});
});
