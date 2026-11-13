/*
 * Äventyr 3 in another order, and its gates (design section 19): the ring planet before the constellations, and
 * random players at every gate. Each gate must hold for ordinary inputs, and nothing may get stuck or leave a page.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot, HL } from './skoldhast-a3-robot.mjs';
import * as route from './skoldhast-a3-route.mjs';
import { SCENES, LIGHT_IDS } from '../skoldhast/adventures/adventure-3/content/world.mjs';
import { travelPlaces } from '../skoldhast/adventures/adventure-3/puzzles.mjs';

/** A robot standing at a spot with these flags (as a restored save would be). */
async function at(scene, spot, flags = []) {
    const R = createRobot();
    for (const f of ['b:arrive', 'breakfast', ...flags]) R.G.flags.add(f);
    R.G.goto(scene, spot);
    R.story.start();
    await R.settle();
    return R;
}
const AFTER_MOON = ['m5_view', 'fin_drawn', 'b:fin', 'b:view', 'visited_mane', 'light_l1', 'light_l2', 'light_l3', 'beam_used'];

if (!process.env.NO_TEST) {
test('the ring planet before the constellations: the white opens after nine, whichever came first', { timeout: 900000 }, async () => {
    const R = createRobot();
    await route.begin(R);
    await route.breakfast(R);
    await route.moon(R);
    await route.travel(R, 'ring', 3.6);
    await route.ring(R);
    assert.equal(R.G.lights(), 6);
    assert.ok(!travelPlaces(R.G).find(t => t.id === 'sudd').open, 'not to the white with six');
    await route.travel(R, 'stjarn', 2.4);
    assert.ok(R.has('clue_gone'), 'at the table, on the second of the two pages, Mira cannot find the eraser');
    await route.constellations(R);
    assert.equal(R.G.lights(), 9);
    assert.ok(R.has('b:gapDone'), 'the ninth light, wherever it is found, tells where the tenth is');
    await route.travel(R, 'sudd', 3.4);
    await route.white(R);
    await route.climax(R);
    await route.home(R);
    assert.ok(R.has('ended'));
});
}

test('M2: the crater\'s walls cannot be jumped, even on the Moon', async () => {
    const R = await at('mane', 'deepFloor', AFTER_MOON.slice(0, 5));
    for (const dir of [1, -1]) {
        await R.hold(6, { x: dir, hop: true });
        for (let i = 0; i < 10; i++) { await R.step({ x: dir, hop: true }); await R.hold(0.7, { x: dir }); }
        assert.ok(R.p().y > 3.5 * HL, 'still in the crater');
    }
});

test('M3: the dark cannot be crossed unlit', async () => {
    const R = await at('mane', 'nightStart');
    // walking (not galloping) lights nothing, and the sköldhäst will not go where it cannot see
    await R.hold(8, { x: 0.45 });
    assert.ok(R.p().x < 59.6 * HL, 'stopped at the dark');
    assert.ok(R.events.some(e => e.type === 'balk' && e.reason === 'dark'), 'it refused');
});

test('M4: no jump lands on the ledge; only a shell dropped from the air', async () => {
    const R = await at('mane', 'edgeStart', ['light_l1', 'light_l2']);
    for (const [from, x, y] of [[81.9, 83.2, -1.3], [83.7, 85.5, -2.6], [85.9, 87.4, -3.9]]) { await R.goTo(from, { tol: 0.12 }); await R.climb(x, y); await R.goTo(x, { tol: 0.25 }); }
    for (const stick of [0.3, 0.6, 1]) {
        if (R.p().y > -3.5 * HL) { for (const [from, x, y] of [[81.9, 83.2, -1.3], [83.7, 85.5, -2.6], [85.9, 87.4, -3.9]]) { await R.goTo(from, { tol: 0.12 }); await R.climb(x, y); await R.goTo(x, { tol: 0.25 }); } }
        await R.goTo(87.6, { tol: 0.1 });
        await R.step({ x: stick, hop: true });
        await R.until(() => R.p().mode === 'ground', () => ({ x: stick }), 6, 'landed');
        assert.notEqual(R.p().surface?.id, 'ledge', `a jump with the stick at ${stick} floats past the ledge`);
        assert.ok(!R.has('light_l3'));
    }
});

test('M4 and M5: the stairs climb with the stick held all the way, as a thumb on a phone holds it', async () => {
    // Alva on the phone (13 November): the jumps sailed over the rocks, and a sköldhäst that landed galloped off them
    const thumb = { x: 1 };
    async function climb(R, ids, { stays = true } = {}) {
        for (const id of ids) {
            await R.step({ ...thumb, hop: true });
            await R.until(() => R.p().mode === 'ground', thumb, 6, `onto ${id}`);
            assert.equal(R.p().surface?.id, id, `a jump with the stick held comes down on ${id}`);
            if (!stays) continue;
            await R.hold(1.5, thumb);
            assert.equal(R.p().surface?.id, id, `and stays on ${id} with the stick still held`);
        }
    }
    const R = await at('mane', 'edgeStart', ['light_l1', 'light_l2']);
    await R.until(() => R.p().x >= 81 * HL, thumb, 6, 'gallop at the stairs');
    await climb(R, ['stair1', 'stair2', 'stair3']);
    // after M4 the beam sets the shell down on the third rock: on up to Utsikten
    const Q = await at('mane', 'edgeStart', AFTER_MOON);
    Q.G.goto('mane', { x: 87.4 * HL, y: -3.9 * HL - 4, facing: 1 });
    await Q.hold(1.5, thumb);
    assert.equal(Q.p().surface?.id, 'stair3', 'the third rock refuses a walk off its end');
    await climb(Q, ['stair4', 'stair5']);
    await climb(Q, ['spire'], { stays: false });
});

