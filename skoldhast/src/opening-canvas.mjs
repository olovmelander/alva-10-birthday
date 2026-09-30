/* A few distant, connected places in Alva's opening picture. The near beach,
 * sun, cloud outlines and lettering remain the authored scene. Everything here
 * is pencil geometry on that same sheet, so it disappears UNDER its first fold.
 * No filters, generated textures or independent render loop.
 *
 * The margin continues the picture itself: each pencil row takes its colour
 * from the picture's edge at that height and loses pressure towards the blank
 * paper, the sand and seabed follow the playable world's own bed, and nothing
 * ends in a ruled edge. The sea surface there is left for Alva's stroke.
 *
 * Pappersfyren stands on a far islet in her margin: the game's own drawing of
 * it (props-bay `lighthouse`, shutters open and its lamp alight: the page as it
 * should be, before the fold; afterwards only its reflection shines). On its
 * gallery stands Kartväktaren, small and far off: the game's own paper rig
 * (guardian.mjs), a little faded by distance. The player can see someone there,
 * with a ruler, long before they learn who or why
 * (docs/skoldhast/story-kartvaktaren.md). The prologue sets his pose:
 * 'stand' → 'point' (measuring her line) → 'worry' (the sea is coming) →
 * 'fold' (his ruler has gone to the fold). Until the bay art has loaded, a small
 * folded-paper sketch of the tower and a pencil figure on its islet stand in. */
import { createGuardian } from './guardian.mjs';

// The lighthouse on her paper: its drawing is 1320 px high; about 200 paper units here.
const LH_SCALE = .152;
const LH_GALLERY = 1000, LH_LAMP = 1100, LH_SHUTTER = 78; // px above its base / from its axis (world.mjs viken)
const LH_GAME = 1.37;                                   // the game draws it ×1.37; shutters and lamp are sized for that
// his size: on the gallery about as in the game (a little larger to read on a phone); on the sketch's islet larger
const KEEPER_SCALE = .21, KEEPER_SKETCH_SCALE = .18;

