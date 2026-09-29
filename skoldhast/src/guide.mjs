/*
 * Sköldhästen – guidance: what to do next, and why something did not work.
 *
 *   const guide = createGuide(uiRoot, { img, heroScreen, onGoalTap });
 *   guide.goal(text)            // the current goal as a small note at the top ('' hides it)
 *   guide.hint(text, who)       // a non-blocking speech bubble (Klo's hint when you are stuck)
 *   guide.think(text)           // a thought bubble beside the sköldhäst's head (why it refused)
 *   guide.tip(text, { at })     // a one-off tip card; at = 'stick' | 'act' | 'hide' | 'journal' points at that control
 *   guide.update()              // each frame: keeps the bubbles in place
 *   guide.show(on)              // hide everything during cutscenes and the table
 *
 * Nothing here blocks play or changes the game; the words come from content/sv.mjs.
 * heroScreen() returns { x, y, scale, facing } in page pixels (y at the middle of the body).
 * The goal note and the hint share a column at the top, so they never overlap; the ui's
 * toasts read --sk-guide-free (set here) to start below that column.
 */
import { NAMES } from './content/sv.mjs';

const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const HL_PX = 200; // world units per horse length

export function createGuide(root, { img, heroScreen, onGoalTap } = {}) {
    const layer = el('div', 'sk-guide');
    root.appendChild(layer);
    const top = el('div', 'sk-guide-top');
    layer.appendChild(top);

    // --- the goal note ---------------------------------------------------------------
    const goalEl = el('button', 'sk-goal empty');
    goalEl.type = 'button';
    const goalLabel = el('span', 'sk-goal-label', 'Mål');
    const goalText = el('span', 'sk-goal-text');
    goalEl.append(goalLabel, goalText);
    goalEl.addEventListener('click', () => onGoalTap?.());
    top.appendChild(goalEl);
    let goalNow = '';

    // --- Klo's hint bubble --------------------------------------------------------------
    const hintEl = el('div', 'sk-hintbubble');
    hintEl.setAttribute('role', 'status');
    hintEl.setAttribute('aria-live', 'polite');
    const hintFace = el('span', 'sk-hint-face');
    if (img) hintFace.style.backgroundImage = `url("${img('ui-claw')}")`;
    const hintBody = el('span', 'sk-hint-body');
    const hintWho = el('span', 'sk-hint-who');
    const hintText = el('span', 'sk-hint-text');
    hintBody.append(hintWho, hintText);
    hintEl.append(hintFace, hintBody);
    hintEl.addEventListener('click', () => hide(hintEl));
    top.appendChild(hintEl);

    // --- the thought bubble -------------------------------------------------------------
    const thinkEl = el('div', 'sk-think');
    thinkEl.setAttribute('aria-live', 'polite');
    const thinkText = el('span', 'sk-think-text');
    const dotA = el('i', 'sk-think-dot a'), dotB = el('i', 'sk-think-dot b');
    thinkEl.append(thinkText, dotA, dotB);
    layer.appendChild(thinkEl);

    // --- the tip card -----------------------------------------------------------------------
    const tipEl = el('div', 'sk-tip');
    tipEl.setAttribute('role', 'status');
    const tipText = el('span', 'sk-tip-text');
    tipEl.append(el('span', 'sk-tip-icon', '✎'), tipText);
    layer.appendChild(tipEl);
    let tipAt = null;

    const timers = new Map();
    function showFor(node, ms, after) {
        clearTimeout(timers.get(node));
        node.classList.remove('on');
        void node.offsetWidth; // restart the entry animation
        node.classList.add('on');
        if (ms) timers.set(node, setTimeout(() => { node.classList.remove('on'); after?.(); }, ms));
    }
    function hide(node) { clearTimeout(timers.get(node)); node.classList.remove('on'); if (node === hintEl) hintDone(); }
    function hintDone() { top.classList.remove('hinting'); freeTop(); }

    let shown = true, thinking = false;
    const box = () => layer.getBoundingClientRect();
    /** how far down the goal note and the hint reach (px from the top of the layer; layout boxes, so
     *  the note's drop-in animation can't make it look shorter than it is) */
    function stackBottom() {
        if (!shown) return 0;
        let b = 0;
        for (const n of [goalEl, hintEl]) {
            if (n === hintEl && !n.classList.contains('on')) continue;
            if (n.offsetHeight) b = Math.max(b, top.offsetTop + n.offsetTop + n.offsetHeight);
        }
        return b;
    }
    // let the ui's toasts start below the note and the hint
    function freeTop() {
        const b = stackBottom();
        if (b > 0) root.style.setProperty('--sk-guide-free', Math.round(b + 10) + 'px');
        else root.style.removeProperty('--sk-guide-free');
    }

    // --- placing the tip next to the control it is about ------------------------------------
    const anchors = {
        stick: () => root.querySelector('.sk-stick-base'),
        act: () => root.querySelector('.sk-act'),
        hide: () => root.querySelector('.sk-hide'),
        journal: () => root.querySelector('.sk-journal-btn')
    };
    function placeTip() {
        const r = box();
        const W = r.width, H = r.height;
        const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
        const a = tipAt && anchors[tipAt]?.();
        const q = a?.getBoundingClientRect();
        let x, y, pt = '', ax = 0;
        if (q && q.width && tipAt === 'stick' && W > H) {
            // a short landscape screen: beside the stick, low over the ground
            x = q.right - r.left + 10; y = q.top - r.top + q.height / 2 - th / 2; pt = 'pt-left';
        } else if (q && q.width && tipAt === 'stick') {
            x = q.left - r.left + q.width / 2 - 34; y = q.top - r.top - th - 6; pt = 'pt-down'; ax = 34;
        } else if (q && q.width && (tipAt === 'act' || tipAt === 'hide')) {
            x = q.left - r.left - tw - 14; y = q.top - r.top + q.height / 2 - th / 2; pt = 'pt-right';
            if (x < 10) {
                // a narrow screen: above the buttons, pointing down at this one
                const btns = root.querySelector('.sk-btns')?.getBoundingClientRect();
                x = q.left - r.left + q.width / 2 - tw + 40; ax = tw - 40;
                y = Math.min(q.top, btns?.top ?? q.top) - r.top - th - 12; pt = 'pt-down';
            }
        } else if (q && q.width && tipAt === 'journal') {
            x = q.left - r.left; y = Math.max(q.bottom - r.top, stackBottom()) + 12; pt = 'pt-up'; ax = q.width / 2;
        } else {
            // no control to point at: low in the middle, clear of the buttons
            const land = W > H;
            x = W / 2 - tw / 2;
            y = land ? H - th - Math.max(14, H * 0.05) : Math.min(H * 0.8, H - 200) - th;
        }
        const cx = clamp(x, 10, W - tw - 10), cy = clamp(y, 10, H - th - 10);
        tipEl.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px)`;
        tipEl.classList.remove('pt-down', 'pt-right', 'pt-up', 'pt-left');
        if (pt) {
            tipEl.classList.add(pt);
            if (pt === 'pt-right' || pt === 'pt-left') tipEl.style.setProperty('--a', Math.round(th / 2 - 8) + 'px');
            else tipEl.style.setProperty('--a', Math.round(clamp(x - cx + ax - 8, 12, tw - 28)) + 'px');
        }
    }

    // --- the thought bubble: above the head, or beside it when the sky is taken ----------------
    function placeThink() {
        const s = heroScreen?.();
        if (!s) return;
        const r = box();
        const W = r.width, H = r.height;
        const sc = (s.scale || 0.8) * HL_PX, f = s.facing || 1;
        const headX = s.x - r.left + f * 0.32 * sc, headY = s.y - r.top - 0.42 * sc;
        const bw = thinkEl.offsetWidth, bh = thinkEl.offsetHeight;
        const minTop = stackBottom() + 8;
        let x = headX - f * 0.2 * sc - bw / 2, y = headY - 34 - bh;
        if (y < minTop) {
            // no room above: behind the head (so the thing it refused stays in view), or in front if the edge is near
            y = Math.max(minTop, headY - bh * 0.7);
            x = f > 0 ? headX - 0.62 * sc - bw : headX + 0.62 * sc;
            if (x < 8 || x + bw > W - 8) x = f > 0 ? headX + 0.3 * sc : headX - 0.3 * sc - bw;
        }
        x = clamp(x, 8, W - bw - 8); y = clamp(y, Math.min(minTop, H - bh - 8), H - bh - 8);
        thinkEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        // two little dots from the bubble to the head
        const cx = x + bw / 2, cy = y + bh / 2, dx = headX - cx, dy = headY - cy;
        const k = Math.min(dx ? Math.abs(bw / 2 / dx) : Infinity, dy ? Math.abs(bh / 2 / dy) : Infinity, 1);
        const ex = cx + dx * k, ey = cy + dy * k;
        const put = (n, t, size) => { n.style.transform = `translate(${Math.round(ex + (headX - ex) * t - x - size / 2)}px, ${Math.round(ey + (headY - ey) * t - y - size / 2)}px)`; };
        put(dotA, 0.3, 14); put(dotB, 0.66, 8);
    }

    return {
        goal(text) {
            const t = text || '';
            if (t === goalNow) return;
            goalNow = t;
            goalText.textContent = t;
            goalEl.classList.toggle('empty', !t);
            if (t) { goalEl.classList.remove('new'); void goalEl.offsetWidth; goalEl.classList.add('new'); }
            freeTop();
        },
        hint(text, who = 'klo', ms = 7000) {
            if (!text) return;
            hintWho.textContent = NAMES[who] || '';
            hintText.textContent = text;
            hintEl.className = 'sk-hintbubble who-' + who;
            top.classList.add('hinting');
            showFor(hintEl, ms, hintDone);
            freeTop();
        },
        think(text, ms = 2600) {
            if (!text) return;
            thinkText.textContent = text;
            thinking = true;
            showFor(thinkEl, ms, () => { thinking = false; });
            placeThink();
        },
        tip(text, { at = null, ms = 6500 } = {}) {
            if (!text) return;
            tipText.textContent = text;
            tipAt = at;
            showFor(tipEl, ms, () => { tipAt = null; });
            placeTip();
        },
        /** each frame while playing */
        update() {
            if (!shown) return;
            if (thinking) placeThink();
            if (tipEl.classList.contains('on')) placeTip();
        },
        show(on) {
            on = !!on;
            if (on === shown) return;
            shown = on;
            layer.classList.toggle('off', !on);
            freeTop();
        },
        clear() { hide(hintEl); hide(thinkEl); hide(tipEl); thinking = false; },
        destroy() { for (const t of timers.values()) clearTimeout(t); root.style.removeProperty('--sk-guide-free'); layer.remove(); }
    };
}
