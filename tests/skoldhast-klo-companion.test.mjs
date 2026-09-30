import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../skoldhast/src/game.mjs';
import { describeGuidance } from '../skoldhast/src/guidance-state.mjs';
import { createKloCompanion, normalizeKloHelpMode, sanitizeKloHints } from '../skoldhast/src/klo-companion.mjs';
import { KLO_COMPANION as W } from '../skoldhast/src/content/sv.mjs';

function stage({ scene = 'land', x = 106 * 200, y = -80, objective = 'pool' } = {}) {
    const G = createGame(), models = [], sounds = [], calls = [];
    for (const f of ['intro_done', 'klo_hidden', 'klo_ja', 'rule_demo']) G.flags.add(f);
    G.goto(scene, { x, y, mode: scene === 'land' ? 'ground' : 'swim' });
    G.actors.klo = { id: 'klo', scene, x: -10000, y: -80, visible: false, pose: 'idle', facing: 1 };
    let allowed = true, running = false, topic = objective, restored = 0, open = false;
    const story = { guidance: () => describeGuidance(G, { objective: topic }), running: () => running,
        restoreActors() { restored++; Object.assign(G.actors.klo, { x: 106.8 * 200, y: -78, scene: G.sceneId, visible: true, pose: 'idle' }); } };
    const ui = { show(m) { models.push(m); open = true; }, update(m) { models.push(m); }, hide() { open = false; }, pulse() { calls.push('pulse'); } };
    const companion = createKloCompanion(G, { story, ui, canCall: () => allowed && !running && !G.busy,
        guide: { clear() { calls.push('clear'); } }, audio: { sfx: s => sounds.push(s) },
        onSuspend: () => calls.push('suspend'), onResume: () => calls.push('resume') });
    G.companion = companion;
    return { G, companion, models, sounds, calls, story, ui,
        allow: on => { allowed = on; }, run: on => { running = on; }, objective: t => { topic = t; },
        get restored() { return restored; }, get open() { return open; } };
}

test('an offscreen call offers a conversation without spending a clue or changing puzzle state', () => {
    const s = stage(), { G, companion: c } = s;
    const before = G.serialize();
    assert.equal(c.call(), true);
    assert.equal(c.phase, 'arriving');
    assert.ok(G.actors.klo.visible);
    assert.equal(c.journal().level, 0);
    assert.equal(c.markerActive(), false);
    c.tick(2);
    assert.equal(c.phase, 'talking');
    c.choose('recap'); c.choose('local');
    assert.equal(c.journal().level, 0);
    assert.deepEqual(G.serialize(), before, 'conversation does not award flags, evidence or progress');
    assert.equal(s.models.at(-1).topic, 'local');
    c.close();
    assert.equal(c.suspended(), false);
    assert.equal(c.phase, 'watching');
    assert.equal(s.open, false);
    assert.deepEqual(s.calls, ['clear', 'suspend', 'resume']);
});

test('reading freezes actual swimming, hidden drift, puzzle holds and game timers', () => {
    const s = stage({ scene: 'kelp', x: 24 * 200, y: 8 * 200, objective: 'p5' });
    const { G, companion: c } = s;
    G.player.hidden = true; G.player.hide = 1; G.player.vx = 51; G.player.vy = 76;
    G.player.inLane = G.sceneDef.lanes.find(l => l.id === 'lane-vault');
    let timer = false; G.later(.1, () => { timer = true; });
    const physical = JSON.stringify(G.player), puzzle = JSON.stringify(G.puz), time = G.time;
    c.call();
    for (let n = 0; n < 360; n++) { G.step({ x: 1, hideRelease: true }); c.tick(1 / 120); }
    assert.equal(c.phase, 'talking');
    assert.equal(G.time, time);
    assert.equal(JSON.stringify(G.player), physical);
    assert.equal(JSON.stringify(G.puz), puzzle);
    assert.equal(timer, false);
    assert.ok(G.actors.klo.companion.time >= 2.9, 'Klo still has presentation time');
    c.close();
    for (let n = 0; n < 20; n++) G.step({});
    assert.equal(timer, true);
    assert.equal(G.player.hidden, true);
    assert.ok(G.time > time);
});

