/*
 * Sköldhästen – saving (plan §8.6).
 *
 * Named player profiles, independent adventure saves and permanent completion.
 * Version 1 originals remain untouched while version 2 profiles take precedence.
 * Short Swedish word codes restore chapters inside the first adventure.
 */
import { WORD_CODES } from './content/sv.mjs';
import { FIRST_ADVENTURE, getAdventure, adventureStatus } from './adventures.mjs';

const LEGACY_PREFIX = 'skoldhast.v1.';
const PREFIX = 'skoldhast.v2.';
const INDEX = PREFIX + 'index';
export const SAVE_VERSION = 2;
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
    let ls;
    try {
        ls = window.localStorage;
        const k = PREFIX + 'probe';
        ls.setItem(k, '1');
        ls.removeItem(k);
        return { ls, available: true };
    } catch {
        // Full storage can still contain readable saves. A completely blocked
        // storage implementation instead uses an in-memory session.
        try { ls?.getItem(INDEX); } catch { ls = null; }
        return { ls: ls || null, available: false };
    }
}

export function createSave() {
    const { ls, available } = storage();
    const memory = new Map();
    const read = (k) => {
        try {
            const raw = memory.has(k) ? memory.get(k) : ls?.getItem(k);
            if (raw === null || raw === undefined) return null;
            return JSON.parse(raw) ?? undefined;
        }
        catch { return undefined; }
    };
    const write = (k, v, persist = true) => {
        try {
            const json = JSON.stringify(v);
            memory.set(k, json);
            if (!ls || !persist) return false;
            ls.setItem(k, json);
            memory.delete(k);
            return true;
        } catch { return false; }
    };

    function index() {
        const current = read(INDEX);
        const legacy = read(LEGACY_PREFIX + 'index');
        const ids = (value) => Array.isArray(value) ? value.filter((id) => typeof id === 'string' && id.length > 0) : [];
        const deleted = ids(current?.deleted);
        const slots = [...new Set([...ids(legacy?.slots), ...ids(current?.slots)])].filter((id) => !deleted.includes(id));
        const last = [current?.last, legacy?.last, slots[0]].find((id) => slots.includes(id)) || null;
        return { slots, last, deleted };
    }

    /** Returns a normalized profile without writing or changing legacy data. */
    function loadProfile(id) {
        if (index().deleted.includes(id)) return null;
        const current = read(PREFIX + 'slot.' + id);
        if (current !== null) {
            if (!record(current) || current.v !== SAVE_VERSION || !record(current.adventures)) return { corrupt: true };
            const adventures = {};
            for (const [adventureId, data] of Object.entries(current.adventures)) {
                if (!record(data) || !Array.isArray(data.flags)) return { corrupt: true };
                Object.defineProperty(adventures, adventureId, { value: migrate(data), enumerable: true, writable: true, configurable: true });
            }
            const completed = Array.isArray(current.completedAdventures)
                ? current.completedAdventures.filter((adventureId) => !!getAdventure(adventureId)) : [];
            for (const [adventureId, data] of Object.entries(adventures)) {
                if (data.ended && getAdventure(adventureId)) completed.push(adventureId);
            }
            return { data: {
                v: SAVE_VERSION,
                contentVersion: contentVersion(current.contentVersion),
                label: typeof current.label === 'string' ? current.label : id,
                updated: Number.isFinite(current.updated) ? current.updated : 0,
                settings: record(current.settings) ? current.settings : {},
                activeAdventure: getAdventure(current.activeAdventure) ? current.activeAdventure : FIRST_ADVENTURE,
                completedAdventures: [...new Set(completed)],
                adventures
            } };
        }
        const legacy = read(LEGACY_PREFIX + 'slot.' + id);
        if (legacy === null) return null;
        if (!record(legacy) || (legacy.v !== undefined && legacy.v !== 1) || !Array.isArray(legacy.flags)) return { corrupt: true };
        const data = migrate(legacy);
        return { data: {
            v: SAVE_VERSION,
            contentVersion: CONTENT_VERSION,
            label: typeof legacy.label === 'string' ? legacy.label : id,
            updated: Number.isFinite(legacy.updated) ? legacy.updated : 0,
            settings: record(legacy.settings) ? legacy.settings : {},
            activeAdventure: FIRST_ADVENTURE,
            completedAdventures: data.ended ? [FIRST_ADVENTURE] : [],
            adventures: { [FIRST_ADVENTURE]: data }
        } };
    }

    function saveProfile(id, profile) {
        const ix = index();
        if (!ix.slots.includes(id)) ix.slots.push(id);
        ix.deleted = ix.deleted.filter((entry) => entry !== id);
        ix.last = id;
        const ok = write(PREFIX + 'slot.' + id, profile);
        // If the save failed, keep the index in memory as well; do not persist
        // an index entry pointing to a profile that could not be written.
        write(INDEX, ix, ok);
        return ok;
    }

    return {
        available,
        slots() {
            return index().slots.flatMap((id) => {
                const result = loadProfile(id);
                if (!result) return [];
                const profile = result.data;
                const data = profile?.adventures[profile.activeAdventure];
                return [{ id, label: profile?.label || id, note: data?.note || '', updated: profile?.updated || 0,
                    ended: profile?.completedAdventures.includes(FIRST_ADVENTURE) || false,
                    activeAdventure: profile?.activeAdventure || FIRST_ADVENTURE }];
            });
        },
        last() { return index().last; },
        loadProfile,
        /** Load one adventure, with the player's shared settings and name. */
        load(id, adventureId = FIRST_ADVENTURE) {
            const result = loadProfile(id);
            if (!result || result.corrupt) return result;
            const profile = result.data;
            if (!Object.hasOwn(profile.adventures, adventureId)) return null;
            return { data: { ...profile.adventures[adventureId], settings: profile.settings, label: profile.label } };
        },
        store(id, label, state, adventureId = FIRST_ADVENTURE) {
            if (!getAdventure(adventureId) || !record(state) || !Array.isArray(state.flags)) return false;
            const existing = loadProfile(id);
            if (existing?.corrupt) return false;
            const profile = existing?.data || { v: SAVE_VERSION, contentVersion: CONTENT_VERSION,
                settings: {}, completedAdventures: [], adventures: {} };
            const data = migrate(state);
            profile.label = typeof label === 'string' ? label : (profile.label || id);
            profile.updated = Date.now();
            if (record(state.settings)) profile.settings = { ...profile.settings, ...state.settings };
            profile.activeAdventure = adventureId;
            profile.adventures[adventureId] = data;
            if (data.ended && !profile.completedAdventures.includes(adventureId)) profile.completedAdventures.push(adventureId);
            return saveProfile(id, profile);
        },
        selectAdventure(id, adventureId) {
            const existing = loadProfile(id);
            if (!existing?.data || !adventureStatus(adventureId, existing.data).playable) return false;
            existing.data.activeAdventure = adventureId;
            existing.data.updated = Date.now();
            return saveProfile(id, existing.data);
        },
        remove(id) {
            // A tombstone also hides a legacy original without modifying it.
            memory.set(PREFIX + 'slot.' + id, 'null');
            try { ls?.removeItem(PREFIX + 'slot.' + id); } catch { /* ignore */ }
            const ix = index();
            ix.slots = ix.slots.filter((s) => s !== id);
            if (!ix.deleted.includes(id)) ix.deleted.push(id);
            if (ix.last === id) ix.last = ix.slots[0] || null;
            write(INDEX, ix);
        },
        persist() { try { navigator.storage?.persist?.(); } catch { /* a bonus, not a safeguard */ } }
    };
}

function record(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function contentVersion(value) {
    return Number.isInteger(value) && value > 0 ? value : CONTENT_VERSION;
}

function migrate(d) {
    // contentVersion 1 is the first; future versions map old IDs here.
    return {
        contentVersion: contentVersion(d.contentVersion),
        flags: d.flags.filter((f) => typeof f === 'string' && f.length < 40),
        checkpoint: typeof d.checkpoint === 'string' ? d.checkpoint : 'start',
        puz: record(d.puz) ? d.puz : {},
        companionHints: Array.isArray(d.companionHints) ? d.companionHints.slice(0, 128) : [],
        note: typeof d.note === 'string' ? d.note.slice(0, 200) : '',
        strokes: record(d.strokes) ? d.strokes : null,
        ended: d.ended === true || d.flags.includes('ended')
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
