#!/usr/bin/env node
// Real atlas/Pixi checks of the jointed paper keeper, at both phone aspects.
// node tests/browser/skoldhast-guardian.mjs [--out /tmp/guardian]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
const oi=process.argv.indexOf('--out'),out=oi<0?null:process.argv[oi+1];
if(out)fs.mkdirSync(out,{recursive:true});
const server=await serve(),browser=await launch(),errors=[],records=[];
try {
    for(const size of ['844x390','390x844']) {
        const [width,height]=size.split('x').map(Number);
        const pg=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
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
            const {G,ui,guide}=window.__skoldhast.debug;
            window.__guardianSim=await import('/skoldhast/src/sim.mjs');
            G.story=null;G.busy=0;guide.show(false);ui.showControls(false);
            for(const f of ['lamp_lit','kv_met','talk1','talk2','talk_done'])G.flags.add(f);
        });
        for(const pose of ['stand','worry','point','walk','bow','fold','unfold','draw','peek']) {
            const record=await pg.evaluate(pose=>{
                const {G,view,app,assets}=window.__skoldhast.debug;
                const {snapshot}=window.__guardianSim;
                if(pose==='peek')G.flags.delete('lamp_lit');else G.flags.add('lamp_lit');
                G.goto('viken',{x:4480,y:-124},{silent:true});G.lessMotion=false;
                for(const actor of Object.values(G.actors))Object.assign(actor,{visible:false,walk:null,pop:0});
                const a=pose==='peek'?G.actors.figure:G.actors.kv;
                Object.assign(a,{visible:true,scene:'viken',x:pose==='peek'?G.sceneDef.lamp.x:4640,
                    y:pose==='peek'?G.sceneDef.lamp.y+45:-124,pose:pose==='peek'?'kv-peek':pose,
                    facing:-1,talking:pose==='point',walk:pose==='walk'?{}:null,map:'open'});
                G.hideHero=pose==='peek';
                G.camHint={x:pose==='peek'?a.x:4520,y:pose==='peek'?a.y-30:-265,zoom:1.1};
                view.setScene('viken');view.cam.snap=true;
                for(let i=0;i<30;i++) {
                    G.time=1+i/60;if(pose==='walk')a.x+=1.5;
                    view.render(snapshot(G.player,1,G.terrain,G.time),1/60);
                }
                const container=view.layers.actors.children.find(c=>c.label===(pose==='peek'?'guardian-figure':'guardian-kv'));
                const art=container.children[1],head=art.children.find(c=>c.label==='kv-part-head-normal');
                const finite=art.children.every(s=>[s.x,s.y,s.rotation,s.scale.x,s.scale.y].every(Number.isFinite));
                const local=art.children.filter(s=>s.label==='kv-part-shoe').map(s=>[s.x,s.y]);
                G.time=4.2;view.render(snapshot(G.player,1,G.terrain,G.time),1/60);
                const blink=head.texture===assets.tex('kv-part-head-'+(pose==='worry'||pose==='peek'?'worry':['bow','draw','unfold'].includes(pose)?'soft':'normal')+'-blink');
                app.render();
                return {pose,world:[container.x,container.y],articulated:art.visible,fallback:container.children[2].visible,
                    visibleParts:art.children.filter(s=>s.visible).length,finite,local,blink,
                    mapMirrored:view.layers.objects.children.some(s=>s.texture===assets.tex('map-open')&&s.scale.x<0)};
            },pose);
            records.push({size,...record});
            assert.ok(record.articulated&&!record.fallback,`${size} ${pose}: real atlas parts`);
            assert.ok(record.finite&&record.blink,`${size} ${pose}: finite transforms and live blink`);
            assert.equal(record.visibleParts,pose==='peek'?3:['fold','unfold'].includes(pose)?16:pose==='draw'?18:17);
            assert.equal(record.mapMirrored,false);
            if(out&&['stand','point','walk','bow','unfold','peek'].includes(pose))await pg.screenshot({path:path.join(out,`${pose}-${size}.png`)});
        }
        const reduced=await pg.evaluate(()=>{
            const {G,view,app}=window.__skoldhast.debug,{snapshot}=window.__guardianSim;
            G.lessMotion=true;
            const states=[];
            for(const time of [1,9]) {
                G.time=time;view.render(snapshot(G.player,1,G.terrain,G.time),1/60);
                const c=view.layers.actors.children.find(c=>c.label==='guardian-figure');
                states.push(c.children[1].children.filter(s=>s.visible).map(s=>[s.x,s.y,s.rotation]));
            }
            app.render();return states;
        });
        assert.deepEqual(reduced[0],reduced[1],`${size}: reduced peek remains still and readable`);
        if(out)await pg.screenshot({path:path.join(out,`peek-reduced-${size}.png`)});
        await pg.close();
    }
    assert.deepEqual(errors,[]);
    if(out)fs.writeFileSync(path.join(out,'guardian-states.json'),JSON.stringify({records,errors},null,2));
    console.log(`guardian: ${records.length} poses at both phone sizes, live blinks, reduced peek, no errors`);
} finally {await browser.close();server.close();}
