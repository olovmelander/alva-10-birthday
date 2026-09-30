/* Physical affordances for P7. The same small paper symbol is attached to
 * each mechanism and its shutter, so the connection survives a close camera. */
const INK = 0x645b49, PAPER = 0xf6edcf, GOLD = 0xc29641;
const clamp = x => Math.max(0, Math.min(1, x));

export function lighthouseMechanismStates(def, puz, flags) {
    const drum = def.drums[0], plate = def.plates[0], rope = def.pullRopes[0];
    return [
        { flag: drum.flag, kind: 'hoof', progress: clamp((puz.drums[drum.id] || 0) / drum.notches) },
        { flag: plate.flag, kind: 'shell', progress: clamp((puz.plates[plate.id] || 0) / plate.hold) },
        { flag: rope.flag, kind: 'rope', progress: 0 }
    ].map((m, i) => ({ ...m, done: flags.has(m.flag), progress: flags.has(m.flag) ? 1 : m.progress,
        source: def.chains[i].from, shutter: def.shutters[i] }));
}

function icon(g, kind, color = INK) {
    const stroke = { color, width: 3, cap: 'round', join: 'round' };
    if (kind === 'hoof') {
        g.moveTo(-9, 9).quadraticCurveTo(-18, -15, 0, -16).quadraticCurveTo(18, -15, 9, 9)
            .lineTo(4, 9).quadraticCurveTo(11, -10, 0, -10).quadraticCurveTo(-11, -10, -4, 9).closePath().stroke(stroke);
    } else if (kind === 'shell') {
        g.moveTo(-18, 8).quadraticCurveTo(-16, -15, 0, -17).quadraticCurveTo(16, -15, 18, 8).closePath().stroke(stroke);
        g.moveTo(-15, 1).lineTo(15, 1).moveTo(-8, -12).lineTo(-5, 1).lineTo(-8, 8)
            .moveTo(8, -12).lineTo(5, 1).lineTo(8, 8).stroke({ color, width: 2 });
    } else {
        g.moveTo(0, -20).lineTo(0, -6).quadraticCurveTo(-15, 7, -9, 14)
            .quadraticCurveTo(0, 24, 9, 14).quadraticCurveTo(15, 7, 0, -6).stroke(stroke);
    }
}

export function createLighthouseMechanisms(PIXI, def) {
    const container = new PIXI.Container(), physical = new PIXI.Graphics();
    container.label = 'lighthouse-mechanisms'; container.addChild(physical);
    const sourceAt = [
        [def.chains[0].from.x - 105, def.chains[0].from.y - 10],
        [def.plates[0].x - 142, def.plates[0].y - 75],
        [def.pullRopes[0].x + 64, def.pullRopes[0].y - 135]
    ];
    const badges = ['hoof', 'shell', 'rope'].map((kind, i) => {
        const make = (x, y) => {
            const c = new PIXI.Container(), paper = new PIXI.Graphics(), glyph = new PIXI.Graphics(), progress = new PIXI.Graphics();
            paper.poly([-29,-29,24,-32,31,23,-25,28]).fill({color:PAPER,alpha:.97}).stroke({color:INK,width:2,alpha:.7});
            paper.poly([-25,-26,23,-28,28,21,-23,25]).stroke({color:INK,width:1,alpha:.2});
            icon(glyph, kind); c.addChild(paper, glyph, progress); c.position.set(x,y); container.addChild(c);
            return {c,paper,glyph,progress};
        };
        return { local: make(...sourceAt[i]), shutter: make(def.shutters[i].x,def.shutters[i].y-127), fraction:-1, done:null };
    });
    let lastPhysical = '';
    function update(puz, flags) {
        const states = lighthouseMechanismStates(def,puz,flags);
        for (const [i,s] of states.entries()) {
            const b = badges[i], fraction = Math.round(s.progress*12)/12;
            if(b.fraction===fraction&&b.done===s.done)continue;
            b.fraction=fraction;b.done=s.done;
            for(const m of [b.local,b.shutter]) {
                m.glyph.tint=s.done?0x897035:0xffffff;
                const g=m.progress;g.clear();
                if(fraction>0){
                    g.moveTo(-23,34).lineTo(-23+46*fraction,34).stroke({color:GOLD,width:4,cap:'round'});
                    g.moveTo(-22,37).lineTo(-22+44*fraction,36).stroke({color:INK,width:1,alpha:.3});
                }
                if(s.done)g.moveTo(14,-24).lineTo(19,-19).lineTo(29,-31).stroke({color:0x627c45,width:3,cap:'round'});
            }
        }
        const key=states.map(s=>s.done).join('|');if(key===lastPhysical)return;lastPhysical=key;
        physical.clear();
        const wheel=def.chains[0].from, deck=def.surfaces.find(s=>s.id==='pier').pts[1][1];
        // The ratchet is fixed beneath the resonating boards, never floating.
        physical.moveTo(wheel.x-20,deck+8).lineTo(wheel.x-20,wheel.y).lineTo(wheel.x+20,wheel.y)
            .lineTo(wheel.x+20,deck+8).stroke({color:INK,width:5,alpha:.75});
        physical.circle(wheel.x,wheel.y,5).fill(INK);
        const pl=def.plates[0], py=pl.y-(states[1].done?8:17);
        // A shallow shell-shaped depression, a raised rim and its visible latch.
        physical.ellipse(pl.x,py,pl.w*.47,20).fill({color:0x8f9987,alpha:.55}).stroke({color:INK,width:3,alpha:.65});
        physical.moveTo(pl.x-65,py).quadraticCurveTo(pl.x,py-19,pl.x+65,py).stroke({color:PAPER,width:3,alpha:.8});
        physical.moveTo(pl.x-28,py-10).lineTo(pl.x-18,py+10).moveTo(pl.x+28,py-10).lineTo(pl.x+18,py+10).stroke({color:INK,width:2,alpha:.7});
        // The player pulls a real handle, with a pulley linked to chain three.
        const r=def.pullRopes[0], top=r.y-270, bottom=r.y-85+(states[2].done?25:0);
        physical.circle(r.x,top,19).fill(PAPER).stroke({color:INK,width:4});
        physical.circle(r.x,top,7).stroke({color:INK,width:2});
        physical.moveTo(r.x-11,top).lineTo(r.x-11,bottom-20).stroke({color:INK,width:5,alpha:.8});
        physical.moveTo(r.x-8,top+10).lineTo(r.x-8,bottom-19).stroke({color:PAPER,width:2,alpha:.8});
        physical.moveTo(r.x-11,bottom-20).quadraticCurveTo(r.x-43,bottom+18,r.x-11,bottom+24)
            .quadraticCurveTo(r.x+20,bottom+18,r.x-11,bottom-20).stroke({color:INK,width:7,cap:'round'});
        physical.moveTo(r.x-11,bottom-16).quadraticCurveTo(r.x-35,bottom+15,r.x-11,bottom+19)
            .quadraticCurveTo(r.x+12,bottom+15,r.x-11,bottom-16).stroke({color:0xd6bd84,width:3});
        // Opening a shutter exposes warm light; the full beam waits for all three.
        for(const s of states)if(s.done){
            physical.roundRect(s.shutter.x-30,s.shutter.y-43,60,86,5).fill({color:0xffda80,alpha:.3});
            for(let k=0;k<5;k++)physical.moveTo(s.shutter.x-25+k*11,s.shutter.y-37).lineTo(s.shutter.x-32+k*11,s.shutter.y+36).stroke({color:0xffe6a7,width:3,alpha:.3});
        }
    }
    return {container,update};
}
