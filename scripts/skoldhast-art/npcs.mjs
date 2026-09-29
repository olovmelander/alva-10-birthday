/*
 * Supporting characters for "Sköldhästen och havet mellan sidorna", drawn in
 * code with the colored-pencil toolkit (see SPEC §4):
 *
 *   atlas `npcs`      (scale 1.5, bundle boot)  Professor Klo, his three signs and
 *                                                the shy beach creatures (fish,
 *                                                hermit crabs, sand eels)
 *   atlas `npcs-sea`  (scale 1.5, bundle sea)   the lyktfiskar (Kelpskogen)
 *   atlas `npcs-land` (scale 1.5, bundle land)  Sköldpaddan Signe (after-game race)
 *   atlas `npcs-bay`  (scale 1.5, bundle bay)   Kartväktaren (Pappersfyren)
 *   atlas `table`     (scale 1,   bundle boot)  the prologue/epilogue table props
 *
 * Only Klo, the signs, the beach creatures and the table are needed for the
 * first playable minutes, so the rest waits in the bundles of the places where
 * they appear (this keeps the boot download small).
 *
 * Alva's handwritten "SKÖLD häst" label is traced here as stroke data (LABEL,
 * in the reference photo's pixel space), so the signs, the title lettering in
 * ui.mjs and anything else that writes "in her hand" share one trace.
 *
 * Everything faces right; the engine mirrors with scale.x = -1 — except the
 * frames with lettering (sign-*, klo-signs, klo-sign-*), which must never be
 * mirrored or the words read backwards.
 *
 * Anchors: [0.5, 1] (ground contact) unless stated. lyktfisk-*, fish-* and the
 * table props are [0.5, 0.5]; alva-pencil is [0.08, 0.95] (the pencil tip).
 * kv-peek's anchor is the foot of the edge his fingers grip (the shutter edge);
 * klo-peek's anchor is where the eye stalks leave the hole.
 */
import { createCanvas } from '@napi-rs/canvas';
import * as pencil from './pencil.mjs';

const { Sheet, PENCILS: P, smooth, ellipse, transform, edgeBand, hashSeed, multiplyMasks, subtractMask,
    unionMasks, gradientMap, resample, rgb, boxBlur } = pencil;

// ---------------------------------------------------------------------------
// Extra pencils used only by the characters (named here, not in the shared box)
// ---------------------------------------------------------------------------
export const NPC_PENCILS = {
    // Professor Klo
    kloShell: '#e25a30',
    kloShellDeep: '#b3381f',
    kloShellLight: '#f39a66',
    kloBelly: '#f6d3b1',
    kloBellyShade: '#e0a47c',
    kloTip: '#7c2a1a',
    // signs and sticks
    boardWood: '#e2c496',
    boardGrain: '#b58a58',
    stickWood: '#b88a58',
    // stopwatch and notebook
    steel: '#a9adb0',
    steelDark: '#6e7478',
    notebook: '#5f86b8',
    // Kartväktaren
    foldShade: '#d2cbbd',
    foldDeep: '#aea596',
    ruler: '#e9cf8e',
    pencilYellow: '#f2c94c',
    eraserPink: '#f09aa0',
    blush: '#f3b3a6',
    // creatures
    fishBody: '#8fb8cf',
    fishBack: '#4f7fa3',
    fishStripe: '#e8c25a',
    lyktBody: '#2e5f7e',
    lyktDeep: '#1d3f5a',
    hermitShell: '#e7b7a0',
    hermitShellDeep: '#b9786a',
    hermitBody: '#e98a5a',
    eelBody: '#c9d3c6',
    eelBack: '#7d917e',
    eelSpot: '#e8b04a',
    turtleShell: '#a47a44',
    turtleShellLight: '#d6b36a',
    turtleShellDeep: '#6b4a26',
    turtleSkin: '#9aa56a',
    turtleSkinDeep: '#66713f',
    // table scene
    alvaPencilBlue: '#2f63a8',
    pencilWood: '#e9c89a',
    cuffKnit: '#c8574a',
    cuffKnitDeep: '#94372f',
    eraserBody: '#f4b8b0',
    eraserSleeve: '#5d8fc4',
    duskTop: '#2d3f7a',
    duskMid: '#8a6aa8',
    duskLow: '#f2a262',
    duskGlow: '#fbd38a',
    windowFrame: '#f3efe6',
    curtain: '#e9d8b4',
    treeDusk: '#3d6275'
};
const N = NPC_PENCILS;

// ---------------------------------------------------------------------------
// Small helpers on top of the toolkit
// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const dir = (ang, r = 1) => [Math.cos(ang) * r, Math.sin(ang) * r];

/**
 * A transparent sprite sheet measured in world units: `wu` wide/high at `scale`
 * texture px per wu, with the origin (0, 0) at the anchor point.
 */
export function sprite(name, wWu, hWu, scale, anchor = [0.5, 1]) {
    const w = Math.max(8, Math.ceil(wWu * scale));
    const h = Math.max(8, Math.ceil(hWu * scale));
    const sh = new Sheet(w, h, { paper: false, seed: hashSeed(name) });
    const ox = anchor[0] * w, oy = anchor[1] * h;
    sh.S = scale;
    sh.ox = ox; sh.oy = oy;
    sh.pt = ([x, y]) => [ox + x * scale, oy + y * scale];
    sh.T = (pts) => pts.map(([x, y]) => [ox + x * scale, oy + y * scale]);
    sh.name = name;
    return sh;
}

/** Repaint the paper color inside a mask (a front part hides what is behind it). */
export function paperOver(sh, m, color = P.paper) {
    const [pr, pg, pb] = rgb(color);
    for (let i = 0; i < m.length; i++) {
        const k = m[i];
        if (k <= 0) continue;
        sh.r[i] = sh.r[i] * (1 - k) + pr * k;
        sh.g[i] = sh.g[i] * (1 - k) + pg * k;
        sh.b[i] = sh.b[i] * (1 - k) + pb * k;
    }
}

/** Mask of a thick polyline (px points) with round caps. */
export function strokeMask(sh, pts, width) {
    return sh.coverage((c) => {
        c.globalCompositeOperation = 'source-over';
        c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
        c.stroke();
    }, { additive: false });
}

/** Mask of a tube along a polyline whose width goes w0 → w1 (px). */
export function taperMask(sh, pts, w0, w1) {
    const path = resample(pts, 0.75);
    return sh.coverage((c) => {
        c.globalCompositeOperation = 'source-over';
        for (let i = 0; i < path.length; i++) {
            const t = i / Math.max(1, path.length - 1);
            const r = lerp(w0, w1, t) / 2;
            c.beginPath(); c.arc(path[i][0], path[i][1], Math.max(0.4, r), 0, TAU); c.fill();
        }
    }, { additive: false });
}

/**
 * Contours of a mask (marching squares) as closed polylines in px, lightly
 * smoothed, so any union of shapes can get one pencil outline.
 */
export function contours(mask, w, h, thr = 0.5, minLen = 8) {
    const val = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : mask[y * w + x];
    const pos = new Map();
    const adj = new Map();
    const link = (a, b) => {
        (adj.get(a) || adj.set(a, []).get(a)).push(b);
        (adj.get(b) || adj.set(b, []).get(b)).push(a);
    };
    const edgeKey = (kind, x, y, px, py) => {
        const k = `${kind}${x},${y}`;
        if (!pos.has(k)) pos.set(k, [px + 0.5, py + 0.5]);
        return k;
    };
    for (let y = -1; y < h; y++) {
        for (let x = -1; x < w; x++) {
            const a = val(x, y), b = val(x + 1, y), c = val(x + 1, y + 1), d = val(x, y + 1);
            const idx = (a > thr ? 8 : 0) | (b > thr ? 4 : 0) | (c > thr ? 2 : 0) | (d > thr ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const T = () => edgeKey('h', x, y, x + (thr - a) / (b - a), y);
            const B = () => edgeKey('h', x, y + 1, x + (thr - d) / (c - d), y + 1);
            const L = () => edgeKey('v', x, y, x, y + (thr - a) / (d - a));
            const R = () => edgeKey('v', x + 1, y, x + 1, y + (thr - b) / (c - b));
            switch (idx) {
                case 1: case 14: link(L(), B()); break;
                case 2: case 13: link(B(), R()); break;
                case 3: case 12: link(L(), R()); break;
                case 4: case 11: link(T(), R()); break;
                case 6: case 9: link(T(), B()); break;
                case 7: case 8: link(T(), L()); break;
                case 5: link(T(), R()); link(L(), B()); break;
                case 10: link(T(), L()); link(R(), B()); break;
                default: break;
            }
        }
    }
    const seen = new Set();
    const loops = [];
    for (const start of adj.keys()) {
        if (seen.has(start)) continue;
        const loop = [];
        let prev = null, cur = start;
        while (cur && !seen.has(cur)) {
            seen.add(cur);
            loop.push(pos.get(cur));
            const nb = adj.get(cur) || [];
            const next = nb.find((n) => n !== prev && !seen.has(n));
            prev = cur; cur = next;
        }
        if (loop.length >= minLen) loops.push(loop);
    }
    // smooth the staircase a little
    return loops.map((lp) => {
        const n = lp.length;
        const out = [];
        for (let i = 0; i < n; i++) {
            let sx = 0, sy = 0;
            for (let k = -2; k <= 2; k++) { const p = lp[(i + k + n) % n]; sx += p[0]; sy += p[1]; }
            out.push([sx / 5, sy / 5]);
        }
        return resample([...out, out[0]], 2).slice(0, -1);
    });
}

/** Pencil outline around everything inside `mask`. */
export function outlineMask(sh, mask, color = P.graphite, opts = {}) {
    for (const loop of contours(mask, sh.w, sh.h)) sh.outline(color, loop, { closed: true, ...opts });
}

/**
 * A "part": cut the silhouette out of paper (hiding what is behind), then lay a
 * base tone and hatching, shade toward the rim, and draw a graphite contour.
 */
export function part(sh, m, {
    base = null, basePressure = 0.55, hatch = null, hatchPressure = 0.8, angle = -0.7, gap = 2.2,
    rim = null, rimWidth = 8, rimPressure = 0.7, line = P.graphite, lineWidth = 2.2, cross = false,
    shade = null, shadeMap = null, paper = true, outline = true, wobble = 0.6, burnish = 0
} = {}) {
    if (paper) paperOver(sh, m);
    sh.cutout(m);
    if (base) sh.tone(base, m, { pressure: basePressure, angle: angle + 0.4, gap: 2.4 });
    if (hatch) {
        sh.hatch(hatch, {
            angle, gap, len: [10, 26], width: 1.5, clip: m, pressure: hatchPressure,
            layers: cross ? 2 : 1, crossAngle: 1.1
        });
    }
    if (shade && shadeMap) sh.hatch(shade, { angle: angle + 0.25, gap: 2, len: [8, 20], width: 1.4, clip: m, pmap: shadeMap });
    if (rim) {
        const band = edgeBand(m, sh.w, sh.h, rimWidth);
        sh.hatch(rim, { angle: angle - 0.3, gap: 2, len: [6, 16], width: 1.4, clip: band, pressure: rimPressure });
    }
    if (burnish) sh.burnish(m, 1, burnish);
    if (outline && line) outlineMask(sh, m, line, { width: lineWidth, wobble });
    return m;
}

/** A pencil line (open path in px). */
export function line(sh, pts, color = P.graphite, { width = 1.8, wobble = 0.5, alpha = 0.95, passes = 2, pressure = 1, smoothIt = true, clip = null } = {}) {
    const path = smoothIt && pts.length > 2 ? smooth(pts, { closed: false, steps: 6 }) : pts;
    sh.outline(color, path, { closed: false, width, wobble, alpha, passes, pressure, clip });
}

/**
 * A soft pencil halo (for glows): an even, low-grain wash of `color` whose
 * pressure falls off from r0 to r1, with a few pencil strokes on top. Opaque:
 * on a sprite the glow itself exists (alpha comes from the pigment).
 */
export function halo(sh, cx, cy, r0, r1, color, { pressure = 0.9, angle = 0.6, gap = 2.2, strokes = true, falloff = 1.6 } = {}) {
    const disc = sh.mask(ellipse(cx, cy, r1, r1, 48));
    const pm = pencil.pressureMap(sh.w, sh.h, (x, y) => {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r0) return 1;
        const t = (d - r0) / Math.max(1, r1 - r0);
        return Math.max(0, 1 - t) ** falloff;
    });
    sh.deposit(color, disc, { pressure, pmap: pm, grain: 0.25, opaque: true });
    if (strokes) {
        sh.hatch(color, { angle, gap, len: [4, 12], width: 1.3, clip: disc, pmap: pm, pressure: pressure * 0.9, opaque: true });
        sh.hatch(color, { angle: angle + 1.3, gap: gap * 1.3, len: [3, 9], width: 1.2, clip: disc, pmap: pm, pressure: pressure * 0.6, opaque: true });
    }
}

/** Reserve paper (erase pigment back to paper) inside a mask — for highlights and glowing spots. */
export function reserve(sh, m) {
    paperOver(sh, m);
    sh.cutout(m);
}

// ---------------------------------------------------------------------------
// Alva's hand: the "SKÖLD häst" label, traced stroke by stroke
// ---------------------------------------------------------------------------
/**
 * Her label as she drew it, in the reference photo's 2× pixel space (the label
 * is about 200 × 92 px there). Each letter is a list of strokes; each stroke a
 * polyline along the middle of her pencil line. Checked by overlay against the
 * reference crop. The Ö is a small o with a bar above, the ä has a bar, one
 * wavy underline (U) runs under both words, rising to the right.
 */
export const LABEL = {
    S: [[[611, 448.5], [607.5, 449.5], [604, 452.5], [602, 456.5], [601.5, 460.5], [603, 464], [607, 467], [611, 470], [613.5, 473.5], [614.5, 477], [613.5, 481], [610.5, 484], [606.5, 485.5], [604.5, 485.5]]],
    K: [[[614.5, 440.5], [615.5, 447], [617, 455], [618.5, 463], [620, 470], [621.5, 477], [622.5, 481]],
        [[633.5, 444], [631, 449], [628, 455], [625, 460.5], [622, 466.5], [620.5, 469]],
        [[620.8, 470.5], [624, 472.5], [628, 473.5], [633, 474], [638, 474.5]]],
    Obar: [[[639.5, 443.5], [644, 442], [650, 440.5], [656, 439.5], [661, 439]]],
    O: [[[650, 451], [646, 452.5], [643.8, 456.5], [643.8, 462], [646, 466.5], [650, 468], [654, 466], [655.8, 461], [655.3, 455.5], [652.5, 451.5], [650, 451]]],
    L: [[[661, 438], [661.5, 445], [662.5, 453], [663.5, 461], [664.5, 467.5], [667, 469.5], [670, 470], [673, 469.5]]],
    D: [[[671.5, 433], [672, 440], [673, 448], [673.5, 455], [674, 461]],
        [[671.5, 433], [676, 432], [681, 433], [685, 436.5], [687, 442], [686.5, 448], [683.5, 453.5], [679, 458], [675, 461]]],
    h: [[[701.5, 420], [703, 430], [704.5, 440], [705.5, 450], [706, 458]],
        [[705.5, 447], [708, 442], [711, 440], [714, 441], [716, 445], [716.5, 452], [717, 460]]],
    abar: [[[725, 422], [730, 423], [737, 422.5], [744, 422]]],
    a: [[[737, 441], [736.5, 447], [734.5, 451.5], [731, 453], [727.5, 451], [725.5, 446], [726, 440], [728.5, 435], [731.5, 432], [734, 435.5], [736.5, 440], [739, 444], [742, 445.5], [746, 445.5]]],
    s: [[[761, 416], [757, 415.5], [753, 417], [751, 420.5], [751.5, 424], [754, 426.5], [758, 428.5], [760.5, 432], [761, 436], [759, 440], [755, 442.5], [751.5, 443]]],
    t: [[[772, 404], [772.5, 410], [773, 417], [774, 423], [776, 429], [779, 433.5], [783, 435.5], [787, 435.5], [789, 433.5]],
        [[766, 422], [770, 421.5], [776, 420], [782, 419], [787, 418.5]]],
    U: [[[604, 495], [610, 491.5], [615, 489], [620, 486.5], [625, 483.5], [630, 481], [635, 479.5], [640, 478.5], [645, 477.5], [650, 476.5], [655, 475], [660, 473.5], [665, 472], [670, 470.5], [675, 469.5], [680, 468.5], [685, 468], [690, 467.5], [695, 468], [700, 468.5], [705, 468.5], [710, 468], [715, 467], [720, 466], [725, 464.5], [730, 462.5], [735, 460.5], [740, 458.5], [745, 457], [750, 455], [755, 453], [760, 451], [765, 449], [770, 447.5], [775, 446.5], [780, 445.5], [785, 445.2], [790, 445.5], [795, 446], [800, 446.5]]]
};
/** Her baseline: from the foot of the S to the foot of the t (about 15° up to the right). */
export const LABEL_ORIGIN = [605, 485.5];
export const LABEL_ANGLE = Math.atan2(435.5 - 485.5, 787 - 605);
/** Stroke width of her pencil line in label px. */
export const LABEL_STROKE = 3.4;

/** Label px → her upright writing frame (baseline y = 0, x along the baseline). */
function toLocal([x, y]) {
    const c = Math.cos(-LABEL_ANGLE), s = Math.sin(-LABEL_ANGLE);
    const X = x - LABEL_ORIGIN[0], Y = y - LABEL_ORIGIN[1];
    return [X * c - Y * s, X * s + Y * c];
}
const localStrokes = (key) => LABEL[key].map((st) => st.map(toLocal));

/**
 * Her letters in the upright frame (baseline 0, cap height ≈ 33, x-height ≈ 18),
 * plus letters she did not write in the label, drawn to match: the same single
 * pencil line, a slight forward lean, round o-shapes, bars instead of dots.
 * Each glyph: { strokes, x0, x1 } (x extent for spacing).
 */
function glyphFrom(strokes, dx = 0, dy = 0) {
    const s = strokes.map((st) => st.map(([x, y]) => [x + dx, y + dy]));
    const xs = s.flat().map((p) => p[0]);
    return { strokes: s, x0: Math.min(...xs), x1: Math.max(...xs) };
}
/** Lean a hand-designed glyph forward like her letters (x += -y * lean). */
function leaned(strokes, lean = 0.12) {
    return strokes.map((st) => st.map(([x, y]) => [x - y * lean, y]));
}

