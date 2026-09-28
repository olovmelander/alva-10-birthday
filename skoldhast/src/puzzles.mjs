/*
 * Sköldhästen – puzzles and world objects (pure logic, no rendering).
 *
 * Works on the game state G (see game.mjs). Each step it reads the simulation's
 * events and the player's state, moves puzzle objects, sets flags, and emits
 * game events on G.emit(type, data) for the story, the view and the sound.
 *
 * Every puzzle follows the plan's state-machine rules: a commit point (a flag
 * that never resets), objects before it return to their start on reload or
 * when the player leaves the area, and nothing can softlock.
 */
import { HL, C, cond, nearestOnLine } from './sim.mjs';

const near = (a, b, r) => Math.abs(a - b) <= r;

export function createPuzzleState() {
    return {
        pools: {},            // id → { ripple, still }
        stone: 0,             // P2 notch
        drums: {},            // id → count
        plates: {},           // id → held seconds
        clumps: {},           // id → regrow timer (0 = full)
        fluff: [],            // flying fluff for the view: { x, y, tx, ty, t, dur }
        school: { state: 'home', x: 0, y: 0, t: 0 },
        shy: {},              // id → out 0..1
        shells: {},           // id → true once rung
        pencils: 0,           // carried, unused pencils
        glimpse: {},          // id → 0..1 (lying down / hiding)
        pinwheels: {},        // id → spin speed
        inkT: {},             // dashed id → 0..1 while inking
        deepest: 0,           // for Djupmätaren
        neighs: { land: false, water: false },
        tally: 0,             // Klo's signs: <0 sköldpadda, >0 häst
        lastArea: null
    };
}

/** Reset puzzle objects that are not committed (after load or leaving an area). */
export function resetUncommitted(G) {
    const S = G.puz;
    if (!G.flags.has('p2_stone')) S.stone = 0;
    for (const k of Object.keys(S.drums)) {
        const d = findDrum(G, k);
        if (d && !G.flags.has(d.flag)) S.drums[k] = 0;
    }
    for (const k of Object.keys(S.plates)) S.plates[k] = 0;
    if (!G.flags.has('p5_lit')) S.school.state = 'home';
}

function findDrum(G, id) {
    for (const sc of Object.values(G.scenes)) for (const d of sc.drums || []) if (d.id === id) return d;
    return null;
}

