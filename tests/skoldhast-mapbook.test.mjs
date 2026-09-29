import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectedMapPieces, MAP_FRAGMENTS } from '../skoldhast/src/mapbook.mjs';
import { CODE_RESTORE } from '../skoldhast/src/save.mjs';

const ids = flags => collectedMapPieces(flags).map(p => p.id);

test('a fresh notebook has no pieces and unrelated progress cannot invent discoveries', () => {
    assert.deepEqual(ids(),[]);
    assert.deepEqual(ids(null),[]);
    assert.deepEqual(ids(new Set()),[]);
    assert.deepEqual(ids(new Set(['intro_done','p1_inked','p3_done','p5_lit','marks_both','ended','unknown_map'])),[]);
});

test('current discovery flags and old clue aliases yield the same three pieces exactly once', () => {
    const current=new Set(['clue_map_corner','mark_land','mark_sea']);
    const old=new Set(['clue_map_corner','clue_mark_land','clue_mark_sea']);
    assert.deepEqual(ids(current),['corner','land','sea']);
    assert.deepEqual(ids(old),ids(current));
    assert.deepEqual(ids(new Set([...current,...old])),ids(current));
    for(const [flag,id] of [['clue_map_corner','corner'],['mark_land','land'],['clue_mark_land','land'],['mark_sea','sea'],['clue_mark_sea','sea']]) {
        assert.deepEqual(ids(new Set([flag])),[id]);
    }
});

test('word codes and JSON-restored old saves keep their actual map discoveries', () => {
    assert.deepEqual(ids(new Set(CODE_RESTORE[1].flags)),['corner']);
    assert.deepEqual(ids(new Set(CODE_RESTORE[2].flags)),['corner','land','sea']);
    const saved=JSON.parse(JSON.stringify({flags:['intro_done','clue_map_corner','clue_mark_land'],checkpoint:'overlook'}));
    assert.deepEqual(ids(new Set(saved.flags)),['corner','land']);
    assert.equal(saved.checkpoint,'overlook');
});

test('rebuilding the collected list neither mutates saved flags nor caches stale progress', () => {
    const flags=new Set(['clue_map_corner']), original=[...flags], authored=JSON.stringify(MAP_FRAGMENTS);
    const first=collectedMapPieces(flags), second=collectedMapPieces(flags);
    assert.notEqual(first,second);assert.deepEqual(first,second);
    first.length=0;
    assert.deepEqual(ids(flags),['corner']);assert.deepEqual([...flags],original);
    flags.add('mark_sea');assert.deepEqual(ids(flags),['corner','sea']);
    flags.delete('clue_map_corner');assert.deepEqual(ids(flags),['sea']);
    flags.clear();assert.deepEqual(ids(flags),[]);
    assert.equal(JSON.stringify(MAP_FRAGMENTS),authored);
});