function buildHand() {
    const G = {};
    // traced capitals and lowercase (positioned at their own x; normalized below)
    G.S = glyphFrom(localStrokes('S'));
    G.K = glyphFrom(localStrokes('K'));
    G['Ö'] = glyphFrom([...localStrokes('O'), ...localStrokes('Obar')]);
    G.L = glyphFrom(localStrokes('L'));
    G.D = glyphFrom(localStrokes('D'), 0, 3); // she floated the D; sit it nearer the line
    G.h = glyphFrom(localStrokes('h'));
    G['ä'] = glyphFrom([...localStrokes('a'), ...localStrokes('abar')]);
    G.a = glyphFrom(localStrokes('a'));
    G.s = glyphFrom(localStrokes('s'));
    G.t = glyphFrom(localStrokes('t'));
    // her small o (from the Ö), sitting on the line
    const oLoc = localStrokes('O')[0];
    G.o = glyphFrom([oLoc], 0, 4.5);
    // ö with a shorter bar over the o only (for running text)
    G['ö'] = glyphFrom([oLoc, [[44.8, -27.2], [49.5, -27.8], [55.2, -27.6]]], 0, 4.5);

    // capitals lettered to match (PADDA)
    G.P = glyphFrom(leaned([
        [[1.5, -32], [1.2, -22], [0.6, -11], [0, 0.5]],
        [[1.5, -32], [6.5, -32.8], [11, -31], [13.4, -27], [12.8, -22.4], [9.4, -19], [4.6, -17.6], [1.2, -18]]
    ], 0.14));
    G.A = glyphFrom(leaned([
        [[0, 0.5], [2.4, -9], [5, -19], [7.6, -32.6]],
        [[7.6, -32.6], [10.2, -21], [12.6, -10], [15.2, 0.8]],
        [[2.6, -11.2], [7.4, -12], [12.6, -11.8]]
    ], 0.1));

    // lowercase lettered to match (title and subtitle)
    G.k = glyphFrom(leaned([
        [[2.2, -36.5], [1.8, -24], [1.2, -12], [0.8, 0.5]],
        [[12.5, -19], [9.4, -15.4], [5.8, -11.8], [2, -8.6]],
        [[2.2, -8.8], [5.2, -6.2], [8.8, -3.4], [13.4, -0.6]]
    ]));
    G.l = glyphFrom(leaned([[[1.6, -36], [1.3, -24], [1, -11], [1.2, -3], [2.6, 0.2], [5, 0.4]]]));
    G.d = glyphFrom(leaned([
        [[12.4, -12.6], [10.6, -16.4], [7, -18], [3.4, -16.4], [1, -12], [0.6, -6.6], [2.4, -2], [6, -0.2], [9.6, -1.6], [12, -5.2]],
        [[14, -36.5], [13.4, -24], [12.6, -12], [12.2, 0.6]]
    ]));
    G.e = glyphFrom(leaned([[[1.4, -8.8], [6, -9.4], [11.6, -10.2], [12, -14], [9.4, -17.6], [5, -17.8], [1.6, -14], [0.6, -8], [1.8, -2.8], [5.6, -0.2], [10.4, -0.8], [12.6, -2.6]]]));
    G.n = glyphFrom(leaned([
        [[1.6, -18], [1.2, -9], [0.8, 0.5]],
        [[1.4, -10.4], [4, -15.2], [7.6, -17.4], [11, -16], [12.6, -11.6], [12.4, -5], [12.2, 0.6]]
    ]));
    G.m = glyphFrom(leaned([
        [[1.6, -18], [1.2, -9], [0.8, 0.5]],
        [[1.4, -10.4], [3.8, -15.4], [7, -17.2], [9.8, -15.4], [10.6, -10.6], [10.4, -4], [10.2, 0.6]],
        [[10.6, -11], [13, -15.6], [16.4, -17.4], [19.4, -15.4], [20.4, -10.6], [20.2, -4], [20, 0.6]]
    ]));
    G.c = glyphFrom(leaned([[[12, -15.2], [9, -17.8], [5, -17.4], [1.8, -13.6], [0.8, -7.6], [2.4, -2.2], [6.4, 0], [10.6, -1.2], [12.6, -3.2]]]));
    G.v = glyphFrom(leaned([[[0, -17.6], [2.4, -11], [4.6, -5], [6.8, 0.4], [9.2, -5.4], [11.4, -11.6], [13.8, -18]]]));
    G.i = glyphFrom(leaned([[[1.8, -17.4], [1.4, -9], [1, 0.4]], [[0, -25], [2.2, -25.4], [4.2, -25.8]]]));
    G.r = glyphFrom(leaned([
        [[1.6, -17.8], [1.2, -9], [0.8, 0.5]],
        [[1.4, -10.4], [3.6, -14.8], [7, -17.4], [10.6, -17.2]]
    ]));
    // small s for running text (hers is tall)
    G.sm = glyphFrom(G.s.strokes.map((st) => st.map(([x, y]) => [x * 0.8, y * 0.8 - 0.8])));
    // normalize: each glyph starts at x = 0
    for (const g of Object.values(G)) {
        const dx = -g.x0;
        g.strokes = g.strokes.map((st) => st.map(([x, y]) => [x + dx, y]));
        g.x1 += dx; g.x0 = 0;
    }
    return G;
}
export const HAND = buildHand();

/**
 * Lay out a word in her hand. Returns strokes in the upright frame (baseline 0).
 * `wander` gives each letter a small baseline drift like hers.
 */
export function writeWord(text, { gap = 3.2, wander = 1.6, seed = 7, map = {}, glyphs = {} } = {}) {
    const rand = pencil.rng(seed);
    const out = [];
    let x = 0;
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (ch === ' ') { x += 11; continue; }
        const g = glyphs[ch] || HAND[map[ch] || ch];
        if (!g) throw new Error(`no glyph for ${ch}`);
        const dy = (rand() - 0.5) * 2 * wander;
        out.push({ ch, strokes: g.strokes.map((st) => st.map(([px, py]) => [px + x, py + dy])), x0: x, x1: x + g.x1 });
        x += g.x1 + gap;
    }
    return { letters: out, width: x - gap };
}

/** Draw hand strokes (upright frame) into a sheet through a mapping f([x,y]) → px. */
export function drawHand(sh, strokes, f, { color = P.graphite, width = 3, pressure = 1.15, wobble = 0.35 } = {}) {
    for (const st of strokes) {
        const pts = st.map(f);
        const path = pts.length > 2 ? smooth(pts, { closed: false, steps: 5 }) : pts;
        sh.outline(color, path, { closed: false, width, wobble, passes: 2, alpha: 1, pressure, overshoot: 0.6, grain: 0.55 });
    }
}

// ---------------------------------------------------------------------------
// Klo's signs: SKÖLD and häst traced from her label, PADDA lettered to match
// ---------------------------------------------------------------------------
/** The pieces in her upright label frame (label px). */
const SIGN_TEXT = (() => {
    const skold = ['S', 'K', 'Obar', 'O', 'L', 'D'].flatMap(localStrokes);
    const hast = ['h', 'abar', 'a', 's', 't'].flatMap(localStrokes);
    const U = localStrokes('U')[0];
    const cut = 97;
    const uLeft = U.filter((p) => p[0] <= cut + 2);
    const uRight = U.filter((p) => p[0] >= cut - 2);
    // PADDA sits where häst sits in her label, on the same wandering line
    const padda = [];
    let x = 101;
    const drift = [1, -0.6, -1.8, -0.4, 1.4];
    ['P', 'A', 'D', 'D', 'A'].forEach((ch, i) => {
        const g = HAND[ch];
        const jit = i === 3 ? 0.97 : 1;
        for (const st of g.strokes) padda.push(st.map(([px, py]) => [x + px * jit, py * jit + drift[i]]));
        x += g.x1 * jit + (ch === 'A' ? 2.6 : 3.6);
    });
    return { skold, hast, padda, uLeft, uRight, cut };
})();

/** Board rectangles in the upright label frame (label px). */
const BOARD_L = [[-9, -47], [99, -47], [99, 19], [-9, 19]];
const BOARD_R = [[99, -47], [205, -47], [205, 21], [99, 21]];
function wobbleQuad(q, rand, amt = 1.6) {
    const pts = [];
    for (let i = 0; i < 4; i++) {
        const a = q[i], b = q[(i + 1) % 4];
        pts.push([a[0] + (rand() - 0.5) * amt, a[1] + (rand() - 0.5) * amt]);
        const n = 3;
        for (let k = 1; k < n; k++) {
            const t = k / n;
            pts.push([lerp(a[0], b[0], t) + (rand() - 0.5) * amt * 0.5, lerp(a[1], b[1], t) + (rand() - 0.5) * amt * 0.5]);
        }
    }
    return pts;
}

/**
 * Sign geometry. Each board is nailed a little crooked onto a straight stick, so
 * its lettering slants up to the right exactly like her label (LABEL_ANGLE).
 *   grip   px point on the stick (a claw, or the stick's foot in the sand)
 *   below  px from the nail (the board's middle) down to the grip, along the stick
 *   tilt   lean of the whole sign (rad, + = clockwise)
 *   k      px per label px
 */
const STICK_X = { skoldpadda: 45, skold: 45, hast: 152 };
export function signGeom(kind, grip, below, { tilt = 0, k = 1, board = LABEL_ANGLE } = {}) {
    const sx = STICK_X[kind];
    const down = [-Math.sin(tilt), Math.cos(tilt)];
    const nail = [grip[0] - down[0] * below, grip[1] - down[1] * below];
    const rot = board + tilt;
    const c = Math.cos(rot), s = Math.sin(rot);
    // the nail sits at label (sx, -4): the board's middle, just above the underline
    const o = [nail[0] - (sx * c - -4 * s) * k, nail[1] - (sx * s + -4 * c) * k];
    return { kind, sx, down, nail, rot, k, place: signPlacer(o, rot, k), tilt };
}

/** Draw one sign (stick, board(s), hinges, her lettering) from a signGeom. */
function drawSign(sh, g, { stickLen, stickTop = 0 } = {}) {
    const { kind, place, k, down, nail } = g;
    const rand = pencil.rng(hashSeed(sh.name + kind));
    const lw = Math.max(1.5, 2.2 * k);
    const boards = kind === 'skoldpadda' ? [BOARD_L, BOARD_R] : kind === 'hast' ? [BOARD_R] : [BOARD_L];
    // the stick (behind the board): a straight dowel from the nail down
    if (stickLen > 0) {
        const top = [nail[0] - down[0] * stickTop, nail[1] - down[1] * stickTop];
        const bot = [nail[0] + down[0] * stickLen, nail[1] + down[1] * stickLen];
        const m = taperMask(sh, [top, bot], 7.5 * k, 6.8 * k);
        part(sh, m, { base: N.stickWood, basePressure: 0.85, hatch: P.wood, hatchPressure: 0.75, angle: Math.atan2(down[1], down[0]) + 0.1, lineWidth: lw * 0.85 });
    }
    // folded-back PADDA flap peeking out behind the SKÖLD board
    if (kind === 'skold') {
        const flap = [[60, -50.5], [100.5, -49.5], [101.5, 23.5], [64, 22.5]].map(place);
        const m = sh.mask(flap);
        part(sh, m, { base: N.boardGrain, basePressure: 0.75, hatch: P.woodDark, hatchPressure: 0.55, angle: g.rot + 0.2, lineWidth: lw * 0.8 });
    }
    // boards: light wood, grain along the board, darker toward the edges
    for (const b of boards) {
        const q = wobbleQuad(b, rand, 1.8).map(place);
        const m = sh.mask(q);
        paperOver(sh, m); sh.cutout(m);
        sh.fill(N.boardWood, m, { pressure: 0.55, grain: 0.7 });
        sh.tone(N.boardWood, m, { pressure: 0.6, angle: g.rot + 0.05, gap: 2.3 });
        const spines = [];
        for (let gi = 0; gi < 6; gi++) {
            const yy = lerp(b[0][1] + 6, b[2][1] - 5, (gi + rand() * 0.6) / 6);
            const x0 = b[0][0] + 3 + rand() * 18, x1 = b[1][0] - 3 - rand() * 18;
            spines.push([[x0, yy], [lerp(x0, x1, 0.35), yy + (rand() - 0.5) * 2.4], [lerp(x0, x1, 0.7), yy + (rand() - 0.5) * 2.4], [x1, yy + (rand() - 0.5) * 1.6]].map(place));
        }
        sh.flow(N.boardGrain, spines, { count: 1, spread: 0.6, width: 1.2 * Math.max(0.8, k), alpha: [0.45, 0.75], clip: m, lengthFrac: [0.6, 1] });
        const band = edgeBand(m, sh.w, sh.h, 6 * k);
        sh.hatch(N.boardGrain, { angle: g.rot + 0.3, gap: 2, len: [5, 12], width: 1.3, clip: band, pressure: 0.55 });
        outlineMask(sh, m, P.graphite, { width: lw, wobble: 0.5 });
    }
    // two nails where the stick holds the board
    if (stickLen > 0) {
        const n1 = [nail[0] - down[0] * 5 * k, nail[1] - down[1] * 5 * k];
        const n2 = [nail[0] + down[0] * 9 * k, nail[1] + down[1] * 9 * k];
        sh.dots(P.graphite, [n1, n2], { rx: 1.5 * Math.max(0.8, k), ry: 1.5 * Math.max(0.8, k), alpha: 0.9, opaque: true });
    }
    // hinges between SKÖLD and PADDA
    if (kind === 'skoldpadda' || kind === 'skold') {
        for (const hy of [-37, 8]) {
            const q = [[95.5, hy], [102.5, hy], [102.5, hy + 8], [95.5, hy + 8]].map(place);
            const m = sh.mask(q);
            part(sh, m, { base: N.steel, basePressure: 0.8, lineWidth: lw * 0.7, angle: 0.8 });
            sh.dots(P.graphite, [place([97.5, hy + 4]), place([100.6, hy + 4])], { rx: 0.9 * Math.max(0.8, k), ry: 0.9 * Math.max(0.8, k), opaque: true });
        }
    }
    // the lettering (her strokes)
    const pen = { width: LABEL_STROKE * k * 0.95, pressure: 1.3 };
    const T = SIGN_TEXT;
    if (kind !== 'hast') {
        drawHand(sh, T.skold, place, pen);
        drawHand(sh, [T.uLeft], place, { ...pen, width: pen.width * 0.9 });
    }
    if (kind === 'skoldpadda') {
        drawHand(sh, T.padda, place, pen);
        drawHand(sh, [T.uRight], place, { ...pen, width: pen.width * 0.9 });
    }
    if (kind === 'hast') {
        drawHand(sh, T.hast, place, pen);
        drawHand(sh, [T.uRight], place, { ...pen, width: pen.width * 0.9 });
    }
}

/** Mapping label frame → px for a sign placed with its label origin at `o` (px), rotated `rot`, `k` px per label px. */
function signPlacer(o, rot, k) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return ([x, y]) => [o[0] + (x * c - y * s) * k, o[1] + (x * s + y * c) * k];
}

/** Sign density: texture px per label px at the npcs scale (1.5 px/wu). */
const SIGN_K = 0.62;
/** Standalone signs, planted: the anchor is the foot of the stick. */
export function buildSignFrames(scale = 1.5) {
    const out = [];
    for (const [name, kind] of [['sign-skoldpadda', 'skoldpadda'], ['sign-hast', 'hast'], ['sign-skold', 'skold']]) {
        const sh = sprite(name, 300, 200, scale);
        const k = SIGN_K * scale / 1.5;
        const stickPx = 58 * scale; // nail to foot: 58 wu
        const g = signGeom(kind, [sh.ox, sh.oy - 0.5], stickPx, { k });
        drawSign(sh, g, { stickLen: stickPx });
        out.push({ name, canvas: finish(sh, [0.5, 1]), anchor: [0.5, 1] });
    }
    return out;
}

export { drawSign, signPlacer, SIGN_TEXT, SIGN_K, BOARD_L, BOARD_R, STICK_X };

// ---------------------------------------------------------------------------
// Finishing: crop a drawn sheet to its ink, keeping the anchor exact
// ---------------------------------------------------------------------------
/**
 * Crop the sheet's canvas to the pixels that exist, symmetric around the anchor
 * so the anchor stays at `anchor` (e.g. [0.5, 1] stays bottom centre).
 */
export function finish(sh, anchor = [0.5, 1], margin = 3) {
    const cv = sh.toCanvas();
    const { w, h } = sh;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (sh.a[y * w + x] > 0.02) {
                if (x < x0) x0 = x; if (x > x1) x1 = x;
                if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
        }
    }
    if (x1 < 0) return cv;
    const ax = sh.ox, ay = sh.oy;
    const [fx, fy] = anchor;
    // widths either side of the anchor, in proportion fx : 1 - fx
    const left = ax - x0 + margin, right = x1 + 1 - ax + margin;
    let W = Math.ceil(Math.max(fx > 0 ? left / fx : 0, fx < 1 ? right / (1 - fx) : 0));
    const up = ay - y0 + margin, down = y1 + 1 - ay + margin;
    let H = Math.ceil(Math.max(fy > 0 ? up / fy : 0, fy < 1 ? down / (1 - fy) : 0));
    if (fx === 0.5 && W % 2) W++;
    if (fy === 0.5 && H % 2) H++;
    const out = createCanvas(W, H);
    out.getContext('2d').drawImage(cv, -(ax - fx * W), -(ay - fy * H));
    return out;
}

// ---------------------------------------------------------------------------
// Professor Klo — a small, very precise crab (≈ 84 wu wide, pencil red-orange)
// ---------------------------------------------------------------------------
/*
 * Klo is drawn front-on, like a crab in a children's book: a round red-orange
 * shell with a pale belly, two big eyes on stalks, two chunky pincers and three
 * pointed legs a side. "Facing right" = the eyes look right. A pose is data:
 *
 *   body:  { x, y, tilt }                 offset of the shell (wu) and lean (rad)
 *   eyes:  { look:[dx,dy], lid, mode, sway:[l, r] }   mode 'open' | 'happy' | 'shut'
 *   mouth: 'smile' | 'grin' | 'o' | 'flat' | 'sly' | 'wobbly'
 *   clawL / clawR: { at:[x,y], ang, open, elbow?:[x,y], size }  pincer centre in wu
 *   legs:  6 tips, each { dx, lift }  (left 1–3, right 1–3)
 *   hold:  items drawn between the arm and the pincer (signs, stopwatch, …)
 */
const KLO_SCALE = 1.5;
/** Klo is modelled a little large and drawn at 0.92, so he is ≈ 80 wu wide claws included. */
const KLO_SIZE = 0.92;
const KLO_BODY = [[-28, -27], [-26.5, -35.5], [-20, -42.5], [-9, -46.5], [2, -47.2], [13, -45.4], [22, -40], [27.5, -33], [28.6, -25], [26.2, -17.8], [18.5, -12.8], [7, -11], [-4, -10.8], [-14.5, -11.6], [-22.5, -14.2], [-27.2, -19.6]];
const KLO_RIM = [[-29, -22.5], [-20, -20.2], [-9, -19], [2, -18.8], [13, -19.6], [22, -21], [29.5, -23.8]];
const KLO_LEGS = [ // right side, from the front leg outward; left side mirrors
    { hip: [14.5, -14.5], knee: [23.5, -20.5], tip: [21.5, 0] },
    { hip: [18.5, -16.5], knee: [30.5, -20.5], tip: [30.5, 0] },
    { hip: [22, -19], knee: [36.5, -18], tip: [39, 0] }
];

function kloDefault() {
    return {
        body: { x: 0, y: 0, tilt: 0 },
        eyes: { look: [0.55, 0.05], lid: 0, mode: 'open', sway: [0, 0], size: 1 },
        mouth: 'smile',
        clawL: { at: [-33, -27], ang: -Math.PI / 2 - 0.55, open: 0.25, size: 1 },
        clawR: { at: [33, -29], ang: -Math.PI / 2 + 0.55, open: 0.25, size: 1 },
        legs: [0, 0, 0, 0, 0, 0].map(() => ({ dx: 0, lift: 0 })),
        hold: [],
        marks: null
    };
}

/** Pincer outline (wu): a round claw with a notch; `ang` points from the wrist to the tips. */
function pincerPts(c, ang, open, size = 1) {
    const R = 9.6 * size;
    const alpha = 0.1 + open * 0.5; // half-angle of the notch
    const pts = [];
    const along = (a, r, stretch = 1.12) => {
        // slightly longer along the pointing direction
        const u = dir(a - ang, r);
        return add(c, dir(ang, u[0] * stretch)).map((v, i) => v + dir(ang + Math.PI / 2, u[1])[i]);
    };
    const inner = add(c, dir(ang, R * 0.12));
    // upper finger tip (a touch longer and hooked), outer arc round the back, lower tip
    const upTip = along(ang - alpha, R * 1.08, 1.18);
    const loTip = along(ang + alpha, R * 0.98, 1.1);
    pts.push(inner, add(inner, dir(ang - alpha * 0.6, R * 0.55)), upTip);
    const a0 = ang - alpha - 0.18, a1 = ang + alpha + 0.18 - TAU;
    for (let i = 0; i <= 22; i++) {
        const a = lerp(a0, a1, i / 22);
        const back = Math.cos(a - ang) < 0 ? 0.94 : 1; // the palm is a little flatter at the back
        pts.push(along(a, R * back));
    }
    pts.push(loTip, add(inner, dir(ang + alpha * 0.6, R * 0.52)));
    return pts;
}

/** Klo's red-orange pencil: a warm base pressed firmly, hatching across it, deeper toward the edge. */
function kloPaint(sh, m, angle = -0.7, { rimW = 3, line: lw = 2, layers = 2 } = {}) {
    paperOver(sh, m); sh.cutout(m);
    sh.fill(N.kloShellLight, m, { pressure: 0.72, grain: 0.6 });
    sh.hatch(N.kloShell, { angle, gap: 1.9, len: [7, 18], width: 1.6, clip: m, pressure: 1.0, layers, crossAngle: 1.15 });
    sh.burnish(m, 1, 0.3);
    const band = edgeBand(m, sh.w, sh.h, rimW * sh.S);
    sh.hatch(N.kloShellDeep, { angle: angle - 0.3, gap: 2, len: [5, 12], width: 1.4, clip: band, pressure: 0.75 });
    if (lw) outlineMask(sh, m, P.graphite, { width: lw, wobble: 0.5 });
    return m;
}

