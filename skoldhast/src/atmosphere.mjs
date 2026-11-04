/*
 * Atmosphere: the light and air over a drawn page, for both adventures.
 *
 *   const atmo = createAir(PIXI, app, { back, front });
 *   atmo.setMood(MOODS.day, { instant: true });      // per scene, or blended over ~1.5 s
 *   atmo.update(dt, { camX, camY, zoom, W, H, t, lessMotion, light, hazeY }); // light {x, y} and hazeY in screen px, optional
 *   atmo.flash(0.8);                                  // a lightning flash lights the haze
 *   atmo.destroy();
 *
 * `back` sits between the far layers and the world (horizon haze, distant light shafts), `front` above
 * the world (the light's bloom, near shafts, floating motes, vignette, colour grade). Everything is a
 * sprite on a texture painted once on a canvas, so a frame costs a few dozen sprites; the light shafts
 * are hatched like coloured pencil so they belong to the page. Nothing here reads the game state.
 */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => {
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
};
const hash = (x, s = 0) => { const v = Math.sin(x * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

/** Moods: what the air is like. Missing parts are off. Screen positions are fractions of the screen. */
export const MOODS = {
    off: {},
    // Äventyr 1: a bright summer day on the page
    day: {
        light: { x: 0.82, y: 0.06, color: 0xfff1c4, alpha: 0.45, size: 1.0 },
        rays: { color: 0xfff4d2, alpha: 0.1, count: 6, angle: 0.42, length: 1.25 },
        shade: { color: 0x8a7a64, alpha: 0.14, n: 3 },
        haze: { color: 0xf2f0e6, alpha: 0.42, y: 0.6, h: 0.3 },
        motes: { kind: 'pollen', n: 26, color: 0xfff6d8, alpha: 0.75 },
        vignette: { color: 0x5a4632, alpha: 0.22 },
        grade: { color: 0xfff3dc, alpha: 0.08, blend: 'multiply' }
    },
    evening: {
        light: { x: 0.18, y: 0.32, color: 0xffc98a, alpha: 0.6, size: 1.15 },
        rays: { color: 0xffd9a4, alpha: 0.13, count: 6, angle: -0.95, length: 1.4 },
        shade: { color: 0x8a5a4a, alpha: 0.1, n: 3 },
        haze: { color: 0xf6d6b8, alpha: 0.5, y: 0.6, h: 0.32 },
        motes: { kind: 'pollen', n: 22, color: 0xffe2b0, alpha: 0.7 },
        vignette: { color: 0x4a2e2a, alpha: 0.3 },
        grade: { color: 0xffd9b8, alpha: 0.16, blend: 'multiply' }
    },
    underwater: {
        light: { x: 0.5, y: -0.1, color: 0xd6f2ff, alpha: 0.45, size: 1.3 },
        rays: { color: 0xe2f6ff, alpha: 0.16, count: 7, angle: 0.18, length: 1.3, sway: 1 },
        motes: { kind: 'bubble', n: 22, color: 0xe8f6ff, alpha: 0.6 },
        vignette: { color: 0x0e3448, alpha: 0.42 },
        grade: { color: 0xb8e2ee, alpha: 0.14, blend: 'multiply' }
    },
    // Äventyr 2: the storm night, the moonlit night, the crystal cave, the mountain top
    storm: {
        light: { x: 0.5, y: -0.2, color: 0x9aa4d8, alpha: 0.25, size: 1.4 },
        haze: { color: 0x8c8cb6, alpha: 0.34, y: 0.62, h: 0.34 },
        motes: { kind: 'firefly', n: 10, color: 0xffd860, alpha: 0.9 },
        vignette: { color: 0x0c0c1a, alpha: 0.5 },
        grade: { color: 0xc6c8ea, alpha: 0.12, blend: 'multiply' }
    },
    moonlit: {
        light: { x: 0.7, y: 0.27, color: 0xfff2c4, alpha: 0.5, size: 1.1 },
        rays: { color: 0xfff4d0, alpha: 0.12, count: 5, angle: -0.35, length: 1.3 },
        haze: { color: 0xb8c4e6, alpha: 0.36, y: 0.62, h: 0.3 },
        motes: { kind: 'firefly', n: 26, color: 0xffd860, alpha: 0.95 },
        vignette: { color: 0x101428, alpha: 0.4 },
        grade: { color: 0xdfe4ff, alpha: 0.06, blend: 'multiply' }
    },
    cave: {
        light: { x: 0.5, y: 0.5, color: 0xb8a6ff, alpha: 0.12, size: 1.2 },
        haze: { color: 0x6c5aa8, alpha: 0.22, y: 0.55, h: 0.4 },
        motes: { kind: 'dust', n: 24, color: 0xcfe6ff, alpha: 0.7 },
        vignette: { color: 0x05040a, alpha: 0.35 },
        grade: { color: 0xd6ccff, alpha: 0.08, blend: 'multiply' }
    },
    peak: {
        light: { x: 0.5, y: -0.25, color: 0xa8b0e0, alpha: 0.22, size: 1.4 },
        haze: { color: 0x9a9cc6, alpha: 0.4, y: 0.66, h: 0.36 },
        motes: { kind: 'snow', n: 40, color: 0xf2f4ff, alpha: 0.85 },
        vignette: { color: 0x0c0c1a, alpha: 0.5 },
        grade: { color: 0xc8cbe8, alpha: 0.12, blend: 'multiply' }
    }
};

// Äventyr 1's page already has its own soft lamp vignette, and faint shafts and plankton under water
MOODS.a1Day = { ...MOODS.day, vignette: { ...MOODS.day.vignette, alpha: 0.1 }, haze: { ...MOODS.day.haze, alpha: 0.3 } };
MOODS.a1Evening = { ...MOODS.evening, vignette: { ...MOODS.evening.vignette, alpha: 0.16 } };
MOODS.a1Under = { ...MOODS.underwater, rays: { ...MOODS.underwater.rays, alpha: 0.12 }, motes: { ...MOODS.underwater.motes, n: 14 }, vignette: { ...MOODS.underwater.vignette, alpha: 0.26 } };
MOODS.a1UnderEvening = { ...MOODS.a1Under, light: { ...MOODS.underwater.light, color: 0xffe2c0 }, rays: { ...MOODS.a1Under.rays, color: 0xffe8c8 } };

const PARTS = ['light', 'rays', 'haze', 'motes', 'vignette', 'grade', 'shade'];

function canvasTexture(RAW, w, h, paint) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    paint(cv.getContext('2d'), w, h);
    return RAW.Texture.from(cv);
}

export function createAir(RAW, app, { back, front } = {}) {
    if (typeof document === 'undefined') return { setMood() {}, update() {}, flash() {}, destroy() {}, get mood() { return null; } };
    // --- textures, painted once ------------------------------------------------------------
    const tex = {
        glow: canvasTexture(RAW, 256, 256, (c, w) => {
            const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
            g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
            g.addColorStop(0.5, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = g; c.fillRect(0, 0, w, w);
        }),
        vignette: canvasTexture(RAW, 512, 512, (c, w) => {
            const g = c.createRadialGradient(w / 2, w / 2, w * 0.22, w / 2, w / 2, w * 0.72);
            g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,1)');
            c.fillStyle = g; c.fillRect(0, 0, w, w);
        }),
        haze: canvasTexture(RAW, 8, 256, (c, w, h) => {
            const g = c.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = g; c.fillRect(0, 0, w, h);
        }),
        // a shaft of light, hatched in pencil: soft across, fading along its length
        ray: canvasTexture(RAW, 128, 512, (c, w, h) => {
            const across = c.createLinearGradient(0, 0, w, 0);
            across.addColorStop(0, 'rgba(255,255,255,0)'); across.addColorStop(0.5, 'rgba(255,255,255,0.8)'); across.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = across; c.fillRect(0, 0, w, h);
            c.globalCompositeOperation = 'destination-in';
            const along = c.createLinearGradient(0, 0, 0, h);
            along.addColorStop(0, 'rgba(0,0,0,0.9)'); along.addColorStop(0.35, 'rgba(0,0,0,0.6)'); along.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = along; c.fillRect(0, 0, w, h);
            c.globalCompositeOperation = 'source-over';
            c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineCap = 'round';
            for (let i = 0; i < 140; i++) {
                const x = w * (0.2 + hash(i, 3) * 0.6), y = h * hash(i, 4) * 0.85, len = 18 + hash(i, 5) * 40;
                c.lineWidth = 0.8 + hash(i, 6) * 1.4;
                c.globalAlpha = (1 - y / h) * (0.25 + hash(i, 7) * 0.5) * (1 - Math.abs(x / w - 0.5) * 1.6);
                c.beginPath(); c.moveTo(x, y); c.lineTo(x + len * 0.35, y + len); c.stroke();
            }
            c.globalAlpha = 1;
        }),
        mote: canvasTexture(RAW, 32, 32, (c, w) => {
            const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
            g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = g; c.fillRect(0, 0, w, w);
        }),
        flake: canvasTexture(RAW, 24, 24, (c, w) => {
            c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2; c.lineCap = 'round';
            for (let k = 0; k < 3; k++) {
                const a = k * Math.PI / 3; c.beginPath();
                c.moveTo(w / 2 - Math.cos(a) * 9, w / 2 - Math.sin(a) * 9); c.lineTo(w / 2 + Math.cos(a) * 9, w / 2 + Math.sin(a) * 9); c.stroke();
            }
        }),
        bubble: canvasTexture(RAW, 24, 24, (c, w) => {
            c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.6;
            c.beginPath(); c.arc(w / 2, w / 2, 8, 0, Math.PI * 2); c.stroke();
            c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(w / 2 - 3, w / 2 - 3, 2, 0, Math.PI * 2); c.fill();
        }),
        white: RAW.Texture.WHITE
    };

    // --- the layers ------------------------------------------------------------------------
    const backC = new RAW.Container(); backC.label = 'atmo-back';
    const frontC = new RAW.Container(); frontC.label = 'atmo-front';
    back?.addChild(backC); front?.addChild(frontC);
    const sprite = (t, parent, blend = 'normal') => { const s = new RAW.Sprite(t); s.anchor.set(0.5); s.blendMode = blend; parent.addChild(s); return s; };
    const haze = sprite(tex.haze, backC, 'screen');
    const farRays = new RAW.Container(); backC.addChild(farRays);
    // cloud shadows drifting over the ground
    const shades = [];
    for (let i = 0; i < 4; i++) shades.push({ s: sprite(tex.glow, frontC, 'multiply'), x: hash(i, 31) * 1.6 - 0.3, y: 0.15 + hash(i, 32) * 0.6, k: 0.8 + hash(i, 33) * 0.7 });
    const grade = sprite(tex.white, frontC, 'multiply'); grade.anchor.set(0);
    const rays = new RAW.Container(); frontC.addChild(rays);
    const bloom = sprite(tex.glow, frontC, 'add');
    const bloomCore = sprite(tex.glow, frontC, 'add');
    const motesC = new RAW.Container(); frontC.addChild(motesC);
    const vignette = sprite(tex.vignette, frontC, 'multiply');
    const rayList = [];
    for (let i = 0; i < 9; i++) rayList.push({ s: sprite(tex.ray, i < 3 ? farRays : rays, 'add'), o: hash(i, 11), far: i < 3 });
    for (const r of rayList) r.s.anchor.set(0.5, 0);
    const motes = [];
    for (let i = 0; i < 60; i++) {
        const s = new RAW.Sprite(tex.mote); s.anchor.set(0.5); s.blendMode = 'add'; motesC.addChild(s);
        motes.push({ s, x: hash(i, 21), y: hash(i, 22), z: 0.6 + hash(i, 23) * 0.9, o: hash(i, 24) * 10, v: 0.5 + hash(i, 25) });
    }

    // --- the mood, blended -----------------------------------------------------------------
    let cur = blank(), from = blank(), to = blank(), blend = 1, flashV = 0, lastCam = null, moodRef = null;
    function blank() {
        return {
            light: { x: 0.5, y: 0, color: 0xffffff, alpha: 0, size: 1 }, rays: { color: 0xffffff, alpha: 0, count: 0, angle: 0, length: 1, sway: 0 },
            haze: { color: 0xffffff, alpha: 0, y: 0.6, h: 0.3 }, motes: { kind: 'dust', n: 0, color: 0xffffff, alpha: 0 },
            vignette: { color: 0x000000, alpha: 0 }, grade: { color: 0xffffff, alpha: 0, blend: 'multiply' },
            shade: { color: 0x000000, alpha: 0, n: 0 }
        };
    }
    function full(m) {
        const b = blank();
        for (const k of PARTS) if (m?.[k]) Object.assign(b[k], m[k]);
        return b;
    }
    function snapshot() { return JSON.parse(JSON.stringify(cur)); }
    function setMood(m, { instant = false } = {}) {
        if (m === moodRef && !instant) return;
        moodRef = m;
        to = full(m);
        if (instant) { cur = full(m); from = snapshot(); blend = 1; return; }
        from = snapshot(); blend = 0;
    }
    function step(dt) {
        if (blend >= 1) return;
        blend = Math.min(1, blend + dt / 1.5);
        const e = blend * blend * (3 - 2 * blend);
        for (const k of PARTS) for (const f of Object.keys(to[k])) {
            const a = from[k][f], b = to[k][f];
            if (typeof b !== 'number') { cur[k][f] = e < 0.5 ? a : b; continue; }
            cur[k][f] = f === 'color' ? mix(a, b, e) : (f === 'count' || f === 'n') ? Math.round(lerp(a, b, e)) : lerp(a, b, e);
        }
        // the kind of mote changes halfway, while they are faint
        if (e >= 0.5) cur.motes.kind = to.motes.kind;
    }

    function update(dt, { camX = 0, camY = 0, zoom = 1, W = app.screen.width, H = app.screen.height, t = 0, lessMotion = false, light = null, hazeY = null } = {}) {
        step(dt);
        const M = cur, rm = !!lessMotion, D = Math.min(W, H), diag = Math.hypot(W, H);
        flashV = Math.max(0, flashV - dt * 2.5);
        // camera motion since last frame, in screen pixels (for the motes' parallax)
        const dcx = lastCam ? (camX - lastCam.x) * zoom : 0, dcy = lastCam ? (camY - lastCam.y) * zoom : 0;
        lastCam = { x: camX, y: camY };
        // haze along the horizon, behind the world
        haze.visible = M.haze.alpha > 0.005 || flashV > 0.01;
        if (haze.visible) {
            haze.position.set(W / 2, hazeY ?? H * M.haze.y); haze.width = W + 8; haze.height = H * M.haze.h;
            haze.tint = M.haze.color; haze.alpha = Math.min(1, M.haze.alpha + flashV * 0.3);
        }
        // the light's bloom
        // the light: where the page's own sun or moon is drawn, else where the mood puts it
        // (a drawn sun out of view still lights the page from that side)
        const lx = light ? clamp(light.x, -0.15 * W, 1.15 * W) : W * M.light.x, ly = light ? clamp(light.y, -0.2 * H, 0.6 * H) : H * M.light.y;
        bloom.visible = bloomCore.visible = M.light.alpha > 0.005;
        if (bloom.visible) {
            const pulse = rm ? 1 : 1 + Math.sin(t * 0.7) * 0.03;
            bloom.position.set(lx, ly); bloom.width = bloom.height = D * 1.6 * M.light.size * pulse; bloom.tint = M.light.color; bloom.alpha = M.light.alpha * 0.42;
            bloomCore.position.set(lx, ly); bloomCore.width = bloomCore.height = D * 0.5 * M.light.size; bloomCore.tint = 0xffffff; bloomCore.alpha = M.light.alpha * 0.25;
        }
        // shafts of light fanning from the light
        rayList.forEach((r, i) => {
            const k = r.far ? i : i - 3, n = Math.max(0, M.rays.count);
            const on = M.rays.alpha > 0.005 && (r.far ? k < Math.min(3, n) : k < Math.max(0, n - 3));
            r.s.visible = on;
            if (!on) return;
            const spread = 0.55, a = M.rays.angle + (k / Math.max(1, (r.far ? 3 : n - 3) - 1) - 0.5) * spread + (r.o - 0.5) * 0.12
                + (M.rays.sway && !rm ? Math.sin(t * 0.35 + r.o * 6) * 0.04 : 0);
            r.s.position.set(lx, ly); r.s.rotation = a;
            r.s.width = D * (0.08 + r.o * 0.12) * (r.far ? 1.6 : 1); r.s.height = diag * M.rays.length * (0.75 + r.o * 0.4);
            r.s.tint = M.rays.color;
            r.s.alpha = M.rays.alpha * (r.far ? 0.7 : 1) * (rm ? 0.8 : 0.65 + 0.35 * Math.sin(t * (0.25 + r.o * 0.3) + r.o * 9));
        });
        // floating motes: pollen in the sun, fireflies at night, dust in caves, snow on the peak, bubbles under water
        const kind = M.motes.kind, n = Math.round(M.motes.n * (rm ? 0.4 : 1));
        const mt = kind === 'snow' ? tex.flake : kind === 'bubble' ? tex.bubble : tex.mote;
        motes.forEach((q, i) => {
            const on = i < n && M.motes.alpha > 0.01;
            q.s.visible = on;
            if (!on) return;
            if (q.s.texture !== mt) q.s.texture = mt;
            q.s.blendMode = kind === 'snow' || kind === 'bubble' ? 'normal' : 'add';
            const sp = rm ? 0.35 : 1;
            let vx = 0, vy = 0, size = 6, alpha = M.motes.alpha;
            if (kind === 'snow') { vx = -0.05 - q.v * 0.05; vy = 0.08 + q.v * 0.06; size = 10 + q.z * 6; }
            else if (kind === 'bubble') { vx = Math.sin(t + q.o) * 0.01; vy = -0.05 - q.v * 0.05; size = 9 + q.z * 6; }
            else if (kind === 'firefly') { vx = Math.sin(t * 0.4 + q.o) * 0.012; vy = Math.cos(t * 0.33 + q.o * 2) * 0.01; size = 7 + q.z * 6; alpha *= Math.max(0, Math.sin(t * (0.8 + q.v * 0.6) + q.o)) ** 2; }
            else if (kind === 'dust') { vx = Math.sin(t * 0.2 + q.o) * 0.004; vy = 0.004 + q.v * 0.004; size = 4 + q.z * 4; alpha *= 0.5 + 0.5 * Math.sin(t * 1.3 + q.o); }
            else { vx = 0.01 + Math.sin(t * 0.3 + q.o) * 0.008; vy = Math.sin(t * 0.5 + q.o * 3) * 0.006 - 0.002; size = 5 + q.z * 5; alpha *= 0.55 + 0.45 * Math.sin(t * 0.9 + q.o); }
            q.x += (vx * sp * dt) - dcx * q.z / W; q.y += (vy * sp * dt) - dcy * q.z / H;
            q.x = ((q.x % 1.1) + 1.1) % 1.1; q.y = ((q.y % 1.1) + 1.1) % 1.1;
            q.s.position.set((q.x - 0.05) * W, (q.y - 0.05) * H);
            q.s.width = q.s.height = size * clamp(D / 700, 0.7, 1.6);
            q.s.tint = M.motes.color; q.s.alpha = alpha;
            if (kind === 'snow') q.s.rotation += dt * (q.v - 0.5) * 2 * sp;
        });
        // cloud shadows: soft, slow, on the lower part of the page
        const groundTop = hazeY ?? H * 0.5;
        shades.forEach((q, i) => {
            const on = i < M.shade.n && M.shade.alpha > 0.005;
            q.s.visible = on;
            if (!on) return;
            q.x += (rm ? 0.002 : 0.008) * dt - dcx / W;
            if (q.x > 1.4) q.x -= 1.8; if (q.x < -0.4) q.x += 1.8;
            q.s.position.set(q.x * W, groundTop + (H - groundTop) * q.y);
            q.s.width = D * 1.4 * q.k; q.s.height = D * 0.45 * q.k;
            q.s.tint = mix(0xffffff, M.shade.color, Math.min(1, M.shade.alpha * 3)); q.s.alpha = 1;
        });
        // colour grade and vignette over everything
        grade.visible = M.grade.alpha > 0.005;
        if (grade.visible) { grade.width = W; grade.height = H; grade.tint = mix(0xffffff, M.grade.color, Math.min(1, M.grade.alpha * 4)); grade.alpha = Math.min(1, M.grade.alpha * 2.5); grade.blendMode = M.grade.blend || 'multiply'; }
        vignette.visible = M.vignette.alpha > 0.005;
        if (vignette.visible) {
            vignette.position.set(W / 2, H / 2); vignette.width = W * 1.12; vignette.height = H * 1.12;
            vignette.tint = mix(0xffffff, M.vignette.color, Math.min(1, M.vignette.alpha * 1.6)); vignette.alpha = 1;
        }
    }

    return {
        setMood, update,
        flash(v = 0.8) { flashV = Math.max(flashV, v); },
        get mood() { return moodRef; },
        layers: { back: backC, front: frontC },
        destroy() {
            if (!backC.destroyed) backC.destroy({ children: true });
            if (!frontC.destroyed) frontC.destroy({ children: true });
            for (const [k, t] of Object.entries(tex)) if (k !== 'white') t.destroy(true);
        }
    };
}
