/*
 * The sköldhäst: Alva's creature, drawn part by part in colored pencil, plus
 * the rig data (`hero-rig.json`) the runtime (`skoldhast/src/rig.mjs`,
 * `skoldhast/src/hero.mjs`) animates it with.
 *
 * Every shape was traced by hand from a measuring grid laid over the
 * reference photo (plan §2.2) and is written here in "trace units": pixels of
 * that 1120×840 grid. `T()` maps them to world units (wu) of the rest pose:
 * 1 HL (muzzle to rump) = 200 wu, origin on the ground under the middle of the
 * body, y down, facing right. Nothing of the photo itself is used; the parts
 * are drawn from these numbers with the pencil toolkit.
 *
 * Each part is drawn in rest-pose body space, so its pivot (a joint) becomes
 * its anchor and the runtime only turns parts about their joints. Strips (mane
 * tufts, forelock, tail, kelp fringes) are drawn straight, root at the top,
 * and laid along verlet spines at runtime. Parts are drawn at 2× and filtered
 * down to the atlas density (1.5 px per wu).
 */
import { createCanvas } from '@napi-rs/canvas';
import {
    Sheet, PENCILS as P, smooth, ellipse, edgeBand, gradientMap, pressureMap, multiplyMasks,
    subtractMask, unionMasks, hashSeed, mix, rng, boxBlur
} from './pencil.mjs';

const S = 1.5;            // atlas density: texture px per wu (SPEC §1)
const SS = 2;             // drawn at 2× and filtered down
const D = S * SS;         // drawing px per wu
const K = 0.527;          // wu per trace unit
const TX0 = 330, TY0 = 766; // trace point of the origin (ground under the body middle)
const T = (x, y) => [(x - TX0) * K, (y - TY0) * K];
const r1 = (v) => Math.round(v * 10) / 10;
const r4 = (v) => Math.round(v * 10000) / 10000;
const TP = (x, y) => T(x, y).map(r1);
const GRAIN = 3.2;        // paper tooth scale on the 2× sheets

// ---------------------------------------------------------------------------
// Colors: Alva's pencil box, plus a few layered mixes of it
// ---------------------------------------------------------------------------
const C = {
    coat: P.coat,
    shade: mix(P.coatShade, P.sandShade, 0.4),       // warm grey-brown shading
    shadeSoft: mix(P.coat, P.sandShade, 0.35),
    tan: mix(P.sandShade, P.maneLight, 0.45),        // warm tan under the forelock
    line: P.graphite,
    lineSoft: P.graphiteSoft,
    lineWarm: mix(P.graphite, P.muzzle, 0.35),
    strap: P.halter,
    strapDark: P.halterDark,
    band: mix(P.muzzle, P.tailDeep, 0.45),           // the wide red-brown belly band
    shellYellow: mix(P.shellLight, P.sunYellow, 0.3),
    shellOlive: mix(P.shellGreen, P.shellLight, 0.45),
    shellDeep: mix(P.shellDark, P.shellGreen, 0.3),
    seamLine: mix(P.shellDark, P.graphite, 0.35),
    rim: mix(P.shellRim, P.sunGlow, 0.3),
    kelpBase: mix(mix(P.kelp, P.grassGreen, 0.3), P.coatGrey, 0.22),
    kelpLeaf: mix(mix(P.grassGreen, P.shellLight, 0.3), P.grassSilver, 0.3),
    kelpDeep: mix(mix(P.kelpDark, P.kelp, 0.3), P.graphiteSoft, 0.25),
    hoofBrown: mix(P.muzzle, P.hoof, 0.3),
    maneTip: mix(P.maneDark, P.graphiteSoft, 0.6),
    maneLine: mix(P.maneDark, P.graphite, 0.35),
    tailLine: mix(P.tailDeep, P.graphite, 0.4),
    shadow: mix(P.sandShadow, P.muzzle, 0.25)
};

// ---------------------------------------------------------------------------
// The rest-pose skeleton (trace units), shared by the drawings and the rig
// ---------------------------------------------------------------------------
const J = {
    body: [318, 525],       // pitch pivot (centre of the barrel)
    neck: [440, 470],       // neck base, hidden under collar and shell
    head: [474, 371],       // poll/throat: the head turns here
    eye: [503, 377],
    mouth: [546, 414],
    elbow: [412, 551],      // near fore: shoulder joint under the forearm band
    carpus: [416, 640],
    foreHoof: [416, 740],   // hoof pivot (coronet), sole on the ground
    hip: [238, 528],        // near hind: under the rear shell rim
    hock: [234, 652],
    hindHoof: [236, 740],
    tail: [199, 494]
};
const GROUND = 766;
const HOOF_H = (GROUND - J.foreHoof[1]) * K;

// far legs: offset of the far-side joints from the near ones (wu)
const FAR = { fore: [-4, -2], hind: [5, -2] };

// ---------------------------------------------------------------------------
// Part sheets: drawn in body space at 2×, filtered down to 1.5 px/wu
// ---------------------------------------------------------------------------
class Part {
    /** box: [x0, y0, x1, y1] in wu (body space or strip space) */
    constructor(name, box, { pad = 3, grain = GRAIN, seed } = {}) {
        this.name = name;
        this.ox = Math.floor(box[0] * S) - pad;
        this.oy = Math.floor(box[1] * S) - pad;
        this.ow = Math.ceil(box[2] * S) + pad - this.ox;
        this.oh = Math.ceil(box[3] * S) + pad - this.oy;
        this.w = this.ow * SS;
        this.h = this.oh * SS;
        this.s = new Sheet(this.w, this.h, { paper: false, seed: seed ?? hashSeed(`hero/${name}`), grain });
        this.rand = rng(hashSeed(`hero/${name}/shapes`));
    }
    /** wu -> drawing px */
    p(q) { return [(q[0] * S - this.ox) * SS, (q[1] * S - this.oy) * SS]; }
    pts(list) { return list.map((q) => this.p(q)); }
    /** trace units -> drawing px */
    t(q) { return this.p(T(q[0], q[1])); }
    ts(list) { return list.map((q) => this.t(q)); }
    u(wu) { return wu * D; }
    mask(pts, opts) { return this.s.mask(pts, opts); }
    /** smooth closed outline in drawing px from trace units */
    shape(list, steps = 6) { return smooth(this.ts(list), { closed: true, steps }); }
    line(list, steps = 6) { return smooth(this.ts(list), { closed: false, steps }); }
    finish(pivotWu, stripBox) {
        const canvas = downsample(this.s, SS);
        const anchor = pivotWu
            ? [r4((pivotWu[0] * S - this.ox) / this.ow), r4((pivotWu[1] * S - this.oy) / this.oh)]
            : [0.5, 0.5];
        const out = { canvas, anchor };
        if (stripBox) {
            // where the strip's drawn region [-W/2, 0]..[W/2, L] sits in the frame (0..1)
            const [x0, y0, x1, y1] = stripBox;
            out.uv = [r4((x0 * S - this.ox) / this.ow), r4((y0 * S - this.oy) / this.oh), r4((x1 * S - this.ox) / this.ow), r4((y1 * S - this.oy) / this.oh)];
        }
        return out;
    }
}

/** 2×2 box filter with premultiplied alpha. */
function downsample(sheet, f) {
    const w = sheet.w / f, h = sheet.h / f;
    const cv = createCanvas(w, h);
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let j = 0; j < f; j++) {
                for (let i = 0; i < f; i++) {
                    const k = (y * f + j) * sheet.w + (x * f + i);
                    const al = sheet.a[k];
                    r += sheet.r[k] * al; g += sheet.g[k] * al; b += sheet.b[k] * al; a += al;
                }
            }
            const o = (y * w + x) * 4;
            if (a > 0) { d[o] = cl(r / a); d[o + 1] = cl(g / a); d[o + 2] = cl(b / a); }
            d[o + 3] = cl((a / (f * f)) * 255);
        }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
}

/** Bounding box in wu of trace-unit point lists, with a margin in wu. */
function boxOf(lists, m = 2) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const l of lists) for (const q of l) {
        const [x, y] = T(q[0], q[1]);
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return [x0 - m, y0 - m, x1 + m, y1 + m];
}