/** Draw Professor Klo in a pose into a sprite sheet whose origin is the ground point. */
function drawKlo(sh, pose, only = null) {
    const S = sh.S;
    const bx = pose.body.x, by = pose.body.y, tilt = pose.body.tilt || 0;
    // body-space → world (wu): rotate about the ground point under the body, then offset
    const B = ([x, y]) => {
        const c = Math.cos(tilt), s = Math.sin(tilt);
        return [bx + x * c - y * s, by + x * s + y * c];
    };
    const W = (pts) => sh.T(pts);
    const Wb = (pts) => sh.T(pts.map(B));
    const lw = 2.3;

    // --- things held low behind Klo -------------------------------------------
    for (const item of pose.hold.filter((h) => h.layer === 'behind')) item.draw(sh, pose, pose[item.claw].at);

    // --- legs (behind) ---------------------------------------------------
    const legMasks = [];
    for (let side = -1; side <= 1; side += 2) {
        KLO_LEGS.forEach((L, i) => {
            const idx = (side < 0 ? 0 : 3) + i;
            const lg = pose.legs[idx];
            const hip = B([L.hip[0] * side, L.hip[1]]);
            const tip = [L.tip[0] * side + lg.dx + bx * 0.35, -lg.lift];
            const kneeBase = B([L.knee[0] * side, L.knee[1]]);
            const knee = [lerp(kneeBase[0], tip[0], 0.12) + side * 1.5, kneeBase[1] - lg.lift * 0.5];
            const m = taperMask(sh, W([hip, knee]), 5.4 * S, 4.4 * S);
            const m2 = taperMask(sh, W([knee, tip]), 4.4 * S, 1.3 * S);
            legMasks.push(unionMasks(m, m2));
        });
    }
    // far legs first (outer ones), so the front legs overlap nicely
    for (const order of [2, 5, 1, 4, 0, 3]) if (!only || only === 'leg-' + order) kloPaint(sh, legMasks[order], 1.2, { rimW: 1.6, line: 1.9, layers: 1 });

    // --- eye stalks (behind the shell) -------------------------------------
    const eyeC = [];
    for (let side = -1; side <= 1; side += 2) {
        const sway = pose.eyes.sway[side < 0 ? 0 : 1] || 0;
        const base = [7.5 * side, -41];
        const topNeutral = [9.8 * side, -56.5];
        const len = Math.hypot(topNeutral[0] - base[0], topNeutral[1] - base[1]);
        const a0 = Math.atan2(topNeutral[1] - base[1], topNeutral[0] - base[0]) + sway;
        const top = add(base, dir(a0, len));
        const mid = add(add(base, dir(a0, len * 0.5)), [side * 0.6, 0]);
        const m = taperMask(sh, Wb([base, mid, top]), 5.2 * S, 4.4 * S);
        if (!only || only === (side < 0 ? 'eye-l' : 'eye-r')) kloPaint(sh, m, 1.35, { rimW: 1.4, line: 1.9, layers: 1 });
        eyeC.push(add(base, dir(a0, len + 6.2 * pose.eyes.size)));
    }

    if (!only || only === 'body') {
    // --- shell and belly ---------------------------------------------------
    const bodyPts = Wb(smooth(KLO_BODY, { closed: true, steps: 6 }));
    const bodyM = sh.mask(bodyPts);
    paperOver(sh, bodyM); sh.cutout(bodyM);
    const rim = smooth(KLO_RIM, { closed: false, steps: 5 });
    const bellyPoly = Wb([...rim, [31, 2], [-31, 2]]);
    const bellyM = multiplyMasks(bodyM, sh.mask(bellyPoly));
    const shellM = subtractMask(bodyM, bellyM);
    // shell: warm base, hatching that follows the dome, deeper toward the rim, a paper highlight
    sh.fill(N.kloShellLight, shellM, { pressure: 0.72, grain: 0.6 });
    sh.hatch(N.kloShell, { angle: -0.75 + tilt, gap: 1.9, len: [10, 24], width: 1.7, clip: shellM, pressure: 1.0, layers: 2, crossAngle: 1.25 });
    sh.burnish(shellM, 1, 0.3);
    const shellBand = edgeBand(shellM, sh.w, sh.h, 7 * S);
    sh.hatch(N.kloShellDeep, { angle: -0.5, gap: 2, len: [6, 16], width: 1.5, clip: shellBand, pressure: 0.8 });
    const [hx, hy] = sh.pt(B([-12, -38]));
    const hiM = sh.mask(ellipse(hx, hy, 6.5 * S, 3.4 * S, 24, -0.35), { feather: 2.5 });
    paperOver(sh, multiplyMasks(hiM, shellM).map((v) => v * 0.8));
    // belly: pale peach with a little shade at the bottom
    sh.fill(N.kloBelly, bellyM, { pressure: 0.75, grain: 0.6 });
    sh.tone(N.kloBelly, bellyM, { pressure: 0.8, angle: 0.15, gap: 2.2 });
    const bellyShade = gradientMap(sh.w, sh.h, 0, sh.oy + (by - 20) * S, 0, sh.oy + (by - 10) * S, 0, 1);
    sh.hatch(N.kloBellyShade, { angle: 0.25, gap: 2.2, len: [6, 14], width: 1.3, clip: bellyM, pmap: bellyShade, pressure: 0.8 });
    // the rim line and a few belly segments
    line(sh, Wb(rim), P.graphite, { width: 1.6, wobble: 0.4, alpha: 0.85 });
    for (const sx of [-8, 0, 8]) line(sh, Wb([[sx, -18.8], [sx * 1.1, -14.5], [sx * 1.15, -11.6]]), P.graphiteSoft, { width: 1.1, alpha: 0.55, passes: 1 });
    outlineMask(sh, bodyM, P.graphite, { width: lw * 1.05, wobble: 0.55 });

    // --- mouth ---------------------------------------------------------------
    const mouth = {
        smile: [[-4.5, -27.8], [-2, -25.9], [1, -25.5], [4.2, -27.2]],
        grin: [[-6.5, -28.6], [-3.5, -25.4], [0.5, -24.6], [4.5, -25.6], [7, -28.4]],
        flat: [[-3.5, -26.4], [0, -26.1], [3.5, -26.5]],
        sly: [[-4, -26.2], [-1, -25.8], [2.5, -26.4], [4.8, -28]],
        wobbly: [[-5, -26.4], [-2.5, -27.4], [0, -26.2], [2.5, -27.4], [5, -26.2]]
    }[pose.mouth];
    if (mouth) line(sh, Wb(mouth), P.graphite, { width: 1.7, wobble: 0.3, alpha: 0.95 });
    if (pose.mouth === 'o') {
        const [mx, my] = sh.pt(B([0.5, -26.5]));
        const m = sh.mask(ellipse(mx, my, 2.3 * S, 2.7 * S, 20));
        sh.fill(N.kloTip, m, { pressure: 0.9 });
        outlineMask(sh, m, P.graphite, { width: 1.5 });
    }
    if (pose.mouth === 'grin') {
        // a little open grin: dark inside
        const inside = Wb(smooth([[-6, -28.2], [-3.4, -25.6], [0.5, -24.9], [4.4, -25.8], [6.6, -28], [3, -27.6], [-2, -27.6]], { closed: true, steps: 4 }));
        sh.fill(N.kloTip, sh.mask(inside), { pressure: 0.85 });
    }

    }
    // --- eyes ------------------------------------------------------------------
    eyeC.forEach((c0, i) => {
        if (only && only !== (i === 0 ? 'eye-l' : 'eye-r')) return;
        const side = i === 0 ? -1 : 1;
        const r = 8.4 * pose.eyes.size;
        const [cx, cy] = sh.pt(B(c0));
        const eyeM = sh.mask(ellipse(cx, cy, r * S, r * S * 1.04, 40));
        reserve(sh, eyeM);
        // a faint shade on the lower edge of the eyeball
        const shadeB = edgeBand(eyeM, sh.w, sh.h, 3 * S);
        sh.hatch(P.skyBlue, { angle: 0.6, gap: 2.4, len: [4, 10], width: 1.1, clip: multiplyMasks(shadeB, gradientMap(sh.w, sh.h, 0, cy, 0, cy + r * S, 0, 1)), pressure: 0.45 });
        const mode = pose.eyes.mode;
        if (mode === 'open') {
            const [lx, ly] = pose.eyes.look;
            const pr = r * 0.52;
            const px = cx + lx * (r - pr - 0.6) * S, py = cy + ly * (r - pr - 0.6) * S;
            const pm = sh.mask(ellipse(px, py, pr * S, pr * S * 1.08, 28));
            sh.fill(P.eye, pm, { pressure: 1, grain: 0.35 });
            sh.hatch(P.graphite, { angle: 0.8, gap: 1.6, len: [4, 10], width: 1.2, clip: pm, pressure: 0.9 });
            const hl = sh.mask(ellipse(px - pr * 0.36 * S, py - pr * 0.4 * S, pr * 0.34 * S, pr * 0.34 * S, 16));
            paperOver(sh, hl);
            const hl2 = sh.mask(ellipse(px + pr * 0.35 * S, py + pr * 0.38 * S, pr * 0.14 * S, pr * 0.14 * S, 12));
            paperOver(sh, hl2.map((v) => v * 0.8));
        }
        if (pose.eyes.lid > 0 && mode === 'open') {
            // an upper lid in shell colour: precise, a bit sly
            const lidY = cy - r * S + pose.eyes.lid * 2 * r * S * 0.62;
            const lidM = multiplyMasks(eyeM, sh.mask([[cx - 2 * r * S, cy - 2 * r * S], [cx + 2 * r * S, cy - 2 * r * S], [cx + 2 * r * S, lidY + side * 0.8 * S], [cx - 2 * r * S, lidY - side * 0.8 * S]]));
            paperOver(sh, lidM);
            sh.tone(N.kloShellLight, lidM, { pressure: 0.7 });
            sh.hatch(N.kloShell, { angle: 0.2, gap: 2, len: [6, 14], width: 1.4, clip: lidM, pressure: 0.85 });
            line(sh, [[cx - r * S * 0.98, lidY - side * 0.8 * S], [cx, lidY + 0.3 * S], [cx + r * S * 0.98, lidY + side * 0.8 * S]], P.graphite, { width: 1.8, alpha: 0.95 });
        }
        if (mode === 'happy') {
            // eyes squeezed shut in a smile: ^  ^
            const arc = [[cx - r * 0.62 * S, cy + r * 0.2 * S], [cx - r * 0.3 * S, cy - r * 0.2 * S], [cx, cy - r * 0.34 * S], [cx + r * 0.3 * S, cy - r * 0.2 * S], [cx + r * 0.62 * S, cy + r * 0.2 * S]];
            line(sh, arc, P.graphite, { width: 2.6, alpha: 1 });
        }
        if (mode === 'shut') {
            const arc = [[cx - r * 0.62 * S, cy], [cx - r * 0.3 * S, cy + r * 0.25 * S], [cx, cy + r * 0.3 * S], [cx + r * 0.3 * S, cy + r * 0.25 * S], [cx + r * 0.62 * S, cy]];
            line(sh, arc, P.graphite, { width: 2.4, alpha: 1 });
        }
        outlineMask(sh, eyeM, P.graphite, { width: 2.1, wobble: 0.4 });
        // a determined little brow for some poses
        if (pose.eyes.brow) {
            const b = pose.eyes.brow[i];
            if (b != null) {
                const y0 = cy - r * S * 1.32;
                line(sh, [[cx - r * 0.55 * S, y0 + b * S * side * -1], [cx + r * 0.55 * S, y0 - b * S * side * -1]], P.graphite, { width: 2.2, alpha: 0.95, smoothIt: false });
            }
        }
    });

    // --- arms, held things, pincers ------------------------------------------
    const claws = [['clawL', -1], ['clawR', 1]];
    for (const [key, side] of claws) {
        const cl = pose[key];
        if (!cl || cl.hidden || (only && only !== (side < 0 ? 'arm-l' : 'arm-r'))) continue;
        const shoulder = B([21.5 * side, -22]);
        const c = cl.at;
        const wrist = add(c, dir(cl.ang + Math.PI, 8.2 * (cl.size || 1)));
        const elbow = cl.elbow || [lerp(shoulder[0], wrist[0], 0.5) + side * 3, lerp(shoulder[1], wrist[1], 0.5) + 3];
        const armM = unionMasks(taperMask(sh, W([shoulder, elbow]), 6.6 * S, 6 * S), taperMask(sh, W([elbow, wrist]), 6 * S, 5.6 * S));
        kloPaint(sh, armM, Math.atan2(wrist[1] - shoulder[1], wrist[0] - shoulder[0]) + 1.2, { rimW: 1.8, line: 2, layers: 1 });
        // things held in this claw are drawn between the arm and the pincer
        for (const item of pose.hold.filter((h) => h.claw === key && (h.layer === 'mid' || h.layer === 'back'))) item.draw(sh, pose, c);
        const pinPts = W(smooth(pincerPts(c, cl.ang, cl.open, cl.size || 1), { closed: true, steps: 3 }));
        const pm = sh.mask(pinPts);
        kloPaint(sh, pm, cl.ang + 0.9, { rimW: 2.6, line: 0 });
        // darker fingertips
        const [tx, ty] = sh.pt(add(c, dir(cl.ang, 9.5 * (cl.size || 1))));
        const tipM = multiplyMasks(pm, sh.mask(ellipse(tx, ty, 7 * S, 9 * S, 24, cl.ang), { feather: 3 }));
        sh.hatch(N.kloTip, { angle: cl.ang + 0.5, gap: 2, len: [5, 12], width: 1.4, clip: tipM, pressure: 0.75 });
        // a highlight on the palm
        const [px, py] = sh.pt(add(c, dir(cl.ang + Math.PI * 0.75, 3.6)));
        paperOver(sh, multiplyMasks(pm, sh.mask(ellipse(px, py, 3.2 * S, 2 * S, 16, cl.ang), { feather: 2 })).map((v) => v * 0.75));
        outlineMask(sh, pm, P.graphite, { width: lw, wobble: 0.5 });
        for (const item of pose.hold.filter((h) => h.claw === key && h.layer === 'front')) item.draw(sh, pose, c);
    }
    // --- extra marks (joy lines, sweat, psst) ---------------------------------
    if (!only && pose.marks) pose.marks(sh, B);
}

/**
 * A sign held in a claw: the claw grips the stick `below` wu under the nail
 * (the board's middle); the stick runs on `stickBelow` wu past the claw.
 */
function heldSign(claw, kind, { below = 30, tilt = 0, stickBelow = 7, layer = 'mid' } = {}) {
    return {
        claw, layer,
        draw(sh, pose, c) {
            const S = sh.S;
            const g = signGeom(kind, sh.pt(c), below * S, { tilt, k: SIGN_K * S / 1.5 });
            drawSign(sh, g, { stickLen: (below + stickBelow) * S });
        }
    };
}

/** Where the claws must be so that SKÖLD and häst line up exactly as in her label. */
function foldedGrips(labelOrigin, gripY) {
    const f = SIGN_K / 1.5; // wu per label px
    const c = Math.cos(LABEL_ANGLE), s = Math.sin(LABEL_ANGLE);
    const nail = (sx) => [labelOrigin[0] + (sx * c - -4 * s) * f, labelOrigin[1] + (sx * s + -4 * c) * f];
    const nl = nail(STICK_X.skold), nr = nail(STICK_X.hast);
    return { left: [nl[0], gripY], right: [nr[0], gripY], belowL: gripY - nl[1], belowR: gripY - nr[1] };
}

/** Stopwatch held in a claw (drawn over the pincer so the face shows). */
function heldStopwatch(claw, { at = [0, -13], r = 8.4 } = {}) {
    return {
        claw, layer: 'front',
        draw(sh, pose, c) {
            const S = sh.S;
            const cc = add(c, at);
            const [cx, cy] = sh.pt(cc);
            // crown button and ring
            const crown = sh.mask([[cx - 2.2 * S, cy - (r + 4.2) * S], [cx + 2.2 * S, cy - (r + 4.2) * S], [cx + 2.2 * S, cy - (r - 1) * S], [cx - 2.2 * S, cy - (r - 1) * S]]);
            part(sh, crown, { base: N.steel, basePressure: 0.8, lineWidth: 1.6 });
            const ring = strokeMask(sh, ellipse(cx, cy - (r + 5.6) * S, 2.2 * S, 1.8 * S, 16).concat([ellipse(cx, cy - (r + 5.6) * S, 2.2 * S, 1.8 * S, 16)[0]]), 1.4 * S);
            sh.cutout(ring); sh.fill(N.steelDark, ring, { pressure: 0.9 });
            const side = sh.mask([[cx + (r - 1) * S, cy - (r - 2.5) * S], [cx + (r + 3) * S, cy - (r + 0.5) * S], [cx + (r + 4.2) * S, cy - (r - 1.8) * S], [cx + (r + 0.6) * S, cy - (r - 4.6) * S]]);
            part(sh, side, { base: N.steel, basePressure: 0.8, lineWidth: 1.4 });
            // case and face
            const caseM = sh.mask(ellipse(cx, cy, r * S, r * S, 40));
            part(sh, caseM, { base: N.steel, basePressure: 0.75, hatch: N.steelDark, hatchPressure: 0.4, angle: 0.7, lineWidth: 2 });
            const faceM = sh.mask(ellipse(cx, cy, (r - 2) * S, (r - 2) * S, 40));
            reserve(sh, faceM);
            outlineMask(sh, faceM, P.graphiteSoft, { width: 1.2, wobble: 0.3 });
            const ticks = [];
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * TAU;
                const r0 = (r - 2.2) * S, r1 = (r - (i % 3 === 0 ? 4.4 : 3.3)) * S;
                ticks.push([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]]);
            }
            for (const t of ticks) line(sh, t, P.graphite, { width: 1, passes: 1, alpha: 0.8, smoothIt: false });
            // the hand: at "42,7"
            const ha = -Math.PI / 2 + 0.72 * TAU;
            line(sh, [[cx, cy], [cx + Math.cos(ha) * (r - 3.4) * S, cy + Math.sin(ha) * (r - 3.4) * S]], P.red, { width: 1.8, passes: 1, smoothIt: false });
            sh.dots(P.graphite, [[cx, cy]], { rx: 1.2, ry: 1.2, opaque: true });
        }
    };
}

/** A small notebook held open in a claw. */
function heldNotebook(claw, { at = [2, -8], rot = 0.18, w = 26, h = 16 } = {}) {
    return {
        claw, layer: 'front',
        draw(sh, pose, c) {
            const S = sh.S;
            const cc = add(c, at);
            const q = (pts) => sh.T(transform(pts, { x: cc[0], y: cc[1], rot }));
            // cover behind the pages
            const cover = q([[-w / 2 - 1.8, -h / 2 - 1.2], [w / 2 + 1.8, -h / 2 - 1.2], [w / 2 + 1.8, h / 2 + 2], [0, h / 2 + 3], [-w / 2 - 1.8, h / 2 + 2]]);
            const cm = sh.mask(cover);
            part(sh, cm, { base: N.notebook, basePressure: 0.8, hatch: N.notebook, hatchPressure: 0.6, angle: 0.3, lineWidth: 1.8 });
            for (const sgn of [-1, 1]) {
                const page = q(smooth([[0, -h / 2 + 1.2], [sgn * w * 0.25, -h / 2 - 0.4], [sgn * w / 2, -h / 2 + 0.2], [sgn * w / 2, h / 2], [sgn * w * 0.25, h / 2 - 0.6], [0, h / 2 + 1.4]], { closed: true, steps: 3 }));
                const pm = sh.mask(page);
                reserve(sh, pm);
                outlineMask(sh, pm, P.graphite, { width: 1.5, wobble: 0.3 });
                // scribbled notes
                for (let li = 0; li < 4; li++) {
                    const yy = -h / 2 + 3.6 + li * 3.3;
                    const x0 = sgn > 0 ? 2.2 : -w / 2 + 2, x1 = sgn > 0 ? w / 2 - 2 - (li === 3 ? 5 : 0) : -2.2;
                    const pts = [];
                    for (let xx = x0; xx <= x1; xx += 1.2) pts.push([xx, yy + Math.sin(xx * 1.9 + li) * 0.45]);
                    line(sh, q(pts), P.graphiteSoft, { width: 1, passes: 1, alpha: 0.7, smoothIt: false });
                }
            }
        }
    };
}

/** A tiny pencil in a claw (for writing in the notebook). */
function heldPencil(claw, { at = [-4, -6], ang = 2.3, len = 17 } = {}) {
    return {
        claw, layer: 'front',
        draw(sh, pose, c) {
            const S = sh.S;
            const a = add(c, at);
            const b = add(a, dir(ang, len));
            const tipBase = add(a, dir(ang, len - 4.2));
            const body = taperMask(sh, sh.T([a, tipBase]), 3.4 * S, 3.4 * S);
            part(sh, body, { base: N.pencilYellow, basePressure: 0.85, lineWidth: 1.4, angle: ang });
            const cone = sh.mask(sh.T([add(tipBase, dir(ang + Math.PI / 2, 1.7)), b, add(tipBase, dir(ang - Math.PI / 2, 1.7))]));
            part(sh, cone, { base: N.pencilWood, basePressure: 0.8, lineWidth: 1.2 });
            const lead = sh.mask(sh.T([add(b, dir(ang + Math.PI - 0.35, 1.8)), b, add(b, dir(ang + Math.PI + 0.35, 1.8))]));
            sh.cutout(lead); sh.fill(P.graphite, lead, { pressure: 1 });
            const er = taperMask(sh, sh.T([a, add(a, dir(ang + Math.PI, 2.6))]), 3.4 * S, 3.4 * S);
            part(sh, er, { base: N.eraserPink, basePressure: 0.8, lineWidth: 1.2 });
        }
    };
}

