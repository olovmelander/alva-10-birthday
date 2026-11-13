/*
 * Äventyr 3: De försvunna stjärnorna – the world (docs/skoldhast/adventure-3.md, section 8).
 * Five side-view pages in horse lengths (1 HL = 200 world units, y down, the ground near y = 0),
 * in the shapes src/sim.mjs moves on (that file is never changed: what space needs is done in
 * game.mjs, the adventure's own step wrapper):
 *
 *   mane    Månen, west → east: Västra kanten · Landningsplatsen (the rocket) · Novas krater
 *           (Hyllan and the cereal box, M1) · Hoppfälten · Djupa kratern (M2) · Nattsidan (M3) ·
 *           Kanten (the ledge, M4) · Spiran and Utsikten (M5). Low gravity.
 *   stjarn  Stjärnbildsfältet: Hamnstenen · Karlavagnen (S1) · Orions bälte (S2) · Stora björnen
 *           (S3) · Pips omlopp (S4). No up or down: one space volume.
 *   ring    Ringplaneten: Isbryggan · Grusregnet (R1) · Slungan (R2) · Skuggsidan (R3) ·
 *           Kometens bana and Rastplatsen (R4) · Luckan (R5). The ring goes round: east wraps to west.
 *   sudd    Det vita hålet: Kanten av himlen · Märkena (V1) · Blyertsdimman (V2) · Sista bron (V3) ·
 *           Smulhögen (V4, V5). One way.
 *   vinter  Vintergatan: Kometens svans, 165 lengths, galloped from the tip to the head (G1, F1).
 *
 * Additions to the sim's shapes (game.mjs and puzzles.mjs give them life):
 *   gravity    0.4 on the Moon: a jump goes two and a half times as high and as far (rule 2)
 *   waters[].kind 'space'  a volume without up or down; `swim: false` so one stands on asteroids
 *   carries    a still, hidden shell taken along a path: Nova's beam, Pip's orbit, Kometen's lane,
 *              the slingshot, the catch (rule 4 and section 3.5)
 *   showers    gravel showers on the ring, as Äventyr 2's gusts
 *   lights     the ten star-lights and how each is earned
 *   hop: true  on an edge: it refuses a walk off, never a jump (the Moon's jumps are long)
 */
import { HL } from '../../../src/sim.mjs';

const h = (v) => v * HL;
const L = (...pts) => pts.map(([x, y]) => [h(x), h(y)]);

export const LIGHT_TOTAL = 10;
export const LIGHT_IDS = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10'];
/** Lights per page, for the tests and the notebook's chart. */
export const LIGHTS_ON = { mane: ['l1', 'l2', 'l3'], stjarn: ['l4', 'l5', 'l6'], ring: ['l7', 'l8', 'l9'], sudd: ['l10'] };
/** The ten stars' places in the sky above Nova's crater (the finale): numbered dots of the constellation Sköldhästen,
 *  in a box of unit size (the view and the drawing place it). A horse in front, a shell behind, four legs. */
export const CONSTELLATION = [
    [0.92, 0.18], [0.78, 0.30], [0.62, 0.36], [0.44, 0.26], [0.22, 0.34],
    [0.10, 0.55], [0.26, 0.74], [0.46, 0.62], [0.66, 0.74], [0.80, 0.56]
];

export const SCENES = {};

