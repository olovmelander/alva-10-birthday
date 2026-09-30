/* The found fragments keep the notebook's ink and torn edges. Kartväktaren's
 * separate LAND/HAV sheet is his deliberately incomplete model of that world. */
import { MAP_FRAGMENTS, MAP_SCALE, MAP_COAST, MAP_WATERLINE, fragmentPoints } from './map-layout.mjs';
import { MAP } from './content/sv.mjs';

const PAPER = 0xf6eed8, INK = 0x625b50;
const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/** Actual map ink in its actual torn silhouette, centred on x and resting at y=0.
 * Call refreshTexture() after a late map bundle arrives; no owned texture is created. */
export function createMapFragmentProp(PIXI, { texture, fragment, width = 124 }) {
    const piece = typeof fragment === 'string' ? MAP_FRAGMENTS.find(f => f.id === fragment) : fragment;
    if (!piece) throw new RangeError(`Unknown map fragment: ${fragment}`);
    const points = fragmentPoints(piece), flat = points.flat();
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const drawWidth = Number.isFinite(width) && width > 0 ? width : 124;
    const scale = drawWidth / (x1 - x0), weight = Math.min(1, drawWidth / 80);
    const container = new PIXI.Container(); container.label = `map-fragment-${piece.id}`;
    const sheet = new PIXI.Container();
    sheet.scale.set(scale); sheet.position.set(-(x0 + x1) * scale / 2, -y1 * scale);
    // Bounds belong to this torn piece, not to the full texture behind its mask.
    const rim = 1.3 * weight / scale, shadowX = 2.5 * weight / scale, shadowY = 3 * weight / scale;
    sheet.boundsArea = new PIXI.Rectangle(x0 - rim, y0 - rim, x1 - x0 + rim + shadowX, y1 - y0 + rim + shadowY);
    container.addChild(sheet);
    const backing = new PIXI.Graphics();
    backing.poly(points.map(([x, y]) => [x + shadowX, y + shadowY]).flat()).fill({ color: 0x514532, alpha: .22 });
    backing.poly(flat).fill(PAPER);
    const pigment = new PIXI.Container();
    const fallback = new PIXI.Graphics().rect(0, 0, 640, 420).fill(0x8fbfd6);
    fallback.poly([MAP_WATERLINE[0][0], -10, ...MAP_WATERLINE.flat(), -10, MAP_WATERLINE.at(-1)[1], -10, -10]).fill(0xefd9a4);
    fallback.poly([MAP_COAST[0][0], -10, ...MAP_COAST.flat(), -10, MAP_COAST.at(-1)[1], -10, -10]).fill(0xb9c98f);
    const art = new PIXI.Sprite(PIXI.Texture.EMPTY); art.label = 'map-fragment-ink'; art.scale.set(1 / MAP_SCALE);
    pigment.addChild(fallback, art);
    const mask = new PIXI.Graphics().poly(flat).fill(0xffffff); pigment.mask = mask;
    // A thin exposed paper edge keeps the blue sea fragment visible underwater.
    // Its weight is in world units so the long sea piece reads as clearly as land.
    const edge = new PIXI.Graphics().poly(flat).stroke({ color: PAPER, alpha: .96, width: 2.6 * weight / scale })
        .poly(flat).stroke({ color: 0x786646, alpha: .85, width: .85 * weight / scale });
    sheet.addChild(backing, pigment, mask, edge);
    container.refreshTexture = () => {
        if (container.destroyed) return false;
        const found = texture?.('map-page');
        if (found && art.texture !== found) art.texture = found;
        art.visible = !!found; fallback.visible = !found;
        return !!found;
    };
    container.refreshTexture();
    return container;
}

/** A different sheet from the recovered geographical map: two ruled categories.
 * It is shared by the keeper's table and its readable close-up, never mirrored. */
