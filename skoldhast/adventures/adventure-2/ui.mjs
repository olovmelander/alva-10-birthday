/*
 * Äventyr 2 – the interface: Adventure 1's notebook UI (src/ui.mjs: dialogue,
 * controls, panels, settings, the adventure picker, Alva's drawing pad) and its
 * guide (src/guide.mjs: the goal note, thoughts, hints), plus this adventure's
 * own pieces: the title page, the egg count, "Vad vet vi?", the faces of the
 * new characters and the ending card. The look is skoldhast.css with a few
 * additions in a2.css.
 */
import { createUI as createNotebookUI } from '../../src/ui.mjs';
import { createGuide } from '../../src/guide.mjs';
import { WORDS, NAMES } from './content/sv.mjs';
import { ADVENTURE_UI, UI as BOOK } from '../../src/content/sv.mjs';

const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
};

// small faces for the speaker tab (drawn here, in the same pencil colours as the game)
const FACES = {
    tukan: `<svg viewBox="0 0 64 48" aria-hidden="true"><g stroke="#3b3530" stroke-width="1.2"><path d="M22 22 L16 9" stroke="#e8962e" stroke-width="2.6"/><path d="M34 22 L38 11" stroke="#e8962e" stroke-width="2.6"/></g>
        <circle cx="16" cy="8" r="6" fill="#fbfaf4" stroke="#6f6c78" stroke-width="1.2"/><circle cx="16.5" cy="8" r="2.6" fill="#17161c"/>
        <circle cx="38" cy="10" r="5" fill="#fbfaf4" stroke="#6f6c78" stroke-width="1.2"/><circle cx="38.5" cy="10" r="2.2" fill="#17161c"/>
        <path d="M6 40 Q5 20 28 20 Q50 20 50 40 Q28 46 6 40 Z" fill="#f0a12e" stroke="#9a5a14" stroke-width="1.8"/><path d="M22 32 Q28 37 34 32" stroke="#8a4f12" stroke-width="1.8" fill="none"/>
        <ellipse cx="51" cy="30" rx="6" ry="5" fill="#23222a"/><circle cx="52" cy="29" r="2" fill="#fbfaf4"/>
        <path d="M55 26 Q62 26 64 31 L56 32 Z" fill="#f2a23a" stroke="#8b4d1e" stroke-width="1"/><path d="M61 27.5 L64 31 L60 31.5 Z" fill="#1e1d24"/>
        <path d="M55 33 Q61 35 63 34 L56 31 Z" fill="#e0602e"/></svg>`,
    skata: `<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M6 34 L30 26 L30 32 Z" fill="#24242c"/><ellipse cx="34" cy="30" rx="14" ry="10" fill="#24242c"/>
        <ellipse cx="37" cy="33" rx="9" ry="5" fill="#f6f3ea"/><circle cx="46" cy="18" r="9" fill="#24242c"/><circle cx="49" cy="16" r="2.4" fill="#fff"/>
        <path d="M54 18 L63 20 L54 22 Z" fill="#1a1a1a"/></svg>`,
    dyvel: `<svg viewBox="0 0 64 48" aria-hidden="true"><ellipse cx="28" cy="30" rx="18" ry="12" fill="#23314a" stroke="#3b3530" stroke-width="2"/>
        <ellipse cx="22" cy="25" rx="7" ry="3" fill="#6c86b8"/><ellipse cx="48" cy="30" rx="8" ry="6" fill="#1b2638"/>
        <path d="M51 25 L58 14 M49 25 L51 13" stroke="#3b3530" stroke-width="2"/><path d="M45 27 L51 28" stroke="#111" stroke-width="2"/></svg>`,
    moln: `<svg viewBox="0 0 64 48" aria-hidden="true"><g fill="#b3aecb" stroke="#5f587e" stroke-width="2"><circle cx="18" cy="28" r="11"/><circle cx="30" cy="20" r="14"/>
        <circle cx="44" cy="24" r="12"/><circle cx="32" cy="32" r="12"/></g><g fill="#b3aecb"><circle cx="30" cy="26" r="12"/></g>
        <circle cx="26" cy="26" r="2.4" fill="#2b2840"/><circle cx="38" cy="26" r="2.4" fill="#2b2840"/><path d="M28 34 Q32 31 36 34" stroke="#2b2840" stroke-width="2" fill="none"/></svg>`,
    mira: `<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M8 40 L44 8 L52 14 L16 46 Z" fill="#a98ad0" stroke="#5e4a7d" stroke-width="2"/>
        <path d="M8 40 L4 47 L16 46 Z" fill="#f3e3c4" stroke="#5e4a7d" stroke-width="1.5"/><path d="M4 47 L7 43" stroke="#3b3530" stroke-width="2"/></svg>`,
    alva: `<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M8 40 L44 8 L52 14 L16 46 Z" fill="#6c9a5a" stroke="#3f5f33" stroke-width="2"/>
        <path d="M8 40 L4 47 L16 46 Z" fill="#f3e3c4" stroke="#3f5f33" stroke-width="1.5"/><path d="M4 47 L7 43" stroke="#3b3530" stroke-width="2"/></svg>`
};
const EGG_ICON = '<svg viewBox="0 0 24 30" aria-hidden="true"><ellipse cx="12" cy="16" rx="9.5" ry="12.5" fill="#f7f1e3" stroke="#8d8068" stroke-width="1.6"/><ellipse cx="9" cy="18" rx="4" ry="6" fill="#f3d6dc" opacity=".8"/><ellipse cx="8.5" cy="10" rx="2" ry="3.2" fill="#fff"/></svg>';

