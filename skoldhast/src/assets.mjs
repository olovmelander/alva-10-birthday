/*
 * Sköldhästen – loading the code-drawn art (skoldhast/assets/manifest.json).
 *
 * Bundles: 'boot' (first playable), then 'land', 'sea', 'bay' in the background.
 * tex(name) returns a Texture or null, so the renderer can draw a placeholder
 * while a bundle is still arriving (or if an asset is missing).
 *
 * Pixi's Assets cache outlives the application, so close() unloads everything
 * this module loaded before the app is destroyed (plan §8.2).
 */
export function createAssets(PIXI, base) {
    const frames = new Map();      // frame name → Texture (atlases)
    const images = new Map();      // image name → Texture (materials, backdrops)
    const data = new Map();        // data name → object
    const loadedUrls = new Set();
    const pending = new Map();     // bundle → Promise
    const done = new Set();        // bundles fully loaded
    let manifest = null;

    const url = (f) => base + 'assets/' + f;

    async function init() {
        const res = await fetch(url('manifest.json'), { cache: 'no-cache' });
        manifest = res.ok ? await res.json() : { atlases: {}, images: {}, data: {} };
        return manifest;
    }

    function load(bundle) {
        if (!manifest) throw new Error('assets.init() first');
        if (pending.has(bundle)) return pending.get(bundle);
        const jobs = [];
        for (const [name, a] of Object.entries(manifest.atlases || {})) {
            if (a.bundle !== bundle) continue;
            for (const f of a.files) {
                const u = url(f);
                jobs.push(PIXI.Assets.load(u).then((sheet) => {
                    loadedUrls.add(u);
                    for (const [k, t] of Object.entries(sheet.textures || {})) frames.set(k, t);
                }).catch((e) => console.warn('atlas', name, e)));
            }
        }
        for (const [name, im] of Object.entries(manifest.images || {})) {
            if (im.bundle !== bundle) continue;
            const u = url(im.file);
            jobs.push(PIXI.Assets.load(u).then((t) => {
                loadedUrls.add(u);
                if (im.repeat) {
                    t.source.style.addressMode = 'repeat';
                    t.source.style.update?.();
                }
                images.set(name, t);
            }).catch((e) => console.warn('image', name, e)));
        }
        for (const [name, d] of Object.entries(manifest.data || {})) {
            if (d.bundle !== bundle) continue;
            jobs.push(fetch(url(d.file)).then((r) => r.json()).then((o) => data.set(name, o)).catch((e) => console.warn('data', name, e)));
        }
        const p = Promise.all(jobs).then(() => { done.add(bundle); return bundle; });
        pending.set(bundle, p);
        return p;
    }

    async function close() {
        const urls = [...loadedUrls];
        loadedUrls.clear();
        frames.clear(); images.clear(); pending.clear(); done.clear();
        try { await PIXI.Assets.unload(urls); } catch (e) { console.warn('unload', e); }
    }

    return {
        init, load, close,
        get manifest() { return manifest; },
        tex: (name) => frames.get(name) || images.get(name) || null,
        frame: (name) => frames.get(name) || null,
        image: (name) => images.get(name) || null,
        data: (name) => data.get(name) || null,
        frameNames: () => [...frames.keys()],
        has: (name) => frames.has(name) || images.has(name),
        loaded: (bundle) => done.has(bundle),
        bundles: () => [...new Set(Object.values(manifest?.atlases || {}).map((a) => a.bundle).concat(Object.values(manifest?.images || {}).map((a) => a.bundle)))]
    };
}
