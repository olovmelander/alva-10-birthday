#!/usr/bin/env node
// Real cave entrance/exit, connected visible surfaces, and swimming across the join.
// node tests/browser/skoldhast-water-alignment.mjs --out /tmp/water-alignment
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const outAt = process.argv.indexOf('--out');
const out = outAt >= 0 ? process.argv[outAt + 1] : '/tmp/skoldhast-water-alignment';
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch();

async function settledScene(page, scene) {
    await page.waitForFunction(wanted => {
        const { G, view } = window.__skoldhast.debug;
        return G.sceneId === wanted && view.sceneId === wanted && view.built(wanted)
            && view.root.children.at(-1).children.length === 0 && G.sceneTime > .3;
    }, scene);
}

async function stageSurface(page, x, facing) {
    await page.evaluate(([x, facing]) => {
        const { G, view } = window.__skoldhast.debug;
        const w = G.sceneDef.waters.find(w => x * 200 >= w.x0 && x * 200 <= w.x1);
        G.goto('kelp', { x: x * 200, y: w.top + 130, mode: 'swim', facing });
        view.cam.snap = true;
    }, [x, facing]);
    await settledScene(page, 'kelp');
}

async function inspect(page) {
    return page.evaluate(() => {
        const { G, view, app } = window.__skoldhast.debug, p = G.player;
        const ropes = view.layers.waterFront.children.filter(c => c._pts);
        const air = view.layers.far.children.find(c => c.label === 'water-air');
        const airRects = air?.context.instructions.flatMap(i => i.data.path?.instructions || [])
            .filter(i => i.action === 'rect').map(i => i.data.slice(0, 4)) || [];
        const bodies = G.sceneDef.waters.filter(w => w.kind !== 'pipe').map(w => {
            const rope = ropes.find(r => Math.abs(r._pts[0].x - w.x0) < .001);
            return { id: w.id, x0: w.x0, x1: w.x1, top: w.top,
                first: rope ? { x: rope._pts[0].x, y: rope._pts[0].y } : null,
                last: rope ? { x: rope._pts.at(-1).x, y: rope._pts.at(-1).y } : null };
        });
        const find = (node, label) => node.label === label ? node : node.children?.map(c => find(c, label)).find(Boolean);
        const head = find(view.layers.hero, 'head')?.getBounds();
        const goal = document.querySelector('.sk-goal:not(.empty)')?.getBoundingClientRect();
        return { scene: G.sceneId, x: p.x, y: p.y, vx: p.vx, vy: p.vy,
            water: p.water?.id, waterTop: p.water?.top,
            depth: p.water ? p.y - p.water.top : null,
            camera: { x: view.cam.x, y: view.cam.y, zoom: view.cam.zoom },
            feetScreen: { x: view.world.x + p.x * view.cam.zoom, y: view.world.y + p.y * view.cam.zoom },
            headScreen: head ? { x0: head.minX, y0: head.minY, x1: head.maxX, y1: head.maxY } : null,
            goalScreen: goal ? { x0: goal.left, y0: goal.top, x1: goal.right, y1: goal.bottom } : null,
            surfaceScreen: p.water ? view.world.y + p.water.top * view.cam.zoom : null,
            viewport: { width: app.screen.width, height: app.screen.height }, bodies, airRects };
    });
}

function assertSurface(state) {
    for (const w of state.bodies) {
        assert.ok(w.first && w.last, `${w.id} has a rendered waterline`);
        assert.equal(w.first.x, w.x0, `${w.id}: waterline starts exactly at its bank`);
        assert.equal(w.last.x, w.x1, `${w.id}: waterline reaches its far bank`);
        assert.ok(Math.abs(w.first.y - w.top) <= 14.001 && Math.abs(w.last.y - w.top) <= 14.001,
            `${w.id}: pencil waves remain around the physical surface`);
    }
    if (state.scene === 'kelp') {
        const cave = state.bodies.find(w => w.id === 'cave'), sea = state.bodies.find(w => w.id === 'sea');
        assert.equal(cave.top, sea.top, 'connected cave and sea share one physical surface');
        assert.ok(Math.hypot(cave.last.x - sea.first.x, cave.last.y - sea.first.y) < .001,
            'the two animated pencil lines meet without a vertical seam');
        assert.equal(state.airRects.length, state.bodies.length, 'each water body has an authored air boundary');
        for (const w of state.bodies) {
            const air = state.airRects.find(([x, , width]) => (w.x0 + w.x1) / 2 >= x && (w.x0 + w.x1) / 2 <= x + width);
            assert.ok(air, `${w.id}: sky covers the same horizontal interval`);
            assert.ok(Math.abs(air[1] + air[3] - w.top) < .001, `${w.id}: sky ends at the physical surface`);
        }
        assert.ok(state.surfaceScreen > 0 && state.surfaceScreen < state.viewport.height, 'the surface remains in the camera frame');
    }
    assert.ok(state.feetScreen.x > 0 && state.feetScreen.x < state.viewport.width
        && state.feetScreen.y > 0 && state.feetScreen.y < state.viewport.height, 'the swimmer remains framed');
    const head = state.headScreen, goal = state.goalScreen;
    assert.ok(head && head.x0 >= 0 && head.y0 >= 0 && head.x1 <= state.viewport.width && head.y1 <= state.viewport.height,
        `the whole head stays inside the viewport: ${JSON.stringify(head)}`);
    if (goal) assert.ok(head.x1 <= goal.x0 || head.x0 >= goal.x1 || head.y1 <= goal.y0 || head.y0 >= goal.y1,
        `the goal note cannot hide the head: ${JSON.stringify({ head, goal })}`);
}