// ---------------------------------------------------------------------------
// Per-step update
// ---------------------------------------------------------------------------
export function stepPuzzles(G, events, dt) {
    const S = G.puz, p = G.player, sc = G.sceneDef, F = G.flags;
    const hidden = p.hidden && p.hide > 0.9;
    const galloping = (p.mode === 'ground' || p.mode === 'streck') && Math.abs(p.vx) >= C.gallopMin;

    for (const e of events) {
        switch (e.type) {
            case 'hoof':
                // Trumma: gallop footfalls on hollow planks turn ratchets
                for (const d of sc.drums || []) {
                    if (F.has(d.flag) || !cond(d.when, F)) continue;
                    if (p.surface?.id !== d.surface || p.x < d.x0 || p.x > d.x1) continue;
                    if (e.speed >= C.gallopMin) {
                        S.drums[d.id] = (S.drums[d.id] || 0) + 1;
                        G.emit('ratchet', { id: d.id, n: S.drums[d.id], of: d.notches });
                        if (S.drums[d.id] >= d.notches) { F.add(d.flag); G.emit('latch', { id: d.id, flag: d.flag }); }
                    } else G.emit('wobble', { id: d.id });
                }
                break;
            case 'streckDone':
                G.emit('inked', { id: e.id, flag: e.flag });
                break;
            case 'land':
                if (e.id === 'sprang-p4') { F.add('p4_leap'); G.emit('bigLanding', { id: e.id }); }
                // hoppställen: rewards on top
                for (const hs of sc.hoppstallen || []) {
                    if (near(p.x, hs.x, h(0.45)) && near(p.y, hs.y, h(0.2))) hoppReward(G, hs);
                }
                break;
            case 'vortexEye':
                break;
            case 'laneEnd':
                if (e.id === 'lane-vault' && hidden) {
                    if (S.school.state === 'follow' && !F.has('p5_lit')) { F.add('p5_lit'); G.emit('lit', { id: 'vault' }); }
                }
                if (e.id === 'pipe' && hidden) G.emit('pipeTop', {});
                if (e.id === 'p8-lane' && hidden && !F.has('p8_done')) G.emit('windowReached', {});
                break;
            case 'balk':
                G.emit('balk', e);
                break;
        }
    }

    // --- mirror pools: ripples and stillness --------------------------------
    for (const w of G.terrain.waters) {
        if (!w.mirror) continue;
        const P = S.pools[w.id] ||= { ripple: 1, still: false };
        const cx = Math.min(Math.max(p.x, w.x0), w.x1);
        const d = Math.abs(p.x - cx) + Math.max(0, Math.abs(p.y - w.top) - h(1.5));
        let target;
        if (G.sceneDef.mirrorZone && w.id === 'bay') {
            const z = G.sceneDef.mirrorZone;
            const onPier = p.surface?.id === 'pier' && p.x >= z.x0 && p.x <= z.x1;
            target = onPier ? (hidden ? 0 : 0.35 * p.moveNoise + 0.25) : 0.6;
        } else target = d < h(2.2) ? (hidden ? 0 : Math.max(0.3, p.moveNoise)) : 0.25;
        P.ripple += (target - P.ripple) * Math.min(1, dt * (target < P.ripple ? 2.6 : 5));
        const wasStill = P.still;
        P.still = P.ripple < 0.06;
        if (P.still && !wasStill) G.emit('still', { id: w.id });
    }

    // --- P2 Spegelpölen -----------------------------------------------------
    if (sc.id === 'land' && !F.has('p2_open')) {
        if (S.pools.pool?.still && !F.has('p2_seen')) { F.add('p2_seen'); G.emit('reflectionSeen', { id: 'pool' }); }
        if (F.has('p2_plank') && S.stone === sc.rail.target) {
            F.add('p2_stone'); F.add('p2_open');
            G.emit('opened', { id: 'arch' });
        }
    }

    // --- P3: backsippa fluff (Galoppvind) -----------------------------------
    for (const c of sc.clumps || []) {
        if (S.clumps[c.id] > 0) { S.clumps[c.id] = Math.max(0, S.clumps[c.id] - dt); continue; }
        const crossed = (p.px - c.x) * (p.x - c.x) <= 0 && p.px !== p.x;
        if (!crossed || !galloping || !near(p.y, c.y, h(0.3))) continue;
        const dir = Math.sign(p.x - p.px);
        S.clumps[c.id] = 4;
        const tx = c.x + dir * h(5);
        let target = null;
        for (const t of sc.tussocks || []) {
            if (F.has(t.flag)) continue;
            if (Math.abs(t.x - tx) < h(0.85) && t.y <= c.y + h(0.3) && t.y >= c.y - h(1.45)) { target = t; break; }
        }
        const ty = target ? target.y : c.y - h(0.2);
        S.fluff.push({ x: c.x, y: c.y - h(0.5), tx: target ? target.x : tx, ty, t: 0, dur: 1.3, target: target?.id });
        G.emit('fluff', { id: c.id, dir });
        if (target) {
            // the fluff lands a moment later
            G.later(1.25, () => {
                if (F.has(target.flag)) return;
                F.add(target.flag); G.terrain.dirty = true; G.terrain.refresh();
                G.emit('grow', { id: target.id, flag: target.flag, decor: !!target.decor });
            });
        }
    }
    for (const f of S.fluff) f.t += dt / f.dur;
    S.fluff = S.fluff.filter((f) => f.t < 1);

    // pinwheels spin in the gallop wind
    for (const pw of sc.pinwheels || []) {
        const d = Math.abs(p.x - pw.x);
        S.pinwheels[pw.id] = Math.max((S.pinwheels[pw.id] || 0) * Math.exp(-dt * 0.6), d < h(1.2) ? Math.abs(p.vx) / 100 : 0);
    }

    // --- shy creatures come out for a hidden shell ------------------------------
    for (const s of sc.shy || []) {
        const d = Math.hypot(p.x - s.x, p.y - s.y);
        const want = hidden && d < h(4) ? 1 : 0;
        const cur = S.shy[s.id] ?? 0;
        const rate = want ? dt / 1.2 : dt * 3;
        S.shy[s.id] = want ? Math.min(1, cur + rate) : Math.max(0, cur - rate);
        if (cur < 1 && S.shy[s.id] >= 1) G.emit('shyOut', { id: s.id, kind: s.kind });
    }

    // --- P5: the lantern-fish school ---------------------------------------------
    if (sc.school && F.has('ch2_open') && !F.has('p5_lit')) {
        const sch = S.school;
        const home = sc.school.home;
        const dHome = Math.hypot(p.x - home.x, p.y - home.y);
        if (sch.state === 'home') {
            sch.x = home.x; sch.y = home.y;
            if (hidden && dHome < h(4)) { sch.t += dt; if (sch.t > 1.2) { sch.state = 'follow'; G.emit('schoolFollow', {}); } }
            else sch.t = 0;
        } else if (sch.state === 'follow') {
            sch.x += (p.x - sch.x) * Math.min(1, dt * 1.5);
            sch.y += (p.y - h(0.3) - sch.y) * Math.min(1, dt * 1.5);
            if (!hidden && Math.hypot(p.vx, p.vy) > 80) { sch.state = 'home'; sch.t = 0; G.emit('schoolScatter', {}); }
        }
    } else if (sc.school && F.has('p5_lit')) { S.school.state = 'lit'; S.school.x = sc.school.lit.x; S.school.y = sc.school.lit.y; }

    // --- flaps and paper corners: a hidden, resting shell flattens them -----------
    if (hidden && p.mode === 'swim' && p.resting) {
        for (const fl of sc.flaps || []) {
            if (!F.has(fl.flag) && Math.hypot(p.x - fl.x, p.y - fl.y) < h(0.6)) { F.add(fl.flag); G.emit('flattened', { id: fl.id }); }
        }
    }
    if (hidden && p.inVortex && Math.hypot(p.x - p.inVortex.x, p.y - p.inVortex.y) < p.inVortex.eye + 10) {
        for (const cn of sc.corners || []) {
            if (!F.has(cn.flag)) {
                F.add(cn.flag); F.add('mark_sea');
                G.terrain.dirty = true; G.terrain.refresh();
                G.emit('flattened', { id: cn.id }); G.emit('mark', { id: 'mark_sea' });
                checkMarks(G);
            }
        }
    }

    // --- pressure plates ------------------------------------------------------------
    for (const pl of sc.plates || []) {
        if (F.has(pl.flag)) continue;
        const on = hidden && p.mode === 'swim' && p.resting && Math.abs(p.x - pl.x) < pl.w / 2 && Math.abs(p.y - pl.y) < h(0.4);
        S.plates[pl.id] = on ? (S.plates[pl.id] || 0) + dt : 0;
        if (on && S.plates[pl.id] >= pl.hold) { F.add(pl.flag); G.emit('latch', { id: pl.id, flag: pl.flag }); }
    }

    // --- P4: landmark on Klippudden ---------------------------------------------------
    if (sc.id === 'land' && F.has('p4_leap') && !F.has('mark_land')) {
        const lm = sc.spots.landmark;
        if (Math.abs(p.x - lm.x) < h(0.9) && p.y < h(-3.5)) { F.add('mark_land'); G.emit('mark', { id: 'mark_land' }); checkMarks(G); }
    }

    // --- P7: three shutters → the lamp ---------------------------------------------------
    if (sc.id === 'viken' && !F.has('lamp_lit') && F.has('shutter1') && F.has('shutter2') && F.has('shutter3')) {
        F.add('lamp_lit'); G.emit('lampLit', {});
    }
    if (sc.id === 'viken' && sc.mirrorZone && S.pools.bay?.still && !F.has('p7_seen')) { F.add('p7_seen'); G.emit('reflectionSeen', { id: 'bay' }); }

    // --- P8: the three land segments --------------------------------------------------------
    if (sc.id === 'viken' && F.has('talk_done') && !F.has('p8_land') && F.has('p8_s1') && F.has('p8_s2') && F.has('p8_s3')) {
        F.add('p8_land'); G.terrain.dirty = true; G.terrain.refresh(); G.emit('p8Land', {});
    }

    // --- pencils (färgpennor) lying in the open ---------------------------------------------
    for (const pc of sc.pencils || []) {
        const got = F.has('penna_' + pc.id);
        if (got) continue;
        const onHopp = (sc.hoppstallen || []).some((hs) => hs.pencil === pc.id);
        if (onHopp) continue; // those are collected by landing on top
        if (Math.abs(p.x - pc.x) < h(0.4) && Math.abs(p.y - pc.y) < h(0.5)) pickPencil(G, pc);
    }

    // --- Djupmätaren: the deepest dive ------------------------------------------------------
    if (p.mode === 'swim' && G.sceneDef.id !== 'land') {
        const depth = (p.y - (p.water?.top || 0)) / HL;
        if (depth > S.deepest) S.deepest = depth;
        if (depth > 4.6 && !F.has('exp_djup')) { F.add('exp_djup'); G.emit('experiment', { id: 'djup', value: depth }); }
    }

    // --- flock glimpses ------------------------------------------------------------------------
    for (const g of sc.glimpses || []) {
        const cur = S.glimpse[g.id] || 0;
        const inSpot = hidden && p.x > g.spot.x0 && p.x < g.spot.x1;
        if (inSpot && !F.has(g.id)) { F.add(g.id); G.emit('glimpse', { id: g.id }); }
        S.glimpse[g.id] = Math.min(1, cur + dt * (F.has(g.id) ? 0.5 : 0));
    }
    // the first glimpse on the Galoppbanan ridge lies down as you approach
    if (sc.id === 'land') {
        const gp = sc.spots.glimpse1;
        const d = Math.abs(p.x - gp.x);
        const cur = S.glimpse.glimpse1 || 0;
        S.glimpse.glimpse1 = d < h(6) ? Math.min(1, cur + dt / 1.5) : cur;
        if (!F.has('glimpse1') && d < h(6) && p.y > h(-2)) { F.add('glimpse1'); G.emit('glimpse', { id: 'glimpse1' }); }
    }
}

