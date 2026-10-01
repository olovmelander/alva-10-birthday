/*
 * Sköldhästen – the story director.
 *
 * Beats are small async scripts that run one at a time. A beat starts when its
 * `when(G)` becomes true (checked every step while nothing else runs) or when
 * a game event it listens to (`on`) arrives. Finished beats are remembered as
 * flags `b:<id>` so they survive saving.
 *
 * io (from main.mjs): { ui, fx, audio, save }
 *   ui.say(lines) → Promise, ui.choice(labels) → Promise<index>, ui.toast(text),
 *   ui.pulse(which), ui.report(n) → Promise, ui.draw(opts) → Promise (Alva's pencil)
 *   fx(name, data) → Promise (view effects: crease, freeze, plask, unfold, …)
 *   audio.* (see audio.mjs), save()
 */
import { HL } from './sim.mjs';
import { beginKloWalk, stepKloWalk, createKloReactions } from './klo.mjs';
import { p8Progress } from './puzzles.mjs';
import { SHORE_PATCH } from './shore-trial.mjs';
import { describeGuidance, controlTip } from './guidance-state.mjs';
import { describeKloHelp } from './klo-help.mjs';
import { STORY, HINTS, JOURNAL, BALK, HER_TEXT, FAMILY, UI, KLO_JOKES, KLO_COMPANION, CONTEXT_LABELS } from './content/sv.mjs';

const h = (v) => v * HL;

