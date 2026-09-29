/*
 * Sköldhästen – input: a floating stick (left thumb), two buttons (right thumb),
 * a tap on the sköldhäst (Gnägg), and the keyboard. No gesture needs timing,
 * mashing or two inputs at once (plan §4.1). All held input is released on
 * pointercancel, lost capture, blur, pause and close.
 */
export function createInput(root, ui, opts) {
    const ac = new AbortController();
    const sig = { signal: ac.signal };
    const keys = new Set();
    const edges = { act: false, hide: false, hideUp: false, tapHero: false, tapKlo: false, neigh: false };
    const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0, latched: 0 };
    const finger = { id: null, x: 0, y: 0 };
    let hopHeld = false;
    let enabled = true;
    const R = 58; // stick radius, CSS px
    let stickTap = null;
    let lastTap = null; // for tests

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
        zone.setPointerCapture?.(e.pointerId);
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
        if (opts.settings().followFinger) { finger.id = tapStart.klo ? null : e.pointerId; finger.x = e.clientX; finger.y = e.clientY; captureArea.setPointerCapture?.(e.pointerId); }
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
        btn.addEventListener('pointerdown', (e) => { if (!enabled) return; e.preventDefault(); btn.classList.add('down'); btn.setPointerCapture?.(e.pointerId); down(); }, sig);
        const release = () => { if (!btn.classList.contains('down')) return; btn.classList.remove('down'); up?.(); };
        btn.addEventListener('pointerup', release, sig);
        btn.addEventListener('pointercancel', release, sig);
        btn.addEventListener('lostpointercapture', release, sig);
        // keyboard activation of the focused button (Enter/Space) goes through click
        btn.addEventListener('click', (e) => { if (e.detail === 0 && enabled) { down(); up?.(); } }, sig);
    };
    press(ui.actBtn, () => { edges.act = true; hopHeld = true; stick.latched = 0; }, () => { hopHeld = false; });
    press(ui.hideBtn, () => { edges.hide = true; stick.latched = 0; }, () => { edges.hideUp = true; });

    // --- keyboard -----------------------------------------------------------------------
    const KEYMAP = {
        ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
        ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down'
    };
    window.addEventListener('keydown', (e) => {
        if (!enabled) return;
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (KEYMAP[e.key]) { keys.add(KEYMAP[e.key]); stick.latched = 0; e.preventDefault(); return; }
        if (e.repeat) return;
        if (e.key === ' ' || e.key === 'e' || e.key === 'E') {
            if (document.activeElement?.tagName === 'BUTTON' && document.activeElement !== ui.actBtn) return;
            e.preventDefault(); edges.act = true; hopHeld = true;
        } else if (e.key === 'Enter') {
            if (document.activeElement?.tagName === 'BUTTON') return;
            e.preventDefault(); edges.act = true;
        } else if (e.key === 'g' || e.key === 'G') { edges.hide = true; }
        else if (e.key === 'n' || e.key === 'N') { edges.neigh = true; }
        else if (e.key === 'k' || e.key === 'K') { edges.tapKlo = true; }
        else if (e.key === 'j' || e.key === 'J') { opts.onKey?.('journal'); }
        else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { opts.onKey?.('pause'); }
    }, sig);
    window.addEventListener('keyup', (e) => {
        if (KEYMAP[e.key]) keys.delete(KEYMAP[e.key]);
        if (e.key === ' ' || e.key === 'e' || e.key === 'E') hopHeld = false;
        if (e.key === 'g' || e.key === 'G') edges.hideUp = true;
    }, sig);
    const releaseAll = () => {
        keys.clear(); hopHeld = false; stick.id = null; stick.x = stick.y = 0; stick.latched = 0; finger.id = null;
        stickTap = tapStart = null;
        for (const key of Object.keys(edges)) edges[key] = false;
        ui.stickBase.classList.remove('on', 'gallop'); moveKnob();
        ui.actBtn.classList.remove('down'); ui.hideBtn.classList.remove('down');
    };
    window.addEventListener('blur', releaseAll, sig);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); }, sig);

    return {
        /** Continuous input: x, y in -1..1 */
        state() {
            let x = 0, y = 0;
            if (keys.has('left')) x -= 1; if (keys.has('right')) x += 1;
            if (keys.has('up')) y -= 1; if (keys.has('down')) y += 1;
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
            return { x, y, hopHeld };
        },
        /** One-shot presses since the last call */
        consume() {
            const out = { ...edges };
            edges.act = edges.hide = edges.hideUp = edges.tapHero = edges.tapKlo = edges.neigh = false;
            return out;
        },
        release: releaseAll,
        get lastTap() { return lastTap; },
        setEnabled(on) { enabled = on; if (!on) releaseAll(); },
        destroy() { ac.abort(); releaseAll(); }
    };
}
