/* The notebook's collected paper pieces. No extra save state, assets or drag gesture.
 * The drawing is the one map image every map in the game shares (map-layout.mjs);
 * each piece is clipped from it along its torn silhouette, with the place names as
 * live text on top. */
import { MAP } from './content/sv.mjs';
import { MAP_FRAGMENTS, MAP_VIEW, MAP_COAST, MAP_WATERLINE, mapLabels } from './map-layout.mjs';

export { MAP_FRAGMENTS };

export function collectedMapPieces(flags) {
    return MAP_FRAGMENTS.filter(piece => piece.flags.some(flag => flags?.has(flag)));
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const svgNS = 'http://www.w3.org/2000/svg';
let serial = 0;
const node = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
};

// All three pieces share the same pencil drawing (map-page). Clipping reveals the
// exact part each owns; inspecting a piece enlarges its real position and texture.
// Without the image (it still loading, or an old cache), plain washes stand in.
function mapArtwork(flags, mapUrl) {
    const { w, h } = MAP_VIEW;
    const pts = (list) => list.map(([x, y]) => `${x} ${y}`).join(' L');
    const art = mapUrl
        ? `<image href="${esc(mapUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/>`
        : `<rect width="${w}" height="${h}" fill="#8fbfd6"/>
      <path fill="#efd9a4" d="M${MAP_WATERLINE[0][0]} -10 L${pts(MAP_WATERLINE)} L-10 ${MAP_WATERLINE.at(-1)[1]} L-10 -10Z"/>
      <path fill="#b9c98f" d="M${MAP_COAST[0][0]} -10 L${pts(MAP_COAST)} L-10 ${MAP_COAST.at(-1)[1]} L-10 -10Z"/>`;
    return `${art}${mapLabelsSvg(flags)}`;
}
/** The place names known so far, in the same spots as on the drawing. */
function mapLabelsSvg(flags) {
    return `<g class="map-labels" fill="#354f50" stroke="#fbf4df" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${
        mapLabels(flags).map(l => `<text x="${l.x}" y="${l.y}" text-anchor="middle" class="${l.minor ? 'minor' : ''}"${
            l.vertical ? ` transform="rotate(-90 ${l.x} ${l.y})"` : ''}>${esc(MAP.places[l.key])}</text>`).join('')}</g>`;
}

/** The pieces themselves, found or still missing (shared by the map page and its thumbnail). */
function piecesSvg(found, prefix, flags, mapUrl) {
    const art = mapArtwork(flags, mapUrl);
    return `<defs>${MAP_FRAGMENTS.map(p => `<clipPath id="${prefix}-${p.id}"><path d="${p.path}"/></clipPath>`).join('')}</defs>
    ${MAP_FRAGMENTS.map(p => found.has(p.id) ? `<g class="sk-map-piece" data-piece="${p.id}">
      <path d="${p.path}" fill="#514532" opacity=".16" transform="translate(2 3)"/>
      <path d="${p.path}" fill="#f6eed8"/>
      <g clip-path="url(#${prefix}-${p.id})">${art}</g>
      <path class="sk-map-seam" d="${p.path}" fill="none" stroke="#8c7651" stroke-width="1.1"/>
    </g>` : `<g class="sk-map-missing" data-piece="${p.id}"><path d="${p.path}" fill="#e5ddca" fill-opacity=".34" stroke="#a39477" stroke-width="1.4" stroke-dasharray="4 6"/><text x="${p.box[0] + p.box[2] / 2}" y="${p.box[1] + p.box[3] / 2}" text-anchor="middle" fill="#a39477" font-size="28">?</text></g>`).join('')}`;
}

/** A small picture of the pieces found so far, for the "Vad vet vi?" page (opens the map page). */
export function createMapThumb(state, { mapUrl, onOpen } = {}) {
    const flags = state.flags || new Set(), pieces = collectedMapPieces(flags);
    const found = new Set(pieces.map(p => p.id));
    const b = node('button', 'sk-mapthumb');
    b.type = 'button';
    b.setAttribute('aria-label', `${MAP.title}: ${MAP.count(pieces.length, MAP_FRAGMENTS.length)}. ${MAP.inspect}`);
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = piecesSvg(found, `sk-mapthumb-${++serial}`, flags, mapUrl);
    b.append(node('span', 'sk-mapthumb-title', MAP.title), svg, node('span', 'sk-mapthumb-count', MAP.count(pieces.length, MAP_FRAGMENTS.length)));
    if (onOpen) b.addEventListener('click', onOpen);
    return b;
}

