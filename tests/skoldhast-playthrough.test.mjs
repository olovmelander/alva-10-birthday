/*
 * Sköldhästen: a robot plays the whole game through the real simulation,
 * puzzles and story (plan §8.8). If a puzzle or a beat can't be finished with
 * ordinary inputs, this test fails and says where the robot got stuck.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRobot } from './skoldhast-robot.mjs';

export async function chapter1(R) {
    const { G } = R;
    G.flag('intro_done');
    G.goto('land', 'start');
    await R.settle();
    assert.ok(G.actors.klo.visible, 'Klo waits on the beach with the stopwatch');

    // Klo times a gallop, the stamp sends Klo into the hole
    await R.flag('klo_hidden', { x: -1 }, 12);
    await R.settle();
    // Göm dig by the hole: Klo comes out ("Ja!"), then shows the map corner
    await R.walkTo(106.9);
    await R.hide();
    await R.flag('klo_ja', {}, 10);
    await R.settle();
    await R.hide();
    await R.flag('rule_demo', {}, 10);
    await R.settle();

    // P2 Spegelpölen: hidden by the pool, the reflection shows the page as it should be
    await R.walkTo(104.1);
    await R.hide();
    await R.flag('p2_seen', {}, 10);
    await R.settle();
    await R.hide();
    // gallop the plank from a beach run-up
    await R.walkTo(109.6);
    await R.gallopPast(103.5);
    assert.ok(R.has('p2_plank'), 'the plank is inked');
    await R.settle();
    // push the stone four notches (from the west, facing east)
    await R.walkTo(99.4);
    for (let n = 0; n < 4; n++) {
        const stone = 100.1 + 0.45 * G.puz.stone;
        await R.walkTo(stone - 0.8);
        await R.walkTo(stone - 0.55);
        await R.context('knuffa');
    }
    await R.flag('p2_open', {}, 5);
    await R.settle();

    // the note by the gully, then P1 Streckbron at a gallop
    await R.walkTo(81.0, { gallop: true });
    await R.flag('note1_read', {}, 20);
    await R.settle();
    await R.walkTo(90.5);
    await R.gallopPast(74.5);
    assert.ok(R.has('p1_inked'), 'the arch is inked');
    await R.settle();

    // Smaktestet, part one: a mouthful of steppe grass
    await R.walkTo(74.8);
    await R.context('taste');
    await R.settle();
    assert.ok(R.has('ate_grass'));
    // the first distant sköldhäst, and Klo at Vågmärkesbranten
    await R.walkTo(61, { gallop: true });
    await R.flag('glimpse1', {}, 10);
    await R.settle();
    await R.walkTo(48.0);
    await R.flag('b:k1_branten', {}, 10);
    await R.settle();

    // P3: gallop past the backsippa clumps; the fluff grows ramps
    await R.walkTo(59.5);
    await R.gallopPast(49.0);
    await R.flag('p3_t1', {}, 5);
    await R.walkTo(58.5);
    await R.until(() => R.p().x < 39.2 * 200 || (R.has('p3_t2') && R.has('p3_t3') && R.p().x < 41 * 200), { x: -1 }, 20, 'run along L1');
    await R.flag('p3_t3', {}, 5);
    assert.ok(R.has('p3_t2'), 'the second ramp grew');
    await R.walkTo(41.0); // back to the foot of the new ramp, then up
    await R.walkTo(35.0);
    await R.flag('p3_done', {}, 10);
    await R.settle();

    // back to Vattenporten and into the sea
    await R.walkTo(101.8, { gallop: true, max: 120 });
    await R.context('exit');
    assert.equal(G.sceneId, 'kelp');
    await R.settle();
    // Smaktestet, part two: kelp → Klo logs it (O1)
    await R.swimTo(15.1, 5.4);
    await R.context('taste');
    await R.flag('exp_smak', {}, 10);
    await R.settle();
    await R.swimTo(20.8, 3.4);
    await R.flag('ch1_end', {}, 60);
    await R.settle();
    assert.ok(R.log.some((l) => l.kind === 'report' && l.n === 1), 'the Kapitel 1 report is shown');
}

export async function chapter2(R) {
    const { G } = R;
    await R.flag('b:k2_open', {}, 20);
    await R.settle();
    // the trench opens; Klo's second note
    await R.swimTo(22.6, 6.0);
    await R.swimTo(23.0, 7.2);
    await R.flag('clue_note2', {}, 20);
    await R.settle();
    // P5 Lyktfiskarnas väg: hide upstream in the lane; the school follows the drifting shell into the vault
    await R.swimTo(22.75, 7.85, { tol: 0.2 });
    await R.hide();
    await R.flag('p5_lit', {}, 20);
    await R.settle();
    // the lane carries on inside the vault; wait until the shell rests, then come out
    await R.until(() => R.p().resting || R.p().anchored, {}, 20, 'rest in the vault');
    await R.hide();
    // P6 Strömkarusellen: hide in the ring and let the whirl take the shell to the corner
    await R.swimTo(33.2, 9.2);
    await R.hide();
    await R.flag('mark_sea', {}, 25);
    await R.settle();
    await R.hide();
    // back to land through the kelp and the cave
    for (const [x, y] of [[30, 10.4], [23.0, 5.2], [12, 4.4], [4, 2.6], [-0.4, 2.4]]) {
        if (G.sceneId !== 'kelp') break;
        await R.swimTo(x, y, { max: 60 });
    }
    await R.until(() => G.sceneId === 'land', { x: -1 }, 10, 'out through Vattenporten');
    await R.settle();
    // P4 Stora språnget: up the grown ramps, over Galoppbacken, and down the long slope at full gallop
    await R.walkTo(34.0, { gallop: true, max: 150 });
    await R.walkTo(30.0);
    await R.gallopPast(9.0);
    await R.flag('p4_leap', {}, 10);
    await R.settle();
    // Landmärket on Klippudden
    await R.walkTo(3.2);
    await R.flag('ch2_end', {}, 60);
    await R.settle();
    assert.ok(R.log.some((l) => l.kind === 'report' && l.n === 2), 'the Kapitel 2 report is shown');
}

export async function chapter3(R) {
    const { G } = R;
    // the rope plank makes the way back a walk
    await R.walkTo(7.6);
    await R.context('dra');
    assert.ok(R.has('p4_plank'));
    // all the way back to Vattenporten, then through the sea to Spegelviken
    await R.walkTo(101.8, { gallop: true, max: 200 });
    await R.context('exit');
    await R.settle();
    for (const [x, y] of [[8, 3.2], [20, 4.6], [23.0, 6.0], [30, 10.8], [36, 8.8]]) await R.swimTo(x, y, { max: 60 });
    await R.until(() => G.sceneId === 'viken', { x: 1, y: -0.3 }, 30, 'the outflow to Spegelviken');
    await R.flag('b:k3_arrive', {}, 30);
    await R.settle();

    // P7 shutter 2: a sunk, hidden shell presses the seabed plate
    await R.swimTo(14.2, 6.2);
    await R.hide();
    await R.flag('shutter2', {}, 15);
    await R.settle();
    await R.hide();
    // shutter 3: a hidden shell rides Strömröret up to the gallery; Dra
    await R.swimTo(24.5, 5.6);
    await R.swimTo(26.2, 5.3, { tol: 0.2 });
    await R.hide();
    await R.until(() => R.p().mode === 'ground' && R.p().y < -6 * 200, {}, 20, 'up the pipe');
    await R.settle();
    await R.walkTo(28.4);
    await R.context('dra');
    assert.ok(R.has('shutter3'));
    await R.settle();
    await R.walkTo(27.3);
    await R.context('stair');
    await R.settle();
    // shutter 1: gallop the hollow pier (Trumbryggan) until the ratchet latches
    for (let pass = 0; pass < 6 && !R.has('shutter1'); pass++) {
        await R.walkTo(pass % 2 ? 22.8 : 3.0, { gallop: true, max: 40 });
    }
    assert.ok(R.has('shutter1'), 'the pier drum opens the first shutter');
    await R.flag('lamp_lit', {}, 5);
    await R.flag('kv_met', {}, 30);
    await R.settle();
    // Kartväktaren
    await R.walkTo(21.8);
    await R.flag('talk1', {}, 20);
    await R.settle();
    await R.context('talk2');
    await R.settle();
    await R.context('talk3');
    await R.flag('talk_done', {}, 20);
    await R.settle();

    // P8 Det sista strecket: gallop the land half, leap into the sea, drift the sea half
    await R.walkTo(0.5, { gallop: true, max: 60 });
    await R.gallopPast(24.2);
    assert.ok(R.has('p8_land'), 'the three land segments are inked');
    await R.until(() => R.p().mode === 'swim', { x: 1 }, 5, 'into the sea');
    await R.hide();
    await R.flag('p8_done', {}, 20);
    // the final: PLASK, the gallop over the steppes, the conclusion and the epilogue
    await R.flag('ended', {}, 180);
    await R.settle();
    assert.equal(G.checkpoint, 'beachEnd');
    assert.ok(!R.has('final_run'));
}

if (!process.env.NO_TEST) {
    test('a robot can play the whole game', { timeout: 600000 }, async (t) => {
        const R = createRobot();
        await chapter1(R);
        assert.ok(R.has('ch2_open'), 'Kapitel 2 opens (released chapter 3)');
        t.diagnostic(`Kapitel 1 done at ${(R.G.time / 60).toFixed(1)} min of game time`);
        await chapter2(R);
        assert.ok(R.has('ch3_open'), 'Kapitel 3 opens');
        t.diagnostic(`Kapitel 2 done at ${(R.G.time / 60).toFixed(1)} min`);
        await chapter3(R);
        t.diagnostic(`the end at ${(R.G.time / 60).toFixed(1)} min; ${R.log.filter((l) => l.kind === 'say').length} dialogues`);
        assert.ok(R.G.time / 60 < 60);
        assert.ok(R.has('conclusion') && R.has('unfolded'));
        assert.equal(R.G.puz.tally, 0, "Klo's signs stay even until the finale");
        // after the ending: Signe challenges you, and you always win, even at a crawl (O8)
        await R.flag('signe_met', {}, 20);
        await R.settle();
        await R.walkTo(107.2);
        await R.context('race');
        await R.until(() => R.G.busy === 0 && R.G.actors.signe.pose !== 'idle', {}, 10, 'the race starts');
        await R.until(() => R.has('signe_race'), { x: -0.15 }, 90, 'win the race');
        assert.ok(R.G.actors.signe.x > R.p().x, 'Signe crossed the line after you');
    });

    test('with only Kapitel 1 released, the page stays white after its end', { timeout: 240000 }, async () => {
        const R = createRobot({ released: 1 });
        await chapter1(R);
        await R.hold(3);
        assert.ok(!R.has('ch2_open'));
        // the trench is still paper: the robot balks at it
        await R.until(() => R.events.some((e) => e.type === 'balk' && e.reason === 'paper'), { x: 1, y: 0.4 }, 20, 'balk at the paper');
    });

    test('word code 2 restores the end of Kapitel 2, and Kapitel 3 can be finished from there', { timeout: 300000 }, async () => {
        const { CODE_RESTORE } = await import('../skoldhast/src/save.mjs');
        const R = createRobot();
        const r = CODE_RESTORE[2];
        R.G.restore({ flags: r.flags, checkpoint: r.checkpoint, puz: {} });
        assert.equal(R.G.sceneId, 'viken');
        assert.ok(R.has('ch3_open'));
        await R.flag('b:k3_arrive', {}, 30);
        await R.settle();
        await chapter3FromViken(R);
    });
}

export async function chapter3FromViken(R) {
    // P7, the talks and P8, as in chapter3() after the arrival
    await R.swimTo(14.2, 6.2);
    await R.hide();
    await R.flag('shutter2', {}, 15);
    await R.settle();
    await R.hide();
    await R.swimTo(24.5, 5.6);
    await R.swimTo(26.2, 5.3, { tol: 0.2 });
    await R.hide();
    await R.until(() => R.p().mode === 'ground' && R.p().y < -6 * 200, {}, 20, 'up the pipe');
    await R.settle();
    await R.walkTo(28.4);
    await R.context('dra');
    await R.settle();
    await R.walkTo(27.3);
    await R.context('stair');
    await R.settle();
    for (let pass = 0; pass < 6 && !R.has('shutter1'); pass++) await R.walkTo(pass % 2 ? 22.8 : 3.0, { gallop: true, max: 40 });
    await R.flag('kv_met', {}, 30);
    await R.settle();
    await R.walkTo(21.8);
    await R.flag('talk1', {}, 20);
    await R.settle();
    await R.context('talk2');
    await R.settle();
    await R.context('talk3');
    await R.flag('talk_done', {}, 20);
    await R.settle();
    await R.walkTo(0.5, { gallop: true, max: 60 });
    await R.gallopPast(24.2);
    await R.until(() => R.p().mode === 'swim', { x: 1 }, 5, 'into the sea');
    await R.hide();
    await R.flag('ended', {}, 200);
}
