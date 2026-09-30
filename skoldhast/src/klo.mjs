/* Professor Klo: small pencil parts, a sideways scuttle, and harmless research jokes.
 * Motion is sampled from game time/distance. No filters, per-frame geometry or timers.
 * Lettered story poses are separate, always at positive horizontal scale. */
import { sampleKloArrival } from './klo-arrival.mjs';

const TAU = Math.PI * 2;
const SIZE = 0.92;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (v) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const damp = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));
export const KLO_LETTERED = new Set(['signs', 'sign-left', 'sign-right', 'sign-folded', 'map-corner']);
export const KLO_TAP_COOLDOWN = 5.2;

/** Fisher-Yates bag, with no immediate repeat at the boundary between bags either. */
export function createShuffleBag(lines, random = Math.random) {
    const source = [...new Set(lines)];
    let bag = [], previous;
    return {
        next() {
            if (!source.length) return null;
            if (!bag.length) {
                bag = [...source];
                for (let i = bag.length - 1; i > 0; i--) {
                    const j = Math.min(i, Math.floor(random() * (i + 1)));
                    [bag[i], bag[j]] = [bag[j], bag[i]];
                }
                if (bag.length > 1 && bag.at(-1) === previous) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
            }
            return previous = bag.pop();
        }
    };
}

/** Keep the gates in one pure place; a rejected tap never spends a line from the bag. */
export function createKloReactions(lines, random = Math.random) {
    const bag = createShuffleBag(lines, random);
    let nextAt = -Infinity, count = 0;
    return {
        tap({ actor, time, scene, visible = false, busy = false, running = false, dialogue = false }) {
            if (!actor?.visible || actor.scene !== scene || actor.inHole || actor.pop > 0.05 || !visible || busy || running || dialogue || time < nextAt) return null;
            const line = bag.next();
            if (!line) return null;
            nextAt = time + KLO_TAP_COOLDOWN;
            return { line, count: ++count };
        }
    };
}

/** Authored walks ease at both ends; their speed and endpoint do not depend on rendering. */
export function beginKloWalk(actor, x, speed = 260, resolve = () => {}) {
    actor.walk = { x, from: actor.x, time: 0, duration: Math.max(0.28, Math.abs(x - actor.x) * 1.6 / speed), speed, resolve };
}
export function stepKloWalk(actor, dt, groundNear) {
    const walk = actor.walk;
    if (!walk) { actor.vx = 0; return; }
    const prev = actor.x;
    walk.time = Math.min(walk.duration, walk.time + dt);
    actor.x = walk.from + (walk.x - walk.from) * smooth(walk.time / walk.duration);
    actor.vx = (actor.x - prev) / dt;
    actor.distance = (actor.distance || 0) + Math.abs(actor.x - prev);
    actor.facing = Math.sign(walk.x - walk.from) || actor.facing;
    if (groundNear) {
        const y = groundNear(actor.x, actor.y, 45);
        if (y !== null && Number.isFinite(y)) actor.y = y;
    }
    if (walk.time >= walk.duration) {
        actor.x = walk.x; actor.vx = 0; actor.walk = null; walk.resolve?.();
    }
}

/** All visible motion values are local to Klo's ground point. */
export function sampleKlo(actor, { time = 0, underwater = false, talking = false, reducedMotion = false } = {}) {
    const moving = !!actor.walk || Math.abs(actor.vx || 0) > 1;
    const idle = !moving && !actor.inHole && !actor.holding && (actor.pose === 'idle' || !actor.pose);
    const cycle = time % 15;
    // One short, tiny sideways shuffle, then the professor checks his instruments.
    const shuffle = idle && cycle < 1.8 && !talking && !reducedMotion;
    const sideStep = shuffle ? Math.sin(cycle / 1.8 * TAU) * 7 : 0;
    const phase = (actor.distance || 0) / 38 * TAU + (shuffle ? cycle * 14 : 0);
    const activity = moving || shuffle ? 1 : underwater ? 0.22 : 0;
    const age = time - (actor.reactAt ?? -100);
    const hop = age >= 0 && age < 0.62 && !reducedMotion ? Math.sin(age / 0.62 * Math.PI) * 21 : 0;
    const happy = actor.pose === 'happy';
    const wave = age >= 0 && age < 1.4;
    const speak = talking || actor.talking || (actor.talkUntil || 0) > time;
    const fidget = actor.pose === 'stopwatch' || actor.pose === 'notebook' ? actor.pose : idle && cycle > 5 && cycle < 8 ? 'stopwatch' : idle && cycle > 10 && cycle < 13.5 ? 'notebook' : null;
    const blinkPhase = (time + 0.36) % 4.7;
    const blink = blinkPhase < 0.11 || (blinkPhase > 0.22 && blinkPhase < 0.29);
    return {
        phase, activity, sideStep, hop, happy, wave, speak, fidget, blink,
        bob: reducedMotion ? 0 : underwater ? Math.sin(time * 1.9) * 5 : -Math.abs(Math.sin(phase * 2)) * activity * 1.7 + Math.sin(time * 2.1) * 0.65,
        tilt: reducedMotion ? 0 : underwater ? Math.sin(time * 1.6) * 0.065 : clamp((actor.vx || 0) / 6500, -0.045, 0.045),
        lettered: !actor.walk && !actor.inHole && KLO_LETTERED.has(actor.pose)
    };
}

