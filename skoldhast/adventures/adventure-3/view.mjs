/*
 * Äventyr 3 – the world on screen (PixiJS 8, WebGL), drawn in coloured pencil (docs/skoldhast/adventure-3.md, section 16).
 *
 *   const view = createView(PIXI, app, { assets, G, heroFactory, lightTarget });
 *   view.setScene(id); view.render(dt, snap); await view.fx(name, data); view.drawGuide(kind);
 *
 * As Äventyr 2's view: shapes are built once per page, frames only move, fade and show them. Everything is drawn
 * in code on Äventyr 1's own pencil tiles (no new download). The skies are view-sky.mjs; the characters are
 * characters.mjs (Nova painted, everything else pencil); the sköldhäst is src/hero.mjs and Klo src/klo.mjs.
 *
 * The pages: the Moon (pale yellow pencil, grey craters, the night side lit only by Nova's red lamps), the
 * constellations (open space, asteroids, star-lines, the sleeping bear, Pip), Ringo (ice floes on Mira's striped
 * planet's ring, gravel showers, the shadow line, Kometen), the white hole (the paper itself, bright and empty;
 * dents, fog, the Moon hanging far too close), and Vintergatan (the comet's straight tail across the whole sky).
 */
import { HL, cond, heightOn } from '../../src/sim.mjs';
import { pencilStyle, pencilPixi, resampleX } from '../../src/pencil-style.mjs';
import { createAir } from '../../src/atmosphere.mjs';
import { createKlo } from '../../src/klo.mjs';
import { createNova, createSuddet, createPip, createKomet, createRocket, createStarLight, createCerealBox, createCrumbs,
    createSkyMoon, createDent, createBearFigure, constellationLine, PAL, starPoints, dashedPath } from './characters.mjs';
import { createSky } from './view-sky.mjs';
import { lightState, boxPose, icePose, rocketHere, showerAt, lightFlag, cometState } from './puzzles.mjs';

