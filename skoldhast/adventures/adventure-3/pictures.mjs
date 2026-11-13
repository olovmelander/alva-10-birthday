/*
 * Äventyr 3 – pictures without play (docs/skoldhast/adventure-3.md, sections 11.1b, 11.11, 16 and 16.1).
 *
 *   const pictures = createPictures({ PIXI, app, assets, ui, audio, G, heroFactory });
 *   await pictures.play('launch', { flameTexture, cloudTexture });  // ends on the Moon filling the frame, and holds it
 *   ... set the world up behind it (G.goto('mane', …), view.setScene) ...
 *   await pictures.close();                                         // the held picture dissolves into the world
 *   await pictures.play('forestDark');    // over the world; fades back to it by itself at the end
 *   await pictures.play('forestLight');   // likewise
 *   pictures.tick(dt) every frame while pictures.shown (its own clock: it runs while the world is held).
 *
 * Each says its own lines (STORY.launch, launch2, launch3; forestDark, forestDark2; forestLight) at the moments the
 * pictures need them, through ui.say and ui.caption, and resolves when it has finished.
 *
 *   launch       Utsiktskullen at night: the whole magic forest has come to wave (Tukankrabban and the ten little
 *                ones, Skatan, Tordyveln, Molnet). The sköldhäst and Klo go aboard; Mira counts down; the rocket, with
 *                the flame the player drew, rises in a curve (its fin is crooked); Molnet flies beside it until the
 *                air ends; the camera pulls back until the forest is a small lit page in the dark, its nest a point
 *                of light; then the Moon grows until it fills the frame. (Big picture 1 of section 16.)
 *   forestDark   16.1, "The forest": a black screen, and six still pictures, each seen for a quarter of a second in a
 *                lightning flash, with its thunder a moment after. Nobody is hurt: the smallest one is caught in
 *                the same breath as he is seen in the wind.
 *   forestLight  11.11: the storm stops in the middle of a flash; the moonlight comes back over the forest, a road of
 *                stars lies across the sky, Molnet glows, and Tukankrabban shows the little ones who is galloping it.
 *
 * With less motion (G.lessMotion) every sweep is a calm dissolve between still pictures, and forestDark has no
 * flashes at all: each picture fades in and out softly.
 */
import { pencilStyle, pencilPixi } from '../../src/pencil-style.mjs';
import { createKlo } from '../../src/klo.mjs';
import { createTukan, createHatchling, createMagpie, createBeetle, createCloud } from '../adventure-2/characters.mjs';
import * as C3 from './characters.mjs';
import * as SV from './content/sv.mjs';

