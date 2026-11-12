/*
 * Äventyr 3 – the new characters and things, drawn in code (docs/skoldhast/adventure-3.md).
 * Every shape is built once; each frame only moves, turns, fades and shows parts. The few that redraw on a
 * change (an eyelid, Kometen's tail when its length changes, the rocket's rub-out mask, the moon's draining
 * threads, the bear's lines while he stands or breathes) say so. Origins are on the ground under the middle
 * unless stated; everything faces right and is mirrored inside its own container.
 *
 *   createNova(PIXI, pen)          Rymdkrabban Nova: Alva's watercolour painting (fidelity contract, section 3.1)
 *   createSuddet(PIXI, pen)        Alva's eraser
 *   createPip(PIXI, pen)           the old satellite (origin: its middle; it floats)
 *   createKomet(PIXI, pen)         Kometen, with its ruled tail (origin: the head's middle)
 *   createRocket(PIXI, pen, { flameTexture })   Mira's rocket, one fin crooked on purpose
 *   createStarLight(PIXI, pen)     a lost star's light (origin: its middle)
 *   createAlvaStar(PIXI, pen, o)   Alva's freehand five-pointed star, pencil or gold (origin: its middle)
 *   createPlainStar(PIXI, pen, o)  a neat "straight" star (origin: its middle)
 *   createCerealBox(PIXI, pen)     Kometflingor
 *   createCrumbs(PIXI, pen, { n }) pink eraser crumbs
 *   createSkyMoon(PIXI, pen)       Mira's moon close up, radius 100, with its three bites (origin: its middle)
 *   createDent(PIXI, pen, kind)    the dent of something rubbed out: house, dragon, firstHorse, star
 *   createBearFigure(PIXI, pen, { stars, lines, nose, legs, eye })   Stora björnen, in world coordinates
 *   constellationLine(gr, pen, pts, { dashed, ink })                 a star-line, dashed or drawn
 *
 * `pen` is src/pencil-style.mjs's pencilStyle(texture); `PIXI` is the pencil namespace (pencilPixi).
 *
 * Nova is painted, not pencilled: layered translucent washes, darker where the paint pooled, a pencil line over
 * them. Everything else is coloured pencil, as in the two earlier adventures.
 */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const damp = (v, t, r, dt) => v + (t - v) * (1 - Math.exp(-r * dt));
const lerp = (a, b, t) => a + (b - a) * t;
// a repeatable random number: the same drawing every time
const hash = (x, s = 0) => { const v = Math.sin(x * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
function mix(a, b, t) {
    const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255, br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
    return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
}
const darken = (c, k) => mix(c, 0x000000, k);
const lighten = (c, k) => mix(c, 0xffffff, k);
function g(PIXI) { return new PIXI.Graphics(); }

export const INK = 0x3b3530;
export const PAPER = 0xfbf8f1;
export const PAL = {
    // Nova (the painting's colours)
    dome: 0xc7a1e6, domeMag: 0xd35db3, domePool: 0x6f2a8a, domeSpeck: 0x4a1760,
    rim: 0x3a1d5a, band: 0xf6c4da, dot: 0xc42a86, block: 0xbf277c,
    skirt: [0x5a62d8, 0x7656d0, 0x4a78e2, 0x8b68e6, 0x6a5ccc, 0x5584dc], skirtLight: 0xd4ccff,
    arm: 0xd8679f, claw: 0xe0539c, clawHi: 0xf7a8d2, clawGlow: 0xff7ac8,
    stalk: 0x8a46a8, collar: 0x3a1d5a, eyeRing: 0xe4d6f3, iris: 0x7d93ad, irisLo: 0x4f6782, lid: 0xc69ae2,
    novaPencil: 0x4a3558,
    // Nova's lamps (section 3.4)
    lampOff: 0x5a2c5c, lampMorning: 0x8f7ad6, lampPink: 0xff6fb4, lampRed: 0xff3a2e, lampGold: 0xffd24a,
    // Suddet
    eraser: 0xf29fb3, eraserTop: 0xf8c5d1, eraserEdge: 0x8a4a5e, dust: 0x8f8996,
    // the rest
    gold: 0xe9b949, goldHi: 0xfff0a8, goldLo: 0xa77a1c, light: 0xfff1b0, lightCore: 0xfffbe6,
    star: 0xf6f1dc, starPencil: 0x6b6a78, ice: 0xdff4ff, iceLo: 0xa9d8f2, iceInk: 0x3a6a8a,
    red: 0xd23f36, redLo: 0x9e2a24, cream: 0xf3ece0, creamLo: 0xd6cab4, glass: 0x8cc4e4,
    moon: 0xf3e3a0, moonHi: 0xfff4c6, moonLo: 0xc9b26a, crater: 0xb9b096, moonInk: 0x9a8040,
    dent: 0x8e8a96, crumb: 0xf2a0b4, crumbLo: 0xc96b84,
    bear: 0x7486e0, bearLine: 0xcfd8ff, starWhite: 0xf4f6ff, dash: 0xb7c3ff
};

// ---------------------------------------------------------------------------------------
// shapes and washes
// ---------------------------------------------------------------------------------------
/** A closed loop shaken a little, so no two washes lie exactly on top of each other. */
function shake(pts, amp, seed) {
    return pts.map(([x, y], i) => [x + (hash(i, seed) - 0.5) * 2 * amp, y + (hash(i, seed + 1.7) - 0.5) * 2 * amp]);
}
/** An uneven ellipse (a puddle of paint). */
function blob(cx, cy, rx, ry, { n = 26, amp = 0.08, seed = 0, rot = 0 } = {}) {
    const pts = [];
    for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        const k = 1 + amp * (Math.sin(a * 3 + seed * 2.1) * 0.6 + Math.sin(a * 5 + seed * 1.3) * 0.4 + (hash(i, seed) - 0.5) * 0.6);
        const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
        pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return pts;
}
const flat = (pts) => pts.flat();
/**
 * A watercolour wash: two or three translucent layers, each shaken a little, the paper's tooth in one of them,
 * and the pigment pooled darker along the edge where the water dried.
 */
function wash(gr, pen, pts, color, { alpha = 0.8, seed = 1, amp = 2.2, passes = 3, edge = 0.55, grain = true } = {}) {
    for (let k = 0; k < passes; k++) {
        const c = k === 0 ? color : k === 1 ? lighten(color, 0.1) : darken(color, 0.06);
        gr.poly(flat(shake(pts, amp, seed + k * 7.3))).fill({ color: c, alpha: alpha * (k === 0 ? 0.62 : 0.3) });
    }
    if (grain) gr.poly(flat(pts)).fill(pen.fill(darken(color, 0.08), alpha * 0.28));
    if (edge > 0) gr.poly(flat(shake(pts, amp * 0.5, seed + 3.1))).stroke({ color: darken(color, 0.32), width: 3.4, alpha: edge * alpha, join: 'round' });
    return gr;
}
/** The pencil line under the paint: a little off the wash, as the painting is. */
function pencilLoop(gr, pen, pts, { color = PAL.novaPencil, width = 1.5, alpha = 0.78, seed = 9, amp = 0.9 } = {}) {
    gr.poly(flat(shake(pts, amp, seed))).stroke(pen.line(color, width, alpha));
    return gr;
}
function pathLine(gr, pts) { gr.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) gr.lineTo(pts[i][0], pts[i][1]); return gr; }
function bez(p0, c1, c2, p3, n = 20) {
    const out = [];
    for (let i = 0; i <= n; i++) {
        const u = i / n, a = (1 - u) ** 3, b = 3 * u * (1 - u) ** 2, c = 3 * u * u * (1 - u), d = u ** 3;
        out.push([a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]]);
    }
    return out;
}
/** A band along a path, `w0` wide at its start and `w1` at its end (an arm, a stalk, a brush stroke). */
function taper(path, w0, w1, wobble = 0, seed = 0) {
    const left = [], right = [];
    for (let i = 0; i < path.length; i++) {
        const [x, y] = path[i], [ax, ay] = path[Math.max(0, i - 1)], [bx, by] = path[Math.min(path.length - 1, i + 1)];
        let tx = bx - ax, ty = by - ay; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
        const u = i / (path.length - 1), w = (lerp(w0, w1, u) / 2) * (1 + (hash(i, seed) - 0.5) * wobble);
        left.push([x - ty * w, y + tx * w]); right.push([x + ty * w, y - tx * w]);
    }
    return [...left, ...right.reverse()];
}
/** A dashed polyline (the dent of a line, an unfinished drawing). */
function dashed(gr, pts, style, { dash = 12, gap = 9, closed = false, phase = 0 } = {}) {
    const P = closed ? [...pts, pts[0]] : pts;
    let on = true, left = dash - phase;
    for (let i = 1; i < P.length; i++) {
        let [x0, y0] = P[i - 1];
        const [x1, y1] = P[i];
        let seg = Math.hypot(x1 - x0, y1 - y0);
        while (seg > 0.001) {
            const step = Math.min(seg, left), u = step / seg;
            const nx = x0 + (x1 - x0) * u, ny = y0 + (y1 - y0) * u;
            if (on) gr.moveTo(x0, y0).lineTo(nx, ny);
            x0 = nx; y0 = ny; seg -= step; left -= step;
            if (left <= 0.001) { on = !on; left = on ? dash : gap; }
        }
    }
    gr.stroke(style);
    return gr;
}
function starPoints(r, inner = 0.42, { seed = 0, crooked = 0, rot = -Math.PI / 2 } = {}) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = rot + i * Math.PI / 5 + (hash(i, seed) - 0.5) * 0.5 * crooked;
        const rr = (i % 2 ? r * inner : r) * (1 + (hash(i, seed + 3) - 0.5) * 0.55 * crooked);
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return pts;
}
function halo(gr, x, y, r, color, alpha, rings = 5) {
    for (let i = rings; i >= 1; i--) gr.circle(x, y, r * i / rings).fill({ color, alpha: alpha / rings * 1.6 });
    return gr;
}
function crossStar(gr, pen, r, color = 0xffffff, alpha = 1, cx = 0, cy = 0) {
    gr.moveTo(cx - r, cy).lineTo(cx + r, cy).moveTo(cx, cy - r).lineTo(cx, cy + r).stroke(pen.line(color, Math.max(1.2, r * 0.18), alpha));
    const d = r * 0.4;
    gr.moveTo(cx - d, cy - d).lineTo(cx + d, cy + d).moveTo(cx - d, cy + d).lineTo(cx + d, cy - d)
        .stroke(pen.line(color, Math.max(1, r * 0.11), alpha * 0.65));
    return gr;
}

// ---------------------------------------------------------------------------------------
// Nova, as Alva painted her (section 3.1): a purple saucer dome over three bands, a skirt of
// blue-violet brush strokes she hovers on, two eyes on stalks with heavy lids, one claw up with a
// pink glow and one big claw hanging low, five lamps, no mouth.
// ---------------------------------------------------------------------------------------
const DOME_Y = -200, DOME_W = 75, DOME_H = 112, SKIRT_TOP = -151, SKIRT_LEN = 127;
const NOVA_LIGHTS = [[-36, -224], [-12, -230], [12, -227], [36, -222], [-26, -250], [0, -256], [26, -249], [-12, -276], [14, -278], [1, -297]];
const LAMP_X = [-46, -23, 0, 23, 46], LAMP_Y = -179;
const NOVA_LID = { shut: 1, low: 0.66, half: 0.5, open: 0.1 };
const NOVA_EYES = { asleep: 'shut', morning: 'low', ordinary: 'half', angry: 'low', supernova: 'open' };

function domePts(n = 44) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const a = Math.PI * i / n;
        pts.push([DOME_W * Math.cos(a), DOME_Y - DOME_H * Math.sin(a) ** 0.72]);
    }
    return pts;
}
function domeY(x) { const c = clamp(x / DOME_W, -1, 1); return DOME_Y - DOME_H * Math.sin(Math.acos(c)) ** 0.72; }

/** A crab's rounded pincer, its tip along -y (rotate the container to point it): a plump palm, and a slit
 *  between its two rounded fingers. Origin at the wrist. */
