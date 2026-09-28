/*
 * Pixel-art toolkit for "Miras Stjärnsafari".
 *
 * Every sprite is drawn on a raw RGBA buffer at 1:1 scale, so each call puts
 * down exact pixels (no anti-aliasing). The game draws the sheets with
 * nearest-neighbour scaling, like the site's other sprites.
 *
 * Conventions
 *   - Coordinates are integers, (0, 0) is the top-left pixel.
 *   - Colours are '#rrggbb' or '#rrggbbaa'. null erases.
 *   - Light comes from the top left.
 *   - Sprites face RIGHT; the game mirrors them for walking left.
 */

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------
export function rgba(c) {
    if (c === null || c === undefined) return [0, 0, 0, 0];
    if (Array.isArray(c)) return c.length === 4 ? c : [c[0], c[1], c[2], 255];
    let h = c.replace('#', '');
    if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
    return [r, g, b, a];
}

export function toHex([r, g, b, a = 255]) {
    const p = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
    return `#${p(r)}${p(g)}${p(b)}${a < 255 ? p(a) : ''}`;
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
}

function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = (t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

// Pull a hue towards a target hue by up to `amount` degrees.
function hueToward(h, target, amount) {
    let d = ((target - h + 540) % 360) - 180;
    const step = Math.sign(d) * Math.min(Math.abs(d), amount);
    return h + step;
}

/**
 * Lighten (amount > 0) or darken (amount < 0) with pixel-art hue shifting:
 * shadows drift towards violet, highlights towards warm yellow.
 */
export function shade(c, amount) {
    const [r, g, b, a] = rgba(c);
    let [h, s, l] = rgbToHsl(r, g, b);
    if (amount < 0) {
        const k = -amount;
        h = hueToward(h, 255, 22 * k);
        s = Math.min(1, s * (1 + 0.15 * k));
        l = l * (1 - 0.5 * k);
    } else {
        const k = amount;
        h = hueToward(h, 55, 14 * k);
        s = s * (1 - 0.12 * k);
        l = l + (1 - l) * 0.55 * k;
    }
    return toHex([...hslToRgb(h, s, l), a]);
}

export function mix(c1, c2, t) {
    const a = rgba(c1);
    const b = rgba(c2);
    return toHex(a.map((v, i) => v + (b[i] - v) * t));
}

export function alpha(c, a) {
    const [r, g, b] = rgba(c);
    return toHex([r, g, b, Math.round(a * 255)]);
}

/** A five-step ramp around a base colour: { d2, d1, b, l1, l2 }. */
export function ramp(base, spread = 1) {
    return {
        d2: shade(base, -0.62 * spread),
        d1: shade(base, -0.32 * spread),
        b: toHex(rgba(base)),
        l1: shade(base, 0.32 * spread),
        l2: shade(base, 0.62 * spread)
    };
}

// ---------------------------------------------------------------------------
// Sprite buffer
// ---------------------------------------------------------------------------
export class Sprite {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.data = new Uint8ClampedArray(w * h * 4);
        this.points = {};   // named anchor points, exported to the atlas (e.g. hand)
    }

    inside(x, y) {
        return x >= 0 && y >= 0 && x < this.w && y < this.h;
    }

    // --- Single pixels -----------------------------------------------------
    px(x, y, c) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inside(x, y)) return this;
        const i = (y * this.w + x) * 4;
        if (c === null) {
            this.data[i + 3] = 0;
            return this;
        }
        const [r, g, b, a] = rgba(c);
        if (a === 255 || this.data[i + 3] === 0) {
            this.data[i] = r;
            this.data[i + 1] = g;
            this.data[i + 2] = b;
            this.data[i + 3] = a;
        } else {
            // simple "over" blend for translucent colours (glass, glows)
            const da = this.data[i + 3] / 255;
            const sa = a / 255;
            const oa = sa + da * (1 - sa);
            this.data[i] = (r * sa + this.data[i] * da * (1 - sa)) / oa;
            this.data[i + 1] = (g * sa + this.data[i + 1] * da * (1 - sa)) / oa;
            this.data[i + 2] = (b * sa + this.data[i + 2] * da * (1 - sa)) / oa;
            this.data[i + 3] = oa * 255;
        }
        return this;
    }

    get(x, y) {
        if (!this.inside(x, y)) return [0, 0, 0, 0];
        const i = (y * this.w + x) * 4;
        return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
    }

    opaque(x, y) {
        return this.inside(x, y) && this.data[(y * this.w + x) * 4 + 3] > 0;
    }

    point(name, x, y) {
        this.points[name] = [Math.round(x), Math.round(y)];
        return this;
    }

    // --- Shapes ------------------------------------------------------------
    rect(x, y, w, h, c) {
        for (let yy = y; yy < y + h; yy += 1) {
            for (let xx = x; xx < x + w; xx += 1) this.px(xx, yy, c);
        }
        return this;
    }

    hline(x0, x1, y, c) {
        const a = Math.min(x0, x1);
        const b = Math.max(x0, x1);
        for (let x = a; x <= b; x += 1) this.px(x, y, c);
        return this;
    }

    vline(x, y0, y1, c) {
        const a = Math.min(y0, y1);
        const b = Math.max(y0, y1);
        for (let y = a; y <= b; y += 1) this.px(x, y, c);
        return this;
    }

    /** Filled oval inside the box (x, y, w, h), tested at pixel centres. */
    oval(x, y, w, h, c) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = w / 2;
        const ry = h / 2;
        for (let yy = y; yy < y + h; yy += 1) {
            for (let xx = x; xx < x + w; xx += 1) {
                const dx = (xx + 0.5 - cx) / rx;
                const dy = (yy + 0.5 - cy) / ry;
                if (dx * dx + dy * dy <= 1.08) this.px(xx, yy, c);
            }
        }
        return this;
    }

    /** Oval with volume: base fill, light cap to the top-left, dark rim to the bottom-right. */
    ball(x, y, w, h, { b, l1, d1, l2 = null, d2 = null }, { light = true, dark = true } = {}) {
        this.oval(x, y, w, h, b);
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = w / 2;
        const ry = h / 2;
        for (let yy = y; yy < y + h; yy += 1) {
            for (let xx = x; xx < x + w; xx += 1) {
                const dx = (xx + 0.5 - cx) / rx;
                const dy = (yy + 0.5 - cy) / ry;
                if (dx * dx + dy * dy > 1.08) continue;
                // offset tests: a pixel outside a circle shifted towards the
                // light sits on the shaded (bottom-right) rim, and one outside
                // a circle shifted away from the light sits on the lit rim
                const ox = (xx + 0.5 - (cx - 0.9)) / rx;
                const oy = (yy + 0.5 - (cy - 1.1)) / ry;
                const lx = (xx + 0.5 - (cx + 0.9)) / rx;
                const ly = (yy + 0.5 - (cy + 1.1)) / ry;
                if (dark && ox * ox + oy * oy > 1.0) {
                    this.px(xx, yy, d1);
                } else if (light && lx * lx + ly * ly > 1.0 && dy < 0.2 && dx < 0.4) {
                    this.px(xx, yy, l1);
                }
                if (l2 && light) {
                    const hx = (xx + 0.5 - (cx - rx * 0.38)) / (rx * 0.3);
                    const hy = (yy + 0.5 - (cy - ry * 0.42)) / (ry * 0.24);
                    if (hx * hx + hy * hy <= 1) this.px(xx, yy, l2);
                }
                if (d2 && dark) {
                    const sx = (xx + 0.5 - (cx - 1.6)) / rx;
                    const sy = (yy + 0.5 - (cy - 2)) / ry;
                    if (sx * sx + sy * sy > 1.0 && dy > 0.35) this.px(xx, yy, d2);
                }
            }
        }
        return this;
    }

    circle(cx, cy, r, c) {
        return this.oval(cx - r, cy - r, r * 2 + 1, r * 2 + 1, c);
    }

    line(x0, y0, x1, y1, c) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
            this.px(x0, y0, c);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
        return this;
    }

    /**
     * Thick line: a square stamp of size `t` along the path.
     * onlyOver: paint only where something is already drawn (used to give
     * limbs a contour where they cross the body, leaving the outside to the
     * outline pass).
     */
    thick(x0, y0, x1, y1, t, c, { onlyOver = false } = {}) {
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        const off = Math.floor((t - 1) / 2);
        for (let i = 0; i <= steps; i += 1) {
            const x = Math.round(x0 + ((x1 - x0) * i) / steps);
            const y = Math.round(y0 + ((y1 - y0) * i) / steps);
            for (let yy = y - off; yy < y - off + t; yy += 1) {
                for (let xx = x - off; xx < x - off + t; xx += 1) {
                    if (onlyOver && !this.opaque(xx, yy)) continue;
                    this.px(xx, yy, c);
                }
            }
        }
        return this;
    }

    /** Filled polygon, even-odd rule at pixel centres. points: [[x,y], ...] */
    poly(points, c) {
        const ys = points.map((p) => p[1]);
        const minY = Math.floor(Math.min(...ys));
        const maxY = Math.ceil(Math.max(...ys));
        for (let y = minY; y <= maxY; y += 1) {
            const cy = y + 0.5;
            const xs = [];
            for (let i = 0; i < points.length; i += 1) {
                const [ax, ay] = points[i];
                const [bx, by] = points[(i + 1) % points.length];
                if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) {
                    xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
                }
            }
            xs.sort((a, b) => a - b);
            for (let i = 0; i + 1 < xs.length; i += 2) {
                for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x += 1) this.px(x, y, c);
            }
        }
        return this;
    }

    tri(ax, ay, bx, by, cx, cy, c) {
        return this.poly([[ax, ay], [bx, by], [cx, cy]], c);
    }

    /** Draw an ASCII pixel map. rows: array of strings, key: { char: colour }. '.' and ' ' are skipped. */
    map(x, y, rows, key) {
        rows.forEach((row, j) => {
            for (let i = 0; i < row.length; i += 1) {
                const ch = row[i];
                if (ch === '.' || ch === ' ') continue;
                if (!(ch in key)) continue;
                this.px(x + i, y + j, key[ch]);
            }
        });
        return this;
    }

    /** Recolour pixels inside a mask test. */
    recolor(test, c) {
        for (let y = 0; y < this.h; y += 1) {
            for (let x = 0; x < this.w; x += 1) {
                if (this.opaque(x, y) && test(x, y, this.get(x, y))) this.px(x, y, c);
            }
        }
        return this;
    }

    // --- Post-processing -----------------------------------------------------
    /**
     * Outline the silhouette. 'auto' picks a dark, hue-shifted version of the
     * colour it borders (pixel artists call this a selective outline).
     */
    outline(color = 'auto', { corners = false, strength = 0.72, skip = null } = {}) {
        const w = this.w;
        const h = this.h;
        const src = new Uint8ClampedArray(this.data);
        const isOpaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 40;
        const neighbours = corners
            ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
            : [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const cache = new Map();
        for (let y = 0; y < h; y += 1) {
            for (let x = 0; x < w; x += 1) {
                if (isOpaque(x, y)) continue;
                let n = 0;
                let r = 0;
                let g = 0;
                let b = 0;
                for (const [dx, dy] of neighbours) {
                    if (!isOpaque(x + dx, y + dy)) continue;
                    const i = ((y + dy) * w + (x + dx)) * 4;
                    if (skip && skip(src[i], src[i + 1], src[i + 2])) continue;
                    n += 1;
                    r += src[i];
                    g += src[i + 1];
                    b += src[i + 2];
                }
                if (!n) continue;
                let c = color;
                if (color === 'auto') {
                    const key = `${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)}`;
                    if (!cache.has(key)) {
                        const base = toHex([r / n, g / n, b / n]);
                        cache.set(key, mix(shade(base, -strength), '#1b1030', 0.35));
                    }
                    c = cache.get(key);
                }
                const i = (y * w + x) * 4;
                const [cr, cg, cb, ca] = rgba(c);
                this.data[i] = cr;
                this.data[i + 1] = cg;
                this.data[i + 2] = cb;
                this.data[i + 3] = ca;
            }
        }
        return this;
    }

    /** Bounding box of the opaque pixels, or null when empty. */
    bounds() {
        let minX = this.w;
        let minY = this.h;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < this.h; y += 1) {
            for (let x = 0; x < this.w; x += 1) {
                if (this.data[(y * this.w + x) * 4 + 3] > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) return null;
        return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    /** Copy another sprite onto this one at (x, y). */
    stamp(other, x, y, { flip = false } = {}) {
        for (let j = 0; j < other.h; j += 1) {
            for (let i = 0; i < other.w; i += 1) {
                const [r, g, b, a] = other.get(flip ? other.w - 1 - i : i, j);
                if (a > 0) this.px(x + i, y + j, [r, g, b, a]);
            }
        }
        return this;
    }
}

// ---------------------------------------------------------------------------
// Small helpers for sprite modules
// ---------------------------------------------------------------------------
/** Deterministic random numbers, so rebuilding gives identical sheets. */
export function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        return ((s >>> 0) % 100000) / 100000;
    };
}

/** Shared eye: 1×2 pupil with a sparkle when there is room. */
export function eye(s, x, y, { color = '#2a2140', sparkle = '#ffffff', tall = 2, wide = 1 } = {}) {
    s.rect(x, y, wide, tall, color);
    if (sparkle && tall >= 2) s.px(x + wide - 1, y, sparkle);
    return s;
}

/** Closed happy eye (a small arch). */
export function happyEye(s, x, y, color = '#2a2140') {
    s.px(x, y + 1, color);
    s.px(x + 1, y, color);
    s.px(x + 2, y + 1, color);
    return s;
}

export const OUTLINE = '#22142f';