/** The torn map corner (signed /K), held up. */
function heldMapCorner(claw, { at = [8, -16], rot = -0.25, s = 1 } = {}) {
    return {
        claw, layer: 'back',
        draw(sh, pose, c) {
            const cc = add(c, at);
            const q = (pts) => sh.T(transform(pts, { x: cc[0], y: cc[1], rot, sx: s, sy: s }));
            // a paper triangle: two straight page edges and one torn edge
            const torn = [[-16, 14]];
            const rnd = pencil.rng(99);
            for (let i = 1; i < 12; i++) {
                const t = i / 12;
                torn.push([lerp(-16, 16, t) + (rnd() - 0.5) * 1.6, lerp(14, -16, t) + (rnd() - 0.5) * 3.4]);
            }
            const shape = [[-16, -16], [16, -16], ...torn.reverse().slice(0, -1), [-16, 14]];
            const pm = sh.mask(q(shape.reverse()));
            reserve(sh, pm);
            sh.tone(P.paperCream, pm, { pressure: 0.35 });
            // a bit of the map: sea hatching, a coastline, a dune and a dashed path
            const sea = multiplyMasks(pm, sh.mask(q([[-16, -16], [16, -16], [16, -5], [4, -8], [-6, -4], [-16, -6]])));
            sh.hatch(P.seaBlue, { angle: 0.02, gap: 2.2, len: [6, 16], width: 1.2, clip: sea, pressure: 0.6 });
            line(sh, q([[-16, -6], [-6, -4.2], [4, -8], [16, -5]]), P.foamLine, { width: 1.4, alpha: 0.9 });
            line(sh, q([[-13, 4], [-9, 0.5], [-5, 3.5], [-1, 1]]), P.sandShadow, { width: 1.3, alpha: 0.8 });
            for (let i = 0; i < 3; i++) line(sh, q([[-12 + i * 5, 9 - i * 2.5], [-9.5 + i * 5, 8 - i * 2.5]]), P.graphite, { width: 1.1, passes: 1, smoothIt: false });
            // "/K" in the corner
            line(sh, q([[5.5, -2], [2.5, 5]]), P.graphite, { width: 1.4, passes: 1, smoothIt: false });
            line(sh, q([[7, -2.4], [6.5, 5]]), P.graphite, { width: 1.4, passes: 1, smoothIt: false });
            line(sh, q([[10.5, -2.6], [7, 1.4], [10.6, 4.6]]), P.graphite, { width: 1.4, passes: 1, smoothIt: false });
            outlineMask(sh, pm, P.graphite, { width: 1.7, wobble: 0.4 });
        }
    };
}

/** Walk legs: sideways scuttle, 4 frames. Legs move in two alternating groups. */
function walkLegs(phase) {
    const groups = [0, 1, 0, 1, 0, 1]; // left1,left2,left3,right1,right2,right3
    return groups.map((g, i) => {
        const ph = phase * TAU + (g ? Math.PI : 0) + (i % 3) * 0.25;
        const s = Math.sin(ph);
        return { dx: Math.cos(ph) * 5.4, lift: Math.max(0, s) * 7.5 };
    });
}

/** All of Klo's frames as [name, pose]. */
function kloPoses() {
    const D = kloDefault;
    const poses = [];
    const P0 = (f) => { const p = D(); f(p); return p; };
    // idle: the right claw raised a little, professor-like
    poses.push(['klo-idle-1', P0((p) => {
        p.clawR = { at: [34, -38], ang: -Math.PI / 2 + 0.25, open: 0.15 };
        p.clawL = { at: [-33, -25], ang: -Math.PI / 2 - 0.75, open: 0.2 };
    })]);
    poses.push(['klo-idle-2', P0((p) => {
        p.body.y = -1.4;
        p.clawR = { at: [34.5, -40.5], ang: -Math.PI / 2 + 0.18, open: 0.6 };
        p.clawL = { at: [-33.5, -26], ang: -Math.PI / 2 - 0.7, open: 0.4 };
        p.eyes.sway = [-0.05, 0.06];
        p.eyes.look = [0.6, -0.1];
    })]);
    // walk: sideways scuttle to the right
    for (let f = 0; f < 4; f++) {
        poses.push([`klo-walk-${f + 1}`, P0((p) => {
            const ph = f / 4;
            p.legs = walkLegs(ph);
            p.body.y = -1.2 - Math.abs(Math.sin(ph * TAU * 2)) * 1.6;
            p.body.x = Math.sin(ph * TAU) * 0.8;
            p.body.tilt = 0.03 + Math.sin(ph * TAU) * 0.025;
            p.eyes.sway = [-0.1 - Math.sin(ph * TAU) * 0.05, -0.08 - Math.sin(ph * TAU) * 0.05];
            p.eyes.look = [0.8, 0];
            p.mouth = 'smile';
            p.clawL = { at: [-32, -30 + Math.sin(ph * TAU + 1) * 1.6], ang: -Math.PI / 2 - 0.6, open: 0.2 };
            p.clawR = { at: [34, -31 + Math.sin(ph * TAU) * 1.6], ang: -Math.PI / 2 + 0.6, open: 0.2 };
        })]);
    }
    // the signs (SKÖLDPADDA always in the left claw, häst in the right)
    poses.push(['klo-signs', P0((p) => {
        p.clawL = { at: [-34, -46], ang: -Math.PI / 2 - 0.12, open: 0.1 };
        p.clawR = { at: [48, -30], ang: -Math.PI / 2 + 0.3, open: 0.1, elbow: [36, -20] };
        p.hold = [heldSign('clawL', 'skoldpadda', { below: 36 }), heldSign('clawR', 'hast', { below: 22 })];
        p.eyes.look = [0, -0.75];
        p.mouth = 'flat';
    })]);
    poses.push(['klo-sign-left', P0((p) => {
        p.body.tilt = -0.04;
        p.clawL = { at: [-32, -58], ang: -Math.PI / 2 - 0.1, open: 0.1 };
        p.clawR = { at: [38, -20], ang: -Math.PI / 2 + 0.9, open: 0.1 };
        p.hold = [heldSign('clawL', 'skoldpadda', { below: 36 }), heldSign('clawR', 'hast', { below: 16, tilt: 0.5, stickBelow: 5 })];
        p.eyes.look = [-0.45, -0.8];
        p.eyes.sway = [-0.08, -0.08];
        p.mouth = 'smile';
    })]);
    poses.push(['klo-sign-right', P0((p) => {
        p.body.tilt = 0.04;
        p.clawR = { at: [33, -58], ang: -Math.PI / 2 + 0.1, open: 0.1 };
        p.clawL = { at: [-46, -15], ang: -Math.PI / 2 - 0.5, open: 0.1 };
        p.hold = [heldSign('clawR', 'hast', { below: 34 }), heldSign('clawL', 'skoldpadda', { below: 14, tilt: 0.26, stickBelow: 4 })];
        p.eyes.look = [0.45, -0.8];
        p.eyes.sway = [0.08, 0.08];
        p.mouth = 'smile';
    })]);
    poses.push(['klo-sign-folded', P0((p) => {
        const g = foldedGrips([-39.5, -80], -40);
        p.clawL = { at: g.left, ang: -Math.PI / 2 - 0.08, open: 0.1 };
        p.clawR = { at: g.right, ang: -Math.PI / 2 + 0.08, open: 0.1 };
        p.hold = [heldSign('clawL', 'skold', { below: g.belowL }), heldSign('clawR', 'hast', { below: g.belowR })];
        p.eyes.mode = 'happy';
        p.eyes.sway = [0.06, -0.06];
        p.mouth = 'grin';
    })]);
    poses.push(['klo-stopwatch', P0((p) => {
        p.clawR = { at: [37, -48], ang: -Math.PI / 2 + 0.3, open: 0.32 };
        p.clawL = { at: [-31, -22], ang: Math.PI / 2 + 0.9, open: 0.1 };
        p.hold = [heldStopwatch('clawR', { at: [0.5, -15], r: 8.8 })];
        p.eyes.look = [0.95, -0.35];
        p.eyes.lid = 0.3;
        p.eyes.sway = [0.1, 0.12];
        p.mouth = 'flat';
    })]);
    poses.push(['klo-notebook', P0((p) => {
        p.clawL = { at: [-21, -22], ang: -Math.PI / 2 + 0.35, open: 0.3 };
        p.clawR = { at: [23, -30], ang: -Math.PI / 2 - 0.5, open: 0.2 };
        p.hold = [heldNotebook('clawL', { at: [16, -7], rot: 0.12 }), heldPencil('clawR', { at: [-3, -3], ang: 2.35, len: 16 })];
        p.eyes.look = [-0.1, 0.85];
        p.eyes.lid = 0.3;
        p.eyes.sway = [0.08, -0.08];
        p.mouth = 'flat';
    })]);
    poses.push(['klo-point', P0((p) => {
        p.body.tilt = 0.06;
        p.clawR = { at: [52, -36], ang: -0.12, open: 0.05, elbow: [38, -30] };
        p.clawL = { at: [-31, -22], ang: Math.PI / 2 + 0.9, open: 0.1 };
        p.eyes.look = [0.95, -0.1];
        p.eyes.sway = [0.12, 0.12];
        p.mouth = 'o';
    })]);
    poses.push(['klo-whisper', P0((p) => {
        p.body.y = 2.5; p.body.tilt = 0.14; p.body.x = 1.5;
        p.legs = p.legs.map((l, i) => ({ dx: i < 3 ? 1.5 : -1, lift: 0 }));
        p.clawR = { at: [25, -29], ang: -Math.PI / 2 - 0.8, open: 0.38, size: 0.9, elbow: [35, -18] };
        p.clawL = { at: [-31, -21], ang: Math.PI / 2 + 0.9, open: 0.1 };
        p.eyes.look = [0.95, 0.15];
        p.eyes.lid = 0.45;
        p.eyes.sway = [0.2, 0.2];
        p.mouth = 'sly';
        p.marks = (sh) => {
            // a whisper: three small dotted arcs drifting right
            for (let k = 0; k < 3; k++) {
                const r = 5 + k * 4.2;
                const pts = [];
                for (let a = -0.55; a <= 0.55; a += 0.22) pts.push([30 + Math.cos(a) * r, -31 + Math.sin(a) * r]);
                sh.dots(P.graphiteSoft, sh.T(pts), { rx: 1.1, ry: 1.1, alpha: 0.85, opaque: true });
            }
        };
    })]);
    poses.push(['klo-map-corner', P0((p) => {
        p.clawR = { at: [31, -50], ang: -Math.PI / 2 + 0.2, open: 0.2 };
        p.clawL = { at: [-35, -38], ang: -0.95, open: 0.08, elbow: [-36, -24] };
        p.hold = [heldMapCorner('clawR', { at: [-1, -21], rot: -0.18 })];
        p.eyes.look = [0.55, -0.7];
        p.mouth = 'o';
    })]);
    poses.push(['klo-happy', P0((p) => {
        p.body.y = -3;
        p.legs = p.legs.map((l, i) => ({ dx: (i < 3 ? -1 : 1) * 1.5, lift: 0 }));
        p.clawL = { at: [-38, -62], ang: -Math.PI / 2 - 0.45, open: 0.85 };
        p.clawR = { at: [38, -62], ang: -Math.PI / 2 + 0.45, open: 0.85 };
        p.eyes.mode = 'happy';
        p.eyes.sway = [-0.12, 0.12];
        p.mouth = 'grin';
        p.marks = (sh, B) => {
            for (const side of [-1, 1]) {
                for (let k = 0; k < 3; k++) {
                    const a = -Math.PI / 2 + side * (0.55 + k * 0.38);
                    const c0 = [side * 38, -64];
                    line(sh, sh.T([add(c0, dir(a, 15)), add(c0, dir(a, 20.5))]), P.graphite, { width: 1.6, passes: 1, smoothIt: false });
                }
            }
        };
    })]);
    return poses;
}

/** Klo peeking out of his hole: only the eyes on their stalks. */
function drawKloPeek(sh) {
    const S = sh.S;
    for (const side of [-1, 1]) {
        const base = [6.5 * side, 0.5];
        const top = [8.4 * side, -12.5];
        const m = taperMask(sh, sh.T([base, [7.2 * side, -6], top]), 5.2 * S, 4.4 * S);
        part(sh, m, { base: N.kloShellLight, basePressure: 0.5, hatch: N.kloShell, hatchPressure: 0.75, angle: 1.35, lineWidth: 1.9 });
    }
    // a hint of darkness where the stalks come out of the hole
    const dm = sh.mask(ellipse(sh.ox, sh.oy - 0.5 * S, 13 * S, 2.4 * S, 30), { feather: 1.5 });
    sh.cutout(dm.map((v) => v * 0.9));
    sh.hatch(P.sandShadow, { angle: 0.1, gap: 1.6, len: [4, 12], width: 1.3, clip: dm, pressure: 0.9 });
    for (const side of [-1, 1]) {
        const r = 8.4;
        const [cx, cy] = sh.pt([9.4 * side, -19]);
        const eyeM = sh.mask(ellipse(cx, cy, r * S, r * S * 1.04, 40));
        reserve(sh, eyeM);
        const pr = r * 0.52;
        const px = cx + 0.85 * (r - pr - 0.6) * S, py = cy - 0.15 * (r - pr - 0.6) * S;
        const pm = sh.mask(ellipse(px, py, pr * S, pr * S * 1.08, 28));
        sh.fill(P.eye, pm, { pressure: 1, grain: 0.35 });
        sh.hatch(P.graphite, { angle: 0.8, gap: 1.6, len: [4, 10], width: 1.2, clip: pm, pressure: 0.9 });
        paperOver(sh, sh.mask(ellipse(px - pr * 0.36 * S, py - pr * 0.4 * S, pr * 0.34 * S, pr * 0.34 * S, 16)));
        // curious half lid
        const lidY = cy - r * S + 0.34 * 2 * r * S * 0.62;
        const lidM = multiplyMasks(eyeM, sh.mask([[cx - 2 * r * S, cy - 2 * r * S], [cx + 2 * r * S, cy - 2 * r * S], [cx + 2 * r * S, lidY], [cx - 2 * r * S, lidY]]));
        paperOver(sh, lidM);
        sh.tone(N.kloShellLight, lidM, { pressure: 0.7 });
        sh.hatch(N.kloShell, { angle: 0.2, gap: 2, len: [6, 14], width: 1.4, clip: lidM, pressure: 0.85 });
        line(sh, [[cx - r * S * 0.98, lidY], [cx, lidY + 0.4 * S], [cx + r * S * 0.98, lidY]], P.graphite, { width: 1.8 });
        outlineMask(sh, eyeM, P.graphite, { width: 2.1, wobble: 0.4 });
    }
}

export function buildKloFrames(scale = KLO_SCALE) {
    const out = [];
    for (const [name, pose] of kloPoses()) {
        const sh = sprite(name, 260, 230, scale * KLO_SIZE);
        drawKlo(sh, pose);
        out.push({ name, canvas: finish(sh, [0.5, 1]), anchor: [0.5, 1] });
    }
    const pk = sprite('klo-peek', 60, 40, scale * KLO_SIZE);
    drawKloPeek(pk);
    out.push({ name: 'klo-peek', canvas: finish(pk, [0.5, 1]), anchor: [0.5, 1] });
    return out;
}

/** Reusable pencil parts: every anchor is still the ground point, so runtime pivots
 * use the authored coordinates × KLO_SIZE. Lettered story poses stay whole and unmirrored. */
export function buildKloParts(scale = KLO_SCALE) {
    const out = [];
    const addPart = (name, draw) => {
        const sh = sprite(name, 180, 160, scale * KLO_SIZE);
        draw(sh);
        out.push({ name, canvas: finish(sh, [0.5, 1]), anchor: [0.5, 1] });
    };
    for (const part of ['body', ...Array.from({ length: 6 }, (_, i) => 'leg-' + i), 'arm-l', 'arm-r', 'eye-l', 'eye-r']) {
        addPart('klo-part-' + part, (sh) => drawKlo(sh, kloDefault(), part));
    }
    // an amazed "o" for his first sight of the sköldhäst
    addPart('klo-part-body-o', (sh) => { const pose = kloDefault(); pose.mouth = 'o'; drawKlo(sh, pose, 'body'); });
    for (const side of ['l', 'r']) addPart('klo-part-eye-' + side + '-blink', (sh) => {
        const pose = kloDefault(); pose.eyes.mode = 'shut';
        drawKlo(sh, pose, 'eye-' + side);
    });
    addPart('klo-part-watch', (sh) => heldStopwatch('clawR', { at: [0, 0], r: 8.8 }).draw(sh, null, [0, -15]));
    addPart('klo-part-book', (sh) => heldNotebook('clawL', { at: [0, 0], rot: 0 }).draw(sh, null, [0, -12]));
    addPart('klo-part-pencil', (sh) => heldPencil('clawR', { at: [0, 0], ang: 2.35, len: 17 }).draw(sh, null, [0, -2]));
    return out;
}

// ---------------------------------------------------------------------------
// Kartväktaren — an anxious, kind old man folded from cream paper (≈ 180 wu)
// ---------------------------------------------------------------------------
/*
 * Every part is a folded strip or facet of cream paper: one light facet, one
 * shaded facet, a crisp ink-blue fold line between them, a graphite contour
 * around the outside. Round glasses, a pencil behind the ear, a ruler under
 * the arm. Poses are skeletons in world units (origin = ground between the feet).
 */
const KV_SCALE = 1.5;
/** Drawn 6% larger than the skeleton numbers, so he stands ≈ 180 wu tall. */
const KV_SIZE = 1.06;

function perp(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return [-dy / d, dx / d];
}
const scale2 = (v, k) => [v[0] * k, v[1] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mid = (a, b, t = 0.5) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/**
 * A folded-paper piece: `poly` (wu) cut from cream paper; `facets` are
 * [{ poly, shade }] (shade 1 = soft fold shadow, 2 = deeper); `folds` are
 * straight ink-blue lines (wu point pairs).
 */
function paperPiece(sh, poly, { facets = [], folds = [], line: lw = 2, color = P.paperCream, crisp = true, outline = true } = {}) {
    const m = sh.mask(sh.T(poly));
    paperOver(sh, m); sh.cutout(m);
    sh.fill(color, m, { pressure: 0.55, grain: 0.5 });
    for (const f of facets) {
        const fm = multiplyMasks(m, sh.mask(sh.T(f.poly)));
        sh.hatch(f.shade >= 2 ? N.foldDeep : N.foldShade, {
            angle: f.angle ?? 0.9, gap: 1.8, len: [8, 22], width: 1.5, clip: fm,
            pressure: f.shade >= 2 ? 0.85 : 0.72, layers: f.shade >= 2 ? 2 : 1, crossAngle: 0.35
        });
        sh.burnish(fm, 2, 0.7);
    }
    for (const [a, b] of folds) {
        sh.outline(P.inkBlue, sh.T([a, b]), { closed: false, width: 1.35, wobble: crisp ? 0.12 : 0.4, passes: 1, alpha: 0.95, overshoot: 0.4, clip: null });
    }
    if (outline) outlineMask(sh, m, P.graphite, { width: lw, wobble: 0.45 });
    return m;
}

/** A paper strip limb from a to b (wu) with width w; the far half shaded, a fold along the middle. */
function paperStrip(sh, a, b, w, { shadeSide = 1, shade = 1, capA = 0, capB = 0 } = {}) {
    const n = perp(a, b);
    const d = sub(b, a), L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L];
    const A = sub(a, scale2(u, capA)), B = add(b, scale2(u, capB));
    const h = w / 2;
    const poly = [add(A, scale2(n, h)), add(B, scale2(n, h)), sub(B, scale2(n, h)), sub(A, scale2(n, h))];
    const half = [A, B, add(B, scale2(n, h * shadeSide)), add(A, scale2(n, h * shadeSide))];
    return paperPiece(sh, poly, { facets: [{ poly: half, shade, angle: Math.atan2(u[1], u[0]) + 0.8 }], folds: [[A, B]], line: 1.9 });
}

