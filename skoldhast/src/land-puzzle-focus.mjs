/* Frame the actual obstacle and its payoff together; never move the player. */
import { HL } from './sim.mjs';

const FRAME = Object.freeze({
    bridge: [75.3, -2.15, 82.4, .65],
    pool: [99.15, -2.05, 105.55, 1.6],
    ramp: [45.6, -2.8, 53.4, -.35],
    rampMiddle: [38.1, -3.8, 45.45, -1.55],
    rampUpper: [35.65, -4.8, 38.85, -2.65],
    waveMarks: [31.9, -6.1, 37.8, -3.6],
    leap: [2.15, -5.85, 15.8, -1.95],
    runup: [23.7, -7.9, 29.6, -5.35],
    landmark: [2.15, -5.8, 8.65, -3.55]
});

export function landPuzzleFrame(id) {
    const rect = FRAME[id];
    if (!rect) throw new Error(`Unknown land puzzle focus: ${id}`);
    const [x0, y0, x1, y1] = rect.map(v => v * HL);
    return { x0, y0, x1, y1 };
}

/** Canvas-coordinate rectangles, including measured dialogue and top HUD. */
export function fitLandPuzzleFrame(frame, width, height, obstacles = []) {
    const insets = { left: 20, right: 20, top: 24, bottom: 24 };
    for (const rect of obstacles) {
        if (!rect || rect.width <= 0 || rect.height <= 0) continue;
        if (rect.top + rect.height / 2 < height / 2) insets.top = Math.max(insets.top, rect.top + rect.height + 18);
        else insets.bottom = Math.max(insets.bottom, height - rect.top + 18);
    }
    // The dialogue can wrap further with large text. Preserve a visible band
    // without changing the page or allowing the camera to crop the answer.
    const maxReserved = Math.max(0, height - 110), total = insets.top + insets.bottom;
    if (total > maxReserved && total) {
        insets.top *= maxReserved / total;
        insets.bottom *= maxReserved / total;
    }
    frame.insets = insets;
    return frame;
}