// ===========================================================================
// MÅNEN
// ===========================================================================
const moonWhole = (F) => !F.has('moon_bitten') || F.has('moon_whole');
SCENES.mane = {
    id: 'mane',
    sky: 'moon',
    gravity: 0.4,
    bounds: { x0: h(-16), x1: h(101), y0: h(-14), y1: h(6.5) },
    surfaces: [
        // Västra kanten: the Moon's rim, the best view of the stars; bitten in the climax, drawn whole again (F2)
        { id: 'rim', pts: L([-15.6, -1.7], [-12, -1.45], [-8, -0.95], [-4, -0.42], [0, 0]), mat: 'moon', when: moonWhole },
        { id: 'landing', pts: L([0, 0], [4, 0.04], [8, 0.06]), mat: 'moon' },
        // Novas krater: a shallow hollow with her bed, and Hyllan, the shelf with the cereal box (M1)
        { id: 'crater', pts: L([8, 0.06], [9.6, 0.32], [12, 0.48], [14.2, 0.4], [15.82, 0.27], [17.9, 0.1], [20, 0]), mat: 'moon' },
        { id: 'shelf', pts: L([15.82, -1.2], [17.9, -1.2]), mat: 'moonrock', rock: true, shelf: true },
        // Hoppfälten: three rifts and low rocks to bound between (free play with the new jump)
        { id: 'jumps', pts: L([20, 0], [21.9, -0.05], [22.05, 0.9], [26.35, 0.9], [26.5, -0.05], [28.4, 0], [28.55, 0.9], [33.85, 0.9], [34, 0], [35.9, -0.1], [36.05, 0.9], [41.95, 0.9], [42.1, 0], [44, 0]), mat: 'moon' },
        { id: 'rockA', pts: L([26.9, -0.95], [28.0, -0.95]), mat: 'moonrock', rock: true },
        { id: 'rockB', pts: L([34.4, -1.15], [35.5, -1.15]), mat: 'moonrock', rock: true },
        { id: 'rockC', pts: L([38.5, -1.7], [39.7, -1.7]), mat: 'moonrock', rock: true },
        // Djupa kratern: walls too high even for a Moon jump; the beam lifts a still shell out (M2)
        { id: 'deepRimW', pts: L([44, 0], [45.7, 0.05]), mat: 'moon' },
        { id: 'deep', pts: L([45.7, 4], [50, 4.02], [54.3, 4]), mat: 'moon', crater: true },
        { id: 'deepRimE', pts: L([54.3, 0.05], [56, 0]), mat: 'moon' },
        // Nattsidan: two pits and a ridge in the dark (M3); the pits' floors are never meant to be reached
        { id: 'night', pts: L([56, 0], [60.05, 0.05]), mat: 'moon', dark: true },
        { id: 'pit1', pts: L([60.05, 3.2], [62.45, 3.2]), mat: 'moon', hidden: true },
        { id: 'night2', pts: L([62.45, 0.05], [65, -0.4], [66.5, -0.9], [67.5, -0.95], [68.5, -0.5], [69.55, -0.3]), mat: 'moon', dark: true },
        { id: 'pit2', pts: L([69.55, 3.2], [71.95, 3.2]), mat: 'moon', hidden: true },
        { id: 'night3', pts: L([71.95, 0], [76, 0]), mat: 'moon', dark: true },
        // Kanten: the Moon's edge, loose rocks in a staircase up to Spiran, and under an overhang the ledge (M4)
        { id: 'edge', pts: L([76, 0], [80, -0.15], [86, -0.1], [92, 0], [100.6, 0]), mat: 'moon' },
        { id: 'stair1', pts: L([82.5, -1.3], [83.9, -1.3]), mat: 'moonrock', rock: true },
        { id: 'stair2', pts: L([84.9, -2.6], [86.1, -2.6]), mat: 'moonrock', rock: true },
        { id: 'stair3', pts: L([86.8, -3.9], [88.2, -3.9]), mat: 'moonrock', rock: true },
        { id: 'ledge', pts: L([88.6, -2.2], [89.6, -2.2]), mat: 'moonrock', rock: true, ledge: true },
        { id: 'stair4', pts: L([90.2, -5.2], [91.4, -5.2]), mat: 'moonrock', rock: true },
        { id: 'stair5', pts: L([92.6, -6.5], [93.8, -6.5]), mat: 'moonrock', rock: true },
        // Spiran's top: Utsikten (M5)
        { id: 'spire', pts: L([95.0, -7.8], [96.4, -7.85], [99.6, -7.8]), mat: 'moonrock', rock: true, spire: true }
    ],
    walls: [
        { id: 'west-paper', x: h(-15.5), y0: h(-8), y1: h(2), balk: 'paper' },
        { id: 'east-paper', x: h(100.5), y0: h(-12), y1: h(2), balk: 'paper' },
        // Hyllan is a block of rock: walked into, it is a wall; a Moon jump goes up onto it
        { id: 'shelf-w', x: h(15.84), y0: h(-1.15), y1: h(0.6) },
        { id: 'shelf-e', x: h(17.88), y0: h(-1.15), y1: h(0.6) },
        // Djupa kratern: walls too high even for a Moon jump (a walk off the rim falls in)
        { id: 'deep-w', x: h(45.73), y0: h(0.12), y1: h(4.1) },
        { id: 'deep-e', x: h(54.27), y0: h(0.12), y1: h(4.1) }
    ],
    edges: [
        // Nova does not follow, lift or point before breakfast (M1 gates everything)
        { id: 'breakfast-gate', x: h(19.4), y: h(0.02), dir: 1, kind: 'balk', reason: 'breakfast', dy: 90, when: '!breakfast' },
        // Nattsidan: the sköldhäst will not walk on where it cannot see (lit while Nova is angry: game.mjs)
        ...[59.6, 63.2, 66.0, 69.1, 72.8].map((x, i) => ({ id: 'dark' + i, x: h(x), y: 0, dy: h(1.5), dir: 1, kind: 'balk', reason: 'dark', hop: false, when: '!novaLit' })),
        // a walk off the top of the third rock would only drop it onto the ledge: it refuses; a jump floats past
        { id: 'stair3-end', x: h(88.15), y: h(-3.9), dir: 1, kind: 'balk', reason: 'float', dy: 60, hop: true },
        // the other stairs: a sköldhäst landed with the stick still held would gallop off the far end and fall to the
        // ground; it stops there instead, facing the next rock (a jump goes; the way down is the near end)
        ...[['stair1', 83.85, -1.3], ['stair2', 86.05, -2.6], ['stair4', 91.35, -5.2], ['stair5', 93.75, -6.5]]
            .map(([id, x, y]) => ({ id: id + '-end', x: h(x), y: h(y), dir: 1, kind: 'balk', reason: 'step', dy: 60, hop: true }))
    ],
    dashed: [
        // F2: the bitten rim, a dashed arc where the Moon's edge used to be (drawn east → west from the landing)
        { id: 'rimArc', pts: L([-15.6, -1.7], [-12, -1.45], [-8, -0.95], [-4, -0.42], [0, 0]), flag: 'moon_whole', dir: -1, when: 'moon_bitten', sketch: { mat: 'moon' } }
    ],
    spots: {
        start: { x: h(5.6), y: h(0.04), facing: 1 },
        dock: { x: h(5.6), y: h(0.04), facing: 1 },
        rocket: { x: h(3.2), y: h(0.04) },
        novaBed: { x: h(12.2), y: h(0.48) },
        kloStart: { x: h(7.0), y: h(0.05) },
        shelf: { x: h(17.2), y: h(-1.2) },
        deepWest: { x: h(44.2), y: h(0) },
        deepFloor: { x: h(50), y: h(4) },
        nightStart: { x: h(56.4), y: h(0) },
        face: { x: h(64.6), y: h(-0.28) },
        edgeStart: { x: h(77), y: h(-0.04) },
        view: { x: h(97.2), y: h(-7.83) },
        rimLanding: { x: h(1.4), y: h(0.01), facing: -1 },
        rimMid: { x: h(-7), y: h(-0.85) },
        home: { x: h(10.4), y: h(0.38), facing: 1 }
    },
    areas: [
        { id: 'westRim', x0: h(-16), x1: h(-0.2) },
        { id: 'landing', x0: h(-0.2), x1: h(8) },
        { id: 'crater', x0: h(8), x1: h(20) },
        { id: 'jumps', x0: h(20), x1: h(44) },
        { id: 'deep', x0: h(44), x1: h(56) },
        { id: 'night', x0: h(56), x1: h(76) },
        { id: 'edge', x0: h(76), x1: h(95.0) },
        { id: 'view', x0: h(95.0), x1: h(101), y1: h(-7.2) }
    ],
    // over the ledge at Kanten a jump cannot be steered: it floats past, and only a hidden shell drops onto it (M4)
    noSteer: [[h(88.2), h(90.2)]],
    // the cereal box on Hyllan (M1): pushed west off the shelf it sinks slowly down to Nova's bed
    box: { x0: h(16.3), y: h(-1.2), push: { min: h(0.3), max: h(1.05) }, step: h(0.45), edge: h(15.95), fallTo: { x: h(12.9), y: h(0.46) }, fallSeconds: 2.6 },
    // Nattsidan: the dark, lit while Nova's lamps are red
    dark: { x0: h(56.6), x1: h(76), flag: 'novaLit', seconds: 4, reach: h(3), minSpeed: 900 },
    lights: [
        { id: 'l1', x: h(50.2), y: h(3.95), how: 'touch' },
        { id: 'l2', x: h(67.0), y: h(-0.95), how: 'touch' },
        { id: 'l3', x: h(89.1), y: h(-2.2), how: 'touch', when: 'm4_drop' }
    ],
    carries: [
        // Nova's beam (M2, M4): a still, hidden shell on a ring of light is lifted along a short path
        { id: 'beamDeepW', kind: 'beam', spot: { x: h(46.8), y: h(4.0) }, needs: 'breakfast', path: L([46.7, 4.0], [46.2, 1.5], [45.3, -0.6], [44.4, -0.25], [44.2, 0]) },
        { id: 'beamDeepE', kind: 'beam', spot: { x: h(53.3), y: h(4.0) }, needs: 'breakfast', path: L([53.3, 4.0], [53.8, 1.5], [54.7, -0.6], [55.6, -0.25], [55.8, 0]) },
        { id: 'beamLedge', kind: 'beam', spot: { x: h(89.1), y: h(-2.2) }, needs: 'breakfast', path: L([89.1, -2.2], [89.0, -3.5], [88.3, -4.5], [87.6, -4.15], [87.4, -3.9]) },
        { id: 'beamBelow', kind: 'beam', spot: { x: h(91.4), y: h(0) }, needs: 'breakfast', path: L([91.4, 0], [91.2, -2.5], [89.6, -4.6], [88.0, -4.2], [87.6, -3.9]) }
    ],
    rocketAt: { x: h(3.2), y: h(0.04) },
    exits: []
};

