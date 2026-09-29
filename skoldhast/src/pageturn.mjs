/*
 * Sköldhästen – paper that turns like a page in a notebook (PixiJS v8, WebGL; meshes only, no filters).
 *
 *   const page = createPage(PIXI, { front, back = null, width, height, columns = 32, rows = 8 });
 *   parent.addChild(page.view);
 *   page.set(t, { hinge = 'left', curl = 0.35, perspective = 1, lift = 0.08 });  // 0 flat … 1 turned over
 *   page.destroy();
 *
 *   await turnScreen(PIXI, app, { texture, hinge = 'left', duration = 1, back = null, lessMotion = false, parent = app.stage });
 *
 * The sheet bends around a vertical hinge. Every vertical strip of paper turns with its own sine ease,
 * the free edge ahead of the hinge, so a curl travels across the sheet while the hinge side stays flat.
 * t works like time: pass linear progress and the motion eases in and out by itself. The lifted paper
 * comes toward an eye above the sheet (perspective), is lit from the hinge side (darkest as it passes
 * 90°), casts a soft shadow beside its fold onto whatever lies beneath and carries a pencil outline.
 * The back is paper with the front showing faintly through, mirrored, unless a back texture is given.
 *
 * How it is drawn: the part of the sheet that faces the viewer and the part that faces away are
 * separate meshes, front first. The paper's height grows from the hinge outward, so the part that has
 * folded over is always the nearer one. Vertices past the fold collapse onto it, so each mesh covers
 * only its own side. Light is a black/white overlay whose UVs index a small ramp texture. Everything is
 * allocated in createPage; set() rewrites positions and a few UVs and allocates nothing.
 */

const PI = Math.PI;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a, b, v) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x); };

/** Sine ease-in-out on [0, 1], clamped. */
export function easeInOut(x) { return x <= 0 ? 0 : x >= 1 ? 1 : 0.5 - 0.5 * Math.cos(PI * x); }

// --- the look (tuned by eye in dev/pageturn.html) ------------------------------------------------------
const CURL = 0.6;          // how far (in t) the hinge lags behind the free edge, per unit of curl
const EYE = 6;             // eye height above the sheet, in page widths, at perspective 1
const NEAR = 0.8;          // paper never comes closer to the eye than 20 % of its height
const LIGHT = 0.15;        // the light leans in a little from the hinge side
const DIM = 0.32;          // how much the front darkens when it faces away from the light
const DIM_BACK = 0.26;     // … and the back (thin paper: the lamp shines through it)
const GLOW = 0.6;          // how much of the brightening beyond flat shows
const SHADOW = 0.36;       // darkest shadow on what lies beneath (paper close to it)
const SHADOW_FAR = 0.25;   // height (in page widths) at which the shadow has faded to half
const SHADOW_X = 0.3;      // shadow offset per unit of height, away from the hinge …
const SHADOW_Y = 0.08;     // … and down the page
const BLUR = 0.1;          // shadow softness per unit of height
const SHADOW_MAX_PX = 110; // the shadow never reaches further than this from the fold, in screen pixels
const PAPER = 0xfbf8f1;
const PENCIL = 0x4a443e;
const SHADE_RGB = [59, 45, 34];   // shade and shadow: warm graphite, not black

/**
 * A sheet of paper with a front and a back that turns around a vertical hinge on its left or right edge.
 *
 * @param PIXI the PixiJS namespace
 * @param o.front      Texture on the front (stretched over the sheet, or tiled with `tile`)
 * @param o.back       Texture on the back (reads correctly once turned over), or null for paper with the
 *                     front showing faintly through
 * @param o.width, o.height  size of the sheet in the parent's units (screen pixels, world units, …)
 * @param o.columns, o.rows  mesh resolution (32 × 8 is plenty; columns run across the turn)
 * @param o.tile       tile `front` at one texel per unit (like Graphics textureSpace 'global'); the texture
 *                     must be a whole image with addressMode 'repeat' (e.g. mat-paper), not an atlas frame
 * @param o.paper, o.paperColor, o.showThrough  the back when `back` is null: a tiled paper texture
 *                     (default: a generated grain), its tint, and the alpha of the mirrored front
 * @param o.edges      'all' outlines the whole sheet, 'free' only the free edge and the fold
 * @param o.lineColor, o.lineAlpha, o.lineWidth (screen px), o.lineTexture  the pencil outline
 * Any option of set() given here becomes that option's default.
 */
