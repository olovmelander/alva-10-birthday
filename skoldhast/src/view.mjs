/*
 * Sköldhästen – the renderer (PixiJS v8, WebGL).
 *
 * Draws the current scene from the world data: ground polygons filled with the
 * pencil materials and outlined with pencil-line ropes, water with reflections
 * that show "the page as it should be", props, puzzle objects, actors, the hero,
 * particles, hint marks, white-paper covers for unreleased places, and a
 * screen-fixed paper tooth over everything (multiply) so it all sits on one sheet.
 *
 * The view never changes game state; it reads G every frame.
 */
import { HL, cond, heightOn, lineLength, pointAt } from './sim.mjs';
import { createPage, createScreenTurn } from './pageturn.mjs';
import { terrainShape } from './terrain-shape.mjs';
import { createKlo } from './klo.mjs';
import { createGuardian } from './guardian.mjs';
import { createWaterLight, createAtmosphere } from './scenery.mjs';
import { pencilAvailable } from './puzzles.mjs';
import { createRouteCue, createPencilBeam } from './route-cue.mjs';
import { createActionCue } from './action-cue.mjs';
import { createFoldDemo } from './fold-demo.mjs';
import { createMapAssemble } from './map-assemble.mjs';
import { STORY } from './content/sv.mjs';

const h = (v) => v * HL;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

// placeholder colours (used only while art is missing)
const MAT_COLOR = {
    sand: 0xe8cc8e, wetsand: 0xc8a672, grass: 0xb9c4a0, earth: 0xc49a6c, rock: 0xb0a89a, wood: 0xb08a5a,
    seabed: 0xbfb08a, cream: 0xf2e7cc, paper: 0xfbf8f1
};
const MAT_IMAGE = {
    sand: 'mat-sand', wetsand: 'mat-wetsand', grass: 'mat-grass', earth: 'mat-earth', rock: 'mat-rock', wood: 'mat-wood',
    seabed: 'mat-seabed', cream: 'mat-cream', paper: 'mat-paper'
};

