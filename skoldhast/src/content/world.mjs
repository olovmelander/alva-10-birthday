/*
 * Sköldhästen – the world: four side-view scenes, authored in horse lengths (HL)
 * and converted to world units (1 HL = 200 wu, y down, sea level y = 0).
 *
 *   land   Klippudden · the cleft · Galoppbacken · Vågmärkesbranten · Galoppbanan ·
 *          Streckbron · Spången · the dunes · Spegelpölen · her beach · the jetty gate
 *   kelp   the cave from Vattenporten · the kelp entry · the trench (Mörka valvet,
 *          Kelphjärtat) · Veckmuren
 *   viken  the shore · Trumbryggan (the pier) · Pappersfyren · Strömröret
 *
 * Surfaces are x-monotonic polylines. `when` is a flag condition (see sim.cond).
 * Everything puzzle-related is described here as data; puzzles.mjs gives it life.
 */
import { HL } from '../sim.mjs';
import { SCENE_TITLES, CONTEXT_LABELS } from './sv.mjs';

const h = (v) => v * HL;
const L = (...pts) => pts.map(([x, y]) => [h(x), h(y)]);

// Released chapters: raise this to release the next chapter (plan §7.2).
export const RELEASED_CHAPTER = 3;

export const SCENES = {};

// ===========================================================================
// LAND
// ===========================================================================
SCENES.land = {
    id: 'land', title: SCENE_TITLES.land,
    bounds: { x0: h(-2), x1: h(119), y0: h(-12), y1: h(3) },
    backdrop: [
        // The steppe: a sky, then three bands of hills at their own depth (the
        // farthest moves least). Standing on the ground at `ref`, each band's top
        // row sits `y` frame heights above the ground line; climbing lowers them.
        {
            image: 'bg-steppe', x0: h(-2), x1: h(78), ref: h(-0.8), skyRow: 0.8, layers: [
                { image: 'bg-steppe-far', y: 0.3, par: 0.04, repeat: true },
                { image: 'bg-steppe-mid', y: 0.35, par: 0.1, repeat: true },
                { image: 'bg-steppe-near', y: 0.43, par: 0.2, repeat: true, fill: 0xc3c6aa }
            ]
        },
        // Her sea sits behind her beach, as in her picture: the painting's first
        // full sea row (73 % down) is pinned to this world height.
        { image: 'bg-beach', x0: h(80), x1: h(119), seaRow: 0.73, seaY: h(-0.42) }
    ],
    // Her dark-blue waterline where the sea meets the sand, behind the legs
    // (plan §2.3); it runs on into the sea's own surface line at the shore.
    waterline: { x0: h(105.25), sea: 'shallows' },
    evening: {
        'bg-steppe': 'bg-steppe-evening', 'bg-steppe-far': 'bg-steppe-far-evening', 'bg-steppe-mid': 'bg-steppe-mid-evening',
        'bg-steppe-near': 'bg-steppe-near-evening', 'bg-beach': 'bg-beach-evening'
    },
    surfaces: [
        // Klippudden (Kapitel 2)
        { id: 'klipp', pts: L([-1, -4.0], [3, -4.05], [6, -3.98], [7.95, -4.0]), mat: 'grass', edgeMat: 'rock', cliff: true, when: 'chapter2_available' },
        { id: 'cleft-floor', pts: L([7.95, -0.9], [13.05, -0.9]), mat: 'rock', hidden: true },
        { id: 'rope-plank', thin: true, pts: L([7.95, -4.0], [13.05, -4.0]), mat: 'wood', when: ['p4_plank', '!final_run'], bridge: true },
        // the plateau and Galoppbacken
        { id: 'plateau', pts: L([13.05, -4.0], [15, -4.0], [18, -4.35], [21, -4.9], [24, -5.7], [27, -6.35], [29, -6.35], [31.5, -5.45], [34, -4.02], [36, -4.0]), mat: 'grass', edgeMat: 'earth' },
        // Vågmärkesbranten: terraces L2 and L1
        { id: 'L2', pts: L([36, -2.95], [38.5, -2.95]), mat: 'earth' },
        { id: 'L1', pts: L([38.5, -1.9], [42, -1.92], [46, -1.9]), mat: 'grass', edgeMat: 'earth' },
        // grown ramps (P3)
        { id: 'ramp3', pts: L([36, -4.0], [38.15, -2.95]), mat: 'grass', when: 'p3_t3', ramp: true },
        { id: 'ramp2', pts: L([38.5, -2.95], [40.65, -1.9122857142857144]), mat: 'grass', when: 'p3_t2', ramp: true },
        { id: 'ramp1', pts: L([46, -1.9], [48.2, -0.811]), mat: 'grass', when: 'p3_t1', ramp: true },
        // Galoppbanan (the steppe floor), hurdles as gentle bumps, the little ditch
        {
            id: 'floor', pts: L([46, -0.8], [50, -0.82], [53, -0.78], [56.6, -0.8], [57, -1.0], [57.4, -0.8], [60, -0.84],
                [61.6, -0.8], [62, -1.0], [62.4, -0.8], [65.98, -0.8]), mat: 'grass'
        },
        { id: 'ditch', pts: L([65.98, -0.15], [67.52, -0.15]), mat: 'earth', hidden: true },
        { id: 'floor2', pts: L([67.52, -0.8], [70, -0.78], [72, -0.76], [74, -0.77], [75.98, -0.75]), mat: 'grass' },
        { id: 'rock-61', thin: true, pts: L([60.75, -1.22], [61.25, -1.24]), mat: 'rock', prop: 'rock-flat', mound: 'grass' },
        // Streckbron: the gully and the arch (solid once inked)
        { id: 'gully', pts: L([75.98, 0.25], [80.02, 0.25]), mat: 'earth', hidden: true }, // the dry tide gully's floor (visible under the arch)
        { id: 'arch', thin: true, pts: L([75.98, -0.75], [76.6, -0.98], [77.3, -1.15], [78, -1.2], [78.7, -1.15], [79.4, -0.98], [80.02, -0.66]), mat: 'wood', when: 'p1_inked', bridge: true },
        // Stranden: runway, Spången (hollow planks), dunes, the pool, her beach, the jetty
        { id: 'runway', pts: L([80.02, -0.66], [82, -0.63], [83.9, -0.62]), mat: 'wetsand' },
        { id: 'spangen', pts: L([83.9, -0.62], [84.7, -0.88], [91.4, -0.9], [92.2, -0.62]), mat: 'wood', hollow: true, planks: true,
            // drawn as a plank walk on posts over level sand (collision is its deck)
            boardwalk: { floor: L([83.9, -0.62], [92.2, -0.62]), under: 'sand', deck: 26, posts: h(1.25), blend: { mat: 'wetsand', width: h(1.6) } } },
        { id: 'dunes', pts: L([92.2, -0.62], [93, -0.68], [94, -0.73], [95, -0.66], [96, -0.56], [97, -0.58], [98, -0.63], [99.3, -0.48]), mat: 'sand' },
        { id: 'drift-94', thin: true, pts: L([94.25, -1.06], [94.85, -1.08]), mat: 'wood', prop: 'driftwood-1', mound: 'sand' },
        { id: 'drift-98', thin: true, pts: L([98.2, -1.05], [98.75, -1.06]), mat: 'wood', prop: 'driftwood-2', mound: 'sand' },
        { id: 'pool-bed', pts: L([99.3, -0.48], [99.9, -0.18], [101, -0.1], [102.6, -0.08], [103.4, -0.2], [103.8, -0.42]), mat: 'wetsand' },
        { id: 'beach', pts: L([103.8, -0.42], [105, -0.43], [106.5, -0.4], [108.5, -0.33], [110, -0.22], [111, -0.1], [112, 0.06], [112.25, 0.08]), mat: 'wetsand' },
        // tail: drawn only, so the seabed runs on under the jetty past the page's edge
        { id: 'shallows-bed', pts: L([112.25, 0.08], [113, 0.22], [114.7, 0.3]), tail: L([117, 0.4], [121.5, 0.48]), mat: 'wetsand', underwater: true },
        { id: 'jetty', thin: true, pts: L([112.2, 0.04], [113.1, -0.16], [118.5, -0.16]), mat: 'wood', hollow: true, planks: true, jetty: true }
    ],
    walls: [
        { id: 'gate', x: h(115.2), y0: h(-2.5), y1: h(0.2), when: '!gate_open', balk: 'gate' },
        { id: 'west-paper', x: h(-0.6), y0: h(-8), y1: h(1), balk: 'paper' },
        { id: 'east-end', x: h(118.4), y0: h(-4), y1: h(1), when: '!gate_open' }
    ],
    edges: [
        // Klippudden's east edge over the cleft
        { id: 'klipp-edge', x: h(7.95), y: h(-4.0), dir: 1, kind: 'balk', reason: 'edge', when: (F) => !F.has('p4_plank') || F.has('final_run') },
        // Stora språnget (P4): from the plateau edge onto Klippudden
        { id: 'sprang-p4', x: h(13.05), y: h(-4.0), dir: -1, kind: 'sprang', to: [h(7.0), h(-4.0)], peak: h(1.2), slow: 0.55, pan: true, needs: 'chapter2_available', needsReason: 'paper', when: (F) => !F.has('p4_plank') || F.has('final_run') },
        // the little ditch on Galoppbanan (both ways)
        { id: 'ditch-w', x: h(67.52), y: h(-0.8), dir: -1, kind: 'sprang', to: [h(65.6), h(-0.8)], peak: h(0.55) },
        { id: 'ditch-e', x: h(65.98), y: h(-0.8), dir: 1, kind: 'sprang', to: [h(67.9), h(-0.8)], peak: h(0.55) }
    ],
    dashed: [
        // the dune step that teaches Streck in the first minute (decal: never refuses)
        { id: 'teach-step', pts: L([93.2, -0.7], [94, -0.73], [95, -0.66]), flag: 'teach_streck', bothWays: true, balk: false, decal: true },
        // P1 Streckbron: the arch over the gully
        { id: 'p1-arch', pts: L([75.98, -0.75], [76.6, -0.98], [77.3, -1.15], [78, -1.2], [78.7, -1.15], [79.4, -0.98], [80.02, -0.66]), flag: 'p1_inked', bothWays: true },
        // P2: the plank by the pool (decal; inkable once the reflection has shown it solid; a real plank once inked)
        { id: 'p2-plank', pts: L([103.8, -0.42], [104.6, -0.43], [105.2, -0.43]), flag: 'p2_plank', bothWays: true, balk: false, decal: true, inkWhen: 'p2_seen', solid: 'plank-solid' }
    ],
    hurdles: [{ x: h(57), id: 'log-57' }, { x: h(62), id: 'log-62' }],
    // Below the ground the colouring thins into blank paper (deeper than her
    // picture reaches under her beach), with roots under the turf and a few
    // things lying in the ground. None of them are under her picture (105.8–112).
    paperBelow: { depth: h(1.15) },
    pictureX: [h(105.8), h(112)], // her picture's width: nothing is added inside it
    roots: true,
    buried: [
        { sprite: 'shell-2', x: h(82.4), d: h(0.5), rot: 2.6 },
        { sprite: 'shell-3', x: h(93.6), d: h(0.45), rot: 0.4 },
        { sprite: 'rock-2', x: h(96.8), d: h(0.7), rot: 0.3, scale: 1 },
        { sprite: 'shell-5', x: h(98.3), d: h(0.35), rot: -0.8 },
        { sprite: 'rock-1', x: h(104.7), d: h(0.62), rot: -0.2 },
        { sprite: 'rock-1', x: h(52), d: h(0.55), rot: 0.5, scale: 0.9 },
        { sprite: 'rock-3', x: h(63.5), d: h(0.7), rot: -0.3, scale: 1 },
        { sprite: 'rock-2', x: h(72.8), d: h(0.5), rot: 1.1 },
        { sprite: 'rock-3', x: h(20), d: h(0.8), rot: 0.2, scale: 1.1 },
        { sprite: 'rock-1', x: h(25.5), d: h(0.6), rot: -0.6 },
        { sprite: 'rock-2', x: h(42.5), d: h(0.65), rot: 0.4 }
    ],
    // the far sides of the cleft below Klippudden, the ditch on Galoppbanan and the
    // dry tide gully under Streckbron (drawn only), so they read as holes in the land
    backs: [
        { x0: h(7.95), x1: h(13.05), top: [h(-4.0), h(-4.0)], floor: h(-0.9), mat: 'rock', stones: [[0.3, 'rock-1', 1.1], [0.72, 'rock-3', 0.9]] },
        { x0: h(65.98), x1: h(67.52), top: [h(-0.8), h(-0.8)], floor: h(-0.15), mat: 'earth', stones: [[0.55, 'rock-2', 0.8]] },
        { x0: h(75.98), x1: h(80.02), top: [h(-0.75), h(-0.66)], floor: h(0.25), mat: 'earth', stones: [[0.22, 'rock-1', 0.9], [0.6, 'rock-2', 1], [0.83, 'rock-3', 0.7]] }
    ],
    waters: [
        { id: 'pool', x0: h(99.75), x1: h(103.55), top: h(-0.3), kind: 'pool', swim: false, mirror: true },
        { id: 'shallows', x0: h(110.4), x1: h(121.5), top: h(0), kind: 'sea', swim: false }
    ],
    // places the story and puzzles refer to
    spots: {
        start: { x: h(108.6), y: h(-0.34), facing: 1 },
        fromKelp: { x: h(101.8), y: h(-0.1), facing: 1 },
        fromViken: { x: h(117.6), y: h(-0.16), facing: -1 },
        kloBeach: { x: h(106.8), y: h(-0.39) },
        kloHole: { x: h(106.2), y: h(-0.41) },
        kloNote: { x: h(81.2), y: h(-0.65) },
        kloBranten: { x: h(49.5), y: h(-0.82) },
        kloLedge: { x: h(35.2), y: h(-4.0) },
        kloUdden: { x: h(4.6), y: h(-4.02) },
        kloPlateau: { x: h(14.2), y: h(-4.0) },
        note1: { x: h(80.7), y: h(-0.65) },
        flagpole: { x: h(91.8), y: h(-0.9) },
        glimpse1: { x: h(56), y: h(-3.2), layer: 'mid' },
        mapDune: { x: h(95.1), y: h(-0.66) },
        stone0: { x: h(100.1), y: h(-0.1) },
        arch: { x: h(101.9), y: h(-0.3) },
        splash: { x: h(109.45), y: h(-0.3) },
        label: { x: h(110.3), y: h(-1.25) },
        wavemarks: { x: h(33.6), y: h(-4.8) },
        landmark: { x: h(3.2), y: h(-4.05) },
        cleftView: { x: h(4.0), y: h(-4.0) }
    },
    areas: [
        { id: 'start', x0: h(105), x1: h(112) },
        { id: 'shells', x0: h(105), x1: h(107.8) },
        { id: 'pool', x0: h(99.3), x1: h(103.8) },
        { id: 'dunes', x0: h(92.2), x1: h(99.3) },
        { id: 'spangen', x0: h(84), x1: h(92.2) },
        { id: 'note1', x0: h(80), x1: h(82.2) },
        { id: 'entrance', x0: h(68), x1: h(76) },
        { id: 'galoppbanan', x0: h(48), x1: h(68) },
        { id: 'glimpse1', x0: h(51), x1: h(60) },
        { id: 'branten', x0: h(38.5), x1: h(48.5) },
        { id: 'ledge', x0: h(33.5), x1: h(36.2), y1: h(-3.5) },
        { id: 'hill', x0: h(15), x1: h(34) },
        { id: 'plateau-edge', x0: h(13), x1: h(16.5), y1: h(-3.5) },
        { id: 'udden', x0: h(-1), x1: h(8), y1: h(-3.5) },
        { id: 'jetty', x0: h(112.3), x1: h(118.5) }
    ],
    // P3: backsippa clumps and dotted tussocks (fluff flies 5 HL in the running direction)
    clumps: [
        { id: 'c-teach', x: h(73.6), y: h(-0.77), teach: true },
        { id: 'c1', x: h(52.3), y: h(-0.79) },
        { id: 'c2', x: h(44.6), y: h(-1.91) },
        { id: 'c3', x: h(42.45), y: h(-1.92) }
    ],
    tussocks: [
        { id: 't-teach', x: h(68.6), y: h(-0.78), flag: 'entrance_fluff', decor: true },
        { id: 't1', x: h(47.25), y: h(-0.8), flag: 'p3_t1', ramp: 'ramp1' },
        { id: 't2', x: h(39.55), y: h(-1.9), flag: 'p3_t2', ramp: 'ramp2' },
        { id: 't3', x: h(37.2), y: h(-2.95), flag: 'p3_t3', ramp: 'ramp3' }
    ],
    // P2: the stone on its rail (notch 0 … 4; the reflection wants notch 4)
    rail: { id: 'p2-stone', x0: h(100.1), step: h(0.45), notches: 4, target: 4, y: h(-0.1) },
    // P4: the rope plank on the far side (Dra after landing)
    ropes: [{ id: 'p4-rope', x: h(7.2), y: h(-4.0), flag: 'p4_plank', needs: 'p4_leap' }],
    // Hoppa pays off: things on top of hoppställen
    hoppstallen: [
        { id: 'hs-94', x: h(94.55), y: h(-1.07), reward: 'penna', pencil: 'p-kite' },
        { id: 'hs-98', x: h(98.48), y: h(-1.06), reward: 'shell', note: 5 },
        { id: 'hs-61', x: h(61), y: h(-1.23), reward: 'penna', pencil: 'p-flowers' }
    ],
    shells: [
        { id: 'sh1', x: h(105.35), note: 0 }, { id: 'sh2', x: h(105.85), note: 2 }, { id: 'sh3', x: h(106.35), note: 4 },
        { id: 'sh4', x: h(106.85), note: 3 }, { id: 'sh5', x: h(107.35), note: 1 }
    ],
    // the tune the shells must play (indices into shells, in order)
    shellTune: ['sh1', 'sh2', 'sh3', 'sh4', 'sh5'],
    pencils: [
        { id: 'p-kite', x: h(94.55), y: h(-1.1), prop: 'kite', propAt: { x: h(90.2), y: h(-0.9) } },
        { id: 'p-flowers', x: h(61), y: h(-1.26), prop: 'flowers', propAt: { x: h(58.8), y: h(-0.82) } },
        { id: 'p-hut', x: h(86.4), y: h(-0.92), prop: 'hut', propAt: { x: h(81.6), y: h(-0.63) } },
        { id: 'p-bucket', x: h(33.2), y: h(-4.05), prop: 'bucket', propAt: { x: h(106.9), y: h(-0.38) } },
        { id: 'p-windmill', x: h(27.9), y: h(-6.4), prop: 'windmill', propAt: { x: h(71.2), y: h(-0.77) } },
        // Kapitel 2: small discoveries on the far side of Stora språnget.
        { id: 'p-udden-flowers', when: 'chapter2_available', x: h(2.6), y: h(-4.045), prop: 'flowers', propAt: { x: h(1.5), y: h(-4.03125) } },
        { id: 'p-udden-kite', when: 'chapter2_available', x: h(5.6), y: h(-3.98933), prop: 'kite', propAt: { x: h(6.6), y: h(-3.98615) } }
    ],
    pinwheels: [{ id: 'pw-70', x: h(70.4), y: h(-0.78) }, { id: 'pw-88', x: h(88.6), y: h(-0.9) }],
    // Smaktestet (O1): tufts of steppe grass to taste
    tastes: [{ id: 'grass-74', kind: 'grass', x: h(74.8), y: h(-0.76) }, { id: 'grass-51', kind: 'grass', x: h(50.8), y: h(-0.81) }, { id: 'grass-30', kind: 'grass', x: h(30.5), y: h(-5.9) }],
    // Kapplöpning mot Sköldpaddan Signe (O8, after the ending): from the shells to the pool
    race: { start: { x: h(107.4), y: h(-0.37) }, finish: h(103.6), speed: h(0.35), signe: { x: h(109.8), y: h(-0.235) } },
    // Sandpapperet (O4): hoofprints stay on these materials (walk prints fade, gallop prints turn to graphite)
    printMats: ['sand', 'wetsand'],
    drums: [{ id: 'spangen-flag', surface: 'spangen', x0: h(88.5), x1: h(91.4), notches: 10, flag: 'spangen_flag' }],
    decor: [
        // sky (screen-relative parallax, drawn behind everything)
        { sprite: 'sun', x: h(111.6), y: h(-5.6), layer: 'sky', par: 0.15, anim: 'sun' },
        { sprite: 'cloud-1', x: h(110.4), y: h(-5.2), layer: 'sky', par: 0.15, anim: 'cloud' },
        { sprite: 'cloud-2', x: h(114.2), y: h(-6.1), layer: 'sky', par: 0.15, anim: 'cloud' },
        { sprite: 'cloud-3', x: h(104.5), y: h(-6.4), layer: 'sky', par: 0.15, anim: 'cloud' },
        { sprite: 'cloud-2', x: h(88), y: h(-6.2), layer: 'sky', par: 0.15, anim: 'cloud' },
        { sprite: 'cloud-1', x: h(64), y: h(-7.4), layer: 'sky', par: 0.15, anim: 'cloud' },
        { sprite: 'cloud-3', x: h(40), y: h(-9.6), layer: 'sky', par: 0.15, anim: 'cloud' },
        { sprite: 'cloud-2', x: h(12), y: h(-9.2), layer: 'sky', par: 0.15, anim: 'cloud' },
        { gulls: 3, x: h(113.4), y: h(-4.7), layer: 'sky', par: 0.2, her: true },
        { gulls: 2, x: h(70), y: h(-4.2), layer: 'sky', par: 0.25 },
        { gulls: 2, x: h(30), y: h(-8.2), layer: 'sky', par: 0.25 },
        // her beach
        { sprite: 'frozen-splash', x: h(109.45), y: h(-0.24), layer: 'fore', frozen: true },
        // foam at the jetty's posts, behind its deck, where the sea meets them
        { sprite: 'foam-edge', x: h(113.6), y: h(0.07), layer: 'far' },
        { sprite: 'foam-edge', x: h(116.4), y: h(0.07), layer: 'far' },
        { sprite: 'label-skold-hast', x: h(110.3), y: h(-1.25), layer: 'fore', label: true },
        { sprite: 'rock-1', x: h(104.2), y: h(-0.42), layer: 'mid' },
        // a strand of kelp resting in the shallows, clear of the hooves and tail
        { sprite: 'seaweed-1', x: h(113.9), y: h(0.265), layer: 'mid' },
        // behind the stuck wave, so it never cuts the waterline where the wave meets the sea
        { sprite: 'rock-2', x: h(111.1), y: h(-0.1), layer: 'mid' },
        { sprite: 'jetty-post', x: h(113.4), y: h(0.3), layer: 'mid' },
        { sprite: 'jetty-post', x: h(115.8), y: h(0.3), layer: 'mid' },
        { sprite: 'jetty-post', x: h(118.2), y: h(0.3), layer: 'mid' },
        // the pool and its cliff (Vattenporten)
        { sprite: 'cliff-sealed', x: h(101.7), y: h(-0.28), layer: 'mid', when: '!p2_open', cliff: true },
        { sprite: 'cliff-open', x: h(101.7), y: h(-0.28), layer: 'mid', when: 'p2_open', cliff: true },
        { sprite: 'rock-3', x: h(99.2), y: h(-0.48), layer: 'fore' },
        // dunes
        { sprite: 'dune-grass-1', x: h(92.9), y: h(-0.66), layer: 'mid' },
        { sprite: 'dune-grass-2', x: h(96.3), y: h(-0.56), layer: 'fore' },
        { sprite: 'dune-grass-3', x: h(99.0), y: h(-0.5), layer: 'mid' },
        { sprite: 'dune-grass-1', x: h(84.2), y: h(-0.62), layer: 'fore' },
        { sprite: 'klo-hole', x: h(106.2), y: h(-0.41), layer: 'mid' },
        { sprite: 'post-note', x: h(80.7), y: h(-0.65), layer: 'mid', read: 'note1' },
        // the steppe
        { sprite: 'feathergrass-1', x: h(74.8), y: h(-0.76), layer: 'mid' },
        { sprite: 'feathergrass-2', x: h(71.9), y: h(-0.77), layer: 'fore' },
        { sprite: 'feathergrass-3', x: h(69.3), y: h(-0.78), layer: 'mid' },
        { sprite: 'feathergrass-4', x: h(64.3), y: h(-0.81), layer: 'mid' },
        { sprite: 'feathergrass-1', x: h(59.3), y: h(-0.83), layer: 'fore' },
        { sprite: 'feathergrass-2', x: h(54.6), y: h(-0.79), layer: 'mid' },
        { sprite: 'feathergrass-3', x: h(50.8), y: h(-0.81), layer: 'mid' },
        { sprite: 'hurdle-log', x: h(57), y: h(-0.84), layer: 'mid' },
        { sprite: 'hurdle-log', x: h(62), y: h(-0.84), layer: 'mid' },
        { sprite: 'boulder', x: h(49.2), y: h(-0.82), layer: 'mid' },
        { sprite: 'wave-marks', x: h(33.6), y: h(-4.249), layer: 'mid' },
        { sprite: 'wave-marks', x: h(41.6), y: h(-1.918), scale: .74, layer: 'mid' },
        { sprite: 'feathergrass-4', x: h(30.5), y: h(-5.9), layer: 'mid' },
        { sprite: 'feathergrass-2', x: h(24.2), y: h(-5.75), layer: 'fore' },
        { sprite: 'feathergrass-1', x: h(18.2), y: h(-4.35), layer: 'mid' },
        { sprite: 'feathergrass-3', x: h(2.4), y: h(-4.03), layer: 'mid', when: 'chapter2_available' },
        { sprite: 'boulder', x: h(0.6), y: h(-4.0), layer: 'mid', when: 'chapter2_available' },
        { sprite: 'edge-tick', x: h(13.1), y: h(-4.0), layer: 'mid', when: 'chapter2_available' },
        { sprite: 'edge-tick', x: h(67.45), y: h(-0.8), layer: 'mid' },
        { sprite: 'edge-tick', x: h(66.05), y: h(-0.8), layer: 'mid', flip: true },
        { sprite: 'rope-plank-up', x: h(7.4), y: h(-4.0), layer: 'mid', when: ['!p4_plank', 'chapter2_available'] }
    ],
    // white paper where the page is not drawn yet (release boundaries, plan §4.8)
    paper: [
        { id: 'udden-paper', x0: h(-2), x1: h(12.9), until: 'chapter2_available', instant: true, note: { x: h(10.4), y: h(-4.6) } }
    ],
    exits: [
        { id: 'to-kelp', x0: h(101.0), x1: h(102.7), action: CONTEXT_LABELS.swimIn, when: 'p2_open', to: 'kelp', spawn: 'fromLand' },
        { id: 'to-viken', x0: h(117.8), x1: h(118.6), when: 'gate_open', to: 'viken', spawn: 'fromLand', auto: true }
    ]
};

