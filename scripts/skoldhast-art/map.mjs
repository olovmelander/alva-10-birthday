/*
 * Kartväktaren's map of Alva's page, drawn once in coloured pencil: `map-page`
 * (bundle `map`, loaded in the background; 3 px per map unit, 1920 × 1260).
 *
 * Every place sits where skoldhast/src/map-layout.mjs says, and the three torn
 * pieces are cut from this one drawing along its MAP_FRAGMENTS, so the journal,
 * the pieces joining in the game and Klo's fold demo show the same map. Place
 * names are not drawn here: they are live text on top (Patrick Hand).
 *
 * He draws with a ruler: a ruled double border with a scale along it, and the fold
 * (Vecket) as a ruled line out at sea, the page beyond it shaded "between the pages".
 * Alva's world is in her colours: green steppe, a sand beach, a sea deepening into
 * the kelp forest, and Pappersfyren in Spegelviken, lit only in its reflection.
 */
import * as pencil from './pencil.mjs';
import {
    MAP_VIEW, MAP_SCALE as K, MAP_COAST, MAP_WATERLINE, MAP_CLIFF, MAP_CLEFT, MAP_BRIDGE, MAP_POOL, MAP_GATE,
    MAP_DUNE, MAP_VAULT, MAP_HEART, MAP_TOWER, MAP_FOLD_X, MAP_MARK, MAP_COMPASS, MAP_ROUTES
} from '../../skoldhast/src/map-layout.mjs';

const { Sheet, PENCILS: P, smooth, resample, ellipse, edgeBand, gradientMap, multiplyMasks, subtractMask, unionMasks, rng } = pencil;
const TAU = Math.PI * 2;
const MAP = {
    paper: '#f6eed8', gold: '#b48a49', lilac: '#a98fc9', rose: '#e39aa6', peach: '#eab28a',
    steppe: '#8fae6e', steppeLight: '#b9c98f', steppeDark: '#5f7f4c'
};

/** map units → pixels */
const S = (pts) => pts.map(([x, y]) => [x * K, y * K]);
const u = (v) => v * K;

