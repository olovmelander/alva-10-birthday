/*
 * Äventyr 2 – the world on screen (PixiJS 8, WebGL), drawn in coloured pencil.
 *
 *   const view = createView(PIXI, app, { assets, G, heroFactory });
 *   view.setScene(id); view.render(dt, snap); await view.fx(name, data);
 *
 * Everything new is drawn in code with src/pencil-style.mjs on Adventure 1's
 * own pencil tiles and materials (no new download). Shapes are built once per
 * scene; frames only move, fade and show them. The sköldhäst is src/hero.mjs and
 * Professor Klo src/klo.mjs, exactly as in Adventure 1.
 *
 * Night and storm: the environment layers are tinted by G.storm (1 storm …
 * 0 moonlight); the characters keep their colours. Lightning is a soft flash,
 * a faint one with less motion.
 */
import { HL, cond, heightOn } from '../../src/sim.mjs';
import { pencilStyle, pencilPixi, raggedBand, resampleX } from '../../src/pencil-style.mjs';
import { createKlo } from '../../src/klo.mjs';
import { createTukan, createMagpie, createBeetle, createBall, createCloud, createEgg, createHatchling, createCoin, createNest, createHearts, PAL, INK } from './characters.mjs';
import { eggState, ballPose } from './puzzles.mjs';
import { EGG_TOTAL } from './content/world.mjs';