test('S4 and R4: a swimmer is kicked out of a lane; only a hidden shell is carried', async () => {
    const R = await at('stjarn', 'pipArrive', [...AFTER_MOON, 'wagon_drawn', 'bear_nose', 'b:bearWakes']);
    await R.floatTo(77.6, -0.55, { tol: 0.3, max: 20 });
    await R.hold(3, { x: 0.6 });
    assert.ok(R.events.some(e => e.type === 'kicked'), 'kicked out of Pip\'s lane');
    assert.ok(!R.has('pip_met'));
    const Q = await at('ring', 'cometEdge', AFTER_MOON);
    await Q.until(() => Q.p().mode !== 'ground', () => ({ x: 0.4 }), 4, 'off the end');
    await Q.hold(3, { x: 0.6 });
    assert.ok(!Q.has('comet_rest') && Q.G.sceneId === 'ring', 'a swimmer does not reach Rastplatsen');
    assert.ok(Q.p().x < 63.5 * HL, 'the planet pulls it back to the ice');
});

test('R2: the low and the high lanes bend back to the ring\'s end', async () => {
    const R = await at('ring', 'ringEnd', AFTER_MOON);
    // a walk off the end between two showers, hidden at once: the low lane
    await R.until(() => R.G.puz.shower === null, {}, 8, 'between showers');
    await R.until(() => R.p().mode !== 'ground', () => ({ x: 0.3 }), 4, 'off the end');
    await R.step({ hide: true });
    await R.until(() => R.events.some(e => e.type === 'carryEnd' && e.back), {}, 12, 'back again');
    assert.ok(!R.has('slung') && R.p().x < 30 * HL, 'the low lane went back to the start');
});

test('R5 and V1: a dashed line refuses a walk', async () => {
    const R = await at('ring', 'rest', [...AFTER_MOON, 'comet_rest']);
    await R.hold(4, { x: 0.4 });
    assert.ok(!R.has('gap_drawn') && R.events.some(e => e.type === 'balk' && e.reason === 'thin'), 'the gap refuses a walk');
    const Q = await at('sudd', 'whiteEdge', [...AFTER_MOON, 'rocket_gone', 'b:suddArrive', ...LIGHT_IDS.slice(0, 9).map(id => 'light_' + id)]);
    await Q.hold(5, { x: 0.4 });
    assert.ok(!Q.has('dent1') && Q.p().x < 8.2 * HL, 'the white refuses a walk');
});

test('the white is closed before nine, and one way once there', async () => {
    const R = await at('mane', 'start', [...AFTER_MOON, 'light_l4', 'light_l5', 'light_l6', 'light_l7', 'light_l8']);
    assert.ok(!travelPlaces(R.G).find(t => t.id === 'sudd').open, 'eight lights: the white is closed');
    R.G.flags.add('light_l9');
    assert.ok(travelPlaces(R.G).find(t => t.id === 'sudd').open, 'nine: it opens');
    R.G.flags.add('rocket_gone');
    assert.ok(!travelPlaces(R.G).find(t => t.id === 'sudd').open, 'and once the rocket is rubbed out there is no going back');
});

test('free play: random players never leave a page or fall out of it', { timeout: 300000 }, async () => {
    const pages = [['mane', 'start', AFTER_MOON], ['stjarn', 'dock', AFTER_MOON], ['ring', 'dock', AFTER_MOON],
        ['sudd', 'whiteEdge', [...AFTER_MOON, 'rocket_gone', 'b:suddArrive']], ['vinter', 'tailTip', ['ride', 'self_drawn']]];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (const [scene, spot, flags] of pages) {
        for (let run = 0; run < 6; run++) {
            const R = await at(scene, spot, flags);
            const b = SCENES[scene].bounds;
            let inp = {};
            for (let i = 0; i < 20 * 120; i++) {
                if (i % 40 === 0) inp = { x: rnd() * 2 - 1, y: rnd() * 2 - 1, hop: rnd() < 0.25, hide: rnd() < 0.1 };
                await R.step(i % 40 === 0 ? inp : { x: inp.x, y: inp.y });
                const p = R.p();
                assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'a number');
                if (R.G.sceneId !== scene) break;
                assert.ok(p.x > b.x0 - HL && p.x < b.x1 + HL && p.y > b.y0 - HL && p.y < b.y1 + HL, `${scene}: inside the page at ${R.where()}`);
            }
        }
    }
});
