/* A visit is presentation, never a second physical actor. All anchors and poses
 * are sampled without advancing water, puzzle objects, flags or the professor. */
import { cond, heightOn } from './sim.mjs';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (v) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const rise = (p, a, b) => smooth((p - a) / (b - a));
const finite = (v, fallback) => Number.isFinite(v) ? v : fallback;

/** Camera coordinates are world-center coordinates; dimensions are CSS pixels.
 * A missing camera is useful in tests/headless play and keeps a local view. */
export function describeKloArrival(G, { cam, width = 844, height = 390 } = {}) {
    const p = G.player, scene = G.sceneId, def = G.sceneDef || G.scenes?.[scene] || {};
    const T = G.terrain, F = G.flags || new Set(), actor = G.actors?.klo;
    const zoom = Math.max(0.1, finite(cam?.zoom, 0.65));
    const cx = finite(cam?.x, p.x), cy = finite(cam?.y, p.y - 100);
    const frame = {
        left: cx - width / (2 * zoom) + 56 / zoom,
        right: cx + width / (2 * zoom) - 56 / zoom,
        top: cy - height / (2 * zoom) + 78 / zoom,
        bottom: cy + height / (2 * zoom) - 64 / zoom
    };
    const visible = (x, y) => x >= frame.left && x <= frame.right && y - 62 >= frame.top && y <= frame.bottom;
    const waterAt = (x, y) => T?.waterAt?.(x, y - 12);
    const wet = (x, y) => !!waterAt(x, y) && waterAt(x, y).swim !== false;
    const base = { scene, underwater: wet(p.x, p.y), nearby: false, tutorial: false, portrait: false };

    // Those exact coordinates are part of the stopwatch and hiding lessons.
    // Even an offscreen call must not pull him out of his authored hole.
    if (scene === 'land' && !F.has('rule_demo') && actor?.scene === scene) {
        return { ...base, kind: actor.inHole ? 'hole' : 'nearby', x: actor.x, y: actor.y,
            facing: Math.sign(p.x - actor.x) || actor.facing || 1, nearby: true, tutorial: true,
            inHole: !!actor.inHole, portrait: !actor.visible || !visible(actor.x, actor.y) };
    }
    if (actor?.visible && actor.scene === scene && !actor.inHole && !actor.pop &&
        Math.abs(actor.x - p.x) < 330 && Math.abs(actor.y - p.y) < 170 && visible(actor.x, actor.y)) {
        return { ...base, kind: 'nearby', x: actor.x, y: actor.y, facing: Math.sign(p.x - actor.x) || 1,
            underwater: wet(actor.x, actor.y), nearby: true };
    }

    const usable = (q) => cond(q.when, F) && (!q.chapter || q.chapter <= (G.released ?? 3));
    const surfaces = T?.surfaces || (def.surfaces || []).filter(usable);
    const obstacles = [...(def.ropes || []), ...(def.pullRopes || []), ...(def.plates || []),
        ...(def.stairs || []), ...(def.corners || []), ...(def.flaps || [])].filter(usable);
    if (def.rail) obstacles.push({ x: def.rail.x0 + (G.puz?.stone || 0) * def.rail.step, y: def.rail.y });
    const isClear = (x, y) => {
        if (!visible(x, y) || T?.insideSolid?.(x, y, 4)) return false;
        if (T?.wallBetween?.(p.x, x, Math.min(p.y, y), Math.sign(x - p.x))) return false;
        if (obstacles.some(q => Math.abs(q.x - x) < (q.w ? q.w / 2 + 44 : 74) && Math.abs(q.y - y) < 100)) return false;
        // Dark arch entrances are virtual walls; do not appear on the other side.
        if ((T?.edges || []).some(e => e.kind === 'balk' && e.water &&
            e.x > Math.min(p.x, x) && e.x < Math.max(p.x, x) && Math.abs(y - e.y) < (e.dy || 90))) return false;
        return true;
    };
    const support = (x) => {
        let best;
        for (const s of surfaces) {
            const y = heightOn(s.pts, x);
            if (y === null || y < p.y - 70 || y > p.y + 310 || s.hidden) continue;
            if (!best || Math.abs(y - p.y) < Math.abs(best.y - p.y)) best = { s, y };
        }
        return best;
    };
    const linked = (x, y) => {
        // Check the whole short route: a foothold across a cleft is not nearby.
        const n = Math.max(1, Math.ceil(Math.abs(x - p.x) / 28));
        let last = p.y;
        for (let i = 0; i <= n; i++) {
            const q = support(p.x + (x - p.x) * i / n);
            if (!q || Math.abs(q.y - last) > (i === 0 && p.mode === 'air' ? 310 : 75)) return false;
            last = q.y;
        }
        return Math.abs(last - y) < 4;
    };
    const side = frame.right - p.x >= p.x - frame.left ? 1 : -1;
    const choices = [];
    const xs = [180, -180, 240, -240, 128, -128, 300, -300, 95, -95].map(n => p.x + n * side);
    const props = (def.decor || []).filter(q => usable(q) && q.sprite && q.par === undefined &&
        /^(rock-|seabed-rock-|feathergrass-|dune-grass-|kelp-bed)/.test(q.sprite) &&
        Math.abs(q.x - p.x) < 340 && Math.abs(q.y - p.y) < 210);
    for (const q of props) xs.unshift(q.x + Math.sign(p.x - q.x) * 66);
    for (const x of xs) {
        if (base.underwater) {
            for (const dy of [-25, -75, 25]) {
                const y = p.y + dy;
                if (wet(x, y) && isClear(x, y) && (!T?.insideSolid?.(x, y - 55, 4))) {
                    choices.push({ x, y, score: Math.abs(Math.abs(x - p.x) - 175) + Math.abs(dy) * 0.4, surface: null });
                }
            }
        } else {
            const q = support(x);
            if (q && isClear(x, q.y) && linked(x, q.y)) choices.push({ x, y: q.y, surface: q.s,
                score: Math.abs(Math.abs(x - p.x) - 175) + Math.abs(q.y - p.y) * 0.35 });
        }
    }
    choices.sort((a, b) => a.score - b.score);
    const anchor = choices[0];
    if (!anchor) {
        // A presentation in the page margin is preferable to a physically false
        // perch (mid-jump, in a narrow pipe, or beside a locked cliff).
        return { ...base, kind: 'margin', x: clamp(p.x + side * 165, frame.left, frame.right),
            y: clamp(p.y - 80, frame.top + 72, frame.bottom), facing: -side, portrait: true };
    }
    const { x, y, surface } = anchor;
    const nearbyProp = props.filter(q => Math.abs(q.x - x) < 130 && Math.abs(q.y - y) < 100)
        .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
    let kind;
    if (base.underwater) {
        if (scene === 'kelp' && x > 25 * 200 && x < 31.6 * 200 && y > 9.8 * 200) kind = 'vault';
        else if (scene === 'kelp' && (T?.kelpBeds || def.kelpBeds || []).some(q => usable(q) &&
            x > q.x0 - 320 && x < q.x1 + 320 && y > q.y0 - 210 && y < q.y1 + 90)) kind = 'kelp';
        else kind = 'current';
    } else if (surface?.gallery && y < -1200) kind = 'gallery';
    else if (surface?.pier || surface?.jetty) kind = 'pier';
    else if (surface?.mat === 'wood') kind = 'wood';
    else if (scene === 'land' && x > 98.7 * 200 && x < 104.8 * 200) kind = 'pool';
    else if (surface?.cliff || surface?.mat === 'rock' && !surface?.thin ||
        surface?.id === 'plateau' && (x < 16.5 * 200 || x > 33.5 * 200)) kind = 'cliff';
    else if (surface?.mound === 'grass') kind = 'grass';
    else if (surface?.mat === 'grass' || surface?.mat === 'earth') kind = 'grass';
    else kind = 'sand';
    return { ...base, kind, x, y, facing: Math.sign(p.x - x) || 1, surface: surface?.id,
        prop: nearbyProp ? { sprite: nearbyProp.sprite, x: nearbyProp.x, y: nearbyProp.y, scale: nearbyProp.scale || 1 } : null };
}

