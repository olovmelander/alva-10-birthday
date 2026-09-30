// Rendering can run faster than the fixed simulation. Keep action edges until a
// simulation step can consume them; menu/pause transitions explicitly clear them.
export function createPressQueue() {
    let pending = {};
    return {
        push(edges) {
            for (const key of ['hop', 'act', 'duck', 'hide', 'hideUp', 'tapHero', 'neigh']) if (edges[key]) pending[key] = true;
        },
        consume() { const edges = pending; pending = {}; return edges; },
        clear() { pending = {}; }
    };
}
