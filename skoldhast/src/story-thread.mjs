/* A recap of committed discoveries, not a second progression system. */
import { THREAD } from './content/sv.mjs';

export function describeThread(flags, objective) {
    const has = flag => flags.has(flag);
    let stage = 'start';
    if (has('ended')) stage = 'end';
    else if (has('talk_done')) stage = 'proof';
    else if (has('talk1')) stage = 'fear';
    else if (has('ch2_end')) stage = 'tower';
    else if (has('mark_land') && has('mark_sea')) stage = 'pieces';
    else if (has('mark_land')) stage = 'land';
    else if (has('mark_sea')) stage = 'sea';
    else if (has('ch1_end')) stage = 'investigate';
    else if (has('p3_done') && has('p2_open')) stage = 'survey';
    else if (has('p3_done')) stage = 'waves';
    else if (has('p2_seen')) stage = 'reflection';
    else if (has('rule_demo')) stage = 'map';
    const conversation = objective === 'talk' && has('talk1')
        ? (has('talk2') ? THREAD.talkShore : THREAD.talkMap) : null;
    return {
        stage, mission: has('ended') ? THREAD.complete : THREAD.mission,
        recap: THREAD.recap[stage], why: conversation?.why || THREAD.why[objective] || THREAD.why.explore,
        conversation
    };
}
