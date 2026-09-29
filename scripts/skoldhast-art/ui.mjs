/*
 * DOM interface art for "Sköldhästen och havet mellan sidorna" (SPEC §4):
 * api.image(), bundle boot, drawn at 2× CSS size (scale 2), transparent where
 * it is not a surface.
 *
 *   ui-title       the title "Sköldhästen" in Alva's own letterforms (traced from
 *                  her "SKÖLD häst" label, drawn as coloured-in pencil letters:
 *                  SKÖLD green like the shell, häst orange like the mane) over a
 *                  strip of her sea carrying "och havet mellan sidorna"
 *   ui-paper       512×512 seamless light paper for panels
 *   ui-claw        Klo's claw doodle (margin notes)
 *   ui-journal     the Forskningsdagbok button
 *   ui-pause       two pencil strokes
 *   ui-hint-mark   a small wiggly pencil mark
 *   ui-stick-base, ui-stick-knob   the floating stick
 *   ui-btn         a round pencil-drawn button ring (also the HUD buttons)
 *
 * The menus' notebook pieces (skoldhast.css):
 *   ui-frame, ui-frame-sm   pencil boxes drawn with four crossing strokes, for
 *                  CSS border-image nine-slices (cards, buttons, the map)
 *   ui-hatch       seamless colored-pencil hatching as an alpha mask: CSS gives
 *                  it any color (button fills, tabs, the cover's cloth)
 *   ui-tape        a strip of masking tape
 *   ui-grunge      seamless rubber-stamp ink texture (alpha mask) for the stamp
 *   ui-icons       7 × 4 drawn icons in 64 px cells, in ICONS order: the journal's
 *                  tabs, the check and box of the settings, arrows, the camera,
 *                  margin doodles (gulls, a wave, the sun, kelp, a cloud, a fish)
 *                  and the ✕ that closes a panel
 */
import * as pencil from './pencil.mjs';
import {
    NPC_PENCILS as N, HAND, LABEL, writeWord, drawHand, paperOver, outlineMask, strokeMask, taperMask,
    line, halo, reserve, pincerPts, kloPaint, part
} from './npcs.mjs';

const { Sheet, PENCILS: P, smooth, ellipse, transform, edgeBand, hashSeed, multiplyMasks, subtractMask,
    unionMasks, gradientMap, boxBlur } = pencil;

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

function sheet(name, w, h, opts = {}) {
    return new Sheet(w, h, { paper: false, seed: hashSeed(name), ...opts });
}

// ---------------------------------------------------------------------------
// ui-title
// ---------------------------------------------------------------------------
/**
 * Bubble letters: her letter skeletons stroked wide, coloured in with pencil,
 * a hatched drop shadow and a graphite contour, like a title on a school poster.
 */
/** Her ä and t with the bar kept over their own letter, so fat letters don't run together. */
function titleGlyphs() {
    const a = HAND.a;
    const aw = a.x1;
    const ae = { strokes: [...a.strokes, [[aw * 0.2, -26.5], [aw * 0.5, -27], [aw * 0.8, -27.4]]], x0: 0, x1: aw };
    const t = HAND.t;
    const [stem, bar] = t.strokes;
    const tt = { strokes: [stem, bar.filter(([x]) => x > 3.2)], x0: 0, x1: t.x1 };
    return { 'ä': ae, t: tt };
}

function drawTitle(sh) {
    const W = sh.w;
    const word = writeWord('Sköldhästen', { gap: 7.4, wander: 1.4, seed: 11, glyphs: titleGlyphs() });
    const k = 4.6;                     // px per label px
    const rot = -0.075;                // rising gently to the right, like her label
    const ox = W / 2 - (word.width * k) / 2 * Math.cos(rot) + 6, oy = 282;
    const place = ([x, y]) => {
        const c = Math.cos(rot), s = Math.sin(rot);
        return [ox + (x * c - y * s) * k, oy + (x * s + y * c) * k];
    };
    const bubble = 5.3 * k;            // the letter body width
    const groups = [
        { letters: word.letters.slice(0, 5), base: P.shellLight, mid: P.shellGreen, deep: P.shellDark },
        { letters: word.letters.slice(5), base: P.maneLight, mid: P.mane, deep: P.maneDark }
    ];
    const bodyOf = (letters) => unionMasks(...letters.flatMap((L) => L.strokes.map((st) => {
        const pts = smooth(st.map(place), { closed: false, steps: 5 });
        return pts.length > 1 ? strokeMask(sh, pts, bubble) : strokeMask(sh, [pts[0], [pts[0][0] + 0.1, pts[0][1]]], bubble);
    })));
    const masks = groups.map((g) => bodyOf(g.letters));
    const all = unionMasks(...masks);
    // the 3D shadow: the letters shifted down-right, hatched in blue-grey
    const { w, h } = sh;
    const shadow = new Float32Array(w * h);
    const dx = 9, dy = 11;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = 0;
        for (let t = 0.25; t <= 1; t += 0.25) {
            const sx = Math.round(x - dx * t), sy = Math.round(y - dy * t);
            if (sx >= 0 && sy >= 0 && sx < w && sy < h) v = Math.max(v, all[sy * w + sx]);
        }
        shadow[y * w + x] = v;
    }
    const shOnly = subtractMask(shadow, all);
    sh.cutout(shOnly);
    sh.fill(P.skyBlue, shOnly, { pressure: 0.8, grain: 0.3 });
    sh.hatch(P.foamLine, { angle: -0.8, gap: 3.4, len: [6, 16], width: 1.6, clip: shOnly, pressure: 0.8 });
    sh.burnish(shOnly, 1, 0.5);
    outlineMask(sh, shadow, P.graphite, { width: 2.4, wobble: 0.6 });
    // the letters, coloured in
    groups.forEach((g, gi) => {
        const m = masks[gi];
        paperOver(sh, m); sh.cutout(m);
        sh.fill(g.base, m, { pressure: 0.8, grain: 0.35 });
        sh.hatch(g.mid, { angle: -0.75, gap: 1.9, len: [8, 22], width: 1.8, clip: m, pressure: 1, layers: 2, crossAngle: 1.1 });
        sh.burnish(m, 3, 0.85);
        sh.hatch(g.mid, { angle: -0.75, gap: 4.5, len: [10, 26], width: 1.6, clip: m, pressure: 0.8 });
        const band = edgeBand(m, w, h, 12);
        sh.hatch(g.deep, { angle: -0.5, gap: 2, len: [6, 14], width: 1.6, clip: band, pressure: 0.85 });
    });
    // shiny glints: a short paper-white stroke on each letter's first stroke
    for (const L of word.letters) {
        const st = L.strokes[0];
        if (st.length < 4) continue;
        const i0 = Math.floor(st.length * 0.18), i1 = Math.floor(st.length * 0.42);
        const pts = st.slice(i0, i1 + 1).map(([x, y]) => place([x - 1.3, y - 1.1]));
        if (pts.length < 2) continue;
        const gm = multiplyMasks(strokeMask(sh, pts, 5.5), all);
        paperOver(sh, gm.map((v) => v * 0.85));
    }
    outlineMask(sh, all, P.graphite, { width: 3.4, wobble: 0.7 });
    // her little inner lines: the skeleton drawn faintly, like a pencil guide left behind
    return { place, k };
}