// ===========================================================================
// KELP
// ===========================================================================
SCENES.kelp = {
    id: 'kelp', title: SCENE_TITLES.kelp, underwater: true,
    pencils: [
        // Pickups float just above the seabed; the drawings rest on its contour.
        { id: 'p-kelp-bucket', chapter: 2, x: h(23.7), y: h(11.4), prop: 'bucket', propAt: { x: h(24.6), y: h(12.05882) } },
        { id: 'p-kelp-shell', chapter: 2, when: 'p5_lit', x: h(28.8), y: h(12.22), prop: 'sea-shell', propAt: { x: h(29.8), y: h(12.59333) } },
        { id: 'p-kelp-boat', chapter: 2, x: h(32.1), y: h(11.34), prop: 'boat', propAt: { x: h(33.1), y: h(11.20667) } },
        { id: 'p-kelp-pebbles', chapter: 2, x: h(43), y: h(9.53), prop: 'pebbles', propAt: { x: h(44.2), y: h(9.46667) } }
    ],
    bounds: { x0: h(-1), x1: h(50), y0: h(-3), y1: h(14) },
    backdrop: [{ image: 'bg-under', x0: h(-1), x1: h(50) }],
    surfaces: [
        { id: 'cave-floor', pts: L([-1, 3.6], [2, 3.8], [4.5, 4.1], [7, 4.6]), mat: 'rock' },
        { id: 'seabed', pts: L([7, 4.6], [9, 5.3], [11, 5.8], [14, 6.05], [17, 6.1], [19, 6.0], [21.2, 6.2], [22, 6.35]), mat: 'seabed' },
        { id: 'trench', pts: L([22, 6.35], [22.5, 8.8], [23.3, 11.6], [25, 12.2], [27, 12.5], [30, 12.6], [31.5, 12.0], [33, 11.2], [36, 11.4], [39, 11.1], [42, 10.2], [45, 9.2], [48.5, 9.0]), mat: 'seabed', chapter: 2 },
    ],
    walls: [
        { id: 'fold', x: h(47.6), y0: h(-3), y1: h(14), balk: 'fold' },
        { id: 'k1-paper', x: h(22.1), y0: h(-1), y1: h(14), when: '!ch2_open', balk: 'paper' },
        { id: 'cave-west', x: h(-0.6), y0: h(-2), y1: h(6) }
    ],
    edges: [
        { id: 'vault-dark', x: h(25.8), y: h(11.4), dy: h(2.2), dir: 1, kind: 'balk', reason: 'dark', water: true, when: '!p5_lit' },
        // nor in by the back way, round the roof, while it is dark
        { id: 'vault-dark-e', x: h(31.05), y: h(11.4), dy: h(1.6), dir: -1, kind: 'balk', reason: 'dark', water: true, when: '!p5_lit' }
    ],
    // Mörka valvet: a rock arch across the trench floor. Its roof is solid (you swim
    // under it or over it); the space under it is dark until the lyktfiskar light it.
    // Its underside is nearly level, so neither mouth can trap a swimmer.
    slabs: [
        { id: 'vault-roof', top: L([25.25, 9.88], [25.5, 9.45], [25.9, 9.1], [26.4, 8.85], [27.6, 8.55], [28.8, 8.45], [30, 8.6], [30.45, 8.8], [30.75, 9.2], [31.0, 9.86]),
            bottom: L([25.25, 10.02], [25.5, 10.02], [25.9, 9.96], [26.4, 9.93], [27.6, 9.88], [28.8, 9.85], [30, 9.88], [30.45, 9.93], [30.75, 9.98], [31.0, 10.02]), chapter: 2 }
    ],
    vaults: [{ id: 'vault', roof: 'vault-roof', until: 'p5_lit', lamps: 7 }],
    waters: [
        // The cave opens directly into the sea: one continuous water level.
        { id: 'cave', x0: h(-1), x1: h(7), top: h(0), kind: 'cave' },
        { id: 'sea', x0: h(7), x1: h(50), top: h(0), kind: 'sea' }
    ],
    lanes: [
        { id: 'lane-entry', pts: L([8.2, 2.5], [11, 3.0], [14, 3.25], [17.5, 3.1], [20.4, 3.7]), width: h(1.3), speed: 380 },
        { id: 'lane-vault', pts: L([22.7, 7.8], [23.3, 9.4], [24.3, 10.4], [25.5, 11.35]), width: h(1.5), speed: 300, when: 'ch2_open' },
        { id: 'lane-vault-in', pts: L([25.5, 11.35], [27.5, 11.9], [30, 11.8], [31.4, 11.2]), width: h(1.3), speed: 320, when: 'p5_lit' },
        { id: 'lane-kelp-release', pts: L([41, 9.25], [39.2, 8.1]), width: h(1.8), suck: h(2.3), speed: 330, when: ['p6_kelp_freed', '!p6_flat'] },
        { id: 'lane-out', pts: L([36, 8.5], [39, 6.5], [42, 4.5], [45, 2.8], [47.2, 1.6]), width: h(1.4), speed: 520, when: 'marks_both' }
    ],
    vortices: [
        { id: 'kelphjartat', x: h(36), y: h(8.4), r: h(3), eye: h(0.45), speed: 620, pull: 160, spin: 1, when: ['ch2_open', 'p6_kelp_freed', '!p6_flat'] }
    ],
    kelpPuzzle: {
        tether: { root: { x: h(34.65), y: h(11.31) }, hook: { x: h(36), y: h(8.52) },
            loose: { x: h(38.8), y: h(9.75) }, pullTarget: { x: h(41), y: h(9.25) },
            grabRadius: h(1.1), pullDistance: h(1.7) },
        fold: { x: h(36), y: h(8.52), groundY: h(11.4), width: h(3.1) },
        // The rig's origin is the folded body's support line, so it meets the crease directly.
        foldCaptureRadius: h(.62), shellContactOffset: 0, contactTolerance: h(.07), settleSpeed: h(1.8), pressSeconds: 3,
        fragment: { from: { x: h(37.2), y: h(11.05) }, to: { x: h(39.5), y: h(7.1) }, riseSeconds: 4.5, pickupRadius: h(.8) }
    },
    kelpBeds: [
        { id: 'bed-entry', x0: h(14.2), x1: h(16), y0: h(5.1), y1: h(6.1) },
        // the lyktfiskar's bed lies beside the vault lane (the lane passes along its edge, never through it)
        { id: 'bed-lykt', x0: h(23.35), x1: h(24.35), y0: h(10.9), y1: h(12.0), when: 'ch2_open' }
    ],
    spots: {
        // Keep the entrance's 1.4 HL immersion below the shared waterline.
        fromLand: { x: h(1.6), y: h(1.4), facing: 1, mode: 'swim' },
        fromViken: { x: h(46.2), y: h(2.2), facing: -1, mode: 'swim' },
        klo: { x: h(12.5), y: h(5.92) },
        kloTrench: { x: h(21.2), y: h(6.2) },
        flap: { x: h(17.6), y: h(6.1) },
        overlook: { x: h(21.3), y: h(3.4) },
        veckmuren: { x: h(47.6), y: h(9.0) },
        corner: { x: h(36), y: h(8.4) },
        vault: { x: h(25.8), y: h(11.4) },
        lyktbed: { x: h(23.9), y: h(11.4) },
        // his second note, sealed in a bottle at the trench's lip (Kapitel 2)
        note2: { x: h(21.65), y: h(6.1) },
        figure: { x: h(47.1), y: h(1.6) }
    },
    areas: [
        { id: 'cave', x0: h(-1), x1: h(7) },
        { id: 'entry', x0: h(7), x1: h(22) },
        { id: 'overlook', x0: h(19.6), x1: h(22.2), y1: h(5.5) },
        { id: 'trench', x0: h(22), x1: h(33) },
        { id: 'heart', x0: h(31), x1: h(42) }
    ],
    flaps: [{ id: 'flap', x: h(17.6), y: h(6.1), flag: 'flap_flat' }],
    tastes: [{ id: 'kelp-15', kind: 'kelp', x: h(15.1), y: h(5.6) }, { id: 'kelp-24', kind: 'kelp', x: h(23.85), y: h(11.2), when: 'ch2_open' }],
    corners: [{ id: 'corner', x: h(36), y: h(8.4), flag: 'p6_flat' }],
    school: { id: 'lykt', home: { x: h(23.9), y: h(11.3) }, count: 7, lit: { x: h(28.8), y: h(11.6) } },
    // little fish far off between the fronds (scenery only)
    schools: [{ x: h(14.5), y: h(3.4), count: 7, range: h(3.5) }, { x: h(39), y: h(5.4), count: 6, range: h(3), chapter: 2 }],
    shy: [
        { id: 'fish-a', kind: 'fish', x: h(15.2), y: h(5.4) },
        { id: 'fish-b', kind: 'fish', x: h(10.2), y: h(4.8) },
        { id: 'hermit-a', kind: 'hermit', x: h(18.8), y: h(6.05) },
        { id: 'eel-a', kind: 'eel', x: h(12.9), y: h(6.05) }
    ],
    hoofprints: [[h(11.5), h(5.85)], [h(12.2), h(5.95)], [h(12.9), h(6.02)], [h(13.6), h(6.05)], [h(19.4), h(6.02)], [h(20.1), h(6.1)]],
    glimpses: [{ id: 'glimpse2', x: h(16.5), y: h(5.2), spot: { x0: h(14.2), x1: h(16) } }],
    decor: [
        { kelp: 9, x0: h(8), x1: h(21.5), layer: 'mid' },
        { kelp: 5, x0: h(8.5), x1: h(21), layer: 'fore' },
        { kelp: 8, x0: h(23), x1: h(46), layer: 'mid', chapter: 2 },
        { sprite: 'kelp-bed', x: h(15.1), y: h(6.1), layer: 'mid' },
        { sprite: 'kelp-bed', x: h(23.85), y: h(11.85), layer: 'mid', chapter: 2 },
        { sprite: 'kelp-float', x: h(10.5), y: h(0.02), layer: 'fore' },
        { sprite: 'kelp-float', x: h(13.8), y: h(0.02), layer: 'fore' },
        { sprite: 'kelp-float', x: h(17.2), y: h(0.02), layer: 'fore' },
        { sprite: 'seabed-rock-1', x: h(9.4), y: h(5.4), layer: 'mid' },
        { sprite: 'seabed-rock-2', x: h(19.8), y: h(6.05), layer: 'fore' },
        { sprite: 'seabed-rock-3', x: h(33.6), y: h(11.25), layer: 'mid', chapter: 2 },
        { sprite: 'shell-under', x: h(16.4), y: h(6.1), layer: 'mid' },
        { sprite: 'note-bottle', x: h(21.65), y: h(6.29), layer: 'mid', chapter: 2 },
        { sprite: 'veckmuren', x: h(47.9), y: h(9.1), layer: 'mid' }
    ],
    paper: [{ id: 'trench-paper', x0: h(22.2), x1: h(46.5), until: 'ch2_open', note: { x: h(26), y: h(4) }, under: true }],
    exits: [
        { id: 'to-land', x0: h(-1), x1: h(0.1), to: 'land', spawn: 'fromKelp', auto: true },
        { id: 'to-viken', x0: h(46.9), x1: h(48), y1: h(3), when: 'marks_both', to: 'viken', spawn: 'fromKelp', auto: true }
    ]
};

