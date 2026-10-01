import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, CanvasElement } from '@napi-rs/canvas';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { createScreenTurn, turnScreen, easeInOut } from '../skoldhast/src/pageturn.mjs';

function canvasEnvironment(t) {
    for (const [key, value] of Object.entries({ HTMLCanvasElement: CanvasElement,
        document: { createElement: tag => { assert.equal(tag, 'canvas'); return createCanvas(1, 1); } } })) {
        const previous = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
        t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
    }
}
const texture = (width, height) => new PIXI.Texture({ source: new PIXI.TextureSource({ width, height }) });

test('rotating a partly turned page preserves its progress, picture and layer order while freeing old meshes', t => {
    canvasEnvironment(t);
    for (const hinge of ['left', 'right']) {
        const front = texture(844, 390), paper = texture(64, 64);
        const app = { stage: new PIXI.Container(), screen: { width: 844, height: 390 } };
        const below = new PIXI.Container(), above = new PIXI.Container(); app.stage.addChild(below);
        const turn = createScreenTurn(PIXI, app, { texture: front, paper, hinge }); app.stage.addChild(above);
        turn.at(.38);
        for (const [width, height] of [[390, 844], [1440, 900], [844, 390]]) {
            const old = turn.page;
            const owned = [...new Set(old.view.children.map(child => child.texture).filter(tex => tex && tex !== front && tex !== paper))];
            turn.resize(width, height);
            assert.equal(turn.progress, .38);
            assert.equal(turn.page.width, width); assert.equal(turn.page.height, height);
            assert.deepEqual(app.stage.children, [below, turn.page.view, above]);
            assert.equal(old.view.destroyed, true);
            assert.ok(owned.every(tex => tex.destroyed), 'old shading textures belong to the old page');
            assert.ok(turn.page.view.children.some(child => child.texture === front));
            assert.equal(front.destroyed, false); assert.equal(paper.destroyed, false);
            const reference = createScreenTurn(PIXI, app, { texture: front, paper, hinge, width, height }).at(.38);
            assert.equal(turn.page.t, reference.page.t, 'rotation retains the same progress in the new geometry');
            reference.destroy();
            const same = turn.page;
            turn.resize(width, height); turn.resize(0, height); turn.resize(width, -1);
            assert.equal(turn.page, same, 'unchanged or unavailable size does not rebuild the page');
        }
        turn.destroy(); turn.resize(390, 844); turn.at(.7); turn.destroy();
        assert.deepEqual(app.stage.children, [below, above]);
        assert.equal(front.destroyed, false); assert.equal(paper.destroyed, false);
        app.stage.destroy({ children: true }); front.destroy(true); paper.destroy(true);
    }
});

test('a reduced-motion turn resizes the existing fade without restarting its clock or destroying the picture', async t => {
    const frames = [], previous = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
    t.after(() => previous ? globalThis.requestAnimationFrame = previous : delete globalThis.requestAnimationFrame);
    const front = texture(844, 390);
    const app = { stage: new PIXI.Container(), screen: { width: 844, height: 390 }, renderer: {} };
    const complete = turnScreen(PIXI, app, { texture: front, duration: 1, lessMotion: true });
    const fade = app.stage.children[0];
    frames.shift()(0);
    app.screen = { width: 390, height: 844 }; frames.shift()(100);
    assert.equal(app.stage.children[0], fade);
    assert.ok(Math.abs(fade.width - 390) < 1e-8 && Math.abs(fade.height - 844) < 1e-8);
    assert.ok(Math.abs(fade.alpha - (1 - easeInOut(.25))) < 1e-8);
    app.screen = { width: 1440, height: 900 }; frames.shift()(200);
    assert.ok(Math.abs(fade.width - 1440) < 1e-8 && Math.abs(fade.height - 900) < 1e-8);
    assert.ok(Math.abs(fade.alpha - .5) < 1e-8, 'resizing cannot restart or finish the fade');
    frames.shift()(400); await complete;
    assert.equal(fade.destroyed, true); assert.equal(app.stage.children.length, 0);
    assert.equal(front.destroyed, false);
    app.stage.destroy(); front.destroy(true);
});
