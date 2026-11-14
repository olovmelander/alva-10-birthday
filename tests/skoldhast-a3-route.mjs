/*
 * Äventyr 3's route for the robot (tests/skoldhast-a3-robot.mjs), page by page, with ordinary inputs only.
 * Shared by tests/skoldhast-a3-playthrough.test.mjs and tests/skoldhast-a3-order.test.mjs.
 */
import assert from 'node:assert/strict';
import { HL } from './skoldhast-a3-robot.mjs';

export async function begin(R) {
    R.G.goto('mane', 'start');
    R.story.start();
    await R.settle();
}

/** M1: up onto Hyllan from the east with a Moon jump; push the box west to Nova's bed. */
export async function breakfast(R) {
    const { G, p } = R;
    await R.goTo(18.6);
    await R.until(() => p().surface?.id === 'shelf' && p().mode === 'ground', () => ({ x: -0.5, hop: p().mode === 'ground' }), 10, 'up on the shelf');
    await R.goTo(17.0);
    await R.face(-1);
    for (let i = 0; i < 6 && !R.has('box_pushed'); i++) { await R.context('push'); await R.hold(0.7); }
    await R.flag('breakfast', {}, 30);
    await R.settle();
    assert.ok(G.actors.nova.follow, 'after breakfast Nova comes along');
}

/** M2–M5 and the fin. */
export async function moon(R) {
    const { G, p } = R;
    await R.goTo(45.4, { gallop: true, max: 120 });
    await R.goTo(50.2, { max: 30 });
    await R.settle();
    assert.ok(R.has('light_l1'), 'M2: the first light at the bottom of Djupa kratern');
    await R.goTo(53.3);
    await R.hideStill(1.5);
    await R.until(() => !G.carry && R.has('beam_used') && p().mode === 'ground', {}, 20, 'beam out');
    await R.settle();
    // M3
    await R.goTo(54.9);
    await R.goTo(76.5, { gallop: true, hopOver: [59.75, 69.3], max: 90 });
    await R.settle();
    if (!R.has('light_l2')) await R.goTo(67, { max: 60, hopOver: [69.3, 62.5] });
    assert.ok(R.has('light_l2') && R.has('night_lit'), 'M3: the light on the ridge, in Nova\'s red light');
    // M4
    await R.goTo(81.4);
    for (const [from, x, y] of [[81.9, 83.2, -1.3], [83.7, 85.5, -2.6], [85.9, 87.4, -3.9]]) { await R.goTo(from, { tol: 0.12 }); await R.climb(x, y); await R.goTo(x, { tol: 0.25 }); }
    await R.goTo(87.6, { tol: 0.1 });
    await R.step({ x: 0.6, hop: true });
    await R.until(() => p().x >= 88.85 * HL, () => ({ x: 0.6 }), 4, 'over the ledge');
    await R.step({ hide: true });
    await R.until(() => p().mode === 'ground', {}, 4, 'dropped');
    await R.settle();
    assert.ok(R.has('light_l3') && R.has('m4_drop'), 'M4: the shell dropped onto the ledge');
    await R.until(() => !G.carry && p().mode === 'ground' && p().y < -3.4 * HL, () => (p().hidden ? {} : { hide: true }), 20, 'beam up from the ledge');
    await R.emerge(); await R.settle();
    // M5
    for (const [from, x, y] of [[88.0, 90.8, -5.2], [91.2, 93.2, -6.5], [93.6, 96.2, -7.8]]) { await R.goTo(from, { tol: 0.12 }); await R.climb(x, y); await R.goTo(x, { tol: 0.3 }); }
    await R.settle();
    await R.flag('m5_view', {}, 20);
    // back to the rocket, and the fin
    await R.until(() => p().mode === 'ground' && p().y > -0.3 * HL, () => ({ x: -0.6 }), 20, 'down to the ground');
    await R.goTo(73, { gallop: true, hopOver: [72.0, 69.4, 62.5, 60.0] });
    await R.goTo(56.5, { gallop: true, hopOver: [72.0, 69.4, 62.5, 60.0] });
    await R.goTo(50, { max: 30 });
    await R.goTo(46.7);
    await R.hideStill(1.2);
    await R.until(() => !G.carry && p().mode === 'ground' && p().x < 45 * HL, {}, 20, 'beam out west');
    await R.emerge();
    await R.goTo(6.5, { gallop: true, max: 120 });
    await R.settle();
    await R.flag('fin_drawn', {}, 20);
    await R.settle();
}

