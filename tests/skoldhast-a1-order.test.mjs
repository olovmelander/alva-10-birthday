/*
 * Äventyr 1: what a jump, or running ahead in the first minutes, must not get past.
 * Walls hold in the air as well as on the ground, and the sköldhäst does not leave Klo
 * on the beach before he has shown the map's rule that the whole story stands on.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot, HL } from './skoldhast-robot.mjs';
import { BALK, STORY } from '../skoldhast/src/content/sv.mjs';

/** One step with a real jump (the robot's own step never presses Hoppa). */
const stepHop = async (R, x) => { R.G.step({ x, y: 0, hop: true, hopHeld: true }); await new Promise(r => setImmediate(r)); };

function start(flags = [], scene = 'land', spot = 'start') {
    const R = createRobot();
    R.G.flag('intro_done');
    for (const f of flags) R.G.flags.add(f);
    R.G.goto(scene, spot);
    return R;
}
const KLO_DONE = ['klo_hidden', 'klo_ja', 'rule_demo', 'b:k1_enter', 'b:k1_stopwatch', 'b:k1_ja', 'b:k1_mapcorner'];

test('a running jump does not pass the bolted jetty gate, and the gate says why', async () => {
    for (let x0 = 113.6; x0 < 115.2; x0 += 0.2) {
        const R = start(KLO_DONE, 'land', { x: 113.2 * HL, y: -0.16 * HL, facing: 1 }), { G } = R;
        await R.settle();
        let jumped = false;
        for (let i = 0; i < 480; i++) {
            if (!jumped && G.player.x >= x0 * HL) { jumped = true; await stepHop(R, 1); } else await R.step({ x: 1 });
            assert.ok(G.player.x < 115.2 * HL, `held at the gate, jumping from ${x0.toFixed(1)}`);
        }
    }
    const R = start(KLO_DONE, 'land', { x: 114.4 * HL, y: -0.16 * HL, facing: 1 });
    await R.settle();
    await R.until(() => R.G.player.x > 114.9 * HL, { x: 1 }, 3, 'towards the gate');
    await stepHop(R, 1);
    await R.until(() => R.events.some(e => e.type === 'balk' && e.reason === 'gate'), { x: 1 }, 3, 'the gate refuses');
});

test('a running jump does not leave the page at the west end of Klippudden', async () => {
    // the sim's own check lets go just above the ground, so a jump landing right at the edge used to pass it
    for (const [stick, near, far] of [[-1, 1.6, 3.8], [-0.45, 0.2, 2.2]]) {
        for (let from = far; from > near; from -= 0.1) {
            const R = start([...KLO_DONE, 'p1_inked', 'p4_leap', 'p4_plank', 'mark_land', 'b:k2_leap_purpose'], 'land', { x: 7 * HL, y: -4 * HL, facing: -1 }), { G } = R;
            await R.settle();
            await R.until(() => G.player.x < from * HL, { x: stick }, 8, 'run west');
            await stepHop(R, stick);
            for (let i = 0; i < 150; i++) {
                await R.step({ x: stick });
                assert.ok(G.player.x >= -0.61 * HL, `stopped at the page's end, jumping from ${from.toFixed(1)}`);
            }
        }
    }
});

test('the sköldhäst waits for Klo: he wants to see the gallop first', async () => {
    const R = start(), { G } = R;
    await R.settle();
    // a walk past him: the stopwatch never starts
    await R.walkTo(95, { max: 40 });
    await R.settle();
    await R.until(() => R.events.some(e => e.type === 'balk' && e.reason === 'kloWatch'), { x: -0.4 }, 12, 'held back by Klo');
    assert.ok(G.player.x >= 92.3 * HL);
    assert.ok(BALK.kloWatch);
    assert.equal(R.story.objective(), 'explore', 'the goal note says what he wants');
    assert.ok(!R.has('note1_read'));
    // the way back is always open
    await R.walkTo(107); await R.settle();
    await R.flag('klo_hidden', { x: -1 }, 12);
});

test('the sköldhäst waits for Klo: it does not run off while he sits in his hole', async () => {
    const R = start(), { G } = R;
    await R.settle();
    await R.flag('klo_hidden', { x: -1 }, 12);
    await R.settle();
    await R.until(() => R.events.some(e => e.type === 'balk' && e.reason === 'kloHole'), { x: -1 }, 12, 'held back at the dunes');
    assert.ok(G.player.x >= 92.3 * HL, 'not on past the dunes');
    assert.equal(R.story.objective(), 'hide');
    // going back and hiding shows the map's rule, with Klo at the hole, and the way west opens
    await R.walkTo(106.9); await R.settle();
    await R.hide();
    await R.flag('klo_ja', {}, 10);
    assert.ok(Math.abs(G.actors.klo.x - G.player.x) < 3 * HL, 'he answers beside the player');
    await R.settle(); await R.hide();
    await R.flag('rule_demo', {}, 10);
    await R.settle();
    await R.until(() => G.player.x < 88 * HL, { x: -1 }, 12, 'and on to the west');
    assert.ok(R.log.some(l => l.kind === 'say' && l.lines.some(([, t]) => t === STORY.k1.mapCorner[0][1])), 'the map rule came first');
});