function pincer(PIXI, pen, size, { seed = 0 } = {}) {
    const c = new PIXI.Container();
    const gr = g(PIXI), s = size;
    const right = bez([s * 0.08, s * 0.16], [s * 1.0, s * 0.08], [s * 0.92, -s * 1.02], [s * 0.22, -s * 1.34], 16);
    const slitR = bez([s * 0.22, -s * 1.34], [s * 0.14, -s * 1.1], [s * 0.08, -s * 0.84], [s * 0.03, -s * 0.6], 6);
    const slitL = bez([s * 0.03, -s * 0.6], [-s * 0.06, -s * 0.92], [-s * 0.14, -s * 1.22], [-s * 0.24, -s * 1.5], 6);
    const left = bez([-s * 0.24, -s * 1.5], [-s * 1.02, -s * 1.16], [-s * 1.02, s * 0.06], [-s * 0.08, s * 0.16], 16);
    const outline = [...right, ...slitR.slice(1), ...slitL.slice(1), ...left.slice(1)];
    wash(gr, pen, outline, PAL.claw, { alpha: 0.92, seed: seed + 4, amp: 1 });
    // light on the bigger finger, and paint pooled darker in the palm
    gr.poly(flat(blob(-s * 0.48, -s * 0.78, s * 0.2, s * 0.38, { seed: seed + 6, rot: 0.3 }))).fill({ color: PAL.clawHi, alpha: 0.6 });
    gr.poly(flat(blob(s * 0.1, -s * 0.12, s * 0.55, s * 0.26, { seed: seed + 7 }))).fill({ color: darken(PAL.claw, 0.24), alpha: 0.32 });
    pencilLoop(gr, pen, outline, { seed: seed + 8, amp: 0.6 });
    // the slit, darker where the fingers meet
    pathLine(gr, [...slitR.slice(2), ...slitL.slice(1, -2)]).stroke(pen.line(0x5a1e46, 2.4, 0.9));
    c.addChild(gr);
    return c;
}