test('three requested levels are shared with the journal and markers clear on progress', () => {
    const { G, companion: c, models, objective } = stage();
    c.call(); c.choose('hint');
    assert.equal(models.at(-1).text, W.help.pool[0]);
    assert.equal(c.journal().level, 1);
    assert.equal(c.markerActive(), false);
    c.close();
    const second = c.journal().request();
    assert.equal(second.level, 2);
    assert.equal(second.text, W.help.pool[1]);
    assert.equal(c.markerActive(), false);
    c.call(); c.choose('hint');
    assert.equal(c.journal().level, 3);
    assert.equal(c.hintInfo().level, 1);
    assert.equal(c.hintInfo().spot.scene, 'land');
    c.close();
    G.player.x = 102 * 200;
    assert.equal(c.journal().level, 3, 'approaching the same experiment keeps depth');
    assert.ok(c.journal().instruction.includes('Göm'));
    objective('p2'); G.flags.add('p2_seen');
    assert.equal(c.markerActive(), false, 'new committed task cannot inherit a target');
    assert.equal(c.journal().level, 0);
});

test('K accelerates an arrival, closes the conversation, and immediately recalls a watching professor', () => {
    const { companion: c } = stage();
    c.call(); c.call();
    assert.equal(c.phase, 'talking');
    c.call(); assert.equal(c.phase, 'watching');
    c.call(); c.tick(.5);
    assert.equal(c.phase, 'talking');
    assert.equal(c.journal().level, 0);
});

test('the hiding lesson keeps its actor in the hole and cannot be completed by calling', () => {
    const { G, companion: c } = stage({ objective: 'hide' });
    G.flags.delete('rule_demo'); G.flags.delete('klo_ja');
    Object.assign(G.actors.klo, { x: 106.2 * 200, y: -82, visible: true, inHole: true, pose: 'peek' });
    G.player.x = 90 * 200;
    const actor = { ...G.actors.klo }, flags = [...G.flags];
    c.call(); c.choose('hint'); c.choose('hint'); c.choose('hint'); c.close();
    assert.deepEqual(G.actors.klo, { ...actor, talking: false });
    assert.deepEqual([...G.flags], flags);
    assert.equal(c.phase, 'idle');
});

test('story priority and scene transitions cancel a visit without restoring an old actor snapshot', () => {
    const s = stage(), { G, companion: c } = s;
    c.call(); c.tick(2);
    c.yieldToStory();
    Object.assign(G.actors.klo, { x: 4300, pose: 'map-corner' });
    c.tick(20);
    assert.equal(G.actors.klo.x, 4300);
    assert.equal(G.actors.klo.pose, 'map-corner');
    assert.equal(s.restored, 0);
    s.run(true); assert.equal(c.call(), false);
    s.run(false); c.call();
    G.goto('kelp', 'fromLand');
    assert.equal(c.suspended(), false);
    assert.equal(c.phase, 'idle');
    assert.equal(G.actors.klo.companion, undefined);
    assert.equal(s.open, false);
    assert.equal(s.calls.filter(x => x === 'resume').length, 2);
});

test('a research visit reacts to success, leaves gracefully and releases its presentation', () => {
    const s = stage(), { G, companion: c } = s;
    c.call(); c.tick(2); c.close();
    G.emit('grow', {}); c.tick(.1);
    assert.equal(G.actors.klo.pose, 'happy');
    c.tick(13); assert.equal(c.phase, 'leaving');
    c.tick(1); assert.equal(c.phase, 'idle');
    assert.equal(G.actors.klo.companion, undefined);
    assert.equal(s.restored, 1);
});

test('requested clue memory survives reload but temporary visit and highlights never do', () => {
    const { companion: c } = stage();
    c.call(); for (let n = 0; n < 3; n++) c.choose('hint');
    const stored = c.serialize();
    c.restore(stored);
    assert.equal(c.phase, 'idle');
    assert.equal(c.markerActive(), false);
    assert.equal(c.journal().level, 3);
    assert.equal(c.journal().text, c.journal().instruction);
    assert.deepEqual(sanitizeKloHints([['pool', 3], ['<bad>', 2], ['p7:plate:001', 1], ['x', 12], null]), [['pool', 3], ['p7:plate:001', 1]]);
    assert.equal(sanitizeKloHints(Array.from({ length: 500 }, () => ['pool', 2])).length, 128);
    assert.deepEqual(sanitizeKloHints({ pool: 3 }), []);
    c.restore([]); assert.equal(c.journal().level, 0);
});

test('legacy help preferences migrate deliberately while new games default to requested help', () => {
    for (const [before, after] of [[undefined, 'ask'], ['easy', 'guided'], ['normal', 'remind'], ['hard', 'ask'], ['garbage', 'ask'], ['guided', 'guided'], ['remind', 'remind'], ['ask', 'ask']]) {
        assert.equal(normalizeKloHelpMode(before), after);
    }
});