// ---------------------------------------------------------------------------
// Material helpers
// ---------------------------------------------------------------------------
/** A smooth layer of pencil (dense, directional strokes, little tooth). */
function layer(part, color, clip, { pressure = 0.8, angle = -0.6, gap = 2.1, width = 2.6, len = [22, 56], grain = 0.5, pmap = null, jitter = 1.2 } = {}) {
    part.s.hatch(color, { angle, gap, len, width, clip, pressure, grain, pmap, jitter, bow: 2, alpha: [0.65, 1] });
}
/** Lighter visible strokes over a layer (the hand shows). */
function strokes(part, color, clip, { pressure = 0.6, angle = -0.6, gap = 3.2, width = 2.2, len = [10, 30], grain = 0.9, pmap = null } = {}) {
    part.s.hatch(color, { angle, gap, len, width, clip, pressure, grain, pmap, jitter: 1.4, bow: 1.5, alpha: [0.45, 0.95] });
}
/** Fresh paper over whatever is under `mask` (a front piece drawn over a back one). */
function paperOver(part, mask) {
    const s = part.s;
    const [pr, pg, pb] = [0xfb, 0xf8, 0xf1];
    for (let i = 0; i < mask.length; i++) {
        const k = mask[i];
        if (k <= 0) continue;
        s.r[i] += (pr - s.r[i]) * k; s.g[i] += (pg - s.g[i]) * k; s.b[i] += (pb - s.b[i]) * k;
        s.a[i] = Math.max(s.a[i], k);
    }
}
function darken(part, amount, clip) {
    // "one pencil darker": an even layer of warm grey over everything drawn
    layer(part, mix(P.coatShade, P.coatGrey, 0.3), clip, { pressure: amount, angle: -0.5, grain: 0.3 });
}
/** Directional pressure: 1 on the side (dx, dy) points to, 0 on the opposite side. */
function sideMap(part, box, dx, dy, lo = 0, hi = 1) {
    const [x0, y0, x1, y1] = box;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const half = Math.abs(ux) * (x1 - x0) / 2 + Math.abs(uy) * (y1 - y0) / 2 || 1;
    return pressureMap(part.w, part.h, (x, y) => {
        let t = ((x - cx) * ux + (y - cy) * uy) / half;
        t = (t + 1) / 2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        return lo + (hi - lo) * t;
    });
}
function bboxPx(mask, w, h) {
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x] > 0.05) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return [x0, y0, x1, y1];
}
function offsetLine(line, d) {
    const out = [];
    for (let i = 0; i < line.length; i++) {
        const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
        out.push([line[i][0] - ty * d, line[i][1] + tx * d]);
    }
    return out;
}
/** Coat: paper cut out, a light cream layer, soft warm shading toward `shadeDir` and at the edges. */
function coat(part, mask, { shadeDir = [0, 1], shadeLo = 0, shadeHi = 0.7, edge = 6, edgeP = 0.5, far = false } = {}) {
    const s = part.s;
    s.cutout(mask);
    layer(part, C.coat, mask, { pressure: 0.3, angle: -0.5, grain: 0.45, gap: 2.4 });
    const box = bboxPx(mask, part.w, part.h);
    const dir = sideMap(part, box, shadeDir[0], shadeDir[1], shadeLo, shadeHi);
    layer(part, C.shadeSoft, mask, { pressure: 0.62, angle: -0.9, grain: 0.25, pmap: dir });
    strokes(part, C.shade, multiplyMasks(mask, dir), { pressure: 0.32, angle: -0.9, gap: 3.6, grain: 0.45 });
    const band = edgeBand(mask, part.w, part.h, part.u(edge));
    layer(part, C.shade, multiplyMasks(band, dir), { pressure: edgeP, angle: 0.7, grain: 0.3, len: [10, 26] });
    if (far) darken(part, 0.55, mask);
}

// ---------------------------------------------------------------------------
// Traced shapes (trace units)
// ---------------------------------------------------------------------------
const HEAD = [
    [468, 368], [471, 357], [479, 350], [490, 346], [503, 346], [516, 350], [528, 357], [537, 366], [543, 376],
    [548, 386], [555, 390], [563, 393], [568, 398], [571, 405], [572, 413], [569, 421], [563, 428], [554, 432],
    [544, 433], [535, 431], [527, 429], [517, 428], [505, 427], [494, 426], [485, 424], [478, 418], [473, 408],
    [470, 396], [468, 382]
];
const MUZZLE = [
    [546, 388], [555, 390], [563, 393], [568, 398], [571, 405], [572, 413], [569, 421], [563, 428], [554, 432],
    [544, 433], [535, 431], [527, 429], [521, 426], [519, 418], [523, 409], [530, 401], [538, 394]
];
// talking: the lower lip parts a little
const MUZZLE_TALK = [
    [546, 388], [555, 390], [563, 393], [568, 398], [571, 405], [572, 413], [569, 421], [564, 428], [557, 434],
    [547, 437], [537, 436], [528, 433], [521, 428], [519, 418], [523, 409], [530, 401], [538, 394]
];
// the open muzzle (neigh): lower lip dropped
const MUZZLE_OPEN = [
    [546, 388], [555, 390], [563, 393], [568, 398], [571, 405], [572, 413], [570, 421], [565, 427], [560, 432],
    [556, 440], [548, 445], [538, 445], [529, 441], [522, 434], [519, 424], [522, 412], [529, 402], [538, 394]
];
const NOSEBAND = [[550, 388], [539, 395], [529, 402], [521, 409], [516, 418], [515, 428]];
const CHEEK = [[520, 408], [510, 398], [500, 388], [490, 378], [483, 368], [479, 357]];
const THROATLATCH = [[478, 364], [475, 378], [475, 393], [478, 407], [484, 418], [494, 425], [506, 427], [515, 426]];
const NECK = [
    [476, 349], [466, 357], [455, 367], [443, 378], [431, 390], [420, 402], [410, 415], [401, 428], [395, 442],
    [392, 460], [395, 478], [405, 490], [425, 498], [455, 504], [484, 506], [491, 498], [490, 482], [488, 466],
    [486, 450], [485, 436], [484, 424], [482, 410], [480, 392], [478, 376], [477, 360]
];
const CREST = [[478, 350], [466, 357], [455, 367], [443, 378], [431, 390], [420, 402], [410, 415], [401, 428], [395, 442]];
const COLLAR = [
    [403, 423], [418, 431], [434, 442], [450, 453], [466, 465], [480, 475], [492, 483],
    [491, 501], [477, 493], [462, 483], [446, 472], [430, 461], [414, 450], [397, 439]
];
const TORSO = [
    [398, 432], [372, 438], [345, 442], [318, 446], [290, 452], [262, 461], [236, 473], [214, 487], [199, 502],
    [191, 520], [190, 540], [194, 558], [202, 574], [214, 585], [232, 590], [252, 588], [268, 578], [284, 569],
    [305, 571], [330, 575], [355, 578], [380, 578], [400, 574], [420, 568], [440, 563], [457, 557], [471, 549],
    [481, 539], [488, 526], [491, 512], [491, 498], [482, 488], [465, 476], [445, 462], [425, 448], [408, 438]
];
const SHELL = [
    [186, 516], [187, 503], [193, 488], [204, 472], [219, 458], [237, 446], [259, 433], [285, 421], [312, 413],
    [338, 409], [360, 409], [381, 413], [397, 419], [407, 427], [412, 438], [414, 452], [413, 466], [410, 479],
    [405, 489], [399, 497], [386, 505], [367, 513], [343, 521], [317, 528], [291, 534], [265, 539], [243, 541],
    [224, 539], [207, 533], [194, 526]
];
const RIM_TOP = [[406, 484], [392, 493], [372, 501], [347, 509], [321, 516], [295, 522], [269, 526], [246, 528], [226, 526], [209, 520], [196, 512], [189, 503]];
const SEAMS = [
    // the vertebral row: three big hexagonal plates along the ridge
    [[200, 481], [238, 446], [268, 466], [306, 451], [338, 456], [370, 452], [396, 473], [409, 481]],
    [[200, 481], [218, 510], [256, 499], [268, 480], [268, 466]],
    [[268, 480], [295, 496], [334, 487], [338, 456]],
    [[334, 487], [352, 507], [382, 499], [396, 473]],
    // up to the top edge (the far side plates)
    [[238, 446], [252, 436]],
    [[306, 451], [316, 413]],
    [[370, 452], [388, 416]],
    // down to the rim (the near side plates)
    [[218, 510], [214, 521]],
    [[256, 499], [262, 527]],
    [[295, 496], [300, 522]],
    [[352, 507], [350, 511]]
];
const FORE_UPPER = [
    [370, 566], [373, 552], [381, 540], [394, 532], [410, 529], [425, 530], [438, 536], [448, 546], [453, 558],
    [451, 573], [447, 591], [444, 609], [442, 626], [441, 641], [437, 651], [427, 657], [414, 658], [401, 655],
    [392, 648], [389, 632], [388, 614], [387, 596], [386, 580], [382, 571], [376, 569]
];
const FORE_BAND_OUT = [[369, 568], [372, 552], [381, 540], [394, 532], [410, 528], [425, 529], [438, 535], [449, 546], [454, 560]];
const FORE_BAND_IN = [[445, 564], [441, 554], [432, 545], [420, 540], [407, 539], [394, 543], [385, 551], [380, 562], [378, 569]];
const FORE_LOWER = [ // cannon under the kelp sleeve
    [399, 632], [407, 626], [416, 625], [426, 627], [432, 633], [432, 660], [431, 690], [430, 718], [429, 740],
    [404, 740], [402, 718], [401, 690], [400, 660]
];
const FORE_KELP = [ // the sleeve: from over the carpus down to where the fringe takes over
    [397, 634], [402, 626], [410, 622], [419, 621], [428, 623], [435, 629], [439, 646], [441, 666], [443, 686],
    [445, 706], [446, 724], [390, 724], [391, 706], [392, 686], [393, 666], [395, 648]
];
const HIND_UPPER = [
    [196, 513], [214, 506], [240, 504], [264, 509], [280, 519], [284, 535], [285, 552], [282, 570], [276, 588],
    [269, 605], [264, 622], [262, 640], [263, 656], [258, 666], [246, 672], [233, 671], [223, 664], [220, 647],
    [218, 629], [214, 611], [208, 593], [203, 575], [199, 557], [197, 540], [195, 525]
];
const HIND_LOWER = [
    [220, 644], [228, 638], [238, 636], [248, 638], [254, 644], [254, 670], [252, 700], [250, 740], [217, 740],
    [217, 700], [217, 670]
];
const HIND_KELP = [
    [215, 648], [222, 640], [232, 635], [244, 635], [254, 639], [260, 648], [263, 668], [265, 690], [267, 708],
    [268, 724], [206, 724], [207, 708], [208, 690], [210, 670], [212, 656]
];

