/* Asset lifetime: late background loads belong to the session that started them. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssets } from '../skoldhast/src/assets.mjs';

const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};
const nextTurn = () => new Promise((resolve) => setImmediate(resolve));
const base = '/skoldhast/';
const atlasUrl = base + 'assets/sea.json';

test('close waits for pending atlas, image and data loads and unloads late textures', async (t) => {
    const atlas = deferred(), image = deferred(), data = deferred();
    const manifest = {
        atlases: { sea: { bundle: 'sea', files: ['sea.json'] } },
        images: { water: { bundle: 'sea', file: 'water.webp' } },
        data: { reef: { bundle: 'sea', file: 'reef.json' } }
    };
    t.mock.method(globalThis, 'fetch', async (url) => ({ ok: true, json: () => url.endsWith('manifest.json') ? manifest : data.promise }));
    const unloaded = [];
    const assets = createAssets({ Assets: {
        load: (url) => url === atlasUrl ? atlas.promise : image.promise,
        unload: async (urls) => unloaded.push(...urls)
    } }, base);
    await assets.init();
    const loading = assets.load('sea');
    let closed = false;
    const closing = assets.close().then(() => { closed = true; });
    await nextTurn();
    const waited = !closed;
    atlas.resolve({ textures: { crab: { name: 'crab' } } });
    image.resolve({ name: 'water' });
    data.resolve({ rocks: [1, 2] });
    await Promise.all([loading, closing]);
    assert.equal(waited, true, 'close cannot finish before pending resources can be unloaded');
    assert.deepEqual(unloaded.sort(), [atlasUrl, base + 'assets/water.webp'].sort());
    assert.equal(assets.frame('crab'), null);
    assert.equal(assets.image('water'), null);
    assert.equal(assets.data('reef'), null);
    assert.equal(assets.loaded('sea'), false);
    await assets.close();
    assert.equal(unloaded.length, 2, 'a second close does not unload resources twice');
});

test('reopening after a delayed load gets a fresh atlas from the shared cache', async (t) => {
    const manifest = { atlases: { sea: { bundle: 'sea', files: ['sea.json'] } } };
    t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => manifest }));
    const cache = new Map(), requests = [];
    const PIXI = { Assets: {
        load(url) {
            if (cache.has(url)) return Promise.resolve(cache.get(url));
            const request = deferred();
            requests.push(request);
            return request.promise.then((sheet) => { cache.set(url, sheet); return sheet; });
        },
        async unload(urls) {
            for (const url of urls) {
                const sheet = cache.get(url);
                if (sheet) for (const texture of Object.values(sheet.textures)) texture.destroyed = true;
                cache.delete(url);
            }
        }
    } };
    for (let cycle = 0; cycle < 3; cycle++) {
        const assets = createAssets(PIXI, base);
        await assets.init();
        const loading = assets.load('sea');
        assert.equal(requests.length, cycle + 1, 'the previous session left no cached atlas');
        const texture = { destroyed: false };
        if (cycle === 0) {
            const closing = assets.close();
            requests[cycle].resolve({ textures: { crab: texture } });
            await Promise.all([loading, closing]);
        } else {
            requests[cycle].resolve({ textures: { crab: texture } });
            await loading;
            assert.equal(assets.frame('crab'), texture);
            assert.equal(texture.destroyed, false, 'the reopened session can render the fresh frame');
            await assets.close();
        }
        assert.equal(texture.destroyed, true, 'unload releases the session atlas');
        assert.equal(cache.size, 0);
        assert.equal(assets.frame('crab'), null);
    }
});

test('a failed background request cannot prevent close from unloading successful requests', async (t) => {
    const good = deferred(), bad = deferred();
    t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({
        atlases: { sea: { bundle: 'sea', files: ['sea.json', 'missing.json'] } }
    }) }));
    t.mock.method(console, 'warn', () => {});
    const unloaded = [];
    const assets = createAssets({ Assets: {
        load: (url) => url === atlasUrl ? good.promise : bad.promise,
        unload: async (urls) => unloaded.push(...urls)
    } }, base);
    await assets.init();
    const loading = assets.load('sea');
    const closing = assets.close();
    bad.reject(new Error('offline'));
    good.resolve({ textures: { crab: {} } });
    await Promise.all([loading, closing]);
    assert.deepEqual(unloaded, [atlasUrl]);
    assert.equal(assets.loaded('sea'), false);
    assert.throws(() => assets.load('sea'), /closed/, 'an ended session cannot start another load');
});
