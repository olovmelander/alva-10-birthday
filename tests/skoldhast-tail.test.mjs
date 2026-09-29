// The tail (a verlet chain in rig.mjs) through the real sim: lying hidden, long falls, landings,
// display rates and teleports.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STEP, HL, Terrain, createPlayer, stepPlayer, snapshot, heightOn } from '../skoldhast/src/sim.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';
import { createAnimator } from '../skoldhast/src/rig.mjs';
const rig = JSON.parse(readFileSync(new URL('../skoldhast/assets/hero-rig.json', import.meta.url)));

const flat = { surfaces: [{ id: 'floor', pts: [[6000, -700], [18000, -700]], mat: 'grass' }] };
const cliff = (drop) => ({ surfaces: [{ id: 'top', pts: [[6000, -700 - drop], [11000, -700 - drop]], mat: 'grass' },
    { id: 'floor', pts: [[11000, -700], [20000, -700]], mat: 'grass' }] });
function setup(scene, spawn) {
    const flags = new Set(), terrain = new Terrain(scene, flags), p = createPlayer(spawn);
    p.surface = terrain.support(p.x, p.y, 1, 1)?.s || null;
    return { p, world: { terrain, flags }, events: [] };
}
function setupLand(xHL, facing) {
    const F = new Set(['intro_done']), terrain = new Terrain(SCENES.land, F), p = createPlayer({ x: xHL * HL, y: -400, facing });
    const under = terrain.surfaces.filter(s => !s.thin && heightOn(s.pts, p.x) !== null).sort((a, b) => heightOn(a.pts, p.x) - heightOn(b.pts, p.x))[0];
    p.y = heightOn(under.pts, p.x); p.py = p.y; p.px = p.x; p.surface = under;
    return { p, world: { terrain, flags: F }, events: [] };
}
/** main.mjs's loop at a display rate; input(t, p) per sim step, edge inputs (hide, hop) on a frame's first step only. */
function play(q, hz, seconds, input) {
    const an = createAnimator(rig), tail = an.chains.find(c => c.group === 'tail'), frames = [];
    let acc = 0, t = 0;
    for (let f = 0; f < Math.round(seconds * hz); f++) {
        acc += 1 / hz; let first = true;
        while (acc + 1e-10 >= STEP) { const i = input(t, q.p) || {}; stepPlayer(q.p, first ? i : { x: i.x }, q.world, STEP, q.events); t += STEP; acc -= STEP; first = false; }
        const s = snapshot(q.p, acc / STEP, q.world.terrain, t);
        an.update(1 / hz, s);
        frames.push({ t: (f + 1) / hz, mode: q.p.mode, s, wl: an.waterLine, x: Array.from(tail.x), y: Array.from(tail.y), tx: Array.from(tail.tx), ty: Array.from(tail.ty), total: tail.total });
    }
    return frames;
}
const hideAt = (at) => { let done = false; return (t) => (!done && t >= at ? (done = true, { hide: true }) : {}); };
/** largest root-relative movement of any tail point from one frame to the next, in wu per 1/60 s */
function restless(F, hz) {
    let m = 0;
    for (let i = 1; i < F.length; i++) for (let k = 1; k < F[i].x.length; k++)
        m = Math.max(m, Math.hypot((F[i].x[k] - F[i].x[0]) - (F[i - 1].x[k] - F[i - 1].x[0]), (F[i].y[k] - F[i].y[0]) - (F[i - 1].y[k] - F[i - 1].y[0])) * hz / 60);
    return m;
}

for (const hz of [60, 144]) test(`a hidden tail lies still on the ground (${hz} Hz)`, () => {
    for (const q of [setup(flat, { x: 12000, y: -700 }), setupLand(106.2, 1), setupLand(102.3, 1), setupLand(102.4, -1)]) {
        const F = play(q, hz, 4, hideAt(0.6)).filter(f => f.t >= 2);
        assert.ok(F.every(f => f.mode === 'ground'));
        const r = restless(F, hz);
        assert.ok(r < 3, `tail still moves ${r.toFixed(1)} wu per 1/60 s while hidden`);
        let wet = 0; for (let i = 1; i < F.length; i++) for (let k = 1; k < F[i].y.length; k++) if ((F[i].y[k] > F[i].wl) !== (F[i - 1].y[k] > F[i - 1].wl)) wet++;
        assert.equal(wet, 0, 'no tail point flips across the water line');
    }
});

