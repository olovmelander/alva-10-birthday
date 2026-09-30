/*
 * Kartväktaren's memory (Kapitel 3, talk 1): why he folded the page, as a pencil
 * sketch on a card, one picture for each line he speaks
 * (docs/skoldhast/story-kartvaktaren.md):
 *   0  his map of Alva's page: LAND and HAV with a ruled line between, and his
 *      paper tower out in the white margin
 *   1  her shoreline runs out onto the white paper, the sea follows it and the
 *      wave rises towards his tower; he throws up his arms
 *   2  his ruler comes down across the end of her line, the sea corner folds
 *      under the page, the splash stops in mid-air and scraps of his map fly
 * The fold is the prologue's own geometry (opening-fold.mjs), seen small, and the
 * picture is the prologue's: the game's own lighthouse, lamp alight, with him on
 * its gallery (the same paper rig, the same poses), so the player recognises the
 * moment they drew. Until the bay art has loaded, pencil stand-ins take their place.
 *
 *   sampleKvMemory(stage, since, { lessMotion }) → progress of every part (pure)
 *   createKvMemory(PIXI, { texture, makeHero, caption, lessMotion })
 *     → { container, stage(i), update(dt), fit(width, height, insets), close(), destroy() }
 */
import { openingCrease } from './opening-fold.mjs';
import { createGuardian } from './guardian.mjs';
import { createMapFragmentProp } from './map-props.mjs';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { const p = clamp01(v); return p * p * (3 - 2 * p); };
const lerp = (a, b, u) => a + (b - a) * u;

// The card, in its own units. Her picture fills the left; the white margin the right.
export const KV_MEMORY = Object.freeze({
    width: 600, height: 380,
    picture: Object.freeze({ x: 22, y: 22, w: 316, h: 336 }),
    seaY: 232,
    shoreX: 212,                 // where her sand meets the sea inside the picture
    endpoint: Object.freeze([506, 232]), // where her new line stops: the fold crosses it here
    tower: Object.freeze({ x: 560, y: 226 }),
    // on the lighthouse's gallery, in front of its left window, as in the prologue
    keeper: Object.freeze({ x: 550, y: 112 }),
    // (on the islet beside the pencil stand-in tower, when the lighthouse art is not here)
    keeperSketch: Object.freeze({ x: 532, y: 221.8 })
});
const KEEPER_SCALE = .14, KEEPER_SKETCH_SCALE = .2;
// the lighthouse drawing (1320 px high) at about 150 card units; its gallery and lamp heights and shutters
const LH_SCALE = .114, LH_GAME = 1.37, LH_LAMP = 1100, LH_SHUTTER = 78;
const INK = 0x625b50, GRAPHITE = 0x514e41, BLUE = 0x457d98, SEA = 0x8db5bf, SAND = 0xe3c797, PAPER = 0xf7eed8;

/** How far along each part of the memory is, for a stage and the seconds since it began. */
export function sampleKvMemory(stage, since, { lessMotion = false } = {}) {
    const s = lessMotion ? since * 6 : since;
    const at = (n, f) => (stage > n ? 1 : stage < n ? 0 : f());
    const out = {
        labels: at(0, () => ease((s - .25) / .9)),
        line: at(1, () => ease(s / 1.5)),
        wash: at(1, () => ease((s - .15) / 1.9)),
        wave: at(1, () => ease((s - .1) / 1.1)),
        fright: at(1, () => ease((s - .9) / .5)),
        ruler: at(2, () => ease(s / .55)),
        fold: at(2, () => ease((s - .55) / 1.1)),
        scraps: at(2, () => ease((s - .8) / 1.6))
    };
    // The splash stops at the visible fold, never before its cause.
    out.frozen = out.fold >= .45;
    if (lessMotion) out.fold = out.fold < .5 ? 0 : 1;
    return out;
}

// Ruled capitals: every stroke straight, as Kartväktaren letters his map.
const LETTERS = {
    L: [[0, 0, 0, 1], [0, 1, .6, 1]],
    A: [[0, 1, .35, 0], [.35, 0, .7, 1], [.15, .62, .55, .62]],
    N: [[0, 1, 0, 0], [0, 0, .6, 1], [.6, 1, .6, 0]],
    D: [[0, 0, 0, 1], [0, 0, .38, 0], [.38, 0, .6, .25], [.6, .25, .6, .75], [.6, .75, .38, 1], [.38, 1, 0, 1]],
    H: [[0, 0, 0, 1], [.6, 0, .6, 1], [0, .5, .6, .5]],
    V: [[0, 0, .35, 1], [.35, 1, .7, 0]]
};