// ===========================================================================
// VIKEN (Spegelviken, Trumbryggan, Pappersfyren)
// ===========================================================================
SCENES.viken = {
    id: 'viken', title: SCENE_TITLES.viken,
    pencils: [
        { id: 'p-bay-boat', chapter: 3, x: h(0.9), y: h(-0.16), prop: 'boat', propAt: { x: h(0.4), y: h(-0.16) } },
        { id: 'p-bay-windmill', chapter: 3, x: h(7), y: h(-0.62), prop: 'windmill', propAt: { x: h(8.1), y: h(-0.62) } },
        { id: 'p-bay-shell', chapter: 3, x: h(19.2), y: h(6.47), prop: 'sea-shell', propAt: { x: h(20.2), y: h(6.735) } },
        { id: 'p-gallery-flowers', chapter: 3, x: h(30.2), y: h(-7.3), prop: 'flowers', propAt: { x: h(31.1), y: h(-7.3) } }
    ],
    bounds: { x0: h(-1), x1: h(36), y0: h(-11), y1: h(9) },
    // The sky, then the cliffs and the calm water in front of the sun, clouds and
    // gulls. Below the real surface hangs the water itself, so a swimmer under
    // the pier sees the bay's depths, not its sky (10 HL of it per tile).
    backdrop: [{
        image: 'bg-bay', x0: h(-1), x1: h(36), horizon: 0.6,
        layers: [{ image: 'bg-bay-front', par: 0.012 }],
        under: { image: 'bg-bay-under', water: 'bay', span: h(10), par: 0.45, fill: 0x79909d }
    }],
    evening: { 'bg-bay': 'bg-bay-evening', 'bg-bay-front': 'bg-bay-front-evening' },
    surfaces: [
        { id: 'shore', pts: L([-1, -0.16], [1.4, -0.16], [2.2, 0.15], [3.2, 0.9], [4.5, 2.6], [6, 4.6], [8, 5.8]), mat: 'sand' },
        { id: 'bay-bed', pts: L([8, 5.8], [11, 6.4], [14, 6.85], [18, 6.9], [22, 6.6], [24.8, 6.3], [26.2, 6.0]), mat: 'seabed' },
        { id: 'rock-face', pts: L([26.2, 6.0], [26.8, 4.0], [26.95, 0.8], [27.1, -0.45]), mat: 'rock', hidden: true },
        { id: 'light-base', pts: L([27.1, -0.45], [32.5, -0.45]), mat: 'rock' },
        { id: 'east-bed', pts: L([32.5, -0.45], [33.2, 2], [34, 5.5], [36, 6]), mat: 'seabed' },
        // dropIn: the sköldhäst can hop off it into the bay (Hoppa i, or down on the stick), so it is never a trap
        { id: 'pier', thin: true, pts: L([1.4, -0.16], [2.4, -0.62], [24.2, -0.62]), mat: 'wood', hollow: true, planks: true, pier: true, dropIn: true,
            posts: { from: h(3.3), to: h(23.8), every: h(2.56) } },
        { id: 'gallery', thin: true, pts: L([26.05, -7.3], [31.9, -7.3]), mat: 'cream', gallery: true }
    ],
    walls: [
        { id: 'pier-rail', x: h(24.15), y0: h(-2), y1: h(-0.4), when: '!p8_land' },
        { id: 'west', x: h(-0.8), y0: h(-4), y1: h(1) },
        { id: 'fold-east', x: h(35.2), y0: h(-11), y1: h(9), balk: 'fold' },
        { id: 'gallery-e', x: h(31.8), y0: h(-8.5), y1: h(-7.1) },
        { id: 'gallery-w', x: h(26.15), y0: h(-8.5), y1: h(-7.1) }
    ],
    edges: [
        { id: 'sprang-p8', x: h(24.15), y: h(-0.62), dir: 1, kind: 'sprang', to: [h(25.8), h(0.7)], toWater: true, peak: h(0.9), when: 'p8_land' },
        { id: 'pier-end-balk', x: h(24.15), y: h(-0.62), dir: 1, kind: 'balk', reason: 'rail', when: '!p8_land' }
    ],
    waters: [
        // the pipe reaches a little below the bay's surface, so a shell riding the current rises into it
        { id: 'pipe', x0: h(26.25), x1: h(26.75), top: h(-7.4), bottom: h(0.6), kind: 'pipe' },
        { id: 'bay', x0: h(-1), x1: h(36), top: h(0), kind: 'sea', mirror: true }
    ],
    lanes: [
        { id: 'pipe', pts: L([26.5, 5.2], [26.5, 0.6], [26.5, -7.1]), width: h(0.9), speed: 520, eject: true, suck: h(2.2) },
        // the sea half of P8 starts where the pier leap lands and ends in a calm pool at the lower window
        { id: 'p8-lane', pts: L([25.6, 0.85], [25.95, 1.7], [26.2, 2.3], [26.35, 2.6]), width: h(1.4), speed: 260, dashed: true, endHold: true, priority: 1, when: ['p8_land', '!unfolded', '!ended'] }
    ],
    spots: {
        fromLand: { x: h(0.6), y: h(-0.16), facing: 1 },
        fromKelp: { x: h(8.6), y: h(3.0), facing: 1, mode: 'swim' },
        stairTop: { x: h(26.5), y: h(-7.3), facing: 1 },
        stairFoot: { x: h(22.6), y: h(-0.62), facing: -1 },
        galleryPop: { x: h(26.9), y: h(-7.3), facing: 1 },
        kvPier: { x: h(23.2), y: h(-0.62) },
        kvGallery: { x: h(29.8), y: h(-7.3) },
        klo: { x: h(20.8), y: h(-0.62) },
        kloShore: { x: h(1.0), y: h(-0.16) },
        window: { x: h(26.9), y: h(2.6), inRock: true }, // the lower window in the rock face (a camera target)
        lighthouse: { x: h(29.8), y: h(-0.45) },
        plate: { x: h(14.2), y: h(6.86) },
        rope: { x: h(29.2), y: h(-7.3) },
        viewPier: { x: h(19.5), y: h(-0.62) }
    },
    areas: [
        { id: 'shore', x0: h(-1), x1: h(3) },
        { id: 'pier', x0: h(2.4), x1: h(24.2), y1: h(-0.3) },
        { id: 'pier-end', x0: h(18.5), x1: h(24.2), y1: h(-0.3) },
        { id: 'gallery', x0: h(26), x1: h(32), y1: h(-6.5) }
    ],
    drums: [{ id: 'shutter1', surface: 'pier', x0: h(4), x1: h(22), notches: 24, flag: 'shutter1', when: 'viken_arrived' }],
    // a resting shell within `pull` slides onto the plate; `hold` seconds on it latches the shutter
    plates: [{ id: 'plate', x: h(14.2), y: h(6.86), w: h(1.6), pull: h(1.5), flag: 'shutter2', hold: 1.2 }],
    pullRopes: [{ id: 'shutter3-rope', x: h(29.2), y: h(-7.3), flag: 'shutter3' }],
    // The spiral stair joins the gallery to the pier's end. Its gate is bolted from the stair side:
    // the first way up is the pipe (P7); coming down opens it, and then it works both ways.
    stairs: [
        { id: 'stair', x: h(26.6), y: h(-7.3), to: 'stairFoot', label: CONTEXT_LABELS.down, opens: 'stair_open' },
        { id: 'stair-up', x: h(23.7), y: h(-0.62), to: 'stairTop', label: CONTEXT_LABELS.up, when: 'stair_open' }
    ],
    // the stair's post continues down into the bay
    pilings: [{ x: h(25.15), top: h(-0.62) + 30, width: 20 }],
    // Strömröret above the water: the tube the current climbs, from its drawn lower part up into the gallery basin
    tubes: [{ x: h(26.5), y0: h(-7.24), y1: h(1.0), width: 128 }],
    dashed: [
        // runways of about 4 HL (shore and pier start), 1.4 HL and 1.4 HL between the segments; each is at most 10 HL
        { id: 'p8-d1', pts: L([4.0, -0.62], [9.6, -0.62]), flag: 'p8_s1', balk: false, decal: true, dir: 1, when: 'talk_done', glow: true },
        { id: 'p8-d2', pts: L([11.0, -0.62], [16.8, -0.62]), flag: 'p8_s2', balk: false, decal: true, dir: 1, when: 'talk_done', glow: true },
        { id: 'p8-d3', pts: L([18.2, -0.62], [23.6, -0.62]), flag: 'p8_s3', balk: false, decal: true, dir: 1, when: 'talk_done', glow: true }
    ],
    decor: [
        // scaled so the drawn gallery (1000 px above its base) meets the walkable gallery at -7.3 HL
        { sprite: 'lighthouse', x: h(29.8), y: h(-0.45), layer: 'mid', lighthouse: true, scale: 1.37 },
        { sprite: 'pier-end-rail', x: h(24.1), y: h(-0.62), layer: 'mid', when: '!p8_land' },
        { sprite: 'pipe', x: h(26.5), y: h(5.4), layer: 'mid' },
        { sprite: 'stair', x: h(25.15), y: h(-7.3), layer: 'mid' },
        { sprite: 'stair-gate', x: h(24.45), y: h(-0.62), layer: 'mid', when: '!stair_open' },
        { sprite: 'stair-gate-open', x: h(24.35), y: h(-0.62), layer: 'mid', when: 'stair_open' },
        { sprite: 'basin', x: h(26.6), y: h(-7.25), layer: 'mid' },
        { sprite: 'window-lower', x: h(27.0), y: h(2.6), layer: 'mid' },
        { sprite: 'plate-up', x: h(14.2), y: h(6.86), layer: 'mid', when: '!shutter2' },
        { sprite: 'plate-down', x: h(14.2), y: h(6.86), layer: 'mid', when: 'shutter2' },
        { sprite: 'ratchet-wheel', x: h(12.8), y: h(-0.2), layer: 'mid', ratchet: 'shutter1' },
        { sprite: 'seabed-rock-2', x: h(10.8), y: h(6.35), layer: 'mid' },
        { sprite: 'seabed-rock-1', x: h(21.4), y: h(6.65), layer: 'mid' },
        { sprite: 'cloud-2', x: h(12), y: h(-6.6), layer: 'sky', par: 0.15, anim: 'cloud' },
        { sprite: 'cloud-1', x: h(24), y: h(-8.2), layer: 'sky', par: 0.15, anim: 'cloud' },
        { gulls: 2, x: h(18), y: h(-5.5), layer: 'sky', par: 0.25 }
    ],
    chains: [
        { id: 'chain1', from: { x: h(12.8), y: h(-0.2) }, to: { x: h(29.266), y: h(-7.985) }, shutter: 0 },
        { id: 'chain2', from: { x: h(14.2), y: h(6.7) }, to: { x: h(29.8), y: h(-7.985) }, shutter: 1 },
        { id: 'chain3', from: { x: h(29.2), y: h(-8.65) }, to: { x: h(30.334), y: h(-7.985) }, shutter: 2 }
    ],
    // the lamp room: three shutters on the drawn lighthouse (its attachment points, ×1.37: ±78 and −1100 px from the base)
    shutters: [{ x: h(29.266), y: h(-7.985), flag: 'shutter1' }, { x: h(29.8), y: h(-7.985), flag: 'shutter2' }, { x: h(30.334), y: h(-7.985), flag: 'shutter3' }],
    lamp: { x: h(29.8), y: h(-7.985) },
    lighthouseScale: 1.37,
    mirrorZone: { x0: h(14), x1: h(24.2), needHiddenOn: 'pier' },
    exits: [
        { id: 'to-land', x0: h(-1), x1: h(0.2), to: 'land', spawn: 'fromViken', auto: true, when: 'gate_open' }
    ]
};

