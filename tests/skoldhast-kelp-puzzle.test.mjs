import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot } from './skoldhast-robot.mjs';
import { kelpFragment } from './skoldhast-kelp-route.mjs';
import { p6Pose, p6Progress } from '../skoldhast/src/kelp-puzzle.mjs';
import { HL } from '../skoldhast/src/sim.mjs';

const flags = ['intro_done', 'ch1_end', 'ch2_open', 'p5_lit'];
function stage(extra = [], at = [38.8, 9.75]) {
    const R = createRobot();
    R.G.story = null; // exercise real physics and puzzle interactions without story presentation
    R.G.restore({ flags: [...flags, ...extra], checkpoint: 'trench' });
    R.G.goto('kelp', { x: at[0] * HL, y: at[1] * HL, mode: 'swim' });
    return R;
}
async function pullFree(R) {
    await R.swimTo(38.8, 9.75, { tol: .15 });
    await R.context('p6-grab');
    await R.flag('p6_kelp_freed', { x: 1, y: -.2 }, 15);
}

for (const at of [[33.2, 9.2], [36, 7.3], [39, 8.4]]) test(`hiding at ${at} cannot solve the kelp knot or remotely collect its fragment`, async () => {
    const R = stage([], at);
    await R.hide(); await R.hold(20);
    for (const flag of ['p6_kelp_freed', 'p6_flat', 'mark_sea']) assert.equal(R.has(flag), false, flag);
    assert.equal(p6Progress(R.G).phase, 'free-kelp');
    assert.equal(p6Pose(R.G).flat, 0);
    await R.hide(); await R.hold(1, { x: -1, y: -1 });
    assert.equal(R.p().hidden, false, 'the failed attempt never traps the swimmer');
});

test('grabbing kelp needs real outward swimming, and release, hiding and reload cancel an unfinished pull', async () => {
    const R = stage();
    await R.context('p6-grab');
    assert.equal(p6Progress(R.G).phase, 'pull-kelp');
    await R.hold(4);
    assert.equal(R.has('p6_kelp_freed'), false, 'waiting after grabbing does not pull the frond');
    await R.hold(.2, { x: -1 });
    assert.equal(R.has('p6_kelp_freed'), false, 'swimming toward the knot cannot release it');
    await R.context('p6-release');
    assert.equal(p6Progress(R.G).phase, 'free-kelp');
    await R.swimTo(38.8, 9.75, { tol: .15 });
    await R.context('p6-grab'); await R.hide();
    assert.equal(p6Pose(R.G).pulling, false, 'hiding drops the kelp immediately');
    await R.hide(); await R.swimTo(38.8, 9.75, { tol: .15 });
    await R.context('p6-grab');
    const saved = R.G.serialize();
    const resumed = stage(); resumed.G.restore(saved);
    assert.equal(p6Progress(resumed.G).phase, 'free-kelp');
    assert.equal(p6Pose(resumed.G).pulling, false, 'a saved grab never becomes an invisible tether');
    await resumed.swimTo(30, 8); // take the open water above the vault roof
    await pullFree(resumed);
    assert.ok(resumed.has('p6_kelp_freed'));
    assert.equal(resumed.has('p6_flat'), false);
    assert.equal(p6Progress(resumed.G).phase, 'reach-fold');
});

test('shell pressure lowers the actual paper gradually, and leaving contact cannot complete the fold', async () => {
    const R = stage(); await pullFree(R);
    await R.swimTo(35.8, 7.3, { tol: .2 }); await R.hide();
    await R.until(() => p6Pose(R.G).flat > .05, {}, 25, 'shell contacts the paper crest');
    const pressed = p6Pose(R.G).flat, y = R.p().y;
    assert.ok(pressed < .4 && !R.has('p6_flat'), 'initial contact cannot flatten the whole paper');
    await R.hold(.3);
    assert.ok(p6Pose(R.G).flat > pressed, 'the drawn fold is the live pressure state');
    assert.ok(R.p().y > y, 'the heavy shell descends with its supporting fold');
    const beforeLeaving = p6Pose(R.G).flat;
    await R.hide(); await R.swimTo(40.5, 6.8); await R.hold(5);
    assert.equal(R.has('p6_flat'), false, 'elapsed time away from the paper does not finish it');
    assert.ok(p6Pose(R.G).flat <= beforeLeaving, 'pressure never advances remotely');
    assert.equal(R.has('mark_sea'), false);
    const saved = R.G.serialize();
    const resumed = stage(); resumed.G.restore(saved);
    assert.ok(resumed.has('p6_kelp_freed'), 'the successfully freed frond stays freed');
    assert.equal(p6Progress(resumed.G).phase, 'reach-fold');
    assert.equal(p6Pose(resumed.G).flat, 0, 'an incomplete pressure animation restarts consistently after reload');
});