/** The subtitle on a strip of her sea; the strip's top edge is her wavy underline. */
function drawSubtitleBand(sh) {
    const W = sh.w;
    const U = LABEL.U[0];
    const ux0 = U[0][0], ux1 = U[U.length - 1][0];
    // her underline, stretched across the band's width, rising gently like hers
    const top = U.map(([x, y]) => [lerp(90, W - 70, (x - ux0) / (ux1 - ux0)), 356 + (y - 470) * 0.95]);
    const bottomY = (x) => 458 + 12 * Math.sin(x * 0.011 + 0.6) - (x / W) * 22;
    const band = [...top, ...top.slice().reverse().map(([x]) => [x, bottomY(x)])];
    const bm = sh.mask(smooth(band, { closed: true, steps: 3 }));
    sh.cutout(bm.map((v) => v * 0.94));
    // horizontal blue strokes like her sea, lighter toward the top
    const gy0 = 330, gy1 = 480;
    sh.fill(P.skyBlue, bm, { pressure: 0.8, grain: 0.2, opaque: true });
    sh.hatch(P.seaBlue, { angle: 0.02, gap: 3, len: [20, 60], width: 1.7, clip: bm, pmap: gradientMap(sh.w, sh.h, 0, gy0, 0, gy1, 0.15, 0.75), opaque: true });
    sh.burnish(bm, 3, 0.9);
    sh.hatch(P.seaBlue, { angle: 0.01, gap: 7, len: [30, 90], width: 1.5, clip: bm, pmap: gradientMap(sh.w, sh.h, 0, gy0, 0, gy1, 0.1, 0.6), opaque: true });
    // the waterline on top: her underline in dark blue pencil
    line(sh, smooth(top, { closed: false, steps: 3 }), P.foamLine, { width: 4.2, wobble: 0.5, passes: 2 });
    // the ragged lower edge, softly
    line(sh, band.slice(top.length).map(([x, y]) => [x, y]), P.seaBlue, { width: 1.6, alpha: 0.6, passes: 1 });
    // the words, in her lowercase hand, in dark graphite
    const sub = writeWord('och havet mellan sidorna', { gap: 3.4, wander: 1.1, seed: 5, map: { s: 'sm' } });
    const k = 2.35, rot = -0.035;
    const ox = W / 2 - (sub.width * k) / 2, oy = 432;
    const place = ([x, y]) => {
        const c = Math.cos(rot), s = Math.sin(rot);
        return [ox + (x * c - y * s) * k, oy + (x * s + y * c) * k];
    };
    // a soft paper halo behind the words so they read on the blue
    const words = unionMasks(...sub.letters.flatMap((L) => L.strokes.map((st) => strokeMask(sh, smooth(st.map(place), { closed: false, steps: 4 }), 15))));
    paperOver(sh, boxBlur(words, sh.w, sh.h, 3).map((v) => Math.min(1, v * 1.1) * 0.62));
    drawHand(sh, sub.letters.flatMap((L) => L.strokes), place, { width: 5.4, pressure: 1.35, color: P.graphite });
}

// ---------------------------------------------------------------------------
// the small UI images
// ---------------------------------------------------------------------------
function drawPaper(sh) {
    // light paper with tooth only, seamless (the Sheet is tiled)
    sh.hatch(P.coatShade, { angle: -0.35, gap: 3.2, len: [14, 40], width: 1.2, pressure: 0.1, alpha: [0.3, 0.6] });
    sh.hatch(P.sand, { angle: 0.9, gap: 4, len: [10, 30], width: 1.2, pressure: 0.07, alpha: [0.3, 0.6] });
}

