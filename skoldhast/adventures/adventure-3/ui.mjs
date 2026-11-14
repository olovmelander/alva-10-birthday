/*
 * Äventyr 3 – the interface: Adventure 1's notebook UI (src/ui.mjs: dialogue, controls, panels, settings, the
 * adventure picker, Alva's drawing pad) and its guide (src/guide.mjs: the goal note, thoughts, hints), plus this
 * adventure's own pieces (docs/skoldhast/adventure-3.md, sections 3, 8.6, 11.13 and 13): the title page, the
 * counter "Novas kupa", the research notebook's seven pages, the rocket's travel card, the faces of the new
 * characters and the ending card. The look is skoldhast.css with additions in a3.css.
 *
 *   const ui = createA3UI(host, { assetBase, handlers, voice });
 *   ui.setLights(n, 10); ui.journal(story.notebook()); ui.travel({ places, onPick, onClose }); …
 *
 * Every drawing here is inline SVG in the game's pencil colours (no new download).
 */
import { createUI as createNotebookUI } from '../../src/ui.mjs';
import { createGuide } from '../../src/guide.mjs';
import * as SV from './content/sv.mjs';
import { CONSTELLATION as SKY_CONSTELLATION } from './content/world.mjs';
import { ADVENTURE_UI, UI as BOOK } from '../../src/content/sv.mjs';

const { WORDS = {}, NAMES = {}, NOTEBOOK = {}, POSTCARDS = {}, TABLE = {} } = SV;

const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
};
const svgBox = (cls, svg, label = null) => {
    const s = el('span', cls);
    if (label) { s.setAttribute('role', 'img'); s.setAttribute('aria-label', label); } else s.setAttribute('aria-hidden', 'true');
    s.innerHTML = svg;
    return s;
};
// a repeatable random number (smears and stars never change between openings)
const hash = (x, s = 0) => { const v = Math.sin(x * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------------------------------------
// Drawings
// ---------------------------------------------------------------------------------------------
/** Alva's star: five points drawn freehand, each a little crooked (seed), pale pencil or gold. */
function alvaStarPath(cx, cy, r, seed) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5 + (hash(seed + i, 3) - 0.5) * 0.22;
        const rr = (i % 2 ? r * 0.44 : r) * (0.86 + hash(seed + i, 4) * 0.26);
        pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`);
    }
    return `M${pts.join(' L')} Z`;
}
const alvaStar = (cx, cy, r, seed, { gold = true, glow = true } = {}) =>
    (glow && gold ? `<circle cx="${cx}" cy="${cy}" r="${r * 1.7}" fill="#fff1b0" opacity=".28"/>` : '')
    + `<path d="${alvaStarPath(cx, cy, r, seed)}" fill="${gold ? '#f2c94c' : '#f6e9b0'}" stroke="${gold ? '#9a6c18' : '#9a8a56'}" stroke-width="${Math.max(0.8, r * 0.12).toFixed(2)}" stroke-linejoin="round"/>`;
/** A neat star (not Alva's): a small four-point cross. */
const plainStar = (x, y, r, color = '#efeaf8', op = 0.85) =>
    `<path d="M${x - r} ${y}H${x + r}M${x} ${y - r}V${y + r}" stroke="${color}" stroke-width="${Math.max(0.8, r * 0.32).toFixed(2)}" stroke-linecap="round" opacity="${op}"/>`;

/** Nova's face, from Alva's painting (design 3.1): the purple dome with its unpainted shine, the bands with five
 *  lamps, the beam's first strokes, and two eyes on stalks with the lids half down. Grumpy, as she is. */
function novaSvg({ mood = 'morning' } = {}) {
    const lamp = mood === 'supernova' ? '#f2c94c' : mood === 'angry' ? '#d8343a' : mood === 'asleep' ? '#7a5a8e' : '#c2337e';
    const lid = mood === 'supernova' ? 0 : mood === 'asleep' ? 1 : 0.55;
    const eye = (cx, cy, r) => {
        const lidY = cy - r + 2 * r * lid;
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#efe6f6" stroke="#5a3f7a" stroke-width="1.3"/>`
            + `<circle cx="${cx + 0.4}" cy="${cy + 1}" r="${r * 0.58}" fill="#7f97b0"/><circle cx="${cx + 0.6}" cy="${cy + 1.2}" r="${r * 0.28}" fill="#1c1a22"/>`
            + (lid > 0 ? `<path d="M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} L${cx + r} ${Math.min(cy + r, lidY).toFixed(1)} Q${cx} ${(lidY + 1.5).toFixed(1)} ${cx - r} ${Math.min(cy + r, lidY).toFixed(1)} Z" fill="#a77cc8" stroke="#5a3f7a" stroke-width="1.1"/>` : '')
            + `<path d="M${cx - r * 0.9} ${(lidY).toFixed(1)} L${cx + r * 0.9} ${(lidY).toFixed(1)}" stroke="#3b2a4e" stroke-width="1.2"/>`;
    };
    return `<svg viewBox="0 0 64 52" aria-hidden="true">
        <g stroke="#3b2a4e" stroke-linecap="round">
        <path d="M24 19 Q22 13 19 8" stroke="#6c4a92" stroke-width="2.6" fill="none"/><path d="M38 18 Q41 12 43 6" stroke="#6c4a92" stroke-width="2.6" fill="none"/>
        <path d="M21 20 Q24 16 28 19" stroke="#4b2a6e" stroke-width="3" fill="none"/><path d="M34 19 Q38 15 41 19" stroke="#4b2a6e" stroke-width="3" fill="none"/></g>
        ${eye(19, 9, 5.6)}${eye(43, 6, 5.6)}
        <path d="M11 35 Q11 16 32 16 Q53 16 53 35 Z" fill="#b07ad0" stroke="#4b2a6e" stroke-width="1.6"/>
        <path d="M22 33 Q24 22 34 21 Q44 24 44 33 Z" fill="#8a4fb0" opacity=".55"/>
        <circle cx="30" cy="27" r="1.2" fill="#5a2d7e"/><circle cx="36" cy="25" r="1" fill="#5a2d7e"/><circle cx="33" cy="30" r="1.3" fill="#5a2d7e"/>
        <path d="M15 32 Q15 22 22 18 Q19 25 19 32 Z" fill="#fbf6ff" opacity=".9"/>
        <path d="M5 35 Q32 31 59 35 Q59 39 32 39 Q5 39 5 35 Z" fill="#4b2a6e" stroke="#2d1844" stroke-width="1.2"/>
        <rect x="12" y="38.5" width="40" height="5" rx="2" fill="#f6c9de" stroke="#7a3a6a" stroke-width="1"/>
        ${[17, 24.5, 32, 39.5, 47].map(x => `<circle cx="${x}" cy="41" r="1.9" fill="${lamp}"/>`).join('')}
        <rect x="26" y="43.5" width="12" height="3.5" rx="1.2" fill="#c2337e" stroke="#7a2050" stroke-width=".9"/>
        <g stroke="#7b78d4" stroke-width="2.4" stroke-linecap="round" opacity=".85"><path d="M24 47.5 L21 52"/><path d="M29 47.5 L28 52"/><path d="M35 47.5 L36 52"/><path d="M40 47.5 L43 52"/></g>
    </svg>`;
}

/** Suddet: Alva's eraser, a small pink block worn at one corner, grey with pencil dust at its rubbing end.
 *  No face until Mira draws its eyes (after the finale). */