test('freeing kelp, pressing the fold and emerged pickup are three distinct physical commitments', async () => {
    const R = stage();
    await kelpFragment(R);
    const releases = R.events.filter(e => e.type === 'kelpFreed');
    const presses = R.events.filter(e => e.type === 'flattened' && e.id === 'corner');
    const pickups = R.events.filter(e => e.type === 'mark' && e.id === 'mark_sea');
    assert.equal(releases.length, 1); assert.equal(presses.length, 1); assert.equal(pickups.length, 1);
    assert.ok(presses[0].t >= releases[0].t + 3, 'a real sustained shell press follows the pull');
    assert.ok(pickups[0].t > presses[0].t, 'the released fragment must still be reached');
    assert.equal(p6Progress(R.G).phase, 'complete');
    assert.equal(p6Pose(R.G).fragment.collected, true);
    assert.equal(R.p().hidden, false);
    await R.hold(3);
    assert.equal(R.events.filter(e => e.type === 'mark' && e.id === 'mark_sea').length, 1);
});

test('the released current carries a shell to the fold, and emerging there still requires swimming to the loose paper', async () => {
    const R = stage(); await pullFree(R);
    await R.hold(.3); await R.hide();
    await R.flag('p6_flat', {}, 30);
    assert.equal(R.has('mark_sea'), false);
    const source = p6Pose(R.G).fragment;
    assert.ok(source.x - R.p().x > R.G.scenes.kelp.kelpPuzzle.fragment.pickupRadius,
        'the fragment leaves the outer crease clear of an emerging shell');
    await R.hide(); await R.hold(5);
    assert.equal(R.has('mark_sea'), false, 'ordinary emergence beside the flattened fold does not collect remotely');
    const waiting = p6Pose(R.G).fragment;
    assert.equal(waiting.rise, 1);
    assert.equal(waiting.x, 39.5 * HL); assert.equal(waiting.y, 7.1 * HL);
    await R.swimTo(39.5, 7.1, { tol: .2 }); await R.flag('mark_sea', {}, 5);
    assert.equal(p6Progress(R.G).phase, 'complete');
});

test('a saved flat fold leaves a visible loose fragment that only nearby emerged swimming can collect', async () => {
    const R = stage(['p6_flat'], [33.2, 9.2]);
    assert.equal(p6Progress(R.G).phase, 'collect-fragment');
    const fragment = p6Pose(R.G).fragment;
    assert.ok(fragment.visible && !fragment.collected);
    assert.equal(fragment.x, 39.5 * HL); assert.equal(fragment.y, 7.1 * HL);
    await R.hold(5);
    assert.equal(R.has('mark_sea'), false, 'an older flat save never receives remote inventory');
    R.G.goto('kelp', { x: fragment.x, y: fragment.y, mode: 'swim', hidden: true });
    await R.hold(1);
    assert.equal(R.has('mark_sea'), false, 'a hidden shell cannot pick up the paper');
    await R.hide(); await R.swimTo(39.5, 7.1, { tol: .2 });
    await R.flag('mark_sea', {}, 5);
    assert.equal(p6Progress(R.G).phase, 'complete');
    const saved = R.G.serialize();
    const resumed = stage(); resumed.G.restore(saved);
    assert.equal(p6Progress(resumed.G).phase, 'complete');
    assert.equal(p6Pose(resumed.G).fragment.collected, true);
    const legacy = stage(['p6_flat', 'mark_sea']);
    assert.equal(p6Progress(legacy.G).phase, 'complete');
    assert.equal(p6Pose(legacy.G).fragment.visible, false, 'older already-collected saves never duplicate the paper');
});