/** A mitten-like paper hand at `c` pointing along `ang`; `kind` 'mitt' | 'point' | 'grip' | 'open'. */
function paperHand(sh, c, ang, kind = 'mitt', size = 1) {
    const T = (pts) => transform(pts, { x: c[0], y: c[1], rot: ang, sx: size, sy: size });
    let poly, thumb, folds;
    if (kind === 'point') {
        poly = [[-3, -3.6], [4, -3.4], [11, -2], [11.5, 0.2], [4.5, 1.4], [3, 4], [-3, 3.8]];
        thumb = [[0, -3.4], [4, -6.2], [5.4, -4.6], [3.4, -2.8]];
        folds = [[[-2, 0], [4.2, 0.2]]];
    } else if (kind === 'open') {
        poly = [[-3, -4.2], [3, -5.4], [9.5, -4.6], [10.5, -1.5], [9.8, 2.2], [3, 4.4], [-3, 3.8]];
        thumb = [[1, -4.6], [3.6, -9.6], [6, -8.8], [4.4, -4.2]];
        folds = [[[-2, 0], [9, -0.6]]];
    } else {
        poly = [[-3, -4], [3.5, -4.6], [7.4, -3], [8.2, 0.4], [6.8, 3.6], [1, 4.4], [-3, 3.6]];
        thumb = [[1, -4.2], [4.8, -7], [6.6, -5.6], [4.6, -3.2]];
        folds = [[[-2, 0.4], [6.6, 0.6]]];
    }
    const m = paperPiece(sh, T(poly), { facets: [{ poly: T([[-4, 0.3], [12, 0.3], [12, 6], [-4, 6]]), shade: 1 }], folds: folds.map((f) => T(f)), line: 1.7 });
    paperPiece(sh, T(thumb), { facets: [], folds: [], line: 1.5 });
    return m;
}

/** Four paper fingers curled over a vertical edge at x = c[0] (the rest of the hand is behind it). */
function edgeFingers(sh, c, size = 1) {
    for (let i = 0; i < 4; i++) {
        const y = c[1] + (i - 1.5) * 3.3 * size;
        const len = (i === 0 || i === 3 ? 5.2 : 6.4) * size;
        const poly = [[c[0] - 1.2, y - 1.55 * size], [c[0] + len - 1.4, y - 1.6 * size], [c[0] + len, y], [c[0] + len - 1.4, y + 1.6 * size], [c[0] - 1.2, y + 1.55 * size]];
        paperPiece(sh, poly, { facets: [{ poly: [[c[0] - 2, y + 0.2], [c[0] + len + 1, y + 0.2], [c[0] + len + 1, y + 3], [c[0] - 2, y + 3]], shade: 1 }], folds: [], line: 1.5 });
    }
}

/** The ruler: a strip of pale wood with ticks, from a to b (wu). */
function drawRuler(sh, a, b, w = 6.4) {
    const n = perp(a, b);
    const poly = [add(a, scale2(n, -w / 2)), add(b, scale2(n, -w / 2)), add(b, scale2(n, w / 2)), add(a, scale2(n, w / 2))];
    const m = sh.mask(sh.T(poly));
    paperOver(sh, m); sh.cutout(m);
    sh.fill(N.ruler, m, { pressure: 0.7, grain: 0.6 });
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    sh.hatch(P.wood, { angle: ang + 0.03, gap: 2.6, len: [14, 40], width: 1.1, clip: m, pressure: 0.35 });
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    for (let t = 3, i = 0; t < L - 2; t += 3.2, i++) {
        const base = add(add(a, scale2(u, t)), scale2(n, -w / 2));
        const len = i % 5 === 0 ? 2.8 : 1.6;
        sh.outline(P.graphite, sh.T([base, add(base, scale2(n, len))]), { closed: false, width: 1, wobble: 0.1, passes: 1, alpha: 0.85, overshoot: 0 });
    }
    outlineMask(sh, m, P.graphite, { width: 1.8, wobble: 0.3 });
}

/** A pencil (yellow, pink eraser, sharpened tip) from `a` (eraser end) to `b` (tip), in wu. */
function drawPencil(sh, a, b, w = 3.4) {
    const S = sh.S;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const n = [-u[1], u[0]];
    const er = add(a, scale2(u, 3.2));
    const cone = add(a, scale2(u, L - 5.6));
    const body = [add(er, scale2(n, w / 2)), add(cone, scale2(n, w / 2)), sub(cone, scale2(n, w / 2)), sub(er, scale2(n, w / 2))];
    const bm = sh.mask(sh.T(body));
    paperOver(sh, bm); sh.cutout(bm);
    sh.fill(N.pencilYellow, bm, { pressure: 0.85, grain: 0.5 });
    sh.hatch('#d9a520', { angle: Math.atan2(u[1], u[0]), gap: 2, len: [8, 20], width: 1.2, clip: multiplyMasks(bm, sh.mask(sh.T([er, cone, sub(cone, scale2(n, w / 2)), sub(er, scale2(n, w / 2))]))), pressure: 0.7 });
    outlineMask(sh, bm, P.graphite, { width: 1.5, wobble: 0.3 });
    const em = sh.mask(sh.T([add(a, scale2(n, w / 2)), add(er, scale2(n, w / 2)), sub(er, scale2(n, w / 2)), sub(a, scale2(n, w / 2))]));
    paperOver(sh, em); sh.cutout(em);
    sh.fill(N.eraserPink, em, { pressure: 0.9, grain: 0.5 });
    outlineMask(sh, em, P.graphite, { width: 1.4, wobble: 0.3 });
    const cm = sh.mask(sh.T([add(cone, scale2(n, w / 2)), b, sub(cone, scale2(n, w / 2))]));
    paperOver(sh, cm); sh.cutout(cm);
    sh.fill(N.pencilWood, cm, { pressure: 0.8, grain: 0.5 });
    const lead = sh.mask(sh.T([add(b, add(scale2(u, -2.2), scale2(n, 0.75))), b, add(b, sub(scale2(u, -2.2), scale2(n, 0.75)))]));
    sh.cutout(lead); sh.fill(P.graphite, lead, { pressure: 1 });
    outlineMask(sh, cm, P.graphite, { width: 1.3, wobble: 0.2 });
}

function kvDefault() {
    return {
        hip: [0, -64],
        chest: [6, -120],         // top of the torso (between the shoulders)
        head: [15, -148],         // centre of the head
        headTilt: 0.06,
        backLeg: { knee: [-3, -33], ankle: [-6, -4], shoe: 0 },
        frontLeg: { knee: [6, -33], ankle: [8, -4], shoe: 0 },
        backArm: { elbow: [-10, -100], wrist: [2, -86], hand: 'mitt', handAng: 0.2 },
        frontArm: { elbow: [12, -98], wrist: [22, -86], hand: 'mitt', handAng: -0.3 },
        ruler: { kind: 'under' },
        pencil: 'ear',
        face: { brows: 'worry', eyes: 'dot', mouth: 'wobbly', blush: false, look: [1, 0] },
        coatFlare: 1,
        marks: null,
        only: null
    };
}

function drawKv(sh, pose) {
    const S = sh.S;
    const hip = pose.hip, chest = pose.chest;
    const axis = sub(chest, hip);
    const tl = Math.hypot(axis[0], axis[1]);
    const up = [axis[0] / tl, axis[1] / tl];
    const side = [-up[1], up[0]]; // points to the figure's front-right
    const at = (along, across) => add(add(hip, scale2(up, along)), scale2(side, across));
    const only = pose.only;

    // --- behind: the far arm and the far leg ----------------------------------
    const arm = (A, shoulder, near) => {
        paperStrip(sh, shoulder, A.elbow, near ? 7 : 6.6, { shadeSide: -1, shade: near ? 1 : 2, capA: 1, capB: 1.5 });
        paperStrip(sh, A.elbow, A.wrist, near ? 6.4 : 6, { shadeSide: -1, shade: near ? 1 : 2, capA: 1.5 });
        const ang = Math.atan2(A.wrist[1] - A.elbow[1], A.wrist[0] - A.elbow[0]) + (A.handAng || 0);
        if (A.hand !== 'none') paperHand(sh, add(A.wrist, dir(ang, 2.5)), ang, A.hand, near ? 1 : 0.95);
    };
    const leg = (Lg, hipPt, near) => {
        paperStrip(sh, hipPt, Lg.knee, 7.4, { shadeSide: -1, shade: near ? 1 : 2, capB: 1.5 });
        paperStrip(sh, Lg.knee, Lg.ankle, 6.8, { shadeSide: -1, shade: near ? 1 : 2, capA: 1.5 });
        // a pointed paper shoe, toe to the right (or pointing down on tiptoe)
        const a = Lg.ankle;
        const tip = Lg.shoe || 0;
        const T = (pts) => transform(pts, { x: a[0], y: a[1], rot: tip });
        const shoe = T([[-4.5, -2.6], [2.5, -3.2], [15, 3.6], [14.5, 4.4], [-4, 4.4], [-5.5, 2]]);
        paperPiece(sh, shoe, { facets: [{ poly: T([[-6, 1.2], [16, 1.2], [16, 6], [-6, 6]]), shade: 2 }], folds: [T([[-4.5, 1.2], [11, 1.8]])], line: 1.8 });
    };
    const shoulderB = at(tl - 3, -9.5), shoulderF = at(tl - 2, 9);
    if (!only) {
        arm(pose.backArm, shoulderB, false);
        leg(pose.backLeg, at(2, -4), false);
        leg(pose.frontLeg, at(2, 4), true);
        if (pose.ruler.kind === 'back') drawRuler(sh, pose.ruler.a, pose.ruler.b);

        // --- the coat: an A-line robe folded from one sheet, a pleated hem ------------
        const f = pose.coatFlare;
        const hem = -9;
        const vee = at(tl - 15, 2.5);
        const coat = [
            at(tl + 2.5, -4.5), at(tl - 0.5, -10.5), at(tl - 11, -14.2),
            at(hem + 3, -21.5 * f), at(hem - 0.5, -16 * f), at(hem + 2.5, -10.5 * f), at(hem - 0.5, -4.5 * f),
            at(hem + 2.5, 1 * f), at(hem - 0.5, 7 * f), at(hem + 2.5, 12.5 * f), at(hem - 1, 19 * f),
            at(tl + 0.5, 10.5), at(tl + 3, 4)
        ];
        const backPanel = [at(tl + 6, -8), at(tl - 0.5, -13), at(tl - 11, -17), at(hem + 3, -25 * f), at(hem - 3, -25 * f), at(hem - 3, -8 * f), vee];
        const deepBack = [at(tl - 11, -17), at(hem + 3, -25 * f), at(hem - 3, -25 * f), at(hem - 3, -14 * f), at(tl - 30, -12)];
        const frontPanel = [vee, at(hem - 3, 5 * f), at(hem - 3, 24 * f), at(tl + 4, 14)];
        paperPiece(sh, coat, {
            facets: [{ poly: backPanel, shade: 1, angle: 1.0 }, { poly: deepBack, shade: 2, angle: 1.1 }, { poly: frontPanel, shade: 1, angle: 0.5 }],
            folds: [[vee, at(hem + 1.5, -8 * f)], [vee, at(hem + 1.5, 5 * f)], [at(tl - 11, -14.2), at(tl - 26, -12.5)]],
            line: 2.2
        });
        // the collar: two folded lapels meeting in a V
        const lapelL = [at(tl + 2.5, -4.5), vee, at(tl - 2, -9.5)];
        const lapelR = [at(tl + 3, 4), vee, at(tl - 1.5, 10)];
        paperPiece(sh, lapelL, { facets: [{ poly: lapelL, shade: 2 }], folds: [], line: 1.6 });
        paperPiece(sh, lapelR, { facets: [], folds: [], line: 1.6 });
        // paper buttons down the front fold
        sh.dots(P.inkBlue, sh.T([at(tl - 22, 3.9), at(tl - 32, 4.6), at(tl - 42, 5.3)]), { rx: 1.4 * S, ry: 1.4 * S, alpha: 0.9, opaque: true });
    }

    // --- neck and head ----------------------------------------------------------
    const hc = pose.head;
    const ht = pose.headTilt;
    const H = (pts) => transform(pts, { x: hc[0], y: hc[1], rot: ht, sx: 1.1, sy: 1.1 });
    if (!only) paperStrip(sh, at(tl - 1, 1), H([[-2, 14]])[0], 6, { shadeSide: -1, shade: 1, capB: 2 });
    // hair tufts at the back of the head (folded triangles)
    // soft white tufts of paper hair above and behind the ear
    const tufts = [
        smooth([[-12, -9], [-17.5, -12.5], [-20.5, -9], [-17.5, -5.5], [-13, -4.5]], { closed: true, steps: 3 }),
        smooth([[-13.5, -3.5], [-19.5, -3], [-21, 1.5], [-17, 4.5], [-13, 3.5]], { closed: true, steps: 3 }),
        smooth([[-12.5, 3.5], [-17, 6.5], [-16, 10.5], [-11.5, 10], [-10.5, 6]], { closed: true, steps: 3 })
    ];
    for (const t of tufts) paperPiece(sh, H(t), { color: P.paper, facets: [{ poly: H(t.map(([x, y]) => [x + 1.5, y + 2])), shade: 1 }], folds: [], line: 1.5 });
    // the head: a folded egg, a fold down the front of the face
    const headPoly = H([[-13, -14], [-4, -19], [8, -18.5], [14.5, -12], [15.5, -3], [14, 5], [9, 14.5], [3, 17.5], [-5, 15.5], [-12, 8], [-14.5, -3]]);
    const sideFacet = H([[-16, -20], [-2, -20], [0, 18], [-16, 18]]);
    const hm = paperPiece(sh, headPoly, { facets: [{ poly: sideFacet, shade: 1, angle: 1.2 }], folds: [H([[-2, -19], [-1.6, -9]]), H([[-0.9, 6], [-0.5, 16.5]])], line: 2.1 });
    // ear with the pencil behind it
    if (pose.pencil === 'ear') drawPencil(sh, H([[-17.5, -15]])[0], H([[1.5, 3.5]])[0], 3.2);
    const ear = H([[-8, -3], [-4.4, -5.6], [-2.2, -1], [-3.6, 4.4], [-7.6, 3]]);
    paperPiece(sh, ear, { facets: [{ poly: H([[-9, 0.6], [-1, 0.6], [-1, 6], [-9, 6]]), shade: 1 }], folds: [H([[-6, -2.4], [-4.8, 2.2]])], line: 1.5 });
    // the nose: a folded triangle pointing right
    const nose = H([[12, -5], [20, 2.5], [12.5, 3.6]]);
    paperPiece(sh, nose, { facets: [{ poly: H([[12, 0.5], [21, 2.6], [12.5, 4]]), shade: 1 }], folds: [H([[12.2, -4.2], [18.6, 2.2]])], line: 1.6 });
    // moustache: two little folded wings
    for (const t of [[[12.5, 5], [6.5, 8.5], [11, 9.6]], [[13.2, 5], [18.5, 8.2], [14.2, 9.6]]]) {
        paperPiece(sh, H(t), { facets: [{ poly: H([t[0], mid(t[1], t[2]), t[2]]), shade: 1 }], folds: [], line: 1.3 });
    }
    // glasses, eyes, brows, mouth, blush
    const F = pose.face;
    const lens = [{ c: [4.5, -4], r: 5.1 }, { c: [13.8, -4.6], r: 4.2 }];
    for (const L of lens) {
        const [cx, cy] = sh.pt(H([L.c])[0]);
        const lm = sh.mask(ellipse(cx, cy, L.r * S, L.r * S * 1.05, 32));
        reserve(sh, lm);
        sh.hatch(P.skyPale, { angle: -0.8, gap: 3, len: [3, 8], width: 1.1, clip: lm, pressure: 0.4 });
        // the eye behind the lens
        const [lx, ly] = F.look;
        if (F.eyes === 'dot') {
            sh.dots(P.eye, [[cx + lx * 1.3 * S, cy + ly * 1.3 * S]], { rx: 1.35 * S, ry: 1.55 * S, alpha: 1, opaque: true, grain: 0.3 });
        } else if (F.eyes === 'closed') {
            line(sh, [[cx - 2.3 * S, cy + 0.2 * S], [cx, cy + 1.4 * S], [cx + 2.3 * S, cy + 0.2 * S]], P.graphite, { width: 1.6 });
        } else if (F.eyes === 'wide') {
            sh.dots(P.eye, [[cx + lx * 1.1 * S, cy + ly * 1.1 * S]], { rx: 1.6 * S, ry: 1.8 * S, alpha: 1, opaque: true, grain: 0.3 });
        }
        outlineMask(sh, lm, P.graphite, { width: 1.8, wobble: 0.3 });
    }
    // the bridge and the arm of the glasses toward the ear
    line(sh, sh.T(H([[9.5, -5.2], [10.2, -5.8]])), P.graphite, { width: 1.6, passes: 1, smoothIt: false });
    line(sh, sh.T(H([[-0.6, -4.6], [-4.2, -3.4]])), P.graphite, { width: 1.4, passes: 1, smoothIt: false });
    const brow = {
        worry: [[[0.4, -11.2], [4.4, -12.4], [8.2, -14.6]], [[11, -14.4], [13.8, -12.2], [16.4, -11.4]]],
        up: [[[0.8, -13], [4.6, -14.6], [8.2, -14.4]], [[11.2, -14.2], [14, -14.6], [16.4, -13.2]]],
        soft: [[[0.8, -11.6], [4.6, -12.8], [8.2, -12]], [[11.2, -12], [14, -12.6], [16.2, -11.6]]]
    }[F.brows];
    if (brow) for (const b of brow) line(sh, sh.T(H(b)), P.graphite, F.brows === 'soft' ? { width: 1.9, passes: 1 } : { width: 3.1, passes: 2, pressure: 1.2 });
    const mouth = {
        wobbly: [[9.6, 11.2], [11.4, 10.4], [13.2, 11.2], [15, 10.6]],
        smile: [[9.2, 10.4], [11.8, 12], [14.8, 11.6], [16.2, 10.2]],
        o: null,
        flat: [[10, 11], [15, 11]]
    }[F.mouth];
    if (mouth) line(sh, sh.T(H(mouth)), P.graphite, { width: 1.5, passes: 1 });
    if (F.mouth === 'o') {
        const [mx, my] = sh.pt(H([[12.6, 11.4]])[0]);
        const om = sh.mask(ellipse(mx, my, 1.5 * S, 1.9 * S, 16));
        sh.fill(P.graphite, om, { pressure: 0.8 }); outlineMask(sh, om, P.graphite, { width: 1.2 });
    }
    if (F.blush) {
        const [bx, by] = sh.pt(H([[7.5, 4.5]])[0]);
        sh.hatch(N.blush, { angle: 0.7, gap: 2, len: [3, 7], width: 1.3, clip: sh.mask(ellipse(bx, by, 3.2 * S, 2 * S, 20), { feather: 1 }), pressure: 0.9 });
    }

    // --- in front: the ruler under the arm, the near arm, held things ------------
    if (!only) {
        if (pose.ruler.kind === 'under') drawRuler(sh, pose.ruler.a || at(tl - 18, -30), pose.ruler.b || at(tl - 24, 34));
        arm(pose.frontArm, shoulderF, true);
        if (pose.ruler.kind === 'hand') drawRuler(sh, pose.ruler.a, pose.ruler.b);
        if (pose.pencil === 'hand') drawPencil(sh, pose.pencilAt[0], pose.pencilAt[1], 3.2);
        if (pose.frontArm.redraw) paperHand(sh, ...pose.frontArm.redraw);
    } else {
        // head-and-hands only (peeking round a shutter)
        for (const hnd of only.hands) edgeFingers(sh, hnd.c, hnd.size || 1.15);
    }
    if (pose.marks) pose.marks(sh);
}

