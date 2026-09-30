import assert from 'node:assert/strict';

/** Solve the kelp knot, press the real paper and swim to its released fragment. */
export async function kelpFragment(R) {
    if (R.p().hidden) await R.hide();
    let pulledHere = false;
    if (!R.has('p6_kelp_freed') && !R.has('p6_flat')) {
        await R.swimTo(38.8, 9.75, { tol: .2 });
        await R.settle();
        await R.context('p6-grab');
        await R.flag('p6_kelp_freed', { x: 1, y: -.2 }, 15);
        pulledHere = true;
        await R.settle();
    }
    if (!R.has('p6_flat')) {
        // A freed frond opens the current beside the pull: the shell rides it to the fold.
        if (!pulledHere) await R.swimTo(35.8, 7.3, { tol: .2 });
        await R.hide();
        await R.flag('p6_flat', {}, 25);
        assert.equal(R.has('mark_sea'), false, 'flattening releases the piece without collecting it remotely');
        await R.settle();
    }
    if (R.p().hidden) await R.hide();
    await R.swimTo(39.5, 7.1, { tol: .2 });
    await R.flag('mark_sea', {}, 10);
    await R.settle();
    assert.equal(R.p().hidden, false, 'the fragment is collected by an emerged swimmer');
}
