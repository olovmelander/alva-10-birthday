/*
 * Sköldhästen – the DOM interface: title, dialogue, choices, toasts, captions,
 * the journal (Forskningsdagbok), pause and settings, chapter reports, and the
 * drawing overlay for Alva's pencil. All text is Swedish (content/sv.mjs).
 *
 * The UI never changes the game directly; it returns promises and calls the
 * handlers main.mjs gives it.
 */
import { UI, NAMES, JOURNAL, HINTS, HER_TEXT, WORD_CODES, FAMILY } from './content/sv.mjs';

const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
};

export function createUI(host, { assetBase, handlers }) {
    const root = el('div', 'sk-ui');
    host.appendChild(root);
    // absolute, because a url() inside a CSS variable resolves against the stylesheet, not the page
    const img = (name) => new URL(`${assetBase}assets/${name}.webp`, document.baseURI).href;
    root.style.setProperty('--sk-paper', `url("${img('ui-paper')}")`);

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
    // Controls: floating stick area (left) and two buttons (right)
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
    const actBtn = el('button', 'sk-btn sk-act', UI.hop);
    actBtn.type = 'button';
    const hideBtn = el('button', 'sk-btn sk-hide', UI.hide);
    hideBtn.type = 'button';
    hideBtn.setAttribute('aria-pressed', 'false');
    for (const b of [actBtn, hideBtn]) b.style.backgroundImage = `url("${img('ui-btn')}")`;
    btnWrap.append(hideBtn, actBtn);
    controls.append(stickZone, btnWrap);
    root.appendChild(controls);

    // ---------------------------------------------------------------------------
    // Dialogue
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
    function advance() {
        if (!dlgResolve || performance.now() < dlgReadyAt) return;
        const r = dlgResolve; dlgResolve = null; r();
    }
    dlg.addEventListener('pointerup', (e) => { e.stopPropagation(); advance(); });
    dlgNext.addEventListener('click', (e) => { e.stopPropagation(); advance(); });

    async function say(lines) {
        for (const [who, text] of lines) {
            if (!text) continue;
            dlg.className = 'sk-dialogue on who-' + who;
            dlgName.textContent = who === 'note' || who === 'caption' ? '' : (NAMES[who] || '');
            dlgText.textContent = text;
            handlers.onSay?.(who, text);
            dlgReadyAt = performance.now() + 350;
            await new Promise((r) => { dlgResolve = r; });
        }
        dlg.className = 'sk-dialogue';
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
    function captionShow(text) {
        if (!text) return;
        caption.textContent = text;
        caption.classList.add('on');
        clearTimeout(capTimer);
        capTimer = setTimeout(() => caption.classList.remove('on'), 1600);
    }

    function pulse(which) {
        const n = which === 'hide' ? hideBtn : which === 'journal' ? journalBtn : actBtn;
        if (which === 'journal') hintMark.classList.add('on');
        n.classList.remove('pulse'); void n.offsetWidth; n.classList.add('pulse');
    }

    // ---------------------------------------------------------------------------
    // Panels: journal, pause, settings, report, title
    // ---------------------------------------------------------------------------
    const panel = el('div', 'sk-panel');
    panel.setAttribute('role', 'dialog');
    root.appendChild(panel);
    let panelClose = null;
    function openPanel(build, { onClose } = {}) {
        panel.innerHTML = '';
        const card = el('div', 'sk-card');
        panel.appendChild(card);
        build(card);
        panel.classList.add('on');
        panelClose = onClose || null;
        const first = card.querySelector('button, input, textarea');
        first?.focus();
    }
    function closePanel() {
        panel.classList.remove('on');
        panel.innerHTML = '';
        const c = panelClose; panelClose = null;
        c?.();
    }
    const btn = (label, fn, cls = '') => { const b = el('button', 'sk-pbtn ' + cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; };

    // --- the journal ------------------------------------------------------------
    function journal(state) {
        let page = state.page ?? 2;
        const pages = [
            (c) => {
                c.append(el('h2', 'sk-j-title', JOURNAL.title));
                c.append(el('p', 'sk-j-latin', JOURNAL.latin));
                c.append(el('p', 'sk-j-small', JOURNAL.latinNote));
                c.append(el('p', 'sk-j-credit', UI.credit));
            },
            (c) => {
                c.append(el('h3', '', JOURNAL.field));
                c.append(el('p', 'sk-j-quote', HER_TEXT.full || JOURNAL.fieldFallback));
            },
            (c) => {
                c.append(el('h3', '', JOURNAL.known));
                const hint = HINTS[state.objective] || HINTS.explore;
                c.append(el('p', 'sk-j-question', hint.q));
                const note = el('p', 'sk-j-margin');
                note.style.backgroundImage = `url("${img('ui-claw')}")`;
                const sketch = el('p', 'sk-j-sketch');
                const b1 = btn(UI.hint, () => { note.textContent = hint.note; note.classList.add('on'); b1.remove(); if (hint.sketch) c.append(b2); });
                const b2 = btn(UI.hintMore, () => { sketch.textContent = hint.sketch; sketch.classList.add('on'); b2.remove(); });
                c.append(b1, note, sketch);
                c.append(mapSketch(state));
            },
            (c) => {
                c.append(el('h3', '', JOURNAL.measurements));
                const ul = el('ul', 'sk-j-list');
                for (const id of ['fart', 'djup', 'gom', 'gnagg', 'sprang', 'smak']) if (state.flags.has('exp_' + id)) ul.append(el('li', '', JOURNAL.experiments[id]));
                if (!ul.children.length) ul.append(el('li', 'sk-j-small', JOURNAL.empty));
                c.append(ul);
                const signs = el('p', 'sk-j-tally', state.tally > 0 ? 'Klos skylt: häst' : state.tally < 0 ? 'Klos skylt: SKÖLDPADDA' : 'Klos skyltar: det står lika.');
                c.append(signs);
            },
            (c) => {
                c.append(el('h3', '', JOURNAL.clues));
                const ul = el('ul', 'sk-j-list');
                for (const [k, text] of Object.entries(JOURNAL.clueText)) if (state.flags.has('clue_' + k)) ul.append(el('li', '', text));
                if (state.flags.has('mark_land') || state.flags.has('mark_sea') || state.flags.has('ch2_open')) {
                    const m = el('div', 'sk-j-marks');
                    m.append(el('span', 'sk-j-mark land' + (state.flags.has('mark_land') ? ' got' : '')), el('span', 'sk-j-mark sea' + (state.flags.has('mark_sea') ? ' got' : '')));
                    m.append(el('p', 'sk-j-small', JOURNAL.halves));
                    c.append(m);
                }
                if (!ul.children.length) ul.append(el('li', 'sk-j-small', '…'));
                c.append(ul);
            },
            (c) => {
                c.append(el('h3', '', UI.report + 'er'));
                for (const n of [1, 2]) {
                    if (!state.flags.has(n === 1 ? 'ch1_end' : 'ch2_end')) continue;
                    c.append(el('h4', '', `${UI.report} nr ${n}`));
                    const ul = el('ul', 'sk-j-list');
                    for (const l of JOURNAL.reports[n]) ul.append(el('li', '', l));
                    c.append(ul);
                    c.append(el('p', 'sk-j-code', `${UI.code}: ${WORD_CODES[n]}`));
                }
                if (!state.flags.has('ch1_end')) c.append(el('p', 'sk-j-small', '…'));
            },
            (c) => {
                if (state.flags.has('conclusion') || state.flags.has('ended')) c.append(el('p', 'sk-j-conclusion', JOURNAL.conclusionFull || JOURNAL.conclusion));
                c.append(el('h3', '', JOURNAL.yourNote));
                const ta = el('textarea', 'sk-j-note');
                ta.maxLength = 200;
                ta.value = state.note || '';
                ta.addEventListener('input', () => handlers.setNote(ta.value));
                c.append(ta);
                c.append(el('p', 'sk-j-pencils', `${UI.pencils}: ${state.pencils} / ${state.pencilsTotal}`));
            }
        ];
        openPanel((card) => {
            card.classList.add('sk-journal');
            const body = el('div', 'sk-j-page');
            const nav = el('div', 'sk-j-nav');
            const prev = btn('‹', () => { page = Math.max(0, page - 1); render(); }, 'sk-j-arrow');
            prev.setAttribute('aria-label', UI.prev);
            const next = btn('›', () => { page = Math.min(pages.length - 1, page + 1); render(); }, 'sk-j-arrow');
            next.setAttribute('aria-label', UI.next);
            const closeB = btn(UI.close, closePanel, 'sk-close');
            const dots = el('span', 'sk-j-dots');
            nav.append(prev, dots, next);
            card.append(el('div', 'sk-j-head', UI.journal), body, nav, closeB);
            function render() {
                body.innerHTML = '';
                pages[page](body);
                dots.textContent = `${page + 1} / ${pages.length}`;
                prev.disabled = page === 0; next.disabled = page === pages.length - 1;
            }
            render();
        }, { onClose: state.onClose });
    }

    function mapSketch(state) {
        // a tiny pencil map: the regions visited and the fold
        const d = el('div', 'sk-j-map');
        const regions = [['Stäppen', 'land'], ['Stranden', 'land'], ['Kelpskogen', 'kelp'], ['Spegelviken', 'viken']];
        for (const [name, id] of regions) {
            const r = el('span', 'sk-j-region' + (state.visited.has(id) ? ' seen' : ''), name);
            d.append(r);
        }
        d.append(el('span', 'sk-j-fold', state.flags.has('unfolded') ? '' : '— veck —'));
        return d;
    }

    // --- pause ----------------------------------------------------------------------
    function pauseMenu() {
        openPanel((c) => {
            c.append(el('h2', '', UI.pause));
            c.append(btn(UI.resume, closePanel, 'primary'));
            c.append(btn(UI.stuck, () => {
                c.innerHTML = '';
                c.append(el('p', '', UI.stuckQ));
                c.append(btn(UI.stuckYes, () => { closePanel(); handlers.stuck(); }, 'primary'), btn(UI.stuckNo, closePanel));
            }));
            c.append(btn(UI.settings, () => { closePanel(); settings(); }));
            c.append(btn(UI.back, () => { closePanel(); handlers.quit(); }, 'quiet'));
        }, { onClose: handlers.resume });
    }

    function settings() {
        const s = handlers.getSettings();
        openPanel((c) => {
            c.append(el('h2', '', UI.settings));
            const row = (label, input) => { const r = el('label', 'sk-row'); r.append(el('span', '', label), input); c.append(r); return r; };
            const sel = el('select');
            for (const [v, l] of [['easy', UI.helpEasy], ['normal', UI.helpNormal], ['hard', UI.helpHard]]) { const o = el('option', '', l); o.value = v; sel.append(o); }
            sel.value = s.help;
            sel.addEventListener('change', () => handlers.setSetting('help', sel.value));
            row(UI.help, sel);
            const tog = (key, label, help) => {
                const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!s[key];
                cb.addEventListener('change', () => handlers.setSetting(key, cb.checked));
                const r = row(label, cb);
                if (help) r.title = help;
            };
            tog('holdGallop', UI.holdGallop, UI.holdGallopHelp);
            tog('followFinger', UI.followFinger);
            tog('holdToHide', UI.holdToHide);
            tog('bigText', UI.bigText);
            tog('lessMotion', UI.lessMotion);
            const vol = (key, label) => {
                const r = el('input'); r.type = 'range'; r.min = '0'; r.max = '1'; r.step = '0.05'; r.value = String(s[key]);
                r.addEventListener('input', () => handlers.setSetting(key, Number(r.value)));
                row(label, r);
            };
            vol('music', UI.music); vol('sfx', UI.sound); vol('voice', UI.voices);
            c.append(btn(UI.close, closePanel, 'primary'));
        }, { onClose: handlers.resume });
    }

    // --- chapter report ----------------------------------------------------------------
    function report(n) {
        return new Promise((resolve) => {
            openPanel((c) => {
                c.classList.add('sk-report');
                c.append(el('h2', '', `${UI.report} nr ${n}`));
                const ul = el('ul', 'sk-j-list');
                for (const l of JOURNAL.reports[n]) ul.append(el('li', '', l));
                c.append(ul);
                c.append(el('p', 'sk-j-code', `${UI.code}: ${WORD_CODES[n]}`));
                c.append(el('p', 'sk-j-small', UI.photoTip));
                const next = handlers.nextChapterOpen?.(n) ? '' : UI.nextPage;
                if (next) c.append(el('p', 'sk-j-next', next));
                c.append(btn(UI.cont, closePanel, 'primary'));
            }, { onClose: resolve });
        });
    }

    // --- title ---------------------------------------------------------------------------
    function title({ hasSave, slots, onBegin, onContinue, onSwitch, onCode }) {
        const t = el('div', 'sk-title');
        const logo = el('img', 'sk-title-logo');
        logo.alt = UI.title + ' ' + UI.subtitle;
        logo.src = img('ui-title');
        const sub = el('p', 'sk-title-sub', UI.subtitle);
        sub.hidden = true; // the traced lettering already says it
        logo.onerror = () => { logo.replaceWith(el('h1', 'sk-title-text', UI.title)); sub.hidden = false; };
        const bb = el('div', 'sk-title-btns');
        if (hasSave) bb.append(btn(UI.cont, () => { t.remove(); onContinue(); }, 'primary big'));
        bb.append(btn(hasSave ? UI.startOver : UI.begin, () => {
            if (!hasSave) { t.remove(); onBegin(); return; }
            openPanel((c) => {
                c.append(el('p', '', UI.confirmRestart));
                c.append(btn(UI.yes, () => { closePanel(); t.remove(); onBegin(); }, 'primary'), btn(UI.no, closePanel));
            });
        }, hasSave ? '' : 'primary big'));
        if (hasSave || slots.length > 1) bb.append(btn(UI.switchResearcher, () => onSwitch((close) => { t.remove(); close?.(); })));
        bb.append(btn(UI.haveCode, () => {
            openPanel((c) => {
                c.append(el('p', '', UI.codePrompt));
                const inp = el('input', 'sk-code-input'); inp.type = 'text'; inp.autocomplete = 'off';
                const msg = el('p', 'sk-j-small');
                c.append(inp, msg);
                c.append(btn(UI.cont, () => {
                    const ok = onCode(inp.value);
                    if (ok) { closePanel(); t.remove(); } else msg.textContent = UI.codeBad;
                }, 'primary'), btn(UI.close, closePanel));
            });
        }, 'quiet'));
        bb.append(btn(UI.back, () => handlers.quit(), 'quiet'));
        const credit = el('p', 'sk-title-credit', UI.credit);
        t.append(logo, sub, bb, credit);
        if (FAMILY.dedication) t.append(el('p', 'sk-title-dedication', FAMILY.dedication));
        root.appendChild(t);
        t.querySelector('button')?.focus();
        return () => t.remove();
    }

    function slotPicker(slots, onPick, onNew) {
        openPanel((c) => {
            c.append(el('h2', '', UI.switchResearcher));
            for (const s of slots) c.append(btn(s.label + (s.note ? ` – ”${s.note}”` : ''), () => { closePanel(); onPick(s.id); }));
            c.append(btn(UI.newResearcher, () => {
                c.innerHTML = '';
                const inp = el('input', 'sk-code-input'); inp.type = 'text'; inp.maxLength = 16; inp.placeholder = UI.newResearcher;
                c.append(inp, btn(UI.cont, () => { const name = inp.value.trim(); if (name) { closePanel(); onNew(name); } }, 'primary'));
                inp.focus();
            }, 'quiet'));
            c.append(btn(UI.close, closePanel));
        });
    }

    // ---------------------------------------------------------------------------
    // Drawing overlay: Alva's pencil (prologue strokes, the final stroke)
    // ---------------------------------------------------------------------------
    const drawLayer = el('div', 'sk-draw');
    const drawCanvas = el('canvas');
    const drawPrompt = el('div', 'sk-draw-prompt');
    drawLayer.append(drawCanvas, drawPrompt);
    root.appendChild(drawLayer);
    /**
     * opts: { prompt, ghost: [[x,y]...] in CSS px (free drawing over a faint ghost),
     *         anchors: [[x,y]...] (trace/tap along generous anchors), color, width }
     * Resolves with the drawn points (CSS px).
     */
    function draw(opts) {
        const W = host.clientWidth, H = host.clientHeight;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        drawCanvas.width = W * dpr; drawCanvas.height = H * dpr;
        drawCanvas.style.width = W + 'px'; drawCanvas.style.height = H + 'px';
        const ctx = drawCanvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawPrompt.textContent = opts.prompt || '';
        drawLayer.classList.add('on');
        const pts = [];
        let anchorsHit = 0;
        const anchors = opts.anchors || null;
        const redraw = () => {
            ctx.clearRect(0, 0, W, H);
            if (opts.ghost) {
                ctx.save(); ctx.globalAlpha = 0.28; ctx.strokeStyle = '#6b635a'; ctx.lineWidth = 5; ctx.setLineDash([10, 9]); ctx.lineCap = 'round';
                ctx.beginPath(); opts.ghost.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
            }
            if (anchors) {
                anchors.forEach(([x, y], i) => {
                    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2);
                    ctx.fillStyle = i < anchorsHit ? 'rgba(59,53,48,0.55)' : 'rgba(255,210,122,0.45)'; ctx.fill();
                    ctx.lineWidth = 2; ctx.strokeStyle = '#3b3530'; ctx.stroke();
                });
            }
            if (pts.length > 1) {
                ctx.strokeStyle = opts.color || '#3b3530'; ctx.lineWidth = opts.width || 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
            }
        };
        redraw();
        return new Promise((resolve) => {
            let down = false;
            const finish = () => {
                drawLayer.classList.remove('on');
                drawLayer.onpointerdown = drawLayer.onpointermove = drawLayer.onpointerup = drawLayer.onpointercancel = null;
                window.removeEventListener('keydown', onKey);
                resolve(pts.length > 1 ? pts.slice() : (opts.ghost ? opts.ghost.slice() : anchors ? anchors.slice() : []));
            };
            const hitAnchor = (x, y) => {
                if (!anchors) return;
                while (anchorsHit < anchors.length && Math.hypot(anchors[anchorsHit][0] - x, anchors[anchorsHit][1] - y) < 46) {
                    anchorsHit++; handlers.onPencil?.(0.15);
                    if (opts.stopAt && anchorsHit >= opts.stopAt) { down = false; finish(); return; }
                }
                if (anchorsHit >= anchors.length) setTimeout(finish, 250);
            };
            drawLayer.onpointerdown = (e) => {
                down = true; drawLayer.setPointerCapture?.(e.pointerId);
                pts.push([e.offsetX, e.offsetY]); hitAnchor(e.offsetX, e.offsetY); redraw();
            };
            drawLayer.onpointermove = (e) => {
                if (!down) return;
                const last = pts[pts.length - 1];
                if (!last || Math.hypot(e.offsetX - last[0], e.offsetY - last[1]) > 3) { pts.push([e.offsetX, e.offsetY]); handlers.onPencil?.(0.05); }
                hitAnchor(e.offsetX, e.offsetY); redraw();
            };
            drawLayer.onpointerup = drawLayer.onpointercancel = () => {
                if (!down) return;
                down = false;
                if (anchors) { if (anchorsHit >= anchors.length) finish(); return; }
                // a free stroke: accepted whatever it is (a too-short one becomes the ghost shape)
                if (pts.length < 6) pts.length = 0;
                finish();
            };
            // keyboard: Enter/space draws it for you (plan: keyboard users confirm anchors)
            const onKey = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (anchors) { anchorsHit = opts.stopAt || anchors.length; pts.length = 0; anchors.slice(0, anchorsHit).forEach((a) => pts.push(a)); redraw(); setTimeout(finish, 300); }
                    else { pts.length = 0; finish(); }
                }
            };
            window.addEventListener('keydown', onKey);
        });
    }

    // ---------------------------------------------------------------------------
    return {
        root, hud, controls, stickZone, stickBase, stickKnob, actBtn, hideBtn,
        say, choice, toast, caption: captionShow, pulse, report, journal, pauseMenu, settings, title, slotPicker, draw,
        closePanel,
        panelOpen: () => panel.classList.contains('on'),
        dialogueOpen: () => !!dlgResolve,
        advance,
        setPencils(n, total) { pencilCount.textContent = n ? `✎ ${n}/${total}` : ''; },
        setContext(label, hidden) {
            const l = label || UI.hop;
            if (actBtn.textContent !== l) actBtn.textContent = l;
            const hl = hidden ? UI.show : UI.hide;
            if (hideBtn.textContent !== hl) { hideBtn.textContent = hl; hideBtn.setAttribute('aria-pressed', hidden ? 'true' : 'false'); }
        },
        showControls(on) { controls.classList.toggle('off', !on); hud.classList.toggle('off', !on); },
        setBigText(on) { root.classList.toggle('big-text', !!on); },
        destroy() { root.remove(); }
    };
}