// ===========================================================================
// helpers the game uses
// ===========================================================================
export function sceneOf(id) { return SCENES[id]; }

/** Named checkpoints: where to put the player when a save is loaded. */
export const CHECKPOINTS = {
    start: { scene: 'land', spot: 'start' },
    pool: { scene: 'land', spot: 'fromKelp' },
    steppe: { scene: 'land', at: { x: h(72.5), y: h(-0.77), facing: -1 } },
    ledge: { scene: 'land', at: { x: h(35.2), y: h(-4.0), facing: -1 } },
    udden: { scene: 'land', at: { x: h(5.5), y: h(-4.02), facing: 1 } },
    kelp: { scene: 'kelp', spot: 'fromLand' },
    overlook: { scene: 'kelp', at: { x: h(19.8), y: h(3.2), facing: 1, mode: 'swim' } },
    trench: { scene: 'kelp', at: { x: h(22.8), y: h(7.4), facing: 1, mode: 'swim' } },
    viken: { scene: 'viken', spot: 'fromKelp' },
    pier: { scene: 'viken', at: { x: h(12), y: h(-0.62), facing: 1 } },
    pierEnd: { scene: 'viken', at: { x: h(21.5), y: h(-0.62), facing: 1 } },
    lineWindow: { scene: 'viken', at: { x: h(26.35), y: h(2.6), facing: 1, mode: 'swim', hidden: true } },
    beachEnd: { scene: 'land', spot: 'start' }
};

export { h as hl };
