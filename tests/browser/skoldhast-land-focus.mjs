/* Real land discovery beats keep obstacle, answer and purpose together. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { CODE_RESTORE } from '../../skoldhast/src/save.mjs';

const out = 'docs/skoldhast/shots/puzzle-audit/after/land';
fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch(), results = [];
const stageFlags = [...CODE_RESTORE[1].flags, 'b:k2_open'];
try {
    for (const [width, height, lessMotion] of [[844, 390, false], [390, 844, true]]) {
        const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
        const pg = await ctx.newPage(), errors = [];
        pg.on('pageerror', e => errors.push(e.message));
        await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await pg.getByText('Jag har en kod').click();
        await pg.fill('.sk-code-input', 'fyr fjun klo');
        await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await pg.waitForFunction(() => window.__skoldhast.debug.G?.sceneId === 'viken');
        const settle = async () => {
            for (let n = 0; n < 180; n++) {
                const idle = await pg.evaluate(() => { const { G, story, ui } = window.__skoldhast.debug; if (ui.dialogueOpen()) ui.advance(); if (ui.panelOpen()) ui.closePanel(); return !G.busy && !story.running(); });
                if (idle) return;
                await pg.waitForTimeout(100);
            }
            throw Error('land focus beat did not settle');
        };
        await settle();
        const shots = [
            { name: 'p1-bridge-purpose', id: 'bridge', x: 81, y: -.65, remove: ['b:k1_note', 'note1_read', 'p1_inked'], line: 'Kartväktaren igen' },
            { name: 'p2-pool-purpose', id: 'pool', x: 104.1, y: -.42, remove: ['p2_seen', 'p2_stone', 'p2_plank', 'p2_open', 'b:k1_mirror', 'b:k1_arch'], line: 'Vattenporten är stängd' },
            { name: 'p2-visible-mirror', id: 'pool', x: 104.1, y: -.42, remove: ['p2_seen', 'p2_stone', 'p2_plank', 'p2_open', 'b:k1_mirror', 'b:k1_arch'], add: ['b:k1_pool_purpose'], hide: true, line: 'Pölen visar' },
            { name: 'p3-seed-and-ramp', id: 'ramp', x: 48, y: -.82, remove: ['p3_t1', 'p3_t2', 'p3_t3', 'p3_done', 'b:k1_branten', 'b:k1_p3'], line: 'Havets spår' },
            { name: 'p3-wave-evidence', id: 'waveMarks', x: 35, y: -4, remove: ['p3_done', 'b:k1_p3'], line: 'Spåren leder' },
            { name: 'p4-gap-and-map', id: 'leap', x: 14.4, y: -4, remove: [], line: 'Där ute' },
            { name: 'p4-earned-landing', id: 'landmark', x: 30, y: -5.5, remove: [], add: ['b:k2_leap_purpose'], gallop: true, line: 'Fem hästlängder' }
        ];
        for (const shot of shots) {
            console.log('land focus:', width, height, shot.name);
            await settle();
            await pg.evaluate(async ({ shot, stageFlags, lessMotion }) => {
                const api = window.__skoldhast, { G, view } = api.debug;
                const { snapshot } = await import('/skoldhast/src/sim.mjs');
                api.pause();
                G.restore({ flags: [...stageFlags.filter(f => !shot.remove.includes(f)), ...(shot.add || [])], checkpoint: 'start' });
                G.lessMotion = lessMotion; G.helpLevel = 'ask';
                G.goto('land', { x: shot.x * 200, y: shot.y * 200, facing: -1 });
                view.setScene('land'); view.cam.snap = true;
                // Staged respawns reuse the renderer. Let the previous shell
                // pose finish before the actual next discovery begins.
                for (let n = 0; n < 180; n++) view.render(snapshot(G.player, 0, G.terrain, G.time), 1 / 60);
                api.resume();
            }, { shot, stageFlags, lessMotion });
            if (shot.hide) { await pg.waitForTimeout(200); await pg.keyboard.press('g'); }
            if (shot.gallop) await pg.keyboard.down('ArrowLeft');
            await pg.waitForFunction(({ id, line }) => {
                const { view, ui } = window.__skoldhast.debug;
                const text = document.querySelector('.sk-dlg-text')?.textContent || '';
                if (view.landFocus?.id !== id || !ui.dialogueOpen()) return false;
                if (text.includes(line)) return true;
                ui.advance(); return false;
            }, shot, { timeout: 30000, polling: 120 }).catch(async e => {
                console.log(await pg.evaluate(() => { const { G, story, view, ui } = window.__skoldhast.debug; return { scene: G.sceneId, player: [G.player.x, G.player.y], beat: story.running(), focus: view.landFocus, text: document.querySelector('.sk-dlg-text')?.textContent, busy: G.busy, flags: [...G.flags], dialogue: ui.dialogueOpen() }; }));
                console.log('errors:', errors);
                await pg.screenshot({ path: `${out}/failure-${shot.name}-${width}x${height}.png` });
                throw e;
            });
            if (shot.gallop) await pg.keyboard.up('ArrowLeft');
            await pg.waitForTimeout(500);
            const shown = await pg.evaluate(() => {
                const { G, view, ui } = window.__skoldhast.debug;
                const d = document.querySelector('.sk-dialogue').getBoundingClientRect();
                const f = view.landFocus.frame, c = view.cam;
                return { focus: view.landFocus.id, frame: f, cam: { x: c.x, y: c.y, zoom: c.zoom },
                    position: [G.player.x, G.player.y], scene: G.sceneId, flags: [...G.flags], controlsOff: ui.controls.classList.contains('off'),
                    dialogue: { top: d.top, bottom: d.bottom, text: document.querySelector('.sk-dlg-text').textContent },
                    obstacle: { top: (f.y0 - c.y) * c.zoom + innerHeight / 2, bottom: (f.y1 - c.y) * c.zoom + innerHeight / 2,
                        left: (f.x0 - c.x) * c.zoom + innerWidth / 2, right: (f.x1 - c.x) * c.zoom + innerWidth / 2 } };
            });
            assert.ok(shown.controlsOff, 'comparison holds the input controls');
            assert.ok(shown.obstacle.left >= 19.9 && shown.obstacle.right <= width - 19.9, 'whole world comparison is horizontally visible');
            assert.ok(shown.obstacle.bottom < shown.dialogue.top || shown.obstacle.top > shown.dialogue.bottom, 'explanation never covers the obstacle');
            assert.equal(shown.scene, 'land');
            await pg.screenshot({ path: `${out}/${shot.name}-${width}x${height}.png` });
            if (shot.name === 'p2-visible-mirror' && width === 844) {
                await pg.setViewportSize({ width: 390, height: 844 });
                await pg.waitForTimeout(500);
                const rotated = await pg.evaluate(() => {
                    const { G, view } = window.__skoldhast.debug, f = view.landFocus.frame, c = view.cam;
                    const d = document.querySelector('.sk-dialogue').getBoundingClientRect();
                    return { position: [G.player.x, G.player.y], top: (f.y0 - c.y) * c.zoom + innerHeight / 2,
                        bottom: (f.y1 - c.y) * c.zoom + innerHeight / 2, dialogue: { top: d.top, bottom: d.bottom } };
                });
                assert.deepEqual(rotated.position, shown.position, 'rotation keeps the player at the pool');
                assert.ok(rotated.bottom < rotated.dialogue.top || rotated.top > rotated.dialogue.bottom, 'rotation refits the answer around the real dialogue');
                await pg.screenshot({ path: `${out}/p2-mirror-rotated-390x844.png` });
                await pg.setViewportSize({ width, height });
                await pg.waitForTimeout(200);
            }
            await settle();
            const returned = await pg.evaluate(() => { const { G, view } = window.__skoldhast.debug; return { position: [G.player.x, G.player.y], focus: view.landFocus, hint: G.camHint }; });
            assert.deepEqual(returned.position, shown.position, 'inspection never teleports the player');
            assert.equal(returned.focus, null); assert.equal(returned.hint, null);
            results.push({ viewport: `${width}x${height}`, lessMotion, ...shown });
        }
        assert.deepEqual(errors, []);
        await ctx.close();
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
    console.log('Land purpose, mirror answer, seed destination and wave evidence fit both phone orientations; real beats restore play.');
} finally { await browser.close(); server.close(); }
