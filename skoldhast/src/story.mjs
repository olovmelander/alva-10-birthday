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
import { describeGuidance, controlTip } from './guidance-state.mjs';
import { STORY, HINTS, JOURNAL, BALK, HER_TEXT, FAMILY, UI, KLO_JOKES, CONTEXT_LABELS } from './content/sv.mjs';

const h = (v) => v * HL;

export function createStory(G, io) {
    const F = G.flags;
    const pencilFlags = Object.values(G.scenes).flatMap(sc => (sc.pencils || []).map(pc => 'penna_' + pc.id));
    const beats = [];
    let running = null;
    const queue = [];
    const hintState = { key: null, t: 0, level: 0, shown: 0 };

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
        for (const id of ['klo', 'kv']) G.actors[id].talking = list.some(([who]) => who === id);
        try { return await io.ui.say(list); }
        finally { for (const id of ['klo', 'kv']) G.actors[id].talking = false; }
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
            if (name !== 'vista') return io.fx(name, data || {});
            const controlsOn = !io.ui.controls?.classList.contains('off');
            io.ui.showControls?.(false);
            try { return await io.fx(name, data || {}); }
            finally { io.ui.showControls?.(controlsOn); }
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
        experiment(id, sign) {
            if (F.has('exp_' + id + '_logged')) return;
            G.flag('exp_' + id); G.flag('exp_' + id + '_logged');
            G.puz.tally += sign === 'hast' ? 1 : -1;
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
            const own = list.filter(([who]) => who === 'horse').map(([, t]) => t).join(' ');
            const said = list.filter(([who]) => who !== 'horse');
            if (said.length) io.guide.hint(said.map(([, t]) => t).join(' '), said[0][0], 5500 + 1500 * said.length);
            if (own) io.guide.think(own, 2600);
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
            s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloBeach.x, y: G.sceneDef.spots.kloBeach.y, pose: 'stopwatch', facing: 1 });
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
            if (!inScene('land') || !F.has('klo_hidden') || F.has('klo_ja') || G.player.hidden) { nearHoleT = 0; return false; }
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
            G.actors.klo.pose = 'map-corner';
            await s.say(STORY.k1.mapCorner.slice(0, 2));
            s.sfx('rustle');
            await s.fx('foldDemo', { x: G.sceneDef.spots.kloBeach.x - h(1.6), y: G.sceneDef.spots.kloBeach.y });
            await s.say(STORY.k1.mapCorner[2]);
            s.clue('map_corner');
            G.flag('rule_demo');
            G.actors.klo.pose = 'idle';
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
            await s.say([STORY.k1.note1, ...STORY.k1.noteKlo]);
            s.clue('note1');
            G.flag('note1_read');
        }
    });
    beat('k1_note2', {
        on: 'balk', filter: (e) => e.reason === 'thin' && e.id === 'p1-arch' && F.has('note1_read'),
        lock: false,
        async run(s) { await s.remark(STORY.k1.noteKlo2); }
    });

    beat('k1_p1', {
        on: 'inked', filter: (e) => e.id === 'p1-arch',
        lock: false,
        async run(s) { s.stinger('aha'); s.checkpoint('steppe'); }
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
        when: () => inScene('land') && inArea('branten') && F.has('p1_inked'),
        async run(s) {
            await s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloBranten.x, y: G.sceneDef.spots.kloBranten.y, pose: 'point', facing: -1 });
            await s.say(STORY.k1.wavemarksSeen);
            G.actors.klo.pose = 'notebook';
            await s.wait(0.4);
            if (!F.has('p3_t1')) hintOnce('tufts', STORY.k1.brantenTufts);
        }
    });

    beat('k1_p3', {
        when: () => inScene('land') && F.has('p3_t1') && F.has('p3_t2') && F.has('p3_t3') && inArea('ledge'),
        async run(s) {
            await s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloLedge.x - h(0.6), y: G.sceneDef.spots.kloLedge.y, pose: 'notebook', facing: 1 });
            s.stinger('discovery');
            await s.say(STORY.k1.wavemarks);
            s.clue('wave_marks');
            G.flag('p3_done');
            s.checkpoint('ledge');
        }
    });

    beat('k1_pool_klo', {
        when: () => inScene('land') && inArea('pool') && F.has('rule_demo') && !F.has('p2_open') && !done('k1_pool_klo'),
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
            await s.say(STORY.k1.mirror);
            // say what differs, so the player knows what to do next
            const lines = [];
            if (G.puz.stone !== G.sceneDef.rail.target) lines.push(STORY.k1.mirrorStone);
            if (!F.has('p2_plank')) lines.push(STORY.k1.mirrorPlank);
            if (lines.length) await s.say(lines);
            s.clue('reflection');
        }
    });

    beat('k1_arch', {
        on: 'opened', filter: (e) => e.id === 'arch',
        async run(s) {
            await s.cam({ x: G.sceneDef.spots.arch.x, y: G.sceneDef.spots.arch.y - h(1.2), zoom: 0.95, t: 0.8, hold: 0.8 });
            s.stinger('reveal');
            await s.fx('archOpen', {});
            await s.wait(0.6);
            s.camFree();
            s.checkpoint('pool');
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
            await s.remark(STORY.k1.deep);
            s.experiment('djup', 'skoldpadda');
        }
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

    let waitCool = 0;
    beat('k1_hook', {
        when: () => inScene('kelp') && inArea('overlook') && !F.has('ch1_end'),
        repeat: true,
        async run(s) {
            if (!F.has('p3_done') || !F.has('p2_open')) {
                if (G.time > waitCool) { waitCool = G.time + 20; await s.say(F.has('p3_done') ? STORY.k1.waitPool : STORY.k1.waitWaves); }
                return;
            }
            const vk = G.sceneDef.spots.veckmuren;
            await s.cam({ x: vk.x - h(4), y: h(4.5), zoom: 0.7, t: 1.4, hold: 1.8 });
            s.stinger('reveal');
            await s.say(STORY.k1.hook.slice(0, 2));
            // a thin paper figure with a ruler hurries out of sight on the white paper
            const fig = G.actors.figure;
            Object.assign(fig, { scene: 'kelp', x: vk.x - h(0.6), y: h(1.4), visible: true, pose: 'kv-walk-1', facing: 1 });
            s.sfx('rustle');
            await s.walk('figure', vk.x + h(1.5), 320);
            fig.visible = false;
            await s.say(STORY.k1.hook[2]);
            s.clue('fold'); s.clue('figure');
            s.camFree();
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
            await s.say(STORY.k2.open);
            await s.fx('paperFill', {});
            G.actors.klo.pose = 'idle';
        }
    });

    beat('k2_note2', {
        when: () => inScene('kelp') && inArea('trench') && F.has('ch2_open'),
        async run(s) { await s.say(STORY.k2.note2); s.clue('note2', { quiet: true }); }
    });

    beat('k2_lanterns', {
        on: 'schoolFollow', filter: () => !done('k2_lanterns'),
        lock: false,
        async run(s) { s.stinger('discovery'); }
    });
    beat('k2_lit', {
        on: 'lit', filter: (e) => e.id === 'vault',
        async run(s) {
            s.stinger('aha');
            await s.wait(0.6);
            await s.say(STORY.k2.lanterns);
            s.checkpoint('trench');
        }
    });

    beat('k2_leap', {
        on: 'bigLanding',
        async run(s) {
            if (F.has('final_run')) return;
            s.stinger('leap');
            await s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloUdden.x, y: G.sceneDef.spots.kloUdden.y, pose: 'stopwatch', facing: 1 });
            await s.say(STORY.k2.record);
            s.experiment('sprang', 'hast');
            s.checkpoint('udden');
        }
    });

    beat('k2_mark_land', {
        on: 'mark', filter: (e) => e.id === 'mark_land',
        async run(s) {
            s.stinger('discovery');
            s.clue('mark_land');
            await s.cam({ x: G.sceneDef.spots.cleftView.x + h(2.5), y: h(-5), zoom: 0.75, t: 1.2, hold: 1.2, lookSea: true });
            await s.say(STORY.k2.lighthouse);
            s.clue('lighthouse');
            if (!F.has('mark_sea')) await s.say(STORY.k2.halfSea);
            s.camFree();
        }
    });
    beat('k2_mark_sea', {
        on: 'mark', filter: (e) => e.id === 'mark_sea',
        async run(s) {
            s.stinger('discovery');
            s.clue('mark_sea');
            if (!F.has('mark_land')) await s.say(STORY.k2.half);
        }
    });

    beat('k2_end', {
        on: 'marksBoth',
        async run(s) {
            await s.say(STORY.k2.bothHalves);
            if (inScene('kelp')) await s.cam({ x: h(43), y: h(3.5), zoom: 0.8, t: 1.6, hold: 1.2 });
            // a glimpse of the lighthouse: the paper figure peeks and snaps a shutter shut
            await s.fx('vista', { scene: 'viken', lighthouse: true, t: 3.2, peek: true });
            await s.say(STORY.k2.end);
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
        async run(s) {
            G.flag('viken_arrived'); G.flag('gate_open');
            await s.appear('klo', { scene: 'viken', x: G.sceneDef.spots.kloShore.x, y: G.sceneDef.spots.kloShore.y, pose: 'point', facing: 1 });
            await s.cam({ x: h(24), y: h(-4), zoom: 0.62, t: 1.4, hold: 1.4 });
            await s.say(STORY.k3.arrive);
            s.camFree();
            s.checkpoint('viken');
            hintOnce('chains', STORY.k3.chains);
        }
    });

    beat('k3_klo_pier', {
        when: () => inScene('viken') && done('k3_arrive') && inArea('pier') && G.actors.klo.x < h(3),
        lock: false,
        async run(s) { await s.appear('klo', { scene: 'viken', x: G.sceneDef.spots.klo.x, y: G.sceneDef.spots.klo.y, pose: 'idle', facing: -1 }); }
    });

    beat('k3_mirror', {
        on: 'reflectionSeen', filter: (e) => e.id === 'bay',
        async run(s) {
            await s.wait(0.6);
            // look at the lighthouse and its reflection while Klo talks about them
            const lh = G.sceneDef.spots.lighthouse;
            await s.cam({ x: lh.x - h(2), y: lh.y - h(1.5), zoom: 0.62, t: 0.9, hold: 0.6 });
            await s.say(STORY.k3.mirror);
            s.camFree();
            s.checkpoint('pier');
        }
    });

    beat('k3_shutter', {
        on: 'latch', filter: (e) => /^shutter/.test(e.flag || ''),
        repeat: true, lock: false,
        async run(s) { s.stinger('aha'); }
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
            await s.appear('kv', { scene: 'viken', x: G.sceneDef.spots.kvGallery.x, y: G.sceneDef.spots.kvGallery.y, pose: 'worry', facing: -1 });
            await s.wait(0.8);
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
            await s.say(STORY.k3.talk1);
            G.actors.kv.pose = 'point'; G.actors.kv.map = 'open';
            G.flag('talk1');
        }
    });

    // =========================================================================
    // P8 and the final
    // =========================================================================
    beat('k3_line', {
        on: 'flag', filter: (e) => e.flag === 'talk_done',
        async run(s) {
            await s.fx('lineAppears', {});
            await s.say(STORY.k3.line);
            await s.cam({ x: h(12), y: h(-1.2), zoom: 0.62, t: 1.2, hold: 1.2 });
            s.camFree();
        }
    });

    beat('k3_window', {
        on: 'windowReached',
        filter: () => !F.has('p8_done'),
        when: () => inScene('viken') && F.has('p8_sea') && !F.has('p8_done') && G.checkpoint === 'lineWindow',
        async run(s) {
            const win = G.sceneDef.spots.window;
            io.save(); // preserve the completed sea half before opening the final drawing
            await s.cam({ x: win.x, y: win.y, zoom: 1.2, t: 0.8, hold: 0.9 });
            // Alva's pencil joins the two half-marks across the window (tap or trace the anchors; it can't fail)
            const getGeometry = () => {
                const anchors = [];
                for (let i = 0; i < 4; i++) { const q = io.toScreen?.(win.x - h(0.9) + i * h(0.6), win.y); if (q) anchors.push([q.x, q.y]); }
                return { anchors: anchors.length ? anchors : null };
            };
            await io.ui.draw({ prompt: UI.drawLast, ...getGeometry(), getGeometry, allowReverse: true, width: 6, color: '#3b3530' });
            G.flag('p8_done');
            s.stinger('aha');
            // Kartväktaren chooses
            Object.assign(G.actors.kv, { x: h(23.4), y: h(-0.62), visible: true, pose: 'bow', facing: 1 });
            await s.cam({ x: h(23.5), y: h(-1.0), zoom: 1.0, t: 0.8, hold: 0.3 });
            G.player.hidden = false;
            await s.say(STORY.k3.sorry);
            G.actors.kv.pose = 'unfold';
            s.stinger('unfold');
            await s.fx('unfold', {});
            G.flag('unfolded');
            s.camFree();
            await finale(s);
        }
    });

    async function finale(s) {
        // PLASK: back at her picture, time starts in the same instant
        G.flag('final_run');
        G.freeze = true;
        G.goto('land', 'start', { silent: true });
        G.actors.klo.visible = false; G.actors.kv.visible = false;
        io.audio?.setArea('quiet');
        await s.fx('cutToPicture', {});
        s.stinger('plask');
        await s.fx('plask', {});
        G.freeze = false;
        G.evening = true;
        await s.wait(2.4);
        // Galoppen över stäpperna: automatic, no fail, nothing chasing
        io.audio?.setArea('final');
        G.auto = { dir: -1, speed: 1320 };
        G.busy--; // let the gallop run with Hoppa flourishes
        G.finalRun = true;
        await new Promise((resolve) => {
            const off = G.on('bigLanding', () => { off(); resolve(); });
        });
        G.busy++;
        G.auto = null; G.finalRun = false;
        await s.wait(1.2);
        io.audio?.setArea('quiet');
        // The same distant page as Kapitel 2: the real lamp now matches its reflection.
        // Keep the player on Klippudden while the view visits the bay.
        await s.fx('vista', { scene: 'viken', lighthouse: true, hold: 1.8 });
        io.audio?.setArea('final');
        await s.appear('klo', { scene: 'land', x: G.player.x - h(1.7), y: G.sceneDef.spots.kloUdden.y, pose: 'sign-folded', facing: 1 });
        s.camFree();
        await s.say(STORY.final.conclusion);
        G.flag('conclusion');
        await s.wait(0.6);
        // home to her beach while the table covers the screen, so play resumes there after the epilogue
        await io.fx('epilogue', {
            // called once the table covers the screen
            onCovered: () => { G.actors.klo.visible = false; G.goto('land', 'start', { silent: true }); }
        });
        G.flag('ended');
        G.flag('b:k3_window');
        G.evening = false;
        G.finalRun = false;
        G.flags.delete('final_run');
        G.terrain.refresh();
        s.checkpoint('beachEnd');
        io.save();
    }

    // =========================================================================
    // After the ending: Kapplöpning mot Sköldpaddan Signe (O8). You always win.
    // =========================================================================
    const race = { active: false, done: null, wave: 0 };
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
            G.busy++;
            Object.assign(sg, { x: r.start.x - h(0.2), y: r.start.y, facing: -1, pose: 'idle', visible: true, scene: 'land' });
            await s.say(F.has('signe_race') ? STORY.after.signeAgain : STORY.after.signeGo);
            G.busy--;
            race.active = true; race.wave = 0; sg.racing = true;
            const won = await new Promise((resolve) => { race.done = resolve; });
            race.active = false;
            sg.pose = 'idle'; sg.speed = 0; sg.racing = false;
            G.busy++;
            await s.say(won ? STORY.after.signeLose : STORY.after.signeGiveUp);
            G.busy--;
            if (won) { G.flag('signe_race'); s.stinger('aha'); }
            // back to her place by the shells
            await s.walk('signe', r.signe.x, r.speed);
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
        if (!r || !inScene('land')) { race.done?.(false); return; }
        if (p.x <= r.finish) { race.done?.(true); return; }
        if (p.x > r.start.x + h(3)) { race.done?.(false); return; }
        // A gentle turtle stroll. Near the line she waits as long as the player
        // needs, so even a pause or the lightest stick movement can still win.
        const ahead = sg.x < p.x;
        const nearLine = sg.x - r.finish < h(0.8);
        if (nearLine && ahead) { sg.pose = 'wave'; sg.speed = 0; race.wave += dt; return; }
        moveSigne(Math.max(r.finish + h(0.2), sg.x - r.speed * dt), dt);
        sg.facing = -1; sg.pose = 'walk';
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
            await s.say(STORY.k3.talk2);
            G.flag('talk2');
            // Klo climbs onto the map and taps its shoreline
            Object.assign(G.actors.klo, { x: G.actors.kv.x - h(0.5), y: G.actors.kv.y - h(0.45), pose: 'point', visible: true, scene: 'viken' });
            s.sfx('crabclick');
        }
    });
    beat('_talk3', {
        manual: true,
        async run(s) {
            await s.say(STORY.k3.talk3);
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
        if (running) return;
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
    function objective() {
        if (F.has('ended')) {
            if (F.has('signe_met') && !F.has('signe_race')) return 'signe';
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
            if (inScene('kelp')) return !F.has('mark_sea') ? (!F.has('p5_lit') ? 'p5' : 'p6') : 'p4';
            if (!F.has('mark_land')) return 'p4';
            return 'toSea';
        }
        // Kapitel 1
        if (!F.has('klo_hidden')) return 'explore';
        if (!F.has('klo_ja')) return 'hide';
        if (inScene('kelp')) return 'hook';
        if (F.has('p2_open') && F.has('p3_done')) return 'kelp';
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
        return describeGuidance(G, { objective: key, touch: io.touch, ...io.settings?.(), p8: key === 'p8' ? p8Progress(G) : undefined });
    }
    function goal() { return guidance().goal; }
    const PROGRESS = new Set(['inked', 'grow', 'opened', 'latch', 'lit', 'mark', 'flattened', 'push', 'reflectionSeen', 'scene', 'bigLanding', 'streckDone', 'ratchet', 'taste', 'pickup', 'colorin']);
    G.on('*', (type) => { if (PROGRESS.has(type)) { hintState.t = 0; hintState.level = 0; hintState.said = 0; } });
    G.on('pickup', () => { if (objective() === 'freeComplete') io.guide?.hint(HINTS.freeComplete.note); });

    /**
     * When the player seems stuck, Klo helps without stopping play: first a nudge (the margin note),
     * then the plain answer with a mark on the spot and Alva's gull circling it. Help level scales the waits.
     */
    function hints(dt) {
        const cue = guidance(), key = cue.key;
        if (key !== hintState.key) { hintState.key = key; hintState.t = 0; hintState.level = 0; hintState.said = 0; }
        if (G.busy || running) return;
        hintState.t += dt;
        const mult = G.helpLevel === 'easy' ? 0.6 : G.helpLevel === 'hard' ? 2 : 1;
        const H = cue.hint;
        if (!H) return;
        const first = 30 * mult, second = 75 * mult, again = 60 * mult;
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
        const text = controlTip(id, { touch: io.touch, ...io.settings?.() });
        if (F.has('tip_' + id) || !text) return;
        F.add('tip_' + id);
        io.guide?.tip(text, { at: io.touch || id === 'journal' ? TIP_AT[id] : null });
    }
    /** a one-off hint from Klo (remembered in the save) */
    function hintOnce(id, text, who = 'klo') {
        if (F.has('hint_' + id) || !text) return;
        F.add('hint_' + id);
        io.guide?.hint(text, who);
    }

    // ---- small guidance moments (non-blocking) ------------------------------------------------
    G.on('inked', (e) => {
        if (e.id === 'teach-step') { hintOnce('teach', STORY.k1.teachStreck); tipOnce('dashed'); }
        if (e.id === 'p2-plank' && !F.has('p2_open')) hintOnce('plank', STORY.k1.plankDone);
    });
    // the same refusal again and again: Klo steps in with the plain answer for what you are doing now
    const balks = { key: '', n: 0, t: 0 };
    G.on('balk', (e) => {
        if (e.reason === 'thin' && !F.has('p1_inked')) hintOnce('thin', STORY.k1.firstThin);
        if (e.reason === 'slow' && e.id === 'sprang-p4') hintOnce('leap', STORY.k2.leapHint);
        if (e.id === 'klipp-edge' && F.has('p4_leap') && !F.has('p4_plank')) hintOnce('rope', STORY.k2.ropeHint);
        const key = e.reason + ':' + (e.id || '');
        if (key !== balks.key || G.time - balks.t > 25) { balks.key = key; balks.n = 0; }
        balks.n++; balks.t = G.time;
        if (balks.n === 3 && e.reason !== 'paper' && e.reason !== 'fold' && e.reason !== 'gate') {
            const cue = guidance();
            if (cue.hint) G.later(1.2, () => {
                const current = guidance();
                if (current.key === cue.key) io.guide?.hint(current.hint.sketch || current.hint.note, 'klo', 9000);
            });
        }
    });
    G.on('push', (e) => { if (e.notch === G.sceneDef.rail?.target) hintOnce('stone', STORY.k1.stoneDone); });
    // fluff that found no tuft: the sköldhäst wonders (twice at most, so it never nags)
    let fluffMisses = 0;
    G.on('fluffMiss', (e) => { if (fluffMisses++ < 2) io.guide?.think(e.dir > 0 ? STORY.k1.fluffWrongWay : STORY.k1.fluffMiss); });
    G.on('grow', (e) => {
        if (e.decor) hintOnce('fluff', STORY.k1.teachFluff);
        else hintOnce('ramp', STORY.k1.rampGrew);
    });
    G.on('swimStart', () => { if (inScene('kelp') || inScene('viken')) tipOnce('swim'); });
    function watch() {
        const p = P();
        if (!G.story || G.busy) return;
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
        if (inScene('kelp') && p.inVortex && !p.hidden && !F.has('p6_flat')) hintOnce('whirl', STORY.k2.whirlHint);
        // hidden by the fish but lying still, outside the current that would carry the shell into the vault
        if (inScene('kelp') && F.has('ch2_open') && !F.has('p5_lit') && p.hidden && p.mode === 'swim' && !p.inLane && G.puz.school.state === 'follow') hintOnce('laneHide', STORY.k2.laneHide);
        if (inScene('viken') && F.has('viken_arrived') && !F.has('lamp_lit')) {
            if (!F.has('shutter1') && p.surface?.id === 'pier' && p.x > h(4) && p.x < h(22)) hintOnce('drum', STORY.k3.drumHint);
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
        objective, goal, guidance, tipOnce, hintOnce, tapKlo,
        hintInfo() {
            const cue = guidance();
            return { key: cue.objective, level: hintState.level, spot: cue.target, text: cue.hint };
        },
        running: () => !!running,
        herText: HER_TEXT, family: FAMILY, balkText: BALK
    };
}
