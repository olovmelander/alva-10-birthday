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
import { WORDS, NAMES, NOTEBOOK, TABLE } from './content/sv.mjs';
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
};
// a newly hatched tukankrabba (the notebook's egg row after the moon): eyes on stalks, an orange shell, a little beak
const HATCHLING_ICON = '<svg viewBox="0 0 32 28" aria-hidden="true"><path d="M11 13 L8 6 M17 13 L19 6" stroke="#e8962e" stroke-width="2"/>'
    + '<circle cx="8" cy="5" r="3.4" fill="#fbfaf4" stroke="#6f6c78" stroke-width=".9"/><circle cx="8.4" cy="5" r="1.5" fill="#17161c"/>'
    + '<circle cx="19" cy="5.5" r="3" fill="#fbfaf4" stroke="#6f6c78" stroke-width=".9"/><circle cx="19.4" cy="5.5" r="1.3" fill="#17161c"/>'
    + '<path d="M3 24 Q2.5 13 15 13 Q27 13 27 24 Q15 27.5 3 24 Z" fill="#f0a12e" stroke="#9a5a14" stroke-width="1.3"/>'
    + '<path d="M26 18 Q31 18 32 21 L27 21.5 Z" fill="#f2a23a" stroke="#8b4d1e" stroke-width=".8"/><path d="M12 20 Q15 22.5 18 20" stroke="#8a4f12" stroke-width="1.2" fill="none"/></svg>';
const EGG_ICON = '<svg viewBox="0 0 24 30" aria-hidden="true"><ellipse cx="12" cy="16" rx="9.5" ry="12.5" fill="#f7f1e3" stroke="#8d8068" stroke-width="1.6"/><ellipse cx="9" cy="18" rx="4" ry="6" fill="#f3d6dc" opacity=".8"/><ellipse cx="8.5" cy="10" rx="2" ry="3.2" fill="#fff"/></svg>';

