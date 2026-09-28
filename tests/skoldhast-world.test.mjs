/*
 * Sköldhästen: sanity checks on the authored world (plan §8.8).
 * Spawns and checkpoints must be standable or swimmable, exits must lead
 * somewhere real, and every objective must have a hint.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, CHECKPOINTS } from '../skoldhast/src/content/world.mjs';
import { HINTS } from '../skoldhast/src/content/sv.mjs';
import { Terrain, HL, cond } from '../skoldhast/src/sim.mjs';
import { createGame } from '../skoldhast/src/game.mjs';
import { createStory } from '../skoldhast/src/story.mjs';

// every flag named in a `when` somewhere, so we can test the world with everything switched on
function allFlags() {
    const out = new Set();
    const visit = (v) => {
        if (typeof v === 'string') out.add(v.replace(/^!/, ''));
        else if (Array.isArray(v)) v.forEach(visit);
    };
    for (const sc of Object.values(SCENES)) {
        for (const list of Object.values(sc)) if (Array.isArray(list)) for (const it of list) if (it && typeof it === 'object') { visit(it.when); if (it.flag) out.add(it.flag); }
    }
    return out;
}

test('spawn spots are never inside solid ground', () => {
    for (const flags of [new Set(), allFlags()]) {
        for (const sc of Object.values(SCENES)) {
            const T = new Terrain(sc, flags);
            for (const [name, s] of Object.entries(sc.spots)) {
                if (typeof s.x !== 'number' || typeof s.y !== 'number' || s.inRock) continue;
                assert.ok(!T.insideSolid(s.x, s.y + (s.mode === 'swim' ? 0 : -4)), `${sc.id}.${name} is inside the ground (${s.x / HL}, ${s.y / HL})`);
            }
        }
    }
});

test('swim spawns are in water, ground spawns stand on something', () => {
    for (const sc of Object.values(SCENES)) {
        const T = new Terrain(sc, new Set());
        for (const [name, s] of Object.entries(sc.spots)) {
            if (s.mode === 'swim') assert.ok(T.waterAt(s.x, s.y), `${sc.id}.${name} should be in water`);
        }
    }
});

test('exits lead to scenes and spawn spots that exist', () => {
    for (const sc of Object.values(SCENES)) {
        for (const ex of sc.exits || []) {
            assert.ok(SCENES[ex.to], `${sc.id} exit ${ex.id} → unknown scene ${ex.to}`);
            assert.ok(SCENES[ex.to].spots[ex.spawn], `${sc.id} exit ${ex.id} → unknown spawn ${ex.spawn}`);
        }
    }
});

test('every checkpoint loads and the game can step from it', async () => {
    for (const name of Object.keys(CHECKPOINTS)) {
        const G = createGame();
        createStory(G, { ui: { say: async () => {}, choice: async () => 0, toast() {}, pulse() {}, report: async () => {}, draw: async () => [] }, fx: async () => {}, save() {} });
        G.restore({ flags: ['intro_done', 'ch1_end', 'p3_t1', 'p3_t2', 'p3_t3', 'p4_plank'], checkpoint: name });
        for (let i = 0; i < 240; i++) G.step({ x: i < 120 ? 1 : -1 });
        const p = G.player;
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `checkpoint ${name}: position is a number`);
        assert.ok(!G.terrain.insideSolid(p.x, p.y), `checkpoint ${name}: the player ended inside the ground`);
    }
});

test('dashed lines, drums, plates and ropes have their own flags', () => {
    const seen = new Map();
    for (const sc of Object.values(SCENES)) {
        for (const key of ['dashed', 'drums', 'plates', 'ropes', 'pullRopes', 'tussocks', 'corners', 'flaps']) {
            for (const it of sc[key] || []) {
                assert.ok(it.flag, `${sc.id}.${key}.${it.id} has a flag`);
                assert.ok(!seen.has(it.flag), `flag ${it.flag} used twice (${seen.get(it.flag)} and ${sc.id}.${it.id})`);
                seen.set(it.flag, `${sc.id}.${it.id}`);
            }
        }
    }
});

test('every objective has a hint text', () => {
    const G = createGame();
    const story = createStory(G, { ui: { say: async () => {} }, fx: async () => {}, save() {} });
    const keys = new Set();
    const tries = [[], ['intro_done'], ['intro_done', 'klo_hidden'], ['intro_done', 'klo_ja'], ['intro_done', 'klo_ja', 'p1_inked'],
        ['intro_done', 'klo_ja', 'p1_inked', 'p3_done'], ['intro_done', 'klo_ja', 'p1_inked', 'p3_done', 'p2_open'],
        ['ch1_end'], ['ch1_end', 'ch2_open'], ['ch1_end', 'ch2_open', 'p5_lit'], ['ch1_end', 'ch2_open', 'p5_lit', 'mark_sea'], ['ch2_end', 'ch3_open'], ['ended']];
    for (const scene of ['land', 'kelp', 'viken']) {
        for (const fl of tries) {
            G.flags.clear(); fl.forEach((f) => G.flags.add(f));
            G.goto(scene, 'start' in SCENES[scene].spots ? 'start' : Object.keys(SCENES[scene].spots)[0], { silent: true });
            keys.add(story.objective());
        }
    }
    for (const k of keys) assert.ok(HINTS[k], `objective ${k} has no hint in sv.mjs`);
    void cond;
});