export function createNova(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'nova';
    // where the beam meets the ground: a soft violet light
    const pool = g(PIXI);
    for (let i = 6; i >= 1; i--) pool.ellipse(0, 0, 26 + i * 15, 3.5 + i * 2.2).fill({ color: 0x8a7ae8, alpha: 0.055 });
    const flip = new PIXI.Container();
    view.addChild(pool, flip);
    const body = new PIXI.Container(); flip.addChild(body);

    // --- the beam: the skirt of separate blue-violet strokes, fanning down ---------------------------------
    const skirt = new PIXI.Container(); skirt.position.set(0, SKIRT_TOP); body.addChild(skirt);
    const beamGlow = g(PIXI);
    beamGlow.poly([-40, 0, 40, 0, 118, SKIRT_LEN, -118, SKIRT_LEN]).fill({ color: PAL.skirtLight, alpha: 0.16 });
    beamGlow.poly([-26, 0, 26, 0, 72, SKIRT_LEN, -72, SKIRT_LEN]).fill({ color: 0xffffff, alpha: 0.1 });
    beamGlow.blendMode = 'add';
    skirt.addChild(beamGlow);
    const strokes = [];
    const N = 17;
    // the strokes in the order the brush laid them: not left to right, so they overlap unevenly
    const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => hash(a, 19) - hash(b, 19));
    for (const i of order) {
        const u = clamp((i + (hash(i, 10) - 0.5) * 0.7) / (N - 1), 0, 1), s = i * 3.7;
        const xt = lerp(-40, 40, u) + (hash(i, 11) - 0.5) * 9, xb = lerp(-120, 120, u) + (hash(i, 12) - 0.5) * 26;
        const len = SKIRT_LEN * (0.8 + hash(i, 13) * 0.24);
        const bend = (hash(i, 14) - 0.5) * 22;
        const path = [];
        for (let k = 0; k <= 12; k++) { const t = k / 12; path.push([lerp(xt, xb, t) + Math.sin(t * Math.PI) * bend, t * len]); }
        const sg = g(PIXI);
        const color = PAL.skirt[Math.floor(hash(i, 9) * PAL.skirt.length)];
        const band = taper(path, 3.5 + hash(i, 15) * 8, 7 + hash(i, 16) * 17, 0.45, s);
        const a = 0.36 + hash(i, 8) * 0.26;
        sg.poly(flat(band)).fill({ color, alpha: a });
        sg.poly(flat(shake(band, 1.8, s + 2))).fill({ color: lighten(color, 0.1), alpha: a * 0.45 });
        // a lighter streak down the middle of the stroke, where the brush had less paint
        sg.poly(flat(taper(path.slice(1, -2), 1.6, 4, 0.5, s + 5))).fill({ color: PAL.skirtLight, alpha: 0.32 });
        // the pigment dried darker down one side, and the dry end of the stroke is ragged
        pathLine(sg, band.slice(0, 13)).stroke({ color: darken(color, 0.3), width: 1.6, alpha: 0.4 });
        const [ex, ey] = path.at(-1);
        for (let k = 0; k < 3; k++) sg.moveTo(ex + (k - 1) * 4, ey - 4).lineTo(ex + (k - 1) * 5 + (hash(k, s) - 0.5) * 4, ey + 6 + hash(k, s + 1) * 8).stroke({ color, width: 2, alpha: 0.35 });
        skirt.addChild(sg);
        strokes.push({ sg, o: hash(i, 17) * TAU, base: 0.82 + hash(i, 18) * 0.18 });
    }

    // --- the arms, behind the dome -------------------------------------------------------------------------
    const armStyle = (gr, path, w0, w1, seed) => {
        const band = taper(path, w0, w1, 0.2, seed);
        wash(gr, pen, band, PAL.arm, { alpha: 0.85, seed, amp: 0.8, edge: 0.4, passes: 2 });
        pencilLoop(gr, pen, band, { seed: seed + 1, amp: 0.5, width: 1.3 });
    };
    // the left arm rises high and holds Pekklon up, glowing pink
    const leftArm = new PIXI.Container(); leftArm.position.set(-58, -244); body.addChild(leftArm);
    {
        const gr = g(PIXI);
        armStyle(gr, bez([0, 0], [-62, -8], [-70, -66], [-54, -104]), 9, 6.5, 31);
        leftArm.addChild(gr);
    }
    // (a soft pink, not an additive light: on the white page a light would only show as a pale hole)
    const pekGlow = g(PIXI);
    for (let i = 7; i >= 1; i--) pekGlow.circle(0, -22, 10 + i * 7).fill({ color: PAL.clawGlow, alpha: 0.075 });
    pekGlow.position.set(-58, -100);
    leftArm.addChild(pekGlow);
    const pek = pincer(PIXI, pen, 26, { seed: 40 }); pek.position.set(-54, -104); pek.rotation = -0.18;
    leftArm.addChild(pek);
    // the right arm bends out wide and hangs down to the big claw, held low, pointing down and in
    const rightArm = new PIXI.Container(); rightArm.position.set(62, -244); body.addChild(rightArm);
    {
        const gr = g(PIXI);
        armStyle(gr, bez([0, 0], [70, -52], [118, 24], [80, 98]), 10, 7.5, 51);
        rightArm.addChild(gr);
    }
    const bigClaw = pincer(PIXI, pen, 36, { seed: 60 }); bigClaw.position.set(80, 100); bigClaw.rotation = Math.PI + 0.5; // down and in
    rightArm.addChild(bigClaw);
    const held = new PIXI.Container(); held.position.set(66, 136); rightArm.addChild(held);

    // --- the eye stalks, rising from the top of the dome -----------------------------------------------------
    const stalkAt = [[-30, domeY(-30) + 3], [26, domeY(26) + 3]];
    const eyeAt = [[-44, -360], [36, -375]]; // the left eye a little lower
    const stalkC = new PIXI.Container(); body.addChild(stalkC);
    const eyes = [];
    stalkAt.forEach(([bx, by], i) => {
        const [ex, ey] = eyeAt[i];
        const c = new PIXI.Container(); c.position.set(bx, by); stalkC.addChild(c);
        const sg = g(PIXI);
        const path = bez([0, 0], [(ex - bx) * 0.2, (ey - by) * 0.4], [(ex - bx) * 0.7, (ey - by) * 0.6], [ex - bx, ey - by + 16], 14);
        const band = taper(path, 4.5, 12, 0.15, 70 + i);
        wash(sg, pen, band, PAL.stalk, { alpha: 0.85, seed: 71 + i, amp: 0.7, passes: 2, edge: 0.4 });
        pencilLoop(sg, pen, band, { seed: 72 + i, amp: 0.4, width: 1.2 });
        c.addChild(sg);
        const eye = new PIXI.Container(); eye.position.set(ex - bx, ey - by); c.addChild(eye);
        const r = 21;
        const eg = g(PIXI);
        const ring = blob(0, 0, r, r, { seed: 80 + i, amp: 0.03 });
        wash(eg, pen, ring, PAL.eyeRing, { alpha: 0.95, seed: 81 + i, amp: 0.8, edge: 0.35 });
        eg.circle(0, 1, 13.5).fill({ color: PAL.iris, alpha: 0.95 });
        eg.circle(0, 1, 13.5).stroke({ color: PAL.irisLo, width: 2.4, alpha: 0.7 });
        eye.addChild(eg);
        const pupil = g(PIXI);
        pupil.circle(0, 0, 6.4).fill({ color: 0x15121a });
        pupil.circle(-2.6, -2.8, 2.2).fill({ color: 0xffffff, alpha: 0.9 });
        pupil.position.set(0, 1);
        eye.addChild(pupil);
        const lid = g(PIXI); eye.addChild(lid);
        const outline = g(PIXI); pencilLoop(outline, pen, ring, { seed: 83 + i, width: 1.6 }); eye.addChild(outline);
        eyes.push({ c, eye, pupil, lid, r, drawn: -1 });
    });

    // --- the dome -------------------------------------------------------------------------------------------
    const dome = g(PIXI);
    const D = domePts();
    wash(dome, pen, D, PAL.dome, { alpha: 0.86, seed: 3, amp: 2.4 });
    // the magenta wash over the middle, and the dark pool with its speckles where the paint gathered
    wash(dome, pen, blob(8, -258, 54, 42, { seed: 5, amp: 0.12 }), PAL.domeMag, { alpha: 0.5, seed: 6, edge: 0.3 });
    wash(dome, pen, blob(4, -254, 30, 25, { seed: 7, amp: 0.16 }), PAL.domePool, { alpha: 0.42, seed: 8, edge: 0.4 });
    for (let k = 0; k < 36; k++) {
        const a = hash(k, 20) * TAU, rr = Math.sqrt(hash(k, 21));
        dome.circle(4 + Math.cos(a) * 36 * rr, -254 + Math.sin(a) * 28 * rr, 0.9 + hash(k, 22) * 1.9).fill({ color: PAL.domeSpeck, alpha: 0.35 + hash(k, 23) * 0.35 });
    }
    // paint pooled along the dome's edge
    dome.poly(flat(shake(D.slice(2, -2), 1.2, 9))).stroke({ color: darken(PAL.dome, 0.4), width: 5, alpha: 0.22 });
    body.addChild(dome);
    // the lights found, kept under the dome (it is also the counter)
    const lightC = new PIXI.Container(); body.addChild(lightC);
    const lights = NOVA_LIGHTS.map(([x, y], i) => {
        const l = g(PIXI);
        halo(l, 0, 0, 13, PAL.light, 0.3, 4);
        l.circle(0, 0, 3.4).fill({ color: PAL.lightCore });
        l.position.set(x, y); l.visible = false; lightC.addChild(l);
        return { l, o: hash(i, 30) * TAU };
    });
    lightC.blendMode = 'add';
    // the unpainted white wedge on the left: the shine on the glass
    const wedge = g(PIXI);
    const W = [[-58, -214], [-68, -246], [-58, -282], [-41, -300], [-45, -266], [-47, -230]];
    wedge.poly(flat(shake(W, 1.6, 41))).fill({ color: PAPER, alpha: 0.42 });
    wedge.poly(flat(W)).fill({ color: PAPER, alpha: 0.88 });
    body.addChild(wedge);
    const domeLine = g(PIXI);
    pathLine(domeLine, shake(D, 0.9, 12)).stroke(pen.line(PAL.novaPencil, 1.7, 0.8));
    body.addChild(domeLine);
    // the collars the stalks stand in, on the dome
    const collars = g(PIXI);
    for (const [bx, by] of stalkAt) {
        const cup = [];
        for (let k = 0; k <= 10; k++) { const a = Math.PI * (0.08 + 0.84 * k / 10); cup.push([bx + Math.cos(a) * 11, by - 2 + Math.sin(a) * 7]); }
        for (let k = 10; k >= 0; k--) { const a = Math.PI * (0.08 + 0.84 * k / 10); cup.push([bx + Math.cos(a) * 6.5, by - 3 + Math.sin(a) * 3.2]); }
        wash(collars, pen, cup, PAL.collar, { alpha: 0.92, seed: 90 + bx, amp: 0.5, passes: 2, edge: 0.3 });
        pencilLoop(collars, pen, cup, { seed: 91 + bx, amp: 0.3, width: 1.2 });
    }
    body.addChild(collars);

    // --- the three bands under the dome -------------------------------------------------------------------
    const bands = g(PIXI);
    const rimPts = [];
    for (let k = 0; k <= 24; k++) { const x = -96 + 192 * k / 24, q = 1 - (x / 96) ** 2; rimPts.push([x, -202 - 5 * q]); }
    for (let k = 24; k >= 0; k--) { const x = -96 + 192 * k / 24, q = 1 - (x / 96) ** 2; rimPts.push([x * 0.985, -190 + 6 * q]); }
    const bandPts = [[-72, -190], [-24, -191], [24, -191], [72, -190], [70, -179], [66, -168], [22, -167], [-22, -167], [-66, -168], [-70, -179]];
    const blockPts = [[-33, -169], [33, -169], [31, -160], [29, -151], [-29, -151], [-31, -160]];
    wash(bands, pen, bandPts, PAL.band, { alpha: 0.9, seed: 101, amp: 1.2 });
    wash(bands, pen, blockPts, PAL.block, { alpha: 0.92, seed: 102, amp: 1 });
    wash(bands, pen, rimPts, PAL.rim, { alpha: 0.93, seed: 103, amp: 1.3, edge: 0.3 });
    // the painted dots (the lamps sit on them)
    LAMP_X.forEach((x, i) => wash(bands, pen, blob(x, LAMP_Y, 6.6, 6.2, { seed: 110 + i, amp: 0.05 }), PAL.dot, { alpha: 0.95, seed: 111 + i, amp: 0.4, passes: 2 }));
    pencilLoop(bands, pen, rimPts, { seed: 104 }); pencilLoop(bands, pen, bandPts, { seed: 105 }); pencilLoop(bands, pen, blockPts, { seed: 106 });
    body.addChild(bands);
    // the five lamps: a glow and a light on each painted dot
    const lampC = new PIXI.Container(); body.addChild(lampC);
    const lamps = LAMP_X.map((x) => {
        const c = new PIXI.Container(); c.position.set(x, LAMP_Y);
        const glow = g(PIXI); halo(glow, 0, 0, 22, 0xffffff, 0.42, 6);
        const dot = g(PIXI); dot.circle(0, 0, 5.4).fill({ color: 0xffffff }); dot.circle(-1.6, -1.8, 1.6).fill({ color: 0xffffff });
        c.addChild(glow, dot); lampC.addChild(c);
        return { c, glow, dot };
    });
    // steam when she is angry, and the gold of a supernova
    const steam = new PIXI.Container(); steam.position.set(0, -316); body.addChild(steam);
    const puffs = [];
    for (let i = 0; i < 4; i++) {
        const p = g(PIXI);
        for (let k = 4; k >= 1; k--) p.circle(0, 0, 4 + k * 3).fill({ color: 0xf2eef8, alpha: 0.14 });
        steam.addChild(p); puffs.push({ p, o: i / 4, side: i % 2 ? 1 : -1 });
    }
    const aura = g(PIXI);
    for (let i = 8; i >= 1; i--) aura.ellipse(0, -250, 70 + i * 14, 60 + i * 12).fill({ color: PAL.lampGold, alpha: 0.04 });
    aura.visible = false;
    body.addChildAt(aura, 0);

    let facing = 1, lidK = 0.5, blinkAt = 3, lampNow = { color: PAL.lampPink, strength: 0.45 };
    function drawLid(e, k) {
        if (Math.abs(k - e.drawn) < 0.008) return;
        e.drawn = k;
        e.lid.clear();
        if (k <= 0.02) return;
        const r = e.r + 1.2;
        if (k >= 0.99) {
            // shut: the whole eye under the lid, and the line across it
            e.lid.circle(0, 0, r).fill({ color: PAL.lid, alpha: 0.97 });
            e.lid.circle(0, 0, r).fill(pen.fill(darken(PAL.lid, 0.1), 0.25));
            e.lid.moveTo(-r - 2, 3).quadraticCurveTo(0, 9, r + 2, 3).stroke(pen.line(0x3b2a4a, 2.3, 0.92));
            return;
        }
        // the part of the eye above the line, filled with the lid's lilac (y down: from the line's left end over the
        // top to its right end)
        const yEdge = -r + 2 * r * k, s = Math.asin(clamp(yEdge / r, -1, 1));
        const top = [];
        for (let i = 0; i <= 26; i++) { const a = Math.PI - s + (Math.PI + 2 * s) * i / 26; top.push([Math.cos(a) * r, Math.sin(a) * r]); }
        e.lid.poly(flat(top)).fill({ color: PAL.lid, alpha: 0.96 });
        e.lid.poly(flat(top)).fill(pen.fill(darken(PAL.lid, 0.1), 0.25));
        // the line across the eye, a little longer than the eye is wide
        const half = Math.sqrt(Math.max(0, r * r - yEdge * yEdge));
        e.lid.moveTo(-half - 3, yEdge + 0.5).quadraticCurveTo(0, yEdge + 2.5, half + 3, yEdge - 0.5).stroke(pen.line(0x3b2a4a, 2.3, 0.92));
    }
    function lampState(mood, t, talking, rm) {
        let color, a, glow, strength;
        switch (mood) {
            case 'asleep': color = PAL.lampOff; a = 0.35; glow = 0; strength = 0; break;
            case 'morning': color = PAL.lampMorning; a = 0.55 + (rm ? 0 : 0.2 * Math.sin(t * 1.6)); glow = 0.28; strength = 0.22; break;
            case 'angry': { const on = rm ? 1 : (Math.sin(t * 22) > -0.2 ? 1 : 0.35); color = PAL.lampRed; a = on; glow = 0.95 * on; strength = 0.75 + 0.25 * on; break; }
            case 'supernova': color = PAL.lampGold; a = 1; glow = rm ? 1 : 0.85 + 0.15 * Math.sin(t * 6); strength = 1; break;
            default: color = PAL.lampPink; a = 0.95; glow = 0.45; strength = 0.45;
        }
        return { color, a, glow, strength };
    }
    return {
        view,
        /** Local heights for the camera: the top of the dome, and the top of everything (her eyes). */
        domeTop: DOME_Y - DOME_H, top: -400, eyeY: -368, beamTop: SKIRT_TOP,
        /**
         * s = { visible, x, y, facing, mood, lights, glow, beam, talking, eyes, lookAt, holding: 'box'|null }.
         * x/y/visible are optional (a caller may place view itself).
         */
        update(dt, s = {}, t = 0, { reducedMotion = false } = {}) {
            const rm = reducedMotion;
            if (s.visible === false) { view.visible = false; return; }
            view.visible = true;
            if (typeof s.x === 'number') view.position.set(s.x, s.y);
            dt = Math.min(dt, 0.1);
            facing = damp(facing, s.facing || 1, 10, dt);
            flip.scale.x = Math.abs(facing) < 0.05 ? 0.05 : facing;
            const mood = s.mood || 'ordinary';
            const bob = rm ? 0 : Math.sin(t * 1.6) * 5 + Math.sin(t * 0.7) * 2;
            body.y = bob + (mood === 'asleep' ? 8 : 0);
            // the beam reaches the ground whatever her height
            skirt.scale.y = (SKIRT_LEN - body.y) / SKIRT_LEN;
            const beam = clamp(s.beam || 0, 0, 1);
            skirt.scale.x = 1 + 0.22 * beam;
            beamGlow.alpha = (mood === 'asleep' ? 0.25 : 0.55) + beam * 0.9;
            for (const st of strokes) st.sg.alpha = st.base * (mood === 'asleep' ? 0.7 : 1) * (rm ? 1 : 0.86 + 0.14 * Math.sin(t * 2.2 + st.o)) + beam * 0.2;
            pool.alpha = (mood === 'asleep' ? 0.5 : 0.85) + beam * 0.8;
            pool.scale.set(1 + 0.25 * beam, 1);
            // the eyes: heavy lids, and a blink now and then (never while asleep)
            const want = NOVA_LID[s.eyes || NOVA_EYES[mood] || 'half'] ?? 0.5;
            lidK = damp(lidK, want, 9, dt);
            let k = lidK;
            if (mood !== 'asleep' && t > blinkAt) { k = 1; if (t > blinkAt + 0.13) blinkAt = t + 3.2 + hash(Math.floor(t), 3) * 3; }
            const look = s.lookAt !== undefined && typeof s.x === 'number' ? clamp((s.lookAt - s.x) * Math.sign(facing || 1) / 500, -1, 1) : 0.3;
            for (const [i, e] of eyes.entries()) {
                drawLid(e, k);
                e.pupil.position.set(look * 5, mood === 'asleep' ? 3 : 2.5 + (mood === 'morning' ? 2 : 0));
                e.c.rotation = rm ? 0 : Math.sin(t * 1.1 + i * 2.2) * 0.04 + (mood === 'angry' ? (i ? -0.08 : 0.08) : 0);
            }
            // the claws: Pekklon up and glowing; the big claw points when she is cross
            const glow = clamp(s.glow || 0, 0, 1);
            pekGlow.alpha = 0.28 + glow * 0.75 + (glow > 0.2 && !rm ? Math.sin(t * 4) * 0.12 * glow : 0);
            pekGlow.scale.set(1 + 0.35 * glow);
            leftArm.rotation = rm ? 0 : Math.sin(t * 1.2) * 0.035 + (s.talking ? Math.sin(t * 3.1) * 0.05 : 0);
            rightArm.rotation = damp(rightArm.rotation, mood === 'angry' ? -0.55 : s.holding ? -0.12 : 0, 6, dt) + (rm || mood === 'angry' ? 0 : Math.sin(t * 0.9 + 1) * 0.004);
            held.visible = !!s.holding;
            if (s.holding && !held.children.length) {
                const box = createCerealBox(PIXI, pen); box.view.scale.set(0.62); box.view.rotation = -0.2; held.addChild(box.view);
            }
            // the lights under the dome
            const n = clamp(Math.round(s.lights || 0), 0, 10);
            lights.forEach((L, i) => { L.l.visible = i < n; if (i < n) L.l.alpha = rm ? 0.9 : 0.72 + 0.28 * Math.sin(t * 2.3 + L.o); });
            // the lamps (section 3.4); talking, they flicker in time with the words: she has no mouth
            const ls = lampState(mood, t, !!s.talking, rm);
            lamps.forEach((L, i) => {
                let a = ls.a;
                if (s.talking && !rm && mood !== 'asleep') a *= 0.55 + 0.45 * Math.abs(Math.sin(t * 15 + i * 1.3));
                L.dot.tint = ls.color; L.glow.tint = ls.color;
                L.dot.alpha = a; L.glow.alpha = ls.glow * a;
                L.glow.scale.set(mood === 'supernova' ? 1.5 : 1);
            });
            lampNow = { color: ls.color, strength: ls.strength };
            steam.visible = mood === 'angry';
            if (steam.visible) for (const p of puffs) {
                const u = rm ? p.o : (t * 0.9 + p.o) % 1;
                p.p.position.set(p.side * (8 + u * 18), -u * 46);
                p.p.alpha = Math.sin(u * Math.PI) * 0.9; p.p.scale.set(0.5 + u);
            }
            aura.visible = mood === 'supernova';
            if (aura.visible) aura.alpha = rm ? 0.8 : 0.65 + 0.35 * Math.sin(t * 3);
        },
        /** The lamps' light now: the view lights the night side with it (M3). */
        lampLight() { return lampNow; },
        /** Where Pekklon is, in the view's parent's units (for a glow line or a pointer). */
        clawPoint() { const p = pek.getGlobalPosition?.(); return p || null; },
        destroy() { view.destroy({ children: true }); }
    };
}

