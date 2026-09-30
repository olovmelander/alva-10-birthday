import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lighthouseMechanismStates } from '../skoldhast/src/lighthouse-mechanisms.mjs';
import { SCENES } from '../skoldhast/src/content/world.mjs';

test('each lighthouse symbol pairs the real mechanism with its own shutter and completion', () => {
    const def = SCENES.viken;
    const puz = { drums: { shutter1:12 }, plates:{plate:.6} };
    const before=lighthouseMechanismStates(def,puz,new Set());
    assert.deepEqual(before.map(s=>s.kind),['hoof','shell','rope']);
    assert.deepEqual(before.map(s=>s.progress),[.5,.5,0]);
    for(const [i,s] of before.entries()) {
        assert.equal(s.flag,def.shutters[i].flag);
        assert.equal(s.source,def.chains[i].from);
        assert.equal(s.shutter,def.shutters[i]);
    }
    for(const flag of ['shutter1','shutter2','shutter3']) {
        const after=lighthouseMechanismStates(def,{drums:{},plates:{}},new Set([flag]));
        assert.equal(after.find(s=>s.flag===flag).progress,1,'saved completion keeps its visible acknowledgement');
        assert.equal(after.filter(s=>s.done).length,1,'only the corresponding shutter lights');
    }
});

test('P7 visible physical anchors agree with the actual chain and interaction locations', () => {
    const d=SCENES.viken;
    const wheel=d.decor.find(o=>o.ratchet==='shutter1');
    assert.deepEqual(d.chains[0].from,{x:wheel.x,y:wheel.y});
    assert.equal(d.pullRopes[0].x,d.spots.rope.x);
    assert.equal(d.chains[2].from.x,d.pullRopes[0].x);
    assert.ok(wheel.y > d.surfaces.find(s=>s.id==='pier').pts[1][1], 'the wheel sits below the deck, clear of the rider');
});