const h = (v) => v * HL;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const mixColor = (a, b, t) => {
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
};
// a repeatable random number for x (decor placement never changes between visits)
const hash = (x, s = 0) => { const v = Math.sin(x * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

const MAT = {
    sand: ['mat-sand', 0xe6d2a2], wetsand: ['mat-wetsand', 0xcdb88c], grass: ['mat-grass', 0x7f9a5c], earth: ['mat-earth', 0x8a6a4a],
    rock: ['mat-rock', 0x8d8a86], wood: ['mat-wood', 0x9a7550], riverbed: ['mat-wetsand', 0xa8a283], bark: ['mat-wood', 0x7c5a3c],
    vine: ['mat-grass', 0x5d8a4a], mushroom: ['mat-paper', 0xb07cc8]
};
// the night's colours: storm, and moonlight
const SKY = { storm: [0x2a2d4a, 0x4b4d72, 0x6e6a8e], moon: [0x1f2b4f, 0x3d5282, 0x8a8fb8] };
const ENV_TINT = { storm: 0xb9bedb, moon: 0xe6eaf7 };

export function createView(PIXI, app, { assets, G, heroFactory }) {
    const T = (name) => assets.tex(name);
    const pen = pencilStyle(T);
    const RAW = PIXI;
    PIXI = pencilPixi(PIXI, T);
    let destroyed = false;
    const root = new PIXI.Container();
    app.stage.addChild(root);
    const skyLayer = new PIXI.Container();
    const farLayer = new PIXI.Container();
    const world = new PIXI.Container(); world.label = 'world';
    const overlay = new PIXI.Container();
    root.addChild(skyLayer, farLayer, world, overlay);
    const L = {};
    for (const name of ['back', 'water', 'terrain', 'mid', 'objects', 'actors', 'hero', 'waterFront', 'fore', 'fx']) {
        L[name] = new PIXI.Container(); L[name].label = 'w-' + name; world.addChild(L[name]);
    }
    const ENV = [L.back, L.water, L.terrain, L.mid, L.fore];

    const cam = { x: 0, y: 0, zoom: 0.5, snap: true, shake: 0 };
    let S = null;
    let hero = heroFactory();
    L.hero.addChild(hero.view);
    let cloudTexture = null;
    let storm = 1, stormShown = 1;
    let flash = 0, nextLightning = 4;
    let fade = 0, fadeTarget = 0, fadeRate = 3;
    const waiters = new Set();

    // --- textures made once ------------------------------------------------------------
    function texFrom(draw, w, hgt) {
        const gr = new RAW.Graphics();
        draw(gr);
        const t = app.renderer.generateTexture({ target: gr, resolution: 1, frame: new RAW.Rectangle(-w / 2, -hgt / 2, w, hgt) });
        gr.destroy();
        return t;
    }
    const TX = {
        streak: texFrom(g => g.moveTo(0, -14).lineTo(-3, 14).stroke({ width: 2, color: 0xc9d6ee, alpha: 0.85, cap: 'round' }), 10, 32),
        drop: texFrom(g => g.circle(0, 0, 4).fill({ color: 0xbcd6ea, alpha: 0.9 }), 10, 10),
        star: texFrom(g => { g.moveTo(-8, 0).lineTo(8, 0).moveTo(0, -8).lineTo(0, 8).stroke({ width: 2.2, color: 0xfff6cf, cap: 'round' }); g.circle(0, 0, 2).fill(0xffffff); }, 20, 20),
        mote: texFrom(g => { for (let i = 6; i >= 1; i--) g.circle(0, 0, i * 2.2).fill({ color: 0xfff1b0, alpha: 0.07 }); g.circle(0, 0, 2.4).fill({ color: 0xfffbe6 }); }, 30, 30),
        leaf: texFrom(g => g.moveTo(-7, 0).quadraticCurveTo(0, -6, 7, 0).quadraticCurveTo(0, 6, -7, 0).fill({ color: 0x6f9a4f }).stroke({ width: 1, color: 0x3f5f33 }), 18, 14),
        bubble: texFrom(g => g.circle(0, 0, 4.5).stroke({ width: 1.3, color: 0xcfe6ef, alpha: 0.9 }), 12, 12),
        dust: texFrom(g => g.circle(0, 0, 3).fill({ color: 0xc9b58f, alpha: 0.85 }), 8, 8)
    };

    // --- particles ---------------------------------------------------------------------
    const parts = [];
    function emit(kind, x, y, n = 6, o = {}) {
        if (G.lessMotion) n = Math.ceil(n / 3);
        for (let i = 0; i < n; i++) {
            const s = new RAW.Sprite(TX[kind] || TX.dust); s.anchor.set(0.5);
            s.position.set(x + (Math.random() - 0.5) * (o.spread || 20), y + (Math.random() - 0.5) * (o.spreadY || 10));
            L.fx.addChild(s);
            const a = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.cone ?? 1.6);
            const v = (o.speed || 220) * (0.5 + Math.random() * 0.7);
            parts.push({ s, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.gravity ?? 600, life: o.life || 0.8, t: 0, spin: (Math.random() - 0.5) * 6, fade: o.fade ?? true, scale: o.scale || 1 });
            s.scale.set(o.scale || 1);
            if (o.tint) s.tint = o.tint;
        }
    }
    function stepParticles(dt) {
        for (let i = parts.length - 1; i >= 0; i--) {
            const q = parts[i];
            q.t += dt; q.vy += q.g * dt;
            q.s.x += q.vx * dt; q.s.y += q.vy * dt; q.s.rotation += q.spin * dt;
            const u = q.t / q.life;
            if (q.fade) q.s.alpha = 1 - u;
            if (u >= 1) { q.s.destroy(); parts.splice(i, 1); }
        }
    }

    // --- the sky (screen space) ----------------------------------------------------------
    const skyG = new RAW.Graphics();
    skyLayer.addChild(skyG);
    const stars = new RAW.Container(); skyLayer.addChild(stars);
    for (let i = 0; i < 46; i++) {
        const s = new RAW.Sprite(TX.star); s.anchor.set(0.5);
        s.position.set(hash(i, 1), hash(i, 2) * 0.55); s.scale.set(0.25 + hash(i, 3) * 0.5); s._tw = hash(i, 4) * 6;
        stars.addChild(s);
    }
    const moon = new PIXI.Container(); moon.label = 'moon'; skyLayer.addChild(moon);
    const moonGlow = new RAW.Sprite(TX.mote); moonGlow.anchor.set(0.5); moonGlow.scale.set(9); moonGlow.alpha = 0.55; moonGlow.tint = 0xfff2c4;
    const moonG = new PIXI.Graphics();
    moonG.circle(0, 0, 60).fill(pen.fill(0xf8ebb4)).stroke(pen.line(0xb79a4a, 3));
    moonG.circle(-18, -14, 11).fill(pen.hatch(0xe2cf86, 0.9)); moonG.circle(16, 12, 15).fill(pen.hatch(0xe2cf86, 0.8)); moonG.circle(20, -22, 6).fill(pen.hatch(0xe2cf86, 0.8));
    moonG.moveTo(-40, 30).quadraticCurveTo(-10, 52, 30, 44).stroke(pen.line(0xc9b064, 2, 0.6));
    moon.addChild(moonGlow, moonG);
    moon.visible = false;
    const moonState = { shown: 0, target: 0 };
    // the stars Alva draws round Mira's moon
    const alvaStars = new RAW.Container(); alvaStars.visible = false; skyLayer.addChild(alvaStars);
    const ALVA_STARS = [[-2.6, 0.3, 1.9], [-1.4, -0.9, 1.1], [1.5, -0.7, 1.3], [2.3, 0.6, 1.0], [-3.6, -0.6, 0.9], [0.4, 1.7, 0.8]];
    for (const [dx, dy, k] of ALVA_STARS) { const s = new RAW.Sprite(TX.star); s.anchor.set(0.5); s._d = [dx, dy, k]; alvaStars.addChild(s); }
    const starsState = { shown: 0 };
    const stormClouds = new PIXI.Container(); skyLayer.addChild(stormClouds);
    const cloudShapes = [];
    for (let i = 0; i < 6; i++) {
        const c = new PIXI.Graphics();
        const w = 260 + hash(i, 5) * 260;
        const lobes = 5 + Math.floor(hash(i, 6) * 3);
        for (let k = 0; k < lobes; k++) {
            const x = (k / (lobes - 1) - 0.5) * w, r = 50 + hash(i * 7 + k, 7) * 50;
            c.circle(x, -Math.sin(k / (lobes - 1) * Math.PI) * r * 0.5, r).fill(pen.fill(0x5d5a7e, 0.95));
        }
        for (let k = 0; k < lobes; k++) {
            const x = (k / (lobes - 1) - 0.5) * w, r = 50 + hash(i * 7 + k, 7) * 50;
            c.circle(x, -Math.sin(k / (lobes - 1) * Math.PI) * r * 0.5, r).stroke(pen.line(0x24223a, 2.4, 0.7));
        }
        c.ellipse(0, -30, w * 0.38, 26).fill(pen.hatch(0x9a98bd, 0.75));
        c.ellipse(-w * 0.15, -10, w * 0.22, 14).fill(pen.hatch(0x7c7aa2, 0.6));
        stormClouds.addChild(c);
        cloudShapes.push({ c, x: hash(i, 8), y: 0.05 + hash(i, 9) * 0.22, par: 0.04 + hash(i, 10) * 0.05, w });
    }

    // the far forest: two bands of trees at their own depth (world x, screen-relative y)
    function farBand(color, ink, baseH, seed) {
        const c = new PIXI.Graphics();
        const W = 4200;
        c.moveTo(0, 0);
        for (let x = 0; x <= W; x += 60) {
            const tree = hash(x, seed);
            const top = -baseH * (0.55 + tree * 0.6) - Math.sin(x * 0.004 + seed) * baseH * 0.15;
            c.lineTo(x, top);
            if (tree > 0.55) { c.lineTo(x + 18, top - baseH * 0.22); c.lineTo(x + 36, top); }
        }
        c.lineTo(W, 0).lineTo(W, 900).lineTo(0, 900).closePath().fill(pen.fill(color));
        c.moveTo(0, -baseH * 0.6);
        for (let x = 0; x <= W; x += 120) c.lineTo(x, -baseH * (0.5 + hash(x, seed) * 0.5));
        c.stroke(pen.line(ink, 1.6, 0.35));
        return { c, W };
    }
    const far = [farBand(0x4d5a7c, 0x2c3552, 190, 3), farBand(0x3d5c5a, 0x22393a, 130, 9)];
    const farSprites = far.map(({ c, W }, i) => {
        const b = c.getLocalBounds();
        const tex = app.renderer.generateTexture({ target: c, resolution: 0.75 });
        c.destroy();
        const t = new RAW.TilingSprite({ texture: tex, width: 100, height: tex.height });
        farLayer.addChild(t);
        return { t, par: i ? 0.3 : 0.14, top: -b.y, h: tex.height, W };
    });
    // the sky is drawn in pencil too: crossing strokes over the colour
    const skyHatch = new RAW.TilingSprite({ texture: RAW.Texture.EMPTY, width: 100, height: 100 });
    skyHatch.alpha = 0.18; skyHatch.tint = 0xc9cbe8;
    skyLayer.addChildAt(skyHatch, 1);

    // --- screen overlays: rain, the flash, the paper tooth, fades ------------------------------
    const rain = new RAW.Container(); overlay.addChild(rain);
    const drops = [];
    for (let i = 0; i < 90; i++) {
        const s = new RAW.Sprite(TX.streak); s.anchor.set(0.5); rain.addChild(s);
        drops.push({ s, x: hash(i, 11), y: hash(i, 12), v: 0.7 + hash(i, 13) * 0.6 });
    }
    const flashG = new RAW.Graphics(); overlay.addChild(flashG);
    let tooth = null;
    function makeTooth() {
        const t = T('paper-tooth');
        if (!t || tooth) return;
        tooth = new RAW.TilingSprite({ texture: t, width: app.screen.width, height: app.screen.height });
        tooth.blendMode = 'multiply'; tooth.alpha = 0.45;
        overlay.addChildAt(tooth, 0);
    }
    const fadeG = new RAW.Graphics(); overlay.addChild(fadeG);

    // --- scene building ------------------------------------------------------------------
    function material(name, alpha = 1) {
        const [img, color] = MAT[name] || [null, 0xbbbbbb];
        return pen.material(img, alpha, color);
    }
    function poly(gr, pts) { gr.poly(pts.flat()); return gr; }
    function lineAlong(gr, pts) { gr.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) gr.lineTo(pts[i][0], pts[i][1]); return gr; }
    function offset(pts, dy) { return pts.map(([x, y]) => [x, y + dy]); }

    function clearScene() {
        if (!S) return;
        // every scene display (and its actors) lives in these layers; the hero is kept
        for (const l of Object.values(L)) if (l !== L.hero) l.removeChildren().forEach(c => c.destroy({ children: true }));
        parts.length = 0;
        S = null;
    }

    function buildScene(id) {
        clearScene();
        const def = G.scenes[id];
        S = { id, def, actors: [], eggs: new Map(), surfaces: new Map(), when: [], dashed: new Map(), anim: [] };
        const bottom = def.bounds.y1 + h(4);
        // water bodies (behind the ground, so the bed hides what is under it)
        for (const w of def.waters || []) {
            const gw = new PIXI.Graphics();
            gw.rect(w.x0, w.top, w.x1 - w.x0, bottom - w.top).fill(material('wetsand', 0));
            gw.rect(w.x0, w.top, w.x1 - w.x0, bottom - w.top).fill({ color: 0x3f6f8e, alpha: 0.85 });
            gw.rect(w.x0, w.top, w.x1 - w.x0, bottom - w.top).fill(pen.material('mat-water', 0.35, 0x5d8eaa));
            for (let k = 0; k < 6; k++) gw.rect(w.x0, w.top + h(0.6) * (k + 1), w.x1 - w.x0, h(0.6)).fill({ color: 0x1d3a52, alpha: 0.08 });
            L.water.addChild(gw);
            // the surface: a pencil line and its light
            const surf = new PIXI.Graphics();
            const wave = resampleX([[w.x0, w.top], [w.x1, w.top]], 40).map(([x, y], i) => [x, y + Math.sin(i * 0.9) * 4]);
            lineAlong(surf, wave).stroke(pen.line(0x2c5776, 3, 0.9));
            lineAlong(surf, offset(wave, 7)).stroke(pen.line(0xb7d6e6, 2, 0.5));
            L.waterFront.addChild(surf);
            const front = new PIXI.Graphics();
            front.rect(w.x0, w.top + 6, w.x1 - w.x0, bottom - w.top).fill({ color: 0x3d6d8f, alpha: 0.28 });
            L.waterFront.addChildAt(front, 0);
            // gentle current marks in the river
            if (w.kind === 'river') {
                const cur = new PIXI.Container(); L.water.addChild(cur);
                for (let k = 0; k < 9; k++) {
                    const c = new PIXI.Graphics();
                    c.moveTo(0, 0).quadraticCurveTo(h(0.4), -8, h(0.8), 0).stroke(pen.line(0x9cc3d8, 2, 0.5));
                    c.position.set(w.x0 + (w.x1 - w.x0) * hash(k, 21), w.top + h(0.4 + hash(k, 22) * 1.2));
                    cur.addChild(c); S.anim.push({ kind: 'current', c, x0: w.x0, x1: w.x1, v: 60 + hash(k, 23) * 40 });
                }
            }
        }
        // the ground
        for (const s of def.surfaces) {
            if (s.hidden) continue;
            if (s.thin) { buildThin(s); continue; }
            const gr = new PIXI.Graphics();
            const top = resampleX(s.pts, 24);
            const body = [...top, [top.at(-1)[0], bottom], [top[0][0], bottom]];
            const under = s.mat === 'grass' ? (s.edgeMat || 'earth') : s.mat === 'bark' ? 'earth' : s.mat;
            if (s.underwater) {
                poly(gr, body).fill(material(under));
            } else {
                // paper below; the soil's colour thins out about one and a half lengths down
                poly(gr, body).fill(pen.material('mat-paper', 1, 0xf3ecdc));
                const deep = [...top, ...offset(top, h(1.5)).reverse()], thin = [...offset(top, h(1.45)), ...offset(top, h(2.3)).reverse()];
                poly(gr, deep).fill(material(under));
                poly(gr, thin).fill(material(under, 0.45));
                poly(gr, deep).fill({ color: under === 'earth' ? 0x5a3f2a : 0x6b6256, alpha: 0.18 });
                for (let x = top[0][0] + 20; x < top.at(-1)[0] - 20; x += 34) {
                    const y = heightOn(s.pts, x) + h(0.5 + hash(x, 15) * 1.2);
                    gr.moveTo(x, y).lineTo(x + 14, y + 6).stroke(pen.line(0x6a4a32, 1.6, 0.35));
                }
            }
            if (s.mat === 'grass') poly(gr, raggedBand(s.pts, h(0.32), s.pts[0][0] * 0.001)).fill(material('grass'));
            if (s.mat === 'sand' || s.mat === 'wetsand') poly(gr, raggedBand(s.pts, h(0.25), 2)).fill(material(s.mat));
            if (s.mat === 'bark') {
                // a fallen trunk lying on the slope: bark, rings at its broken end
                const band = [...top, ...offset(top, h(0.55)).reverse()];
                poly(gr, band).fill(material('wood')); poly(gr, band).fill({ color: 0x5b3c22, alpha: 0.35 });
                for (let x = top[0][0] + 30; x < top.at(-1)[0]; x += 46) {
                    const y = heightOn(s.pts, x);
                    gr.moveTo(x, y + 8).lineTo(x + 26, y + h(0.45)).stroke(pen.line(0x3e2814, 2, 0.6));
                }
                const [ex, ey] = s.pts[0];
                gr.ellipse(ex, ey + h(0.27), h(0.13), h(0.27)).fill(pen.fill(0xc9a271)).stroke(pen.line(0x5b3c22, 2));
                for (const r of [0.18, 0.1]) gr.ellipse(ex, ey + h(0.27), h(0.13 * r / 0.2), h(r)).stroke(pen.line(0x8a6a45, 1.4, 0.8));
            }
            if (s.underwater) poly(gr, body).fill({ color: 0x2e5470, alpha: 0.32 });
            lineAlong(gr, s.pts).stroke(pen.line(s.underwater ? 0x2f4f5f : INK, 2.6, 0.9));
            L.terrain.addChild(gr);
            S.surfaces.set(s.id, gr);
        }
        // the puzzle drawings and places
        if (def.dashed) for (const d of def.dashed) buildDashed(d);
        buildPlaces(def);
        buildDecor(def);
        buildObjects(def);
        buildActors(def);
        refreshWhen();
        makeTooth();
    }

    function buildThin(s) {
        const c = new PIXI.Container(); c.label = 'thin-' + s.id;
        const gr = new PIXI.Graphics();
        const top = resampleX(s.pts, 16);
        if (s.branch) {
            const w = s.big ? h(0.24) : h(0.16);
            const band = [...top, ...offset(top, w).reverse()];
            poly(gr, band).fill(material('bark')); poly(gr, band).fill({ color: 0x4e331c, alpha: 0.3 });
            lineAlong(gr, top).stroke(pen.line(0x3e2814, 2.4));
            lineAlong(gr, offset(top, w)).stroke(pen.line(0x3e2814, 1.8, 0.8));
            for (let i = 2; i < top.length - 2; i += 4) {
                const [x, y] = top[i];
                gr.moveTo(x, y + w * 0.3).lineTo(x + 18, y + w * 0.7).stroke(pen.line(0x5a3b20, 1.4, 0.6));
                if (hash(x, 31) > 0.7) {
                    gr.moveTo(x, y + 4).quadraticCurveTo(x + 8, y - 22, x + 26, y - 18).quadraticCurveTo(x + 12, y - 4, x, y + 4)
                        .fill(pen.fill(0x5f8a4c)).stroke(pen.line(0x34523a, 1.2));
                }
            }
        } else if (s.log) {
            const band = [...top, ...offset(top, h(0.36)).reverse()];
            poly(gr, band).fill(material('wood')); poly(gr, band).fill({ color: 0x5b3c22, alpha: 0.25 });
            lineAlong(gr, top).stroke(pen.line(0x3e2814, 2.4));
            for (let x = s.pts[1][0] + 20; x < s.pts[2][0] - 10; x += 34) gr.moveTo(x, s.pts[1][1] + 10).lineTo(x + 14, s.pts[1][1] + h(0.3)).stroke(pen.line(0x4e331c, 1.6, 0.55));
            // the hollow ends
            for (const [x, y] of [s.pts[0], s.pts.at(-1)]) gr.ellipse(x, y - h(0.1), h(0.09), h(0.18)).fill({ color: 0x1d140c, alpha: 0.85 }).stroke(pen.line(0x5b3c22, 2));
        } else if (s.rope) {
            // a plank bridge on two ropes (Mira's, or the vine across Ravinen)
            const vine = s.mat === 'vine';
            for (let i = 0; i < top.length - 1; i++) {
                const [x, y] = top[i], [x2, y2] = top[i + 1];
                if (vine) gr.moveTo(x, y).lineTo(x2, y2).stroke(pen.line(0x4f7a3c, 9));
                else gr.moveTo(x, y + 2).lineTo(x2 - 3, y2 + 2).stroke(pen.line(i % 2 ? 0xa27b4e : 0xb88d5c, 14, 0.95));
            }
            lineAlong(gr, offset(top, -h(0.42))).stroke(pen.line(vine ? 0x3f6a32 : 0x8a6a45, 3));
            lineAlong(gr, top).stroke(pen.line(vine ? 0x2f4f25 : 0x5b3c22, 2));
            if (vine) for (let i = 1; i < top.length; i += 3) {
                const [x, y] = top[i];
                gr.moveTo(x, y).quadraticCurveTo(x + 10, y - 16, x + 22, y - 10).quadraticCurveTo(x + 10, y - 2, x, y).fill(pen.fill(0x6f9a4f));
            }
            for (const [x, y] of [s.pts[0], s.pts.at(-1)]) gr.moveTo(x, y + 6).lineTo(x, y - h(0.5)).stroke(pen.line(0x6a4b2c, 7));
        } else if (s.prop === 'mushroom') {
            const [x0, y] = s.pts[0], x1 = s.pts.at(-1)[0], cx = (x0 + x1) / 2;
            gr.moveTo(cx - 14, y).lineTo(cx - 18, y + h(0.4)).lineTo(cx + 18, y + h(0.4)).lineTo(cx + 14, y).closePath().fill(pen.fill(0xefe4cf)).stroke(pen.line(0x8d806a, 1.6));
            gr.moveTo(x0 - 10, y + 4).quadraticCurveTo(cx, y - h(0.55), x1 + 10, y + 4).closePath().fill(pen.fill(0x9a6cc0)).stroke(pen.line(0x4f356a, 2));
            for (const [dx, dy, r] of [[-30, -18, 7], [8, -34, 9], [36, -14, 6], [-6, -10, 5]]) gr.circle(cx + dx, y + dy, r).fill(pen.fill(0xf3e9ff));
        } else {
            lineAlong(gr, top).stroke(pen.line(0x6a4b2c, 10));
        }
        c.addChild(gr);
        L.terrain.addChild(c);
        if (s.when) S.when.push({ node: c, when: s.when });
        S.surfaces.set(s.id, c);
    }

    function buildDashed(d) {
        const c = new PIXI.Container();
        const dash = new PIXI.Graphics();
        const pts = resampleX(d.pts, 8);
        // the unfinished drawing: bold pencil dashes in Mira's lilac, for the deck and its ropes
        const glow = new PIXI.Graphics();
        lineAlong(glow, pts).stroke(pen.line(0xd9c8ff, 26, 0.18));
        dash.addChild(glow);
        let acc = 0, on = true;
        for (let i = 1; i < pts.length; i++) {
            const [x, y] = pts[i - 1], [x2, y2] = pts[i];
            acc += Math.hypot(x2 - x, y2 - y);
            if (on) {
                dash.moveTo(x, y).lineTo(x2, y2).stroke(pen.line(0xb79be6, 11));
                dash.moveTo(x, y - h(0.42)).lineTo(x2, y2 - h(0.42)).stroke(pen.line(0xb79be6, 5, 0.85));
            }
            if (acc > (on ? 30 : 20)) { acc = 0; on = !on; }
        }
        for (const [x, y] of [d.pts[0], d.pts.at(-1)]) dash.moveTo(x, y + 6).lineTo(x, y - h(0.5)).stroke(pen.line(0xb79be6, 7, 0.9));
        const ink = new PIXI.Graphics();
        c.addChild(dash, ink);
        L.terrain.addChild(c);
        S.dashed.set(d.id, { d, c, ink, drawn: -1 });
    }
    function updateDashed() {
        for (const v of S.dashed.values()) {
            const done = G.flags.has(v.d.flag);
            v.c.visible = !done;
            const t = v.d._ink || 0;
            if (Math.abs(t - v.drawn) < 0.01) continue;
            v.drawn = t;
            v.ink.clear();
            if (t <= 0) continue;
            const pts = resampleX(v.d.pts, 10), n = Math.max(2, Math.round(pts.length * t));
            lineAlong(v.ink, pts.slice(0, n)).stroke(pen.line(0xb88d5c, 14, 0.95));
            lineAlong(v.ink, pts.slice(0, n)).stroke(pen.line(0x5b3c22, 2.2));
        }
    }

    // places drawn for the story: trees, the cave, the waterfall, the roots, the stash
    function tree(gr, x, y, { trunk = h(0.32), height = h(4.2), crown = h(1.6), color = 0x2f5a3e, hi = 0x4f7c50, lean = 0 } = {}) {
        const topX = x + lean;
        gr.moveTo(x - trunk / 2, y + 6).lineTo(topX - trunk * 0.3, y - height).lineTo(topX + trunk * 0.3, y - height).lineTo(x + trunk / 2, y + 6).closePath()
            .fill(material('bark')).stroke(pen.line(0x3e2814, 2));
        for (let k = 0; k < 4; k++) gr.moveTo(x - trunk * 0.2 + k * 6, y - height * (0.2 + k * 0.18)).lineTo(x - trunk * 0.1 + k * 6, y - height * (0.3 + k * 0.18)).stroke(pen.line(0x4e331c, 1.4, 0.6));
        const blobs = 6;
        for (let k = 0; k < blobs; k++) {
            const a = (k / blobs) * Math.PI * 2, r = crown * (0.45 + hash(x + k, 41) * 0.2);
            gr.circle(topX + Math.cos(a) * crown * 0.55, y - height - crown * 0.2 + Math.sin(a) * crown * 0.35, r).fill(pen.fill(color));
        }
        gr.circle(topX, y - height - crown * 0.25, crown * 0.6).fill(pen.fill(color));
        gr.ellipse(topX - crown * 0.2, y - height - crown * 0.5, crown * 0.45, crown * 0.22).fill(pen.hatch(hi, 0.8));
    }
    function buildPlaces(def) {
        const back = new PIXI.Graphics(), fore = new PIXI.Graphics(), mid = new PIXI.Graphics();
        L.back.addChild(back); L.mid.addChild(mid); L.fore.addChild(fore);
        if (def.id === 'strand') {
            // Klyftan's back wall
            ravine(back, h(1.5), h(6.5), h(-0.6), h(-0.6));
            // the cocoa tree: milk-chocolate pods grow straight from its trunk
            tree(back, h(16.9), h(-0.62), { trunk: h(0.45), height: h(3.9), crown: h(1.9), color: 0x2f5a3e });
            S.cocoa = new PIXI.Container(); S.cocoa.position.set(h(16.9), h(-0.62)); L.mid.addChild(S.cocoa);
            const pods = new PIXI.Graphics();
            for (const [dx, dy, r] of [[-26, -150, 0.3], [24, -210, -0.4], [-18, -300, 0.2], [30, -380, -0.3], [-30, -460, 0.4], [26, -520, -0.2], [-8, -600, 0.1]]) {
                pods.ellipse(dx, dy, 12, 22).fill(pen.fill(0x9a5e32)).stroke(pen.line(0x5b3418, 1.6));
                pods.moveTo(dx - 4, dy - 18).lineTo(dx - 4, dy + 18).stroke(pen.line(0xc78b55, 1.2, 0.7));
                void r;
            }
            S.cocoa.addChild(pods);
            // Tukankrabban's collection of shiny things beside the nest
            const stash = new PIXI.Container(); stash.position.set(def.spots.stash.x, def.spots.stash.y); L.mid.addChild(stash);
            const sg = new PIXI.Graphics();
            for (let i = 0; i < 11; i++) sg.circle(-34 + i * 7, -4 - Math.sin(i / 10 * Math.PI) * 10, 3.6).fill(pen.fill(0xf7f2ea)).stroke(pen.line(0xb2a58a, 1));
            for (const [dx, dy] of [[18, -5], [30, -3], [24, -12]]) createCoinShape(sg, dx, dy);
            sg.moveTo(-50, 0).quadraticCurveTo(-46, -16, -36, -18).quadraticCurveTo(-30, -6, -50, 0).fill(pen.fill(0xf0c7d4)).stroke(pen.line(0x9b6075, 1.2));
            stash.addChild(sg);
            for (let i = 0; i < 3; i++) { const s = new RAW.Sprite(TX.star); s.anchor.set(0.5); s.position.set(-20 + i * 24, -18 - i * 4); s.scale.set(0.5); stash.addChild(s); S.anim.push({ kind: 'twinkle', s, o: i * 1.7 }); }
            // Skatträdet and the magpie's nest
            tree(back, h(69.5), h(-0.62), { trunk: h(0.5), height: h(3.2), crown: h(1.8), color: 0x2c5240 });
            const mn = new PIXI.Graphics();
            mn.ellipse(def.magpie.x - h(0.2), def.magpie.y - 6, h(0.42), 14).fill(pen.fill(0x8a6a45)).stroke(pen.line(0x4e331c, 1.6));
            for (let i = 0; i < 8; i++) mn.moveTo(def.magpie.x - h(0.6) + i * 12, def.magpie.y - 2).lineTo(def.magpie.x - h(0.5) + i * 12, def.magpie.y - 16).stroke(pen.line(0xb9975f, 2, 0.9));
            L.objects.addChild(mn);
            // the beetle's burrow
            mid.ellipse(h(63.9), h(-1.47), h(0.32), h(0.12)).fill({ color: 0x24170e, alpha: 0.85 });
            // Forsen: the cliff above the cave, the cave's dark inside, the waterfall
            const caveIn = [[h(88.7), h(-1.9)], [h(91), h(-1.75)], [h(94), h(-1.85)], [h(96.2), h(-1.6)], [h(96.2), h(0.4)], [h(88.7), h(0.4)]];
            poly(back, caveIn).fill(material('rock')); poly(back, caveIn).fill({ color: 0x14121d, alpha: 0.72 });
            for (let k = 0; k < 7; k++) back.moveTo(h(89.2 + k), h(-1.6)).quadraticCurveTo(h(89.4 + k), h(-1.1), h(89.3 + k), h(-0.8)).stroke(pen.line(0x3a3646, 3, 0.6));
            const cliff = [[h(88.3), h(-7.6)], [h(97), h(-7.6)], [h(97), h(-1.55)], [h(95.4), h(-1.75)], [h(94.1), h(-1.5)], [h(92.6), h(-1.85)], [h(91.1), h(-1.55)], [h(89.8), h(-1.9)], [h(88.9), h(-2.6)],
                [h(88.6), h(-3.9)], [h(88.9), h(-5.1)], [h(88.5), h(-6.4)]];
            poly(fore, cliff).fill(material('rock')); poly(fore, cliff).fill({ color: 0x2d2a36, alpha: 0.3 });
            for (let k = 0; k < 9; k++) { const y = h(-7 + k * 0.62); fore.moveTo(h(89.4), y).lineTo(h(96.8), y + h(0.12) * Math.sin(k)).stroke(pen.line(0x5a5668, 1.6, 0.45)); }
            for (let k = 0; k < 6; k++) fore.circle(h(90 + k * 1.2), h(-7.5) + 6, h(0.3 + hash(k, 55) * 0.2)).fill(pen.fill(0x3d6a45));
            lineAlong(fore, cliff.slice(2).concat([cliff[0]])).stroke(pen.line(INK, 2.4));
            const falls = new PIXI.Container(); L.waterFront.addChild(falls);
            const fg = new PIXI.Graphics();
            fg.moveTo(h(87.2), h(-7.5)).lineTo(h(88.8), h(-7.5)).lineTo(h(89.0), 0).lineTo(h(87.0), 0).closePath().fill({ color: 0xbcd8ea, alpha: 0.5 });
            fg.moveTo(h(87.2), h(-7.5)).lineTo(h(87.0), 0).moveTo(h(88.8), h(-7.5)).lineTo(h(89.0), 0).stroke(pen.line(0xe8f4fa, 3, 0.8));
            for (let k = 0; k < 7; k++) fg.circle(h(86.9 + k * 0.36), 6 + (k % 2) * 8, 16 + (k % 3) * 6).fill(pen.fill(0xf2f8fb, 0.85));
            falls.addChild(fg);
            for (let k = 0; k < 10; k++) {
                const st = new PIXI.Graphics();
                st.moveTo(0, 0).lineTo(0, h(1.4)).stroke(pen.line(k % 2 ? 0xffffff : 0x9cc3dc, 3, 0.85));
                st.position.set(h(87.4) + k * h(0.14), h(-7.5)); falls.addChild(st);
                S.anim.push({ kind: 'fall', c: st, y0: h(-7.5), y1: h(-1.2), o: hash(k, 51) });
            }
            S.anim.push({ kind: 'foam', x: h(88), y: h(0) });
        } else {
            // Ravinen's back wall
            ravine(back, h(34.5), h(40), h(-0.6), h(-1.8));
            // Jätteträdet: a trunk as wide as a house, its crown under the storm
            const trunk = [[h(13.2), h(-0.5)], [h(14.6), h(-9)], [h(15.2), h(-13.5)], [h(19.8), h(-13.5)], [h(20.4), h(-9)], [h(21.6), h(-0.5)]];
            poly(back, trunk).fill(material('bark')); poly(back, trunk).fill({ color: 0x3e2814, alpha: 0.3 });
            lineAlong(back, trunk).stroke(pen.line(0x2e1d0e, 3));
            for (let k = 0; k < 26; k++) {
                const x = h(14.4 + hash(k, 61) * 5.6), y = h(-0.8 - hash(k, 62) * 12.4);
                back.moveTo(x, y).quadraticCurveTo(x + 10, y - 40, x + 4, y - 80).stroke(pen.line(0x4e331c, 2, 0.6));
            }
            back.ellipse(h(17.4), h(-6.2), h(0.5), h(0.7)).fill({ color: 0x1d140c, alpha: 0.9 }); // a hollow
            for (let k = 0; k < 9; k++) {
                const a = k / 9 * Math.PI, r = h(2.6 + hash(k, 63) * 1.4);
                back.circle(h(17.4) + Math.cos(a) * h(6), h(-14.6) - Math.sin(a) * h(1.6), r).fill(pen.fill(k % 2 ? 0x26473a : 0x2c5240));
            }
            back.ellipse(h(17.4), h(-15.2), h(7.5), h(1.6)).fill(pen.hatch(0x4f7c50, 0.7));
            // roots arching over Rotgrottan
            const roots = new PIXI.Graphics();
            for (let k = 0; k < 16; k++) {
                const x0 = h(73.8 + hash(k, 71) * 1.5), x1 = h(86 + hash(k, 72) * 2.2), y = h(-1.0 - hash(k, 73) * 1.8);
                roots.moveTo(x0, h(-0.4)).bezierCurveTo(x0 + h(2), y - h(0.6), x1 - h(2), y - h(0.4), x1, h(-0.4)).stroke(pen.line(k % 3 ? 0x5a3b20 : 0x7a5530, 10 + (k % 4) * 3, 0.95));
            }
            // a mound of earth and roots over the tunnel, grass on top
            const crest = [], under = [];
            for (let x = 74; x <= 88.001; x += 0.5) {
                const u = (x - 74) / 14, hump = Math.sin(u * Math.PI);
                crest.push([h(x), h(-0.6 - hump * 2.5 - Math.sin(x * 2.3) * 0.08)]);
                under.push([h(x), h(-0.6 - Math.sin(Math.min(1, Math.max(0, (x - 74.4) / 13.2)) * Math.PI) * 0.75)]);
            }
            const mound = [...crest, ...under.reverse()];
            poly(fore, mound).fill(material('earth')); poly(fore, mound).fill({ color: 0x2a1c12, alpha: 0.35 });
            poly(fore, raggedBand(crest, h(0.28), 4)).fill(material('grass'));
            lineAlong(fore, crest).stroke(pen.line(INK, 2.4));
            for (let k = 0; k < 14; k++) {
                const x = h(75 + hash(k, 74) * 12), y = h(-1.25 - hash(k, 75) * 0.1);
                fore.moveTo(x, y).quadraticCurveTo(x + 10, y + h(0.25), x - 4, y + h(0.45 + hash(k, 76) * 0.3)).stroke(pen.line(0x6a4a2a, 3, 0.8));
            }
            L.fore.addChild(roots);
            // the dark inside, until the seeds light it
            const dark = new PIXI.Graphics();
            const inside = [[h(74.3), h(-0.7)], [h(76.5), h(-1.2)], [h(81), h(-1.45)], [h(85.5), h(-1.2)], [h(87.7), h(-0.7)], [h(88.1), h(0.2)], [h(85.6), h(1.3)], [h(76.4), h(1.3)], [h(73.9), h(0.2)]];
            for (const [grow, a] of [[1.12, 0.25], [1.05, 0.45], [1, 0.9]]) {
                const cx = h(81), cy = h(0.1);
                poly(dark, inside.map(([x, y]) => [cx + (x - cx) * grow, cy + (y - cy) * grow])).fill({ color: 0x07060c, alpha: a });
            }
            L.fore.addChild(dark); S.tunnelDark = dark;
            // the leap's old bird nest beyond Ravinen
            mid.ellipse(h(31.6), h(-0.62), h(0.5), 14).fill(pen.fill(0x8a6a45)).stroke(pen.line(0x4e331c, 1.6));
            // the vine, coiled at the ravine's edge until it is pulled across
            S.vineCoil = new PIXI.Graphics();
            for (let k = 0; k < 4; k++) S.vineCoil.ellipse(h(34.2), h(-0.7) - k * 6, h(0.3) - k * 4, 8).stroke(pen.line(0x4f7a3c, 5));
            L.mid.addChild(S.vineCoil);
            // the moonshine seeds
            S.seeds = [];
            for (let k = 0; k < 5; k++) {
                const x = h(89.0 + k * 0.4), y = h(-0.6);
                const c = new PIXI.Container(); c.position.set(x, y); L.objects.addChild(c);
                const stem = new PIXI.Graphics(); stem.moveTo(0, 0).quadraticCurveTo(6, -24, 0, -46 - k % 2 * 10).stroke(pen.line(0x4f7a3c, 3));
                const bud = new PIXI.Graphics(); bud.ellipse(0, -52 - k % 2 * 10, 7, 11).fill(pen.fill(0x6c7aa6)).stroke(pen.line(0x34405f, 1.4));
                const open = new PIXI.Container(); open.position.set(0, -52 - k % 2 * 10);
                const petals = new PIXI.Graphics();
                for (let p = 0; p < 6; p++) { const a = p / 6 * Math.PI * 2; petals.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 8, 5).fill(pen.fill(0xdfe6ff)); }
                petals.circle(0, 0, 6).fill(pen.fill(0xfff0a6));
                const glow = new RAW.Sprite(TX.mote); glow.anchor.set(0.5); glow.scale.set(2.2);
                open.addChild(glow, petals);
                c.addChild(stem, bud, open);
                S.seeds.push({ c, bud, open, glow });
            }
            S.motes = [];
            for (let k = 0; k < 14; k++) {
                const m = new RAW.Sprite(TX.mote); m.anchor.set(0.5); m.visible = false; L.fore.addChild(m);
                S.motes.push({ m, o: hash(k, 81), x: h(76 + hash(k, 82) * 11), y: h(-0.4 + hash(k, 83) * 0.9) });
            }
        }
    }
    // a gap in the ground: its two rock walls going down into the dark, the far forest above
    function ravine(gr, x0, x1, y0, y1) {
        const depth = h(3.2);
        for (let k = 0; k < 5; k++) gr.rect(x0, Math.min(y0, y1) + h(0.3) + k * h(0.55), x1 - x0, h(0.6)).fill({ color: 0x14121d, alpha: 0.12 + k * 0.09 });
        for (const [x, y, dir] of [[x0, y0, 1], [x1, y1, -1]]) {
            const wall = [[x, y], [x + dir * h(0.35), y + h(0.6)], [x + dir * h(0.2), y + h(1.4)], [x + dir * h(0.45), y + h(2.2)], [x + dir * h(0.25), y + depth], [x, y + depth]];
            poly(gr, wall).fill(material('rock')); poly(gr, wall).fill({ color: 0x2a2433, alpha: 0.45 });
            lineAlong(gr, wall.slice(0, 5)).stroke(pen.line(INK, 2, 0.8));
        }
    }
    function createCoinShape(gr, x, y) {
        gr.circle(x, y, 7).fill(pen.fill(PAL.gold)).stroke(pen.line(PAL.goldLo, 1.4));
        gr.ellipse(x - 2, y - 2, 2.4, 1.4).fill({ color: PAL.goldHi });
    }

    function buildDecor(def) {
        // ferns, grass and mushrooms along the ground, never on a puzzle's spot
        const keep = [[h(13), h(14)], [h(30.2), h(31.2)], [h(56), h(57)], [h(60.4), h(63.4)], [h(88.6), h(90.9)], [h(95.6), h(97.4)], [h(31), h(34.8)]];
        const ground = def.surfaces.filter(s => !s.thin && !s.hidden && !s.underwater && (s.mat === 'grass' || s.mat === 'sand'));
        const decoB = new PIXI.Graphics(), decoF = new PIXI.Graphics();
        for (const s of ground) {
            for (let x = s.pts[0][0] + 40; x < s.pts.at(-1)[0] - 40; x += 70 + hash(x, 91) * 90) {
                if (keep.some(([a, b]) => x > a && x < b)) continue;
                if ((def.waters || []).some(w => x > w.x0 - 20 && x < w.x1 + 20)) continue;
                const y = heightOn(s.pts, x), r = hash(x, 92), front = r > 0.72;
                const gr = front ? decoF : decoB;
                if (s.mat === 'sand') {
                    if (r > 0.5) gr.moveTo(x, y + 2).quadraticCurveTo(x - 6, y - 30, x - 14, y - 40).moveTo(x, y + 2).quadraticCurveTo(x + 4, y - 34, x + 10, y - 44).stroke(pen.line(0x8f9a62, 2.2, 0.9));
                    continue;
                }
                if (r < 0.45) {
                    for (let k = -3; k <= 3; k++) gr.moveTo(x, y + 4).quadraticCurveTo(x + k * 7, y - 30, x + k * 13, y - 34 - Math.abs(k) * -2).stroke(pen.line(k % 2 ? 0x4f7a4a : 0x3d6a45, 3, 0.95));
                } else if (r < 0.7) {
                    gr.moveTo(x - 3, y + 2).lineTo(x - 3, y - 16).lineTo(x + 3, y - 16).lineTo(x + 3, y + 2).fill(pen.fill(0xe9e0cc));
                    gr.moveTo(x - 14, y - 14).quadraticCurveTo(x, y - 34, x + 14, y - 14).closePath().fill(pen.fill(r > 0.6 ? 0x7f6ab8 : 0xc0705a)).stroke(pen.line(0x3e2c50, 1.2));
                    gr.circle(x - 4, y - 22, 2.4).fill(pen.fill(0xfff4dc));
                } else {
                    gr.circle(x, y - 26, 26).fill(pen.fill(0x2e5a40)); gr.circle(x + 22, y - 18, 20).fill(pen.fill(0x356548)); gr.circle(x - 22, y - 16, 18).fill(pen.fill(0x2a5039));
                }
            }
        }
        L.mid.addChildAt(decoB, 0); L.fore.addChild(decoF);
        // the forest behind the play: a far row and a near row of trees, each at its own place
        const trees = new PIXI.Graphics();
        const groundY = (x) => { const g2 = ground.find(q => x >= q.pts[0][0] && x <= q.pts.at(-1)[0]); return g2 ? heightOn(g2.pts, x) : null; };
        const skip = def.id === 'strand' ? [[h(86), h(97)], [h(33), h(58)], [h(1), h(7)]] : [[h(12.5), h(22.5)], [h(34), h(40.5)]];
        const open = def.id === 'strand' ? [[h(21.5), h(33)], [h(73.5), h(77)]] : [[h(4), h(12.5)], [h(49), h(54)]];
        for (const row of [0, 1]) {
            for (let x = def.bounds.x0 + h(1); x < def.bounds.x1; x += h(row ? 4.6 : 2.4) + hash(x, 97 + row) * h(2.4)) {
                if (skip.some(([a, b]) => x > a && x < b)) continue;
                if (row && open.some(([a, b]) => x > a && x < b)) continue;
                const y = groundY(x);
                if (y === null) continue;
                const k = row ? 1 : 0.62;
                tree(trees, x, y + (row ? 10 : -h(0.05)), {
                    trunk: h((0.3 + hash(x, 93) * 0.2) * k), height: h((2.6 + hash(x, 94) * 2.2) * k), crown: h((1.2 + hash(x, 95) * 0.8) * k),
                    color: row ? (hash(x, 96) > 0.5 ? 0x284a3c : 0x2f5545) : 0x2c4a50, hi: row ? 0x4f7c50 : 0x46676d, lean: (hash(x, 98) - 0.5) * h(0.4)
                });
            }
        }
        L.back.addChildAt(trees, 0);
    }

    function buildObjects(def) {
        for (const egg of def.eggs || []) {
            const e = createEgg(PIXI, pen); L.objects.addChild(e.view);
            const mound = new PIXI.Graphics();
            if (egg.how === 'dig') { mound.ellipse(0, -4, 30, 10).fill(material('sand')); mound.ellipse(0, -4, 30, 10).stroke(pen.line(0x9a8460, 1.4, 0.8)); mound.position.set(egg.x, egg.y); L.objects.addChild(mound); }
            S.eggs.set(egg.id, { egg, e, mound });
        }
        if (def.ball) { S.ball = createBall(PIXI, pen); L.objects.addChild(S.ball.view); }
        if (def.id === 'strand') {
            S.coin = createCoin(PIXI, pen, 1.2); S.coin.view.position.set(def.spots.coin.x, def.spots.coin.y - 12); L.objects.addChild(S.coin.view);
            S.whirl = new PIXI.Container(); S.whirl.position.set(h(43), h(4.2)); L.water.addChild(S.whirl);
            const wg = new PIXI.Graphics();
            for (let k = 0; k < 3; k++) {
                const pts = [];
                for (let a = 0; a < Math.PI * 3.2; a += 0.2) { const r = 18 + a * 34; pts.push([Math.cos(a + k * 2.1) * r, Math.sin(a + k * 2.1) * r * 0.55]); }
                lineAlong(wg, pts).stroke(pen.line(0xb8d8e8, 2.6, 0.55));
            }
            S.whirl.addChild(wg);
            S.nest = createNest(PIXI, pen); S.nest.view.position.set(def.nest.x, def.nest.y + 4); L.objects.addChild(S.nest.view);
            S.nestEggs = [];
            for (let i = 0; i < EGG_TOTAL; i++) {
                const e = createEgg(PIXI, pen, 0.72); e.view.position.set(-54 + i * 12, -6 - (i % 2) * 6); e.view.visible = false;
                S.nest.eggs.addChild(e.view); S.nestEggs.push(e);
            }
            S.hatchlings = [];
            for (let i = 0; i < EGG_TOTAL; i++) {
                const k = createHatchling(PIXI, pen); k.view.scale.set(1.8); k.view.visible = false; L.actors.addChild(k.view);
                S.hatchlings.push({ k, home: def.nest.x - h(1.2) + i * h(0.26), t: 0 });
            }
        }
        S.carryCoin = createCoin(PIXI, pen, 0.7); S.carryCoin.view.visible = false; L.fx.addChild(S.carryCoin.view);
        S.flying = []; // eggs on their way somewhere (staged moments)
    }

    function buildActors() {
        const klo = createKlo(PIXI, { texture: T });
        L.actors.addChild(klo.container);
        const hearts = createHearts(PIXI, pen); L.actors.addChild(hearts.view);
        const tukan = createTukan(PIXI, pen); L.actors.addChild(tukan.view);
        const skata = createMagpie(PIXI, pen); skata.view.scale.set(1.5); L.actors.addChild(skata.view);
        const dyvel = createBeetle(PIXI, pen); dyvel.view.scale.set(1.5); L.actors.addChild(dyvel.view);
        const moln = createCloud(PIXI, pen, { texture: cloudTexture }); moln.view.scale.set(1.5); L.objects.addChild(moln.view);
        S.A = { klo, hearts, tukan, skata, dyvel, moln };
        S.actors.push(tukan, skata, dyvel, moln, hearts);
    }

    function refreshWhen() {
        if (!S) return;
        for (const w of S.when) w.node.visible = cond(w.when, G.flags);
    }

    // --- per frame -----------------------------------------------------------------------
    function render(dt, snap) {
        if (destroyed || !S) return;
        const W = app.screen.width, H = app.screen.height, t = G.time, F = G.flags, rm = !!G.lessMotion;
        refreshWhen();
        updateDashed();
        stepParticles(dt);
        // the storm and the moon
        storm = G.storm ?? 1;
        stormShown = lerp(stormShown, storm, 1 - Math.exp(-1.5 * dt));
        const night = 1 - stormShown;
        const tint = mixColor(ENV_TINT.storm, ENV_TINT.moon, night);
        for (const l of ENV) l.tint = tint;

        // camera
        updateCamera(dt, snap, W, H);
        world.scale.set(cam.zoom);
        const shx = cam.shake > 0 && !rm ? (Math.random() - 0.5) * cam.shake : 0;
        cam.shake = Math.max(0, cam.shake - dt * 30);
        world.position.set(Math.round(W / 2 - cam.x * cam.zoom + shx), Math.round(H / 2 - cam.y * cam.zoom));

        drawSky(W, H, night, t, dt);
        const farScale = clamp(cam.zoom * 1.5, 0.45, 1.15);
        for (const f of farSprites) {
            f.t.scale.set(farScale);
            f.t.width = (W + 4) / farScale; f.t.tilePosition.x = -cam.x * cam.zoom * f.par / farScale;
            // the far forest's foot sits behind the near ground, lower as the camera climbs
            const ground = H / 2 + (h(-0.6) - cam.y) * cam.zoom * (0.25 + f.par) + h(0.4) * cam.zoom;
            f.t.y = ground - f.top * farScale;
        }
        if (!skyHatch.texture.width || skyHatch.texture === RAW.Texture.EMPTY) { const ht = T('pencil-hatch'); if (ht) skyHatch.texture = ht; }
        skyHatch.width = W; skyHatch.height = H; skyHatch.tilePosition.x = -cam.x * cam.zoom * 0.05;

        // water life
        for (const a of S.anim) {
            if (a.kind === 'current') { a.c.x += a.v * dt; if (a.c.x > a.x1 - h(0.8)) a.c.x = a.x0; }
            else if (a.kind === 'fall') { const u = (t * (rm ? 0.6 : 1.8) + a.o) % 1; a.c.y = lerp(a.y0, a.y1, u); a.c.alpha = 0.3 + 0.6 * Math.sin(u * Math.PI); }
            else if (a.kind === 'twinkle') { a.s.alpha = 0.3 + 0.7 * Math.max(0, Math.sin(t * 2 + a.o)) ** 4; }
            else if (a.kind === 'foam' && !rm && Math.random() < dt * 14) emit('drop', a.x + (Math.random() - 0.5) * h(1.4), a.y, 1, { speed: 260, cone: 1.2, life: 0.6 });
        }
        if (S.whirl) { S.whirl.visible = !F.has('coin_got'); S.whirl.rotation += dt * (rm ? 0.6 : 2.2); }
        if (S.coin) { S.coin.view.visible = !F.has('coin_got'); S.coin.update(dt, t); }
        S.carryCoin.view.visible = F.has('coin_got') && !F.has('coin_given');
        if (S.carryCoin.view.visible) { S.carryCoin.view.position.set(snap.x - (snap.facing || 1) * 40, snap.y - h(0.8) + Math.sin(t * 3) * 4); S.carryCoin.update(dt, t); }

        // the cocoa tree shakes while the hooves drum
        if (S.cocoa) {
            const n = G.puz.drum || 0, shaking = !F.has('p1_fallen') && n > 0;
            S.cocoa.rotation = shaking && !rm ? Math.sin(t * 30) * 0.004 * Math.min(8, n) : 0;
        }
        // the seeds and the tunnel
        if (S.seeds) {
            const lit = F.has('p4_lit'), u = lit ? 1 : clamp((G.puz.still || 0) / (G.sceneDef.seeds?.seconds || 2.5), 0, 1);
            for (const s of S.seeds) {
                s.open.visible = u > 0.05; s.open.scale.set(0.2 + 0.8 * u); s.bud.visible = u < 0.6;
                s.glow.alpha = (0.4 + 0.4 * Math.sin(t * 3 + s.c.x)) * u;
            }
            S.tunnelDark.alpha = lerp(S.tunnelDark.alpha, lit ? 0.12 : 1, 1 - Math.exp(-1.2 * dt));
            for (const m of S.motes) {
                m.m.visible = lit;
                if (!lit) continue;
                m.m.position.set(m.x + Math.sin(t * 0.7 + m.o * 9) * 30, m.y + Math.cos(t * 0.9 + m.o * 7) * 16);
                m.m.alpha = 0.5 + 0.4 * Math.sin(t * 2 + m.o * 5);
            }
        }
        if (S.vineCoil) S.vineCoil.visible = !F.has('p7_vine');

        // eggs
        for (const { egg, e, mound } of S.eggs.values()) {
            const st = eggState(G, egg);
            const vis = st.state !== 'got' && st.state !== 'ball' && !S.flying.some(f => f.id === egg.id);
            e.view.visible = vis;
            if (mound.parent) mound.visible = st.state === 'buried';
            if (!vis) continue;
            e.view.position.set(st.x, st.y + (st.state === 'buried' ? 16 : 0));
            e.view.alpha = st.state === 'dark' ? 0.25 : 1;
            e.update(dt, t, { glow: st.state === 'buried' ? 1.4 : 1, wobble: st.state === 'tree' && (G.puz.drum || 0) > 0 ? 1 : 0 });
        }
        if (S.ball) S.ball.update(dt, ballPose(G), t);
        if (S.nestEggs) {
            const placed = F.has('eggs_in_nest'), hatched = F.has('hatched');
            S.nestEggs.forEach((e, i) => {
                e.view.visible = (placed || (S.nestShown || 0) > i) && !(hatched && !(S.hatching && S.hatching.n <= i));
                e.update(dt, t, { glow: 1, wobble: S.hatching && S.hatching.n === i ? 1 : 0, cracked: !!S.hatching && S.hatching.n >= i });
            });
            S.hatchlings.forEach((k, i) => {
                const out = hatched || (S.hatching && S.hatching.n > i);
                k.k.view.visible = !!out;
                if (!out) return;
                k.t += dt;
                const x = k.home + Math.sin(t * 0.6 + i) * h(0.25), y = heightOn(G.sceneDef.surfaces.find(s => s.id === 'sand').pts, x) ?? G.sceneDef.nest.y;
                k.k.view.position.set(x, y);
                k.k.update(dt, t, { facing: Math.cos(t * 0.6 + i) > 0 ? 1 : -1, reducedMotion: rm });
            });
        }
        for (let i = S.flying.length - 1; i >= 0; i--) {
            const f = S.flying[i];
            f.t += dt / f.dur;
            const u = clamp(f.t, 0, 1), arc = Math.sin(u * Math.PI) * f.arc;
            f.e.view.position.set(lerp(f.from.x, f.to.x, u), lerp(f.from.y, f.to.y, u) - arc);
            f.e.update(dt, t, {});
            if (f.t >= 1) { f.e.destroy(); S.flying.splice(i, 1); f.done?.(); }
        }

        // actors
        const A = S.A, act = G.actors;
        const k = act.klo;
        if (k) {
            const kloActor = { ...k, pose: k.pose === 'love' ? 'happy' : k.pose === 'faint' ? 'awe' : k.pose, talking: G.speaker === 'klo' };
            A.klo.update(kloActor, { scene: S.id, time: t, dt, hero: G.player, talking: G.speaker === 'klo', reducedMotion: rm });
            A.klo.container.rotation = k.pose === 'faint' ? -1.1 : 0;
            A.hearts.view.position.set(k.x, k.y - 90);
            A.hearts.update(dt, t, A.klo.container.visible && (k.pose === 'love' || G.flags.has('watch_given') && k.pose !== 'faint'), { reducedMotion: rm });
        }
        for (const id of ['tukan', 'skata', 'dyvel', 'moln']) {
            const a = act[id], v = A[id];
            if (!a || a.scene !== S.id) { v.view.visible = false; continue; }
            v.update(dt, { ...a, talking: G.speaker === id, pose: id === 'tukan' && G.speaker === 'tukan' && a.pose === 'idle' ? 'idle' : a.pose }, t, { reducedMotion: rm, storm: stormShown });
        }
        // the hero
        if (G.speaker === 'horse' && !snap.action && !rm && !snap.hide) { snap.action = 'talk'; snap.actionT = (t * 1.5) % 1; }
        hero.update(dt, snap);
        hero.view.position.set(snap.x, snap.y);
        hero.view.visible = !G.hideHero;

        // rain and lightning (the storm is Molnet's: it rains less once the cloud is met)
        const under = snap.mode === 'swim' && snap.submerge > 0.7;
        rain.visible = stormShown > 0.03;
        const nRain = Math.round(drops.length * stormShown * (rm ? 0.35 : 1));
        for (let i = 0; i < drops.length; i++) {
            const d = drops[i], s = d.s;
            s.visible = i < nRain;
            if (!s.visible) continue;
            d.y = (d.y + dt * d.v * (rm ? 0.5 : 1.6)) % 1;
            s.position.set(((d.x + d.y * 0.15 - cam.x * cam.zoom * 0.0004) % 1 + 1) % 1 * W, d.y * H);
            s.alpha = (under ? 0.15 : 0.55) * stormShown;
        }
        if (stormShown > 0.3 && S.def.sky) {
            nextLightning -= dt;
            if (nextLightning <= 0) { lightning(0.6 * stormShown); nextLightning = (6 + hash(t, 3) * 7) / stormShown; }
        }
        flash = Math.max(0, flash - dt * 3.2);
        flashG.clear();
        if (flash > 0) flashG.rect(0, 0, W, H).fill({ color: 0xe8eeff, alpha: flash * (rm ? 0.25 : 0.5) });
        if (tooth) { tooth.width = W; tooth.height = H; }
        fade = fadeTarget > fade ? Math.min(fadeTarget, fade + dt * fadeRate) : Math.max(fadeTarget, fade - dt * fadeRate);
        fadeG.clear();
        if (fade > 0) fadeG.rect(0, 0, W, H).fill({ color: 0xfbf8f1, alpha: fade });
        for (const w of [...waiters]) if (w.test()) { waiters.delete(w); w.resolve(); }
    }

    function drawSky(W, H, night, t, dt) {
        skyG.clear();
        const top = mixColor(SKY.storm[0], SKY.moon[0], night), mid = mixColor(SKY.storm[1], SKY.moon[1], night), low = mixColor(SKY.storm[2], SKY.moon[2], night);
        const bands = 14;
        for (let i = 0; i < bands; i++) {
            const u = i / (bands - 1), c = u < 0.6 ? mixColor(top, mid, u / 0.6) : mixColor(mid, low, (u - 0.6) / 0.4);
            skyG.rect(0, Math.floor(H * i / bands), W, Math.ceil(H / bands) + 1).fill({ color: c });
        }
        // stars once the storm has passed, and a few through gaps before
        for (const s of stars.children) {
            s.x = s.position.x <= 1 ? s.position.x : s.x;
        }
        stars.children.forEach((s, i) => {
            s.position.set(hash(i, 1) * W, hash(i, 2) * H * 0.55);
            s.alpha = (night * 0.9 + 0.05) * (0.5 + 0.5 * Math.sin(t * 1.3 + s._tw)) * (G.lessMotion ? 0.8 : 1);
        });
        // the moon, where Mira drew it
        moonState.shown = lerp(moonState.shown, G.flags.has('moon') ? 1 : moonState.target, 1 - Math.exp(-1.6 * dt));
        moon.visible = moonState.shown > 0.01;
        const mp = moonScreen(W, H);
        moon.position.set(mp.x, mp.y); moon.scale.set(mp.r / 60); moon.alpha = moonState.shown;
        starsState.shown = lerp(starsState.shown, G.flags.has('alva_stars') ? 1 : 0, 1 - Math.exp(-2 * dt));
        alvaStars.visible = starsState.shown > 0.01;
        alvaStars.children.forEach((s, i) => {
            const [dx, dy, k] = s._d;
            s.position.set(mp.x + dx * mp.r, mp.y + dy * mp.r);
            s.scale.set(k * mp.r / 26 * (1 + (G.lessMotion ? 0 : 0.12 * Math.sin(t * 2.5 + i))));
            s.alpha = starsState.shown;
            s.tint = 0xffefb0;
        });
        // storm clouds drift and thin out
        for (const c of cloudShapes) {
            c.c.position.set(((c.x * (W + c.w * 2) - cam.x * cam.zoom * c.par + t * (G.lessMotion ? 2 : 8)) % (W + c.w * 2) + (W + c.w * 2)) % (W + c.w * 2) - c.w, c.y * H);
            c.c.alpha = 0.15 + 0.85 * stormShown;
        }
    }
    function moonScreen(W = app.screen.width, H = app.screen.height) {
        // below the drawing pad's prompt, so the dots to trace are never under it
        const r = Math.max(34, Math.min(W, H) * 0.09);
        return { x: W * 0.7, y: Math.max(r + 170, H * 0.27), r };
    }

    function updateCamera(dt, snap, W, H) {
        const def = S.def, b = def.bounds;
        let zoom = Math.min(W / h(11), H / h(6.2));
        zoom = Math.max(zoom, H / h(14));
        zoom = Math.min(zoom, 0.9);
        const p = G.player;
        if (p.mode === 'swim') zoom *= 0.9;
        if (S.id === 'skog' && p.x < h(26) && p.y < h(-1.5)) zoom *= 0.82; // the giant tree: see the branches above
        let tx = snap.x + (snap.facing || 1) * Math.min(h(1.6), W / zoom * 0.12), ty = snap.y - (p.mode === 'swim' ? h(0.2) : h(1.2));
        const hint = G.camHint;
        if (hint) { tx = hint.x; ty = hint.y; zoom *= hint.zoom || 1; }
        const vw = W / zoom, vh = H / zoom;
        tx = vw >= b.x1 - b.x0 ? (b.x0 + b.x1) / 2 : clamp(tx, b.x0 + vw / 2, b.x1 - vw / 2);
        ty = vh >= b.y1 - b.y0 ? (b.y0 + b.y1) / 2 : clamp(ty, b.y0 + vh / 2, b.y1 - vh / 2);
        if (cam.snap) { cam.x = tx; cam.y = ty; cam.zoom = zoom; cam.snap = false; return; }
        const k = 1 - Math.exp(-(G.lessMotion ? 3 : 4.5) * dt);
        cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k * 0.85); cam.zoom = lerp(cam.zoom, zoom, 1 - Math.exp(-2.5 * dt));
    }

    function lightning(strength = 0.6) {
        if (G.lessMotion) strength *= 0.35;
        flash = Math.max(flash, strength);
        S?.A?.moln?.flash();
        G.emit('thunder', { strength });
    }

    // --- staged moments (story fx) ------------------------------------------------------------
    function waitGame(sec) { return G.wait(sec); }
    function until(test) { return new Promise(resolve => waiters.add({ test, resolve })); }
    async function fx(name, data = {}) {
        if (!S) return;
        const sp = S.def.spots, rm = !!G.lessMotion;
        switch (name) {
            case 'focus':
                if (!data) { G.camHint = null; return; }
                G.camHint = { x: data.x, y: data.y, zoom: data.zoom || 1 };
                await waitGame(rm ? 0.3 : 0.9);
                if (data.hold) await waitGame(data.hold);
                return;
            case 'lightning': lightning(0.9); await waitGame(0.7); return;
            case 'eggsDrop': {
                const from = { x: S.def.magpie.x, y: S.def.magpie.y - 10 };
                const ids = data.ids || [];
                await Promise.all(ids.map((id, i) => new Promise(done => {
                    const e = createEgg(PIXI, pen); L.fx.addChild(e.view);
                    S.flying.push({ id, e, from: { x: from.x + i * 24, y: from.y }, to: { x: G.player.x, y: G.player.y - h(0.6) }, t: -i * 0.3, dur: rm ? 0.4 : 0.9, arc: h(0.8), done });
                })));
                emit('star', G.player.x, G.player.y - h(0.7), 10, { speed: 180, gravity: 60, life: 0.9 });
                return;
            }
            case 'eggsToNest': {
                const n = EGG_TOTAL;
                S.nestShown = 0;
                for (let i = 0; i < n; i++) {
                    const e = createEgg(PIXI, pen, 0.8); L.fx.addChild(e.view);
                    const to = { x: S.def.nest.x - 54 + i * 12, y: S.def.nest.y - 2 };
                    S.flying.push({ id: 'nest' + i, e, from: { x: G.player.x, y: G.player.y - h(0.7) }, to, t: 0, dur: rm ? 0.25 : 0.6, arc: h(0.6), done: () => { S.nestShown = i + 1; emit('star', to.x, to.y - 20, 3, { speed: 120, gravity: 40, life: 0.6 }); } });
                    await waitGame(rm ? 0.08 : 0.22);
                }
                await waitGame(0.7);
                return;
            }
            case 'cloudArrive': {
                const m = G.actors.moln, to = { x: sp.cloudSky.x, y: sp.cloudSky.y };
                const from = { x: to.x - h(9), y: to.y - h(2) };
                const dur = rm ? 0.6 : 2.2;
                let u = 0;
                m.x = from.x; m.y = from.y;
                G.camHint = { x: to.x, y: to.y + h(2.2), zoom: 0.85 };
                await until(() => { u = Math.min(1, u + 1 / 60 / dur); const e = u * u * (3 - 2 * u); m.x = lerp(from.x, to.x, e); m.y = lerp(from.y, to.y, e); return u >= 1; });
                return;
            }
            case 'moonrise': {
                moonState.target = 1;
                emit('star', G.player.x, G.player.y - h(2), 14, { speed: 260, gravity: 30, life: 1.4, spread: h(4) });
                await waitGame(rm ? 0.6 : 2.2);
                return;
            }
            case 'starsShine': {
                const mp = moonScreen();
                void mp;
                await waitGame(rm ? 0.3 : 1.2);
                return;
            }
            case 'hatch': {
                S.hatching = { n: -1 };
                for (let i = 0; i < EGG_TOTAL; i++) {
                    S.hatching.n = i;
                    await waitGame(rm ? 0.12 : 0.32);
                    const x = S.def.nest.x - 54 + i * 12;
                    emit('dust', x, S.def.nest.y - 10, 4, { speed: 120, life: 0.5, tint: 0xf7f1e3 });
                }
                S.hatching.n = EGG_TOTAL;
                await waitGame(rm ? 0.4 : 1.2);
                S.hatching = null;
                return;
            }
            case 'gift': {
                const k = G.actors.klo, tk = G.actors.tukan;
                if (k && tk) { k.facing = Math.sign(tk.x - k.x) || 1; tk.facing = -k.facing; tk.pose = 'shine'; }
                emit('star', tk ? tk.x : G.player.x, (tk ? tk.y : G.player.y) - h(0.6), 12, { speed: 200, gravity: 40, life: 1 });
                await waitGame(rm ? 0.4 : 1.4);
                if (tk) tk.pose = 'happy';
                return;
            }
            case 'fadeOut': fadeTarget = 1; fadeRate = data.rate || 2.5; await until(() => fade >= 1); return;
            case 'fadeIn': fadeTarget = 0; fadeRate = data.rate || 2; await until(() => fade <= 0); return;
            default: return;
        }
    }

    // --- events for little effects ----------------------------------------------------------
    const offs = [
        G.on('egg', () => { emit('star', G.player.x, G.player.y - h(0.7), 9, { speed: 220, gravity: 80, life: 0.9 }); }),
        G.on('splashIn', (e) => emit('drop', e.x, e.y, Math.round(6 + (e.size || 0.5) * 10), { speed: 320, cone: 1.4 })),
        G.on('splashOut', (e) => emit('drop', e.x, e.y, 5, { speed: 220 })),
        G.on('drum', () => { if (S?.cocoa) emit('leaf', S.cocoa.x + (Math.random() - 0.5) * h(2), S.cocoa.y - h(4.2), 2, { speed: 60, gravity: 90, life: 1.6, cone: 3 }); cam.shake = 4; }),
        G.on('eggFall', () => { if (S?.cocoa) emit('leaf', S.cocoa.x, S.cocoa.y - h(4), 10, { speed: 140, gravity: 120, life: 1.6, cone: 3 }); }),
        G.on('push', (e) => emit('dust', e.x, G.player.y, 5, { speed: 120, gravity: 200 })),
        G.on('ballSplash', () => { const b = G.scenes.strand.ball; emit('drop', b.stopX, 0, 14, { speed: 360 }); }),
        G.on('dug', ({ id }) => { const egg = S?.eggs.get(id)?.egg; if (egg) emit('dust', egg.x, egg.y, 12, { speed: 240, gravity: 500, tint: 0xe6d2a2 }); }),
        G.on('coin', () => emit('star', G.player.x, G.player.y - h(0.4), 12, { speed: 200, gravity: 0, life: 1.1 })),
        G.on('seedsLit', () => emit('star', h(89.8), h(-1.0), 12, { speed: 160, gravity: -20, life: 1.6 })),
        G.on('vine', () => emit('leaf', h(37), h(-1.2), 10, { speed: 120, gravity: 100, life: 1.2, cone: 3 })),
        G.on('land', (e) => { if (e.big || e.id === 'leap-p7') { cam.shake = 10; emit('dust', e.x, e.y, 14, { speed: 260, gravity: 400 }); } }),
        G.on('streckDone', () => { emit('star', G.player.x, G.player.y - h(0.4), 8, { speed: 160, gravity: 60 }); }),
        G.on('dolphin', (e) => emit('drop', e.x, e.y, 10, { speed: 300 })),
        G.on('paddle', (e) => { if (!e.surface && Math.random() < 0.4) emit('bubble', e.hoofX, e.hoofY, 1, { speed: 60, gravity: -120, life: 1.2 }); })
    ];

    return {
        world, cam,
        get sceneId() { return S?.id || null; },
        setScene(id, { keepCam = false } = {}) { buildScene(id); if (!keepCam) cam.snap = true; },
        setCloudTexture(tex) { cloudTexture = tex; },
        render, fx, lightning, emit,
        moonScreen: () => moonScreen(),
        fadeNow(v) { fade = fadeTarget = v; },
        heroScreen() {
            const p = hero.view;
            return { x: world.position.x + p.x * cam.zoom, y: world.position.y + p.y * cam.zoom, scale: cam.zoom, facing: G.player.facing };
        },
        toScreen(x, y) { return { x: world.position.x + x * cam.zoom, y: world.position.y + y * cam.zoom }; },
        speakerBounds(who) {
            if (!S) return null;
            if (who === 'horse') return hero.view.getBounds();
            if (who === 'klo') return S.A.klo.container.visible ? S.A.klo.headBounds() : null;
            const v = S.A[who]?.view;
            return v?.visible ? v.getBounds() : null;
        },
        resize() { if (tooth) { tooth.width = app.screen.width; tooth.height = app.screen.height; } },
        destroy() {
            destroyed = true;
            for (const off of offs) off();
            for (const w of waiters) w.resolve();
            waiters.clear();
            clearScene();
            hero?.destroy?.(); hero = null;
            for (const t of Object.values(TX)) t.destroy(true);
            for (const f of farSprites) f.t.texture.destroy(true);
            root.destroy({ children: true });
        }
    };
}
