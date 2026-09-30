/*
 * The sköldhäst on screen: Pixi sprites and strip meshes driven by rig.mjs.
 *
 *   const hero = createHero(PIXI, { textures, rig, mini });
 *   hero.view            // Container; origin = ground under the middle of the body; faces right.
 *                        // The caller positions and scales it (normally at s.x, s.y); facing
 *                        // is mirrored inside, so never flip view.scale.x yourself.
 *   hero.update(dt, s)   // s: state snapshot (skoldhast/dev/SPEC.md §2)
 *   hero.destroy()
 *
 * Every part is a direct child of one flipped container, placed each frame
 * from the animator's pose (so the z-order from hero-rig.json is free of the
 * scene graph). The mane tufts, forelock, tail and kelp fringes are textured
 * strips (≤ 100 vertices, so Pixi batches them) laid along verlet spines.
 * update() allocates nothing.
 */
import { createAnimator } from './rig.mjs';

const EYE = ['hero-eye-open', 'hero-eye-half', 'hero-eye-closed'];
const WET_TINT = [0xd6, 0xcc, 0xc0]; // multiplied into the coat when fully wet

export function createHero(PIXI, { textures, rig, mini = false } = {}) {
    const an = createAnimator(rig, { mini });
    const tex = (name) => {
        const t = textures && textures[name];
        if (!t) throw new Error(`hero: missing texture ${name}`);
        return t;
    };

    const view = new PIXI.Container();
    view.label = mini ? 'hero-mini' : 'hero';
    const flip = new PIXI.Container();
    view.addChild(flip);
    const shadows = new PIXI.Container();
    const body = new PIXI.Container();
    flip.addChild(shadows, body);

    // --- shadows --------------------------------------------------------------------
    // Seated on the ground line: mostly on the sand in front of it, so the
    // patch never smears grey over the sea or sky behind the horizon.
    const shadow = new PIXI.Sprite(tex(rig.parts.shadow.texture));
    shadow.anchor.set(0.5, 0.22);
    shadows.addChild(shadow);
    const hoofShadows = {};
    if (!mini) {
        for (const leg of an.legs) {
            const sp = new PIXI.Sprite(tex(rig.parts.shadow.hoof));
            sp.anchor.set(0.5, 0.3);
            shadows.addChild(sp);
            hoofShadows[leg.name] = sp;
        }
    }

    // --- sprites ----------------------------------------------------------------------
    const sprites = {};
    const mk = (key, name) => { const sp = new PIXI.Sprite(tex(name)); sp.label = key; sprites[key] = sp; return sp; };
    mk('torso', rig.parts.torso.texture);
    mk('shell', rig.parts.shell.texture);
    mk('neck', rig.parts.neck.texture);
    mk('head', rig.parts.head.texture);
    const eyeTex = EYE.map(tex);
    mk('eye', EYE[0]);
    mk('mouth', rig.parts.mouth.texture).visible = false;
    const mouthTex = [tex(rig.parts.mouth.talk || rig.parts.mouth.texture), tex(rig.parts.mouth.texture)];
    let lastMouth = -1;
    for (const leg of an.legs) {
        const L = rig.legs[leg.name];
        mk(`${leg.name}.upper`, L.upper);
        mk(`${leg.name}.lower`, L.lower);
        mk(`${leg.name}.hoof`, L.hoof);
    }

    // --- strips -------------------------------------------------------------------------
    const strips = [];
    for (const ch of an.chains) {
        const def = ch.group === 'tail' ? rig.tail
            : ch.group === 'mane' ? rig.mane[ch.idx]
                : ch.group === 'forelock' ? rig.forelock[ch.idx]
                    : rig.legs[an.legs[ch.idx].name].fringeStrip;
        const rows = ch.group === 'tail' ? (mini ? 10 : 24) : ch.group === 'fringe' ? 6 : (mini ? 6 : 12);
        strips.push(makeStrip(PIXI, tex(def.texture), def, ch, rows));
    }
    const stripOf = (group, idx) => strips.find((s) => s.chain.group === group && (idx === undefined || s.chain.idx === idx));

    // --- z-order from the rig ---------------------------------------------------------
    const order = [];
    for (const key of rig.z) {
        if (key === 'shadow') continue;
        if (rig.legs[key]) {
            order.push(sprites[`${key}.upper`], sprites[`${key}.lower`], sprites[`${key}.hoof`]);
            const fs = strips.find((s) => s.chain.group === 'fringe' && an.legs[s.chain.idx].name === key);
            if (fs) order.push(fs.mesh);
            continue;
        }
        const m = /^(mane|forelock|tail)(?::(\d+))?$/.exec(key);
        if (m) {
            const st = stripOf(m[1], m[2] === undefined ? undefined : Number(m[2]));
            if (st) order.push(st.mesh);
            continue;
        }
        if (sprites[key]) order.push(sprites[key]);
    }
    for (const d of order) body.addChild(d);

    // flat lists for the per-frame loop (no lookups or iterators while playing)
    const pairs = Object.keys(sprites).map((k) => [sprites[k], an.pose.parts[k]]);
    const shadowPairs = mini ? [] : an.legs.map((leg) => [hoofShadows[leg.name], leg.pShadow]);

    // --- per-frame ------------------------------------------------------------------------
    let lastEye = 0;
    let lastTint = -1;
    function update(dt, s) {
        const pose = an.update(dt, s);
        // the caller places view at (s.x, s.y) (or anywhere else: a parallax layer, the prologue's
        // picture); the pose is local to that point, so update() never moves the view itself
        flip.scale.x = s.facing === -1 ? -1 : 1;
        for (let i = 0; i < pairs.length; i++) {
            const sp = pairs[i][0], p = pairs[i][1];
            sp.position.set(p.x, p.y);
            sp.rotation = p.rot;
        }
        sprites.mouth.visible = pose.parts.mouth.visible;
        const mo = pose.mouthOpen ? 1 : 0;
        if (mo !== lastMouth) { sprites.mouth.texture = mouthTex[mo]; lastMouth = mo; }
        if (pose.eye !== lastEye) { sprites.eye.texture = eyeTex[pose.eye]; lastEye = pose.eye; }
        // shadows
        const sh = pose.shadow;
        shadow.position.set(sh.x, sh.y + 1);
        shadow.scale.set(sh.w, 1);
        shadow.alpha = sh.alpha;
        shadow.visible = sh.alpha > 0.01;
        for (let i = 0; i < shadowPairs.length; i++) {
            const hs = shadowPairs[i][0], p = shadowPairs[i][1];
            hs.position.set(p.x, p.y + 1);
            hs.scale.set(p.sx, 1);
            hs.alpha = p.alpha;
            hs.visible = p.alpha > 0.01;
        }
        // strips
        for (let i = 0; i < strips.length; i++) layStrip(strips[i]);
        // wet coat: slightly darker
        const w = pose.wet < 0 ? 0 : pose.wet > 1 ? 1 : pose.wet;
        const tint = ((255 - (255 - WET_TINT[0]) * w) << 16) | ((255 - (255 - WET_TINT[1]) * w) << 8) | (255 - (255 - WET_TINT[2]) * w);
        if (tint !== lastTint) { body.tint = tint; lastTint = tint; }
    }

    function destroy() {
        view.destroy({ children: true });
        for (const st of strips) st.geometry.destroy();
        strips.length = 0;
    }

    return { view, update, destroy, animator: an, headBounds: () => sprites.head.getBounds() };
}

