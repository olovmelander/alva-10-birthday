/* Alva's pencil: a forgiving draft pad and guided strokes, with session-owned input. */
import { createTrace, distance, fitRect, fromUnit, pointBounds, simplifyStroke, toUnit } from './drawing-geometry.mjs';

const element = (tag, className, text) => {
    const node = document.createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};
const points = (list) => (list || []).filter(p => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])).map(p => p.slice(0, 2));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
let nextId = 0;

export function createDrawing(root, { host = root, words, onPencil, onUiSound } = {}) {
    const layer = element('section', 'sk-draw');
    layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.tabIndex = -1;
    const id = `sk-drawing-${++nextId}`;
    const pad = element('div', 'sk-draw-pad'); pad.setAttribute('aria-hidden', 'true');
    const canvas = element('canvas', 'sk-draw-canvas');
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', words.canvasLabel);
    const toolbar = element('div', 'sk-draw-toolbar');
    const prompt = element('h2', 'sk-draw-prompt'); prompt.id = id;
    const hint = element('p', 'sk-draw-hint'); hint.id = id + '-hint';
    hint.setAttribute('aria-live', 'polite');
    const progress = element('div', 'sk-draw-progress');
    progress.setAttribute('role', 'progressbar'); progress.setAttribute('aria-live', 'polite');
    const keyboard = element('p', 'sk-draw-keyboard', words.keyboardHint);
    toolbar.append(prompt, hint, progress, keyboard);
    layer.setAttribute('aria-labelledby', prompt.id); layer.setAttribute('aria-describedby', hint.id);
    const actions = element('div', 'sk-draw-actions');
    const button = (kind, label) => { const b = element('button', `sk-pbtn sk-draw-${kind}`, label); b.type = 'button'; return b; };
    const redo = button('redo', words.redo), example = button('example', words.example), done = button('done', words.done);
    done.classList.add('primary'); actions.append(redo, example, done);
    layer.append(pad, canvas, toolbar, actions); root.append(layer);
    let current = null, destroyed = false, resizeFrame = 0;
    const lifetime = new AbortController();
    const ctx = canvas.getContext('2d');

    function resize() {
        if (destroyed || !current || resizeFrame) return;
        resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; current?.layout(); });
    }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(host);
    window.addEventListener('resize', resize, { signal: lifetime.signal });

    function draw(opts = {}) {
        if (destroyed) return new Promise(() => {});
        current?.cancel();
        const focusBefore = document.activeElement;
        const session = new AbortController(), signal = session.signal;
        let active = true, pointer = null, gestureBefore = null, finishTimer = null;
        let draft = [], ready = false, gestureLength = 0;
        let source, display, ghost = [], anchors = [], trace = null, W = 0, H = 0, rect;
        let resolve;
        const promise = new Promise(r => { resolve = r; });
        const guided = !!points(opts.anchors || opts.getGeometry?.()?.anchors).length;
        prompt.textContent = opts.prompt || '';
        layer.classList.toggle('guided', guided); layer.classList.toggle('free', !guided);
        layer.classList.remove('preview', 'drawing'); layer.classList.add('on');
        progress.hidden = !guided;
        keyboard.hidden = !!window.matchMedia?.('(pointer: coarse)').matches;
        done.hidden = guided;

        const sound = () => onUiSound?.('ui');
        const setHint = (text) => { if (hint.textContent !== (text || '')) hint.textContent = text || ''; };
        function status(message) {
            setHint(message || (guided ? words.traceHint : ready ? words.previewHint : words.freeHint));
            redo.disabled = !draft.length && !(trace?.progress);
            done.disabled = !ready;
            layer.classList.toggle('preview', ready && !guided);
            if (guided && trace) {
                const label = typeof words.progress === 'function' ? words.progress(trace.progress, trace.total) : '';
                if (progress.textContent !== label) progress.textContent = label;
                progress.setAttribute('aria-valuemin', '0'); progress.setAttribute('aria-valuemax', String(trace.total));
                progress.setAttribute('aria-valuenow', String(trace.progress));
                progress.style.setProperty('--draw-progress', String(trace.progress / Math.max(1, trace.total)));
            }
        }
        function releasePointer() {
            const id = pointer; pointer = null;
            if (id !== null && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
        }
        function cancelGesture(message) {
            if (pointer === null) return;
            clearTimeout(finishTimer); finishTimer = null;
            trace?.cancel();
            draft = gestureBefore.draft; ready = gestureBefore.ready;
            releasePointer(); gestureBefore = null;
            layer.classList.remove('drawing'); status(message); render();
        }
        function cancel() {
            if (!active) return;
            active = false;
            clearTimeout(finishTimer);
            session.abort(); releasePointer();
            layer.classList.remove('on', 'preview', 'drawing');
            if (current?.cancel === cancel) current = null;
        }
        function finish(useExample = false) {
            if (!active) return;
            let result;
            if (guided) result = trace.points.slice(0, trace.total);
            else if (useExample || !ready) result = simplifyStroke(ghost.map(p => toUnit(p, source)), 200).map(p => fromUnit(p, source));
            else result = simplifyStroke(draft, 200).map(p => fromUnit(p, source));
            cancel();
            if (focusBefore?.isConnected) focusBefore.focus?.({ preventScroll: true });
            resolve(result);
        }
        function completeSoon() {
            // First confirmation wins: repeated Enter/taps must never defer completion.
            if (finishTimer === null) finishTimer = setTimeout(() => finish(), 220);
        }
        function restart() {
            cancelGesture(); clearTimeout(finishTimer); finishTimer = null;
            draft = []; ready = false; trace?.reset(); status(); render();
            layer.focus({ preventScroll: true });
        }
        function layout() {
            if (!active) return;
            const nextRect = layer.getBoundingClientRect();
            const width = nextRect.width || host.clientWidth, height = nextRect.height || host.clientHeight;
            if (pointer !== null && (Math.abs(width - W) > 1 || Math.abs(height - H) > 1)) cancelGesture(words.interruptedHint);
            rect = nextRect; W = width; H = height;
            const geometry = opts.getGeometry?.() || opts;
            ghost = points(geometry.ghost || opts.ghost);
            anchors = points(geometry.anchors || opts.anchors);
            source = geometry.bounds || opts.bounds || pointBounds(guided ? anchors : ghost.length ? ghost : [[W * 0.3, H * 0.4], [W * 0.7, H * 0.6]], guided ? 44 : 24);
            if (guided) {
                if (!trace) trace = createTrace(anchors, { stopAt: opts.stopAt, allowReverse: !!opts.allowReverse });
                else trace.setAnchors(anchors);
                display = { ...source, x: source.x - rect.left, y: source.y - rect.top };
            } else {
                const top = Math.max(24, toolbar.getBoundingClientRect().bottom - rect.top + 14);
                const bottom = Math.min(H - 16, actions.getBoundingClientRect().top - rect.top - 14);
                display = fitRect(source, { x: 22, y: top, width: Math.max(80, W - 44), height: Math.max(72, bottom - top) });
                Object.assign(pad.style, { left: display.x + 'px', top: display.y + 'px', width: display.width + 'px', height: display.height + 'px' });
            }
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
            canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            status(); render();
        }
        const local = (event) => [event.clientX - rect.left, event.clientY - rect.top];
        const authored = (point) => fromUnit(toUnit(point, display), source);
        const screen = (point) => fromUnit(toUnit(point, source), display);
        const inside = (p) => p[0] >= display.x && p[0] <= display.x + display.width && p[1] >= display.y && p[1] <= display.y + display.height;
        const bounded = (p) => [clamp(p[0], display.x + 3, display.x + display.width - 3), clamp(p[1], display.y + 3, display.y + display.height - 3)];
        function stroke(path, { color = opts.color || '#3b3530', width = opts.width || 4.5, alpha = 1, dashed = false } = {}) {
            if (path.length < 2) return;
            ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = ctx.lineJoin = 'round';
            if (dashed) ctx.setLineDash([7, 7]);
            ctx.beginPath(); ctx.moveTo(...path[0]);
            for (let i = 1; i < path.length - 1; i++) ctx.quadraticCurveTo(...path[i], (path[i][0] + path[i + 1][0]) / 2, (path[i][1] + path[i + 1][1]) / 2);
            ctx.lineTo(...path.at(-1)); ctx.stroke(); ctx.restore();
        }
        function render() {
            if (!active || !display) return;
            ctx.clearRect(0, 0, W, H);
            if (!guided) {
                ctx.save(); ctx.beginPath(); ctx.rect(display.x + 2, display.y + 2, display.width - 4, display.height - 4); ctx.clip();
                stroke(ghost.map(screen), { alpha: ready ? 0.16 : 0.28, width: 3, dashed: true, color: '#6b635a' });
                const line = draft.map(p => fromUnit(p, display));
                stroke(line, { width: 5, alpha: 0.19 }); stroke(line, { width: 2.6, alpha: 0.88 });
                ctx.restore();
            } else {
                const path = trace.points.slice(0, trace.total).map(screen);
                stroke(path, { width: 4, alpha: 0.35, dashed: true });
                stroke(path.slice(0, trace.progress), { width: 5, alpha: 0.9 });
                stroke(draft.map(p => fromUnit(p, display)), { width: 3, alpha: 0.55 });
                path.forEach((p, i) => {
                    const gap = i ? distance(p, path[i - 1]) : path.length > 1 ? distance(p, path[1]) : 44;
                    const radius = Math.max(5, Math.min(16, gap * 0.35));
                    ctx.beginPath(); ctx.arc(...p, radius, 0, Math.PI * 2);
                    ctx.fillStyle = i < trace.progress ? '#668469' : '#fbf8f1'; ctx.fill();
                    ctx.lineWidth = i === trace.progress ? 3 : 1.5;
                    ctx.strokeStyle = i === trace.progress ? '#bd812b' : '#887b69'; ctx.stroke();
                    if (i === trace.progress) { ctx.beginPath(); ctx.arc(...p, radius + 6, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(189,129,43,.32)'; ctx.lineWidth = 4; ctx.stroke(); }
                });
            }
        }
        function append(point) {
            const p = guided ? point : bounded(point), unit = toUnit(p, display);
            const last = draft.at(-1);
            if (!last || distance(fromUnit(last, display), p) >= 1.5) {
                if (last) { const length = distance(fromUnit(last, display), p); gestureLength += length; onPencil?.(Math.min(0.15, length / 180)); }
                draft.push(unit);
                if (draft.length > 1200) draft = simplifyStroke(draft, 600, 0.0005);
            }
        }
        canvas.addEventListener('pointerdown', (event) => {
            if (pointer !== null || event.button !== 0 || event.isPrimary === false) return;
            const p = local(event);
            if (!guided && !inside(p)) return;
            event.preventDefault(); layer.focus({ preventScroll: true });
            pointer = event.pointerId; gestureBefore = { draft: draft.map(p => p.slice()), ready };
            if (!guided) draft = [];
            ready = false; gestureLength = 0;
            canvas.setPointerCapture?.(pointer); layer.classList.add('drawing');
            append(p);
            if (trace?.begin(authored(p))) onPencil?.(0.15);
            status(); render();
            if (trace?.complete) completeSoon();
        }, { signal });
        canvas.addEventListener('pointermove', (event) => {
            if (event.pointerId !== pointer) return;
            event.preventDefault();
            const samples = event.getCoalescedEvents?.() || [];
            for (const e of [...samples, event]) {
                const p = local(e); append(p);
                if (trace?.move(authored(p))) onPencil?.(0.15);
            }
            status(); render();
            if (trace?.complete) completeSoon();
        }, { signal });
        canvas.addEventListener('pointerup', (event) => {
            if (event.pointerId !== pointer) return;
            event.preventDefault();
            const p = local(event); append(p); trace?.move(authored(p)); trace?.end();
            releasePointer(); gestureBefore = null; layer.classList.remove('drawing');
            if (!guided) ready = gestureLength >= 12 && draft.length >= 2;
            status(!guided && !ready ? words.shortHint : null); render();
            if (trace?.complete) completeSoon();
        }, { signal });
        for (const type of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(type, (e) => { if (e.pointerId === pointer) cancelGesture(words.interruptedHint); }, { signal });
        window.addEventListener('blur', () => cancelGesture(words.interruptedHint), { signal });
        document.addEventListener('visibilitychange', () => { if (document.hidden) cancelGesture(words.interruptedHint); }, { signal });
        redo.addEventListener('click', () => { sound(); restart(); }, { signal });
        example.addEventListener('click', () => { sound(); finish(true); }, { signal });
        done.addEventListener('click', () => { if (ready) { sound(); finish(); } }, { signal });
        window.addEventListener('keydown', (event) => {
            if (!active) return;
            if (event.key === 'Tab') {
                const buttons = [redo, example, done].filter(b => !b.hidden && !b.disabled);
                const at = buttons.indexOf(document.activeElement);
                const next = at < 0 ? event.shiftKey ? buttons.length - 1 : 0 : (at + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
                event.preventDefault(); event.stopImmediatePropagation(); buttons[next]?.focus(); return;
            }
            if (layer.contains(document.activeElement) && document.activeElement.tagName === 'BUTTON') return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); event.stopImmediatePropagation(); keyboard.hidden = false;
                if (guided) completeSoon(); else finish(!ready);
            } else if (event.key === 'Escape') {
                event.preventDefault(); event.stopImmediatePropagation(); restart();
            } else if (/^(Arrow|[wasdegnkjp]$)/i.test(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); }
        }, { signal, capture: true });
        current = { cancel, layout };
        status(); layout(); layer.focus({ preventScroll: true });
        return promise;
    }
    return {
        draw, resize,
        destroy() {
            if (destroyed) return;
            destroyed = true; current?.cancel();
            if (resizeFrame) cancelAnimationFrame(resizeFrame);
            lifetime.abort(); observer?.disconnect(); layer.remove();
        }
    };
}
