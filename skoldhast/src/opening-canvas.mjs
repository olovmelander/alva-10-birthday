/* A few distant, connected places in Alva's opening picture. The near beach,
 * sun, cloud outlines and lettering remain the authored scene. Everything here
 * is pencil geometry on that same sheet, so it disappears UNDER its first fold.
 * No filters, generated textures or independent render loop. */
export function createOpeningCanvas(PIXI, { parent, texture, picture, waterY, lessMotion = false }) {
    const container = new PIXI.Container();
    container.label = 'opening-living-canvas';
    parent.addChild(container);
    const { x, w } = picture;
    const right = x + w, edge = Math.min(980, right + 194);
    const towerX = right + 140, lightY = waterY - 82;
    const landmarks = Object.freeze({
        tower: Object.freeze({ x: towerX, y: waterY - 34 }),
        light: Object.freeze({ x: towerX + 8, y: lightY }),
        shore: Object.freeze({ x: right + 74, y: waterY })
    });
    const ridge = new PIXI.Graphics(); ridge.label = 'opening-distant-steppe';
    const water = new PIXI.Graphics(); water.label = 'opening-sea-margin';
    const reeds = new PIXI.Graphics(); reeds.label = 'opening-kelp-window';
    const tower = new PIXI.Graphics(); tower.label = 'opening-distant-tower';
    const light = new PIXI.Graphics(); light.label = 'opening-measuring-light';
    const figure = new PIXI.Graphics(); figure.label = 'opening-distant-observer';
    const motion = new PIXI.Graphics(); motion.label = 'opening-water-breath';
    container.addChild(ridge, water, reeds, light, tower, figure, motion);
    const random = n => { const a = Math.sin(n * 127.1 + 31.7) * 43758.5453; return a - Math.floor(a); };
    const line = (g, pts, color, width = 1.3, alpha = .4) => {
        g.moveTo(...pts[0]);
        for (const p of pts.slice(1)) g.lineTo(...p);
        g.stroke({ color, width, alpha, cap: 'round', join: 'round' });
    };
    const paper = typeof texture === 'function' ? texture('mat-paper') : texture;

    // Low grassy folds to the left: a route inland, never a stripe through her
    // sky. Individual ochre and olive strokes carry the existing pencil grain.
    const ridgeY = waterY - 119;
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

    // The blue pencils run beyond the original picture, softly losing pressure
    // in the blank margin. The fold later takes this actual painted sea away.
    for (let band = 0; band < 21; band++) {
        const py = waterY - 105 + band * 6.5;
        const reach = edge - 7 - random(band + 411) * 13;
        const first = right - 3 + random(band + 420) * 4;
        water.poly([first, py, reach - 9, py - 1, reach, py + 3,
            reach - 5, py + 7, first, py + 7]).fill({ color: band < 12 ? 0x92b7c0 : 0x809faf, alpha: .28 });
        for (let j = 0; j < 4; j++) {
            const sy = py + j * 1.7;
            line(water, [[first - 22 - random(band * 4 + j + 440) * 21, sy],
                [reach - random(band * 4 + j + 440) * 21, sy - 1]],
                j === 0 ? 0x56899f : 0x84a8b3, .8, j === 0 ? .3 : .23);
        }
    }
    // A white-paper patch catches a submerged current. Kelp stays below the
    // lettering and outside the horse's silhouette, with no new horizon line.
    const kelpBase = waterY + 26;
    for (let i = 0; i < 7; i++) {
        const px = right + 24 + i * 15, tall = 20 + random(i + 690) * 28;
        reeds.moveTo(px, kelpBase).bezierCurveTo(px - 7, kelpBase - tall * .35,
            px + 10, kelpBase - tall * .72, px + 2, kelpBase - tall)
            .stroke({ width: 2.3, color: i % 2 ? 0x748e78 : 0x3e7c79, alpha: .5, cap: 'round' });
        for (let j = 0; j < 3; j++) {
            const py = kelpBase - 7 - j * tall * .2, side = j % 2 ? 1 : -1;
            reeds.moveTo(px, py).quadraticCurveTo(px + side * 10, py - 5,
                px + side * 8, py - 11).stroke({ width: 2.5, color: 0x608976, alpha: .4, cap: 'round' });
        }
    }

    // A folded-paper tower, far enough away that its inhabitant is a question.
    // Two faces and sparse diagonal grain, not an icon floating above the sea.
    const base = landmarks.tower.y, roof = lightY - 17;
    tower.poly([towerX - 19, base + 2, towerX - 13, roof + 17, towerX + 11, roof + 17,
        towerX + 19, base + 2]).fill(paper ? { texture: paper, textureSpace: 'global' } : { color: 0xf8f0da });
    tower.poly([towerX + 1, roof + 17, towerX + 11, roof + 17, towerX + 19, base + 2,
        towerX + 3, base + 2]).fill({ color: 0x89909a, alpha: .24 });
    line(tower, [[towerX - 19, base], [towerX - 13, roof + 17], [towerX + 11, roof + 17], [towerX + 19, base]], 0x766d61, 1.5, .66);
    line(tower, [[towerX + 1, roof + 17], [towerX + 3, base]], 0x9d9280, 1, .5);
    tower.poly([towerX - 17, roof + 18, towerX - 9, roof + 8, towerX + 1, roof,
        towerX + 9, roof + 9, towerX + 17, roof + 18]).fill({ color: 0xd9c897, alpha: .85 });
    line(tower, [[towerX - 17, roof + 18], [towerX + 1, roof], [towerX + 17, roof + 18]], 0x796f64, 1.3, .7);
    tower.rect(towerX - 9, lightY - 3, 17, 10).fill({ color: 0x5b747a, alpha: .75 });
    // Its lamp is still dark. The short reflection below belongs to a ruler;
    // the lighthouse itself cannot be lit until its later puzzle is solved.
    tower.rect(towerX - 7, lightY - 1, 13, 6).fill({ color: 0x93a0a1, alpha: .19 });
    for (let i = 0; i < 7; i++) line(tower, [[towerX - 11 + i % 2 * 3, base - 4 - i * 4],
        [towerX - 5 + i % 2 * 3, base - 7 - i * 4]], 0x9e967c, .8, .33);
    line(tower, [[towerX - 28, base + 4], [towerX - 16, base + 1], [towerX + 17, base + 1], [towerX + 30, base + 5]], 0x587e87, 1.6, .35);

    let measure = 0, lastTime = null, waterTime = 0, aliveAmount = 0, dead = false;
    function setMeasure(progress) { measure = Math.max(0, Math.min(1, progress)); }
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
        // The figure lifts a ruler: a brief reflected line settles on the new
        // shore. This is reflected daylight, not the lighthouse's dormant lamp.
        const drift = reduced || frozen ? 0 : Math.sin(waterTime * .35) * 10;
        const endX = right + 10 + (landmarks.shore.x - right - 10) * measure;
        const endY = lightY + 31 + (waterY - lightY - 31) * measure + drift * (1 - measure);
        light.poly([landmarks.light.x, lightY, endX, endY - 3, endX - 3, endY + 3])
            .fill({ color: 0xffefd1, alpha: .14 * measure * aliveAmount });
        line(light, [[landmarks.light.x, lightY], [endX, endY]], 0xfff4d6, 1.8, .66 * measure * aliveAmount);
        // An anonymous head, folded shoulders and measuring arm: no face,
        // expression or motive is supplied before the later story discovery.
        const figureX = towerX, figureY = lightY + 5;
        figure.circle(figureX, figureY - 7, 2.4).fill({ color: 0x6d726b, alpha: .8 });
        figure.poly([figureX - 3, figureY - 4, figureX + 3, figureY - 4,
            figureX + 5, figureY + 7, figureX - 5, figureY + 7]).fill({ color: 0x959483, alpha: .8 });
        line(figure, [[figureX + 1, figureY - 1], [figureX + 8, figureY - 2 - measure * 4]], 0x6b756d, 1.5, .8);
        line(figure, [[figureX + 4, figureY - 5 - measure * 4], [figureX + 14, figureY - 3 - measure * 4]], 0x8e7851, 1.6, .85);
        // Surface glints stop with the wave. The tiny current UNDER them keeps
        // drifting: an observable clue that hiding below the surface can help.
        for (let i = 0; i < 5; i++) {
            const gx = right + 14 + i * 31 + Math.sin(waterTime * .6 + i) * (reduced ? 0 : 3);
            const gy = waterY - 49 + i % 3 * 18;
            line(motion, [[gx, gy], [gx + 9 + Math.sin(waterTime + i) * 2, gy - .6]], 0xfff8dc, 1.4, .45 * aliveAmount);
        }
        for (let i = 0; i < 3; i++) {
            const u = reduced ? i / 3 : (time * .027 * aliveAmount + i / 3) % 1;
            const px = right + 11 + u * 109, py = waterY + 9 + Math.sin(u * Math.PI * 2) * 4;
            motion.moveTo(px - 5, py).quadraticCurveTo(px, py - 2, px + 6, py - 1)
                .stroke({ width: 1.2, color: 0xf8eed1, alpha: .6 * aliveAmount, cap: 'round' });
        }
    }
    update({ alive: false });
    return { container, landmarks, update, setMeasure, destroy() {
        if (dead) return;
        dead = true; container.destroy({ children: true });
    } };
}
