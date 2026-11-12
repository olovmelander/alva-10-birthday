#!/usr/bin/env node
/*
 * Äventyr 3's contact sheets (docs/skoldhast/adventure-3.md, section 19): one WebP sheet per page, one for the seven
 * big pictures, one for the climax's states and one for Alva's table, each at 390×844, 844×390 and 1440×900, written
 * to docs/skoldhast/shots/a3/<sheet>-<w>x<h>.webp.
 *
 *   NODE_PATH=…/node_modules node scripts/skoldhast-a3-sheets.mjs [--only mane,big] [--sizes phone,side,desk] [--out dir]
 *
 * Each sheet opens the preview (skoldhast/dev/play.html?adventure=3&debug) once with a saved game, then stages every
 * frame through window.__skoldhast3.debug (flags, a place, an fx), takes a screenshot, and composes the frames into
 * one picture in the browser. Software WebGL is slow: run one at a time.
 */
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from './skoldhast-shot.mjs';

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT = arg('--out') || path.join(ROOT, 'docs/skoldhast/shots/a3');
const SIZES = { phone: [390, 844], side: [844, 390], desk: [1440, 900] };
const sizes = (arg('--sizes') || 'phone,side,desk').split(',');
const only = arg('--only')?.split(',') || null;
fs.mkdirSync(OUT, { recursive: true });

const LIGHTS = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'].map(id => 'light_' + id);
const MOON = ['b:arrive', 'breakfast', 'b:breakfast', 'visited_mane'];
const AFTER_MOON = [...MOON, 'm5_view', 'fin_drawn', 'light_l1', 'light_l2', 'light_l3', 'beam_used', 'visited_stjarn', 'visited_ring'];
const NINE = [...AFTER_MOON, ...LIGHTS.slice(0, 9), 'wagon_drawn', 'belt_lit', 'bear_nose', 'pip_met', 'slung', 'ice_melted', 'comet_rest', 'gap_drawn'];
const WHITE = [...NINE, 'visited_sudd', 'b:suddArrive', 'rocket_gone'];
const CLIMAX = [...WHITE, 'dent1', 'dent2', 'dent3', 'dent4', 'fog1_lit', 'fog2_lit', 'fog3_lit', 'fogd1', 'fogd2', 'fogd3', 'bridge_refused', 'bridge_crossed'];
const RIDE = [...CLIMAX, 'climax', 'moon_bitten', 'notes_rubbed', 'outline_gone', 'self_drawn', 'light_l10', 'tenth_drawn', 'ride'];
const ENDED = [...RIDE, 'ride_done', 'caught', 'moon_whole', 'lights_home', 'gold', 'constellation', 'notes_ink', 'telescope', 'ended'];

const profile = (flags, checkpoint, ended = false) => ({ v: 2, contentVersion: 1, label: 'Alva', updated: 1, settings: {}, activeAdventure: 'adventure-3',
    completedAdventures: ['havet-mellan-sidorna', 'adventure-2'],
    adventures: { 'adventure-3': { contentVersion: 1, flags, checkpoint, puz: {}, strokes: null, ended } } });

/** Page-side helpers: a place with flags (story beats already told, so the picture is play, not talk), fx, waits. */
const HELPERS = async () => {
    const sv = await import('/skoldhast/adventures/adventure-3/content/sv.mjs');
    const d = () => window.__skoldhast3.debug;
    const told = [...Object.keys(sv.STORY), 'arrive', 'climaxA', 'drawnSelf', 'travel', 'talk', 'gapDone', 'eraserGone', 'finale', 'rimHeals', 'landed', 'lift',
        'measure_firstHorse', 'measure_firstTurtle', 'measure_even', 'beamDone', 'nightDone', 'ledgeDone', 'beltDone'].map(k => 'b:' + k);
    window.__S = {
        d,
        go(scene, x, y, { flags = [], off = [], swim = false, facing = 1, puz = null } = {}) {
            const G = d().G;
            for (const f of told) G.flags.add(f);
            for (const f of flags) G.flags.add(f);
            for (const f of off) G.flags.delete(f);
            if (puz) Object.assign(G.puz, puz);
            G.busy = 0; G.camHint = null; G.camLook = null; G.carry = null;
            G.goto(scene, { x: x * 200, y: y * 200, facing, mode: swim ? 'swim' : undefined });
            if (d().view.sceneId === scene) d().view.setScene(scene);
            d().view.cam.snap = true;
        },
        advance() { const u = d().ui; if (u.dialogueOpen()) u.advance(); },
        fx(name, data) { return d().view.fx(name, data || {}); }
    };
};

