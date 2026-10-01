/* Stable, grouped kelp silhouettes. Scenery only: the actual floor, roof and
 * authored puzzle clearings decide where a plant can take root. */
import { HL } from './sim.mjs';

const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function kelpGardenLayout(def, interval, groundAt, roofAt = () => null) {
    const count = interval.kelp || 0, groups = Math.ceil(count / 3);
    if (!groups || interval.x1 <= interval.x0) return [];
    const spacing = (interval.x1 - interval.x0) / groups;
    const front = interval.layer === 'fore', seed = interval.x0 / HL * 31 + interval.x1 / HL * 17 + (front ? 913 : 0);
    const top = Math.min(...(def.waters || []).filter(w => w.kind !== 'pipe').map(w => w.top));
    const plants = [];
    for (let i = 0; i < count; i++) {
        const group = Math.floor(i / 3), member = i % 3, n = seed + i * 23;
        // Three unequal silhouettes share a loose holdfast neighbourhood, with
        // an open interval between groups rather than evenly spaced fence posts.
        const centre = interval.x0 + spacing * (group + .36 + noise(seed + group * 7) * .27);
        const x = clamp(centre + (member - 1) * Math.min(spacing * .16, HL * .7)
            + (noise(n) - .5) * HL * .22, interval.x0 + 8, interval.x1 - 8);
        if (def.id === 'kelp' && (def.school && Math.abs(x - def.school.home.x) < HL * .9
            || def.kelpPuzzle && x > def.kelpPuzzle.tether.root.x - HL * .45
                && x < def.kelpPuzzle.fragment.to.x + HL * 1.35)) continue;
        const fy = groundAt(x);
        if (fy === null || !Number.isFinite(fy)) continue;
        const depth = front ? 'fore' : member === 0 ? 'far' : 'mid';
        let H = HL * (depth === 'far' ? 3.6 + noise(n + 2) * 1.9
            : depth === 'fore' ? 1.8 + noise(n + 2) * 1.9 : 2.1 + noise(n + 2) * 2.6);
        const roof = roofAt(x), roofed = roof !== null && roof < fy;
        const ceiling = roofed ? roof + HL * .25 : top + HL * .25;
        // The dim vault has a low understory. Tall open-water silhouettes would
        // fence off its fish lights and the small drawn trail across the wall.
        if (Number.isFinite(ceiling)) H = Math.min(H, (fy - ceiling) * (roofed ? .48 + noise(n + 8) * .13 : 1));
        if (H < HL * .7) continue;
        plants.push({ x, fy, H, depth,
            width: (depth === 'far' ? 40 : 53) + noise(n + 3) * (front ? 48 : 35),
            lean: HL * (.09 + noise(n + 4) * .36) * (member === 2 ? -.55 : 1),
            phase: noise(n + 5) * Math.PI * 2,
            alpha: depth === 'far' ? .32 : front ? .48 : .92,
            tint: depth === 'far' ? 0xb7d1c9 : front ? 0xa8c7b2 : 0xe1e7cf,
            rock: depth === 'mid' && noise(n + 6) < .32 ? 1 + i % 3 : 0
        });
    }
    return plants;
}
