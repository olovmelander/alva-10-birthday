/*
 * The stuck wave: the sea's last wave runs up Alva's beach from the waterline
 * and bursts against the hooves. The opening picture and the playable beach
 * draw this same wave, so the one the player watches stop is the one they later
 * walk past. World units, y down; the caller places and scales the container.
 *
 *   const wave = createStuckWave(PIXI, { texture, ground, x, y })
 *   wave.update(dt)          // its own clock, which slows to a halt once frozen
 *   wave.setArrival(u)       // 0 = a calm beach, 1 = the wave has burst at the hooves
 *   wave.freeze()            // slows to a halt; the stilled wave cools and glints along its edge
 *   wave.settle(clock)       // the finished frozen drawing, drops hanging where they stopped
 *
 * Geometry is built once (the run-up is rebuilt only while it arrives). No
 * filters, masks or render textures.
 */
import { runupShape, SPRITE_W, SPRITE_H } from './stuck-wave-shape.mjs';
export { surfaceGround } from './stuck-wave-shape.mjs';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (n) => { const v = Math.sin(n * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v); };
const lerpColor = (a, b, t) => {
    const ch = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

const SILHOUETTE = [[212, 128], [196, 125], [180, 123], [164, 120], [148, 117], [132, 115], [124, 111], [121, 86],
    [118, 65], [112, 56], [100, 54], [88, 57], [76, 59], [71, 68], [66, 60], [63, 43], [56, 36], [52, 34], [46, 38],
    [38, 40], [32, 47], [27, 54], [25, 66], [22, 76], [14, 83], [11, 96], [13, 114], [17, 124], [12, 136], [9, 146],
    [14, 154], [20, 162], [26, 168]];
// Spray drops: launch point (sprite px), velocity (world units/s), period (s), phase.
const DROPS = [[44, 44, -70, -170, 1.15, .05], [60, 40, -20, -210, 1.3, .38], [96, 56, 55, -190, 1.05, .71],
    [110, 60, 90, -140, 1.2, .22], [32, 56, -110, -120, .95, .56], [80, 58, 20, -240, 1.4, .87],
    [24, 72, -140, -90, 1.0, .14], [118, 70, 120, -110, 1.1, .63]];
// A still moment where the hanging drops read as spray, used when the playable
// beach is built without the opening (a restored save).
export const STILL_CLOCK = 0.47;

export function createStuckWave(PIXI, { texture, ground, x, y, seaTop = 0, lessMotion = false }) {
    const T = (name) => (typeof texture === 'function' ? texture(name) : null) || null;
    const reduced = () => (typeof lessMotion === 'function' ? lessMotion() : lessMotion);
    const at = (sx, sy) => [x - SPRITE_W / 2 + sx, y - SPRITE_H + sy];

    const shape = runupShape({ ground, x, y, seaTop });
    const { shoreX, ex, crestAt, groundAt, frame } = shape;
    const x0 = shape.x0 + 26;
    const columns = [];
    for (let cx = x0; cx < shoreX; cx += 12) columns.push(cx);
    columns.push(shoreX);

    const view = new PIXI.Container(); view.label = 'stuck-wave';
    const runupTex = T('frozen-runup');
    const meshCols = [];
    if (runupTex) { for (let cx = frame.x; cx < frame.x + frame.w; cx += 6) meshCols.push(cx); meshCols.push(frame.x + frame.w); }
    const body = runupTex ? (() => {
        const n = meshCols.length;
        const indices = new Uint32Array((n - 1) * 6);
        for (let i = 0; i < n - 1; i++) indices.set([i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2], i * 6);
        const geometry = new PIXI.MeshGeometry({ positions: new Float32Array(n * 4), uvs: new Float32Array(n * 4), indices });
        return new PIXI.Mesh({ geometry, texture: runupTex });
    })() : new PIXI.Graphics();
    body.label = 'stuck-wave-runup';
    const loops = new PIXI.Container();
    const crest = new PIXI.Graphics();
    const glints = new PIXI.Graphics();
    const splashTex = T('frozen-splash');
    const sprite = splashTex ? new PIXI.Sprite(splashTex) : new PIXI.Graphics().rect(-SPRITE_W / 2, -SPRITE_H, SPRITE_W, SPRITE_H).fill({ color: 0x8fbfe0, alpha: .6 });
    sprite.anchor?.set?.(0.5, 1);
    sprite.position.set(x, y);
    const drops = new PIXI.Container();
    const sparkles = new PIXI.Container();
    view.addChild(body, loops, crest, glints, sprite, drops, sparkles);

    // --- the run-up, built for a front position (only while it arrives) --------------------
    const matWater = T('mat-water');
    function buildBody(front = x0, growth = 1) {
        if (runupTex) {
            // Each column of her drawing is squashed towards the sand while the wave
            // rises (growth); everything behind the front folds onto it.
            const pos = body.geometry.getBuffer('aPosition'), uv = body.geometry.getBuffer('aUV');
            // The leading edge is a thin tongue sliding up the sand, not a wall.
            const f = front > x0 ? front : frame.x, tongue = front > x0 ? 90 : 0;
            meshCols.forEach((cx, i) => {
                const wx = Math.max(cx, f), g = groundAt(wx), u = (wx - frame.x) / frame.w;
                const k = growth * (tongue ? smooth(f, f + tongue, wx) : 1);
                pos.data.set([wx, g + (frame.y - g) * k, wx, g + (frame.y + frame.h - g) * k], i * 4);
                uv.data.set([u, 0, u, 1], i * 4);
            });
            pos.update(); uv.update();
            return;
        }
        body.clear(); crest.clear();
        const cols = columns.filter(cx => cx >= front);
        if (cols.length < 2) return;
        const top = cols.map(cx => { const b = groundAt(cx); return [cx, b - (b - crestAt(cx)) * growth]; });
        const bottom = cols.map(cx => [cx, groundAt(cx) + 2]).reverse();
        const poly = [...top, ...bottom].flat();
        body.poly(poly).fill({ color: 0x6d93c4, alpha: .8 });
        if (matWater) body.poly(poly).fill({ texture: matWater, textureSpace: 'global', alpha: .4 });
        // Her blue hatching, only where the water is deep enough to hold a stroke.
        for (let i = 0; i < 46; i++) {
            const hx = front + hash(i + 3) * (shoreX - front - 10);
            const b = groundAt(hx), c = b - (b - crestAt(hx)) * growth, depth = b - c;
            if (depth < 12) continue;
            const hy = c + depth * (.22 + hash(i + 70) * .6), len = Math.min(18, depth * .7) * (.6 + hash(i + 140) * .5);
            body.moveTo(hx - len / 2, hy + len * .1).lineTo(hx + len / 2, hy - len * .1);
        }
        body.stroke({ width: 1.2, color: 0x3f6fa6, alpha: .3, cap: 'round' });
        // foam under the crest, then the crest line in the sea's own pencil blue
        const crestPts = top.filter(([cx]) => cx >= ex - 50);
        if (crestPts.length > 1) {
            crest.moveTo(crestPts[0][0], crestPts[0][1] + 4);
            for (const [cx, cy] of crestPts.slice(1)) crest.lineTo(cx, cy + 4);
            crest.stroke({ width: 5, color: 0xffffff, alpha: .5, cap: 'round', join: 'round' });
            crest.moveTo(...crestPts[0]);
            for (const p of crestPts.slice(1)) crest.lineTo(...p);
            crest.stroke({ width: 3, color: 0x244f8f, alpha: .9, cap: 'round', join: 'round' });
        }
    }

    // Her little white loops ride up the slope towards the burst.
    const loopState = [];
    for (let i = 0; i < 7; i++) {
        const foamTex = T('p-foam');
        const g = foamTex ? new PIXI.Sprite(foamTex) : new PIXI.Graphics();
        if (foamTex) { const k = .42 + hash(i + 11) * .3; g.anchor.set(.5); g.scale.set(k, k * (.6 + hash(i + 23) * .2)); }
        else g.ellipse(0, 0, 4 + hash(i + 11) * 4.5, 2 + hash(i + 23) * 1.6).fill({ color: 0xffffff, alpha: .92 }).stroke({ width: 1.1, color: 0x244f8f, alpha: .9 });
        g.rotation = -.25 + hash(i + 37) * .2;
        loops.addChild(g);
        loopState.push({ g, u: i / 7, depth: .25 + hash(i + 51) * .45 });
    }
    const dropSprites = DROPS.map(([sx, sy, vx, vy, period, phase], i) => {
        const tx = T('p-drop');
        const s = tx ? new PIXI.Sprite(tx) : new PIXI.Graphics().circle(0, 0, 5).fill({ color: 0x8fbfe0 });
        s.anchor?.set?.(0.5);
        s.scale.set(.5 + hash(i + 90) * .35);
        drops.addChild(s);
        const [ox, oy] = at(sx, sy);
        return { s, ox, oy, vx, vy, period, phase, base: s.scale.x };
    });

    // --- the stillness: glints run along the wave's own edge as it stops ----------------
    // (No drawn outline: her foam is already outlined in its own pencil blue.)
    const contour = [];
    for (let cx = shoreX; cx > ex; cx -= 18) contour.push([cx, crestAt(cx) - (runupTex ? 2.5 + 3 * smooth(ex + shape.span * .7, ex + shape.span * .2, cx) : 1)]);
    for (const [sx, sy] of SILHOUETTE) contour.push(at(sx, sy - 1));
    const contourLen = [0];
    for (let i = 1; i < contour.length; i++) contourLen.push(contourLen[i - 1] + Math.hypot(contour[i][0] - contour[i - 1][0], contour[i][1] - contour[i - 1][1]));
    const sparkleState = [];
    const starTex = T('p-star');
    for (let i = 0; i < 6; i++) {
        const s = starTex ? new PIXI.Sprite(starTex) : new PIXI.Graphics().star(0, 0, 4, 6, 2).fill({ color: 0xffffff });
        s.anchor?.set?.(0.5); s.alpha = 0; s.tint = 0xfff7df;
        sparkles.addChild(s);
        sparkleState.push({ s, at: (i + .5) / 6 });
    }
    const pointAt = (p) => {
        const limit = contourLen.at(-1) * p;
        for (let i = 1; i < contour.length; i++) if (contourLen[i] >= limit) {
            const a = contour[i - 1], b = contour[i], u = (limit - contourLen[i - 1]) / Math.max(1e-6, contourLen[i] - contourLen[i - 1]);
            return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        }
        return contour.at(-1);
    };

    // --- state ---------------------------------------------------------------------------------
    let clock = STILL_CLOCK, elapsed = 0, arrival = 1, freezeAt = null, stillness = 0, settled = false, dead = false;
    const HALT = .6, TRACE = 1.0;
    const STILL_TINT = 0xdde6ef;
    buildBody();

    function paint() {
        const moving = freezeAt === null ? 1 : reduced() ? 0 : 1 - smooth(0, HALT, elapsed - freezeAt);
        const burst = smooth(.5, .72, arrival);
        // The sprite breathes with the wave until the stop.
        const pop = arrival >= 1 ? 1 : .55 + .45 * smooth(.5, .8, arrival) + Math.sin(smooth(.55, 1, arrival) * Math.PI) * .08;
        const breathe = reduced() ? 0 : Math.sin(clock * 6) * .07;
        sprite.alpha = burst;
        sprite.scale.set(pop, pop * (1 + breathe));
        // drops loop until they hang
        for (const d of dropSprites) {
            const tau = (((clock / d.period + d.phase) % 1) + 1) % 1 * d.period;
            d.s.x = d.ox + d.vx * tau;
            d.s.y = d.oy + d.vy * tau + 210 * tau * tau;
            d.s.alpha = burst * smooth(0, .08, tau) * (1 - smooth(.72, .98, tau / d.period));
        }
        // loops ride towards the burst; glints slide along the crest
        const runFront = arrival >= 1 ? x0 : shoreX - (shoreX - x0) * smooth(0, .62, arrival);
        for (const L of loopState) {
            const u = ((L.u - clock * .09) % 1 + 1) % 1;
            const lx = ex - 40 + (shoreX - 30 - (ex - 40)) * u;
            const b = groundAt(lx), c = crestAt(lx);
            L.g.position.set(lx, c + (b - c) * L.depth);
            L.g.alpha = lx < runFront ? 0 : smooth(0, .1, u) * (1 - smooth(.85, 1, u)) * (b - c > 8 ? 1 : 0);
        }
        glints.clear();
        if (moving > .02 && !reduced() && arrival > .6) {
            for (let i = 0; i < 3; i++) {
                const u = ((i / 3 - clock * .16) % 1 + 1) % 1;
                const gx = ex + (shoreX - ex - 20) * u, gy = crestAt(gx) + 7;
                glints.moveTo(gx - 7, gy + 1).lineTo(gx + 7, gy - .5);
            }
            glints.stroke({ width: 1.6, color: 0xffffff, alpha: .7 * moving, cap: 'round' });
        }
        // the stillness: a cool pencil calm and a few glints of paper light
        const tint = lerpColor(0xffffff, STILL_TINT, stillness);
        sprite.tint = tint; body.tint = tint; loops.tint = tint; crest.tint = lerpColor(0xffffff, 0xe8edf2, stillness);
        for (const k of sparkleState) {
            const local = settled || reduced() ? 0 : clamp((stillness - k.at + .12) / .24, 0, 1);
            k.s.alpha = Math.sin(local * Math.PI) * .9;
            if (k.s.alpha > 0) { const [px, py] = pointAt(k.at); k.s.position.set(px, py); k.s.scale.set(.35 + .35 * Math.sin(local * Math.PI)); }
        }
    }

    function update(dt) {
        if (dead || settled) return;
        dt = clamp(dt, 0, .1);
        elapsed += dt;
        let speed = 1;
        if (freezeAt !== null) {
            speed = reduced() ? 0 : 1 - smooth(0, HALT, elapsed - freezeAt);
            const since = elapsed - freezeAt - (reduced() ? 0 : HALT);
            stillness = reduced() ? clamp((elapsed - freezeAt) / .35, 0, 1) : clamp(since / TRACE, 0, 1);
        }
        clock += dt * speed;
        paint();
    }

    return {
        view, sprite, get shoreX() { return shoreX; }, get clock() { return clock; },
        get frozen() { return freezeAt !== null; }, get stillness() { return stillness; },
        update,
        setArrival(u) {
            arrival = clamp(u, 0, 1);
            const run = smooth(0, .62, arrival);
            buildBody(shoreX - (shoreX - x0) * run, .35 + .65 * run);
            body.alpha = crest.alpha = smooth(0, .12, arrival);
            paint();
        },
        freeze() { if (freezeAt === null) freezeAt = elapsed; },
        /** The finished frozen drawing. Pass the opening's clock so the same drops hang. */
        settle(at = clock) {
            clock = at; arrival = 1; stillness = 1; settled = false;
            if (freezeAt === null) freezeAt = elapsed - HALT - TRACE;
            buildBody(); body.alpha = crest.alpha = 1;
            paint(); settled = true;
        },
        destroy() { if (dead) return; dead = true; view.destroy({ children: true }); }
    };
}
