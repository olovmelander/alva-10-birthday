#!/usr/bin/env node
// Repeatable staged evidence. Route solving is checked separately with real inputs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((v, i, a) => v.startsWith('--') ? [[v.slice(2), a[i + 1]]] : []));
const out = args.out || 'docs/skoldhast/shots/puzzle-audit/before/underwater';
const sizes = args.viewport ? [args.viewport] : ['844x390', '390x844'];
const stages = [
    { name: '01-first-folded-seabed', x: 17.3, y: 5.5, chapter: 1, focus: [17.6, 5.6], zoom: .85 },
    { name: '02-overlook-white-page', x: 21, y: 3.8, chapter: 1, focus: [22.5, 4.8], zoom: .55 },
    { name: '03-fish-and-dark-mouth', x: 24.3, y: 10.4, focus: [25.5, 10.5], zoom: .65 },
    { name: '04-vault-dark', x: 25.5, y: 11.35, focus: [28, 10.9], zoom: .52 },
    { name: '05-vault-lit', x: 28.4, y: 11.9, focus: [28, 10.9], zoom: .52, lit: true },
    { name: '06-heart-folded', x: 33.2, y: 9.2, focus: [35.8, 8.6], zoom: .65, lit: true },
    { name: '07-heart-flat', x: 36, y: 8.4, focus: [35.8, 8.6], zoom: .65, lit: true, flat: true },
    { name: '08-sea-fold-wall', x: 45.4, y: 4.8, focus: [46.1, 4.8], zoom: .6, lit: true }
];
fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch(), errors = [], records = [];
try {
    for (const size of sizes) {
        const [width, height] = size.split('x').map(Number);
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        await page.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await page.getByText('Jag har en kod').click();
        await page.fill('.sk-code-input', 'fyr fjun klo');
        await page.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await page.waitForFunction(() => {
            const { G, ui, story } = window.__skoldhast.debug;
            if (ui.dialogueOpen()) ui.advance();
            return G.sceneId === 'viken' && !G.busy && !story.running();
        }, null, { timeout: 60000 });
        await page.evaluate(async () => {
            window.__skoldhast.pause();
            const { G, assets } = window.__skoldhast.debug;
            await Promise.all(assets.bundles().map(b => assets.load(b)));
            await document.fonts.ready;
            window.__auditSim = await import('/skoldhast/src/sim.mjs');
            window.__auditSave = await import('/skoldhast/src/save.mjs');
            G.story = null;
        });
        for (const stage of stages) {
            const record = await page.evaluate(stage => {
                const { G, view, app, ui, guide, story } = window.__skoldhast.debug;
                G.flags.clear();
                for (const f of window.__auditSave.CODE_RESTORE[1].flags) G.flags.add(f);
                if (stage.chapter === 1) G.flags.delete('ch2_open');
                else { G.flags.add('ch2_open'); G.flags.add('peeled_trench-paper'); }
                if (stage.lit) G.flags.add('p5_lit');
                if (stage.flat) { G.flags.add('p6_flat'); G.flags.add('mark_sea'); }
                G.time = 12; G.busy = 0;
                G.goto('kelp', { x: stage.x * 200, y: stage.y * 200, mode: 'swim', facing: 1 }, { silent: true });
                Object.assign(G.puz.school, { state: stage.lit ? 'lit' : 'home', ...G.sceneDef.school[stage.lit ? 'lit' : 'home'] });
                for (const actor of Object.values(G.actors)) Object.assign(actor, { visible: false, walk: null });
                G.camHint = { x: stage.focus[0] * 200, y: stage.focus[1] * 200, zoom: stage.zoom };
                const random = Math.random; let seed = 8351;
                Math.random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
                try { view.setScene('kelp'); } finally { Math.random = random; }
                view.cam.snap = true;
                guide.clear(); guide.goal(story.goal()); guide.show(true); guide.update();
                ui.setContext(null, false); ui.showControls(true);
                for (let i = 0; i < 60; i++) view.render(window.__auditSim.snapshot(G.player, 1, G.terrain, G.time), 1 / 60);
                app.render();
                return { stage, flags: [...G.flags], goal: story.goal(), school: { ...G.puz.school },
                    effects: view.layers.hints.children.map(c => c.label).filter(Boolean) };
            }, stage);
            await page.screenshot({ path: path.join(out, `${stage.name}-${size}.png`) });
            records.push({ viewport: size, ...record });
        }
        await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'states.json'), JSON.stringify({ type: 'staged visual evidence', records }, null, 2));
    console.log(`${records.length} underwater audit screenshots, no browser errors`);
} finally { await browser.close(); server.close(); }
