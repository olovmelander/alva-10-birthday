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
 *   ui-btn         a round pencil-drawn button ring
 */
import * as pencil from './pencil.mjs';
import {
    NPC_PENCILS as N, HAND, LABEL, writeWord, drawHand, paperOver, outlineMask, strokeMask, taperMask,
    line, halo, reserve, pincerPts, kloPaint
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
// build
// ---------------------------------------------------------------------------
export function uiImages() {
    const out = [];
    const mk = (name, w, h, draw, opts = {}) => {
        const sh = sheet(name, w, h, opts.sheet || {});
        draw(sh);
        out.push({ name, canvas: sh.toCanvas(), repeat: !!opts.repeat });
    };
    mk('ui-title', 1200, 520, (sh) => { drawSubtitleBand(sh); drawTitle(sh); });
    mk('ui-paper', 512, 512, drawPaper, { repeat: true, sheet: { paper: true, tile: true } });
    mk('ui-claw', 64, 64, drawClaw);
    mk('ui-journal', 96, 96, drawJournal);
    mk('ui-pause', 96, 96, drawPause);
    mk('ui-hint-mark', 48, 48, drawHintMark);
    mk('ui-stick-base', 256, 256, drawStickBase);
    mk('ui-stick-knob', 128, 128, drawStickKnob);
    mk('ui-btn', 160, 160, drawButton);
    return out;
}

export async function build(api) {
    for (const im of uiImages()) {
        api.image(im.name, im.canvas, { bundle: 'boot', repeat: im.repeat, scale: 2, quality: im.name === 'ui-paper' ? 70 : im.name === 'ui-title' ? 72 : 80 });
    }
}

