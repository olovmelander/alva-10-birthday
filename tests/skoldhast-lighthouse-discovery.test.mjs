import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';
import { STORY } from '../skoldhast/src/content/sv.mjs';
import { STEP } from '../skoldhast/src/sim.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
const landRoute = ['intro_done', 'b:k1_enter', 'b:k1_stopwatch', 'klo_hidden', 'klo_ja', 'b:k1_ja',
    'b:k1_mapcorner', 'rule_demo', 'p1_inked', 'p3_t1', 'p3_t2', 'p3_t3', 'p3_done', 'b:k1_p3',
    'p4_leap', 'b:k2_leap', 'exp_sprang', 'exp_sprang_logged'];

function reader({ seaFirst = false, saved } = {}) {
    const G = createGame(), cards = [], vistas = [];
    let controls = true, active = null, dismiss = null;
    G.story = createStory(G, {
        ui: {
            controls: { classList: { contains: name => name === 'off' && !controls } },
            showControls: visible => { controls = visible; },
            async say(lines) {
                for (const line of lines) {
                    cards.push({ line, active, controls });
                    if (line[1] === STORY.k2.lighthouseIntro?.[1] || line[1] === STORY.k2.lighthouse[1]) {
                        await new Promise(resolve => { dismiss = resolve; });
                    }
                }
            },
            toast() {}, pulse() {}, report: async () => {}
        },
        async fx(name, data) {
            if (name !== 'vista') { await data?.whileVisible?.(); return; }
            active = data; vistas.push(data);
            try { await data.whileVisible?.(); } finally { active = null; }
        },
        save() {}
    });
    G.restore(saved || { flags: [...landRoute, ...(seaFirst ? [...CODE_RESTORE[1].flags, 'ch2_open',
        'b:k2_open', 'b:k2_note2', 'p5_lit', 'b:k2_lit', 'mark_sea', 'b:k2_mark_sea'] : [])], checkpoint: 'udden' });
    async function step(seconds = STEP) {
        for (let i = 0; i < Math.round(seconds / STEP); i++) { G.step({}); await tick(); }
    }
    return { G, cards, vistas, step, get active() { return active; }, get controls() { return controls; },
        async until(predicate) {
            for (let i = 0; i < 1200 && !predicate(); i++) await step();
            assert.ok(predicate(), `requested discovery stage starts; running=${G.story.running()}`);
        },
        async dismiss() { assert.ok(dismiss); const finish = dismiss; dismiss = null; finish(); await tick(); }
    };
}

async function finishDiscovery(R) {
    assert.ok(STORY.k2.lighthouseIntro);
    await R.until(() => !!R.cards.at(-1)?.line && R.cards.at(-1).line[1] === STORY.k2.lighthouseIntro[1]);
    const vista = R.active;
    assert.ok(vista, 'the real bay is visible before Klo points out the lighthouse');
    assert.equal(vista.scene, 'viken'); assert.equal(vista.lighthouse, true); assert.equal(vista.comparison, true);
    assert.notEqual(vista.peek, true, 'the keeper reveal remains a later discovery');
    assert.equal(R.controls, false);
    const player = R.G.player;
    const pose = () => ({ x: player.x, y: player.y, vx: player.vx, vy: player.vy, hidden: player.hidden, hide: player.hide });
    const heldPose = pose();
    assert.equal(R.G.worldInspection?.player, player);
    await R.step(15);
    assert.equal(R.active, vista, 'a slow reader keeps both lighthouse and reflection visible');
    assert.deepEqual(pose(), heldPose, 'the unseen swimmer cannot drift during the lighthouse view');
    assert.equal(R.G.has('clue_lighthouse'), false);
    await R.dismiss();
    assert.deepEqual(R.cards.at(-1).line, STORY.k2.lighthouse);
    assert.equal(R.active, vista, 'the horse makes its observation while looking at the same evidence');
    await R.step(15);
    assert.equal(R.active, vista); assert.equal(R.controls, false);
    assert.deepEqual(pose(), heldPose, 'the same hold lasts through the horse’s observation');
    assert.equal(R.G.has('b:k2_mark_land'), false);
    await R.dismiss();
    await R.until(() => R.G.has('b:k2_mark_land'));
    assert.equal(R.G.has('clue_lighthouse'), true);
    assert.equal(R.active, null); assert.equal(R.controls, true);
    assert.equal(R.G.worldInspection, null);
}

for (const seaFirst of [false, true]) test(`land discovery holds the lighthouse evidence and resumes an interrupted reading, sea first ${seaFirst}`, async () => {
    const R = reader({ seaFirst });
    R.G.flag('mark_land'); R.G.emit('mark', { id: 'mark_land' });
    await R.until(() => !!R.active);
    const interrupted = R.G.serialize();
    assert.ok(interrupted.flags.includes('mark_land'));
    assert.equal(interrupted.flags.includes('b:k2_mark_land'), false);
    await finishDiscovery(R);
    assert.equal(R.G.has('ch1_end'), seaFirst, 'early land discovery does not invent a cave visit');
    const resumed = reader({ saved: interrupted });
    await finishDiscovery(resumed);
    assert.equal(resumed.vistas.filter(vista => !vista.peek).length, 1);
    const completed = reader({ saved: resumed.G.serialize() });
    await completed.step(.5);
    assert.equal(completed.vistas.filter(vista => !vista.peek).length, 0, 'a committed observation never replays on reload');
});

test('an unfinished land discovery restores from an underwater checkpoint without needing land-only spots', async () => {
    const R = reader({ seaFirst: true });
    const saved = R.G.serialize(); saved.flags.push('mark_land'); saved.checkpoint = 'trench';
    const restored = reader({ saved });
    const player = restored.G.player;
    player.vx = 220; player.vy = -31;
    await finishDiscovery(restored);
    assert.equal(restored.G.sceneId, 'kelp');
    assert.equal(restored.G.player, player, 'the vista handoff does not replace the playable swimmer');
    assert.equal(restored.G.worldInspection, null);
});
