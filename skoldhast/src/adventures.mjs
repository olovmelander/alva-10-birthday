/* Stable story identities and release rules; player-facing names live in sv.mjs. */
export const FIRST_ADVENTURE = 'havet-mellan-sidorna';

export const ADVENTURES = Object.freeze([
    Object.freeze({ id: FIRST_ADVENTURE, number: 1, released: true, requires: null, module: './main.mjs' }),
    Object.freeze({ id: 'adventure-2', number: 2, released: false, requires: FIRST_ADVENTURE, module: null }),
    Object.freeze({ id: 'adventure-3', number: 3, released: false, requires: 'adventure-2', module: null })
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