// ===========================================================================
// STJÄRNBILDSFÄLTET
// ===========================================================================
// Karlavagnen's seven stars: three in the shaft, four in the box (S1)
const WAGON_STARS = L([9.5, -0.42], [12.0, -1.0], [14.6, -1.32], [17.2, -2.45], [19.0, -0.55], [24.0, -0.35], [26.0, -2.25]);
SCENES.stjarn = {
    id: 'stjarn',
    sky: 'space',
    bounds: { x0: h(-4), x1: h(94), y0: h(-12), y1: h(8) },
    surfaces: [
        // Hamnstenen, where the rocket docks
        { id: 'dock', thin: true, pts: L([-2, 0], [3, -0.06], [8, 0]), mat: 'asteroid', asteroid: true },
        { id: 'wagon', thin: true, pts: [[h(8), 0], ...WAGON_STARS], mat: 'starline', starline: true, when: 'wagon_drawn' },
        // the rock the wagon brings everyone to, beside Orions bälte
        { id: 'beltRock', thin: true, pts: L([32.4, 0.1], [35.6, 0.05]), mat: 'asteroid', asteroid: true },
        // Orions bälte: three star-stones in a row, 3 lengths apart (S2)
        { id: 'belt1', thin: true, pts: L([37.3, -1.2], [38.7, -1.2]), mat: 'starstone', belt: 'b1' },
        { id: 'belt2', thin: true, pts: L([40.3, -1.55], [41.7, -1.55]), mat: 'starstone', belt: 'b2' },
        { id: 'belt3', thin: true, pts: L([43.3, -1.2], [44.7, -1.2]), mat: 'starstone', belt: 'b3' },
        // a rock at the sleeping bear's tail
        { id: 'bearRock', thin: true, pts: L([48.2, 1.05], [51.2, 0.95]), mat: 'asteroid', asteroid: true },
        // Stora björnen: his back is a slope of star-lines up to his head (S3)
        { id: 'bearBack', thin: true, pts: L([51.2, 0.95], [54, 0.3], [57, -0.5], [60, -1.3], [63, -2.15], [66, -2.9], [67.6, -3.15]), mat: 'starline', starline: true, bear: true },
        { id: 'bearNoseLine', thin: true, pts: L([67.6, -3.15], [69, -3.12], [70.6, -2.95]), mat: 'starline', starline: true, when: 'bear_nose' },
        // where the bear sets them down, and Pip's small dark rock (S4)
        { id: 'pipArrive', thin: true, pts: L([72.6, 0.55], [75.8, 0.5]), mat: 'asteroid', asteroid: true },
        { id: 'pipRock', thin: true, pts: L([80.1, -0.35], [81.9, -0.35]), mat: 'asteroid', asteroid: true, dark: true },
        // a hidden floor far below: a jump keeps its way even over open space (sim.mjs stepAir)
        { id: 'deepFloor', pts: L([-4, 7.6], [94, 7.6]), hidden: true }
    ],
    walls: [
        { id: 'west-paper', x: h(-3.8), y0: h(-14), y1: h(9), balk: 'paper' },
        { id: 'east-paper', x: h(93.8), y0: h(-14), y1: h(9), balk: 'paper' }
    ],
    edges: [],
    dashed: [
        { id: 'wagonLine', pts: [[h(8), 0], ...WAGON_STARS], flag: 'wagon_drawn', stars: WAGON_STARS, sketch: { mat: 'starline' } },
        { id: 'bearNose', pts: L([67.6, -3.15], [69, -3.12], [70.6, -2.95]), flag: 'bear_nose', sketch: { mat: 'starline' } }
    ],
    waters: [{ id: 'space', x0: h(-4), x1: h(94), top: h(-200), kind: 'space', swim: false }],
    spots: {
        start: { x: h(4.6), y: h(-0.04), facing: 1 },
        dock: { x: h(4.6), y: h(-0.04), facing: 1 },
        rocket: { x: h(1.6), y: h(-0.05) },
        beltRock: { x: h(34.2), y: h(0.07), facing: 1 },
        bearRock: { x: h(49.4), y: h(1.02), facing: 1 },
        bearHead: { x: h(67.2), y: h(-3.1) },
        pipArrive: { x: h(74), y: h(0.52), facing: 1 },
        pip: { x: h(81), y: h(-0.7) }
    },
    areas: [
        { id: 'dock', x0: h(-4), x1: h(8) },
        { id: 'wagon', x0: h(8), x1: h(31) },
        { id: 'belt', x0: h(31), x1: h(47) },
        { id: 'bear', x0: h(47), x1: h(72) },
        { id: 'pip', x0: h(72), x1: h(94) }
    ],
    // S2: the order Nova's lamps blink: middle, left, right
    belt: { order: ['b2', 'b1', 'b3'], stones: { b1: 'belt1', b2: 'belt2', b3: 'belt3' }, flag: 'belt_lit' },
    bear: { stars: null }, // the view places his figure round bearBack
    // S4: Pip tumbles round his rock in a lane of pull
    orbit: { x: h(81), y: h(-0.55), r: h(3.0), width: h(1.5), speed: 1.05, pipSpeed: -0.55 },
    lights: [
        { id: 'l4', x: h(41.0), y: h(-0.75), how: 'belt', when: 'belt_lit' },
        { id: 'l5', x: h(60.2), y: h(1.4), how: 'given' },
        { id: 'l6', x: h(81), y: h(-3.55), how: 'given' }
    ],
    carries: [
        // Pip's orbit (S4): a hidden shell in the lane goes round, meets Pip, and is set down on the rock
        { id: 'orbit', kind: 'orbit', ring: { x: h(81), y: h(-0.55), r: h(3.0), width: h(1.9) }, turns: 0.85, speed: 1.15,
            end: { x: h(81), y: h(-0.4), mode: 'ground', unhide: true } }
    ],
    // a swimmer in Pip's lane is too light: it kicks itself out (rule 4)
    pushes: [{ id: 'orbit-kick', kind: 'ring', x: h(81), y: h(-0.55), r: h(3.0), band: h(0.7), speed: 520, when: '!pip_met' }],
    rocketAt: { x: h(1.6), y: h(-0.05) },
    exits: []
};

