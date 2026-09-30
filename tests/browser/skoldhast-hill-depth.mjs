#!/usr/bin/env node
/* Real hill journey: actual controls earn bridge, seeds, the pinned strip,
 * upper flower, short-run lesson, downhill leap and land paper. Phone portrait
 * and landscape run by default; use --viewport 1440x900 for desktop. The full
 * exploration entry checks these same phases within both complete story orders.
 */
process.argv.push('--hill-only');
if (!process.argv.includes('--out')) process.argv.push('--out', 'docs/skoldhast/shots/hill-depth/after');
await import('./skoldhast-exploration-order.mjs');