function drawClaw(sh) {
    // Klo's pincer, doodled: a round claw with its notch, a stub of arm
    const S = 1;
    sh.S = S; sh.ox = 0; sh.oy = 0;
    sh.T = (pts) => pts; sh.pt = (p) => p;
    const c = [36.5, 27];
    const arm = taperMask(sh, [[7, 59], [17, 47], [27, 37]], 12, 11);
    kloPaint(sh, arm, 0.9, { rimW: 2, line: 2 });
    const pm = sh.mask(smooth(pincerPts(c, -0.72, 0.55, 2.35), { closed: true, steps: 3 }));
    kloPaint(sh, pm, 0.2, { rimW: 3, line: 2.3 });
}

function drawJournal(sh) {
    const T = (pts) => transform(pts, { x: 48, y: 50, rot: -0.12 });
    // pages peeking out, then the cover
    const pages = T([[-27, -35], [29, -35], [31, 37], [-25, 37]]);
    const pm = sh.mask(pages);
    reserve(sh, pm);
    for (let i = 0; i < 4; i++) line(sh, T([[31 - i * 0.3, -30 + i * 18], [31.5 - i * 0.3, -18 + i * 18]]), P.graphiteSoft, { width: 1, passes: 1, smoothIt: false });
    outlineMask(sh, pm, P.graphite, { width: 2, wobble: 0.4 });
    const cover = T([[-30, -38], [26, -38], [27, 34], [-29, 34]]);
    const cm = sh.mask(cover);
    paperOver(sh, cm); sh.cutout(cm);
    sh.fill(P.shellLight, cm, { pressure: 0.7, grain: 0.5 });
    sh.hatch(P.shellGreen, { angle: -0.8, gap: 1.9, len: [8, 18], width: 1.6, clip: cm, pressure: 1, layers: 2, crossAngle: 1.1 });
    sh.hatch(P.shellDark, { angle: -0.5, gap: 2, len: [5, 12], width: 1.4, clip: edgeBand(cm, sh.w, sh.h, 6), pressure: 0.7 });
    // the spine band
    const spine = multiplyMasks(cm, sh.mask(T([[-31, -40], [-20, -40], [-20, 36], [-31, 36]])));
    sh.hatch(P.shellDark, { angle: 1.5, gap: 1.8, len: [8, 20], width: 1.5, clip: spine, pressure: 0.9 });
    line(sh, T([[-20, -37], [-20, 33]]), P.graphite, { width: 1.6, passes: 1, smoothIt: false });
    outlineMask(sh, cm, P.graphite, { width: 2.4, wobble: 0.5 });
    // a paper label with a tiny shell-horse scribble
    const lab = T([[-10, -24], [18, -24], [18, -4], [-10, -4]]);
    const lm = sh.mask(lab);
    reserve(sh, lm);
    outlineMask(sh, lm, P.graphite, { width: 1.6, wobble: 0.3 });
    line(sh, T([[-5, -18], [9, -19]]), P.graphite, { width: 1.6, passes: 1 });
    line(sh, T([[-5, -11], [13, -12]]), P.graphiteSoft, { width: 1.4, passes: 1 });
    // an orange ribbon bookmark hanging out
    const rib = T([[8, 33], [14, 33], [14, 46], [11, 43], [8, 46]]);
    const rm = sh.mask(rib);
    paperOver(sh, rm); sh.cutout(rm);
    sh.fill(P.mane, rm, { pressure: 0.95, grain: 0.4 });
    outlineMask(sh, rm, P.graphite, { width: 1.6, wobble: 0.3 });
}

function drawPause(sh) {
    for (const x of [35, 61]) {
        const pts = smooth([[x - 1, 22], [x + 1, 40], [x, 58], [x + 1.5, 75]], { closed: false, steps: 6 });
        const m = taperMask(sh, pts, 12, 11);
        paperOver(sh, m); sh.cutout(m);
        sh.fill(P.graphiteSoft, m, { pressure: 0.8, grain: 0.5 });
        sh.hatch(P.graphite, { angle: 1.5, gap: 1.6, len: [10, 30], width: 1.6, clip: m, pressure: 1, layers: 2, crossAngle: 0.08 });
        outlineMask(sh, m, P.graphite, { width: 2, wobble: 0.5 });
    }
}

function drawHintMark(sh) {
    // a quick pencil squiggle with a flick at the end
    const pts = [];
    for (let t = 0; t <= 1; t += 0.03) pts.push([5 + t * 36, 28 + Math.sin(t * TAU * 1.5) * 9 - t * 5]);
    line(sh, pts, P.graphite, { width: 5, wobble: 0.5, passes: 2, pressure: 1.35 });
    line(sh, [[40.5, 17], [44, 8]], P.graphite, { width: 4.4, passes: 1, smoothIt: false, pressure: 1.35 });
}

/** A hand-drawn pencil circle: goes round a little more than once, overshooting where it meets. */
function pencilRing(sh, cx, cy, r, { width = 4, color = P.graphite, turns = 1.08, start = -2.2, wob = 0.012 } = {}) {
    const pts = [];
    const rand = pencil.rng(hashSeed(`ring${cx}${cy}${r}`));
    const ph = rand() * 10;
    for (let t = 0; t <= turns; t += 0.004) {
        const a = start + t * TAU;
        const rr = r * (1 + Math.sin(a * 2 + ph) * wob + (t - turns / 2) * 0.02);
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    sh.outline(color, pts, { closed: false, width, wobble: 0.4, passes: 2, alpha: 1, overshoot: 0 });
}

function drawStickBase(sh) {
    const c = 128, r = 110;
    const disc = sh.mask(ellipse(c, c, r, r, 90));
    sh.cutout(disc.map((v) => v * 0.3));
    sh.fill(P.skyPale, disc, { pressure: 0.5, grain: 0.15 });
    pencilRing(sh, c, c, r, { width: 4.4 });
    pencilRing(sh, c, c, r - 9, { width: 2, color: P.graphiteSoft, turns: 1.02, start: 1.2 });
    // four small pencil arrowheads
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        const tip = [c + Math.cos(a) * (r - 24), c + Math.sin(a) * (r - 24)];
        const b1 = [tip[0] - Math.cos(a) * 12 + Math.cos(a + Math.PI / 2) * 10, tip[1] - Math.sin(a) * 12 + Math.sin(a + Math.PI / 2) * 10];
        const b2 = [tip[0] - Math.cos(a) * 12 - Math.cos(a + Math.PI / 2) * 10, tip[1] - Math.sin(a) * 12 - Math.sin(a + Math.PI / 2) * 10];
        line(sh, [b1, tip, b2], P.graphite, { width: 3.4, passes: 2, smoothIt: false, alpha: 0.85 });
    }
}