try {
    for (const [width, height] of [[844, 390], [390, 844]]) {
        const context = await browser.newContext({ viewport: { width, height }, hasTouch: height > width });
        const page = await context.newPage(), errors = [], records = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        const capture = async name => {
            const state = await inspect(page); assertSurface(state); records.push({ name, ...state });
            await page.screenshot({ path: path.join(out, `${width}x${height}-${name}.png`) });
        };
        try {
            await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
            await page.waitForSelector('.sk-title');
            await page.getByText('Jag har en kod').click();
            await page.fill('.sk-code-input', 'kelp mås skal');
            await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
            await page.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'kelp');
            await page.waitForFunction(() => {
                const { G, ui, story } = window.__skoldhast.debug;
                if (ui.dialogueOpen()) ui.advance();
                return !G.busy && !story.running();
            });
            await page.evaluate(() => {
                const { G, view } = window.__skoldhast.debug;
                G.goto('land', 'fromKelp'); view.setScene('land'); view.cam.snap = true;
                window.__waterSteps = []; window.__waterEntrance = null;
                G.on('scene', ({ id, from }) => {
                    if (id === 'kelp' && from === 'land') window.__waterEntrance = {
                        x: G.player.x, y: G.player.y, mode: G.player.mode,
                        depth: G.player.y - G.player.water.top
                    };
                });
                const step = G.step.bind(G);
                G.step = input => {
                    const point = () => ({ scene: G.sceneId, x: G.player.x, y: G.player.y, water: G.player.water?.id, top: G.player.water?.top });
                    const before = point(); step(input); const after = point();
                    if (before.scene === 'kelp' && after.scene === 'kelp' && before.water && after.water && before.water !== after.water) window.__waterSteps.push({ before, after });
                };
            });
            await page.waitForFunction(() => window.__skoldhast.debug.G.context?.id === 'exit');
            await capture('land-cave-mouth');
            await page.keyboard.press('Space');
            await settledScene(page, 'kelp');
            const entry = await page.evaluate(() => window.__waterEntrance);
            assert.equal(entry.mode, 'swim', 'Simma in starts swimming');
            assert.equal(entry.depth, 280, 'entry preserves the authored immersion after leveling the sea');
            await capture('actual-cave-entry');

            await stageSurface(page, 6.6, 1); await capture('cave-surface-west');
            await page.keyboard.down('ArrowRight');
            await page.waitForFunction(() => window.__skoldhast.debug.G.player.x > 7.4 * 200);
            await page.keyboard.up('ArrowRight'); await capture('sea-entered-east');
            await stageSurface(page, 7.4, -1); await capture('sea-surface-east');
            await page.keyboard.down('ArrowLeft');
            await page.waitForFunction(() => window.__skoldhast.debug.G.player.x < 6.9 * 200);
            await page.keyboard.up('ArrowLeft'); await capture('cave-reentered-west');
            const transitions = await page.evaluate(() => window.__waterSteps);
            assert.ok(transitions.some(t => t.before.water === 'cave' && t.after.water === 'sea'), 'actually swam out of the cave');
            assert.ok(transitions.some(t => t.before.water === 'sea' && t.after.water === 'cave'), 'actually swam back into the cave');
            for (const t of transitions) {
                assert.equal(t.before.top, t.after.top, 'crossing does not change water height');
                assert.ok(Math.abs(t.after.y - t.before.y) < 5, 'crossing cannot teleport the swimmer vertically');
            }

            await stageSurface(page, .35, -1);
            await page.keyboard.down('ArrowLeft');
            await page.waitForFunction(() => window.__skoldhast.debug.G.sceneId === 'land');
            await page.keyboard.up('ArrowLeft'); await settledScene(page, 'land');
            await capture('land-return');
            assert.equal(await page.evaluate(() => window.__skoldhast.debug.G.player.mode), 'ground', 'returning restores shallow-water walking');
            assert.deepEqual(errors, []);
            await fs.writeFile(path.join(out, `${width}x${height}-metrics.json`), JSON.stringify({ entry, records, transitions, errors }, null, 2));
            console.log(`waterline, cave entrance/exit and bidirectional swimming pass at ${width}x${height}`);
        } finally { await context.close(); }
    }
} finally { await browser.close(); server.close(); }
