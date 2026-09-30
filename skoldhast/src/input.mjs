/*
 * Sköldhästen – input: a floating stick (left thumb), three buttons (right thumb),
 * a tap on the sköldhäst (Gnägg), and the keyboard. No gesture needs timing,
 * mashing or two inputs at once (plan §4.1). All held input is released on
 * pointercancel, lost capture, blur, pause and close.
 */
export function createInput(root, ui, opts) {
    const ac = new AbortController();
    const sig = { signal: ac.signal };
    const keys = new Set();
    const edges = { hop: false, act: false, duck: false, hide: false, hideUp: false, tapHero: false, tapKlo: false, neigh: false };
    const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, latched: 0 };
    const finger = { id: null, x: 0, y: 0 };
    let pointerHopHeld = false;
    const hideSources = new Set();
    let enabled = true;
    const R = 58; // stick radius, CSS px
    let stickTap = null;
    let lastTap = null; // for tests
    const captures = new Map();
    function capture(target, id) {
        try { target.setPointerCapture?.(id); captures.set(id, target); } catch { /* a canceled synthetic pointer */ }
    }

    // Klo's small, explicit target wins over the hero's generous tap circle.
    // A drag stays a stick gesture, even when it began over either character.
    function tapActor(x, y, allowHero = true) {
        if (opts.kloHit?.(x, y)) { edges.tapKlo = true; return 'klo'; }
        if (allowHero && opts.heroHit(x, y)) { edges.tapHero = true; return 'hero'; }
        return null;
    }

    // --- the stick --------------------------------------------------------------
    const zone = ui.stickZone;
    zone.addEventListener('pointerdown', (e) => {
        if (!enabled || stick.id !== null) return;
        if (opts.settings().followFinger) return;
        stick.id = e.pointerId;
        // the sköldhäst often stands inside the stick band: a quick tap on it is still a Gnägg
        stickTap = { x: e.clientX, y: e.clientY, t: e.timeStamp, moved: false };
        const r = zone.getBoundingClientRect();
        stick.ox = e.clientX - r.left; stick.oy = e.clientY - r.top;
        stick.x = stick.y = 0; stick.latched = 0;
        ui.stickBase.style.left = stick.ox + 'px'; ui.stickBase.style.top = stick.oy + 'px';
        ui.stickBase.classList.add('on');
        capture(zone, e.pointerId);
        moveKnob();
        e.preventDefault();
    }, sig);
    zone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== stick.id) return;
        if (stickTap && Math.hypot(e.clientX - stickTap.x, e.clientY - stickTap.y) > 14) stickTap.moved = true;
        const r = zone.getBoundingClientRect();
        let dx = (e.clientX - r.left - stick.ox) / R, dy = (e.clientY - r.top - stick.oy) / R;
        const m = Math.hypot(dx, dy);
        if (m > 1) { dx /= m; dy /= m; }
        stick.x = Math.abs(dx) < 0.12 ? 0 : dx;
        stick.y = Math.abs(dy) < 0.18 ? 0 : dy;
        // the knob lights up when the stick asks for a full gallop
        ui.stickBase.classList.toggle('gallop', Math.abs(stick.x) >= (opts.gallopDefl || 0.72));
        moveKnob();
    }, sig);
    const endStick = (e) => {
        if (e) captures.delete(e.pointerId);
        if (e && e.pointerId !== stick.id) return;
        if (e && e.type === 'pointerup' && stickTap && !stickTap.moved && e.timeStamp - stickTap.t < 350) tapActor(stickTap.x, stickTap.y);
        stickTap = null;
        // Håll kvar galoppen: letting go at full gallop keeps galloping
        if (e?.type === 'pointerup' && opts.settings().holdGallop && opts.isGalloping() && Math.abs(stick.x) > 0.7) stick.latched = Math.sign(stick.x);
        else stick.latched = 0;
        stick.id = null; stick.x = stick.y = 0;
        ui.stickBase.classList.remove('on', 'gallop');
        moveKnob();
    };
    zone.addEventListener('pointerup', endStick, sig);
    zone.addEventListener('pointercancel', endStick, sig);
    zone.addEventListener('lostpointercapture', endStick, sig);
    function moveKnob() { ui.stickKnob.style.transform = `translate(${stick.x * R * 0.7}px, ${stick.y * R * 0.7}px)`; }

    // --- follow the finger (optional mode) and taps on the sköldhäst ------------
    const canvasArea = opts.canvas;
    let tapStart = null;
    const startFinger = (e, captureArea = canvasArea) => {
        if (!enabled || (tapStart && tapStart.id !== e.pointerId)) return;
        tapStart = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, klo: !!opts.kloHit?.(e.clientX, e.clientY) }; // event times: robust to a slow frame
        // Greeting Klo should not turn the horse/camera and move Klo away from the touch.
        // A drag from his body still becomes steering once it crosses the tap slop.
        if (opts.settings().followFinger) { finger.id = tapStart.klo ? null : e.pointerId; finger.x = e.clientX; finger.y = e.clientY; capture(captureArea, e.pointerId); }
    };
    const moveFinger = (e) => {
        if (tapStart?.id === e.pointerId && tapStart.klo && opts.settings().followFinger && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > 14) {
            tapStart.klo = false; finger.id = e.pointerId;
        }
        if (e.pointerId === finger.id) { finger.x = e.clientX; finger.y = e.clientY; }
    };
    canvasArea.addEventListener('pointerdown', startFinger, sig);
    canvasArea.addEventListener('pointermove', moveFinger, sig);
    // The transparent stick band remains above the canvas in follow mode.
    // Forward its gestures instead of swallowing the entire left side of the screen.
    zone.addEventListener('pointerdown', (e) => { if (opts.settings().followFinger) startFinger(e, zone); }, sig);
    zone.addEventListener('pointermove', moveFinger, sig);
    const endFinger = (e) => {
        captures.delete(e.pointerId);
        if (tapStart && e.pointerId === tapStart.id) {
            const quick = e.type === 'pointerup' && e.timeStamp - tapStart.t < 350 && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < 14;
            const target = quick ? tapActor(e.clientX, e.clientY, !opts.settings().followFinger) : null;
            lastTap = { dt: Math.round(e.timeStamp - tapStart.t), quick, hit: target === 'hero', target };
            if (quick && opts.onTap) opts.onTap(e.clientX, e.clientY);
            tapStart = null;
        }
        if (e.pointerId === finger.id) finger.id = null;
    };
    for (const area of [canvasArea, zone]) {
        area.addEventListener('pointerup', endFinger, sig);
        area.addEventListener('pointercancel', endFinger, sig);
        area.addEventListener('lostpointercapture', endFinger, sig);
    }

    // --- buttons ----------------------------------------------------------------------
    const press = (btn, down, up) => {
        btn.addEventListener('pointerdown', (e) => { if (!enabled || btn.disabled) return; e.preventDefault(); btn.classList.add('down'); capture(btn, e.pointerId); down(); }, sig);
        const release = (e) => { if (e) captures.delete(e.pointerId); if (!btn.classList.contains('down')) return; btn.classList.remove('down'); up?.(); };
        btn.addEventListener('pointerup', release, sig);
        btn.addEventListener('pointercancel', release, sig);
        btn.addEventListener('lostpointercapture', release, sig);
        // Native keyboard/assistive activation of a focused button goes through click.
        // The gameplay Space shortcut below prevents its native click to avoid duplicates.
        btn.addEventListener('click', (e) => { if (e.detail === 0 && enabled && !btn.disabled) { down(); up?.(); } }, sig);
    };
    const releaseHide = source => {
        if (hideSources.delete(source) && !hideSources.size) edges.hideUp = true;
    };
    press(ui.hopBtn, () => { edges.hop = true; pointerHopHeld = true; stick.latched = 0; }, () => { pointerHopHeld = false; });
    press(ui.actBtn, () => { edges.act = true; stick.latched = 0; });
    press(ui.hideBtn, () => { hideSources.add('pointer'); edges.hide = true; stick.latched = 0; }, () => releaseHide('pointer'));

    // --- keyboard -----------------------------------------------------------------------
    const KEYMAP = {
        ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
        ArrowUp: 'up', w: 'up', x: 'down'
    };
    const keyName = e => e.key.length === 1 ? e.key.toLowerCase() : e.key;
    window.addEventListener('keydown', (e) => {
        if (!enabled || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
        const active = document.activeElement, key = keyName(e);
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(active?.tagName) || active?.isContentEditable) return;
        // K remains available while chatting; all other keys belong to the
        // conversation's native buttons, scrolling and focus trap.
        if (opts.companionOpen?.() && key !== 'k') return;
        const menuKey = ['Escape', 'p', 'j'].includes(key);
        if (ui.panelOpen?.() && !menuKey) return;
        // Enter activates a focused button. During play Space always belongs to
        // jumping, even after a game control or HUD button has received focus.
        if (key === 'Enter' && active?.tagName === 'BUTTON') return;
        if (key === ' ' && active?.closest?.('.sk-panel, .sk-title, .sk-dialogue, .sk-draw')) return;
        if (!KEYMAP[key] && ![' ', 'e', 'Enter', 'ArrowDown', 's', 'g', 'n', 'k', 'j', 'Escape', 'p'].includes(key)) return;
        e.preventDefault();
        if (e.repeat || keys.has(key)) return;
        keys.add(key);
        stick.latched = 0;
        if (key === ' ') edges.hop = true;
        else if (key === 'e' || key === 'Enter') edges.act = true;
        else if (key === 'ArrowDown' || key === 's' || key === 'g') {
            hideSources.add(key);
            // Down/S only tuck in; G and the shell button keep their toggle.
            if (key === 'g') edges.hide = true; else edges.duck = true;
        } else if (key === 'n') edges.neigh = true;
        else if (key === 'k') edges.tapKlo = true;
        else if (key === 'j') opts.onKey?.('journal');
        else if (key === 'Escape' || key === 'p') opts.onKey?.('pause');
    }, sig);
    window.addEventListener('keyup', (e) => {
        const key = keyName(e);
        keys.delete(key);
        releaseHide(key);
    }, sig);
    const releaseAll = () => {
        const wasHiding = hideSources.size > 0;
        keys.clear(); hideSources.clear(); pointerHopHeld = false; stick.id = null; stick.x = stick.y = 0; stick.latched = 0; finger.id = null;
        stickTap = tapStart = null;
        for (const key of Object.keys(edges)) edges[key] = false;
        if (wasHiding && opts.settings().holdToHide) edges.hideUp = true;
        ui.stickBase.classList.remove('on', 'gallop'); moveKnob();
        for (const btn of [ui.hopBtn, ui.actBtn, ui.hideBtn]) btn.classList.remove('down');
        const held = [...captures]; captures.clear();
        for (const [id, target] of held) {
            try { target.releasePointerCapture?.(id); } catch { /* already lost */ }
        }
    };
    window.addEventListener('blur', releaseAll, sig);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); }, sig);

    return {
        /** Continuous input: x, y in -1..1 */
        state() {
            let x = 0, y = 0;
            const held = dir => [...keys].some(key => KEYMAP[key] === dir);
            if (held('left')) x -= 1; if (held('right')) x += 1;
            if (held('up')) y -= 1; if (held('down')) y += 1;
            if (stick.id !== null) { x = stick.x; y = stick.y; }
            else if (stick.latched) {
                x = stick.latched;
                if (!opts.isGalloping() && opts.isStopped()) stick.latched = 0;
            }
            if (finger.id !== null) {
                const hp = opts.heroScreen();
                if (hp) {
                    const W = window.innerWidth, H = window.innerHeight;
                    const dx = finger.x - hp.x, dy = finger.y - hp.y;
                    x = Math.abs(dx) < 24 ? 0 : Math.max(-1, Math.min(1, dx / (W * 0.4)));
                    if (Math.abs(x) > 0.95) x = Math.sign(x);
                    y = Math.abs(dy) < 30 ? 0 : Math.max(-1, Math.min(1, dy / (H * 0.3)));
                }
            }
            return { x, y, hopHeld: pointerHopHeld || keys.has(' '), hideHeld: hideSources.size > 0 };
        },
        /** One-shot presses since the last call */
        consume() {
            const out = { ...edges };
            for (const key of Object.keys(edges)) edges[key] = false;
            return out;
        },
        release: releaseAll,
        get lastTap() { return lastTap; },
        setEnabled(on) { enabled = on; if (!on) releaseAll(); },
        destroy() { ac.abort(); releaseAll(); }
    };
}