// ---------------------------------------------------------------------------
// Textured strips along a spine
// ---------------------------------------------------------------------------
function makeStrip(PIXI, texture, def, chain, rows) {
    const n = rows + 1;
    const positions = new Float32Array(n * 4);
    const uvs = new Float32Array(n * 4);
    const indices = new Uint16Array(rows * 6);
    const [u0, v0, u1, v1] = def.uv || [0, 0, 1, 1];
    for (let j = 0; j < n; j++) {
        const v = v0 + (v1 - v0) * (j / rows);
        uvs[j * 4] = u0; uvs[j * 4 + 1] = v; uvs[j * 4 + 2] = u1; uvs[j * 4 + 3] = v;
    }
    for (let j = 0; j < rows; j++) {
        const a = j * 2;
        indices[j * 6] = a; indices[j * 6 + 1] = a + 1; indices[j * 6 + 2] = a + 2;
        indices[j * 6 + 3] = a + 1; indices[j * 6 + 4] = a + 3; indices[j * 6 + 5] = a + 2;
    }
    const geometry = new PIXI.MeshGeometry({ positions, uvs, indices });
    const mesh = new PIXI.Mesh({ geometry, texture });
    mesh.label = `${chain.group}:${chain.idx}`;
    return { mesh, geometry, buffer: geometry.getBuffer('aPosition'), positions, rows, chain, half: def.width / 2 };
}

/** Catmull-Rom along the chain points; rows spread ±half-width along the normal. */
function layStrip(st) {
    const ch = st.chain, X = ch.x, Y = ch.y, n = ch.n, rows = st.rows, pos = st.positions;
    const half = st.half * ch.spread;
    const segs = n - 1;
    for (let j = 0; j <= rows; j++) {
        const t = (j / rows) * segs;
        let i = Math.floor(t);
        if (i >= segs) i = segs - 1;
        const f = t - i;
        const i0 = i > 0 ? i - 1 : 0, i2 = i + 1, i3 = i + 2 < n ? i + 2 : n - 1;
        const x0 = X[i0], y0 = Y[i0], x1 = X[i], y1 = Y[i], x2 = X[i2], y2 = Y[i2], x3 = X[i3], y3 = Y[i3];
        const f2 = f * f, f3 = f2 * f;
        const px = 0.5 * (2 * x1 + (-x0 + x2) * f + (2 * x0 - 5 * x1 + 4 * x2 - x3) * f2 + (-x0 + 3 * x1 - 3 * x2 + x3) * f3);
        const py = 0.5 * (2 * y1 + (-y0 + y2) * f + (2 * y0 - 5 * y1 + 4 * y2 - y3) * f2 + (-y0 + 3 * y1 - 3 * y2 + y3) * f3);
        let tx = 0.5 * ((-x0 + x2) + 2 * (2 * x0 - 5 * x1 + 4 * x2 - x3) * f + 3 * (-x0 + 3 * x1 - 3 * x2 + x3) * f2);
        let ty = 0.5 * ((-y0 + y2) + 2 * (2 * y0 - 5 * y1 + 4 * y2 - y3) * f + 3 * (-y0 + 3 * y1 - 3 * y2 + y3) * f2);
        const L = Math.sqrt(tx * tx + ty * ty) || 1;
        tx /= L; ty /= L;
        const o = j * 4;
        // left (u0) = p + n·h with n = (-ty, tx)
        pos[o] = px - ty * half; pos[o + 1] = py + tx * half;
        pos[o + 2] = px + ty * half; pos[o + 3] = py - tx * half;
    }
    st.buffer.update();
}
