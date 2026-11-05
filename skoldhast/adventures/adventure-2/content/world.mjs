/*
 * Äventyr 2: Den magiska skogen – the world (docs/skoldhast/adventure-2.md).
 * Two side-view pages in horse lengths (1 HL = 200 world units, y down, the
 * ground near y = -0.6 HL), in the same shapes src/sim.mjs moves on:
 *
 *   strand  Flodstranden, west → east: Klyftan (Mira's dashed rope bridge) ·
 *           Kakaolunden (the cocoa tree, the hollow log) · Sandbanken (the nest) ·
 *           Glimmerfloden (Djuphålan's whirlpool) · Tordyvelbacken · Skatträdet ·
 *           Forsen (the waterfall and the cave behind it)
 *   skog    Djupa skogen, west → east: Jätteträdet (the crown sees the storm) · Ravinen ·
 *           Rutschstammen · Utsiktskullen · Rotgrottan · the bouncing mushroom
 *   kristall  Kristallgrottan, inside the mountain behind the waterfall
 *   topp    Åsktoppen, the storm's peak, where the cloud sits
 *
 * Everything a puzzle needs is data here; puzzles.mjs gives it life.
 * Additions to the sim's shapes:
 *   pushes  zones that push a visible swimmer (never a hidden shell): the
 *           waterfall's downpour, the ring round Djuphålan's eye, the rush under
 *           Kristallsjön's wall, the spring's falling sides
 *   eggs    where each of the ten eggs is and how it is earned
 *   bounce  a surface that throws the sköldhäst up when it lands (the mushroom)
 *   winds   gusts that push a visible sköldhäst along open ground, back (dir -1) or on towards the top
 *           (dir 1, where the storm has turned); a hidden shell holds
 *   lightning  a schedule that sets a flag while the lightning shows (T2's bridge inks only then)
 *   crystals, plates, glitterBall  Kristallgrottan's plates, gate and Tordyveln's ball
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
    bounds: { x0: h(-3), x1: h(98.6), y0: h(-9), y1: h(5.5) },
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
        // the ledge behind the falls, and the dark passage on into the mountain
        { id: 'cave-ledge', pts: L([92.5, -0.3], [96.0, -0.32], [98.6, -0.36]), mat: 'rock', cave: true }
    ],
    walls: [
        { id: 'west-paper', x: h(-2.9), y0: h(-6), y1: h(1), balk: 'paper' },
        { id: 'mountain-end', x: h(98.5), y0: h(-4), y1: h(1.5) }
    ],
    // Skatträdet's branches have no rails: stepping off one only drops to the one below
    edges: [
        // no hoof goes into the mountain's dark without a light
        { id: 'mountain-dark', x: h(95.6), y: h(-0.32), dir: 1, kind: 'balk', reason: 'darkCave', dy: 70, when: '!lantern' }
    ],
    dashed: [
        // P2: the rope bridge Mira drew but did not finish
        { id: 'p2-bridge', pts: L([1.5, -0.6], [2.6, -0.52], [4, -0.48], [5.4, -0.52], [6.5, -0.6]), flag: 'p2_bridge', bothWays: true,
            sketch: { depth: 18, mat: 'wood', planks: 40, rope: true }, mira: true }
    ],
    waters: [
        { id: 'river', x0: h(33.2), x1: h(57.8), top: h(0), kind: 'river' },
        { id: 'pool', x0: h(76.9), x1: h(92.6), top: h(0), kind: 'pool' }
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
        fromKristall: { x: h(95.0), y: h(-0.32), facing: -1 },
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
        { id: 'cave', x0: h(91.2), x1: h(98.6) }
    ],
    // the ten eggs: where they wait and how they are earned (puzzles.mjs)
    eggs: [
        { id: 'e1', x: h(30.7), y: h(-0.37), how: 'dig' },
        { id: 'e2', x: h(13.3), y: h(-0.62), how: 'fall', from: { x: h(16.9), y: h(-4.3) }, flag: 'p1_fallen' },
        { id: 'e6', x: h(56.4), y: h(0.06), how: 'wash', flag: 'p5_washed' },
        { id: 'e7', x: h(67.9), y: h(-2.85), how: 'trade' }
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
        { id: 'to-skog', x0: h(-3), x1: h(-2.2), to: 'skog', spawn: 'fromStrand', auto: true, dir: -1, when: 'p2_bridge' },
        { id: 'to-kristall', x0: h(96.9), x1: h(98.6), to: 'kristall', spawn: 'fromStrand', auto: true, dir: 1, when: 'lantern' }
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
        // a magic mushroom as soft as a trampoline, under the branch where an egg landed (P9)
        { id: 'mushroom', thin: true, pts: L([95.9, -1.0], [97.1, -1.0]), mat: 'mushroom', prop: 'mushroom', bounce: h(2.75) },
        { id: 'owl-branch', thin: true, pts: L([94.4, -3.4], [97.8, -3.4]), mat: 'wood', branch: true }
    ],
    walls: [
        { id: 'west-paper', x: h(-2.6), y0: h(-6), y1: h(1), balk: 'paper' },
        // past the exit to the river beach; reached only if a scene starts just as the sköldhäst leaves
        { id: 'east-paper', x: h(101.95), y0: h(-6), y1: h(1) }
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
        { id: 'e3', x: h(95.2), y: h(-3.4), how: 'touch' },
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

// ===========================================================================
// KRISTALLGROTTAN – inside the mountain, behind the waterfall
//   west → east: the passage from Forsen · Kristallklangen (three crystal plates
//   and a dark chasm) · Kristallsjön and the rock wall with three currents under
//   it · Tordyveln's glitter ball and the two plates by the gate · Källan, the
//   spring that rises through the mountain to Åsktoppen
// ===========================================================================
SCENES.kristall = {
    id: 'kristall',
    bounds: { x0: h(-1.2), x1: h(77), y0: h(-10), y1: h(5.5) },
    sky: 'cave', underground: true,
    surfaces: [
        { id: 'k-entry', pts: L([-1.2, -0.4], [3, -0.42], [6, -0.4]), mat: 'rock' },
        // K1: three crystal plates in the floor ring under galloping hooves
        { id: 'k-floor1', pts: L([6, -0.4], [12, -0.4]), mat: 'rock' },
        { id: 'kc1', thin: true, hollow: true, pts: L([6.4, -0.4], [6.7, -0.52], [7.7, -0.52], [8.0, -0.4]), mat: 'crystal', crystal: 'k1_a' },
        { id: 'kc2', thin: true, hollow: true, pts: L([8.2, -0.4], [8.5, -0.52], [9.5, -0.52], [9.8, -0.4]), mat: 'crystal', crystal: 'k1_b' },
        { id: 'kc3', thin: true, hollow: true, pts: L([10.0, -0.4], [10.3, -0.52], [11.3, -0.52], [11.6, -0.4]), mat: 'crystal', crystal: 'k1_c' },
        { id: 'k-chasm', pts: L([12, 3.6], [18, 3.6]), mat: 'rock', hidden: true },
        { id: 'k-bridge', thin: true, pts: L([12, -0.4], [13.5, -0.28], [15, -0.24], [16.5, -0.28], [18, -0.4]), mat: 'crystal', bridge: true, crystalBridge: true, when: 'k1_bridge' },
        { id: 'k-ledge', pts: L([18, -0.4], [21, -0.45], [24, -0.32]), mat: 'rock' },
        // Kristallsjön
        { id: 'k-shore-w', pts: L([24, -0.32], [25, 0.2], [26, 1.4], [27.5, 3.3]), mat: 'riverbed' },
        { id: 'k-lakebed', underwater: true, pts: L([27.5, 3.3], [30, 3.95], [35, 4.1], [40, 4.05], [43, 4.25], [47, 4.2], [49, 3.5], [51, 2.4], [52.6, 1.0], [53.6, -0.1], [54.4, -0.42]), mat: 'riverbed' },
        // K3: the gate's pool, with two plates on its floor
        { id: 'k-land-e', pts: L([54.4, -0.42], [56, -0.45], [57.5, -0.5]), mat: 'rock' },
        { id: 'k-pool-bed', underwater: true, pts: L([57.5, -0.5], [58.2, 1.0], [58.8, 2.2], [62.6, 2.2], [63.3, 0.6], [64, -0.42]), mat: 'riverbed' },
        { id: 'k-gate-floor', pts: L([64, -0.42], [66, -0.45], [69.2, -0.42]), mat: 'rock' },
        // Källan: the pool at the foot of the spring
        { id: 'k-spring-bed', underwater: true, pts: L([69.2, -0.42], [69.8, 0.4], [70.6, 2.7], [75.6, 2.9], [76, 2.0], [77, 1.6]), mat: 'riverbed' }
    ],
    slabs: [
        // the rock wall that comes down into the lake; the currents run under it
        { id: 'k-wall', top: L([43.6, -3.2], [46.6, -3.2]), bottom: L([43.6, 2.1], [46.6, 2.1]), clear: 150 }
    ],
    walls: [
        { id: 'k-west', x: h(-1.1), y0: h(-4), y1: h(1), balk: 'paper' },
        { id: 'k-gate', x: h(66.2), y0: h(-3), y1: h(0.2), when: '!k3_open', balk: 'gate' },
        { id: 'k-east', x: h(76.9), y0: h(-10), y1: h(5) }
    ],
    edges: [
        { id: 'k-chasm-w', x: h(12), y: h(-0.4), dir: 1, kind: 'balk', reason: 'chasm', when: '!k1_bridge' },
        { id: 'k-chasm-e', x: h(18), y: h(-0.4), dir: -1, kind: 'balk', reason: 'chasm', when: '!k1_bridge' }
    ],
    dashed: [
        // the crystal bridge: only once the three plates light the chasm can hooves draw it
        { id: 'k1-bridge', pts: L([12, -0.4], [13.5, -0.28], [15, -0.24], [16.5, -0.28], [18, -0.4]), flag: 'k1_bridge', bothWays: true, inkWhen: 'k1_lit',
            sketch: { depth: 18, mat: 'crystal', planks: 40 } }
    ],
    waters: [
        { id: 'k-spring', x0: h(72.2), x1: h(73.8), top: h(-9.4), bottom: h(0.4), kind: 'pipe' },
        { id: 'k-lake', x0: h(24.3), x1: h(54.4), top: h(0), kind: 'lake' },
        { id: 'k-pool', x0: h(57.7), x1: h(63.8), top: h(0), kind: 'pool' },
        { id: 'k-springpool', x0: h(69.4), x1: h(76.8), top: h(0), kind: 'pool' }
    ],
    lanes: [
        // K2: three currents start by three crystals on the lake floor; only the white one runs under the wall
        { id: 'k2-white', pts: L([30.2, 3.75], [34, 3.85], [38, 3.85], [42, 3.95], [44, 3.75], [46.5, 3.7], [48.2, 3.2]), width: h(1.1), speed: 330, dashed: true, suck: h(1.4) },
        { id: 'k2-blue', pts: L([35.2, 3.85], [35.6, 3.2], [35.5, 2.5], [34.8, 1.9], [33.4, 1.4], [31, 1.15], [28.5, 1.0]), width: h(1.1), speed: 330, dashed: true, suck: h(1.4), loop: true },
        { id: 'k2-green', pts: L([40.2, 3.8], [40.6, 3.2], [40.5, 2.5], [39.8, 1.9], [38.2, 1.4], [35, 1.1], [29, 1.1]), width: h(1.1), speed: 330, dashed: true, suck: h(1.4), loop: true },
        // Källan: a shell that lies still rides the spring up through the mountain
        { id: 'spring', pts: L([73, 2.55], [73, 0.6], [73, -4], [73, -9.0]), width: h(1.0), speed: 430, dashed: true, suck: h(1.6) }
    ],
    pushes: [
        // under the wall the water rushes back west; a swimmer is pushed back, a hidden shell rides its current through
        { id: 'k-wall-rush', kind: 'box', x0: h(43.4), x1: h(46.8), y0: h(2.0), y1: h(4.6), vx: -700 },
        // the spring's water falls back down its sides: only a still shell rises
        { id: 'k-spring-fall', kind: 'box', x0: h(72.1), x1: h(73.9), y0: h(-9.4), y1: h(0.3), vy: 650 }
    ],
    spots: {
        fromStrand: { x: h(0.9), y: h(-0.42), facing: 1 },
        fromTopp: { x: h(70.5), y: h(1.0), facing: -1, mode: 'swim' },
        kloArrive: { x: h(-0.2), y: h(-0.42) },
        tukanArrive: { x: h(-0.8), y: h(-0.42) },
        whiteCrystal: { x: h(30.2), y: h(4.0) }, blueCrystal: { x: h(35.2), y: h(4.1) }, greenCrystal: { x: h(40.2), y: h(4.05) },
        beetle: { x: h(55.2), y: h(-0.45) },
        plateA: { x: h(59.4), y: h(2.2) }, plateB: { x: h(61.9), y: h(2.2) },
        gate: { x: h(66.2), y: h(-0.45) },
        spring: { x: h(73), y: h(2.6) }
    },
    areas: [
        { id: 'k-arrive', x0: h(-1), x1: h(5) },
        { id: 'k-plates', x0: h(5), x1: h(12.4) },
        { id: 'k-lake', x0: h(24), x1: h(43.4) },
        { id: 'k-east', x0: h(46.8), x1: h(54.4) },
        { id: 'k-beetle', x0: h(54.4), x1: h(58) },
        { id: 'k-gate', x0: h(63.8), x1: h(69.4) },
        { id: 'k-spring', x0: h(69.4), x1: h(77) }
    ],
    eggs: [
        { id: 'e4', x: h(48.6), y: h(3.64), how: 'touch' },
        { id: 'e8', x: h(67.6), y: h(-0.44), how: 'touch', when: 'k3_open' }
    ],
    // K1's three crystal plates, in the order they take their turn (the next one blinks): two galloping
    // hoofbeats light it, so it takes gallops both ways. Each plate has its own note.
    crystals: { plates: ['k1_c', 'k1_a', 'k1_b'], beats: 2, minSpeed: 1000, flag: 'k1_lit', notes: { k1_a: 0, k1_b: 2, k1_c: 4 } },
    // K3: Tordyveln's glitter ball rolls into the pool onto plate A; a still shell presses plate B
    glitterBall: {
        x0: h(56.4), step: h(0.5), edge: h(57.45), dir: 1, stopX: h(59.4), push: { min: h(0.3), max: h(1.05) },
        path: L([55.4, -0.45], [56, -0.45], [57.5, -0.5], [58.2, 1.0], [58.8, 2.2], [59.4, 2.2]), rollSeconds: 1.4, flag: 'k3_ball'
    },
    plates: [{ id: 'k3-b', x: h(61.9), y: h(2.2), w: h(0.7), hold: 1.0, needs: 'k3_ball', flag: 'k3_open' }],
    exits: [
        { id: 'to-strand', x0: h(-1.2), x1: h(-0.4), to: 'strand', spawn: 'fromKristall', auto: true, dir: -1 },
        { id: 'to-topp', x0: h(72), x1: h(74), y1: h(-8.4), to: 'topp', spawn: 'fromKristall', auto: true, unhide: true }
    ]
};

// ===========================================================================
// ÅSKTOPPEN – the mountain top in the storm
//   west → east: the spring pool · Vindkanten (gusts; shelter behind boulders) ·
//   Blixtbron (a bridge drawn only in a lightning flash) · the last climb ·
//   Stormens öga, the calm summit where the cloud sits
// ===========================================================================
SCENES.topp = {
    id: 'topp',
    bounds: { x0: h(-1.2), x1: h(61), y0: h(-13), y1: h(4.5) },
    sky: 'peak',
    surfaces: [
        { id: 'tp-pool', underwater: true, pts: L([-1.2, 2.9], [2.4, 2.9], [3.4, 1.2], [4.2, -0.2], [4.6, -0.42]), mat: 'riverbed' },
        { id: 'tp-ridge', pts: L([4.6, -0.42], [8, -0.6], [12, -1.4], [16, -2.3], [20, -2.95], [23.8, -3.1]), mat: 'grass', edgeMat: 'rock', windswept: true },
        { id: 'tp-chasm', pts: L([23.8, 3.5], [29.8, 3.5]), mat: 'rock', hidden: true },
        { id: 'tp-bridge', thin: true, pts: L([23.8, -3.1], [25.3, -2.95], [26.8, -2.9], [28.3, -2.95], [29.8, -3.1]), mat: 'light', bridge: true, lightBridge: true, when: 't2_bridge' },
        { id: 'tp-crag', pts: L([29.8, -3.1], [32, -3.2], [34, -3.3], [37, -4.35]), mat: 'grass', edgeMat: 'rock', windswept: true },
        // T3: a gap only the turned wind can carry anyone over
        { id: 'tp-gap', pts: L([37, 0.5], [39.8, 0.5]), mat: 'rock', hidden: true },
        { id: 'tp-crag2', pts: L([39.8, -5.33], [40, -5.4], [44, -6.55]), mat: 'grass', edgeMat: 'rock', windswept: true },
        { id: 'tp-summit', pts: L([44, -6.55], [47, -6.72], [54, -6.8], [58, -6.6], [60.6, -6.2]), mat: 'grass', edgeMat: 'rock', summit: true }
    ],
    walls: [
        { id: 'tp-west', x: h(-1.1), y0: h(-4), y1: h(3) },
        { id: 'tp-east', x: h(60.4), y0: h(-9), y1: h(-5), balk: 'edge' }
    ],
    edges: [
        { id: 'tp-chasm-w', x: h(23.8), y: h(-3.1), dir: 1, kind: 'balk', reason: 'storm', when: '!t2_bridge' },
        { id: 'tp-chasm-e', x: h(29.8), y: h(-3.1), dir: -1, kind: 'balk', reason: 'storm', when: '!t2_bridge' },
        // T3: too far to jump; a gust from behind carries a visible sköldhäst over. Calm again after the cloud.
        { id: 'wind-gap', x: h(37), y: h(-4.35), dy: h(1.5), dir: 1, kind: 'sprang', to: [h(40.1), h(-5.43)], peak: h(0.8), slow: 0.6, pan: true,
            minSpeed: 120, needs: 'tailwind', needsReason: 'windGap', when: '!cloud_met' },
        { id: 'wind-gap-e', x: h(39.8), y: h(-5.33), dy: h(1.5), dir: -1, kind: 'balk', reason: 'edge', when: '!cloud_met' },
        { id: 'calm-gap', x: h(37), y: h(-4.35), dy: h(1.5), dir: 1, kind: 'sprang', to: [h(40.1), h(-5.43)], peak: h(0.8), when: 'cloud_met' },
        { id: 'calm-gap-e', x: h(39.8), y: h(-5.33), dy: h(1.5), dir: -1, kind: 'sprang', to: [h(36.7), h(-4.25)], peak: h(0.8), when: 'cloud_met' }
    ],
    dashed: [
        // T2: a bridge of light that hooves can draw only while the lightning shows it
        { id: 't2-bridge', pts: L([23.8, -3.1], [25.3, -2.95], [26.8, -2.9], [28.3, -2.95], [29.8, -3.1]), flag: 't2_bridge', bothWays: true, inkWhen: 'flash',
            sketch: { depth: 14, mat: 'light', planks: 36 } }
    ],
    waters: [
        { id: 'tp-spring', x0: h(-1.2), x1: h(4.4), top: h(0), kind: 'pool' }
    ],
    // T1: gusts on the open ridge push a visible sköldhäst back; a hidden shell holds; boulders give shelter
    winds: [
        { id: 'vindkanten', x0: h(6.5), x1: h(20.4), period: 5.0, gust: 1.7, warn: 0.8, strength: 430, phase: 0,
            shelter: [[h(11.0), h(11.9)], [h(15.3), h(16.2)], [h(19.4), h(20.3)]] },
        // past the bridge the storm has turned: here the wind blows towards the top
        { id: 'klippan', x0: h(33.5), x1: h(37.2), period: 4.6, gust: 1.5, warn: 0.8, strength: 460, phase: 1.3, dir: 1 }
    ],
    // T2's lightning: on the peak the flashes come often and last a while
    lightning: { period: 5.2, on: 2.4, phase: 1.0, flag: 'flash' },
    spots: {
        fromKristall: { x: h(0.9), y: h(1.2), facing: 1, mode: 'swim' },
        ridge: { x: h(6.0), y: h(-0.5) },
        chasm: { x: h(22.6), y: h(-3.06) },
        summit: { x: h(49.0), y: h(-6.75) },
        cloud: { x: h(52.6), y: h(-9.0) },
        cloudNest: { x: h(51.6), y: h(-6.78) }
    },
    areas: [
        { id: 't-arrive', x0: h(-1), x1: h(6.5) },
        { id: 't-wind', x0: h(6.5), x1: h(20.4) },
        { id: 't-chasm', x0: h(20.5), x1: h(23.9) },
        { id: 't-gap', x0: h(33.5), x1: h(37.2) },
        { id: 't-climb', x0: h(30), x1: h(44) },
        { id: 't-summit', x0: h(45), x1: h(60) }
    ],
    eggs: [
        { id: 'e5', x: h(51.6), y: h(-6.78), how: 'cloud', flag: 'cloud_met' }
    ],
    exits: [
        { id: 'to-kristall', x0: h(-1.2), x1: h(2.6), y0: h(2.3), to: 'kristall', spawn: 'fromTopp', auto: true, unhide: true }
    ]
};

/** Named checkpoints: where to put the player when a save is loaded. */
export const CHECKPOINTS = {
    start: { scene: 'strand', spot: 'start' },
    east: { scene: 'strand', at: { x: h(66.5), y: h(-0.6), facing: -1 } },
    skog: { scene: 'skog', spot: 'fromStrand' },
    ledge: { scene: 'skog', at: { x: h(30.5), y: h(-0.6), facing: 1 } },
    crown: { scene: 'skog', at: { x: h(11.4), y: h(-12.22), facing: -1 } },
    kristall: { scene: 'kristall', spot: 'fromStrand' },
    lakeEast: { scene: 'kristall', at: { x: h(56), y: h(-0.45), facing: 1 } },
    topp: { scene: 'topp', at: { x: h(5.4), y: h(-0.45), facing: 1 } },
    bridgeEast: { scene: 'topp', at: { x: h(31), y: h(-3.15), facing: 1 } },
    gapEast: { scene: 'topp', at: { x: h(41), y: h(-5.7), facing: 1 } },
    summit: { scene: 'topp', spot: 'summit' },
    nest: { scene: 'strand', spot: 'start' },
    // (5 November) the cave behind the falls, and the beach's west end once Klyftan's bridge is drawn: a reload no
    // longer sends the player back to redo P3, or back into Djupa skogen
    cave: { scene: 'strand', spot: 'fromKristall' },
    west: { scene: 'strand', spot: 'fromSkog' }
};

export { h as hl };
