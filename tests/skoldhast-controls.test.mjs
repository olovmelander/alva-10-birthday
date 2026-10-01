import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, HL } from '../skoldhast/src/game.mjs';
import { createInput, upMeansHop, WALK, PAD } from '../skoldhast/src/input.mjs';

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

test('Space emerges underwater and a tuck request hides without invoking the pier drop action', () => {
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
function inputHarness(t, extra = {}) {
    const win = target(), doc = target();
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    globalThis.window = win; globalThis.document = doc;
    const settings = { holdToHide: false };
    const world = { mode: 'ground', devices: [] };
    const ui = Object.fromEntries(['stickZone', 'stickBase', 'stickKnob', 'hopBtn', 'actBtn', 'hideBtn'].map(k => [k, target()]));
    const input = createInput(target(), ui, { settings: () => settings, canvas: target(), mode: () => world.mode,
        onDevice: d => world.devices.push(d), ...extra });
    t.after(() => { input.destroy(); globalThis.window = oldWindow; globalThis.document = oldDocument; });
    return { win, doc, ui, input, settings, world,
        down: (key, repeat = false, code) => fire(win, 'keydown', { key, repeat, ...(code ? { code } : {}) }),
        up: (key, code) => fire(win, 'keyup', { key, ...(code ? { code } : {}) }) };
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
    up('s');
});

test('Down tucks in on land but swims down in the water, like the touch stick', t => {
    const { input, world, down, up } = inputHarness(t);
    down('ArrowDown');
    assert.deepEqual([input.consume().duck, input.state().y, input.state().hideHeld], [true, 0, true]);
    up('ArrowDown');
    world.mode = 'swim';
    for (const key of ['ArrowDown', 's']) {
        down(key);
        const e = input.consume(), s = input.state();
        assert.equal(e.duck, false, key + ' never hides under water');
        assert.equal(e.hide, false);
        assert.equal(s.y, 1, key + ' dives');
        assert.equal(s.hideHeld, false, 'a held dive is not a held hide in hold mode');
        up(key);
    }
    down('g');
    assert.equal(input.consume().hide, true, 'G hides in the water too');
    assert.equal(input.state().hideHeld, true);
    up('g');
    down('x');
    assert.equal(input.state().y, 0, 'X is no longer a second dive key');
});

test('Up jumps on land and comes out of the shell, but only swims in the water', t => {
    const { input, world, down, up } = inputHarness(t);
    for (const key of ['ArrowUp', 'w']) {
        down(key);
        assert.equal(input.consume().up, true);
        assert.equal(input.state().hopHeld, true, key + ' held keeps the jump high, like Space');
        assert.equal(input.state().y, 0, 'on land Up is not steering');
        up(key);
    }
    world.mode = 'swim';
    down('w');
    assert.equal(input.consume().up, true);
    assert.deepEqual([input.state().y, input.state().hopHeld], [-1, false]);
    up('w');
    assert.equal(upMeansHop({ mode: 'ground' }), true);
    assert.equal(upMeansHop({ mode: 'air' }), true, 'a press in the air is buffered like Space');
    assert.equal(upMeansHop({ mode: 'swim' }), false);
    assert.equal(upMeansHop({ mode: 'swim', hidden: true }), true, 'Up brings a hidden swimmer out');
});

test('Up and Space bring the horse out and Up then jumps; Down in the water never hides', () => {
    const G = beach();
    G.step({ duck: true });
    assert.equal(G.player.hidden, true);
    G.step({ hop: upMeansHop(G.player) });
    assert.equal(G.player.hidden, false);
    assert.equal(G.player.jump, null, 'coming out does not jump');
    G.step({ hop: upMeansHop(G.player) });
    assert.ok(G.player.jump, 'the next Up jumps');
    G.goto('kelp', { x: 10 * HL, y: 4 * HL, mode: 'swim' });
    const y0 = G.player.y;
    for (let i = 0; i < 60; i++) G.step({ y: 1, hop: i === 0 && upMeansHop(G.player) });
    assert.equal(G.player.hidden, false);
    assert.ok(G.player.y > y0 + 40, 'holding Down dives');
});

test('opposite directions follow the newest press, and Shift walks calmly', t => {
    const { input, world, down, up } = inputHarness(t);
    down('a'); down('d');
    assert.equal(input.state().x, 1, 'the newest press wins instead of cancelling out');
    up('d');
    assert.equal(input.state().x, -1, 'releasing it returns to the older key');
    up('a');
    down('Shift'); down('ArrowRight');
    assert.equal(input.state().x, WALK.land);
    world.mode = 'swim';
    down('ArrowUp');
    assert.deepEqual([input.state().x, input.state().y], [WALK.water, -WALK.water]);
    up('Shift');
    assert.deepEqual([input.state().x, input.state().y], [1, -1]);
    up('ArrowRight'); up('ArrowUp');
    down(' ');
    assert.equal(input.state().y, -1, 'holding Space swims up');
});

test('movement keys follow their place on the keyboard; the verbs keep their letters', t => {
    const { input, world, down, up } = inputHarness(t);
    world.mode = 'swim';
    down('z', false, 'KeyW');
    assert.equal(input.state().y, -1, 'AZERTY Z sits where W does');
    up('z', 'KeyW');
    down('w', false, 'KeyZ');
    assert.equal(input.state().y, 0, 'a W printed elsewhere is not a direction');
    up('w', 'KeyZ');
    down('e', false, 'KeyE');
    assert.equal(input.consume().act, true);
    assert.deepEqual(world.devices, ['keys']);
});

test('a gamepad plays, navigates menus and reports itself as the device in use', t => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const gp = { connected: true, axes: [0, 0, 0, 0], buttons };
    const oldNav = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [gp] }, configurable: true });
    t.after(() => Object.defineProperty(globalThis, 'navigator', { value: oldNav, configurable: true }));
    let scope = null, backs = 0;
    const { input, settings, world, doc } = inputHarness(t, { focusScope: () => scope, onBack: () => backs++ });
    let now = 1000;
    const tick = () => { now += 20; globalThis.performance.now = () => now; return input.consume(); };
    const realNow = globalThis.performance.now;
    t.after(() => { globalThis.performance.now = realNow; });
    gp.axes[0] = 0.5;
    tick();
    const walk = input.state().x;
    assert.ok(walk > 0.2 && walk < 0.72, 'a half-pushed stick walks or trots');
    gp.axes[0] = 0; buttons[PAD.right].pressed = true;
    tick();
    assert.equal(input.state().x, 1, 'the D-pad is a full press');
    buttons[PAD.right].pressed = false;
    buttons[PAD.a].pressed = true;
    assert.equal(tick().hop, true);
    assert.equal(input.state().hopHeld, true);
    assert.equal(tick().hop, false, 'a held A is one jump');
    buttons[PAD.a].pressed = false;
    settings.holdToHide = true;
    buttons[PAD.b].pressed = true;
    assert.equal(tick().hide, true);
    assert.equal(input.state().hideHeld, true);
    buttons[PAD.b].pressed = false;
    assert.equal(tick().hideUp, true);
    buttons[PAD.x].pressed = true;
    assert.equal(tick().act, true);
    buttons[PAD.x].pressed = false;
    buttons[PAD.y].pressed = true;
    assert.equal(tick().tapKlo, true);
    buttons[PAD.y].pressed = false; tick();
    assert.equal(world.devices.at(-1), 'pad');
    // In a menu the same buttons move and press the focus instead of playing.
    const clicked = [];
    const item = name => ({ disabled: false, getClientRects: () => [1], closest: () => null, focus() { doc.activeElement = this; }, click: () => clicked.push(name) });
    const items = [item('fortsätt'), item('inställningar')];
    scope = { querySelectorAll: () => items, contains: n => items.includes(n) };
    doc.activeElement = items[0];
    buttons[PAD.down].pressed = true;
    tick();
    assert.equal(doc.activeElement, items[1]);
    assert.equal(input.state().y, 0, 'menu navigation does not steer the horse');
    buttons[PAD.down].pressed = false;
    buttons[PAD.a].pressed = true;
    const menuEdges = tick();
    assert.equal(menuEdges.hop, false, 'A in a menu presses the button, never jumps');
    assert.deepEqual(clicked, ['inställningar']);
    buttons[PAD.a].pressed = false;
    buttons[PAD.b].pressed = true;
    tick();
    assert.equal(backs, 1);
});

test('a touch brings the on-screen controls back; keys put them away', t => {
    const { win, world, down } = inputHarness(t);
    fire(win, 'pointerdown', { pointerType: 'mouse' });
    assert.deepEqual(world.devices, [], 'a mouse click changes nothing');
    fire(win, 'pointerdown', { pointerType: 'touch' });
    down('ArrowLeft');
    fire(win, 'pointerdown', { pointerType: 'pen' });
    assert.deepEqual(world.devices, ['touch', 'keys', 'touch']);
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