export function createMapBook(state, { mapUrl, onSound } = {}) {
    const flags = state.flags || new Set(), pieces = collectedMapPieces(flags);
    const found = new Set(pieces.map(p => p.id)), prefix = `sk-map-${++serial}`;
    const root = node('section', 'sk-mapbook');
    root.setAttribute('aria-label', MAP.title);
    const head = node('div', 'sk-mapbook-heading');
    const title = node('h4', '', MAP.title), count = node('span', 'sk-mapbook-count', MAP.count(pieces.length, MAP_FRAGMENTS.length));
    head.append(title, count);
    const stage = node('div', 'sk-mapbook-stage');
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 640 420');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', MAP.assembled);
    svg.innerHTML = piecesSvg(found, prefix, flags, mapUrl);
    stage.append(svg);
    const choices = node('div', 'sk-mapbook-pieces');
    choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', MAP.detailHint);
    const buttons = [];
    let selected = null, zoom = 1, panX = .5, panY = .5;
    for (const piece of MAP_FRAGMENTS) {
        const b = node('button', `sk-mapbook-piece ${piece.id}`);
        b.type = 'button'; b.disabled = !found.has(piece.id); b.dataset.piece = piece.id;
        b.setAttribute('aria-pressed', 'false');
        const icon = node('span', 'sk-mapbook-piece-icon'); icon.setAttribute('aria-hidden', 'true');
        icon.textContent = piece.id === 'corner' ? '✎' : piece.id === 'land' ? '△' : '≈';
        b.append(icon, node('span', '', found.has(piece.id) ? MAP.pieces[piece.id].name : MAP.missing));
        b.addEventListener('click', () => choose(piece.id));
        choices.append(b); buttons.push(b);
    }
    // Inspect by a direct tap as well as the ordinary buttons. No dragging is required.
    svg.addEventListener('click', e => {
        const id = e.target.closest?.('.sk-map-piece')?.dataset.piece;
        if (id) choose(id);
    });
    const controls = node('div', 'sk-mapbook-tools');
    const action = (text, fn, cls = '') => {
        const b = node('button', `sk-mapbook-tool ${cls}`, text); b.type = 'button'; b.addEventListener('click', fn); controls.append(b); return b;
    };
    const overview = action(MAP.overview, () => choose(null), 'overview');
    const minus = action('−', () => { zoom = Math.max(1, zoom / 1.4); render(); onSound?.('ui'); }); minus.setAttribute('aria-label', MAP.zoomOut);
    const plus = action('+', () => { zoom = Math.min(2.74, zoom * 1.4); render(); onSound?.('ui'); }); plus.setAttribute('aria-label', MAP.zoomIn);
    const reset = action(MAP.reset, () => { zoom = 1; panX = panY = .5; render(); onSound?.('ui'); }, 'reset');
    const pan = node('div', 'sk-mapbook-pan');
    const panButtons = [];
    for (const [direction, symbol, dx, dy] of [['left', '←', -1, 0], ['up', '↑', 0, -1], ['down', '↓', 0, 1], ['right', '→', 1, 0]]) {
        const b = node('button', 'sk-mapbook-tool', symbol); b.type = 'button'; b.dataset.pan = direction;
        b.setAttribute('aria-label', MAP.pan[direction]);
        b.addEventListener('click', () => { panX += dx * .34 / zoom; panY += dy * .34 / zoom; render(); onSound?.('ui'); });
        pan.append(b); panButtons.push({ b, dx, dy });
    }
    const detail = node('div', 'sk-mapbook-detail'); detail.setAttribute('aria-live', 'polite'); detail.setAttribute('aria-atomic', 'true');
    const name = node('strong'), where = node('span', 'sk-mapbook-found'), description = node('p');
    detail.append(name, where, description);
    const workspace = node('div', 'sk-mapbook-workspace');
    workspace.append(stage, choices, controls, pan);
    root.append(head, workspace, detail);
    function choose(id) { selected = id; zoom = 1; panX = panY = .5; render(); onSound?.('ui'); }
    function render() {
        const piece = MAP_FRAGMENTS.find(p => p.id === selected), box = piece?.box || [0, 0, 640, 420];
        const w = box[2] / zoom, h = box[3] / zoom, margin = .5 / zoom;
        panX = Math.max(margin, Math.min(1 - margin, panX)); panY = Math.max(margin, Math.min(1 - margin, panY));
        svg.setAttribute('viewBox', `${box[0] + box[2] * panX - w / 2} ${box[1] + box[3] * panY - h / 2} ${w} ${h}`);
        root.dataset.zoom = zoom.toFixed(3);
        pan.hidden = reset.hidden = zoom <= 1;
        for (const { b, dx, dy } of panButtons) b.disabled = dx < 0 ? panX <= margin : dx > 0 ? panX >= 1 - margin : dy < 0 ? panY <= margin : panY >= 1 - margin;
        svg.setAttribute('aria-label', selected ? MAP.selected(MAP.pieces[selected].name) : MAP.assembled);
        for (const g of svg.querySelectorAll('.sk-map-piece,.sk-map-missing')) g.style.opacity = selected && g.dataset.piece !== selected ? '0.12' : '1';
        for (const b of buttons) { const on = b.dataset.piece === selected; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); }
        overview.setAttribute('aria-pressed', String(!selected));
        minus.disabled = zoom <= 1; plus.disabled = zoom >= 2.7 || !pieces.length;
        const copy = selected ? MAP.pieces[selected] : null;
        name.textContent = copy?.name || (pieces.length ? MAP.assembled : MAP.empty);
        where.textContent = copy?.foundAt || MAP.detailHint;
        description.textContent = copy?.detail || MAP.legend;
        root.dataset.selected = selected || 'all';
        // Selection/reset can collapse controls above the current scroll offset.
        // Keep the paper in view once per interaction, never in a render loop.
        if (root.isConnected && window.matchMedia?.('(orientation: landscape) and (max-height: 520px)').matches)
            stage.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    render();
    return root;
}
