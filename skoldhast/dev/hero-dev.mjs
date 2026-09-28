/*
 * Dev page for the sköldhäst: the hero on a strip of sand with a gentle slope
 * and a small step, with a button for every state.
 *
 *   window.heroDemo.set('gallop')                 // a scene by name, or
 *   window.heroDemo.set({ scene: 'walk', facing: -1, wet: 1, mini: true, zoom: 1.2 })
 *                                                 // mini: far-away minis too; mainMini: the hero itself as a mini
 *   window.heroDemo.setTime(2.5)                  // re-simulate from 0 at 60 Hz, freeze on t
 *   window.heroDemo.strip({ scene, t0, dt, frames, cols, w, h })   // a filmstrip overlay
 *   window.heroDemo.review(t, scene)              // likeness review framing (1120×840), e.g. review(2, 'hide')
 */
import * as PIXI from '../vendor/pixi-8.21.0.min.mjs';
import { createHero } from '../src/hero.mjs';

const manifest = await (await fetch('../assets/manifest.json', { cache: 'no-store' })).json();
const textures = {};
for (const f of manifest.atlases.hero.files) {
    const sheet = await PIXI.Assets.load(`../assets/${f}`);
    Object.assign(textures, sheet.textures);
}
const rig = await PIXI.Assets.load('../assets/hero-rig.json');

const app = new PIXI.Application();
await app.init({
    resizeTo: window, background: '#fbf8f1', antialias: true, preference: 'webgl',
    resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true, preserveDrawingBuffer: true
});
document.getElementById('stage').appendChild(app.canvas);

// ---------------------------------------------------------------------------
// Terrain: periodic sand with a gentle slope, a plateau, a small step up and a slope down
// ---------------------------------------------------------------------------
const PERIOD = 2600;
function groundAt(x) {
    if (opts.flat) return 0;
    const u = ((x % PERIOD) + PERIOD) % PERIOD;
    if (u < 500) return 0;
    if (u < 1000) { const t = (u - 500) / 500; return -55 * (t * t * (3 - 2 * t)); }
    if (u < 1450) return -55;
    if (u < 1900) return -83; // a 28 wu lip at 1450
    if (u < 2450) { const t = (u - 1900) / 550; return -83 * (1 - t * t * (3 - 2 * t)); }
    return 0;
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------
function canvasTexture(w, h, draw, repeat = false) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = PIXI.Texture.from(c);
    if (repeat) { t.source.style.addressMode = 'repeat'; t.source.style.update?.(); }
    return t;
}
const skyTex = canvasTexture(4, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#dcebf5'); g.addColorStop(0.55, '#b9d7ec'); g.addColorStop(0.56, '#6fa6d4'); g.addColorStop(1, '#3f86c6');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const sandTex = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#ecd29a'; c.fillRect(0, 0, w, h);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
        const x = rnd() * w, y = rnd() * h, l = 6 + rnd() * 12;
        c.strokeStyle = `rgba(${150 + rnd() * 40 | 0},${110 + rnd() * 30 | 0},60,${0.18 + rnd() * 0.2})`;
        c.lineWidth = 1;
        for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
            c.beginPath(); c.moveTo(x + ox, y + oy); c.lineTo(x + ox + l * 0.8, y + oy - l * 0.45); c.stroke();
        }
    }
}, true);

const sky = new PIXI.Sprite(skyTex);
app.stage.addChild(sky);
const world = new PIXI.Container();
app.stage.addChild(world);
const farLayer = new PIXI.Container();
const ground = new PIXI.Graphics();
const heroLayer = new PIXI.Container();
const water = new PIXI.Graphics();
world.addChild(farLayer, ground, heroLayer, water);
const info = document.getElementById('info');

// ---------------------------------------------------------------------------
// Scenes: a small deterministic driver that produces the state snapshot
// ---------------------------------------------------------------------------
const SPEED = { walk: 320, trot: 640, canter: 900, gallop: 1200 };
const ACTIONS = { balk: 1.5, buck: 0.9, neigh: 1.3, shake: 1.0, stamp: 0.7, talk: 2.4, nod: 0.9, lookdown: 1.6, 'rear-small': 1.3 };
const opts = { scene: 'stand', facing: 1, wet: 0, mini: false, mainMini: false, zoom: 0, review: false, flat: false };

