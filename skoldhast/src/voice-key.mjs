/*
 * The recorded voices are looked up by who speaks and what is shown, so the game and the
 * recording script (scripts/skoldhast-voice.mjs) agree on one key without a table of ids.
 *
 * speaker: the key the line is shown with – a character ('klo', 'horse', 'tukan' …), 'note'
 * for a paper note, or 'caption' for the narrator. Thoughts are the sköldhäst's: 'horse'.
 */

/** cyrb53: a small, well-mixed 53-bit string hash (public domain), as 14 hex digits. */
function cyrb53(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** The clip key for one shown line. Whitespace is normalised so a wrapped string still matches. */
export function voiceKey(speaker, text) {
    return cyrb53(`${speaker}|${String(text).replace(/\s+/g, ' ').trim()}`);
}
