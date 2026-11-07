/*
 * A finger for the browser checks: touch strokes that carry their own event times (CDP
 * Input.dispatchTouchEvent).
 *
 * Why: a stroke sent as fast as CDP allows and lifted mid-motion reads to Chrome as a fling,
 * and Chrome then swallows the click of the next tap, the one that would stop the fling. A
 * check that draws and then taps "Klar" or a choice would sometimes find its tap reached the
 * button but was never heard (1 October: 6 of 12 taps lost on a bare page, 0 of 12 with a
 * resting finger). So this finger moves at 60 Hz and rests on its last point before it lifts
 * (Chrome counts a pointer as still 40 ms after its last move). The times end "now" and never
 * run backwards between strokes, so a slow software-WebGL frame between two events cannot
 * stretch or squeeze the gesture.
 *
 *   import { stroke } from './finger.mjs';
 *   await stroke(page, [[x0, y0], [x1, y1], ...]);
 */
const STEP = 1 / 60, REST = 0.1;
let clock = 0; // when the last synthetic finger lifted (seconds since the epoch)

/** One finger draws through `points` (page pixels) and lifts after resting on the last one. */
export async function stroke(page, points, { id = 1 } = {}) {
    if (!points.length) return;
    const length = (points.length - 1) * STEP + REST;
    let time = Math.max(Date.now() / 1000 - length, clock + STEP);
    const cdp = await page.context().newCDPSession(page);
    const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints, timestamp: time });
    try {
        await send('touchStart', [{ x: points[0][0], y: points[0][1], id }]);
        for (const [x, y] of points.slice(1)) { time += STEP; await send('touchMove', [{ x, y, id }]); }
        time += REST; await send('touchEnd', []);
    } finally { clock = time; await cdp.detach(); }
}