const server = await serve(), browser = await launch();
const base = `http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?adventure=3`;

async function open(viewport, save) {
    const p = await browser.newPage({ viewport });
    p.errors = [];
    p.on('pageerror', e => p.errors.push(e.message));
    if (save) await p.addInitScript((s) => {
        localStorage.setItem('skoldhast.v2.index', JSON.stringify({ slots: ['alva'], last: 'alva', deleted: [] }));
        localStorage.setItem('skoldhast.v2.slot.alva', JSON.stringify(s));
    }, save);
    else await p.addInitScript(() => localStorage.clear());
    await p.goto(base);
    await p.waitForSelector('.a3-title .sk-pbtn.primary', { timeout: 60000 });
    if (save) {
        await p.click('.a3-title .sk-pbtn.primary');
        await p.waitForFunction(() => window.__skoldhast3?.debug?.mode === 'play', null, { timeout: 60000 });
        await p.evaluate(HELPERS);
        await p.waitForTimeout(800);
    }
    return p;
}
const ev = (p, fn, a) => p.evaluate(fn, a).catch(err => { throw new Error(`${String(err.message).split(/\r?\n/)[0]} in ${fn.toString().replace(/\s+/g, ' ').slice(0, 90)}`); });
async function snap(p, frames, label) {
    // close any speech box and wait for the page to settle into its picture
    await ev(p, () => { for (let i = 0; i < 3; i++) window.__S?.advance(); });
    const buf = await p.screenshot({ type: 'jpeg', quality: 82 });
    frames.push({ label, b64: buf.toString('base64') });
}
async function place(p, frames, label, scene, x, y, o = {}, wait = 1700) {
    const { then, thenWait, ...go } = o;
    await ev(p, ([s, xx, yy, oo]) => window.__S.go(s, xx, yy, oo), [scene, x, y, go]);
    await p.waitForTimeout(wait);
    if (then) await ev(p, then);
    if (thenWait) await p.waitForTimeout(thenWait);
    await snap(p, frames, label);
}

