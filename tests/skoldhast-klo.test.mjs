import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShuffleBag, createKloReactions, KLO_TAP_COOLDOWN, beginKloWalk, stepKloWalk, sampleKlo, KLO_LETTERED } from '../skoldhast/src/klo.mjs';
import { KLO_JOKES } from '../skoldhast/src/content/sv.mjs';
import { createInput } from '../skoldhast/src/input.mjs';

const seeded = () => { let n = 713; return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296); };

test('Klo has at least thirty Swedish research jokes, with no repeats inside or across shuffled bags', () => {
    assert.ok(KLO_JOKES.length >= 30);
    assert.equal(new Set(KLO_JOKES).size, KLO_JOKES.length);
    const bag = createShuffleBag(KLO_JOKES, seeded());
    let previous;
    for (let round = 0; round < 4; round++) {
        const heard = [];
        for (let i = 0; i < KLO_JOKES.length; i++) {
            const line = bag.next(); assert.notEqual(line, previous); heard.push(line); previous = line;
        }
        assert.equal(new Set(heard).size, KLO_JOKES.length);
    }
});

test('Klo taps are rate-limited and cannot interrupt story, dialogue, hidden or off-screen actors', () => {
    const reactions = createKloReactions(KLO_JOKES, seeded());
    const actor = { visible: true, scene: 'land', pop: 0 };
    const state = { actor, scene: 'land', time: 0, visible: true };
    const first = reactions.tap(state); assert.equal(first.count, 1);
    assert.equal(reactions.tap({ ...state, time: KLO_TAP_COOLDOWN - 0.01 }), null);
    const ready = { ...state, time: KLO_TAP_COOLDOWN };
    for (const blocked of [{ busy: true }, { running: true }, { dialogue: true }, { visible: false }, { scene: 'kelp' },
        { actor: { ...actor, visible: false } }, { actor: { ...actor, inHole: true } }, { actor: { ...actor, pop: 1 } }]) {
        assert.equal(reactions.tap({ ...ready, ...blocked }), null);
    }
    const next = reactions.tap(ready); assert.equal(next.count, 2); assert.notEqual(first.line, next.line);
});

test('Klo scuttles smoothly in both directions, reaches the exact endpoint, follows the ground and stops', () => {
    for (const sign of [-1, 1]) {
        let resolved = 0;
        const actor = { x: 21360, y: -78, facing: sign };
        beginKloWalk(actor, actor.x + sign * 180, 360, () => resolved++);
        const speeds = [];
        while (actor.walk) {
            const last = actor.x;
            stepKloWalk(actor, 1 / 120, (x) => -78 + (x - 21360) * 0.04);
            speeds.push(Math.abs(actor.vx));
            assert.ok((actor.x - last) * sign >= 0, 'no reversal or overshoot');
        }
        assert.equal(actor.x, 21360 + sign * 180);
        assert.ok(Math.abs(actor.y - (-78 + sign * 180 * 0.04)) < 1e-9);
        assert.equal(actor.vx, 0); assert.equal(resolved, 1);
        assert.ok(speeds[0] < 20 && speeds.at(-2) < 20, 'eased departure and arrival');
        assert.ok(Math.max(...speeds) > 300 && Math.max(...speeds) <= 360);
        assert.ok(Math.abs(actor.distance - 180) < 1e-8);
    }
});

test('Klo animation preserves lettering and samples scuttle, blink, reactions and underwater motion locally', () => {
    const a = { x: 21000, y: -80, pose: 'idle', distance: 125, vx: 220, walk: {}, reactAt: 1 };
    const at = sampleKlo(a, { time: 1.31 });
    assert.ok(at.hop > 20 && at.activity === 1 && at.wave);
    const translated = sampleKlo({ ...a, x: a.x + 40000, y: a.y + 1200 }, { time: 1.31 });
    assert.deepEqual(at, translated, 'world position never enters local animation arithmetic');
    assert.ok(sampleKlo({ pose: 'idle' }, { time: 4.36 }).blink);
    assert.notEqual(sampleKlo(a, { time: 1, underwater: true }).bob, sampleKlo(a, { time: 2, underwater: true }).bob);
    for (const pose of KLO_LETTERED) assert.equal(sampleKlo({ pose, facing: -1 }).lettered, true);
    const less = sampleKlo(a, { time: 1.31, reducedMotion: true });
    assert.equal(less.hop, 0); assert.equal(less.bob, 0);
});

// Input regression uses actual event listeners: the transparent stick area sits above the canvas.
class Element extends EventTarget {
    constructor() { super(); this.style = {}; const flags = new Set(); this.classList = { add: (...v) => v.forEach((x) => flags.add(x)), remove: (...v) => v.forEach((x) => flags.delete(x)), contains: (x) => flags.has(x), toggle: (x, on) => on ? flags.add(x) : flags.delete(x) }; }
    setPointerCapture() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 300, height: 240 }; }
}
const event = (target, type, fields = {}) => {
    const e = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries({ pointerId: 1, clientX: 50, clientY: 100, timeStamp: 0, ...fields })) Object.defineProperty(e, key, { value });
    target.dispatchEvent(e);
};