function suddSvg({ eyes = false, star = false } = {}) {
    return `<svg viewBox="0 0 64 48" aria-hidden="true"><g transform="rotate(-8 32 26)">
        <path d="M9 18 Q9 13 14 13 L50 13 Q55 13 55 18 L55 33 Q55 38 50 38 L16 38 Q9 38 9 31 Z" fill="#f4a7bb" stroke="#9a4a62" stroke-width="1.8"/>
        <path d="M9 24 L9 31 Q9 38 16 38 L22 38 L22 24 Z" fill="#a9a2a8" opacity=".75"/>
        <path d="M12 16 Q30 14 52 16" stroke="#fbd6e0" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M50 13 Q55 13 55 18 L51 18 Z" fill="#e48aa2"/>
        ${eyes ? '<circle cx="34" cy="24" r="4" fill="#fffdf6" stroke="#3b3530" stroke-width="1.2"/><circle cx="35" cy="25" r="1.8" fill="#1c1a22"/><circle cx="45" cy="24" r="4" fill="#fffdf6" stroke="#3b3530" stroke-width="1.2"/><circle cx="46" cy="25" r="1.8" fill="#1c1a22"/><path d="M36 31 Q40 34 44 31" stroke="#3b3530" stroke-width="1.4" fill="none" stroke-linecap="round"/>' : ''}
        ${star ? alvaStar(30, 30, 5, 7) : ''}
        </g><g fill="#f4a7bb" opacity=".8"><circle cx="6" cy="42" r="1.6"/><circle cx="11" cy="45" r="1.2"/></g></svg>`;
}
/** Stora björnen's head, made of stars and thin lines. */
const BJORN_SVG = `<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M8 30 Q6 12 24 9 Q40 4 52 16 Q62 26 54 36 Q44 46 26 42 Q10 40 8 30 Z" fill="#26325e" stroke="#151c38" stroke-width="1.6"/>
    <g stroke="#cfd8f6" stroke-width="1" opacity=".75" fill="none"><path d="M14 18 L20 10 L27 15 L38 10 L44 17 L56 24 L52 33 L40 37 L26 36 L14 30 Z"/><path d="M44 17 L48 26 L56 24"/></g>
    ${[[14, 18], [20, 10], [27, 15], [38, 10], [44, 17], [56, 24], [52, 33], [40, 37], [26, 36], [14, 30], [48, 26]].map(([x, y], i) => plainStar(x, y, i === 5 ? 2.8 : 2, '#fff8dc', 0.95)).join('')}
    <circle cx="36" cy="22" r="2" fill="#fff8dc"/><path d="M33 22 L39 22" stroke="#26325e" stroke-width="1.2"/></svg>`;
/** Kometen: an icy, glowing head with a face that never stops talking, and its dead straight tail. */
const KOMET_SVG = `<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M2 22 L36 18 L36 30 L2 26 Z" fill="#cfefff" opacity=".55"/><path d="M2 24 L36 24" stroke="#8fc9f0" stroke-width="1.4"/>
    <path d="M4 20 H34 M4 28 H34" stroke="#5f8fb0" stroke-width=".9" stroke-dasharray="3 2"/>
    <circle cx="44" cy="24" r="17" fill="#dff4ff" opacity=".45"/><circle cx="44" cy="24" r="12" fill="#bfe6ff" stroke="#3f7aa8" stroke-width="1.8"/>
    <path d="M36 20 Q40 14 48 15" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="41" cy="22" r="2" fill="#1c2a3a"/><circle cx="49" cy="21" r="2" fill="#1c2a3a"/><ellipse cx="46" cy="29" rx="3.2" ry="2.4" fill="#1c2a3a"/></svg>`;
/** Pip: a small old satellite with two panels and an antenna. */
const PIP_SVG = `<svg viewBox="0 0 64 48" aria-hidden="true"><g transform="rotate(-14 32 26)">
    <rect x="4" y="20" width="16" height="12" fill="#4f6fa8" stroke="#24345a" stroke-width="1.4"/><path d="M9.3 20 V32 M14.6 20 V32 M4 26 H20" stroke="#9fb7e6" stroke-width=".9"/>
    <rect x="44" y="20" width="16" height="12" fill="#4f6fa8" stroke="#24345a" stroke-width="1.4"/><path d="M49.3 20 V32 M54.6 20 V32 M44 26 H60" stroke="#9fb7e6" stroke-width=".9"/>
    <path d="M20 26 H24 M40 26 H44" stroke="#5a5a62" stroke-width="2"/>
    <rect x="24" y="17" width="16" height="18" rx="2" fill="#c9c4b8" stroke="#4a4640" stroke-width="1.6"/><circle cx="32" cy="25" r="3.4" fill="#2c2c34" stroke="#8a8a90" stroke-width="1"/><circle cx="33" cy="24" r="1" fill="#fff"/>
    <path d="M32 17 L35 6" stroke="#4a4640" stroke-width="1.4"/><circle cx="35.4" cy="5" r="2" fill="#d8343a"/></g>
    <path d="M50 8 q3 -3 6 0 M53 4 q3 -3 6 0" stroke="#3b3530" stroke-width="1.2" fill="none" opacity=".6"/></svg>`;
// Tukankrabban and Molnet as Äventyr 2 draws them
const TUKAN_SVG = `<svg viewBox="0 0 64 48" aria-hidden="true"><g stroke="#3b3530" stroke-width="1.2"><path d="M22 22 L16 9" stroke="#e8962e" stroke-width="2.6"/><path d="M34 22 L38 11" stroke="#e8962e" stroke-width="2.6"/></g>
    <circle cx="16" cy="8" r="6" fill="#fbfaf4" stroke="#6f6c78" stroke-width="1.2"/><circle cx="16.5" cy="8" r="2.6" fill="#17161c"/>
    <circle cx="38" cy="10" r="5" fill="#fbfaf4" stroke="#6f6c78" stroke-width="1.2"/><circle cx="38.5" cy="10" r="2.2" fill="#17161c"/>
    <path d="M6 40 Q5 20 28 20 Q50 20 50 40 Q28 46 6 40 Z" fill="#f0a12e" stroke="#9a5a14" stroke-width="1.8"/><path d="M22 32 Q28 37 34 32" stroke="#8a4f12" stroke-width="1.8" fill="none"/>
    <ellipse cx="51" cy="30" rx="6" ry="5" fill="#23222a"/><circle cx="52" cy="29" r="2" fill="#fbfaf4"/>
    <path d="M55 26 Q62 26 64 31 L56 32 Z" fill="#f2a23a" stroke="#8b4d1e" stroke-width="1"/><path d="M61 27.5 L64 31 L60 31.5 Z" fill="#1e1d24"/>
    <path d="M55 33 Q61 35 63 34 L56 31 Z" fill="#e0602e"/></svg>`;
const MOLN_SVG = `<svg viewBox="0 0 64 48" aria-hidden="true"><g fill="#b3aecb" stroke="#5f587e" stroke-width="2"><circle cx="18" cy="28" r="11"/><circle cx="30" cy="20" r="14"/>
    <circle cx="44" cy="24" r="12"/><circle cx="32" cy="32" r="12"/></g><g fill="#b3aecb"><circle cx="30" cy="26" r="12"/></g>
    <circle cx="26" cy="26" r="2.4" fill="#2b2840"/><circle cx="38" cy="26" r="2.4" fill="#2b2840"/><path d="M28 34 Q32 31 36 34" stroke="#2b2840" stroke-width="2" fill="none"/></svg>`;

