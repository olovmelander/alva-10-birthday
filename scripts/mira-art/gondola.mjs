/*
 * Tigergondolen – the tiger-striped gondola from Mira's photo, and the
 * pylons that carry its cable across the islands.
 *
 * The gondola comes in two layers that share one anchor (the grip on the
 * cable): the back layer (inside) is drawn first, then Mira and Nova, then
 * the front layer (frame, glass, striped panel, roof).
 *
 * The 'mira' and 'nova' points (frame coordinates) say where their feet go:
 * Mira stands in the left pane, Nova sits on the window ledge in the right one.
 */
import { ramp, alpha } from './kit.mjs';

const GW = 48;
const GH = 64;
const ANCHOR = [24, 2];

const ORANGE = ramp('#f08a2c');
const WHITE = { b: '#fff4e6', d1: '#e2cdb8', d2: '#b89f8c' };
const STEEL = { b: '#c7d1e6', l1: '#eef3ff', d1: '#8d98b6', d2: '#5d6788' };
const STRIPE = '#352024';
const WALL = { b: '#3b3f6e', d1: '#2c2f57', l1: '#4b5190' };

// window box (inside the frame)
const WIN = { x: 6, y: 17, w: 36, h: 27 };
const PANEL_Y = WIN.y + WIN.h;          // top of the lower panel
const MULLION = 27;                     // post between Mira's pane and Nova's
const FLOOR_Y = 57;

function hanger(s, wheelFrame) {
    // carriage with two wheels riding on the cable at y = 2
    s.rect(15, 1, 18, 4, STEEL.d1);
    s.hline(15, 32, 1, STEEL.b);
    s.circle(18, 2, 2, STEEL.d2);
    s.circle(29, 2, 2, STEEL.d2);
    s.px(18 + (wheelFrame ? 1 : -1), 2, STEEL.l1);
    s.px(29 + (wheelFrame ? 1 : -1), 2, STEEL.l1);
    // arm down to the roof
    s.rect(23, 5, 3, 7, STEEL.d1);
    s.vline(23, 5, 11, STEEL.b);
    s.rect(21, 11, 7, 2, STEEL.d1);
}

function roof(s) {
    s.poly([[6, 17], [9, 13], [39, 13], [42, 17]], ORANGE.b);
    s.hline(9, 38, 13, ORANGE.l1);
    s.hline(7, 41, 16, ORANGE.d1);
    s.rect(5, 16, 38, 2, WHITE.b);
    s.hline(5, 42, 17, WHITE.d1);
    // tiger stripes on the roof
    for (const x of [12, 18, 29, 35]) {
        s.line(x, 14, x + 1, 15, STRIPE);
    }
    // a little star lamp on top
    s.px(24, 11, '#ffe36a');
    s.px(23, 12, '#ffe36a');
    s.px(25, 12, '#ffe36a');
    s.px(24, 12, '#fffbe0');
}

function panel(s) {
    // striped lower panel with a rounded bottom
    s.poly([[5, PANEL_Y], [43, PANEL_Y], [43, FLOOR_Y - 1], [40, FLOOR_Y + 3], [8, FLOOR_Y + 3], [5, FLOOR_Y - 1]], ORANGE.b);
    s.hline(5, 43, PANEL_Y, WHITE.b);
    s.hline(5, 43, PANEL_Y + 1, WHITE.d1);
    s.vline(5, PANEL_Y, FLOOR_Y - 1, ORANGE.l1);
    s.vline(43, PANEL_Y + 1, FLOOR_Y - 1, ORANGE.d1);
    s.hline(8, 40, FLOOR_Y + 3, ORANGE.d2);
    s.hline(7, 41, FLOOR_Y + 2, ORANGE.d1);
    // tiger stripes: tapered wedges from the top and bottom edges
    const top = PANEL_Y + 2;
    const bottom = FLOOR_Y + 1;
    for (const [x, len] of [[8, 6], [14, 5], [31, 6], [37, 5]]) {
        s.rect(x, top, 2, 2, STRIPE);
        s.px(x + 1, top + 2, STRIPE);
        s.line(x + 1, top + 3, x + 2, top + len, STRIPE);
    }
    for (const [x, len] of [[11, 5], [18, 4], [28, 4], [34, 5], [40, 4]]) {
        s.rect(x, bottom - 1, 2, 2, STRIPE);
        s.px(x, bottom - 2, STRIPE);
        s.line(x, bottom - 3, x - 1, bottom - len, STRIPE);
    }
    // a white star badge
    s.px(24, PANEL_Y + 6, '#ffffff');
    s.hline(22, 26, PANEL_Y + 7, '#ffffff');
    s.hline(23, 25, PANEL_Y + 8, '#ffffff');
    s.px(22, PANEL_Y + 9, '#ffffff');
    s.px(26, PANEL_Y + 9, '#ffffff');
}

