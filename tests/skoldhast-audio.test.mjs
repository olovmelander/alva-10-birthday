import test from 'node:test';
import assert from 'node:assert/strict';
import { __dsp, SURFACES, SFX, createAudio } from '../skoldhast/src/audio.mjs';

const SR = 24000;
const rng = () => __dsp.mulberry32(17);
const energy = (x, from = 0) => x.subarray(Math.floor(from * SR)).reduce((sum, v) => sum + v * v, 0);

test('synthesized cues and every hoof material produce finite, bounded buffers with quiet endings', () => {
    const sounds = Object.entries(__dsp.SFX_RENDER).filter(([, render]) => render).map(([name, render]) => [name, render(SR, rng(), {})]);
    for (const surface of SURFACES) for (const speed of [0.25, 1]) sounds.push([surface + ':' + speed, __dsp.renderHoof(SR, rng(), surface, speed)]);
    for (const [name, result] of sounds) {
        for (const ch of result.ch) {
            assert.ok(ch.length > 0 && energy(ch) > 0, name + ' has audible samples');
            for (const v of ch) assert.ok(Number.isFinite(v) && Math.abs(v) <= 1, name + ' has safe sample values');
            assert.ok(Math.abs(ch[ch.length - 1]) < 0.0001, name + ' fades at its end');
        }
    }
    assert.ok(SFX.includes('ui') && SFX.includes('crabvoice'));
});

test('hollow piers ring longer than ordinary planks; soft and hard contacts differ', () => {
    const wood = __dsp.renderHoof(SR, rng(), 'plank', 0.8).ch[0];
    const pier = __dsp.renderHoof(SR, rng(), 'pier', 0.8).ch[0];
    assert.ok(energy(pier, 0.12) / energy(pier) > energy(wood, 0.12) / energy(wood) * 2, 'a pier has an audible hollow body after the initial contact');
    const soft = __dsp.renderHoof(SR, rng(), 'sand', 0.25).ch[0];
    const hard = __dsp.renderHoof(SR, rng(), 'sand', 1).ch[0];
    assert.notDeepEqual(soft, hard, 'speed changes the material contact, not just playback rate');
});

test('audio absence keeps the environment and effects API safe', async () => {
    const audio = createAudio();
    await audio.ready;
    audio.setEnvironment('beach');
    audio.setVolumes({ voice: 0 });
    audio.sfx('crabvoice');
    audio.dispose();
});