function drawStickKnob(sh) {
    const c = 64, r = 50;
    const disc = sh.mask(ellipse(c, c, r, r, 72));
    paperOver(sh, disc); sh.cutout(disc);
    sh.fill(P.paper, disc, { pressure: 0.2 });
    // shading like a round pebble: blue on the lower right, paper glint top left
    const pm = pencil.pressureMap(sh.w, sh.h, (x, y) => Math.max(0, Math.min(1, ((x - c) * 0.6 + (y - c) * 0.8) / r + 0.35)));
    sh.hatch(P.skyBlue, { angle: -0.7, gap: 1.9, len: [6, 16], width: 1.6, clip: disc, pmap: pm, pressure: 1, layers: 2, crossAngle: 1.1 });
    sh.hatch(P.seaBlue, { angle: -0.5, gap: 2, len: [5, 12], width: 1.5, clip: multiplyMasks(disc, edgeBand(disc, sh.w, sh.h, 10)), pmap: pm, pressure: 0.8 });
    paperOver(sh, sh.mask(ellipse(c - 16, c - 18, 11, 7, 24, -0.6), { feather: 3 }));
    pencilRing(sh, c, c, r, { width: 4.2, start: 0.8 });
}

function drawButton(sh) {
    const c = 80, r = 66;
    const disc = sh.mask(ellipse(c, c, r, r, 90));
    paperOver(sh, disc); sh.cutout(disc.map((v) => v * 0.88));
    const pm = pencil.pressureMap(sh.w, sh.h, (x, y) => Math.max(0, Math.min(1, (y - c) / r * 1.2)));
    sh.hatch(P.coatShade, { angle: -0.5, gap: 2.2, len: [6, 16], width: 1.4, clip: multiplyMasks(disc, edgeBand(disc, sh.w, sh.h, 14)), pmap: pm, pressure: 0.6 });
    pencilRing(sh, c, c, r, { width: 4.6 });
    pencilRing(sh, c, c, r - 6, { width: 1.6, color: P.graphiteSoft, turns: 0.55, start: 0.5 });
}

// ---------------------------------------------------------------------------
// the notebook pieces the menus are built from (skoldhast.css)
// ---------------------------------------------------------------------------
/**
 * One ruled-by-hand pencil line from a to b: it bows a little and runs past
 * both ends, the way a quick box is drawn with four strokes.
 */
function handLine(sh, a, b, { width = 4, bow = 1.2, over = [3, 7], color = P.graphite, passes = 2, seed = 1, alpha = 0.9, ghost = 0 } = {}) {
    const rand = pencil.rng(seed);
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const stroke = (o0, o1, bw, shift, w, al) => {
        const pts = [];
        const n = Math.max(8, Math.round(L / 5));
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const s = -o0 + (L + o0 + o1) * t;
            const off = Math.sin(t * Math.PI) * bw + shift;
            pts.push([a[0] + ux * s + nx * off, a[1] + uy * s + ny * off]);
        }
        sh.outline(color, pts, { closed: false, width: w, wobble: 0.25, passes, overshoot: 0, alpha: al });
    };
    stroke(lerp(over[0], over[1], rand()), lerp(over[0], over[1], rand()), (rand() - 0.5) * 2 * bow, 0, width, alpha);
    // a second, lighter pass that doesn't quite follow the first (a sketched line)
    if (ghost) stroke(lerp(over[0], over[1], rand()) * 0.6, lerp(over[0], over[1], rand()) * 0.6, (rand() - 0.5) * 2 * bow, (rand() < 0.5 ? -1 : 1) * ghost, width * 0.55, alpha * 0.5);
}

/** A box drawn with four strokes that cross at the corners; `tilt` px makes the sides lean a little. */
function pencilBox(sh, x0, y0, x1, y1, { tilt = 1, ...opts } = {}) {
    const s = hashSeed(`box${sh.w}${x0}${y0}`);
    const rand = pencil.rng(s);
    const j = () => (rand() - 0.5) * 2 * tilt;
    handLine(sh, [x0, y0 + j()], [x1, y0 + j()], { ...opts, seed: s + 1 });
    handLine(sh, [x1 + j(), y0], [x1 + j(), y1], { ...opts, seed: s + 2 });
    handLine(sh, [x1, y1 + j()], [x0, y1 + j()], { ...opts, seed: s + 3 });
    handLine(sh, [x0 + j(), y1], [x0 + j(), y0], { ...opts, seed: s + 4 });
}

/**
 * ui-frame / ui-frame-sm: nine-slice pencil boxes (CSS border-image). The line
 * sits a little inside the edge so its overshoots have room; the middles of
 * the edges are stretched, so they stay nearly straight.
 */
