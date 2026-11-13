/*
 * Äventyr 3 – the story director (docs/skoldhast/adventure-3.md, sections 6, 10 and 11).
 *
 *   const story = createStory(G, io);   // io: { ui, audio, fx, save, settings }
 *   story.start();                      // after the prologue, or after a restore
 *   story.step(dt);                     // from G.step: companions follow, beats queue
 *
 * As Äventyr 2's: beats run one at a time and hold play while they run (G.busy); a beat's "b:<id>" flag is
 * written when it ends, so a beat cut short by closing plays again. fx(name, data) runs a staged moment in the
 * view (the robot resolves it at once).
 *
 * The spine: ten star-lights on four pages, and one question – who takes Alva's stars, and why? Four
 * hypotheses (the first and the second wrong, which is new for the series). The answer is Suddet, the eraser
 * from Alva's table; the Moon is rubbed out bite by bite, then the sköldhäst itself; the player gallops it
 * back; Suddet learns that an eraser can draw on a dark sky; Den stora galoppen paints Vintergatan; Nova
 * catches everyone; the hooves draw the Moon whole; the ten stars go home in gold.
 */
import { HL } from '../../src/sim.mjs';
import { STORY, HINTS, GOALS, POINT, CLUES, CLUE_ORDER, FACTS, FACT_ORDER, POSTCARDS, CHATTER, BALK, WORDS } from './content/sv.mjs';
import { LIGHT_TOTAL, LIGHTS_ON, LIGHT_IDS } from './content/world.mjs';
import { lightsFound, lightFlag, collectLight, lightState, cometState } from './puzzles.mjs';

const h = (v) => v * HL;

/** Each puzzle: where its help applies, when it is solved, and (optionally) what must have happened first. */
const PUZZLES = [
    { id: 'm1', scene: 'mane', areas: ['landing', 'crater'], solved: F => F.has('breakfast') },
    { id: 'm2', scene: 'mane', areas: ['deep'], solved: F => F.has(lightFlag('l1')) && F.has('beam_used'), needs: 'breakfast' },
    { id: 'm3', scene: 'mane', areas: ['night'], solved: F => F.has(lightFlag('l2')), needs: 'breakfast' },
    { id: 'm4', scene: 'mane', areas: ['edge'], solved: F => F.has(lightFlag('l3')), needs: 'breakfast' },
    { id: 'm5', scene: 'mane', areas: ['edge', 'view'], solved: F => F.has('m5_view'), needs: 'breakfast' },
    { id: 'fin', scene: 'mane', areas: ['landing', 'crater'], solved: F => F.has('fin_drawn'), needs: 'm5_view' },
    { id: 's1', scene: 'stjarn', areas: ['dock', 'wagon'], solved: F => F.has('wagon_drawn') },
    { id: 's2', scene: 'stjarn', areas: ['belt'], solved: F => F.has(lightFlag('l4')) },
    { id: 's3', scene: 'stjarn', areas: ['bear'], solved: F => F.has(lightFlag('l5')) },
    { id: 's4', scene: 'stjarn', areas: ['pip'], solved: F => F.has(lightFlag('l6')) },
    { id: 'r1', scene: 'ring', areas: ['icedock', 'gravel'], solved: F => F.has('gravel_passed') },
    { id: 'r2', scene: 'ring', areas: ['sling'], solved: F => F.has('slung') },
    { id: 'r3', scene: 'ring', areas: ['shade'], solved: F => F.has(lightFlag('l7')) },
    { id: 'r4', scene: 'ring', areas: ['cometLane'], solved: F => F.has(lightFlag('l8')) },
    { id: 'r5', scene: 'ring', areas: ['gap'], solved: F => F.has(lightFlag('l9')) },
    { id: 'v1', scene: 'sudd', areas: ['whiteEdge', 'marks'], solved: F => F.has('dent4') },
    { id: 'v2', scene: 'sudd', areas: ['fog'], solved: F => F.has('fogd3') },
    { id: 'v3', scene: 'sudd', areas: ['lastBridge'], solved: F => F.has('bridge_crossed') },
    { id: 'v4', scene: 'sudd', areas: ['crumbs'], solved: F => F.has('climax') || F.has('self_drawn'), needs: 'bridge_crossed' },
    { id: 'v5', scene: 'sudd', areas: ['crumbs'], solved: F => F.has('self_drawn'), needs: 'outline_gone' },
    { id: 'g1', scene: 'vinter', areas: ['tail'], solved: F => F.has('ride_done'), needs: 'ride' },
    { id: 'f1', scene: 'vinter', areas: ['cometHead', 'tail'], solved: F => F.has('caught'), needs: 'ride_done' },
    { id: 'f2', scene: 'mane', areas: ['landing', 'westRim', 'crater'], solved: F => F.has('moon_whole'), needs: 'caught' },
    { id: 'home', scene: 'mane', areas: ['landing', 'westRim', 'crater', 'jumps'], solved: F => F.has('lights_home'), needs: 'moon_whole' }
];

/** Klo's "Häst eller sköldpadda?" in space (section 14): each written in once its flag is set. Eight and eight. */
const MEASURES = [
    { id: 'moonJump', kind: 'horse', flag: 'shelf_reached' },
    { id: 'angry', kind: 'horse', flag: 'night_lit' },
    { id: 'wagon', kind: 'horse', flag: 'wagon_drawn' },
    { id: 'nose', kind: 'horse', flag: 'bear_nose' },
    { id: 'ice', kind: 'horse', flag: 'ice_melted' },
    { id: 'gap', kind: 'horse', flag: 'gap_drawn' },
    { id: 'milky', kind: 'horse', flag: 'ride_done' },
    { id: 'rim', kind: 'horse', flag: 'moon_whole' },
    { id: 'beam', kind: 'turtle', flag: 'beam_used' },
    { id: 'drop', kind: 'turtle', flag: 'm4_drop' },
    { id: 'orbit', kind: 'turtle', flag: 'pip_met' },
    { id: 'gravel', kind: 'turtle', flag: 'gravel_held' },
    { id: 'comet', kind: 'turtle', flag: 'comet_lane' },
    { id: 'still', kind: 'turtle', flag: 'fog1_lit' },
    { id: 'noLine', kind: 'turtle', flag: 'bridge_crossed' },
    { id: 'caught', kind: 'turtle', flag: 'caught' },
    { id: 'weight', kind: 'other', flag: 'breakfast' },
    { id: 'sling', kind: 'other', flag: 'slung' },
    { id: 'mornings', kind: 'other', flag: 'b:suddArrive' },
    { id: 'self', kind: 'other', flag: 'notes_ink' }
];
/** After the story: eight secrets (section 15), each written into "Hemligt" once it has happened. */
const SECRETS = [
    { id: 'silentNeigh', flag: 's:silentNeigh', page: 'any' },
    { id: 'earthrise', flag: 's:earthrise', page: 'mane' },
    { id: 'suddStar', flag: 's:suddStar', page: 'mane' },
    { id: 'secondBox', flag: 's:secondBox', page: 'mane' },
    { id: 'bearSnore', flag: 's:bearSnore', page: 'stjarn' },
    { id: 'pipPhoto', flag: 's:pipPhoto', page: 'stjarn' },
    { id: 'cometRace', flag: 's:cometRace', page: 'ring' },
    { id: 'whiteDraw', flag: 's:whiteDraw', page: 'sudd' }
];
/** When each of Klo's facts and clues is written into the notebook: the flag that means it has been said. */
const CLUE_AT = { ten: 'b:count', light: 'b:firstLight', white: 'b:view2', crumbs: 'b:fin', rubber: 'b:bearGives', photo: 'b:pipDone',
    crooked: 'b:cometSaw', gone: 'b:eraserGone', sudd: 'b:drain', colour: 'self_drawn', milky: 'ride_done' };
