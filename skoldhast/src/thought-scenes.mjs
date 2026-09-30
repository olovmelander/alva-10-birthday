/*
 * The pictures inside Alva's thought bubbles, made from the game's own art so
 * they look like the places the player will visit: the steppe gallop and the
 * kelp forest are small live scenes in world units (the same textures, props,
 * pencil outline and the real sköldhäst rig), the turtle-or-horse question is
 * Signe racing past Klo's signs, and the researcher is a lens over hoofprints.
 *
 *   createThoughtScene(PIXI, kind, { texture, makeHero, rx, ry, reducedMotion })
 *     → { container, update(dt), destroy() } | null (art not loaded yet)
 *
 * Everything is centred on (0, 0) and clipped by the caller to its cloud.
 */
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { const p = clamp01(v); return p * p * (3 - 2 * p); };
const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const INK = 0x3b3530;
const GALLOP = 1200; // world units per second, as in the game (sim.mjs)

export const THOUGHT_ART = {
    steppe: ['bg-steppe', 'mat-grass', 'stroke-graphite', 'feathergrass-1', 'backsippa'],
    kelp: ['bg-under', 'mat-seabed', 'kelp-strip', 'stroke-graphite'],
    mystery: ['bg-beach', 'turtle-signe', 'sign-skoldpadda', 'sign-hast', 'hoofprint', 'klo-part-watch', 'mat-sand'],
    researcher: ['hoofprint', 'mat-sand', 'klo-part-book', 'klo-peek']
};