// ---------------------------------------------------------------------------------------
// Suddet: Alva's eraser. Small, pink, a rounded block worn at one corner, grey with pencil dust on its
// rubbing end. No face until Mira draws one; until then it shows what it feels by how it tilts, hops and
// shrinks back.
// ---------------------------------------------------------------------------------------
export function createSuddet(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'sudd';
    const shadow = g(PIXI);
    for (let i = 4; i >= 1; i--) shadow.ellipse(0, 0, 22 + i * 5, 2 + i).fill({ color: 0x2e2a36, alpha: 0.06 });
    const flip = new PIXI.Container();
    view.addChild(shadow, flip);
    const scaler = new PIXI.Container(); flip.addChild(scaler);
    const body = new PIXI.Container(); scaler.addChild(body);
    const gr = g(PIXI);
    // the front face, its worn top corner at the rubbing end (+x)
    const front = [[-32, -24], [-31, -27], [-27, -28], [16, -28], [24, -26], [28, -20], [29, -12], [29, -3], [27, 0], [-29, 0], [-32, -3]];
    const top = [[-27, -28], [-21, -35], [21, -35], [27, -32], [24, -26], [16, -28]];
    const end = [[24, -26], [27, -32], [34, -27], [35, -8], [33, -4], [29, -3], [29, -12], [28, -20]];
    // flat pink pencil, laid in smoothly (the paper's tooth only lightly)
    gr.poly(flat(front)).fill({ color: PAL.eraser });
    gr.poly(flat(front)).fill(pen.hatch(darken(PAL.eraser, 0.08), 0.28));
    gr.poly(flat(top)).fill({ color: PAL.eraserTop });
    gr.poly(flat(top)).fill(pen.hatch(PAL.eraser, 0.18));
    gr.poly(flat(end)).fill({ color: 0xa79fa9 });
    gr.poly(flat(end)).fill(pen.hatch(0x6f6876, 0.4));
    // pencil dust smudged onto the pink near the rubbing end
    for (let k = 0; k < 4; k++) gr.poly(flat(blob(22 - k * 3, -14 + (k - 1.5) * 4, 7 + k, 9, { seed: 120 + k, amp: 0.2 }))).fill({ color: PAL.dust, alpha: 0.16 });
    for (let k = 0; k < 9; k++) gr.circle(18 + hash(k, 125) * 12, -22 + hash(k, 126) * 20, 0.8 + hash(k, 127) * 1.2).fill({ color: 0x5c5662, alpha: 0.55 });
    gr.poly(flat(front)).stroke(pen.line(PAL.eraserEdge, 1.6, 0.9));
    gr.poly(flat(top)).stroke(pen.line(PAL.eraserEdge, 1.3, 0.75));
    gr.poly(flat(end)).stroke(pen.line(0x4f4856, 1.4, 0.85));
    // a printed band and a light edge, as a real eraser has
    gr.moveTo(-26, -9).lineTo(14, -9).stroke(pen.line(lighten(PAL.eraser, 0.35), 2.2, 0.6));
    body.addChild(gr);
    // the eyes Mira draws in the finale, and the gold star Alva draws on it
    const eyes = g(PIXI);
    for (const x of [-10, 4]) {
        eyes.ellipse(x, -17, 3.6, 4.4).fill({ color: 0xfbfaf6 }).stroke(pen.line(0x2b2228, 1.1));
        eyes.circle(x + 0.8, -16.4, 2).fill({ color: 0x1a1418 });
        eyes.circle(x + 0.1, -17.4, 0.7).fill({ color: 0xffffff });
        eyes.moveTo(x - 2.4, -21.6).lineTo(x - 3.6, -23.6).moveTo(x + 2.2, -21.8).lineTo(x + 3.2, -24).stroke(pen.line(0x2b2228, 0.9));
    }
    eyes.visible = false; body.addChild(eyes);
    const star = g(PIXI);
    const sp = starPoints(6, 0.45, { seed: 7, crooked: 0.8 }).map(([x, y]) => [x - 21, y - 9]);
    star.poly(flat(sp)).fill(pen.fill(PAL.gold)).stroke(pen.line(PAL.goldLo, 1.1));
    star.visible = false; body.addChild(star);
    // crumbs that fall from its end while it rubs
    const crumbs = [];
    for (let i = 0; i < 6; i++) {
        const c = g(PIXI); c.arc(0, 0, 2.6, 0.3, 4.6).stroke(pen.line(PAL.crumb, 2.4)); c.visible = false; flip.addChild(c);
        crumbs.push({ c, o: i / 6, dx: 26 + hash(i, 130) * 14 });
    }
    let facing = 1, sizeNow = 1, hop = 0;
    return {
        view,
        /** s = { visible, x, y, facing, pose: 'idle'|'hop'|'rub'|'shrink'|'tilt'|'happy', size: 0.3..1, eyes, goldStar, talking } */
        update(dt, s = {}, t = 0, { reducedMotion = false } = {}) {
            const rm = reducedMotion;
            if (s.visible === false) { view.visible = false; return; }
            view.visible = true;
            if (typeof s.x === 'number') view.position.set(s.x, s.y);
            dt = Math.min(dt, 0.1);
            facing = damp(facing, s.facing || 1, 12, dt);
            flip.scale.x = Math.abs(facing) < 0.05 ? 0.05 : facing;
            sizeNow = damp(sizeNow, clamp(s.size ?? 1, 0.25, 1.2), 3, dt);
            scaler.scale.set(sizeNow);
            shadow.scale.set(sizeNow);
            const pose = s.pose || 'idle';
            body.pivot.set(0, 0); body.position.set(0, 0); body.rotation = 0; body.scale.set(1, 1);
            if (pose === 'hop' || pose === 'happy') {
                const f = pose === 'happy' ? 3.2 : 2.2, u = rm ? 0 : Math.max(0, Math.sin(t * f * Math.PI));
                hop = u * (pose === 'happy' ? 16 : 22);
                body.y = -hop;
                const land = rm ? 0 : Math.max(0, -Math.sin(t * f * Math.PI)) * 0.12;
                body.scale.set(1 + land, 1 - land);
                body.rotation = pose === 'happy' && !rm ? Math.sin(t * 6) * 0.1 : 0;
            } else if (pose === 'rub') {
                // tipped onto its rubbing end, back and forth
                body.pivot.set(30, 0); body.position.set(30, 0);
                body.rotation = 0.42 + (rm ? 0 : Math.sin(t * 16) * 0.06);
                body.x = 30 + (rm ? 0 : Math.sin(t * 16) * 6);
            } else if (pose === 'shrink') {
                body.scale.set(0.9, 0.82);
                body.x = rm ? -6 : -6 + Math.sin(t * 30) * 0.8;
                body.rotation = -0.08;
            } else if (pose === 'tilt') {
                body.pivot.set(-30, 0); body.position.set(-30, 0);
                body.rotation = -0.26 + (rm ? 0 : Math.sin(t * 1.4) * 0.04);
            } else {
                const b = rm ? 0 : Math.sin(t * 2.1) * 0.025;
                body.scale.set(1 - b * 0.5, 1 + b);
                if (s.talking && !rm) { body.rotation = Math.sin(t * 9) * 0.05; body.y = -Math.abs(Math.sin(t * 9)) * 2; }
            }
            eyes.visible = !!s.eyes;
            star.visible = !!s.goldStar;
            for (const c of crumbs) {
                c.c.visible = pose === 'rub' && !rm;
                if (!c.c.visible) continue;
                const u = (t * 1.4 + c.o) % 1;
                c.c.position.set(c.dx * sizeNow + u * 8, -2 - Math.sin(u * Math.PI) * 10);
                c.c.alpha = 1 - u; c.c.rotation = u * 4;
            }
        },
        destroy() { view.destroy({ children: true }); }
    };
}

// ---------------------------------------------------------------------------------------
// Pip: a small old satellite that tumbles in its orbit and says pip. It takes photographs.
// Origin: its middle.
// ---------------------------------------------------------------------------------------
export function createPip(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'pip';
    const spin = new PIXI.Container(); view.addChild(spin);
    const gr = g(PIXI);
    // the panels on their rods
    gr.moveTo(-14, 0).lineTo(-28, 0).moveTo(14, 0).lineTo(28, 0).stroke(pen.line(0x5d5866, 2.6));
    for (const x0 of [-56, 28]) {
        gr.rect(x0, -9, 28, 18).fill(pen.fill(0x34539c)).stroke(pen.line(0x1d2c56, 1.6));
        for (let k = 1; k < 4; k++) gr.moveTo(x0 + k * 7, -9).lineTo(x0 + k * 7, 9).stroke(pen.line(0x9cb6ea, 1, 0.75));
        gr.moveTo(x0, 0).lineTo(x0 + 28, 0).stroke(pen.line(0x9cb6ea, 1, 0.75));
        gr.moveTo(x0 + 3, -7).lineTo(x0 + 12, -7).stroke(pen.line(0xffffff, 1.4, 0.5));
    }
    // the body: an old gold-foil box, crinkled and patched
    gr.roundRect(-15, -13, 30, 26, 3).fill(pen.fill(0xd8b04a)).stroke(pen.line(0x7a5a1c, 1.8));
    gr.poly([-15, -13, -9, -18, 21, -18, 15, -13]).fill(pen.fill(0xf0cd72)).stroke(pen.line(0x7a5a1c, 1.4));
    for (let k = 0; k < 6; k++) gr.moveTo(-12 + k * 5, -10 + (k % 2) * 3).lineTo(-9 + k * 5, 2 + (k % 3) * 3).stroke(pen.line(0xa67d22, 1, 0.7));
    gr.rect(-12, 3, 9, 7).fill(pen.fill(0xe9e2cf, 0.9)).stroke(pen.line(0x8a8070, 0.9)); // a patch
    gr.moveTo(-12, 3).lineTo(-3, 10).stroke(pen.line(0x8a8070, 0.8, 0.7));
    // the camera
    gr.circle(9, 2, 6).fill(pen.fill(0x2a2f3c)).stroke(pen.line(0x111318, 1.4));
    gr.circle(7.6, 0.6, 1.8).fill({ color: 0xffffff, alpha: 0.85 });
    // the antenna, a little bent
    gr.moveTo(-2, -18).lineTo(-6, -30).lineTo(-3, -38).stroke(pen.line(0x5d5866, 1.8));
    gr.circle(-3, -40, 3.4).fill(pen.fill(0xd04a40)).stroke(pen.line(0x7a221c, 1));
    spin.addChild(gr);
    const flash = g(PIXI);
    halo(flash, 9, 2, 46, 0xffffff, 1, 7);
    flash.blendMode = 'add'; flash.alpha = 0; spin.addChild(flash);
    let rot = 0;
    return {
        view,
        /** s = { visible, x, y, tumble (radians a second), flash: 0..1 } */
        update(dt, s = {}, t = 0, { reducedMotion = false } = {}) {
            if (s.visible === false) { view.visible = false; return; }
            view.visible = true;
            if (typeof s.x === 'number') view.position.set(s.x, s.y);
            rot += (reducedMotion ? 0.15 : 1) * (s.tumble ?? 0.8) * Math.min(dt, 0.1);
            spin.rotation = rot;
            flash.alpha = clamp(s.flash || 0, 0, 1);
        },
        destroy() { view.destroy({ children: true }); }
    };
}

