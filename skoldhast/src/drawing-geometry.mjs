/* Pure geometry for the pencil overlay. Points use one consistent coordinate space. */
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export function pointBounds(points, padding = 0) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x: x - padding, y: y - padding, width: Math.max(1, Math.max(...xs) - x) + padding * 2, height: Math.max(1, Math.max(...ys) - y) + padding * 2 };
}
export function fitRect(source, area) {
    const scale = Math.min(area.width / source.width, area.height / source.height);
    const width = source.width * scale, height = source.height * scale;
    return { x: area.x + (area.width - width) / 2, y: area.y + (area.height - height) / 2, width, height };
}
export const toUnit = (point, box) => [(point[0] - box.x) / box.width, (point[1] - box.y) / box.height];
export const fromUnit = (point, box) => [box.x + point[0] * box.width, box.y + point[1] * box.height];

function segmentProjection(point, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], n = dx * dx + dy * dy;
    const t = n ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / n)) : 0;
    return { t, distance: Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy) };
}

/** Keep a child's shape and endpoints while bounding saved points and texture work. */
export function simplifyStroke(points, maxPoints = 200, tolerance = 0.0015) {
    if (points.length < 3) return points.map(p => p.slice());
    const simplify = (epsilon) => {
        const keep = new Set([0, points.length - 1]), stack = [[0, points.length - 1]];
        while (stack.length) {
            const [start, end] = stack.pop();
            let furthest = -1, far = epsilon;
            for (let i = start + 1; i < end; i++) {
                const d = segmentProjection(points[i], points[start], points[end]).distance;
                if (d > far) { far = d; furthest = i; }
            }
            if (furthest >= 0) { keep.add(furthest); stack.push([start, furthest], [furthest, end]); }
        }
        return [...keep].sort((a, b) => a - b).map(i => points[i].slice());
    };
    let out = simplify(tolerance);
    while (out.length > maxPoints) { tolerance *= 1.5; out = simplify(tolerance); }
    return out;
}

/** Taps credit one point; a continuous segment credits every checkpoint it actually crosses. */
export function createTrace(initial, { stopAt, allowReverse = false, tapRadius = 44 } = {}) {
    let anchors = initial.map(p => p.slice()), progress = 0, reversed = false, previous = null, saved = null;
    const ordered = () => reversed ? anchors.slice().reverse() : anchors;
    const limit = () => Math.min(anchors.length, stopAt || anchors.length);
    function radius(points, index) {
        const gaps = [];
        if (index) gaps.push(distance(points[index], points[index - 1]));
        if (index + 1 < points.length) gaps.push(distance(points[index], points[index + 1]));
        return Math.max(4, Math.min(24, Math.min(...gaps, 64) * 0.35));
    }
    return {
        begin(point) {
            saved = { progress, reversed };
            if (!progress && allowReverse && !stopAt && distance(point, anchors.at(-1)) < distance(point, anchors[0])) reversed = true;
            previous = point.slice();
            const points = ordered(), before = progress;
            if (progress < limit() && distance(point, points[progress]) <= tapRadius) progress++;
            return progress - before;
        },
        move(point) {
            if (!previous) return 0;
            const points = ordered(), before = progress;
            let lastT = -1;
            while (progress < limit()) {
                const near = segmentProjection(points[progress], previous, point);
                if (near.distance > radius(points, progress) || near.t < lastT) break;
                // With tightly spaced points, staying still must not count as tracing.
                if (distance(previous, point) < 0.5) break;
                progress++; lastT = near.t;
            }
            previous = point.slice();
            return progress - before;
        },
        end() { previous = saved = null; },
        cancel() { if (saved) { progress = saved.progress; reversed = saved.reversed; } previous = saved = null; },
        reset() { progress = 0; reversed = false; previous = saved = null; },
        setAnchors(next) { anchors = next.map(p => p.slice()); previous = null; progress = Math.min(progress, limit()); },
        get points() { return ordered().map(p => p.slice()); },
        get progress() { return progress; },
        get total() { return limit(); },
        get complete() { return progress >= limit(); }
    };
}
