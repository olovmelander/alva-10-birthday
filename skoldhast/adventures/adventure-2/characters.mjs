/*
 * Äventyr 2 – the new characters and things, drawn in code in coloured pencil.
 * Every shape is built once; each frame only moves, turns and shows parts
 * (no per-frame Graphics work). Origins are on the ground under the middle;
 * everything faces right and is mirrored by its container.
 *
 *   createTukan(PIXI, pen)    Tukankrabban: a crab with a toucan's beak (Alva's creature)
 *   createMagpie(PIXI, pen)   Skatan
 *   createBeetle(PIXI, pen)   Tordyveln, and his earth ball (createBall)
 *   createCloud(PIXI, pen, { texture })  Molnet (Mira's drawn cloud when there is one)
 *   createEgg(PIXI, pen), createHatchling(PIXI, pen), createCoin(PIXI, pen), createNest(PIXI, pen)
 *   createHearts(PIXI, pen)   Klo's pencil hearts
 *
 * `pen` is src/pencil-style.mjs's pencilStyle(texture).
 */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const damp = (v, t, r, dt) => v + (t - v) * (1 - Math.exp(-r * dt));

export const INK = 0x3b3530;
export const PAL = {
    shell: 0x2d2c3a, shellHi: 0x4a4a62, bib: 0xf4ecd6, claw: 0xd8613f, clawHi: 0xf09a6a,
    beakA: 0xf3a33a, beakB: 0xf7d35b, beakG: 0x83b84e, beakTip: 0xd5483c, eyeRing: 0x5aa8dd,
    egg: 0xf7f1e3, eggPink: 0xf3d6dc, eggBlue: 0xd5e6f2, gold: 0xe9b949, goldHi: 0xfff0a8, goldLo: 0xb6852c,
    magpie: 0x24242c, magpieHi: 0x3f6f7a, white: 0xf6f3ea, beetle: 0x23314a, beetleHi: 0x6c86b8,
    earth: 0x7a5a3c, earthHi: 0xa47e55, twig: 0x8a6a45, twigHi: 0xb9975f, cloud: 0xa8a2c4, cloudHi: 0xe4e0f2,
    heart: 0xd65a6e, glow: 0xfff3b8
};

function g(PIXI) { return new PIXI.Graphics(); }

/** A small pencil star (the glimmer of shiny things). */
function starShape(G, pen, r, color = 0xffffff, alpha = 1) {
    G.moveTo(-r, 0).lineTo(r, 0).moveTo(0, -r).lineTo(0, r).stroke(pen.line(color, Math.max(1.2, r * 0.18), alpha));
    G.moveTo(-r * 0.45, -r * 0.45).lineTo(r * 0.45, r * 0.45).moveTo(-r * 0.45, r * 0.45).lineTo(r * 0.45, -r * 0.45)
        .stroke(pen.line(color, Math.max(1, r * 0.12), alpha * 0.7));
    return G;
}

// ---------------------------------------------------------------------------------------
// Tukankrabban, as Alva drew her (docs/skoldhast/adventure-2.md, "Alva's drawing"):
// a round orange crab with a curved line across her shell, two big round eyes on
// thin stalks, eight thin orange legs, and claws that are toucan heads: a black
// head with a white eye, an orange beak with a black tip whose orange-red lower
// half opens like a pincer.
// ---------------------------------------------------------------------------------------
export const TUKAN = { body: 0xf0a12e, bodyHi: 0xf8c05a, bodyLo: 0xc8761c, edge: 0x9a5a14, leg: 0xe8962e,
    head: 0x23222a, beak: 0xf2a23a, beakLo: 0xe0602e, tip: 0x1e1d24, eye: 0xfbfaf4, pupil: 0x17161c };