// ---------------------------------------------------------------------------------------
// Kometen: always in a hurry, vain about its dead straight tail ("linjalsvans", ruled like a ruler).
// Origin: the head's middle; the tail runs out behind it.
// ---------------------------------------------------------------------------------------
export function createKomet(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'komet';
    const flip = new PIXI.Container(); view.addChild(flip);
    const tailC = new PIXI.Container(); flip.addChild(tailC);
    const tailGlow = g(PIXI), tail = g(PIXI);
    tailGlow.blendMode = 'add';
    tailC.addChild(tailGlow, tail);
    const head = new PIXI.Container(); flip.addChild(head);
    const glow = g(PIXI);
    halo(glow, 0, 0, 112, 0xbfe8ff, 0.32, 8);
    glow.blendMode = 'add'; head.addChild(glow);
    const speed = g(PIXI); head.addChild(speed);
    for (let k = 0; k < 4; k++) speed.moveTo(-58 - k * 8, -26 + k * 17).lineTo(-108 - k * 16, -26 + k * 17).stroke(pen.line(0xe6f6ff, 3, 0.7));
    const rock = g(PIXI);
    const R = blob(0, 0, 50, 46, { seed: 140, amp: 0.1 });
    rock.poly(flat(R)).fill(pen.fill(PAL.ice));
    // icy facets
    for (const f of [[[-30, -30], [-6, -44], [4, -18], [-20, -8]], [[10, -40], [34, -24], [20, -6], [6, -18]], [[-38, 6], [-14, -2], [-8, 26], [-30, 30]], [[14, 10], [38, 4], [30, 34], [10, 34]]]) {
        rock.poly(flat(f)).fill(pen.hatch(PAL.iceLo, 0.55)).stroke(pen.line(0x8cbfdc, 1, 0.6));
    }
    rock.poly(flat(R)).stroke(pen.line(PAL.iceInk, 2.2));
    rock.ellipse(-16, -26, 12, 6).fill({ color: 0xffffff, alpha: 0.7 });
    head.addChild(rock);
    // the face: wide eyes, eager brows, a mouth that never stops
    const face = new PIXI.Container(); face.position.set(14, -2); head.addChild(face);
    const eyesG = g(PIXI);
    for (const x of [-4, 18]) eyesG.ellipse(x, -10, 8, 10).fill({ color: 0xffffff }).stroke(pen.line(0x24323e, 1.6));
    face.addChild(eyesG);
    const pupils = g(PIXI);
    for (const x of [-1, 21]) { pupils.circle(x, -9, 4).fill({ color: 0x141a20 }); pupils.circle(x - 1.2, -10.6, 1.3).fill({ color: 0xffffff }); }
    face.addChild(pupils);
    const lids = g(PIXI);
    for (const x of [-4, 18]) lids.ellipse(x, -15, 8.6, 6).fill(pen.fill(lighten(PAL.ice, 0.2)));
    for (const x of [-4, 18]) lids.moveTo(x - 8, -10).lineTo(x + 8, -10).stroke(pen.line(0x24323e, 1.4));
    lids.visible = false; face.addChild(lids);
    const brows = g(PIXI);
    brows.moveTo(-12, -25).lineTo(2, -22).moveTo(12, -23).lineTo(26, -27).stroke(pen.line(0x24323e, 2.2));
    face.addChild(brows);
    const mouth = g(PIXI);
    mouth.ellipse(0, 0, 8, 6).fill({ color: 0x2a2030 }).stroke(pen.line(0x24323e, 1.4));
    mouth.ellipse(0, 3, 4, 2).fill({ color: 0xd8686a });
    mouth.position.set(8, 16); face.addChild(mouth);
    let drawnLen = -1, facing = 1;
    function drawTail(L) {
        drawnLen = L;
        tail.clear(); tailGlow.clear();
        if (L < 4) return;
        const x0 = -36, x1 = x0 - L, w = 17;
        tailGlow.rect(x1, -w * 2.2, L, w * 4.4).fill({ color: 0xcfeeff, alpha: 0.08 });
        tailGlow.rect(x1, -w * 1.5, L, w * 3).fill({ color: 0xfff3c4, alpha: 0.1 });
        // the band itself, fading at its far end in steps (no gradient: pencil)
        const n = 6;
        for (let i = 0; i < n; i++) {
            const a = x0 - L * i / n, b = x0 - L * (i + 1) / n;
            tail.rect(b, -w, a - b, w * 2).fill(pen.fill(0xfff2c0, 0.75 * (1 - i / n) + 0.1));
        }
        tail.rect(x1, -w * 0.45, L, w * 0.9).fill({ color: 0xffffff, alpha: 0.35 });
        // ruled edges and a ruler's marks: it is proud of them
        tail.moveTo(x0, -w).lineTo(x1, -w).moveTo(x0, w).lineTo(x1, w).stroke(pen.line(0xb08a3a, 2, 0.85));
        for (let d = 0, k = 0; d <= L; d += 20, k++) {
            const x = x0 - d, long = k % 5 === 0;
            tail.moveTo(x, -w).lineTo(x, -w + (long ? 13 : 6)).stroke(pen.line(0x8a6a28, long ? 1.6 : 1.1, 0.8 * (1 - d / L * 0.7)));
        }
    }
    let t0 = 0;
    return {
        view,
        /** s = { visible, x, y, facing, tail (length in world units), resting, talking, speed: 0..1 } */
        update(dt, s = {}, t = 0, { reducedMotion = false } = {}) {
            const rm = reducedMotion;
            if (s.visible === false) { view.visible = false; return; }
            view.visible = true;
            if (typeof s.x === 'number') view.position.set(s.x, s.y);
            dt = Math.min(dt, 0.1); t0 += dt;
            facing = damp(facing, s.facing || 1, 10, dt);
            flip.scale.x = Math.abs(facing) < 0.05 ? 0.05 : facing;
            const L = Math.max(0, s.tail ?? 600);
            if (Math.abs(L - drawnLen) > Math.max(2, drawnLen * 0.02)) drawTail(L);
            const sp = clamp(s.speed ?? (s.resting ? 0 : 0.7), 0, 1);
            speed.alpha = sp * (rm ? 0.5 : 0.6 + 0.4 * Math.sin(t * 20));
            head.y = rm ? 0 : s.resting ? Math.sin(t * 2.4) * 3 : Math.sin(t * 9) * 1.5;
            glow.alpha = 0.75 + (rm ? 0 : 0.25 * Math.sin(t * 5));
            lids.visible = !!s.resting;
            pupils.x = s.resting ? 0 : 2;
            brows.y = s.resting ? 4 : (rm ? 0 : -Math.abs(Math.sin(t * 6)) * 2);
            const open = s.talking ? (rm ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(t * 18))) : s.resting ? 0.75 : 0.25;
            mouth.scale.set(1, open);
            tailC.alpha = 0.92 + (rm ? 0 : 0.08 * Math.sin(t * 7));
        },
        /** How far behind the head the tail begins (local units, before the facing). */
        tailStart: -36,
        destroy() { view.destroy({ children: true }); }
    };
}

// ---------------------------------------------------------------------------------------
// Mira's rocket, as it was seen from Utsiktskullen in Äventyr 2: red nose and fins, a round window, a small
// gold star on its side, and one fin crooked on purpose ("Då svänger den bättre"). About 2.2 HL tall; origin
// at the base centre, between the fins.
// ---------------------------------------------------------------------------------------
const ROCKET = {
    body: [[-52, -52], [-55, -120], [-55, -250], [-50, -300], [-40, -330], [40, -330], [50, -300], [55, -250], [55, -120], [52, -52]],
    nose: [[-40, -330], [-30, -370], [-14, -414], [0, -440], [14, -414], [30, -370], [40, -330]],
    finL: [[-52, -60], [-50, -128], [-74, -96], [-110, -40], [-112, -6], [-96, 0], [-70, -30]], // the crooked one
    finR: [[52, -60], [52, -130], [74, -90], [96, -40], [98, 0], [80, 0], [62, -36]],
    nozzle: [[-26, -52], [26, -52], [34, -14], [-34, -14]]
};
export function createRocket(PIXI, pen, { flameTexture = null } = {}) {
    const view = new PIXI.Container(); view.label = 'rocket';
    const flameC = new PIXI.Container(); flameC.position.set(0, -14); view.addChild(flameC);
    const flameDraw = g(PIXI);
    flameDraw.moveTo(-26, 0).quadraticCurveTo(-30, 60, 0, 120).quadraticCurveTo(30, 60, 26, 0).closePath().fill({ color: 0xff8a32, alpha: 0.92 });
    flameDraw.moveTo(-15, 0).quadraticCurveTo(-16, 40, 0, 78).quadraticCurveTo(16, 40, 15, 0).closePath().fill({ color: 0xffd36a });
    flameDraw.moveTo(-7, 0).quadraticCurveTo(-6, 20, 0, 38).quadraticCurveTo(6, 20, 7, 0).closePath().fill({ color: 0xfff7d8 });
    flameC.addChild(flameDraw);
    let flameSprite = null;
    const flameGlow = g(PIXI); halo(flameGlow, 0, 40, 80, 0xffa64a, 0.3, 7); flameC.addChildAt(flameGlow, 0);
    const solid = new PIXI.Container(); view.addChild(solid);
    const outline = g(PIXI); view.addChildAt(outline, 1);
    const mask = g(PIXI); view.addChild(mask); mask.visible = true;
    const gr = g(PIXI);
    // fins behind the body
    const finR = g(PIXI);
    finR.poly(flat(ROCKET.finR)).fill(pen.fill(PAL.red)).stroke(pen.line(PAL.redLo, 2.2));
    finR.poly(flat(ROCKET.finR.slice(1, 4))).fill(pen.hatch(darken(PAL.red, 0.18), 0.5));
    solid.addChild(finR);
    const finL = g(PIXI);
    finL.poly(flat(ROCKET.finL)).fill(pen.fill(PAL.red)).stroke(pen.line(PAL.redLo, 2.2));
    finL.poly(flat(ROCKET.finL.slice(1, 5))).fill(pen.hatch(darken(PAL.red, 0.18), 0.5));
    // Mira's crooked line, drawn proudly twice
    finL.moveTo(-58, -70).lineTo(-98, -18).stroke(pen.line(PAL.redLo, 1.4, 0.6));
    solid.addChild(finL);
    gr.poly(flat(ROCKET.nozzle)).fill(pen.fill(0x6d6a74)).stroke(pen.line(0x35323c, 2));
    gr.moveTo(-30, -30).lineTo(30, -30).stroke(pen.line(0x9a96a2, 1.6, 0.8));
    // the body: cream, shaded on one side in pencil
    gr.poly(flat(ROCKET.body)).fill(pen.fill(PAL.cream)).stroke(pen.line(0x6a5f52, 2.4));
    gr.poly([20, -300, 50, -300, 55, -250, 55, -120, 52, -52, 24, -52, 30, -120, 30, -250]).fill(pen.hatch(PAL.creamLo, 0.7));
    gr.moveTo(-55, -120).lineTo(55, -120).moveTo(-50, -300).lineTo(50, -300).stroke(pen.line(0x8d7f6e, 1.6, 0.7));
    for (let y = -110; y > -290; y -= 30) { gr.moveTo(-40, y).lineTo(-36, y - 4).stroke(pen.line(0x9a8c78, 1, 0.5)); } // rivets
    // the nose
    gr.poly(flat(ROCKET.nose)).fill(pen.fill(PAL.red)).stroke(pen.line(PAL.redLo, 2.4));
    gr.poly([8, -420, 30, -370, 40, -330, 18, -330, 14, -380]).fill(pen.hatch(darken(PAL.red, 0.2), 0.55));
    gr.moveTo(-20, -392).quadraticCurveTo(-26, -360, -30, -340).stroke(pen.line(0xff9a8c, 2.4, 0.6));
    // the round window
    gr.circle(0, -250, 26).fill(pen.fill(0x9a96a2)).stroke(pen.line(0x4a4652, 2));
    gr.circle(0, -250, 19).fill(pen.fill(PAL.glass)).stroke(pen.line(0x355a74, 1.6));
    gr.moveTo(-10, -258).quadraticCurveTo(-6, -264, 2, -265).stroke(pen.line(0xffffff, 3, 0.8));
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; gr.circle(Math.cos(a) * 22.5, -250 + Math.sin(a) * 22.5, 1.4).fill({ color: 0x4a4652 }); }
    // the small gold star on its side
    gr.poly(flat(starPoints(13, 0.44, { seed: 5, crooked: 0.5 }).map(([x, y]) => [x + 18, y - 160]))).fill(pen.fill(PAL.gold)).stroke(pen.line(PAL.goldLo, 1.4));
    solid.addChild(gr);
    // the fin's dent, when it has been rubbed out ("Det är bara ett streck kvar")
    const finDent = g(PIXI);
    dashed(finDent, ROCKET.finL, pen.line(PAL.dent, 2.4, 0.85), { closed: true, dash: 10, gap: 8 });
    finDent.visible = false; view.addChild(finDent);
    // the dashed outline left when the whole rocket is rubbed out
    for (const part of [ROCKET.body, ROCKET.nose, ROCKET.finL, ROCKET.finR, ROCKET.nozzle]) dashed(outline, part, pen.line(PAL.dent, 2.6, 0.85), { closed: true, dash: 12, gap: 9 });
    dashed(outline, Array.from({ length: 25 }, (_, k) => [Math.cos(k / 24 * TAU) * 24, -250 + Math.sin(k / 24 * TAU) * 24]), pen.line(PAL.dent, 2.2, 0.7), { dash: 8, gap: 7 });
    outline.alpha = 0;
    let rubbedNow = -1;
    function drawMask(r) {
        rubbedNow = r;
        if (r <= 0.001) { solid.mask = null; mask.clear(); return; }
        mask.clear();
        // three strokes of the eraser, top, middle and bottom, each sweeping across
        const bands = [[-460, -300], [-300, -120], [-120, 10]];
        bands.forEach(([y0, y1], k) => {
            const u = clamp(r * 3 - k, 0, 1);
            if (u >= 1) return;
            const xFrom = -130 + 260 * u;
            mask.rect(xFrom, y0, 130 - xFrom, y1 - y0).fill(0xffffff);
        });
        mask.rect(-1, -1, 0.5, 0.5).fill(0xffffff); // never an empty mask
        solid.mask = mask;
    }
    function setFlame(texture) {
        if (flameSprite) { flameSprite.destroy(); flameSprite = null; }
        if (!texture) { flameDraw.visible = true; return; }
        flameSprite = new PIXI.Sprite(texture); flameSprite.anchor.set(0.5, 0);
        const k = Math.min(80 / Math.max(1, texture.width), 120 / Math.max(1, texture.height)) * 1.4;
        flameSprite.scale.set(k);
        flameC.addChild(flameSprite);
        flameDraw.visible = false;
    }
    setFlame(flameTexture);
    return {
        view,
        height: 440,
        setFlame,
        /** s = { visible, x, y, flame: 0..1, fin: 'whole'|'gone', rubbed: 0..1, tilt } */
        update(dt, s = {}, t = 0, { reducedMotion = false } = {}) {
            const rm = reducedMotion;
            if (s.visible === false) { view.visible = false; return; }
            view.visible = true;
            if (typeof s.x === 'number') view.position.set(s.x, s.y);
            view.rotation = s.tilt || 0;
            const f = clamp(s.flame || 0, 0, 1);
            flameC.visible = f > 0.01;
            if (flameC.visible) {
                const fl = rm ? 1 : 0.85 + 0.2 * Math.sin(t * 41) + 0.1 * Math.sin(t * 73 + 1);
                flameC.scale.set(0.6 + 0.4 * f, f * fl);
                flameGlow.alpha = f;
            }
            const gone = s.fin === 'gone';
            finL.visible = !gone; finDent.visible = gone && !(s.rubbed > 0.66);
            const r = clamp(s.rubbed || 0, 0, 1);
            if (Math.abs(r - rubbedNow) > 0.004) drawMask(r);
            outline.alpha = clamp(r * 3, 0, 1);
        },
        destroy() { view.destroy({ children: true }); }
    };
}