// ===========================================================================
// RINGPLANETEN
// ===========================================================================
SCENES.ring = {
    id: 'ring',
    sky: 'ring',
    bounds: { x0: h(-4), x1: h(95), y0: h(-9), y1: h(8) },
    surfaces: [
        { id: 'icedock', pts: L([-3.6, 0], [3, -0.04], [8, 0]), mat: 'ice' },
        // Grusregnet: the ring, with blocks of ice to shelter behind (R1)
        { id: 'gravelRing', pts: L([8, 0], [14, -0.05], [20, 0], [26, -0.04], [30, 0]), mat: 'ice' },
        // Skuggsidan, in the planet's shadow; the ice block and the line where the sun begins (R3)
        { id: 'shade', pts: L([44, 0], [50, -0.04], [56, 0], [63, 0]), mat: 'ice' },
        // Rastplatsen, where Kometen pauses each lap (R4)
        { id: 'rest', pts: L([70, 0], [73, -0.04], [76.5, 0]), mat: 'ice' },
        { id: 'gapIce', pts: L([76.5, 0], [78.5, -0.45], [81, -0.6], [83.5, -0.4], [85.5, 0]), mat: 'ice', thin: true, when: 'gap_drawn' },
        // the last floe beyond Luckan (R5)
        { id: 'lastFloe', pts: L([85.5, 0], [89, -0.04], [93.6, 0]), mat: 'ice' },
        { id: 'deepFloor', pts: L([-4, 7.6], [95, 7.6]), hidden: true }
    ],
    walls: [
        { id: 'west-paper', x: h(-3.5), y0: h(-8), y1: h(2), balk: 'paper' }
    ],
    edges: [],
    dashed: [
        // Luckan: a gap in the ring, rubbed out; the hooves draw the ice back between two showers (R5)
        { id: 'gapArc', pts: L([76.5, 0], [78.5, -0.45], [81, -0.6], [83.5, -0.4], [85.5, 0]), flag: 'gap_drawn', bothWays: true, sketch: { mat: 'ice' } }
    ],
    waters: [
        // space under the ring's end (Slungan) and where Kometen's lane crosses (Kometens bana)
        { id: 'slingSpace', x0: h(30.15), x1: h(43.85), top: h(0.35), kind: 'space', swim: false },
        { id: 'cometSpace', x0: h(63.15), x1: h(69.85), top: h(0.35), kind: 'space', swim: false }
    ],
    spots: {
        start: { x: h(4.4), y: h(-0.04), facing: 1 },
        dock: { x: h(4.4), y: h(-0.04), facing: 1 },
        rocket: { x: h(1.4), y: h(-0.03) },
        ringEnd: { x: h(28.6), y: h(0), facing: 1 },
        slingLand: { x: h(45.4), y: h(-0.01), facing: 1 },
        cometEdge: { x: h(61.8), y: h(0), facing: 1 },
        rest: { x: h(72.6), y: h(-0.03), facing: 1 },
        lastFloe: { x: h(88.4), y: h(-0.03), facing: 1 },
        wrapIn: { x: h(-2.4), y: h(0), facing: 1 }
    },
    areas: [
        { id: 'icedock', x0: h(-4), x1: h(8) },
        { id: 'gravel', x0: h(8), x1: h(30) },
        { id: 'sling', x0: h(30), x1: h(44) },
        { id: 'shade', x0: h(44), x1: h(62.5) },
        { id: 'cometLane', x0: h(62.5), x1: h(76) },
        { id: 'gap', x0: h(76), x1: h(95) }
    ],
    // gravel showers sweep the ring every few seconds: a warning glimmer, then the shower (R1, R5)
    showers: [
        { id: 'gravelA', x0: h(9), x1: h(29.6), period: 5, shower: 1.7, warn: 0.8, phase: 0, strength: 900,
            shelter: [[h(11.6), h(13.1)], [h(17.6), h(19.1)], [h(23.6), h(25.1)]], blocks: [h(13.3), h(19.3), h(25.3)] },
        { id: 'gravelGap', x0: h(75), x1: h(86.5), period: 5, shower: 1.7, warn: 0.8, phase: 2.2, strength: 900, shelter: [], blocks: [] }
    ],
    // R3: the ice block with the star-light in it, pushed east into the sun
    ice: { x0: h(47.2), step: h(0.45), sunX: h(55.6), melt: 1.6, push: { min: h(0.3), max: h(1.05) }, y: h(-0.04), flag: 'ice_melted' },
    // R4: Kometen laps the planet and rests a breath at Rastplatsen
    comet: { period: 7.0, rest: 2.2, restAt: { x: h(74.4), y: h(-1.1) } },
    lights: [
        { id: 'l7', x: h(55.9), y: h(-0.3), how: 'melt', when: 'ice_melted' },
        { id: 'l8', x: h(74.4), y: h(-1.0), how: 'tail' },
        { id: 'l9', x: h(89.4), y: h(-0.32), how: 'touch' }
    ],
    carries: [
        // R2: three lanes of pull off the ring's end. The low and the high bend back; the middle one (pink crumbs)
        // slings the shell round the planet to Skuggsidan. A swimmer is kicked out (pushes below).
        { id: 'slingLow', kind: 'sling', zone: { x0: h(30.2), x1: h(32.3), y0: h(0.35), y1: h(6) }, back: true,
            path: L([31.2, 1.2], [30.2, 2.4], [28.9, 1.6], [28.6, 0]), end: { x: h(28.6), y: h(0), mode: 'ground', unhide: true } },
        { id: 'slingMid', kind: 'sling', zone: { x0: h(32.3), x1: h(36.6), y0: h(0.35), y1: h(6) }, go: true,
            path: L([34.2, 1.0], [37.5, 2.6], [41, 2.2], [44.4, -0.8], [45.4, 0]), end: { x: h(45.4), y: h(0), mode: 'ground', unhide: true } },
        { id: 'slingHigh', kind: 'sling', zone: { x0: h(36.6), x1: h(41.4), y0: h(0.35), y1: h(6) }, back: true,
            path: L([38.6, 1.0], [36, 3.0], [31, 2.6], [29, 1.0], [28.6, 0]), end: { x: h(28.6), y: h(0), mode: 'ground', unhide: true } },
        // home again from Skuggsidan: off its west end, a lane back to the ring's end
        { id: 'slingHome', kind: 'sling', zone: { x0: h(41.4), x1: h(43.85), y0: h(0.35), y1: h(6) }, back: true, home: true,
            path: L([42.6, 1.0], [40, 3.0], [34, 3.2], [29.4, 1.2], [28.6, 0]), end: { x: h(28.6), y: h(0), mode: 'ground', unhide: true } },
        // R4: Kometen's lane carries a hidden shell to Rastplatsen
        { id: 'cometLane', kind: 'lane', zone: { x0: h(63.15), x1: h(66.5), y0: h(0.35), y1: h(6) },
            path: L([64.5, 1.2], [66.5, 2.2], [68.6, 1.6], [69.8, 0.5], [70.6, 0]), end: { x: h(70.8), y: h(0), mode: 'ground', unhide: true } }
    ],
    // in space round the ring a swimmer is pulled back up to the ice it fell from
    pulls: [
        { id: 'slingPull', x0: h(30.15), x1: h(43.85), to: (x) => (x < h(37) ? 'ringEnd' : 'slingLand'), after: 1.4 },
        { id: 'cometPull', x0: h(63.15), x1: h(69.85), to: () => 'cometEdge', after: 1.4, when: '!comet_rest' }
    ],
    rocketAt: { x: h(1.4), y: h(-0.03) },
    exits: [
        // the ring goes round the planet: on past the last floe, and you are back at Isbryggan
        { id: 'wrap', x0: h(93.2), x1: h(95), to: 'ring', spawn: 'wrapIn', auto: true, dir: 1 }
    ]
};