function toucanHead(PIXI, pen) {
    // local origin at the wrist; the beak points along +x
    const c = new PIXI.Container();
    const lowerC = new PIXI.Container(); lowerC.position.set(14, 5);
    const lower = g(PIXI);
    lower.moveTo(0, 0).quadraticCurveTo(22, 10, 44, 8).lineTo(36, 3).quadraticCurveTo(18, 2, 0, -3).closePath()
        .fill(pen.fill(TUKAN.beakLo)).stroke(pen.line(0x8e3b1c, 1.4));
    lower.moveTo(36, 3).lineTo(44, 8).lineTo(34, 8).closePath().fill(pen.fill(TUKAN.tip));
    lowerC.addChild(lower);
    const head = g(PIXI);
    head.moveTo(-10, -2).quadraticCurveTo(-4, -15, 10, -14).quadraticCurveTo(20, -10, 18, 2).quadraticCurveTo(10, 10, -2, 7).closePath()
        .fill(pen.fill(TUKAN.head)).stroke(pen.line(INK, 1.6));
    head.ellipse(7, -5, 7.5, 5.2).fill(pen.fill(TUKAN.eye)).stroke(pen.line(0x5d5a66, 1));
    head.ellipse(7.6, -5, 2.6, 3.4).fill({ color: TUKAN.pupil });
    head.moveTo(0, -3).lineTo(15, -1).stroke(pen.line(0x111015, 1.2, 0.7));
    const upper = g(PIXI);
    upper.moveTo(14, -10).quadraticCurveTo(38, -16, 58, -2).quadraticCurveTo(44, 2, 30, 2).quadraticCurveTo(20, 2, 14, 4).closePath()
        .fill(pen.fill(TUKAN.beak)).stroke(pen.line(0x8b4d1e, 1.6));
    upper.moveTo(42, -9).quadraticCurveTo(52, -6, 58, -2).quadraticCurveTo(48, 1, 40, 1).closePath().fill(pen.fill(TUKAN.tip));
    upper.moveTo(18, -8).quadraticCurveTo(34, -13, 46, -6).stroke(pen.line(0xfbd88a, 1.4, 0.7));
    c.addChild(lowerC, head, upper);
    return { c, lowerC };
}

