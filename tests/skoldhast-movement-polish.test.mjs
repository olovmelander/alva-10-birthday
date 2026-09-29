import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { C, STEP, HL, Terrain, createPlayer, stepPlayer, snapshot, heightOn } from '../skoldhast/src/sim.mjs';
import { createAnimator } from '../skoldhast/src/rig.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';

const rig = JSON.parse(readFileSync(new URL('../skoldhast/assets/hero-rig.json', import.meta.url)));
function setup(scene, spawn, flagList = []) {
    const flags = new Set(flagList), terrain = new Terrain(scene, flags), p = createPlayer(spawn);
    p.surface = terrain.support(p.x, p.y, 1, 1)?.s || null;
    return { p, world: { terrain, flags }, events: [] };
}
function tick(q, input = {}, count = 1) {
    for (let i = 0; i < count; i++) stepPlayer(q.p, input, q.world, STEP, q.events);
}
const flat = { surfaces: [{ id: 'floor', pts: [[9000, -700], [16000, -700]], mat: 'grass' }] };
const sea = { surfaces: [{ id: 'bed', pts: [[9000, 1500], [16000, 1500]], mat: 'sand' }],
    waters: [{ id: 'sea', x0: 9000, x1: 16000, top: 300, kind: 'sea' }] };

test('a running Hoppa has forward travel and cannot skip an authored balk edge', () => {
    const q = setup(flat, { x: 11000, y: -700 });
    assert.equal(q.world.terrain.floorAt(11000, -900), -700);
    assert.equal(q.world.terrain.floorAt(11000, -600), null, 'does not treat an overhead ceiling as floor');
    q.p.vx = 1100;
    tick(q, { x: 1, hop: true });
    tick(q, { x: 1 }, 20);
    assert.ok(q.p.x > 11140, 'the horse travels during the jump');
    assert.equal(q.p.mode, 'air');
    tick(q, { x: 1 }, 80);
    assert.ok(q.events.some(e => e.type === 'land' && e.x > 11300));
    const edgeScene = { ...flat, edges: [{ x: 11400, y: -700, dir: 1, kind: 'balk' }] };
    const e = setup(edgeScene, { x: 11000, y: -700 }); e.p.vx = 1100;
    tick(e, { x: 1, hop: true }); tick(e, { x: 1 }, 120);
    assert.ok(e.p.x < 11400, 'free jump respects the protected edge');
    assert.ok(e.events.find(event => event.type === 'land').x <= 11400 - C.edgeMargin, 'jump lands before the safety margin');
});

test('a stationary Hoppa reaches the real hoppställe tops', () => {
    for (const x of [94.55, 98.48, 61]) {
        const q = setup(SCENES.land, { x: x * HL, y: -160 });
        const under = q.world.terrain.surfaces.find(s => !s.thin && heightOn(s.pts, q.p.x) !== null);
        q.p.y = heightOn(under.pts, q.p.x); q.p.surface = under;
        tick(q, { hop: true }); tick(q, {}, 140);
        assert.ok(q.p.surface?.thin, `landed on the small reward perch at ${x} HL`);
    }
});

test('a cancelled skid keeps the requested facing and a real reversal turns cleanly', () => {
    for (const finish of [1, -1, 0]) {
        const q = setup(flat, { x: 12000, y: -700 }); q.p.vx = 1100;
        tick(q, { x: -1 });
        assert.ok(q.p.skid > 0);
        tick(q, { x: finish }, 60);
        assert.equal(q.p.facing, finish || 1);
        if (finish) assert.equal(Math.sign(q.p.vx), finish);
    }
});

test('automatic hurdles land on the actual sloping surface and cannot cross a puzzle edge', () => {
    const scene = { surfaces: [{ id: 'hill', pts: [[10000, -500], [14000, -1300]], mat: 'grass' }], hurdles: [{ x: 11100 }] };
    const q = setup(scene, { x: 11040, y: -708 }); q.p.vx = 1100;
    tick(q, { x: 1 }); assert.equal(q.p.mode, 'leap');
    const expected = q.world.terrain.support(q.p.leap.to.x, -700, 300, 300).y;
    assert.equal(q.p.leap.to.y, expected);
    while (q.p.mode === 'leap') tick(q, { x: 1 });
    assert.equal(q.p.y, heightOn(scene.surfaces[0].pts, q.p.x));
    const blocked = setup({ ...scene, edges: [{ x: 11200, y: -708, dir: 1, kind: 'balk' }] }, { x: 11040, y: -708 });
    blocked.p.vx = 1100; tick(blocked, { x: 1 });
    assert.notEqual(blocked.p.mode, 'leap');
});