function makeDriver() {
    const s = {
        x: 250, y: 0, facing: opts.facing, gait: 'stand', speed: 0, vx: 0, vy: 0, mode: 'ground',
        action: null, actionT: 0, airT: 0, groundAngle: 0, groundAt, submerge: 0, waterY: 0,
        wet: opts.wet, hide: 0, lookAt: null, emote: null, time: 0
    };
    const d = { s, t: 0, speed: 0, leapT: -1, g0: 0, g1: 0, skidT: -1 };
    const sc = opts.scene;
    if (SPEED[sc] || sc === 'leap' || sc === 'skid' || sc === 'wade' || sc === 'run-stop') s.x = opts.facing === 1 ? -200 : 700;
    if (sc === 'swim') { s.x = 0; s.y = -40; }
    d.step = (dt) => stepDriver(d, dt);
    return d;
}

function stepDriver(d, dt) {
    const s = d.s, sc = opts.scene;
    d.t += dt; s.time = d.t;
    s.wet = opts.wet;
    s.action = null; s.actionT = 0; s.mode = 'ground'; s.airT = 0; s.hide = 0; s.submerge = 0; s.vy = 0;
    s.groundAt = groundAt;
    let target = 0, gait = 'stand';
    if (SPEED[sc]) { gait = sc; target = SPEED[sc]; }
    if (sc === 'wade') { gait = 'walk'; target = 200; }
    if (sc === 'run-stop') {
        // accelerate through every gait, gallop, then let go and stop (about 0.6 s), stand, again
        const cyc = 5.2, k = d.t % cyc;
        target = k < 3.1 ? 1200 : 0;
        if (k >= 4.4) target = 0;
        const acc = k < 3.1 ? 400 : 2000; // a slow build-up so every gait shows
        d.speed = target > d.speed ? Math.min(target, d.speed + acc * dt) : Math.max(target, d.speed - acc * dt);
        gait = d.speed < 1 ? 'stand' : d.speed < 480 ? 'walk' : d.speed < 780 ? 'trot' : d.speed < 1020 ? 'canter' : 'gallop';
        target = d.speed;
    }
    if (sc === 'leap') { gait = 'gallop'; target = 1200; }
    if (sc === 'skid') {
        // gallop, skid to a stop while turning, gallop back
        const cyc = 2.4, k = d.t % cyc;
        if (k < 1.9) { gait = 'gallop'; target = 1200; }
        else if (k < 2.25) { gait = 'skid'; target = 0; d.speed = Math.max(0, d.speed - dt * 1200 / 0.35); }
        else { gait = 'stand'; target = 0; if (!d.flipped) { s.facing = -s.facing; d.flipped = true; d.speed = 0; } }
        if (k < 1.9) d.flipped = false;
    }
    // speed: ramp toward the target (the skid sets it directly)
    if (gait !== 'skid') {
        const acc = target > d.speed ? 1300 : 2000;
        d.speed = target > d.speed ? Math.min(target, d.speed + acc * dt) : Math.max(target, d.speed - acc * dt);
    }
    if (d.t < dt * 1.5 && SPEED[sc]) d.speed = target;
    s.gait = d.speed > 1 || gait === 'skid' ? gait : 'stand';
    if (gait === 'skid') s.gait = 'skid';
    s.speed = d.speed;
    s.vx = d.speed * s.facing;
    s.x += s.vx * dt;
    s.y = groundAt(s.x);
    s.groundAngle = Math.atan2(-(groundAt(s.x + 40) - groundAt(s.x - 40)), 80);
    if (sc === 'leap') {
        const cyc = 2.0, k = (d.t + 1.2) % cyc, T = 0.78;
        if (k < T) {
            if (d.leapT < 0) { d.g0 = s.y; }
            d.leapT = k;
            const u = k / T, h = 120;
            const g1 = groundAt(s.x + (T - k) * s.vx);
            s.mode = 'air'; s.airT = u;
            s.y = d.g0 + (g1 - d.g0) * u - 4 * h * u * (1 - u);
            s.vy = (g1 - d.g0) / T - 4 * h * (1 - 2 * u) / T;
        } else d.leapT = -1;
    }
    if (ACTIONS[sc]) {
        const dur = ACTIONS[sc], cyc = dur + 1.3, k = (d.t - 0.4) % cyc;
        if (d.t > 0.4 && k < dur) { s.action = sc; s.actionT = k / dur; }
        if (sc === 'balk') s.lookAt = null;
    }
    if (sc === 'swim') {
        s.mode = 'swim'; s.submerge = 0.75; s.gait = 'stand';
        s.speed = 200; s.vx = 200 * s.facing; s.vy = 80 * Math.sin(d.t * 0.9);
        s.x += s.vx * dt;
        s.y = -120 - (80 / 0.9) * Math.cos(d.t * 0.9);
        s.waterY = -300; // the back breaks the surface at the top of each bob
        s.groundAt = () => null;
    }
    if (sc === 'wade') {
        // walking through the shallows: the kelp fringes sway in the water
        s.submerge = 0.3; s.waterY = -48; s.wet = 1;
    }
    if (sc === 'hide') {
        const cyc = 4.6, k = d.t % cyc;
        const r = (a, b, v) => Math.min(1, Math.max(0, (v - a) / (b - a)));
        s.hide = k < 0.6 ? 0 : k < 0.9 ? r(0.6, 0.9, k) : k < 3.2 ? 1 : k < 3.5 ? 1 - r(3.2, 3.5, k) : 0;
    }
    return s;
}