// spots (trace units, [x, y, scale])
const FORE_SPOTS = [[403, 552, 1], [412, 548, 1.1], [421, 551, 1], [431, 549, 0.9], [399, 562, 0.9], [409, 560, 1.1],
    [419, 562, 1], [430, 560, 1], [440, 556, 0.8], [405, 571, 0.9], [416, 572, 1], [427, 569, 0.9], [437, 566, 0.8]];
const HIND_SPOTS = [[209, 544, 1], [219, 541, 1.1], [230, 543, 1], [241, 541, 0.9], [251, 545, 0.8], [206, 556, 0.9],
    [216, 553, 1.1], [227, 556, 1], [238, 553, 1], [248, 557, 0.8], [212, 566, 0.9], [223, 567, 1], [234, 565, 0.9]];

// ---------------------------------------------------------------------------
// Head, eyes, mouth
// ---------------------------------------------------------------------------
function drawHead() {
    const part = new Part('head', boxOf([HEAD], 3));
    const s = part.s;
    const m = part.mask(part.shape(HEAD));
    s.cutout(m);
    layer(part, C.coat, m, { pressure: 0.32, grain: 0.85 });
    // warm tan under the forelock (forehead) and a soft grey-brown cheek
    const fore = part.mask(part.shape([[468, 350], [500, 342], [530, 352], [546, 374], [532, 382], [506, 372], [480, 374]]), { feather: 6 });
    layer(part, C.tan, multiplyMasks(m, fore), { pressure: 0.75, angle: -0.3 });
    strokes(part, P.maneDark, multiplyMasks(m, fore), { pressure: 0.25, angle: -0.4 });
    const cheek = part.mask(part.shape([[470, 382], [492, 386], [511, 399], [518, 420], [505, 428], [484, 424], [472, 408]]), { feather: 7 });
    layer(part, C.shadeSoft, multiplyMasks(m, cheek), { pressure: 0.85, angle: 0.9 });
    layer(part, mix(C.shade, C.tan, 0.3), multiplyMasks(m, part.mask(part.shape([[486, 372], [520, 378], [540, 388], [520, 402], [496, 394]]), { feather: 7 })), { pressure: 0.35, angle: 0.4 });
    strokes(part, C.shade, multiplyMasks(m, cheek), { pressure: 0.35, angle: 0.9 });
    // the face: a faint warm blush toward the muzzle, shading along the jaw
    const face = part.mask(part.shape([[520, 380], [545, 386], [548, 398], [530, 405], [515, 396]]), { feather: 6 });
    layer(part, mix(P.coat, P.maneLight, 0.3), multiplyMasks(m, face), { pressure: 0.5, angle: 0.4 });
    const band = edgeBand(m, part.w, part.h, part.u(4));
    layer(part, C.shade, multiplyMasks(band, sideMap(part, bboxPx(m, part.w, part.h), 0.2, 1, 0, 1)), { pressure: 0.55, angle: 0.6, len: [8, 20] });
    // eye socket: faint shading around where the eye overlay sits
    const sock = part.mask(ellipse(...part.t(J.eye), part.u(5.5), part.u(3.8), 32, 0.2), { feather: 5 });
    layer(part, C.shade, sock, { pressure: 0.4, angle: 0.3, len: [6, 14] });
    drawMuzzle(part, false);
    // halter: cheek piece, throatlatch, noseband and the ring
    strap(part, CHEEK, 2.3);
    strap(part, THROATLATCH, 2.0);
    strap(part, NOSEBAND, 2.9);
    ring(part, [519, 410], 2.1);
    // the marks under the jaw, kept as drawn (a ring and two spots)
    ring(part, [496, 414], 1.9, P.spot);
    s.dots(P.spot, [part.t([489, 407]), part.t([504, 420])].map(([x, y]) => [x, y, 1, 0.4]), { rx: part.u(1.1), ry: part.u(0.8), alpha: 0.85 });
    // contour: the face and jaw, not the back edge (it runs into the neck)
    s.outline(C.line, part.line(HEAD.slice(1, 25)), { closed: false, width: 2.4, wobble: 0.9 });
    return part.finish(T(...J.head));
}

function drawMuzzle(part, open) {
    const s = part.s;
    const shape = open === 'talk' ? MUZZLE_TALK : open ? MUZZLE_OPEN : MUZZLE;
    const outline = part.shape(shape);
    const mz = part.mask(outline);
    paperOver(part, mz);
    const bb = bboxPx(mz, part.w, part.h);
    // warm reddish brown, lighter high on the nose, darkest at the front and the chin
    layer(part, mix(P.muzzle, P.tailDeep, 0.25), mz, { pressure: 0.75, angle: -0.4, grain: 0.4 });
    layer(part, P.muzzle, mz, { pressure: 0.75, angle: 0.5, grain: 0.4, pmap: sideMap(part, bb, 0.6, 1, 0.1, 1) });
    layer(part, P.muzzleDark, mz, { pressure: 0.7, angle: 0.6, grain: 0.4, pmap: sideMap(part, bb, 0.9, 0.8, -0.5, 1) });
    s.burnish(mz, 3, 0.75);
    strokes(part, P.muzzleDark, mz, { pressure: 0.18, angle: -1.1, gap: 4.5 });
    // nostril
    const nos = part.mask(ellipse(...part.t([557, 415]), part.u(2.3), part.u(1.6), 24, -0.5), { feather: 1 });
    s.fill(P.muzzleDark, nos, { pressure: 1.2, grain: 0.2 });
    s.fill(P.eye, nos, { pressure: 0.5, grain: 0.2 });
    if (open === 'talk') {
        const gap = part.mask(part.shape([[560, 427], [548, 431], [535, 431], [526, 429], [536, 433], [549, 434]]));
        s.fill(P.muzzleDark, gap, { pressure: 1.2, grain: 0.2 });
    } else if (open) {
        const gap = part.mask(part.shape([[561, 426], [549, 433], [534, 434], [523, 431], [533, 438], [549, 439]]));
        s.fill(P.muzzleDark, gap, { pressure: 1.3, grain: 0.15 });
        s.fill(P.eye, gap, { pressure: 0.8, grain: 0.15 });
    } else {
        s.outline(P.muzzleDark, part.line([[522, 427], [532, 429], [544, 430], [553, 429]]), { closed: false, width: 1.6, alpha: 0.7 });
    }
    s.outline(mix(P.muzzleDark, P.graphite, 0.4), outline, { width: 2.1, wobble: 0.7 });
}

function strap(part, pts, widthWu, color = C.strap) {
    const s = part.s;
    const line = part.line(pts, 6);
    s.outline(color, line, { closed: false, width: part.u(widthWu), wobble: 0.4, passes: 1, alpha: 1, grain: 0.5, overshoot: 0, pressure: 1.1 });
    s.outline(C.strapDark, line, { closed: false, width: part.u(widthWu) * 0.3, wobble: 0.6, passes: 1, alpha: 0.45 });
    const off = (sign) => offsetLine(line, part.u(widthWu) * 0.5 * sign);
    s.outline(C.strapDark, off(1), { closed: false, width: 1.6, wobble: 0.4, passes: 1, alpha: 0.85 });
    s.outline(C.strapDark, off(-1), { closed: false, width: 1.6, wobble: 0.4, passes: 1, alpha: 0.85 });
}

function ring(part, c, rWu, color = C.strapDark) {
    const [x, y] = part.t(c);
    part.s.outline(color, ellipse(x, y, part.u(rWu), part.u(rWu) * 0.9, 24), { width: part.u(0.8), wobble: 0.3, passes: 1 });
}

function drawMouthOverlay(name, open) {
    const part = new Part(name, boxOf([MUZZLE_OPEN, MUZZLE], 2.5));
    drawMuzzle(part, open);
    strap(part, NOSEBAND.slice(0, 4), 2.9);
    return part.finish(T(...J.mouth));
}

