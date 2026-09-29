/*
 * Sköldhästen – the prologue and the epilogue at Alva's table (plan §3.4).
 *
 * Her picture is the real game scene at the start (rendered into a texture), on
 * a sheet of paper on the table. The player draws a gull and a cloud freely in
 * the white margin, then traces the shoreline off the picture; halfway, a
 * ruler-straight crease flicks across the page, the splash stops in mid-air,
 * one drop rolls upward, and the sköldhäst blinks. The camera dives into the page.
 */
import { HL } from './sim.mjs';
import { STORY, UI, HER_TEXT, FAMILY, CAPTIONS } from './content/sv.mjs';

const h = (v) => v * HL;
const PW = 1000, PH = 760;                 // the paper, in paper units
const PIC = { x: 40, y: 52, w: 740, h: 560 }; // her picture on it

export function createTable({ PIXI, app, view, G, ui, audio, assets, makeHero }) {
    const T = (n) => assets.tex(n);
    const table = new PIXI.Container();
    table.visible = false;
    app.stage.addChild(table);
    const desk = new PIXI.TilingSprite({ texture: T('desk-wood') || PIXI.Texture.WHITE, width: 64, height: 64 });
    if (!T('desk-wood')) desk.tint = 0xc9a27a;
    const paperLayer = new PIXI.Container();
    table.addChild(desk, paperLayer);
    const paper = new PIXI.Graphics();
    const pic = new PIXI.Sprite(PIXI.Texture.EMPTY);
    const onPaper = new PIXI.Container();
    paperLayer.addChild(paper, pic, onPaper);
    const extras = new PIXI.Container(); // window, pencils lying around
    table.addChildAt(extras, 1);
    let picHero = null, picKlo = null, splash = null, sun = null;
    let t = 0;
    let frozen = false;
    const drops = [];
    const falling = [];
    let dropT = 0;
    let running = false;
    let destroyed = false;
    const pending = new Set();

    const sprite = (name, ax = 0.5, ay = 0.5) => {
        const tx = T(name);
        const s = tx ? new PIXI.Sprite(tx) : new PIXI.Graphics().rect(-20, -20, 40, 40).fill({ color: 0xcccccc });
        s.anchor?.set?.(ax, ay);
        return s;
    };

    function layout() {
        const W = app.screen.width, H = app.screen.height;
        desk.width = W; desk.height = H;
        const s = Math.min((W - 24) / PW, (H - 24) / PH);
        paperLayer.scale.set(s);
        paperLayer.x = (W - PW * s) / 2; paperLayer.y = (H - PH * s) / 2;
        paper.clear();
        const pt = T('mat-paper');
        if (pt) paper.rect(0, 0, PW, PH).fill({ texture: pt, textureSpace: 'global' }); else paper.rect(0, 0, PW, PH).fill({ color: 0xfbf8f1 });
        paper.rect(0, 0, PW, PH).stroke({ width: 3, color: 0x6b635a, alpha: 0.45 });
        return s;
    }
    /** paper units → CSS px */
    const toCss = (x, y) => [paperLayer.x + x * paperLayer.scale.x, paperLayer.y + y * paperLayer.scale.y];
    const paperBounds = (x, y, width, height) => {
        const [left, top] = toCss(x, y);
        return { x: left, y: top, width: width * paperLayer.scale.x, height: height * paperLayer.scale.y };
    };

    // the snapshot camera for her composition
    function pictureCam() {
        const st = G.scenes.land.spots.start;
        const zoom = PIC.w / h(5.3);
        // her composition: the sköldhäst stands on the sand in the lower third, sky and sun above
        return { x: st.x + h(0.35), y: st.y - h(1.0), zoom };
    }
    function worldToPaper(wx, wy) {
        const c = pictureCam();
        return [PIC.x + PIC.w / 2 + (wx - c.x) * c.zoom, PIC.y + PIC.h / 2 + (wy - c.y) * c.zoom];
    }

    function takePicture({ withSplash = false } = {}) {
        const c = pictureCam();
        G.hideHero = true; G.snapNoSplash = !withSplash; G.hideActors = true;
        const rt = view.snapshot({ x: c.x, y: c.y, zoom: c.zoom, width: PIC.w, height: PIC.h, skyFactor: 0.33 });
        G.hideHero = false; G.snapNoSplash = false; G.hideActors = false;
        pic.texture = rt; pic.x = PIC.x; pic.y = PIC.y;
        return rt;
    }

    function placeHero(evening) {
        if (!picHero) { picHero = makeHero(); onPaper.addChild(picHero.view); }
        const st = G.scenes.land.spots.start;
        const [x, y] = worldToPaper(st.x, st.y);
        picHero.view.x = x; picHero.view.y = y;
        picHero.view.scale.set(pictureCam().zoom);
        picHero._evening = evening;
    }

    function start(evening = false) {
        table.visible = true;
        ui.root.classList.add('table-mode');
        layout();
        extras.removeChildren();
        if (evening) {
            const win = sprite('window-dusk'); win.x = app.screen.width * 0.5; win.y = app.screen.height * 0.13; win.scale.set(0.55); win.alpha = 0.95; extras.addChild(win);
            if (FAMILY.stars) for (let i = 0; i < 3; i++) { const st = sprite('star-1'); st.x = win.x - 60 + i * 38; st.y = win.y - 30 + (i === 1 ? -14 : 0); st.scale.set(0.5); extras.addChild(st); st._tw = i; }
            desk.tint = 0xe6c79a;
        } else desk.tint = 0xffffff;
        const lying = sprite('pencils-lying'); lying.x = app.screen.width * 0.1; lying.y = app.screen.height * 0.88; lying.scale.set(0.6); lying.rotation = -0.2; extras.addChild(lying);
        const eraser = sprite('eraser'); eraser.x = app.screen.width * 0.9; eraser.y = app.screen.height * 0.1; eraser.scale.set(0.5); extras.addChild(eraser);
    }
    function stop() {
        table.visible = false;
        ui.root.classList.remove('table-mode');
        onPaper.removeChildren();
        picHero?.destroy?.(); picHero = null; picKlo = null; splash = null; sun = null;
        drops.length = 0; falling.length = 0;
        running = false;
    }

    function tick(dt) {
        t += dt;
        if (picHero) {
            const st = G.scenes.land.spots.start;
            picHero.update(dt, { x: st.x, y: st.y, facing: 1, gait: 'stand', mode: 'ground', speed: 0, time: t, hide: 0,
                action: picHero._action || null, actionT: picHero._actionT || 0, lookAt: picHero._look || null, groundAt: () => st.y, emote: picHero._emote || null });
            if (picHero._action) { picHero._actionT = Math.min(1, (picHero._actionT || 0) + dt / 0.9); if (picHero._actionT >= 1) picHero._action = null; }
        }
        if (splash && !frozen) {
            splash.scale.y = splash._base * (1 + Math.sin(t * 6) * 0.07);
            // her droplets fall, so the freeze is visible later
            if ((dropT -= dt) <= 0) {
                dropT = 0.22 + Math.random() * 0.2;
                const d = sprite('p-drop'); d.scale.set(0.5 + Math.random() * 0.4);
                d.x = splash.x + (Math.random() - 0.5) * 70; d.y = splash.y - 90 - Math.random() * 40;
                onPaper.addChild(d); falling.push({ s: d, vy: 20 + Math.random() * 30, t: 0 });
            }
        }
        for (let i = falling.length - 1; i >= 0; i--) {
            const f = falling[i];
            if (frozen) continue; // stopped in mid-air
            f.t += dt; f.vy += 260 * dt; f.s.y += f.vy * dt; f.s.alpha = Math.max(0, 1 - f.t / 0.9);
            if (f.t > 0.9) { f.s.destroy(); falling.splice(i, 1); }
        }
        if (sun && !frozen) sun.rotation = Math.sin(t * 0.8) * 0.05;
        for (const d of drops) { d.t += dt; d.s.y = d.y0 - d.t * 22; d.s.alpha = Math.max(0, 1 - d.t / 3.4); }
        for (const s of extras.children) if (s._tw !== undefined) s.alpha = 0.6 + 0.4 * Math.sin(t * 2 + s._tw);
    }

    // --- stroke helpers --------------------------------------------------------------
    function strokeTexture(ptsCss, { color = '#3b3530', width = 4.5 } = {}) {
        // draw a pencil-ish stroke into a canvas; return { texture, box } in paper units
        const P = ptsCss.map(([x, y]) => [(x - paperLayer.x) / paperLayer.scale.x, (y - paperLayer.y) / paperLayer.scale.y]);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        const pad = 12;
        const w = Math.max(24, Math.ceil(x1 - x0 + pad * 2)), hh = Math.max(24, Math.ceil(y1 - y0 + pad * 2));
        const cv = document.createElement('canvas');
        cv.width = w * 2; cv.height = hh * 2;
        const c = cv.getContext('2d');
        c.scale(2, 2);
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (let pass = 0; pass < 3; pass++) {
            c.strokeStyle = color; c.globalAlpha = pass === 0 ? 0.9 : 0.35; c.lineWidth = width * (pass === 0 ? 1 : 0.6);
            c.beginPath();
            P.forEach(([x, y], i) => { const X = x - x0 + pad + (pass ? (Math.random() - 0.5) * 1.6 : 0), Y = y - y0 + pad + (pass ? (Math.random() - 0.5) * 1.6 : 0); i ? c.lineTo(X, Y) : c.moveTo(X, Y); });
            c.stroke();
        }
        return { texture: PIXI.Texture.from(cv), box: { x: x0 - pad, y: y0 - pad, w, h: hh }, pts: P };
    }
    const ghostM = (cx, cy, s = 1) => { const out = []; for (let i = 0; i <= 24; i++) { const u = i / 24; out.push([cx - 50 * s + 100 * s * u, cy - Math.abs(Math.sin(u * Math.PI * 2)) * 30 * s]); } return out; };
    const ghostCloud = (cx, cy) => { const out = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; const r = 1 + 0.18 * Math.sin(a * 5); out.push([cx + Math.cos(a) * 80 * r, cy + Math.sin(a) * 34 * r]); } return out; };

    // --- the prologue ---------------------------------------------------------------------
    async function prologue() {
        G.goto('land', 'start', { silent: true });
        view.setScene('land');
        view.render(snapStand(), 0.016);
        start(false);
        takePicture();
        placeHero(false);
        // her splash and sun, alive until the freeze
        const sp = G.scenes.land.spots.splash;
        const [sx, sy] = worldToPaper(sp.x, sp.y);
        splash = sprite('frozen-splash', 0.5, 1); splash.x = sx; splash.y = sy + 20; splash._base = pictureCam().zoom; splash.scale.set(splash._base); onPaper.addChild(splash);
        audio?.setArea('table');
        running = true;
        await wait(0.9);
        // her words (only as far as Pappa allows)
        await ui.say([['caption', HER_TEXT.lastTwo || STORY.prolog.captionFallback]]);
        // a tiny crab climbs out of the drawn sand
        const kb = G.scenes.land.spots.kloBeach;
        const [kx, ky] = worldToPaper(kb.x + h(2.2), kb.y);
        picKlo = sprite('klo-idle-1', 0.5, 1); picKlo.x = kx; picKlo.y = ky; picKlo.scale.set(pictureCam().zoom); onPaper.addChild(picKlo);
        audio?.sfx('crabclick');
        await tween(0.5, (u) => { picKlo.scale.y = pictureCam().zoom * u; });
        await ui.say([HER_TEXT.lastTwo ? STORY.prolog.klo1 : STORY.prolog.klo1Fallback, STORY.prolog.klo2]);
        picKlo.texture = T('klo-point') || picKlo.texture;
        // three strokes in the margin, outside her finished picture
        const gullGeometry = () => ({
            ghost: ghostM(880, 150, 0.9).map(([x, y]) => toCss(x, y)),
            bounds: paperBounds(790, 70, 190, 160)
        });
        const gullPts = await ui.draw({ prompt: UI.drawGull, ...gullGeometry(), getGeometry: gullGeometry, color: '#4d6e8c' });
        const gull = strokeTexture(gullPts, { color: '#4d6e8c' });
        G.userGull = gull.texture; G.userStrokes = { gull: gull.pts };
        const gs = new PIXI.Sprite(gull.texture); gs.x = gull.box.x; gs.y = gull.box.y; gs.scale.set(0.5); onPaper.addChild(gs);
        audio?.sfx('gull');
        tween(2.2, (u) => { gs.x = gull.box.x - u * 260; gs.y = gull.box.y - u * 120 + Math.sin(u * 12) * 10; gs.alpha = 1 - Math.max(0, u - 0.7) / 0.3; });
        // The cloud is authored in paper units, just like the gull. Applying
        // the paper transform to every point keeps its start inside a portrait
        // phone and prevents an oversized cloud in the finished picture.
        const cloudGeometry = () => ({
            ghost: ghostCloud(885, 330).map(([x, y]) => toCss(885 + (x - 885) * 0.85, 330 + (y - 330) * 0.85)),
            bounds: paperBounds(790, 250, 190, 160)
        });
        const cloudPts = await ui.draw({ prompt: UI.drawCloud, ...cloudGeometry(), getGeometry: cloudGeometry });
        const cloud = strokeTexture(cloudPts, { color: '#3b3530' });
        G.userCloud = cloud.texture; G.userStrokes.cloud = cloud.pts;
        const cs = new PIXI.Sprite(cloud.texture); cs.x = cloud.box.x; cs.y = cloud.box.y; cs.scale.set(0.5); onPaper.addChild(cs);
        tween(4, (u) => { cs.x = cloud.box.x - u * 160; });
        // the shoreline, traced along generous anchors from the picture's edge; the crease cuts it short
        const st = G.scenes.land.spots.start;
        const [, wy] = worldToPaper(st.x + h(2.5), G.scenes.land.surfaces.find((q) => q.id === 'beach').pts.at(-1)[1] - 6);
        const shoreGeometry = () => ({ anchors: Array.from({ length: 6 }, (_, i) => toCss(PIC.x + PIC.w - 6 + i * 40, wy)) });
        await ui.draw({ prompt: UI.drawShore, ...shoreGeometry(), getGeometry: shoreGeometry, stopAt: 3, width: 6, color: '#244f8f' });
        // Prassel. A dead-straight crease flicks across the horizon from outside the page.
        await crease(wy);
        frozen = true;
        audio?.freeze(true);
        audio?.stinger('freeze');
        ui.caption(CAPTIONS.rustle);
        // one drop rolls upward over the paper
        const d = sprite('p-drop'); d.x = sx + 30; d.y = sy - 60; d.scale.set(0.9); onPaper.addChild(d); drops.push({ s: d, y0: sy - 60, t: 0 });
        await wait(1.6);
        picHero._emote = 'surprised'; picHero._look = { x: G.scenes.land.spots.splash.x, y: G.scenes.land.spots.splash.y };
        audio?.sfx('snort');
        await wait(0.7);
        await ui.say([STORY.prolog.stuck]);
        await ui.choice([UI.choiceWhat, UI.choiceWho]);
        picHero._emote = null;
        await ui.say([STORY.prolog.fold, STORY.prolog.mystery, STORY.prolog.research]);
        // dive into the page
        await dive();
        running = false;
        stop();
        G.flag('intro_done');
    }

    function snapStand() {
        const st = G.scenes.land.spots.start;
        return { x: st.x, y: st.y, facing: 1, gait: 'stand', mode: 'ground', speed: 0, vx: 0, vy: 0, hide: 0, time: 0, groundAt: () => st.y };
    }

    async function crease(wy) {
        const tex = T('stroke-crease');
        const y = wy - 150;
        const pts = []; for (let i = 0; i <= 20; i++) pts.push(new PIXI.Point(PW + 60, y));
        const line = tex ? new PIXI.MeshRope({ texture: tex, points: pts }) : null;
        const g = new PIXI.Graphics();
        onPaper.addChild(line || g);
        audio?.sfx('rustle');
        await tween(0.35, (u) => {
            const x0 = PW + 60 - u * (PW + 120);
            if (line) { pts.forEach((p, i) => { p.x = PW + 60 - (i / 20) * (PW + 60 - x0); p.y = y; }); }
            else { g.clear().moveTo(PW + 60, y).lineTo(x0, y).stroke({ width: 3, color: 0x3b3530 }); g.moveTo(PW + 60, y + 4).lineTo(x0, y + 4).stroke({ width: 6, color: 0x9a948a, alpha: 0.3 }); }
        });
    }

    async function dive() {
        audio?.stinger('reveal');
        const st = G.scenes.land.spots.start;
        const [hx, hy] = worldToPaper(st.x, st.y - h(0.6));
        const s0 = paperLayer.scale.x, x0 = paperLayer.x, y0 = paperLayer.y;
        const W = app.screen.width, H = app.screen.height;
        await tween(1.3, (u) => {
            const e = u * u * (3 - 2 * u);
            const s = s0 * (1 + e * 3.2);
            paperLayer.scale.set(s);
            paperLayer.x = lerp(x0, W / 2 - hx * s, e);
            paperLayer.y = lerp(y0, H / 2 - hy * s, e);
            table.alpha = 1 - Math.max(0, (u - 0.72) / 0.28);
        });
        table.alpha = 1;
        paperLayer.scale.set(s0); paperLayer.x = x0; paperLayer.y = y0;
    }

    // --- the epilogue ----------------------------------------------------------------------
    async function epilogue({ onCovered } = {}) {
        view.setScene('land');
        view.render(snapStand(), 0.016);
        start(true);
        table.alpha = 0;
        takePicture({ withSplash: false });
        placeHero(true);
        running = true;
        audio?.setArea('table');
        await tween(1.2, (u) => { table.alpha = u; });
        onCovered?.();
        // a wet hoofprint beside the drawing, and a new note
        const hp = sprite('hoofprint-wet'); hp.x = PIC.x + PIC.w + 90; hp.y = PIC.y + PIC.h - 40; hp.scale.set(0.8); hp.alpha = 0; onPaper.addChild(hp);
        await tween(0.8, (u) => { hp.alpha = u; });
        audio?.sfx('drip');
        await wait(0.6);
        picHero._action = 'lookdown'; picHero._actionT = 0;
        const note = HER_TEXT.question ? `${HER_TEXT.question} Forskningen fortsätter.` : STORY.final.noteFallback;
        await ui.say([['note', note]]);
        if (FAMILY.miraCameo) await ui.say(STORY.final.mira);
        // the sköldhäst blinks once more
        picHero._emote = 'happy';
        await wait(1.2);
        running = false;
        await new Promise((resolve) => ui.journal({ page: 6, ...journalState(), onClose: resolve }));
        await tween(0.8, (u) => { table.alpha = 1 - u; });
        stop();
        table.alpha = 1;
    }
    let journalState = () => ({});

    // --- small helpers ------------------------------------------------------------------------
    // Cancellation stops the suspended script here. Resolving a cancelled wait
    // would let an abandoned prologue keep working on the destroyed table.
    function wait(s) {
        return new Promise((resolve) => {
            if (destroyed) return;
            const cancel = () => clearTimeout(timer);
            const timer = setTimeout(() => { pending.delete(cancel); if (!destroyed) resolve(); }, s * 1000);
            pending.add(cancel);
        });
    }
    function tween(dur, fn) {
        return new Promise((resolve) => {
            if (destroyed) return;
            const t0 = performance.now();
            let raf = 0;
            const cancel = () => cancelAnimationFrame(raf);
            pending.add(cancel);
            const step = () => {
                if (destroyed) return;
                const u = Math.min(1, (performance.now() - t0) / (dur * 1000));
                fn(u);
                if (u < 1) raf = requestAnimationFrame(step);
                else { pending.delete(cancel); resolve(); }
            };
            step();
        });
    }
    function lerp(a, b, u) { return a + (b - a) * u; }

    return {
        prologue, epilogue, layout,
        tick(dt) { if (running) tick(dt); },
        setJournalState(fn) { journalState = fn; },
        get active() { return table.visible; },
        /** true while the table covers the whole screen (the game world need not be drawn) */
        get opaque() { return table.visible && table.alpha >= 0.999; },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            for (const cancel of pending) cancel();
            pending.clear();
            running = false; stop(); table.destroy({ children: true });
        }
    };
}
