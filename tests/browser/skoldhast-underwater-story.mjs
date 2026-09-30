/* Real underwater purpose/reveal beats; only the initial positions are staged. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { CODE_RESTORE } from '../../skoldhast/src/save.mjs';

const out = 'docs/skoldhast/shots/puzzle-audit/after/underwater/story';
const approachOnly = process.argv.includes('--approach-only');
const poseOnly = process.argv.includes('--pose-only');
fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch(), results = [];
const stageFlags = [...CODE_RESTORE[1].flags, 'b:k2_open', 'b:k2_note2', 'b:k1_deep',
    'b:k1_whisper', 'b:k1_fishrock', 'b:k1_flap', 'peeled_trench-paper'];
try {
    for (const [width, height, lessMotion] of (poseOnly ? [[390, 844, true]] : [[844, 390, false], [390, 844, true]])) {
        const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
        const pg = await ctx.newPage(), errors = [];
        pg.on('pageerror', e => errors.push(e.message));
        await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await pg.getByText('Jag har en kod').click();
        await pg.fill('.sk-code-input', 'fyr fjun klo');
        await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await pg.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'viken');
        const settle = async () => {
            for (let n = 0; n < 240; n++) {
                const idle = await pg.evaluate(() => {
                    const { G, story, ui } = window.__skoldhast.debug;
                    if (ui.dialogueOpen()) ui.advance();
                    if (ui.panelOpen()) ui.closePanel();
                    return !G.busy && !story.running();
                });
                if (idle) return;
                await pg.waitForTimeout(100);
            }
            throw Error('underwater story did not settle');
        };
        await settle();
        await pg.evaluate(async () => {
            const { assets } = window.__skoldhast.debug;
            await Promise.all(assets.bundles().map(bundle => assets.load(bundle)));
            await document.fonts.ready;
        });
        const stage = async ({ x, y, hook = false }) => {
            await settle();
            await pg.evaluate(async ({ x, y, hook, flags, lessMotion }) => {
                const api = window.__skoldhast, { G, view } = api.debug;
                const { snapshot } = await import('/skoldhast/src/sim.mjs');
                api.pause();
                const removed = hook ? ['ch1_end', 'ch2_open', 'peeled_trench-paper'] : [];
                G.restore({ flags: flags.filter(flag => !removed.includes(flag)), checkpoint: 'overlook' });
                G.lessMotion = lessMotion; G.helpLevel = 'ask';
                G.goto('kelp', { x: x * 200, y: y * 200, facing: 1, mode: 'swim' });
                for (const actor of Object.values(G.actors)) Object.assign(actor, { visible: false, walk: null });
                view.setScene('kelp'); view.cam.snap = true;
                for (let n = 0; n < 120; n++) view.render(snapshot(G.player, 0, G.terrain, G.time), 1 / 60);
                api.resume();
            }, { x, y, hook, flags: stageFlags, lessMotion });
        };
        const capture = async (name, focus, line) => {
            console.log('underwater story:', width, height, name);
            await pg.waitForFunction(({ focus, line }) => {
                const { view, ui } = window.__skoldhast.debug;
                const text = document.querySelector('.sk-dlg-text')?.textContent || '';
                if (view.landFocus?.id !== focus || !ui.dialogueOpen()) return false;
                if (text.includes(line)) return true;
                ui.advance(); return false;
            }, { focus, line }, { polling: 120, timeout: 45000 }).catch(async error => {
                console.log(await pg.evaluate(() => {
                    const { G, story, view, ui } = window.__skoldhast.debug;
                    return { player: [G.player.x, G.player.y], hidden: G.player.hidden,
                        focus: view.landFocus, beat: story.running(), busy: G.busy,
                        text: document.querySelector('.sk-dlg-text')?.textContent, flags: [...G.flags],
                        dialogue: ui.dialogueOpen() };
                }));
                await pg.screenshot({ path: `${out}/failure-${name}-${width}x${height}.png` });
                throw error;
            });
            await pg.waitForTimeout(550);
            const shown = await pg.evaluate(() => {
                const { G, view, ui } = window.__skoldhast.debug;
                const rect = document.querySelector('.sk-dialogue').getBoundingClientRect();
                const f = view.landFocus.frame, c = view.cam;
                const fold = view.layers.mid.children.find(item => item.label === 'drawn-sea-fold');
                return { focus: view.landFocus.id, frame: f, cam: { x: c.x, y: c.y, zoom: c.zoom },
                    flags: [...G.flags], position: [G.player.x, G.player.y], hidden: G.player.hidden, hide: G.player.hide,
                    controlsOff: ui.controls.classList.contains('off'), help: G.helpLevel,
                    paintedFoldVisible: !!fold?.visible,
                    visibleCovers: view.layers.cover.children.filter(item => item.visible).length,
                    dialogue: { top: rect.top, bottom: rect.bottom, text: document.querySelector('.sk-dlg-text').textContent },
                    evidence: { top: (f.y0 - c.y) * c.zoom + innerHeight / 2,
                        bottom: (f.y1 - c.y) * c.zoom + innerHeight / 2,
                        left: (f.x0 - c.x) * c.zoom + innerWidth / 2,
                        right: (f.x1 - c.x) * c.zoom + innerWidth / 2 } };
            });
            assert.equal(shown.help, 'ask', 'core story does not depend on automatic solution hints');
            assert.ok(shown.controlsOff, 'inspection holds ordinary input controls');
            assert.ok(shown.evidence.left >= 19.9 && shown.evidence.right <= width - 19.9, 'whole evidence fits horizontally');
            assert.ok(shown.evidence.bottom < shown.dialogue.top || shown.evidence.top > shown.dialogue.bottom,
                'actual dialogue does not cover the world evidence');
            await pg.screenshot({ path: `${out}/${name}-${width}x${height}.png` });
            results.push({ viewport: `${width}x${height}`, lessMotion, name, ...shown });
            return shown;
        };

        if (!poseOnly) {
            await stage({ x: 24.3, y: 10.4 });
            const cave = await capture('p5-why-light-the-cave', 'vault-approach', 'strömstreck');
            assert.ok(!cave.flags.includes('p5_lit') && !cave.flags.includes('mark_sea'), 'setup precedes fish success and map pickup');
        }
        if (approachOnly) {
            await settle(); assert.deepEqual(errors, []); await ctx.close(); continue;
        }

        // Deliberately approach without P5: an observant swimmer can go above
        // the cave. The natural whirl and its local purpose must still work.
        await stage({ x: 33.6, y: 9.1 });
        const folded = await capture('p6-why-flatten-the-seabed', 'seabed-fold', 'Havsbottnen');
        assert.ok(!folded.flags.includes('p5_lit') && !folded.flags.includes('p6_flat') && !folded.flags.includes('mark_sea'));
        await settle();
        await pg.keyboard.press('g');
        const freed = await capture('p6-shell-frees-the-map', 'freed-map-fragment', 'Vecket är platt');
        assert.ok(freed.hidden && freed.flags.includes('p6_flat') && freed.flags.includes('mark_sea'), 'real hiding/current movement presses the paper');
        assert.ok(freed.hide > .9, 'the physical payoff holds a completed hiding pose');
        assert.ok(freed.flags.includes('b:k2_corner_purpose'), 'the purpose was seen before solving');
        assert.ok(!freed.flags.includes('p5_lit'), 'light does not secretly operate the distant whirl');
        assert.ok(!freed.flags.includes('clue_mark_sea'), 'physical payoff remains on screen before the notebook pickup');
        if (poseOnly) {
            const pose = await pg.evaluate(async () => {
                const { G, view, assets } = window.__skoldhast.debug;
                const { snapshot } = await import('/skoldhast/src/sim.mjs');
                const { createAnimator } = await import('/skoldhast/src/rig.mjs');
                const expected = createAnimator(assets.data('hero-rig'));
                const snap = snapshot(G.player, 1, G.terrain, G.time);
                for (let n = 0; n < 90; n++) expected.update(1 / 60, snap);
                const actual = [], collect = node => {
                    if (['neck', 'head', 'torso', 'shell', 'foreN.upper', 'foreN.lower', 'hindN.upper', 'hindN.lower'].includes(node.label))
                        actual.push({ label: node.label, x: node.x, y: node.y, rot: node.rotation, alpha: node.alpha });
                    for (const child of node.children || []) collect(child);
                };
                collect(view.layers.hero);
                return { hidden: G.player.hidden, hide: G.player.hide, snapshotHide: snap.hide,
                    mode: snap.mode, heroLabels: view.layers.hero.children.map(child => child.label),
                    actual, expected: { hideT: expected.f.hideT, wHide: expected.wHide,
                        parts: Object.fromEntries(['neck', 'head', 'torso', 'shell', 'foreN.upper', 'foreN.lower', 'hindN.upper', 'hindN.lower'].map(id => [id, expected.pose.parts[id]])) } };
            });
            results.push({ viewport: `${width}x${height}`, name: 'hidden-pose-probe', ...pose });
            console.log(JSON.stringify(pose));
            await settle(); assert.deepEqual(errors, []); await ctx.close(); continue;
        }

        await stage({ x: 20.8, y: 3.4, hook: true });
        const wall = await capture('k1-the-sea-is-folded', 'sea-fold-reveal', 'Samma veck');
        assert.ok(wall.paintedFoldVisible && wall.visibleCovers === 0, 'the actual painted fold is revealed beyond the temporarily hidden cover');
        assert.ok(!wall.flags.includes('ch1_end') && !wall.flags.includes('ch2_open'), 'looking does not open the chapter early');
        await pg.waitForFunction(() => {
            const { G, view, ui } = window.__skoldhast.debug;
            if (ui.dialogueOpen()) ui.advance();
            return G.flags.has('ch1_end') && !view.landFocus && ui.panelOpen();
        }, null, { polling: 100, timeout: 45000 });
        await pg.waitForTimeout(150);
        const coverRestored = await pg.evaluate(() => {
            const { G, view, ui } = window.__skoldhast.debug;
            return { visible: view.layers.cover.children.some(item => item.visible),
                peeled: G.flags.has('peeled_trench-paper'), panel: ui.panelOpen(),
                chapterOpen: G.flags.has('ch2_open') };
        });
        assert.ok(coverRestored.visible && !coverRestored.peeled && coverRestored.panel,
            'the near paper returns while the chapter report holds its opening animation');
        assert.ok(coverRestored.chapterOpen, 'chapter progression is separate from cover presentation');
        results.push({ viewport: `${width}x${height}`, lessMotion, name: 'hook-cover-restored', ...coverRestored });
        await settle();
        assert.deepEqual(errors, []);
        await ctx.close();
    }
    fs.writeFileSync(`${out}/${poseOnly ? 'pose-results' : approachOnly ? 'approach-results' : 'results'}.json`, JSON.stringify(results, null, 2));
    console.log(poseOnly ? 'Portrait physical shell payoff has a completed hide pose.' : approachOnly ? 'Unlit cave purpose fits both phone orientations in ask mode.'
        : 'Underwater core story, physical shell payoff and fold reveal fit both phone orientations in ask mode.');
} finally { await browser.close(); server.close(); }