export async function travel(R, id, rocketX) {
    await R.goTo(rocketX);
    R.travel(id);
    await R.context('travel', 5);
    await R.settle();
    assert.equal(R.G.sceneId, id, 'the rocket goes to ' + id);
}

/** S1–S4. */
export async function constellations(R) {
    const { G, p } = R;
    // up to the dashed line first (the three talk about it there), then back for a run-up
    await R.goTo(6.9);
    await R.settle();
    await R.goTo(-1.2);
    await R.gallopPast(8.2);
    await R.flag('wagon_drawn', { x: 1 }, 10);
    await R.settle();
    assert.equal(G.checkpoint, 'belt', 'S1: the wagon rolls to Orions bälte');
    for (const x of [41.0, 38.0, 44.0]) { await R.landOn(x, x === 41 ? -1.55 : -1.2); await R.hold(0.3); }
    await R.flag('belt_lit', {}, 3);
    await R.floatTo(41.0, -0.45, { tol: 0.25 });
    await R.flag('light_l4', {}, 4);
    await R.settle();
    await R.landOn(48.8, 1.03);
    await R.goTo(48.5);
    await R.gallopPast(67.8, { max: 30 });
    await R.flag('bear_nose', { x: 1 }, 10);
    await R.settle();
    assert.ok(R.has('light_l5') && R.has('clue_rubber'), 'S3: the bear wakes, gives his light and smells rubber');
    await R.floatTo(77.15, -0.55, { tol: 0.15 });
    await R.hide();
    await R.flag('pip_met', {}, 20);
    await R.settle();
    assert.ok(R.has('light_l6') && R.has('clue_photo'), 'S4: Pip hands over a light and his photograph');
    await R.landOn(4.5, -0.03, { max: 60 });
}

/** R1–R5. */
export async function ring(R) {
    const { G, p } = R;
    // out in the open, hide and hold out one shower (Klo measures it: the shell is a shield)
    await R.goTo(15.4, { max: 40 });
    await R.hideStill(0.2);
    await R.until(() => R.has('gravel_held'), {}, 10, 'a shower held out');
    await R.emerge();
    await R.until(() => p().x > 28.4 * HL && p().mode === 'ground' && !G.busy, () => {
        const q = p(), sh = G.puz.shower;
        if (G.busy) return {};
        if (sh && sh.state !== null && q.x > 8 * HL && q.x < 30 * HL) return q.hidden ? {} : (Math.abs(q.vx) < 60 ? { hide: true } : {});
        if (q.hidden) return { hop: true };
        return { x: q.x > 27 * HL ? 0.4 : 0.8 };
    }, 90, 'through the gravel');
    await R.settle();
    await R.goTo(24.5);
    await R.until(() => G.puz.shower === null, {}, 8, 'between showers');
    await R.until(() => p().x > 29.7 * HL, () => ({ x: 1 }), 10, 'run to the end');
    await R.step({ x: 1, hop: true });
    await R.hold(0.12, { x: 1 });
    await R.step({ hide: true });
    await R.flag('slung', {}, 12);
    await R.settle();
    await R.goTo(46.2); await R.face(1);
    for (let i = 0; i < 40 && !R.has('ice_melted') && !G.puz.melt; i++) {
        await R.until(() => G.context?.id === 'push-ice' || G.puz.melt, () => ({ x: 0.2 }), 4, 'beside the block');
        if (G.puz.melt) break;
        await R.act(); await R.hold(0.6);
    }
    await R.flag('ice_melted', {}, 6);
    await R.goTo(56.0, { tol: 0.3 });
    await R.flag('light_l7', { x: 0.2 }, 5);
    await R.settle();
    await R.goTo(62.6);
    await R.until(() => p().mode !== 'ground', () => ({ x: 0.4 }), 4, 'off the end');
    await R.step({ hide: true });
    await R.until(() => p().surface?.id === 'rest' && p().mode === 'ground' && !G.carry, {}, 15, 'on Rastplatsen');
    await R.emerge();
    await R.flag('comet_rest', {}, 12);
    await R.settle();
    // (the clue "Bara de sneda …" is written with Nova's "De raka stjärnorna är kvar", after hypothesis 3)
    assert.ok(R.has('light_l8') && R.has('b:cometSaw'), 'R4: Kometen\'s light, and what it saw');
    assert.equal(R.has('clue_crooked'), R.has('b:crooked'));
    // up to the gap first (the three talk about it there), then back for a run-up between two showers
    await R.until(() => R.has('b:gap') || R.has('gap_drawn'), () => ({ x: 0.6 }), 20, 'at the gap');
    await R.settle();
    await R.goTo(71.6);
    await R.until(() => G.puz.shower?.state === 'shower' && G.puz.shower.id === 'gravelGap', {}, 8, 'a shower');
    await R.until(() => G.puz.shower === null || G.puz.shower.id !== 'gravelGap', {}, 4, 'shower over');
    await R.until(() => R.has('gap_drawn'), () => ({ x: 1 }), 6, 'gap drawn');
    await R.goTo(89.4, { tol: 0.3 });
    await R.flag('light_l9', {}, 4);
    await R.settle();
    await R.until(() => G.sceneId === 'ring' && p().x < 10 * HL, () => ({ x: 1 }), 20, 'round the ring');
}

