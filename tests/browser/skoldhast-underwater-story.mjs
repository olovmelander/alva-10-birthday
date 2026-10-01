/* Real underwater purpose/reveal beats; only the initial positions are staged.
 * P6 is played with the production keyboard on the live game loop: grip the
 * kelp's loose end, swim it off the paper's edge, hide in the released current,
 * let the shell's weight press the fold flat, then come out and collect the paper.
 *
 * node tests/browser/skoldhast-underwater-story.mjs [--approach-only | --pose-only]
 *   [--out docs/skoldhast/shots/puzzle-audit/after/underwater/story]
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { CODE_RESTORE } from '../../skoldhast/src/save.mjs';
import { STORY } from '../../skoldhast/src/content/sv.mjs';

const arg = name => { const at = process.argv.indexOf(name); return at < 0 ? null : process.argv[at + 1]; };
const out = path.resolve(arg('--out') || 'docs/skoldhast/shots/puzzle-audit/after/underwater/story');
const approachOnly = process.argv.includes('--approach-only');
const poseOnly = process.argv.includes('--pose-only');
fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch(), results = [];
const stageFlags = [...CODE_RESTORE[1].flags, 'b:k2_open', 'b:k2_note2', 'b:k1_deep',
    'b:k1_whisper', 'b:k1_fishrock', 'b:k1_flap', 'peeled_trench-paper'];
const line = ([, text]) => text;
try {
    for (const [width, height, lessMotion] of (poseOnly ? [[390, 844, true]] : [[844, 390, false], [390, 844, true]])) {
        const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
        const pg = await ctx.newPage(), errors = [];
        pg.on('pageerror', e => errors.push(e.message));
        await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await pg.waitForSelector('.sk-title', { timeout: 60000 }); // the first load fetches every atlas
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
            window.__kelpPuzzle = await import('/skoldhast/src/kelp-puzzle.mjs');
        });
        const stage = async ({ x, y, hook = false }) => {
            await settle();
            await pg.evaluate(async ({ x, y, hook, flags, lessMotion }) => {
                const api = window.__skoldhast, { G, view } = api.debug;
                const { snapshot } = await import('/skoldhast/src/sim.mjs');
                api.pause();
                // the Kapitel 1 code's save has seen the hook: stage the moment before it
                const removed = hook ? ['ch1_end', 'b:k1_hook', 'ch2_open', 'peeled_trench-paper'] : [];
                G.restore({ flags: flags.filter(flag => !removed.includes(flag)), checkpoint: 'overlook' });
                G.lessMotion = lessMotion; G.helpLevel = 'ask';
                G.goto('kelp', { x: x * 200, y: y * 200, facing: 1, mode: 'swim' });
                for (const actor of Object.values(G.actors)) Object.assign(actor, { visible: false, walk: null });
                view.setScene('kelp'); view.cam.snap = true;
                for (let n = 0; n < 120; n++) view.render(snapshot(G.player, 0, G.terrain, G.time), 1 / 60);
                api.resume();
            }, { x, y, hook, flags: stageFlags, lessMotion });
        };
        const state = () => pg.evaluate(() => {
            const { G, story, view, ui } = window.__skoldhast.debug;
            return { player: [G.player.x, G.player.y], hidden: G.player.hidden, p6: G.puz.p6,
                focus: view.landFocus, beat: story.running(), busy: G.busy,
                text: document.querySelector('.sk-dlg-text')?.textContent, flags: [...G.flags],
                dialogue: ui.dialogueOpen(), hint: document.querySelector('.sk-hintbubble.on .sk-hint-text')?.textContent };
        });
        const fail = name => async error => {
            console.log(await state());
            await pg.screenshot({ path: path.join(out, `failure-${name}-${width}x${height}.png`) });
            throw error;
        };
        const capture = async (name, focus, line) => {
            console.log('underwater story:', width, height, name);
            await pg.waitForFunction(({ focus, line }) => {
                const { view, ui } = window.__skoldhast.debug;
                const text = document.querySelector('.sk-dlg-text')?.textContent || '';
                if (view.landFocus?.id !== focus || !ui.dialogueOpen()) return false;
                if (text.includes(line)) return true;
                ui.advance(); return false;
            }, { focus, line }, { polling: 120, timeout: 45000 }).catch(fail(name));
            // The card has slid in and the held frame has been refitted around it: the
            // camera (set from that fit every frame) has rested for a quarter second.
            await settled('.sk-dialogue');
            await pg.evaluate(() => { window.__camRest = null; });
            await pg.waitForFunction(() => {
                const { cam } = window.__skoldhast.debug.view, now = performance.now();
                const key = `${cam.x.toFixed(1)},${cam.y.toFixed(1)},${cam.zoom.toFixed(4)}`, rest = window.__camRest;
                if (rest?.key !== key) { window.__camRest = { key, since: now, frames: 0 }; return false; }
                return ++rest.frames >= 3 && now - rest.since >= 250;
            }, null, { polling: 'raf', timeout: 15000 }).catch(fail(`${name}-camera`));
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
            await pg.screenshot({ path: path.join(out, `${name}-${width}x${height}.png`) });
            results.push({ viewport: `${width}x${height}`, lessMotion, name, ...shown });
            return shown;
        };

        // Real keyboard input (CDP key events through the production input) on the
        // running game. The arrows held follow the swimmer's actual position and
        // speed, as a player's would; every wait is for a game condition.
        const held = new Set();
        const holdKeys = async (wanted = []) => {
            for (const k of [...held]) if (!wanted.includes(k)) { held.delete(k); await pg.keyboard.up(k); }
            for (const k of wanted) if (!held.has(k)) { held.add(k); await pg.keyboard.down(k); }
        };
        /** Swim until `goal` (an expression of G) holds: towards `to` ({x, y} in HL) or
         * holding `keys`; fail early once `lost` holds. Dialogues on the way are read. */
        const swim = async (label, { goal, to = null, keys = null, lost = 'false', seconds = 45 }) => {
            const deadline = Date.now() + seconds * 1000;
            for (;;) {
                const left = deadline - Date.now();
                const next = left <= 0 ? { error: 'timed out' } : await pg.waitForFunction(({ goal, to, keys, lost, held }) => {
                    const { G, ui } = window.__skoldhast.debug, ev = src => new Function('G', `return (${src});`)(G);
                    if (ev(goal)) return { done: true };
                    if (ev(lost)) return { error: 'lost the way' };
                    if (ui.dialogueOpen() || ui.panelOpen()) return { dialogue: true };
                    const p = G.player, want = keys ? [...keys] : [];
                    if (to) {
                        // aim for a speed that falls off near the target, and press towards it
                        for (const [d, v, neg, pos] of [[to.x * 200 - p.x, p.vx, 'ArrowLeft', 'ArrowRight'], [to.y * 200 - p.y, p.vy, 'ArrowUp', 'ArrowDown']]) {
                            const error = Math.max(-360, Math.min(360, d * 2)) - v;
                            if (Math.abs(error) > 50) want.push(error < 0 ? neg : pos);
                        }
                    }
                    return want.sort().join() === held.join() ? false : { want };
                }, { goal, to, keys, lost, held: [...held].sort() }, { polling: 'raf', timeout: left })
                    .then(handle => handle.jsonValue(), error => ({ error: error.message }));
                if (next.error) { await holdKeys(); return fail(label)(Error(`${label}: ${next.error}`)); }
                if (next.done) { await holdKeys(); return; }
                if (next.dialogue) { await holdKeys(); await settle(); continue; }
                await holdKeys(next.want);
            }
        };
        /** Klo's passing remark (a bubble; play goes on), once it has slid into place. */
        const remark = async (name, text) => {
            await pg.waitForFunction(text => {
                const bubble = document.querySelector('.sk-hintbubble.on');
                return bubble?.querySelector('.sk-hint-text')?.textContent === text;
            }, text, { polling: 'raf', timeout: 15000 }).catch(fail(name));
            await settled('.sk-hintbubble.on');
        };
        const settled = selector => pg.evaluate(selector => Promise.all([...document.querySelectorAll(selector)]
            .flatMap(node => node.getAnimations()).map(animation => animation.finished.catch(() => {}))), selector);

        if (!poseOnly) {
            await stage({ x: 24.3, y: 10.4 });
            const cave = await capture('p5-why-light-the-cave', 'vault-approach', line(STORY.k2.vaultPurpose[0]));
            assert.ok(!cave.flags.includes('p5_lit') && !cave.flags.includes('mark_sea'), 'setup precedes fish success and map pickup');
        }
        if (approachOnly) {
            await settle(); assert.deepEqual(errors, []); await ctx.close(); continue;
        }

        // Deliberately approach without P5: an observant swimmer can go above
        // the cave. The kelp, its current and the fold must still work.
        await stage({ x: 33.6, y: 9.1 });
        const folded = await capture('p6-why-flatten-the-seabed', 'seabed-fold', line(STORY.k2.cornerPurpose[0]));
        assert.ok(!['p5_lit', 'p6_kelp_freed', 'p6_flat', 'mark_sea'].some(flag => folded.flags.includes(flag)), 'the purpose comes before any of the solution');
        await capture('p6-why-free-the-kelp', 'seabed-fold', line(STORY.k2.cornerPurpose[1]));
        await settle();
        const kelp = await pg.evaluate(() => window.__skoldhast.debug.G.scenes.kelp.kelpPuzzle);
        const HL = v => v / 200;
        // Take the kelp's loose end with the context button (E) ...
        await swim('p6-reach-the-loose-end', { goal: `G.context?.id === 'p6-grab'`, to: { x: HL(kelp.tether.loose.x), y: HL(kelp.tether.loose.y) } });
        await pg.keyboard.press('e');
        await pg.waitForFunction(() => window.__skoldhast.debug.G.puz.p6.grabbed, null, { polling: 'raf', timeout: 5000 }).catch(fail('p6-grab'));
        // ... and swim away from the paper's edge until the frond slides off it.
        await swim('p6-pull-the-kelp', { goal: `G.flags.has('p6_kelp_freed')`, keys: ['ArrowRight'], lost: `!G.puz.p6.grabbed && !G.flags.has('p6_kelp_freed')`, seconds: 20 });
        // Hide (G) in the released current: it carries the shell up onto the fold,
        // and the shell's weight presses the paper flat.
        await pg.keyboard.press('g');
        await remark('p6-kelp-freed', line(STORY.k2.kelpFreed));
        await pg.waitForFunction(() => {
            const { G, ui } = window.__skoldhast.debug;
            if (ui.dialogueOpen()) ui.advance();
            return G.flags.has('p6_flat');
        }, null, { polling: 'raf', timeout: 30000 }).catch(fail('p6-press-the-fold'));
        await remark('p6-shell-frees-the-map', line(STORY.k2.foldFlat));
        const freed = await pg.evaluate(() => {
            const { G, view, ui } = window.__skoldhast.debug, { p6Pose } = window.__kelpPuzzle;
            const find = (node, label) => node.label === label ? node : (node.children || []).map(n => find(n, label)).find(Boolean);
            const paper = find(view.world, 'p6-fragment'), box = paper?.getBounds(), bubble = document.querySelector('.sk-hintbubble.on').getBoundingClientRect();
            return { flags: [...G.flags], position: [G.player.x, G.player.y], hidden: G.player.hidden, hide: G.player.hide, help: G.helpLevel,
                dialogue: ui.dialogueOpen(), fragment: p6Pose(G).fragment, paperVisible: !!paper?.visible,
                paper: box && { x: box.x, y: box.y, width: box.width, height: box.height },
                remark: { x: bubble.x, y: bubble.y, width: bubble.width, height: bubble.height, text: document.querySelector('.sk-hintbubble.on .sk-hint-text').textContent } };
        });
        assert.equal(freed.help, 'ask', 'core story does not depend on automatic solution hints');
        assert.ok(freed.hidden && freed.flags.includes('p6_flat'), 'real hiding and current movement press the paper');
        assert.ok(freed.hide > .9, 'the physical payoff holds a completed hiding pose');
        assert.ok(freed.flags.includes('b:k2_corner_purpose'), 'the purpose was seen before solving');
        assert.ok(!freed.flags.includes('p5_lit'), 'light does not secretly operate the distant whirl');
        assert.ok(!freed.flags.includes('mark_sea') && !freed.flags.includes('clue_mark_sea') && freed.fragment.visible,
            'physical payoff remains on screen before the notebook pickup');
        assert.ok(!freed.dialogue, 'Klo remarks on the payoff without stopping play');
        const { paper, remark: said } = freed;
        assert.ok(freed.paperVisible && paper && paper.x >= 0 && paper.x + paper.width <= width, 'the freed paper is in view');
        assert.ok(paper.x + paper.width <= said.x || said.x + said.width <= paper.x || paper.y + paper.height <= said.y || said.y + said.height <= paper.y,
            "Klo's remark does not cover the freed paper");
        await pg.screenshot({ path: path.join(out, `p6-shell-frees-the-map-${width}x${height}.png`) });
        results.push({ viewport: `${width}x${height}`, lessMotion, name: 'p6-shell-frees-the-map', ...freed });
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
        // The paper rises to the calm water beside the fold. Come out (G) and swim to it.
        await pg.waitForFunction(() => window.__kelpPuzzle.p6Pose(window.__skoldhast.debug.G).fragment.rise === 1, null, { polling: 'raf', timeout: 20000 }).catch(fail('p6-paper-rises'));
        await pg.keyboard.press('g');
        await pg.waitForFunction(() => { const p = window.__skoldhast.debug.G.player; return !p.hidden && p.hide < .1; }, null, { polling: 'raf', timeout: 5000 }).catch(fail('p6-come-out'));
        // the pickup reaches from the swimmer's body (.3 HL up) to the paper's middle (.12 HL up)
        await swim('p6-collect', { goal: `G.flags.has('mark_sea')`, to: { x: HL(kelp.fragment.to.x), y: HL(kelp.fragment.to.y) + .18 } });
        await pg.waitForFunction(text => {
            const { view, ui } = window.__skoldhast.debug;
            return view.mapAssembly?.fragment === 'sea' && ui.dialogueOpen() && document.querySelector('.sk-dlg-text')?.textContent === text;
        }, line(STORY.k2.cornerFlat), { polling: 'raf', timeout: 15000 }).catch(fail('p6-sea-piece-collected'));
        const collected = await pg.evaluate(() => {
            const { G } = window.__skoldhast.debug;
            return { flags: [...G.flags], hidden: G.player.hidden, position: [G.player.x, G.player.y] };
        });
        assert.ok(collected.flags.includes('mark_sea') && collected.flags.includes('clue_mark_sea'), 'swimming to the freed paper collects the sea piece');
        assert.ok(!collected.hidden, 'the paper is collected by an emerged swimmer');
        assert.ok(!collected.flags.includes('p5_lit'), 'the sea piece needs no light from the distant vault');
        await settled('.sk-dialogue');
        await pg.screenshot({ path: path.join(out, `p6-sea-piece-collected-${width}x${height}.png`) });
        results.push({ viewport: `${width}x${height}`, lessMotion, name: 'p6-sea-piece-collected', ...collected });

        await stage({ x: 20.8, y: 3.4, hook: true });
        const wall = await capture('k1-the-sea-is-folded', 'sea-fold-reveal', line(STORY.k1.hook[0]));
        assert.ok(wall.paintedFoldVisible && wall.visibleCovers === 0, 'the actual painted fold is revealed beyond the temporarily hidden cover');
        assert.ok(!wall.flags.includes('ch1_end') && !wall.flags.includes('ch2_open'), 'looking does not open the chapter early');
        await pg.waitForFunction(() => {
            const { G, view, ui } = window.__skoldhast.debug;
            if (ui.dialogueOpen()) ui.advance();
            return G.flags.has('ch1_end') && !view.landFocus && ui.panelOpen();
        }, null, { polling: 100, timeout: 45000 });
        // the view puts the near paper back on its next frame after the held view ends
        await pg.waitForFunction(() => {
            const { view, ui } = window.__skoldhast.debug;
            return view.layers.cover.children.some(item => item.visible) || !ui.panelOpen();
        }, null, { polling: 'raf', timeout: 15000 }).catch(() => { /* the assertions below say what is missing */ });
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
    fs.writeFileSync(path.join(out, `${poseOnly ? 'pose-results' : approachOnly ? 'approach-results' : 'results'}.json`), JSON.stringify(results, null, 2));
    console.log(poseOnly ? 'Portrait physical shell payoff has a completed hide pose.' : approachOnly ? 'Unlit cave purpose fits both phone orientations in ask mode.'
        : 'Underwater core story, kelp, physical shell payoff, collection and fold reveal fit both phone orientations in ask mode.');
} finally { await browser.close(); server.close(); }