function h(v) { return v * HL; }

function checkMarks(G) {
    if (G.flags.has('mark_land') && G.flags.has('mark_sea') && !G.flags.has('marks_both')) {
        G.flags.add('marks_both');
        G.terrain.dirty = true; G.terrain.refresh();
        G.emit('marksBoth', {});
    }
}

function hoppReward(G, hs) {
    const F = G.flags;
    if (F.has('hopp_' + hs.id)) {
        if (hs.reward === 'shell') G.emit('shellNote', { note: hs.note });
        return;
    }
    F.add('hopp_' + hs.id);
    G.emit('hoppReward', { id: hs.id, reward: hs.reward });
    if (hs.reward === 'penna') {
        const pc = (G.sceneDef.pencils || []).find((q) => q.id === hs.pencil);
        if (pc) pickPencil(G, pc);
    } else if (hs.reward === 'shell') G.emit('shellNote', { note: hs.note });
}

function pickPencil(G, pc) {
    G.flags.add('penna_' + pc.id);
    G.puz.pencils += 1;
    G.emit('pickup', { id: pc.id, count: countPencils(G) });
}

export function countPencils(G) {
    let n = 0;
    for (const f of G.flags) if (f.startsWith('penna_')) n++;
    return n;
}
export function totalPencils(G) {
    let n = 0;
    for (const sc of Object.values(G.scenes)) n += (sc.pencils || []).length;
    return n;
}