export function createPage(PIXI, {
    front, back = null, width, height, columns = 32, rows = 8,
    tile = false, paper = null, paperColor = PAPER, showThrough = 0.16,
    edges = 'all', lineColor = PENCIL, lineAlpha = 0.8, lineWidth = 1.8, lineTexture = null,
    hinge = 'left', curl = 0.35, perspective = 1, lift = 0.08, slant = 0.04,
    shadow = 1, shade = 1, outline = 1, eye = null, px = 0
} = {}) {
    if (!front) throw new Error('createPage: a front texture is needed');
    const W = Math.max(1e-3, +width || 0), H = Math.max(1e-3, +height || 0);
    const C = Math.max(2, columns | 0), R = Math.max(1, rows | 0);
    const C1 = C + 1, NV = C1 * (R + 1);

    // --- textures we own ------------------------------------------------------------------------------
    const owned = [];
    const own = (t) => { owned.push(t); return t; };
    const ramp = own(rampTexture(PIXI));
    const shadowLut = own(shadowTexture(PIXI));
    const lineTex = lineTexture || own(pencilTexture(PIXI));
    const paperTex = back ? null : paper || own(grainTexture(PIXI));

    // --- rest-state UVs and the grid's triangles ------------------------------------------------------
    const frontUV = new Float32Array(NV * 2), backUV = new Float32Array(NV * 2);
    const tw = tile ? front.width || 1 : W, th = tile ? front.height || 1 : H;
    const bw = back ? W : paperTex.width || 1, bh = back ? H : paperTex.height || 1;
    for (let i = 0; i <= R; i++) {
        for (let j = 0; j <= C; j++) {
            const x = (j / C) * W, y = (i / R) * H, q = (i * C1 + j) * 2;
            frontUV[q] = x / tw; frontUV[q + 1] = y / th;
            // a back texture is mirrored so that it reads correctly once the sheet has turned over
            backUV[q] = back ? 1 - x / W : x / bw; backUV[q + 1] = y / bh;
        }
    }
    const IDX = new Uint32Array(C * R * 6);
    for (let i = 0, n = 0; i < R; i++) {
        for (let j = 0; j < C; j++) {
            const a = i * C1 + j, b = a + 1, c = a + C1 + 1, d = a + C1;
            IDX[n++] = a; IDX[n++] = b; IDX[n++] = c; IDX[n++] = a; IDX[n++] = c; IDX[n++] = d;
        }
    }

    // --- scratch, all allocated once -------------------------------------------------------------------
    const HX = new Float32Array(NV);   // hinge-left x of the bent sheet, before perspective
    const HZ = new Float32Array(NV);   // height above the surface
    const PHI = new Float32Array(NV);  // how far that strip of paper has turned (0 … π)
    const PX = new Float32Array(NV);   // projected x (hinge-left)
    const PY = new Float32Array(NV);   // projected y
    const CREST = new Int16Array(R + 1); // per row: the column where the sheet folds over (C: it does not)
    const FP = new Float32Array(NV * 2), BP = new Float32Array(NV * 2);   // positions of the two sides
    const FS = new Float32Array(NV * 2), BS = new Float32Array(NV * 2);   // their light (ramp UVs)
    for (let v = 0; v < NV; v++) { FS[v * 2] = BS[v * 2] = 0.5; FS[v * 2 + 1] = BS[v * 2 + 1] = 0.5; }

    const geometries = [];
    function mesh(positions, uvs, texture, indices) {
        const geometry = new PIXI.MeshGeometry({ positions, uvs, indices });
        geometries.push(geometry);
        return new PIXI.Mesh({ geometry, texture });
    }
    const pos = (m) => m.geometry.getBuffer('aPosition');
    const uvb = (m) => m.geometry.getBuffer('aUV');

    const view = new PIXI.Container();
    view.label = 'page';

    // the shadow on what lies beneath: per row a band from the fold outward, with fringe rows above and below
    const NS = (R + 3) * 3;
    const SP = new Float32Array(NS * 2), SU = new Float32Array(NS * 2);
    const SIDX = new Uint32Array((R + 2) * 12);
    for (let r = 0, n = 0; r < R + 2; r++) {
        for (let c = 0; c < 2; c++) {
            const a = r * 3 + c, b = a + 1, d = a + 3, e = a + 4;
            SIDX[n++] = a; SIDX[n++] = b; SIDX[n++] = e; SIDX[n++] = a; SIDX[n++] = e; SIDX[n++] = d;
        }
    }
    const shadowMesh = mesh(SP, SU, shadowLut, SIDX);

    const frontMesh = mesh(FP, frontUV, front, IDX);
    const frontShade = mesh(FP, FS, ramp, IDX);
    const backMesh = mesh(BP, backUV, back || paperTex, IDX);
    if (!back) backMesh.tint = paperColor;
    const ghost = !back && showThrough > 0 ? mesh(BP, frontUV, front, IDX) : null;
    if (ghost) ghost.alpha = showThrough;
    const backShade = mesh(BP, BS, ramp, IDX);

    // pencil outlines: polylines over the grid, each point a (row, column-from-hinge) pair
    const colLine = (k) => { const a = []; for (let i = 0; i <= R; i++) a.push(i, k); return a; };
    const rowLine = (i) => { const a = []; for (let k = 0; k <= C; k++) a.push(i, k); return a; };
    const allEdges = edges !== 'free';
    const frontLine = outlineMesh(allEdges ? [colLine(C), rowLine(0), rowLine(R), colLine(0)] : [colLine(C)]);
    const backLine = outlineMesh(allEdges ? [colLine(0), colLine(C), rowLine(0), rowLine(R)] : [colLine(0), colLine(C)]);

    function outlineMesh(lines) {
        let n = 0;
        for (const l of lines) n += l.length / 2;
        const ref = new Int16Array(n * 2), starts = new Int32Array(lines.length + 1);
        const P = new Float32Array(n * 4), U = new Float32Array(n * 4);
        const I = new Uint32Array(Math.max(1, n - lines.length) * 6);
        const period = (lineTex.width || 64) * 1.25;
        let p = 0, q = 0;
        lines.forEach((l, s) => {
            starts[s] = p;
            let len = 0;
            for (let m = 0; m < l.length; m += 2, p++) {
                ref[p * 2] = l[m]; ref[p * 2 + 1] = l[m + 1];
                if (m > 0) len += Math.hypot(((l[m + 1] - l[m - 1]) * W) / C, ((l[m] - l[m - 2]) * H) / R);
                U[p * 4] = U[p * 4 + 2] = len / period; U[p * 4 + 1] = 0; U[p * 4 + 3] = 1;
                if (m > 0) { const a = (p - 1) * 2, b = p * 2; I[q++] = a; I[q++] = a + 1; I[q++] = b + 1; I[q++] = a; I[q++] = b + 1; I[q++] = b; }
            }
        });
        starts[lines.length] = p;
        const m = mesh(P, U, lineTex, I);
        m.tint = lineColor;
        m._line = { ref, starts, P };
        return m;
    }

    view.addChild(shadowMesh, frontMesh, frontShade, frontLine, backMesh);
    if (ghost) view.addChild(ghost);
    view.addChild(backShade, backLine);

    // --- options: set() falls back on createPage's, without allocating ---------------------------------------
    const o = { hinge, curl, perspective, lift, slant, shadow, shade, outline, eyeX: 0, eyeY: 0, px: 1 };
    const M = new PIXI.Matrix();
    const NONE = {};
    function resolve(opts) {
        const s = opts || NONE;
        o.hinge = s.hinge ?? hinge; o.curl = s.curl ?? curl; o.perspective = s.perspective ?? perspective;
        o.lift = s.lift ?? lift; o.slant = s.slant ?? slant; o.shadow = s.shadow ?? shadow;
        o.shade = s.shade ?? shade; o.outline = s.outline ?? outline;
        const e = s.eye ?? eye;
        o.eyeX = e ? e.x : W / 2; o.eyeY = e ? e.y : H / 2;
        o.px = s.px || px || screenUnit();
    }
    /** Parent units per screen pixel, from the global transform (for line widths and shadow softness). */
    function screenUnit() {
        if (!view.parent) return 1;
        const m = view.getGlobalTransform(M, false);
        const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
        return s > 1e-6 && Number.isFinite(s) ? 1 / s : 1;
    }

    // --- the shape ---------------------------------------------------------------------------------------------
    /** Bends and projects the sheet into the scratch arrays; returns how far it reaches from the hinge. */
    function compute(t) {
        t = clamp01(+t || 0);
        const hl = o.hinge !== 'right';
        const delta = Math.min(0.92, Math.max(0, o.curl) * CURL), inv = 1 / (1 - delta);
        const ds = W / C;
        const D = o.perspective > 0 ? (EYE * W) / o.perspective : 0, zMax = D * NEAR;
        const bump = Math.sin(PI * t);
        const zl = Math.max(0, o.lift) * W * bump * bump;  // rises from nothing at the hinge
        const ex = hl ? o.eyeX : W - o.eyeX, ey = o.eyeY;
        const sl = o.slant * bump;
        let reach = -Infinity;
        for (let i = 0; i <= R; i++) {
            const y = (i / R) * H;
            const ti = clamp01(t + sl * (i / R - 0.5)); // slant > 0: the bottom corner leads
            let x = 0, z = 0, prev = 0, lastX = -Infinity, crest = C;
            for (let k = 0; k <= C; k++) {
                const phi = PI * easeInOut((ti - delta * (1 - k / C)) * inv);
                if (k > 0) {
                    // each segment is a circular arc from the previous angle to this one
                    const d = 0.5 * (phi - prev), m = 0.5 * (phi + prev);
                    const s = d > 1e-6 || d < -1e-6 ? (ds * Math.sin(d)) / d : ds;
                    x += s * Math.cos(m); z += s * Math.sin(m);
                }
                prev = phi;
                const id = i * C1 + (hl ? k : C - k);
                const zz = z + (k < C / 2 ? zl * smoothstep(0, C / 2, k) : zl);
                const f = D > 0 ? D / (D - (zz < zMax ? zz : zMax)) : 1;
                const X = ex + (x - ex) * f;
                HX[id] = x; HZ[id] = zz; PHI[id] = phi;
                PX[id] = X; PY[id] = ey + (y - ey) * f;
                if (crest === C && X < lastX) crest = k - 1; // the first step back: the fold
                lastX = X;
                if (X > reach) reach = X;
            }
            CREST[i] = crest;
        }
        return reach;
    }

    // light: the cosine to a lamp leaning in from the hinge side, 1 for paper lying flat
    const litFront = (phi) => LIGHT * Math.sin(phi) + Math.cos(phi);
    const litBack = (phi) => -LIGHT * Math.sin(phi) - Math.cos(phi);
    /** Light → ramp u: 0.5 clear, above it black (paper turned from the lamp), below it white. */
    const shadeU = (d, dim, k) => {
        if (d >= 1) return 0.5 - 0.5 * Math.min(1, GLOW * (d - 1) * k);
        const away = 1 - (d > 0 ? d : 0);
        return 0.5 + 0.5 * Math.min(1, dim * away * Math.sqrt(away) * k);
    };
    const shadowAlpha = (z) => SHADOW * smoothstep(0, 0.025 * W, z) * (SHADOW_FAR * W) / (SHADOW_FAR * W + z);

    function write() {
        const hl = o.hinge !== 'right';
        const sk = Math.max(0, o.shade);
        let anyFront = false, anyBack = false;
        for (let i = 0; i <= R; i++) {
            const crest = CREST[i];
            if (crest > 0) anyFront = true;
            if (crest < C) anyBack = true;
            const cid = i * C1 + (hl ? crest : C - crest);
            const cx = hl ? PX[cid] : W - PX[cid], cy = PY[cid];
            const cf = shadeU(litFront(PHI[cid]), DIM, sk), cb = shadeU(litBack(PHI[cid]), DIM_BACK, sk);
            for (let k = 0; k <= C; k++) {
                const id = i * C1 + (hl ? k : C - k), j = id * 2;
                const x = hl ? PX[id] : W - PX[id], y = PY[id];
                if (k <= crest) { FP[j] = x; FP[j + 1] = y; FS[j] = shadeU(litFront(PHI[id]), DIM, sk); }
                else { FP[j] = cx; FP[j + 1] = cy; FS[j] = cf; }
                if (k >= crest) { BP[j] = x; BP[j + 1] = y; BS[j] = shadeU(litBack(PHI[id]), DIM_BACK, sk); }
                else { BP[j] = cx; BP[j + 1] = cy; BS[j] = cb; }
            }
        }
        frontMesh.visible = anyFront;
        frontShade.visible = anyFront && sk > 0;
        backMesh.visible = anyBack;
        if (ghost) ghost.visible = anyBack;
        backShade.visible = anyBack && sk > 0;
        pos(frontMesh).update(); pos(frontShade).update(); uvb(frontShade).update();
        pos(backMesh).update(); if (ghost) pos(ghost).update(); pos(backShade).update(); uvb(backShade).update();

        writeShadow(hl);

        const la = lineAlpha * Math.max(0, o.outline);
        frontLine.alpha = backLine.alpha = la;
        frontLine.visible = anyFront && la > 0.003;
        backLine.visible = anyBack && la > 0.003;
        if (frontLine.visible) writeLine(frontLine, FP, hl);
        if (backLine.visible) writeLine(backLine, BP, hl);
    }

    function writeShadow(hl) {
        const k = Math.max(0, o.shadow);
        const tuck = 1.5 * o.px, cap = SHADOW_MAX_PX * o.px;
        let any = false;
        for (let i = 0; i <= R; i++) {
            const crest = CREST[i];
            const cid = i * C1 + (hl ? crest : C - crest);
            // from the fold (the sheet's outermost point, as seen), darkest there …
            const sx = PX[cid] - tuck, sy = PY[cid];
            // … out to where the lifted paper's shadow ends on the surface below, plus its blur
            let rx = sx + tuck, rz = HZ[cid];
            for (let c = 0; c <= C; c++) {
                const id = i * C1 + (hl ? c : C - c);
                const xs = HX[id] + SHADOW_X * HZ[id];
                if (xs > rx) { rx = xs; rz = HZ[id]; }
            }
            const ex = Math.min(rx + 2 * o.px + BLUR * rz, sx + cap);
            const ey = (i / R) * H + SHADOW_Y * rz;
            const a = shadowAlpha(rz) * k;   // as strong as the paper casting it is close to the surface
            if (a > 0.003) any = true;
            shadowRow(i + 1, sx, sy, ex, ey, 0, 0, a, hl);
            if (i === 0) shadowRow(0, sx, sy, ex, ey, -(ex - sx) * 0.5, 1, a, hl);
            if (i === R) shadowRow(R + 2, sx, sy, ex, ey, (ex - sx) * 0.5, 1, a, hl);
        }
        shadowMesh.visible = any;
        if (any) { pos(shadowMesh).update(); uvb(shadowMesh).update(); }
    }
    /** One shadow row from the fold (sx, sy) to where it has faded (ex, ey); fringe rows fade out above and
     *  below. UVs index the shadow LUT: u runs across the soft edge, v is the strength. */
    function shadowRow(r, sx, sy, ex, ey, dy, fringe, a, hl) {
        const j = r * 6, mx = 0.5 * (sx + ex), my = 0.5 * (sy + ey);
        SP[j] = hl ? sx : W - sx; SP[j + 1] = sy + dy;
        SP[j + 2] = hl ? mx : W - mx; SP[j + 3] = my + dy;
        SP[j + 4] = hl ? ex : W - ex; SP[j + 5] = ey + dy;
        SU[j] = fringe; SU[j + 1] = a;
        SU[j + 2] = fringe ? 1 : 0.5; SU[j + 3] = a;
        SU[j + 4] = 1; SU[j + 5] = a;
    }

    function writeLine(m, P, hl) {
        const { ref, starts, P: out } = m._line;
        const hw = 0.5 * lineWidth * o.px;
        const eps = 1e-6 * (W + H);
        let nx = 1, ny = 0;
        for (let s = 0; s + 1 < starts.length; s++) {
            const a = starts[s], b = starts[s + 1];
            for (let p = a; p < b; p++) {
                const v0 = vid(ref, p > a ? p - 1 : p, hl), v1 = vid(ref, p < b - 1 ? p + 1 : p, hl), vc = vid(ref, p, hl);
                const tx = P[v1 * 2] - P[v0 * 2], ty = P[v1 * 2 + 1] - P[v0 * 2 + 1];
                const l = Math.sqrt(tx * tx + ty * ty);
                if (l > eps) { nx = -ty / l; ny = tx / l; } // collapsed points keep the last normal
                const x = P[vc * 2], y = P[vc * 2 + 1], q = p * 4;
                out[q] = x + nx * hw; out[q + 1] = y + ny * hw; out[q + 2] = x - nx * hw; out[q + 3] = y - ny * hw;
            }
        }
        pos(m).update();
    }
    const vid = (ref, p, hl) => ref[p * 2] * C1 + (hl ? ref[p * 2 + 1] : C - ref[p * 2 + 1]);

    // --- the page ----------------------------------------------------------------------------------------------
    let destroyed = false, current = 0;
    const page = {
        view,
        get width() { return W; },
        get height() { return H; },
        get t() { return current; },
        /**
         * t: 0 flat (covers its rectangle exactly) … 1 turned fully over onto the other side of the hinge.
         * Options (each falls back on createPage's): hinge 'left'|'right', curl (0 rigid … 1 a rolling peel),
         * perspective (0 flat … 2 strong), lift (hover at mid-turn, in page widths), slant (the bottom corner
         * leads; negative: the top), shadow, shade, outline (strength multipliers), eye {x, y} (the point under
         * the viewer, in the page's units; default its centre), px (units per screen pixel; default measured).
         */
        set(t, opts) {
            if (destroyed) return page;
            resolve(opts);
            current = clamp01(+t || 0);
            compute(current);
            write();
            return page;
        },
        /** How far the turned sheet reaches from its hinge, seen from above (page units; ≤ 0: all of it
         *  is on the other side of the hinge). Changes nothing on screen. */
        reach(t, opts) {
            if (destroyed) return 0;
            resolve(opts);
            return compute(t);
        },
        /**
         * A clock for a turn watched through the band x0 … x1 of the sheet's own x (the screen, the camera's
         * view): returns k ↦ t for k = 0 … 1 (time / duration). A short lift, then the fold eases across the
         * band, and at k = 1 no part of the sheet is left in it (or it has turned fully over, if the band
         * reaches past the hinge), so the turn fills its time whatever the size, curl and perspective.
         * Build it when the turn starts, with the options it will run with; the clock allocates nothing.
         */
        timeline(x0 = 0, x1 = W, opts) {
            if (destroyed) return clamp01;
            resolve(opts);
            const hl = o.hinge !== 'right';
            const a = hl ? Math.min(x0, x1) : W - Math.max(x0, x1);
            const b = Math.min(hl ? Math.max(x0, x1) : W - Math.min(x0, x1), compute(0));
            if (!(b > a)) return clamp01; // the band never sees the sheet
            // when the sheet has left the band
            const gone = (t) => compute(t) <= a;
            let lo = 0, hi = 1;
            for (let n = 1; n <= 32; n++) if (gone(n / 32)) { lo = (n - 1) / 32; hi = n / 32; break; }
            if (hi < 1 || gone(1)) for (let n = 0; n < 10; n++) { const m = 0.5 * (lo + hi); if (gone(m)) hi = m; else lo = m; }
            const tEnd = hi;
            // visible progress along t: the lift (a few %), then how much of the band is uncovered
            const N = 48, LIFT = 0.04, P = new Float32Array(N + 1);
            let lifted = 0;
            for (let n = 0; n <= N; n++) {
                const sw = 1 - clamp01((compute((tEnd * n) / N) - a) / (b - a));
                if (!lifted && sw > 0.004) lifted = Math.max(1, n);
                P[n] = sw;
            }
            if (!lifted) lifted = N;
            for (let n = 0; n <= N; n++) {
                const p = LIFT * Math.min(1, n / lifted) + (1 - LIFT) * P[n];
                P[n] = Math.max(p, n > 0 ? P[n - 1] + 1e-5 : 0);
            }
            const top = P[N];
            return (k) => {
                const p = timing(clamp01(k)) * top;
                let n = 1;
                while (n < N && P[n] < p) n++;
                const u = P[n] > P[n - 1] ? clamp01((p - P[n - 1]) / (P[n] - P[n - 1])) : 1;
                return (tEnd * (n - 1 + u)) / N;
            };
        },
        /** Frees what createPage made (meshes, geometry, generated textures), not the textures passed in. */
        destroy() {
            if (destroyed) return;
            destroyed = true;
            view.parent?.removeChild(view);
            if (!view.destroyed) view.destroy({ children: true });
            for (const g of geometries) g.destroy();
            for (const t of owned) t.destroy(true);
            geometries.length = 0; owned.length = 0;
        }
    };
    page.set(0);
    return page;
}