/** Novas kupa: her dome with ten places for the lights she keeps under it. lit: a list of ten booleans. */
const KUPA_SPOTS = [[13, 30], [23, 30.5], [37, 30.5], [47, 30], [18, 22.5], [30, 22], [42, 22.5], [24, 15], [36, 15], [30, 9]];
function kupaSvg(lit, { big = false, hud = false } = {}) {
    const on = (i) => !!lit[i];
    // in the HUD the lights are drawn larger, so a phone shows which of the ten are lit (12 November)
    const [glow, core, hole] = hud ? [6.2, 4.0, 3.1] : [4.4, 2.6, 2.2];
    const lights = KUPA_SPOTS.map(([x, y], i) => on(i)
        ? `<circle cx="${x}" cy="${y}" r="${glow}" fill="#fff1b0" opacity=".45"/><circle cx="${x}" cy="${y}" r="${core}" fill="#ffe27a" stroke="#c99a2c" stroke-width="${hud ? 0.6 : 0}"/><circle cx="${x - 0.9}" cy="${y - 1}" r="${hud ? 1.3 : 0.9}" fill="#fff"/>`
        : `<circle cx="${x}" cy="${y}" r="${hole}" fill="${hud ? '#5a2f82' : 'none'}" stroke="#e3cdf2" stroke-width="${hud ? 1.1 : 0.8}" stroke-dasharray="${hud ? '1.8 1.3' : '1.4 1.2'}" opacity="${hud ? 0.95 : 0.75}"/>`).join('');
    return `<svg viewBox="0 0 60 46" aria-hidden="true">
        <path d="M5 35 Q5 5 30 5 Q55 5 55 35 Z" fill="#9b63c4" stroke="#3e2260" stroke-width="${big ? 1.4 : 1.8}"/>
        <path d="M14 33 Q15 15 30 12 Q45 15 46 33 Z" fill="#6f3a9a" opacity=".45"/>
        <path d="M9 31 Q9 17 18 11 Q14 21 14 31 Z" fill="#fbf6ff" opacity=".55"/>
        ${lights}
        <path d="M1 35 Q30 31 59 35 Q59 40 30 40 Q1 40 1 35 Z" fill="#4b2a6e" stroke="#2d1844" stroke-width="1.2"/>
        ${[13, 21.5, 30, 38.5, 47].map(x => `<circle cx="${x}" cy="37.3" r="1.5" fill="#f08cc0"/>`).join('')}
    </svg>`;
}