export function createView(PIXI, app, { assets, G, heroFactory, onFx }) {
    const T = (name) => assets.tex(name);
    let destroyed = false;
    const pendingFrames = new Set();
    const comparisonObservers = new Set();
    let foldDemo = null;
    let mapAssembly = null;
    function nextFrame(callback) {
        if (destroyed) return;
        const id = requestAnimationFrame((time) => {
            pendingFrames.delete(id);
            if (!destroyed) callback(time);
        });
        pendingFrames.add(id);
    }
    const root = new PIXI.Container();
    app.stage.addChild(root);

    // --- layers ---------------------------------------------------------------------
    const bgLayer = new PIXI.Container();       // screen space backdrops
    const skyLayer = new PIXI.Container();      // parallax sky props (sun, clouds, gulls)
    const world = new PIXI.Container();         // camera transform
    const overlay = new PIXI.Container();       // screen space: tooth, darkness, fades
    const turnLayer = new PIXI.Container();     // screen space: pages turning away (scene changes, the unfold)
    root.addChild(bgLayer, skyLayer, world, overlay, turnLayer);
    const L = {};
    for (const name of ['far', 'terrainBack', 'mid', 'objects', 'actors', 'hero', 'waterFront', 'fore', 'fx', 'cover', 'hints']) {
        L[name] = new PIXI.Container();
        world.addChild(L[name]);
    }

    // screen-fixed paper tooth (multiply), so everything sits on one sheet
    let tooth = null;
    function makeTooth() {
        const t = T('paper-tooth');
        if (!t || tooth) return;
        tooth = new PIXI.TilingSprite({ texture: t, width: app.screen.width, height: app.screen.height });
        tooth.blendMode = 'multiply';
        tooth.alpha = 0.55;
        overlay.addChildAt(tooth, 0);
    }
    const fade = new PIXI.Graphics();
    overlay.addChild(fade);
    let fadeAlpha = 0, fadeColor = 0xfbf8f1;

    // --- camera -----------------------------------------------------------------------
    const cam = { x: 0, y: 0, zoom: 0.7, shake: 0, snap: true };

    // --- helpers --------------------------------------------------------------------
    function spr(name, fallback) {
        const t = T(name);
        if (t) {
            const s = new PIXI.Sprite(t);
            if (t.defaultAnchor) s.anchor.set(t.defaultAnchor.x, t.defaultAnchor.y);
            else s.anchor.set(0.5, 1);
            return s;
        }
        const g = new PIXI.Graphics();
        (fallback || drawPlaceholder)(g, name);
        g._placeholder = name;
        return g;
    }
    function drawPlaceholder(g, name) {
        const w = 60, hh = 60;
        g.rect(-w / 2, -hh, w, hh).fill({ color: 0xd8cfc0, alpha: 0.6 }).stroke({ width: 3, color: 0x6b635a, alpha: 0.7 });
        void name;
    }
    function setTex(s, name) {
        const t = T(name);
        if (t && s instanceof PIXI.Sprite) { if (s.texture !== t) s.texture = t; }
    }
    function rope(texName, pts, { color = 0x3b3530, width = 5, alpha = 1, scale = 0 } = {}) {
        const t = T(texName);
        const P = pts.map(([x, y]) => new PIXI.Point(x, y));
        if (t) {
            const r = new PIXI.MeshRope({ texture: t, points: P, textureScale: scale });
            r.alpha = alpha;
            r._pts = P;
            return r;
        }
        const g = new PIXI.Graphics();
        g._pts = P; g._style = { color, width, alpha };
        g._redraw = () => { g.clear(); g.moveTo(P[0].x, P[0].y); for (let i = 1; i < P.length; i++) g.lineTo(P[i].x, P[i].y); g.stroke({ width, color, alpha, cap: 'round', join: 'round' }); };
        g._redraw();
        return g;
    }
    function refreshRope(r) { if (r._redraw) r._redraw(); }
    /** A vertical texture (e.g. a kelp frond) bent along a spine of n+1 points, top first. */
    function strip(texName, n, width) {
        const t = T(texName);
        if (!t) return null;
        const positions = new Float32Array((n + 1) * 4);
        const uvs = new Float32Array((n + 1) * 4);
        const indices = new Uint32Array(n * 6);
        for (let i = 0; i <= n; i++) {
            const v = i / n;
            uvs.set([0, v, 1, v], i * 4);
            if (i < n) indices.set([i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2], i * 6);
        }
        const geometry = new PIXI.MeshGeometry({ positions, uvs, indices });
        const mesh = new PIXI.Mesh({ geometry, texture: t });
        mesh._strip = { n, width, positions };
        return mesh;
    }
    function updateStrip(mesh, pts) {
        const { n, width, positions } = mesh._strip;
        for (let i = 0; i <= n; i++) {
            const [x, y] = pts[i];
            const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
            let tx = b[0] - a[0], ty = b[1] - a[1];
            const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
            const nx = -ty * width / 2, ny = tx * width / 2;
            positions[i * 4] = x + nx; positions[i * 4 + 1] = y + ny; positions[i * 4 + 2] = x - nx; positions[i * 4 + 3] = y - ny;
        }
        mesh.geometry.getBuffer('aPosition').update();
    }
    function resamplePts(pts, step = 60) {
        const out = [];
        for (let i = 1; i < pts.length; i++) {
            const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
            const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
            for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
        }
        out.push(pts[pts.length - 1]);
        return out;
    }
    function fillPoly(g, pts, mat, alpha = 1) {
        const t = T(MAT_IMAGE[mat] || mat);
        const flat = pts.flat();
        if (t) g.poly(flat).fill({ texture: t, textureSpace: 'global', alpha });
        else g.poly(flat).fill({ color: MAT_COLOR[mat] ?? 0xcccccc, alpha });
    }

    // --- particles ----------------------------------------------------------------------
    const particles = [];
    const pool = [];
    function emit(kind, x, y, n = 6, o = {}) {
        if (G.lessMotion) n = Math.ceil(n / 3);
        for (let i = 0; i < n; i++) {
            let s = pool.pop();
            const name = { drop: 'p-drop', foam: 'p-foam', sand: 'p-sand', bubble: 'p-bubble', fluff: 'p-fluff', glow: 'p-glow', star: 'p-star', note: 'p-note', dust: 'p-dust', ink: 'p-dust' }[kind] || 'p-dust';
            const t = T(name);
            if (!s) { s = new PIXI.Sprite(t || PIXI.Texture.WHITE); s.anchor.set(0.5); }
            s.texture = t || PIXI.Texture.WHITE;
            if (!t) { s.width = s.height = kind === 'bubble' ? 10 : 7; s.tint = kind === 'sand' ? 0xc99a52 : kind === 'drop' ? 0x8fbfe0 : kind === 'star' ? 0xf6dc5a : 0xffffff; }
            else { s.scale.set((o.scale || 1) * (0.7 + Math.random() * 0.6)); s.tint = o.tint || 0xffffff; }
            s.alpha = 1; s.visible = true; s.rotation = Math.random() * 6.28;
            const a = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? 2.2);
            const sp = (o.speed ?? 300) * (0.5 + Math.random() * 0.7);
            const P = { s, x: x + (Math.random() - 0.5) * (o.jx || 20), y: y + (Math.random() - 0.5) * (o.jy || 10), vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0), g: o.g ?? 1400, life: (o.life ?? 0.8) * (0.7 + Math.random() * 0.6), t: 0, spin: (Math.random() - 0.5) * 6, drag: o.drag ?? 0.5, rise: o.rise || 0 };
            P.s.x = P.x; P.s.y = P.y;
            L.fx.addChild(s);
            particles.push(P);
        }
    }
    function stepParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const P = particles[i];
            P.t += dt;
            if (P.t >= P.life) { P.s.visible = false; L.fx.removeChild(P.s); pool.push(P.s); particles.splice(i, 1); continue; }
            P.vy += (P.g - P.rise) * dt; P.vx *= Math.exp(-P.drag * dt); P.vy *= Math.exp(-P.drag * dt);
            P.x += P.vx * dt; P.y += P.vy * dt;
            P.s.x = P.x; P.s.y = P.y; P.s.rotation += P.spin * dt;
            P.s.alpha = 1 - Math.pow(P.t / P.life, 2);
        }
    }

    // --- the hero -------------------------------------------------------------------------
    let hero = heroFactory();
    L.hero.addChild(hero.view);
    const minis = [];

    // full gallop: a few quick pencil strokes stream back from the sköldhäst (the "now you draw" cue)
    // (in a layer of their own: clearScene empties the scene layers, and these outlive every scene)
    const speedLayer = new PIXI.Container();
    world.addChildAt(speedLayer, world.getChildIndex(L.fx));
    const speedLines = [];
    for (let i = 0; i < 9; i++) {
        const g = new PIXI.Graphics();
        const len = 70 + (i % 3) * 38;
        g.moveTo(0, 0).lineTo(-len, 1.5).stroke({ width: 3 + (i % 2), color: 0x3b3530, alpha: 1, cap: 'round' });
        g.visible = false;
        speedLayer.addChild(g);
        speedLines.push({ g, t: 1, x: 0, y: 0, dir: 1, life: 0.3 });
    }
    let speedAcc = 0;
    function stepSpeedLines(dt, snap) {
        const p = G.player;
        const full = (p.mode === 'ground' || p.mode === 'streck' || p.mode === 'leap') && Math.abs(p.vx) >= 1000 && !G.lessMotion && !G.hideHero;
        if (full) {
            speedAcc += dt * 26;
            while (speedAcc >= 1) {
                speedAcc -= 1;
                const sl = speedLines.find((q) => q.t >= 1);
                if (!sl) break;
                const dir = Math.sign(p.vx) || 1;
                sl.dir = dir; sl.t = 0; sl.life = 0.22 + Math.random() * 0.12;
                sl.x = snap.x - dir * h(0.55 + Math.random() * 0.35);
                sl.y = snap.y - h(0.15 + Math.random() * 0.75);
            }
        } else speedAcc = 0;
        for (const sl of speedLines) {
            if (sl.t >= 1) { sl.g.visible = false; continue; }
            sl.t += dt / sl.life;
            sl.g.visible = sl.t < 1;
            sl.g.x = sl.x - sl.dir * sl.t * h(0.5); sl.g.y = sl.y;
            sl.g.scale.x = sl.dir;
            sl.g.alpha = 0.45 * Math.sin(Math.min(1, sl.t) * Math.PI);
        }
    }

    // --- scene building ---------------------------------------------------------------------
    let S = null; // current scene display

    function buildScene(def) {
        const d = { def, items: [], dyn: [], ropes: [], waters: [], sky: [], bg: [], paper: [], dashed: [], kelp: [], disposers: [] };
        d.atmosphere = createAtmosphere(PIXI, { scene: def.id });
        L.far.addChild(d.atmosphere.view);
        // backdrops
        for (const b of def.backdrop || []) {
            const t = T(b.image);
            const s = t ? new PIXI.Sprite(t) : new PIXI.Graphics().rect(0, 0, 64, 64).fill({ color: def.underwater ? 0x6fa6a8 : 0xd9ebf5 });
            s._bg = b; s._img = b.image;
            bgLayer.addChild(s);
            d.bg.push(s);
        }
        // One exposed contour from the active collision surfaces. Ramps replace
        // buried terrace tops; they never paint a grass column over the earth.
        const ground = new PIXI.Graphics();
        const groundTop = new PIXI.Graphics();
        const groundLines = new PIXI.Container();
        const bottom = def.bounds.y1 + h(4);
        for (const s of def.surfaces) {
            const pts = s.pts;
            if (s.thin) {
                const th = s.pier || s.jetty ? 34 : s.bridge ? 30 : 26;
                const poly = [...pts, ...pts.slice().reverse().map(([x, y]) => [x, y + th])];
                d.dyn.push({ kind: 'thin', s, poly, when: s.when });
                continue;
            }
        }
        L.terrainBack.addChild(ground, groundTop, groundLines);
        d.ground = ground; d.groundTop = groundTop;
        d.rebuildGround = () => {
            ground.clear(); groundTop.clear();
            for (const child of groundLines.removeChildren()) child.destroy({ children: true });
            const active = G.terrain?.scene === def ? G.terrain.surfaces : def.surfaces.filter(s => cond(s.when, G.flags));
            const shape = terrainShape(active);
            for (const { s, pts } of shape.runs) {
                const x0 = pts[0][0], x1 = pts.at(-1)[0];
                const baseMat = s.edgeMat || (s.ramp ? 'earth' : s.mat);
                fillPoly(ground, [...pts, [x1, bottom], [x0, bottom]], baseMat);
                if (baseMat !== s.mat) {
                    fillPoly(groundTop, [...pts, ...pts.slice().reverse().map(([x,y]) => [x,y+46])], s.mat);
                }
            }
            for (const pts of shape.outlines) groundLines.addChild(rope('stroke-graphite', resamplePts(pts, 50), { width: 5 }));
            d.groundRevision = G.terrain.revision;
            d.groundTerrain = G.terrain;
        };
        d.rebuildGround();
        // thin surfaces (planks, bridges): drawn dynamically because some appear with flags
        for (const it of d.dyn) {
            if (it.kind === 'thin' || it.kind === 'ramp') {
                it.g = new PIXI.Graphics();
                const mat = it.kind === 'ramp' ? 'grass' : (it.s.mat || 'wood');
                fillPoly(it.g, it.poly, mat === 'rock' ? 'rock' : mat);
                if (it.s.planks) {
                    const pts = it.s.pts;
                    for (let x = pts[0][0] + 40; x < pts[pts.length - 1][0]; x += 64) {
                        const y = heightOn(pts, x);
                        it.g.moveTo(x, y + 2).lineTo(x + 1, y + 32);
                    }
                    it.g.stroke({ width: 2, color: 0x6b4a2c, alpha: 0.45 });
                }
                it.r = rope('stroke-graphite', resamplePts(it.s.pts, 50), { width: 5 });
                it.c = new PIXI.Container();
                it.c.addChild(it.g, it.r);
                (it.kind === 'ramp' ? L.terrainBack : L.mid).addChild(it.c);
                if (it.s.prop) { const ps = spr(it.s.prop); ps.x = (it.s.pts[0][0] + it.s.pts[it.s.pts.length - 1][0]) / 2; ps.y = heightOn(it.s.pts, ps.x) + 34; it.c.addChild(ps); it.g.visible = false; it.r.visible = false; }
            }
        }
        // water
        for (const w of def.waters || []) {
            if (w.kind === 'pipe') continue;
            const wb = { w, g: new PIXI.Graphics(), surf: null, refl: null };
            const yb = w.bottom ?? bottom;
            // A translucent pencil veil should tint the creature, not erase its
            // legs under repeating white water hatching.
            const alpha = def.underwater ? 0.12 : w.kind === 'pool' ? 0.36 : 0.26;
            fillPoly(wb.g, [[w.x0, w.top], [w.x1, w.top], [w.x1, yb], [w.x0, yb]], def.underwater ? 'mat-deep' : 'mat-water', alpha);
            if (!T('mat-water')) { wb.g.clear(); wb.g.rect(w.x0, w.top, w.x1 - w.x0, yb - w.top).fill({ color: 0x5b9bd0, alpha: alpha * 0.8 }); }
            L.waterFront.addChild(wb.g);
            const pts = [];
            for (let x = w.x0; x <= w.x1 + 1; x += 50) pts.push([Math.min(x, w.x1), w.top]);
            wb.surfBase = pts.map((p) => p.slice());
            wb.surf = rope('stroke-blue', pts, { color: 0x244f8f, width: 4 });
            L.waterFront.addChild(wb.surf);
            if (w.mirror) wb.refl = buildReflection(def, w);
            d.waters.push(wb);
            wb.light = createWaterLight(PIXI, w, { underwater: def.underwater });
            L.waterFront.addChild(wb.light.view);
        }
        if (def.underwater) {
            // the air above the surface in an underwater scene
            const sky = new PIXI.Graphics();
            sky.rect(def.bounds.x0 - h(20), def.bounds.y0 - h(10), def.bounds.x1 - def.bounds.x0 + h(40), -def.bounds.y0 + h(10)).fill({ color: 0xd6e8f2 });
            L.far.addChild(sky);
            d.skyBand = sky;
        }
        // decor
        for (const it of def.decor || []) {
            if (it.gulls) {
                for (let i = 0; i < it.gulls; i++) {
                    const g = spr('gull-m-' + (1 + (i % 4)), (gg) => { gg.moveTo(-20, 0).quadraticCurveTo(-10, -12, 0, 0).quadraticCurveTo(10, -12, 20, 0).stroke({ width: 3, color: 0x4d6e8c }); });
                    g.anchor?.set?.(0.5);
                    const item = { kind: 'gull', s: g, x: it.x + i * h(0.55) - h(0.5), y: it.y + (i % 2) * h(0.35) - i * h(0.12), par: it.par ?? 0.25, phase: i * 1.7 + Math.random(), her: !!it.her };
                    skyLayer.addChild(g);
                    d.sky.push(item);
                }
                continue;
            }
            if (it.kelp) {
                for (let i = 0; i < it.kelp; i++) {
                    const x = lerp(it.x0, it.x1, (i + 0.5) / it.kelp) + (Math.random() - 0.5) * h(0.8);
                    const fy = floorAt(def, x);
                    if (fy === null) continue;
                    const H = h(2.2 + Math.random() * 2.6);
                    const n = 10;
                    const pts = []; for (let k = 0; k <= n; k++) pts.push([x, fy - H * (1 - k / n)]); // top first
                    const r = strip('kelp-strip', n, 58 + Math.random() * 30) || rope('kelp-strip', pts, { color: 0x3e7a34, width: 22 });
                    const fore = it.layer === 'fore';
                    if (fore) r.alpha = 0.6; // the sköldhäst stays visible through the front fronds
                    (fore ? L.fore : L.mid).addChild(r);
                    d.kelp.push({ r, pts, x, fy, H, n, fore, phase: Math.random() * 6, chapter: it.chapter });
                }
                continue;
            }
            const s = spr(it.sprite);
            if (it.scale) s.scale.set(it.scale);
            if (it.flip) s.scale.x = -Math.abs(s.scale.x);
            if (it.layer === 'sky') {
                skyLayer.addChild(s);
                d.sky.push({ kind: 'sky', s, x: it.x, y: it.y, par: it.par ?? 0.15, anim: it.anim, it });
                continue;
            }
            s.x = it.x; s.y = it.y;
            (it.layer === 'fore' ? L.fore : it.layer === 'far' ? L.far : L.mid).addChild(s);
            d.items.push({ s, it });
        }
        // her own cloud from the prologue drifts over Stranden (plan §3.4)
        if (def.id === 'land' && G.userCloud) {
            const s = new PIXI.Sprite(G.userCloud);
            s.anchor.set(0.5); s._baseScale = 1.5; s.alpha = 0.9;
            skyLayer.addChild(s);
            d.sky.push({ kind: 'sky', s, x: def.spots.start.x - h(1.5), y: def.spots.start.y - h(5.2), par: 0.18, anim: 'cloud', it: { user: true } });
        }
        // hoofprints (old ones in the kelp sand)
        for (const [x, y] of def.hoofprints || []) {
            const s = spr('hoofprint'); s.x = x; s.y = y + 4; s.alpha = 0.7; s.anchor?.set?.(0.5, 0.5);
            L.mid.addChild(s);
        }
        // dashed lines (inked by galloping)
        for (const ds of def.dashed || []) {
            const pts = resamplePts(ds.pts, 30);
            const c = new PIXI.Container();
            const glow = rope('stroke-glow', pts, { color: 0xffd27a, width: 16, alpha: 0.7 });
            if (!ds.glow) glow.alpha = 0;
            const dash = rope('stroke-dash', pts, { color: 0x3b3530, width: 5, scale: 1 });
            // MeshRope keeps its initial point capacity. Allocate the entire line;
            // unfinished points collapse onto the moving pencil tip while drawing.
            const ink = rope('stroke-graphite', pts, { width: 6 });
            ink.visible = false;
            const distances = [0];
            for (let i = 1; i < pts.length; i++) distances.push(distances[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
            if (glow) c.addChild(glow);
            c.addChild(dash, ink);
            (ds.decal ? L.mid : L.objects).addChild(c);
            const route = ds.glow ? createRouteCue(PIXI, pts, { label: ds.id }) : null;
            if (route) L.hints.addChild(route.container);
            d.dashed.push({ ds, c, glow, dash, ink, route, pts, distances, len: distances.at(-1), x0: Math.min(ds.pts[0][0], ds.pts[ds.pts.length - 1][0]), x1: Math.max(ds.pts[0][0], ds.pts[ds.pts.length - 1][0]), y: ds.pts[0][1] });
        }
        // lanes: motes that show the flow; dashed lanes as blue dashes
        d.lanes = [];
        for (const ln of def.lanes || []) {
            const pts = resamplePts(ln.pts, 40);
            const item = { ln, pts, len: lineLength(pts), motes: [], line: null, band: null };
            if (ln.dashed) { item.line = rope('stroke-dashblue', pts, { color: 0x244f8f, width: 5, scale: 1 }); L.objects.addChild(item.line); }
            else {
                // the current as a pale band, so you can see where it runs (and where to hide in it)
                const band = new PIXI.Graphics();
                const path = () => { band.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) band.lineTo(pts[i][0], pts[i][1]); };
                path(); band.stroke({ width: ln.width * 0.6, color: 0xe4f6ff, alpha: 0.26, cap: 'round', join: 'round' });
                path(); band.stroke({ width: ln.width * 0.24, color: 0xf7fcff, alpha: 0.26, cap: 'round', join: 'round' });
                L.mid.addChild(band);
                item.band = band;
            }
            if (ln.dashed) {
                item.route = createRouteCue(PIXI, pts, { water: true, label: ln.id });
                L.hints.addChild(item.route.container);
            }
            const n = Math.ceil(item.len / (ln.dashed ? 140 : 75));
            for (let i = 0; i < n; i++) {
                const streak = !ln.dashed && i % 2 === 1;
                let m;
                if (streak) {
                    // a short stroke that flows along the current
                    m = new PIXI.Graphics();
                    m.moveTo(-26, 0).lineTo(26, 0).stroke({ width: 5, color: 0xf2fbff, alpha: 0.9, cap: 'round' });
                } else {
                    m = spr(ln.dashed ? 'p-glow' : 'p-bubble');
                    m.anchor?.set?.(0.5); m.scale.set(ln.dashed ? 0.4 : 0.9);
                }
                m.alpha = 0.6;
                L.objects.addChild(m);
                item.motes.push({ m, s: Math.random() * item.len, off: (Math.random() - 0.5) * (ln.width * 0.6), streak });
            }
            d.lanes.push(item);
        }
        // the whirl
        d.vortex = [];
        for (const v of def.vortices || []) {
            const motes = [];
            for (let i = 0; i < 26; i++) {
                const m = spr(i % 3 ? 'p-bubble' : 'p-fluff'); m.anchor?.set?.(0.5); m.alpha = 0.7;
                L.objects.addChild(m);
                motes.push({ m, a: Math.random() * 6.28, r: v.r * (0.4 + Math.random() * 0.8) });
            }
            d.vortex.push({ v, motes });
        }
        // paper covers (unreleased places)
        for (const pc of def.paper || []) {
            const g = new PIXI.Graphics();
            const y0 = def.bounds.y0 - h(20), y1 = def.bounds.y1 + h(20);
            fillPoly(g, [[pc.x0, y0], [pc.x1, y0], [pc.x1, y1], [pc.x0, y1]], 'paper');
            if (!T('mat-paper')) { g.clear(); g.rect(pc.x0, y0, pc.x1 - pc.x0, y1 - y0).fill({ color: 0xfbf8f1 }); }
            const edgeX = pc.under ? pc.x0 : pc.x1;
            const edgePts = []; for (let y = y0; y <= y1; y += 80) edgePts.push([edgeX + Math.sin(y * 0.013) * 14 + Math.sin(y * 0.041) * 6, y]);
            const edge = rope('stroke-graphite', edgePts, { width: 4, alpha: 0.7 });
            const c = new PIXI.Container(); c.addChild(g, edge);
            L.cover.addChild(c);
            // covered → (the chapter is out) waiting → turning (peels away like a page) → gone
            const state = !G.flags.has(pc.until) ? 'covered' : G.flags.has('peeled_' + pc.id) ? 'gone' : 'waiting';
            if (state === 'gone') c.visible = false;
            d.paper.push({ pc, c, state, wait: 0 });
        }
        // darkness (Mörka valvet)
        d.dark = [];
        for (const dk of def.darkness || []) {
            const g = new PIXI.Graphics();
            g.alpha = G.flags.has(dk.until) ? 0 : 1;
            g.rect(dk.x0, dk.y0, dk.x1 - dk.x0, dk.y1 - dk.y0).fill({ color: 0x0e1f2a, alpha: 0.86 });
            L.fore.addChild(g);
            d.dark.push({ dk, g });
        }
        buildSceneObjects(def, d);
        return d;
    }

    function floorAt(def, x) {
        let best = null;
        for (const s of def.surfaces) {
            if (s.thin) continue;
            const y = heightOn(s.pts, x);
            if (y !== null && (best === null || y < best)) best = y;
        }
        return best;
    }

    // --- scene-specific objects -------------------------------------------------------------
    function buildSceneObjects(def, d) {
        const O = d.obj = {};
        if (def.id === 'land') {
            // P2 stone on its rail
            O.rail = spr('rail-groove'); O.rail.x = def.rail.x0 + def.rail.step * def.rail.notches / 2; O.rail.y = def.rail.y + 8; O.rail.anchor?.set?.(0.5, 0.5); L.mid.addChild(O.rail);
            O.stone = spr('rail-stone'); O.stone.y = def.rail.y; L.objects.addChild(O.stone);
            // the notches in the sand, and (after the reflection) a ghost of the stone where it belongs
            O.railMarks = new PIXI.Graphics();
            for (let i = 0; i <= def.rail.notches; i++) { const x = def.rail.x0 + i * def.rail.step; O.railMarks.moveTo(x, def.rail.y + 2).lineTo(x + 2, def.rail.y + 16); }
            O.railMarks.stroke({ width: 3, color: 0x3b3530, alpha: 0.45, cap: 'round' });
            L.mid.addChild(O.railMarks);
            O.ghostStone = spr('rail-stone'); O.ghostStone.x = def.rail.x0 + def.rail.target * def.rail.step; O.ghostStone.y = def.rail.y; O.ghostStone.alpha = 0; O.ghostStone.tint = 0xfff2d8;
            L.mid.addChild(O.ghostStone);
            O.pushArrow = new PIXI.Graphics();
            O.pushArrow.moveTo(-30, 0).lineTo(22, 0).stroke({ width: 7, color: 0xe0782a, cap: 'round' });
            O.pushArrow.moveTo(8, -15).lineTo(26, 0).lineTo(8, 15).stroke({ width: 7, color: 0xe0782a, cap: 'round', join: 'round' });
            O.pushArrow.alpha = 0; L.hints.addChild(O.pushArrow);
            // where each backsippa's fluff will fly: a few seeds drifting along the arc to its dotted tuft
            O.fluffPaths = [];
            for (const c of def.clumps || []) {
                const tx = c.x - h(5);
                const t = (def.tussocks || []).filter((q) => Math.abs(q.x - tx) < h(1.5)).sort((a, b) => Math.abs(a.x - tx) - Math.abs(b.x - tx))[0];
                if (!t) continue;
                const at = (u) => [lerp(c.x, t.x, u), lerp(c.y - h(0.5), t.y - h(0.15), u) - Math.sin(u * Math.PI) * h(1.1)];
                // a faint dotted trail (dots, not dashes: dashes mean a line to draw) and seeds drifting along it
                const trail = new PIXI.Graphics();
                for (let u = 0.04; u < 0.97; u += 0.045) { const [x, y] = at(u); trail.circle(x, y, 5).fill({ color: 0x7d6aa8, alpha: 0.55 }); }
                trail.alpha = 0; L.mid.addChild(trail);
                const motes = [];
                for (let i = 0; i < 7; i++) { const m = spr('p-fluff'); m.anchor?.set?.(0.5); m.alpha = 0; m.scale.set(1.6); m.tint = 0xb7a3e0; L.fx.addChild(m); motes.push({ m, u: i / 7 }); }
                O.fluffPaths.push({ c, t, at, trail, motes, vis: 0 });
            }
            // backsippa clumps and tussocks
            O.clumps = (def.clumps || []).map((c) => { const s = spr('backsippa'); s.x = c.x; s.y = c.y; L.mid.addChild(s); const b = spr('backsippa-bare'); b.x = c.x; b.y = c.y; b.visible = false; L.mid.addChild(b); return { c, s, b }; });
            O.tussocks = (def.tussocks || []).map((t) => { const s = spr('tussock-dotted'); s.x = t.x; s.y = t.y; L.objects.addChild(s); return { t, s }; });
            O.pinwheels = (def.pinwheels || []).map((pw) => { const s = spr('pinwheel'); s.x = pw.x; s.y = pw.y; L.mid.addChild(s); const hd = spr('pinwheel-head'); hd.anchor?.set?.(0.5); hd.x = pw.x; hd.y = pw.y - 110; L.mid.addChild(hd); return { pw, s, hd, a: 0 }; });
            O.shells = (def.shells || []).map((sh, i) => { const s = spr('shell-' + (1 + (i % 6))); s.x = sh.x; s.y = heightOn(def.surfaces.find((q) => q.id === 'beach').pts, sh.x) ?? -80; L.mid.addChild(s); return { sh, s, glow: 0 }; });
            O.flagpole = spr('flagpole'); O.flagpole.x = def.spots.flagpole.x; O.flagpole.y = def.spots.flagpole.y; L.mid.addChild(O.flagpole);
            O.flag = spr('flag'); O.flag.x = def.spots.flagpole.x + 4; L.mid.addChild(O.flag);
            O.gate = spr('gate-closed'); O.gate.x = h(115.2); O.gate.y = h(-0.16); L.objects.addChild(O.gate);
            O.glimpse = heroFactory({ mini: true });
            O.glimpse.view.scale.set(0.34);
            O.glimpseRidge = new PIXI.Container();
            // Bury the outer ends beneath the foreground: otherwise a narrow
            // portrait camera exposes a vertical edge where the fill closes.
            const ridge = [[-1800, 1100], [-1050, 350], [-740, 180], [-390, 55], [-90, 0], [100, 0], [480, 90], [1030, 320], [1800, 1100]];
            const ridgeFill = new PIXI.Graphics();
            fillPoly(ridgeFill, [...ridge, [1800, 1600], [-1800, 1600]], 'grass', .27);
            O.glimpseRidge.addChild(ridgeFill, rope('stroke-graphite', resamplePts(ridge, 45), { alpha: .2 }));
            L.far.addChild(O.glimpseRidge);
            L.far.addChild(O.glimpse.view);
            O.landmark = spr('mark-land'); O.landmark.x = def.spots.landmark.x; O.landmark.y = def.spots.landmark.y - h(0.4); O.landmark.anchor?.set?.(0.5); L.objects.addChild(O.landmark);
            O.ropeDown = spr('rope-plank-down'); O.ropeDown.x = h(7.95); O.ropeDown.y = h(-4.0) + 10; O.ropeDown.anchor?.set?.(0, 0.5); L.mid.addChild(O.ropeDown);
        }
        if (def.id === 'kelp') {
            O.flaps = (def.flaps || []).map((f) => { const s = spr('paper-flap'); s.x = f.x; s.y = f.y; L.mid.addChild(s); return { f, s }; });
            O.corners = (def.corners || []).map((c) => { const s = spr('paper-corner'); s.x = c.x; s.y = c.y + h(0.25); L.objects.addChild(s); const m = spr('mark-sea'); m.anchor?.set?.(0.5); m.x = c.x; m.y = c.y - h(0.2); m.visible = false; L.objects.addChild(m); return { c, s, m }; });
            O.school = [];
            if (def.school) for (let i = 0; i < def.school.count; i++) { const s = spr('lyktfisk-' + (1 + (i % 2))); s.anchor?.set?.(0.5); L.actors.addChild(s); const g = spr('p-glow'); g.anchor?.set?.(0.5); g.alpha = 0.6; g.scale.set(1.4); L.fx.addChild(g); O.school.push({ s, g, a: i * 0.9, r: 40 + i * 9 }); }
            O.shy = (def.shy || []).map((c) => { const s = spr(c.kind + '-1'); s.anchor?.set?.(0.5, 1); s.x = c.x; s.y = c.y; L.actors.addChild(s); return { c, s }; });
            O.glimpse = heroFactory({ mini: true }); O.glimpse.view.scale.set(0.3); L.far.addChild(O.glimpse.view); O.glimpse.view.visible = false;
        }
        if (def.id === 'viken') {
            O.shutters = def.shutters.map((sh) => { const s = spr('shutter-closed'); s.anchor?.set?.(0.5); s.x = sh.x; s.y = sh.y; L.objects.addChild(s); return { sh, s }; });
            O.lamp = spr('lamp-lit'); O.lamp.anchor?.set?.(0.5); O.lamp.x = def.lamp.x; O.lamp.y = def.lamp.y; O.lamp.alpha = G.flags.has('lamp_lit') ? 1 : 0; L.fx.addChild(O.lamp);
            O.beam = createPencilBeam(PIXI); O.beam.position.set(def.lamp.x, def.lamp.y); O.beam.alpha = G.flags.has('lamp_lit') ? .88 : 0; L.far.addChild(O.beam);
            O.windowMarks = new PIXI.Container(); O.windowMarks.label = 'p8-window-marks';
            for (const [i, name] of ['mark-land', 'mark-sea'].entries()) {
                const mark = spr(name); mark.anchor?.set?.(.5); mark.scale.set(.54);
                mark.position.set(def.spots.window.x + (i ? 36 : -36), def.spots.window.y - 84);
                O.windowMarks.addChild(mark);
            }
            O.windowMarks.visible = false; L.hints.addChild(O.windowMarks);
            O.chains = (def.chains || []).map((c) => { const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([lerp(c.from.x, c.to.x, t), lerp(c.from.y, c.to.y, t) + Math.sin(t * Math.PI) * 60]); } const r = rope('stroke-chain', pts, { color: 0x6b635a, width: 4, scale: 1 }); r.alpha = 0.5; L.mid.addChild(r); return { c, r }; });
            O.map = spr('map-closed'); O.map.visible = false; L.objects.addChild(O.map);
            O.ratchet = d.items.find((q) => q.it.ratchet)?.s;
            // progress rings: the pier drum (gallop steps) and the seabed plate (seconds resting on it)
            const ring = () => { const g = new PIXI.Graphics(); g._frac = -1; L.hints.addChild(g); return g; };
            if (O.ratchet && def.drums?.[0]) {
                const s = O.ratchet, ax = s.anchor?.x ?? 0.5, ay = s.anchor?.y ?? 0.5;
                O.drumRing = ring(); O.drumRing.x = s.x + (0.5 - ax) * s.width; O.drumRing.y = s.y + (0.5 - ay) * s.height;
                O.drumRing._r = Math.max(s.width, s.height) / 2 + 18; O.drumRing._drum = def.drums[0];
            }
            if (def.plates?.[0]) {
                const pl = def.plates[0];
                O.plateRing = ring(); O.plateRing.x = pl.x; O.plateRing.y = pl.y - 14; O.plateRing._rx = pl.w / 2 + 14; O.plateRing._ry = 26; O.plateRing._plate = pl;
                O.plateGlow = spr('p-glow'); O.plateGlow.anchor?.set?.(0.5); O.plateGlow.x = pl.x; O.plateGlow.y = pl.y - 16; O.plateGlow.alpha = 0; L.hints.addChild(O.plateGlow);
            }
        }
        // pencils and props to colour
        O.pencils = (def.pencils || []).map((pc) => {
            const s = spr('pencil-pickup'); s.anchor?.set?.(0.5); s.x = pc.x; s.y = pc.y - 20; L.objects.addChild(s);
            const g = spr(pc.prop + '-grey'); g.x = pc.propAt.x; g.y = pc.propAt.y; L.mid.addChild(g);
            return { pc, s, g };
        });
        // actors
        O.kloRig = createKlo(PIXI, { texture: T });
        O.klo = O.kloRig.container; L.actors.addChild(O.klo);
        O.kloSign = spr('sign-hast'); O.kloSign.visible = false; L.actors.addChild(O.kloSign);
        O.kvRig = createGuardian(PIXI, { texture: T });
        O.kv = O.kvRig.container; O.kv.label = 'guardian-kv'; O.kv.visible = false; L.actors.addChild(O.kv);
        O.figureRig = createGuardian(PIXI, { texture: T });
        O.figure = O.figureRig.container; O.figure.label = 'guardian-figure'; O.figure.visible = false; L.actors.addChild(O.figure);
        O.guardianOptions = { scene: def.id, hero: G.player, time: 0, dt: 0, reducedMotion: false, figure: false };
        O.signe = spr('turtle-signe'); O.signe.visible = false; L.actors.addChild(O.signe);
        // Sandpapperet: hoofprints on sand (walk prints fade, gallop prints stay as graphite)
        if (def.printMats) { O.prints = new PIXI.Container(); L.mid.addChild(O.prints); O.printSprites = []; }
        // the hint mark and Alva's own gull
        O.hint = spr('p-glow'); O.hint.anchor?.set?.(0.5); O.hint.visible = false; L.hints.addChild(O.hint);
        O.hintGull = null;
        O.actionCue = createActionCue(PIXI); L.hints.addChild(O.actionCue.container);
    }

    function buildReflection(def, w) {
        const c = new PIXI.Container();
        const mask = new PIXI.Graphics().rect(w.x0, w.top, w.x1 - w.x0, h(3)).fill({ color: 0xffffff });
        const inner = new PIXI.Container();
        c.addChild(inner, mask);
        c.mask = mask;
        inner.alpha = 0.55;
        if (def.id === 'land' && w.id === 'pool') {
            // the page as it should be: the arch open, the stone at its foot, the plank solid, a small fish
            const cliff = spr('cliff-open'); cliff.x = def.spots.arch.x - h(0.2); cliff.y = w.top + (w.top - def.spots.arch.y) + 20; cliff.scale.y = -1; inner.addChild(cliff);
            const st = spr('rail-stone'); st.x = def.rail.x0 + def.rail.step * def.rail.target; st.y = w.top + 30; st.scale.y = -1; inner.addChild(st);
            const pl = spr('plank-solid'); pl.anchor?.set?.(0.5); pl.x = h(104.5); pl.y = w.top + 50; pl.scale.y = -1; inner.addChild(pl);
            const fish = spr('fish-1'); fish.anchor?.set?.(0.5); fish.y = w.top + h(0.9); fish.scale.set(0.8, -0.8); inner.addChild(fish);
            c._fish = fish;
        }
        if (def.id === 'viken') {
            const k = def.lighthouseScale || 1;
            const lh = spr('lighthouse'); lh.x = def.spots.lighthouse.x; lh.y = w.top + (w.top - def.spots.lighthouse.y); lh.scale.set(k, -k); inner.addChild(lh);
            for (const sh of def.shutters) { const s = spr('shutter-open'); s.anchor?.set?.(0.5); s.x = sh.x; s.y = w.top + (w.top - sh.y); s.scale.y = -1; inner.addChild(s); }
            const lamp = spr('lamp-lit'); lamp.anchor?.set?.(0.5); lamp.x = def.lamp.x; lamp.y = w.top + (w.top - def.lamp.y); inner.addChild(lamp);
            c._lamp = lamp;
            const beam = createPencilBeam(PIXI); beam.position.set(lamp.x, lamp.y); beam.scale.y = -1;
            inner.addChildAt(beam, 0); c._beam = beam;
            mask.clear().rect(w.x0, w.top, w.x1 - w.x0, h(9)).fill({ color: 0xffffff });
        }
        c._inner = inner;
        L.waterFront.addChildAt(c, 0);
        return c;
    }

    function clearScene() {
        if (!S) return;
        endFoldDemo(false);
        endMapAssembly(false);
        dropPeels();
        for (const layer of Object.values(L)) {
            for (const ch of layer.removeChildren()) if (ch !== hero.view && !particles.some((p) => p.s === ch)) ch.destroy({ children: true });
        }
        for (const ch of bgLayer.removeChildren()) ch.destroy();
        for (const ch of skyLayer.removeChildren()) ch.destroy({ children: true });
        particles.length = 0; pool.length = 0;
        for (const m of minis) m.destroy?.();
        minis.length = 0;
        S = null;
    }

    function setScene(id, { keepCam = false, turn = null } = {}) {
        if (destroyed) return null;
        // the old picture becomes a page that turns away over the new one
        const rt = turn && S ? capture() : null;
        // A late atlas bundle can rebuild this same scene. Keep an already
        // awaited experiment alive; only leaving the scene abandons its story.
        const carryFold = id === S?.id ? foldDemo : null;
        const carryMap = id === S?.id ? mapAssembly : null;
        if (carryFold) { carryFold.effect.container.parent?.removeChild(carryFold.effect.container); foldDemo = null; }
        if (carryMap) mapAssembly = null;
        clearScene();
        for (const layer of Object.values(L)) layer.visible = true;
        S = buildScene(G.scenes[id]);
        S.id = id;
        S.placeholders = countPlaceholders();
        L.hero.addChild(hero.view);
        if (carryFold) { foldDemo = carryFold; L.fx.addChild(foldDemo.effect.container); }
        if (carryMap) mapAssembly = carryMap;
        cam.snap = !keepCam;
        makeTooth();
        if (rt) return startTurn(rt, { hinge: turn });
        return null;
    }

    /** A distant view across the water, made from the same tower and reflection as the playable bay. */
    function lighthouseVista() {
        const { def, obj: O } = S;
        const bay = S.waters.find(wb => wb.w.id === 'bay');
        const tower = S.items.find(({ it }) => it.lighthouse)?.s;
        if (!tower || !bay?.refl) return null;
        const c = new PIXI.Container();
        c.label = 'lighthouse-vista';
        L.far.addChild(c);
        // At this distance the little puzzle mechanisms and the underwater rock face
        // would obscure the reflection. The page keeps just the island and lighthouse.
        for (const [name, layer] of Object.entries(L)) layer.visible = name === 'far';
        const island = new PIXI.Graphics();
        const x = def.spots.lighthouse.x, y = bay.w.top;
        const shore = [[x - h(3.5), y + 8], [x - h(2.4), y - h(0.45)], [x + h(2.4), y - h(0.45)], [x + h(3.5), y + 8]];
        fillPoly(island, shore, 'rock');
        c.addChild(island, rope('stroke-graphite', shore, { width: 4 }), O.beam, tower, ...O.shutters.map(o => o.s), O.lamp, O.figure);
        const sea = new PIXI.Graphics();
        fillPoly(sea, [[x - h(100), y], [x + h(100), y], [x + h(100), y + h(100)], [x - h(100), y + h(100)]], 'mat-water', 0.2);
        c.addChild(bay.refl, sea, bay.light.view);
        // The lens is only a few pixels wide in the landscape postcard. Keep the
        // familiar pencil halo readable without filters or a separate distant asset.
        O.lamp.scale.set(1.7); bay.refl._lamp.scale.set(1.7);
        bay.refl.mask.height = h(10.4);
        O.lamp.alpha = G.flags.has('lamp_lit') ? 1 : 0;
        S.vista = { c, tower, lamp: O.lamp, reflection: bay.refl, phase: 'entering' };
        return { x0: x - h(6), x1: x + h(6), y0: y - h(10.4), y1: y + h(10.4) };
    }

    // --- pages turning (src/pageturn.mjs) ---------------------------------------------------------------
    /** The view as it looks now, as a texture the size of the screen. */
    function capture() {
        const W = app.screen.width, H = app.screen.height;
        if (!W || !H) return null;
        const rt = PIXI.RenderTexture.create({ width: W, height: H, resolution: app.renderer.resolution });
        const was = turnLayer.visible;
        turnLayer.visible = false;
        app.renderer.render({ container: root, target: rt, clear: true });
        turnLayer.visible = was;
        return rt;
    }
    const turns = [];
    let held = null;
    /** Show `rt` over the screen and turn it away (hinge: the edge it turns about). hold: wait for release(). */
    function startTurn(rt, { hinge = 'left', duration = 1.05, hold = false } = {}) {
        if (!rt) return null;
        onFx?.('sfx', 'page');
        let show, destroy;
        if (G.lessMotion) {
            // reduced motion: a short crossfade instead of a turning page
            const s = new PIXI.Sprite(rt); s.width = app.screen.width; s.height = app.screen.height;
            turnLayer.addChild(s);
            show = (k) => { s.alpha = 1 - k * k * (3 - 2 * k); };
            destroy = () => s.destroy();
            duration = Math.min(0.45, duration * 0.4);
        } else {
            // the back of the page is the notebook's own paper
            const turn = createScreenTurn(PIXI, app, { texture: rt, hinge, parent: turnLayer, paper: T('mat-paper') || null,
                curl: .43, lift: .095, slant: .045 });
            show = (k) => turn.at(k);
            destroy = () => turn.destroy();
        }
        const tr = { rt, k: 0, dur: duration, hold, preview: 0, show, destroy, resolve: null };
        tr.done = new Promise((r) => { tr.resolve = r; });
        show(0);
        turns.push(tr);
        return tr;
    }
    function stepTurns(dt) {
        for (let i = turns.length - 1; i >= 0; i--) {
            const tr = turns[i];
            if (tr.hold) {
                // The final page takes a breath and lifts before it turns. Reduced
                // motion holds a still picture, then uses the short crossfade.
                if (!G.lessMotion) { tr.preview = Math.min(.065, tr.preview + dt * .13); tr.k = tr.preview; tr.show(tr.preview); }
                continue;
            }
            tr.k = Math.min(1, tr.k + dt / tr.dur);
            tr.show(tr.k);
            if (tr.k >= 1) { turns.splice(i, 1); tr.destroy(); tr.rt.destroy(true); tr.resolve(); }
        }
    }
    function endTurns() {
        for (const tr of turns.splice(0)) { tr.destroy(); tr.rt.destroy(true); if (!destroyed) tr.resolve(); }
        held = null;
    }

    /** A white paper cover peels away like a page, from the edge you see toward the far end of the scene. */
    function peelCover(pc) {
        if (pc.state === 'turning' || pc.state === 'gone') return pc.done || Promise.resolve();
        pc.state = 'turning';
        const d = pc.pc, H = app.screen.height / cam.zoom, Wv = app.screen.width / cam.zoom;
        const top = cam.y - H / 2 - h(4), height = H + h(8);
        const camL = cam.x - Wv / 2, camR = cam.x + Wv / 2;
        // the sheet that turns is the part of the cover you can see (at least 5 HL), hinged just beyond it,
        // so the whole turn happens in view; the rest of the cover is off screen and simply goes
        const width = clamp((d.under ? camR - d.x0 : d.x1 - camL) + h(0.3), Math.min(h(2), d.x1 - d.x0), d.x1 - d.x0);
        const x0 = d.under ? d.x0 : d.x1 - width;
        const paper = T('mat-paper');
        const finish = () => {
            pc.state = 'gone'; pc.c.visible = false;
            G.flags.add('peeled_' + d.id); // cosmetic: a saved game does not peel it again
        };
        if (!paper || G.lessMotion) {
            // no paper texture or reduced motion: fade the cover out
            pc.done = new Promise((resolve) => {
                const started = performance.now(), duration = G.lessMotion ? 280 : 450;
                const tick = () => {
                    if (!S || !S.paper.includes(pc)) { resolve(); return; }
                    const k = clamp((performance.now() - started) / duration, 0, 1);
                    pc.c.alpha = 1 - k * k * (3 - 2 * k);
                    if (pc.c.alpha <= 0) { finish(); resolve(); } else nextFrame(tick);
                };
                tick();
            });
            return pc.done;
        }
        // the far edge is the hinge; the edge facing the player lifts first
        const hinge = d.under ? 'right' : 'left';
        const eye = { x: clamp(cam.x - x0, 0, width), y: cam.y - top }; // the viewer: follows the camera each frame
        const page = createPage(PIXI, {
            front: paper, tile: true, width, height, columns: Math.max(24, Math.min(96, Math.ceil(width / h(0.35)))), rows: 8,
            edges: 'free', hinge, curl: 0.5, perspective: 1, lift: 0.04, eye
        });
        page.view.x = x0; page.view.y = top;
        L.cover.addChild(page.view);
        pc.c.visible = false;
        const band = [clamp(camL - x0, 0, width), clamp(camR - x0, 0, width)];
        const clock = page.timeline(band[0], band[1]);
        const dur = 1.7;
        let k = 0;
        onFx?.('sfx', 'page');
        pc.done = new Promise((resolve) => {
            pc.resolve = resolve;
            pc.step = (dt) => {
                k = Math.min(1, k + dt / dur);
                eye.x = cam.x - x0; eye.y = cam.y - top;
                page.set(clock(k));
                if (k >= 1) { page.destroy(); pc.page = null; pc.step = null; finish(); resolve(); }
            };
            pc.page = page;
        });
        return pc.done;
    }
    /** Stop a cover mid-peel (the scene is going away): free the page, count it as peeled, let awaiters go on. */
    function dropPeels() {
        for (const pc of S?.paper || []) {
            if (pc.state !== 'turning') continue;
            pc.page?.destroy(); pc.page = null; pc.step = null;
            pc.state = 'gone';
            if (!destroyed) { G.flags.add('peeled_' + pc.pc.id); pc.resolve?.(); }
        }
    }
    /** true when the scene was built with all of its art (no placeholders) */
    function countPlaceholders() {
        let n = 0;
        const walk = (c) => { if (c._placeholder) n++; for (const ch of c.children || []) walk(ch); };
        walk(world);
        return n;
    }

    // --- per-frame update -------------------------------------------------------------------------
    let time = 0;
    function render(snap, dt) {
        time += dt;
        const def = S.def;
        const F = G.flags;
        const frozen = def.id === 'land' ? (!F.has('plask') || G.freeze) : false;
        const W = app.screen.width, H = app.screen.height;
        const scenicTime = G.lessMotion ? 0 : time;
        if (mapAssembly) {
            const previous = mapAssembly.elapsed;
            mapAssembly.elapsed += dt;
            mapAssembly.state = mapAssembly.effect.update(mapAssembly.elapsed);
            mapAssembly.effect.fit(W, H);
            if (previous < 1.15 && mapAssembly.elapsed >= 1.15) onFx?.('sfx', 'pencil');
            if (mapAssembly.state.done) endMapAssembly(true);
        }
        if (foldDemo) {
            foldDemo.elapsed += dt;
            foldDemo.state = foldDemo.effect.update(foldDemo.elapsed);
            frameFoldDemo();
            if (foldDemo.state.done) endFoldDemo(true);
        }

        // hero
        hero.update(dt, snap);
        hero.view.x = snap.x; hero.view.y = snap.y;
        hero.view.visible = !G.hideHero;

        // camera
        updateCamera(dt, snap, W, H);
        foldDemo?.effect.fit(cam.zoom);
        world.scale.set(cam.zoom);
        if (G.lessMotion) cam.shake = 0; // reduced motion: no shaking, gentler camera, fewer particles
        const shx = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake : 0;
        cam.shake = Math.max(0, cam.shake - dt * 30);
        world.position.set(W / 2 - cam.x * cam.zoom + shx, H / 2 - cam.y * cam.zoom);
        S.atmosphere.update({ cam, width: W, height: H, time: scenicTime, lessMotion: G.lessMotion, evening: G.evening });

        // backdrops (cover the screen, crossfade by camera x)
        for (const b of S.bg) {
            const bb = b._bg;
            const want = G.evening && def.evening?.[bb.image] ? def.evening[bb.image] : bb.image;
            if (want !== b._img) { const t = T(want); if (t) { b.texture = t; b._img = want; } }
            const tw = b.texture?.width || 64, th = b.texture?.height || 64;
            const sc = Math.max(W / tw, H / th) * 1.08;
            b.scale.set(sc);
            b.x = (W - tw * sc) / 2 - ((cam.x % h(40)) / h(40) - 0.5) * W * 0.03;
            b.y = (H - th * sc) / 2 + clamp(-(cam.y - h(-1)) * cam.zoom * 0.05, -H * 0.04, H * 0.04);
            if (S.vista) {
                // The bay backdrop's horizon is at 60%; align it with the real waterline.
                const vistaScale = Math.max(W / tw, H / (th * 0.8)) * 1.08;
                b.scale.set(vistaScale); b.x = (W - tw * vistaScale) / 2; b.y = H / 2 - th * 0.6 * vistaScale;
            }
            if (bb.image === 'bg-steppe') b.y -= H * 0.08;
            let a = 1;
            if (S.bg.length > 1) {
                const mid = (bb.x0 + bb.x1) / 2, half = (bb.x1 - bb.x0) / 2;
                const dx = Math.abs(cam.x - mid) - half;
                a = clamp(1 - dx / h(5), 0, 1);
            }
            b.alpha = a;
        }
        // sky props: parallax
        for (const it of S.sky) {
            const sx = W / 2 + (it.x - cam.x) * cam.zoom * it.par + (it.x - cam.x) * cam.zoom * (1 - it.par) * 0.0;
            const sy = H / 2 + (it.y - cam.y) * cam.zoom * Math.max(0.5, it.par * 2.5);
            let ox = 0, oy = 0;
            if (it.kind === 'gull') {
                if ((!frozen || !it.her) && !G.lessMotion) { it.phase += dt * 2.2; ox = Math.sin(it.phase * 0.35) * 40; oy = Math.sin(it.phase * 0.7) * 16; }
                // scattered by a neigh or a passing gallop: up and away, back after a while
                if (it.scatter !== undefined && !G.lessMotion) {
                    const u = time - it.scatter;
                    if (u > 7) it.scatter = undefined;
                    else { const k = u < 3 ? u : 3 - (u - 3) * 0.75; it.phase += dt * 3; ox += k * 90 * (it.dir || 1); oy -= k * 70; }
                }
                const fr = frozen && it.her && it.scatter === undefined ? 1 : 1 + (Math.floor(it.phase * 3) % 4);
                setTex(it.s, 'gull-m-' + fr);
            } else if (it.anim === 'cloud' && (!frozen || it.it?.user) && !G.lessMotion) {
                it.x += dt * 6;
                if (it.it?.user && it.x > def.spots.start.x + h(14)) it.x -= h(30);
            }
            else if (it.anim === 'sun' && !frozen) { it.s.rotation = G.lessMotion ? 0 : Math.sin(time * 0.2) * 0.02; }
            it.s.x = sx + ox * cam.zoom; it.s.y = sy + oy * cam.zoom;
            it.s.scale.set(cam.zoom * (it.s._baseScale || 1) * (it.s.scale.x < 0 ? -1 : 1), cam.zoom * (it.s._baseScale || 1));
        }
        // decor conditions and label fade
        for (const { s, it } of S.items) {
            let vis = cond(it.when, F);
            if (it.chapter && !F.has('ch' + it.chapter + '_open') && it.chapter > 1) vis = vis && false;
            s.visible = vis;
            if (it.label) {
                const d = Math.abs(snap.x - it.x);
                s.alpha = damp(s.alpha, G.sceneTime < 1.5 || d < h(3.5) ? 1 : 0.0, 2, dt);
                if (G.finalLabel) s.alpha = G.finalLabel;
            }
            if (it.frozen) {
                if (!frozen) { s.scale.y = 1 + Math.sin(time * 5) * 0.06; s.alpha = F.has('plask') ? 0.0 : 1; }
                else { s.scale.y = 1; }
                if (F.has('plask')) s.visible = false;
            }
            if (it.ratchet) { const n = def.drums?.find((q) => q.id === it.ratchet)?.notches || 24; s.rotation = (F.has(it.ratchet) ? n : (G.puz.drums[it.ratchet] || 0)) * (8.4 / n); }
            if (/^(feathergrass|dune-grass)/.test(it.sprite || '')) s.rotation = G.lessMotion ? 0 : Math.sin(time * .7 + it.x * .006) * .025;
        }
        // dynamic thin surfaces and ramps
        for (const it of S.dyn) { if (it.c) it.c.visible = cond(it.s.when, F); }
        if (G.terrain !== S.groundTerrain || G.terrain.revision !== S.groundRevision) S.rebuildGround();
        // kelp sway
        for (const k of S.kelp) {
            k.r.visible = !(k.chapter && !F.has('ch2_open'));
            if (!k.r.visible) continue;
            const pts = k.pts;
            const sway = (G.player.hidden && Math.abs(G.player.x - k.x) < h(1.5)) ? 0.4 : 1;
            if (k.fore) {
                const crossesHero = Math.abs(snap.x - k.x) < h(.75) && snap.y > k.fy - k.H && snap.y - h(1.5) < k.fy;
                k.r.alpha = damp(k.r.alpha, crossesHero ? .16 : .6, 6, dt);
            }
            for (let i = 0; i <= k.n; i++) {
                const u = 1 - i / k.n; // 1 at the top
                pts[i][0] = k.x + Math.sin(scenicTime * 0.9 + k.phase + u * 2.2) * 38 * u * u * sway + Math.sin(scenicTime * 0.37 + k.phase) * 12 * u;
                pts[i][1] = k.fy - k.H * u;
            }
            if (k.r._strip) updateStrip(k.r, pts);
            else { updateRopePoints(k.r, pts); }
        }
        // water surfaces and reflections
        for (const wb of S.waters) {
            const P = wb.surf._pts;
            const calm = S.vista ? 0.08 : wb.refl ? (G.puz.pools[wb.w.id]?.ripple ?? 1) : 1;
            const amp = frozen && def.id === 'land' && wb.w.kind === 'sea' ? 0 : (wb.w.kind === 'pool' ? 6 : 10) * Math.max(0.15, calm);
            for (let i = 0; i < P.length; i++) {
                const bx = wb.surfBase[i][0];
                P[i].y = wb.w.top + Math.sin(scenicTime * 2.1 + bx * 0.012) * amp + Math.sin(scenicTime * 1.3 + bx * 0.031) * amp * 0.4;
            }
            refreshRope(wb.surf);
            wb.light?.update({ time, cam, width: W, height: H, frozen: frozen && def.id === 'land' && wb.w.kind === 'sea', evening: G.evening, lessMotion: G.lessMotion, ripple: calm });
            if (wb.refl) {
                const r = S.vista ? 0.08 : G.puz.pools[wb.w.id]?.ripple ?? 1;
                const vis = clamp(1 - r * 1.6, 0, 1);
                wb.refl._inner.alpha = 0.12 + 0.62 * vis;
                wb.refl._inner.x = G.lessMotion ? 0 : Math.sin(time * 2) * 9 * r;
                if (wb.refl._fish) { wb.refl._fish.x = wb.w.x0 + ((time * 90) % (wb.w.x1 - wb.w.x0)); wb.refl._fish.visible = vis > 0.4; }
            }
        }
        // dashed lines
        for (const dl of S.dashed) {
            const vis = cond(dl.ds.when, F);
            dl.c.visible = vis;
            if (dl.route) dl.route.container.visible = vis;
            if (!vis) continue;
            const done = F.has(dl.ds.flag);
            const inkT = done ? 1 : (dl.ds._ink ?? 0) * (G.player.mode === 'streck' && G.player.streck?.d === dl.ds ? 1 : 0);
            dl.dash.visible = !done && !dl.route;
            if (dl.route) {
                const r = S.routeReveal;
                const segment = S.dashed.indexOf(dl);
                const reveal = r && !G.lessMotion ? clamp((time - r.start) / r.duration * 3 - segment, 0, 1) : 1;
                dl.route.update({ visible: vis, completed: done, reveal, time, reducedMotion: G.lessMotion });
            }
            if (dl.ds.glow) dl.glow.alpha = done ? 0.25 : 0.45 + Math.sin(time * 3) * 0.2;
            else {
                // an unfinished line you could draw now breathes when you come near
                const p = G.player;
                const near = !done && cond(dl.ds.inkWhen, F) && p.x > dl.x0 - h(7) && p.x < dl.x1 + h(7) && Math.abs(p.y - dl.y) < h(2);
                dl.glow.alpha = damp(dl.glow.alpha, near ? 0.5 + Math.sin(time * 3.2) * 0.2 : 0, 3, dt);
                dl.dash.alpha = near ? 0.78 + Math.sin(time * 3.2 + 1) * 0.22 : 1;
            }
            updateInk(dl, inkT, G.player.streck?.dir || 1);
            dl.ink.visible = inkT > 0;
            if (inkT > 0 && inkT < 1 && Math.random() < 0.5) emit('ink', snap.x, snap.y - 10, 1, { speed: 120, g: 300, life: 0.4, tint: 0x3b3530 });
        }
        // lanes
        for (const ln of S.lanes) {
            const active = cond(ln.ln.when, F);
            if (ln.line) ln.line.visible = active && !ln.route;
            if (ln.route) ln.route.update({ visible: active, time, reducedMotion: G.lessMotion });
            if (ln.band) ln.band.visible = active;
            for (const m of ln.motes) {
                m.m.visible = active;
                if (!active) continue;
                if (!G.lessMotion) m.s = (m.s + ln.ln.speed * dt * 0.6) % ln.len;
                const pt = pointAt(ln.pts, m.s);
                m.m.x = pt.x - pt.ty * m.off; m.m.y = pt.y + pt.tx * m.off;
                const fade = Math.sin(Math.PI * (m.s / ln.len));
                if (m.streak) { m.m.rotation = Math.atan2(pt.ty, pt.tx); m.m.alpha = 0.75 * fade; }
                else m.m.alpha = 0.6 * fade;
            }
        }
        for (const vx of S.vortex) {
            const active = cond(vx.v.when, F);
            for (const m of vx.motes) {
                m.m.visible = active;
                if (!active) continue;
                if (!G.lessMotion) {
                    m.a += dt * (vx.v.speed / Math.max(120, m.r)) * vx.v.spin;
                    m.r = m.r > vx.v.eye * 1.3 ? m.r - dt * 22 : vx.v.r * (0.6 + Math.random() * 0.5);
                }
                m.m.x = vx.v.x + Math.cos(m.a) * m.r; m.m.y = vx.v.y + Math.sin(m.a) * m.r;
            }
        }
        // paper covers: once the chapter is out, the white page peels away when you first see it
        for (const pc of S.paper) {
            if (!F.has(pc.pc.until)) { pc.state = 'covered'; pc.c.visible = true; pc.c.alpha = 1; continue; }
            if (pc.state === 'covered') { pc.state = 'waiting'; pc.wait = 0; }
            if (pc.state === 'waiting') {
                // peel when a good part of it is in view (so the whole turn can be seen), and nothing else is on
                const halfW = W / cam.zoom / 2;
                const seen = Math.max(0, Math.min(pc.pc.x1, cam.x + halfW) - Math.max(pc.pc.x0, cam.x - halfW)) / (2 * halfW);
                pc.wait = seen > 0.3 && !G.busy ? pc.wait + dt : 0;
                if (pc.wait > 0.4) peelCover(pc);
            }
            if (pc.state === 'turning') pc.step?.(dt);
        }
        for (const dk of S.dark) { const lit = F.has(dk.dk.until); dk.g.alpha = damp(dk.g.alpha, lit ? 0 : 1, 1.5, dt); }
        updateObjects(dt, snap, frozen);
        // minis: distant sköldhästar run along the far ridge during the final gallop (never close)
        stepMinis(dt, snap);
        stepSpeedLines(dt, snap);
        stepParticles(dt);
        stepTurns(dt);
        // tooth overlay follows the screen
        if (tooth) { tooth.width = W; tooth.height = H; }
        fade.clear();
        if (fadeAlpha > 0.001) fade.rect(0, 0, W, H).fill({ color: fadeColor, alpha: fadeAlpha });
        // warm evening
        world.tint = G.evening ? 0xffe6c4 : 0xffffff;
        skyLayer.tint = world.tint;
    }

    function stepMinis(dt, snap) {
        const want = G.finalRun && S.id === 'land' ? 1 + (G.flags.has('glimpse2') ? 1 : 0) + (G.flags.has('mark_sea') ? 1 : 0) : 0;
        while (minis.length < want) {
            const m = heroFactory({ mini: true });
            m.view.scale.set(0.26 + minis.length * 0.03);
            m.view.alpha = 0.75;
            L.far.addChild(m.view);
            m.off = h(2.2 + minis.length * 1.7);
            minis.push(m);
        }
        while (minis.length > want) { const m = minis.pop(); m.view.parent?.removeChild(m.view); m.destroy?.(); }
        minis.forEach((m, i) => {
            // on a ridge line above the steppe, keeping pace a little ahead of the player
            const x = snap.x + m.off * (snap.facing || -1);
            // small and faded just above the ground line: far off across the plain
            const ground = floorAt(S.def, x) ?? snap.y;
            const ridge = ground - h(0.3 + i * 0.12);
            m.view.x = x; m.view.y = ridge;
            m.update(dt, { x, y: ridge, facing: snap.facing || -1, gait: 'gallop', mode: 'ground', speed: 1200, vx: (snap.facing || -1) * 1200, hide: 0, time: time + i * 0.37, groundAt: () => ridge });
        });
    }

    function updateRopePoints(r, pts) {
        const P = r._pts;
        if (!P) return;
        for (let i = 0; i < P.length; i++) {
            const q = pts[Math.min(i, pts.length - 1)];
            P[i].x = q[0]; P[i].y = q[1];
        }
        refreshRope(r);
    }

    function updateInk(dl, progress, dir) {
        if (progress >= 1) { updateRopePoints(dl.ink, dl.pts); return; }
        const distance = dl.len * (dir < 0 ? 1 - progress : progress);
        const tip = pointAt(dl.pts, distance);
        for (let i = 0; i < dl.pts.length; i++) {
            const untouched = dir < 0 ? dl.distances[i] < distance : dl.distances[i] > distance;
            const p = dl.ink._pts[i], q = dl.pts[i];
            p.x = untouched ? tip.x : q[0]; p.y = untouched ? tip.y : q[1];
        }
        refreshRope(dl.ink);
    }

    function updateObjects(dt, snap, frozen) {
        const O = S.obj, def = S.def, F = G.flags, Z = G.puz;
        if (def.id === 'land') {
            const target = def.rail.x0 + Z.stone * def.rail.step;
            O.stone.x = damp(O.stone.x || target, target, 6, dt);
            // the stone's cues: only while the puzzle is open and the reflection has shown the answer
            const railOpen = !F.has('p2_open');
            O.railMarks.visible = railOpen;
            const want = Math.sign(def.rail.target - Z.stone);
            const showGhost = railOpen && F.has('p2_seen') && want !== 0;
            O.ghostStone.alpha = damp(O.ghostStone.alpha, showGhost ? 0.45 + Math.sin(time * 2.4) * 0.12 : 0, 3, dt);
            O.ghostStone.visible = O.ghostStone.alpha > 0.01;
            const nearStone = showGhost && Math.abs(snap.x - O.stone.x) < h(4) && snap.mode === 'ground';
            O.pushArrow.alpha = damp(O.pushArrow.alpha, nearStone ? 0.9 : 0, 4, dt);
            O.pushArrow.visible = O.pushArrow.alpha > 0.01;
            if (O.pushArrow.visible) {
                O.pushArrow.scale.x = want || 1;
                O.pushArrow.x = O.stone.x + (want || 1) * (Math.sin(time * 4) * 8 + 10);
                O.pushArrow.y = def.rail.y - h(0.62);
            }
            // fluff paths near a backsippa whose tuft still waits
            for (const fp of O.fluffPaths) {
                const bare = (Z.clumps[fp.c.id] || 0) > 0;
                const on = !F.has(fp.t.flag) && !bare && Math.abs(snap.x - fp.c.x) < h(7) && Math.abs(snap.y - fp.c.y) < h(1.2) && !G.busy;
                fp.vis = damp(fp.vis, on ? 1 : 0, 2.5, dt);
                fp.trail.alpha = fp.vis * (0.55 + Math.sin(time * 2.2) * 0.15);
                fp.trail.visible = fp.vis > 0.02;
                for (const mo of fp.motes) {
                    mo.m.visible = fp.vis > 0.02;
                    if (!mo.m.visible) continue;
                    mo.u = (mo.u + dt * 0.3) % 1;
                    const [x, y] = fp.at(mo.u);
                    mo.m.x = x; mo.m.y = y + Math.sin(time * 3 + mo.u * 9) * 8;
                    mo.m.alpha = fp.vis * 0.95 * Math.sin(mo.u * Math.PI);
                    mo.m.rotation += dt * 1.5;
                }
                const tu = O.tussocks.find((q) => q.t === fp.t);
                if (tu) tu.s.scale.set(1 + fp.vis * 0.07 * Math.sin(time * 4));
            }
            for (const c of O.clumps) { const bare = (Z.clumps[c.c.id] || 0) > 0; c.s.visible = !bare; c.b.visible = bare; }
            for (const t of O.tussocks) { t.s.visible = !F.has(t.t.flag) || t.t.decor; if (t.t.decor && F.has(t.t.flag)) setTex(t.s, 'feathergrass-2'); }
            for (const pw of O.pinwheels) { pw.a += (Z.pinwheels[pw.pw.id] || 0.3) * dt * 2; pw.hd.rotation = pw.a; }
            for (const sh of O.shells) { const rung = Z.shells[sh.sh.id]; sh.s.tint = rung ? 0xfff2c8 : 0xffffff; }
            const fl = def.drums[0];
            const frac = F.has(fl.flag) ? 1 : (Z.drums[fl.id] || 0) / fl.notches;
            O.flag.y = def.spots.flagpole.y - 60 - frac * 180;
            setTex(O.gate, F.has('gate_open') ? 'gate-open' : 'gate-closed');
            // the first glimpse: a distant sköldhäst on the ridge that lies down as you come near
            const gp = def.spots.glimpse1;
            const lie = Z.glimpse.glimpse1 || 0;
            O.glimpse.view.x = gp.x + (cam.x - gp.x) * 0.35; O.glimpse.view.y = gp.y;
            O.glimpseRidge.position.set(O.glimpse.view.x, gp.y);
            O.glimpse.view.visible = !G.finalRun;
            O.glimpse.update(dt, { x: gp.x, y: gp.y, facing: -1, gait: 'stand', mode: 'ground', hide: lie, speed: 0, time, groundAt: () => gp.y });
            O.landmark.visible = F.has('ch2_open') && !F.has('mark_land');
            O.ropeDown.visible = F.has('p4_plank') && !F.has('final_run');
        }
        if (def.id === 'kelp') {
            for (const f of O.flaps) setTex(f.s, F.has(f.f.flag) ? 'paper-flap-flat' : 'paper-flap');
            for (const c of O.corners) { setTex(c.s, F.has(c.c.flag) ? 'paper-corner-flat' : 'paper-corner'); c.m.visible = F.has(c.c.flag) && !F.has('mark_sea_taken'); }
            const sch = Z.school, home = def.school.home;
            O.school.forEach((f, i) => {
                const vis = F.has('ch2_open');
                f.s.visible = f.g.visible = vis;
                if (!vis) return;
                f.a += dt * (1.2 + i * 0.1);
                const cx = sch.state === 'home' ? home.x : sch.x, cy = sch.state === 'home' ? home.y : sch.y;
                f.s.x = cx + Math.cos(f.a) * f.r; f.s.y = cy + Math.sin(f.a * 1.3) * f.r * 0.5;
                f.s.scale.x = Math.cos(f.a) > 0 ? -1 : 1;
                f.g.x = f.s.x; f.g.y = f.s.y; f.g.alpha = sch.state === 'lit' ? 0.9 : 0.5;
            });
            for (const sy of O.shy) {
                const out = Z.shy[sy.c.id] || 0;
                sy.s.alpha = out; sy.s.visible = out > 0.02;
                sy.s.x = sy.c.x + Math.sin(time * 1.3 + sy.c.x) * 30 * out;
                setTex(sy.s, sy.c.kind + '-' + (1 + (Math.floor(time * 3) % 2)));
            }
            const g2 = def.glimpses?.[0];
            if (g2) { O.glimpse.view.visible = F.has(g2.id) && (Z.glimpse[g2.id] || 0) < 1; O.glimpse.view.x = g2.x + h(6); O.glimpse.view.y = g2.y; O.glimpse.update(dt, { x: 0, y: 0, facing: -1, mode: 'swim', gait: 'stand', speed: 60, time, submerge: 1, groundAt: () => null }); O.glimpse.view.alpha = 0.6; }
        }
        if (def.id === 'viken') {
            O.shutters.forEach((o) => setTex(o.s, F.has(o.sh.flag) ? 'shutter-open' : 'shutter-closed'));
            // a ring (or a flat ellipse on the seabed) that fills as the progress grows
            const drawRing = (g, frac, on) => {
                g.alpha = damp(g.alpha, on ? 1 : 0, 3, dt);
                g.visible = g.alpha > 0.01;
                if (!g.visible || Math.abs(frac - g._frac) < 0.004) return;
                g._frac = frac;
                g.clear();
                const rx = g._rx || g._r, ry = g._ry || g._r, w = g._ry ? 7 : 9;
                const path = (f) => { const n = Math.max(2, Math.ceil(48 * f)); for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * f * Math.PI * 2; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; if (i) g.lineTo(x, y); else g.moveTo(x, y); } };
                path(1); g.stroke({ width: w, color: 0x3b3530, alpha: 0.28 });
                if (frac > 0) { path(frac); g.stroke({ width: w, color: frac >= 1 ? 0xf6c14a : 0xe0782a, alpha: 0.95, cap: 'round', join: 'round' }); }
            };
            if (O.drumRing) {
                const dr = O.drumRing._drum, done = F.has(dr.flag);
                if (done && !O.drumRing._doneAt) O.drumRing._doneAt = time;
                const n = Z.drums[dr.id] || 0;
                drawRing(O.drumRing, done ? 1 : n / dr.notches, F.has('viken_arrived') && (!done ? n > 0 || Math.abs(snap.x - O.drumRing.x) < h(9) : time - O.drumRing._doneAt < 1.6));
            }
            if (O.plateRing) {
                const pl = O.plateRing._plate, done = F.has(pl.flag);
                if (done && !O.plateRing._doneAt) O.plateRing._doneAt = time;
                const held = Z.plates[pl.id] || 0;
                const nearPlate = !done && F.has('viken_arrived') && snap.mode === 'swim' && Math.hypot(snap.x - pl.x, snap.y - pl.y) < h(5);
                drawRing(O.plateRing, done ? 1 : Math.min(1, held / pl.hold), done ? time - O.plateRing._doneAt < 1.6 : held > 0 || nearPlate);
                O.plateGlow.alpha = damp(O.plateGlow.alpha, nearPlate ? 0.5 + Math.sin(time * 3) * 0.2 : 0, 3, dt);
                O.plateGlow.visible = O.plateGlow.alpha > 0.01;
                O.plateGlow.scale.set(1.8 + Math.sin(time * 2) * 0.2, 0.7);
            }
            O.lamp.alpha = damp(O.lamp.alpha, F.has('lamp_lit') ? 0.95 + Math.sin(time * 2) * 0.05 : 0, 1.2, dt);
            O.beam.alpha = damp(O.beam.alpha, F.has('lamp_lit') ? .88 : 0, 2, dt);
            O.windowMarks.visible = F.has('p8_land') && !F.has('p8_done');
            O.chains.forEach((c) => { const on = F.has(def.shutters[c.c.shutter].flag); c.r.alpha = on ? 0.95 : 0.45; c.r.tint = on ? 0xffe08a : 0xffffff; });
            const kv = G.actors.kv;
            O.map.visible = kv.visible && kv.scene === 'viken';
            if (O.map.visible) { O.map.x = kv.x - h(0.7); O.map.y = kv.y; setTex(O.map, kv.map === 'open' ? 'map-open' : 'map-closed'); }
        }
        for (const pc of O.pencils) {
            const available = pencilAvailable(pc.pc, F);
            pc.s.visible = available && !F.has('penna_' + pc.pc.id);
            pc.g.visible = available;
            pc.s.y = pc.pc.y - 20 + Math.sin(time * 2 + pc.pc.x) * 6;
            const colored = F.has('color_' + pc.pc.id);
            setTex(pc.g, pc.pc.prop + (colored ? '-color' : '-grey'));
        }
        // actors
        const k = G.actors.klo;
        O.kloRig.update(k, { scene: S.id, time: G.time, dt, underwater: S.def.underwater || (S.id === 'viken' && k.y > 0), hero: G.player, talking: k.talking || k.talkUntil > G.time, reducedMotion: G.lessMotion });
        O.kloSign.visible = O.klo.visible && !!k.holding;
        if (O.kloSign.visible) { setTex(O.kloSign, k.holding); O.kloSign.x = O.klo.x + 20 * k.facing; O.kloSign.y = O.klo.y - 70; }
        const guardianOptions = O.guardianOptions;
        guardianOptions.time = G.time; guardianOptions.dt = dt; guardianOptions.hero = G.player;
        guardianOptions.reducedMotion = G.lessMotion; guardianOptions.figure = false;
        O.kvRig.update(G.actors.kv, guardianOptions);
        guardianOptions.figure = true;
        O.figureRig.update(G.actors.figure, guardianOptions);
        drawActor(O.signe, G.actors.signe, 'signe', dt);
        drawPrints();
        // hints
        const hi = G.story?.hintInfo?.();
        O.actionCue.update(G.guidance, { scene: S.id, hero: G.player, cam, width: app.screen.width, height: app.screen.height,
            busy: !!G.busy || G.hideHero || G.vista, time, lessMotion: G.lessMotion });
        if (hi && hi.level >= 0.5 && hi.spot && !G.busy) {
            O.hint.visible = true;
            O.hint.x = hi.spot.x; O.hint.y = hi.spot.y - h(0.4);
            O.hint.alpha = 0.35 + 0.35 * Math.sin(time * 3);
            O.hint.scale.set(1.5 + 0.3 * Math.sin(time * 2));
            if (hi.level >= 1) {
                if (!O.hintGull) {
                    const ug = G.userGull ? new PIXI.Sprite(G.userGull) : spr('gull-m-2');
                    ug.anchor?.set?.(0.5); O.hintGull = ug; L.hints.addChild(ug);
                }
                const under = def.underwater || (def.id === 'viken' && hi.spot.y > 0);
                O.hintGull.visible = true;
                if (under) setTex(O.hintGull, 'fish-1');
                O.hintGull.x = hi.spot.x + Math.cos(time * 1.4) * h(0.9);
                O.hintGull.y = hi.spot.y - h(1.3) + Math.sin(time * 2.8) * h(0.25);
            } else if (O.hintGull) O.hintGull.visible = false;
        } else { O.hint.visible = false; if (O.hintGull) O.hintGull.visible = false; }
    }

    function drawActor(s, a, kind, dt) {
        const vis = a.visible && a.scene === S.id;
        s.visible = vis;
        if (!vis) return;
        s.x = a.x; s.y = a.y;
        s.scale.x = a.facing < 0 ? -1 : 1;
        const pop = a.pop || 0;
        s.scale.y = 1 - pop * 0.6;
        s.alpha = 1 - pop * 0.5;
        if (kind === 'kv') {
            setTex(s, 'kv-' + (a.walk ? (Math.floor(time * 6) % 2 ? 'walk-1' : 'walk-2') : a.pose));
        } else if (kind === 'signe') {
            const moving = (a.speed || 0) > 0 || a.walk || a.pose === 'walk';
            const phase = G.lessMotion ? 0 : a.walkPhase ?? time * .7;
            setTex(s, moving ? (Math.floor(phase * 2) % 2 ? 'turtle-signe-1' : 'turtle-signe-2') : 'turtle-signe');
            if (a.pose === 'wave' && !G.lessMotion) s.rotation = Math.sin(time * 3) * 0.04; else s.rotation = 0;
        } else {
            setTex(s, Math.floor(time * 7) % 2 ? 'kv-walk-1' : 'kv-walk-2');
        }
        void dt;
    }

    // --- Sandpapperet ----------------------------------------------------------------------------------
    const PRINT_KEEP = 360;
    function addPrint(e) {
        const def = S?.def;
        if (!def || !def.printMats || !def.printMats.includes(e.surface) || e.wading) return;
        const q = G.prints ||= [];
        const gallop = e.speed >= 1000;
        // the four hooves land at different places along the body
        const off = [-0.36, -0.12, 0.14, 0.36][(q.length + (gallop ? 1 : 0)) % 4] * HL * (G.player.facing || 1);
        q.push({ x: e.x + off, y: e.y, g: gallop, t: time });
        if (q.length > PRINT_KEEP) q.splice(0, q.length - PRINT_KEEP);
    }
    function drawPrints() {
        const O = S.obj;
        if (!O.prints) return;
        const q = G.prints || [];
        // walk prints fade away after a few seconds; gallop prints are drawn in graphite and stay
        for (let i = q.length - 1; i >= 0; i--) if (!q[i].g && time - q[i].t > 3 || q[i].t > time + 1) q.splice(i, 1);
        const need = q.length;
        while (O.printSprites.length < need) {
            const sp = spr('hoofprint'); sp.anchor?.set?.(0.5, 0.5);
            O.prints.addChild(sp); O.printSprites.push(sp);
        }
        for (let i = 0; i < O.printSprites.length; i++) {
            const sp = O.printSprites[i], pr = q[i];
            sp.visible = !!pr;
            if (!pr) continue;
            sp.x = pr.x; sp.y = pr.y + 4;
            setTex(sp, pr.g ? 'hoofprint-graphite' : 'hoofprint');
            sp.alpha = pr.g ? 0.8 : Math.max(0, 0.55 * (1 - (time - pr.t) / 3));
        }
    }

    // --- camera -------------------------------------------------------------------------------------
    function updateCamera(dt, snap, W, H) {
        const portrait = H > W * 1.05;
        const sp = Math.abs(snap.vx || 0);
        const gal = clamp((sp - 700) / 500, 0, 1);
        cam.gal = damp(cam.gal ?? 0, gal, 1.2, dt);
        const restPx = portrait ? 105 : Math.min(160, Math.max(120, H * 0.36));
        const galPx = portrait ? 78 : restPx * 0.86;
        let zoom = lerp(restPx, galPx, cam.gal) / HL;
        if (S.def.underwater) zoom *= 0.8;
        const viewW = W / zoom;
        const lead = snap.mode === 'swim' ? viewW * 0.12 : viewW * lerp(0.08, 0.27, cam.gal);
        let tx = snap.x + (snap.facing || 1) * lead;
        // a hop or a buck is small: the camera stays with the ground it left
        const J = G.player.jump;
        const baseY = J && (J.kind === 'hop' || J.kind === 'buck') && J.fromY !== undefined ? Math.max(snap.y, J.fromY - h(0.2)) : snap.y;
        let ty = baseY - (H / zoom) * (portrait ? 0.08 : 0.12);
        if (snap.mode === 'swim') ty = snap.y + (S.def.underwater ? h(0.3) : -h(0.2));
        // the big leap: pan to the landing
        const L0 = G.player.leap;
        if (L0 && L0.pan) { tx = lerp(L0.from.x, L0.to.x, 0.75); ty = Math.min(L0.from.y, L0.to.y) - h(1.2); zoom *= 0.85; }
        const hint = G.camHint;
        if (hint) { if (hint.x !== undefined) tx = hint.x; if (hint.y !== undefined) ty = hint.y; if (hint.zoom) zoom = (hint.zoom * restPx) / HL; }
        if (hint?.frame) {
            // Both the lamp and its reflection fit in landscape and portrait. This is
            // a distant view, so it is independent of the playable page's edge clamps.
            const f = hint.frame;
            const pad = f.insets || { left: W * .05, right: W * .05, top: H * .05, bottom: H * .05 };
            const roomW = Math.max(80, W - pad.left - pad.right), roomH = Math.max(100, H - pad.top - pad.bottom);
            cam.zoom = Math.min(roomW / (f.x1 - f.x0), roomH / (f.y1 - f.y0));
            cam.x = (f.x0 + f.x1) / 2 + (pad.right - pad.left) / (2 * cam.zoom);
            cam.y = (f.y0 + f.y1) / 2 + (pad.bottom - pad.top) / (2 * cam.zoom);
            cam.snap = false;
            return;
        }
        // keep inside the scene
        const b = S.def.bounds;
        const hw = W / zoom / 2, hh = H / zoom / 2;
        tx = clamp(tx, b.x0 + hw, Math.max(b.x0 + hw, b.x1 - hw));
        ty = clamp(ty, b.y0 + hh, Math.max(b.y0 + hh, b.y1 - hh));
        if (cam.snap) { cam.x = tx; cam.y = ty; cam.zoom = zoom; cam.snap = false; return; }
        const calm = G.lessMotion ? 0.6 : 1;
        const rate = (hint ? 2.4 : 4) * calm;
        cam.x = damp(cam.x, tx, rate, dt);
        cam.y = damp(cam.y, ty, (hint ? 2.4 : 3) * calm, dt);
        cam.zoom = damp(cam.zoom, G.lessMotion ? lerp(cam.zoom, zoom, 0.5) : zoom, hint ? 2 : 1.6, dt);
    }

    // --- events → particles and small effects ------------------------------------------------------
    const offs = [];
    const on = (t, fn) => offs.push(G.on(t, fn));
    on('splashIn', (e) => { emit('drop', e.x, e.y, e.dive ? 22 : 12, { speed: e.dive ? 520 : 380 }); emit('foam', e.x, e.y, 6, { speed: 200 }); });
    on('splashOut', (e) => emit('drop', e.x, e.y, 8, { speed: 260 }));
    on('dolphin', (e) => emit('drop', e.x, e.y, 18, { speed: 480 }));
    on('paddle', (e) => {
        const x = e.hoofX ?? e.x;
        if (e.surface) {
            const y = e.waterY ?? e.y - h(0.6);
            emit('drop', x, y, 2, { speed: 95, life: 0.45 });
            emit('foam', x, y + 2, 1, { speed: 32, g: 0, life: 0.8, scale: 0.55, spread: 0, angle: G.player.facing > 0 ? Math.PI : 0 });
        } else emit('bubble', x, e.hoofY ?? e.y - h(0.5), 2, { g: -120, speed: 40, life: 1.2, scale: 0.6 });
    });
    on('hoof', (e) => {
        if (e.speed > 900 && !e.hollow) emit(e.wading ? 'drop' : 'sand', e.x - (G.player.facing * 60), e.y - 6, 2, { speed: 180, angle: G.player.facing > 0 ? -2.6 : -0.5, spread: 0.8, life: 0.45 });
        if (S?.id === 'land') addPrint(e);
    });
    on('flag', (e) => { if (e.flag === 'ended' && G.prints) G.prints.length = 0; }); // the tide wipes Sandpapperet clean
    on('taste', (e) => emit(e.kind === 'kelp' ? 'bubble' : 'dust', e.x, e.y - h(0.2), 6, { speed: 90, g: e.kind === 'kelp' ? -200 : 300 }));
    on('land', (e) => { if (e.big) { emit('dust', e.x, e.y, 16, { speed: 320 }); emit('star', e.x, e.y - h(0.5), 8, { speed: 260, g: 200 }); cam.shake = 10; } else emit('sand', e.x, e.y, 6, { speed: 200 }); });
    on('neigh', (e) => {
        emit(e.under ? 'bubble' : 'note', e.x + G.player.facing * h(0.55), e.y - h(1.0), e.under ? 6 : 3, { g: e.under ? -400 : -80, speed: 90, life: 1.2 });
        if (!e.under) scatterGulls(e.x, h(9));
    });
    function scatterGulls(x, range) {
        for (const it of S?.sky || []) if (it.kind === 'gull' && Math.abs(it.x - x) < range && it.scatter === undefined) { it.scatter = time; it.dir = Math.sign(it.x - x) || 1; }
    }
    on('shake', (e) => emit('drop', e.x, e.y - h(0.5), 24, { speed: 420, spread: 6.2, angle: 0 }));
    on('grow', (e) => { const t = S?.def.tussocks?.find((q) => q.id === e.id); if (t) { emit('fluff', t.x, t.y - 20, 14, { speed: 160, g: 60 }); emit('star', t.x, t.y - 40, 6, { g: 0, speed: 140 }); } });
    on('fluff', (e) => { const c = S?.def.clumps?.find((q) => q.id === e.id); if (c) emit('fluff', c.x, c.y - 70, 16, { angle: e.dir > 0 ? -0.5 : -2.6, spread: 0.9, speed: 520, g: 90, life: 1.4, drag: 0.8 }); });
    on('latch', () => emit('star', G.player.x, G.player.y - h(0.8), 8, { g: 0, speed: 200 }));
    on('enter', (e) => { if (G.finalRun && (e.id === 'note1' || e.id === 'spangen' || e.id === 'galoppbanan')) scatterGulls(G.player.x, h(14)); });
    on('pickup', () => emit('star', G.player.x, G.player.y - h(0.9), 10, { g: 0, speed: 220 }));
    on('colorin', (e) => { const pc = S?.def.pencils?.find((q) => q.id === e.id); if (pc) emit('star', pc.propAt.x, pc.propAt.y - 60, 14, { g: 0, speed: 240 }); });
    on('shellNote', (e) => { const sh = S?.def.shells?.find((q) => q.id === e.id); if (sh) emit('note', sh.x, -h(0.9), 2, { g: -60, speed: 60, life: 1.3 }); });
    on('balk', (e) => { if (e.reason === 'foam' || e.reason === 'edge' || e.reason === 'slow') emit('sand', G.player.x + G.player.facing * h(0.4), G.player.y, 5, { speed: 140 }); });
    on('flattened', () => emit('bubble', G.player.x, G.player.y - h(0.3), 12, { g: -300, speed: 160 }));
    on('ratchet', () => { if (Math.random() < 0.3) emit('dust', G.player.x, G.player.y, 1, { speed: 60 }); });
    on('stair', () => { fadeTo(1, 0.25).then(() => fadeTo(0, 0.35)); });

    function fadeTo(a, dur, color) {
        if (color !== undefined) fadeColor = color;
        const from = fadeAlpha; const t0 = performance.now();
        return new Promise((r) => {
            if (destroyed) return;
            const tick = () => {
                const u = Math.min(1, (performance.now() - t0) / (dur * 1000));
                fadeAlpha = from + (a - from) * u;
                if (u < 1) nextFrame(tick); else r();
            };
            tick();
        });
    }

    // --- effects the story asks for -------------------------------------------------------------------
    function endMapAssembly(completed) {
        if (!mapAssembly) return;
        const effect = mapAssembly; mapAssembly = null;
        effect.effect.destroy();
        if (completed && !destroyed) effect.resolve();
    }
    function frameFoldDemo() {
        if (!foldDemo) return;
        const W = app.screen.width, H = app.screen.height;
        // Labels, actors and the lifted patch stay above the touch controls. The
        // same authored frame is refitted on rotation, never a cached pixel crop.
        foldDemo.hint.frame.insets = { left: 38, right: 38, top: H > W ? 100 : 26, bottom: H > W ? 150 : 90 };
    }
    function endFoldDemo(completed) {
        if (!foldDemo) return;
        const demo = foldDemo; foldDemo = null;
        demo.effect.destroy();
        if (G.camHint === demo.hint) G.camHint = demo.before;
        cam.snap = !completed;
        // An abandoned scene must not resume its dialogue in a different scene.
        if (completed && !destroyed) demo.resolve();
    }
    async function fx(name, data) {
        if (destroyed) return new Promise(() => {});
        const def = S?.def;
        switch (name) {
            case 'mapAssemble': {
                endMapAssembly(false);
                const effect = createMapAssemble(PIXI, { texture: T, caption: STORY.k2.mapAssemble, lessMotion: G.lessMotion });
                overlay.addChild(effect.container);
                effect.fit(app.screen.width, app.screen.height);
                onFx?.('sfx', 'rustle');
                await new Promise((resolve) => { mapAssembly = { effect, elapsed: 0, state: effect.update(0), resolve }; });
                break;
            }
            case 'foldDemo': {
                endFoldDemo(false);
                const x = data.x, y = G.terrain.groundNear(x, data.y, 120) ?? data.y;
                const k = G.actors.klo;
                const kx = k?.visible && Math.abs(k.x - x) < h(5) ? k.x : x + h(1.6), ky = k?.y ?? y;
                const effect = createFoldDemo(PIXI, {
                    texture: T, x, y,
                    leftY: G.terrain.groundNear(x - 110, y, 120) ?? y,
                    rightY: G.terrain.groundNear(x + 110, y, 120) ?? y,
                    mapX: kx + 60, mapY: ky - 330, clawX: kx + 29, clawY: ky - 65,
                    labels: STORY.k1.mapDemoLabels, lessMotion: G.lessMotion
                });
                L.fx.addChild(effect.container);
                const frame = { ...effect.bounds };
                if (Math.abs(G.player.x - x) < h(5)) {
                    frame.x0 = Math.min(frame.x0, G.player.x - h(.8));
                    frame.x1 = Math.max(frame.x1, G.player.x + h(.8));
                    frame.y0 = Math.min(frame.y0, G.player.y - h(1.8));
                }
                const before = G.camHint, hint = { frame };
                G.camHint = hint;
                await new Promise((resolve) => {
                    foldDemo = { effect, elapsed: 0, state: effect.update(0), before, hint, resolve };
                    frameFoldDemo();
                });
                break;
            }
            case 'archOpen':
                emit('star', def.spots.arch.x, def.spots.arch.y - h(1.2), 16, { g: 0, speed: 260 });
                emit('glow', def.spots.arch.x, def.spots.arch.y - h(1), 6, { g: 0, speed: 80, life: 1.4 });
                await G.wait(1.2);
                break;
            case 'paperFill': {
                // the white page over the next chapter: look at it, then it turns away. A cover far off (the
                // other end of the scene) waits and peels by itself when the player first comes to it.
                const Wv = app.screen.width / cam.zoom;
                const pc = S.paper.find((q) => G.flags.has(q.pc.until) && q.state === 'waiting' && Math.abs((q.pc.under ? q.pc.x0 : q.pc.x1) - cam.x) < Wv * 1.6);
                if (!pc) { await G.wait(0.6); break; }
                const edge = pc.pc.under ? pc.pc.x0 : pc.pc.x1;
                const before = G.camHint;
                G.camHint = { x: edge + (pc.pc.under ? 1 : -1) * Wv * 0.24, y: cam.y, t0: G.time };
                await G.wait(1.2);
                await peelCover(pc);
                G.camHint = before;
                break;
            }
            case 'lamp':
                emit('glow', def.lamp.x, def.lamp.y, 10, { g: 0, speed: 120, life: 1.6 });
                emit('star', def.lamp.x, def.lamp.y, 16, { g: 0, speed: 300 });
                await G.wait(1.4);
                break;
            case 'lineAppears':
                S.routeReveal = { start: time, duration: G.lessMotion ? .2 : 1.2 };
                if (!G.lessMotion) for (const dl of S.dashed) if (dl.route) dl.route.update({ reveal: 0 });
                onFx?.('sfx', 'pencil');
                await G.wait(G.lessMotion ? .25 : 1.25);
                break;
            case 'pop':
                emit('drop', data.x, data.y, 14, { speed: 380 });
                await G.wait(0.2);
                break;
            case 'unfold': {
                // the page is lifted: the picture lies over the screen until cutToPicture turns it away
                endTurns();
                held = startTurn(capture(), { hinge: 'right', duration: 1.6, hold: true });
                if (!held) await fadeTo(0.9, 0.8, 0xfbf8f1);
                await G.wait(0.5);
                break;
            }
            case 'cutToPicture':
                cam.snap = true;
                if (held) { const tr = held; held = null; tr.hold = false; await tr.done; }
                else await fadeTo(0, 0.9);
                break;
            case 'plask': {
                const sp = def.spots.splash;
                emit('drop', sp.x, sp.y - h(0.4), 40, { speed: 620 });
                emit('foam', sp.x, sp.y - h(0.3), 20, { speed: 380 });
                cam.shake = 14;
                G.finalLabel = 1;
                await G.wait(2.4);
                G.finalLabel = 0;
                break;
            }
            case 'vista': {
                // turn to another page for a moment (the lighthouse at the end of Kapitel 2), then back
                const back = S.id;
                const save = { x: cam.x, y: cam.y, zoom: cam.zoom };
                const hintBefore = G.camHint, hiddenBefore = G.hideHero, vistaBefore = G.vista;
                const figureBefore = { ...G.actors.figure };
                G.vista = true;
                const t1 = setScene(data.scene, { turn: 'left' });
                G.hideHero = true;
                const frame = data.lighthouse ? lighthouseVista() : null;
                G.camHint = frame ? { frame } : { x: data.x, y: data.y, zoom: data.zoom || 1 };
                // The mirror comparison lasts as long as its dialogue. Reserve
                // that actual DOM rectangle without measuring layout each frame.
                let comparisonObserver = null;
                const fitComparison = () => {
                    if (!data.comparison || !frame || destroyed) return;
                    const W = app.screen.width, H = app.screen.height;
                    const dialog = app.canvas.closest('.sk-root')?.querySelector('.sk-dialogue.on') || document.querySelector('.sk-dialogue.on');
                    frame.insets = { left: 24, right: 24, top: 34, bottom: 34 };
                    if (!dialog) return;
                    const bounds = dialog.getBoundingClientRect(), canvas = app.canvas.getBoundingClientRect();
                    const sy = H / canvas.height, top = (bounds.top - canvas.top) * sy, bottom = (bounds.bottom - canvas.top) * sy;
                    if ((top + bottom) / 2 > H / 2) frame.insets.bottom = Math.min(H - 130, H - top + 22);
                    else frame.insets.top = Math.min(H - 130, bottom + 22);
                };
                if (data.comparison && frame) {
                    fitComparison();
                    const dialog = document.querySelector('.sk-dialogue');
                    if (dialog && typeof ResizeObserver !== 'undefined') {
                        comparisonObserver = new ResizeObserver(fitComparison); comparisonObserver.observe(dialog);
                        comparisonObservers.add(comparisonObserver);
                    }
                }
                if (!frame) { cam.x = data.x; cam.y = data.y; cam.zoom = (data.zoom || 1) * 0.6; }
                cam.snap = false;
                try {
                    if (t1) await t1.done; else await fadeTo(0, 0.4);
                    if (destroyed) return;
                    if (S.vista) S.vista.phase = 'holding';
                    if (data.peek) {
                        const fig = G.actors.figure, lamp = S.def.lamp;
                        Object.assign(fig, { scene: data.scene, x: lamp?.x ?? data.x, y: lamp ? lamp.y + 45 : data.y - h(1.0), visible: true, pose: 'kv-peek', facing: -1 });
                        await G.wait(1.2);
                        if (destroyed) return;
                        fig.visible = false;
                        onFx?.('sfx', 'latch');
                    }
                    const dialogue = data.whileVisible?.();
                    fitComparison();
                    await dialogue;
                    if (destroyed) return;
                    await G.wait(data.hold ?? Math.max(0.5, (data.t || 2) - 1.6));
                } finally {
                    comparisonObserver?.disconnect();
                    comparisonObservers.delete(comparisonObserver);
                    if (!destroyed) {
                        if (S.vista) S.vista.phase = 'leaving';
                        Object.assign(G.actors.figure, figureBefore);
                        const t2 = setScene(back, { turn: 'right' });
                        G.vista = vistaBefore; G.hideHero = hiddenBefore;
                        G.camHint = hintBefore;
                        Object.assign(cam, save); cam.snap = false;
                        if (t2) await t2.done; else fadeAlpha = 0;
                    }
                }
                break;
            }
            case 'epilogue':
                await onFx?.('epilogue', data);
                break;
            default:
                await G.wait(0.3);
        }
    }

    function resize() {
        if (tooth) { tooth.width = app.screen.width; tooth.height = app.screen.height; }
        cam.snap = true;
        frameFoldDemo();
        mapAssembly?.effect.fit(app.screen.width, app.screen.height);
    }

    function destroy() {
        if (destroyed) return;
        destroyed = true;
        for (const id of pendingFrames) cancelAnimationFrame(id);
        pendingFrames.clear();
        for (const observer of comparisonObservers) observer.disconnect();
        comparisonObservers.clear();
        offs.forEach((o) => o());
        endTurns();
        clearScene();
        hero.destroy?.();
        root.destroy({ children: true });
    }

    return {
        setScene, render, fx, resize, destroy, cam, emit, fadeTo,
        /** a page is lying over the screen, waiting to turn (the unfold): scene changes should not turn another */
        get holding() { return !!held; },
        get sceneId() { return S?.id; },
        get vista() { return S?.vista || null; },
        get foldDemo() { return foldDemo ? { ...foldDemo.state, elapsed: foldDemo.elapsed, bounds: { ...foldDemo.hint.frame } } : null; },
        get mapAssembly() { return mapAssembly ? { ...mapAssembly.state, elapsed: mapAssembly.elapsed } : null; },
        kloBounds() { return S?.obj?.klo?.visible ? S.obj.klo.getBounds() : null; },
        built(id) { return S?.id === id && S.placeholders === 0; },
        replaceHero(newHero) { L.hero.removeChild(hero.view); hero.destroy?.(); hero = newHero; L.hero.addChild(hero.view); },
        world, root, layers: L,
        /** Render the current scene into a texture with a given camera (the prologue picture). */
        snapshot({ x, y, zoom, width, height, skyFactor }) {
            const rt = PIXI.RenderTexture.create({ width, height, resolution: 1 });
            const save = { x: cam.x, y: cam.y, zoom: cam.zoom };
            const sw = app.screen.width, sh = app.screen.height;
            cam.x = x; cam.y = y; cam.zoom = zoom;
            world.scale.set(zoom);
            world.position.set(width / 2 - x * zoom, height / 2 - y * zoom);
            for (const b of S.bg) { const tw = b.texture.width, th = b.texture.height; const sc = Math.max(width / tw, height / th); b.scale.set(sc); b.x = (width - tw * sc) / 2; b.y = (height - th * sc) / 2; }
            for (const it of S.sky) { it.s.x = width / 2 + (it.x - x) * zoom * it.par; it.s.y = height / 2 + (it.y - y) * zoom * (skyFactor ?? Math.max(0.5, it.par * 2.5)); it.s.scale.set(zoom * (it.s._baseScale || 1)); }
            const vis = { root: root.visible, hero: hero.view.visible, actors: L.actors.visible, hints: L.hints.visible, fx: L.fx.visible };
            root.visible = true;
            hero.view.visible = !G.hideHero;
            L.actors.visible = !G.hideActors;
            L.hints.visible = false; L.fx.visible = false;
            const splashes = G.snapNoSplash ? S.items.filter((q) => q.it.frozen && q.s.visible) : [];
            for (const q of splashes) q.s.visible = false;
            overlay.visible = false;
            app.renderer.render({ container: root, target: rt, clear: true });
            overlay.visible = true;
            for (const q of splashes) q.s.visible = true;
            root.visible = vis.root; hero.view.visible = vis.hero; L.actors.visible = vis.actors; L.hints.visible = vis.hints; L.fx.visible = vis.fx;
            Object.assign(cam, save);
            world.scale.set(cam.zoom);
            world.position.set(sw / 2 - cam.x * cam.zoom, sh / 2 - cam.y * cam.zoom);
            return rt;
        }
    };
}