const FACT_AT = { sixth: 'breakfast', prints: 't:prints', night: 'b:night', side: 'm5_view', sound: 'b:bear', wagon: 'wagon_drawn',
    belt: 'belt_lit', twinkle: 'b:stjarnArrive', rings: 'b:ringArrive', tail: 'b:cometSaw', sun: 't:sunFact', milky: 'ride_done' };
const CARD_AT = { mane: 'card_mane', stjarn: 'card_stjarn', ring: 'card_ring', sudd: 'b:suddArrive', end: 'ended', answer: 'card_answer' };
const PAGE_ORDER = ['mane', 'stjarn', 'ring', 'sudd'];

/** The Moon in the sky: how many bites, how lit (the view draws it wherever it is in the picture). */
export function moonState(F) {
    if (F.has('moon_whole') || !F.has('moon_bitten')) return { bites: 0, lit: 1, drain: 0 };
    return { bites: 3, lit: 0.18, drain: 1 };
}

export function createStory(G, io) {
    const queue = [];
    let current = null, thoughtAt = -10;
    const hintLevel = new Map();
    const said = new Map();
    let lightLine = 0, chatter = { nova: 0, klo: 0, sudd: 0 }, gallopRemark = 0, beltMisses = 0;
    const F = G.flags;
    const done = (id) => F.has('b:' + id);
    const ui = () => io.ui;
    const say = async (lines) => { if (lines?.length) await ui().say(lines); };
    const remark = (line) => ui().remark?.(line);
    const fx = async (name, data) => { try { return await io.fx?.(name, data); } catch (err) { console.warn('fx', name, err); return null; } };
    const clue = (id) => { if (!F.has('clue_' + id)) { G.flag('clue_' + id); G.emit('clue', { id }); } };
    G.moon = { bites: 0, lit: 1, drain: 0 };
    G.travelOk = () => !current && !queue.length && !F.has('climax') || F.has('ended');

    function think(text, { gap = 2.2, key = text, force = false } = {}) {
        if (!text) return;
        const last = said.get(key) ?? -Infinity;
        if (!force && (G.time - last < gap || G.time - thoughtAt < 0.8)) return;
        said.set(key, G.time); thoughtAt = G.time;
        if (io.ui.think) io.ui.think(text); else io.ui.toast?.(text);
    }
    function thinkOnce(id, text) { if (F.has('t:' + id)) return; G.flag('t:' + id); think(text, { gap: 0, force: true }); }

    /** Queue a beat. once: skip when its flag is already set. */
    function beat(id, fn, { once = true, lock = true } = {}) {
        if (once && (done(id) || queue.some(q => q.id === id) || current?.id === id)) return;
        queue.push({ id, fn, once, lock });
    }
    async function run(b) {
        current = b;
        if (b.lock) G.busy++;
        try { await b.fn(); }
        catch (err) { console.error('Sköldhästen: beat', b.id, err); }
        finally {
            if (b.lock) G.busy = Math.max(0, G.busy - 1);
            if (b.once) G.flag('b:' + b.id);
            current = null;
            io.save?.();
        }
    }

    // --------------------------------------------------------------------------
    // actors: Klo, Nova (hovering on her beam), Suddet, and the friends the view draws by state
    // --------------------------------------------------------------------------
    function actor(id, o) {
        G.actors[id] = Object.assign(G.actors[id] || { id, x: 0, y: 0, facing: 1, vx: 0, visible: false, pose: 'idle' }, o);
        return G.actors[id];
    }
    function groundAt(x, y) {
        const s = G.terrain?.support(x, y, 0.45 * HL, 0.9 * HL);
        if (!s || s.s.hidden) return null;
        if (G.terrain.waterAt(x, s.y - 4)?.kind && G.terrain.waterAt(x, s.y - 4).kind !== 'space') return null;
        return s.y;
    }
    function place(a, x, y = G.player.y) {
        const gy = groundAt(x, y);
        if (gy === null) return false;
        a.x = x; a.y = gy; a.scene = G.sceneId; a.vx = 0;
        return true;
    }
    function novaFollows() { return F.has('breakfast') && !(G.sceneId === 'mane' && F.has('ended') && G.areas.has('crater') && false); }
    function setupActors() {
        const sc = G.sceneId, sp = G.sceneDef.spots, p = G.player;
        const nova = actor('nova', { visible: true, scene: sc, follow: novaFollows() });
        if (!nova.follow && sc === 'mane') Object.assign(nova, { x: sp.novaBed.x, y: sp.novaBed.y, facing: 1, carried: false });
        else Object.assign(nova, { x: p.x - p.facing * 1.9 * HL, y: p.y, facing: p.facing });
        nova.mood = nova.mood || (nova.follow ? 'ordinary' : 'asleep');
        const klo = actor('klo', { visible: true, follow: F.has('b:arrive') });
        if (klo.scene !== sc || !klo.follow) {
            klo.scene = sc;
            if (!place(klo, p.x - p.facing * 1.2 * HL) && !place(klo, p.x + p.facing * 1.2 * HL)) Object.assign(klo, { x: p.x - p.facing * 1.2 * HL, y: p.y, carried: true });
        }
        // Suddet: far ahead in the white; on its hill; a small friend on the Moon after the story
        const sudd = actor('sudd', { visible: false, scene: null });
        if (sc === 'sudd' && F.has('b:suddArrive') && !F.has('ended')) Object.assign(sudd, { visible: true, scene: 'sudd', x: suddWait(), y: 0, size: F.has('self_drawn') ? 0.5 : suddSize(), pose: 'hop' });
        else if (sc === 'mane' && F.has('ended')) Object.assign(sudd, { visible: true, scene: 'mane', x: sp.novaBed.x + 2.2 * HL, y: sp.novaBed.y - 0.02 * HL, size: 0.6, pose: 'idle', eyes: true, goldStar: true });
        else if (sc === 'vinter' && !F.has('caught')) Object.assign(sudd, { visible: true, scene: 'vinter', riding: true, size: 0.55, pose: 'rub' });
        else if (sc === 'mane' && F.has('caught')) Object.assign(sudd, { visible: true, scene: 'mane', riding: !F.has('moon_whole'), staged: false,
            x: p.x - p.facing * 0.9 * HL, y: p.y, size: 0.55, pose: 'idle', eyes: false });
        if (sc === 'sudd' && F.has('b:suddArrive')) { const y = G.terrain.support(sudd.x, h(-3), h(4), h(4))?.y; if (y !== undefined) sudd.y = y; }
        G.moon = moonState(F);
    }
    function suddSize() { return F.has('b:notes') ? 0.42 : F.has('b:bridge') ? 0.55 : 0.7; }
    function suddWait() {
        const waits = G.scenes.sudd.suddWaits, p = G.player;
        return waits.find(w => w > p.x + 9 * HL) ?? waits.at(-1);
    }
    /** Nova hovers after the sköldhäst and crosses any gap: she keeps up with a gallop. */
    function followNova(dt) {
        const a = G.actors.nova, p = G.player;
        if (!a?.visible || !a.follow || a.staged) return;
        if (a.scene !== G.sceneId) { Object.assign(a, { scene: G.sceneId, x: p.x - p.facing * 1.9 * HL, y: p.y }); return; }
        const still = Math.abs(p.vx) < 20 && p.mode === 'ground';
        const want = p.x - p.facing * (still ? 1.5 : 2.0) * HL;
        const k = 1 - Math.exp(-(still ? 2.4 : 4.2) * dt);
        const nx = a.x + Math.max(-1700 * dt, Math.min(1700 * dt, (want - a.x) * k * 4));
        a.vx = (nx - a.x) / dt; a.x = nx;
        if (Math.abs(want - a.x) > 0.3 * HL) a.facing = Math.sign(want - a.x) || a.facing;
        else a.facing = Math.sign(p.x - a.x) || a.facing;
        // her beam rests on the ground below her when there is any; in space she hovers level with the sköldhäst
        const gy = groundAt(a.x, p.y - 0.2 * HL);
        const ty = gy !== null && Math.abs(gy - p.y) < 2.5 * HL ? gy : p.y;
        a.y += (ty - a.y) * (1 - Math.exp(-3 * dt));
    }
    /** Klo walks where there is ground, and rides in Nova's beam where there is none ("Jag är ingen taxi."). */
    function followKlo(dt) {
        const a = G.actors.klo, p = G.player, n = G.actors.nova;
        if (!a?.visible || !a.follow || a.staged) return;
        const want = p.x - p.facing * 1.15 * HL;
        const gy = groundAt(want, p.y);
        const space = G.sceneId === 'stjarn' || p.mode === 'swim' || !!G.carry;
        if (a.scene !== G.sceneId) { a.scene = G.sceneId; a.carried = true; }
        if (space || gy === null || (a.carried && Math.abs(want - a.x) > 1.5 * HL) || Math.abs(want - a.x) > 7 * HL) {
            // in the beam, just under her dome
            a.carried = !!n?.follow;
            const tx = n?.follow ? n.x : want, ty = n?.follow ? n.y - 0.75 * HL : p.y;
            a.x += (tx - a.x) * (1 - Math.exp(-6 * dt)); a.y += (ty - a.y) * (1 - Math.exp(-6 * dt));
            a.facing = p.facing; a.vx = 0;
            if (!space && gy !== null && Math.abs(p.vx) < 30 && p.mode === 'ground') { a.carried = false; a.x = want; a.y = gy; }
            return;
        }
        a.carried = false;
        const dist = Math.abs(want - a.x);
        if (dist < 0.3 * HL) { a.vx = 0; a.y = groundAt(a.x, a.y) ?? a.y; return; }
        const dir = Math.sign(want - a.x);
        const nx = a.x + dir * Math.min(dist, 620 * dt * (dist > 3 * HL ? 2.4 : 1));
        const ny = groundAt(nx, a.y);
        if (ny === null || Math.abs(ny - a.y) > 0.6 * HL) { a.carried = true; return; }
        a.vx = (nx - a.x) / dt; a.x = nx; a.y = ny; a.facing = dir;
    }
    function followSudd(dt) {
        const s = G.actors.sudd;
        // on the Moon between the catch and the end of the story: a small hopping friend behind the sköldhäst
        if (s?.visible && s.scene === 'mane' && G.sceneId === 'mane' && !s.riding && !s.staged && !F.has('ended')) {
            const p = G.player, want = p.x - p.facing * 0.85 * HL;
            if (Math.abs(want - s.x) < 0.2 * HL) { s.hop = 0; return; }
            s.hop = (s.hop || 0) + dt * 3.2;
            const nx = s.x + Math.sign(want - s.x) * Math.min(Math.abs(want - s.x), (Math.abs(want - s.x) > 3 * HL ? 1600 : 700) * dt);
            const gy = groundAt(nx, p.y);
            if (gy !== null) { s.x = nx; s.y = gy; s.facing = Math.sign(want - s.x) || s.facing; }
            else { s.x = want; s.y = p.y; }
            return;
        }
        if (!s?.visible || s.scene !== 'sudd' || s.staged || F.has('climax')) return;
        const to = suddWait();
        if (Math.abs(to - s.x) < 4) { s.hop = 0; return; }
        s.hop = (s.hop || 0) + dt * 3.2;
        const nx = s.x + Math.sign(to - s.x) * Math.min(Math.abs(to - s.x), 900 * dt);
        s.x = nx; s.facing = Math.sign(to - s.x) || 1;
        const y = G.terrain?.support(nx, h(-3), h(4), h(6));
        s.y = y && !y.s.hidden ? y.y : (G.sceneDef.dashed.find(d => nx >= d.pts[0][0] && nx <= d.pts.at(-1)[0])?.pts[0][1] ?? s.y);
    }
    /** Staging a conversation: Klo comes up beside the sköldhäst on its own ground; Nova hovers near. */
    function stage() {
        const p = G.player, k = G.actors.klo, n = G.actors.nova;
        if (k) for (const side of [-p.facing, p.facing]) {
            const x = p.x + side * 1.2 * HL, gy = groundAt(x, p.y);
            if (gy !== null && Math.abs(gy - p.y) < 0.5 * HL) { Object.assign(k, { x, y: gy, scene: G.sceneId, visible: true, facing: -side, vx: 0, carried: false }); break; }
        }
        if (n?.follow) Object.assign(n, { x: p.x - p.facing * 2.2 * HL, scene: G.sceneId, facing: p.facing });
    }
    async function about(box, fn) {
        const look = { scene: G.sceneId, x0: box[0] * HL, x1: box[1] * HL, y0: box[2] * HL, y1: box[3] * HL };
        G.camLook = look;
        try { return await fn(); } finally { if (G.camLook === look) G.camLook = null; }
    }
    function mood(m) { if (G.actors.nova) G.actors.nova.mood = m; }

    // --------------------------------------------------------------------------
    // help: which puzzle we are at, and its next hint
    // --------------------------------------------------------------------------
    function available(pz) { return !pz.needs || F.has(pz.needs); }
    function activePuzzle() {
        const open = PUZZLES.filter(pz => !pz.solved(F) && available(pz));
        return open.find(pz => pz.scene === G.sceneId && pz.areas.some(a => G.areas.has(a))) || null;
    }
    let peeking = false;
    function ladder(id) {
        const n = Math.min(2, hintLevel.get(id) || 0);
        if (!peeking) hintLevel.set(id, n + 1);
        return { puzzle: id, level: n, text: HINTS[id][n], ladder: id };
    }
    let plainAsked = null;
    function hint({ peek = false } = {}) {
        peeking = peek;
        try { const hh = nextHint(); if (!peek && hh?.text && !hh.ladder) plainAsked = hh.text; return hh; }
        finally { peeking = false; }
    }
    function notes() {
        if (F.has('ended')) return null;
        const next = hint({ peek: true });
        if (!next?.text) return null;
        if (next.ladder) {
            const all = HINTS[next.ladder], given = Math.min(all.length, hintLevel.get(next.ladder) || 0);
            return { given: all.slice(0, given), more: given < all.length };
        }
        return { given: plainAsked === next.text ? [next.text] : [], more: plainAsked !== next.text };
    }
    /** A light on this page that is free now (lying loose, waiting to be touched). */
    function freeLight() {
        return (G.sceneDef.lights || []).find(l => !F.has(lightFlag(l.id)) && lightState(G, l).state === 'loose' && (l.how !== 'touch' || l.id === 'l1' && G.areas.has('deep'))) || null;
    }
    function nextHint() {
        if (F.has('ended')) return { puzzle: null, text: null };
        if (!F.has('breakfast')) return ladder('m1');
        const fl = freeLight();
        if (fl && (fl.how === 'belt' || fl.how === 'melt')) return { puzzle: 'pickup', level: 0, text: HINTS.pickup[0] };
        const pz = activePuzzle();
        if (pz) return ladder(pz.id);
        const n = lightsFound(G);
        if (F.has('moon_whole')) return ladder('home');
        if (F.has('caught')) return ladder('f2');
        if (F.has('m5_view') && !F.has('fin_drawn')) return ladder('fin');
        if (n >= 9 && !F.has('rocket_gone')) return { puzzle: 'white', level: 0, text: GOALS.whiteWhy };
        if (!F.has('m5_view') && G.sceneId === 'mane' && LIGHTS_ON.mane.every(id => F.has(lightFlag(id)))) return ladder('m5');
        return ladder('more');
    }
    /** Pekklon: the nearest light not yet found within about 12 lengths, and which way (section 3.5). */
    function pointer() {
        if (!F.has('breakfast')) return null;
        const p = G.player, n = G.actors.nova;
        let best = null, bd = 12 * HL;
        for (const l of G.sceneDef.lights || []) {
            if (F.has(lightFlag(l.id)) || l.how === 'trace') continue;
            const d = Math.hypot(l.x - p.x, l.y - p.y);
            if (d < bd) { bd = d; best = l; }
        }
        if (!best) return null;
        const dx = best.x - p.x, dy = best.y - (p.y - 0.4 * HL);
        const dir = bd < 2.5 * HL ? 'near' : dy < -2 * HL && Math.abs(dy) > Math.abs(dx) * 0.6 ? 'up' : dy > 2 * HL && Math.abs(dy) > Math.abs(dx) * 0.6 ? 'down' : 'side';
        return { light: best, d: bd, dir, glow: Math.max(0.15, 1 - bd / (12 * HL)), fromNova: n };
    }
    // Häst eller sköldpadda?: as a measurement is written in Klo says a word about it, in a bubble while play goes on
    function measureSaid({ flag }) {
        const m = MEASURES.find(x => x.flag === flag);
        if (!m || m.kind === 'other' || F.has('ended')) return;
        const count = (kind) => MEASURES.filter(x => x.kind === kind && F.has(x.flag)).length;
        const hc = count('horse'), tc = count('turtle');
        const id = m.kind === 'horse' && hc === 1 ? 'firstHorse' : m.kind === 'turtle' && tc === 1 ? 'firstTurtle' : hc === tc ? 'even' : null;
        if (!id || done('measure_' + id)) return;
        beat('measure_' + id, async () => {
            await G.wait(1.4);
            for (let i = 0; i < 24 && ui().dialogueOpen?.(); i++) await G.wait(0.5);
            remark(STORY.measure[id]);
        }, { lock: false });
    }
    function talk(who) {
        if (who === 'klo' && F.has('ended') && !done('measureEnd')) return beat('measureEnd', () => say(STORY.measureEnd));
        if (who === 'sudd') return beat('suddTalk', () => say([['sudd', STORY.suddTalk[chatter.sudd++ % STORY.suddTalk.length]]]), { once: false });
        if (who === 'nova' && !F.has('ended')) {
            const pt = pointer();
            if (pt) return beat('talk', () => say([['nova', POINT[pt.dir]]]), { once: false });
        }
        const hh = hint();
        let text = hh.text;
        if (!text) {
            const list = who === 'nova' ? [...CHATTER.nova, ...(F.has('ended') ? [CHATTER.novaAfter] : [])] : CHATTER.klo;
            text = list[chatter[who]++ % list.length];
            if (who === 'nova' && text === CHATTER.nova[0]) G.flag('t:sunFact');
        }
        // S2: talking to Nova at the belt, she blinks the order again
        if (who === 'nova' && G.sceneId === 'stjarn' && G.areas.has('belt') && !F.has('belt_lit')) fx('beltBlink', {});
        beat('talk', () => say([[who, text]]), { once: false });
    }

    function objective() {
        const n = lightsFound(G);
        if (!F.has('b:arrive')) return null;
        // on Kometens svans there is no rocket: the way home is the jump Nova catches
        if (F.has('ended')) return { id: 'free', text: GOALS.free, why: G.sceneId === 'vinter' ? GOALS.freeVinter : GOALS.freeWhy };
        if (!F.has('breakfast')) return { id: 'breakfast', text: GOALS.breakfast, why: GOALS.breakfastWhy };
        if (F.has('moon_whole')) return { id: 'crater', text: GOALS.crater, why: GOALS.craterWhy };
        if (F.has('caught')) return { id: 'rim', text: GOALS.rim, why: GOALS.rimWhy };
        if (F.has('ride_done')) return { id: 'jump', text: GOALS.jump, why: GOALS.jumpWhy };
        if (F.has('ride')) return { id: 'ride', text: GOALS.ride, why: GOALS.rideWhy };
        if (F.has('outline_gone') && !F.has('self_drawn')) return { id: 'self', text: GOALS.self, why: GOALS.selfWhy };
        if (G.sceneId === 'sudd' && !F.has('self_drawn')) return { id: 'through', text: GOALS.through, why: GOALS.throughWhy };
        if (n >= 9 && !F.has('rocket_gone')) return { id: 'white', text: GOALS.white, why: GOALS.whiteWhy };
        if (!F.has('m5_view')) {
            const moon = LIGHTS_ON.mane.filter(id => F.has(lightFlag(id))).length;
            if (moon >= 3) return { id: 'view', text: GOALS.view, why: GOALS.viewWhy };
            return { id: 'moon', text: GOALS.moon(n, LIGHT_TOTAL), why: GOALS.moonWhy };
        }
        if (!F.has('fin_drawn')) return { id: 'rocket', text: GOALS.rocket, why: GOALS.rocketWhy };
        // every light of this page found: on with the rocket
        const here = LIGHTS_ON[G.sceneId];
        if (here && !F.has('rocket_gone') && here.every(id => F.has(lightFlag(id)))) return { id: 'travel', text: GOALS.travel, why: GOALS.travelWhy };
        // the question is answered once Suddet is known: then it is about getting the stars home
        if (F.has('clue_sudd')) return n >= LIGHT_TOTAL ? { id: 'homeward', text: GOALS.homeward, why: GOALS.homewardWhy }
            : { id: 'lights', text: GOALS.lights(n, LIGHT_TOTAL), why: GOALS.lightsWhyKnown };
        return { id: 'lights', text: GOALS.lights(n, LIGHT_TOTAL), why: GOALS.lightsWhy };
    }
    /** Per page: lights found there, visited, named (the chart names a place once the story has named it). */
    function places() {
        const named = { mane: true, stjarn: F.has('fin_drawn'), ring: F.has('fin_drawn'), sudd: lightsFound(G) >= 9 || F.has('rocket_gone') };
        return PAGE_ORDER.map(id => {
            const ids = LIGHTS_ON[id], visited = F.has('visited_' + id);
            return { id, name: WORDS.pages[id], visited, named: visited || !!named[id], here: G.sceneId === id,
                found: ids.filter(l => F.has(lightFlag(l))).length, total: ids.length };
        });
    }
    function hyp() {
        return [
            { said: done('hypothesis1'), result: F.has('m5_view') ? 'no' : null },
            { said: done('hypothesis2'), result: F.has('clue_sudd') ? 'no' : null },
            { said: done('hypothesis3'), result: done('hypothesis3') ? 'yes' : null },
            { said: done('crooked'), result: F.has('clue_sudd') ? 'yes' : null }
        ];
    }
    function notebook() {
        const home = F.has('lights_home');
        return {
            objective: objective(), lights: lightsFound(G), total: LIGHT_TOTAL, ended: F.has('ended'),
            kupa: LIGHT_IDS.map(id => F.has(lightFlag(id)) && !home),
            constellation: F.has('constellation'),
            hypotheses: hyp(), answered: F.has('clue_sudd'),
            clues: CLUE_ORDER.filter(id => F.has('clue_' + id)).map(id => ({ id, text: CLUES[id] })),
            facts: FACT_ORDER.filter(id => F.has(FACT_AT[id])).map(id => ({ id, text: FACTS[id] })),
            places: places(), ringo: F.has('b:ringo'), milky: F.has('ride_done'), team: { sudd: F.has('ended'), nova: F.has('breakfast') },
            measures: MEASURES.filter(m => F.has(m.flag)).map(m => ({ id: m.id, kind: m.kind })),
            notesRubbed: F.has('notes_rubbed'), notesInk: F.has('notes_ink'),
            postcards: Object.keys(POSTCARDS).filter(id => F.has(CARD_AT[id])), answerCard: F.has('card_answer'),
            secrets: SECRETS.map(s => ({ id: s.id, page: s.page, found: F.has(s.flag) }))
        };
    }

    // --------------------------------------------------------------------------
    // the Moon (page 1)
    // --------------------------------------------------------------------------
    function arrive() {
        beat('arrive', async () => {
            const sp = G.scenes.mane.spots;
            mood('asleep');
            Object.assign(G.actors.nova, { scene: 'mane', x: sp.novaBed.x, y: sp.novaBed.y, follow: false, visible: true });
            Object.assign(G.actors.klo, { scene: 'mane', x: sp.kloStart.x, y: sp.kloStart.y, follow: false, visible: true, facing: 1 });
            await fx('landing', {});
            await fx('focus', { x: (G.player.x + sp.novaBed.x) / 2, y: sp.novaBed.y - 0.8 * HL, zoom: 1.0, fit: ['nova', 'klo'] });
            await say(STORY.arrive.slice(0, 2));
            mood('morning');
            G.actors.nova.eyes = 'low';
            await say(STORY.arrive.slice(2));
            await say(STORY.arrive2);
            await say(STORY.arrive3);
            G.actors.klo.follow = true;
            await fx('focus', { x: G.scenes.mane.box.x0, y: G.scenes.mane.box.y - 0.3 * HL, zoom: 1.05, hold: 0.5 });
            think(STORY.shelfSeen, { force: true });
            await fx('focus', null);
        });
    }
    function breakfast() {
        beat('breakfast', async () => {
            stage();
            await fx('eat', {});
            mood('ordinary');
            G.actors.nova.eyes = 'half';
            G.flag('breakfast');
            G.actors.nova.follow = true;
            await say(STORY.breakfast);
            await say(STORY.count); clue('ten');
            await say(STORY.hypothesis1);
            G.flag('b:hypothesis1');
            G.setCheckpoint('start');
        });
    }
    function onLight({ id, n }) {
        io.audio?.sfx?.('sparkle');
        ui().toast?.(WORDS.lightToast(n, LIGHT_TOTAL));
        const page = Object.entries(LIGHTS_ON).find(([, ids]) => ids.includes(id))?.[0];
        if (page && page !== 'sudd' && !F.has('card_' + page)) G.flag('card_' + page);
        if (id === 'l1') beat('firstLight', async () => {
            await say(STORY.firstLight); clue('light');
            await say(STORY.firstLight2);
            if (G.player.y > 2 * HL) await say(STORY.beam);
        });
        else if (id === 'l2') beat('nightDone', () => say(STORY.nightDone));
        else if (id === 'l3') beat('ledgeDone', () => say(STORY.ledgeDone));
        else if (id === 'l4') beat('beltDone', () => say(STORY.beltDone));
        else if (id === 'l7' && n !== 9) think(STORY.iceLight, { gap: 0, force: true });
        else if (!['l5', 'l6', 'l8', 'l10'].includes(id) && n !== 9) think(STORY.lightLine[lightLine++ % STORY.lightLine.length], { gap: 0, force: true });
        // nine: Nova knows where the tenth is; at the table Mira sees Molnet flash again (whichever light is the ninth)
        if (n === 9 && !F.has('rocket_gone')) beat('gapDone', async () => {
            await say(STORY.gapDone);
            await fx('tableVoices', {});
            await say(STORY.nine);
        });
        // Klo and Nova, after stars 1, 2 and 3 (section 11.5)
        const moon = LIGHTS_ON.mane.filter(l => F.has(lightFlag(l))).length;
        if (G.sceneId === 'mane' && moon >= 1 && moon <= 3 && (moon > 1 || F.has('beam_used'))) beat('rival' + moon, async () => { await say(STORY['rival' + moon]); if (moon === 3) await say(STORY.rival3b); });
        G.emit('lightCount', { n });
        io.save?.();
    }
    function view() {
        beat('view', async () => {
            stage();
            await fx('vista', { on: true });
            await say(STORY.view0);
            await say(STORY.view);
            mood('sad');
            await say(STORY.view2);
            clue('white');
            await say(STORY.view3);
            mood('ordinary');
            G.flag('m5_view');
            await say(STORY.hypothesis2);
            G.flag('b:hypothesis2');
            await fx('vista', { on: false });
            G.setCheckpoint('view');
        });
    }
    function fin() {
        beat('fin', async () => {
            stage();
            const r = G.scenes.mane.rocketAt;
            await about([r.x / HL - 1.6, r.x / HL + 2.4, -2.8, 0.2], async () => {
                await say(STORY.fin);
                clue('crumbs');
                await fx('finDraw', {});
                G.flag('fin_drawn');
                await say(STORY.finDone);
            });
        });
    }

    // --------------------------------------------------------------------------
    // travel by rocket (section 8.6): each arrival begins with Nova waking up cross
    // --------------------------------------------------------------------------
    function travelTo(id) {
        beat('travel', async () => {
            await fx('travel', { to: id });
            G.goto(id, 'dock');
            G.setCheckpoint({ mane: 'start', stjarn: 'dock', ring: 'icedock', sudd: 'whiteEdge', vinter: 'tailTip' }[id]);
            setupActors();
            await fx('fadeIn', {});
            await arrival(id);
        }, { once: false });
    }
    async function arrival(id) {
        if (F.has('ended')) return;
        if (id === 'stjarn' && !done('stjarnArrive')) {
            mood('morning'); stage();
            await say(STORY.stjarnArrive);
            G.flag('b:stjarnArrive');
            mood('ordinary');
            await say(STORY.stjarnArrive2);
            eraserGone();
        } else if (id === 'ring' && !done('ringArrive')) {
            mood('morning'); stage();
            await say(STORY.ringArrive);
            G.flag('b:ringArrive');
            mood('ordinary');
            await say(STORY.ringo);
            G.flag('b:ringo');
            eraserGone();
        } else if (id === 'sudd' && !done('suddArrive')) {
            mood('morning'); stage();
            await say(STORY.suddArrive);
            G.flag('b:suddArrive');
            await fx('rocketGone', {});
            G.flag('rocket_gone');
            await say(STORY.rocketGone);
            setupActors();
            mood('ordinary');
            await say(STORY.suddArrive2);
            await say(STORY.suddArrive3);
            G.setCheckpoint('whiteEdge');
        }
    }
    /** At the table, once, on whichever of the two pages is entered second (section 11.9). */
    function eraserGone() {
        if (F.has('visited_stjarn') && F.has('visited_ring')) beat('eraserGone', async () => { await fx('tableVoices', {}); await say(STORY.eraserGone); clue('gone'); });
    }

    // --------------------------------------------------------------------------
    // the climax: Månen suddas (sections 11.10 and 16.1). One unit for the save.
    // --------------------------------------------------------------------------
    function climax() {
        if (F.has('self_drawn') || F.has('outline_gone')) return;
        beat('climaxA', async () => {
            const sp = G.scenes.sudd.spots;
            G.setCheckpoint('crumbs');
            G.flag('climax');
            G.player.vx = 0;
            stage();
            Object.assign(G.actors.sudd, { visible: true, scene: 'sudd', x: sp.suddRim.x, y: sp.suddRim.y, size: 0.45, pose: 'rub', staged: true });
            io.audio?.silence?.(true);
            await fx('focus', { x: h(70), y: h(-3.6), zoom: 0.8, fit: ['sudd'], portraitFit: ['sudd'] });
            await say(STORY.sudd1);
            for (const [n, lines] of [[1, STORY.bite1], [2, STORY.bite2], [3, STORY.bite3]]) {
                await fx('bite', { n });
                G.moon = { bites: n, lit: [1, 0.72, 0.45, 0.25][n], drain: 0 };
                if (n === 1) mood('angry');
                await say(lines);
            }
            await fx('lightsOut', {});
            G.moon = { bites: 3, lit: 0.18, drain: 0 };
            G.flag('moon_bitten');
            mood('dark');
            await fx('forestDark', {});
            await fx('drain', {});
            G.moon = { bites: 3, lit: 0.18, drain: 1 };
            mood('angry');
            await say(STORY.drain);
            clue('sudd');
            await say(STORY.sudd2);
            await fx('notesRub', {});
            G.flag('notes_rubbed');
            G.emit('notesRubbed', {});
            await say(STORY.notes);
            await say(STORY.offer);
            await fx('outlineGone', {});
            G.flag('outline_gone');
            await say(STORY.rubbed);
            await fx('focus', null);
            G.actors.sudd.staged = false;
            G.selfDrawing = true;
            G.puz.selfDrawn = 0; G.puz.selfBeats = 0; G.puz.selfIdle = 0;
            think(STORY.drawSelf, { force: true });
        });
    }
    function drawnSelf() {
        beat('drawnSelf', async () => {
            G.selfDrawing = false;
            await fx('selfWhole', {});
            G.flag('self_drawn');
            stage();
            await say(STORY.drawnSelf);
            clue('colour');
            G.actors.sudd.size = 0.4;
            await say(STORY.sudd4);
            await say(STORY.alva1);
            await say(STORY.alva2);
            await say(STORY.tenth);
            await fx('starDraw', {});
            collectLight(G, 'l10');
            G.flag('tenth_drawn');
            await say(STORY.tenthDone);
            await say(STORY.newJob);
            await fx('pipCalls', {});
            await say(STORY.stranded);
            await fx('cometArrives', {});
            await say(STORY.cometComes);
            io.audio?.silence?.(false);
            await fx('fadeOut', { rate: 1.6 });
            G.goto('vinter', 'tailTip');
            G.setCheckpoint('tailTip');
            G.flag('ride');
            setupActors();
            await fx('fadeIn', {});
        });
    }

    // --------------------------------------------------------------------------
    // the great gallop, the catch, the Moon's rim, the finale (sections 11.11 and 11.12)
    // --------------------------------------------------------------------------
    function lift() {
        beat('lift', async () => { G.player.vx = 0; await say(STORY.lift); });
    }
    function landed() {
        beat('landed', async () => {
            G.setCheckpoint('westRim');
            G.moon = moonState(F);
            setupActors();
            stage();
            await say(STORY.lift2);
            await say(STORY.landed);
            await say(STORY.rim);
        });
    }
    function rimHeals() {
        beat('rimHeals', async () => {
            await fx('rimHeals', {});
            G.moon = moonState(F);
            mood('ordinary');
            // Suddet hops down off the shell
            const sd = G.actors.sudd;
            if (sd) Object.assign(sd, { riding: false, x: G.player.x - G.player.facing * 0.85 * HL, y: G.player.y });
            await say(STORY.rimHeals);
            await fx('forestLight', {});
            await say(STORY.rimDone);
            G.setCheckpoint('home');
        });
    }
    function finale() {
        if (F.has('ended') || !F.has('moon_whole')) return;
        beat('finale', async () => {
            const sp = G.scenes.mane.spots;
            G.player.vx = 0;
            stage();
            await fx('focus', { x: sp.novaBed.x, y: sp.novaBed.y - 2.5 * HL, zoom: 0.85, fit: ['nova', 'klo'] });
            await say(STORY.finale);
            await fx('lightsHome', {});
            G.flag('lights_home');
            await say(STORY.gold);
            await fx('gold', {});
            G.flag('gold');
            await say(STORY.constellation);
            await fx('constellationDraw', {});
            G.flag('constellation');
            await say(STORY.constellationDone);
            mood('supernova');
            G.actors.nova.eyes = 'open';
            await fx('supernova', {});
            await say(STORY.supernova);
            await say(STORY.telescope);
            G.flag('telescope');
            await say(STORY.ink);
            G.flag('notes_ink');
            await say(STORY.moonJoke);
            const told = ui().caption?.(STORY.finaleCaption, 3400);
            await fx('finishedSky', {});
            await told;
            G.flag('ended');
            G.setCheckpoint('home');
            io.save?.({ ended: true });
            await fx('epilogue', {});
            await fx('ending', {});
            mood('ordinary');
            G.actors.nova.eyes = 'half';
            setupActors();
            await fx('focus', null);
        });
    }

    // --------------------------------------------------------------------------
    // after the story: the eight secrets (section 15)
    // --------------------------------------------------------------------------
    let stillT = 0, gallopT = 0, answerAt = null;
    function afterStory(dt) {
        if (!F.has('ended')) return;
        const p = G.player, still = p.mode === 'ground' && Math.abs(p.vx) < 15 && !G.busy && !current;
        stillT = still ? stillT + dt : 0;
        // Tukankrabban's answer, a little while into free play
        if (answerAt === null) answerAt = G.time + 50;
        if (G.time > answerAt && !F.has('card_answer')) { G.flag('card_answer'); G.emit('clue', { id: 'answer' }); }
        if (G.sceneId === 'mane' && G.areas.has('view') && stillT > 2.5 && !F.has('s:earthrise')) { G.flag('s:earthrise'); fx('earthrise', {}); }
        const s = G.actors.sudd;
        if (G.sceneId === 'mane' && s?.visible && Math.abs(p.x - s.x) < 1.6 * HL && stillT > 2.5 && !F.has('s:suddStar')) { G.flag('s:suddStar'); fx('suddStar', {}); }
        if (G.sceneId === 'stjarn' && G.areas.has('bear') && p.hidden && p.mode !== 'swim' && stillT > 2 && !F.has('s:bearSnore')) { G.flag('s:bearSnore'); fx('bearSnore', {}); }
        const gallop = p.mode === 'ground' && Math.abs(p.vx) > 1000;
        gallopT = G.sceneId === 'sudd' && gallop ? gallopT + dt : 0;
        if (gallopT > 2.5 && !F.has('s:whiteDraw')) G.flag('s:whiteDraw');
        if (F.has('ended') && G.sceneId === 'mane' && !F.has('box2_shelf')) G.flag('box2_shelf');
    }

    // --------------------------------------------------------------------------
    // wiring
    // --------------------------------------------------------------------------
    function onEnter({ id }) {
        const sc = G.sceneId, intro = !F.has('ended');
        if (!done('arrive')) return;
        if (sc === 'mane') {
            if (id === 'jumps' && !F.has('t:prints')) G.flag('t:prints');
            if (id === 'deep') G.setCheckpoint('crater');
            if (intro && id === 'deep' && F.has('breakfast') && !F.has(lightFlag('l1'))) beat('crater', () => about([45, 55, 0, 4.4], () => say(STORY.crater)));
            if (id === 'night') G.setCheckpoint('night');
            if (intro && id === 'night' && F.has('breakfast') && !F.has(lightFlag('l2'))) beat('night', async () => { stage(); await say(STORY.night); await say(STORY.night2); });
            if (id === 'edge') G.setCheckpoint('edge');
            if (intro && id === 'edge' && F.has('breakfast') && !F.has(lightFlag('l3'))) beat('ledge', () => about([86.4, 90.4, -4.6, 0.2], () => say(STORY.ledge)));
            if (intro && id === 'view' && F.has('breakfast')) view();
            if (intro && id === 'landing' && F.has('m5_view') && !F.has('fin_drawn')) fin();
            if (id === 'crater' && F.has('moon_whole')) finale();
        } else if (sc === 'stjarn') {
            if (intro && id === 'wagon' && !F.has('wagon_drawn')) beat('wagon', () => say(STORY.wagon));
            if (id === 'belt') G.setCheckpoint('belt');
            if (id === 'bear') G.setCheckpoint('bear');
            if (intro && id === 'bear' && !F.has('bear_nose')) beat('bear', async () => { stage(); await about([48.6, 58.5, -2.4, 1.6], async () => { await say(STORY.bear); await say(STORY.bear2); }); think(STORY.bearNose, { force: true }); });
            if (id === 'pip') G.setCheckpoint('pip');
            if (intro && id === 'pip' && !F.has('pip_met')) beat('pip', async () => { await about([76, 86, -4, 2.5], async () => { await say(STORY.pip); await say(STORY.pip2); }); });
        } else if (sc === 'ring') {
            if (intro && id === 'gravel' && !F.has('gravel_passed')) beat('gravel', () => say(STORY.gravel));
            if (id === 'sling') { G.setCheckpoint('sling'); if (!F.has('gravel_passed')) G.flag('gravel_passed'); }
            if (intro && id === 'sling' && !F.has('slung')) beat('sling', async () => { stage(); await about([28, 42, -1.5, 3.5], async () => { await say(STORY.sling); await say(STORY.sling2); }); });
            if (id === 'shade') G.setCheckpoint('shade');
            if (intro && id === 'shade' && !F.has('ice_melted')) beat('ice', () => about([46, 57, -2.2, 0.4], () => say(STORY.ice)));
            if (id === 'cometLane') G.setCheckpoint('cometLane');
            if (intro && id === 'cometLane' && !F.has('comet_rest')) beat('comet', async () => { await fx('cometPass', {}); await say(STORY.comet); await say(STORY.comet2); });
            if (id === 'gap') G.setCheckpoint('gap');
            if (intro && id === 'gap' && !F.has('gap_drawn')) beat('gap', () => about([75, 90, -2.4, 0.6], () => say(STORY.gap)));
        } else if (sc === 'sudd') {
            if (id === 'fog') G.setCheckpoint('fog');
            if (id === 'fog' && !F.has('self_drawn')) io.audio?.silence?.(true);
            if (intro && id === 'fog' && !F.has('fog1_lit')) beat('fog', async () => { stage(); await say(STORY.fog); await say(STORY.fog2); G.later(6, () => think(STORY.fogSqueak, { gap: 30 })); });
            if (id === 'lastBridge') G.setCheckpoint('lastBridge');
            if (id === 'crumbsTop' && !F.has('self_drawn')) climax();
        }
    }
    const offs = [
        G.on('flag', measureSaid),
        G.on('light', onLight),
        G.on('enter', onEnter),
        G.on('scene', () => {
            G.flag('visited_' + G.sceneId);
            setupActors();
        }),
        G.on('boxFalls', () => think(STORY.boxFalls, { force: true })),
        G.on('boxLanded', breakfast),
        G.on('beamKick', () => think(STORY.beamKick, { gap: 7 })),
        G.on('carryStart', ({ kind, id }) => {
            if (kind === 'beam') { if (!F.has('beam_used')) G.flag('beam_used'); thinkOnce('beamUp', STORY.beamUp); }
            if (kind === 'orbit') thinkOnce('orbit', STORY.orbit);
            if (kind === 'sling' && G.scenes.ring.carries.find(c => c.id === id)?.go) { thinkOnce('slingGo', STORY.slingGo); fx('slingshot', {}); }
            if (kind === 'lane') { if (!F.has('comet_lane')) G.flag('comet_lane'); }
            if (kind === 'catch') { if (!F.has('caught')) G.flag('caught'); think(STORY.liftCaught, { force: true }); }
            // (after the story the loop is only the way round again: no "I flailed")
            if (kind === 'loop' && !F.has('ended')) think(STORY.liftMiss, { gap: 4 });
        }),
        G.on('carryEnd', ({ id, kind, back, go }) => {
            if (kind === 'beam' && G.sceneId === 'mane' && id !== 'beamDeepW' && id !== 'beamDeepE') { /* back up from the ledge */ }
            if (kind === 'beam' && (id === 'beamDeepW' || id === 'beamDeepE') && F.has(lightFlag('l1'))) {
                beat('beamDone', () => say(STORY.beamDone));
                beat('rival1', () => say(STORY.rival1));
            }
            if (id === 'beamBridge') { if (!F.has('bridge_crossed')) G.flag('bridge_crossed'); G.setCheckpoint('crumbs'); }
            if (kind === 'orbit') {
                if (F.has('ended')) { if (!F.has('s:pipPhoto')) { G.flag('s:pipPhoto'); fx('pipFlash', {}); } return; }
                if (!F.has('pip_met')) beat('pipDone', async () => {
                    G.flag('pip_met');
                    await fx('pipFlash', {});
                    collectLight(G, 'l6');
                    await say(STORY.pipDone);
                    clue('photo');
                    if (F.has('clue_rubber')) await hypothesis3();
                });
            }
            if (kind === 'sling' && back) think(STORY.slingBack, { gap: 3, force: true });
            if (kind === 'sling' && go && !F.has('slung')) { G.flag('slung'); G.setCheckpoint('shade'); beat('slingDone', () => say(STORY.slingDone)); }
            if (kind === 'catch') landed();
        }),
        G.on('kicked', ({ id }) => {
            if (id === 'orbit-kick') think(STORY.orbitKick, { gap: 5 });
            else if (id === 'cometPull') think(STORY.cometLane, { gap: 8 });
            else think(BALK.kick, { gap: 5 });
        }),
        G.on('novaAngry', () => {
            // section 11.14: her short remarks, the first few times she is galloped beside (not on the night side)
            if (G.sceneId === 'mane' && G.areas.has('night')) return;
            if (gallopRemark < STORY.novaGallop.length && G.time - (said.get('gallopRemark') ?? -99) > 12) {
                said.set('gallopRemark', G.time);
                remark(['nova', STORY.novaGallop[gallopRemark++]]);
            }
        }),
        G.on('nightLit', () => {
            if (!F.has('night_lit')) { G.flag('night_lit'); remark(STORY.nightAngry[0]); }
            // the thought helps while the dark is the puzzle; on the way back from Utsikten she is lit by her own fury
            if (!F.has(lightFlag('l2'))) think(STORY.nightLit, { gap: 9 });
            else if (F.has('m5_view') && !F.has('fin_drawn')) thinkOnce('nightFurious', STORY.nightFurious);
            const face = G.scenes.mane.spots.face;
            if (Math.abs(G.player.x - face.x) < 4 * HL && !done('nightFace')) beat('nightFace', () => say(STORY.nightFace), { lock: true });
        }),
        G.on('nightOut', () => { if (!F.has(lightFlag('l2'))) think(STORY.nightOut, { gap: 6 }); }),
        G.on('hide', ({ air }) => { if (air && G.sceneId === 'mane' && G.areas.has('edge')) thinkOnce('drop', STORY.drop); }),
        G.on('land', () => {
            const p = G.player;
            if (G.sceneId === 'mane' && p.surface?.ledge && p.hidden && !F.has('m4_drop')) G.flag('m4_drop');
        }),
        G.on('balk', (e) => {
            if (e.reason === 'thin') {
                const t = G.sceneId === 'sudd' ? STORY.whiteThin : STORY.wagonThin;
                if (!F.has('t:thinRule')) { G.flag('t:thinRule'); think(t, { gap: 0, force: true }); } else think(BALK.thin, { gap: 3 });
            } else if (e.reason === 'dark') think(STORY.nightDark, { gap: 4 });
            else if (e.reason === 'float') think(STORY.ledgeFloat, { gap: 4 });
            else if (e.reason === 'step') return; // a stair's far end: the snort and the toss of the head say enough
            else think(BALK[e.reason] || BALK.paper, { gap: 3 });
        }),
        G.on('streckDone', (e) => {
            if (e.flag === 'wagon_drawn') beat('wagonDone', async () => {
                await say(STORY.wagonDone);
                await fx('wagonRide', {});
                G.goto('stjarn', 'beltRock');
                G.setCheckpoint('belt');
                setupActors();
                await fx('fadeIn', {});
                stage();
                await say(STORY.belt);
                await fx('beltBlink', {});
            });
            if (e.flag === 'bear_nose') beat('bearWakes', async () => {
                stage();
                await fx('bearWakes', {});
                await say(STORY.bearWakes);
                await say(STORY.bearGives);
                collectLight(G, 'l5');
                clue('rubber');
                if (F.has('clue_photo')) await hypothesis3();
                await fx('bearStands', {});
                await say(STORY.bearStands);
                await fx('bearWalk', {});
                G.goto('stjarn', 'pipArrive');
                G.setCheckpoint('pip');
                setupActors();
                await fx('fadeIn', {});
            });
            if (e.flag === 'dent1') thinkOnce('whiteDraw', STORY.whiteDraw);
            if (e.flag === 'moon_whole') rimHeals();
        }),
        G.on('ink', (e) => { if (e.id === 'wagonLine') { const n = G.sceneDef.dashed?.find(d => d.id === 'wagonLine')?.stars?.length || 7; const k = Math.floor(e.t * n + 0.001); if (k > (G.puz.wagonStar || 0)) { G.puz.wagonStar = k; G.emit('wagonStar', { n: k }); thinkOnce('wagonStar', STORY.wagonStar); } } }),
        G.on('beltOne', ({ n }) => { if (n === 1) thinkOnce('beltOne', STORY.beltOne); }),
        G.on('beltWrong', () => {
            think(STORY.beltWrong, { gap: 2 });
            if (++beltMisses % 3 === 0) remark(STORY.beltWrongNova);
            fx('beltBlink', {});
        }),
        G.on('beltLit', () => fx('beltLit', {})),
        G.on('shower', ({ state }) => { if (state === 'warn' && G.sceneId === 'ring') thinkOnce('gravelSoon', STORY.gravelSoon); }),
        G.on('gravelHit', () => think(STORY.gravelHit, { gap: 9 })),
        G.on('iceWrong', () => think(STORY.iceWrong, { gap: 3, force: true })),
        G.on('iceMelts', () => think(STORY.iceMelts, { force: true })),
        G.on('cometRest', () => {
            if (F.has('comet_rest')) return;
            G.flag('comet_rest');
            beat('cometRest', async () => {
                G.player.vx = 0;
                // Kometen stays at Rastplatsen while it talks (its breath lasts as long as the words)
                G.cometHeld = true;
                await say(STORY.cometRest);
                collectLight(G, 'l8');
                await say(STORY.cometSaw);
                G.flag('b:cometSaw');
                clue('crooked');
                // "Hypotes nummer fyra" never before number three (the ring planet can come before the constellations)
                if (done('hypothesis3')) await crooked();
                G.cometHeld = false;
            });
        }),
        G.on('streckBroken', () => think(STORY.gravelHit, { gap: 2, force: true })),
        G.on('fogLit', ({ n }) => {
            if (n === 1) beat('fogLit', () => say(STORY.fogLit));
            if (n === 2) beat('fogGhosts', async () => { await fx('ghosts', {}); await say(STORY.fogGhosts); await say(STORY.fogGhosts2); });
        }),
        G.on('bridgeRubbed', ({ n }) => {
            io.audio?.sfx?.('rub');
            if (n >= 2) beat('bridge', async () => { stage(); await say(STORY.bridge); await say(STORY.bridge2); await say(STORY.bridge3); });
        }),
        G.on('selfStroke', ({ n }) => { if (n === 1 || n === 6) think(STORY.drawSelf2, { gap: 6 }); }),
        G.on('selfWait', () => think(STORY.drawSelfWait, { gap: 9 })),
        G.on('selfDrawn', () => { if (!F.has('self_drawn')) drawnSelf(); }),
        G.on('rideMark', ({ mark }) => {
            if (mark.thought) think(STORY[mark.thought], { force: true });
            if (mark.remark !== undefined) remark(STORY.rideRemarks[mark.remark]);
        }),
        G.on('rideDone', () => { if (!F.has('ride_done')) { G.flag('ride_done'); clue('milky'); G.setCheckpoint('cometHead'); lift(); } }),
        G.on('travel', () => G.emit('openTravel', {})),
        G.on('neigh', () => {
            if (!F.has('ended') || G.sceneId === 'mane' || F.has('s:silentNeigh')) return;
            G.flag('s:silentNeigh');
            remark(STORY.silentNeigh);
        }),
        G.on('secondBox', () => { G.flag('s:secondBox'); beat('secondBox', async () => { await fx('secondBox', {}); remark(STORY.secondBox); }); }),
        G.on('exit', (ex) => { if (ex.id === 'wrap' && F.has('ended') && Math.abs(G.player.vx) > 900 && !F.has('s:cometRace')) { G.flag('s:cometRace'); G.later(0.6, () => remark(STORY.cometRace)); } }),
        G.on('rescued', () => think(STORY.rescued, { gap: 2 })),
        G.on('talk', ({ who }) => talk(who))
    ];
    async function hypothesis3() {
        if (done('hypothesis3')) return;
        await say(STORY.hypothesis3);
        G.flag('b:hypothesis3');
        if (F.has('b:cometSaw')) await crooked();
    }
    async function crooked() {
        if (done('crooked')) return;
        await say(STORY.crooked);
        G.flag('b:crooked');
    }

    return {
        start() {
            G.flag('visited_' + G.sceneId);
            // a light being handed over when the game closed is not lost (section 18.4)
            if (F.has('pip_met')) collectLight(G, 'l6');
            if (F.has('b:bearGives') || F.has('bear_nose') && done('bearWakes')) collectLight(G, 'l5');
            if (F.has('comet_rest')) collectLight(G, 'l8');
            if (F.has('tenth_drawn')) collectLight(G, 'l10');
            setupActors();
            if (!done('arrive')) arrive();
            else if (F.has('box_landed') && !F.has('breakfast')) breakfast();
            if (F.has('self_drawn') && !F.has('ride') && G.sceneId === 'sudd') drawnSelf();
            if (G.sceneId === 'vinter' && F.has('ride_done') && !F.has('caught')) lift();
            if (G.sceneId === 'mane' && F.has('caught') && !F.has('moon_whole')) landed();
            if (F.has('moon_whole') && !F.has('ended') && G.sceneId === 'mane') { if (!done('rimHeals')) rimHeals(); }
        },
        step(dt) {
            if (!current && queue.length) run(queue.shift());
            afterStory(dt);
            if (!current || current.lock === false) {
                followNova(dt);
                followKlo(dt);
                followSudd(dt);
            }
            const p = G.player, n = G.actors.nova;
            if (G.sceneId === 'mane' && p.mode === 'ground' && p.surface?.id === 'shelf' && !F.has('shelf_reached')) G.flag('shelf_reached');
            if (n) {
                const pt = pointer();
                n.glow = pt ? pt.glow : 0;
                n.lights = LIGHT_IDS.filter(id => F.has(lightFlag(id))).length * (F.has('lights_home') ? 0 : 1);
                if (G.time < G.puz.angryUntil && n.mood !== 'supernova' && n.mood !== 'asleep' && n.mood !== 'dark') n.angry = true;
                else n.angry = false;
                n.lookAt = p.x;
            }
            if (G.actors.klo) G.actors.klo.lookAt = p.x;
            // the comet at Rastplatsen (view reads it)
            if (G.sceneId === 'ring') G.comet = G.cometHeld ? { phase: 0.02, resting: true } : cometState(G);
        },
        running: () => !!current || queue.length > 0,
        objective,
        hint,
        notes,
        notebook,
        places,
        pointer,
        travelTo,
        activePuzzle: () => activePuzzle()?.id || null,
        clues: () => CLUE_ORDER.filter(id => F.has('clue_' + id)).map(id => CLUES[id]),
        think,
        destroy() { for (const off of offs) off(); queue.length = 0; }
    };
}

export { PUZZLES, MEASURES, SECRETS, lightFlag };
