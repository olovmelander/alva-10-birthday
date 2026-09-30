/* Kartväktaren is a little jointed paper figure. All pose arithmetic is local
 * to his feet; only the outer container knows world coordinates. The map with
 * LAND/HAV stays in the scene, outside the mirrored, wordless paper rig. */
const TAU = Math.PI * 2;
const SIZE = 1.06;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const damp = (a, b, dt) => a + (b - a) * (1 - Math.exp(-12 * dt));
const POINTS = ['hip','chest','head','backKnee','backAnkle','frontKnee','frontAnkle','backElbow','backWrist','frontElbow','frontWrist','rulerA','rulerB'];
const STAND = [[0,-64],[6,-120],[15,-148],[-3,-33],[-6,-4],[6,-33],[8,-4],[-8,-99],[6,-86],[16,-99],[24,-84],[-26,-108],[38,-101]];
const POSES = {
    stand: STAND,
    worry: [[0,-62],[4,-116],[13,-141],[1,-32],[-6,-4],[2,-32],[9,-4],[-6,-100],[14,-110],[16,-97],[18,-112],[-24,-103],[36,-98]],
    point: [[0,-64],[6,-120],[16,-149],[-3,-33],[-6,-4],[6,-33],[8,-4],[-10,-98],[-2,-84],[24,-106],[40,-112],[37,-110],[92,-126]],
    bow: [[-4,-64],[30,-108],[48,-112],[-6,-33],[-6,-4],[2,-33],[5,-4],[22,-86],[28,-68],[30,-84],[34,-66],[18,-62],[50,-70]],
    draw: [[-2,-64],[14,-117],[28,-140],[-3,-33],[-6,-4],[6,-33],[8,-4],[0,-94],[4,-80],[26,-96],[40,-84],[-22,-104],[30,-112]],
    unfold: [[0,-64],[3,-121],[8,-150],[-3,-33],[-6,-4],[6,-33],[8,-4],[-26,-128],[-46,-140],[26,-126],[48,-138],[-26,-108],[38,-101]],
    fold: [[0,-62],[10,-118],[23,-143],[-3,-33],[-6,-4],[6,-33],[8,-4],[0,-103],[20,-98],[27,-106],[29,-98],[-26,-108],[38,-101]],
    peek: [[0,-64],[6,-120],[21,-31],[-3,-33],[-6,-4],[6,-33],[8,-4],[-8,-99],[0,-52],[16,-99],[0,-8],[-26,-108],[38,-101]]
};

export function guardianPoseName(actor = {}) {
    const pose = (actor.pose || 'stand').replace(/^kv-/, '');
    if (pose === 'peek') return 'peek'; // a still shutter glimpse must never become a walk
    if (actor.walk || pose.startsWith('walk')) return 'walk';
    return POSES[pose] ? pose : 'stand';
}

export function createGuardianPose() {
    const pose = {};
    for (const name of POINTS) pose[name] = [0,0];
    return pose;
}