function drawFrame(sh, inset, width, over, ghost) {
    pencilBox(sh, inset, inset, sh.w - inset, sh.h - inset, { width, over, bow: 0.9, ghost, tilt: 1.2 });
}

/** ui-hatch: colored-pencil strokes as an alpha mask (seamless); CSS gives them their color. */
function drawHatchMask(sh) {
    sh.hatch('#000000', { angle: -0.82, gap: 2.3, len: [18, 46], width: 1.9, pressure: 0.92, opaque: true, alpha: [0.5, 1] });
    sh.hatch('#000000', { angle: -0.82 + 1.2, gap: 4.6, len: [12, 30], width: 1.5, pressure: 0.5, opaque: true, alpha: [0.35, 0.75] });
}

/** ui-tape: a strip of masking tape with torn ends, see-through. */
function drawTape(sh) {
    const W = sh.w, H = sh.h;
    const rand = pencil.rng(hashSeed('tape'));
    const top = 12, bot = H - 12;
    const left = [], right = [];
    for (let y = top; y <= bot + 0.1; y += 5) {
        left.push([10 + rand() * 9, y]);
        right.push([W - 10 - rand() * 9, y]);
    }
    // up the left edge, across the top, down the right edge (the bottom closes the path)
    const m = sh.mask([...left.slice().reverse(), ...right]);
    sh.cutout(m.map((v) => v * 0.86));
    sh.fill('#e6d4a4', m, { pressure: 1, grain: 0.15 });
    sh.hatch('#cdb47e', { angle: 0.015, gap: 2.4, len: [30, 90], width: 1.3, clip: m, pressure: 0.55, alpha: [0.35, 0.8] });
    // the long edges catch a little shadow
    const edges = multiplyMasks(m, edgeBand(m, W, H, 6));
    sh.hatch('#a88c5c', { angle: 0.01, gap: 2, len: [20, 60], width: 1.3, clip: edges, pressure: 0.5 });
}

/** ui-grunge: rubber-stamp ink as an alpha mask (seamless): mostly ink, with the paper showing through in specks. */
function drawGrunge(sh) {
    const n = sh.w * sh.h;
    for (let i = 0; i < n; i++) {
        const t = sh.tooth[i];
        sh.a[i] = Math.max(0, Math.min(1, (t - 0.2) * 3.2));
        sh.r[i] = sh.g[i] = sh.b[i] = 0;
    }
}

// --- the icon sheet: 7 × 4 cells of 64 px (32 css px): icons, marks, margin doodles, close --
const ICONS = ['shell', 'pencil', 'bulb', 'watch', 'lens', 'report', 'note', 'check', 'box', 'arrow', 'camera', 'star', 'ring', 'dot',
    'gull', 'gull2', 'wave', 'sun', 'kelp', 'cloud', 'fish', 'cross'];
const CELL = 64;

function iconShell(sh, ox, oy) {
    const dome = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; dome.push([ox + 32 + Math.cos(a) * 26, oy + 40 + Math.sin(a) * 23]); }
    dome.push([ox + 58, oy + 44], [ox + 6, oy + 44]);
    const m = sh.mask(smooth(dome, { closed: true, steps: 3 }));
    part(sh, m, { base: P.shellLight, hatch: P.shellGreen, rim: P.shellDark, rimWidth: 6, lineWidth: 2.6, cross: true });
    for (const seg of [[[20, 23], [26, 33], [38, 33], [44, 23]], [[26, 33], [22, 43]], [[38, 33], [42, 43]], [[32, 18], [32, 22]]]) {
        line(sh, seg.map(([x, y]) => [ox + x, oy + y]), P.shellDark, { width: 2, passes: 1, smoothIt: false });
    }
    line(sh, [[ox + 7, oy + 45], [ox + 57, oy + 45]], P.shellRim, { width: 3, passes: 1 });
}

function iconPencil(sh, ox, oy) {
    const T = (pts) => transform(pts, { x: ox + 32, y: oy + 32, rot: -0.72 });
    const body = sh.mask(T([[-17, -6], [15, -6], [15, 6], [-17, 6]]));
    part(sh, body, { base: P.maneLight, hatch: P.mane, lineWidth: 2.4 });
    line(sh, T([[-17, 0], [15, 0]]), P.maneDark, { width: 1.4, passes: 1, smoothIt: false });
    const wood = sh.mask(T([[15, -6], [26, 0], [15, 6]]));
    part(sh, wood, { base: P.sand, lineWidth: 2.2 });
    const tip = sh.mask(T([[22, -2.2], [27, 0], [22, 2.2]]));
    sh.fill(P.graphite, tip, { pressure: 1, opaque: true });
    const band = sh.mask(T([[-22, -6], [-17, -6], [-17, 6], [-22, 6]]));
    part(sh, band, { base: P.coatShade, hatch: P.coatGrey, lineWidth: 2 });
    const rub = sh.mask(T([[-29, -5.4], [-22, -6], [-22, 6], [-29, 5.4]]));
    part(sh, rub, { base: P.tailPeach, hatch: P.tail, hatchPressure: 0.5, lineWidth: 2.2 });
}

