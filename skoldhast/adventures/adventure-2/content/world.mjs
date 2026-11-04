/*
 * Äventyr 2: Den magiska skogen – the world (docs/skoldhast/adventure-2.md).
 * Two side-view pages in horse lengths (1 HL = 200 world units, y down, the
 * ground near y = -0.6 HL), in the same shapes src/sim.mjs moves on:
 *
 *   strand  Flodstranden, west → east: Klyftan (Mira's dashed rope bridge) ·
 *           Kakaolunden (the cocoa tree, the hollow log) · Sandbanken (the nest) ·
 *           Glimmerfloden (Djuphålan's whirlpool) · Tordyvelbacken · Skatträdet ·
 *           Forsen (the waterfall and the cave behind it)
 *   skog    Djupa skogen, west → east: Jätteträdet (the crown, the cloud) · Ravinen ·
 *           Rutschstammen · Utsiktskullen · Rotgrottan · the bridge's far end
 *
 * Everything a puzzle needs is data here; puzzles.mjs gives it life.
 * Additions to the sim's shapes:
 *   pushes  zones that push a visible swimmer (never a hidden shell): the
 *           waterfall's downpour and the ring round Djuphålan's eye
 *   eggs    where each of the ten eggs is and how it is earned
 */
import { HL } from '../../../src/sim.mjs';

const h = (v) => v * HL;
const L = (...pts) => pts.map(([x, y]) => [h(x), h(y)]);

export const EGG_TOTAL = 10;
export const EGG_IDS = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10'];

export const SCENES = {};