function frame(s) {
    // window frame and mullions
    s.vline(WIN.x - 1, WIN.y, PANEL_Y, STEEL.b);
    s.vline(WIN.x, WIN.y, PANEL_Y, STEEL.d1);
    s.vline(WIN.x + WIN.w, WIN.y, PANEL_Y, STEEL.b);
    s.vline(WIN.x + WIN.w + 1, WIN.y, PANEL_Y, STEEL.d1);
    s.vline(MULLION, WIN.y, PANEL_Y, STEEL.b);
    s.px(MULLION, WIN.y, STEEL.l1);
    // handrail across the window (like in the photo)
    s.hline(WIN.x + 1, WIN.x + WIN.w - 1, PANEL_Y - 3, alpha(STEEL.l1, 0.95));
    s.hline(WIN.x + 1, WIN.x + WIN.w - 1, PANEL_Y - 2, alpha(STEEL.d1, 0.9));
}

function glass(s) {
    // a faint tint and small glints in the top corners of each pane
    for (let y = WIN.y + 1; y < PANEL_Y; y += 1) {
        for (let x = WIN.x + 1; x < WIN.x + WIN.w; x += 1) {
            if (x === MULLION) continue;
            s.px(x, y, '#c8f2ff14');
        }
    }
    for (const x0 of [WIN.x + 2, MULLION + 2]) {
        s.px(x0, WIN.y + 4, '#ffffff66');
        s.px(x0 + 1, WIN.y + 3, '#ffffff66');
        s.px(x0 + 2, WIN.y + 2, '#ffffff66');
        s.px(x0, WIN.y + 6, '#ffffff40');
        s.px(x0 + 1, WIN.y + 5, '#ffffff40');
    }
}

function backLayer(s) {
    // the wall behind the passengers
    s.rect(WIN.x, WIN.y, WIN.w + 1, FLOOR_Y - WIN.y, WALL.b);
    s.hline(WIN.x, WIN.x + WIN.w, WIN.y, WALL.d1);
    // tiger-striped bench seat with a backrest (visible through the window)
    const seatTop = PANEL_Y - 8;
    s.rect(WIN.x + 1, seatTop, WIN.w - 1, 12, ORANGE.b);
    s.hline(WIN.x + 1, WIN.x + WIN.w - 1, seatTop, ORANGE.l1);
    for (let x = WIN.x + 2; x < WIN.x + WIN.w - 1; x += 4) {
        s.line(x, seatTop + 1, x + 1, seatTop + 4, STRIPE);
        s.px(x + 2, seatTop + 2, STRIPE);
        s.line(x + 1, seatTop + 6, x, seatTop + 8, STRIPE);
    }
    // a small warm lamp hanging from the ceiling
    s.vline(33, WIN.y, WIN.y + 2, WALL.d1);
    s.px(33, WIN.y + 3, '#ffd56a');
    s.px(32, WIN.y + 3, '#ffb347');
    s.px(34, WIN.y + 3, '#ffb347');
}

function pylonTop(s) {
    // cross-arm with the sheave wheel the cable runs over (cable at y = 3)
    s.rect(2, 4, 18, 3, STEEL.d1);
    s.hline(2, 19, 4, STEEL.b);
    s.circle(10, 3, 3, STEEL.d2);
    s.circle(10, 3, 1, STEEL.b);
    s.rect(8, 7, 5, 5, STEEL.d1);
    s.vline(8, 7, 11, STEEL.b);
    // star lamp
    s.px(10, 13, '#ffe36a');
}

function pylonMid(s) {
    // a lattice segment that repeats down to the ground
    s.vline(2, 0, 7, STEEL.b);
    s.vline(8, 0, 7, STEEL.d1);
    s.line(3, 0, 7, 4, STEEL.d1);
    s.line(7, 4, 3, 7, STEEL.d2);
    s.px(3, 0, STEEL.l1);
}

function pylonBase(s) {
    s.poly([[3, 0], [9, 0], [12, 7], [0, 7]], STEEL.d1);
    s.hline(3, 9, 0, STEEL.b);
    s.rect(0, 6, 13, 2, STEEL.d2);
}

export default [
    {
        name: 'gondola-back',
        sheet: 'characters',
        w: GW,
        h: GH,
        anchor: ANCHOR,
        outline: false,
        anims: { idle: [(s) => backLayer(s)] }
    },
    {
        name: 'gondola-front',
        sheet: 'characters',
        w: GW,
        h: GH,
        anchor: ANCHOR,
        outline: 'auto',
        anims: {
            idle: [0, 1].map((f) => (s) => {
                hanger(s, f);
                roof(s);
                frame(s);
                panel(s);
                glass(s);
                s.point('mira', 17, PANEL_Y + 6);
                s.point('nova', 35, PANEL_Y - 2);
            })
        }
    },
    { name: 'pylon-top', sheet: 'characters', w: 21, h: 15, anchor: [10, 3], anims: { idle: [(s) => pylonTop(s)] } },
    { name: 'pylon-mid', sheet: 'characters', w: 11, h: 8, anchor: [5, 0], outline: false, anims: { idle: [(s) => pylonMid(s)] } },
    { name: 'pylon-base', sheet: 'characters', w: 13, h: 8, anchor: [6, 7], anims: { idle: [(s) => pylonBase(s)] } }
];
