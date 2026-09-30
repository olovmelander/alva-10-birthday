import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';
import { HL, STEP } from '../skoldhast/src/sim.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
test('reading the seabed purpose holds currents for a slow reader and then restores swimming', async () => {
    const G = createGame();
    G.restore({ flags: [...CODE_RESTORE[1].flags, 'ch2_open', 'b:k2_open', 'b:k2_note2'], checkpoint: 'trench' });
    G.goto('kelp', { x: 33.2 * HL, y: 9.2 * HL, mode: 'swim' });
    let dismiss, line, timerDone = false;
    G.story = createStory(G, {
        ui: { say: async lines => { line = lines[0][1]; await new Promise(resolve => { dismiss = resolve; }); }, toast() {}, pulse() {} },
        guide: { hint() {}, think() {} },
        fx: async (name, data) => { await G.wait(.1); await data.whileVisible?.(); }, save() {}
    });
    for (let i = 0; i < 240 && !dismiss; i++) { G.step({}); await tick(); }
    assert.equal(line, STORY.k2.cornerPurpose[1]);
    assert.ok(G.worldInspection);
    const pose = { x: G.player.x, y: G.player.y, vx: G.player.vx, vy: G.player.vy };
    const puzzle = JSON.stringify(G.puz), time = G.time;
    G.later(.5, () => { timerDone = true; });
    for (let i = 0; i < 30 / STEP; i++) { G.step({ x: 1, hide: true }); await tick(); }
    assert.deepEqual({ x: G.player.x, y: G.player.y, vx: G.player.vx, vy: G.player.vy }, pose);
    assert.equal(JSON.stringify(G.puz), puzzle, 'reading never advances a puzzle hold');
    assert.ok(timerDone && G.time >= time + 29, 'story timers still finish while the world is inspected');
    assert.equal(G.has('mark_sea'), false);
    dismiss(); await tick();
    for (let i = 0; i < 30; i++) { G.step({}); await tick(); }
    assert.equal(G.worldInspection, null);
    const x = G.player.x;
    for (let i = 0; i < 120; i++) G.step({ x: 1 });
    assert.ok(G.player.x > x + 30, 'normal movement returns after the reader dismisses the view');
});

test('inspection is transient and cannot hold a restored player or another scene', () => {
    const G = createGame(); G.goto('kelp', 'fromLand');
    G.worldInspection = { player: G.player };
    const save = G.serialize();
    assert.equal('worldInspection' in save, false);
    G.restore(save);
    assert.equal(G.worldInspection, null);
    G.worldInspection = { player: G.player };
    G.goto('land', 'start');
    assert.equal(G.worldInspection, null);
});