function drawEye(state) {
    const box = [...T(J.eye[0] - 13, J.eye[1] - 10), ...T(J.eye[0] + 13, J.eye[1] + 10)];
    const part = new Part(`eye-${state}`, box);
    const s = part.s;
    const [cx, cy] = part.t(J.eye);
    const rx = part.u(4.1), ry = part.u(2.5);
    const tilt = 0.18;
    const almond = [];
    for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const x = Math.cos(a) * rx;
        let y = Math.sin(a) * ry;
        if (y > 0) y *= 0.8; // flatter lower lid
        const k = 1 - 0.25 * Math.pow(Math.abs(Math.cos(a)), 6); // pointed corners
        almond.push([cx + x * Math.cos(tilt) - y * k * Math.sin(tilt), cy + x * Math.sin(tilt) + y * k * Math.cos(tilt)]);
    }
    if (state === 'closed') {
        const lid = [];
        for (let i = 0; i <= 12; i++) {
            const t = i / 12, x = (t - 0.5) * 2 * rx;
            lid.push([cx + x * Math.cos(tilt), cy + x * Math.sin(tilt) + Math.sin(t * Math.PI) * ry * 0.55]);
        }
        s.outline(P.eye, lid, { closed: false, width: part.u(0.95), wobble: 0.3, passes: 2, alpha: 1 });
        s.outline(P.eye, [[cx - rx * 0.1, cy + ry * 0.6], [cx - rx * 0.35, cy + ry * 1.25]], { closed: false, width: part.u(0.5), passes: 1 });
        s.outline(P.eye, [[cx + rx * 0.35, cy + ry * 0.55], [cx + rx * 0.2, cy + ry * 1.2]], { closed: false, width: part.u(0.5), passes: 1 });
        return part.finish(T(...J.eye));
    }
    const m = part.mask(almond);
    let open = m;
    if (state === 'half') {
        const cut = part.mask([[cx - rx * 2, cy - ry * 3], [cx + rx * 2, cy - ry * 3], [cx + rx * 2, cy + ry * 0.05], [cx - rx * 2, cy - ry * 0.25]]);
        open = subtractMask(m, cut);
    }
    s.cutout(open);
    // iris/pupil fills most of the almond; a paper highlight stays
    const iris = part.mask(ellipse(cx + rx * 0.05, cy + ry * 0.05, rx * 0.72, ry * 1.05, 32));
    const hl = part.mask(ellipse(cx + rx * 0.3, cy - ry * 0.35, part.u(0.9), part.u(0.8), 16));
    s.fill(mix(P.eye, P.muzzle, 0.3), subtractMask(multiplyMasks(open, iris), hl), { pressure: 1, grain: 0.35 });
    s.fill(P.eye, subtractMask(multiplyMasks(open, part.mask(ellipse(cx + rx * 0.08, cy + ry * 0.1, rx * 0.42, ry * 0.8, 24))), hl), { pressure: 1, grain: 0.2 });
    s.fill(C.shade, subtractMask(open, iris), { pressure: 0.35, grain: 0.8 });
    const upper = almond.filter((_, i) => i >= 20).concat([almond[0]]);
    if (state === 'half') {
        s.outline(P.eye, [[cx - rx * 1.05, cy - ry * 0.2], [cx, cy - ry * 0.05], [cx + rx * 1.05, cy + ry * 0.12]], { closed: false, width: part.u(1.0), passes: 2, wobble: 0.3 });
        s.outline(C.line, almond.slice(0, 21), { closed: false, width: part.u(0.45), alpha: 0.7, passes: 1 });
    } else {
        s.outline(P.eye, upper, { closed: false, width: part.u(0.95), passes: 2, wobble: 0.3 });
        s.outline(C.line, almond.slice(0, 21), { closed: false, width: part.u(0.45), alpha: 0.7, passes: 1 });
        const crease = upper.map(([x, y]) => [x + (x - cx) * 0.1, y - ry * 0.55]).slice(3, -3);
        s.outline(C.lineSoft, crease, { closed: false, width: part.u(0.4), alpha: 0.6, passes: 1 });
    }
    return part.finish(T(...J.eye));
}

// ---------------------------------------------------------------------------
// Neck, collar, torso, shell
// ---------------------------------------------------------------------------
function drawNeck() {
    const part = new Part('neck', boxOf([NECK, COLLAR], 3));
    const s = part.s;
    const m = part.mask(part.shape(NECK));
    coat(part, m, { shadeDir: [1, 0.3], shadeHi: 0.75, edge: 6 });
    // shadow under the jaw, and the soft groove along the neck
    const throat = part.mask(part.shape([[470, 395], [486, 405], [489, 470], [480, 480], [468, 440], [466, 420]]), { feather: 8 });
    layer(part, mix(C.shade, C.tan, 0.35), multiplyMasks(m, throat), { pressure: 0.6, angle: 1.0 });
    s.outline(C.lineSoft, part.line([[462, 402], [466, 425], [470, 450], [474, 466]]), { closed: false, width: 1.6, alpha: 0.3, passes: 1, opaque: false });
    // mane roots along the crest: dense orange hair
    const crestIn = CREST.map(([x, y], i) => [x + 10 - i * 0.3, y + 14]);
    const root = part.mask(part.shape(CREST.concat(crestIn.slice().reverse())), { feather: 3 });
    const rootM = multiplyMasks(root, m);
    layer(part, P.maneLight, rootM, { pressure: 0.7, angle: -1.2 });
    const spines = [];
    for (let i = 0; i < CREST.length - 1; i++) {
        for (let k = 0; k < 3; k++) {
            const t = k / 3;
            const x = CREST[i][0] + (CREST[i + 1][0] - CREST[i][0]) * t + 7, y = CREST[i][1] + (CREST[i + 1][1] - CREST[i][1]) * t + 13;
            spines.push(part.line([[x, y], [x - 5, y - 8], [x - 12, y - 15]], 4));
        }
    }
    s.flow(P.mane, spines, { count: 4, spread: part.u(2), width: 2.6, clip: rootM, pressure: 0.95, grain: 0.6 });
    s.flow(P.maneDark, spines, { count: 1, spread: part.u(2), width: 1.6, clip: rootM, pressure: 0.6 });
    // contours: throat line down to the chest, and the soft mane boundary
    s.outline(C.line, part.line(NECK.slice(14, 25).reverse()), { closed: false, width: 2.4, wobble: 0.8 });
    s.outline(P.maneDark, part.line(crestIn.slice().reverse()), { closed: false, width: 1.8, alpha: 0.45, passes: 1 });
    collar(part);
    return part.finish(T(...J.neck));
}

function collar(part) {
    const s = part.s;
    const cm = part.mask(part.shape(COLLAR, 4));
    paperOver(part, cm);
    const bb = bboxPx(cm, part.w, part.h);
    layer(part, C.strap, cm, { pressure: 1, angle: 0.55, grain: 0.45 });
    layer(part, C.strapDark, cm, { pressure: 0.8, angle: 0.6, grain: 0.5, pmap: sideMap(part, bb, -0.4, 1, 0, 1) });
    strokes(part, C.strapDark, cm, { pressure: 0.4, angle: 0.62, gap: 3.4, len: [16, 40] });
    s.outline(C.strapDark, part.shape(COLLAR, 4), { width: 2.2, wobble: 0.6 });
    const mid = COLLAR.slice(0, 7).map(([x, y]) => [x - 2, y + 7.5]);
    s.outline(C.strapDark, part.line(mid), { closed: false, width: 1.4, alpha: 0.4, passes: 1 });
    const [bx, by] = part.t([486, 491]);
    s.outline(C.strapDark, ellipse(bx, by, part.u(2.2), part.u(3.4), 20, 0.5), { width: part.u(0.7), passes: 1 });
}

function drawTorso() {
    const part = new Part('torso', boxOf([TORSO], 3));
    const s = part.s;
    const m = part.mask(part.shape(TORSO));
    coat(part, m, { shadeDir: [0, 1], shadeHi: 0.8, edge: 8, edgeP: 0.55 });
    // shadow under the shell rim
    const rimShadow = part.mask(part.shape([[190, 520], [210, 534], [245, 545], [290, 540], [345, 527], [400, 505], [420, 505], [400, 520], [345, 540], [290, 552], [240, 556], [205, 545], [188, 530]]), { feather: 7 });
    layer(part, C.shade, multiplyMasks(m, rimShadow), { pressure: 0.65, angle: 0.2 });
    // the chest front turning away, and the shoulder
    const chest = part.mask(part.shape([[470, 490], [492, 500], [491, 530], [480, 548], [468, 540], [472, 515]]), { feather: 7 });
    layer(part, C.shade, multiplyMasks(m, chest), { pressure: 0.5, angle: 1.2 });
    s.outline(C.lineSoft, part.line([[400, 506], [420, 516], [442, 522], [466, 523]]), { closed: false, width: 1.8, alpha: 0.45, passes: 1, opaque: false });
    const shoulder = part.mask(part.shape([[400, 508], [440, 524], [468, 526], [455, 536], [420, 532], [398, 520]]), { feather: 6 });
    layer(part, C.shadeSoft, multiplyMasks(m, shoulder), { pressure: 0.6, angle: 0.3 });
    // chest and belly bands, drawn as she did (never explained)
    const thin = (pts, w = 1.25) => bandLine(part, pts, w, m);
    thin([[452, 497], [454, 520], [455, 555]]);
    thin([[468, 487], [469, 515], [470, 548]]);
    thin([[436, 518], [462, 519], [490, 520]]);
    thin([[440, 540], [462, 541], [486, 540]]);
    thin([[282, 553], [320, 553], [372, 551]]);
    thin([[350, 536], [365, 535], [381, 533]]);
    thin([[358, 513], [360, 545], [361, 576]]);
    thin([[366, 512], [367, 545], [368, 577]]);
    thin([[287, 538], [290, 552], [293, 566]]);
    // the wide band behind the foreleg
    const wideShape = part.shape([[317, 523], [341, 521], [344, 548], [347, 575], [315, 573], [316, 548]], 3);
    const wide = multiplyMasks(part.mask(wideShape), m);
    paperOver(part, wide);
    layer(part, C.band, wide, { pressure: 1, angle: 1.45, grain: 0.45 });
    strokes(part, C.strapDark, wide, { pressure: 0.5, angle: 1.5, gap: 3, len: [20, 50] });
    s.outline(C.strapDark, wideShape, { width: 1.8, clip: m, passes: 1 });
    // contour: belly and chest (the top and rear are covered by the shell, thigh and tail)
    s.outline(C.line, part.line(TORSO.slice(14, 31)), { closed: false, width: 2.5, wobble: 0.9 });
    s.outline(C.line, part.line(TORSO.slice(9, 16)), { closed: false, width: 2.2, wobble: 0.9, alpha: 0.8 });
    return part.finish(T(...J.body));
}