// ---------------------------------------------------------------------------
// Context actions (the Hoppa button changes label near things)
// ---------------------------------------------------------------------------
/**
 * Returns the best context action here, or null (→ the button says Hoppa).
 * { id, label, run() }
 */
export function contextAction(G) {
    const p = G.player, sc = G.sceneDef, F = G.flags, S = G.puz;
    if (G.busy) return null;
    const slow = Math.abs(p.vx) < 520;
    if (!slow || p.mode === 'air' || p.mode === 'leap' || p.mode === 'streck') return null;
    const cands = [];
    const add = (dist, a) => cands.push({ dist, ...a });

    // NPC talk and reading notes come from the story
    for (const a of G.storyActions()) add(a.dist ?? 0.1, a);

    if (p.mode === 'ground' && !p.hidden) {
        // exits with an action (Vattenporten)
        for (const ex of sc.exits || []) {
            if (!ex.action || !cond(ex.when, F)) continue;
            if (p.x >= ex.x0 && p.x <= ex.x1) add(0.2, { id: 'exit', label: ex.action, run: () => G.goto(ex.to, ex.spawn) });
        }
        // P2 stone: Knuffa one notch in the facing direction
        if (sc.rail && !F.has('p2_open')) {
            const sx = sc.rail.x0 + S.stone * sc.rail.step;
            const d = (sx - p.x) * p.facing;
            if (d > -h(0.2) && d < h(1.1)) {
                const next = S.stone + p.facing;
                if (next >= 0 && next <= sc.rail.notches) add(Math.abs(d) / HL, { id: 'knuffa', label: 'Knuffa', run: () => { S.stone = next; G.emit('push', { notch: next }); } });
            }
        }
        // ropes (P4 plank) and pull ropes (P7 shutter 3)
        for (const r of sc.ropes || []) {
            if (F.has(r.flag) || !cond(r.needs, F)) continue;
            if (Math.abs(p.x - r.x) < h(1.3) && Math.abs(p.y - r.y) < h(0.6)) add(Math.abs(p.x - r.x) / HL, { id: 'dra', label: 'Dra', run: () => { F.add(r.flag); G.terrain.dirty = true; G.terrain.refresh(); G.emit('pulled', { id: r.id }); } });
        }
        for (const r of sc.pullRopes || []) {
            if (F.has(r.flag)) continue;
            if (Math.abs(p.x - r.x) < h(1.1) && Math.abs(p.y - r.y) < h(0.6)) add(Math.abs(p.x - r.x) / HL, { id: 'dra', label: 'Dra', run: () => { F.add(r.flag); G.emit('pulled', { id: r.id }); G.emit('latch', { id: r.id, flag: r.flag }); } });
        }
        for (const st of sc.stairs || []) {
            if (Math.abs(p.x - st.x) < h(1.2) && Math.abs(p.y - st.y) < h(0.6)) add(0.5, { id: 'stair', label: st.label, run: () => G.stair(st) });
        }
        // Färglägg: grey props, with a pencil in the pocket
        for (const pc of sc.pencils || []) {
            if (!F.has('penna_' + pc.id) || F.has('color_' + pc.id)) continue;
            const at = pc.propAt;
            if (Math.abs(p.x - at.x) < h(1.1) && Math.abs(p.y - at.y) < h(0.8)) add(Math.abs(p.x - at.x) / HL, { id: 'farglagg', label: 'Färglägg', run: () => { F.add('color_' + pc.id); G.emit('colorin', { id: pc.id, prop: pc.prop }); } });
        }
        // Skaka: wet and standing still
        if (p.wet > 0 && Math.abs(p.vx) < 40) add(1.5, { id: 'skaka', label: 'Skaka', run: () => G.shake() });
    }
    // Smaktestet: a mouthful of steppe grass on land, a bite of kelp in the sea (after Klo's "Ja")
    if (F.has('klo_ja') && !F.has('exp_smak') && !p.hidden && (p.mode === 'ground' || p.mode === 'swim')) {
        for (const t of sc.tastes || []) {
            const flag = 'ate_' + t.kind;
            if (F.has(flag) || !cond(t.when, F)) continue;
            if ((t.kind === 'kelp') !== (p.mode === 'swim')) continue;
            if (Math.abs(p.x - t.x) < h(0.8) && Math.abs(p.y - t.y) < h(1.0)) {
                add(Math.abs(p.x - t.x) / HL + 0.3, { id: 'taste', label: 'Smaka', run: () => { F.add(flag); G.emit('taste', { kind: t.kind, x: t.x, y: t.y }); } });
            }
        }
    }
    if (!cands.length) return null;
    cands.sort((a, b) => a.dist - b.dist);
    return cands[0];
}

/** Skaka rings the shells within reach (Snäckklockspelet). */
export function shakeShells(G) {
    const sc = G.sceneDef, S = G.puz, p = G.player;
    let rung = null;
    for (const s of sc.shells || []) {
        if (Math.abs(s.x - p.x) < h(0.7)) {
            S.shells[s.id] = true;
            rung = s;
            G.emit('shellNote', { note: s.note, id: s.id });
        }
    }
    const all = (sc.shells || []).length && (sc.shells || []).every((s) => S.shells[s.id]);
    if (all && !G.flags.has('shells_tune')) {
        G.flags.add('shells_tune');
        G.later(0.6, () => G.emit('shellTune', {}));
    }
    return rung;
}

export { nearestOnLine };
