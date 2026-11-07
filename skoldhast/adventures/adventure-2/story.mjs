/*
 * Äventyr 2 – the story director (docs/skoldhast/adventure-2.md, "Beats").
 *
 *   const story = createStory(G, io);   // io: { ui, audio, fx, save, settings }
 *   story.start();                      // after the prologue, or after a restore
 *   story.step(dt);                     // from G.step: companions follow, beats queue
 *
 * The ui needs say(lines) → Promise, think(text), toast(text), caption(text).
 * fx(name, data) → Promise runs a staged moment in the view (the robot resolves it at once).
 * Beats run one at a time; while one runs, play is held (G.busy). A beat's
 * "b:<id>" flag is written when it ends, so a beat cut short by closing replays.
 *
 * The spine: ten eggs on four pages, and one question – why does it storm? From
 * Jätteträdet's crown the storm is seen swirling round Åsktoppen; a moonshine seed
 * from Rotgrottan is the light for the dark way into the mountain behind the
 * falls; through Kristallgrottan and up the spring to the peak, where the cloud
 * is afraid of the dark and has kept the last egg. It carries everyone home.
 */
import { HL } from '../../src/sim.mjs';
import { STORY, HINTS, GOALS, WHERE, NEXT_EGG, CLUES, CLUE_ORDER, CHATTER, BALK, WORDS } from './content/sv.mjs';
import { EGG_TOTAL } from './content/world.mjs';
import { eggsFound, eggFlag, collectEgg } from './puzzles.mjs';

/** Each puzzle: solved when, where its help applies, and its hint words. */
const PUZZLES = [
    { id: 'dig', scene: 'strand', areas: ['dig', 'nest'], solved: F => F.has('egg_e1') },
    { id: 'p1', scene: 'strand', areas: ['grove'], solved: F => F.has('egg_e2'), seen: 'b:grove' },
    { id: 'p2', scene: 'strand', areas: ['klyft'], solved: F => F.has('p2_bridge'), seen: 'b:klyft' },
    { id: 'p5', scene: 'strand', areas: ['beetle'], solved: F => F.has('egg_e6'), seen: 'b:beetle' },
    { id: 'coin', scene: 'strand', areas: ['river', 'deep'], solved: F => F.has('coin_got'), seen: 'b:magpie' },
    { id: 'trade', scene: 'strand', areas: ['magtree', 'magnest'], solved: F => F.has('coin_given'), seen: 'b:magpie', needs: 'coin_got' },
    { id: 'p3', scene: 'strand', areas: ['fors'], solved: F => F.has('cave_reached'), seen: 'b:fors' },
    { id: 'cave', scene: 'strand', areas: ['cave'], solved: F => F.has('lantern'), needs: 'cave_reached' },
    { id: 'mush', scene: 'skog', areas: ['arrive'], solved: F => F.has('egg_e3'), seen: 'b:skogArrive' },
    { id: 'p4', scene: 'skog', areas: ['seeds', 'tunnel'], solved: F => F.has('egg_e9'), seen: 'b:seeds' },
    { id: 'p7', scene: 'skog', areas: ['hill', 'trunkTop'], solved: F => F.has('egg_e10'), seen: 'b:leapSeen' },
    { id: 'vine', scene: 'skog', areas: ['ledge'], solved: F => F.has('p7_vine'), needs: 'egg_e10' },
    { id: 'tree', scene: 'skog', areas: ['tree', 'crown'], solved: F => F.has('storm_source') },
    { id: 'k1', scene: 'kristall', areas: ['k-plates'], solved: F => F.has('k1_bridge'), seen: 'b:plates' },
    { id: 'k2', scene: 'kristall', areas: ['k-lake'], solved: F => F.has('egg_e4'), seen: 'b:lake' },
    { id: 'k3', scene: 'kristall', areas: ['k-beetle', 'k-gate'], solved: F => F.has('k3_open'), seen: 'b:glitter' },
    { id: 'spring', scene: 'kristall', areas: ['k-spring'], solved: F => F.has('topp_reached'), needs: 'k3_open' },
    { id: 't1', scene: 'topp', areas: ['t-wind'], solved: F => F.has('wind_passed') },
    { id: 't2', scene: 'topp', areas: ['t-chasm'], solved: F => F.has('t2_bridge'), seen: 'b:blixtbro' },
    { id: 't3', scene: 'topp', areas: ['t-gap'], solved: F => F.has('gap_crossed'), needs: 't2_bridge', seen: 'b:medvind' },
    { id: 'summit', scene: 'topp', areas: ['t-climb', 't-summit'], solved: F => F.has('cloud_met'), needs: 't2_bridge' }
];
// the flag that frees each of these puzzles' eggs before it is picked up
const FREED = { p1: 'p1_fallen', p5: 'p5_washed', p4: 'p4_lit' };
/** Klo's measurements for the notebook's "Häst eller sköldpadda?": what was done with the hooves, with the shell, and
 *  his other readings, each written in once it has happened (the flag that says so). */
const MEASURES = [
    { id: 'drum', kind: 'horse', flag: 'p1_fallen' },
    { id: 'bridge', kind: 'horse', flag: 'p2_bridge' },
    { id: 'leap', kind: 'horse', flag: 'b:leapDone' },
    { id: 'crystals', kind: 'horse', flag: 'k1_lit' },
    { id: 'lightBridge', kind: 'horse', flag: 't2_bridge' },
    { id: 'falls', kind: 'turtle', flag: 'cave_reached' },
    { id: 'seeds', kind: 'turtle', flag: 'p4_lit' },
    { id: 'coin', kind: 'turtle', flag: 'coin_got' },
    { id: 'wall', kind: 'turtle', flag: 'k2_through' },
    { id: 'spring', kind: 'turtle', flag: 'topp_reached' },
    { id: 'wind', kind: 'turtle', flag: 'wind_passed' },
    { id: 'heart', kind: 'other', flag: 'b:love4' },
    { id: 'bounce', kind: 'other', flag: 't:bounce' }, // (the sköldhäst's first 'Hoppsan!' on the mushroom)
    { id: 'windForce', kind: 'other', flag: 'b:windCarried' }
];
/** The surprises after the story, in the notebook's "Hemliga upptäckter": each is written in once it has happened. */
const SECRETS = [
    { id: 'hatchFollow', flag: 'b:hatchFollow', page: 'strand' },
    { id: 'molnJoy', flag: 'b:molnJoy', page: 'strand' },
    { id: 'skataMimic', flag: 'b:skataMimic', page: 'strand' },
    { id: 'cocoaAgain', flag: 'b:cocoaAgain', page: 'strand' },
    { id: 'mushroomGiggle', flag: 'b:mushroomGiggle', page: 'skog' },
    { id: 'rocket', flag: 'b:rocket', page: 'skog' },
    { id: 'dyvelShells', flag: 'dyvel_shellball', page: 'kristall' },
    { id: 'starFall', flag: 'b:starFall', page: 'topp' }
];
const EGG_PUZZLES = ['dig', 'p1', 'p5', 'coin', 'trade', 'p2', 'mush', 'p4', 'p7', 'k2', 'k3', 'summit'];
const IN_MOUNTAIN = new Set(['k2', 'k3', 'summit']);
const PEAK_PATH = ['k1', 'k2', 'k3', 'spring', 't1', 't2', 't3', 'summit'];

/** The storm the view and audio draw: full until the cloud is met, softer after, gone with the moon. */
export function stormLevel(flags) { return flags.has('moon') ? 0 : flags.has('cloud_met') ? 0.5 : 1; }