/** An arc that starts where it starts (a bare arc() is joined by a line to wherever the pen last was). */
const arcAt = (g, x, y, r, a0, a1) => g.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r).arc(x, y, r, a0, a1);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (x, s = 0) => { const v = Math.sin(x * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const mix = (a, b, t) => {
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
};
// the forest's moonlit night (Äventyr 2's SKY.moon) and the storm's
const NIGHT = [0x1f2b4f, 0x3d5282, 0x8a8fb8], STORM = [0x1b1d33, 0x2c2e4c, 0x45466a];
// the page with the magic forest, in world units (the hill's top at 0, 0; the rocket stands there)
const PAGE = { x0: -2600, x1: 2600, y0: -3800, y1: 1400 };
const AIR_ENDS = -2500;   // where Molnet can follow no higher
// the right of the crowd at the launch: Skatan, then Tordyveln up on his ball (all inside a phone held upright)
const SKATA_X = 296, BALL_X = 428, BALL_S = 1.35;
const PORTRAIT_W = 1000, PORTRAIT_CX = -8; // world units across a phone held upright at the launch, and its middle
const FLIGHT = 5600;      // how far the rocket climbs while the camera still follows it on the page

export function createPictures({ PIXI, app, assets, ui, audio, G, heroFactory = null }) {
    const STORY = SV.STORY || {};
    const T = (name) => assets?.tex?.(name) || null;
    const pen = pencilStyle(T);
    const RAW = PIXI;
    PIXI = pencilPixi(PIXI, T);
    const root = new RAW.Container(); root.label = 'a3-pictures'; root.visible = false;
    app.stage.addChild(root);
    let shown = false, tweens = [], t = 0, P = null, held = null;

    // --- a clock of its own --------------------------------------------------------------------------------------
    function tween(sec, fn) { return new Promise(resolve => tweens.push({ t: 0, dur: Math.max(0.001, sec), fn, resolve })); }
    const wait = (sec) => tween(sec, () => {});
    const rm = () => !!G?.lessMotion;
    const size = () => ({ W: app.screen.width, H: app.screen.height });

    /** Lines with captions in them: a caption is read by the narrator ([caption, text] or a plain string). */
    async function speak(lines) {
        let batch = [];
        const flush = async () => { if (batch.length) { const b = batch; batch = []; await ui.say(b); } };
        for (const l of lines || []) {
            if (!l) continue;
            const caption = typeof l === 'string' ? l : l[0] === 'caption' ? l[1] : null;
            if (caption) { await flush(); await Promise.all([ui.caption(caption, 3200), wait(1.1)]); }
            else if (Array.isArray(l) && l[1]) batch.push(l);
        }
        await flush();
    }
    const by = (lines, who) => (lines || []).filter(l => Array.isArray(l) && l[0] === who);

    // --- textures made once -------------------------------------------------------------------------------------
    function texFrom(draw, w, h) {
        const g = new RAW.Graphics(); draw(g);
        const tx = app.renderer.generateTexture({ target: g, resolution: 1, frame: new RAW.Rectangle(-w / 2, -h / 2, w, h) });
        g.destroy();
        return tx;
    }
    function softGlow() {
        if (typeof document === 'undefined') return RAW.Texture.WHITE;
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const c = cv.getContext('2d'), gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.6)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
        return RAW.Texture.from(cv);
    }
    const TX = {
        puff: texFrom(g => { for (let i = 8; i >= 1; i--) g.circle(0, 0, i * 2).fill({ color: 0xffffff, alpha: 0.1 }); }, 36, 36),
        glow: softGlow(), // 128 px across
        dot: texFrom(g => { g.circle(0, 0, 2.2).fill({ color: 0xffffff }); }, 6, 6),
        cross: texFrom(g => { g.moveTo(-6, 0).lineTo(6, 0).moveTo(0, -6).lineTo(0, 6).stroke({ color: 0xffffff, width: 1.6, cap: 'round' }); g.circle(0, 0, 1.4).fill(0xffffff); }, 16, 16),
        streak: texFrom(g => g.moveTo(0, -14).lineTo(-3, 14).stroke({ width: 2, color: 0xffffff, alpha: 0.85, cap: 'round' }), 10, 32)
    };

    // --- characters (A3's from characters.mjs, with plain stand-ins should one be missing) ----------------------
    function make(name, ...args) {
        try { if (typeof C3[name] === 'function') return C3[name](PIXI, pen, ...args); }
        catch (err) { console.warn('Sköldhästen: ' + name, err); }
        return null;
    }
    function standIn(draw) {
        const view = new PIXI.Container(); const g = new PIXI.Graphics(); draw(g); view.addChild(g);
        return { view, update() {}, setFlame() {}, destroy() { view.destroy({ children: true }); } };
    }
    function rocketRig(flameTexture) {
        const r = make('createRocket', { flameTexture });
        if (r) return r;
        // Mira's rocket as Äventyr 2 drew it, six times as big (origin at the base's centre)
        const view = new PIXI.Container(), k = 6.2;
        const flameS = new RAW.Sprite(flameTexture || RAW.Texture.EMPTY); flameS.anchor.set(0.5, 0); flameS.position.set(0, -2);
        const g = new PIXI.Graphics(), ink = 0x3e3550;
        g.poly([-11, 4, -21, 21, -20, 25, -10, 19].map(v => v * k)).fill(pen.fill(0xd65a4f)).stroke(pen.line(ink, 2.4));
        g.poly([11, 4, 26, 17, 25, 25, 10, 19].map(v => v * k)).fill(pen.fill(0xd65a4f)).stroke(pen.line(ink, 2.4));
        g.poly([-6, 19, 6, 19, 8, 25, -8, 25].map(v => v * k)).fill(pen.fill(0x8d879c)).stroke(pen.line(ink, 2));
        g.moveTo(0, -34 * k).bezierCurveTo(9 * k, -27 * k, 13 * k, -14 * k, 12.5 * k, 2 * k).lineTo(11 * k, 19 * k).lineTo(-11 * k, 19 * k).lineTo(-12.5 * k, 2 * k)
            .bezierCurveTo(-13 * k, -14 * k, -9 * k, -27 * k, 0, -34 * k).fill(pen.fill(0xf5f0e4)).stroke(pen.line(ink, 2.8));
        g.moveTo(0, -34 * k).bezierCurveTo(5.5 * k, -30 * k, 8.5 * k, -24 * k, 9.6 * k, -18 * k).quadraticCurveTo(0, -15.5 * k, -9.6 * k, -18 * k)
            .bezierCurveTo(-8.5 * k, -24 * k, -5.5 * k, -30 * k, 0, -34 * k).fill(pen.fill(0xd65a4f)).stroke(pen.line(ink, 2.2));
        g.circle(0, -5 * k, 5.8 * k).fill(pen.fill(0x8ecbe8)).stroke(pen.line(ink, 2.4));
        g.position.set(0, -25 * k);
        flameS.position.set(0, 0);
        view.addChild(flameS, g);
        return { view, setFlame(tx) { flameS.texture = tx || RAW.Texture.EMPTY; }, update(dt, s, tt) { view.rotation = s.tilt || 0; flameS.alpha = s.flame; flameS.scale.set(1.3 * (0.9 + (s.flame > 0 ? 0.12 * Math.sin(tt * 40) : 0))); }, destroy() { view.destroy({ children: true }); } };
    }
    const skyMoon = () => make('createSkyMoon') || standIn(g => {
        g.circle(0, 0, 100).fill(pen.fill(0xf6e7a8)).stroke(pen.line(0xb79a4a, 3));
        g.circle(-34, -24, 20).fill(pen.hatch(0xd8c37a, 0.9)); g.circle(30, 28, 26).fill(pen.hatch(0xd8c37a, 0.8)); g.circle(38, -40, 10).fill(pen.hatch(0xd8c37a, 0.8));
    });
    /** A plain disk the size of the Moon (radius 100), under its pencil wash. */
    const moonBack = (color = 0xeedd9c) => { const g = new RAW.Graphics(); g.circle(0, 0, 99).fill({ color }); return g; };
    const safe = (c, ...a) => { try { c?.update?.(...a); } catch (err) { if (c && !c._warned) { c._warned = true; console.warn('Sköldhästen: picture', err); } } };

    // --- shared drawings ---------------------------------------------------------------------------------------
    /** A night sky in bands of colour with pencil laid over it (screen space, redrawn each frame: 14 rects). */
    function bands(g, W, H, [top, mid, low], alpha = 1) {
        const n = 28;
        for (let i = 0; i < n; i++) {
            const u = i / (n - 1), c = u < 0.6 ? mix(top, mid, u / 0.6) : mix(mid, low, (u - 0.6) / 0.4);
            g.rect(0, Math.floor(H * i / n), W, Math.ceil(H / n) + 1).fill({ color: c, alpha });
        }
    }
    function hatchOver(container, W, H, alpha = 0.12) {
        const ht = T('pencil-hatch');
        if (!ht) return null;
        const s = new RAW.TilingSprite({ texture: ht, width: W, height: H }); s.alpha = alpha; s.tint = 0x0a0c1c;
        container.addChild(s);
        return s;
    }
    /** One of Mira's round trees: a trunk and a crown of three circles, in her lilac outline. */
    function tree(g, x, y, s, { crown = 0x2c4a36, hi = 0x4f7c50, ink = 0x8a6cc0, lean = 0, rim = 0 } = {}) {
        g.moveTo(x - 9 * s, y).lineTo(x - 6 * s + lean * 40 * s, y - 150 * s).lineTo(x + 6 * s + lean * 40 * s, y - 150 * s).lineTo(x + 9 * s, y).closePath().fill(pen.fill(0x3a2c22));
        const cx = x + lean * 80 * s, cy = y - 190 * s;
        g.circle(cx, cy, 72 * s).fill(pen.fill(crown)).stroke(pen.line(ink, 2.2, 0.75));
        g.circle(cx - 44 * s, cy + 30 * s, 46 * s).fill(pen.fill(mix(crown, 0x000000, 0.15))).stroke(pen.line(ink, 2, 0.7));
        g.circle(cx + 46 * s, cy + 26 * s, 42 * s).fill(pen.fill(mix(crown, hi, 0.25))).stroke(pen.line(ink, 2, 0.7));
        g.ellipse(cx - 18 * s, cy - 28 * s, 30 * s, 16 * s).fill(pen.hatch(hi, 0.55));
        if (rim) arcAt(g, cx, cy, 70 * s, Math.PI * 1.1, Math.PI * 1.8).stroke(pen.line(0xe3ecff, 3 * s, rim));
    }

    // ===============================================================================================================
    // launch
    // ===============================================================================================================
    function groundY(x) { const a = Math.abs(x); return a < 170 ? 0 : Math.min(700, ((a - 170) / 1230) ** 1.6 * 700); }
    /** Tordyveln's ball of eggshells (as Äventyr 2 draws it after the story): speckled white pieces, the finest yet. */
    function shellBall(x, y, s) {
        const sb = new PIXI.Graphics(), R = 34;
        sb.circle(0, -R, R).fill(pen.fill(0xf3eee0)).stroke(pen.line(0x6f6658, 2.2));
        for (let i = 0; i < 9; i++) {
            const a = i * 2.17, r = 8 + (i * 5) % 20, px = Math.cos(a) * r, py = -R + Math.sin(a) * r;
            sb.poly([px - 6, py - 3, px + 4, py - 6, px + 7, py + 3, px - 2, py + 6]).fill(pen.fill(i % 3 ? 0xe8e1cc : 0xdfe8ef, 0.95)).stroke(pen.line(0x8a8070, 1.2, 0.8));
        }
        for (let i = 0; i < 6; i++) sb.circle(Math.cos(i * 1.9) * 15, -R + Math.sin(i * 1.9) * 12, 2).fill({ color: 0x9a8c74, alpha: 0.7 }); // the eggs' speckles
        sb.ellipse(-8, -R - 10, 6, 3).fill({ color: 0xffffff, alpha: 0.6 });
        sb.position.set(x, y + 4); sb.scale.set(s);
        return sb;
    }
    /** A pale glow behind a dark one at night (as Skatan's own, in Äventyr 2's characters). */
    function beetleGlow(x, y) {
        const g = new PIXI.Graphics();
        for (const [rx, ry, a] of [[70, 44, 0.08], [56, 35, 0.1], [42, 27, 0.13]]) g.ellipse(x - 6, y - 34, rx, ry).fill({ color: 0xf2ecd8, alpha: a });
        return g;
    }
    function buildLaunch({ flameTexture = null, cloudTexture = null } = {}) {
        const L = { kind: 'launch' };
        L.layer = new RAW.Container(); root.addChild(L.layer);
        // space: deep and still, with more stars than any page has
        L.space = new RAW.Graphics(); L.layer.addChild(L.space);
        L.spaceStars = new RAW.Container(); L.layer.addChild(L.spaceStars);
        for (let i = 0; i < 160; i++) {
            const s = new RAW.Sprite(i % 9 ? TX.dot : TX.cross); s.anchor.set(0.5); s._x = hash(i, 301); s._y = hash(i, 302);
            s.scale.set(i % 9 ? 0.25 + hash(i, 303) * 0.55 : 0.5 + hash(i, 304) * 0.5); s._a = 0.35 + hash(i, 305) * 0.6; s._tw = hash(i, 306) * 6;
            s.tint = hash(i, 307) > 0.85 ? 0xffe7b8 : hash(i, 307) > 0.7 ? 0xcfe0ff : 0xffffff;
            L.spaceStars.addChild(s);
        }
        L.nebula = new RAW.Graphics(); L.layer.addChild(L.nebula);
        // the page of the magic forest, in world units
        // the paper's edge and shadow round the page (screen space, drawn under it)
        L.edge = new RAW.Graphics(); L.layer.addChild(L.edge);
        L.wc = new PIXI.Container(); L.layer.addChild(L.wc);
        const pg = new PIXI.Graphics();
        // the paper's edge and its shadow on the dark (seen once the camera has pulled back)
        pg.rect(PAGE.x0 + 60, PAGE.y0 + 80, PAGE.x1 - PAGE.x0, PAGE.y1 - PAGE.y0).fill({ color: 0x000000, alpha: 0.45 });
        pg.rect(PAGE.x0 - 24, PAGE.y0 - 24, PAGE.x1 - PAGE.x0 + 48, PAGE.y1 - PAGE.y0 + 48).fill(pen.material('mat-paper', 1, 0xf3ecdc));
        // its night sky, a little dimmer now: ten stars are missing from it
        const n = 16;
        for (let i = 0; i < n; i++) {
            const u = i / (n - 1), y0 = lerp(PAGE.y0, 700, i / n), y1 = lerp(PAGE.y0, 700, (i + 1) / n) + 2;
            const c = u < 0.6 ? mix(0x141936, NIGHT[0], u / 0.6) : mix(NIGHT[0], 0x30406c, (u - 0.6) / 0.4);
            pg.rect(PAGE.x0, y0, PAGE.x1 - PAGE.x0, y1 - y0).fill({ color: c });
        }
        pg.rect(PAGE.x0, PAGE.y0, PAGE.x1 - PAGE.x0, 700 - PAGE.y0).fill(pen.hatch(0x0a0d24, 0.4));
        // under the night the page is the forest floor's dark green: the hill's pencil fills stop short of the foot of
        // the page on screen (about y 950, cause not found), and on a tall phone the paper showed there as a grey band
        pg.rect(PAGE.x0, 700, PAGE.x1 - PAGE.x0, PAGE.y1 - 700).fill({ color: 0x1f3229 });
        for (let i = 0; i < 140; i++) {
            const x = lerp(PAGE.x0, PAGE.x1, hash(i, 341)), y = lerp(PAGE.y0, 600, hash(i, 342)), len = 120 + hash(i, 343) * 220;
            pg.moveTo(x, y).lineTo(x + len * 0.62, y + len * 0.78);
        }
        pg.stroke({ color: 0x0a0d24, width: 7, alpha: 0.16, cap: 'round' });
        for (let i = 0; i < 90; i++) {
            const x = lerp(PAGE.x0, PAGE.x1, hash(i, 311)), y = lerp(PAGE.y0, 300, hash(i, 312)), r = 4 + hash(i, 313) * 6;
            pg.moveTo(x - r, y).lineTo(x + r, y).moveTo(x, y - r).lineTo(x, y + r).stroke(pen.line(0xeef0ff, 2.4, 0.5 + hash(i, 314) * 0.4));
        }
        // where Alva's stars were: ten small white holes in the forest's sky
        for (let i = 0; i < 10; i++) {
            const x = lerp(-1500, 1700, hash(i, 321)), y = lerp(-2300, -700, hash(i, 322)), pts = [];
            for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, r = 1 + 0.2 * Math.sin(a * 3 + i) + (hash(k, i * 9) - 0.5) * 0.25; pts.push(x + Math.cos(a) * 62 * r, y + Math.sin(a) * 36 * r); }
            pg.poly(pts).fill({ color: 0xd9d6e2, alpha: 0.7 }).stroke({ color: 0x6c6880, width: 7, alpha: 0.3 });
            for (let k = 0; k < 5; k++) pg.moveTo(x - 50 + hash(k, i) * 10, y - 22 + k * 11).lineTo(x + 50 - hash(k, i + 1) * 10, y - 20 + k * 11);
            pg.stroke({ color: 0x8e8aa0, width: 4, alpha: 0.3, cap: 'round' });
        }
        L.wc.addChild(pg);
        // the forest, the hill and the crowd
        const land = new PIXI.Graphics();
        for (let i = 0; i < 46; i++) { const x = lerp(PAGE.x0 + 60, PAGE.x1 - 60, i / 45) + (hash(i, 331) - 0.5) * 60; if (Math.abs(x) < 900) continue; tree(land, x, 760 + hash(i, 332) * 70, 1.5 + hash(i, 333) * 0.6, { crown: 0x203a2c }); }
        const hill = [];
        for (let x = PAGE.x0; x <= PAGE.x1; x += 40) hill.push([x, groundY(x)]);
        land.poly([...hill.flat(), PAGE.x1, PAGE.y1, PAGE.x0, PAGE.y1]).fill(pen.fill(0x2f4a3c));
        land.poly([...hill.flat(), PAGE.x1, PAGE.y1, PAGE.x0, PAGE.y1]).fill(pen.hatch(0x1c2c24, 0.6));
        land.moveTo(...hill[0]); for (const p of hill) land.lineTo(...p); land.stroke(pen.line(0x7f9f78, 6, 0.65));
        for (let x = -1300; x < 1300; x += 22) { const y = groundY(x); land.moveTo(x, y + 2).lineTo(x + 4, y - 12).stroke(pen.line(0x5d7c58, 2.4, 0.7)); }
        for (const [x, s] of [[-760, 1.5], [-1080, 1.8], [820, 1.6], [1150, 1.9], [-1500, 2.2], [1560, 2.3]]) tree(land, x, groundY(x) + 6, s, { lean: 0 });
        // darker towards the foot of the page, softly, over the hatching (a solid strip read as a grey band on a phone)
        for (let i = 0; i < 6; i++) land.rect(PAGE.x0, 860 + i * 60, PAGE.x1 - PAGE.x0, PAGE.y1 - (860 + i * 60)).fill({ color: 0x0f1a14, alpha: 0.12 });
        L.wc.addChild(land);
        // the crowd: the forest has come to wave
        L.crowd = new PIXI.Container(); L.wc.addChild(L.crowd);
        L.tukan = createTukan(PIXI, pen); L.crowd.addChild(L.tukan.view);
        L.tukanA = { visible: true, x: -300, y: groundY(-300), facing: 1, pose: 'idle', vx: 0, distance: 0, talking: false };
        L.kids = [];
        for (let i = 0; i < 10; i++) {
            const k = createHatchling(PIXI, pen); const x = -470 + i * 30 + (i % 2) * 8, y = groundY(x);
            k.view.position.set(x, y); k.view.scale.set(i === 9 ? 1.05 : 1.35); L.crowd.addChild(k.view); L.kids.push({ k, x, i });
        }
        L.skata = createMagpie(PIXI, pen); L.skata.view.scale.set(2); L.crowd.addChild(L.skata.view);
        L.skataA = { visible: true, x: SKATA_X, y: groundY(SKATA_X), facing: -1, talking: false };
        // Tordyveln, with his finest ball, rolled from the hatched eggs' shells after Äventyr 2. A dark-blue beetle on
        // the dark hill at night could not be seen behind Skatan ("Jag saknar tordyveln", 13 November): he is bigger
        // and stands up on his pale ball (as a dung beetle does to find its way by the Milky Way), with a moonlit glow
        // behind him as Skatan has
        const ballY = groundY(BALL_X), topY = ballY - 2 * 34 * BALL_S + 6;
        L.crowd.addChild(beetleGlow(BALL_X, topY));
        L.crowd.addChild(shellBall(BALL_X, ballY, BALL_S));
        L.dyvel = createBeetle(PIXI, pen); L.dyvel.view.scale.set(2); L.crowd.addChild(L.dyvel.view);
        L.dyvelA = { visible: true, x: BALL_X, y: topY, facing: -1, talking: false };
        // the sköldhäst and Professor Klo, who go aboard
        if (heroFactory) {
            try { L.hero = heroFactory(); L.wc.addChild(L.hero.view); } catch (err) { console.warn('Sköldhästen: launch hero', err); L.hero = null; }
            L.heroS = { x: 150, y: 0, facing: -1, gait: 'stand', speed: 0, mode: 'ground', gaitPhase: 0, groundAngle: 0, airT: 0, vx: 0, vy: 0,
                groundAt: (gx) => groundY(gx), submerge: 0, waterY: null, wet: 0, hide: 0, hiddenMode: false, action: null, actionT: 0, time: 0 };
        }
        try { L.klo = createKlo(PIXI, { texture: T }); L.wc.addChild(L.klo.container); } catch (err) { console.warn('Sköldhästen: launch Klo', err); L.klo = null; }
        L.kloA = { visible: true, x: 250, y: 0, facing: -1, vx: 0, distance: 0, pose: 'idle', scene: undefined };
        // the rocket, its glow, its smoke
        L.smoke = new RAW.Container(); L.wc.addChild(L.smoke);
        L.rocketGlow = new RAW.Sprite(TX.glow); L.rocketGlow.anchor.set(0.5); L.rocketGlow.tint = 0xffc27a; L.rocketGlow.alpha = 0; L.wc.addChild(L.rocketGlow);
        L.rocket = rocketRig(flameTexture);
        if (flameTexture) { try { L.rocket.setFlame?.(flameTexture); } catch (err) { console.warn(err); } }
        L.wc.addChild(L.rocket.view);
        L.rocketS = { flame: 0, fin: 'whole', rubbed: 0, tilt: 0 };
        L.rp = { x: 0, y: 0, rot: 0 };
        // Molnet, who follows them up as far as the air reaches
        L.moln = createCloud(PIXI, pen, { texture: cloudTexture }); L.moln.view.scale.set(1.5); L.wc.addChild(L.moln.view);
        L.molnA = { visible: true, x: -360, y: -470, pose: 'hope' };
        // the nest: a point of warm light when the page is small
        L.nest = new RAW.Sprite(TX.glow); L.nest.anchor.set(0.5); L.nest.tint = 0xffd98a; L.layer.addChild(L.nest);
        // the Moon (screen space: it is far away, and comes nearer)
        L.moon = skyMoon(); L.moonGlow = new RAW.Sprite(TX.glow); L.moonGlow.anchor.set(0.5); L.moonGlow.tint = 0xfff2c4;
        L.moonBack = moonBack();
        L.layer.addChild(L.moonGlow, L.moonBack, L.moon.view);
        // the rocket again, in screen space, for the last stretch to the Moon
        L.far = rocketRig(flameTexture); if (flameTexture) { try { L.far.setFlame?.(flameTexture); } catch { /* stand-in */ } }
        L.far.view.visible = false; L.layer.addChild(L.far.view);
        L.veil = new RAW.Graphics(); L.layer.addChild(L.veil);
        L.dim = new RAW.Graphics(); L.layer.addChild(L.dim);
        L.cam = { x: 0, y: -200, z: 1 };
        L.phase = 'ground'; L.u = 0; L.veilA = 1; L.dimA = 0; L.space01 = 0; L.moonK = 0; L.shake = 0;
        return L;
    }
    /** Where the rocket is at climb u (0–1): up in a curve, out to the right first because of the crooked fin. */
    function rocketPath(u) {
        const y = -FLIGHT * (0.35 * u + 0.65 * u * u); // up at once, then faster and faster
        const x = 520 * Math.pow(Math.sin(Math.PI * u), 1.6) * (1 - 0.45 * u);
        return { x, y };
    }
    function stepLaunch(dt) {
        const L = P, { W, H } = size(), m = rm();
        const unit = Math.min(W, H);
        // the camera
        const portrait = H > W * 1.15;
        const zA = portrait ? W / PORTRAIT_W : Math.min(W / 2100, H / 1250, 1.2);
        const cxA = portrait ? PORTRAIT_CX : -30, cyA = -0.15 * H / zA;
        const zB = Math.min(W / (PAGE.x1 - PAGE.x0 + 1400), H / (PAGE.y1 - PAGE.y0 + 2600));
        let cx, cy, z;
        if (L.phase === 'ground' || L.phase === 'ignite') { cx = cxA; cy = cyA; z = zA; }
        else if (L.phase === 'climb') {
            const u = L.u, e = ease(u);
            const rp = rocketPath(u);
            z = zA * Math.pow(zB / zA, ease(Math.min(1, u * 1.15)));
            const follow = clamp(u * 2.4, 0, 1);
            cx = lerp(cxA, rp.x * 0.6, follow) * (1 - e) + (PAGE.x0 + PAGE.x1) / 2 * e;
            cy = lerp(cyA, rp.y + 0.18 * H / z, follow);
            cy = lerp(cy, (PAGE.y0 + PAGE.y1) / 2 - 1100, e * e);
        } else {
            // the page grows small; then the Moon comes
            const u = L.phase === 'page' ? L.u : 1, v = L.phase === 'moon' ? L.u : L.phase === 'end' ? 1 : 0;
            z = zB * lerp(1, 0.42, ease(u)) * lerp(1, 0.6, ease(v));
            cx = (PAGE.x0 + PAGE.x1) / 2; cy = lerp((PAGE.y0 + PAGE.y1) / 2 - 1100, PAGE.y0 - 0.12 * H / z, ease(u));
        }
        L.cam.x = cx; L.cam.y = cy; L.cam.z = z;
        const shx = L.shake > 0 && !m ? (Math.random() - 0.5) * L.shake : 0;
        L.shake = Math.max(0, L.shake - dt * 18);
        L.wc.scale.set(z);
        L.wc.position.set(W / 2 - cx * z + shx, H / 2 - cy * z);
        const toScreen = (x, y) => ({ x: W / 2 + (x - cx) * z, y: H / 2 + (y - cy) * z });
        // space, behind the page
        L.space.clear(); bands(L.space, W, H, [0x05060f, 0x0b0e22, 0x141a38]);
        const outside = L.phase === 'page' || L.phase === 'moon' || L.phase === 'end' ? 1 : L.phase === 'climb' ? clamp((L.u - 0.55) / 0.45, 0, 1) : 0;
        L.space01 = outside;
        L.spaceStars.children.forEach((s, i) => { s.position.set(s._x * W, s._y * H); s.alpha = s._a * (m ? 0.9 : 0.75 + 0.25 * Math.sin(t * 1.4 + s._tw)) * outside; void i; });
        L.nebula.clear();
        if (outside > 0) {
            for (const [x, y, r, c] of [[0.2, 0.25, 0.32, 0x5a3c8e], [0.82, 0.62, 0.28, 0x2c5d8e], [0.6, 0.12, 0.22, 0x8e3c6a]]) {
                for (let k = 5; k >= 1; k--) L.nebula.circle(x * W, y * H, r * unit * (0.4 + k * 0.14)).fill({ color: c, alpha: 0.025 * outside });
            }
        }
        // the crowd
        L.tukan.update(dt, L.tukanA, t, { reducedMotion: m });
        L.tukanA.y = groundY(L.tukanA.x);
        L.kids.forEach(({ k, i }) => k.update(dt, t, { facing: i < 5 ? 1 : (Math.sin(t * 0.7 + i) > 0 ? 1 : -1), reducedMotion: m }));
        L.skata.update(dt, L.skataA, t, { reducedMotion: m });
        L.dyvel.update(dt, L.dyvelA, t, { reducedMotion: m });
        if (L.hero) { L.heroS.time = t; L.hero.update(dt, L.heroS); L.hero.view.position.set(L.heroS.x, L.heroS.y); }
        if (L.klo) L.klo.update(L.kloA, { time: t, dt, talking: G?.speaker === 'klo', reducedMotion: m });
        L.molnA.pose = L.molnA.pose || 'hope';
        L.moln.update(dt, { ...L.molnA, talking: G?.speaker === 'moln' }, t, { reducedMotion: m, storm: 0 });
        // the rocket
        const r = L.rp;
        // (the rocket's own update turns it by `tilt`)
        L.rocket.view.position.set(r.x, r.y); L.rocketS.tilt = r.rot;
        safe(L.rocket, dt, L.rocketS, t, { reducedMotion: m });
        const fl = L.rocketS.flame;
        const nx = -Math.sin(r.rot), ny = Math.cos(r.rot);
        L.rocketGlow.position.set(r.x + nx * 40, r.y + ny * 40);
        L.rocketGlow.scale.set(2 + 1.2 * fl); L.rocketGlow.alpha = 0.7 * fl;
        // smoke: puffs from the nozzle that swell, drift and fade into a curving trail
        if (fl > 0.05 && L.phase !== 'end' && L.phase !== 'moon') {
            L.puffT = (L.puffT || 0) - dt;
            while (L.puffT <= 0) {
                L.puffT += m ? 0.12 : 0.03;
                const q = new RAW.Sprite(TX.puff); q.anchor.set(0.5); q.tint = 0xe9e5f2;
                q.position.set(r.x + nx * 30 + (Math.random() - 0.5) * 20, r.y + ny * 30);
                q._life = 0; q._s = 3.2 + Math.random() * 1.5; q._vx = (Math.random() - 0.5) * 60; q._vy = 50 + Math.random() * 60;
                L.smoke.addChild(q);
            }
        }
        for (let i = L.smoke.children.length - 1; i >= 0; i--) {
            const q = L.smoke.children[i];
            q._life += dt;
            const v = q._life / 3.4;
            if (v >= 1) { q.destroy(); continue; }
            q.x += q._vx * dt; q.y += q._vy * dt;
            q.scale.set(q._s * (0.6 + 2.2 * Math.sqrt(v)));
            q.alpha = 0.7 * (1 - v) * (1 - v);
        }
        // the paper's edge round the page, and its shadow on the dark
        L.edge.clear();
        if (outside > 0.02) {
            const a = toScreen(PAGE.x0, PAGE.y0), b = toScreen(PAGE.x1, PAGE.y1);
            L.edge.rect(a.x + 6, a.y + 8, b.x - a.x, b.y - a.y).fill({ color: 0x000000, alpha: 0.35 * outside });
            L.edge.rect(a.x - 3, a.y - 3, b.x - a.x + 6, b.y - a.y + 6).stroke({ color: 0xf3ecdc, width: 5, alpha: outside });
            L.edge.rect(a.x - 5.5, a.y - 5.5, b.x - a.x + 11, b.y - a.y + 11).stroke({ color: 0x8d806a, width: 1.4, alpha: 0.8 * outside });
        }
        // the nest's point of light, the same size on any screen
        const ns = toScreen(-300, groundY(-300) - 30);
        L.nest.position.set(ns.x, ns.y);
        L.nest.scale.set(Math.max(0.12, unit / 700) * (0.25 + 0.04 * (m ? 0 : Math.sin(t * 2.2))));
        L.nest.alpha = clamp(outside * 1.4, 0, 1) * 0.95;
        // the Moon: high up at first, far away; it comes nearer once the rocket is out of the page
        const moonFill = Math.hypot(W, H) * 0.62;
        const r0 = Math.max(26, unit * 0.06);
        const k = L.moonK;
        let mx = lerp(W * 0.78, W * 0.5, ease(k * 1.4)), my = lerp(Math.max(r0 + 40, H * 0.15), H * 0.42, ease(k));
        let mr = r0 * (1 + outside * 0.6) + (moonFill - r0 * 1.6) * Math.pow(k, 2.2);
        if (L.phase === 'end') { mx = W * 0.5; my = H * 0.5; mr = moonFill; }
        L.moon.view.position.set(mx, my); L.moon.view.scale.set(mr / 100);
        L.moonBack.position.set(mx, my); L.moonBack.scale.set(mr / 100);
        safe(L.moon, dt, t, { bites: 0, lit: 1, drain: 0, reducedMotion: m });
        L.moonGlow.position.set(mx, my); L.moonGlow.scale.set(mr / 22); L.moonGlow.alpha = 0.45;
        // the last stretch: the rocket in screen space, small, flying into the Moon
        if (L.far.view.visible) {
            const a = L.farFrom, u = ease(L.farU);
            const fx = lerp(a.x, mx + mr * 0.08, u), fy = lerp(a.y, my + mr * 0.12, u);
            L.far.view.position.set(fx, fy);
            L.far.view.scale.set(lerp(a.s, a.s * 0.12, u));
            L.far.view.alpha = 1 - clamp((L.farU - 0.85) / 0.15, 0, 1);
            safe(L.far, dt, { flame: 1, fin: 'whole', rubbed: 0, tilt: Math.atan2(my - a.y, mx - a.x) + Math.PI / 2 }, t, { reducedMotion: m });
        }
        L.dim.clear(); if (L.dimA > 0) L.dim.rect(0, 0, W, H).fill({ color: 0x05060f, alpha: L.dimA });
        L.veil.clear(); if (L.veilA > 0) L.veil.rect(0, 0, W, H).fill({ color: 0xfbf8f1, alpha: L.veilA });
    }
    async function launch(data = {}) {
        const L = P = buildLaunch(data);
        const lines = STORY.launch || [], lines2 = STORY.launch2 || [], lines3 = STORY.launch3 || [];
        L.frame = stepLaunch;
        L.bounds = (who) => {
            if (who === 'tukan') return L.tukan.view.getBounds();
            if (who === 'moln' && L.moln.view.visible) return L.moln.view.getBounds();
            if (who === 'klo' && L.klo?.container.visible && L.klo.container.alpha > 0.5) return L.klo.headBounds?.() || L.klo.container.getBounds();
            if (who === 'horse' && L.hero && L.hero.view.alpha > 0.5) return L.hero.headBounds?.() || L.hero.view.getBounds();
            if (who === 'skata') return L.skata.view.getBounds();
            return null;
        };
        // out of the paper white of the table's dive, onto the hill at night
        await tween(rm() ? 0.5 : 1.1, u => { L.veilA = 1 - ease(u); });
        L.veilA = 0;
        await speak(lines);
        // the sköldhäst and Klo go aboard: up to the rocket's foot, and in
        await board(L);
        await speak(lines2);
        // SVÄNG!
        L.phase = 'ignite';
        audio?.sfx?.('whoosh', { gain: 0.8 }); audio?.sfx?.('wind', { gain: 0.6, delay: 0.2 });
        await tween(0.8, u => { L.rocketS.flame = ease(u); L.shake = 8 * u; });
        if (rm()) return calmLaunch(L, lines3);
        L.phase = 'climb'; L.u = 0;
        const capLine = lines3.find(l => l[0] === 'caption' || typeof l === 'string');
        const capTold = capLine ? Promise.all([ui.caption(typeof capLine === 'string' ? capLine : capLine[1], 3600), wait(1)]) : Promise.resolve();
        let molnTold = null;
        L.molnStop = null;
        await tween(7.2, u => {
            L.u = u;
            const rp = rocketPath(u), d0 = rocketPath(Math.max(0, u - 0.005)), d = rocketPath(Math.min(1, u + 0.005));
            // it leaves the hill upright and leans into its curve only once it is off the ground
            L.rp.x = rp.x; L.rp.y = rp.y; L.rp.rot = (Math.atan2(d.y - d0.y, d.x - d0.x) + Math.PI / 2) * ease(u * 6);
            L.shake = u < 0.1 ? 6 * (1 - u / 0.1) : 0;
            // Molnet beside the rocket until the air ends; there it stays and waves
            if (rp.y > AIR_ENDS && !L.molnStop) { const k = clamp(u * 5, 0, 1); L.molnA.x = lerp(-360, rp.x - 300, k); L.molnA.y = Math.min(-470, rp.y + 160); L.molnA.pose = 'happy'; }
            else if (!L.molnStop) { L.molnStop = { x: L.molnA.x, y: L.molnA.y }; molnTold = speak(by(lines3, 'moln')); }
            else { L.molnA.x = L.molnStop.x + Math.sin(t * 2) * 30; L.molnA.y = L.molnStop.y + 40 * Math.min(1, (u - 0.5) * 2); }
        });
        // out of the page: the camera pulls back until the forest is a small lit page in the dark
        const s1 = { x: 0, y: 0 };
        { const { W, H } = size(); const z = L.cam.z; s1.x = W / 2 + (L.rp.x - L.cam.x) * z; s1.y = H / 2 + (L.rp.y - L.cam.y) * z; }
        L.phase = 'page'; L.u = 0;
        // the rocket goes on in screen space from where it is now, toward the Moon
        L.far.view.visible = true; L.rocket.view.visible = false; L.rocketGlow.visible = false;
        L.farFrom = { x: s1.x, y: s1.y, s: L.cam.z }; L.farU = 0;
        const pageDone = tween(3.4, u => { L.u = u; L.moonK = 0.35 * ease(u); L.farU = 0.3 * u; });
        await capTold;
        if (molnTold) await molnTold;
        const horseTold = speak(by(lines3, 'horse'));
        await pageDone;
        // the Moon grows until it fills the frame
        L.phase = 'moon'; L.u = 0;
        await tween(3.2, u => { L.u = u; L.moonK = lerp(0.35, 1, ease(u)); L.farU = lerp(0.3, 1, u); });
        L.phase = 'end'; L.far.view.visible = false;
        for (const n of [L.space, L.spaceStars, L.nebula, L.edge, L.wc, L.nest]) n.visible = false;
        await horseTold;
        await wait(0.4);
        held = L;
    }
    async function board(L) {
        const hx0 = L.heroS?.x ?? 0, kx0 = L.kloA.x;
        if (L.hero) { L.heroS.gait = 'walk'; L.heroS.speed = L.heroS.vx = 300; }
        L.kloA.vx = 200;
        await tween(rm() ? 0.4 : 1.3, u => {
            const e = ease(u);
            if (L.hero) { L.heroS.x = lerp(hx0, 40, e); L.heroS.gaitPhase = (L.heroS.gaitPhase + 0.02) % 1; L.hero.view.alpha = 1 - clamp((u - 0.6) / 0.4, 0, 1); }
            const kx = lerp(kx0, 60, e); L.kloA.distance += Math.abs(kx - L.kloA.x); L.kloA.x = kx;
            if (L.klo) L.klo.container.alpha = 1 - clamp((u - 0.7) / 0.3, 0, 1);
        });
        if (L.hero) { L.hero.view.visible = false; L.heroS.gait = 'stand'; }
        L.kloA.visible = false;
        audio?.sfx?.('gate', { gain: 0.4 });
    }
    /** With less motion: the same flight as four still pictures, each dissolving into the next through the dark. */
    async function calmLaunch(L, lines3) {
        const through = async (set) => { await tween(0.45, u => { L.dimA = ease(u); }); set(); await tween(0.55, u => { L.dimA = 1 - ease(u); }); };
        await through(() => { L.phase = 'climb'; L.u = 0.42; const rp = rocketPath(0.42); Object.assign(L.rp, { x: rp.x, y: rp.y, rot: 0.25 }); L.molnA.x = rp.x - 300; L.molnA.y = rp.y + 160; L.molnA.pose = 'happy'; });
        await speak(lines3.filter(l => l[0] === 'caption' || typeof l === 'string'));
        await speak(by(lines3, 'moln'));
        await through(() => { L.phase = 'page'; L.u = 1; L.moonK = 0.35; L.rocket.view.visible = false; L.rocketGlow.visible = false; });
        await speak(by(lines3, 'horse'));
        await through(() => { L.phase = 'end'; L.moonK = 1; for (const n of [L.space, L.spaceStars, L.nebula, L.edge, L.wc, L.nest]) n.visible = false; });
        held = L;
    }

    // ===============================================================================================================
    // forestDark: six pictures in the lightning
    // ===============================================================================================================
    /** The flash-lit palette: a pale sky, solid dark shapes with a bright rim on the side the flash came from. */
    const LIT = { sky: [0xe6eaf8, 0xc9cfe9, 0x9ea6cb], ink: 0x141829, mid: 0x232843, rim: 0xffffff };
    const solid = (color, alpha = 1) => ({ color, alpha });
    function stillBase(c, W, H, { sky = LIT.sky } = {}) {
        const g = new RAW.Graphics(); bands(g, W, H, sky); c.addChild(g);
        return g;
    }
    /** Rain, driven the way the wind blows (left to right, as the trees bend and the leaves fly). */
    function rain(g, W, H, n = 70, alpha = 0.55, lean = 0.32) {
        for (let i = 0; i < n; i++) { const x = hash(i, 401) * (W + H * lean) - H * lean, y = hash(i, 402) * H, l = 30 + hash(i, 403) * 40; g.moveTo(x, y).lineTo(x + l * lean, y + l); }
        g.stroke({ color: 0x8e98bf, width: 2, alpha, cap: 'round' });
    }
    /** A leaf torn off in the storm: pointed, turning in the air, two short dashes of its flight behind it. */
    function leaf(g, x, y, s, rot, color = LIT.mid) {
        const c = Math.cos(rot), sn = Math.sin(rot), P = (u, v) => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s];
        const a = P(-8, 0), b = P(8, 0), up = P(0, -7), dn = P(1, 6);
        g.moveTo(...a).quadraticCurveTo(...up, ...b).quadraticCurveTo(...dn, ...a).closePath().fill(pen.fill(color));
        g.moveTo(...a).lineTo(...b).stroke(pen.line(0x5a628a, 0.9 * s, 0.7));
        for (let d = 1; d <= 2; d++) g.moveTo(x - (10 + d * 13) * s, y + d * 2.5 * s).lineTo(x - (3 + d * 13) * s, y + d * 1.6 * s);
        g.stroke({ color: 0x8e98bf, width: 1.4 * s, alpha: 0.55, cap: 'round' });
    }
    /** The lightning itself: a jagged white bolt with a soft glow, from the top of the picture. */
    function bolt(g, x, y, len, w, seed) {
        const pts = [[x, y]];
        let px = x, py = y;
        while (py < y + len) { px += (hash(py, seed) - 0.5) * len * 0.22; py += len * (0.08 + hash(py, seed + 1) * 0.08); pts.push([px, py]); }
        for (const [k, a] of [[6, 0.12], [3, 0.3], [1, 1]]) { g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke({ color: k > 1 ? 0xe9edff : 0xffffff, width: w * k, alpha: a, cap: 'round', join: 'round' }); }
        const [bx, by] = pts[Math.floor(pts.length / 2)];
        g.moveTo(bx, by).lineTo(bx + len * 0.18, by + len * 0.2).stroke({ color: 0xffffff, width: w * 0.8, alpha: 0.9, cap: 'round' });
    }
    /**
     * A tree bent over by the storm, drawn in pencil and silhouetted in the flash. The trunk is rooted upright and
     * leans harder downwind towards the top. Its branches stream the same way. The crown is one leafy mass with a
     * scalloped edge, blown out sideways and torn into tufts and bare twigs downwind. It has pencil hatching inside,
     * the clumps of leaves are drawn in lighter lines, and the lightning lights the upper edges. Leaves fly off it.
     * (12 November: first beads of circles on a bent stick, then hoops with spiky stars on top.)
     */
    function windTree(g, x, y, h, k = 1, { far = false } = {}) {
        const seed = Math.round(x * 7 + h * 3), r = (i) => hash(i, seed), TAU = Math.PI * 2;
        // a far row behind is paler (the storm's air between), so the trees read one by one
        const INK = far ? 0x3b4268 : LIT.ink, MID = far ? 0x4a5278 : LIT.mid, LINE = far ? 0x5a628a : 0x3d4574;
        const rimW = (far ? 1.3 : 2.1) * k, rimA = far ? 0.32 : 0.62;
        // pressed in dark, with only a little of the paper's tooth showing (full tooth turned them to grey speckle)
        const ink = (pts, color) => { g.poly(pts).fill(solid(color)); g.poly(pts).fill(pen.fill(mix(color, 0xffffff, 0.1), 0.35)); };
        // the trunk: upright at the root, then leaning harder and harder downwind
        const lean = 0.26 + r(1) * 0.14;
        const top = [x + h * lean, y - h * (0.8 - lean * 0.2)], ctrl = [x + h * 0.05, y - h * 0.5];
        const at = (u) => [(1 - u) * (1 - u) * x + 2 * (1 - u) * u * ctrl[0] + u * u * top[0], (1 - u) * (1 - u) * y + 2 * (1 - u) * u * ctrl[1] + u * u * top[1]];
        const L = [], R = [], n = 16;
        for (let i = 0; i <= n; i++) {
            const u = i / n, [px, py] = at(u), [qx, qy] = at(Math.min(1, u + 0.02)), [ox, oy] = at(Math.max(0, u - 0.02));
            const tx = qx - ox, ty = qy - oy, d = Math.hypot(tx, ty) || 1, nx = -ty / d, ny = tx / d;
            const w = h * (0.046 * (1 - u) + 0.012) * (u < 0.1 ? 1 + (0.1 - u) * 7 : 1);
            L.push([px + nx * w, py + ny * w]); R.push([px - nx * w, py - ny * w]);
        }
        // two roots gripping the ground
        ink([x - h * 0.11, y + 3, x - h * 0.02, y - h * 0.07, x + h * 0.01, y + 3], INK);
        ink([x + h * 0.1, y + 3, x + h * 0.02, y - h * 0.06, x - h * 0.01, y + 3], INK);
        ink([...L, ...R.slice().reverse()].flat(), INK);
        // the bark: lit along its upper side, a few pencil lines down its length
        g.moveTo(...L[1]); for (const q of L.slice(2, -3)) g.lineTo(...q);
        g.stroke(pen.line(LIT.rim, 1.5 * k, far ? 0.3 : 0.5));
        if (!far) for (let b = 0; b < 3; b++) {
            const o = -0.45 + b * 0.4 + r(5 + b) * 0.15, u0 = 0.06 + r(8 + b) * 0.2, u1 = u0 + 0.3 + r(11 + b) * 0.25;
            const pt = (u) => { const i = Math.min(n, Math.round(u * n)); return [lerp(R[i][0], L[i][0], 0.5 + o * 0.5), lerp(R[i][1], L[i][1], 0.5 + o * 0.5)]; };
            g.moveTo(...pt(u0)); for (let u = u0 + 0.06; u <= u1; u += 0.06) g.lineTo(...pt(u));
            g.stroke(pen.line(LINE, 1.1 * k, 0.75));
        }
        // branches streaming downwind from the upper trunk, and one on the windward side bent back round
        for (let b = 0; b < 4; b++) {
            const [bx, by] = at(0.52 + b * 0.13), len = h * (0.2 + r(10 + b) * 0.16), up = h * (0.03 + r(20 + b) * 0.09);
            g.moveTo(bx, by).quadraticCurveTo(bx + len * 0.45, by - up * 1.8, bx + len, by - up + h * 0.03)
                .stroke(pen.line(INK, Math.max(1.4 * k, h * (0.02 - b * 0.0035))));
        }
        { const [bx, by] = at(0.7); g.moveTo(bx, by).quadraticCurveTo(bx - h * 0.08, by - h * 0.12, bx + h * 0.02, by - h * 0.21).stroke(pen.line(INK, Math.max(1.2 * k, h * 0.011))); }
        // the crown: one leafy mass, its edge in scallops, blown out sideways; downwind it tears into tufts
        const cx = top[0] + h * 0.15, cy = top[1] - h * 0.06, rx = h * (0.3 + r(30) * 0.09), ry = h * (0.16 + r(31) * 0.05);
        const mass = (sx, sy, sc, sd, N) => {
            const pts = [], seg = [];
            for (let j = 0; j < N; j++) {
                const a0 = j / N * TAU, a1 = (j + 1) / N * TAU, mid = (a0 + a1) / 2;
                const amp = 0.08 + hash(j, sd) * 0.1;
                const tuft = Math.cos(mid) > 0.45 && hash(j, sd + 1) > 0.4 ? 0.12 + hash(j, sd + 2) * 0.18 : 0;
                const s0 = pts.length;
                for (let q = 0; q < 7; q++) {
                    const t = q / 7, a = a0 + (a1 - a0) * t, sw = Math.sin(Math.PI * t), tw = Math.pow(sw, 1.2);
                    const stretch = 1 + 0.4 * Math.max(0, Math.cos(a)) - 0.18 * Math.max(0, -Math.cos(a));
                    const bump = 1 + Math.pow(sw, 0.6) * amp + tuft * tw;
                    pts.push([sx + Math.cos(a) * rx * sc * stretch * bump + tuft * tw * rx * sc * 0.2,
                        sy + Math.sin(a) * ry * sc * (Math.sin(a) > 0 ? 0.78 : 1.12) * bump]);
                }
                seg.push([s0, mid]);
            }
            return { pts, seg };
        };
        const back = mass(cx + h * 0.07, cy + h * 0.06, 0.9, seed + 3, 12), front = mass(cx, cy, 1, seed + 5, 15);
        ink(back.pts.flat(), MID);
        // bare twigs the wind has stripped, poking out of the downwind end
        for (let t = 0; t < (far ? 1 : 3); t++) {
            const sx = cx + rx * (0.95 + r(90 + t) * 0.3), sy = cy + ry * (-0.35 + r(93 + t) * 0.7), len = h * (0.09 + r(96 + t) * 0.07);
            g.moveTo(sx - rx * 0.3, sy).quadraticCurveTo(sx + len * 0.4, sy - h * 0.02, sx + len, sy + h * 0.01)
                .moveTo(sx + len * 0.5, sy - h * 0.012).lineTo(sx + len * 0.75, sy - h * 0.04);
            g.stroke(pen.line(INK, Math.max(1.1 * k, h * 0.007)));
        }
        ink(front.pts.flat(), INK);
        // pencil inside it: hatching over the whole mass, the clumps of leaves drawn in lighter lines, little leaf ticks
        g.poly(front.pts.flat()).fill(pen.hatch(LINE, far ? 0.25 : 0.45));
        if (!far) {
            for (let c = 0; c < 4; c++) {
                const px = cx + rx * (-0.5 + c * 0.38 + (r(100 + c) - 0.5) * 0.15), py = cy + ry * (0.25 - (c % 2) * 0.3 + r(104 + c) * 0.15), rr = ry * (0.42 + r(108 + c) * 0.18);
                arcAt(g, px, py, rr, Math.PI * 1.08, Math.PI * 1.88).stroke(pen.line(LINE, 1.4 * k, 0.85));
            }
            for (let i = 0; i < 10; i++) {
                const tx = cx + rx * (-0.7 + r(40 + i) * 1.5), ty = cy + ry * (-0.5 + r(50 + i) * 1.0);
                g.moveTo(tx, ty).quadraticCurveTo(tx + 5 * k, ty + 4 * k, tx + 11 * k, ty + 1 * k);
            }
            g.stroke(pen.line(LINE, 1.1 * k, 0.7));
        }
        // the flash lights the upper edges, scallop by scallop (a hand's arcs, not one ruled line)
        for (const [s0, mid] of front.seg) {
            if (Math.sin(mid) > -0.25 || Math.cos(mid) > 0.75) continue;
            const run = front.pts.slice(s0 + 1, s0 + 7);
            g.moveTo(...run[0]); for (const q of run.slice(1)) g.lineTo(...q);
            g.stroke(pen.line(LIT.rim, rimW, rimA));
        }
        // leaves torn off it, flying downwind
        if (!far) for (let i = 0; i < 5; i++) {
            const lx = cx + rx * (1.25 + r(60 + i) * 1.1), ly = cy - ry * (0.9 - r(70 + i) * 1.8);
            leaf(g, lx, ly, k, r(80 + i) * 2.4 - 1.2);
        }
    }
    function ground(g, W, H, y, k) {
        g.moveTo(0, y + 6).quadraticCurveTo(W * 0.5, y - 10 * k, W, y + 8).lineTo(W, H).lineTo(0, H).closePath().fill(solid(LIT.ink));
        g.moveTo(0, y + 6).quadraticCurveTo(W * 0.5, y - 10 * k, W, y + 8).stroke({ color: LIT.rim, width: 2.4, alpha: 0.4 });
    }
    function leaves(g, W, H, n, k, seed) {
        for (let i = 0; i < n; i++) leaf(g, hash(i, seed) * W, hash(i, seed + 1) * H * 0.75, k * 1.1, hash(i, seed + 2) * 3 - 1.5);
    }
    /** Molnet's shape (as Äventyr 2 drew it), in the storm's black. */
    function darkCloud(g, cx, cy, R, twist = 0) {
        const lobes = [[-70, 6, 34], [-34, -16, 42], [10, -26, 48], [54, -8, 40], [80, 12, 28], [-10, 16, 44], [40, 18, 36]];
        for (const [i, [x, y, r]] of lobes.entries()) {
            const a = Math.atan2(y, x) + twist * (Math.hypot(x, y) / 90), d = Math.hypot(x, y);
            g.circle(cx + Math.cos(a) * d * R / 80, cy + Math.sin(a) * d * R / 80 * 0.8, r * R / 80).fill(solid(i % 2 ? LIT.mid : LIT.ink));
        }
    }
    const STILLS = [
        // 1. the treetops bent flat by the wind, the nest a small dark ring
        (c, W, H) => {
            const k = Math.min(W, H) / 400, g = new RAW.Graphics(); stillBase(c, W, H);
            bolt(g, W * 0.22, -10, H * 0.42, 2.4 * k, 3);
            const gy = H * 0.7;
            // a far row, paler and smaller, then six near trees of different heights with sky between their crowns
            // (tree heights follow the narrower side: on a phone held upright they were huge and tangled)
            const TH = Math.min(H, W * 1.15);
            for (let i = 0; i < 7; i++) windTree(g, W * (-0.04 + i * 0.16) + hash(i, 421) * 30 * k, gy - 14 * k, TH * (0.18 + hash(i, 422) * 0.07), k, { far: true });
            for (let i = 0; i < 6; i++) windTree(g, W * (-0.1 + i * 0.2) + hash(i, 411) * 34 * k, gy + 6, TH * (0.28 + hash(i, 412) * 0.18), k);
            ground(g, W, H, gy, k);
            g.ellipse(W * 0.5, gy + 30 * k, 40 * k, 12 * k).stroke({ color: 0x05070e, width: 8 * k });
            g.ellipse(W * 0.5, gy + 30 * k, 40 * k, 12 * k).stroke({ color: LIT.rim, width: 1.4, alpha: 0.35 });
            leaves(g, W, H, 14, k, 415);
            rain(g, W, H, 90, 0.6, 0.55);
            c.addChild(g);
        },
        // 2. Molnet, huge now, black, twisted round itself, its own flash inside it
        (c, W, H) => {
            const k = Math.min(W, H) / 400, g = new RAW.Graphics(); stillBase(c, W, H);
            const cx = W * 0.5, cy = H * 0.45, R = Math.min(W * 0.5, H * 0.34);
            // its own flash, inside
            const glow = new RAW.Sprite(TX.glow); glow.anchor.set(0.5); glow.position.set(cx + R * 0.1, cy + R * 0.05); glow.scale.set(R / 40); glow.tint = 0xfff2b0; glow.alpha = 0.9;
            darkCloud(g, cx, cy, R, 0.9);
            // twisted round itself: its lobes wound into a spiral, lit along their edges
            for (let s = 0; s < 3; s++) {
                g.moveTo(cx, cy);
                for (let i = 0; i <= 60; i++) { const a = s * Math.PI * 2 / 3 + i * 0.09, r = R * 0.95 * i / 60; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8); }
                g.stroke({ color: 0x5a6290, width: 4 * k, alpha: 0.7, cap: 'round' });
            }
            c.addChild(g, glow);
            const f = new RAW.Graphics();
            f.moveTo(cx + R * 0.16, cy - R * 0.42).lineTo(cx - R * 0.04, cy - R * 0.02).lineTo(cx + R * 0.12, cy - R * 0.02).lineTo(cx - R * 0.08, cy + R * 0.46).lineTo(cx + R * 0.3, cy - R * 0.1).lineTo(cx + R * 0.13, cy - R * 0.1).lineTo(cx + R * 0.32, cy - R * 0.42).closePath()
                .fill(solid(0xffe46b)).stroke({ color: 0xb98a1c, width: 2 });
            // its face, eyes squeezed shut, mouth wobbling: it is afraid
            const ex = R * 0.32, ey = cy - R * 0.12, ew = R * 0.11;
            for (const sx of [-1, 1]) f.moveTo(cx + sx * ex - ew, ey - ew * 0.5).lineTo(cx + sx * ex, ey + ew * 0.3).lineTo(cx + sx * ex + ew, ey - ew * 0.5);
            f.stroke({ color: 0xe6eaf8, width: 5 * k, cap: 'round', join: 'round' });
            const my = cy + R * 0.32;
            f.moveTo(cx - R * 0.2, my); for (let i = 1; i <= 8; i++) f.lineTo(cx - R * 0.2 + i * R * 0.05, my + (i % 2 ? -1 : 1) * R * 0.03);
            f.stroke({ color: 0xe6eaf8, width: 4 * k, cap: 'round', join: 'round' });
            c.addChild(f);
            const r2 = new RAW.Graphics(); rain(r2, W, H, 60, 0.5, 0.4); c.addChild(r2);
        },
        // 3. through a tear in the clouds: the Moon's face, looking down
        (c, W, H) => {
            const k = Math.min(W, H) / 400, g = new RAW.Graphics(); bands(g, W, H, [0x0b0d18, 0x141729, 0x1e2238]); c.addChild(g);
            const cx = W * 0.5, cy = H * 0.4, R = Math.min(W, H) * 0.25;
            const glow = new RAW.Sprite(TX.glow); glow.anchor.set(0.5); glow.position.set(cx, cy); glow.scale.set(R / 24); glow.tint = 0xb8b4a0; glow.alpha = 0.5; c.addChild(glow);
            const back = moonBack(0x9a9480); back.position.set(cx, cy); back.scale.set(R / 100); c.addChild(back);
            const moon = skyMoon(); moon.view.position.set(cx, cy); moon.view.scale.set(R / 100); back.rotation = moon.view.rotation = 0.1;
            safe(moon, 0.016, 0, { bites: 3, lit: 0.6, drain: 0, reducedMotion: true });
            c.addChild(moon.view);
            // the torn clouds all round it, lit at their torn edges
            const cl = new RAW.Graphics(), ring = R * 1.5;
            const lobes = [];
            for (let i = 0; i < 26; i++) {
                const a = i / 26 * Math.PI * 2 + hash(i, 431) * 0.2, d = ring + hash(i, 432) * R * 0.5, r = R * (0.55 + hash(i, 433) * 0.45);
                lobes.push([cx + Math.cos(a) * (d + r * 0.6), cy + Math.sin(a) * (d + r * 0.6) * 0.85, r, a]);
            }
            for (let i = 0; i < 40; i++) { const a = hash(i, 434) * Math.PI * 2, d = ring * 2 + hash(i, 435) * Math.max(W, H) * 0.6; lobes.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (0.8 + hash(i, 436) * 0.8), a]); }
            for (const [i, [x, y, r]] of lobes.entries()) cl.circle(x, y, r).fill(solid(i % 3 ? 0x10131f : 0x1b1f33));
            for (const [x, y, r, a] of lobes.slice(0, 26)) arcAt(cl, x, y, r - 2, a + Math.PI - 0.5, a + Math.PI + 0.5).stroke({ color: 0xc9cde0, width: 2.2 * k, alpha: 0.45 });
            rain(cl, W, H, 40, 0.3, 0.35);
            c.addChild(cl);
        },
        // 4. the little ones running for Tukankrabban; nine reach her
        (c, W, H) => {
            const k = Math.min(W, H) / 400, g = new RAW.Graphics(); stillBase(c, W, H);
            const gy = H * 0.7;
            bolt(g, W * 0.78, -10, H * 0.38, 2.2 * k, 7);
            for (const [x, h] of [[-0.06, 0.42], [0.1, 0.36], [0.74, 0.4], [0.9, 0.46]]) windTree(g, W * x, gy + 6, Math.min(H, W * 1.15) * h, k);
            ground(g, W, H, gy, k);
            rain(g, W, H, 70, 0.5, 0.5);
            c.addChild(g);
            // the family fits the width: on a phone held upright the outer little ones ran off the picture's edges
            const kf = Math.min(k, (W / 2 - 12) / 290);
            const tu = createTukan(PIXI, pen); tu.view.scale.set(kf * 1.25); c.addChild(tu.view);
            tu.update(0.016, { visible: true, x: W * 0.5, y: gy, facing: 1, pose: 'happy', vx: 0, distance: 0 }, 0.6, { reducedMotion: true });
            const lines = new RAW.Graphics(); c.addChild(lines);
            for (let i = 0; i < 9; i++) {
                const side = i % 2 ? 1 : -1, d = (70 + Math.floor(i / 2) * 46 + hash(i, 441) * 14) * kf, hop = (i % 3 === 1 ? 10 : 0) * kf;
                const x = W * 0.5 + side * d, hk = createHatchling(PIXI, pen); hk.view.scale.set(kf * 1.6);
                hk.update(0.016, 0, { facing: -side, reducedMotion: true }); hk.view.position.set(x, gy - hop); hk.view.rotation = -side * 0.12; c.addChild(hk.view);
                for (let l = 0; l < 3; l++) lines.moveTo(x + side * (20 + l * 4) * kf, gy - hop - (6 + l * 7) * kf).lineTo(x + side * (40 + l * 6) * kf, gy - hop - (6 + l * 7) * kf);
            }
            lines.stroke({ color: 0xffffff, width: 2.2, alpha: 0.85, cap: 'round' });
        },
        // 5. the tenth, the smallest, in the air, turning over, taken by the wind
        (c, W, H) => {
            const k = Math.min(W, H) / 400, g = new RAW.Graphics(); stillBase(c, W, H);
            const gy = H * 0.88;
            for (let i = 0; i < 7; i++) windTree(g, W * (-0.1 + i * 0.17), gy + 10, Math.min(H, W * 1.15) * 0.26, k);
            ground(g, W, H, gy, k);
            for (let i = 0; i < 12; i++) { const x = hash(i, 451) * W, y = hash(i, 452) * H * 0.7; g.moveTo(x, y).quadraticCurveTo(x + 60 * k, y - 18 * k, x + 150 * k, y - 4 * k); }
            g.stroke({ color: 0x8e98bf, width: 2.4, alpha: 0.6, cap: 'round' });
            leaves(g, W, H, 10, k, 455);
            c.addChild(g);
            const x = W * 0.6, y = H * 0.34;
            const arc = new RAW.Graphics();
            arc.moveTo(x - 160 * k, y + 120 * k).quadraticCurveTo(x - 90 * k, y - 10 * k, x - 24 * k, y + 4 * k).stroke({ color: LIT.rim, width: 3, alpha: 0.8, cap: 'round' });
            arc.moveTo(x - 150 * k, y + 140 * k).quadraticCurveTo(x - 80 * k, y + 20 * k, x - 20 * k, y + 22 * k).stroke({ color: LIT.rim, width: 2, alpha: 0.5, cap: 'round' });
            c.addChild(arc);
            const hk = createHatchling(PIXI, pen); hk.update(0.016, 0, { facing: 1, reducedMotion: true });
            hk.view.scale.set(k * 3.4); hk.view.rotation = 2.5; hk.view.position.set(x, y); c.addChild(hk.view);
        },
        // 6. a toucan claw closed round him: he is safe
        (c, W, H) => {
            stillBase(c, W, H, { sky: [0xdfe4f6, 0xc4cbe6, 0xa2abcd] });
            // (the beak's tip, and him in it, stay inside the picture on a phone held upright)
            const k = Math.min(Math.min(W, H) / 400, (W * 0.58 - 12) / 262), cx = W * 0.42, cy = H * 0.5;
            const g = new RAW.Graphics();
            // Tukankrabban's orange shell at the edge of the picture, and her arm reaching out
            g.circle(cx - 260 * k, cy + 200 * k, 180 * k).fill(solid(0xd8862a)).stroke({ color: 0x9a5a14, width: 3 });
            arcAt(g, cx - 260 * k, cy + 200 * k, 170 * k, Math.PI * 1.55, Math.PI * 1.92).stroke({ color: LIT.rim, width: 3, alpha: 0.6 });
            for (const [w, col] of [[30 * k, 0x9a5a14], [24 * k, 0xe8962e]]) g.moveTo(cx - 150 * k, cy + 96 * k).quadraticCurveTo(cx - 100 * k, cy + 30 * k, cx - 30 * k, cy + 14 * k).stroke({ color: col, width: w, cap: 'round' });
            // the toucan head: black, a white eye, an orange beak shut round the little one
            g.ellipse(cx, cy, 62 * k, 50 * k).fill(solid(0x23222a)).stroke({ color: 0x0e0d12, width: 2.4 });
            g.ellipse(cx + 14 * k, cy - 14 * k, 18 * k, 13 * k).fill(solid(0xfbfaf4)); g.ellipse(cx + 17 * k, cy - 13 * k, 6 * k, 8 * k).fill(solid(0x17161c));
            arcAt(g, cx, cy, 60 * k, Math.PI * 1.1, Math.PI * 1.6).stroke({ color: LIT.rim, width: 2.4, alpha: 0.6 });
            // the little one inside: only his eyes on their stalks and a bit of shell over the beak
            const hx = cx + 150 * k, hy = cy - 8 * k;
            g.moveTo(hx - 12 * k, hy - 6 * k).lineTo(hx - 18 * k, hy - 34 * k).moveTo(hx + 8 * k, hy - 6 * k).lineTo(hx + 12 * k, hy - 32 * k).stroke({ color: 0xe8962e, width: 4 * k, cap: 'round' });
            g.circle(hx - 18 * k, hy - 38 * k, 8 * k).fill(solid(0xfbfaf4)).stroke({ color: 0x6f6c78, width: 1.6 }); g.circle(hx - 17 * k, hy - 38 * k, 3.4 * k).fill(solid(0x17161c));
            g.circle(hx + 12 * k, hy - 36 * k, 7 * k).fill(solid(0xfbfaf4)).stroke({ color: 0x6f6c78, width: 1.6 }); g.circle(hx + 13 * k, hy - 36 * k, 3 * k).fill(solid(0x17161c));
            g.ellipse(hx, hy, 34 * k, 16 * k).fill(solid(0xf0a12e)).stroke({ color: 0x9a5a14, width: 2 });
            // upper and lower beak, closed round him like two careful hands
            g.moveTo(cx + 50 * k, cy - 22 * k).quadraticCurveTo(cx + 150 * k, cy - 40 * k, cx + 250 * k, cy - 6 * k).quadraticCurveTo(cx + 190 * k, cy + 6 * k, cx + 120 * k, cy + 4 * k).quadraticCurveTo(cx + 80 * k, cy + 2 * k, cx + 50 * k, cy + 8 * k).closePath()
                .fill(solid(0xf2a23a)).stroke({ color: 0x8b4d1e, width: 2.4 });
            g.moveTo(cx + 210 * k, cy - 20 * k).quadraticCurveTo(cx + 236 * k, cy - 14 * k, cx + 250 * k, cy - 6 * k).quadraticCurveTo(cx + 228 * k, cy + 2 * k, cx + 200 * k, cy + 2 * k).closePath().fill(solid(0x1e1d24));
            g.moveTo(cx + 50 * k, cy + 10 * k).quadraticCurveTo(cx + 140 * k, cy + 40 * k, cx + 236 * k, cy + 4 * k).quadraticCurveTo(cx + 170 * k, cy + 12 * k, cx + 50 * k, cy + 24 * k).closePath()
                .fill(solid(0xe0602e)).stroke({ color: 0x8e3b1c, width: 2 });
            g.moveTo(cx + 60 * k, cy - 26 * k).quadraticCurveTo(cx + 150 * k, cy - 44 * k, cx + 230 * k, cy - 14 * k).stroke({ color: LIT.rim, width: 2.4, alpha: 0.55 });
            const r2 = new RAW.Graphics(); rain(r2, W, H, 40, 0.35, 0.4);
            c.addChild(g, r2);
        }
    ];
    function buildDark() {
        const D = { kind: 'forestDark', layer: new RAW.Container(), black: new RAW.Graphics(), flashG: new RAW.Graphics(), stills: [], blackA: 0, flash: 0, showing: -1, showA: 0 };
        root.addChild(D.layer);
        D.holder = new RAW.Container();
        // in the black, only eyes: whoever speaks is seen by the whites of their eyes (Molnet's, wide with fright;
        // Tukankrabban's on their stalks, and her little ones' under her)
        D.eyes = new RAW.Graphics(); D.eyeK = { moln: 0, tukan: 0, kids: 0 }; D.eyeAt = {};
        D.layer.addChild(D.black, D.holder, D.eyes, D.flashG);
        D.size = { W: 0, H: 0 };
        return D;
    }
    function drawEyes(D, W, H, dt) {
        const g = D.eyes, s = Math.min(W, H) / 420, who = ui.speaker?.() || null, still = D.showA > 0.05, k = D.eyeK;
        dt = Math.min(dt || 1 / 60, 0.1);
        for (const id of ['moln', 'tukan']) k[id] = lerp(k[id], who === id && !still ? 1 : 0, 1 - Math.exp(-6 * dt));
        if (who === 'tukan') k.kids = Math.min(1, k.kids + dt * 0.8);
        g.clear();
        const blink = (o) => (rm() ? 1 : ((t + o) % 3.4) < 0.12 ? 0.15 : 1);
        const eye = (x, y, rx, ry, a, look, o) => {
            const b = blink(o);
            g.ellipse(x, y, rx, ry * b).fill({ color: 0xf6f4ec, alpha: a });
            if (b > 0.5) g.circle(x + look[0] * rx * 0.35, y + look[1] * ry * 0.3, Math.min(rx, ry) * 0.42).fill({ color: 0x0b0d18, alpha: a });
        };
        const look = rm() ? [0, 0] : [Math.sin(t * 2.3) * 0.8, Math.cos(t * 1.7) * 0.4];
        if (k.moln > 0.02) {
            const shake = rm() ? 0 : Math.sin(t * 31) * 1.6 * s, x = W * 0.5 + shake, y = H * 0.46; // under the caption
            eye(x - 24 * s, y, 15 * s, 20 * s, k.moln, look, 0); eye(x + 24 * s, y, 15 * s, 20 * s, k.moln, look, 0);
            // brows, high with fright
            for (const sd of [-1, 1]) g.moveTo(x + sd * 34 * s, y - 30 * s).quadraticCurveTo(x + sd * 24 * s, y - 40 * s, x + sd * 12 * s, y - 32 * s).stroke({ color: 0xcfd2e8, width: 2.4 * s, alpha: k.moln * 0.8, cap: 'round' });
            D.eyeAt.moln = { minX: x - 40 * s, maxX: x + 40 * s, minY: y - 30 * s, maxY: y + 22 * s };
        }
        if (k.tukan > 0.02 || k.kids > 0.02) {
            const x = W * 0.52, y = H * 0.6, a = Math.max(k.tukan, 0.55 * k.kids);
            for (const sd of [-1, 1]) {
                g.moveTo(x + sd * 10 * s, y + 18 * s).lineTo(x + sd * 20 * s, y - 2 * s).stroke({ color: 0xb08a6a, width: 3 * s, alpha: a * 0.7, cap: 'round' });
                eye(x + sd * 21 * s, y - 8 * s, 11 * s, 11 * s, a, look, 1.3);
            }
            // the little ones, huddled under her, more of them as she gathers them in
            for (let i = 0; i < 4; i++) {
                const kk = clamp(k.kids * 4 - i, 0, 1); if (kk <= 0) continue;
                const cx = x + (i - 1.5) * 26 * s, cy = y + 40 * s + (i % 2) * 6 * s;
                for (const sd of [-1, 1]) eye(cx + sd * 5 * s, cy, 4 * s, 4.4 * s, kk * 0.9, look, 0.7 + i);
            }
            D.eyeAt.tukan = { minX: x - 34 * s, maxX: x + 34 * s, minY: y - 24 * s, maxY: y + 20 * s };
        }
    }
    function buildStills(D) {
        const { W, H } = size();
        for (const s of D.stills) s.destroy({ children: true });
        D.stills = STILLS.map((draw, i) => { const c = new PIXI.Container(); draw(c, W, H); c.visible = false; D.holder.addChild(c); c._i = i; return c; });
        D.size = { W, H };
    }
    function stepDark(dt) {
        const D = P, { W, H } = size();
        if (D.size.W !== W || D.size.H !== H) buildStills(D);
        D.black.clear().rect(0, 0, W, H).fill({ color: 0x020308, alpha: D.blackA });
        D.stills.forEach((c, i) => { c.visible = i === D.showing && D.showA > 0; c.alpha = D.showA; });
        D.flashG.clear(); if (D.flash > 0) D.flashG.rect(0, 0, W, H).fill({ color: 0xf2f5ff, alpha: D.flash });
        if (D.eyes) drawEyes(D, W, H, dt);
    }
    /** One stroke of lightning: a white flash, the picture for a quarter of a second, black again, then the thunder. */
    async function strike(D, i, { hold = 0.25 } = {}) {
        if (rm()) {
            D.showing = i;
            await tween(0.5, u => { D.showA = 0.85 * ease(u); });
            await wait(1.1);
            await tween(0.5, u => { D.showA = 0.85 * (1 - ease(u)); });
            audio?.sfx?.('thunder', { gain: 0.3, delay: 0.1 });
            await wait(0.3);
            return;
        }
        D.showing = i; D.showA = 1; D.flash = 0.85;
        await tween(0.12, u => { D.flash = 0.85 * (1 - u); });
        D.flash = 0;
        await wait(hold);
        await tween(0.16, u => { D.showA = 1 - u; });
        D.showA = 0;
        audio?.sfx?.('thunder', { gain: 0.55 + 0.25 * hash(i, 461), delay: 0.25 + hash(i, 462) * 0.35 });
        audio?.sfx?.('wind', { gain: 0.5 });
    }
    async function forestDark() {
        const D = P = buildDark();
        buildStills(D);
        D.frame = stepDark;
        D.bounds = (who) => (D.eyeK?.[who] > 0.3 ? D.eyeAt[who] || null : null);
        const lines = STORY.forestDark || [], lines2 = STORY.forestDark2 || [];
        await tween(0.8, u => { D.blackA = ease(u); });
        D.blackA = 1;
        await speak(lines);
        // It does flash. The storm of Äventyr 2 is back.
        await strike(D, 0); await wait(0.55);
        await strike(D, 1); await wait(0.55);
        await strike(D, 2, { hold: 0.35 }); await wait(0.7);
        await strike(D, 3); await wait(0.3);
        const t2 = by(lines2, 'tukan');
        await speak(t2.slice(0, 1));
        // between her two lines: the smallest in the air, and a toucan claw closing round him, in the same breath
        await strike(D, 4, { hold: 0.22 }); await wait(0.2);
        await strike(D, 5, { hold: 0.45 }); await wait(0.3);
        await speak(t2.slice(1));
        await wait(0.4);
        await tween(0.8, u => { D.blackA = 1 - ease(u); });
        end();
    }

    // ===============================================================================================================
    // forestLight
    // ===============================================================================================================
    function buildLight({ cloudTexture = null } = {}) {
        const { W, H } = size();
        const F = { kind: 'forestLight', layer: new RAW.Container(), calm: 0, part: 0, rainOn: 1, rainFreeze: 0, milky: 0, fadeA: 0, flash: 0, alpha: 0 };
        root.addChild(F.layer);
        F.sky = new RAW.Graphics(); F.layer.addChild(F.sky);
        F.hatch = hatchOver(F.layer, W, H, 0.1);
        F.moonGlow = new RAW.Sprite(TX.glow); F.moonGlow.anchor.set(0.5); F.moonGlow.tint = 0xfff2c4; F.layer.addChild(F.moonGlow);
        F.moonBack = moonBack(); F.moon = skyMoon(); F.layer.addChild(F.moonBack, F.moon.view);
        // the road of stars across the sky
        F.road = new RAW.Container(); F.layer.addChild(F.road);
        F.roadGlow = new RAW.Graphics(); F.road.addChild(F.roadGlow);
        F.roadStars = [];
        for (let i = 0; i < 380; i++) {
            const s = new RAW.Sprite(i % 13 ? TX.dot : TX.cross); s.anchor.set(0.5);
            s._u = hash(i, 501); s._o = (hash(i, 502) - 0.5) * (0.6 + hash(i, 503)); s._k = 0.3 + hash(i, 504) * 0.7; s._tw = hash(i, 505) * 6;
            s.tint = hash(i, 506) > 0.85 ? 0xfff1c0 : 0xffffff;
            F.road.addChild(s); F.roadStars.push(s);
        }
        F.rider = new RAW.Sprite(TX.cross); F.rider.anchor.set(0.5); F.rider.tint = 0xffe08a; F.layer.addChild(F.rider);
        F.riderGlow = new RAW.Sprite(TX.glow); F.riderGlow.anchor.set(0.5); F.riderGlow.tint = 0xffe08a; F.layer.addChild(F.riderGlow);
        // the storm clouds, which part
        F.clouds = new PIXI.Container(); F.layer.addChild(F.clouds);
        F.cloudParts = [];
        for (let i = 0; i < 9; i++) {
            const c = new RAW.Graphics(), w = 240 + hash(i, 511) * 260;
            for (let k = 0; k < 7; k++) { const x = (k / 6 - 0.5) * w, r = 50 + hash(i * 7 + k, 512) * 60; c.circle(x, -Math.sin(k / 6 * Math.PI) * r * 0.6, r).fill({ color: k % 2 ? 0x2e2c48 : 0x3a385a }); }
            for (let k = 0; k < 7; k++) { const x = (k / 6 - 0.5) * w, r = 50 + hash(i * 7 + k, 512) * 60; arcAt(c, x, -Math.sin(k / 6 * Math.PI) * r * 0.6, r, Math.PI * 1.1, Math.PI * 1.9).stroke({ color: 0x8a88b0, width: 2.4, alpha: 0.45 }); }
            F.clouds.addChild(c); F.cloudParts.push({ c, x: hash(i, 513), y: 0.04 + hash(i, 514) * 0.3, side: hash(i, 513) < 0.5 ? -1 : 1, s: 1 + hash(i, 515) });
        }
        F.rain = new RAW.Container(); F.layer.addChild(F.rain);
        F.drops = [];
        for (let i = 0; i < 120; i++) { const s = new RAW.Sprite(TX.streak); s.anchor.set(0.5); s.tint = 0xc9d6ee; F.rain.addChild(s); F.drops.push({ s, x: hash(i, 521), y: hash(i, 522), v: 0.8 + hash(i, 523) }); }
        // the forest, the nest and the family
        F.land = new PIXI.Container(); F.layer.addChild(F.land);
        F.molnGlow = new RAW.Sprite(TX.glow); F.molnGlow.anchor.set(0.5); F.molnGlow.tint = 0xfff6d8; F.layer.addChild(F.molnGlow);
        F.moln = createCloud(PIXI, pen, { texture: cloudTexture }); F.layer.addChild(F.moln.view);
        F.tukan = createTukan(PIXI, pen); F.layer.addChild(F.tukan.view);
        F.kids = []; for (let i = 0; i < 10; i++) { const k = createHatchling(PIXI, pen); F.layer.addChild(k.view); F.kids.push(k); }
        F.flashG = new RAW.Graphics(); F.layer.addChild(F.flashG);
        F.size = { W: 0, H: 0 };
        return F;
    }
    function buildLightLand(F) {
        const { W, H } = size();
        F.land.removeChildren().forEach(c => c.destroy({ children: true }));
        const g = new PIXI.Graphics(), k = Math.min(W, H) / 700, ground = H * 0.86;
        for (let i = 0; i < 12; i++) {
            const x = W * (i / 11) + (hash(i, 531) - 0.5) * 50 * k;
            if (Math.abs(x - W * 0.5) < 150 * k) continue;
            tree(g, x, ground + 30 * k * hash(i, 532), 1.2 * k + hash(i, 533) * 0.5 * k, { crown: 0x24402f, rim: 0.7 });
        }
        g.rect(0, ground, W, H - ground).fill({ color: 0x1d3326 });
        g.rect(0, ground, W, H - ground).fill(pen.hatch(0x0c1610, 0.5));
        g.moveTo(0, ground).quadraticCurveTo(W * 0.5, ground - 14 * k, W, ground).stroke(pen.line(0xb9c8ec, 3, 0.55));
        // the nest
        g.ellipse(W * 0.5, ground + 4 * k, 120 * k, 26 * k).fill(pen.fill(0x8a6a45)).stroke(pen.line(0x4a3524, 2));
        for (let i = 0; i < 14; i++) g.moveTo(W * 0.5 - 110 * k + i * 16 * k, ground - 8 * k).lineTo(W * 0.5 - 100 * k + i * 16 * k, ground + 14 * k);
        g.stroke(pen.line(0xb9975f, 2, 0.8));
        F.land.addChild(g);
        F.ground = ground; F.k = k; F.size = { W, H };
        if (F.hatch) { F.hatch.width = W; F.hatch.height = H; }
    }
    /** The arc the road of stars lies along: from low on the left, over the top, down toward the Moon. */
    function roadAt(u, W, H) {
        const x = lerp(-0.08 * W, 1.08 * W, u), y = H * (0.5 - 0.42 * Math.sin(u * Math.PI * 0.86) + 0.06 * u);
        const dx = 1.16 * W, dy = -H * 0.42 * Math.cos(u * Math.PI * 0.86) * Math.PI * 0.86 + 0.06 * H;
        const L = Math.hypot(dx, dy);
        return { x, y, nx: -dy / L, ny: dx / L };
    }
    function stepLight(dt) {
        const F = P, { W, H } = size(), m = rm();
        if (F.size.W !== W || F.size.H !== H) buildLightLand(F);
        const k = F.k, unit = Math.min(W, H);
        // the sky: from the storm to the moonlit night
        F.sky.clear(); bands(F.sky, W, H, STORM); bands(F.sky, W, H, NIGHT, F.calm);
        if (F.hatch) F.hatch.alpha = 0.16 - 0.08 * F.calm;
        // the Moon comes out of the parting clouds
        const mr = Math.max(30, unit * 0.09), mx = W * 0.76, my = Math.max(mr + 50, H * 0.2);
        F.moon.view.position.set(mx, my); F.moon.view.scale.set(mr / 100); F.moon.view.alpha = F.calm;
        F.moonBack.position.set(mx, my); F.moonBack.scale.set(mr / 100); F.moonBack.alpha = F.calm;
        safe(F.moon, dt, t, { bites: 0, lit: 1, drain: 0, reducedMotion: m });
        F.moonGlow.position.set(mx, my); F.moonGlow.scale.set(mr / 16); F.moonGlow.alpha = 0.55 * F.calm;
        // the road of stars, laid in from the left
        F.roadGlow.clear();
        if (F.milky > 0) {
            const n = 40;
            for (let w = 3; w >= 1; w--) {
                F.roadGlow.moveTo(roadAt(0, W, H).x, roadAt(0, W, H).y);
                for (let i = 1; i <= n * F.milky; i++) { const p = roadAt(i / n, W, H); F.roadGlow.lineTo(p.x, p.y); }
                F.roadGlow.stroke({ color: 0xe9e6ff, width: unit * (0.06 + w * 0.05), alpha: 0.07 * F.milky, cap: 'round' });
            }
        }
        for (const s of F.roadStars) {
            const p = roadAt(s._u, W, H), on = clamp((F.milky - s._u) * 8, 0, 1);
            s.position.set(p.x + p.nx * s._o * unit * 0.07, p.y + p.ny * s._o * unit * 0.07);
            s.scale.set(s._k * Math.max(0.6, unit / 700)); s.alpha = on * (m ? 0.85 : 0.6 + 0.4 * Math.sin(t * 2 + s._tw));
        }
        // the one who galloped it, a small gold spark far up on the road
        const ru = (t * 0.07) % 1, rp = roadAt(0.25 + ru * 0.55, W, H), riderOn = F.milky >= 1 ? 1 : 0;
        F.rider.position.set(rp.x, rp.y); F.rider.scale.set(Math.max(0.7, unit / 600) * (m ? 1 : 1 + 0.2 * Math.sin(t * 9))); F.rider.alpha = riderOn;
        F.riderGlow.position.set(rp.x, rp.y); F.riderGlow.scale.set(Math.max(0.2, unit / 1800)); F.riderGlow.alpha = 0.7 * riderOn;
        // the clouds part, to each side
        for (const q of F.cloudParts) {
            q.c.scale.set(Math.max(0.6, unit / 700) * q.s);
            q.c.position.set(q.x * W + q.side * F.part * W * 0.75, q.y * H - F.part * H * 0.05);
            q.c.alpha = 1 - F.part * 0.85;
        }
        // the rain stops in the middle of a flash: the drops hang still, then fade
        for (const d of F.drops) {
            if (F.rainFreeze < 1 && !m) d.y = (d.y + dt * d.v * 1.7 * (1 - F.rainFreeze)) % 1;
            d.s.position.set(((d.x - d.y * 0.15) % 1 + 1) % 1 * W, d.y * H);
            d.s.rotation = Math.atan2(0.15 * W, H);
            d.s.alpha = 0.5 * F.rainOn;
        }
        // the family at the nest, looking up; Molnet over them, glowing
        F.tukan.view.scale.set(k * 1.6);
        F.tukan.update(dt, { visible: true, x: W * 0.5 - 30 * k, y: F.ground, facing: 1, pose: F.calm > 0.6 ? 'happy' : 'sad', vx: 0, distance: 0, talking: G?.speaker === 'tukan', lookAt: W * 0.9 }, t, { reducedMotion: m });
        F.kids.forEach((kd, i) => {
            kd.view.scale.set(k * 1.5);
            kd.view.position.set(W * 0.5 + (i - 4.5) * 22 * k + (i < 5 ? -40 * k : 40 * k), F.ground + 2);
            kd.update(dt, t, { facing: i < 5 ? 1 : -1, reducedMotion: m });
        });
        const molnX = W * 0.5 - Math.min(260 * k, W * 0.22), molnY = F.ground - Math.min(H * 0.42, 360 * k);
        F.moln.view.scale.set(k * 1.5);
        F.moln.update(dt, { visible: true, x: molnX, y: molnY, pose: F.calm > 0.5 ? 'happy' : 'sad', talking: G?.speaker === 'moln' }, t, { reducedMotion: m, storm: 1 - F.calm });
        F.molnGlow.position.set(molnX, molnY); F.molnGlow.scale.set(3.4 * k); F.molnGlow.alpha = 0.5 * F.calm;
        F.flashG.clear(); if (F.flash > 0) F.flashG.rect(0, 0, W, H).fill({ color: 0xf2f5ff, alpha: F.flash });
        F.layer.alpha = F.alpha;
    }
    async function forestLight(data = {}) {
        const F = P = buildLight(data);
        buildLightLand(F);
        F.frame = stepLight;
        F.bounds = (who) => (who === 'moln' ? F.moln.view.getBounds() : who === 'tukan' ? F.tukan.view.getBounds() : null);
        const lines = STORY.forestLight || [];
        if (rm()) {
            await tween(0.5, u => { F.alpha = ease(u); });
            const told = speak(lines);
            await tween(1.4, u => { F.calm = ease(u); F.part = ease(u); F.rainOn = 1 - ease(u); F.milky = ease(u); });
            await told;
        } else {
            // in the middle of a flash, and then it stops
            F.alpha = 1; F.flash = 1;
            audio?.sfx?.('thunder', { gain: 0.4, delay: 0.3 });
            await tween(0.6, u => { F.flash = 1 - ease(u) * 0.6; });
            await tween(0.5, u => { F.rainFreeze = ease(u); F.flash = 0.4 * (1 - u); });
            F.flash = 0;
            const told = speak(lines);
            await tween(2.2, u => { F.part = ease(u); F.calm = ease(u); F.rainOn = 1 - ease(u * 1.6); });
            audio?.sfx?.('sparkle');
            await tween(2.0, u => { F.milky = ease(u); });
            await told;
        }
        await wait(0.6);
        await tween(0.9, u => { F.alpha = 1 - ease(u); });
        end();
    }

    // ===============================================================================================================
    function begin() {
        app.stage.addChild(root); // on top of everything, the table and the world
        root.visible = true; shown = true; t = 0; held = null;
    }
    function end() {
        if (P) { P.layer?.destroy({ children: true }); P = null; }
        held = null;
        shown = false; root.visible = false;
    }
    async function play(name, data = {}) {
        if (P) end();
        begin();
        try {
            if (name === 'launch') return await launch(data);
            if (name === 'forestDark') return await forestDark(data);
            if (name === 'forestLight') return await forestLight(data);
            console.warn('Sköldhästen: no picture', name);
            end();
        } catch (err) { console.error('Sköldhästen: picture', name, err); end(); }
    }
    /** The held picture (the launch's Moon) dissolves into the world behind it. */
    async function close() {
        const L = held;
        if (!L) { end(); return; }
        held = null;
        await tween(rm() ? 0.4 : 0.9, u => { L.layer.alpha = 1 - ease(u); });
        end();
    }
    function tick(dt) {
        if (!shown) return;
        t += dt;
        for (const tw of tweens.slice()) {
            tw.t += dt;
            const u = Math.min(1, tw.t / tw.dur);
            tw.fn(u);
            if (u >= 1) { tweens.splice(tweens.indexOf(tw), 1); tw.resolve(); }
        }
        try { P?.frame?.(dt); } catch (err) { if (!P?._warned) { if (P) P._warned = true; console.warn('Sköldhästen: picture frame', err); } }
    }
    return {
        play, close, tick,
        get shown() { return shown; },
        get holding() { return !!held; },
        speakerBounds(who) { try { return P?.bounds?.(who) || null; } catch { return null; } },
        /** For checks only (browser checks, contact sheets): hold one of forestDark's six pictures on screen. */
        debugStill(i) {
            if (P) end();
            begin();
            const D = P = buildDark(); buildStills(D); D.frame = stepDark; D.bounds = () => null;
            D.blackA = 1; D.showing = i; D.showA = 1;
        },
        destroy() { tweens.forEach(tw => tw.resolve()); tweens = []; end(); root.destroy({ children: true }); }
    };
}
