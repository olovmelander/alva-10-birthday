/*
 * Sköldhästen – input: a floating stick (left thumb), three buttons (right thumb),
 * a tap on the sköldhäst (Gnägg), the keyboard and a gamepad. No gesture needs
 * timing, mashing or two inputs at once (plan §4.1). All held input is released
 * on pointercancel, lost capture, blur, pause and close.
 *
 * Keyboard (plan §4.1): movement follows the keys' places, so WASD works on any
 * layout; the verbs keep their letters. The direction keys mean what the touch
 * stick means: on land ↑/W jumps (and brings the horse out of its shell) and
 * ↓/S tucks in; in water all four directions swim. G hides everywhere.
 * Opposite directions held together follow the latest press.
 */
export const MOVE_CODES = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
const MOVE_KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };
const VERB_KEYS = [' ', 'e', 'Enter', 'g', 'n', 'k', 'j', 'Escape', 'p', 'Shift'];
/** Holding Shift walks (and swims) calmly instead of breaking into a gallop. */
export const WALK = { land: 0.3, water: 0.55 };
/** ↑/W is Hoppa on land and Kom fram from the shell; in the water it only swims. */
export const upMeansHop = (player) => !!player && (player.mode !== 'swim' || !!player.hidden || !!player.hideQueued);
/** Standard-mapping gamepad buttons. */
export const PAD = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, back: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };

export function createInput(root, ui, opts) {
    const ac = new AbortController();
    const sig = { signal: ac.signal };
    const moves = new Map();      // held direction keys, oldest first: key id → direction
    const verbs = new Set();      // held verb keys by name
    const edges = { hop: false, up: false, act: false, duck: false, hide: false, hideUp: false, tapHero: false, tapKlo: false, neigh: false };
    let device = null;
    const setDevice = (d) => { if (d !== device) { device = d; opts.onDevice?.(d); } };
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

    // A touch anywhere (a laptop's screen, a tablet with a keyboard) brings the
    // on-screen controls; the keyboard or a gamepad puts them away again.
    window.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') setDevice('touch');
    }, { ...sig, capture: true });

    // --- keyboard -----------------------------------------------------------------------
    const swimming = () => opts.mode?.() === 'swim';
    const keyName = e => e.key.length === 1 ? e.key.toLowerCase() : e.key;
    // Movement by physical place (KeyW is W on QWERTY and Z on AZERTY). A key
    // event without a code (synthetic or very old) falls back to its letter.
    const moveOf = e => MOVE_CODES[e.code] || (!e.code || !/^(Key|Arrow)/.test(e.code) ? MOVE_KEYS[keyName(e)] : null);
    /** The latest held key of these directions (opposites: the newest press wins). */
    const latest = (dirs) => { let last = null; for (const dir of moves.values()) if (dirs.includes(dir)) last = dir; return last; };
    window.addEventListener('keydown', (e) => {
        if (!enabled || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
        const active = document.activeElement, key = keyName(e), dir = moveOf(e);
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
        if (!dir && !VERB_KEYS.includes(key)) return;
        e.preventDefault();
        if (e.repeat) return;
        if (key !== 'Shift') setDevice('keys');
        if (dir) {
            const id = e.code || key;
            if (moves.has(id)) return;
            moves.set(id, dir);
            stick.latched = 0;
            if (dir === 'up') edges.up = true;
            // On land Down tucks in under the shell (never toggles out); in the
            // water it simply swims down, exactly like the touch stick.
            if (dir === 'down' && !swimming()) { hideSources.add(id); edges.duck = true; }
            return;
        }
        if (verbs.has(key)) return;
        verbs.add(key);
        if (key === 'Shift') return;
        stick.latched = 0;
        if (key === ' ') edges.hop = true;
        else if (key === 'e' || key === 'Enter') edges.act = true;
        else if (key === 'g') { hideSources.add(key); edges.hide = true; } // G and the shell button keep their toggle
        else if (key === 'n') edges.neigh = true;
        else if (key === 'k') edges.tapKlo = true;
        else if (key === 'j') opts.onKey?.('journal');
        else if (key === 'Escape' || key === 'p') opts.onKey?.('pause');
    }, sig);
    window.addEventListener('keyup', (e) => {
        const key = keyName(e), id = e.code && moves.has(e.code) ? e.code : key;
        moves.delete(id);
        verbs.delete(key);
        releaseHide(id);
        if (id !== key) releaseHide(key);
    }, sig);

    // --- gamepad (standard mapping) ------------------------------------------------------
    // Play: left stick or D-pad moves and swims (the stick walks, trots and
    // gallops like the touch stick), A jumps and comes out, B hides, X uses,
    // Y calls Klo, a shoulder button neighs, Start pauses, View opens the journal.
    // Menus and choices: the D-pad or stick moves the focus, A presses, B goes back.
    const pad = { x: 0, y: 0, prev: [], hopHeld: false, active: false, navAt: 0, navDir: null, polledAt: -1 };
    const deadzone = v => Math.abs(v) < 0.22 ? 0 : Math.sign(v) * Math.min(1, (Math.abs(v) - 0.22) / 0.72);
    function focusables(scope) {
        return [...scope.querySelectorAll('button, input, select, summary, [tabindex]:not([tabindex="-1"])')]
            .filter(n => !n.disabled && n.getClientRects().length > 0 && !n.closest('[hidden], .sk-controls'));
    }
    function moveFocus(scope, step) {
        const list = focusables(scope);
        if (!list.length) return;
        const at = list.indexOf(document.activeElement);
        const next = list[at < 0 ? (step > 0 ? 0 : list.length - 1) : (at + step + list.length) % list.length];
        next.focus({ preventScroll: false });
    }
    function pollPad(now = (globalThis.performance?.now?.() ?? Date.now())) {
        if (now - pad.polledAt < 4) return;
        pad.polledAt = now;
        const list = globalThis.navigator?.getGamepads?.() || [];
        const gp = [...list].find(g => g && g.connected && g.buttons?.length);
        if (!gp) {
            if (pad.active) { pad.active = false; pad.x = pad.y = 0; pad.hopHeld = false; pad.prev = []; releaseHide('pad'); }
            return;
        }
        const down = i => !!gp.buttons[i]?.pressed || (gp.buttons[i]?.value ?? 0) > 0.5;
        const pressed = i => down(i) && !pad.prev[i];
        let x = deadzone(gp.axes?.[0] || 0), y = deadzone(gp.axes?.[1] || 0);
        if (down(PAD.left)) x = -1; if (down(PAD.right)) x = 1;
        if (down(PAD.up)) y = -1; if (down(PAD.down)) y = 1;
        const anyPress = gp.buttons.some((_, i) => pressed(i)) || Math.abs(x) > 0.5 || Math.abs(y) > 0.5;
        if (anyPress) { setDevice('pad'); pad.active = true; }
        const scope = enabled ? opts.focusScope?.() : null;
        if (scope) {
            // menus, choices, the title page and Klo's conversation
            pad.x = pad.y = 0; pad.hopHeld = false;
            const dir = y < -0.5 || x < -0.5 ? -1 : y > 0.5 || x > 0.5 ? 1 : 0;
            if (!dir) pad.navDir = null;
            else if (dir !== pad.navDir || now >= pad.navAt) {
                moveFocus(scope, dir);
                pad.navAt = now + (dir === pad.navDir ? 140 : 380); pad.navDir = dir;
            }
            const focused = document.activeElement;
            if (pressed(PAD.a)) {
                if (focused && focused !== document.body && scope.contains(focused)) focused.click();
                else moveFocus(scope, 1);
            }
            if (pressed(PAD.b)) opts.onBack?.();
            if (pressed(PAD.start)) opts.onKey?.('pause');
        } else if (enabled) {
            pad.x = x; pad.y = y; pad.hopHeld = down(PAD.a);
            if (pressed(PAD.a)) { edges.hop = true; stick.latched = 0; }
            if (pressed(PAD.b)) { hideSources.add('pad'); edges.hide = true; stick.latched = 0; }
            if (pressed(PAD.x)) { edges.act = true; stick.latched = 0; }
            if (pressed(PAD.y)) edges.tapKlo = true;
            if (pressed(PAD.lb) || pressed(PAD.rb)) edges.neigh = true;
            if (pressed(PAD.start)) opts.onKey?.('pause');
            if (pressed(PAD.back)) opts.onKey?.('journal');
        }
        if (!down(PAD.b)) releaseHide('pad');
        pad.prev = gp.buttons.map((_, i) => down(i));
    }

    const releaseAll = () => {
        const wasHiding = hideSources.size > 0;
        moves.clear(); verbs.clear(); hideSources.clear(); pointerHopHeld = false; stick.id = null; stick.x = stick.y = 0; stick.latched = 0; finger.id = null;
        pad.x = pad.y = 0; pad.hopHeld = false; // (menu repeat state survives: a paused frame releases every frame)
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
            pollPad();
            const water = swimming();
            const h = latest(['left', 'right']), v = latest(['up', 'down']);
            let x = h === 'left' ? -1 : h === 'right' ? 1 : 0, y = 0;
            // Vertical keys only steer in the water. On land ↑ is a jump and ↓ a
            // tuck, so neither may also drop the horse through a pier.
            if (water) y = v === 'up' ? -1 : v === 'down' ? 1 : verbs.has(' ') ? -1 : 0;
            if (verbs.has('Shift')) { x *= water ? WALK.water : WALK.land; y *= water ? WALK.water : 1; }
            if (pad.x || pad.y) { x = pad.x; y = pad.y; }
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
            // A held ↑/W keeps a jump high on land, as a held Space does.
            const upHeld = !water && v === 'up';
            return { x, y, hopHeld: pointerHopHeld || verbs.has(' ') || upHeld || pad.hopHeld, hideHeld: hideSources.size > 0 };
        },
        /** One-shot presses since the last call */
        consume() {
            pollPad();
            const out = { ...edges };
            for (const key of Object.keys(edges)) edges[key] = false;
            return out;
        },
        /** Read the gamepad now (menus keep working while the game is paused). */
        poll: () => pollPad(),
        release: releaseAll,
        get lastTap() { return lastTap; },
        setEnabled(on) { enabled = on; if (!on) releaseAll(); },
        destroy() { ac.abort(); releaseAll(); }
    };
}
