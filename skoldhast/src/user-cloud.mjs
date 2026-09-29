/* The player's cloud only. The picture's original outline clouds are untouched. */
import { simplifyStroke } from './drawing-geometry.mjs';

export const CLOUD_PENCILS = Object.freeze([
    { id: 'sky', color: '#82b6d2', ink: '#416b89' },
    { id: 'lavender', color: '#b09acd', ink: '#77608e' },
    { id: 'peach', color: '#e9ad7d', ink: '#a36f4c' },
    { id: 'rose', color: '#dca2b4', ink: '#9b6075' },
    { id: 'paper', color: '#fffaf0', ink: '#51473e' }
]);
export const cloudColor = (value) => CLOUD_PENCILS.some(p => p.id === value) ? value : 'paper';

export function cloudPoints(points) {
    if (!Array.isArray(points)) return [];
    const finite = points.filter(p => Array.isArray(p) && p.length >= 2 && p.slice(0, 2).every(v => Number.isFinite(v) && Math.abs(v) <= 10000)).map(p => p.slice(0, 2));
    return simplifyStroke(finite, 200);
}

function path(ctx, points, closed = false) {
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length - 1; i++) ctx.quadraticCurveTo(...points[i], (points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2);
    ctx.lineTo(...points.at(-1));
    if (closed) ctx.closePath();
}

/** Same pencil marks in the draft, on the table and after loading a saved game. */
export function paintUserCloud(ctx, points, { color = 'paper', width = 4.5 } = {}) {
    if (points.length < 2) return;
    const pencil = CLOUD_PENCILS.find(p => p.id === cloudColor(color));
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
    if (pencil.id !== 'paper' && points.length > 2) {
        ctx.save(); path(ctx, points, true); ctx.clip();
        // Soft pigment lets the game's pencil sky show through. Fine diagonal
        // strokes are drawn once into the texture, never as a per-frame filter.
        ctx.fillStyle = pencil.color; ctx.globalAlpha = .43; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        const spacing = Math.max(3.5, width * 1.3), height = y1 - y0;
        ctx.strokeStyle = pencil.ink; ctx.lineWidth = Math.max(.7, width * .21);
        for (let x = x0 - height; x < x1; x += spacing) {
            ctx.globalAlpha = .10 + .04 * Math.sin(x * .37);
            ctx.beginPath(); ctx.moveTo(x, y1 + 2); ctx.lineTo(x + height + 4, y0 - 2); ctx.stroke();
        }
        ctx.restore();
    }
    ctx.strokeStyle = pencil.ink;
    for (let pass = 0; pass < 3; pass++) {
        ctx.globalAlpha = pass ? .17 : .86; ctx.lineWidth = width * (pass ? .55 : .8);
        const shifted = pass ? points.map(([x, y], i) => [x + Math.sin(i * 1.73 + pass) * width * .16, y + Math.cos(i * 2.17 + pass) * width * .13]) : points;
        path(ctx, shifted); ctx.stroke();
    }
    ctx.restore();
}

export function createUserCloud(PIXI, points, color = 'paper') {
    const pts = cloudPoints(points);
    if (pts.length < 2) return null;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 12;
    const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
    const w = Math.max(24, Math.ceil(Math.max(...xs) - x + pad)), h = Math.max(24, Math.ceil(Math.max(...ys) - y + pad));
    const canvas = document.createElement('canvas');
    // Old/corrupt saves cannot allocate enormous WebGL textures.
    const resolution = Math.min(2, 1280 / Math.max(w, h));
    canvas.width = Math.ceil(w * resolution); canvas.height = Math.ceil(h * resolution);
    const ctx = canvas.getContext('2d'); ctx.scale(resolution, resolution);
    paintUserCloud(ctx, pts.map(p => [p[0] - x, p[1] - y]), { color });
    return { texture: PIXI.Texture.from(canvas), box: { x, y, w, h }, pts, color: cloudColor(color) };
}