export function createGuardianMapPaper(PIXI, { texture } = {}) {
    const container = new PIXI.Container(); container.label = 'guardian-map-paper';
    const bounds = Object.freeze({ x0: 0, y0: 0, x1: 640, y1: 420 });
    const outline = [8, 6, 630, 0, 640, 411, 12, 420, 0, 206];
    const paper = new PIXI.Graphics().poly(outline).fill(PAPER);
    const tooth = texture?.('mat-paper');
    if (tooth) paper.poly(outline).fill({ texture: tooth, textureSpace: 'global', alpha: .34 });
    paper.poly(outline).stroke({ color: 0x8c7651, width: 2, alpha: .7 });
    container.addChild(paper);

    const fields = new PIXI.Graphics();
    fields.rect(30, 33, 290, 350).fill({ color: 0xb8c697, alpha: .66 });
    fields.rect(320, 33, 290, 350).fill({ color: 0x9bbfcc, alpha: .7 });
    // Reserved labels and restrained pencil marks keep this a diagram, with no
    // invented coast or places that contradict what the keeper is explaining.
    for (let i = 0; i < 23; i++) {
        const y = 54 + i * 14, shift = (i % 4) * 7;
        fields.moveTo(44 + shift, y + 6).lineTo(132 + shift, y - 2)
            .moveTo(189 - shift, y + 4).lineTo(302 - shift, y - 3)
            .stroke({ color: 0x6f8058, width: 1.3, alpha: .13 });
        fields.moveTo(337 + shift, y + 2).lineTo(432 + shift, y + 2)
            .moveTo(476 - shift, y + 6).lineTo(597 - shift, y + 6)
            .stroke({ color: 0x47778c, width: 1.2, alpha: .13 });
    }
    const ruled = new PIXI.Graphics();
    ruled.rect(30, 33, 580, 350).stroke({ color: INK, alpha: .36, width: 1.2 });
    ruled.moveTo(320, 33).lineTo(320, 383).stroke({ color: INK, alpha: .9, width: 2.8 });
    for (let y = 45, i = 0; y < 378; y += 14, i++)
        ruled.moveTo(320, y).lineTo(320 + (i % 5 ? 5 : 9), y).stroke({ color: INK, alpha: .48, width: 1.1 });
    container.addChild(fields, ruled);

    const words = MAP.guardian;
    const label = (text, x, y, color, size = 52) => {
        const t = new PIXI.Text({ text, style: { fontFamily: '"Patrick Hand", cursive', fontSize: size,
            fill: color, stroke: { color: 0xf6eed8, width: 4, join: 'round' }, align: 'center' } });
        t.anchor.set(.5); t.position.set(x, y); return t;
    };
    container.addChild(label(words.land, 175, 126, 0x4f664a), label(words.sea, 465, 126, 0x365f76));
    const shore = new PIXI.Container(); shore.label = 'guardian-map-shore'; container.addChild(shore);
    const band = new PIXI.Graphics();
    // The proposal stays on the map's boundary; the ruled line remains legible
    // through a translucent warm strip where the two sides meet.
    band.poly([307, 37, 334, 33, 339, 149, 333, 255, 336, 383, 303, 383, 307, 251, 301, 144])
        .fill({ color: 0xf5d99a, alpha: .82 });
    band.moveTo(310, 38).lineTo(307, 142).lineTo(313, 253).lineTo(309, 380)
        .stroke({ color: 0xfff8dc, width: 2.8, alpha: .95 });
    band.moveTo(332, 38).lineTo(336, 150).lineTo(330, 255).lineTo(333, 380)
        .stroke({ color: 0xb19462, width: 1.8, alpha: .6 });
    const note = new PIXI.Graphics().poly([244, 286, 391, 282, 396, 332, 242, 336])
        .fill({ color: PAPER, alpha: .97 }).stroke({ color: 0xb19462, width: 1.3, alpha: .65 });
    shore.addChild(band, note, label(words.shore, 320, 310, 0x866634, 36));
    const setShore = amount => { shore.alpha = clamp(amount); shore.visible = shore.alpha > 0; };
    setShore(0);
    return { container, setShore, bounds };
}