export function createThoughtScene(PIXI, kind, { texture, makeHero, rx, ry, reducedMotion = false }) {
    const T = (name) => (typeof texture === 'function' ? texture(name) : null) || null;
    if (!THOUGHT_ART[kind] || THOUGHT_ART[kind].some(name => !T(name))) return null;
    const still = () => (typeof reducedMotion === 'function' ? !!reducedMotion() : !!reducedMotion);
    const container = new PIXI.Container();
    container.label = 'thought-scene-' + kind;
    const sprite = (name, ax, ay) => {
        const t = T(name), s = new PIXI.Sprite(t);
        if (ax !== undefined) s.anchor.set(ax, ay); else if (t.defaultAnchor) s.anchor.set(t.defaultAnchor.x, t.defaultAnchor.y); else s.anchor.set(.5, 1);
        return s;
    };
    const cover = (name) => {
        const s = sprite(name, .5, .5), t = T(name);
        s.scale.set(Math.max(rx * 2.3 / t.width, ry * 2.3 / t.height));
        container.addChild(s);
        return s;
    };
    const heroes = [];
    const makeRig = () => { const h = makeHero?.(); if (h) heroes.push(h); return h; };
    let time = 0, update = () => {}, cleanup = () => {};

    if (kind === 'steppe' || kind === 'kelp') {
        // --- a little piece of the game world, in world units -----------------------------
        const steppe = kind === 'steppe';
        const sc = (ry * 2 * (steppe ? .5 : .44)) / 330; // the sköldhäst is about half the bubble
        cover(steppe ? 'bg-steppe' : 'bg-under');
        const world = new PIXI.Container();
        world.scale.set(sc);
        container.addChild(world);
        const halfW = rx * 1.15 / sc, halfH = ry * 1.15 / sc;
        // ground: rolling steppe, or a gentle sea floor
        const ground = steppe ? (x) => 38 * Math.sin(x / 900) + 16 * Math.sin(x / 330 + 1)
            : (x) => 14 * Math.sin(x / 520) + 8 * Math.sin(x / 170);
        const fillTex = T(steppe ? 'mat-grass' : 'mat-seabed');
        const soil = new PIXI.TilingSprite({ texture: fillTex, width: halfW * 4, height: halfH * 3 });
        const soilMask = new PIXI.Graphics();
        soil.mask = soilMask;
        const back = new PIXI.Container(), front = new PIXI.Container();
        const N = 36;
        const edge = Array.from({ length: N + 1 }, () => new PIXI.Point());
        const rope = new PIXI.MeshRope({ texture: T('stroke-graphite'), points: edge, textureScale: 0 });
        const outline = new PIXI.Graphics();
        world.addChild(back, soil, soilMask, rope, outline);
        let cam = 0, heroX = 0, camY = 0;
        function drawGround() {
            const x0 = cam - halfW, x1 = cam + halfW;
            soilMask.clear().moveTo(x0, ground(x0));
            for (let i = 0; i <= N; i++) {
                const x = x0 + (x1 - x0) * i / N, y = ground(x);
                soilMask.lineTo(x, y);
                edge[i].set(x, y);
            }
            soilMask.lineTo(x1, halfH * 3).lineTo(x0, halfH * 3).closePath().fill(0xffffff);
            outline.clear().moveTo(edge[0].x, edge[0].y);
            for (let i = 1; i <= N; i++) outline.lineTo(edge[i].x, edge[i].y);
            outline.stroke({ width: 3.2 / sc, color: INK, alpha: .8, join: 'round', cap: 'round' });
            soil.position.set(x0, -halfH);
            soil.tilePosition.set(-x0, halfH);
        }
        const hero = makeRig();

        if (steppe) {
            // her steppe: feather grass, pasque flowers, tussocks and boulders rushing past
            const kinds = ['feathergrass-1', 'feathergrass-2', 'feathergrass-3', 'feathergrass-4', 'backsippa', 'feathergrass-3', 'boulder', 'feathergrass-2'];
            const spacing = 260;
            const props = Array.from({ length: Math.ceil(halfW * 2 / spacing) + 3 }, () => { const s = new PIXI.Sprite(); s.anchor.set(.5, 1); back.addChild(s); return s; });
            const nearProps = Array.from({ length: Math.ceil(halfW * 2 / 520) + 3 }, () => { const s = new PIXI.Sprite(); s.anchor.set(.5, 1); front.addChild(s); return s; });
            const dust = Array.from({ length: 10 }, () => { const s = new PIXI.Sprite(T('p-dust') || T('p-sand')); s.anchor.set(.5); s.visible = false; front.addChild(s); return { s, age: 9 }; });
            let dustAt = 0, dustIndex = 0;
            if (hero) world.addChild(hero.view);
            world.addChild(front);
            const place = (pool, step, seed, scaleRange) => {
                const k0 = Math.floor((cam - halfW) / step) - 1;
                pool.forEach((s, i) => {
                    const k = k0 + i, name = kinds[Math.floor(hash(k * 3.1 + seed) * kinds.length)];
                    const t = T(name);
                    s.visible = !!t;
                    if (!t) return;
                    if (s.texture !== t) { s.texture = t; if (t.defaultAnchor) s.anchor.set(t.defaultAnchor.x, t.defaultAnchor.y); }
                    const x = k * step + hash(k + seed) * step * .6;
                    s.position.set(x, ground(x) + 6);
                    s.scale.set(scaleRange[0] + hash(k * 7 + seed) * (scaleRange[1] - scaleRange[0]));
                    s.rotation = still() ? 0 : Math.sin(time * .9 + k) * .04;
                });
            };
            update = (dt) => {
                const speed = still() ? 0 : GALLOP;
                heroX += speed * dt;
                cam = heroX + halfW * .12;
                camY += ((ground(heroX) - 90) - camY) * (1 - Math.exp(-4 * dt));
                world.position.set(-cam * sc, -camY * sc + ry * .12);
                drawGround();
                place(props, spacing, 11, [.9, 1.3]);
                place(nearProps, 520, 57, [1.3, 1.8]);
                if (hero) {
                    hero.view.position.set(heroX, ground(heroX));
                    hero.update(dt, { x: heroX, y: ground(heroX), vx: speed, vy: 0, facing: 1, gait: speed ? 'gallop' : 'stand',
                        mode: 'ground', speed, time, hide: 0, groundAt: ground });
                }
                // dust kicked up by the hooves, left behind on the grass
                if (speed && (dustAt -= dt) <= 0) {
                    dustAt = .09;
                    const d = dust[dustIndex++ % dust.length];
                    d.age = 0; d.x = heroX - 60 - Math.random() * 40; d.y = ground(heroX) - 6;
                }
                for (const d of dust) {
                    d.age += dt;
                    d.s.visible = d.age < .7;
                    if (!d.s.visible) continue;
                    d.s.position.set(d.x - d.age * 90, d.y - d.age * 50);
                    d.s.scale.set(2.4 + d.age * 3);
                    d.s.alpha = .7 * (1 - d.age / .7);
                    d.s.tint = 0xc9b58a;
                }
            };
        } else {
            // the kelp forest: swaying fronds, drifting fish, rising bubbles, light from above
            const rays = new PIXI.Graphics();
            back.addChild(rays);
            const kelpTex = T('kelp-strip');
            const fronds = [];
            const makeFrond = (x, H, width, layer, phase) => {
                const n = 10;
                const positions = new Float32Array((n + 1) * 4), uvs = new Float32Array((n + 1) * 4), indices = new Uint32Array(n * 6);
                for (let i = 0; i <= n; i++) {
                    const v = i / n;
                    uvs.set([0, v, 1, v], i * 4);
                    if (i < n) indices.set([i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2], i * 6);
                }
                const mesh = new PIXI.Mesh({ geometry: new PIXI.MeshGeometry({ positions, uvs, indices }), texture: kelpTex });
                layer.addChild(mesh);
                fronds.push({ mesh, positions, n, x, H, width, phase, fy: ground(x) + 4 });
            };
            for (let i = 0; i < 8; i++) makeFrond(-halfW + (i + .5) * halfW * 2 / 8 + (hash(i) - .5) * 60, 420 + hash(i + 9) * 380, 58 + hash(i + 3) * 30, back, i * 1.7);
            const bed = T('kelp-bed');
            if (bed) for (const x of [-halfW * .55, halfW * .45]) { const s = sprite('kelp-bed'); s.position.set(x, ground(x) + 10); s.scale.set(.9); back.addChild(s); }
            for (const [name, x] of [['seabed-rock-1', -halfW * .8], ['seabed-rock-2', halfW * .75], ['shell-under', halfW * .2]]) {
                if (!T(name)) continue;
                const s = sprite(name); s.position.set(x, ground(x) + 8); s.scale.set(.8); back.addChild(s);
            }
            const fish = ['fish-1', 'fish-2', 'lyktfisk-1'].filter(n => T(n)).map((name, i) => {
                const s = sprite(name, .5, .5); s.scale.set(1.3 - i * .2); back.addChild(s);
                return { s, y: -halfH * (.55 - i * .22), speed: 70 + i * 35, phase: hash(i + 30) };
            });
            if (hero) world.addChild(hero.view);
            world.addChild(front);
            for (let i = 0; i < 3; i++) makeFrond(-halfW * .75 + i * halfW * .8 + hash(i + 40) * 80, 380 + hash(i + 41) * 260, 70, front, 4 + i);
            for (const f of fronds.slice(-3)) f.mesh.alpha = .6; // as in the game, the sköldhäst shows through the front fronds
            const bubbles = Array.from({ length: 9 }, (_, i) => { const s = sprite('p-bubble', .5, .5); s.scale.set(1 + hash(i) * 1.2); front.addChild(s); return { s, x: -halfW + hash(i + 50) * halfW * 2, phase: hash(i + 60) }; });
            update = (dt) => {
                const t = still() ? 0 : time;
                cam = 0; camY = -halfH * .45;
                world.position.set(0, -camY * sc - ry * .02);
                drawGround();
                rays.clear();
                for (let i = 0; i < 3; i++) {
                    const x = -halfW * .7 + i * halfW * .7 + Math.sin(t * .3 + i) * 30;
                    rays.poly([x - 30, -halfH * 2, x + 30, -halfH * 2, x + 170, halfH, x + 60, halfH]).fill({ color: 0xfffce5, alpha: .07 });
                }
                for (const f of fronds) {
                    const pts = [];
                    for (let i = 0; i <= f.n; i++) {
                        const u = 1 - i / f.n; // 1 at the top
                        pts.push([f.x + Math.sin(t * .9 + f.phase + u * 2.2) * 38 * u * u + Math.sin(t * .37 + f.phase) * 12 * u, f.fy - f.H * u]);
                    }
                    for (let i = 0; i <= f.n; i++) {
                        const [x, y] = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(f.n, i + 1)];
                        let tx = b[0] - a[0], ty = b[1] - a[1];
                        const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
                        const nx = -ty * f.width / 2, ny = tx * f.width / 2;
                        f.positions.set([x + nx, y + ny, x - nx, y - ny], i * 4);
                    }
                    f.mesh.geometry.getBuffer('aPosition').update();
                }
                for (const f of fish) {
                    const span = halfW * 2.6, x = ((f.phase * span + t * f.speed) % span) - span / 2;
                    f.s.position.set(x, f.y + Math.sin(t * 1.3 + f.phase * 6) * 12);
                }
                for (const b of bubbles) {
                    const u = still() ? b.phase : (t * .18 + b.phase) % 1;
                    b.s.position.set(b.x + Math.sin(u * 9) * 10, ground(b.x) - u * halfH * 2.2);
                    b.s.alpha = .8 * Math.sin(Math.PI * u);
                }
                if (hero) {
                    // hiding under its shell among the kelp, now and then peeking out
                    const hide = still() ? 1 : 1 - .45 * ease((Math.sin(t * .8) - .6) / .4);
                    hero.view.position.set(-halfW * .05, ground(-halfW * .05));
                    hero.update(dt, { x: -halfW * .05, y: ground(-halfW * .05), vx: 0, vy: 0, facing: 1, gait: 'stand', mode: 'ground', speed: 0,
                        time, hide, groundAt: ground });
                    hero.view.tint = 0xd8e6e6;
                }
            };
        }
        update(0);
    } else if (kind === 'mystery') {
        // world's fastest turtle, or world's slowest horse? Signe races past Klo's
        // SKÖLDPADDA sign, hoofprints creep past his "häst" sign, the stopwatch ticks.
        cover('bg-beach'); // her beach, where Signe races in the game
        const groundY = ry * .36;
        const sand = new PIXI.TilingSprite({ texture: T('mat-sand'), width: rx * 2.4, height: ry });
        sand.position.set(-rx * 1.2, groundY); sand.tileScale.set(.5);
        const line = new PIXI.Graphics().moveTo(-rx * 1.2, groundY).lineTo(rx * 1.2, groundY).stroke({ width: 2.4, color: INK, alpha: .85 });
        const split = new PIXI.Graphics();
        for (let y = -ry * .25; y < ry; y += 10) split.moveTo(0, y).lineTo(0, y + 5);
        split.stroke({ width: 1.6, color: INK, alpha: .35 });
        container.addChild(sand, line, split);
        const signH = ry * .64;
        const sign = (name, x) => { const s = sprite(name); s.scale.set(signH / T(name).height); s.position.set(x, groundY + 3); container.addChild(s); return s; };
        sign('sign-skoldpadda', -rx * .52);
        sign('sign-hast', rx * .52);
        const turtle = sprite('turtle-signe', .5, 1);
        turtle.scale.set(rx * .42 / T('turtle-signe').width);
        const speedLines = new PIXI.Graphics();
        container.addChild(speedLines, turtle);
        const printTex = T('hoofprint-graphite') ? 'hoofprint-graphite' : 'hoofprint';
        const prints = Array.from({ length: 5 }, (_, i) => {
            const s = sprite(printTex, .5, .5); s.scale.set(ry * .2 / 42, ry * .12 / 42);
            s.position.set(rx * (.16 + i * .16), groundY + ry * .16 + (i % 2) * ry * .12); s.alpha = 0;
            container.addChild(s);
            return s;
        });
        const watch = sprite('klo-part-watch', .5, .5);
        watch.scale.set(ry * .36 / T('klo-part-watch').height);
        watch.position.set(0, -ry * .02);
        const hand = new PIXI.Graphics();
        const mark = new PIXI.Graphics();
        container.addChild(watch, hand, mark);
        update = () => {
            const t = still() ? 1.2 : time;
            // Signe, zooming from the left edge towards the middle, again and again
            const u = still() ? .6 : (t * .45) % 1;
            const tx = -rx * .95 + u * rx * .82;
            turtle.position.set(tx, groundY + 4 + (still() ? 0 : Math.abs(Math.sin(t * 16)) * -3));
            turtle.texture = T(Math.floor(t * 8) % 2 ? 'turtle-signe-1' : 'turtle-signe-2') || T('turtle-signe');
            speedLines.clear();
            for (let i = 0; i < 4; i++) {
                const y = groundY - rx * .05 - i * rx * .06;
                speedLines.moveTo(tx - rx * .3 - i * 4, y).lineTo(tx - rx * .55 - i * 10, y).stroke({ width: 1.6, color: INK, alpha: .55 });
            }
            // one hoofprint at a time, very slowly
            const shown = still() ? prints.length : Math.floor((t * .6) % (prints.length + 2));
            prints.forEach((p, i) => { p.alpha = i < shown ? .9 : 0; });
            // the stopwatch ticks
            const a = still() ? .8 : t * 3;
            hand.clear().moveTo(watch.x, watch.y + ry * .03).lineTo(watch.x + Math.sin(a) * ry * .12, watch.y + ry * .03 - Math.cos(a) * ry * .12)
                .stroke({ width: 2, color: 0xa8402c, cap: 'round' });
            // and the question, in Klo's red pencil
            const w = still() ? 0 : Math.sin(t * 2.4) * .1;
            mark.clear();
            const q = (x, y) => [Math.cos(w) * x - Math.sin(w) * y, Math.sin(w) * x + Math.cos(w) * y - ry * .56];
            mark.moveTo(...q(-ry * .12, -ry * .06)).quadraticCurveTo(...q(-ry * .1, -ry * .26), ...q(ry * .03, -ry * .24))
                .quadraticCurveTo(...q(ry * .16, -ry * .2), ...q(ry * .08, -ry * .02)).quadraticCurveTo(...q(0, ry * .06), ...q(0, ry * .16))
                .stroke({ width: Math.max(2.5, ry * .06), color: 0xa8402c, cap: 'round', join: 'round' });
            mark.circle(...q(0, ry * .3), Math.max(1.8, ry * .04)).fill({ color: 0xa8402c });
        };
        update(0);
    } else if (kind === 'researcher') {
        // someone who takes on mysteries: a lens over hoofprints in the sand,
        // a notebook being filled in, and a pair of eyes coming up out of it
        const sand = new PIXI.TilingSprite({ texture: T('mat-sand'), width: rx * 2.4, height: ry * 2.4 });
        sand.position.set(-rx * 1.2, -ry * 1.2); sand.tileScale.set(.45);
        const prints = new PIXI.Container();
        const trail = [];
        for (let i = 0; i < 6; i++) {
            const s = sprite('hoofprint', .5, .5);
            const x = -rx * .85 + i * rx * .32, y = ry * .02 - i * ry * .09 + (i % 2) * ry * .2;
            s.position.set(x, y); s.rotation = -.5; s.scale.set(ry * .22 / 42); s.alpha = .95;
            prints.addChild(s); trail.push([x, y]);
        }
        container.addChild(sand, prints);
        // the magnifying glass, with a real magnified view of the sand under it
        const lensR = ry * .36;
        const zoomed = new PIXI.Container();
        const sand2 = new PIXI.TilingSprite({ texture: T('mat-sand'), width: rx * 2.4, height: ry * 2.4 });
        sand2.position.set(-rx * 1.2, -ry * 1.2); sand2.tileScale.set(.45);
        const prints2 = new PIXI.Container();
        for (const [x, y] of trail) { const s = sprite('hoofprint', .5, .5); s.position.set(x, y); s.rotation = -.5; s.scale.set(ry * .22 / 42); prints2.addChild(s); }
        zoomed.addChild(sand2, prints2);
        const lensMask = new PIXI.Graphics();
        zoomed.mask = lensMask;
        const lens = new PIXI.Graphics();
        container.addChild(zoomed, lensMask, lens);
        const book = sprite('klo-part-book', .5, .5);
        book.scale.set(ry * .5 / T('klo-part-book').height); book.position.set(rx * .5, ry * .55); book.rotation = -.12;
        const pencil = new PIXI.Graphics();
        const L = ry * .62, Wd = ry * .09;
        pencil.rect(0, -Wd / 2, L, Wd).fill({ color: 0xe8c547 }).stroke({ width: 1.2, color: INK });
        pencil.moveTo(0, -Wd / 2).lineTo(-L * .2, 0).lineTo(0, Wd / 2).closePath().fill({ color: 0xe6c89a }).stroke({ width: 1.2, color: INK });
        pencil.moveTo(-L * .13, -Wd * .18).lineTo(-L * .2, 0).lineTo(-L * .13, Wd * .18).closePath().fill({ color: INK });
        pencil.rect(L, -Wd / 2, L * .12, Wd).fill({ color: 0xe39aa6 }).stroke({ width: 1.2, color: INK });
        pencil.moveTo(L * .3, -Wd * .1).lineTo(L * .9, -Wd * .1).stroke({ width: 1, color: 0xb8952f, alpha: .8 });
        const hole = new PIXI.Graphics().ellipse(0, 0, ry * .22, ry * .07).fill({ color: 0x6e573f, alpha: .45 });
        hole.position.set(-rx * .12, ry * .7);
        const peek = sprite('klo-peek', .5, 1);
        peek.scale.set(ry * .38 / T('klo-peek').height);
        const peekMask = new PIXI.Graphics().rect(-rx, -ry * 2, rx * 2, ry * 2 + ry * .63).fill(0xffffff);
        peek.mask = peekMask;
        container.addChild(book, pencil, hole, peek, peekMask);
        update = () => {
            const t = still() ? 3 : time;
            // the lens follows the tracks, back and forth
            const u = still() ? .5 : (Math.sin(t * .7) + 1) / 2;
            const seg = u * (trail.length - 1), i = Math.min(trail.length - 2, Math.floor(seg)), f = seg - i;
            const lx = trail[i][0] + (trail[i + 1][0] - trail[i][0]) * f, ly = trail[i][1] + (trail[i + 1][1] - trail[i][1]) * f - ry * .05;
            zoomed.scale.set(1.7);
            zoomed.position.set(lx - lx * 1.7, ly - ly * 1.7);
            lensMask.clear().circle(lx, ly, lensR).fill(0xffffff);
            lens.clear();
            lens.moveTo(lx + lensR * .7, ly + lensR * .7).lineTo(lx + lensR * 1.75, ly + lensR * 1.75).stroke({ width: lensR * .32, color: 0x6a4a2c, cap: 'round' })
                .moveTo(lx + lensR * .7, ly + lensR * .7).lineTo(lx + lensR * 1.75, ly + lensR * 1.75).stroke({ width: 1.6, color: INK, alpha: .8, cap: 'round' });
            lens.circle(lx, ly, lensR).fill({ color: 0xeaf6fc, alpha: .18 }).stroke({ width: lensR * .16, color: 0xb08d57 })
                .circle(lx, ly, lensR * 1.08).stroke({ width: 1.8, color: INK, alpha: .9 })
                .circle(lx, ly, lensR * .92).stroke({ width: 1.2, color: INK, alpha: .6 });
            lens.moveTo(lx - lensR * .55, ly - lensR * .2).quadraticCurveTo(lx - lensR * .5, ly - lensR * .55, lx - lensR * .15, ly - lensR * .6)
                .stroke({ width: 2.4, color: 0xffffff, alpha: .85, cap: 'round' });
            // notes being taken
            const w = still() ? 0 : Math.sin(t * 14) * ry * .04;
            pencil.position.set(book.x - ry * .02 + w, book.y - ry * .02 + Math.abs(w) * .4);
            pencil.rotation = -.75;
            // someone is already there, under the sand
            const up = still() ? 1 : ease((time - 1.4) / .6);
            peek.position.set(hole.x, hole.y + ry * .02 + (1 - up) * ry * .4);
        };
        update(0);
    }

    return {
        container,
        update(dt) { time += dt; update(dt); },
        destroy() { cleanup(); for (const h of heroes) h.destroy?.(); container.destroy({ children: true }); }
    };
}
