#!/usr/bin/env node
// View-owned effects must stop before their scene and renderer are destroyed.
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const server = await serve(), browser = await launch();
try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?debug`);
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    const particleVisits = await page.evaluate(async () => {
        const { view, G, assets } = window.__skoldhast.debug;
        const { snapshot } = await import('/skoldhast/src/sim.mjs');
        await Promise.all(assets.bundles().map(bundle => assets.load(bundle)));
        G.paused = true;
        const lessMotion = G.lessMotion;
        G.lessMotion = false;
        const results = [];
        for (const scene of ['land', 'kelp', 'viken']) {
            G.goto(scene, 'start'); view.setScene(scene);
            const shared = assets.tex('p-dust');
            const before = new Set(view.layers.fx.children);
            view.emit('dust', G.player.x, G.player.y, 2, { life: .01 });
            const expired = view.layers.fx.children.filter(sprite => !before.has(sprite));
            view.render(snapshot(G.player, 1, G.terrain, G.time), .1);
            const pooled = expired.length === 2 && expired.every(sprite => !sprite.parent && !sprite.destroyed);
            view.emit('dust', G.player.x, G.player.y, 1, { life: 10 });
            const active = expired.filter(sprite => sprite.parent === view.layers.fx);
            view.setScene(scene);
            results.push({ scene, pooled, reused: active.length === 1,
                destroyed: expired.every(sprite => sprite.destroyed), sharedAlive: !!shared && !shared.destroyed });
        }
        G.lessMotion = lessMotion;
        G.paused = false;
        return results;
    });
    assert.deepEqual(particleVisits, ['land', 'kelp', 'viken'].map(scene => ({
        scene, pooled: true, reused: true, destroyed: true, sharedAlive: true
    })), 'scene rebuilds dispose both active and detached particles without destroying shared artwork');
    const scenery = await page.evaluate(async () => {
        const { view, G, app, assets } = window.__skoldhast.debug;
        const { snapshot } = await import('/skoldhast/src/sim.mjs');
        const old = { lessMotion: G.lessMotion, cloud: G.userCloud, evening: G.evening,
            width: app.screen.width, height: app.screen.height };
        G.paused = true;
        const walk = node => [node, ...(node.children || []).flatMap(walk)];
        const result = { snapshots: [], turns: [], evening: false };
        for (const scene of ['land', 'kelp', 'viken']) {
            G.goto(scene, 'start'); view.setScene(scene);
            view.render(snapshot(G.player, 1, G.terrain, G.time), 0);
            const nodes = view.root.children.slice(0, 3).flatMap(walk);
            const state = () => JSON.stringify({ camera: { ...view.cam },
                world: [view.world.x, view.world.y, view.world.scale.x, view.world.scale.y],
                nodes: nodes.map(n => [n.x, n.y, n.scale.x, n.scale.y, n.alpha, n.visible, n.tint,
                    n.texture?.uid, n.context?.uid, n.context?.instructions.length,
                    n.tileScale && [n.width, n.height, n.tileScale.x, n.tileScale.y, n.tilePosition.x, n.tilePosition.y]]) });
            const before = state();
            const picture = view.snapshot({ x: G.player.x + 200, y: G.player.y - 200,
                zoom: .7, width: 740, height: 560, skyFactor: .3 });
            result.snapshots.push(state() === before);
            picture.destroy(true);
        }
        for (const lessMotion of [false, true]) for (const hold of [false, true]) {
            G.lessMotion = lessMotion;
            G.goto('land', 'start'); view.setScene('land');
            const turn = view.setScene('land', { turn: 'right' });
            turn.hold = hold; turn.k = hold ? 0 : .38; turn.show(turn.k);
            const captured = turn.rt, progress = turn.k;
            const layer = view.root.children.at(-1);
            let fits = true;
            for (const [width, height] of [[390, 844], [1440, 900]]) {
                const previous = layer.children[0], alpha = previous.alpha;
                app.renderer.resize(width, height); view.resize();
                const page = layer.children[0];
                fits &&= turn.k === progress && turn.hold === hold && turn.rt === captured && !captured.destroyed;
                if (lessMotion) fits &&= page === previous && page.alpha === alpha
                    && Math.abs(page.width - width) < 1e-7 && Math.abs(page.height - height) < 1e-7;
                else {
                    fits &&= page !== previous && previous.destroyed;
                    const front = page.children.find(child => child.texture === captured);
                    fits &&= !!front;
                    if (hold && front) {
                        const points = front.geometry.getBuffer('aPosition').data;
                        const xs = [], ys = [];
                        for (let i = 0; i < points.length; i += 2) { xs.push(points[i]); ys.push(points[i + 1]); }
                        fits &&= Math.min(...xs) <= .01 && Math.max(...xs) >= width - .01
                            && Math.min(...ys) <= .01 && Math.max(...ys) >= height - .01;
                    }
                }
            }
            turn.hold = false;
            view.render(snapshot(G.player, 1, G.terrain, G.time), 2);
            result.turns.push({ lessMotion, hold, fits, released: captured.destroyed });
        }
        app.renderer.resize(old.width, old.height); view.resize();
        G.userCloud = assets.tex('p-fluff'); G.evening = false;
        G.goto('land', 'start'); view.setScene('land');
        view.render(snapshot(G.player, 1, G.terrain, G.time), 0);
        const hero = walk(view.layers.hero), before = hero.map(node => node.tint);
        const cloud = walk(view.root).find(node => node.label === 'user-cloud');
        G.evening = true; view.render(snapshot(G.player, 1, G.terrain, G.time), 0);
        result.evening = !!cloud && cloud.tint === 0xffffff && cloud.parent.tint === 0xffffff
            && view.world.tint === 0xffffff && view.layers.hero.tint === 0xffffff
            && JSON.stringify(hero.map(node => node.tint)) === JSON.stringify(before)
            && view.layers.terrainBack.tint !== 0xffffff;
        G.userCloud = old.cloud; G.evening = old.evening; G.lessMotion = old.lessMotion; G.paused = false;
        return result;
    });
    assert.deepEqual(scenery.snapshots, [true, true, true], 'picture capture exactly restores every live background');
    assert.ok(scenery.turns.every(turn => turn.fits && turn.released), JSON.stringify(scenery.turns));
    assert.equal(scenery.evening, true, 'evening grades the scenery while preserving the horse and user cloud colours');
    await page.evaluate(() => {
        const raf = window.requestAnimationFrame.bind(window);
        window.__effectFramesAfterClose = 0;
        window.requestAnimationFrame = (callback) => {
            const viewFrame = /\/src\/view\.mjs/.test(new Error().stack || '');
            return raf((time) => {
                if (viewFrame && window.__skoldhast.state !== 'open') window.__effectFramesAfterClose++;
                callback(time);
            });
        };
    });
    for (const effect of ['fade', 'foldDemo', 'vista']) {
        if (effect !== 'fade') {
            await page.evaluate(() => window.__skoldhast.open());
            await page.waitForSelector('.sk-title', { timeout: 30000 });
        }
        await page.evaluate(async (name) => {
            const { view, G, assets } = window.__skoldhast.debug;
            await Promise.all(assets.bundles().map((bundle) => assets.load(bundle)));
            G.goto('land', 'start'); view.setScene('land');
            window.__effectCompleted = false;
            const effect = name === 'fade' ? view.fadeTo(1, 0.25) : name === 'foldDemo' ? view.fx(name, { x: 600, y: 0 }) :
                view.fx(name, { scene: 'viken', lighthouse: true, x: 5960, y: -1440, hold: 1 });
            effect.then(() => { window.__effectCompleted = true; });
            // Both RAF effects and a page-turn effect now await their next frame.
            await window.__skoldhast.close();
        }, effect);
        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 350)));
        const stopped = await page.evaluate(() => ({ frames: window.__effectFramesAfterClose, completed: window.__effectCompleted, roots: document.querySelectorAll('.sk-root').length }));
        assert.deepEqual(stopped, { frames: 0, completed: false, roots: 0 }, `${effect}: close cancels its work without advancing the abandoned story`);
        assert.deepEqual(errors, [], `${effect}: no callbacks touch destroyed sprites or restore an old vista`);
    }
    await page.evaluate(() => window.__skoldhast.open());
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.__skoldhast.close());
    console.log('view effects cancel cleanly and reopen');
} finally { await browser.close(); server.close(); }