export function createStory(G, io) {
    const queue = [];
    let current = null, thoughtAt = -10;
    const hintLevel = new Map();
    const said = new Map();
    let eggLine = 0, blownLine = 0;

    const F = G.flags;
    const done = (id) => F.has('b:' + id);
    const ui = () => io.ui;
    const say = async (lines) => { if (lines?.length) await ui().say(lines); };
    const fx = async (name, data) => { try { return await io.fx?.(name, data); } catch (err) { console.warn('fx', name, err); return null; } };
    const clue = (id) => { if (!F.has('clue_' + id)) { G.flag('clue_' + id); G.emit('clue', { id }); } };

    function think(text, { gap = 2.2, key = text, force = false } = {}) {
        if (!text) return;
        const last = said.get(key) ?? -Infinity;
        if (!force && (G.time - last < gap || G.time - thoughtAt < 0.8)) return;
        said.set(key, G.time); thoughtAt = G.time;
        if (io.ui.think) io.ui.think(text); else io.ui.toast?.(text);
    }
    /** A thought said once in the whole adventure (its flag is saved). */
    function thinkOnce(id, text) {
        if (F.has('t:' + id)) return;
        G.flag('t:' + id); think(text, { gap: 0 });
    }

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
    // actors
    // --------------------------------------------------------------------------
    function actor(id, o) {
        G.actors[id] = Object.assign(G.actors[id] || { id, x: 0, y: 0, facing: 1, vx: 0, distance: 0, visible: false, pose: 'idle' }, o);
        return G.actors[id];
    }
    function groundAt(x, y) {
        const s = G.terrain?.support(x, y, 0.45 * HL, 0.9 * HL);
        if (!s) return null;
        if (G.terrain.waterAt(x, s.y - 4) || G.terrain.waterColumn(x) && G.terrain.waterColumn(x).top < s.y - 20) return null;
        return s.y;
    }
    function place(a, x, y = G.player.y) {
        const gy = groundAt(x, y);
        if (gy === null) return false;
        a.x = x; a.y = gy; a.scene = G.sceneId; a.vx = 0;
        return true;
    }
    function placeAt(a, spot) {
        const gy = G.terrain ? groundAt(spot.x, spot.y - 0.3 * HL) : null;
        Object.assign(a, { x: spot.x, y: gy ?? spot.y, scene: G.sceneId, vx: 0 });
    }
    function setupActors() {
        const sc = G.sceneId, sp = G.sceneDef.spots;
        for (const who of ['klo', 'tukan']) {
            const a = actor(who, { follow: F.has('b:arrive') || who === 'tukan' });
            if (a.scene !== sc) {
                a.visible = true;
                const off = who === 'klo' ? 1.6 : 2.8;
                if (!place(a, G.player.x - G.player.facing * off * HL) && !place(a, G.player.x + G.player.facing * off * HL)) {
                    const spot = sc === 'strand' ? (who === 'klo' ? sp.kloNest : sp.tukanNest) : (who === 'klo' ? sp.kloArrive : sp.tukanArrive) || sp.fromStrand || G.player;
                    placeAt(a, spot);
                }
            }
        }
        const gathered = F.has('eggs_in_nest');
        if (sc === 'strand') {
            const nest = G.sceneDef.nest;
            // at the nest, between Tordyveln and Tukankrabban (at nest + 2.4 HL she stood on the sköldhäst's own
            // start spot and was hidden inside it in the finale, 5 November)
            // After the story everyone who came to the nest goes home, so their surprises lie in different places
            // (6 November): Skatan back on her branch in Skatträdet; Tordyveln off with his new ball into the mountain,
            // where he rolled his glitter ball before ("ända hit in i berget"). The hatchlings and Molnet stay.
            const home = F.has('ended');
            actor('skata', gathered && !home ? { scene: 'strand', visible: true, x: nest.x - 2.3 * HL, y: -0.47 * HL, facing: 1, pose: F.has('skata_gift') ? 'idle' : 'coin' }
                : { scene: 'strand', x: sp.magpie.x + 0.5 * HL, y: sp.magpie.y, visible: true, facing: -1, pose: F.has('coin_given') && !F.has('skata_gift') ? 'coin' : 'idle' });
            const kb = G.scenes.kristall.spots.beetle;
            actor('dyvel', gathered && !home ? { scene: 'strand', visible: true, x: nest.x - 3.7 * HL, y: -0.48 * HL, facing: 1 }
                : home ? { scene: 'kristall', x: kb.x, y: kb.y, visible: true, facing: 1 }
                : { scene: 'strand', x: sp.beetle.x, y: sp.beetle.y, visible: true, facing: -1 });
        } else if (sc === 'kristall' && (!gathered || F.has('ended'))) {
            actor('dyvel', { scene: 'kristall', x: sp.beetle.x, y: sp.beetle.y, visible: true, facing: 1 });
        }
        const moln = actor('moln', { visible: true });
        const sky = G.scenes.strand.spots.cloudSky;
        if (F.has('moon')) Object.assign(moln, { scene: 'strand', x: sky.x, y: sky.y, pose: 'happy' });
        else if (F.has('cloud_met')) Object.assign(moln, { scene: 'strand', x: sky.x, y: sky.y, pose: 'hope' });
        else Object.assign(moln, { scene: 'topp', x: G.scenes.topp.spots.cloud.x, y: G.scenes.topp.spots.cloud.y, pose: 'sad' });
    }
    /** Is the way from x0 to x1 (at height y) open to a companion? No refusing edge, wall or dark in between. */
    function openWay(x0, x1, y) {
        const T = G.terrain, dir = Math.sign(x1 - x0) || 1;
        if (!T) return false;
        for (const e of T.edges) {
            if (e.kind === 'pass' || Math.abs(y - e.y) > (e.dy ?? 90) + 40) continue;
            if (dir > 0 ? (e.x > x0 && e.x <= x1) : (e.x < x0 && e.x >= x1)) return false;
        }
        for (const d of T.dashed) {
            const sx = (dir > 0 ? d.pts[0] : d.pts.at(-1))[0];
            if (dir > 0 ? (sx > x0 && sx <= x1) : (sx < x0 && sx >= x1)) return false;
        }
        return !T.wallBetween(x0, x1, y, dir);
    }
    /** Ground a companion may walk on: not a branch the horse has to buck onto. */
    function walkable(x, y) {
        const s = G.terrain?.support(x, y, 0.45 * HL, 0.9 * HL);
        if (!s || (s.s.thin && !s.s.bridge && !s.s.log)) return null;
        if (G.terrain.waterAt(x, s.y - 4) || G.terrain.waterColumn(x) && G.terrain.waterColumn(x).top < s.y - 20) return null;
        return s.y;
    }
    function follow(a, offset, speed, dt) {
        if (!a?.visible || !a.follow || a.staged) return;
        const p = G.player;
        // when the horse stands still they come close (so a word with them is easy)
        const off = Math.abs(p.vx) < 20 && p.mode === 'ground' ? offset * 0.6 : offset;
        if (a.scene !== G.sceneId) { place(a, p.x - p.facing * off); return; }
        const want = p.x - p.facing * off;
        const far = Math.hypot(want - a.x, p.y - a.y);
        if (far > 16 * HL && p.mode === 'ground' && !p.surface?.thin && openWay(a.x, want, a.y) && openWay(a.x, want, p.y)) { place(a, want, p.y); return; }
        const dist = Math.abs(want - a.x);
        if (dist < 0.35 * HL) { a.vx = 0; return; }
        const dir = Math.sign(want - a.x);
        const nx = a.x + dir * Math.min(dist, speed * dt * (dist > 4 * HL ? 2.4 : 1));
        const gy = walkable(nx, a.y);
        if (gy === null || Math.abs(gy - a.y) > 0.3 * HL || !openWay(a.x, nx, a.y)) { a.vx = 0; return; }
        a.distance += Math.abs(nx - a.x);
        a.vx = (nx - a.x) / dt; a.x = nx; a.y = gy; a.facing = dir;
    }
    /** For a scene where they speak: Klo and Tukankrabban come up beside the horse, on its own ground. */
    /** Runs fn while the camera keeps what the lines are about in the picture, with the sköldhäst if it fits
     *  (view.mjs frameSpeaker). box: [x0, x1, y0, y1] in horse lengths. */
    async function about(box, fn) {
        const look = { scene: G.sceneId, x0: box[0] * HL, x1: box[1] * HL, y0: box[2] * HL, y1: box[3] * HL };
        G.camLook = look;
        try { return await fn(); } finally { if (G.camLook === look) G.camLook = null; }
    }

    const BALL_LOOK = { scene: 'strand', x0: 55.6 * HL, x1: 61.4 * HL, y0: -1.8 * HL, y1: 0.8 * HL };

    /** Skatan keeps clear of the sköldhäst on her branch: if it comes right up to her, she hops along the branch
     *  to the side with more room, so she is never hidden behind it (the trade happens wherever she stands). */
    let skataRest = 0;
    function skataAside(dt) {
        const sk = G.actors.skata, mp = G.scenes.strand.magpie, p = G.player;
        if (!sk?.visible || sk.scene !== 'strand' || G.sceneId !== 'strand' || F.has('eggs_in_nest')) return;
        if ((current || G.busy) && !sk.hop) return; // not mid-conversation: the coin flies to where she sits
        skataRest = Math.max(0, skataRest - dt);
        if (!sk.hop && !skataRest && p.surface?.id === mp.surface && Math.abs(p.x - sk.x) < 0.7 * HL) {
            const branch = G.scenes.strand.surfaces.find(s => s.id === mp.surface).pts;
            const lo = branch[0][0] + 0.25 * HL, hi = branch.at(-1)[0] - 0.25 * HL;
            // to whichever end of the branch will be furthest from where the sköldhäst is going
            const soon = p.x + (p.vx || 0) * 0.6, cl = x => Math.max(lo, Math.min(hi, x));
            const to = [cl(p.x - 1.0 * HL), cl(p.x + 1.0 * HL)].sort((a, b) => Math.abs(b - soon) - Math.abs(a - soon))[0];
            if (to !== null) sk.hop = { from: sk.x, to, t: 0 };
        }
        if (!sk.hop) return;
        sk.hop.t = Math.min(1, sk.hop.t + dt / 0.45);
        const u = sk.hop.t;
        sk.x = sk.hop.from + (sk.hop.to - sk.hop.from) * u;
        sk.y = mp.y - Math.sin(u * Math.PI) * 0.5 * HL;
        sk.facing = Math.sign(p.x - sk.x) || -1;
        if (u >= 1) { sk.y = mp.y; sk.hop = null; skataRest = 0.6; }
    }

    function stage() {
        const p = G.player;
        for (const [who, off] of [['klo', 1.5], ['tukan', 2.6]]) {
            const a = G.actors[who];
            if (!a) continue;
            for (const side of [-p.facing, p.facing]) {
                const x = p.x + side * off * HL;
                const s = G.terrain.support(x, p.y, 0.5 * HL, 0.5 * HL);
                if (s && !G.terrain.waterAt(x, s.y - 4)) { Object.assign(a, { x, y: s.y, scene: G.sceneId, visible: true, facing: -side, vx: 0 }); break; }
            }
        }
    }

    // --------------------------------------------------------------------------
    // help: which puzzle we are at, and its next hint
    // --------------------------------------------------------------------------
    function available(pz) { return !pz.needs || F.has(pz.needs); }
    function activePuzzle() {
        const open = PUZZLES.filter(pz => !pz.solved(F) && available(pz));
        return open.find(pz => pz.scene === G.sceneId && pz.areas.some(a => G.areas.has(a)) && (!pz.seen || F.has(pz.seen))) || null;
    }
    function puzzleX(pz) {
        const area = G.scenes[pz.scene].areas.find(a => a.id === pz.areas[0]);
        return area ? (area.x0 + area.x1) / 2 : 0;
    }
    function nextEggPuzzle() {
        const open = EGG_PUZZLES.map(id => PUZZLES.find(p => p.id === id)).filter(pz => !pz.solved(F) && available(pz)
            && !(pz.id === 'p2' && F.has('egg_e3')));
        const here = open.filter(pz => pz.scene === G.sceneId).sort((a, b) => Math.abs(puzzleX(a) - G.player.x) - Math.abs(puzzleX(b) - G.player.x));
        return here[0] || open[0] || null;
    }
    /** Inside the mountain the way up comes first: no hint sends the sköldhäst back out for an egg. */
    function peakStep() {
        if (F.has('cloud_met') || (G.sceneId !== 'kristall' && G.sceneId !== 'topp')) return null;
        return PEAK_PATH.map(id => PUZZLES.find(pz => pz.id === id)).find(pz => !pz.solved(F) && available(pz)) || null;
    }
    let peeking = false;
    function ladder(id) {
        const n = Math.min(2, hintLevel.get(id) || 0);
        if (!peeking) hintLevel.set(id, n + 1);
        return { puzzle: id, level: n, text: HINTS[id][n], ladder: id };
    }
    // a plain line (where the next egg is, or that it lies free) once it has been asked for: the notebook keeps it
    let plainAsked = null;
    /** The next help line. With peek, read it without moving up the ladder (the goal note in guided help). */
    function hint({ peek = false } = {}) {
        peeking = peek;
        try {
            const h = nextHint();
            if (!peek && h?.text && !h.ladder) plainAsked = h.text;
            return h;
        } finally { peeking = false; }
    }
    /** Klo's notes in the notebook: every hint given so far for what is next (also those asked of Klo himself),
     *  and whether there is one more. None after the story. */
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
    function nextHint() {
        if (F.has('ended')) return { puzzle: null, text: null };
        const pz = activePuzzle() || peakStep();
        // the puzzle is done and its egg lies free: say so, not how to solve it again (5 November)
        if (pz && FREED[pz.id] && F.has(FREED[pz.id])) return { puzzle: pz.id, level: 0, text: HINTS.pickup[0] };
        if (pz) return ladder(pz.id);
        if (F.has('cloud_met') && eggsFound(G) >= EGG_TOTAL) return ladder('nest');
        const next = nextEggPuzzle();
        // the eggs inside the mountain need the light and the way there first
        if (next && IN_MOUNTAIN.has(next.id) && !F.has('lantern')) return F.has('storm_source') || F.has('cave_reached') ? ladder('cave') : ladder('source');
        if (next && IN_MOUNTAIN.has(next.id) && !F.has('storm_source') && !F.has('visited_kristall')) return ladder('source');
        if (next) return { puzzle: next.id, level: 0, text: NEXT_EGG(next.id === 'coin' && F.has('b:magpie') ? WHERE.coinDeep : WHERE[next.id]) };
        return ladder('more');
    }
    let chatter = 0;
    function talk(who) {
        if (who === 'skata') return beat('skataTalk', () => say(F.has('coin_given') ? STORY.skataAfter : STORY.skataTalk), { once: false });
        // after the story Tordyveln has rolled his finest ball yet, from the hatched eggs' shells (an easter egg)
        if (who === 'dyvel' && F.has('hatched')) {
            if (F.has('dyvel_shellball')) return beat('dyvelTalk', () => say(STORY.dyvelShellsAgain), { once: false });
            return beat('dyvelShells', async () => {
                await say([STORY.dyvelShells[0]]);
                G.flag('dyvel_shellball');
                await fx('shellBall', {});
                await say([STORY.dyvelShells[1]]);
            });
        }
        if (who === 'dyvel') {
            const lines = G.sceneId === 'kristall' ? (F.has('k3_ball') ? STORY.glitterAfter : STORY.glitterTalk)
                : F.has('p5_washed') ? STORY.beetleAfter : STORY.beetleTalk;
            return beat('dyvelTalk', () => say(lines), { once: false });
        }
        const h = hint(who);
        const text = h.text || CHATTER[who][chatter++ % CHATTER[who].length];
        beat('talk', () => say([[who, text]]), { once: false });
    }

    function objective() {
        const n = eggsFound(G);
        if (!F.has('b:arrive')) return null;
        if (F.has('ended')) return { id: 'free', text: GOALS.free, why: GOALS.freeWhy };
        if (F.has('cloud_met')) return n < EGG_TOTAL
            ? { id: 'eggs', text: GOALS.lastEggs(n, EGG_TOTAL), why: GOALS.lastWhy }
            : { id: 'nest', text: GOALS.nest, why: GOALS.nestWhy };
        if (F.has('topp_reached')) return { id: 'peak', text: GOALS.summit, why: GOALS.summitWhy };
        if (F.has('storm_source')) return { id: 'peak', text: GOALS.peak, why: !F.has('lantern') ? GOALS.peakDark : G.sceneId === 'kristall' ? GOALS.peakInside : GOALS.peakWhy };
        return { id: 'eggs', text: GOALS.eggs(n, EGG_TOTAL), why: GOALS.eggsWhy };
    }
    /** Per page: eggs found / eggs there, whether it has been visited, and whether the story has named it yet
     *  (the notebook's map writes a page's name once someone has said it, its eggs once it has been visited). */
    function places() {
        const named = { strand: true, skog: F.has('p2_bridge'), kristall: F.has('cave_reached'), topp: F.has('storm_source') || F.has('topp_reached') };
        return Object.values(G.scenes).map(sc => {
            const eggs = (sc.eggs || []).map(e => e.id), visited = F.has('visited_' + sc.id);
            return { id: sc.id, name: WORDS.pages[sc.id], visited, named: visited || !!named[sc.id], here: G.sceneId === sc.id,
                found: eggs.filter(id => F.has(eggFlag(id))).length, total: eggs.length };
        });
    }
    /** Everything the research notebook shows, as far as the story has come. */
    function notebook() {
        return {
            objective: objective(), eggs: eggsFound(G), total: EGG_TOTAL, hatched: F.has('hatched'), ended: F.has('ended'),
            // Tukankrabban's hypotheses, numbered as she says them; each is stamped once the story shows it right
            hypotheses: [
                { said: F.has('b:arrive'), confirmed: F.has('storm_source') || F.has('topp_reached') },
                { said: F.has('clue_darkStorm') || F.has('cloud_met'), confirmed: F.has('cloud_met') },
                { said: F.has('b:medvind') || F.has('gap_crossed'), confirmed: F.has('gap_crossed') }
            ],
            answered: F.has('cloud_met'), moon: F.has('moon'),
            clues: CLUE_ORDER.filter(id => F.has('clue_' + id)).map(id => ({ id, text: CLUES[id] })),
            places: places(),
            measures: MEASURES.filter(m => F.has(m.flag)).map(m => ({ id: m.id, kind: m.kind })),
            secrets: SECRETS.map(s => ({ id: s.id, page: s.page, found: F.has(s.flag) }))
        };
    }

    // --------------------------------------------------------------------------
    // beats
    // --------------------------------------------------------------------------
    function arrive() {
        beat('arrive', async () => {
            const sp = G.scenes.strand.spots;
            actor('tukan', { scene: 'strand', x: sp.tukanNest.x, y: sp.tukanNest.y, visible: true, facing: 1, pose: 'dig', follow: false });
            const kloAt = { x: sp.kloNest.x + 1.4 * HL, y: sp.kloNest.y };
            actor('klo', { scene: 'strand', x: kloAt.x, y: kloAt.y - 4 * HL, visible: false, facing: -1, follow: false });
            // they dived into the page: the sköldhäst drops into the sand, and Klo lands just after it
            if (G.sceneId === 'strand' && !G.flags.has('egg_e1')) {
                const p = G.player;
                G.camHint = { x: p.x - 0.8 * HL, y: p.y - 1.3 * HL, zoom: 1.05 }; // hold the picture still while they fall
                p.y -= 3.2 * HL; p.mode = 'air'; p.surface = null; p.vy = 0; p.vx = 0;
                G.hideHero = false;
                await G.wait(0.15);
                for (let i = 0; i < 120 && G.player.mode !== 'ground'; i++) await G.wait(1 / 60);
                G.emit('land', { big: true, x: G.player.x, y: G.player.y, id: 'arrival' });
                await G.wait(0.35);
                const k = G.actors.klo; k.visible = true;
                for (let i = 1; i <= 24; i++) { const u = i / 24; k.y = kloAt.y - 4 * HL * (1 - u * u); await G.wait(1 / 60); }
                k.y = kloAt.y;
                G.emit('land', { big: false, x: k.x, y: k.y, id: 'klo' });
                await G.wait(0.4);
            }
            G.hideHero = false;
            const k0 = G.actors.klo; k0.visible = true; k0.y = kloAt.y;
            await fx('focus', { x: sp.nest.x, y: sp.nest.y, zoom: 1.15 });
            // "Stormen tog alla mina tio ägg": she is sad until they promise to help
            G.actors.tukan.pose = 'sad';
            await say(STORY.arrive);
            G.actors.klo.pose = 'love';
            await say(STORY.arrive2);
            G.actors.klo.pose = 'idle'; G.actors.tukan.pose = 'idle';
            await say(STORY.arrive3);
            await say(STORY.mystery);
            clue('moonRule'); clue('noMoon');
            G.actors.klo.follow = true; G.actors.tukan.follow = true;
            await fx('focus', { x: G.scenes.strand.eggs[0].x, y: G.scenes.strand.eggs[0].y, zoom: 1.1, hold: 0.6 });
            think(STORY.digSeen, { force: true });
            await fx('focus', null);
        });
    }

    function onEgg({ id, n }) {
        io.audio?.sfx?.('egg');
        ui().toast?.(WORDS.eggToast(n, EGG_TOTAL));
        // the claws that pick the cocoa fruit; when the love scene follows, it takes Klo's line about them
        if (id === 'e2') beat('fallen', async () => {
            await say(STORY.fallen);
            if (G.actors.tukan) G.actors.tukan.pose = 'happy';
            await say(n === 2 ? STORY.claws.slice(0, 2) : STORY.claws);
            if (G.actors.tukan) G.actors.tukan.pose = 'idle';
        });
        if (id === 'e7') beat('tradeThanks', () => say(F.has('cloud_met') ? STORY.tradeThanksLate : STORY.tradeThanks));
        if (n === 1) beat('firstEgg', async () => { await say(STORY.firstEgg); await say(STORY.alvaFirstEgg); });
        else if (!['e2', 'e5', 'e7'].includes(id)) think(STORY.eggLine?.[id] || STORY.eggLines[eggLine++ % STORY.eggLines.length], { gap: 0 });
        if (STORY.love[n] && G.sceneId !== 'topp') onLove(n);
        if (id === 'e10' && !F.has('p7_vine') && !F.has('ended')) beat('vineAsk', () => say(STORY.vineAsk));
        lightning();
        if (n === EGG_TOTAL && F.has('cloud_met') && G.sceneId !== 'topp' && !G.areas.has('nest')) beat('allEggs', async () => {
            await say(STORY.allEggs);
            await say(STORY.allEggsHome);
        });
        G.emit('eggCount', { n });
        io.save?.();
    }

    /** The first clue about the lightning: out under the sky, and only while it is still a mystery. */
    function lightning() {
        if (eggsFound(G) < 3 || F.has('cloud_met') || (G.sceneId !== 'strand' && G.sceneId !== 'skog')) return;
        beat('lightning', async () => { await fx('lightning', {}); await say(STORY.lightning); clue('lightning'); });
    }

    function onLove(n) {
        beat('love' + n, async () => {
            if (G.actors.klo) G.actors.klo.pose = 'love';
            await say(STORY.love[n]);
            if (n === 8) await say(STORY.alvaLove);
            if (G.actors.klo) G.actors.klo.pose = 'idle';
        });
    }

    async function seedsLit() { await say(STORY.seedsLit); await say(STORY.alvaSeeds); await say(STORY.seedsLit2); clue('lantern'); }

    function onEnter({ id }) {
        const sc = G.sceneId;
        if (!done('arrive')) return;
        const intro = !F.has('ended');
        if (sc === 'strand') {
            if (id === 'nest') G.setCheckpoint('start');
            if (id === 'magtree' || id === 'beetle') G.setCheckpoint('east');
            if (intro && id === 'grove' && !F.has('p1_fallen') && !F.has('egg_e2')) beat('grove', async () => {
                await fx('focus', { x: G.scenes.strand.eggs[1].from.x, y: G.scenes.strand.eggs[1].from.y + 1.5 * HL, zoom: 0.9, hold: 0.5 });
                await say(STORY.grove);
                await fx('focus', null);
            });
            // Miras streckade bro över Klyftan
            if (intro && id === 'klyft' && !F.has('p2_bridge')) beat('klyft', () => about([1.5, 6.5, -1.3, 0], () => say(STORY.klyft)));
            if (intro && id === 'river') beat('miraRiver', () => say(STORY.miraRiver));
            if (intro && id === 'fors' && !F.has('cave_reached')) beat('fors', async () => {
                await fx('focus', { x: G.scenes.strand.spots.cave.x - 2 * HL, y: -0.6 * HL, zoom: 0.95, hold: 0.5 });
                await say(F.has('storm_source') ? [...STORY.forsKnown, ...STORY.fors.slice(1)] : STORY.fors);
                await say(STORY.miraFors);
                await fx('focus', null);
            });
            if (id === 'klyft' && F.has('p2_bridge')) G.setCheckpoint('west');
            if (id === 'cave') {
                G.setCheckpoint('cave');
                if (!F.has('cave_reached')) G.flag('cave_reached');
                if (intro && !F.has('visited_kristall')) beat(F.has('lantern') ? 'caveLit' : 'caveDark', async () => {
                    stage();
                    // the passage into the mountain behind the falls
                    await about([92.4, 95.2, -2.2, 0], () => say(!F.has('lantern') ? STORY.caveDark : done('caveDark') ? STORY.caveLitBack : STORY.caveLit));
                });
            }
            // Tordyvelns boll, with the egg in it
            if (intro && id === 'beetle' && !F.has('p5_rolled') && !F.has('egg_e6')) beat('beetle', () => about([61, 63.8, -2.6, -1.1], async () => {
                await say(STORY.beetle);
                await say(STORY.beetle2);
            }));
            if (intro && id === 'magtree' && !F.has('coin_given')) beat('magpie', async () => {
                await fx('focus', { x: G.scenes.strand.magpie.x, y: G.scenes.strand.magpie.y + 0.6 * HL, zoom: 1.05, hold: 0.4 });
                await say(STORY.magpie);
                await say(F.has('coin_got') ? STORY.magpieCoin : STORY.magpie2);
                await fx('focus', null);
            });
            // Skatans bo high up, and the branches that go up the trunk like steps
            if (id === 'magtree' && F.has('coin_got') && !F.has('coin_given')) beat('climb', () => about([67.2, 70.2, -3.9, -0.4], () => say(STORY.climb)));
            if (id === 'nest') maybeFinale();
        } else if (sc === 'skog') {
            if (id === 'arrive') G.setCheckpoint('skog');
            if (id === 'ledge') G.setCheckpoint('ledge');
            if (intro && id === 'arrive' && !F.has('egg_e3')) beat('skogArrive', async () => {
                await fx('focus', { x: G.scenes.skog.eggs[0].x, y: G.scenes.skog.eggs[0].y + 0.8 * HL, zoom: 1.0, hold: 0.4 });
                await say(STORY.skogArrive);
                await fx('focus', null);
            });
            if (intro && id === 'seeds' && !F.has('p4_lit')) beat('seeds', () => about([88.7, 90.8, -1.6, -0.4], async () => { await say(STORY.seeds); clue('darkStorm'); }));
            // a save while the seeds' lighting was told (the tablet locked mid-sentence) lost it, and the lantern's
            // note in the book with it: the same place tells it again (6 November)
            if (id === 'seeds' && F.has('p4_lit') && !done('seedsLit')) beat('seedsLit', seedsLit);
            if (intro && (id === 'hill' || id === 'trunkTop') && !F.has('egg_e10')) beat('leapSeen', async () => {
                await fx('focus', { x: G.scenes.skog.eggs[2].x, y: G.scenes.skog.eggs[2].y - 0.5 * HL, zoom: 0.85, hold: 0.6 });
                await say(STORY.leapSeen);
                await fx('focus', null);
            });
            // the ravine they cannot cross, and the vine that becomes a bridge
            if (intro && id === 'ledge' && F.has('egg_e10') && !F.has('p7_vine')) beat('vineAsk', () => about([33.2, 40, -2.6, 0.2], () => say(STORY.vineAsk)));
            // Jätteträdet: the branches winding up (the crown is out of sight, as Klo says)
            if (intro && id === 'tree' && !F.has('storm_source')) beat('tree', () => about([22, 27, -5, -0.4], () => say(STORY.tree)));
            if (id === 'crown') { G.setCheckpoint('crown'); if (intro) crownSource(); }
        } else if (sc === 'kristall') {
            if (id === 'k-arrive') {
                G.setCheckpoint('kristall');
                if (intro) beat('kristall', async () => {
                    await say(STORY.kristall);
                    if (!F.has('storm_source')) { G.flag('storm_source'); clue('source'); }
                });
            }
            // the three ringing crystals and the dark chasm beyond them
            if (intro && id === 'k-plates' && !F.has('k1_bridge')) beat('plates', () => about([6.4, 14.5, -1.4, 0.4], () => say(STORY.plates)));
            if (intro && id === 'k-lake' && !F.has('egg_e4')) beat('lake', async () => {
                await fx('focus', { x: G.scenes.kristall.spots.blueCrystal.x, y: h(1.6), zoom: 0.85, hold: 0.7 });
                await say(STORY.lake);
                await fx('focus', null);
            });
            if (id === 'k-beetle') G.setCheckpoint('lakeEast');
            if (intro && id === 'k-beetle' && !F.has('k3_open')) beat('glitter', async () => {
                await say(F.has('p5_rolled') ? STORY.glitter : [...STORY.glitterEarly, ...STORY.glitter.slice(1)]);
                // "Porten där borta": the gate, and the two plates in the pond
                await about([59, 66.8, -1.8, 2.6], () => say(STORY.glitter2));
            });
            if (intro && id === 'k-spring' && F.has('k3_open') && !F.has('topp_reached')) beat('spring', () => about([72, 74, -1, 3], () => say(STORY.spring)));
        } else if (sc === 'topp') {
            if (id === 't-arrive') {
                if (!F.has('topp_reached')) G.flag('topp_reached');
                G.setCheckpoint('topp');
                if (intro) beat('topp', () => say(done('source') ? STORY.topp : STORY.toppFirst));
            }
            if (id === 't-chasm') {
                if (!F.has('wind_passed')) G.flag('wind_passed');
                if (intro && !F.has('t2_bridge')) beat('blixtbro', async () => {
                    await fx('focus', { x: h(26.8), y: h(-3.6), zoom: 0.9, hold: 0.3 });
                    await say(STORY.blixtbro);
                    await fx('focus', null);
                });
            }
            if (id === 't-climb' && F.has('t2_bridge') && !F.has('gap_crossed')) G.setCheckpoint('bridgeEast');
            // "stigen tar slut där framme": the end of the crag, the gap, the far crag
            if (intro && id === 't-gap' && !F.has('gap_crossed')) beat('medvind', async () => { stage(); await about([35.5, 40.5, -5.8, -3], () => say(STORY.medvind)); });
            if (id === 't-summit') { G.setCheckpoint('summit'); if (intro) summit(); }
        }
    }
    const h = (v) => v * HL;

    function crownSource() {
        if (F.has('storm_source') && done('source')) return;
        beat('source', async () => {
            const met = F.has('cloud_met'), inside = F.has('visited_kristall');
            stage();
            await fx('focus', { x: h(30), y: h(-12), zoom: 0.9, hold: 1.1, peak: true }); // from the tree to the mountain
            // hypothesis one is confirmed once: on the top if the top came first
            await say(met ? STORY.sourceAfter : inside ? (F.has('topp_reached') ? STORY.sourceLate.slice(0, 2) : STORY.sourceLate) : STORY.source);
            G.flag('storm_source'); clue('source');
            if (!met) {
                await say(STORY.sourceMira);
                await say(inside ? STORY.sourceLateGo : F.has('lantern') ? (F.has('cave_reached') ? STORY.sourceLitKnown : STORY.sourceLit) : STORY.sourceDark);
            }
            await fx('focus', null);
        });
    }

    function summit() {
        if (F.has('cloud_met')) return;
        beat('summit', async () => {
            const sp = G.scenes.topp.spots;
            stage();
            await fx('focus', { x: sp.cloud.x - 1.5 * HL, y: sp.cloud.y + 1.6 * HL, zoom: 1.05, hold: 0.4 });
            await say(STORY.summit);
            G.actors.moln.pose = 'hope';
            await say(STORY.summit2);
            await say(STORY.summit3);
            G.flag('cloud_met'); G.storm = stormLevel(F);
            clue('afraid');
            await say(STORY.summit4.slice(0, 1));
            await fx('eggsDrop', { ids: ['e5'], from: { x: sp.cloudNest.x, y: sp.cloud.y + 0.8 * HL } });
            collectEgg(G, 'e5');
            await say(STORY.summit4.slice(1));
            await fx('focus', null);
            await ride();
        });
    }
    /** The cloud carries everyone home to the nest (also after a reload on the peak). */
    async function ride() {
        // the narrator reads over the picture; the next line waits for the reading
        const told = ui().caption?.(STORY.rideCaption, 3600);
        await fx('cloudRide', {});
        await told;
        G.goto('strand', 'start');
        G.setCheckpoint('nest');
        setupActors();
        if (eggsFound(G) >= EGG_TOTAL) maybeFinale(true);
        else await say(STORY.homeWait);
    }
    function rideHome() { beat('rideHome', ride, { once: false }); }

    function maybeFinale(force = false) {
        if (F.has('ended') || !F.has('cloud_met') || eggsFound(G) < EGG_TOTAL) return;
        if (!force && !G.areas.has('nest')) return;
        beat('finale', finale);
    }

    async function finale() {
        const sp = G.scenes.strand.spots;
        G.player.vx = 0;
        await fx('focus', { x: sp.nest.x, y: sp.nest.y - 0.6 * HL, zoom: 1.0 });
        await say(STORY.finale);
        await fx('eggsToNest', {});
        G.flag('eggs_in_nest');
        setupActors(); // Skatan and Tordyveln come to see
        Object.assign(G.actors.moln, { scene: 'strand', x: sp.cloudSky.x, y: sp.cloudSky.y, pose: 'hope', visible: true });
        await fx('cloudArrive', {});
        await say(STORY.gather);
        await say(STORY.forgive);
        await say(STORY.finale2);
        await fx('moonDraw', {});
        G.flag('moon'); G.storm = stormLevel(F);
        clue('moon');
        G.actors.moln.pose = 'happy';
        await fx('moonrise', {});
        // Alva draws the stars round Mira's moon
        await say(STORY.alvaStars);
        await fx('starsDraw', {});
        G.flag('alva_stars');
        await fx('starsShine', {});
        await say(STORY.moonUp);
        const moonTold = ui().caption?.(STORY.moonCaption, 3200);
        await fx('hatch', {});
        await moonTold;
        G.flag('hatched');
        await say(STORY.hatch);
        const watchTold = ui().caption?.(STORY.watchCaption, 2600);
        await fx('gift', {});
        await watchTold;
        G.flag('watch_given');
        await say(STORY.gift);
        if (G.actors.klo) G.actors.klo.pose = 'faint';
        await say(STORY.faint);
        await say(STORY.skataGift);
        G.flag('skata_gift');
        if (G.actors.skata) G.actors.skata.pose = 'idle';
        G.flag('ended');
        G.setCheckpoint('nest');
        io.save?.({ ended: true });
        await fx('epilogue', {});
        if (G.actors.klo) G.actors.klo.pose = 'idle';
        await fx('ending', {});
        // while the ending card covered the page, the guests went home: Skatan to her tree, Tordyveln with his new
        // ball into the mountain (their surprises are there; by the nest they would answer instead of Molnet)
        setupActors();
        await say(STORY.after);
        await fx('focus', null);
    }

    // --------------------------------------------------------------------------
    // wiring
    // --------------------------------------------------------------------------
    // --------------------------------------------------------------------------
    // after the story: small surprises for whoever plays on (easter eggs)
    // --------------------------------------------------------------------------
    // Tio små forskare: hide in the shell by the nest and the ten hatchlings gather round; come out and they follow
    // in a row along the beach (G.hatchFollow, drawn by the view). Hide by the nest again and they go home.
    let hideByNest = 0, hideToggled = false, joyAt = -Infinity;
    let stillOnTop = 0, starFellAt = -Infinity, giggledAt = -Infinity;
    function afterStory(dt) {
        starFall(dt);
        if (!F.has('hatched') || G.sceneId !== 'strand') { hideByNest = 0; return; }
        const p = G.player, nest = G.sceneDef.nest;
        // one toggle per hiding: the shell must come out before the next one counts (it is still hidden while
        // Tukankrabban's line is spoken, which used to send them straight home again)
        if (!p.hidden || Math.abs(p.x - nest.x) >= 2.4 * HL) { hideByNest = 0; hideToggled = false; return; }
        if (G.busy || hideToggled) return;
        hideByNest += dt;
        if (hideByNest > 1.5) {
            hideToggled = true;
            G.hatchFollow = !G.hatchFollow;
            if (G.hatchFollow && !done('hatchFollow')) beat('hatchFollow', () => say(STORY.hatchlingsFollow));
        }
    }
    // Raketen från Utsiktskullen: after the story, on top of the lookout hill, a rocket rises far away, crosses Mira's
    // moon and becomes a twinkle among Alva's stars. The sköldhäst stops and wonders what it would be like to go out into
    // space: a glimpse of the next adventure. The first time the picture lifts to the sky and they talk about it; after
    // that it flies again once each time the page is visited, and the sköldhäst just watches it go.
    let rocketThisVisit = false;
    function rocketWatch() {
        if (rocketThisVisit || !F.has('ended') || G.sceneId !== 'skog' || G.busy || current || queue.length) return;
        const p = G.player;
        if (p.mode !== 'ground' || p.hidden || p.x < 50.8 * HL || p.x > 53.6 * HL || p.y > -3.85 * HL) return;
        rocketThisVisit = true;
        // a far-off roar that swells and dies away (no thunder: the storm is over)
        const liftOff = () => { io.audio?.sfx?.('whoosh', { gain: 0.45 }); io.audio?.sfx?.('wind', { gain: 0.55, delay: 0.2 }); io.audio?.sfx?.('wind', { gain: 0.3, delay: 2.3 }); };
        if (done('rocket')) { liftOff(); fx('rocket', {}).then(() => io.audio?.sfx?.('sparkle')); return; }
        beat('rocket', async () => {
            p.vx = 0; p.facing = 1;
            // the rocket is in the sky (screen space), so the picture only turns a little towards it, keeping the
            // sköldhäst clear of the speech box below
            await fx('focus', { x: p.x + 1.1 * HL, y: p.y - 0.7 * HL, zoom: 0.92 });
            liftOff();
            const flight = fx('rocket', {});
            await G.wait(1.4);
            await say(STORY.rocket);
            await flight;
            io.audio?.sfx?.('sparkle');
            await G.wait(0.6);
            await say(STORY.rocketAfter);
            await fx('focus', null);
        });
    }
    // Stjärnfall i Stormens öga: on the summit where Molnet sat crying in the dark, stand quite still and a star falls
    // from Alva's stars (stillness, as the moonshine flowers taught). The first time Klo makes a wish, and keeps it secret.
    function starFall(dt) {
        const p = G.player;
        const still = F.has('ended') && F.has('alva_stars') && G.sceneId === 'topp' && G.areas.has('t-summit') && p.mode === 'ground'
            && Math.abs(p.vx) < 20 && !G.busy;
        stillOnTop = still ? stillOnTop + dt : 0;
        if (stillOnTop < 2.5 || G.time - starFellAt < 20) return;
        starFellAt = G.time; stillOnTop = 0;
        io.audio?.sfx?.('sparkle');
        if (done('starFall')) { fx('starFall', {}); return; }
        beat('starFall', async () => { await fx('starFall', {}); await say(STORY.starFall); });
    }
    // Svampen fnissar: after the story the forest's mushroom giggles and puffs glowing spores when it bounces you up
    // (each bounce lands on the branch above it, so there is no bouncing again and again: every bounce giggles).
    // The first time it is a new hypothesis.
    function mushroomGiggle() {
        if (!F.has('ended') || G.sceneId !== 'skog' || G.time - giggledAt < 4) return;
        giggledAt = G.time;
        for (let i = 0; i < 4; i++) io.audio?.sfx?.('pop', { delay: i * 0.11, gain: 0.45 - i * 0.06 }); // a little giggle
        if (done('mushroomGiggle')) { fx('giggle', {}); return; }
        beat('mushroomGiggle', async () => { await fx('giggle', {}); await say(STORY.mushroomGiggle); }, { lock: false });
    }
    // Molnet blixtrar av glädje: whinny under Molnet over the nest and it answers with a small flash, for joy now
    // ("När jag blixtrar blir det ljust en liten stund" was fear of the dark; the moon has made it brave)
    // Kakaolunden: the log is still a drum. Drum it and the cocoa tree drops another fruit; the first time Klo gives it to
    // Tukankrabban again, as on the day of P1 (they research together now, love scene 8). After that it just falls.
    function cocoaAgain() {
        if (done('cocoaAgain')) { fx('cocoaFall', {}); return; }
        beat('cocoaAgain', async () => {
            await fx('cocoaFall', {});
            await G.wait(0.3);
            if (G.actors.tukan) G.actors.tukan.pose = 'happy';
            await say(STORY.cocoaAgain);
            if (G.actors.tukan) G.actors.tukan.pose = 'idle';
        });
    }
    // Skatan copies a whinny beside her (magpies are mimics), then decides it does not suit her
    let mimicAt = -Infinity;
    function cloudJoy({ under }) {
        if (!F.has('moon') || !F.has('ended') || under || G.sceneId !== 'strand' || G.busy) return;
        const sk = G.actors.skata;
        if (sk?.visible && sk.scene === 'strand' && Math.abs(G.player.x - sk.x) < 1.4 * HL) {
            if (G.time - mimicAt < 6) return;
            mimicAt = G.time;
            fx('skataMimic', {});
            // she copies the whinny (a smaller, higher one from her branch); the first time she also decides it does not
            // suit her, after that she just keeps trying
            io.audio?.sfx?.('neigh', { gain: 0.32, delay: 0.55 });
            beat('skataMimic', () => say(STORY.skataMimic));
            return;
        }
        const sky = G.sceneDef.spots.cloudSky;
        if (Math.abs(G.player.x - sky.x) > 4 * HL || G.time - joyAt < 2.5) return;
        joyAt = G.time;
        io.audio?.sfx?.('sparkle', { delay: 0.6 });
        // the first time, the picture takes Molnet in (it hangs high over the nest, out of a walking view), flashes
        // and says why; after that it just flashes
        if (done('molnJoy')) { fx('cloudJoy', {}); return; }
        const box = [sky.x / HL - 2, sky.x / HL + 2, sky.y / HL - 1.4, G.player.y / HL + 0.3];
        beat('molnJoy', () => about(box, async () => { await G.wait(0.6); await fx('cloudJoy', {}); await G.wait(0.4); await say(STORY.molnJoy); }));
    }

    const offs = [
        G.on('neigh', cloudJoy),
        G.on('cocoaFall', cocoaAgain),
        G.on('egg', onEgg),
        G.on('enter', onEnter),
        G.on('scene', () => {
            G.hatchFollow = false; // the little researchers stay by their nest when the page turns
            rocketThisVisit = false;
            G.flag('visited_' + G.sceneId);
            setupActors();
            // a love scene skipped on the peak comes when they are home
            const n = eggsFound(G);
            if (G.sceneId !== 'topp') for (const k of [2, 4, 6, 8]) if (n >= k && !done('love' + k)) { onLove(k); break; }
            lightning();
        }),
        G.on('balk', (e) => {
            if (e.reason === 'thin') {
                if (!F.has('b:thinRule')) { G.flag('b:thinRule'); think(STORY.thinRule, { gap: 0 }); }
                else think(STORY.thinSlow, { gap: 3 });
            } else if (e.reason === 'runup') {
                if (!F.has('b:runupFirst')) { G.flag('b:runupFirst'); think(STORY.runupFirst, { gap: 0 }); }
                else think(STORY.runup, { gap: 3 });
            } else think(BALK[e.reason], { gap: 3 });
        }),
        G.on('streckDone', (e) => {
            if (e.flag === 'p2_bridge') beat('bridgeDone', () => say(STORY.bridgeDone));
            if (e.flag === 'k1_bridge') beat('k1Done', () => say(STORY.k1Done));
            if (e.flag === 't2_bridge') beat('t2Done', () => say(STORY.t2Done));
        }),
        G.on('bounce', () => { thinkOnce('bounce', STORY.bounce); mushroomGiggle(); }),
        G.on('drumSoft', ({ n }) => { if (n % 6 === 2) think(STORY.drumSoft, { gap: 6 }); }),
        G.on('seedsShy', () => think(STORY.seedsShy, { gap: 6 })),
        G.on('seedsWatched', () => think(STORY.seedsWatched, { gap: 20 })),
        G.on('drum', ({ n }) => { io.audio?.sfx?.('drum'); if (n === 4) think(STORY.drumHalf, { gap: 0 }); }),
        G.on('pushed', ({ id, from }) => {
            if (id === 'fors' && from < 0) think(STORY.forsPushed, { gap: 6 });
            else if (id === 'djuphalan-ring') think(STORY.whirl, { gap: 6 });
            else if (id === 'k-wall-rush' && from < 0) think(STORY.rush, { gap: 6 });
            else if (id === 'k-spring-fall') think(STORY.springFall, { gap: 6 });
        }),
        G.on('undertowIn', () => think(STORY.undertow, { gap: 20 })),
        G.on('pushWrong', () => think(STORY.pushWrong, { gap: 0 })),
        G.on('push', () => io.audio?.sfx?.('push')),
        // the camera keeps the ball in the picture as it rolls into the river and the river washes the egg free
        G.on('ballRoll', () => { think(STORY.ballRoll, { gap: 0 }); G.camLook = BALL_LOOK; }),
        G.on('ballWashed', () => {
            G.wait(2.5).then(() => { if (G.camLook === BALL_LOOK) G.camLook = null; });
            beat('washed', () => say(F.has('k3_ball') ? [STORY.washed[0], ...STORY.washedLate] : STORY.washed));
        }),
        G.on('seedsLit', () => beat('seedsLit', seedsLit)),
        G.on('coin', () => { io.audio?.sfx?.('coin'); beat('coin', () => say(F.has('b:magpie') ? STORY.coin : STORY.coinEarly)); }),
        G.on('trade', () => beat('trade', async () => {
            await fx('coinGive', {}); // the coin flies from the sköldhäst to Skatan's beak
            if (G.actors.skata) G.actors.skata.pose = 'coin';
            await say(STORY.trade.slice(0, 2));
            await fx('eggsDrop', { ids: ['e7'] });
            collectEgg(G, 'e7');
            if (!F.has('cloud_met')) { await say(STORY.trade.slice(2)); clue('cloudCries'); }
        })),
        G.on('land', (e) => {
            if (e.id === 'leap-p7') beat('leapDone', () => say(STORY.leapDone));
            if (e.id === 'wind-gap') beat('windCarried', async () => { G.setCheckpoint('gapEast'); stage(); await say(STORY.windCarried); });
        }),
        G.on('carried', () => thinkOnce('carried', STORY.carried)),
        G.on('tailHidden', () => think(STORY.tailHidden, { gap: 9 })),
        G.on('vine', () => think(STORY.vineDone, { gap: 0 })),
        G.on('crystalRing', () => thinkOnce('crystalRing', STORY.crystalRing)),
        G.on('crystalSoft', () => think(STORY.crystalSoft, { gap: 8 })),
        G.on('crystalWait', () => think(STORY.crystalWait, { gap: 6 })),
        G.on('crystalLit', ({ lit, of }) => think(lit < of ? STORY.crystalOne : STORY.crystalAll, { gap: 0, key: 'lit' + lit, force: lit === of })),
        G.on('loopBack', () => think(STORY.loopBack, { gap: 8 })),
        G.on('rescued', () => think(STORY.rescued, { gap: 2 })),
        G.on('throughWall', () => beat('throughWall', () => say(STORY.throughWall))),
        G.on('glitterRoll', () => think(STORY.glitterRoll, { gap: 0 })),
        G.on('glitterIn', () => think(STORY.glitterIn, { gap: 0 })),
        G.on('plateOn', ({ ready }) => { if (!ready) think(STORY.plateAlone, { gap: 6 }); }),
        G.on('plateOpen', () => beat('gateOpen', async () => {
            await fx('focus', { x: G.scenes.kristall.spots.gate.x + h(0.8), y: h(-1.2), zoom: 1, hold: 0.6 });
            await say(STORY.gateOpen);
            await fx('focus', null);
        })),
        G.on('gust', ({ state }) => { if (state === 'warn' && G.sceneId === 'topp' && G.areas.has('t-wind')) thinkOnce('gustSoon', STORY.gustSoon); }),
        G.on('blown', () => {
            if (!done('windKlo')) beat('windKlo', async () => { await say(STORY.windKlo); think(STORY.windTip, { force: true }); });
            else think(STORY.blown[blownLine++ % STORY.blown.length], { gap: 8, key: 'blown' });
            G.puz.blown = false;
        }),
        G.on('talk', ({ who }) => talk(who)),
        G.on('eggCount', () => { if (G.sceneId === 'strand' && G.areas.has('nest')) maybeFinale(); })
    ];

    return {
        start() {
            G.storm = stormLevel(F);
            G.flag('visited_' + G.sceneId);
            // a save closed between a promise and its egg: hand the egg over now
            if (F.has('coin_given') && !F.has('egg_e7')) collectEgg(G, 'e7');
            if (F.has('cloud_met') && !F.has('egg_e5')) collectEgg(G, 'e5');
            setupActors();
            if (!done('arrive')) arrive();
            if (F.has('cloud_met') && G.sceneId === 'topp' && !F.has('ended')) rideHome();
            else if (F.has('cloud_met') && eggsFound(G) >= EGG_TOTAL && !F.has('ended') && G.sceneId === 'strand') maybeFinale(true);
        },
        step(dt) {
            if (!current && queue.length) run(queue.shift());
            afterStory(dt);
            rocketWatch();
            if (!current) {
                follow(G.actors.klo, 1.7 * HL, 520, dt);
                follow(G.actors.tukan, 2.9 * HL, 600, dt);
            }
            for (const a of Object.values(G.actors)) {
                if (a.scene !== G.sceneId || !a.visible) continue;
                if (a.id === 'klo' || a.id === 'tukan') a.lookAt = G.player.x;
            }
            skataAside(dt);
        },
        running: () => !!current || queue.length > 0,
        objective,
        hint,
        notes,
        notebook,
        places,
        activePuzzle: () => activePuzzle()?.id || null,
        clues: () => CLUE_ORDER.filter(id => F.has('clue_' + id)).map(id => CLUES[id]),
        stormLevel: () => stormLevel(F),
        think,
        destroy() { for (const off of offs) off(); queue.length = 0; }
    };
}

export { PUZZLES, eggFlag, SECRETS, MEASURES };