/**
 * A full-screen turn under manual control: the old picture as a page over the screen, hinged at the
 * left or right screen edge. at(k) shows progress k ∈ [0, 1] (eased; at 1 the page has just left the
 * screen). turnScreen() drives one of these from requestAnimationFrame; the dev page scrubs it.
 */
export function createScreenTurn(PIXI, app, {
    texture, hinge = 'left', back = null, parent = app.stage,
    width = app.screen.width, height = app.screen.height,
    curl = 0.35, perspective = 1, lift = 0.08, slant = 0.05
} = {}) {
    const page = createPage(PIXI, {
        front: texture, back, width, height, columns: 32, rows: 8, edges: 'free',
        hinge, curl, perspective, lift, slant, px: 1
    });
    parent.addChild(page.view);
    const clock = page.timeline(0, width);
    const frame = { shadow: 1, outline: 0 };
    const turn = {
        page,
        at(k) {
            k = clamp01(k);
            frame.outline = smoothstep(0, 0.06, k);
            frame.shadow = 1 - smoothstep(0.85, 1, k);
            page.set(clock(k), frame);
            return turn;
        },
        destroy() { page.destroy(); }
    };
    turn.at(0);
    return turn;
}
/** Ease in, and out only a little: the sheet leaves the view still moving, as a turned page does. */
function timing(k) { return k * k * (2 - k); }

