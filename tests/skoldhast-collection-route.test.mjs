import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, HL } from '../skoldhast/src/game.mjs';
import { STEP } from '../skoldhast/src/sim.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { countPencils, pencilProgress } from '../skoldhast/src/puzzles.mjs';
import { createRobot } from './skoldhast-robot.mjs';

export const COLLECTION_END_FLAGS = [...CODE_RESTORE[2].flags,
    'ch3_open', 'viken_arrived', 'gate_open', 'b:k3_arrive', 'shutter1', 'shutter2', 'shutter3',
    'lamp_lit', 'b:k3_lamp', 'kv_met', 'talk1', 'b:k3_talk1', 'talk2', 'talk_done', 'b:k3_line',
    'p8_s1', 'p8_s2', 'p8_s3', 'p8_land', 'p8_done', 'b:k3_window', 'unfolded', 'conclusion', 'ended',
    'exp_smak', 'exp_smak_logged', 'signe_met', 'signe_race', 'b:after_signe'];

function endGame() {
    const G = createGame();
    G.restore({ flags: COLLECTION_END_FLAGS, checkpoint: 'beachEnd' });
    return G;
}
function position(G) {
    const p = G.player;
    return `${G.sceneId} (${(p.x / HL).toFixed(3)}, ${(p.y / HL).toFixed(3)}) ${p.mode} ${G.context?.id || '-'} vx=${p.vx.toFixed(1)}`;
}
function until(G, predicate, input, seconds, label) {
    for (let n = 0; n < seconds / STEP; n++) {
        if (predicate()) return;
        G.step(typeof input === 'function' ? input() : input);
    }
    assert.ok(predicate(), `${label}: ${position(G)}`);
}
function walk(G, x) {
    until(G, () => Math.abs(G.player.x - x) < HL * .10 && Math.abs(G.player.vx) < 40 && G.player.mode === 'ground', () => {
        const dx = x - G.player.x;
        if (Math.abs(dx) < HL * .10) return {};
        return { x: Math.sign(dx) * (Math.abs(dx) > 4 * HL ? 1 : Math.min(.7, Math.max(.12, Math.abs(dx) / (2.2 * HL)))) };
    }, 150, `walk to ${x / HL}`);
}
function swim(G, x, y) {
    until(G, () => Math.hypot(G.player.x - x, G.player.y - y) < HL * .2, () => {
        const dx = x - G.player.x, dy = y - G.player.y, d = Math.hypot(dx, dy) || 1;
        const m = Math.min(1, d / (HL * .5));
        return { x: dx / d * m, y: dy / d * m };
    }, 40, `swim to ${x / HL}, ${y / HL}`);
}

// Staging skips already-tested chapter travel, never a collection or colour
// action. Every pickup starts outside contact range on a legal surface/in water.
export function collectionStart(scene, pc) {
    if (scene.id === 'kelp') {
        return pc.id === 'p-kelp-bucket'
            ? { x: pc.x, y: pc.y - HL * 1.2, mode: 'swim' }
            : { x: pc.x - HL, y: pc.y - HL * .7, mode: 'swim' };
    }
    if (pc.id === 'p-bay-shell') return { x: pc.x - HL, y: pc.y - HL * .7, mode: 'swim' };
    if (pc.id === 'p-bay-boat') return { x: HL * 1.7, y: -HL * .34, facing: -1 };
    const x = pc.x - HL * .9;
    const heights = scene.surfaces.flatMap(s => s.hidden ? [] : s.pts.slice(1).flatMap((b, i) => {
        const a = s.pts[i];
        return x >= a[0] && x <= b[0] && b[0] > a[0]
            ? [a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])] : [];
    }));
    return { x, y: Math.min(...heights), facing: 1 };
}