function bandLine(part, pts, widthWu, clip) {
    const line = part.line(pts, 5);
    part.s.outline(C.strap, line, { closed: false, width: part.u(widthWu), wobble: 0.6, passes: 1, alpha: 0.95, clip, overshoot: 0.5, grain: 0.6 });
    part.s.outline(C.strapDark, line, { closed: false, width: part.u(widthWu) * 0.45, wobble: 0.6, passes: 1, alpha: 0.6, clip });
}

function drawShell() {
    const part = new Part('shell', boxOf([SHELL], 3));
    const s = part.s;
    const outline = part.shape(SHELL, 6);
    const m = part.mask(outline);
    s.cutout(m);
    // the rim band and the dome
    const rimTop = part.line(RIM_TOP, 6);
    const lower = part.line(SHELL.slice(19).concat([SHELL[0]]), 6);
    const rimM = multiplyMasks(part.mask(rimTop.concat(lower.slice().reverse())), m);
    const dome = subtractMask(m, rimM);
    // seams: reserved paper
    const seamCov = s.coverage((c) => {
        for (const seam of SEAMS) {
            const pts = part.line(seam, 4);
            c.lineWidth = part.u(1.6);
            c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
            for (const q of pts) c.lineTo(q[0], q[1]);
            c.stroke();
        }
    }, { additive: false });
    const plates = subtractMask(dome, seamCov);
    // proximity to seams: plates are darker at their edges and lighter in the middle
    const near = boxBlur(seamCov, part.w, part.h, Math.round(part.u(3.4)));
    const nearP = (x, y) => Math.min(1, near[y * part.w + x] * 2.6);
    const bb = bboxPx(m, part.w, part.h);
    const down = sideMap(part, bb, 0.2, 1, 0, 1);
    const dn = (x, y) => down[y * part.w + x];
    // slow mottle so each plate varies
    const mot = rng(hashSeed('hero/shell/mottle'));
    const blobs = [];
    for (let i = 0; i < 46; i++) blobs.push([bb[0] + mot() * (bb[2] - bb[0]), bb[1] + mot() * (bb[3] - bb[1]), part.u(4 + mot() * 5)]);
    const mottle = pressureMap(part.w, part.h, (x, y) => {
        let v = 0;
        for (const [bx, by, r] of blobs) { const d = Math.hypot(x - bx, y - by) / r; if (d < 1) v += (1 - d * d) * 0.6; }
        return Math.min(1, v);
    });
    layer(part, C.shellYellow, plates, { pressure: 0.95, angle: -0.8, grain: 0.45 });
    layer(part, C.shellOlive, plates, { pressure: 0.85, angle: -0.95, grain: 0.5, pmap: pressureMap(part.w, part.h, (x, y) => 0.55 + 0.45 * (1 - mottle[y * part.w + x])) });
    layer(part, P.shellGreen, plates, { pressure: 0.9, angle: -0.7, grain: 0.5, pmap: pressureMap(part.w, part.h, (x, y) => Math.min(1.1, 0.12 + 0.7 * dn(x, y) + 0.35 * nearP(x, y) + 0.2 * (1 - mottle[y * part.w + x]))) });
    layer(part, C.shellDeep, plates, { pressure: 0.9, angle: 0.8, grain: 0.55, pmap: pressureMap(part.w, part.h, (x, y) => Math.min(1, -0.15 + nearP(x, y) * 0.65 + dn(x, y) * 0.75)) });
    strokes(part, P.shellDark, plates, { pressure: 0.5, angle: -0.75, gap: 3.4, len: [8, 22], pmap: pressureMap(part.w, part.h, (x, y) => 0.3 + 0.7 * dn(x, y)) });
    strokes(part, P.shellLight, plates, { pressure: 0.35, angle: 0.4, gap: 4, len: [6, 16], pmap: mottle });
    layer(part, P.shellDark, multiplyMasks(plates, edgeBand(m, part.w, part.h, part.u(4))), { pressure: 0.6, angle: 0.3, len: [8, 20] });
    // seams: pale cream with a soft line either side
    s.fill(P.seam, multiplyMasks(seamCov, dome), { pressure: 0.6, grain: 0.7 });
    for (const seam of SEAMS) {
        const pts = part.line(seam, 4);
        s.outline(C.seamLine, offsetLine(pts, part.u(1.0)), { closed: false, width: 1.3, alpha: 0.5, passes: 1, clip: dome, opaque: false });
        s.outline(C.seamLine, offsetLine(pts, -part.u(1.0)), { closed: false, width: 1.3, alpha: 0.5, passes: 1, clip: dome, opaque: false });
    }
    // segmented yellow-ochre rim
    layer(part, C.rim, rimM, { pressure: 0.9, angle: 0.1, grain: 0.5 });
    strokes(part, P.shellRim, rimM, { pressure: 0.6, angle: 1.2, gap: 3, len: [6, 14], pmap: sideMap(part, bb, 0, 1, 0.2, 1) });
    s.outline(C.seamLine, rimTop, { closed: false, width: 2, alpha: 0.8, passes: 1 });
    const rimSegs = [[396, 491, 400, 499], [372, 500, 375, 510], [346, 508, 348, 518], [319, 515, 321, 525], [293, 521, 294, 531], [268, 525, 268, 536], [246, 527, 245, 538], [224, 525, 222, 536], [206, 518, 203, 528]];
    for (const [a, b, c2, d] of rimSegs) {
        s.outline(mix(P.sandShadow, P.graphite, 0.4), [part.t([a, b]), part.t([c2, d])], { closed: false, width: 1.8, alpha: 0.75, passes: 1 });
    }
    s.outline(C.line, outline, { width: 2.6, wobble: 0.8 });
    return part.finish(T(...J.body));
}

// ---------------------------------------------------------------------------
// Legs
// ---------------------------------------------------------------------------
function drawForeUpper(far) {
    const part = new Part(far ? 'fore-upper-far' : 'fore-upper', boxOf([FORE_UPPER], 3));
    const s = part.s;
    const m = part.mask(part.shape(FORE_UPPER));
    coat(part, m, { shadeDir: [-1, 0.2], shadeHi: 0.75, edge: 5 });
    s.dots(P.spot, FORE_SPOTS.map(([x, y, k]) => [...part.t([x, y]), k, 1.45]), { rx: part.u(1.15), ry: part.u(2), clip: m, alpha: 0.95, grain: 0.6 });
    // the curved band over the forearm
    const bandShape = part.shape(FORE_BAND_OUT.concat(FORE_BAND_IN), 4);
    const bm = multiplyMasks(part.mask(bandShape), m);
    paperOver(part, bm);
    layer(part, C.strap, bm, { pressure: 1, angle: 0.2, grain: 0.45 });
    strokes(part, C.strapDark, bm, { pressure: 0.55, angle: -0.4, gap: 3 });
    s.outline(C.strapDark, bandShape, { width: 2, clip: m, passes: 1 });
    s.outline(C.line, part.line(FORE_UPPER.slice(8, 20)), { closed: false, width: 2.4 });
    s.outline(C.line, part.line(FORE_UPPER.slice(18, 25)), { closed: false, width: 2.4 });
    if (far) darken(part, 0.5, m);
    return part.finish(T(...J.elbow));
}

function drawHindUpper(far) {
    const part = new Part(far ? 'hind-upper-far' : 'hind-upper', boxOf([HIND_UPPER], 3));
    const s = part.s;
    const m = part.mask(part.shape(HIND_UPPER));
    coat(part, m, { shadeDir: [0.6, 0.4], shadeHi: 0.7, edge: 5 });
    const top = part.mask(part.shape([[196, 513], [240, 504], [280, 519], [282, 532], [240, 530], [200, 530]]), { feather: 6 });
    layer(part, C.shade, multiplyMasks(m, top), { pressure: 0.6, angle: 0.1 });
    s.outline(C.lineSoft, part.line([[272, 560], [262, 580], [255, 600], [252, 620]]), { closed: false, width: 1.6, alpha: 0.4, passes: 1, opaque: false });
    s.dots(P.spot, HIND_SPOTS.map(([x, y, k]) => [...part.t([x, y]), k, 1.5]), { rx: part.u(1.15), ry: part.u(2), clip: m, alpha: 0.95, grain: 0.6 });
    s.outline(C.line, part.line(HIND_UPPER.slice(4, 25)), { closed: false, width: 2.4 });
    if (far) darken(part, 0.5, m);
    return part.finish(T(...J.hip));
}

/** Lower leg: cannon under a kelp sleeve (the fringe strip hangs from it over the hoof). */
function drawLower(name, cannon, kelp, pivot, far) {
    const part = new Part(name, boxOf([cannon, kelp], 3));
    const cm = part.mask(part.shape(cannon));
    coat(part, cm, { shadeDir: [-1, 0], edge: 4, far });
    // a leafy, scalloped top edge
    const kp = part.shape(kelp, 5);
    const top = kp.map(([x, y], i) => {
        const k = kp[0][1] + part.u(9);
        return y < k ? [x, y - Math.abs(Math.sin(i * 1.7)) * part.u(1.6)] : [x, y];
    });
    const km = part.mask(top);
    kelpMass(part, km, far, { top: true });
    return part.finish(T(...pivot));
}