// ===========================================================================
// FLODSTRANDEN
// ===========================================================================
SCENES.strand = {
    id: 'strand',
    bounds: { x0: h(-3), x1: h(96.2), y0: h(-9), y1: h(5.5) },
    sky: 'river',
    surfaces: [
        // Klyftan, and the forest path beyond Mira's rope bridge
        { id: 'klyft-w', pts: L([-3, -0.6], [1.5, -0.6]), mat: 'grass', edgeMat: 'earth' },
        { id: 'klyft-floor', pts: L([1.5, 2.6], [6.5, 2.6]), mat: 'earth', hidden: true },
        { id: 'bridge', thin: true, pts: L([1.5, -0.6], [2.6, -0.52], [4, -0.48], [5.4, -0.52], [6.5, -0.6]), mat: 'wood', bridge: true, rope: true, when: 'p2_bridge' },
        // Kakaolunden
        { id: 'grove', pts: L([6.5, -0.6], [9, -0.63], [12, -0.6], [16, -0.62], [20, -0.6]), mat: 'grass', edgeMat: 'earth' },
        // the hollow log under the cocoa tree: a drum for galloping hooves (P1)
        { id: 'log', thin: true, hollow: true, pts: L([14.3, -0.61], [14.9, -0.86], [18.5, -0.86], [19.1, -0.6]), mat: 'wood', log: true },
        // Sandbanken
        { id: 'sand', pts: L([20, -0.6], [22, -0.5], [26, -0.42], [30, -0.38], [32.5, -0.3]), mat: 'sand' },
        { id: 'bank-w', pts: L([32.5, -0.3], [33.5, 0.08], [34.5, 0.6], [36, 1.6]), mat: 'wetsand' },
        // Glimmerfloden: a bowl deepens to Djuphålan, where the gold coin lies
        {
            id: 'riverbed', underwater: true, pts: L([36, 1.6], [38, 2.5], [40, 3.3], [41.5, 4.3], [42.4, 4.95], [43, 5.2], [43.6, 4.95],
                [44.5, 4.3], [46, 3.3], [48, 2.8], [51, 2.4], [53.5, 1.6], [55, 0.6], [56, 0.1], [57.5, -0.3]), mat: 'riverbed'
        },
        // Tordyvelbacken: the beetle's plateau slopes down to the river
        { id: 'beetle-hill', pts: L([57.5, -0.3], [58.5, -0.48], [59.3, -0.55], [60.6, -1.4], [63.5, -1.45], [65, -0.7], [66, -0.6]), mat: 'grass', edgeMat: 'earth' },
        // Skatträdet: the ground, and branches stepping up to the magpie's nest
        { id: 'skat-ground', pts: L([66, -0.6], [72, -0.62], [75, -0.6]), mat: 'grass', edgeMat: 'earth' },
        { id: 'br1', thin: true, pts: L([67.2, -1.05], [69.6, -1.05]), mat: 'wood', branch: true },
        { id: 'br2', thin: true, pts: L([69.0, -1.5], [71.6, -1.5]), mat: 'wood', branch: true },
        { id: 'br3', thin: true, pts: L([67.6, -1.95], [70.0, -1.95]), mat: 'wood', branch: true },
        { id: 'br4', thin: true, pts: L([69.2, -2.4], [71.8, -2.4]), mat: 'wood', branch: true },
        { id: 'br5', thin: true, pts: L([67.2, -2.85], [70.2, -2.85]), mat: 'wood', branch: true },
        // Forsen: the pool under the waterfall, and the ledge in the cave behind it
        { id: 'fors-shore', pts: L([75, -0.6], [76.5, -0.45], [77.5, 0.0], [78.5, 0.6], [80, 1.8], [82, 2.6]), mat: 'sand' },
        { id: 'pool-bed', underwater: true, pts: L([82, 2.6], [85, 3.0], [87, 3.05], [88.5, 2.6], [89.5, 1.7], [90.5, 0.75], [91.3, 0.05], [92.5, -0.3]), mat: 'riverbed' },
        { id: 'cave-ledge', pts: L([92.5, -0.3], [96.2, -0.32]), mat: 'rock', cave: true }
    ],
    walls: [
        { id: 'west-paper', x: h(-2.9), y0: h(-6), y1: h(1), balk: 'paper' },
        { id: 'cave-back', x: h(95.7), y0: h(-4), y1: h(1.5) }
    ],
    // Skatträdet's branches have no rails: stepping off one only drops to the one below
    edges: [],
    dashed: [
        // P2: the rope bridge Mira drew but did not finish
        { id: 'p2-bridge', pts: L([1.5, -0.6], [2.6, -0.52], [4, -0.48], [5.4, -0.52], [6.5, -0.6]), flag: 'p2_bridge', bothWays: true,
            sketch: { depth: 18, mat: 'wood', planks: 40, rope: true }, mira: true }
    ],
    waters: [
        { id: 'river', x0: h(33.2), x1: h(57.8), top: h(0), kind: 'river' },
        { id: 'pool', x0: h(76.9), x1: h(95.7), top: h(0), kind: 'pool' }
    ],
    lanes: [
        // under the waterfall a current runs along the floor into the cave: it carries only a shell
        { id: 'undertow', pts: L([85.0, 2.7], [87.0, 2.75], [88.5, 2.3], [89.5, 1.4], [90.3, 0.6]), width: h(1.3), speed: 300, dashed: true, suck: h(2.0) }
    ],
    vortices: [
        { id: 'djuphalan', x: h(43), y: h(5.05), r: h(2.4), eye: h(0.45), speed: 220, pull: 320, spin: 1, when: '!coin_got' }
    ],
    pushes: [
        // the falling water drives every swimmer back from the cave mouth; a hidden shell sinks under it
        { id: 'fors', kind: 'box', x0: h(87.3), x1: h(90.0), y0: h(-1.2), y1: h(3.4), vx: -700 },
        // the whirlpool's ring spins swimmers away from the coin; a hidden shell spirals down
        { id: 'djuphalan-ring', kind: 'ring', x: h(43), y: h(5.05), r: h(2.1), speed: 620, when: '!coin_got' }
    ],
    spots: {
        start: { x: h(28.4), y: h(-0.39), facing: -1 },
        fromSkog: { x: h(-1.4), y: h(-0.6), facing: 1 },
        nest: { x: h(26), y: h(-0.42) },
        tukanNest: { x: h(25.2), y: h(-0.43) },
        kloNest: { x: h(29.6), y: h(-0.37) },
        stash: { x: h(23.2), y: h(-0.47) },
        cocoa: { x: h(16.8), y: h(-0.62) },
        klyft: { x: h(7.4), y: h(-0.62) },
        riverWest: { x: h(32.1), y: h(-0.31) },
        coin: { x: h(43), y: h(5.15) },
        beetle: { x: h(63.1), y: h(-1.45) },
        ball: { x: h(61.9), y: h(-1.43) },
        magpie: { x: h(68.1), y: h(-2.85) },
        magTree: { x: h(69.4), y: h(-0.62) },
        fors: { x: h(76.2), y: h(-0.5) },
        cave: { x: h(93.6), y: h(-0.31) },
        cloudSky: { x: h(26), y: h(-5.4) }
    },
    areas: [
        { id: 'nest', x0: h(23.5), x1: h(30) },
        { id: 'dig', x0: h(29.4), x1: h(32.2) },
        { id: 'grove', x0: h(11), x1: h(20) },
        { id: 'klyft', x0: h(5.8), x1: h(9.5) },
        { id: 'river', x0: h(33.5), x1: h(57.5) },
        { id: 'deep', x0: h(39), x1: h(47), y0: h(1.2) },
        { id: 'beetle', x0: h(58.8), x1: h(64.5) },
        { id: 'magtree', x0: h(65.5), x1: h(72.5) },
        { id: 'magnest', x0: h(67), x1: h(70.4), y1: h(-2.6) },
        { id: 'fors', x0: h(76), x1: h(91) },
        { id: 'cave', x0: h(91.2), x1: h(96) }
    ],
    // the ten eggs: where they wait and how they are earned (puzzles.mjs)
    eggs: [
        { id: 'e1', x: h(30.7), y: h(-0.37), how: 'dig' },
        { id: 'e2', x: h(13.3), y: h(-0.62), how: 'fall', from: { x: h(16.9), y: h(-4.3) }, flag: 'p1_fallen' },
        { id: 'e4', x: h(93.7), y: h(-0.31), how: 'touch' },
        { id: 'e5', x: h(94.8), y: h(-0.32), how: 'touch' },
        { id: 'e6', x: h(56.4), y: h(0.06), how: 'wash', flag: 'p5_washed' },
        { id: 'e7', x: h(67.7), y: h(-2.85), how: 'trade' },
        { id: 'e8', x: h(68.3), y: h(-2.85), how: 'trade' }
    ],
    // P1: the hollow log drums the cocoa tree's roots
    drum: { surface: 'log', beats: 8, minSpeed: 1000, tree: { x: h(16.9), y: h(-0.62) } },
    // P5: the beetle's ball rolls off the plateau into the river and is washed
    ball: {
        x0: h(61.9), step: h(0.45), edge: h(60.65), stopX: h(56.7), push: { min: h(0.3), max: h(1.05) },
        // the ground it rolls on (west to east), down to the river that washes it
        path: L([56.7, 0.0], [57.5, -0.3], [58.5, -0.48], [59.3, -0.55], [60.6, -1.4], [63.5, -1.45]), rollSeconds: 1.6, washSeconds: 1.3
    },
    magpie: { x: h(68.1), y: h(-2.85), surface: 'br5', reach: h(1.4) },
    nest: { x: h(26), y: h(-0.42), reach: h(1.6) },
    exits: [
        { id: 'to-skog', x0: h(-3), x1: h(-2.2), to: 'skog', spawn: 'fromStrand', auto: true, dir: -1, when: 'p2_bridge' }
    ]
};

