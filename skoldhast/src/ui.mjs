/*
 * Sköldhästen – the DOM interface: title, dialogue, choices, toasts, captions,
 * the journal (Forskningsdagbok), pause and settings, chapter reports, and the
 * drawing overlay for Alva's pencil. All text is Swedish (content/sv.mjs).
 *
 * The menus are a hand-made research notebook (skoldhast.css): paper, pencil
 * frames and colored-pencil fills, tape, a stamp and drawn icons (all drawn in
 * code by scripts/skoldhast-art/ui.mjs), plus a few of the game's own drawings
 * (Klo, her pencils, the eraser) cut from atlases the game has already loaded.
 *
 * The UI never changes the game directly; it returns promises and calls the
 * handlers main.mjs gives it.
 */
import { UI, ADVENTURE_UI, NAMES, JOURNAL, HINTS, HER_TEXT, WORD_CODES, FAMILY, MENU, MAP, DRAWING, THREAD, KLO_COMPANION } from './content/sv.mjs';
import { describeThread } from './story-thread.mjs';

import { createMapBook, createMapThumb } from './mapbook.mjs';
import { createDrawing } from './drawing.mjs';

const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
};

// the handwriting (@font-face in skoldhast.css): ask for it at once, so the title rarely has to swap fonts
const wantFont = () => { try { document.fonts?.load('20px "Patrick Hand"').catch(() => {}); } catch { /* no font loading API */ } };
wantFont();

/** A drawn icon from ui-icons.webp (names as in scripts/skoldhast-art/ui.mjs). */
const icon = (name, cls = '') => {
    const i = el('span', `sk-ic sk-ic-${name}${cls ? ' ' + cls : ''}`);
    i.setAttribute('aria-hidden', 'true');
    return i;
};

/** A doodle in the margin (the third row of ui-icons.webp), placed by its class in skoldhast.css. */
const doodle = (name, cls) => icon(name, 'sk-doodle ' + cls);

// the journal's tabs: one icon for each page
const TAB_ICONS = ['shell', 'pencil', 'bulb', 'watch', 'lens', 'report', 'note'];