// --- the sheets ----------------------------------------------------------------------------------------------------
const SHEETS = {
    async mane(vp) {
        const p = await open(vp, profile(AFTER_MOON, 'start')), f = [];
        await place(p, f, 'Landningsplatsen, före frukost', 'mane', 6.2, 0.04, { off: ['breakfast', 'box_landed', 'm5_view', 'fin_drawn', ...LIGHTS] });
        await place(p, f, 'Hyllan och kometflingorna', 'mane', 18.8, 0.0, { off: ['breakfast', 'box_landed', ...LIGHTS] });
        await place(p, f, 'Hoppfälten', 'mane', 28.0, 0.0, { flags: ['breakfast'] });
        await place(p, f, 'Djupa kratern', 'mane', 49.0, 4.0, { off: ['light_l1'] });
        await place(p, f, 'Nattsidan, mörk', 'mane', 58.4, 0.03, { off: ['light_l2'] });
        await place(p, f, 'Nattsidan i Novas röda ljus', 'mane', 64.8, -0.5, { off: ['light_l2'], then: () => { const G = window.__S.d().G; G.puz.angryUntil = G.time + 30; } });
        await place(p, f, 'Kanten och avsatsen', 'mane', 87.4, -3.9, { off: ['light_l3'] });
        await place(p, f, 'Utsikten', 'mane', 97.2, -7.83);
        await place(p, f, 'Västra kanten', 'mane', -6, -0.65);
        return { p, f };
    },
    async stjarn(vp) {
        const p = await open(vp, profile(AFTER_MOON, 'dock')), f = [];
        const S0 = { off: ['wagon_drawn', 'belt_lit', 'bear_nose', 'pip_met', 'light_l4', 'light_l5', 'light_l6'] };
        await place(p, f, 'Hamnstenen och Karlavagnen', 'stjarn', 4.6, -0.04, S0);
        await place(p, f, 'Svävar mellan stjärnorna', 'stjarn', 13.5, -2.6, { ...S0, swim: true });
        await place(p, f, 'Karlavagnen ritad', 'stjarn', 21, -2.6, { flags: ['wagon_drawn'], off: S0.off.slice(1), swim: true });
        await place(p, f, 'Orions bälte, en tänd', 'stjarn', 34.2, 0.07, { flags: ['wagon_drawn'], off: S0.off.slice(1), then: () => { window.__S.d().G.puz.belt = ['b2']; } });
        await place(p, f, 'Stora björnen sover', 'stjarn', 49.4, 1.02, { flags: ['wagon_drawn', 'belt_lit', 'light_l4'], off: ['bear_nose', 'pip_met', 'light_l5', 'light_l6'] });
        await place(p, f, 'Björnen vaken', 'stjarn', 66.4, -3.0, { flags: ['wagon_drawn', 'belt_lit', 'light_l4', 'bear_nose', 'light_l5'], off: ['pip_met', 'light_l6'] });
        await place(p, f, 'Pips omlopp', 'stjarn', 74, 0.52, { flags: ['wagon_drawn', 'belt_lit', 'light_l4', 'bear_nose', 'light_l5'], off: ['pip_met', 'light_l6'] });
        return { p, f };
    },
    async ring(vp) {
        const p = await open(vp, profile(AFTER_MOON, 'icedock')), f = [];
        const R0 = { off: ['slung', 'ice_melted', 'comet_rest', 'gap_drawn', 'light_l7', 'light_l8', 'light_l9'] };
        await place(p, f, 'Isbryggan', 'ring', 4.4, 0, R0);
        await place(p, f, 'Grusregnet, en skur', 'ring', 15, 0, R0, 300);
        await p.waitForFunction(() => window.__S.d().G.puz.shower?.state === 'shower', null, { timeout: 8000 }).catch(() => {});
        await p.waitForTimeout(300); f.pop(); await snap(p, f, 'Grusregnet, en skur');
        await place(p, f, 'Slungan', 'ring', 28.6, 0, R0);
        await place(p, f, 'Skuggsidan och isblocket', 'ring', 46.0, 0, { flags: ['slung'], off: R0.off.slice(1) });
        await place(p, f, 'Rastplatsen', 'ring', 72.6, 0, { flags: ['slung', 'ice_melted', 'light_l7'], off: ['comet_rest', 'gap_drawn', 'light_l8', 'light_l9'] }, 300);
        await p.waitForFunction(() => window.__S.d().G.comet?.resting, null, { timeout: 9000 }).catch(() => {});
        await p.waitForTimeout(500); f.pop(); await snap(p, f, 'Kometen vilar vid Rastplatsen');
        await place(p, f, 'Luckan', 'ring', 75.6, 0, { flags: ['slung', 'ice_melted', 'light_l7', 'comet_rest', 'light_l8'], off: ['gap_drawn', 'light_l9'] });
        await place(p, f, 'Sista flaket', 'ring', 88.4, 0, { flags: ['slung', 'ice_melted', 'light_l7', 'comet_rest', 'light_l8', 'gap_drawn'], off: ['light_l9'] });
        return { p, f };
    },
    async sudd(vp) {
        const p = await open(vp, profile(WHITE, 'whiteEdge')), f = [];
        const D = ['dent1', 'dent2', 'dent3', 'dent4'], FG = ['fog1_lit', 'fog2_lit', 'fog3_lit', 'fogd1', 'fogd2', 'fogd3'];
        await place(p, f, 'Kanten av himlen', 'sudd', 4.2, 0, { off: [...D, ...FG] });
        await place(p, f, 'Märkena, halvt ritade', 'sudd', 19.6, -0.6, { flags: ['dent1', 'dent2'], off: ['dent3', 'dent4', ...FG] });
        await place(p, f, 'Blyertsdimman', 'sudd', 30.2, -0.43, { flags: D, off: FG });
        await place(p, f, 'Dimman tänd, och det som står i den', 'sudd', 35.1, -0.78, { flags: [...D, 'fog1_lit', 'fogd1', 'fog2_lit'], off: ['fogd2', 'fog3_lit', 'fogd3'], then: () => { window.__S.fx('ghosts'); } , thenWait: 1500 });
        await place(p, f, 'Sista bron', 'sudd', 46.3, 0, { flags: [...D, ...FG], off: ['bridge_refused', 'bridge_crossed'] });
        await place(p, f, 'Smulhögen och månen', 'sudd', 64.0, -0.35, { flags: [...D, ...FG, 'bridge_refused', 'bridge_crossed'] });
        return { p, f };
    },
    async vinter(vp) {
        const p = await open(vp, profile(RIDE, 'tailTip')), f = [];
        for (const v of [2, 40, 78, 112, 152]) {
            await place(p, f, `Kometens svans, ${v} längder`, 'vinter', 163.2 - v, 0, { off: ['ride_done', 'caught'], facing: -1, puz: { ride: v * 200, rideMarks: 99 } }, 2400);
        }
        await place(p, f, 'Kometens huvud', 'vinter', 5.0, 0, { flags: ['ride_done'], off: ['caught'], facing: -1 });
        return { p, f };
    },
    async big(vp) {
        const p = await open(vp, profile(AFTER_MOON, 'view')), f = [];
        // 1. the launch (the picture runs on its own; speech boxes are clicked through)
        await ev(p, () => { window.__launch = window.__S.d().pictures.play('launch', {}); });
        for (const t of [2600, 5200, 8000]) {
            const until = Date.now() + t;
            while (Date.now() < until) { await ev(p, () => window.__S.advance()); await p.waitForTimeout(250); }
            await snap(p, f, '1 Uppskjutningen');
        }
        await ev(p, () => window.__S.d().pictures.close?.());
        await p.waitForTimeout(1500);
        // 2. the view from Kanten
        await place(p, f, '2 Utsikten', 'mane', 97.2, -7.83, { then: () => { window.__S.fx('vista', { on: true }); }, thenWait: 2600 });
        await ev(p, () => window.__S.fx('vista', { on: false }));
        // 3. Stora björnen stands up
        await place(p, f, '3 Björnen reser sig', 'stjarn', 66.8, -2.98, { flags: ['wagon_drawn', 'belt_lit', 'bear_nose', 'light_l4', 'light_l5'], then: () => { window.__S.fx('bearStands'); }, thenWait: 3600 });
        // 4. the slingshot
        await place(p, f, '4 Slungan', 'ring', 30.0, 0, { then: () => { window.__S.fx('slingshot'); }, thenWait: 1500 });
        await p.waitForTimeout(2400);
        // 5. the white page: the rocket rubbed out
        await place(p, f, '5 Det vita: raketen suddas', 'sudd', 4.2, 0, { flags: [...LIGHTS.slice(0, 9)], off: ['rocket_gone'], then: () => { window.__S.fx('rocketGone'); }, thenWait: 2200 });
        // 6. Den stora galoppen
        await place(p, f, '6 Den stora galoppen', 'vinter', 163.2 - 120, 0, { flags: RIDE, off: ['ride_done', 'caught'], facing: -1, puz: { ride: 120 * 200, rideMarks: 99 } });
        // 7. the finished sky
        await place(p, f, '7 Den färdiga himlen', 'mane', 11.0, 0.42, { flags: ENDED, then: () => { window.__S.fx('finishedSky'); }, thenWait: 4200 });
        return { p, f };
    },
    async climax(vp) {
        const p = await open(vp, profile(CLIMAX, 'crumbs')), f = [];
        const at = { flags: ['b:climaxA', 'climax'], off: ['moon_bitten', 'outline_gone', 'self_drawn', 'notes_rubbed'],
            then: () => { const d = window.__S.d(); d.G.moon = { bites: 0, lit: 1, drain: 0 }; Object.assign(d.G.actors.sudd, { visible: true, scene: 'sudd', x: 73.2 * 200, y: -1.55 * 200, size: 0.45, pose: 'rub', staged: true }); } };
        await place(p, f, 'Före', 'sudd', 70, -1.42, at);
        for (const [n, lit] of [[1, 0.72], [2, 0.45], [3, 0.25]]) {
            await ev(p, ([nn, l]) => { const d = window.__S.d(); d.G.moon = { bites: nn, lit: l, drain: 0 }; window.__S.fx('bite', { n: nn }); }, [n, lit]);
            await p.waitForTimeout(1600); await snap(p, f, `Bett ${n}`);
        }
        await ev(p, () => { window.__S.d().G.flags.add('moon_bitten'); window.__S.fx('lightsOut'); });
        await p.waitForTimeout(2600); await snap(p, f, 'Mörkret, ljus underifrån');
        await ev(p, () => { const d = window.__S.d(); d.G.moon = { bites: 3, lit: 0.18, drain: 1 }; window.__S.fx('drain'); });
        await p.waitForTimeout(1800); await snap(p, f, 'Månen rinner ut');
        await ev(p, () => { window.__S.fx('notesRub'); window.__S.d().G.flags.add('notes_rubbed'); });
        await p.waitForTimeout(1300); await snap(p, f, 'Anteckningarna suddas');
        await ev(p, () => { window.__S.fx('outlineGone'); });
        await p.waitForTimeout(1900); await snap(p, f, 'Konturen försvinner');
        await ev(p, () => { const d = window.__S.d(); d.G.flags.add('outline_gone'); d.G.selfDrawing = true; d.G.puz.selfDrawn = 0; });
        await p.waitForTimeout(2600); await snap(p, f, 'Bara färg');
        await ev(p, () => { window.__S.d().G.puz.selfDrawn = 6; });
        await p.waitForTimeout(900); await snap(p, f, 'Halvt ritad');
        await ev(p, () => { const d = window.__S.d(); d.G.puz.selfDrawn = 12; d.G.flags.add('self_drawn'); window.__S.fx('selfWhole'); });
        await p.waitForTimeout(1800); await snap(p, f, 'Hel igen');
        // the forest in the lightning: its six still pictures (in the real flow the game's notes and buttons are hidden)
        await p.addStyleTag({ content: '.sk-hud, .sk-guide, .sk-keynote { visibility: hidden !important; }' });
        for (let i = 0; i < 6; i++) { await ev(p, (ii) => window.__S.d().pictures.debugStill(ii), i); await p.waitForTimeout(500); await snap(p, f, `Skogen i blixten ${i + 1}`); }
        return { p, f };
    },
    async table(vp) {
        // the prologue, from the title of an empty save: every speech box clicked through, the flame drawn for us
        const p = await open(vp, null), f = [];
        await p.click('.a3-title .sk-pbtn.primary');
        const t0 = Date.now();
        let next = 1800;
        while (Date.now() - t0 < 120000) {
            const st = await ev(p, () => { const d = window.__skoldhast3?.debug; return d ? { mode: d.mode, draw: !!document.querySelector('.sk-draw.on'), dlg: d.ui.dialogueOpen(), shown: d.pictures?.shown } : null; });
            if (!st) { await p.waitForTimeout(300); continue; }
            if (Date.now() - t0 > next && f.length < 9) { await snap(p, f, 'Vid Alvas bord'); next += 4200; }
            if (st.draw) {
                await snap(p, f, 'Elden ritas');
                await p.click('.sk-draw.on .sk-draw-example', { timeout: 2000, force: true }).catch(() => {});
                await p.waitForTimeout(1200);
                await snap(p, f, 'Elden ritad');
                await p.click('.sk-draw.on .sk-draw-done', { timeout: 2000, force: true }).catch(() => {});
            } else if (st.dlg) { await p.waitForTimeout(600); await ev(p, () => window.__skoldhast3.debug.ui.advance()); }
            if (st.shown) break; // the launch has begun: the table is done
            await p.waitForTimeout(300);
        }
        await p.close();
        // the epilogue, from the end of the story
        const q = await open(vp, profile(ENDED, 'home', true));
        await ev(q, () => { const d = window.__S.d(); window.__tick = setInterval(() => d.table.tick(1 / 30), 33); d.table.epilogue({}); });
        for (let i = 0; i < 6; i++) {
            const until = Date.now() + 2600;
            while (Date.now() < until) { await ev(q, () => window.__S.advance()); await q.waitForTimeout(250); }
            await snap(q, f, 'Epilogen');
        }
        return { p: q, f };
    }
};

