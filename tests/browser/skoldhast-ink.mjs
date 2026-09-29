#!/usr/bin/env node
// Inspect real Pixi ink geometry on the curved P1 bridge and long P8 pier line.
// --baseline records the old defect without failing; --out captures identical views.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((v, i, all) => v.startsWith('--') ? [[v.slice(2), all[i + 1]?.startsWith('--') || !all[i + 1] ? true : all[i + 1]]] : []));
const out = path.resolve(args.out || '/tmp/skoldhast-ink');
fs.mkdirSync(out, { recursive: true });
const server = await serve(), browser = await launch(), errors = [], records = [];
try {
    const pg = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    pg.on('pageerror', e => errors.push(e.message));
    pg.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
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
        window.__skoldhast.pause();
        const d = window.__skoldhast.debug;
        await d.assets.load('land');
        window.__inkSim = await import('/skoldhast/src/sim.mjs');
        d.G.story = null; d.G.hideHero = true; d.guide.show(false); d.ui.showControls(false);
        for (const a of Object.values(d.G.actors)) a.visible = false;
    });
    for (const [scene, id] of [['land', 'p1-arch'], ['viken', 'p8-d1']]) {
        const fresh = await pg.evaluate(({ scene, id }) => {
            const { G, view } = window.__skoldhast.debug;
            G.flags.add('talk_done');
            G.goto(scene, { x: 0, y: 0 }, { silent: true });
            const ds = G.sceneDef.dashed.find(d => d.id === id);
            G.flags.delete(ds.flag); ds._ink = 0;
            G.terrain.refresh(); view.setScene(scene);
            const parent = ds.decal ? view.layers.mid : view.layers.objects;
            const group = parent.children.find(c => c.children?.length === 3 && c.children[1]._pts?.length > 2 && Math.abs(c.children[1]._pts[0].x - ds.pts[0][0]) < 1);
            if (!group) throw new Error('missing ink group: ' + id);
            window.__inkGroup = group;
            return { visible: group.children[2].visible, points: group.children[2]._pts.length };
        }, { scene, id });
        records.push({ id, fresh });
        for (const dir of [1, -1]) for (const progress of [0, 0.4, 1, 0.15, 0]) {
            const data = await pg.evaluate(({ id, dir, progress }) => {
                const { G, view, app } = window.__skoldhast.debug, sim = window.__inkSim;
                const ds = G.sceneDef.dashed.find(d => d.id === id), group = window.__inkGroup, ink = group.children[2];
                const length = sim.lineLength(ds.pts), tip = sim.pointAt(ds.pts, length * (dir < 0 ? 1 - progress : progress));
                ds._ink = progress;
                if (progress === 1) G.flags.add(ds.flag); else G.flags.delete(ds.flag);
                Object.assign(G.player, { x: tip.x, y: tip.y, px: tip.x, py: tip.y, mode: 'streck', streck: { d: ds, dir }, facing: dir, vx: 0, vy: 0 });
                G.camHint = { x: (ds.pts[0][0] + ds.pts.at(-1)[0]) / 2, y: ds.pts[0][1] - 100, zoom: 0.75 };
                view.cam.snap = true;
                view.render(sim.snapshot(G.player, 1, G.terrain, G.time), 0);
                app.render();
                const points = ink._pts.map(p => [p.x, p.y]);
                const source = group.children[1]._pts.map(p => [p.x, p.y]);
                const from = dir < 0 ? [tip.x, tip.y] : source[0];
                const to = dir < 0 ? source.at(-1) : [tip.x, tip.y];
                const mesh = ink.geometry?.getBuffer('aPosition')?.data;
                return { id, dir, progress, visible: ink.visible, points, source, from, to, tip: [tip.x, tip.y], finite: !mesh || [...mesh].every(Number.isFinite) };
            }, { id, dir, progress });
            records.push(data);
            if (dir === 1 && [0.4, 1].includes(progress)) await pg.screenshot({ path: path.join(out, `${id}-${progress === 1 ? 'complete' : 'partial'}.png`) });
        }
    }
    fs.writeFileSync(path.join(out, 'geometry.json'), JSON.stringify({ records, errors }, null, 2));
    if (!args.baseline) {
        const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01;
        for (const r of records) {
            if (r.fresh) { assert.equal(r.fresh.visible, false, `${r.id}: no ink flash before first render`); continue; }
            const label = `${r.id} ${r.dir} ${r.progress}`;
            assert.equal(r.points.length, r.source.length, `${label}: capacity covers the whole line`);
            assert.equal(r.visible, r.progress > 0, `${label}: zero ink stays hidden`);
            assert.equal(r.finite, true, `${label}: all GPU vertices stay finite`);
            assert.ok(near(r.points[0], r.from), `${label}: correct start, including after shrinking`);
            assert.ok(near(r.points.at(-1), r.to), `${label}: correct end, including after shrinking`);
            if (r.progress === 1) assert.deepEqual(r.points, r.source, `${label}: every bend of the completed line remains`);
            else for (const p of r.points) assert.ok(near(p, r.tip) || r.source.some(q => near(p, q)), `${label}: clipped ink stays on the original polyline`);
        }
    }
    assert.deepEqual(errors, []);
    console.log(args.baseline ? 'recorded baseline ink geometry' : 'P1/P8 ink spans each full line and clips in both directions');
} finally { await browser.close(); server.close(); }