// ---------------------------------------------------------------------------------------
// A star's lost light: soft, pale gold, no outline (the outline is what was rubbed out).
// ---------------------------------------------------------------------------------------
export function createStarLight(PIXI, pen) {
    // warm gold, laid on rather than added: it reads on the dark sky and on the white page alike
    const view = new PIXI.Container(); view.label = 'star-light';
    const glow = g(PIXI);
    halo(glow, 0, 0, 50, 0xffd970, 0.5, 9);
    const core = g(PIXI);
    halo(core, 0, 0, 16, 0xfff0b0, 0.9, 5);
    core.circle(0, 0, 5.5).fill({ color: 0xfffdf2 });
    const rays = g(PIXI);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3; rays.moveTo(Math.cos(a) * 8, Math.sin(a) * 8).lineTo(Math.cos(a) * 30, Math.sin(a) * 30).stroke({ color: 0xffe9a0, width: 2.6, alpha: 0.4, cap: 'round' }); }
    view.addChild(glow, rays, core);
    const seed = Math.random() * 10;
    void pen;
    return {
        view,
        /** k: 0..1 how bright (1 = found and near); t: time */
        update(dt, t = 0, { k = 1, reducedMotion = false } = {}) {
            const p = reducedMotion ? 0 : Math.sin(t * 2.2 + seed);
            glow.alpha = k * (0.8 + 0.2 * p); glow.scale.set(1 + 0.08 * p);
            core.alpha = 0.6 + 0.4 * k;
            rays.alpha = k * (0.5 + 0.5 * Math.max(0, Math.sin(t * 1.3 + seed)) ** 3);
            rays.rotation = reducedMotion ? 0 : t * 0.15;
        },
        destroy() { view.destroy({ children: true }); }
    };
}

/** Alva's star: five points, freehand, each a little different and a little crooked; pencil (pale) or gold. */
export function createAlvaStar(PIXI, pen, { seed = 1, gold = false, crooked = 1, size = 18, glow = true } = {}) {
    const view = new PIXI.Container(); view.label = 'alva-star';
    const halo1 = g(PIXI);
    if (glow) halo(halo1, 0, 0, size * 2.1, gold ? 0xffd34a : 0xfff0c0, gold ? 0.42 : 0.26, 6);
    const gr = g(PIXI);
    const pts = starPoints(size, 0.43, { seed, crooked });
    if (gold) {
        gr.poly(flat(pts)).fill(pen.fill(PAL.gold)).stroke(pen.line(PAL.goldLo, Math.max(1.2, size * 0.08)));
        gr.poly(flat(shake(pts, size * 0.04, seed + 2))).fill(pen.hatch(PAL.goldHi, 0.55));
    } else gr.poly(flat(pts)).fill({ color: PAL.star, alpha: 0.85 });
    // drawn in one stroke that does not quite meet itself, as a hand does
    const line = [...pts, [pts[0][0] + (pts[1][0] - pts[0][0]) * 0.25, pts[0][1] + (pts[1][1] - pts[0][1]) * 0.25]];
    pathLine(gr, [[pts[9][0] * 0.9 + pts[0][0] * 0.1, pts[9][1] * 0.9 + pts[0][1] * 0.1], ...line]).stroke(pen.line(gold ? PAL.goldLo : PAL.starPencil, Math.max(1.2, size * 0.085), 0.9));
    view.addChild(halo1, gr);
    return {
        view,
        update(dt, t = 0, { k = 1, reducedMotion = false } = {}) {
            halo1.alpha = k * (reducedMotion ? 0.9 : 0.75 + 0.25 * Math.sin(t * 1.8 + seed));
            gr.alpha = 0.4 + 0.6 * k;
        },
        destroy() { view.destroy({ children: true }); }
    };
}
/** A neat "straight" star: a small four-point cross (not Alva's: the difference is a clue). */
export function createPlainStar(PIXI, pen, { size = 8, color = 0xf4f6ff } = {}) {
    const view = new PIXI.Container(); view.label = 'plain-star';
    const gr = g(PIXI);
    gr.moveTo(-size, 0).lineTo(size, 0).moveTo(0, -size).lineTo(0, size).stroke({ color, width: Math.max(1.2, size * 0.2), alpha: 0.95, cap: 'round' });
    gr.circle(0, 0, size * 0.22).fill({ color: 0xffffff });
    view.addChild(gr);
    void pen;
    return { view, update(dt, t = 0, { k = 1 } = {}) { gr.alpha = k; }, destroy() { view.destroy({ children: true }); } };
}

// ---------------------------------------------------------------------------------------
// Kometflingor, and Suddet's crumbs
// ---------------------------------------------------------------------------------------
export function createCerealBox(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'cereal-box';
    const gr = g(PIXI);
    // front and side, standing on the ground (origin under its middle)
    gr.poly([-30, 0, 30, 0, 30, -90, -30, -90]).fill(pen.fill(0x2d3f8c)).stroke(pen.line(0x16204a, 2));
    gr.poly([30, 0, 40, -8, 40, -97, 30, -90]).fill(pen.fill(0x1f2c64)).stroke(pen.line(0x16204a, 1.6));
    gr.poly([-30, -90, 30, -90, 40, -97, -20, -97]).fill(pen.fill(0x3f55a8)).stroke(pen.line(0x16204a, 1.4));
    // the flap, a little open
    gr.poly([-20, -97, 40, -97, 34, -110, -26, -106]).fill(pen.fill(0x4f66b8)).stroke(pen.line(0x16204a, 1.4));
    // a comet across the front, and a band of gold with the name scribbled on it
    gr.poly([-26, -78, 26, -78, 26, -64, -26, -64]).fill(pen.fill(0xe9b949)).stroke(pen.line(0x8a6a28, 1.2));
    for (let k = 0; k < 6; k++) gr.moveTo(-22 + k * 8, -71).lineTo(-17 + k * 8, -71 + (k % 2 ? -3 : 3)).stroke(pen.line(0x5a3c10, 1.6));
    gr.moveTo(-24, -24).lineTo(4, -50).stroke(pen.line(0xfff3c4, 6, 0.85));
    gr.circle(8, -52, 9).fill(pen.fill(0xdff4ff)).stroke(pen.line(0x3a6a8a, 1.4));
    // a bowl with flakes
    gr.moveTo(-22, -22).quadraticCurveTo(-2, 2, 22, -22).closePath().fill(pen.fill(0xf3ece0)).stroke(pen.line(0x6a5f52, 1.4));
    for (let k = 0; k < 6; k++) gr.circle(-14 + k * 5.6, -24 - (k % 2) * 3, 3).fill(pen.fill(0xf0c060)).stroke(pen.line(0x9a6a20, 0.8));
    for (const [x, y] of [[-20, -40], [20, -36], [-18, -84]]) crossStar(gr, pen, 4, 0xfff6c8, 1, x, y);
    view.addChild(gr);
    return { view, update() {}, destroy() { view.destroy({ children: true }); } };
}
export function createCrumbs(PIXI, pen, { n = 12, spread = 60, seed = 3 } = {}) {
    const view = new PIXI.Container(); view.label = 'crumbs';
    const gr = g(PIXI);
    for (let i = 0; i < n; i++) {
        const x = (hash(i, seed) - 0.5) * spread, y = -hash(i, seed + 1) * spread * 0.12 - 2, r = 2.4 + hash(i, seed + 2) * 3.2, a = hash(i, seed + 3) * TAU;
        // (each arc starts its own line: an arc joins on to wherever the pen last was)
        gr.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r).arc(x, y, r, a, a + 3.6 + hash(i, seed + 4) * 1.6).stroke(pen.line(PAL.crumb, 2.2 + r * 0.35));
        gr.moveTo(x + Math.cos(a + 0.4) * r, y + Math.sin(a + 0.4) * r).arc(x, y, r, a + 0.4, a + 2).stroke(pen.line(PAL.crumbLo, 1, 0.7));
    }
    view.addChild(gr);
    return { view, update() {}, destroy() { view.destroy({ children: true }); } };
}