test('walking and galloping across every grown hill stay supported in both directions', () => {
    for (const speed of [0.28, 1]) for (const dir of [-1, 1]) {
        const q = setup(SCENES.land, { x: (dir < 0 ? 49 : 13.5) * HL, y: dir < 0 ? -160 : -800 }, ['p3_t1', 'p3_t2', 'p3_t3']);
        const end = (dir < 0 ? 13.5 : 49) * HL;
        let n = 0, previousSpeed = 0;
        while ((end - q.p.x) * dir > 0 && n++ < 6000) {
            tick(q, { x: dir * speed });
            assert.equal(q.p.mode, 'ground', `${speed}/${dir}: grounded at ${q.p.x / HL}`);
            assert.ok(Math.abs(Math.abs(q.p.vx) - previousSpeed) <= Math.max(C.brake, C.accel * 1.5) * STEP + 0.01, 'no speed snap at joints');
            assert.equal(q.p.y, heightOn(q.p.surface.pts, q.p.x));
            previousSpeed = Math.abs(q.p.vx);
        }
        assert.ok(n < 6000, 'route remains traversable');
    }
});

test('surface buoyancy settles gently, deep water stays neutral, and release leaves a glide', () => {
    const surface = setup(sea, { x: 12000, y: 490, mode: 'swim' });
    tick(surface, {}, 1200);
    assert.ok(Math.abs(surface.p.y - 430) < 1);
    assert.ok(Math.abs(surface.p.vy) < 1);
    const deep = setup(sea, { x: 12000, y: 1100, mode: 'swim' });
    tick(deep, {}, 360);
    assert.equal(deep.p.y, 1100);
    tick(deep, { x: 1 }, 120);
    const x = deep.p.x, v = deep.p.vx;
    tick(deep, {}, 30);
    assert.ok(deep.p.x > x + 60 && deep.p.vx > v * 0.4 && deep.p.vx < v);
    tick(deep, {}, 480);
    assert.ok(Math.abs(deep.p.vx) < 1);
});

test('Kom fram escapes sinking, anchored kelp and a drifting current', () => {
    for (const extra of [{}, { kelpBeds: [{ x0: 10000, x1: 14000, y0: 700, y1: 1400 }] },
        { lanes: [{ id: 'current', pts: [[10000, 1000], [14000, 1000]], width: 400, speed: 400 }] }]) {
        const q = setup({ ...sea, ...extra }, { x: 12000, y: 1000, mode: 'swim' });
        tick(q, { hide: true }); tick(q, {}, 120);
        assert.equal(q.p.hidden, true);
        tick(q, { hide: true }); const y = q.p.y;
        tick(q, { y: -1 }, 180);
        assert.equal(q.p.hidden, false);
        assert.ok(q.p.y < y - 250, 'can actively swim away after emerging');
    }
});

test('movement replays exactly across 30, 60, 120 and 144 Hz render schedules', () => {
    const outcomes = [];
    for (const hz of [30, 60, 120, 144]) {
        const q = setup(flat, { x: 12000, y: -700 }); let acc = 0, step = 0;
        for (let frame = 0; frame < hz * 4; frame++) {
            acc += 1 / hz;
            while (acc + 1e-10 >= STEP) {
                tick(q, { x: step < 210 ? 1 : -1, hop: step === 120 }); step++; acc -= STEP;
            }
        }
        outcomes.push({ x: q.p.x, y: q.p.y, vx: q.p.vx, phase: q.p.gaitPhase, events: q.events });
    }
    for (const out of outcomes.slice(1)) assert.deepEqual(out, outcomes[0]);
});

function animateSwimming(dx = 0, dy = 0) {
    const an = createAnimator(rig);
    for (let i = 0; i < 180; i++) an.update(1 / 60, {
        x: 12000 + dx + i * 4, y: 430 + dy, facing: 1, mode: 'swim', gait: 'stand',
        vx: 240, vy: 0, speed: 240, waterY: 300 + dy, submerge: 0.76, time: i / 60
    });
    return an;
}

test('the swim pose and floating hair are translation-invariant at real world coordinates', () => {
    const a = animateSwimming(), b = animateSwimming(16000, -2200);
    for (const key of Object.keys(a.pose.parts)) for (const axis of ['x', 'y', 'rot'])
        assert.ok(Math.abs(a.pose.parts[key][axis] - b.pose.parts[key][axis]) < 1e-6, `${key}.${axis}`);
    for (let ci = 0; ci < a.chains.length; ci++) for (let j = 0; j < a.chains[ci].n; j++) {
        assert.ok(Math.abs(a.chains[ci].x[j] - b.chains[ci].x[j]) < 1e-6);
        assert.ok(Math.abs(a.chains[ci].y[j] - b.chains[ci].y[j]) < 1e-6);
    }
    assert.ok(a.pose.parts.eye.y + 430 < 300 - 45, 'head remains well above the surface');
    const tail = a.chains.find(c => c.group === 'tail');
    assert.ok(tail.x.at(-1) < tail.x[0] - 30, 'tail floats behind the swimming horse');
});

test('the paddle phase stays continuous when speed changes late in a session', () => {
    const an = createAnimator(rig), state = { x: 12000, y: 900, mode: 'swim', waterY: 300, vx: 100, vy: 0, time: 1000 };
    an.update(1 / 60, state); const phase = an.swimPhase;
    an.update(1 / 60, { ...state, vx: 520, time: 1000 + 1 / 60 });
    assert.ok((an.swimPhase - phase + 1) % 1 < 0.03, 'no time × speed phase jump');
    const positions = [];
    for (let i = 0; i < 60; i++) { an.update(1 / 60, { ...state, time: 1000 + i / 60 }); positions.push(an.legs[3].soleX); }
    assert.ok(Math.max(...positions) - Math.min(...positions) > 40, 'a full forward/recovery paddle');
});

