/* Pencil for the shapes the engine draws while playing (paper that unfolds,
 * kelp that is pulled, a crease that opens). Flat vector colour can never sit
 * on the same sheet as the drawn art, so lines are broken on the paper's tooth
 * and fills are laid in with strokes, from two white tiles that a tint colours
 * (`pencil-grain`, `pencil-hatch`; see scripts/skoldhast-art/materials.mjs).
 * Until the boot art has arrived, the same calls fall back to plain colour. */
export function pencilStyle(texture) {
    const tex = name => (typeof texture === 'function' ? texture(name) : null) || null;
    const tooth = () => { const grain = tex('pencil-grain'); return grain ? { texture: grain, textureSpace: 'global' } : {}; };
    return {
        get ready() { return !!(tex('pencil-grain') && tex('pencil-hatch')); },
        /** A pencil line: round ends, broken a little by the tooth. */
        line(color, width, alpha = 1, extra = {}) {
            return { color, width, alpha, cap: 'round', join: 'round', ...tooth(), ...extra };
        },
        /** Colour pressed in hard: solid, with the paper's tooth showing. */
        fill(color, alpha = 1) {
            return { color, alpha, ...tooth() };
        },
        /** Colour laid in with strokes in one hand's direction. */
        hatch(color, alpha = 1) {
            const hatch = tex('pencil-hatch');
            return hatch ? { color, alpha, texture: hatch, textureSpace: 'global' } : { color, alpha: alpha * 0.55 };
        },
        /** One of the world's own materials (mat-earth, mat-grass …), in world space. */
        material(name, alpha = 1, fallback = 0xcccccc) {
            const t = tex(name);
            return t ? { texture: t, textureSpace: 'global', alpha } : { color: fallback, alpha };
        }
    };
}

/**
 * Every stroke this Graphics draws from now on is broken on the paper's tooth,
 * unless it already names a texture. One call per shape converts a module's
 * lines without touching each colour and width it chose.
 */
export function pencilStrokes(g, texture) {
    const stroke = g.stroke;
    g.stroke = function (style, ...rest) {
        const grain = typeof texture === 'function' ? texture('pencil-grain') : null;
        if (grain && style !== undefined) {
            const base = typeof style === 'object' && style !== null && !Array.isArray(style) && !('r' in style) ? style : { color: style };
            if (!base.texture) style = { cap: 'round', join: 'round', ...base, texture: grain, textureSpace: 'global' };
        }
        return stroke.call(this, style, ...rest);
    };
    return g;
}

/**
 * The Pixi namespace for the world's renderer, whose Graphics draw every
 * stroke in pencil (see pencilStrokes). Everything else is Pixi itself.
 */
export function pencilPixi(PIXI, texture) {
    class PencilGraphics extends PIXI.Graphics {
        constructor(...args) { super(...args); pencilStrokes(this, texture); }
    }
    return { ...PIXI, Graphics: PencilGraphics };
}

/** A surface line resampled every `step` world units along x (it must run left to right). */
export function resampleX(pts, step = 12) {
    const out = [];
    for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const n = Math.max(1, Math.ceil(Math.abs(x1 - x0) / step));
        for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
    }
    if (pts.length) out.push([...pts.at(-1)]);
    return out;
}

/** The ragged lower edge of a band hanging under a surface line (turf over earth):
 * tufts and roots reach down unevenly, never a ruler-straight seam. */
export function raggedEdge(top, depth, seed = 0) {
    const n = x => { const v = Math.sin(x * 0.0913 + seed * 12.9898) * 43758.5453; return v - Math.floor(v); };
    return resampleX(top, 10).map(([x, y]) => {
        const tuft = n(Math.round(x / 10)), long = Math.sin(x * 0.021 + seed) * 0.16 + Math.sin(x * 0.057 + seed * 2.3) * 0.1;
        return [x, y + depth * (0.74 + long + (tuft > 0.82 ? 0.38 * (tuft - 0.82) / 0.18 : 0.12 * tuft))];
    });
}

/** The band between a surface line and its ragged lower edge, as one polygon. */
export function raggedBand(top, depth, seed = 0) {
    const line = resampleX(top, 10);
    return [...line, ...raggedEdge(top, depth, seed).reverse()];
}