// ---------------------------------------------------------------------------------------
// Mira's moon, close up: pale yellow pencil, grey craters. Radius 100 (scale it). Its three bites (16.1): a
// notch in the rim upper right, a round hole upper left, a long jagged gash below. Each is rubbed for its own
// reason; together they read as a face only by accident of placement. With its light out the yellow goes
// grey-dark and the holes stay white. `threads` (a child the caller may move) holds the yellow running out.
// ---------------------------------------------------------------------------------------
const MOON_BITES = [
    { kind: 'notch', x: 76, y: -64, r: 34 },
    { kind: 'hole', x: -36, y: -30, r: 21 },
    { kind: 'gash' }
];
const GASH = (() => {
    const top = [], bot = [];
    for (let i = 0; i <= 13; i++) {
        // long and low, its ends turned a little down; torn, not cut (no regular teeth)
        const u = i / 13, x = -58 + 116 * u + (hash(i, 152) - 0.5) * 6, mid = 44 - 9 * Math.sin(u * Math.PI);
        const open = Math.sin(u * Math.PI) ** 0.6;
        top.push([x, mid - 2 - open * 7 - hash(i, 150) * 6 * open]);
        bot.push([x + (hash(i, 153) - 0.5) * 5, mid + 3 + open * 8 + hash(i, 151) * 7 * open]);
    }
    return [...top, ...bot.reverse()];
})();
export function createSkyMoon(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'sky-moon';
    const glow = g(PIXI); halo(glow, 0, 0, 190, 0xfff3c0, 0.28, 9); glow.blendMode = 'add';
    const disk = g(PIXI);
    disk.circle(0, 0, 100).fill(pen.fill(PAL.moon));
    disk.circle(0, 0, 100).fill(pen.hatch(darken(PAL.moon, 0.05), 0.6));
    disk.ellipse(-30, -34, 48, 34).fill({ color: PAL.moonHi, alpha: 0.5 });
    // grey craters (one by the gash is the night side's face crater's cousin)
    for (const [x, y, r] of [[-52, 24, 13], [30, -14, 10], [-14, -64, 9], [58, 38, 15], [6, 70, 8], [-74, -22, 7], [28, 70, 6], [-30, 62, 10]]) {
        disk.circle(x, y, r).fill(pen.fill(PAL.crater, 0.75));
        // (each arc starts its own line: an arc joins on to wherever the pen last was)
        disk.moveTo(x + Math.cos(Math.PI * 0.9) * r, y + Math.sin(Math.PI * 0.9) * r).arc(x, y, r, Math.PI * 0.9, Math.PI * 1.9).stroke(pen.line(darken(PAL.crater, 0.3), 1.6, 0.7));
        disk.moveTo(x + 1 + Math.cos(0.1) * r * 0.8, y + 1 + Math.sin(0.1) * r * 0.8).arc(x + 1, y + 1, r * 0.8, 0.1, Math.PI * 0.8).stroke(pen.line(0xfff6d6, 1.4, 0.6));
    }
    disk.circle(0, 0, 100).stroke(pen.line(PAL.moonInk, 2.6, 0.9));
    const dark = g(PIXI); dark.circle(0, 0, 101).fill({ color: 0x24202f }); dark.alpha = 0;
    const bitesC = new PIXI.Container();
    const clip = g(PIXI); clip.circle(0, 0, 99).fill(0xffffff);
    bitesC.mask = clip;
    const bites = MOON_BITES.map((b, i) => {
        const gr = g(PIXI);
        const pts = b.kind === 'gash' ? GASH : blob(b.x, b.y, b.r, b.r * (b.kind === 'notch' ? 0.95 : 1.05), { seed: 160 + i, amp: 0.12 });
        // grey smudges round the rubbed place, then the white paper itself
        gr.poly(flat(shake(pts, 6, 170 + i))).fill({ color: 0x8f8a99, alpha: 0.35 });
        gr.poly(flat(pts)).fill({ color: PAPER });
        gr.poly(flat(pts)).fill(pen.fill(0xefe9dc, 0.4));
        for (let k = 0; k < 5; k++) gr.circle(pts[k * 3 % pts.length][0] + (hash(k, i) - 0.5) * 10, pts[k * 3 % pts.length][1] + (hash(k, i + 1) - 0.5) * 8, 1.6).fill({ color: PAL.crumb, alpha: 0.8 });
        gr.visible = false;
        bitesC.addChild(gr);
        return { gr, b, pts };
    });
    const rim = g(PIXI); rim.circle(0, 0, 100).stroke(pen.line(0x6a6252, 2, 0.6)); rim.alpha = 0;
    const threads = new PIXI.Container(); threads.label = 'moon-threads';
    const threadG = g(PIXI); threads.addChild(threadG);
    view.addChild(glow, disk, dark, clip, bitesC, rim, threads);
    const sources = [[60, -44], [-36, -12], [-30, 46], [0, 40], [32, 46]];
    const SOURCE_BITE = [0, 1, 2, 2, 2];
    return {
        view, threads, radius: 100,
        /** The middle of each bite (local), for crumbs or a camera. */
        biteAt: (i) => (i === 2 ? { x: 0, y: 36 } : { x: MOON_BITES[i].x * (i === 0 ? 0.8 : 1), y: MOON_BITES[i].y * (i === 0 ? 0.8 : 1) }),
        /** opts = { bites: 0..3, lit: 0..1, drain: 0..1, reducedMotion } (the threads redraw each frame while draining) */
        update(dt, t = 0, { bites: nb = 0, lit = 1, drain = 0, reducedMotion = false } = {}) {
            bites.forEach((b, i) => { b.gr.visible = i < nb; });
            dark.alpha = (1 - clamp(lit, 0, 1)) * 0.84;
            glow.alpha = clamp(lit, 0, 1) * (reducedMotion ? 0.9 : 0.85 + 0.15 * Math.sin(t * 0.8));
            rim.alpha = 1 - lit;
            threadG.clear();
            if (drain > 0.01) {
                for (const [k, [sx, sy]] of sources.entries()) {
                    if (nb <= SOURCE_BITE[k]) continue; // only from a hole that is there
                    const len = (60 + hash(k, 180) * 110) * drain, ph = reducedMotion ? k : t * 0.6 + k * 1.7;
                    const pts = [];
                    for (let j = 0; j <= 14; j++) { const u = j / 14; pts.push([sx + Math.sin(u * 5 + ph) * 6 * u, sy + u * len]); }
                    for (let j = 1; j < pts.length; j++) {
                        const a = (1 - j / pts.length) * 0.95;
                        threadG.moveTo(pts[j - 1][0], pts[j - 1][1]).lineTo(pts[j][0], pts[j][1]).stroke({ color: 0xf6dc74, width: 5 - j * 0.25, alpha: a, cap: 'round' });
                    }
                    const dy = reducedMotion ? 0.5 : (t * 0.4 + k * 0.23) % 1;
                    threadG.circle(sx + Math.sin(ph) * 3, sy + len * (0.3 + dy * 0.7), 2.6).fill({ color: 0xffe68a, alpha: 0.8 * (1 - dy) });
                }
            }
        },
        destroy() { view.destroy({ children: true }); }
    };
}

// ---------------------------------------------------------------------------------------
// The dents of things rubbed out (Blyertsdimman): faint dashed grey outlines in the paper, grey smears round
// them. Origin: the ground under the middle.
// ---------------------------------------------------------------------------------------
export function createDent(PIXI, pen, kind = 'star') {
    const view = new PIXI.Container(); view.label = 'dent-' + kind;
    const gr = g(PIXI);
    const st = pen.line(PAL.dent, 2.6, 0.8), fine = pen.line(PAL.dent, 1.8, 0.6);
    const smear = (x, y, rx, ry, s) => gr.poly(flat(blob(x, y, rx, ry, { seed: s, amp: 0.25 }))).fill({ color: 0x9d99a6, alpha: 0.1 });
    if (kind === 'house') {
        smear(0, -70, 110, 70, 1); smear(-20, -150, 80, 30, 2);
        dashed(gr, [[-80, 0], [-80, -120], [80, -120], [80, 0], [-80, 0]], st);
        dashed(gr, [[-22, 0], [-22, -62], [18, -62], [18, 0]], fine);
        dashed(gr, [[34, -94], [64, -94], [64, -66], [34, -66], [34, -94]], fine);
        // where the roof was: two short stubs, and then nothing
        dashed(gr, [[-80, -120], [-62, -138]], fine); dashed(gr, [[80, -120], [64, -136]], fine);
        dashed(gr, [[40, -126], [40, -150], [54, -150], [54, -132]], fine); // a chimney with no roof under it
    } else if (kind === 'dragon') {
        smear(-10, -80, 150, 60, 3); smear(10, -190, 80, 60, 4);
        // a plump body
        dashed(gr, [[-100, -64], [-80, -98], [-30, -116], [30, -114], [70, -100], [92, -76], [80, -50], [30, -38], [-40, -38], [-86, -46]], st, { closed: true });
        // the tail, curling back and up to a spade
        dashed(gr, [[-100, -64], [-146, -58], [-182, -72], [-202, -104], [-196, -132]], st);
        dashed(gr, [[-196, -132], [-212, -150], [-188, -160], [-182, -138], [-196, -132]], fine);
        // a bat's wing from its back: long bones out to a point, the skin between them scalloped
        // swept back over the body: up to the wrist, out to the tip, and a scalloped edge back to the body
        const wing = [[-6, -114], [-30, -180], [-66, -212], [-150, -200], [-120, -172], [-112, -140], [-92, -154], [-84, -122], [-66, -136], [-56, -110]];
        dashed(gr, wing, st);
        for (const [x, y] of [[-120, -172], [-92, -154], [-66, -136]]) dashed(gr, [[-66, -212], [x, y]], fine, { dash: 8, gap: 8 });
        // four short legs with claws
        for (const x of [-62, -28, 28, 62]) dashed(gr, [[x, -40], [x - 4, -8], [x + 12, 0]], fine);
        // the neck rising to the front … cut off where the head should be
        dashed(gr, [[70, -100], [100, -138], [116, -172], [118, -196]], st);
        dashed(gr, [[92, -76], [124, -112], [142, -150], [148, -186]], st);
        dashed(gr, [[112, -200], [154, -190]], fine, { dash: 5, gap: 5 });
        gr.poly(flat(blob(134, -206, 26, 14, { seed: 5, amp: 0.3 }))).fill({ color: 0x9d99a6, alpha: 0.22 });
    } else if (kind === 'firstHorse') {
        // Alva's first sköldhäst: a horse in front, a shell behind … and the wrong legs
        smear(0, -80, 120, 70, 6);
        dashed(gr, [[-80, -80], [-70, -128], [-20, -150], [40, -138], [70, -100], [60, -70], [0, -62], [-60, -64]], st, { closed: true }); // the shell
        for (let k = 0; k < 3; k++) dashed(gr, [[-50 + k * 32, -70], [-40 + k * 32, -130]], fine);
        dashed(gr, [[60, -96], [88, -140], [104, -170], [128, -176], [142, -158], [130, -142], [108, -134], [86, -96]], st); // neck and head
        dashed(gr, [[96, -166], [84, -150], [78, -128], [74, -110]], fine); // the mane
        gr.circle(124, -164, 3).stroke(fine);
        // five legs, the front two bent the wrong way, one of them short
        dashed(gr, [[70, -72], [92, -40], [72, 0]], st);
        dashed(gr, [[44, -64], [62, -34], [40, -8]], st);
        dashed(gr, [[-10, -62], [-14, 0]], st);
        dashed(gr, [[-44, -64], [-30, -28], [-50, 0]], st);
        dashed(gr, [[-70, -70], [-96, -30]], st);
        dashed(gr, [[-80, -84], [-110, -96], [-118, -80]], fine); // a tail
    } else {
        smear(0, 0, 40, 36, 7);
        dashed(gr, starPoints(30, 0.43, { seed: 9, crooked: 1 }), st, { closed: true, dash: 8, gap: 6 });
    }
    view.addChild(gr);
    return { view, update(dt, t = 0, { k = 1 } = {}) { gr.alpha = k; }, destroy() { view.destroy({ children: true }); } };
}