export function createA2UI(host, { assetBase, handlers }) {
    const ui = createNotebookUI(host, {
        assetBase,
        handlers: {
            ...handlers,
            portrait: (who) => {
                if (!FACES[who]) return undefined;
                const face = el('span', 'sk-speaker-face a2-face face-' + who);
                face.setAttribute('aria-hidden', 'true');
                face.innerHTML = FACES[who];
                return face;
            }
        }
    });
    const root = ui.root;
    root.classList.add('a2');
    const img = (name) => new URL(`${assetBase}assets/${name}.webp`, document.baseURI).href;
    const guide = createGuide(root, { img, portrait: ui.portrait, heroScreen: () => handlers.heroScreen?.(), onGoalTap: () => handlers.openJournal() });
    guide.show(false);

    // the egg count in the HUD, where Adventure 1 counts her pencils
    const eggs = el('div', 'a2-eggs');
    eggs.setAttribute('aria-live', 'polite');
    const eggIcon = el('span', 'a2-egg-icon'); eggIcon.innerHTML = EGG_ICON;
    const eggText = el('span', 'a2-egg-text');
    eggs.append(eggIcon, eggText);
    ui.hud.querySelector('.sk-pencils')?.remove();
    ui.hud.appendChild(eggs);
    let eggNow = -1;
    function setEggs(n, total) {
        if (n === eggNow) return;
        const grew = eggNow >= 0 && n > eggNow;
        eggNow = n;
        eggText.textContent = WORDS.eggCount(n, total);
        eggs.setAttribute('aria-label', WORDS.eggAria(n, total));
        eggs.title = WORDS.eggs;
        if (grew) { eggs.classList.remove('pop'); void eggs.offsetWidth; eggs.classList.add('pop'); }
    }

    // --- the title page ----------------------------------------------------------------
    function title({ hasSave, slots, onBegin, onContinue, onSwitch, onAdventures }) {
        const t = el('div', 'sk-title a2-title');
        const cover = el('div', 'sk-cover');
        const paper = el('div', 'sk-cover-paper');
        const head = el('div', 'sk-title-head');
        const logoBox = el('div', 'a2-logo');
        const logo = el('img', 'a2-logo-img'); logo.alt = WORDS.title; logo.src = img('ui-title');
        logo.onerror = () => logoBox.replaceWith(el('h1', 'sk-title-text', WORDS.title));
        logoBox.append(logo);
        const sub = el('p', 'a2-sub', WORDS.subtitle);
        head.append(logoBox, sub, el('p', 'sk-title-adventure', ADVENTURE_UI.number(2)));
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
        const credit = el('p', 'sk-title-credit', WORDS.credit);
        paper.append(head, bb, credit);
        cover.append(paper);
        t.append(cover);
        root.appendChild(t);
        bb.querySelector('button')?.focus({ preventScroll: true });
        return () => t.remove();
    }

    // --- "Vad vet vi?": the mission, what we know, and help ------------------------------
    function journal({ objective, clues, eggsFound, total, hint, place }) {
        ui.openPanel((c, sheet) => {
            c.classList.add('a2-journal');
            sheet.append(ui.tape('sk-tape-top'));
            c.append(el('h2', '', WORDS.known));
            if (objective) {
                c.append(el('p', 'sk-j-question sk-j-mission', objective.text));
                if (objective.why) c.append(el('p', 'sk-j-recap', objective.why));
            }
            const row = el('div', 'a2-egg-row');
            for (let i = 0; i < total; i++) { const e = el('span', 'a2-egg' + (i < eggsFound ? ' found' : '')); e.innerHTML = EGG_ICON; row.append(e); }
            row.setAttribute('aria-label', WORDS.eggAria(eggsFound, total));
            c.append(row);
            if (place) c.append(el('p', 'sk-j-small a2-here', WORDS.here(place)));
            c.append(el('h3', '', WORDS.knownTitle));
            if (clues.length) { const ul = el('ul', 'sk-j-list'); for (const k of clues) ul.append(el('li', '', k)); c.append(ul); }
            else c.append(el('p', 'sk-j-small', WORDS.knownEmpty));
            const hintBox = el('p', 'sk-j-help a2-hint');
            hintBox.setAttribute('aria-live', 'polite');
            const more = ui.button(WORDS.hint, () => {
                const h = hint();
                hintBox.textContent = h?.text || WORDS.noHint;
                more.textContent = WORDS.hintMore;
            });
            c.append(hintBox, more, ui.button(WORDS.close, () => ui.closePanel(), 'primary'));
        }, { kind: 'journal', onClose: handlers.resume });
    }

    // --- the ending card -------------------------------------------------------------------
    function ending({ nextAdventure } = {}) {
        return new Promise(resolve => {
            let action = { type: 'explore' };
            ui.openPanel((c, sheet) => {
                c.classList.add('sk-ending');
                sheet.append(ui.tape('sk-tape-top'));
                const row = el('div', 'a2-egg-row hatched');
                for (let i = 0; i < 10; i++) { const e = el('span', 'a2-egg found'); e.innerHTML = EGG_ICON; row.append(e); }
                c.append(row, el('h2', '', WORDS.endingTitle), el('p', '', WORDS.endingBody));
                if (nextAdventure?.playable) c.append(ui.button(ADVENTURE_UI.next, () => { action = { type: 'next', adventureId: nextAdventure.id }; ui.closePanel(); }, 'primary'));
                c.append(ui.button(WORDS.endingExplore, () => ui.closePanel(), nextAdventure?.playable ? '' : 'primary'));
                c.append(ui.button(ADVENTURE_UI.choose, () => { action = { type: 'adventures' }; ui.closePanel(); }, 'sk-choose-adventure'));
            }, { onClose: () => resolve(action), kind: 'ending' });
        });
    }

    const destroyBook = ui.destroy;
    return Object.assign(ui, {
        guide, setEggs, title, journal, ending, names: NAMES,
        think: (text) => guide.think(text),
        destroy() { guide.destroy(); destroyBook(); }
    });
}
