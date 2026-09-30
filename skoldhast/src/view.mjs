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
import { terrainShape, clipX } from './terrain-shape.mjs';
import { createKlo } from './klo.mjs';
import { createGuardian } from './guardian.mjs';
import { createWaterLight, createAtmosphere, seaAnchorY } from './scenery.mjs';
import { pencilAvailable } from './puzzles.mjs';
import { createRouteCue, createPencilBeam } from './route-cue.mjs';
import { createActionCue } from './action-cue.mjs';
import { createFoldDemo, FOLD_BEACH } from './fold-demo.mjs';
import { createMapAssemble } from './map-assemble.mjs';
import { createMapFragmentProp, createGuardianMapPaper } from './map-props.mjs';
import { createFoldedSeabed } from './folded-seabed.mjs';
import { createVaultDiscovery } from './vault-discovery.mjs';
import { createKvMemory } from './kv-memory.mjs';
import { createWorldCoastFold, createShoreTrial, sampleShoreTrial } from './shore-trial.mjs';
import { createSeaFoldWall, createSeaFoldCoverEdge } from './sea-fold-wall.mjs';
import { createLighthouseMechanisms } from './lighthouse-mechanisms.mjs';
import { createBeachPlay } from './beach-play.mjs';
import { landPuzzleFrame, fitLandPuzzleFrame } from './land-puzzle-focus.mjs';
import { createWaveEvidence } from './wave-evidence.mjs';
import { cloudSkyLayout } from './cloud-sky.mjs';
import { createStuckWave, STILL_CLOCK } from './stuck-wave.mjs';
import { STORY, MAP } from './content/sv.mjs';

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
    let foldRequest = 0;
    let mapAssembly = null;
    let mapRequest = 0;
    let kvMemory = null; // Kartväktaren's memory card while he explains the fold
    let shoreTrial = null;
    let landFocus = null;
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
    const bgLayer = new PIXI.Container();       // screen space backdrops (skies)
    const skyLayer = new PIXI.Container();      // parallax sky props (sun, clouds, gulls)
    const bgFront = new PIXI.Container();       // backdrop layers in front of the sky props: hills, cliffs, far water, the depths
    const world = new PIXI.Container();         // camera transform
    const overlay = new PIXI.Container();       // screen space: tooth, darkness, fades
    const turnLayer = new PIXI.Container();     // screen space: pages turning away (scene changes, the unfold)
    root.addChild(bgLayer, skyLayer, bgFront, world, overlay, turnLayer);
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
        const d = { def, items: [], dyn: [], ropes: [], waters: [], sky: [], bg: [], paper: [], dashed: [], kelp: [], disposers: [], caustics: [] };
        d.atmosphere = createAtmosphere(PIXI, { scene: def.id });
        L.far.addChild(d.atmosphere.view);
        // backdrops
        for (const b of def.backdrop || []) {
            const t = T(b.image);
            const s = t ? new PIXI.Sprite(t) : new PIXI.Graphics().rect(0, 0, 64, 64).fill({ color: def.underwater ? 0x6fa6a8 : 0xd9ebf5 });
            s._bg = b; s._img = b.image;
            bgLayer.addChild(s);
            d.bg.push(s);
            // A sea pinned to the world can end above the screen's bottom edge;
            // its deepest row continues below it.
            if (b.seaY !== undefined) { s._under = new PIXI.Graphics(); s._under.label = 'backdrop-sea-underlay'; bgLayer.addChild(s._under); }
            // Layers in front of the sky props, each moving at its own depth.
            s._layers = [];
            for (const l of b.layers || []) {
                const lt = T(l.image);
                if (!lt) continue;
                const ls = l.repeat ? new PIXI.TilingSprite({ texture: lt, width: 64, height: 64 }) : new PIXI.Sprite(lt);
                ls._layer = l; ls._img = l.image; ls.label = 'backdrop-' + l.image;
                bgFront.addChild(ls);
                if (l.fill !== undefined) { ls._below = new PIXI.Graphics(); bgFront.addChild(ls._below); }
                s._layers.push(ls);
            }
            // The water's depths, hung from the real surface.
            if (b.under && T(b.under.image)) {
                const u = new PIXI.TilingSprite({ texture: T(b.under.image), width: 64, height: 64 });
                u._layer = b.under; u.label = 'backdrop-depths';
                u._below = new PIXI.Graphics();
                bgFront.addChild(u, u._below);
                s._depths = u;
            }
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
                const th = thickness(s);
                const poly = [...pts, ...pts.slice().reverse().map(([x, y]) => [x, y + th])];
                d.dyn.push({ kind: 'thin', s, poly, when: s.when, th });
                continue;
            }
        }
        L.terrainBack.addChild(ground, groundTop, groundLines);
        d.ground = ground; d.groundTop = groundTop; d.groundLines = groundLines;
        d.rebuildGround = () => {
            ground.clear(); groundTop.clear();
            for (const child of groundLines.removeChildren()) child.destroy({ children: true });
            const active = G.terrain?.scene === def ? G.terrain.surfaces : def.surfaces.filter(s => cond(s.when, G.flags));
            const shape = terrainShape(active);
            for (const { s, pts: run } of shape.runs) {
                // A drawn-only tail carries a seabed past the playable edge, so the
                // sea never ends in a cut-off wall of backdrop under the jetty.
                const pts = s.tail && run.at(-1)[0] === s.pts.at(-1)[0] ? [...run, ...s.tail] : run;
                const x0 = pts[0][0], x1 = pts.at(-1)[0];
                if (s.boardwalk) { boardwalk(s, pts, ground, groundTop, groundLines, bottom); continue; }
                const baseMat = s.edgeMat || (s.ramp ? 'earth' : s.mat);
                fillPoly(ground, [...pts, [x1, bottom], [x0, bottom]], baseMat);
                if (baseMat !== s.mat) {
                    fillPoly(groundTop, [...pts, ...pts.slice().reverse().map(([x,y]) => [x,y+46])], s.mat);
                }
                if (pts !== run) groundLines.addChild(rope('stroke-graphite', resamplePts([run.at(-1), ...s.tail], 50), { width: 5 }));
            }
            // Where two sandy materials meet on one continuous surface, blend them
            // over a short stretch instead of a ruler-straight vertical seam down
            // the whole page (e.g. the dunes' dry sand into the pool's wet sand).
            const SOFT = new Set(['sand', 'wetsand', 'earth', 'seabed']);
            const matOf = (s) => s.edgeMat || (s.ramp ? 'earth' : s.mat);
            for (let i = 1; i < shape.runs.length; i++) {
                const a = shape.runs[i - 1], b = shape.runs[i], ma = matOf(a.s), mb = matOf(b.s);
                const [ax, ay] = a.pts.at(-1), [bx, by] = b.pts[0];
                if (ma === mb || !SOFT.has(ma) || !SOFT.has(mb) || Math.abs(ax - bx) > 1e-6 || Math.abs(ay - by) > 1e-6) continue;
                const N = 8, span = 110;
                for (const [run, mat, dir] of [[b, ma, 1], [a, mb, -1]]) {
                    const lo = run.pts[0][0], hi = run.pts.at(-1)[0];
                    for (let k = 0; k < N; k++) {
                        const x0 = bx + dir * span * k / N, x1 = bx + dir * span * (k + 1) / N;
                        const top = clipX(run.pts, Math.max(lo, Math.min(x0, x1)), Math.min(hi, Math.max(x0, x1)));
                        if (top.length < 2) continue;
                        fillPoly(ground, [...top, [top.at(-1)[0], bottom], [top[0][0], bottom]], mat, .5 * (1 - (k + .5) / N));
                    }
                }
            }
            if (def.paperBelow) paperBelow(def, shape, ground, bottom);
            groundLips(shape, groundLines);
            if (def.roots) groundRoots(shape, groundLines);
            // Her dark-blue waterline where the sand meets the painted sea, ending
            // exactly where the sea's own surface line begins. Graphite elsewhere
            // (and under the water); it overlaps the blue a little at its start.
            const wl = herWaterline(def);
            for (const pts of shape.outlines) {
                if (!wl) { groundLines.addChild(rope('stroke-graphite', resamplePts(pts, 50), { width: 5 })); continue; }
                for (const part of [clipX(pts, -Infinity, wl.x0 + 40), clipX(pts, wl.x1, Infinity)]) {
                    if (part.length > 1) groundLines.addChild(rope('stroke-graphite', resamplePts(part, 50), { width: 5 }));
                }
                const blue = clipX(pts, wl.x0, wl.x1);
                if (blue.length > 1) { const r = rope('stroke-blue', resamplePts(blue, 50), { color: 0x244f8f, width: 4 }); r.label = 'her-waterline'; groundLines.addChild(r); }
            }
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
                        it.g.moveTo(x, y + 2).lineTo(x + 1, y + it.th - 2);
                    }
                    it.g.stroke({ width: 2, color: 0x6b4a2c, alpha: 0.45 });
                }
                it.r = rope('stroke-graphite', resamplePts(it.s.pts, 50), { width: 5 });
                it.c = new PIXI.Container();
                it.c.addChild(it.g, it.r);
                (it.kind === 'ramp' ? L.terrainBack : L.mid).addChild(it.c);
                if (it.s.prop) { const ps = spr(it.s.prop); ps.x = (it.s.pts[0][0] + it.s.pts[it.s.pts.length - 1][0]) / 2; ps.y = heightOn(it.s.pts, ps.x) + 34; it.c.addChild(ps); it.g.visible = false; it.r.visible = false; }
                // a log or a flat stone to hop onto rests on a hump of the ground, not on air
                if (it.s.mound) {
                    const a = it.s.pts[0][0], b = it.s.pts.at(-1)[0], rest = heightOn(it.s.pts, (a + b) / 2) + 30;
                    const ground = drawnGround(d.def), hump = [];
                    for (let k = 0; k <= 16; k++) {
                        const u = k / 16, x = lerp(a - h(0.35), b + h(0.35), u), gy = ground(x) ?? rest;
                        const lift = Math.pow(Math.sin(Math.PI * u), 0.7);
                        hump.push([x, lerp(gy + 6, Math.min(gy, rest), lift)]);
                    }
                    const m = new PIXI.Graphics();
                    fillPoly(m, [...hump, ...hump.slice().reverse().map(([x]) => [x, (ground(x) ?? rest) + 40])], it.s.mound);
                    const edge = rope('stroke-graphite', resamplePts(hump.slice(2, -2), 30), { width: 4, alpha: .85 });
                    it.c.addChildAt(edge, 0); it.c.addChildAt(m, 0);
                }
            }
        }
        // water
        for (const w of def.waters || []) {
            if (w.kind === 'pipe') continue;
            const yb = w.bottom ?? bottom;
            // A sea under open sky is split into the stretches where the ground
            // really dips below its surface; elsewhere it keeps its authored box.
            const spans = !def.underwater && (w.kind === 'sea' || w.kind === 'pool') ? seaSpans(def, w, yb)
                : [{ x0: w.x0, x1: w.x1, poly: [[w.x0, w.top], [w.x1, w.top], [w.x1, yb], [w.x0, yb]] }];
            for (const [i, span] of spans.entries()) {
                const wb = { w, span, g: new PIXI.Graphics(), surf: null, refl: null };
                // A translucent pencil veil should tint the creature, not erase its
                // legs under repeating white water hatching.
                const alpha = def.underwater ? 0.12 : w.kind === 'pool' ? 0.36 : 0.26;
                fillPoly(wb.g, span.poly, def.underwater ? 'mat-deep' : 'mat-water', alpha);
                if (!T('mat-water')) { wb.g.clear(); wb.g.poly(span.poly.flat()).fill({ color: 0x5b9bd0, alpha: alpha * 0.8 }); }
                L.waterFront.addChild(wb.g);
                // Include both exact bank endpoints, including widths not divisible
                // by the pencil segment length. Connected bodies share their join.
                const pts = resamplePts([[span.x0, w.top], [span.x1, w.top]], 50);
                wb.surfBase = pts.map((p) => p.slice());
                wb.surf = rope('stroke-blue', pts, { color: 0x244f8f, width: 4 });
                L.waterFront.addChild(wb.surf);
                if (w.mirror && i === 0) wb.refl = buildReflection(def, w);
                d.waters.push(wb);
                wb.light = createWaterLight(PIXI, { ...w, x0: span.x0, x1: span.x1 }, { underwater: def.underwater });
                L.waterFront.addChild(wb.light.view);
            }
        }
        buildShores(def, d);
        buildPosts(def, d);
        buildTubes(def);
        buildBacks(def, d);
        buildBuried(def);
        if (def.underwater) {
            // Air, tint, pencil line and buoyancy use the same authored surface.
            // A separate hardcoded y=0 edge used to put air 180 units above the
            // cave's water and created a second, apparently disconnected horizon.
            const sky = new PIXI.Graphics();
            const bodies = d.waters.map(wb => wb.w).sort((a, b) => a.x0 - b.x0);
            const airTop = def.bounds.y0 - h(10);
            for (const [i, w] of bodies.entries()) {
                const x0 = i === 0 ? def.bounds.x0 - h(20) : w.x0;
                const x1 = i === bodies.length - 1 ? def.bounds.x1 + h(20) : w.x1;
                sky.rect(x0, airTop, x1 - x0, w.top - airTop);
            }
            sky.fill({ color: 0xd6e8f2 }); sky.label = 'water-air';
            d.waterTop = bodies[0]?.top ?? 0;
            L.far.addChild(sky);
            d.skyBand = sky;
            buildDepth(def, d);
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
                    let H = h(2.2 + Math.random() * 2.6);
                    // under a cave roof a frond stays below it
                    const roof = slabBottomAt(def, x);
                    if (roof !== null && roof < fy) { H = Math.min(H, fy - roof - h(0.25)); if (H < h(0.7)) continue; }
                    const n = 10;
                    const pts = []; for (let k = 0; k <= n; k++) pts.push([x, fy - H * (1 - k / n)]); // top first
                    const r = strip('kelp-strip', n, 44 + Math.random() * 48) || rope('kelp-strip', pts, { color: 0x3e7a34, width: 22 });
                    const fore = it.layer === 'fore';
                    if (fore) r.alpha = 0.6; // the sköldhäst stays visible through the front fronds
                    // held to the bed by a dark holdfast, now and then on a stone
                    const hold = new PIXI.Graphics();
                    hold.ellipse(0, -4, 20, 9).fill({ color: 0x24501f, alpha: .85 });
                    hold.moveTo(-18, -2).lineTo(-26, 6).moveTo(16, -2).lineTo(25, 7).moveTo(-4, 2).lineTo(-6, 10).stroke({ width: 3, color: 0x24501f, alpha: .8, cap: 'round' });
                    hold.x = x; hold.y = fy;
                    if (!fore && Math.random() < 0.35) { const st = spr('seabed-rock-' + (1 + (i % 3))); if (!st._placeholder) { st.scale.set(0.45); st.position.set(8, 6); hold.addChildAt(st, 0); } else st.destroy(); }
                    (fore ? L.fore : L.mid).addChild(hold, r);
                    // the currents run east here: fronds lean with them, some more than others
                    const lean = h(0.12) + Math.random() * h(0.3);
                    d.kelp.push({ r, hold, pts, x, fy, H, n, fore, lean, phase: Math.random() * 6, chapter: it.chapter });
                }
                continue;
            }
            if (it.frozen) {
                // The wave the opening stopped: its run-up meets the sea's own
                // waterline, and its drops hang exactly where the fold caught them.
                const sea = (def.waters || []).find(w => w.kind === 'sea');
                const wave = createStuckWave(PIXI, { texture: T, ground: drawnGround(def), x: it.x, y: it.y, seaTop: sea?.top ?? 0 });
                wave.settle(G.stuckWaveClock ?? STILL_CLOCK);
                (it.layer === 'fore' ? L.fore : L.mid).addChild(wave.view);
                d.items.push({ s: wave.view, it, wave });
                continue;
            }
            if (it.sprite === 'veckmuren') {
                const boundary = def.walls.find(wall => wall.id === 'fold');
                const seaTop = def.waters.find(water => water.kind === 'sea')?.top ?? 0;
                const foot = drawnGround(def)(boundary.x) ?? it.y;
                const fold = createSeaFoldWall(PIXI, { texture: T, x: boundary.x,
                    top: seaTop - 140, bottom: Math.min(boundary.y1, foot + 35), width: h(2.15) });
                L.mid.addChild(fold.container);
                d.items.push({ s: fold.container, it });
                continue;
            }
            if (it.sprite === 'wave-marks') {
                const face = createWaveEvidence(PIXI, { texture: T, x: it.x, ground: drawnGround(def), scale: it.scale || 1 });
                L.mid.addChild(face);
                d.items.push({ s: face, it });
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
        // Her own pencil cloud stays in the distant land sky, at a readable size.
        if (def.id === 'land' && G.userCloud) {
            const s = new PIXI.Sprite(G.userCloud);
            s.anchor.set(0.5); s.alpha = 0.94; s.label = 'user-cloud';
            skyLayer.addChild(s);
            d.userCloud = s;
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
            // a finished line that becomes a real object (the P2 plank, as the reflection shows it)
            let solid = null;
            if (ds.solid) {
                const a = ds.pts[0], b = ds.pts[ds.pts.length - 1];
                solid = spr(ds.solid); solid.anchor?.set?.(0.5);
                solid.x = (a[0] + b[0]) / 2; solid.y = (a[1] + b[1]) / 2 + 6;
                solid.scale.x = distances.at(-1) / (solid.width || distances.at(-1));
                solid.visible = false; c.addChild(solid);
            }
            (ds.decal ? L.mid : L.objects).addChild(c);
            const route = ds.glow ? createRouteCue(PIXI, pts, { label: ds.id }) : null;
            if (route) L.hints.addChild(route.container);
            d.dashed.push({ ds, c, glow, dash, ink, solid, route, pts, distances, len: distances.at(-1), x0: Math.min(ds.pts[0][0], ds.pts[ds.pts.length - 1][0]), x1: Math.max(ds.pts[0][0], ds.pts[ds.pts.length - 1][0]), y: ds.pts[0][1] });
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
            if (pc.id === 'trench-paper') c.addChild(createSeaFoldCoverEdge(PIXI,
                { texture: T, x: pc.x0, top: y0, bottom: y1 }));
            L.cover.addChild(c);
            // covered → (the chapter is out) waiting → turning (peels away like a page) → gone
            const state = !G.flags.has(pc.until) ? 'covered' : G.flags.has('peeled_' + pc.id) ? 'gone' : 'waiting';
            if (state === 'gone') c.visible = false;
            d.paper.push({ pc, c, state, wait: 0 });
        }
        // Mörka valvet: its rock arch and the dark under it
        buildVaults(def, d);
        buildSceneObjects(def, d);
        buildContactShadows(def, d);
        return d;
    }

    /** A vertical gradient texture from colour stops [[t, 'rgba(...)'], ...]. */
    const gradients = [];
    function gradientTexture(stops) {
        const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256;
        const c = cv.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 256);
        for (const [t, col] of stops) gr.addColorStop(t, col);
        c.fillStyle = gr; c.fillRect(0, 0, 2, 256);
        const t = PIXI.Texture.from(cv);
        gradients.push(t);
        return t;
    }

    /**
     * Under water the light comes from above: the water is paler and greener
     * just under the surface, whose underside shines, and deepens toward the
     * trench; the seabed where the light still reaches shimmers.
     */
    function buildDepth(def, d) {
        const top = d.waterTop, x0 = def.bounds.x0 - h(20), x1 = def.bounds.x1 + h(20), deep = def.bounds.y1 - top;
        const body = new PIXI.Sprite(gradientTexture([[0, 'rgba(226,244,232,0.42)'], [0.12, 'rgba(226,244,232,0.12)'], [0.3, 'rgba(40,96,104,0)'], [0.72, 'rgba(24,70,80,0.2)'], [1, 'rgba(16,52,62,0.36)']]));
        body.position.set(x0, top); body.width = x1 - x0; body.height = deep; body.label = 'water-depth';
        const underside = new PIXI.Sprite(gradientTexture([[0, 'rgba(255,255,250,0.7)'], [0.35, 'rgba(240,250,244,0.25)'], [1, 'rgba(240,250,244,0)']]));
        underside.position.set(x0, top); underside.width = x1 - x0; underside.height = 70; underside.label = 'water-underside';
        L.far.addChild(body, underside);
        // the deep shade also falls on the seabed and the swimmer, gently
        const shade = new PIXI.Sprite(gradientTexture([[0, 'rgba(16,52,62,0)'], [0.45, 'rgba(16,52,62,0)'], [1, 'rgba(16,52,62,0.2)']]));
        shade.position.set(x0, top); shade.width = x1 - x0; shade.height = deep; shade.label = 'water-deep-shade';
        L.waterFront.addChild(shade);
        // dancing light on the seabed, where it is shallow enough for daylight
        d.caustics = [];
        const groundAt = drawnGround(def);
        for (let x = def.bounds.x0 + 40; x < def.bounds.x1; x += 64) {
            const y = groundAt(x);
            if (y === null || y - top > h(7.2)) continue;
            const g = new PIXI.Graphics();
            const k = Math.sin(x * 12.9898) * 43758.5453, r = k - Math.floor(k);
            const w = 22 + r * 26;
            g.moveTo(-w / 2, 0).quadraticCurveTo(0, -6 - r * 4, w / 2, 1).stroke({ width: 3, color: 0xfaffef, alpha: .9, cap: 'round' });
            if (r > 0.4) g.moveTo(-w / 3, 9).quadraticCurveTo(0, 5, w / 3, 10).stroke({ width: 2, color: 0xfaffef, alpha: .6, cap: 'round' });
            g.x = x + (r - 0.5) * 30; g.y = y + 10 + r * 26;
            const fade = 1 - (y - top) / h(7.2);
            L.terrainBack.addChild(g);
            d.caustics.push({ g, base: 0.2 + 0.4 * fade, phase: r * 6.3, x: g.x });
        }
    }

    /** The underside of a cave roof at x, or null where there is none. */
    function slabBottomAt(def, x) {
        let best = null;
        for (const sl of def.slabs || []) { const y = heightOn(sl.bottom, x); if (y !== null && (best === null || y > best)) best = y; }
        return best;
    }

    /**
     * Mörka valvet as a real arch: a rock roof you swim under (or over), its
     * legs and back wall behind the swimmer, and under it a darkness in its own
     * shape that the lyktfiskar light as they come, until the whole vault is lit.
     */
    function buildVaults(def, d) {
        d.vaults = [];
        const groundAt = drawnGround(def);
        for (const v of def.vaults || []) {
            const sl = def.slabs.find(q => q.id === v.roof);
            const x0 = sl.bottom[0][0], x1 = sl.bottom.at(-1)[0];
            const under = (x) => heightOn(sl.bottom, clamp(x, x0, x1));
            // behind: the arch's back wall and its two legs, in shade
            // behind: the cave's far wall, in shade, fading out toward both mouths
            const back = new PIXI.Graphics(); back.label = 'vault-back';
            const fadeIn = h(0.9);
            for (let x = x0; x < x1; x += 20) {
                const b = Math.min(x + 20, x1), mid = (x + b) / 2, e = clamp(Math.min(mid - x0, x1 - mid) / fadeIn, 0, 1);
                const a = e * e * (3 - 2 * e);
                if (a < 0.02) continue;
                const quad = [[x, under(x) - 6], [b, under(b) - 6], [b, (groundAt(b) ?? def.bounds.y1) + 50], [x, (groundAt(x) ?? def.bounds.y1) + 50]];
                fillPoly(back, quad, 'rock', a * 0.9);
                back.poly(quad.flat()).fill({ color: 0x1d3640, alpha: a * 0.42 });
                // darkest just under the roof
                back.poly([quad[0], quad[1], [b, under(b) + 70], [x, under(x) + 70]].flat()).fill({ color: 0x14262e, alpha: a * 0.25 });
            }
            L.far.addChild(back);
            // the roof: rock, outlined, shaded underneath, with weed hanging from it
            const roof = new PIXI.Graphics(); roof.label = 'vault-roof';
            const poly = [...sl.top, ...sl.bottom.slice().reverse()];
            fillPoly(roof, poly, 'rock');
            roof.poly([...sl.bottom, ...sl.bottom.slice().reverse().map(([x, y]) => [x, y - 44])].flat()).fill({ color: 0x1d3640, alpha: .3 });
            for (let x = x0 + 70; x < x1 - 40; x += 95) {
                const y = heightOn(sl.bottom, x), len = 30 + ((x * 7) % 5) * 12;
                roof.moveTo(x, y - 4).quadraticCurveTo(x + 10, y + len * 0.5, x + 4, y + len);
            }
            roof.stroke({ width: 3, color: 0x2f6a3a, alpha: .8, cap: 'round' });
            const lines = new PIXI.Container();
            lines.addChild(rope('stroke-graphite', resamplePts(sl.top, 40), { width: 5 }), rope('stroke-graphite', resamplePts(sl.bottom, 40), { width: 5 }));
            L.terrainBack.addChild(roof, lines);
            // the dark: strips from the roof to the floor, fading out past each mouth
            const dark = new PIXI.Graphics(); dark.label = 'vault-dark';
            L.fore.addChild(dark);
            const strips = [];
            const mouth = h(0.55);
            for (let x = x0; x < x1; x += 20) {
                const a = x, b = Math.min(x + 20, x1), mid = (a + b) / 2;
                const env = clamp(Math.min(mid - x0, x1 - mid) / mouth, 0, 1);
                strips.push({ a, b, mid, env: env * env * (3 - 2 * env), top: [under(a) - 4, under(b) - 4], bottom: [(groundAt(a) ?? def.bounds.y1) + 50, (groundAt(b) ?? def.bounds.y1) + 50] });
            }
            // the lamps: where the lyktfiskar settle once they have lit it
            const lamps = [];
            for (let i = 0; i < (v.lamps || 7); i++) { const x = lerp(x0 + h(0.55), x1 - h(0.55), i / Math.max(1, (v.lamps || 7) - 1)); lamps.push([x, under(x) + 70 + (i % 2) * 36]); }
            // after it is lit: warm light on the back wall at each lamp
            const glow = new PIXI.Container(); glow.label = 'vault-glow';
            for (const [x, y] of lamps) {
                const gl = new PIXI.Sprite(shadeTexture()); gl.anchor.set(0.5); gl.position.set(x, y + 60);
                gl.width = h(1.8); gl.height = h(1.5); gl.tint = 0xffe7a6; gl.alpha = 0.8; glow.addChild(gl);
            }
            glow.alpha = G.flags.has(v.until) ? 1 : 0;
            L.far.addChild(glow);
            const lit = G.flags.has(v.until) ? 1 : 0;
            const discovery = createVaultDiscovery(PIXI, { texture: T, x0, x1, roofAt: under, groundAt });
            L.far.addChild(discovery.container);
            d.vaults.push({ v, sl, dark, strips, lamps, glow, back, roof, lines, discovery, fade: 1 - lit, key: '' });
        }
    }

    /** The dark follows the lyktfiskar's light, and fades away once they have lit the vault. */
    function updateVaults(dt) {
        const O = S.obj, F = G.flags;
        for (const vt of S.vaults) {
            const lit = F.has(vt.v.until);
            const show = !(vt.sl.chapter && !F.has('ch' + vt.sl.chapter + '_open'));
            vt.back.visible = vt.roof.visible = vt.lines.visible = show;
            vt.fade = damp(vt.fade, lit ? 0 : 1, 1.1, dt);
            vt.glow.alpha = 1 - vt.fade;
            vt.discovery.container.visible = show;
            vt.discovery.update({ lit, light: 1 - vt.fade, reducedMotion: G.lessMotion, time: G.time });
            vt.dark.visible = show && vt.fade > 0.005;
            if (!vt.dark.visible) continue;
            // the school's light: the swimmers' centre while they are out (their bed, or following the shell)
            const sch = G.puz.school, fishOut = O.school?.length && F.has('ch2_open');
            const lx = fishOut ? sch.x : -1e9, ly = fishOut ? sch.y : -1e9, R = h(2.3);
            const key = `${Math.round(lx / 10)},${Math.round(ly / 10)},${Math.round(vt.fade * 60)}`;
            if (key === vt.key) continue;
            vt.key = key;
            vt.dark.clear();
            const tex = T('mat-deep');
            for (const st of vt.strips) {
                const my = (st.top[0] + st.bottom[0]) / 2;
                const l = clamp(1 - Math.hypot(st.mid - lx, (my - ly) * 0.8) / R, 0, 1);
                const a = 0.9 * st.env * (1 - 0.82 * l * l * (3 - 2 * l)) * vt.fade;
                if (a < 0.01) continue;
                const quad = [st.a, st.top[0], st.b, st.top[1], st.b, st.bottom[1], st.a, st.bottom[0]];
                vt.dark.poly(quad).fill({ color: 0x0c1d26, alpha: a * 0.8 });
                if (tex) vt.dark.poly(quad).fill({ texture: tex, textureSpace: 'global', color: 0x2c4654, alpha: a * 0.45 });
            }
        }
    }

    /** A soft oval of shade, white so a tint can colour it. */
    let shadeTex = null;
    function shadeTexture() {
        if (shadeTex) return shadeTex;
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32;
        const c = cv.getContext('2d');
        c.setTransform(1, 0, 0, 0.25, 0, 0);
        const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
        shadeTex = PIXI.Texture.from(cv);
        return shadeTex;
    }

    /**
     * Everything that stands on the ground gets a little shade where it touches
     * it (her sköldhäst has its brown patch; the world's things should too).
     * Her picture is left exactly as she drew it.
     */
    function buildContactShadows(def, d) {
        d.shades = [];
        const groundAt = drawnGround(def), keep = def.pictureX || [Infinity, -Infinity];
        const layer = new PIXI.Container(); layer.label = 'contact-shadows';
        for (const parent of [L.mid, L.objects, L.fore]) {
            for (const s of parent.children) {
                if (!(s instanceof PIXI.Sprite) || s instanceof PIXI.TilingSprite || (s.anchor?.y ?? 0) < 0.95) continue;
                const w = Math.abs(s.width);
                if (w < 28 || s.alpha < 0.5) continue;
                if (s.x > keep[0] && s.x < keep[1]) continue;
                const gy = groundAt(s.x);
                if (gy === null || Math.abs(s.y - gy) > 26) continue;
                const sh = new PIXI.Sprite(shadeTexture());
                sh.anchor.set(0.5); sh.x = s.x; sh.y = gy + 3;
                sh.width = w * 1.05; sh.height = Math.min(30, Math.max(12, w * 0.16));
                sh.tint = def.underwater ? 0x1f4a52 : 0x5b4128;
                sh.alpha = def.underwater ? 0.22 : 0.3;
                layer.addChild(sh);
                d.shades.push({ s, sh });
            }
        }
        L.terrainBack.addChild(layer);
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

    /** Where her blue waterline runs: from its authored start to the named sea's shore. */
    function herWaterline(def) {
        const w = def.waterline && (def.waters || []).find(q => q.id === def.waterline.sea);
        const shore = w && seaSpans(def, w, def.bounds.y1 + h(4))[0];
        return shore ? { x0: def.waterline.x0, x1: shore.x0 } : null;
    }

    /** The drawn ground at x, including drawn-only seabed tails. */
    function drawnGround(def) {
        const solid = def.surfaces.filter(s => !s.thin && cond(s.when, G.flags));
        const lines = [...solid.map(s => s.pts), ...solid.filter(s => s.tail).map(s => [s.pts.at(-1), ...s.tail])];
        return (x) => {
            let best = null;
            for (const pts of lines) { const y = heightOn(pts, x); if (y !== null && (best === null || y < best)) best = y; }
            return best;
        };
    }

    /**
     * A sea never paints over dry sand or rock. Each stretch starts exactly
     * where the ground dips below the surface, so the waterline begins at the
     * shore instead of crossing the beach, and its veil follows the bed rather
     * than cutting a rectangle into the land below.
     */
    function seaSpans(def, w, yb) {
        const groundAt = drawnGround(def);
        const wet = (x) => { const g = groundAt(x); return g === null || g > w.top + 0.5; };
        const edge = (dry, damp) => { for (let i = 0; i < 16; i++) { const m = (dry + damp) / 2; if (wet(m)) damp = m; else dry = m; } return damp; };
        const found = [], step = 10;
        let start = wet(w.x0) ? w.x0 : null;
        for (let x = w.x0 + step; ; x += step) {
            const at = Math.min(x, w.x1), now = wet(at);
            if (now && start === null) start = edge(at - step, at);
            if (!now && start !== null) { found.push([start, edge(at, at - step)]); start = null; }
            if (at >= w.x1) break;
        }
        if (start !== null) found.push([start, w.x1]);
        return found.filter(([a, b]) => b - a > 4).map(([a, b]) => {
            const bed = [];
            for (let x = b; x > a; x -= 20) bed.push([x, Math.max(w.top, groundAt(x) ?? yb)]);
            bed.push([a, Math.max(w.top, groundAt(a) ?? yb)]);
            return { x0: a, x1: b, poly: [[a, w.top], [b, w.top], ...bed] };
        });
    }

    /**
     * Below the ground's skin the colouring thins out into blank paper, as if
     * she stopped colouring there. The line where it starts follows the lowest
     * ground nearby (smoothed), so a cliff stays coloured to its foot and no
     * vertical seam appears where two columns of ground meet.
     */
    function paperBelow(def, shape, g, bottom) {
        const { depth, fade = h(1.3), reach = h(2.5), except = [] } = def.paperBelow;
        const step = 40;
        const x0 = Math.min(...shape.runs.map(r => r.pts[0][0])), x1 = Math.max(...shape.runs.map(r => r.pts.at(-1)[0]));
        const xs = [], top = [];
        for (let x = x0; x <= x1 + step; x += step) {
            const xx = Math.min(x, x1);
            let y = null;
            for (const r of shape.runs) { const q = heightOn(r.pts, xx); if (q !== null && (y === null || q < y)) y = q; }
            xs.push(xx); top.push(y ?? bottom);
        }
        const n = xs.length, R = Math.round(reach / step), B = Math.round(reach / 2 / step);
        const low = top.map((_, i) => { let m = -Infinity; for (let j = Math.max(0, i - R); j <= Math.min(n - 1, i + R); j++) m = Math.max(m, top[j]); return m; });
        const line = low.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - B); j <= Math.min(n - 1, i + B); j++) { s += low[j]; c++; } return s / c + depth; });
        const keep = (x) => except.some(([a, b]) => x > a && x < b);
        const steps = 10;
        for (let k = 0; k <= steps; k++) {
            const d0 = fade * k / steps, d1 = k === steps ? bottom : fade * (k + 1) / steps;
            const a = 0.9 * Math.pow((k + 0.5) / (steps + 0.5), 1.1);
            // one band between two offsets of the line, split where a kept stretch interrupts it
            let run = [];
            const flush = () => {
                if (run.length > 1) {
                    const upper = run.map(i => [xs[i], line[i] + d0]), lower = run.map(i => [xs[i], k === steps ? bottom : line[i] + d1]);
                    fillPoly(g, [...upper, ...lower.reverse()], 'paper', a);
                }
                run = [];
            };
            for (let i = 0; i < n; i++) { if (keep(xs[i])) flush(); else run.push(i); }
            flush();
        }
    }

    /**
     * A plank walk on posts over the sand (Spången). Its deck is the walking
     * line; the sand it stands on runs level beneath it, where the beach is.
     */
    function boardwalk(s, pts, ground, groundTop, lines, bottom) {
        const { floor, under, deck, posts, blend } = s.boardwalk;
        const x0 = pts[0][0], x1 = pts.at(-1)[0];
        const fl = clipX(floor, x0, x1);
        fillPoly(ground, [...fl, [x1, bottom], [x0, bottom]], under);
        // the sand under the walk turns into the wetter runway sand at its west end
        if (blend) for (let k = 0; k < 6; k++) {
            const a = x0 + (blend.width * k) / 6, b = x0 + (blend.width * (k + 1)) / 6;
            const f = clipX(floor, a, b);
            if (f.length > 1) fillPoly(ground, [...f, [b, bottom], [a, bottom]], blend.mat, 1 - (k + 0.5) / 6);
        }
        // posts, standing in the sand, seen between the deck and the sand
        for (let x = x0 + posts * 0.6; x < x1 - posts * 0.3; x += posts) {
            const top = heightOn(pts, x) + deck - 4, foot = heightOn(fl, x) + 10;
            if (foot - top < 8) continue;
            fillPoly(ground, [[x - 9, top], [x + 9, top], [x + 10, foot], [x - 10, foot]], 'wood');
            ground.poly([x - 9, top, x + 9, top, x + 9, top + 10, x - 9, top + 10].flat()).fill({ color: 0x2b1d12, alpha: .22 });
            lines.addChild(rope('stroke-graphite', [[x - 9, top], [x - 10, foot]], { width: 3, alpha: .75 }));
            lines.addChild(rope('stroke-graphite', [[x + 9, top], [x + 10, foot]], { width: 3, alpha: .75 }));
        }
        // the deck, its plank ends, and its underside in shade
        const under2 = pts.map(([x, y]) => [x, y + deck]);
        fillPoly(groundTop, [...pts, ...under2.slice().reverse()], s.mat);
        groundTop.poly([...under2.map(([x, y]) => [x, y - 8]), ...under2.slice().reverse()].flat()).fill({ color: 0x2b1d12, alpha: .22 });
        for (let x = x0 + 40; x < x1; x += 64) { const y = heightOn(pts, x); groundTop.moveTo(x, y + 2).lineTo(x + 1, y + deck - 2); }
        groundTop.stroke({ width: 2, color: 0x6b4a2c, alpha: 0.45 });
        lines.addChild(rope('stroke-graphite', resamplePts(under2, 50), { width: 4, alpha: .8 }));
        // the sand's own line under the walk
        lines.addChild(rope('stroke-graphite', resamplePts(fl, 50), { width: 5 }));
    }

    /** Fine roots hanging from the turf, here and there, in the earth below the grass. */
    function groundRoots(shape, lines) {
        const g = new PIXI.Graphics(); g.label = 'ground-roots';
        const hash = (n) => { const v = Math.sin(n * 91.7 + 17.3) * 43758.5453; return v - Math.floor(v); };
        for (const { s, pts } of shape.runs) {
            if (s.mat !== 'grass' || s.ramp) continue;
            const x0 = pts[0][0], x1 = pts.at(-1)[0];
            for (let x = Math.ceil(x0 / 170) * 170; x < x1 - 60; x += 170) {
                const r = hash(x);
                if (r > 0.55 || x - x0 < 60) continue;
                const y = heightOn(pts, x) + 40;
                for (let k = 0; k < 3; k++) {
                    const sx = x + (k - 1) * 9, len = 26 + hash(x + k) * 48, bend = (hash(x - k) - 0.5) * 24;
                    g.moveTo(sx, y).quadraticCurveTo(sx + bend, y + len * 0.5, sx + bend * 0.4, y + len);
                    if (k === 1) g.moveTo(sx + bend * 0.5, y + len * 0.55).lineTo(sx + bend * 0.5 + 12, y + len * 0.8);
                }
            }
        }
        g.stroke({ width: 2, color: 0x6b4a2c, alpha: .42, cap: 'round' });
        lines.addChildAt(g, 0);
    }

    /** Things lying in the ground: a shell in the dune, a stone under the turf. */
    function buildBuried(def) {
        for (const b of def.buried || []) {
            const s = spr(b.sprite);
            if (s._placeholder) { s.destroy(); continue; }
            s.anchor?.set?.(0.5);
            const top = floorAt(def, b.x);
            if (top === null) { s.destroy(); continue; }
            s.x = b.x; s.y = top + b.d; s.rotation = b.rot || 0; s.scale.set(b.scale || 0.8);
            s.alpha = 0.72; s.tint = 0xeee2d0;
            L.terrainBack.addChildAt(s, L.terrainBack.children.length - 1);
        }
    }

    /** Where grass tops a cliff, its turf hangs a little over the edge and shades the face. */
    function groundLips(shape, lines) {
        const lips = new PIXI.Graphics(); lips.label = 'ground-lips';
        for (const pts of shape.outlines) {
            for (let i = 1; i < pts.length; i++) {
                const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
                if (Math.abs(ax - bx) > 1e-6 || Math.abs(by - ay) < 60) continue;
                // a vertical face: the higher ground is on the side it drops from
                const down = by > ay, x = ax, y = Math.min(ay, by), dir = down ? -1 : 1; // dir points into the high ground
                const high = shape.runs.find(r => Math.abs((dir < 0 ? r.pts.at(-1)[0] : r.pts[0][0]) - x) < 1e-6 && Math.abs((dir < 0 ? r.pts.at(-1)[1] : r.pts[0][1]) - y) < 1e-6);
                if (!high || high.s.mat !== 'grass') continue;
                const lip = [[x + dir * 40, y - 2], [x - dir * 12, y + 2], [x - dir * 10, y + 16], [x - dir * 4, y + 30], [x + dir * 8, y + 40], [x + dir * 40, y + 44]];
                fillPoly(lips, lip, 'grass');
                // hanging blades and the shade under the turf
                for (let k = 0; k < 7; k++) { const bxk = x - dir * (10 - k * 3); lips.moveTo(bxk, y + 20 + (k % 3) * 6).lineTo(bxk - dir * 2, y + 40 + (k % 4) * 7); }
                lips.stroke({ width: 2, color: 0x5d7a4a, alpha: .7, cap: 'round' });
                lips.poly([x, y + 40, x + dir * 60, y + 40, x + dir * 60, y + 110, x, y + 110].flat()).fill({ color: 0x2b261f, alpha: .12 });
                lips.poly([x, y + 40, x + dir * 24, y + 40, x + dir * 24, y + 70, x, y + 70].flat()).fill({ color: 0x2b261f, alpha: .1 });
                lines.addChild(rope('stroke-graphite', resamplePts([[x + dir * 20, y], [x - dir * 10, y + 4], [x - dir * 6, y + 26], [x + dir * 6, y + 40]], 12), { width: 4, alpha: .8 }));
            }
        }
        lines.addChildAt(lips, 0);
    }

    /** How deep a plank, bridge or pier deck is drawn below its walking line. The
     * beach jetty is thin, so it stands clear of the sea instead of lying in it. */
    function thickness(s) { return s.jetty ? 22 : s.pier ? 34 : s.bridge ? 30 : 26; }

    /** The solid surface drawn on top at x (null over open water or air). */
    function surfaceAt(def, x) {
        let best = null, by = Infinity;
        for (const s of def.surfaces) {
            if (s.thin || !cond(s.when, G.flags)) continue;
            const y = heightOn(s.pts, x);
            if (y !== null && y < by) { best = s; by = y; }
        }
        return best;
    }

    /**
     * Where the sea or a pool meets the land: the ground darkens with wet sand
     * (or wet stone) near the water, and the sea leaves a lace of paper-white
     * foam at the edge. Her beach keeps her own waterline and wave instead.
     */
    function buildShores(def, d) {
        d.foams = [];
        if (def.underwater) return;
        const groundAt = drawnGround(def);
        const wet = new PIXI.Graphics(); wet.label = 'shore-wet';
        for (const wb of d.waters) {
            const { w, span } = wb;
            if (w.kind !== 'sea' && w.kind !== 'pool') continue;
            if (def.waterline?.sea === w.id) continue;
            // the seabed is seen through water: its skin is cooler and a little blue
            if (w.kind === 'sea') {
                const bed = span.poly.slice(2);
                // thin where the bed rises to meet the air, so the tint has no edge at the shore
                const taper = (x) => { const e = Math.min(x - span.x0, span.x1 - x); return e / (e + h(0.5)); };
                for (const [d0, d1, alpha] of [[0, 110, .22], [110, 220, .1]]) {
                    wet.poly([...bed.map(([x, y]) => [x, y + d0 * taper(x)]), ...bed.slice().reverse().map(([x, y]) => [x, y + d1 * taper(x)])].flat()).fill({ color: 0x3e6f96, alpha });
                }
            }
            for (const [cx, dry] of [[span.x0, -1], [span.x1, 1]]) {
                if (Math.abs(cx - (dry < 0 ? w.x0 : w.x1)) < 1) continue; // the water's own end, not a shore
                const s = surfaceAt(def, cx + dry * 30);
                const stone = s?.mat === 'rock';
                // the wet band follows the ground: strongest at the water, fading up the dry side
                for (const [a0, a1, alpha] of [[h(1.1), h(0.7), .22], [h(0.7), h(0.3), .45], [h(0.3), -h(0.35), .75]]) {
                    const xa = cx + dry * a0, xb = cx + dry * a1;
                    const top = [];
                    for (let k = 0; k <= 8; k++) { const x = lerp(Math.min(xa, xb), Math.max(xa, xb), k / 8), y = groundAt(x); if (y !== null) top.push([x, y + 3]); }
                    if (top.length < 2) continue;
                    const band = [...top, ...top.slice().reverse().map(([x, y]) => [x, y + 34])];
                    if (stone) wet.poly(band.flat()).fill({ color: 0x3b3530, alpha: alpha * 0.3 });
                    else fillPoly(wet, band, 'wetsand', alpha);
                }
                if (w.kind !== 'sea') continue;
                const f = spr('foam-edge');
                if (f._placeholder) { f.destroy(); continue; }
                f.anchor?.set?.(0.5, 0.7); f.scale.set(0.42, 0.5);
                f.x = cx - dry * 26; f.y = w.top + 4;
                L.waterFront.addChild(f);
                d.foams.push({ s: f, x: f.x, y: f.y, phase: cx * 0.013 });
            }
        }
        L.terrainBack.addChildAt(wet, L.terrainBack.getChildIndex(d.groundLines));
    }

    /**
     * The posts that hold a pier up, from under its deck down into the bed:
     * dark and wet just above the surface, weedy just below it, with little
     * ripples where they stand in the water.
     */
    function buildPosts(def, d) {
        d.ripples = [];
        const groundAt = drawnGround(def);
        // a pier's posts every few metres, and standalone pilings (the stair's post in the bay)
        const rows = def.surfaces.filter(s => s.posts).map(s => ({ s, ...s.posts, top: (x) => heightOn(s.pts, x) + thickness(s) - 8 }));
        for (const pl of def.pilings || []) rows.push({ from: pl.x, to: pl.x, every: 1, width: pl.width, top: () => pl.top });
        for (const row of rows) {
            const { from, to, every, width = 26 } = row;
            const g = new PIXI.Graphics(); g.label = 'posts';
            const lines = new PIXI.Container();
            for (let x = from; x <= to + 1; x += every) {
                const water = (def.waters || []).find(q => q.kind !== 'pipe' && x > q.x0 && x < q.x1);
                const top = row.top(x);
                const bed = (groundAt(x) ?? def.bounds.y1) + 40;
                const lean = (x * 7.3) % 5 - 2.5; // hand-set posts are never quite plumb
                const L0 = [x - width / 2, top], L1 = [x - width / 2 + lean, bed], R0 = [x + width / 2, top], R1 = [x + width / 2 + lean, bed];
                fillPoly(g, [L0, R0, R1, L1], 'wood');
                g.moveTo(x - 3, top + 10).lineTo(x - 2 + lean, bed).stroke({ width: 2, color: 0x6b4a2c, alpha: .35 });
                if (water) {
                    const at = (y) => lean * (y - top) / (bed - top);
                    g.poly([x - width / 2 + at(water.top - 22), water.top - 22, x + width / 2 + at(water.top - 22), water.top - 22, x + width / 2 + at(water.top), water.top, x - width / 2 + at(water.top), water.top]).fill({ color: 0x3f2c1c, alpha: .34 });
                    g.poly([x - width / 2 + at(water.top), water.top, x + width / 2 + at(water.top), water.top, x + width / 2 + at(water.top + 80), water.top + 80, x - width / 2 + at(water.top + 80), water.top + 80]).fill({ color: 0x2f5e25, alpha: .2 });
                    const rp = new PIXI.Graphics();
                    for (const side of [-1, 1]) {
                        const ex = side * (width / 2 + 4);
                        rp.moveTo(ex, 2).quadraticCurveTo(ex + side * 12, -3, ex + side * 22, 1).stroke({ width: 3, color: 0xffffff, alpha: .8, cap: 'round' });
                        rp.moveTo(ex + side * 26, 4).quadraticCurveTo(ex + side * 33, 1, ex + side * 40, 4).stroke({ width: 2, color: 0xffffff, alpha: .55, cap: 'round' });
                    }
                    rp.x = x + lean * (water.top - top) / (bed - top); rp.y = water.top;
                    L.waterFront.addChild(rp);
                    d.ripples.push({ g: rp, phase: x * 0.021 });
                }
                for (const [a, b] of [[L0, L1], [R0, R1]]) lines.addChild(rope('stroke-graphite', resamplePts([a, b], 50), { width: 4 }));
            }
            L.far.addChild(g, lines);
        }
    }

    /** A paper tube standing in the water (Strömröret above the surface), joints and all. */
    function buildTubes(def) {
        for (const tb of def.tubes || []) {
            const g = new PIXI.Graphics(); g.label = 'tube';
            const l = tb.x - tb.width / 2, r = tb.x + tb.width / 2;
            fillPoly(g, [[l, tb.y0], [r, tb.y0], [r, tb.y1], [l, tb.y1]], 'cream');
            // round: shaded at its sides, a light line down its front
            g.rect(l, tb.y0, tb.width * 0.2, tb.y1 - tb.y0).fill({ color: 0x6b635a, alpha: .16 });
            g.rect(r - tb.width * 0.16, tb.y0, tb.width * 0.16, tb.y1 - tb.y0).fill({ color: 0x6b635a, alpha: .22 });
            g.rect(tb.x - tb.width * 0.12, tb.y0, 8, tb.y1 - tb.y0).fill({ color: 0xffffff, alpha: .35 });
            // joints every horse length, each held by a band of ink-blue
            for (let y = tb.y1 - h(0.6); y > tb.y0 + 40; y -= h(1)) g.rect(l - 5, y - 7, tb.width + 10, 14).fill({ color: 0x2b4a78, alpha: .55 });
            const lines = new PIXI.Container();
            lines.addChild(rope('stroke-graphite', resamplePts([[l, tb.y1], [l, tb.y0]], 50), { width: 4 }), rope('stroke-graphite', resamplePts([[r, tb.y1], [r, tb.y0]], 50), { width: 4 }));
            L.mid.addChild(g, lines);
        }
    }

    /**
     * The far side of a gully, a ditch or a cleft, in shade. Without it the
     * page shows a hole to the sky (or to the painted sea) between its walls.
     */
    function buildBacks(def, d) {
        d.backs = [];
        for (const bk of def.backs || []) {
            const c = new PIXI.Container(); c.label = 'back-wall';
            const [tl, tr] = bk.top;
            const g = new PIXI.Graphics();
            // the far bank dips a little between the near edges, so some land shows beyond it
            const rim = [];
            for (let k = 0; k <= 12; k++) {
                const u = k / 12, near = lerp(tl, tr, u);
                rim.push([lerp(bk.x0 - 6, bk.x1 + 6, u), near + (bk.floor - near) * (bk.dip ?? 0.16) * Math.sin(Math.PI * u) + Math.sin(u * 9 + bk.x0) * 4]);
            }
            const wall = [...rim, [bk.x1 + 6, bk.floor + 60], [bk.x0 - 6, bk.floor + 60]];
            fillPoly(g, wall, bk.mat);
            // farther than the near edges: paler (a little air between), then in shade
            // under its far rim and at its foot
            g.poly(wall.flat()).fill({ color: 0xe4e6dc, alpha: .34 });
            g.poly(wall.flat()).fill({ color: 0x3b2a1a, alpha: .08 });
            g.poly([...rim, ...rim.slice().reverse().map(([x, y]) => [x, y + 60])].flat()).fill({ color: 0x2b1d12, alpha: .14 });
            g.poly([bk.x0 - 6, bk.floor - 50, bk.x1 + 6, bk.floor - 50, bk.x1 + 6, bk.floor + 60, bk.x0 - 6, bk.floor + 60]).fill({ color: 0x2b1d12, alpha: .12 });
            c.addChild(g);
            // its far rim: a lighter pencil line than the near edges
            c.addChild(rope('stroke-graphite', resamplePts(rim, 40), { width: 4, alpha: .34 }));
            // a few stones fallen to its floor
            for (const [u, name, sc] of bk.stones || []) {
                const st = spr(name); st.x = lerp(bk.x0, bk.x1, u); st.y = bk.floor + 4; st.scale.set(sc); st.tint = 0xd8cfc4; c.addChild(st);
            }
            L.far.addChild(c);
            d.backs.push({ bk, c });
        }
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
            // a pair of little butterflies over each backsippa
            O.butterflies = [];
            for (const [k, c] of (def.clumps || []).entries()) {
                for (let i = 0; i < 2; i++) {
                    const g = new PIXI.Graphics();
                    const col = (k + i) % 3 === 0 ? 0xf2e27a : (k + i) % 3 === 1 ? 0xc9b6e4 : 0xf6f3ea;
                    for (const side of [-1, 1]) {
                        g.ellipse(side * 7, -4, 7, 9).fill({ color: col }).stroke({ width: 1.6, color: 0x3b3530, alpha: .8 });
                        g.ellipse(side * 5, 6, 4.5, 5.5).fill({ color: col }).stroke({ width: 1.4, color: 0x3b3530, alpha: .8 });
                    }
                    g.moveTo(0, -9).lineTo(0, 9).stroke({ width: 2.4, color: 0x3b3530, cap: 'round' });
                    L.objects.addChild(g);
                    O.butterflies.push({ g, c, ph: k * 2.1 + i * 3.7, r: h(0.5 + i * 0.25) });
                }
            }
            O.tussocks = (def.tussocks || []).map((t) => { const s = spr('tussock-dotted'); s.x = t.x; s.y = t.y; L.objects.addChild(s); return { t, s }; });
            O.pinwheels = (def.pinwheels || []).map((pw) => { const s = spr('pinwheel'); s.x = pw.x; s.y = pw.y; L.mid.addChild(s); const hd = spr('pinwheel-head'); hd.anchor?.set?.(0.5); hd.x = pw.x; hd.y = pw.y - 110; L.mid.addChild(hd); return { pw, s, hd, a: 0 }; });
            O.shells = (def.shells || []).map((sh, i) => { const s = spr('shell-' + (1 + (i % 6))); s.x = sh.x; s.y = heightOn(def.surfaces.find((q) => q.id === 'beach').pts, sh.x) ?? -80; L.mid.addChild(s); return { sh, s, glow: 0 }; });
            O.flagpole = spr('flagpole'); O.flagpole.x = def.spots.flagpole.x; O.flagpole.y = def.spots.flagpole.y; L.mid.addChild(O.flagpole);
            O.flag = spr('flag'); O.flag.x = def.spots.flagpole.x + 4; L.mid.addChild(O.flag);
            O.gate = spr('gate-closed'); O.gate.x = h(115.2); O.gate.y = h(-0.16); L.objects.addChild(O.gate);
            O.glimpse = heroFactory({ mini: true });
            O.glimpse.view.scale.set(0.34);
            O.glimpseRidge = new PIXI.Container();
            // A real hill for the distant figure, in the steppe's own colours,
            // nearer than the painted bands and thinning into the valley's haze
            // toward its foot (the ground line is 480 below its top), so the
            // bands behind still show. Slices never overlap, so no alpha doubles.
            const ridge = [[-1500, 1000], [-1200, 640], [-980, 420], [-800, 290], [-620, 190], [-450, 110], [-300, 55], [-160, 16], [-60, 2], [60, 0],
                [180, 8], [330, 40], [500, 105], [700, 200], [900, 320], [1150, 520], [1500, 1000]];
            // the ridge's x where it crosses height y on each side
            const cross = (y, side) => { for (let i = 1; i < ridge.length; i++) { const [ax, ay] = ridge[i - 1], [bx, by] = ridge[i]; if ((ay - y) * (by - y) <= 0 && ay !== by && (side < 0 ? ay >= by : ay <= by)) return ax + (bx - ax) * (y - ay) / (by - ay); } return side * 1500; };
            const ridgeFill = new PIXI.Graphics();
            const solidTo = 150, hazeTo = 470, steps = 14;
            for (let k = -1; k < steps; k++) {
                const y0 = k < 0 ? -20 : solidTo + (hazeTo - solidTo) * k / steps, y1 = k < 0 ? solidTo : solidTo + (hazeTo - solidTo) * (k + 1) / steps;
                const a = k < 0 ? 1 : Math.pow(1 - (k + 0.5) / steps, 1.3);
                const xl = cross(y1, -1), xr = cross(y1, 1);
                const upper = [[xl, y1]];
                for (const [x, y] of ridge) if (x > xl && x < xr) upper.push([x, Math.max(y, y0)]);
                upper.push([xr, y1]);
                ridgeFill.poly(upper.flat()).fill({ color: 0xc8ccb0, alpha: a });
                fillPoly(ridgeFill, upper, 'grass', a * 0.5);
            }
            // its outline fades down the slopes with the fill
            const crest = ridge.filter(([, y]) => y < 330);
            O.glimpseRidge.addChild(ridgeFill, rope('stroke-graphite', resamplePts(crest.filter(([, y]) => y < 120), 45), { alpha: .32 }));
            for (const side of [-1, 1]) {
                const tail = crest.filter(([x, y]) => y >= 100 && Math.sign(x) === side);
                const joint = crest.filter(([x, y]) => y < 120 && Math.sign(x) === side).at(side < 0 ? 0 : -1);
                if (joint && tail.length) O.glimpseRidge.addChild(rope('stroke-graphite', resamplePts(side < 0 ? [...tail, joint] : [joint, ...tail], 45), { alpha: .14 }));
            }
            L.far.addChild(O.glimpseRidge);
            L.far.addChild(O.glimpse.view);
            O.landmark = createMapFragmentProp(PIXI, { texture: T, fragment: 'land' });
            O.landmark.x = def.spots.landmark.x; O.landmark.y = def.spots.landmark.y - 18; L.objects.addChild(O.landmark);
            O.ropeDown = spr('rope-plank-down'); O.ropeDown.x = h(7.95); O.ropeDown.y = h(-4.0) + 10; O.ropeDown.anchor?.set?.(0, 0.5); L.mid.addChild(O.ropeDown);
        }
        if (def.id === 'kelp') {
            O.flaps = (def.flaps || []).map(f => {
                const fold = createFoldedSeabed(PIXI, { texture: T, x: f.x, y: f.y - 72,
                    groundY: f.y + 10, width: 210, flat: G.flags.has(f.flag) });
                L.mid.addChild(fold.container); return { f, fold };
            });
            O.corners = (def.corners || []).map((c) => {
                const groundY = drawnGround(def)(c.x) ?? c.y + h(2.8);
                const fold = createFoldedSeabed(PIXI, { texture: T, x: c.x, y: c.y + 24,
                    groundY, width: h(3.1), flat: G.flags.has(c.flag) });
                const m = createMapFragmentProp(PIXI, { texture: T, fragment: 'sea', width: 154 });
                m.x = c.x + h(1.3); m.y = groundY - 8;
                // A torn, blue printed edge peeks out BEFORE the fold is pressed.
                // It becomes the same full fragment shown in the notebook.
                L.mid.addChild(m, fold.container); return { c, fold, m, groundY };
            });
            O.school = [];
            if (def.school) for (let i = 0; i < def.school.count; i++) { const s = spr('lyktfisk-' + (1 + (i % 2))); s.anchor?.set?.(0.5); L.actors.addChild(s); const g = spr('p-glow'); g.anchor?.set?.(0.5); g.alpha = 0.6; g.scale.set(1.4); L.fx.addChild(g); O.school.push({ s, g, a: i * 0.9, r: 40 + i * 9 }); }
            O.shy = (def.shy || []).map((c) => { const s = spr(c.kind + '-1'); s.anchor?.set?.(0.5, 1); s.x = c.x; s.y = c.y; L.actors.addChild(s); return { c, s }; });
            // the lyktfiskar light the water round them and a pool on the bed below
            if (def.school) {
                O.schoolHalo = new PIXI.Sprite(shadeTexture()); O.schoolHalo.anchor.set(0.5); O.schoolHalo.width = h(2.4); O.schoolHalo.height = h(1.7);
                O.schoolHalo.tint = 0xffe39a; O.schoolHalo.alpha = 0; L.far.addChild(O.schoolHalo);
                O.schoolPool = new PIXI.Sprite(shadeTexture()); O.schoolPool.anchor.set(0.5); O.schoolPool.width = h(2.6); O.schoolPool.height = 70;
                O.schoolPool.tint = 0xfff1b8; O.schoolPool.alpha = 0; L.terrainBack.addChild(O.schoolPool);
            }
            // small schools of little fish far off between the fronds
            O.schools = (def.schools || []).map((sc) => {
                const fish = [];
                for (let i = 0; i < sc.count; i++) {
                    const f = spr('fish-' + (1 + (i % 2)));
                    if (f._placeholder) { f.destroy(); continue; }
                    f.anchor?.set?.(0.5); f.scale.set(0.8 + (i % 3) * 0.1); f.alpha = 0.6; f.tint = 0xc4dcd6;
                    L.far.addChild(f);
                    fish.push({ f, ox: ((i * 37) % 11 - 5) * 22, oy: ((i * 23) % 7 - 3) * 18, ph: i * 1.3 });
                }
                return { sc, fish, prevX: sc.x };
            });
            O.glimpse = heroFactory({ mini: true }); O.glimpse.view.scale.set(0.3); L.far.addChild(O.glimpse.view); O.glimpse.view.visible = false;
        }
        if (def.id === 'viken') {
            O.shutters = def.shutters.map((sh) => { const s = spr('shutter-closed'); s.anchor?.set?.(0.5); s.x = sh.x; s.y = sh.y; L.objects.addChild(s); return { sh, s }; });
            O.lamp = spr('lamp-lit'); O.lamp.anchor?.set?.(0.5); O.lamp.x = def.lamp.x; O.lamp.y = def.lamp.y; O.lamp.alpha = G.flags.has('lamp_lit') ? 1 : 0; L.fx.addChild(O.lamp);
            O.beam = createPencilBeam(PIXI); O.beam.position.set(def.lamp.x, def.lamp.y); O.beam.alpha = G.flags.has('lamp_lit') ? .88 : 0; L.far.addChild(O.beam);
            O.coastPatch = createWorldCoastFold(PIXI, { texture: T });
            O.coastPatch.container.position.set(def.spots.window.x - 10, def.spots.window.y - 70);
            O.coastPatch.container.visible = false;
            L.mid.addChild(O.coastPatch.container);
            // chains hang: a sag that grows with their span, so none reads as a ruled line
            O.chains = (def.chains || []).map((c) => {
                const span = Math.hypot(c.to.x - c.from.x, c.to.y - c.from.y), sag = Math.min(h(1.6), span * 0.06), pts = [];
                for (let i = 0; i <= 28; i++) { const t = i / 28; pts.push([lerp(c.from.x, c.to.x, t), lerp(c.from.y, c.to.y, t) + 4 * t * (1 - t) * sag]); }
                const r = rope('stroke-chain', pts, { color: 0x6b635a, width: 4, scale: 1 }); r.alpha = 0.72; L.mid.addChild(r); return { c, r };
            });
            O.map = spr('map-closed'); O.map.visible = false; L.objects.addChild(O.map);
            O.mapPaper = createGuardianMapPaper(PIXI, { texture: T });
            O.mapPaper.container.scale.set(252 / 640, 56 / 420);
            O.mapPaper.container.visible = false; L.objects.addChild(O.mapPaper.container);
            O.ratchet = d.items.find((q) => q.it.ratchet)?.s;
            O.mechanisms = createLighthouseMechanisms(PIXI, def);
            L.hints.addChild(O.mechanisms.container);
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
        if (def.race) { O.beachPlay = createBeachPlay(PIXI, def); L.mid.addChild(O.beachPlay.container); }
        // Sandpapperet: hoofprints on sand (walk prints fade, gallop prints stay as graphite)
        if (def.printMats) { O.prints = new PIXI.Container(); L.mid.addChild(O.prints); O.printSprites = []; }
        // the hint mark and Alva's own gull
        O.hint = spr('p-glow'); O.hint.anchor?.set?.(0.5); O.hint.visible = false; L.hints.addChild(O.hint);
        O.hintGull = null;
        O.actionCue = createActionCue(PIXI); L.hints.addChild(O.actionCue.container);
    }

    /** White fading downward: an alpha mask for a reflection that should thin with depth. */
    let fadeTex = null;
    function fadeTexture() {
        if (fadeTex) return fadeTex;
        const cv = document.createElement('canvas'); cv.width = 2; cv.height = 256;
        const c = cv.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 256);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0.18)');
        c.fillStyle = gr; c.fillRect(0, 0, 2, 256);
        fadeTex = PIXI.Texture.from(cv);
        return fadeTex;
    }

    function buildReflection(def, w) {
        const c = new PIXI.Container();
        const pool = def.id === 'land' && w.id === 'pool';
        // The pool is shallow but its answer is tall: the reflection is clear at the
        // surface and thins into the wet sand below, so it reads as a reflection.
        let mask;
        if (pool && fadeTexture()) { mask = new PIXI.Sprite(fadeTexture()); mask.position.set(w.x0, w.top); mask.width = w.x1 - w.x0; mask.height = h(2.2); }
        else mask = new PIXI.Graphics().rect(w.x0, w.top, w.x1 - w.x0, h(3)).fill({ color: 0xffffff });
        const inner = new PIXI.Container();
        c.addChild(inner, mask);
        c.mask = mask;
        inner.alpha = 0.55;
        if (pool) {
            // the page as it should be: the arch open, the stone at its foot, the plank solid, a small fish
            const cliff = spr('cliff-open'); cliff.x = def.spots.arch.x - h(0.2); cliff.y = w.top + (w.top - def.spots.arch.y) + 20; cliff.scale.y = -1; inner.addChild(cliff);
            const st = spr('rail-stone'); st.x = def.rail.x0 + def.rail.step * def.rail.target; st.y = w.top + 30; st.scale.y = -1; inner.addChild(st);
            // the plank lies just past the pool, so its reflection is drawn at the east bank, inside the water
            const pl = spr('plank-solid'); pl.anchor?.set?.(0.5); pl.x = w.x1 - h(0.62); pl.y = w.top + 50; pl.scale.y = -1; inner.addChild(pl);
            // a little fish in the water itself, not in the sand below it
            const fish = spr('fish-1'); fish.anchor?.set?.(0.5); fish.y = w.top + 24; fish.scale.set(0.5, -0.5); inner.addChild(fish);
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
        landFocus = null;
        app.canvas.parentElement?.classList.remove('sk-world-focus');
        if (!S) return;
        if (shoreTrial) { shoreTrial.effect.destroy(); shoreTrial = null; app.canvas.parentElement?.classList.remove('sk-shore-trial'); }
        endFoldDemo(false);
        endMapAssembly(false);
        dropPeels();
        for (const layer of Object.values(L)) {
            for (const ch of layer.removeChildren()) if (ch !== hero.view && !particles.some((p) => p.s === ch)) ch.destroy({ children: true });
        }
        for (const ch of bgLayer.removeChildren()) ch.destroy();
        for (const ch of bgFront.removeChildren()) ch.destroy();
        for (const t of gradients.splice(0)) t.destroy(true);
        for (const ch of skyLayer.removeChildren()) ch.destroy({ children: true });
        particles.length = 0; pool.length = 0;
        for (const m of minis) m.destroy?.();
        minis.length = 0;
        S = null;
    }

    function setScene(id, { keepCam = false, turn = null } = {}) {
        if (destroyed) return null;
        // A request waiting for map art belongs to this visit, even if we later return here.
        if (id !== S?.id) { foldRequest++; mapRequest++; }
        // the old picture becomes a page that turns away over the new one
        const rt = turn && S ? capture() : null;
        // A late atlas bundle can rebuild this same scene. Keep an already
        // awaited experiment alive; only leaving the scene abandons its story.
        const carryFold = id === S?.id ? foldDemo : null;
        const carryMap = id === S?.id ? mapAssembly : null;
        const carryShore = id === S?.id ? shoreTrial : null;
        if (carryFold) {
            carryFold.effect.container.parent?.removeChild(carryFold.effect.container);
            carryFold.effect.beach.parent?.removeChild(carryFold.effect.beach);
            releaseFoldBeach(carryFold); foldDemo = null;
        }
        if (carryMap) mapAssembly = null;
        if (carryShore) shoreTrial = null;
        clearScene();
        for (const layer of Object.values(L)) layer.visible = true;
        S = buildScene(G.scenes[id]);
        S.id = id;
        S.placeholders = countPlaceholders();
        L.hero.addChild(hero.view);
        if (carryFold) { foldDemo = carryFold; bindFoldBeach(carryFold); L.fx.addChild(foldDemo.effect.container); }
        if (carryMap) mapAssembly = carryMap;
        if (carryShore) shoreTrial = carryShore;
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
        // The postcard's sea surrounds the island, unlike the playable stretch
        // that ends at its rock, so its light spans the whole bay.
        bay.light.view.destroy({ children: true });
        bay.light = createWaterLight(PIXI, bay.w, { underwater: def.underwater });
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

    function placeUserCloud(width, height, picture = false) {
        if (!S?.userCloud) return;
        const sun = S.sky.find(it => it.anim === 'sun')?.s;
        const b = sun?.getBounds();
        const cloud = S.userCloud;
        const p = cloudSkyLayout({ width, height, textureWidth: cloud.texture.width,
            textureHeight: cloud.texture.height, cameraX: cam.x, originX: S.def.spots.start.x,
            time, lessMotion: G.lessMotion, picture,
            sun: b ? { x: b.x, y: b.y, width: b.width, height: b.height } : null });
        cloud.position.set(p.x, p.y); cloud.scale.set(p.scale);
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
        // one wind for the whole page: the grass, the clouds and the foam move together
        const wind = G.lessMotion ? 0 : 0.8 + 0.3 * Math.sin(time * 0.21) + 0.2 * Math.sin(time * 0.57 + 1.3);
        if (mapAssembly) {
            mapAssembly.state = mapAssembly.effect.update(dt);
            mapAssembly.measureIn -= dt;
            if (mapAssembly.measureIn <= 0) fitMapAssembly();
        }
        if (kvMemory) {
            kvMemory.effect.update(dt);
            kvMemory.measureIn -= dt;
            if (kvMemory.measureIn <= 0) fitKvMemory();
        }
        if (shoreTrial) {
            shoreTrial.effect.update(dt);
            shoreTrial.measureIn -= dt;
            if (shoreTrial.measureIn <= 0) fitShoreTrial();
        }
        if (landFocus) {
            landFocus.measureIn -= dt;
            if (landFocus.measureIn <= 0) fitLandFocus();
        }
        if (foldDemo) {
            foldDemo.state = foldDemo.effect.update(dt);
            frameFoldDemo();
        }

        // hero
        if (G.speaker === 'horse' && !snap.action && !G.lessMotion && !snap.hide) { snap.action = 'talk'; snap.actionT = 0; }
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
        S.atmosphere.update({ cam, width: W, height: H, time: scenicTime, lessMotion: G.lessMotion, evening: G.evening, waterTop: S.waterTop ?? 0 });

        // backdrops: a sky that covers the screen (crossfading by camera x), and
        // the layers in front of the sky props, each at its own depth
        const swap = (s, image) => {
            const want = G.evening && def.evening?.[image] ? def.evening[image] : image;
            if (want !== s._img) { const t = T(want); if (t) { s.texture = t; s._img = want; } }
        };
        const portrait = H > W * 1.05;
        // where the ground line sits on screen, and the ground under the camera (updateCamera's framing)
        const frameK = portrait ? 0.08 : 0.12, feet = cam.y + (H / cam.zoom) * frameK;
        // clouds and gulls stay in the sky above a painted horizon (the bay's), never over its water
        let skyFloor = Infinity;
        for (const b of S.bg) {
            const bb = b._bg;
            swap(b, bb.image);
            const tw = b.texture?.width || 64, th = b.texture?.height || 64;
            const sc = Math.max(W / tw, H / th) * 1.08;
            const mid = (bb.x0 + bb.x1) / 2;
            b.scale.set(sc);
            const slack = (tw * sc - W) / 2;
            b.x = (W - tw * sc) / 2 + clamp(-(cam.x - mid) * cam.zoom * 0.004, -slack, slack);
            b.y = (H - th * sc) / 2 + clamp(-(cam.y - h(-1)) * cam.zoom * 0.05, -H * 0.04, H * 0.04);
            // Hills stand on the ground line; the sky's palest row sits just above them.
            const groundY = (par) => H * (0.5 + frameK) + (bb.ref - feet) * cam.zoom * par;
            if (bb.ref !== undefined) b.y = Math.min(0, groundY(0.02) - bb.skyRow * th * sc);
            if (S.vista) {
                // The bay backdrop's horizon is at 60%; align it with the real waterline.
                const vistaScale = Math.max(W / tw, H / (th * 0.8)) * 1.08;
                b.scale.set(vistaScale); b.x = (W - tw * vistaScale) / 2; b.y = H / 2 - th * 0.6 * vistaScale;
            }
            // Her painted sea stays behind her beach instead of sinking below the sand.
            if (bb.seaY !== undefined && !S.vista) b.y = seaAnchorY({ H, th, sc, seaY: bb.seaY, seaRow: bb.seaRow, camY: cam.y, zoom: cam.zoom });
            let a = 1;
            if (S.bg.length > 1) {
                const half = (bb.x1 - bb.x0) / 2;
                const dx = Math.abs(cam.x - mid) - half;
                a = clamp(1 - dx / h(5), 0, 1);
            }
            b.alpha = a;
            if (bb.horizon !== undefined && a > 0.5) skyFloor = Math.min(skyFloor, b.y + bb.horizon * th * b.scale.y);
            if (b._under) {
                const end = b.y + th * b.scale.y - 2;
                b._under.clear();
                if (end < H && a > 0.001) b._under.rect(0, end, W, H - end).fill({ color: G.evening ? 0x789bb8 : 0x5584b0, alpha: a });
            }
            // The sky's frame on screen; every layer spans its width.
            const fw = tw * b.scale.x, fh = th * b.scale.y;
            for (const l of b._layers) {
                const lb = l._layer;
                swap(l, lb.image);
                l.visible = a > 0.001;
                if (!l.visible) { l._below?.clear(); continue; }
                const k = fw / l.texture.width, lh = l.texture.height * k;
                const y = bb.ref !== undefined && !S.vista ? groundY(lb.par) - lb.y * fh : b.y + (lb.top || 0) * fh;
                if (lb.repeat) {
                    l.position.set(0, y); l.width = W; l.height = lh;
                    l.tileScale.set(k);
                    l.tilePosition.x = S.vista ? b.x : b.x - cam.x * cam.zoom * lb.par;
                } else {
                    l.scale.set(k);
                    l.position.set(S.vista ? b.x : (W - fw) / 2 + clamp(-(cam.x - mid) * cam.zoom * lb.par, -slack, slack), y);
                }
                l.alpha = a;
                // the nearest band's own colour below it, where no ground covers the screen
                if (l._below) {
                    l._below.clear();
                    if (y + lh < H) l._below.rect(0, y + lh - 1, W, H - y - lh + 1).fill({ color: G.evening ? 0xc3c29d : lb.fill, alpha: a });
                }
            }
            const u = b._depths;
            if (u) {
                const ub = u._layer;
                const top = S.waters.find(wb => wb.w.id === ub.water)?.w.top ?? 0;
                const y = H / 2 + (top - cam.y) * cam.zoom;
                u.visible = !S.vista && a > 0.001 && y < H;
                u._below.clear();
                if (u.visible) {
                    const k = cam.zoom * ub.span / u.texture.width, uh = u.texture.height * k;
                    u.position.set(0, y); u.width = W; u.height = uh;
                    u.tileScale.set(k);
                    u.tilePosition.x = -cam.x * cam.zoom * ub.par;
                    u.alpha = a;
                    u.tint = G.evening ? 0xffe6c4 : 0xffffff;
                    if (y + uh < H) u._below.rect(0, y + uh - 1, W, H - y - uh + 1).fill({ color: ub.fill, alpha: a });
                }
            }
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
            } else if (it.anim === 'cloud' && !frozen && !G.lessMotion) {
                it.x += dt * 6 * wind;
            }
            else if (it.anim === 'sun' && !frozen) { it.s.rotation = G.lessMotion ? 0 : Math.sin(time * 0.2) * 0.02; }
            it.s.x = sx + ox * cam.zoom; it.s.y = sy + oy * cam.zoom;
            if (it.kind === 'gull' || it.anim === 'cloud') it.s.y = Math.min(it.s.y, skyFloor - H * (it.kind === 'gull' ? 0.06 : 0.2));
            it.s.scale.set(cam.zoom * (it.s._baseScale || 1) * (it.s.scale.x < 0 ? -1 : 1), cam.zoom * (it.s._baseScale || 1));
        }
        placeUserCloud(W, H);
        // decor conditions and label fade
        for (const { s, it, wave } of S.items) {
            let vis = cond(it.when, F);
            if (it.chapter && !F.has('ch' + it.chapter + '_open') && it.chapter > 1) vis = vis && false;
            s.visible = vis;
            if (it.label) {
                const d = Math.abs(snap.x - it.x);
                s.alpha = damp(s.alpha, G.sceneTime < 1.5 || d < h(3.5) ? 1 : 0.0, 2, dt);
                if (G.finalLabel) s.alpha = G.finalLabel;
            }
            if (it.frozen) {
                if (wave && G.stuckWaveClock !== undefined && wave.clock !== G.stuckWaveClock) wave.settle(G.stuckWaveClock);
                if (F.has('plask')) s.visible = false;
            }
            if (it.ratchet) { const n = def.drums?.find((q) => q.id === it.ratchet)?.notches || 24; s.rotation = (F.has(it.ratchet) ? n : (G.puz.drums[it.ratchet] || 0)) * (8.4 / n); }
            if (/^(feathergrass|dune-grass)/.test(it.sprite || '')) {
                // it sways in the wind, and bends aside as the sköldhäst brushes past
                const dx = it.x - snap.x, near = Math.abs(dx) < h(0.8) && Math.abs(snap.y - it.y) < h(0.6) && !G.hideHero;
                it.bend = damp(it.bend || 0, near && !G.lessMotion ? Math.sign(dx || 1) * 0.3 * (1 - Math.abs(dx) / h(0.8)) : 0, 7, dt);
                s.rotation = G.lessMotion ? 0 : Math.sin(time * .7 + it.x * .006) * .025 * (0.6 + wind) + it.bend;
            }
        }
        // dynamic thin surfaces and ramps
        for (const it of S.dyn) { if (it.c) it.c.visible = cond(it.s.when, F); }
        if (G.terrain !== S.groundTerrain || G.terrain.revision !== S.groundRevision) S.rebuildGround();
        // kelp sway
        for (const k of S.kelp) {
            k.r.visible = !(k.chapter && !F.has('ch2_open'));
            if (k.hold) k.hold.visible = k.r.visible;
            if (!k.r.visible) continue;
            const pts = k.pts;
            const sway = (G.player.hidden && Math.abs(G.player.x - k.x) < h(1.5)) ? 0.4 : 1;
            if (k.fore) {
                const crossesHero = Math.abs(snap.x - k.x) < h(.75) && snap.y > k.fy - k.H && snap.y - h(1.5) < k.fy;
                k.r.alpha = damp(k.r.alpha, crossesHero ? .16 : .6, 6, dt);
            }
            for (let i = 0; i <= k.n; i++) {
                const u = 1 - i / k.n; // 1 at the top
                pts[i][0] = k.x + (k.lean || 0) * Math.pow(u, 1.6) + Math.sin(scenicTime * 0.9 + k.phase + u * 2.2) * 38 * u * u * sway + Math.sin(scenicTime * 0.37 + k.phase) * 12 * u;
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
        for (const q of S.shades) q.sh.visible = q.s.visible && !q.s.destroyed;
        // foam at the shores and ripples round the posts, breathing with the water
        for (const f of S.foams) { f.s.x = f.x + Math.sin(scenicTime * 1.1 + f.phase) * 6 * (0.5 + wind); f.s.y = f.y + Math.sin(scenicTime * 2.1 + f.phase) * 1.5; }
        // the light on the seabed dances with the waves above
        for (const c of S.caustics) { c.g.alpha = c.base * (0.55 + 0.45 * Math.sin(scenicTime * 1.4 + c.phase)); c.g.x = c.x + Math.sin(scenicTime * 0.6 + c.phase) * 8; }
        for (const r of S.ripples) { const k = Math.sin(scenicTime * 1.7 + r.phase); r.g.scale.x = 1 + k * 0.14; r.g.alpha = 0.72 + k * 0.24; }
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
            if (dl.solid) dl.solid.visible = done;
            dl.ink.visible = inkT > 0 && !(done && dl.solid);
            if (inkT > 0 && inkT < 1 && Math.random() < 0.5) emit('ink', snap.x, snap.y - 10, 1, { speed: 120, g: 300, life: 0.4, tint: 0x3b3530 });
        }
        // lanes
        for (const ln of S.lanes) {
            // The repaired coast still needs its calm physical landing during
            // the wave experiment. Finishing the drawing only removes its cue.
            const active = cond(ln.ln.when, F) && !(ln.ln.id === 'p8-lane' && F.has('p8_done'));
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
            if (!F.has(pc.pc.until)) {
                pc.state = 'covered'; pc.c.alpha = 1;
                // The read-held vista looks beyond the turned-over page at
                // the actual crease. Walking collision and chapter gates stay
                // in place; ending/cancelling that view restores the cover.
                pc.c.visible = !(pc.pc.id === 'trench-paper' && landFocus?.id === 'sea-fold-reveal');
                continue;
            }
            if (pc.state === 'covered') { pc.state = 'waiting'; pc.wait = 0; }
            if (pc.state === 'waiting') {
                pc.c.visible = true;
                // peel when a good part of it is in view (so the whole turn can be seen), and nothing else is on
                const halfW = W / cam.zoom / 2;
                const seen = Math.max(0, Math.min(pc.pc.x1, cam.x + halfW) - Math.max(pc.pc.x0, cam.x - halfW)) / (2 * halfW);
                pc.wait = seen > 0.3 && !G.busy ? pc.wait + dt : 0;
                if (pc.wait > 0.4) peelCover(pc);
            }
            if (pc.state === 'turning') pc.step?.(dt);
        }
        updateVaults(dt);
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
            O.beachPlay.update(Z.shells, F);
            for (const b of O.butterflies) {
                const t = G.lessMotion ? b.ph : time * 0.9 + b.ph, cy = b.c.y - h(0.75);
                const x = b.c.x + Math.sin(t) * b.r + Math.sin(t * 2.7) * h(0.12), y = cy + Math.sin(t * 1.9) * h(0.28) - Math.abs(Math.sin(t * 0.7)) * h(0.2);
                b.g.scale.x = (Math.cos(t) >= 0 ? 1 : -1) * (G.lessMotion ? 1 : 0.25 + 0.75 * Math.abs(Math.sin(time * 14 + b.ph)));
                b.g.position.set(x, y); b.g.rotation = Math.cos(t) * 0.25;
                b.g.visible = !G.finalRun;
            }
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
            if (O.landmark.visible) O.landmark.refreshTexture();
            O.ropeDown.visible = F.has('p4_plank') && !F.has('final_run');
        }
        if (def.id === 'kelp') {
            for (const f of O.flaps) f.fold.update({ flat: F.has(f.f.flag), dt, reducedMotion: G.lessMotion });
            for (const c of O.corners) {
                const shape = c.fold.update({ flat: F.has(c.c.flag), dt, reducedMotion: G.lessMotion });
                c.m.visible = !F.has('clue_mark_sea');
                c.m.y = c.groundY - 8 - shape.flat * h(.32);
                if (c.m.visible) c.m.refreshTexture();
            }
            const sch = Z.school;
            const lamps = S.vaults.find(v => v.v.id === 'vault')?.lamps;
            O.school.forEach((f, i) => {
                const vis = F.has('ch2_open');
                f.s.visible = f.g.visible = vis;
                if (!vis) return;
                f.a += dt * (1.2 + i * 0.1);
                // circling their centre while out; once the vault is lit, each keeps its own lamp spot under the roof
                const lamp = sch.state === 'lit' && lamps ? lamps[i % lamps.length] : null;
                const tx = lamp ? lamp[0] + Math.cos(f.a * 0.6) * 18 : sch.x + Math.cos(f.a) * f.r;
                const ty = lamp ? lamp[1] + Math.sin(f.a * 0.8) * 10 : sch.y + Math.sin(f.a * 1.3) * f.r * 0.5;
                if (f.px === undefined || G.lessMotion) { f.px = tx; f.py = ty; }
                const was = f.px;
                f.px = damp(f.px, tx, lamp ? 1.6 : 5, dt); f.py = damp(f.py, ty, lamp ? 1.6 : 5, dt);
                f.s.x = f.px; f.s.y = f.py;
                if (Math.abs(f.px - was) > 0.05) f.s.scale.x = f.px > was ? -1 : 1;
                f.g.x = f.s.x; f.g.y = f.s.y; f.g.alpha = sch.state === 'lit' ? 0.9 : sch.state === 'home' ? 0.5 : 0.75;
                f.g.scale.set(1.4);
            });
            if (O.schoolHalo) {
                const vis = F.has('ch2_open'), lit = sch.state === 'lit';
                const cx = sch.x, cy = sch.y;
                O.schoolHalo.visible = O.schoolPool.visible = vis && !lit;
                O.schoolHalo.position.set(cx, cy);
                O.schoolHalo.alpha = (lit ? 0.42 : 0.26) * (G.lessMotion ? 1 : 0.9 + 0.1 * Math.sin(time * 2.3));
                const bed = floorAt(def, cx);
                O.schoolPool.visible = vis && !lit && bed !== null && bed - cy < h(3);
                if (bed !== null) O.schoolPool.position.set(cx, bed + 14);
                O.schoolPool.alpha = (lit ? 0.5 : 0.32) * clamp(1 - (bed - cy) / h(3), 0, 1);
            }
            for (const sc of O.schools) {
                const vis = !sc.sc.chapter || F.has('ch' + sc.sc.chapter + '_open');
                const t = G.lessMotion ? 0 : time;
                const gx = sc.sc.x + Math.sin(t * 0.11 + sc.sc.x) * sc.sc.range, gy = sc.sc.y + Math.sin(t * 0.29) * h(0.35);
                const dir = gx >= sc.prevX ? 1 : -1; sc.prevX = gx;
                for (const q of sc.fish) {
                    q.f.visible = vis;
                    q.f.x = gx + q.ox + Math.sin(t * 1.7 + q.ph) * 10; q.f.y = gy + q.oy + Math.sin(t * 2.3 + q.ph) * 6;
                    q.f.scale.x = Math.abs(q.f.scale.x) * -dir;
                }
            }
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
            O.mechanisms.update(Z, F);
            O.lamp.alpha = damp(O.lamp.alpha, F.has('lamp_lit') ? 0.95 + Math.sin(time * 2) * 0.05 : 0, 1.2, dt);
            O.beam.alpha = damp(O.beam.alpha, F.has('lamp_lit') ? .88 : 0, 2, dt);
            O.coastPatch.container.visible = F.has('talk_done');
            O.coastPatch.update(sampleShoreTrial(F.has('p8_proven') ? 'proof' : F.has('p8_sea') ? 'draw' : 'folded', 0, { repaired: F.has('p8_done') }));
            O.chains.forEach((c) => { const on = F.has(def.shutters[c.c.shutter].flag); c.r.alpha = on ? 0.95 : 0.7; c.r.tint = on ? 0xffe08a : 0xffffff; });
            const kv = G.actors.kv;
            // The table belongs to the pier, even when its owner walks elsewhere.
            O.map.visible = kv.scene === 'viken' && !!kv.map;
            O.mapPaper.container.visible = O.map.visible && kv.map === 'open';
            if (O.map.visible) {
                O.map.x = def.spots.kvPier.x - h(.7); O.map.y = def.spots.kvPier.y;
                setTex(O.map, kv.map === 'open' ? 'map-open' : 'map-closed');
                O.mapPaper.container.position.set(O.map.x - 126, O.map.y - 148);
                O.mapPaper.setShore(F.has('talk_done') ? 1 : 0);
            }
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
        const demoKlo = foldDemo ? { ...k, pose: 'point', facing: 1,
            eyeAim: foldDemo.state.world > .1 ? [-.22, -.18] : [.18, .22],
            eyeWide: foldDemo.state.world * .55 } : k;
        O.kloRig.update(demoKlo, { scene: S.id, time: G.time, dt, underwater: S.def.underwater || (S.id === 'viken' && k.y > 0), hero: G.player, talking: k.talking || k.talkUntil > G.time, reducedMotion: G.lessMotion });
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
        const requestingHelp = G.helpLevel === 'guided' || G.companion?.markerActive();
        const chatting = G.companion?.suspended();
        const hi = G.helpLevel === 'guided' ? G.story?.hintInfo?.() : G.companion?.hintInfo();
        O.actionCue.update(requestingHelp && !chatting ? G.guidance : null, { scene: S.id, hero: G.player, cam, width: app.screen.width, height: app.screen.height,
            busy: !!G.busy || G.hideHero || G.vista, time, lessMotion: G.lessMotion });
        if (hi && hi.level >= 0.5 && hi.spot?.scene === S.id && !G.busy && !chatting) {
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
        // The swim origin is at the feet. Frame the torso in the underwater
        // page so the head stays visible above the surface and below the HUD.
        if (snap.mode === 'swim') ty = snap.y - (S.def.underwater ? h(0.8) : h(0.2));
        // the big leap: pan to the landing
        const L0 = G.player.leap;
        if (L0 && L0.pan) { tx = lerp(L0.from.x, L0.to.x, 0.75); ty = Math.min(L0.from.y, L0.to.y) - h(1.2); zoom *= 0.85; }
        const hint = G.camHint;
        if (hint) { if (hint.x !== undefined) tx = hint.x; if (hint.y !== undefined) ty = hint.y; if (hint.zoom) zoom = (hint.zoom * restPx) / HL; }
        if (hint?.companion) {
            // Keep the pair in the open part of the page, beside the paper in
            // landscape and above it in portrait. Recompute on device rotation.
            const pair = hint.companion;
            zoom = restPx / HL * (S.def.underwater ? .8 : 1);
            tx = pair.x + (portrait ? 0 : W * .24 / zoom * (pair.side === 'right' ? 1 : -1));
            ty = pair.ground - H / zoom * (portrait ? -.1 : .25);
        }
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
        // The companion paper covers the lower portrait viewport. Clamping to
        // that hidden part would push both actors down behind their notebook.
        if (!hint?.companion) ty = clamp(ty, b.y0 + hh, Math.max(b.y0 + hh, b.y1 - hh));
        if (cam.snap || (G.lessMotion && hint?.companion)) { cam.x = tx; cam.y = ty; cam.zoom = zoom; cam.snap = false; return; }
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
    function fitLandFocus() {
        if (!landFocus || destroyed) return;
        landFocus.measureIn = .1;
        const W = app.screen.width, H = app.screen.height, canvas = app.canvas.getBoundingClientRect();
        const rects = [...document.querySelectorAll('.sk-dialogue.on, .sk-goal:not(.empty)')].map(node => {
            const r = node.getBoundingClientRect();
            return { top: (r.top - canvas.top) * H / canvas.height, height: r.height * H / canvas.height, width: r.width * W / canvas.width };
        });
        fitLandPuzzleFrame(landFocus.frame, W, H, rects);
    }

    function fitShoreTrial() {
        if (!shoreTrial || destroyed) return;
        shoreTrial.measureIn = .1;
        const W = app.screen.width, H = app.screen.height, canvas = app.canvas.getBoundingClientRect();
        const sy = H / (canvas.height || H), insets = { top: 24, bottom: 24 };
        // Drawing tools and speech use different parts of the screen. Refit the
        // actual card; its drawing anchors are queried again after a rotation.
        for (const n of document.querySelectorAll('.sk-dialogue.on, .sk-draw.on .sk-draw-toolbar, .sk-draw.on .sk-draw-actions')) {
            const b = n.getBoundingClientRect();
            if (!b.width || !b.height) continue;
            const top = (b.top - canvas.top) * sy, bottom = (b.bottom - canvas.top) * sy;
            if ((top + bottom) / 2 < H / 2) insets.top = Math.max(insets.top, bottom + 12);
            else insets.bottom = Math.max(insets.bottom, H - top + 12);
        }
        shoreTrial.effect.fit(W, H, insets);
    }
    /** Keep the memory card clear of the dialogue box above it (measured a few times a second, not every frame). */
    function fitKvMemory() {
        if (!kvMemory || destroyed) return;
        kvMemory.measureIn = .25;
        const W = app.screen.width, H = app.screen.height, insets = { top: 24, bottom: 24 };
        const dialog = app.canvas.closest('.sk-root')?.querySelector('.sk-dialogue.on') || document.querySelector('.sk-dialogue.on');
        if (dialog) {
            const box = dialog.getBoundingClientRect(), canvas = app.canvas.getBoundingClientRect();
            const sy = H / (canvas.height || H), top = (box.top - canvas.top) * sy, bottom = (box.bottom - canvas.top) * sy;
            if ((top + bottom) / 2 < H / 2) insets.top = Math.min(H - 160, bottom + 10);
            else insets.bottom = Math.min(H - 160, H - top + 10);
        }
        kvMemory.effect.fit(W, H, insets);
    }
    function fitMapAssembly() {
        if (!mapAssembly || destroyed) return;
        mapAssembly.measureIn = .12;
        const W = app.screen.width, H = app.screen.height;
        const portrait = H > W;
        const reserve = mapAssembly.insets ||= { width: W, height: H, top: portrait ? 172 : 18, bottom: portrait ? 24 : 145 };
        if (reserve.width !== W || reserve.height !== H) Object.assign(reserve,
            { width: W, height: H, top: portrait ? 172 : 18, bottom: portrait ? 24 : 145 });
        const dialog = app.canvas.closest('.sk-root')?.querySelector('.sk-dialogue.on');
        if (dialog) {
            const box = dialog.getBoundingClientRect(), canvas = app.canvas.getBoundingClientRect();
            const sy = H / (canvas.height || H), top = (box.top - canvas.top) * sy, bottom = (box.bottom - canvas.top) * sy;
            if ((top + bottom) / 2 < H / 2) reserve.top = Math.max(reserve.top, Math.min(H - 110, bottom + 14));
            else reserve.bottom = Math.max(reserve.bottom, Math.min(H - 110, H - top + 14));
        }
        mapAssembly.layout = mapAssembly.effect.fit(W, H, { ...reserve, left: 20, right: 20 });
    }
    function endMapAssembly(completed) {
        if (!mapAssembly) return;
        const effect = mapAssembly; mapAssembly = null;
        effect.effect.destroy();
        app.canvas.parentElement?.classList.remove('sk-map-scene');
    }
    function releaseFoldBeach(demo) {
        for (const layer of [L.terrainBack, L.mid]) if (layer.mask === demo.beachMask) layer.mask = null;
        demo.beachMask?.destroy(); demo.beachMask = null;
    }
    /** Capture just the existing sand, shell and pencil marks, in world coordinates.
     * Replace that rectangle with the deforming ink; no duplicate shell stays behind. */
    function bindFoldBeach(demo) {
        releaseFoldBeach(demo);
        const { x, y } = demo, w = FOLD_BEACH.width, top = y - FOLD_BEACH.above;
        const height = FOLD_BEACH.above + FOLD_BEACH.below, left = x - w / 2;
        const rt = PIXI.RenderTexture.create({ width: w, height, resolution: 2 });
        const copy = new PIXI.Container(); copy.position.set(-left, -top);
        const layers = [L.terrainBack, L.mid], indices = layers.map(l => world.getChildIndex(l));
        const shell = S.obj.shells?.find(q => q.sh.id === 'sh1')?.s, shellVisible = shell?.visible;
        try {
            if (shell) shell.visible = false;
            for (const layer of layers) copy.addChild(layer);
            app.renderer.render({ container: copy, target: rt, clear: true });
        } finally {
            if (shell) shell.visible = shellVisible;
            layers.forEach((layer, i) => world.addChildAt(layer, indices[i]));
            copy.destroy();
        }
        demo.effect.setBeach(rt, shell);
        const b = S.def.bounds, pad = h(20), mask = new PIXI.Graphics();
        // Four surrounding rectangles leave a hole without depending on inverse-mask support.
        mask.rect(b.x0 - pad, b.y0 - pad, left - b.x0 + pad, b.y1 - b.y0 + pad * 2)
            .rect(left + w, b.y0 - pad, b.x1 + pad - left - w, b.y1 - b.y0 + pad * 2)
            .rect(left, b.y0 - pad, w, top - b.y0 + pad)
            .rect(left, top + height, w, b.y1 + pad - top - height).fill(0xffffff);
        mask.label = 'fold-beach-source-mask'; world.addChild(mask);
        for (const layer of layers) layer.mask = mask;
        demo.beachMask = mask;
        L.objects.addChildAt(demo.effect.beach, 0);
    }
    function frameFoldDemo() {
        if (!foldDemo) return;
        const W = app.screen.width, H = app.screen.height;
        const insets = { left: 24, right: 24, top: 32, bottom: 32 };
        const canvas = app.canvas.getBoundingClientRect(), sy = H / (canvas.height || H);
        const dialog = app.canvas.closest('.sk-root')?.querySelector('.sk-dialogue.on');
        if (dialog) {
            const b = dialog.getBoundingClientRect(), top = (b.top - canvas.top) * sy, bottom = (b.bottom - canvas.top) * sy;
            if ((top + bottom) / 2 < H / 2) insets.top = Math.min(H - 150, bottom + 16);
            else insets.bottom = Math.min(H - 150, H - top + 16);
        }
        // Reserve one reading area throughout the experiment, including its silent actions.
        const reserved = foldDemo.reservedInsets ||= { top: H > W ? 170 : 32, bottom: H > W ? 32 : 142, width: W, height: H };
        if (reserved.width !== W || reserved.height !== H) Object.assign(reserved,
            { top: H > W ? 170 : 32, bottom: H > W ? 32 : 142, width: W, height: H });
        reserved.top = Math.max(reserved.top, insets.top); reserved.bottom = Math.max(reserved.bottom, insets.bottom);
        insets.top = reserved.top; insets.bottom = reserved.bottom;
        const old = foldDemo.hint.frame.insets;
        if (old && (old.top !== insets.top || old.bottom !== insets.bottom)) cam.snap = true;
        foldDemo.hint.frame.insets = insets;
    }
    function endFoldDemo(completed) {
        if (!foldDemo) return;
        const demo = foldDemo; foldDemo = null;
        releaseFoldBeach(demo);
        demo.effect.destroy();
        if (G.camHint === demo.hint) G.camHint = demo.before;
        cam.snap = !completed;
        // An abandoned scene must not resume its dialogue in a different scene.
        if (completed && !destroyed) demo.resolve?.();
    }
    async function fx(name, data) {
        if (destroyed) return new Promise(() => {});
        const def = S?.def;
        switch (name) {
            case 'landFocus': {
                const before = G.camHint, player = G.player, scene = G.sceneId;
                const focus = { id: data.id, frame: data.frame || landPuzzleFrame(data.id), measureIn: 0 };
                const hint = { frame: focus.frame };
                landFocus = focus; G.camHint = hint; fitLandFocus();
                app.canvas.parentElement?.classList.add('sk-world-focus');
                try {
                    await G.wait(G.lessMotion ? .12 : .4);
                    if (destroyed || G.sceneId !== scene || G.player !== player) await new Promise(() => {});
                    await data.whileVisible?.();
                    if (destroyed || G.sceneId !== scene || G.player !== player) await new Promise(() => {});
                } finally {
                    if (landFocus === focus) {
                        landFocus = null;
                        app.canvas.parentElement?.classList.remove('sk-world-focus');
                    }
                    if (G.camHint === hint) G.camHint = before;
                }
                break;
            }
            case 'shoreTrial': {
                shoreTrial?.effect.destroy();
                const effect = createShoreTrial(PIXI, { texture: T, lessMotion: G.lessMotion });
                overlay.addChild(effect.container);
                shoreTrial = { effect, measureIn: 0 };
                app.canvas.parentElement?.classList.add('sk-shore-trial');
                fitShoreTrial();
                onFx?.('sfx', 'rustle');
                try {
                    await data.whileVisible?.({
                        flatten: () => effect.flatten(), complete: () => effect.complete(), wave: () => effect.wave(),
                        geometry() { fitShoreTrial(); return effect.geometry(app.canvas); }
                    });
                } finally {
                    if (shoreTrial?.effect === effect) {
                        shoreTrial = null;
                        app.canvas.parentElement?.classList.remove('sk-shore-trial');
                    }
                    effect.destroy();
                }
                break;
            }
            case 'mapAssemble': {
                endMapAssembly(false);
                const request = ++mapRequest, sceneAtStart = S?.id;
                await assets.load('map');
                if (destroyed || request !== mapRequest || S?.id !== sceneAtStart) return new Promise(() => {});
                const variant = data.variant || 'assembly';
                const caption = data.caption || (variant === 'fragment' ? MAP.pieces[data.fragment || 'corner'].name
                    : variant === 'search' ? MAP.search.title : STORY.k2.mapAssemble);
                const effect = createMapAssemble(PIXI, { ...data, variant, texture: T, caption, flags: G.flags, lessMotion: G.lessMotion });
                overlay.addChild(effect.container);
                const demo = mapAssembly = { effect, variant, fragment: data.fragment, measureIn: 0, state: effect.update(0) };
                app.canvas.parentElement?.classList.add('sk-map-scene');
                fitMapAssembly();
                onFx?.('sfx', 'rustle');
                const active = () => mapAssembly === demo && !destroyed;
                const controller = Object.fromEntries(['arrive', 'join', 'reveal', 'depart'].map(action => [action, () => {
                    if (!active()) return new Promise(() => {});
                    if (action === 'join' || action === 'reveal') onFx?.('sfx', action === 'join' ? 'rustle' : 'pencil');
                    return effect[action]();
                }]));
                controller.focus = value => { if (active()) effect.focus(value); };
                try {
                    if (data.whileVisible) await data.whileVisible(controller);
                    else {
                        await controller.arrive();
                        if (variant === 'assembly') await controller.join();
                        if (variant !== 'fragment') await controller.reveal();
                        await G.wait(1.5); await controller.depart();
                    }
                    if (!active()) return new Promise(() => {});
                } finally { if (active()) endMapAssembly(true); }
                break;
            }
            case 'kvMemory': {
                // why he folded: his memory on a card, one picture for each line he speaks
                kvMemory?.effect.destroy();
                const effect = createKvMemory(PIXI, { texture: T, makeHero: heroFactory ? () => heroFactory() : null,
                    caption: STORY.k3.memoryCaption, lessMotion: G.lessMotion });
                overlay.addChild(effect.container);
                kvMemory = { effect, measureIn: 0 };
                fitKvMemory();
                onFx?.('sfx', 'rustle');
                try {
                    await data.whileVisible?.({
                        stage(i) {
                            if (effect.stageIndex >= i) return;
                            effect.stage(i);
                            onFx?.('sfx', i === 2 ? 'rustle' : 'pencil');
                            if (kvMemory?.effect === effect) kvMemory.measureIn = .05;
                        }
                    });
                    if (!destroyed && kvMemory?.effect === effect) await Promise.race([effect.close(), new Promise(r => setTimeout(r, 900))]);
                } finally {
                    if (kvMemory?.effect === effect) kvMemory = null;
                    effect.destroy();
                }
                break;
            }
            case 'foldDemo': {
                endFoldDemo(false);
                const request = ++foldRequest;
                const sceneAtStart = S;
                await assets.load('map');
                if (destroyed || request !== foldRequest || S?.id !== sceneAtStart.id) return new Promise(() => {});
                const shell = S.obj.shells?.find(q => q.sh.id === 'sh1');
                const x = shell?.s.x ?? data.x, y = shell?.s.y ?? G.terrain.groundNear(x, data.y, 120) ?? data.y;
                const k = G.actors.klo;
                const kx = k?.visible && Math.abs(k.x - x) < h(5) ? k.x : x + h(1.6), ky = k?.y ?? y;
                const effect = createFoldDemo(PIXI, {
                    texture: T, x, y, clawX: kx + 29, clawY: ky - 65, lessMotion: G.lessMotion
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
                const demo = foldDemo = { effect, x, y, state: effect.update(0), before, hint };
                bindFoldBeach(demo); frameFoldDemo();
                const active = () => foldDemo === demo && !destroyed;
                const controller = Object.fromEntries(['arrive', 'fold', 'unfold', 'depart'].map(action => [action, () => {
                    if (!active()) return new Promise(() => {});
                    if (action === 'fold' || action === 'unfold') onFx?.('sfx', 'rustle');
                    return effect[action]();
                }]));
                try {
                    if (data.whileVisible) await data.whileVisible(controller);
                    else { await controller.arrive(); await controller.fold(); await G.wait(1.5); await controller.unfold(); await controller.depart(); }
                    if (!active()) return new Promise(() => {});
                } finally { if (active()) endFoldDemo(true); }
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
        fitMapAssembly();
        fitKvMemory();
        fitShoreTrial();
        fitLandFocus();
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
        fadeTex?.destroy(true); fadeTex = null;
        shadeTex?.destroy(true); shadeTex = null;
        for (const t of gradients.splice(0)) t.destroy(true);
    }

    return {
        setScene, render, fx, resize, destroy, cam, emit, fadeTo,
        /** a page is lying over the screen, waiting to turn (the unfold): scene changes should not turn another */
        get holding() { return !!held; },
        get sceneId() { return S?.id; },
        get vista() { return S?.vista || null; },
        /** the playable beach's stuck wave (for checks) */
        get stuckWave() { return S?.items.find(q => q.wave)?.wave || null; },
        get foldDemo() { return foldDemo ? { ...foldDemo.effect.state, phase: foldDemo.effect.phase, elapsed: foldDemo.effect.elapsed, bounds: { ...foldDemo.hint.frame } } : null; },
        get mapAssembly() { return mapAssembly ? { ...mapAssembly.state, phase: mapAssembly.effect.phase, elapsed: mapAssembly.effect.elapsed,
            variant: mapAssembly.variant, fragment: mapAssembly.fragment, bounds: mapAssembly.layout?.bounds } : null; },
        /** Kartväktaren's memory card while it is shown (for checks) */
        get kvMemory() { return kvMemory ? { stage: kvMemory.effect.stageIndex } : null; },
        get shoreTrial() { return shoreTrial ? { phase: shoreTrial.effect.phase, ...shoreTrial.effect.state, ...shoreTrial.effect.geometry(app.canvas) } : null; },
        get landFocus() { return landFocus ? { id: landFocus.id, frame: { ...landFocus.frame } } : null; },
        kloBounds() { return S?.obj?.klo?.visible ? S.obj.klo.getBounds() : null; },
        speakerBounds(who) {
            if (!root.visible || !S || G.vista) return null;
            if (who === 'horse') return hero.view.visible && !G.hideHero ? hero.headBounds() : null;
            const actor = G.actors[who], o = S.obj;
            if (G.hideActors || !actor?.visible || actor.scene !== S.id || actor.inHole) return null;
            if (who === 'klo' && o.klo.visible) return o.kloRig.headBounds();
            if (who === 'kv' && o.kv.visible) return o.kvRig.headBounds();
            return who === 'signe' && o.signe.visible ? o.signe.getBounds() : null;
        },
        built(id) { return S?.id === id && S.placeholders === 0; },
        replaceHero(newHero) { L.hero.removeChild(hero.view); hero.destroy?.(); hero = newHero; L.hero.addChild(hero.view); },
        world, root, layers: L,
        /** Render the current scene into a texture with a given camera (the prologue picture). */
        snapshot({ x, y, zoom, width, height, skyFactor }) {
            const rt = PIXI.RenderTexture.create({ width, height, resolution: 1 });
            const save = { x: cam.x, y: cam.y, zoom: cam.zoom };
            const sw = app.screen.width, sh = app.screen.height;
            const backdropState = [...S.bg, ...S.sky.map(it => it.s), ...(S.userCloud ? [S.userCloud] : [])]
                .map(s => ({ s, x: s.x, y: s.y, sx: s.scale.x, sy: s.scale.y }));
            cam.x = x; cam.y = y; cam.zoom = zoom;
            world.scale.set(zoom);
            world.position.set(width / 2 - x * zoom, height / 2 - y * zoom);
            for (const b of S.bg) { const tw = b.texture.width, th = b.texture.height; const sc = Math.max(width / tw, height / th); b.scale.set(sc); b.x = (width - tw * sc) / 2; b.y = (height - th * sc) / 2; }
            for (const it of S.sky) { it.s.x = width / 2 + (it.x - x) * zoom * it.par; it.s.y = height / 2 + (it.y - y) * zoom * (skyFactor ?? Math.max(0.5, it.par * 2.5)); it.s.scale.set(zoom * (it.s._baseScale || 1)); }
            placeUserCloud(width, height, true);
            const vis = { root: root.visible, hero: hero.view.visible, actors: L.actors.visible, hints: L.hints.visible, fx: L.fx.visible };
            root.visible = true;
            hero.view.visible = !G.hideHero;
            L.actors.visible = !G.hideActors;
            L.hints.visible = false; L.fx.visible = false;
            const splashes = G.snapNoSplash ? S.items.filter((q) => q.it.frozen && q.s.visible) : [];
            for (const q of splashes) q.s.visible = false;
            // the picture fits its own backdrop; the screen's sea underlay stays out of it
            const unders = S.bg.map(b => b._under).filter(u => u?.visible);
            for (const u of unders) u.visible = false;
            overlay.visible = false;
            app.renderer.render({ container: root, target: rt, clear: true });
            overlay.visible = true;
            for (const u of unders) u.visible = true;
            for (const q of splashes) q.s.visible = true;
            root.visible = vis.root; hero.view.visible = vis.hero; L.actors.visible = vis.actors; L.hints.visible = vis.hints; L.fx.visible = vis.fx;
            Object.assign(cam, save);
            for (const { s, x: bx, y: by, sx, sy } of backdropState) { s.position.set(bx, by); s.scale.set(sx, sy); }
            world.scale.set(cam.zoom);
            world.position.set(sw / 2 - cam.x * cam.zoom, sh / 2 - cam.y * cam.zoom);
            return rt;
        }
    };
}
