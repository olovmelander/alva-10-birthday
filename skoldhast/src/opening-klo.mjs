/* Klo's first sight of the sköldhäst. The horse shakes itself and time slows:
 * one drop leaves the shell, catches the light and falls, wobbling, into his
 * hole behind the horse; a little crown of water, wet sand, and time snaps back.
 * His eye stalks come up with his eyes still shut, pop open, find the wrong thing first,
 * then climb hoof → leg → shell and he floats out of the sand, mesmerised, and
 * drops his notebook ("?"). The prologue holds there for his whisper. Then the
 * horse tosses its head: one eye jumps to the mane while the other stays on the
 * shell, both whip back and forth, he crouches, leaps ("!"), catches the
 * notebook and scribbles as he scuttles up to the horse.
 *
 * The same articulated pencil crab is used in the game: no part is stretched.
 * All positions are local to his final ground point, in world units (the
 * container carries the picture's scale). Progress 0 … HOLD is the first
 * tween, HOLD … 1 the second.
 */
import { createKlo } from './klo.mjs';

const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { const p = clamp(v); return p * p * (3 - 2 * p); };
const between = (p, a, b) => clamp((p - a) / (b - a));

export const OPENING_KLO_HOLD = .525;
// Local x budget: the dry sand between the last shell and the tail is narrow.
// The notebook falls flat just past his claw, left of the tail, where it
// clearly lies apart from him.
const HOLE_X = -4, BACK_X = -17, TAKE_X = 6, BOOK_X = 34, BOOK_ROT = -.12;
// Stalk angles that point his (slightly forward-drawn) pupils at the horse from
// behind it: up at the shell or the tossed mane, down at the hooves.
const SHELL = -.59, MANE = -.72, HOOF = .27, LEG = 0;
const STAGES = [['drop', 0], ['fall', .04375], ['plip', .119], ['periscope', .1375], ['search', .2], ['gaze', .231], ['rise', .325],
    ['backstep', .4125], ['awe', .4625], ['toss', OPENING_KLO_HOLD + 1e-9], ['double-take', .63125], ['split', .69375],
    ['crouch', .73125], ['take', .75625], ['land', .83125], ['research', .86875]];
/** Every stage in order, so a skipped frame can still play each stage's cue. */
export const OPENING_KLO_STAGES = Object.freeze(STAGES.map(([name]) => name));

/**
 * The first half as authored beats: real seconds, the entrance progress each
 * covers, and how fast the world around it runs (the horse, its mane, the
 * wave's spray). The drop and Klo's rise play in slow motion; reduced motion
 * keeps every beat in the same order at normal speed.
 */
export function openingKloBeats(reducedMotion = false) {
    const R = !!reducedMotion;
    return [
        { name: 'shake', dur: R ? .3 : .35, p0: 0, p1: .04375, speed: 1 },
        { name: 'fall', dur: R ? 1 : 2.8, p0: .04375, p1: .119, speed: R ? 1 : .15 },
        { name: 'impact', dur: R ? .4 : 1.05, p0: .119, p1: .1368, speed: R ? 1 : .15 },
        { name: 'still', dur: R ? .4 : .75, p0: .1368, p1: .1374, speed: 1 },
        { name: 'wake', dur: R ? 1.1 : 2.1, p0: .1374, p1: .325, speed: 1 },
        { name: 'rise', dur: R ? 1 : 2.4, p0: .325, p1: .4125, speed: R ? 1 : .45 },
        { name: 'settle', dur: R ? .5 : .9, p0: .4125, p1: OPENING_KLO_HOLD, speed: 1 }
    ];
}
/** Total seconds of the first half. */
export const openingKloDuration = (reducedMotion = false) => openingKloBeats(reducedMotion).reduce((a, b) => a + b.dur, 0);
/** Where the first half is after `seconds`: its progress, beat and world speed. */
export function openingKloAt(seconds, reducedMotion = false, out = {}) {
    const beats = openingKloBeats(reducedMotion);
    let at = 0, previous = 1;
    for (const beat of beats) {
        if (seconds < at + beat.dur || beat === beats.at(-1)) {
            const local = Math.max(0, Math.min(beat.dur, seconds - at));
            out.beat = beat.name;
            out.u = local / beat.dur;
            out.progress = beat.p0 + (beat.p1 - beat.p0) * out.u;
            // time eases into and out of slow motion instead of jumping
            out.speed = previous + (beat.speed - previous) * ease(local / .4);
            return out;
        }
        at += beat.dur; previous = beat.speed;
    }
    return out;
}

