/* Professor Klo: small pencil parts, a sideways scuttle, and harmless research jokes.
 * Motion is sampled from game time/distance. No filters, per-frame geometry or timers.
 * Lettered story poses are separate, always at positive horizontal scale. */
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

/** Return one container; the scene owns and destroys it along with the other actors. */
export function createKlo(PIXI, { texture }) {
    const container = new PIXI.Container();
    const shadow = new PIXI.Graphics();
    for (let i = 4; i >= 1; i--) shadow.ellipse(0, 0, 22 + i * 5, 2 + i * 1.1).fill({ color: 0x5d493d, alpha: 0.026 + (4 - i) * 0.009 });
    const art = new PIXI.Container();
    const torso = new PIXI.Container();
    const lettered = new PIXI.Sprite(texture('klo-signs') || PIXI.Texture.EMPTY);
    lettered.anchor.set(0.5, 1); lettered.visible = false;
    container.addChild(shadow, art, lettered);
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
    const body = sprite('klo-part-body', torso);
    // Eye stalks start behind the shell; the eyeballs are well above its silhouette.
    const arms = [-1, 1].map((s) => joint('klo-part-arm-' + (s < 0 ? 'l' : 'r'), s * 21.5, -22, torso));
    const watch = sprite('klo-part-watch', arms[1].c); watch.position.set(33 * SIZE, -29 * SIZE);
    const book = sprite('klo-part-book', torso); book.position.set(-5 * SIZE, -23 * SIZE);
    const pencil = sprite('klo-part-pencil', arms[1].c); pencil.position.set(33 * SIZE, -29 * SIZE);
    let hole = 0, facing = 1, initialized = false;
    const setFrame = (s, name) => { const t = texture(name); if (t && s.texture !== t) s.texture = t; };
    function update(actor, { scene, time = 0, dt = 1 / 60, underwater = false, hero, talking = false, reducedMotion = false } = {}) {
        container.visible = !!actor?.visible && (!scene || actor.scene === scene);
        if (!container.visible) { initialized = false; return; }
        if (!initialized) { hole = actor.inHole ? 1 : 0; facing = actor.facing || 1; initialized = true; }
        const targetHole = actor.inHole ? 1 : 0;
        hole = damp(hole, targetHole, targetHole ? 9 : 7, Math.min(dt, 0.1));
        const m = sampleKlo(actor, { time, underwater, talking, reducedMotion });
        const poseFacing = actor.facing || (hero && Math.sign(hero.x - actor.x)) || 1;
        facing = damp(facing, poseFacing, 10, Math.min(dt, 0.1));
        container.position.set(actor.x + m.sideStep, actor.y - m.hop);
        shadow.y = m.hop;
        shadow.visible = !underwater;
        shadow.scale.set(1 - m.hop / 85, 1 - m.hop / 100);
        shadow.alpha = 1 - m.hop / 50;
        art.visible = !m.lettered; lettered.visible = m.lettered;
        if (m.lettered) {
            setFrame(lettered, 'klo-' + actor.pose);
            lettered.scale.set(1, 1); // signs and /K are never mirrored, even while facing left
            lettered.y = m.bob;
            lettered.rotation = reducedMotion ? 0 : Math.sin(time * 2.5) * (m.speak ? 0.018 : 0.006);
            return;
        }
        art.scale.x = facing;
        art.rotation = m.tilt;
        const emerge = actor.pop || 0;
        art.alpha = 1 - emerge * 0.5;
        art.scale.y = 1 - emerge * 0.35;
        torso.y = m.bob + hole * 41 * SIZE;
        torso.rotation = reducedMotion ? 0 : Math.sin(time * 3.4) * (m.speak ? 0.013 : 0.004);
        body.alpha = 1 - hole;
        legs.forEach((leg, i) => {
            const ph = m.phase + (i % 2) * Math.PI + (i % 3) * 0.18;
            leg.c.rotation = reducedMotion ? 0 : Math.sin(ph) * 0.26 * m.activity;
            leg.c.y = leg.y - Math.max(0, Math.cos(ph)) * 5 * m.activity;
            leg.c.x = leg.x + Math.cos(ph) * 2 * m.activity;
            leg.c.alpha = 1 - hole;
        });
        eyes.forEach((eye, i) => {
            const side = i ? 'r' : 'l';
            setFrame(eye.s, 'klo-part-eye-' + side + (m.blink ? '-blink' : ''));
            const look = hero ? clamp((hero.y - actor.y - 80) / 600, -0.18, 0.18) : 0;
            eye.c.rotation = (i ? 1 : -1) * look + (reducedMotion ? 0 : Math.sin(time * 2.2 + i * 0.7) * 0.045);
        });
        arms.forEach((arm, i) => {
            const side = i ? 1 : -1;
            let angle = side * (m.happy ? -0.9 : m.wave && i ? -0.75 : 0);
            if (m.speak) angle += side * (-0.28 + Math.sin(time * 9 + i * 1.5) * 0.17);
            if (m.wave && i) angle += Math.sin(time * 17) * 0.24;
            if (actor.pose === 'point' && i) angle += 0.58;
            if (actor.pose === 'whisper' && i) angle -= 0.5;
            if (m.fidget === 'stopwatch' && i) angle -= 0.54 + Math.sin(time * 4) * 0.035;
            if (m.fidget === 'notebook') angle += i ? -0.25 + Math.sin(time * 13) * 0.035 : 0.45;
            if (underwater) angle += side * Math.sin(time * 2.3 + i) * 0.12;
            arm.c.rotation = reducedMotion ? angle * 0.35 : angle;
            arm.c.alpha = 1 - hole;
        });
        watch.visible = m.fidget === 'stopwatch';
        book.visible = pencil.visible = m.fidget === 'notebook';
        book.rotation = Math.sin(time * 2.5) * 0.025;
        book.alpha = 1 - hole;
    }
    return { container, update };
}
