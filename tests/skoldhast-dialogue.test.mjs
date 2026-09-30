import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';
import { HL } from '../skoldhast/src/sim.mjs';

test('the cloud question and reply stay in order until the reader finishes each turn', async () => {
    const G = createGame(), hints = [], thoughts = [], spoken = [];
    let finish, changeSpeaker, cleared = 0;
    for (const f of ['intro_done', 'b:k1_enter', 'b:k1_stopwatch', 'b:k1_mapcorner', 'klo_hidden', 'klo_ja', 'rule_demo']) G.flags.add(f);
    G.goto('land', { x: 90 * HL, y: 0 }); G.sceneTime = 7;
    G.story = createStory(G, {
        ui: { say(lines, { onSpeaker }) { spoken.push(lines); changeSpeaker = onSpeaker; return new Promise(r => { finish = r; }); } },
        guide: { hint: t => hints.push(t), think: t => thoughts.push(t), clear: () => cleared++, goal() {}, tip() {} }, save() {}
    });
    G.step({}); await new Promise(r => setImmediate(r));
    assert.deepEqual(spoken, [STORY.k1.clouds]);
    assert.deepEqual(hints, []); assert.deepEqual(thoughts, []);
    assert.equal(cleared, 1);
    assert.equal(G.actors.klo.talking, true);
    assert.equal(G.actors.kv.talking, false);
    assert.ok(G.story.running(), 'the exchange waits for its reader');
    changeSpeaker('horse');
    assert.equal(G.actors.klo.talking, false, 'Klo listens during the reply');
    changeSpeaker('kv');
    assert.equal(G.actors.kv.talking, true);
    assert.equal(G.actors.klo.talking, false);
    finish(); await new Promise(r => setImmediate(r));
    assert.equal(G.actors.kv.talking, false, 'the final gesture ends with the dialogue');
    assert.ok(G.has('b:k1_clouds'));
});