function iconBulb(sh, ox, oy) {
    const glass = [];
    for (let i = 0; i < 30; i++) {
        const a = (i / 30) * TAU;
        const r = 15 + (Math.sin(a) > 0.5 ? -(Math.sin(a) - 0.5) * 9 : 0);
        glass.push([ox + 32 + Math.cos(a) * r, oy + 26 + Math.sin(a) * 15 * (Math.sin(a) > 0 ? 1.25 : 1)]);
    }
    const g = sh.mask(smooth(glass, { closed: true, steps: 3 }));
    part(sh, g, { base: P.sunGlow, hatch: P.sunYellow, rim: P.maneLight, rimWidth: 5, lineWidth: 2.5 });
    paperOver(sh, sh.mask(ellipse(ox + 26, oy + 20, 3.5, 5, 16, -0.5), { feather: 1 }));
    const base = sh.mask([[ox + 25, oy + 44], [ox + 39, oy + 44], [ox + 38, oy + 54], [ox + 26, oy + 54]]);
    part(sh, base, { base: P.coatShade, hatch: P.coatGrey, lineWidth: 2.2 });
    line(sh, [[ox + 26, oy + 48], [ox + 38, oy + 47.5]], P.graphite, { width: 1.6, passes: 1, smoothIt: false });
    for (const [a, r0, r1] of [[-2.6, 20, 27], [-1.57, 19, 26], [-0.55, 20, 27], [-3.4, 19, 25], [0.25, 19, 25]]) {
        line(sh, [[ox + 32 + Math.cos(a) * r0, oy + 26 + Math.sin(a) * r0], [ox + 32 + Math.cos(a) * r1, oy + 26 + Math.sin(a) * r1]], P.maneDark, { width: 2.2, passes: 1, smoothIt: false });
    }
}

function iconWatch(sh, ox, oy) {
    const cx = ox + 32, cy = oy + 36;
    const knob = sh.mask([[cx - 4, oy + 8], [cx + 4, oy + 8], [cx + 4, oy + 16], [cx - 4, oy + 16]]);
    part(sh, knob, { base: P.coatShade, lineWidth: 2 });
    const face = sh.mask(ellipse(cx, cy, 20, 20, 40));
    part(sh, face, { base: null, rim: P.skyBlue, rimWidth: 7, rimPressure: 0.9, lineWidth: 2.8 });
    for (let i = 0; i < 12; i += 3) {
        const a = (i / 12) * TAU;
        line(sh, [[cx + Math.cos(a) * 13, cy + Math.sin(a) * 13], [cx + Math.cos(a) * 16, cy + Math.sin(a) * 16]], P.graphite, { width: 1.8, passes: 1, smoothIt: false });
    }
    line(sh, [[cx, cy], [cx + 7, cy - 10]], P.red, { width: 2.6, passes: 1, smoothIt: false });
    sh.dots(P.graphite, [[cx, cy, 1]], { rx: 2.2, ry: 2.2, opaque: true });
}

function iconLens(sh, ox, oy) {
    const cx = ox + 27, cy = oy + 26;
    const handle = taperMask(sh, [[cx + 12, cy + 12], [ox + 55, oy + 55]], 8, 9);
    part(sh, handle, { base: P.wood, hatch: P.woodDark, lineWidth: 2.2 });
    const ringOuter = sh.mask(ellipse(cx, cy, 18, 18, 40));
    const glass = sh.mask(ellipse(cx, cy, 13, 13, 36));
    part(sh, ringOuter, { base: P.coatShade, hatch: P.coatGrey, lineWidth: 2.4, outline: false });
    reserve(sh, glass);
    sh.hatch(P.skyPale, { angle: -0.7, gap: 2.4, len: [6, 14], width: 1.4, clip: glass, pressure: 0.8 });
    paperOver(sh, sh.mask(ellipse(cx - 5, cy - 5, 3.5, 5.5, 16, 0.7), { feather: 1 }));
    outlineMask(sh, ringOuter, P.graphite, { width: 2.6, wobble: 0.3 });
    outlineMask(sh, glass, P.graphite, { width: 1.8, wobble: 0.3 });
}

function iconReport(sh, ox, oy) {
    const pg = sh.mask([[ox + 13, oy + 6], [ox + 47, oy + 7], [ox + 50, oy + 58], [ox + 14, oy + 57]]);
    part(sh, pg, { base: null, lineWidth: 2.4 });
    for (let i = 0; i < 4; i++) line(sh, [[ox + 19, oy + 15 + i * 7], [ox + 42, oy + 15.5 + i * 7]], P.graphiteSoft, { width: 1.5, passes: 1, smoothIt: false });
    const st = sh.mask(ellipse(ox + 39, oy + 46, 10, 10, 30));
    sh.cutout(st);
    sh.hatch(P.red, { angle: -0.6, gap: 2.2, len: [5, 12], width: 1.5, clip: st, pressure: 0.55 });
    sh.outline(P.red, ellipse(ox + 39, oy + 46, 10, 10, 30), { width: 2.2, wobble: 0.3 });
    sh.outline(P.red, ellipse(ox + 39, oy + 46, 6.5, 6.5, 24), { width: 1.4, wobble: 0.3 });
}

function iconNote(sh, ox, oy) {
    const pts = [[ox + 9, oy + 10], [ox + 55, oy + 9], [ox + 55, oy + 42], [ox + 42, oy + 55], [ox + 10, oy + 55]];
    const m = sh.mask(pts);
    part(sh, m, { base: P.sunGlow, hatch: P.sunYellow, hatchPressure: 0.55, lineWidth: 2.4 });
    const fold = sh.mask([[ox + 55, oy + 42], [ox + 42, oy + 55], [ox + 43, oy + 43]]);
    part(sh, fold, { base: P.sandShade, lineWidth: 1.8 });
    for (let i = 0; i < 3; i++) line(sh, [[ox + 16, oy + 21 + i * 9], [ox + (i === 2 ? 36 : 47), oy + 21.4 + i * 9]], P.graphite, { width: 1.8, passes: 1 });
}

