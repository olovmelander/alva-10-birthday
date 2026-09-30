#!/usr/bin/env node
/* Compatibility command for the former tap-joke check. The companion suite
 * covers real touch, mouse and K calls, including the stick/follow-finger band.
 * node tests/browser/skoldhast-klo.mjs [844x390 | 390x844] [--out path]
 */
if (!process.argv.includes('--viewport')) {
    process.argv.push('--viewport', process.argv.find(arg => /^\d+x\d+$/.test(arg)) || '844x390');
}
await import('./skoldhast-companion.mjs');
