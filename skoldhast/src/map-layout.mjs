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
 * and the fold (Vecket) is the opening's ruler-straight crease between the beach and
 * Pappersfyren, parallel to the beach's east shore. Beyond it lies the sea corner that
 * Kartväktaren folded under the page, lighthouse and all: havet mellan sidorna.
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
// Bryggan: the jetty off the beach, bolted at its gate, running on as the long pier
// (Trumbryggan) to Pappersfyren's islet. It is in plain view from the beach.
export const MAP_PIER = Object.freeze([[368, 109], [510, 127]]);
export const MAP_PIER_GATE = Object.freeze({ x: 391, y: 112 });  // the bolted gate, out past the waterline
// Vecket: the crease from the opening, through this point and leaning `slope` map units
// east per unit down. It runs between the beach and Pappersfyren, crossing Bryggan just past
// its gate, where the beach ends (the gate is bolted from the folded side); under water it
// is Veckmuren. Beyond it is the corner he folded under the page to keep the splash off his
// paper lighthouse: Spegelviken, the far part of Bryggan and Pappersfyren.
export const MAP_FOLD = Object.freeze({ x: 400, y: 113, slope: 0.34 });
/** The crease's x at a height (map units). */
export const foldX = (y) => MAP_FOLD.x + (y - MAP_FOLD.y) * MAP_FOLD.slope;
// Alva's line from the opening: her blue shore drawn out from the beach towards the
// lighthouse, cut short where the crease folded the sea away
export const MAP_ALVA_LINE = Object.freeze([[379.2, 134], [388, 135.4], [397, 136.1], [foldX(137), 137]]);
export const MAP_MARK = Object.freeze({ x: 287, y: 227 });     // the route's mark, torn where the pieces meet
export const MAP_COMPASS = Object.freeze({ x: 62, y: 352 });
export const MAP_SIGNATURE = Object.freeze({ x: 398, y: 84, w: 118, h: 22 }); // his name: left end, baseline, width, height
// the ways: over land from Klippudden to the beach, and through the deep past Kelphjärtat,
// in under Veckmuren into the folded-away Spegelviken, up under Bryggan where a swimmer
// comes out
export const MAP_ROUTES = Object.freeze({
    land: Object.freeze([[62, 78], [104, 96], [152, 110], [190, 136], [212, 162], [224, 176], [252, 190], [286, 200], [306, 210]]),
    sea: Object.freeze([[314, 230], [306, 250], [318, 272], [340, 290], [372, 306], [404, 324], [436, 332],
        [466, 340], [482, 344], [494, 328], [492, 298], [478, 266], [464, 234], [454, 202], [447, 172], [442, 146],
        [440, 125]])
});

// --- the place names ---------------------------------------------------------------------
// `when`: the flags that make a name known (any of them); without `when` it is always shown.
const TOWER_KNOWN = ['mark_land', 'clue_mark_land', 'clue_lighthouse', 'viken_arrived'];
export const MAP_LABELS = Object.freeze([
    { key: 'cliff', x: 70, y: 46, minor: true },
    { key: 'steppe', x: 186, y: 72 },
    { key: 'bridge', x: 206, y: 204, minor: true },
    { key: 'beach', x: 348, y: 104 },
    { key: 'pier', x: 446, y: 104, minor: true },
    { key: 'gate', x: 356, y: 214, minor: true },
    { key: 'kelp', x: 190, y: 300 },
    { key: 'vault', x: 356, y: 340, minor: true },
    { key: 'heart', x: 452, y: 380, minor: true },
    { key: 'bay', x: 520, y: 214, when: TOWER_KNOWN },
    { key: 'tower', x: 530, y: 44, minor: true, when: TOWER_KNOWN },
    // along the crease, on our side; the opening names it ("ditt streck tog slut vid vecket")
    { key: 'fold', x: 421, y: 180, minor: true, angle: -108.8 },
    // the corner folded under the page (the adventure's own name)
    { key: 'between', x: 556, y: 300, minor: true }
]);

/** The names shown for a set of flags (or all of them when `flags` is `true`). */
export function mapLabels(flags) {
    return MAP_LABELS.filter(l => flags === true || !l.when || l.when.some(f => flags?.has?.(f)));
}

// --- where we are ------------------------------------------------------------------
// Each scene's world x (in horse lengths) laid along the map, as [x, mapX, mapY].
// Land: Klippudden over the cleft, the steppe to Streckbron, along the sand to the
// pool, up the beach past the pink shell and out along Bryggan to its gate, where the
// beach ends at the crease. Under water: from Vattenporten past Mörka valvet to
// Kelphjärtat and on to Veckmuren at the crease. The bay, beyond the crease: on along
// Bryggan (swimmers come up under it) to Pappersfyren.
export const MAP_WHERE = Object.freeze({
    land: Object.freeze([[0, 40, 70], [3, 64, 80], [7, 104, 96], [10, 127, 102], [14, 152, 110], [40, 190, 136],
        [62, 212, 162], [78, 224, 176], [84, 256, 190], [92, 290, 194], [97, 316, 192], [101, 344, 180],
        [104, 352, 165], [107, 358, 134], [110, 362, 118], [112.2, 370, 109], [115.2, 391, 112], [118.5, 401, 113]]),
    kelp: Object.freeze([[-1, 314, 226], [3, 310, 240], [7, 306, 252], [14, 318, 272], [20, 340, 290], [26, 354, 302],
        [31, 404, 324], [36, 440, 336], [42, 462, 340], [46.9, 474, 343], [47.6, 478, 344], [48, 479, 344]]),
    viken: Object.freeze([[-1, 401, 113], [1.4, 406, 114], [24.2, 506, 126.5], [27.1, 516, 128], [29.8, 530, 128], [32.5, 544, 128], [36, 558, 131]])
});

/** Where a world position lies on the map (map units), or null for a scene the map does not show. */
export function mapWhere(scene, xHL) {
    const list = MAP_WHERE[scene];
    if (!list || !Number.isFinite(xHL)) return null;
    if (xHL <= list[0][0]) return { x: list[0][1], y: list[0][2] };
    for (let i = 1; i < list.length; i++) {
        const [x1, mx1, my1] = list[i];
        if (xHL <= x1) {
            const [x0, mx0, my0] = list[i - 1], u = (xHL - x0) / (x1 - x0);
            return { x: mx0 + (mx1 - mx0) * u, y: my0 + (my1 - my0) * u };
        }
    }
    const last = list.at(-1);
    return { x: last[1], y: last[2] };
}

/** Which named place each stretch of a scene belongs to, as [from x, place]. */
export const MAP_WHERE_PLACES = Object.freeze({
    land: Object.freeze([[-Infinity, 'cliff'], [10.5, 'steppe'], [76, 'bridge'], [80.5, 'beach'], [99.5, 'gate'], [104, 'beach'], [111.8, 'pier']]),
    kelp: Object.freeze([[-Infinity, 'gate'], [6, 'kelp'], [24, 'vault'], [33, 'heart'], [40, 'kelp']]),
    viken: Object.freeze([[-Infinity, 'bay'], [26, 'tower']])
});

/** The name of the place we are at, if the player already knows it (else null). */
export function placeAt(scene, xHL, flags) {
    const ranges = MAP_WHERE_PLACES[scene];
    if (!ranges || !Number.isFinite(xHL)) return null;
    let key = null;
    for (const [from, place] of ranges) if (xHL >= from) key = place;
    return key && mapLabels(flags).some(l => l.key === key) ? key : null;
}
