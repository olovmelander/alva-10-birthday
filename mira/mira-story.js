/*
 * MIRAS STJÄRNSAFARI – title screen and story scenes
 * ---------------------------------------------------------------------
 * TitleScene: the gondola drifting across a starry sky behind the menus.
 * StoryScene: the prologue (a summer evening, a falling star, Nova and the
 * tiger gondola), the finale (Nova finds her mum and dad) and the epilogue
 * (home to Alva and Pappa). Scenes are small scripts of staged actions
 * and dialogue lines from MS.content.STORY.
 */
(function () {
    'use strict';

    const MS = window.MiraSafari;
    const { clamp, lerp, TAU, easeInOut } = MS.util;
    const { atlas, fx, view, store } = MS;
    const W = MS.world;
    const C = MS.content;

    // =====================================================================
    // Title: a calm, looping sky with the gondola passing by
    // =====================================================================
    class TitleScene {
        constructor(game) {
            this.game = game;
            this.time = 0;
            this.freezeOnPanel = false;
            this.backdrop = new W.Backdrop({
                gradient: ['#0a0724', '#1e1450', '#3b2482', '#7a4cb8', '#e889c0'],
                stars: 1,
                sun: { x: 0.8, y: 0.2, r: 12, color: '#fff8e0', glow: 50, glowColor: '#ffe9c0', moon: true },
                clouds: { count: 6, y: [0.5, 0.85], colors: ['#f4b8e4', '#c888d8', '#8a5ab8'], alpha: 0.75 },
                planets: [{ x: 0.14, y: 0.14, r: 9, color: '#ff9ad8', ring: '#ffe6a0', par: 0.02 }, { x: 0.52, y: 0.08, r: 4, color: '#8ff0ff', par: 0.03 }]
            }, 77);
            this.islets = [
                W.buildIslet({ x: 0, w: 150, seed: 5, depth: 60, falls: 'right' }, 'meadow'),
                W.buildIslet({ x: 0, w: 90, seed: 9, depth: 44 }, 'star')
            ];
            this.cable = new W.Cable([{ x: -400, y: 0, kind: 'lantern' }, { x: 2000, y: 0, kind: 'lantern' }]);
            this.gondola = { x: -60, y: 0, miraAnim: 'wave', miraFrame: 0, novaAnim: 'happy', novaFrame: 0, outfit: store.data.outfit, lamp: true };
            this.lumas = ['a-luma-yellow', 'a-luma-blue', 'a-luma-pink', 'a-luma-orange'].filter((n) => atlas.has(n)).map((n, i) => ({ n, x: 0.15 + i * 0.22, y: 0.2 + (i % 2) * 0.18, s: Math.random() * 10 }));
            this.shooting = null;
        }

        update(dt) {
            this.time += dt;
            const g = this.gondola;
            g.x += dt * 14;
            if (g.x > view.w + 70) g.x = -70;
            g.outfit = store.data.outfit;
            const wave = Math.floor(this.time / 5) % 2 === 0;
            g.miraAnim = wave ? 'wave' : 'idle';
            g.miraFrame = Math.floor(this.time / (wave ? 0.3 : 0.7)) % 2;
            g.novaAnim = wave ? 'happy' : 'sit';
            g.novaFrame = Math.floor(this.time / 0.4) % 2;
            if (!this.shooting && Math.random() < dt * 0.25) {
                this.shooting = { x: Math.random() * view.w * 0.8 + view.w * 0.2, y: Math.random() * view.h * 0.3, t: 0 };
            }
            if (this.shooting) {
                this.shooting.t += dt;
                if (this.shooting.t > 0.9) this.shooting = null;
            }
            fx.update(dt);
        }

        render(g) {
            const t = this.time;
            this.backdrop.draw(g, t * 6, 0, t, view);
            if (this.shooting) {
                const s = this.shooting;
                for (let i = 0; i < 14; i += 1) {
                    g.globalAlpha = (1 - i / 14) * (1 - s.t / 0.9);
                    g.fillStyle = i < 2 ? '#ffffff' : '#ffe9a8';
                    g.fillRect(Math.round(s.x - s.t * 120 + i * 2), Math.round(s.y + s.t * 60 - i), 1, 1);
                }
                g.globalAlpha = 1;
            }
            // islands drifting in the distance
            const bob = Math.sin(t * 0.8) * 2;
            const a = this.islets[0];
            const ax = Math.round(view.w * 0.62 - a.w / 2);
            const ay = Math.round(view.h * 0.62 + bob);
            W.drawFalls(g, { ...a, x: 0 }, -ax, -ay, t);
            g.drawImage(a.canvas, ax, ay - a.top);
            atlas.draw(g, 'p-cottage', 'idle', 0, ax + 52, ay + a.surface[52]);
            atlas.draw(g, 'p-oak', 'idle', 0, ax + 108, ay + a.surface[108]);
            atlas.draw(g, 'p-flower-poppy', 'idle', Math.floor(t * 1.6) % 2, ax + 80, ay + a.surface[80]);
            atlas.draw(g, 'p-flower-daisy', 'idle', Math.floor(t * 1.6 + 1) % 2, ax + 20, ay + a.surface[20]);
            const b = this.islets[1];
            const bx = Math.round(view.w * 0.18);
            const by = Math.round(view.h * 0.74 - bob);
            g.drawImage(b.canvas, bx, by - b.top);
            atlas.draw(g, 'p-crystal3', 'idle', 0, bx + 30, by + b.surface[30]);
            atlas.draw(g, 'p-glowshroom', 'idle', 0, bx + 58, by + b.surface[58]);
            // lumas
            for (const l of this.lumas) {
                const lx = l.x * view.w + Math.sin(t * 0.6 + l.s) * 10;
                const ly = l.y * view.h + Math.sin(t * 1.3 + l.s) * 4;
                W.drawGlow(g, lx, ly, 9, '#fff2b0', 0.6);
                atlas.draw(g, l.n, 'float', Math.floor(t * 2 + l.s) % 2, lx, ly);
            }
            // the gondola on its cable
            const cy = Math.round(view.h * (view.portrait ? 0.28 : 0.2));
            this.cable.towers[0].y = cy;
            this.cable.towers[1].y = cy + 10;
            this.cable.draw(g, -view.w * 0.0, 0, view, t, true);
            const gx = this.gondola.x;
            this.gondola.y = this.cable.y(gx);
            W.drawGondola(g, gx, this.gondola.y, 0, 0, this.gondola, t);
        }

        tap() {}
    }

    // =====================================================================
    // Story scenes
    // =====================================================================
    class StoryScene {
        constructor(game, id, done, { ride = null } = {}) {
            this.game = game;
            this.id = id;
            this.done = done;
            this.ride = ride;
            this.time = 0;
            this.freezeOnPanel = false;
            game.ui.showHud(false);
            this.lines = C.STORY[id].slice();
            this.actors = {};
            this.setup();
            game.later(0.8, () => this.next());
        }

        setup() {
            const id = this.id;
            if (id === 'prologue' || id === 'epilogue') {
                this.town = true;
                const night = id === 'epilogue';
                this.backdrop = new W.Backdrop(night ? {
                    gradient: ['#0a0a2a', '#18206a', '#3a3f9a', '#6a5cb0', '#b88ac8'],
                    stars: 1,
                    sun: { x: 0.8, y: 0.18, r: 10, color: '#fffbe8', glow: 40, glowColor: '#e8e0ff', moon: true },
                    clouds: { count: 4, y: [0.1, 0.35], colors: ['#8a86c8', '#6a64a8', '#4a4488'], alpha: 0.6 },
                    far: false
                } : {
                    gradient: ['#4a64b8', '#7ea4dc', '#b8ccf0', '#ffd8b0', '#ffe8c8'],
                    stars: 0.08,
                    sun: { x: 0.12, y: 0.62, r: 12, color: '#fff4d8', glow: 60, glowColor: '#ffe0b0' },
                    clouds: { count: 9, y: [0.06, 0.5], colors: ['#ffffff', '#eef2ff', '#c8d0ec'], alpha: 0.95 },
                    far: false
                }, night ? 31 : 17);
                this.ground = W.buildIslet({ x: -60, w: 760, seed: 3, depth: 260, hills: 1, solid: true }, 'town');
                this.groundY = 0;
                // actors
                this.actors.mira = { sprite: `mira-${store.data.outfit}`, anim: id === 'prologue' ? 'sit' : 'idle', x: 150, y: 0, dir: 1, frame: 0 };
                this.actors.nova = { sprite: 'nova', anim: 'sit', x: 235, y: 0, dir: -1, hidden: id === 'prologue', frame: 0 };
                if (id === 'epilogue') {
                    // Alva runs to her little sister; Pappa hurries after
                    this.actors.alva = { sprite: 'alva', anim: 'idle', x: -40, y: 0, dir: 1, frame: 0, hidden: true, speed: 56 };
                    this.actors.pappa = { sprite: 'pappa', anim: 'idle', x: -70, y: 0, dir: 1, frame: 0, hidden: true, speed: 40 };
                    this.actors.nova.hidden = true;
                    this.gondola = { x: 560, y: -400, miraAnim: 'wave', miraFrame: 0, novaAnim: 'sit', novaFrame: 0, novaVisible: false, outfit: store.data.outfit, lamp: true, visible: false };
                    this.actors.mira.hidden = true;
                }
                this.cam = { x: 0, y: 0 };
                this.game.audio.playSong(night ? 'finale' : 'title');
            } else if (id === 'finale') {
                const ride = this.ride;
                this.stage = 'finale';
                this.game.audio.playSong('finale');
                // mum comes from the right and dad from the left; they meet with
                // their heads bowed over the spot where Nova will sit
                this.tigerX = ride.stopX + FAMILY.mum;
                this.dadX = this.tigerX - FAMILY.gap;
                this.tiger = { sprite: 'a-startiger', anim: 'idle', x: this.tigerX + 60, to: this.tigerX, dir: -1, alpha: 0, glowColor: '#b8f0ff' };
                this.dad = atlas.has('a-startiger-dad') ? { sprite: 'a-startiger-dad', anim: 'idle', x: this.dadX - 56, to: this.dadX, dir: 1, alpha: 0, glowColor: '#ffe2a0' } : null;
                this.parents = [this.dad, this.tiger].filter(Boolean);
                ride.focusTo = view.portrait ? 0.18 : 0.24;   // make room for the family
                this.novaActor = null;
            }
        }

        // --- script ------------------------------------------------------------------
        next() {
            const line = this.lines.shift();
            if (!line) {
                this.finish();
                return;
            }
            if (line.action) {
                this.act(line.action, () => {
                    if (line.caption) this.game.ui.dialog([{ caption: line.caption }], () => this.next());
                    else this.next();
                });
                return;
            }
            // plain dialogue or caption: show it, then continue
            const onLine = (l) => this.pose(l);
            this.game.ui.dialog([line], () => this.next(), { onLine });
        }

        pose(line) {
            if (!Array.isArray(line)) return;
            const [who] = line;
            const a = this.actors[who];
            if (who === 'mira' && a) a.talk = 1.2;
            if (who === 'nova' && a) a.meow = 0.8;
            if (who === 'startiger' && this.tiger) this.tiger.glow = 1.5;
            if (who === 'startigerdad' && this.dad) this.dad.glow = 1.5;
            if (this.ride && who === 'nova' && !this.novaActor) this.ride.novaDo('meow', 1);
            if (this.ride && who === 'mira') this.ride.miraDo('wave', 1.4);
        }

        act(action, then) {
            const A = this.actors;
            const later = (s, fn) => this.game.later(s, fn);
            switch (action) {
                case 'starfall':
                    this.star = { t: 0, x0: 520, y0: -150, x1: 245, y1: -2 };
                    this.game.audio.sfx('whoosh');
                    later(1.1, () => {
                        fx.burst('sparkle', 245, -4, 22, { speed: 60, gravity: 30, life: 1.2 });
                        this.game.audio.sfx('secret');
                        this.starGlow = 1;
                    });
                    later(1.6, then);
                    break;
                case 'novaAppears':
                    A.nova.hidden = false;
                    A.nova.anim = 'sad';
                    fx.burst('sparkleSmall', A.nova.x, -8, 10, { speed: 30, gravity: 20, life: 0.8 });
                    this.game.audio.sfx('voice', { voice: 'mew' });
                    later(0.6, () => {
                        // Mira puts her ice cream down and walks over
                        A.mira.anim = 'walk';
                        A.mira.walkTo = 205;
                    });
                    later(2.2, then);
                    break;
                case 'gondolaArrives':
                    // it slides down a starry cable and stops right by the bench
                    this.cable = storyCable(GONDOLA_STOP);
                    this.gondola = { x: 600, y: this.cable.y(600), miraAnim: 'idle', miraFrame: 0, novaAnim: 'sit', novaFrame: 0, novaVisible: false, miraVisible: false, outfit: store.data.outfit, lamp: false, visible: true, arriving: GONDOLA_STOP };
                    this.game.audio.sfx('twinkle');
                    A.nova.anim = 'happy';
                    A.mira.anim = 'surprised';
                    later(2.4, () => {
                        A.mira.anim = 'idle';
                        then();
                    });
                    break;
                case 'boardGondola':
                    // hop in and ride up to the stars
                    A.mira.hidden = true;
                    A.nova.hidden = true;
                    this.gondola.novaVisible = true;
                    this.gondola.miraVisible = true;
                    this.gondola.miraAnim = 'cheer';
                    this.gondola.novaAnim = 'happy';
                    this.game.audio.sfx('cheer');
                    this.rising = 0;
                    later(3.2, then);
                    break;
                case 'tigerAppears':
                    for (const t of this.parents) t.appear = 0;
                    this.game.audio.sfx('secret');
                    later(2.6, then);
                    break;
                case 'novaRuns':
                    this.novaActor = { x: this.ride.gondola.novaScreen ? this.ride.gondola.novaScreen.x + this.ride.camX : this.ride.gondola.x + 10, y: this.ride.gondola.y + 40, t: 0 };
                    this.ride.gondola.novaVisible = false;
                    this.game.audio.sfx('voice', { voice: 'meow' });
                    later(2.2, () => {
                        for (const t of this.parents) t.anim = 'nuzzle';
                        const mid = this.familyMid();
                        for (let i = 0; i < 14; i += 1) later(i * 0.12, () => fx.spawn('heart', mid - 12 + Math.random() * 24, (this.ride.surfaceAt(mid) ?? 0) - 26, { vy: -20, vx: (Math.random() - 0.5) * 16, life: 1.4, wobble: 3 }));
                        then();
                    });
                    break;
                case 'giftStar':
                    this.captureFamily = true;   // a keepsake photo of Nova with her mum and dad
                    this.gift = { t: 0 };
                    this.game.audio.sfx('reward');
                    later(2, then);
                    break;
                case 'homecoming':
                    this.cable = storyCable(GONDOLA_STOP);
                    this.gondola.visible = true;
                    this.gondola.x = 560;
                    this.gondola.y = this.cable.y(560);
                    this.landing = 0;
                    later(3.4, () => {
                        this.gondola.miraVisible = false;
                        A.mira.hidden = false;
                        A.mira.x = GONDOLA_STOP - 26;
                        A.mira.dir = -1;
                        A.mira.anim = 'wave';
                        A.alva.hidden = false;
                        A.pappa.hidden = false;
                        A.alva.walkTo = GONDOLA_STOP - 52;
                        A.pappa.walkTo = GONDOLA_STOP - 84;
                        A.alva.anim = 'walk';
                        A.pappa.anim = 'walk';
                    });
                    {
                        // Alva speaks first, so wait until she is by Mira's side
                        const start = this.time;
                        const ready = () => {
                            if (this.time - start > 3.6 && (A.alva.walkTo === undefined || this.time - start > 10)) then();
                            else later(0.2, ready);
                        };
                        later(3.8, ready);
                    }
                    break;
                case 'constellation':
                    this.constellation = 0;
                    this.game.audio.sfx('twinkle');
                    A.mira.anim = 'point';
                    A.alva.anim = 'wave';
                    later(3, then);
                    break;
                case 'theEnd':
                    this.game.audio.sfx('reward');
                    later(0.8, then);
                    break;
                default:
                    then();
            }
        }

        finish() {
            const done = this.done;
            this.done = null;
            if (done) done();
        }

        // --- update & draw ---------------------------------------------------------
        update(dt) {
            this.time += dt;
            fx.update(dt);
            if (this.ride) {
                this.ride.update(dt);
                this.updateFinale(dt);
                return;
            }
            for (const a of Object.values(this.actors)) {
                if (a.walkTo !== undefined) {
                    const d = a.walkTo - a.x;
                    if (Math.abs(d) < 1) {
                        a.x = a.walkTo;
                        a.walkTo = undefined;
                        a.anim = a === this.actors.mira ? 'idle' : 'idle';
                    } else {
                        a.dir = Math.sign(d);
                        a.x += Math.sign(d) * Math.min(Math.abs(d), (a.speed || 28) * dt);
                    }
                }
                a.talk = Math.max(0, (a.talk || 0) - dt);
                a.meow = Math.max(0, (a.meow || 0) - dt);
            }
            if (this.star) this.star.t += dt;
            this.starGlow = Math.max(0, (this.starGlow || 0) - dt * 0.5);
            const g = this.gondola;
            if (g && this.cable) {
                if (this.id === 'prologue') {
                    if (this.rising !== undefined) {
                        this.rising += dt;
                        g.x += dt * (12 + this.rising * 34);
                    } else if (g.arriving !== undefined) {
                        g.x = lerp(g.x, g.arriving, Math.min(1, dt * 1.3));
                    }
                    g.y = this.cable.y(g.x);
                } else if (this.id === 'epilogue' && this.landing !== undefined) {
                    this.landing += dt;
                    g.x = lerp(600, GONDOLA_STOP, easeInOut(clamp(this.landing / 3.2, 0, 1)));
                    g.y = this.cable.y(g.x);
                }
                g.miraFrame = Math.floor(this.time / 0.3) % 2;
                g.novaFrame = Math.floor(this.time / 0.3) % 2;
            }
            if (this.constellation !== undefined) this.constellation += dt;
            // the camera follows the gondola as it rises towards the stars
            if (this.id === 'prologue' && this.rising !== undefined && g) {
                this.cam.y = Math.min(0, lerp(this.cam.y, g.y + 70, Math.min(1, dt * 1.5)));
                this.cam.x = lerp(this.cam.x, Math.max(0, g.x - 215), Math.min(1, dt * 1.5));
            }
        }

        // the point between mum and dad where Nova ends up
        familyMid() {
            if (this.cubSpot) return this.cubSpot.x;
            return this.dad ? (this.dadX + this.tigerX) / 2 : this.tigerX - 28;
        }

        updateFinale(dt) {
            const ride = this.ride;
            for (const t of this.parents) {
                if (t.appear !== undefined) {
                    t.appear += dt;
                    t.alpha = clamp(t.appear / 1.2, 0, 1);
                    const d = t.to - t.x;
                    if (Math.abs(d) > 0.5) {
                        t.anim = 'walk';
                        t.x += Math.sign(d) * Math.min(Math.abs(d), dt * 24);
                    } else {
                        t.x = t.to;
                        t.anim = t.anim === 'walk' ? 'idle' : t.anim;
                    }
                    if (Math.random() < dt * 8) fx.spawn('sparkleSmall', t.x - 20 + Math.random() * 40, (ride.surfaceAt(t.x) ?? 0) - Math.random() * 30, { vy: -8, life: 1, layer: 1 });
                }
                t.glow = Math.max(0, (t.glow || 0) - dt);
            }
            if (this.novaActor) {
                const n = this.novaActor;
                n.t += dt;
                const target = this.familyMid();
                const ground = ride.surfaceAt(target) ?? 0;
                const p = clamp(n.t / 1.8, 0, 1);
                n.drawX = lerp(n.x, target, p);
                n.drawY = lerp(n.y, ground, p) - Math.sin(p * Math.PI) * 22;
            }
            if (this.gift) this.gift.t += dt;
        }

        render(g) {
            if (this.ride) {
                this.ride.render(g);
                this.renderFinale(g);
                return;
            }
            const cam = this.cam || { x: 0, y: 0 };
            const camX = Math.round(-view.w / 2 + 170 + cam.x);
            const camY = Math.round(-view.h * 0.72 + cam.y);
            this.backdrop.draw(g, camX, camY, this.time, view);
            if (this.constellation !== undefined) this.drawConstellation(g);
            // the summer town: houses and a big tree behind, then the street
            const ground = this.ground;
            g.drawImage(ground.canvas, Math.round(ground.x - camX), Math.round(-ground.top - camY));
            for (const [s, x] of TOWN_BACK) atlas.draw(g, s, 'idle', 0, x - camX, this.surf(x) - camY - 2);
            for (const [s, x] of TOWN_FRONT) {
                const f = atlas.draw(g, s, 'idle', 0, x - camX, this.surf(x) - camY);
                if (s === 'p-lamp' && f && this.id === 'epilogue') {
                    const pt = atlas.point(f, 'light', x - camX, this.surf(x) - camY) || { x: x - camX, y: this.surf(x) - camY - 28 };
                    W.drawGlow(g, pt.x, pt.y, 16, '#ffe0a0', 0.9);
                }
            }
            // the falling star
            if (this.star && this.star.t < 1.1) {
                const s = this.star;
                const p = clamp(s.t / 1.1, 0, 1);
                const x = lerp(s.x0, s.x1, p) - camX;
                const y = lerp(s.y0, s.y1, p * p) - camY;
                for (let i = 0; i < 18; i += 1) {
                    g.globalAlpha = 1 - i / 18;
                    g.fillStyle = i < 3 ? '#ffffff' : '#ffe27a';
                    g.fillRect(Math.round(x + i * 2), Math.round(y - i * 1.4), 2, 2);
                }
                g.globalAlpha = 1;
                W.drawGlow(g, x, y, 12, '#fff0a0', 1);
            }
            if (this.starGlow > 0) W.drawGlow(g, 245 - camX, this.surf(245) - 6 - camY, 22, '#ffe890', this.starGlow);
            // actors
            for (const [key, a] of Object.entries(this.actors)) {
                if (a.hidden) continue;
                let anim = a.anim;
                if (key === 'nova' && a.meow > 0) anim = 'meow';
                if (key === 'mira' && a.talk > 0 && anim === 'idle') anim = 'laugh';
                const frames = (atlas.frames(a.sprite, anim) || [0]).length;
                const frame = Math.floor(this.time / (anim === 'walk' ? 0.13 : 0.5)) % frames;
                let x = a.x;
                let y = this.surf(a.x);
                if (key === 'mira' && anim === 'sit') {
                    const bench = atlas.frame('p-bench', 'idle', 0);
                    const seat = bench && atlas.point(bench, 'seat', BENCH_X, this.surf(BENCH_X));
                    if (seat) {
                        x = seat.x;
                        y = seat.y;
                    }
                }
                atlas.draw(g, a.sprite, atlas.has(a.sprite, anim) ? anim : 'idle', frame, x - camX, y - camY, a.dir < 0);
            }
            // gondola
            if (this.gondola && this.gondola.visible) {
                if (this.cable) this.cable.draw(g, camX, camY, view, this.time, this.id === 'epilogue');
                W.drawGondola(g, this.gondola.x, this.gondola.y, camX, camY, this.gondola, this.time);
            }
            fx.draw(g, camX, camY, 1);
        }

        surf(x) {
            const s = this.ground;
            const i = clamp(Math.floor(x - s.x), 0, s.w - 1);
            return s.surface[i];
        }

        renderFinale(g) {
            const ride = this.ride;
            const camX = Math.round(ride.camX);
            const camY = Math.round(ride.camY);
            const cubs = [];
            for (const t of this.parents) {
                if (t.appear === undefined) continue;
                const ground = ride.surfaceAt(t.x) ?? 0;
                W.drawGlow(g, t.x - camX, ground - 16 - camY, 40, t.glowColor, (0.6 + (t.glow > 0 ? 0.4 : 0)) * t.alpha);
            }
            for (const t of this.parents) {
                if (t.appear === undefined) continue;
                const ground = ride.surfaceAt(t.x) ?? 0;
                const anim = atlas.has(t.sprite, t.anim) ? t.anim : 'idle';
                const shown = t.glow > 0 && t.anim !== 'nuzzle' && atlas.has(t.sprite, 'special') ? 'special' : anim;
                const frames = (atlas.frames(t.sprite, shown) || [0]).length;
                const f = atlas.draw(g, t.sprite, shown, Math.floor(this.time / 0.35) % frames, t.x - camX, ground - camY, t.dir < 0, t.alpha);
                const cub = f && shown === 'nuzzle' ? atlas.point(f, 'cub', t.x - camX, ground - camY, t.dir < 0) : null;
                if (cub) cubs.push(cub);
            }
            // Nova sits between the two chins (or under mum's, if she is alone)
            if (cubs.length) {
                const x = cubs.reduce((a, c) => a + c.x, 0) / cubs.length;
                const y = Math.max(...cubs.map((c) => c.y));
                this.cubSpot = { x: Math.round(x) + camX, y: y + camY };
            }
            if (this.novaActor && this.novaActor.drawX !== undefined) {
                const n = this.novaActor;
                const done = n.t > 1.8;
                const spot = done && this.cubSpot ? this.cubSpot : { x: n.drawX, y: n.drawY };
                // she looks up at mum, who stands on the right
                atlas.draw(g, 'nova', done ? 'happy' : 'walk', Math.floor(this.time / 0.15) % (done ? 2 : 4), spot.x - camX, spot.y - camY, false);
            }
            if (this.captureFamily) {
                this.captureFamily = false;
                const mid = this.familyMid();
                const cx = mid - camX;
                const cy = (ride.surfaceAt(mid) ?? 0) - camY - 16;
                const rect = { x: clamp(Math.round(cx - 46), 0, view.w - 92), y: clamp(Math.round(cy - 34), 0, view.h - 69), w: 92, h: 69 };
                const shot = MS.util.makeCanvas(rect.w, rect.h);
                shot.getContext('2d').drawImage(g.canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
                const d = store.data;
                const photo = shot.toDataURL('image/png');
                const ids = this.dad ? ['startiger', 'startigerdad'] : ['startiger'];
                const isNew = ids.some((id) => !d.album[id]);
                for (const id of ids) d.album[id] = { stars: 3, photo, moments: ['special', 'family'], n: (d.album[id] ? d.album[id].n : 0) + 1 };
                store.save();
                this.game.ui.refreshAlbumCount();
                const subject = { name: this.dad ? 'Nova med mamma och pappa' : 'Nova och mamma' };
                this.game.ui.polaroid({ canvas: shot, rect, subject, stars: 3, label: 'Tillsammans igen!', isNew });
                this.game.audio.sfx('star3');
            }
            if (this.gift) {
                const p = clamp(this.gift.t / 1.4, 0, 1);
                // the star comes from between mum and dad
                const mid = this.familyMid();
                const from = { x: mid, y: (ride.surfaceAt(mid) ?? 0) - 34 };
                const to = ride.gondola.miraScreen ? { x: ride.gondola.miraScreen.x + camX + 4, y: ride.gondola.miraScreen.y + camY - 26 } : from;
                const x = lerp(from.x, to.x, easeInOut(p)) - camX;
                const y = lerp(from.y, to.y, easeInOut(p)) - Math.sin(p * Math.PI) * 30 - camY;
                W.drawGlow(g, x, y, 14, '#fff3a0', 1);
                g.drawImage(MS.PIX.star, Math.round(x - 3), Math.round(y - 3));
                if (p >= 1 && !this.gift.given) {
                    this.gift.given = true;
                    ride.miraDo('cheer', 1.6);
                    fx.burst('sparkle', to.x, to.y, 14, { speed: 40, gravity: 20, life: 1 });
                }
            }
        }

        drawConstellation(g) {
            // a tiger constellation appears, joined by faint lines
            const p = clamp(this.constellation / 2, 0, 1);
            const pts = [[0.55, 0.12], [0.6, 0.1], [0.66, 0.13], [0.7, 0.19], [0.64, 0.22], [0.58, 0.2]];
            g.globalAlpha = p * 0.6;
            g.strokeStyle = '#bfe0ff';
            g.lineWidth = 1;
            g.beginPath();
            pts.forEach(([x, y], i) => {
                const px = Math.round(x * view.w) + 0.5;
                const py = Math.round(y * view.h) + 0.5;
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            });
            g.closePath();
            g.stroke();
            g.globalAlpha = 1;
            pts.forEach(([x, y], i) => {
                const tw = 0.6 + 0.4 * Math.sin(this.time * 3 + i);
                g.globalAlpha = p * tw;
                g.drawImage(MS.PIX.sparkle, Math.round(x * view.w) - 2, Math.round(y * view.h) - 2);
            });
            g.globalAlpha = 1;
            // mum, dad and their cub: three bright stars side by side
            for (const [x, y, r] of [[0.78, 0.13, 11], [0.86, 0.11, 12], [0.82, 0.19, 7]]) {
                W.drawGlow(g, x * view.w, y * view.h, r, '#ffe7a0', p);
                g.globalAlpha = p;
                g.drawImage(MS.PIX.star, Math.round(x * view.w) - 3, Math.round(y * view.h) - 3);
                g.globalAlpha = 1;
            }
        }

        tap() {}

        dispose() {
            if (this.ride) this.ride.dispose();
        }
    }

    // Where the star-tiger family stands at the end of the ride: mum this far
    // right of the gondola's stop, dad `gap` to her left (anchor to anchor)
    const FAMILY = { mum: 110, gap: 76 };

    // The summer town (the prologue and the epilogue), in world x
    const BENCH_X = 150;
    const GONDOLA_STOP = 272;     // the gondola parks just to the right of Nova
    const TOWN_BACK = [['p-house-pale', -20], ['p-house-red', 56], ['p-towntree', 250], ['p-house-red', 350], ['p-house-pale', 440], ['p-towntree', 530]];
    const TOWN_FRONT = [['p-townfence', 0], ['p-townfence', 24], ['p-townfence', 48], ['p-townfence', 72], ['p-lamp', 104], ['p-bench', BENCH_X], ['p-hedge', 290], ['p-lamp', 330], ['p-townfence', 400], ['p-townfence', 424], ['p-hedge', 480]];

    // The story cable: it reaches down to (x, -70) beside the bench and climbs
    // steeply to the right, up to the stars.
    function storyCable(x) {
        return new W.Cable([{ x: -300, y: -40, kind: 'lantern' }, { x: x + 16, y: -70, kind: 'lantern' }, { x: x + 700, y: -620, kind: 'lantern' }]);
    }

    MS.TitleScene = TitleScene;
    MS.StoryScene = StoryScene;
    void TAU;
})();
