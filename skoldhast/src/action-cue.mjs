/* A small pencil margin note in the world, sharing the HUD's semantic cue. */
export function createActionCue(PIXI) {
    const container = new PIXI.Container(); container.label = 'world-action-cue';
    const paper = new PIXI.Graphics().circle(0, 0, 32).fill({ color: 0xfffbef, alpha: .94 })
        .stroke({ width: 2, color: 0x514c40, alpha: .72 });
    const progress = new PIXI.Graphics(), tether = new PIXI.Graphics();
    tether.moveTo(0, 37).lineTo(0, 43).moveTo(0, 48).lineTo(0, 53).stroke({ width: 2, color: 0x514c40, alpha: .7 });
    container.addChild(tether, paper, progress);
    const icons = {};
    for (const action of ['hide', 'emerge', 'move', 'act']) {
        const g = new PIXI.Graphics();
        if (action === 'hide' || action === 'emerge') {
            g.moveTo(-19, 10).bezierCurveTo(-20, -15, 17, -19, 20, 10).lineTo(-19, 10)
                .moveTo(-9, -7).lineTo(-4, 8).moveTo(7, -8).lineTo(10, 8)
                .moveTo(-14, 12).lineTo(-17, 17).moveTo(13, 12).lineTo(16, 17);
            if (action === 'emerge') g.moveTo(-8, -17).lineTo(0, -25).lineTo(8, -17).moveTo(0, -25).lineTo(0, -12);
        } else if (action === 'move') {
            g.moveTo(-17, -12).lineTo(-3, 0).lineTo(-17, 12).moveTo(2, -12).lineTo(17, 0).lineTo(2, 12);
        } else {
            g.moveTo(-14, 17).lineTo(-11, 6).lineTo(12, -17).lineTo(20, -9).lineTo(-3, 14).lineTo(-14, 17)
                .moveTo(-10, 6).lineTo(-3, 14).moveTo(8, -12).lineTo(15, -5);
        }
        g.stroke({ width: 3, color: 0x445d50, alpha: .96, cap: 'round', join: 'round' });
        container.addChild(g); icons[action] = g;
    }
    let lastFraction = -1;
    const data = { key: null, action: null, fraction: null };
    container.guidanceCue = data;
    return {
        container,
        update(cue, { scene, hero, cam, width, height, busy = false, time = 0, lessMotion = false } = {}) {
            const target = cue?.target, action = cue?.action;
            const near = target && Math.hypot(target.x - hero.x, target.y - hero.y) < 1100;
            container.visible = !!(!busy && near && target.scene === scene && icons[action] && cue.state !== 'done');
            if (!container.visible) return;
            const visible = Math.abs(target.x - cam.x) < width / cam.zoom / 2 + 60
                && Math.abs(target.y - cam.y) < height / cam.zoom / 2 + 110;
            container.visible = visible;
            if (!visible) return;
            data.key = cue.key; data.action = action;
            const beside = Math.abs(target.x - hero.x) < 170;
            container.x = target.x + (beside ? -(hero.facing || 1) * 165 : 0);
            container.y = target.y - 135 + (lessMotion ? 0 : Math.sin(time * 1.8) * 2);
            container.x = Math.max(cam.x - width / cam.zoom / 2 + 52 / cam.zoom, Math.min(cam.x + width / cam.zoom / 2 - 52 / cam.zoom, container.x));
            container.y = Math.max(cam.y - height / cam.zoom / 2 + 64 / cam.zoom, Math.min(cam.y + height / cam.zoom / 2 - 50 / cam.zoom, container.y));
            container.scale.set(Math.max(.8, Math.min(1.15, .56 / cam.zoom)));
            for (const [name, icon] of Object.entries(icons)) icon.visible = name === action;
            if (action === 'move') icons.move.scale.x = Math.sign(target.x - hero.x) || hero.facing || 1;
            const fraction = cue.progress?.total > 0 ? Math.max(0, Math.min(1, cue.progress.value / cue.progress.total)) : -1;
            data.fraction = fraction < 0 ? null : fraction;
            if (Math.abs(fraction - lastFraction) > .008) {
                lastFraction = fraction; progress.clear();
                if (fraction >= 0) {
                    progress.circle(0, 0, 38).stroke({ width: 3, color: 0x514c40, alpha: .3 });
                    if (fraction > 0) progress.arc(0, 0, 38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction)
                        .stroke({ width: 5, color: 0x496854, alpha: .96, cap: 'round' });
                }
            }
        }
    };
}