export function createTukan(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'tukan';
    const shadow = g(PIXI);
    for (let i = 4; i >= 1; i--) shadow.ellipse(0, 0, 40 + i * 7, 2.5 + i * 1.3).fill({ color: 0x2e2a36, alpha: 0.05 });
    const flip = new PIXI.Container();
    view.addChild(shadow, flip);
    // eight thin legs, four a side, splayed under the shell
    const legs = [];
    for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1, k = i % 4;
        const leg = new PIXI.Container();
        const lg = g(PIXI);
        const reach = 26 + k * 9, knee = -16 - k * 2;
        lg.moveTo(0, 0).lineTo(side * reach * 0.55, knee).lineTo(side * reach, 30 + k * 0.5).stroke(pen.line(INK, 5.6, 0.85));
        lg.moveTo(0, 0).lineTo(side * reach * 0.55, knee).lineTo(side * reach, 30 + k * 0.5).stroke(pen.line(TUKAN.leg, 3.6));
        leg.addChild(lg);
        leg.position.set(side * (10 + k * 8), -30);
        legs.push({ c: leg, side, k });
        flip.addChild(leg);
    }
    const body = new PIXI.Container(); flip.addChild(body);
    // the eye stalks, behind the shell
    const stalks = [[-14, -62, -30, -104, 14], [12, -64, 22, -98, 11.5]].map(([x0, y0, x1, y1, r]) => {
        const c = new PIXI.Container();
        const sg = g(PIXI);
        sg.moveTo(x0, y0).quadraticCurveTo((x0 + x1) / 2 + 4, (y0 + y1) / 2, x1, y1 + r * 0.6).stroke(pen.line(INK, 5.4, 0.8));
        sg.moveTo(x0, y0).quadraticCurveTo((x0 + x1) / 2 + 4, (y0 + y1) / 2, x1, y1 + r * 0.6).stroke(pen.line(TUKAN.leg, 3.6));
        const eye = new PIXI.Container(); eye.position.set(x1, y1);
        const eg = g(PIXI);
        eg.circle(0, 0, r).fill(pen.fill(TUKAN.eye)).stroke(pen.line(0x6f6c78, 1.6));
        eg.circle(0, 0, r * 0.86).stroke(pen.line(0xb9c6d2, 1.2, 0.7));
        const pupil = g(PIXI); pupil.circle(0, 0, r * 0.42).fill({ color: TUKAN.pupil }); pupil.circle(-r * 0.12, -r * 0.16, r * 0.12).fill({ color: 0xffffff });
        const lid = g(PIXI); lid.circle(0, 0, r + 1).fill(pen.fill(TUKAN.body)); lid.visible = false;
        // sad: a heavy lid over the top of the eye, lower at its outer side (the stalks lean outward)
        const out = x1 < 0 ? -1 : 1, sadLid = g(PIXI), pts = [];
        const a0 = out > 0 ? -2.75 : -0.39, a1 = out > 0 ? 0.25 : -Math.PI - 0.25; // inner end higher, outer end lower
        for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14 + (out > 0 ? 0 : 0); pts.push(Math.cos(a) * (r + 1), Math.sin(a) * (r + 1)); }
        sadLid.poly(pts).fill(pen.fill(TUKAN.body)).stroke(pen.line(TUKAN.edge, 1.6));
        sadLid.visible = false;
        eye.addChild(eg, pupil, lid, sadLid);
        c.addChild(sg, eye);
        body.addChild(c);
        return { c, eye, pupil, lid, sadLid, out, r };
    });
    // a tear that runs down from the outer eye when she is sad
    const tear = g(PIXI);
    tear.moveTo(0, -5).quadraticCurveTo(4.5, 1, 0, 4.5).quadraticCurveTo(-4.5, 1, 0, -5).fill({ color: 0x9fd3f0, alpha: 0.95 }).stroke(pen.line(0x4f86b0, 1.2));
    tear.visible = false;
    // the back claw: a toucan head held high
    const backArm = new PIXI.Container(); backArm.position.set(-36, -54);
    const ba = g(PIXI);
    ba.moveTo(0, 0).quadraticCurveTo(-14, -18, -16, -40).stroke(pen.line(INK, 7, 0.85));
    ba.moveTo(0, 0).quadraticCurveTo(-14, -18, -16, -40).stroke(pen.line(TUKAN.leg, 5));
    backArm.addChild(ba);
    const back = toucanHead(PIXI, pen); back.c.position.set(-16, -44); back.c.rotation = -1.15; back.c.scale.set(0.95);
    backArm.addChild(back.c);
    body.addChild(backArm);
    // the round orange shell with Alva's curved line
    const shell = g(PIXI);
    shell.moveTo(-50, -30).quadraticCurveTo(-52, -78, 0, -80).quadraticCurveTo(52, -78, 50, -30).quadraticCurveTo(0, -18, -50, -30).closePath()
        .fill(pen.fill(TUKAN.body)).stroke(pen.line(TUKAN.edge, 2.4));
    shell.ellipse(-12, -64, 26, 9).fill(pen.hatch(TUKAN.bodyHi, 0.95));
    shell.moveTo(-44, -34).quadraticCurveTo(0, -24, 44, -34).stroke(pen.line(TUKAN.bodyLo, 2, 0.6));
    body.addChild(shell);
    // Alva's curved line on the shell is her smile; when she is sad it turns down
    const smile = g(PIXI); smile.moveTo(-12, -50).quadraticCurveTo(2, -40, 16, -50).stroke(pen.line(0x8a4f12, 2.4));
    const frown = g(PIXI); frown.moveTo(-12, -42).quadraticCurveTo(2, -52, 16, -42).stroke(pen.line(0x8a4f12, 2.4)); frown.visible = false;
    body.addChild(smile, frown);
    // the front claw: a toucan head held forward, beak ready to pinch
    const frontArm = new PIXI.Container(); frontArm.position.set(40, -46);
    const fa = g(PIXI);
    fa.moveTo(0, 0).quadraticCurveTo(14, 2, 24, -4).stroke(pen.line(INK, 7, 0.85));
    fa.moveTo(0, 0).quadraticCurveTo(14, 2, 24, -4).stroke(pen.line(TUKAN.leg, 5));
    frontArm.addChild(fa);
    const front = toucanHead(PIXI, pen); front.c.position.set(28, -6); front.c.rotation = -0.12;
    frontArm.addChild(front.c);
    body.addChild(frontArm);
    // a sparkle when she sees something that shines
    const spark = starShape(g(PIXI), pen, 10, 0xfff6c8); spark.position.set(40, -120); spark.visible = false;
    view.addChild(spark);
    body.addChild(tear);

    let facing = 1, blinkAt = 2.3, open = 0;
    return {
        view,
        /** a: { x, y, facing, vx, distance, pose, talking }, t: game time */
        update(dt, a, t, { reducedMotion = false } = {}) {
            view.visible = !!a?.visible;
            if (!view.visible) return;
            view.position.set(a.x, a.y);
            facing = damp(facing, a.facing || 1, 12, Math.min(dt, 0.1));
            flip.scale.x = Math.abs(facing) < 0.05 ? 0.05 : facing;
            const moving = Math.abs(a.vx || 0) > 4;
            const phase = (a.distance || 0) / 22;
            for (const l of legs) {
                const sw = moving ? Math.sin(phase + l.k * 1.7 + (l.side > 0 ? Math.PI : 0)) : 0;
                l.c.rotation = sw * 0.3;
                l.c.y = -30 - (moving ? Math.max(0, sw) * 4 : 0);
            }
            const dig = a.pose === 'dig', happy = a.pose === 'happy' || a.pose === 'shine', sad = a.pose === 'sad';
            const bob = reducedMotion ? 0 : (moving ? -Math.abs(Math.sin(phase)) * 3 : sad ? Math.sin(t * 1.2) * 0.8 : Math.sin(t * 2.2) * 1.4);
            body.y = bob + (dig ? 6 : sad ? 7 : 0);
            body.rotation = dig ? 0.12 : 0;
            // the toucan heads talk: their beaks open and shut like pincers
            const talking = !!a.talking;
            open = damp(open, talking ? 0.5 + 0.5 * Math.sin(t * 16) : happy ? 0.35 : sad ? 0 : 0.08, 16, Math.min(dt, 0.1));
            front.lowerC.rotation = open * 0.55;
            back.lowerC.rotation = (talking ? 0.5 + 0.5 * Math.sin(t * 16 + 1.4) : open) * 0.5;
            // sad: both toucan heads hang down, beaks shut
            frontArm.rotation = dig ? 0.9 + (reducedMotion ? 0 : Math.sin(t * 12) * 0.35) : sad ? 0.75 : talking ? Math.sin(t * 4) * 0.12 : Math.sin(t * 1.1) * 0.04;
            backArm.rotation = dig ? 0.6 + (reducedMotion ? 0 : Math.cos(t * 12) * 0.3) : sad ? -1.3 : happy && !reducedMotion ? Math.sin(t * 8) * 0.25 : Math.sin(t * 0.8 + 1) * 0.05;
            for (const [i, st] of stalks.entries()) {
                // sad: the eye stalks droop outward, the eyes look down under heavy lids
                st.c.rotation = (reducedMotion ? 0 : Math.sin(t * 1.3 + i * 2) * 0.04) + (sad ? st.out * 0.16 : 0);
                const look = a.lookAt !== undefined ? clamp((a.lookAt - a.x) * Math.sign(facing || 1) / 400, -1, 1) : 0.4;
                st.pupil.position.set((sad ? 0 : look) * st.r * 0.35, (dig ? 0.3 : sad ? 0.42 : -0.05) * st.r);
                st.sadLid.visible = sad;
            }
            smile.visible = !sad; frown.visible = sad;
            // the tear runs from the outer eye down the shell, and starts again
            tear.visible = sad;
            if (sad) {
                const st = stalks[1], u = reducedMotion ? 0.35 : (t * 0.45) % 1;
                const ex = st.eye.x + st.r * 0.5, ey = st.eye.y + st.r * 0.9;
                tear.position.set(ex + u * 6, ey + u * 46);
                tear.alpha = reducedMotion ? 1 : Math.min(1, (1 - u) * 3);
            }
            if (t > blinkAt) { for (const st of stalks) st.lid.visible = true; if (t > blinkAt + 0.12) { for (const st of stalks) st.lid.visible = false; blinkAt = t + 2.6 + ((a.x || 0) % 7) * 0.3; } }
            spark.visible = a.pose === 'shine' && (reducedMotion || Math.sin(t * 9) > 0);
            spark.x = 40 * Math.sign(facing || 1);
            shadow.visible = !a.inWater;
        },
        headBounds() { return view.getBounds(); },
        destroy() { view.destroy({ children: true }); }
    };
}

