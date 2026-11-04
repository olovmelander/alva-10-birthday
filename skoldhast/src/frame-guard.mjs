/*
 * The frame guard: the page draws sharp where the device can keep up, and a little softer where it cannot.
 *
 *   const guard = createFrameGuard({ onLower: (scale) => applyResolution() });
 *   guard.sample(dt);              // every played frame, in seconds
 *   res = base * guard.scale;      // the drawing resolution to use
 *
 * When frames stay slower than about 42 per second for a few seconds, the resolution steps down by 15 %,
 * never below 55 % of what the screen asked for, and never back up during the session (no flicker
 * between the two). The first seconds after opening are not counted: textures are still arriving.
 */
export function createFrameGuard({ limit = 1 / 42, hold = 2.5, step = 0.85, min = 0.55, warmup = 3, onLower } = {}) {
    let ema = 1 / 60, slowFor = 0, scale = 1, warm = 0;
    return {
        get scale() { return scale; },
        sample(dt) {
            if (!(dt > 0) || dt > 0.2) return; // a stall (tab switch, loading) says nothing about the drawing
            warm += dt;
            if (warm < warmup) return;
            ema = ema * 0.92 + dt * 0.08;
            slowFor = ema > limit ? slowFor + dt : 0;
            if (slowFor > hold && scale > min) {
                scale = Math.max(min, scale * step);
                slowFor = 0; ema = 1 / 60; warm = warmup * 0.5;
                onLower?.(scale);
            }
        }
    };
}
