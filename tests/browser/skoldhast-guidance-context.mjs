#!/usr/bin/env node
// Contextual guidance at both phone sizes. Staged puzzle states isolate the HUD;
// the fresh-journey test remains responsible for playing through the puzzles.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';

const arg = name => { const i = process.argv.indexOf('--' + name); return i < 0 ? null : process.argv[i + 1]; };
const out = path.resolve(arg('out') || '/tmp/skoldhast-context'); fs.mkdirSync(out, { recursive: true });
const sizes = arg('viewport') ? [arg('viewport')] : ['844x390', '390x844'];
const server = await serve(), browser = await launch(), errors = [], records = [];
const overlap = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
try {
    for (const size of sizes) {
        const [width, height] = size.split('x').map(Number);
        const pg = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true });
        pg.on('pageerror', e => errors.push(e.message));
        await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/play.html?debug`);
        await pg.waitForSelector('.sk-title');
        // This matrix exercises the optional detailed guidance layout. Fresh
        // games now keep it behind Klo's third clue by default.
        await pg.evaluate(() => window.__skoldhast.debug.ui.settings());
        await pg.locator('.sk-radio').filter({ has: pg.locator('input[value="guided"]') }).click();
        await pg.evaluate(() => window.__skoldhast.debug.ui.closePanel());
        await pg.getByText('Jag har en kod').click();
        await pg.fill('.sk-code-input', 'fyr fjun klo');
        await pg.locator('.sk-panel button', { hasText: 'Fortsätt' }).click();
        await pg.waitForFunction(() => {
            const d = window.__skoldhast.debug;
            if (d.ui.dialogueOpen()) d.ui.advance();
            return d.G?.sceneId === 'viken' && d.view.built('viken') && !d.G.busy && !d.story.running();
        }, null, { timeout: 60000 });
        await pg.waitForFunction(() => !document.querySelector('.sk-context-guide')?.hidden, null, { timeout: 30000 }).catch(async error => {
            console.log(JSON.stringify(await pg.evaluate(() => { const d=window.__skoldhast.debug;return {mode:window.__skoldhast.mode?.(),flags:[...d.G.flags],cue:d.story.guidance(),context:document.querySelector('.sk-context-guide')?.outerHTML}; }),null,2));
            console.log(errors); throw error;
        });
        await pg.evaluate(async () => {
            const api = window.__skoldhast, d = api.debug;
            api.pause(); await document.fonts.ready;
            await d.assets.load('land');
            window.__contextFlags = [...d.G.flags];
            window.__contextSim = await import('/skoldhast/src/sim.mjs');
            d.G.story = null;
        });
        await pg.waitForFunction(() => !document.querySelector('.sk-toast.on'), null, { timeout: 15000 });
        for (const name of ['klo-emerge', 'pool-ready', 'pool-working', 'pool-done', 'plate-working', 'plate-done', 'pipe-working', 'p8-land', 'p8-drift']) {
            const rec = await pg.evaluate(name => {
                const d = window.__skoldhast.debug, { G, guide, view, story, app, ui } = d;
                const land = name.startsWith('klo') || name.startsWith('pool');
                G.flags.clear();
                const flags = land ? ['intro_done', 'klo_hidden', 'klo_ja'] : window.__contextFlags;
                for (const f of flags) if (!['shutter1','shutter2','shutter3','lamp_lit','kv_met','talk_done','p8_s1','p8_s2','p8_s3','p8_land','p8_sea','p8_done'].includes(f)) G.flags.add(f);
                if (name !== 'klo-emerge') G.flags.add('rule_demo');
                if (name === 'pool-done') G.flags.add('p2_seen');
                if (!land) for (const f of ['ch3_open','viken_arrived','p7_seen']) G.flags.add(f);
                if (name === 'plate-done') G.flags.add('shutter2');
                if (name.startsWith('p8')) for (const f of ['shutter1','shutter2','shutter3','lamp_lit','talk_done']) G.flags.add(f);
                if (name === 'p8-land') G.flags.add('p8_s1');
                if (name === 'p8-drift') G.flags.add('p8_land');
                const scene = land ? 'land' : 'viken';
                const x = name === 'klo-emerge' ? 106.2 : land ? 102 : name.startsWith('plate') ? 14.2 : name.startsWith('pipe') ? 26.5 : name === 'p8-land' ? 12 : 25.95;
                const y = land ? -.3 : name.startsWith('plate') ? 6.86 : name.startsWith('pipe') ? -1 : name === 'p8-land' ? -.62 : 1.7;
                const hidden = !['pool-ready','p8-land'].includes(name), swim = !land && name !== 'p8-land';
                G.busy = 0; G.hideHero = false; G.vista = false; G.freeze = false;
                G.goto(scene, { x:x * 200, y:y * 200, mode:swim ? 'swim' : 'ground' }, { silent:true });
                Object.assign(G.player, { hidden, hide:hidden ? 1 : 0, x:x * 200, y:y * 200, px:x * 200, py:y * 200, vx:0, vy:0, resting:name.startsWith('plate') });
                G.player.inLane = name === 'pipe-working' ? G.sceneDef.lanes.find(l => l.id === 'pipe') : name === 'p8-drift' ? G.sceneDef.lanes.find(l => l.id === 'p8-lane') : null;
                G.puz.pools.pool = { ripple:.53, still:false }; G.puz.plates.plate = .6;
                G.camHint = { x:x * 200, y:(y - .8) * 200, zoom:1 }; view.setScene(scene); view.cam.snap = true;
                const cue = story.guidance(); guide.clear(); guide.goal(cue.goal); guide.context(cue); guide.show(true); guide.update();
                ui.setContext(null, hidden);
                for (let i=0;i<8;i++) {
                    view.render(window.__contextSim.snapshot(G.player,1,G.terrain,G.time),1/60);
                    guide.update(); // same order as main: camera first, then DOM guidance
                }
                app.render();
                return { name, cue };
            }, name);
            await pg.evaluate(async () => {
                await document.fonts.ready;
                await Promise.all([...document.querySelectorAll('.sk-goal')].flatMap(el => el.getAnimations()).filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished));
            });
            const layout = await pg.evaluate(() => {
                const box = el => { const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
                const panel=document.querySelector('.sk-context-guide');
                return { hidden:panel.hidden, visibility:getComputedStyle(panel).visibility, panel:box(panel), buttons:[...document.querySelectorAll('.sk-btns button')].map(box), text:panel.textContent,
                    instruction:document.querySelector('.sk-context-text').textContent, meter:document.querySelector('.sk-context-meter').value };
            });
            assert.equal(layout.hidden,false,`${size} ${name}: context is visible`);
            assert.equal(layout.visibility,'visible',`${size} ${name}: no hidden cue in the screenshot`);
            assert.equal(layout.instruction,rec.cue.instruction);
            assert.ok(layout.panel.width > 0 && layout.panel.height > 0);
            assert.ok(layout.panel.x >= 0 && layout.panel.y >= 0 && layout.panel.right <= width && layout.panel.bottom <= height,`${size} ${name}: all help fits`);
            assert.ok(layout.buttons.every(b => !overlap(layout.panel,b)),`${size} ${name}: help leaves controls free`);
            if (name === 'klo-emerge' || name === 'plate-done' || name === 'pool-done') assert.equal(rec.cue.action,'emerge');
            if (name === 'pool-ready') assert.equal(rec.cue.action,'hide');
            if (name.endsWith('working')) assert.equal(rec.cue.state,'working');
            assert.deepEqual(errors,[]);
            await pg.screenshot({path:path.join(out,`${name}-${size}.png`)});
            records.push({viewport:size,...rec,layout});
            if (name === 'klo-emerge') {
                const emerged = await pg.evaluate(() => {
                    const {G,story,guide}=window.__skoldhast.debug;G.player.hidden=false;G.player.hide=0;
                    const next=story.guidance();guide.context(next);
                    return { action:next.action, text:document.querySelector('.sk-context-text').textContent };
                });
                assert.notEqual(emerged.action,'emerge');
                assert.notEqual(emerged.text,rec.cue.instruction,`${size}: coming out clears the emergence instruction immediately`);
            }
        }
        const cleared = await pg.evaluate(() => {
            const {G,guide,story}=window.__skoldhast.debug;
            G.player.hidden=false;G.player.hide=0;G.player.inLane=null;
            const next=story.guidance();guide.context(next);
            return {action:next.action,text:document.querySelector('.sk-context-text').textContent};
        });
        assert.notEqual(cleared.action,'emerge');
        if (width > height) {
            // Exercise the real camera and heroScreen callback, rather than
            // mocking screen positions or assigning the note's side directly.
            await pg.evaluate(() => {
                const {G,view,guide}=window.__skoldhast.debug;
                for (const f of ['shutter1','shutter2','shutter3','lamp_lit','talk_done']) G.flags.add(f);
                for (const f of ['p8_s1','p8_s2','p8_s3','p8_land','p8_sea','p8_done']) G.flags.delete(f);
                G.goto('viken',{x:12*200,y:-.62*200,facing:1},{silent:true});
                Object.assign(G.player,{hidden:false,hide:0,resting:false,gait:'stand',speed:0,vx:0,vy:0});
                view.setScene('viken');guide.clear();
                window.__placeGuidedHero=({fraction,facing,natural=false})=>{
                    const {G,view,guide,story,app,ui,heroScreen}=window.__skoldhast.debug;
                    G.player.facing=facing;
                    const zoom=Math.min(160,Math.max(120,app.screen.height*.36))/200;
                    G.camHint=natural?null:{x:G.player.x+(app.screen.width/2-fraction*app.screen.width)/zoom,y:G.player.y-app.screen.height/zoom*.12,zoom:1};
                    view.cam.snap=true;
                    const cue=story.guidance();G.guidance=cue;guide.goal(cue.goal);guide.context(cue);guide.show(true);ui.setContext(G.context?.label,G.player.hidden);
                    for(let i=0;i<30;i++){
                        view.render(window.__contextSim.snapshot(G.player,1,G.terrain,G.time),1/60);
                        guide.update();
                    }
                    app.render();
                    const note=document.querySelector('.sk-context-guide'),r=note.getBoundingClientRect();
                    // Body container includes the actual head, legs and hair but
                    // excludes the soft shadow below the hooves.
                    const hero=view.layers.hero.children.find(c=>c.label==='hero');
                    const b=hero.children[0].children[1].getBounds();
                    return {fraction,facing,natural,side:note.dataset.side||'right',heroScreen:heroScreen(),
                        visibility:getComputedStyle(note).visibility,
                        panel:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},
                        hero:{x:b.minX,y:b.minY,right:b.maxX,bottom:b.maxY}};
                };
            });
            for(const config of [
                {name:'natural-right-facing',facing:1,natural:true},
                {name:'natural-left-facing',facing:-1,natural:true},
                {name:'left-camera-right-facing',fraction:.3,facing:1},
                {name:'left-camera-left-facing',fraction:.3,facing:-1},
                {name:'right-camera-right-facing',fraction:.7,facing:1},
                {name:'right-camera-left-facing',fraction:.7,facing:-1}
            ]){
                const placed=await pg.evaluate(config=>window.__placeGuidedHero(config),config);
                const expected=placed.heroScreen.x<width*.45?'right':placed.heroScreen.x>width*.55?'left':placed.side;
                assert.equal(placed.side,expected,`${config.name}: help stays on the spare camera side`);
                assert.equal(placed.visibility,'visible');
                assert.ok(Object.values(placed.hero).every(Number.isFinite)&&placed.hero.right>placed.hero.x&&placed.hero.bottom>placed.hero.y,'the rendered hero has real silhouette bounds');
                await pg.screenshot({path:path.join(out,`${config.name}-${size}.png`)});
                assert.ok(!overlap(placed.panel,placed.hero),`${config.name}: help leaves the whole hero silhouette clear: ${JSON.stringify(placed)}`);
                records.push({viewport:size,name:config.name,placement:placed});
            }
            const sequence=[.3,.49,.51,.54,.56,.51,.49,.46,.44];
            const expected=['right','right','right','right','left','left','left','left','right'];
            const turns=[];
            for(let i=0;i<sequence.length;i++){
                const placed=await pg.evaluate(config=>window.__placeGuidedHero(config),{fraction:sequence[i],facing:i%2?1:-1});
                assert.ok(Math.abs(placed.heroScreen.x/width-sequence[i])<.001,'camera places the actual hero at the requested fraction');
                assert.equal(placed.side,expected[i],`small turn-around at ${sequence[i]} does not flip the help card`);
                turns.push(placed);
            }
            records.push({viewport:size,name:'camera-hysteresis',turns});
            console.log(`${size}: both facings and camera sides leave the hero clear; centre hysteresis is stable`);
        }
        console.log(`${size}: nine contextual states fit and track the current task`);
        await pg.close();
    }
    fs.writeFileSync(path.join(out,'states.json'),JSON.stringify({records,errors},null,2));
    assert.deepEqual(errors,[]);
} finally { await browser.close(); server.close(); }
