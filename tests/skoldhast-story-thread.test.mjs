import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { describeThread } from '../skoldhast/src/story-thread.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { THREAD, GOALS } from '../skoldhast/src/content/sv.mjs';

test('every playable objective keeps the mission and explains a purpose without changing progress', () => {
    const flags = new Set(['intro_done', 'rule_demo']), saved = [...flags];
    for (const objective of Object.keys(GOALS)) {
        assert.ok(THREAD.why[objective], `${objective} has an authored reason`);
        const thread = describeThread(flags, objective);
        assert.equal(thread.mission, THREAD.mission);
        assert.equal(thread.stage, 'map');
        assert.equal(thread.conversation, null, 'no conversation is invented before meeting the keeper');
    }
    assert.deepEqual([...flags], saved);
});

test('the recap remembers discoveries in either order without revealing the keeper before his explanation', () => {
    for (const first of ['land', 'sea']) {
        const flags = new Set([...CODE_RESTORE[1].flags, 'mark_' + first]);
        assert.equal(describeThread(flags, 'p4').stage, first);
        flags.add(first === 'land' ? 'mark_sea' : 'mark_land');
        assert.equal(describeThread(flags, 'p4').stage, 'pieces');
        flags.add('ch2_end');
        assert.equal(describeThread(flags, 'p7').stage, 'tower');
        flags.add('talk1');
        assert.equal(describeThread(flags, 'talk').stage, 'fear');
        flags.add('talk_done');
        assert.equal(describeThread(flags, 'p8').stage, 'proof');
        flags.add('ended');
        const end = describeThread(flags, 'free');
        assert.equal(end.stage, 'end');
        assert.equal(end.mission, THREAD.complete);
    }
});

test('conversation guidance advances from why to the map to the shore, including after reloading', () => {
    const G = createGame(), story = createStory(G, { ui: {} });
    G.restore({ flags: [...CODE_RESTORE[2].flags, 'viken_arrived', 'lamp_lit', 'kv_met'], checkpoint: 'pierEnd' });
    const first = story.guidance();
    assert.equal(first.objective, 'talk');
    for (const [flag, expected] of [['talk1', THREAD.talkMap], ['talk2', THREAD.talkShore]]) {
        G.flags.add(flag);
        G.restore(G.serialize());
        const next = story.guidance();
        assert.equal(next.goal, expected.goal);
        assert.equal(next.hint.q, expected.hint.q);
        assert.equal(next.thread.why, expected.why);
        assert.notEqual(next.goal, first.goal, 'we do not keep asking why after he has answered');
    }
    G.flags.add('talk_done');
    assert.equal(story.guidance().objective, 'p8');
    assert.equal(story.guidance().thread.stage, 'proof');
});
