/*
 * MIRAS STJÄRNSAFARI – the world
 * ---------------------------------------------------------------------
 * Skies, floating islands, water, the gondola cable and the gondola.
 *
 * World coordinates are pixels. x grows along the ride; y grows DOWN
 * (like the canvas); an island's grass sits around y = 0 and the cable
 * hangs about 100 px above it.
 */
(function () {
    'use strict';

    const MS = window.MiraSafari;
    const { clamp, lerp, rng, noise1, hexToRgb, mixHex, dither, makeCanvas, TAU } = MS.util;
    const atlas = MS.atlas;


    // Smooth 2-D value noise in [0, 1] (for stone textures)
    function noise2(seed) {
        const hash = (x, y) => {
            let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
            h = Math.imul(h ^ (h >>> 13), 1274126177);
            return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
        };
        const sm = (t) => t * t * (3 - 2 * t);
        return (x, y) => {
            const xi = Math.floor(x);
            const yi = Math.floor(y);
            const fx = sm(x - xi);
            const fy = sm(y - yi);
            const a = hash(xi, yi);
            const b = hash(xi + 1, yi);
            const c = hash(xi, yi + 1);
            const d = hash(xi + 1, yi + 1);
            return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
        };
    }

    // =====================================================================
    // Terrain styles
    // =====================================================================
    const TERRAIN = {
        meadow: {
            grass: ['#c4f58a', '#86d45c', '#5aa844', '#3f8237'],
            soil: ['#a8744a', '#8a5a38', '#6b432b'],
            rock: ['#9a8cb4', '#7c6e9c', '#5d5282', '#3f3763'],
            crystal: ['#b8f6ff', '#6fd6ff', '#ffb8f0'],
            roots: '#6b4a3a',
            water: { deep: '#2f6fb8', mid: '#4aa0e0', light: '#bdefff', foam: '#ffffff' },
            tufts: ['#9fe26c', '#6fbf4c']
        },
        forest: {
            grass: ['#a8e27a', '#6fb652', '#4b8a3e', '#335f30'],
            soil: ['#8a6444', '#6b4a32', '#4f3524'],
            rock: ['#8a88a8', '#6c6a8e', '#504e72', '#363552'],
            crystal: ['#c8ffd8', '#6fe0a8', '#ffe39a'],
            roots: '#5a3f2e',
            water: { deep: '#2a5f8a', mid: '#3f86b0', light: '#bfe9ff', foam: '#ffffff' },
            tufts: ['#8fd068', '#5a9a44']
        },
        lake: {
            grass: ['#c8f090', '#8ed064', '#62a64c', '#447c3c'],
            soil: ['#c89a66', '#a47a4e', '#7c5838'],
            rock: ['#a490b8', '#86729e', '#665482', '#473a63'],
            crystal: ['#ffd6b8', '#ff9fb2', '#ffe9a8'],
            roots: '#6e4c3c',
            water: { deep: '#3a4f9e', mid: '#5f7fd0', light: '#ffd0b0', foam: '#fff4e0' },
            tufts: ['#a8e07c', '#72b456']
        },
        savanna: {
            grass: ['#fbe7a0', '#e8c460', '#c49a3e', '#9a7430'],
            soil: ['#d0804c', '#b0643a', '#8a4a2c'],
            rock: ['#b4889a', '#946c80', '#735266', '#52394c'],
            crystal: ['#ffe0a0', '#ffb070', '#ffd6f0'],
            roots: '#7a4a30',
            water: { deep: '#3f6f78', mid: '#5f9a98', light: '#ffe2b0', foam: '#fff6dc' },
            tufts: ['#f4d77a', '#d0aa4c']
        },
        jungle: {
            grass: ['#8fe07a', '#4fb45e', '#358a4a', '#236438'],
            soil: ['#6e4a34', '#553826', '#3d281c'],
            rock: ['#6f8c86', '#56726e', '#3f5856', '#2b3f40'],
            crystal: ['#b0ffe8', '#5fe0c8', '#ffd0f8'],
            roots: '#4a3326',
            water: { deep: '#1f6a6a', mid: '#2f9a8e', light: '#c8fff0', foam: '#ffffff' },
            tufts: ['#6fd07a', '#3f9a50']
        },
        arctic: {
            grass: ['#ffffff', '#e4eeff', '#bccbee', '#8fa4d4'],
            soil: ['#b8dcff', '#8cbcef', '#6a98d4'],
            rock: ['#6f7fb4', '#58679c', '#434f80', '#2e3762'],
            crystal: ['#d8f8ff', '#8fe6ff', '#c8b8ff'],
            roots: '#8fa8d8',
            water: { deep: '#123a78', mid: '#2a5fa8', light: '#9fe6ff', foam: '#ffffff' },
            tufts: ['#ffffff', '#d4e2ff']
        },
        star: {
            grass: ['#e0d4ff', '#a996ff', '#7a64e0', '#5440b0'],
            soil: ['#4f3f9a', '#3c2f80', '#2c2262'],
            rock: ['#3f3486', '#30286e', '#231d54', '#17133c'],
            crystal: ['#ffffff', '#8ff0ff', '#ffa8f0'],
            roots: '#6a58c8',
            water: { deep: '#2a1f6a', mid: '#4a3aa8', light: '#d8ccff', foam: '#ffffff' },
            tufts: ['#c8b8ff', '#9a86f0']
        },
        town: {
            grass: ['#c4f090', '#88d05e', '#5ea848', '#42803a'],
            soil: ['#cdb89a', '#a8927a', '#84705c'],
            rock: ['#a88b6a', '#8e7358', '#735a44', '#5a4434'],
            crystal: ['#b8f6ff', '#6fd6ff', '#ffb8f0'],
            roots: '#6b4a3a',
            water: { deep: '#2f6fb8', mid: '#4aa0e0', light: '#bdefff', foam: '#ffffff' },
            tufts: ['#9fe26c', '#6fbf4c']
        }
    };

    // =====================================================================
    // Glows: dithered pixel discs (look like light without blurring pixels)
    // =====================================================================
    const glowCache = new Map();
    function glow(radius, color, strength = 1) {
        const key = `${radius}|${color}|${strength}`;
        if (glowCache.has(key)) return glowCache.get(key);
        const size = radius * 2 + 1;
        const c = makeCanvas(size, size);
        const g = c.getContext('2d');
        const [r, gg, b] = hexToRgb(color);
        const img = g.createImageData(size, size);
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const d = Math.hypot(x - radius, y - radius) / radius;
                if (d > 1) continue;
                const a = Math.pow(1 - d, 1.6) * strength;
                // quantise to a few steps and dither between them
                const steps = 4;
                const q = a * steps;
                const lo = Math.floor(q);
                const level = (q - lo > dither(x, y) ? lo + 1 : lo) / steps;
                if (level <= 0) continue;
                const i = (y * size + x) * 4;
                img.data[i] = r;
                img.data[i + 1] = gg;
                img.data[i + 2] = b;
                img.data[i + 3] = Math.round(clamp(level, 0, 1) * 150);
            }
        }
        g.putImageData(img, 0, 0);
        glowCache.set(key, c);
        return c;
    }

    function drawGlow(g, x, y, radius, color, strength = 1) {
        const c = glow(radius, color, strength);
        g.drawImage(c, Math.round(x - radius), Math.round(y - radius));
    }

    // =====================================================================
    // Sky & backdrop
    // =====================================================================
    // A sky is a gradient (dithered bands) plus stars, clouds or nebulae,
    // planets and distant floating islands in parallax.
    class Backdrop {
        constructor(sky, seed = 1) {
            this.sky = sky;
            this.seed = seed;
            this.w = 0;
            this.h = 0;
            this.canvas = null;
            this.stars = [];
            this.clouds = [];
            this.far = [];
            this.planets = [];
            const r = rng(seed * 7 + 3);
            // stars in a wrap-around field
            const starCount = Math.round(260 * (sky.stars ?? 0.5));
            for (let i = 0; i < starCount; i += 1) {
                this.stars.push({ x: r() * 1400, y: r() * 1.3 - 0.15, big: r() < 0.08, tw: r() * TAU, sp: 0.6 + r() * 2.2, par: 0.02 + r() * 0.04, c: r() < 0.2 ? '#ffe7a8' : r() < 0.3 ? '#bfe8ff' : '#ffffff' });
            }
            for (const p of sky.planets || []) this.planets.push({ ...p, canvas: this.paintPlanet(p) });
            const cloudCount = sky.clouds ? sky.clouds.count ?? 7 : 0;
            for (let i = 0; i < cloudCount; i += 1) {
                this.clouds.push({ x: r() * 1600, y: sky.clouds.y[0] + r() * (sky.clouds.y[1] - sky.clouds.y[0]), canvas: this.paintCloud(r, sky.clouds), par: 0.08 + r() * 0.12, drift: 2 + r() * 3 });
            }
            const farCount = sky.far === false ? 0 : 9;
            for (let i = 0; i < farCount; i += 1) {
                const depth = i % 2 ? 0.18 : 0.3;
                this.far.push({ x: i * 260 + r() * 140, y: -40 + r() * 70, par: depth, canvas: this.paintFarIsland(r, depth) });
            }
        }

        paintCloud(r, spec) {
            const w = 30 + Math.floor(r() * 36);
            const h = 10 + Math.floor(r() * 8);
            const c = makeCanvas(w, h + 2);
            const g = c.getContext('2d');
            const colors = spec.colors;
            const puffs = 4 + Math.floor(r() * 4);
            const blobs = [];
            for (let i = 0; i < puffs; i += 1) {
                const bw = 10 + r() * (w / 2);
                const bh = 6 + r() * (h - 6);
                blobs.push({ x: r() * (w - bw), y: h - bh, w: bw, h: bh });
            }
            const img = g.createImageData(w, h + 2);
            for (let y = 0; y < h + 2; y += 1) {
                for (let x = 0; x < w; x += 1) {
                    let inside = false;
                    let top = false;
                    for (const b of blobs) {
                        const dx = (x + 0.5 - (b.x + b.w / 2)) / (b.w / 2);
                        const dy = (y + 0.5 - (b.y + b.h / 2)) / (b.h / 2);
                        const d = dx * dx + dy * dy;
                        if (d <= 1) {
                            inside = true;
                            if (dy < -0.35) top = true;
                        }
                    }
                    if (!inside) continue;
                    const shadeRow = y > h - 3;
                    const col = hexToRgb(top ? colors[0] : shadeRow ? colors[2] : colors[1]);
                    const i = (y * w + x) * 4;
                    img.data[i] = col[0];
                    img.data[i + 1] = col[1];
                    img.data[i + 2] = col[2];
                    img.data[i + 3] = Math.round(255 * (spec.alpha ?? 0.9));
                }
            }
            g.putImageData(img, 0, 0);
            return c;
        }

        paintPlanet(p) {
            const size = p.r * 2 + 1;
            const c = makeCanvas(size + (p.ring ? p.r * 2 : 0), size);
            const g = c.getContext('2d');
            const ox = p.ring ? p.r : 0;
            const img = g.createImageData(c.width, c.height);
            const put = (x, y, col, a = 255) => {
                if (x < 0 || y < 0 || x >= c.width || y >= c.height) return;
                const i = (y * c.width + x) * 4;
                img.data[i] = col[0];
                img.data[i + 1] = col[1];
                img.data[i + 2] = col[2];
                img.data[i + 3] = a;
            };
            const base = hexToRgb(p.color);
            const light = hexToRgb(mixHex(p.color, '#ffffff', 0.35));
            const dark = hexToRgb(mixHex(p.color, '#1a1040', 0.45));
            const band = hexToRgb(p.band || mixHex(p.color, '#ffffff', 0.18));
            const ringBehind = [];
            for (let y = 0; y < size; y += 1) {
                for (let x = 0; x < size; x += 1) {
                    const dx = (x - p.r) / p.r;
                    const dy = (y - p.r) / p.r;
                    const d = dx * dx + dy * dy;
                    if (d > 1) continue;
                    const lit = -dx * 0.6 - dy * 0.5 + (1 - d) * 0.4;
                    let col = base;
                    if (lit > 0.55 + dither(x, y) * 0.2) col = light;
                    else if (lit < -0.2 - dither(x, y) * 0.25) col = dark;
                    if (p.bands && Math.floor((dy + 1) * p.bands) % 2 === 0 && lit > -0.3) col = band;
                    put(x + ox, y, col);
                }
            }
            if (p.ring) {
                const ringCol = hexToRgb(p.ring);
                for (let a = 0; a < TAU; a += 0.01) {
                    const x = Math.round(ox + p.r + Math.cos(a) * p.r * 1.9);
                    const y = Math.round(p.r + Math.sin(a) * p.r * 0.45 - Math.cos(a) * p.r * 0.12);
                    const front = Math.sin(a) > 0;
                    if (front || Math.hypot(x - ox - p.r, y - p.r) > p.r) put(x, y, ringCol, 230);
                    ringBehind.push(0);
                }
            }
            g.putImageData(img, 0, 0);
            return c;
        }

        paintFarIsland(r, depth) {
            const w = 36 + Math.floor(r() * 40);
            const top = 8;
            const h = top + 16 + Math.floor(r() * 14);
            const c = makeCanvas(w, h);
            const g = c.getContext('2d');
            const tint = mixHex(this.sky.gradient[this.sky.gradient.length - 1], this.sky.gradient[0], depth > 0.25 ? 0.45 : 0.62);
            const dark = mixHex(tint, '#120a30', 0.25);
            const light = mixHex(tint, '#ffffff', 0.22);
            const n = noise1(Math.floor(r() * 9999));
            for (let x = 0; x < w; x += 1) {
                const u = (x - w / 2) / (w / 2);
                const depthHere = Math.max(0, (h - top - 2) * Math.pow(1 - Math.abs(u), 0.9));
                const surface = top + Math.round(n(x / 7) * 1.5 + Math.abs(u) * 3);
                for (let y = surface; y < top + depthHere + 2; y += 1) {
                    g.fillStyle = y === surface ? light : y > top + depthHere * 0.55 ? dark : tint;
                    g.fillRect(x, y, 1, 1);
                }
            }
            // a few tree tops or crystals
            const trees = 1 + Math.floor(r() * 3);
            for (let i = 0; i < trees; i += 1) {
                const tx = 6 + Math.floor(r() * (w - 12));
                const th = 3 + Math.floor(r() * 5);
                g.fillStyle = tint;
                g.fillRect(tx - 2, top - th, 5, th);
                g.fillRect(tx - 1, top - th - 1, 3, 1);
                g.fillStyle = light;
                g.fillRect(tx - 2, top - th, 2, 1);
            }
            return c;
        }

        resize(w, h) {
            if (w === this.w && h === this.h && this.canvas) return;
            this.w = w;
            this.h = h;
            this.canvas = makeCanvas(w, h);
            const g = this.canvas.getContext('2d');
            const img = g.createImageData(w, h);
            const stops = this.sky.gradient.map(hexToRgb);
            for (let y = 0; y < h; y += 1) {
                const t = (y / Math.max(1, h - 1)) * (stops.length - 1);
                const i0 = Math.min(stops.length - 2, Math.floor(t));
                const f = t - i0;
                const a = stops[i0];
                const b = stops[i0 + 1];
                for (let x = 0; x < w; x += 1) {
                    // 6 dithered steps between the two neighbouring stops
                    const q = f * 6;
                    const lo = Math.floor(q);
                    const step = (q - lo > dither(x, y) ? lo + 1 : lo) / 6;
                    const i = (y * w + x) * 4;
                    img.data[i] = lerp(a[0], b[0], step);
                    img.data[i + 1] = lerp(a[1], b[1], step);
                    img.data[i + 2] = lerp(a[2], b[2], step);
                    img.data[i + 3] = 255;
                }
            }
            g.putImageData(img, 0, 0);
        }

        draw(g, camX, camY, time, view) {
            this.resize(view.w, view.h);
            g.drawImage(this.canvas, 0, 0);
            const sky = this.sky;
            // sun or moon glow
            if (sky.sun) {
                const sx = Math.round(sky.sun.x * view.w - camX * 0.03);
                const sy = Math.round(sky.sun.y * view.h);
                drawGlow(g, sx, sy, sky.sun.glow || 40, sky.sun.glowColor || '#fff2c0', 0.8);
                g.fillStyle = sky.sun.color;
                g.beginPath();
                g.arc(sx, sy, sky.sun.r, 0, TAU);
                g.fill();
                if (sky.sun.moon) {
                    g.fillStyle = mixHex(sky.sun.color, '#b8b0e0', 0.35);
                    for (const [dx, dy, rr] of [[-3, -2, 2], [4, 3, 3], [-1, 5, 1.5], [5, -4, 1.5]]) {
                        g.beginPath();
                        g.arc(sx + dx * sky.sun.r / 12, sy + dy * sky.sun.r / 12, rr * sky.sun.r / 12, 0, TAU);
                        g.fill();
                    }
                }
            }
            // stars
            const starAlpha = sky.stars ?? 0.5;
            if (starAlpha > 0) {
                for (const s of this.stars) {
                    const field = Math.max(view.w, 480);
                    const x = Math.round(((((s.x / 1400) * field - camX * s.par) % field) + field) % field);
                    const y = Math.round(s.y * view.h);
                    if (y < 0 || y >= view.h) continue;
                    const tw = 0.5 + 0.5 * Math.sin(time * s.sp + s.tw);
                    if (tw < 0.25) continue;
                    g.fillStyle = s.c;
                    g.globalAlpha = starAlpha * (0.5 + tw * 0.5);
                    g.fillRect(x, y, 1, 1);
                    if (s.big && tw > 0.7) {
                        g.fillRect(x - 1, y, 3, 1);
                        g.fillRect(x, y - 1, 1, 3);
                    }
                }
                g.globalAlpha = 1;
            }
            // planets
            for (const p of this.planets) {
                const x = Math.round(p.x * view.w - camX * (p.par ?? 0.05));
                const wrapW = view.w + p.canvas.width * 2;
                const px = ((x % wrapW) + wrapW) % wrapW - p.canvas.width;
                g.drawImage(p.canvas, px, Math.round(p.y * view.h - camY * 0.02));
            }
            // clouds or nebula wisps
            for (const c of this.clouds) {
                const span = view.w + c.canvas.width + 40;
                const raw = c.x - camX * c.par - time * c.drift;
                const x = ((raw % span) + span) % span - c.canvas.width;
                const y = Math.round(c.y * view.h - camY * c.par * 0.3);
                g.drawImage(c.canvas, Math.round(x), y);
            }
            // distant floating islands
            for (const f of this.far) {
                const span = 260 * this.far.length;
                const raw = f.x - camX * f.par;
                const x = ((raw % span) + span) % span - 80;
                if (x > view.w + 20) continue;
                const y = Math.round(view.h * 0.42 + f.y - camY * f.par * 0.5 - view.h * 0.1);
                g.drawImage(f.canvas, Math.round(x), y);
            }
        }
    }

    // =====================================================================
    // Floating islets
    // =====================================================================
    // def: { x, w, style, hills, seed, pond: { at, w, depth }, falls: 'left'|'right', depth }
    function buildIslet(def, styleName) {
        const style = TERRAIN[def.style || styleName] || TERRAIN.meadow;
        const r = rng(def.seed || def.x + 11);
        const n1 = noise1((def.seed || def.x) + 5);
        const n2 = noise1((def.seed || def.x) + 91);
        const w = Math.round(def.w);
        const hills = def.hills ?? 5;
        const maxDepth = def.depth ?? clamp(40 + w * 0.09, 44, 110);
        const top = 14;                      // room for grass tufts above the surface
        const H = top + maxDepth + 34;
        const surface = new Float32Array(w);
        for (let x = 0; x < w; x += 1) {
            const edge = Math.min(x, w - 1 - x);
            const round = edge < 18 ? Math.pow((18 - edge) / 18, 2) * 9 : 0;   // rounded shoulders
            surface[x] = Math.round(n1(x / 70) * hills + n2(x / 23) * 1.2 + round);
        }
        // ponds: dip the surface into a basin
        const ponds = [];
        for (const p of def.ponds || (def.pond ? [def.pond] : [])) {
            const px0 = Math.round(p.at);
            const px1 = Math.round(p.at + p.w);
            const depth = p.depth ?? 9;
            const level = Math.round(Math.max(surface[clamp(px0, 0, w - 1)], surface[clamp(px1, 0, w - 1)]) + 2);
            for (let x = px0 - 6; x <= px1 + 6; x += 1) {
                if (x < 0 || x >= w) continue;
                let d;
                if (x < px0) d = ((x - (px0 - 6)) / 6) * 3;
                else if (x > px1) d = (((px1 + 6) - x) / 6) * 3;
                else d = 3 + Math.pow(Math.sin(((x - px0) / Math.max(1, px1 - px0)) * Math.PI), 0.55) * depth;   // steep banks, a flat bottom
                surface[x] = Math.max(surface[x], level + d - 3);
            }
            const pond = { x0: def.x + px0, x1: def.x + px1, y: level, localX0: px0, localX1: px1 };
            pond.depthAt = (wx) => Math.max(1, Math.round(surface[clamp(Math.round(wx - def.x), 0, w - 1)] - level + 1));
            ponds.push(pond);
        }
        const c = makeCanvas(w, H);
        const g = c.getContext('2d');
        const img = g.createImageData(w, H);
        const put = (x, y, hex, a = 255) => {
            if (x < 0 || y < 0 || x >= w || y >= H) return;
            const col = typeof hex === 'string' ? hexToRgb(hex) : hex;
            const i = (y * w + x) * 4;
            img.data[i] = col[0];
            img.data[i + 1] = col[1];
            img.data[i + 2] = col[2];
            img.data[i + 3] = a;
        };
        const under = new Float32Array(w);
        const n3 = noise1((def.seed || def.x) + 311);
        const lobes = noise1((def.seed || def.x) + 733);
        for (let x = 0; x < w; x += 1) {
            const u = (x - w / 2) / (w / 2);
            const profile = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 1.6)), 0.7);
            // long islands hang in several rocky lobes instead of one flat slab
            const lobe = w > 220 ? 0.58 + 0.42 * (0.5 + 0.5 * lobes(x / 64)) : 1;
            under[x] = def.solid
                ? top + surface[x] + maxDepth
                : top + surface[x] + 12 + (maxDepth - 12) * profile * lobe + n3(x / 5) * 2.5 + (r() < 0.05 ? 2 : 0);
        }
        const grassCols = style.grass.map(hexToRgb);
        const soilCols = style.soil.map(hexToRgb);
        const rockCols = style.rock.map(hexToRgb);
        const cells = noise2((def.seed || def.x) + 57);
        for (let x = 0; x < w; x += 1) {
            const s = top + surface[x];
            const grassH = 4 + Math.round(n2(x / 9) * 1.5 + 1);
            const soilH = 9 + Math.round(n1(x / 13) * 2.5 + 2);
            const bottom = Math.round(under[x]);
            for (let y = Math.round(s); y <= bottom; y += 1) {
                const d = y - s;
                let col;
                if (d < grassH) {
                    col = d === 0 ? grassCols[0] : d >= grassH - 1 ? grassCols[2] : grassCols[1];
                    if (d === 1 && dither(x, y) > 0.7) col = grassCols[0];
                    if (d === grassH - 1 && dither(x, y) > 0.5) col = soilCols[0];
                } else if (d < grassH + soilH) {
                    const dd = d - grassH;
                    col = dd < 2 ? soilCols[0] : dd < soilH - 3 ? soilCols[1] : soilCols[2];
                    if (dd >= 2 && dd < soilH - 3 && dither(x, y) > 0.88) col = soilCols[2];
                    if (dd === soilH - 4 && dither(x, y) > 0.5) col = soilCols[2];
                } else {
                    // stone: soft cells with darker cracks, darker towards the underside
                    const fromBottom = bottom - y;
                    const v = cells(x / 9, y / 7) * 0.7 + cells(x / 3.5 + 40, y / 3) * 0.3;
                    col = v > 0.62 ? rockCols[0] : v > 0.36 ? rockCols[1] : rockCols[2];
                    if (Math.abs(v - 0.5) < 0.025) col = rockCols[2];
                    const fromTop = d - grassH - soilH;
                    if (fromTop < 2) col = rockCols[0];
                    if (fromBottom < 8) col = fromBottom < 3 || dither(x, y) > fromBottom / 8 ? rockCols[3] : rockCols[2];
                }
                put(x, y, col);
            }
            // moss dripping over the edge of the soil here and there
            if (n2(x / 5 + 17) > 0.55) {
                const len = 1 + Math.round((n2(x / 5 + 17) - 0.55) * 8);
                for (let k = 0; k < len; k += 1) put(x, Math.round(s + grassH + soilH + k), grassCols[2]);
            }
        }
        // grass tufts and flowers above the surface
        const tuft = style.tufts.map(hexToRgb);
        for (let x = 1; x < w - 1; x += 1) {
            if (ponds.some((p) => x >= p.localX0 - 5 && x <= p.localX1 + 5)) continue;
            const s = top + surface[x];
            if (r() < 0.35) put(x, Math.round(s) - 1, tuft[0]);
            if (r() < 0.12) {
                put(x, Math.round(s) - 1, tuft[1]);
                put(x, Math.round(s) - 2, tuft[0]);
            }
        }
        // pebbles in the soil, crystals in the rock, roots hanging below
        const crystal = style.crystal.map(hexToRgb);
        const glints = [];
        for (let i = 0; i < w / 14; i += 1) {
            const x = Math.floor(r() * w);
            const y = Math.round(top + surface[x] + 7 + r() * 4);
            put(x, y, soilCols[2]);
            put(x + 1, y, soilCols[2]);
            put(x, y - 1, soilCols[0]);
        }
        for (let i = 0; i < (def.solid ? 0 : w / 40); i += 1) {
            const x = 4 + Math.floor(r() * (w - 8));
            const yTop = top + surface[x] + 14;
            const yBot = under[x] - 3;
            if (yBot - yTop < 6) continue;
            const y = Math.round(yTop + r() * (yBot - yTop));
            const k = r() < 0.5 ? 0 : 1;
            put(x, y - 2, crystal[0]);
            put(x, y - 1, crystal[k + 1]);
            put(x - 1, y, crystal[k + 1]);
            put(x, y, crystal[0]);
            put(x + 1, y, crystal[2]);
            put(x, y + 1, crystal[k + 1]);
            glints.push({ x: def.x + x, y: y - top, color: style.crystal[k + 1] });
        }
        const root = hexToRgb(style.roots);
        for (let i = 0; i < (def.solid ? 0 : w / 10); i += 1) {
            const x = Math.floor(r() * w);
            const len = 3 + Math.floor(r() * 10);
            let y = Math.round(under[x]);
            let xx = x;
            for (let k = 0; k < len; k += 1) {
                put(xx, y + k, root, 255 - k * 12);
                if (r() < 0.2) xx += r() < 0.5 ? -1 : 1;
            }
        }
        // underside rocks: a few hanging crystal points
        for (let i = 0; i < (def.solid ? 0 : w / 60); i += 1) {
            const x = 10 + Math.floor(r() * (w - 20));
            const y = Math.round(under[x]);
            const len = 4 + Math.floor(r() * 6);
            for (let k = 0; k < len; k += 1) {
                const half = Math.max(0, Math.round((1 - k / len) * 2));
                for (let dx = -half; dx <= half; dx += 1) put(x + dx, y + k, k < len - 2 ? rockCols[3] : crystal[1]);
            }
        }
        g.putImageData(img, 0, 0);
        return {
            def,
            x: def.x,
            w,
            top,
            canvas: c,
            surface,
            under,
            ponds,
            glints,
            falls: def.falls || null,
            style
        };
    }

    // =====================================================================
    // Cable, pylons and floating lanterns
    // =====================================================================
    class Cable {
        constructor(towers) {
            this.towers = towers.slice().sort((a, b) => a.x - b.x);
        }

        segment(x) {
            const t = this.towers;
            if (x <= t[0].x) return [t[0], t[0]];
            for (let i = 0; i < t.length - 1; i += 1) {
                if (x >= t[i].x && x <= t[i + 1].x) return [t[i], t[i + 1]];
            }
            return [t[t.length - 1], t[t.length - 1]];
        }

        y(x) {
            const [a, b] = this.segment(x);
            if (a === b) return a.y;
            const span = b.x - a.x;
            const t = (x - a.x) / span;
            const sag = Math.min(26, span * 0.028);
            return lerp(a.y, b.y, t) + sag * 4 * t * (1 - t);
        }

        draw(g, camX, camY, view, time, lit) {
            const x0 = Math.floor(camX) - 2;
            const x1 = x0 + view.w + 4;
            g.fillStyle = lit ? '#bfc8e8' : '#3a3552';
            let prev = null;
            for (let x = x0; x <= x1; x += 1) {
                const y = Math.round(this.y(x) - camY);
                const sx = x - Math.floor(camX);
                if (prev !== null && Math.abs(y - prev) > 1) {
                    const a = Math.min(y, prev);
                    g.fillRect(sx, a, 1, Math.abs(y - prev));
                } else {
                    g.fillRect(sx, y, 1, 1);
                }
                prev = y;
            }
            // a faint highlight line on top
            g.fillStyle = lit ? '#f4f7ff' : '#6d6690';
            for (let x = x0; x <= x1; x += 3) {
                const y = Math.round(this.y(x) - camY) - 1;
                g.fillRect(x - Math.floor(camX), y, 1, 1);
            }
        }
    }

    function drawPylon(g, tower, camX, camY, groundY, time, night) {
        const x = Math.round(tower.x - camX);
        const topY = Math.round(tower.y - camY);
        if (tower.kind === 'lantern') {
            // a floating star lantern holding the cable up in open space
            const bob = Math.round(Math.sin(time * 1.6 + tower.x) * 1);
            drawGlow(g, x, topY + 6 + bob, 14, night ? '#ffe7a0' : '#fff4c8', night ? 1 : 0.6);
            atlas.draw(g, 'pylon-top', 'idle', 0, x, topY + bob);
            g.fillStyle = '#ffe36a';
            g.fillRect(x - 1, topY + 9 + bob, 3, 3);
            g.fillStyle = '#fffbe0';
            g.fillRect(x, topY + 10 + bob, 1, 1);
            return;
        }
        const baseY = Math.round(groundY - camY);
        const mid = atlas.frame('pylon-mid', 'idle', 0);
        if (mid) {
            for (let y = topY + 10; y < baseY - 4; y += 8) atlas.drawFrame(g, mid, x, y);
        }
        atlas.draw(g, 'pylon-base', 'idle', 0, x, baseY);
        atlas.draw(g, 'pylon-top', 'idle', 0, x, topY);
        if (night) drawGlow(g, x, topY + 11, 8, '#ffe7a0', 0.8);
    }

    // =====================================================================
    // Water surfaces
    // =====================================================================
    function drawWater(g, pond, camX, camY, time, style, tint) {
        const x0 = Math.round(pond.x0 - camX);
        const x1 = Math.round(pond.x1 - camX);
        const y = Math.round(pond.y - camY);
        const col = style.water;
        // the basin fill (translucent over the baked ground, so the bottom shows)
        g.globalAlpha = 0.86;
        g.fillStyle = col.mid;
        for (let x = x0; x <= x1; x += 1) {
            const depth = pond.depthAt ? pond.depthAt(x + camX) : 10;
            g.fillRect(x, y, 1, depth);
        }
        g.globalAlpha = 1;
        g.fillStyle = col.deep;
        for (let x = x0; x <= x1; x += 1) {
            const depth = pond.depthAt ? pond.depthAt(x + camX) : 10;
            if (depth > 5) g.fillRect(x, y + 4, 1, depth - 4);
        }
        // surface line and moving glints
        g.fillStyle = col.light;
        g.fillRect(x0, y, x1 - x0 + 1, 1);
        g.fillStyle = tint || col.foam;
        for (let x = x0 + 2; x < x1 - 1; x += 1) {
            const wave = Math.sin((x + camX) * 0.35 + time * 2.2) + Math.sin((x + camX) * 0.13 - time * 1.3);
            if (wave > 1.45) g.fillRect(x, y + 2 + ((x + Math.floor(time * 3)) % 3 === 0 ? 1 : 0), 2, 1);
        }
    }

    // =====================================================================
    // Waterfalls pouring off an islet into space
    // =====================================================================
    function drawFalls(g, islet, camX, camY, time) {
        if (!islet.falls) return;
        const side = islet.falls;
        const lx = side === 'left' ? 3 : islet.w - 5;
        const wx = islet.x + lx;
        const sy = islet.surface[lx] + 1;
        const x = Math.round(wx - camX);
        const y = Math.round(sy - camY);
        const col = islet.style.water;
        for (let k = 0; k < 110; k += 1) {
            const fade = 1 - k / 110;
            if (fade < 0.3 && ((k + Math.floor(time * 12)) % 3 === 0)) continue;
            g.globalAlpha = 0.25 + fade * 0.7;
            g.fillStyle = (k + Math.floor(time * 20)) % 5 === 0 ? col.foam : col.light;
            const wob = Math.round(Math.sin(k * 0.3 + time * 4) * 0.6);
            g.fillRect(x + wob + (side === 'left' ? -2 : 1), y + k, 3, 1);
        }
        g.globalAlpha = 1;
    }

    // =====================================================================
    // Aurora (norrsken): soft animated curtains, computed at low resolution
    // =====================================================================
    class Aurora {
        constructor() {
            this.canvas = null;
            this.w = 0;
            this.h = 0;
            this.img = null;
        }

        draw(g, view, time, camX, strength = 1) {
            const w = Math.ceil(view.w / 2);
            const h = Math.ceil(view.h * 0.45 / 2);
            if (w !== this.w || h !== this.h) {
                this.w = w;
                this.h = h;
                this.canvas = makeCanvas(w, h);
                this.img = this.canvas.getContext('2d').createImageData(w, h);
            }
            const d = this.img.data;
            d.fill(0);
            const colors = [[90, 255, 170], [70, 220, 255], [190, 120, 255]];
            for (let x = 0; x < w; x += 1) {
                const wx = x * 2 + camX * 0.06;
                const top = h * 0.25 + Math.sin(wx * 0.018 + time * 0.25) * h * 0.18 + Math.sin(wx * 0.047 - time * 0.4) * h * 0.08;
                const len = h * (0.35 + 0.25 * Math.sin(wx * 0.011 + time * 0.3));
                const bright = 0.55 + 0.45 * Math.sin(wx * 0.03 + time * 0.8);
                for (let y = Math.max(0, Math.floor(top)); y < Math.min(h, top + len); y += 1) {
                    const t = (y - top) / len;
                    const a = Math.sin(t * Math.PI) * bright * strength;
                    if (a <= dither(x, y) * 0.9) continue;
                    const c = t < 0.5 ? colors[0] : t < 0.8 ? colors[1] : colors[2];
                    const i = (y * w + x) * 4;
                    d[i] = c[0];
                    d[i + 1] = c[1];
                    d[i + 2] = c[2];
                    d[i + 3] = Math.round(70 + a * 90);
                }
            }
            this.canvas.getContext('2d').putImageData(this.img, 0, 0);
            g.save();
            g.globalCompositeOperation = 'lighter';
            g.drawImage(this.canvas, 0, 0, w * 2, h * 2);
            g.restore();
        }
    }

    // =====================================================================
    // The gondola with Mira and Nova inside
    // =====================================================================
    function drawGondola(g, gx, gy, camX, camY, state, time) {
        const x = Math.round(gx - camX);
        const y = Math.round(gy - camY);
        const front = atlas.frame('gondola-front', 'idle', Math.floor(time * 6) % 2);
        atlas.draw(g, 'gondola-back', 'idle', 0, x, y);
        if (front) {
            const mp = atlas.point(front, 'mira', x, y) || { x: x - 7, y: y + 48 };
            const np = atlas.point(front, 'nova', x, y) || { x: x + 11, y: y + 40 };
            const outfit = state.outfit || 'a';
            const miraName = `mira-${outfit}`;
            const miraFrame = atlas.frame(miraName, state.miraAnim, state.miraFrame) || atlas.frame(miraName, 'idle', 0);
            if (miraFrame && state.miraVisible !== false) atlas.drawFrame(g, miraFrame, mp.x, mp.y + (state.miraBob || 0), false);
            state.miraScreen = { x: mp.x, y: mp.y, frame: miraFrame };
            if (state.novaVisible !== false) {
                const nf = atlas.frame('nova', state.novaAnim, state.novaFrame) || atlas.frame('nova', 'sit', 0);
                if (nf) atlas.drawFrame(g, nf, np.x, np.y + (state.novaBob || 0), !!state.novaFlip);
                state.novaScreen = { x: np.x, y: np.y };
            }
            atlas.drawFrame(g, front, x, y);
            if (state.lamp) drawGlow(g, x + 9, y + 18, 16, '#ffd98a', 0.9);
        }
    }

    MS.world = { TERRAIN, Backdrop, buildIslet, Cable, drawPylon, drawWater, drawFalls, Aurora, drawGondola, glow, drawGlow };
})();