function iconCheck(sh, ox, oy) {
    const pts = [[ox + 12, oy + 33], [ox + 20, oy + 40], [ox + 27, oy + 49], [ox + 36, oy + 33], [ox + 46, oy + 19], [ox + 55, oy + 9]];
    const m = taperMask(sh, smooth(pts, { closed: false, steps: 4 }), 5.5, 3.5);
    paperOver(sh, m, P.graphite); sh.cutout(m);
    sh.fill(P.graphite, m, { pressure: 1, grain: 0.5 });
}

function iconCross(sh, ox, oy) {
    // two quick strokes, drawn like the check mark (the close button of every panel)
    for (const pts of [[[15, 15], [31, 32], [49, 49]], [[49, 14], [33, 31], [15, 50]]]) {
        const m = taperMask(sh, smooth(pts.map(([x, y]) => [ox + x, oy + y]), { closed: false, steps: 4 }), 6, 4.4);
        paperOver(sh, m, P.graphite); sh.cutout(m);
        sh.fill(P.graphite, m, { pressure: 1, grain: 0.5 });
    }
}

function iconBox(sh, ox, oy) {
    pencilBox(sh, ox + 11, oy + 12, ox + 51, oy + 52, { width: 3.4, over: [1.5, 4.5], bow: 0.8 });
}

function iconArrow(sh, ox, oy) {
    const pts = [[ox + 6, oy + 42], [ox + 18, oy + 30], [ox + 32, oy + 30], [ox + 44, oy + 32], [ox + 55, oy + 32]];
    line(sh, pts, P.tail, { width: 4, passes: 2 });
    line(sh, [[ox + 45, oy + 21], [ox + 57, oy + 32], [ox + 45, oy + 43]], P.tail, { width: 4, passes: 2, smoothIt: false });
}

function iconCamera(sh, ox, oy) {
    const bump = sh.mask([[ox + 22, oy + 14], [ox + 38, oy + 14], [ox + 41, oy + 20], [ox + 19, oy + 20]]);
    part(sh, bump, { base: P.coatShade, lineWidth: 2 });
    const body = sh.mask([[ox + 8, oy + 20], [ox + 56, oy + 20], [ox + 56, oy + 50], [ox + 8, oy + 50]]);
    part(sh, body, { base: P.coatShade, hatch: P.coatGrey, lineWidth: 2.4 });
    const lens = sh.mask(ellipse(ox + 32, oy + 35, 10, 10, 30));
    part(sh, lens, { base: P.skyBlue, hatch: P.seaBlue, lineWidth: 2.2 });
    paperOver(sh, sh.mask(ellipse(ox + 29, oy + 32, 2.6, 2.6, 12)));
}

function iconStar(sh, ox, oy) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 10 : 23;
        pts.push([ox + 32 + Math.cos(a) * r, oy + 34 + Math.sin(a) * r]);
    }
    const m = sh.mask(pts);
    part(sh, m, { base: P.sunGlow, hatch: P.sunYellow, rim: P.maneLight, rimWidth: 4, lineWidth: 2.4 });
}

function iconRing(sh, ox, oy) {
    pencilRing(sh, ox + 32, oy + 32, 19, { width: 3.4, turns: 1.1, start: -2.4, wob: 0.03 });
}

function iconDot(sh, ox, oy) {
    const m = sh.mask(ellipse(ox + 32, oy + 32, 11.5, 11, 28));
    sh.cutout(m);
    sh.hatch(P.graphite, { angle: -0.7, gap: 1.7, len: [8, 20], width: 1.8, clip: m, pressure: 1, layers: 2, crossAngle: 1.2 });
}

// --- margin doodles (the third row) --------------------------------------------------
function iconGull(sh, ox, oy, lift = 0) {
    // her gulls: a quick "m" with a dip in the middle
    const pts = [[8, 38 + lift], [16, 27 - lift], [26, 25], [32, 35], [38, 25], [48, 27 - lift], [56, 38 + lift]];
    line(sh, smooth(pts.map(([x, y]) => [ox + x, oy + y]), { closed: false, steps: 5 }), P.graphite, { width: 3.4, passes: 2, smoothIt: false, pressure: 1.2 });
}

function iconWave(sh, ox, oy) {
    const crest = [];
    for (let t = 0; t <= 1.0001; t += 0.04) crest.push([ox + 6 + t * 52, oy + 38 - Math.sin(t * Math.PI * 2) * 7 - t * 2]);
    line(sh, crest, P.seaBlue, { width: 4, passes: 2, smoothIt: false, pressure: 1.1 });
    // the curl at the top of the crest
    const curl = [];
    for (let a = 0; a <= 4.2; a += 0.2) curl.push([ox + 20 + Math.cos(-Math.PI / 2 + a) * (6 - a * 0.6), oy + 29 + Math.sin(-Math.PI / 2 + a) * (6 - a * 0.6)]);
    line(sh, curl, P.seaBlue, { width: 3, passes: 1, smoothIt: false, pressure: 1.1 });
    const low = [];
    for (let t = 0; t <= 1.0001; t += 0.05) low.push([ox + 12 + t * 44, oy + 49 - Math.sin(t * Math.PI * 2 + 1) * 4]);
    line(sh, low, P.skyBlue, { width: 3, passes: 1, smoothIt: false, pressure: 1.2 });
}

