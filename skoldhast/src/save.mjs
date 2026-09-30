/*
 * Sköldhästen – saving (plan §8.6).
 *
 * Named slots (`skoldhast.v1.<slot>`), stable authored IDs only, tolerant
 * loading (unknown flags are dropped, unknown checkpoints map to a safe one),
 * and short Swedish word codes that restore the end of a finished chapter.
 */
import { WORD_CODES } from './content/sv.mjs';

const PREFIX = 'skoldhast.v1.';
const INDEX = PREFIX + 'index';
export const CONTENT_VERSION = 1;

// Chapter 1 now ends at the sea-fold discovery. A word code must not award
// the separate land route that its player can choose next in chapter 2.
const LAND_ROUTE = [
    'b:k1_note', 'note1_read', 'teach_streck', 'p1_inked', 'b:k1_p1', 'entrance_fluff', 'glimpse1', 'b:k1_glimpse', 'b:k1_branten', 'p3_t1', 'p3_t2', 'p3_t3',
    'p3_done', 'b:k1_p3', 'clue_note1', 'clue_wave_marks', 'clue_glimpse', 'spangen_flag'];
const K1_END = ['intro_done', 'b:k1_enter', 'b:k1_stopwatch', 'klo_hidden', 'b:k1_ja', 'klo_ja', 'b:k1_mapcorner', 'rule_demo',
    'p2_seen', 'b:k1_mirror', 'p2_plank', 'p2_stone', 'p2_open', 'b:k1_arch', 'b:k1_pool_klo', 'kelp_entered', 'b:k1_kelp_first',
    'ch1_end', 'b:k1_hook', 'clue_map_corner', 'clue_reflection', 'clue_fold', 'clue_figure', 'exp_fart', 'exp_fart_logged'];
const K2_END = [...K1_END, ...LAND_ROUTE, 'b:k1_clouds', 'ch2_open', 'b:k2_open', 'b:k2_note2', 'clue_note2', 'p5_lit', 'b:k2_lit', 'b:k2_lanterns', 'p4_leap', 'b:k2_leap', 'exp_sprang',
    'exp_sprang_logged', 'mark_land', 'b:k2_mark_land', 'clue_mark_land', 'clue_lighthouse', 'p6_flat', 'mark_sea', 'b:k2_mark_sea', 'clue_mark_sea',
    'marks_both', 'b:k2_end', 'ch2_end', 'p4_plank',
    // Kapitel 2 is done: its white pages have long turned away (they must not peel again)
    'peeled_udden-paper', 'peeled_trench-paper'];
export const CODE_RESTORE = {
    1: { flags: K1_END, checkpoint: 'overlook' },
    2: { flags: K2_END, checkpoint: 'viken' }
};

function storage() {
    try {
        const k = PREFIX + 'probe';
        window.localStorage.setItem(k, '1');
        window.localStorage.removeItem(k);
        return window.localStorage;
    } catch { return null; }
}

export function createSave() {
    const ls = storage();
    const available = !!ls;
    const read = (k) => { try { return ls ? JSON.parse(ls.getItem(k) || 'null') : null; } catch { return undefined; } };
    const write = (k, v) => { if (!ls) return false; try { ls.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

    function index() {
        const ix = read(INDEX);
        return ix && Array.isArray(ix.slots) ? ix : { slots: [], last: null };
    }

    return {
        available,
        slots() {
            return index().slots.map((id) => {
                const d = read(PREFIX + 'slot.' + id);
                return { id, label: d?.label || id, note: d?.note || '', updated: d?.updated || 0, ended: !!d?.ended };
            });
        },
        last() { return index().last; },
        /** Load a slot. Returns { data } or { corrupt: true } or null. */
        load(id) {
            const d = read(PREFIX + 'slot.' + id);
            if (d === undefined) return { corrupt: true };
            if (!d) return null;
            if (typeof d !== 'object' || !Array.isArray(d.flags)) return { corrupt: true };
            return { data: migrate(d) };
        },
        store(id, label, state) {
            const ix = index();
            if (!ix.slots.includes(id)) ix.slots.push(id);
            ix.last = id;
            const ok = write(PREFIX + 'slot.' + id, { v: 1, contentVersion: CONTENT_VERSION, label, updated: Date.now(), ...state });
            write(INDEX, ix);
            return ok;
        },
        remove(id) {
            try { ls?.removeItem(PREFIX + 'slot.' + id); } catch { /* ignore */ }
            const ix = index(); ix.slots = ix.slots.filter((s) => s !== id); if (ix.last === id) ix.last = ix.slots[0] || null; write(INDEX, ix);
        },
        persist() { try { navigator.storage?.persist?.(); } catch { /* a bonus, not a safeguard */ } }
    };
}

function migrate(d) {
    // contentVersion 1 is the first; future versions map old IDs here.
    return {
        flags: d.flags.filter((f) => typeof f === 'string' && f.length < 40),
        checkpoint: typeof d.checkpoint === 'string' ? d.checkpoint : 'start',
        puz: d.puz && typeof d.puz === 'object' ? d.puz : {},
        settings: d.settings && typeof d.settings === 'object' ? d.settings : {},
        companionHints: Array.isArray(d.companionHints) ? d.companionHints.slice(0, 128) : [],
        note: typeof d.note === 'string' ? d.note.slice(0, 200) : '',
        strokes: d.strokes && typeof d.strokes === 'object' ? d.strokes : null,
        label: d.label, ended: !!d.ended
    };
}

/** Normalise a typed word code and find which chapter it restores (or 0). */
export function codeToChapter(text) {
    // MAS, mås and MÅS are the same word (a keyboard without å, or a hurried hand)
    const norm = (s) => s.toUpperCase().replace(/[ÅÄ]/g, 'A').replace(/Ö/g, 'O').replace(/[^A-Z]+/g, ' ').trim().replace(/\s+/g, ' ');
    const t = norm(text || '');
    for (const [n, code] of Object.entries(WORD_CODES)) if (norm(code) === t) return Number(n);
    return 0;
}
