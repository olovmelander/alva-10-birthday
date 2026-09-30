/*
 * Sköldhästen – the prologue and the epilogue at Alva's table (plan §3.4).
 *
 * Her picture is the real game scene at the start (rendered into a texture), on
 * a sheet of paper on the table. The player draws a gull and a cloud freely in
 * the white margin, then traces the shoreline off the picture; halfway, a
 * ruler folds the sea corner under the page across that stroke, the splash stops in mid-air,
 * one drop rolls upward, and the sköldhäst blinks. The camera dives into the page.
 */
import { HL } from './sim.mjs';
import { STORY, UI, HER_TEXT, FAMILY, CAPTIONS, DRAWING, JOURNAL } from './content/sv.mjs';
import { createOpeningFold } from './opening-fold.mjs';
import { createOpeningKlo, OPENING_KLO_HOLD, OPENING_KLO_STAGES, openingKloAt, openingKloDuration } from './opening-klo.mjs';
import { createOpeningCanvas } from './opening-canvas.mjs';
import { createStuckWave, surfaceGround } from './stuck-wave.mjs';
import { createOpeningNotes, createScribbleReveal } from './opening-notes.mjs';
import { CLOUD_PENCILS, createUserCloud, paintUserCloud } from './user-cloud.mjs';

const h = (v) => v * HL;
const PW = 1000, PH = 760;                 // the paper, in paper units
const PIC = { x: 40, y: 52, w: 740, h: 560 }; // her picture on it
// The top rim of the shell art (hero-shell, 196×120 texture pixels), a few
// pixels inside its graphite edge: the guide and the pigment follow the plates.
const SHELL_RIM = [[20, 63], [28, 54], [38, 46], [49, 40], [60, 33], [72, 27], [84, 21], [98, 17], [112, 13],
    [126, 11], [140, 11], [154, 12], [166, 16], [176, 20], [182, 25]];
const SHELL_ANCHORS = [0, 4, 7, 10, 14];

