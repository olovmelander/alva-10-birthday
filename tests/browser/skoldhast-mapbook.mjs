#!/usr/bin/env node
// Collected map fragments in the real notebook: keyboard and touch, narrow
// phones, zoom/pan/reset, old saves and reconstruction without state changes.
// node tests/browser/skoldhast-mapbook.mjs [--out /tmp/mapbook]
// Optional --viewport 320x568 and --input touch narrow a follow-up check.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { serve, launch } from '../../scripts/skoldhast-shot.mjs';
import { MAP } from '../../skoldhast/src/content/sv.mjs';
import { MAP_FRAGMENTS } from '../../skoldhast/src/mapbook.mjs';
const oi=process.argv.indexOf('--out'),out=oi<0?null:process.argv[oi+1];
const vi=process.argv.indexOf('--viewport'),ii=process.argv.indexOf('--input');
const sizes=vi<0?['844x390','390x844','320x568','1440x900']:[process.argv[vi+1]];
const inputs=ii<0?['keyboard','touch']:[process.argv[ii+1]];
if(out)fs.mkdirSync(out,{recursive:true});
const server=await serve(),browser=await launch(),errors=[],records=[];
const states={none:[],corner:['corner'],land:['corner','land'],all:['corner','land','sea']};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} approximately ${b}`);
try {
    for(const size of sizes)for(const input of inputs) {
        const [width,height]=size.split('x').map(Number);
        const pg=await browser.newPage({viewport:{width,height},hasTouch:true,deviceScaleFactor:1});
        pg.on('pageerror',e=>errors.push(`${size}/${input}: ${e.message}`));
        pg.on('console',e=>{if(e.type()==='error')errors.push(`${size}/${input}: ${e.text()}`);});
        const activate=async locator=>{
            // Native nearest-edge scrolling keeps the drawing beside the control;
            // Playwright's forced centering can overscroll into the notes below.
            await locator.evaluate(button=>button.scrollIntoView({block:'nearest',inline:'nearest'}));
            if(width>height&&height<=450) {
                const shared=await locator.evaluate(button=>{
                    const root=button.closest('.sk-mapbook');
                    if(!root||!button.closest('.sk-mapbook-tools,.sk-mapbook-pan'))return null;
                    const stage=root.querySelector('.sk-mapbook-stage').getBoundingClientRect(),page=root.closest('.sk-j-page').getBoundingClientRect(),b=button.getBoundingClientRect();
                    const detail=root.querySelector('.sk-mapbook-detail').getBoundingClientRect();
                    const visible=(r)=>Math.max(0,Math.min(r.bottom,page.bottom)-Math.max(r.top,page.top))*Math.max(0,Math.min(r.right,page.right)-Math.max(r.left,page.left))/(r.width*r.height);
                    return {stageVisible:visible(stage),buttonVisible:visible(b),stageHeight:stage.height,text:button.textContent,
                        detailOverlap:Math.max(0,Math.min(stage.bottom,detail.bottom)-Math.max(stage.top,detail.top)),
                        stage:[stage.top,stage.bottom],page:[page.top,page.bottom],button:[b.top,b.bottom]};
                });
                if(shared) {
                    if((shared.stageVisible<=.95||shared.buttonVisible<=.95||shared.detailOverlap>1)&&out)await pg.screenshot({path:path.join(out,`control-visibility-${size}-${input}.png`)});
                    assert.ok(shared.stageVisible>.95&&shared.buttonVisible>.95,`${size}: map stays visible while using controls ${JSON.stringify(shared)}`);
                    assert.ok(shared.detailOverlap<=1,`${size}: sticky map never obscures discovery details ${JSON.stringify(shared)}`);
                }
            }
            if(input==='touch')await locator.tap();else {await locator.focus();await pg.keyboard.press('Enter');}
        };
        // Measure the settled page: until its entry animation ends the sheet is tilted and
        // scaled, and a slow first frame (software GL) can hold it there for over a second.
        const waitBook=()=>pg.waitForFunction(()=>document.querySelector('.sk-mapbook')&&!document.querySelector('.sk-j-flip')
            &&document.getAnimations().filter(a=>a.animationName==='sk-sheet-in').every(a=>a.playState==='finished'));
        const box=()=>pg.locator('.sk-mapbook-stage svg').getAttribute('viewBox').then(v=>v.split(/\s+/).map(Number));
        const shot=async name=>{
            if(!out||input!=='touch')return;
            await pg.locator('.sk-mapbook-stage').scrollIntoViewIfNeeded();
            await sharp(await pg.screenshot()).webp({quality:90}).toFile(path.join(out,`${name}-${size}.webp`));
        };
        const layout=async label=>{
            const d=await pg.locator('.sk-mapbook').evaluate(root=>{
                const page=root.closest('.sk-j-page'),r=root.getBoundingClientRect(),p=page.getBoundingClientRect();
                const nav=document.querySelector('.sk-j-nav'),counter=nav.querySelector('.sk-j-dots'),range=document.createRange();
                range.selectNodeContents(counter);
                return {rootWidth:r.width,pageWidth:p.width,scroll:page.scrollWidth,client:page.clientWidth,
                    footer:{scroll:nav.scrollWidth,client:nav.clientWidth,counterLines:range.getClientRects().length,
                        buttons:[...nav.querySelectorAll('button')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))},
                    buttons:[...root.querySelectorAll('button')].filter(b=>!b.hidden&&!b.closest('[hidden]')).map(b=>({
                        text:b.textContent,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,
                        overflow:b.scrollWidth>b.clientWidth+2}))};
            });
            assert.ok(d.rootWidth<=d.pageWidth+1&&d.scroll<=d.client+1,`${label}: no horizontal notebook overflow ${JSON.stringify(d)}`);
            assert.ok(d.buttons.every(b=>b.w>=43.5&&b.h>=43.5&&!b.overflow),`${label}: readable44px controls ${JSON.stringify(d.buttons)}`);
            assert.ok(d.footer.scroll<=d.footer.client+1&&d.footer.counterLines===1&&d.footer.buttons.every(b=>b.w>=43.5&&b.h>=43.5),`${label}: footer fits with44px controls ${JSON.stringify(d.footer)}`);
            return d;
        };
        for(const [state,found] of Object.entries(states)) {
            await pg.goto(`http://127.0.0.1:${server.address().port}/skoldhast/dev/menus.html?m=journal&page=4&map=${state}&shot=1`);
            await waitBook();await pg.evaluate(()=>document.fonts.ready);
            assert.deepEqual(await pg.locator('.sk-map-piece').evaluateAll(ns=>ns.map(n=>n.dataset.piece)),found);
            assert.equal(await pg.locator('.sk-map-missing').count(),3-found.length);
            assert.equal(await pg.locator('.sk-mapbook-count').textContent(),MAP.count(found.length,3));
            assert.equal(await pg.locator('.sk-mapbook-scale').textContent(),MAP.zoomLevel(100));
            assert.equal(await pg.locator('.sk-mapbook-piece-icon svg').count(),3,'each selector shows the real torn silhouette');
            assert.equal(await pg.locator('.sk-mapbook-piece-icon image').count(),found.length,'missing pieces cannot reveal unearned artwork');
            assert.ok((await pg.locator('.sk-mapbook-stage svg').getAttribute('aria-label')).includes(MAP.collectedSummary(found.map(id=>MAP.pieces[id].name))));
            for(const id of ['corner','land','sea'])assert.equal(await pg.locator(`.sk-mapbook-piece[data-piece="${id}"]`).isDisabled(),!found.includes(id));
            for(const [index,id] of ['corner','land','sea'].entries())if(!found.includes(id))assert.equal(await pg.locator(`.sk-mapbook-piece[data-piece="${id}"]`).getAttribute('aria-label'),MAP.missingPiece(index+1,3));
            assert.equal(await pg.getByRole('button',{name:MAP.zoomIn,exact:true}).isDisabled(),!found.length);
            assert.equal(await pg.locator('.sk-mapbook-pan').isVisible(),false);
            const dimensions=await layout(`${size}/${input}/${state}`);await shot(state);
            records.push({size,input,state,found,dimensions});
            if(found.length) {
                const id=found.at(-1);
                await activate(pg.locator(`.sk-mapbook-piece[data-piece="${id}"]`));
                assert.equal(await pg.locator('.sk-mapbook').getAttribute('data-selected'),id);
                assert.equal(await pg.locator('.sk-mapbook-detail strong').textContent(),MAP.pieces[id].name);
                assert.equal(await pg.locator(`.sk-mapbook-piece[data-piece="${id}"]`).getAttribute('aria-pressed'),'true');
            }
        }
        // Inspect the artwork itself with a real tap/click, including SVG aspect
        // ratio letterboxing and the notebook's transformed paper surface.
        for(const [id,x,y] of [['corner',440,125],['land',145,125],['sea',200,330]]) {
            await activate(pg.getByRole('button',{name:MAP.overview,exact:true}));
            await pg.locator('.sk-mapbook-stage').scrollIntoViewIfNeeded();
            const p=await pg.locator('.sk-mapbook-stage svg').evaluate((svg,{x,y})=>{
                const p=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y};
            },{x,y});
            if(input==='touch')await pg.touchscreen.tap(p.x,p.y);else await pg.mouse.click(p.x,p.y);
            assert.equal(await pg.locator('.sk-mapbook').getAttribute('data-selected'),id,`${size}: direct ${input} on${id}`);
            assert.equal(await pg.locator('.sk-mapbook-stage .sk-map-piece.selected').getAttribute('data-piece'),id);
            await shot(`inspect-${id}`);
        }
        await activate(pg.locator('.sk-mapbook-piece[data-piece="land"]'));
        await pg.locator('.sk-mapbook-detail').evaluate(detail=>{
            window.__mapDetailChanges=0;
            window.__mapDetailObserver=new MutationObserver(records=>{window.__mapDetailChanges+=records.length;});
            window.__mapDetailObserver.observe(detail,{childList:true,subtree:true,characterData:true});
        });
        for(let i=0;i<3;i++)await activate(pg.getByRole('button',{name:MAP.zoomIn,exact:true}));
        assert.ok(Number(await pg.locator('.sk-mapbook').getAttribute('data-zoom'))>2.7);
        assert.equal(await pg.getByRole('button',{name:MAP.zoomIn,exact:true}).isDisabled(),true);
        assert.equal(await pg.locator('.sk-mapbook-pan').isVisible(),true);
        assert.equal(await pg.locator('.sk-mapbook-scale').textContent(),MAP.zoomLevel(274));
        assert.equal(await pg.locator('.sk-mapbook-scale').getAttribute('aria-label'),MAP.viewStatus(MAP.pieces.land.name,274));
        await layout(`${size}/${input}/zoomed`);
        const bounds=MAP_FRAGMENTS.find(p=>p.id==='land').box;
        for(const direction of ['left','up','right','down']) {
            const b=pg.locator(`[data-pan="${direction}"]`);
            for(let i=0;i<10&&!await b.isDisabled();i++)await activate(b);
            assert.equal(await b.isDisabled(),true,`${direction}: clamps at paper edge`);
            const v=await box();
            near(direction==='left'?v[0]:direction==='up'?v[1]:direction==='right'?v[0]+v[2]:v[1]+v[3],
                direction==='left'?bounds[0]:direction==='up'?bounds[1]:direction==='right'?bounds[0]+bounds[2]:bounds[1]+bounds[3]);
        }
        await shot('land-zoom-pan');
        assert.equal(await pg.evaluate(()=>window.__mapDetailChanges),0,'zoom and pan announce the view without repeating the discovery paragraph');
        await pg.evaluate(()=>window.__mapDetailObserver.disconnect());
        await activate(pg.getByRole('button',{name:MAP.reset,exact:true}));
        assert.deepEqual(await box(),bounds);assert.equal(await pg.locator('.sk-mapbook').getAttribute('data-selected'),'land');
        assert.equal(await pg.locator('.sk-mapbook-pan').isVisible(),false);
        await activate(pg.getByRole('button',{name:MAP.zoomIn,exact:true}));
        await activate(pg.getByRole('button',{name:MAP.zoomOut,exact:true}));
        assert.deepEqual(await box(),bounds);
        await activate(pg.getByRole('button',{name:MAP.overview,exact:true}));
        assert.deepEqual(await box(),[0,0,640,420]);
        // Ordinary Tab navigation reaches a piece; Enter activates the same
        // selection path without turning the notebook to a different page.
        await pg.locator('.sk-mapbook-piece[data-piece="corner"]').focus();
        await pg.keyboard.press('Tab');await pg.keyboard.press('Enter');
        assert.equal(await pg.locator('.sk-mapbook').getAttribute('data-selected'),'land');
        // Real rebuild with an old save object: controls must be ephemeral and
        // never write zoom/selection/pan into the saved progress or note.
        const before=await pg.evaluate(()=>{
            window.__oldMapState={flags:new Set(['clue_map_corner','clue_mark_land','clue_mark_sea']),visited:new Set(['land','kelp']),
                objective:'p5',tally:1,note:'Blyerts',pencils:2,pencilsTotal:15,page:4};
            window.__menus.ui.journal(window.__oldMapState);
            return JSON.stringify({...window.__oldMapState,flags:[...window.__oldMapState.flags],visited:[...window.__oldMapState.visited]});
        });
        await waitBook();
        assert.equal(await pg.locator('.sk-map-piece').count(),3);
        assert.ok((await pg.locator('.map-labels').allTextContents()).some(t=>t.includes(MAP.places.tower)),'legacy land discovery retains lighthouse map art');
        const oldId=await pg.locator('clipPath').first().getAttribute('id');
        await activate(pg.locator('.sk-mapbook-piece[data-piece="sea"]'));
        await activate(pg.getByRole('button',{name:MAP.zoomIn,exact:true}));
        const after=await pg.evaluate(()=>JSON.stringify({...window.__oldMapState,flags:[...window.__oldMapState.flags],visited:[...window.__oldMapState.visited]}));
        assert.equal(after,before);
        await activate(pg.locator('.sk-x'));
        await pg.evaluate(()=>window.__menus.ui.journal(window.__oldMapState));await waitBook();
        assert.equal(await pg.locator('.sk-mapbook').getAttribute('data-selected'),'all');
        assert.equal(await pg.locator('.sk-mapbook').getAttribute('data-zoom'),'1.000');
        assert.notEqual(await pg.locator('clipPath').first().getAttribute('id'),oldId,'rebuild gives SVG definitions unique IDs');
        if(size==='320x568') {
            await pg.evaluate(()=>window.__menus.ui.setBigText(true));
            await layout(`${size}/${input}/big-text`);await shot('all-big-text');
        }
        // Reversed collection order has no land picture or land-dependent names.
        await pg.evaluate(()=>window.__menus.ui.journal({flags:new Set(['clue_map_corner','clue_mark_sea']),visited:new Set(['land','kelp']),objective:'p4',page:4}));
        await waitBook();
        assert.deepEqual(await pg.locator('.sk-map-piece').evaluateAll(ns=>ns.map(n=>n.dataset.piece)),['corner','sea']);
        assert.equal(await pg.locator('.sk-mapbook-piece.land').isDisabled(),true);
        assert.equal(await pg.locator('.map-labels [data-place="tower"]').count(),0,'unearned lighthouse name stays hidden');
        await activate(pg.locator('.sk-mapbook-piece.sea'));await shot('sea-before-land');
        // The same controls work immediately with reduced motion, including a
        // late/absent image fallback that retains the map's real coast.
        await pg.emulateMedia({reducedMotion:'reduce'});
        await pg.evaluate(async()=>{
            const {createMapBook}=await import('/skoldhast/src/mapbook.mjs');
            document.querySelector('.sk-mapbook').replaceWith(createMapBook({flags:new Set(['clue_map_corner'])}));
        });
        assert.equal(await pg.locator('.sk-mapbook-stage image').count(),0);
        assert.ok(await pg.locator('.sk-mapbook-stage .sk-map-piece path[fill="#efd9a4"]').count(),'fallback keeps the actual beach geography');
        await activate(pg.locator('.sk-mapbook-piece.corner'));
        await activate(pg.getByRole('button',{name:MAP.zoomIn,exact:true}));
        await layout(`${size}/${input}/reduced-fallback`);await shot('reduced-fallback');
        await activate(pg.locator('.sk-x'));assert.equal(await pg.locator('.sk-panel').evaluate(n=>n.classList.contains('on')),false);
        await pg.close();console.log(`mapbook ${size} ${input}: pieces, inspect, zoom/pan/reset, rebuild`);
    }
    assert.deepEqual(errors,[]);
    if(out)fs.writeFileSync(path.join(out,'mapbook-states.json'),JSON.stringify({records,errors},null,2));
} finally {await browser.close();server.close();}