/** Kelp: olive-green leaves pointing down in overlapping rows, darker between them. */
function kelpMass(part, km, far, { top = false, fadeTop = 0 } = {}) {
    const s = part.s;
    paperOver(part, km);
    const bb = bboxPx(km, part.w, part.h);
    const rr = rng(hashSeed(`hero/${part.name}/leaves`));
    // leaf layout
    const leaves = [];
    const stepY = part.u(2.6), stepX = part.u(2.9);
    for (let y = bb[1] - stepY; y < bb[3] + stepY; y += stepY) {
        const row = Math.round((y - bb[1]) / stepY);
        const shift = (row % 2) * stepX * 0.5;
        for (let x = bb[0] - stepX + shift; x < bb[2] + stepX; x += stepX) {
            const jx = x + (rr() - 0.5) * stepX * 0.5, jy = y + (rr() - 0.5) * stepY * 0.4;
            const lean = ((jx - (bb[0] + bb[2]) / 2) / Math.max(1, bb[2] - bb[0])) * 0.6;
            leaves.push([jx, jy, 0.85 + rr() * 0.35, Math.PI / 2 + lean + (rr() - 0.5) * 0.35]);
        }
    }
    const leafCov = s.coverage((c) => {
        for (const [x, y, k, a] of leaves) {
            c.save(); c.translate(x, y); c.rotate(a);
            c.beginPath();
            const L = part.u(2.3) * k, W = part.u(1.05) * k;
            // a pointed leaf: tip toward +x (down the leg)
            c.moveTo(-L, 0);
            c.quadraticCurveTo(-L * 0.2, -W * 1.2, L, 0);
            c.quadraticCurveTo(-L * 0.2, W * 1.2, -L, 0);
            c.fill();
            c.restore();
        }
    }, { additive: false });
    const leavesM = multiplyMasks(leafCov, km);
    const gaps = subtractMask(km, leafCov);
    const deep = far ? mix(P.kelpDark, P.graphite, 0.2) : C.kelpDeep;
    s.cutout(km);
    layer(part, far ? P.kelpDark : C.kelpBase, km, { pressure: 0.75, angle: 1.5, grain: 0.5 });
    layer(part, deep, gaps, { pressure: 0.9, angle: 1.45, grain: 0.5 });
    layer(part, far ? P.kelp : C.kelpLeaf, leavesM, { pressure: 0.55, angle: 1.3, grain: 0.7 });
    // each leaf a darker lower edge, a lighter rib
    strokes(part, deep, leavesM, { pressure: 0.45, angle: 1.55, gap: 3.4, len: [6, 14] });
    // shade: darker toward the back and the bottom
    layer(part, P.kelpDark, km, { pressure: 0.55, angle: 1.4, grain: 0.6, pmap: sideMap(part, bb, -0.7, 0.6, -0.2, 1) });
    if (far) darken(part, 0.35, km);
    if (top) {
        // a slightly darker scalloped top where it meets the leg above
        const band = edgeBand(km, part.w, part.h, part.u(3));
        layer(part, deep, multiplyMasks(band, sideMap(part, bb, 0, -1, -0.8, 1)), { pressure: 0.6, angle: 0.3 });
    }
}

function drawHoof(far) {
    // strip-local: pivot (coronet) at (0,0), sole at y = HOOF_H; drawn upright
    const H = HOOF_H, wt = 12, wb = 15;
    const part = new Part(far ? 'hoof-far' : 'hoof', [-wb - 2, -7, wb + 2, H + 1.5]);
    const s = part.s;
    const shape = [[-wt, -6], [wt * 0.95, -6], [wb * 0.98, H - 3.2], [wb * 0.9, H - 0.6], [wb * 0.4, H + 0.3], [-wb * 0.5, H + 0.2], [-wb * 0.95, H - 0.8], [-wb, H - 3.2]];
    const pts = smooth(part.pts(shape), { closed: true, steps: 5 });
    const m = part.mask(pts);
    s.cutout(m);
    layer(part, C.hoofBrown, m, { pressure: 0.95, angle: 1.52, grain: 0.45 });
    // vertical pencil strokes, darker toward the ground
    s.hatch(P.hoof, { angle: 1.55, gap: part.u(2.3), len: [part.u(6), part.u(16)], width: part.u(0.9), clip: m, pressure: far ? 1.1 : 0.95, jitter: 2, bow: 1, grain: 0.5 });
    s.hatch(P.muzzleDark, { angle: 1.57, gap: part.u(3.6), len: [part.u(8), part.u(18)], width: part.u(0.55), clip: m, pressure: 0.8, grain: 0.5 });
    layer(part, P.hoof, m, { pressure: 0.6, angle: 0, pmap: gradientMap(part.w, part.h, 0, part.p([0, 0])[1], 0, part.p([0, H])[1], 0, 1) });
    // a faint light on the front of the wall
    if (far) darken(part, 0.5, m);
    s.outline(C.line, pts, { width: 2.4 });
    return part.finish([0, 0]);
}

// ---------------------------------------------------------------------------
// Strip textures (strip space: u across, v along; root at the top, tip at the bottom)
// ---------------------------------------------------------------------------
/** The very long tail: widens a little, then ends in a tapered point. */
const TAIL_W = 60, TAIL_L = 147;
const TAIL_PROFILE = [[0, 0.22], [0.08, 0.28], [0.2, 0.46], [0.35, 0.68], [0.5, 0.86], [0.62, 0.96], [0.72, 1], [0.8, 0.9], [0.88, 0.64], [0.94, 0.36], [0.985, 0.1], [1, 0.02]];
function profileAt(prof, t) {
    for (let i = 1; i < prof.length; i++) {
        if (t <= prof[i][0]) {
            const [t0, w0] = prof[i - 1], [t1, w1] = prof[i];
            const k = (t - t0) / (t1 - t0);
            return w0 + (w1 - w0) * (k * k * (3 - 2 * k));
        }
    }
    return prof[prof.length - 1][1];
}

function drawTail() {
    const W = TAIL_W, L = TAIL_L;
    const part = new Part('tail', [-W / 2, 0, W / 2, L], { pad: 2 });
    const s = part.s;
    // Wavy locks, back to front: [x at its widest (wu), tip length (0..1), width (wu), wave, phase, group]
    // group 0: outer peach locks, 1: orange middle, 2: inner deep orange-red
    const LOCKS = [
        [-21, 0.7, 18, 3, 4.0, 0], [-16, 0.84, 20, 3.4, 0.3, 0], [-9, 0.93, 22, 3.6, 2.1, 0],
        [-12, 0.78, 18, 3, 5.4, 1], [-2, 1.0, 24, 3.4, 1.2, 1], [5, 0.9, 22, 3, 3.3, 1],
        [14, 0.76, 17, 2.4, 2.6, 2], [10, 0.86, 19, 2.6, 0.7, 2], [3, 0.97, 18, 2.8, 5.1, 2], [-6, 0.88, 16, 3.2, 3.9, 1]
    ];
    const n = 40;
    const hwOf = (wd, t) => (wd / 2) * Math.min(1, 0.45 + t * 2.4) * Math.pow(1 - t, 0.62);
    for (const [xw, len, wd, wave, phase, grp] of LOCKS) {
        const spine = [];
        for (let i = 0; i <= n; i++) {
            const T = (i / n) * len;
            const spread = Math.sin(Math.min(1, T / 0.6) * Math.PI / 2);
            const x = xw * spread * (1 - 0.3 * Math.max(0, (T - 0.7) / 0.3)) + Math.sin(T * 7.5 + phase) * wave * Math.min(1, T * 3);
            spine.push([x, T * L]);
        }
        const lp = [], rp = [];
        for (let i = 0; i <= n; i++) {
            const hw = hwOf(wd, i / n);
            const a2 = spine[Math.max(0, i - 1)], b2 = spine[Math.min(n, i + 1)];
            let tx = b2[0] - a2[0], ty = b2[1] - a2[1];
            const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
            lp.push([spine[i][0] - ty * hw, spine[i][1] + tx * hw]);
            rp.push([spine[i][0] + ty * hw, spine[i][1] - tx * hw]);
        }
        const poly = part.pts(lp.concat(rp.slice().reverse()));
        const m = part.mask(poly);
        paperOver(part, m);
        const sp = part.pts(spine);
        const side = (q) => part.pts(spine.map((pt, i) => [pt[0] + q * hwOf(wd, i / n), pt[1]]));
        const base = grp === 0 ? P.tailPeach : grp === 1 ? mix(P.mane, P.tail, 0.4) : P.tail;
        const mid = grp === 0 ? mix(P.tailPeach, P.tail, 0.3) : grp === 1 ? P.mane : mix(P.tail, P.tailDeep, 0.3);
        const dark = grp === 0 ? mix(P.tailPeach, P.tailDeep, 0.45) : P.tailDeep;
        layer(part, base, m, { pressure: 0.95, angle: 1.5, grain: 0.4, len: [20, 60] });
        s.flow(mid, [sp, side(-0.5), side(0.5)], { count: 3, spread: part.u(wd * 0.1), width: 2.4, clip: m, pressure: 0.8, grain: 0.55 });
        s.flow(grp === 0 ? mix(P.tailPeach, P.coat, 0.25) : P.maneLight, [side(-0.35)], { count: 1, spread: part.u(0.6), width: 1.8, clip: m, pressure: 0.4, lengthFrac: [0.3, 0.6] });
        s.flow(dark, [side(0.4), side(0.75)], { count: 2, spread: part.u(0.7), width: 1.8, clip: m, pressure: grp === 0 ? 0.6 : 0.85, lengthFrac: [0.5, 0.95], startJitter: 0.2 });
        const open = part.pts(lp.slice(Math.floor(n * 0.15)).concat(rp.slice(Math.floor(n * 0.15)).reverse()));
        s.outline(C.tailLine, open, { closed: false, width: 1.5, wobble: 0.7, alpha: grp === 0 ? 0.55 : 0.75, passes: 1 });
    }
    // the upper part is orange where it leaves the shell
    const top = part.mask(part.pts([[-9, 0], [9, 0], [15, L * 0.3], [-15, L * 0.3]]), { feather: part.u(4) });
    layer(part, P.mane, multiplyMasks(top, gradientMap(part.w, part.h, 0, 0, 0, part.p([0, L * 0.25])[1], 0.7, 0)), { pressure: 0.6, angle: 1.5 });
    return part.finish([0, 0], [-W / 2, 0, W / 2, L]);
}