export function drawMapPage() {
    const W = MAP_VIEW.w * K, H = MAP_VIEW.h * K;
    const sh = new Sheet(W, H, { seed: 7041, paper: true, paperColor: MAP.paper, tooth: 0.8, grain: 1.6 });
    const rand = rng(911);
    const mask = (pts, o) => sh.mask(S(pts), o);
    const line = (pts, color, { width = 1.4, alpha = 0.9, wobble = 0.5, passes = 1, clip = null, closed = false } = {}) =>
        sh.outline(color, S(pts), { width: u(width), closed, wobble: u(wobble) / 2, passes, alpha, clip, opaque: false });
    const dashes = (pts, color, { dash = 6, gap = 5, width = 1.5, alpha = 0.9 } = {}) => {
        const q = resample(S(pts), u(1));
        const step = u(dash + gap), on = u(dash);
        let acc = 0, run = [];
        for (let i = 0; i < q.length; i++) {
            const d = i ? Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]) : 0;
            acc += d;
            const m = acc % step;
            if (m < on) run.push(q[i]);
            else if (run.length > 1) { sh.outline(color, run, { width: u(width), closed: false, wobble: 0.6, passes: 1, alpha, opaque: false }); run = []; }
            else run = [];
        }
        if (run.length > 1) sh.outline(color, run, { width: u(width), closed: false, wobble: 0.6, passes: 1, alpha, opaque: false });
    };

    // --- the regions --------------------------------------------------------------------
    const edge = [[-12, -12], [652, -12], [652, 432], [-12, 432]];
    const whole = mask(edge);
    const land = mask(smooth([[MAP_COAST[0][0], -12], ...MAP_COAST, [-12, MAP_COAST.at(-1)[1]], [-12, -12]], { steps: 6 }));
    const shore = mask(smooth([[MAP_WATERLINE[0][0], -12], ...MAP_WATERLINE, [-12, MAP_WATERLINE.at(-1)[1]], [-12, -12]], { steps: 6 }));
    const beach = subtractMask(shore, land);
    const sea = subtractMask(whole, shore);
    const cliff = multiplyMasks(land, mask(smooth([[-12, -12], [MAP_CLIFF[1][0], -12], ...MAP_CLIFF.slice(1, -1), [-12, MAP_CLIFF.at(-1)[1]]], { steps: 6 })));
    const steppe = subtractMask(land, cliff);
    const bay = multiplyMasks(sea, sh.mask(ellipse(u(MAP_TOWER.x - 6), u(MAP_TOWER.y + 30), u(66), u(52), 48), { feather: u(14) }));
    const openSea = subtractMask(sea, bay);

    // --- the sea: pale near the shore, deepening towards the kelp forest -----------------
    // a smooth wash first (little tooth), then pencil strokes over it
    const deepen = gradientMap(W, H, 0, u(210), 0, u(404), 0, 1), deepest = gradientMap(W, H, 0, u(290), 0, u(410), 0, 1);
    sh.fill(P.skyBlue, openSea, { pressure: 0.62, grain: 0.3 });
    sh.fill(P.skyPale, bay, { pressure: 0.75, grain: 0.3 });
    sh.fill('#8fd0cf', multiplyMasks(openSea, edgeBand(sea, W, H, u(14))), { pressure: 0.45, grain: 0.3 });
    sh.fill(P.seaBlue, sea, { pressure: 0.5, grain: 0.35, pmap: deepen });
    sh.fill(P.deepTeal, sea, { pressure: 0.42, grain: 0.35, pmap: deepest });
    sh.tone(P.seaBlue, sea, { pressure: 0.38, angle: -0.08, gap: 2.6 });
    // calm water in the bay: long level strokes, and small waves elsewhere
    for (let i = 0; i < 9; i++) {
        const y = MAP_TOWER.y + 12 + i * 7, x = MAP_TOWER.x - 58 + (i % 3) * 8;
        line([[x, y], [x + 30 + (i % 2) * 16, y]], P.foamLine, { width: 0.9, alpha: 0.28 });
    }
    const waves = [];
    for (let i = 0; i < 70; i++) {
        const x = 30 + rand() * 580, y = 30 + rand() * 360;
        const at = (Math.round(y * K) * W + Math.round(x * K));
        if (!(openSea[at] > 0.9) || x > MAP_FOLD_X - 8) continue;
        waves.push([x, y]);
    }
    for (const [x, y] of waves) {
        const s = 0.8 + rand() * 0.6, deep = y > 300;
        line([[x - 5 * s, y + 1], [x - 2.5 * s, y - 1.6 * s], [x, y + 0.6], [x + 2.5 * s, y - 1.6 * s], [x + 5 * s, y + 1]],
            deep ? '#e9f1f0' : P.foamLine, { width: 0.9, alpha: deep ? 0.5 : 0.45 });
    }

    // --- the land: Alva's steppe, and Klippudden beyond the cleft ------------------------
    sh.fill(MAP.steppeLight, steppe, { pressure: 0.7, grain: 0.3 });
    sh.tone(MAP.steppe, steppe, { pressure: 0.52, angle: 0.35, gap: 2.3 });
    sh.hatch(MAP.steppeLight, { clip: steppe, angle: -0.6, gap: u(1.6), len: [u(4), u(10)], width: u(0.55), pressure: 0.45 });
    sh.tone(MAP.steppeDark, edgeBand(land, W, H, u(9)), { pressure: 0.32, angle: 0.4 });
    sh.fill('#c9c2b4', cliff, { pressure: 0.75, grain: 0.3 });
    sh.tone(P.rock, cliff, { pressure: 0.55, angle: 0.9, gap: 2.2 });
    sh.hatch(P.rockDark, { clip: multiplyMasks(cliff, edgeBand(cliff, W, H, u(10))), angle: 1.2, gap: u(1.4), len: [u(3), u(8)], width: u(0.55), pressure: 0.6 });
    // the cliff edge: short ticks falling to the south and east, and the cleft of Stora språnget
    const cliffEdge = resample(MAP_CLIFF.slice(1, -1), 5);
    for (const [x, y] of cliffEdge) line([[x, y], [x + 2.5, y + 4]], P.rockDark, { width: 0.8, alpha: 0.7 });
    line(MAP_CLEFT, P.graphite, { width: 2.2, alpha: 0.85, wobble: 0.8 });
    line(MAP_CLEFT.map(([x, y]) => [x + 2.2, y + 0.5]), P.rockDark, { width: 1.2, alpha: 0.55 });
    // Galoppbacken: soft hill contours, feather-grass tufts, pasque flowers, and the wave marks up on the ledge
    for (let i = 0; i < 3; i++) {
        const r = 30 - i * 9;
        line(Array.from({ length: 13 }, (_, k) => { const a = Math.PI * (1.08 + k / 12 * 0.84); return [236 + Math.cos(a) * r * 1.5, 138 + Math.sin(a) * r * 0.7]; }),
            P.graphiteSoft, { width: 0.9, alpha: 0.42 });
    }
    const tufts = [];
    for (let i = 0; i < 60; i++) {
        const x = 30 + rand() * 300, y = 28 + rand() * 180;
        const at = Math.round(y * K) * W + Math.round(x * K);
        if (!(steppe[at] > 0.95)) continue;
        tufts.push([x, y]);
    }
    for (const [x, y] of tufts) {
        const s = 0.8 + rand() * 0.5;
        line([[x - 2.6 * s, y - 4.4 * s], [x, y]], MAP.steppeDark, { width: 0.8, alpha: 0.75 });
        line([[x + 2.4 * s, y - 4.8 * s], [x, y]], MAP.steppeDark, { width: 0.8, alpha: 0.75 });
        line([[x + 0.3, y - 5.6 * s], [x, y]], MAP.steppeDark, { width: 0.8, alpha: 0.6 });
    }
    const flowers = tufts.filter((_, i) => i % 5 === 2).map(([x, y]) => [u(x + 4), u(y - 2), 1]);
    sh.dots(MAP.lilac, flowers, { rx: u(1.5), ry: u(1.2), alpha: 0.9 });
    sh.dots(P.sunYellow, flowers.map(([x, y]) => [x, y, 0.5]), { rx: u(0.8), ry: u(0.8), alpha: 1 });
    for (let i = 0; i < 3; i++) {
        const x = 254 + i * 7, y = 120 - i * 2;
        line([[x - 3, y + 1.5], [x, y - 1.5], [x + 3, y + 1.5]], P.seaBlue, { width: 0.9, alpha: 0.8 });
    }

    // --- the beach: sand, a pool, a dune, shells, hoofprints and Vattenporten -------------
    sh.fill('#efd9a4', beach, { pressure: 0.8, grain: 0.3 });
    sh.tone(P.sand, beach, { pressure: 0.6, angle: 1.05, gap: 2.2 });
    sh.hatch(P.sandShade, { clip: beach, angle: 0.3, gap: u(1.8), len: [u(3), u(9)], width: u(0.55), pressure: 0.42 });
    sh.tone(P.wetSand, multiplyMasks(beach, edgeBand(subtractMask(whole, sea), W, H, u(5))), { pressure: 0.28 });
    const pool = ellipse(u(MAP_POOL.x), u(MAP_POOL.y), u(9), u(4.6), 32, -0.2);
    sh.fill('#bfe2ee', sh.mask(pool), { pressure: 1, grain: 0.2 });
    sh.tone(P.skyBlue, sh.mask(pool), { pressure: 0.6, angle: 0 });
    sh.outline(P.foamLine, pool, { width: u(0.8), wobble: 0.5, passes: 1, alpha: 0.8, opaque: false });
    const dune = [[MAP_DUNE.x - 10, MAP_DUNE.y + 3], [MAP_DUNE.x - 2, MAP_DUNE.y - 5], [MAP_DUNE.x + 10, MAP_DUNE.y + 3]];
    sh.tone(P.sandShade, mask(dune), { pressure: 0.7 });
    sh.tone(P.sandShadow, mask([dune[1], dune[2], [MAP_DUNE.x + 2, MAP_DUNE.y + 3]]), { pressure: 0.45 });
    line(dune, P.graphiteSoft, { width: 0.9, alpha: 0.75 });
    const shells = [[352, 64], [366, 150], [331, 176], [296, 196], [258, 202], [370, 94]].map(([x, y]) => [u(x), u(y), 1]);
    sh.dots(MAP.rose, shells.filter((_, i) => i % 2 === 0), { rx: u(1.8), ry: u(1.3), alpha: 0.9 });
    sh.dots(MAP.peach, shells.filter((_, i) => i % 2 === 1), { rx: u(1.8), ry: u(1.3), alpha: 0.9 });
    const prints = resample([[270, 199], [306, 192], [334, 170], [352, 140], [360, 108], [352, 74], [342, 46]], 11);
    prints.forEach(([x, y], i) => {
        const o = i % 2 ? 1.6 : -1.6;
        line(Array.from({ length: 7 }, (_, k) => { const a = Math.PI * (0.1 + k / 6 * 0.8); return [x + o + Math.cos(a) * 1.6, y + Math.sin(a) * 1.9]; }),
            P.graphite, { width: 0.6, alpha: 0.55 });
    });
    // Vattenporten: a rock arch at the waterline, dark inside
    const g = MAP_GATE, arch = (w, h, cy) => Array.from({ length: 15 }, (_, k) => { const a = Math.PI * (1 + k / 14); return [g.x + Math.cos(a) * w, cy + Math.sin(a) * h]; });
    const gateOuter = [[g.x - 14, g.y + 4], ...arch(14, 13, g.y + 2).slice(1, -1), [g.x + 14, g.y + 4]];
    sh.tone(P.rock, mask(gateOuter), { pressure: 0.75 });
    sh.fill(P.graphite, mask([[g.x - 7, g.y + 4], ...arch(7, 7, g.y + 3).slice(1, -1), [g.x + 7, g.y + 4]]), { pressure: 0.55 });
    line(gateOuter, P.graphite, { width: 1.1, alpha: 0.85, closed: true });

    // --- coast and waterline --------------------------------------------------------------
    line(MAP_COAST, MAP.steppeDark, { width: 1.1, alpha: 0.7, wobble: 0.6 });
    line(MAP_WATERLINE, P.foamLine, { width: 1.5, alpha: 0.85, wobble: 0.6, passes: 2 });
    for (const [x, y] of resample(MAP_WATERLINE, 9).slice(1, -1)) {
        line([[x + 1.5, y + 1], [x + 4, y + 3.2], [x + 7, y + 2.2]], P.foamLine, { width: 0.7, alpha: 0.45 });
    }

    // --- Streckbron: a gully to the coast, crossed by a dashed arch -------------------------
    const b = MAP_BRIDGE;
    line([[b.x + 3, b.y + 14], [b.x, b.y + 4], [b.x - 3, b.y - 6], [b.x - 8, b.y - 16]], P.seaBlue, { width: 1.3, alpha: 0.7 });
    line([[b.x + 5, b.y + 14], [b.x + 2, b.y + 4], [b.x - 1, b.y - 6], [b.x - 6, b.y - 16]], P.earth, { width: 0.8, alpha: 0.5 });
    dashes(Array.from({ length: 13 }, (_, k) => { const a = Math.PI * (1 + k / 12); return [b.x + Math.cos(a) * 14, b.y + 3 + Math.sin(a) * 7]; }),
        P.graphite, { dash: 2.6, gap: 2, width: 1.3 });

    // --- the deep: Kelpskogen, Mörka valvet, Kelphjärtat -------------------------------------
    const kelp = [];
    for (let i = 0; i < 17; i++) {
        const x0 = 88 + i * 13 + (rand() - 0.5) * 6, top = 262 + rand() * 50, lean = (rand() - 0.5) * 18;
        kelp.push(Array.from({ length: 8 }, (_, k) => { const t = k / 7; return [x0 + lean * t + Math.sin(t * 5 + i) * 3, 396 - (396 - top) * t]; }));
    }
    sh.flow(P.kelpForest, kelp.map(S), { count: 3, spread: u(1.1), width: u(0.9), alpha: [0.6, 0.95] });
    for (const spine of kelp) for (let k = 2; k < 7; k += 2) {
        const [x, y] = spine[k], s = k % 4 ? 1 : -1;
        line([[x, y], [x + s * 4, y - 3.5], [x + s * 1.5, y - 6]], P.kelp, { width: 0.8, alpha: 0.75 });
    }
    const v = MAP_VAULT, vArch = (w, h) => Array.from({ length: 15 }, (_, k) => { const a = Math.PI * (1 + k / 14); return [v.x + Math.cos(a) * w, v.y + Math.sin(a) * h]; });
    const vaultOuter = [[v.x - 20, v.y + 6], ...vArch(20, 16).slice(1, -1), [v.x + 20, v.y + 6]];
    sh.tone(P.rockDark, mask(vaultOuter), { pressure: 0.7 });
    sh.fill(P.graphite, mask([[v.x - 10, v.y + 6], ...vArch(10, 9).slice(1, -1), [v.x + 10, v.y + 6]]), { pressure: 0.8 });
    line(vaultOuter, P.graphite, { width: 1.1, alpha: 0.85, closed: true });
    const hx = MAP_HEART.x, hy = MAP_HEART.y;
    const spiral = Array.from({ length: 60 }, (_, k) => { const t = k / 59, a = t * TAU * 2.4, r = 3 + t * 20; return [hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.7]; });
    line(spiral, '#eaf3f2', { width: 2.2, alpha: 0.55 });
    line(spiral, P.seaDeep, { width: 1.2, alpha: 0.8 });

    // --- Spegelviken and Pappersfyren: rocks round the bay, the tower lit only in its reflection
    for (const [x, y, rx, ry] of [[476, 186, 13, 6], [584, 174, 11, 5]]) {
        const rock = ellipse(u(x), u(y), u(rx), u(ry), 20, 0.1);
        sh.tone(P.rock, sh.mask(rock), { pressure: 0.7 });
        sh.outline(P.graphite, rock, { width: u(0.9), wobble: 1, passes: 1, alpha: 0.8, opaque: false });
    }
    const t = MAP_TOWER;
    const islet = ellipse(u(t.x), u(t.y + 3), u(20), u(5), 24);
    sh.tone(P.rock, sh.mask(islet), { pressure: 0.8 });
    sh.outline(P.graphite, islet, { width: u(0.9), wobble: 0.8, passes: 1, alpha: 0.8, opaque: false });
    // its reflection: pale, broken, with the lamp alight
    for (let i = 0; i < 9; i++) {
        const y = t.y + 9 + i * 5, half = 8 - i * 0.5;
        line([[t.x - half, y], [t.x + half * 0.2, y]], '#e7dcc2', { width: 1.8, alpha: 0.85 });
        line([[t.x + half * 0.35, y + 0.4], [t.x + half, y + 0.4]], P.inkBlue, { width: 0.7, alpha: 0.3 });
    }
    sh.dots(P.warmLight, [[u(t.x), u(t.y + 60), 1]], { rx: u(4), ry: u(2.6), alpha: 1 });
    sh.dots('#f2b340', [[u(t.x), u(t.y + 60), 1]], { rx: u(1.8), ry: u(1.2), alpha: 1 });
    // the tower: folded paper, ink-blue bands, a dark lamp room, the roof and gallery
    const TH = 54; // the tower's height (map units)
    const body = [[t.x - 8.5, t.y], [t.x - 5.5, t.y - TH], [t.x + 5.5, t.y - TH], [t.x + 8.5, t.y]];
    sh.tone(P.paperCream, mask(body), { pressure: 1 });
    sh.tone(P.coatShade, mask([[t.x + 1.2, t.y], [t.x + 1.2, t.y - TH], [t.x + 5.5, t.y - TH], [t.x + 8.5, t.y]]), { pressure: 0.4 });
    for (const y of [t.y - 12, t.y - 26, t.y - 40]) line([[t.x - 8 + (t.y - y) * 0.055, y], [t.x + 8 - (t.y - y) * 0.055, y]], P.inkBlue, { width: 1.2, alpha: 0.75 });
    line(body, P.graphite, { width: 1, alpha: 0.85, closed: true });
    sh.fill(P.inkBlue, mask([[t.x - 5, t.y - TH], [t.x - 5, t.y - TH - 10], [t.x + 5, t.y - TH - 10], [t.x + 5, t.y - TH]]), { pressure: 0.55 });
    for (const dx of [-2.5, 2.5]) line([[t.x + dx, t.y - TH - 1], [t.x + dx, t.y - TH - 9]], P.paperCream, { width: 0.6, alpha: 0.8 });
    line([[t.x - 8.5, t.y - TH], [t.x + 8.5, t.y - TH]], P.graphite, { width: 1.1, alpha: 0.9 });
    const roof = [[t.x - 7.5, t.y - TH - 10], [t.x, t.y - TH - 18], [t.x + 7.5, t.y - TH - 10]];
    sh.tone(P.sandShade, mask(roof), { pressure: 0.6 });
    line(roof, P.graphite, { width: 1, alpha: 0.9, closed: true });

    // --- the ways, and the mark where they meet ------------------------------------------------
    dashes(MAP_ROUTES.land, P.red, { dash: 5, gap: 4, width: 1.5, alpha: 0.85 });
    dashes(MAP_ROUTES.sea, P.seaDeep, { dash: 5, gap: 4, width: 1.5, alpha: 0.9 });
    const [ax, ay] = MAP_ROUTES.sea.at(-1), [bx, by] = MAP_ROUTES.sea.at(-2);
    const ang = Math.atan2(ay - by, ax - bx);
    line([[ax + Math.cos(ang + 2.5) * 6, ay + Math.sin(ang + 2.5) * 6], [ax, ay], [ax + Math.cos(ang - 2.5) * 6, ay + Math.sin(ang - 2.5) * 6]], P.seaDeep, { width: 1.5, alpha: 0.9 });
    const m = MAP_MARK, ring = ellipse(u(m.x), u(m.y), u(11), u(11), 40);
    sh.outline(MAP.gold, ring, { width: u(1.6), wobble: 0.8, passes: 2, alpha: 0.95, opaque: false });
    line([[m.x - 5, m.y - 5], [m.x + 5, m.y + 5]], MAP.gold, { width: 1.6 });
    line([[m.x + 5, m.y - 5], [m.x - 5, m.y + 5]], MAP.gold, { width: 1.6 });

    // --- a compass rose ------------------------------------------------------------------------
    const c = MAP_COMPASS, star = [];
    for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + k * Math.PI / 4, r = k % 2 ? 5 : 15; star.push([c.x + Math.cos(a) * r, c.y + Math.sin(a) * r]); }
    sh.tone(P.paperCream, mask(star), { pressure: 0.9 });
    sh.tone(P.graphiteSoft, mask([[c.x, c.y], star[0], star[1]]), { pressure: 0.6 });
    sh.tone(P.graphiteSoft, mask([[c.x, c.y], star[2], star[3]]), { pressure: 0.6 });
    sh.tone(P.graphiteSoft, mask([[c.x, c.y], star[4], star[5]]), { pressure: 0.6 });
    sh.tone(P.graphiteSoft, mask([[c.x, c.y], star[6], star[7]]), { pressure: 0.6 });
    line(star, P.graphite, { width: 0.9, alpha: 0.85, closed: true });
    sh.outline(P.graphite, ellipse(u(c.x), u(c.y), u(10), u(10), 32), { width: u(0.6), wobble: 0.5, passes: 1, alpha: 0.6, opaque: false });
    sh.fill(P.red, mask([[c.x, c.y - 15], [c.x - 2.2, c.y - 8], [c.x + 2.2, c.y - 8]]), { pressure: 0.9 });
    line([[c.x - 2.6, c.y - 19], [c.x - 2.6, c.y - 25], [c.x + 2.6, c.y - 19], [c.x + 2.6, c.y - 25]], P.graphite, { width: 1, alpha: 0.9 }); // N

    // --- the fold, and the page beyond it, "between the pages" ---------------------------------
    const beyond = mask([[MAP_FOLD_X, -12], [652, -12], [652, 432], [MAP_FOLD_X, 432]]);
    sh.hatch(P.graphiteSoft, { clip: beyond, angle: 0.8, gap: u(2.2), len: [u(8), u(20)], width: u(0.5), pressure: 0.35 });
    line([[MAP_FOLD_X + 1.6, 34], [MAP_FOLD_X + 1.6, 386]], P.graphiteSoft, { width: 0.8, alpha: 0.4, wobble: 0.1 });
    dashes([[MAP_FOLD_X, 34], [MAP_FOLD_X, 386]], P.graphite, { dash: 9, gap: 4, width: 1.3, alpha: 0.8 });

    // --- his ruled border, with a scale along it, and his signature -----------------------------
    const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
    line(box(34, 32, 604, 388), P.graphite, { width: 1.3, alpha: 0.85, wobble: 0.15, passes: 2 });
    line(box(39, 37, 599, 383), P.graphite, { width: 0.7, alpha: 0.6, wobble: 0.1 });
    for (let x = 44, k = 0; x < 600; x += 14, k++) line([[x, 32], [x, k % 5 ? 34.6 : 36]], P.graphite, { width: 0.6, alpha: 0.7, wobble: 0 });
    for (let y = 46, k = 0; y < 384; y += 14, k++) line([[34, y], [k % 5 ? 36.6 : 38, y]], P.graphite, { width: 0.6, alpha: 0.7, wobble: 0 });
    const k0 = [566, 208];
    line([[k0[0] + 3, k0[1] - 7], [k0[0] - 1, k0[1] + 5]], P.graphite, { width: 1.2 });
    line([[k0[0] + 4, k0[1] - 6.5], [k0[0] + 3.4, k0[1] + 5]], P.graphite, { width: 1.2 });
    line([[k0[0] + 9, k0[1] - 7], [k0[0] + 3.8, k0[1] - 0.4], [k0[0] + 9.4, k0[1] + 5]], P.graphite, { width: 1.2 });
    return sh.toCanvas();
}

export async function build(api) {
    api.image('map-page', drawMapPage(), { bundle: 'map', quality: 76 });
}
