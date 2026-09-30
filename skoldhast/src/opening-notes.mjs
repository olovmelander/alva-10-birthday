/*
 * Alva's notes: the opening starts inside her head. On a dimmed desk her field
 * note is written in her own handwriting by her own pencil, and her words turn
 * into pictures: "Sköldhästar" draws the creature on the blank page, her world
 * colours in around it, and thought bubbles rise from her words (a gallop over
 * the steppe, hiding in the kelp forest, fastest turtle or slowest horse, a
 * researcher). Everything here is in screen space; the prologue frames her
 * picture in the region left free by the card and plays the story beats.
 */

import { createThoughtScene } from './thought-scenes.mjs';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { const p = clamp01(v); return p * p * (3 - 2 * p); };
const easeOutBack = (v) => { const p = clamp01(v), c = 1.5; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; };
const lerp = (a, b, u) => a + (b - a) * u;
const INK = 0x3b3530;

/** Her paragraph as sentences (keeps the punctuation). */
export function splitSentences(text) {
    return (String(text || '').match(/[^.!?]+[.!?]+["”]?/g) || [String(text || '')]).map(s => s.trim()).filter(Boolean);
}

/**
 * Where her words turn into pictures: each cue fires once, when the pencil has
 * written the end of its word. Indices are into the whole paragraph.
 */
const CUE_WORDS = [
    ['creature', /sköldhäst\w*/i],
    ['sparkle', /fantastisk\w*/i],
    ['world', /trivs|galopp/i],
    ['steppe', /stäpp\w*/i],
    ['kelp', /kelp[\w-]*/i],
    ['mystery', /sköldpadda\b/i],
    ['researcher', /forskare\w*/i]
];
export function noteCues(paragraph) {
    const cues = [];
    for (const [cue, re] of CUE_WORDS) {
        const m = re.exec(paragraph);
        if (m) cues.push({ cue, start: m.index, at: m.index + m[0].length, word: m[0] });
    }
    return cues.sort((a, b) => a.at - b.at);
}

/** Greedy word wrap into lines of the paragraph: [{ start, end }] (end exclusive). */
export function wrapWords(paragraph, maxWidth, measure) {
    const words = [], lines = [];
    const re = /\S+/g;
    let m, start = -1, end = -1;
    while ((m = re.exec(paragraph))) words.push([m.index, m.index + m[0].length]);
    for (const [ws, we] of words) {
        if (start < 0) { start = ws; end = we; continue; }
        if (measure(paragraph.slice(start, we)) > maxWidth) { lines.push({ start, end }); start = ws; }
        end = we;
    }
    if (start >= 0) lines.push({ start, end });
    return lines;
}

/** A scalloped thought cloud around (0, 0), half-size rx × ry. */
function cloudPath(g, rx, ry, bumps = 11) {
    const pts = [];
    for (let i = 0; i < bumps; i++) {
        const a = i / bumps * Math.PI * 2;
        pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
    }
    g.moveTo((pts[0][0] + pts[bumps - 1][0]) / 2, (pts[0][1] + pts[bumps - 1][1]) / 2);
    for (let i = 0; i < bumps; i++) {
        const a = pts[i], b = pts[(i + 1) % bumps];
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        // each bump bulges outwards past the ellipse
        g.quadraticCurveTo(a[0] * 1.16, a[1] * 1.16, mx, my);
    }
    g.closePath();
    return g;
}

export function createOpeningNotes(PIXI, { texture, heading, text, makeHero, reducedMotion = false, fontFamily = 'Patrick Hand' }) {
    const T = (name) => (typeof texture === 'function' ? texture(name) : null) || null;
    const less = () => (typeof reducedMotion === 'function' ? !!reducedMotion() : !!reducedMotion);
    const paragraph = splitSentences(text).join(' ');
    const sentences = splitSentences(text);
    const sentenceEnds = [];
    { let at = 0; for (const s of sentences) { at += s.length; sentenceEnds.push(at); at += 1; } }

    // --- layers -------------------------------------------------------------------------------
    // `dim` goes under her picture (it darkens the desk); `container` above it.
    const dim = new PIXI.Graphics(); dim.label = 'notes-dim'; dim.alpha = 0;
    const container = new PIXI.Container(); container.label = 'opening-notes';
    const dust = new PIXI.Container();
    const bubbleLayer = new PIXI.Container(); bubbleLayer.label = 'notes-bubbles';
    const card = new PIXI.Container(); card.label = 'notes-card';
    const cardShadow = new PIXI.Graphics(), cardPaper = new PIXI.Graphics(), cardLines = new PIXI.Graphics();
    const tape = new PIXI.Graphics();
    const style = new PIXI.TextStyle({ fontFamily, fontSize: 22, fill: INK, lineHeight: 30 });
    const headStyle = new PIXI.TextStyle({ fontFamily, fontSize: 26, fill: 0x2b4a7a });
    const headText = new PIXI.Text({ text: '', style: headStyle }); headText.label = 'notes-heading';
    const bodyText = new PIXI.Text({ text: '', style }); bodyText.label = 'notes-body';
    const underline = new PIXI.Graphics();
    card.addChild(cardShadow, cardPaper, cardLines, tape, headText, underline, bodyText);
    const pencilTex = T('alva-pencil');
    const pencil = pencilTex ? new PIXI.Sprite(pencilTex) : new PIXI.Graphics().moveTo(0, 0).lineTo(60, -40).stroke({ width: 6, color: 0x2c4f8f });
    pencil.anchor?.set?.(0.08, 0.95); pencil.label = 'notes-pencil'; pencil.visible = false;
    container.addChild(dust, bubbleLayer, card, pencil);

    const motes = Array.from({ length: 18 }, (_, i) => {
        const g = new PIXI.Graphics().circle(0, 0, 1.4 + (i % 3) * .7).fill({ color: 0xfff1cf, alpha: .9 });
        dust.addChild(g);
        return { g, u: (i * .618) % 1, v: (i * .377) % 1, speed: .015 + (i % 4) * .006, phase: i * 1.7 };
    });

    // --- layout -------------------------------------------------------------------------------
    let W = 0, H = 0, rect = { x: 0, y: 0, w: 0, h: 0 }, region = { x: 0, y: 0, w: 0, h: 0 };
    let lines = [], pad = 20, textX = 0, textY = 0, lh = 30, portrait = false, fs = 22;
    const measure = (s) => PIXI.CanvasTextMetrics.measureText(s, style).width;
    function layout(width, height) {
        if (width === W && height === H && lines.length) return region;
        W = width; H = height; portrait = H > W * 1.05;
        const m = Math.max(12, Math.min(W, H) * .04);
        const maxH = portrait ? Math.round(H * .5) : H - 2 * m;
        rect = portrait ? { x: m, y: 0, w: W - 2 * m, h: maxH } : { x: 0, y: m, w: Math.round(Math.max(290, Math.min(620, W * .4))), h: maxH };
        pad = Math.max(14, rect.w * .06);
        // the largest handwriting that still fits her whole note on the card
        fs = Math.min(portrait ? 27 : 38, Math.max(14, rect.w / (portrait ? 13.5 : 14)));
        let need = 0;
        for (; fs > 12; fs -= 1) {
            style.fontSize = fs; lh = Math.round(fs * 1.34); style.lineHeight = lh;
            headStyle.fontSize = Math.round(fs * 1.12);
            lines = wrapWords(paragraph, rect.w - 2 * pad - fs * .6, measure);
            need = Math.ceil(pad + headStyle.fontSize * 1.9 + lines.length * lh + pad * 1.3);
            if (need <= maxH) break;
        }
        // the card is as tall as her note: centred beside her picture, or under it
        rect.h = Math.min(maxH, need);
        if (portrait) {
            rect.y = H - rect.h - m;
            region = { x: m, y: m, w: W - 2 * m, h: rect.y - 2 * m };
        } else {
            rect.x = W - rect.w - m; rect.y = Math.round((H - rect.h) / 2);
            region = { x: m, y: m, w: W - rect.w - 3 * m, h: H - 2 * m };
        }
        textX = pad + fs * .6; textY = pad + headStyle.fontSize * 1.9;
        headText.position.set(pad + fs * .6, pad * .8);
        bodyText.position.set(textX, textY);
        const paper = T('mat-paper');
        cardShadow.clear().roundRect(6, 8, rect.w, rect.h, 6).fill({ color: 0x2a211b, alpha: .28 });
        cardPaper.clear().roundRect(0, 0, rect.w, rect.h, 5);
        if (paper) cardPaper.fill({ texture: paper, textureSpace: 'global' }); else cardPaper.fill({ color: 0xfbf8f1 });
        cardPaper.roundRect(0, 0, rect.w, rect.h, 5).stroke({ width: 1.5, color: 0x6b635a, alpha: .35 });
        // her notebook's rules and red margin
        cardLines.clear();
        for (let y = textY + lh * .92; y < rect.h - 6; y += lh) cardLines.moveTo(8, y).lineTo(rect.w - 8, y);
        cardLines.stroke({ width: 1, color: 0x6fa3d2, alpha: .45 });
        cardLines.moveTo(pad * .55, 6).lineTo(pad * .55, rect.h - 6).stroke({ width: 1.2, color: 0xd46a5a, alpha: .5 });
        tape.clear().rect(-34, -9, 68, 18).fill({ color: 0xe9dcb8, alpha: .75 });
        tape.position.set(rect.w / 2, 2); tape.rotation = -.04;
        card.pivot.set(rect.w / 2, rect.h / 2);
        const s = pencilTex ? Math.min(.5, rect.w * .46 / pencilTex.width) : 1;
        pencil.scale.set(s);
        dim.clear().rect(0, 0, W, H).fill({ color: 0x241b16 });
        render();
        return region;
    }

    // --- writing ------------------------------------------------------------------------------
    let revealed = 0, headRevealed = 0, lastRendered = -1, lastHead = -1;
    const cues = noteCues(paragraph);
    const lineOf = (i) => { for (let k = 0; k < lines.length; k++) if (i <= lines[k].end) return k; return lines.length - 1; };
    function render() {
        const n = Math.round(revealed);
        if (n !== lastRendered) {
            bodyText.text = lines.filter(l => l.start < n).map(l => paragraph.slice(l.start, Math.min(l.end, n))).join('\n');
            lastRendered = n;
        }
        const h = Math.round(headRevealed);
        if (h !== lastHead) { headText.text = heading.slice(0, h); lastHead = h; }
    }
    /** Local card point where the pencil is (end of the written text). */
    function tipLocal() {
        const n = Math.round(revealed);
        if (n <= 0) return [textX, textY + fs * .95];
        const k = lineOf(n - 1), line = lines[k];
        return [textX + measure(paragraph.slice(line.start, Math.min(line.end, n))), textY + k * lh + fs * .95];
    }
    function toScreen([x, y]) { const p = card.toGlobal(new PIXI.Point(x, y)); return [p.x, p.y]; }

    // --- thought bubbles -----------------------------------------------------------------------
    const bubbles = [];
    function makeContent(kind, rx, ry) {
        const c = new PIXI.Container();
        const g = new PIXI.Graphics();
        c.addChild(g);
        const content = { c, g, heroes: [], t: 0 };
        if (kind === 'steppe' || kind === 'kelp') {
            const hero = makeHero?.();
            if (hero) {
                const scale = ry * (kind === 'steppe' ? 1.25 : 1.1) / 330;
                hero.view.scale.set(scale);
                hero.view.position.set(kind === 'steppe' ? -rx * .05 : rx * .1, kind === 'steppe' ? ry * .6 : ry * .72);
                c.addChild(hero.view);
                content.heroes.push({ hero, kind, x: 0 });
            }
            content.front = new PIXI.Graphics();
            c.addChild(content.front);
        }
        return content;
    }
    function drawContent(b, dt) {
        if (b.content.scene) { b.content.scene.update(dt); return; }
        const { kind, rx, ry, content: k } = b;
        const g = k.g, t = (k.t += dt), still = less();
        g.clear();
        if (kind === 'steppe') {
            // a gallop over her steppe: silver-green hills, grass rushing past
            g.rect(-rx, -ry, rx * 2, ry * 2).fill({ color: 0xdfe9ef });
            g.moveTo(-rx, ry * .45).bezierCurveTo(-rx * .4, ry * .25, rx * .2, ry * .6, rx, ry * .35).lineTo(rx, ry).lineTo(-rx, ry).closePath()
                .fill({ color: 0xc9cf9f }).stroke({ width: 1.4, color: 0x7d8a64, alpha: .8 });
            const scroll = still ? 0 : t * rx * 1.6;
            for (let i = 0; i < 14; i++) {
                const x = ((i * rx * .31 - scroll) % (rx * 2.4) + rx * 2.4) % (rx * 2.4) - rx * 1.2;
                const y = ry * .62 + (i % 3) * ry * .1;
                g.moveTo(x, y).lineTo(x + 3, y - ry * .14).moveTo(x + 4, y).lineTo(x + 9, y - ry * .11)
                    .stroke({ width: 1.3, color: i % 2 ? 0x81946e : 0xb59a5c, alpha: .8 });
            }
            const h = k.heroes[0];
            if (h) {
                h.x += still ? 0 : dt * 1500;
                h.hero.update(dt, { x: h.x, y: 0, vx: still ? 0 : 1500, vy: 0, facing: 1, gait: still ? 'stand' : 'gallop', mode: 'ground', speed: still ? 0 : 1500,
                    time: t, hide: 0, groundAt: () => 0 });
            }
        } else if (kind === 'kelp') {
            // hiding in the kelp forest, deep in the sea
            g.rect(-rx, -ry, rx * 2, ry * 2).fill({ color: 0x3f7f96 });
            for (let i = 0; i < 9; i++) g.moveTo(-rx, -ry + i * ry * .24).lineTo(rx, -ry + i * ry * .24 + 4).stroke({ width: 2, color: 0x6aa3b5, alpha: .35 });
            g.moveTo(-rx, ry * .8).quadraticCurveTo(0, ry * .68, rx, ry * .82).lineTo(rx, ry).lineTo(-rx, ry).closePath().fill({ color: 0xb49e74 });
            const front = k.front;
            front.clear();
            for (let i = 0; i < 7; i++) {
                const x = -rx * .85 + i * rx * .28, sway = still ? 0 : Math.sin(t * 1.3 + i) * rx * .06, top = -ry * (.2 + (i % 3) * .2);
                const target = i % 2 ? front : g;
                target.moveTo(x, ry * .85).bezierCurveTo(x + sway, ry * .3, x - sway, top * .4, x + sway * 1.5, top)
                    .stroke({ width: 3.2, color: i % 2 ? 0x2f6b4f : 0x4e8a5e, alpha: .95, cap: 'round' });
            }
            for (let i = 0; i < 5; i++) {
                const u = still ? i / 5 : (t * .25 + i / 5) % 1;
                front.circle(-rx * .1 + i * rx * .12 + Math.sin(u * 9 + i) * 3, ry * .6 - u * ry * 1.5, 2 + i % 2)
                    .stroke({ width: 1, color: 0xe8f6ff, alpha: .8 * (1 - u) });
            }
            const h = k.heroes[0];
            if (h) h.hero.update(dt, { x: 0, y: 0, vx: 0, vy: 0, facing: -1, gait: 'stand', mode: 'ground', speed: 0, time: t, hide: 1, groundAt: () => 0 });
        } else if (kind === 'mystery') {
            // world's fastest turtle, or world's slowest horse?
            g.rect(-rx, -ry, rx * 2, ry * 2).fill({ color: 0xfbf8f1 });
            const zoom = still ? 0 : Math.sin(t * 7) * rx * .05;
            const sx = -rx * .5 + zoom, sy = ry * .2;
            g.ellipse(sx, sy, rx * .24, ry * .3).fill({ color: 0x6f9a4a }).stroke({ width: 1.6, color: INK });
            for (const [a, b] of [[-.4, .6], [.4, .6], [0, -.1]]) g.moveTo(sx + a * rx * .12, sy - ry * .28).lineTo(sx + a * rx * .2, sy + b * ry * .1).stroke({ width: 1, color: 0xe8e2b0 });
            g.circle(sx + rx * .27, sy + ry * .05, rx * .06).fill({ color: 0xcfe0a8 }).stroke({ width: 1.4, color: INK });
            for (let i = 0; i < 3; i++) g.moveTo(sx - rx * .3, sy - ry * .15 + i * ry * .15).lineTo(sx - rx * .5 - i * rx * .05, sy - ry * .15 + i * ry * .15).stroke({ width: 1.6, color: INK, alpha: .7 });
            const creep = still ? 0 : (t * .08 % 1) * rx * .08;
            const hx = rx * .48 + creep, hy = ry * .25;
            g.moveTo(hx - rx * .14, hy + ry * .28).bezierCurveTo(hx - rx * .2, hy - ry * .35, hx + rx * .2, hy - ry * .35, hx + rx * .14, hy + ry * .28)
                .stroke({ width: rx * .07, color: 0x8a7a64, cap: 'round' });
            for (let i = 0; i < 4; i++) g.circle(hx - rx * .25 - i * rx * .07, hy + ry * .3, 1.4).fill({ color: INK, alpha: .6 });
            const wob = still ? 0 : Math.sin(t * 3) * .12;
            const q = new PIXI.Matrix().rotate(wob);
            const P = (x, y) => { const p = q.apply({ x, y }); return [p.x, p.y - ry * .35]; };
            g.moveTo(...P(-rx * .08, -ry * .2)).quadraticCurveTo(...P(-rx * .06, -ry * .42), ...P(rx * .04, -ry * .4))
                .quadraticCurveTo(...P(rx * .14, -ry * .36), ...P(rx * .08, -ry * .18)).quadraticCurveTo(...P(0, -ry * .08), ...P(0, ry * .05))
                .stroke({ width: rx * .045, color: 0xa8402c, cap: 'round', join: 'round' });
            g.circle(...P(0, ry * .18), rx * .025).fill({ color: 0xa8402c });
        } else if (kind === 'researcher') {
            // someone who will take on the mystery: a lens over little crab tracks
            g.rect(-rx, -ry, rx * 2, ry * 2).fill({ color: 0xe2c894 });
            for (let i = 0; i < 9; i++) g.moveTo(-rx, -ry + i * ry * .24).lineTo(rx, -ry + i * ry * .24 + 3).stroke({ width: 1.5, color: 0xc9a86c, alpha: .5 });
            // a trail of little crab tracks, ending in a question
            for (let i = 0; i < 6; i++) {
                const x = -rx * .75 + i * rx * .25, y = ry * .3 + Math.sin(i * 1.3) * ry * .14;
                for (const d of [-1, 1]) g.ellipse(x + d * 4, y + d * 2.5, 2.4, 1.6).fill({ color: 0x6e5236 });
            }
            g.moveTo(rx * .62, ry * .06).quadraticCurveTo(rx * .64, -ry * .12, rx * .72, -ry * .1).quadraticCurveTo(rx * .8, -ry * .06, rx * .72, ry * .08)
                .lineTo(rx * .71, ry * .18).stroke({ width: 2.6, color: 0xa8402c, cap: 'round', join: 'round' });
            g.circle(rx * .71, ry * .3, 1.8).fill({ color: 0xa8402c });
            const lx = still ? 0 : Math.sin(t * 1.6) * rx * .45, ly = still ? 0 : Math.sin(t * 3.2) * ry * .12;
            g.circle(lx, ly, rx * .3).fill({ color: 0xeaf6fc, alpha: .55 }).stroke({ width: 4, color: 0x4a3a2c });
            g.moveTo(lx + rx * .22, ly + rx * .22).lineTo(lx + rx * .46, ly + rx * .46).stroke({ width: 8, color: 0x6a4a2c, cap: 'round' });
            g.circle(lx - rx * .1, ly - rx * .1, rx * .07).fill({ color: 0xffffff, alpha: .9 });
        }
    }
    /** A thought bubble rising from `from` (screen) to `to` (screen centre of the cloud). */
    function bubble(kind, from, to, size) {
        const rx = size, ry = size * .66;
        const root = new PIXI.Container(); root.label = 'notes-bubble-' + kind;
        const trail = new PIXI.Graphics();
        const cloud = cloudPath(new PIXI.Graphics(), rx, ry).fill({ color: 0xfbf8f1, alpha: .98 });
        const outline = cloudPath(new PIXI.Graphics(), rx, ry).stroke({ width: 2.2, color: INK, alpha: .85, join: 'round' });
        const mask = cloudPath(new PIXI.Graphics(), rx * .985, ry * .985).fill(0xffffff);
        // the game's own art where it is loaded; simple pencil drawings otherwise
        const scene = createThoughtScene(PIXI, kind, { texture: T, makeHero, rx, ry, reducedMotion: less });
        const content = scene ? { c: scene.container, scene, heroes: [], t: 0 } : makeContent(kind, rx * 1.14, ry * 1.14);
        content.c.mask = mask;
        const body = new PIXI.Container();
        body.addChild(cloud, content.c, mask, outline);
        root.addChild(trail, body);
        bubbleLayer.addChild(root);
        const b = { kind, root, trail, body, content, rx, ry, from, to, age: 0, gone: -1, phase: bubbles.length * 1.3 };
        bubbles.push(b);
        return b;
    }
    function updateBubble(b, dt) {
        b.age += dt;
        const still = less();
        const grow = still ? 1 : easeOutBack(clamp01((b.age - .35) / .5));
        const fade = b.gone < 0 ? 1 : 1 - ease((b.age - b.gone) / (still ? .3 : .6));
        const bob = still ? 0 : Math.sin(b.age * 1.4 + b.phase) * 3;
        b.body.position.set(b.to[0], b.to[1] + bob - (b.gone < 0 || still ? 0 : (b.age - b.gone) * 30));
        b.body.scale.set(Math.max(.01, grow));
        b.body.alpha = (still ? clamp01(b.age / .3) : clamp01((b.age - .3) / .2)) * fade;
        b.trail.clear();
        const [fx, fy] = b.from, [tx, ty] = [b.to[0] - (b.to[0] - b.from[0]) * .12, b.to[1] + b.ry * .9];
        for (let i = 0; i < 3; i++) {
            const at = still ? 1 : clamp01((b.age - i * .1) / .15);
            if (at <= 0) continue;
            const u = .25 + i * .22;
            b.trail.circle(lerp(fx, tx, u), lerp(fy, ty, u), (3 + i * 3) * ease(at))
                .fill({ color: 0xfbf8f1, alpha: .95 * fade }).stroke({ width: 1.6, color: INK, alpha: .8 * fade });
        }
        drawContent(b, dt);
    }
    function clearBubbles() { for (const b of bubbles) if (b.gone < 0) b.gone = b.age; }

    // --- sparkles (screen space) -------------------------------------------------------------
    const sparkles = [];
    function sparkle(x, y, spread) {
        for (let i = 0; i < 7; i++) {
            const g = new PIXI.Graphics().poly([0, -7, 1.6, -1.6, 7, 0, 1.6, 1.6, 0, 7, -1.6, 1.6, -7, 0, -1.6, -1.6])
                .fill({ color: 0xf6d25a }).stroke({ width: .9, color: 0xb8862b, join: 'round' });
            const a = i / 7 * Math.PI * 2 + .4;
            g.position.set(x + Math.cos(a) * spread * (.6 + (i % 3) * .2), y + Math.sin(a) * spread * .7);
            bubbleLayer.addChild(g);
            sparkles.push({ g, age: -i * .08 });
        }
    }

    // --- per frame ------------------------------------------------------------------------------
    let time = 0, cardIn = 0, pencilOn = 0, dimLevel = 0, writing = false, dead = false;
    function update(dt) {
        if (dead) return;
        time += dt;
        const still = less();
        dim.alpha = dimLevel * .5;
        dust.alpha = dimLevel;
        for (const m of motes) {
            const y = ((m.v - (still ? 0 : time * m.speed)) % 1 + 1) % 1;
            m.g.position.set(m.u * W + (still ? 0 : Math.sin(time * .5 + m.phase) * 12), y * H);
            m.g.alpha = .25 + .2 * Math.sin(time * 1.1 + m.phase);
        }
        // the card slides in from the side (landscape) or from below (portrait)
        const k = still ? (cardIn > 0 ? 1 : 0) : ease(cardIn);
        const off = portrait ? [0, (1 - k) * (rect.h + 40)] : [(1 - k) * (rect.w + 40), 0];
        card.position.set(rect.x + rect.w / 2 + off[0], rect.y + rect.h / 2 + off[1]);
        card.rotation = portrait ? .006 : -.012;
        card.alpha = still ? cardIn : 1;
        render();
        // her pencil: on the last written letter, bobbing as it writes, lifted between thoughts
        pencil.visible = !still && pencilOn > .01 && !!pencilTex;
        if (pencil.visible) {
            const [px, py] = toScreen(tipLocal());
            const lift = writing ? 0 : 1;
            const bob = writing ? Math.sin(time * 38) * 1.4 : 0;
            const away = (1 - pencilOn) * 260;
            pencil.position.set(px + lift * 7 + away, py - lift * 10 + bob - away * .4);
            // her hand rests below the line, as a right-handed writer's does
            pencil.rotation = .82 + (writing ? Math.sin(time * 19) * .03 : 0);
            pencil.alpha = ease(pencilOn);
        }
        for (const b of bubbles) updateBubble(b, dt);
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            if (b.gone >= 0 && b.age - b.gone > 1) { b.content.scene?.destroy(); for (const h of b.content.heroes) h.hero.destroy?.(); b.root.destroy({ children: true }); bubbles.splice(i, 1); }
        }
        for (let i = sparkles.length - 1; i >= 0; i--) {
            const s = sparkles[i];
            s.age += dt;
            const u = clamp01(s.age / 1.1);
            s.g.alpha = s.age < 0 ? 0 : Math.sin(Math.PI * u);
            s.g.scale.set(.4 + .6 * Math.sin(Math.PI * u));
            s.g.rotation = still ? 0 : s.age * 2;
            if (s.age > 1.1) { s.g.destroy(); sparkles.splice(i, 1); }
        }
    }

    return {
        dim, container, paragraph, sentences, sentenceEnds, cues,
        get length() { return paragraph.length; },
        get region() { return region; },
        layout,
        update,
        setDim(v) { dimLevel = clamp01(v); },
        setCard(v) { cardIn = clamp01(v); },
        setPencil(v) { pencilOn = clamp01(v); },
        setWriting(v) { writing = !!v; },
        setHeading(u) { headRevealed = heading.length * clamp01(u); render(); },
        setRevealed(n) { revealed = Math.max(0, Math.min(paragraph.length, n)); render(); },
        get revealed() { return revealed; },
        /** screen position of the pencil tip */
        tip() { return toScreen(tipLocal()); },
        /** underline one of her words in pencil, u = 0 … 1 */
        underline(cue, u) {
            const c = cues.find(q => q.cue === cue);
            underline.clear();
            if (!c || u <= 0) return;
            const k = lineOf(c.start), line = lines[k];
            const x0 = textX + measure(paragraph.slice(line.start, c.start)), x1 = textX + measure(paragraph.slice(line.start, Math.min(c.at, line.end)));
            const y = textY + k * lh + fs * 1.12;
            underline.moveTo(x0, y).quadraticCurveTo((x0 + x1) / 2, y + 3, x0 + (x1 - x0) * clamp01(u), y - 1)
                .stroke({ width: 2, color: 0x2b4a7a, alpha: .9, cap: 'round' });
        },
        bubble, clearBubbles, sparkle,
        get bubbles() { return bubbles.length; },
        destroy() {
            if (dead) return;
            dead = true;
            for (const b of bubbles) { b.content.scene?.destroy(); for (const h of b.content.heroes) h.hero.destroy?.(); }
            dim.destroy(); container.destroy({ children: true });
        }
    };
}

/**
 * A pencil "colouring in" reveal: a mask of zigzag strokes that covers `rect`
 * row by row as u goes 0 → 1. Deterministic, no textures.
 */
export function createScribbleReveal(PIXI, rect, { rows = 7 } = {}) {
    const mask = new PIXI.Graphics(); mask.label = 'scribble-reveal';
    const strokes = [];
    const rowH = rect.h / rows;
    for (let r = 0; r < rows; r++) {
        const y = rect.y + (r + .5) * rowH, dir = r % 2 ? -1 : 1;
        const steps = 9;
        for (let s = 0; s < steps; s++) {
            const a = s / steps, b = (s + 1) / steps;
            const xa = dir > 0 ? rect.x + a * rect.w : rect.x + rect.w - a * rect.w;
            const xb = dir > 0 ? rect.x + b * rect.w : rect.x + rect.w - b * rect.w;
            strokes.push([xa, y + (s % 2 ? -1 : 1) * rowH * .45, xb, y + (s % 2 ? 1 : -1) * rowH * .45]);
        }
    }
    let shown = -1;
    return {
        mask,
        set(u) {
            const n = Math.round(clamp01(u) * strokes.length);
            if (n === shown) return;
            shown = n;
            mask.clear();
            for (let i = 0; i < n; i++) {
                const [x0, y0, x1, y1] = strokes[i];
                mask.moveTo(x0, y0).lineTo(x1, y1);
            }
            if (n) mask.stroke({ width: rowH * 1.9, color: 0xffffff, cap: 'round', join: 'round' });
            // a tiny invisible dot keeps an empty mask from showing everything
            if (!n) mask.rect(rect.x, rect.y, .01, .01).fill(0xffffff);
        }
    };
}
