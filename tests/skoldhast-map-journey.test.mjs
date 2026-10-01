import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { createMapJourney, journeyRoute, pointAlong, sampleJourney, JOURNEY_TIMES } from '../skoldhast/src/map-journey.mjs';
import { MAP_ROUTES, MAP_HEART, MAP_TOWER } from '../skoldhast/src/map-layout.mjs';
import { describeThread } from '../skoldhast/src/story-thread.mjs';
import { THREAD } from '../skoldhast/src/content/sv.mjs';

test('the crossing follows the mended map from Kelphjärtat round to the tower, and back', () => {
    const toBay = journeyRoute('toBay'), toKelp = journeyRoute('toKelp');
    assert.deepEqual(toBay.at(-1), MAP_ROUTES.sea.at(-1), 'it ends at the route\'s own end by the tower');
    assert.ok(Math.hypot(toBay.at(-1)[0] - MAP_TOWER.x, toBay.at(-1)[1] - MAP_TOWER.y) < 20);
    assert.ok(Math.hypot(toBay[0][0] - MAP_HEART.x, toBay[0][1] - MAP_HEART.y) < 20, 'it starts at Kelphjärtat');
    assert.deepEqual(toKelp, toBay.slice().reverse(), 'the way back is the same leg reversed');
    const half = pointAlong(toBay, .5);
    assert.ok(half.travelled.length >= 2);
    assert.deepEqual(pointAlong(toBay, 0).travelled.at(-1), toBay[0]);
    assert.deepEqual(pointAlong(toBay, 1).travelled.at(-1), toBay.at(-1));
});

test('the journey needs no input or reading: it arrives, travels, holds and leaves by itself', () => {
    const total = JOURNEY_TIMES.arrive + JOURNEY_TIMES.travel + JOURNEY_TIMES.hold + JOURNEY_TIMES.depart;
    assert.equal(sampleJourney(0).phase, 'arrive');
    assert.equal(sampleJourney(0).under, 1, 'the sea left behind shows under the arriving map');
    assert.equal(sampleJourney(JOURNEY_TIMES.arrive + .01).under, 0);
    assert.ok(sampleJourney(JOURNEY_TIMES.arrive + JOURNEY_TIMES.travel / 2).travel > .3);
    assert.equal(sampleJourney(total + .01).done, true);
    assert.ok(total < 4.5, 'short enough not to feel like a wait');
    const still = sampleJourney(.3, { lessMotion: true });
    assert.equal(still.travel, 1, 'reduced motion shows the whole route at once');
    assert.ok(sampleJourney(10, { lessMotion: true }).done);
});

test('the journey overlay resolves on its own and frees the frame it was given', async () => {
    const under = PIXI.RenderTexture.create({ width: 8, height: 8 });
    const journey = createMapJourney(PIXI, { direction: 'toBay', under });
    journey.fit(844, 390);
    let finished = false; journey.done.then(() => { finished = true; });
    for (let i = 0; i < 400 && !finished; i++) { journey.update(1 / 60); await null; }
    assert.equal(finished, true);
    journey.destroy();
    assert.equal(under.destroyed, true);
    assert.equal(journey.container.destroyed, true);
});

test('every step of the story names its next purpose on the goal note, never how', () => {
    const stages = ['start', 'map', 'reflection', 'waves', 'survey', 'investigate', 'landEarly', 'land', 'sea', 'pieces', 'tower', 'fear', 'proof', 'end'];
    for (const stage of stages) assert.ok(THREAD.now[stage]?.length > 8, `${stage} has a purpose line`);
    const now = flags => describeThread(new Set(flags), 'explore').now;
    assert.equal(now([]), THREAD.now.start);
    assert.equal(now(['rule_demo', 'ch1_end']), THREAD.now.investigate);
    assert.equal(now(['rule_demo', 'mark_land']), THREAD.now.landEarly, 'a land piece before the cave is not yet a search');
    assert.equal(now(['rule_demo', 'ch1_end', 'ch2_open', 'mark_land']), THREAD.now.land);
    assert.equal(now(['ch2_end']), THREAD.now.tower);
    for (const line of Object.values(THREAD.now)) assert.ok(!/tryck|knapp|galoppera över|simma till/i.test(line), `"${line}" says why, not how`);
});