function kvPoses() {
    const D = kvDefault;
    const P0 = (f) => { const p = D(); f(p); return p; };
    const poses = [];
    // standing: a little hunched, head forward, the ruler under the arm, hands fidgeting
    poses.push(['kv-stand', P0((p) => {
        p.frontArm = { elbow: [16, -99], wrist: [24, -84], hand: 'mitt', handAng: -0.9 };
        p.backArm = { elbow: [-8, -99], wrist: [6, -86], hand: 'mitt', handAng: -0.4 };
        p.ruler = { kind: 'under', a: [-26, -108], b: [38, -101] };
    })]);
    // worried: shoulders up, hands wrung at the chest, knees in, brows up
    poses.push(['kv-worry', P0((p) => {
        p.hip = [0, -62];
        p.chest = [4, -116];
        p.head = [13, -141];
        p.headTilt = -0.08;
        p.backLeg = { knee: [1, -32], ankle: [-6, -4], shoe: 0 };
        p.frontLeg = { knee: [2, -32], ankle: [9, -4], shoe: 0 };
        p.backArm = { elbow: [-6, -100], wrist: [14, -110], hand: 'mitt', handAng: -0.6 };
        p.frontArm = { elbow: [16, -97], wrist: [18, -112], hand: 'mitt', handAng: 0.4 };
        p.ruler = { kind: 'under', a: [-24, -103], b: [36, -98] };
        p.face = { brows: 'up', eyes: 'wide', mouth: 'wobbly', blush: false, look: [0.4, 0.3] };
        p.marks = (sh) => {
            // little worry lines by the head
            for (const [a, b] of [[[-12, -160], [-17, -166]], [[-6, -165], [-8, -172]], [[-17, -151], [-23, -154]]]) {
                sh.outline(P.graphite, sh.T([a, b]), { closed: false, width: 1.5, wobble: 0.2, passes: 1, overshoot: 0 });
            }
        };
    })]);
    // pointing with the ruler, very precisely
    poses.push(['kv-point', P0((p) => {
        p.frontArm = { elbow: [24, -106], wrist: [40, -112], hand: 'grip', handAng: 0 };
        p.backArm = { elbow: [-10, -98], wrist: [-2, -84], hand: 'mitt', handAng: 0.4 };
        p.ruler = { kind: 'hand', a: [37, -110], b: [92, -126] };
        p.face = { brows: 'worry', eyes: 'dot', mouth: 'o', blush: false, look: [1, -0.2] };
        p.head = [16, -149];
        p.frontArm.redraw = [[42.5, -112.7], -0.28, 'grip', 1];
    })]);
    // peeking round a shutter: head and hands only; the gripped edge runs up from the anchor
    poses.push(['kv-peek', P0((p) => {
        p.head = [21, -31];
        p.headTilt = 0.24;
        p.face = { brows: 'worry', eyes: 'wide', mouth: 'flat', blush: false, look: [1, 0.15] };
        p.pencil = 'ear';
        p.only = { hands: [{ c: [0, -52] }, { c: [0, -8] }] };
    })]);
    // hurrying walk (tiptoe), ruler under the arm
    poses.push(['kv-walk-1', P0((p) => {
        p.hip = [0, -63];
        p.chest = [11, -118];
        p.head = [22, -144];
        p.backLeg = { knee: [-9, -34], ankle: [-19, -8], shoe: 0.5 };
        p.frontLeg = { knee: [12, -35], ankle: [19, -4], shoe: -0.05 };
        p.backArm = { elbow: [4, -95], wrist: [20, -88], hand: 'mitt', handAng: -0.3 };
        p.frontArm = { elbow: [10, -96], wrist: [2, -80], hand: 'mitt', handAng: 0.5 };
        p.ruler = { kind: 'under', a: [-20, -106], b: [44, -99] };
        p.face = { brows: 'worry', eyes: 'dot', mouth: 'flat', blush: false, look: [1, 0] };
    })]);
    poses.push(['kv-walk-2', P0((p) => {
        p.hip = [1, -66];
        p.chest = [12, -121];
        p.head = [23, -147];
        p.backLeg = { knee: [6, -40], ankle: [-3, -16], shoe: 0.65 };
        p.frontLeg = { knee: [3, -34], ankle: [3, -4], shoe: 0 };
        p.backArm = { elbow: [-2, -98], wrist: [6, -84], hand: 'mitt', handAng: 0 };
        p.frontArm = { elbow: [16, -98], wrist: [22, -84], hand: 'mitt', handAng: -0.4 };
        p.ruler = { kind: 'under', a: [-19, -109], b: [45, -102] };
        p.face = { brows: 'worry', eyes: 'dot', mouth: 'flat', blush: false, look: [1, 0] };
    })]);
    // a deep, gentle bow: sorry
    poses.push(['kv-bow', P0((p) => {
        p.hip = [-4, -64];
        p.chest = [30, -108];
        p.head = [48, -112];
        p.headTilt = 0.95;
        p.backLeg = { knee: [-6, -33], ankle: [-6, -4], shoe: 0 };
        p.frontLeg = { knee: [2, -33], ankle: [5, -4], shoe: 0 };
        p.backArm = { elbow: [22, -86], wrist: [28, -68], hand: 'mitt', handAng: 0.3 };
        p.frontArm = { elbow: [30, -84], wrist: [34, -66], hand: 'mitt', handAng: 0.2 };
        p.ruler = { kind: 'hand', a: [18, -62], b: [50, -70] };
        p.face = { brows: 'soft', eyes: 'closed', mouth: 'flat', blush: true, look: [0, 0] };
        p.coatFlare = 0.9;
    })]);
    // drawing freely with the pencil (the ruler under the other arm)
    poses.push(['kv-draw', P0((p) => {
        p.hip = [-2, -64];
        p.chest = [14, -117];
        p.head = [28, -140];
        p.headTilt = 0.3;
        p.frontArm = { elbow: [26, -96], wrist: [40, -84], hand: 'grip', handAng: 0.5 };
        p.backArm = { elbow: [0, -94], wrist: [4, -80], hand: 'mitt', handAng: 0.5 };
        p.ruler = { kind: 'back', a: [-22, -104], b: [30, -112] };
        p.pencil = 'hand';
        p.pencilAt = [[38, -96], [50, -72]];
        p.face = { brows: 'soft', eyes: 'dot', mouth: 'smile', blush: true, look: [0.7, 0.9] };
    })]);
    // unfolding the page: arms wide, relieved
    poses.push(['kv-unfold', P0((p) => {
        p.chest = [3, -121];
        p.head = [8, -150];
        p.headTilt = -0.12;
        p.backArm = { elbow: [-26, -128], wrist: [-46, -140], hand: 'open', handAng: -0.3 };
        p.frontArm = { elbow: [26, -126], wrist: [48, -138], hand: 'open', handAng: 0.2 };
        p.ruler = { kind: 'none' };
        p.face = { brows: 'soft', eyes: 'closed', mouth: 'smile', blush: true, look: [0, 0] };
        p.coatFlare = 1.15;
    })]);
    return poses;
}

export function buildKvFrames(scale = KV_SCALE) {
    const out = [];
    for (const [name, pose] of kvPoses()) {
        const sh = sprite(name, 240, 230, scale * KV_SIZE);
        drawKv(sh, pose);
        out.push({ name, canvas: finish(sh, [0.5, 1]), anchor: [0.5, 1] });
    }
    return out;
}

/** Small articulated pieces retain the same paper facets as the complete poses.
 * Their origins are real joints, so a rotating knee never carries a padded
 * whole-character frame around with it. No words are baked into these parts. */
export function buildGuardianParts(scale = KV_SCALE) {
    const out = [];
    const mk = (name, w, h, draw) => {
        const sh = sprite('kv-part-' + name, w, h, scale * KV_SIZE, [0.5, 0.5]);
        draw(sh);
        out.push({ name: 'kv-part-' + name, canvas: finish(sh, [0.5, 0.5]), anchor: [0.5, 0.5] });
    };
    // Coat coordinates are relative to the hips; the shoulder line is y=-56.
    mk('coat', 80, 140, (sh) => {
        const poly = [[-4,-59],[-11,-55],[-14,-45],[-22,6],[-16,10],[-10,7],[-4,10],[2,7],[8,10],[14,7],[21,9],[12,-55],[4,-59]];
        paperPiece(sh, poly, { facets: [
            { poly: [[-11,-55],[-14,-45],[-22,6],[-16,10],[-6,8],[2,-41]], shade: 1 },
            { poly: [[2,-41],[6,10],[21,10],[12,-55]], shade: 1, angle: 0.5 }
        ], folds: [[[2,-41],[-7,8]],[[2,-41],[6,8]],[[-12,-44],[-11,-28]]], line: 2.2 });
        paperPiece(sh, [[-4,-59],[2,-41],[-11,-55]], { facets: [{ poly: [[-4,-59],[2,-41],[-11,-55]], shade: 2 }], line: 1.6 });
        paperPiece(sh, [[4,-59],[2,-41],[12,-55]], { line: 1.6 });
        sh.dots(P.inkBlue, sh.T([[3,-34],[4,-24],[5,-14]]), { rx: 1.4 * sh.S, ry: 1.4 * sh.S, alpha: 0.9, opaque: true });
    });
    mk('cape', 84, 140, (sh) => paperPiece(sh,
        [[-7,-56],[-14,-51],[-27,8],[-20,12],[-10,7],[2,-41]],
        { facets: [{ poly: [[-14,-51],[-27,8],[-20,12],[-16,-24]], shade: 2 }], folds: [[[-11,-45],[-20,7]]], line: 1.7 }));
    for (const [name, width] of [['leg',7.4],['arm',6.6],['neck',6]]) {
        mk(name, 26, 86, (sh) => paperStrip(sh, [0,0], [0,32], width, { capA: 1.5, capB: 1.5, shadeSide: -1 }));
    }
    mk('shoe', 52, 24, (sh) => paperPiece(sh,
        [[-4.5,-2.6],[2.5,-3.2],[15,3.6],[14.5,4.4],[-4,4.4],[-5.5,2]],
        { facets: [{ poly: [[-6,1.2],[16,1.2],[16,6],[-6,6]], shade: 2 }], folds: [[[-4.5,1.2],[11,1.8]]], line: 1.8 }));
    for (const kind of ['mitt','grip','open','point']) mk('hand-' + kind, 40, 32, (sh) => paperHand(sh, [0,0], 0, kind));
    mk('ruler', 140, 22, (sh) => drawRuler(sh, [-32,0], [32,0]));
    mk('pencil', 50, 58, (sh) => drawPencil(sh, [-6,-12], [6,12], 3.2));
    for (const mood of ['normal','worry','soft']) for (const action of ['','-blink','-talk']) {
        mk('head-' + mood + action, 90, 76, (sh) => {
            const pose = kvDefault();
            pose.head = [0,0]; pose.headTilt = 0; pose.only = { hands: [] };
            pose.face = { brows: mood === 'soft' ? 'soft' : mood === 'worry' ? 'up' : 'worry',
                eyes: action === '-blink' ? 'closed' : mood === 'worry' ? 'wide' : 'dot',
                mouth: action === '-talk' ? 'o' : mood === 'soft' ? 'smile' : 'wobbly',
                blush: mood === 'soft', look: [0.65, 0.15] };
            drawKv(sh, pose);
        });
    }
    return out;
}

// ---------------------------------------------------------------------------
// Creatures: small, cute, pencil-simple
// ---------------------------------------------------------------------------
/** A coloured blob part (wu points, smoothed): base fill, hatching, rim shade, graphite outline. */
function blob(sh, pts, { base, hatch, deep = null, angle = -0.6, lw = 1.8, rimW = 2.5, smoothIt = true, pressure = 0.95, baseP = 0.8 } = {}) {
    const poly = sh.T(smoothIt ? smooth(pts, { closed: true, steps: 5 }) : pts);
    const m = sh.mask(poly);
    paperOver(sh, m); sh.cutout(m);
    if (base) {
        sh.fill(base, m, { pressure: baseP * 0.72, grain: 0.45 });
        sh.hatch(base, { angle: angle + 0.45, gap: 1.7, len: [8, 20], width: 1.7, clip: m, pressure: 1.0, layers: 2, crossAngle: 0.5 });
    }
    if (hatch) sh.hatch(hatch, { angle, gap: 2, len: [6, 16], width: 1.5, clip: m, pressure, layers: 2, crossAngle: 1.2 });
    if (deep) sh.hatch(deep, { angle: angle - 0.3, gap: 2, len: [4, 12], width: 1.4, clip: edgeBand(m, sh.w, sh.h, rimW * sh.S), pressure: 0.75 });
    if (lw) outlineMask(sh, m, P.graphite, { width: lw, wobble: 0.4 });
    return m;
}

/** A friendly round eye at c (wu): paper white, a big pupil looking along `look`, a highlight. */
function eyeAt(sh, c, r, look = [0.5, 0], { lw = 1.6, lid = 0, lidColor = null } = {}) {
    const S = sh.S;
    const [cx, cy] = sh.pt(c);
    const em = sh.mask(ellipse(cx, cy, r * S, r * S * 1.05, 28));
    reserve(sh, em);
    const pr = r * 0.58;
    const px = cx + look[0] * (r - pr - 0.3) * S, py = cy + look[1] * (r - pr - 0.3) * S;
    const pm = sh.mask(ellipse(px, py, pr * S, pr * S * 1.08, 20));
    sh.fill(P.eye, pm, { pressure: 1, grain: 0.35 });
    paperOver(sh, sh.mask(ellipse(px - pr * 0.35 * S, py - pr * 0.38 * S, Math.max(0.9, pr * 0.34 * S), Math.max(0.9, pr * 0.34 * S), 12)));
    if (lid > 0) {
        const ly = cy - r * S + lid * 2 * r * S * 0.6;
        const lm = multiplyMasks(em, sh.mask([[cx - 2 * r * S, cy - 2 * r * S], [cx + 2 * r * S, cy - 2 * r * S], [cx + 2 * r * S, ly], [cx - 2 * r * S, ly]]));
        paperOver(sh, lm);
        if (lidColor) sh.fill(lidColor, lm, { pressure: 0.85, grain: 0.5 });
        line(sh, [[cx - r * S, ly], [cx, ly + 0.5 * S], [cx + r * S, ly]], P.graphite, { width: lw, passes: 1 });
    }
    outlineMask(sh, em, P.graphite, { width: lw, wobble: 0.3 });
}

/** Lyktfisk: a small deep-blue fish with a glowing warm spot (reserved paper + yellow halo). */
function drawLyktfisk(sh, f) {
    const S = sh.S;
    const sw = f ? -0.32 : 0.28; // tail swish
    const spot = [1.5, 1.2];
    const [sx, sy] = sh.pt(spot);
    // the glow around the fish, first (behind)
    halo(sh, sx, sy, 3.5 * S, (f ? 17 : 15.5) * S, P.sunYellow, { pressure: 0.8, falloff: 1.8 });
    const tail = transform([[0, -1.4], [-8, -7.5], [-6.2, 0], [-8, 7.5], [0, 1.4]], { x: -11.5, y: 0, rot: sw });
    blob(sh, tail, { base: N.lyktBody, hatch: N.lyktDeep, angle: 0.3 + sw, lw: 1.6, smoothIt: false, pressure: 0.8 });
    blob(sh, [[-3, -7], [2, -12], [6, -7.5]], { base: N.lyktBody, hatch: N.lyktDeep, lw: 1.5, smoothIt: false, pressure: 0.8 });
    const body = [[14, 0.5], [11.5, -5.8], [4, -8.4], [-5, -7], [-12, -2.6], [-13.4, 0.4], [-11.5, 3.4], [-4.5, 6.8], [4, 8], [11, 5.4]];
    const bm = blob(sh, body, { base: N.lyktBody, hatch: N.lyktDeep, deep: N.lyktDeep, angle: -0.5, lw: 1.8, baseP: 0.85, pressure: 0.8 });
    // the glow lights the body around the spot
    const warm = sh.mask(ellipse(sx, sy, 8.5 * S, 8.5 * S, 32), { feather: 3 });
    paperOver(sh, multiplyMasks(bm, warm).map((v) => v * 0.55));
    halo(sh, sx, sy, 3.4 * S, 8.5 * S, P.sunYellow, { pressure: 1.0, falloff: 1.2, strokes: true });
    // the lantern: reserved paper with a warm rim
    const spotM = sh.mask(ellipse(sx, sy, 3.6 * S, 3.4 * S, 28));
    reserve(sh, spotM);
    sh.hatch(P.sunGlow, { angle: 0.2, gap: 2.6, len: [2, 5], width: 1, clip: edgeBand(spotM, sh.w, sh.h, 1.4 * S), pressure: 0.6 });
    eyeAt(sh, [8.4, -2], 3.1, [0.6, -0.1], { lw: 1.4 });
    line(sh, sh.T([[11.8, 3.4], [13, 4], [13.8, 3.4]]), P.graphite, { width: 1.2, passes: 1 });
    // re-draw the body contour over the glow
    outlineMask(sh, bm, P.graphite, { width: 1.6, wobble: 0.4 });
}

/** A small shy fish: silver-blue with a yellow stripe. */
function drawFish(sh, f) {
    const sw = f ? -0.35 : 0.3;
    const tail = transform([[0, -1.5], [-7, -7.5], [-4.6, 0], [-7, 7.5], [0, 1.5]], { x: -12.5, y: 0, rot: sw });
    blob(sh, tail, { base: N.fishBody, hatch: N.fishBack, angle: 0.3, lw: 1.5, smoothIt: false, pressure: 0.7 });
    blob(sh, [[-4, -6], [0, -10.5], [5, -6.4]], { base: N.fishBody, hatch: N.fishBack, lw: 1.4, smoothIt: false, pressure: 0.7 });
    const body = [[14.5, 0.8], [12, -4.8], [5, -7.2], [-5, -6.2], [-12.5, -2], [-13.5, 0.6], [-12, 2.8], [-5, 5.8], [5, 6.8], [12, 4.4]];
    const bm = blob(sh, body, { base: N.fishBody, hatch: N.fishBody, angle: -0.4, lw: 1.7, baseP: 0.6, pressure: 0.6 });
    // a darker back and a pale belly
    const back = multiplyMasks(bm, sh.mask(sh.T([[-16, -12], [16, -12], [16, -2.5], [4, -1.5], [-16, -0.5]])));
    sh.hatch(N.fishBack, { angle: -0.1, gap: 1.8, len: [5, 14], width: 1.4, clip: back, pressure: 0.95, layers: 2, crossAngle: 0.6 });
    const stripe = multiplyMasks(bm, sh.mask(sh.T(smooth([[-12, -0.2], [-2, -1.6], [8, -0.6], [8, 1.4], [-2, 0.8], [-12, 1.4]], { closed: true, steps: 3 }))));
    sh.fill(N.fishStripe, stripe, { pressure: 0.85, grain: 0.6 });
    eyeAt(sh, [8.6, -1.4], 2.8, [0.6, 0], { lw: 1.3 });
    line(sh, sh.T([[12.4, 2.6], [13.6, 3.2], [14.3, 2.4]]), P.graphite, { width: 1.1, passes: 1 });
    blob(sh, transform([[0, 0], [-4.6, -2.2], [-5, 2]], { x: 3, y: 2.6, rot: f ? 0.35 : -0.15 }), { base: N.fishBody, hatch: N.fishBack, lw: 1.1, smoothIt: false, pressure: 0.6 });
}

/** A tiny hermit crab in a spiral shell, walking right. */
function drawHermit(sh, f) {
    const S = sh.S;
    const bob = f ? -0.8 : 0;
    // legs (behind the shell edge)
    const legs = f ? [[6, -5, 10, -8, 13, 0], [4, -4, 5, -7.5, 7.5, 0], [8, -7, 15, -9, 17.5, -0.2]]
        : [[6, -5, 11, -8.5, 11.5, 0], [4, -4, 6, -8, 5.5, 0], [8, -7, 14, -10, 18.5, 0]];
    for (const [ax, ay, bx, by, cx, cy] of legs) {
        const m = unionMasks(taperMask(sh, sh.T([[ax, ay + bob], [bx, by + bob]]), 2.8 * S, 2.4 * S), taperMask(sh, sh.T([[bx, by + bob], [cx, cy]]), 2.4 * S, 0.9 * S));
        kloPaint(sh, m, 1.1, { rimW: 0.8, line: 1.4, layers: 1 });
    }
    // eyes on little stalks
    for (const [bx, by, tx, ty] of [[8, -12, 9.5, -19], [10.5, -11, 13, -17.5]]) {
        const m = taperMask(sh, sh.T([[bx, by + bob], [tx, ty + bob]]), 2.2 * S, 1.8 * S);
        kloPaint(sh, m, 1.3, { rimW: 0.6, line: 1.2, layers: 1 });
    }
    // the shell: a round snail spiral, sitting on the sand
    const sc = [-5, -12 + bob];
    const shellPts = ellipse(sc[0], sc[1], 12.5, 11.8, 36).map(([x, y]) => [x, Math.min(y, -0.4)]);
    const sm = blob(sh, shellPts, { base: N.hermitShell, hatch: N.hermitShell, angle: 0.8, lw: 1.9, baseP: 0.85, pressure: 0.7, smoothIt: false });
    sh.hatch(N.hermitShellDeep, { angle: 0.9, gap: 2, len: [4, 10], width: 1.3, clip: edgeBand(sm, sh.w, sh.h, 3 * S), pressure: 0.6 });
    const spiral = [];
    for (let t = 0; t <= 1; t += 0.02) {
        const a = -0.6 + t * Math.PI * 3.4;
        const r = 10.6 * (1 - t) ** 1.1 + 0.6;
        spiral.push([sc[0] - 1 + Math.cos(a) * r, sc[1] + 0.5 + Math.sin(a) * r * 0.95]);
    }
    line(sh, sh.T(spiral), N.hermitShellDeep, { width: 1.9, passes: 2, clip: sm });
    sh.dots(P.paper, sh.T([[-9.5, -18 + bob], [-7.5, -19.6 + bob]]), { rx: 1.2 * S, ry: 0.8 * S, alpha: 0.7, clip: sm });
    // the opening, dark, with the crab's face and claws
    const ap = blob(sh, [[4, -3.5 + bob], [6.5, -11 + bob], [9.5, -10 + bob], [9.4, -3 + bob], [6.5, -1.2 + bob]], { base: N.hermitShellDeep, hatch: N.kloTip, lw: 1.3, pressure: 0.6 });
    const cm = blob(sh, [[5, -9 + bob], [9.5, -12.2 + bob], [13.6, -9.5 + bob], [12.5, -5.8 + bob], [7.6, -5.6 + bob]], { base: N.kloShellLight, hatch: N.kloShell, lw: 1.4 });
    // claws: one big, one small
    for (const [c, a, sz] of [[[14.2, -6 + bob], -0.35, 0.48], [[10.5, -3.6 + bob], -0.1, 0.34]]) {
        const pm = sh.mask(sh.T(smooth(pincerPts(c, a, 0.25, sz), { closed: true, steps: 3 })));
        kloPaint(sh, pm, a + 0.9, { rimW: 0.8, line: 1.4, layers: 1 });
    }
    eyeAt(sh, [9.8, -20.2 + bob], 2.2, [0.6, 0], { lw: 1.2 });
    eyeAt(sh, [13.4, -18.7 + bob], 2.2, [0.6, 0], { lw: 1.2 });
}