export function createStory(G, io) {
    const F = G.flags;
    const pencilFlags = Object.values(G.scenes).flatMap(sc => (sc.pencils || []).map(pc => 'penna_' + pc.id));
    const beats = [];
    let running = null;
    const queue = [];
    const hintState = { key: null, t: 0, level: 0, said: 0, reminded: false };
    const guided = () => G.helpLevel === 'guided';
    const discovery = (full, observation) => guided() ? full : KLO_COMPANION.story[observation];
    const landLook = async (s, id, inspect, frame) => {
        const before = G.worldInspection, hold = { player: G.player };
        G.worldInspection = hold;
        try {
            if (!io.fx) return await inspect();
            let shown = false;
            await s.fx('landFocus', { id, frame, whileVisible: async () => { shown = true; await inspect(); } });
            if (!shown) await inspect(); // logic-only clients retain the same required story
        } finally {
            if (G.worldInspection === hold) G.worldInspection = before;
        }
    };

    // --- actors -------------------------------------------------------------------
    G.actors.klo = { id: 'klo', scene: null, x: 0, y: 0, pose: 'idle', facing: -1, visible: false, pop: 0, walk: null, holding: null };
    G.actors.kv = { id: 'kv', scene: null, x: 0, y: 0, pose: 'stand', facing: -1, visible: false, walk: null };
    G.actors.figure = { id: 'figure', scene: null, x: 0, y: 0, pose: 'kv-walk-1', facing: 1, visible: false, walk: null };
    G.actors.signe = { id: 'signe', scene: null, x: 0, y: 0, pose: 'idle', facing: -1, visible: false, walk: null, speed: 0, walkPhase: 0 };
    let lastTaste = 'grass';
    G.on('taste', (e) => { lastTaste = e.kind; });

    const reactions = createKloReactions(KLO_JOKES);
    const say = async (lines) => {
        const list = Array.isArray(lines[0]) ? lines : [lines];
        const onSpeaker = who => { for (const id of ['klo', 'kv']) G.actors[id].talking = who === id; };
        onSpeaker(list.find(([, text]) => text)?.[0]);
        try { return await io.ui.say(list, { onSpeaker }); }
        finally { onSpeaker(null); }
    };
    function tapKlo({ visible = false } = {}) {
        const actor = G.actors.klo;
        const reaction = reactions.tap({ actor, time: G.time, scene: G.sceneId, visible,
            busy: G.busy || io.ui.panelOpen?.(), running: !!running, dialogue: io.ui.dialogueOpen?.() });
        if (!reaction) return false;
        actor.reactAt = G.time;
        actor.talkUntil = G.time + Math.min(3.8, 1.2 + reaction.line.length / 34);
        actor.facing = Math.sign(G.player.x - actor.x) || actor.facing;
        io.audio?.sfx('crabclick');
        io.guide?.hint(reaction.line, 'klo', 5200);
        G.emit('kloTap', { count: reaction.count, line: reaction.line });
        return true;
    }
    const api = {
        G, F,
        say,
        choice: (labels) => io.ui.choice(labels),
        wait: (s) => G.wait(s),
        flag: (f) => G.flag(f),
        has: (f) => F.has(f),
        async fx(name, data) {
            if (!['vista', 'foldDemo', 'mapAssemble', 'landFocus'].includes(name)) return io.fx(name, data || {});
            const controlsOn = !io.ui.controls?.classList.contains('off');
            const inspectionBefore = G.worldInspection;
            const vistaHold = name === 'vista' ? { player: G.player } : null;
            if (vistaHold) G.worldInspection = vistaHold;
            io.ui.showControls?.(false);
            try { return await io.fx(name, data || {}); }
            finally {
                if (vistaHold && G.worldInspection === vistaHold) G.worldInspection = inspectionBefore;
                io.ui.showControls?.(controlsOn);
            }
        },
        async map(data, explain) {
            let shown = false;
            const present = async (demo) => {
                shown = true;
                await demo?.arrive?.();
                await explain(demo);
                await demo?.depart?.();
            };
            await api.fx('mapAssemble', { ...data, whileVisible: present });
            if (!shown) await present(null); // logic clients retain every explanation
        },
        sfx: (n, o) => io.audio?.sfx(n, o),
        stinger: (n) => io.audio?.stinger(n),
        cam(opts) { G.camHint = { ...opts, t0: G.time }; return G.wait(opts.hold ?? opts.t ?? 1); },
        camFree() { G.camHint = null; },
        klo(props) { Object.assign(G.actors.klo, props); },
        async appear(id, props) {
            const a = G.actors[id];
            Object.assign(a, props, { visible: true, scene: props.scene || G.sceneId, pop: 1 });
            io.audio?.sfx(id === 'klo' ? 'crabclick' : 'rustle');
            await G.wait(0.4);
        },
        vanish(id) { G.actors[id].visible = false; },
        walk(id, x, speed = 260) {
            const a = G.actors[id];
            a.facing = Math.sign(x - a.x) || a.facing;
            return new Promise((resolve) => {
                if (id === 'klo') beginKloWalk(a, x, speed, resolve);
                else a.walk = { x, speed, resolve };
            });
        },
        clue(key, { quiet = false } = {}) {
            if (F.has('clue_' + key)) return;
            G.flag('clue_' + key);
            io.ui.toast(quiet ? JOURNAL.clueSaved : JOURNAL.clues + ': ' + short(JOURNAL.clueText[key]));
        },
        experiment(id, sign, { quiet = false } = {}) {
            if (F.has('exp_' + id + '_logged')) return;
            G.flag('exp_' + id); G.flag('exp_' + id + '_logged');
            G.puz.tally += sign === 'hast' ? 1 : -1;
            if (quiet) return;
            G.actors.klo.holding = sign === 'hast' ? 'sign-hast' : 'sign-skoldpadda';
            G.later(2.5, () => { G.actors.klo.holding = null; });
            io.ui.toast(JOURNAL.measurements + ': ' + short(JOURNAL.experiments[id]));
            io.audio?.sfx('write');
        },
        checkpoint(name) { G.setCheckpoint(name); io.save(); },
        /** A side remark that does not stop play: Klo's bubble, or the sköldhäst's own thought. */
        remark(lines) {
            const list = Array.isArray(lines[0]) ? lines : [lines];
            if (!io.guide) return say(list); // (the robot has no guide)
            // A question and answer need real turns, in their authored order.
            // Use the familiar, player-paced paper card for an exchange; single
            // passing comments still leave swimming and galloping uninterrupted.
            if (new Set(list.map(([who]) => who)).size > 1) {
                io.guide.clear?.();
                return say(list);
            }
            const own = list.filter(([who]) => who === 'horse').map(([, t]) => t).join(' ');
            const said = list.filter(([who]) => who !== 'horse');
            if (said.length) io.guide.hint(said.map(([, t]) => t).join(' '), said[0][0], 5500 + 1500 * said.length);
            if (own) io.guide.think(own, Math.max(4000, 1800 + own.length * 65));
            return G.wait(0.2);
        },
        report: (n) => io.ui.report(n)
    };
    function short(t) { return t && t.length > 70 ? t.slice(0, 67) + '…' : t; }

    function beat(id, def) { beats.push({ id, ...def }); }
    const done = (id) => F.has('b:' + id);
    const inScene = (s) => G.sceneId === s;
    const inArea = (a) => G.areas.has(a);
    const P = () => G.player;

    // Actors are presentation of committed story state, not saved objects. A
    // one-time introduction must not make its character disappear on reload.
    // Authored transitions during a beat retain full control of their staging.
    function restoreActors() {
        if (!G.sceneDef || running) return;
        const sc = G.sceneDef, p = P(), klo = G.actors.klo, kv = G.actors.kv, sg = G.actors.signe;
        const place = (actor, at, extra = {}) => Object.assign(actor, at, {
            scene: sc.id, visible: true, walk: null, pose: 'idle', inHole: false,
            holding: null, talking: false, speed: 0, ...extra
        });
        if (sc.id === 'land') {
            if (F.has('b:k1_enter') || F.has('klo_hidden') || F.has('ended')) {
                let at = sc.spots.kloBeach;
                if (F.has('klo_hidden') && !F.has('klo_ja')) {
                    place(klo, sc.spots.kloHole, { pose: 'peek', inHole: true });
                } else {
                    if (p.x < h(13) && F.has('p4_leap')) at = sc.spots.kloUdden;
                    else if (p.x < h(38.5) && F.has('p3_done')) at = sc.spots.kloLedge;
                    else if (p.x < h(65) && F.has('b:k1_branten')) at = sc.spots.kloBranten;
                    else if (p.x < h(94) && F.has('note1_read')) at = sc.spots.kloNote;
                    place(klo, at, { facing: Math.sign(p.x - at.x) || -1 });
                }
            }
            if (F.has('ended') && F.has('signe_met')) {
                place(sg, sc.race.signe, { facing: -1, racing: false });
                groundSigne();
            }
        } else if (sc.id === 'kelp' && (F.has('kelp_entered') || F.has('ch2_open'))) {
            place(klo, p.x > h(20) ? sc.spots.kloTrench : sc.spots.klo, { facing: 1 });
        } else if (sc.id === 'viken') {
            if (F.has('viken_arrived')) place(klo, p.x < h(3) ? sc.spots.kloShore : sc.spots.klo, { facing: -1 });
            if (F.has('kv_met')) {
                place(kv, sc.spots.kvPier, { pose: F.has('talk1') && !F.has('talk_done') ? 'point' : 'stand',
                    facing: -1, map: F.has('talk1') ? 'open' : 'closed' });
                if (F.has('talk2') && !F.has('talk_done')) place(klo, { x: kv.x - h(0.5), y: kv.y - h(0.45) }, { pose: 'point', facing: 1 });
            }
        }
    }
    G.on('scene', restoreActors);

    // =========================================================================
    // KAPITEL 1
    // =========================================================================
    beat('k1_enter', {
        when: () => inScene('land') && F.has('intro_done') && !F.has('ended') && !done('k1_enter'),
        lock: false,
        async run(s) {
            const klo = G.actors.klo, beach = G.sceneDef.spots.kloBeach;
            if (klo.visible && klo.scene === 'land') {
                // The prologue hands over the same crab. Let him scuttle into
                // position while controls and the original lesson timing run.
                klo.pose = 'stopwatch';
                s.walk('klo', beach.x, 430);
            } else {
                // Saves and the robot may begin after the table has closed.
                s.appear('klo', { scene: 'land', x: beach.x, y: beach.y, pose: 'stopwatch', facing: 1 });
            }
            s.checkpoint('start');
            await s.wait(1.2);
            tipOnce('gallop');
            await s.wait(2.0);
            if (!F.has('klo_hidden')) hintOnce('enter', STORY.k1.enterHint);
        }
    });

    beat('k1_stopwatch', {
        when: () => inScene('land') && done('k1_enter') && G.stats.gallopTime > 1.1 && Math.abs(P().x - G.actors.klo.x) < h(9),
        async run(s) {
            G.actors.klo.pose = 'stopwatch';
            s.sfx('stopwatch');
            await s.cam({ x: (P().x + G.actors.klo.x) / 2, y: P().y - h(0.8), zoom: 1.05, t: 0.6, hold: 0.6 });
            await s.say(STORY.k1.stopwatch);
            s.experiment('fart', 'hast');
            // the sköldhäst stamps, the crab dives into its hole
            G.player.action = 'stamp'; G.player.actionT = 0; G.player.actionDur = 0.6;
            s.sfx('stamp');
            await s.wait(0.35);
            const hole = G.sceneDef.spots.kloHole;
            await s.walk('klo', hole.x, 430);
            G.actors.klo.y = hole.y; G.actors.klo.pose = 'peek'; G.actors.klo.inHole = true;
            s.sfx('crabclick');
            await s.wait(0.32);
            s.camFree();
            G.flag('klo_hidden');
            tipOnce('hide');
            hintOnce('hole', STORY.k1.holeHint);
        }
    });

    // Göm dig: the crab comes out only for a hidden shell
    let nearHoleT = 0;
    beat('k1_hide_nudge', {
        when: () => {
            if (!guided() || !inScene('land') || !F.has('klo_hidden') || F.has('klo_ja') || G.player.hidden) { nearHoleT = 0; return false; }
            const near = Math.abs(P().x - G.sceneDef.spots.kloHole.x) < h(3) && Math.abs(P().vx) < 40;
            nearHoleT = near ? nearHoleT + 1 / 120 : 0;
            return nearHoleT > 4;
        },
        lock: false,
        async run(s) {
            // Klo's eyes peek out at the shell, and Göm dig pulses once (no text)
            G.actors.klo.inHole = true; G.actors.klo.pose = 'peek';
            s.sfx('crabclick');
            io.ui.pulse?.('hide');
        }
    });
    beat('k1_ja', {
        when: () => inScene('land') && F.has('klo_hidden') && G.player.hidden && G.player.hide > 0.95 && Math.abs(P().x - G.sceneDef.spots.kloHole.x) < h(3),
        async run(s) {
            await s.wait(1.2);
            G.actors.klo.inHole = false; G.actors.klo.pose = 'signs';
            s.sfx('crabclick');
            await s.wait(0.5);
            await s.say(STORY.k1.ja);
            G.flag('klo_ja');
            G.actors.klo.pose = 'idle';
        }
    });

    beat('k1_mapcorner', {
        when: () => inScene('land') && F.has('klo_ja') && !G.player.hidden,
        async run(s) {
            const player = G.player, scene = G.sceneId, klo = G.actors.klo;
            const { kloHole: besideShell, kloBeach: beach } = G.sceneDef.spots;
            const shell = G.sceneDef.shells.find(item => item.id === 'sh1');
            const beforePose = klo.pose, stillHere = () => G.player === player && G.sceneId === scene;
            let ownNudge = null, ownWalk = null;
            const clearNudge = () => { if (ownNudge && player.nudge === ownNudge) player.nudge = null; };
            try {
                // A small real step gives the pink shell room to rise. Keep
                // players already clear of it where they chose to stand.
                if (player.mode === 'ground' && !player.nudge && Math.abs(player.x - shell.x) < h(.85)) {
                    ownNudge = { x: besideShell.x, t: 2 };
                    player.nudge = ownNudge;
                }
                if (klo.scene === scene && Math.abs(klo.x - beach.x) > 6) {
                    void s.walk('klo', beach.x, 430);
                    ownWalk = klo.walk;
                }
                while (stillHere() && ((ownNudge && (player.nudge === ownNudge || Math.abs(player.vx) > 1)) || (ownWalk && klo.walk === ownWalk))) await s.wait(.05);
                if (!stillHere()) {
                    clearNudge();
                    if (ownWalk && klo.walk === ownWalk) klo.walk = null;
                    await new Promise(() => {}); // an abandoned scene must not finish this discovery
                }
                if (ownNudge && player.mode === 'ground' && !player.hidden) player.facing = -1;
                klo.pose = 'map-corner';
                await s.say(STORY.k1.mapCorner[0]);
                let shown = false;
                const demonstrate = async (demo) => {
                    shown = true;
                    await demo?.arrive?.();
                    // Each completed pose holds while Alva reads. The same pink
                    // shell is visible on the map and on the beach throughout.
                    await s.say(STORY.k1.mapCorner[1]);
                    await s.say(STORY.k1.mapCorner[2]);
                    await demo?.fold?.();
                    await s.say(STORY.k1.mapCorner[3]);
                    await demo?.unfold?.();
                    await s.say(STORY.k1.mapCorner.slice(4));
                    await demo?.depart?.();
                };
                await s.fx('foldDemo', {
                    x: G.sceneDef.spots.kloBeach.x - h(1.6), y: G.sceneDef.spots.kloBeach.y,
                    whileVisible: demonstrate
                });
                if (!shown) await demonstrate(null); // logic clients keep the same story
            } finally {
                clearNudge();
                if (stillHere()) klo.pose = beforePose;
            }
            s.clue('map_corner');
            G.flag('rule_demo');
            hintOnce('mapPurpose', STORY.k1.mapPurpose);
        }
    });

    beat('k1_clouds', {
        when: () => inScene('land') && F.has('rule_demo') && G.sceneTime > 6 && P().x < h(100) && P().x > h(84) && !done('k1_clouds'),
        lock: false,
        async run(s) { await s.remark(STORY.k1.clouds); }
    });

    beat('k1_note', {
        when: () => inScene('land') && inArea('note1'),
        async run(s) {
            await s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloNote.x + h(0.6), y: G.sceneDef.spots.kloNote.y, pose: 'idle', facing: -1 });
            const mapSearch = F.has('ch2_open');
            await landLook(s, 'bridge', () => s.say([STORY.k1.note1, ...(guided()
                ? mapSearch ? STORY.k1.noteMap : STORY.k1.noteKlo
                : [mapSearch ? KLO_COMPANION.story.noteMap : KLO_COMPANION.story.note])]));
            s.clue('note1');
            G.flag('note1_read');
        }
    });
    beat('k1_note2', {
        on: 'balk', filter: (e) => guided() && e.reason === 'thin' && e.id === 'p1-arch' && F.has('note1_read'),
        lock: false,
        async run(s) { await s.remark(F.has('ch2_open') ? STORY.k1.noteMap2 : STORY.k1.noteKlo2); }
    });

    beat('k1_p1', {
        on: 'inked', filter: (e) => e.id === 'p1-arch',
        lock: false,
        async run(s) {
            s.stinger('aha'); s.checkpoint('steppe');
            if (!F.has('hint_teach')) { F.add('hint_teach'); s.remark(['horse', STORY.k1.teachStreck]); }
            await s.remark(F.has('ch2_open') ? STORY.k1.bridgeMapDone : STORY.k1.bridgeDone);
        }
    });
    beat('k1_boardwalk', {
        on: 'latch', filter: (e) => e.flag === 'spangen_flag',
        lock: false,
        async run(s) { await s.remark(STORY.k1.boardwalkLesson); }
    });

    beat('k1_glimpse', {
        on: 'glimpse', filter: (e) => e.id === 'glimpse1',
        async run(s) {
            // frame the sköldhäst and the far ridge together (not an empty sky)
            const gp = G.sceneDef.spots.glimpse1;
            await s.cam({ x: (P().x + gp.x) / 2, y: (P().y + gp.y) / 2 - h(0.3), zoom: 0.8, t: 0.8, hold: 1.2 });
            await s.say(STORY.k1.glimpse);
            s.clue('glimpse');
            s.camFree();
        }
    });

    beat('k1_branten', {
        when: () => inScene('land') && F.has('p1_inked') && !F.has('p3_t1')
            && P().x < h(55.5) && P().x > h(48.5) && P().mode === 'ground',
        async run(s) {
            await s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloBranten.x, y: G.sceneDef.spots.kloBranten.y, pose: 'point', facing: -1 });
            const mapSearch = F.has('ch2_open');
            await landLook(s, 'ramp', () => s.say(mapSearch ? STORY.k1.brantenMapIntro : STORY.k1.brantenIntro));
            G.actors.klo.pose = 'notebook';
            await s.wait(0.4);
            if (!F.has('p3_t1')) hintOnce('tufts', STORY.k1.brantenTufts);
        }
    });

    beat('k1_p3_pin', {
        when: () => inScene('land') && F.has('p3_t1') && !F.has('p3_t2') && !F.has('p3_stone_clear')
            && P().mode === 'ground' && P().x > h(38.4) && P().x < h(42.3) && P().y < h(-1.35),
        async run(s) { await landLook(s, 'rampMiddle', () => s.say(STORY.k1.pinSeen)); }
    });
    beat('k1_p3_upper', {
        when: () => inScene('land') && F.has('p3_t2') && !F.has('p3_t3')
            && P().mode === 'ground' && P().x > h(36) && P().x < h(39.2) && P().y < h(-2.5),
        async run(s) { await landLook(s, 'rampUpper', () => s.say(STORY.k1.upperFlowerSeen)); }
    });
    beat('k1_p3_seed_waiting', {
        on: 'seedLanded', filter: e => e.pinned && !e.decor, lock: false,
        async run(s) { await s.remark(STORY.k1.seedWaiting); }
    });
    beat('k1_p3_unpinned', {
        on: 'hillUnpinned', lock: false,
        async run(s) { s.stinger('aha'); await s.remark(STORY.k1.pinFreed); }
    });

    beat('k1_p3', {
        when: () => inScene('land') && F.has('p3_t1') && F.has('p3_t2') && F.has('p3_t3') && inArea('ledge'),
        async run(s) {
            await s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloLedge.x - h(0.6), y: G.sceneDef.spots.kloLedge.y, pose: 'notebook', facing: 1 });
            s.stinger('discovery');
            await landLook(s, 'waveMarks', async () => {
                await s.say(F.has('ch2_open') ? STORY.k1.wavemarksMap : STORY.k1.wavemarks);
                const route = F.has('chapter2_available') && !F.has('mark_land')
                    ? F.has('ch2_open') ? STORY.k1.wavesToLandPiece : STORY.k1.wavesToCliff
                    : F.has('p2_open') ? STORY.k1.wavesToSea : STORY.k1.wavesToPool;
                // The reason to continue belongs to every player, including
                // requested-only hints, and stays with the visible evidence.
                await s.say(['klo', route]);
            });
            s.clue('wave_marks');
            G.flag('p3_done');
            s.checkpoint('ledge');
        }
    });

    beat('k1_pool_purpose', {
        when: () => inScene('land') && F.has('rule_demo') && !F.has('p2_seen') && P().x > h(98.8) && P().x < h(105.2),
        async run(s) {
            await landLook(s, 'pool', () => s.say(STORY.k1.poolPurpose));
        }
    });

    beat('k1_pool_klo', {
        when: () => guided() && inScene('land') && inArea('pool') && F.has('rule_demo') && !F.has('p2_open') && !done('k1_pool_klo'),
        lock: false,
        async run(s) {
            const k = G.actors.klo;
            if (k.scene !== 'land' || Math.abs(k.x - G.sceneDef.spots.kloBeach.x) > h(2)) await s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloBeach.x, y: G.sceneDef.spots.kloBeach.y, pose: 'idle', facing: -1 });
        }
    });

    beat('k1_mirror', {
        on: 'reflectionSeen', filter: (e) => e.id === 'pool',
        async run(s) {
            await s.wait(0.8);
            await landLook(s, 'pool', async () => {
                await s.say(discovery(STORY.k1.mirror, 'reflection'));
                // Exact comparisons stay optional; the purpose and visible
                // route belong to every player's required discovery.
                const lines = [];
                if (guided() && G.puz.stone !== G.sceneDef.rail.target) lines.push(STORY.k1.mirrorStone);
                if (guided() && !F.has('p2_plank')) lines.push(STORY.k1.mirrorPlank);
                if (lines.length) await s.say(lines);
            });
            s.clue('reflection');
        }
    });

    beat('k1_arch', {
        on: 'opened', filter: (e) => e.id === 'arch',
        async run(s) {
            await landLook(s, 'pool', async () => {
                s.stinger('reveal');
                await s.fx('archOpen', {});
                await s.wait(0.6);
                s.checkpoint('pool');
                await s.say(STORY.k1.archDone);
            });
        }
    });

    // the sea
    beat('k1_kelp_first', {
        when: () => inScene('kelp') && !done('k1_kelp_first'),
        lock: false,
        async run(s) {
            G.flag('kelp_entered');
            await s.appear('klo', { scene: 'kelp', x: G.sceneDef.spots.klo.x, y: G.sceneDef.spots.klo.y, pose: 'idle', facing: -1 });
            s.checkpoint('kelp');
            await s.remark(STORY.k1.seaPurpose);
            tipOnce('swim');
            hintOnce('swim', STORY.k1.swimTip);
        }
    });
    // side remarks in the sea never stop the swim (Klo's bubble instead of a speech box)
    beat('k1_whisper', {
        when: () => inScene('kelp') && G.player.hidden && G.player.anchored && !done('k1_whisper') && !(F.has('ch2_open') && !F.has('p5_lit')),
        lock: false,
        async run(s) {
            G.actors.klo.pose = 'whisper';
            await s.remark(STORY.k1.whisper);
            await s.wait(3);
            G.actors.klo.pose = 'idle';
        }
    });
    beat('k1_fishrock', {
        on: 'shyOut', filter: (e) => e.kind === 'fish' && G.player.hidden && inScene('kelp'),
        lock: false,
        async run(s) {
            await s.remark(STORY.k1.fishRock);
            s.experiment('gom', 'skoldpadda');
        }
    });
    beat('k1_deep', {
        on: 'experiment', filter: (e) => e.id === 'djup',
        lock: false,
        async run(s) {
            // Measurements queued during the finale may reach the front only
            // after returning home. Keep the notebook fact, not stale sea talk.
            const here = !F.has('conclusion') && P().mode === 'swim' && P().y > h(5);
            if (here) await s.remark(STORY.k1.deep);
            s.experiment('djup', 'skoldpadda', { quiet: !here });
        }
    });
    beat('k1_flap', {
        on: 'flattened', filter: (e) => e.id === 'flap',
        lock: false,
        async run(s) { await s.remark(STORY.k1.flapLesson); }
    });

    // Smaktestet (O1): grass on land and kelp in the sea
    beat('taste', {
        on: 'taste', repeat: true,
        lock: false,
        async run(s) {
            const p = G.player;
            p.action = 'lookdown'; p.actionT = 0; p.actionDur = 1.0;
            s.sfx('rustle');
            await s.wait(0.9);
            if (F.has('ate_grass') && F.has('ate_kelp') && !F.has('exp_smak_logged')) {
                await s.remark(STORY.k1.smak);
                s.experiment('smak', 'skoldpadda');
            } else await s.remark(lastTaste === 'kelp' ? STORY.k1.tasteKelp : STORY.k1.tasteGrass);
        }
    });

    beat('k1_hook', {
        when: () => inScene('kelp') && inArea('overlook') && !F.has('ch1_end')
            && F.has('p2_open'),
        async run(s) {
            const vk = G.sceneDef.spots.veckmuren;
            await landLook(s, 'sea-fold-reveal', async () => {
                s.stinger('reveal');
                await s.say(STORY.k1.hook.slice(0, 2));
                // The figure belongs to the upright painted page, visible
                // beyond the near folded edge in both phone orientations.
                const fig = G.actors.figure;
                Object.assign(fig, { scene: 'kelp', x: vk.x - h(0.6), y: h(1.4), visible: true, pose: 'kv-walk-1', facing: 1 });
                s.sfx('rustle');
                await s.walk('figure', vk.x + h(1.5), 320);
                fig.visible = false;
                await s.say(STORY.k1.hook.slice(2));
            }, { x0: h(44.7), y0: h(-.9), x1: h(50.4), y1: vk.y + h(.6) });
            s.clue('fold'); s.clue('figure');
            G.flag('ch1_end');
            G.chapterFlags();
            s.checkpoint('overlook');
            s.stinger('chapter');
            await s.report(1);
            io.save();
        }
    });

    // =========================================================================
    // KAPITEL 2
    // =========================================================================
    beat('k2_open', {
        when: () => F.has('ch2_open') && (inScene('kelp') || inScene('land')) && !done('k2_open'),
        async run(s) {
            if (inScene('kelp')) await s.appear('klo', { scene: 'kelp', x: P().x - h(1.2), y: P().y + h(0.2), pose: 'map-corner', facing: 1 });
            else await s.appear('klo', { scene: 'land', x: P().x - h(1.2) * P().facing, y: P().y, pose: 'map-corner', facing: P().facing });
            await s.map({ variant: 'search' }, () => s.say(F.has('mark_land') ? STORY.k2.openWithLand : STORY.k2.open));
            await s.fx('paperFill', {});
            G.actors.klo.pose = 'idle';
        }
    });

    beat('k2_note2', {
        when: () => inScene('kelp') && inArea('trench') && F.has('ch2_open'),
        async run(s) {
            // his note lies sealed in a bottle on the trench floor: the first clue to his fear of water
            const at = G.sceneDef.spots.note2;
            if (at) await s.cam({ x: (P().x + at.x) / 2, y: (P().y + at.y) / 2 - h(0.4), zoom: 1.0, t: 0.8, hold: 0.5 });
            await s.say([STORY.k2.note2, STORY.k2.note2Klo]);
            s.clue('note2', { quiet: true });
            s.camFree();
        }
    });

    beat('k2_vault_purpose', {
        when: () => inScene('kelp') && F.has('ch2_open') && !F.has('p5_lit') && !F.has('mark_sea')
            && P().x > h(22.3) && P().x < h(27) && P().y > h(7.7)
            && G.puz.school.state === 'home',
        async run(s) {
            await landLook(s, 'vault-approach', () => s.say(STORY.k2.vaultPurpose),
                { x0: h(22.6), y0: h(8.7), x1: h(27.4), y1: h(12.8) });
        }
    });
    beat('k2_lanterns', {
        on: 'schoolFollow', filter: () => !done('k2_lanterns'),
        lock: false,
        async run(s) { s.stinger('discovery'); }
    });
    beat('k2_lit', {
        on: 'lit', filter: (e) => e.id === 'vault',
        lock: false,
        async run(s) {
            s.stinger('aha');
            await s.wait(0.6);
            await s.remark(STORY.k2.vaultReveal);
            s.checkpoint('trench');
        }
    });

    beat('k2_corner_purpose', {
        when: () => inScene('kelp') && F.has('ch2_open') && !F.has('p6_flat')
            && P().x > h(32) && P().x < h(39) && P().y > h(6.4),
        async run(s) {
            await landLook(s, 'seabed-fold', () => s.say(F.has('p6_kelp_freed') ? STORY.k2.kelpFreed : STORY.k2.cornerPurpose),
                { x0: h(32.5), y0: h(7.2), x1: h(42), y1: h(12.2) });
        }
    });

    // These acknowledgements leave swimming and the physical unfolding live.
    // The same frond, current, fold and loose fragment explain each next action.
    beat('k2_kelp_freed', {
        on: 'kelpFreed', lock: false,
        async run(s) { io.save(); s.stinger('aha'); await s.remark(STORY.k2.kelpFreed); }
    });
    beat('k2_fold_flat', {
        on: 'flattened', filter: (e) => e.id === 'corner', lock: false,
        async run(s) { io.save(); s.stinger('discovery'); await s.remark(STORY.k2.foldFlat); }
    });

    beat('k2_leap_purpose', {
        lock: false, // landLook freezes the world without braking an earned run-up first.
        when: () => inScene('land') && F.has('chapter2_available') && !F.has('mark_land') && !F.has('p4_leap')
            && P().x > h(13.1) && P().x < h(17) && P().mode === 'ground',
        async run(s) {
            // The climb reveals an existing cliff. Finding something in the
            // sea never creates land or removes a distant paper curtain.
            await landLook(s, 'leap', () => s.say(F.has('ch2_open') ? STORY.k2.landmarkPurpose : STORY.k2.landmarkPurposeEarly));
            await landLook(s, 'runup', () => s.say(STORY.k2.runupPurpose));
        }
    });

    beat('k2_leap', {
        on: 'bigLanding',
        async run(s) {
            if (F.has('final_run')) return;
            s.stinger('leap');
            await s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloUdden.x, y: G.sceneDef.spots.kloUdden.y, pose: 'stopwatch', facing: 1 });
            await landLook(s, 'landmark', () => s.say(STORY.k2.record));
            s.experiment('sprang', 'hast');
            s.checkpoint('udden');
        }
    });

    beat('k2_mark_land', {
        on: 'mark', filter: (e) => e.id === 'mark_land',
        // Inventory may save before its queued discovery has been read. The
        // real lighthouse view also works when that save resumes under water.
        when: () => F.has('mark_land') && !F.has('ch2_end') && !done('k2_mark_land'),
        async run(s) {
            s.stinger('discovery');
            s.clue('mark_land');
            await s.map({ variant: 'fragment', fragment: 'land' }, async () => {
                await s.say(STORY.k2.landFound);
                if (!F.has('mark_sea')) await s.say(F.has('ch2_open') ? STORY.k2.halfSea : STORY.k2.halfSeaEarly);
            });
            let lighthouseExplained = false;
            const explainLighthouse = () => {
                lighthouseExplained = true;
                return s.say([STORY.k2.lighthouseIntro, STORY.k2.lighthouse]);
            };
            await s.fx('vista', { scene: 'viken', lighthouse: true, comparison: true,
                whileVisible: explainLighthouse, hold: 0.6 });
            if (!lighthouseExplained) await explainLighthouse();
            s.clue('lighthouse');
            s.camFree();
        }
    });
    beat('k2_mark_sea', {
        on: 'mark', filter: (e) => e.id === 'mark_sea',
        // Collection is distinct from freeing the fold. Recover its reading
        // from saved inventory without replaying a world effect in another scene.
        when: () => F.has('mark_sea') && !F.has('ch2_end') && !done('k2_mark_sea'),
        async run(s) {
            s.stinger('discovery');
            s.clue('mark_sea');
            await s.map({ variant: 'fragment', fragment: 'sea' }, async () => {
                await s.say(STORY.k2.cornerFlat);
                await s.say(STORY.k2.seaFound);
                if (!F.has('mark_land')) await s.say(STORY.k2.half);
            });
        }
    });

    beat('k2_end', {
        on: 'marksBoth',
        // Collection can be saved before its queued assembly starts. Rebuild
        // the payoff from inventory too, including older saves with an open route.
        when: () => F.has('mark_land') && F.has('mark_sea') && !F.has('ch2_end'),
        async run(s) {
            await s.map({ variant: 'assembly', focus: 'route' }, async (demo) => {
                await s.say(STORY.k2.fitPieces);
                await demo?.join?.();
                await s.say(STORY.k2.torn);
                await demo?.reveal?.();
                G.flag('marks_both'); // the visible repaired route opens its matching current
                await s.say(STORY.k2.bothHalves);
            });
            s.clue('torn_map', { quiet: true });
            if (inScene('kelp')) {
                const passage = G.sceneDef.waterPassage;
                const lane = G.sceneDef.lanes.find(l => l.id === 'lane-out').pts.slice(2);
                const floor = G.sceneDef.surfaces.find(f => f.id === passage.floor).pts
                    .filter(([x]) => x >= lane[0][0]);
                await landLook(s, 'bay-outflow', () => s.say(STORY.k2.outflow), {
                    x0: lane[0][0] - h(.8), x1: lane.at(-1)[0] + h(.7),
                    y0: Math.min(...lane.map(([, y]) => y)) - h(.8),
                    y1: Math.max(passage.bed, ...floor.map(([, y]) => y)) + h(.5)
                });
            }
            // a glimpse of the lighthouse: the paper figure peeks and snaps a shutter shut
            let figureExplained = false;
            const explainFigure = () => { figureExplained = true; return s.say(STORY.k2.end); };
            await s.fx('vista', { scene: 'viken', lighthouse: true, comparison: true, t: 3.2, peek: true,
                whileVisible: explainFigure });
            if (!figureExplained) await explainFigure();
            s.camFree();
            G.flag('ch2_end');
            G.chapterFlags();
            s.stinger('chapter');
            await s.report(2);
            io.save();
            hintOnce('afterEnd', STORY.k2.afterEnd);
        }
    });

    // =========================================================================
    // KAPITEL 3
    // =========================================================================
    beat('k3_arrive', {
        when: () => inScene('viken') && !done('k3_arrive'),
        lock: false, // read-held inspections preserve the incoming swimmer's momentum
        async run(s) {
            G.flag('viken_arrived'); G.flag('gate_open');
            const showKlo = () => s.appear('klo', { scene: 'viken', x: G.sceneDef.spots.kloShore.x,
                y: G.sceneDef.spots.kloShore.y, pose: 'point', facing: 1 });
            const swimmer = P().mode === 'swim';
            if (swimmer) {
                const p = P(), passage = G.sceneDef.waterPassage;
                const water = G.sceneDef.waters.find(w => w.id === passage.water);
                const lane = G.sceneDef.lanes.find(l => l.id === 'lane-bay-entry').pts;
                await landLook(s, 'bay-inlet', async () => {
                    await showKlo();
                    await s.say(STORY.k3.arriveSea);
                }, {
                    x0: Math.min(p.x - h(1.6), passage.x - h(.8)),
                    x1: Math.max(p.x + h(2.4), lane.at(-1)[0] + h(.6)),
                    y0: Math.min(water.top - h(1.4), p.y - h(1.5)),
                    y1: Math.max(passage.bed + h(.5), p.y + h(.8))
                });
            }
            const tower = G.sceneDef.spots.lighthouse, gallery = G.sceneDef.spots.kvGallery;
            await landLook(s, 'bay-lighthouse', async () => {
                if (!swimmer) await showKlo();
                await s.say(STORY.k3.arrive);
            }, { x0: tower.x - h(6.2), x1: tower.x + h(4), y0: gallery.y - h(3.5), y1: tower.y + h(1.5) });
            s.camFree();
            s.checkpoint('viken');
            hintOnce('chains', STORY.k3.chains);
        }
    });

    beat('k3_klo_pier', {
        when: () => guided() && inScene('viken') && done('k3_arrive') && inArea('pier') && G.actors.klo.x < h(3),
        lock: false,
        async run(s) { await s.appear('klo', { scene: 'viken', x: G.sceneDef.spots.klo.x, y: G.sceneDef.spots.klo.y, pose: 'idle', facing: -1 }); }
    });

    beat('k3_mirror', {
        on: 'reflectionSeen', filter: (e) => e.id === 'bay',
        async run(s) {
            await s.wait(0.6);
            // Keep the actual answer visible for the whole explanation. The
            // reversible comparison removes the rock face hiding the reflection.
            await s.fx('vista', { scene: 'viken', lighthouse: true, comparison: true,
                whileVisible: () => s.say(discovery(STORY.k3.mirror, 'bayReflection')), hold: 0.6 });
            s.checkpoint('pier');
        }
    });

    beat('k3_shutter', {
        on: 'latch', filter: (e) => /^shutter/.test(e.flag || ''),
        repeat: true,
        async run(s) {
            s.stinger('aha');
            // Show the visible consequence at its destination. The third
            // mechanism already earns the full lamp/keeper reveal below.
            if (F.has('lamp_lit')) return;
            const L = G.sceneDef.lamp;
            await s.cam({ x: L.x, y: L.y - h(.3), zoom: .95, t: .65, hold: .8 });
            await s.say(STORY.k3.shutterOpened);
            s.camFree();
        }
    });

    beat('k3_pipe', {
        on: 'pipeTop', repeat: true,
        async run(s) {
            if (!inScene('viken')) return;
            const t = G.sceneDef.spots.galleryPop;
            await s.fx('pop', { x: t.x, y: t.y });
            const p = G.player;
            p.mode = 'ground'; p.hidden = false; p.hide = 0; p.x = p.px = t.x; p.y = p.py = t.y; p.vx = 0; p.vy = 0; p.water = null; p.submerge = 0;
            const sup = G.terrain.support(t.x, t.y, 60, 60); if (sup) p.surface = sup.s;
            s.sfx('splash', { size: 0.4 });
        }
    });

    beat('k3_lamp', {
        on: 'lampLit',
        when: () => inScene('viken') && F.has('lamp_lit') && !F.has('kv_met'),
        async run(s) {
            const L = G.sceneDef.lamp;
            await s.cam({ x: L.x, y: L.y + h(2.5), zoom: 0.72, t: 1.2, hold: 0.6 });
            s.stinger('reveal');
            await s.fx('lamp', {});
            // on the gallery, beside the lit window (not in front of its glare)
            const gallery = G.sceneDef.spots.kvGallery, gx = gallery.x + h(0.62);
            await s.appear('kv', { scene: 'viken', x: gx, y: gallery.y, pose: 'worry', facing: -1 });
            // his first words: the open shutters let the spray in (framed below the dialogue box)
            await s.cam({ x: gx - h(0.4), y: gallery.y - h(1.2), zoom: 0.95, t: 0.7, hold: 0.2 });
            await s.say(STORY.k3.kvFirst);
            // he hurries down to the pier with his map
            G.actors.kv.visible = false;
            s.sfx('rustle');
            await s.wait(0.5);
            Object.assign(G.actors.kv, { x: G.sceneDef.spots.kvPier.x, y: G.sceneDef.spots.kvPier.y, visible: true, pose: 'stand', facing: -1, map: 'closed' });
            await s.cam({ x: G.sceneDef.spots.kvPier.x - h(1.5), y: h(-1.6), zoom: 0.95, t: 1.0, hold: 0.6 });
            s.camFree();
            G.flag('kv_met');
            s.checkpoint('pierEnd');
        }
    });

    beat('k3_talk1', {
        when: () => inScene('viken') && F.has('kv_met') && Math.abs(P().x - G.actors.kv.x) < h(2.4) && P().mode === 'ground',
        async run(s) {
            G.actors.kv.pose = 'worry';
            // Why he folded, told over his memory of the prologue: one picture per line
            // (his map of her page; the shore and the sea spreading onto the white paper; the fold).
            // The words never depend on the picture: without it, he still explains.
            let told = false;
            const tell = async (memory) => {
                told = true;
                if (!memory) return s.say(STORY.k3.talk1);
                for (let i = 0; i < STORY.k3.talk1.length; i++) {
                    memory?.stage?.(i);
                    await s.say([STORY.k3.talk1[i]]);
                }
            };
            await s.fx('kvMemory', { whileVisible: tell }).catch((err) => console.warn('kvMemory', err));
            if (!told) await tell(null);
            s.clue('kv_why');
            G.actors.kv.pose = 'point'; G.actors.kv.map = 'open';
            G.flag('talk1');
        }
    });

    // =========================================================================
    // P8 and the final
    // =========================================================================
    beat('k3_line', {
        on: 'flag', filter: (e) => e.flag === 'talk_done',
        when: () => inScene('viken') && F.has('talk_done') && !F.has('p8_land') && !F.has('ended'),
        async run(s) {
            await s.fx('lineAppears', {});
            await s.say(discovery(STORY.k3.line, 'line'));
            const corner = G.sceneDef.spots.window;
            await s.cam({ x: corner.x, y: corner.y, zoom: .9, t: 1, hold: 1 });
            await s.say(STORY.k3.corner);
            await s.cam({ x: h(12), y: h(-1.2), zoom: 0.62, t: 1.2, hold: 1.2 });
            s.camFree();
        }
    });

    beat('k3_window', {
        on: 'windowReached',
        filter: () => !F.has('ended'),
        when: () => inScene('viken') && F.has('p8_sea') && !F.has('ended') && G.checkpoint === 'lineWindow',
        async run(s) {
            // Resume a committed drawing without asking the player to repeat it.
            if (F.has('unfolded')) { await finale(s); return; }
            const win = G.sceneDef.spots.window;
            io.save(); // preserve the completed sea half before opening the final drawing
            await s.cam({ x: win.x, y: win.y, zoom: 1.2, t: 0.8, hold: 0.9 });
            let shown = false;
            const demonstrate = async (trial) => {
                shown = true;
                await trial?.flatten();
                if (!F.has('p8_done')) {
                    await s.say(STORY.k3.lastStroke);
                    const getGeometry = () => trial?.geometry() || { anchors: SHORE_PATCH.anchors.flatMap(([x, y]) => {
                        const q = io.toScreen?.(win.x + x - 300, win.y + y - 170);
                        return q ? [[q.x, q.y]] : [];
                    }) };
                    await io.ui.draw({ prompt: UI.drawLast, ...getGeometry(), getGeometry, allowReverse: true, width: 6, color: '#355f78' });
                    G.flag('p8_done');
                    io.save();
                }
                trial?.complete();
                s.stinger('aha');
                await s.say(STORY.k3.waveReady);
                s.sfx('splash', { size: .3 });
                await trial?.wave();
                G.flag('p8_proven');
                await s.say(STORY.k3.proof);
            };
            if (io.fx) await s.fx('shoreTrial', { whileVisible: demonstrate });
            if (!shown) await demonstrate(null); // logic clients retain the same causal order
            Object.assign(G.actors.kv, { x: h(23.4), y: h(-0.62), visible: true, pose: 'point', facing: 1 });
            Object.assign(G.actors.klo, { x: h(22.5), y: h(-0.62), visible: true, scene: 'viken', walk: null, inHole: false, pose: 'idle', facing: 1 });
            G.player.hidden = false;
            await s.cam({ x: h(23.2), y: h(-1.0), zoom: 1.0, t: 0.8, hold: 0.1 });
            G.actors.klo.pose = 'map-corner';
            s.sfx('rustle');
            await s.map({ variant: 'inspect', focus: 'crease', caption: STORY.k3.mapCaption, route: false }, async (demo) => {
                await demo?.reveal?.();
                await s.say(STORY.k3.mapBack);
                G.actors.kv.pose = 'bow';
                await s.say(STORY.k3.sorry[0]);
            });
            G.actors.klo.pose = 'idle';
            G.actors.kv.pose = 'bow';
            await s.say(STORY.k3.sorry[1]);
            await s.say(STORY.k3.home);
            G.actors.kv.pose = 'unfold';
            s.stinger('unfold');
            await s.fx('unfold', {});
            G.flag('unfolded');
            io.save();
            s.camFree();
            await finale(s);
        }
    });

    async function finale(s) {
        // One clear destination: the original beach, then Alva's table.
        G.flag('final_run');
        G.freeze = true;
        G.goto('land', 'start', { silent: true });
        G.actors.klo.visible = false; G.actors.kv.visible = false;
        io.audio?.setArea('quiet');
        await s.fx('cutToPicture', {});
        await s.say(STORY.final.arrival);
        G.flag('plask');
        P().wet = 1; P().wetTimer = 30;
        s.stinger('plask');
        await s.fx('plask', {});
        G.freeze = false;
        G.evening = true;
        io.audio?.setArea('final');
        await s.say(STORY.final.splash);
        await s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloBeach.x, y: G.sceneDef.spots.kloBeach.y, pose: 'sign-folded', facing: 1 });
        s.camFree();
        await s.say(STORY.final.conclusion);
        G.flag('conclusion');
        await s.say(STORY.final.home);
        // Save completion before the table/end card: closing there restores
        // free play on the beach, never an unfinished puzzle at the lighthouse.
        G.flag('ended');
        G.flag('b:k3_window');
        G.finalRun = false;
        G.flags.delete('final_run');
        G.terrain.refresh();
        s.checkpoint('beachEnd');
        io.save();
        await io.fx('epilogue', {
            onCovered: () => { G.actors.klo.visible = false; G.goto('land', 'start', { silent: true }); }
        });
        G.evening = false;
    }

    // =========================================================================
    // After the ending: Kapplöpning mot Sköldpaddan Signe (O8). First to the pool wins.
    // =========================================================================
    const race = { active: false, done: null, player: null };
    beat('after_signe', {
        when: () => inScene('land') && F.has('ended') && !G.busy && Math.abs(P().x - G.sceneDef.race.signe.x) < h(6),
        async run(s) {
            const r = G.sceneDef.race;
            await s.appear('signe', { scene: 'land', x: r.signe.x, y: r.signe.y, pose: 'idle', facing: -1 });
            await s.say(STORY.after.signeHello);
            G.flag('signe_met');
        }
    });
    beat('_race', {
        manual: true, lock: false,
        async run(s) {
            const r = G.sceneDef.race;
            const sg = G.actors.signe;
            // Talking happens on clear sand beside Signe. Both racers line up
            // at the visible start, so approaching her never shortens the race.
            const p = P(), ground = G.terrain.support(r.start.x, r.start.y, h(.6), h(.6));
            Object.assign(p, { x: r.start.x, px: r.start.x, y: ground?.y ?? r.start.y, py: ground?.y ?? r.start.y,
                vx: 0, vy: 0, mode: 'ground', surface: ground?.s || p.surface,
                hidden: false, hide: 0, hideQueued: false, facing: -1, nudge: null });
            Object.assign(sg, { x: r.start.x - h(0.2), y: r.start.y, facing: -1, pose: 'idle', visible: true, scene: 'land', speed: 0, walk: null });
            const stillHere = () => inScene('land') && P() === p;
            try {
                G.busy++;
                try { await s.say(F.has('signe_raced') || F.has('signe_race') ? STORY.after.signeAgain : STORY.after.signeGo); }
                finally { G.busy--; }
                if (!stillHere()) return;
                race.active = true; race.player = p; sg.racing = true;
                const result = await new Promise((resolve) => { race.done = resolve; });
                sg.pose = result === 'signe' ? 'wave' : 'idle'; sg.speed = 0; sg.racing = false;
                if (!stillHere()) return;
                sg.facing = Math.sign(p.x - sg.x) || 1;
                if (result !== 'cancelled') {
                    G.flag('signe_raced');
                    if (result === 'horse') G.flag('signe_race');
                    io.save();
                    s.stinger('aha');
                }
                G.busy++;
                // A slow player can leave Signe offscreen on a portrait phone.
                // Show the winner clear of her card, then return to normal play.
                const before = G.camHint;
                const resultFocus = result === 'signe' ? { frame: {
                    x0: sg.x - h(1.8), x1: sg.x + h(1.8),
                    y0: sg.y - h(1.1), y1: sg.y + h(1.7)
                } } : null;
                if (resultFocus) G.camHint = resultFocus;
                try { await s.say(result === 'horse' ? STORY.after.signeLose : result === 'signe' ? STORY.after.signeWin : STORY.after.signeGiveUp); }
                finally {
                    G.busy--;
                    if (resultFocus && G.camHint === resultFocus) G.camHint = before;
                }
                if (!stillHere()) return;
                sg.pose = 'idle';
                // Back to her clear patch of sand beyond the shell row.
                await s.walk('signe', r.signe.x, r.speed);
            } finally {
                race.active = false; race.done = null; race.player = null;
                Object.assign(sg, r.signe, { pose: 'idle', speed: 0, racing: false, facing: -1, walk: null });
                groundSigne();
            }
        }
    });
    function groundSigne() {
        const sg = G.actors.signe;
        if (sg.scene !== G.sceneId) return;
        const ground = G.terrain.support(sg.x, sg.y, h(0.6), h(0.6));
        if (ground) sg.y = ground.y;
    }
    function moveSigne(x, dt) {
        const sg = G.actors.signe, dx = x - sg.x;
        sg.x = x; sg.speed = Math.abs(dx) / dt;
        sg.walkPhase = (sg.walkPhase + Math.abs(dx) / h(0.5)) % 1;
        groundSigne();
    }
    function stepRace(dt) {
        if (!race.active) return;
        const r = G.sceneDef?.race, sg = G.actors.signe, p = G.player;
        if (!r || !inScene('land') || p !== race.player || p.x > r.start.x + h(3)) { finishRace('cancelled'); return; }
        // Both racers use the same finish. Compare crossing times within this
        // fixed step so updating the player first cannot steal Signe's win.
        const horseTime = p.x <= r.finish ? (p.px <= r.finish ? 0 : (p.px - r.finish) / (p.px - p.x)) : Infinity;
        const signeTime = Math.max(0, sg.x - r.finish) / (r.speed * dt);
        const finishTime = Math.min(horseTime, signeTime);
        moveSigne(Math.max(r.finish, sg.x - r.speed * dt * Math.min(1, finishTime)), dt);
        sg.facing = -1; sg.pose = 'walk';
        if (finishTime <= 1) finishRace(horseTime <= signeTime ? 'horse' : 'signe');
    }
    function finishRace(result) {
        race.active = false;
        G.actors.signe.racing = false;
        G.actors.signe.speed = 0;
        const resolve = race.done; race.done = null;
        resolve?.(result);
    }

    // =========================================================================
    // Story actions (Prata / Läs) offered on the context button
    // =========================================================================
    function actions() {
        const out = [];
        const p = G.player;
        if (running || p.mode !== 'ground' || p.hidden) return out;
        const kv = G.actors.kv;
        if (inScene('viken') && kv.visible && F.has('talk1') && !F.has('talk_done')) {
            const d = Math.abs(p.x - kv.x);
            if (d < h(1.6)) {
                if (!F.has('talk2')) out.push({ id: 'talk2', label: CONTEXT_LABELS.talk, dist: d / HL, run: () => start(beats.find((b) => b.id === '_talk2')) });
                else out.push({ id: 'talk3', label: CONTEXT_LABELS.talk, dist: d / HL, run: () => start(beats.find((b) => b.id === '_talk3')) });
            }
        }
        const sg = G.actors.signe;
        if (inScene('land') && F.has('signe_met') && sg.visible && sg.scene === 'land' && !race.active && !sg.walk) {
            const d = Math.abs(p.x - sg.x);
            if (d < h(1.4)) out.push({ id: 'race', label: CONTEXT_LABELS.talk, dist: d / HL, run: () => start(beats.find((b) => b.id === '_race')) });
        }
        if (inScene('land')) {
            const n = G.sceneDef.spots.note1;
            const d = Math.abs(p.x - n.x);
            if (d < h(0.9) && F.has('note1_read')) out.push({ id: 'read', label: CONTEXT_LABELS.read, dist: d / HL + 0.3, run: () => say([STORY.k1.note1]) });
        }
        return out;
    }
    beat('_talk2', {
        manual: true,
        async run(s) {
            G.actors.kv.pose = 'point'; G.actors.kv.map = 'open';
            await s.map({ variant: 'guardian', focus: 'coast', caption: STORY.k3.guardianCaption }, async (demo) => {
                await s.say(STORY.k3.talk2.slice(0, 2));
                await demo?.reveal?.();
                await s.say(STORY.k3.talk2[2]);
            });
            s.clue('kv_map', { quiet: true });
            G.flag('talk2');
            // Klo climbs onto the map and taps its shoreline
            Object.assign(G.actors.klo, { x: G.actors.kv.x - h(0.5), y: G.actors.kv.y - h(0.45), pose: 'point', visible: true, scene: 'viken' });
            s.sfx('crabclick');
        }
    });
    beat('_talk3', {
        manual: true,
        async run(s) {
            await s.map({ variant: 'guardian', focus: 'coast', caption: STORY.k3.guardianCaption }, async (demo) => {
                await demo?.reveal?.();
                await s.say(STORY.k3.talk3);
            });
            G.actors.kv.pose = 'stand';
            G.flag('talk_done');
            G.terrain.refresh();
            Object.assign(G.actors.klo, { x: G.sceneDef.spots.klo.x, y: G.sceneDef.spots.klo.y, pose: 'idle' });
        }
    });

    // =========================================================================
    // Runner
    // =========================================================================
    function start(b) {
        if (!b || running) return;
        G.companion?.yieldToStory?.();
        running = b;
        const lock = b.lock !== false;
        if (lock) G.busy++;
        const finish = () => {
            if (lock) G.busy = Math.max(0, G.busy - 1);
            if (!b.repeat && !b.manual) G.flag('b:' + b.id);
            running = null;
        };
        Promise.resolve().then(() => b.run(api)).then(finish, (err) => { console.error('beat', b.id, err); finish(); });
    }

    G.on('*', (type, data) => {
        for (const b of beats) {
            if (b.on !== type) continue;
            if (!b.repeat && done(b.id)) continue;
            if (running === b || queue.includes(b)) continue; // events repeat every step; run a beat once per occasion
            if (b.filter && !b.filter(data)) continue;
            queue.push(b);
        }
    });

    function step(dt) {
        // actors walking
        for (const a of Object.values(G.actors)) {
            if (a.pop > 0) a.pop = Math.max(0, a.pop - dt * 2);
            if (a.id === 'klo') {
                const wet = G.sceneDef.underwater || (G.sceneId === 'viken' && a.y > 0);
                stepKloWalk(a, dt, !wet && a.scene === G.sceneId ? (x, y, down) => G.terrain.groundNear(x, y, down) : null);
                if (!a.walk && !a.inHole && a.scene === G.sceneId && Math.abs(P().x - a.x) > 35) a.facing = Math.sign(P().x - a.x);
                continue;
            }
            if (!a.walk) continue;
            const d = a.walk.x - a.x, st = a.walk.speed * dt;
            if (Math.abs(d) <= st) {
                if (a.id === 'signe') { moveSigne(a.walk.x, dt); a.speed = 0; }
                else a.x = a.walk.x;
                const r = a.walk.resolve; a.walk = null; r();
            } else {
                if (a.id === 'signe') moveSigne(a.x + Math.sign(d) * st, dt);
                else a.x += Math.sign(d) * st;
                a.facing = Math.sign(d);
            }
        }
        hints(dt);
        stepRace(dt);
        // nothing new begins while the mended map shows the swim round the headland
        if (running || G.journey) return;
        while (queue.length) {
            const b = queue.shift();
            if (!b.repeat && done(b.id)) continue;
            start(b); return;
        }
        for (const b of beats) {
            if (b.manual || !b.when) continue;
            if (!b.repeat && done(b.id)) continue;
            if (b.when(G)) { start(b); return; }
        }
    }

    // =========================================================================
    // Objectives and hints (plan §4.4)
    // =========================================================================
    function landSearchObjective() {
        if (!F.has('p1_inked')) return 'p1';
        if (!F.has('p3_done')) return F.has('p3_t1') && !(F.has('p3_t2') && F.has('p3_t3')) ? 'p3b' : 'p3';
        return 'p4';
    }
    function objective() {
        if (F.has('ended')) {
            if (F.has('signe_met') && !F.has('signe_raced') && !F.has('signe_race')) return 'signe';
            return pencilFlags.length && pencilFlags.every(flag => F.has(flag)) ? 'freeComplete' : 'free';
        }
        // Kapitel 3: find the way to Spegelviken, light the lamp, talk, draw the last line
        if (F.has('ch2_end')) {
            if (!F.has('viken_arrived')) return 'toViken';
            if (!F.has('lamp_lit')) return 'p7';
            if (!F.has('talk_done')) return 'talk';
            return 'p8';
        }
        // Kapitel 2: the two halves of the mark, one on land and one in the sea
        if (F.has('ch2_open')) {
            if (inScene('kelp')) {
                if (F.has('mark_sea')) return landSearchObjective();
                // Light reveals the inviting route through the cave. An
                // explorer can also discover the fold by swimming over it;
                // The frond and paper form their own local physical puzzle.
                const foundHeart = F.has('b:k2_corner_purpose') || F.has('p6_kelp_freed') || F.has('p6_flat')
                    || (P().x > h(31.5) && P().y > h(6.4));
                return F.has('p5_lit') || foundHeart ? 'p6' : 'p5';
            }
            if (!F.has('mark_land')) return landSearchObjective();
            return 'toSea';
        }
        // Kapitel 1
        if (!F.has('klo_hidden')) return 'explore';
        if (!F.has('klo_ja')) return 'hide';
        // Opening Vattenporten earns a usable route. The hills later lead to
        // the land fragment; they never block an already opened sea passage.
        if (inScene('kelp')) return 'hook';
        if (F.has('mark_land')) return F.has('p2_open') ? 'kelp' : F.has('p2_seen') ? 'p2' : 'pool';
        // Choosing the western route is a real investigation even when the
        // beach cave is already open. Keep its local task until we return.
        if (P().x < h(80)) {
            if (!F.has('p1_inked')) return 'p1';
            if (!F.has('p3_done')) return landSearchObjective();
            if (F.has('chapter2_available')) return 'p4';
        }
        if (F.has('p2_open')) return 'kelp';
        // the nearest unfinished puzzle: the pool by her beach, the arch in the west, the steppe beyond it
        const x = P().x / HL;
        if (!F.has('p2_open') && x > 96) return F.has('p2_seen') ? 'p2' : 'pool';
        if (!F.has('p1_inked') && x > 74) return 'p1';
        if (!F.has('p3_done') && F.has('p1_inked') && x < 80) return F.has('p3_t1') && !(F.has('p3_t2') && F.has('p3_t3')) ? 'p3b' : 'p3';
        if (!F.has('p2_open')) return F.has('p2_seen') ? 'p2' : 'pool';
        if (!F.has('p1_inked')) return 'p1';
        if (!F.has('p3_done')) return 'p3';
        return 'kelp';
    }
    /** The goal note, help ladder and world cue share this one current task. */
    function guidance() {
        const key = objective();
        return describeGuidance(G, { objective: key, touch: io.touch, device: io.device, ...io.settings?.(), p8: key === 'p8' ? p8Progress(G) : undefined });
    }
    function goal() { return guidance().goal; }
    const PROGRESS = new Set(['inked', 'grow', 'seedLanded', 'hillUnpinned', 'opened', 'latch', 'lit', 'mark', 'flattened', 'kelpFreed', 'push', 'reflectionSeen', 'scene', 'bigLanding', 'streckDone', 'ratchet', 'taste', 'pickup', 'colorin']);
    G.on('*', (type) => { if (PROGRESS.has(type)) { hintState.t = 0; hintState.level = 0; hintState.said = 0; hintState.reminded = false; } });
    G.on('pickup', () => { if (objective() === 'freeComplete') io.guide?.hint(HINTS.freeComplete.note); });

    /** Optional invitations contain no answer. Only Guida mig supplies automatic clues. */
    function hints(dt) {
        const cue = guidance(), key = describeKloHelp(G, cue).key;
        if (key !== hintState.key) { hintState.key = key; hintState.t = 0; hintState.level = 0; hintState.said = 0; hintState.reminded = false; }
        if (!guided()) hintState.level = 0;
        if (G.busy || running) return;
        hintState.t += dt;
        if (G.helpLevel === 'remind' && hintState.t > 45 && !hintState.reminded) {
            hintState.reminded = true;
            G.emit('kloReminder', { key });
        }
        if (!guided()) return;
        const H = cue.hint;
        if (!H) return;
        const first = 30, second = 75, again = 60;
        if (hintState.said === 0 && hintState.t > first) {
            hintState.said = 1; hintState.level = 0.5;
            io.guide?.hint(H.note);
            tipOnce('journal');
        } else if (hintState.said === 1 && hintState.t > second) {
            hintState.said = 2; hintState.level = 1;
            io.guide?.hint(H.sketch || H.note, 'klo', 9000);
            io.ui.pulse?.('journal');
        } else if (hintState.said >= 2 && hintState.t > second + again * (hintState.said - 1)) {
            hintState.said++;
            io.guide?.hint(H.sketch || H.note, 'klo', 9000);
        }
    }
    /** a one-off tip about the controls (remembered in the save) */
    // which control a tip points at on a touch screen (with keys only the journal has a place to point)
    const TIP_AT = { gallop: 'stick', swim: 'stick', dashed: 'stick', act: 'act', hide: 'hide', journal: 'journal' };
    function tipOnce(id) {
        const text = controlTip(id, { touch: io.touch, device: io.device, ...io.settings?.() });
        if (F.has('tip_' + id) || !text) return;
        F.add('tip_' + id);
        if (!io.touch && ['gallop', 'act', 'hide', 'swim', 'journal'].includes(id)) return;
        io.guide?.tip(text, { at: io.touch || id === 'journal' ? TIP_AT[id] : null });
    }
    // Earned feedback is still useful. Everything else here explains a future
    // solution and belongs to explicitly enabled automatic guidance.
    const FEEDBACK = new Set(['mapPurpose', 'teach', 'plank', 'stone', 'fluff', 'ramp']);
    /** a one-off hint or earned response from Klo (remembered in the save) */
    function hintOnce(id, text, who = 'klo') {
        if (!guided() && !FEEDBACK.has(id)) return;
        if (F.has('hint_' + id) || !text) return;
        F.add('hint_' + id);
        io.guide?.hint(text, who);
    }

    // ---- small guidance moments (non-blocking) ------------------------------------------------
    G.on('inked', (e) => {
        // the first line drawn anywhere: the tickle in the hooves was Alva's pencil
        if (e.id === 'teach-step' || e.id === 'p2-plank') hintOnce('teach', STORY.k1.teachStreck, 'horse');
        if (e.id === 'teach-step') tipOnce('dashed');
        if (e.id === 'p2-plank' && !F.has('p2_open')) hintOnce('plank', STORY.k1.plankDone);
    });
    // the same refusal again and again: Klo steps in with the plain answer for what you are doing now
    const balks = { key: '', n: 0, t: 0 };
    G.on('balk', (e) => {
        if (!guided()) return;
        if (e.reason === 'thin' && !F.has('p1_inked')) hintOnce('thin', STORY.k1.firstThin);
        if (['slow', 'runup'].includes(e.reason) && e.id === 'sprang-p4') hintOnce('leap', STORY.k2.leapHint);
        if (e.id === 'klipp-edge' && F.has('p4_leap') && !F.has('p4_plank')) hintOnce('rope', STORY.k2.ropeHint);
        const key = e.reason + ':' + (e.id || '');
        if (key !== balks.key || G.time - balks.t > 25) { balks.key = key; balks.n = 0; }
        balks.n++; balks.t = G.time;
        if (balks.n === 3 && e.reason !== 'paper' && e.reason !== 'fold' && e.reason !== 'gate') {
            const cue = guidance();
            if (cue.hint) G.later(1.2, () => {
                const current = guidance();
                if (guided() && !G.busy && !running && current.key === cue.key) io.guide?.hint(current.hint.sketch || current.hint.note, 'klo', 9000);
            });
        }
    });
    G.on('push', (e) => { if (e.notch === G.sceneDef.rail?.target) hintOnce('stone', STORY.k1.stoneDone); });
    // fluff that found no tuft: the sköldhäst wonders (twice at most, so it never nags)
    let fluffMisses = 0;
    G.on('fluffMiss', (e) => { if (fluffMisses++ < 2) io.guide?.think(guided() ? (e.dir > 0 ? STORY.k1.fluffWrongWay : STORY.k1.fluffMiss) : KLO_COMPANION.story.fluffMiss); });
    G.on('grow', (e) => {
        if (e.decor) hintOnce('fluff', STORY.k1.teachFluff);
        else { io.save(); hintOnce('ramp', STORY.k1.rampGrew); }
    });
    G.on('seedLanded', e => { if (!e.decor) io.save(); });
    G.on('hillUnpinned', () => io.save());
    G.on('swimStart', () => { if (inScene('kelp') || inScene('viken')) tipOnce('swim'); });
    function watch() {
        const p = P();
        if (!G.story || G.busy || G.journey) return;
        if (inScene('land') && F.has('rule_demo') && !F.has('p2_seen') && Math.abs(p.x - h(102)) < h(3.2)) hintOnce('pool', STORY.k1.poolHint);
        // standing on the cliff side of the stone, where Knuffa would push it the wrong way
        if (inScene('land') && F.has('p2_seen') && !F.has('p2_open') && p.mode === 'ground') {
            const rail = G.sceneDef.rail, sx = rail.x0 + G.puz.stone * rail.step, want = Math.sign(rail.target - G.puz.stone);
            if (want && Math.abs(p.x - sx) < h(1.6) && Math.sign(sx - p.x) === -want) hintOnce('stoneSide', STORY.k1.stoneSide);
        }
        if (inScene('kelp') && F.has('ch2_open') && !F.has('p5_lit') && !p.hidden) {
            const home = G.sceneDef.school.home;
            if (Math.hypot(p.x - home.x, p.y - home.y) < h(5)) hintOnce('lykt', STORY.k2.lyktHint);
        }
        // the school stopped when the sköldhäst came out; it waits for the shell to hide near it again
        if (inScene('kelp') && F.has('ch2_open') && !F.has('p5_lit') && !p.hidden && G.puz.school.state === 'wait') hintOnce('lyktWait', STORY.k2.lyktWait);
        // hidden by the fish but lying still, outside the current that would carry the shell into the vault
        if (inScene('kelp') && F.has('ch2_open') && !F.has('p5_lit') && p.hidden && p.mode === 'swim' && !p.inLane && G.puz.school.state === 'follow') hintOnce('laneHide', STORY.k2.laneHide);
        if (inScene('viken') && F.has('viken_arrived') && !F.has('lamp_lit')) {
            if (!F.has('shutter1') && p.surface?.id === 'pier' && p.x > h(4) && p.x < h(22)) hintOnce('drum', F.has('spangen_flag') ? STORY.k3.drumHint : STORY.k3.drumFirstHint);
            if (!F.has('shutter2') && p.mode === 'swim' && Math.abs(p.x - h(14.2)) < h(3) && p.y > h(3)) hintOnce('plate', STORY.k3.plateHint);
            if (!F.has('shutter3') && p.mode === 'swim' && Math.abs(p.x - h(26.4)) < h(2.5)) hintOnce('pipe', STORY.k3.pipeHint);
        }
        if (inScene('viken') && F.has('p8_land') && !F.has('p8_done') && p.mode === 'swim' && !p.hidden) hintOnce('dive', STORY.k3.diveHint);
        if (p.mode === 'ground' && Math.abs(p.vx) >= 1000 && F.has('intro_done')) tipOnce('fullGallop');
        if (G.context && G.context.id !== 'skaka') tipOnce('act');
    }

    restoreActors();
    return {
        step(dt) { step(dt); watch(); },
        actions,
        objective, goal, guidance, tipOnce, hintOnce, tapKlo, restoreActors,
        hintInfo() {
            const cue = guidance();
            return { key: cue.objective, level: guided() ? hintState.level : 0, spot: cue.target, text: cue.hint };
        },
        running: () => !!running,
        herText: HER_TEXT, family: FAMILY, balkText: BALK
    };
}