if (!process.env.NO_TEST) {
    test('all fifteen authored pencils can be approached, collected and coloured through real movement', () => {
        const G = endGame(), pickups = [], colours = [];
        G.on('pickup', e => pickups.push(e.id)); G.on('colorin', e => colours.push(e.id));
        for (const scene of Object.values(SCENES)) for (const pc of scene.pencils || []) {
            G.goto(scene.id, collectionStart(scene, pc));
            assert.ok(!G.terrain.insideSolid(G.player.x, G.player.y - 2), `${pc.id}: legal starting position`);
            assert.ok(!G.flags.has('penna_' + pc.id), `${pc.id}: no pickup flag supplied`);
            if (G.player.mode === 'swim') swim(G, pc.x, pc.y);
            else {
                walk(G, pc.x);
                if ((scene.hoppstallen || []).some(h => h.pencil === pc.id)) {
                    G.step({ act: true });
                    until(G, () => G.flags.has('penna_' + pc.id), {}, 3, `${pc.id}: hop onto perch`);
                }
            }
            assert.ok(G.flags.has('penna_' + pc.id), `${pc.id}: collected by contact (${position(G)})`);
            if (G.player.mode === 'swim') swim(G, pc.propAt.x, pc.propAt.y - HL * .2);
            else walk(G, pc.propAt.x);
            until(G, () => G.context?.id === 'farglagg', {}, 5, `${pc.id}: colour action`);
            G.step({ act: true });
            assert.ok(G.flags.has('color_' + pc.id), `${pc.id}: colour action reaches its drawing`);
        }
        assert.equal(countPencils(G), 15);
        assert.equal(pickups.length, 15); assert.equal(new Set(pickups).size, 15);
        assert.equal(colours.length, 15); assert.equal(new Set(colours).size, 15);
        assert.deepEqual(pencilProgress(G).map(r => [r.id, r.found, r.total]), [['land', 7, 7], ['kelp', 4, 4], ['viken', 4, 4]]);
        const loaded = createGame(); loaded.restore(G.serialize());
        assert.equal(countPencils(loaded), 15);
        assert.ok(colours.every(id => loaded.flags.has('color_' + id)), 'reload preserves all fifteen coloured drawings');
    });

    test('the lyktfisk bed permits collection, hiding, emerging and swimming away', () => {
        const G = endGame(), pc = SCENES.kelp.pencils.find(p => p.id === 'p-kelp-bucket');
        G.goto('kelp', collectionStart(SCENES.kelp, pc));
        swim(G, pc.x, pc.y);
        assert.ok(G.flags.has('penna_' + pc.id));
        G.step({ hide: true });
        until(G, () => G.player.hidden && G.player.anchored, {}, 8, 'settle in kelp bed');
        assert.notEqual(G.context?.id, 'farglagg', 'colour never traps a hidden shell');
        G.step({ hide: true });
        swim(G, 24.4 * HL, 9.4 * HL);
        assert.ok(!G.player.hidden && G.player.y < 10 * HL, 'emerging gives control back above the bed');
    });

    test('the dark vault refuses a pencil detour until the lyktfiskar have lit it', () => {
        const G = endGame(), pc = SCENES.kelp.pencils.find(p => p.id === 'p-kelp-shell');
        G.flags.delete('p5_lit');
        G.goto('kelp', { x: 25.1 * HL, y: 11.4 * HL, mode: 'swim', facing: 1 });
        for (let n = 0; n < 4 / STEP; n++) G.step({ x: 1 });
        assert.ok(G.player.x < 25.8 * HL, 'the existing dark-vault refusal still protects the route');
        assert.ok(!G.flags.has('penna_' + pc.id));
        G.flag('p5_lit');
        swim(G, pc.x, pc.y);
        assert.ok(G.flags.has('penna_' + pc.id), 'lighting P5 opens the same swimming approach');
    });

    test('after the ending the pipe still reaches the gallery pencil and the stairs lead back', async () => {
        const R = createRobot();
        R.G.restore({ flags: COLLECTION_END_FLAGS, checkpoint: 'viken' });
        R.G.goto('viken', { x: 24.5 * HL, y: 5.6 * HL, mode: 'swim', facing: 1 });
        await R.settle();
        await R.swimTo(26.2, 5.3, { tol: .2 });
        await R.hide();
        await R.until(() => R.p().mode === 'ground' && R.p().surface?.id === 'gallery', {}, 25, 'pipe to gallery after ending');
        await R.settle();
        await R.walkTo(30.2);
        assert.ok(R.has('penna_p-gallery-flowers'));
        await R.walkTo(31.1); await R.context('farglagg');
        assert.ok(R.has('color_p-gallery-flowers'));
        await R.walkTo(27.2); await R.context('stair'); await R.hold(1);
        assert.ok(Math.abs(R.p().x / HL - 22.6) < .2 && R.p().surface?.id === 'pier', R.where());
    });
}
