/* Visible solid terrain, from the same active polylines used by collision.
 * Partition at endpoints AND intersections, so ramps replace buried terrace tops.
 * This runs only when the active surfaces change, never every rendered frame.
 */
export function terrainShape(surfaces) {
    const segments = [];
    const cuts = new Set();
    for (const s of surfaces) {
        if (s.thin) continue;
        for (let i = 1; i < s.pts.length; i++) {
            const [x0, y0] = s.pts[i - 1], [x1, y1] = s.pts[i];
            if (x1 <= x0) continue;
            const m = (y1 - y0) / (x1 - x0);
            segments.push({ s, x0, x1, y0, m });
            cuts.add(x0); cuts.add(x1);
        }
    }
    const at = (s, x) => s.y0 + (x - s.x0) * s.m;
    for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
        const a = segments[i], b = segments[j], lo = Math.max(a.x0, b.x0), hi = Math.min(a.x1, b.x1);
        if (lo >= hi || Math.abs(a.m - b.m) < 1e-9) continue;
        const x = lo + (at(b, lo) - at(a, lo)) / (a.m - b.m);
        if (x > lo + 1e-6 && x < hi - 1e-6) cuts.add(x);
    }
    const xs = [...cuts].sort((a, b) => a - b), runs = [];
    for (let i = 1; i < xs.length; i++) {
        const x0 = xs[i - 1], x1 = xs[i], mid = (x0 + x1) / 2;
        let top = null;
        for (const s of segments) if (mid >= s.x0 && mid <= s.x1 && (!top || at(s, mid) < at(top, mid) - 1e-7)) top = s;
        if (!top) continue;
        const a = [x0, at(top, x0)], b = [x1, at(top, x1)], last = runs.at(-1);
        if (last?.s === top.s && Math.abs(last.pts.at(-1)[0] - x0) < 1e-6 && Math.abs(last.pts.at(-1)[1] - a[1]) < 1e-6) last.pts.push(b);
        else runs.push({ s: top.s, pts: [a, b] });
    }
    const outlines = [];
    for (const run of runs) {
        const last = outlines.at(-1), a = run.pts[0];
        if (last && Math.abs(last.at(-1)[0] - a[0]) < 1e-6) {
            // A true height discontinuity is the complete vertical face, not a fixed decorative stroke.
            if (Math.abs(last.at(-1)[1] - a[1]) > 1e-6) last.push(a);
            last.push(...run.pts.slice(1));
        } else outlines.push(run.pts.slice());
    }
    return { runs, outlines };
}

/** The part of a left-to-right outline between x0 and x1, cut exactly at both
 * (vertical faces are kept whole when they lie inside the range). */
export function clipX(pts, x0, x1) {
    const out = [];
    const cut = (a, b, x) => [x, a[1] + (b[1] - a[1]) * ((x - a[0]) / ((b[0] - a[0]) || 1))];
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i], prev = pts[i - 1];
        if (prev) {
            if (prev[0] < x0 && p[0] > x0) out.push(cut(prev, p, x0));
            if (prev[0] < x1 && p[0] > x1 && out.length) { out.push(cut(prev, p, x1)); break; }
        }
        if (p[0] >= x0 && p[0] <= x1) out.push(p.slice());
        else if (p[0] > x1) break;
    }
    return out;
}