// ---------------------------------------------------------------------------
// Heroes
// ---------------------------------------------------------------------------
let hero = null, minis = [], driver = null;
function rebuild() {
    if (hero) hero.destroy();
    for (const m of minis) m.hero.destroy();
    minis = [];
    hero = createHero(PIXI, { textures, rig, mini: !!opts.mainMini });
    heroLayer.addChild(hero.view);
    driver = makeDriver();
    if (opts.mini) {
        for (let i = 0; i < 3; i++) {
            const m = createHero(PIXI, { textures, rig, mini: true });
            const sc = 0.25 + i * 0.07;
            m.view.scale.set(sc);
            farLayer.addChild(m.view);
            minis.push({ hero: m, scale: sc, x: -600 + i * 500, gait: ['walk', 'stand', 'trot'][i], speed: [320, 0, 640][i], facing: i === 1 ? -1 : 1 });
        }
    }
}

const mstate = { x: 0, y: 0, facing: 1, gait: 'walk', speed: 0, vx: 0, mode: 'ground', time: 0, groundAt: null };
function stepAll(dt) {
    const s = driver.step(dt);
    hero.update(dt, s);
    hero.view.position.set(s.x, s.y);
    for (const m of minis) {
        m.x += m.speed * m.facing * dt;
        mstate.x = m.x; mstate.y = 0; mstate.facing = m.facing; mstate.gait = m.gait; mstate.speed = m.speed; mstate.vx = m.speed * m.facing;
        mstate.time = s.time; mstate.action = m.gait === 'stand' ? 'lookdown' : null; mstate.actionT = 0;
        mstate.groundAt = null;
        m.hero.update(dt, mstate);
        m.hero.view.position.set(s.x + (m.x - s.x) * 1, -150);
    }
}

function camera() {
    const s = driver.s, W = app.screen.width, H = app.screen.height;
    let zoom = opts.zoom || Math.min(1.6, Math.max(0.6, Math.min(W / 700, H / 480)));
    let cx = s.x + 60 * s.facing, cy = s.y - 110;
    let sx = W / 2, sy = H * 0.52;
    if (opts.review) { zoom = 1 / 0.527; sx = 330; sy = 766; cx = s.x; cy = s.y; }
    if (opts.scene === 'swim') { cy = s.y - 120; }
    world.scale.set(zoom);
    world.position.set(sx - cx * zoom, sy - cy * zoom);
    sky.width = W; sky.height = H;
    sky.visible = !opts.review;
    // sky/sea split follows the ground a little
    drawGround(zoom);
}