// ---------------------------------------------------------------------------------------
// Stora björnen: a constellation, a huge bear of stars and thin lines over a faint, kind silhouette. In world
// coordinates from the caller. When he stands, every star but his feet rises; while he breathes in his sleep,
// the stars of his back rise and fall (the lines and silhouette redraw while either is under way).
// ---------------------------------------------------------------------------------------
function hull(points) {
    const P = points.map(p => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return P;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const p of P) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop(); lower.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop(); upper.push(p); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function chaikin(pts, n = 3) {
    let P = pts;
    for (let k = 0; k < n; k++) {
        const out = [];
        for (let i = 0; i < P.length; i++) {
            const a = P[i], b = P[(i + 1) % P.length];
            out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
        }
        P = out;
    }
    return P;
}
export function constellationLine(gr, pen, pts, { dashed: isDashed = false, ink = PAL.bearLine, width = 4, alpha = 0.9 } = {}) {
    if (!pts || pts.length < 2) return gr;
    if (isDashed) {
        pathLine(gr, pts).stroke({ color: PAL.dash, width: width * 5, alpha: 0.08, cap: 'round', join: 'round' });
        dashed(gr, pts, pen.line(PAL.dash, width * 1.15, 0.85), { dash: 16, gap: 12 });
        return gr;
    }
    pathLine(gr, pts).stroke({ color: ink, width: width * 4.5, alpha: 0.1 * alpha, cap: 'round', join: 'round' });
    pathLine(gr, pts).stroke({ color: ink, width: width * 2, alpha: 0.18 * alpha, cap: 'round', join: 'round' });
    pathLine(gr, pts).stroke(pen.line(ink, width, alpha));
    return gr;
}
export function createBearFigure(PIXI, pen, { stars = [], lines = [], nose = null, legs = [], eye = null, rise = null } = {}) {
    const view = new PIXI.Container(); view.label = 'bear';
    const sil = g(PIXI), linesG = g(PIXI), noseG = g(PIXI);
    const starC = new PIXI.Container();
    const eyeG = g(PIXI);
    view.addChild(sil, linesG, noseG, starC, eyeG);
    const feet = new Set(legs);
    const ys = stars.map(s => s[1]);
    const height = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
    const R = rise ?? Math.max(200, height * 0.6);
    // each leg as a chain hip → knee → foot, read from the lines: the knee is the star joined to a foot, the hip the
    // star joined to that knee. Standing up, the body lifts, the knees rise about half way, the feet stay: a bear
    // standing up on four legs, not a constellation on stilts (12 November)
    const nb = (i) => lines.filter(([a, b]) => a === i || b === i).map(([a, b]) => (a === i ? b : a));
    const chains = legs.map(f => {
        const k = nb(f).find(j => !feet.has(j));
        const hip = k === undefined ? undefined : nb(k).find(j => j !== f && !feet.has(j) && !legs.includes(j) && nb(j).length > 1);
        return { f, k, hip };
    }).filter(c => c.k !== undefined);
    const knees = new Set(chains.map(c => c.k));
    const body = stars.map((_, i) => i).filter(i => !feet.has(i) && !knees.has(i));
    // the belly (a body star joined to two knees) rises less: standing, the body is deep and the legs short, as a bear's
    const bellies = new Set(body.filter(i => nb(i).filter(j => knees.has(j)).length >= 2));
    const starG = stars.map(([x, y], i) => {
        const c = new PIXI.Container(); c.position.set(x, y);
        const h = g(PIXI); halo(h, 0, 0, 30, 0xdfe6ff, 0.36, 5); h.blendMode = 'add';
        const s = g(PIXI); crossStar(s, pen, 13 + hash(i, 190) * 6, PAL.starWhite); s.circle(0, 0, 3.6).fill({ color: 0xffffff });
        c.addChild(h, s); starC.addChild(c);
        return { c, h, x, y, o: hash(i, 191) * TAU };
    });
    let drawn = null;
    function at(i, standing, breathY) {
        const s = starG[i];
        if (!s) return [0, 0];
        if (feet.has(i)) return [s.x, s.y];
        // a knee rises half as far as the body, and moves a little under it (the leg straightens)
        if (knees.has(i)) {
            const ch = chains.find(c => c.k === i), hp = ch.hip !== undefined ? starG[ch.hip] : null, ft = starG[ch.f];
            const kx = s.x + (hp && ft ? ((hp.x + ft.x) / 2 - s.x) * 0.5 * standing : 0);
            return [kx, s.y - standing * R * 0.5 + breathY * 0.5];
        }
        if (bellies.has(i)) return [s.x, s.y - standing * R * 0.55 + breathY];
        return [s.x, s.y - standing * R + breathY];
    }
    function legStroke(P, ch, width, color, alpha) {
        const pts = [ch.hip !== undefined ? P[ch.hip] : null, P[ch.k], P[ch.f]].filter(Boolean);
        if (pts.length < 2) return;
        // a bear's leg: a heavy thigh at the hip, thick to the knee, tapering to a paw
        // (the thigh sits a third of the way down to the knee: at the hip itself it bulged over his back)
        if (pts.length === 3) sil.ellipse(lerp(pts[0][0], pts[1][0], 0.38), lerp(pts[0][1], pts[1][1], 0.38), width * 0.62, width * 0.7).fill({ color, alpha });
        for (let i = 1; i < pts.length; i++) {
            const w = width * (pts.length === 3 && i === 1 ? 1 : 0.76);
            sil.moveTo(pts[i - 1][0], pts[i - 1][1]).lineTo(pts[i][0], pts[i][1]).stroke({ color, width: w, alpha, cap: 'round', join: 'round' });
        }
        const [fx, fy] = pts.at(-1);
        sil.ellipse(fx + width * 0.12, fy - width * 0.05, width * 0.5, width * 0.28).fill({ color, alpha });
    }
    function redraw(standing, breathY, awake, noseOn) {
        drawn = { standing, breathY, awake, noseOn };
        const P = starG.map((_, i) => at(i, standing, breathY));
        sil.clear(); linesG.clear(); noseG.clear();
        const BP = body.map(i => P[i]);
        if (BP.length >= 3) {
            const cx = BP.reduce((a, p) => a + p[0], 0) / BP.length, cy = BP.reduce((a, p) => a + p[1], 0) / BP.length;
            const H = hull(BP);
            const fill = (a) => ({ color: PAL.bear, alpha: a * (0.8 + awake * 0.6) });
            // the legs first, under the body: soft and thick, in layers like the body
            for (const [wk, a] of [[1.0, 0.06], [0.72, 0.08], [0.48, 0.1]]) for (const ch of chains) legStroke(P, ch, 370 * wk, PAL.bear, a * (0.8 + awake * 0.6));
            for (const [pad, a] of [[150, 0.06], [105, 0.08], [64, 0.1]]) {
                const out = chaikin(H.map(([x, y]) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1; return [x + dx / d * pad, y + dy / d * pad]; }), 3);
                sil.poly(flat(out)).fill(fill(a));
            }
            // a round head where his eye is, an ear above it, and a snout along the nose
            if (eye) {
                const hx = eye[0] - 40, hy = eye[1] - standing * R + breathY;
                for (const [r, a] of [[190, 0.06], [150, 0.08], [112, 0.1]]) sil.circle(hx, hy, r).fill(fill(a));
                for (const [r, a] of [[70, 0.08], [48, 0.1]]) sil.circle(hx - 60, hy - 150, r).fill(fill(a));
                if (nose) {
                    const [ax, ay] = P[nose[0]], [bx, by] = P[nose[1]], mx = (ax + bx) / 2, my = (ay + by) / 2;
                    const len = Math.hypot(bx - ax, by - ay), rot = Math.atan2(by - ay, bx - ax);
                    for (const [k, a] of [[1, 0.06], [0.78, 0.08], [0.58, 0.1]]) {
                        const pts = []; for (let q = 0; q < 24; q++) { const u = q / 24 * TAU, ex = Math.cos(u) * len * 0.56 * k, ey = Math.sin(u) * 95 * k; pts.push(mx + ex * Math.cos(rot) - ey * Math.sin(rot), my + ex * Math.sin(rot) + ey * Math.cos(rot) + 24); }
                        sil.poly(pts).fill(fill(a));
                    }
                }
            }
            // a soft fur edge in pencil, round the body and down each leg
            const fur = chaikin(H.map(([x, y]) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1; return [x + dx / d * 70, y + dy / d * 70]; }), 3);
            for (let i = 0; i < fur.length; i += 3) {
                const [x, y] = fur[i], dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
                sil.moveTo(x, y).lineTo(x + dx / d * 14 + (hash(i, 192) - 0.5) * 8, y + dy / d * 14).stroke({ color: 0x8fa2e8, width: 1.6, alpha: 0.18 + awake * 0.12, cap: 'round' });
            }
            for (const ch of chains) {
                const a = ch.hip !== undefined ? P[ch.hip] : P[ch.k], b = P[ch.f];
                for (let k = 1; k < 6; k++) {
                    const u = k / 6, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
                    for (const side of [-1, 1]) sil.moveTo(x + side * 104 * (1 - u * 0.25), y).lineTo(x + side * 120 * (1 - u * 0.25), y + 10).stroke({ color: 0x8fa2e8, width: 1.4, alpha: 0.14 + awake * 0.1, cap: 'round' });
                }
            }
        }
        for (const [i, j] of lines) constellationLine(linesG, pen, [P[i], P[j]], { width: 3.2, alpha: 0.55 + awake * 0.4 });
        if (nose) constellationLine(noseG, pen, [P[nose[0]], P[nose[1]]], { dashed: !noseOn, width: 3.2, alpha: 0.6 + awake * 0.4 });
        starG.forEach((s, i) => { s.c.position.set(P[i][0], P[i][1]); });
        eyeG.clear();
        if (eye) {
            const [ex, ey] = [eye[0], eye[1] - standing * R + breathY];
            if (awake > 0.5) {
                eyeG.circle(ex, ey, 15).fill({ color: 0xeef2ff, alpha: 0.9 }).stroke(pen.line(0x9aa8e0, 2));
                eyeG.circle(ex + 3, ey + 1, 6).fill({ color: 0x1a2040 });
                eyeG.circle(ex + 1, ey - 2, 2).fill({ color: 0xffffff });
            } else eyeG.moveTo(ex - 14, ey).quadraticCurveTo(ex, ey + 9, ex + 14, ey).stroke(pen.line(0xcfd8ff, 3, 0.8));
        }
    }
    let standNow = 0, awakeNow = 0;
    return {
        view,
        /** Where star i is now (world units), as he stands or breathes. */
        starAt: (i) => (drawn ? at(i, drawn.standing, drawn.breathY) : stars[i]),
        /** s = { awake: 0..1, nose: bool, standing: 0..1, breath: 0..1 } */
        update(dt, s = {}, t = 0, { reducedMotion = false } = {}) {
            dt = Math.min(dt, 0.1);
            standNow = reducedMotion ? (s.standing || 0) : damp(standNow, s.standing || 0, 6, dt);
            awakeNow = damp(awakeNow, s.awake || 0, 3, dt);
            const breathY = reducedMotion ? 0 : Math.sin(t * 0.9) * 10 * (s.breath ?? (s.awake ? 0 : 0.6));
            const q = (v) => Math.round(v * 200) / 200;
            const want = { standing: q(standNow), breathY: Math.round(breathY), awake: q(awakeNow), noseOn: !!s.nose };
            if (!drawn || drawn.standing !== want.standing || drawn.breathY !== want.breathY || Math.abs(drawn.awake - want.awake) > 0.04 || drawn.noseOn !== want.noseOn) redraw(want.standing, want.breathY, want.awake, want.noseOn);
            for (const st of starG) {
                st.h.alpha = (0.55 + 0.45 * awakeNow) * (reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 1.7 + st.o));
            }
        },
        destroy() { view.destroy({ children: true }); }
    };
}

export { clamp, damp, hash, dashed as dashedPath, starPoints };
