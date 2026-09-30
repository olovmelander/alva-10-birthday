/* The same folded coast in the world and under Alva's pencil. No game writes. */
import { SHORE_TRIAL as WORDS } from './content/sv.mjs';

const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
export const SHORE_PATCH = Object.freeze({ width: 600, height: 300,
    anchors: Object.freeze([[208, 157], [280, 153], [350, 173], [419, 155]].map(Object.freeze)) });

export function sampleShoreTrial(phase, seconds, { repaired = false, lessMotion = false } = {}) {
    const flat = phase === 'folded' ? 0 : phase === 'flatten' ? ease(seconds / .95) : 1;
    // A pencil stroke alone never counts as the test. The wave must cross the
    // gap and touch the intact paper before the keeper can draw his conclusion.
    const active = repaired && ['wave', 'proof'].includes(phase);
    const t = phase === 'proof' ? 5 : Math.max(0, seconds);
    const travel = active ? ease((t - .4) / 2.5) : 0;
    const wet = active ? ease((t - 2.0) / .8) : 0;
    return { flat: lessMotion ? Number(flat >= .5) : flat, joined: repaired,
        travel: lessMotion ? (t < 1.2 ? 0 : t < 2.6 ? .5 : 1) * Number(active) : travel,
        wet, retreat: active ? ease((t - 3.0) / 1.1) : 0,
        proven: active && t >= 4.2, done: phase === 'flatten' ? seconds >= 1 : active && t >= 4.5 };
}

/** A crease attached to the rock at the lower window. The readable close-up
 * magnifies this interrupted blue stroke; the world has no pasted miniature map. */
export function createWorldCoastFold(PIXI, { texture } = {}) {
    const container = new PIXI.Container(); container.label = 'world-coast-crease';
    const g = new PIXI.Graphics(); container.addChild(g);
    let key = '';
    const stroke = (pts, color, width, alpha = 1) => {
        g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p);
        g.stroke({ color, width, alpha, cap: 'round', join: 'round' });
    };
    function update(s) {
        const next = `${s.flat}/${s.joined}/${s.wet}`;
        if (next === key) return; key = next; g.clear();
        const lift = 1 - s.flat;
        // Irregular pencil pigment continues into the existing rock face. No
        // rectangular border, separate landscape, lighthouse or floating card.
        const bed = [4, -75, 54, -86, 110, -68, 172, -79, 244, -63, 254, 52,
            221, 77, 139, 65, 65, 82, 6, 63];
        g.poly(bed).fill({ color: 0xcac09a, alpha: .68 });
        const paper = texture?.('mat-seabed');
        if (paper) g.poly(bed).fill({ texture: paper, textureSpace: 'global', alpha: .55 });
        g.poly([5, 9, 52, 0, 102, 13, 161, -2, 213, 7, 250, 0, 254, 52, 221, 77, 139, 65, 65, 82, 6, 63])
            .fill({ color: 0x659bae, alpha: .54 });
        stroke([[5, 9], [52, 0], [82, 7]], 0x365f78, 4);
        stroke([[177, 2], [213, 7], [250, 0]], 0x365f78, 4);
        if (s.joined) stroke([[82, 7], [114, -3], [145, 13], [177, 2]], 0x365f78, 4);
        if (lift > .001) {
            g.poly([102, -67, 150 - 68 * lift, -4, 110, 72, 156, 56, 174, -11])
                .fill({ color: 0x213b43, alpha: .22 * lift });
            g.poly([107, -71, 144 - 65 * lift, -9, 111, 65, 139, 44, 155, -5])
                .fill({ color: 0xf1e5c5, alpha: lift }).stroke({ color: 0x6d7162, width: 2, alpha: lift });
            stroke([[108, -65], [143 - 64 * lift, -9], [113, 60]], 0xfff8e1, 3, lift);
        } else stroke([[108, -65], [114, 1], [112, 63]], 0x706e5c, 1.5, .28);
        if (!s.joined) for (const p of [[82, 7], [177, 2]]) {
            g.circle(...p, 8).fill({ color: 0xf2d18a, alpha: .65 });
            g.circle(...p, 3.5).fill(0x365f78);
        }
        for (let i = 0; i < 15; i++) {
            const x = 18 + i * 15, y = -37 + (i % 3) * 11;
            stroke([[x, y], [x + 9, y - 3]], 0x706e5c, 1, .28);
        }
        if (s.wet > 0) g.ellipse(197, 9, 33, 12).fill({ color: 0x578a9c, alpha: s.wet * .3 });
    }
    update(sampleShoreTrial('folded', 0));
    return { container, update };
}

