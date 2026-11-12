/*
 * Äventyr 3 – Alva's table: the night page is made (prologue) and looked at again (epilogue).
 * Design: docs/skoldhast/adventure-3.md, sections 10 (beat 1), 11.1 and 11.13.
 *
 *   const table = createTable({ PIXI, app, assets, ui, audio, G, heroFactory });
 *   const { flame } = await table.prologue();     // flame: the player's drawn flame ({ texture, pts, color }) or null
 *   await table.reveal();                          // lift the table off the world (once the world is set)
 *   await table.epilogue({ flameTexture });
 *   table.tick(dt) every frame while table.shown; table.opaque says whether it covers the world.
 *
 * The prologue: a new page, at night, over the magic forest of the last one. Alva paints Nova in watercolour (the
 * paint spreads in wet blooms; it is not a pencil line), Mira draws her rocket with its crooked fin, the player draws
 * the rocket's flame with Mira's pencils (kept like Äventyr 2's cloud: strokes.flame / strokes.flameColor, rebuilt with
 * createUserFlame), Alva finds one of her ten stars crooked and rubs it out with the eraser that lay on the desk, and
 * the other nine go out one after another, leaving white holes; the forest below grows darker. The eraser is seen on
 * screen once, and after that it is simply not on the desk any more (section 7's fair play: no caption says so).
 *
 * The epilogue: the finished sky (Vintergatan, the Moon whole, the gold constellation), the eraser back on the desk
 * with Mira's eyes and Alva's gold star, a new rocket even more crooked, and the window, where one of the real
 * constellations has hooves.
 *
 * Alva and Mira are heard, never seen: their pencils (and Alva's brush) are. Everything is drawn in code.
 */
import { pencilStyle, pencilPixi } from '../../src/pencil-style.mjs';
import { createKlo } from '../../src/klo.mjs';
import { simplifyStroke } from '../../src/drawing-geometry.mjs';
import * as C3 from './characters.mjs';
import * as SV from './content/sv.mjs';

