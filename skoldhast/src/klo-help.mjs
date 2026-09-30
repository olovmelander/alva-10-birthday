/* Pure, requested answers. Task identity follows committed progress, while the
 * exact action keeps following the shared guidance selector and current controls. */
import { KLO_COMPANION as W, GUIDANCE } from './content/sv.mjs';
import { HL } from './sim.mjs';

const total = (F, keys) => keys.filter(key => F.has(key)).length;
const rampFlags = ['p3_t1', 'p3_t2', 'p3_t3'];
const shutterFlags = ['shutter1', 'shutter2', 'shutter3'];
const lineFlags = ['p8_s1', 'p8_s2', 'p8_s3'];

/** Only facts the player has actually discovered; never THREAD.why or a hint. */
function recap(F) {
    const stages = [
        ['ended', 'end'], ['talk_done', 'proof'], ['talk2', 'mapTalk'], ['talk1', 'fear'],
        ['ch2_end', 'tower'], ['marks_both', 'pieces']
    ];
    for (const [flag, stage] of stages) if (F.has(flag)) return W.recap[stage];
    if (F.has('mark_land') && F.has('mark_sea')) return W.recap.pieces;
    if (F.has('mark_land')) return W.recap.land;
    if (F.has('mark_sea')) return W.recap.sea;
    if (F.has('ch1_end')) return W.recap.investigate;
    if (F.has('p3_done') && F.has('p2_open')) return W.recap.survey;
    if (F.has('p3_done')) return W.recap.waves;
    if (F.has('p2_seen')) return W.recap.reflection;
    if (F.has('rule_demo')) return W.recap.map;
    return W.recap.start;
}

export function describeKloHelp(G, cue = {}) {
    const F = G.flags, objective = cue.objective || 'explore';
    // Remove only the physical emergence suffix. It is the same experiment
    // whether the player is walking toward it or already inside the shell.
    const step = (cue.key || objective).split(':')[1] || objective;
    let topic = objective, key = objective;
    if (step === 'afterKlo') { topic = key = 'afterKlo'; }
    else if (step === 'returnRope') { topic = key = 'returnRope'; }
    else if (step.startsWith('route-')) {
        const scene = G.sceneId || G.sceneDef?.id;
        const destination = step.slice(6);
        topic = scene === 'viken' ? 'routeBayExit' : destination === 'viken' ? 'routeViken'
            : scene === 'kelp' ? 'routeLand' : 'routeKelp';
        key = `${topic}:${objective === 'p3b' ? 'p3' : objective}`;
    } else if (objective === 'p2') {
        topic = G.puz.stone === G.scenes.land.rail.target ? 'plank' : 'stone';
        key = `p2:${topic}:${Number(F.has('p2_plank'))}`;
    } else if (objective === 'p1') topic = 'bridge';
    else if (objective === 'p3' || objective === 'p3b') {
        const n = total(F, rampFlags);
        topic = n === 3 ? 'waveLedge' : n ? 'upperRamp' : 'ramp';
        key = `p3:${n}`;
    } else if (objective === 'p4') {
        topic = F.has('p4_leap') ? 'landmark' : 'leap';
        key = `p4:${topic}`;
    } else if (objective === 'p5') {
        topic = step === 'fishRecover' ? 'fishRecover' : 'fish';
        key = 'p5:fish';
    } else if (objective === 'p6') topic = 'vortex';
    else if (objective === 'p7') {
        topic = /^mirror/.test(step) ? 'mirror' : /^pipe/.test(step) ? 'pipe'
            : /^plate/.test(step) ? 'plate' : step === 'rope' ? 'rope' : 'drum';
        key = `p7:${topic}:${shutterFlags.map(f => Number(F.has(f))).join('')}`;
        // An opened plate is a committed transition; do not tell a hidden
        // swimmer to sink onto it again while emergence is the useful action.
        if (cue.instruction === GUIDANCE.afterPlate) topic = 'afterPlate';
    } else if (objective === 'p8') {
        const n = total(F, lineFlags);
        if (F.has('p8_sea') || F.has('p8_done')) { topic = 'p8Draw'; key = 'p8:draw'; }
        else if (F.has('p8_land') || n === lineFlags.length) {
            topic = step === 'p8Jump' ? 'p8Jump' : 'p8Water'; key = 'p8:water';
        } else { topic = 'p8Land'; key = `p8:land:${n}`; }
    } else if (objective === 'talk') {
        topic = F.has('talk2') ? 'talkShore' : F.has('talk1') ? 'talkMap' : 'talk';
        key = topic;
    }
    const words = F.has('ch2_open') && ['bridge', 'ramp', 'upperRamp', 'waveLedge'].includes(topic) ? topic + 'Map' : topic;
    const [observation, nudge] = W.help[words] || W.help[topic] || W.help.fallback;
    const instruction = [cue.instruction, cue.controlText].filter(Boolean).join(' ')
        || cue.hint?.sketch || W.ui.noExact;
    return { key, topic, observation, nudge, instruction, recap: recap(F) };
}

/** Local research chatter knows the region and earned progress, not solutions. */
export function describeKloLocal(G, kind = 'fallback', variant = 0) {
    // An acknowledgement in place and the narrow-space margin presentation
    // still talk about the player's surroundings, not a generic joke bag.
    if (kind === 'nearby' || kind === 'margin') {
        const p = G.player, scene = G.sceneId || G.sceneDef?.id;
        if (scene === 'kelp') kind = p.inVortex ? 'vortex' : p.x > 25 * HL && p.x < 31.6 * HL && p.y > 9.8 * HL ? 'vault' : 'kelp';
        else if (scene === 'viken') kind = p.surface?.gallery ? 'gallery' : p.mode === 'swim' ? 'swim' : 'pier';
        else kind = p.x > 99 * HL && p.x < 104 * HL ? 'pool' : p.surface?.mat === 'wood' ? 'wood'
            : p.y < -3.2 * HL ? 'cliff' : p.x < 80 * HL ? 'grass' : 'beach';
    }
    const aliases = { sand: 'beach', rock: 'pool', bridge: 'wood' };
    kind = aliases[kind] || kind;
    const F = G.flags, lines = [...(W.local[kind] || W.local.fallback)];
    if (kind === 'vault' && F.has('p5_lit')) lines.unshift(W.local.litVault);
    if (kind === 'pool' && F.has('p2_open')) lines.unshift(W.local.openPool);
    if (kind === 'cliff' && F.has('p4_leap')) lines.unshift(W.local.leapDone);
    if (kind === 'pier' && F.has('shutter1')) lines.unshift(W.local.drumDone);
    if (F.has('ended')) lines.push(W.local.ended);
    const index = Number.isFinite(variant) ? Math.abs(Math.trunc(variant)) % lines.length : 0;
    return lines[index];
}