export function createOpeningCanvas(PIXI, { parent, texture, picture, waterY, bed = [], sample = () => null, lessMotion = false }) {
    const container = new PIXI.Container();
    container.label = 'opening-living-canvas';
    parent.addChild(container);
    const { x, w } = picture;
    const right = x + w, edge = Math.min(980, right + 194);
    const towerX = right + 140, towerBase = waterY - 38, lightY = towerBase - 48;
    // where he stands: on the lighthouse's gallery, or on the islet beside the sketch
    const place = {
        gallery: { x: towerX - 13, y: towerBase - LH_GALLERY * LH_SCALE, scale: KEEPER_SCALE },
        islet: { x: towerX - 23, y: towerBase - 2.5, scale: KEEPER_SKETCH_SCALE }
    };
    let at = place.islet;
    const landmarks = Object.freeze({
        tower: Object.freeze({ x: towerX, y: towerBase }),
        light: Object.freeze({ x: towerX + 8, y: lightY }),
        get keeper() { return { x: at.x, y: at.y }; },
        // his measuring hand (the 'point' pose): the ruler that folds the page starts here
        get hand() { return { x: at.x - 40 * 1.06 * at.scale, y: at.y - 112 * 1.06 * at.scale }; },
        shore: Object.freeze({ x: right + 74, y: waterY })
    });
    const ridge = new PIXI.Graphics(); ridge.label = 'opening-distant-steppe';
    const water = new PIXI.Graphics(); water.label = 'opening-sea-margin';
    const reeds = new PIXI.Graphics(); reeds.label = 'opening-kelp-window';
    const tower = new PIXI.Graphics(); tower.label = 'opening-distant-tower';
    const light = new PIXI.Graphics(); light.label = 'opening-measuring-light';
    const figure = new PIXI.Graphics(); figure.label = 'opening-distant-observer';
    const motion = new PIXI.Graphics(); motion.label = 'opening-water-breath';
    const sketch = new PIXI.Graphics(); sketch.label = 'opening-tower-sketch';
    const lighthouse = new PIXI.Container(); lighthouse.label = 'opening-lighthouse';
    const keeper = new PIXI.Container(); keeper.label = 'opening-keeper';
    container.addChild(ridge, water, reeds, light, tower, sketch, lighthouse, figure, keeper, motion);
    let lamp = null;
    let rig = null;
    const actor = { id: 'kv', visible: true, x: 0, y: 0, pose: 'stand', facing: -1, walk: null, pop: 0 };
    const random = n => { const a = Math.sin(n * 127.1 + 31.7) * 43758.5453; return a - Math.floor(a); };
    const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const mix = (a, b, t) => {
        const ch = s => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
        return (ch(16) << 16) | (ch(8) << 8) | ch(0);
    };
    const line = (g, pts, color, width = 1.3, alpha = .4) => {
        g.moveTo(...pts[0]);
        for (const p of pts.slice(1)) g.lineTo(...p);
        g.stroke({ color, width, alpha, cap: 'round', join: 'round' });
    };
    const paper = typeof texture === 'function' ? texture('mat-paper') : texture;

    // Low grassy folds to the left: a route inland, never a stripe through her
    // sky. Individual ochre and olive strokes carry the existing pencil grain.
    const ridgeY = waterY - 112;
    const ridgePoints = [[x + 1, ridgeY + 8], [x + 31, ridgeY - 2], [x + 62, ridgeY + 2],
        [x + 102, ridgeY - 15], [x + 138, ridgeY - 19], [x + 180, ridgeY - 10],
        [x + 226, ridgeY + 13], [x + 253, ridgeY + 25], [x + 1, ridgeY + 29]];
    ridge.poly(ridgePoints.flat()).fill({ color: 0xb1b486, alpha: .3 });
    line(ridge, ridgePoints.slice(0, -1), 0x798978, 1.3, .34);
    for (let i = 0; i < 78; i++) {
        const u = random(i + 1), px = x + 8 + u * 229;
        const top = ridgeY - 15 * Math.sin(u * Math.PI) + 5;
        const py = top + random(i + 90) * 16;
        line(ridge, [[px, py], [px + 9 + random(i + 200) * 13, py - 3]],
            i % 3 ? 0x81946e : 0xc3a35f, .8 + random(i + 350), .2);
    }
    for (let i = 0; i < 18; i++) {
        const px = x + 17 + i * 11.5, py = ridgeY + 4 + 8 * Math.sin(i * .6);
        line(ridge, [[px, py + 6], [px + 1, py], [px + 6, py - 5]], 0x777f5c, .9, .3);
    }

    // --- the seabed: the playable world's own bed, continued past its data -------
    const bedPts = bed.length > 1 ? bed.map(p => p.slice()) : [[right, waterY], [edge, waterY + 30]];
    if (bedPts[0][0] > right) bedPts.unshift([right, waterY]);
    // Beyond the shallows the shelf drops away: deep enough for kelp, which
    // hints at the forest below without drawing it.
    const shelfX = right + 118;
    const bedAt = (px) => {
        let y = bedPts.at(-1)[1];
        for (let i = 1; i < bedPts.length; i++) {
            const [ax, ay] = bedPts[i - 1], [bx, by] = bedPts[i];
            if (px <= bx) { y = ay + (by - ay) * Math.max(0, Math.min(1, (px - ax) / Math.max(1e-6, bx - ax))); break; }
        }
        return y + smooth(shelfX, edge - 6, px) * 34;
    };
    const depthAt = (px) => Math.max(0, bedAt(px) - waterY);

    // --- colours sampled from the picture's edge ------------------------------------
    const seaDeep = sample(right - 4, waterY - 8) ?? 0x6f97c4;
    const seaHigh = sample(right - 4, waterY - 150) ?? 0xa9c5dd;
    const sand = sample(right - 5, waterY + 30) ?? 0xc9a56b;
    const rowColor = (py) => sample(right - 4, py, 2) ?? mix(seaHigh, seaDeep, smooth(waterY - 150, waterY, py));

    // The painted sea above the waterline: rows from the edge, each reaching
    // less far the higher it is, so the margin fades as a soft rounded wash.
    // The reach wanders smoothly from row to row (never a comb of cut ends),
    // and every row thins out over several overlapping, lighter strokes.
    const seaTop = waterY - 158;
    const wander = (n) => Math.sin(n * .37) * 7 + Math.sin(n * .11 + 1.3) * 9 + (random(n + 7) - .5) * 5;
    for (let row = 0, py = seaTop; py < waterY - 1; row++, py += 3.4) {
        const k = (py - seaTop) / (waterY - seaTop);
        const reach = right + (edge - 18 - right) * (.3 + .7 * Math.sqrt(k)) + wander(row);
        const base = .92 * smooth(0, .32, k);
        if (base < .02 || reach < right + 6) continue;
        const color = rowColor(py), a = right - 1.5, len = reach - a;
        const tilt = (random(row + 31) - .5) * 1.4;
        // a lighter stroke laps back over the picture's edge, so no seam shows
        water.moveTo(right - 9, py).lineTo(right + 2, py).stroke({ color, width: 3.6, alpha: base * .4, cap: 'round' });
        for (const [f0, f1, alpha, width] of [[0, .5, 1, 4.2], [.42, .7, .72, 4], [.62, .84, .46, 3.6], [.78, .94, .26, 3.2], [.9, 1, .12, 2.6]]) {
            const s0 = a + len * f0, s1 = a + len * f1;
            water.moveTo(s0, py + tilt * f0).lineTo(s1, py + tilt * f1)
                .stroke({ color, width, alpha: base * alpha, cap: 'round' });
        }
        // a darker or paler pencil stroke inside the row: her directional grain
        if (row % 2 === 0) {
            const g0 = right + random(row + 60) * (reach - right) * .5, g1 = g0 + 18 + random(row + 90) * 40;
            if (g1 < reach - 4) water.moveTo(g0, py + .8).lineTo(g1, py + .2)
                .stroke({ color: mix(color, row % 4 ? 0x2d5e93 : 0xffffff, .28), width: 1, alpha: base * .45, cap: 'round' });
        }
    }

    // Under the waterline: a thin wedge of water over the continuing bed,
    // then the picture's sand, both losing pressure towards the blank paper.
    const fadeX = edge - 12;
    for (let row = 0, py = waterY + 1; py < waterY + 96; row++, py += 3.2) {
        // where this row meets the bed
        let xb = fadeX;
        for (let px = right; px <= fadeX; px += 3) if (bedAt(px) >= py) { xb = px; break; }
        const sandAlpha = .88 * (1 - smooth(waterY + 8, waterY + 90, py));
        if (xb > right + 1 && sandAlpha > .02) {
            const s1 = Math.min(xb, right + (fadeX - right) * (1 - smooth(waterY + 10, waterY + 96, py) * .75));
            const mid = right + (s1 - right) * .6;
            const col = sample(right - 5, Math.min(py, waterY + 80), 2) ?? sand;
            water.moveTo(right - 1.5, py).lineTo(mid, py).stroke({ color: col, width: 3.8, alpha: sandAlpha, cap: 'round' });
            water.moveTo(mid - 5, py).lineTo(s1, py).stroke({ color: col, width: 3.8, alpha: sandAlpha * .45, cap: 'round' });
        }
        if (xb < fadeX - 4) {
            const reach = fadeX - random(row + 150) * 22;
            const wa = .5 * (1 - smooth(waterY + 20, waterY + 70, py));
            if (wa > .02) water.moveTo(xb, py).lineTo(reach, py)
                .stroke({ color: mix(seaDeep, 0x9fc8c8, .25), width: 3.6, alpha: wa, cap: 'round' });
        }
    }
    // the bed's own graphite line, continuing the picture's beach line
    for (let i = 0, px = right - 2; px < fadeX; i++, px += 14) {
        const nx = Math.min(fadeX, px + 16);
        line(water, [[px, bedAt(px) + .5], [nx, bedAt(nx) + .5]], 0x4b463f, 2.2, .75 * (1 - smooth(right + 60, fadeX, px)));
    }

    // Kelp rooted on the shelf, never reaching the sea's surface line.
    for (let i = 0; i < 6; i++) {
        const px = shelfX - 8 + i * 12 + random(i + 680) * 6, base = bedAt(px);
        const tall = Math.min(depthAt(px) - 5, 16 + random(i + 690) * 22);
        if (tall < 8) continue;
        reeds.moveTo(px, base).bezierCurveTo(px - 6, base - tall * .35, px + 8, base - tall * .7, px + 2, base - tall)
            .stroke({ width: 2.2, color: i % 2 ? 0x748e78 : 0x3e7c79, alpha: .55, cap: 'round' });
        for (let j = 0; j < 2; j++) {
            const py = base - 6 - j * tall * .3, side = j % 2 ? 1 : -1;
            reeds.moveTo(px, py).quadraticCurveTo(px + side * 8, py - 4, px + side * 6, py - 9)
                .stroke({ width: 2.2, color: 0x608976, alpha: .42, cap: 'round' });
        }
    }

    // The islet, and its reflection: broken pale strokes under it.
    const base = towerBase, roof = lightY - 17;
    const islet = [[towerX - 46, base + 4], [towerX - 34, base - 3], [towerX - 12, base - 7], [towerX + 14, base - 6],
        [towerX + 34, base - 2], [towerX + 47, base + 4]];
    tower.poly(islet.flat()).fill({ color: 0x9d998f, alpha: .75 });
    line(tower, islet, 0x5d574f, 1.3, .7);
    for (let i = 0; i < 6; i++) line(tower, [[towerX - 38 + i * 14, base - 1], [towerX - 33 + i * 14, base - 4]], 0x6e6960, .8, .45);
    for (let i = 0; i < 4; i++) {
        const ry = base + 6 + i * 3.4, half = 40 - i * 7;
        line(tower, [[towerX - half, ry], [towerX - half * .2, ry]], 0xeef4f8, 1.2, .55 - i * .1);
        line(tower, [[towerX + half * .15, ry + .4], [towerX + half, ry + .4]], 0x5f7f97, 1, .32 - i * .06);
    }
    // The stand-in: a small folded-paper tower, two faces and sparse diagonal grain.
    sketch.poly([towerX - 15, base - 3, towerX - 11, roof + 17, towerX + 9, roof + 17,
        towerX + 15, base - 3]).fill(paper ? { texture: paper, textureSpace: 'global' } : { color: 0xf8f0da });
    sketch.poly([towerX + 1, roof + 17, towerX + 9, roof + 17, towerX + 15, base - 3,
        towerX + 3, base - 3]).fill({ color: 0x89909a, alpha: .24 });
    line(sketch, [[towerX - 15, base - 3], [towerX - 11, roof + 17], [towerX + 9, roof + 17], [towerX + 15, base - 3]], 0x766d61, 1.5, .66);
    line(sketch, [[towerX + 1, roof + 17], [towerX + 3, base - 3]], 0x9d9280, 1, .5);
    sketch.poly([towerX - 15, roof + 18, towerX - 8, roof + 8, towerX + 1, roof,
        towerX + 8, roof + 9, towerX + 15, roof + 18]).fill({ color: 0xd9c897, alpha: .85 });
    line(sketch, [[towerX - 15, roof + 18], [towerX + 1, roof], [towerX + 15, roof + 18]], 0x796f64, 1.3, .7);
    sketch.rect(towerX - 8, lightY - 3, 15, 10).fill({ color: 0x5b747a, alpha: .75 });
    for (let i = 0; i < 6; i++) line(sketch, [[towerX - 9 + i % 2 * 3, base - 7 - i * 5],
        [towerX - 4 + i % 2 * 3, base - 10 - i * 5]], 0x9e967c, .8, .33);
    /** The game's own lighthouse, once its art is here: shutters open, lamp alight. */
    function buildLighthouse() {
        const art = texture?.('lighthouse');
        if (!art) return false;
        const k = LH_SCALE / LH_GAME, lampY = base - LH_LAMP * LH_SCALE;
        const body = new PIXI.Sprite(art); body.anchor.set(.5, 1); body.scale.set(LH_SCALE); body.position.set(towerX, base + 1);
        lighthouse.addChild(body);
        for (const dx of [-LH_SHUTTER, 0, LH_SHUTTER]) {
            const shutter = texture('shutter-open');
            if (!shutter) continue;
            const sh = new PIXI.Sprite(shutter); sh.anchor.set(.5); sh.scale.set(k); sh.position.set(towerX + dx * LH_SCALE, lampY);
            lighthouse.addChild(sh);
        }
        if (texture('lamp-lit')) {
            lamp = new PIXI.Sprite(texture('lamp-lit')); lamp.anchor.set(.5); lamp.scale.set(k); lamp.position.set(towerX, lampY);
            lighthouse.addChild(lamp);
        }
        sketch.visible = false;
        at = place.gallery;
        return true;
    }

    let measure = 0, lastTime = null, waterTime = 0, aliveAmount = 0, dead = false;
    function setMeasure(progress) { measure = Math.max(0, Math.min(1, progress)); }
    function setKeeper(pose) { actor.pose = pose; }
    function update({ time = 0, alive = true, frozen = false } = {}) {
        if (dead) return;
        const aliveValue = typeof alive === 'number' ? alive : alive ? 1 : 0;
        const reduced = typeof lessMotion === 'function' ? lessMotion() : lessMotion;
        aliveAmount = Math.max(0, Math.min(1, aliveValue));
        const dt = lastTime === null ? 0 : Math.max(0, Math.min(.1, time - lastTime));
        lastTime = time;
        if (!frozen && aliveAmount > 0) waterTime += dt * aliveAmount;
        container.alpha = .58 + aliveAmount * .42;
        ridge.alpha = .75 + aliveAmount * .25;
        const sway = reduced ? 0 : Math.sin(time * .65) * 1.1 * aliveAmount;
        reeds.skew.x = sway * .002;
        light.clear(); figure.clear(); motion.clear();
        // He lifts his ruler: a brief reflected line settles on the new shore.
        // This is reflected daylight, not the lighthouse's dormant lamp.
        const drift = reduced || frozen ? 0 : Math.sin(waterTime * .35) * 10;
        const endX = right + 10 + (landmarks.shore.x - right - 10) * measure;
        const endY = lightY + 31 + (waterY - lightY - 31) * measure + drift * (1 - measure);
        const hand = landmarks.hand;
        light.poly([hand.x, hand.y, endX, endY - 3, endX - 3, endY + 3])
            .fill({ color: 0xffefd1, alpha: .14 * measure * aliveAmount });
        line(light, [[hand.x, hand.y], [endX, endY]], 0xfff4d6, 1.8, .66 * measure * aliveAmount);
        // Kartväktaren by his tower: the real paper rig once its art is here,
        // otherwise a small pencil stand-in in the same place and pose.
        if (sketch.visible) buildLighthouse();
        if (lamp) lamp.alpha = .82 + (reduced ? 0 : Math.sin(time * 1.6) * .08) * aliveAmount;
        if (!rig && texture?.('kv-part-coat')) { rig = createGuardian(PIXI, { texture }); keeper.addChild(rig.container); }
        const fright = actor.pose === 'worry' && !frozen && !reduced;
        keeper.position.set(at.x + (fright ? Math.sin(time * 38) * .45 : 0), at.y); keeper.scale.set(at.scale);
        const keeperX = at.x, keeperY = at.y;
        if (rig) rig.update(actor, { time, dt: dt || 1 / 60, reducedMotion: reduced, figure: true });
        else {
            const up = actor.pose === 'worry' ? 1 : 0, reach = actor.pose === 'point' ? 1 : 0;
            figure.circle(keeperX, keeperY - 21, 2.8).fill({ color: 0xf1ead8 }).stroke({ color: 0x6d6a60, width: .9 });
            figure.poly([keeperX - 3, keeperY - 18, keeperX + 3, keeperY - 18, keeperX + 5, keeperY - 7, keeperX - 5, keeperY - 7])
                .fill({ color: 0xe6dfcb }).stroke({ color: 0x6d6a60, width: .8 });
            line(figure, [[keeperX - 2, keeperY - 7], [keeperX - 2, keeperY]], 0x6d6a60, 1, .8);
            line(figure, [[keeperX + 2, keeperY - 7], [keeperX + 2, keeperY]], 0x6d6a60, 1, .8);
            line(figure, [[keeperX - 3, keeperY - 16], [keeperX - 6 - reach * 2, keeperY - 13 - reach * 5 - up * 8]], 0x6d6a60, 1, .8);
            line(figure, [[keeperX + 3, keeperY - 16], [keeperX + 5, keeperY - 12 - up * 9]], 0x6d6a60, 1, .8);
            if (actor.pose !== 'fold') line(figure, [[keeperX - 13, keeperY - 17 - reach * 4], [keeperX - 3, keeperY - 19 - reach * 4]], 0x8e7851, 1.4, .85);
        }
        // Surface glints stop with the wave. The tiny current UNDER them keeps
        // drifting: an observable clue that hiding below the surface can help.
        for (let i = 0; i < 5; i++) {
            const gx = right + 14 + i * 27 + Math.sin(waterTime * .6 + i) * (reduced ? 0 : 3);
            const gy = waterY - 12 - i % 3 * 16;
            line(motion, [[gx, gy], [gx + 9 + Math.sin(waterTime + i) * 2, gy - .6]], 0xfff8dc, 1.4, .45 * aliveAmount);
        }
        for (let i = 0; i < 3; i++) {
            const u = reduced ? i / 3 : (time * .027 * aliveAmount + i / 3) % 1;
            const px = shelfX - 30 + u * 80, py = waterY + Math.max(4, depthAt(px) * .55) + Math.sin(u * Math.PI * 2) * 2;
            motion.moveTo(px - 5, py).quadraticCurveTo(px, py - 2, px + 6, py - 1)
                .stroke({ width: 1.2, color: 0xf8eed1, alpha: .6 * aliveAmount * smooth(0, 8, depthAt(px)), cap: 'round' });
        }
    }
    update({ alive: false });
    return { container, landmarks, update, setMeasure, setKeeper, get keeperPose() { return actor.pose; }, destroy() {
        if (dead) return;
        dead = true; container.destroy({ children: true });
    } };
}