/** Shared art: warm paper, a broken blue coast, a fold and a small travelling wave. */
export function createCoastPatch(PIXI, { texture } = {}) {
    const container = new PIXI.Container(); container.label = 'folded-coast';
    const outline = [2, 4, 594, 0, 600, 294, 8, 300, 2, 4];
    const base = new PIXI.Graphics();
    base.poly(outline.map((n, i) => n + (i % 2 ? 8 : 5))).fill({ color: 0x43372e, alpha: .22 });
    base.poly(outline).fill(0xf8efd7).stroke({ color: 0x8d795c, width: 2 });
    const paper = texture?.('mat-paper');
    if (paper) base.poly(outline).fill({ texture: paper, textureSpace: 'global', alpha: .52 });
    base.poly([12, 176, 85, 168, 152, 178, 208, 157, 238, 167, 280, 153, 326, 180,
        366, 169, 419, 155, 487, 174, 590, 163, 590, 285, 15, 290]).fill({ color: 0x8ab7c5, alpha: .67 });
    base.poly([16, 42, 580, 40, 587, 148, 486, 160, 420, 142, 365, 154,
        322, 160, 285, 138, 239, 151, 205, 142, 154, 163, 87, 153, 16, 162]).fill({ color: 0xe2c286, alpha: .38 });
    for (let i = 0; i < 62; i++) {
        const x = 26 + (i * 83) % 548, y = 62 + (i * 37) % 66;
        base.moveTo(x, y).lineTo(x + 6, y - 2).stroke({ color: 0x9b794e, width: 1, alpha: .16 });
    }
    for (let i = 0; i < 16; i++) {
        const x = 35 + (i * 107) % 520, y = 211 + (i * 29) % 65;
        base.moveTo(x, y).quadraticCurveTo(x + 10, y - 7, x + 20, y)
            .stroke({ color: 0x497c92, width: 1.5, alpha: .38 });
    }
    const stroke = (g, pts, color = 0x426f86, width = 3.4, alpha = 1) => {
        g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p);
        g.stroke({ color, width, alpha, cap: 'round', join: 'round' });
    };
    stroke(base, [[14, 176], [85, 168], [152, 178], SHORE_PATCH.anchors[0]]);
    stroke(base, [SHORE_PATCH.anchors.at(-1), [487, 174], [590, 163]]);
    // A tiny lighthouse ties the close-up to its physical location.
    base.poly([505, 47, 523, 48, 533, 137, 494, 137]).fill(0xfbf6e7).stroke({ color: 0x666458, width: 2 });
    base.rect(501, 35, 28, 18).fill(0xf2d986).stroke({ color: 0x666458, width: 2 });
    base.poly([497, 34, 514, 20, 534, 35]).fill(0x8f9aa5).stroke({ color: 0x666458, width: 2 });
    for (const y of [72, 108]) stroke(base, [[502, y], [525, y + 1]], 0x667d93, 3, .7);
    container.addChild(base);
    const wet = new PIXI.Graphics(), join = new PIXI.Graphics(), wave = new PIXI.Graphics(), fold = new PIXI.Graphics();
    container.addChild(wet, join, wave, fold);
    let previous = '';
    function update(s) {
        const key = [s.flat, s.joined, s.travel, s.wet, s.retreat].join('|');
        if (key === previous) return; previous = key;
        join.clear();
        if (s.joined) stroke(join, SHORE_PATCH.anchors, 0x355f78, 4.4);
        else {
            // The interruption is a real gap with two recognisable pencil ends.
            for (const [x, y] of [SHORE_PATCH.anchors[0], SHORE_PATCH.anchors.at(-1)]) {
                join.circle(x, y, 12).fill({ color: 0xf7db82, alpha: .6 });
                join.circle(x, y, 5).fill(0x426f86).stroke({ color: 0xfffcf0, width: 2 });
            }
        }
        wet.clear();
        if (s.wet > 0) {
            wet.ellipse(430, 153, 68, 22).fill({ color: 0x6aa6b7, alpha: .34 * s.wet });
            stroke(wet, [[387, 147], [408, 141], [429, 144], [451, 139], [470, 148]], 0xfaf9e6, 2, .8 * s.wet);
            // Water beading on the paper: the outline underneath stays intact.
            for (const [x, y, r] of [[421, 121, 4], [453, 128, 3], [479, 150, 4]])
                wet.ellipse(x, y, r, r * 1.4).fill({ color: 0x7fbbcd, alpha: .75 * s.wet });
        }
        wave.clear();
        if (s.travel > 0 && s.retreat < 1) {
            const x = 100 + s.travel * 366, y = 177 - Math.sin(s.travel * Math.PI) * 14;
            const alpha = 1 - s.retreat;
            wave.moveTo(x - 52, y + 42).quadraticCurveTo(x - 35, y - 30, x + 1, y - 26)
                .quadraticCurveTo(x + 44, y - 26, x + 28, y + 13).lineTo(x + 53, y + 37)
                .closePath().fill({ color: 0x70aabd, alpha: .8 * alpha });
            wave.moveTo(x - 40, y + 8).quadraticCurveTo(x - 16, y - 37, x + 17, y - 16)
                .quadraticCurveTo(x + 29, y - 5, x + 12, y + 4)
                .stroke({ color: 0xfffcf0, width: 5, alpha, cap: 'round' });
            for (let i = 0; i < 4; i++) wave.circle(x + 12 + i * 11, y - 28 + (i % 2) * 10, 2.5).fill({ color: 0xfffcf0, alpha });
        }
        fold.clear();
        const lift = 1 - s.flat;
        stroke(fold, [[300, 33], [300, 276]], 0x968672, 2, .17 + lift * .4);
        if (lift > .001) {
            fold.poly([298, 105, 300 + 122 * lift, 188, 487, 283, 298, 282]).fill({ color: 0x554936, alpha: .12 * lift });
            fold.poly([295, 100, 300 + 110 * lift, 178, 476, 274, 295, 275])
                .fill({ color: 0xeadebf, alpha: lift }).stroke({ color: 0x8d795c, alpha: lift, width: 2 });
            stroke(fold, [[303, 116], [305 + 87 * lift, 182], [459, 267]], 0xfffbef, 3, lift);
        }
    }
    update(sampleShoreTrial('folded', 0));
    return { container, update };
}

