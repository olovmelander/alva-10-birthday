/*
 * The opening shows Bryggan running out to Pappersfyren, and the fold that cuts Alva's
 * line cuts the jetty too: the lighthouse and the jetty's far end go under the page, the
 * beach keeps the near end. That is where the game's beach finds the bolted gate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as PIXI from '../skoldhast/vendor/pixi-8.21.0.min.mjs';
import { createOpeningCanvas } from '../skoldhast/src/opening-canvas.mjs';
import { openingCrease } from '../skoldhast/src/opening-fold.mjs';

const PW = 1000, PH = 760, PIC = { x: 40, y: 52, w: 740, h: 560 }; // prologue.mjs: the paper and her picture

test('the opening fold cuts Bryggan between the beach and the lighthouse', () => {
    const parent = new PIXI.Container();
    for (const waterY of [500, 519, 540]) {
        const canvas = createOpeningCanvas(PIXI, { parent, texture: () => null, picture: PIC, waterY });
        assert.ok(canvas.container.children.some(c => c.label === 'opening-jetty'), 'the jetty is drawn in her margin');
        const { from, to } = canvas.landmarks.jetty, tower = canvas.landmarks.tower, right = PIC.x + PIC.w;
        assert.ok(from[0] > right && from[0] < right + 12 && from[1] < waterY, 'it starts at her beach, its deck above the water');
        assert.ok(Math.abs(to[0] - tower.x) < 50 && Math.abs(to[1] - tower.y) < 6, 'and reaches the lighthouse islet');
        // her shoreline runs from the picture's edge along the waterline, 40 apart, and ends
        // at the third dot (within its 14-unit reach); wherever it ends, the crease cuts the jetty
        for (const reach of [66, 80, 94]) {
            const { a, b } = openingCrease(PW, PH, [right + reach, waterY]);
            const side = ([x, y]) => Math.sign((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]));
            assert.notEqual(side(from), side(to), `reach ${reach}: the crease crosses the jetty`);
            assert.equal(side(to), side([tower.x, tower.y]), `reach ${reach}: its far end goes under with the lighthouse`);
            assert.equal(side(from), side([PIC.x, PIC.y + PIC.h]), `reach ${reach}: the beach keeps the near end`);
        }
        canvas.destroy();
    }
});
