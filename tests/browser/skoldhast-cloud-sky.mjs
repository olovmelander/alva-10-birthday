#!/usr/bin/env node
// Real world coordinates, atlas sun/rays and restored snapshot transforms.
// node tests/browser/skoldhast-cloud-sky.mjs [--out /tmp/cloud-sky]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
const oi=process.argv.indexOf('--out'),out=oi<0?null:process.argv[oi+1];
if(out)fs.mkdirSync(out,{recursive:true});
const server=await serve(),browser=await launch(),errors=[],records=[];
function check(r) {
    const c=r.cloud,s=r.sun;
    assert.ok(c&&c.width>40&&c.height>15,`${r.name}: recognisable cloud`);
    assert.ok(c.x>=0&&c.y>=0&&c.x+c.width<=r.width&&c.y+c.height<=r.height,`${r.name}: cloud fully on screen`);
    assert.ok(c.x+c.width<s.x||c.x>s.x+s.width||c.y+c.height<s.y||c.y>s.y+s.height,`${r.name}: full sun rays unobscured`);
    assert.ok(c.y+c.height<r.height*.55,`${r.name}: cloud remains in the sky`);
    assert.equal(r.scene,'land');assert.equal(r.terrain,'land');
    if(r.label)assert.ok(c.x+c.width<r.label.x||c.x>r.label.x+r.label.width||c.y+c.height<r.label.y||c.y>r.label.y+r.label.height,`${r.name}: cloud clears lettering`);
    if(r.name!=='picture'&&r.groundY!==null)assert.ok(c.y+c.height+Math.min(120,r.height*.18)<r.groundY,`${r.name}: cloud clears real terrain`);
}
try {
    const pg=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});
    pg.on('pageerror',e=>errors.push(e.message));
    pg.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
    await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html`);
    await pg.waitForSelector('.sk-title');
    await pg.getByText('Jag har en kod').click();
    await pg.fill('.sk-code-input','fyr fjun klo');
    await pg.locator('.sk-panel button',{hasText:'Fortsätt'}).click();
    await pg.waitForFunction(()=>{
        const d=window.__skoldhast.debug;if(d.ui.dialogueOpen())d.ui.advance();
        return d.G?.sceneId==='viken'&&d.view.built('viken')&&!d.G.busy&&!d.story.running();
    },null,{timeout:60000});
    await pg.evaluate(async()=>{
        window.__skoldhast.pause();
        const d=window.__skoldhast.debug;
        window.__cloudSim=await import('/skoldhast/src/sim.mjs');
        const PIXI=await import('/skoldhast/vendor/pixi-8.21.0.min.mjs');
        const {createUserCloud}=await import('/skoldhast/src/user-cloud.mjs');
        // Asymmetric authored lobes reveal any unwanted aspect stretching.
        const pts=[[30,128],[8,95],[35,60],[70,75],[60,26],[130,14],[179,66],
            [225,35],[290,43],[295,80],[350,48],[390,95],[360,138],[30,128]];
        window.__cloudTextures={wide:createUserCloud(PIXI,pts,'rose').texture,
            round:createUserCloud(PIXI,[[30,105],[8,70],[23,40],[42,43],[45,10],[85,4],[103,36],[128,43],[135,78],[107,106],[70,119],[30,105]],'lavender').texture};
        d.G.userCloud=window.__cloudTextures.wide;d.G.story=null;d.G.busy=0;
        d.guide.show(false);d.ui.showControls(false);d.G.camHint=null;
        for(const f of ['plask','ch2_open','ch3_open','p3_0','p3_1','p3_2'])d.G.flags.add(f);
        d.G.goto('land',{x:21720,y:-68},{silent:true});d.view.setScene('land');
        window.__cloudRecord=name=>{
            const {G,view,assets,app}=window.__skoldhast.debug;
            const sky=view.root.children[1],c=sky.getChildByLabel('user-cloud'),s=sky.children.find(s=>s.texture===assets.tex('sun'));
            const rect=b=>({x:b.x,y:b.y,width:b.width,height:b.height});
            const cloud=rect(c.getBounds());
            const groundY=Math.min(...[cloud.x,cloud.x+cloud.width/2,cloud.x+cloud.width].map(sx=>{
                const wx=view.cam.x+(sx-app.screen.width/2)/view.cam.zoom;
                const wy=G.terrain.floorAt(wx);
                return wy===null?Infinity:app.screen.height/2+(wy-view.cam.y)*view.cam.zoom;
            }));
            const label=view.layers.fore.children.find(s=>s.texture===assets.tex('label-skold-hast'));
            return {name,scene:G.sceneId,terrain:G.terrain.scene.id,width:app.screen.width,height:app.screen.height,cloud,sun:rect(s.getBounds()),
                groundY:Number.isFinite(groundY)?groundY:null,label:label?rect(label.getBounds()):null,cam:{...view.cam}};
        };
    });
    for(const size of ['844x390','390x844','1440x900','390x844','844x390']) {
        const [width,height]=size.split('x').map(Number);
        await pg.setViewportSize({width,height});
        await pg.waitForFunction(([w,h])=>{const a=window.__skoldhast.debug.app;return a.screen.width===w&&a.screen.height===h;},[width,height]);
        for(const [name,x,y] of [['start',108.6,-.34],['start-right',108.6,-.34],['start-gallop',108.6,-.34],['start-round',108.6,-.34],['shore',116,-.16],['steppe',58,-.82],['hills',28,-6.35],['plateau',14,-4],['start-restored',108.6,-.34]]) {
            const r=await pg.evaluate(([name,x,y])=>{
                const {G,view,app}=window.__skoldhast.debug;
                G.goto('land',{x:x*200,y:y*200,facing:name==='start-right'?1:-1},{silent:true});
                const texture=window.__cloudTextures[name==='start-round'?'round':'wide'];
                if(G.userCloud!==texture){G.userCloud=texture;view.setScene('land');}
                view.cam.snap=true;view.cam.gal=name==='start-gallop'?1:0;
                const snap=window.__cloudSim.snapshot(G.player,1,G.terrain,G.time);if(name==='start-gallop')snap.vx=1100;
                view.render(snap,1/60);app.render();
                return window.__cloudRecord(name);
            },[name,x,y]);
            records.push({size,...r});try{check(r);}catch(error){console.error(JSON.stringify({size,...r}));throw error;}
            if(out&&['start','start-round','hills'].includes(name))await pg.screenshot({path:path.join(out,`${name}-${size}.png`)});
        }
        const snap=await pg.evaluate(()=>{
            const {G,view,app}=window.__skoldhast.debug;
            G.lessMotion=true;view.render(window.__cloudSim.snapshot(G.player,1,G.terrain,G.time),1/60);
            const before=window.__cloudRecord('snapshot-before');
            let inside;
            const original=app.renderer.render;
            app.renderer.render=function(...args){if(args[0]?.target)inside=window.__cloudRecord('picture');return original.apply(this,args);};
            const st=G.scenes.land.spots.start;
            const rt=view.snapshot({x:st.x+70,y:st.y-200,zoom:740/1060,width:740,height:560,skyFactor:.33});
            app.renderer.render=original;rt.destroy(true);
            const after=window.__cloudRecord('snapshot-after');
            view.render(window.__cloudSim.snapshot(G.player,1,G.terrain,G.time),8);
            const still=window.__cloudRecord('reduced');
            return {before,after,inside:{...inside,width:740,height:560},still};
        });
        check(snap.inside);
        assert.deepEqual(snap.before.cloud,snap.after.cloud,'picture restores live cloud transform immediately');
        assert.deepEqual(snap.before.sun,snap.after.sun,'picture restores authored sun transform immediately');
        assert.deepEqual(snap.before.cloud,snap.still.cloud,'reduced motion cloud stays still');
        records.push({size,...snap.inside});
    }
    assert.deepEqual(errors,[]);
    if(out)fs.writeFileSync(path.join(out,'cloud-sky.json'),JSON.stringify({records,errors},null,2));
    console.log(`cloud sky: ${records.length} real camera/rotation/picture states, sun clear, reduced motion and snapshot restoration pass`);
} finally {await browser.close();server.close();}