export function createShoreTrial(PIXI, { texture, lessMotion = false } = {}) {
    const container = new PIXI.Container(); container.label = 'shore-trial';
    const dim = new PIXI.Graphics(), sheet = new PIXI.Container(); container.addChild(dim, sheet);
    const backing = new PIXI.Graphics().roundRect(-18, -65, 636, 438, 9).fill(0xf9f1dd).stroke({ color: 0x907e61, width: 2 });
    sheet.addChild(backing);
    const patch = createCoastPatch(PIXI, { texture }); sheet.addChild(patch.container);
    const label = (text, y, size, color) => {
        const t = new PIXI.Text({ text, style: { fontFamily: '"Patrick Hand", cursive', fontSize: size, fill: color, align: 'center' } });
        t.anchor.set(.5, 0); t.position.set(300, y); sheet.addChild(t); return t;
    };
    const title = label(WORDS.title, -53, 28, 0x78572f);
    const status = label(WORDS.flatten, 313, 25, 0x365b6b);
    const location = label(WORDS.location, 344, 19, 0x736657);
    let phase = 'folded', elapsed = 0, repaired = false, dead = false, resolve = null;
    const state = () => sampleShoreTrial(phase, elapsed, { repaired, lessMotion });
    function update(dt) {
        if (dead) return;
        elapsed += Math.max(0, dt);
        const s = state(); patch.update(s);
        const text = phase === 'wave' ? (s.proven ? WORDS.proof : WORDS.wave)
            : phase === 'proof' ? WORDS.proof : phase === 'draw' ? WORDS.draw : WORDS.flatten;
        if (status.text !== text) status.text = text;
        if (s.done && resolve) { const done = resolve; resolve = null; done(); }
        return s;
    }
    function play(next) { phase = next; elapsed = 0; return new Promise(r => { resolve = r; update(0); }); }
    return {
        container, update, get phase() { return phase; }, get state() { return state(); },
        async flatten() { await play('flatten'); phase = 'draw'; elapsed = 0; update(0); },
        complete() { repaired = true; phase = 'draw'; update(0); },
        async wave() { if (!repaired) throw new Error('Repair the coast before testing the wave'); await play('wave'); phase = 'proof'; update(0); },
        geometry(canvas) {
            const r = canvas.getBoundingClientRect(), rendererWidth = canvas.clientWidth || r.width, rendererHeight = canvas.clientHeight || r.height;
            return { anchors: SHORE_PATCH.anchors.map(([x, y]) => {
                const p = sheet.toGlobal(new PIXI.Point(x, y));
                return [r.left + p.x * r.width / rendererWidth, r.top + p.y * r.height / rendererHeight];
            }) };
        },
        fit(width, height, insets = {}) {
            dim.clear().rect(0, 0, width, height).fill({ color: 0x293b40, alpha: .78 });
            const top = insets.top ?? 30, bottom = insets.bottom ?? 30;
            const scale = Math.max(.1, Math.min((width - 32) / 636, (height - top - bottom) / 438, 1.35));
            sheet.scale.set(scale);
            sheet.position.set(width / 2 - 300 * scale, top + (height - top - bottom - 438 * scale) / 2 + 65 * scale);
            title.style.fontSize = Math.max(28, 17 / scale);
            status.style.fontSize = Math.max(25, 14 / scale);
            location.style.fontSize = Math.max(19, 11 / scale);
        },
        destroy() { if (dead) return; dead = true; resolve = null; container.parent?.removeChild(container); if (!container.destroyed) container.destroy({ children: true }); }
    };
}