// ===========================================================================
// DET VITA HÅLET
// ===========================================================================
// V1: dents in the paper where lines used to be: dashed, and drawn under galloping hooves
const DENTS = [
    { id: 'dent1', pts: L([8, 0], [10, -0.25], [12, -0.4], [14, -0.5]) },
    { id: 'dent2', pts: L([14, -0.5], [16, -0.15], [18, -0.3], [20.2, -0.65]) },
    { id: 'dent3', pts: L([20.2, -0.65], [22.4, -1.15], [24.4, -1.05], [26.2, -0.9]) },
    { id: 'dent4', pts: L([26.2, -0.9], [28.2, -0.55], [30.6, -0.42]) }
];
// V2: in the fog the dents cannot be seen until Klo's seed lights them
const FOG = [
    { id: 'fogd1', lit: 'fog1_lit', pts: L([30.6, -0.42], [32.4, -0.85], [34.2, -0.95], [35.4, -0.78]) },
    { id: 'fogd2', lit: 'fog2_lit', pts: L([35.4, -0.78], [37.6, -0.3], [39.4, -0.36], [40.8, -0.52]) },
    { id: 'fogd3', lit: 'fog3_lit', pts: L([40.8, -0.52], [42.8, -0.2], [44.6, -0.06], [45.8, 0]) }
];
SCENES.sudd = {
    id: 'sudd',
    sky: 'white',
    bounds: { x0: h(-4), x1: h(82), y0: h(-11), y1: h(6) },
    surfaces: [
        // Kanten av himlen: the last dark ground
        { id: 'skyEdge', pts: L([-3.6, 0], [3, -0.05], [8, 0]), mat: 'night' },
        ...DENTS.map(d => ({ id: d.id + 's', thin: true, pts: d.pts, mat: 'dent', when: d.id })),
        ...FOG.map(d => ({ id: d.id + 's', thin: true, pts: d.pts, mat: 'dent', when: d.id })),
        // the start of Sista bron, with its ring of light (V3)
        { id: 'bridgeStart', pts: L([45.8, 0], [47.0, 0]), mat: 'dent', thin: true, ledge: true },
        // Smulhögen: a hill of pink crumbs at the far edge of the white (V4, V5)
        { id: 'crumbs', pts: L([61.2, 0.15], [64, -0.3], [68, -1.15], [72, -1.6], [75, -1.4], [78, -0.85], [81.6, -0.6]), mat: 'crumbs' },
        { id: 'deepFloor', pts: L([-4, 5.6], [82, 5.6]), hidden: true }
    ],
    walls: [
        { id: 'west-paper', x: h(-3.5), y0: h(-8), y1: h(2), balk: 'paper' },
        { id: 'east-paper', x: h(81.5), y0: h(-8), y1: h(2), balk: 'paper' }
    ],
    edges: [
        // in the fog there is nothing to stand on that can be seen: no hoof goes on until the seed lights the dents
        ...FOG.map(d => ({ id: 'fogEdge-' + d.id, x: d.pts[0][0], y: d.pts[0][1], dir: 1, kind: 'balk', reason: 'fog', dy: 70, when: '!' + d.lit })),
        // Sista bron, once Suddet will not let it be drawn: the ring of light is the way
        { id: 'bridgeEdge', x: h(47.0), y: 0, dir: 1, kind: 'balk', reason: 'rubbed', dy: 70, when: 'bridge_refused' }
    ],
    dashed: [
        ...DENTS.map(d => ({ id: d.id, pts: d.pts, flag: d.id, sketch: { mat: 'dent' } })),
        ...FOG.map(d => ({ id: d.id, pts: d.pts, flag: d.id, inkWhen: d.lit, fog: d.lit, sketch: { mat: 'dent' } })),
        // V3: Sista bron, one long dashed line that Suddet rubs out behind every gallop
        { id: 'lastBridge', pts: L([47.0, 0], [50.5, -0.35], [54, -0.5], [57.5, -0.35], [61.2, 0.15]), flag: 'bridge_drawn', when: '!bridge_refused', rub: true, sketch: { mat: 'dent' } }
    ],
    spots: {
        start: { x: h(4.2), y: h(-0.04), facing: 1 },
        whiteEdge: { x: h(4.2), y: h(-0.04), facing: 1 },
        rocket: { x: h(1.6), y: h(-0.04) },
        fog: { x: h(30.2), y: h(-0.43), facing: 1 },
        bridgeStart: { x: h(46.3), y: h(0), facing: 1 },
        crumbs: { x: h(63.4), y: h(-0.25), facing: 1 },
        suddRim: { x: h(73.2), y: h(-1.55) },
        moon: { x: h(76), y: h(-7.5) }
    },
    areas: [
        { id: 'whiteEdge', x0: h(-4), x1: h(8) },
        { id: 'marks', x0: h(8), x1: h(30.4) },
        { id: 'fog', x0: h(30.4), x1: h(46) },
        { id: 'lastBridge', x0: h(46), x1: h(61.2) },
        { id: 'crumbs', x0: h(61.2), x1: h(82) },
        // near the top of the hill, below Suddet at the Moon's rim: where the climax begins (all of them in one picture)
        { id: 'crumbsTop', x0: h(68.4), x1: h(82) }
    ],
    // V2: hide, wait, and the seed lights the next dents (three times)
    fogGroups: FOG.map((d, i) => ({ id: d.id, flag: d.lit, n: i + 1, x0: d.pts[0][0] - h(2.6), x1: d.pts[0][0] + h(0.3), seconds: 2.2 })),
    // V3: Suddet rubs the bridge out when the hooves have drawn it this far; twice, then the beam
    bridge: { dashed: 'lastBridge', rubAt: 0.55, times: 2, flag: 'bridge_refused', back: { x: h(46.3), y: h(0) } },
    // Suddet keeps ahead in the white: it waits at the far end of each stretch (section 18.2, item 19)
    suddWaits: [h(30.6), h(46), h(61.6), h(73.2)],
    lights: [{ id: 'l10', x: h(73.6), y: h(-2.2), how: 'trace' }],
    carries: [
        { id: 'beamBridge', kind: 'beam', spot: { x: h(46.4), y: h(0) }, needs: 'bridge_refused',
            path: L([46.4, 0], [48.5, -2.4], [54, -3.4], [59.5, -2.2], [62.6, -0.1]), end: { x: h(62.8), y: h(-0.12), mode: 'ground', unhide: true } }
    ],
    rocketAt: { x: h(1.6), y: h(-0.04) },
    exits: []
};

