/* One camera layout for live scenery and the opening picture. These are
 * screen-space drawings; the bay's water-bearing layer follows world water. */
import { seaAnchorY } from './scenery.mjs';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function backdropLayout({ definition: b, width: W, height: H, cam,
    textureWidth: tw, textureHeight: th, layers = [], depth = null,
    waterTop = 0, count = 1, vista = false, picture = false }) {
    const frameK = H > W * 1.05 ? .08 : .12;
    const feet = cam.y + H / cam.zoom * frameK;
    const mid = (b.x0 + b.x1) / 2;
    let scale = Math.max(W / tw, H / th) * (picture ? 1 : 1.08);
    if (vista) scale = Math.max(W / tw, H / (th * .8)) * 1.08;
    const fw = tw * scale, fh = th * scale, slack = (fw - W) / 2;
    let x = (W - fw) / 2 + (picture || vista ? 0 : clamp(-(cam.x - mid) * cam.zoom * .004, -slack, slack));
    let y = (H - fh) / 2 + (picture ? 0 : clamp(-(cam.y + 200) * cam.zoom * .05, -H * .04, H * .04));
    const groundY = par => H * (.5 + frameK) + (b.ref - feet) * cam.zoom * par;
    if (!picture && b.ref !== undefined) y = Math.min(0, groundY(.02) - b.skyRow * fh);
    if (vista) y = H / 2 - .6 * fh;
    // The opening composition's original centred fit already meets its beach
    // waterline. Preserve it and its custom prop/cloud camera exactly.
    if (!picture && !vista && b.seaY !== undefined) y = seaAnchorY({ H, th, sc: scale,
        seaY: b.seaY, seaRow: b.seaRow, camY: cam.y, zoom: cam.zoom });
    const alpha = count > 1 ? clamp(1 - (Math.abs(cam.x - mid) - (b.x1 - b.x0) / 2) / 1000, 0, 1) : 1;
    const waterY = H / 2 + (waterTop - cam.y) * cam.zoom;
    const result = {
        base: { x, y, scale, alpha },
        skyFloor: b.horizon !== undefined && alpha > .5 ? waterY : Infinity,
        underlay: b.seaY !== undefined && y + fh - 2 < H ? { x: 0, y: y + fh - 2, width: W, height: H - y - fh + 2, alpha } : null,
        layers: [], depths: null
    };
    for (const { definition: l, textureWidth: lw, textureHeight: lh } of layers) {
        const k = fw / lw, height = lh * k;
        let ly = b.ref !== undefined && !vista ? groundY(l.par) - l.y * fh : y + (l.top || 0) * fh;
        // bg-bay is sky; its separate front layer contains cliffs and sea.
        // Raising the hero to the gallery must leave that sea below the view,
        // rather than attaching a second water surface to the gallery floor.
        if (b.horizon !== undefined) ly = waterY - b.horizon * fh + (l.top || 0) * fh;
        const lx = l.repeat ? 0 : picture || vista ? x
            : (W - fw) / 2 + clamp(-(cam.x - mid) * cam.zoom * l.par, -slack, slack);
        result.layers.push({ x: lx, y: ly, scale: k, width: l.repeat ? W : fw, height,
            tileX: picture || vista ? x : x - cam.x * cam.zoom * l.par,
            repeat: !!l.repeat, visible: alpha > .001, alpha,
            below: l.fill !== undefined && ly + height < H ? { x: 0, y: ly + height - 1, width: W, height: H - ly - height + 1, alpha } : null });
    }
    if (depth) {
        const { definition: d, textureWidth: dw, textureHeight: dh } = depth;
        const k = cam.zoom * d.span / dw, height = dh * k;
        result.depths = { x: 0, y: waterY, width: W, height, scale: k,
            tileX: -cam.x * cam.zoom * d.par, alpha, visible: !vista && alpha > .001 && waterY < H,
            below: waterY + height < H ? { x: 0, y: waterY + height - 1, width: W, height: H - waterY - height + 1, alpha } : null };
    }
    return result;
}

/** A snapshot temporarily lays out every layer for a different screen. Keep
 * the live contexts intact, including fills that layout clears and rebuilds. */
export function preserveBackdropState(backdrops) {
    const nodes = backdrops.flatMap(b => [b, b._under, ...(b._layers || []).flatMap(l => [l, l._below]), b._depths, b._depths?._below]).filter(Boolean);
    const saved = nodes.map(s => {
        const state = { s, x: s.x, y: s.y, sx: s.scale.x, sy: s.scale.y, alpha: s.alpha, visible: s.visible,
            tint: s.tint, texture: s.texture, img: s._img, layout: s.backdropLayout,
            width: s.tileScale ? s.width : null, height: s.tileScale ? s.height : null,
            tileX: s.tilePosition?.x, tileY: s.tilePosition?.y, tileSX: s.tileScale?.x, tileSY: s.tileScale?.y,
            context: s.context };
        if (state.context) s.context = state.context.clone();
        return state;
    });
    return () => {
        for (const q of saved) {
            const s = q.s;
            if (q.context) { const temporary = s.context; s.context = q.context; temporary.destroy(); }
            if (q.texture) s.texture = q.texture;
            s._img = q.img; s.backdropLayout = q.layout; s.position.set(q.x, q.y); s.scale.set(q.sx, q.sy);
            s.alpha = q.alpha; s.visible = q.visible; if (q.tint !== undefined) s.tint = q.tint;
            if (s.tileScale) { s.width = q.width; s.height = q.height; s.tilePosition.set(q.tileX, q.tileY); s.tileScale.set(q.tileSX, q.tileSY); }
        }
    };
}
