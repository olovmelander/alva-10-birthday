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
    { id: 'p3', scene: 'strand', areas: ['fors', 'cave'], solved: F => F.has('egg_e4') && F.has('egg_e5'), seen: 'b:fors' },
    { id: 'p4', scene: 'skog', areas: ['seeds', 'tunnel'], solved: F => F.has('egg_e9'), seen: 'b:seeds' },
    { id: 'p7', scene: 'skog', areas: ['hill', 'trunkTop'], solved: F => F.has('egg_e10'), seen: 'b:leapSeen' },
    { id: 'vine', scene: 'skog', areas: ['ledge'], solved: F => F.has('p7_vine'), needs: 'egg_e10' },
    { id: 'tree', scene: 'skog', areas: ['tree', 'crown'], solved: F => F.has('cloud_met') }
];
const EGG_PUZZLES = ['dig', 'p1', 'p5', 'coin', 'trade', 'p3', 'p2', 'p4', 'p7'];

/** The storm the view and audio draw: full until the cloud is met, softer after, gone with the moon. */
export function stormLevel(flags) { return flags.has('moon') ? 0 : flags.has('cloud_met') ? 0.55 : 1; }

export function createStory(G, io) {
    const queue = [];
    let current = null, thoughtAt = -10;
    const hintLevel = new Map();
    const said = new Map();
    let eggLine = 0;

    const F = G.flags;
    const done = (id) => F.has('b:' + id);
    const ui = () => io.ui;
    const say = async (lines) => { if (lines?.length) await ui().say(lines); };
    const fx = async (name, data) => { try { return await io.fx?.(name, data); } catch (err) { console.warn('fx', name, err); return null; } };
    const clue = (id) => { if (!F.has('clue_' + id)) { G.flag('clue_' + id); G.emit('clue', { id }); } };

    function think(text, { gap = 2.2, key = text } = {}) {
        if (!text) return;
        const last = said.get(key) ?? -Infinity;
        if (G.time - last < gap || G.time - thoughtAt < 0.8) return;
        said.set(key, G.time); thoughtAt = G.time;
        if (io.ui.think) io.ui.think(text); else io.ui.toast?.(text);
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
    function setupActors() {
        const sc = G.sceneId, sp = G.sceneDef.spots;
        for (const who of ['klo', 'tukan']) {
            const a = actor(who, { follow: F.has('b:arrive') || who === 'tukan' });
            if (a.scene !== sc) {
                a.visible = true;
                const off = who === 'klo' ? 1.6 : 2.8;
                if (!place(a, G.player.x - G.player.facing * off * HL) && !place(a, G.player.x + G.player.facing * off * HL)) {
                    const spot = sc === 'strand' ? (who === 'klo' ? sp.kloNest : sp.tukanNest) : (who === 'klo' ? sp.kloArrive : sp.tukanArrive);
                    a.x = spot.x; a.y = spot.y; a.scene = sc;
                }
            }
        }
        if (sc === 'strand') {
            actor('skata', { scene: 'strand', x: sp.magpie.x + 0.5 * HL, y: sp.magpie.y, visible: true, facing: -1, pose: F.has('coin_given') ? 'coin' : 'idle' });
            actor('dyvel', { scene: 'strand', x: sp.beetle.x, y: sp.beetle.y, visible: true, facing: -1 });
        }
        const moln = actor('moln', { visible: true });
        if (F.has('moon')) Object.assign(moln, { scene: 'strand', x: G.scenes.strand.spots.cloudSky.x, y: G.scenes.strand.spots.cloudSky.y, pose: 'happy' });
        else Object.assign(moln, { scene: 'skog', x: G.scenes.skog.spots.cloud.x, y: G.scenes.skog.spots.cloud.y, pose: F.has('cloud_met') ? 'hope' : 'sad' });
    }
    function follow(a, offset, speed, dt) {
        if (!a?.visible || !a.follow || a.staged) return;
        const p = G.player;
        if (a.scene !== G.sceneId) { place(a, p.x - p.facing * offset); return; }
        const want = p.x - p.facing * offset;
        const far = Math.hypot(want - a.x, p.y - a.y);
        if (far > 16 * HL && p.mode === 'ground') { place(a, want, p.y); return; }
        const dist = Math.abs(want - a.x);
        if (dist < 0.35 * HL) { a.vx = 0; return; }
        const dir = Math.sign(want - a.x);
        const nx = a.x + dir * Math.min(dist, speed * dt * (dist > 4 * HL ? 2.4 : 1));
        const gy = groundAt(nx, a.y);
        if (gy === null || Math.abs(gy - a.y) > 0.5 * HL) { a.vx = 0; return; }
        a.distance += Math.abs(nx - a.x);
        a.vx = (nx - a.x) / dt; a.x = nx; a.y = gy; a.facing = dir;
    }

    // --------------------------------------------------------------------------
    // help: which puzzle we are at, and its next hint
    // --------------------------------------------------------------------------
    function available(pz) { return !pz.needs || F.has(pz.needs); }
    function activePuzzle() {
        const open = PUZZLES.filter(pz => !pz.solved(F) && available(pz));
        const here = open.find(pz => pz.scene === G.sceneId && pz.areas.some(a => G.areas.has(a)) && (!pz.seen || F.has(pz.seen)));
        if (here) return here;
        return null;
    }
    function nextEggPuzzle() {
        return EGG_PUZZLES.map(id => PUZZLES.find(p => p.id === id)).find(pz => !pz.solved(F) && available(pz)
            && !(pz.id === 'p2' && F.has('egg_e3'))) || null;
    }
    function hint(who = 'klo') {
        const pz = activePuzzle();
        if (pz) {
            const n = Math.min(2, hintLevel.get(pz.id) || 0);
            hintLevel.set(pz.id, n + 1);
            return { puzzle: pz.id, level: n, text: HINTS[pz.id][n] };
        }
        if (eggsFound(G) >= EGG_TOTAL || F.has('ended')) {
            if (F.has('ended')) return { puzzle: null, text: null };
            const id = F.has('cloud_met') ? 'nest' : 'tree';
            const n = Math.min(2, hintLevel.get(id) || 0); hintLevel.set(id, n + 1);
            return { puzzle: id, level: n, text: HINTS[id][n] };
        }
        const next = nextEggPuzzle();
        if (next) return { puzzle: next.id, level: 0, text: NEXT_EGG(WHERE[next.id]) };
        const more = Math.min(2, hintLevel.get('more') || 0); hintLevel.set('more', more + 1);
        return { puzzle: 'more', level: more, text: HINTS.more[more] };
    }
    let chatter = 0;
    function talk(who) {
        if (who === 'skata') return beat('skataTalk', () => say(STORY.skataTalk), { once: false });
        if (who === 'dyvel') return beat('dyvelTalk', () => say(F.has('p5_washed') ? STORY.beetleAfter : STORY.beetleTalk), { once: false });
        const h = hint(who);
        const text = h.text || CHATTER[who][chatter++ % CHATTER[who].length];
        beat('talk', () => say([[who, text]]), { once: false });
    }

    function objective() {
        const n = eggsFound(G);
        if (!F.has('b:arrive')) return null;
        if (F.has('ended')) return { id: 'free', text: GOALS.free, why: GOALS.freeWhy };
        if (n < EGG_TOTAL) return F.has('cloud_met')
            ? { id: 'eggs', text: GOALS.lastEggs(n, EGG_TOTAL), why: GOALS.lastWhy }
            : { id: 'eggs', text: GOALS.eggs(n, EGG_TOTAL), why: GOALS.eggsWhy };
        if (!F.has('cloud_met')) return { id: 'tree', text: GOALS.tree, why: GOALS.treeWhy };
        return { id: 'nest', text: GOALS.nest, why: GOALS.nestWhy };
    }

    // --------------------------------------------------------------------------
    // beats
    // --------------------------------------------------------------------------
    function arrive() {
        beat('arrive', async () => {
            const sp = G.scenes.strand.spots;
            actor('tukan', { scene: 'strand', x: sp.tukanNest.x, y: sp.tukanNest.y, visible: true, facing: 1, pose: 'dig', follow: false });
            actor('klo', { scene: 'strand', x: sp.kloNest.x + 1.4 * HL, y: sp.kloNest.y, visible: true, facing: -1, follow: false });
            await fx('focus', { x: sp.nest.x, y: sp.nest.y, zoom: 1.15 });
            await say(STORY.arrive);
            G.actors.klo.pose = 'love';
            await say(STORY.arrive2);
            G.actors.klo.pose = 'idle'; G.actors.tukan.pose = 'happy';
            await say(STORY.claws);
            await say(STORY.alvaHello);
            G.actors.tukan.pose = 'idle';
            await say(STORY.arrive3);
            clue('moonRule'); clue('noMoon');
            G.actors.klo.follow = true; G.actors.tukan.follow = true;
            await fx('focus', { x: G.scenes.strand.eggs[0].x, y: G.scenes.strand.eggs[0].y, zoom: 1.1, hold: 0.6 });
            await say(STORY.digSeen);
            await fx('focus', null);
        });
    }

    function onEgg({ id, n }) {
        io.audio?.sfx?.('egg');
        ui().toast?.(WORDS.eggToast(n, EGG_TOTAL));
        G.emit('eggCount', { n });
        if (id === 'e2') beat('fallen', () => say(STORY.fallen));
        if ((id === 'e4' || id === 'e5') && F.has('egg_e4') && F.has('egg_e5')) beat('caveEggs', () => say(STORY.caveEggs));
        if (id === 'e7') beat('tradeThanks', () => say(STORY.tradeThanks));
        if (n === 1) beat('firstEgg', async () => { await say(STORY.firstEgg); await say(STORY.alvaFirstEgg); });
        else if (!['e2', 'e4', 'e5', 'e7', 'e8'].includes(id)) think(STORY.eggLines[eggLine++ % STORY.eggLines.length], { gap: 0 });
        if (STORY.love[n]) beat('love' + n, async () => {
            if (G.actors.klo) G.actors.klo.pose = 'love';
            await say(STORY.love[n]);
            if (n === 8) await say(STORY.alvaLove);
            if (G.actors.klo) G.actors.klo.pose = 'idle';
        });
        if (n === 3) beat('lightning', async () => { await fx('lightning', {}); await say(STORY.lightning); clue('lightning'); });
        if (n === EGG_TOTAL) beat('allEggs', async () => {
            await say(STORY.allEggs);
            await say(F.has('cloud_met') ? STORY.allEggsCloud : STORY.allEggsNoCloud);
        });
        io.save?.();
    }

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
            if (intro && id === 'klyft' && !F.has('p2_bridge')) beat('klyft', () => say(STORY.klyft));
            if (intro && id === 'fors' && !(F.has('egg_e4') && F.has('egg_e5'))) beat('fors', async () => {
                await fx('focus', { x: G.scenes.strand.spots.cave.x - 2 * HL, y: -0.6 * HL, zoom: 0.95, hold: 0.5 });
                await say(STORY.fors);
                await fx('focus', null);
            });
            if (intro && id === 'beetle' && !F.has('p5_rolled') && !F.has('egg_e6')) beat('beetle', async () => {
                await say(STORY.beetle);
                await say(STORY.beetle2);
            });
            if (intro && id === 'magtree' && !F.has('coin_given')) beat('magpie', async () => {
                await fx('focus', { x: G.scenes.strand.magpie.x, y: G.scenes.strand.magpie.y + 0.6 * HL, zoom: 1.05, hold: 0.4 });
                await say(STORY.magpie);
                if (!F.has('coin_got')) await say(STORY.magpie2);
                await fx('focus', null);
            });
            if (id === 'magtree' && F.has('coin_got') && !F.has('coin_given')) beat('climb', () => say(STORY.climb));
            if (id === 'nest') maybeFinale();
        } else {
            if (id === 'arrive') G.setCheckpoint('skog');
            if (id === 'ledge') G.setCheckpoint('ledge');
            if (intro && id === 'seeds' && !F.has('p4_lit')) beat('seeds', async () => { await say(STORY.seeds); clue('darkStorm'); });
            if (intro && (id === 'hill' || id === 'trunkTop') && !F.has('egg_e10')) beat('leapSeen', async () => {
                await fx('focus', { x: G.scenes.skog.eggs[2].x, y: G.scenes.skog.eggs[2].y - 0.5 * HL, zoom: 0.85, hold: 0.6 });
                await say(STORY.leapSeen);
                await fx('focus', null);
            });
            if (id === 'ledge' && F.has('egg_e10') && !F.has('p7_vine')) beat('vineAsk', () => say(STORY.vineAsk));
            if (intro && id === 'tree' && !F.has('cloud_met')) beat('tree', () => say(F.has('clue_cloudCries') ? STORY.treeCloud : STORY.tree));
            if (id === 'crown') { G.setCheckpoint('crown'); crown(); }
        }
    }

    function crown() {
        if (!F.has('cloud_met')) beat('crown', async () => {
            const sp = G.scenes.skog.spots;
            await fx('focus', { x: sp.cloud.x + 0.6 * HL, y: sp.cloud.y + 1.2 * HL, zoom: 1.1, hold: 0.4 });
            await say(STORY.crown);
            G.actors.moln.pose = 'hope';
            await say(STORY.crown2);
            await say(STORY.crown3);
            G.flag('cloud_met'); G.storm = stormLevel(F);
            clue('afraid');
            await fx('focus', null);
        });
        if (F.has('cloud_met') || queue.some(q => q.id === 'crown')) beat('crownAfter', async () => {
            if (eggsFound(G) < EGG_TOTAL) { await say(STORY.crownWait); return; }
            await say(STORY.crownGo);
            await fx('cloudRide', {});
            G.goto('strand', 'start');
            G.setCheckpoint('nest');
            setupActors();
            maybeFinale(true);
        }, { once: false });
    }

    function maybeFinale(force = false) {
        if (F.has('ended') || !F.has('cloud_met') || eggsFound(G) < EGG_TOTAL) return;
        if (!force && !G.areas.has('nest')) return;
        beat('finale', finale);
    }

    async function finale() {
        const sp = G.scenes.strand.spots;
        G.player.vx = 0;
        await fx('focus', { x: sp.nest.x, y: sp.nest.y - 0.6 * HL, zoom: 1.1 });
        await say(STORY.finale);
        await fx('eggsToNest', {});
        G.flag('eggs_in_nest');
        Object.assign(G.actors.moln, { scene: 'strand', x: sp.cloudSky.x, y: sp.cloudSky.y, pose: 'hope', visible: true });
        await fx('cloudArrive', {});
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
        ui().caption?.(STORY.moonCaption, 3200);
        await fx('hatch', {});
        G.flag('hatched');
        await say(STORY.hatch);
        ui().caption?.(STORY.watchCaption, 2600);
        await fx('gift', {});
        G.flag('watch_given');
        await say(STORY.gift);
        if (G.actors.klo) G.actors.klo.pose = 'faint';
        await say(STORY.faint);
        G.flag('ended');
        G.setCheckpoint('nest');
        io.save?.({ ended: true });
        await fx('epilogue', {});
        if (G.actors.klo) G.actors.klo.pose = 'idle';
        await fx('ending', {});
        await say(STORY.after);
        await fx('focus', null);
    }

    // --------------------------------------------------------------------------
    // wiring
    // --------------------------------------------------------------------------
    const offs = [
        G.on('egg', onEgg),
        G.on('enter', onEnter),
        G.on('scene', () => { setupActors(); if (G.sceneId === 'skog' && done('arrive')) beat('skogArrive', async () => {
            await fx('caption', { text: WORDS.pages.skog });
            if (!F.has('egg_e3')) await say(STORY.skogArrive);
        }); }),
        G.on('balk', (e) => {
            if (e.reason === 'thin') {
                if (!F.has('b:thinRule')) { G.flag('b:thinRule'); think(STORY.thinRule, { gap: 0 }); }
                else think(STORY.thinSlow, { gap: 3 });
            } else if (e.reason === 'runup') {
                if (!F.has('b:runupFirst')) { G.flag('b:runupFirst'); think(STORY.runupFirst, { gap: 0 }); }
                else think(STORY.runup, { gap: 3 });
            } else think(BALK[e.reason], { gap: 3 });
        }),
        G.on('streckDone', (e) => { if (e.flag === 'p2_bridge') beat('bridgeDone', () => say(STORY.bridgeDone)); }),
        G.on('drumSoft', ({ n }) => { if (n === 2) think(STORY.drumSoft, { gap: 6 }); }),
        G.on('drum', ({ n }) => { io.audio?.sfx?.('drum'); if (n === 4) think(STORY.drumHalf, { gap: 0 }); }),
        G.on('pushed', ({ id, from }) => { if (id !== 'fors' || from < 0) think(id === 'fors' ? STORY.forsPushed : STORY.whirl, { gap: 6 }); }),
        G.on('undertowIn', () => think(STORY.undertow, { gap: 20 })),
        G.on('pushWrong', () => think(STORY.pushWrong, { gap: 0 })),
        G.on('push', () => io.audio?.sfx?.('push')),
        G.on('ballRoll', () => think(STORY.ballRoll, { gap: 0 })),
        G.on('ballWashed', () => beat('washed', () => say(STORY.washed))),
        G.on('seedsLit', () => beat('seedsLit', async () => { await say(STORY.seedsLit); await say(STORY.alvaSeeds); })),
        G.on('coin', () => { io.audio?.sfx?.('coin'); beat('coin', () => say(STORY.coin)); }),
        G.on('trade', () => beat('trade', async () => {
            if (G.actors.skata) G.actors.skata.pose = 'coin';
            await say(STORY.trade.slice(0, 2));
            await fx('eggsDrop', { ids: ['e7', 'e8'] });
            collectEgg(G, 'e7'); collectEgg(G, 'e8');
            await say(STORY.trade.slice(2));
            clue('cloudCries');
        })),
        G.on('land', (e) => { if (e.id === 'leap-p7') beat('leapDone', () => say(STORY.leapDone)); }),
        G.on('vine', () => think(STORY.vineDone, { gap: 0 })),
        G.on('talk', ({ who }) => talk(who)),
        G.on('eggCount', () => { if (G.sceneId === 'strand' && G.areas.has('nest')) maybeFinale(); })
    ];

    return {
        start() {
            G.storm = stormLevel(F);
            setupActors();
            if (!done('arrive')) arrive();
            else for (const a of G.areas) onEnter({ id: a });
            if (F.has('cloud_met') && eggsFound(G) >= EGG_TOTAL && !F.has('ended')) {
                if (G.sceneId === 'strand') maybeFinale(true);
            }
        },
        step(dt) {
            const sp = G.sceneDef;
            if (!current && queue.length) run(queue.shift());
            if (!current) {
                follow(G.actors.klo, 1.7 * HL, 520, dt);
                follow(G.actors.tukan, 2.9 * HL, 600, dt);
            }
            for (const a of Object.values(G.actors)) {
                if (a.scene !== G.sceneId || !a.visible) continue;
                if (a.id === 'klo' || a.id === 'tukan') a.lookAt = G.player.x;
            }
            void sp;
        },
        running: () => !!current || queue.length > 0,
        objective,
        hint,
        activePuzzle: () => activePuzzle()?.id || null,
        clues: () => CLUE_ORDER.filter(id => F.has('clue_' + id)).map(id => CLUES[id]),
        stormLevel: () => stormLevel(F),
        think,
        destroy() { for (const off of offs) off(); queue.length = 0; }
    };
}

export { PUZZLES, eggFlag };