const h = (v) => v * HL;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const mixColor = (a, b, t) => {
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
};
const hash = (x, s = 0) => { const v = Math.sin(x * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const TAU = Math.PI * 2;

/** Nova's own drawing is about 2 lengths tall: in the world she hovers a little taller than the sköldhäst. */
const NOVA_SCALE = 0.7;
/** How tall each one stands (horse lengths): the "Prata" bubble floats just above that. */
const TALK_HEAD = { klo: 0.34, nova: 1.45, sudd: 0.25 };

// the air over each page (src/atmosphere.mjs moods, defined here as Äventyr 2 does)
const MOOD = {
    // no air on the Moon: no haze; a cool grey-gold light from the upper left; slow dust motes
    moon: {
        light: { x: 0.16, y: 0.06, color: 0xfff0c8, alpha: 0.28, size: 1.2 },
        rays: { color: 0xfff4d8, alpha: 0.05, count: 3, angle: 0.5, length: 1.1 },
        motes: { kind: 'dust', n: 14, color: 0xe8dcc0, alpha: 0.4 },
        vignette: { color: 0x0b0d1c, alpha: 0.32 },
        grade: { color: 0xe6e4f0, alpha: 0.05, blend: 'multiply' }
    },
    // space: no ground haze, slow specks at three depths, a faint nebula glow, no vignette darkening the centre
    space: {
        light: { x: 0.72, y: 0.2, color: 0xc8b8ff, alpha: 0.16, size: 1.5 },
        motes: { kind: 'dust', n: 30, color: 0xdfe4ff, alpha: 0.55 },
        vignette: { color: 0x05061a, alpha: 0.12 },
        grade: { color: 0xe6e2ff, alpha: 0.04, blend: 'multiply' }
    },
    // the ring: warm light on the sunny half, blue shade on the other, glints on ice
    ring: {
        light: { x: 0.9, y: 0.12, color: 0xffe2b0, alpha: 0.36, size: 1.3 },
        rays: { color: 0xfff0d0, alpha: 0.06, count: 3, angle: -0.6, length: 1.2 },
        motes: { kind: 'dust', n: 18, color: 0xdff4ff, alpha: 0.5 },
        vignette: { color: 0x0a0c22, alpha: 0.28 },
        grade: { color: 0xe8ecff, alpha: 0.05, blend: 'multiply' }
    },
    // the white: no bloom, no vignette, soft grey smears drifting; lifted, not darkened
    white: {
        motes: { kind: 'dust', n: 14, color: 0x9a96a6, alpha: 0.3 },
        grade: { color: 0xffffff, alpha: 0.0, blend: 'multiply' }
    },
    // the climax: light from below only, a strong vignette, everything cool and grey
    dread: {
        light: { x: 0.5, y: 1.15, color: 0xe8ecff, alpha: 0.22, size: 1.6 },
        motes: { kind: 'dust', n: 26, color: 0xf2a0b4, alpha: 0.5 },
        vignette: { color: 0x05040a, alpha: 0.72 },
        grade: { color: 0xa9b0c8, alpha: 0.2, blend: 'multiply' }
    },
    // Vintergatan: the sky at its fullest
    milky: {
        light: { x: 0.12, y: 0.3, color: 0xfff4d8, alpha: 0.24, size: 1.4 },
        motes: { kind: 'firefly', n: 24, color: 0xfff1c0, alpha: 0.85 },
        vignette: { color: 0x05061a, alpha: 0.2 },
        grade: { color: 0xeef0ff, alpha: 0.03, blend: 'multiply' }
    },
    // the Moon in the dark after its light ran out (F2): only Vintergatan and Nova's lamps
    moonDark: {
        light: { x: 0.8, y: 0.0, color: 0xd8dcff, alpha: 0.18, size: 1.4 },
        motes: { kind: 'dust', n: 10, color: 0xb0b4d8, alpha: 0.3 },
        vignette: { color: 0x02030a, alpha: 0.6 },
        grade: { color: 0x9aa0c8, alpha: 0.2, blend: 'multiply' }
    }
};
/** An outline of the sköldhäst standing, in the hero's own units (facing right, origin on the ground under the
 *  middle): twelve stroke groups in the order the hooves draw them back (V5). */
const OUTLINE = [
    [[54, -58], [58, -30], [52, -4], [62, -2]],                               // a front leg
    [[78, -60], [84, -32], [80, -4], [90, -2]],                               // the other front leg
    [[-46, -56], [-50, -28], [-44, -4], [-34, -2]],                           // a hind leg
    [[-20, -58], [-22, -30], [-18, -4], [-8, -2]],                            // the other hind leg
    [[-52, -58], [-20, -62], [20, -62], [70, -64], [92, -70]],                // the belly
    [[-74, -70], [-70, -112], [-40, -142], [0, -148], [36, -134], [52, -108]], // the shell's back
    [[-50, -90], [-30, -124], [-4, -96], [22, -122], [40, -100]],             // the plates
    [[84, -76], [96, -112], [108, -146]],                                     // the neck's front
    [[100, -150], [128, -156], [140, -142], [126, -128], [108, -126]],        // the head
    [[110, -150], [104, -170], [116, -156]],                                  // the ear
    [[96, -150], [84, -132], [74, -112], [66, -92]],                          // the mane
    [[-74, -84], [-96, -92], [-108, -76]]                                     // the tail
];

export function createView(PIXI, app, { assets, G, heroFactory, lightTarget = null }) {
    const T = (name) => assets.tex(name);
    const pen = pencilStyle(T);
    const RAW = PIXI;
    PIXI = pencilPixi(PIXI, T);
    let destroyed = false;
    const root = new RAW.Container(); root.label = 'a3-view';
    app.stage.addChild(root);
    const sky = createSky(RAW, PIXI, app, pen);
    const farLayer = new RAW.Container(); farLayer.label = 'far';
    const world = new PIXI.Container(); world.label = 'world';
    const overlay = new RAW.Container(); overlay.label = 'overlay';
    const atmoBack = new RAW.Container(), atmoFront = new RAW.Container();
    root.addChild(sky.root, farLayer, atmoBack, world, atmoFront, overlay);
    const atmo = createAir(RAW, app, { back: atmoBack, front: atmoFront });
    const L = {};
    for (const name of ['back', 'terrain', 'mid', 'objects', 'dark', 'actors', 'hero', 'fore', 'fx']) {
        L[name] = new PIXI.Container(); L[name].label = 'w-' + name; world.addChild(L[name]);
    }
    const ENV = [L.back, L.terrain, L.mid, L.fore];
    const cam = { x: 0, y: 0, zoom: 0.5, snap: true, shake: 0 };
    let S = null;
    let hero = heroFactory();
    L.hero.addChild(hero.view);
    let flameTexture = null;
    let fade = 0, fadeTarget = 0, fadeRate = 3, fadeColor = 0xfbf8f1;
    let flash = 0;
    const waiters = new Set();
    const anims = [];
    // what the staged moments hold for the frame (the camera's vista, the dread, the outline, …)
    const V = { vista: 0, vistaOn: false, dread: 0, dreadOn: false, outline: 1, outlineDash: 0, selfGlow: 0, black: 0,
        heroHidden: false, homeCount: null, goldUpTo: null, alvaFocus: 0, alvaFocusOn: false, linesK: 0, numbers: false,
        extraStars: 0, rimLight: null, forestRise: 0, snore: 0, wagonRoll: 0, bearStand: 0, bearWalk: 0, rub: null,
        cometSweep: null, slingshot: null, rocketRub: null, landing: null, travel: null, earthrise: 0, pipFlash: 0, notesRub: 0 };

    // --- textures made once -------------------------------------------------------------------
    function texFrom(draw, w, hgt) {
        const gr = new RAW.Graphics();
        draw(gr);
        const t = app.renderer.generateTexture({ target: gr, resolution: 1, frame: new RAW.Rectangle(-w / 2, -hgt / 2, w, hgt) });
        gr.destroy();
        return t;
    }
    function canvasTex(w, hgt, paint) {
        if (typeof document === 'undefined') return RAW.Texture.WHITE;
        const cv = document.createElement('canvas'); cv.width = w; cv.height = hgt;
        paint(cv.getContext('2d'), w, hgt);
        return RAW.Texture.from(cv);
    }
    const TX = {
        star: texFrom(g => { g.moveTo(-8, 0).lineTo(8, 0).moveTo(0, -8).lineTo(0, 8).stroke({ width: 2.2, color: 0xfff6cf, cap: 'round' }); g.circle(0, 0, 2).fill(0xffffff); }, 20, 20),
        dot: texFrom(g => { for (let i = 5; i >= 1; i--) g.circle(0, 0, i * 1.6).fill({ color: 0xffffff, alpha: 0.16 }); g.circle(0, 0, 1.8).fill(0xffffff); }, 20, 20),
        dust: texFrom(g => g.circle(0, 0, 3).fill({ color: 0xe8dcc0, alpha: 0.85 }), 8, 8),
        crumb: texFrom(g => { g.moveTo(3, 0).arc(0, 0, 3, 0, 3.8).stroke({ width: 2.2, color: PAL.crumb, cap: 'round' }); }, 10, 10),
        gravel: texFrom(g => { g.poly([-3, -2, 2, -3, 4, 1, 0, 3, -3, 2]).fill({ color: 0x9aa6b8 }); g.moveTo(-3, -2).lineTo(4, 1).stroke({ width: 1, color: 0x4a5468 }); }, 10, 10),
        streak: texFrom(g => g.moveTo(-16, 0).lineTo(16, 0).stroke({ width: 2.4, color: 0xd9e4f2, alpha: 0.8, cap: 'round' }), 36, 6),
        shadow: texFrom(g => { for (let i = 6; i >= 1; i--) g.ellipse(0, 0, i * 9.5, i * 2.4).fill({ color: 0x1a1424, alpha: 0.075 }); }, 124, 32),
        // a grey smudge, rubbed in with a pencil's side: soft all round, hatched
        smear: canvasTex(256, 256, (c, w, hh) => {
            const g = c.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2);
            g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.55, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = g; c.fillRect(0, 0, w, hh);
            c.globalCompositeOperation = 'destination-out'; c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.lineCap = 'round';
            for (let k = 0; k < 160; k++) { const x = hash(k, 1) * w, y = hash(k, 2) * hh; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y + 12); c.stroke(); }
        }),
        glow: canvasTex(128, 128, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); }),
        vglow: canvasTex(256, 128, (c, w, hh) => {
            const img = c.createImageData(w, hh);
            for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
                const v = Math.exp(-(((y / (hh - 1)) - 0.5) ** 2) / 0.045), u = x / (w - 1);
                const e = Math.min(1, u / 0.06, (1 - u) / 0.06);
                const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(255 * v * e * e * (3 - 2 * e));
            }
            c.putImageData(img, 0, 0);
        }),
        nightBand: canvasTex(256, 8, (c, w, hh) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.07, 'rgba(255,255,255,1)'); g.addColorStop(0.93, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, hh); }),
        band: canvasTex(256, 8, (c, w, hh) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.16, 'rgba(255,255,255,0.85)'); g.addColorStop(0.26, 'rgba(255,255,255,1)'); g.addColorStop(0.86, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, hh); }),
        up: canvasTex(8, 256, (c, w, hh) => { const g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,1)'); c.fillStyle = g; c.fillRect(0, 0, w, hh); }),
        down: canvasTex(8, 256, (c, w, hh) => { const g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, hh); })
    };
    let tooth = null;
    function makeTooth() {
        const t = T('paper-tooth');
        if (!t || tooth) return;
        tooth = new RAW.TilingSprite({ texture: t, width: app.screen.width, height: app.screen.height });
        tooth.blendMode = 'multiply'; tooth.alpha = 0.32;
        overlay.addChildAt(tooth, 0);
    }
    // screen-space pieces of the staged pictures
    const fromBelow = new RAW.Sprite(TX.up); fromBelow.visible = false; fromBelow.blendMode = 'normal';
    const fromAbove = new RAW.Sprite(TX.down); fromAbove.visible = false; fromAbove.tint = 0x02030a;
    const pictureLayer = new RAW.Container(); pictureLayer.label = 'pictures';
    const flashG = new RAW.Graphics();
    const fadeG = new RAW.Graphics();
    overlay.addChild(fromAbove, fromBelow, pictureLayer, flashG, fadeG);

    // --- particles -----------------------------------------------------------------------------
    const parts = [];
    function emit(kind, x, y, n = 6, o = {}) {
        if (!S) return;
        if (G.lessMotion) n = Math.ceil(n / 3);
        const layer = o.layer || L.fx;
        for (let i = 0; i < n; i++) {
            const s = new RAW.Sprite(TX[kind] || TX.dust); s.anchor.set(0.5);
            s.position.set(x + (Math.random() - 0.5) * (o.spread || 20), y + (Math.random() - 0.5) * (o.spreadY || 10));
            layer.addChild(s);
            const a = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.cone ?? 1.6);
            const v = (o.speed || 220) * (0.5 + Math.random() * 0.7);
            parts.push({ s, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.gravity ?? 600, life: o.life || 0.8, t: 0, spin: (Math.random() - 0.5) * 6, scale: o.scale || 1 });
            s.scale.set(o.scale || 1);
            if (o.tint) s.tint = o.tint;
            if (o.add) s.blendMode = 'add';
        }
    }
    function stepParticles(dt) {
        for (let i = parts.length - 1; i >= 0; i--) {
            const q = parts[i];
            q.t += dt;
            if (q.t >= q.life || q.s.destroyed) { if (!q.s.destroyed) q.s.destroy(); parts.splice(i, 1); continue; }
            q.vy += q.g * dt;
            q.s.x += q.vx * dt; q.s.y += q.vy * dt; q.s.rotation += q.spin * dt;
            q.s.alpha = 1 - q.t / q.life;
        }
    }
    function animate(dur, fn) {
        return new Promise(resolve => anims.push({ t: 0, dur: Math.max(0.001, G.lessMotion ? Math.min(dur, Math.max(0.35, dur * 0.4)) : dur), fn, resolve }));
    }
    function stepAnims(dt) {
        for (let i = anims.length - 1; i >= 0; i--) {
            const a = anims[i];
            a.t += dt;
            const u = clamp(a.t / a.dur, 0, 1);
            try { a.fn(u); } catch (err) { console.warn('a3 view anim', err); }
            if (u >= 1) { anims.splice(i, 1); a.resolve(); }
        }
    }

    // --- drawing helpers -------------------------------------------------------------------------
    const poly = (gr, pts) => gr.poly(pts.flat());
    function lineAlong(gr, pts) { gr.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) gr.lineTo(pts[i][0], pts[i][1]); return gr; }
    const offset = (pts, dy) => pts.map(([x, y]) => [x, y + dy]);
    function softSprite(tex, x, y, w, hh, tint, alpha, layer, blend = 'normal') {
        const s = new RAW.Sprite(tex); s.anchor.set(0.5); s.position.set(x, y); s.width = w; s.height = hh; s.tint = tint; s.alpha = alpha; s.blendMode = blend;
        layer.addChild(s); return s;
    }
    /** A lumpy rock under a top line: an island in space, a boulder on the Moon. */
    function rockShape(top, depth, seed) {
        const x0 = top[0][0], x1 = top.at(-1)[0], w = x1 - x0;
        const under = [];
        const n = 14;
        for (let i = n; i >= 0; i--) {
            const u = i / n, x = x0 + w * u;
            const d = depth * Math.sin(Math.PI * Math.min(1, Math.max(0, u * 1.02 - 0.01))) ** 0.7 * (0.75 + hash(i, seed) * 0.4);
            const y = (heightOn(top, clamp(x, x0, x1)) ?? top[0][1]) + 10 + d;
            under.push([x + (hash(i, seed + 1) - 0.5) * w * 0.05, y]);
        }
        return [...resampleX(top, 20), ...under];
    }

    // --- scene building --------------------------------------------------------------------------
    function clearScene() {
        if (!S) return;
        for (const l of Object.values(L)) if (l !== L.hero) l.removeChildren().forEach(c => c.destroy({ children: true }));
        farLayer.removeChildren().forEach(c => c.destroy({ children: true }));
        pictureLayer.removeChildren().forEach(c => c.destroy({ children: true }));
        parts.length = 0;
        S = null;
    }
    function buildScene(id) {
        clearScene();
        const def = G.scenes[id];
        S = { id, def, when: [], dashed: new Map(), anim: [], lights: new Map(), A: {}, beamRings: [], fogs: [], ghosts: [] };
        sky.setKind(def.sky);
        atmo.setMood(moodFor(), { instant: true });
        V.heroHidden = false;
        // a page's own big moments never follow to the next page (the bear standing, the wagon's ride)
        V.bearStand = 0; V.bearWalk = 0; V.wagonRoll = 0; V.rideOffset = null;
        if (id === 'sudd') buildWhitePage(def);
        if (id === 'vinter') buildRide(def);
        for (const s of def.surfaces) if (!s.hidden) buildSurface(s, def);
        if (id === 'mane') for (const s of def.surfaces) if (s.hidden) buildPit(s, def);
        for (const d of def.dashed || []) buildDashed(d);
        if (id === 'mane') buildMoon(def);
        if (id === 'stjarn') buildConstellations(def);
        if (id === 'ring') buildRing(def);
        if (id === 'sudd') buildWhiteThings(def);
        buildCommon(def);
        buildActors();
        refreshWhen();
        makeTooth();
    }

    // the ground of each kind (built once)
    function buildSurface(s, def) {
        const c = new PIXI.Container(); c.label = 's-' + s.id;
        const gr = new PIXI.Graphics(); c.addChild(gr);
        const top = resampleX(s.pts, 16);
        const bottom = def.bounds.y1 + h(4);
        const x0 = s.pts[0][0], x1 = s.pts.at(-1)[0];
        switch (s.mat) {
            case 'moon': {
                // Mira's moon, close up: pale yellow pencil, grey craters; the body darkens into the deep
                const body = [...top, [x1, bottom], [x0, bottom]];
                poly(gr, body).fill({ color: 0xe4d9a8 });
                poly(gr, body).fill(pen.hatch(0xcbbd86, 0.4));
                // the deep of the Moon darkens below a smoothed line (it does not follow every rift)
                const smooth = top.map(([x], i) => {
                    let lo = Infinity;
                    for (let j = Math.max(0, i - 14); j <= Math.min(top.length - 1, i + 14); j++) lo = Math.min(lo, top[j][1]);
                    return [x, lo];
                });
                for (const [d, a, col] of [[1.6, 0.22, 0x9a8f6a], [2.8, 0.3, 0x6a6458], [4.2, 0.45, 0x3a3a4a], [6.0, 0.6, 0x1e2034]]) {
                    const edge = smooth.map(([x, y], i) => [x, Math.max(y + h(d) + Math.sin(x * 0.004 + d) * h(0.25), top[i][1] + h(0.3))]);
                    poly(gr, [...edge, [x1, bottom], [x0, bottom]]).fill({ color: col, alpha: a });
                }
                poly(gr, [...top, ...offset(top, h(0.28)).reverse()]).fill({ color: 0xf6edc8, alpha: 0.85 });
                // craters pressed into the surface: grey bowls with a lit rim
                for (let x = x0 + h(0.8); x < x1 - h(0.8); x += h(1.3) + hash(x, 3) * h(2.2)) {
                    const y = heightOn(s.pts, x); if (y === null) continue;
                    const r = h(0.18 + hash(x, 4) * 0.32), dy = h(0.4 + hash(x, 5) * 1.3);
                    gr.ellipse(x, y + dy, r, r * 0.5).fill(pen.fill(0xb9ae88, 0.85)).stroke(pen.line(0x7d7356, 1.6, 0.7));
                    gr.ellipse(x - r * 0.15, y + dy - r * 0.12, r * 0.7, r * 0.28).fill({ color: 0x8f855f, alpha: 0.45 });
                }
                // small craters right on the surface line
                for (let x = x0 + h(0.6); x < x1 - h(0.6); x += h(2.4) + hash(x, 8) * h(3)) {
                    const y = heightOn(s.pts, x); if (y === null) continue;
                    const r = h(0.25 + hash(x, 9) * 0.25);
                    gr.ellipse(x, y + 5, r, r * 0.22).fill({ color: 0x8a8062, alpha: 0.55 }).stroke(pen.line(0x6d6450, 1.4, 0.7));
                }
                lineAlong(gr, s.pts).stroke(pen.line(0x6d6248, 3, 0.95));
                lineAlong(gr, offset(s.pts, 6)).stroke(pen.line(0xfff6d4, 2, 0.5));
                if (s.dark) S.darkGround = true;
                break;
            }
            case 'moonrock': {
                if (s.spire) {
                    // Spiran: a tall pillar of moon rock from the ground to Utsikten
                    const base = 0, pts = [...resampleX(s.pts, 20), [x1 + h(0.6), base - h(0.1)], [x1 + h(1.1), base + h(0.3)], [x0 - h(1.4), base + h(0.3)], [x0 - h(0.8), base - h(0.2)]];
                    poly(gr, pts).fill({ color: 0xc9bd8c });
                    poly(gr, pts).fill(pen.fill(0xc9bd8c, 0.6));
                    poly(gr, pts).fill(pen.hatch(0x8f8566, 0.6));
                    for (let k = 0; k < 9; k++) { const yy = s.pts[0][1] + h(0.8 + k * 0.85), xx = lerp(x0, x1, hash(k, 61)); gr.moveTo(xx - h(0.4), yy).lineTo(xx + h(0.5), yy + h(0.2)).stroke(pen.line(0x5d5644, 2.2, 0.6)); }
                    poly(gr, pts).stroke(pen.line(0x5d5644, 3, 0.9));
                    lineAlong(gr, s.pts).stroke(pen.line(0xfff6d4, 2.5, 0.6));
                } else {
                    // a boulder: a pillar down to the ground where one stands below, or a loose rock hanging free
                    let ground = null;
                    for (const q of def.surfaces) {
                        if (q === s || q.hidden || q.rock || (q.thin)) continue;
                        const y = heightOn(q.pts, (x0 + x1) / 2); if (y !== null && y > s.pts[0][1] && (ground === null || y < ground)) ground = y;
                    }
                    const loose = s.id.startsWith('stair') || s.ledge;
                    const depth = loose || ground === null ? h(0.75) : Math.max(h(0.6), ground - s.pts[0][1] + h(0.2));
                    const pts = loose || ground === null ? rockShape(s.pts, depth, x0) : [...resampleX(s.pts, 20), [x1 + h(0.12), s.pts.at(-1)[1] + depth * 0.5], [x1 + h(0.25), s.pts[0][1] + depth], [x0 - h(0.25), s.pts[0][1] + depth], [x0 - h(0.12), s.pts[0][1] + depth * 0.5]];
                    poly(gr, pts).fill({ color: 0xd6cb9f });
                    poly(gr, pts).fill(pen.fill(0xcfc395, 0.6));
                    poly(gr, pts).fill(pen.hatch(0x8f8566, 0.5));
                    poly(gr, [...resampleX(s.pts, 20), ...offset(resampleX(s.pts, 20), h(0.14)).reverse()]).fill({ color: 0xfff6d4, alpha: 0.4 });
                    for (let k = 0; k < 3; k++) { const xx = lerp(x0, x1, 0.2 + k * 0.3), yy = s.pts[0][1] + depth * (0.35 + hash(k, x0) * 0.3); gr.ellipse(xx, yy, h(0.1), h(0.05)).fill({ color: 0x7d7356, alpha: 0.5 }); }
                    poly(gr, pts).stroke(pen.line(0x5d5644, 2.6, 0.9));
                }
                break;
            }
            case 'asteroid': {
                const pts = rockShape(s.pts, h(1.1 + (x1 - x0) / HL * 0.06), x0);
                poly(gr, pts).fill({ color: s.dark ? 0x3a3448 : 0x6a6276 });
                poly(gr, pts).fill(pen.fill(s.dark ? 0x3a3448 : 0x6a6276, 0.6));
                poly(gr, pts).fill(pen.hatch(s.dark ? 0x1c1826 : 0x3c3648, 0.55));
                for (let k = 0; k < Math.max(2, (x1 - x0) / HL); k++) {
                    const xx = lerp(x0, x1, 0.15 + hash(k, x0 + 7) * 0.7), yy = (heightOn(s.pts, xx) ?? s.pts[0][1]) + h(0.3 + hash(k, x0 + 8) * 0.5), r = h(0.1 + hash(k, x0 + 9) * 0.15);
                    gr.ellipse(xx, yy, r, r * 0.6).fill({ color: 0x2a2434, alpha: 0.5 }).stroke(pen.line(0x9a92a8, 1.2, 0.5));
                }
                poly(gr, [...resampleX(s.pts, 20), ...offset(resampleX(s.pts, 20), h(0.12)).reverse()]).fill({ color: 0xc8c0d8, alpha: 0.45 });
                poly(gr, pts).stroke(pen.line(0x1f1a2a, 2.6, 0.9));
                break;
            }
            case 'starline': {
                constellationLine(gr, pen, s.pts, { width: 4.2, ink: PAL.bearLine, alpha: 0.95 });
                for (const [x, y] of s.pts) starAt(gr, x, y, 13);
                if (s.bear) S.bearBack = c;
                if (s.id === 'bearNoseLine') S.bearNose = c;
                break;
            }
            case 'starstone': {
                // a flat star to land on: it lights and rings in Orion's order
                const cx = (x0 + x1) / 2, cy = s.pts[0][1];
                const glowS = softSprite(TX.glow, cx, cy, h(2.2), h(1.4), 0xbfd4ff, 0.35, c, 'add');
                const st = new PIXI.Graphics();
                st.ellipse(cx, cy + h(0.18), (x1 - x0) / 2, h(0.2)).fill(pen.fill(0x8ea6e8)).stroke(pen.line(0x34437a, 2));
                st.ellipse(cx, cy, (x1 - x0) / 2, h(0.08)).fill(pen.fill(0xdfe8ff)).stroke(pen.line(0x4a5a96, 1.6));
                crossStarG(st, cx, cy - h(0.06), h(0.45), 0xf4f6ff);
                c.addChild(st);
                const lit = softSprite(TX.glow, cx, cy - h(0.1), h(2.6), h(2.6), 0xfff0b0, 0, c, 'add');
                (S.beltStones ||= {})[s.belt] = { glowS, lit, cx, cy };
                break;
            }
            case 'ice': {
                if (s.thin) {
                    const band = [...top, ...offset(top, h(0.32)).reverse()];
                    poly(gr, band).fill({ color: PAL.ice }); poly(gr, band).fill(pen.hatch(PAL.iceLo, 0.5));
                    lineAlong(gr, top).stroke(pen.line(PAL.iceInk, 2.6)); lineAlong(gr, offset(top, h(0.32))).stroke(pen.line(PAL.iceInk, 1.6, 0.7));
                    break;
                }
                // a floe of the ring: ice, its thickness hanging below, facets and glints
                const depth = h(0.9);
                const under = [];
                for (let i = 12; i >= 0; i--) { const x = lerp(x0, x1, i / 12); under.push([x, (heightOn(s.pts, x) ?? 0) + depth * (0.55 + hash(i, x0) * 0.45) * (i === 0 || i === 12 ? 0.35 : 1)]); }
                const pts = [...top, ...under];
                poly(gr, pts).fill({ color: 0xcde8f6 });
                poly(gr, pts).fill(pen.fill(0xcde8f6, 0.5));
                poly(gr, pts).fill(pen.hatch(0x8fbad6, 0.5));
                for (let x = x0 + h(0.6); x < x1 - h(0.4); x += h(0.9) + hash(x, 12) * h(1.4)) {
                    const y = heightOn(s.pts, x) ?? 0;
                    gr.moveTo(x, y + h(0.1)).lineTo(x + h(0.3), y + h(0.55)).lineTo(x + h(0.1), y + h(0.8)).stroke(pen.line(0x6a9ec0, 1.6, 0.6));
                }
                poly(gr, [...top, ...offset(top, h(0.12)).reverse()]).fill({ color: 0xffffff, alpha: 0.6 });
                poly(gr, pts).stroke(pen.line(PAL.iceInk, 2.4, 0.9));
                break;
            }
            case 'dent': {
                // a dent drawn by hooves: a dark, sure graphite line on the white
                const isLedge = s.ledge;
                lineAlong(gr, offset(top, 8)).stroke(pen.line(0x8a8696, 10, 0.25));
                lineAlong(gr, top).stroke(pen.line(0x2e2a36, isLedge ? 8 : 6, 0.95));
                lineAlong(gr, offset(top, -3)).stroke(pen.line(0x6a6676, 2, 0.6));
                break;
            }
            case 'night': {
                // the last dark ground at the edge of the sky
                const rag = []; for (let i = 1; i <= 12; i++) { const y = lerp(s.pts.at(-1)[1], bottom, i / 12); rag.push([x1 - h(0.1) - hash(i, 61) * h(0.5), y]); }
                const body = [...top, ...rag, [x0, bottom]];
                poly(gr, body).fill({ color: 0x1e2444 }); poly(gr, body).fill(pen.hatch(0x0d1128, 0.7));
                poly(gr, [...top, ...offset(top, h(0.25)).reverse()]).fill({ color: 0x4a5488, alpha: 0.6 });
                lineAlong(gr, s.pts).stroke(pen.line(0x0b0e20, 3));
                break;
            }
            case 'crumbs': {
                // Smulhögen: a hill of pink eraser crumbs
                const body = [...top, [x1, bottom], [x0, bottom]];
                poly(gr, body).fill({ color: 0xf0b4c2 });
                poly(gr, body).fill(pen.fill(0xf0b4c2, 0.5));
                poly(gr, body).fill(pen.hatch(0xd27a92, 0.5));
                for (const [d, a] of [[1.4, 0.18], [3.0, 0.22]]) poly(gr, [...offset(top, h(d)), [x1, bottom], [x0, bottom]]).fill({ color: 0xb05a74, alpha: a });
                for (let i = 0; i < 160; i++) {
                    const x = lerp(x0, x1, hash(i, 31)), y = (heightOn(s.pts, x) ?? 0) + h(hash(i, 32) * 2.4) + 6, r = 4 + hash(i, 33) * 7, a = hash(i, 34) * TAU;
                    gr.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r).arc(x, y, r, a, a + 3.4).stroke(pen.line(i % 3 ? PAL.crumb : PAL.crumbLo, 2.6 + r * 0.25, 0.85));
                }
                lineAlong(gr, s.pts).stroke(pen.line(0x9a4a62, 3, 0.9));
                break;
            }
            case 'tail': {
                if (s.loop) {
                    // the lower loop of the tail, which brings a missed jump round to the head again
                    const lp = [];
                    for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI; lp.push([h(1.4) + Math.cos(a) * h(1.6) * 0.6, h(1.8) + Math.sin(a) * h(1.8)]); }
                    lp.push(...resampleX(s.pts, 40).reverse());
                    lineAlong(gr, lp).stroke({ color: 0xfff2c0, width: 60, alpha: 0.12, cap: 'round', join: 'round' });
                    lineAlong(gr, lp).stroke(pen.line(0xfbe7a6, 22, 0.85));
                    lineAlong(gr, lp).stroke(pen.line(0xb08a3a, 2.4, 0.8));
                    break;
                }
                buildRoad(gr, s);
                break;
            }
            default:
                lineAlong(gr, top).stroke(pen.line(0x6a4b2c, 8));
        }
        L.terrain.addChild(c);
        if (s.when) S.when.push({ node: c, when: s.when });
    }
    /** A pit on the Moon: dark walls and a dusty floor far down (its floor is the ground guard's, never stood on). */
    function buildPit(s, def) {
        const gr = new PIXI.Graphics(), x0 = s.pts[0][0], x1 = s.pts.at(-1)[0], y = s.pts[0][1], bottom = def.bounds.y1 + h(4);
        const rim = def.surfaces.find(q => !q.hidden && q.pts.at(-1)[0] === x0)?.pts.at(-1)[1] ?? y - h(2);
        // the moon rock below the ground, then the pit cut into it: ragged walls narrowing to a dusty floor
        poly(gr, [[x0, rim], [x1, rim], [x1, bottom], [x0, bottom]]).fill({ color: 0x8f8566 });
        const wall = (side) => { const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([side < 0 ? x0 + u * h(0.45) + (hash(i, x0) - 0.5) * h(0.15) : x1 - u * h(0.45) + (hash(i, x1) - 0.5) * h(0.15), lerp(rim, y, u)]); } return pts; };
        const L0 = wall(-1), R0 = wall(1);
        const hole = [...L0, ...R0.reverse()];
        poly(gr, hole).fill({ color: 0x15172a });
        for (const [d, a] of [[0.25, 0.25], [0.5, 0.25], [0.75, 0.3]]) {
            const band = [...L0.filter((_, i) => i / 8 >= d), ...R0.filter((_, i) => (8 - i) / 8 >= d)];
            if (band.length > 2) poly(gr, band).fill({ color: 0x05060e, alpha: a });
        }
        lineAlong(gr, wall(-1)).stroke(pen.line(0x4a4436, 3, 0.8));
        lineAlong(gr, wall(1)).stroke(pen.line(0x4a4436, 3, 0.8));
        poly(gr, [[x0 + h(0.45), y], [x1 - h(0.45), y], [x1 - h(0.45), y + h(0.2)], [x0 + h(0.45), y + h(0.2)]]).fill({ color: 0x3a3830 });
        L.terrain.addChild(gr);
    }
    function crossStarG(gr, x, y, r, color = 0xf4f6ff, alpha = 1) {
        gr.moveTo(x - r, y).lineTo(x + r, y).moveTo(x, y - r).lineTo(x, y + r).stroke(pen.line(color, Math.max(1.4, r * 0.16), alpha));
        const d = r * 0.38;
        gr.moveTo(x - d, y - d).lineTo(x + d, y + d).moveTo(x - d, y + d).lineTo(x + d, y - d).stroke(pen.line(color, Math.max(1, r * 0.1), alpha * 0.6));
        gr.circle(x, y, r * 0.18).fill({ color: 0xffffff, alpha });
    }
    function starAt(gr, x, y, r) {
        gr.circle(x, y, r * 2.4).fill({ color: 0xdfe6ff, alpha: 0.1 });
        crossStarG(gr, x, y, r);
    }
    /** Kometens svans: one straight glowing road, ruled at its edges, with a ruler's marks (it is proud of them). */
    function buildRoad(gr, s) {
        const x0 = s.pts[0][0], x1 = s.pts.at(-1)[0], y = s.pts[0][1], w = h(0.36);
        const glow = new RAW.Sprite(TX.vglow); glow.anchor.set(0, 0.5); glow.position.set(x0, y + w / 2); glow.width = x1 - x0; glow.height = h(2.6);
        glow.tint = 0xfff0c0; glow.alpha = 0.55; glow.blendMode = 'add'; L.back.addChild(glow);
        gr.rect(x0, y, x1 - x0, w).fill({ color: 0xfbe7a6 });
        const n = 14;
        for (let i = 0; i < n; i++) {
            const a = x0 + (x1 - x0) * i / n, b = x0 + (x1 - x0) * (i + 1) / n;
            gr.rect(a, y, b - a, w).fill(pen.hatch(0xffffff, 0.35 - i / n * 0.2));
        }
        gr.rect(x0, y + w * 0.18, x1 - x0, w * 0.32).fill({ color: 0xffffff, alpha: 0.7 });
        gr.moveTo(x0, y).lineTo(x1, y).moveTo(x0, y + w).lineTo(x1, y + w).stroke(pen.line(0xb08a3a, 2.6, 0.9));
        for (let x = x0, k = 0; x <= x1; x += h(0.2), k++) {
            const long = k % 5 === 0;
            gr.moveTo(x, y).lineTo(x, y + (long ? w * 0.6 : w * 0.3)).stroke(pen.line(0x8a6a28, long ? 2 : 1.3, 0.75));
        }
    }

    /** A dashed drawing waiting for galloping hooves, in the colour of what it becomes. */
    function buildDashed(d) {
        const c = new PIXI.Container(); c.label = 'dash-' + d.id;
        const dash = new PIXI.Graphics(), ink = new PIXI.Graphics();
        const mat = d.sketch?.mat;
        const pts = d.pts;
        if (mat === 'starline') {
            constellationLine(dash, pen, pts, { dashed: true, width: 4 });
            for (const [x, y] of d.stars || [pts[0], pts.at(-1)]) {
                const st = new PIXI.Graphics(); starAt(st, x, y, 12); dash.addChild(st);
            }
        } else if (mat === 'ice') {
            lineAlong(dash, pts).stroke({ color: 0xcfeaff, width: 30, alpha: 0.12, cap: 'round' });
            dashedPath(dash, pts, pen.line(0x9fd8ff, 9, 0.9), { dash: 22, gap: 16 });
            dashedPath(dash, offset(pts, h(0.3)), pen.line(0x6a9ec0, 3, 0.7), { dash: 14, gap: 14 });
        } else if (mat === 'moon') {
            lineAlong(dash, pts).stroke({ color: 0xfff2b8, width: 40, alpha: 0.08, cap: 'round' });
            dashedPath(dash, pts, pen.line(0xf3e3a0, 9, 0.95), { dash: 24, gap: 16 });
            dashedPath(dash, offset(pts, h(0.35)), pen.line(0x8a8062, 3, 0.6), { dash: 12, gap: 14 });
        } else {
            // a dent in the paper: grey, faint, but dark enough to see on a phone in the sun
            lineAlong(dash, offset(pts, 6)).stroke({ color: 0x8a8696, width: 16, alpha: 0.12, cap: 'round' });
            dashedPath(dash, pts, pen.line(0x5e5a6a, 5.5, 0.9), { dash: 16, gap: 12 });
        }
        c.addChild(dash, ink);
        L.terrain.addChild(c);
        S.dashed.set(d.id, { d, c, dash, ink, drawn: -1, mat });
    }
    function updateDashed() {
        for (const v of S.dashed.values()) {
            const F = G.flags, d = v.d;
            const done = F.has(d.flag) && d.flag !== 'bridge_drawn';
            let vis = !done && cond(d.when, F);
            // in the fog the dents show only once the seed has lit them
            if (d.fog && !F.has(d.fog)) vis = false;
            v.c.visible = vis;
            if (!vis) continue;
            const t = d._ink || 0;
            if (Math.abs(t - v.drawn) < 0.008) continue;
            v.drawn = t;
            v.ink.clear();
            if (t <= 0) continue;
            const pts = sliceLine(d.pts, t, d.dir === -1 || (G.player.streck?.dir === -1 && G.player.streck?.d === d));
            if (v.mat === 'starline') constellationLine(v.ink, pen, pts, { width: 4.2, ink: PAL.bearLine });
            else if (v.mat === 'ice') { const band = [...pts, ...offset(pts, h(0.3)).reverse()]; if (pts.length > 1) poly(v.ink, band).fill(pen.fill(PAL.ice, 0.95)); lineAlong(v.ink, pts).stroke(pen.line(PAL.iceInk, 2.6)); }
            else if (v.mat === 'moon') { lineAlong(v.ink, pts).stroke(pen.line(0xf3e3a0, 16, 0.95)); lineAlong(v.ink, pts).stroke(pen.line(0x6d6248, 3)); }
            else lineAlong(v.ink, pts).stroke(pen.line(0x2e2a36, 6, 0.95));
        }
    }
    /** The part of a line drawn so far (t of its length), from its start or its end. */
    function sliceLine(pts, t, fromEnd) {
        const P = fromEnd ? [...pts].reverse() : pts;
        let total = 0; for (let i = 1; i < P.length; i++) total += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
        const want = total * clamp(t, 0, 1), out = [P[0]];
        let acc = 0;
        for (let i = 1; i < P.length; i++) {
            const L0 = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
            if (acc + L0 >= want) { const u = (want - acc) / (L0 || 1); out.push([lerp(P[i - 1][0], P[i][0], u), lerp(P[i - 1][1], P[i][1], u)]); break; }
            out.push(P[i]); acc += L0;
        }
        return out;
    }

    // --- the Moon --------------------------------------------------------------------------------------
    function buildMoon(def) {
        const sp = def.spots;
        // Nova's bed: a hollow with a blanket of moon dust
        const bed = new PIXI.Graphics();
        bed.ellipse(sp.novaBed.x, sp.novaBed.y + 6, h(0.9), h(0.16)).fill(pen.fill(0xb9ae88, 0.9)).stroke(pen.line(0x7d7356, 1.6, 0.8));
        bed.moveTo(sp.novaBed.x - h(0.7), sp.novaBed.y - 2).quadraticCurveTo(sp.novaBed.x, sp.novaBed.y - h(0.18), sp.novaBed.x + h(0.75), sp.novaBed.y).stroke(pen.line(0x9a8cc8, 7, 0.7));
        L.mid.addChild(bed);
        // the face crater on the night side: two round hollows and a long crack (it is only a crater)
        const face = new PIXI.Graphics(), fx0 = sp.face.x, fy = sp.face.y;
        face.ellipse(fx0 - h(0.55), fy + h(0.35), h(0.3), h(0.22)).fill({ color: 0x2c2a30, alpha: 0.85 }).stroke(pen.line(0x5d5644, 2));
        face.ellipse(fx0 + h(0.45), fy + h(0.32), h(0.26), h(0.2)).fill({ color: 0x2c2a30, alpha: 0.85 }).stroke(pen.line(0x5d5644, 2));
        lineAlong(face, [[fx0 - h(0.75), fy + h(0.95)], [fx0 - h(0.3), fy + h(1.05)], [fx0 + h(0.1), fy + h(0.98)], [fx0 + h(0.5), fy + h(1.08)], [fx0 + h(0.8), fy + h(0.96)]]).stroke(pen.line(0x2c2a30, 7, 0.85));
        L.mid.addChild(face);
        // the night side's dark: shade laid on thick; Nova's red lamps light it (M3)
        const d = def.dark;
        const dark = new RAW.Container();
        // a short soft edge: pitch dark from about a length in (the band's long fade left the first lengths half lit)
        const dk = new RAW.Sprite(TX.nightBand); dk.tint = 0x04050c; dk.position.set(d.x0 - h(1.2), h(-14)); dk.width = d.x1 - d.x0 + h(2.4); dk.height = h(22);
        dark.addChild(dk);
        const edgeL = dk, edgeR = dk;
        L.dark.addChild(dark);
        const red = softSprite(TX.glow, 0, 0, h(9), h(7), 0xff4a36, 0, L.dark, 'add');
        S.night = { dark, red, edgeL, edgeR, d };
        // pale rings of light where Nova's beam can lift a still shell
        for (const c of def.carries || []) if (c.kind === 'beam') S.beamRings.push(beamRing(c));
        // the cereal box (and after the story a second one)
        // big enough to be the thing to push on a phone (at 0.8 it was a speck beside the sköldhäst)
        S.box = createCerealBox(PIXI, pen); S.box.view.scale.set(1.2); L.objects.addChild(S.box.view);
        S.box2 = createCerealBox(PIXI, pen); S.box2.view.scale.set(1.2); L.objects.addChild(S.box2.view);
        // hoofprints stay where they were made (no air, no wind)
        S.prints = new PIXI.Container(); L.mid.addChild(S.prints);
        for (const pr of G.moonPrints || []) printAt(pr.x, pr.y);
    }
    function printAt(x, y) {
        if (!S?.prints) return;
        const g = new PIXI.Graphics();
        g.ellipse(0, 0, 9, 3.4).fill({ color: 0x8a8062, alpha: 0.45 }).stroke(pen.line(0x6d6450, 1, 0.5));
        g.position.set(x, y + 2); S.prints.addChild(g);
        if (S.prints.children.length > 140) S.prints.removeChildAt(0).destroy();
    }
    function beamRing(c) {
        const g = new PIXI.Graphics();
        g.ellipse(c.spot.x, c.spot.y + 3, h(0.55), h(0.12)).stroke(pen.line(0xd4ccff, 5, 0.85));
        g.ellipse(c.spot.x, c.spot.y + 3, h(0.4), h(0.08)).stroke(pen.line(0xffffff, 2, 0.6));
        const glow = softSprite(TX.glow, c.spot.x, c.spot.y - h(0.1), h(1.4), h(0.5), 0xc8b8ff, 0.4, L.mid, 'add');
        L.mid.addChild(g);
        return { g, glow, c };
    }

    // --- Stjärnbildsfältet ------------------------------------------------------------------------------------
    function buildConstellations(def) {
        // Stora björnen, round his back: his stars, legs, head and nose (dashed until drawn)
        const back = def.surfaces.find(s => s.id === 'bearBack').pts;
        const [hx, hy] = back.at(-1);
        // his back (the star-lines the sköldhäst gallops up), a round belly under it, four legs of two stars each, an
        // ear; when he stands every star but his feet rises, so his legs grow long
        const stars = [
            ...back,                                                  // 0..6 along the back, the head last
            [hx + h(3.0), hy + h(0.15)],                              // 7 the nose's tip
            [h(53.6), h(2.3)], [h(57.0), h(2.6)],                     // 8, 9 hind knees
            [h(53.0), h(3.5)], [h(56.6), h(3.6)],                     // 10, 11 hind feet
            [h(62.6), h(1.4)], [h(65.6), h(1.0)],                     // 12, 13 fore knees
            [h(62.8), h(2.6)], [h(66.0), h(2.2)],                     // 14, 15 fore feet
            [h(59.0), h(1.9)],                                        // 16 belly
            [hx + h(0.5), hy - h(1.0)]                                // 17 ear
        ];
        const lines = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 8], [8, 10], [2, 9], [9, 11], [4, 12], [12, 14], [5, 13], [13, 15],
            [8, 16], [16, 12], [6, 17], [17, 5]];
        const bear = createBearFigure(PIXI, pen, { stars, lines, nose: [6, 7], legs: [10, 11, 14, 15], eye: [hx + h(0.9), hy + h(0.25)], rise: h(3.2) });
        L.back.addChild(bear.view);
        S.bear = bear;
        // l5: the light he sleeps on ("den är varm")
        // Pip and his lane of pull
        const o = def.orbit;
        const lane = new PIXI.Graphics();
        const ringPts = Array.from({ length: 65 }, (_, i) => [o.x + Math.cos(i / 64 * TAU) * o.r, o.y + Math.sin(i / 64 * TAU) * o.r]);
        lineAlong(lane, ringPts).stroke({ color: 0xbfd0ff, width: o.width, alpha: 0.05 });
        dashedPath(lane, ringPts, pen.line(0xbfd0ff, 2.4, 0.45), { dash: 18, gap: 14 });
        L.back.addChild(lane);
        S.pip = createPip(PIXI, pen); S.pip.view.scale.set(1.4); L.actors.addChild(S.pip.view);
        // the wagon as it rolls (built from its seven stars)
        const dl = def.dashed.find(d => d.id === 'wagonLine');
        S.wagonStars = dl.stars;
    }

    // --- Ringplaneten ---------------------------------------------------------------------------------------
    function buildRing(def) {
        // ice blocks to shelter behind (R1)
        for (const sh of def.showers || []) for (const bx of sh.blocks || []) {
            const g = new PIXI.Graphics(), y = 0;
            const pts = [[bx - h(0.65), y], [bx - h(0.6), y - h(1.05)], [bx - h(0.2), y - h(1.3)], [bx + h(0.5), y - h(1.15)], [bx + h(0.62), y]];
            poly(g, pts).fill({ color: 0xdff4ff }); poly(g, pts).fill(pen.hatch(0x9ccbe6, 0.55));
            g.moveTo(bx - h(0.3), y - h(1.1)).lineTo(bx + h(0.05), y - h(0.4)).stroke(pen.line(0xffffff, 3, 0.7));
            poly(g, pts).stroke(pen.line(PAL.iceInk, 2.4));
            L.mid.addChild(g);
        }
        // the shadow line: the planet's shade on the far ring, the sun beyond
        const ice = def.ice;
        const shade = new RAW.Sprite(RAW.Texture.WHITE); shade.tint = 0x1a2a6a; shade.alpha = 0.32; shade.position.set(h(40), h(-12)); shade.width = ice.sunX - h(40); shade.height = h(20);
        L.fore.addChild(shade);
        const sunLine = new PIXI.Graphics();
        sunLine.moveTo(ice.sunX, h(-0.2)).lineTo(ice.sunX, h(0.9)).stroke(pen.line(0xffd27a, 4, 0.9));
        dashedPath(sunLine, [[ice.sunX, h(-6)], [ice.sunX, h(-0.2)]], pen.line(0xffe9b0, 2.4, 0.5), { dash: 16, gap: 12 });
        L.mid.addChild(sunLine);
        softSprite(TX.glow, ice.sunX + h(6), h(-3), h(14), h(10), 0xffd9a0, 0.18, L.back, 'add');
        // the ice block with a star-light frozen in it (R3)
        S.iceBlock = new PIXI.Container();
        const ib = new PIXI.Graphics();
        const blk = [[-h(0.75), 0], [-h(0.7), -h(1.2)], [-h(0.2), -h(1.45)], [h(0.62), -h(1.3)], [h(0.75), 0]];
        poly(ib, blk).fill({ color: 0xd6f0ff, alpha: 0.95 }); poly(ib, blk).fill(pen.hatch(0x8fbad6, 0.5));
        ib.moveTo(-h(0.4), -h(1.2)).lineTo(-h(0.1), -h(0.3)).stroke(pen.line(0xffffff, 3, 0.75));
        poly(ib, blk).stroke(pen.line(PAL.iceInk, 2.6));
        S.iceBlock.addChild(ib);
        L.objects.addChild(S.iceBlock);
        // the three lanes of pull off the ring's end (R2), the middle one with pink crumbs; Kometen's lane (R4)
        const lanes = new PIXI.Graphics();
        for (const c of def.carries || []) {
            if (c.kind !== 'sling' && c.kind !== 'lane') continue;
            if (c.home) continue;
            const col = c.kind === 'lane' ? 0xbfe8ff : 0xd8ccff;
            dashedPath(lanes, c.path, pen.line(col, 3, 0.35), { dash: 20, gap: 16 });
            if (c.go) for (let k = 0; k < 9; k++) { const p = c.path[Math.min(c.path.length - 1, 1 + (k % 3))]; const x = p[0] + (hash(k, 41) - 0.5) * h(1.2), y = p[1] + (hash(k, 42) - 0.5) * h(0.6); lanes.moveTo(x + 4, y).arc(x, y, 4, 0, 3.6).stroke(pen.line(PAL.crumb, 2.8, 0.9)); }
        }
        L.back.addChild(lanes);
        // Kometen laps the planet and rests a breath at Rastplatsen
        S.komet = createKomet(PIXI, pen); S.komet.view.scale.set(0.9); L.actors.addChild(S.komet.view);
        // gravel showers: streaks across the ring, and a glimmer before
        S.gravel = [];
        for (let i = 0; i < 60; i++) { const s = new RAW.Sprite(TX.gravel); s.anchor.set(0.5); s.visible = false; L.fx.addChild(s); S.gravel.push({ s, o: hash(i, 51), y: hash(i, 52), v: 0.6 + hash(i, 53) * 0.6 }); }
        S.glints = [];
        for (let i = 0; i < 14; i++) { const s = new RAW.Sprite(TX.star); s.anchor.set(0.5); s.visible = false; s.tint = 0xdff4ff; L.fx.addChild(s); S.glints.push({ s, o: hash(i, 55) }); }
    }

    /**
     * Mira's moon hanging over Smulhögen, drawn at the world's own scale (characters.mjs createSkyMoon is drawn small,
     * and its pencil grain blew up into blotches when scaled nine times): the same three bites, in the same places.
     */
    function createBigMoon(R) {
        const k = R / 100;
        const blobPts = (cx, cy, rx, ry, seed, amp = 0.12, n = 26) => {
            const pts = [];
            for (let i = 0; i < n; i++) {
                const a = i / n * TAU, q = 1 + amp * (Math.sin(a * 3 + seed * 2.1) * 0.6 + Math.sin(a * 5 + seed * 1.3) * 0.4 + (hash(i, seed) - 0.5) * 0.6);
                pts.push([(cx + Math.cos(a) * rx * q) * k, (cy + Math.sin(a) * ry * q) * k]);
            }
            return pts;
        };
        const gash = (() => {
            const top = [], bot = [];
            for (let i = 0; i <= 13; i++) {
                const u = i / 13, x = -58 + 116 * u + (hash(i, 152) - 0.5) * 6, mid = 44 - 9 * Math.sin(u * Math.PI);
                const open = Math.sin(u * Math.PI) ** 0.6;
                top.push([x * k, (mid - 2 - open * 7 - hash(i, 150) * 6 * open) * k]);
                bot.push([(x + (hash(i, 153) - 0.5) * 5) * k, (mid + 3 + open * 8 + hash(i, 151) * 7 * open) * k]);
            }
            return [...top, ...bot.reverse()];
        })();
        const BITES = [blobPts(76, -64, 34, 32.3, 160), blobPts(-36, -30, 21, 22, 161), gash];
        const CENTRES = [{ x: 61 * k, y: -51 * k }, { x: -36 * k, y: -30 * k }, { x: 0, y: 36 * k }];
        const view = new PIXI.Container(); view.label = 'big-moon';
        const glow = softSprite(TX.glow, 0, 0, R * 3.6, R * 3.6, 0xfff3c0, 0.35, view, 'add');
        const disk = new PIXI.Graphics();
        disk.circle(0, 0, R).fill({ color: 0xf3e3a0 });
        disk.circle(0, 0, R).fill(pen.hatch(0xd8c47a, 0.55));
        disk.ellipse(-30 * k, -34 * k, 48 * k, 34 * k).fill({ color: 0xfff4c6, alpha: 0.45 });
        for (const [x, y, r] of [[-52, 24, 13], [30, -14, 10], [-14, -64, 9], [58, 38, 15], [6, 70, 8], [-74, -22, 7], [28, 70, 6], [-30, 62, 10]]) {
            disk.circle(x * k, y * k, r * k).fill(pen.fill(0xb9b096, 0.7));
            disk.moveTo((x + Math.cos(Math.PI * 0.9) * r) * k, (y + Math.sin(Math.PI * 0.9) * r) * k).arc(x * k, y * k, r * k, Math.PI * 0.9, Math.PI * 1.9).stroke(pen.line(0x857b62, 5, 0.7));
            disk.moveTo((x + 1 + Math.cos(0.1) * r * 0.8) * k, (y + 1 + Math.sin(0.1) * r * 0.8) * k).arc((x + 1) * k, (y + 1) * k, r * 0.8 * k, 0.1, Math.PI * 0.8).stroke(pen.line(0xfff6d6, 4, 0.6));
        }
        disk.circle(0, 0, R).stroke(pen.line(0x9a8040, 8, 0.9));
        const dark = new PIXI.Graphics(); dark.circle(0, 0, R * 1.005).fill({ color: 0x24202f }); dark.alpha = 0;
        const biteC = new PIXI.Container();
        const bites = BITES.map((pts, i) => {
            const g = new PIXI.Graphics();
            g.poly(pts.map(([x, y]) => [x + (hash(i, 171) - 0.5) * 40, y + (hash(i, 172) - 0.5) * 30]).flat()).fill({ color: 0x8f8a99, alpha: 0.3 });
            g.poly(pts.flat()).fill({ color: 0xfbf8f1 });
            g.poly(pts.flat()).fill(pen.material('mat-paper', 0.6, 0xfbf8f1));
            g.poly(pts.flat()).stroke(pen.line(0xa8a2b4, 4, 0.6));
            for (let q = 0; q < 6; q++) { const [x, y] = pts[(q * 5) % pts.length]; g.moveTo(x + 9, y).arc(x, y, 9, 0, 3.6).stroke(pen.line(PAL.crumb, 5, 0.85)); }
            g.visible = false; biteC.addChild(g);
            return g;
        });
        const clip = new PIXI.Graphics(); clip.circle(0, 0, R * 0.99).fill(0xffffff);
        biteC.mask = clip;
        const rim = new PIXI.Graphics(); rim.circle(0, 0, R).stroke(pen.line(0x6a6252, 6, 0.6)); rim.alpha = 0;
        const threads = new RAW.Graphics();
        view.addChild(disk, dark, clip, biteC, rim, threads);
        const sources = [[60, -44], [-36, -12], [-30, 46], [0, 40], [32, 46]], SRC = [0, 1, 2, 2, 2];
        return {
            view, threads, radius: R,
            biteAt: (i) => ({ x: CENTRES[i].x, y: CENTRES[i].y }),
            update(dt, t, { bites: nb = 0, lit = 1, drain = 0, reducedMotion = false } = {}) {
                bites.forEach((g, i) => { g.visible = i < nb; });
                dark.alpha = (1 - clamp(lit, 0, 1)) * 0.86;
                glow.alpha = clamp(lit, 0, 1) * 0.35;
                rim.alpha = 1 - lit;
                threads.clear();
                if (drain > 0.01) for (const [q, [sx, sy]] of sources.entries()) {
                    if (nb <= SRC[q]) continue;
                    const len = (60 + hash(q, 180) * 110) * drain * k * 1.4, ph = reducedMotion ? q : t * 0.6 + q * 1.7;
                    let px = sx * k, py = sy * k;
                    for (let j = 1; j <= 14; j++) {
                        const u = j / 14, x = sx * k + Math.sin(u * 5 + ph) * 6 * u * k, y = sy * k + u * len;
                        threads.moveTo(px, py).lineTo(x, y).stroke({ color: 0xf6dc74, width: (5 - j * 0.25) * k * 0.9, alpha: (1 - j / 15) * 0.95, cap: 'round' });
                        px = x; py = y;
                    }
                    const dy = reducedMotion ? 0.5 : (t * 0.4 + q * 0.23) % 1;
                    threads.circle(sx * k + Math.sin(ph) * 3 * k, sy * k + len * (0.3 + dy * 0.7), 2.6 * k).fill({ color: 0xffe68a, alpha: 0.8 * (1 - dy) });
                }
            }
        };
    }

    // --- Det vita hålet ------------------------------------------------------------------------------------------
    function buildWhitePage(def) {
        // the paper itself, at full brightness, from the ragged rubbed edge of the dark sky to the Moon's rim
        const g = new PIXI.Graphics();
        const x0 = h(7.9), x1 = h(70.5), y0 = h(-30), y1 = h(10);
        const left = [], right = [];
        for (let i = 0; i <= 160; i++) {
            const y = lerp(y0, y1, i / 160);
            left.push([x0 + (hash(i, 71) - 0.5) * h(0.5) + Math.sin(i * 0.31) * h(0.35) + Math.sin(i * 1.7) * h(0.12), y]);
            right.push([x1 + (hash(i, 72) - 0.5) * h(0.7) + Math.sin(i * 0.2) * h(0.6) + Math.sin(i * 1.3) * h(0.15), y]);
        }
        const sheet = [...left, ...right.reverse()];
        poly(g, sheet).fill({ color: 0xfbf8f1 });
        poly(g, sheet).fill(pen.material('mat-paper', 1, 0xfbf8f1));
        // grey smears where things were rubbed out, faint old dents, the paper's grain
        for (let k = 0; k < 26; k++) {
            const x = lerp(x0 + h(2), x1 - h(2), hash(k, 73)), y = lerp(h(-8), h(3), hash(k, 74));
            const s = softSprite(TX.smear, x, y, h(3 + hash(k, 75) * 5), h(1 + hash(k, 76) * 1.6), 0x8e8a99, 0.12 + hash(k, 77) * 0.12, L.back);
            s.rotation = (hash(k, 78) - 0.5) * 0.6;
        }
        for (let k = 0; k < 14; k++) {
            const x = lerp(x0 + h(3), x1 - h(4), hash(k, 81)), y = lerp(h(-7), h(-1.5), hash(k, 82)), w = h(1.5 + hash(k, 83) * 3);
            dashedPath(g, [[x, y], [x + w * 0.5, y - h(0.3) * hash(k, 84)], [x + w, y + h(0.2)]], pen.line(0xb8b4c2, 2.2, 0.45), { dash: 10, gap: 10 });
        }
        // the rubbed edge of the dark: grey crumbs of pencil along it
        for (let i = 0; i < 160; i += 2) { const p = left[i]; g.circle(p[0] + h(0.15) + hash(i, 85) * h(0.5), p[1], 3 + hash(i, 86) * 4).fill({ color: 0x2a2e48, alpha: 0.35 }); }
        L.back.addChildAt(g, 0);
        S.sheet = g;
    }
    function buildWhiteThings(def) {
        const sp = def.spots;
        // the Moon, hanging huge and far too close beyond Smulhögen
        S.bigMoon = createBigMoon(h(4.6));
        S.bigMoon.view.position.set(h(73.2), h(-6.6));
        L.back.addChild(S.bigMoon.view);
        // the dark sky begins again beyond the white, round the Moon
        // the fog's grey smudge (V2)
        for (let k = 0; k < 22; k++) {
            const x = lerp(h(29.5), h(46.5), hash(k, 91)), y = lerp(h(-4.5), h(1.5), hash(k, 92));
            const s = softSprite(TX.smear, x, y, h(5 + hash(k, 93) * 5), h(3 + hash(k, 94) * 2.5), 0x8a8696, 0.5, L.fore);
            S.fogs.push({ s, x0: x, y0: y, o: hash(k, 95) * 10 });
        }
        // what stands in the fog: the dents of things rubbed out
        for (const [kind, x, y, sc] of [['house', 37.0, -0.35, 1.7], ['dragon', 41.0, -0.45, 1.5], ['firstHorse', 44.2, -0.05, 1.7]]) {
            const d = createDent(PIXI, pen, kind); d.view.position.set(h(x), h(y)); d.view.scale.set(sc); d.view.alpha = 0; L.mid.addChild(d.view);
            S.ghosts.push({ d, x: h(x) });
        }
        // the pink heap where the rocket was rubbed out
        S.rocketCrumbs = createCrumbs(PIXI, pen, { n: 30, spread: h(1.6), seed: 7 }); S.rocketCrumbs.view.position.set(def.rocketAt.x, def.rocketAt.y); L.objects.addChild(S.rocketCrumbs.view);
        S.beamRings.push(beamRing(def.carries.find(c => c.id === 'beamBridge')));
        // the first star's dent on the hill (the tenth is drawn here)
        S.firstDent = createDent(PIXI, pen, 'star'); S.firstDent.view.position.set(def.lights[0].x, def.lights[0].y); S.firstDent.view.scale.set(1.3); L.mid.addChild(S.firstDent.view);
        // free drawing on the blank sheet after the story (secret whiteDraw): the last 300 points
        S.scribble = new PIXI.Graphics(); L.mid.addChild(S.scribble); S.scribblePts = [];
    }

    // --- Vintergatan ---------------------------------------------------------------------------------------------
    function buildRide(def) {
        const r = def.ride;
        // the trail: a river of small white stars behind the hooves, its every star in a fixed place for how far it is
        // (the save keeps one number, the distance; ~400 stars)
        S.trail = [];
        const n = 400;
        for (let k = 0; k < n; k++) {
            const s = new RAW.Sprite(hash(k, 101) > 0.82 ? TX.star : TX.dot); s.anchor.set(0.5); s.visible = false; L.back.addChild(s);
            const dist = (k / n) * r.length;
            const width = Math.min(h(7.5), h(0.6) + dist * 0.05);
            const side = (hash(k, 102) + hash(k, 103) - 1);
            S.trail.push({ s, dist, x: r.tip - dist + (hash(k, 104) - 0.5) * h(0.6), y: -h(0.7) + side * width, k: (1.6 + hash(k, 105) * 2.6) * (hash(k, 108) > 0.9 ? 1.8 : 1), o: hash(k, 106) * 10,
                tint: hash(k, 107) > 0.7 ? 0xfff0c8 : hash(k, 107) < 0.2 ? 0xd6e2ff : 0xffffff });
        }
        S.river = new RAW.Sprite(TX.vglow); S.river.anchor.set(1, 0.5); S.river.tint = 0xdfe6ff; S.river.blendMode = 'add'; L.back.addChildAt(S.river, 0);
        // Kometen's head at the west end of its tail
        S.rideKomet = createKomet(PIXI, pen); S.rideKomet.view.position.set(h(-0.6), h(0.18)); S.rideKomet.view.scale.set(1.25); L.actors.addChild(S.rideKomet.view);
        // the friends alongside: the bear pulling Karlavagnen (Klo in the wagon), and Pip
        const bstars = [[0, 0], [h(1.2), -h(0.5)], [h(2.4), -h(0.6)], [h(3.3), -h(0.2)], [h(3.9), h(0.2)], [h(0.2), h(1.2)], [h(1.0), h(1.3)], [h(2.6), h(1.1)], [h(3.2), h(1.2)], [h(2.0), h(0.6)]];
        const blines = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [1, 6], [2, 7], [3, 8], [1, 9], [2, 9]];
        S.rideBear = createBearFigure(PIXI, pen, { stars: bstars, lines: blines, legs: [5, 6, 7, 8], eye: [h(3.4), -h(0.05)], rise: h(0.3) });
        S.rideBearC = new PIXI.Container(); S.rideBearC.addChild(S.rideBear.view); L.back.addChild(S.rideBearC);
        S.rideWagon = new PIXI.Graphics();
        const wst = [[0, 0], [-h(1.1), h(0.2)], [-h(2.1), h(0.1)], [-h(3.0), -h(0.1)], [-h(3.2), h(0.8)], [-h(4.6), h(0.8)], [-h(4.8), -h(0.2)]];
        constellationLine(S.rideWagon, pen, wst, { width: 3.4 });
        for (const [x, y] of wst) starAt(S.rideWagon, x, y, 11);
        S.rideBearC.addChild(S.rideWagon);
        S.ridePip = createPip(PIXI, pen); S.ridePip.view.scale.set(1.2); L.actors.addChild(S.ridePip.view);
    }

    // --- things every page may have: the rocket, the star-lights, the Moon in a sky ------------------------------
    function buildCommon(def) {
        if (def.rocketAt) {
            S.rocket = createRocket(PIXI, pen, { flameTexture });
            S.rocket.view.position.set(def.rocketAt.x, def.rocketAt.y);
            S.rocket.view.scale.set(0.95);
            L.objects.addChild(S.rocket.view);
        }
        for (const l of def.lights || []) {
            const sl = createStarLight(PIXI, pen); sl.view.scale.set(1.15);
            L.objects.addChild(sl.view);
            S.lights.set(l.id, { l, sl });
        }
        // the beam's light, drawn while a shell is lifted
        S.beamG = new PIXI.Graphics(); L.fx.addChild(S.beamG);
        // V5: the new outline, stroke by stroke; and the colour patches
        S.outlineG = new PIXI.Graphics(); L.fx.addChild(S.outlineG); S.outlineN = -1;
        S.patches = [0x6f9a5a, 0xe08a3a, 0xf4efe4, 0x8fbf7a].map((col, i) => ({ s: softSprite(TX.glow, 0, 0, h(1.1), h(0.8), col, 0, L.hero), o: i * 1.7 }));
        S.selfLight = softSprite(TX.glow, 0, 0, h(4), h(3), 0xfff0c0, 0, L.back, 'add');
    }

    function buildActors() {
        const klo = createKlo(PIXI, { texture: T });
        L.actors.addChild(klo.container);
        const nova = createNova(PIXI, pen); nova.view.scale.set(NOVA_SCALE); L.actors.addChild(nova.view);
        const sudd = createSuddet(PIXI, pen); sudd.view.scale.set(1.6); L.actors.addChild(sudd.view);
        const lamp = softSprite(TX.glow, 0, 0, h(2.4), h(2.4), 0xff6fb4, 0, L.fx, 'add');
        const talkMark = new PIXI.Graphics();
        talkMark.roundRect(-20, -15, 40, 26, 10).fill({ color: 0xfffdf6 }).stroke(pen.line(0x3b3530, 2));
        talkMark.poly([-6, 10, 2, 10, -9, 20]).fill({ color: 0xfffdf6 });
        talkMark.moveTo(-6, 10).lineTo(-9, 20).lineTo(2, 10).stroke(pen.line(0x3b3530, 2));
        for (const x of [-9, 0, 9]) talkMark.circle(x, -2, 2.6).fill({ color: 0x3b3530 });
        talkMark.visible = false; L.fx.addChild(talkMark);
        const silent = new PIXI.Graphics(); // a whinny in space: no sound, only a small "…" bubble
        silent.roundRect(-24, -16, 48, 28, 12).fill({ color: 0xfffdf6 }).stroke(pen.line(0x3b3530, 2));
        for (const x of [-10, 0, 10]) silent.circle(x, -2, 2.6).fill({ color: 0x3b3530 });
        silent.visible = false; L.fx.addChild(silent);
        const shadows = {};
        for (const [id, k] of [['klo', 1.1], ['nova', 1.3]]) { const sh = new RAW.Sprite(TX.shadow); sh.anchor.set(0.5); sh.scale.set(k); sh.visible = false; L.objects.addChild(sh); shadows[id] = sh; }
        S.A = { klo, nova, sudd, lamp, talkMark, silent, shadows };
    }

    function refreshWhen() { if (S) for (const w of S.when) w.node.visible = cond(w.when, G.flags); }

    function moodFor() {
        const F = G.flags, sk = S?.def.sky;
        if (V.dreadOn) return MOOD.dread;
        if (sk === 'moon') return F.has('moon_bitten') && !F.has('moon_whole') ? MOOD.moonDark : MOOD.moon;
        return MOOD[sk] || MOOD.space;
    }

    // --- per frame ----------------------------------------------------------------------------------------------
    let lastT = 0;
    function render(dt, snap) {
        if (destroyed || !S) return;
        const W = app.screen.width, H = app.screen.height, t = G.time, F = G.flags, rm = !!G.lessMotion, p = G.player;
        refreshWhen();
        updateDashed();
        stepParticles(dt);
        stepAnims(dt);
        V.vista = lerp(V.vista, V.vistaOn ? 1 : 0, 1 - Math.exp(-(rm ? 6 : 1.6) * dt));
        V.dread = lerp(V.dread, V.dreadOn ? 1 : 0, 1 - Math.exp(-1.2 * dt));
        V.alvaFocus = lerp(V.alvaFocus, V.alvaFocusOn ? 1 : 0, 1 - Math.exp(-1.2 * dt));
        const space = p.water?.kind === 'space' || S.id === 'stjarn';
        if (space) { snap.submerge = 0; snap.waterY = null; snap.wet = 0; }

        // the camera
        updateCamera(dt, snap, W, H);
        world.scale.set(cam.zoom);
        const shx = cam.shake > 0 && !rm ? (Math.random() - 0.5) * cam.shake : 0;
        cam.shake = Math.max(0, cam.shake - dt * 30);
        world.position.set(Math.round(W / 2 - cam.x * cam.zoom + shx), Math.round(H / 2 - cam.y * cam.zoom));

        // how lit the page is: the bitten Moon's dark (F2), the dread
        const bitten = F.has('moon_bitten') && !F.has('moon_whole');
        // F2: the Moon is dark underfoot until its rim is drawn; then its light runs back (rimHeals animates it)
        const moonDark = S.id === 'mane' ? (V.rimLight !== null && V.rimLight !== undefined ? V.rimLight : bitten ? 1 : 0) : 0;
        const envTint = S.id === 'mane' ? mixColor(0xffffff, 0x5a6088, moonDark) : S.id === 'sudd' ? mixColor(0xffffff, 0x9aa0b4, V.dread * 0.8) : 0xffffff;
        for (const l of ENV) l.tint = envTint;
        L.actors.tint = L.hero.tint = S.nightTint ?? mixColor(0xffffff, 0xaab0c8, V.dread * 0.85);
        S.nightTint = null;
        atmo.setMood(moodFor());
        atmo.update(dt, { camX: cam.x, camY: cam.y, zoom: cam.zoom, W, H, t, lessMotion: rm });

        // the sky
        const found = G.lights?.() ?? 0;
        const groundSy = world.position.y + 0 * cam.zoom;
        sky.update(dt, {
            W, H, camX: cam.x, camY: cam.y, zoom: cam.zoom, t, rm, F,
            dim: Math.max(moonDark * 0.8, V.dread * 0.9, S.id === 'sudd' ? 0 : 0),
            alvaFocus: Math.max(V.alvaFocus, V.vista),
            home: F.has('lights_home') || (V.homeCount !== null),
            lit: V.homeCount !== null ? (i) => (i < V.homeCount ? 1 : 0) : null,
            gold: F.has('gold'), goldUpTo: V.goldUpTo ?? undefined,
            constellation: F.has('constellation'), linesK: V.linesK,
            milky: F.has('ride_done') || F.has('ended') ? 1 : 0,
            extraStars: V.extraStars + (F.has('s:suddStar') ? 1 : 0),
            showAlva: S.id !== 'sudd' || !inWhite(cam.x)
        });
        if (V.homeCount !== null && !F.has('lights_home')) sky.slots.forEach((sl, i) => { sl.hole.visible = i >= V.homeCount; sl.star.view.visible = i < V.homeCount; sl.gold.view.visible = false; });
        if (V.numbers && F.has('constellation')) V.numbers = false;
        if (V.numbers) showNumbers(W, H); else if (S.numbers) S.numbers.visible = false;
        // the far things in each sky: the magic forest's page, Ringo, the Moon
        skyThings(dt, t, W, H, rm, F, found, groundSy);

        if (tooth) { tooth.width = W; tooth.height = H; tooth.alpha = S.id === 'sudd' ? 0.45 : 0.28; }

        // per page
        if (S.id === 'mane') stepMoon(dt, t, F, rm, snap);
        if (S.id === 'stjarn') stepConstellations(dt, t, F, rm, snap);
        if (S.id === 'ring') stepRing(dt, t, F, rm, snap, W, H);
        if (S.id === 'sudd') stepWhite(dt, t, F, rm, snap);
        if (S.id === 'vinter') stepRide(dt, t, F, rm, snap, W, H);
        // the rocket
        if (S.rocket) {
            const here = rocketHere(G) || (S.id === 'sudd' && F.has('rocket_gone'));
            const rub = S.id === 'sudd' ? (F.has('rocket_gone') ? 1 : V.rocketRub ?? 0) : 0;
            const finGone = S.id === 'mane' && F.has('m5_view') && !F.has('fin_drawn');
            let rx = S.def.rocketAt.x, ry = S.def.rocketAt.y, tilt = F.has('ended') ? 0.16 : 0.08, flame = 0;
            if (V.landing) { const u = V.landing.u; ry -= h(9) * (1 - ease(u)) ** 1.4; tilt = lerp(-0.5, 0.08, ease(u)); flame = u < 0.96 ? 1 : 0; rx += h(2) * (1 - ease(u)); }
            if (V.travel) { const u = V.travel.u; ry -= h(12) * u * u; tilt = 0.08 - 0.4 * u; flame = 1; rx += h(1.5) * u * u; }
            S.rocket.update(dt, { visible: here || !!V.landing, x: rx, y: ry, flame, fin: finGone ? 'gone' : 'whole', rubbed: rub, tilt }, t, { reducedMotion: rm });
            if (V.landing && !V.landing.dusted && V.landing.u > 0.95) { V.landing.dusted = true; emit('dust', rx, ry, 26, { speed: 220, gravity: 60, spread: h(1.6), life: 2.4, cone: 2.4 }); cam.shake = 6; }
            if (V.travel || V.landing) emit('dust', rx + (Math.random() - 0.5) * 30, ry + h(0.2), 1, { speed: 120, gravity: 40, life: 1.4, tint: 0xffd9a0 });
        }
        // star-lights
        for (const { l, sl } of S.lights.values()) {
            const st = lightState(G, l);
            let vis = st.state !== 'got', x = st.x, y = st.y, k = 1;
            if (st.state === 'held') k = 0.45;
            if (st.state === 'ice') { x = st.x; y = st.y - h(0.7); k = 0.55; }
            if (st.state === 'given') { k = 0.55; if (l.id === 'l6') { const pp = pipPos(t); x = pp.x; y = pp.y; } }
            if (st.state === 'tail') { const kp = S.kometPos; vis = !!kp; if (kp) { x = kp.lx; y = kp.ly; } }
            if (st.state === 'dent') vis = false;
            sl.view.visible = vis;
            if (vis) { sl.view.position.set(x, y); sl.update(dt, t, { k, reducedMotion: rm }); }
        }
        stepPickups(dt, t, W, H, rm);
        stepActors(dt, t, F, rm, snap);
        stepHero(dt, t, F, rm, snap);
        stepBeam(dt, t, F, rm, snap);

        // screen pictures and light
        fromBelow.visible = V.dread > 0.02;
        if (fromBelow.visible) { fromBelow.position.set(0, H * 0.35); fromBelow.width = W; fromBelow.height = H * 0.65; fromBelow.tint = 0xf2f0ff; fromBelow.alpha = 0.32 * V.dread; }
        fromAbove.visible = V.dread > 0.02 || moonDark > 0.02;
        if (fromAbove.visible) { fromAbove.position.set(0, 0); fromAbove.width = W; fromAbove.height = H * 0.6; fromAbove.alpha = Math.max(0.7 * V.dread, 0.45 * moonDark); }
        flash = Math.max(0, flash - dt * 3);
        flashG.clear();
        if (flash > 0) flashG.rect(0, 0, W, H).fill({ color: 0xffffff, alpha: flash * (rm ? 0.25 : 0.6) });
        if (V.black > 0) flashG.rect(0, 0, W, H).fill({ color: 0x020206, alpha: V.black });
        fade = fadeTarget > fade ? Math.min(fadeTarget, fade + dt * fadeRate) : Math.max(fadeTarget, fade - dt * fadeRate);
        fadeG.clear();
        if (fade > 0) fadeG.rect(0, 0, W, H).fill({ color: fadeColor, alpha: fade });
        for (const w of [...waiters]) if (w.test()) { waiters.delete(w); w.resolve(); }
        lastT = t;
    }
    function inWhite(x) { return x > h(9) && x < h(69); }

    function skyThings(dt, t, W, H, rm, F, found, groundSy) {
        const id = S.id;
        // the magic forest's page, low on the Moon's horizon (and big in the vista)
        const fp = sky.forest, showForest = id === 'mane';
        fp.visible = showForest;
        if (showForest) {
            const v = Math.max(V.vista, V.earthrise);
            // far off and low: only its top over the horizon, faint (at play size it read as a box on the ground)
            const sc = lerp(clamp(W / 3400, 0.11, 0.28), clamp(Math.min(W, H) / 1500, 0.22, 0.55), v);
            // behind the ground where it stands: the Moon's own ground under the page, so it never floats over a dip,
            // and is not seen at all from down in a crater or up on the rocks (there is no horizon there)
            const px = W * 0.76 - cam.x * cam.zoom * 0.004, wx = cam.x + (px - W / 2) / cam.zoom;
            const floor = G.terrain?.floorAt(wx, h(-0.8));
            const onHorizon = floor !== null && floor !== undefined && floor < h(1);
            S.forestK = lerp(S.forestK ?? (onHorizon ? 1 : 0), onHorizon ? 1 : 0, 1 - Math.exp(-4 * dt));
            const localSy = onHorizon ? world.position.y + floor * cam.zoom : groundSy;
            // its top third over the horizon: Molnet and the mountain's peak, enough to know it
            const baseY = Math.min(localSy, H * 1.1) + 55 * sc;
            fp.alpha = lerp(0.55 * S.forestK, 1, v);
            fp.visible = fp.alpha > 0.02;
            // in the vista: low over the Moon's horizon, far down, never hidden behind the ground
            const vistaY = Math.min(H * 0.88, clamp(groundSy, H * 0.3, H) - 150 * sc);
            fp.position.set(lerp(W * 0.76 - cam.x * cam.zoom * 0.004, W * 0.36, v), lerp(baseY, vistaY, v) - V.earthrise * H * 0.12);
            fp.scale.set(sc); fp.rotation = lerp(-0.06, -0.02, v);
            const bitten = F.has('moon_bitten') && !F.has('moon_whole');
            const P = fp._parts;
            P.dim.alpha = bitten ? 0.88 : F.has('ended') ? 0.08 : clamp(0.18 + (10 - found) * 0.035, 0, 0.6);
            P.nest.alpha = bitten ? 0.15 : 0.8;
            P.moln.alpha = 1;
            if (V.earthrise > 0) P.nest.alpha = 0.8 + 0.2 * Math.sin(t * 6);
        }
        // Ringo: big behind the ring; far and small from the constellations
        const pl = sky.planet;
        pl.visible = id === 'ring' || id === 'stjarn';
        if (id === 'ring') { const s = Math.max(W, H) / 1350; pl.scale.set(s); pl.position.set(W * 0.7 - cam.x * cam.zoom * 0.02, H * 0.98 + s * 260 - cam.y * cam.zoom * 0.015); pl.alpha = 0.92; }
        else if (id === 'stjarn') { const s = Math.min(W, H) / 7000; pl.scale.set(s); pl.position.set(W * 0.6 - cam.x * cam.zoom * 0.006, H * 0.07); }
        // the Moon in the sky: small from the constellations and the ring
        const m = sky.moon;
        m.view.visible = id === 'stjarn' || id === 'ring';
        if (m.view.visible) {
            const r = Math.max(28, Math.min(W, H) * 0.07);
            m.view.position.set(W * (id === 'ring' ? 0.14 : 0.2) - cam.x * cam.zoom * 0.008, H * 0.16);
            m.view.scale.set(r / 100);
            m.update(dt, t, { ...(G.moon || { bites: 0, lit: 1, drain: 0 }), reducedMotion: rm });
        }
    }

    function stepMoon(dt, t, F, rm, snap) {
        const p = G.player, N = S.night;
        // M3: the dark, lit only while Nova's lamps are red
        const lit = F.has('novaLit') || G.time < (G.puz.angryUntil ?? -1);
        const nova = G.actors.nova;
        const want = lit ? 0.5 : 0.92;
        N.k = lerp(N.k ?? 0.92, want, 1 - Math.exp(-(lit ? 9 : 2.5) * dt));
        // seen from far (the vista, the earthrise, the finished sky) the shade would be a black box over the sky: it lifts
        const far = Math.max(V.vista, V.earthrise || 0, V.skyRise ? 1 : 0);
        N.far = lerp(N.far ?? far, far, 1 - Math.exp(-(rm ? 6 : 1.4) * dt));
        N.dark.alpha = N.k * (1 - N.far);
        N.dark.visible = N.dark.alpha > 0.01;
        // in the dark the friends are seen only dimly; in her red light they are lit red
        const inNight = p.x > N.d.x0 - h(1) && p.x < N.d.x1;
        S.nightTint = inNight ? mixColor(0x5a5a78, 0xffb0a0, lit ? 1 : 0) : null;
        const novaIn = nova?.scene === 'mane' && nova.x > N.d.x0 - h(3) && nova.x < N.d.x1 + h(2);
        N.red.visible = lit && novaIn;
        if (N.red.visible) { N.red.position.set(S.novaDraw?.x ?? nova.x, (S.novaDraw?.y ?? nova.y) - h(0.8)); N.red.width = h(12); N.red.height = h(8); N.red.alpha = 0.62 + (rm ? 0 : 0.12 * Math.sin(t * 22)); }
        // the box on Hyllan, sinking down to Nova, eaten
        const bp = boxPose(G);
        S.box.view.visible = !(F.has('breakfast') && !V.eating) && !V.holding;
        S.box.view.position.set(bp.x, bp.y); S.box.view.rotation = bp.state === 'falling' ? Math.sin(bp.u * 5) * 0.3 : bp.state === 'bed' ? -0.25 : 0;
        if (bp.state === 'falling' && !rm && Math.random() < dt * 10) emit('dust', bp.x, bp.y - h(0.2), 1, { speed: 30, gravity: -20, life: 1.6 });
        const sb = G.scenes.mane.box;
        S.box2.view.visible = F.has('box2_shelf') && (!F.has('box2_pushed') || (V.box2 ?? 0) < 1);
        if (S.box2.view.visible) {
            const u = V.box2 ?? (F.has('box2_pushed') ? 1 : 0), e = ease(u);
            S.box2.view.position.set(lerp(sb.x0, sb.fallTo.x, e), lerp(sb.y, sb.fallTo.y, e));
        }
        // beam rings glow while Nova is near (she cannot lift before breakfast)
        for (const r of S.beamRings) {
            const on = F.has('breakfast') && cond(r.c.needs, F);
            r.g.visible = r.glow.visible = on;
            if (on) r.glow.alpha = (0.3 + 0.15 * Math.sin(t * 2.4)) * (Math.abs(p.x - r.c.spot.x) < h(4) ? 1.4 : 1);
        }
        // hoofprints stay
        for (const e of G.lastEvents || []) if (e.type === 'hoof' && p.mode === 'ground' && !p.surface?.rock && Math.random() < 0.6) { (G.moonPrints ||= []).push({ x: e.x + (e.foot % 2 ? 14 : -14), y: e.y }); if (G.moonPrints.length > 140) G.moonPrints.shift(); printAt(e.x + (e.foot % 2 ? 14 : -14), e.y); }
        // slow dust that hangs after every landing (no air)
        for (const e of G.lastEvents || []) if (e.type === 'land') emit('dust', e.x, e.y, e.soft ? 4 : 10, { speed: 90, gravity: 60, life: 2.2, spread: 60, cone: 2.4 });
    }
    function pipPos(t) {
        const o = S.def.orbit;
        const a = (S.pipAngle ?? 0);
        return { x: o.x + Math.cos(a) * o.r, y: o.y + Math.sin(a) * o.r };
    }
    function stepConstellations(dt, t, F, rm, snap) {
        // the bear: asleep (breathing), woken, standing; snoring after the story when a shell lies beside him
        const awake = F.has('bear_nose') ? 1 : 0;
        S.bear.update(dt, { awake, nose: F.has('bear_nose'), standing: V.bearStand, breath: V.snore > 0 ? 1.4 : awake ? 0.2 : 0.7 }, t, { reducedMotion: rm });
        S.bear.view.x = V.bearWalk * h(3);
        // standing, his back is no longer where the line lies: the line fades and he is drawn alone
        const lineK = clamp(1 - V.bearStand * 5, 0, 1);
        for (const n of [S.bearBack, S.bearNose]) if (n) n.alpha = lineK;
        V.snore = Math.max(0, V.snore - dt);
        // Pip tumbles round his rock; while the shell orbits it goes round to meet him
        const o = S.def.orbit;
        S.pipAngle = (S.pipAngle ?? -Math.PI / 2) + dt * o.pipSpeed * (rm ? 0.5 : 1);
        if (G.carry?.def.kind === 'orbit') {
            // he waits where the orbit ends
            const end = Math.atan2(G.carry.path.at(-2)[1] - o.y, G.carry.path.at(-2)[0] - o.x);
            S.pipAngle = lerp(S.pipAngle, end, 1 - Math.exp(-2 * dt));
        }
        const pp = pipPos(t);
        V.pipFlash = Math.max(0, V.pipFlash - dt * 1.6);
        S.pip.update(dt, { x: pp.x, y: pp.y, tumble: 0.9, flash: V.pipFlash }, t, { reducedMotion: rm });
        // Orion's belt: each stone lit in turn, Nova's order blinking over them
        const lit = F.has('belt_lit') ? ['b1', 'b2', 'b3'] : G.puz.belt || [];
        for (const [id, st] of Object.entries(S.beltStones || {})) {
            const on = lit.includes(id), blink = S.blink?.id === id ? S.blink.k : 0;
            st.lit.alpha = lerp(st.lit.alpha, on ? 0.75 : blink * 0.9, 1 - Math.exp(-10 * dt));
            st.glowS.alpha = 0.3 + (on ? 0.3 : 0) + (rm ? 0 : 0.08 * Math.sin(t * 2 + st.cx));
        }
        // the wagon rolls (wagonRide): its drawn line moves east with everyone in it
        const wl = S.def.surfaces.find(s => s.id === 'wagon');
        if (wl) { const node = S.when.find(w => w.when === 'wagon_drawn')?.node; if (node) node.x = V.wagonRoll * h(22); }
    }
    function stepRing(dt, t, F, rm, snap, W, H) {
        const p = G.player;
        // Kometen: laps the planet, rests a breath at Rastplatsen
        const c = S.def.comet, cs = G.comet || cometState(G);
        const restAt = c.restAt;
        let kx, ky, resting = cs.resting, facing = -1;
        if (resting) { kx = restAt.x; ky = restAt.y; }
        else {
            // a long loop: off east along the ring, round the planet below, back from the west
            const u = (cs.phase * c.period - c.rest) / (c.period - c.rest);
            const a = u * TAU;
            kx = restAt.x - Math.sin(a) * h(40); ky = restAt.y - h(3) + (1 - Math.cos(a)) * h(5.5);
            facing = Math.cos(a) > 0 ? -1 : 1;
        }
        if (V.cometSweep) { const u = V.cometSweep.u; kx = lerp(p.x + h(14), p.x - h(16), u); ky = p.y - h(2.2); facing = -1; resting = false; }
        S.komet.update(dt, { x: kx, y: ky, facing, tail: resting ? h(3.2) : h(5.5), resting, talking: G.speaker === 'komet', speed: resting ? 0 : 1 }, t, { reducedMotion: rm });
        S.kometPos = { x: kx, y: ky, lx: kx + facing * -1 * h(2.0), ly: ky };
        // the ice block, pushed into the sun, melting
        const ip = icePose(G);
        S.iceBlock.position.set(ip.x, ip.y);
        S.iceBlock.visible = ip.melt < 1;
        S.iceBlock.scale.set(1 - ip.melt * 0.6, 1 - ip.melt * 0.85);
        S.iceBlock.alpha = 1 - ip.melt * 0.5;
        if (ip.melt > 0 && ip.melt < 1 && !rm && Math.random() < dt * 14) emit('dust', ip.x + (Math.random() - 0.5) * h(1), ip.y - h(0.2), 1, { speed: 60, gravity: 300, life: 0.7, tint: 0xbfe6ff });
        // gravel showers: a glimmer comes first, then streaks across the ring
        const sh = G.puz.shower;
        const showering = sh?.state === 'shower', warn = sh?.state === 'warn';
        const vw = W / cam.zoom, vh = H / cam.zoom;
        S.gravel.forEach((g, i) => {
            const on = showering && !rm ? true : showering && i % 3 === 0;
            g.s.visible = on && !!sh;
            if (!g.s.visible) return;
            const s = sh.s, span = s.x1 - s.x0;
            const u = ((t * g.v * 1.4 + g.o) % 1);
            g.s.position.set(s.x1 + h(2) - u * (span + h(4)), lerp(h(-2.6), h(-0.05), g.y));
            g.s.rotation = t * 6 + i;
            g.s.scale.set(2.2);
        });
        S.glints.forEach((g, i) => {
            g.s.visible = warn && !!sh;
            if (!g.s.visible) return;
            const s = sh.s;
            g.s.position.set(lerp(s.x0, s.x1, (g.o + i * 0.071) % 1), h(-3.2) - g.o * h(1.5));
            g.s.alpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 9 + i)); g.s.scale.set(1.6);
        });
        void vw; void vh;
    }
    function stepWhite(dt, t, F, rm, snap) {
        const p = G.player;
        // the huge Moon over Smulhögen: whole, bitten, its light running out
        const mo = G.moon || { bites: 0, lit: 1, drain: 0 };
        const drain = V.drainK ?? mo.drain;
        S.bigMoon.update(dt, t, { bites: V.bites ?? mo.bites, lit: V.moonLit ?? mo.lit, drain, reducedMotion: rm });
        // the fog: grey smudge drifting; thinner where the seed's light is
        const still = clamp((G.puz.fogStill || 0) / 2.2, 0, 1);
        const klo = G.actors.klo;
        for (const f of S.fogs) {
            f.s.x = f.x0 + (rm ? 0 : Math.sin(t * 0.12 + f.o) * h(0.8));
            const near = klo ? Math.hypot(f.s.x - klo.x, f.s.y - klo.y) : 1e9;
            const lightK = (F.has('fog1_lit') ? 0.15 : 0) + still * 0.5;
            f.s.alpha = 0.5 * (1 - clamp(lightK * (1 - near / h(9)), 0, 0.8));
        }
        // the seed lights when Klo's claws are still: a warm glow round him while the shell waits
        if (!S.seed) { S.seed = softSprite(TX.glow, 0, 0, h(3), h(3), 0xfff0b0, 0, L.fx, 'add'); }
        const inFog = p.x > h(29) && p.x < h(47);
        S.seed.visible = inFog && !!klo;
        if (S.seed.visible) { S.seed.position.set(klo.x, klo.y - h(0.35)); S.seed.alpha = 0.15 + still * 0.75; S.seed.scale.set((0.6 + still * 1.4) * h(3) / 128); }
        // what stands in the fog shows at the edge of the light
        for (const g of S.ghosts) {
            const want = V.ghosts ? clamp(1.2 - Math.abs(g.x - p.x) / h(10), 0.45, 1) : (F.has('fog2_lit') ? clamp(0.75 - Math.abs(g.x - p.x) / h(12), 0, 0.6) : 0);
            g.d.view.alpha = lerp(g.d.view.alpha, want, 1 - Math.exp(-2 * dt));
        }
        // the rocket's pink heap after it was rubbed out
        S.rocketCrumbs.view.visible = F.has('rocket_gone') || (V.rocketRub ?? 0) > 0.3;
        // the first star's dent, until the tenth is drawn
        S.firstDent.view.visible = !F.has('tenth_drawn');
        // the beam ring at Sista bron's start, once the bridge will not hold
        for (const r of S.beamRings) { const on = cond(r.c.needs, F) && !F.has('bridge_crossed'); r.g.visible = r.glow.visible = on; if (on) r.glow.alpha = 0.35 + 0.2 * Math.sin(t * 2.4); }
        // Suddet rubbing the bridge out behind the hooves
        if (V.rub) {
            const u = V.rub.u, x = lerp(h(61), h(47), u);
            if (!rm && Math.random() < dt * 30) emit('crumb', x, h(-0.2), 2, { speed: 120, gravity: 300, life: 0.8, tint: PAL.crumb });
        }
        // after the story the white is a blank sheet: galloping leaves a pencil line that stays (the last 300 points)
        if (F.has('ended') && p.mode === 'ground' && Math.abs(p.vx) > 900) {
            const last = S.scribblePts.at(-1);
            if (!last || Math.hypot(last[0] - p.x, last[1] - p.y) > 14) {
                S.scribblePts.push([p.x, p.y + 4]);
                if (S.scribblePts.length > 300) S.scribblePts.shift();
                S.scribble.clear();
                if (S.scribblePts.length > 1) lineAlong(S.scribble, S.scribblePts).stroke(pen.line(0x2e2a36, 5, 0.85));
            }
        }
    }
    function stepRide(dt, t, F, rm, snap, W, H) {
        const r = S.def.ride, ride = F.has('ride_done') ? r.length : (G.puz.ride || 0);
        const u = clamp(ride / r.length, 0, 1);
        // the trail: as far as it has been galloped, a river of stars
        const vx0 = cam.x - W / cam.zoom * 0.7, vx1 = cam.x + W / cam.zoom * 0.7;
        for (const s of S.trail) {
            const on = s.dist <= ride && s.x > vx0 && s.x < vx1;
            s.s.visible = on;
            if (!on) continue;
            const age = clamp((ride - s.dist) / h(2), 0, 1);
            s.s.position.set(s.x, s.y);
            const zk = clamp(0.55 / cam.zoom, 1, 2.4); // farther out, a little bigger: the river still reads on a phone
            s.s.scale.set(s.k * zk * (0.4 + 0.6 * age) * (rm ? 1 : 0.8 + 0.2 * Math.sin(t * 2.2 + s.o)));
            s.s.alpha = 0.6 + 0.4 * age; s.s.tint = s.tint;
        }
        S.river.visible = ride > h(1);
        if (S.river.visible) { S.river.position.set(r.tip, -h(0.7)); S.river.width = ride; S.river.height = Math.min(h(15), h(1.2) + ride * 0.09); S.river.alpha = 0.32; }
        // stars spray from Suddet while the hooves gallop
        const p = G.player;
        if (F.has('ride') && !F.has('ride_done') && Math.abs(p.vx) > 900 && !rm && Math.random() < dt * 40) emit('star', p.x + (p.facing || -1) * -h(0.4), p.y - h(0.9), 1, { speed: 160, gravity: 0, life: 0.9, angle: p.facing > 0 ? Math.PI : 0, cone: 1.4, tint: 0xfff6d8 });
        // Kometen's head waits at the west end
        S.rideKomet.update(dt, { facing: -1, tail: h(2.5), resting: false, talking: G.speaker === 'komet', speed: 0.6 }, t, { reducedMotion: rm });
        // the bear pulling the wagon, alongside from 60 lengths; Pip tumbling past at 85
        const bearOn = ride > h(56) && ride < h(150);
        S.rideBearC.visible = bearOn;
        if (bearOn) {
            const k = clamp((ride - h(56)) / h(8), 0, 1);
            S.rideBearC.position.set(p.x - h(1) - (1 - k) * h(14), h(-4.4));
            S.rideBearC.scale.set(-1, 1);
            S.rideBear.update(dt, { awake: 1, nose: true, standing: 0, breath: 0.3 }, t, { reducedMotion: rm });
            S.rideBear.view.y = rm ? 0 : Math.sin(t * 6) * 6;
        }
        const pipOn = ride > h(80) && ride < h(100);
        S.ridePip.view.visible = pipOn;
        if (pipOn) {
            const k = (ride - h(80)) / h(20);
            S.ridePip.update(dt, { x: p.x + lerp(h(8), -h(10), k), y: h(-6.2) + Math.sin(k * 6) * h(0.4), tumble: 2, flash: Math.abs(k - 0.45) < 0.04 ? 1 : 0 }, t, { reducedMotion: rm });
        }
        // the white hole falling behind, Ringo below, the Moon ahead
        const pl = sky.planet;
        const ringOn = u > 0.1 && u < 0.42;
        if (ringOn) {
            const k = (u - 0.1) / 0.32, s = Math.max(W, H) / 1100;
            pl.visible = true; pl.scale.set(s); pl.position.set(lerp(W * 1.6, -W * 0.6, k), H * 1.0 + s * 160);
        }
        const m = sky.moon;
        m.view.visible = u > 0.72;
        if (m.view.visible) {
            const k = clamp((u - 0.72) / 0.28, 0, 1), rr = lerp(Math.min(W, H) * 0.06, Math.min(W, H) * 0.24, k * k);
            m.view.position.set(W * lerp(0.12, 0.18, k), H * lerp(0.3, 0.34, k));
            m.view.scale.set(rr / 100);
            m.update(dt, t, { ...(G.moon || { bites: 3, lit: 0.18, drain: 1 }), reducedMotion: rm });
        }
        if (!S.whiteHole) {
            S.whiteHole = new RAW.Graphics();
            const pts = []; for (let k = 0; k < 22; k++) { const a = k / 22 * TAU, rr = 120 * (0.75 + hash(k, 140) * 0.5); pts.push(Math.cos(a) * rr * 1.4, Math.sin(a) * rr); }
            S.whiteHole.poly(pts).fill({ color: 0xfbf8f1 }); S.whiteHole.poly(pts).stroke({ color: 0x9a96a8, width: 4, alpha: 0.6 });
            farLayer.addChild(S.whiteHole);
        }
        S.whiteHole.visible = u < 0.2;
        if (S.whiteHole.visible) { const k = u / 0.2; S.whiteHole.position.set(lerp(W * 0.85, W * 1.6, k), H * 0.3); S.whiteHole.scale.set(lerp(1.2, 0.5, k) * Math.min(W, H) / 700); }
    }

    // --- actors --------------------------------------------------------------------------------------------------
    function stepActors(dt, t, F, rm, snap) {
        const A = S.A, act = G.actors, p = G.player;
        // Klo: hanging in Nova's beam where there is no ground for him
        const k = act.klo;
        if (k) {
            let kx = k.x, ky = k.y;
            if (S.id === 'vinter' && (G.puz.ride || 0) > h(60) && !F.has('ride_done') && S.rideBearC.visible) { const w = S.rideBearC; kx = w.x + h(3.6); ky = w.y + h(0.6); }
            const kloActor = { ...k, x: kx, y: ky, vx: k.carried ? 0 : k.vx, pose: k.pose === 'love' ? 'happy' : k.pose, talking: G.speaker === 'klo' };
            A.klo.update(kloActor, { scene: S.id, time: t, dt, hero: p, talking: G.speaker === 'klo', reducedMotion: rm });
            A.klo.container.rotation = k.carried && !rm ? Math.sin(t * 2.2) * 0.12 : 0;
            if (V.heroHidden) A.klo.container.visible = false; // aboard the rocket
            const sh = A.shadows.klo; sh.visible = !!k.visible && k.scene === S.id && !k.carried && S.id !== 'stjarn'; if (sh.visible) sh.position.set(k.x, k.y + 2);
        }
        // Nova
        const n = act.nova;
        if (n && n.scene === S.id && n.visible !== false && !V.heroHidden) {
            let nx = n.x, ny = n.y;
            const carry = G.carry, beamCarry = carry && (carry.def.kind === 'beam' || carry.def.kind === 'catch');
            const target = beamCarry ? { x: p.x - (p.facing || 1) * h(0.15), y: p.y - h(0.15) } : null;
            S.novaDraw ||= { x: nx, y: ny };
            if (target) { S.novaDraw.x = lerp(S.novaDraw.x, target.x, 1 - Math.exp(-8 * dt)); S.novaDraw.y = lerp(S.novaDraw.y, target.y, 1 - Math.exp(-8 * dt)); }
            else { S.novaDraw.x = lerp(S.novaDraw.x, nx, 1 - Math.exp(-12 * dt)); S.novaDraw.y = lerp(S.novaDraw.y, ny, 1 - Math.exp(-12 * dt)); }
            nx = S.novaDraw.x; ny = S.novaDraw.y;
            let mood = n.mood || 'ordinary', eyes = n.eyes;
            if (n.angry && mood !== 'supernova' && mood !== 'asleep') mood = 'angry';
            if (mood === 'sad') { mood = 'morning'; eyes = eyes || 'low'; }
            if (mood === 'dark') { mood = 'asleep'; eyes = 'open'; }
            if (V.supernova > 0) mood = 'supernova';
            A.nova.update(dt, { visible: true, x: nx, y: ny, facing: n.facing || 1, mood, lights: n.lights || 0, glow: n.glow || 0, beam: beamCarry ? 1 : (S.beamOn || 0), talking: G.speaker === 'nova', eyes, lookAt: n.lookAt, holding: V.holding ? 'box' : null }, t, { reducedMotion: rm });
            const ll = A.nova.lampLight();
            A.lamp.visible = ll.strength > 0.3 && S.def.sky !== 'white';
            if (A.lamp.visible) { A.lamp.position.set(nx, ny - h(0.62)); A.lamp.tint = ll.color; A.lamp.alpha = ll.strength * (S.id === 'mane' && F.has('moon_bitten') && !F.has('moon_whole') ? 0.75 : 0.32); A.lamp.width = A.lamp.height = h(2.4 + ll.strength * 1.6); }
            const sh = A.shadows.nova; sh.visible = n.follow !== undefined && groundBelow(nx, ny) !== null && S.id !== 'stjarn'; if (sh.visible) { sh.position.set(nx, groundBelow(nx, ny)); sh.alpha = 0.6; }
        } else { A.nova.view.visible = false; A.lamp.visible = false; A.shadows.nova.visible = false; }
        // Suddet: far ahead in the white; on the hill; riding on the shell; a small friend on the Moon after the story
        const s = act.sudd;
        if (s && s.visible && (s.scene === S.id || (s.riding && S.id === 'vinter'))) {
            let sx = s.x, sy = s.y, pose = s.pose || 'idle', facing = s.facing || 1;
            if (s.riding || (S.id === 'vinter' && !F.has('caught'))) { sx = p.x - (p.facing || 1) * h(0.12); sy = p.y - h(0.82); pose = Math.abs(p.vx) > 900 ? 'rub' : 'idle'; facing = -(p.facing || 1); }
            if (G.carry?.def.kind === 'beam' && S.id === 'sudd') { /* stays put */ }
            A.sudd.update(dt, { visible: true, x: sx, y: sy, facing, pose, size: s.size ?? 0.8, eyes: !!s.eyes || F.has('ended'), goldStar: !!s.goldStar || F.has('ended'), talking: G.speaker === 'sudd' }, t, { reducedMotion: rm });
        } else A.sudd.view.visible = false;
        // the speech bubble over whoever "Prata" would talk to
        const c = G.context, who = c?.id?.startsWith('talk-') && !G.speaker ? c.who : null, a = who ? act[who] : null;
        const on = !!a && a.scene === S.id && a.visible !== false;
        A.talkMark.visible = on;
        if (on) {
            const kk = 1 / cam.zoom, ax = who === 'nova' ? (S.novaDraw?.x ?? a.x) : a.x, ay = who === 'nova' ? (S.novaDraw?.y ?? a.y) : a.y;
            A.talkMark.scale.set(kk);
            A.talkMark.position.set(ax, ay - h(TALK_HEAD[who] ?? 0.45) - 24 * kk + (rm ? 0 : Math.sin(t * 3.2) * 3 * kk));
        }
        // a whinny in space: only a small "…"
        S.silentT = Math.max(0, (S.silentT || 0) - dt);
        A.silent.visible = S.silentT > 0;
        if (A.silent.visible) { const kk = 1 / cam.zoom; A.silent.scale.set(kk); A.silent.position.set(p.x + (p.facing || 1) * h(0.6), p.y - h(1.35)); A.silent.alpha = Math.min(1, S.silentT * 2); }
    }
    function groundBelow(x, y) {
        const s = G.terrain?.support(x, y - h(0.2), h(0.5), h(3));
        return s && !s.s.hidden ? s.y : null;
    }

    // --- the hero (and V5: the sköldhäst without its outline, drawn back stroke by stroke) ---------------------------
    let blur = null;
    function stepHero(dt, t, F, rm, snap) {
        if (G.speaker === 'horse' && !snap.action && !rm && !snap.hide) { snap.action = 'talk'; snap.actionT = (t * 1.5) % 1; }
        hero.update(dt, snap);
        hero.view.position.set(snap.x, snap.y);
        hero.view.visible = !G.hideHero && !V.heroHidden;
        // riding the wagon or the bear: carried with them
        if (V.rideOffset) hero.view.position.set(snap.x + V.rideOffset.x, snap.y + V.rideOffset.y);
        const gone = F.has('outline_gone') && !F.has('self_drawn');
        const outlineK = gone ? 0 : V.outline;          // 1 crisp … 0 gone
        const n = gone ? (G.puz.selfDrawn || 0) : 0;
        const drawnK = gone ? n / 12 : 1;
        // colour without edges: soft, a little apart; the new outline sharpens it piece by piece
        const soft = (1 - outlineK) * (1 - drawnK);
        if (soft > 0.02) {
            if (!blur) { blur = new RAW.BlurFilter({ strength: 0, quality: 3 }); }
            hero.view.filters = [blur];
            // soft edges, but the colours stay clearly there (a strong blur dissolved a phone-sized hero, 12 November)
            blur.strength = 3.6 * soft;
            hero.view.alpha = 0.94 + 0.06 * (1 - soft);
        } else if (hero.view.filters?.length) { hero.view.filters = []; hero.view.alpha = 1; }
        const moving = Math.abs(G.player.vx) > 20;
        S.drift = clamp((S.drift || 0) + (gone && !moving ? 0 : gone ? dt * 0.12 : -dt), 0, 1);
        S.patches.forEach((pt, i) => {
            pt.s.visible = soft > 0.05;
            if (!pt.s.visible) return;
            const spread = (8 + 26 * (gone ? 1 - drawnK : 0.4)) * soft;
            const a = pt.o + (rm ? 0 : t * 0.25);
            pt.s.position.set(snap.x + Math.cos(a) * spread + (i - 1.5) * 26 * snap.facing, snap.y - h(0.55) + Math.sin(a * 1.3) * spread * 0.6);
            pt.s.alpha = 0.5 * soft;
        });
        // the outline drawn back: a fresh dark pencil line, one group a stride
        const showOutline = gone ? n : (V.outlineDash > 0 ? 12 : 0);
        const key = showOutline + (V.outlineDash > 0 ? 100 : 0);
        if (S.outlineN !== key) {
            S.outlineN = key;
            S.outlineG.clear();
            for (let i = 0; i < showOutline; i++) {
                if (V.outlineDash > 0 && !gone) dashedPath(S.outlineG, OUTLINE[i], pen.line(0x2b2530, 4, 0.9), { dash: 9, gap: 9 });
                else lineAlong(S.outlineG, OUTLINE[i]).stroke(pen.line(0x2b2530, 4.4, 0.95));
            }
        }
        S.outlineG.visible = showOutline > 0;
        if (S.outlineG.visible) {
            S.outlineG.position.set(snap.x, snap.y);
            S.outlineG.scale.set(snap.facing || 1, 1);
            S.outlineG.alpha = V.outlineDash > 0 && !gone ? V.outlineDash : gone ? 1 : 0;
        }
        // with the last line a warm light comes up on the hill: it is not the Moon, it is the sköldhäst
        S.selfLight.visible = V.selfGlow > 0.01 || (F.has('self_drawn') && S.id === 'sudd' && !F.has('ride'));
        if (S.selfLight.visible) { S.selfLight.position.set(snap.x, snap.y - h(0.6)); S.selfLight.alpha = Math.max(V.selfGlow, F.has('self_drawn') ? 0.35 : 0); S.selfLight.width = h(5); S.selfLight.height = h(4); }
        // the sköldhäst that comes home is the one the player drew: a little warmer from then on
        if (F.has('self_drawn') && !gone) hero.view.tint = 0xfff6ea; else hero.view.tint = 0xffffff;
    }

    // --- the beam: Nova holds a still shell and lifts it ---------------------------------------------------------------
    function stepBeam(dt, t, F, rm, snap) {
        const g = S.beamG;
        g.clear();
        const c = G.carry;
        const on = c && (c.def.kind === 'beam' || c.def.kind === 'catch');
        S.beamOn = lerp(S.beamOn || 0, on ? 1 : 0, 1 - Math.exp(-8 * dt));
        if (S.beamOn < 0.02 || !S.novaDraw) return;
        const nx = S.novaDraw.x, ny = S.novaDraw.y - h(0.2), sx = snap.x, sy = snap.y - h(0.2);
        const w0 = h(0.35), w1 = h(0.65);
        const a = S.beamOn * (rm ? 0.5 : 0.42 + 0.1 * Math.sin(t * 9));
        g.poly([nx - w0, ny - h(0.6), nx + w0, ny - h(0.6), sx + w1, sy + h(0.25), sx - w1, sy + h(0.25)]).fill({ color: 0xc8b8ff, alpha: a * 0.6 });
        g.poly([nx - w0 * 0.4, ny - h(0.6), nx + w0 * 0.4, ny - h(0.6), sx + w1 * 0.5, sy + h(0.2), sx - w1 * 0.5, sy + h(0.2)]).fill({ color: 0xffffff, alpha: a * 0.4 });
        for (let k = 0; k < 6; k++) { const u = ((t * 0.9 + k / 6) % 1); g.circle(lerp(nx, sx, u) + Math.sin(t * 3 + k) * 8, lerp(ny - h(0.6), sy, u), 3).fill({ color: 0xffffff, alpha: a }); }
    }

    // --- the camera (Äventyr 2's, with Nova's dome in the pictures) ---------------------------------------------------------
    function actorBox(id) {
        const a = G.actors[id];
        if (!a || a.visible === false || (a.scene && a.scene !== S.id)) return null;
        if (id === 'nova') { const x = S.novaDraw?.x ?? a.x, y = S.novaDraw?.y ?? a.y; return { x0: x - h(0.8), x1: x + h(0.9), y0: y - h(1.5), y1: y + h(0.1) }; }
        if (id === 'sudd') return { x0: a.x - h(0.4), x1: a.x + h(0.4), y0: a.y - h(0.5), y1: a.y + h(0.1) };
        return { x0: a.x - h(0.4), x1: a.x + h(0.4), y0: a.y - h(0.6), y1: a.y + h(0.1) };
    }
    function frameSpeaker(tx, ty, zoom, W, H) {
        const who = G.speaker, p = G.player;
        const look = G.camLook && (!G.camLook.scene || G.camLook.scene === S.id) ? G.camLook : null;
        const box = who && who !== 'horse' ? actorBox(who) : null;
        if ((!box && !look) || G.hideHero) return { tx, ty, zoom };
        const boxes = look ? [{ x0: look.x0 - h(0.5), x1: look.x1 + h(0.5), y0: look.y0 - h(0.3), y1: look.y1 + h(0.2) }] : [];
        if (box) boxes.push(box);
        const union = bs => ({ x0: Math.min(...bs.map(b => b.x0)), x1: Math.max(...bs.map(b => b.x1)), y0: Math.min(...bs.map(b => b.y0)), y1: Math.max(...bs.map(b => b.y1)) });
        const them = union(boxes), all = union([{ x0: p.x - h(0.7), x1: p.x + h(0.7), y0: p.y - h(1.6), y1: p.y + h(0.2) }, ...boxes]);
        zoom = Math.max(zoom * (look ? 0.7 : 0.75), Math.min(zoom, W / (all.x1 - all.x0), H / (all.y1 - all.y0)));
        const vw = W / zoom, vh = H / zoom;
        if (all.x1 - all.x0 <= vw) tx = clamp(tx, all.x1 - vw / 2, all.x0 + vw / 2);
        else if (look) tx = them.x1 - them.x0 <= vw ? clamp(p.x, them.x1 - vw / 2, them.x0 + vw / 2) : (them.x0 + them.x1) / 2;
        else tx = p.x + Math.sign((box.x0 + box.x1) / 2 - p.x) * (vw / 2 - h(0.9));
        if (all.y1 - all.y0 <= vh) ty = clamp(ty, all.y1 - vh / 2, all.y0 + vh / 2);
        else if (look) ty = them.y1 - them.y0 <= vh ? clamp(p.y, them.y1 - vh / 2, them.y0 + vh / 2) : (them.y0 + them.y1) / 2;
        return { tx, ty, zoom };
    }
    function updateCamera(dt, snap, W, H) {
        const def = S.def, F = G.flags, p = G.player;
        // the white page's sky goes on up past the page (the paper and the dark around the Moon): an upright phone may
        // look higher there, so the Moon's face sits above the heroes and not over a wall of crumbs
        const b = S.id === 'sudd' ? { ...def.bounds, y0: Math.min(def.bounds.y0, h(-16)) } : def.bounds;
        let zoom = Math.min(W / h(11), H / h(6.2));
        zoom = Math.max(zoom, H / h(14));
        zoom = Math.min(zoom, 0.9);
        const portrait = H > W * 1.15;
        if (S.id === 'stjarn' || p.water?.kind === 'space') zoom *= 0.86;
        if (S.id === 'mane' && p.x > h(80) && p.y < h(-1)) zoom *= 0.85; // the climb to Spiran: see the rocks above
        if (S.id === 'vinter') {
            const u = clamp((G.puz.ride || 0) / def.ride.length, 0, 1);
            zoom *= F.has('ride_done') ? 0.8 : lerp(1.15, 0.5, Math.sqrt(u));
        }
        const lift = portrait ? Math.max(h(1.2), (H / zoom) * 0.2) : h(1.2);
        let tx = snap.x + (snap.facing || 1) * Math.min(h(1.6), W / zoom * 0.12), ty = snap.y - (p.mode === 'swim' ? h(0.4) : lift);
        if (S.id === 'vinter' && !F.has('ride_done')) { tx = snap.x + (snap.facing || -1) * W / zoom * 0.22; ty = snap.y - H / zoom * 0.16; }
        const hint = G.camHint;
        if (hint) {
            tx = hint.x; ty = hint.y; zoom *= hint.zoom || 1;
            const fit = hint.fit || (portrait ? hint.portraitFit : null);
            if (fit && !hint.peak) {
                const boxes = [{ x0: hint.x - h(0.6), x1: hint.x + h(0.6), y0: hint.y - h(0.6), y1: hint.y + h(0.6) }, { x0: p.x - h(0.8), x1: p.x + h(0.8), y0: p.y - h(1.2), y1: p.y + h(0.2) }];
                for (const id of fit) { const bx = actorBox(id); if (bx) boxes.push(bx); }
                const x0 = Math.min(...boxes.map(q => q.x0)) - h(0.5), x1 = Math.max(...boxes.map(q => q.x1)) + h(0.5);
                const y0 = Math.min(...boxes.map(q => q.y0)) - h(0.4), y1 = Math.max(...boxes.map(q => q.y1)) + h(0.3);
                tx = (x0 + x1) / 2; ty = Math.min(ty, (y0 + y1) / 2);
                zoom = Math.min(zoom, W * 0.94 / (x1 - x0), H * 0.8 / (y1 - y0));
                if (portrait) zoom = Math.max(Math.min(zoom, W / h(7.5)), W / h(13));
            }
            if (!hint.peak && W > H && H <= 520) { const strip = Math.min(110, H * 0.28); zoom *= 0.85; ty += strip / 2 / zoom; }
        }
        // the climax: the Moon's face, Suddet and the friends in one picture (the face whole at every size)
        if (S.id === 'sudd' && F.has('climax') && !F.has('outline_gone') && !hint?.override) {
            const m = S.bigMoon.view, R = S.bigMoon.radius;
            const face = { x0: m.x - R * 0.7, x1: m.x + R * 0.9, y0: m.y - R * 0.75, y1: m.y + R * 0.72 };
            // the heroes: the sköldhäst and the friends beside it (Nova walks behind, and must not fall out of the picture)
            const heroes = [{ x0: p.x - h(1), x1: p.x + h(1) }];
            for (const id of ['nova', 'klo']) { const bx = actorBox(id); if (bx && Math.abs((bx.x0 + bx.x1) / 2 - p.x) < h(3.5)) heroes.push(bx); }
            const hx0 = Math.min(...heroes.map(q => q.x0)), hx1 = Math.max(...heroes.map(q => q.x1));
            const all = { x0: Math.min(face.x0, hx0), x1: Math.max(face.x1, hx1), y0: face.y0 - h(0.3), y1: Math.max(face.y1, p.y + h(0.75)) };
            const zf = Math.min(W / (all.x1 - all.x0), H / (all.y1 - all.y0));
            const zFace = Math.min(W / (face.x1 - face.x0 + h(1)), H / (all.y1 - all.y0));
            zoom = portrait ? Math.max(zf, Math.min(zFace, W / h(8.5))) : zf;
            tx = portrait ? clamp((all.x0 + all.x1) / 2, face.x0 + W / zoom / 2 - h(0.5), face.x1 - W / zoom / 2 + h(0.5)) : (all.x0 + all.x1) / 2;
            if (portrait && W / zoom < all.x1 - all.x0) {
                const vw = W / zoom;
                // the face first, but the heroes whole: when both do not fit, the face's far side goes off the edge
                tx = (face.x0 + face.x1) / 2 - h(0.6);
                if (p.x < tx) tx = Math.min(tx, hx0 + h(0.15) + vw / 2);
                else tx = Math.max(tx, hx1 - h(0.15) - vw / 2);
            }
            // upright: the heroes low in the picture, the face above them, the room at the top for the speech boxes
            ty = portrait ? Math.min((all.y0 + all.y1) / 2, all.y1 + h(0.3) - H / zoom * 0.78 + H / zoom / 2) : (all.y0 + all.y1) / 2;
        }
        // the vista from Utsikten (M5) and the earthrise: the camera turns to the whole sky
        if (V.vista > 0.01 || V.earthrise > 0.01) {
            const k = Math.max(V.vista, V.earthrise);
            zoom = lerp(zoom, zoom * 0.42, k);
            ty = lerp(ty, snap.y - (H / (zoom)) * 0.18, k);
        }
        // the finished sky: up from Nova's crater until all of it is in view
        if (V.skyRise) { const k = ease(V.skyRise.u); zoom = lerp(zoom, zoom * 0.5, k); ty = lerp(ty, ty - H / zoom * 0.3, k); }
        // pulled back, never past the page's height: an upright phone would see under the ground
        if (V.vista > 0.01 || V.earthrise > 0.01 || V.skyRise) zoom = Math.max(zoom, H / (b.y1 - b.y0));
        // the bear stands up: the camera pulls back until he fills the height of the screen, the heroes small on his back
        if (V.bearStand > 0.01) { const k = ease(V.bearStand); zoom = lerp(zoom, Math.min(W / h(24), H / h(10.5)), k); ty = lerp(ty, h(-2.8), k); tx = lerp(tx, h(60.5), k); }
        if (!hint && !(S.id === 'sudd' && F.has('climax') && !F.has('outline_gone')) && V.vista < 0.01 && V.bearStand < 0.01) ({ tx, ty, zoom } = frameSpeaker(tx, ty, zoom, W, H));
        else if (hint && Math.abs(hint.x - snap.x) < W / zoom * 0.45 && !(S.id === 'sudd' && F.has('climax') && !F.has('outline_gone'))) ({ tx, ty, zoom } = frameSpeaker(tx, ty, zoom, W, H));
        const vw = W / zoom, vh = H / zoom;
        tx = vw >= b.x1 - b.x0 ? (b.x0 + b.x1) / 2 : clamp(tx, b.x0 + vw / 2, b.x1 - vw / 2);
        ty = vh >= b.y1 - b.y0 ? (b.y0 + b.y1) / 2 : clamp(ty, b.y0 + vh / 2, b.y1 - vh / 2);
        if (cam.snap) { cam.x = tx; cam.y = ty; cam.zoom = zoom; cam.snap = false; return; }
        const k = 1 - Math.exp(-(G.lessMotion ? 3 : 4.5) * dt);
        cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k * 0.85); cam.zoom = lerp(cam.zoom, zoom, 1 - Math.exp(-2.5 * dt));
    }

    // --- numbers by the ten dots while the constellation is drawn ---------------------------------------------------------
    function showNumbers(W, H) {
        if (!S.numbers) {
            S.numbers = new RAW.Container(); pictureLayer.addChild(S.numbers);
            for (let i = 0; i < 10; i++) {
                const tx = new RAW.Text({ text: String(i + 1), style: { fontFamily: 'Patrick Hand, Comic Sans MS, cursive', fontSize: 26, fill: 0xfff0b0, stroke: { color: 0x1a1a30, width: 4 } } });
                tx.anchor.set(0.5); S.numbers.addChild(tx);
            }
        }
        S.numbers.visible = true;
        const pos = sky.alvaScreen(W, H, Math.max(V.alvaFocus, V.vista));
        S.numbers.children.forEach((tx, i) => { tx.position.set(pos[i].x + 26, pos[i].y - 24); tx.style.fontSize = Math.max(18, Math.min(30, Math.min(W, H) * 0.04)); });
    }

    // --- a star-light picked up flies into Nova's kupa in the corner -------------------------------------------------------
    const pickups = [];
    let lightsLanded = 0;
    function startPickup(id) {
        const rec = S?.lights.get(id), p = G.player;
        const from = rec?.sl.view.visible ? { x: rec.sl.view.x, y: rec.sl.view.y } : { x: p.x, y: p.y - h(0.7) };
        const sl = createStarLight(PIXI, pen); overlay.addChild(sl.view);
        pickups.push({ id, sl, from, t: 0 });
    }
    function stepPickups(dt, t, W, H, rm) {
        for (let i = pickups.length - 1; i >= 0; i--) {
            const k = pickups[i];
            k.t += dt;
            const pop = rm ? 0 : 0.35, fly = rm ? 0.35 : 0.8;
            const start = { x: world.position.x + k.from.x * cam.zoom, y: world.position.y + k.from.y * cam.zoom };
            const goal = lightTarget?.() || { x: W - 90, y: 40 };
            if (k.t < pop) {
                const u = k.t / pop, e = 1 - (1 - u) * (1 - u);
                k.sl.view.position.set(start.x, start.y - e * 50); k.sl.view.scale.set(lerp(cam.zoom * 1.15, 1.4, e));
                k.at = { x: k.sl.view.x, y: k.sl.view.y, s: k.sl.view.scale.x };
            } else {
                const a = k.at || { x: start.x, y: start.y, s: 1 };
                const u = Math.min(1, (k.t - pop) / fly), e = u * u * (3 - 2 * u);
                const arc = rm ? 0 : Math.sin(u * Math.PI) * Math.max(0, Math.min(110, (a.y + goal.y) / 2 - 20));
                k.sl.view.position.set(lerp(a.x, goal.x, e), lerp(a.y, goal.y, e) - arc);
                k.sl.view.scale.set(lerp(a.s, 0.5, e));
                if (u >= 1) { k.sl.destroy(); pickups.splice(i, 1); lightsLanded++; continue; }
            }
            k.sl.update(dt, t, { k: 1.2 });
        }
    }

    // --- staged moments (story fx) -------------------------------------------------------------------------------------------
    function waitGame(sec) { return G.wait(sec); }
    function until(test) { return new Promise(resolve => waiters.add({ test, resolve })); }
    async function fx(name, data = {}) {
        if (!S) return;
        const rm = !!G.lessMotion, F = G.flags, p = G.player;
        switch (name) {
            case 'focus':
                if (!data) { G.camHint = null; return; }
                G.camHint = { x: data.x, y: data.y, zoom: data.zoom || 1, peak: !!data.peak, fit: data.fit || null, portraitFit: data.portraitFit || null };
                await waitGame(rm ? 0.3 : 0.9);
                if (data.hold) await waitGame(data.hold);
                return;
            case 'fadeOut': fadeColor = data.color ?? 0xfbf8f1; fadeTarget = 1; fadeRate = data.rate || 2.5; await until(() => fade >= 1); return;
            case 'fadeIn': fadeTarget = 0; fadeRate = data.rate || 2; V.heroHidden = false; await until(() => fade <= 0); return;
            case 'landing': {
                // the rocket comes down crooked in a cloud of slow dust
                if (S.id !== 'mane' || !S.rocket) return;
                V.landing = { u: 0 };
                G.camHint = { x: S.def.rocketAt.x + h(1.5), y: h(-2.6), zoom: 0.8 };
                await animate(2.6, (u) => { V.landing.u = u; });
                V.landing = null;
                await waitGame(0.5);
                G.camHint = null;
                return;
            }
            case 'eat': {
                // Nova eats her kometflingor: the box in her big claw, crumbs, the lamps go from violet to pink
                V.holding = true; V.eating = true;
                const n = G.actors.nova;
                for (let k = 0; k < 6; k++) { if (n) emit('crumb', n.x + h(0.6), n.y - h(0.5), 3, { speed: 90, gravity: 200, life: 0.8, tint: 0xf0c060 }); await waitGame(rm ? 0.08 : 0.22); }
                V.holding = false; V.eating = false;
                return;
            }
            case 'vista': {
                // M5: from Utsikten the camera turns to the whole sky: ten white holes, the forest far below, dimmer
                V.vistaOn = !!data.on;
                if (data.on) await waitGame(rm ? 0.6 : 2.2); else await waitGame(rm ? 0.3 : 1.0);
                return;
            }
            case 'travel': {
                // the rocket lifts off (everyone is aboard), then the page turns
                V.heroHidden = true;
                if (S.rocket && rocketHere(G)) { V.travel = { u: 0 }; await animate(1.4, (u) => { V.travel.u = u; }); V.travel = null; }
                await fx('fadeOut', { rate: 2.2 });
                return;
            }
            case 'rocketGone': {
                // big picture 5: the white page in silence; three strokes rub the rocket into a dashed outline, and a small
                // pink blur hops away into the white
                const r = S.def.rocketAt;
                G.camHint = { x: r.x + h(2.2), y: h(-1.6), zoom: 0.95 };
                await waitGame(rm ? 0.3 : 1.2);
                V.rocketRub = 0;
                const blur = createSuddet(PIXI, pen); blur.view.scale.set(1.4); blur.view.alpha = 0.55; L.fx.addChild(blur.view);
                await animate(2.4, (u) => {
                    V.rocketRub = u;
                    const k = (u * 3) % 1, band = Math.min(2, Math.floor(u * 3));
                    blur.update(1 / 60, { x: lerp(r.x - h(0.8), r.x + h(0.8), k), y: r.y - h([1.8, 1.0, 0.2][band]), pose: 'rub', size: 0.9 }, G.time, { reducedMotion: rm });
                    if (!rm && Math.random() < 0.4) emit('crumb', r.x + (Math.random() - 0.5) * h(1.2), r.y - h([1.8, 1.0, 0.2][band]), 2, { speed: 100, gravity: 400, life: 0.9 });
                });
                await animate(1.2, (u) => { blur.update(1 / 60, { x: lerp(r.x + h(1), r.x + h(14), u), y: r.y - Math.abs(Math.sin(u * 12)) * h(0.4), pose: 'hop', size: 0.8 }, G.time, { reducedMotion: rm }); blur.view.alpha = 0.55 * (1 - u); });
                blur.destroy();
                G.camHint = null;
                return;
            }
            case 'wagonRide': {
                // Karlavagnen is a real wagon: it rolls, with everyone in it
                V.rideOffset = { x: 0, y: 0 };
                await animate(2.0, (u) => { const e = ease(u); V.wagonRoll = e; V.rideOffset.x = e * h(22); V.rideOffset.y = -h(0.4) * Math.sin(u * Math.PI); });
                await fx('fadeOut', { rate: 2.6 });
                V.wagonRoll = 0; V.rideOffset = null;
                return;
            }
            case 'beltBlink': {
                // Nova's lamps blink the order: middle, left, right
                const order = S.def.belt?.order || ['b2', 'b1', 'b3'];
                for (const id of order) { S.blink = { id, k: 1 }; await waitGame(rm ? 0.5 : 0.7); S.blink = { id, k: 0 }; await waitGame(0.25); }
                S.blink = null;
                return;
            }
            case 'beltLit': { for (const st of Object.values(S.beltStones || {})) emit('star', st.cx, st.cy - h(0.2), 8, { speed: 200, gravity: 0, life: 1 }); flash = 0.25; return; }
            case 'bearWakes': {
                cam.shake = 4;
                const b = S.def.spots.bearHead;
                if (b) emit('star', b.x + h(1.5), b.y, 14, { speed: 260, gravity: 0, life: 1.1, angle: 0, cone: 1.2 }); // the sneeze
                await waitGame(1.2);
                return;
            }
            case 'bearStands': {
                // big picture 3: the camera pulls back until the bear fills the screen's height, the heroes on his back
                V.rideOffset = { x: 0, y: 0 };
                await animate(2.8, (u) => { V.bearStand = ease(u); V.rideOffset.y = -ease(u) * h(4.2) * 0.8; });
                await waitGame(rm ? 0.4 : 1.2);
                return;
            }
            case 'bearWalk': {
                await animate(2.2, (u) => { const step = Math.floor(u * 3) + ease((u * 3) % 1); V.bearWalk = step / 3 * 3; if (V.rideOffset) V.rideOffset.x = V.bearWalk * h(3); });
                await fx('fadeOut', { rate: 2.6 });
                V.bearStand = 0; V.bearWalk = 0; V.rideOffset = null;
                return;
            }
            case 'pipFlash': { V.pipFlash = 1; flash = 0.5; await waitGame(0.6); return; }
            case 'slingshot': return slingshot();
            case 'cometPass': { V.cometSweep = { u: 0 }; await animate(1.4, (u) => { V.cometSweep.u = u; }); V.cometSweep = null; return; }
            case 'ghosts': { V.ghosts = true; await waitGame(rm ? 1 : 2.4); V.ghosts = false; return; }
            case 'bite': {
                // a held moment: the squeak, one tearing squeal, then the change
                const n = data.n || 1, m = S.bigMoon;
                if (!m) return;
                V.bites = n - 1;
                const at = m.biteAt(n - 1), x = m.view.x + at.x, y = m.view.y + at.y;
                const blur = createSuddet(PIXI, pen); blur.view.scale.set(2.4); blur.view.alpha = 0.7; L.fx.addChild(blur.view);
                await animate(1.4, (u) => { blur.update(1 / 60, { x: x + Math.sin(u * 30) * h(0.4), y, pose: 'rub', size: 1 }, G.time, { reducedMotion: rm }); });
                blur.destroy();
                V.bites = n;
                cam.shake = rm ? 0 : 7;
                for (let k = 0; k < (rm ? 6 : 22); k++) emit('crumb', x + (Math.random() - 0.5) * h(1.5), y, 1, { speed: 40, gravity: 140, life: 3.5, spread: 30 });
                await waitGame(0.6);
                V.bites = null;
                return;
            }
            case 'lightsOut': {
                // the light goes out: two full seconds of nothing, then the white paper is the only light, from below
                await animate(0.9, (u) => { V.black = u * 0.94; });
                V.dreadOn = true; V.dread = 1;
                await waitGame(2.0);
                await animate(1.2, (u) => { V.black = 0.94 * (1 - u); });
                V.black = 0;
                return;
            }
            case 'drain': { V.drainK = 0; await animate(2.2, (u) => { V.drainK = u; }); V.drainK = null; return; }
            case 'notesRub': {
                const k = G.actors.klo;
                for (let i = 0; i < 3; i++) { if (k) emit('crumb', k.x + h(0.25), k.y - h(0.3), 8, { speed: 120, gravity: 300, life: 0.9 }); await waitGame(rm ? 0.2 : 0.45); }
                return;
            }
            case 'outlineGone': {
                // the sköldhäst's outline goes faint, breaks into dashes, and is gone: four seconds, the quietest part
                await animate(4.0, (u) => {
                    V.outline = 1 - ease(u);
                    V.outlineDash = u > 0.3 ? (u < 0.85 ? 1 - (u - 0.3) / 0.55 * 0.4 : (1 - u) / 0.15 * 0.6) : 0;
                });
                V.outlineDash = 0; V.outline = 1;
                return;
            }
            case 'selfWhole': { await animate(1.4, (u) => { V.selfGlow = Math.sin(u * Math.PI) * 0.9 + u * 0.3; }); V.selfGlow = 0; V.dreadOn = false; return; }
            case 'cometArrives': {
                // a streak of light; the long straight tail sweeps in and lies still along the edge of the white
                const k = createKomet(PIXI, pen); L.fx.addChild(k.view);
                await animate(1.8, (u) => { const e = ease(u); k.update(1 / 60, { x: lerp(p.x + h(16), p.x - h(3), e), y: lerp(h(-9), p.y - h(1.6), e), facing: -1, tail: h(14) * (0.4 + e), speed: 1 - e }, G.time, { reducedMotion: rm }); });
                flash = 0.35;
                await waitGame(0.6);
                // it lies still along the edge of the white while it calls them up (it is the one speaking now)
                S.arrivedKomet = k;
                return;
            }
            case 'pipCalls': {
                // Pip has seen everything and called for help: he tumbles into the picture, high up, from the right
                const q = createPip(PIXI, pen); q.view.scale.set(1.2); L.fx.addChild(q.view);
                S.callPip = q;
                await animate(rm ? 0.3 : 1.2, (u) => { const e = ease(u); q.update(1 / 60, { x: lerp(p.x + h(9), p.x + h(2.6), e), y: lerp(h(-6), p.y - h(2.6), e), tumble: 2.2, flash: 0 }, G.time, { reducedMotion: rm }); });
                return;
            }
            case 'rimHeals': {
                // the light runs back into the Moon and fills the holes; the face is gone
                V.rimLight = 1;
                await animate(2.2, (u) => { V.rimLight = 1 - ease(u); });
                V.rimLight = null;
                flash = 0.2;
                return;
            }
            case 'lightsHome': {
                // the ten lights fly from under Nova's dome to their marks
                V.homeCount = 0;
                const n = G.actors.nova, W = app.screen.width, H = app.screen.height;
                V.alvaFocusOn = true;
                await waitGame(rm ? 0.3 : 1.0);
                for (let i = 0; i < 10; i++) {
                    const pos = sky.alvaScreen(W, H, V.alvaFocus)[i];
                    const from = n ? { x: world.position.x + n.x * cam.zoom, y: world.position.y + (n.y - h(0.9)) * cam.zoom } : { x: W / 2, y: H / 2 };
                    const sl = createStarLight(PIXI, pen); overlay.addChild(sl.view);
                    await animate(rm ? 0.2 : 0.5, (u) => { const e = ease(u); sl.view.position.set(lerp(from.x, pos.x, e), lerp(from.y, pos.y, e) - Math.sin(u * Math.PI) * 60); sl.view.scale.set(lerp(0.6, 1.2, e)); sl.update(1 / 60, G.time, { k: 1.2 }); });
                    sl.destroy();
                    V.homeCount = i + 1;
                    if (G.actors.nova) G.actors.nova.lights = 9 - i;
                }
                await waitGame(0.4);
                V.homeCount = null;
                return;
            }
            case 'gold': {
                V.goldUpTo = 0;
                for (let i = 0; i < 10; i++) { V.goldUpTo = i + 1; flash = 0.06; await waitGame(rm ? 0.1 : 0.22); }
                V.goldUpTo = null;
                return;
            }
            case 'supernova': { V.supernova = 1; flash = 0.3; for (let k = 0; k < 3; k++) { const n = G.actors.nova; if (n) emit('star', n.x, n.y - h(0.9), 12, { speed: 240, gravity: 0, life: 1.2, tint: 0xffe08a }); await waitGame(0.35); } await waitGame(0.6); V.supernova = 0; return; }
            case 'finishedSky': {
                // big picture 7: the camera rises slowly from Nova's crater until all of it is in view, and holds
                V.alvaFocusOn = true;
                V.skyRise = { u: 0 };
                await animate(3.2, (u) => { V.skyRise.u = u; });
                await waitGame(rm ? 0.5 : 1.6);
                V.skyRise = null; V.alvaFocusOn = false;
                return;
            }
            case 'earthrise': { await animate(3.0, (u) => { V.earthrise = Math.sin(u * Math.PI); }); V.earthrise = 0; return; }
            case 'suddStar': {
                const s = G.actors.sudd;
                if (s) emit('star', s.x, s.y - h(0.3), 10, { speed: 260, gravity: -80, life: 1.4, angle: -Math.PI / 2, cone: 0.4 });
                await waitGame(1.0);
                V.extraStars++;
                return;
            }
            case 'bearSnore': { V.snore = 8; return; }
            case 'secondBox': { V.box2 = 0; await animate(2.2, (u) => { V.box2 = u; }); V.box2 = 1; V.supernova = 1; await waitGame(0.5); V.supernova = 0; return; }
            case 'lightning': flash = 0.7; return;
            default: return;
        }
    }
    /** Big picture 4: the shell goes once and a half round Ringo in its rings' plane and is flung off, and the sun rises
     *  over the planet's limb as the shell comes out of the shadow. */
    async function slingshot() {
        // big picture 4: all of Ringo, its rings tilted towards us; the shell comes in from the left, goes once and a half
        // round it in the rings' plane (behind the planet over the top, in front of it underneath) and is flung off to
        // the right, out of the shadow and into the sun. Sized to the screen's short side, so a phone sees all of it.
        const rm = !!G.lessMotion;
        const pic = new RAW.Container(); pictureLayer.addChild(pic);
        const bgp = new RAW.Graphics();
        const sun = new RAW.Sprite(TX.glow); sun.anchor.set(0.5); sun.tint = 0xfff0c0; sun.blendMode = 'add';
        const ringsBack = new RAW.Graphics(), trailBack = new RAW.Graphics(), ringsFront = new RAW.Graphics(), trailFront = new RAW.Graphics();
        const shellAt = () => { const g = new RAW.Graphics(); g.circle(0, 0, 10).fill({ color: 0x6f9a5a }).stroke({ color: 0x2f4a2a, width: 2.4 }); g.moveTo(-6, -2).lineTo(6, -2).moveTo(-4, 4).lineTo(4, 4).stroke({ color: 0x2f4a2a, width: 1.4, alpha: 0.7 }); return g; };
        const shellBack = shellAt(), shellFront = shellAt();
        const pl = new RAW.Container();
        pic.addChild(bgp, sun, ringsBack, trailBack, shellBack, pl, ringsFront, trailFront, shellFront);
        const R0 = 100;
        const disc = new RAW.Graphics();
        disc.circle(0, 0, R0).fill({ color: 0xb79be6 });
        const stripes = [0xf2a0c4, 0x7fd4d0, 0xf6e08a, 0xb79be6, 0xe6a6d8, 0x8fc9f0];
        for (let i = 0; i < stripes.length; i++) { const y0 = -R0 + (i + 0.5) * (2 * R0 / stripes.length); disc.rect(-R0, y0 - R0 * 0.09, 2 * R0, R0 * 0.18).fill({ color: stripes[i], alpha: 0.75 }); }
        for (let k = 0; k < 90; k++) { const x = (hash(k, 201) - 0.5) * 2 * R0, y = (hash(k, 202) - 0.5) * 2 * R0; disc.moveTo(x, y).lineTo(x + 6, y + 2.4).stroke({ color: 0xffffff, width: 0.8, alpha: 0.1 }); }
        const clip = new RAW.Graphics(); clip.circle(0, 0, R0).fill(0xffffff); disc.mask = clip;
        const rim = new RAW.Graphics(); rim.circle(0, 0, R0).stroke({ color: 0x2a2048, width: 2.2, alpha: 0.8 });
        const night = new RAW.Graphics(); night.circle(0, 0, R0).fill({ color: 0x0b0d22, alpha: 0.6 });
        pl.addChild(disc, clip, night, rim);
        const TILT = -0.14, TURNS = 2.75 * Math.PI, IN = 0.16, OUT = 0.86;
        // the path in Ringo's units (radius 1): back = behind the planet
        const orbit = (th) => { const x = Math.cos(th) * 1.45, y = Math.sin(th) * 0.42; return { x: x * Math.cos(TILT) - y * Math.sin(TILT), y: x * Math.sin(TILT) + y * Math.cos(TILT), back: Math.sin(th) < 0 }; };
        const start = { x: -2.6, y: -1.2, back: false };
        const path = (u) => {
            if (u < IN) { const e = u / IN, o = orbit(Math.PI); return { x: lerp(start.x, o.x, e), y: lerp(start.y, o.y, e), back: false }; }
            if (u <= OUT) return orbit(Math.PI + (u - IN) / (OUT - IN) * TURNS);
            const a = orbit(Math.PI + TURNS), b = orbit(Math.PI + TURNS - 0.02), k = (u - OUT) / (OUT - IN) * TURNS / 0.02 * 1.8;
            return { x: a.x + (a.x - b.x) * k, y: a.y + (a.y - b.y) * k, back: false };
        };
        const ringPts = (rx, ry, from, to) => { const out = []; for (let i = 0; i <= 40; i++) { const th = lerp(from, to, i / 40), x = Math.cos(th) * rx, y = Math.sin(th) * ry; out.push([x * Math.cos(TILT) - y * Math.sin(TILT), x * Math.sin(TILT) + y * Math.cos(TILT)]); } return out; };
        const fadeIn = rm ? 0.12 : 0.14;
        await animate(rm ? 1.8 : 3.4, (u) => {
            const W = app.screen.width, H = app.screen.height;
            const R = Math.min(W, H) * 0.29, cx = W * 0.5, cy = H * 0.55;
            const hidden = (q) => q.back && Math.hypot(q.x, q.y) < 1.02;
            bgp.clear(); bgp.rect(0, 0, W, H).fill({ color: 0x0b0e22 });
            for (let k = 0; k < 70; k++) bgp.circle(hash(k, 301) * W, hash(k, 302) * H, 0.8 + hash(k, 303) * 1.6).fill({ color: 0xffffff, alpha: 0.25 + hash(k, 304) * 0.45 });
            pic.alpha = clamp(Math.min(u / fadeIn, (1 - u) / fadeIn), 0, 1);
            pl.position.set(cx, cy); pl.scale.set(R / R0); pl.rotation = -0.12 + u * 0.3;
            // the shell comes out of Ringo's shadow on the last round: the night lifts and the sun rises over the limb
            night.alpha = 1 - ease((u - 0.5) / 0.35);
            const su = ease((u - 0.55) / 0.35);
            sun.position.set(cx + R * 0.8, cy - R * (0.55 + su * 0.6)); sun.width = sun.height = R * (1.2 + su * 1.6); sun.alpha = su;
            // the rings: the far half behind the planet, the near half in front
            ringsBack.clear(); ringsFront.clear();
            for (const [k, col, w, al] of [[1.32, 0xdff0ff, 5, 0.7], [1.5, 0xf2c8e8, 7, 0.5], [1.7, 0xbfe6f0, 3.5, 0.55]]) {
                const tr = (pts) => pts.map(([x, y]) => [cx + x * R, cy + y * R]);
                lineAlong(ringsBack, tr(ringPts(k, k * 0.29, Math.PI, 2 * Math.PI))).stroke({ color: col, width: w * R / 120, alpha: al * 0.8, cap: 'round' });
                lineAlong(ringsFront, tr(ringPts(k, k * 0.29, 0, Math.PI))).stroke({ color: col, width: w * R / 120, alpha: al, cap: 'round' });
            }
            // the shell and its trail of light
            const q = path(u), sc = Math.max(0.8, R / 110);
            for (const [g, back] of [[shellBack, true], [shellFront, false]]) { g.position.set(cx + q.x * R, cy + q.y * R); g.scale.set(sc); g.visible = q.back === back && !hidden(q); }
            trailBack.clear(); trailFront.clear();
            for (let k = 1; k < 18; k++) {
                const qq = path(Math.max(0, u - k * 0.007));
                if (hidden(qq)) continue;
                (qq.back ? trailBack : trailFront).circle(cx + qq.x * R, cy + qq.y * R, Math.max(1, (7 - k * 0.35) * sc)).fill({ color: 0xffffff, alpha: Math.max(0, 0.55 - k * 0.03) });
            }
        });
        pic.destroy({ children: true });
    }

    // --- the drawing guides for Alva's and Mira's pencils (screen pixels) ------------------------------------------------
    function toScreen(x, y) { return { x: world.position.x + x * cam.zoom, y: world.position.y + y * cam.zoom }; }
    function drawGuide(kind) {
        const W = app.screen.width, H = app.screen.height;
        if (kind === 'fin' && S?.rocket) {
            // the crooked fin, as Mira drew it (ROCKET.finL in the rocket's own units), over the rocket and big enough for
            // a child's finger (at play zoom the real fin is only a few dozen pixels)
            const fin = [[-52, -60], [-50, -128], [-74, -96], [-110, -40], [-112, -6], [-96, 0], [-70, -30], [-52, -60]];
            const g0 = S.rocket.view.toGlobal({ x: -80, y: -64 });
            const k = clamp(Math.min(W, H) * 0.34, 130, 300) / 128;
            const cx = clamp(g0.x, 62 * k + 16, W - 62 * k - 16), cy = clamp(g0.y, 70 * k + 90, H - 70 * k - 90);
            const pts = fin.map(([x, y]) => [cx + (x + 80) * k, cy + (y + 64) * k]);
            return { anchors: pts, guide: pts };
        }
        if (kind === 'star') {
            const l = G.scenes.sudd.lights[0];
            const c = toScreen(l.x, l.y);
            const R = Math.max(44, Math.min(W, H) * 0.13);
            const cx = clamp(c.x, R + 20, W - R - 20), cy = clamp(c.y, R + 120, H - R - 120);
            const pts = starPoints(R, 0.44, { seed: 20, crooked: 1 }).map(([x, y]) => [cx + x, cy + y]);
            return { anchors: [...pts, pts[0]], guide: [...pts, pts[0]] };
        }
        if (kind === 'constellation') {
            V.numbers = true;
            // the finished sky's layout, at once, so the dots to trace are exactly where the stars shine
            V.alvaFocusOn = true; V.alvaFocus = 1;
            const pos = sky.alvaScreen(W, H, 1);
            return { anchors: pos.map(q => [q.x, q.y]), numbers: true };
        }
        return null;
    }

    // --- events for little effects --------------------------------------------------------------------------------------
    const offs = [
        G.on('light', ({ id }) => { startPickup(id); emit('star', G.player.x, G.player.y - h(0.7), 9, { speed: 220, gravity: 0, life: 0.9, tint: 0xfff0b0 }); }),
        G.on('push', (e) => emit('dust', e.x, G.player.y, 5, { speed: 120, gravity: 200 })),
        G.on('streckDone', () => emit('star', G.player.x, G.player.y - h(0.4), 10, { speed: 180, gravity: 0, tint: 0xdfe8ff })),
        G.on('wagonStar', () => emit('star', G.player.x, G.player.y - h(0.2), 6, { speed: 160, gravity: 0, tint: 0xdfe8ff })),
        G.on('beltOne', ({ id }) => { const st = S?.beltStones?.[id]; if (st) emit('star', st.cx, st.cy - h(0.2), 8, { speed: 160, gravity: 0 }); }),
        G.on('beltWrong', () => { cam.shake = 3; }),
        G.on('iceMelts', () => emit('star', G.scenes.ring.ice.sunX, h(-0.6), 10, { speed: 140, gravity: 0, tint: 0xfff0b0 })),
        G.on('bridgeRubbed', () => { V.rub = { u: 0 }; animate(0.9, (u) => { if (V.rub) V.rub.u = u; }).then(() => { V.rub = null; }); }),
        G.on('fogLit', () => { const k = G.actors.klo; if (k) emit('star', k.x, k.y - h(0.4), 12, { speed: 200, gravity: 0, life: 1.4, tint: 0xfff0b0 }); }),
        G.on('selfStroke', () => { const p = G.player; emit('star', p.x, p.y - h(0.5), 4, { speed: 120, gravity: 0, life: 0.6, tint: 0xfff6d8 }); }),
        G.on('carryStart', ({ kind }) => { if (kind === 'sling' || kind === 'lane' || kind === 'orbit') emit('star', G.player.x, G.player.y, 8, { speed: 160, gravity: 0 }); }),
        G.on('kicked', () => { const p = G.player; emit('dust', p.x, p.y, 6, { speed: 160, gravity: 0, tint: 0xbfd0ff }); }),
        G.on('neigh', () => { if (S && S.id !== 'mane') S.silentT = 1.4; }),
        G.on('scene', () => { V.heroHidden = false; })
    ];

    return {
        world, cam,
        get sceneId() { return S?.id || null; },
        setScene(id, { keepCam = false } = {}) { buildScene(id); if (!keepCam) cam.snap = true; },
        setFlameTexture(tex) { flameTexture = tex; if (S?.rocket) S.rocket.setFlame(tex); },
        render, fx, emit, drawGuide, toScreen,
        get lightsArriving() { return pickups.length; },
        get lightsLanded() { return lightsLanded; },
        fadeNow(v) { fade = fadeTarget = v; },
        heroScreen() { const pv = hero.view; return { x: world.position.x + pv.x * cam.zoom, y: world.position.y + pv.y * cam.zoom, scale: cam.zoom, facing: G.player.facing }; },
        speakerBounds(who) {
            if (!S) return null;
            if (who === 'horse') return hero.view.visible ? hero.view.getBounds() : null;
            if (who === 'klo') return S.A.klo.container.visible ? S.A.klo.headBounds() : null;
            if (who === 'nova') return S.A.nova.view.visible ? S.A.nova.view.getBounds() : null;
            if (who === 'sudd') return S.A.sudd.view.visible ? S.A.sudd.view.getBounds() : null;
            if (who === 'komet') { const v = S.komet?.view || S.rideKomet?.view || S.arrivedKomet?.view; return v?.visible ? v.getBounds() : null; }
            if (who === 'bjorn' && S.bear) return S.bear.view.getBounds();
            if (who === 'pip') { const v = S.pip?.view || S.ridePip?.view || S.callPip?.view; return v?.visible ? v.getBounds() : null; }
            return null;
        },
        /** For the harness and checks. */
        get debug() { return { S, V, sky, cam }; },
        resize() { if (tooth) { tooth.width = app.screen.width; tooth.height = app.screen.height; } },
        destroy() {
            destroyed = true;
            for (const off of offs) off();
            for (const w of waiters) w.resolve();
            waiters.clear();
            for (const a of anims) a.resolve();
            anims.length = 0;
            clearScene();
            hero?.destroy?.(); hero = null;
            for (const t of Object.values(TX)) t.destroy?.(true);
            atmo.destroy();
            sky.destroy();
            root.destroy({ children: true });
        }
    };
}