// ===========================================================================
// DJUPA SKOGEN
// ===========================================================================
SCENES.skog = {
    id: 'skog',
    bounds: { x0: h(-3), x1: h(102), y0: h(-17), y1: h(4) },
    sky: 'forest',
    surfaces: [
        // Jätteträdet stands on the forest floor west of Ravinen
        { id: 'ground-w', pts: L([-3, -0.6], [6, -0.62], [14, -0.6], [24, -0.62], [34.5, -0.6]), mat: 'grass', edgeMat: 'earth' },
        // three long branches wind up round the trunk to the crown
        { id: 'brA', thin: true, pts: L([10.4, -4.65], [11.4, -4.65], [23.5, -0.62]), mat: 'wood', branch: true, big: true },
        { id: 'brB', thin: true, pts: L([11.0, -5.0], [12.6, -5.0], [22.0, -8.3], [23.0, -8.3]), mat: 'wood', branch: true, big: true },
        { id: 'brC', thin: true, pts: L([7.8, -12.3], [12.5, -12.2], [20.6, -8.65], [21.9, -8.65]), mat: 'wood', branch: true, big: true, crown: true },
        // Ravinen and the vine that can be pulled across it (P7)
        { id: 'ravine-floor', pts: L([34.5, 3.0], [40, 3.0]), mat: 'earth', hidden: true },
        { id: 'vine', thin: true, pts: L([34.5, -0.6], [37, -0.95], [40, -1.8]), mat: 'vine', bridge: true, rope: true, when: 'p7_vine' },
        // Rutschstammen: a fallen trunk, a long slope to gallop down for the big leap
        { id: 'trunk', pts: L([40, -1.8], [41, -1.8], [50, -4.2], [51.5, -4.25]), mat: 'bark', edgeMat: 'bark' },
        // Utsiktskullen
        { id: 'hill', pts: L([51.5, -4.25], [53, -4.22], [62, -1.4], [66, -0.6]), mat: 'grass', edgeMat: 'earth' },
        { id: 'ground-mid', pts: L([66, -0.6], [70, -0.62], [74, -0.6]), mat: 'grass', edgeMat: 'earth' },
        // Rotgrottan: a tunnel under the giant roots (P4)
        { id: 'tunnel', pts: L([74, -0.6], [76.4, 0.85], [81, 0.9], [85.6, 0.88], [88, -0.6]), mat: 'earth', tunnel: true },
        // where Mira's bridge comes down into the forest
        { id: 'ground-e', pts: L([88, -0.6], [92, -0.62], [96, -0.6], [102, -0.6]), mat: 'grass', edgeMat: 'earth' },
        { id: 'mushroom', thin: true, pts: L([95.9, -1.0], [97.1, -1.0]), mat: 'mushroom', prop: 'mushroom' }
    ],
    walls: [
        { id: 'west-paper', x: h(-2.6), y0: h(-6), y1: h(1), balk: 'paper' }
    ],
    edges: [
        // the branch tips that would drop far; a lower end only steps down onto the branch below
        { id: 'brA-w', x: h(10.45), y: h(-4.65), dir: -1, kind: 'balk', reason: 'branch', dy: 30 },
        { id: 'brB-e', x: h(22.95), y: h(-8.3), dir: 1, kind: 'balk', reason: 'branch', dy: 30 },
        { id: 'brC-w', x: h(7.85), y: h(-12.3), dir: -1, kind: 'balk', reason: 'branch', dy: 30 },
        // P7: the big leap off the trunk's end, only with the speed carried down it
        {
            id: 'leap-p7', x: h(40), y: h(-1.8), dir: -1, kind: 'sprang', to: [h(33.2), h(-0.6)], peak: h(1.25), slow: 0.5, pan: true,
            minSpeed: 1350, speedReason: 'runup',
            downhill: { surface: 'trunk', gravity: 900, coastDrag: 60, maxSpeed: 1580, runup: { x: h(51), y: h(-4.25) } },
            when: '!p7_vine'
        },
        { id: 'ravine-w', x: h(34.5), y: h(-0.6), dir: 1, kind: 'balk', reason: 'edge', when: '!p7_vine' },
        // P4: no hoof goes into the dark
        { id: 'dark', x: h(87.6), y: h(-0.35), dir: -1, kind: 'balk', reason: 'dark', dy: 70, when: '!p4_lit' }
    ],
    spots: {
        fromStrand: { x: h(100.6), y: h(-0.6), facing: -1 },
        kloArrive: { x: h(98.8), y: h(-0.6) },
        tukanArrive: { x: h(97.9), y: h(-0.6) },
        seeds: { x: h(89.7), y: h(-0.6) },
        tunnelEgg: { x: h(79.6), y: h(0.9) },
        hillTop: { x: h(52.2), y: h(-4.24) },
        ledge: { x: h(32), y: h(-0.6) },
        vine: { x: h(34.1), y: h(-0.6) },
        treeFoot: { x: h(25.4), y: h(-0.62) },
        crown: { x: h(9.2), y: h(-12.28) },
        cloud: { x: h(9.6), y: h(-14.2) }
    },
    areas: [
        { id: 'arrive', x0: h(90.5), x1: h(101) },
        { id: 'seeds', x0: h(88.4), x1: h(91.2) },
        { id: 'tunnel', x0: h(75), x1: h(88) },
        { id: 'hill', x0: h(53), x1: h(66) },
        { id: 'trunkTop', x0: h(49), x1: h(53), y1: h(-3.6) },
        { id: 'ledge', x0: h(28), x1: h(34.5) },
        { id: 'tree', x0: h(6), x1: h(26) },
        { id: 'crown', x0: h(7.8), x1: h(13.6), y1: h(-11.4) }
    ],
    eggs: [
        { id: 'e3', x: h(96.5), y: h(-1.0), how: 'touch' },
        { id: 'e9', x: h(79.6), y: h(0.9), how: 'touch', when: 'p4_lit' },
        { id: 'e10', x: h(31.6), y: h(-0.6), how: 'touch' }
    ],
    // P4: shy moonshine seeds open only round a still, hidden shell
    seeds: { x0: h(88.7), x1: h(90.8), seconds: 2.5, flag: 'p4_lit' },
    vinePull: { x0: h(33.2), x1: h(34.5), facing: 1, flag: 'p7_vine' },
    exits: [
        { id: 'to-strand', x0: h(101.4), x1: h(102), to: 'strand', spawn: 'fromSkog', auto: true, dir: 1 }
    ]
};

/** Named checkpoints: where to put the player when a save is loaded. */
export const CHECKPOINTS = {
    start: { scene: 'strand', spot: 'start' },
    east: { scene: 'strand', at: { x: h(66.5), y: h(-0.6), facing: -1 } },
    skog: { scene: 'skog', spot: 'fromStrand' },
    ledge: { scene: 'skog', at: { x: h(30.5), y: h(-0.6), facing: 1 } },
    crown: { scene: 'skog', at: { x: h(11.4), y: h(-12.22), facing: -1 } },
    nest: { scene: 'strand', spot: 'start' }
};

export { h as hl };