/** A reusable output makes entrance sampling allocation-free in the ticker. */
export function sampleOpeningKlo(progress, reducedMotion = false, out = {}) {
    const p = clamp(Number.isFinite(progress) ? progress : 0);
    out.progress = p;
    let stage = 'hidden';
    if (p >= 1) stage = 'ready';
    else if (p > 0) for (const [name, from] of STAGES) if (p >= from) stage = name;
    out.stage = stage;
    out.x = HOLE_X; out.y = 76; out.rotation = 0; out.walk = 0; out.pose = 'idle';
    out.facing = null; out.eyeAim = out.eyeAim || [0, 0]; out.aimed = false;
    out.eyeLift = out.eyeLift || [0, 0]; out.eyeLift[0] = out.eyeLift[1] = 0;
    out.eyeWide = 0; out.eyeFrame = null; out.tremble = 0; out.crouch = 0; out.scribble = 0;
    out.mark = ''; out.markAlpha = 0; out.markScale = 1; out.drop = -1; out.dropAlpha = 0;
    out.mouth = null; out.stars = 0; out.impact = -1; out.pour = -1;
    out.hole = ease(between(p, .119, .16)); out.ring = ease(between(p, .119, .1375));
    out.crumbs = 0; out.crumbsAt = HOLE_X;
    out.book = 'none'; out.bookX = 0; out.bookY = 0; out.bookRot = 0; out.bookAlpha = 1;
    const aim = (l, r = l) => { out.eyeAim[0] = l; out.eyeAim[1] = r; out.aimed = true; };
    const t = p * 8; // seconds of the first tween, for readable timings

    // --- part A: the drop, the peek, the first look, the float, the hold --------------
    if (p > .04375 && p < .119) {
        const u = between(p, .04375, .11875);
        out.drop = u; out.dropAlpha = reducedMotion ? (u < .5 ? 1 - u * 2 : (u - .5) * 2) : 1;
    }
    // the landing: a crown of water, a wet ring, grains of sand hopping
    if (p >= .119 && p < .1375) {
        out.impact = between(p, .119, .1368);
        if (!reducedMotion) { out.crumbs = .7 * Math.sin(Math.PI * between(p, .119, .1305)); out.crumbsAt = HOLE_X; }
    }
    if (p >= .1375 && p < .325) {
        // periscope: the left stalk leads, then both crane to see
        out.y = 76 - 28 * ease(between(p, .1375, .19));
        out.eyeLift[0] = -8 + 8 * ease(between(p, .1375, .17));
        out.eyeLift[1] = -8 + 8 * ease(between(p, .1475, .18));
        // still asleep as the stalks come up; then the eyes pop open, and blink once
        if (p < .172 || (!reducedMotion && p > .191 && p < .199)) out.eyeFrame = 'blink';
        else if (p < .19) { out.eyeFrame = 'open'; out.eyeWide = reducedMotion ? 0 : .5 * Math.sin(Math.PI * between(p, .172, .19)); }
        if (p >= .2 && p < .231) out.facing = t < 1.72 ? -1 : 1; // the bucket first, then the horse
        if (p >= .231) {
            // three saccades up the leg: hoof, leg, shell
            const lift = 3.5 * ease(between(p, .231, .3));
            out.eyeLift[0] = out.eyeLift[1] = lift;
            const target = reducedMotion ? HOOF + (SHELL - HOOF) * ease(between(p, .231, .325))
                : p < .2625 ? HOOF : p < .294 ? HOOF + (LEG - HOOF) * ease(between(p, .2625, .27))
                    : LEG + (SHELL - LEG) * ease(between(p, .294, .3015));
            aim(target);
            out.eyeFrame = 'open';
        } else if (p >= .2) aim(HOOF * ease(between(p, .2, .231)));
    }
    if (p >= .325) {
        out.eyeLift[0] = out.eyeLift[1] = 3.5;
        out.eyeFrame = 'open';
        aim(SHELL);
    }
    if (p >= .325 && p < .4125) {
        // mesmerised: he floats up out of the sand without bracing
        const u = between(p, .325, .4125);
        out.y = 48 * (1 - ease(u));
        out.pose = 'awe'; out.mouth = 'o';
        out.eyeWide = .6 * ease(u);
        out.crumbs = reducedMotion ? 0 : Math.sin(Math.PI * u);
        out.crumbsAt = HOLE_X;
        out.pour = reducedMotion ? -1 : u; // sand pours off his shell as he rises
    }
    if (p >= .369 && p < .86875) {
        // the notebook slips from his claw and lies flat on the sand beside him
        const fall = between(p, .369, .39);
        out.book = p < .39 ? 'fall' : p < .83125 ? 'sand' : 'catch';
        if (out.book === 'fall') {
            const fromY = out.y - 21, arc = reducedMotion ? 0 : Math.sin(Math.PI * fall) * 10;
            out.bookX = HOLE_X - 4.6 + (BOOK_X - HOLE_X + 4.6) * ease(fall);
            out.bookY = fromY + (0 - fromY) * ease(fall) - arc;
            out.bookRot = BOOK_ROT - 2.2 * (1 - ease(fall));
            out.bookAlpha = reducedMotion ? 1 - fall : 1;
        } else if (out.book === 'sand') {
            out.bookX = BOOK_X; out.bookY = 0; out.bookRot = BOOK_ROT;
            out.bookAlpha = reducedMotion ? ease(between(p, .39, .41)) : 1;
        }
    }
    if (p >= .4125 && p < .4625) {
        // two sideways steps back, to take in the whole creature
        const u = between(p, .4125, .4625);
        out.y = 0; out.x = HOLE_X + (BACK_X - HOLE_X) * ease(u);
        out.walk = Math.sin(Math.PI * u);
        out.pose = 'awe'; out.mouth = 'o'; out.eyeWide = .6 + .2 * ease(u);
    }
    if (p >= .4625 && p <= OPENING_KLO_HOLD) {
        // the held gaze: wide eyes, a quiver, and his first question
        out.y = 0; out.x = BACK_X; out.pose = 'awe'; out.mouth = 'o';
        out.eyeWide = .8 + .2 * ease(between(p, .4625, .5));
        out.stars = ease(between(p, .47, .51));
        out.tremble = reducedMotion ? 0 : 1;
        out.mark = '?'; out.markAlpha = ease(between(p, .4625, .5));
        out.markScale = reducedMotion ? 1 : .6 + .4 * ease(between(p, .4625, .495));
    }

    // --- part B: the toss, the double take, the leap, the notebook ------------------
    const b = (p - OPENING_KLO_HOLD) * 8; // seconds into the second tween
    if (p > OPENING_KLO_HOLD && p < .75625) {
        out.y = 0; out.x = BACK_X; out.eyeWide = 1; out.pose = 'awe'; out.mouth = 'o';
        out.eyeLift[0] = out.eyeLift[1] = 3.5;
        out.stars = 1 - ease(between(b, 0, .6));
        // the question mark lingers a moment, then goes
        out.mark = '?'; out.markAlpha = 1 - ease(between(b, 0, .44));
        if (p < .63125) {
            // toss: both eyes follow the mane up
            const up = ease(between(b, .15, .35));
            aim(SHELL + (MANE - SHELL) * up);
        } else if (p < .69375) {
            // the horse stamps: the eyes whip between the hooves (horse!) and the mane
            if (reducedMotion) aim(b < 1.1 ? HOOF : MANE);
            else {
                const snaps = [.85, .99, 1.1, 1.19, 1.27], looks = [HOOF, MANE, HOOF, MANE, HOOF];
                let k = 0;
                for (let i = 0; i < snaps.length; i++) if (b >= snaps[i]) k = i;
                aim(looks[k]);
                out.rotation = Math.sin(b * 60) * .012 * (1 - between(b, .85, 1.35));
            }
        } else if (p < .73125) {
            // split: one eye on the turtle half, one on the horse half
            aim(MANE, HOOF);
            out.tremble = reducedMotion ? 0 : 1;
        } else {
            // anticipation: low, claws in, eyes squeezed shut
            out.crouch = reducedMotion ? 0 : ease(between(b, 1.65, 1.8));
            out.eyeFrame = 'blink';
            aim(MANE);
        }
    }
    if (p >= .75625 && p < .83125) {
        const u = between(p, .75625, .83125);
        out.x = BACK_X + (TAKE_X - BACK_X) * ease(u);
        out.y = reducedMotion ? 0 : -34 * Math.sin(Math.PI * u);
        out.rotation = reducedMotion ? 0 : -.05 * Math.sin(Math.PI * u);
        out.crouch = reducedMotion ? 0 : 1 - ease(between(u, 0, .2));
        out.pose = 'happy'; out.eyeWide = 1; out.eyeFrame = 'open';
        out.eyeLift[0] = out.eyeLift[1] = 3.5;
        aim(MANE);
        out.mark = '!'; out.markAlpha = ease(between(u, 0, .25));
        out.markScale = reducedMotion ? 1 : 1 + .2 * Math.sin(Math.PI * between(u, 0, .5));
        out.crumbs = reducedMotion ? 0 : Math.sin(Math.PI * between(u, 0, .6));
        out.crumbsAt = BACK_X;
    }
    if (p >= .83125 && p < .86875) {
        // he snatches up the notebook he dropped
        const u = between(p, .83125, .86875);
        out.x = TAKE_X; out.y = 0; out.pose = 'notebook'; out.eyeWide = 1;
        out.eyeLift[0] = out.eyeLift[1] = 3.5;
        out.mark = '!'; out.markAlpha = 1 - ease(u);
        aim(HOOF);
        const toX = TAKE_X - 4.6, toY = -21, arc = reducedMotion ? 0 : Math.sin(Math.PI * u) * 14;
        out.bookX = BOOK_X + (toX - BOOK_X) * ease(u);
        out.bookY = toY * ease(u) - arc;
        out.bookRot = BOOK_ROT * (1 - ease(u));
        out.bookAlpha = reducedMotion ? 1 - u : 1;
    }
    if (p >= .86875 && p < 1) {
        // research at once: scribbling while he scuttles up to the horse
        const u = between(p, .86875, 1);
        out.x = TAKE_X + (0 - TAKE_X) * ease(u);
        out.y = 0; out.walk = Math.sin(Math.PI * u);
        out.pose = 'notebook'; out.scribble = 1; out.eyeWide = 1 - .5 * ease(u);
    }
    if (p >= 1) { out.x = 0; out.y = 0; out.pose = 'notebook'; }
    return out;
}