/** Pure, reusable pose sampler: pass `out` to avoid allocating while rendering. */
export function sampleGuardian(actor = {}, { time = 0, distance = actor.distance || 0,
    activity = actor.walk ? 1 : 0, talking = false, reducedMotion = false } = {}, out = createGuardianPose()) {
    const name = guardianPoseName(actor), base = POSES[name] || STAND;
    for (let i = 0; i < POINTS.length; i++) {
        out[POINTS[i]][0] = base[i][0]; out[POINTS[i]][1] = base[i][1];
    }
    out.name = name;
    out.peek = name === 'peek';
    out.mood = ['bow','draw','unfold'].includes(name) ? 'soft' : name === 'worry' || name === 'peek' ? 'worry' : 'normal';
    const blink = (time + 0.71) % 4.9;
    out.blink = !reducedMotion && (blink < 0.13 || blink > 0.26 && blink < 0.32);
    out.talk = !!(talking || actor.talking || actor.talkUntil > time);
    out.mouth = out.talk && !reducedMotion && Math.sin(time * 13) > -0.2;
    out.headAngle = name === 'bow' ? 0.95 : name === 'peek' ? 0.24 : name === 'draw' ? 0.3 : name === 'unfold' ? -0.12 : name === 'worry' ? -0.08 : 0.06;
    out.capeAngle = 0; out.frontShoe = 0; out.backShoe = 0;
    out.ruler = !['unfold','fold','peek'].includes(name);
    out.pencil = name === 'draw';
    out.hand = name === 'unfold' ? 'open' : name === 'point' || name === 'draw' ? 'grip' : 'mitt';
    if (reducedMotion) return out;
    const breath = Math.sin(time * 1.7) * (name === 'worry' ? 0.9 : 0.55);
    if (!out.peek) {
        out.chest[1] += breath; out.head[1] += breath * 1.6;
        out.backElbow[1] += breath; out.frontElbow[1] += breath;
        out.backWrist[1] += breath; out.frontWrist[1] += breath;
        out.rulerA[1] += breath; out.rulerB[1] += breath;
    }
    out.headAngle += Math.sin(time * 1.3) * 0.018;
    out.capeAngle = Math.sin(time * 2.3) * 0.022 + Math.sin(time * 3.7 + 1) * 0.011;
    if (name === 'walk') {
        const phase = distance / 82 * TAU;
        const weight = clamp(activity, 0, 1);
        for (let i = 0; i < 2; i++) {
            const p = phase + i * Math.PI, side = i ? 'front' : 'back';
            const swing = Math.sin(p), lift = Math.max(0, Math.cos(p)) * 10 * weight;
            out[side + 'Ankle'][0] += swing * 19 * weight;
            out[side + 'Ankle'][1] -= lift;
            out[side + 'Knee'][0] += swing * 8 * weight + lift * 0.4;
            out[side + 'Knee'][1] -= lift * 0.55;
            out[side + 'Elbow'][0] -= swing * 5 * weight;
            out[side + 'Wrist'][0] -= swing * 8 * weight;
            out[side + 'Shoe'] = Math.cos(p) * 0.13 * weight;
        }
        const bob = -Math.abs(Math.sin(phase * 2)) * 1.6 * weight;
        for (const key of ['hip','chest','head']) { out[key][1] += bob; out[key][0] += key === 'hip' ? 0 : 4 * weight; }
        out.capeAngle -= 0.07 * weight + Math.sin(phase) * 0.035 * weight;
    } else if (!out.peek) {
        // Tiny gestures have deliberate pauses; the paper man need not wave forever.
        const gesture = out.talk ? Math.sin(time * 5.4) * 2.1 : Math.sin(time * 1.9) * 0.55;
        const fidget = name === 'worry' ? Math.sin(time * 7) * 0.85 : 0;
        out.frontWrist[1] += gesture; out.frontWrist[0] += fidget;
        out.backWrist[0] -= fidget;
        if (name === 'point') { out.rulerA[1] += gesture; out.rulerB[1] += gesture * 1.7; }
        if (name === 'draw') { out.frontWrist[0] += Math.sin(time * 4.2) * 3; out.frontWrist[1] += Math.cos(time * 8.4) * 1.3; }
        if (name === 'unfold') { const open = Math.sin(time * 1.7) * 1.4; out.frontWrist[0] += open; out.backWrist[0] -= open; }
    } else {
        out.head[0] += Math.sin(time * 1.4) * 0.6;
        out.head[1] += breath;
    }
    return out;
}

/** Sprite-only articulation. The scene owns container teardown; no listeners,
 * timers, filters or gameplay state are created here. Complete poses are kept
 * as a fallback while the bay atlas is arriving. */