/**
 * A flame-like mane tuft: several S-curved licks joined at the root, each drawn
 * over the ones behind it on fresh paper, with lighter middles and darker tips.
 * licks: [x0 (wu across), len (0..1 of L), wRoot (wu), bend (wu), phase, lean (per L)]
 */
function drawTuft(name, W, L, licks) {
    const part = new Part(name, [-W / 2, 0, W / 2, L], { pad: 2 });
    const s = part.s;
    for (const lk of licks) {
        const [x0, len, wRoot, bend, phase, lean] = lk;
        const n = 28;
        const spine = [];
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const x = x0 + lean * t * L * 0.5 + Math.sin(t * Math.PI * 1.6 + phase) * bend * Math.min(1, 0.3 + t * 1.2);
            spine.push([x, t * len * L]);
        }
        const lp = [], rp = [];
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            // a flame: full at the root, a belly in the middle, a thin curling tip
            const hw = (wRoot / 2) * Math.pow(1 - t, 0.9) * (1 + 0.45 * Math.sin(Math.min(1, t * 1.4) * Math.PI));
            const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n, i + 1)];
            let tx = b[0] - a[0], ty = b[1] - a[1];
            const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
            lp.push([spine[i][0] - ty * hw, spine[i][1] + tx * hw]);
            rp.push([spine[i][0] + ty * hw, spine[i][1] - tx * hw]);
        }
        const poly = part.pts(lp.concat(rp.slice().reverse()));
        const m = part.mask(poly);
        paperOver(part, m);
        const sp = part.pts(spine);
        const side = (k) => part.pts(spine.map((q, i) => {
            const t = i / n, hw = (wRoot / 2) * Math.pow(1 - t, 0.9);
            return [q[0] + k * hw, q[1]];
        }));
        layer(part, P.maneLight, m, { pressure: 1, angle: 1.45, grain: 0.4, len: [14, 36] });
        s.flow(P.mane, [sp, side(0.25), side(0.55), side(-0.2)], { count: 4, spread: part.u(wRoot * 0.14), width: 2.8, clip: m, pressure: 1, grain: 0.5 });
        layer(part, P.mane, multiplyMasks(m, gradientMap(part.w, part.h, 0, sp[0][1], 0, sp[n][1], 0.75, 0.35)), { pressure: 0.7, angle: 1.5, grain: 0.45 });
        // a light streak on one side, a darker brown edge on the other
        s.flow(P.maneDark, [side(0.75)], { count: 2, spread: part.u(0.6), width: 2, clip: m, pressure: 0.8, lengthFrac: [0.6, 1] });
        s.flow(mix(P.maneDark, P.mane, 0.5), [side(0.45)], { count: 1, spread: part.u(0.6), width: 1.6, clip: m, pressure: 0.6, lengthFrac: [0.4, 0.8], startJitter: 0.3 });
        // darker tips
        const tipFrom = sp[Math.floor(n * 0.62)][1], tipTo = sp[n][1];
        const tip = multiplyMasks(m, gradientMap(part.w, part.h, 0, tipFrom, 0, tipTo, 0, 1.1));
        layer(part, C.maneTip, tip, { pressure: 0.95, angle: 1.5, grain: 0.5, len: [8, 20] });
        // outline all round but the root
        const open = part.pts(lp.slice(2).concat(rp.slice(2).reverse()));
        s.outline(C.maneLine, open, { closed: false, width: 1.7, wobble: 0.6, alpha: 0.85, passes: 1 });
    }
    return part.finish([0, 0], [-W / 2, 0, W / 2, L]);
}

/** Kelp fringe: the loose leafy bottom of the kelp boot, hanging over the hoof top. */
const FRINGE_W = 36, FRINGE_L = 30;
function drawFringe(far) {
    const W = FRINGE_W, L = FRINGE_L;
    const part = new Part(far ? 'fringe-far' : 'fringe', [-W / 2, 0, W / 2, L], { pad: 2 });
    const s = part.s;
    const rr = part.rand;
    // outline: the width of the sleeve at the top, flaring, with pointed leaf tips at the bottom
    const pts = [[-W * 0.31, 0], [W * 0.31, 0], [W * 0.38, L * 0.4], [W * 0.46, L * 0.72]];
    const tips = 9;
    for (let i = 0; i <= tips; i++) {
        const x = W * 0.47 - (i / tips) * W * 0.94;
        pts.push([x, L * (i % 2 ? 0.82 : 0.99) + (rr() - 0.5) * 1.5]);
    }
    pts.push([-W * 0.44, L * 0.68], [-W * 0.37, L * 0.38]);
    const m = part.mask(part.pts(pts));
    kelpMass(part, m, far);
    // a few long leaves hanging over the edge
    const spines = [];
    for (let i = 0; i < 6; i++) {
        const x = -W * 0.38 + (i / 5) * W * 0.76;
        spines.push(part.pts([[x * 0.85, L * 0.2], [x * 0.95, L * 0.6], [x, L * 0.96]]));
    }
    s.flow(far ? P.kelpDark : C.kelpDeep, spines, { count: 2, spread: part.u(1.1), width: 1.8, clip: m, pressure: 0.7 });
    s.outline(mix(P.kelpDark, P.graphite, 0.4), part.pts(pts.slice(2)), { closed: false, width: 1.8, alpha: 0.75, passes: 1 });
    // soften the top edge so it melts into the sleeve above
    for (let y = 0; y < part.h; y++) {
        const wy = (y / SS + part.oy) / S; // strip v in wu
        const k = Math.min(1, Math.max(0, wy / (L * 0.28)));
        const f = k * k * (3 - 2 * k);
        if (f >= 1) continue;
        for (let x = 0; x < part.w; x++) s.a[y * part.w + x] *= f;
    }
    return part.finish([0, 0], [-W / 2, 0, W / 2, L]);
}

function drawShadow() {
    const W = 170, H = 26;
    const part = new Part('shadow', [-W / 2, -H / 2, W / 2, H / 2], { pad: 2 });
    const s = part.s;
    const m = part.mask(ellipse(...part.p([0, 0]), part.u(W / 2 - 3), part.u(H / 2 - 2), 64), { feather: part.u(4) });
    // loosely hatched brown: the paper shows through
    s.hatch(C.shadow, { angle: -0.35, gap: 3, len: [16, 44], width: 2.6, clip: m, opaque: true, pressure: 0.95, grain: 0.7 });
    s.hatch(C.shadow, { angle: 0.45, gap: 4, len: [12, 30], width: 2.2, clip: m, opaque: true, pressure: 0.6, grain: 0.8 });
    return part.finish([0, 0]);
}

function drawHoofShadow() {
    const W = 46, H = 12;
    const part = new Part('shadow-hoof', [-W / 2, -H / 2, W / 2, H / 2], { pad: 2 });
    const s = part.s;
    const m = part.mask(ellipse(...part.p([0, 0]), part.u(W / 2 - 2), part.u(H / 2 - 1.5), 40), { feather: part.u(2.5) });
    s.hatch(C.shadow, { angle: -0.35, gap: 2.2, len: [10, 24], width: 2.4, clip: m, opaque: true, pressure: 1, layers: 2, crossAngle: 0.8, grain: 0.6 });
    return part.finish([0, 0]);
}

// ---------------------------------------------------------------------------
// Mane layout (trace units): each tuft is a strip rooted on the crest (or the
// poll) with its rest shape; the texture is drawn to the spine's length.
// ---------------------------------------------------------------------------
const MANE = [
    { name: 'mane-1', parent: 'neck', w: 36, n: 5, lean: -0.16, spine: [[407, 422], [391, 410], [374, 399], [357, 388], [343, 374]] },
    { name: 'mane-2', parent: 'neck', w: 40, n: 5, lean: -0.1, spine: [[418, 407], [403, 391], [389, 372], [377, 350], [367, 325]] },
    { name: 'mane-3', parent: 'neck', w: 42, n: 5, lean: 0.06, spine: [[430, 394], [420, 371], [408, 345], [396, 312], [389, 266]] },
    { name: 'mane-4', parent: 'neck', w: 40, n: 5, lean: 0.14, spine: [[442, 382], [437, 357], [432, 329], [431, 297], [437, 263]] },
    { name: 'mane-5', parent: 'neck', w: 36, n: 5, lean: 0.16, spine: [[454, 371], [455, 346], [458, 319], [462, 290], [466, 257]] },
    { name: 'mane-6', parent: 'neck', w: 32, n: 4, lean: 0.12, spine: [[465, 361], [470, 339], [476, 318], [484, 299], [492, 283]] }
];
const FORELOCK = [
    { name: 'mane-7', parent: 'head', w: 28, n: 4, lean: 0.02, spine: [[479, 354], [489, 337], [501, 321], [515, 304]] },
    { name: 'forelock', parent: 'head', w: 30, n: 4, lean: -0.2, spine: [[483, 352], [499, 342], [517, 338], [534, 344], [547, 356], [553, 369]] }
];
const TAIL_SPINE = [[199, 494], [184, 524], [168, 560], [158, 600], [152, 640], [147, 680], [143, 718], [137, 744], [126, 760]];