test('Vattenporten waits for Klo too, so the map rule is never missed on the way to the sea', async () => {
    const R = start(['klo_hidden', 'b:k1_enter', 'b:k1_stopwatch', 'p2_open', 'p2_seen', 'p2_plank', 'p2_stone', 'b:k1_arch', 'b:k1_mirror'], 'land', { x: 101.8 * HL, y: -0.1 * HL, facing: 1 }), { G } = R;
    await R.settle();
    await R.hold(0.5);
    assert.notEqual(G.context?.id, 'exit');
    assert.equal(R.story.objective(), 'hide');
    G.flag('klo_ja'); G.flags.add('rule_demo'); G.flags.add('b:k1_mapcorner');
    await R.settle();
    await R.context('exit');
    assert.equal(G.sceneId, 'kelp');
});

test('an older save that is already past the dunes is never held there, and Klo answers from his hole', async () => {
    const R = start(['klo_hidden', 'note1_read', 'b:k1_enter', 'b:k1_stopwatch', 'b:k1_note'], 'land', { x: 84 * HL, y: -0.62 * HL, facing: 1 }), { G } = R;
    Object.assign(G.actors.klo, { scene: 'land', visible: true, x: 81.8 * HL, y: -0.65 * HL });
    await R.settle();
    await R.until(() => G.player.x > 104 * HL, { x: 1 }, 15, 'home to the beach');
    await R.walkTo(106.9); await R.settle();
    assert.ok(G.terrain.walls.every(w => !w.id.startsWith('klo-')), 'no wall for a save that has gone on');
    await R.hide();
    await R.flag('klo_ja', {}, 10);
    assert.ok(Math.abs(G.actors.klo.x - G.player.x) < 3 * HL, 'he speaks from the hole, not from the note');
});

test('"Jag har fastnat" never skips a puzzle, and the sköldhäst it moves is the same one', async () => {
    // 6 November: the checkpoints on the far side of Streckbron, on the unopened hill and over the cleft were picked
    // whatever the flags; and G.goto's new player made a close-up or Klo at the map corner wait for ever
    const to = (flags, x, y) => {
        const R = start([...KLO_DONE, ...flags], 'land', { x: x * HL, y: y * HL, facing: -1 });
        const s = R.G.safeSpot();
        return s ? s.x / HL : null;
    };
    for (const x of [74, 80, 86]) { const t = to(['note1_read'], x, -0.66); assert.ok(t === null || t > 80.02, `before Streckbron is drawn, from ${x}: ${t}`); }
    for (const x of [40, 48]) assert.notEqual(to(['note1_read', 'p1_inked'], x, -0.8), 35.2, `not onto the unopened hill from ${x}`);
    assert.notEqual(to(['note1_read', 'p1_inked', 'p3_t1', 'p3_t2', 'p3_t3', 'p3_done'], 35, -4.0), 5.5, 'not over the cleft before the leap');
    assert.equal(to(['note1_read', 'p1_inked', 'p3_t1', 'p3_t2', 'p3_t3', 'p3_done', 'p4_leap'], 3, -4.0), 5.5, 'Klippudden once leapt');
    const R = start(KLO_DONE, 'land', { x: 86 * HL, y: -0.3 * HL, facing: -1 }), { G } = R;
    const me = G.player;
    G.relocate({ x: 95 * HL, y: -0.4 * HL, facing: 1 });
    assert.equal(G.player, me, 'the same player, moved');
    assert.ok(Math.abs(G.player.x - 95 * HL) < 1 && G.player.vx === 0);
});

test('a save while a discovery is told does not lose it: it comes back at the same place', async () => {
    // 6 November: a save (the tablet locked mid-sentence) between the event and the beat's end lost the beat for
    // good, since the event never comes again; the arch, the mirror and the glimpse come back by `when`
    const R = start([...KLO_DONE, 'p2_seen', 'p2_plank', 'p2_stone', 'p2_open'], 'land', { x: 101 * HL, y: -0.1 * HL, facing: -1 });
    await R.until(() => R.has('b:k1_arch'), {}, 20, 'the arch is opened and told again');
    assert.ok(R.log.some(l => l.kind === 'say' && JSON.stringify(l.lines).includes(STORY.k1.archDone[1].slice(0, 20))));
    assert.equal(R.G.checkpoint, 'pool');
});