export function createTable({ PIXI, app, view, G, ui, audio, assets, makeHero }) {
    const T = (n) => assets.tex(n);
    const table = new PIXI.Container();
    table.label = 'story-table';
    table.visible = false;
    app.stage.addChild(table);
    const desk = new PIXI.TilingSprite({ texture: T('desk-wood') || PIXI.Texture.WHITE, width: 64, height: 64 });
    if (!T('desk-wood')) desk.tint = 0xc9a27a;
    const paperLayer = new PIXI.Container();
    paperLayer.label = 'story-paper';
    table.addChild(desk, paperLayer);
    const sheet = new PIXI.Container();
    const paper = new PIXI.Graphics();
    const pic = new PIXI.Sprite(PIXI.Texture.EMPTY);
    const onPaper = new PIXI.Container();
    const shore = new PIXI.Graphics(); shore.label = 'opening-shoreline';
    sheet.addChild(paper, pic, shore);
    paperLayer.addChild(sheet, onPaper);
    const extras = new PIXI.Container(); // window, pencils lying around
    table.addChildAt(extras, 1);
    let picHero = null, picKlo = null, wave = null;
    let canvasLife = null, heroAwake = true, closeFrame = 0, kloFrame = 0;
    // Slow motion: how fast the picture's world runs (horse, mane, wave spray),
    // and a closer camera that follows the falling drop.
    let worldSpeed = 1;
    const focus = { k: 0, x: 0, y: 0 };
    // Alva's notes: the opening begins in her head, her picture framed beside her note.
    let notes = null, notesFrame = 0;
    const wakeStroke = new PIXI.Graphics(); wakeStroke.label = 'opening-wake-stroke';
    let t = 0;
    let frozen = false;
    const drops = [];
    let running = false;
    let destroyed = false;
    let openingFold = null, pictureTexture = null;
    let phase = 'idle';
    const setPhase = (value) => { phase = value; table.label = 'story-table'; table.storyPhase = value; };
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
        const wide = Math.min((W - 24) / PW, (H - 24) / PH);
        const close = Math.min((W - 40) / 510, (H - 100) / 360);
        // Klo's scene pushes in on the band from the mane to the hooves, so a
        // phone shows his eyes and marks at a readable size.
        const kS = Math.min((W - 40) / 280, (H - 130) / 204, Math.max(close * 1.4, 1.2));
        const fS = Math.max(kS, Math.min((W - 40) / 200, (H - 130) / 150, kS * 1.5));
        const cs = lerp(lerp(close, kS, kloFrame), fS, focus.k);
        const cx = lerp(lerp(420, 335, kloFrame), focus.x, focus.k);
        const cy = lerp(lerp(410, 380 + 55 / kS, kloFrame), focus.y, focus.k);
        let s = lerp(wide, cs, closeFrame);
        let px = W / 2 - lerp(PW / 2, cx, closeFrame) * s, py = H / 2 - lerp(PH / 2, cy, closeFrame) * s;
        if (notes) {
            // while she writes, her picture fills the space beside her note
            const r = notes.layout(W, H);
            if (notesFrame > 0) {
                const sN = Math.min(r.w / PIC.w, r.h / PIC.h);
                const xN = r.x + r.w / 2 - (PIC.x + PIC.w / 2) * sN, yN = r.y + r.h / 2 - (PIC.y + PIC.h / 2) * sN;
                s = lerp(s, sN, notesFrame); px = lerp(px, xN, notesFrame); py = lerp(py, yN, notesFrame);
            }
        }
        paperLayer.scale.set(s);
        paperLayer.x = px;
        paperLayer.y = py;
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
    function lookAtPaper(x, y) {
        const c = pictureCam();
        picHero._look = { x: c.x + (x - PIC.x - PIC.w / 2) / c.zoom,
            y: c.y + (y - PIC.y - PIC.h / 2) / c.zoom };
    }

    function takePicture({ withSplash = false } = {}) {
        const c = pictureCam();
        G.hideHero = true; G.snapNoSplash = !withSplash; G.hideActors = true;
        const rt = view.snapshot({ x: c.x, y: c.y, zoom: c.zoom, width: PIC.w, height: PIC.h, skyFactor: 0.33 });
        G.hideHero = false; G.snapNoSplash = false; G.hideActors = false;
        pic.texture = rt; pic.x = PIC.x; pic.y = PIC.y;
        pictureTexture?.destroy(true); pictureTexture = rt;
        return rt;
    }

    function placeHero(evening) {
        if (!picHero) { picHero = makeHero(); onPaper.addChild(picHero.view); }
        const st = G.scenes.land.spots.start;
        const [x, y] = worldToPaper(st.x, st.y);
        picHero.view.x = x; picHero.view.y = y;
        picHero.view.scale.set(pictureCam().zoom);
        picHero.view.label = 'opening-hero';
        picHero._evening = evening;
    }

    function start(evening = false) {
        frozen = false; table.alpha = 1; t = 0;
        heroAwake = true; closeFrame = 0; kloFrame = 0; focus.k = 0; worldSpeed = 1; table.openingAwake = true;
        notes?.destroy(); notes = null; notesFrame = 0;
        openingFold?.destroy(); openingFold = null; shore.clear();
        canvasLife?.destroy(); canvasLife = null;
        picKlo?.destroy(); picKlo = null;
        wakeStroke.removeFromParent(); wakeStroke.clear();
        table.visible = true;
        ui.root.classList.add('table-mode');
        layout();
        for (const child of extras.removeChildren()) child.destroy({ children: true });
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
        notes?.destroy(); notes = null; notesFrame = 0;
        ui.root.classList.remove('table-mode');
        openingFold?.destroy(); openingFold = null; shore.clear();
        canvasLife?.destroy(); canvasLife = null;
        picKlo?.destroy(); picKlo = null;
        wakeStroke.removeFromParent(); wakeStroke.clear();
        picHero?.destroy?.(); picHero = null;
        wave?.destroy(); wave = null;
        for (const child of onPaper.removeChildren()) if (!child.destroyed) child.destroy({ children: true });
        pic.texture = PIXI.Texture.EMPTY; pictureTexture?.destroy(true); pictureTexture = null;
        drops.length = 0;
        running = false;
        setPhase('idle');
    }

    function tick(real) {
        const dt = real * worldSpeed;
        t += dt;
        if (picHero && heroAwake) {
            const st = G.scenes.land.spots.start;
            picHero.update(dt, { x: st.x, y: st.y, facing: 1, gait: 'stand', mode: 'ground', speed: 0, time: t, hide: 0,
                action: picHero._action || null, actionT: picHero._actionT || 0, lookAt: picHero._look || null, groundAt: () => st.y, emote: picHero._emote || null });
            if (picHero._action) { picHero._actionT = Math.min(1, (picHero._actionT || 0) + dt / 0.9); if (picHero._actionT >= 1) picHero._action = null; }
        }
        // The wave keeps its own clock: it breathes and throws spray until the
        // fold, then slows to a stop in mid-air and is outlined as a still drawing.
        wave?.update(dt);
        notes?.update(real);
        canvasLife?.update({ time: t, alive: heroAwake, frozen });
        if (picKlo) {
            const [x, y] = worldToPaper(G.scenes.land.spots.start.x, G.scenes.land.spots.start.y);
            picKlo.update({ time: t, dt, hero: { x, y }, talking: !!ui.root.querySelector('.sk-dialogue.on.who-klo') });
        }
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
    /** A smooth pencil path through points, in several passes ({ width, color, alpha, jitter }). */
    function pencilPath(g, pts, passes) {
        for (const [n, { width, color, alpha, jitter = 0 }] of passes.entries()) {
            const wob = (i, k) => jitter ? Math.sin(i * 2.7 + n * 1.9 + k) * jitter : 0;
            const P = pts.map(([x, y], i) => [x + wob(i, 0), y + wob(i, 1.3)]);
            g.moveTo(...P[0]);
            for (let i = 1; i < P.length - 1; i++) g.quadraticCurveTo(...P[i], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
            g.lineTo(...P.at(-1));
            g.stroke({ width, color, alpha, cap: 'round', join: 'round' });
        }
        return g;
    }
    const findLabel = (node, label) => node.label === label ? node : (node.children || []).reduce((hit, c) => hit || findLabel(c, label), null);
    /** The shell's top rim in CSS pixels, from the live shell sprite (any pose). */
    function shellRim() {
        const shell = findLabel(picHero.view, 'shell');
        const tw = shell.texture.width, th = shell.texture.height, ax = shell.anchor.x, ay = shell.anchor.y;
        return SHELL_RIM.map(([px, py]) => {
            const p = shell.toGlobal(new PIXI.Point((px / 196 - ax) * tw, (py / 120 - ay) * th));
            return [p.x, p.y];
        });
    }
    /** Average colour of the finished picture around a paper point, or null. */
    function pictureSampler(rt) {
        let data = null;
        try { data = rt ? app.renderer.extract.pixels(rt) : null; } catch { data = null; }
        if (!data?.pixels?.length) return () => null;
        const { pixels, width, height } = data;
        return (px, py, r = 3) => {
            const cx = Math.round(px - PIC.x), cy = Math.round(py - PIC.y);
            let R = 0, Gc = 0, B = 0, n = 0;
            for (let y = Math.max(0, cy - r); y <= Math.min(height - 1, cy + r); y++) {
                for (let x = Math.max(0, cx - r); x <= Math.min(width - 1, cx + r); x++) {
                    const i = (y * width + x) * 4;
                    if (pixels[i + 3] < 128) continue;
                    R += pixels[i]; Gc += pixels[i + 1]; B += pixels[i + 2]; n++;
                }
            }
            return n ? ((Math.round(R / n) << 16) | (Math.round(Gc / n) << 8) | Math.round(B / n)) : null;
        };
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
        // A finished drawing is still a drawing until Alva gives it one last mark.
        // Sample the real rig once, in real world coordinates, then hold every
        // part (including world-space hair) absolutely still until the gesture.
        heroAwake = false; table.openingAwake = false; closeFrame = 1; layout();
        picHero.update(1 / 60, { ...snapStand(), emote: 'sleepy', action: 'lookdown', actionT: .45 });
        const startPoint = G.scenes.land.spots.start;
        // The picture's sea level: the sand meets it at the picture's right edge,
        // where the shoreline stroke begins and the painted margin continues.
        const [, waterY] = worldToPaper(startPoint.x, 0);
        const land = G.scenes.land;
        const ground = surfaceGround(land.surfaces);
        // The playable beach's own wave, placed on the paper at the picture's scale.
        const waveAt = land.decor.find(it => it.frozen);
        wave = createStuckWave(PIXI, { texture: T, ground, x: waveAt.x, y: waveAt.y, seaTop: 0, lessMotion: () => !!G.lessMotion });
        wave.view.label = 'opening-wave'; wave.sprite.label = 'opening-splash';
        wave.view.position.set(...worldToPaper(0, 0)); wave.view.scale.set(pictureCam().zoom);
        wave.setArrival(0);
        onPaper.addChild(wave.view);
        const bed = [];
        for (let wx = wave.shoreX; wx <= wave.shoreX + h(2.4); wx += 20) bed.push(worldToPaper(wx, ground(wx) ?? 0));
        canvasLife = createOpeningCanvas(PIXI, { parent: sheet, texture: T, picture: PIC, waterY, bed,
            sample: pictureSampler(pictureTexture), lessMotion: () => !!G.lessMotion });
        sheet.setChildIndex(shore, sheet.children.length - 1);
        const sp = G.scenes.land.spots.splash;
        const [sx, sy] = worldToPaper(sp.x, sp.y);
        audio?.setArea('table');
        running = true;
        // Her own field note opens the story: we are in her head as she writes it,
        // and her words become the picture. Then her sköldhäst comes to life.
        if (!await playNotes()) ui.caption(STORY.prolog.wakeCaption, 3200);
        setPhase('drawing-wake');
        const wakeGeometry = () => { const rim = shellRim(); return { anchors: SHELL_ANCHORS.map(i => rim[i]), guide: rim }; };
        const wake = await ui.draw({ prompt: UI.drawWake, ...wakeGeometry(), getGeometry: wakeGeometry,
            allowReverse: true, color: '#e2ec8a', width: 4, dotRadius: 9 });
        // The pigment follows the whole rim, in the direction it was traced.
        let rim = shellRim().map(([x, y]) => [(x - paperLayer.x) / paperLayer.scale.x, (y - paperLayer.y) / paperLayer.scale.y]);
        const first = [(wake[0][0] - paperLayer.x) / paperLayer.scale.x, (wake[0][1] - paperLayer.y) / paperLayer.scale.y];
        if (Math.hypot(first[0] - rim.at(-1)[0], first[1] - rim.at(-1)[1]) < Math.hypot(first[0] - rim[0][0], first[1] - rim[0][1])) rim = rim.reverse();
        pencilPath(wakeStroke.clear(), rim, [{ width: 6, color: 0xeef3b0, alpha: .45 }, { width: 2.6, color: 0xb9c566, alpha: .95 }, { width: 1.1, color: 0x6f8a3c, alpha: .55, jitter: .7 }]);
        wakeStroke.alpha = 1; onPaper.addChild(wakeStroke);
        setPhase('waking');
        heroAwake = true; table.openingAwake = true;
        picHero._emote = 'happy'; picHero._action = 'nod'; picHero._actionT = 0;
        audio?.sfx('snort', { gain: .5 });
        await tween(G.lessMotion ? .55 : 1.2, u => { wakeStroke.alpha = 1 - u * u; });
        // The stamp calls the sea: its last wave runs up the sand from the
        // waterline and bursts against the hooves as the hoof comes down.
        picHero._action = 'stamp'; picHero._actionT = 0;
        audio?.sfx('rustle', { gain: .18 });
        if (G.lessMotion) { await wait(.45); wave.setArrival(1); audio?.sfx('splash', { size: .6, gain: .6 }); }
        else {
            let burst = false;
            await tween(.95, u => {
                wave.setArrival(u);
                if (u > .5 && !burst) { burst = true; audio?.sfx('splash', { size: .6, gain: .6 }); }
            });
        }
        setPhase('alive');
        await ui.say([STORY.prolog.awake]);
        // Klo lives in the dry sand just behind the horse. It shakes itself, one
        // drop from the shell lands in his hole, and up come his eye stalks.
        // What follows is his wonder: shell, then mane, then research at once.
        const kloX = startPoint.x - h(.86);
        const kloY = G.terrain.groundNear(kloX, startPoint.y, 90) ?? startPoint.y;
        const [kx, ky] = worldToPaper(kloX, kloY);
        const zoom = pictureCam().zoom;
        const rimCss = shellRim()[0];
        const rimPaper = [(rimCss[0] - paperLayer.x) / paperLayer.scale.x, (rimCss[1] - paperLayer.y) / paperLayer.scale.y];
        picKlo = createOpeningKlo(PIXI, { parent: onPaper, texture: T, x: kx, y: ky, scale: zoom,
            dropFrom: { x: (rimPaper[0] - kx) / zoom, y: (rimPaper[1] - ky) / zoom }, reducedMotion: () => !!G.lessMotion });
        picHero._look = null;
        const cues = {
            fall: () => { audio?.sfx('whoosh', { gain: .18 }); audio?.sfx('sparkle'); },
            plip: () => { audio?.sfx('drip'); audio?.sfx('splash', { size: .12, gain: .22 }); },
            periscope: () => audio?.sfx('crabclick', { gain: .35 }),
            rise: () => audio?.sfx('rustle', { gain: .3 }),
            backstep: () => audio?.sfx('pop', { gain: .15 }),
            awe: () => audio?.sfx('sparkle'),
            'double-take': () => { picHero._action = 'stamp'; picHero._actionT = 0; audio?.sfx('hoof', { gain: .6 }); },
            split: () => audio?.sfx('crabvoice', { gain: .3 }),
            crouch: () => audio?.sfx('crabclick'),
            take: () => { audio?.stinger('aha'); picHero._emote = 'surprised'; },
            land: () => { audio?.sfx('crabclick'); audio?.sfx('page', { gain: .3 }); },
            research: () => { audio?.sfx('write'); audio?.sfx('pencil', { len: .8 }); picHero._emote = 'happy'; }
        };
        // A skipped frame must not skip a stage's cue: play every one passed.
        let fired = -1;
        const entrance = (value) => {
            picKlo.setEntrance(value);
            const at = OPENING_KLO_STAGES.indexOf(picKlo.stage);
            while (fired < at) cues[OPENING_KLO_STAGES[++fired]]?.();
        };
        setPhase('klo-entrance');
        // Her own last two sentences set the scene while the camera finds the sand
        // behind the horse: her question, and her hope that a researcher will come.
        const capText = HER_TEXT.hope ? `”${HER_TEXT.hope}”` : STORY.prolog.captionFallback;
        const capMs = Math.round(1000 * Math.min(10, Math.max(4.2, 1.2 + .055 * capText.length)));
        ui.caption(capText, capMs);
        const lead = Math.max(1.2, capMs / 1000 - 2.8);
        if (G.lessMotion) { kloFrame = 1; layout(); await wait(lead); }
        else await tween(lead, u => { kloFrame = u * u * (3 - 2 * u); layout(); });
        picHero._action = G.lessMotion ? 'nod' : 'shake'; picHero._actionT = 0;
        audio?.sfx('shake', { gain: .5 });
        // The shake throws water. Time slows while the camera follows one drop
        // from the shell into his hole; the world snaps back when it lands, and
        // slows again as he rises out of the sand.
        const partA = openingKloDuration(!!G.lessMotion), at = {};
        const [holeX, holeY] = [kx + picKlo.dropPoint()[0] * zoom, ky];
        await tween(partA, u => {
            const s = u * partA;
            openingKloAt(s, !!G.lessMotion, at);
            worldSpeed = at.speed;
            entrance(at.progress);
            if (!G.lessMotion) {
                const [dx, dy] = picKlo.dropPoint();
                const px = kx + dx * zoom, py = ky + dy * zoom;
                // in on the drop as it leaves the shell, down with it to the hole,
                // then back out as his eyes climb the horse
                focus.k = at.beat === 'shake' ? .4 * ease(at.u) : ['fall', 'impact', 'still'].includes(at.beat)
                    ? (at.beat === 'fall' ? .4 + .6 * ease(Math.min(1, at.u * 3)) : 1)
                    : at.beat === 'wake' ? 1 - ease(Math.max(0, (at.u - .45) / .55)) : 0;
                const follow = at.beat === 'shake' || at.beat === 'fall';
                focus.x = follow ? lerp((px + holeX) / 2, px, .55) : holeX;
                focus.y = follow ? lerp((py + holeY) / 2, py, .55) : holeY - 26;
                layout();
            }
        });
        worldSpeed = 1; focus.k = 0; layout();
        setPhase('klo-wonder');
        await ui.say([STORY.prolog.kloWonder]);
        // "A turtle?!" The horse tosses its head; one of Klo's eyes follows the mane.
        setPhase('klo-take');
        picHero._action = 'toss'; picHero._actionT = 0;
        audio?.sfx('snort');
        await tween(G.lessMotion ? 2.3 : 3.8, u => entrance(OPENING_KLO_HOLD + u * (1 - OPENING_KLO_HOLD)));
        entrance(1);
        picHero._action = 'nod'; picHero._actionT = 0;
        picKlo.react(t);
        setPhase('klo-ready');
        await ui.say([STORY.prolog.kloResearch]);
        // he keeps writing while Alva draws
        picKlo.setPose('notebook'); picHero._emote = null;
        if (G.lessMotion) { closeFrame = 0; layout(); }
        else await tween(1.2, u => { closeFrame = 1 - u * u * (3 - 2 * u); layout(); });
        kloFrame = 0;
        // three strokes in the margin, outside her finished picture
        const gullGeometry = () => ({
            ghost: ghostM(880, 150, 0.9).map(([x, y]) => toCss(x, y)),
            bounds: paperBounds(790, 70, 190, 160)
        });
        setPhase('drawing-gull');
        const gullPts = await ui.draw({ prompt: UI.drawGull, ...gullGeometry(), getGeometry: gullGeometry, color: '#4d6e8c' });
        const gull = strokeTexture(gullPts, { color: '#4d6e8c' });
        G.userGull = gull.texture; G.userStrokes = { gull: gull.pts };
        const gs = new PIXI.Sprite(gull.texture); gs.x = gull.box.x; gs.y = gull.box.y; gs.scale.set(0.5); onPaper.addChild(gs);
        audio?.sfx('gull');
        await tween(G.lessMotion ? .4 : 1.8, (u) => {
            const travel = G.lessMotion ? 1 : u;
            gs.x = gull.box.x - travel * 260; gs.y = gull.box.y - travel * 120 + (G.lessMotion ? 0 : Math.sin(u * 12) * 10);
            gs.alpha = G.lessMotion ? Math.sin(u * Math.PI) : 1 - Math.max(0, u - 0.7) / 0.3;
            lookAtPaper(gs.x, gs.y);
        });
        // The cloud is authored in paper units, just like the gull. Applying
        // the paper transform to every point keeps its start inside a portrait
        // phone and prevents an oversized cloud in the finished picture.
        const cloudGeometry = () => ({
            ghost: ghostCloud(885, 330).map(([x, y]) => toCss(885 + (x - 885) * 0.85, 330 + (y - 330) * 0.85)),
            bounds: paperBounds(790, 250, 190, 160)
        });
        let cloudColor = 'sky';
        setPhase('drawing-cloud');
        const cloudPts = await ui.draw({ prompt: UI.drawCloud, ...cloudGeometry(), getGeometry: cloudGeometry,
            palette: CLOUD_PENCILS.map(p => ({ ...p, label: DRAWING.cloudColors[p.id] })), selectedColor: cloudColor,
            onColor: value => { cloudColor = value; }, paintDraft: paintUserCloud });
        const cloud = createUserCloud(PIXI, cloudPts.map(([x, y]) => [(x - paperLayer.x) / paperLayer.scale.x, (y - paperLayer.y) / paperLayer.scale.y]), cloudColor);
        G.userCloud = cloud.texture; G.userStrokes.cloud = cloud.pts; G.userStrokes.cloudColor = cloud.color;
        const cs = new PIXI.Sprite(cloud.texture); cs.label = 'opening-user-cloud';
        cs.scale.set(Math.min(.5, 210 / cloud.texture.width, 106 / cloud.texture.height)); onPaper.addChild(cs);
        // The new cloud settles in the retained blue sky, below the sun's rays
        // and to the left of the future crease. It must never hang over wood.
        const cloudHome = { x: PIC.x + 55, y: PIC.y + 180 };
        await tween(G.lessMotion ? .3 : 1.45, (u) => {
            const e = u * u * (3 - 2 * u);
            cs.position.set(G.lessMotion ? cloudHome.x : lerp(cloud.box.x, cloudHome.x, e),
                G.lessMotion ? cloudHome.y : lerp(cloud.box.y, cloudHome.y, e));
            cs.alpha = G.lessMotion ? e : 1;
            lookAtPaper(cs.x + cs.width / 2, cs.y + cs.height / 2);
        });
        picHero._look = null;
        // He was too mesmerised to introduce himself; now he remembers.
        picKlo.setPose('happy'); picKlo.react(t);
        await ui.say([STORY.prolog.kloIntro, STORY.prolog.klo2]);
        picKlo.setPose('point');
        // the shoreline, traced along generous anchors from the picture's edge; the crease cuts it short
        await ui.say([STORY.prolog.shoreInvite]);
        // The line starts exactly where the wave's crest meets the sea at the
        // picture's edge and runs level on the sea's own height.
        const [shoreStart] = worldToPaper(wave.shoreX, 0);
        const shoreGeometry = () => ({ anchors: Array.from({ length: 6 }, (_, i) => toCss(shoreStart + i * 40, waterY)) });
        setPhase('shoreline');
        const shoreline = await ui.draw({ prompt: UI.drawShore, ...shoreGeometry(), getGeometry: shoreGeometry, stopAt: 3, width: 4, color: '#244f8f', dotRadius: 11 });
        // Keep exactly the authored points after the DOM drawing overlay closes.
        // They remain on the surviving part of the sheet, up to the new crease.
        // The core line is the exact path; a lighter pencil pass gives it grain.
        const line = shoreline.map(([x, y]) => [(x - paperLayer.x) / paperLayer.scale.x, (y - paperLayer.y) / paperLayer.scale.y]);
        shore.moveTo(...line[0]); for (const point of line.slice(1)) shore.lineTo(...point);
        shore.stroke({ width: 3.2, color: 0x244f8f, alpha: .95, cap: 'round', join: 'round' });
        pencilPath(shore, line, [{ width: 1.3, color: 0x4f7fb8, alpha: .5, jitter: .8 }, { width: 5, color: 0x9fc2e2, alpha: .18 }]);
        await crease(line.at(-1));
        // one drop rolls upward over the paper
        const d = sprite('p-drop'); d.x = sx + 30; d.y = sy - 60; d.scale.set(0.9); onPaper.addChild(d); drops.push({ s: d, y0: sy - 60, t: 0 });
        await wait(G.lessMotion ? .6 : 1.0);
        picHero._emote = 'surprised'; picHero._look = { x: G.scenes.land.spots.splash.x, y: G.scenes.land.spots.splash.y };
        picHero._action = 'stamp'; picHero._actionT = 0;
        picKlo.setPose('stopwatch');
        audio?.sfx('snort');
        await wait(0.7);
        setPhase('frozen');
        await ui.say([STORY.prolog.stuck]);
        setPhase('question');
        const question = await ui.choice([UI.choiceWhat, UI.choiceWho]);
        picHero._emote = null;
        await ui.say([question === 1 ? STORY.prolog.choiceWhoAnswer : STORY.prolog.choiceWhatAnswer,
            STORY.prolog.promise, STORY.prolog.mystery]);
        // The playable beach keeps this exact frozen moment: the same drops hang.
        if (wave) G.stuckWaveClock = wave.clock;
        // dive into the page
        setPhase('enter-picture');
        await dive();
        running = false;
        stop();
        // The crab we just met steps onto this same beach. The first gameplay
        // beat can lead him inland without replaying his entrance.
        Object.assign(G.actors.klo, { scene: 'land', visible: true, x: kloX, y: kloY,
            pose: 'stopwatch', facing: -1, pop: 0, inHole: false, walk: null,
            vx: 0, holding: null, talking: false });
        G.flag('intro_done');
    }

    function snapStand() {
        const st = G.scenes.land.spots.start;
        return { x: st.x, y: st.y, facing: 1, gait: 'stand', mode: 'ground', speed: 0, vx: 0, vy: 0, hide: 0, time: 0, groundAt: () => st.y };
    }

    /** Run fn(dt) every frame until it returns true (cancelled with the table). */
    function run(fn) {
        return new Promise((resolve) => {
            if (destroyed) return;
            let last = performance.now(), raf = 0;
            const cancel = () => cancelAnimationFrame(raf);
            pending.add(cancel);
            const step = () => {
                if (destroyed) return;
                const now = performance.now(), dt = Math.min(.1, (now - last) / 1000);
                last = now;
                if (fn(dt)) { pending.delete(cancel); resolve(); } else raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
        });
    }

    // --- Alva's notes -------------------------------------------------------------------------
    async function playNotes() {
        const text = HER_TEXT.full || JOURNAL.fieldFallback;
        if (!text || !picHero) return false;
        const less = () => !!G.lessMotion;
        if (document.fonts?.load) await Promise.race([document.fonts.load('24px "Patrick Hand"'), wait(1.5)]).catch(() => {});
        notes = createOpeningNotes(PIXI, { texture: T, heading: JOURNAL.field, text, makeHero, reducedMotion: less });
        table.addChildAt(notes.dim, table.getChildIndex(paperLayer));
        table.addChild(notes.container);
        notesFrame = 1; layout();
        setPhase('notes');
        // A blank page: her world and her creature appear as she writes about them.
        const reveals = [];
        const reveal = (target, rect, parent) => {
            const r = createScribbleReveal(PIXI, rect, { rows: rect.h > 200 ? 8 : 6 });
            parent.addChild(r.mask); target.mask = r.mask; r.set(0);
            const item = { r, target, u: 0, dur: 0, on: false };
            reveals.push(item);
            return item;
        };
        const hb = picHero.view.getLocalBounds(), hs = picHero.view.scale.x;
        const creature = reveal(picHero.view, { x: picHero.view.x + hb.minX * hs - 8, y: picHero.view.y + hb.minY * hs - 8,
            w: (hb.maxX - hb.minX) * hs + 16, h: (hb.maxY - hb.minY) * hs + 16 }, onPaper);
        const world = reveal(pic, { x: PIC.x, y: PIC.y, w: PIC.w, h: PIC.h }, sheet);
        const margin = canvasLife ? reveal(canvasLife.container, { x: PIC.x + PIC.w - 4, y: PIC.y, w: PW - PIC.x - PIC.w, h: PIC.h }, sheet) : null;
        const colour = (item, dur) => { item.on = true; item.dur = less() ? .35 : dur; };
        const finishReveals = () => {
            for (const item of reveals) {
                item.target.mask = null; item.r.mask.destroy();
            }
            reveals.length = 0;
        };
        pending.add(finishReveals);
        // Tap or Enter hurries her pencil; "Hoppa över" (or Esc) skips to the picture.
        const hold = { hurry: false, skip: false };
        const ac = new AbortController();
        const skipBtn = document.createElement('button');
        skipBtn.type = 'button'; skipBtn.className = 'sk-pbtn sk-notes-skip'; skipBtn.textContent = UI.notesSkip;
        skipBtn.addEventListener('click', (e) => { e.stopPropagation(); hold.skip = true; }, { signal: ac.signal });
        window.addEventListener('pointerdown', (e) => { if (e.target !== skipBtn) hold.hurry = true; }, { signal: ac.signal });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { hold.hurry = true; e.preventDefault(); }
            else if (e.key === 'Escape') hold.skip = true;
        }, { signal: ac.signal, capture: true });
        const endNotes = () => { ac.abort(); skipBtn.remove(); };
        pending.add(endNotes);
        // the reveals and bubbles run on their own clock beside the writing
        let live = true;
        run((dt) => {
            for (const item of reveals) if (item.on && item.u < 1) { item.u = Math.min(1, item.u + dt / item.dur); item.r.set(item.u * item.u * (3 - 2 * item.u)); }
            return !live;
        });
        const span = (dur, fn) => { let u = 0; return run((dt) => { u = hold.skip ? 1 : Math.min(1, u + dt / dur); fn(u); return u >= 1; }); };
        const pause = (s) => { let t0 = 0; hold.hurry = false; return run((dt) => { t0 += dt; return t0 >= s || hold.hurry || hold.skip; }).then(() => { hold.hurry = false; }); };

        // 1. Into her head: the room fades, a thought, her notebook.
        ui.caption(STORY.prolog.thinking, 2600);
        await span(less() ? .3 : 1.2, (u) => notes.setDim(u));
        await pause(less() ? .6 : 1.1);
        ui.root.append(skipBtn);
        audio?.sfx('page', { gain: .6 });
        await span(less() ? .3 : .9, (u) => notes.setCard(u));
        await span(.35, (u) => notes.setPencil(u));
        notes.setWriting(true);
        audio?.sfx('write', { gain: .5 });
        await span(less() ? .2 : .9, (u) => notes.setHeading(u));
        notes.setWriting(false);
        await pause(.4);

        // 2. Her words, one sentence at a time; each image appears as its word is written.
        const heroCss = () => {
            const [x, y] = toCss(picHero.view.x, picHero.view.y - 120 * picHero.view.scale.y);
            return [x, y, 90 * picHero.view.scale.x * paperLayer.scale.x];
        };
        const region = () => notes.region;
        const bubbleAt = (fx, fy) => { const r = region(); return [r.x + r.w * fx, r.y + r.h * fy]; };
        const size = () => { const r = region(); return Math.max(46, Math.min(r.w * .2, r.h * .28)); };
        const kloSpot = worldToPaper(G.scenes.land.spots.start.x - h(.86), G.scenes.land.spots.start.y);
        const actions = {
            creature: () => { colour(creature, 1.6); audio?.sfx('colorin', { gain: .6 }); },
            sparkle: () => { const [x, y, r] = heroCss(); notes.sparkle(x, y, r); audio?.sfx('sparkle'); },
            world: () => { colour(world, 2.6); if (margin) colour(margin, 2.6); audio?.sfx('colorin', { gain: .5 }); },
            steppe: () => { notes.bubble('steppe', notes.tip(), bubbleAt(.26, .24), size()); audio?.sfx('pop', { gain: .25 }); audio?.sfx('hoof', { gain: .2 }); },
            kelp: () => { notes.bubble('kelp', notes.tip(), bubbleAt(.74, .26), size()); audio?.sfx('bubble', { gain: .35 }); },
            mystery: () => { notes.clearBubbles(); notes.bubble('mystery', notes.tip(), bubbleAt(.5, .22), size() * 1.1); audio?.sfx('pop', { gain: .3 }); },
            researcher: () => {
                notes.clearBubbles();
                notes.bubble('researcher', notes.tip(), bubbleAt(.66, .22), size());
                audio?.sfx('pop', { gain: .3 });
                let u = 0;
                run((dt) => { u = Math.min(1, u + dt / .6); notes?.underline('researcher', u); return u >= 1 || !notes; });
                // someone stirs in the sand behind her sköldhäst
                stirSand(kloSpot);
            }
        };
        const fired = new Set();
        const fire = (n) => { for (const c of notes.cues) if (c.at <= n && !fired.has(c.cue)) { fired.add(c.cue); actions[c.cue]?.(); } };
        const CPS = 22, PAUSES = [1.3, 2.4, 2.2, 2.4];
        for (let i = 0; i < notes.sentences.length && !hold.skip; i++) {
            const from = i ? notes.sentenceEnds[i - 1] + 1 : 0, to = notes.sentenceEnds[i];
            setPhase('notes');
            table.notesSentence = i;
            hold.hurry = false;
            notes.setWriting(true);
            let n = from, sound = from;
            await run((dt) => {
                if (hold.skip) return true;
                n = hold.hurry || less() ? to : Math.min(to, n + dt * CPS);
                notes.setRevealed(n);
                fire(n);
                if (n - sound > 7) { sound = n; audio?.sfx('pencil', { len: .25, gain: .5 }); }
                return n >= to;
            });
            notes.setWriting(false);
            if (hold.skip) break;
            await pause((less() ? 1.3 : 1) * (PAUSES[i] ?? 2));
        }

        // 3. Out of her head, into her picture: exactly as she imagines it.
        setPhase('notes-end');
        notes.setRevealed(notes.length); fire(notes.length);
        for (const item of reveals) { item.on = true; item.u = 1; item.r.set(1); }
        live = false;
        finishReveals(); pending.delete(finishReveals);
        endNotes(); pending.delete(endNotes);
        notes.clearBubbles();
        hold.skip = false;
        audio?.stinger('discovery');
        await span(less() ? .3 : .9, (u) => { notes.setPencil(1 - u); notes.setCard(1 - u); notes.setDim(1 - u); });
        // "exactly as she imagines it": read while the camera goes into her picture
        ui.caption(STORY.prolog.wakeCaption, 3600);
        if (less()) { notesFrame = 0; layout(); }
        else await span(1.5, (u) => { notesFrame = 1 - ease(u); layout(); });
        notes.destroy(); notes = null; notesFrame = 0; layout();
        table.notesSentence = undefined;
        await wait(less() ? .8 : 1.2);
        return true;
    }
    /** A few grains of sand hop where Klo is still asleep. */
    function stirSand([x, y]) {
        const grains = Array.from({ length: 6 }, (_, i) => {
            const g = new PIXI.Graphics().poly([-1.2, 0, .5, -1.4, 2.1, .1, .3, .9]).fill({ color: i % 2 ? 0xc2a268 : 0x977650 });
            g.position.set(x - 8 + i * 3.2, y); onPaper.addChild(g);
            return g;
        });
        let u = 0;
        run((dt) => {
            u = Math.min(1, u + dt / 1.1);
            grains.forEach((g, i) => { const k = Math.max(0, Math.min(1, u * 1.6 - i * .1)); g.y = y - Math.sin(Math.PI * k) * (4 + i % 3 * 2); g.alpha = 1 - Math.max(0, u - .7) / .3; });
            if (u >= 1) for (const g of grains) g.destroy();
            return u >= 1;
        });
    }

    async function crease(endpoint) {
        setPhase('fold-anticipation');
        // A distant measuring glint settles on the new stroke before the same
        // ruler edge approaches. The gesture is visible; its motive is not.
        await tween(G.lessMotion ? .5 : 1.15, u => canvasLife?.setMeasure(u * u * (3 - 2 * u)));
        const front = PIXI.RenderTexture.create({ width: PW, height: PH, resolution: 1 });
        // Render an unattached copy: promoting the live sheet to a render root
        // would invalidate its inherited transform and the mask added next.
        const copy = new PIXI.Container();
        const printed = new PIXI.Sprite(pic.texture); printed.position.set(PIC.x, PIC.y);
        copy.addChild(new PIXI.Graphics(paper.context), printed);
        // Move this unmasked child just for the synchronous capture, before
        // installing the sheet mask; never promote the live sheet to a root.
        const canvasIndex = canvasLife ? sheet.getChildIndex(canvasLife.container) : -1;
        if (canvasLife) copy.addChild(canvasLife.container);
        copy.addChild(new PIXI.Graphics(shore.context));
        app.renderer.render({ container: copy, target: front, clear: true });
        if (canvasLife) sheet.addChildAt(canvasLife.container, canvasIndex);
        copy.destroy({ children: true });
        openingFold = createOpeningFold(PIXI, { parent: paperLayer, sheet, front,
            paper: T('mat-paper'), width: PW, height: PH, endpoint });
        // Live characters and droplets stay in front of the paper they inhabit.
        paperLayer.setChildIndex(onPaper, paperLayer.children.length - 1);
        const ruler = new PIXI.Graphics(); ruler.label = 'opening-ruler';
        ruler.roundRect(-8, -160, 23, 330, 2).fill({ color: 0xb7ac86, alpha: .9 });
        ruler.roundRect(-8, -160, 23, 330, 2).stroke({ width: 2, color: 0x655846, alpha: .8 });
        for (let i = -150; i <= 150; i += 15) ruler.moveTo(-7, i).lineTo(i % 30 ? 0 : 5, i).stroke({ width: 1.5, color: 0x655846 });
        ruler.rotation = -Math.atan2(openingFold.crease.b[0] - openingFold.crease.a[0], PH);
        const rulerX = endpoint[0] - (openingFold.crease.b[0] - openingFold.crease.a[0]) / PH * 90;
        onPaper.addChild(ruler);
        const from = canvasLife?.landmarks.light || { x: rulerX + 220, y: endpoint[1] - 90 };
        await tween(G.lessMotion ? .25 : .9, (u) => {
            const e = u * u * (3 - 2 * u);
            ruler.position.set(lerp(from.x, rulerX, e), lerp(from.y, endpoint[1] - 90, e));
            ruler.scale.set(G.lessMotion ? 1 : lerp(.08, 1, e));
            ruler.alpha = e;
        });
        ui.caption(STORY.prolog.foldCaption);
        audio?.sfx('rustle');
        setPhase('folding');
        await tween(G.lessMotion ? .6 : 2.1, (u) => {
            const e = u * u * (3 - 2 * u);
            openingFold.set(e, { lessMotion: !!G.lessMotion });
            ruler.x = rulerX + Math.max(0, (u - .25) / .75) * 230;
            ruler.alpha = Math.max(0, 1 - u * 2);
            // The freeze happens at the visible fold, never before its cause:
            // the wave slows to a stop in mid-air and a pencil outlines it.
            if (u >= (G.lessMotion ? .5 : .45) && !frozen) {
                frozen = true; wave?.freeze(); audio?.freeze(true); audio?.stinger('freeze');
            }
        });
        ruler.destroy();
        // the pencil pressed where the fold interrupted it
        shore.circle(...endpoint, 2.6).fill({ color: 0x244f8f, alpha: .9 });
        ui.caption(STORY.prolog.afterFreezeCaption);
        setPhase('folded');
        await wait(.7);
    }

    async function dive() {
        audio?.stinger('reveal');
        const st = G.scenes.land.spots.start;
        const [hx, hy] = worldToPaper(st.x, st.y - h(0.6));
        const s0 = paperLayer.scale.x, x0 = paperLayer.x, y0 = paperLayer.y;
        const W = app.screen.width, H = app.screen.height;
        await tween(G.lessMotion ? .35 : 1.3, (u) => {
            const e = u * u * (3 - 2 * u);
            const s = s0 * (1 + (G.lessMotion ? 0 : e * 3.2));
            paperLayer.scale.set(s);
            paperLayer.x = G.lessMotion ? x0 : lerp(x0, W / 2 - hx * s, e);
            paperLayer.y = G.lessMotion ? y0 : lerp(y0, H / 2 - hy * s, e);
            table.alpha = G.lessMotion ? 1 - e : 1 - Math.max(0, (u - 0.72) / 0.28);
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
    function ease(u) { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); }

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
            running = false; stop(); wakeStroke.destroy(); table.destroy({ children: true });
        }
    };
}