test('the shadow and planted feet do not depend on world elevation', () => {
    const states = [-1200, 0, 1800].map(y => {
        const an = createAnimator(rig);
        for (let i = 0; i < 100; i++) an.update(1 / 60, { x: 17000, y, mode: 'ground', time: i / 60, groundAt: () => y });
        return an;
    });
    for (const an of states.slice(1)) assert.ok(Math.abs(an.pose.shadow.alpha - states[0].pose.shadow.alpha) < 1e-9);
});

test('planted and swinging rendered hooves stay clear of the real ramp at x47 HL', () => {
    for (const speed of [0.3, 1]) {
        const q = setup(SCENES.land, { x: 49 * HL, y: -160, facing: -1 }, ['p3_t1', 'p3_t2', 'p3_t3']);
        const an = createAnimator(rig); let t = 0;
        while (q.p.x > 47 * HL) { tick(q, { x: -speed }); t += STEP; an.update(STEP, snapshot(q.p, 1, q.world.terrain, t)); }
        for (const leg of an.legs) {
            const part = an.pose.parts[`${leg.name}.hoof`];
            const wx = q.p.x - (part.x - Math.sin(part.rot) * leg.sole), wy = q.p.y + part.y + Math.cos(part.rot) * leg.sole;
            const gy = q.world.terrain.hoofGround(wx, q.p.x, q.p.y);
            assert.ok(wy - gy < 3, `${speed} ${leg.name} is not buried (${wy - gy} wu)`);
        }
    }
});

test('a ramp growing under a stationary horse lifts its support and invalidates the old hoof locks', () => {
    const q = setup(SCENES.land, { x: 47 * HL, y: -161 });
    q.p.y = heightOn(q.p.surface.pts, q.p.x);
    const an = createAnimator(rig);
    tick(q); an.update(STEP, snapshot(q.p, 1, q.world.terrain, 10));
    q.world.flags.add('p3_t1'); q.world.terrain.refresh();
    // Another flag can refresh terrain before the next simulation step; don't lose the growth event.
    q.world.flags.add('unrelated_hint'); q.world.terrain.refresh();
    tick(q); an.update(STEP, snapshot(q.p, 1, q.world.terrain, 10 + STEP));
    assert.equal(q.p.surface.id, 'ramp1');
    assert.equal(q.p.y, heightOn(q.p.surface.pts, q.p.x));
    assert.equal(q.p.py, q.p.y, 'interpolation never draws the horse inside the new earth');
    assert.equal(q.events.filter(e => e.type === 'rampLift').length, 1);
    for (const leg of an.legs) assert.ok(Math.abs(leg.lockY - q.world.terrain.hoofGround(leg.lockX, q.p.x, q.p.y)) < 0.01);
    tick(q, {}, 10);
    assert.equal(q.events.filter(e => e.type === 'rampLift').length, 1, 'one support change per growth');
});

test('earned ramps share a deterministic smooth growth surface with grounded feet', () => {
    for (const [id, flag, xHL] of [['ramp1', 'p3_t1', 47], ['ramp2', 'p3_t2', 39.5], ['ramp3', 'p3_t3', 37]]) {
        const traces = [];
        for (const hz of [30, 60, 120, 144]) {
            const q = setup(SCENES.land, { x: xHL * HL, y: 0 });
            q.p.y = q.world.terrain.floorAt(q.p.x);
            q.p.surface = q.world.terrain.support(q.p.x, q.p.y, 1, 1).s;
            tick(q);
            q.world.flags.add(flag);
            assert.equal(q.world.terrain.startRampGrowth(id), true);
            q.world.terrain.refresh();
            const raw = SCENES.land.surfaces.find(s => s.id === id), targetY = heightOn(raw.pts, q.p.x);
            assert.ok(q.world.terrain.surfaces.find(s => s.id === id).growing);
            let acc = 0, previous = q.p.y; const trace = [];
            for (let frame = 0; frame < hz; frame++) {
                acc += 1 / hz;
                while (acc + 1e-10 >= STEP) {
                    tick(q); acc -= STEP;
                    assert.ok(previous - q.p.y >= -0.01 && previous - q.p.y < 3, `${id}: no growth pop`);
                    assert.equal(q.p.y, heightOn(q.p.surface.pts, q.p.x));
                    trace.push(q.p.y); previous = q.p.y;
                }
            }
            assert.equal(q.p.y, targetY);
            assert.equal(q.world.terrain.rampGrowth.size, 0);
            assert.equal(q.world.terrain.surfaces.find(s => s.id === id), raw, 'exact authored geometry after growth');
            traces.push(trace);
            const restored = new Terrain(SCENES.land, q.world.flags);
            assert.equal(restored.surfaces.find(s => s.id === id), raw, 'saved flags load a completed ramp');
        }
        for (const trace of traces.slice(1)) assert.deepEqual(trace, traces[0], 'same growth at every render schedule');
    }
});