/** The constellation Sköldhästen: ten of Alva's stars, joined from one to ten, a horse in front and a shell behind. */
// the constellation Sköldhästen as the sky and the tracing draw it (content/world.mjs), in this 120 × 70 box
const CONSTELLATION = SKY_CONSTELLATION.map(([u, v]) => [Math.round(6 + u * 108), Math.round(6 + v * 58)]);
/** One to ten, and from the chest (ten) up to the neck (two): the body closed, as the sky draws it. */
function constellationPath() { return CONSTELLATION.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + ` L${CONSTELLATION[1][0]} ${CONSTELLATION[1][1]}`; }
function constellationSvg({ numbers = false, w = 120, h = 70 } = {}) {
    const line = constellationPath();
    return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${line}" fill="none" stroke="#f2d470" stroke-width="1.6" stroke-linejoin="round" opacity=".9"/>
        ${CONSTELLATION.map(([x, y], i) => alvaStar(x, y, 4.2, 30 + i) + (numbers ? `<text x="${x + 5}" y="${y - 5}" font-size="7" fill="#f4ecd6">${i + 1}</text>` : '')).join('')}</svg>`;
}

// little stamps on Klo's postcards home: the place each was posted from
const STAMP_ART = {
    mane: '<circle cx="20" cy="22" r="10" fill="#f1e3a6" stroke="#8a7a40" stroke-width="1.2"/><circle cx="16" cy="19" r="2.2" fill="#d6c787"/><circle cx="23" cy="26" r="1.6" fill="#d6c787"/>',
    stjarn: '<rect x="6" y="8" width="28" height="30" fill="#26325e"/>' + [[11, 14], [17, 12], [23, 15], [27, 22], [20, 27], [12, 30]].map(([x, y]) => plainStar(x, y, 2, '#fff8dc')).join('') + '<path d="M11 14 L17 12 L23 15 L27 22 L20 27" stroke="#cfd8f6" stroke-width=".8" fill="none"/>',
    ring: '<rect x="6" y="8" width="28" height="30" fill="#26325e"/><circle cx="20" cy="23" r="8" fill="#e8a6c4" stroke="#7a3a6a" stroke-width="1"/><path d="M12 23 h16" stroke="#f6d36a" stroke-width="2"/><ellipse cx="20" cy="23" rx="14" ry="3.6" fill="none" stroke="#d9e8f6" stroke-width="1.4" transform="rotate(-16 20 23)"/>',
    sudd: '<rect x="6" y="8" width="28" height="30" fill="#26325e"/><path d="M11 18 Q14 11 22 13 Q31 12 29 21 Q32 30 22 31 Q12 33 12 26 Q8 23 11 18 Z" fill="#fbf8f1" stroke="#9a9590" stroke-width=".8"/>',
    end: '<rect x="6" y="8" width="28" height="30" fill="#26325e"/><g transform="translate(5 13) scale(.25)">' + CONSTELLATION.map(([x, y], i) => alvaStar(x, y, 6, 30 + i, { glow: false })).join('') + '</g>',
    answer: '<path d="M8 34 Q8 22 20 22 Q32 22 32 34 Q20 38 8 34 Z" fill="#f0a12e" stroke="#9a5a14" stroke-width="1"/><path d="M15 22 L12 14 M24 22 L26 14" stroke="#e8962e" stroke-width="1.6"/><circle cx="12" cy="13" r="2.6" fill="#fbfaf4" stroke="#6f6c78" stroke-width=".8"/><circle cx="26" cy="13" r="2.4" fill="#fbfaf4" stroke="#6f6c78" stroke-width=".8"/><path d="M20 30 l-3 -3 a2 2 0 0 1 3 -2 a2 2 0 0 1 3 2 z" fill="#d65a6e"/>'
};
const stampSvg = (id) => `<svg viewBox="0 0 40 46" aria-hidden="true"><rect x="2" y="2" width="36" height="42" fill="#fbf6e6" stroke="#b9a988" stroke-width="2" stroke-dasharray="3 2"/>${STAMP_ART[id] || STAMP_ART.mane}</svg>`;

// the places' little pictures (travel card)
const PLACE_ART = {
    mane: '<circle cx="30" cy="30" r="20" fill="#f1e3a6" stroke="#8a7a40" stroke-width="1.6"/><circle cx="23" cy="25" r="4.5" fill="#d6c787"/><circle cx="35" cy="36" r="3.4" fill="#d6c787"/><circle cx="37" cy="22" r="2.4" fill="#d6c787"/>',
    stjarn: [[10, 34], [18, 30], [26, 27], [33, 26], [36, 36], [46, 38], [49, 28]].map(([x, y]) => plainStar(x, y, 2.6, '#fff8dc', 1)).join('') + '<path d="M10 34 L18 30 L26 27 L33 26 L36 36 L46 38 L49 28 L33 26" stroke="#cfd8f6" stroke-width="1" fill="none" stroke-dasharray="3 2"/>',
    ring: '<circle cx="30" cy="30" r="15" fill="#e8a6c4" stroke="#7a3a6a" stroke-width="1.4"/><path d="M16 26 h28 M16 33 h28" stroke="#f6d36a" stroke-width="3" opacity=".9"/><path d="M15 30 h30" stroke="#b79be6" stroke-width="2.4"/><ellipse cx="30" cy="30" rx="27" ry="6.5" fill="none" stroke="#d9e8f6" stroke-width="2.4" transform="rotate(-16 30 30)"/>',
    sudd: '<path d="M14 22 Q18 10 30 13 Q46 11 44 26 Q49 42 31 44 Q15 47 15 37 Q8 32 14 22 Z" fill="#fbf8f1" stroke="#9a9590" stroke-width="1.2"/><path d="M20 30 q6 -4 12 0" stroke="#c8c2bc" stroke-width="2" fill="none"/>',
    vinter: Array.from({ length: 26 }, (_, i) => `<circle cx="${(4 + i * 2.1 + hash(i, 9) * 4).toFixed(1)}" cy="${(52 - i * 1.8 + (hash(i, 8) - 0.5) * 8).toFixed(1)}" r="${(0.8 + hash(i, 7) * 1.2).toFixed(2)}" fill="#fffdf2"/>`).join('') + '<path d="M6 54 L58 6" stroke="#cfefff" stroke-width="1.4" opacity=".6"/>'
};
const placeSvg = (id) => `<svg viewBox="0 0 60 60" aria-hidden="true">${['stjarn', 'sudd', 'vinter', 'ring'].includes(id) ? '<rect x="0" y="0" width="60" height="60" rx="8" fill="#26325e"/>' : '<rect x="0" y="0" width="60" height="60" rx="8" fill="#1f2950"/>'}${PLACE_ART[id] || ''}</svg>`;
// a question mark on a place the story has not named yet
const unknownSvg = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="0" y="0" width="60" height="60" rx="8" fill="#3a3f58"/><text x="30" y="42" text-anchor="middle" font-size="34" fill="#cfc8e6">?</text></svg>';
// Nova's lamp beside a "Stämmer inte": her hypothesis that fell (design 7)
const LAMP_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="#7a5a8e" stroke="#3e2260" stroke-width="1.4"/><circle cx="6" cy="6" r="1.6" fill="#c9b0e0"/></svg>';
// Alva's pencil, red with a pale stripe, sharpened (the speaker's badge and name tag when she speaks in the world)
const ALVA_PENCIL = '<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M8 40 L44 8 L52 14 L16 46 Z" fill="#d0473c" stroke="#7a2420" stroke-width="2"/>'
    + '<path d="M12 41.5 L47 10.5" stroke="#f2b8a8" stroke-width="2.2" opacity=".8"/><path d="M44 8 L48 4.5 L56 10.5 L52 14 Z" fill="#f2d7b8" stroke="#7a2420" stroke-width="1.5"/>'
    + '<path d="M8 40 L4 47 L16 46 Z" fill="#f3e3c4" stroke="#7a2420" stroke-width="1.5"/><path d="M4 47 L7 43" stroke="#3b3530" stroke-width="2"/></svg>';
// a pink crumb, curled, as an eraser leaves them
const CRUMB = (r) => `<svg viewBox="0 0 20 14" aria-hidden="true" style="transform:rotate(${Math.round(r)}deg)"><path d="M3 9 Q2 3 8 3 Q15 2 16 7 Q17 12 11 11 Q6 13 5 9 Q9 9 10 7" fill="#f4a7bb" stroke="#9a4a62" stroke-width="1"/></svg>`;

// ---------------------------------------------------------------------------------------------
export function createA3UI(host, { assetBase, handlers, voice = null }) {
    let suddEyes = false;
    const FACES = {
        // Alva is never drawn: her red pencil (inline, so it shows when a saved game starts without the table's art)
        alva: () => ALVA_PENCIL,
        nova: () => novaSvg({ mood: 'morning' }),
        sudd: () => suddSvg({ eyes: suddEyes, star: suddEyes }),
        bjorn: () => BJORN_SVG, komet: () => KOMET_SVG, pip: () => PIP_SVG, tukan: () => TUKAN_SVG, moln: () => MOLN_SVG
    };
    const ui = createNotebookUI(host, {
        voice,
        assetBase,
        handlers: {
            ...handlers,
            portrait: (who) => {
                if (!FACES[who]) return undefined;
                const face = el('span', 'sk-speaker-face a3-face face-' + who);
                face.setAttribute('aria-hidden', 'true');
                face.innerHTML = FACES[who]();
                return face;
            }
        }
    });
    const root = ui.root;
    root.classList.add('a3');
    const img = (name) => new URL(`${assetBase}assets/${name}.webp`, document.baseURI).href;
    const guide = createGuide(root, { img, portrait: ui.portrait, heroScreen: () => handlers.heroScreen?.(), onGoalTap: () => handlers.openJournal(), voice });
    guide.show(false);

    // --- the counter: Novas kupa, in the HUD where Äventyr 2 counted its eggs ---------------------------
    // (it keeps Äventyr 2's class as well: src/ui.mjs keeps the key prompt and the speaker's mark clear of `.a2-eggs`)
    const kupa = el('div', 'a2-eggs a3-kupa');
    kupa.setAttribute('aria-live', 'polite');
    const kupaIcon = el('span', 'a3-kupa-icon');
    const kupaText = el('span', 'a3-kupa-text');
    kupa.append(kupaIcon, kupaText);
    ui.hud.querySelector('.sk-pencils')?.remove();
    ui.hud.appendChild(kupa);
    let lightsNow = -1;
    function setLights(n, total = 10) {
        if (n === lightsNow) return;
        const grew = lightsNow >= 0 && n > lightsNow;
        lightsNow = n;
        kupaIcon.innerHTML = kupaSvg(Array.from({ length: 10 }, (_, i) => i < n), { hud: true });
        kupaText.textContent = WORDS.lightCount ? WORDS.lightCount(n, total) : `${n} av ${total}`;
        const aria = WORDS.lightAria ? WORDS.lightAria(n, total) : `${n} av ${total}`;
        kupa.setAttribute('aria-label', aria);
        // (as the notebook's heading: "Novas kupa" once she has put a light under it)
        kupa.title = (n ? NOTEBOOK.kupa : WORDS.lights) || WORDS.lights || '';
        if (grew) { kupa.classList.remove('pop'); void kupa.offsetWidth; kupa.classList.add('pop'); }
    }

    // --- the title page: the night notebook, the series' name in coloured pencil, and Nova ------------
    function title({ hasSave, slots = [], onBegin, onContinue, onSwitch, onAdventures }) {
        const t = el('div', 'sk-title a3-title');
        const cover = el('div', 'sk-cover');
        const paper = el('div', 'sk-cover-paper');
        const head = el('div', 'sk-title-head');
        const logo = el('div', 'a3-logo');
        const word = el('h1', 'a3-logo-word', WORDS.title || 'Sköldhästen');
        // Alva's ten-year stars round the name, and one gap where she rubbed one out (a dashed dent)
        const stars = svgBox('a3-logo-stars', `<svg viewBox="0 0 400 120" preserveAspectRatio="none">${
            [[16, 26, 13], [74, 12, 9], [150, 8, 7], [318, 12, 11], [384, 34, 14], [372, 100, 9], [30, 104, 10]].map(([x, y, r], i) => alvaStar(x, y, r, 50 + i, { gold: false })).join('')
        }<path d="${alvaStarPath(232, 10, 9, 99)}" fill="none" stroke="#8a8070" stroke-width="1.4" stroke-dasharray="3 2.5"/></svg>`);
        logo.append(stars, word);
        const sub = el('p', 'a3-sub', WORDS.subtitle || '');
        const face = svgBox('a3-title-nova', novaSvg({ mood: 'morning' }));
        head.append(logo, sub, el('p', 'sk-title-adventure', ADVENTURE_UI.number(3)), face);
        const bb = el('div', 'sk-title-btns');
        const B = ui.button;
        if (hasSave) bb.append(B(WORDS.cont, () => { t.remove(); onContinue(); }, 'primary big'));
        bb.append(B(hasSave ? WORDS.startOver : WORDS.begin, () => {
            if (!hasSave) { t.remove(); onBegin(); return; }
            ui.openPanel((c) => {
                c.classList.add('sk-confirm');
                c.append(el('p', 'sk-ask-q', WORDS.confirmRestart));
                const row = el('div', 'sk-btn-row');
                row.append(B(WORDS.yes, () => { ui.closePanel(); t.remove(); onBegin(); }, 'primary'), B(WORDS.no, () => ui.closePanel()));
                c.append(row);
            }, { kind: 'confirm' });
        }, hasSave ? '' : 'primary big'));
        if (onAdventures) bb.append(B(ADVENTURE_UI.choose, onAdventures, 'sk-choose-adventure'));
        if (onSwitch && (hasSave || slots.length > 1)) bb.append(B(BOOK.switchResearcher, () => onSwitch(() => t.remove())));
        bb.append(B(WORDS.back, () => handlers.quit(), 'quiet'));
        const credit = el('p', 'sk-title-credit', WORDS.credit || '');
        paper.append(head, bb, credit);
        cover.append(paper, el('span', 'sk-cover-gutter'));
        t.append(cover);
        root.appendChild(t);
        bb.querySelector('button')?.focus({ preventScroll: true });
        return () => t.remove();
    }

    // --- the research notebook: Forskningsdagbok · De försvunna stjärnorna (design section 13) ------------
    const NB = NOTEBOOK;
    const TAB_ICONS = ['shell', 'bulb', 'star', 'lens', 'note', 'watch', 'box'];
    const FIRST_PAGE = 1, SECRETS_PAGE = 6;
    const nbText = (k, ...a) => (typeof NB[k] === 'function' ? NB[k](...a) : NB[k] ?? '');

    /** The sky chart: the Moon, the constellations, the ring planet and the white hole, with the rocket's routes.
     *  A place is named once the story has named it; its lights show once it has been visited. */
    function chartSvg({ places, ringo, milky, constellation }) {
        const P = Object.fromEntries(places.map(p => [p.id, p]));
        const vis = (p) => `opacity="${p?.visited ? 1 : 0.42}"`;
        const label = (p) => (p?.named ? p.name : nbText('chartUnknown') || '?');
        const lights = (p) => (!p ? '' : p.visited ? nbText('chartLights', p.found, p.total) : p.named ? nbText('chartLightsUnknown') : '');
        const txt = (x, y, t, size, fill, extra = '') => t ? `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${fill}"${extra}>${esc(t)}</text>` : '';
        let s = '<defs><pattern id="a3-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 4.5 H9" stroke="#3a4a82" stroke-width="2.2" opacity=".55"/></pattern></defs>';
        // the night, laid thick in pencil
        s += '<rect x="6" y="6" width="588" height="318" rx="12" fill="#232f5c"/><rect x="6" y="6" width="588" height="318" rx="12" fill="url(#a3-hatch)"/>';
        s += '<rect x="6" y="6" width="588" height="318" rx="12" fill="none" stroke="#151c38" stroke-width="2.5"/>';
        // the straight stars that were always there
        for (let i = 0; i < 46; i++) s += plainStar(14 + hash(i, 1) * 572, 14 + hash(i, 2) * 300, 1.4 + hash(i, 3) * 2.2, '#e9e4f8', 0.35 + hash(i, 4) * 0.5);
        // Vintergatan, galloped across the whole sky: a river of small white stars
        if (milky) {
            let m = '';
            for (let i = 0; i < 150; i++) {
                const u = i / 149, x = 14 + u * 572, y = 302 - u * 280 + Math.sin(u * 7) * 14 + (hash(i, 6) - 0.5) * 46;
                m += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.7 + hash(i, 5) * 1.6).toFixed(2)}" fill="#fffdf2" opacity="${(0.45 + hash(i, 7) * 0.5).toFixed(2)}"/>`;
            }
            s += `<g>${m}</g>` + txt(338, 150, NB.milky || 'Vintergatan', 21, '#fffdf2', ' font-style="italic" transform="rotate(-25 338 148)" opacity=".85"');
        }
        // the rocket's routes
        const route = (d, on = true) => on ? `<path d="${d}" fill="none" stroke="#f08a70" stroke-width="2.6" stroke-dasharray="8 7" stroke-linecap="round" opacity=".85"/>` : '';
        s += route('M146 210 Q180 150 232 136');
        s += route('M150 248 Q300 292 428 222');
        s += route('M366 110 Q430 70 482 74', !!P.sudd?.named);
        s += route('M486 186 Q520 140 516 102', !!P.sudd?.named);
        // Månen
        const mane = P.mane;
        s += `<g ${vis(mane)}><circle cx="108" cy="228" r="40" fill="#f1e3a6" stroke="#8a7a40" stroke-width="2"/><circle cx="96" cy="216" r="8" fill="#d6c787"/><circle cx="122" cy="240" r="6" fill="#d6c787"/><circle cx="116" cy="208" r="4" fill="#d6c787"/><circle cx="92" cy="244" r="3.4" fill="#d6c787"/></g>`;
        // Stjärnbildsfältet: Karlavagnen and Orions bälte
        const stjarn = P.stjarn, wagon = [[238, 128], [262, 120], [286, 114], [308, 112], [318, 138], [350, 142], [356, 114]];
        s += `<g ${vis(stjarn)}><path d="${wagon.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')} L308 112" fill="none" stroke="#cfd8f6" stroke-width="1.4"/>${wagon.map(([x, y]) => plainStar(x, y, 4, '#fff8dc', 1)).join('')}${[[298, 172], [314, 168], [330, 164]].map(([x, y]) => plainStar(x, y, 4.4, '#fff8dc', 1)).join('')}</g>`;
        // Ringplaneten, in Mira's favourite colours
        const ring = P.ring;
        s += `<g ${vis(ring)}><circle cx="470" cy="212" r="33" fill="#e8a6c4" stroke="#7a3a6a" stroke-width="2"/><path d="M440 200 h60 M438 214 h64 M442 226 h56" stroke="#f6d36a" stroke-width="5" opacity=".85"/><path d="M439 207 h62" stroke="#b79be6" stroke-width="3.4"/><ellipse cx="470" cy="212" rx="62" ry="14" fill="none" stroke="#d9e8f6" stroke-width="4" transform="rotate(-16 470 212)"/></g>`;
        // Det vita hålet: a ragged white patch, a "?" until it is named
        const sudd = P.sudd;
        s += `<g ${vis(sudd)}><path d="M486 58 Q494 34 522 40 Q556 34 552 62 Q562 92 528 96 Q498 102 496 84 Q478 76 486 58 Z" fill="#fbf8f1" stroke="#9a9590" stroke-width="1.6"/><path d="M500 70 q12 -8 26 0 M506 82 q10 -5 20 0" stroke="#c8c2bc" stroke-width="3" fill="none" opacity=".7"/>${sudd?.named ? '' : txt(523, 80, '?', 32, '#6b635a')}</g>`;
        // the constellation Sköldhästen beside the Moon, after the finale
        if (constellation) {
            s += `<g transform="translate(150 236) scale(.62)"><path d="${constellationPath()}" fill="none" stroke="#f2d470" stroke-width="2.4"/>${CONSTELLATION.map(([x, y], i) => alvaStar(x, y, 6, 30 + i)).join('')}</g>`;
            s += txt(214, 300, NB.constellationName || 'Sköldhästen', 19, '#f2d470', ' font-style="italic"');
        }
        // names and lights
        s += txt(108, 292, label(mane), 26, '#f4ecd6') + txt(108, 316, lights(mane), 19, '#cbc4e2');
        s += txt(298, 50, label(stjarn), 26, '#f4ecd6') + txt(298, 74, lights(stjarn), 19, '#cbc4e2');
        s += txt(470, 276, label(ring), 26, '#f4ecd6') + txt(470, 300, lights(ring), 19, '#cbc4e2');
        if (ringo && ring?.named) s += txt(548, 252, NB.ringo || 'Ringo', 23, '#d7bff7', ' font-style="italic" transform="rotate(-8 548 252)"');
        s += txt(522, 124, sudd?.named ? label(sudd) : '', 23, '#f4ecd6') + txt(522, 146, sudd?.named ? lights(sudd) : '', 18, '#cbc4e2');
        // where we are: a red pencil ring
        const ringAt = { mane: [108, 228, 50], stjarn: [298, 138, 74], ring: [470, 212, 70], sudd: [520, 68, 44] };
        const here = places.find(p => p.here);
        if (here && ringAt[here.id]) {
            const [x, y, r] = ringAt[here.id];
            s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#e05a48" stroke-width="3.6"/>`;
        }
        const aria = places.map(p => `${label(p)}${lights(p) ? ' ' + lights(p) : ''}${p.here ? ', ' + String(nbText('chartHere')).toLowerCase() : ''}`).join('. ');
        return `<svg class="a3-chart" viewBox="0 0 600 330" role="img" aria-label="${esc(nbText('chartAria', aria) || aria)}">${s}</svg>`;
    }

    /** A line of Klo's measurements rubbed out: a few dashed remains of letters in a grey smear. */
    function smeared(text, seed = 0) {
        const span = el('span', 'a3-smear');
        const words = String(text).split(/\s+/);
        span.textContent = words.map((w, i) => {
            const r = hash(i + seed * 7, 11);
            if (r < 0.18 && w.length > 1) return w[0] + '‐'.repeat(Math.max(1, Math.round(w.length / 3)));
            return '‐'.repeat(Math.max(1, Math.round(w.length / 2.6)));
        }).join('  ');
        span.setAttribute('aria-hidden', 'true');
        return span;
    }

    function journal(state) {
        const {
            objective = null, lights = 0, total = 10, ended = false, place = '', kupa: under = [], constellation = false,
            hypotheses = [], answered = false, clues = [], facts = [], places = [], ringo = false, milky = false, team = {},
            measures = [], notesRubbed = false, notesInk = false, postcards = [], answerCard = false, secrets = []
        } = state;
        const found = secrets.filter(s => s.found).length;
        const rubbed = notesRubbed && !notesInk;
        let turn = () => {};
        const lit = Array.from({ length: 10 }, (_, i) => (under.length ? !!under[i] : i < lights));
        const pages = [
            // Framsida: the title, Nova's face (grumpy), the first line of the new page, the team
            (c) => {
                c.classList.add('sk-j-cover-page', 'a3-cover');
                c.append(el('h2', 'sk-j-title', NB.title), el('p', 'sk-j-latin', NB.subtitle));
                c.append(svgBox('a3-cover-face', novaSvg({ mood: ended ? 'ordinary' : 'morning' })));
                if (TABLE.newPage) c.append(el('p', 'sk-j-small', TABLE.newPage));
                const teamRow = el('div', 'a3-team');
                // before breakfast Nova has neither joined nor said her name (team.nova is false)
                teamRow.append(el('p', '', ended || team.sudd ? (NB.teamAfter || NB.team) : team.nova === false ? (NB.teamBefore || NB.team) : NB.team));
                if (team.sudd || ended) teamRow.append(svgBox('a3-team-sudd', suddSvg({ eyes: true, star: true })));
                c.append(teamRow, el('p', 'sk-j-credit', WORDS.credit || ''));
            },
            // Vad vet vi?: the mission, why, Novas kupa (the constellation after the finale), where we are, Klo's notes
            (c) => {
                c.classList.add('sk-j-known');
                c.append(el('h3', '', NB.mission));
                if (objective) {
                    c.append(el('p', 'sk-j-question sk-j-mission', objective.text));
                    if (objective.why) c.append(el('h4', '', NB.why), el('p', 'sk-j-recap', objective.why));
                }
                // "Novas kupa" once she has put a light under it (the first light's scene) and said her name
                const unnamed = team.nova === false || (!lights && !constellation);
                c.append(el('h4', '', unnamed ? (NB.kupaBefore || NB.kupa) : NB.kupa));
                if (constellation) {
                    const sky = svgBox('a3-kupa-big a3-constellation', constellationSvg({ numbers: true }), NB.constellationName);
                    c.append(sky);
                    if (NB.constellationNote) c.append(el('p', 'sk-j-small', NB.constellationNote));
                } else {
                    const aria = unnamed && WORDS.lightAria ? WORDS.lightAria(lights, total) : nbText('kupaAria', lights, total);
                    c.append(svgBox('a3-kupa-big', kupaSvg(lit, { big: true }), aria || `${lights} av ${total}`));
                }
                if (place) c.append(el('p', 'sk-j-small a3-here', nbText('here', place)));
                if (ended) {
                    c.append(el('h4', '', NB.secrets), el('p', 'sk-j-recap', nbText('secretsCount', found, secrets.length)));
                    c.append(ui.button(NB.secretsOpen, () => turn(SECRETS_PAGE), 'sk-j-help a3-to-secrets'));
                } else {
                    const box = el('div', 'a3-notes');
                    box.setAttribute('aria-live', 'polite');
                    const ask = ui.button('', () => {
                        state.hint?.();
                        show();
                        box.lastElementChild?.scrollIntoView?.({ block: 'nearest', behavior: root.classList.contains('less-motion') ? 'auto' : 'smooth' });
                    }, 'sk-j-help');
                    const show = () => {
                        const n = state.notes?.() || { given: [], more: false };
                        // the notes already on the page stay as they are; only a new one is taped on
                        const had = [...box.children].map(p => p.dataset.text);
                        if (had.some((t, i) => t !== n.given[i])) box.replaceChildren();
                        for (const t of n.given.slice(box.children.length)) {
                            const note = el('p', 'sk-j-margin on a3-note', t);
                            note.dataset.text = t;
                            note.style.backgroundImage = `url("${img('ui-claw')}")`;
                            note.setAttribute('aria-label', `${NB.noteFrom}: ${t}`);
                            box.append(note);
                        }
                        ask.textContent = n.given.length ? NB.hintMore : NB.hint;
                        ask.prepend(ui.icon('bulb'));
                        if (!n.more && document.activeElement === ask && box.lastElementChild) {
                            box.lastElementChild.tabIndex = -1;
                            box.lastElementChild.focus({ preventScroll: true });
                        }
                        ask.hidden = !n.more;
                    };
                    c.append(el('h4', '', NB.next), box, ask);
                    show();
                }
                c.append(ui.art('npcs', 'klo-point', 'sk-j-klo'));
            },
            // Stjärnkartan
            (c) => {
                c.append(el('h3', '', NB.chart));
                const chart = el('div', 'a3-chart-box');
                chart.innerHTML = chartSvg({ places, ringo, milky, constellation });
                c.append(chart);
                const list = el('ul', 'sk-j-list a3-chart-list');
                for (const p of places) {
                    if (!p.named && !p.visited) continue;
                    const li = el('li', p.here ? 'here' : '', `${p.name}: ${p.visited ? nbText('chartLights', p.found, p.total) : nbText('chartLightsUnknown')}`);
                    if (p.id === 'ring' && ringo) li.append(' ', el('span', 'a3-mira-note', `(${NB.ringo})`));
                    list.append(li);
                }
                if (milky) list.append(el('li', 'a3-milky', NB.milky));
                if (constellation) list.append(el('li', 'a3-gold', NB.constellationName));
                c.append(list);
                if (place) c.append(el('p', 'sk-j-small a3-here', nbText('here', place)));
            },
            // Frågan: the question, the answer, and the numbered hypotheses with their stamps
            (c) => {
                c.append(el('h3', '', NB.question), el('p', 'sk-j-question a3-question', NB.questionText));
                if (answered) c.append(el('h4', '', NB.answer), el('p', 'sk-j-recap a3-answer', NB.answerText));
                c.append(el('h4', '', NB.hypotheses));
                const ol = el('ol', 'a3-hyps');
                hypotheses.forEach((h, i) => {
                    if (!h.said) return;
                    const li = el('li', h.result === 'yes' ? 'proved' : h.result === 'no' ? 'fell' : '');
                    const [who, text] = NB.hyp?.[i] || ['', ''];
                    li.append(el('span', 'a3-hyp-n', `${who}:`), ' ', el('span', 'a3-hyp-t', text));
                    if (h.result === 'yes') li.append(el('span', 'a3-stamp', NB.confirmed));
                    else if (h.result === 'no') {
                        const st = el('span', 'a3-stamp no', NB.notConfirmed);
                        st.prepend(svgBox('a3-stamp-lamp', LAMP_SVG));
                        li.append(st);
                    }
                    ol.append(li);
                });
                c.append(ol);
                if (!hypotheses.some(h => h.said)) c.append(el('p', 'sk-j-small', NB.hypNone || NB.hypMore));
                else if (hypotheses.some(h => !h.said)) c.append(el('p', 'sk-j-small', NB.hypMore));
                c.append(svgBox('a3-page-face', novaSvg({ mood: answered ? 'ordinary' : 'morning' })));
            },
            // Det vet vi: the clues (with what is true after the end), then Novas rymdfakta
            (c) => {
                c.append(el('h3', '', NB.clues));
                if (!clues.length) c.append(el('p', 'sk-j-small', NB.cluesEmpty));
                else {
                    const ul = el('ul', 'sk-j-list sk-j-clues a3-clues');
                    for (const k of clues) {
                        const li = el('li', '', k.text);
                        const after = ended ? NB.cluesAfter?.[k.id] : null;
                        if (after) li.append(' ', el('span', 'a3-pencil-note', after));
                        ul.append(li);
                    }
                    c.append(ul);
                }
                if (facts.length) {
                    c.append(el('h4', 'a3-facts-head', NB.facts));
                    const ul = el('ul', 'sk-j-list a3-facts');
                    for (const f of facts) { const li = el('li', '', f.text); li.prepend(ui.icon('star')); ul.append(li); }
                    c.append(ul);
                }
                c.append(ui.art('npcs', 'klo-notebook', 'sk-j-klo'));
            },
            // Mätningar: Häst eller sköldpadda? (rubbed out from Suddet's three strokes until the ink), then the postcards
            (c) => {
                if (rubbed) c.classList.add('a3-rubbed-page');
                if (notesInk) c.classList.add('a3-ink');
                c.append(el('h3', '', NB.measures));
                const of = (kind) => measures.filter(m => m.kind === kind);
                const horse = of('horse'), turtle = of('turtle'), other = of('other');
                if (rubbed) {
                    // the lines' places are kept; their words are grey smears with a few dashed letters left
                    const intro = el('p', 'sk-j-small');
                    intro.append(smeared(NB.measuresIntro || '', 1));
                    c.append(intro);
                    let k = 2;
                    for (const [titleText, list] of [[NB.horseThings, horse], [NB.turtleThings, turtle], [NB.otherThings, other]]) {
                        if (!list.length) continue;
                        // the old lines are smears; one written since the rub is in pencil, as is a heading over only new ones
                        c.append(list.some(m => m.rubbed !== false) ? smeared('xxxxxx xxxxxx', k++) : el('h4', '', titleText));
                        const ul = el('ul', 'sk-j-list a3-smeared');
                        for (const m of list) {
                            const li = el('li');
                            if (m.rubbed === false) li.append(NB.measure?.[m.id] || m.id); else li.append(smeared(NB.measure?.[m.id] || m.id, k++));
                            ul.append(li);
                        }
                        c.append(ul);
                    }
                    const crumbs = el('div', 'a3-crumbs');
                    crumbs.setAttribute('aria-hidden', 'true');
                    for (let i = 0; i < 7; i++) {
                        const cr = el('span', 'a3-crumb');
                        cr.style.top = `${18 + hash(i, 21) * 64}%`;
                        cr.style.left = `${2 + hash(i, 22) * 9}px`;
                        cr.innerHTML = CRUMB(hash(i, 23) * 360);
                        crumbs.append(cr);
                    }
                    c.append(crumbs, el('p', 'a3-horse-hand', NB.rubbedNote));
                } else {
                    c.append(el('p', 'sk-j-small', NB.measuresIntro));
                    if (!measures.length) c.append(el('p', 'sk-j-small', NB.measuresEmpty));
                    for (const [titleText, list] of [[NB.horseThings, horse], [NB.turtleThings, turtle], [NB.otherThings, other]]) {
                        if (!list.length) continue;
                        const ul = el('ul', 'sk-j-list sk-j-checks');
                        for (const m of list) ul.append(el('li', '', NB.measure?.[m.id] || m.id));
                        c.append(el('h4', '', titleText), ul);
                    }
                    if (horse.length || turtle.length) {
                        const lean = ended ? 0 : horse.length - turtle.length;
                        const verdict = el('div', 'sk-j-verdict');
                        const words = `${nbText('tally', horse.length, turtle.length)} ${lean > 0 ? NB.tallyHorse : lean < 0 ? NB.tallyTurtle : NB.tallyEven}`;
                        verdict.append(el('p', 'sk-j-tally', ended ? nbText('tally', horse.length, turtle.length) : words),
                            ui.art('npcs', ended || lean === 0 ? 'klo-signs' : lean > 0 ? 'sign-hast' : 'sign-skoldpadda', 'sk-j-sign'));
                        c.append(verdict);
                    }
                    if (ended) c.append(el('p', 'sk-j-conclusion', NB.measuresConclusion));
                    if (notesInk) c.append(el('p', 'a3-ink-note', NB.inkNote));
                }
                // the postcards were posted: the eraser never touched them
                const cards = [...postcards];
                if (answerCard && !cards.includes('answer')) cards.push('answer');
                if (cards.length) {
                    const box = el('div', 'a3-postcards');
                    box.append(el('h4', '', NB.postcards));
                    for (const id of cards) {
                        if (!POSTCARDS[id]) continue;
                        const card = el('div', 'a3-postcard' + (id === 'answer' ? ' answer' : ''));
                        card.append(svgBox('a3-stamp-art', stampSvg(id)), el('p', '', POSTCARDS[id]));
                        box.append(card);
                    }
                    c.append(box);
                }
                c.append(ui.art('npcs', 'klo-stopwatch', 'sk-j-klo'));
            },
            // Hemligt: sealed until the end, then the eight secrets
            (c) => {
                c.append(el('h3', '', NB.secrets));
                if (!ended) { c.append(el('p', 'a3-locked', NB.secretsLocked)); return; }
                c.append(el('p', 'sk-j-recap', NB.secretsIntro), el('p', 'sk-j-small', nbText('secretsCount', found, secrets.length)));
                const ul = el('ul', 'sk-j-list a3-secrets');
                for (const s of secrets) {
                    const where = NB.secretWhere?.[s.page] || NB.secretWhere?.any || '';
                    const li = el('li', s.found ? 'found' : 'unknown', s.found ? NB.secret?.[s.id] : nbText('secretUnknown', where));
                    li.prepend(ui.icon(s.found ? 'star' : 'dot'));
                    ul.append(li);
                }
                c.append(ul);
                if (found === secrets.length && secrets.length) c.append(el('p', 'sk-j-conclusion', NB.secretsAll));
            }
        ];
        // the inside of the front cover: a night sky endpaper with Nova and Alva's stars
        const insideCover = (c) => {
            c.classList.add('sk-j-inside', 'a3-inside');
            c.append(el('p', 'sk-j-inside-title', NB.title));
            c.append(svgBox('a3-inside-face', novaSvg({ mood: ended ? 'supernova' : 'morning' })));
            c.append(svgBox('a3-inside-stars', `<svg viewBox="0 0 200 120">${[[20, 20, 8], [60, 92, 6], [150, 14, 7], [182, 70, 9], [110, 104, 5]].map(([x, y, r], i) => alvaStar(x, y, r, 70 + i, { gold: ended, glow: false })).join('')}</svg>`));
        };
        const cls = 'a3-book' + (rubbed ? ' a3-rubbed' : '');
        ui.book({
            pages, tabs: (NB.tabs || []).map((label, i) => ({ label, icon: TAB_ICONS[i] })), head: NB.head, page: FIRST_PAGE,
            insideCover, bind: (go) => { turn = go; }, focusTab: true, cls, onClose: handlers.resume
        });
    }

    // --- the rocket's travel card: "Res" (design 8.6) --------------------------------------------------
    /** places: [{ id, name, open, here, found, total }]. onPick(id) when a place is chosen (onClose is then not
     *  called); onClose when the card is closed without a choice. */
    function travel({ places = [], onPick, onClose } = {}) {
        let picked = false;
        const T = WORDS.travel || {};
        ui.openPanel((c, sheet) => {
            c.classList.add('a3-travel');
            sheet.append(ui.tape('sk-tape-top'));
            c.append(el('h2', '', T.title || ''));
            const grid = el('div', 'a3-travel-grid');
            for (const p of places) {
                const open = !!p.open && !p.here;
                const b = el('button', 'a3-place' + (p.here ? ' here' : '') + (p.open ? '' : ' locked'));
                b.type = 'button';
                b.disabled = !open;
                b.dataset.place = p.id;
                const name = p.open ? p.name : (T.locked || '?');
                b.append(svgBox('a3-place-art', p.open ? placeSvg(p.id) : unknownSvg), el('span', 'a3-place-name', name));
                const sub = p.here ? (T.here || '') : p.open && p.total ? (T.lights ? T.lights(p.found, p.total) : `${p.found} av ${p.total}`) : '';
                if (sub) b.append(el('span', 'a3-place-sub', sub));
                b.setAttribute('aria-label', [name, sub].filter(Boolean).join(', '));
                if (open) b.addEventListener('click', () => { picked = true; ui.closePanel(); onPick?.(p.id); });
                grid.append(b);
            }
            c.append(grid, ui.button(T.stay || WORDS.close || '', () => ui.closePanel(), 'primary a3-stay'));
            const first = grid.querySelector('button:not(:disabled)');
            if (first) first.dataset.focus = '';
        }, { kind: 'travel', onClose: () => { if (!picked) onClose?.(); } });
    }

    // --- the ending card -------------------------------------------------------------------------
    function ending({ nextAdventure } = {}) {
        return new Promise(resolve => {
            let action = { type: 'explore' };
            ui.openPanel((c, sheet) => {
                c.classList.add('sk-ending', 'a3-ending');
                sheet.append(ui.tape('sk-tape-top'));
                c.append(svgBox('a3-ending-stars', `<svg viewBox="0 0 300 40">${Array.from({ length: 10 }, (_, i) => alvaStar(16 + i * 29.8, 20 + Math.sin(i * 1.7) * 4, 10, 80 + i)).join('')}</svg>`));
                c.append(el('h2', '', WORDS.endingTitle), el('p', '', WORDS.endingBody));
                if (nextAdventure?.playable) c.append(ui.button(ADVENTURE_UI.next, () => { action = { type: 'next', adventureId: nextAdventure.id }; ui.closePanel(); }, 'primary'));
                c.append(ui.button(WORDS.endingExplore, () => ui.closePanel(), nextAdventure?.playable ? '' : 'primary'));
                c.append(ui.button(ADVENTURE_UI.choose, () => { action = { type: 'adventures' }; ui.closePanel(); }, 'sk-choose-adventure'));
                c.append(svgBox('a3-ending-nova', novaSvg({ mood: 'supernova' })));
            }, { onClose: () => resolve(action), kind: 'ending' });
        });
    }

    const destroyBook = ui.destroy;
    return Object.assign(ui, {
        guide, setLights, title, journal, travel, ending, names: NAMES,
        /** While the Moon is rubbed out the counter steps aside: on a phone on its side it lay over the Moon's eye. */
        setCinema(on) { if (kupa.classList.contains('aside') !== !!on) kupa.classList.toggle('aside', !!on); },
        /** Mira has drawn Suddet's eyes (after the finale): its face on the speaker tab has them from now on. */
        setSuddEyes(on) { suddEyes = !!on; },
        /** A word in a bubble with the speaker's face, read aloud, while play goes on: [who, text]. */
        remark: ([who, text]) => guide.hint(text, who),
        /** Where a found star-light flies to: Nova's dome in the counter, in the canvas's own units. */
        lightTarget(canvas, screen) {
            const r = kupaIcon.getBoundingClientRect(), c = canvas?.getBoundingClientRect();
            if (!r.width || !c?.width) return null;
            const kx = (screen?.width || c.width) / c.width, ky = (screen?.height || c.height) / c.height;
            return { x: (r.left + r.width / 2 - c.left) * kx, y: (r.top + r.height / 2 - c.top) * ky };
        },
        think: (text) => guide.think(text),
        destroy() { guide.destroy(); destroyBook(); }
    });
}

/** For the dev pages: the faces and drawings as SVG strings. */
export const A3_ART = { novaSvg, suddSvg, kupaSvg, constellationSvg, CONSTELLATION, BJORN_SVG, KOMET_SVG, PIP_SVG };
