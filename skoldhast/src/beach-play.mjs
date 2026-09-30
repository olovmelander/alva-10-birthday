/* Small, state-backed world responses for the two beach toys. */
import { heightOn } from './sim.mjs';
import { UI } from './content/sv.mjs';
const INK=0x514b3b;

export function beachRaceMarkers(def) {
    const start={...def.race.start}, x=def.race.finish;
    const surface=def.surfaces.find(s=>s.pts[0][0]<=x&&s.pts.at(-1)[0]>=x);
    return {start,finish:{x,y:heightOn(surface.pts,x)}};
}

export function createBeachPlay(PIXI,def) {
    const container=new PIXI.Container();container.label='beach-toys';
    const notes=def.shells.map(sh=>{
        const y=heightOn(def.surfaces.find(s=>s.id==='beach').pts,sh.x)-72;
        const g=new PIXI.Graphics();g.label='shell-note-'+sh.id;
        g.ellipse(-6,10,9,6).fill({color:INK,alpha:.85});
        g.moveTo(2,10).lineTo(2,-18).quadraticCurveTo(13,-12,11,-3).stroke({color:INK,width:3,cap:'round'});
        g.moveTo(-15,21).lineTo(13,19).stroke({color:INK,width:1,alpha:.35});
        g.position.set(sh.x,y);g.visible=false;container.addChild(g);return {id:sh.id,g};
    });
    const race=new PIXI.Container();race.label='signe-race-markers';race.visible=false;container.addChild(race);
    const {start,finish}=beachRaceMarkers(def), marks=new PIXI.Graphics();race.addChild(marks);
    // A graphite start stripe and arrow point along the actual racing direction.
    marks.moveTo(start.x,start.y+17).lineTo(start.x-3,start.y+65).stroke({color:INK,width:5,alpha:.8});
    marks.moveTo(start.x+30,start.y+41).lineTo(start.x-68,start.y+41).lineTo(start.x-52,start.y+29)
        .moveTo(start.x-68,start.y+41).lineTo(start.x-52,start.y+53).stroke({color:INK,width:3,alpha:.8,cap:'round',join:'round'});
    // The checkered flag's pole is exactly the finish threshold.
    marks.moveTo(finish.x,finish.y+4).lineTo(finish.x,finish.y-125).stroke({color:INK,width:4});
    marks.poly([finish.x,finish.y-125,finish.x+70,finish.y-120,finish.x+65,finish.y-73,finish.x,finish.y-78])
        .fill(0xf7efd7).stroke({color:INK,width:2});
    for(let row=0;row<3;row++)for(let col=0;col<4;col++)if((row+col)%2===0)
        marks.rect(finish.x+3+col*16,finish.y-121+row*14,15,13).fill({color:INK,alpha:.65});
    const label=(text,x,y)=>{const t=new PIXI.Text({text,style:{fontFamily:'"Patrick Hand", cursive',fontSize:23,fill:INK,letterSpacing:1}});t.anchor.set(.5,0);t.position.set(x,y);race.addChild(t);};
    label(UI.raceStart,start.x,start.y+69);label(UI.raceFinish,finish.x+31,finish.y-67);
    return {container,update(shells,flags){for(const n of notes)n.g.visible=!!shells[n.id];race.visible=flags.has('ended')&&flags.has('signe_met');}};
}
