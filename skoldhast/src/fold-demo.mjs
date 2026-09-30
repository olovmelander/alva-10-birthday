/* Klo's paper experiment. The map ink and a captured piece of the real beach
 * travel with their folds. Each action ends in a still pose for the reader. */
import { MAP_FRAGMENTS, MAP_SCALE, MAP_SHELL, fragmentPoints } from './map-layout.mjs';
const CORNER = MAP_FRAGMENTS.find(f => f.id === 'corner');
const OUTLINE = fragmentPoints(CORNER);
const X0 = Math.min(...OUTLINE.map(p => p[0])), Y0 = Math.min(...OUTLINE.map(p => p[1]));
const WIDTH = Math.max(...OUTLINE.map(p => p[0])) - X0, HEIGHT = Math.max(...OUTLINE.map(p => p[1])) - Y0;
const HINGE = MAP_SHELL.x + 25;
const FLAP = OUTLINE.flatMap((p, i) => {
    const q = OUTLINE[(i + 1) % OUTLINE.length], points = p[0] <= HINGE ? [p] : [];
    if ((p[0] < HINGE && q[0] > HINGE) || (p[0] > HINGE && q[0] < HINGE))
        points.push([HINGE, p[1] + (q[1] - p[1]) * (HINGE - p[0]) / (q[0] - p[0])]);
    return points;
});
const clamp = v => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const ease = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
const between = (t, a, b) => ease((t - a) / (b - a));
export const FOLD_DEMO_PHASES = Object.freeze({ arrive: .85, fold: 2.9, unfold: 2.9, depart: .85 });
export const FOLD_BEACH = Object.freeze({ width: 296, above: 76, below: 146, lift: 78 });

export function sampleFoldDemo(phase = 'observe', seconds = 0) {
    const t = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    let map = 0, world = 0, opacity = 1;
    if (phase === 'fold') { map = between(t, .15, 1.05); world = between(t, 1.5, 2.7); }
    if (phase === 'compare') map = world = 1;
    if (phase === 'unfold') { map = 1 - between(t, .1, 1); world = 1 - between(t, 1.5, 2.7); }
    if (phase === 'arrive') opacity = between(t, 0, .85);
    if (phase === 'depart') opacity = 1 - between(t, 0, .85);
    if (phase === 'gone') opacity = 0;
    return { phase, map, world, opacity, done: phase in FOLD_DEMO_PHASES && t >= FOLD_DEMO_PHASES[phase] };
}

/** The paper to the left of a vertical crease lifts; its ink keeps fixed UVs. */
export function foldMapPoint([x, y], amount) {
    const d = Math.max(0, HINGE - x), angle = clamp(amount) * Math.PI * .34;
    return [x + d * (1 - Math.cos(angle)), y - Math.sin(angle) * d * .3];
}

/** An attached, shallow pleat: its sides and lower edge remain on the beach.
 * The shell and sand share this deformation, including the original waterline. */
export function foldBeachPoint([x, y], amount) {
    const edge = Math.abs(x) / (FOLD_BEACH.width / 2);
    const ridge = Math.pow(Math.max(0, 1 - edge), 1.35);
    const depth = 1 - ease(Math.max(0, y) / FOLD_BEACH.below);
    const lift = clamp(amount) * ridge * depth;
    return [x - 15 * lift, y - FOLD_BEACH.lift * lift];
}

function grid(PIXI, texture, box, uv, cols = 32, rows = 18) {
    const rest = [], positions = new Float32Array((cols + 1) * (rows + 1) * 2);
    const uvs = new Float32Array(positions.length), indices = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
        const p = [box.x + box.w * i / cols, box.y + box.h * j / rows], k = rest.length;
        rest.push(p); positions.set(p, k * 2); uvs.set(uv(p), k * 2);
        if (j < rows && i < cols) { const a = j * (cols + 1) + i, b = a + cols + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
    }
    const geometry = new PIXI.MeshGeometry({ positions, uvs, indices: new Uint32Array(indices) });
    const mesh = new PIXI.Mesh({ geometry, texture: texture || PIXI.Texture.WHITE });
    return { mesh, geometry, update(fn) {
        for (let i = 0; i < rest.length; i++) positions.set(fn(rest[i]), i * 2);
        geometry.getBuffer('aPosition').update();
    }, destroy() { geometry.destroy(); } };
}