// ---------------------------------------------------------------------------------------
// Skatan
// ---------------------------------------------------------------------------------------
export function createMagpie(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'skata';
    // a pale glow behind her: a black bird among dark leaves in the storm could not be seen at all (5 November)
    const glow = g(PIXI);
    for (const [rx, ry, a] of [[52, 34, 0.08], [42, 27, 0.1], [32, 21, 0.13]]) glow.ellipse(4, -24, rx, ry).fill({ color: 0xf2ecd8, alpha: a });
    view.addChild(glow);
    const flip = new PIXI.Container(); view.addChild(flip);
    const tail = g(PIXI);
    tail.moveTo(-10, -20).lineTo(-56, -6).lineTo(-58, 0).lineTo(-12, -12).closePath().fill(pen.fill(PAL.magpie)).stroke(pen.line(INK, 1.4));
    tail.moveTo(-14, -16).lineTo(-54, -3).stroke(pen.line(PAL.magpieHi, 2.5, 0.9));
    flip.addChild(tail);
    const bodyC = new PIXI.Container(); flip.addChild(bodyC);
    const body = g(PIXI);
    body.ellipse(0, -24, 23.5, 15.5).stroke(pen.line(0xf2ecd8, 2.4, 0.75));
    body.ellipse(0, -24, 22, 14).fill(pen.fill(PAL.magpie)).stroke(pen.line(INK, 2));
    body.ellipse(4, -19, 14, 8).fill(pen.fill(PAL.white));
    body.ellipse(-6, -28, 12, 5).fill(pen.fill(PAL.white, 0.95));
    body.moveTo(-14, -30).quadraticCurveTo(-4, -38, 6, -32).stroke(pen.line(PAL.magpieHi, 2, 0.8));
    body.moveTo(-4, -10).lineTo(-6, 0).moveTo(4, -10).lineTo(4, 0).stroke(pen.line(INK, 2));
    bodyC.addChild(body);
    const head = new PIXI.Container(); head.position.set(18, -36);
    const hg = g(PIXI);
    hg.circle(0, 0, 11.5).stroke(pen.line(0xf2ecd8, 2.2, 0.75));
    hg.circle(0, 0, 10).fill(pen.fill(PAL.magpie)).stroke(pen.line(INK, 1.6));
    hg.circle(4, -2, 2.4).fill({ color: 0xffffff }); hg.circle(4.6, -2, 1.3).fill({ color: 0x111111 });
    hg.moveTo(8, 0).lineTo(20, 2).lineTo(8, 4).closePath().fill(pen.fill(0x1a1a1a)).stroke(pen.line(INK, 1));
    head.addChild(hg);
    const coin = createCoin(PIXI, pen, 0.55); coin.view.position.set(20, 3); coin.view.visible = false; head.addChild(coin.view);
    bodyC.addChild(head);
    let facing = -1;
    return {
        view,
        update(dt, a, t, { reducedMotion = false } = {}) {
            view.visible = !!a?.visible;
            if (!view.visible) return;
            view.position.set(a.x, a.y);
            facing = damp(facing, a.facing || -1, 10, Math.min(dt, 0.1));
            flip.scale.x = Math.abs(facing) < 0.05 ? 0.05 : facing;
            const hop = reducedMotion ? 0 : Math.max(0, Math.sin(t * 1.7)) ** 8 * 8;
            bodyC.y = -hop;
            head.rotation = (a.talking ? Math.sin(t * 9) * 0.12 : Math.sin(t * 1.3) * 0.08) + (a.pose === 'coin' ? -0.15 : 0);
            tail.rotation = reducedMotion ? 0 : Math.sin(t * 2.4) * 0.05;
            coin.view.visible = a.pose === 'coin';
            coin.update(dt, t);
        },
        destroy() { view.destroy({ children: true }); }
    };
}

