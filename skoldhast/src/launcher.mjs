/* Series entry point. Each adventure owns its runtime; only profiles and
 * settings cross the boundary. Unreleased adventures never load their module. */
import { ADVENTURES, FIRST_ADVENTURE, adventureStatus } from './adventures.mjs';
import { createSave } from './save.mjs';

export function createGame({ catalogue = ADVENTURES, saver = createSave(),
    loadRuntime = adventure => import(adventure.module), onClose, ...options } = {}) {
    let current = null, activeAdventure = null, selectedSlot = null;
    let state = 'closed', generation = 0, pending = null, closing = null;

    function eligible(id, slotId) {
        return adventureStatus(id, saver.loadProfile(slotId)?.data, catalogue).playable;
    }

    async function launch(id, slotId) {
        const adventure = catalogue.find(a => a.id === id);
        if (!adventure || !eligible(id, slotId)) return false;
        const token = ++generation;
        state = 'opening';
        const previous = current;
        current = null;
        activeAdventure = null;
        // Close cancels the old story and waits for pending texture loads.
        // Its onClose is ignored because it is no longer the current runtime.
        await previous?.close();
        if (token !== generation) return false;
        const module = await loadRuntime(adventure);
        if (token !== generation) return false;
        const runtime = module.createGame({ ...options, saver, adventureId: id, slotId,
            onSlotChange: selected => { selectedSlot = selected; },
            onRestart: async () => { await close(); return open(); },
            onChooseAdventure: (next, selected) => {
                switchAdventure(next, selected).catch(err => {
                    console.error('Sköldhästen: adventure', err);
                    close();
                });
            },
            onClose: () => {
                if (current !== runtime) return;
                current = null; activeAdventure = null; state = 'closed';
                generation++;
                onClose?.();
            }
        });
        current = runtime;
        activeAdventure = id;
        selectedSlot = slotId;
        expose();
        try {
            await runtime.open();
        } catch (err) {
            if (current === runtime) current = null;
            await runtime.close();
            if (token === generation) { activeAdventure = null; state = 'closed'; }
            throw err;
        }
        if (token !== generation) { await runtime.close(); return false; }
        state = runtime.state === 'failed' ? 'failed' : 'open';
        saver.selectAdventure(slotId, id);
        return true;
    }

    function track(work) {
        pending = work;
        work.then(() => { if (pending === work) pending = null; }, () => {
            if (pending === work) { pending = null; if (!current) state = 'closed'; }
        });
        return work;
    }

    async function open() {
        if (closing) await closing;
        if (pending) return pending;
        if (current) return;
        const slotId = selectedSlot || saver.last() || 'alva';
        const profile = saver.loadProfile(slotId)?.data;
        const id = eligible(profile?.activeAdventure, slotId) ? profile.activeAdventure : FIRST_ADVENTURE;
        return track(launch(id, slotId));
    }

    async function switchAdventure(id, slotId = selectedSlot || saver.last() || 'alva') {
        // Guard here as well as in the chooser, including direct API calls.
        if (!eligible(id, slotId)) return false;
        if (closing) return false;
        const token = generation;
        if (pending) await pending;
        if (token !== generation || closing) return false;
        if (!eligible(id, slotId)) return false;
        if (current && activeAdventure === id && selectedSlot === slotId) return true;
        return track(launch(id, slotId));
    }

    function close() {
        if (closing) return closing;
        if (state === 'closed' && !pending) return Promise.resolve();
        generation++;
        state = 'closing';
        const runtime = current, work = pending;
        current = null; activeAdventure = null;
        closing = (async () => {
            await runtime?.close();
            try { await work; } catch { /* the caller of open owns its error */ }
            state = 'closed';
            onClose?.();
        })();
        const done = closing;
        done.then(() => { if (closing === done) closing = null; });
        return done;
    }

    function expose() { if (typeof window !== 'undefined') window.__skoldhast = api; }
    const api = { open, close, dispose: close, switchAdventure,
        pause: () => current?.pause(), resume: () => current?.resume(),
        get state() { return state; }, get activeAdventure() { return activeAdventure; },
        get debug() { return current?.debug || {}; }
    };
    expose();
    return api;
}
