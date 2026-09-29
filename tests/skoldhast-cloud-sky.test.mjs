import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudSkyLayout } from '../skoldhast/src/cloud-sky.mjs';

function check(p, W, H, sun) {
    assert.ok(Object.values(p).every(Number.isFinite));
    assert.ok(p.x - p.width / 2 >= 0 && p.x + p.width / 2 <= W);
    assert.ok(p.y - p.height / 2 >= 0 && p.y + p.height / 2 <= H);
    if (sun) assert.ok(p.x + p.width / 2 < sun.x || p.x - p.width / 2 > sun.x + sun.width ||
        p.y + p.height / 2 < sun.y || p.y - p.height / 2 > sun.y + sun.height, 'cloud clears the complete sun and rays');
}

test('user cloud fits all phone/desktop sky lanes and preserves the drawn aspect ratio', () => {
    for (const [W,H] of [[844,390],[390,844],[1440,900],[320,568],[740,560]]) {
        for (const [tw,th] of [[400,140],[302,278],[90,260],[1000,32]]) {
            for (let x = -300; x <= W + 300; x += 13) {
                const sun = {x:x - 72,y:H * .16 - 72,width:144,height:144};
                const p = cloudSkyLayout({width:W,height:H,textureWidth:tw,textureHeight:th,sun});
                check(p,W,H,sun);
                assert.ok(Math.abs(p.width / p.height - tw / th) < 1e-8);
            }
        }
    }
});

test('camera travel and decorative drift have no wrap or obstacle-switch pops', () => {
    for (const [W,H] of [[844,390],[390,844],[1440,900]]) {
        let prev;
        for (let i = 0; i < 2400; i++) {
            const cam = 21000 - i * 8, zoom = H > W ? .525 : .7;
            const sun = {x:W / 2 + (22320 - cam) * zoom * .15 - 132 * zoom,
                y:H / 2 + (-1120 + 220) * zoom * .5 - 132 * zoom,
                width:264 * zoom,height:264 * zoom};
            const p=cloudSkyLayout({width:W,height:H,textureWidth:400,textureHeight:160,cameraX:cam,originX:21720,time:i/60,sun});
            check(p,W,H,sun);
            if(prev)assert.ok(Math.hypot(p.x-prev.x,p.y-prev.y)<3,'one frame remains continuous');
            prev=p;
        }
    }
});

test('reduced motion removes decorative drift without removing the cloud', () => {
    const args={width:390,height:844,textureWidth:400,textureHeight:160,cameraX:21720,originX:21720,lessMotion:true};
    assert.deepEqual(cloudSkyLayout({...args,time:1}),cloudSkyLayout({...args,time:999}));
    assert.ok(cloudSkyLayout(args).width>100);
});

test('round drawings remain recognisable in both phone orientations', () => {
    for (const [width,height] of [[844,390],[390,844]]) {
        const p=cloudSkyLayout({width,height,textureWidth:302,textureHeight:278});
        assert.ok(p.width>=70&&p.height>=70,'round cloud has enough sky space to show its authored shape');
    }
});