function iconSun(sh, ox, oy) {
    const cx = ox + 32, cy = oy + 32;
    const disc = sh.mask(ellipse(cx, cy, 13, 13, 36));
    part(sh, disc, { base: P.sunGlow, hatch: P.sunYellow, rim: P.maneLight, rimWidth: 5, line: P.maneLight, lineWidth: 2.4 });
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + 0.2;
        line(sh, [[cx + Math.cos(a) * 18, cy + Math.sin(a) * 18], [cx + Math.cos(a) * (i % 2 ? 24 : 27), cy + Math.sin(a) * (i % 2 ? 24 : 27)]], P.maneLight, { width: 2.6, passes: 1, smoothIt: false, pressure: 1.2 });
    }
}

function iconKelp(sh, ox, oy) {
    const spine = [];
    for (let t = 0; t <= 1.0001; t += 0.05) spine.push([ox + 30 + Math.sin(t * 5.5) * 5, oy + 60 - t * 54]);
    line(sh, spine, P.kelp, { width: 3.6, passes: 2, smoothIt: false });
    for (const [t, side] of [[0.25, 1], [0.45, -1], [0.62, 1], [0.8, -1]]) {
        const i = Math.round(t * (spine.length - 1));
        const [x, y] = spine[i];
        const leaf = sh.mask(ellipse(x + side * 8, y - 3, 8, 3.4, 18, side * -0.6));
        part(sh, leaf, { base: P.shellLight, hatch: P.kelp, line: P.kelpDark, lineWidth: 1.6 });
    }
}

function iconCloud(sh, ox, oy) {
    const m = unionMasks(
        sh.mask(ellipse(ox + 22, oy + 36, 12, 10, 28)), sh.mask(ellipse(ox + 34, oy + 28, 14, 12, 28)),
        sh.mask(ellipse(ox + 46, oy + 36, 11, 9, 28)), sh.mask([[ox + 14, oy + 36], [ox + 54, oy + 36], [ox + 54, oy + 45], [ox + 14, oy + 45]]));
    part(sh, m, { base: null, rim: P.skyPale, rimWidth: 6, rimPressure: 0.9, lineWidth: 2.3 });
}

function iconFish(sh, ox, oy) {
    const body = sh.mask(ellipse(ox + 29, oy + 32, 16, 9.5, 32));
    const tail = sh.mask([[ox + 43, oy + 32], [ox + 56, oy + 22], [ox + 54, oy + 42]]);
    const m = unionMasks(body, tail);
    part(sh, m, { base: P.skyBlue, hatch: P.seaBlue, hatchPressure: 0.7, lineWidth: 2.2 });
    sh.dots(P.graphite, [[ox + 20, oy + 30, 1]], { rx: 1.8, ry: 1.8, opaque: true });
    line(sh, [[ox + 28, oy + 24], [ox + 31, oy + 32], [ox + 28, oy + 40]], P.foamLine, { width: 1.5, passes: 1 });
}

const ICON_DRAW = {
    shell: iconShell, pencil: iconPencil, bulb: iconBulb, watch: iconWatch, lens: iconLens, report: iconReport, note: iconNote,
    check: iconCheck, box: iconBox, arrow: iconArrow, camera: iconCamera, star: iconStar, ring: iconRing, dot: iconDot,
    gull: iconGull, gull2: (sh, ox, oy) => iconGull(sh, ox, oy, 4), wave: iconWave, sun: iconSun, kelp: iconKelp, cloud: iconCloud, fish: iconFish,
    cross: iconCross
};

function drawIcons(sh) {
    ICONS.forEach((name, i) => ICON_DRAW[name](sh, (i % 7) * CELL, Math.floor(i / 7) * CELL));
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------
export function uiImages() {
    const out = [];
    const mk = (name, w, h, draw, opts = {}) => {
        const sh = sheet(name, w, h, opts.sheet || {});
        draw(sh);
        out.push({ name, canvas: sh.toCanvas(), repeat: !!opts.repeat, quality: opts.quality });
    };
    mk('ui-title', 1200, 520, (sh) => { drawSubtitleBand(sh); drawTitle(sh); }, { quality: 72 });
    mk('ui-paper', 512, 512, drawPaper, { repeat: true, sheet: { paper: true, tile: true }, quality: 70 });
    mk('ui-claw', 64, 64, drawClaw);
    mk('ui-journal', 96, 96, drawJournal);
    mk('ui-pause', 96, 96, drawPause);
    mk('ui-hint-mark', 48, 48, drawHintMark);
    mk('ui-stick-base', 256, 256, drawStickBase);
    mk('ui-stick-knob', 128, 128, drawStickKnob);
    mk('ui-btn', 160, 160, drawButton);
    // the menus' notebook pieces
    mk('ui-frame', 200, 200, (sh) => drawFrame(sh, 16, 4.4, [5, 14], 1.6));
    mk('ui-frame-sm', 112, 112, (sh) => drawFrame(sh, 10, 3.8, [3, 8], 1.2));
    mk('ui-hatch', 160, 160, drawHatchMask, { repeat: true, sheet: { tile: true }, quality: 60 });
    mk('ui-tape', 240, 72, drawTape);
    mk('ui-grunge', 96, 96, drawGrunge, { repeat: true, sheet: { tile: true }, quality: 50 });
    mk('ui-icons', CELL * 7, CELL * 4, drawIcons);
    return out;
}

/** The icon names in ui-icons.webp, in sheet order (7 per row, skoldhast.css .sk-ic-*). */
export { ICONS };

export async function build(api) {
    for (const im of uiImages()) {
        api.image(im.name, im.canvas, { bundle: 'boot', repeat: im.repeat, scale: 2, quality: im.quality || 80 });
    }
}

