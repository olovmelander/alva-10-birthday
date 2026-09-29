/* The notebook's collected paper pieces. No extra save state, assets or drag gesture. */
import { MAP } from './content/sv.mjs';

export const MAP_FRAGMENTS = Object.freeze([
    { id: 'corner', flags: ['clue_map_corner'], path: 'M286 22 L612 26 L617 62 L611 103 L616 152 L610 187 L613 218 L592 229 L569 222 L544 235 L520 227 L495 237 L468 226 L446 237 L420 229 L399 239 L374 227 L348 237 L320 226 L290 214 L300 192 L287 172 L298 151 L286 130 L297 109 L286 88 L296 65 L285 45 Z', box: [270, 10, 358, 244] },
    { id: 'land', flags: ['mark_land', 'clue_mark_land'], path: 'M26 25 L62 20 L105 25 L145 20 L183 25 L231 21 L286 22 L285 45 L296 65 L286 88 L297 109 L286 130 L298 151 L287 172 L300 192 L290 214 L269 226 L247 216 L223 231 L201 224 L179 237 L155 227 L132 239 L106 228 L81 240 L55 229 L26 232 L22 197 L28 162 L23 119 L28 76 Z', box: [10, 8, 305, 247] },
    { id: 'sea', flags: ['mark_sea', 'clue_mark_sea'], path: 'M26 232 L55 229 L81 240 L106 228 L132 239 L155 227 L179 237 L201 224 L223 231 L247 216 L269 226 L290 214 L320 226 L348 237 L374 227 L399 239 L420 229 L446 237 L468 226 L495 237 L520 227 L544 235 L569 222 L592 229 L613 218 L617 258 L611 296 L618 338 L612 393 L568 397 L529 391 L481 396 L444 392 L400 398 L361 393 L318 398 L275 391 L232 397 L193 393 L146 398 L101 392 L65 397 L26 393 L21 349 L27 310 L22 270 Z', box: [8, 200, 625, 210] }
]);

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

