import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame as createA1 } from '../skoldhast/src/game.mjs';
import { createGame as createA2 } from '../skoldhast/adventures/adventure-2/game.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { groundAround } from '../skoldhast/src/ground-guard.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';

/** Run for a few seconds with the stick held and a hop now and then; report whether it was ever lost. */
function run(G, { dir, seconds = 4, hopEvery = 0.75 }) {
    let lost = null, rescued = 0;
    G.on('rescued', () => { rescued++; });
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
        const t = i * STEP, hop = hopEvery && (t % hopEvery) < STEP;
        G.step({ x: dir, y: 0, hop, hopHeld: hopEvery && (t % hopEvery) < 0.3 });
        const p = G.player, { above, below } = groundAround(G.terrain.surfaces, p.x, p.y);
        if (p.mode !== 'ground' && above && !below && p.y > above.y + 2 && !lost) lost = `${(p.x / HL).toFixed(2)},${(p.y / HL).toFixed(2)} under ${above.s.id}`;
    }
    return { lost, rescued, p: G.player };
}

test('ground guard: a solid line with nothing under it is "inside the ground"; a cave under higher ground is not', () => {
    const top = { id: 'hill', pts: [[0, -800], [1000, -800]] }, floor = { id: 'vault', pts: [[0, 0], [1000, 0]] };
    assert.equal(groundAround([top], 500, -100).below, false);
    assert.equal(groundAround([top], 500, -100).above.s.id, 'hill');
    assert.equal(groundAround([top, floor], 500, -100).below, true, 'the vault floor is under the sköldhäst');
    assert.equal(groundAround([{ ...top, thin: true }], 500, -100).above, null, 'a plank overhead is not ground');
});

test('Äventyr 1: hopping at the hill terraces never slips under a step and out of the page', () => {
    for (const [x, y, dir] of [[37, -2.95, -1], [40, -1.92, -1], [35, -4.0, -1], [44, -1.9, -1]]) {
        const G = createA1();
        for (const f of CODE_RESTORE[2].flags) G.flags.add(f);
        G.goto('land', { x: x * HL, y: y * HL - 4, facing: dir });
        const r = run(G, { dir });
        assert.equal(r.lost, null, `lost at ${x}: ${r.lost}`);
        assert.equal(r.rescued, 0, `no rescue needed from ${x}`);
        assert.ok(r.p.y < G.sceneDef.bounds.y1, 'still on the page');
    }
});

test('Äventyr 2: jumps into steep rises and swims into steep banks are stopped, not swallowed', () => {
    for (const [scene, x, dir, flags] of [['strand', 58, 1, []], ['skog', 82, 1, []], ['kristall', 71.8, -1, ['lantern', 'k3_open']], ['skog', 86, 1, ['p4_lit']]]) {
        const G = createA2();
        for (const f of flags) G.flags.add(f);
        const top = G.scenes[scene].surfaces.filter(q => !q.thin && x * HL >= q.pts[0][0] && x * HL <= q.pts.at(-1)[0]);
        assert.ok(top.length, `${scene} has ground at ${x}`);
        G.goto(scene, { x: x * HL, y: -6 * HL, facing: dir });
        const r = run(G, { dir });
        assert.equal(r.lost, null, `${scene} ${x}: ${r.lost}`);
        assert.equal(r.rescued, 0, `${scene} ${x}: no rescue needed`);
    }
});

test('Äventyr 2: down on a pit floor (never entered on purpose) the sköldhäst is put back where it stood', () => {
    const G = createA2();
    G.goto('kristall', 'fromStrand');
    for (let i = 0; i < 60; i++) G.step({ x: 1, y: 0 }); // stand safely first
    const safeX = G.player.x;
    let rescued = 0;
    G.on('rescued', () => { rescued++; });
    G.goto('kristall', { x: 15 * HL, y: 3.5 * HL, facing: 1 });
    for (let i = 0; i < 30; i++) G.step({ x: 0, y: 0 });
    assert.equal(rescued, 1);
    assert.ok(Math.abs(G.player.x - 15 * HL) > 2 * HL, 'out of the chasm');
    assert.ok(G.player.y < 0, 'back on the floor of the cave');
    void safeX;
});
