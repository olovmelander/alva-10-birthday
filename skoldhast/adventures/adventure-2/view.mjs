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
import { createAir, MOODS } from '../../src/atmosphere.mjs';
import { createWaterLight } from '../../src/scenery.mjs';
import { createKlo } from '../../src/klo.mjs';
import { createTukan, createMagpie, createBeetle, createBall, createCloud, createEgg, createHatchling, createCoin, createNest, createHearts, PAL, INK } from './characters.mjs';
import { eggState, ballPose, glitterPose } from './puzzles.mjs';
import { EGG_TOTAL } from './content/world.mjs';

const h = (v) => v * HL;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const EGG_SCALE = 1.5; // eggs in the world (the nest's are smaller)
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
const SKY = { storm: [0x2a2d4a, 0x4b4d72, 0x6e6a8e], moon: [0x1f2b4f, 0x3d5282, 0x8a8fb8],
    peak: [0x1c1d34, 0x34355a, 0x5a5679], cave: [0x14131d, 0x1d1b2a, 0x262336] };
const ENV_TINT = { storm: 0xb9bedb, moon: 0xe6eaf7, cave: 0xb2aed4 };
// a dashed drawing in the colour of what it becomes: Mira's wooden planks, crystal, or light
const DASH_TONE = {
    wood: { dash: 0xb79be6, glow: 0xd9c8ff, ink: 0xb88d5c, edge: 0x5b3c22 },
    crystal: { dash: 0x8fc9f0, glow: 0xcfeaff, ink: 0x9fd8ff, edge: 0x2f5a7e },
    light: { dash: 0xf3c94a, glow: 0xfff0b0, ink: 0xffe27a, edge: 0xb8862c }
};