function drawGround(zoom) {
    ground.clear(); water.clear();
    if (opts.review) return;
    const W = app.screen.width;
    const x0 = (-world.position.x) / zoom - 50, x1 = (W - world.position.x) / zoom + 50;
    if (opts.scene === 'swim') {
        const s = driver.s;
        water.rect(x0, s.waterY, x1 - x0, 2000).fill({ color: 0x3f86c6, alpha: 0.28 });
        water.moveTo(x0, s.waterY).lineTo(x1, s.waterY).stroke({ color: 0x244f8f, width: 2 / zoom, alpha: 0.8 });
        return;
    }
    if (opts.scene === 'wade') {
        const s = driver.s;
        water.rect(x0, s.waterY, x1 - x0, 400).fill({ color: 0x3f86c6, alpha: 0.25 });
        water.moveTo(x0, s.waterY).lineTo(x1, s.waterY).stroke({ color: 0x244f8f, width: 2 / zoom, alpha: 0.8 });
    }
    const pts = [];
    for (let x = Math.floor(x0 / 10) * 10; x <= x1; x += 10) pts.push(x, groundAt(x));
    pts.push(x1, 3000, x0, 3000);
    ground.poly(pts).fill({ texture: sandTex, textureSpace: 'global', color: 0xffffff });
    const line = [];
    for (let x = Math.floor(x0 / 10) * 10; x <= x1; x += 10) line.push(x, groundAt(x));
    ground.moveTo(line[0], line[1]);
    for (let i = 2; i < line.length; i += 2) ground.lineTo(line[i], line[i + 1]);
    ground.stroke({ color: 0x9a6a3c, width: 1.5 / zoom, alpha: 0.7 });
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const SCENES = ['stand', 'walk', 'trot', 'canter', 'gallop', 'run-stop', 'skid', 'balk', 'buck', 'leap', 'neigh', 'shake', 'stamp', 'talk', 'nod', 'lookdown', 'rear-small', 'swim', 'wade', 'hide'];
const TOGGLES = { wet: 'wet', mini: 'mini', facing: 'facing left' };
const bar = document.getElementById('bar');
const buttons = {};
for (const sc of SCENES) {
    const b = document.createElement('button'); b.textContent = sc;
    b.onclick = () => set({ scene: sc });
    bar.appendChild(b); buttons[sc] = b;
}
bar.appendChild(Object.assign(document.createElement('span'), { className: 'sep' }));
for (const [k, label] of Object.entries(TOGGLES)) {
    const b = document.createElement('button'); b.textContent = label;
    b.onclick = () => set(k === 'facing' ? { facing: -opts.facing } : { [k]: opts[k] ? 0 : 1 });
    bar.appendChild(b); buttons[k] = b;
}
function refreshUI() {
    for (const sc of SCENES) buttons[sc].classList.toggle('on', opts.scene === sc);
    buttons.wet.classList.toggle('on', !!opts.wet);
    buttons.mini.classList.toggle('on', !!opts.mini);
    buttons.facing.classList.toggle('on', opts.facing === -1);
    document.body.classList.toggle('review', !!opts.review);
}

function set(state) {
    if (typeof state === 'string') state = { scene: state };
    Object.assign(opts, state);
    if (state.mini !== undefined) opts.mini = !!state.mini;
    frozen = false;
    document.getElementById('strip').style.display = 'none';
    rebuild();
    refreshUI();
    camera();
    return opts;
}

let frozen = false;
function setTime(t) {
    rebuild();
    const dt = 1 / 60;
    const n = Math.round(t / dt);
    for (let i = 0; i < n; i++) stepAll(i === 0 ? 0 : dt);
    stepAll(dt);
    frozen = true;
    camera();
    app.render();
    return { t: driver.s.time, x: driver.s.x, phase: hero.animator.phase };
}

/** Render frames of the current scene into a grid overlay (for filmstrips). */
function strip({ scene, t0 = 2, dt = 1 / 30, frames = 12, cols = 4, w = 300, h = 250, zoom = 0.9, label = true, facing, flat } = {}) {
    if (scene) opts.scene = scene;
    if (flat !== undefined) opts.flat = flat;
    if (facing) opts.facing = facing;
    opts.zoom = zoom;
    const rows = Math.ceil(frames / cols);
    const cv = document.getElementById('strip');
    const res = app.renderer.resolution;
    cv.width = cols * w; cv.height = rows * h;
    cv.style.width = `${cols * w}px`; cv.style.height = `${rows * h}px`;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fbf8f1'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < frames; i++) {
        setTime(t0 + i * dt);
        const W = app.screen.width, H = app.screen.height;
        // the hero is at (W/2 - 60·facing·zoom, H·0.52 + 110·zoom) in screen space
        const s = driver.s;
        const hx = world.position.x + s.x * world.scale.x, hy = world.position.y + (s.y - 110) * world.scale.y;
        const sx = hx - w / 2, sy = hy - h * 0.55;
        ctx.drawImage(app.canvas, sx * res, sy * res, w * res, h * res, (i % cols) * w, Math.floor(i / cols) * h, w, h);
        if (label) { ctx.fillStyle = '#6b635a'; ctx.font = '12px system-ui'; ctx.fillText(`${(t0 + i * dt).toFixed(3)}s`, (i % cols) * w + 6, Math.floor(i / cols) * h + 14); }
    }
    cv.style.display = 'block';
    return { frames, rows, cols };
}

/** Likeness framing: the reference crop's scale and origin (1120×840 viewport), plain paper behind. */
function review(t = 2.2, scene = 'stand') {
    set({ review: true, scene, zoom: 0, flat: true });
    return setTime(t);
}

window.heroDemo = { set, setTime, strip, review, opts, get hero() { return hero; }, get state() { return driver.s; }, groundAt };

rebuild();
refreshUI();
app.ticker.add((tk) => {
    if (frozen) return;
    const dt = Math.min(0.05, tk.deltaMS / 1000);
    stepAll(dt);
    camera();
    const s = driver.s;
    info.textContent = `${opts.scene}  gait ${s.gait}  speed ${s.speed.toFixed(0)}  x ${s.x.toFixed(0)}  mode ${s.mode}  phase ${hero.animator.phase.toFixed(2)}`;
});