// ---------------------------------------------------------------------------------------
// Tordyveln and his ball
// ---------------------------------------------------------------------------------------
export function createBeetle(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'dyvel';
    const flip = new PIXI.Container(); view.addChild(flip);
    const legs = g(PIXI);
    for (const [x, d] of [[-12, -1], [0, 0], [12, 1]]) legs.moveTo(x, -10).lineTo(x + d * 6 - 4, -2).lineTo(x + d * 8 - 6, 0).stroke(pen.line(0x1a2233, 2.4));
    flip.addChild(legs);
    const body = new PIXI.Container(); flip.addChild(body);
    const bg = g(PIXI);
    bg.ellipse(-2, -16, 20, 12).fill(pen.fill(PAL.beetle)).stroke(pen.line(INK, 2));
    bg.moveTo(-2, -28).lineTo(-2, -5).stroke(pen.line(0x101828, 1.4, 0.9));
    bg.ellipse(-8, -21, 8, 3).fill(pen.hatch(PAL.beetleHi, 0.9));
    bg.ellipse(6, -22, 5, 2).fill(pen.hatch(0x9ab36a, 0.6));
    body.addChild(bg);
    const head = new PIXI.Container(); head.position.set(18, -14);
    const hg = g(PIXI);
    hg.ellipse(0, 0, 8, 6).fill(pen.fill(0x1b2638)).stroke(pen.line(INK, 1.4));
    hg.moveTo(4, -4).lineTo(10, -14).lineTo(14, -12).moveTo(2, -5).lineTo(4, -16).lineTo(8, -16).stroke(pen.line(INK, 1.4));
    hg.circle(3, -1, 1.6).fill({ color: 0xffffff }); hg.moveTo(0, -4).lineTo(6, -3).stroke(pen.line(0x111111, 1.6)); // a grumpy brow
    head.addChild(hg); body.addChild(head);
    let facing = -1;
    return {
        view,
        update(dt, a, t, { reducedMotion = false } = {}) {
            view.visible = !!a?.visible;
            if (!view.visible) return;
            view.position.set(a.x, a.y);
            facing = damp(facing, a.facing || -1, 10, Math.min(dt, 0.1));
            flip.scale.x = Math.abs(facing) < 0.05 ? 0.05 : facing;
            body.y = reducedMotion ? 0 : Math.sin(t * 3) * 0.8;
            head.rotation = a.talking ? Math.sin(t * 10) * 0.15 : 0;
        },
        destroy() { view.destroy({ children: true }); }
    };
}

