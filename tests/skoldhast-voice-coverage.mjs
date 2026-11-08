/*
 * Every line a robot hears must be in the voice script (scripts/skoldhast-voice.mjs), under the
 * key the game looks it up by (src/voice.mjs): speech boxes by speaker, thoughts as the
 * sköldhäst's, captions as the narrator's. Used by the playthrough tests.
 */
import { voiceKey } from '../skoldhast/src/voice-key.mjs';
import { voiceScript } from '../scripts/skoldhast-voice.mjs';

let keys = null;
/** The lines in a robot's log that would stay silent. */
export function unvoiced(log) {
    keys ??= new Set(voiceScript().map(l => l.key));
    const heard = [];
    for (const l of log) {
        if (l.kind === 'say') for (const [who, text] of l.lines) { if (text) heard.push([who, text]); }
        else if (l.kind === 'think') heard.push(['horse', l.text]);
        else if (l.kind === 'caption') heard.push(['caption', l.text]);
    }
    return heard.filter(([who, text]) => !keys.has(voiceKey(who, text))).map(([who, text]) => `${who}: ${text}`);
}