// ===========================================================================
// VINTERGATAN
// ===========================================================================
SCENES.vinter = {
    id: 'vinter',
    sky: 'milky',
    bounds: { x0: h(-30), x1: h(172), y0: h(-16), y1: h(8) },
    surfaces: [
        // Kometens svans: one straight, glowing road across the whole sky, galloped from the tip (east) to the head
        { id: 'tail', pts: L([0, 0], [166, 0]), mat: 'tail', tail: true },
        // a jump from the head that is not caught falls on a lower loop of the tail, which brings it round (F1)
        { id: 'loop', thin: true, pts: L([-16, 3.6], [-1, 3.6]), mat: 'tail', loop: true },
        { id: 'deepFloor', pts: L([-30, 7.6], [172, 7.6]), hidden: true }
    ],
    walls: [{ id: 'east-paper', x: h(167), y0: h(-10), y1: h(2), balk: 'paper' }],
    edges: [],
    dashed: [],
    spots: {
        start: { x: h(163.2), y: 0, facing: -1 },
        tailTip: { x: h(163.2), y: 0, facing: -1 },
        tailMid: { x: h(85), y: 0, facing: -1 },
        cometHead: { x: h(6), y: 0, facing: -1 }
    },
    areas: [
        { id: 'tail', x0: h(8), x1: h(172) },
        { id: 'cometHead', x0: h(-30), x1: h(8) }
    ],
    // where things come into the picture, by how far has been galloped from the tip (section 8.5)
    ride: { tip: h(163.2), head: h(1.0), length: h(162.2),
        marks: [
            { at: h(4), remark: 0 }, { at: h(10), thought: 'ride1' }, { at: h(18), remark: 1 },
            { at: h(32), remark: 2 }, { at: h(50), thought: 'ride2' }, { at: h(64), remark: 3 },
            { at: h(74), remark: 4 }, { at: h(88), remark: 5 }, { at: h(112), thought: 'ride3' }, { at: h(126), remark: 6 }
        ] },
    carries: [
        // F1: Nova catches a hidden shell in the air beyond the comet's head and carries everyone to the Moon
        { id: 'catch', kind: 'catch', air: true, zone: { x0: h(-14), x1: h(-0.4), y0: h(-6), y1: h(3.2) },
            path: L([-3, -0.6], [-10, -5], [-20, -8], [-28, -9]), end: { scene: 'mane', spot: 'rimLanding', mode: 'ground', unhide: true } },
        // a jump that is not hidden lands on the lower loop, and Kometen swings round to the head again
        { id: 'loopBack', kind: 'loop', ground: 'loop', path: L([-8, 3.6], [-12, 2], [-6, -2.5], [4, -1.2], [6, 0]), end: { x: h(6), y: 0, mode: 'ground' } }
    ],
    exits: []
};