export function createBall(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'ball';
    const spin = new PIXI.Container(); view.addChild(spin);
    const R = 34;
    const bg = g(PIXI);
    bg.circle(0, 0, R).fill(pen.fill(PAL.earth)).stroke(pen.line(0x4a3524, 2.4));
    for (let i = 0; i < 9; i++) {
        const a = i * 2.4, r = 8 + (i * 7) % 20;
        bg.moveTo(Math.cos(a) * r, Math.sin(a) * r).lineTo(Math.cos(a + 0.5) * (r + 6), Math.sin(a + 0.5) * (r + 6)).stroke(pen.line(PAL.earthHi, 2, 0.8));
    }
    bg.circle(-8, -10, 4).fill({ color: PAL.egg, alpha: 0.95 }); // the egg peeks out
    spin.addChild(bg);
    const glint = starShape(g(PIXI), pen, 6, 0xffffff); glint.position.set(-8, -10); spin.addChild(glint);
    spin.y = -R;
    return {
        view, radius: R,
        update(dt, pose, t) {
            view.visible = !!pose;
            if (!pose) return;
            view.position.set(pose.x, pose.y);
            spin.rotation = -pose.spin;
            const s = 1 - pose.wash * 0.85;
            spin.scale.set(s); spin.y = -R * s;
            view.alpha = 1 - pose.wash * 0.6;
            glint.alpha = 0.5 + 0.5 * Math.sin(t * 5);
        },
        destroy() { view.destroy({ children: true }); }
    };
}

// ---------------------------------------------------------------------------------------
// Molnet (Mira's cloud)
// ---------------------------------------------------------------------------------------
export function createCloud(PIXI, pen, { texture = null } = {}) {
    const view = new PIXI.Container(); view.label = 'moln';
    const rain = new PIXI.Container(); view.addChild(rain);
    const drops = [];
    for (let i = 0; i < 14; i++) {
        const d = g(PIXI); d.moveTo(0, 0).lineTo(-4, 26).stroke(pen.line(0x8fb0d6, 2, 0.85));
        d.position.set(-90 + i * 13, 30); rain.addChild(d); drops.push({ d, o: (i * 37) % 100 / 100 });
    }
    const bolt = g(PIXI);
    bolt.moveTo(10, 30).lineTo(-6, 70).lineTo(8, 70).lineTo(-10, 120).lineTo(28, 62).lineTo(12, 62).lineTo(26, 30).closePath()
        .fill(pen.fill(0xffe46b)).stroke(pen.line(0xb98a1c, 2));
    bolt.visible = false; view.addChild(bolt);
    const puff = new PIXI.Container(); view.addChild(puff);
    if (texture) {
        const s = new PIXI.Sprite(texture); s.anchor.set(0.5);
        const k = Math.min(240 / s.texture.width, 130 / s.texture.height);
        s.scale.set(k); puff.addChild(s);
    } else {
        const c = g(PIXI);
        const lobes = [[-70, 6, 34], [-34, -16, 42], [10, -26, 48], [54, -8, 40], [80, 12, 28], [-10, 16, 44], [40, 18, 36]];
        for (const [x, y, r] of lobes) c.circle(x, y, r).fill(pen.fill(PAL.cloud));
        for (const [x, y, r] of lobes) c.circle(x, y, r).stroke(pen.line(0x5f587e, 2.2, 0.85));
        for (const [x, y, r] of lobes) c.circle(x, y, r * 0.92).fill(pen.fill(PAL.cloud));
        c.ellipse(-10, -18, 40, 12).fill(pen.hatch(PAL.cloudHi, 0.8));
        puff.addChild(c);
    }
    const face = new PIXI.Container(); face.position.set(4, 4); view.addChild(face);
    const eyes = g(PIXI);
    eyes.circle(-18, 0, 5).fill({ color: 0x2b2840 }); eyes.circle(18, 0, 5).fill({ color: 0x2b2840 });
    eyes.circle(-16.5, -1.5, 1.6).fill({ color: 0xffffff }); eyes.circle(19.5, -1.5, 1.6).fill({ color: 0xffffff });
    face.addChild(eyes);
    const sad = g(PIXI); sad.moveTo(-10, 20).quadraticCurveTo(0, 12, 10, 20).stroke(pen.line(0x2b2840, 2.4));
    sad.moveTo(-24, -10).lineTo(-12, -7).moveTo(24, -10).lineTo(12, -7).stroke(pen.line(0x2b2840, 2));
    const tear = g(PIXI); tear.moveTo(-20, 6).quadraticCurveTo(-24, 14, -20, 16).quadraticCurveTo(-16, 14, -20, 6).fill(pen.fill(0x9cc4ea));
    sad.addChild(tear);
    const happy = g(PIXI); happy.moveTo(-12, 12).quadraticCurveTo(0, 24, 12, 12).stroke(pen.line(0x2b2840, 2.4));
    happy.circle(-28, 10, 6).fill({ color: 0xf2a6b6, alpha: 0.7 }); happy.circle(28, 10, 6).fill({ color: 0xf2a6b6, alpha: 0.7 });
    const hope = g(PIXI); hope.moveTo(-8, 16).lineTo(8, 16).stroke(pen.line(0x2b2840, 2.4));
    face.addChild(sad, happy, hope);
    let boltT = 0, nextBolt = 3;
    return {
        view,
        update(dt, a, t, { reducedMotion = false, storm = 1 } = {}) {
            view.visible = !!a?.visible;
            if (!view.visible) return;
            view.position.set(a.x, a.y + (reducedMotion ? 0 : Math.sin(t * 1.2) * 6));
            const mood = a.pose || 'sad';
            sad.visible = mood === 'sad'; happy.visible = mood === 'happy'; hope.visible = mood === 'hope';
            tear.y = reducedMotion ? 0 : (t * 18) % 14;
            rain.visible = mood !== 'happy' && storm > 0.05;
            for (const r of drops) {
                const u = (t * (reducedMotion ? 0.4 : 1.6) + r.o) % 1;
                r.d.y = 30 + u * 80; r.d.alpha = (1 - u) * (mood === 'hope' ? 0.5 : 0.9);
            }
            puff.tint = mood === 'happy' ? 0xffffff : mood === 'hope' ? 0xd9d6ea : 0xb3aecb;
            if (mood === 'sad' && storm > 0.5 && !reducedMotion) {
                nextBolt -= dt;
                if (nextBolt <= 0) { boltT = 0.18; nextBolt = 2.5 + (Math.sin(t * 7.3) + 1) * 2; }
            }
            boltT = Math.max(0, boltT - dt);
            bolt.visible = boltT > 0;
        },
        flash() { boltT = 0.25; },
        destroy() { view.destroy({ children: true }); }
    };
}

