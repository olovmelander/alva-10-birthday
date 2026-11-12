/* Stable story identities and release rules; player-facing names live in sv.mjs. */
export const FIRST_ADVENTURE = 'havet-mellan-sidorna';

export const ADVENTURES = Object.freeze([
    Object.freeze({ id: FIRST_ADVENTURE, number: 1, released: true, requires: null, module: './main.mjs' }),
    // Den magiska skogen (adventures/adventure-2/), released on 4 November 2026.
    Object.freeze({ id: 'adventure-2', number: 2, released: true, requires: FIRST_ADVENTURE, module: '../adventures/adventure-2/main.mjs' }),
    // De försvunna stjärnorna (adventures/adventure-3/): built, not released. Preview: dev/play.html?adventure=3.
    // Released whole, when finished (docs/skoldhast/adventure-3.md, section 20.1); its title stays hidden until then.
    Object.freeze({ id: 'adventure-3', number: 3, released: false, requires: 'adventure-2', module: '../adventures/adventure-3/main.mjs' })
]);

export function getAdventure(id) {
    return ADVENTURES.find((adventure) => adventure.id === id) || null;
}

/** Unlocks are earned by finishing stories; availability comes only from this release. */
export function adventureStatus(id, profile, catalogue = ADVENTURES) {
    const adventure = catalogue.find((entry) => entry.id === id);
    if (!adventure) return { unlocked: false, released: false, playable: false, completed: false };
    const completed = Array.isArray(profile?.completedAdventures) ? profile.completedAdventures : [];
    const unlocked = !adventure.requires || completed.includes(adventure.requires);
    const released = adventure.released === true;
    return {
        unlocked,
        released,
        playable: unlocked && released && typeof adventure.module === 'string' && adventure.module.length > 0,
        completed: completed.includes(id)
    };
}

/**
 * Adventures to try before they are released, without their unlock: the dev page
 * and the ticket page take `?adventure=2` (or `#adventure=2`). Nothing is saved
 * as completed by a preview that a release would not also save.
 */
export function previewIds(search = '') {
    const m = /[?&#]adventure=(\d+)/.exec(search);
    const wanted = m ? ADVENTURES.find(a => a.number === Number(m[1])) : null;
    return wanted && wanted.module ? [wanted.id] : [];
}

export function withPreview(catalogue, preview = []) {
    if (!preview?.length) return catalogue;
    return catalogue.map(a => (preview.includes(a.id) && a.module ? Object.freeze({ ...a, released: true, requires: null }) : a));
}
