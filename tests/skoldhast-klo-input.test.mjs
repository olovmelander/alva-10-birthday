import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../skoldhast/src/input.mjs';

function fire(target, type, values = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, values); target.dispatchEvent(event); return event;
}
function target() {
    const node = new EventTarget(), classes = new Set(), captured = new Set();
    node.style = {};
    node.classList = {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name),
        toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }
    };
    node.getBoundingClientRect = () => ({ left: 0, top: 0 });
    node.setPointerCapture = id => captured.add(id);
    node.releasePointerCapture = id => {
        assert.ok(captured.delete(id), 'release an actual held capture');
        fire(node, 'lostpointercapture', { pointerId: id });
    };
    node.captured = captured;
    return node;
}
function harness(t) {
    const previous = { window: globalThis.window, document: globalThis.document };
    const win = Object.assign(target(), { innerWidth: 844, innerHeight: 390 });
    const doc = target(), canvas = target();
    globalThis.window = win; globalThis.document = doc;
    const ui = Object.fromEntries(['stickZone', 'stickBase', 'stickKnob', 'hopBtn', 'actBtn', 'hideBtn'].map(name => [name, target()]));
    let chatting = false;
    const settings = { followFinger: false, holdToHide: true };
    const input = createInput(target(), ui, { canvas, settings: () => settings,
        companionOpen: () => chatting, heroScreen: () => ({ x: 200, y: 200 }), heroHit: () => false });
    t.after(() => { input.destroy(); Object.assign(globalThis, previous); });
    return { win, doc, canvas, ui, input, settings, chat: () => { chatting = true; input.release(); } };
}

test('calling Klo releases live multitouch captures and cannot replay their release as an action', t => {
    const { ui, input, chat } = harness(t);
    fire(ui.stickZone, 'pointerdown', { pointerId: 1, clientX: 40, clientY: 80 });
    fire(ui.stickZone, 'pointermove', { pointerId: 1, clientX: 98, clientY: 80 });
    fire(ui.hideBtn, 'pointerdown', { pointerId: 2 });
    assert.equal(input.state().x, 1);
    assert.equal(input.state().hideHeld, true);
    chat();
    assert.equal(ui.stickZone.captured.size + ui.hideBtn.captured.size, 0);
    assert.deepEqual(input.state(), { x: 0, y: 0, hopHeld: false, hideHeld: false });
    input.consume();
    fire(ui.stickZone, 'pointerup', { pointerId: 1, clientX: 98, clientY: 80 });
    fire(ui.hideBtn, 'pointerup', { pointerId: 2 });
    assert.ok(Object.values(input.consume()).every(value => !value));
});

test('a Klo conversation leaves native button keys alone and K remains a single edge', t => {
    const { win, doc, input, chat } = harness(t);
    chat(); doc.activeElement = { tagName: 'BUTTON' };
    for (const key of [' ', 'Enter', 'ArrowDown', 'e', 'j', 'Escape']) {
        assert.equal(fire(win, 'keydown', { key }).defaultPrevented, false, key);
    }
    assert.ok(Object.values(input.consume()).every(value => !value));
    assert.equal(fire(win, 'keydown', { key: 'k' }).defaultPrevented, true);
    assert.equal(input.consume().tapKlo, true);
    fire(win, 'keydown', { key: 'k', repeat: true });
    assert.equal(input.consume().tapKlo, false);
    fire(win, 'keyup', { key: 'k' }); fire(win, 'keydown', { key: 'K' });
    assert.equal(input.consume().tapKlo, true);
});

test('follow-finger capture is released on blur and cannot steer on focus return', t => {
    const { win, canvas, input, settings } = harness(t);
    settings.followFinger = true;
    fire(canvas, 'pointerdown', { pointerId: 3, clientX: 600, clientY: 200 });
    assert.equal(input.state().x, 1);
    fire(win, 'blur');
    assert.equal(canvas.captured.size, 0);
    fire(canvas, 'pointermove', { pointerId: 3, clientX: 700, clientY: 200 });
    assert.equal(input.state().x, 0);
});
