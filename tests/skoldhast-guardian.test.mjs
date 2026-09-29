import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGuardian, createGuardianPose, guardianPoseName, sampleGuardian } from '../skoldhast/src/guardian.mjs';

test('guardian poses remain local and finite at the pier, gallery and distant sea coordinates', () => {
    for (const pose of ['stand','worry','point','bow','fold','unfold','draw','kv-peek','kv-walk-1']) {
        for (const time of [0,0.31,2.1,4.2,99.8]) {
            const options={time,distance:123,activity:1,talking:true};
            const local=sampleGuardian({pose,x:0,y:0},options);
            for(const [x,y] of [[4640,-124],[5960,-1460],[16000,720]]) {
                assert.deepEqual(sampleGuardian({pose,x,y},options),local);
            }
            for(const value of Object.values(local)) if(Array.isArray(value)) assert.ok(value.every(Number.isFinite));
        }
    }
});

test('guardian feet alternate with travelled distance; idle breathing never lifts a planted shoe', () => {
    const actor={pose:'walk',walk:{}};
    const a=sampleGuardian(actor,{time:1,distance:0,activity:1});
    const b=sampleGuardian(actor,{time:1,distance:41,activity:1});
    assert.ok(a.backAnkle[1]<a.frontAnkle[1]);
    assert.ok(b.frontAnkle[1]<b.backAnkle[1]);
    assert.deepEqual(sampleGuardian(actor,{time:1,distance:82,activity:1}).frontAnkle.map(v=>Math.round(v*1e6)),a.frontAnkle.map(v=>Math.round(v*1e6)));
    const idleA=sampleGuardian({pose:'stand'},{time:0.7}),idleB=sampleGuardian({pose:'stand'},{time:2.1});
    assert.notDeepEqual(idleA.head,idleB.head);
    assert.deepEqual(idleA.frontAnkle,idleB.frontAnkle); assert.deepEqual(idleA.backAnkle,idleB.backAnkle);
});

test('peek wins over a stale walk, blinks occur, and reduced motion keeps readable static gestures', () => {
    assert.equal(guardianPoseName({pose:'kv-peek',walk:{}}),'peek');
    assert.equal(sampleGuardian({pose:'kv-peek'},{time:4.21}).blink,true);
    for(const pose of ['stand','worry','point','bow','fold','unfold','draw','peek','walk']) {
        const first=sampleGuardian({pose},{time:1,distance:0,activity:1,talking:true,reducedMotion:true});
        const later=sampleGuardian({pose},{time:9,distance:44,activity:1,talking:true,reducedMotion:true});
        assert.deepEqual(later,first);
        assert.equal(first.blink,false); assert.equal(first.capeAngle,0);
    }
    assert.ok(sampleGuardian({pose:'unfold'}).frontWrist[0]>40);
    assert.ok(sampleGuardian({pose:'fold'}).frontWrist[0]<35);
    const reusable=createGuardianPose();assert.equal(sampleGuardian({pose:'bow'},{},reusable),reusable);
});

class Vector {
    constructor(x=0,y=0){this.x=x;this.y=y;}
    set(x,y=x){this.x=x;this.y=y;}
}
class Container {
    constructor(){this.position=new Vector();this.scale=new Vector(1,1);this.children=[];this.visible=true;this.rotation=0;this.alpha=1;}
    addChild(...children){this.children.push(...children);}
}
class Sprite extends Container {
    constructor(texture){super();this.texture=texture;this.anchor=new Vector();}
}
class Graphics extends Container {ellipse(){return this;}fill(){return this;}}
const PIXI={Container,Sprite,Graphics,Texture:{EMPTY:{name:'empty'}}};

test('articulated guardian retains world placement, turns without vanishing and honors peek in both motion settings', () => {
    const textures=new Map(),texture=name=>{if(!textures.has(name))textures.set(name,{name});return textures.get(name);};
    const rig=createGuardian(PIXI,{texture});
    const actor={visible:true,scene:'viken',x:5960,y:-1460,facing:1,pose:'stand'};
    rig.update(actor,{scene:'viken',time:1});
    assert.equal(rig.container.position.x,5960);assert.equal(rig.container.position.y,-1460);
    const art=rig.container.children[1];
    actor.facing=-1;
    for(let i=0;i<30;i++) {
        rig.update(actor,{scene:'viken',time:1+i/120,dt:1/120});
        assert.ok(Math.abs(art.scale.x)>=0.81,'turn preserves paper silhouette');
        for(const s of art.children) assert.ok([s.position.x,s.position.y,s.rotation,s.scale.x,s.scale.y].every(Number.isFinite));
    }
    assert.equal(art.scale.x,-1);
    for(const reducedMotion of [false,true]) {
        actor.pose='kv-peek';actor.walk={};
        rig.update(actor,{scene:'viken',time:2,reducedMotion,figure:true});
        assert.equal(art.children.filter(s=>s.visible).length,3,'only head and gripping hands peek around shutter');
        assert.equal(rig.container.children[0].visible,false);
        assert.ok(rig.pose.head[1]>-33 && rig.pose.head[1]<-29);
    }
    rig.update(actor,{scene:'land'});assert.equal(rig.container.visible,false);
});

test('complete pose fallback survives a late bay atlas and switches to the live rig', () => {
    let loaded=false;
    const rig=createGuardian(PIXI,{texture:name=>name.startsWith('kv-part-')&&!loaded?null:{name}});
    const actor={visible:true,scene:'viken',x:6000,y:-1450,facing:-1,pose:'kv-peek'};
    rig.update(actor,{scene:'viken'});
    assert.equal(rig.container.children[2].visible,true);
    assert.equal(rig.container.children[2].texture.name,'kv-peek');
    loaded=true;rig.update(actor,{scene:'viken'});
    assert.equal(rig.container.children[1].visible,true);assert.equal(rig.container.children[2].visible,false);
});