for (const hz of [60, 144]) test(`a long fall keeps the tail whole and streaming (${hz} Hz)`, () => {
    for (const [drop, speed] of [[400, 0.35], [900, 0.35], [1600, 1]]) {
        const F = play(setup(cliff(drop), { x: 10500, y: -700 - drop }), hz, 4, () => ({ x: speed }));
        const air = F.filter(f => f.mode === 'air');
        assert.ok(air.length > 10, 'it falls');
        for (const f of F.slice(2)) {
            const reset = f.x.every((v, k) => v === f.tx[k]) && f.y.every((v, k) => v === f.ty[k]);
            assert.ok(!reset, `tail reset to its rest shape at ${f.t.toFixed(2)} s (drop ${drop})`);
            const reach = Math.hypot(f.x.at(-1) - f.x[0], f.y.at(-1) - f.y[0]);
            assert.ok(reach <= f.total + 1, `tail stretched to ${reach.toFixed(0)} wu (length ${f.total.toFixed(0)})`);
        }
        const r = restless(F.filter(f => f.t > 0.5), hz);
        assert.ok(r < 100, `drop ${drop}: tail jumps ${r.toFixed(0)} wu in 1/60 s`);
        // in the air nothing but wind and gravity acts on it: no shove from ground that was left behind
        const k60 = (hz / 60) ** 2;
        for (let i = 2; i < F.length; i++) {
            if (F[i].mode !== 'air') continue;
            for (let k = 1; k < F[i].x.length; k++) {
                const rel = (f, a) => a === 'x' ? f.x[k] - f.x[0] : f.y[k] - f.y[0];
                const a = Math.hypot(rel(F[i], 'x') - 2 * rel(F[i - 1], 'x') + rel(F[i - 2], 'x'), rel(F[i], 'y') - 2 * rel(F[i - 1], 'y') + rel(F[i - 2], 'y')) * k60;
                assert.ok(a < 45, `drop ${drop}: tail point ${k} jerked by ${a.toFixed(0)} wu per (1/60 s)² in the air at ${F[i].t.toFixed(2)} s`);
            }
        }
    }
});

test('after walking off a low ledge and stopping, the tail rests on the ground it landed on', () => {
    for (const drop of [100, 130]) {
        let air = false;
        const F = play(setup(cliff(drop), { x: 10500, y: -700 - drop }), 60, 5, (t, p) => { if (p.mode === 'air') air = true; return { x: air ? 0 : 0.35 }; });
        const f = F.at(-1);
        let low = -Infinity; for (let k = 1; k < f.y.length; k++) low = Math.max(low, f.s.y + f.y[k]);
        assert.ok(-700 - low < 10, `drop ${drop}: lowest tail point ${(-700 - low).toFixed(0)} wu above the ground`);
    }
});

test('the tail looks the same at 60, 120 and 144 Hz when galloping and standing', () => {
    const tip = (hz, input) => { const F = play(setup(flat, { x: 7000, y: -700 }), hz, 5, input).filter(f => f.t > 1.5);
        let x = 0, y = 0; for (const f of F) { x += f.x.at(-1) - f.x[0]; y += f.y.at(-1) - f.y[0]; } return [x / F.length, y / F.length, restless(F, hz)]; };
    for (const input of [() => ({ x: 1 }), () => ({})]) {
        const ref = tip(60, input);
        for (const hz of [120, 144]) {
            const got = tip(hz, input);
            assert.ok(Math.hypot(got[0] - ref[0], got[1] - ref[1]) < 15, `mean tip ${got.slice(0, 2).map(Math.round)} at ${hz} Hz vs ${ref.slice(0, 2).map(Math.round)} at 60 Hz`);
            assert.ok(got[2] < ref[2] * 1.5 + 1, `tail moves ${got[2].toFixed(1)} wu per 1/60 s at ${hz} Hz vs ${ref[2].toFixed(1)} at 60 Hz`);
        }
    }
});

test('a teleport while hidden lays the tail on the ground without a jump', () => {
    for (const hz of [60, 144]) {
        const q = setup(flat, { x: 9000, y: -700 });
        let moved = false;
        const F = play(q, hz, 4, (t, p) => {
            if (t < 0.6 + STEP / 2 && t >= 0.6 - STEP / 2) return { hide: true };
            if (!moved && t >= 2.5) { moved = true; p.x += 3000; p.px = p.x; }
            return {};
        });
        const at = F.findIndex(f => f.s.x > 11000);
        assert.ok(at > 0 && F[at].mode === 'ground');
        const low = Math.max(...F[at].y.slice(1));
        assert.ok(low < 1, `tail starts ${low.toFixed(0)} wu inside the ground after the teleport`);
        assert.ok(restless(F.slice(at), hz) < 10, `tail jumps ${restless(F.slice(at), hz).toFixed(1)} wu in 1/60 s after the teleport`);
    }
});