// ---------------------------------------------------------------------------------------
// eggs, hatchlings, the coin and the nest
// ---------------------------------------------------------------------------------------
export function createEgg(PIXI, pen, scale = 1) {
    const view = new PIXI.Container(); view.label = 'egg';
    // a soft warm light round an egg that waits to be found, so it is seen in the storm's dark on a phone
    const halo = g(PIXI);
    for (const [r, a] of [[34, 0.07], [27, 0.09], [20, 0.12]]) halo.circle(0, -15, r).fill({ color: 0xfff1b8, alpha: a });
    halo.alpha = 0; view.addChild(halo);
    const body = new PIXI.Container(); view.addChild(body);
    const eg = g(PIXI);
    eg.ellipse(0, -15, 11.5, 15).fill(pen.fill(PAL.egg)).stroke(pen.line(0x8d8068, 1.6));
    eg.ellipse(-3, -12, 6, 8).fill(pen.hatch(PAL.eggPink, 0.8));
    eg.ellipse(4, -19, 4, 6).fill(pen.hatch(PAL.eggBlue, 0.8));
    eg.ellipse(-4, -22, 2.4, 4).fill({ color: 0xffffff, alpha: 0.95 });
    body.addChild(eg);
    const crack = g(PIXI);
    crack.moveTo(-11, -16).lineTo(-6, -12).lineTo(-2, -17).lineTo(3, -12).lineTo(7, -17).lineTo(11, -14).stroke(pen.line(0x6d5f48, 1.6));
    crack.visible = false; body.addChild(crack);
    const glint = starShape(g(PIXI), pen, 7, 0xfffbe0); glint.position.set(7, -26); view.addChild(glint);
    view.scale.set(scale);
    const seed = Math.random() * 10;
    return {
        view,
        update(dt, t, { glow = 1, wobble = 0, cracked = false, lit = 0 } = {}) {
            const tw = Math.max(0, Math.sin(t * 2.4 + seed)) ** 6;
            halo.alpha = lit * (0.75 + 0.25 * Math.sin(t * 2 + seed));
            halo.scale.set(1 + 0.08 * Math.sin(t * 2 + seed));
            glint.alpha = glow * (0.25 + 0.75 * tw);
            glint.scale.set(0.6 + tw * 0.6);
            body.rotation = wobble ? Math.sin(t * 22 + seed) * 0.12 * wobble : 0;
            crack.visible = cracked;
        },
        destroy() { view.destroy({ children: true }); }
    };
}

