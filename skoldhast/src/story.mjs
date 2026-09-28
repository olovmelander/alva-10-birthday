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
import { STORY, HINTS, JOURNAL, BALK, HER_TEXT, FAMILY, UI } from './content/sv.mjs';

const h = (v) => v * HL;

export function createStory(G, io) {
    const F = G.flags;
    const beats = [];
    let running = null;
    const queue = [];
    const hintState = { key: null, t: 0, level: 0, shown: 0 };

    // --- actors -------------------------------------------------------------------
    G.actors.klo = { id: 'klo', scene: null, x: 0, y: 0, pose: 'idle', facing: -1, visible: false, pop: 0, walk: null, holding: null };
    G.actors.kv = { id: 'kv', scene: null, x: 0, y: 0, pose: 'stand', facing: -1, visible: false, walk: null };
    G.actors.figure = { id: 'figure', scene: null, x: 0, y: 0, pose: 'kv-walk-1', facing: 1, visible: false, walk: null };

    const say = (lines) => io.ui.say(Array.isArray(lines[0]) ? lines : [lines]);
    const api = {
        G, F,
        say,
        choice: (labels) => io.ui.choice(labels),
        wait: (s) => G.wait(s),
        flag: (f) => G.flag(f),
        has: (f) => F.has(f),
        fx: (name, data) => io.fx(name, data || {}),
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
            return new Promise((resolve) => { a.walk = { x, speed, resolve }; });
        },
        clue(key) { if (!F.has('clue_' + key)) { G.flag('clue_' + key); io.ui.toast(JOURNAL.clues + ': ' + short(JOURNAL.clueText[key])); } },
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
        report: (n) => io.ui.report(n)
    };
    function short(t) { return t && t.length > 70 ? t.slice(0, 67) + '…' : t; }

    function beat(id, def) { beats.push({ id, ...def }); }
    const done = (id) => F.has('b:' + id);
    const inScene = (s) => G.sceneId === s;
    const inArea = (a) => G.areas.has(a);
    const P = () => G.player;

    // =========================================================================
    // KAPITEL 1
    // =========================================================================
    beat('k1_enter', {
        when: () => inScene('land') && F.has('intro_done') && !F.has('ended') && !done('k1_enter'),
        lock: false,
        async run(s) {
            s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloBeach.x, y: G.sceneDef.spots.kloBeach.y, pose: 'stopwatch', facing: 1 });
            s.checkpoint('start');
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
            G.actors.klo.x = hole.x; G.actors.klo.y = hole.y; G.actors.klo.pose = 'peek'; G.actors.klo.inHole = true;
            s.sfx('crabclick');
            s.camFree();
            G.flag('klo_hidden');
        }
    });

    // Göm dig: the crab comes out only for a hidden shell
    let nearHoleT = 0;
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
        async run(s) { await s.say(STORY.k1.clouds); }
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
        async run(s) { await s.say(STORY.k1.noteKlo2); }
    });

    beat('k1_p1', {
        on: 'inked', filter: (e) => e.id === 'p1-arch',
        lock: false,
        async run(s) { s.stinger('aha'); s.checkpoint('steppe'); }
    });

    beat('k1_glimpse', {
        on: 'glimpse', filter: (e) => e.id === 'glimpse1',
        async run(s) {
            await s.cam({ x: G.sceneDef.spots.glimpse1.x, y: G.sceneDef.spots.glimpse1.y + h(1.2), zoom: 0.85, t: 0.8, hold: 1.2 });
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
        }
    });
    beat('k1_whisper', {
        when: () => inScene('kelp') && G.player.hidden && G.player.anchored && !done('k1_whisper'),
        async run(s) {
            G.actors.klo.pose = 'whisper';
            await s.say(STORY.k1.whisper);
            G.actors.klo.pose = 'idle';
        }
    });
    beat('k1_fishrock', {
        on: 'shyOut', filter: (e) => e.kind === 'fish' && G.player.hidden && inScene('kelp'),
        async run(s) {
            await s.say(STORY.k1.fishRock);
            s.experiment('gom', 'skoldpadda');
        }
    });
    beat('k1_deep', {
        on: 'experiment', filter: (e) => e.id === 'djup',
        async run(s) {
            await s.say(STORY.k1.deep);
            s.experiment('djup', 'skoldpadda');
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
        async run(s) { await s.say(STORY.k2.note2); s.clue('note2'); }
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
            await s.fx('vista', { scene: 'viken', x: h(29.8), y: h(-7.2), zoom: 0.9, t: 3.2, peek: true });
            await s.say(STORY.k2.end);
            s.camFree();
            G.flag('ch2_end');
            G.chapterFlags();
            s.stinger('chapter');
            await s.report(2);
            io.save();
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
            await s.wait(0.8);
            await s.say(STORY.k3.mirror);
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
        async run(s) {
            const win = G.sceneDef.spots.window;
            await s.cam({ x: win.x, y: win.y, zoom: 1.2, t: 0.8, hold: 0.9 });
            // Alva's pencil joins the two half-marks across the window (tap or trace the anchors; it can't fail)
            const anchors = [];
            for (let i = 0; i < 4; i++) { const q = io.toScreen?.(win.x - h(0.9) + i * h(0.6), win.y); if (q) anchors.push([q.x, q.y]); }
            await io.ui.draw({ prompt: UI.drawLast, anchors: anchors.length ? anchors : null, width: 6, color: '#3b3530' });
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
        await s.cam({ x: h(9), y: h(-6.5), zoom: 0.6, t: 1.5, hold: 2.0, lookSea: true });
        io.audio?.setArea('final');
        await s.appear('klo', { scene: 'land', x: G.sceneDef.spots.kloUdden.x, y: G.sceneDef.spots.kloUdden.y, pose: 'sign-folded', facing: 1 });
        s.camFree();
        await s.say(STORY.final.conclusion);
        G.flag('conclusion');
        await s.wait(0.6);
        await io.fx('epilogue', {});
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
                if (!F.has('talk2')) out.push({ id: 'talk2', label: 'Prata', dist: d / HL, run: () => start(beats.find((b) => b.id === '_talk2')) });
                else out.push({ id: 'talk3', label: 'Prata', dist: d / HL, run: () => start(beats.find((b) => b.id === '_talk3')) });
            }
        }
        if (inScene('land')) {
            const n = G.sceneDef.spots.note1;
            const d = Math.abs(p.x - n.x);
            if (d < h(0.9) && F.has('note1_read')) out.push({ id: 'read', label: 'Läs', dist: d / HL + 0.3, run: () => say([STORY.k1.note1]) });
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
            if (!a.walk) continue;
            const d = a.walk.x - a.x, st = a.walk.speed * dt;
            if (Math.abs(d) <= st) { a.x = a.walk.x; const r = a.walk.resolve; a.walk = null; r(); }
            else { a.x += Math.sign(d) * st; a.facing = Math.sign(d); }
        }
        hints(dt);
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
        if (F.has('ended')) return 'free';
        if (inScene('viken')) {
            if (!F.has('lamp_lit')) return 'p7';
            if (!F.has('talk_done')) return 'talk';
            return 'p8';
        }
        if (F.has('ch2_open') && !F.has('ch2_end')) {
            if (!F.has('mark_land') && (inScene('land') || !F.has('p5_lit'))) {
                if (inScene('land')) return 'p4';
            }
            if (inScene('kelp')) return !F.has('p5_lit') ? 'p5' : !F.has('mark_sea') ? 'p6' : 'p4';
            return 'p4';
        }
        if (F.has('ch1_end')) return F.has('ch3_open') ? 'p7' : 'free';
        if (!F.has('klo_ja')) return F.has('klo_hidden') ? 'hide' : 'explore';
        if (inScene('kelp')) return 'hook';
        if (F.has('p2_open') && F.has('p3_done')) return 'kelp';
        if (!F.has('p1_inked')) return 'p1';
        if (!F.has('p3_done') && G.player.x < h(80)) return F.has('p3_t1') && !F.has('p3_t2') ? 'p3b' : 'p3';
        if (!F.has('p2_open')) return 'p2';
        return F.has('p3_done') ? 'kelp' : 'p3';
    }

    const HINT_SPOTS = {
        hide: () => inScene('land') && { x: G.sceneDef.spots.kloHole.x, y: G.sceneDef.spots.kloHole.y },
        p1: () => inScene('land') && { x: h(80.1), y: h(-0.66) },
        p3: () => inScene('land') && { x: h(52.3), y: h(-0.8) },
        p3b: () => inScene('land') && { x: h(44.6), y: h(-1.9) },
        p2: () => inScene('land') && { x: h(101.6), y: h(-0.3) },
        kelp: () => inScene('land') && { x: h(101.9), y: h(-0.3) },
        hook: () => inScene('kelp') && { x: h(20.8), y: h(3.4) },
        p4: () => inScene('land') && { x: h(27.5), y: h(-6.4) },
        p5: () => inScene('kelp') && { x: h(22.8), y: h(7.8) },
        p6: () => inScene('kelp') && { x: h(36), y: h(8.4) },
        p7: () => inScene('viken') && { x: h(19.5), y: h(-0.62) },
        talk: () => inScene('viken') && { x: G.actors.kv.x, y: G.actors.kv.y },
        p8: () => inScene('viken') && { x: h(24.1), y: h(-0.62) }
    };
    const PROGRESS = new Set(['inked', 'grow', 'opened', 'latch', 'lit', 'mark', 'flattened', 'push', 'reflectionSeen', 'scene', 'bigLanding', 'streckDone']);
    G.on('*', (type) => { if (PROGRESS.has(type)) { hintState.t = 0; hintState.level = 0; } });

    function hints(dt) {
        const key = objective();
        if (key !== hintState.key) { hintState.key = key; hintState.t = 0; hintState.level = 0; }
        if (G.busy) return;
        hintState.t += dt;
        const mult = G.helpLevel === 'easy' ? 0.5 : G.helpLevel === 'hard' ? 2 : 1;
        const lvl = hintState.t > 90 * mult ? 1 : hintState.t > 40 * mult ? 0.5 : 0;
        if (lvl >= 1 && hintState.level < 1) { hintState.level = 1; io.ui.pulse('journal'); }
        else if (lvl >= 0.5 && hintState.level < 0.5) hintState.level = 0.5;
    }

    return {
        step, actions,
        objective,
        hintInfo() {
            const key = hintState.key || objective();
            const spot = HINT_SPOTS[key]?.();
            return { key, level: hintState.level, spot: spot || null, text: HINTS[key] };
        },
        running: () => !!running,
        herText: HER_TEXT, family: FAMILY, balkText: BALK
    };
}