export function createUI(host, { assetBase, handlers }) {
    const root = el('div', 'sk-ui');
    host.appendChild(root);
    wantFont();
    // iOS Safari shows :active (the buttons' press) only under a touchstart listener
    root.addEventListener('touchstart', () => {}, { passive: true });
    // Capturing runs before a button replaces its sheet; keyboard clicks and
    // touch therefore get the same quiet notebook feedback. Page turns have
    // their own sound below, including the arrow-key shortcut.
    root.addEventListener('click', e => {
        const b = e.target.closest?.('button');
        if (!b || b.disabled || b.closest('.sk-controls, .sk-dialogue, .sk-draw, .sk-mapbook') || b.matches('.sk-j-tab, .sk-j-arrow, .sk-journal-btn')) return;
        handlers.onMenuSound?.('ui');
    }, true);
    root.addEventListener('change', e => { if (e.target.matches?.('.sk-settings input')) handlers.onMenuSound?.('ui'); });
    // absolute, because a url() inside a CSS variable resolves against the stylesheet, not the page
    const asset = (file) => new URL(`${assetBase}assets/${file}`, document.baseURI).href;
    const img = (name) => asset(`${name}.webp`);
    for (const [v, name] of [
        ['paper', 'ui-paper'], ['frame', 'ui-frame'], ['frame-sm', 'ui-frame-sm'], ['hatch', 'ui-hatch'], ['tape', 'ui-tape'],
        ['grunge', 'ui-grunge'], ['icons', 'ui-icons'], ['ring', 'ui-btn'], ['knob', 'ui-stick-knob'],
        ['desk', 'desk-wood'], ['line', 'stroke-graphite'], ['crease', 'stroke-crease']
    ]) root.style.setProperty(`--sk-${v}`, `url("${img(name)}")`);

    // A few of the game's own drawings (Klo, her pencils) as decorations, cut from the atlases the
    // game has already downloaded: frame rectangles from the atlas JSON, so a rebuilt atlas still fits.
    const atlases = new Map();
    const atlas = (name) => {
        if (!atlases.has(name)) atlases.set(name, fetch(asset(`${name}.json`)).then((r) => (r.ok ? r.json() : null)).then(async j => {
            if (!j) return null;
            const picture = new Image(); picture.src = asset(j.meta.image);
            await picture.decode();
            return j;
        }).catch(() => null));
        return atlases.get(name);
    };
    function art(atlasName, frame, cls = '') {
        const d = el('span', `sk-art sk-art-${frame}${cls ? ' ' + cls : ''}`);
        d.setAttribute('aria-hidden', 'true');
        atlas(atlasName).then((j) => {
            const f = j?.frames?.[frame];
            if (!f || f.rotated) { d.remove(); return; }
            const { x, y, w, h } = f.frame, IW = j.meta.size.w, IH = j.meta.size.h;
            d.style.aspectRatio = `${w} / ${h}`;
            d.style.backgroundImage = `url("${asset(j.meta.image)}")`;
            d.style.backgroundSize = `${(IW / w) * 100}% ${(IH / h) * 100}%`;
            d.style.backgroundPosition = `${IW > w ? (x / (IW - w)) * 100 : 0}% ${IH > h ? (y / (IH - h)) * 100 : 0}%`;
            d.classList.add('on');
        });
        return d;
    }
    const tape = (cls = '') => { const t = el('span', 'sk-tape' + (cls ? ' ' + cls : '')); t.setAttribute('aria-hidden', 'true'); return t; };
    const lessMotion = () => root.classList.contains('less-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Small portraits use the same atlas drawings as the characters on the page.
    // Keep them beside the existing name, with no new portrait asset to download.
    function portrait(who, pose) {
        const face = el('span', 'sk-speaker-face face-' + who);
        face.setAttribute('aria-hidden', 'true');
        if (who === 'horse') face.append(art('hero', 'hero-head'), art('hero', 'hero-eye-open'), art('hero', 'hero-forelock'));
        else if (who === 'klo') face.append(art('npcs', pose === 'peek' ? 'klo-peek' : 'klo-idle-1'));
        else if (who === 'kv') face.append(art('npcs-bay', 'kv-part-head-normal'));
        else if (who === 'signe') face.append(art('npcs-land', 'turtle-signe'));
        else return null;
        return face;
    }
    atlas('hero'); atlas('npcs');

    // ---------------------------------------------------------------------------
    // HUD: journal and pause buttons, pencil counter, caption line
    // ---------------------------------------------------------------------------
    const hud = el('div', 'sk-hud');
    const journalBtn = el('button', 'sk-round sk-journal-btn');
    journalBtn.type = 'button';
    journalBtn.setAttribute('aria-label', UI.journal);
    journalBtn.innerHTML = `<img alt="" src="${img('ui-journal')}">`;
    const hintMark = el('span', 'sk-hint-mark');
    hintMark.style.backgroundImage = `url("${img('ui-hint-mark')}")`;
    journalBtn.appendChild(hintMark);
    const pauseBtn = el('button', 'sk-round sk-pause-btn');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', UI.pause);
    pauseBtn.innerHTML = `<img alt="" src="${img('ui-pause')}">`;
    const pencilCount = el('div', 'sk-pencils');
    pencilCount.setAttribute('aria-live', 'polite');
    const caption = el('div', 'sk-caption');
    caption.setAttribute('aria-live', 'polite');
    hud.append(journalBtn, pencilCount, pauseBtn);
    root.append(hud, caption);
    journalBtn.addEventListener('click', () => { hintMark.classList.remove('on'); handlers.openJournal(); });
    pauseBtn.addEventListener('click', () => handlers.openPause());

    // ---------------------------------------------------------------------------
    // Controls: separate jump, shell and nearby-object buttons.
    // ---------------------------------------------------------------------------
    const controls = el('div', 'sk-controls');
    const stickZone = el('div', 'sk-stick-zone');
    const stickBase = el('div', 'sk-stick-base');
    const stickKnob = el('div', 'sk-stick-knob');
    stickBase.style.backgroundImage = `url("${img('ui-stick-base')}")`;
    stickKnob.style.backgroundImage = `url("${img('ui-stick-knob')}")`;
    stickBase.appendChild(stickKnob);
    stickZone.appendChild(stickBase);
    const btnWrap = el('div', 'sk-btns');
    const hopBtn = el('button', 'sk-btn sk-hop', UI.hop);
    hopBtn.type = 'button';
    hopBtn.setAttribute('aria-keyshortcuts', 'Space ArrowUp W');
    hopBtn.title = UI.jumpHelp;
    const actBtn = el('button', 'sk-btn sk-act', UI.interact);
    actBtn.type = 'button';
    actBtn.setAttribute('aria-keyshortcuts', 'E Enter');
    actBtn.title = UI.interactHelp;
    actBtn.disabled = true;
    const hideBtn = el('button', 'sk-btn sk-hide', UI.hide);
    hideBtn.type = 'button';
    hideBtn.setAttribute('aria-keyshortcuts', 'G ArrowDown S');
    hideBtn.title = UI.hideHelp;
    hideBtn.setAttribute('aria-pressed', 'false');
    for (const b of [hopBtn, actBtn, hideBtn]) b.style.backgroundImage = `url("${img('ui-btn')}")`;
    btnWrap.append(hideBtn, actBtn, hopBtn);
    controls.append(stickZone, btnWrap);
    root.appendChild(controls);
    // Keyboard and gamepad play: the key and the action it does here, by the horse.
    // (Screen readers already have the action button's name and shortcuts.)
    const keyNote = el('div', 'sk-keynote');
    const keyCap = el('span', 'sk-keycap');
    const keyLabel = el('span', 'sk-keynote-label');
    keyNote.setAttribute('aria-hidden', 'true');
    keyNote.append(keyCap, keyLabel);
    root.appendChild(keyNote);

    // ---------------------------------------------------------------------------
    // Dialogue: a strip of paper with the speaker's name on a tab
    // ---------------------------------------------------------------------------
    const dlg = el('div', 'sk-dialogue');
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-live', 'polite');
    const dlgName = el('div', 'sk-dlg-name');
    const dlgText = el('div', 'sk-dlg-text');
    const dlgNext = el('button', 'sk-dlg-next', '▸');
    dlgNext.type = 'button';
    dlgNext.setAttribute('aria-label', UI.tapToGo);
    dlg.append(dlgName, dlgText, dlgNext);
    root.appendChild(dlg);
    let dlgResolve = null;
    let dlgReadyAt = 0;
    let speaker = null;
    function advance() {
        if (!dlgResolve || performance.now() < dlgReadyAt) return;
        const r = dlgResolve; dlgResolve = null; r();
    }
    dlg.addEventListener('pointerup', (e) => { e.stopPropagation(); advance(); });
    dlgNext.addEventListener('click', (e) => { e.stopPropagation(); advance(); });

    async function say(lines, { onSpeaker } = {}) {
        for (const [who, text] of lines) {
            if (!text) continue;
            speaker = who;
            dlg.className = 'sk-dialogue on who-' + who;
            dlgName.textContent = who === 'note' || who === 'caption' ? '' : (NAMES[who] || '');
            const face = portrait(who);
            if (face) dlgName.prepend(face);
            dlgText.textContent = text;
            onSpeaker?.(who);
            handlers.onSay?.(who, text);
            dlgReadyAt = performance.now() + 350;
            await new Promise((r) => { dlgResolve = r; });
        }
        speaker = null;
        onSpeaker?.(null);
        dlg.className = 'sk-dialogue';
    }

    // A quiet pencil speech mark connects the paper card to its actual speaker.
    // It follows the rendered head (including the opening's paper/camera transforms).
    const speaking = el('div', 'sk-speaking');
    speaking.setAttribute('aria-hidden', 'true');
    speaking.innerHTML = '<svg viewBox="0 0 36 30" fill="none"><path class="sk-speaking-paper" d="M6 3 Q17 1 28 3 Q33 4 33 10 L32 17 Q31 21 24 21 L17 28 L17 22 Q3 24 3 16 L2 9 Q2 4 6 3Z"/><path class="sk-speaking-pencil" d="M6 3 Q17 1 28 3 Q33 4 33 10 L32 17 Q31 21 24 21 L17 28 L17 22 Q3 24 3 16 L2 9 Q2 4 6 3Z"/><path class="sk-speaking-dots" d="M10 12h1 M17 12h1 M24 12h1"/></svg>';
    root.appendChild(speaking);
    let obstacles = [], measureAt = 0, markWho = null;
    function updateSpeaker(who, bounds) {
        if (!who || !bounds || panel.classList.contains('on')) { speaking.classList.remove('on'); markWho = null; return; }
        const W = root.clientWidth, H = root.clientHeight;
        const x = (bounds.minX + bounds.maxX) / 2, y = bounds.minY;
        // An off-screen character is still identified by the portrait and name.
        if (x < 0 || x > W || bounds.maxY < 0 || y > H) { speaking.classList.remove('on'); return; }
        const now = performance.now();
        if (now >= measureAt || markWho !== who) {
            const origin = root.getBoundingClientRect();
            obstacles = [...root.querySelectorAll('.sk-dialogue.on, .sk-hintbubble.on, .sk-think.on, .sk-goal:not(.empty), .sk-hud:not(.off) .sk-round')]
                .filter(n => !n.closest('.sk-guide.off')).map(n => {
                    const r = n.getBoundingClientRect();
                    return { left: r.left - origin.left, right: r.right - origin.left, top: r.top - origin.top - (n === dlg ? 38 : 0), bottom: r.bottom - origin.top };
                });
            measureAt = now + 150;
        }
        const left = x - 18, top = y - 36;
        const clear = left >= 4 && left + 36 <= W - 4 && top >= 4 && top + 30 <= H - 4 &&
            !obstacles.some(r => left < r.right + 4 && left + 36 > r.left - 4 && top < r.bottom + 4 && top + 30 > r.top - 4);
        speaking.classList.toggle('on', clear);
        speaking.dataset.speaker = who;
        speaking.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
        markWho = who;
    }

    // choices (the prologue)
    const choiceBox = el('div', 'sk-choice');
    root.appendChild(choiceBox);
    function choice(labels) {
        choiceBox.innerHTML = '';
        choiceBox.classList.add('on');
        return new Promise((resolve) => {
            labels.forEach((l, i) => {
                const b = el('button', 'sk-choice-btn', l);
                b.type = 'button';
                b.addEventListener('click', () => { choiceBox.classList.remove('on'); choiceBox.innerHTML = ''; resolve(i); });
                choiceBox.appendChild(b);
            });
            choiceBox.querySelector('button')?.focus();
        });
    }

    // toasts (pencil notes that fade)
    const toasts = el('div', 'sk-toasts');
    root.appendChild(toasts);
    function toast(text, ms = 2600) {
        if (!text) return;
        const t = el('div', 'sk-toast', text);
        toasts.appendChild(t);
        requestAnimationFrame(() => t.classList.add('on'));
        setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 500); }, ms);
    }
    let capTimer = 0;
    function captionShow(text, ms = 1600) {
        if (!text) return;
        caption.textContent = text;
        caption.classList.add('on');
        clearTimeout(capTimer);
        capTimer = setTimeout(() => caption.classList.remove('on'), ms);
    }

    function pulse(which) {
        const n = which === 'hide' ? hideBtn : which === 'journal' ? journalBtn : actBtn;
        if (which === 'journal') hintMark.classList.add('on');
        n.classList.remove('pulse'); void n.offsetWidth; n.classList.add('pulse');
    }

    // ---------------------------------------------------------------------------
    // Panels: journal, pause, settings, report, title. A panel holds one sheet of
    // paper (.sk-card, which scrolls when it must); tape, Klo and the ✕ sit on the
    // sheet around it (.sk-sheet), so the card's scrolling never hides them.
    // Every panel closes the same three ways: its own button (Stäng, Fortsätt …),
    // the ✕ in the corner, or a tap on the dim backdrop beside the sheet.
    // ---------------------------------------------------------------------------
    const panel = el('div', 'sk-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    root.appendChild(panel);
    let panelClose = null;
    function openPanel(build, { onClose, kind = 'card' } = {}) {
        panel.innerHTML = '';
        const sheet = el('div', `sk-sheet sk-sheet-${kind}`);
        const card = el('div', 'sk-card');
        sheet.appendChild(card);
        panel.appendChild(sheet);
        build(card, sheet);
        panel.setAttribute('aria-label', card.querySelector('h2')?.textContent || UI.journal);
        const x = el('button', 'sk-x');
        x.type = 'button';
        x.setAttribute('aria-label', UI.close);
        x.title = UI.close;
        x.addEventListener('click', () => closePanel());
        sheet.appendChild(x);
        panel.classList.add('on');
        panelClose = onClose || null;
        const first = card.querySelector('[data-focus]') || card.querySelector('button, input, textarea');
        first?.focus({ preventScroll: true });
    }
    function closePanel() {
        panel.classList.remove('on');
        panel.innerHTML = '';
        const c = panelClose; panelClose = null;
        c?.();
    }
    // a tap on the backdrop (pressed and released there, so a drag out of the card doesn't count)
    let downOnBackdrop = false;
    panel.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === panel; });
    panel.addEventListener('click', (e) => {
        const hit = e.target === panel && downOnBackdrop;
        downOnBackdrop = false;
        if (hit && panel.classList.contains('on')) closePanel();
    });
    panel.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePanel(); return; }
        if (e.key !== 'Tab') return;
        const focusable = [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')]
            .filter(n => n.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    });
    const btn = (label, fn, cls = '') => { const b = el('button', 'sk-pbtn ' + cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; };
    const list = (items, cls = 'sk-j-list') => { const ul = el('ul', cls); for (const l of items) ul.append(el('li', '', l)); return ul; };

    // --- the journal ------------------------------------------------------------
    // One page on a phone, a two-page spread on a wide screen (the first page is a right-hand page,
    // with the inside of the cover to its left). Tabs jump to a page; pages turn in 3D.
    const spreadQuery = window.matchMedia?.('(min-width: 900px) and (min-height: 520px)');
    function journal(state) {
        let page = Math.max(0, Math.min(6, state.page ?? 2));
        let showJournalPage = () => {};
        const pages = [
            (c) => {
                c.classList.add('sk-j-cover-page');
                c.append(el('h2', 'sk-j-title', JOURNAL.title));
                c.append(el('p', 'sk-j-latin', JOURNAL.latin));
                c.append(el('p', 'sk-j-small', JOURNAL.latinNote));
                c.append(art('table', 'hoofprint-wet', 'sk-j-print'));
                c.append(el('p', 'sk-j-credit', UI.credit));
            },
            (c) => {
                c.append(el('h3', '', JOURNAL.field));
                c.append(el('p', 'sk-j-quote', HER_TEXT.full || JOURNAL.fieldFallback));
                // a little sketch in the margin: her sea, the gulls and the sun
                const sketch = el('div', 'sk-j-doodles');
                sketch.setAttribute('aria-hidden', 'true');
                sketch.append(doodle('sun', 'd-sun'), doodle('gull', 'd-g1'), doodle('gull2', 'd-g2'), doodle('wave', 'd-w1'), doodle('kelp', 'd-k'), doodle('fish', 'd-f'), doodle('wave', 'd-w2'));
                c.append(sketch);
                c.append(art('table', 'alva-pencil', 'sk-j-hand'));
            },
            (c) => {
                c.classList.add('sk-j-known');
                const thread = describeThread(state.flags, state.objective);
                c.append(el('h3', '', THREAD.missionLabel));
                c.append(el('p', 'sk-j-question sk-j-mission', thread.mission));
                c.append(el('p', 'sk-j-recap', state.companion?.recap || thread.recap));
                if (state.companion) {
                    const help = state.companion, W = KLO_COMPANION.ui;
                    c.append(el('h4', '', W.remember));
                    const answer = el('p', 'sk-j-margin');
                    answer.style.backgroundImage = `url("${img('ui-claw')}")`;
                    answer.setAttribute('aria-live', 'polite');
                    const request = btn('', () => {
                        Object.assign(help, help.request());
                        refresh();
                        answer.scrollIntoView?.({ block: 'nearest', behavior: lessMotion() ? 'auto' : 'smooth' });
                    }, 'sk-j-help');
                    request.dataset.focus = '';
                    const refresh = () => {
                        answer.textContent = help.text || W.question;
                        answer.classList.toggle('on', help.level > 0);
                        request.textContent = [W.hint, W.nudge, W.exact, W.repeat][help.level];
                        request.prepend(icon('bulb'));
                    };
                    refresh(); c.append(answer, request);
                } else {
                c.append(el('h4', '', THREAD.whyLabel));
                c.append(el('p', 'sk-j-purpose', thread.why));
                c.append(el('h4', '', THREAD.nextLabel));
                const hint = state.hint || thread.conversation?.hint || HINTS[state.objective] || HINTS.explore;
                c.append(el('p', 'sk-j-question', hint.q));
                const note = el('p', 'sk-j-margin');
                note.style.backgroundImage = `url("${img('ui-claw')}")`;
                const sketch = el('p', 'sk-j-sketch');
                // on a short screen the page scrolls: bring what was just revealed into view
                const reveal = (n) => { try { n.scrollIntoView({ block: 'nearest', behavior: lessMotion() ? 'auto' : 'smooth' }); } catch { /* old browsers */ } };
                const b1 = btn(UI.hint, () => {
                    note.textContent = hint.note; note.classList.add('on'); b1.remove();
                    if (hint.sketch) { note.after(b2); b2.focus({ preventScroll: true }); reveal(b2); } else reveal(note);
                }, 'sk-j-help');
                const b2 = btn(UI.hintMore, () => { sketch.textContent = hint.sketch; sketch.classList.add('on'); b2.remove(); reveal(sketch); }, 'sk-j-help more');
                b1.prepend(icon('bulb'));
                b2.prepend(icon('bulb'));
                b1.dataset.focus = '';
                c.append(b1, note, sketch);
                }
                // the same map as the clue page, small: the pieces found so far
                c.append(createMapThumb(state, { mapUrl: img('map-page'), onOpen: () => showJournalPage(4) }));
                c.append(btn(MAP.inspect, () => showJournalPage(4), 'sk-mapbook-open'));
                c.append(art('npcs', 'klo-point', 'sk-j-klo'));
            },
            (c) => {
                c.append(el('h3', '', JOURNAL.measurements));
                const ul = el('ul', 'sk-j-list sk-j-checks');
                for (const id of ['fart', 'djup', 'gom', 'gnagg', 'sprang', 'smak']) if (state.flags.has('exp_' + id)) ul.append(el('li', '', JOURNAL.experiments[id]));
                if (!ul.children.length) { ul.className = 'sk-j-list'; ul.append(el('li', 'sk-j-small', JOURNAL.empty)); }
                c.append(ul);
                const signs = el('p', 'sk-j-tally', state.tally > 0 ? JOURNAL.tallyHorse : state.tally < 0 ? JOURNAL.tallyTurtle : JOURNAL.tallyEven);
                // the verdict, with the sign Klo holds up for it
                const verdict = el('div', 'sk-j-verdict');
                verdict.append(signs, art('npcs', state.tally > 0 ? 'sign-hast' : state.tally < 0 ? 'sign-skoldpadda' : 'klo-signs', 'sk-j-sign'));
                c.append(verdict);
                c.append(art('npcs', 'klo-stopwatch', 'sk-j-klo'));
            },
            (c) => {
                c.append(el('h3', '', JOURNAL.clues));
                const ul = el('ul', 'sk-j-list sk-j-clues');
                for (const [k, text] of Object.entries(JOURNAL.clueText)) if (state.flags.has('clue_' + k)) ul.append(el('li', '', text));
                c.append(createMapBook(state, { mapUrl: img('map-page'), onSound: handlers.onMenuSound }));
                if (!ul.children.length) { ul.className = 'sk-j-list'; ul.append(el('li', 'sk-j-small', '…')); }
                c.append(ul);
                c.append(art('npcs', 'klo-map-corner', 'sk-j-klo'));
            },
            (c) => {
                c.append(el('h3', '', UI.report + 'er'));
                for (const n of [1, 2]) {
                    if (!state.flags.has(n === 1 ? 'ch1_end' : 'ch2_end')) continue;
                    c.append(el('h4', '', `${UI.report} nr ${n}`));
                    c.append(list(JOURNAL.reports[n], 'sk-j-list sk-j-checks'));
                    c.append(codeNote(n));
                }
                if (!state.flags.has('ch1_end')) c.append(el('p', 'sk-j-small', '…'));
                c.append(art('npcs', 'klo-notebook', 'sk-j-klo'));
            },
            (c) => {
                if (state.flags.has('conclusion') || state.flags.has('ended')) c.append(el('p', 'sk-j-conclusion', JOURNAL.conclusionFull || JOURNAL.conclusion));
                c.append(el('h3', '', JOURNAL.yourNote));
                const ta = el('textarea', 'sk-j-note');
                ta.maxLength = 200;
                ta.value = state.note || '';
                ta.addEventListener('input', () => { state.note = ta.value; handlers.setNote(ta.value); });
                c.append(ta);
                const pc = el('p', 'sk-j-pencils', `${UI.pencils}: ${state.pencils} / ${state.pencilsTotal}`);
                pc.prepend(icon('pencil'));
                c.append(pc);
                if (state.pencilRegions?.length) {
                    const regions = list(state.pencilRegions.filter(r => r.total).map(r => UI.pencilRegion(r.title, r.found, r.total)), 'sk-j-list sk-j-small sk-j-pencil-regions');
                    c.append(regions);
                }
                c.append(art('table', 'pencils-lying', 'sk-j-crayons'));
            }
        ];
        const N = pages.length;
        // the inside of the front cover, left of the first page on a spread
        const insideCover = (c) => {
            c.classList.add('sk-j-inside');
            c.append(el('p', 'sk-j-inside-title', UI.journal));
            c.append(art('npcs', 'klo-notebook', 'sk-j-inside-klo'));
            c.append(doodle('cloud', 'd-cloud'), doodle('gull', 'd-g1'), doodle('gull2', 'd-g2'), doodle('fish', 'd-fish'), doodle('wave', 'd-wave'));
        };

        let settle = () => {}, unlisten = () => {};
        openPanel((card, sheet) => {
            card.classList.add('sk-journal');
            sheet.classList.add('sk-sheet-journal');
            const tabs = el('div', 'sk-j-tabs');
            tabs.setAttribute('role', 'tablist');
            tabs.setAttribute('aria-label', UI.journal);
            const tabBtns = MENU.tabs.slice(0, N).map((label, i) => {
                const b = el('button', `sk-j-tab t${i}`);
                b.type = 'button';
                b.setAttribute('role', 'tab');
                b.title = label;
                b.append(icon(TAB_ICONS[i]), el('span', 'sk-j-tab-label', label));
                b.addEventListener('click', () => go(i));
                tabs.append(b);
                return b;
            });
            const book = el('div', 'sk-j-book');
            const slotL = el('div', 'sk-j-leaf l'), slotR = el('div', 'sk-j-leaf r');
            book.append(slotL, slotR);
            const nav = el('div', 'sk-j-nav');
            const prev = btn('‹', () => step(-1), 'sk-j-arrow');
            prev.setAttribute('aria-label', UI.prev);
            const next = btn('›', () => step(1), 'sk-j-arrow');
            next.setAttribute('aria-label', UI.next);
            const closeB = btn(UI.close, closePanel, 'sk-close');
            const dots = el('span', 'sk-j-dots');
            nav.append(prev, dots, next, closeB);
            card.append(el('div', 'sk-j-head', UI.journal), tabs, book, nav);

            let spread = false;
            const spreadOf = (p) => Math.floor((p + 1) / 2);
            const shown = () => (spread ? [2 * spreadOf(page) - 1, 2 * spreadOf(page)] : [page]);
            function pageEl(i) {
                const p = el('div', 'sk-j-page');
                if (i < 0) insideCover(p);
                else if (i >= N) p.classList.add('blank');
                else { p.dataset.page = String(i); pages[i](p); p.append(el('span', 'sk-j-num', String(i + 1))); }
                return p;
            }
            function marks() {
                const on = shown();
                tabBtns.forEach((b, i) => {
                    b.classList.toggle('on', on.includes(i));
                    b.setAttribute('aria-selected', String(i === page));
                });
                const nums = on.filter((i) => i >= 0 && i < N).map((i) => i + 1);
                dots.textContent = `${nums.join('–')} / ${N}`;
                prev.disabled = on[0] <= 0;
                next.disabled = on[on.length - 1] >= N - 1;
            }
            function layout() {
                settle();
                spread = !!spreadQuery?.matches;
                card.classList.toggle('spread', spread);
                sheet.classList.toggle('spread', spread);
                if (spread) { slotL.replaceChildren(pageEl(shown()[0])); slotR.replaceChildren(pageEl(shown()[1])); }
                else { slotL.replaceChildren(); slotR.replaceChildren(pageEl(page)); }
                marks();
            }
            // --- turning pages ------------------------------------------------------
            let flip = null;
            settle = () => {
                if (!flip) return;
                const f = flip; flip = null;
                for (const a of f.anims) { a.onfinish = null; a.cancel(); }
                f.after?.();
                f.leaf.remove();
            };
            function turn(dir) {
                const leaf = el('div', `sk-j-flip sk-j-leaf ${spread && dir < 0 ? 'l' : 'r'} ${dir > 0 ? 'fwd' : 'back'}`);
                leaf.setAttribute('aria-hidden', 'true');
                const front = el('div', 'sk-j-face front'), back = el('div', 'sk-j-face back');
                const shades = [el('div', 'sk-j-shade'), el('div', 'sk-j-shade')];
                leaf.append(front, back);
                let after = null, frames;
                if (spread) {
                    const [li, ri] = shown();
                    const newL = pageEl(li), newR = pageEl(ri);
                    if (dir > 0) {
                        // the right page lifts and falls over to the left; its back is the new left page
                        front.append(slotR.firstElementChild || pageEl(N)); back.append(newL);
                        slotR.replaceChildren(newR);
                        after = () => slotL.replaceChildren(newL);
                        frames = [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }];
                    } else {
                        front.append(slotL.firstElementChild || pageEl(N)); back.append(newR);
                        slotL.replaceChildren(newL);
                        after = () => slotR.replaceChildren(newR);
                        frames = [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }];
                    }
                } else if (dir > 0) {
                    // one page: the old page lifts off to the left and shows the new one underneath
                    const neu = pageEl(page);
                    front.append(slotR.firstElementChild || pageEl(N));
                    slotR.replaceChildren(neu);
                    frames = [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-92deg)' }];
                } else {
                    // the page before comes back from the left and settles over this one
                    const neu = pageEl(page);
                    front.append(neu);
                    after = () => slotR.replaceChildren(neu);
                    frames = [{ transform: 'rotateY(-92deg)' }, { transform: 'rotateY(0deg)' }];
                }
                front.append(shades[0]); back.append(shades[1]);
                book.append(leaf);
                // the turning page darkens as it leaves the light, and brightens as it lands
                const opts = { duration: spread ? 620 : 460, easing: 'cubic-bezier(.45,.05,.3,1)' };
                const dark = spread ? [{ opacity: 0 }, { opacity: 0.32, offset: 0.5 }, { opacity: 0 }]
                    : dir > 0 ? [{ opacity: 0 }, { opacity: 0.5 }] : [{ opacity: 0.5 }, { opacity: 0 }];
                const anims = [leaf.animate(frames, opts), ...shades.map((s) => s.animate(dark, opts))];
                flip = { leaf, anims, after };
                anims[0].onfinish = () => settle();
            }
            function go(target) {
                target = Math.max(0, Math.min(N - 1, target));
                const was = shown();
                page = target;
                const now = shown();
                if (now[0] === was[0] && now[now.length - 1] === was[was.length - 1]) { marks(); return; }
                handlers.onMenuSound?.('page');
                settle();
                if (lessMotion()) { layout(); return; }
                turn(now[0] > was[0] ? 1 : -1);
                marks();
            }
            function step(d) {
                if (!spread) { go(page + d); return; }
                const s = spreadOf(page) + d;
                go(s <= 0 ? 0 : 2 * s - 1);
            }
            showJournalPage = go;
            layout();
            // turning the phone (or resizing the window) switches between one page and a spread
            const onMode = () => { if (card.isConnected) layout(); else unlisten(); };
            spreadQuery?.addEventListener?.('change', onMode);
            unlisten = () => spreadQuery?.removeEventListener?.('change', onMode);
            card.addEventListener('keydown', (e) => {
                const tag = e.target?.tagName;
                if (tag === 'TEXTAREA' || tag === 'INPUT') return;
                if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
                else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
            });
        }, { onClose: () => { settle(); unlisten(); state.onClose?.(); }, kind: 'journal' });
    }

    /** The word code on a yellow sticky note (the text stays "Kod: KELP MÅS SKAL"). */
    function codeNote(n) {
        const note = el('div', 'sk-sticky sk-code-note');
        const code = el('p', 'sk-j-code');
        code.append(el('span', 'sk-code-label', `${UI.code}:`), ' ', el('span', 'sk-code-words', WORD_CODES[n]));
        note.append(tape('sk-tape-sticky'), code);
        return note;
    }

    // --- pause ----------------------------------------------------------------------
    function pauseMenu() {
        openPanel((c, sheet) => {
            c.classList.add('sk-pause');
            sheet.append(tape('sk-tape-top'), art('npcs', 'klo-peek', 'sk-peek'));
            c.append(el('h2', '', UI.pause));
            c.append(btn(UI.resume, closePanel, 'primary'));
            c.append(btn(UI.stuck, () => {
                c.innerHTML = '';
                c.classList.add('sk-ask');
                c.append(el('h2', '', UI.stuck));
                c.append(el('p', 'sk-ask-q', UI.stuckQ));
                c.append(btn(UI.stuckYes, () => { closePanel(); handlers.stuck(); }, 'primary'), btn(UI.stuckNo, closePanel));
                c.querySelector('button')?.focus({ preventScroll: true });
            }));
            // straight on to the settings: the game stays paused until they close (they resume it)
            c.append(btn(UI.settings, () => { panelClose = null; settings(); }));
            if (handlers.chooseAdventure) c.append(btn(ADVENTURE_UI.choose, () => {
                panelClose = null; closePanel(); handlers.chooseAdventure();
            }, 'sk-choose-adventure'));
            c.append(btn(UI.back, () => { closePanel(); handlers.quit(); }, 'quiet'));
        }, { onClose: handlers.resume, kind: 'pause' });
    }

    function settings() {
        const s = handlers.getSettings();
        openPanel((c, sheet) => {
            c.classList.add('sk-settings');
            sheet.append(tape('sk-tape-top'));
            c.append(el('h2', '', UI.settings));
            const colA = el('div', 'sk-set-col'), colB = el('div', 'sk-set-col');
            const row = (label, input, col, cls = '') => {
                const r = el('label', 'sk-row' + (cls ? ' ' + cls : ''));
                r.append(el('span', 'sk-row-label', label), input);
                col.append(r);
                return r;
            };
            // how much help: three drawn circles to choose between
            const help = el('div', 'sk-row sk-help');
            help.setAttribute('role', 'radiogroup');
            help.setAttribute('aria-label', UI.help);
            const opts = el('div', 'sk-help-opts');
            for (const [v, l] of [['ask', UI.helpAsk], ['remind', UI.helpRemind], ['guided', UI.helpGuided]]) {
                const lab = el('label', 'sk-radio');
                const r = el('input'); r.type = 'radio'; r.name = 'sk-help'; r.value = v; r.checked = s.help === v;
                r.addEventListener('change', () => { if (r.checked) handlers.setSetting('help', v); });
                lab.append(r, el('span', 'sk-mark'), el('span', 'sk-radio-label', l));
                opts.append(lab);
            }
            help.append(el('span', 'sk-row-label', UI.help), opts);
            colA.append(help);
            const tog = (key, label, hint) => {
                const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!s[key];
                cb.addEventListener('change', () => handlers.setSetting(key, cb.checked));
                const r = row(label, cb, colB, 'sk-toggle');
                r.append(el('span', 'sk-mark'));
                if (hint) r.title = hint;
            };
            tog('holdGallop', UI.holdGallop, UI.holdGallopHelp);
            tog('followFinger', UI.followFinger);
            tog('holdToHide', UI.holdToHide);
            tog('bigText', UI.bigText);
            tog('lessMotion', UI.lessMotion);
            const vol = (key, label) => {
                const r = el('input'); r.type = 'range'; r.min = '0'; r.max = '1'; r.step = '0.05'; r.value = String(s[key]);
                const fill = () => r.style.setProperty('--v', r.value);
                fill();
                r.addEventListener('input', () => { fill(); handlers.setSetting(key, Number(r.value)); });
                row(label, r, colA, 'sk-slider');
            };
            vol('music', UI.music); vol('sfx', UI.sound); vol('voice', UI.voices);
            const cols = el('div', 'sk-set-cols');
            cols.append(colA, colB);
            const keys = el('details', 'sk-key-reference');
            keys.append(el('summary', '', UI.keybindings), el('p', 'sk-key-list', UI.keyboardHelp), el('p', 'sk-pad-list', UI.padHelp),
                el('p', 'sk-key-note', UI.jumpHelp), el('p', 'sk-key-note', `${UI.holdToHide}: ${UI.hideHoldHelp}`));
            c.append(cols, keys, btn(UI.close, closePanel, 'primary'));
        }, { onClose: handlers.resume, kind: 'settings' });
    }

    // --- chapter report ----------------------------------------------------------------
    function ending({ nextAdventure } = {}) {
        return new Promise(resolve => {
            let action = { type: 'explore' };
            openPanel((c, sheet) => {
                c.classList.add('sk-ending');
                sheet.append(tape('sk-tape-top'));
                c.append(art('table', 'hoofprint-wet', 'sk-ending-print'));
                c.append(el('h2', '', UI.endingTitle));
                c.append(el('p', '', UI.endingBody));
                if (nextAdventure?.playable) {
                    c.append(el('p', 'sk-ending-next', ADVENTURE_UI.nextReady(nextAdventure.number)));
                    c.append(btn(ADVENTURE_UI.next, () => {
                        action = { type: 'next', adventureId: nextAdventure.id }; closePanel();
                    }, 'primary sk-next-adventure'));
                } else if (nextAdventure?.unlocked && !nextAdventure.released) {
                    c.append(el('p', 'sk-ending-next', ADVENTURE_UI.nextEarned(nextAdventure.number)));
                }
                c.append(btn(UI.endingExplore, closePanel, nextAdventure?.playable ? '' : 'primary'));
                c.append(btn(ADVENTURE_UI.choose, () => { action = { type: 'adventures' }; closePanel(); }, 'sk-choose-adventure'));
            }, { onClose: () => resolve(action), kind: 'ending' });
        });
    }

    function report(n) {
        return new Promise((resolve) => {
            openPanel((c, sheet) => {
                c.classList.add('sk-report');
                sheet.append(tape('sk-tape-top'), art('npcs', 'klo-happy', 'sk-rep-klo'));
                c.append(el('h2', '', `${UI.report} nr ${n}`));
                c.append(list(JOURNAL.reports[n], 'sk-j-list sk-j-checks'));
                const stamp = el('div', 'sk-stamp');
                stamp.setAttribute('aria-hidden', 'true');
                stamp.append(el('span', 'sk-stamp-word', MENU.stamp), el('span', 'sk-stamp-by', NAMES.klo));
                const foot = el('div', 'sk-rep-foot');
                const note = codeNote(n);
                const tip = el('p', 'sk-j-small sk-photo-tip', UI.photoTip);
                tip.prepend(icon('camera'));
                note.append(tip);
                foot.append(note, stamp);
                c.append(foot);
                const next = handlers.nextChapterOpen?.(n) ? '' : UI.nextPage;
                if (next) c.append(el('p', 'sk-j-next', next));
                c.append(btn(UI.cont, closePanel, 'primary'));
            }, { onClose: resolve, kind: 'report' });
        });
    }

    // --- title: the Forskningsdagbok lies open on Alva's desk ---------------------------------
    function title({ hasSave, slots, onBegin, onContinue, onSwitch, onCode, onAdventures, adventureNumber = 1 }) {
        const t = el('div', 'sk-title');
        const cover = el('div', 'sk-cover');
        const paper = el('div', 'sk-cover-paper');
        const head = el('div', 'sk-title-head');
        const logo = el('img', 'sk-title-logo');
        logo.alt = UI.title + ' ' + UI.subtitle;
        logo.src = img('ui-title');
        const sub = el('p', 'sk-title-sub', UI.subtitle);
        sub.hidden = true; // the traced lettering already says it
        logo.onerror = () => { logo.replaceWith(el('h1', 'sk-title-text', UI.title)); sub.hidden = false; };
        head.append(logo, sub, doodle('gull', 'd-g1'), doodle('gull2', 'd-g2'));
        head.append(el('p', 'sk-title-adventure', ADVENTURE_UI.number(adventureNumber)));
        const bb = el('div', 'sk-title-btns');
        if (hasSave) bb.append(btn(UI.cont, () => { t.remove(); onContinue(); }, 'primary big'));
        bb.append(btn(hasSave ? UI.startOver : UI.begin, () => {
            if (!hasSave) { t.remove(); onBegin(); return; }
            openPanel((c, sheet) => {
                c.classList.add('sk-confirm');
                sheet.append(art('table', 'eraser', 'sk-eraser'));
                c.append(el('p', 'sk-ask-q', UI.confirmRestart));
                const row = el('div', 'sk-btn-row');
                row.append(btn(UI.yes, () => { closePanel(); t.remove(); onBegin(); }, 'primary'), btn(UI.no, closePanel));
                c.append(row);
            }, { kind: 'confirm' });
        }, hasSave ? '' : 'primary big'));
        bb.querySelector('.primary')?.append(icon('arrow', 'sk-go'));
        if (onAdventures) bb.append(btn(ADVENTURE_UI.choose, onAdventures, 'sk-choose-adventure'));
        if (hasSave || slots.length > 1) bb.append(btn(UI.switchResearcher, () => onSwitch((close) => { t.remove(); close?.(); })));
        bb.append(btn(UI.haveCode, () => {
            openPanel((c, sheet) => {
                c.classList.add('sk-code');
                sheet.append(tape('sk-tape-top'), art('npcs', 'klo-whisper', 'sk-code-klo'));
                c.append(el('p', 'sk-ask-q', UI.codePrompt));
                const inp = el('input', 'sk-code-input'); inp.type = 'text'; inp.autocomplete = 'off';
                inp.spellcheck = false; inp.setAttribute('autocapitalize', 'characters');
                inp.dataset.focus = ''; // the keyboard opens on the code at once
                const msg = el('p', 'sk-j-small sk-code-msg');
                msg.setAttribute('aria-live', 'polite');
                c.append(inp, msg);
                const row = el('div', 'sk-btn-row');
                const ok = btn(UI.cont, () => {
                    const good = onCode(inp.value);
                    if (good) { closePanel(); t.remove(); } else { msg.textContent = UI.codeBad; msg.classList.remove('shake'); void msg.offsetWidth; msg.classList.add('shake'); }
                }, 'primary');
                inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } });
                row.append(ok, btn(UI.close, closePanel));
                c.append(row);
            }, { kind: 'code' });
        }, 'quiet'));
        bb.append(btn(UI.back, () => handlers.quit(), 'quiet'));
        const credit = el('p', 'sk-title-credit', UI.credit);
        credit.append(art('table', 'hoofprint-wet', 'sk-title-print')); // signed with a wet hoofprint
        // on the open book the menu page carries the notebook's name, like the first page of a new notebook
        const label = el('p', 'sk-title-label', UI.journal);
        label.setAttribute('aria-hidden', 'true');
        paper.append(head, bb, credit, label, doodle('sun', 'd-sun'));
        if (FAMILY.dedication) paper.append(el('p', 'sk-title-dedication', FAMILY.dedication));
        cover.append(paper, el('span', 'sk-cover-gutter'), art('npcs', 'klo-peek', 'sk-title-klo'));
        t.append(art('table', 'pencils-lying', 'sk-title-pencils'), cover);
        root.appendChild(t);
        t.querySelector('button')?.focus({ preventScroll: true });
        return () => t.remove();
    }

    // A story keeps its own bookmark. Finishing one earns the next, while an
    // unfinished story stays on the desk until it has been built and released.
    function adventurePicker({ adventures, playerLabel, onPick, onClose }) {
        const returnFocus = document.activeElement;
        openPanel((c, sheet) => {
            c.classList.add('sk-adventures');
            sheet.append(tape('sk-tape-top'));
            c.append(el('h2', '', ADVENTURE_UI.heading));
            c.append(el('p', 'sk-adventures-intro', ADVENTURE_UI.intro));
            if (playerLabel) c.append(el('p', 'sk-adventures-player', ADVENTURE_UI.player(playerLabel)));
            const stories = el('div', 'sk-adventure-list');
            for (const adventure of adventures) {
                const card = el('article', 'sk-adventure-card');
                card.dataset.adventureId = adventure.id;
                card.classList.toggle('is-playable', !!adventure.playable);
                card.classList.toggle('is-locked', !adventure.playable);
                card.classList.toggle('is-complete', !!adventure.completed);
                card.classList.toggle('is-active', !!adventure.active);
                const name = adventure.title || ADVENTURE_UI.titles[adventure.id];
                card.setAttribute('aria-label', `${ADVENTURE_UI.number(adventure.number)}: ${name}`);
                const cover = el('div', 'sk-adventure-cover');
                cover.setAttribute('aria-hidden', 'true');
                cover.append(icon(adventure.released ? 'wave' : 'pencil'));
                if (adventure.completed) cover.append(icon('check', 'sk-adventure-check'));
                card.append(cover, el('p', 'sk-adventure-number', ADVENTURE_UI.number(adventure.number)), el('h3', 'sk-adventure-name', name));
                const status = adventure.completed ? ADVENTURE_UI.completed
                    : !adventure.released ? ADVENTURE_UI.developing
                    : !adventure.unlocked ? ADVENTURE_UI.locked
                    : adventure.hasSave ? ADVENTURE_UI.playing : ADVENTURE_UI.ready;
                card.append(el('p', 'sk-adventure-status', status));
                if (!adventure.released) card.append(el('p', 'sk-adventure-note', ADVENTURE_UI.developingNote));
                if (!adventure.unlocked && adventure.requiresNumber) {
                    card.append(el('p', 'sk-adventure-note', ADVENTURE_UI.requires(adventure.requiresNumber)));
                } else if (adventure.unlocked && !adventure.released) {
                    card.append(el('p', 'sk-adventure-note', ADVENTURE_UI.earned));
                }
                if (adventure.playable) {
                    const label = adventure.ended ? ADVENTURE_UI.explore : adventure.hasSave ? ADVENTURE_UI.continue : ADVENTURE_UI.begin;
                    const play = btn(label, () => {
                        // Selecting a story must not resume the previous one.
                        panelClose = null; closePanel(); onPick(adventure.id);
                    }, 'primary sk-adventure-play');
                    play.setAttribute('aria-label', `${label}: ${ADVENTURE_UI.number(adventure.number)}`);
                    if (adventure.active) play.dataset.focus = '';
                    card.append(play);
                }
                stories.append(card);
            }
            c.append(stories, btn(ADVENTURE_UI.back, closePanel, 'quiet sk-adventures-close'));
        }, { kind: 'adventures', onClose: () => {
            if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
            onClose?.();
        } });
    }

    function slotPicker(slots, onPick, onNew) {
        openPanel((c, sheet) => {
            c.classList.add('sk-slots');
            sheet.append(tape('sk-tape-top'), art('npcs', 'klo-notebook', 'sk-peek'));
            c.append(el('h2', '', UI.switchResearcher));
            for (const s of slots) c.append(btn(s.label + (s.note ? ` – ”${s.note}”` : ''), () => { closePanel(); onPick(s.id); }, 'sk-slot'));
            c.append(btn(UI.newResearcher, () => {
                c.innerHTML = '';
                c.append(el('h2', '', UI.newResearcher));
                const inp = el('input', 'sk-code-input sk-name-input'); inp.type = 'text'; inp.maxLength = 16; inp.placeholder = UI.newResearcher;
                const ok = btn(UI.cont, () => { const name = inp.value.trim(); if (name) { closePanel(); onNew(name); } }, 'primary');
                inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } });
                c.append(inp, ok);
                inp.focus();
            }, 'quiet'));
            c.append(btn(UI.close, closePanel));
        }, { kind: 'slots' });
    }

    // ---------------------------------------------------------------------------
    // Drawing overlay: Alva's pencil (prologue strokes, the final stroke)
    // ---------------------------------------------------------------------------
    const drawing = createDrawing(root, { host, words: DRAWING, onPencil: handlers.onPencil, onUiSound: handlers.onMenuSound });
    const draw = opts => drawing.draw(opts);

    // ---------------------------------------------------------------------------
    return {
        root, hud, controls, stickZone, stickBase, stickKnob, hopBtn, actBtn, hideBtn, portrait, updateSpeaker,
        say, choice, toast, caption: captionShow, pulse, report, ending, journal, pauseMenu, settings, title, adventurePicker, slotPicker, draw,
        closePanel,
        panelOpen: () => panel.classList.contains('on'),
        dialogueOpen: () => !!dlgResolve,
        speaker: () => speaker,
        advance,
        setPencils(n, total, region = '') {
            pencilCount.textContent = total ? UI.pencilBadge(n, total) : '';
            pencilCount.title = UI.pencilRegion(region || UI.pencils, n, total);
            pencilCount.setAttribute('aria-label', pencilCount.title);
        },
        setContext(label, hidden, holdToHide = false) {
            const l = label || UI.interact;
            if (actBtn.textContent !== l) actBtn.textContent = l;
            actBtn.disabled = !label || hidden;
            const hopLabel = hidden ? UI.show : UI.hop;
            if (hopBtn.textContent !== hopLabel) hopBtn.textContent = hopLabel;
            const hl = hidden && !holdToHide ? UI.show : UI.hide;
            if (hideBtn.textContent !== hl) hideBtn.textContent = hl;
            hideBtn.setAttribute('aria-pressed', hidden ? 'true' : 'false');
            hideBtn.title = holdToHide ? UI.hideHoldHelp : UI.hideHelp;
        },
        /** { key, label, at: { x, y } } shows the note above that screen point; null hides it. */
        keyPrompt(prompt) {
            if (!prompt?.at || !prompt.label) { keyNote.classList.remove('on'); return; }
            if (keyCap.textContent !== prompt.key) keyCap.textContent = prompt.key;
            if (keyLabel.textContent !== prompt.label) keyLabel.textContent = prompt.label;
            const w = root.clientWidth || window.innerWidth;
            const x = Math.max(70, Math.min(w - 70, prompt.at.x)), y = Math.max(64, prompt.at.y);
            keyNote.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
            keyNote.classList.add('on');
        },
        showControls(on) { controls.classList.toggle('off', !on); hud.classList.toggle('off', !on); keyNote.classList.toggle('off', !on); },
        setBigText(on) { root.classList.toggle('big-text', !!on); },
        destroy() { drawing.destroy(); root.remove(); }
    };
}