export function createView(PIXI, app, { assets, G, heroFactory, eggTarget = null }) {
    const T = (name) => assets.tex(name);
    const pen = pencilStyle(T);
    const RAW = PIXI;
    PIXI = pencilPixi(PIXI, T);
    let destroyed = false;
    const root = new PIXI.Container();
    app.stage.addChild(root);
    const skyLayer = new PIXI.Container();
    const farLayer = new PIXI.Container();
    // Mira's moon and Alva's stars: in front of the distant forest and Åsktoppen, which hid them on
    // phones (the mountain in portrait, the forest bands in landscape), but behind the air and the world
    const moonLayer = new PIXI.Container(); moonLayer.label = 'moon-layer';
    const world = new PIXI.Container(); world.label = 'world';
    const overlay = new PIXI.Container();
    const atmoBack = new RAW.Container(), atmoFront = new RAW.Container();
    root.addChild(skyLayer, farLayer, moonLayer, atmoBack, world, atmoFront, overlay);
    const atmo = createAir(RAW, app, { back: atmoBack, front: atmoFront });
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
    let flash = 0, nextLightning = 4, rainLevel = 0;
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
        // Alva's stars: five points, as she draws them, pale gold with a pencil edge and a soft halo (they were thick
        // flat yellow crosses, 5 November)
        alvaStar: texFrom(g => {
            for (let i = 5; i >= 1; i--) g.circle(0, 0, 6 + i * 3.2).fill({ color: 0xfff1b0, alpha: 0.06 });
            const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.6 : 11; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
            g.poly(pts).fill({ color: 0xffe9a0 }).stroke({ width: 1.4, color: 0x8a6a2a, alpha: 0.85 });
            g.circle(-1.5, -2, 1.6).fill({ color: 0xffffff, alpha: 0.9 });
        }, 44, 44),
        mote: texFrom(g => { for (let i = 6; i >= 1; i--) g.circle(0, 0, i * 2.2).fill({ color: 0xfff1b0, alpha: 0.07 }); g.circle(0, 0, 2.4).fill({ color: 0xfffbe6 }); }, 30, 30),
        leaf: texFrom(g => g.moveTo(-7, 0).quadraticCurveTo(0, -6, 7, 0).quadraticCurveTo(0, 6, -7, 0).fill({ color: 0x6f9a4f }).stroke({ width: 1, color: 0x3f5f33 }), 18, 14),
        bubble: texFrom(g => g.circle(0, 0, 4.5).stroke({ width: 1.3, color: 0xcfe6ef, alpha: 0.9 }), 12, 12),
        dust: texFrom(g => g.circle(0, 0, 3).fill({ color: 0xc9b58f, alpha: 0.85 }), 8, 8),
        // a soft contact shadow, so the characters stand on the ground
        shadow: texFrom(g => { for (let i = 6; i >= 1; i--) g.ellipse(0, 0, i * 9.5, i * 2.4).fill({ color: 0x1a1424, alpha: 0.075 }); }, 124, 32)
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
    // after the story a star may fall from Alva's stars over Åsktoppen's summit (fx 'starFall')
    const shootG = new RAW.Graphics(); moonLayer.addChild(shootG);
    let shooting = null;
    const moon = new PIXI.Container(); moon.label = 'moon'; moonLayer.addChild(moon);
    const moonGlow = new RAW.Sprite(TX.mote); moonGlow.anchor.set(0.5); moonGlow.scale.set(9); moonGlow.alpha = 0.55; moonGlow.tint = 0xfff2c4;
    const moonG = new PIXI.Graphics();
    moonG.circle(0, 0, 60).fill(pen.fill(0xf8ebb4)).stroke(pen.line(0xb79a4a, 3));
    moonG.circle(-18, -14, 11).fill(pen.hatch(0xe2cf86, 0.9)); moonG.circle(16, 12, 15).fill(pen.hatch(0xe2cf86, 0.8)); moonG.circle(20, -22, 6).fill(pen.hatch(0xe2cf86, 0.8));
    moonG.moveTo(-40, 30).quadraticCurveTo(-10, 52, 30, 44).stroke(pen.line(0xc9b064, 2, 0.6));
    moon.addChild(moonGlow, moonG);
    moon.visible = false;
    const moonState = { shown: 0, target: 0, rise: 0 };
    // the stars Alva draws round Mira's moon
    const alvaStars = new RAW.Container(); alvaStars.visible = false; moonLayer.addChild(alvaStars);
    const ALVA_STARS = [[-2.6, 0.3, 1.9], [-1.4, -0.9, 1.1], [1.5, -0.7, 1.3], [2.3, 0.6, 1.0], [-3.6, -0.6, 0.9], [0.4, 1.7, 0.8]];
    for (const [dx, dy, k] of ALVA_STARS) { const s = new RAW.Sprite(TX.alvaStar); s.anchor.set(0.5); s._d = [dx, dy, k]; alvaStars.addChild(s); }
    const starsState = { shown: 0 };
    const stormClouds = new PIXI.Container(); skyLayer.addChild(stormClouds);
    const cloudShapes = [];
    for (let i = 0; i < 6; i++) {
        // a storm cloud in pencil: a heavy dark belly, billows on top lit from above, a ragged fringe of rain-cloud
        const c = new PIXI.Graphics();
        const w = 260 + hash(i, 5) * 260;
        const lobes = 6 + Math.floor(hash(i, 6) * 4);
        const L2 = [];
        for (let k = 0; k < lobes; k++) {
            const u = k / (lobes - 1), x = (u - 0.5) * w, r = 44 + hash(i * 7 + k, 7) * 52;
            L2.push([x, -Math.sin(u * Math.PI) * r * 0.75 + (hash(i * 3 + k, 8) - 0.5) * 16, r]);
        }
        c.ellipse(0, 18, w * 0.56, 38).fill(pen.fill(0x3c3a58, 0.95)); // the belly
        for (const [x, y, r] of L2) c.circle(x, y, r).fill(pen.fill(0x56537a, 0.96));
        for (const [x, y, r] of L2) c.circle(x + r * 0.08, y - r * 0.12, r * 0.78).fill(pen.fill(0x6a678e, 0.9));
        for (const [x, y, r] of L2) c.ellipse(x + r * 0.15, y - r * 0.45, r * 0.55, r * 0.3).fill(pen.hatch(0xa8a6c8, 0.75));
        // the outline only along the top, broken like a quick pencil
        for (const [x, y, r] of L2) c.arc(x, y, r, Math.PI * 1.08, Math.PI * 1.92).stroke(pen.line(0x24223a, 2.2, 0.6));
        c.ellipse(0, 22, w * 0.5, 22).fill(pen.hatch(0x2a2844, 0.7));
        for (let k = 0; k < 9; k++) { const x = (hash(i * 11 + k, 9) - 0.5) * w * 0.9; c.moveTo(x, 30).lineTo(x - 10, 62 + hash(k, i) * 30).stroke(pen.line(0x4a4870, 3, 0.35)); }
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
    // jagged mountains for the peak; a cave's far wall with its glints
    function ridgeBand(color, baseH, seed, kind) {
        const c = new PIXI.Graphics();
        const W = 4200, step = kind === 'cave' ? 70 : 140, ridge = [[0, 0]];
        for (let x = 0; x <= W; x += step) {
            const r = hash(x, seed);
            if (kind === 'cave') ridge.push([x + (hash(x, seed + 5) - 0.5) * step * 0.5, -baseH * (0.3 + r * 0.6)], [x + step * (0.35 + hash(x, seed + 6) * 0.3), -baseH * (0.08 + r * 0.2)]);
            else ridge.push([x, -baseH * (0.4 + r * 0.7)], [x + step * 0.45, -baseH * (0.2 + hash(x, seed + 1) * 0.3)]);
        }
        poly(c, [...ridge, [W, 0], [W, 900], [0, 900]]).fill(pen.fill(color));
        lineAlong(c, ridge).stroke(pen.line(mixColor(color, 0x101020, 0.5), 2.4, 0.8));
        if (kind === 'peak') for (let x = 0; x <= W; x += step) {
            const y = -baseH * (0.4 + hash(x, seed) * 0.7);
            c.moveTo(x - 18, y + 22).lineTo(x, y).lineTo(x + 16, y + 20).stroke(pen.line(0xd9dcec, 3, 0.55));
        }
        if (kind === 'cave') {
            // The far wall is crystal, not a row of fir trees (5 November): each spike gets a pale facet down one
            // side and a darker one down the other; some catch the light at their tips, in the cave's three colours
            const tints = [0xb79be6, 0x8fc9f0, 0xe6a6d8];
            for (let i = 1; i < ridge.length - 1; i += 2) {
                const [px, py] = ridge[i - 1], [tx, ty] = ridge[i], [nx, ny] = ridge[i + 1];
                const midL = [(px + tx) / 2, (py + ty) / 2 + baseH * 0.08], midR = [(tx + nx) / 2, (ty + ny) / 2 + baseH * 0.08];
                c.poly([px, py, tx, ty, ...midL]).fill({ color: 0xffffff, alpha: 0.1 });
                c.poly([tx, ty, nx, ny, ...midR]).fill({ color: 0x05040a, alpha: 0.18 });
                c.moveTo(tx, ty).lineTo((tx + midL[0]) / 2 + 4, (ty + midL[1]) / 2 + 10).stroke(pen.line(0xe8e4ff, 1.4, 0.35));
                if (hash(tx, seed + 7) > 0.72) {
                    const col = tints[Math.floor(hash(tx, seed + 8) * 3)];
                    c.poly([tx, ty, tx - 7, ty + 22, tx + 7, ty + 22]).fill({ color: col, alpha: 0.6 });
                    for (let r = 3; r >= 1; r--) c.circle(tx, ty + 8, 6 + r * 6).fill({ color: col, alpha: 0.05 });
                }
            }
            for (let k = 0; k < 60; k++) {
                const x = hash(k, seed + 3) * W, y = -baseH * (0.1 + hash(k, seed + 4) * 0.4);
                c.poly([x, y, x + 5, y - 11, x + 10, y]).fill({ color: 0x9fd8ff, alpha: 0.55 });
            }
        }
        return { c, W };
    }
    function farSet(bands, pars) {
        return bands.map(({ c, W }, i) => {
            const b = c.getLocalBounds();
            const tex = app.renderer.generateTexture({ target: c, resolution: 1.25 });
            c.destroy();
            const t = new RAW.TilingSprite({ texture: tex, width: 100, height: tex.height });
            farLayer.addChild(t);
            return { t, par: pars[i], top: -b.y, h: tex.height, W };
        });
    }
    const farForest = farSet([farBand(0x4d5a7c, 0x2c3552, 190, 3), farBand(0x3d5c5a, 0x22393a, 130, 9)], [0.14, 0.3]);
    const farPeaks = farSet([ridgeBand(0x3b3c5e, 300, 5, 'peak'), ridgeBand(0x2b2c47, 190, 11, 'peak')], [0.08, 0.2]);
    const farCave = farSet([ridgeBand(0x2a2838, 260, 7, 'cave'), ridgeBand(0x34314a, 160, 13, 'cave')], [0.12, 0.28]);
    const farSprites = [...farForest, ...farPeaks, ...farCave];
    // Åsktoppen on the eastern horizon, with the storm swirling round its top (until the cloud is met)
    const peak = new PIXI.Container(); peak.label = 'asktoppen';
    const peakG = new PIXI.Graphics();
    let peakArt;
    {
        // lit from the upper right, like everything on these pages: shoulders in the haze, then the jagged
        // mass, a dark face and a lit one, cracks, snow in the gullies, the falls at its foot and mist
        const ridge = (pts, fill, line) => peakG.poly(pts.flat()).fill(fill).stroke(line);
        ridge([[-430, 0], [-338, -116], [-292, -148], [-246, -116], [-196, -188], [-150, -158], [-100, -60], [-60, 0]], pen.fill(0x4e5178, 0.8), pen.line(0x34365a, 1.8, 0.6));
        ridge([[60, 0], [132, -148], [176, -204], [206, -170], [264, -232], [302, -180], [348, -118], [440, 0]], pen.fill(0x4e5178, 0.8), pen.line(0x34365a, 1.8, 0.6));
        const mass = [[-300, 0], [-252, -62], [-226, -52], [-178, -128], [-150, -118], [-112, -204], [-88, -196], [-58, -276], [-36, -268], [-14, -338], [0, -372],
            [16, -334], [34, -344], [58, -272], [84, -286], [112, -214], [146, -226], [176, -136], [212, -150], [250, -66], [270, -74], [310, 0]];
        ridge(mass, pen.fill(0x3e4063), pen.line(0x1e2036, 2.6, 0.85));
        const dark = [[0, -372], [-14, -338], [-36, -268], [-58, -276], [-88, -196], [-112, -204], [-150, -118], [-178, -128], [-226, -52], [-252, -62], [-300, 0],
            [-58, 0], [-26, -116], [-48, -188], [-8, -262], [-22, -318]];
        peakG.poly(dark.flat()).fill(pen.fill(0x2a2b47, 0.92));
        peakG.poly(dark.flat()).fill(pen.hatch(0x171829, 0.5));
        const lit = [[0, -372], [16, -334], [34, -344], [58, -272], [84, -286], [112, -214], [146, -226], [122, -150], [72, -188], [48, -250], [22, -278], [8, -322]];
        peakG.poly(lit.flat()).fill(pen.fill(0x5b5e8a, 0.9));
        peakG.poly(lit.flat()).fill(pen.hatch(0x8c8fb8, 0.45));
        for (const crack of [[[-22, -318], [-8, -262], [-48, -188], [-26, -116], [-58, 0]], [[48, -250], [30, -176], [64, -110], [44, -30]], [[122, -150], [104, -92], [136, -40]],
            [[-130, -150], [-112, -96], [-140, -40]], [[-196, -96], [-180, -44]], [[190, -108], [206, -44]]]) {
            lineAlong(peakG, crack).stroke(pen.line(0x171829, 2.2, 0.7));
        }
        const snow = (pts) => peakG.poly(pts.flat()).fill(pen.fill(0xe4e7f4, 0.9));
        snow([[0, -372], [16, -334], [32, -316], [18, -302], [8, -316], [-4, -294], [-14, -314], [-24, -300], [-32, -316], [-14, -338]]);
        snow([[-14, -338], [-30, -312], [-36, -268], [-58, -276], [-70, -244], [-88, -196], [-98, -206], [-78, -262], [-56, -292], [-38, -286]]);
        snow([[16, -334], [34, -344], [58, -272], [84, -286], [112, -214], [100, -222], [80, -262], [60, -250], [44, -296], [30, -310]]);
        snow([[-112, -204], [-126, -172], [-150, -118], [-158, -128], [-136, -180]]);
        snow([[112, -214], [146, -226], [162, -176], [146, -188], [130, -196]]);
        // the falls: the way in is behind them
        lineAlong(peakG, [[-34, -78], [-30, -46], [-34, -14], [-30, 0]]).stroke(pen.line(0xb9c6de, 4, 0.75));
        for (let k = 0; k < 7; k++) peakG.ellipse(-300 + k * 100, -6 - hash(k, 201) * 14, 96, 20).fill({ color: 0xaab0cc, alpha: 0.13 });
        const b = peakG.getLocalBounds(), tex = app.renderer.generateTexture({ target: peakG, resolution: 2 });
        peakG.destroy();
        peakArt = new RAW.Sprite(tex); peakArt.position.set(b.x, b.y);
    }
    // the whirl lies flat round the top, seen from the side, so it turns instead of tipping over
    const swirlTilt = new PIXI.Container(); swirlTilt.position.set(0, -384); swirlTilt.scale.set(1, 0.34);
    const swirl = new PIXI.Container(); swirlTilt.addChild(swirl);
    const swirlG = new PIXI.Graphics();
    for (let k = 0; k < 14; k++) {
        const a = k / 14 * Math.PI * 2, r = 184 + hash(k, 211) * 56, R = 44 + hash(k, 212) * 26, x = Math.cos(a) * r, y = Math.sin(a) * r;
        swirlG.circle(x, y, R).fill(pen.fill(k % 2 ? 0x4b4870 : 0x3d3a5e, 0.96)).stroke(pen.line(0x24223a, 2, 0.7));
        swirlG.circle(x - R * 0.25, y - R * 0.3, R * 0.5).fill(pen.hatch(0x8f8cb4, 0.55));
    }
    swirlG.circle(0, 0, 140).fill(pen.fill(0x2e2c4c, 0.82));
    for (let k = 0; k < 3; k++) {
        const pts = [];
        for (let a = 0; a < Math.PI * 3; a += 0.2) { const r = 24 + a * 20; pts.push([Math.cos(a + k * 2.1) * r, Math.sin(a + k * 2.1) * r]); }
        swirlG.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) swirlG.lineTo(x, y);
        swirlG.stroke(pen.line(k ? 0x9a96c6 : 0x2e2c4c, 10, 0.75));
    }
    swirl.addChild(swirlG);
    const peakBolt = new PIXI.Graphics();
    peakBolt.moveTo(10, -380).lineTo(-12, -330).lineTo(6, -330).lineTo(-16, -270).stroke(pen.line(0xffe46b, 5));
    peakBolt.visible = false;
    // mist drifting across the mountain's flanks (6 November: the same bare mountain stood in nearly every view): a
    // few soft bands that slowly drift and part, so it never looks quite the same twice
    const peakMist = [];
    const mistLayer = new PIXI.Container();
    for (let k = 0; k < 4; k++) {
        const g = new PIXI.Graphics(), w = 220 + hash(k, 221) * 160, y = -230 + k * 52 + hash(k, 222) * 20;
        for (let i = 0; i < 6; i++) g.ellipse((i - 2.5) * w * 0.28, (hash(k + i, 223) - 0.5) * 14, w * 0.32, 16 + hash(k + i, 224) * 10).fill({ color: 0xc8cbe6, alpha: 0.07 });
        g.position.set((hash(k, 225) - 0.5) * 200, y);
        mistLayer.addChild(g); peakMist.push({ g, x0: g.x, o: hash(k, 226) * 6, v: 0.04 + hash(k, 227) * 0.05, w });
    }
    peak.addChild(peakArt, swirlTilt, mistLayer, peakBolt);
    skyLayer.addChild(peak);
    let peakVista = 0, peakVistaOn = false; // the view from the crown (fx focus with peak)
    // a bolt across the sky when lightning strikes
    const skyBolt = new PIXI.Graphics(); skyBolt.visible = false; skyLayer.addChild(skyBolt);
    let boltT = 0;
    // the sky is drawn in pencil too: crossing strokes over the colour
    const skyHatch = new RAW.TilingSprite({ texture: RAW.Texture.EMPTY, width: 100, height: 100 });
    skyHatch.alpha = 0.18; skyHatch.tint = 0xc9cbe8;
    skyLayer.addChildAt(skyHatch, 1);

    // --- screen overlays: rain, the flash, the paper tooth, fades ------------------------------
    const rain = new RAW.Container(); overlay.addChild(rain);
    const drops = [];
    for (let i = 0; i < 90; i++) {
        const s = new RAW.Sprite(TX.streak); s.anchor.set(0.5); rain.addChild(s);
        // drops of different lengths, the faster ones longer (they were all one length, 6 November)
        const v = 0.7 + hash(i, 13) * 0.6;
        s.scale.y = 0.7 + (v - 0.7) * 0.9 + hash(i, 14) * 0.25;
        drops.push({ s, x: hash(i, 11), y: hash(i, 12), v });
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
        // bark is drawn in pencil over its colour, not on the wood planks' grain
        if (name === 'bark') return pen.fill(0x6a4c32, alpha);
        const [img, color] = MAT[name] || [null, 0xbbbbbb];
        return pen.material(img, alpha, color);
    }
    // soft darkness painted once: 'down' fades in from the top, 'side' from the left, 'solid' is even;
    // every kind has ragged, hatched edges so no ruled rectangle shows
    const SHADE = {};
    function shadeTexture(kind) {
        if (SHADE[kind] || typeof document === 'undefined') return SHADE[kind] || RAW.Texture.WHITE;
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
        const c = cv.getContext('2d'), img = c.createImageData(256, 256);
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
            const u = x / 255, v = y / 255, n = hash(x * 0.37 + y * 1.13, 5) * 0.08;
            const edgeX = Math.min(1, Math.min(u, 1 - u) / (0.1 + hash(y >> 3, 6) * 0.06)), edgeY = Math.min(1, Math.min(v, 1 - v) / 0.12);
            let a = kind === 'down' ? Math.min(1, v / 0.55) ** 1.4 * edgeX : kind === 'side' ? (1 - u) ** 1.3 * edgeY : edgeX * Math.min(1, (1 - v) / 0.06);
            a = Math.max(0, Math.min(1, a - n));
            const i = (y * 256 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
        }
        c.putImageData(img, 0, 0);
        // a few pencil strokes across it, as if the dark was shaded in by hand
        c.globalCompositeOperation = 'destination-out'; c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1.4;
        for (let k = 0; k < 90; k++) { const x = hash(k, 7) * 256, y = hash(k, 8) * 256; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y + 26); c.stroke(); }
        SHADE[kind] = RAW.Texture.from(cv);
        return SHADE[kind];
    }
    function softDark(kind, x0, y0, x1, y1, { color = 0x05040a, alpha = 0.9, mirror = false } = {}) {
        const sp = new RAW.Sprite(shadeTexture(kind));
        sp.tint = color; sp.alpha = alpha;
        sp.position.set(mirror ? x1 : x0, y0); sp.width = x1 - x0; sp.height = y1 - y0;
        if (mirror) sp.scale.x *= -1;
        return sp;
    }
    function poly(gr, pts) { gr.poly(pts.flat()); return gr; }
    function lineAlong(gr, pts) { gr.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) gr.lineTo(pts[i][0], pts[i][1]); return gr; }
    function offset(pts, dy) { return pts.map(([x, y]) => [x, y + dy]); }

    function clearScene() {
        if (!S) return;
        // a coin still flying lives in L.fx, which is about to be destroyed: end its flight (and its waiting beat) first
        if (coinFlight) { const c = coinFlight; coinFlight = null; c.done?.(); }
        // and eggs still flying somewhere end their flights, so a beat waiting for them goes on
        for (const f of S.flying || []) f.done?.();
        // every scene display (and its actors) lives in these layers; the hero is kept
        for (const l of Object.values(L)) if (l !== L.hero) l.removeChildren().forEach(c => c.destroy({ children: true }));
        parts.length = 0;
        S = null;
    }

    function buildScene(id) {
        clearScene();
        const def = G.scenes[id];
        atmo.setMood(moodFor(def.sky, G.storm ?? 1), { instant: true });
        S = { id, def, actors: [], eggs: new Map(), surfaces: new Map(), when: [], dashed: new Map(), anim: [] };
        const bottom = def.bounds.y1 + h(4);
        // water bodies (behind the ground, so the bed hides what is under it)
        for (const w of def.waters || []) {
            const wb = w.kind === 'pipe' ? w.bottom : bottom; // the spring's column ends in its pool
            const gw = new PIXI.Graphics();
            if (w.kind === 'pipe') {
                // the spring's column: water with wavering sides, not a ruled box (5 November)
                const side = (x, ph) => { const pts = []; for (let y = w.top; y <= wb; y += h(0.2)) pts.push([x + Math.sin(y / HL * 2.3 + ph) * 13 + Math.sin(y / HL * 6.1 + ph) * 5, y]); return pts; };
                const body = [...side(w.x0, 0), ...side(w.x1, 1.7).reverse()];
                poly(gw, body).fill({ color: 0x3f6f8e, alpha: 0.85 });
                poly(gw, body).fill(pen.material('mat-water', 0.35, 0x5d8eaa));
                L.water.addChild(gw);
            } else {
            gw.rect(w.x0, w.top, w.x1 - w.x0, wb - w.top).fill(material('wetsand', 0));
            gw.rect(w.x0, w.top, w.x1 - w.x0, wb - w.top).fill({ color: 0x3f6f8e, alpha: 0.85 });
            gw.rect(w.x0, w.top, w.x1 - w.x0, wb - w.top).fill(pen.material('mat-water', 0.35, 0x5d8eaa));
            // deeper is darker: each band lies over the ones above it
            for (let k = 0; k < 9; k++) gw.rect(w.x0, w.top + h(0.45) * (k + 1), w.x1 - w.x0, wb - w.top - h(0.45) * (k + 1)).fill({ color: 0x0f2436, alpha: 0.07 });
            gw.rect(w.x0, w.top, w.x1 - w.x0, h(0.35)).fill({ color: 0x9cc8de, alpha: 0.16 }); // the lit skin of the water
            L.water.addChild(gw);
            }
            // the surface: a pencil line and its light
            const surf = new PIXI.Graphics();
            // a gentle wave you can see at play zoom (at 4 units it read as a ruled line, 5 November)
            const wave = resampleX([[w.x0, w.top], [w.x1, w.top]], 40).map(([x, y], i) => [x, y + Math.sin(i * 0.9) * 7 + Math.sin(i * 0.37) * 4]);
            lineAlong(surf, wave).stroke(pen.line(0x2c5776, 3, 0.9));
            lineAlong(surf, offset(wave, 7)).stroke(pen.line(0xb7d6e6, 2, 0.5));
            L.waterFront.addChild(surf);
            // pencil glints on the surface (as on Äventyr 1's sea), and the moon's path once it is drawn
            if (w.kind !== 'pipe') {
                const wl = createWaterLight(RAW, w);
                L.waterFront.addChild(wl.view);
                S.waterLights = S.waterLights || []; S.waterLights.push(wl);
                if (!S.moonPath && def.id === 'strand') {
                    S.moonPath = new RAW.Container(); L.waterFront.addChild(S.moonPath);
                    for (let k = 0; k < 12; k++) {
                        const m = new PIXI.Graphics();
                        m.moveTo(-1, 0).lineTo(1, 0).stroke(pen.line(0xfff1c0, 3.2, 0.9));
                        S.moonPath.addChild(m);
                    }
                }
            }
            const front = new PIXI.Graphics();
            if (w.kind === 'pipe') {
                const side = (x, ph) => { const pts = []; for (let y = w.top + 6; y <= wb; y += h(0.2)) pts.push([x + Math.sin(y / HL * 2.3 + ph) * 13 + Math.sin(y / HL * 6.1 + ph) * 5, y]); return pts; };
                poly(front, [...side(w.x0, 0), ...side(w.x1, 1.7).reverse()]).fill({ color: 0x3d6d8f, alpha: 0.28 });
            }
            else {
                // only over the water itself: down to its bed, never over the banks
                // where solid ground stands above the water's surface (a bank, a rock wall inside the water's
                // span) there is no water: the veil stops at the surface (it used to run down over the rock as a
                // pale ruled strip, 5 November)
                const bedAt = (x) => {
                    let best = wb;
                    for (const q of def.surfaces) {
                        if (q.thin || q.hidden || x < q.pts[0][0] || x > q.pts.at(-1)[0]) continue;
                        const y = heightOn(q.pts, x);
                        if (y === null) continue;
                        if (y <= w.top + 6) return w.top + 2;
                        if (y < best) best = y;
                    }
                    return best;
                };
                const xs = resampleX([[w.x0, 0], [w.x1, 0]], 24).map(([x]) => x);
                const veil = [...xs.map(x => [x, w.top + 6]), ...xs.slice().reverse().map(x => { const b = bedAt(x); return [x, b <= w.top + 2 ? w.top + 6 : Math.max(w.top + 6, b + 4)]; })];
                poly(front, veil).fill({ color: 0x3d6d8f, alpha: 0.28 });
            }
            L.waterFront.addChildAt(front, 0);
            // In Kristallgrottan the lit cave water: soft shafts of crystal light slanting down from the surface,
            // and specks drifting in them (before, the lake was one flat blue box)
            if (def.underground && w.kind !== 'pipe' && w.x1 - w.x0 > h(4)) {
                const rays = new PIXI.Graphics();
                const n = Math.max(3, Math.round((w.x1 - w.x0) / h(3.2)));
                for (let k = 0; k < n; k++) {
                    const x = lerp(w.x0, w.x1, (k + 0.5) / n) + (hash(k, w.x0) - 0.5) * h(1.2), wTop = h(0.35 + hash(k, 31) * 0.35), len = h(2.6 + hash(k, 32) * 1.6);
                    rays.poly([x - wTop, w.top + 8, x + wTop, w.top + 8, x + wTop * 1.9 + h(0.7), w.top + len, x - wTop * 0.6 + h(0.7), w.top + len]).fill({ color: 0xcfeaff, alpha: 0.07 });
                }
                rays.blendMode = 'add';
                L.water.addChild(rays);
                for (let k = 0; k < 10; k++) twinkleAt(lerp(w.x0, w.x1, hash(k, 41)), w.top + h(0.6 + hash(k, 42) * 2.2), 0.2 + hash(k, 43) * 0.2, 0xdff2ff, L.water);
            }
            // gentle current marks in the river
            if (w.kind === 'river') {
                const cur = new PIXI.Container(); L.water.addChild(cur);
                for (let k = 0; k < 9; k++) {
                    const c = new PIXI.Graphics();
                    c.moveTo(0, 0).quadraticCurveTo(h(0.4), -8, h(0.8), 0).stroke(pen.line(0x9cc3d8, 2, 0.5));
                    c.position.set(w.x0 + (w.x1 - w.x0) * hash(k, 21), w.top + h(0.4 + hash(k, 22) * 1.2));
                    cur.addChild(c); S.anim.push({ kind: 'current', c, x0: w.x0, x1: w.x1, v: 60 + hash(k, 23) * 40 });
                }
                // life on the river's bed (the deep river was an empty blue field over bare sand, 5 November):
                // weed swaying in the current, pebbles, a sunken branch, and a few small fish
                const bed = def.surfaces.find(q => q.underwater && q.pts[0][0] < w.x1 && q.pts.at(-1)[0] > w.x0);
                if (bed) {
                    const life = new PIXI.Graphics(); L.water.addChild(life);
                    const at = (x) => heightOn(bed.pts, x);
                    for (let x = bed.pts[0][0] + h(1.2); x < bed.pts.at(-1)[0] - h(1.2); x += h(0.6) + hash(x, 161) * h(1.1)) {
                        const y = at(x); if (y === null || y < w.top + h(0.9)) continue;
                        if (hash(x, 162) > 0.55) { // a pebble or two
                            for (let k = 0; k < 2; k++) life.ellipse(x + k * 16, y - 4, 9 + hash(x + k, 163) * 8, 6).fill(pen.fill(k ? 0x7d7a6e : 0x948f80, 0.95)).stroke(pen.line(0x3e3c36, 1.2, 0.7));
                            continue;
                        }
                        const weed = new PIXI.Graphics(), tall = h(0.5 + hash(x, 164) * 0.9);
                        for (let k = 0; k < 3; k++) weed.moveTo((k - 1) * 6, 0).bezierCurveTo((k - 1) * 10 + 8, -tall * 0.35, (k - 1) * 4 - 8, -tall * 0.7, (k - 1) * 8 + 4, -tall).stroke(pen.line(k % 2 ? 0x4f7d55 : 0x3d6646, 3.2, 0.8));
                        weed.position.set(x, y); L.water.addChild(weed);
                        S.anim.push({ kind: 'sway', c: weed, o: hash(x, 165) * 6 });
                    }
                    // a sunken branch lying across the slope
                    const bx = lerp(bed.pts[0][0], bed.pts.at(-1)[0], 0.68), by = at(bx);
                    if (by !== null) {
                        life.moveTo(bx - h(0.9), by - 6).quadraticCurveTo(bx, by - h(0.35), bx + h(1.1), by - 10).stroke(pen.line(0x4e3a24, 9, 0.9));
                        life.moveTo(bx + h(0.2), by - h(0.18)).lineTo(bx + h(0.5), by - h(0.55)).stroke(pen.line(0x4e3a24, 5, 0.9));
                    }
                    for (let k = 0; k < 4; k++) {
                        const fish = new PIXI.Graphics(), col = [0xe0a15a, 0xc6dbe8, 0xf0cd78, 0xb4d2a8][k];
                        fish.ellipse(0, 0, 16, 7).fill(pen.fill(col, 0.95)).stroke(pen.line(0x2e3a40, 1.4, 0.8));
                        fish.poly([-14, 0, -26, -8, -26, 8]).fill(pen.fill(col, 0.95)).stroke(pen.line(0x2e3a40, 1.2, 0.8));
                        fish.circle(8, -2, 1.8).fill({ color: 0x1a1a1a });
                        const fx = lerp(w.x0, w.x1, 0.2 + k * 0.18), fy = w.top + h(0.8 + hash(k, 166) * 1.6);
                        fish.position.set(fx, fy); fish.scale.y = 1.9; fish._s = 1.9; L.water.addChild(fish);
                        S.anim.push({ kind: 'fish', c: fish, x0: fx, y0: fy, r: h(1.2 + hash(k, 167) * 1.5), o: hash(k, 168) * 6, v: 0.25 + hash(k, 169) * 0.2 });
                    }
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
            // the bed under the water thins out into the paper just like the ground beside it (it used to be filled
            // to the bottom of the page, so where a bank ran on under a river a ruled light/dark seam went down the
            // page, 5 November)
            {
                // paper below; the soil's colour thins out about one and a half lengths down
                if (def.underground) {
                    // inside the mountain the rock goes on down: no paper under a cave
                    poly(gr, body).fill(material('rock')); poly(gr, body).fill({ color: 0x0e0c16, alpha: 0.55 });
                } else {
                    // the paper below lies in the page's dusk, never brighter than the ground over it
                    poly(gr, body).fill(pen.material('mat-paper', 1, 0xf3ecdc));
                    poly(gr, body).fill({ color: def.sky === 'peak' ? 0x26263e : 0x2a2a46, alpha: 0.36 });
                }
                // the soil's lower edge is torn, not ruled: the colour runs out unevenly into the paper
                const vnoise = (x, seed, cell = 150) => { const i = Math.floor(x / cell), f = x / cell - i, u = f * f * (3 - 2 * f); return lerp(hash(i, seed), hash(i + 1, seed), u); };
                const rag = (dy, amp, seed) => top.map(([x, y]) => [x, y + dy + (vnoise(x, seed) - 0.5) * amp * 2 + (vnoise(x, seed + 9, 38) - 0.5) * amp * 0.4]);
                // Åsktoppen is a mountain: its rock runs deep before the page shows through (with the soil's usual
                // depth it read as a thin crust on a pale slab, 6 November)
                const dk = def.sky === 'peak' ? 2.3 : 1;
                const deepEdge = rag(h(1.5 * dk), h(0.3 * dk), 17), thinEdge = rag(h(2.3 * dk), h(0.5 * dk), 19);
                const deep = [...top, ...deepEdge.reverse()], thin = [...rag(h(1.4 * dk), h(0.3 * dk), 17), ...thinEdge.reverse()];
                // inside the mountain the rock is one rock all the way down: a lighter skin band ended square at each
                // ledge's ends and stood out as a pale box on every island (6 November)
                if (!def.underground) {
                    poly(gr, deep).fill(material(under));
                    poly(gr, thin).fill(material(under, 0.45));
                    poly(gr, deep).fill({ color: under === 'earth' ? 0x5a3f2a : 0x6b6256, alpha: 0.18 });
                }
                // darker just under the surface, lighter deeper down: the ground has a skin
                poly(gr, [...top, ...offset(top, h(0.45)).reverse()]).fill({ color: 0x2a1c12, alpha: under === 'earth' ? 0.16 : 0.1 });
                // layers in the soil, drawn as long uneven pencil lines
                // (each kind of mark is one path, stroked once: a page builds quickly even on a slow tablet)
                const strata = [[0.62, 0.28, 3], [1.02, 0.22, 5], [1.32, 0.16, 7]];
                if (def.sky === 'peak') strata.push([1.9, 0.2, 11], [2.6, 0.17, 13], [3.3, 0.14, 15], [4.1, 0.1, 21]);
                for (const [dy, a, sd] of strata) {
                    const line = rag(h(dy), h(0.18), sd);
                    let pen2 = false;
                    for (let i = 0; i < line.length - 1; i += 1) {
                        if (hash(line[i][0], sd) < 0.25) { pen2 = false; continue; } // broken, as a pencil skips
                        if (!pen2) { gr.moveTo(line[i][0], line[i][1]); pen2 = true; }
                        gr.lineTo(line[i + 1][0], line[i + 1][1]);
                    }
                    gr.stroke(pen.line(under === 'earth' ? 0x5a3c24 : 0x5c5448, 1.6, a));
                }
                for (let x = top[0][0] + 20; x < top.at(-1)[0] - 20; x += 34) {
                    const y = heightOn(s.pts, x) + h(0.5 + hash(x, 15) * 1.2);
                    gr.moveTo(x, y).lineTo(x + 14, y + 6);
                }
                gr.stroke(pen.line(0x6a4a32, 1.6, 0.35));
                // stones in the soil; shells and pebbles in the sand
                for (let x = top[0][0] + 30; x < top.at(-1)[0] - 30; x += 60 + hash(x, 21) * 110) {
                    const y = heightOn(s.pts, x) + h(0.35 + hash(x, 22) * 1.0), r = 7 + hash(x, 23) * 15;
                    if (s.mat === 'sand' && hash(x, 24) > 0.6) {
                        gr.moveTo(x - r, y).quadraticCurveTo(x, y - r * 1.3, x + r, y).closePath().fill(pen.fill(0xf0e2cc, 0.9)).stroke(pen.line(0x9a8466, 1.2, 0.8));
                        for (let k = -1; k <= 1; k++) gr.moveTo(x, y).lineTo(x + k * r * 0.6, y - r * 0.8).stroke(pen.line(0xb8a07c, 1, 0.7));
                        continue;
                    }
                    const pts = [];
                    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, rr = r * (0.75 + hash(x + k, 25) * 0.4); pts.push([x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr * 0.8]); }
                    poly(gr, pts).fill(material('rock', 0.95)).stroke(pen.line(0x4a4450, 1.4, 0.8));
                    gr.ellipse(x + r * 0.3, y - r * 0.3, r * 0.45, r * 0.22).fill({ color: 0xffffff, alpha: 0.22 });
                    poly(gr, [[x, y], ...pts.slice(2, 5)]).fill({ color: 0x1d1a20, alpha: 0.2 });
                }
                // Kristallgrottan's rock: veins of crystal running through it, and small crystals breaking out along its
                // top, so a ledge in the cave reads as crystal rock, not a grey block (5 November)
                if (def.underground && top.length > 2) {
                    const veinCol = [0xb79be6, 0x8fc9f0, 0xe6a6d8];
                    for (let x = top[0][0] + 40; x < top.at(-1)[0] - 40; x += h(1.1) + hash(x, 31) * h(1.6)) {
                        const y0 = heightOn(s.pts, x) + h(0.5 + hash(x, 32) * 1.6), col = veinCol[Math.floor(hash(x, 33) * 3)];
                        const vein = [[x, y0]];
                        for (let k = 1; k <= 5; k++) vein.push([x + k * 22 + (hash(x + k, 34) - 0.5) * 16, y0 + (hash(x + k, 35) - 0.5) * 36]);
                        lineAlong(gr, vein).stroke(pen.line(col, 4.5, 0.38));
                        lineAlong(gr, vein).stroke(pen.line(0xffffff, 1.6, 0.25));
                    }
                    for (let x = top[0][0] + 60; x < top.at(-1)[0] - 60; x += h(1.6) + hash(x, 36) * h(2.4)) {
                        const y = heightOn(s.pts, x);
                        if (y === null || (def.waters || []).some(w => x > w.x0 - 30 && x < w.x1 + 30 && y > w.top - 10)) continue;
                        const cc = veinCol[Math.floor(hash(x, 38) * 3)];
                        crystalCluster(gr, x, y + 4, { size: 0.32 + hash(x, 37) * 0.22, color: cc, n: 3, seed: 11 });
                        (S.crystalSpots ||= []).push({ x, y, color: cc, size: 1 });
                    }
                }
                // Åsktoppen's rock (under the turf, out in the weather): cracks running down from the top, a pale lit
                // edge on each, and lichen in small pale patches, so the mountain reads as rock, not as layered paper
                // (5 November)
                if (under === 'rock' && !def.underground && !s.cave && top.length > 2) {
                    // (drawn into the ground's own Graphics: a Graphics cannot hold children in PixiJS 8)
                    const cracks = [];
                    for (let x = top[0][0] + 60; x < top.at(-1)[0] - 60; x += h(1.0) + hash(x, 51) * h(1.5)) {
                        let cx = x, cy = heightOn(s.pts, x) + h(0.3);
                        const crack = [[cx, cy]], n = (def.sky === 'peak' ? 6 : 3) + Math.floor(hash(x, 52) * 3);
                        for (let k = 0; k < n; k++) { cx += (hash(x + k, 53) - 0.5) * 70; cy += h((def.sky === 'peak' ? 0.3 : 0.14) + hash(x + k, 54) * 0.18); crack.push([cx, cy]); }
                        cracks.push({ crack, branch: hash(x, 55) > 0.5 ? (hash(x, 56) > 0.5 ? 22 : -22) : 0 });
                    }
                    // (thick enough to read at a phone's zoom)
                    for (const { crack } of cracks) lineAlong(gr, crack.map(([px, py]) => [px + 5, py + 2]));
                    gr.stroke(pen.line(0xb9b4c8, 3, 0.35));
                    for (const { crack, branch } of cracks) {
                        lineAlong(gr, crack);
                        // a short branch off the crack
                        if (branch) { const [bx, by] = crack[2]; gr.moveTo(bx, by).lineTo(bx + branch * 2, by + h(0.15)); }
                    }
                    gr.stroke(pen.line(0x221d2c, 5, 0.6));
                    for (let x = top[0][0] + 40; x < top.at(-1)[0] - 40; x += h(0.6) + hash(x, 57) * h(1.1)) {
                        const y = heightOn(s.pts, x) + h(0.38 + hash(x, 58) * 0.7 * (def.sky === 'peak' ? 3 : 1)), col = hash(x, 59) > 0.5 ? 0xc8c98c : 0x9fb57e;
                        for (let k = 0; k < 5; k++) gr.circle(x + (hash(x + k, 60) - 0.5) * 60, y + (hash(x + k, 61) - 0.5) * 26, 6 + hash(x + k, 62) * 8).fill(pen.fill(col, 0.5));
                    }
                }
                // under grass, fine roots hang down from the turf
                if (s.mat === 'grass') {
                    for (let x = top[0][0] + 10; x < top.at(-1)[0] - 10; x += 16 + hash(x, 26) * 26) {
                        const y = heightOn(s.pts, x) + h(0.28), len = h(0.15 + hash(x, 27) * 0.35), sw = (hash(x, 28) - 0.5) * 18;
                        gr.moveTo(x, y).quadraticCurveTo(x + sw, y + len * 0.5, x + sw * 0.4, y + len);
                    }
                    gr.stroke(pen.line(0x4a3220, 1.2, 0.55));
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
            // under the water the soil is tinted by it; deeper down, in the paper, it is the same page as beside it
            if (s.underwater) {
                for (const d of [0.8, 1.35, 1.9]) poly(gr, [...top, ...offset(top, h(d)).reverse()]).fill({ color: 0x2e5470, alpha: 0.07 });
            }
            lineAlong(gr, s.pts).stroke(pen.line(s.underwater ? 0x2f4f5f : INK, 2.6, 0.9));
            L.terrain.addChild(gr);
            S.surfaces.set(s.id, gr);
        }
        // where two kinds of ground meet, each runs a little way into the other instead of meeting at a ruled line
        const UNDER = (q) => q.mat === 'grass' ? (q.edgeMat || 'earth') : q.mat === 'bark' ? 'earth' : q.mat;
        const solids = def.surfaces.filter(q => !q.thin && !q.hidden && !q.underwater);
        for (const a of solids) for (const b of solids) {
            if (a === b || Math.abs(a.pts.at(-1)[0] - b.pts[0][0]) > 2 || UNDER(a) === UNDER(b)) continue;
            const xb = b.pts[0][0], yb = b.pts[0][1];
            // the line between the two soils wanders: one reaches into the other in tongues, as two colours meet in a
            // pencil drawing. (Before, a tint of each ran into the other; but its own edge was a ruled line, and a straight
            // line between two textures stayed sharp under any tint, 6 November.)
            {
                const n = 18, edge = [], fade = [];
                for (let i = 0; i <= n; i++) {
                    const u = i / n, y = yb + h(0.06) + u * h(2.25);
                    const wave = 0.5 + 0.5 * Math.sin(u * 9 + hash(xb, 195) * 6) * Math.cos(u * 4.3 + 1);
                    const reach = h(0.1 + 0.55 * wave + hash(xb + i, 194) * 0.12) * Math.min(1, u * 6, (1 - u) * 6);
                    (u < 0.62 ? edge : fade).push([xb - reach, y]);
                }
                const tongue = new PIXI.Graphics();
                const full = [[xb, yb + h(0.06)], ...edge, [xb, edge.at(-1)[1]]];
                poly(tongue, full).fill(material(UNDER(b)));
                poly(tongue, full).fill({ color: UNDER(b) === 'earth' ? 0x5a3f2a : 0x6b6256, alpha: 0.18 }); // as the soil's own band
                // below the soil's full colour it thins into the paper, and so does the tongue
                poly(tongue, [[xb, edge.at(-1)[1]], edge.at(-1), ...fade, [xb, yb + h(2.31)]]).fill(material(UNDER(b), 0.45));
                L.terrain.addChild(tongue);
            }
            // grass does not stop at a ruled edge either: its turf thins out a little way onto the other ground
            const [ga, gb] = a.mat === 'grass' ? [a, 1] : b.mat === 'grass' ? [b, -1] : [null, 0]; // into the other ground
            if (ga) {
                const wedge = [], n = 8, len = h(0.9);
                for (let i = 0; i <= n; i++) { const u = i / n, x = xb + gb * u * len; wedge.push([x, yb - 2 + (hash(x, 193) - 0.5) * 6]); }
                for (let i = n; i >= 0; i--) { const u = i / n, x = xb + gb * u * len; wedge.push([x, yb + h(0.3) * (1 - u) ** 1.5]); }
                const tuft = new PIXI.Graphics();
                poly(tuft, wedge).fill(material('grass'));
                for (let k = 0; k < 4; k++) { const x = xb + gb * len * (0.15 + k * 0.2); tuft.moveTo(x, yb + 2).quadraticCurveTo(x + 4, yb - 12, x + gb * 9, yb - 20 + k * 3).stroke(pen.line(0x5f7a4a, 2.2, 0.85)); }
                L.terrain.addChild(tuft);
            }
        }
        // the same where a bank runs on under the water (the river, the cave's islands): the two soils run into each
        // other a little way instead of meeting in a ruled line down the page (5 November)
        const beds = def.surfaces.filter(q => !q.thin && !q.hidden && q.underwater);
        for (const a of [...solids, ...beds]) for (const b of [...solids, ...beds]) {
            if (a === b || !!a.underwater === !!b.underwater || Math.abs(a.pts.at(-1)[0] - b.pts[0][0]) > 2) continue;
            const xb = b.pts[0][0], yb = b.pts[0][1];
            const ca = (MAT[UNDER(a)] || [null, 0x8a6a4a])[1], cb = (MAT[UNDER(b)] || [null, 0x8a6a4a])[1];
            L.terrain.addChild(softDark('side', xb, yb + h(0.1), xb + h(1.8), yb + h(2.4), { color: ca, alpha: 0.5 }));
            L.terrain.addChild(softDark('side', xb - h(1.8), yb + h(0.1), xb, yb + h(2.4), { color: cb, alpha: 0.5, mirror: true }));
        }
        // the puzzle drawings and places
        if (def.dashed) for (const d of def.dashed) buildDashed(d);
        buildPlaces(def);
        buildDecor(def);
        buildNightLight(def);
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
        } else if (s.crystal) {
            // a crystal plate set in the floor: it rings under galloping hooves, and lights up
            const band = [...top, ...offset(top, h(0.17)).reverse()];
            poly(gr, band).fill(pen.fill(0x8fc9f0, 0.92));
            for (let i = 1; i < top.length - 1; i++) { const [x, y] = top[i]; gr.moveTo(x, y + 2).lineTo(x + (i % 2 ? 12 : -8), y + h(0.16)).stroke(pen.line(0xffffff, 1.4, 0.6)); }
            lineAlong(gr, top).stroke(pen.line(0x2f5a7e, 2.4));
            lineAlong(gr, offset(top, h(0.17))).stroke(pen.line(0x2f5a7e, 1.6, 0.7));
            const cx = (s.pts[0][0] + s.pts.at(-1)[0]) / 2, cy = s.pts[1][1];
            const glow = glowAt(cx, cy, 3.4, 0x9fd8ff, 0);
            const shine = new PIXI.Graphics(); poly(shine, band).fill({ color: 0xeafaff }); shine.alpha = 0; L.objects.addChild(shine);
            S.crystalPlates = S.crystalPlates || [];
            S.crystalPlates.push({ id: s.crystal, glow, shine, cx, cy, gr });
        } else if (s.crystalBridge || s.lightBridge) {
            // the bridge once drawn: crystal over the chasm, or light over Åsktoppen's ravine
            const light = !!s.lightBridge, col = light ? 0xffd76b : 0x9fd8ff, ink = light ? 0xb8862c : 0x2f5a7e;
            const glowG = new PIXI.Graphics(); lineAlong(glowG, top).stroke(pen.line(col, 34, 0.2)); c.addChild(glowG);
            const band = [...top, ...offset(top, h(0.15)).reverse()];
            poly(gr, band).fill(pen.fill(col, 0.88));
            for (let i = 1; i < top.length - 1; i += 2) { const [x, y] = top[i]; gr.moveTo(x, y + 2).lineTo(x + 10, y + h(0.14)).stroke(pen.line(0xffffff, 1.6, 0.6)); }
            lineAlong(gr, top).stroke(pen.line(ink, 2.2));
            lineAlong(gr, offset(top, h(0.15))).stroke(pen.line(ink, 1.6, 0.7));
            lineAlong(gr, offset(top, -h(0.42))).stroke(pen.line(col, 3.4, 0.8));
            for (const [x, y] of [s.pts[0], s.pts.at(-1)]) gr.moveTo(x, y + 6).lineTo(x, y - h(0.5)).stroke(pen.line(ink, 6));
            S.shimmer = S.shimmer || []; S.shimmer.push(glowG);
            // its light is untouched by the storm's tint
            for (let i = 1; i < top.length - 1; i += 3) {
                const sp = glowAt(top[i][0], top[i][1] - 14, 2.4, col, 0.3, L.fx);
                if (s.when) S.when.push({ node: sp, when: s.when });
                S.bridgeGlow = S.bridgeGlow || []; S.bridgeGlow.push({ sp, o: i });
            }
        } else if (s.prop === 'mushroom') {
            const [x0, y] = s.pts[0], x1 = s.pts.at(-1)[0], cx = (x0 + x1) / 2;
            c.pivot.set(cx, y + h(0.4)); c.position.set(cx, y + h(0.4)); S.mushroom = { c, t: 9 };
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
        const tone = DASH_TONE[d.sketch?.mat] || DASH_TONE.wood;
        const glow = new PIXI.Graphics();
        lineAlong(glow, pts).stroke(pen.line(tone.glow, 26, 0.18));
        dash.addChild(glow);
        let acc = 0, on = true;
        for (let i = 1; i < pts.length; i++) {
            const [x, y] = pts[i - 1], [x2, y2] = pts[i];
            acc += Math.hypot(x2 - x, y2 - y);
            if (on) {
                dash.moveTo(x, y).lineTo(x2, y2).stroke(pen.line(tone.dash, 11));
                dash.moveTo(x, y - h(0.42)).lineTo(x2, y2 - h(0.42)).stroke(pen.line(tone.dash, 5, 0.85));
            }
            if (acc > (on ? 30 : 20)) { acc = 0; on = !on; }
        }
        for (const [x, y] of [d.pts[0], d.pts.at(-1)]) dash.moveTo(x, y + 6).lineTo(x, y - h(0.5)).stroke(pen.line(tone.dash, 7, 0.9));
        const ink = new PIXI.Graphics();
        c.addChild(dash, ink);
        L.terrain.addChild(c);
        S.dashed.set(d.id, { d, c, ink, drawn: -1, tone });
    }
    function updateDashed() {
        for (const v of S.dashed.values()) {
            const done = G.flags.has(v.d.flag);
            v.c.visible = !done;
            // Blixtbron shows only while the lightning lights it
            if (v.d.inkWhen === 'flash') v.c.alpha = lerp(v.c.alpha, G.flags.has('flash') ? 1 : 0.1, 0.25);
            const t = v.d._ink || 0;
            if (Math.abs(t - v.drawn) < 0.01) continue;
            v.drawn = t;
            v.ink.clear();
            if (t <= 0) continue;
            const pts = resampleX(v.d.pts, 10), n = Math.max(2, Math.round(pts.length * t));
            lineAlong(v.ink, pts.slice(0, n)).stroke(pen.line(v.tone.ink, 14, 0.95));
            lineAlong(v.ink, pts.slice(0, n)).stroke(pen.line(v.tone.edge, 2.2));
        }
    }

    // places drawn for the story: trees, the cave, the waterfall, the roots, the stash
    function tree(gr, x, y, { trunk = h(0.32), height = h(4.2), crown = h(1.6), color = 0x2f5a3e, hi = 0x4f7c50, lean = 0 } = {}) {
        // A tree drawn in pencil: a tapered trunk with bark and a shadowed side, roots, a few limbs, and a
        // crown of leaf clusters in three depths: dark behind, the leaf colour, and light on the moon's side
        // (upper right), each cluster's edge scalloped into leaves.
        const topX = x + lean, seed = x * 0.013;
        const r = (k) => hash(seed + k, 41);
        const back = mixColor(color, 0x05080a, 0.55), lit = mixColor(hi, 0xa8c890, 0.35), rim = mixColor(hi, 0xe8f2d4, 0.5);
        const bark = mixColor(0x7c5a3c, 0x3a2a1c, 0.25);
        const tb = trunk / 2, tt = trunk * 0.32;
        const trunkPts = [[x - tb - trunk * 0.35, y + 6], [x - tb, y - height * 0.12], [topX - tt, y - height], [topX + tt, y - height], [x + tb, y - height * 0.12], [x + tb + trunk * 0.4, y + 6]];
        poly(gr, trunkPts).fill(pen.fill(bark));
        poly(gr, trunkPts).fill(pen.hatch(mixColor(bark, 0x1d140c, 0.45), 0.55));
        poly(gr, [[x - tb * 0.15, y + 6], [topX - tt * 0.1, y - height], [topX - tt, y - height], [x - tb, y - height * 0.12], [x - tb - trunk * 0.35, y + 6]]).fill({ color: 0x1d140c, alpha: 0.4 });
        poly(gr, [[x + tb * 0.55, y + 6], [topX + tt * 0.6, y - height], [topX + tt * 0.9, y - height], [x + tb * 0.92, y + 6]]).fill({ color: 0xe8dcc0, alpha: 0.12 });
        for (let k = 0; k < 7; k++) {
            const u = 0.1 + k * 0.12, bx = lerp(x, topX, u) + (r(k) - 0.5) * trunk * 0.5, by = y - height * u;
            gr.moveTo(bx, by).quadraticCurveTo(bx + 4, by - height * 0.05, bx - 2, by - height * 0.1).stroke(pen.line(0x2e1d0e, 1.6, 0.55));
        }
        poly(gr, trunkPts).stroke(pen.line(0x2e1d0e, 2, 0.9));
        // limbs reaching into the crown
        for (const [dir, u] of [[-1, 0.78], [1, 0.86], [-1, 0.94]]) {
            const bx = lerp(x, topX, u), by = y - height * u;
            gr.moveTo(bx, by).quadraticCurveTo(bx + dir * crown * 0.35, by - crown * 0.25, bx + dir * crown * 0.7, by - crown * 0.55).stroke(pen.line(bark, Math.max(3, trunk * 0.18)));
        }
        crownAt(gr, topX, y - height - crown * 0.25, crown, color, hi, seed);
    }
    /** A crown of leaf clusters in three depths: dark behind, the leaf colour, light on the upper right. */
    function crownAt(gr, cx, cy, crown, color, hi, seed) {
        const r = (k) => hash(seed + k, 41);
        const back = mixColor(color, 0x05080a, 0.55), lit = mixColor(hi, 0xa8c890, 0.35), rim = mixColor(hi, 0xe8f2d4, 0.5);
        const lobes = [];
        const n = 7 + Math.floor(r(1) * 4);
        for (let k = 0; k < n; k++) {
            const a = Math.PI * (1.05 + (k / (n - 1)) * 0.9) + (r(k + 10) - 0.5) * 0.3;
            const d = crown * (0.45 + r(k + 20) * 0.25);
            lobes.push([cx + Math.cos(a) * d * 1.15, cy + Math.sin(a) * d * 0.75 + crown * 0.25, crown * (0.42 + r(k + 30) * 0.22)]);
        }
        lobes.push([cx, cy - crown * 0.1, crown * 0.62], [cx - crown * 0.4, cy + crown * 0.25, crown * 0.45], [cx + crown * 0.42, cy + crown * 0.22, crown * 0.45]);
        const scallop = (lx, ly, lr, col, alpha, from, to, step) => {
            for (let a = from; a <= to; a += step) gr.circle(lx + Math.cos(a) * lr, ly + Math.sin(a) * lr, lr * 0.3).fill(pen.fill(col, alpha));
        };
        // depth 1: dark mass behind, with a leafy outline
        for (const [lx, ly, lr] of lobes) gr.circle(lx, ly + lr * 0.08, lr).fill(pen.fill(back));
        for (const [lx, ly, lr] of lobes) scallop(lx, ly + lr * 0.08, lr * 0.95, back, 1, 0, Math.PI * 2, 0.55);
        // depth 2: the leaf colour, a little up and to the light
        for (const [lx, ly, lr] of lobes) gr.circle(lx + lr * 0.08, ly - lr * 0.08, lr * 0.82).fill(pen.fill(color));
        for (const [lx, ly, lr] of lobes) scallop(lx + lr * 0.08, ly - lr * 0.08, lr * 0.78, color, 1, Math.PI * 1.0, Math.PI * 2.05, 0.5);
        // depth 3: light on the upper right of each cluster, hatched, and a rim of single leaves
        for (const [lx, ly, lr] of lobes) {
            gr.ellipse(lx + lr * 0.25, ly - lr * 0.3, lr * 0.5, lr * 0.36).fill(pen.hatch(lit, 0.9));
            scallop(lx + lr * 0.1, ly - lr * 0.12, lr * 0.74, lit, 0.85, Math.PI * 1.5, Math.PI * 1.95, 0.32);
        }
        for (let k = 0; k < 10; k++) {
            const a = Math.PI * (1.45 + r(k + 40) * 0.5), d = crown * (0.85 + r(k + 50) * 0.2);
            const lx = cx + Math.cos(a) * d * 1.05, ly = cy + Math.sin(a) * d * 0.8, s2 = 5 + r(k + 60) * 6;
            gr.moveTo(lx - s2, ly).quadraticCurveTo(lx, ly - s2, lx + s2, ly).quadraticCurveTo(lx, ly + s2 * 0.6, lx - s2, ly).fill(pen.fill(rim, 0.9));
        }
        // shade under the crown, where it meets the trunk
        gr.ellipse(cx - crown * 0.05, cy + crown * 0.55, crown * 0.75, crown * 0.18).fill({ color: 0x0b1216, alpha: 0.28 });
    }

    /** A spruce of the magic forest: a short trunk and jagged tiers, dark on the left, lit on the right. */
    function conifer(gr, x, y, { height = h(4), width = h(1.6), color = 0x22402f, hi = 0x4f7c50 } = {}) {
        const seed = x * 0.017, r = (k) => hash(seed + k, 43);
        const dark = mixColor(color, 0x05080a, 0.5), lit = mixColor(hi, 0xa8c890, 0.3);
        gr.rect(x - width * 0.06, y - height * 0.2, width * 0.12, height * 0.2 + 6).fill(pen.fill(0x4e3624));
        const tiers = 5 + Math.floor(r(1) * 3);
        for (let k = 0; k < tiers; k++) {
            const u0 = 0.12 + k / tiers * 0.8, u1 = u0 + 1.6 / tiers;
            const yb = y - height * u0, yt = y - height * Math.min(1, u1), w = width * (1 - u0 * 0.85) * (0.9 + r(k + 5) * 0.2);
            const pts = [[x, yt]];
            const teeth = 4 + Math.floor(w / 26);
            for (let i = 0; i <= teeth; i++) {
                const u = i / teeth, px = x + w * (u * 2 - 1) * 0.5;
                pts.push([px + (i % 2 ? 0 : (r(k * 9 + i) - 0.5) * 8), yb + (i % 2 ? -h(0.12) : h(0.04) + r(k * 7 + i) * h(0.06))]);
            }
            pts.splice(1, 0, [x + w * 0.5, yb]); pts.push([x - w * 0.5, yb]);
            const body = [[x, yt], [x + w * 0.5, yb], ...pts.slice(2, -1).reverse(), [x - w * 0.5, yb]];
            poly(gr, body).fill(pen.fill(color));
            poly(gr, [[x, yt], [x - w * 0.5, yb], [x - w * 0.05, yb - h(0.05)]]).fill(pen.fill(dark, 0.85));
            poly(gr, [[x, yt], [x + w * 0.44, yb - h(0.04)], [x + w * 0.12, yb - h(0.1)]]).fill(pen.hatch(lit, 0.9));
            lineAlong(gr, [[x - w * 0.5, yb], [x, yt], [x + w * 0.5, yb]]).stroke(pen.line(0x0e1a14, 1.6, 0.7));
        }
    }

    // soft mist lying between the trees and the path, and the dark plants nearest the viewer
    let mistTex = null;
    function mist() {
        if (mistTex || typeof document === 'undefined') return mistTex;
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
        const c = cv.getContext('2d'), g2 = c.createRadialGradient(128, 32, 4, 128, 32, 128);
        g2.addColorStop(0, 'rgba(255,255,255,0.9)'); g2.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
        c.setTransform(1, 0, 0, 0.25, 0, 24); c.fillStyle = g2; c.fillRect(0, -96, 256, 256);
        mistTex = RAW.Texture.from(cv);
        return mistTex;
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
            // (its left side starts behind the falls, under the overhang's lip: a straight edge beside the water read as
            // a dark box, 6 November)
            const caveIn = [[h(87.9), h(-2.5)], [h(88.6), h(-2.2)], [h(89.6), h(-2.0)], [h(91), h(-1.75)], [h(94), h(-1.85)], [h(96.2), h(-1.6)], [h(99.8), h(-1.7)], [h(99.8), h(0.4)], [h(87.9), h(0.4)]];
            poly(back, caveIn).fill(material('rock')); poly(back, caveIn).fill({ color: 0x14121d, alpha: 0.72 });
            for (let k = 0; k < 7; k++) back.moveTo(h(89.2 + k), h(-1.6)).quadraticCurveTo(h(89.4 + k), h(-1.1), h(89.3 + k), h(-0.8)).stroke(pen.line(0x3a3646, 3, 0.6));
            const cliff = [[h(88.3), h(-7.6)], [h(99.8), h(-7.6)], [h(99.8), h(-1.6)], [h(97.6), h(-1.45)], [h(97), h(-1.55)], [h(95.4), h(-1.75)], [h(94.1), h(-1.5)], [h(92.6), h(-1.85)], [h(91.1), h(-1.55)], [h(89.8), h(-1.9)], [h(88.9), h(-2.6)],
                [h(88.6), h(-3.9)], [h(88.9), h(-5.1)], [h(88.5), h(-6.4)]];
            poly(fore, cliff).fill(material('rock')); poly(fore, cliff).fill({ color: 0x2d2a36, alpha: 0.3 });
            for (let k = 0; k < 9; k++) { const y = h(-7 + k * 0.62); fore.moveTo(h(89.4), y).lineTo(h(96.8), y + h(0.12) * Math.sin(k)).stroke(pen.line(0x5a5668, 1.6, 0.45)); }
            for (let k = 0; k < 6; k++) fore.circle(h(90 + k * 1.2), h(-7.5) + 6, h(0.3 + hash(k, 55) * 0.2)).fill(pen.fill(0x3d6a45));
            // the overhang above the cave was one plain grey slab (5 November): moss along its lip, ferns in its
            // cracks, and water dripping from the edge where the falls keep it wet
            const lip = cliff.slice(2, 11);
            for (let i = 0; i < lip.length - 1; i++) {
                const [x0, y0] = lip[i], [x1, y1] = lip[i + 1];
                for (let k = 0; k < 3; k++) {
                    const u = (k + 0.5) / 3, x = lerp(x0, x1, u), y = lerp(y0, y1, u);
                    fore.ellipse(x, y - 4, h(0.18 + hash(x, 171) * 0.14), h(0.07)).fill(pen.fill(k % 2 ? 0x4f7a4a : 0x3d6646, 0.9));
                    if (hash(x, 172) > 0.6) fore.moveTo(x, y).quadraticCurveTo(x + 6, y + h(0.25), x - 2, y + h(0.45 + hash(x, 173) * 0.4)).stroke(pen.line(0x4f7a4a, 2.4, 0.8)); // hanging moss
                }
            }
            for (const [fx, fy] of [[h(91.2), h(-4.4)], [h(94.6), h(-5.9)], [h(97.8), h(-3.6)]]) {
                fore.moveTo(fx - 30, fy + 6).lineTo(fx + 34, fy - 4).stroke(pen.line(0x2a2633, 2, 0.55)); // a crack
                for (let k = 0; k < 4; k++) fore.moveTo(fx + k * 6, fy).quadraticCurveTo(fx + k * 6 - 18 + k * 10, fy - 26, fx + k * 6 - 26 + k * 16, fy - 34).stroke(pen.line(k % 2 ? 0x5f8a55 : 0x4a7444, 2.6, 0.85));
            }
            // cracks running down the face with a lit edge, and pale lichen, as on Åsktoppen: in a phone held upright
            // the overhang fills half the screen and read as one flat grey slab (5 November)
            const crs = [];
            for (let k = 0; k < 7; k++) {
                let cx = h(89.6 + k * 1.45 + hash(k, 175) * 0.6), cy = h(-7.3 + hash(k, 176) * 1.2);
                const pts = [[cx, cy]], n = 4 + Math.floor(hash(k, 177) * 4);
                for (let i = 0; i < n; i++) { cx += (hash(k + i, 178) - 0.5) * 90; cy += h(0.3 + hash(k + i, 179) * 0.3); if (cy > h(-2.4)) break; pts.push([cx, cy]); }
                if (pts.length > 1) crs.push(pts);
            }
            // (thick enough to read at a phone's zoom, where the world is drawn at about a third of its size)
            for (const pts of crs) lineAlong(fore, pts.map(([x, y]) => [x + 5, y + 2]));
            fore.stroke(pen.line(0xb9b4c8, 3, 0.35));
            for (const pts of crs) lineAlong(fore, pts);
            fore.stroke(pen.line(0x221d2c, 5, 0.6));
            for (let k = 0; k < 16; k++) {
                const x = h(89.6 + hash(k, 181) * 9.8), y = h(-7.1 + hash(k, 182) * 4.6), col = hash(k, 183) > 0.5 ? 0xc8c98c : 0x9fb57e;
                for (let i = 0; i < 5; i++) fore.circle(x + (hash(k + i, 184) - 0.5) * 60, y + (hash(k + i, 185) - 0.5) * 26, 6 + hash(k + i, 186) * 8).fill(pen.fill(col, 0.5));
            }
            lineAlong(fore, cliff.slice(2).concat([cliff[0]])).stroke(pen.line(INK, 2.4));
            for (const dx of [89.6, 91.8, 93.5, 95.9, 97.2]) {
                const d = new PIXI.Graphics();
                d.moveTo(0, -5).quadraticCurveTo(3.5, 1, 0, 4).quadraticCurveTo(-3.5, 1, 0, -5).fill({ color: 0xcfe6f2, alpha: 0.9 });
                const x = h(dx), y0 = heightOn(cliff.slice(2, 11).map(([px, py]) => [px, py]).sort((a, b) => a[0] - b[0]), x) ?? h(-1.7);
                d.position.set(x, y0); L.fore.addChild(d);
                S.anim.push({ kind: 'drip', c: d, y0, y1: y0 + h(1.5), o: hash(dx, 174) });
            }
            const falls = new PIXI.Container(); L.waterFront.addChild(falls);
            const fg = new PIXI.Graphics();
            // the sheet of water: its edges waver as falling water does, fuller at the lip (5 November: it was a ruled
            // pale strip with straight white edges)
            const edgeL = [], edgeR = [];
            for (let y = -7.5; y <= 0.001; y += 0.25) {
                const u = (y + 7.5) / 7.5;
                edgeL.push([h(87.2 - 0.2 * u) + Math.sin(y * 4.1) * 6 + Math.sin(y * 9.3) * 3, h(y)]);
                edgeR.push([h(88.8 + 0.2 * u) + Math.sin(y * 3.7 + 1) * 6 + Math.sin(y * 8.1) * 3, h(y)]);
            }
            poly(fg, [...edgeL, ...edgeR.slice().reverse()]).fill({ color: 0xbcd8ea, alpha: 0.5 });
            poly(fg, [...edgeL.slice(0, 8), ...edgeR.slice(0, 8).reverse()]).fill({ color: 0xe8f4fa, alpha: 0.35 }); // fuller where it pours over
            // the falling water drawn in long wavering strokes, lighter at the lip
            for (let k = 0; k < 14; k++) {
                const x = h(87.25 + k * 0.11 + (hash(k, 59) - 0.5) * 0.05);
                fg.moveTo(x, h(-7.5));
                for (let y = -7.5; y < 0; y += 0.5) fg.lineTo(x + Math.sin(y * 3 + k) * 4 + (y + 7.5) * 1.2, h(y + 0.5));
                fg.stroke(pen.line(k % 3 ? 0xe8f4fa : 0x8fb6d0, 1.6 + (k % 2), 0.55));
            }
            fg.rect(h(87.2), h(-7.6), h(1.6), h(0.35)).fill({ color: 0xffffff, alpha: 0.35 });
            lineAlong(fg, edgeL).stroke(pen.line(0xe8f4fa, 2.6, 0.75)); lineAlong(fg, edgeR).stroke(pen.line(0xe8f4fa, 2.6, 0.75));
            // the lip: the water curls over the cliff's edge
            fg.moveTo(h(87.0), h(-7.6)).quadraticCurveTo(h(88.0), h(-7.95), h(89.0), h(-7.6)).stroke(pen.line(0xf2f8fb, 5, 0.85));
            for (let k = 0; k < 7; k++) fg.circle(h(86.9 + k * 0.36), 6 + (k % 2) * 8, 16 + (k % 3) * 6).fill(pen.fill(0xf2f8fb, 0.85));
            // spray mist rising at the foot
            for (let k = 0; k < 9; k++) fg.circle(h(86.6 + hash(k, 57) * 2.8), -h(0.25 + hash(k, 58) * 0.9), 14 + hash(k, 56) * 22).fill({ color: 0xe8f2f8, alpha: 0.13 });
            falls.addChild(fg);
            for (let k = 0; k < 10; k++) {
                const st = new PIXI.Graphics();
                st.moveTo(0, 0).lineTo(0, h(1.4)).stroke(pen.line(k % 2 ? 0xffffff : 0x9cc3dc, 3, 0.85));
                st.position.set(h(87.4) + k * h(0.14), h(-7.5)); falls.addChild(st);
                S.anim.push({ kind: 'fall', c: st, y0: h(-7.5), y1: h(-1.2), o: hash(k, 51) });
            }
            S.anim.push({ kind: 'foam', x: h(88), y: h(0) });
            // the tunnel into the mountain: Kristallgrottan glints far inside
            const tun = [[h(96.6), h(0.4)], [h(96.65), h(-0.7)], [h(96.9), h(-1.15)], [h(97.4), h(-1.4)], [h(98.2), h(-1.5)], [h(99.8), h(-1.55)], [h(99.8), h(0.4)]];
            poly(back, tun).fill({ color: 0x07060c, alpha: 0.7 });
            for (let k = 0; k < 8; k++) {
                const x = h(97.1 + hash(k, 57) * 2.5), y = h(-1.25 + hash(k, 58) * 0.75);
                back.poly([x, y, x + 6, y - 14, x + 12, y]).fill({ color: k % 2 ? 0x9fd8ff : 0xc9b3ff, alpha: 0.75 });
            }
            // darker further in, until Tukankrabban carries a moonshine seed as a lantern
            const cd = softDark('side', h(94.6), h(-2.05), h(99.9), h(0.55), { alpha: 0.85, mirror: true });
            L.fore.addChild(cd); S.caveDark = cd;
        } else if (def.id === 'kristall') {
            buildKristall(def, back, mid, fore);
        } else if (def.id === 'topp') {
            buildTopp(def, back, mid, fore);
        } else {
            // Ravinen's back wall
            ravine(back, h(34.5), h(40), h(-0.6), h(-1.8));
            // Jätteträdet: a trunk as wide as a house, its crown under the storm
            const trunk = [[h(13.2), h(-0.5)], [h(14.6), h(-9)], [h(15.2), h(-13.5)], [h(19.8), h(-13.5)], [h(20.4), h(-9)], [h(21.6), h(-0.5)]];
            poly(back, trunk).fill(material('bark')); poly(back, trunk).fill(pen.hatch(0x3e2814, 0.55));
            poly(back, [[h(13.2), h(-0.5)], [h(14.6), h(-9)], [h(15.2), h(-13.5)], [h(16.2), h(-13.5)], [h(15.6), h(-9)], [h(14.6), h(-0.5)]]).fill({ color: 0x1d140c, alpha: 0.38 });
            poly(back, [[h(19.4), h(-0.5)], [h(19.0), h(-9)], [h(18.8), h(-13.5)], [h(19.4), h(-13.5)], [h(20.0), h(-9)], [h(20.6), h(-0.5)]]).fill({ color: 0xe8dcc0, alpha: 0.1 });
            // Bark you can read even in the storm's dark (5 November; before, the trunk was one flat brown wedge):
            // long furrows, each a dark groove with a pale ridge beside it, following the trunk's taper
            const edgeAt = (u, side) => { // the trunk's left (side 0) or right (1) edge at height u (0 foot, 1 top)
                const a = side ? [[0, 21.6], [0.6, 20.4], [1, 19.8]] : [[0, 13.2], [0.6, 14.6], [1, 15.2]];
                return u < 0.6 ? lerp(a[0][1], a[1][1], u / 0.6) : lerp(a[1][1], a[2][1], (u - 0.6) / 0.4);
            };
            for (let k = 0; k < 34; k++) {
                const f = (k + 0.5) / 34 + (hash(k, 63) - 0.5) * 0.02, pts = [];
                const u0 = hash(k, 64) * 0.25, u1 = 0.55 + hash(k, 65) * 0.45;
                for (let i = 0; i <= 10; i++) {
                    const u = lerp(u0, u1, i / 10), x0 = edgeAt(u, 0), x1 = edgeAt(u, 1);
                    pts.push([h(lerp(x0, x1, f)) + Math.sin(u * 23 + k) * 5, h(-0.5 - u * 13)]);
                }
                lineAlong(back, pts).stroke(pen.line(0x24170c, 2.6 + hash(k, 66) * 1.6, 0.75));
                lineAlong(back, pts.map(([x, y]) => [x + 4, y])).stroke(pen.line(0xa98a64, 1.3, 0.35 + 0.25 * (f > 0.6 ? 1 : 0)));
            }
            // moonlight on the right-hand edge, moss at the foot, and knots where old limbs broke off
            const lit = []; for (let i = 0; i <= 12; i++) { const u = i / 12; lit.push([h(edgeAt(u, 1)) - 6, h(-0.5 - u * 13)]); }
            lineAlong(back, lit).stroke(pen.line(0xd8d4e8, 5, 0.22));
            // moss creeping up the foot, its top edge uneven (a regular zigzag read as distant hills)
            const moss = []; for (let i = 0; i <= 28; i++) { const x = lerp(13.4, 21.4, i / 28); moss.push([h(x), h(-0.55 - 0.55 - hash(i, 67) * 0.75 - (i % 5 === 2 ? 0.35 : 0))]); }
            poly(back, [...moss, [h(21.6), h(-0.5)], [h(13.2), h(-0.5)]]).fill(pen.fill(0x4f6e3e, 0.75));
            poly(back, [...moss, [h(21.6), h(-0.5)], [h(13.2), h(-0.5)]]).fill(pen.hatch(0x7f9c5a, 0.6));
            for (const [kx, ky, kr] of [[15.6, -3.4, 0.32], [19.1, -8.8, 0.28], [16.4, -10.9, 0.24]]) {
                for (let r = 0; r < 3; r++) back.ellipse(h(kx), h(ky), h(kr) * (1 - r * 0.28), h(kr) * 1.3 * (1 - r * 0.28)).stroke(pen.line(r ? 0x6b4a2c : 0x24170c, r ? 1.6 : 2.6, 0.85));
            }
            // roots flaring out into the ground on both sides
            for (const [x0, dir] of [[13.4, -1], [14.2, -1], [20.6, 1], [21.3, 1]]) {
                back.moveTo(h(x0), h(-1.2)).quadraticCurveTo(h(x0 + dir * 0.5), h(-0.7), h(x0 + dir * 1.3), h(-0.45)).stroke(pen.line(0x3a2614, 14, 0.95));
                back.moveTo(h(x0), h(-1.2)).quadraticCurveTo(h(x0 + dir * 0.5), h(-0.7), h(x0 + dir * 1.3), h(-0.45)).stroke(pen.line(0x7a5a38, 3, 0.5));
            }
            lineAlong(back, trunk).stroke(pen.line(0x2e1d0e, 3));
            back.ellipse(h(17.4), h(-6.2), h(0.5), h(0.7)).fill({ color: 0x1d140c, alpha: 0.9 }); // a hollow
            back.ellipse(h(17.4), h(-6.2), h(0.56), h(0.77)).stroke(pen.line(0x8a6a44, 3, 0.7));
            for (const [cx, cy, cr] of [[11.6, -14.4, 2.3], [23.2, -14.4, 2.3], [14.2, -15.6, 2.7], [20.6, -15.6, 2.7], [17.4, -16.6, 3.0], [17.4, -14.2, 2.6]]) {
                crownAt(back, h(cx), h(cy), h(cr), 0x2c5240, 0x5a8a5a, cx * 7.1);
            }
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
    // the ground's height at x (the solid ground, not the branches or the lake floor)
    function groundY(def, x) {
        for (const q of def.surfaces) {
            if (q.thin || q.hidden || q.underwater) continue;
            if (x >= q.pts[0][0] && x <= q.pts.at(-1)[0]) return heightOn(q.pts, x);
        }
        return null;
    }
    /** A bunch of crystals: dir -1 grows up from the floor, 1 hangs from the ceiling. */
    function crystalCluster(gr, x, y, { dir = -1, size = 1, color = 0xb79be6, n = 4, seed = 0 } = {}) {
        const ink = mixColor(color, 0x1a1430, 0.6);
        for (let k = 0; k < n; k++) {
            const mid = k === Math.floor(n / 2);
            const a = (k - (n - 1) / 2) * 0.34 + (hash(x + k, seed) - 0.5) * 0.2;
            const len = (40 + hash(x + k, seed + 1) * 46) * size * (mid ? 1.35 : 1), w = (8 + hash(x + k, seed + 2) * 5) * size;
            const dx = Math.sin(a), dy = Math.cos(a) * dir, nx = -dy, ny = dx;
            const bx = x + (k - (n - 1) / 2) * w * 1.1, by = y;
            const sx = bx + dx * len * 0.78, sy = by + dy * len * 0.78, tx = bx + dx * len, ty = by + dy * len;
            gr.poly([bx - nx * w, by - ny * w, sx - nx * w, sy - ny * w, tx, ty, sx + nx * w, sy + ny * w, bx + nx * w, by + ny * w])
                .fill(pen.fill(color, 0.92)).stroke(pen.line(ink, 1.6, 0.9));
            gr.poly([bx - nx * w, by - ny * w, sx - nx * w, sy - ny * w, tx, ty, bx, by]).fill({ color: 0xffffff, alpha: 0.22 });
            gr.moveTo(bx, by).lineTo(sx, sy).lineTo(tx, ty).stroke(pen.line(0xffffff, 1.3, 0.55));
        }
    }
    function twinkleAt(x, y, k = 0.5, tint = 0xffffff, layer = L.mid) {
        const st = new RAW.Sprite(TX.star); st.anchor.set(0.5); st.position.set(x, y); st.scale.set(k); st.tint = tint; layer.addChild(st);
        S.anim.push({ kind: 'twinkle', s: st, o: hash(x, y) * 6 });
        return st;
    }
    function glowAt(x, y, k, tint, alpha, layer = L.mid) {
        const g2 = new RAW.Sprite(TX.mote); g2.anchor.set(0.5); g2.position.set(x, y); g2.scale.set(k); g2.tint = tint; g2.alpha = alpha; g2.blendMode = 'add';
        layer.addChild(g2);
        return g2;
    }
    /** Bubbles that move along a path (a current, or the spring rising). */
    function bubblesAlong(pts, { n = 6, speed = 140, tint = 0xffffff, scale = 1 } = {}) {
        const path = resampleX(pts, 20);
        let len = 0; const acc = [0];
        for (let i = 1; i < path.length; i++) { len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); acc.push(len); }
        if (pts.every(([x]) => x === pts[0][0])) { // a vertical path (resampleX keeps only its ends)
            path.length = 0; acc.length = 0; len = 0;
            const [x, y0] = pts[0], y1 = pts.at(-1)[1], m = 24;
            for (let i = 0; i <= m; i++) { path.push([x, y0 + (y1 - y0) * i / m]); acc.push(Math.abs(y1 - y0) * i / m); }
            len = Math.abs(y1 - y0);
        }
        for (let k = 0; k < n; k++) {
            const b = new RAW.Sprite(TX.bubble); b.anchor.set(0.5); b.tint = tint; b.scale.set(scale * (0.8 + hash(k, len) * 0.6)); L.objects.addChild(b);
            S.anim.push({ kind: 'along', s: b, path, acc, len, speed, o: k / n });
        }
    }

    function buildKristall(def, back, mid, fore) {
        const P = (pts) => pts.map(([x, y]) => [h(x), h(y)]);
        // the cave's roof, with the spring's shaft going up above Källan
        const roofW = P([[-1.4, -3.0], [3, -3.4], [6, -3.9], [9, -4.3], [12, -4.8], [15, -5.2], [18, -4.8], [21, -4.1], [24, -3.8], [27, -3.2], [30, -2.9], [33, -3.05], [36, -2.8],
            [40, -3.0], [43.4, -3.3], [46.8, -3.3], [49, -3.4], [52, -3.7], [54, -4.3], [57, -4.5], [60, -4.7], [63, -4.0], [65.3, -3.0], [67.1, -3.0], [69, -3.7], [71.6, -4.3], [72.1, -9.8]]);
        const roofE = P([[73.9, -9.8], [74.4, -4.2], [76, -3.8], [78.2, -3.6]]);
        for (const line of [roofW, roofE]) {
            const edge = resampleX(line, 30).map(([x, y], i) => [x, y + (hash(x, 101) - 0.5) * h(0.14)]);
            const body = [...edge, [edge.at(-1)[0], h(-17)], [edge[0][0], h(-17)]];
            poly(fore, body).fill(material('rock')); poly(fore, body).fill({ color: 0x1a1726, alpha: 0.55 });
            for (let k = 0; k < edge.length; k += 3) { const [x, y] = edge[k]; fore.moveTo(x, y - h(0.3)).lineTo(x + 26, y - h(0.9)).stroke(pen.line(0x4a4560, 1.6, 0.4)); }
            // crystal veins run through the roof as through the ledges: held upright, the roof fills the top third of
            // the screen and was a plain grey slab (6 November)
            for (let x = edge[0][0] + h(0.6); x < edge.at(-1)[0] - h(0.6); x += h(1.3) + hash(x, 108) * h(1.8)) {
                const ey = heightOn(edge, x);
                if (ey === null) continue;
                const y0 = ey - h(0.7 + hash(x, 109) * 2.6), col = [0xb79be6, 0x8fc9f0, 0xe6a6d8][Math.floor(hash(x, 110) * 3)];
                const vein = [[x, y0]];
                for (let i = 1; i <= 5; i++) vein.push([x + i * 40 + (hash(x + i, 34) - 0.5) * 30, y0 + (hash(x + i, 35) - 0.5) * 70]);
                lineAlong(fore, vein).stroke(pen.line(col, 5, 0.38));
                lineAlong(fore, vein).stroke(pen.line(0xffffff, 1.8, 0.26));
            }
            lineAlong(fore, edge).stroke(pen.line(INK, 2.6, 0.9));
            // stalactites, and crystals growing down from the roof
            for (let k = 2; k < edge.length - 2; k += 2 + Math.floor(hash(k, line.length) * 3)) {
                const [x, y] = edge[k];
                if (x > h(43.2) && x < h(47)) continue;
                if (hash(x, 103) > 0.52) { crystalCluster(fore, x, y - 4, { dir: 1, size: 0.6 + hash(x, 104) * 0.5, color: [0xb79be6, 0x8fc9f0, 0xe6a6d8][k % 3], n: 3, seed: 7 }); twinkleAt(x, y + 40, 0.4, 0xdff2ff, L.fore); continue; }
                const len = h(0.2 + hash(x, 105) * 0.45), w = 10 + hash(x, 106) * 12;
                fore.poly([x - w, y - 4, x + w, y - 4, x + hash(x, 107) * 6, y + len]).fill(material('rock')).stroke(pen.line(0x2a2638, 1.6, 0.8));
                fore.poly([x - w, y - 4, x - w * 0.2, y - 4, x + hash(x, 107) * 6, y + len]).fill({ color: 0x14121d, alpha: 0.35 });
            }
        }
        // the way back to the beach: a dark tunnel
        L.fore.addChild(softDark('side', h(-1.5), h(-3.5), h(1.0), h(-0.3), { alpha: 0.92 }));
        // big crystals glowing in the dark behind the play
        [[2.6, 0x8fc9f0], [9.2, 0xb79be6], [20.6, 0xe6a6d8], [26.5, 0x8fc9f0], [52.5, 0xb79be6], [57.2, 0x8fc9f0], [68.4, 0xe6a6d8]].forEach(([x, col], i) => {
            const gy = groundY(def, h(x));
            if (gy === null) return;
            glowAt(h(x), gy - h(0.6), 5, col, 0.22, L.back);
            crystalCluster(back, h(x), gy - 4, { size: 1.1 + hash(i, 9) * 0.5, color: col, n: 5, seed: i });
            (S.crystalSpots ||= []).push({ x: h(x), y: gy, color: col, size: 1.8 });
            twinkleAt(h(x) + 10, gy - h(0.9), 0.5, 0xffffff, L.back);
        });
        for (let k = 0; k < 26; k++) twinkleAt(h(-1 + hash(k, 111) * 77), h(-3.6 + hash(k, 112) * 2.4), 0.25 + hash(k, 113) * 0.3, 0xcfe6ff, L.back);

        // K1: the chasm, black until the three plates ring
        ravine(back, h(12), h(18), h(-0.4), h(-0.4));
        // the air over it goes clear once lit; the pit itself stays deep
        const dark = softDark('down', h(11.9), h(-2.9), h(18.1), h(-0.38), { alpha: 0.95 }), pit = softDark('solid', h(11.95), h(-0.45), h(18.05), h(4.2), { alpha: 0.92 });
        pit.label = 'chasm-pit';
        // the pit's dark lies behind the chasm's walls (in front of them it hid the walls in a black box)
        L.fore.addChild(dark);
        if (back.parent) back.parent.addChildAt(pit, back.parent.getChildIndex(back)); else L.back.addChild(pit);
        S.chasmDark = dark; S.chasmPit = pit;
        S.chasmGlow = glowAt(h(15), h(-0.3), 7, 0x9fd8ff, 0, L.back);

        // K2: the rock wall that comes down into the lake
        const wall = P([[43.6, -3.6], [43.45, -1.4], [43.7, 0.6], [43.85, 2.1], [44.6, 2.28], [45.4, 2.05], [46.2, 2.22], [46.5, 0.9], [46.72, -1.2], [46.6, -3.6]]);
        poly(fore, wall).fill(material('rock')); poly(fore, wall).fill({ color: 0x1a1726, alpha: 0.45 });
        for (let k = 0; k < 8; k++) { const y = h(-3 + k * 0.62); fore.moveTo(h(43.8), y).lineTo(h(46.4), y + h(0.1) * Math.sin(k * 1.7)).stroke(pen.line(0x4a4560, 1.6, 0.45)); }
        lineAlong(fore, wall).stroke(pen.line(INK, 2.4));
        poly(fore, P([[43.62, 0], [43.7, 0.6], [43.85, 2.1], [44.6, 2.28], [45.4, 2.05], [46.2, 2.22], [46.5, 0.9], [46.6, 0]])).fill({ color: 0x3d6d8f, alpha: 0.35 });
        // the three crystals on the lake floor, and the currents that start beside them
        const mk = new PIXI.Graphics(); L.objects.addChild(mk);
        const LANE_TINT = { 'k2-white': 0xf4f6ff, 'k2-blue': 0x7fb6ee, 'k2-green': 0x8fd69a };
        for (const [spot, lane] of [['whiteCrystal', 'k2-white'], ['blueCrystal', 'k2-blue'], ['greenCrystal', 'k2-green']]) {
            const q = def.spots[spot], col = LANE_TINT[lane];
            glowAt(q.x, q.y - h(0.35), 3.2, col, 0.45, L.objects);
            crystalCluster(mk, q.x, q.y + 8, { size: 0.95, color: col, n: 3, seed: 3 });
            twinkleAt(q.x + 8, q.y - h(0.45), 0.45, 0xffffff, L.objects);
        }
        for (const ln of def.lanes || []) {
            if (LANE_TINT[ln.id]) bubblesAlong(ln.pts, { n: 10, speed: 150, tint: LANE_TINT[ln.id], scale: 2.1 });
        }
        // K3: Tordyveln's glitter ball, the two plates on the pool floor, the gate
        S.glitter = glitterBallView(); L.objects.addChild(S.glitter.view);
        S.kplates = [];
        for (const [spot, test] of [['plateA', () => G.flags.has('k3_ball')], ['plateB', () => (G.puz.plate || 0) > 0 || G.flags.has('k3_open')]]) {
            const q = def.spots[spot], c = new PIXI.Container(); c.position.set(q.x, q.y); L.objects.addChild(c);
            const pg = new PIXI.Graphics();
            pg.rect(-h(0.36), -14, h(0.72), 16).fill(material('rock')).stroke(pen.line(INK, 1.8));
            pg.circle(0, -6, 6).stroke(pen.line(0xe9b949, 2, 0.9));
            for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; pg.moveTo(Math.cos(a) * 9, -6 + Math.sin(a) * 5).lineTo(Math.cos(a) * 13, -6 + Math.sin(a) * 7).stroke(pen.line(0xe9b949, 1.6, 0.8)); }
            c.addChild(pg);
            const gl = glowAt(q.x, q.y - 10, 2.4, 0xffe27a, 0, L.objects);
            S.kplates.push({ c, pg, gl, test, y: q.y, down: 0 });
        }
        const gx = def.spots.gate.x, gy = def.spots.gate.y;
        for (const px of [gx - h(0.62), gx + h(0.42)]) {
            const pil = [[px, gy + 6], [px + h(0.06), h(-3.1)], [px + h(0.2), h(-3.1)], [px + h(0.24), gy + 6]];
            poly(mid, pil).fill(material('rock')); poly(mid, pil).fill({ color: 0x1a1726, alpha: 0.4 }); lineAlong(mid, pil).stroke(pen.line(INK, 2));
        }
        S.gate = new PIXI.Container(); S.gate.position.set(gx, gy); L.mid.addChild(S.gate);
        const bars = new PIXI.Graphics();
        for (let k = 0; k < 5; k++) {
            const x = -h(0.36) + k * h(0.18), col = k % 2 ? 0x8fc9f0 : 0xb79be6;
            bars.poly([x - 7, -h(2.8), x + 7, -h(2.8), x + 7, -18, x, 4, x - 7, -18]).fill(pen.fill(col, 0.9)).stroke(pen.line(0x2f2a50, 1.6));
            bars.moveTo(x - 3, -h(2.7)).lineTo(x - 3, -24).stroke(pen.line(0xffffff, 1.2, 0.5));
        }
        for (const y of [-h(2.2), -h(1.0)]) bars.rect(-h(0.45), y, h(0.9), 10).fill(material('rock')).stroke(pen.line(INK, 1.6));
        S.gate.addChild(bars); S.gateLift = G.flags.has('k3_open') ? 1 : 0;
        // Källan: the spring rises out of the pool into the shaft, its water falling back down the sides
        const vent = new PIXI.Graphics(); vent.ellipse(def.spots.spring.x, def.spots.spring.y + 22, h(0.7), 16).fill({ color: 0x0b0a14, alpha: 0.85 }); L.objects.addChild(vent);
        const sp = def.waters.find(w => w.kind === 'pipe');
        if (sp) {
            // its sides waver like falling water and long strokes of it rise in the middle (they were two ruled
            // lines down a blue box, 5 November)
            const edges = new PIXI.Graphics(), wy = (y, ph) => Math.sin(y / HL * 2.3 + ph) * 13 + Math.sin(y / HL * 6.1 + ph) * 5;
            for (let k = 0; k < 7; k++) {
                const x = lerp(sp.x0, sp.x1, 0.2 + k * 0.1), pts = [];
                for (let y = sp.top + 10; y <= h(0); y += h(0.25)) pts.push([x + wy(y, k * 1.3) * 0.8, y]);
                lineAlong(edges, pts).stroke(pen.line(k % 3 ? 0x9cc3dc : 0xe8f4fa, 1.6 + (k % 2), k % 3 ? 0.3 : 0.4));
            }
            for (const [x, ph] of [[sp.x0 + 6, 0], [sp.x1 - 6, 1.7]]) {
                const pts = [];
                for (let y = sp.top; y <= h(0); y += h(0.2)) pts.push([x + wy(y, ph), y]);
                lineAlong(edges, pts).stroke(pen.line(0xe8f4fa, 3, 0.7));
            }
            L.waterFront.addChild(edges);
            for (let k = 0; k < 8; k++) {
                const st = new PIXI.Graphics(), x = k % 2 ? sp.x0 + 14 + hash(k, 121) * 10 : sp.x1 - 14 - hash(k, 121) * 10;
                st.moveTo(x, 0).lineTo(x, h(1.2)).stroke(pen.line(0xffffff, 2.4, 0.8)); L.waterFront.addChild(st);
                S.anim.push({ kind: 'fall', c: st, y0: sp.top, y1: h(-0.6), o: hash(k, 122) });
            }
            for (let k = 0; k < 5; k++) twinkleAt(sp.x0 + hash(k, 123) * (sp.x1 - sp.x0), sp.top + 10, 0.5, 0xe8f4fa, L.waterFront);
        }
        const spring = (def.lanes || []).find(l => l.id === 'spring');
        if (spring) bubblesAlong(spring.pts, { n: 12, speed: 260, tint: 0xe8f4fa, scale: 1.5 });
        void mid;
    }

    function glitterBallView() {
        const view = new PIXI.Container(); view.label = 'glitter-ball';
        const spin = new PIXI.Container(); view.addChild(spin);
        const R = 44, bg = new PIXI.Graphics();
        bg.circle(0, 0, R).fill(pen.fill(PAL.earth)).stroke(pen.line(0x4a3524, 2.4));
        const cols = [PAL.gold, 0xc9b3ff, 0x9fd8ff, 0xffffff, 0xf3a6c8];
        for (let i = 0; i < 40; i++) {
            const a = i * 2.39996, r = R * 0.9 * Math.sqrt((i + 0.5) / 40);
            bg.circle(Math.cos(a) * r, Math.sin(a) * r, 2.4 + (i % 3)).fill({ color: cols[i % cols.length], alpha: 0.95 });
        }
        spin.addChild(bg); spin.y = -R;
        const glints = [];
        for (let i = 0; i < 3; i++) { const st = new RAW.Sprite(TX.star); st.anchor.set(0.5); st.position.set(-16 + i * 16, -R - 14 + (i % 2) * 24); st.scale.set(0.6); view.addChild(st); glints.push(st); }
        return { view, spin, glints, R };
    }

    function boulder(gr, x, y, w, hgt, seed) {
        const pts = [];
        for (let k = 0; k <= 12; k++) {
            const a = Math.PI + k / 12 * Math.PI, r = 1 + (hash(k, seed) - 0.5) * 0.2;
            pts.push([x + w / 2 + Math.cos(a) * w / 2 * r, y + 10 + Math.sin(a) * hgt * r]);
        }
        poly(gr, pts).fill(material('rock')); poly(gr, pts).fill({ color: 0x2d2a36, alpha: 0.28 });
        for (let k = 0; k < 5; k++) { const yy = y - hgt * (0.2 + k * 0.14); gr.moveTo(x + w * 0.62, yy).lineTo(x + w * 0.9, yy + 10).stroke(pen.line(0x4a4560, 1.6, 0.5)); }
        gr.ellipse(x + w * 0.35, y - hgt * 0.7, w * 0.16, hgt * 0.08).fill({ color: 0xffffff, alpha: 0.25 });
        lineAlong(gr, pts).stroke(pen.line(INK, 2.4));
    }

    function buildTopp(def, back, mid, fore) {
        // the spring's mouth at the bottom of the pool, bubbling up from Kristallgrottan
        // (a ring of stones and the spring's own light, so it reads as a spring's mouth, not a black hole in the
        // lake floor, 6 November)
        const vent = new PIXI.Graphics(), vx = h(0.7), vy = h(2.92);
        vent.ellipse(vx, vy, h(1.4), 18).fill({ color: 0x0c1826, alpha: 0.88 });
        vent.ellipse(vx, vy - 2, h(0.8), 9).fill({ color: 0x7fb4d4, alpha: 0.22 });
        for (let k = 0; k < 9; k++) {
            const a = Math.PI * (k / 8), sx = vx + Math.cos(a) * h(1.45), sy = vy + 6 - Math.sin(a) * 14 + (k % 2) * 3;
            vent.ellipse(sx, sy, 14 + hash(k, 191) * 10, 8 + hash(k, 192) * 4).fill(material('rock', 0.95)).stroke(pen.line(0x2a2638, 1.4, 0.8));
            vent.ellipse(sx - 3, sy - 3, 6, 2.5).fill({ color: 0xffffff, alpha: 0.2 });
        }
        L.objects.addChild(vent);
        bubblesAlong([[h(0.7), h(2.8)], [h(0.7), h(0.1)]], { n: 9, speed: 200, tint: 0xe8f4fa, scale: 1.4 });
        // boulders on Vindkanten and Klippan: in their lee the gusts do not reach
        let seed = 0;
        for (const w of def.winds || []) for (const [, b] of w.shelter || []) {
            const x = b - h(0.08), y = groundY(def, x + h(0.45));
            if (y !== null) boulder(mid, x, y, h(0.95), h(1.15), ++seed * 13);
        }
        // Blixtbron's ravine, deep and dark
        ravine(back, h(23.8), h(29.8), h(-3.1), h(-3.1));
        // Klippan: the gap only the turned wind crosses
        ravine(back, h(37), h(39.8), h(-4.35), h(-5.33));
        // rocks and a little snow up on the summit
        for (let k = 0; k < 7; k++) {
            const x = h(45 + k * 2.2 + hash(k, 131) * 1.2), y = groundY(def, x);
            if (y === null) continue;
            back.poly([x - 30, y + 6, x - 12, y - 34 - hash(k, 132) * 30, x + 6, y - 20, x + 26, y + 6]).fill(material('rock')).stroke(pen.line(INK, 1.8, 0.8));
            back.poly([x - 18, y - 22 - hash(k, 132) * 22, x - 12, y - 34 - hash(k, 132) * 30, x - 2, y - 26]).fill(pen.fill(0xe9ecf6, 0.85));
        }
        // the eye of the storm: a ring of clouds turning round the calm summit
        S.eye = { c: new PIXI.Container(), puffs: [], x: def.spots.cloud.x, y: def.spots.cloud.y - h(0.6) };
        L.back.addChild(S.eye.c);
        // each puff a little storm cloud of its own: lobes, a pale lit rim on top, a shaded belly, sizes that vary
        // (they were flat identical discs that read as overlapping coins, 5 November)
        for (let k = 0; k < 16; k++) {
            const pf = new PIXI.Graphics(), r = h(0.55 + hash(k, 141) * 0.55), body = k % 2 ? 0x4b4870 : 0x3d3a5e;
            const lobes = [];
            const n = 4 + Math.floor(hash(k, 142) * 3);
            for (let i = 0; i < n; i++) {
                const u = (i + 0.5) / n, lx = (u - 0.5) * r * 2.6, lr = r * (0.55 + Math.sin(u * Math.PI) * 0.5 + hash(k + i, 143) * 0.15);
                lobes.push([lx, -Math.sin(u * Math.PI) * r * 0.35, lr]);
            }
            for (const [lx, ly, lr] of lobes) pf.circle(lx, ly, lr).fill(pen.fill(body, 0.96));
            pf.ellipse(0, r * 0.35, r * 1.5, r * 0.45).fill(pen.fill(mixColor(body, 0x14121f, 0.45), 0.9)); // the flat dark belly
            for (const [lx, ly, lr] of lobes) {
                pf.moveTo(lx - lr * 0.8, ly - lr * 0.45).quadraticCurveTo(lx, ly - lr * 1.12, lx + lr * 0.8, ly - lr * 0.45).stroke(pen.line(0xb8b4dc, 2.6, 0.55));
                pf.circle(lx - lr * 0.25, ly - lr * 0.3, lr * 0.45).fill(pen.hatch(0x8f8cb4, 0.45));
            }
            pf.moveTo(-r * 1.4, r * 0.55).quadraticCurveTo(0, r * 0.85, r * 1.4, r * 0.55).stroke(pen.line(0x24223a, 2, 0.55));
            S.eye.c.addChild(pf); S.eye.puffs.push({ pf, a: k / 16 * Math.PI * 2 });
        }
        S.eyeGlow = glowAt(S.eye.x, S.eye.y, 9, 0xdfe4ff, 0.25, L.back);
        // the storm's whirl, turning flat round the eye
        const flat = new PIXI.Container(); flat.position.set(S.eye.x, S.eye.y); flat.scale.set(1, 0.36); L.back.addChild(flat);
        S.eyeSwirl = new PIXI.Graphics(); flat.addChild(S.eyeSwirl);
        for (let k = 0; k < 4; k++) {
            const pts = [];
            for (let a = 0; a < Math.PI * 2.4; a += 0.12) { const r = h(2.2) + a * h(0.75); pts.push([Math.cos(a + k * Math.PI / 2) * r, Math.sin(a + k * Math.PI / 2) * r]); }
            lineAlong(S.eyeSwirl, pts).stroke(pen.line(k % 2 ? 0x9a96c6 : 0x6e6a9a, 18, 0.55));
        }
        // Molnet's nest: a hollow of fluff where the last egg lies
        const nest = new PIXI.Graphics(), nx = def.spots.cloudNest.x, ny = def.spots.cloudNest.y;
        for (let k = 0; k < 9; k++) {
            const a = Math.PI * (0.05 + k / 8 * 0.9), r = 18 + hash(k, 151) * 10;
            nest.circle(nx - Math.cos(a) * h(0.42), ny - 4 - Math.sin(a) * 8 + 6, r).fill(pen.fill(k % 2 ? 0xe4e0f2 : 0xcfc9e6)).stroke(pen.line(0x6f6890, 1.4, 0.7));
        }
        L.objects.addChildAt(nest, 0);
        // grass bending in the gusts
        S.tufts = [];
        for (const q of def.surfaces) {
            if (!q.windswept && !q.summit) continue;
            for (let x = q.pts[0][0] + h(0.6); x < q.pts.at(-1)[0] - h(0.4); x += h(0.9) + hash(x, 161) * h(0.8)) {
                if ((def.winds || []).some(w => (w.shelter || []).some(([a, b]) => x > a - h(0.1) && x < b + h(1.0)))) continue;
                const tf = new PIXI.Graphics(), y = heightOn(q.pts, x);
                for (let k = -2; k <= 2; k++) tf.moveTo(0, 4).quadraticCurveTo(k * 5, -22, k * 9, -34 - Math.abs(k) * -3).stroke(pen.line(k % 2 ? 0x7d8f5a : 0x5f7a4a, 2.6, 0.95));
                tf.position.set(x, y); (hash(x, 162) > 0.7 ? L.fore : L.mid).addChild(tf);
                S.tufts.push({ tf, x, o: hash(x, 163) * 6 });
            }
        }
        void fore;
    }

    // a gap in the ground: its two rock walls going down into the dark, the far forest above
    function ravine(gr, x0, x1, y0, y1) {
        // A gap you can see the inside of (5 November: it read as a black box with ruled sides): jagged rock walls
        // with ledges, shaded darker as they go down and lost in the dark, roots or crystals at the lips
        const depth = h(S?.def.sky === 'peak' ? 5.6 : 4.2), cave = !!S?.def.underground;
        const dk = softDark('down', x0 - h(0.1), Math.min(y0, y1) + h(0.1), x1 + h(0.1), Math.max(y0, y1) + depth + h(0.8), { color: 0x14121d, alpha: 0.92 });
        if (gr.parent) gr.parent.addChildAt(dk, gr.parent.getChildIndex(gr)); else L.back.addChild(dk);
        for (const [x, y, dir] of [[x0, y0, 1], [x1, y1, -1]]) {
            const wall = [[x, y]];
            for (let k = 1; k <= 9; k++) wall.push([x + dir * h(0.18 + hash(x + k, 141) * 0.42 + (k % 3 === 1 ? 0.12 : 0)), y + depth * k / 9]);
            wall.push([x, y + depth]);
            poly(gr, wall).fill(material('rock')); poly(gr, wall).fill({ color: 0x2a2433, alpha: 0.4 });
            // ledges catching a little light, then the wall goes into the dark
            for (let k = 1; k <= 6; k += 2) { const [wx, wy] = wall[k]; gr.moveTo(x, wy).lineTo(wx, wy).stroke(pen.line(0x8d88a0, 2, 0.35 * (1 - k / 9))); }
            lineAlong(gr, wall.slice(0, 9)).stroke(pen.line(INK, 2, 0.8));
            const fade = softDark('down', Math.min(x, wall[3][0]) - 4, y + h(0.8), Math.max(x, wall[3][0]) + h(0.5), y + depth, { color: 0x0e0c16, alpha: 0.8 });
            if (gr.parent) gr.parent.addChildAt(fade, gr.parent.getChildIndex(gr) + 1); else L.back.addChild(fade);
            if (cave) crystalCluster(gr, x + dir * h(0.22), y + h(1.1), { dir: -1, size: 0.3, color: dir > 0 ? 0x8fc9f0 : 0xb79be6, n: 3, seed: 17 });
            else for (let k = 0; k < 3; k++) {
                const rx = x + dir * h(0.05 + k * 0.12), ry = y + h(0.15 + k * 0.08);
                gr.moveTo(rx, ry).quadraticCurveTo(rx + dir * h(0.3), ry + h(0.4), rx + dir * h(0.15), ry + h(0.75 + k * 0.2)).stroke(pen.line(0x5a3b20, 2.4, 0.8));
            }
        }
        // Each ground ends square at the lip, so a straight cut ran down beside the gap (pale paper against the dark
        // outdoors, rock against black in the cave). A jagged band of rock in front of the cut hides it, darker as it
        // goes down and tapering out; outdoors, below the walls, the gap's dark gives way to the page itself
        // (6 November)
        const yb = Math.max(y0, y1), front = new PIXI.Graphics(), shades = [];
        for (const [x, y, dir] of [[x0, y0, 1], [x1, y1, -1]]) {
            const t0 = y + h(0.3), t1 = y + depth * (cave ? 1.25 : 1.02), n = 14;
            const inner = [], outer = [];
            for (let k = 0; k <= n; k++) {
                const u = k / n, yy = lerp(t0, t1, u), taper = u > 0.8 ? (1 - u) / 0.2 : 1;
                inner.push([x - dir * h(0.1 + hash(x + k, 151) * 0.24) * taper, yy]);
                outer.push([x + dir * h(0.04 + hash(x + k, 152) * 0.12) * taper, yy]);
            }
            const band = [...inner, ...outer.reverse()];
            poly(front, band).fill(material('rock')); poly(front, band).fill({ color: cave ? 0x0e0c16 : 0x2a2433, alpha: cave ? 0.55 : 0.4 });
            lineAlong(front, inner.slice(0, n - 2)).stroke(pen.line(INK, 1.8, 0.55));
            shades.push(softDark('down', Math.min(x, x - dir * h(0.4)) - 4, t0, Math.max(x, x - dir * h(0.4)) + h(0.25), t1, { color: 0x0e0c16, alpha: 0.75 }));
        }
        L.terrain.addChild(front, ...shades);
        if (!cave) {
            // the page below the gap: the same paper (and dusk) as below the ground beside it, the dark melting into it
            const pg = new PIXI.Graphics(), bottomY = (S?.def.bounds.y1 ?? yb + h(8)) + h(4), py = yb + depth + h(0.2);
            pg.rect(x0 - h(0.1), py, x1 - x0 + h(0.2), bottomY - py).fill(pen.material('mat-paper', 1, 0xf3ecdc));
            pg.rect(x0 - h(0.1), py, x1 - x0 + h(0.2), bottomY - py).fill({ color: S?.def.sky === 'peak' ? 0x26263e : 0x2a2a46, alpha: 0.36 });
            const melt = softDark('down', x0 - h(0.1), py - h(0.8), x1 + h(0.1), py + h(1.2), { color: 0x14121d, alpha: 0.92 });
            melt.scale.y *= -1; melt.y = py + h(1.2); // dark at its top, fading down into the paper
            if (gr.parent) { gr.parent.addChildAt(pg, gr.parent.getChildIndex(gr)); gr.parent.addChild(melt); } else L.back.addChild(pg, melt);
        }
        // in the cave, far down: a few dim crystals glinting, and a faint glow, so the dark reads as depth (6 November:
        // held upright, the chasm under Kristallbron was a black quarter of the screen)
        if (cave) {
            const yb = Math.max(y0, y1);
            for (let k = 0; k < 9; k++) twinkleAt(lerp(x0, x1, 0.1 + hash(k, x0 + 147) * 0.8), yb + h(1.2 + hash(k, 148) * 2.8), 0.55 + hash(k, 149) * 0.45, k % 2 ? 0x8fc9f0 : 0xb79be6, L.back);
            glowAt((x0 + x1) / 2, yb + h(3.2), 9, 0x6f7fd0, 0.16, L.back);
            // and small crystals far down on both walls, dimmer the deeper they are
            const deep = new PIXI.Graphics();
            for (let k = 0; k < 6; k++) {
                const left = k % 2 === 0, wx = left ? x0 + h(0.35) : x1 - h(0.35), wy = yb + h(1.6 + k * 0.45);
                crystalCluster(deep, wx, wy, { dir: -1, size: 0.35 + hash(k, 151) * 0.2, color: left ? 0x8fc9f0 : 0xb79be6, n: 3, seed: 23 + k });
            }
            deep.alpha = 0.55; L.back.addChild(deep);
        }
    }
    function createCoinShape(gr, x, y) {
        gr.circle(x, y, 7).fill(pen.fill(PAL.gold)).stroke(pen.line(PAL.goldLo, 1.4));
        gr.ellipse(x - 2, y - 2, 2.4, 1.4).fill({ color: PAL.goldHi });
    }

    /**
     * Light in the stormy night (6 November): the pages were all one purple-grey, the sköldhäst the only warm thing in
     * them. Fireflies glow low over the forest and the beach (behind every character), and when lightning strikes the
     * edges of the ground and the rocks catch its light for a moment. Nothing here is drawn over a character or the
     * water's reflections, and in Mindre rörelse the fireflies keep still.
     */
    function buildNightLight(def) {
        if (def.underground) { buildCaveLight(def); return; }
        if (def.sky === 'cave') return;
        // the lightning's light along the top of the ground and the rocks
        const rim = new PIXI.Graphics(); rim.label = 'bolt-rim';
        for (const q of def.surfaces) {
            if (q.thin || q.hidden || q.underwater) continue;
            const top = resampleX(q.pts, 30);
            lineAlong(rim, top.map(([x, y]) => [x, y + 3])).stroke(pen.line(0xeef2ff, 5, 0.9));
            lineAlong(rim, top.map(([x, y]) => [x, y + 9])).stroke(pen.line(0xcfd8ff, 3, 0.5));
        }
        rim.blendMode = 'add'; rim.alpha = 0;
        L.terrain.addChild(rim); S.boltRim = rim;
        if (def.sky !== 'forest' && def.sky !== 'river') return;
        // fireflies, low over the ground, in small loose groups
        const n = Math.round((def.bounds.x1 - def.bounds.x0) / h(1.8));
        for (let k = 0; k < n; k++) {
            const x = lerp(def.bounds.x0 + h(1), def.bounds.x1 - h(1), hash(k, 201));
            const gy = groundY(def, x);
            if (gy === null || (def.waters || []).some(w => x > w.x0 && x < w.x1 && gy > w.top - 10)) continue;
            const y = gy - h(0.35 + hash(k, 202) * 1.6);
            const c = new RAW.Container(); c.position.set(x, y);
            const halo = new RAW.Sprite(TX.mote); halo.anchor.set(0.5); halo.tint = 0xffc95a; halo.blendMode = 'add'; halo.scale.set(3.6); halo.alpha = 0.8;
            const halo2 = new RAW.Sprite(TX.mote); halo2.anchor.set(0.5); halo2.tint = 0xffe08a; halo2.blendMode = 'add'; halo2.scale.set(1.8);
            const core = new RAW.Sprite(TX.mote); core.anchor.set(0.5); core.tint = 0xfffbe0; core.blendMode = 'add'; core.scale.set(0.95);
            c.addChild(halo, halo2, core);
            L.mid.addChild(c);
            S.anim.push({ kind: 'firefly', c, halo, x0: x, y0: y, o: hash(k, 203) * 6, r: h(0.25 + hash(k, 204) * 0.5) });
        }
    }

    /**
     * Kristallgrottan's crystals light the cave (6 November: they were small and the cave nearly black): a pool of
     * their colour on the floor under each one and a soft glow over it, breathing slowly. All of it lies behind the
     * characters and the water's front; in Mindre rörelse it holds still.
     */
    let lightTex = null;
    /** A soft round light: full in the middle, gone at its rim (a canvas gradient, made once). */
    function softLight() {
        if (lightTex || typeof document === 'undefined') return lightTex || RAW.Texture.WHITE;
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const c = cv.getContext('2d'), gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
        lightTex = RAW.Texture.from(cv);
        return lightTex;
    }
    function buildCaveLight(def) {
        for (const c of S.crystalSpots || []) {
            const pool = new RAW.Sprite(softLight()); pool.anchor.set(0.5); pool.tint = c.color; pool.blendMode = 'add';
            pool.position.set(c.x, c.y + 4); pool.width = h(2.4) * c.size; pool.height = h(0.42) * c.size;
            const glow = new RAW.Sprite(softLight()); glow.anchor.set(0.5); glow.tint = c.color; glow.blendMode = 'add';
            glow.position.set(c.x, c.y - h(0.3) * c.size); glow.width = glow.height = h(1.5) * c.size;
            L.terrain.addChild(pool); L.back.addChild(glow);
            const o = hash(c.x, 205) * 6;
            S.anim.push({ kind: 'crystalGlow', s: pool, base: 0.42, o });
            S.anim.push({ kind: 'crystalGlow', s: glow, base: 0.2, o: o + 0.8 });
        }
    }

    function buildDecor(def) {
        if (def.id !== 'strand' && def.id !== 'skog') return;
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
                if (hash(x, 99) > (def.id === 'skog' ? 0.5 : 0.68)) {
                    conifer(trees, x, y + (row ? 10 : -h(0.05)), { height: h((3.4 + hash(x, 94) * 2.6) * k), width: h((1.3 + hash(x, 95) * 0.7) * k),
                        color: row ? 0x22402f : 0x243f45, hi: row ? 0x4f7c50 : 0x46676d });
                    continue;
                }
                tree(trees, x, y + (row ? 10 : -h(0.05)), {
                    trunk: h((0.3 + hash(x, 93) * 0.2) * k), height: h((2.6 + hash(x, 94) * 2.2) * k), crown: h((1.2 + hash(x, 95) * 0.8) * k),
                    color: row ? (hash(x, 96) > 0.5 ? 0x284a3c : 0x2f5545) : 0x2c4a50, hi: row ? 0x4f7c50 : 0x46676d, lean: (hash(x, 98) - 0.5) * h(0.4)
                });
            }
        }
        L.back.addChildAt(trees, 0);
        // a third row far back: smaller trees, bluer with distance, half lost in mist
        const farTrees = new PIXI.Graphics();
        for (let x = def.bounds.x0; x < def.bounds.x1; x += h(1.5) + hash(x, 171) * h(1.6)) {
            if (skip.some(([a, b]) => x > a && x < b)) continue;
            const y = groundY(x);
            if (y === null) continue;
            if (hash(x, 172) > 0.45) conifer(farTrees, x, y - h(0.3), { height: h(2.2 + hash(x, 173) * 1.6), width: h(0.9 + hash(x, 174) * 0.5), color: 0x31495a, hi: 0x5a7386 });
            else tree(farTrees, x, y - h(0.3), { trunk: h(0.16), height: h(1.5 + hash(x, 175) * 1.2), crown: h(0.75 + hash(x, 176) * 0.4), color: 0x344c5c, hi: 0x5a7386 });
        }
        L.back.addChildAt(farTrees, 0);
        const mt = mist();
        if (mt) for (const s of ground) for (let x = s.pts[0][0]; x < s.pts.at(-1)[0]; x += h(5) + hash(x, 177) * h(4)) {
            const m = new RAW.Sprite(mt); m.anchor.set(0.5, 0.6);
            m.width = h(10 + hash(x, 178) * 6); m.height = h(2.2 + hash(x, 179) * 1.2); m.tint = 0x9ea2d0; m.alpha = 0.45;
            m.position.set(x, heightOn(s.pts, x) - h(0.9)); L.back.addChildAt(m, 1);
            S.anim.push({ kind: 'mist', s: m, x0: x, o: hash(x, 180) * 6, base: 0.42 });
        }
        if (mt) for (const s of ground) for (let x = s.pts[0][0]; x < s.pts.at(-1)[0]; x += h(6) + hash(x, 141) * h(5)) {
            const m = new RAW.Sprite(mt); m.anchor.set(0.5, 0.6);
            m.width = h(8 + hash(x, 142) * 6); m.height = h(1.3 + hash(x, 143) * 0.8); m.tint = 0xa4a6d4; m.alpha = 0.32;
            m.position.set(x, heightOn(s.pts, x) - h(0.25)); L.back.addChild(m);
            S.anim.push({ kind: 'mist', s: m, x0: x, o: hash(x, 144) * 6 });
        }
        // dark plants right in front: they frame the page and give it depth
        for (const s of ground) for (let x = s.pts[0][0] + h(2); x < s.pts.at(-1)[0] - h(1); x += h(5) + hash(x, 151) * h(5)) {
            if (keep.some(([a, b]) => x > a - h(1) && x < b + h(1))) continue;
            if ((def.waters || []).some(w => x > w.x0 - h(1) && x < w.x1 + h(1))) continue;
            const y = heightOn(s.pts, x), pl = new PIXI.Graphics(), big = 1.6 + hash(x, 152) * 0.9;
            for (let k = -4; k <= 4; k++) {
                const a = k * 0.28, len = (60 + hash(x + k, 153) * 40) * big;
                pl.moveTo(0, 0).quadraticCurveTo(Math.sin(a) * len * 0.6, -len * 0.7, Math.sin(a) * len, -len * Math.cos(a) * 0.85)
                    .stroke(pen.line(k % 2 ? 0x122218 : 0x1a2e22, 5 * big * 0.7, 0.96));
            }
            if (hash(x, 154) > 0.5) for (let k = 0; k < 3; k++) pl.ellipse(-30 + k * 30, -10 - k * 6, 26 * big * 0.6, 12 * big * 0.6).fill(pen.fill(0x15281d, 0.95));
            pl.position.set(x, y + h(0.42)); L.fore.addChild(pl);
            S.anim.push({ kind: 'sway', c: pl, o: hash(x, 155) * 6 });
        }
    }

    function buildObjects(def) {
        for (const egg of def.eggs || []) {
            // an egg in the world is drawn half as big again as at first (on a phone it was a few pixels)
            const e = createEgg(PIXI, pen, EGG_SCALE); L.objects.addChild(e.view);
            const mound = new PIXI.Graphics();
            if (egg.how === 'dig') { mound.ellipse(0, -4, 30, 10).fill(material('sand')); mound.ellipse(0, -4, 30, 10).stroke(pen.line(0x9a8460, 1.4, 0.8)); mound.position.set(egg.x, egg.y); L.objects.addChild(mound); }
            S.eggs.set(egg.id, { egg, e, mound });
        }
        if (def.ball) { S.ball = createBall(PIXI, pen); L.objects.addChild(S.ball.view); }
        if (def.id === 'strand') {
            S.coin = createCoin(PIXI, pen, 1.8); S.coin.view.position.set(def.spots.coin.x, def.spots.coin.y - 16); L.objects.addChild(S.coin.view);
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
        S.carryCoin = createCoin(PIXI, pen, 1.2); S.carryCoin.view.visible = false; L.fx.addChild(S.carryCoin.view);
        S.flying = []; // eggs on their way somewhere (staged moments)
    }

    function buildActors() {
        const klo = createKlo(PIXI, { texture: T });
        L.actors.addChild(klo.container);
        const hearts = createHearts(PIXI, pen); L.actors.addChild(hearts.view);
        const tukan = createTukan(PIXI, pen); L.actors.addChild(tukan.view);
        const skata = createMagpie(PIXI, pen); skata.view.scale.set(2); L.actors.addChild(skata.view);
        const dyvel = createBeetle(PIXI, pen); dyvel.view.scale.set(1.5); L.actors.addChild(dyvel.view);
        const moln = createCloud(PIXI, pen, { texture: cloudTexture }); moln.view.scale.set(1.5); L.objects.addChild(moln.view);
        // Tordyveln's ball of eggshells (after the story: dyvel_shellball): speckled white pieces, the finest yet
        const shellBall = new PIXI.Container(); shellBall.label = 'shell-ball'; shellBall.visible = false;
        {
            const sb = new PIXI.Graphics(), R = 34; // as big as his old ball
            sb.circle(0, -R, R).fill(pen.fill(0xf3eee0)).stroke(pen.line(0x6f6658, 2.2));
            for (let i = 0; i < 9; i++) {
                const a = i * 2.17, r = 8 + (i * 5) % 20, x = Math.cos(a) * r, y = -R + Math.sin(a) * r;
                sb.poly([x - 6, y - 3, x + 4, y - 6, x + 7, y + 3, x - 2, y + 6]).fill(pen.fill(i % 3 ? 0xe8e1cc : 0xdfe8ef, 0.95)).stroke(pen.line(0x8a8070, 1.2, 0.8));
            }
            for (let i = 0; i < 6; i++) sb.circle(Math.cos(i * 1.9) * 15, -R + Math.sin(i * 1.9) * 12, 2).fill({ color: 0x9a8c74, alpha: 0.7 }); // the eggs' speckles
            sb.ellipse(-8, -R - 10, 6, 3).fill({ color: 0xffffff, alpha: 0.6 });
            shellBall.addChild(sb);
        }
        L.actors.addChild(shellBall);
        S.shellBall = { c: shellBall, pop: 0 };
        S.A = { klo, hearts, tukan, skata, dyvel, moln };
        S.actors.push(tukan, skata, dyvel, moln, hearts);
        S.shadows = {};
        for (const [id, k] of [['klo', 1.1], ['skata', 0.9], ['dyvel', 0.8]]) {
            const sh = new RAW.Sprite(TX.shadow); sh.anchor.set(0.5); sh.scale.set(k); sh.visible = false; L.objects.addChild(sh); S.shadows[id] = sh;
        }
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
        const tint = S.def.underground ? ENV_TINT.cave : mixColor(ENV_TINT.storm, ENV_TINT.moon, night);
        for (const l of ENV) l.tint = tint;

        // camera
        updateCamera(dt, snap, W, H);
        world.scale.set(cam.zoom);
        const shx = cam.shake > 0 && !rm ? (Math.random() - 0.5) * cam.shake : 0;
        cam.shake = Math.max(0, cam.shake - dt * 30);
        world.position.set(Math.round(W / 2 - cam.x * cam.zoom + shx), Math.round(H / 2 - cam.y * cam.zoom));

        drawSky(W, H, night, t, dt);
        atmo.setMood(moodFor(S.def.sky, stormShown));
        atmo.update(dt, { camX: cam.x, camY: cam.y, zoom: cam.zoom, W, H, t, lessMotion: rm });
        const farScale = clamp(cam.zoom * 1.5, 0.45, 1.15);
        const skyKind = S.def.sky;
        for (const f of farForest) f.t.visible = skyKind === 'river' || skyKind === 'forest';
        for (const f of farPeaks) f.t.visible = skyKind === 'peak';
        for (const f of farCave) f.t.visible = skyKind === 'cave';
        // the peak on the horizon: seen from the river beach and the forest; its storm calms once the cloud is met
        peak.visible = skyKind === 'river' || skyKind === 'forest';
        if (peak.visible) {
            const u = (cam.x - S.def.bounds.x0) / (S.def.bounds.x1 - S.def.bounds.x0);
            const high = clamp((h(-4) - cam.y) / h(4), 0, 1); // up in Jätteträdet the peak comes into view
            peakVista = rm ? (peakVistaOn ? 1 : 0) : lerp(peakVista, peakVistaOn ? 1 : 0, 1 - Math.exp(-2.4 * dt));
            peak.scale.set(lerp(clamp(H / 900, 0.45, 1.1) * 1.15 * (1 + 0.15 * high), 0.78 * H / 430, peakVista));
            const footY = H / 2 + (h(-0.6) - cam.y) * cam.zoom * 0.3 + h(0.4) * cam.zoom; // its foot behind the far forest
            peak.position.set(W * lerp(skyKind === 'river' ? 1.02 - u * 0.3 : lerp(1.2 - u * 0.35, 0.88, high), 0.5, peakVista), lerp(footY, H * 1.04, peakVista));
            swirl.rotation += dt * (rm ? 0.05 : 0.3) * stormShown;
            swirl.alpha = 0.15 + 0.85 * stormShown;
            for (const m of peakMist) {
                m.g.x = m.x0 + (rm ? 0 : Math.sin(t * m.v + m.o) * m.w * 0.45);
                m.g.alpha = (rm ? 0.8 : 0.55 + 0.45 * Math.sin(t * m.v * 1.7 + m.o * 2)) * (0.15 + 0.85 * stormShown); // the storm's own cloud
            }
            peakBolt.visible = !rm && stormShown > 0.5 && Math.sin(t * 2.3) > (peakVistaOn ? 0.9 : 0.985);
        }
        skyBolt.visible = boltT > 0; boltT = Math.max(0, boltT - dt);
        for (const f of farSprites) {
            if (!f.t.visible) continue;
            f.t.scale.set(farScale);
            f.t.width = (W + 4) / farScale; f.t.tilePosition.x = -cam.x * cam.zoom * f.par / farScale;
            // the far forest's foot sits behind the near ground, lower as the camera climbs
            const ground = H / 2 + (h(-0.6) - cam.y) * cam.zoom * (0.25 + f.par) + h(0.4) * cam.zoom;
            f.t.y = ground - f.top * farScale;
        }
        if (!skyHatch.texture.width || skyHatch.texture === RAW.Texture.EMPTY) { const ht = T('pencil-hatch'); if (ht) skyHatch.texture = ht; }
        skyHatch.width = W; skyHatch.height = H; skyHatch.tilePosition.x = -cam.x * cam.zoom * 0.05;
        // the storm's heavy pencil hatching thins out as the storm calms: the moonlit ending is clear
        skyHatch.alpha = 0.05 + 0.13 * stormShown;

        // water light: glints, dimmer in the storm; the moon's path across the river
        if (S.waterLights) for (const wl of S.waterLights) {
            wl.update({ time: t, cam, width: W, height: H, evening: F.has('moon'), lessMotion: rm });
            wl.view.alpha = S.def.underground ? 0.7 : 0.45 + 0.55 * (1 - stormShown);
        }
        if (S.moonPath) {
            const on = moonState.shown > 0.05, river = S.def.waters.find(w => w.kind === 'river') || S.def.waters[0];
            S.moonPath.visible = on && !!river;
            if (S.moonPath.visible) {
                const mx = cam.x + (moonScreen(W, H).x - W / 2) / cam.zoom;
                S.moonPath.children.forEach((m, k) => {
                    const depth = 10 + k * 22, wob = rm ? 0 : Math.sin(t * 1.3 + k * 1.7) * 14;
                    m.position.set(clamp(mx + wob, river.x0 + 40, river.x1 - 40), river.top + depth);
                    m.scale.x = (70 - k * 4) * (0.7 + 0.3 * Math.sin(t * 2 + k));
                    m.alpha = moonState.shown * (0.85 - k * 0.06) * (rm ? 1 : 0.6 + 0.4 * Math.sin(t * 3.1 + k * 2.3));
                });
            }
        }
        // water life
        for (const a of S.anim) {
            if (a.kind === 'current') { a.c.x += a.v * dt; if (a.c.x > a.x1 - h(0.8)) a.c.x = a.x0; }
            else if (a.kind === 'fall') { const u = (t * (rm ? 0.6 : 1.8) + a.o) % 1; a.c.y = lerp(a.y0, a.y1, u); a.c.alpha = 0.3 + 0.6 * Math.sin(u * Math.PI); }
            else if (a.kind === 'crystalGlow') {
                // the crystals light the cave once the three by the chasm are lit ("Kan kristallerna lysa upp den?"):
                // before that the cave is dark and only glitters, and the lantern is its light (6 November)
                a.lit = rm ? (F.has('k1_lit') ? 1 : 0) : lerp(a.lit ?? (F.has('k1_lit') ? 1 : 0), F.has('k1_lit') ? 1 : 0, 1 - Math.exp(-0.8 * dt));
                a.s.alpha = a.lit * a.base * (rm ? 0.9 : 0.72 + 0.28 * Math.sin(t * 0.8 + a.o));
            }
            else if (a.kind === 'firefly') {
                // only once Mira has drawn the moon: before that the page is dark, as the story says (6 November)
                a.c.visible = F.has('moon');
                if (!a.c.visible) continue;
                // a slow wandering loop, blinking softly; still in Mindre rörelse; dimmer in the heaviest rain
                const ph = t * 0.35 + a.o;
                if (!rm) a.c.position.set(a.x0 + Math.sin(ph) * a.r + Math.sin(ph * 2.3) * a.r * 0.3, a.y0 + Math.sin(ph * 1.7 + 1) * a.r * 0.5);
                a.c.alpha = (rm ? 0.75 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.3 + a.o * 3)) ** 2) * (1 - 0.35 * stormShown);
            }
            else if (a.kind === 'twinkle') { a.s.alpha = rm ? 0.55 : 0.3 + 0.7 * Math.max(0, Math.sin(t * 2 + a.o)) ** 4; } // still in Mindre rörelse
            else if (a.kind === 'foam' && !rm && Math.random() < dt * 14) emit('drop', a.x + (Math.random() - 0.5) * h(1.4), a.y, 1, { speed: 260, cone: 1.2, life: 0.6 });
            else if (a.kind === 'mist') { a.s.x = a.x0 + Math.sin(t * 0.05 + a.o) * h(1.2) * (rm ? 0.2 : 1); a.s.alpha = (a.base ?? 0.26) + 0.08 * Math.sin(t * 0.2 + a.o); }
            else if (a.kind === 'sway') a.c.rotation = rm ? 0 : Math.sin(t * 0.9 + a.o) * 0.025 + (stormShown > 0.5 ? Math.sin(t * 2.1 + a.o) * 0.02 : 0);
            else if (a.kind === 'drip') { const u = rm ? 0.05 : (t * 0.55 + a.o) % 1; a.c.y = lerp(a.y0, a.y1, u * u); a.c.alpha = u < 0.85 ? 0.9 : (1 - u) * 6; }
            else if (a.kind === 'fish') {
                // a slow figure of eight, turning to face the way it swims
                const ph = t * a.v * (rm ? 0.4 : 1) + a.o, nx = a.x0 + Math.sin(ph) * a.r, ny = a.y0 + Math.sin(ph * 2) * h(0.25);
                const dir = Math.cos(ph) >= 0 ? 1 : -1;
                a.c.position.set(nx, ny); a.c.scale.x = dir * (a.c._s || 1); a.c.rotation = rm ? 0 : Math.cos(ph * 2) * 0.12 * dir;
            }
            else if (a.kind === 'along') {
                const d = ((t * a.speed * (rm ? 0.5 : 1) / a.len + a.o) % 1) * a.len;
                let i = 1; while (i < a.acc.length - 1 && a.acc[i] < d) i++;
                const u = (d - a.acc[i - 1]) / Math.max(1, a.acc[i] - a.acc[i - 1]);
                a.s.position.set(lerp(a.path[i - 1][0], a.path[i][0], u), lerp(a.path[i - 1][1], a.path[i][1], u) + Math.sin(t * 3 + a.o * 9) * 4);
                a.s.alpha = Math.sin(Math.PI * d / a.len) * 0.9;
            }
        }
        stepNewPages(dt, t, F, rm, snap);
        if (S.whirl) { S.whirl.visible = !F.has('coin_got'); S.whirl.rotation += dt * (rm ? 0.6 : 2.2); }
        if (S.coin) { S.coin.view.visible = !F.has('coin_got'); S.coin.update(dt, t); }
        const carryAt = { x: snap.x - (snap.facing || 1) * 40, y: snap.y - h(0.8) + Math.sin(t * 3) * 4 };
        S.carryCoin.view.visible = F.has('coin_got') && !F.has('coin_given') && !coinFlight;
        if (S.carryCoin.view.visible) { S.carryCoin.view.position.set(carryAt.x, carryAt.y); S.carryCoin.update(dt, t); }
        // the coin flies: up from the whirlpool's eye to the sköldhäst, or from the sköldhäst to Skatan's beak
        if (coinFlight) {
            const c = coinFlight;
            c.t += dt / c.dur;
            const u = clamp(c.t, 0, 1), e = u * u * (3 - 2 * u), to = c.to === 'carry' ? carryAt : c.to;
            c.coin.view.position.set(lerp(c.from.x, to.x, e), lerp(c.from.y, to.y, e) - Math.sin(u * Math.PI) * c.arc);
            c.coin.view.scale.set(lerp(c.s0, c.s1, e));
            c.coin.update(dt, t * 3);
            if (u >= 1) { c.coin.view.destroy({ children: true }); coinFlight = null; c.done?.(); }
        }

        // the cocoa tree shakes while the hooves drum
        if (S.cocoa) {
            const n = G.puz.drum || 0, shaking = !F.has('p1_fallen') && n > 0;
            // after the story it shakes again for each beat on the log (the easter egg in Kakaolunden)
            S.cocoaShake = Math.max(0, (S.cocoaShake || 0) - dt);
            const after = S.cocoaShake > 0 ? 0.004 * Math.min(8, 2 + (G.puz.drumAfter || 0)) : 0;
            S.cocoa.rotation = rm ? 0 : shaking ? Math.sin(t * 30) * 0.004 * Math.min(8, n) : Math.sin(t * 30) * after;
        }
        // cocoa fruits shaken down after the story: they fall, bounce once, lie a while in the grass and are gone
        if (S.cocoaPods) for (let i = S.cocoaPods.length - 1; i >= 0; i--) {
            const q = S.cocoaPods[i];
            q.t += dt;
            if (!q.landed) {
                q.vy += 1500 * dt; q.y += q.vy * dt; q.g.rotation += q.spin * dt;
                if (q.y >= q.gy) {
                    q.y = q.gy;
                    if (q.vy > 260 && !rm) { q.vy *= -0.3; emit('leaf', q.x, q.gy - 6, 3, { speed: 70, gravity: 160, life: 0.8, cone: 2 }); }
                    else { q.landed = true; q.lie = q.t; q.g.rotation = q.side * 1.35; }
                }
            }
            q.g.position.set(q.x, q.y - (q.landed ? 16 : 0));
            if (q.landed && q.t - q.lie > 7) { q.g.alpha -= dt; if (q.g.alpha <= 0) { q.g.destroy(); S.cocoaPods.splice(i, 1); } }
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
            e.update(dt, t, { glow: st.state === 'buried' ? 1.4 : 1, wobble: st.state === 'tree' && (G.puz.drum || 0) > 0 ? 1 : 0,
                lit: st.state === 'dark' ? 0 : 1 });
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
                // after the story they can follow the sköldhäst in a row (G.hatchFollow, story.mjs): each trots after
                // the one in front, the smallest, Lilla Klo, first; they wait at the water's edge
                const p = G.player, f = p.facing || 1;
                let tx = k.home + Math.sin(t * 0.6 + i) * h(0.25), face = Math.cos(t * 0.6 + i) > 0 ? 1 : -1;
                if (G.hatchFollow) { tx = p.x - f * (h(0.75) + (EGG_TOTAL - 1 - i) * h(0.34)); face = Math.sign(p.x - (k.x ?? tx)) || f; }
                k.x = k.x ?? tx;
                const nx = rm ? tx : lerp(k.x, tx, 1 - Math.exp(-(G.hatchFollow ? 3.2 - i * 0.12 : 1.4) * dt));
                const gy = groundY(G.sceneDef, nx);
                if (gy !== null && !(G.sceneDef.waters || []).some(w => nx > w.x0 && nx < w.x1 && gy > w.top - 6)) k.x = nx;
                const y = groundY(G.sceneDef, k.x) ?? G.sceneDef.nest.y;
                k.k.view.position.set(k.x, y);
                k.k.update(dt, t, { facing: face, reducedMotion: rm });
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
        stepPickups(dt, t, W, H, rm);
        // the egg that falls from the cocoa tree lands with a little bounce and a puff of sand
        for (const [id, rec] of S.eggs) {
            const st = eggState(G, rec.egg).state;
            if (rec.was === 'falling' && st === 'loose') { rec.bounce = 0; emit('dust', rec.egg.x, rec.egg.y, 8, { speed: 160, gravity: 400, tint: 0xe6d2a2 }); cam.shake = Math.max(cam.shake, 3); }
            rec.was = st;
            if (rec.bounce !== undefined && rec.e.view.visible) {
                rec.bounce += dt;
                const b = rm ? 0 : Math.max(0, 1 - rec.bounce / 0.45);
                rec.e.view.y -= Math.abs(Math.sin(rec.bounce * 14)) * 14 * b;
                rec.e.view.scale.set(EGG_SCALE * (1 + 0.12 * b * Math.cos(rec.bounce * 28)), EGG_SCALE * (1 - 0.1 * b * Math.cos(rec.bounce * 28)));
                if (rec.bounce > 0.45) { rec.e.view.scale.set(EGG_SCALE); delete rec.bounce; }
            }
            void id;
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
        for (const id of ['klo', 'skata', 'dyvel']) {
            const a = act[id], sh = S.shadows?.[id];
            if (!sh) continue;
            sh.visible = !!a && a.visible !== false && a.scene === S.id && !(id === 'klo' && a.pose === 'faint');
            if (sh.visible) sh.position.set(a.x, a.y + 2);
        }
        if (S.shellBall) {
            const d = act.dyvel, sb = S.shellBall, on = F.has('dyvel_shellball') && d?.visible && d.scene === S.id;
            sb.c.visible = !!on;
            if (on) {
                sb.pop = Math.min(1, sb.pop + dt * 2.5);
                const x = d.x + (d.facing || 1) * h(0.75), gy = groundY(S.def, x) ?? d.y;
                sb.c.position.set(x, gy); sb.c.scale.set(rm ? 1 : 0.6 + 0.4 * sb.pop);
            }
        }
        for (const id of ['tukan', 'skata', 'dyvel', 'moln']) {
            const a = act[id], v = A[id];
            if (!a || a.scene !== S.id) { v.view.visible = false; continue; }
            v.update(dt, { ...a, talking: G.speaker === id, pose: id === 'tukan' && G.speaker === 'tukan' && a.pose === 'idle' ? 'idle' : a.pose }, t, { reducedMotion: rm, storm: stormShown });
        }
        // the hero
        if (G.speaker === 'horse' && !snap.action && !rm && !snap.hide) { snap.action = 'talk'; snap.actionT = (t * 1.5) % 1; }
        hero.update(dt, ride ? { ...snap, facing: -1, action: null } : snap);
        hero.view.position.set(snap.x, snap.y);
        hero.view.visible = !G.hideHero;
        stepLantern(dt, t, F, W, H, rm, snap);
        stepGusts(dt, W, H, rm);
        if (ride) stepRide(dt, t, W, H, rm);

        // rain and lightning (the storm is Molnet's: it rains less once the cloud is met)
        const under = snap.mode === 'swim' && snap.submerge > 0.7;
        const sheltered = (S.id === 'strand' && snap.x > h(89)) || (S.id === 'skog' && snap.x > h(74.3) && snap.x < h(87.7) && snap.y > h(-0.95));
        rain.visible = stormShown > 0.03 && S.def.sky !== 'cave';
        // and how loud it is (main.mjs gives it to the audio engine's rain bed): softer under shelter and gone in the cave
        rainLevel = rain.visible ? stormShown * (sheltered ? 0.35 : 1) : 0;
        const nRain = Math.round(drops.length * stormShown * (rm ? 0.35 : 1));
        // leaves torn loose by the storm blow across the forest pages
        if (!rm && stormShown > 0.4 && (S.def.sky === 'forest' || S.def.sky === 'river') && Math.random() < dt * 1.6 * stormShown) {
            const vw = W / cam.zoom, vh = H / cam.zoom;
            emit('leaf', cam.x + vw * 0.55, cam.y - vh * 0.35 + Math.random() * vh * 0.5, 1,
                { angle: Math.PI + 0.25, cone: 0.5, speed: 420, gravity: 70, life: 4.5, spread: 10, scale: 1 + Math.random() * 0.6, tint: Math.random() > 0.5 ? 0x8aa05a : 0xb08a4a });
        }
        if (rain.visible && !rm && !under && !sheltered) {
            // drops hitting the ground in view
            const vw = W / cam.zoom;
            for (let k = 0; k < 3; k++) {
                if (Math.random() > dt * 26 * stormShown) continue;
                const x = cam.x + (Math.random() - 0.5) * vw, y = groundY(S.def, x);
                if (y !== null) emit('drop', x, y - 2, 2, { speed: 140, cone: 1.3, life: 0.3, gravity: 900, spread: 6, spreadY: 2, scale: 0.6 });
            }
        }
        for (let i = 0; i < drops.length; i++) {
            const d = drops[i], s = d.s;
            s.visible = i < nRain;
            if (!s.visible) continue;
            d.y = (d.y + dt * d.v * (rm ? 0.5 : 1.6)) % 1;
            // the storm's wind blows west, away from Åsktoppen, as the torn leaves and the gusts on the mountain do;
            // the rain leans the way it falls (it drifted east and was drawn upright, 6 November)
            s.position.set(((d.x - d.y * 0.15 - cam.x * cam.zoom * 0.0004) % 1 + 1) % 1 * W, d.y * H);
            s.rotation = Math.atan2(0.15 * W, H);
            s.alpha = (under ? 0.15 : 0.55) * stormShown * (sheltered ? 0.12 : 1);
        }
        // lightning: now and then over the forest; on the peak it follows the bridge's lightning schedule
        if (stormShown > 0.3 && S.def.sky !== 'peak') {
            nextLightning -= dt;
            if (nextLightning <= 0) { lightning((S.def.sky === 'cave' ? 0.2 : 0.6) * stormShown); nextLightning = (6 + hash(t, 3) * 7) / stormShown; }
        }
        if (S.def.sky === 'peak' && F.has('flash')) flash = Math.max(flash, rm ? 0.12 : 0.22);
        flash = Math.max(0, flash - dt * 3.2);
        if (S.boltRim) S.boltRim.alpha = Math.min(1, flash * (rm ? 1 : 1.8));
        flashG.clear();
        if (flash > 0) flashG.rect(0, 0, W, H).fill({ color: 0xe8eeff, alpha: flash * (rm ? 0.25 : 0.5) });
        if (tooth) { tooth.width = W; tooth.height = H; }
        fade = fadeTarget > fade ? Math.min(fadeTarget, fade + dt * fadeRate) : Math.max(fadeTarget, fade - dt * fadeRate);
        fadeG.clear();
        if (fade > 0) fadeG.rect(0, 0, W, H).fill({ color: 0xfbf8f1, alpha: fade });
        for (const w of [...waiters]) if (w.test()) { waiters.delete(w); w.resolve(); }
    }

    function stepNewPages(dt, t, F, rm, snap) {
        // K1: each crystal plate glows as it rings; the chasm lightens once all three are lit
        if (S.crystalPlates) {
            const need = S.def.crystals?.beats || 2, allLit = F.has('k1_lit');
            const next = allLit ? null : S.def.crystals?.plates.find(c => !F.has(c));
            for (const cp of S.crystalPlates) {
                const n = allLit || F.has(cp.id) ? need : Math.min(need, G.puz.crystal?.[cp.id] || 0);
                const blink = cp.id === next ? (rm ? 0.5 : 0.28 + 0.34 * (0.5 + 0.5 * Math.sin(t * 5))) : 0;
                const target = n >= need ? 0.85 : Math.max(n * 0.25, blink);
                cp.shine.alpha = lerp(cp.shine.alpha, n >= need ? 0.55 : blink * 1.3, 1 - Math.exp(-12 * dt));
                cp.glow.alpha = lerp(cp.glow.alpha, target * (0.85 + 0.15 * Math.sin(t * 3 + cp.cx)), 1 - Math.exp(-6 * dt));
            }
        }
        if (S.chasmDark) {
            const lit = F.has('k1_lit');
            S.chasmDark.alpha = lerp(S.chasmDark.alpha, lit ? 0 : 1, 1 - Math.exp(-1.4 * dt));
            S.chasmPit.alpha = lerp(S.chasmPit.alpha, lit ? 0.5 : 1, 1 - Math.exp(-1.4 * dt));
            // lit, the pit's dark sinks below the bridge's deck: the dashed bridge "syns", and the crystal
            // bridge drawn over it is crystal, not a dark band (the deck lies in L.terrain, under L.fore)
            const top = lerp(S.chasmPit.y, lit ? h(-0.03) : h(-0.45), 1 - Math.exp(-1.4 * dt));
            S.chasmPit.y = top; S.chasmPit.height = h(4.2) - top;
            S.chasmGlow.alpha = lerp(S.chasmGlow.alpha, lit && !F.has('k1_bridge') ? 0.45 + 0.15 * Math.sin(t * 2) : lit ? 0.2 : 0, 1 - Math.exp(-2 * dt));
        }
        if (S.shimmer) for (const sh of S.shimmer) sh.alpha = rm ? 0.8 : 0.65 + 0.35 * Math.sin(t * 2.6);
        if (S.bridgeGlow) for (const b of S.bridgeGlow) b.sp.alpha = rm ? 0.3 : 0.22 + 0.14 * Math.sin(t * 3 + b.o);
        // K3: the glitter ball, the plates, the gate
        if (S.glitter) {
            const pose = glitterPose(G);
            S.glitter.view.position.set(pose.x, pose.y);
            S.glitter.spin.rotation = pose.spin * 0.6;
            S.glitter.glints.forEach((st, i) => { st.alpha = 0.4 + 0.6 * Math.max(0, Math.sin(t * 4 + i * 2.1)); });
        }
        if (S.kplates) for (const kp of S.kplates) {
            const on = kp.test();
            kp.down = lerp(kp.down, on ? 1 : 0, 1 - Math.exp(-8 * dt));
            kp.c.y = kp.y + kp.down * 8;
            kp.gl.alpha = kp.down * (F.has('k3_open') ? 0.6 : 0.4);
        }
        if (S.gate) {
            S.gateLift = lerp(S.gateLift, F.has('k3_open') ? 1 : 0, 1 - Math.exp(-(rm ? 3 : 1.5) * dt));
            S.gate.y = S.def.spots.gate.y - S.gateLift * h(2.7);
            if (!rm && F.has('k3_open') && S.gateLift < 0.9) S.gate.x = S.def.spots.gate.x + Math.sin(t * 40) * 1.5;
            else S.gate.x = S.def.spots.gate.x;
        }
        // the strand cave darkens towards the mountain until there is a lantern
        if (S.caveDark) S.caveDark.alpha = lerp(S.caveDark.alpha, F.has('lantern') ? 0.12 : 1, 1 - Math.exp(-1.5 * dt));
        // Åsktoppen: the eye of the storm turns, and calms once the cloud is met
        if (S.eye) {
            const calm = F.has('cloud_met') ? 1 : 0;
            S.eye.calm = lerp(S.eye.calm ?? calm, calm, 1 - Math.exp(-0.8 * dt));
            const turn = t * (rm ? 0.03 : 0.25) * (1 - S.eye.calm * 0.8);
            for (const pf of S.eye.puffs) {
                const a = pf.a + turn, rx = h(7.4) * (1 + S.eye.calm * 0.6), ry = h(2.8) * (1 + S.eye.calm * 0.5);
                pf.pf.position.set(S.eye.x + Math.cos(a) * rx, S.eye.y + Math.sin(a) * ry);
                pf.pf.alpha = 0.95 - S.eye.calm * 0.75;
            }
            S.eyeGlow.alpha = 0.25 + S.eye.calm * 0.2;
            S.eyeSwirl.rotation = turn * 1.6; S.eyeSwirl.alpha = 1 - S.eye.calm * 0.85;
        }
        if (S.tufts) {
            const gst = G.puz.gust, w = gst?.w;
            for (const tf of S.tufts) {
                const inWind = w && tf.x >= w.x0 && tf.x <= w.x1;
                const target = inWind ? (gst.state === 'gust' ? 1 : 0.25) : 0;
                tf.bend = lerp(tf.bend || 0, target, 1 - Math.exp(-8 * dt));
                if (inWind) tf.dir = w.dir > 0 ? 1 : -1;
                tf.tf.rotation = (tf.dir || -1) * tf.bend * (rm ? 0.35 : 0.6) + (rm ? 0 : Math.sin(t * 2 + tf.o) * 0.05);
            }
        }
        // the mushroom squashes when it bounces the sköldhäst up
        if (S.mushroom) {
            const m = S.mushroom; m.t += dt;
            const k = m.t < 1.2 ? Math.exp(-6 * m.t) * Math.cos(16 * m.t) * (rm ? 0.12 : 0.28) : 0;
            // after the story it giggles: a quick little shiver from side to side
            if (m.giggle !== undefined) m.giggle += dt;
            const gg = m.giggle < 1.1 && !rm ? Math.sin(m.giggle * 38) * 0.07 * (1 - m.giggle / 1.1) : 0;
            m.c.scale.set(1 + k * 0.6, 1 - k);
            m.c.rotation = gg;
        }
        void snap;
    }

    // the moonshine seed Tukankrabban carries lights the dark: in the strand cave and inside the mountain
    const lantern = new PIXI.Container(); lantern.visible = false;
    const lanternGlow = new RAW.Sprite(TX.mote); lanternGlow.anchor.set(0.5); lanternGlow.tint = 0xfff0b0; lanternGlow.blendMode = 'add';
    const lanternSeed = new PIXI.Graphics();
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; lanternSeed.ellipse(Math.cos(a) * 7, Math.sin(a) * 7, 6, 4).fill(pen.fill(0xdfe6ff)); }
    lanternSeed.circle(0, 0, 5).fill(pen.fill(0xfff0a6));
    lantern.addChild(lanternGlow, lanternSeed);
    L.hero.addChild(lantern); // the hero's layer is never cleared between pages
    let shadeTex = null;
    const shade = new RAW.Sprite(RAW.Texture.EMPTY); shade.anchor.set(0.5); shade.visible = false; overlay.addChildAt(shade, 0);
    function stepLantern(dt, t, F, W, H, rm, snap) {
        const tk = G.actors.tukan, inCave = S.def.underground || (S.id === 'strand' && snap.x > h(91.5));
        lantern.visible = F.has('lantern') && inCave;
        let lx = snap.x, ly = snap.y - h(0.9);
        if (tk && tk.visible && tk.scene === S.id && Math.abs(tk.x - snap.x) < h(6)) { lx = tk.x + (tk.facing || 1) * 34; ly = tk.y - h(0.62); }
        lantern.position.set(lx, ly + (rm ? 0 : Math.sin(t * 2.2) * 4));
        lanternGlow.scale.set(11 + (rm ? 0 : Math.sin(t * 3.1) * 0.6)); lanternGlow.alpha = 0.32;
        lanternSeed.rotation = rm ? 0 : t * 0.6;
        // inside the mountain the edges of the screen fall into darkness round the light
        shade.visible = !!S.def.underground && !ride;
        if (!shade.visible) return;
        if (!shadeTex) {
            const cv = document.createElement('canvas'); cv.width = cv.height = 512;
            const ctx = cv.getContext('2d'), gr = ctx.createRadialGradient(256, 256, 0, 256, 256, 160);
            gr.addColorStop(0, 'rgba(5,4,10,0)'); gr.addColorStop(0.4, 'rgba(5,4,10,0)'); gr.addColorStop(0.75, 'rgba(5,4,10,0.32)'); gr.addColorStop(1, 'rgba(5,4,10,0.6)');
            ctx.fillStyle = gr; ctx.fillRect(0, 0, 512, 512);
            shadeTex = RAW.Texture.from(cv);
        }
        shade.texture = shadeTex;
        const sp = { x: world.position.x + lx * cam.zoom, y: world.position.y + ly * cam.zoom };
        shade.position.set(sp.x, sp.y);
        shade.scale.set(Math.hypot(W, H) * 0.75 / 160);
        shade.alpha = 1;
    }

    // Åsktoppen's gusts: streaks of wind across the screen, a warning first
    const gustLayer = new RAW.Container(); overlay.addChildAt(gustLayer, 1);
    const gustTex = texFrom(gr => {
        // a gust drawn as a pencil swoosh: thin at both ends, a little curve, a short curl at its head
        for (let k = 0; k < 10; k++) {
            const u0 = k / 10, u1 = (k + 1) / 10, w2 = 0.6 + Math.sin(u0 * Math.PI) * 2.4;
            const y = (u) => Math.sin(u * Math.PI) * -6;
            gr.moveTo(-48 + u0 * 96, y(u0)).lineTo(-48 + u1 * 96, y(u1)).stroke({ width: w2, color: 0xe6e8f6, alpha: 0.85, cap: 'round' });
        }
        gr.moveTo(-48, 0).quadraticCurveTo(-60, -6, -54, -12).stroke({ width: 1, color: 0xe6e8f6, alpha: 0.7, cap: 'round' });
    }, 130, 28);
    const gusts = [];
    for (let i = 0; i < 26; i++) { const st = new RAW.Sprite(gustTex); st.anchor.set(0.5); gustLayer.addChild(st); gusts.push({ st, x: hash(i, 171), y: hash(i, 172), v: 0.8 + hash(i, 173) * 0.6, k: 0.6 + hash(i, 174) * 1.2 }); }
    let gustAmt = 0, gustDir = -1;
    function stepGusts(dt, W, H, rm) {
        const g2 = G.puz.gust, w = g2?.w, vw = W / cam.zoom;
        const near = w && S.id === 'topp' && cam.x + vw / 2 > w.x0 && cam.x - vw / 2 < w.x1;
        const target = near ? (g2.state === 'gust' ? 1 : 0.25) : 0;
        gustAmt = lerp(gustAmt, target, 1 - Math.exp(-6 * dt));
        gustLayer.visible = gustAmt > 0.02;
        if (!gustLayer.visible) return;
        const n = Math.round(gusts.length * gustAmt * (rm ? 0.3 : 1));
        if (w) gustDir = w.dir > 0 ? 1 : -1;
        gusts.forEach((q, i) => {
            q.st.visible = i < n;
            if (!q.st.visible) return;
            q.x = (q.x + gustDir * dt * q.v * (rm ? 0.5 : 1.8) + 1) % 1;
            q.st.position.set(q.x * (W + 160) - 80, q.y * H * 0.8 + H * 0.05);
            q.st.scale.set(-gustDir * q.k * 1.4, 1);
            q.st.alpha = 0.55 * gustAmt;
        });
    }

    // the cloud carries everyone home: a little picture over the river, the peak falling behind
    let ride = null;
    function startRide() {
        const W = app.screen.width, H = app.screen.height;
        const layer = new PIXI.Container(); overlay.addChildAt(layer, overlay.getChildIndex(fadeG));
        const sky = new RAW.Graphics();
        const top = SKY.storm[0], mid2 = mixColor(SKY.storm[1], SKY.moon[1], 0.5), low = mixColor(SKY.storm[2], SKY.moon[2], 0.6);
        for (let i = 0; i < 14; i++) { const u = i / 13, c = u < 0.6 ? mixColor(top, mid2, u / 0.6) : mixColor(mid2, low, (u - 0.6) / 0.4); sky.rect(0, Math.floor(H * i / 14), W, Math.ceil(H / 14) + 1).fill({ color: c }); }
        layer.addChild(sky);
        const starsR = [];
        for (let i = 0; i < 30; i++) { const st = new RAW.Sprite(TX.star); st.anchor.set(0.5); st.position.set(hash(i, 181) * W, hash(i, 182) * H * 0.5); st.scale.set(0.3 + hash(i, 183) * 0.4); st.alpha = 0; layer.addChild(st); starsR.push(st); }
        const peakR = new PIXI.Graphics();
        peakR.poly([-260, 0, -120, -230, -60, -300, 0, -360, 50, -290, 120, -240, 260, 0]).fill(pen.fill(0x3a3c5c)).stroke(pen.line(0x22243a, 2.4, 0.8));
        peakR.poly([-40, -320, 0, -360, 40, -318, 20, -300, -10, -312]).fill(pen.fill(0xc9ccdf, 0.8));
        layer.addChild(peakR);
        const forestR = new RAW.TilingSprite({ texture: farForest[1].t.texture, width: W, height: farForest[1].h });
        layer.addChild(forestR);
        const river = new PIXI.Graphics();
        const ry = H * 0.9;
        river.moveTo(0, ry);
        for (let x = 0; x <= W; x += 40) river.lineTo(x, ry + Math.sin(x * 0.01) * 10);
        river.lineTo(W, H).lineTo(0, H).closePath().fill(pen.fill(0x3f6f8e)).stroke(pen.line(0xb7d6e6, 2, 0.6));
        layer.addChild(river);
        const cloudR = createCloud(PIXI, pen, { texture: cloudTexture }); layer.addChild(cloudR.view);
        const riders = new PIXI.Container(); layer.addChild(riders);
        const fluff = new PIXI.Graphics();
        for (let k = 0; k < 9; k++) fluff.circle(-200 + k * 50, 6 + (k % 2) * 8, 26 + hash(k, 191) * 12).fill(pen.fill(k % 2 ? 0xf2f0fa : 0xe4e0f2)).stroke(pen.line(0x8f88b0, 1.4, 0.6));
        layer.addChild(fluff);
        const trail = [];
        for (let i = 0; i < 10; i++) { const st = new RAW.Sprite(TX.star); st.anchor.set(0.5); layer.addChild(st); trail.push({ st, o: i / 10 }); }
        // the riders: the sköldhäst, Tukankrabban and Professor Klo themselves
        const klo = S.A.klo.container, tukan = S.A.tukan.view;
        riders.addChild(tukan, hero.view, klo);
        if (G.actors.klo) G.actors.klo.facing = -1;
        if (G.actors.tukan) G.actors.tukan.facing = -1;
        ride = { t0: G.time, dur: G.lessMotion ? 2.4 : 4.6, layer, starsR, peakR, forestR, river, cloudR, riders, fluff, trail, klo, tukan };
    }
    function stepRide(dt, t, W, H, rm) {
        const r = ride, u = clamp((G.time - r.t0) / r.dur, 0, 1), e = u * u * (3 - 2 * u);
        const s = clamp(Math.min(0.55 * W / 720, H / 800), 0.25, 1);
        for (const st of r.starsR) st.alpha = clamp(u * 1.4 - 0.2, 0, 0.9) * (0.6 + 0.4 * Math.sin(t * 1.3 + st.x));
        r.peakR.scale.set(s * 1.3); r.peakR.position.set(W * (0.82 + e * 0.5), H * 0.93); // its foot behind the river
        r.forestR.width = W; r.forestR.y = H * 0.9 - farForest[1].top; r.forestR.tilePosition.x += dt * (rm ? 20 : 90);
        const cx = lerp(W * 0.68, W * 0.36, e), cy = H * 0.5 + (rm ? 0 : Math.sin(t * 1.6) * 8 * s);
        r.cloudR.update(dt, { visible: true, x: cx, y: cy, pose: 'happy' }, t, { reducedMotion: rm, storm: 0 });
        r.cloudR.view.scale.set(3 * s);
        const feet = cy - 34 * 3 * s;
        r.riders.position.set(cx, feet); r.riders.scale.set(s);
        r.tukan.position.set(-230, 6); r.klo.position.set(220, 4); hero.view.position.set(0, 0);
        r.tukan.visible = true; r.klo.visible = true; hero.view.visible = true;
        r.fluff.position.set(cx, feet + 14 * s); r.fluff.scale.set(s);
        for (const q of r.trail) {
            const v = (t * 0.8 + q.o) % 1;
            q.st.position.set(cx + (200 + v * 360) * s, cy + 30 * s + Math.sin(v * 9 + q.o * 20) * 30 * s);
            q.st.alpha = (1 - v) * 0.9; q.st.scale.set(0.5 * (1 - v * 0.5));
        }
    }
    function endRide() {
        if (!ride) return;
        const r = ride; ride = null;
        L.hero.addChild(hero.view);
        if (S?.A) { L.actors.addChildAt(r.klo, 0); L.actors.addChildAt(r.tukan, Math.min(2, L.actors.children.length)); }
        r.cloudR.destroy();
        r.layer.destroy({ children: true });
    }

    // the air of each page: the storm night until the moon, the cave, the mountain top
    const MOOD_A2 = {
        storm: MOODS.storm, moonlit: MOODS.moonlit,
        forestStorm: { ...MOODS.storm, motes: { ...MOODS.storm.motes, n: 18 } },
        forestMoon: { ...MOODS.moonlit, motes: { ...MOODS.moonlit.motes, n: 36 } },
        cave: { ...MOODS.cave, vignette: { ...MOODS.cave.vignette, alpha: 0.2 } }, peak: MOODS.peak
    };
    function moodFor(sky, stormLevel) {
        if (sky === 'cave') return MOOD_A2.cave;
        if (sky === 'peak') return MOOD_A2.peak;
        const moon = G.flags.has('moon');
        if (sky === 'forest') return moon ? MOOD_A2.forestMoon : MOOD_A2.forestStorm;
        return moon ? MOOD_A2.moonlit : MOOD_A2.storm;
    }

    function drawSky(W, H, night, t, dt) {
        skyG.clear();
        const kind = S.def.sky, pal = kind === 'cave' ? SKY.cave : kind === 'peak' ? SKY.peak : SKY.storm;
        const n = kind === 'cave' ? 0 : night;
        const top = mixColor(pal[0], SKY.moon[0], n), mid = mixColor(pal[1], SKY.moon[1], n), low = mixColor(pal[2], SKY.moon[2], n);
        stars.visible = kind !== 'cave';
        stormClouds.visible = kind !== 'cave';
        skyHatch.visible = kind !== 'cave';
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
        moon.visible = moonState.shown > 0.01 && kind !== 'cave';
        // once Alva's stars are drawn, the moon and its stars rise into the open sky
        const riseTo = G.flags.has('alva_stars') ? 1 : 0;
        // it glides only while seen (the finale); a moon that fades in after a reload is already up
        moonState.rise = G.lessMotion || moonState.shown < 0.02 ? riseTo : lerp(moonState.rise, riseTo, 1 - Math.exp(-0.9 * dt));
        const mp = moonScreen(W, H, moonState.rise);
        moon.position.set(mp.x, mp.y); moon.scale.set(mp.r / 60); moon.alpha = moonState.shown;
        starsState.shown = lerp(starsState.shown, G.flags.has('alva_stars') ? 1 : 0, 1 - Math.exp(-2 * dt));
        alvaStars.visible = starsState.shown > 0.01 && kind !== 'cave';
        alvaStars.children.forEach((s, i) => {
            const [dx, dy, k] = s._d;
            s.position.set(mp.x + dx * mp.r, mp.y + dy * mp.r);
            s.scale.set(k * mp.r / 30 * (1 + (G.lessMotion ? 0 : 0.12 * Math.sin(t * 2.5 + i))));
            s.rotation = G.lessMotion ? 0 : Math.sin(t * 0.7 + i) * 0.15;
            s.alpha = starsState.shown;
        });
        // a falling star: from the biggest of Alva's stars down across the sky, its tail fading behind it
        shootG.clear();
        if (shooting) {
            shooting.t += dt;
            const u = shooting.t / 2.2;
            if (u >= 1 || kind === 'cave') shooting = null;
            else {
                const [dx, dy] = ALVA_STARS[0];
                // a short arc down to the left, staying in the open sky above the horizon and away from the notes
                const sx = mp.x + dx * mp.r, sy = mp.y + dy * mp.r, ex = sx - W * 0.3, ey = sy + Math.min(H * 0.16, mp.r * 1.6);
                const e = G.lessMotion ? 0 : 1 - (1 - u) * (1 - u), fade = Math.sin(Math.PI * Math.min(1, u * 1.15));
                const hx = sx + (ex - sx) * e, hy = sy + (ey - sy) * e, tail = G.lessMotion ? 0 : Math.min(0.5, e);
                const tx = sx + (ex - sx) * (e - tail), ty = sy + (ey - sy) * (e - tail);
                if (tail > 0) {
                    shootG.moveTo(tx, ty).lineTo(hx, hy).stroke({ color: 0xfff3c8, width: 9, alpha: 0.22 * fade, cap: 'round' });
                    shootG.moveTo(tx + (hx - tx) * 0.35, ty + (hy - ty) * 0.35).lineTo(hx, hy).stroke({ color: 0xfffbe8, width: 3.6, alpha: 0.9 * fade, cap: 'round' });
                }
                shootG.circle(hx, hy, 16).fill({ color: 0xfff3c8, alpha: 0.3 * fade });
                shootG.circle(hx, hy, 6).fill({ color: 0xffffff, alpha: 0.95 * fade });
            }
        }
        // storm clouds drift and thin out
        for (const c of cloudShapes) {
            c.c.position.set(((c.x * (W + c.w * 2) - cam.x * cam.zoom * c.par + t * (G.lessMotion ? 2 : 8)) % (W + c.w * 2) + (W + c.w * 2)) % (W + c.w * 2) - c.w, c.y * H);
            c.c.alpha = 0.15 + 0.85 * stormShown;
        }
    }
    function moonScreen(W = app.screen.width, H = app.screen.height, rise = 0) {
        // While Mira and Alva draw: below the drawing pad's prompt, so the dots to trace are never under it.
        // Risen: in landscape, up in the open sky above the treetops, which crossed it there. In portrait
        // the speech boxes are at the top, so it stays (and the mountain is behind it, see moonLayer).
        const r = Math.max(34, Math.min(W, H) * 0.09);
        const drawn = Math.max(r + 170, H * 0.27), sky = W > H ? Math.max(r + 62, H * 0.17) : drawn;
        const e = rise * rise * (3 - 2 * rise);
        return { x: W * 0.7, y: drawn + (sky - drawn) * e, r };
    }

    /** In a conversation the camera keeps three things in the picture: the sköldhäst, the one speaking, and what
     *  the lines are about (G.camLook, set by story.mjs about()). It slides over and steps back a little (to 75 %
     *  of the usual zoom, 70 % for a thing talked about) until they fit. If they cannot all fit, what is talked
     *  about comes first; a speaker too far away is shown by the edge badge (ui.mjs) and the sköldhäst stays. */
    function frameSpeaker(tx, ty, zoom, W, H) {
        const who = G.speaker, a = who && who !== 'horse' ? G.actors[who] : null, p = G.player;
        const look = G.camLook && (!G.camLook.scene || G.camLook.scene === S.id) ? G.camLook : null; // only on its own page
        const speaker = a && a.scene === S.id && a.visible !== false ? a : null;
        if ((!speaker && !look) || G.hideHero) return { tx, ty, zoom };
        // a little air round what is talked about, so its ends are not on the screen's edge
        const boxes = look ? [{ x0: look.x0 - h(0.5), x1: look.x1 + h(0.5), y0: look.y0 - h(0.3), y1: look.y1 + h(0.2) }] : [];
        if (speaker) {
            const head = who === 'moln' ? h(0.6) : who === 'klo' ? h(0.45) : h(1.1);
            const side = Math.min(h(1.1), W / zoom * 0.16);
            boxes.push({ x0: speaker.x - side, x1: speaker.x + side, y0: speaker.y - head - h(0.35), y1: speaker.y + h(0.2) });
        }
        const union = bs => ({ x0: Math.min(...bs.map(b => b.x0)), x1: Math.max(...bs.map(b => b.x1)),
            y0: Math.min(...bs.map(b => b.y0)), y1: Math.max(...bs.map(b => b.y1)) });
        const them = union(boxes), all = union([{ x0: p.x - h(0.7), x1: p.x + h(0.7), y0: p.y - h(1.6), y1: p.y + h(0.2) }, ...boxes]);
        zoom = Math.max(zoom * (look ? 0.7 : 0.75), Math.min(zoom, W / (all.x1 - all.x0), H / (all.y1 - all.y0)));
        const vw = W / zoom, vh = H / zoom;
        if (all.x1 - all.x0 <= vw) tx = clamp(tx, all.x1 - vw / 2, all.x0 + vw / 2);
        // what is talked about first, as near the sköldhäst as it allows
        else if (look) tx = them.x1 - them.x0 <= vw ? clamp(p.x, them.x1 - vw / 2, them.x0 + vw / 2) : (them.x0 + them.x1) / 2;
        else tx = p.x + Math.sign(speaker.x - p.x) * (vw / 2 - h(0.9)); // as far toward them as keeps the sköldhäst in
        if (all.y1 - all.y0 <= vh) ty = clamp(ty, all.y1 - vh / 2, all.y0 + vh / 2);
        else if (look) ty = them.y1 - them.y0 <= vh ? clamp(p.y, them.y1 - vh / 2, them.y0 + vh / 2) : (them.y0 + them.y1) / 2;
        return { tx, ty, zoom };
    }

    function updateCamera(dt, snap, W, H) {
        const def = S.def, b = def.bounds;
        let zoom = Math.min(W / h(11), H / h(6.2));
        zoom = Math.max(zoom, H / h(14));
        zoom = Math.min(zoom, 0.9);
        const p = G.player;
        if (p.mode === 'swim') zoom *= 0.9;
        if (S.id === 'skog' && p.x < h(26) && p.y < h(-1.5)) zoom *= 0.82; // the giant tree: see the branches above
        const lift = H > W * 1.15 ? Math.max(h(1.2), (H / zoom) * 0.2) : h(1.2); // portrait: ground at about 70 % of the height
        let tx = snap.x + (snap.facing || 1) * Math.min(h(1.6), W / zoom * 0.12), ty = snap.y - (p.mode === 'swim' ? h(0.2) : lift);
        const hint = G.camHint;
        if (hint) { tx = hint.x; ty = hint.y; zoom *= hint.zoom || 1; }
        // a story's view that shows something far away keeps its frame; one around the sköldhäst
        // (a conversation staged at the nest) still takes in the speaker
        if (!hint || Math.abs(hint.x - snap.x) < W / zoom * 0.45) ({ tx, ty, zoom } = frameSpeaker(tx, ty, zoom, W, H));
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
        atmo.flash(strength);
        if (S && S.def.sky !== 'cave' && !G.lessMotion) {
            // a jagged bolt across the sky
            const W = app.screen.width, H = app.screen.height;
            let px = W * (0.15 + Math.random() * 0.7), py = 0;
            skyBolt.clear().moveTo(px, py);
            while (py < H * 0.45) { px += (Math.random() - 0.5) * 60; py += 30 + Math.random() * 40; skyBolt.lineTo(px, py); }
            skyBolt.stroke(pen.line(0xfff4b0, 4, 0.9));
            boltT = 0.16;
        }
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
                peakVistaOn = !!data?.peak;
                if (!data) { G.camHint = null; return; }
                G.camHint = { x: data.x, y: data.y, zoom: data.zoom || 1 };
                await waitGame(rm ? 0.3 : 0.9);
                if (data.hold) await waitGame(data.hold);
                return;
            case 'lightning': lightning(0.9); await waitGame(0.7); return;
            // after the story: Molnet over the nest flashes for joy, small and soft
            case 'cloudJoy': lightning(G.lessMotion ? 0.25 : 0.45); return;
            // Tordyveln shows his ball of eggshells: it pops up beside him with a few sparkles
            case 'shellBall': { if (S?.shellBall) S.shellBall.pop = 0; const d = G.actors.dyvel; if (d) emit('star', d.x + (d.facing || 1) * h(0.75), d.y - h(0.3), 8, { g: 0, speed: 140 }); await waitGame(0.5); return; }
            // Åsktoppen after the story: a star falls from Alva's stars
            case 'starFall': shooting = { t: 0 }; await waitGame(rm ? 0.6 : 2.0); return;
            // Djupa skogen after the story: the mushroom giggles, shakes and puffs glowing spores
            case 'giggle': {
                const m = S.def.surfaces.find(q => q.id === 'mushroom');
                if (!m) return;
                const cx = (m.pts[0][0] + m.pts.at(-1)[0]) / 2, cy = m.pts[0][1];
                if (S.mushroom) S.mushroom.giggle = 0;
                // the spores float up after the sköldhäst, past the branch it lands on
                emit('star', cx, cy - 6, 18, { speed: 230, gravity: -40, life: 2.8, cone: 1.1, spread: h(0.9), tint: 0xe9d5ff });
                await waitGame(rm ? 0.2 : 0.6);
                return;
            }
            // Kakaolunden after the story: the drummed tree drops a cocoa fruit beside the log
            case 'cocoaFall': {
                if (!S?.cocoa) return;
                S.cocoaPods ||= [];
                if (S.cocoaPods.length >= 3) S.cocoaPods.shift().g.destroy();
                const side = Math.random() < 0.5 ? -1 : 1, x = S.cocoa.x + side * h(0.7 + Math.random() * 0.4);
                const g = new PIXI.Graphics();
                g.ellipse(0, 0, 12, 22).fill(pen.fill(0x9a5e32)).stroke(pen.line(0x5b3418, 1.6));
                g.moveTo(-4, -18).lineTo(-4, 18).stroke(pen.line(0xc78b55, 1.2, 0.7));
                g.scale.set(1.5); // a little bigger than those on the trunk, so it is seen where it lands
                L.objects.addChild(g);
                const y0 = S.cocoa.y - h(2.6);
                // the hollow log lies under the tree: the fruit lands on top of it, not hidden behind it
                const log = S.def.surfaces.find(q => q.id === 'log'), onLog = log && x >= log.pts[0][0] && x <= log.pts.at(-1)[0];
                const gy = onLog ? heightOn(log.pts, x) : groundY(S.def, x) ?? S.cocoa.y;
                S.cocoaPods.push({ g, x, y: y0, vy: 0, gy, t: 0, spin: side * 3, side, landed: false });
                emit('leaf', S.cocoa.x, S.cocoa.y - h(4), 8, { speed: 140, gravity: 120, life: 1.6, cone: 3 });
                await waitGame(rm ? 0.2 : 0.6);
                return;
            }
            // Skatan copies the whinny: she sings out (a sparkle by her beak)
            case 'skataMimic': { const k = G.actors.skata; if (k) emit('star', k.x, k.y - h(0.5), 5, { g: 0, speed: 90 }); return; }
            case 'eggsDrop': {
                // from Skatan's nest, or from where the story says (the cloud on Åsktoppen, which has no magpie: it
                // threw there and the last egg never fell from the cloud, 5 November)
                const from = data.from || { x: S.def.magpie.x, y: S.def.magpie.y - 10 };
                const ids = data.ids || [];
                await Promise.all(ids.map((id, i) => new Promise(done => {
                    const e = createEgg(PIXI, pen, EGG_SCALE); L.fx.addChild(e.view);
                    S.flying.push({ id, e, from: { x: from.x + i * 24, y: from.y }, to: { x: G.player.x, y: G.player.y - h(0.6) }, t: -i * 0.3, dur: rm ? 0.4 : 0.9, arc: h(0.8), done });
                })));
                emit('star', G.player.x, G.player.y - h(0.7), 10, { speed: 180, gravity: 60, life: 0.9 });
                return;
            }
            case 'coinGive': {
                // the sköldhäst holds out the coin and it flies to Skatan's beak
                const sk = G.actors.skata, p = G.player;
                if (!sk) return;
                const from = { x: p.x - (p.facing || 1) * 40, y: p.y - h(0.8) };
                await new Promise(done => flyCoin(from, { x: sk.x + (sk.facing || -1) * 24, y: sk.y - h(0.55) }, { dur: rm ? 0.3 : 0.8, arc: rm ? 0 : h(0.7), s0: 1.2, s1: 0.8, done }));
                emit('star', sk.x, sk.y - h(0.6), 6, { speed: 140, gravity: 40, life: 0.7 });
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
                const t0 = G.time;
                m.x = from.x; m.y = from.y;
                G.camHint = { x: to.x, y: to.y + h(2.2), zoom: 0.85 };
                await until(() => { const u = Math.min(1, (G.time - t0) / dur), e = u * u * (3 - 2 * u); m.x = lerp(from.x, to.x, e); m.y = lerp(from.y, to.y, e); return u >= 1; });
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
            case 'cloudRide': {
                fadeTarget = 1; fadeRate = 3; await until(() => fade >= 1);
                startRide();
                fadeTarget = 0; fadeRate = 2.5;
                const r = ride;
                await until(() => !ride || G.time - r.t0 >= r.dur);
                fadeTarget = 1; fadeRate = 2; await until(() => fade >= 1);
                endRide();
                return;
            }
            case 'fadeOut': fadeTarget = 1; fadeRate = data.rate || 2.5; await until(() => fade >= 1); return;
            case 'fadeIn': fadeTarget = 0; fadeRate = data.rate || 2; await until(() => fade <= 0); return;
            default: return;
        }
    }

    // --- an egg picked up flies into the egg count ---------------------------------------------
    // It pops up where it was, then flies in an arc into the count in the corner (eggTarget, from main),
    // which counts it as it lands (eggsArriving). In "Mindre rörelse" it goes straight there, quickly.
    const pickups = [];
    let coinFlight = null, eggsLanded = 0;
    function startPickup(id) {
        const rec = S?.eggs.get(id), p = G.player;
        const near = rec?.e.view.visible && Math.hypot(rec.e.view.x - p.x, rec.e.view.y - p.y) < h(4);
        const from = near ? { x: rec.e.view.x, y: rec.e.view.y } : { x: p.x, y: p.y - h(0.7) };
        const e = createEgg(PIXI, pen); overlay.addChild(e.view);
        pickups.push({ id, e, from, t: 0 });
    }
    function stepPickups(dt, t, W, H, rm) {
        for (let i = pickups.length - 1; i >= 0; i--) {
            const k = pickups[i];
            k.t += dt;
            const pop = rm ? 0 : 0.32, fly = rm ? 0.35 : 0.75;
            const start = { x: world.position.x + k.from.x * cam.zoom, y: world.position.y + k.from.y * cam.zoom };
            const goal = eggTarget?.() || { x: W - 120, y: 40 };
            const size = cam.zoom * EGG_SCALE; // the egg's own size in the picture
            if (k.t < pop) {
                // up out of the sand or off the branch, a little bigger
                const u = k.t / pop, e = 1 - (1 - u) * (1 - u);
                // it grows to a size worth seeing (on a phone the egg in the picture is only a few pixels)
                k.e.view.position.set(start.x, start.y - e * 60);
                k.e.view.scale.set(lerp(size, Math.max(1.5, size * 1.4), e));
                k.e.view.rotation = Math.sin(u * Math.PI) * 0.25;
                k.at = { x: k.e.view.x, y: k.e.view.y, s: k.e.view.scale.x };
            } else {
                const a = k.at || { x: start.x, y: start.y, s: size };
                const u = Math.min(1, (k.t - pop) / fly), e = u * u * (3 - 2 * u);
                // an arc, but its top stays on the screen (the count sits near the top edge)
                // (the egg is drawn upward from its foot, about 30 px per unit of scale)
                const arc = rm ? 0 : Math.sin(u * Math.PI) * Math.max(0, Math.min(120, Math.hypot(goal.x - a.x, goal.y - a.y) * 0.25, (a.y + goal.y) / 2 - 16 - 30 * a.s));
                k.e.view.position.set(lerp(a.x, goal.x, e), lerp(a.y, goal.y + 12, e) - arc);
                k.e.view.scale.set(lerp(a.s, 0.8, e));
                k.e.view.rotation = (1 - e) * 0.25 + e * Math.PI * 2 * (rm ? 0 : 1);
                if (u >= 1) { k.e.destroy(); pickups.splice(i, 1); eggsLanded++; continue; }
            }
            k.e.update(dt, t, { glow: 1.3 });
        }
    }
    function flyCoin(from, to, { dur, arc, s0 = 1.2, s1 = 0.7, done } = {}) {
        if (coinFlight) { coinFlight.coin.view.destroy({ children: true }); coinFlight.done?.(); }
        const coin = createCoin(PIXI, pen, 1); L.fx.addChild(coin.view);
        coinFlight = { coin, from, to, t: 0, dur, arc, s0, s1, done };
    }

    // --- events for little effects ----------------------------------------------------------
    const offs = [
        G.on('egg', ({ id }) => startPickup(id)),
        G.on('coin', () => { if (S?.def.spots.coin) flyCoin({ x: S.def.spots.coin.x, y: S.def.spots.coin.y - 16 }, 'carry', { dur: G.lessMotion ? 0.3 : 0.9, arc: G.lessMotion ? 0 : h(0.9), s0: 1.8, s1: 1.2 }); }),
        G.on('flash', ({ on }) => { if (on && S?.def.sky === 'peak') lightning(0.85); }),
        G.on('crystalRing', ({ id }) => { const cp = S?.crystalPlates?.find(q => q.id === id); if (cp) emit('star', cp.cx, cp.cy - 10, 5, { speed: 180, gravity: 60, life: 0.7, tint: 0xcfeaff }); }),
        G.on('crystalLit', () => { if (S?.crystalPlates) for (const cp of S.crystalPlates) emit('star', cp.cx, cp.cy - 10, 4, { speed: 160, gravity: 30, life: 1 }); }),
        G.on('bounce', (e) => { if (S?.mushroom) S.mushroom.t = 0; emit('star', e.x, e.y - 10, 6, { speed: 200, gravity: 200, life: 0.6, tint: 0xe9d5ff }); }),
        G.on('plateOpen', () => { if (S?.gate) { cam.shake = 8; emit('dust', S.gate.x, S.def.spots.gate.y, 16, { speed: 220, gravity: 300, spread: h(0.9), tint: 0xb2aed4 }); } }),
        G.on('glitterIn', () => { const b = S?.def.glitterBall; if (b) emit('bubble', b.stopX, h(1.6), 10, { speed: 140, gravity: -160, life: 1.2 }); }),
        G.on('glitterRoll', () => { const b = S?.def.glitterBall; if (b) emit('star', b.edge, h(-0.9), 8, { speed: 160, gravity: 80, life: 0.9 }); }),
        G.on('egg', () => { emit('star', G.player.x, G.player.y - h(0.7), 9, { speed: 220, gravity: 80, life: 0.9 }); }),
        G.on('splashIn', (e) => emit('drop', e.x, e.y, Math.round(6 + (e.size || 0.5) * 10), { speed: 320, cone: 1.4 })),
        G.on('splashOut', (e) => emit('drop', e.x, e.y, 5, { speed: 220 })),
        G.on('drum', () => { if (S?.cocoa) emit('leaf', S.cocoa.x + (Math.random() - 0.5) * h(2), S.cocoa.y - h(4.2), 2, { speed: 60, gravity: 90, life: 1.6, cone: 3 }); cam.shake = 4; }),
        G.on('drumAfter', () => { if (S?.cocoa) { S.cocoaShake = 0.5; emit('leaf', S.cocoa.x + (Math.random() - 0.5) * h(2), S.cocoa.y - h(4.2), 2, { speed: 60, gravity: 90, life: 1.6, cone: 3 }); } cam.shake = 4; }),
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
        /** For checks: Mira's moon and Alva's stars, and how far the moon has risen. */
        moonParts: () => ({ moon, stars: alvaStars, rise: moonState.rise }),
        /** Eggs picked up but still flying to the count (main shows the count without them until they land). */
        get eggsArriving() { return pickups.length; },
        get eggsLanded() { return eggsLanded; },
        get rainLevel() { return rainLevel; },
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
            endRide();
            clearScene();
            hero?.destroy?.(); hero = null;
            for (const t of Object.values(TX)) t.destroy(true);
            gustTex.destroy(true); shadeTex?.destroy(true);
            atmo.destroy();
            for (const f of farSprites) f.t.texture.destroy(true);
            root.destroy({ children: true });
        }
    };
}
