import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleShoreTrial } from '../skoldhast/src/shore-trial.mjs';
import { createRobot } from './skoldhast-robot.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';

test('the coast must be repaired and visibly wet before the wave experiment proves anything', () => {
    assert.equal(sampleShoreTrial('folded', 10).flat, 0);
    assert.equal(sampleShoreTrial('flatten', 1).flat, 1);
    for (const lessMotion of [false, true]) {
        for (let t = 0; t < 5; t += .1) {
            const broken = sampleShoreTrial('wave', t, { lessMotion });
            assert.equal(broken.travel, 0); assert.equal(broken.wet, 0); assert.equal(broken.proven, false);
            const drawn = sampleShoreTrial('draw', t, { repaired: true, lessMotion });
            assert.equal(drawn.joined, true); assert.equal(drawn.proven, false);
            const wave = sampleShoreTrial('wave', t, { repaired: true, lessMotion });
            if (wave.proven) { assert.equal(wave.travel, 1); assert.equal(wave.wet, 1); assert.equal(wave.retreat, 1); }
            if (wave.done) assert.equal(wave.proven, true);
            if (lessMotion) assert.ok([0, .5, 1].includes(wave.travel));
        }
        const held = sampleShoreTrial('proof', 0, { repaired: true, lessMotion });
        assert.ok(held.proven && held.wet === 1 && held.joined);
    }
});

const flags = [...CODE_RESTORE[2].flags, 'ch3_open', 'viken_arrived', 'b:k3_arrive',
    'shutter1', 'shutter2', 'shutter3', 'lamp_lit', 'b:k3_lamp', 'kv_met', 'talk1',
    'b:k3_talk1', 'talk2', 'talk_done', 'b:k3_line', 'p8_land', 'p8_s1', 'p8_s2', 'p8_s3', 'p8_sea'];

for (const phase of ['drawing', 'drawn', 'unfolded']) {
    test(`a finale resumed at ${phase} reaches the original beach and commits completion before the table`, async () => {
        const R = createRobot();
        R.G.restore({ flags: [...flags, ...(phase !== 'drawing' ? ['p8_done'] : []), ...(phase === 'unfolded' ? ['unfolded'] : [])], checkpoint: 'lineWindow' });
        await R.until(() => R.log.some(e => e.kind === 'fx' && e.name === 'epilogue'), {}, 60, 'the table');
        assert.ok(R.has('ended') && R.has('plask') && R.has('b:k3_window'));
        assert.equal(R.G.checkpoint, 'beachEnd');
        assert.equal(R.G.sceneId, 'land');
        assert.ok(Math.abs(R.p().x / 200 - 108.6) < 1.5);
        assert.equal(R.has('final_run'), false);
        assert.equal(R.p().wet, 1, 'the promised splash really wets the coat');
        const lines = R.log.filter(e => e.kind === 'say').flatMap(e => e.lines.map(([, text]) => text));
        assert.equal(lines.includes(STORY.k3.lastStroke[1]), phase === 'drawing', 'saved drawings are never repeated');
        assert.equal(lines.includes(STORY.k3.waveReady[1]), phase !== 'unfolded', 'saved releases skip the already completed experiment');
        const arrival = lines.indexOf(STORY.final.arrival[1]), splash = lines.indexOf(STORY.final.splash[1]);
        assert.ok(arrival >= 0 && splash > arrival);
        assert.ok(R.log.some(e => e.kind === 'save' && e.checkpoint === 'beachEnd'));
        assert.equal(R.log.some(e => e.kind === 'fx' && e.name === 'vista'), false);
    });
}

test('an older completed save restores a moving sea without replaying the ending', async () => {
    const R = createRobot();
    R.G.restore({ flags: [...flags, 'p8_done', 'ended'], checkpoint: 'beachEnd' });
    await R.settle();
    assert.ok(R.has('plask'));
    assert.equal(R.log.some(e => e.kind === 'fx' && ['shoreTrial', 'epilogue'].includes(e.name)), false);
});