/**
 * The old picture turns away like a notebook page and shows whatever is drawn underneath it.
 * `texture` is the old picture (e.g. a RenderTexture of the last frame), stretched over the screen; it is
 * not destroyed. The page goes on top of `parent` (screen space) and is drawn by the caller's own loop
 * (app.render()); this only moves it on requestAnimationFrame. Resolves when done, after removing and
 * destroying what it made. lessMotion: a short crossfade instead. Extra look options: curl, perspective,
 * lift, slant.
 */
export function turnScreen(PIXI, app, {
    texture, hinge = 'left', duration = 1.0, back = null, lessMotion = false, parent = app.stage,
    curl, perspective, lift, slant
} = {}) {
    return new Promise((resolve) => {
        if (!texture || !app?.renderer) { resolve(); return; }
        let ms = Math.max(0, +duration || 0) * 1000;
        let show, done;
        if (lessMotion) {
            const s = new PIXI.Sprite(texture);
            s.width = app.screen.width; s.height = app.screen.height;
            parent.addChild(s);
            ms = Math.min(450, Math.max(200, ms * 0.4));
            show = (k) => { s.alpha = 1 - easeInOut(k); };
            done = () => { s.parent?.removeChild(s); if (!s.destroyed) s.destroy(); };
            show(0);
        } else {
            const look = { texture, hinge, back, parent };
            if (curl !== undefined) look.curl = curl;
            if (perspective !== undefined) look.perspective = perspective;
            if (lift !== undefined) look.lift = lift;
            if (slant !== undefined) look.slant = slant;
            const turn = createScreenTurn(PIXI, app, look);
            show = turn.at;
            done = () => turn.destroy();
            const alive = () => !turn.page.view.destroyed;
            const inner = show;
            show = (k) => { if (alive()) inner(k); };
        }
        let t0 = -1;
        const tick = (now) => {
            if (!app.renderer) { done(); resolve(); return; }
            if (t0 < 0) t0 = now;
            const k = ms > 0 ? (now - t0) / ms : 1;
            show(k < 1 ? k : 1);
            if (k >= 1) { done(); resolve(); } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
}

// --- generated textures ------------------------------------------------------------------------------------------
function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}
function toTexture(PIXI, c, repeat) {
    return PIXI.Texture.from({ resource: c, addressMode: repeat ? 'repeat' : 'clamp-to-edge', scaleMode: 'linear' }, true);
}
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

/** 256 × 1: white fading out to clear at the middle, then shade fading in (the light overlay). */
function rampTexture(PIXI) {
    const n = 256, c = canvas(n, 1), g = c.getContext('2d'), im = g.createImageData(n, 1);
    for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, white = u < 0.5;
        im.data[i * 4] = white ? 255 : SHADE_RGB[0];
        im.data[i * 4 + 1] = white ? 255 : SHADE_RGB[1];
        im.data[i * 4 + 2] = white ? 255 : SHADE_RGB[2];
        im.data[i * 4 + 3] = Math.round(255 * (white ? 0.5 - u : u - 0.5) * 2);
    }
    g.putImageData(im, 0, 0);
    return toTexture(PIXI, c, false);
}
/** 64 × 32 shadow LUT: u runs across the soft edge (1 → 0), v is the shadow's strength. */
function shadowTexture(PIXI) {
    const w = 64, h = 32, c = canvas(w, h), g = c.getContext('2d'), im = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const u = x / (w - 1), v = y / (h - 1);
            const q = (y * w + x) * 4;
            im.data[q] = SHADE_RGB[0]; im.data[q + 1] = SHADE_RGB[1]; im.data[q + 2] = SHADE_RGB[2];
            im.data[q + 3] = Math.round(255 * v * (1 - u * u * (3 - 2 * u)));
        }
    }
    g.putImageData(im, 0, 0);
    return toTexture(PIXI, c, false);
}
/** 64 × 8 pencil stroke: grainy along its length, soft across (so it also hides aliased edges). */
function pencilTexture(PIXI) {
    const w = 64, h = 8, c = canvas(w, h), g = c.getContext('2d'), im = g.createImageData(w, h);
    const rnd = rng(7);
    const grain = new Float32Array(w);
    for (let x = 0; x < w; x++) grain[x] = 0.62 + 0.38 * rnd();
    const across = [0, 0.4, 0.85, 1, 1, 0.85, 0.4, 0];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const gr = (grain[(x + w - 1) % w] + 2 * grain[x] + grain[(x + 1) % w]) / 4;
            const q = (y * w + x) * 4;
            im.data[q] = im.data[q + 1] = im.data[q + 2] = 255;
            im.data[q + 3] = Math.round(255 * across[y] * Math.min(1, gr * (0.85 + 0.3 * rnd())));
        }
    }
    g.putImageData(im, 0, 0);
    return toTexture(PIXI, c, true);
}
/** 128 × 128 neutral paper grain (tinted with the paper colour on the back of the sheet). */
function grainTexture(PIXI) {
    const n = 128, c = canvas(n, n), g = c.getContext('2d'), im = g.createImageData(n, n);
    const rnd = rng(3);
    const coarse = new Float32Array(16 * 16);
    for (let i = 0; i < coarse.length; i++) coarse[i] = rnd();
    const at = (x, y) => coarse[((y + 16) % 16) * 16 + ((x + 16) % 16)];
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            // smooth blotches (tiling value noise) plus fine tooth
            const fx = x / 8, fy = y / 8, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy;
            const sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy);
            const blot = (at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) + (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy;
            const v = 255 - 12 * blot - 16 * rnd() * rnd() * rnd();
            const q = (y * n + x) * 4;
            im.data[q] = im.data[q + 1] = im.data[q + 2] = Math.round(v);
            im.data[q + 3] = 255;
        }
    }
    g.putImageData(im, 0, 0);
    return toTexture(PIXI, c, true);
}