export function createHatchling(PIXI, pen) {
    // a tiny tukankrabba: the same orange shell, eyes on stalks and two toucan-head claws
    const view = new PIXI.Container(); view.label = 'hatchling';
    const flip = new PIXI.Container(); view.addChild(flip);
    const hg = g(PIXI);
    for (const x of [-9, -5, 5, 9]) hg.moveTo(x * 0.6, -6).lineTo(x * 1.25, 0).stroke(pen.line(TUKAN.leg, 1.8));
    for (const [x0, x1] of [[-3, -6], [3, 5]]) {
        hg.moveTo(x0, -13).lineTo(x1, -21).stroke(pen.line(TUKAN.leg, 1.6));
        hg.circle(x1, -22, 3).fill(pen.fill(TUKAN.eye)).stroke(pen.line(0x6f6c78, 0.8));
        hg.circle(x1 + 0.6, -22, 1.3).fill({ color: TUKAN.pupil });
    }
    hg.moveTo(-11, -6).quadraticCurveTo(-11, -16, 0, -16).quadraticCurveTo(11, -16, 11, -6).quadraticCurveTo(0, -3, -11, -6).closePath()
        .fill(pen.fill(TUKAN.body)).stroke(pen.line(TUKAN.edge, 1.2));
    hg.moveTo(-3, -10).quadraticCurveTo(0, -8, 3, -10).stroke(pen.line(0x8a4f12, 1));
    // the front claw's toucan head, and the back one raised
    hg.circle(14, -10, 3.4).fill(pen.fill(TUKAN.head));
    hg.moveTo(15, -12).quadraticCurveTo(21, -13, 24, -9).lineTo(16, -8).closePath().fill(pen.fill(TUKAN.beak));
    hg.moveTo(21, -11.5).lineTo(24, -9).lineTo(21, -9).closePath().fill({ color: TUKAN.tip });
    hg.circle(-12, -15, 3).fill(pen.fill(TUKAN.head));
    hg.moveTo(-12, -17).quadraticCurveTo(-10, -23, -6, -24).lineTo(-10, -16).closePath().fill(pen.fill(TUKAN.beak));
    flip.addChild(hg);
    const seed = Math.random() * 10;
    return {
        view,
        update(dt, t, { facing = 1, reducedMotion = false } = {}) {
            flip.scale.x = facing;
            flip.y = reducedMotion ? 0 : -Math.max(0, Math.sin(t * 5 + seed)) * 5;
        },
        destroy() { view.destroy({ children: true }); }
    };
}

export function createCoin(PIXI, pen, scale = 1) {
    const view = new PIXI.Container(); view.label = 'coin';
    const cg = g(PIXI);
    cg.circle(0, 0, 13).fill(pen.fill(PAL.gold)).stroke(pen.line(PAL.goldLo, 2));
    cg.circle(0, 0, 8.5).stroke(pen.line(PAL.goldLo, 1.4, 0.8));
    cg.ellipse(-4, -4, 4, 2.5).fill({ color: PAL.goldHi, alpha: 0.9 });
    view.addChild(cg);
    const glint = starShape(g(PIXI), pen, 7, 0xfffbe0); glint.position.set(8, -9); view.addChild(glint);
    view.scale.set(scale);
    return {
        view,
        update(dt, t) { glint.alpha = 0.4 + 0.6 * Math.max(0, Math.sin(t * 3)); },
        destroy() { view.destroy({ children: true }); }
    };
}

export function createNest(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'nest';
    const back = g(PIXI);
    back.ellipse(0, -6, 74, 16).fill(pen.fill(0xd9c08a)).stroke(pen.line(0x9a7a4a, 1.6));
    back.ellipse(0, -8, 60, 9).fill(pen.hatch(0xc5a96f, 0.9));
    const front = g(PIXI);
    for (let i = 0; i < 16; i++) {
        const x0 = -78 + i * 10, y0 = -4 + (i % 3) * 2;
        front.moveTo(x0, y0).quadraticCurveTo(x0 + 10, y0 + 8 - (i % 2) * 4, x0 + 20, y0 + 2).stroke(pen.line(i % 2 ? PAL.twig : PAL.twigHi, 3, 0.95));
    }
    front.ellipse(0, 2, 78, 8).stroke(pen.line(0x6e5032, 1.6, 0.8));
    const eggs = new PIXI.Container();
    view.addChild(back, eggs, front);
    return { view, eggs, destroy() { view.destroy({ children: true }); } };
}

/** Klo's pencil hearts: a few that rise and fade (shown while he is in love). */
export function createHearts(PIXI, pen) {
    const view = new PIXI.Container(); view.label = 'hearts';
    const hearts = [];
    for (let i = 0; i < 4; i++) {
        const h = g(PIXI);
        h.moveTo(0, 6).bezierCurveTo(-12, -4, -6, -12, 0, -5).bezierCurveTo(6, -12, 12, -4, 0, 6).closePath()
            .fill(pen.fill(PAL.heart)).stroke(pen.line(0x8e2f42, 1.4));
        view.addChild(h); hearts.push({ h, o: i / 4 });
    }
    return {
        view,
        update(dt, t, on, { reducedMotion = false } = {}) {
            view.visible = on;
            if (!on) return;
            for (const k of hearts) {
                const u = reducedMotion ? k.o : (t * 0.5 + k.o) % 1;
                k.h.position.set(Math.sin(u * TAU + k.o * 5) * 12 + (k.o - 0.5) * 30, -u * 60);
                k.h.alpha = Math.sin(u * Math.PI);
                k.h.scale.set(0.7 + u * 0.5);
            }
        },
        destroy() { view.destroy({ children: true }); }
    };
}

export { clamp, damp };