/** Every place to start from: a scene and a spot (each stands on ground; section 18.3). */
export const CHECKPOINTS = {
    start: { scene: 'mane', spot: 'start' },
    crater: { scene: 'mane', spot: 'deepWest' },
    night: { scene: 'mane', spot: 'nightStart' },
    edge: { scene: 'mane', spot: 'edgeStart' },
    view: { scene: 'mane', spot: 'view' },
    dock: { scene: 'stjarn', spot: 'dock' },
    belt: { scene: 'stjarn', spot: 'beltRock' },
    bear: { scene: 'stjarn', spot: 'bearRock' },
    pip: { scene: 'stjarn', spot: 'pipArrive' },
    icedock: { scene: 'ring', spot: 'dock' },
    sling: { scene: 'ring', spot: 'ringEnd' },
    shade: { scene: 'ring', spot: 'slingLand' },
    cometLane: { scene: 'ring', spot: 'cometEdge' },
    gap: { scene: 'ring', spot: 'rest' },
    whiteEdge: { scene: 'sudd', spot: 'whiteEdge' },
    fog: { scene: 'sudd', spot: 'fog' },
    lastBridge: { scene: 'sudd', spot: 'bridgeStart' },
    crumbs: { scene: 'sudd', spot: 'crumbs' },
    tailTip: { scene: 'vinter', spot: 'tailTip' },
    tailMid: { scene: 'vinter', spot: 'tailMid' },
    cometHead: { scene: 'vinter', spot: 'cometHead' },
    westRim: { scene: 'mane', spot: 'rimLanding' },
    home: { scene: 'mane', spot: 'home' }
};

/** Pages reachable by the rocket ("Res"), and when (section 8.6). */
export const TRAVEL = [
    { id: 'mane', open: () => true },
    { id: 'stjarn', open: (F) => F.has('fin_drawn') },
    { id: 'ring', open: (F) => F.has('fin_drawn') },
    { id: 'sudd', open: (F, lights) => F.has('ended') || (lights >= 9 && !F.has('rocket_gone')) },
    { id: 'vinter', open: (F) => F.has('ended') }
];
