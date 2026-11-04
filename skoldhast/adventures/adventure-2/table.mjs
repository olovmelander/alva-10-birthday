/*
 * Äventyr 2 – Alva's table: the new page is drawn (prologue) and looked at again (epilogue).
 *
 *   const table = createTable({ PIXI, app, assets, ui, audio, G, heroFactory });
 *   const { cloud } = await table.prologue();   // cloud: Mira's drawn cloud ({ texture, pts, color }) or null
 *   await table.epilogue();
 *   table.tick(dt) each frame while it is shown; table.opaque says whether it covers the world.
 *
 * Alva and Mira are heard and their pencils seen, never their faces (plan §3.2).
 * Alva's pencil draws the tukankrabba and her ten eggs; Mira's lilac pencil the
 * forest, the river and the half-finished rope bridge, and then (the player)
 * the little cloud. Everything is drawn in code with Adventure 1's pencil tiles.
 */
import { pencilStyle, pencilPixi } from '../../src/pencil-style.mjs';
import { createKlo } from '../../src/klo.mjs';
import { createUserCloud, paintUserCloud, CLOUD_PENCILS } from '../../src/user-cloud.mjs';
import { createTukan, createNest, createEgg, createHatchling, createCloud, createHearts } from './characters.mjs';
import { TABLE, WORDS } from './content/sv.mjs';
import { DRAWING } from '../../src/content/sv.mjs';

const PAGE_W = 1000, PAGE_H = 667;
const MIRA = 0x8a6cc0, MIRA_CSS = '#8a6cc0';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };

export function createTable({ PIXI, app, assets, ui, audio, G, heroFactory }) {
    const T = (name) => assets.tex(name);
    const pen = pencilStyle(T);
    const RAW = PIXI;
    PIXI = pencilPixi(PIXI, T);
    const root = new RAW.Container(); root.label = 'a2-table'; root.visible = false;
    app.stage.addChild(root);
    const desk = new RAW.TilingSprite({ texture: T('desk-wood') || RAW.Texture.WHITE, width: 100, height: 100 });
    if (!T('desk-wood')) desk.tint = 0x9a7550;
    const windowArt = new RAW.Sprite(T('window-dusk') || RAW.Texture.EMPTY); windowArt.anchor.set(0.5, 0);
    const pencils = new RAW.Sprite(T('pencils-lying') || RAW.Texture.EMPTY); pencils.anchor.set(0.5);
    const page = new PIXI.Container(); page.label = 'page';
    const veil = new RAW.Graphics(); // fades between the table and the world
    root.addChild(desk, windowArt, pencils, page, veil);
    let tweens = [], opaque = false, veilAlpha = 0, shown = false, layoutDirty = true;
    let t = 0;
    let pageScale = 1, pageX = 0, pageY = 0;

    // --- a tween clock of its own (the world is not stepping while the table shows) ----------
    function tween(sec, fn) {
        const dur = G.lessMotion ? Math.min(sec, 0.35) : sec;
        return new Promise(resolve => tweens.push({ t: 0, dur: Math.max(0.001, dur), fn, resolve }));
    }
    const wait = (sec) => tween(sec, () => {});

    function layout() {
        const W = app.screen.width, H = app.screen.height;
        desk.width = W; desk.height = H;
        const portrait = H > W * 1.15;
        const pw = Math.min(W * 0.94, (H * (portrait ? 0.5 : 0.78)) * (PAGE_W / PAGE_H));
        pageScale = pw / PAGE_W;
        pageX = (W - pw) / 2; pageY = portrait ? H * 0.1 : Math.max(10, (H * 0.78 - pw * PAGE_H / PAGE_W) / 2);
        page.position.set(pageX + zoom.ox, pageY + zoom.oy); page.scale.set(pageScale * zoom.s);
        windowArt.visible = mode === 'epilogue';
        windowArt.scale.set(Math.min(W / 906, H / 626) * (portrait ? 0.7 : 0.42));
        windowArt.position.set(W * (portrait ? 0.5 : 0.82), portrait ? pageY + pw * PAGE_H / PAGE_W + 12 : 8);
        pencils.scale.set(Math.min(1, W / 1400) * 0.7);
        pencils.position.set(W * 0.12, H - 60);
        pencils.visible = !portrait;
        layoutDirty = false;
    }
    const zoom = { s: 1, ox: 0, oy: 0 };
    let mode = 'prologue';

    // --- the page and its drawings ---------------------------------------------------------
    let D = null;
    function revealer(node, dir = 1) {
        // a drawing appears behind the pencil, left to right
        const b = node.getLocalBounds();
        const m = new RAW.Graphics();
        node.parent.addChild(m);
        node.mask = m;
        const set = (u) => {
            m.clear();
            const w = (b.width + 40) * clamp(u, 0, 1);
            m.rect(dir > 0 ? b.x - 20 : b.x + b.width + 20 - w, b.y - 40, w, b.height + 80).fill(0xffffff);
            m.position.copyFrom(node.position); m.scale.copyFrom(node.scale);
        };
        set(0);
        return { set, done() { node.mask = null; m.destroy(); }, bounds: b };
    }
    function buildPage() {
        page.removeChildren().forEach(c => c.destroy({ children: true }));
        const sheet = new PIXI.Graphics();
        sheet.rect(8, 10, PAGE_W, PAGE_H).fill({ color: 0x3b2a1c, alpha: 0.25 });
        sheet.rect(0, 0, PAGE_W, PAGE_H).fill(pen.material('mat-paper', 1, 0xfbf8f1)).stroke(pen.line(0x8d806a, 2));
        for (let y = 60; y < PAGE_H; y += 44) sheet.moveTo(20, y).lineTo(PAGE_W - 20, y).stroke(pen.line(0x9aa7af, 1, 0.25));
        sheet.moveTo(70, 0).lineTo(70, PAGE_H).stroke(pen.line(0xd38a8a, 1.2, 0.4));
        page.addChild(sheet);
        const night = new PIXI.Graphics(); night.rect(0, 0, PAGE_W, PAGE_H).fill({ color: 0x232845 }); night.alpha = 0;
        // Mira's forest and river
        const forest = new PIXI.Container();
        const fg = new PIXI.Graphics();
        fg.rect(330, 500, 330, 30).fill(pen.hatch(0xe6d2a2, 0.95));
        fg.moveTo(330, 500).lineTo(660, 500).stroke(pen.line(0x9a8460, 2));
        fg.moveTo(640, 505).quadraticCurveTo(800, 480, 1000, 500).lineTo(1000, 640).lineTo(640, 640).closePath().fill(pen.hatch(0x6f9fc4, 0.95));
        for (let k = 0; k < 4; k++) fg.moveTo(680 + k * 70, 540 + (k % 2) * 30).quadraticCurveTo(700 + k * 70, 532 + (k % 2) * 30, 720 + k * 70, 540 + (k % 2) * 30).stroke(pen.line(0x3f6f8e, 2, 0.8));
        fg.moveTo(0, 500).lineTo(330, 500).stroke(pen.line(MIRA, 2.4));
        fg.rect(0, 500, 330, 30).fill(pen.hatch(0x7f9a5c, 0.9));
        for (const [x, s] of [[110, 1.1], [215, 0.85], [905, 1], [960, 0.75], [600, 0.7]]) {
            fg.moveTo(x - 8 * s, 500).lineTo(x - 5 * s, 330 + (1 - s) * 120).lineTo(x + 5 * s, 330 + (1 - s) * 120).lineTo(x + 8 * s, 500).closePath().fill(pen.hatch(0x8a6a45, 0.95));
            fg.circle(x, 300 + (1 - s) * 120, 70 * s).fill(pen.hatch(0x4f7c50, 0.95)).stroke(pen.line(MIRA, 2.2, 0.9));
            fg.circle(x - 40 * s, 340 + (1 - s) * 120, 44 * s).fill(pen.hatch(0x3d6a45, 0.9)).stroke(pen.line(MIRA, 2, 0.9));
            fg.circle(x + 44 * s, 336 + (1 - s) * 120, 40 * s).fill(pen.hatch(0x5f8a4c, 0.9)).stroke(pen.line(MIRA, 2, 0.9));
        }
        // the bridge she did not finish: dashed
        for (let x = 128; x < 205; x += 14) fg.moveTo(x, 452 + Math.sin((x - 128) / 77 * Math.PI) * 10).lineTo(x + 7, 452 + Math.sin((x + 7 - 128) / 77 * Math.PI) * 10).stroke(pen.line(MIRA, 4));
        forest.addChild(fg);
        page.addChild(forest);
        // Alva's tukankrabba, her nest and ten eggs
        const alva = new PIXI.Container();
        const nest = createNest(PIXI, pen); nest.view.position.set(540, 512); nest.view.scale.set(1.15);
        const eggs = [];
        for (let i = 0; i < 10; i++) {
            const e = createEgg(PIXI, pen, 0.8); e.view.position.set(-54 + i * 12, -6 - (i % 2) * 6);
            nest.eggs.addChild(e.view); eggs.push({ e, flight: null });
        }
        const tukan = createTukan(PIXI, pen); tukan.view.position.set(410, 506); tukan.view.scale.set(1.25);
        alva.addChild(nest.view, tukan.view);
        page.addChild(alva);
        const hatch = [];
        for (let i = 0; i < 10; i++) { const k = createHatchling(PIXI, pen); k.view.position.set(470 + i * 16, 512); k.view.scale.set(1.1); k.view.visible = false; alva.addChild(k.view); hatch.push(k); }
        // the sky: Mira's cloud goes here, the moon in the epilogue
        const sky = new PIXI.Container(); page.addChild(sky);
        page.addChild(night);
        const rain = new PIXI.Graphics(); page.addChild(rain);
        const flash = new RAW.Graphics(); flash.rect(0, 0, PAGE_W, PAGE_H).fill({ color: 0xffffff }); flash.alpha = 0; page.addChild(flash);
        const actors = new RAW.Container(); page.addChild(actors);
        // the pencils that draw
        const alvaPencil = new RAW.Sprite(T('alva-pencil') || RAW.Texture.EMPTY); alvaPencil.anchor.set(0.02, 0.92); alvaPencil.scale.set(0.42); alvaPencil.visible = false;
        const miraPencil = new PIXI.Graphics();
        miraPencil.poly([0, 0, 22, -10, 260, -118, 270, -96, 32, 12]).fill(pen.fill(0xa98ad0)).stroke(pen.line(0x5e4a7d, 2));
        miraPencil.poly([0, 0, 22, -10, 32, 12]).fill(pen.fill(0xf3e3c4)).stroke(pen.line(0x5e4a7d, 1.5));
        miraPencil.poly([0, 0, 8, -4, 10, 5]).fill({ color: 0x3b3530 });
        miraPencil.visible = false;
        page.addChild(alvaPencil, miraPencil);
        D = { forest, alva, tukan, nest, eggs, hatch, sky, night, rain, flash, actors, alvaPencil, miraPencil, cloud: null, moon: null, hero: null, klo: null, kloRig: null, hearts: null };
    }

    function pencilAt(which, x, y) {
        const p = which === 'alva' ? D.alvaPencil : D.miraPencil;
        D.alvaPencil.visible = which === 'alva'; D.miraPencil.visible = which === 'mira';
        p.position.set(x, y);
    }
    function hidePencils() { D.alvaPencil.visible = D.miraPencil.visible = false; }
    async function drawIn(node, who, sec, { y = null } = {}) {
        const r = revealer(node);
        const b = r.bounds;
        audio?.sfx?.('pencil', { len: Math.min(1.2, sec) });
        await tween(sec, (u) => {
            r.set(u);
            const x = node.x + (b.x + b.width * u) * node.scale.x;
            const yy = y ?? node.y + (b.y + b.height * (0.35 + 0.3 * Math.sin(u * 18))) * node.scale.y;
            pencilAt(who, x, yy);
        });
        r.done(); hidePencils();
    }

    function toCss(x, y) { return [pageX + x * pageScale, pageY + y * pageScale]; }
    function ghostCloud() {
        const pts = [];
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 14) {
            const r = 1 + 0.18 * Math.sin(a * 5);
            pts.push(toCss(760 + Math.cos(a) * 120 * r, 150 + Math.sin(a) * 58 * r));
        }
        return pts;
    }

    // --- per frame --------------------------------------------------------------------------
    function tick(dt) {
        if (!shown) return;
        t += dt;
        if (layoutDirty || app.screen.width !== desk.width || app.screen.height !== desk.height) layout();
        page.position.set(pageX + zoom.ox, pageY + zoom.oy); page.scale.set(pageScale * zoom.s);
        for (const tw of tweens.slice()) {
            tw.t += dt;
            const u = Math.min(1, tw.t / tw.dur);
            tw.fn(u);
            if (u >= 1) { tweens.splice(tweens.indexOf(tw), 1); tw.resolve(); }
        }
        if (!D) return;
        const rm = !!G.lessMotion;
        D.tukan.update(dt, D.tukanActor, t, { reducedMotion: rm });
        D.eggs.forEach(({ e }) => e.update(dt, t, {}));
        D.hatch.forEach((k, i) => k.update(dt, t, { facing: Math.sin(t * 0.7 + i) > 0 ? 1 : -1, reducedMotion: rm }));
        if (D.cloudRig) D.cloudRig.update(dt, D.cloudActor, t, { reducedMotion: rm, storm: D.storm || 0 });
        D.rain.clear();
        if (D.storm > 0.05) {
            for (let i = 0; i < 40; i++) {
                const x = (i * 97 + t * (rm ? 30 : 140)) % PAGE_W, y = (i * 53 + t * (rm ? 120 : 520)) % PAGE_H;
                D.rain.moveTo(x, y).lineTo(x - 6, y + 22);
            }
            D.rain.stroke(pen.line(0xc9d6ee, 2, 0.55 * D.storm));
        }
        if (D.hero) {
            const s = D.heroState; s.time = t;
            D.hero.update(dt, s);
            D.hero.view.position.set(s.x, s.y);
        }
        if (D.kloRig) D.kloRig.update(D.kloActor, { time: t, dt, talking: G.speaker === 'klo', reducedMotion: rm });
        if (D.hearts) D.hearts.update(dt, t, true, { reducedMotion: rm });
        D.flash.alpha = Math.max(0, D.flash.alpha - dt * 3);
        veil.clear();
        if (veilAlpha > 0) veil.rect(0, 0, app.screen.width, app.screen.height).fill({ color: 0xfbf8f1, alpha: veilAlpha });
        opaque = veilAlpha < 0.98 ? root.visible && !fadingToWorld : false;
    }
    let fadingToWorld = false;

    function show() {
        shown = true; root.visible = true; layoutDirty = true;
        t = 0; zoom.s = 1; zoom.ox = zoom.oy = 0; veilAlpha = 0; fadingToWorld = false;
        buildPage(); layout();
        D.tukanActor = { visible: true, x: 410, y: 506, facing: 1, pose: 'idle', vx: 0, distance: 0 };
    }
    function hide() {
        shown = false; root.visible = false; opaque = false;
        tweens.forEach(tw => tw.resolve()); tweens = [];
        page.removeChildren().forEach(c => c.destroy({ children: true }));
        D = null;
    }

    function lightning() {
        if (!D) return;
        D.flash.alpha = G.lessMotion ? 0.15 : 0.6;
        D.cloudRig?.flash();
        audio?.sfx?.('thud', { gain: 0.6 });
    }

    // --- the prologue ---------------------------------------------------------------------------
    async function prologue() {
        mode = 'prologue';
        show();
        D.forest.alpha = 1; D.alva.alpha = 1;
        D.forest.visible = false; D.alva.visible = false;
        audio?.setArea?.('table');
        await wait(0.6);
        ui.caption(TABLE.newPage, 2600);
        await wait(1.2);
        await ui.say([TABLE.ask, TABLE.yes]);
        // Alva draws the tukankrabba and her nest; the player draws the first egg with Alva's pencil
        for (const { e } of D.eggs) e.view.visible = false;
        D.alva.visible = true;
        await drawIn(D.alva, 'alva', 2.6);
        ui.caption(TABLE.alvaDraws, 3200);
        await wait(1.2);
        const eggGeometry = () => {
            const [cx, cy] = toCss(660, 380), rx = Math.max(38, 64 * pageScale), ry = rx * 1.3;
            const anchors = [];
            for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI * 2; anchors.push([cx + Math.cos(a) * rx * (Math.sin(a) > 0 ? 1 : 0.86), cy + Math.sin(a) * ry]); }
            return { anchors };
        };
        await ui.draw({ prompt: WORDS.drawEgg, ...eggGeometry(), getGeometry: eggGeometry, color: '#4f7c3c', width: 5, dotRadius: 13 });
        audio?.sfx?.('sparkle');
        for (let i = 0; i < D.eggs.length; i++) { D.eggs[i].e.view.visible = true; await wait(0.12); }
        ui.caption(TABLE.tenEggs, 2600);
        await ui.say([TABLE.alvaFacts]);
        // Mira draws the forest, the river and the bridge
        D.forest.visible = true;
        await drawIn(D.forest, 'mira', 3.0);
        await ui.say([TABLE.miraTrees]);
        ui.caption(TABLE.miraBridge, 3000);
        await wait(1.4);
        await ui.say([TABLE.miraCloud]);
        // the player draws Mira's little cloud, with her pencils
        const geometry = () => ({ ghost: ghostCloud(), bounds: { x: pageX + 600 * pageScale, y: pageY + 60 * pageScale, width: 320 * pageScale, height: 190 * pageScale } });
        let color = 'lavender';
        const pts = await ui.draw({ prompt: WORDS.drawCloud, ...geometry(), getGeometry: geometry,
            palette: CLOUD_PENCILS.map(p => ({ ...p, label: DRAWING.cloudColors[p.id] })), selectedColor: color,
            onColor: v => { color = v; }, paintDraft: paintUserCloud });
        let cloud = null;
        if (pts?.length > 1) {
            // into page units, so the cloud stays the same on any screen
            const local = pts.map(([x, y]) => [(x - pageX) / pageScale, (y - pageY) / pageScale]);
            cloud = createUserCloud(RAW, local, color);
        }
        D.cloudRig = createCloud(PIXI, pen, { texture: cloud?.texture || null });
        D.cloudActor = { visible: true, x: 770, y: 150, pose: 'happy' };
        D.sky.addChild(D.cloudRig.view);
        D.cloudRig.view.scale.set(0.9);
        await ui.say([TABLE.cool, TABLE.evening, TABLE.busy]);
        // the page grows dark, and the little cloud is afraid
        D.cloudActor.pose = 'sad';
        ui.caption(TABLE.dark, 3000);
        await tween(1.6, u => { D.night.alpha = ease(u) * 0.55; D.storm = ease(u); });
        lightning();
        ui.caption(TABLE.cloudFlees, 3200);
        // the frightened cloud drifts off to the mountains on the page's far edge
        await tween(1.8, u => { D.cloudActor.x = 770 + ease(u) * 330; D.cloudActor.y = 150 - ease(u) * 60; });
        D.cloudActor.visible = false;
        ui.caption(TABLE.storm, 3000);
        audio?.sfx?.('wind');
        await wait(0.6);
        // ten eggs blow away like sparks
        D.tukanActor.pose = 'dig';
        const flights = D.eggs.map(({ e }, i) => {
            const from = e.view.getGlobalPosition(); void from;
            const sx = 540 - 54 * 1.15 + i * 12 * 1.15, sy = 500;
            const ang = -Math.PI * (0.15 + 0.7 * (i / 9)), dist = 600 + (i % 3) * 120;
            e.view.parent.removeChild(e.view); D.actors.addChild(e.view);
            return { e, sx, sy, tx: sx + Math.cos(ang) * dist, ty: sy + Math.sin(ang) * dist * 0.6 - 80 };
        });
        await tween(1.6, u => {
            flights.forEach((f, i) => {
                const v = clamp(u * 1.4 - i * 0.04, 0, 1);
                f.e.view.position.set(f.sx + (f.tx - f.sx) * v, f.sy + (f.ty - f.sy) * v - Math.sin(v * Math.PI) * 120);
                f.e.view.rotation = v * 8; f.e.view.alpha = 1 - Math.max(0, v - 0.7) / 0.3;
            });
        });
        lightning();
        await ui.say([TABLE.eggsAway]);
        // the sköldhäst gallops in with Klo
        const hero = heroFactory();
        hero.view.scale.set(0.42);
        D.actors.addChild(hero.view);
        D.hero = hero;
        D.heroState = { x: -120, y: 500, facing: 1, gait: 'gallop', speed: 1200, mode: 'ground', gaitPhase: 0, groundAngle: 0, airT: 0, vx: 1200, vy: 0,
            groundAt: () => 0, submerge: 0, waterY: null, wet: 0, hide: 0, hiddenMode: false, action: null, actionT: 0, time: 0 };
        const klo = createKlo(PIXI, { texture: T });
        klo.container.scale.set(0.5);
        D.actors.addChild(klo.container);
        D.kloRig = klo; D.kloActor = { visible: true, x: -200, y: 500, facing: 1, vx: 0, distance: 0, pose: 'idle' };
        ui.caption(TABLE.gallopIn, 3200);
        audio?.sfx?.('hoof', { surface: 'grass', speed01: 1 });
        await tween(2.2, u => {
            const e = ease(u);
            D.heroState.x = -120 + e * 420; D.heroState.gaitPhase = (D.heroState.gaitPhase + 0.035) % 1;
            D.heroState.speed = D.heroState.vx = u > 0.85 ? 400 : 1200; D.heroState.gait = u > 0.85 ? 'trot' : 'gallop';
            const kx = -200 + e * 420; D.kloActor.distance += Math.abs(kx - D.kloActor.x); D.kloActor.vx = 300; D.kloActor.x = kx;
        });
        D.heroState.gait = 'stand'; D.heroState.speed = D.heroState.vx = 0; D.kloActor.vx = 0;
        await wait(0.5);
        // into the page
        await diveInto(540, 480);
        const result = { cloud };
        return result;
    }

    async function diveInto(px, py) {
        const W = app.screen.width, H = app.screen.height;
        fadingToWorld = false;
        await tween(1.4, u => {
            const e = ease(u);
            zoom.s = 1 + e * 3;
            const cx = pageX + px * pageScale, cy = pageY + py * pageScale;
            zoom.ox = (W / 2 - cx) * e - (zoom.s - 1) * px * pageScale;
            zoom.oy = (H / 2 - cy) * e - (zoom.s - 1) * py * pageScale;
            veilAlpha = Math.max(0, (e - 0.55) / 0.45);
        });
        veilAlpha = 1;
    }

    /** After the dive the veil lifts off the world. */
    async function reveal() {
        fadingToWorld = true;
        page.visible = false; desk.visible = false; pencils.visible = false; windowArt.visible = false;
        await tween(0.8, u => { veilAlpha = 1 - ease(u); });
        hide();
        page.visible = true; desk.visible = true;
    }

    // --- the epilogue -----------------------------------------------------------------------------
    async function epilogue({ cloudTexture = null } = {}) {
        // the world fades to paper, then the table
        mode = 'epilogue';
        show();
        veilAlpha = 1;
        D.night.alpha = 0.12; D.storm = 0;
        D.tukanActor.x = 660; D.tukanActor.facing = -1;
        for (const k of D.hatch) k.view.x += 0; // the hatchlings stay round the nest
        D.cloudRig = createCloud(PIXI, pen, { texture: cloudTexture });
        D.cloudActor = { visible: true, x: 520, y: 120, pose: 'happy' };
        D.sky.addChild(D.cloudRig.view); D.cloudRig.view.scale.set(0.7);
        const moon = new PIXI.Graphics();
        moon.circle(820, 130, 70).fill(pen.fill(0xf8ebb4)).stroke(pen.line(0x8a6cc0, 3));
        moon.circle(800, 115, 12).fill(pen.hatch(0xe2cf86, 0.9)); moon.circle(840, 150, 16).fill(pen.hatch(0xe2cf86, 0.8));
        // Alva's stars round Mira's moon
        for (const [x, y, r] of [[700, 150, 16], [760, 70, 11], [905, 80, 13], [930, 175, 10], [860, 230, 9]]) {
            moon.moveTo(x - r, y).lineTo(x + r, y).moveTo(x, y - r).lineTo(x, y + r).stroke(pen.line(0x4f7c3c, 3));
            moon.moveTo(x - r * 0.5, y - r * 0.5).lineTo(x + r * 0.5, y + r * 0.5).moveTo(x - r * 0.5, y + r * 0.5).lineTo(x + r * 0.5, y - r * 0.5).stroke(pen.line(0xd9b43c, 2));
        }
        D.sky.addChild(moon);
        for (const e of D.eggs) e.e.view.visible = false;
        D.hatch.forEach(k => { k.view.visible = true; });
        D.tukanActor.pose = 'happy';
        const klo = createKlo(PIXI, { texture: T }); klo.container.scale.set(0.6); D.actors.addChild(klo.container);
        D.kloRig = klo; D.kloActor = { visible: true, x: 380, y: 506, facing: 1, vx: 0, distance: 0, pose: 'happy' };
        const hearts = createHearts(PIXI, pen); hearts.view.position.set(380, 440); hearts.view.scale.set(0.8); D.actors.addChild(hearts.view); D.hearts = hearts;
        audio?.setArea?.('table');
        await tween(1.0, u => { veilAlpha = 1 - ease(u); });
        veilAlpha = 0;
        ui.caption(TABLE.table, 2600);
        await wait(1.0);
        await ui.say([TABLE.miraMoon, TABLE.alvaTeam]);
        await ui.say([TABLE.marry, TABLE.research]);
        ui.caption(TABLE.end, 3600);
        await wait(2.4);
        await tween(0.9, u => { veilAlpha = ease(u); });
        fadingToWorld = true;
        page.visible = false; desk.visible = false; windowArt.visible = false; pencils.visible = false;
        await tween(0.8, u => { veilAlpha = 1 - ease(u); });
        hide();
        page.visible = true; desk.visible = true;
    }

    return {
        prologue, epilogue, reveal, tick,
        get opaque() { return shown && !fadingToWorld; },
        get shown() { return shown; },
        speakerBounds(who) {
            if (!D) return null;
            if (who === 'tukan') return D.tukan.view.getBounds();
            if (who === 'klo' && D.kloRig) return D.kloRig.headBounds();
            return null;
        },
        destroy() { hide(); root.destroy({ children: true }); }
    };
}
