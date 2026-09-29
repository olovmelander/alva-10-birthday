#!/usr/bin/env node
/* Real WebGL loss/restore: P1 ink and Sandpapperet survive, and hidden time is not a recovery deadline. */
import assert from 'node:assert/strict';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const server = await serve(), browser = await launch();
try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => {
        // A hidden tab may receive no RAF callbacks at all. Model that scheduling
        // boundary explicitly; the canvas still uses real WEBGL_lose_context events.
        window.__testHidden = false;
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__testHidden });
        const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
        const jobs = new Map();
        let next = 0;
        const schedule = (id, job) => {
            job.native = raf((time) => {
                job.native = null;
                if (window.__testHidden) return;
                jobs.delete(id); job.callback(time);
            });
        };
        window.requestAnimationFrame = (callback) => {
            const id = ++next, job = { callback, native: null };
            jobs.set(id, job); schedule(id, job); return id;
        };
        window.cancelAnimationFrame = (id) => { const job = jobs.get(id); if (job?.native != null) cancel(job.native); jobs.delete(id); };
        window.__setHidden = (hidden) => {
            window.__testHidden = hidden;
            document.dispatchEvent(new Event('visibilitychange'));
            if (!hidden) for (const [id, job] of jobs) if (job.native === null) schedule(id, job);
        };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?debug`);
    await page.waitForSelector('.sk-title', { timeout: 30000 });
    const prepared = await page.evaluate(async () => {
        const { G, view, assets, app } = window.__skoldhast.debug;
        const { snapshot, STEP, HL } = await import('/skoldhast/src/sim.mjs');
        await Promise.all(assets.bundles().map((bundle) => assets.load(bundle)));
        // Keep the title scheduler idle while real fixed steps put P1 mid-stroke.
        // This isolates GPU restoration from the story and from render-frame timing.
        G.story = null; G.flags.add('intro_done');
        G.goto('land', { x: 90.5 * HL, y: -0.9 * HL, facing: -1 });
        view.setScene('land');
        for (let i = 0; i < 900; i++) {
            G.step({ x: -1 });
            if (G.player.mode === 'streck' && G.player.streck?.d?._ink > 0.25) break;
        }
        view.render(snapshot(G.player, 0, G.terrain, G.time), STEP);
        app.render(); // MeshRope updates its geometry during the normal renderer pass.
        window.__drawContextScene = () => { view.render(snapshot(G.player, 0, G.terrain, G.time), 0); app.render(); };
        window.__contextState = () => ({
            x: G.player.x, y: G.player.y, mode: G.player.mode,
            ink: G.sceneDef.dashed.find((d) => d.id === 'p1-arch')._ink,
            flags: [...G.flags].sort(), prints: JSON.stringify(G.prints || [])
        });
        window.__inkPixels = () => {
            const bridge = view.layers.objects.children.find((c) => c.children?.some((s) => s.texture === assets.tex('stroke-dash')));
            const ink = bridge?.children.at(-1);
            // Extract the containing node so Pixi applies the mesh's parent transform.
            const show = bridge.children.map(s => s.visible);
            bridge.children.forEach(s => { s.visible = s === ink; });
            const { pixels } = app.renderer.extract.pixels({ target: bridge });
            bridge.children.forEach((s, i) => { s.visible = show[i]; });
            return { visible: ink.visible, alpha: pixels.reduce((sum, value, index) => sum + (index % 4 === 3 ? value : 0), 0) };
        };
        window.__printPixels = () => {
            const prints = view.layers.mid.children.find((c) => c.children?.some((s) => s.texture === assets.tex('hoofprint-graphite')));
            const { pixels } = app.renderer.extract.pixels({ target: prints });
            return { count: prints.children.filter((s) => s.visible).length, alpha: pixels.reduce((sum, value, index) => sum + (index % 4 === 3 ? value : 0), 0) };
        };
        window.__gl = app.renderer.gl;
        window.__loss = window.__gl.getExtension('WEBGL_lose_context');
        window.__losses = 0; window.__restores = 0;
        app.canvas.addEventListener('webglcontextlost', () => window.__losses++);
        app.canvas.addEventListener('webglcontextrestored', () => window.__restores++);
        return { mode: G.player.mode, ink: window.__contextState().ink, extension: !!window.__loss, pixels: window.__inkPixels(), prints: window.__printPixels() };
    });
    assert.equal(prepared.extension, true);
    assert.equal(prepared.mode, 'streck');
    assert.ok(prepared.ink > 0 && prepared.ink < 1, 'P1 is genuinely mid-stroke');
    assert.ok(prepared.pixels.visible && prepared.pixels.alpha > 0, JSON.stringify(prepared));
    assert.ok(prepared.prints.count > 0 && prepared.prints.alpha > 0, 'galloping left persistent graphite hoofprints');

    // A quick loss during P1 keeps collision/progress data and redraws both GPU objects.
    const before = await page.evaluate(() => window.__contextState());
    await page.evaluate(() => window.__loss.loseContext());
    await page.waitForFunction(() => window.__losses === 1 && window.__gl.isContextLost());
    await page.evaluate(() => window.__loss.restoreContext());
    await page.waitForFunction(() => window.__restores === 1 && !window.__gl.isContextLost());
    const restored = await page.evaluate(() => {
        window.__drawContextScene();
        return { state: window.__contextState(), ink: window.__inkPixels(), prints: window.__printPixels() };
    });
    assert.deepEqual(restored.state, before, 'mid-P1 player, progress and print data survive');
    assert.deepEqual(restored.ink, prepared.pixels, 'partially inked bridge redraws after restoration');
    assert.deepEqual(restored.prints, prepared.prints, 'Sandpapperet redraws from its data');

    // Finish the actual puzzle after recovery, then lose the context while hidden.
    await page.evaluate(() => {
        const { G } = window.__skoldhast.debug;
        for (let i = 0; i < 600 && !G.flags.has('p1_inked'); i++) G.step({ x: -1 });
        window.__drawContextScene();
        window.__setHidden(true);
        window.__loss.loseContext();
    });
    await page.waitForFunction(() => window.__losses === 2 && window.__gl.isContextLost(), null, { polling: 50 });
    assert.equal(await page.evaluate(() => window.__skoldhast.debug.G.flags.has('p1_inked')), true, 'P1 can finish after recovery');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 2300)));
    await page.evaluate(() => { window.__visibleAt = performance.now(); window.__setHidden(false); });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.locator('.sk-message.sk-tap').count(), 0, 'a backgrounded tab gets its full recovery window on return');
    await page.waitForSelector('.sk-message.sk-tap', { timeout: 5000 });
    const recoveryDelay = await page.evaluate(() => performance.now() - window.__visibleAt);
    assert.ok(recoveryDelay >= 1950, `prompt waited for two visible seconds (${recoveryDelay.toFixed(0)} ms)`);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('skoldhast.v1.slot.alva')).flags.includes('p1_inked')), true, 'the recovery prompt saves committed progress');

    // Even a late successful restoration should clear the obsolete restart button.
    await page.evaluate(() => window.__loss.restoreContext());
    await page.waitForFunction(() => window.__restores === 2 && !window.__gl.isContextLost());
    await page.waitForFunction(() => !document.querySelector('.sk-message.sk-tap'), null, { timeout: 2000 });
    const complete = await page.evaluate(() => { window.__drawContextScene(); return { ink: window.__inkPixels(), prints: window.__printPixels(), flag: window.__skoldhast.debug.G.flags.has('p1_inked') }; });
    assert.ok(complete.flag && complete.ink.alpha > 0 && complete.prints.alpha > 0);
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.__skoldhast.close());
    console.log('WebGL recovery preserves P1 ink, Sandpapperet and the visible recovery deadline');
} finally { await browser.close(); server.close(); }