/** A sand eel peeking up out of the sand, swaying. */
function drawEel(sh, f) {
    const S = sh.S;
    const sway = f ? 1 : -1;
    const spine = [[0, 1], [0.6 - sway * 0.6, -10], [1.4 + sway * 1.6, -20], [2 + sway * 2.4, -29], [5.5 + sway * 1.4, -35.5], [10.5 + sway * 0.6, -37.2]];
    const pts = smooth(spine, { closed: false, steps: 6 });
    // body: a tube tapering toward the sand
    const m = taperMask(sh, sh.T(pts), 3.8 * S, 5.2 * S);
    paperOver(sh, m); sh.cutout(m);
    sh.fill(N.eelBody, m, { pressure: 0.75, grain: 0.6 });
    sh.hatch(N.eelBody, { angle: 1.4, gap: 2, len: [5, 12], width: 1.3, clip: m, pressure: 0.6 });
    // a darker back line and small spots
    const back = taperMask(sh, sh.T(pts.map(([x, y]) => [x - 1.3, y])), 1.6 * S, 2.2 * S);
    sh.hatch(N.eelBack, { angle: 1.3, gap: 1.7, len: [4, 10], width: 1.3, clip: multiplyMasks(back, m), pressure: 0.95 });
    sh.dots(N.eelSpot, sh.T([pts[8], pts[14], pts[20]].map(([x, y]) => [x + 0.6, y])), { rx: 0.9 * S, ry: 0.7 * S, alpha: 0.9, clip: m });
    outlineMask(sh, m, P.graphite, { width: 1.7, wobble: 0.35 });
    const head = pts[pts.length - 1];
    eyeAt(sh, [head[0] - 3.2, head[1] - 0.4], 2.2, [0.7, 0], { lw: 1.3 });
    line(sh, sh.T([[head[0] - 0.8, head[1] + 1.6], [head[0] + 0.8, head[1] + 1.2]]), P.graphite, { width: 1.1, passes: 1 });
    // the little sand hole it peeks out of
    const [hx, hy] = sh.pt([0, 0]);
    const mound = sh.mask(ellipse(hx, hy - 0.2 * S, 9 * S, 2.6 * S, 30));
    const hole = sh.mask(ellipse(hx, hy - 0.4 * S, 4.4 * S, 1.3 * S, 20));
    const ring = subtractMask(mound, hole);
    sh.cutout(ring.map((v) => v * 0.95));
    paperOver(sh, ring);
    sh.fill(P.sand, ring, { pressure: 0.8, grain: 0.6 });
    sh.dots(P.sandShadow, sh.T([[-6.5, -0.4], [-3.5, 0.9], [4.5, 0.8], [7, -0.3], [5.5, -1.4]]), { rx: 0.7 * S, ry: 0.5 * S, alpha: 0.9, clip: ring });
    line(sh, sh.T([[-8.8, 0.2], [-4, 2.1], [4, 2.1], [8.8, 0.2]]), P.sandShadow, { width: 1.3, passes: 1 });
    // re-draw the front of the body over the hole's far rim
    const front = multiplyMasks(m, sh.mask([[0, hy - 1.2 * S], [sh.w, hy - 1.2 * S], [sh.w, sh.h], [0, sh.h]]));
    sh.fill(N.eelBody, front, { pressure: 0.5, grain: 0.5 });
}

/** Sköldpaddan Signe: a proud, perfectly ordinary turtle (side view, chin up). */
function drawSigne(sh, f) {
    const S = sh.S;
    // f: 0 stand, 1 and 2 walk
    const lift = (i) => (f === 0 ? 0 : ((f === 1) === (i % 2 === 0) ? 5 : 0));
    const swing = (i) => (f === 0 ? 0 : ((f === 1) === (i % 2 === 0) ? 5 : -3));
    const legs = [
        { x: -30, far: true }, { x: 26, far: true },
        { x: -40, far: false }, { x: 18, far: false }
    ];
    const legDraw = (L, i) => {
        const x = L.x + swing(i), y0 = -lift(i);
        const pts = [[x - 7, -24], [x + 7, -24], [x + 8.5, -6 + y0], [x + 9.5, y0], [x - 8.5, y0], [x - 8, -8 + y0]];
        const m = blob(sh, pts, { base: L.far ? N.turtleSkinDeep : N.turtleSkin, hatch: N.turtleSkinDeep, angle: 1.2, lw: 1.9, baseP: 0.95, pressure: L.far ? 0.8 : 0.5 });
        // toenails
        for (let k = 0; k < 3; k++) sh.dots(P.paper, sh.T([[x + 4 + k * 2.2 - 4, y0 - 1.2]]), { rx: 0.9 * S, ry: 0.7 * S, alpha: 0.9, opaque: true });
        for (let k = 0; k < 2; k++) line(sh, sh.T([[x - 3 + k * 5, -12 + y0], [x - 1 + k * 5, -9 + y0]]), N.turtleSkinDeep, { width: 1.1, passes: 1, smoothIt: false });
        return m;
    };
    legs.filter((l) => l.far).forEach((L, i) => legDraw(L, i));
    // tail
    blob(sh, [[-48, -20], [-60, -17], [-48, -14]], { base: N.turtleSkin, hatch: N.turtleSkinDeep, lw: 1.6, smoothIt: false, baseP: 0.95, pressure: 0.5 });
    // neck and head: stretched up, chin high
    const nb = f === 2 ? 1.5 : 0;
    blob(sh, [[32, -40], [44, -56 + nb], [52, -63 + nb], [58, -58 + nb], [50, -46 + nb], [42, -28]], { base: N.turtleSkin, hatch: N.turtleSkinDeep, angle: 1, lw: 2, baseP: 0.95, pressure: 0.5 });
    const head = [[46, -64 + nb], [52, -72 + nb], [61, -75 + nb], [71, -72 + nb], [75.5, -66 + nb], [72, -60.5 + nb], [62, -58 + nb], [52, -58.5 + nb]];
    blob(sh, head, { base: N.turtleSkin, hatch: N.turtleSkinDeep, deep: N.turtleSkinDeep, angle: -0.4, lw: 2.1, baseP: 0.95, pressure: 0.45 });
    // a smug, half-closed eye and a proud little smile
    eyeAt(sh, [63.5, -68 + nb], 3.6, [0.4, 0.3], { lw: 1.5, lid: 0.52, lidColor: N.turtleSkin });
    line(sh, sh.T([[60, -63 + nb], [65, -61.5 + nb], [70, -62.5 + nb], [73, -64.5 + nb]]), P.graphite, { width: 1.5, passes: 1 });
    line(sh, sh.T([[73.8, -69.5 + nb], [74.6, -68.8 + nb]]), P.graphite, { width: 1.2, passes: 1, smoothIt: false });
    // the shell: a high dome with scutes and a pale rim
    const dome = [[-50, -21], [-47, -40], [-36, -58], [-18, -69], [2, -72], [20, -66], [34, -52], [41, -34], [42, -22], [30, -17], [0, -15.5], [-30, -16.5]];
    const dm = blob(sh, dome, { base: N.turtleShellLight, hatch: N.turtleShell, deep: N.turtleShellDeep, angle: -0.8, lw: 2.3, rimW: 4, baseP: 0.95, pressure: 0.75 });
    // the rim (marginal scutes) along the bottom
    const rim = multiplyMasks(dm, sh.mask(sh.T(smooth([[-52, -27], [-30, -23], [0, -22], [30, -23.5], [44, -28], [44, -10], [-52, -10]], { closed: true, steps: 4 }))));
    sh.fill(N.turtleShellLight, rim, { pressure: 0.9, grain: 0.6 });
    line(sh, sh.T(smooth([[-49, -27], [-30, -23.4], [0, -22.4], [30, -24], [42.5, -28.5]], { closed: false, steps: 4 })), P.graphite, { width: 1.6, clip: dm });
    for (const x of [-40, -27, -13, 1, 15, 28, 38]) line(sh, sh.T([[x, -23.5], [x + 0.6, -16.5]]), P.graphite, { width: 1.2, passes: 1, smoothIt: false, clip: dm });
    // big scutes: a middle row and a side row, each with a lighter centre
    const scutes = [
        [[-36, -30], [-38, -46], [-26, -58], [-14, -52], [-14, -33]],
        [[-14, -33], [-14, -52], [0, -60], [14, -54], [13, -34]],
        [[13, -34], [14, -54], [26, -52], [34, -40], [32, -28]],
        [[-26, -58], [-12, -67], [4, -69.5], [0, -60], [-14, -52]],
        [[4, -69.5], [18, -64], [26, -52], [14, -54], [0, -60]]
    ];
    for (const sc of scutes) {
        line(sh, sh.T([...sc, sc[0]]), P.graphite, { width: 1.5, passes: 1, smoothIt: false, clip: dm });
        const cx = sc.reduce((a, p) => a + p[0], 0) / sc.length, cy = sc.reduce((a, p) => a + p[1], 0) / sc.length;
        const inner = sc.map(([x, y]) => [cx + (x - cx) * 0.45, cy + (y - cy) * 0.45]);
        const im = multiplyMasks(dm, sh.mask(sh.T(inner)));
        paperOver(sh, im.map((v) => v * 0.5));
        sh.fill(N.turtleShellLight, im, { pressure: 0.7, grain: 0.6 });
        line(sh, sh.T([...inner, inner[0]]), N.turtleShellDeep, { width: 1.1, passes: 1, smoothIt: false });
    }
    // her racing number, pinned to the shell (she takes racing very seriously)
    const tag = [[-9, -46], [5, -47.5], [6, -35.5], [-8, -34]];
    const tm = sh.mask(sh.T(tag));
    reserve(sh, tm);
    outlineMask(sh, tm, P.graphite, { width: 1.5, wobble: 0.3 });
    drawHand(sh, [[[-1.6, -44], [0.4, -45.2], [0.6, -36.6]]], (p) => sh.pt(p), { width: 2.2, pressure: 1.2 });
    sh.dots(P.red, sh.T([[-6.8, -44.2], [3.8, -45.6]]), { rx: 1 * S, ry: 1 * S, alpha: 0.95, opaque: true });
    legs.filter((l) => !l.far).forEach((L, i) => legDraw(L, i + 1));
}

function creatureFrames(scale = 1.5) {
    const out = [];
    const mk = (name, w, h, anchor, draw) => {
        const sh = sprite(name, w, h, scale, anchor);
        draw(sh);
        out.push({ name, canvas: finish(sh, anchor), anchor });
    };
    for (let f = 0; f < 2; f++) mk(`lyktfisk-${f + 1}`, 60, 44, [0.5, 0.5], (sh) => drawLyktfisk(sh, f));
    for (let f = 0; f < 2; f++) mk(`fish-${f + 1}`, 50, 34, [0.5, 0.5], (sh) => drawFish(sh, f));
    for (let f = 0; f < 2; f++) mk(`hermit-${f + 1}`, 50, 40, [0.5, 1], (sh) => drawHermit(sh, f));
    for (let f = 0; f < 2; f++) mk(`eel-${f + 1}`, 40, 50, [0.5, 1], (sh) => drawEel(sh, f));
    mk('turtle-signe', 170, 100, [0.5, 1], (sh) => drawSigne(sh, 0));
    for (let f = 1; f <= 2; f++) mk(`turtle-signe-${f}`, 170, 100, [0.5, 1], (sh) => drawSigne(sh, f));
    return out;
}
export { creatureFrames };

// ---------------------------------------------------------------------------
// The table scene (prologue and epilogue), atlas `table`, scale 1
// ---------------------------------------------------------------------------
/**
 * A coloured pencil seen from above/aside, from the flat end `a` to the tip `b`
 * (px). `w` is its width. Hexagonal: a lighter facet stripe along the body.
 */
function colouredPencil(sh, a, b, w, color, { shade = null, coneFrac = 0.13, lead = null, endCap = true, lw = 2 } = {}) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const n = [-u[1], u[0]];
    const coneLen = Math.min(L * coneFrac, w * 2.6);
    const cb = add(a, scale2(u, L - coneLen));
    const h = w / 2;
    // body
    const body = [add(a, scale2(n, h)), add(cb, scale2(n, h)), sub(cb, scale2(n, h)), sub(a, scale2(n, h))];
    const bm = sh.mask(body);
    paperOver(sh, bm); sh.cutout(bm);
    const ang = Math.atan2(u[1], u[0]);
    sh.fill(color, bm, { pressure: 0.8, grain: 0.4 });
    sh.hatch(color, { angle: ang + 0.04, gap: 1.8, len: [20, 60], width: 1.6, clip: bm, pressure: 1, layers: 2, crossAngle: 0.06 });
    // facets: a dark lower facet and a light stripe
    const low = sh.mask([add(a, scale2(n, -h * 0.25)), add(cb, scale2(n, -h * 0.25)), sub(cb, scale2(n, h)), sub(a, scale2(n, h))]);
    sh.hatch(shade || color, { angle: ang, gap: 1.6, len: [20, 60], width: 1.5, clip: multiplyMasks(low, bm), pressure: 0.9 });
    const hi = sh.mask([add(a, scale2(n, h * 0.55)), add(cb, scale2(n, h * 0.55)), add(cb, scale2(n, h * 0.2)), add(a, scale2(n, h * 0.2))]);
    paperOver(sh, multiplyMasks(hi, bm).map((v) => v * 0.45));
    line(sh, [add(a, scale2(n, h * 0.2)), add(cb, scale2(n, h * 0.2))], P.graphiteSoft, { width: 1, alpha: 0.5, passes: 1, smoothIt: false });
    line(sh, [add(a, scale2(n, -h * 0.25)), add(cb, scale2(n, -h * 0.25))], P.graphiteSoft, { width: 1, alpha: 0.5, passes: 1, smoothIt: false });
    outlineMask(sh, bm, P.graphite, { width: lw, wobble: 0.4 });
    // the sharpened cone: shaved wood with scallops, then the coloured lead
    const cone = [add(cb, scale2(n, h)), b, sub(cb, scale2(n, h))];
    const cm = sh.mask(cone);
    paperOver(sh, cm); sh.cutout(cm);
    sh.fill(N.pencilWood, cm, { pressure: 0.7, grain: 0.5 });
    sh.hatch(P.wood, { angle: ang + 0.5, gap: 2.2, len: [4, 10], width: 1.2, clip: cm, pressure: 0.5 });
    // scalloped edge of the paint
    const sc = [];
    for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const p0 = add(cb, scale2(n, lerp(h, -h, t)));
        sc.push(add(p0, scale2(u, (i % 2 ? 1 : -0.4) * w * 0.08)));
    }
    line(sh, sc, P.graphite, { width: 1.3, passes: 1 });
    const leadLen = coneLen * 0.36;
    const lb = sub(b, scale2(u, leadLen));
    const lm = sh.mask([add(lb, scale2(n, h * 0.36)), b, sub(lb, scale2(n, h * 0.36))]);
    sh.cutout(lm);
    sh.fill(lead || color, lm, { pressure: 1, grain: 0.3 });
    sh.hatch(shade || color, { angle: ang, gap: 1.6, len: [3, 8], width: 1.2, clip: lm, pressure: 0.9 });
    outlineMask(sh, cm, P.graphite, { width: lw * 0.85, wobble: 0.3 });
    // the flat end: wood ring and coloured core
    if (endCap) {
        const e = sh.mask(ellipse(a[0], a[1], w * 0.14, h, 20, ang));
        sh.cutout(e);
        sh.fill(N.pencilWood, e, { pressure: 0.8 });
        sh.dots(lead || color, [a], { rx: w * 0.08, ry: w * 0.16, angle: ang, alpha: 1, opaque: true });
        outlineMask(sh, e, P.graphite, { width: 1.3 });
    }
    return bm;
}

/** A soft hatched shadow (cast on the table) of a mask, offset by (dx, dy). */
function castShadow(sh, m, dx, dy, { color = P.sandShadow, pressure = 0.6, blur = 3 } = {}) {
    const { w, h } = sh;
    const sm = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const sx = x - dx, sy = y - dy;
        if (sx >= 0 && sy >= 0 && sx < w && sy < h) sm[y * w + x] = m[(sy | 0) * w + (sx | 0)];
    }
    const soft = boxBlur(sm, w, h, blur);
    const only = subtractMask(soft, m);
    sh.cutout(only.map((v) => v * 0.55));
    sh.hatch(color, { angle: -0.6, gap: 1.8, len: [6, 16], width: 1.4, clip: only, pressure, opaque: true });
}

function drawAlvaPencil(sh) {
    // tip at the anchor; the pencil rises to the upper right into her sleeve
    const tip = [sh.ox, sh.oy];
    const ang = -0.62;
    const u = dir(ang), n = [-u[1], u[0]];
    const C = add(tip, scale2(u, 330)); // the cuff's opening
    const L = (s, t) => add(add(C, scale2(u, s)), scale2(n, t));
    // the sleeve: a soft knitted tube, a little baggy, running off the page
    const upper = [], lower = [];
    for (let s = 26; s <= 520; s += 20) {
        const bag = Math.sin(Math.min(1, (s - 26) / 180) * Math.PI / 2);
        upper.push(L(s, 60 + 18 * bag + 4 * Math.sin(s * 0.03)));
        lower.push(L(s, -(58 + 22 * bag) - 3 * Math.sin(s * 0.025 + 1)));
    }
    const sleeve = [...upper, ...lower.reverse()];
    const slm = sh.mask(sleeve);
    paperOver(sh, slm); sh.cutout(slm);
    sh.fill(N.cuffKnit, slm, { pressure: 0.62, grain: 0.5 });
    sh.hatch(N.cuffKnit, { angle: ang + 1.35, gap: 1.8, len: [8, 20], width: 1.6, clip: slm, pressure: 0.95, layers: 2, crossAngle: 0.5 });
    // shade on the lower side of the arm and soft creases across it
    const lowSide = sh.mask([L(0, -8), L(560, -8), L(560, -140), L(0, -140)]);
    sh.hatch(N.cuffKnitDeep, { angle: ang + 1.1, gap: 1.9, len: [8, 18], width: 1.5, clip: multiplyMasks(lowSide, slm), pressure: 0.7, pmap: gradientMap(sh.w, sh.h, ...L(0, 0), ...L(0, -90), 0.2, 1.1) });
    for (const [s0, bend] of [[96, 16], [168, 22], [250, 18], [330, 24]]) {
        const crease = [L(s0 + 6, 70), L(s0 - bend * 0.4, 30), L(s0 - bend * 0.6, -10), L(s0 - bend * 0.2, -52)];
        line(sh, crease, N.cuffKnitDeep, { width: 2, passes: 2, clip: slm, alpha: 0.85 });
        sh.hatch(N.cuffKnitDeep, { angle: ang, gap: 2, len: [5, 12], width: 1.3, clip: multiplyMasks(slm, strokeMask(sh, crease, 14)), pressure: 0.5 });
    }
    // knit texture: rows of little v-stitches
    for (let r = -3; r <= 3; r++) {
        for (let k = 0; k < 18; k++) {
            const c = L(70 + k * 24 + (r % 2) * 12, r * 20);
            line(sh, [add(c, add(scale2(u, -5), scale2(n, -5))), c, add(c, add(scale2(u, -5), scale2(n, 5)))], N.cuffKnitDeep, { width: 1.4, passes: 1, smoothIt: false, clip: slm, alpha: 0.55 });
        }
    }
    outlineMask(sh, slm, P.graphite, { width: 2.4, wobble: 0.7 });
    // the ribbed cuff: snug, a little narrower, its dark opening facing the tip
    const cuff = [];
    for (let i = 0; i <= 20; i++) { const t = lerp(-54, 58, i / 20); cuff.push(L(-10 - 12 * Math.sqrt(Math.max(0, 1 - ((t - 2) / 56) ** 2)), t)); }
    for (let i = 0; i <= 20; i++) { const t = lerp(58, -54, i / 20); cuff.push(L(40 + 3 * Math.sin(i), t)); }
    const cm = sh.mask(cuff);
    paperOver(sh, cm); sh.cutout(cm);
    sh.fill(N.cuffKnit, cm, { pressure: 0.75, grain: 0.5 });
    sh.hatch(N.cuffKnit, { angle: ang, gap: 1.7, len: [6, 14], width: 1.6, clip: cm, pressure: 1, layers: 2, crossAngle: 0.2 });
    for (let t = -50; t <= 54; t += 8) line(sh, [L(-14, t), L(40, t)], N.cuffKnitDeep, { width: 2.2, passes: 1, smoothIt: false, clip: cm, alpha: 0.95 });
    sh.hatch(N.cuffKnitDeep, { angle: ang + 1.2, gap: 2, len: [6, 14], width: 1.4, clip: multiplyMasks(cm, lowSide), pressure: 0.6 });
    outlineMask(sh, cm, P.graphite, { width: 2.4, wobble: 0.5 });
    // the opening: dark inside, where her hand holds the pencil
    const hole = [];
    for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU; hole.push(L(-11 + Math.cos(a) * 9, 2 + Math.sin(a) * 44)); }
    const hm = sh.mask(hole);
    sh.fill(N.cuffKnitDeep, hm, { pressure: 1, grain: 0.3 });
    sh.hatch(P.muzzleDark, { angle: ang + 1.5, gap: 1.8, len: [4, 12], width: 1.4, clip: hm, pressure: 0.7 });
    // the pencil, coming out of the cuff
    colouredPencil(sh, L(-6, -2), tip, 28, N.alvaPencilBlue, { shade: P.seaDeep, coneFrac: 0.2, lead: P.foamLine, endCap: false, lw: 2.4 });
    line(sh, [L(-4, 17), L(-7, -2), L(-4, -19)], P.muzzleDark, { width: 3, passes: 2 });
}