export function createFoldDemo(PIXI, { texture, x, y, clawX, clawY, lessMotion = false }) {
    const container = new PIXI.Container(); container.label = 'fold-demo';
    const beach = new PIXI.Container(); beach.label = 'fold-demo-beach'; beach.position.set(x, y);
    const ink = 0x625b50;
    const mapScale = 310 / WIDTH, mx = x - 207, my = y - 386;
    const art = texture('map-page');
    const mapStage = new PIXI.Container(); container.addChild(mapStage);
    const paper = new PIXI.Graphics(), cast = new PIXI.Graphics(), rim = new PIXI.Graphics(), mask = new PIXI.Graphics();
    const mapGrid = grid(PIXI, art, { x: X0, y: Y0, w: WIDTH, h: HEIGHT },
        ([px, py]) => [px * MAP_SCALE / (art?.width || 1920), py * MAP_SCALE / (art?.height || 1260)]);
    mapGrid.mesh.label = 'fold-map-ink'; mapGrid.mesh.mask = mask;
    if (!art) mapGrid.mesh.tint = 0xeddcaf;
    mapStage.addChild(cast, paper, mapGrid.mesh, mask, rim);
    const handStage = new PIXI.Container(); container.addChild(handStage);
    // A second mesh shows the same fold in the small sheet held in Klo's claw.
    const handMask = new PIXI.Graphics();
    const handGrid = grid(PIXI, art, { x: X0, y: Y0, w: WIDTH, h: HEIGHT },
        ([px, py]) => [px * MAP_SCALE / (art?.width || 1920), py * MAP_SCALE / (art?.height || 1260)]);
    handGrid.mesh.mask = handMask; handStage.addChild(handGrid.mesh, handMask);
    handStage.scale.set(.12); handStage.position.set(clawX - (X0 + WIDTH / 2) * .12, clawY - (Y0 + HEIGHT / 2) * .12);
    const beachShadow = new PIXI.Graphics(), beachRim = new PIXI.Graphics();
    beach.addChild(beachShadow, beachRim);
    const mapRing = new PIXI.Graphics(), beachRing = new PIXI.Graphics();
    mapStage.addChild(mapRing); beach.addChild(beachRing);
    const shell = new PIXI.Sprite(texture('shell-1') || PIXI.Texture.WHITE);
    shell.label = 'fold-demo-shell'; shell.anchor.set(.5, 1); beach.addChild(shell);
    let beachGrid = null, beachTexture = null, phase = 'arrive', elapsed = 0, resolve = null, dead = false;
    let state = sampleFoldDemo(phase, 0), lastMap = -1, lastWorld = -1;
    // The sand texture continues below the camera's action frame, seamlessly into the beach.
    const bounds = { x0: x - 218, x1: Math.max(x + 164, clawX + 42), y0: y - 425, y1: y + 32 };
    container.boundsArea = new PIXI.Rectangle(bounds.x0, bounds.y0, bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
    const outlineAt = amount => OUTLINE.map(p => foldMapPoint(p, amount));
    const reduced = (amount) => lessMotion ? (amount < .5 ? 0 : 1) : amount;
    function drawMap(amount) {
        if (amount === lastMap) return; lastMap = amount;
        mapGrid.update(p => foldMapPoint(p, amount)); handGrid.update(p => foldMapPoint(p, amount));
        const pts = outlineAt(amount), flat = pts.flat();
        mask.clear().poly(flat).fill(0xffffff); handMask.clear().poly(flat).fill(0xffffff);
        paper.clear().poly(flat).fill(0xf8efdd);
        cast.clear();
        for (let i = 3; i >= 1; i--) cast.poly(pts.map(([px, py]) => [px + 3 + i * 1.5, py + 4 + i * 1.5]).flat()).fill({ color: 0x4e4237, alpha: .045 });
        rim.clear().poly(flat).stroke({ color: ink, alpha: .5, width: 1.5 });
        if (amount > 0) {
            const hinge = HINGE;
            rim.poly(FLAP.map(p => foldMapPoint(p, amount)).flat()).fill({ color: 0x71624c, alpha: .065 * amount });
            rim.moveTo(hinge, Y0 + 4).lineTo(hinge, Y0 + HEIGHT - 8).stroke({ color: 0x62523d, alpha: .25 * amount, width: 5 });
            rim.moveTo(hinge - 2, Y0 + 4).lineTo(hinge - 2, Y0 + HEIGHT - 8).stroke({ color: 0xfffbec, alpha: .8 * amount, width: 2 });
            // A narrow light edge gives the raised paper thickness without covering its drawing.
            rim.moveTo(...pts.at(-1)); for (const p of pts.slice(0, 3)) rim.lineTo(...p);
            rim.stroke({ color: 0xfffae9, alpha: .9 * amount, width: 2.4 });
        }
    }
    function drawBeach(amount) {
        if (amount === lastWorld) return; lastWorld = amount;
        beachGrid?.update(p => foldBeachPoint(p, amount));
        const foot = foldBeachPoint([0, 0], amount);
        shell.position.set(...foot); shell.rotation = -.055 * amount;
        beachShadow.clear(); beachRim.clear();
        if (amount > 0) {
            for (let i = 4; i >= 1; i--) beachShadow.ellipse(-6, 3 + i * 2, 113 + i * 2, 4 + i * 2).fill({ color: 0x67503d, alpha: .018 * amount });
            const pts = Array.from({ length: 25 }, (_, i) => foldBeachPoint([-FOLD_BEACH.width / 2 + i * FOLD_BEACH.width / 24, 1], amount));
            // Only the paper lip; the sand and blue pencil contour are in the moving texture.
            beachRim.moveTo(...pts[0]); for (const [px, py] of pts.slice(1)) beachRim.lineTo(px, py + 1.5);
            beachRim.stroke({ color: 0xfff6db, alpha: .72 * amount, width: 2.3 });
        }
    }
    function paint() {
        state = sampleFoldDemo(phase, elapsed);
        const ma = reduced(state.map), wa = reduced(state.world);
        drawMap(ma); drawBeach(wa);
        const flight = lessMotion ? 1 : phase === 'arrive' ? state.opacity : phase === 'depart' ? state.opacity : 1;
        const zoom = .12 + (mapScale - .12) * flight;
        mapStage.scale.set(zoom);
        mapStage.position.set(clawX - (X0 + WIDTH / 2) * .12 + (mx - X0 * mapScale - (clawX - (X0 + WIDTH / 2) * .12)) * flight,
            clawY - (Y0 + HEIGHT / 2) * .12 + (my - Y0 * mapScale - (clawY - (Y0 + HEIGHT / 2) * .12)) * flight);
        mapStage.alpha = state.opacity; handStage.alpha = state.opacity;
        // The beach remains exactly present during arrival/departure; no disappearing patch.
        const focus = phase === 'observe' ? .75 : phase === 'arrive' ? state.opacity * .75 : 0;
        mapRing.clear(); beachRing.clear();
        if (focus) {
            const p = foldMapPoint([MAP_SHELL.x, MAP_SHELL.y - 4], ma);
            mapRing.ellipse(p[0], p[1], 17, 13).stroke({ color: 0xb68750, alpha: focus * .72, width: 1.2 });
            beachRing.ellipse(0, -24, 39, 32).stroke({ color: 0xb68750, alpha: focus * .6, width: 1.8 });
        }
        return state;
    }
    function update(dt) {
        if (dead) return state;
        elapsed += Math.max(0, Number.isFinite(dt) ? dt : 0);
        paint();
        if (state.done && resolve) {
            const done = resolve; resolve = null;
            phase = ({ arrive: 'observe', fold: 'compare', unfold: 'restored', depart: 'gone' })[phase] || phase;
            elapsed = 0; if (phase !== 'gone') paint();
            done();
        }
        return state;
    }
    function play(next) {
        if (dead) return new Promise(() => {});
        phase = next; elapsed = 0;
        return new Promise(r => { resolve = r; paint(); });
    }
    paint();
    return { container, beach, bounds, update,
        get phase() { return phase; }, get elapsed() { return elapsed; }, get state() { return state; },
        arrive: () => play('arrive'), fold: () => play('fold'), unfold: () => play('unfold'), depart: () => play('depart'),
        setBeach(t, originalShell) {
            if (beachGrid) { beachGrid.mesh.destroy(); beachGrid.destroy(); }
            beachTexture?.destroy(true); beachTexture = t;
            beachGrid = grid(PIXI, t, { x: -FOLD_BEACH.width / 2, y: -FOLD_BEACH.above, w: FOLD_BEACH.width, h: FOLD_BEACH.above + FOLD_BEACH.below },
                ([px, py]) => [(px + FOLD_BEACH.width / 2) / FOLD_BEACH.width, (py + FOLD_BEACH.above) / (FOLD_BEACH.above + FOLD_BEACH.below)], 40, 24);
            beachGrid.mesh.label = 'fold-beach-ink'; beach.addChildAt(beachGrid.mesh, 1);
            if (originalShell) {
                shell.texture = originalShell.texture; shell.anchor.copyFrom(originalShell.anchor);
                shell.scale.copyFrom(originalShell.scale); shell.tint = originalShell.tint;
            }
            lastWorld = -1; paint();
        },
        fit() {},
        destroy() {
            if (dead) return; dead = true; resolve = null;
            container.parent?.removeChild(container); beach.parent?.removeChild(beach);
            container.destroy({ children: true }); beach.destroy({ children: true });
            mapGrid.destroy(); handGrid.destroy(); beachGrid?.destroy(); beachTexture?.destroy(true);
        }
    };
}
