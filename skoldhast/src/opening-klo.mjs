/* Klo's first entrance is a physical climb through the drawn sand. The same
 * articulated pencil crab is used in the game: no stretched body or extra atlas.
 * All positions below are local to his final ground point, before paper scale. */
import { createKlo } from './klo.mjs';

const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { const p = clamp(v); return p * p * (3 - 2 * p); };
const between = (p, a, b) => clamp((p - a) / (b - a));

/** A reusable output makes entrance sampling allocation-free in the ticker. */
export function sampleOpeningKlo(progress, reducedMotion = false, out = {}) {
    const p = clamp(Number.isFinite(progress) ? progress : 0);
    out.progress = p;
    out.stage = p <= 0 ? 'hidden' : p < .14 ? 'sand' : p < .35 ? 'peek'
        : p < .61 ? 'brace' : p < .8 ? 'pop' : p < .9 ? 'land' : p < 1 ? 'notebook' : 'ready';
    out.x = -40;
    out.y = 76;
    out.rotation = 0;
    out.hole = ease(between(p, .015, .2));
    out.crumbs = 0;
    out.walk = 0;
    out.pose = 'idle';
    if (p >= .14 && p < .35) out.y = 76 - 28 * ease(between(p, .14, .25));
    else if (p >= .35 && p < .56) {
        out.y = 48 - 34 * ease(between(p, .35, .56));
        out.pose = 'point';
    } else if (p >= .56 && p < .61) {
        out.y = 14 + (reducedMotion ? 0 : 4 * ease(between(p, .56, .61)));
        out.pose = 'point';
    } else if (p >= .61 && p < .8) {
        const u = between(p, .61, .8);
        out.x = -40 + 30 * ease(u);
        out.y = reducedMotion ? 14 * (1 - ease(u)) : 18 * (1 - ease(u)) - 30 * Math.sin(Math.PI * u);
        out.rotation = reducedMotion ? 0 : Math.sin(Math.PI * u) * -.055;
        out.pose = 'happy';
        out.crumbs = Math.sin(Math.PI * u);
    } else if (p >= .8) {
        const u = between(p, .8, .9);
        out.x = -10 + 10 * ease(u);
        out.y = 0;
        out.walk = p < .9 ? Math.sin(Math.PI * u) : 0;
        out.pose = p >= .9 ? 'notebook' : 'idle';
    }
    return out;
}

export function createOpeningKlo(PIXI, { parent, texture, x, y, scale = 1, reducedMotion = false }) {
    const container = new PIXI.Container();
    container.label = 'opening-klo';
    container.position.set(x, y);
    container.scale.set(scale);
    parent.addChild(container);

    const hole = new PIXI.Container();
    hole.label = 'opening-klo-hole';
    hole.x = -40;
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
    hole.addChild(shade);
    container.addChild(hole);

    const rig = createKlo(PIXI, { texture });
    rig.container.label = 'opening-klo-parts';
    const groundMask = new PIXI.Graphics().rect(-150, -160, 300, 160.5).fill(0xffffff);
    groundMask.label = 'opening-klo-soil-mask';
    container.addChild(rig.container, groundMask);
    rig.container.mask = groundMask;
    rim.x = -40;
    container.addChild(rim);

    // The professor's notebook escapes during the pop; he catches it as his
    // feet settle. This is the same tiny paper prop used by his ordinary rig.
    const looseBook = new PIXI.Sprite(texture('klo-part-book') || PIXI.Texture.EMPTY);
    looseBook.anchor.set(.5, 1);
    looseBook.label = 'opening-klo-notebook';
    looseBook.visible = false;
    container.addChild(looseBook);

    const crumbs = [];
    for (let i = 0; i < 9; i++) {
        const grain = new PIXI.Graphics().poly([-1.2, 0, .5, -1.4, 2.1, .1, .3, .9])
            .fill({ color: i % 2 ? 0xc2a268 : 0x977650, alpha: .63 });
        grain.visible = false;
        container.addChild(grain);
        crumbs.push(grain);
    }

    const actor = { visible: true, scene: 'paper', x: -40, y: 76, facing: 1,
        pose: 'idle', pop: 0, inHole: false, holding: true, distance: 0, vx: 0 };
    const localHero = { x: 0, y: 0 };
    const options = { scene: 'paper', time: 0, dt: 0, hero: localHero, talking: false, reducedMotion: false };
    const motion = {};
    let progress = 0, pose = 'notebook', time = 0, dead = false;
    const lessMotion = () => typeof reducedMotion === 'function' ? !!reducedMotion() : !!reducedMotion;

    function render(dt = 0, hero, talking = false) {
        if (dead) return;
        const less = lessMotion();
        sampleOpeningKlo(progress, less, motion);
        container.openingKloStage = motion.stage;
        container.openingKloProgress = motion.progress;
        container.visible = progress > 0;
        actor.visible = progress >= .14;
        actor.x = motion.x;
        actor.y = motion.y;
        actor.pose = progress < 1 ? motion.pose : pose;
        actor.holding = progress < 1;
        actor.distance = motion.x + 40;
        actor.vx = motion.walk * 95;
        if (hero) {
            localHero.x = (hero.x - x) / scale;
            localHero.y = (hero.y - y) / scale;
            actor.facing = Math.sign(localHero.x - actor.x) || actor.facing;
        }
        options.time = time;
        options.dt = dt;
        options.talking = progress >= .9 && talking;
        options.reducedMotion = less;
        rig.update(actor, options);
        rig.container.rotation = motion.rotation;
        // At ground contact the fixed soil edge is no longer needed. The rig's
        // own soft shadow then remains fully visible below the planted feet.
        rig.container.mask = progress < .8 ? groundMask : null;
        groundMask.visible = progress < .8;
        const twitch = !less && progress > 0 && progress < .14 ? Math.sin(progress * 170) * 1.1 : 0;
        hole.x = -40 + twitch;
        hole.alpha = motion.hole * (1 - .22 * ease(between(progress, .8, 1)));
        rim.alpha = motion.hole;
        looseBook.visible = progress >= .61 && progress < .9;
        if (looseBook.visible) {
            const flight = between(progress, .61, .9);
            const arc = less ? 0 : Math.sin(flight * Math.PI);
            looseBook.position.set(motion.x - 4.6 * actor.facing + arc * 44,
                motion.y - 21.16 - arc * 16);
            looseBook.rotation = arc * .34 + Math.sin(time * 2.5) * .025;
        }
        const launch = between(progress, .61, .86);
        for (let i = 0; i < crumbs.length; i++) {
            const grain = crumbs[i];
            grain.visible = !less && progress > .61 && progress < .86;
            if (!grain.visible) continue;
            const side = i % 2 ? -1 : 1;
            grain.position.set(-40 + side * (10 + i * 1.7 + launch * (11 + i * 1.9)),
                -Math.sin(launch * Math.PI) * (7 + (i % 4) * 3));
            grain.rotation = launch * side * (1.3 + i * .1);
            grain.alpha = (1 - launch) * .65;
        }
    }
    render();
    return {
        container,
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