/**
 * Return one container; the scene owns and destroys it along with the other actors.
 * Optional actor fields for staged moments (all off when undefined):
 *   eyeAim [l, r]   stalk angles in radians (− leans back/up, + forward/down); replaces the automatic gaze
 *   eyeLift [l, r]  raise (+) or sink (−) each stalk, local units, −8 … 3.5
 *   eyeWide 0…1     wonder: slightly larger eyeballs
 *   eyeFrame        'open' | 'blink' holds the eyes; any value stops the automatic blink
 *   tremble 0…1     awestruck quiver of the stalks
 *   crouch 0…1      anticipation: body low, legs splayed, claws in
 *   scribble 0…1    in the notebook pose, the pencil arm races
 *   mouth 'o'       an amazed open mouth instead of his smile
 * The pose 'awe' lets the claws hang open. No part is ever scaled except the eyeballs.
 */
export function createKlo(PIXI, { texture }) {
    const container = new PIXI.Container();
    const shadow = new PIXI.Graphics();
    for (let i = 4; i >= 1; i--) shadow.ellipse(0, 0, 22 + i * 5, 2 + i * 1.1).fill({ color: 0x5d493d, alpha: 0.026 + (4 - i) * 0.009 });
    const art = new PIXI.Container();
    const torso = new PIXI.Container();
    const lettered = new PIXI.Sprite(texture('klo-signs') || PIXI.Texture.EMPTY);
    lettered.anchor.set(0.5, 1); lettered.visible = false;
    const arrivalBack = new PIXI.Container(), arrivalFront = new PIXI.Container();
    // Built once: all the visit's pencil marks, local occlusion and flecks are
    // transformed below. No filters, render textures or per-frame Graphics work.
    const groundMask = new PIXI.Graphics().rect(-220, -260, 440, 264).fill(0xffffff);
    groundMask.visible = false;
    container.addChild(shadow, arrivalBack, art, lettered, arrivalFront, groundMask);
    const sprite = (name, parent = art) => {
        const s = new PIXI.Sprite(texture(name) || PIXI.Texture.EMPTY);
        s.anchor.set(0.5, 1); parent.addChild(s); return s;
    };
    const joint = (name, x, y, parent = art) => {
        const c = new PIXI.Container(); c.pivot.set(x * SIZE, y * SIZE); c.position.copyFrom(c.pivot);
        parent.addChild(c); const s = sprite(name, c); return { c, s, x: x * SIZE, y: y * SIZE };
    };
    const legDefs = [[-14.5, -14.5], [-18.5, -16.5], [-22, -19], [14.5, -14.5], [18.5, -16.5], [22, -19]];
    const legs = [];
    for (const i of [2, 5, 1, 4, 0, 3]) legs[i] = joint('klo-part-leg-' + i, ...legDefs[i]);
    art.addChild(torso);
    const eyes = [-1, 1].map((s) => joint('klo-part-eye-' + (s < 0 ? 'l' : 'r'), s * 7.5, -41, torso));
    eyes.forEach((eye, i) => { eye.c.label = 'klo-eye-' + (i ? 'r' : 'l'); });
    const body = sprite('klo-part-body', torso);
    // Eye stalks start behind the shell; the eyeballs are well above its silhouette.
    const arms = [-1, 1].map((s) => joint('klo-part-arm-' + (s < 0 ? 'l' : 'r'), s * 21.5, -22, torso));
    const watch = sprite('klo-part-watch', arms[1].c); watch.position.set(33 * SIZE, -29 * SIZE);
    const book = sprite('klo-part-book', torso); book.position.set(-5 * SIZE, -23 * SIZE);
    const pencil = sprite('klo-part-pencil', arms[1].c); pencil.position.set(33 * SIZE, -29 * SIZE);
    const slit = new PIXI.Graphics();
    slit.ellipse(0, 1, 37, 4).fill({ color: 0x9b7a50, alpha: 0.32 });
    for (let i = 0; i < 17; i++) {
        const x = (i - 8) * 5;
        slit.moveTo(x, 2 + i % 3).lineTo(x + 3, 1 + i % 3).stroke({ color: 0xbaa079, width: 1, alpha: 0.62 });
    }
    arrivalBack.addChild(slit);
    const plank = new PIXI.Graphics();
    plank.moveTo(-44, 3).lineTo(-14, 1).lineTo(20, 2).lineTo(46, 0).stroke({ color: 0x92795d, width: 2, alpha: 0.65 });
    plank.moveTo(-40, 5).lineTo(3, 4).lineTo(42, 3).stroke({ color: 0xe9d9ad, width: 2, alpha: 0.8 });
    arrivalFront.addChild(plank);
    const propCover = sprite('rock-1', arrivalFront);
    const droppedPencil = sprite('klo-part-pencil', arrivalFront);
    const fronds = [-1, 1].map(side => {
        const group = new PIXI.Container(); arrivalFront.addChild(group);
        const fallback = new PIXI.Graphics();
        for (let k = 0; k < 3; k++) fallback.moveTo(0, 0).bezierCurveTo(side * 19, -30, -side * 15, -62, side * 8, -100)
            .stroke({ color: k === 0 ? 0x709b57 : k === 1 ? 0x92ae69 : 0x456e4b, width: [15, 8, 2][k], alpha: [0.8, 0.72, 0.5][k] });
        const picture = sprite('kelp-strip', group); group.addChild(fallback); group.setChildIndex(fallback, 0);
        return { group, picture, fallback, side };
    });
    const grains = Array.from({ length: 12 }, (_, i) => {
        const g = new PIXI.Graphics().ellipse(0, 0, 1.4 + i % 3, 0.9 + i % 2)
            .fill({ color: i % 3 === 0 ? 0xa58a60 : i % 3 === 1 ? 0xd5b982 : 0xeee2ba, alpha: 0.9 });
        arrivalFront.addChild(g); return g;
    });
    const bubbles = Array.from({ length: 7 }, (_, i) => {
        const r = 2.8 + i % 3;
        const g = new PIXI.Graphics().circle(0, 0, r).stroke({ color: 0xa9c9cf, width: 1.2, alpha: 0.68 });
        g.moveTo(-r * 0.4, -r * 0.5).lineTo(r * 0.1, -r * 0.65).stroke({ color: 0xf9f4da, width: 1.2, alpha: 0.82 });
        arrivalBack.addChild(g); return g;
    });
    const fluff = new PIXI.Graphics();
    for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU;
        fluff.moveTo(0, 0).lineTo(Math.cos(a) * 7, Math.sin(a) * 5).stroke({ color: 0xf4e8bd, width: 1.2, alpha: 0.9 });
    }
    fluff.circle(0, 0, 1.4).fill(0xb09870); arrivalFront.addChild(fluff);
    const leaf = new PIXI.Graphics();
    leaf.moveTo(-8, 0).bezierCurveTo(-3, -7, 8, -7, 12, -3).bezierCurveTo(7, 3, -3, 5, -8, 0)
        .fill({ color: 0x6d9959, alpha: 0.95 }).stroke({ color: 0x497b4d, width: 1, alpha: 0.75 });
    leaf.moveTo(-7, 0).lineTo(10, -3).stroke({ color: 0xb0be77, width: 1, alpha: 0.8 });
    arrivalFront.addChild(leaf);
    const pageRest = new PIXI.Graphics();
    // An unmistakable folded page edge even against pale clouds or the sun.
    // Keep the original footprint: this is a drawn perch, never new terrain.
    pageRest.moveTo(-51, -3).lineTo(42, -6).lineTo(58, -8).lineTo(61, 9).lineTo(-49, 12).closePath()
        .fill(0xfff9e9).stroke({ color: 0x766651, width: 1.3, alpha: 0.88 });
    pageRest.moveTo(-50, 7).lineTo(44, 4).lineTo(61, 9).lineTo(-49, 12).closePath()
        .fill({ color: 0xd8c7a5, alpha: 0.9 });
    pageRest.moveTo(-49, 8).lineTo(43, 5).lineTo(58, 9).stroke({ color: 0x877254, width: 1.4, alpha: 0.8 });
    pageRest.moveTo(42, -6).lineTo(58, -8).lineTo(48, 6).closePath()
        .fill(0xf2e4c5).stroke({ color: 0x877254, width: 1.1, alpha: 0.8 });
    pageRest.moveTo(-43, -2).lineTo(-42, 7).stroke({ color: 0xb98473, width: 1, alpha: 0.75 });
    for (const y of [0, 4]) pageRest.moveTo(-36, y).lineTo(34, y - 2)
        .stroke({ color: 0x9aa7af, width: 0.7, alpha: 0.52 });
    arrivalBack.addChild(pageRest);

    function updateArrival(actor, e, reducedMotion) {
        arrivalBack.visible = arrivalFront.visible = e.active;
        groundMask.visible = e.mask;
        art.mask = e.mask ? groundMask : null;
        if (!e.active) return;
        const c = actor.companion, p = e.progress, material = /^(sand|grass|pool|cliff)$/.test(e.kind);
        const moving = p < 1 && !reducedMotion;
        slit.visible = e.kind === 'sand' && moving;
        slit.alpha = Math.sin(p * Math.PI) * 0.9;
        slit.scale.x = 0.55 + Math.sin(p * Math.PI) * 0.5;
        plank.visible = /^(wood|pier|gallery)$/.test(e.kind) && moving;
        plank.alpha = Math.sin(p * Math.PI) * 0.8;
        droppedPencil.visible = e.kind === 'gallery' && moving && p > 0.46 && p < 0.96;
        if (droppedPencil.visible) {
            const fall = smooth((p - 0.46) / 0.22), retrieve = smooth((p - 0.82) / 0.14);
            droppedPencil.position.set((25 + fall * 8 - retrieve * 5) * (c.facing || 1), -67 + fall * 67 - retrieve * 28);
            droppedPencil.rotation = (fall * 1.1 - retrieve * 0.8) * (c.facing || 1);
            droppedPencil.alpha = smooth((p - 0.46) / 0.045) * (1 - retrieve);
        }
        const propTexture = c.prop?.sprite && texture(c.prop.sprite);
        propCover.visible = !!propTexture && /^(pool|cliff|vault|grass)$/.test(e.kind) && moving;
        if (propCover.visible) {
            propCover.texture = propTexture; propCover.scale.set(c.prop.scale || 1);
            propCover.position.set(c.prop.x - actor.x, c.prop.y - actor.y);
            // It exactly covers the existing scenery, then yields to that sprite.
            propCover.alpha = 1 - smooth((p - 0.74) / 0.26);
        }
        fronds.forEach(f => {
            f.group.visible = e.foliage > 0.001 && !reducedMotion;
            if (!f.group.visible) return;
            const kelp = e.kind === 'kelp', tex = texture(kelp ? 'kelp-strip' : 'feathergrass-' + (f.side < 0 ? '2' : '1'));
            f.picture.visible = !!tex; f.fallback.visible = !tex;
            if (tex) { f.picture.texture = tex; f.picture.width = kelp ? 31 : 68; f.picture.height = kelp ? 110 : 60; }
            f.group.position.set(f.side * (kelp ? 20 : 28), kelp ? 17 : 3);
            f.group.rotation = f.side * (0.05 + smooth(p) * (kelp ? 0.5 : 0.3)) + Math.sin(p * 31 + f.side) * 0.045 * (1 - p);
            f.group.alpha = e.foliage * 0.95;
        });
        grains.forEach((g, i) => {
            g.visible = material && e.particles > 0.001 && !reducedMotion;
            if (!g.visible) return;
            const t = clamp((p - 0.29 - i * 0.009) / 0.7, 0, 1), side = i % 2 ? 1 : -1;
            g.position.set(side * (9 + t * (24 + i * 3)), -Math.sin(t * Math.PI) * (9 + i * 2.4) + 3);
            g.rotation = t * side * (2 + i * 0.3); g.alpha = e.particles * (1 - t * 0.8);
        });
        bubbles.forEach((g, i) => {
            g.visible = !material && e.particles > 0.001 && !reducedMotion;
            if (!g.visible) return;
            const t = clamp((p - 0.13 - i * 0.035) / 0.9, 0, 1);
            g.position.set((i % 2 ? 1 : -1) * (23 + i * 3) + Math.sin(t * 5 + i) * 7, -15 - t * (36 + i * 4));
            g.alpha = e.particles * (1 - t * 0.65); g.scale.set(0.75 + t * 0.5);
        });
        fluff.visible = e.kind === 'grass' && e.fluff > 0.001;
        leaf.visible = e.kind === 'kelp' && e.fluff > 0.001;
        const float = smooth((e.time - 3.25) / 0.85);
        for (const fleck of [fluff, leaf]) {
            fleck.position.set(e.x + 9 + float * 21, e.y - 56 - float * 15);
            fleck.rotation = (fleck === leaf ? -0.22 : 0) + float * 1.2;
            fleck.alpha = e.fluff;
        }
        pageRest.visible = e.kind === 'margin'; pageRest.alpha = e.alpha;
    }
    let hole = 0, facing = 1, initialized = false;
    const setFrame = (s, name) => { const t = texture(name); if (t && s.texture !== t) s.texture = t; };
    function update(actor, { scene, time = 0, dt = 1 / 60, underwater = false, hero, talking = false, reducedMotion = false } = {}) {
        container.visible = !!actor?.visible && (!scene || actor.scene === scene);
        if (!container.visible) { initialized = false; return; }
        const visit = actor.companion, e = sampleKloArrival(visit, { reducedMotion });
        if (visit) { time = visit.time ?? time; underwater = visit.underwater ?? underwater; }
        if (!initialized) { hole = actor.inHole ? 1 : 0; facing = actor.facing || 1; initialized = true; }
        const targetHole = actor.inHole ? 1 : 0;
        hole = damp(hole, targetHole, targetHole ? 9 : 7, Math.min(dt, 0.1));
        const m = sampleKlo(actor, { time, underwater, talking, reducedMotion });
        if (visit) {
            m.sideStep = 0; m.hop = 0; m.wave = false;
            // talkUntil belongs to simulation time; the view already evaluated
            // it before passing talking. Visit time starts at zero independently.
            m.speak = talking || !!actor.talking;
            m.activity = e.activity + (e.progress === 1 && underwater && !reducedMotion ? 0.12 : 0);
            m.phase = time * 18; m.fidget = e.fidget;
            if (e.progress === 1 && !visit.leaving) {
                if (actor.pose === 'happy') m.fidget = null;
                else if (actor.pose === 'stopwatch') m.fidget = 'stopwatch';
            }
            m.bob *= e.progress; m.tilt *= e.progress;
        }
        const poseFacing = actor.facing || (hero && Math.sign(hero.x - actor.x)) || 1;
        facing = damp(facing, poseFacing, 10, Math.min(dt, 0.1));
        container.position.set(actor.x + m.sideStep, actor.y - m.hop);
        shadow.y = m.hop;
        shadow.visible = !underwater;
        shadow.scale.set(1 - m.hop / 85, 1 - m.hop / 100);
        shadow.alpha = 1 - m.hop / 50;
        if (visit) shadow.alpha *= e.alpha * (0.4 + e.progress * 0.6);
        updateArrival(actor, e, reducedMotion);
        art.visible = !m.lettered; lettered.visible = m.lettered;
        if (m.lettered) {
            setFrame(lettered, 'klo-' + actor.pose);
            lettered.scale.set(1, 1); // signs and the map signature are never mirrored, even while facing left
            lettered.y = m.bob;
            lettered.alpha = e.alpha;
            lettered.rotation = reducedMotion ? 0 : Math.sin(time * 2.5) * (m.speak ? 0.018 : 0.006);
            return;
        }
        // A crab turns its gaze while keeping its broad shell silhouette.
        // Interpolating horizontal scale through zero made him disappear edge-on.
        art.scale.x = poseFacing;
        art.position.set(e.x, e.y);
        art.rotation = m.tilt + e.tilt;
        const emerge = actor.pop || 0;
        art.alpha = (1 - emerge * 0.5) * e.alpha;
        art.scale.y = 1 - emerge * 0.35;
        const crouch = reducedMotion ? 0 : clamp((actor.crouch || 0) + e.crouch, 0, 1);
        const tremble = reducedMotion ? 0 : clamp(actor.tremble || 0, 0, 1);
        const scribble = clamp(actor.scribble || 0, 0, 1) * (reducedMotion ? 0.35 : 1);
        setFrame(body, actor.mouth === 'o' ? 'klo-part-body-o' : 'klo-part-body');
        torso.y = m.bob + hole * 41 * SIZE + crouch * 5 * SIZE;
        torso.rotation = reducedMotion ? 0 : Math.sin(time * 3.4) * (m.speak ? 0.013 : 0.004);
        body.alpha = (1 - hole) * e.body;
        legs.forEach((leg, i) => {
            const ph = m.phase + (i % 2) * Math.PI + (i % 3) * 0.18;
            leg.c.rotation = (reducedMotion ? 0 : Math.sin(ph) * 0.26 * m.activity) + (i < 3 ? -1 : 1) * 0.14 * crouch;
            leg.c.y = leg.y - Math.max(0, Math.cos(ph)) * 5 * m.activity;
            leg.c.x = leg.x + Math.cos(ph) * 2 * m.activity;
            leg.c.alpha = (1 - hole) * e.body;
        });
        const aim = actor.eyeAim, lift = actor.eyeLift, wide = clamp(actor.eyeWide || 0, 0, 1);
        eyes.forEach((eye, i) => {
            const side = i ? 'r' : 'l';
            const shut = actor.eyeFrame ? actor.eyeFrame === 'blink' : m.blink;
            setFrame(eye.s, 'klo-part-eye-' + side + (shut ? '-blink' : ''));
            const look = hero ? clamp((hero.y - actor.y - 80) / 600, -0.18, 0.18) : 0;
            const gaze = aim ? aim[i] : (i ? 1 : -1) * look + e.eyeAim[i];
            const quiver = tremble ? Math.sin(time * 57 + i * 1.3) * 0.02 * tremble : 0;
            eye.c.rotation = gaze + (facing - poseFacing) * 0.055 + quiver + (reducedMotion || aim ? 0 : Math.sin(time * 2.2 + i * 0.7) * 0.045);
            eye.c.y = eye.y - (lift ? clamp(lift[i], -8, 3.5) * SIZE : e.eyeLift[i] * SIZE);
            // wider eyes grow from the stalk's base, which stays tucked under the shell
            const k = 1 + 0.14 * wide;
            eye.s.scale.set(k); eye.s.position.set(eye.x * (1 - k), eye.y * (1 - k));
        });
        arms.forEach((arm, i) => {
            const side = i ? 1 : -1;
            let angle = side * (m.happy ? -0.9 : m.wave && i ? -0.75 : 0);
            if (m.speak) angle += side * (-0.28 + (reducedMotion ? 0 : Math.sin(time * 9 + i * 1.5) * 0.17));
            if (m.wave && i) angle += Math.sin(time * 17) * 0.24;
            if (actor.pose === 'point' && i) angle += 0.58;
            if (actor.pose === 'whisper' && i) angle -= 0.5;
            if (actor.pose === 'awe') angle += side * 0.32;
            if (m.fidget === 'stopwatch' && i) angle -= 0.54 + (reducedMotion ? 0 : Math.sin(time * 4) * 0.035);
            if (m.fidget === 'notebook') angle += i ? -0.25 + (reducedMotion ? 0 : Math.sin(time * (13 + 12 * scribble)) * (0.035 + 0.06 * scribble)) : 0.45;
            if (underwater && !reducedMotion) angle += side * Math.sin(time * 2.3 + i) * 0.12;
            angle += side * 0.35 * crouch;
            angle += e.arms[i];
            arm.c.rotation = reducedMotion ? angle * 0.35 : angle;
            arm.c.y = arm.y - e.armLift[i] * SIZE;
            arm.c.alpha = 1 - hole;
        });
        watch.visible = m.fidget === 'stopwatch';
        book.visible = pencil.visible = m.fidget === 'notebook';
        book.rotation = reducedMotion ? 0 : Math.sin(time * 2.5) * 0.025;
        book.alpha = 1 - hole;
    }
    return { container, update, headBounds() {
        const a = eyes[0].s.getBounds(), b = eyes[1].s.getBounds();
        return { minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX), minY: Math.min(a.minY, b.minY), maxY: Math.max(a.maxY, b.maxY) };
    } };
}