export function createA2UI(host, { assetBase, handlers, voice = null }) {
    const ui = createNotebookUI(host, {
        voice,
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
    const guide = createGuide(root, { img, portrait: ui.portrait, heroScreen: () => handlers.heroScreen?.(), onGoalTap: () => handlers.openJournal(), voice });
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

    // --- the research notebook: Forskningsdagbok – Den magiska skogen ---------------------------------
    // Äventyr 1's book (src/ui.mjs book: tabs, grid paper, a spread on a wide screen, pages that turn) with this
    // adventure's pages: the title page; what we know now (the mission, the eggs that become ten hatchlings, Klo's
    // notes); the map; the question with Tukankrabban's numbered hypotheses, stamped when the story proves them, and
    // its answer; what the research team has found out (facts the moon made untrue struck out in pencil); and the
    // secrets found after the story.
    const NB = NOTEBOOK;
    const TAB_ICONS = ['shell', 'bulb', 'lens', 'cloud', 'watch', 'note', 'star'];
    const FIRST_PAGE = 1, SECRETS_PAGE = 6;

    /** The map: the forest and the river beach side by side, then the mountain with the crystal cave in its foot and
     *  Åsktoppen at its top. A page is named once the story has named it; its eggs show once it has been visited. */
    function mapSvg(places) {
        const P = Object.fromEntries(places.map(p => [p.id, p]));
        const fade = (p) => `opacity="${p?.visited ? 1 : 0.38}"`;
        const label = (p) => (p?.named ? p.name : NB.mapUnknown);
        const eggs = (p) => (!p ? '' : p.visited ? NB.mapEggs(p.found, p.total) : p.named ? NB.mapEggsUnknown : '');
        const skog = P.skog, strand = P.strand, kristall = P.kristall, topp = P.topp;
        let s = '';
        // the routes: Mira's bridge into the forest, the current under the falls into the mountain, the spring up to the top
        s += '<path d="M150 176 Q186 158 214 172" fill="none" stroke="#8a6cc0" stroke-width="3" stroke-dasharray="7 6"/>';
        s += '<path d="M334 174 Q370 186 420 176" fill="none" stroke="#5d8eaa" stroke-width="3" stroke-dasharray="7 6"/>';
        s += '<path d="M470 158 Q462 120 476 82" fill="none" stroke="#6fa8c8" stroke-width="3" stroke-dasharray="7 6"/>';
        // Djupa skogen: firs and the giant tree
        s += `<g ${fade(skog)}><path d="M40 180 L58 118 L76 180 Z M70 180 L94 96 L118 180 Z M108 180 L124 130 L140 180 Z" fill="#4f7c50" stroke="#2f4f30" stroke-width="2"/><path d="M93 180 v-18" stroke="#6a4b2c" stroke-width="5"/></g>`;
        // Flodstranden: the sand bank with the nest, and the river
        s += `<g ${fade(strand)}><path d="M206 180 Q262 164 318 180" fill="none" stroke="#d9c08a" stroke-width="10"/><path d="M286 178 Q306 164 338 174" fill="none" stroke="#5d8eaa" stroke-width="8"/><ellipse cx="252" cy="173" rx="16" ry="6" fill="#c5a96f" stroke="#8a7146" stroke-width="1.5"/></g>`;
        // the mountain: Åsktoppen at the top
        s += `<g ${fade(topp)}><path d="M384 186 L480 46 L576 186 Z" fill="#7a7486" stroke="#3b3546" stroke-width="2.2"/><path d="M480 46 L466 70 L476 68 L470 86 L486 64 L476 66 Z" fill="#e4e7f4"/><path d="M450 34 q30 -24 60 0 q-30 -8 -60 0" fill="#5d5a7e"/></g>`;
        // Kristallgrottan: the cave in the mountain's foot
        s += `<g ${fade(kristall)}><path d="M440 186 Q440 144 470 140 Q500 144 500 186 Z" fill="#3e3a4c" stroke="#2a2633" stroke-width="2"/><path d="M456 182 l7 -18 l7 18 z M474 182 l6 -14 l6 14 z" fill="#bfe6ff" stroke="#5f8fb0" stroke-width="1.2"/></g>`;
        // names and eggs: under the forest, the beach and the mountain's foot; the top's above it
        const txt = (x, y, t, size, fill, extra = '') => t ? `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${fill}"${extra}>${t}</text>` : '';
        s += txt(92, 214, label(skog), 26, '#3b3530') + txt(92, 240, eggs(skog), 21, '#6b5f4d');
        s += txt(268, 214, label(strand), 26, '#3b3530') + txt(268, 240, eggs(strand), 21, '#6b5f4d');
        s += txt(476, 214, label(kristall), 26, '#3b3530') + txt(476, 240, eggs(kristall), 21, '#6b5f4d');
        s += txt(480, 24, [label(topp), eggs(topp)].filter(Boolean).join(' · '), 22, '#3b3530');
        // where we are: a red pencil ring
        const ring = { skog: [92, 150, 52], strand: [268, 172, 54], kristall: [470, 166, 34], topp: [480, 64, 30] };
        const here = places.find(p => p.here);
        if (here && ring[here.id]) {
            const [x, y, r] = ring[here.id];
            s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#c0392b" stroke-width="3.4"/>`;
            // the words under the place's name (the top's beside its peak), never on the drawings
            s += here.id === 'topp' ? txt(560, 66, NB.mapHere, 21, '#c0392b') : txt(here.id === 'skog' ? 92 : here.id === 'strand' ? 268 : 476, 266, NB.mapHere, 21, '#c0392b');
        }
        const aria = places.map(p => `${label(p)}${eggs(p) ? ' ' + eggs(p) : ''}${p.here ? ', ' + NB.mapHere.toLowerCase() : ''}`).join('. ');
        return `<svg class="a2-map" viewBox="0 0 600 274" role="img" aria-label="${NB.mapAria(aria)}">${s}</svg>`;
    }

    /** Ten eggs, found or not; once they have hatched, ten little tukankrabbor (the smallest, Lilla Klo, last). */
    function eggRow(found, total, hatched) {
        const row = el('div', 'a2-egg-row' + (hatched ? ' a2-hatchlings' : ''));
        row.setAttribute('role', 'img');
        row.setAttribute('aria-label', hatched ? NB.hatchedAria : NB.eggsAria(found, total));
        for (let i = 0; i < total; i++) {
            const e = el('span', hatched ? 'a2-hatchling' + (i === total - 1 ? ' lilla' : '') : 'a2-egg' + (i < found ? ' found' : ''));
            e.innerHTML = hatched ? HATCHLING_ICON : EGG_ICON;
            row.append(e);
        }
        return row;
    }

    function journal(state) {
        const { objective, eggs, total, hatched, ended, hypotheses, answered, moon, clues, places, secrets, measures = [], place } = state;
        const found = secrets.filter(s => s.found).length;
        let turn = () => {};
        const pages = [
            // the title page
            (c) => {
                c.classList.add('sk-j-cover-page', 'a2-cover');
                c.append(el('h2', 'sk-j-title', NB.title), el('p', 'sk-j-latin', NB.subtitle));
                const face = el('span', 'a2-cover-face');
                face.setAttribute('aria-hidden', 'true');
                face.innerHTML = FACES.tukan;
                c.append(face, el('p', 'sk-j-small', TABLE.newPage), el('p', 'a2-team', NB.team), el('p', 'sk-j-credit', WORDS.credit));
            },
            // what we know now: the mission, the eggs, where we are, and Klo's notes
            (c) => {
                c.classList.add('sk-j-known');
                c.append(el('h3', '', NB.mission));
                if (objective) {
                    c.append(el('p', 'sk-j-question sk-j-mission', objective.text));
                    if (objective.why) c.append(el('h4', '', NB.why), el('p', 'sk-j-recap', objective.why));
                }
                c.append(el('h4', '', hatched ? NB.hatched : NB.eggs), eggRow(eggs, total, hatched));
                if (place) c.append(el('p', 'sk-j-small a2-here', NB.here(place)));
                if (ended) {
                    c.append(el('h4', '', NB.secrets), el('p', 'sk-j-recap', NB.secretsCount(found, secrets.length)));
                    c.append(ui.button(NB.secretsOpen, () => turn(SECRETS_PAGE), 'sk-j-help a2-to-secrets'));
                } else {
                    const box = el('div', 'a2-notes');
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
                            const note = el('p', 'sk-j-margin on a2-note', t);
                            note.dataset.text = t;
                            note.style.backgroundImage = `url("${img('ui-claw')}")`;
                            note.setAttribute('aria-label', `${NB.noteFrom}: ${t}`);
                            box.append(note);
                        }
                        ask.textContent = n.given.length ? NB.hintMore : NB.hint;
                        ask.prepend(ui.icon('bulb'));
                        // when the last note is out the button goes; focus stays on what was just read
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
            // the map
            (c) => {
                c.append(el('h3', '', NB.map));
                const map = el('div', 'a2-map-box');
                map.innerHTML = mapSvg(places);
                c.append(map);
                const list = el('ul', 'sk-j-list a2-map-list');
                for (const p of places) {
                    if (!p.named && !p.visited) continue;
                    const li = el('li', p.here ? 'here' : '', `${p.name}: ${p.visited ? NB.mapEggs(p.found, p.total) : NB.mapEggsUnknown}`);
                    list.append(li);
                }
                c.append(list);
                if (place) c.append(el('p', 'sk-j-small a2-here', NB.here(place)));
            },
            // the question, the answer, and Tukankrabban's hypotheses
            (c) => {
                c.append(el('h3', '', NB.question), el('p', 'sk-j-question a2-question', NB.questionText));
                if (answered) {
                    c.append(el('h4', '', NB.answer), el('p', 'sk-j-recap a2-answer', NB.answerText));
                    if (moon) c.append(el('p', 'sk-j-recap a2-answer', NB.answerMoon));
                }
                c.append(el('h4', '', NB.hypotheses));
                const ol = el('ol', 'a2-hyps');
                hypotheses.forEach((h, i) => {
                    if (!h.said) return;
                    const li = el('li', h.confirmed ? 'proved' : '');
                    li.append(el('span', 'a2-hyp-n', NB.hyp[i][0] + ':'), ' ', el('span', 'a2-hyp-t', NB.hyp[i][1]));
                    if (h.confirmed) li.append(el('span', 'a2-stamp', NB.confirmed));
                    ol.append(li);
                });
                c.append(ol);
                if (hypotheses.some(h => !h.said)) c.append(el('p', 'sk-j-small', NB.hypMore));
                const face = el('span', 'a2-page-face');
                face.setAttribute('aria-hidden', 'true');
                face.innerHTML = FACES.tukan;
                c.append(face);
            },
            // Häst eller sköldpadda? Klo's measurements, as in Äventyr 1: the hooves' things and the shell's, a tally with
            // his sign, his other readings, and after the story the conclusion
            (c) => {
                c.append(el('h3', '', NB.measures), el('p', 'sk-j-small', NB.measuresIntro));
                const of = (kind) => measures.filter(m => m.kind === kind);
                const horse = of('horse'), turtle = of('turtle'), other = of('other');
                if (!measures.length) c.append(el('p', 'sk-j-small', NB.measuresEmpty));
                for (const [title, list] of [[NB.horseThings, horse], [NB.turtleThings, turtle], [NB.otherThings, other]]) {
                    if (!list.length) continue;
                    const ul = el('ul', 'sk-j-list sk-j-checks');
                    for (const m of list) ul.append(el('li', '', NB.measure[m.id]));
                    c.append(el('h4', '', title), ul);
                }
                if (horse.length || turtle.length) {
                    const lean = ended ? 0 : horse.length - turtle.length;
                    const verdict = el('div', 'sk-j-verdict');
                    const words = `${NB.tally(horse.length, turtle.length)} ${lean > 0 ? NB.tallyHorse : lean < 0 ? NB.tallyTurtle : NB.tallyEven}`;
                    verdict.append(el('p', 'sk-j-tally', ended ? NB.tally(horse.length, turtle.length) : words),
                        ui.art('npcs', ended || lean === 0 ? 'klo-signs' : lean > 0 ? 'sign-hast' : 'sign-skoldpadda', 'sk-j-sign'));
                    c.append(verdict);
                }
                if (ended) c.append(el('p', 'sk-j-conclusion', NB.measuresConclusion));
                c.append(ui.art('npcs', 'klo-stopwatch', 'sk-j-klo'));
            },
            // what the research team has found out
            (c) => {
                c.append(el('h3', '', NB.clues));
                if (!clues.length) { c.append(el('p', 'sk-j-small', NB.cluesEmpty)); return; }
                const ul = el('ul', 'sk-j-list sk-j-clues a2-clues');
                for (const k of clues) {
                    const li = el('li');
                    if (moon && NB.struck[k.id]) {
                        li.classList.add('struck');
                        li.append(el('s', '', k.text), ' ', el('span', 'a2-pencil-note', NB.struck[k.id]));
                    } else {
                        li.append(k.text);
                        if (answered && NB.answered[k.id]) li.append(' ', el('span', 'a2-pencil-note', NB.answered[k.id]));
                    }
                    ul.append(li);
                }
                c.append(ul);
                c.append(ui.art('npcs', 'klo-notebook', 'sk-j-klo'));
            },
            // the secrets found after the story
            (c) => {
                c.append(el('h3', '', NB.secrets));
                if (!ended) {
                    c.append(el('p', 'a2-locked', NB.secretsLocked));
                    return;
                }
                c.append(el('p', 'sk-j-recap', NB.secretsIntro), el('p', 'sk-j-small', NB.secretsCount(found, secrets.length)));
                const ul = el('ul', 'sk-j-list a2-secrets');
                for (const s of secrets) {
                    const li = el('li', s.found ? 'found' : 'unknown', s.found ? NB.secret[s.id] : NB.secretUnknown(NB.secretWhere[s.page]));
                    li.prepend(ui.icon(s.found ? 'star' : 'dot'));
                    ul.append(li);
                }
                c.append(ul);
                if (found === secrets.length) c.append(el('p', 'sk-j-conclusion', NB.secretsAll));
            }
        ];
        // the inside of the front cover, left of the title page on a spread
        const insideCover = (c) => {
            c.classList.add('sk-j-inside', 'a2-inside');
            c.append(el('p', 'sk-j-inside-title', NB.title));
            const face = el('span', 'a2-inside-face');
            face.setAttribute('aria-hidden', 'true');
            face.innerHTML = FACES.tukan;
            c.append(face, ui.icon('cloud', 'sk-doodle d-cloud'), ui.icon('star', 'sk-doodle d-g1'), ui.icon('star', 'sk-doodle d-g2'), ui.icon('wave', 'sk-doodle d-wave'));
        };
        ui.book({
            pages, tabs: NB.tabs.map((label, i) => ({ label, icon: TAB_ICONS[i] })), head: NB.head, page: FIRST_PAGE,
            insideCover, bind: (go) => { turn = go; }, focusTab: true, cls: 'a2-book', onClose: handlers.resume
        });
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
        /** Where a picked-up egg flies to: the count's egg, in the canvas's own units (view.mjs startPickup). */
        eggTarget(canvas, screen) {
            const r = eggIcon.getBoundingClientRect(), c = canvas?.getBoundingClientRect();
            if (!r.width || !c?.width) return null;
            const kx = (screen?.width || c.width) / c.width, ky = (screen?.height || c.height) / c.height;
            return { x: (r.left + r.width / 2 - c.left) * kx, y: (r.top + r.height / 2 - c.top) * ky };
        },
        think: (text) => guide.think(text),
        destroy() { guide.destroy(); destroyBook(); }
    });
}