/** V1–V5 and the tenth star. */
export async function white(R) {
    const { G, p } = R;
    assert.ok(R.has('rocket_gone'), 'the rocket is rubbed out on arrival');
    await R.goTo(-2.6);
    await R.until(() => R.has('dent4') && p().mode === 'ground' && !G.busy, () => ({ x: 1 }), 20, 'the dents');
    await R.settle();
    for (const [n, back, wait] of [[1, 25.6, 30.3], [2, 30.8, 35.1], [3, 36.0, 40.5]]) {
        await R.goTo(wait);
        await R.hideStill(0.3);
        await R.until(() => R.has('fog' + n + '_lit'), {}, 6, 'fog ' + n);
        await R.emerge(); await R.settle();
        await R.goTo(back);
        await R.until(() => R.has('fogd' + n) && p().mode === 'ground', () => ({ x: 1 }), 10, 'fog dents ' + n);
        await R.settle();
    }
    for (let i = 0; i < 2; i++) {
        await R.goTo(41.4);
        await R.until(() => G.puz.bridgeRubs > i && !G.carry && p().mode === 'ground', () => ({ x: G.carry ? 0 : 1 }), 15, 'rubbed ' + (i + 1));
        await R.settle();
    }
    assert.ok(R.has('bridge_refused'), 'V3: Suddet rubbed the bridge out twice');
    await R.goTo(46.4, { tol: 0.1 });
    await R.hideStill(1);
    await R.flag('bridge_crossed', {}, 15);
    await R.emerge(); await R.settle();
}

export async function climax(R, { checks = null } = {}) {
    const { G, p } = R;
    await R.goTo(69.5);
    await R.until(() => R.has('outline_gone') && !G.busy, {}, 120, 'the climax to the outline');
    if (checks) await checks(R);
    let dir = 1;
    await R.until(() => R.has('self_drawn'), () => { const q = p(); if (q.x > 79 * HL) dir = -1; if (q.x < 63 * HL) dir = 1; return { x: dir }; }, 40, 'drawing itself back');
    await R.settle(120);
    assert.equal(G.sceneId, 'vinter', 'Kometen comes, and they are on its tail');
}

/** G1, F1, F2 and the finale. */
export async function home(R) {
    const { G, p } = R;
    await R.until(() => R.has('ride_done') && !G.busy, () => ({ x: G.busy ? 0 : -1 }), 60, 'the great gallop');
    await R.settle();
    await R.goTo(8.5);
    await R.until(() => p().x < 0.6 * HL, () => ({ x: -1 }), 6, 'run to the head');
    await R.step({ x: -1, hop: true });
    await R.hold(0.15, { x: -1 });
    await R.step({ hide: true });
    await R.flag('caught', {}, 6);
    await R.until(() => G.sceneId === 'mane' && !G.carry, {}, 15, 'carried to the Moon');
    await R.settle();
    await R.goTo(7.0);
    await R.until(() => R.has('moon_whole'), () => ({ x: -1 }), 15, 'the rim drawn');
    await R.settle();
    await R.goTo(11.0, { max: 60 });
    await R.until(() => R.has('ended') && !G.busy && !R.story.running(), {}, 120, 'the finale');
}
