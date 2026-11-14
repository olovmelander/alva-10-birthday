/*
 * Äventyr 3 – the skies behind the world (screen space), painted once (docs/skoldhast/adventure-3.md, section 16).
 *
 *   const sky = createSky(RAW, PIXI, app, pen, { T });
 *   sky.setKind('moon' | 'space' | 'ring' | 'white' | 'milky');
 *   sky.update(dt, { W, H, cam, t, F, rm, ... });
 *
 * A dark sky is pencil laid thick: deep blue-black hatching in several directions with the paper's grain showing
 * through as tiny pale specks, never flat black and never a gradient. Many small stars are sprites on one painted
 * texture (two depths). Alva's ten stars have a place each in every sky: a ragged white hole with grey smears and
 * the star's dashed dent while it is missing, her own crooked pencil star once it is home, gold once coloured,
 * joined by the constellation's lines once drawn. After the great gallop Vintergatan lies across every sky.
 */
import { createAlvaStar, createSkyMoon, PAL, starPoints, dashedPath } from './characters.mjs';
import { CONSTELLATION } from './content/world.mjs';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (x, s = 0) => { const v = Math.sin(x * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

function paint(RAW, w, h, fn) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    fn(cv.getContext('2d'), w, h);
    return RAW.Texture.from(cv);
}
const rgba = (c, a) => `rgba(${c >> 16 & 255},${c >> 8 & 255},${c & 255},${a})`;

/** The dark sky in pencil: layers of hatching in several directions over a deep blue, the paper's grain between. */
function paintNight(c, w, h, { base = 0x161c38, inks = [0x0b0f22, 0x232c56, 0x2c2552, 0x0f1a36], seed = 1 } = {}) {
    c.fillStyle = rgba(base, 1); c.fillRect(0, 0, w, h);
    c.lineCap = 'round';
    const dirs = [0.62, -0.5, 1.25, 0.15];
    for (let layer = 0; layer < 4; layer++) {
        const a = dirs[layer], ink = inks[layer % inks.length];
        const n = 1500;
        for (let i = 0; i < n; i++) {
            const x = hash(i, seed + layer * 7) * (w + 80) - 40, y = hash(i, seed + layer * 7 + 1) * (h + 80) - 40;
            const len = 18 + hash(i, seed + layer * 7 + 2) * 46;
            c.strokeStyle = rgba(ink, 0.09 + hash(i, seed + layer * 7 + 3) * 0.16);
            c.lineWidth = 0.8 + hash(i, seed + layer * 7 + 4) * 1.6;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
            // tile: repeat strokes that cross the edge
            if (x + Math.cos(a) * len > w) { c.beginPath(); c.moveTo(x - w, y); c.lineTo(x - w + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke(); }
            if (y + Math.sin(a) * len > h) { c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + Math.cos(a) * len, y - h + Math.sin(a) * len); c.stroke(); }
        }
    }
    // the paper's grain showing through: tiny pale specks
    for (let i = 0; i < 900; i++) {
        const x = hash(i, seed + 40) * w, y = hash(i, seed + 41) * h;
        c.fillStyle = `rgba(214,214,236,${0.04 + hash(i, seed + 42) * 0.12})`;
        c.fillRect(x, y, 1 + (hash(i, seed + 43) > 0.85 ? 1 : 0), 1);
    }
}
/** Small neat stars (not Alva's): dots and four-point crosses, on a transparent tile. */
function paintStars(c, w, h, { n = 260, crosses = 34, size = 1, seed = 3 } = {}) {
    for (let i = 0; i < n; i++) {
        const x = hash(i, seed) * w, y = hash(i, seed + 1) * h, r = (0.5 + hash(i, seed + 2) * 1.1) * size;
        const warm = hash(i, seed + 3);
        c.fillStyle = warm > 0.8 ? `rgba(255,236,200,${0.35 + hash(i, seed + 4) * 0.5})` : warm < 0.2 ? `rgba(196,214,255,${0.35 + hash(i, seed + 4) * 0.5})` : `rgba(244,244,255,${0.3 + hash(i, seed + 4) * 0.55})`;
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    c.lineCap = 'round';
    for (let i = 0; i < crosses; i++) {
        const x = hash(i, seed + 10) * w, y = hash(i, seed + 11) * h, s = (2.6 + hash(i, seed + 12) * 4.2) * size;
        const g = c.createRadialGradient(x, y, 0, x, y, s * 2.2);
        g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(x - s * 2.2, y - s * 2.2, s * 4.4, s * 4.4);
        c.strokeStyle = 'rgba(248,248,255,0.9)'; c.lineWidth = Math.max(1, s * 0.22);
        c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke();
    }
}
/** Far nebulas in soft colour, laid in with a pencil's side. */
function paintNebula(c, w, h, { seed = 5, colors = [0x8a5fc8, 0x3fa0b8, 0xd06aa0, 0x5a6ad8] } = {}) {
    for (let k = 0; k < 7; k++) {
        const x = hash(k, seed) * w, y = (0.2 + hash(k, seed + 1) * 0.6) * h, r = (0.18 + hash(k, seed + 2) * 0.25) * w, col = colors[k % colors.length];
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(col, 0.32)); g.addColorStop(0.55, rgba(col, 0.12)); g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
    c.globalCompositeOperation = 'destination-out';
    c.lineCap = 'round';
    // the pencil's side lifts the colour in short strokes that cross each other (all one way, they read as rain)
    const dirs = [[0.8, 0.55], [-0.45, 0.89], [0.97, -0.24]];
    for (let i = 0; i < 2400; i++) {
        const x = hash(i, seed + 20) * w, y = hash(i, seed + 21) * h, len = 8 + hash(i, seed + 22) * 18, [dx, dy] = dirs[i % 3];
        c.strokeStyle = `rgba(0,0,0,${0.06 + hash(i, seed + 23) * 0.14})`; c.lineWidth = 1 + hash(i, seed + 24) * 2.2;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + len * dx, y + len * dy); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
}
/** Vintergatan: a river of small stars with a soft glow along it (painted once; laid across the sky). */
function paintMilky(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(214,220,255,0.10)'); g.addColorStop(0.5, 'rgba(255,246,220,0.2)');
    g.addColorStop(0.65, 'rgba(214,220,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
        const x = hash(i, 61) * w, u = (hash(i, 62) + hash(i, 63) + hash(i, 64)) / 3, y = u * h;
        const a = (1 - Math.abs(u - 0.5) * 2) * (0.35 + hash(i, 65) * 0.65);
        c.fillStyle = `rgba(255,${240 + Math.floor(hash(i, 66) * 15)},${215 + Math.floor(hash(i, 67) * 40)},${a})`;
        c.beginPath(); c.arc(x, y, 0.6 + hash(i, 68) * 1.4, 0, TAU); c.fill();
    }
    c.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
        const x = hash(i, 71) * w, y = (0.3 + hash(i, 72) * 0.4) * h, s = 2 + hash(i, 73) * 4;
        c.strokeStyle = 'rgba(255,250,235,0.9)'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke();
    }
}

export function createSky(RAW, PIXI, app, pen) {
    const root = new RAW.Container(); root.label = 'a3-sky';
    const tex = {
        night: paint(RAW, 512, 512, (c, w, h) => paintNight(c, w, h)),
        far: paint(RAW, 1024, 1024, (c, w, h) => paintStars(c, w, h, { n: 420, crosses: 18, size: 0.8, seed: 3 })),
        near: paint(RAW, 1024, 1024, (c, w, h) => paintStars(c, w, h, { n: 120, crosses: 30, size: 1.3, seed: 9 })),
        nebula: paint(RAW, 1024, 512, (c, w, h) => paintNebula(c, w, h)),
        milky: paint(RAW, 2048, 420, (c, w, h) => paintMilky(c, w, h)),
        glow: paint(RAW, 128, 128, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); })
    };
    const bg = new RAW.TilingSprite({ texture: tex.night, width: 100, height: 100 });
    const nebula = new RAW.Sprite(tex.nebula); nebula.anchor.set(0.5); nebula.alpha = 0.8;
    const far = new RAW.TilingSprite({ texture: tex.far, width: 100, height: 100 });
    const near = new RAW.TilingSprite({ texture: tex.near, width: 100, height: 100 });
    const milky = new RAW.Sprite(tex.milky); milky.anchor.set(0.5); milky.visible = false;
    root.addChild(bg, nebula, far, near, milky);

    // --- the magic forest's page, far below (seen from the Moon and from Utsikten) ------------------------------
    const forest = new PIXI.Container(); forest.label = 'forest-page';
    {
        // Äventyr 2's page as it lies far below: a sheet of paper with its night sky, its hills of round trees, the
        // river, the mountain with its peak and Molnet; a soft light round it (it is a world, not a box)
        const W = 600, H = 300;
        const edge = [];
        const corners = [[-W / 2, -H / 2], [W / 2, -H / 2 - 10], [W / 2 + 8, H / 2], [-W / 2 + 6, H / 2 + 8]];
        for (let c = 0; c < 4; c++) {
            const [ax, ay] = corners[c], [bx, by] = corners[(c + 1) % 4];
            for (let i = 0; i < 14; i++) { const u = i / 14; edge.push(ax + (bx - ax) * u + (hash(c * 14 + i, 310) - 0.5) * 5, ay + (by - ay) * u + (hash(c * 14 + i, 311) - 0.5) * 5); }
        }
        const halo = new RAW.Sprite(tex.glow); halo.anchor.set(0.5); halo.width = W * 1.7; halo.height = H * 2.1; halo.tint = 0xbfd0ff; halo.alpha = 0.35; halo.blendMode = 'add';
        const shadow = new PIXI.Graphics(); shadow.poly(edge.map((v, i) => v + (i % 2 ? 14 : 10))).fill({ color: 0x05060f, alpha: 0.45 });
        const gr = new PIXI.Graphics();
        gr.poly(edge).fill(pen.material('mat-paper', 1, 0xfbf8f1));
        const clip = new PIXI.Graphics(); clip.poly(edge).fill(0xffffff);
        const art = new PIXI.Container(); art.mask = clip;
        const a = new PIXI.Graphics();
        // the page's night sky, and its own small stars
        a.rect(-W / 2 - 10, -H / 2 - 20, W + 30, H + 40).fill({ color: 0x24305e });
        a.rect(-W / 2 - 10, -H / 2 - 20, W + 30, H + 40).fill(pen.hatch(0x161d40, 0.5));
        for (let i = 0; i < 26; i++) { const x = -W / 2 + 20 + hash(i, 320) * (W - 40), y = -H / 2 + 12 + hash(i, 321) * 90, r = 1.6 + hash(i, 322) * 2.4; a.circle(x, y, r).fill({ color: 0xfff6d8, alpha: 0.85 }); }
        // the mountain with its peak, far back
        a.poly([110, 70, 228, -112, 250, -96, 330, 70]).fill(pen.fill(0x6e6a86)).stroke(pen.line(0x3b3546, 2));
        a.poly([206, -78, 228, -112, 250, -96, 238, -76, 224, -86]).fill(pen.fill(0xeef0fa));
        // the hills, rolling, and the round trees on them in three greens
        a.poly([-W / 2 - 10, 10, -180, -24, -60, -6, 60, -30, 180, -2, W / 2 + 20, -20, W / 2 + 20, H / 2 + 20, -W / 2 - 10, H / 2 + 20]).fill(pen.fill(0x3d6a45));
        a.poly([-W / 2 - 10, 60, -120, 34, 20, 52, 160, 36, W / 2 + 20, 56, W / 2 + 20, H / 2 + 20, -W / 2 - 10, H / 2 + 20]).fill(pen.fill(0x4f7c50));
        for (let i = 0; i < 64; i++) {
            const x = -W / 2 + 20 + hash(i, 300) * (W - 40), y = -20 + hash(i, 301) * 150, r = 12 + hash(i, 302) * 16;
            if (Math.abs(y - (64 + Math.sin((x + W / 2) / W * Math.PI) * 26)) < 22) continue;
            a.rect(x - 2, y, 4, r * 0.9).fill({ color: 0x4a3524 });
            a.circle(x, y, r).fill(pen.fill([0x2f5a3e, 0x3d6a45, 0x5a8a54][i % 3], 0.95)).stroke(pen.line(0x1f3a28, 1.4, 0.6));
            a.circle(x - r * 0.3, y - r * 0.35, r * 0.35).fill({ color: 0x9cc48a, alpha: 0.35 });
        }
        // the river, with the moon's light on it, and the nest's sandbank
        a.moveTo(-W / 2 - 10, 62).bezierCurveTo(-80, 22, 60, 112, W / 2 + 20, 70).stroke(pen.line(0x5d8eaa, 18, 0.95));
        a.moveTo(-W / 2 + 30, 58).bezierCurveTo(-70, 26, 60, 104, W / 2 - 20, 66).stroke({ color: 0xcfe6f6, width: 3, alpha: 0.6 });
        a.ellipse(-40, 52, 46, 14).fill(pen.fill(0xd9c08a));
        art.addChild(a);
        const nest = new RAW.Sprite(tex.glow); nest.anchor.set(0.5); nest.position.set(-40, 48); nest.tint = 0xffe6a0; nest.width = nest.height = 110; nest.blendMode = 'add';
        art.addChild(nest);
        const moln = new PIXI.Graphics();
        for (const [x, y, r] of [[-120, -100, 26], [-94, -112, 32], [-66, -100, 24], [-94, -92, 26]]) moln.circle(x, y, r).fill(pen.fill(0xb3aecb)).stroke(pen.line(0x5f587e, 1.6, 0.8));
        moln.circle(-104, -104, 3).fill({ color: 0x3b3546 }); moln.circle(-86, -104, 3).fill({ color: 0x3b3546 });
        art.addChild(moln);
        // the dimming of a page whose sky is missing its stars: a night-blue wash, not black (the paper's edge stays)
        const dim = new PIXI.Graphics();
        dim.poly(edge).fill({ color: 0x0a1030 });
        const rim = new PIXI.Graphics(); rim.poly(edge).stroke(pen.line(0x8d806a, 3)); rim.poly(edge).stroke({ color: 0xfff6dc, width: 1.4, alpha: 0.5 });
        forest.addChild(halo, shadow, gr, clip, art, dim, rim);
        forest._parts = { nest, moln, dim, halo };
    }
    forest.visible = false;
    root.addChild(forest);

    // --- Mira's ring planet (Ringo), on the ring page and seen from far on the others -----------------------------
    const planet = new PIXI.Container(); planet.label = 'ring-planet';
    {
        const R = 500;
        const ringsBack = new PIXI.Graphics(), body = new PIXI.Container(), ringsFront = new PIXI.Graphics();
        const ringBands = [[1.32, 0xd9ecff, 0.65], [1.5, 0xb8d6ee, 0.55], [1.7, 0xe8f4ff, 0.6], [1.86, 0xa9c8e2, 0.45], [2.05, 0xdff0ff, 0.4]];
        const ringPart = (gr, front) => {
            for (const [k, col, a] of ringBands) {
                const rx = R * k, ry = R * k * 0.2;
                const from = front ? 0 : Math.PI, to = front ? Math.PI : TAU;
                gr.moveTo(Math.cos(from) * rx, Math.sin(from) * ry);
                for (let i = 0; i <= 40; i++) { const u = from + (to - from) * i / 40; gr.lineTo(Math.cos(u) * rx, Math.sin(u) * ry); }
                gr.stroke(pen.line(col, R * 0.09, a));
            }
        };
        ringPart(ringsBack, false);
        const disc = new PIXI.Graphics();
        disc.circle(0, 0, R).fill(pen.fill(0xb79be6));
        const stripes = [0xf2a0c4, 0x7fd4d0, 0xf6e08a, 0xb79be6, 0xe6a6d8, 0x8fc9f0, 0xf2a0c4];
        for (let i = 0; i < stripes.length; i++) {
            const y0 = -R + (i + 0.5) * (2 * R / stripes.length), hh = R * 0.17;
            disc.poly([-R, y0 - hh / 2, R, y0 - hh / 2 - 30, R, y0 + hh / 2 - 30, -R, y0 + hh / 2]).fill({ color: stripes[i], alpha: 0.55 });
            disc.poly([-R, y0 - hh / 2, R, y0 - hh / 2 - 30, R, y0 + hh / 2 - 30, -R, y0 + hh / 2]).fill(pen.hatch(stripes[i], 0.35));
        }
        const clip = new PIXI.Graphics(); clip.circle(0, 0, R).fill(0xffffff);
        disc.mask = clip;
        const shade = new PIXI.Graphics();
        shade.circle(R * 0.45, R * 0.15, R * 1.05).fill({ color: 0x0b0d22, alpha: 0.62 });
        shade.mask = clip;
        const line = new PIXI.Graphics(); line.circle(0, 0, R).stroke(pen.line(0x4f3f78, 6, 0.9));
        body.addChild(disc, clip, shade, line);
        ringPart(ringsFront, true);
        planet.addChild(ringsBack, body, ringsFront);
        planet.rotation = -0.32;
    }
    planet.visible = false;
    root.addChild(planet);

    // --- the Moon in the sky (from the constellations, the ring, the end of the ride) ------------------------------
    const moon = createSkyMoon(PIXI, pen);
    moon.view.visible = false;
    root.addChild(moon.view);

    // --- Alva's ten: a place each, in a box of 1000 × 700 local units ---------------------------------------------
    const alva = new PIXI.Container(); alva.label = 'alva-ten';
    const BOX = { w: 1000, h: 700 };
    const lines = new PIXI.Graphics(); alva.addChild(lines);
    const slots = CONSTELLATION.map(([u, v], i) => {
        const c = new PIXI.Container(); c.position.set(u * BOX.w, v * BOX.h);
        // the hole: the white paper where the star was rubbed out, in the star's own crooked shape (a round ragged patch
        // was a crumpled paper ball at a phone's size, hanging in the middle of play), the eraser's grey smears round it,
        // the star's dent inside, and a few pink crumbs under it
        const hole = new PIXI.Graphics();
        const shape = (r, inner, j = 0) => starPoints(r, inner, { seed: 20 + i, crooked: 1 }).flatMap(([x, y], k) => [x + (hash(k, i * 7 + 1) - 0.5) * j, y + (hash(k, i * 7 + 2) - 0.5) * j]);
        hole.poly(shape(62, 0.62, 8)).fill({ color: 0x9a96a8, alpha: 0.12 });
        hole.poly(shape(54, 0.6, 6)).fill({ color: 0xb4b0c2, alpha: 0.16 });
        // the strokes of the rubbing: three short smears across it
        for (let k = 0; k < 3; k++) {
            const y = (k - 1) * 20 + (hash(k, i + 4) - 0.5) * 8, x = (hash(k, i) - 0.5) * 16;
            hole.moveTo(x - 46, y + 9).lineTo(x + 46, y - 9).stroke({ color: 0xc8c4d4, width: 9, alpha: 0.1, cap: 'round' });
        }
        // not a star: flat paper showing through, without glow, and its edge dashed as everything rubbed out is here
        hole.poly(shape(46, 0.52, 5)).fill(pen.material('mat-paper', 0.78, 0xfbf8f1));
        const rim = []; { const q = shape(46, 0.52, 5); for (let k = 0; k < q.length; k += 2) rim.push([q[k], q[k + 1]]); }
        dashedPath(hole, rim, pen.line(0xfbf8f1, 4.5, 0.95), { closed: true, dash: 13, gap: 9 });
        dashedPath(hole, starPoints(24, 0.45, { seed: 20 + i, crooked: 1 }), pen.line(PAL.dent, 2.4, 0.5), { closed: true, dash: 6, gap: 6 });
        for (let k = 0; k < 4; k++) hole.circle((hash(k, i + 9) - 0.5) * 60, 44 + hash(k, i + 11) * 12, 2.4).fill({ color: PAL.crumb, alpha: 0.75 });
        const star = createAlvaStar(PIXI, pen, { seed: 20 + i, size: 30, crooked: 1 });
        const gold = createAlvaStar(PIXI, pen, { seed: 20 + i, size: 30, gold: true, crooked: 1 });
        const num = new PIXI.Container();
        c.addChild(hole, star.view, gold.view, num);
        alva.addChild(c);
        return { c, hole, star, gold, u, v, o: hash(i, 77) * 10 };
    });
    // a few extra stars Suddet rubs in, one a night, after the story (secret suddStar)
    const extra = new PIXI.Container(); alva.addChild(extra);
    root.addChild(alva);
    let linesDrawn = -1;
    function drawLines(k) {
        linesDrawn = k;
        lines.clear();
        if (k <= 0) return;
        // one to ten as it is traced, and then from the chest up to the neck: the body is closed, as on Alva's page in
        // the epilogue (open, it was a zigzag more than a sköldhäst)
        const pairs = slots.slice(1).map((sl, i) => [slots[i], sl]);
        pairs.push([slots.at(-1), slots[1]]);
        for (const [a, b] of pairs) {
            lines.moveTo(a.u * BOX.w, a.v * BOX.h).lineTo(b.u * BOX.w, b.v * BOX.h).stroke({ color: 0xffe9a0, width: 10, alpha: 0.12 * k, cap: 'round' });
            lines.moveTo(a.u * BOX.w, a.v * BOX.h).lineTo(b.u * BOX.w, b.v * BOX.h).stroke(pen.line(0xf3d27a, 3.4, 0.85 * k));
        }
    }
    /** Where Alva's ten sit on this screen: high in the open sky, clear of the speech boxes. */
    function alvaRect(W, H, focus = 0) {
        const portrait = H > W * 1.15;
        const w = portrait ? W * 0.84 : Math.min(W * 0.5, H * 0.9);
        const h = w * BOX.h / BOX.w;
        const x = portrait ? (W - w) / 2 : W * 0.5 - w * 0.62;
        const y = portrait ? H * 0.2 : H * 0.07;
        // in the finished sky and the vista they come to the middle, a little larger
        const k = focus;
        // (a phone on its side: a little smaller and higher, so that the whole figure stands over the Moon's horizon in
        // the finale. Its two lowest stars, the hooves, were behind the ground while "Hovar fram och skal bak!" was said)
        const low = !portrait && H <= 520;
        const w2 = portrait ? W * 0.92 : Math.min(W * 0.62, H * (low ? 0.95 : 1.1)), h2 = w2 * BOX.h / BOX.w;
        return { x: lerp(x, (W - w2) / 2 - (low ? W * 0.03 : 0), k), y: lerp(y, portrait ? H * 0.24 : low ? H * 0.05 : (H - h2) * 0.32, k), w: lerp(w, w2, k), h: lerp(h, h2, k) };
    }

    let kind = 'moon';
    const KIND = {
        moon: { bg: 0xd6dcf4, nebula: 0.25, stars: 1, milkyK: 1 },
        space: { bg: 0xffffff, nebula: 0.95, stars: 1.15, milkyK: 1 },
        ring: { bg: 0xe2d6f6, nebula: 0.55, stars: 0.9, milkyK: 1 },
        white: { bg: 0xffffff, nebula: 0.3, stars: 0.8, milkyK: 0.8 },
        milky: { bg: 0xe8ecff, nebula: 0.7, stars: 1.1, milkyK: 0 }
    };
    return {
        root, moon, forest, planet, alva, slots, tex,
        get kind() { return kind; },
        setKind(k) { kind = k; },
        alvaRect,
        /** The ten places on the screen now (pixels). */
        alvaScreen(W, H, focus, dx = 0) { const r = alvaRect(W, H, focus); return slots.map(s => ({ x: r.x + dx + s.u * r.w, y: r.y + s.v * r.h, r: r.w / BOX.w })); },
        /**
         * s = { W, H, camX, camY, zoom, t, rm, F, dim (0..1: the dark of the bitten moon / the night side), alvaFocus,
         *       found (count found), home, gold, constellation, milky (0..1), extraStars }
         */
        update(dt, s) {
            const { W, H, camX, camY, zoom, t, rm, F } = s;
            const K = KIND[kind] || KIND.space;
            bg.width = W; bg.height = H; bg.tint = K.bg;
            bg.tilePosition.set(-camX * zoom * 0.02, -camY * zoom * 0.02);
            bg.alpha = 1;
            nebula.position.set(W * 0.5 - camX * zoom * 0.015 % (W * 0.5), H * 0.42 - camY * zoom * 0.01);
            nebula.width = Math.max(W, H) * 1.6; nebula.height = nebula.width * 0.5; nebula.alpha = K.nebula * (1 - (s.dim || 0) * 0.6);
            for (const [ts, par, a] of [[far, 0.03, 0.85], [near, 0.07, 1]]) {
                ts.width = W; ts.height = H;
                ts.tilePosition.set(-camX * zoom * par, -camY * zoom * par);
                ts.alpha = a * K.stars * (1 - (s.dim || 0) * 0.7) * (rm ? 1 : 0.9 + 0.1 * Math.sin(t * 0.7 + par * 40));
            }
            // Vintergatan across the sky after the gallop (on the ride itself it is drawn by the trail)
            const mk = (s.milky ?? 0) * K.milkyK;
            milky.visible = mk > 0.01;
            if (milky.visible) {
                milky.position.set(W * 0.5 - camX * zoom * 0.01 % W, H * 0.34 - camY * zoom * 0.01);
                milky.rotation = -0.38; milky.width = Math.hypot(W, H) * 1.25; milky.height = Math.max(150, Math.min(W, H) * 0.42);
                milky.alpha = mk;
            }
            // Alva's ten
            const r = alvaRect(W, H, s.alvaFocus || 0);
            alva.visible = s.showAlva !== false;
            alva.position.set(r.x + (s.alvaDx || 0) - camX * zoom * 0.012 * (1 - (s.alvaFocus || 0)), r.y - camY * zoom * 0.008 * (1 - (s.alvaFocus || 0)));
            alva.scale.set(r.w / BOX.w);
            const home = !!s.home, goldOn = !!s.gold;
            slots.forEach((sl, i) => {
                const lit = s.lit ? s.lit(i) : (home ? 1 : 0);
                sl.hole.visible = lit < 1 && !home;
                sl.hole.alpha = 0.95 * (1 - (s.dim || 0) * 0.3);
                sl.star.view.visible = home && !goldOn;
                sl.gold.view.visible = home && goldOn;
                sl.star.update(dt, t, { k: 1, reducedMotion: rm });
                sl.gold.update(dt, t, { k: 1, reducedMotion: rm });
                if (s.goldUpTo !== undefined) { sl.gold.view.visible = home && i < s.goldUpTo; sl.star.view.visible = home && i >= s.goldUpTo; }
                // a star twinkles; a hole in the paper lies still
                const tw = rm || lit < 1 ? 1 : 0.92 + 0.08 * Math.sin(t * 1.4 + sl.o);
                sl.c.scale.set(tw * (home ? 0.9 : 0.72));
            });
            const k = s.constellation ? 1 : (s.linesK || 0);
            if (Math.abs(k - linesDrawn) > 0.02) drawLines(k);
            // extra small stars Suddet rubs in
            while (extra.children.length < (s.extraStars || 0)) {
                const i = extra.children.length;
                const st = new PIXI.Graphics();
                st.moveTo(-9, 0).lineTo(9, 0).moveTo(0, -9).lineTo(0, 9).stroke(pen.line(0xffffff, 2.2, 0.95));
                st.position.set(80 + hash(i, 91) * 840, 40 + hash(i, 92) * 620);
                extra.addChild(st);
            }
            void F;
        },
        destroy() {
            root.destroy({ children: true });
            for (const t of Object.values(tex)) t.destroy(true);
        }
    };
}
