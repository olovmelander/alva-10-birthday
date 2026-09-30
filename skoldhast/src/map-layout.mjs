/*
 * Kartväktaren's map of Alva's page: one layout shared by everything that shows it.
 *
 * The drawing itself is one pencil image, `map-page` (scripts/skoldhast-art/map.mjs,
 * 3 px per map unit), made from these same coordinates. The three torn pieces are
 * cut from it along MAP_FRAGMENTS, so the journal (mapbook.mjs), the pieces joining in
 * the game (map-assemble.mjs), Klo's fold demo (fold-demo.mjs) and the map drawing all
 * show the same place in the same spot. Place names stay live text (Patrick Hand) on
 * top, so they are crisp at any zoom.
 *
 * Map units: 640 × 420. West is left (Klippudden), the beach is east of the land,
 * the sea lies east and "below" (the deep: Kelpskogen, Mörka valvet, Kelphjärtat),
 * and the fold (Vecket) is a ruled line out at sea, parallel to the shore.
 */
export const MAP_VIEW = Object.freeze({ w: 640, h: 420 });
export const MAP_SCALE = 3; // map-page pixels per map unit

export const MAP_FRAGMENTS = Object.freeze([
    { id: 'corner', flags: ['clue_map_corner'], path: 'M286 22 L612 26 L617 62 L611 103 L616 152 L610 187 L613 218 L592 229 L569 222 L544 235 L520 227 L495 237 L468 226 L446 237 L420 229 L399 239 L374 227 L348 237 L320 226 L290 214 L300 192 L287 172 L298 151 L286 130 L297 109 L286 88 L296 65 L285 45 Z', box: [270, 10, 358, 244] },
    { id: 'land', flags: ['mark_land', 'clue_mark_land'], path: 'M26 25 L62 20 L105 25 L145 20 L183 25 L231 21 L286 22 L285 45 L296 65 L286 88 L297 109 L286 130 L298 151 L287 172 L300 192 L290 214 L269 226 L247 216 L223 231 L201 224 L179 237 L155 227 L132 239 L106 228 L81 240 L55 229 L26 232 L22 197 L28 162 L23 119 L28 76 Z', box: [10, 8, 305, 247] },
    { id: 'sea', flags: ['mark_sea', 'clue_mark_sea'], path: 'M26 232 L55 229 L81 240 L106 228 L132 239 L155 227 L179 237 L201 224 L223 231 L247 216 L269 226 L290 214 L320 226 L348 237 L374 227 L399 239 L420 229 L446 237 L468 226 L495 237 L520 227 L544 235 L569 222 L592 229 L613 218 L617 258 L611 296 L618 338 L612 393 L568 397 L529 391 L481 396 L444 392 L400 398 L361 393 L318 398 L275 391 L232 397 L193 393 L146 398 L101 392 L65 397 L26 393 L21 349 L27 310 L22 270 Z', box: [8, 200, 625, 210] }
]);

/** A fragment's outline as points (from its SVG path). */
export function fragmentPoints(fragment) {
    const n = fragment.path.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const out = [];
    for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
    return out;
}

// --- the geography (map units) --------------------------------------------------------
// the land's coast (grass meets sand), from the top edge round to the west edge
export const MAP_COAST = Object.freeze([[318, 18], [330, 44], [344, 82], [350, 120], [341, 150], [318, 170], [282, 182],
    [236, 189], [190, 197], [140, 206], [92, 212], [46, 215], [18, 216]]);
// the waterline (sand meets sea), just outside the coast
export const MAP_WATERLINE = Object.freeze([[330, 18], [354, 40], [374, 82], [382, 124], [372, 160], [346, 188], [306, 205],
    [256, 212], [204, 219], [150, 227], [96, 233], [46, 235], [18, 236]]);
// Klippudden, the headland west of the cleft (Stora språnget)
export const MAP_CLIFF = Object.freeze([[18, 18], [118, 18], [126, 46], [118, 80], [100, 106], [72, 120], [40, 124], [18, 122]]);
export const MAP_CLEFT = Object.freeze([[128, 22], [126, 52], [132, 80], [124, 112], [130, 148]]);
export const MAP_BRIDGE = Object.freeze({ x: 224, y: 176 });   // Streckbron, over a gully to the coast
export const MAP_POOL = Object.freeze({ x: 344, y: 180 });     // Spegelpölen on the beach
export const MAP_GATE = Object.freeze({ x: 314, y: 216 });     // Vattenporten at the waterline
export const MAP_SHELL = Object.freeze({ x: 362, y: 123 });    // centre of the pink scallop shared with the beach
export const MAP_DUNE = MAP_SHELL;                           // legacy name for the fold experiment's landmark
export const MAP_VAULT = Object.freeze({ x: 350, y: 304 });    // Mörka valvet
export const MAP_HEART = Object.freeze({ x: 446, y: 342 });    // Kelphjärtat
export const MAP_TOWER = Object.freeze({ x: 530, y: 128 });    // Pappersfyren (its foot), in Spegelviken
export const MAP_FOLD_X = 582;                                  // Vecket
export const MAP_MARK = Object.freeze({ x: 287, y: 227 });     // the route's mark, torn where the pieces meet
export const MAP_COMPASS = Object.freeze({ x: 62, y: 352 });
// the ways: over land from Klippudden to the beach, and through the deep to the lighthouse
export const MAP_ROUTES = Object.freeze({
    land: Object.freeze([[62, 78], [104, 96], [152, 110], [190, 136], [212, 162], [224, 176], [252, 190], [286, 200], [306, 210]]),
    sea: Object.freeze([[314, 230], [306, 250], [318, 272], [340, 290], [372, 306], [404, 324], [436, 332], [470, 330], [494, 312],
        [508, 286], [520, 250], [530, 212], [534, 174], [532, 140]])
});

// --- the place names ---------------------------------------------------------------------
// `when`: the flags that make a name known (any of them); without `when` it is always shown.
const TOWER_KNOWN = ['mark_land', 'clue_mark_land', 'clue_lighthouse', 'viken_arrived'];
export const MAP_LABELS = Object.freeze([
    { key: 'cliff', x: 70, y: 46, minor: true },
    { key: 'steppe', x: 186, y: 72 },
    { key: 'bridge', x: 206, y: 204, minor: true },
    { key: 'beach', x: 364, y: 102 },
    { key: 'gate', x: 356, y: 214, minor: true },
    { key: 'kelp', x: 190, y: 300 },
    { key: 'vault', x: 356, y: 340, minor: true },
    { key: 'heart', x: 452, y: 380, minor: true },
    { key: 'bay', x: 494, y: 206, when: TOWER_KNOWN },
    { key: 'tower', x: 530, y: 44, minor: true, when: TOWER_KNOWN },
    { key: 'fold', x: 598, y: 300, minor: true, vertical: true, when: ['clue_fold', 'ch1_end'] }
]);

/** The names shown for a set of flags (or all of them when `flags` is `true`). */
export function mapLabels(flags) {
    return MAP_LABELS.filter(l => flags === true || !l.when || l.when.some(f => flags?.has?.(f)));
}