const PAGE_W = 1000, PAGE_H = 667;
const MIRA = 0x8a6cc0;
/** An arc that starts where it starts (a bare arc() is joined by a line to wherever the pen last was). */
const arcAt = (g, x, y, r, a0, a1) => g.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r).arc(x, y, r, a0, a1);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (x, s = 0) => { const v = Math.sin(x * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const mixc = (a, b, t) => {
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
};

// ---------------------------------------------------------------------------------------------------------------
// The flame the player draws under Mira's rocket (kept like Äventyr 2's cloud, src/user-cloud.mjs)
// ---------------------------------------------------------------------------------------------------------------
export const FLAME_PENCILS = Object.freeze([
    { id: 'orange', color: '#f28a35', ink: '#a24d16', core: '#ffe39a' },
    { id: 'yellow', color: '#f5cb3f', ink: '#a07a18', core: '#fff7cf' },
    { id: 'red', color: '#e0503a', ink: '#8f2a1d', core: '#ffc277' },
    { id: 'pink', color: '#ec8cbd', ink: '#9c4874', core: '#ffe6f2' },
    { id: 'blue', color: '#6cb0ea', ink: '#2c659d', core: '#e8f7ff' }
]);
// the pencils' names (WORDS.flameColors wins when the words have them)
const FLAME_LABELS = { orange: 'Orange', yellow: 'Gul', red: 'Röd', pink: 'Rosa', blue: 'Blå' };
export const flameColor = (value) => (FLAME_PENCILS.some(p => p.id === value) ? value : 'orange');
export function flamePoints(points) {
    if (!Array.isArray(points)) return [];
    const finite = points.filter(p => Array.isArray(p) && p.length >= 2 && p.slice(0, 2).every(v => Number.isFinite(v) && Math.abs(v) <= 10000)).map(p => p.slice(0, 2));
    return simplifyStroke(finite, 200);
}
function path(ctx, points, closed = false) {
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length - 1; i++) ctx.quadraticCurveTo(...points[i], (points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2);
    ctx.lineTo(...points.at(-1));
    if (closed) ctx.closePath();
}
/** The same marks in the draft, on the table and after loading: the flame's own colour, hottest where it leaves the
 *  nozzle (the top of the drawing), licked upward in pencil, and the player's outline over it. */
export function paintFlame(ctx, points, { color = 'orange', width = 4.5 } = {}) {
    if (points.length < 2) return;
    const pencil = FLAME_PENCILS.find(p => p.id === flameColor(color));
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), cx = (x0 + x1) / 2;
    ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
    if (points.length > 2) {
        ctx.save(); path(ctx, points, true); ctx.clip();
        const g = ctx.createRadialGradient(cx, y0 + h * 0.12, 0, cx, y0 + h * 0.3, Math.max(w, h) * 0.85);
        g.addColorStop(0, pencil.core); g.addColorStop(0.42, pencil.color); g.addColorStop(1, pencil.ink);
        ctx.fillStyle = g; ctx.globalAlpha = 0.8; ctx.fillRect(x0, y0, w, h);
        // licks of the flame: wavy pencil strokes running along it
        ctx.strokeStyle = pencil.ink; ctx.lineWidth = Math.max(0.8, width * 0.24);
        for (let x = x0 - 4; x < x1 + 4; x += Math.max(4, width * 1.4)) {
            ctx.globalAlpha = 0.1 + 0.05 * Math.sin(x * 0.41);
            ctx.beginPath(); ctx.moveTo(x, y0 - 2);
            for (let y = y0; y <= y1 + 4; y += 8) ctx.lineTo(x + Math.sin(y * 0.09 + x * 0.3) * 3, y);
            ctx.stroke();
        }
        // the hot core, white-yellow, near the nozzle
        ctx.globalAlpha = 0.55; ctx.fillStyle = pencil.core;
        ctx.beginPath(); ctx.ellipse(cx, y0 + h * 0.18, w * 0.2, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    ctx.strokeStyle = pencil.ink;
    for (let pass = 0; pass < 3; pass++) {
        ctx.globalAlpha = pass ? 0.17 : 0.86; ctx.lineWidth = width * (pass ? 0.55 : 0.8);
        const shifted = pass ? points.map(([x, y], i) => [x + Math.sin(i * 1.73 + pass) * width * 0.16, y + Math.cos(i * 2.17 + pass) * width * 0.13]) : points;
        path(ctx, shifted); ctx.stroke();
    }
    ctx.restore();
}
/** The flame as a texture: { texture, box, pts, color } in the units the points were given in, or null. */
export function createUserFlame(PIXI, points, color = 'orange') {
    const pts = flamePoints(points);
    if (pts.length < 2 || typeof document === 'undefined') return null;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 12;
    const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
    const w = Math.max(24, Math.ceil(Math.max(...xs) - x + pad)), h = Math.max(24, Math.ceil(Math.max(...ys) - y + pad));
    const canvas = document.createElement('canvas');
    const resolution = Math.min(2, 1280 / Math.max(w, h)); // old or corrupt saves cannot ask for huge textures
    canvas.width = Math.ceil(w * resolution); canvas.height = Math.ceil(h * resolution);
    const ctx = canvas.getContext('2d'); ctx.scale(resolution, resolution);
    paintFlame(ctx, pts.map(p => [p[0] - x, p[1] - y]), { color });
    return { texture: PIXI.Texture.from(canvas), box: { x, y, w, h }, pts, color: flameColor(color) };
}

// ---------------------------------------------------------------------------------------------------------------
// The page's drawings (page units: 1000 × 667)
// ---------------------------------------------------------------------------------------------------------------
// Alva's ten stars from the last page: [x, y, seed, crooked]; the fifth is the one she finds crooked and rubs out
const STARS = [[128, 112, 1, 1], [262, 70, 2, 1.1], [372, 168, 3, 0.9], [478, 92, 4, 1.2], [566, 222, 5, 2.3],
    [652, 118, 6, 1], [302, 292, 7, 1.1], [928, 146, 8, 0.9], [446, 338, 9, 1.2], [640, 408, 10, 1]];
const CROOKED = 4;
// and the order the other nine go out in
const GOING = [3, 7, 0, 8, 5, 1, 9, 2, 6];
// the stars that are not Alva's: small neat crosses, the "straight" ones that stay
const PLAIN = [[60, 60], [200, 196], [330, 40], [520, 150], [590, 56], [720, 52], [860, 60], [968, 250], [412, 248],
    [96, 290], [520, 300], [700, 210], [880, 360], [236, 380], [960, 420], [560, 470], [380, 420], [120, 430]];
// the constellation Sköldhästen, in gold (the epilogue's sky): a horse's head and legs in front, a shell behind
const CONSTELLATION = [[300, 150], [338, 112], [372, 128], [392, 176], [446, 168], [508, 150], [560, 178], [548, 236], [470, 244], [396, 238]];
const MOON = { x: 790, y: 300, r: 72 };
const HILL = { x: 210, y: 516 }; // Utsiktskullen's top, where the rocket stands
const SKY_FLOOR = 540;

export function createTable({ PIXI, app, assets, ui, audio, G, heroFactory }) {
    const TABLE = SV.TABLE || {}, WORDS = SV.WORDS || {};
    const T = (name) => assets?.tex?.(name) || null;
    const pen = pencilStyle(T);
    const RAW = PIXI;
    PIXI = pencilPixi(PIXI, T);
    const root = new RAW.Container(); root.label = 'a3-table'; root.visible = false;
    app.stage.addChild(root);
    const desk = new RAW.TilingSprite({ texture: T('desk-wood') || RAW.Texture.WHITE, width: 100, height: 100 });
    if (!T('desk-wood')) desk.tint = 0x9a7550;
    const pencils = new RAW.Sprite(T('pencils-lying') || RAW.Texture.EMPTY); pencils.anchor.set(0.5);
    const deskShade = new RAW.Graphics(); // a lamp's evening dusk over the desk (the page itself is night)
    const page = new PIXI.Container(); page.label = 'page';
    const windowBox = new PIXI.Container(); windowBox.label = 'window'; windowBox.visible = false;
    const veil = new RAW.Graphics(); // fades between the table and the world
    root.addChild(desk, deskShade, pencils, windowBox, page, veil);
    let tweens = [], veilAlpha = 0, shown = false, layoutDirty = true, fadingToWorld = false;
    let t = 0;
    let pageScale = 1, pageX = 0, pageY = 0, mode = 'prologue';
    const zoom = { s: 1, ox: 0, oy: 0 };
    // On a phone held upright the page is shown larger than the screen is wide, and it slides to whatever is being
    // drawn or talked about (Nova on the right, the rocket on the left); elsewhere the whole page shows.
    const focus = { x: PAGE_W / 2, to: PAGE_W / 2, crop: false };
    const look = (x) => { focus.to = x; };

    // --- a tween clock of its own (the world is not stepping while the table shows) ------------------------------
    function tween(sec, fn) {
        const dur = G?.lessMotion ? Math.min(sec, 0.35) : sec;
        return new Promise(resolve => tweens.push({ t: 0, dur: Math.max(0.001, dur), fn, resolve }));
    }
    const wait = (sec) => new Promise(resolve => tweens.push({ t: 0, dur: Math.max(0.001, sec), fn: () => {}, resolve }));

    /** Lines from the words: a caption (a plain string or ['caption', text]) is read by the narrator, speech is said. */
    async function speak(...lines) {
        let batch = [];
        const flush = async () => { if (batch.length) { const b = batch; batch = []; await ui.say(b); } };
        for (const l of lines) {
            if (!l) continue;
            const caption = typeof l === 'string' ? l : l[0] === 'caption' ? l[1] : null;
            if (caption) { await flush(); await Promise.all([ui.caption(caption, 3000), wait(1.1)]); }
            else if (Array.isArray(l) && l[1]) batch.push(l);
        }
        await flush();
    }
    const line = (key) => TABLE[key] || null;
    /** A caption from the words (resolves at once when the words do not have it). */
    const cap = (key, ms = 3000) => { const c = line(key); const text = typeof c === 'string' ? c : c?.[1]; return text ? ui.caption(text, ms) : Promise.resolve(); };

    function layout() {
        const W = app.screen.width, H = app.screen.height;
        desk.width = W; desk.height = H;
        deskShade.clear().rect(0, 0, W, H).fill({ color: 0x1d1a2c, alpha: 0.32 });
        const portrait = H > W * 1.15;
        // the epilogue's window stands beside the page on a wide screen (under it on a phone held upright)
        const winW = mode === 'epilogue' && !portrait ? Math.min(W * 0.24, 320) : 0;
        let pw = Math.min(W * 0.94, (H * (portrait ? 0.5 : 0.78)) * (PAGE_W / PAGE_H));
        if (winW) pw = Math.min(pw, W - winW - 70);
        // upright: as tall as 42 % of the screen if that is larger (at most one and a half screens wide)
        if (portrait) pw = Math.max(pw, Math.min(H * 0.46 * PAGE_W / PAGE_H, W * 1.6));
        focus.crop = pw > W * 0.95;
        pageScale = pw / PAGE_W;
        const ph = pw * PAGE_H / PAGE_W;
        // portrait: the page in the middle, between the caption at the top and the speech box at the bottom
        pageX = winW ? Math.max(16, (W - pw - winW - 30) / 2) : (W - pw) / 2;
        if (focus.crop) pageX = cropX(W, pw);
        pageY = portrait ? Math.max(H * 0.1, (H - 160 - ph) / 2 + 40) : Math.max(10, (H * 0.78 - ph) / 2);
        page.position.set(pageX + zoom.ox, pageY + zoom.oy); page.scale.set(pageScale * zoom.s);
        pencils.scale.set(Math.min(1, W / 1400) * 0.7);
        pencils.position.set(W * 0.12, H - 60);
        pencils.visible = !portrait;
        layoutWindow(W, H, portrait, pw, ph, winW);
        placeEraser();
        layoutDirty = false;
    }
    function cropX(W, pw) { return clamp(W / 2 - focus.x * pageScale, W - pw - 6, 6); }
    /** Where the eraser lies on the desk, in page units: beside the page where there is room, else under it, else on
     *  the page's own lower corner. */
    function deskSpot() {
        const W = app.screen.width, H = app.screen.height, pw = PAGE_W * pageScale, ph = PAGE_H * pageScale;
        const right = W - (pageX + pw), below = H - (pageY + ph);
        let sx, sy;
        // beside the page on a wide screen; under it, on the left, on a phone held upright (the window is on the right)
        if (right > 110) { sx = pageX + pw + right * 0.5; sy = pageY + ph * 0.82; }
        else if (below > 200) { sx = W * 0.34; sy = pageY + ph + 40; }
        else { sx = Math.min(W - 60, pageX + pw * 0.9); sy = pageY + ph * 0.93; }
        return { x: (sx - pageX) / pageScale, y: (sy - pageY) / pageScale };
    }

    // --- the page and its drawings ----------------------------------------------------------------------------
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
            m.position.copyFrom(node.position); m.scale.copyFrom(node.scale); m.rotation = node.rotation;
        };
        set(0);
        return { set, done() { node.mask = null; m.destroy(); }, bounds: b };
    }

    // -- the characters (characters.mjs), each with a plain stand-in should one be missing
    /** A soft round glow without rings, painted once. */
    let glowTex = null;
    function glowTexture() {
        if (glowTex || typeof document === 'undefined') return glowTex || RAW.Texture.WHITE;
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const c = cv.getContext('2d'), gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
        glowTex = RAW.Texture.from(cv);
        return glowTex;
    }
    function make(name, ...args) {
        try { if (typeof C3[name] === 'function') return C3[name](PIXI, pen, ...args); }
        catch (err) { console.warn('Sköldhästen: ' + name, err); }
        return null;
    }
    function standIn(draw) {
        const view = new PIXI.Container(); const g = new PIXI.Graphics(); draw(g); view.addChild(g);
        return { view, update() {}, setFlame() {}, destroy() { view.destroy({ children: true }); } };
    }
    const fallback = {
        nova: () => standIn(g => {
            for (let i = 0; i < 7; i++) g.moveTo(-26 + i * 9, -150).lineTo(-60 + i * 20, -12).stroke(pen.line(0x6b6fd0, 7, 0.5));
            g.ellipse(0, -160, 80, 14).fill(pen.fill(0x4a2a6e)).stroke(pen.line(0x2f1c48, 2));
            g.moveTo(-70, -165).quadraticCurveTo(0, -300, 70, -165).closePath().fill(pen.fill(0xb46ad2)).stroke(pen.line(0x4a2a6e, 2.4));
            for (let i = 0; i < 5; i++) g.circle(-40 + i * 20, -150, 5).fill(pen.fill(0xd23a96));
        }),
        rocket: () => standIn(g => {
            const k = 6.2;
            g.poly([-11, 4, -21, 21, -20, 25, -10, 19].map(v => v * k)).fill(pen.fill(0xd65a4f)).stroke(pen.line(0x3e3550, 2));
            g.poly([11, 4, 25, 18, 24, 25, 10, 19].map(v => v * k)).fill(pen.fill(0xd65a4f)).stroke(pen.line(0x3e3550, 2));
            g.moveTo(0, -34 * k).bezierCurveTo(9 * k, -27 * k, 13 * k, -14 * k, 12.5 * k, 2 * k).lineTo(11 * k, 19 * k).lineTo(-11 * k, 19 * k).lineTo(-12.5 * k, 2 * k)
                .bezierCurveTo(-13 * k, -14 * k, -9 * k, -27 * k, 0, -34 * k).fill(pen.fill(0xf5f0e4)).stroke(pen.line(0x3e3550, 2.4));
            g.circle(0, -5 * k, 5.8 * k).fill(pen.fill(0x8ecbe8)).stroke(pen.line(0x3e3550, 2));
            g.position.set(0, -25 * k);
        }),
        suddet: () => standIn(g => {
            g.roundRect(-32, -36, 64, 34, 9).fill(pen.fill(0xf3a2b4)).stroke(pen.line(0x8a4a5a, 2));
            g.roundRect(18, -36, 14, 34, 6).fill(pen.fill(0x9a8a92, 0.8));
        }),
        moon: () => standIn(g => { g.circle(0, 0, 100).fill(pen.fill(0xf6e7a8)).stroke(pen.line(0xb79a4a, 3)); g.circle(-30, -20, 18).fill(pen.hatch(0xd8c37a, 0.9)); g.circle(26, 26, 24).fill(pen.hatch(0xd8c37a, 0.8)); }),
        star: (crooked = 1, seed = 0) => standIn(g => {
            const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + (hash(i, seed) - 0.5) * 0.25 * crooked, r = (i % 2 ? 6 : 15) * (0.85 + hash(i, seed + 3) * 0.3 * crooked); pts.push(Math.cos(a) * r, Math.sin(a) * r); }
            g.poly(pts).fill(pen.fill(0xf6eec8, 0.9)).stroke(pen.line(0x8a7a4a, 1.6));
        }),
        plain: () => standIn(g => { g.moveTo(-6, 0).lineTo(6, 0).moveTo(0, -6).lineTo(0, 6).stroke(pen.line(0xf2f0ff, 1.6, 0.9)); })
    };
    const nova = () => make('createNova') || fallback.nova();
    const rocket = (o) => make('createRocket', o) || fallback.rocket();
    const suddet = () => make('createSuddet') || fallback.suddet();
    const skyMoon = () => make('createSkyMoon') || fallback.moon();
    const alvaStar = (o) => make('createAlvaStar', o) || fallback.star(o.crooked, o.seed);
    const plainStar = (o) => make('createPlainStar', o) || fallback.plain();
    const crumbs = (o) => make('createCrumbs', o);
    const safe = (c, ...a) => { try { c?.update?.(...a); } catch (err) { if (!c._warned) { c._warned = true; console.warn('Sköldhästen: table', err); } } };

    /** The night sky laid thick in pencil: deep blue, darker toward the top, worked over in strokes that cross in
     *  several directions, and the paper's grain showing through as a few tiny pale specks (design 16: never flat
     *  black, never a smooth gradient). */
    function nightSky(gr, { lighter = 0 } = {}) {
        const top = lighter ? 0x1d2550 : 0x161c40, low = lighter ? 0x34417a : 0x2a3466;
        for (let i = 0; i < 12; i++) {
            const u = i / 11, y0 = PAGE_H * i / 12;
            gr.rect(0, y0, PAGE_W, PAGE_H / 12 + 1).fill({ color: mixc(top, low, u * u) });
        }
        gr.rect(0, 0, PAGE_W, PAGE_H).fill(pen.hatch(0x0b0e28, 0.42));
        const dirs = [[0.62, 0.78], [0.94, -0.34], [0.2, 0.98]];
        for (const [k, [dx, dy]] of dirs.entries()) {
            for (let i = 0; i < 46; i++) {
                const x = hash(i, 11 + k) * PAGE_W, y = hash(i, 21 + k) * PAGE_H, len = 40 + hash(i, 31 + k) * 80;
                gr.moveTo(x, y).lineTo(x + dx * len, y + dy * len);
            }
            gr.stroke({ color: k === 1 ? 0x3a4680 : 0x0a0d24, width: 2.4, alpha: k === 1 ? 0.12 : 0.22, cap: 'round' });
        }
        for (let i = 0; i < 150; i++) gr.circle(hash(i, 41) * PAGE_W, hash(i, 42) * PAGE_H, 0.5 + hash(i, 43) * 0.9).fill({ color: 0xfbf8f1, alpha: 0.06 + hash(i, 44) * 0.1 });
    }
    /** Mira's forest from the last page, seen from above the treetops, and Utsiktskullen rising out of it. */
    function forestBand(gr, { lit = 0 } = {}) {
        const crown = (x, y, r, col) => {
            gr.circle(x, y, r).fill({ color: col });
            gr.circle(x, y, r).fill(pen.hatch(0x0f1d16, 0.45));
            gr.circle(x - r * 0.28, y - r * 0.32, r * 0.42).fill({ color: mixc(col, 0x6f9a6a, 0.35 + lit * 0.25), alpha: 0.6 });
            gr.circle(x, y, r).stroke({ color: MIRA, width: 1.6, alpha: 0.5 });
            if (lit) arcAt(gr, x, y, r - 1.5, Math.PI * 1.15, Math.PI * 1.75).stroke({ color: 0xdfe8ff, width: 2.2, alpha: 0.5 * lit, cap: 'round' });
        };
        // the back row of treetops, beyond the hill
        for (let i = 0; i < 24; i++) {
            const r = 24 + hash(i, 53) * 14, x = 360 + i * 26 + hash(i, 51) * 10;
            if (x > PAGE_W - 8) break;
            crown(x, SKY_FLOOR + 2 + hash(i, 52) * 16, r, i % 3 ? 0x22402e : 0x2a4a35);
        }
        gr.rect(350, SKY_FLOOR + 18, PAGE_W - 350, PAGE_H - SKY_FLOOR).fill({ color: 0x1b3125 });
        gr.rect(350, SKY_FLOOR + 18, PAGE_W - 350, PAGE_H - SKY_FLOOR).fill(pen.hatch(0x0c1610, 0.5));
        // the river, a pale ribbon between the trees
        gr.moveTo(560, PAGE_H).quadraticCurveTo(650, 612, 790, 628).quadraticCurveTo(900, 642, PAGE_W, 610).stroke({ color: 0x5d8eaa, width: 8, alpha: 0.55, cap: 'round' });
        gr.moveTo(560, PAGE_H).quadraticCurveTo(650, 612, 790, 628).quadraticCurveTo(900, 642, PAGE_W, 610).stroke({ color: 0xbcd6e6, width: 2, alpha: 0.35 + lit * 0.3 });
        // the front row
        for (let i = 0; i < 20; i++) {
            const r = 30 + hash(i, 63) * 16, x = 420 + i * 30 + hash(i, 61) * 12;
            if (x > PAGE_W - 6) break;
            if (Math.abs(x - 600) < 46) continue; // the clearing with the nest
            crown(x, 622 + hash(i, 62) * 26, r, i % 2 ? 0x1f3a2a : 0x284631);
        }
        // Utsiktskullen: a round green hill out of the trees, its top flat where the rocket stands
        const hill = [[0, 600], [40, 572], [96, 538], [150, HILL.y + 2], [210, HILL.y], [272, HILL.y + 2], [330, 534], [400, 572], [470, 618], [520, PAGE_H]];
        const outline = () => { gr.moveTo(0, PAGE_H).lineTo(...hill[0]); for (let i = 1; i < hill.length; i++) gr.lineTo(...hill[i]); gr.closePath(); };
        outline(); gr.fill({ color: 0x2e4a38 });
        outline(); gr.fill(pen.hatch(0x14231a, 0.55));
        gr.moveTo(...hill[0]); for (let i = 1; i < hill.length - 1; i++) gr.lineTo(...hill[i]);
        gr.stroke({ color: 0x7fa07a, width: 2.6, alpha: 0.55 + lit * 0.3, cap: 'round', join: 'round' });
        for (let x = 20; x < 460; x += 14) {
            let y = PAGE_H;
            for (let i = 1; i < hill.length; i++) if (x <= hill[i][0]) { const [x0, y0] = hill[i - 1], [x1, y1] = hill[i]; y = y0 + (y1 - y0) * (x - x0) / (x1 - x0); break; }
            gr.moveTo(x, y + 1).lineTo(x + 3 + hash(x, 71) * 3, y - 6 - hash(x, 72) * 5);
        }
        gr.stroke({ color: 0x6c8f66, width: 1.6, alpha: 0.7, cap: 'round' });
        // a few of the forest's own trees on the hill's slopes
        for (const [x, y, r] of [[40, 588, 26], [440, 600, 30], [478, 626, 34]]) crown(x, y - r * 0.6, r, 0x24412f);
    }
    /** Where a star was rubbed out: the pencil taken off in an uneven smear (the eraser went to and fro), the paper
     *  showing pale and greyed through it, and the star's dent left as a faint dashed outline. */
    function rubbedHole(seed) {
        const hole = new PIXI.Graphics();
        const rag = [];
        for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2, r = 1 + 0.18 * Math.sin(a * 3 + seed) + (hash(k, seed * 7) - 0.5) * 0.25; rag.push(Math.cos(a) * 25 * r, Math.sin(a) * 15 * r); }
        hole.poly(rag).fill({ color: 0xb7b4c8, alpha: 0.7 });
        hole.poly(rag).fill(pen.material('mat-paper', 0.32, 0xfbf8f1));
        for (let k = 0; k < 6; k++) { const y = -10 + k * 4, w = 22 - Math.abs(k - 2.5) * 3; hole.moveTo(-w + hash(k, seed) * 4, y).lineTo(w - hash(k, seed + 1) * 4, y + 1); }
        hole.stroke({ color: 0x8e8aa0, width: 1.6, alpha: 0.35, cap: 'round' });
        hole.poly(rag).stroke({ color: 0x6c6880, width: 3, alpha: 0.28 });
        const dent = []; for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5 + 0.1, r = k % 2 ? 5 : 12; dent.push([Math.cos(a) * r, Math.sin(a) * r]); }
        for (let k = 0; k < dent.length - 1; k += 2) hole.moveTo(...dent[k]).lineTo(...dent[k + 1]);
        hole.stroke({ color: 0x7c7890, width: 1.5, alpha: 0.65, cap: 'round' });
        return hole;
    }

    function buildPage() {
        page.removeChildren().forEach(c => c.destroy({ children: true }));
        const epilogue = mode === 'epilogue';
        // the sheet on the desk, its shadow, and everything drawn on it kept inside its edges
        const under = new PIXI.Graphics();
        under.rect(8, 10, PAGE_W, PAGE_H).fill({ color: 0x1a120c, alpha: 0.3 });
        under.rect(-3, -3, PAGE_W + 6, PAGE_H + 6).fill({ color: 0xfbf8f1 });
        page.addChild(under);
        const content = new PIXI.Container(); page.addChild(content);
        const clip = new RAW.Graphics(); clip.rect(0, 0, PAGE_W, PAGE_H).fill(0xffffff); page.addChild(clip); content.mask = clip;
        const sheet = new PIXI.Graphics(); nightSky(sheet, { lighter: epilogue ? 1 : 0 }); content.addChild(sheet);
        const sky = new PIXI.Container(); content.addChild(sky);
        // the straight stars (not Alva's)
        const plain = PLAIN.map(([x, y], i) => { const s = plainStar({ size: 5 + hash(i, 61) * 4 }); s.view.position.set(x, y); sky.addChild(s.view); return s; });
        // Vintergatan (the epilogue): a river of small white points across the whole sky, which Suddet rubbed into it
        const milky = new PIXI.Graphics();
        if (epilogue) {
            for (let k = 0; k < 4; k++) milky.moveTo(-40, 470 + (k - 1.5) * 26).quadraticCurveTo(PAGE_W * 0.5, 230 + (k - 1.5) * 22, PAGE_W + 40, 40 + (k - 1.5) * 26).stroke({ color: 0xe9e6ff, width: 70 - k * 15, alpha: 0.045 });
            for (let i = 0; i < 560; i++) {
                const u = hash(i, 71), along = lerp(-40, PAGE_W + 40, u), mid = (1 - u) * (1 - u) * 470 + 2 * u * (1 - u) * 230 + u * u * 40;
                const spread = (hash(i, 72) - 0.5) * (80 + 50 * Math.sin(u * 5)) * (hash(i, 75) > 0.8 ? 1.6 : 1);
                milky.circle(along, mid + spread, 0.7 + hash(i, 73) * 1.7).fill({ color: hash(i, 76) > 0.85 ? 0xfff1c8 : 0xffffff, alpha: 0.3 + hash(i, 74) * 0.6 });
            }
        }
        sky.addChild(milky);
        // Mira's moon, and Nova painted on it
        const moon = skyMoon(); moon.view.position.set(MOON.x, MOON.y); moon.view.scale.set(MOON.r / 100); sky.addChild(moon.view);
        const novaRig = nova(); const novaBox = new PIXI.Container(); novaBox.addChild(novaRig.view);
        novaBox.position.set(MOON.x - 4, MOON.y - MOON.r + 8); novaBox.scale.set(0.42); sky.addChild(novaBox);
        const wash = new PIXI.Graphics(); sky.addChildAt(wash, sky.getChildIndex(novaBox));
        // Alva's ten stars, and the rubbed-out holes they leave
        const holes = new PIXI.Container(); sky.addChild(holes);
        const stars = STARS.map(([x, y, seed, crooked], i) => {
            const halo = new RAW.Sprite(glowTexture()); halo.anchor.set(0.5); halo.position.set(x, y); halo.scale.set(1.1); halo.tint = 0xfff0c0; halo.alpha = 0.32; sky.addChild(halo);
            const s = alvaStar({ seed, crooked, gold: false, size: 15, glow: false }); s.view.position.set(x, y); s.view.scale.set(1.15); s.view.addChildAt(halo, 0); halo.position.set(0, 0); sky.addChild(s.view);
            const hole = rubbedHole(seed); hole.position.set(x, y); hole.rotation = (hash(seed, 9) - 0.5) * 0.5; hole.alpha = 0; holes.addChild(hole);
            return { s, hole, x, y, i, gone: false };
        });
        // the constellation (the epilogue): the ten lights in gold, joined dot to dot
        const constel = new PIXI.Container(); sky.addChild(constel);
        if (epilogue) {
            const lines = new PIXI.Graphics();
            for (let i = 0; i < CONSTELLATION.length - 1; i++) lines.moveTo(...CONSTELLATION[i]).lineTo(...CONSTELLATION[i + 1]);
            lines.moveTo(...CONSTELLATION.at(-1)).lineTo(...CONSTELLATION[3]);
            // two little hooves under the front, and two under the shell
            lines.moveTo(...CONSTELLATION[3]).lineTo(388, 236).moveTo(...CONSTELLATION[4]).lineTo(452, 236);
            lines.stroke(pen.line(0xf2cd60, 2.6, 0.75));
            constel.addChild(lines);
            for (const [i, [x, y]] of CONSTELLATION.entries()) {
                const halo = new RAW.Sprite(glowTexture()); halo.anchor.set(0.5); halo.scale.set(1.2); halo.tint = 0xffd75a; halo.alpha = 0.45;
                const s = alvaStar({ seed: i + 1, crooked: 1, gold: true, size: 13, glow: false }); s.view.addChildAt(halo, 0); s.view.position.set(x, y); constel.addChild(s.view);
            }
        }
        // the forest and the hill
        const forest = new PIXI.Container(); content.addChild(forest);
        const fg = new PIXI.Graphics(); forestBand(fg, { lit: epilogue ? 1 : 0 }); forest.addChild(fg);
        // the nest's small warm light down in the trees (Tukankrabban and the ten little ones)
        const nest = new PIXI.Graphics();
        for (let k = 5; k >= 1; k--) nest.ellipse(600, 628, 10 + k * 7, 5 + k * 3).fill({ color: 0xffd98a, alpha: 0.08 });
        nest.ellipse(600, 630, 13, 5).fill(pen.fill(0x8a6a45)).stroke(pen.line(0x4a3524, 1.4));
        forest.addChild(nest);
        // the dark that comes down over the forest when the stars go out: soft, thickening toward the page's foot
        const dark = new RAW.Graphics();
        for (let k = 0; k < 10; k++) { const y0 = 470 + k * 20; dark.rect(0, y0, PAGE_W, PAGE_H - y0).fill({ color: 0x05060f, alpha: 0.1 }); }
        dark.alpha = 0;
        const shine = new PIXI.Graphics();
        forest.addChild(shine, dark);
        // Mira's rocket on Utsiktskullen
        const rocketBox = new PIXI.Container(); rocketBox.position.set(HILL.x, HILL.y); rocketBox.scale.set(0.42); content.addChild(rocketBox);
        const rocketRig = rocket({}); rocketBox.addChild(rocketRig.view);
        // the actors (the sköldhäst and Klo, in the epilogue), the eraser, the pencils
        const actors = new RAW.Container(); content.addChild(actors);
        const fx = new PIXI.Container(); content.addChild(fx);
        const eraser = suddet(); const eraserBox = new PIXI.Container(); eraserBox.addChild(eraser.view); eraserBox.scale.set(1.7); page.addChild(eraserBox);
        // the pencils that draw, and Alva's brush
        const alvaPencil = new RAW.Sprite(T('alva-pencil') || RAW.Texture.EMPTY); alvaPencil.anchor.set(0.02, 0.92); alvaPencil.scale.set(0.42); alvaPencil.visible = false;
        const miraPencil = new PIXI.Graphics();
        miraPencil.poly([0, 0, 22, -10, 260, -118, 270, -96, 32, 12]).fill(pen.fill(0xa98ad0)).stroke(pen.line(0x5e4a7d, 2));
        miraPencil.poly([0, 0, 22, -10, 32, 12]).fill(pen.fill(0xf3e3c4)).stroke(pen.line(0x5e4a7d, 1.5));
        miraPencil.poly([0, 0, 8, -4, 10, 5]).fill({ color: 0x3b3530 });
        miraPencil.visible = false;
        const brush = new PIXI.Graphics();
        // a watercolour brush: a round wet tip in Nova's violet, a silver ferrule, a long wooden handle
        brush.poly([28, -12, 300, -150, 312, -128, 42, 8]).fill(pen.fill(0xc9925a)).stroke(pen.line(0x6a4424, 1.6));
        brush.poly([14, -4, 30, -14, 44, 8, 26, 14]).fill(pen.fill(0xc4c6d2)).stroke(pen.line(0x5c5e6c, 1.4));
        brush.moveTo(0, 2).quadraticCurveTo(4, -12, 16, -6).quadraticCurveTo(28, 6, 24, 12).quadraticCurveTo(10, 14, 0, 2).fill(pen.fill(0x9c62c8)).stroke(pen.line(0x4a2a6e, 1.4));
        brush.visible = false;
        page.addChild(alvaPencil, miraPencil, brush);
        D = { sky, plain, milky, moon, novaRig, novaBox, wash, stars, holes, constel, forest, dark, shine, nest, rocketBox, rocketRig, actors, fx,
            eraser, eraserBox, eraserOnDesk: true, eraserState: { facing: -1, pose: 'idle', size: 1, eyes: false, goldStar: false, talking: false },
            alvaPencil, miraPencil, brush, crumbs: [], hero: null, kloRig: null, case: null, rocketState: { flame: 0, fin: 'whole', rubbed: 0, tilt: 0 },
            // as Alva paints her: her resting face, the lids half down, the lamps dim (it is night, and she is not up yet)
            novaState: { facing: -1, mood: 'morning', lights: 0, glow: 0, beam: 0, talking: false, eyes: 'half' } };
        // the eraser lies on the desk (in page units, wherever the desk is)
        D.eraser.view.position.set(0, 0);
        D.eraserBox.position.set(0, 0);
        D.eraserOnDesk = true;
        placeEraser();
    }
    function placeEraser() {
        if (!D) return;
        if (D.case && !D.eraserOnDesk && D.eraserBox.visible) { const s = deskSpot(); D.case.position.set(s.x - 120, s.y + 4); return; }
        if (D.eraserOnDesk) { const s = deskSpot(); D.eraserBox.position.set(s.x, s.y); }
        if (D.case) { const s = deskSpot(); D.case.position.set(s.x - 120, s.y + 4); }
    }

    function pencilAt(which, x, y) {
        D.alvaPencil.visible = which === 'alva'; D.miraPencil.visible = which === 'mira'; D.brush.visible = which === 'brush';
        const p = which === 'alva' ? D.alvaPencil : which === 'mira' ? D.miraPencil : D.brush;
        p.position.set(x, y); p.rotation = 0;
    }
    function hidePencils() { D.alvaPencil.visible = D.miraPencil.visible = D.brush.visible = false; }
    let drawing = 0;
    async function drawIn(node, who, sec) {
        const r = revealer(node);
        const b = r.bounds;
        audio?.sfx?.('pencil', { len: Math.min(1.2, sec) });
        drawing++;
        try {
            await tween(sec, (u) => {
                r.set(u);
                const x = node.x + (b.x + b.width * u) * node.scale.x;
                const y = node.y + (b.y + b.height * (0.35 + 0.3 * Math.sin(u * 18))) * node.scale.y;
                pencilAt(who, x, y);
            });
        } finally { drawing--; }
        r.done(); hidePencils();
    }
    /** Alva paints: the colour spreads in wet blooms under her brush (a watercolour reveal), and leaves a pale
     *  stain at its edges where the water ran. */
    async function paintIn(box, sec) {
        const b = box.getLocalBounds();
        const mask = new RAW.Graphics(); box.parent.addChild(mask); box.mask = mask;
        const blobs = [];
        for (let i = 0; i < 11; i++) {
            const u = i / 10;
            // from the dome down to the beam, then the eyes and claws
            const x = b.x + b.width * (0.2 + 0.6 * hash(i, 81)), y = b.y + b.height * (i < 8 ? 0.15 + 0.85 * u : 0.05 + hash(i, 82) * 0.3);
            blobs.push({ x, y, r: Math.max(b.width, b.height) * (0.24 + hash(i, 83) * 0.14), d: i * 0.07, seed: i });
        }
        const blobPoly = (bl, rr) => { const pts = []; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, w = 1 + 0.22 * Math.sin(a * 3 + bl.seed) + 0.1 * Math.sin(a * 5 + bl.seed * 2); pts.push(bl.x + Math.cos(a) * rr * w, bl.y + Math.sin(a) * rr * w); } return pts; };
        audio?.sfx?.('pencil', { len: 0.9, speed01: 0.15 });
        drawing++;
        try {
            await tween(sec, (u) => {
                mask.clear();
                for (const bl of blobs) {
                    const v = ease((u - bl.d) / 0.42);
                    if (v > 0) mask.poly(blobPoly(bl, bl.r * v)).fill(0xffffff);
                }
                mask.position.copyFrom(box.position); mask.scale.copyFrom(box.scale);
                // the wet stain spreads a little beyond the paint, and dries paler
                D.wash.clear();
                for (const bl of blobs) {
                    const v = ease((u - bl.d) / 0.5);
                    if (v > 0) D.wash.poly(blobPoly({ ...bl, seed: bl.seed + 4 }, bl.r * v * 1.12).map((c, k) => (k % 2 ? box.y + c * box.scale.y : box.x + c * box.scale.x))).fill({ color: 0xb48ad8, alpha: 0.05 });
                }
                const k = Math.min(blobs.length - 1, Math.floor(u * blobs.length)), bl = blobs[k];
                pencilAt('brush', box.x + (bl.x + Math.sin(u * 30) * 8) * box.scale.x, box.y + (bl.y + Math.cos(u * 23) * 6) * box.scale.y);
            });
        } finally { drawing--; }
        box.mask = null; mask.destroy(); hidePencils();
    }

    // Alva and Mira are heard, never seen. While one of them speaks, her own pencil rests on her side of the page
    // (Alva's on the right, Mira's on the left), bobbing as she talks, and the speaking mark sits on it.
    const TALK_REST = { alva: { x: 700, y: 652 }, mira: { x: 70, y: 652 } };
    let talkPencil = null;
    function stepTalkPencil(dt, rm) {
        const who = G.speaker === 'alva' || G.speaker === 'mira' ? G.speaker : null;
        if (drawing) { talkPencil = null; return; }
        if (!who) { if (talkPencil) { hidePencils(); talkPencil = null; } return; }
        const p = who === 'alva' ? D.alvaPencil : D.miraPencil, rest = TALK_REST[who];
        if (talkPencil?.who !== who) {
            talkPencil = { who, x: rest.x + 30, y: rest.y + 90, t: 0 };
            D.alvaPencil.visible = who === 'alva'; D.miraPencil.visible = who === 'mira'; D.brush.visible = false;
        }
        const k = rm ? 1 : 1 - Math.exp(-7 * dt);
        talkPencil.x += (rest.x - talkPencil.x) * k; talkPencil.y += (rest.y - talkPencil.y) * k; talkPencil.t += dt;
        p.position.set(talkPencil.x, talkPencil.y + (rm ? 0 : Math.sin(talkPencil.t * 8) * 5));
        p.rotation = rm ? 0 : Math.sin(talkPencil.t * 5.5) * 0.04;
    }
    function toCss(x, y) { return [pageX + x * pageScale, pageY + y * pageScale]; }

    // --- the window (the epilogue): the real night outside, where one constellation has hooves --------------------
    const WIN = { w: 300, h: 230 };
    const winStars = [], winHorse = new PIXI.Graphics();
    {
        const frame = new PIXI.Graphics();
        frame.rect(-12, -12, WIN.w + 24, WIN.h + 24).fill(pen.fill(0xb48a5c)).stroke(pen.line(0x5b3c22, 2.4));
        frame.rect(0, 0, WIN.w, WIN.h).fill({ color: 0x141a3a });
        frame.rect(0, 0, WIN.w, WIN.h).fill(pen.hatch(0x0b0f26, 0.45));
        for (let i = 0; i < 40; i++) frame.circle(hash(i, 91) * WIN.w, hash(i, 92) * WIN.h * 0.85, 0.7 + hash(i, 93)).fill({ color: 0xffffff, alpha: 0.25 + hash(i, 94) * 0.4 });
        // the town's roofs far off, and a tree
        frame.moveTo(0, WIN.h).lineTo(0, WIN.h - 34).lineTo(40, WIN.h - 50).lineTo(70, WIN.h - 34).lineTo(120, WIN.h - 40).lineTo(150, WIN.h - 60).lineTo(180, WIN.h - 42).lineTo(WIN.w, WIN.h - 46).lineTo(WIN.w, WIN.h).closePath().fill({ color: 0x0a0c18 });
        for (const [x, y] of [[52, WIN.h - 30], [134, WIN.h - 34], [226, WIN.h - 26]]) frame.rect(x, y, 7, 7).fill({ color: 0xffd98a, alpha: 0.8 }); // lit windows far off
        windowBox.addChild(frame);
        for (const [x, y] of [[60, 40], [112, 70], [200, 34], [250, 92], [40, 120], [150, 130]]) {
            const s = new PIXI.Graphics(); s.moveTo(-5, 0).lineTo(5, 0).moveTo(0, -5).lineTo(0, 5).stroke(pen.line(0xfff6d0, 1.6)); s.position.set(x, y); s.alpha = 0; windowBox.addChild(s); winStars.push(s);
        }
        // the constellation with hooves (Sköldhästen, in the real sky)
        const C = CONSTELLATION.map(([x, y]) => [86 + (x - 300) * 0.42, 70 + (y - 112) * 0.42]);
        for (let i = 0; i < C.length - 1; i++) winHorse.moveTo(...C[i]).lineTo(...C[i + 1]);
        winHorse.moveTo(...C.at(-1)).lineTo(...C[3]);
        winHorse.moveTo(...C[3]).lineTo(C[3][0] - 3, C[3][1] + 26).moveTo(...C[4]).lineTo(C[4][0] + 1, C[4][1] + 28);
        winHorse.stroke(pen.line(0xf6dc86, 1.8, 0.75));
        for (const [x, y] of C) winHorse.circle(x, y, 2.6).fill({ color: 0xfff1b0 });
        winHorse.alpha = 0; windowBox.addChild(winHorse);
        // the window's cross bars and curtains
        const bars = new PIXI.Graphics();
        bars.rect(WIN.w / 2 - 5, 0, 10, WIN.h).fill(pen.fill(0xb48a5c)).rect(0, WIN.h / 2 - 5, WIN.w, 10).fill(pen.fill(0xb48a5c));
        bars.moveTo(-14, -14).quadraticCurveTo(30, 60, 8, WIN.h + 14).lineTo(-30, WIN.h + 14).lineTo(-30, -14).closePath().fill(pen.hatch(0xc0675a, 0.95)).stroke(pen.line(0x7a3a30, 1.6));
        bars.moveTo(WIN.w + 14, -14).quadraticCurveTo(WIN.w - 30, 60, WIN.w - 8, WIN.h + 14).lineTo(WIN.w + 30, WIN.h + 14).lineTo(WIN.w + 30, -14).closePath().fill(pen.hatch(0xc0675a, 0.95)).stroke(pen.line(0x7a3a30, 1.6));
        windowBox.addChild(bars);
    }
    function layoutWindow(W, H, portrait, pw, ph, winW) {
        if (portrait) {
            const k = Math.max(0.3, Math.min(W * 0.5 / WIN.w, (H - (pageY + ph) - 170) / WIN.h, 1.2));
            windowBox.scale.set(k);
            windowBox.position.set(W - WIN.w * k - 16, pageY + ph + 22);
        } else {
            const k = Math.max(0.3, Math.min((winW || W * 0.22) / (WIN.w + 40), H * 0.45 / WIN.h));
            windowBox.scale.set(k);
            windowBox.position.set(pageX + pw + 30 + 16 * k, pageY + ph * 0.06 + 14 * k);
        }
    }

    // --- per frame ----------------------------------------------------------------------------------------------
    function tick(dt) {
        if (!shown) return;
        t += dt;
        if (layoutDirty || app.screen.width !== desk.width || app.screen.height !== desk.height) layout();
        if (focus.crop) {
            focus.x = G.lessMotion ? focus.to : lerp(focus.x, focus.to, 1 - Math.exp(-2.2 * dt));
            const nx = cropX(app.screen.width, PAGE_W * pageScale);
            if (Math.abs(nx - pageX) > 0.2) { pageX = nx; placeEraser(); }
        }
        page.position.set(pageX + zoom.ox, pageY + zoom.oy); page.scale.set(pageScale * zoom.s);
        for (const tw of tweens.slice()) {
            tw.t += dt;
            const u = Math.min(1, tw.t / tw.dur);
            tw.fn(u);
            if (u >= 1) { tweens.splice(tweens.indexOf(tw), 1); tw.resolve(); }
        }
        if (D) {
            const rm = !!G.lessMotion;
            stepTalkPencil(dt, rm);
            safe(D.novaRig, dt, D.novaState, t, { reducedMotion: rm });
            safe(D.rocketRig, dt, D.rocketState, t, { reducedMotion: rm });
            safe(D.moon, dt, t, { bites: 0, lit: mode === 'epilogue' ? 1 : D.moonLit ?? 1, drain: 0, reducedMotion: rm });
            safe(D.eraser, dt, D.eraserState, t, { reducedMotion: rm });
            for (const s of D.stars) { safe(s.s, dt, t, {}); if (!rm && !s.gone && s.s.view.alpha > 0.9) s.s.view.rotation = Math.sin(t * 0.8 + s.i) * 0.05; }
            for (const c of D.crumbs) {
                c.vy += 900 * dt; c.view.y = Math.min(c.floor, c.view.y + c.vy * dt); c.view.rotation += c.spin * dt;
                if (c.view.y >= c.floor) c.spin = 0;
            }
            if (D.hero) { const s = D.heroState; s.time = t; D.hero.update(dt, s); D.hero.view.position.set(s.x, s.y); }
            if (D.kloRig) D.kloRig.update(D.kloActor, { time: t, dt, talking: G.speaker === 'klo', reducedMotion: rm });
            // the window's stars twinkle, the constellation's softly
            if (windowBox.visible) for (const [i, s] of winStars.entries()) if (s._on) s.alpha = rm ? 0.9 : 0.6 + 0.4 * Math.sin(t * 2 + i * 1.7);
        }
        veil.clear();
        if (veilAlpha > 0) veil.rect(0, 0, app.screen.width, app.screen.height).fill({ color: 0xfbf8f1, alpha: veilAlpha });
    }

    function show() {
        shown = true; root.visible = true; layoutDirty = true;
        t = 0; zoom.s = 1; zoom.ox = zoom.oy = 0; veilAlpha = 0; fadingToWorld = false;
        focus.x = focus.to = PAGE_W / 2;
        page.visible = true; desk.visible = true; deskShade.visible = true;
        layout(); buildPage(); layout();
        windowBox.visible = mode === 'epilogue';
        // as Äventyr 1's table: speech at the bottom, the caption at the top, so neither covers the other
        ui.root?.classList.add('table-mode');
    }
    function hide() {
        ui.root?.classList.remove('table-mode');
        shown = false; root.visible = false;
        tweens.forEach(tw => tw.resolve()); tweens = [];
        page.removeChildren().forEach(c => c.destroy({ children: true }));
        D = null; talkPencil = null;
    }

    // --- the prologue ---------------------------------------------------------------------------------------------
    async function prologue() {
        mode = 'prologue';
        show();
        audio?.setArea?.('table');
        // the page is already night, with the stars from the last page; Nova, the rocket and the flame come
        D.novaBox.visible = false; D.rocketBox.visible = false;
        await wait(0.6);
        await speak(line('newPage'));
        await speak(line('miraRocket'), line('alvaPaint'));
        // Alva paints the purple crab on the Moon: watercolour, spreading wet
        look(MOON.x - 40); await wait(0.6);
        D.novaBox.visible = true;
        const painted = cap('paintCaption', 3600);
        await paintIn(D.novaBox, 3.0);
        await Promise.all([painted, wait(0.4)]);
        await speak(line('isCrab'), line('kind'), line('morning'));
        // Mira draws the rocket on Utsiktskullen: one fin comes out crooked
        look(HILL.x + 60); await wait(0.6);
        D.rocketBox.visible = true;
        const finTold = cap('finCaption', 3000);
        await drawIn(D.rocketBox, 'mira', 2.6);
        await Promise.all([finTold, wait(0.3)]);
        await speak(line('finCrooked'));
        // the player draws the rocket's flame with Mira's pencils
        const flame = await drawFlame();
        if (flame?.texture) { try { D.rocketRig.setFlame?.(flame.texture); } catch (err) { console.warn(err); } }
        await tween(0.8, u => { D.rocketState.flame = ease(u); });
        audio?.sfx?.('whoosh', { gain: 0.35 });
        // Alva's ten stars from the last page; one of them came out crooked
        look(PAGE_W / 2);
        await speak(line('tenStars'));
        await tween(1.2, u => { D.stars.forEach((s, i) => { const v = clamp(u * 1.6 - i * 0.06, 0, 1); s.s.view.scale.set(1.25 * (1 + 0.25 * Math.sin(v * Math.PI))); }); });
        await speak(line('crooked'));
        await rubOut();
        // then the others go out, one after another, and the forest below grows darker
        await goOut();
        await speak(line('vanish'), line('onlyOne'));
        const darkTold = cap('darker', 3200);
        await tween(2.2, u => { D.dark.alpha = ease(u) * 0.55; D.nest.alpha = 1 - ease(u) * 0.6; });
        await Promise.all([darkTold, wait(0.5)]);
        // into the page, toward the rocket on the hill (the launch picture comes next, out of the same paper white)
        look(HILL.x + 60); await wait(0.5);
        await diveInto(HILL.x, HILL.y - 90);
        return { flame };
    }

    async function drawFlame() {
        const nozzle = { x: HILL.x, y: HILL.y - 4 };
        const ghost = () => {
            const pts = [];
            for (let i = 0; i <= 24; i++) {
                const a = i / 24 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
                // a teardrop under the nozzle, licking down
                const x = nozzle.x + s * 34 * (1 - 0.35 * Math.max(0, c)), y = nozzle.y + 8 + (1 - c) * 60 + Math.sin(a * 3) * 5;
                pts.push(toCss(x, y));
            }
            return pts;
        };
        const geometry = () => {
            const [x0, y0] = toCss(nozzle.x - 90, nozzle.y - 10), [x1, y1] = toCss(nozzle.x + 90, nozzle.y + 150);
            return { ghost: ghost(), bounds: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } };
        };
        let color = 'orange';
        const labels = WORDS.flameColors || FLAME_LABELS;
        const restoreLabel = relabelPalette();
        let pts = null;
        try {
            pts = await ui.draw({ prompt: WORDS.drawFlame || '', ...geometry(), getGeometry: geometry,
                palette: FLAME_PENCILS.map(p => ({ ...p, label: labels[p.id] || FLAME_LABELS[p.id] })), selectedColor: color,
                onColor: v => { color = v; }, paintDraft: paintFlame });
        } finally { restoreLabel(); }
        if (!(pts?.length > 1)) return null;
        // into page units, then into the rocket's own units, so the flame stays the same on any screen
        const local = pts.map(([x, y]) => [(x - pageX) / pageScale, (y - pageY) / pageScale]);
        return createUserFlame(RAW, local, color);
    }
    /** The drawing pad says "Molnfärg" over its pencils (src/content/sv.mjs DRAWING.paletteLabel, written for Äventyr
     *  2's cloud). For the flame it says the flame's colour instead, while the pad is open. */
    function relabelPalette() {
        const label = ui.root?.querySelector?.('.sk-draw-palette-label') || document.querySelector?.('.sk-draw-palette-label');
        if (!label || typeof MutationObserver === 'undefined') return () => {};
        const word = WORDS.flamePalette || 'Eldens färg';
        const fix = () => { const m = /^[^:]+:\s*(.*)$/.exec(label.textContent || ''); if (m && !label.textContent.startsWith(word)) label.textContent = `${word}: ${m[1]}`; };
        const obs = new MutationObserver(fix);
        obs.observe(label, { childList: true, characterData: true, subtree: true });
        fix();
        return () => obs.disconnect();
    }

    /** Alva picks up the eraser from the desk and rubs the crooked star out: back and forth, crumbs falling, a white
     *  hole where it was. Then the eraser goes off the edge of the page with her hand, and is not seen again. */
    async function rubOut() {
        const st = D.stars[CROOKED], from = { x: D.eraserBox.x, y: D.eraserBox.y };
        D.eraserOnDesk = false;
        const rubCaption = cap('rubCaption', 3000);
        D.eraserState.pose = 'hop';
        await tween(0.9, u => {
            const e = ease(u);
            D.eraserBox.position.set(lerp(from.x, st.x + 4, e), lerp(from.y, st.y + 18, e) - Math.sin(u * Math.PI) * 80);
            D.eraserBox.rotation = -0.5 * Math.sin(u * Math.PI);
        });
        D.eraserState.pose = 'rub';
        rubSound(1.6);
        await tween(G.lessMotion ? 0.6 : 1.7, u => {
            D.eraserBox.position.set(st.x + 4 + (G.lessMotion ? 0 : Math.sin(u * Math.PI * 9) * 16), st.y + 18 + (G.lessMotion ? 0 : Math.cos(u * Math.PI * 9) * 3));
            D.eraserBox.rotation = G.lessMotion ? 0 : Math.sin(u * Math.PI * 9) * 0.1;
            st.s.view.alpha = 1 - ease(u * 1.2);
            st.hole.alpha = ease(u * 1.1);
            if (Math.random() < 0.25) dropCrumb(st.x + (Math.random() - 0.5) * 30, st.y + 10);
        });
        st.gone = true; st.s.view.visible = false;
        D.eraserState.pose = 'idle';
        // off to the right, past the edge of the page, in Alva's hand
        const lift = { x: D.eraserBox.x, y: D.eraserBox.y };
        await tween(0.8, u => { const e = ease(u); D.eraserBox.position.set(lerp(lift.x, PAGE_W + 260, e), lerp(lift.y, lift.y - 120, e)); D.eraserBox.rotation = e * 0.6; });
        D.eraserBox.visible = false;
        await Promise.all([rubCaption, wait(0.2)]);
    }
    function dropCrumb(x, y) {
        const c = crumbs({ n: 2 + Math.floor(Math.random() * 3) });
        let view = c?.view;
        if (!view) { view = new PIXI.Graphics(); view.moveTo(-3, 0).quadraticCurveTo(0, -4, 3, 0).quadraticCurveTo(0, 3, -3, 0).fill(pen.fill(0xf3a2b4)); }
        view.position.set(x, y); view.scale.set(c?.view ? 0.6 : 1.4);
        D.fx.addChild(view);
        D.crumbs.push({ view, vy: -60 - Math.random() * 60, spin: (Math.random() - 0.5) * 6, floor: y + 22 + Math.random() * 14 });
    }
    function rubSound(sec) {
        // a dry rubbing; the squeak of 18.2 #29 is the audio's own once it has it ('rub')
        if (audio?.has?.('rub')) audio.sfx('rub', { len: sec });
        else { audio?.sfx?.('pencil', { len: Math.min(1.2, sec), speed01: 0.15 }); audio?.sfx?.('rustle', { gain: 0.4, delay: 0.5 }); }
    }

    async function goOut() {
        const told = cap('goneCaption', 3200);
        for (const [k, i] of GOING.entries()) {
            const s = D.stars[i];
            const sec = G.lessMotion ? 0.3 : Math.max(0.35, 0.9 - k * 0.07);
            audio?.note?.(9 - k, { inst: 'shell', vel: 0.25 });
            await tween(sec, u => { s.s.view.alpha = 1 - ease(u); s.s.view.scale.set(1.25 * (1 - 0.3 * u)); s.hole.alpha = ease(u); D.dark.alpha = Math.max(D.dark.alpha, (k + u) / GOING.length * 0.25); });
            s.gone = true; s.s.view.visible = false;
            await wait(G.lessMotion ? 0.05 : Math.max(0.12, 0.6 - k * 0.07));
        }
        await told;
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

    /** After the dive the veil lifts off the world (or off whatever the next picture has put up). */
    async function reveal() {
        if (!shown) return;
        fadingToWorld = true;
        page.visible = false; desk.visible = false; deskShade.visible = false; pencils.visible = false; windowBox.visible = false;
        await tween(0.8, u => { veilAlpha = 1 - ease(u); });
        hide();
        page.visible = true; desk.visible = true; deskShade.visible = true;
    }

    // --- the epilogue -----------------------------------------------------------------------------------------------
    async function epilogue({ flameTexture = null } = {}) {
        mode = 'epilogue';
        show();
        veilAlpha = 1;
        // the finished sky: no holes, the Moon whole, Nova on it (she has not had breakfast)
        for (const s of D.stars) { s.s.view.visible = false; s.hole.alpha = 0; }
        D.novaState.mood = 'morning'; D.novaState.eyes = 'half'; D.novaState.lights = 0;
        // the old rocket is gone (rubbed out in the white); Mira draws a new one, even more crooked
        D.rocketBox.visible = false; D.rocketState.tilt = -0.12;
        if (flameTexture) { try { D.rocketRig.setFlame?.(flameTexture); } catch { /* the stand-in */ } }
        D.rocketBox.rotation = -0.1; D.rocketBox.position.set(HILL.x - 6, HILL.y + 2);
        // the eraser is back on the desk, with eyes and a gold star, and the pencil case beside it
        D.eraserState.eyes = true; D.eraserState.goldStar = true; D.eraserState.pose = 'happy';
        D.eraserOnDesk = true; D.eraserBox.visible = true;
        D.case = penCase(); page.addChild(D.case); page.addChild(D.eraserBox);
        placeEraser();
        // the sköldhäst and Professor Klo on the hill, home
        if (heroFactory) {
            try {
                const hero = heroFactory(); hero.view.scale.set(0.32); D.actors.addChild(hero.view); D.hero = hero;
                D.heroState = { x: HILL.x + 66, y: HILL.y + 1, facing: -1, gait: 'stand', speed: 0, mode: 'ground', gaitPhase: 0, groundAngle: 0, airT: 0, vx: 0, vy: 0,
                    groundAt: () => HILL.y + 1, submerge: 0, waterY: null, wet: 0, hide: 0, hiddenMode: false, action: null, actionT: 0, time: 0 };
            } catch (err) { console.warn('Sköldhästen: table hero', err); }
        }
        try {
            const klo = createKlo(PIXI, { texture: T }); klo.container.scale.set(0.42); D.actors.addChild(klo.container);
            D.kloRig = klo; D.kloActor = { visible: true, x: HILL.x + 108, y: HILL.y + 13, facing: -1, vx: 0, distance: 0, pose: 'happy' };
        } catch (err) { console.warn('Sköldhästen: table Klo', err); }
        audio?.setArea?.('table');
        await tween(1.0, u => { veilAlpha = 1 - ease(u); });
        veilAlpha = 0;
        await speak(line('evening'));
        await hop();
        await speak(line('eyes'), line('goldStar'));
        await speak(line('newRocket'));
        look(HILL.x + 80); await wait(0.5);
        D.rocketBox.visible = true;
        await drawIn(D.rocketBox, 'mira', 2.2);
        D.rocketState.flame = 0.7;
        look(PAGE_W / 2);
        await speak(line('eleven'), line('elevenAnswer'));
        await speak(line('sleep'), line('sleepYes'));
        await intoCase();
        await speak(line('whyGrumpy'), line('breakfast'));
        // outside the window the stars come on, and one of the constellations has hooves
        const winTold = cap('window', 3600);
        await tween(2.4, u => {
            winStars.forEach((s, i) => { const v = clamp(u * 2 - i * 0.18, 0, 1); s.alpha = v; s._on = v >= 1; });
            winHorse.alpha = ease((u - 0.45) / 0.55);
        });
        audio?.sfx?.('sparkle');
        await Promise.all([winTold, wait(0.6)]);
        await Promise.all([cap('end', 3600), wait(2.4)]);
        await tween(0.9, u => { veilAlpha = ease(u); });
        fadingToWorld = true;
        page.visible = false; desk.visible = false; deskShade.visible = false; windowBox.visible = false; pencils.visible = false;
        await tween(0.8, u => { veilAlpha = 1 - ease(u); });
        hide();
        page.visible = true; desk.visible = true; deskShade.visible = true;
    }
    function penCase() {
        // a soft pencil case on the desk, its zip open
        const c = new PIXI.Container();
        const g = new PIXI.Graphics();
        g.moveTo(-70, 0).quadraticCurveTo(-76, -40, -50, -46).lineTo(56, -46).quadraticCurveTo(80, -40, 72, 0).quadraticCurveTo(0, 12, -70, 0).closePath()
            .fill(pen.fill(0x4f7aa8)).stroke(pen.line(0x22344d, 2.2));
        g.moveTo(-60, -40).lineTo(64, -40).stroke(pen.line(0xd8d2c0, 3, 0.9));
        for (let x = -56; x < 62; x += 9) g.moveTo(x, -43).lineTo(x + 4, -37).stroke(pen.line(0x8a8578, 1.4, 0.8));
        g.ellipse(0, -40, 46, 9).fill(pen.fill(0x1d2a3c));
        g.moveTo(66, -40).lineTo(84, -30).stroke(pen.line(0xb9b4a6, 2.4));
        c.addChild(g);
        return c;
    }
    async function hop() {
        const y0 = D.eraserBox.y;
        D.eraserState.pose = 'hop';
        await tween(0.5, u => { D.eraserBox.y = y0 - Math.sin(u * Math.PI) * 26; });
        D.eraserBox.y = y0; D.eraserState.pose = 'happy';
    }
    async function intoCase() {
        if (!D.case) return;
        const from = { x: D.eraserBox.x, y: D.eraserBox.y }, to = { x: D.case.x, y: D.case.y - 30 };
        D.eraserState.pose = 'hop'; D.eraserOnDesk = false;
        await tween(0.9, u => {
            const e = ease(u);
            D.eraserBox.position.set(lerp(from.x, to.x, e), lerp(from.y, to.y, e) - Math.sin(u * Math.PI) * 70);
            D.eraserBox.scale.set(1.7 * (1 - 0.25 * Math.max(0, u - 0.8) / 0.2));
        });
        // down into the case: it sinks behind the open zip
        await tween(0.5, u => { D.eraserBox.y = to.y + u * 26; D.eraserBox.alpha = 1 - ease(u); });
        D.eraserBox.visible = false; D.eraserBox.alpha = 1;
        D.eraserState.pose = 'idle';
    }

    return {
        prologue, epilogue, reveal, tick,
        get opaque() { return shown && !fadingToWorld; },
        get shown() { return shown; },
        speakerBounds(who) {
            if (!D) return null;
            if (who === 'klo' && D.kloRig) return D.kloRig.headBounds();
            if (who === 'horse' && D.hero && D.hero.view.alpha > 0.5) return D.hero.headBounds();
            if (who === 'alva' && D.alvaPencil.visible) return D.alvaPencil.getBounds();
            if (who === 'alva' && D.brush.visible) return D.brush.getBounds();
            if (who === 'mira' && D.miraPencil.visible) return D.miraPencil.getBounds();
            return null;
        },
        destroy() { hide(); root.destroy({ children: true }); }
    };
}