/** Pencil emanata in Klo's own shell red: his thoughts, not Alva's marks. */
function drawMark(g, kind) {
    const style = { width: 2.6, color: 0xa8402c, alpha: .92, cap: 'round', join: 'round' };
    if (kind === '?') {
        g.moveTo(-6, -14).quadraticCurveTo(-5, -22, 1, -22).quadraticCurveTo(8, -21, 6, -14)
            .quadraticCurveTo(4, -9, 0, -7).lineTo(0, -2).stroke(style);
        g.circle(0, 4, 1.8).fill({ color: 0xa8402c, alpha: .92 });
    } else {
        g.moveTo(0, -22).lineTo(.6, -3).stroke({ ...style, width: 3.2 });
        g.circle(.4, 4, 2).fill({ color: 0xa8402c, alpha: .92 });
        for (const [x0, y0, x1, y1] of [[-8, -20, -13, -25], [8, -20, 13, -25], [-10, -10, -16, -10], [10, -10, 16, -10]]) {
            g.moveTo(x0, y0).lineTo(x1, y1).stroke({ ...style, width: 1.6, alpha: .7 });
        }
    }
    return g;
}

export function createOpeningKlo(PIXI, { parent, texture, x, y, scale = 1, dropFrom = null, reducedMotion = false }) {
    const container = new PIXI.Container();
    container.label = 'opening-klo';
    container.position.set(x, y);
    container.scale.set(scale);
    parent.addChild(container);

    const hole = new PIXI.Container();
    hole.label = 'opening-klo-hole';
    hole.x = HOLE_X;
    const shade = new PIXI.Graphics();
    for (let i = 3; i >= 0; i--) shade.ellipse(0, 0, 19 + i * 3, 3 + i * .8)
        .fill({ color: 0x6e573f, alpha: .05 + (3 - i) * .018 });
    // Short, irregular pencil strokes preserve the grain of the painted beach.
    const rim = new PIXI.Graphics();
    for (let i = 0; i < 7; i++) {
        const gx = -23 + i * 7;
        rim.moveTo(gx, 1.1 + (i % 3) * .35).lineTo(gx + 4.3, 2 + (i % 2) * .4)
            .stroke({ width: 1.05, color: 0x806044, alpha: .32 });
    }
    // where the drop landed: two blue pencil arcs in the wet sand
    const ring = new PIXI.Graphics();
    ring.moveTo(-15, 1).quadraticCurveTo(0, -4, 15, 1).stroke({ width: 1.2, color: 0x4f7fb8, alpha: .7, cap: 'round' });
    ring.moveTo(-9, 2.6).quadraticCurveTo(0, -.6, 9, 2.6).stroke({ width: 1, color: 0x4f7fb8, alpha: .55, cap: 'round' });
    hole.addChild(shade, ring);
    container.addChild(hole);

    const rig = createKlo(PIXI, { texture });
    rig.container.label = 'opening-klo-parts';
    const groundMask = new PIXI.Graphics().rect(-150, -160, 300, 160.5).fill(0xffffff);
    groundMask.label = 'opening-klo-soil-mask';
    container.addChild(rig.container, groundMask);
    rig.container.mask = groundMask;
    rim.x = HOLE_X;
    container.addChild(rim);

    // The professor's notebook: it slips from his claw, lies on the sand, and
    // his leap kicks it back up. The same tiny paper prop as his ordinary rig.
    const looseBook = new PIXI.Sprite(texture('klo-part-book') || PIXI.Texture.EMPTY);
    looseBook.anchor.set(.5, 1);
    looseBook.label = 'opening-klo-notebook';
    looseBook.visible = false;
    container.addChild(looseBook);

    // --- the drop from the shell -------------------------------------------------------
    const dropTex = texture('p-drop');
    const makeDrop = (label) => {
        const d = dropTex ? new PIXI.Sprite(dropTex) : new PIXI.Graphics().circle(0, 0, 5).fill({ color: 0x8fbfe0 });
        d.anchor?.set?.(.5); d.visible = false; d.label = label; return d;
    };
    // wet sand under the landing: a darker patch that soaks in
    const wet = new PIXI.Graphics();
    wet.ellipse(0, .4, 21, 4.8).fill({ color: 0x6f5134, alpha: .5 });
    wet.ellipse(-2, 0, 13, 3).fill({ color: 0x55391f, alpha: .42 });
    for (let i = 0; i < 6; i++) wet.moveTo(-15 + i * 5.6, .6 + (i % 2) * .8).lineTo(-11.5 + i * 5.6, 1.4)
        .stroke({ width: .8, color: 0x4f3a24, alpha: .35 });
    wet.x = HOLE_X; wet.visible = false; wet.label = 'opening-klo-wet';
    container.addChildAt(wet, container.getChildIndex(hole));
    // its shadow on the sand darkens and tightens as it comes down
    const shadow = new PIXI.Graphics();
    shadow.ellipse(0, 0, 7, 1.8).fill({ color: 0x5f4329, alpha: .45 });
    shadow.x = HOLE_X; shadow.visible = false; shadow.label = 'opening-klo-drop-shadow';
    container.addChildAt(shadow, container.getChildIndex(hole) + 1);
    const trail = new PIXI.Graphics(); trail.label = 'opening-klo-drop-trail';
    // the drop, with paper-white light on it so it reads against her blue sea
    const drop = new PIXI.Container(); drop.label = 'opening-klo-drop'; drop.visible = false;
    const dropArt = makeDrop('opening-klo-drop-art'); dropArt.visible = true;
    const shine = new PIXI.Graphics();
    shine.ellipse(-2.2, -2.6, 1.8, 2.8).fill({ color: 0xffffff, alpha: .95 });
    shine.ellipse(2.4, 2.4, .8, 1.2).fill({ color: 0xffffff, alpha: .7 });
    drop.addChild(dropArt, shine);
    // after the crown, a little jet of water rises from the hole and lets go of one bead
    const jet = new PIXI.Graphics(); jet.label = 'opening-klo-jet';
    const bead = makeDrop('opening-klo-bead');
    // two smaller drops thrown by the same shake land short: plip, plip ... PLIP
    const minor = [{ to: 40, lift: 22, from: 0, until: .55, size: .5 }, { to: 22, lift: 30, from: .1, until: .74, size: .42 }]
        .map((m, i) => ({ ...m, s: makeDrop('opening-klo-minor-drop-' + i), ring: new PIXI.Graphics() }));
    for (const m of minor) {
        m.ring.ellipse(0, 0, 6, 1.5).stroke({ width: .9, color: 0x4f7fb8, alpha: .7 });
        m.ring.visible = false;
    }
    const glint = new PIXI.Graphics();
    glint.poly([0, -7, 1.4, -1.4, 7, 0, 1.4, 1.4, 0, 7, -1.4, 1.4, -7, 0, -1.4, -1.4]).fill({ color: 0xfffbe6, alpha: .95 })
        .stroke({ width: .8, color: 0x8fbfe0, alpha: .9, join: 'round' });
    glint.visible = false; glint.label = 'opening-klo-drop-glint';
    // the crown the drop throws up when it lands, in slow motion
    const crown = Array.from({ length: 7 }, (_, i) => {
        const c = new PIXI.Graphics();
        const r = 2.6 + (i % 3) * .8;
        c.ellipse(0, 0, r, r * 1.3).fill({ color: 0xf4f9ff, alpha: .97 }).stroke({ width: 1, color: 0x244f8f, alpha: .9 });
        c.visible = false; container.addChild(c);
        return { c, angle: -Math.PI * (.1 + .8 * i / 6), speed: 20 + (i % 2) * 9 + (i % 3) * 4 };
    });
    container.addChild(trail, ...minor.flatMap(m => [m.ring, m.s]), jet, bead, drop, glint);

    const marks = { '?': drawMark(new PIXI.Graphics(), '?'), '!': drawMark(new PIXI.Graphics(), '!') };
    for (const [kind, g] of Object.entries(marks)) { g.label = `opening-klo-mark-${kind === '?' ? 'question' : 'exclaim'}`; g.visible = false; container.addChild(g); }

    // Starstruck: three tiny four-point pencil stars twinkle around his eyes.
    const stars = [[-17, -62, 1], [18, -66, .8], [2, -78, .65]].map(([sx, sy, size], i) => {
        const g = new PIXI.Graphics();
        g.poly([0, -6, 1.3, -1.3, 6, 0, 1.3, 1.3, 0, 6, -1.3, 1.3, -6, 0, -1.3, -1.3]).fill({ color: 0xf6d25a, alpha: .95 })
            .stroke({ width: .9, color: 0xb8862b, alpha: .8, join: 'round' });
        g.label = 'opening-klo-star'; g.visible = false; container.addChild(g);
        return { g, sx, sy, size, phase: i * 2.1 };
    });

    // sand pouring off his shell as he rises, and a soft puff where it lands
    const pour = Array.from({ length: 16 }, (_, i) => {
        const g = new PIXI.Graphics().poly([-1.8, 0, .6, -1.9, 2.9, .2, .3, 1.3])
            .fill({ color: i % 3 ? 0xc2a268 : 0x977650, alpha: .8 });
        g.visible = false; container.addChild(g);
        const k = (i * .618) % 1;
        return { g, x: -17 + 34 * k, y0: -30 - 8 * Math.sin(Math.PI * k), start: .22 + .5 * ((i * .37) % 1), drift: (k - .5) * 9 };
    });
    const puff = new PIXI.Graphics();
    for (const [px, rx, ry] of [[-14, 11, 3.2], [0, 15, 4], [15, 11, 3]]) puff.ellipse(px, -2, rx, ry).fill({ color: 0xd9c29a, alpha: .35 });
    puff.visible = false; puff.label = 'opening-klo-dust';
    container.addChild(puff);

    const crumbs = [];
    for (let i = 0; i < 9; i++) {
        const grain = new PIXI.Graphics().poly([-1.2, 0, .5, -1.4, 2.1, .1, .3, .9])
            .fill({ color: i % 2 ? 0xc2a268 : 0x977650, alpha: .63 });
        grain.visible = false;
        container.addChild(grain);
        crumbs.push(grain);
    }

    const actor = { visible: true, scene: 'paper', x: HOLE_X, y: 76, facing: 1,
        pose: 'idle', pop: 0, inHole: false, holding: true, distance: 0, vx: 0 };
    const localHero = { x: 0, y: 0 };
    const options = { scene: 'paper', time: 0, dt: 0, hero: localHero, talking: false, reducedMotion: false };
    const motion = {};
    const from = dropFrom || { x: 90, y: -120 };
    // A parabola from the shell rim to his hole: up and back first, then down.
    const LIFT = 42, toY = -3;
    const dropAt = (u) => [from.x + (HOLE_X - from.x) * u, from.y + (toY - from.y) * u - 4 * LIFT * u * (1 - u)];
    const dropVel = (u) => [HOLE_X - from.x, (toY - from.y) - 4 * LIFT * (1 - 2 * u)];
    const vMax = Math.max(Math.hypot(...dropVel(0)), Math.hypot(...dropVel(1)));
    let progress = 0, pose = 'notebook', time = 0, dead = false;
    const lessMotion = () => typeof reducedMotion === 'function' ? !!reducedMotion() : !!reducedMotion;

    function render(dt = 0, hero, talking = false) {
        if (dead) return;
        const less = lessMotion();
        sampleOpeningKlo(progress, less, motion);
        container.openingKloStage = motion.stage;
        container.openingKloProgress = motion.progress;
        container.visible = progress > 0;
        actor.visible = progress >= .1375;
        actor.x = motion.x;
        actor.y = motion.y;
        actor.pose = progress < 1 ? motion.pose : pose;
        actor.distance = (actor.distance || 0) + Math.abs(motion.walk) * dt * 60;
        actor.vx = motion.walk * 95;
        if (hero) {
            localHero.x = (hero.x - x) / scale;
            localHero.y = (hero.y - y) / scale;
        }
        actor.facing = motion.facing ?? (Math.sign(localHero.x - actor.x) || actor.facing);
        // A living hold: tiny eye flicks while he stares, and during research
        // the eyes dart between the horse and the notebook.
        let aim = motion.aimed ? motion.eyeAim : null;
        if (aim && !less && motion.stage === 'awe' && progress >= OPENING_KLO_HOLD - 1e-6) {
            const flick = Math.floor(time / 1.3) % 3 === 1 ? .05 : 0;
            aim = [aim[0] + flick, aim[1] + flick];
        }
        if (motion.stage === 'research' && !less) aim = Math.floor(time * 4) % 2 ? [SHELL, SHELL] : [.32, .32];
        actor.eyeAim = progress < 1 ? aim : null;
        actor.eyeLift = progress < 1 ? motion.eyeLift : null;
        actor.eyeWide = progress < 1 ? motion.eyeWide : 0;
        actor.eyeFrame = progress < 1 ? motion.eyeFrame : null;
        actor.tremble = progress < 1 ? motion.tremble : 0;
        actor.crouch = progress < 1 ? motion.crouch : 0;
        actor.scribble = progress < 1 ? motion.scribble : 0;
        actor.mouth = progress < 1 ? motion.mouth : null;
        actor.holding = progress < 1;
        options.time = time;
        options.dt = dt;
        options.talking = progress >= OPENING_KLO_HOLD - 1e-6 && talking;
        options.reducedMotion = less;
        rig.update(actor, options);
        rig.container.rotation = motion.rotation;
        // Until he is out of the sand, the soil edge hides the rest of him.
        const buried = progress < .4125;
        rig.container.mask = buried ? groundMask : null;
        groundMask.visible = buried;
        // the sand trembles over his head once the drop has woken him
        const twitch = !less && progress > .1305 && progress < .1375 ? Math.sin(time * 42) * 1.1 : 0;
        hole.x = HOLE_X + twitch;
        hole.alpha = motion.hole * (1 - .22 * ease(between(progress, .856, 1)));
        rim.alpha = motion.hole;
        ring.alpha = motion.ring * (1 - .75 * ease(between(progress, .16, .3)));
        ring.scale.set(.4 + .6 * motion.ring, 1);
        // the drop: flung up and back off the shell, then falling, wobbling,
        // streamlined along its flight, into his hole
        drop.visible = motion.drop >= 0;
        trail.clear(); glint.visible = false;
        if (drop.visible) {
            const u = motion.drop;
            if (less) {
                drop.position.set(u < .5 ? from.x : HOLE_X, u < .5 ? from.y : toY);
                drop.rotation = 0; drop.scale.set(1.4);
            } else {
                const [px, py] = dropAt(u), [vx, vy] = dropVel(u);
                drop.position.set(px, py);
                drop.rotation = Math.atan2(-vy, -vx) + Math.PI / 2;
                const speed = Math.min(1, Math.hypot(vx, vy) / vMax);
                const wobble = Math.sin(u * 22) * .1 * (1 - u * .5);
                drop.scale.set(1.5 * (1 + wobble) / Math.sqrt(1 + .35 * speed), 1.5 * (1 - wobble) * (1 + .35 * speed));
                // a pencil trail of the path it has flown
                for (let k = 1; k <= 7; k++) {
                    const a = u - k * .03, b = a - .014;
                    if (b < 0) break;
                    trail.moveTo(...dropAt(a)).lineTo(...dropAt(b)).stroke({ width: 1.8, color: 0xf4f9ff, alpha: .75 * (1 - k / 8), cap: 'round' });
                    trail.moveTo(...dropAt(a)).lineTo(...dropAt(b)).stroke({ width: .9, color: 0x4f7fb8, alpha: .55 * (1 - k / 8), cap: 'round' });
                }
                // at the top of its flight it catches the sun
                const g = between(u, .24, .5);
                if (g > 0 && g < 1) {
                    glint.visible = true;
                    glint.position.set(px + 7, py - 10);
                    glint.scale.set(.35 + .8 * Math.sin(Math.PI * g));
                    glint.rotation = g * 1.6;
                    glint.alpha = Math.sin(Math.PI * g);
                }
            }
            drop.alpha = motion.dropAlpha;
        }
        shadow.visible = motion.drop > .45 && !less;
        if (shadow.visible) {
            const k = between(motion.drop, .45, 1);
            shadow.scale.set(1.6 - .8 * k, 1);
            shadow.alpha = .2 + .8 * k;
        }
        // the jet: rises from the hole after the crown, pinches off one bead
        jet.clear(); bead.visible = false;
        if (motion.impact > .28 && !less) {
            const k = between(motion.impact, .28, 1);
            const h = 22 * Math.sin(Math.PI * Math.min(1, k * 1.25));
            if (h > .5 && k < .8) {
                jet.moveTo(HOLE_X - 2.6, toY).quadraticCurveTo(HOLE_X - 1.2, toY - h * .6, HOLE_X, toY - h)
                    .quadraticCurveTo(HOLE_X + 1.2, toY - h * .6, HOLE_X + 2.6, toY).closePath()
                    .fill({ color: 0xf4f9ff, alpha: .95 }).stroke({ width: 1, color: 0x244f8f, alpha: .85 });
            }
            const bk = between(k, .35, 1);
            if (bk > 0 && bk < 1) {
                bead.visible = true;
                bead.position.set(HOLE_X + 2 * bk, toY - 20 - 26 * bk + 46 * bk * bk);
                bead.scale.set(.75); bead.rotation = 0;
                bead.alpha = 1 - ease(between(bk, .85, 1));
            }
        }
        for (const m of minor) {
            const u = motion.drop >= 0 ? motion.drop : progress >= .119 && progress < .1375 ? 1 : -1;
            const k = u < 0 || less ? -1 : between(u, m.from, m.until);
            m.s.visible = k > 0 && k < 1;
            if (m.s.visible) {
                const x0 = from.x - 6, y0 = from.y + 6;
                m.s.position.set(x0 + (m.to - x0) * k, y0 + (0 - y0) * k * k - 4 * m.lift * k * (1 - k));
                m.s.scale.set(m.size);
                m.s.rotation = Math.atan2(-((0 - y0) * 2 * k - 4 * m.lift * (1 - 2 * k)), -(m.to - x0)) + Math.PI / 2;
            }
            // a tiny ring where each one lands, gone again in a moment
            const r = u < 0 || less ? -1 : between(u, m.until, m.until + .2);
            m.ring.visible = r > 0 && r < 1;
            if (m.ring.visible) { m.ring.position.set(m.to, 0); m.ring.scale.set(.5 + r); m.ring.alpha = 1 - r; }
        }
        // the landing, in slow motion: a crown of water and a patch of wet sand
        const hit = motion.impact;
        for (const c of crown) {
            c.c.visible = hit > 0 && hit < .92 && !less;
            if (!c.c.visible) continue;
            const k = hit / .92;
            c.c.position.set(HOLE_X + Math.cos(c.angle) * c.speed * k * 1.5, toY + Math.sin(c.angle) * c.speed * k * 1.6 + 30 * k * k);
            c.c.alpha = 1 - ease(between(k, .6, 1));
        }
        wet.visible = progress >= .119 && progress < .4125;
        if (wet.visible) {
            wet.scale.set(.3 + .7 * ease(between(progress, .119, .13)), 1);
            wet.alpha = 1 - ease(between(progress, .325, .4125));
        }
        for (const q of pour) {
            const k = motion.pour < 0 ? -1 : between(motion.pour, q.start, q.start + .28);
            q.g.visible = k > 0 && k < 1;
            if (!q.g.visible) continue;
            const y0 = actor.y + q.y0;
            q.g.position.set(actor.x + q.x + q.drift * k, y0 + (0 - y0) * k * k);
            q.g.rotation = k * 4 * Math.sign(q.drift || 1);
            q.g.alpha = 1 - ease(between(k, .8, 1));
        }
        puff.visible = motion.pour > 0 && !less;
        if (puff.visible) {
            const k = between(motion.pour, .15, 1);
            puff.position.set(HOLE_X, 0);
            puff.scale.set(.6 + .8 * k, 1);
            puff.alpha = Math.sin(Math.PI * k) * .9;
        }
        looseBook.visible = motion.book !== 'none';
        if (looseBook.visible) {
            looseBook.position.set(motion.bookX, motion.bookY);
            looseBook.rotation = motion.bookRot;
            looseBook.alpha = motion.bookAlpha;
        }
        for (const [kind, g] of Object.entries(marks)) {
            g.visible = motion.mark === kind && motion.markAlpha > .01;
            if (!g.visible) continue;
            g.position.set(actor.x + 5, actor.y - 76);
            g.scale.set(motion.markScale);
            g.alpha = motion.markAlpha;
            g.rotation = less ? 0 : Math.sin(time * 2.6) * .06;
        }
        for (const st of stars) {
            st.g.visible = motion.stars > .01;
            if (!st.g.visible) continue;
            const twinkle = less ? 1 : .55 + .45 * Math.sin(time * 5.2 + st.phase);
            st.g.position.set(actor.x + st.sx, actor.y + st.sy);
            st.g.scale.set(st.size * (less ? 1 : .75 + .25 * twinkle));
            st.g.alpha = motion.stars * twinkle;
            st.g.rotation = less ? 0 : time * .8 + st.phase;
        }
        for (let i = 0; i < crumbs.length; i++) {
            const grain = crumbs[i];
            grain.visible = !less && motion.crumbs > .01;
            if (!grain.visible) continue;
            const side = i % 2 ? -1 : 1, spread = 1 - motion.crumbs;
            grain.position.set(motion.crumbsAt + side * (10 + i * 1.7 + spread * (11 + i * 1.9)),
                -motion.crumbs * (7 + (i % 4) * 3));
            grain.rotation = spread * side * (1.3 + i * .1);
            grain.alpha = motion.crumbs * .65;
        }
    }
    render();
    return {
        container,
        get stage() { return motion.stage; },
        /** where the drop is now (or the hole, once it has landed), in local units */
        dropPoint() { return motion.drop >= 0 && !lessMotion() ? dropAt(motion.drop) : [HOLE_X, toY]; },
        update({ time: now = time, dt = 1 / 60, hero, talking = false } = {}) {
            time = now;
            render(dt, hero, talking);
        },
        setEntrance(value) { progress = clamp(Number.isFinite(value) ? value : 0); render(); },
        setPose(value) { pose = value || 'idle'; render(); },
        react(now) { actor.reactAt = Number.isFinite(now) ? now : time; },
        destroy() {
            if (dead) return;
            dead = true;
            rig.container.mask = null;
            container.destroy({ children: true });
        }
    };
}