/** Local choreography. Progress is 0→1 for both arriving and leaving; elapsed
 * presentation time continues while the game is suspended for conversation. */
export function sampleKloArrival(companion, { reducedMotion = false } = {}) {
    const c = companion || {}, kind = c.kind || 'nearby', time = finite(c.time, 0);
    const raw = clamp(finite(c.progress, 1), 0, 1), p = c.leaving ? 1 - raw : raw;
    const variant = c.variant ? -1 : 1, side = c.facing || 1;
    const active = !!companion, stationary = kind === 'nearby' || kind === 'hole';
    const pose = { active, kind, progress: p, time, x: 0, y: 0, tilt: 0, alpha: 1, body: 1,
        eyeLift: [0, 0], eyeAim: [0, 0], arms: [0, 0], armLift: [0, 0], crouch: 0, activity: 0,
        mask: false, particles: 0, foliage: 0, fluff: 0, greeting: 0, fidget: null };
    if (!active) return pose;
    pose.alpha = stationary && !c.leaving ? 1 : rise(p, 0, 0.13);
    pose.fidget = p > 0.8 && kind !== 'hole' ? ((time % 12 > 8 && /wood|pier/.test(kind)) ? 'stopwatch' : 'notebook') : null;
    if (reducedMotion) { pose.alpha = stationary && !c.leaving ? 1 : smooth(p); return pose; }
    const settle = Math.sin(rise(p, 0.60, 1) * Math.PI);
    const look = Math.sin(rise(p, 0.08, 0.48) * Math.PI);
    pose.eyeLift = [look * 3.5, look * 2.1];
    pose.eyeAim = [-look * 0.24 * variant, look * 0.13 * variant];
    pose.greeting = Math.sin(rise(p, 0.69, 0.98) * Math.PI);
    if (kind === 'sand') {
        pose.y = 55 * (1 - rise(p, 0.24, 0.76)) - settle * 3;
        pose.mask = p < 0.78; pose.crouch = settle * 0.55;
        pose.arms = [look * 0.32, -settle * 0.6];
        pose.particles = Math.sin(rise(p, 0.32, 0.93) * Math.PI);
    } else if (/^(wood|pier|gallery)$/.test(kind)) {
        const haul = rise(p, 0.28, 0.84);
        pose.y = 61 * (1 - haul); pose.x = (1 - haul) * 10 * variant;
        pose.tilt = -Math.sin(haul * Math.PI) * 0.16 * variant;
        pose.mask = p < 0.86; pose.crouch = settle * 0.85;
        pose.arms = [(1 - haul) * 1.12, -(1 - rise(p, 0.12, 0.7)) * 1.3];
        // First claw hooks the lip while the eyes/body remain below it. The
        // second catches up, then both shoulders settle back into the shell.
        pose.armLift = [25 * (1 - haul), 25 * rise(p, 0.09, 0.23) * (1 - haul)];
        pose.eyeLift = pose.eyeLift.map(lift => lift - 8 * (1 - rise(p, 0.18, 0.4)));
        pose.activity = Math.sin(haul * Math.PI) * 0.7;
        pose.particles = kind === 'pier' ? Math.sin(rise(p, 0.62, 1) * Math.PI) : 0;
        if (kind === 'gallery') {
            // He spots the pencil he dropped, retrieves it, then catches his breath.
            const retrieve = Math.sin(rise(p, 0.77, 0.98) * Math.PI);
            pose.greeting *= 0.5;
            pose.arms[1] += retrieve * 0.75;
            pose.eyeAim[1] += retrieve * 0.34;
            pose.crouch += retrieve * 0.22;
            if (p < 0.94) pose.fidget = null;
        }
    } else if (/^(pool|cliff|vault)$/.test(kind)) {
        const step = rise(p, 0.20, 0.89);
        pose.x = -side * 68 * (1 - step); pose.y = -Math.sin(step * Math.PI) * (kind === 'vault' ? 4 : 13);
        pose.tilt = (1 - step) * (kind === 'vault' ? 0.14 : -0.2) * variant;
        pose.body = rise(p, 0.1, 0.35); pose.activity = Math.sin(step * Math.PI);
        pose.arms = [(1 - step) * 0.6, -(1 - step) * 0.45];
        if (kind === 'vault') { pose.greeting *= 0.3; pose.eyeLift = [look * 2, look * 3.5]; }
        if (kind === 'pool') pose.eyeAim[1] += Math.sin(rise(p, 0.55, 0.89) * Math.PI) * 0.38;
    } else if (kind === 'grass') {
        const emerge = rise(p, 0.22, 0.88);
        pose.x = side * 36 * (1 - emerge); pose.y = 14 * (1 - emerge);
        pose.tilt = Math.sin(p * 24) * 0.055 * (1 - emerge);
        pose.body = rise(p, 0.07, 0.42); pose.activity = 0.8 * Math.sin(emerge * Math.PI);
        pose.foliage = Math.sin(rise(p, 0, 1) * Math.PI);
        pose.fluff = rise(p, 0.54, 0.74) * (1 - rise(time, 3.3, 4.1));
        pose.arms = [0.22 * look, -0.4 * settle];
    } else if (kind === 'kelp') {
        const part = rise(p, 0.1, 0.8);
        pose.y = 25 * (1 - part); pose.tilt = Math.sin(part * Math.PI) * 0.12 * variant;
        pose.body = rise(p, 0.06, 0.36); pose.arms = [-0.8 * (1 - part), 0.8 * (1 - part)];
        pose.foliage = 1 - rise(p, 0.65, 1); pose.fluff = rise(p, 0.58, 0.72) * (1 - rise(time, 3.3, 4.1));
        pose.particles = Math.sin(part * Math.PI);
    } else if (kind === 'current') {
        const drift = rise(p, 0.08, 0.94);
        pose.x = -side * 92 * (1 - drift); pose.y = -Math.sin(drift * Math.PI) * 21;
        pose.tilt = Math.sin(drift * Math.PI * 2) * 0.46 * variant;
        pose.arms = [Math.sin(drift * Math.PI) * 0.7, -Math.sin(drift * Math.PI) * 0.7];
        pose.particles = Math.sin(drift * Math.PI); pose.activity = 0.25;
    } else if (kind === 'margin') {
        pose.y = 22 * (1 - rise(p, 0.1, 1)); pose.greeting *= 0.7;
    } else {
        // An already visible professor acknowledges the player in place.
        pose.greeting = Math.sin(p * Math.PI) * (kind === 'hole' ? 0.2 : 0.7);
        pose.eyeLift = [Math.sin(p * Math.PI) * 3.5, Math.sin(p * Math.PI) * 2.4];
    }
    pose.arms[1] -= pose.greeting * 0.62;
    return pose;
}
