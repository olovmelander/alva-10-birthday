/* A visit from Professor Klo. Owns presentation and requested help, never puzzles. */
import { describeKloArrival } from './klo-arrival.mjs';
import { describeKloHelp, describeKloLocal } from './klo-help.mjs';
import { KLO_COMPANION as W } from './content/sv.mjs';

export function normalizeKloHelpMode(mode) {
    if (['ask', 'remind', 'guided'].includes(mode)) return mode;
    return ({ easy: 'guided', normal: 'remind', hard: 'ask' })[mode] || 'ask';
}

export function sanitizeKloHints(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 128).filter(row => Array.isArray(row) && row.length === 2
        && typeof row[0] === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(row[0])
        && Number.isInteger(row[1]) && row[1] >= 1 && row[1] <= 3);
}

export function createKloCompanion(G, io) {
    let phase = 'idle', visit = null, elapsed = 0, age = 0, serial = 0;
    let marker = null, disposed = false, lastSuccess = -Infinity;
    const hints = new Map(), visits = new Map();
    const subscriptions = [];
    const on = (name, fn) => { const off = G.on(name, fn); if (typeof off === 'function') subscriptions.push(off); };
    const suspended = () => phase === 'arriving' || phase === 'talking';
    const help = () => describeKloHelp(G, io.story.guidance());
    const depth = () => hints.get(help().key) || 0;
    const line = (info, level) => [info.observation, info.nudge, info.instruction][Math.max(0, level - 1)] || info.observation;
    const words = (kind, variant) => {
        const lines = W.greetings[kind] || W.greetings.nearby;
        return Array.isArray(lines) ? lines[variant % lines.length] : lines || '';
    };
    const model = () => ({ kind: visit?.kind, place: W.places[visit?.kind] || '', greeting: visit?.greeting || '',
        text: visit?.text || visit?.greeting || '', topic: visit?.topic || 'welcome', level: depth(),
        arriving: phase === 'arriving', side: visit?.side || 'right' });
    function present() { if (suspended()) io.ui.update(model()); }
    function setPresentation() {
        if (!visit) return;
        const actor = G.actors.klo;
        actor.companion = { ...visit.entrance, kind: visit.kind, variant: visit.variant, time: age,
            progress: phase === 'arriving' ? Math.min(1, elapsed / visit.duration)
                : phase === 'leaving' ? Math.min(1, elapsed / .65) : 1,
            leaving: phase === 'leaving' };
    }
    function ready() {
        if (phase !== 'arriving') return;
        phase = 'talking'; elapsed = 0;
        setPresentation(); present();
    }
    function cancel({ restore = false } = {}) {
        const wasSuspended = suspended(), hadVisit = !!visit;
        phase = 'idle'; visit = null; elapsed = age = 0;
        if (G.actors.klo) { delete G.actors.klo.companion; G.actors.klo.talking = false; }
        io.ui.hide();
        if (wasSuspended) io.onResume?.();
        if (restore && hadVisit) io.story.restoreActors?.();
    }
    function call() {
        if (disposed) return false;
        if (phase === 'arriving') { ready(); return true; }
        if (phase === 'talking') { close(); return true; }
        if (!io.canCall()) return false;
        const previous = visit;
        const entrance = describeKloArrival(G, io.viewport?.() || {});
        const repeated = visits.get(entrance.kind) || 0;
        visits.set(entrance.kind, repeated + 1);
        visit = { entrance, kind: entrance.kind, variant: repeated % 2, scene: G.sceneId,
            duration: G.lessMotion ? .18 : entrance.nearby || previous ? .45 : repeated ? 1.05 : 1.65,
            greeting: words(entrance.kind, repeated), topic: 'welcome', text: '',
            side: entrance.x >= G.player.x ? 'left' : 'right', id: ++serial };
        const actor = G.actors.klo;
        if (!entrance.tutorial) {
            // A completed story can leave a short unawaited walk; settle its promise
            // before taking ownership. Active story walks are guarded by canCall.
            const walk = actor.walk; actor.walk = null; walk?.resolve?.();
            Object.assign(actor, { x: entrance.x, y: entrance.y, scene: G.sceneId, visible: true,
                pose: 'notebook', facing: entrance.facing, inHole: false, pop: 0, vx: 0, holding: null });
        }
        age = elapsed = 0; phase = 'arriving';
        io.guide?.clear(); io.onSuspend?.(entrance);
        setPresentation(); io.ui.show(model());
        io.audio?.sfx(entrance.underwater ? 'blubb' : 'crabclick');
        G.emit('kloCalled', { kind: visit.kind, scene: visit.scene });
        return true;
    }
    function close() {
        if (!suspended()) return;
        const tutorial = visit.entrance.tutorial;
        phase = tutorial ? 'idle' : 'watching'; elapsed = 0;
        io.ui.hide(); io.onResume?.();
        G.actors.klo.talking = false;
        if (tutorial) { delete G.actors.klo.companion; visit = null; }
        else setPresentation();
    }
    function requestHint() {
        const info = help(), level = Math.min(3, (hints.get(info.key) || 0) + 1);
        if (hints.size >= 128 && !hints.has(info.key)) hints.delete(hints.keys().next().value);
        hints.set(info.key, level);
        if (level === 3) marker = { key: info.key, scene: G.sceneId, until: G.time + 45 };
        io.onSave?.();
        return { ...info, level, text: line(info, level) };
    }
    function choose(topic) {
        if (!suspended()) return;
        if (topic === 'close') { close(); return; }
        ready();
        if (topic === 'hint') visit.text = requestHint().text;
        else if (topic === 'recap') visit.text = help().recap;
        else if (topic === 'local') {
            visit.text = describeKloLocal(G, visit.kind, visit.variant + (visit.localCount || 0));
            visit.localCount = (visit.localCount || 0) + 1;
        } else return;
        visit.topic = topic;
        G.actors.klo.talking = true;
        io.audio?.sfx('crabvoice'); present();
        G.emit('kloQuestion', { topic, level: depth() });
    }
    function markerActive() {
        if (marker && (marker.scene !== G.sceneId || marker.until <= G.time || marker.key !== help().key)) marker = null;
        return !!marker;
    }
    function tick(dt) {
        if (disposed) return;
        markerActive();
        if (!visit) return;
        if (visit.scene !== G.sceneId || G.busy || io.story.running()) { cancel(); return; }
        elapsed += dt; age += dt;
        if (phase === 'arriving' && elapsed >= visit.duration) ready();
        if (phase === 'watching') {
            const actor = G.actors.klo;
            actor.pose = G.time - lastSuccess < 2 ? 'happy' : Math.abs(G.player.vx) > 600 ? 'stopwatch' : 'notebook';
            if (elapsed > 12 || Math.hypot(actor.x - G.player.x, actor.y - G.player.y) > 950) { phase = 'leaving'; elapsed = 0; }
        }
        if (phase === 'leaving' && elapsed >= .65) { cancel({ restore: true }); return; }
        setPresentation();
    }
    on('scene', () => { marker = null; cancel(); });
    on('kloReminder', () => { if (!suspended()) io.ui.pulse(); });
    for (const type of ['inked', 'grow', 'opened', 'lit', 'mark', 'flattened', 'bigLanding', 'latch', 'pickup']) {
        on(type, () => {
            if (phase !== 'watching') return;
            lastSuccess = G.time;
            G.actors.klo.reactAt = G.time;
            G.actors.klo.pose = 'happy';
        });
    }
    return {
        call, choose, close, tick, suspended, markerActive, cancel,
        yieldToStory() { cancel(); },
        dismissHelp() { marker = null; },
        get phase() { return phase; },
        get visit() { return visit; },
        hintInfo() { if (!markerActive()) return { level: 0 }; const cue = io.story.guidance(); return { level: 1, spot: cue.target, key: marker.key }; },
        journal() {
            const info = help(), level = depth();
            return { ...info, level, text: level ? line(info, level) : '', request: requestHint };
        },
        serialize() { return [...hints]; },
        restore(value) { cancel(); marker = null; hints.clear(); visits.clear(); for (const [key, level] of sanitizeKloHints(value)) hints.set(key, level); },
        destroy() { cancel(); disposed = true; subscriptions.forEach(off => off()); }
    };
}
