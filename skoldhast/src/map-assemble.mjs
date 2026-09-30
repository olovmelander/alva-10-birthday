/* Reader-paced map illustrations, shared with the notebook and world props. */
import { MAP_FRAGMENTS, MAP_SCALE, MAP_ROUTES, MAP_COAST, MAP_WATERLINE, fragmentPoints, mapLabels } from './map-layout.mjs';
import { createGuardianMapPaper } from './map-props.mjs';
import { MAP } from './content/sv.mjs';

const clamp = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
export const MAP_SCENE_PHASES = Object.freeze({ arrive: .55, join: 1.2, reveal: 1.45, depart: .45 });
export const MAP_CREASE = Object.freeze({ x0: 24, x1: 616, y: 227 });
export function sampleMapScene(phase = 'observe', seconds = 0, variant = 'assembly') {
    const t = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    let joined = variant === 'assembly' ? 0 : 1, reveal = 0, opacity = 1;
    if (phase === 'arrive') opacity = ease(t / MAP_SCENE_PHASES.arrive);
    if (phase === 'join') joined = ease(t / MAP_SCENE_PHASES.join);
    if (['joined', 'reveal', 'complete', 'depart', 'gone'].includes(phase)) joined = 1;
    if (phase === 'reveal') reveal = ease(t / MAP_SCENE_PHASES.reveal);
    if (['complete', 'depart', 'gone'].includes(phase)) reveal = 1;
    if (phase === 'depart') opacity = 1 - ease(t / MAP_SCENE_PHASES.depart);
    if (phase === 'gone') opacity = 0;
    return { phase, joined, reveal, route: reveal, crease: joined, opacity,
        done: phase in MAP_SCENE_PHASES && t >= MAP_SCENE_PHASES[phase] };
}
// Compatibility for old timeline clients; the game uses the held phases above.
export function sampleMapAssemble(t) {
    return { joined: ease((t - .4) / .7), crease: ease((t - 1) / .45), route: ease((t - 1.15) / .7),
        opacity: ease(t / .2) * (1 - ease((t - 2.55) / .4)), done: t >= 2.95 };
}
export function mapSceneLayout(width, height, box, insets = {}) {
    const left = insets.left ?? 20, right = insets.right ?? 20;
    const top = insets.top ?? 20, bottom = insets.bottom ?? 20;
    const w = Math.max(80, width - left - right), h = Math.max(80, height - top - bottom);
    const titleHeight = 38, margin = 12;
    const scale = Math.max(.05, Math.min((w - margin * 2) / box.w, (h - titleHeight - margin * 2) / box.h, 1.3));
    const drawingWidth = box.w * scale, drawingHeight = box.h * scale;
    const cx = left + w / 2, cy = top + h / 2;
    return { scale, x: cx - (box.x + box.w / 2) * scale,
        y: cy + titleHeight / 2 - (box.y + box.h / 2) * scale,
        titleX: cx, titleY: cy - (drawingHeight + titleHeight) / 2,
        titleWidth: Math.min(w, Math.max(drawingWidth, 260)),
        bounds: { x: cx - drawingWidth / 2, y: cy - (drawingHeight + titleHeight) / 2,
            width: drawingWidth, height: drawingHeight + titleHeight } };
}
function inside(x, y, pts) {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
}
export function createMapAssemble(PIXI, { texture, caption, lessMotion = false,
    route: showRoute = true, variant = 'assembly', fragment = 'corner', focus = 'route', flags = true }) {
    const container = new PIXI.Container(); container.label = 'map-assemble';
    const shade = new PIXI.Graphics(); container.addChild(shade);
    const sheet = new PIXI.Container(); sheet.label = 'map-scene-sheet'; container.addChild(sheet);
    const title = new PIXI.Text({ text: caption || MAP.title, style: {
        fontFamily: '"Patrick Hand", cursive', fontSize: 24, fill: 0x514d42,
        align: 'center', wordWrap: true, wordWrapWidth: 340,
        stroke: { color: 0xfff9e9, width: 5, join: 'round' }
    } });
    title.anchor.set(.5, 0); container.addChild(title);
    const pieces = [], texts = [];
    const selected = MAP_FRAGMENTS.find(f => f.id === fragment) || MAP_FRAGMENTS[0];
    const box = variant === 'fragment'
        ? { x: selected.box[0] - 12, y: selected.box[1] - 12, w: selected.box[2] + 24, h: selected.box[3] + 24 }
        : { x: variant === 'assembly' ? -30 : 0, y: 0, w: variant === 'assembly' ? 700 : 640, h: variant === 'assembly' ? 475 : 420 };
    let guardian = null;
    const drawLine = (g, pts, color, alpha, width) => {
        if (pts.length < 2) return;
        g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p);
        g.stroke({ color, alpha, width, cap: 'round', join: 'round' });
    };
    if (variant === 'guardian') {
        guardian = createGuardianMapPaper(PIXI, { texture }); sheet.addChild(guardian.container);
    } else {
        const art = texture('map-page');
        const names = mapLabels(flags).filter(l => variant === 'fragment' || ['cliff', 'beach', 'heart', 'tower', 'fold'].includes(l.key));
        for (const f of MAP_FRAGMENTS.filter(f => variant !== 'fragment' || f.id === selected.id)) {
            const c = new PIXI.Container(); c.label = 'map-scene-piece-' + f.id;
            const points = fragmentPoints(f), flat = points.flat(), back = new PIXI.Graphics();
            const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
            c.boundsArea = new PIXI.Rectangle(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs) + 6,
                Math.max(...ys) - Math.min(...ys) + 8);
            for (let i = 3; i >= 1; i--) back.poly(points.map(([x, y]) => [x + i * 1.8, y + i * 2.4]).flat()).fill({ color: 0x3a332b, alpha: .055 });
            back.poly(flat).fill(0xf8f0df);
            let pic;
            if (art) { pic = new PIXI.Sprite(art); pic.scale.set(1 / MAP_SCALE); }
            else {
                pic = new PIXI.Graphics().rect(0, 0, 640, 420).fill(0x8fbfd6);
                pic.poly([MAP_WATERLINE[0][0], -10, ...MAP_WATERLINE.flat(), -10, MAP_WATERLINE.at(-1)[1], -10, -10]).fill(0xefd9a4);
                pic.poly([MAP_COAST[0][0], -10, ...MAP_COAST.flat(), -10, MAP_COAST.at(-1)[1], -10, -10]).fill(0xb9c98f);
            }
            const mask = new PIXI.Graphics().poly(flat).fill(0xffffff); pic.mask = mask;
            const seam = new PIXI.Graphics().poly(flat).stroke({ width: 1.2, color: 0x8c7651, alpha: .65 });
            c.addChild(back, pic, mask, seam);
            for (const l of names) {
                if (!inside(l.x, l.y - 4, points)) continue;
                const t = new PIXI.Text({ text: MAP.places[l.key], style: {
                    fontFamily: '"Patrick Hand", cursive', fontSize: l.minor ? 16 : 22,
                    fill: 0x354f50, stroke: { color: 0xfbf4df, width: 4, join: 'round' }
                } });
                t.anchor.set(.5, .8); t.position.set(l.x, l.y);
                if (l.vertical) t.rotation = -Math.PI / 2;
                c.addChild(t); texts.push({ t, size: l.minor ? 16 : 22 });
            }
            sheet.addChild(c); pieces.push({ id: f.id, c });
        }
    }
    const emphasis = variant === 'fragment' ? null : new PIXI.Graphics();
    if (emphasis) { emphasis.label = 'map-scene-emphasis'; sheet.addChild(emphasis); }
    let phase = 'arrive', elapsed = 0, resolve = null, dead = false, selectedFocus = focus;
    let state = sampleMapScene(phase, 0, variant), lastPaint = '';
    const pose = n => lessMotion ? (n < .5 ? 0 : 1) : n;
    function paint() {
        state = sampleMapScene(phase, elapsed, variant); container.alpha = state.opacity;
        const joined = pose(state.joined), reveal = pose(state.reveal);
        const key = [joined, reveal, selectedFocus].join('/');
        if (key === lastPaint) return state; lastPaint = key;
        for (const { id, c } of pieces) {
            const off = variant === 'assembly' ? 1 - joined : 0;
            c.position.set((id === 'land' ? -36 : id === 'sea' ? 18 : 0) * off,
                (id === 'land' ? -12 : id === 'sea' ? 48 : 0) * off);
        }
        emphasis?.clear();
        guardian?.setShore(['coast', 'shore'].includes(selectedFocus) ? reveal : 0);
        if (variant === 'guardian' || variant === 'fragment') return state;
        if (selectedFocus === 'crease' || (variant === 'assembly' && joined > 0)) {
            const amount = selectedFocus === 'crease' ? reveal : joined * .6;
            const { x0, x1, y } = MAP_CREASE, end = x0 + (x1 - x0) * amount;
            if (amount > 0) {
                drawLine(emphasis, [[x0, y - 1.5], [end, y - 1.5]], 0xfffaed, .86, 3.2);
                drawLine(emphasis, [[x0, y + 1], [end, y + 1]], 0x7c684e, .52, 1.8);
            }
        }
        if (selectedFocus === 'route' && showRoute && reveal > 0) {
            const route = MAP_ROUTES.sea, length = (route.length - 1) * reveal;
            const n = Math.floor(length), pts = route.slice(0, n + 1);
            if (n < route.length - 1) {
                const a = route[n], b = route[n + 1], f = length - n;
                pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
            }
            drawLine(emphasis, pts, 0xfff7d8, .94, 10); drawLine(emphasis, pts, 0x397c98, .96, 4.2);
            if (reveal === 1) {
                const [x, y] = route.at(-1);
                emphasis.circle(x, y - 16, 17).stroke({ color: 0xc1934c, alpha: .8, width: 2 });
            }
        }
        return state;
    }
    function update(dt) {
        if (dead) return state;
        elapsed += Math.max(0, Number.isFinite(dt) ? dt : 0); paint();
        if (state.done && resolve) {
            const done = resolve; resolve = null;
            phase = ({ arrive: 'observe', join: 'joined', reveal: 'complete', depart: 'gone' })[phase];
            elapsed = 0; paint(); done();
        }
        return state;
    }
    function play(next) {
        if (dead) return new Promise(() => {});
        phase = next; elapsed = 0; return new Promise(r => { resolve = r; paint(); });
    }
    paint();
    return { container, update,
        get state() { return state; }, get phase() { return phase; }, get elapsed() { return elapsed; },
        arrive: () => play('arrive'), join: () => play('join'), reveal: () => play('reveal'), depart: () => play('depart'),
        focus(next) { selectedFocus = next; lastPaint = ''; paint(); },
        fit(width, height, insets = {}) {
            const layout = mapSceneLayout(width, height, box, insets);
            sheet.scale.set(layout.scale); sheet.position.set(layout.x, layout.y);
            title.position.set(layout.titleX, layout.titleY);
            title.style.fontSize = Math.min(25, Math.max(19, width / 24)); title.style.wordWrapWidth = layout.titleWidth;
            shade.clear().rect(0, 0, width, height).fill({ color: 0xece7da, alpha: .78 });
            for (const { t, size } of texts) t.style.fontSize = Math.max(size, 11 / layout.scale);
            return layout;
        },
        destroy() {
            if (dead) return; dead = true; resolve = null;
            container.parent?.removeChild(container); container.destroy({ children: true });
        }
    };
}