/** Compose frames into one WebP sheet (in the browser: a canvas, then toDataURL). */
async function compose(name, vpName, [w, h], frames) {
    const cols = w > h ? 3 : 5, cellW = w > h ? (w > 1000 ? 480 : 422) : 260, cellH = Math.round(cellW * h / w);
    const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
    const data = await page.evaluate(async ({ frames, cols, cellW, cellH, title }) => {
        const rows = Math.ceil(frames.length / cols), pad = 6, head = 30, cap = 22;
        const c = document.createElement('canvas');
        c.width = cols * (cellW + pad) + pad; c.height = head + rows * (cellH + cap + pad) + pad;
        const g = c.getContext('2d');
        g.fillStyle = '#2b2a33'; g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = '#f4ecd6'; g.font = 'bold 17px sans-serif'; g.fillText(title, pad + 2, 21);
        for (let i = 0; i < frames.length; i++) {
            const img = new Image(); img.src = 'data:image/jpeg;base64,' + frames[i].b64; await img.decode();
            const x = pad + (i % cols) * (cellW + pad), y = head + Math.floor(i / cols) * (cellH + cap + pad);
            g.drawImage(img, x, y, cellW, cellH);
            g.fillStyle = '#d8d3c4'; g.font = '13px sans-serif'; g.fillText(`${i + 1}. ${frames[i].label}`.slice(0, Math.floor(cellW / 6.6)), x + 2, y + cellH + 16);
        }
        return c.toDataURL('image/webp', 0.8);
    }, { frames, cols, cellW, cellH, title: `Äventyr 3 · ${name} · ${w}×${h}` });
    await page.close();
    const file = path.join(OUT, `${name}-${w}x${h}.webp`);
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    return file;
}

let failed = 0;
for (const vpName of sizes) {
    const [w, h] = SIZES[vpName];
    for (const [name, make] of Object.entries(SHEETS)) {
        if (only && !only.includes(name)) continue;
        const t0 = Date.now();
        try {
            const { p, f } = await make({ width: w, height: h });
            const errors = p?.errors || [];
            await p?.close().catch(() => {});
            const file = await compose(name, vpName, [w, h], f);
            console.log(`${name} ${w}x${h}: ${f.length} frames, ${(fs.statSync(file).size / 1024).toFixed(0)} kB, ${((Date.now() - t0) / 1000).toFixed(0)} s${errors.length ? ' ERRORS ' + errors.slice(0, 3).join(' | ') : ''}`);
        } catch (err) { failed++; console.log(`${name} ${w}x${h}: FAILED ${String(err.message || err).split('\n')[0]}`); }
        for (const pg of browser.contexts().flatMap(c => c.pages())) await pg.close().catch(() => {});
    }
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
