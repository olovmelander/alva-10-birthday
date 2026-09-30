import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, HL } from '../skoldhast/src/game.mjs';
import { createInput } from '../skoldhast/src/input.mjs';

function beach() {
    const G = createGame();
    G.flags.add('intro_done');
    G.goto('land', { x: 88 * HL, y: -.9 * HL, facing: 1 });
    return G;
}
function settle(G) { for (let i = 0; i < 180; i++) G.step({}); }

test('jump emerges without jumping, then the next press jumps; repeated Down stays hidden', () => {
    const G = beach();
    G.step({ duck: true });
    assert.equal(G.player.hidden, true);
    G.step({ duck: true });
    assert.equal(G.player.hidden, true);
    G.step({ hop: true, duck: true });
    assert.equal(G.player.hidden, false);
    assert.equal(G.player.jump, null);
    assert.equal(G.lastEvents.filter(e => e.type === 'unhide').length, 1);
    G.step({ hop: true });
    assert.ok(G.player.jump);
    assert.ok(G.lastEvents.some(e => e.type === 'hop'));
});

test('Space cancels hiding queued during a gallop or jump, including after landing', () => {
    for (const airborne of [false, true]) {
        const G = beach();
        G.player.vx = 600;
        if (airborne) G.step({ hop: true });
        G.step({ duck: true });
        assert.equal(G.player.hideQueued, true);
        G.step({ hop: true });
        assert.equal(G.player.hideQueued, false);
        settle(G);
        assert.equal(G.player.hidden, false);
        assert.equal(G.player.hideQueued, false);
    }
});

test('Space jumps beside the stone; only the action button pushes it', () => {
    const G = beach();
    G.flags.add('p2_seen');
    G.goto('land', { x: 99.6 * HL, y: -.1 * HL, facing: 1 });
    G.step({});
    assert.equal(G.context?.id, 'knuffa');
    G.step({ hop: true, act: true });
    assert.equal(G.puz.stone, 0);
    assert.ok(G.player.jump);
    settle(G);
    G.step({ act: true });
    assert.equal(G.puz.stone, 1);
    assert.equal(G.player.jump, null);
});

test('Space never paints; interacting paints once and never falls back to a jump', () => {
    const G = beach();
    const pc = { id: 'controls', x: G.player.x, y: G.player.y, chapter: 1, prop: 'boat', propAt: { x: G.player.x, y: G.player.y } };
    G.sceneDef = { ...G.sceneDef, pencils: [pc] };
    G.flags.add('penna_controls');
    G.step({});
    assert.equal(G.context?.id, 'farglagg');
    G.step({ hop: true });
    assert.equal(G.flags.has('color_controls'), false);
    settle(G);
    G.step({ act: true });
    assert.equal(G.flags.has('color_controls'), true);
    assert.equal(G.player.jump, null);
    G.step({ act: true });
    assert.equal(G.player.jump, null);
});

test('Space emerges underwater and Down hides without invoking the pier drop action', () => {
    const G = beach();
    G.goto('kelp', { x: 10 * HL, y: 3 * HL, mode: 'swim', hidden: true });
    G.step({ hop: true });
    assert.equal(G.player.hidden, false);
    assert.equal(G.player.mode, 'swim');
    G.step({ duck: true });
    assert.equal(G.player.hidden, true);
    G.goto('viken', 'viewPier');
    assert.ok(G.player.surface?.dropIn);
    G.step({ duck: true });
    assert.equal(G.player.hidden, true);
    assert.equal(G.player.mode, 'ground');
});

// Small DOM event targets exercise the actual input handlers without rendering.
function target() {
    const t = new EventTarget(), classes = new Set();
    t.style = {};
    t.classList = { add: (...c) => c.forEach(v => classes.add(v)), remove: (...c) => c.forEach(v => classes.delete(v)), contains: c => classes.has(c) };
    return t;
}
function fire(target, type, values = {}) {
    const e = new Event(type, { cancelable: true });
    Object.assign(e, values);
    target.dispatchEvent(e);
    return e;
}
function inputHarness(t) {
    const win = target(), doc = target();
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = win; globalThis.document = doc;
    const settings = { holdToHide: false };
    const ui = Object.fromEntries(['stickZone', 'stickBase', 'stickKnob', 'hopBtn', 'actBtn', 'hideBtn'].map(k => [k, target()]));
    const input = createInput(target(), ui, { settings: () => settings, canvas: target() });
    t.after(() => { input.destroy(); globalThis.window = oldWindow; globalThis.document = oldDocument; });
    return { win, doc, ui, input, settings, down: (key, repeat = false) => fire(win, 'keydown', { key, repeat }), up: key => fire(win, 'keyup', { key }) };
}

test('keyboard jump is independent of focused controls, action holds, aliases and auto-repeat', t => {
    const { input, doc, ui, down, up } = inputHarness(t);
    doc.activeElement = ui.hideBtn; ui.hideBtn.tagName = 'BUTTON';
    assert.equal(down(' ').defaultPrevented, true);
    assert.equal(input.consume().hop, true);
    down('e');
    assert.equal(input.consume().act, true);
    up('e');
    assert.equal(input.state().hopHeld, true, 'releasing E cannot cut a held jump');
    assert.equal(down(' ', true).defaultPrevented, true, 'held Space cannot scroll the page');
    assert.equal(input.consume().hop, false);
    up(' ');
    assert.equal(input.state().hopHeld, false);
    down('a'); down('ArrowLeft'); up('a');
    assert.equal(input.state().x, -1, 'the second movement key remains held');
    up('ArrowLeft');
    assert.equal(input.state().x, 0);
    down('s');
    assert.equal(input.consume().duck, true);
    assert.equal(input.state().y, 0, 'Down does not also dive off a pier');
    down('s', true);
    assert.equal(input.consume().duck, false);
    up('s'); down('X');
    assert.equal(input.state().y, 1, 'X preserves active underwater diving');
});

test('overlapping hide keys release only after the last one, and blur clears all held input', t => {
    const { input, win, settings, down, up } = inputHarness(t);
    settings.holdToHide = true;
    down('s'); down('ArrowDown'); input.consume();
    up('s');
    assert.equal(input.consume().hideUp, false);
    assert.equal(input.state().hideHeld, true);
    up('ArrowDown');
    assert.equal(input.consume().hideUp, true);
    down('s'); down(' '); down('d'); input.consume();
    fire(win, 'blur');
    assert.deepEqual(input.state(), { x: 0, y: 0, hopHeld: false, hideHeld: false });
    assert.equal(input.consume().hideUp, true);
    down(' ', true);
    assert.equal(input.consume().hop, false, 'a held key cannot reactivate after focus returns');
});

test('text fields and panels retain their keys; disabled action buttons do nothing', t => {
    const { input, doc, ui, down } = inputHarness(t);
    doc.activeElement = { tagName: 'INPUT' };
    assert.equal(down('s').defaultPrevented, false);
    assert.equal(input.consume().duck, false);
    doc.activeElement = { isContentEditable: true };
    assert.equal(down(' ').defaultPrevented, false);
    doc.activeElement = null; ui.panelOpen = () => true;
    assert.equal(down(' ').defaultPrevented, false);
    assert.equal(input.consume().hop, false);
    ui.actBtn.disabled = true;
    fire(ui.actBtn, 'pointerdown', { pointerId: 1 });
    fire(ui.actBtn, 'click', { detail: 0 });
    assert.equal(input.consume().act, false);
});