export function createGuardian(PIXI, { texture }) {
    const container = new PIXI.Container(), art = new PIXI.Container();
    container.label = 'guardian'; art.label = 'guardian-parts';
    const shadow = new PIXI.Graphics();
    for (let i = 4; i >= 1; i--) shadow.ellipse(1,0,12 + i * 3.5,1 + i * 0.9).fill({ color: 0x524b49, alpha: 0.023 + (4-i)*0.008 });
    const fallback = new PIXI.Sprite(PIXI.Texture.EMPTY); fallback.anchor.set(0.5,1);
    fallback.label = 'guardian-fallback';
    container.addChild(shadow, art, fallback);
    const pieces = [];
    const sprite = (name) => {
        const s = new PIXI.Sprite(texture('kv-part-' + name) || PIXI.Texture.EMPTY);
        s.label = 'kv-part-' + name;
        s.anchor.set(0.5,0.5); art.addChild(s); pieces.push({ s, name }); return s;
    };
    const backUpper = sprite('arm'), backLower = sprite('arm'), backHand = sprite('hand-mitt');
    const backThigh = sprite('leg'), backShin = sprite('leg'), backShoe = sprite('shoe');
    const frontThigh = sprite('leg'), frontShin = sprite('leg'), frontShoe = sprite('shoe');
    const cape = sprite('cape'), coat = sprite('coat'), neck = sprite('neck');
    const head = sprite('head-normal'), ruler = sprite('ruler');
    const frontUpper = sprite('arm'), frontLower = sprite('arm'), frontHand = sprite('hand-mitt'), pencil = sprite('pencil');
    const desired = createGuardianPose(), current = createGuardianPose();
    const leftHip = [0,0], rightHip = [0,0], backShoulder = [0,0], frontShoulder = [0,0], neckTop = [0,0];
    let ready = false, initialized = false, lastX = 0, distance = 0, activity = 0;
    let facing = 1, turnTarget = 1, turn = 1;
    const frame = (s, name) => { const t = texture(name); if (t && s.texture !== t) s.texture = t; };
    const at = (s, p) => s.position.set(p[0] * SIZE, p[1] * SIZE);
    const bone = (s, a, b) => {
        at(s,a); s.rotation = Math.atan2(b[1]-a[1],b[0]-a[0]) - Math.PI/2;
        s.scale.y = Math.hypot(b[0]-a[0],b[1]-a[1]) / 32;
    };
    function update(actor, { scene, time = 0, dt = 1/60, hero, talking = false, reducedMotion = false, figure = false } = {}) {
        container.visible = !!actor?.visible && (!scene || actor.scene === scene);
        if (!container.visible) { initialized = false; return; }
        const step = clamp(dt,0,0.1), poseName = guardianPoseName(actor);
        if (!initialized) { lastX = actor.x; facing = turnTarget = actor.facing || 1; turn = 1; activity = 0; }
        const dx = actor.x - lastX;
        if (Math.abs(dx) < 100 && Math.abs(dx) > 0.0001) distance += Math.abs(dx);
        lastX = actor.x;
        const moving = !!actor.walk || poseName === 'walk';
        activity = damp(activity,moving ? 1 : 0,step);
        sampleGuardian(actor,{time,distance,activity,talking,reducedMotion},desired);
        for (const key of POINTS) for (let i=0;i<2;i++) current[key][i] = initialized && !reducedMotion && current.peek === desired.peek ? damp(current[key][i],desired[key][i],step) : desired[key][i];
        current.headAngle = initialized && !reducedMotion ? damp(current.headAngle,desired.headAngle,step) : desired.headAngle;
        current.peek = desired.peek;
        const wanted = actor.facing || (hero && Math.sign(hero.x-actor.x)) || 1;
        if (wanted !== turnTarget) { turnTarget = wanted; turn = 0; }
        turn = reducedMotion ? 1 : Math.min(1,turn + step / 0.22);
        if (turn >= 0.5) facing = turnTarget;
        art.scale.x = facing * (1 - Math.sin(turn * Math.PI) * 0.18);
        container.position.set(actor.x,actor.y);
        const pop = clamp(actor.pop || 0,0,1);
        art.scale.y = 1 - pop * 0.6; art.alpha = 1 - pop * 0.5;
        shadow.visible = !desired.peek && !figure;
        if (!ready && texture('kv-part-coat')) { for (const p of pieces) frame(p.s,'kv-part-' + p.name); ready = true; }
        art.visible = ready; fallback.visible = !ready;
        if (!ready) {
            frame(fallback,'kv-' + (poseName === 'walk' ? 'walk-1' : poseName));
            fallback.scale.set(facing,1-pop*0.6); initialized = true; return;
        }
        // No text lives under `art`; the separate map is never reflected.
        for (const p of pieces) p.s.visible = !desired.peek;
        head.visible = backHand.visible = frontHand.visible = true;
        const c = current, bodyAngle = Math.atan2(c.chest[0]-c.hip[0],-(c.chest[1]-c.hip[1]));
        at(coat,c.hip); coat.rotation = bodyAngle;
        at(cape,c.hip); cape.rotation = bodyAngle + desired.capeAngle;
        leftHip[0]=c.hip[0]-4; leftHip[1]=c.hip[1]-2; rightHip[0]=c.hip[0]+4; rightHip[1]=c.hip[1]-2;
        backShoulder[0]=c.chest[0]-9.5; backShoulder[1]=c.chest[1]+3;
        frontShoulder[0]=c.chest[0]+9; frontShoulder[1]=c.chest[1]+2;
        neckTop[0]=c.head[0]-2; neckTop[1]=c.head[1]+15;
        bone(backThigh,leftHip,c.backKnee); bone(backShin,c.backKnee,c.backAnkle);
        bone(frontThigh,rightHip,c.frontKnee); bone(frontShin,c.frontKnee,c.frontAnkle);
        bone(backUpper,backShoulder,c.backElbow); bone(backLower,c.backElbow,c.backWrist);
        bone(frontUpper,frontShoulder,c.frontElbow); bone(frontLower,c.frontElbow,c.frontWrist);
        bone(neck,c.chest,neckTop);
        at(backShoe,c.backAnkle); backShoe.rotation=desired.backShoe;
        at(frontShoe,c.frontAnkle); frontShoe.rotation=desired.frontShoe;
        at(head,c.head); head.rotation=c.headAngle;
        frame(head,'kv-part-head-' + desired.mood + (desired.blink ? '-blink' : desired.mouth ? '-talk' : ''));
        frame(frontHand,'kv-part-hand-' + desired.hand);
        frame(backHand,'kv-part-hand-' + (desired.name === 'unfold' ? 'open' : 'mitt'));
        at(frontHand,c.frontWrist); at(backHand,c.backWrist);
        frontHand.rotation = desired.peek ? 0 : Math.atan2(c.frontWrist[1]-c.frontElbow[1],c.frontWrist[0]-c.frontElbow[0]);
        backHand.rotation = desired.peek ? 0 : Math.atan2(c.backWrist[1]-c.backElbow[1],c.backWrist[0]-c.backElbow[0]);
        ruler.visible = desired.ruler && !desired.peek;
        ruler.position.set((c.rulerA[0]+c.rulerB[0])*SIZE/2,(c.rulerA[1]+c.rulerB[1])*SIZE/2);
        ruler.rotation = Math.atan2(c.rulerB[1]-c.rulerA[1],c.rulerB[0]-c.rulerA[0]);
        ruler.scale.x = Math.hypot(c.rulerB[0]-c.rulerA[0],c.rulerB[1]-c.rulerA[1])/64;
        pencil.visible=desired.pencil; at(pencil,c.frontWrist);
        pencil.rotation = Math.sin(time*4.2) * (reducedMotion ? 0 : 0.05);
        initialized=true;
    }
    return { container, update, pose: current, headBounds: () => ready ? head.getBounds() : fallback.getBounds() };
}