function drawPencilsLying(sh) {
    const set = [
        { a: [-190, 44], b: [150, 6], w: 22, c: P.mane, s: P.maneDark },
        { a: [-160, -62], b: [175, -30], w: 22, c: P.shellGreen, s: P.shellDark },
        { a: [170, 70], b: [-120, 88], w: 22, c: P.sunYellow, s: '#d9b21e' },
        { a: [-40, -110], b: [120, -104], w: 21, c: P.skyBlue, s: P.seaBlue, short: true }
    ];
    const masks = [];
    for (const p of set) {
        const m = colouredPencil(sh, sh.pt(p.a), sh.pt(p.b), p.w, p.c, { shade: p.s, coneFrac: p.short ? 0.2 : 0.12 });
        masks.push(m);
    }
    castShadow(sh, unionMasks(...masks), 7, 9, { pressure: 0.55 });
    // re-stroke the contours over the shadow
    for (const m of masks) outlineMask(sh, m, P.graphite, { width: 1.8, wobble: 0.4 });
}

function drawEraser(sh) {
    const ang = -0.22;
    const T = (pts) => sh.T(transform(pts, { rot: ang }));
    // a white eraser, one end worn round, a blue paper sleeve
    const body = T(smooth([[-52, -26], [34, -26], [48, -22], [54, -8], [54, 12], [48, 24], [34, 27], [-52, 27], [-56, 20], [-56, -20]], { closed: true, steps: 4 }));
    const bm = sh.mask(body);
    paperOver(sh, bm); sh.cutout(bm);
    sh.fill(N.eraserBody, bm, { pressure: 0.35, grain: 0.5 });
    sh.hatch(P.coatShade, { angle: 0.9, gap: 2.4, len: [6, 14], width: 1.2, clip: multiplyMasks(bm, sh.mask(T([[-60, 8], [60, 8], [60, 30], [-60, 30]]))), pressure: 0.5 });
    const sleeve = T([[-40, -29], [8, -29], [8, 30], [-40, 30]]);
    const svm = multiplyMasks(sh.mask(sleeve), sh.mask(T([[-44, -31], [12, -31], [12, 32], [-44, 32]])));
    paperOver(sh, svm); sh.cutout(svm);
    sh.fill(N.eraserSleeve, svm, { pressure: 0.8, grain: 0.45 });
    sh.hatch(P.seaDeep, { angle: ang + 1.4, gap: 2, len: [6, 16], width: 1.4, clip: svm, pressure: 0.6 });
    // a white stripe with a little wave on the sleeve
    const stripe = multiplyMasks(svm, sh.mask(T([[-40, -6], [8, -6], [8, 5], [-40, 5]])));
    paperOver(sh, stripe);
    line(sh, T([[-36, 0], [-28, -3], [-20, 2], [-12, -3], [-4, 2], [4, -2]]), P.seaBlue, { width: 1.8, passes: 1 });
    outlineMask(sh, svm, P.graphite, { width: 1.8 });
    outlineMask(sh, bm, P.graphite, { width: 2.2, wobble: 0.5 });
    castShadow(sh, bm, 6, 8, { pressure: 0.5 });
    outlineMask(sh, bm, P.graphite, { width: 1.6, wobble: 0.5 });
    // crumbs
    const crumbs = [[66, 18], [72, 8], [62, 34], [80, 26], [74, -6], [58, -30]];
    for (const [x, y] of crumbs) {
        const m = sh.mask(sh.T(ellipse(x, y, 4.2, 2.6, 12, x * 0.3)));
        sh.cutout(m); sh.fill(N.eraserBody, m, { pressure: 0.4 }); outlineMask(sh, m, P.graphiteSoft, { width: 1.1, wobble: 0.3 });
    }
}

function drawHoofprintWet(sh) {
    const S = sh.S;
    // damp paper: a darker, bluish stain with a crisp tide line
    const stain = smooth([[-50, -40], [-10, -58], [30, -52], [54, -22], [56, 18], [40, 50], [6, 60], [-30, 52], [-54, 26], [-60, -10]], { closed: true, steps: 6 });
    const stm = sh.mask(sh.T(stain), { feather: 1.5 });
    sh.cutout(stm.map((v) => v * 0.55));
    sh.hatch(P.skyBlue, { angle: 0.3, gap: 2, len: [8, 20], width: 1.5, clip: stm, pressure: 0.55, opaque: true });
    sh.hatch(P.coatGrey, { angle: -0.9, gap: 2.8, len: [6, 14], width: 1.2, clip: stm, pressure: 0.35, opaque: true });
    line(sh, sh.T([...stain, stain[0]]), P.seaBlue, { width: 1.8, alpha: 0.7, passes: 1 });
    // the print: a round hoof with the V of the frog at the back
    const hoof = smooth([[-34, 6], [-32, -18], [-18, -36], [2, -41], [22, -35], [34, -16], [35, 8], [24, 28], [12, 34], [8, 18], [0, 10], [-8, 18], [-12, 34], [-24, 28]], { closed: true, steps: 5 });
    const hm = sh.mask(sh.T(hoof));
    sh.cutout(hm);
    sh.hatch(P.seaBlue, { angle: 0.4, gap: 1.8, len: [8, 18], width: 1.6, clip: hm, pressure: 0.85, opaque: true, layers: 2, crossAngle: 1.1 });
    sh.hatch(P.seaDeep, { angle: 0.5, gap: 2.2, len: [5, 12], width: 1.3, clip: edgeBand(hm, sh.w, sh.h, 7), pressure: 0.8, opaque: true });
    const inner = smooth([[-20, 2], [-19, -14], [-8, -26], [4, -28], [16, -22], [21, -8], [20, 8], [12, 4], [2, -2], [-8, 4]], { closed: true, steps: 4 });
    const im = multiplyMasks(hm, sh.mask(sh.T(inner)));
    sh.hatch(P.skyPale, { angle: -0.3, gap: 2.4, len: [5, 12], width: 1.2, clip: im, pressure: 0.6 });
    outlineMask(sh, hm, P.foamLine, { width: 2, wobble: 0.5 });
    // her droplets: paper-white ovals with a dark-blue outline
    for (const [x, y, r] of [[48, -40, 5], [58, -26, 3.4], [-54, 38, 4.2], [-44, 50, 2.8], [30, 58, 3.6]]) {
        const dm = sh.mask(sh.T(ellipse(x, y, r, r * 1.25, 16, 0.3)));
        reserve(sh, dm);
        outlineMask(sh, dm, P.foamLine, { width: 1.5, wobble: 0.3 });
    }
    // a few grains of sand, and one tiny scrap of kelp: evidence
    sh.dots(P.sandShade, sh.T([[-20, 20], [-14, 26], [18, 22], [26, 14], [-30, -4], [10, -30], [-4, 40], [40, 30]]), { rx: 1.4 * S, ry: 1.1 * S, alpha: 0.95, opaque: true });
    const kelp = smooth([[36, 38], [44, 32], [52, 34], [58, 28]], { closed: false, steps: 5 });
    const km = taperMask(sh, sh.T(kelp), 5, 2);
    sh.cutout(km); sh.fill(P.kelp, km, { pressure: 0.9 });
    outlineMask(sh, km, P.kelpDark, { width: 1.2 });
}

function drawWindowDusk(sh) {
    const W = 900, H = 620;
    const x0 = -W / 2, y0 = -H / 2;
    const px = (x, y) => sh.pt([x, y]);
    // curtains first (behind the frame's edges)
    // the evening sky in the glass
    const gl = [x0 + 150, y0 + 60, x0 + W - 150, y0 + H - 120]; // glass rect
    const glass = sh.mask(sh.T([[gl[0], gl[1]], [gl[2], gl[1]], [gl[2], gl[3]], [gl[0], gl[3]]]));
    sh.cutout(glass);
    const gy0 = sh.pt([0, gl[1]])[1], gy1 = sh.pt([0, gl[3]])[1];
    sh.hatch(N.duskTop, { angle: 0.02, gap: 1.8, len: [30, 90], width: 1.8, clip: glass, pmap: gradientMap(sh.w, sh.h, 0, gy0, 0, gy1, 1.1, 0.0), layers: 2, crossAngle: 0.05 });
    sh.hatch(N.duskMid, { angle: -0.03, gap: 2, len: [30, 90], width: 1.8, clip: glass, pmap: pencil.pressureMap(sh.w, sh.h, (x, y) => { const t = (y - gy0) / (gy1 - gy0); return Math.max(0, 1 - Math.abs(t - 0.55) / 0.3) * 0.9; }) });
    sh.hatch(N.duskLow, { angle: 0.03, gap: 1.8, len: [30, 90], width: 1.8, clip: glass, pmap: gradientMap(sh.w, sh.h, 0, gy0 + (gy1 - gy0) * 0.45, 0, gy1, 0, 1.05), layers: 2, crossAngle: 0.05 });
    sh.hatch(N.duskGlow, { angle: 0, gap: 2.2, len: [40, 100], width: 1.8, clip: glass, pmap: gradientMap(sh.w, sh.h, 0, gy0 + (gy1 - gy0) * 0.7, 0, gy1, 0, 0.8) });
    // her sky is blended: burnish it smooth, then a few light strokes back on top
    sh.burnish(glass, 4, 0.92);
    sh.burnish(glass, 2, 0.6);
    sh.hatch(N.duskTop, { angle: 0.02, gap: 7, len: [40, 110], width: 1.4, clip: glass, pmap: gradientMap(sh.w, sh.h, 0, gy0, 0, gy1, 0.5, 0.0) });
    // a thin new moon
    const [mx, my] = px(170, y0 + 150);
    const moon = subtractMask(sh.mask(ellipse(mx, my, 26, 26, 40)), sh.mask(ellipse(mx + 11, my - 7, 24, 24, 40)));
    reserve(sh, moon);
    sh.hatch(P.sunGlow, { angle: 0.5, gap: 2.4, len: [4, 10], width: 1.2, clip: moon, pressure: 0.6 });
    outlineMask(sh, moon, '#b89a3a', { width: 1.4 });
    // spruce tops and a roof against the glow
    const skyline = [[gl[0], gl[3]], [gl[0], gl[3] - 60]];
    const trees = [[-290, 150], [-236, 190], [-170, 130], [-110, 172], [-50, 118], [210, 160], [262, 205], [305, 140]];
    for (let x = gl[0]; x <= gl[2]; x += 6) {
        let top = gl[3] - 42 - 10 * Math.sin(x * 0.02);
        for (const [tx, th] of trees) {
            const d = Math.abs(x - tx);
            if (d < th * 0.34) top = Math.min(top, gl[3] - th + d * 2.9 + (Math.floor(d / 9) % 2) * 7);
        }
        // a little house roof with a lit window
        if (x > 20 && x < 150) top = Math.min(top, gl[3] - 96 + Math.abs(x - 85) * 0.7);
        skyline.push([x, top]);
    }
    skyline.push([gl[2], gl[3] - 60], [gl[2], gl[3]]);
    const ground = sh.mask(sh.T(skyline));
    const gm = multiplyMasks(ground, glass);
    paperOver(sh, gm);
    sh.fill(N.treeDusk, gm, { pressure: 0.8, grain: 0.3 });
    sh.hatch(N.treeDusk, { angle: 1.2, gap: 1.8, len: [8, 20], width: 1.6, clip: gm, pressure: 0.9, layers: 2, crossAngle: 0.8 });
    sh.burnish(gm, 2, 0.7);
    const lit = sh.mask(sh.T([[70, gl[3] - 58], [96, gl[3] - 58], [96, gl[3] - 36], [70, gl[3] - 36]]));
    reserve(sh, lit);
    sh.fill(P.warmLight, lit, { pressure: 0.9 });
    // the frame: painted white wood, two casements with glazing bars
    const outer = [[x0 + 110, y0 + 22], [x0 + W - 110, y0 + 22], [x0 + W - 110, y0 + H - 84], [x0 + 110, y0 + H - 84]];
    const frameM = subtractMask(sh.mask(sh.T(outer)), glass);
    const bars = [];
    const midX = 0, barW = 22, rail = 14;
    bars.push([[midX - barW / 2, gl[1]], [midX + barW / 2, gl[1]], [midX + barW / 2, gl[3]], [midX - barW / 2, gl[3]]]);
    for (const yy of [gl[1] + (gl[3] - gl[1]) / 3, gl[1] + (2 * (gl[3] - gl[1])) / 3]) bars.push([[gl[0], yy - rail / 2], [gl[2], yy - rail / 2], [gl[2], yy + rail / 2], [gl[0], yy + rail / 2]]);
    const barM = unionMasks(...bars.map((b) => sh.mask(sh.T(b))));
    const woodM = unionMasks(frameM, barM);
    paperOver(sh, woodM); sh.cutout(woodM);
    sh.fill(N.windowFrame, woodM, { pressure: 0.6 });
    sh.hatch(P.coatShade, { angle: 0.8, gap: 2.4, len: [8, 20], width: 1.3, clip: edgeBand(woodM, sh.w, sh.h, 8), pressure: 0.55 });
    outlineMask(sh, woodM, P.graphite, { width: 2.2, wobble: 0.6 });
    // the sill
    const sill = [[x0 + 80, y0 + H - 90], [x0 + W - 80, y0 + H - 90], [x0 + W - 70, y0 + H - 64], [x0 + 70, y0 + H - 64]];
    part(sh, sh.mask(sh.T(sill)), { base: N.windowFrame, basePressure: 0.6, hatch: P.coatShade, hatchPressure: 0.35, angle: 0.1, lineWidth: 2.2 });
    // soft curtains at both sides
    for (const side of [-1, 1]) {
        const xo = side * (W / 2 - 60);
        const cur = smooth([[xo - side * 70, y0 + 6], [xo + side * 58, y0 + 6], [xo + side * 60, y0 + H - 8], [xo - side * 20, y0 + H - 4], [xo - side * 44, y0 + H * 0.62], [xo - side * 76, y0 + H * 0.3]], { closed: true, steps: 6 });
        const cm = sh.mask(sh.T(cur));
        paperOver(sh, cm); sh.cutout(cm);
        sh.fill(N.curtain, cm, { pressure: 0.55, grain: 0.25 });
        const folds = [];
        for (let k = 0; k < 5; k++) {
            const xf = xo - side * (54 - k * 26);
            folds.push(sh.T(smooth([[xf, y0 + 14], [xf + side * 6, y0 + H * 0.35], [xf + side * (10 + k * 5), y0 + H * 0.7], [xf + side * (14 + k * 8), y0 + H - 10]], { closed: false, steps: 6 })));
        }
        sh.hatch(N.duskMid, { angle: 1.4, gap: 3, len: [10, 30], width: 1.4, clip: cm, pressure: 0.3 });
        sh.burnish(cm, 2, 0.8);
        sh.flow(P.wood, folds, { count: 3, spread: 4, width: 1.6, clip: cm, alpha: [0.35, 0.65], pressure: 0.7 });
        outlineMask(sh, cm, P.graphite, { width: 2.2, wobble: 0.6 });
    }
}

function drawStar(sh) {
    const S = sh.S;
    const [cx, cy] = [sh.ox, sh.oy];
    halo(sh, cx, cy, 6 * S, 20 * S, P.sunGlow, { pressure: 0.75, falloff: 1.6 });
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * TAU + (i % 2 ? 0.04 : -0.03);
        const r = (i % 2 ? 5.2 : 13) * S * (1 + (i === 0 ? 0.06 : 0));
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    const m = sh.mask(pts);
    paperOver(sh, m); sh.cutout(m);
    sh.fill(P.sunYellow, m, { pressure: 0.85, grain: 0.45 });
    sh.hatch('#e8b52a', { angle: 0.6, gap: 1.8, len: [4, 10], width: 1.3, clip: m, pressure: 0.8 });
    paperOver(sh, multiplyMasks(m, sh.mask(ellipse(cx - 1.5 * S, cy - 1.5 * S, 3 * S, 3 * S, 16), { feather: 1.5 })).map((v) => v * 0.8));
    outlineMask(sh, m, '#a8842a', { width: 1.6, wobble: 0.3 });
}

export function tableFrames() {
    const out = [];
    const mk = (name, w, h, anchor, draw) => {
        const sh = sprite(name, w, h, 1, anchor);
        draw(sh);
        out.push({ name, canvas: finish(sh, anchor), anchor });
    };
    mk('alva-pencil', 760, 520, [0.08, 0.95], drawAlvaPencil);
    mk('pencils-lying', 440, 280, [0.5, 0.5], drawPencilsLying);
    mk('eraser', 190, 120, [0.5, 0.5], drawEraser);
    mk('hoofprint-wet', 150, 150, [0.5, 0.5], drawHoofprintWet);
    mk('window-dusk', 900, 620, [0.5, 0.5], drawWindowDusk);
    mk('star-1', 50, 50, [0.5, 0.5], drawStar);
    return out;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------
export async function build(api) {
    api.atlas('npcs', { scale: 1.5, bundle: 'boot', quality: 70 });
    for (const f of [...buildKloFrames(1.5), ...buildKloParts(1.5)]) api.frame('npcs', f.name, f.canvas, f.anchor);
    for (const f of buildSignFrames(1.5)) api.frame('npcs', f.name, f.canvas, f.anchor);
    // shy beach creatures ride in boot; the lyktfiskar live in Kelpskogen (sea) and
    // Signe only races after the ending (land), so they wait for their bundles
    const creatures = creatureFrames(1.5);
    const isSea = (c) => c.name.startsWith('lyktfisk');
    const isLand = (c) => c.name.startsWith('turtle-signe');
    for (const f of creatures.filter((c) => !isSea(c) && !isLand(c))) api.frame('npcs', f.name, f.canvas, f.anchor);
    api.atlas('npcs-sea', { scale: 1.5, bundle: 'sea', quality: 80 });
    for (const f of creatures.filter(isSea)) api.frame('npcs-sea', f.name, f.canvas, f.anchor);
    api.atlas('npcs-land', { scale: 1.5, bundle: 'land', quality: 78 });
    for (const f of creatures.filter(isLand)) api.frame('npcs-land', f.name, f.canvas, f.anchor);
    api.atlas('npcs-bay', { scale: 1.5, bundle: 'bay', quality: 78 });
    for (const f of [...buildKvFrames(1.5), ...buildGuardianParts(1.5)]) api.frame('npcs-bay', f.name, f.canvas, f.anchor);
    api.atlas('table', { scale: 1, bundle: 'boot', quality: 72 });
    for (const f of tableFrames()) api.frame('table', f.name, f.canvas, f.anchor);
}

export { pincerPts, kloPaint };
