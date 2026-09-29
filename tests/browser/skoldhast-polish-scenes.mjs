#!/usr/bin/env node
// Repeatable visual states for the deeper polish pass. These are staged views,
// not gameplay checks. No simulation or story clock runs between state and shot.
// node tests/browser/skoldhast-polish-scenes.mjs --out /tmp/polish-before
// Optional --viewport 844x390 (default: both phone viewports); --verify checks
// the route reveal, completed route and articulated guardian integration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((v, i, all) => v.startsWith('--') ? [[v.slice(2), all[i + 1]?.startsWith('--') || !all[i + 1] ? true : all[i + 1]]] : []));
const out = path.resolve(args.out || '/tmp/skoldhast-polish-scenes');
fs.mkdirSync(out, { recursive: true });
const sizes = args.viewport ? [String(args.viewport)] : ['844x390', '390x844'];
const stages = [
    { name: '01-p8-pier-start', scene: 'viken', x: 4, y: -.62, phase: 'p8' },
    { name: '02-p8-pier-middle', scene: 'viken', x: 12, y: -.62, phase: 'p8' },
    { name: '03-p8-pier-end', scene: 'viken', x: 22, y: -.62, phase: 'p8' },
    { name: '04-p8-sea-lane', scene: 'viken', x: 26, y: 2, mode: 'swim', phase: 'sea' },
    { name: '05-p7-plate-approach', scene: 'viken', x: 14.2, y: 6.25, mode: 'swim', phase: 'plate' },
    { name: '06-p7-plate-hiding', scene: 'viken', x: 14.2, y: 6.86, mode: 'swim', phase: 'plate', hidden: true },
    { name: '07-guardian-stand', scene: 'viken', x: 21.5, y: -.62, phase: 'guardian', guardian: 'stand' },
    { name: '08-guardian-talk', scene: 'viken', x: 21.5, y: -.62, phase: 'guardian', guardian: 'point', talking: true },
    { name: '09-guardian-peek', scene: 'viken', x: 28, y: -7.3, phase: 'peek', peek: true },
    { name: '10-evening-bay', scene: 'viken', x: 20.5, y: -.62, phase: 'p8', evening: true },
    { name: '11-kelp-silhouette', scene: 'kelp', x: 12, y: 3.4, mode: 'swim', phase: 'kelp' },
    { name: '12-steppe-ridge', scene: 'land', x: 58, y: -.82, phase: 'p8' },
    { name: '13-lit-lamp-gallery', scene: 'viken', x: 28, y: -7.3, phase: 'p8', hideHero: true, focusX: 29.8 },
    { name: '14-left-facing-land', scene: 'land', x: 58, y: -.82, phase: 'p8', facing: -1, naturalCamera: true }
];
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const server = await serve(), browser = await launch(), records = [], errors = [];
try {
    for (const size of sizes) {
        const [width, height] = size.split('x').map(Number);
        const pg = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
        pg.on('pageerror', e => errors.push(`${size}: ${e.message}`));
        pg.on('console', e => { if (e.type() === 'error') errors.push(`${size}: ${e.text()}`); });
        await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
        await pg.waitForSelector('.sk-title');
        await pg.getByText('Jag har en kod').click();
        await pg.fill('.sk-code-input', 'fyr fjun klo');
        await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await pg.waitForFunction(() => {
            const d = window.__skoldhast.debug;
            if (d.ui.dialogueOpen()) d.ui.advance();
            return d.G?.sceneId === 'viken' && d.view.built('viken') && !d.G.busy && !d.story.running();
        }, null, { timeout: 60000 });
        await pg.evaluate(async () => {
            const api = window.__skoldhast, d = api.debug;
            api.pause();
            await Promise.all(d.assets.bundles().map(bundle => d.assets.load(bundle)));
            await document.fonts.ready;
            window.__polishSim = await import('/skoldhast/src/sim.mjs');
            window.__polishWords = await import('/skoldhast/src/content/sv.mjs');
            window.__polishBaseFlags = [...d.G.flags];
            d.G.story = null;
            d.guide.clear();
        });
        for (const stage of stages) {
            if (args.only && !stage.name.includes(String(args.only))) continue;
            const record = await pg.evaluate(stage => {
                const { G, view, app, ui, guide, story } = window.__skoldhast.debug;
                const { snapshot } = window.__polishSim;
                const progression = ['shutter1','shutter2','shutter3','lamp_lit','kv_met','talk1','talk2','talk_done','p8_s1','p8_s2','p8_s3','p8_land','p8_done'];
                // Story keeps the flags Set by reference, so restore it in place.
                G.flags.clear();
                for (const f of window.__polishBaseFlags) if (!progression.includes(f)) G.flags.add(f);
                for (const f of ['ch3_open','viken_arrived','gate_open','b:k3_arrive','p5_lit']) G.flags.add(f);
                if (['p8','sea'].includes(stage.phase)) for (const f of ['shutter1','shutter2','shutter3','lamp_lit','kv_met','talk1','talk2','talk_done']) G.flags.add(f);
                if (stage.phase === 'sea') for (const f of ['p8_s1','p8_s2','p8_s3','p8_land']) G.flags.add(f);
                if (stage.phase === 'guardian') for (const f of ['shutter1','shutter2','shutter3','lamp_lit','kv_met']) G.flags.add(f);
                if (stage.phase === 'plate') G.flags.add('shutter1');
                G.time = 12; G.busy = 0; G.evening = !!stage.evening; G.lessMotion = false;
                G.hideHero = !!stage.peek || !!stage.hideHero; G.vista = false; G.finalRun = false; G.freeze = false;
                G.goto(stage.scene, { x: stage.x * 200, y: stage.y * 200, facing: stage.facing ?? 1, mode: stage.mode || 'ground' }, { silent: true });
                Object.assign(G.player, { x: stage.x * 200, y: stage.y * 200, px: stage.x * 200, py: stage.y * 200,
                    vx: 0, vy: 0, speed: 0, gait: 'stand', gaitPhase: .2, hidden: !!stage.hidden, hide: stage.hidden ? 1 : 0 });
                for (const actor of Object.values(G.actors)) Object.assign(actor, { visible: false, talking: false, walk: null, pop: 0 });
                if (stage.guardian) Object.assign(G.actors.kv, { visible: true, scene: 'viken', x: 23.2 * 200, y: -.62 * 200,
                    facing: -1, pose: stage.guardian, talking: !!stage.talking, map: stage.talking ? 'open' : 'closed' });
                if (stage.peek) Object.assign(G.actors.figure, { visible: true, scene: 'viken', x: G.sceneDef.lamp.x,
                    y: G.sceneDef.lamp.y + 45, facing: -1, pose: 'kv-peek' });
                G.puz.plates.plate = stage.hidden ? .6 : 0;
                G.camHint = stage.naturalCamera ? null : stage.peek ? { x: 29.8 * 200, y: -7.7 * 200, zoom: 1 } : { x: (stage.focusX ?? stage.x) * 200, y: (stage.y - .8) * 200, zoom: 1 };
                // Scene decor uses randomness only at construction: fixed seed gives
                // the same fronds and particles in before and after captures.
                const random = Math.random; let seed = 6021;
                Math.random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
                try { view.setScene(stage.scene); } finally { Math.random = random; }
                view.cam.snap = true;
                guide.clear(); guide.goal(story.goal()); guide.show(!stage.hideHero); guide.update();
                ui.showControls(!stage.hideHero);
                G.guidance = story.guidance?.();
                if (G.guidance) guide.context?.(G.guidance);
                ui.setContext(stage.mode === 'swim' ? null : undefined, G.player.hidden);
                // A fixed number of visual frames settles hair/alpha; it does not
                // step puzzles, move the player or trigger a story beat.
                for (let i = 0; i < 12; i++) view.render(snapshot(G.player, 1, G.terrain, G.time), 1 / 60);
                guide.update(); // context placement follows the settled hero screen position
                app.render();
                return { ...stage, flags: [...G.flags].sort(), player: { x: G.player.x, y: G.player.y, mode: G.player.mode,
                    hidden: G.player.hidden, hide: G.player.hide }, cam: { ...view.cam }, goal: story.goal(),
                    actors: Object.fromEntries(Object.entries(G.actors).map(([key,a]) => [key, { ...a }])),
                    built: view.built(stage.scene), plate: G.puz.plates.plate,
                    routes: view.layers.hints.children.filter(c => c.routeCue).map(c => ({ label: c.label,
                        ...c.routeCue, visible: c.visible, shown: c.children.filter(m => m.visible).length })),
                    guardian: view.layers.actors.children.filter(c => c.label?.startsWith('guardian-')).map(c => ({
                        label: c.label, visible: c.visible, articulated: c.children[1]?.visible,
                        visibleParts: c.children[1]?.children.filter(p => p.visible).length })),
                    actionCue: (() => { const c = view.layers.hints.children.find(c => c.guidanceCue); return c && { ...c.guidanceCue, visible: c.visible }; })() };
            }, stage);
            assert.equal(record.built, true, `${size} ${stage.name}: complete artwork`);
            if (args.verify) {
                if (stage.phase === 'p8' && stage.scene === 'viken') {
                    const routes = record.routes.filter(c => c.label.startsWith('route-p8-d'));
                    assert.equal(routes.length, 3, `${size}: all three land segments have shaped route marks`);
                    assert.ok(routes.every(c => c.visible && c.reveal === 1 && c.shown > 10), `${size}: land route visible without a pulse`);
                }
                if (stage.phase === 'sea') assert.ok(record.routes.some(c => c.label === 'route-p8-lane' && c.visible && c.shown >= 5), `${size}: sea route visible above the water hatching`);
                if (stage.guardian || stage.peek) {
                    const rig = record.guardian.find(c => c.label === (stage.peek ? 'guardian-figure' : 'guardian-kv'));
                    assert.ok(rig?.visible && rig.articulated, `${size}: guardian uses live parts`);
                    assert.equal(rig.visibleParts, stage.peek ? 3 : 17, `${size}: peek shows only head and hands`);
                }
            }
            await pg.evaluate(async () => {
                await document.fonts.ready;
                await Promise.all([...document.querySelectorAll('.sk-goal')].flatMap(node => node.getAnimations()).filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished));
            });
            assert.deepEqual(errors, []);
            const file = `${stage.name}-${size}.png`;
            await pg.screenshot({ path: path.join(out, file) });
            records.push({ viewport: size, file, ...record });
            console.log(`${size}: ${stage.name}`);
        }
        if (args.verify) {
            const reveal = await pg.evaluate(async () => {
                const { G, view, app } = window.__skoldhast.debug, { snapshot, STEP } = window.__polishSim;
                G.flags.add('talk_done');
                G.goto('viken', { x: 4 * 200, y: -.62 * 200 }, { silent: true });
                view.setScene('viken'); G.hideHero = false;
                const cues = () => view.layers.hints.children.filter(c => c.routeCue && c.label.startsWith('route-p8-d'));
                const advance = frames => { for (let n = 0; n < frames; n++) { G.step({}); view.render(snapshot(G.player, 1, G.terrain, G.time), STEP); } };
                const done = view.fx('lineAppears', {});
                const start = cues().map(c => c.routeCue.reveal);
                advance(60);
                const middle = cues().map(c => c.routeCue.reveal);
                advance(100); await done;
                const end = cues().map(c => c.routeCue.reveal);
                G.flags.add('p8_s1'); view.render(snapshot(G.player, 1, G.terrain, G.time), 0);
                const completed = cues()[0].routeCue.completed;
                G.lessMotion = true;
                const reducedDone = view.fx('lineAppears', {}); advance(36); await reducedDone;
                const reduced = cues().map(c => c.routeCue.reveal);
                G.flags.add('p8_land'); G.flags.add('p8_done'); view.render(snapshot(G.player, 1, G.terrain, G.time), 0);
                const seaAfterEnd = view.layers.hints.children.find(c => c.label === 'route-p8-lane')?.visible;
                app.render();
                return { start, middle, end, completed, reduced, seaAfterEnd };
            });
            assert.deepEqual(reveal.start, [0, 0, 0], `${size}: reveal starts undrawn`);
            assert.equal(reveal.middle[0], 1); assert.ok(reveal.middle[1] > 0 && reveal.middle[1] < 1);
            assert.equal(reveal.middle[2], 0, `${size}: reveal traces segments in order`);
            assert.deepEqual(reveal.end, [1, 1, 1]); assert.equal(reveal.completed, true);
            assert.deepEqual(reveal.reduced, [1, 1, 1], `${size}: reduced motion shows the full cue`);
            assert.equal(reveal.seaAfterEnd, false, `${size}: completed ending has no active sea route`);
            records.push({ viewport: size, reveal });
            const calm = await pg.evaluate(() => {
                const { G, view } = window.__skoldhast.debug, { snapshot } = window.__polishSim;
                G.goto('kelp', { x: 12 * 200, y: 3.4 * 200, mode: 'swim' }, { silent: true });
                G.lessMotion = true; G.guidance = null; view.setScene('kelp'); view.cam.snap = true;
                const render = () => view.render(snapshot(G.player, 1, G.terrain, G.time), 1 / 60);
                for (let i = 0; i < 60; i++) render();
                const geometry = () => ({
                    waves: view.layers.waterFront.children.filter(c => c._pts).map(c => c._pts.map(p => [p.x, p.y])),
                    kelp: [...view.layers.mid.children, ...view.layers.fore.children].filter(c => c._strip).map(c => [...c._strip.positions]),
                    atmosphere: view.layers.far.children.find(c => c.atmosphere).children.map(c => [c.x, c.y, c.scale.x, c.scale.y, c.alpha])
                });
                const first = geometry();
                for (let i = 0; i < 120; i++) render();
                return { first, later: geometry() };
            });
            assert.deepEqual(calm.first, calm.later, `${size}: reduced-motion water, fronds and atmospheric marks stay still`);
            records.push({ viewport: size, reducedSceneryStable: true });
        }
        await pg.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, args.only ? `states-${String(args.only).replace(/[^a-z0-9-]/gi, '')}.json` : 'states.json'), JSON.stringify({ revision, staged: true, records, errors }, null, 2));
    console.log(`${records.length} focused states captured; no browser errors; ${out}`);
} finally { await browser.close(); server.close(); }
