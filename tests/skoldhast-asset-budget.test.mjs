import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

test('the complete first playable stays within its 3 MB download budget', () => {
    const root = fileURLToPath(new URL('../skoldhast/', import.meta.url));
    const { files } = JSON.parse(fs.readFileSync(path.join(root, 'files.json')));
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/manifest.json')));
    const prefetched = new Set(files);
    assert.equal(prefetched.size, files.length, 'each resource is counted and fetched once');
    const sourceFiles = fs.readdirSync(path.join(root, 'src'), { recursive: true })
        .filter(file => file.endsWith('.mjs')).map(file => `src/${file.split(path.sep).join('/')}`);
    for (const file of [...sourceFiles, ...manifest.bundles.boot.files, ...manifest.bundles.land.files]) {
        assert.ok(prefetched.has(file), `${file} must be ready for the opening; rebuild the asset manifest`);
    }
    const bytes = files.reduce((sum, file) => {
        const data = fs.readFileSync(path.join(root, file));
        return sum + (/\.(mjs|js|css|json)$/.test(file) ? gzipSync(data).length : data.length);
    }, 0);
    assert.ok(bytes <= 3_000_000, `${bytes} first-playable bytes exceeds the 3,000,000-byte budget`);
});
