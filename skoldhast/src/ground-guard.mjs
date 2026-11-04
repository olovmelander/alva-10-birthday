/*
 * The ground guard: solid ground stays solid from every side, for both adventures.
 *
 *   const guard = createGroundGuard({ pits: false });
 *   const before = { x: G.player.x, y: G.player.y };
 *   stepPlayer(...);
 *   guard.keep(G, before, events);   // after the sim's step (and any wading or bouncing)
 *   guard.net(G, events);            // last: never lost below the page
 *
 * The shared sim lands a falling sköldhäst only on ground it reaches from above. A jump that meets a
 * steep rise or a terrace's step from the side, or a swimmer pushing into a steep bank, could slip under
 * the ground line where nothing lies below, and fall out of the page. keep() catches the step that would
 * enter that space: a low rise is climbed, anything higher stops the move sideways like a wall. A cave or
 * vault under higher ground is not affected: there is ground below the sköldhäst there.
 *
 * net() is the last resort: below the page's bottom (or, with `pits`, down on a hidden pit floor that is
 * never entered on purpose), the sköldhäst is put back where it last stood safely and a 'rescued' event
 * is emitted for a short thought.
 */
import { heightOn, createPlayer, HL } from './sim.mjs';

const STEP_UP = 0.3 * HL;

/** Above: the nearest solid line over (x, y). Below: whether any solid line lies at or under y. */
export function groundAround(surfaces, x, y) {
    let above = null, below = false;
    for (const q of surfaces) {
        if (q.thin || x < q.pts[0][0] || x > q.pts.at(-1)[0]) continue;
        const sy = heightOn(q.pts, x);
        if (sy >= y - 2) below = true;
        else if (!above || sy > above.y) above = { y: sy, s: q };
    }
    return { above, below };
}

export function createGroundGuard({ pits = false } = {}) {
    let lastSafe = null;
    return {
        keep(G, before, events) {
            const p = G.player, T = G.terrain;
            if (!T || (p.mode === 'ground' && p.surface)) return; // standing on something: the sim has it right
            const now = groundAround(T.surfaces, p.x, p.y);
            if (now.below || !now.above || p.y < now.above.y + 2) return;
            const was = groundAround(T.surfaces, before.x, before.y);
            if (!was.below && was.above) return; // already lost before this step: net() takes it
            const top = now.above;
            if (p.mode !== 'swim' && top.y >= before.y - STEP_UP) {
                // a low rise, or a line crossed from above: stand on it
                p.y = p.py = top.y; p.vy = 0; p.mode = 'ground'; p.surface = top.s; p.jump = null;
                events.push({ type: 'land', id: top.s.id, x: p.x, y: p.y, guard: true });
                return;
            }
            // too high to climb: here the ground is a wall
            p.x = p.px = before.x; p.vx = 0;
            if (p.jump) p.jump.vx = 0;
            events.push({ type: 'groundWall', x: p.x, y: p.y });
        },
        net(G, events) {
            const p = G.player, def = G.sceneDef, b = def?.bounds;
            if (!b) return;
            const s = p.surface;
            if (p.mode === 'ground' && s && !s.thin && !s.bounce && !(pits && s.hidden)) lastSafe = { scene: G.sceneId, x: p.x, y: p.y, facing: p.facing };
            const lost = p.y > b.y1 + 0.5 * HL || (pits && p.mode === 'ground' && s?.hidden);
            if (!lost) return;
            const spot = (lastSafe && lastSafe.scene === G.sceneId && lastSafe) || G.safeSpot?.() || def.spots?.start || Object.values(def.spots || {})[0];
            if (!spot) return;
            const np = createPlayer({ x: spot.x, y: spot.y - 4, facing: spot.facing || p.facing || 1 });
            np.wet = p.wet;
            const sup = G.terrain?.support(np.x, np.y, 120, 400);
            if (sup) { np.y = sup.y; np.surface = sup.s; }
            G.player = np;
            events.push({ type: 'rescued', x: np.x, y: np.y });
        },
        reset() { lastSafe = null; }
    };
}
