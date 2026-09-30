/*
 * Sköldhästen – loading the code-drawn art (skoldhast/assets/manifest.json).
 *
 * Bundles: 'boot' (first playable), then 'land', 'sea', 'bay' and 'evening' in the background.
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
    let closed = false, closing = null;

    const url = (f) => base + 'assets/' + f;

    async function init() {
        const res = await fetch(url('manifest.json'), { cache: 'no-cache' });
        manifest = res.ok ? await res.json() : { atlases: {}, images: {}, data: {} };
        return manifest;
    }

    function load(bundle) {
        if (closed) throw new Error('assets are closed');
        if (!manifest) throw new Error('assets.init() first');
        if (pending.has(bundle)) return pending.get(bundle);
        const jobs = [];
        for (const [name, a] of Object.entries(manifest.atlases || {})) {
            if (a.bundle !== bundle) continue;
            for (const f of a.files) {
                const u = url(f);
                jobs.push(PIXI.Assets.load(u).then((sheet) => {
                    loadedUrls.add(u);
                    if (closed) return;
                    for (const [k, t] of Object.entries(sheet.textures || {})) frames.set(k, t);
                }).catch((e) => console.warn('atlas', name, e)));
            }
        }
        for (const [name, im] of Object.entries(manifest.images || {})) {
            if (im.bundle !== bundle) continue;
            const u = url(im.file);
            jobs.push(PIXI.Assets.load(u).then((t) => {
                loadedUrls.add(u);
                if (closed) return;
                if (im.repeat) {
                    t.source.style.addressMode = 'repeat';
                    t.source.style.update?.();
                }
                // Parallax layers are drawn smaller than stored while they scroll;
                // mipmaps keep their thin strokes from shimmering. Pixi builds them
                // when the texture first reaches the GPU.
                if (im.mip) {
                    t.source.autoGenerateMipmaps = true;
                    t.source.style.mipmapFilter = 'linear';
                    t.source.style.update?.();
                }
                images.set(name, t);
            }).catch((e) => console.warn('image', name, e)));
        }
        for (const [name, d] of Object.entries(manifest.data || {})) {
            if (d.bundle !== bundle) continue;
            jobs.push(fetch(url(d.file)).then((r) => r.json()).then((o) => { if (!closed) data.set(name, o); }).catch((e) => console.warn('data', name, e)));
        }
        const p = Promise.all(jobs).then(() => { if (!closed) done.add(bundle); return bundle; });
        pending.set(bundle, p);
        return p;
    }

    function close() {
        if (closing) return closing;
        closed = true;
        frames.clear(); images.clear(); data.clear(); done.clear();
        closing = (async () => {
            // Background bundles can finish after close begins. Keep collecting their URLs,
            // then release them before the next session may reuse Pixi's global cache.
            await Promise.allSettled([...pending.values()]);
            const urls = [...loadedUrls];
            try { if (urls.length) await PIXI.Assets.unload(urls); } catch (e) { console.warn('unload', e); }
            loadedUrls.clear(); pending.clear();
        })();
        return closing;
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