export function createKvMemory(PIXI, { texture, makeHero, caption = '', lessMotion = false }) {
    const T = (name) => (typeof texture === 'function' ? texture(name) : null) || null;
    const { width: W, height: H, picture: PIC, seaY, shoreX, endpoint: E, tower: TW } = KV_MEMORY;
    const crease = openingCrease(W, H, E);
    const { a, b } = crease;
    const creaseX = (y) => a[0] + (b[0] - a[0]) * (y / H);

    const container = new PIXI.Container(); container.label = 'kv-memory';
    const dim = new PIXI.Graphics(); container.addChild(dim);
    const sheet = new PIXI.Container(); container.addChild(sheet);
    const title = new PIXI.Text({ text: caption, style: { fontFamily: '"Patrick Hand", cursive', fontSize: 30, fill: INK } });
    title.anchor.set(.5, 1); title.position.set(W / 2, -10); sheet.addChild(title);

    const line = (g, pts, color = INK, alpha = .8, width = 2.2) => {
        g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]);
        return g.stroke({ color, alpha, width, cap: 'round', join: 'round' });
    };
    const paperFill = (g, pts, alpha = .8) => {
        g.poly(pts.flat()).fill({ color: PAPER });
        if (T('mat-paper')) g.poly(pts.flat()).fill({ texture: T('mat-paper'), textureSpace: 'global', alpha });
        return g;
    };

    // --- the card's art: everything that stays on the page --------------------------
    const art = new PIXI.Container(); sheet.addChild(art);
    const shadow = new PIXI.Graphics().rect(4, 6, W, H).fill({ color: 0x3b3027, alpha: .18 });
    const paper = paperFill(new PIXI.Graphics(), [[0, 0], [W, 0], [W, H], [0, H]]);
    art.addChild(paper);

    // her picture: sky, sun, gulls, her sand and a little of her sea
    const pic = new PIXI.Container(); art.addChild(pic);
    const picMask = new PIXI.Graphics().rect(PIC.x, PIC.y, PIC.w, PIC.h).fill(0xffffff);
    pic.addChild(picMask); pic.mask = picMask;
    const ground = [[PIC.x, 214], [80, 212], [140, 216], [190, 226], [shoreX, seaY], [250, 252], [300, 276], [PIC.x + PIC.w, 292]];
    const groundAt = (x) => {
        for (let i = 1; i < ground.length; i++) if (x <= ground[i][0]) {
            const [x0, y0] = ground[i - 1], [x1, y1] = ground[i];
            return lerp(y0, y1, (x - x0) / (x1 - x0));
        }
        return ground.at(-1)[1];
    };
    const still = new PIXI.Graphics();
    still.rect(PIC.x, PIC.y, PIC.w, seaY - PIC.y).fill({ color: 0xd6e9f0, alpha: .6 });
    still.poly([...ground.flat(), PIC.x + PIC.w, PIC.y + PIC.h, PIC.x, PIC.y + PIC.h]).fill({ color: SAND, alpha: .72 });
    still.poly([shoreX, seaY, PIC.x + PIC.w, seaY, PIC.x + PIC.w, 292, 300, 276, 250, 252]).fill({ color: SEA, alpha: .6 });
    line(still, ground, GRAPHITE, .75, 2);
    line(still, [[shoreX, seaY], [PIC.x + PIC.w, seaY]], BLUE, .7, 2.2);
    for (let i = 0; i < 5; i++) {
        const x = 236 + i * 19, y = seaY + 12 + (i % 2) * 10;
        line(still, [[x, y], [x + 5, y - 3], [x + 10, y]], BLUE, .35, 1.6);
    }
    for (let i = 0; i < 16; i++) { // sand dots
        const x = PIC.x + 14 + (i * 83) % (shoreX - PIC.x - 10), y = groundAt(x) + 14 + (i * 37) % 60;
        still.circle(x, y, 1.3).fill({ color: 0x9d7f52, alpha: .45 });
    }
    // her sun and two m-gulls
    still.circle(72, 70, 18).fill({ color: 0xf3d47c, alpha: .92 }).stroke({ color: 0xc79b3f, width: 1.6, alpha: .7 });
    for (let i = 0; i < 10; i++) {
        const r = i / 10 * Math.PI * 2;
        line(still, [[72 + Math.cos(r) * 24, 70 + Math.sin(r) * 24], [72 + Math.cos(r) * 32, 70 + Math.sin(r) * 32]], 0xc79b3f, .7, 1.8);
    }
    for (const [x, y, s] of [[160, 62, 1], [204, 88, .8]]) line(still, [[x - 10 * s, y + 3 * s], [x - 5 * s, y - 3 * s], [x, y + 2 * s], [x + 5 * s, y - 3 * s], [x + 10 * s, y + 3 * s]], GRAPHITE, .75, 1.8);
    pic.addChild(still);
    // the sköldhäst, the game's own rig, standing on her sand
    const hero = makeHero?.() || null;
    const heroX = 118;
    if (hero) {
        hero.view.position.set(heroX, groundAt(heroX)); hero.view.scale.set(.25);
        pic.addChild(hero.view);
    }
    const frame = new PIXI.Graphics();
    line(frame, [[PIC.x, PIC.y], [PIC.x + PIC.w, PIC.y], [PIC.x + PIC.w, PIC.y + PIC.h], [PIC.x, PIC.y + PIC.h], [PIC.x, PIC.y]], INK, .7, 2.4);
    art.addChild(frame);

    // his ruled map on her picture: LAND, a straight line, HAV
    const labels = new PIXI.Graphics(); art.addChild(labels);
    function word(g, text, x, y, size, u) {
        const n = Math.ceil(text.length * u);
        for (let i = 0; i < n; i++) for (const [x0, y0, x1, y1] of LETTERS[text[i]])
            line(g, [[x + i * size * .85 + x0 * size, y + y0 * size], [x + i * size * .85 + x1 * size, y + y1 * size]], GRAPHITE, .9, 2.4);
    }

    // the white margin: the sea that followed her line (it grows in stage 1)
    const wash = new PIXI.Graphics(); art.addChild(wash);
    const pen = new PIXI.Graphics(); art.addChild(pen); // her new line
    // his paper tower on an islet, and Kartväktaren on its gallery
    const tower = new PIXI.Graphics(); art.addChild(tower);
    const keeper = new PIXI.Graphics(); art.addChild(keeper);
    // the wave at the picture's edge and its drops (over the frame: it spills out)
    const wave = new PIXI.Graphics(); art.addChild(wave);

    // --- the fold: the corner beyond the crease, as a flap -----------------------------
    const restMask = new PIXI.Graphics().poly([0, 0, ...a, ...b, 0, H]).fill(0xffffff);
    restMask.visible = false; sheet.addChild(restMask);
    const flap = new PIXI.Container(); flap.label = 'kv-memory-flap'; flap.visible = false;
    const flapMask = new PIXI.Graphics().poly([...a, W, 0, ...b]).fill(0xffffff);
    const flapFront = new PIXI.Container();
    const towerCopies = [tower, keeper, new PIXI.Graphics(tower.context), new PIXI.Graphics(keeper.context)];
    flapFront.addChild(paperFill(new PIXI.Graphics(), [a, [W, 0], b]), new PIXI.Graphics(wash.context), towerCopies[2], towerCopies[3]);
    // Kartväktaren himself: the game's paper rig when its art is here (one on the page and
    // one on the folding corner, which carries him under); otherwise the pencil keeper above
    const keeperActor = { id: 'kv', visible: true, x: 0, y: 0, pose: 'stand', facing: -1, walk: null, pop: 0 };
    const keeperRigs = [];
    const keeperHomes = [art, flapFront];
    // where he stands (the gallery once the lighthouse art is here) and his measuring hand
    // in the 'point' pose (the ruler that folds the page starts there)
    let spot = { ...KV_MEMORY.keeperSketch, scale: KEEPER_SKETCH_SCALE };
    const hand = () => ({ x: spot.x - 40 * 1.06 * spot.scale, y: spot.y - 112 * 1.06 * spot.scale });
    // the game's own lighthouse, one on the page and one on the folding corner
    const lighthouses = [];
    function buildLighthouses() {
        if (!texture?.('lighthouse')) return;
        const k = LH_SCALE / LH_GAME, lampY = -LH_LAMP * LH_SCALE;
        for (const [home, after] of [[art, tower], [flapFront, towerCopies[2]]]) {
            const c = new PIXI.Container(); c.label = 'kv-memory-lighthouse';
            const body = new PIXI.Sprite(texture('lighthouse')); body.anchor.set(.5, 1); body.scale.set(LH_SCALE); body.y = 1;
            c.addChild(body);
            for (const dx of [-LH_SHUTTER, 0, LH_SHUTTER]) if (texture('shutter-open')) {
                const sh = new PIXI.Sprite(texture('shutter-open')); sh.anchor.set(.5); sh.scale.set(k); sh.position.set(dx * LH_SCALE, lampY);
                c.addChild(sh);
            }
            if (texture('lamp-lit')) { const lamp = new PIXI.Sprite(texture('lamp-lit')); lamp.anchor.set(.5); lamp.scale.set(k); lamp.y = lampY; c.addChild(lamp); }
            home.addChildAt(c, home.getChildIndex(after) + 1);
            lighthouses.push(c);
        }
        spot = { ...KV_MEMORY.keeper, scale: KEEPER_SCALE };
    }
    const flapBack = paperFill(new PIXI.Graphics(), [a, [W, 0], b], .5); flapBack.tint = 0xe8dfca;
    const flapEdge = new PIXI.Graphics();
    flap.addChild(flapFront, flapBack, flapMask, flapEdge); flapFront.mask = flapMask;
    sheet.addChild(flap);
    const creaseLine = new PIXI.Graphics(); sheet.addChild(creaseLine);
    const ruler = new PIXI.Graphics();
    ruler.roundRect(-120, -7, 240, 14, 2).fill({ color: 0xb7ac86, alpha: .95 }).stroke({ width: 1.6, color: 0x655846, alpha: .85 });
    for (let i = -110; i <= 110; i += 10) ruler.moveTo(i, -7).lineTo(i, i % 50 ? -3 : 0).stroke({ width: 1.1, color: 0x655846 });
    ruler.visible = false; sheet.addChild(ruler);
    // as in the prologue: one to her sand beside the sköldhäst (it stays), one away over the land, one into the sea
    const scraps = [[512, 118, 168, 222, 5.2, true], [536, 176, -20, 70, -3.6], [498, 92, 300, 290, 3.3]].map(([x0, y0, x1, y1, spin, rest], i) => {
        const g = createMapFragmentProp(PIXI, { texture, fragment: ['corner', 'land', 'sea'][i], width: 25 });
        g.visible = false; sheet.addChild(g);
        return { g, x0, y0, x1, y1, spin, rest: !!rest, delay: i * .12 };
    });
    sheet.addChildAt(shadow, 0);

    // --- drawing --------------------------------------------------------------------------
    let stageNow = 0, since = 0, time = 0, freezeTime = null, closing = null, dead = false;
    const drops = Array.from({ length: 7 }, (_, i) => ({ phase: i / 7, reach: 36 + (i * 17) % 44, lift: 34 + (i * 23) % 36 }));
    // Her wave as a curl, in unit coordinates (x along, y up): the back, the crest,
    // the lip pitching forward, the hollow under it, the front face.
    const CURL = [[0, 0], [.2, .35], [.42, .78], [.6, .98], [.72, 1], [.84, .95], [.95, .8], [1, .62], [.94, .55], [.87, .62],
        [.81, .56], [.79, .38], [.83, .15], [.9, 0]];
    function drawWave(p) {
        wave.clear();
        // it rises and pitches out of her picture, towards the white paper
        const t = freezeTime ?? time, breathe = lessMotion ? 0 : Math.sin(t * 2.6) * .04 * (1 - p.wave * .6);
        const hgt = lerp(20, 78, p.wave) * (1 + breathe), ww = lerp(42, 100, p.wave), x0 = lerp(284, 256, p.wave);
        const at = ([u, v]) => [x0 + u * ww, seaY - v * hgt];
        const body = CURL.map(at);
        wave.poly([...body.flat(), x0 + ww * .9, seaY + 2, x0, seaY + 2]).fill({ color: 0xa9cbd3 });
        // the hollow under the lip, and the curl's own line
        wave.poly([at([.8, .58]), at([.87, .62]), at([.94, .55]), at([.9, .3]), at([.82, .3])].flat()).fill({ color: BLUE, alpha: .35 });
        line(wave, body.slice(0, 11), BLUE, .9, 2.3);
        line(wave, [at([.3, .15]), at([.5, .55]), at([.66, .78])], BLUE, .35, 1.6);
        // foam along the crest and the lip
        for (let i = 0; i < 7; i++) {
            const u = .52 + i * .08, v = u < .72 ? .96 + (u - .52) * .2 : 1 - (u - .72) * 1.35;
            const [x, y] = at([Math.min(u, 1), v]);
            wave.circle(x, y - 1, 5 - i * .35).fill({ color: 0xffffff, alpha: .95 }).stroke({ color: BLUE, width: 1.1, alpha: .5 });
        }
        // drops thrown from the lip towards the white paper (they hang still once the page is folded)
        const [lx, ly] = at([1, .62]);
        const n = Math.round(drops.length * clamp01(p.wave * 1.4 - .2));
        for (let i = 0; i < n; i++) {
            const d = drops[i], u = (d.phase + (lessMotion ? 0 : t * .45)) % 1;
            const x = lx + 4 + u * d.reach * 1.3, y = ly - Math.sin(u * Math.PI) * d.lift * .7 + u * u * 30;
            if (x > creaseX(y) - 8) continue; // the drops never leave the part of the page that stays
            wave.circle(x, y, 3.4).fill({ color: 0xcfe6ee, alpha: .95 }).stroke({ color: BLUE, width: 1.2, alpha: .75 });
        }
    }
    function drawMargin(p) {
        wash.clear(); pen.clear();
        const right = PIC.x + PIC.w;
        if (p.wash > 0) {
            const x = lerp(right, W, p.wash);
            // her sea spreads under the line: strongest at the picture, fading downwards
            for (let i = 0; i < 5; i++) {
                const y0 = seaY + i * 26, fade = .42 - i * .07;
                wash.poly([right, y0, x - i * 18, y0, x - i * 18 - 16, y0 + 26, right, y0 + 26]).fill({ color: SEA, alpha: Math.max(.06, fade) });
            }
            for (let i = 0; i < 9; i++) {
                const wx = right + 16 + (i * 53) % Math.max(20, x - right - 20), wy = seaY + 16 + (i * 29) % 70;
                if (wx < x - 14) line(wash, [[wx, wy], [wx + 6, wy - 3], [wx + 12, wy]], BLUE, .4, 1.5);
            }
        }
        if (p.line > 0) {
            const x = lerp(right, E[0], p.line);
            line(pen, [[right, seaY], [x, seaY]], 0x244f8f, .95, 3.2);
            if (p.line < 1) pen.circle(x, seaY, 3).fill({ color: 0x244f8f });
            else pen.circle(x, seaY, 2.6).fill({ color: 0x244f8f, alpha: .9 });
        }
    }
    const TOWER_SCALE = 1.4;
    function drawTower(p) {
        tower.clear(); keeper.clear();
        const t = freezeTime ?? time;
        const shake = lessMotion ? 0 : Math.sin(t * 31) * 1.1 * p.fright * (p.frozen ? 0 : 1);
        for (const g of towerCopies) { g.position.set(TW.x + shake, TW.y); g.scale.set(TOWER_SCALE); }
        if (!lighthouses.length) buildLighthouses();
        for (const c of lighthouses) c.position.set(TW.x + shake, TW.y);
        const roof = -76;
        tower.poly([-30, 4, -20, -3, 0, -6, 18, -4, 30, 4]).fill({ color: 0x9d998f, alpha: .8 });
        line(tower, [[-30, 4], [-20, -3], [0, -6], [18, -4], [30, 4]], 0x5d574f, .8, 1.4);
        if (!lighthouses.length) { // the pencil stand-in tower
            paperFill(tower, [[-13, -4], [-9, roof + 18], [9, roof + 18], [13, -4]], .9);
            tower.poly([1, roof + 18, 9, roof + 18, 13, -4, 3, -4]).fill({ color: 0x89909a, alpha: .24 });
            line(tower, [[-13, -4], [-9, roof + 18], [9, roof + 18], [13, -4], [-13, -4]], 0x766d61, .8, 1.5);
            tower.poly([-14, roof + 18, 0, roof, 14, roof + 18]).fill({ color: 0xd9c897, alpha: .9 });
            line(tower, [[-14, roof + 18], [0, roof], [14, roof + 18]], 0x796f64, .8, 1.4);
            tower.rect(-7, roof + 22, 14, 9).fill({ color: 0x5b747a, alpha: .6 }).stroke({ color: 0x766d61, width: 1 });
            line(tower, [[-16, roof + 34], [16, roof + 34]], 0x766d61, .8, 1.4); // the gallery rail
        }
        // Kartväktaren on the gallery: he measures her line, shrinks back as the sea
        // comes, and his ruler goes to the fold (the prologue's own poses)
        keeperActor.pose = p.fold > 0 || p.ruler > .2 ? 'fold' : p.fright > .5 ? 'worry' : p.line > 0 ? 'point' : 'stand';
        if (!keeperRigs.length && texture?.('kv-part-coat')) for (const home of keeperHomes) {
            const rig = createGuardian(PIXI, { texture }), wrap = new PIXI.Container();
            wrap.addChild(rig.container);
            home.addChild(wrap); keeperRigs.push({ rig, wrap });
        }
        for (const { rig, wrap } of keeperRigs) {
            wrap.position.set(spot.x + shake, spot.y); wrap.scale.set(spot.scale);
            rig.update(keeperActor, { time: t, dt: 1 / 60, reducedMotion: lessMotion, figure: true });
        }
        // (in tower units: where he stands, and the pencil stand-in when the rig is not loaded)
        const k = p.fright, kx = (spot.x - TW.x) / TOWER_SCALE, ky = (spot.y - TW.y) / TOWER_SCALE;
        if (!keeperRigs.length) {
            keeper.circle(kx, ky - 21, 3.2).fill({ color: 0xf2ebd8 }).stroke({ color: 0x5d574f, width: 1 });
            keeper.poly([kx - 4, ky - 17, kx + 4, ky - 17, kx + 6, ky - 7, kx - 6, ky - 7]).fill({ color: 0xe8e0c8 }).stroke({ color: 0x5d574f, width: 1 });
            line(keeper, [[kx - 2, ky - 7], [kx - 2, ky]], 0x5d574f, .9, 1.2);
            line(keeper, [[kx + 2, ky - 7], [kx + 2, ky]], 0x5d574f, .9, 1.2);
            line(keeper, [[kx - 4, ky - 15], [kx - 9, lerp(ky - 11, ky - 25, k)]], 0x5d574f, .9, 1.3);
            line(keeper, [[kx + 4, ky - 15], [kx + 9, lerp(ky - 11, ky - 25, k)]], 0x5d574f, .9, 1.3);
            if (keeperActor.pose === 'point' || keeperActor.pose === 'stand') line(keeper, [[kx - 16, ky - 17], [kx - 5, ky - 18]], 0x8e7851, .85, 1.4);
        }
        if (k > .5 && !p.frozen && p.ruler === 0) for (let i = 0; i < 3; i++) {
            const r = -2.4 + i * .7;
            line(keeper, [[kx + Math.cos(r) * 8, ky - 24 + Math.sin(r) * 8], [kx + Math.cos(r) * 13, ky - 24 + Math.sin(r) * 13]], 0x9a3b2e, (k - .5) * 1.6, 1.3);
        }
    }
    function drawFold(p) {
        const folding = p.fold > 0;
        // (a mask must be visible to mask: an invisible one hides everything)
        restMask.visible = folding;
        art.mask = folding ? restMask : null;
        flap.visible = folding && p.fold < .5;
        if (folding) {
            // the prologue's fold as one affine map: the corner turns over the crease
            const [nx, ny] = crease.normal, th = Math.PI * p.fold, k = Math.cos(th) - 1, s = Math.sin(th);
            const vx = nx * k, vy = ny * k - .16 * s, na = nx * a[0] + ny * a[1];
            flap.setFromMatrix(new PIXI.Matrix(1 + vx * nx, vy * nx, vx * ny, 1 + vy * ny, -na * vx, -na * vy));
            flapFront.alpha = 1; flapBack.visible = false;
            const shade = Math.round(Math.sin(th) * 34);
            flapFront.children[0].tint = 0xffffff - shade * 0x010101;
            flapEdge.clear(); line(flapEdge, [a, [W, 0], b, a], 0x63584b, .55, 2);
        }
        creaseLine.clear();
        if (p.fold > .5) {
            line(creaseLine, [[a[0], a[1] + 1], [b[0] - 1, b[1]]], 0xfffaf0, .9, 3);
            line(creaseLine, [[a[0] + 1.6, a[1] + 1], [b[0] + .6, b[1]]], 0x7a6b55, .6, 1.6);
        }
        // the ruler: from his gallery down along the crease, then away as the page folds
        ruler.visible = p.ruler > 0 && p.fold < .8;
        if (ruler.visible) {
            const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
            const cx = E[0] + 8, cy = E[1] - 90;
            const from = hand();
            ruler.position.set(lerp(from.x, cx, p.ruler) + p.fold * 70, lerp(from.y, cy, p.ruler));
            ruler.rotation = lerp(-.3, ang, p.ruler);
            ruler.scale.set(lessMotion ? 1 : lerp(.08, 1, p.ruler));
            ruler.alpha = p.ruler * (1 - clamp01((p.fold - .4) / .4));
        }
        for (const sc of scraps) {
            const u = clamp01((p.scraps - sc.delay) / (1 - sc.delay));
            sc.g.visible = u > 0 && (u < 1 || sc.rest);
            if (!sc.g.visible) continue;
            const e = ease(u), flutter = lessMotion ? 0 : Math.sin(u * 14 + sc.spin) * 10 * (1 - u);
            sc.g.position.set(lerp(sc.x0, sc.x1, e) + flutter, lerp(sc.y0, sc.y1, e) - Math.sin(u * Math.PI) * 60);
            sc.g.rotation = lessMotion ? .12 : sc.rest ? sc.spin * u * (1 - u) * 4 + .12 * u : sc.spin * u;
            // the one that lands settles flat on her sand; the others fly on out of sight
            sc.g.scale.set(1.25, sc.rest ? lerp(1.25, .7, e) : 1.25);
            sc.g.alpha = sc.rest ? 1 : 1 - clamp01((u - .8) / .2);
        }
    }
    function draw() {
        const p = sampleKvMemory(stageNow, since, { lessMotion });
        if (p.frozen && freezeTime === null) freezeTime = time;
        labels.clear();
        if (p.labels > 0) {
            word(labels, 'LAND', 44, 262, 20, p.labels);
            word(labels, 'HAV', 250, 300, 18, p.labels);
            // the straight line he rules between them, where her sand meets her sea
            const len = (PIC.y + PIC.h - 34 - (PIC.y + 30)) * p.labels;
            for (let y = PIC.y + 30; y < PIC.y + 30 + len; y += 12) line(labels, [[shoreX + 2, y], [shoreX + 2, Math.min(y + 6, PIC.y + 30 + len)]], GRAPHITE, .75, 2);
        }
        drawMargin(p); drawTower(p); drawWave(p); drawFold(p);
        if (hero) hero.update(1 / 60, { x: 0, y: 0, facing: 1, gait: 'stand', mode: 'ground', speed: 0, time: freezeTime ?? time, hide: 0,
            groundAt: () => 0, emote: p.fright > .5 ? 'surprised' : null });
        return p;
    }
    let opacity = 0;
    function update(dt) {
        if (dead) return null;
        time += dt; since += dt;
        opacity = closing ? Math.max(0, opacity - dt / (lessMotion ? .15 : .3)) : Math.min(1, opacity + dt / (lessMotion ? .15 : .35));
        container.alpha = opacity;
        const p = draw();
        if (closing && opacity <= 0) { const done = closing; closing = null; done(); }
        return p;
    }
    update(0);
    return {
        container, update,
        get stageIndex() { return stageNow; },
        stage(i) { if (i !== stageNow) { stageNow = Math.max(stageNow, i); since = 0; } },
        fit(width, height, insets = {}) {
            const top = insets.top ?? 40, bottom = insets.bottom ?? 30, side = 18;
            dim.clear().rect(0, 0, width, height).fill({ color: 0x2a241d, alpha: .28 });
            const scale = Math.min((width - side * 2) / (W + 10), (height - top - bottom - 36) / (H + 10), 1.35);
            sheet.scale.set(scale);
            sheet.position.set(width / 2 - W / 2 * scale, top + 36 + ((height - top - bottom - 36) - H * scale) / 2);
            title.style.fontSize = Math.max(26, 15 / scale);
        },
        close() { return new Promise((resolve) => { closing = resolve; }); },
        destroy() {
            if (dead) return;
            dead = true;
            hero?.destroy?.();
            keeperRigs.length = 0; lighthouses.length = 0;
            container.parent?.removeChild(container);
            if (!container.destroyed) container.destroy({ children: true });
        }
    };
}
