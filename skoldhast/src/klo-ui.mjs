/* Klo's callable field notebook. Presentation only: the companion owns time,
 * requested clue depth, story priority and all world state.
 *
 * `words` is KLO_COMPANION.ui from content/sv.mjs. `side` is the side on which
 * the notebook may sit, leaving the actor's performance visible opposite it.
 * K belongs to the shared input controller; this view only handles Esc/Tab.
 */
let nextId = 0;

const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
};
const drawnIcon = name => {
    const node = el('span', `sk-ic sk-ic-${name}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
};

/** A persistent call control and a compact, accessible conversation slip.
 * Unknown/undefined model fields are ignored, so update() can patch a visit.
 */
export function createKloUI(root, { words, portrait, onCall, onChoice, onClose, lessMotion = () => false } = {}) {
    const doc = root.ownerDocument;
    const uid = `sk-klo-${++nextId}`;
    const listeners = [];
    const listen = (node, type, fn, options) => {
        node.addEventListener(type, fn, options);
        listeners.push(() => node.removeEventListener(type, fn, options));
    };
    let open = false, destroyed = false, returnFocus = null;
    let model = { place: '', greeting: '', text: '', topic: 'welcome', level: 0, arriving: false, side: 'right', kind: '' };
    let peeking = false;
    let available = { visible: false, enabled: true };

    const button = el('button', 'sk-klo-call');
    button.type = 'button';
    button.hidden = true;
    button.setAttribute('aria-label', words.call);
    button.setAttribute('aria-keyshortcuts', 'K');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', uid);
    button.setAttribute('aria-expanded', 'false');
    const claw = el('span', 'sk-klo-claw');
    claw.setAttribute('aria-hidden', 'true');
    // A small pencil doodle, not another downloaded bitmap or a substitute actor.
    claw.innerHTML = '<svg viewBox="0 0 42 42" fill="none" focusable="false" aria-hidden="true"><path d="M22 36c-1-6-5-9-6-14M14 26C5 24 3 16 8 9c0 7 5 8 8 7C14 10 18 6 22 4c-1 5 0 8 4 11 5 6 0 15-8 13" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="m24 31 8-8m-2-8 5 2m-4-8 4-2M14 30l-3 4m-2-6-4 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const callLabel = el('span', 'sk-klo-call-label', words.call);
    const key = el('kbd', 'sk-klo-key', words.callKey);
    key.setAttribute('aria-hidden', 'true');
    button.append(claw, callLabel, key);
    const hud = root.querySelector('.sk-hud');
    const journal = hud?.querySelector('.sk-journal-btn');
    if (journal) journal.after(button);
    else (hud || root).append(button);
    root.classList.add('sk-has-klo-ui');
    const measureCall = () => {
        if (!button.hidden && button.offsetWidth) root.style.setProperty('--sk-klo-clearance', `${button.offsetLeft + button.offsetWidth + 12}px`);
    };
    const sizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(measureCall) : null;
    sizeObserver?.observe(button);
    if (!sizeObserver) listen(doc.defaultView, 'resize', measureCall);

    const layer = el('div', 'sk-klo-layer');
    layer.hidden = true;
    const backdrop = el('div', 'sk-klo-backdrop');
    backdrop.setAttribute('aria-hidden', 'true');
    const sheet = el('section', 'sk-klo-sheet');
    sheet.id = uid;
    sheet.tabIndex = -1;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', `${uid}-name`);
    sheet.setAttribute('aria-describedby', `${uid}-answer`);
    const tape = el('span', 'sk-klo-tape');
    tape.setAttribute('aria-hidden', 'true');
    const header = el('header', 'sk-klo-header');
    const face = el('span', 'sk-klo-face');
    face.setAttribute('aria-hidden', 'true');
    const actor = portrait?.('klo');
    if (actor) face.append(actor);
    else face.append(claw.cloneNode(true));
    const identity = el('div', 'sk-klo-identity');
    const eyebrow = el('span', 'sk-klo-eyebrow', words.eyebrow);
    const name = el('h2', 'sk-klo-name', words.name);
    name.id = `${uid}-name`;
    const place = el('span', 'sk-klo-place');
    identity.append(eyebrow, name, place);
    const close = el('button', 'sk-klo-close', '×');
    close.type = 'button';
    close.title = words.close;
    close.setAttribute('aria-label', words.close);
    header.append(face, identity, close);

    const arrival = el('div', 'sk-klo-arrival');
    arrival.setAttribute('role', 'status');
    const tracks = el('span', 'sk-klo-tracks');
    tracks.setAttribute('aria-hidden', 'true');
    tracks.append(el('i'), el('i'), el('i'));
    arrival.append(tracks, el('span', 'sk-klo-arrival-text', words.arriving));

    const answer = el('div', 'sk-klo-answer');
    answer.id = `${uid}-answer`;
    answer.tabIndex = 0;
    answer.setAttribute('aria-live', 'polite');
    answer.setAttribute('aria-atomic', 'true');
    const answerLabel = el('div', 'sk-klo-answer-label');
    const levelTitle = el('span');
    const levels = el('span', 'sk-klo-levels');
    levels.setAttribute('aria-hidden', 'true');
    const marks = [el('i'), el('i'), el('i')];
    levels.append(...marks);
    answerLabel.append(levelTitle, levels);
    const response = el('p', 'sk-klo-response');
    answer.append(answerLabel, response);

    const choices = el('div', 'sk-klo-choices');
    const choiceButtons = new Map();
    const choiceLabels = new Map();
    for (const [id, label, icon] of [
        ['hint', words.hint, 'lens'], ['recap', words.recap, 'note'],
        ['local', words.local, 'wave'], ['close', words.thanks, 'check']
    ]) {
        const node = el('button', `sk-klo-option sk-klo-option-${id}`);
        node.type = 'button';
        node.dataset.choice = id;
        const text = el('span', 'sk-klo-option-label', label);
        node.append(drawnIcon(icon), text);
        if (id === 'hint') {
            const arrow = el('span', 'sk-klo-option-arrow', '↗');
            arrow.setAttribute('aria-hidden', 'true');
            node.append(arrow);
        }
        listen(node, 'click', () => {
            if (!open || model.arriving) return;
            onChoice?.(id);
        });
        choiceButtons.set(id, node);
        choiceLabels.set(id, text);
        choices.append(node);
    }
    sheet.append(tape, header, arrival, answer, choices);
    layer.append(backdrop, sheet);
    root.append(layer);

    const focus = node => {
        try { node?.focus({ preventScroll: true }); } catch { node?.focus(); }
    };
    const firstChoice = () => model.arriving ? close : choiceButtons.get('hint');
    const requestClose = () => { if (open) { if (onClose) onClose(); else hide(); } };
    listen(button, 'click', () => { if (!button.disabled) onCall?.(); });
    listen(close, 'click', requestClose);
    listen(backdrop, 'click', requestClose);
    // Keep pointer events in the notebook out of the world's gesture listeners.
    for (const type of ['pointerdown', 'pointerup', 'click']) listen(layer, type, e => e.stopPropagation());
    listen(doc, 'keydown', e => {
        if (!open) return;
        if (e.key === 'Escape') {
            e.preventDefault(); e.stopPropagation();
            if (!e.repeat) requestClose();
        } else if (e.key === 'Tab') {
            const nodes = model.arriving ? [close] : [close, answer, ...choiceButtons.values()];
            const at = nodes.indexOf(doc.activeElement);
            if (at < 0 || (e.shiftKey ? at === 0 : at === nodes.length - 1)) {
                e.preventDefault(); e.stopPropagation();
                focus(e.shiftKey ? nodes[nodes.length - 1] : nodes[0]);
            }
        }
    }, true);
    listen(doc, 'focusin', e => {
        if (open && !sheet.contains(e.target)) focus(firstChoice());
    });
    listen(button, 'animationend', () => button.classList.remove('inviting'));

    function update(patch = {}) {
        if (destroyed) return;
        const wasArriving = model.arriving;
        const previousResponse = response.textContent;
        for (const name of Object.keys(model)) if (patch[name] !== undefined) model[name] = patch[name];
        if (peeking !== (model.kind === 'hole')) {
            peeking = model.kind === 'hole';
            const actor = portrait?.('klo', peeking ? 'peek' : undefined);
            if (actor) face.replaceChildren(actor);
        }
        model.level = Math.max(0, Math.min(3, Math.trunc(Number(model.level) || 0)));
        model.arriving = !!model.arriving;
        layer.dataset.side = model.side === 'left' ? 'left' : 'right';
        layer.classList.toggle('arriving', model.arriving);
        layer.classList.toggle('still', !!lessMotion());
        sheet.dataset.topic = model.topic;
        sheet.setAttribute('aria-busy', String(model.arriving));
        place.textContent = model.place || '';
        place.hidden = !model.place;
        arrival.hidden = !model.arriving;
        answer.hidden = model.arriving;
        choices.hidden = model.arriving;
        const isHint = model.topic === 'hint' && model.level > 0;
        answerLabel.hidden = !isHint;
        levelTitle.textContent = isHint ? words.level[model.level - 1] : '';
        marks.forEach((mark, i) => mark.classList.toggle('inked', i < model.level));
        response.textContent = model.text || model.greeting || words.question;
        choiceLabels.get('hint').textContent = model.level === 0 ? words.hint
            : model.level === 1 ? words.nudge : model.level === 2 ? words.exact : words.repeat;
        for (const [id, node] of choiceButtons) {
            const selected = id === model.topic && id !== 'hint';
            node.classList.toggle('selected', selected);
            if (selected) node.setAttribute('aria-current', 'true');
            else node.removeAttribute('aria-current');
        }
        if (previousResponse !== response.textContent) answer.scrollTop = 0;
        if (open && wasArriving && !model.arriving) focus(firstChoice());
    }

    function show(patch = {}) {
        if (destroyed) return;
        const wasOpen = open;
        if (!wasOpen) returnFocus = doc.activeElement;
        update(patch);
        open = true;
        layer.hidden = false;
        root.classList.add('sk-klo-open');
        button.classList.remove('inviting');
        button.setAttribute('aria-expanded', 'true');
        if (!wasOpen) focus(firstChoice());
    }

    function hide() {
        if (!open) return;
        open = false;
        layer.hidden = true;
        root.classList.remove('sk-klo-open');
        button.setAttribute('aria-expanded', 'false');
        if (returnFocus?.isConnected && !returnFocus.disabled && !returnFocus.closest('[hidden], .off')) focus(returnFocus);
        else if (available.visible && available.enabled) focus(button);
        returnFocus = null;
    }

    return {
        button, show, update, hide,
        availability(patch = {}) {
            if (destroyed) return;
            if (patch.visible !== undefined) available.visible = !!patch.visible;
            if (patch.enabled !== undefined) available.enabled = !!patch.enabled;
            button.hidden = !available.visible;
            button.disabled = !available.enabled;
        },
        pulse() {
            if (destroyed || open || !available.visible || !available.enabled || lessMotion()) return;
            // One restrained invitation; no clue appears or focus moves.
            button.classList.remove('inviting');
            void button.offsetWidth;
            button.classList.add('inviting');
        },
        isOpen: () => open,
        destroy() {
            if (destroyed) return;
            hide();
            destroyed = true;
            listeners.splice(0).forEach(unlisten => unlisten());
            sizeObserver?.disconnect();
            button.remove(); layer.remove();
            root.classList.remove('sk-has-klo-ui', 'sk-klo-open');
            root.style.removeProperty('--sk-klo-clearance');
        }
    };
}