const spineWu = (spine) => spine.map((q) => T(q[0], q[1]));
function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
/** Resample a polyline (wu) to n points spaced evenly over length L (extending the last segment if short). */
function fitSpine(pts, L, n) {
    const out = [];
    const total = polyLen(pts);
    for (let k = 0; k < n; k++) {
        let d = (k / (n - 1)) * L;
        if (d >= total) {
            const a = pts[pts.length - 2], b = pts[pts.length - 1];
            const seg = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            const e = d - total;
            out.push([r1(b[0] + (b[0] - a[0]) / seg * e), r1(b[1] + (b[1] - a[1]) / seg * e)]);
            continue;
        }
        for (let i = 1; i < pts.length; i++) {
            const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
            if (d <= seg || i === pts.length - 1) {
                const t = seg ? Math.min(1, d / seg) : 0;
                out.push([r1(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t), r1(pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t)]);
                break;
            }
            d -= seg;
        }
    }
    return out;
}

/** Lick layout for a tuft: [x0 (wu), len (0..1), wRoot, bend, phase, lean]; back licks first. */
function licksFor(m) {
    const rr = rng(hashSeed(`hero/${m.name}/licks`));
    const W = m.w, n = m.n;
    const out = [];
    for (let i = 0; i < n; i++) {
        const f = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
        const main = i === Math.floor(n / 2);
        out.push([
            f * W * 0.22 + (rr() - 0.5) * 2,
            main ? 1 : 0.55 + rr() * 0.35,
            W * (main ? 0.56 : 0.44 + rr() * 0.08),
            4.5 + rr() * 4,
            rr() * 6,
            (m.lean ?? 0.14) + (rr() - 0.5) * 0.12
        ]);
    }
    // the short side licks first, the long middle one last (in front)
    out.sort((a, b) => a[1] - b[1]);
    return out;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
export async function build(api) {
    api.atlas('hero', { scale: S, bundle: 'boot', quality: 88 });
    const uvs = {};
    const add = (name, res) => {
        api.frame('hero', `hero-${name}`, res.canvas, res.anchor);
        if (res.uv) uvs[`hero-${name}`] = res.uv;
    };
    add('torso', drawTorso());
    add('shell', drawShell());
    add('neck', drawNeck());
    add('head', drawHead());
    for (const st of ['open', 'half', 'closed']) add(`eye-${st}`, drawEye(st));
    add('mouth-open', drawMouthOverlay('mouth-open', true));
    add('mouth-talk', drawMouthOverlay('mouth-talk', 'talk'));
    add('fore-upper', drawForeUpper(false));
    add('fore-upper-far', drawForeUpper(true));
    add('hind-upper', drawHindUpper(false));
    add('hind-upper-far', drawHindUpper(true));
    add('fore-lower', drawLower('fore-lower', FORE_LOWER, FORE_KELP, J.carpus, false));
    add('fore-lower-far', drawLower('fore-lower-far', FORE_LOWER, FORE_KELP, J.carpus, true));
    add('hind-lower', drawLower('hind-lower', HIND_LOWER, HIND_KELP, J.hock, false));
    add('hind-lower-far', drawLower('hind-lower-far', HIND_LOWER, HIND_KELP, J.hock, true));
    add('hoof', drawHoof(false));
    add('hoof-far', drawHoof(true));
    add('fringe', drawFringe(false));
    add('fringe-far', drawFringe(true));
    add('tail', drawTail());
    for (const m of MANE.concat(FORELOCK)) {
        const L = r1(polyLen(spineWu(m.spine)));
        add(m.name, drawTuft(m.name, m.w, L, licksFor(m)));
    }
    add('shadow', drawShadow());
    add('shadow-hoof', drawHoofShadow());
    api.data('hero-rig', rigData(uvs));
}

// ---------------------------------------------------------------------------
// Rig data: everything the runtime needs, in wu (rest pose, body space)
// ---------------------------------------------------------------------------
function rigData(uvs) {
    const p = (q) => TP(q[0], q[1]);
    const add2 = (a, b) => [r1(a[0] + b[0]), r1(a[1] + b[1])];
    const len = (a, b) => r1(Math.hypot(b[0] - a[0], b[1] - a[1]));
    const leg = (root, mid, end, off, names, bend, front, near) => {
        const R0 = add2(p(root), off), M0 = add2(p(mid), off), E0 = add2(p(end), off);
        return {
            root: R0, mid: M0, end: E0, sole: r1(HOOF_H), bend, front, near,
            l1: len(R0, M0), l2: len(M0, E0),
            upper: names[0], lower: names[1], hoof: names[2], fringe: names[3]
        };
    };
    const strip = (tex, parent, pts, width, length, segs, extra = {}) => ({
        texture: tex, parent, width, length, uv: uvs[tex], rest: fitSpine(pts, length, segs), ...extra
    });
    const legs = {
        hindF: leg(J.hip, J.hock, J.hindHoof, FAR.hind, ['hero-hind-upper-far', 'hero-hind-lower-far', 'hero-hoof-far', 'hero-fringe-far'], -1, false, false),
        foreF: leg(J.elbow, J.carpus, J.foreHoof, FAR.fore, ['hero-fore-upper-far', 'hero-fore-lower-far', 'hero-hoof-far', 'hero-fringe-far'], 1, true, false),
        hindN: leg(J.hip, J.hock, J.hindHoof, [0, 0], ['hero-hind-upper', 'hero-hind-lower', 'hero-hoof', 'hero-fringe'], -1, false, true),
        foreN: leg(J.elbow, J.carpus, J.foreHoof, [0, 0], ['hero-fore-upper', 'hero-fore-lower', 'hero-hoof', 'hero-fringe'], 1, true, true)
    };
    // kelp fringe: from the middle of the cannon, over the hoof top (ends ~12 wu above the ground)
    for (const [name, L] of Object.entries(legs)) {
        const a = [L.mid[0] + (L.end[0] - L.mid[0]) * 0.42, L.mid[1] + (L.end[1] - L.mid[1]) * 0.42];
        const b = [a[0] + (L.front ? 0.8 : -0.8), a[1] + FRINGE_L];
        L.fringeStrip = strip(L.fringe, name, [a, b], FRINGE_W, FRINGE_L, 4, { pinned: 2 });
    }
    const tufts = (list) => list.map((m) => {
        const pts = spineWu(m.spine);
        return strip(`hero-${m.name}`, m.parent, pts, m.w, r1(polyLen(pts)), 5);
    });
    return {
        version: 1,
        scale: S,
        hl: 200,
        note: 'Rest pose in body space (wu, y down, facing right, origin on the ground under the body middle). Sprites use their atlas anchors as pivots; strips map uv [u0,v0,u1,v1] of their frame along the spine.',
        ground: 0,
        body: { pivot: p(J.body) },
        joints: {
            neck: p(J.neck), head: p(J.head), eye: p(J.eye), mouth: p(J.mouth), tail: p(J.tail),
            muzzle: p([571, 411]), poll: p([478, 350]), withers: p([398, 432]), chest: p([489, 520]),
            rump: p([192, 540]), shellTop: p([352, 409])
        },
        parts: {
            torso: { texture: 'hero-torso', parent: 'body', pivot: p(J.body) },
            shell: { texture: 'hero-shell', parent: 'body', pivot: p(J.body) },
            neck: { texture: 'hero-neck', parent: 'body', pivot: p(J.neck) },
            head: { texture: 'hero-head', parent: 'neck', pivot: p(J.head) },
            eye: { textures: ['hero-eye-open', 'hero-eye-half', 'hero-eye-closed'], parent: 'head', pivot: p(J.eye) },
            mouth: { texture: 'hero-mouth-open', talk: 'hero-mouth-talk', parent: 'head', pivot: p(J.mouth) },
            shadow: { texture: 'hero-shadow', hoof: 'hero-shadow-hoof' }
        },
        legs,
        tail: strip('hero-tail', 'body', spineWu(TAIL_SPINE), TAIL_W, TAIL_L, 10, { profile: TAIL_PROFILE }),
        mane: tufts(MANE),
        forelock: tufts(FORELOCK),
        // back to front: a leg name means its upper, lower, hoof and fringe; 'mane:i' one tuft
        z: [
            'shadow', 'hindF', 'foreF', 'tail', 'torso', 'hindN', 'neck', 'shell',
            'mane:2', 'mane:1', 'mane:0', 'mane:3', 'mane:4', 'mane:5', 'forelock:0', 'head', 'eye', 'mouth', 'forelock:1', 'foreN'
        ],
        sizes: {
            head: r1(Math.hypot(...[0, 1].map((i) => T(571, 411)[i] - T(478, 350)[i]))),
            shellLength: r1((414 - 186) * K), legBelowBelly: r1((GROUND - 576) * K), groundToShellTop: r1((GROUND - 409) * K)
        }
    };
}