// All three pieces share the same pencil drawing. Clipping reveals the exact
// part each owns; inspecting a piece enlarges its real position and texture.
function mapArtwork(flags) {
    const P = MAP.places;
    const label = (key, x, y, small = false) => `<text x="${x}" y="${y}" text-anchor="middle" class="${small ? 'minor' : ''}">${esc(P[key])}</text>`;
    let grass = '', waves = '', kelp = '';
    for (let i = 0; i < 40; i++) {
        const x = 43 + (i * 67 % 240), y = 44 + (i * 43 % 165);
        grass += `<path d="M${x} ${y}l-3 -8m3 8l4 -6"/>`;
    }
    for (let i = 0; i < 35; i++) {
        const x = 40 + (i * 97 % 555), y = 244 + (i * 41 % 137);
        waves += `<path d="M${x} ${y}q6 -4 12 0t12 0"/>`;
    }
    for (let i = 0; i < 8; i++) {
        const x = 191 + i * 14, y = 348 + (i % 3) * 5;
        kelp += `<path d="M${x} ${y}q-9 -15 0 -27t0 -25m-1 35q-12 -4 -7 -15m8 1q12 -3 7 -13"/>`;
    }
    const knownTower = flags.has('mark_land') || flags.has('clue_mark_land') || flags.has('clue_lighthouse') || flags.has('viken_arrived');
    return `<g class="map-colour">
      <path fill="#b1bd8b" fill-opacity=".42" d="M26 22H320L368 148 335 194 290 225 25 238Z"/>
      <path fill="#e3c797" fill-opacity=".48" d="M284 26L342 40 366 108 388 165 345 219 302 245 283 219 335 174 305 100Z"/>
      <path fill="#8db5bf" fill-opacity=".38" d="M27 235L294 220 340 228 386 160 381 32H618V397H24Z"/>
      <path fill="#7d9d94" fill-opacity=".24" d="M24 336Q180 275 329 332T617 274V398H24Z"/>
    </g>
    <g fill="none" stroke="#607955" stroke-width="1.3" opacity=".45">${grass}</g>
    <g fill="none" stroke="#426e8a" stroke-width="1.2" opacity=".46">${waves}</g>
    <g fill="none" stroke="#526b53" stroke-width="2.4" opacity=".85">${kelp}</g>
    <g class="map-graphite" fill="none" stroke="#514e41" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M31 211Q126 217 182 194T287 181Q340 177 353 137T335 51"/>
      <path d="M43 82l23 -30 26 30m-33 -13l10 7 8 -7m-31 26l54 0m-50 5l47 1"/>
      <path d="M110 136l16 -14 17 14m-33 9l43 -1m-36 9l39 -1"/>
      <path d="M188 172q18 -33 40 0m-39 5q17 -26 39 0m-37 3v12m36 -12v10"/>
      <path d="M297 222v-20q0 -17 16 -17t16 17v20m-25 0v-17q0 -10 9 -10t9 10v17"/>
      <path stroke="#876548" stroke-dasharray="4 7" d="M73 86Q148 94 161 134T223 180L322 160"/>
      <path stroke="#315e7f" stroke-dasharray="5 7" d="M314 230Q300 265 336 283T436 333Q474 350 507 290L535 210"/>
      <path d="M334 304v-18q0 -18 15 -18t15 18v18m-30 0l30 0"/>
      <path d="M444 334c-28 -28 30 -46 26 -17s-49 33 -43 2 42 -31 53 -6"/>
      <path d="M470 339l-14 7 6 -14Z" fill="#e9deaf"/>
      <path d="M339 166l62 10 3 -9 -64 -9m12 2v10m12 -8v10m13 -8v10m14 -8v10"/>
    </g>
    <g class="map-labels" fill="#354f50" stroke="#fbf4df" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
      ${label('cliff', 76, 43, true)}${label('steppe', 159, 70)}${label('bridge', 205, 210, true)}
      ${label('beach', 344, 135)}${label('gate', 315, 250, true)}${label('kelp', 194, 290)}
      ${label('vault', 350, 324, true)}${label('heart', 446, 372, true)}
      ${knownTower ? label('bay', 503, 192) + label('tower', 530, 53, true) : ''}
    </g>
    ${knownTower ? `<g fill="none" stroke="#514e41" stroke-width="1.8" stroke-linejoin="round"><path fill="#f2e8c6" d="M511 128l6 -48h26l6 48Zm4 -49l15 -15 16 15ZM521 89h18v10h-18Z"/><path d="M503 131q26 -8 57 0m-21 -37l31 -9m-31 12l30 3"/><path stroke-dasharray="2 5" opacity=".5" d="M582 34v350"/></g>` : ''}
    <g fill="none" stroke="#bd9057" stroke-width="3"><path d="M280 198a18 18 0 0 1 24 24m-28 -20l26 18m-26 1a18 18 0 0 0 24 -23"/></g>`;
}

export function createMapBook(state, { paperUrl, onSound } = {}) {
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
    const art = mapArtwork(flags);
    svg.innerHTML = `<defs>
      <pattern id="${prefix}-paper" patternUnits="userSpaceOnUse" width="240" height="240"><image href="${esc(paperUrl || '')}" width="240" height="240" preserveAspectRatio="xMidYMid slice"/></pattern>
      ${MAP_FRAGMENTS.map(p => `<clipPath id="${prefix}-${p.id}"><path d="${p.path}"/></clipPath>`).join('')}
    </defs>
    ${MAP_FRAGMENTS.map(p => found.has(p.id) ? `<g class="sk-map-piece" data-piece="${p.id}">
      <path d="${p.path}" fill="#514532" opacity=".13" transform="translate(2 3)"/>
      <path d="${p.path}" fill="#f6edd2"/>
      <g clip-path="url(#${prefix}-${p.id})"><rect width="640" height="420" fill="url(#${prefix}-paper)" opacity=".7"/>${art}</g>
      <path class="sk-map-seam" d="${p.path}" fill="none" stroke="#8c7651" stroke-width="1.1"/>
    </g>` : `<g class="sk-map-missing" data-piece="${p.id}"><path d="${p.path}" fill="#e5ddca" fill-opacity=".34" stroke="#a39477" stroke-width="1.4" stroke-dasharray="4 6"/><text x="${p.box[0] + p.box[2] / 2}" y="${p.box[1] + p.box[3] / 2}" text-anchor="middle" fill="#a39477" font-size="28">?</text></g>`).join('')}`;
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
    root.append(head, stage, choices, controls, pan, detail);
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
    }
    render();
    return root;
}