test('Klo touch/mouse taps and K key coexist with the hero, the stick and canceled pointers', () => {
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = new Element(); globalThis.document = new Element(); document.activeElement = null;
    const ui = Object.fromEntries(['stickZone', 'stickBase', 'stickKnob', 'actBtn', 'hideBtn'].map((key) => [key, new Element()]));
    const canvas = new Element();
    const input = createInput(new Element(), ui, { canvas, settings: () => ({}), isGalloping: () => false, isStopped: () => true,
        heroHit: (x) => x < 150, kloHit: (x) => x < 60, heroScreen: () => ({ x: 100, y: 100 }) });
    try {
        for (const surface of [ui.stickZone, canvas]) {
            event(surface, 'pointerdown'); event(surface, 'pointerup', { timeStamp: 80 });
            const crab = input.consume(); assert.equal(crab.tapKlo, true); assert.equal(crab.tapHero, false);
            event(surface, 'pointerdown', { clientX: 100 }); event(surface, 'pointerup', { clientX: 100, timeStamp: 80 });
            const hero = input.consume(); assert.equal(hero.tapHero, true); assert.equal(hero.tapKlo, false);
            event(surface, 'pointerdown'); event(surface, 'pointercancel', { timeStamp: 80 });
            const canceled = input.consume(); assert.equal(canceled.tapKlo, false); assert.equal(canceled.tapHero, false);
        }
        event(ui.stickZone, 'pointerdown'); event(ui.stickZone, 'pointermove', { clientX: 110, timeStamp: 40 });
        assert.ok(input.state().x > 0.9, 'dragging still drives the stick');
        event(ui.stickZone, 'pointerup', { clientX: 110, timeStamp: 80 });
        assert.equal(input.consume().tapKlo, false);
        event(window, 'keydown', { key: 'K' }); assert.equal(input.consume().tapKlo, true);
        event(window, 'keydown', { key: 'k', repeat: true }); assert.equal(input.consume().tapKlo, false);
        event(window, 'keydown', { key: 'K' }); input.setEnabled(false); assert.equal(input.consume().tapKlo, false);
        event(window, 'keydown', { key: 'K' }); assert.equal(input.consume().tapKlo, false);
    } finally { input.destroy(); globalThis.window = oldWindow; globalThis.document = oldDocument; }
});

test('follow-finger routes the left overlay to steering and Klo taps; canceled gallop cannot latch', () => {
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = new Element(); globalThis.document = new Element(); document.activeElement = null;
    window.innerWidth = 844; window.innerHeight = 390;
    const settings = { followFinger: true, holdGallop: true };
    const ui = Object.fromEntries(['stickZone', 'stickBase', 'stickKnob', 'actBtn', 'hideBtn'].map((key) => [key, new Element()]));
    const canvas = new Element();
    const input = createInput(new Element(), ui, { canvas, settings: () => settings, isGalloping: () => true, isStopped: () => false,
        heroHit: (x) => x < 150, kloHit: (x) => x < 60, heroScreen: () => ({ x: 100, y: 100 }) });
    try {
        for (const area of [ui.stickZone, canvas]) {
            event(area, 'pointerdown');
            assert.equal(input.state().x, 0, 'a Klo tap waits without moving the hero or camera');
            event(area, 'pointerup', { timeStamp: 80 });
            assert.equal(input.consume().tapKlo, true, 'Klo can be tapped in follow mode');
            assert.equal(input.state().x, 0, 'releasing a follow touch releases steering');
            event(area, 'pointerdown');
            event(area, 'pointermove', { clientX: 260, timeStamp: 40 });
            assert.ok(input.state().x > 0.4, 'dragging away from Klo becomes ordinary steering');
            event(area, 'lostpointercapture', { clientX: 260, timeStamp: 80 });
            assert.equal(input.state().x, 0);
            assert.equal(input.consume().tapKlo, false);
        }
        event(ui.stickZone, 'pointerdown', { clientX: 220 });
        assert.ok(input.state().x > 0.3, 'ordinary follow touches steer immediately through the overlay');
        event(ui.stickZone, 'pointerup', { clientX: 220, timeStamp: 80 });
        settings.followFinger = false;
        for (const finish of ['pointerup', 'pointercancel', 'lostpointercapture']) {
            event(ui.stickZone, 'pointerdown', { clientX: 180 });
            event(ui.stickZone, 'pointermove', { clientX: 240, timeStamp: 40 });
            event(ui.stickZone, finish, { clientX: 240, timeStamp: 80 });
            assert.equal(input.state().x, finish === 'pointerup' ? 1 : 0, finish + ' releases or intentionally latches');
        }
    } finally { input.destroy(); globalThis.window = oldWindow; globalThis.document = oldDocument; }
});
