/*
 * MIRAS STJÄRNSAFARI – fishing
 * ---------------------------------------------------------------------
 * Two places to fish: the dock at Glittersjön and an ice hole on
 * Norrskensisen. Tap the water to cast (right where a fish swims is a
 * good idea), wait for the float to dip, tap to hook, then hold to reel
 * in – and let go while the fish pulls. Mira holds up every catch, like
 * her real perch.
 */
(function () {
    'use strict';

    const MS = window.MiraSafari;
    const { clamp, lerp, TAU, makeCanvas } = MS.util;
    const { atlas, fx, view, store } = MS;
    const W = MS.world;
    const C = MS.content;

    class FishingScene {
        constructor(game, ride, { where = 'lake', first = false, done } = {}) {
            this.game = game;
            this.ride = ride;
            this.where = where;
            this.first = first;
            this.done = done;
            this.time = 0;
            this.freezeOnPanel = true;
            this.island = ride.island;
            this.backdrop = ride.backdrop;
            this.fishTable = C.FISH.filter((f) => f.where === (where === 'ice' ? 'ice' : 'lake'));
            this.fish = [];
            this.hook = { state: 'none' };
            this.cursor = { x: view.w * 0.65, y: view.h * 0.7, visible: false };
            this.mira = { anim: 'idle', frame: 0, t: 0 };
            this.nova = { anim: 'sit', t: 0, hungry: first };
            this.catches = 0;
            this.tension = 0;
            this.overTime = 0;
            this.holding = false;
            this.layout();
            for (let i = 0; i < 6; i += 1) this.spawnFish(i < 3 && first ? 'perch' : null);
            this.game.ui.showHud(false);
            this.showButtons();
            this.game.audio.playSong('fishing');
            this.game.later(0.6, () => this.game.ui.hint(first ? 'Nova är hungrig! Tryck på vattnet för att fiska.' : C.HINTS.fishStart, 4.5));
        }

        layout() {
            const ice = this.where === 'ice';
            this.waterY = Math.round(view.h * (view.portrait ? 0.42 : 0.47));
            this.floorY = view.h - 6;
            this.dockEnd = Math.round(view.w * (view.portrait ? 0.4 : 0.3));
            this.holeX = Math.round(view.w * (view.portrait ? 0.5 : 0.36));
            this.standX = ice ? this.holeX - 14 : this.dockEnd - 12;
            this.standY = ice ? this.waterY - 1 : this.waterY - 7;
            this.novaSpot = null;
            // on the dock, Mira and Nova stand where the dock art says
            const dock = !ice && atlas.frame('p-dock', 'idle', 0);
            if (dock) {
                const x = this.dockEnd - dock[3] + dock[5];
                const stand = atlas.point(dock, 'stand', x, this.waterY - 3);
                const nova = atlas.point(dock, 'nova', x, this.waterY - 3);
                if (stand) {
                    this.standX = stand.x;
                    this.standY = stand.y;
                }
                if (nova) this.novaSpot = nova.x;
            }
            this.minX = ice ? 12 : this.dockEnd + 8;
            this.maxX = view.w - 10;
        }

        resize() {
            this.layout();
        }

        spawnFish(forceId) {
            const table = this.fishTable.filter((f) => !f.junk);
            let def = forceId ? C.FISH_BY_ID[forceId] : null;
            if (!def) {
                const total = table.reduce((s, f) => s + f.weight, 0);
                let roll = Math.random() * total;
                def = table[0];
                for (const f of table) {
                    roll -= f.weight;
                    if (roll <= 0) {
                        def = f;
                        break;
                    }
                }
            }
            const y = this.waterY + 14 + Math.random() * (this.floorY - this.waterY - 28);
            this.fish.push({
                def,
                x: this.minX + Math.random() * (this.maxX - this.minX),
                y,
                baseY: y,
                dir: Math.random() < 0.5 ? -1 : 1,
                speed: (def.fight > 1.4 ? 9 : 14) + Math.random() * 8,
                state: 'swim',
                t: Math.random() * 5,
                frame: 0
            });
        }

        showButtons() {
            const ui = this.game.ui;
            if (this.btn) this.btn.remove();
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'mira-btn is-go mira-fish-done';
            b.textContent = this.first && !this.catches ? 'Fiska först! 🎣' : 'Åk vidare ▶';
            b.disabled = this.first && !this.catches;
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                this.game.audio.sfx('ui');
                this.finish();
            });
            ui.root.appendChild(b);
            this.btn = b;
        }

        finish() {
            if (this.btn) this.btn.remove();
            this.btn = null;
            this.game.audio.playSong(this.island.music);
            const done = this.done;
            this.done = null;
            if (done) done();
        }

        dispose() {
            if (this.btn) this.btn.remove();
            this.btn = null;
        }

        // --- input -------------------------------------------------------------------
        tap(vx, vy) {
            this.holding = true;
            this.act(vx, vy);
        }

        release() {
            this.holding = false;
        }

        hover(vx, vy) {
            this.cursor.x = vx;
            this.cursor.y = vy;
            this.cursor.visible = true;
        }

        keyDown(e) {
            const k = e.code;
            const step = 6;
            if (['ArrowLeft', 'KeyA'].includes(k)) this.cursor.x = clamp(this.cursor.x - step, 0, view.w);
            else if (['ArrowRight', 'KeyD'].includes(k)) this.cursor.x = clamp(this.cursor.x + step, 0, view.w);
            else if (['ArrowUp', 'KeyW'].includes(k)) this.cursor.y = clamp(this.cursor.y - step, 0, view.h);
            else if (['ArrowDown', 'KeyS'].includes(k)) this.cursor.y = clamp(this.cursor.y + step, 0, view.h);
            else if (k === 'Space' || k === 'Enter') {
                if (!e.repeat) this.act(this.cursor.x, this.cursor.y);
                this.holding = true;
            } else return false;
            this.cursor.visible = true;
            return true;
        }

        keyUp(e) {
            if (e.code === 'Space' || e.code === 'Enter') this.holding = false;
        }

        act(vx, vy) {
            const h = this.hook;
            if (h.state === 'none' || h.state === 'done') {
                if (vy < this.waterY - 2 && this.where !== 'ice') {
                    this.game.ui.hint(C.HINTS.fishStart, 2.5);
                    return;
                }
                this.cast(vx, Math.max(vy, this.waterY + 8));
            } else if (h.state === 'nibble' || h.state === 'waiting' && h.fish) {
                // too early: the fish gets scared
                this.scare();
                this.game.ui.hint(C.HINTS.fishEarly, 2.8);
            } else if (h.state === 'bite') {
                this.hookFish();
            }
        }

        cast(tx, ty) {
            const ice = this.where === 'ice';
            const x = ice ? this.holeX : clamp(tx, this.minX + 4, this.maxX - 4);
            const y = clamp(ty, this.waterY + 10, this.floorY - 4);
            this.hook = { state: 'flying', t: 0, dur: ice ? 0.3 : 0.6, from: this.rodTip(), to: { x, y: this.waterY }, depth: y, x, y: this.waterY, fish: null, wait: 0 };
            this.mira.anim = 'cast';
            this.mira.t = 0;
            this.game.audio.sfx('cast');
        }

        scare() {
            const f = this.hook.fish;
            if (f) {
                f.state = 'flee';
                f.dir = f.x < this.hook.x ? -1 : 1;
                f.t = 0;
            }
            this.hook.fish = null;
            this.hook.state = 'waiting';
            this.hook.wait = 0;
        }

        hookFish() {
            const h = this.hook;
            const f = h.fish;
            if (!f) return;
            h.state = 'reel';
            f.state = 'hooked';
            this.progress = 0;
            this.tension = 0.2;
            this.pulling = true;
            this.fightT = 0.8;
            this.startX = f.x;
            this.startY = f.y;
            this.mira.anim = 'reel';
            this.game.audio.sfx('bite');
            this.game.ui.hint(C.HINTS.fishReel, 3.5);
        }

        rodTip() {
            const f = atlas.frame(`mira-${store.data.outfit}`, this.mira.anim === 'holdfish' ? 'holdfish' : this.mira.anim, this.mira.frame);
            const p = (f && atlas.point(f, 'rod', this.standX, this.standY)) || { x: this.standX + 6, y: this.standY - 14 };
            const bend = this.hook.state === 'reel' ? (this.pulling ? 7 : 3) : 0;
            const ang = this.mira.anim === 'cast' && this.mira.t < 0.18 ? -1.9 : -0.75;
            const len = this.where === 'ice' ? 12 : 22;
            return { x: p.x + Math.cos(ang) * len, y: p.y + Math.sin(ang) * len + bend, hand: p };
        }

        // --- update ----------------------------------------------------------------------
        update(dt) {
            this.time += dt;
            this.mira.t += dt;
            fx.update(dt);
            const h = this.hook;
            // fish swim about
            for (const f of this.fish) {
                f.t += dt;
                if (f.state === 'swim') {
                    f.x += f.dir * f.speed * dt;
                    f.y = f.baseY + Math.sin(f.t * 1.3) * 2;
                    if (f.x < this.minX) f.dir = 1;
                    if (f.x > this.maxX) f.dir = -1;
                } else if (f.state === 'flee') {
                    f.x += f.dir * 50 * dt;
                    if (f.t > 1.2) f.state = 'swim';
                } else if (f.state === 'come') {
                    const dx = h.x - f.x - f.dir * 5;
                    const dy = h.y - f.y;
                    f.dir = dx > 0 ? 1 : -1;
                    const d = Math.hypot(dx, dy);
                    if (d > 2) {
                        f.x += (dx / d) * Math.min(d, 18 * dt);
                        f.y += (dy / d) * Math.min(d, 18 * dt);
                    }
                }
                f.frame = Math.floor(f.t * (f.state === 'hooked' && this.pulling ? 10 : 4)) % 2;
            }
            if (this.fish.filter((f) => f.state !== 'gone').length < 5 && Math.random() < dt * 0.4) this.spawnFish(this.first && this.catches === 0 ? 'perch' : null);

            if (h.state === 'flying') {
                h.t += dt;
                const p = clamp(h.t / h.dur, 0, 1);
                h.x = lerp(h.from.x, h.to.x, p);
                h.y = lerp(h.from.y, h.to.y, p) - Math.sin(p * Math.PI) * (this.where === 'ice' ? 6 : 26);
                if (p >= 1) {
                    h.state = 'sinking';
                    h.x = h.to.x;
                    h.y = this.waterY;
                    this.floatX = h.x;
                    this.game.audio.sfx('plop');
                    fx.burst('drop', h.x, this.waterY, 5, { speed: 26, gravity: 120, life: 0.5 });
                    this.mira.anim = 'idle';
                }
            } else if (h.state === 'sinking') {
                h.y += 30 * dt;
                if (h.y >= h.depth) {
                    h.y = h.depth;
                    h.state = 'waiting';
                    h.wait = 0;
                }
            } else if (h.state === 'waiting') {
                h.wait += dt;
                if (!h.fish && h.wait > 0.6) {
                    // who's curious? nearby fish, weighted by how common they are
                    const near = this.fish.filter((f) => f.state === 'swim' && Math.hypot(f.x - h.x, f.y - h.y) < 70);
                    if (near.length && Math.random() < dt * 1.6) {
                        let pick = near[Math.floor(Math.random() * near.length)];
                        if (this.first && this.catches === 0) pick = near.find((f) => f.def.id === 'perch') || pick;
                        pick.state = 'come';
                        h.fish = pick;
                    } else if (!near.length && h.wait > 3.5) {
                        // nobody around: send someone over
                        const any = this.fish.filter((f) => f.state === 'swim');
                        if (any.length) {
                            const pick = any[Math.floor(Math.random() * any.length)];
                            pick.state = 'come';
                            h.fish = pick;
                        }
                    }
                    // sometimes the hook snags the junk on the bottom
                    if (!h.fish && h.y > this.floorY - 14 && h.wait > 2.5 && Math.random() < dt * 0.25) {
                        const junk = this.fishTable.filter((f) => f.junk);
                        if (junk.length) {
                            const def = junk[Math.floor(Math.random() * junk.length)];
                            const j = { def, x: h.x, y: h.y, dir: 1, speed: 0, state: 'come', t: 0, frame: 0, junk: true };
                            this.fish.push(j);
                            h.fish = j;
                        }
                    }
                }
                if (h.fish && Math.hypot(h.fish.x - h.x, h.fish.y - h.y) < 8) {
                    h.state = 'nibble';
                    h.nibbles = h.fish.junk ? 0 : 1 + Math.floor(Math.random() * 3);
                    h.t = 0;
                }
            } else if (h.state === 'nibble') {
                h.t += dt;
                if (h.t > 0.55) {
                    h.t = 0;
                    if (h.nibbles > 0) {
                        h.nibbles -= 1;
                        h.dip = 0.25;
                        this.game.audio.sfx('bubblePop');
                    } else {
                        h.state = 'bite';
                        h.t = 0;
                        h.dip = 1;
                        this.game.audio.sfx('bite');
                        fx.burst('drop', this.floatX ?? h.x, this.waterY, 8, { speed: 34, gravity: 140, life: 0.6 });
                        fx.spawn('bang', (this.floatX ?? h.x), this.waterY - 12, { life: 0.9, vy: -8 });
                        this.game.ui.hint(C.HINTS.fishBite, 1.2);
                    }
                }
            } else if (h.state === 'bite') {
                h.t += dt;
                if (h.t > 1.25) {
                    // too slow: the fish takes the bait and leaves
                    this.scare();
                    this.hook.state = 'none';
                    this.game.ui.hint('Fisken åt upp betet! Försök igen.', 2.5);
                }
            } else if (h.state === 'reel') {
                this.reel(dt);
            } else if (h.state === 'landing') {
                h.t += dt;
                const p = clamp(h.t / 0.8, 0, 1);
                const f = h.fish;
                const hand = this.handPoint();
                f.x = lerp(h.fromX, hand.x, p);
                f.y = lerp(h.fromY, hand.y, p) - Math.sin(p * Math.PI) * 30;
                if (p >= 1) this.landed();
            }
            h.dip = Math.max(0, (h.dip || 0) - dt * 2);
            // Mira's frames
            const anim = this.mira.anim;
            const frames = (atlas.frames(`mira-${store.data.outfit}`, anim) || [0]).length;
            this.mira.frame = anim === 'cast' ? Math.min(frames - 1, Math.floor(this.mira.t / 0.12)) : Math.floor(this.time / (anim === 'reel' ? 0.18 : 0.6)) % frames;
            if (this.nova.anim !== 'sit') {
                this.nova.t += dt;
                if (this.nova.t > this.nova.dur) this.nova.anim = 'sit';
            }
        }

        reel(dt) {
            const h = this.hook;
            const f = h.fish;
            const fight = f.def.fight || 1;
            this.fightT -= dt;
            if (this.fightT <= 0) {
                this.pulling = !this.pulling && !f.junk;
                this.fightT = this.pulling ? 0.5 + Math.random() * 0.6 * fight : 0.9 + Math.random() * 0.9;
                if (this.pulling) this.game.audio.sfx('splash');
            }
            if (this.holding) {
                if (this.pulling) {
                    this.tension += dt * 0.75 * fight;
                    this.progress = Math.max(0, this.progress - dt * 0.04 * fight);
                } else {
                    this.tension += dt * 0.12;
                    this.progress += dt * (0.32 / Math.max(0.6, fight * 0.8));
                    if (Math.random() < dt * 8) this.game.audio.sfx('reel');
                }
            } else {
                this.tension -= dt * 0.7;
                if (this.pulling) this.progress = Math.max(0, this.progress - dt * 0.07 * fight);
            }
            this.tension = clamp(this.tension, 0, 1);
            if (this.tension >= 1) {
                this.overTime += dt;
                if (this.overTime > 0.9) {
                    // the fish got away – no harm done
                    f.state = 'flee';
                    f.dir = 1;
                    f.t = 0;
                    this.hook = { state: 'none' };
                    this.mira.anim = 'idle';
                    this.tension = 0;
                    this.overTime = 0;
                    this.game.ui.hint(C.HINTS.fishAway, 2.5);
                    return;
                }
            } else {
                this.overTime = 0;
            }
            // the fish comes closer as she reels
            const tx = this.where === 'ice' ? this.holeX : this.dockEnd + 6;
            f.x = lerp(this.startX, tx, this.progress) + (this.pulling ? Math.sin(this.time * 30) * 1.5 : 0);
            f.y = lerp(this.startY, this.waterY + 4, this.progress);
            f.dir = this.pulling ? 1 : -1;
            h.x = f.x;
            h.y = f.y;
            this.floatX = lerp(this.floatX ?? f.x, f.x, Math.min(1, dt * 3));
            if (this.progress >= 1) {
                h.state = 'landing';
                h.t = 0;
                h.fromX = f.x;
                h.fromY = f.y;
                this.mira.anim = 'holdfish';
                this.game.audio.sfx('splash');
                fx.burst('drop', f.x, this.waterY, 14, { speed: 60, gravity: 160, life: 0.8 });
            }
        }

        handPoint() {
            const f = atlas.frame(`mira-${store.data.outfit}`, 'holdfish', 0);
            return (f && atlas.point(f, 'fish', this.standX, this.standY)) || { x: this.standX + 4, y: this.standY - 14 };
        }

        landed() {
            const h = this.hook;
            const f = h.fish;
            h.state = 'done';
            f.state = 'gone';
            this.fish = this.fish.filter((o) => o !== f);
            const def = f.def;
            const [lo, hi] = def.size;
            const size = hi ? Math.round(lo + Math.pow(Math.random(), 1.6) * (hi - lo)) : 0;
            const rec = store.data.fish[def.id];
            const isNew = !rec;
            const record = !!rec && size > rec.best;
            store.data.fish[def.id] = { n: (rec ? rec.n : 0) + 1, best: Math.max(size, rec ? rec.best : 0) };
            store.save();
            this.game.ui.refreshAlbumCount();
            this.catches += 1;
            this.held = { def, size, t: 0 };
            this.mira.anim = 'holdfish';
            this.game.audio.sfx('catch');
            fx.burst('sparkle', this.standX, this.standY - 20, 12, { speed: 40, gravity: 20, life: 1 });
            // a trophy photo of Mira with her catch
            this.trophy = { def, size, isNew, record };
            this.snapTrophy = true;
            if (this.nova.hungry) {
                this.game.later(2.4, () => {
                    this.nova.hungry = false;
                    this.nova.anim = 'eat';
                    this.nova.t = 0;
                    this.nova.dur = 2.4;
                    for (let i = 0; i < 6; i += 1) this.game.later(i * 0.3, () => fx.spawn('heart', this.novaX() + 2, this.standY - 16, { vy: -16, vx: (Math.random() - 0.5) * 10, life: 1.2, wobble: 2 }));
                    this.game.ui.hint('Mums! Nova är mätt och glad. 😺', 3, 'reward');
                    this.game.audio.sfx('voice', { voice: 'meow' });
                });
            } else {
                this.nova.anim = 'happy';
                this.nova.t = 0;
                this.nova.dur = 2;
            }
            this.game.later(3.2, () => {
                this.held = null;
                this.hook = { state: 'none' };
                this.mira.anim = 'idle';
                this.showButtons();
            });
        }

        novaX() {
            if (this.novaSpot !== null) return this.novaSpot;
            return this.where === 'ice' ? this.standX - 16 : this.standX - 20;
        }

        // --- drawing -----------------------------------------------------------------------
        render(g) {
            const t = this.time;
            const ice = this.where === 'ice';
            this.backdrop.draw(g, t * 3, -view.h * 0.2, t, view);
            if (this.ride.aurora) this.ride.aurora.draw(g, view, t, t * 3, 0.9);
            const wy = this.waterY;
            const col = (this.ride.islets[0] || { style: W.TERRAIN.lake }).style.water;
            // far shore
            g.fillStyle = ice ? '#dfeaff' : '#3b2f5e';
            for (let x = 0; x < view.w; x += 1) {
                const hgt = ice ? 3 + Math.round(Math.sin(x * 0.05) * 2 + Math.sin(x * 0.17) * 1) : 6 + Math.round(Math.sin(x * 0.07) * 3 + Math.sin(x * 0.23) * 2 + (Math.sin(x * 0.61) > 0.6 ? 3 : 0));
                g.fillRect(x, wy - hgt, 1, hgt);
            }
            // water: sky reflection on top, deeper below
            for (let y = wy; y < view.h; y += 1) {
                const k = (y - wy) / (view.h - wy);
                g.fillStyle = k < 0.08 ? col.light : k < 0.35 ? col.mid : col.deep;
                g.fillRect(0, y, view.w, 1);
            }
            // light rays under water
            g.save();
            g.globalCompositeOperation = 'lighter';
            g.globalAlpha = 0.06;
            g.fillStyle = '#ffffff';
            for (let i = 0; i < 4; i += 1) {
                const x = ((i * 90 + t * 6) % (view.w + 80)) - 40;
                g.beginPath();
                g.moveTo(x, wy);
                g.lineTo(x + 14, wy);
                g.lineTo(x + 44, view.h);
                g.lineTo(x + 20, view.h);
                g.fill();
            }
            g.restore();
            // lake floor with weed
            g.fillStyle = ice ? '#1a2f5a' : '#2c3a3a';
            g.fillRect(0, this.floorY, view.w, view.h - this.floorY);
            for (let x = 6; x < view.w; x += 13) {
                const hgt = 8 + ((x * 7) % 11);
                for (let k = 0; k < hgt; k += 1) {
                    g.fillStyle = k % 3 === 0 ? '#3f8a52' : '#2f6e44';
                    g.fillRect(Math.round(x + Math.sin(t * 1.5 + x + k * 0.3) * (k / hgt) * 2), this.floorY - k, 1, 1);
                }
            }
            // fish
            for (const f of this.fish) {
                if (f.state === 'gone' || (this.held && f.def === this.held.def && this.hook.state === 'done')) continue;
                if (this.hook.state === 'landing' && f === this.hook.fish) continue;
                const a = f.state === 'hooked' || f.junk ? 1 : 0.9;
                atlas.draw(g, f.def.sprite, 'swim', f.frame, f.x, f.y, f.dir < 0, a);
            }
            // a watery veil over everything below the surface
            g.globalAlpha = 0.22;
            g.fillStyle = col.deep;
            g.fillRect(0, wy + 1, view.w, view.h - wy);
            g.globalAlpha = 1;
            // surface glints
            g.fillStyle = col.foam;
            for (let x = 0; x < view.w; x += 1) {
                const wave = Math.sin(x * 0.3 + t * 2) + Math.sin(x * 0.11 - t * 1.4);
                if (wave > 1.55) g.fillRect(x, wy + 1 + (x % 3 === 0 ? 1 : 0), 2, 1);
            }
            g.fillStyle = col.light;
            g.fillRect(0, wy, view.w, 1);

            if (ice) this.drawIce(g);
            else this.drawDock(g);

            // Nova and Mira
            const novaAnim = atlas.has('nova', this.nova.anim) ? this.nova.anim : 'sit';
            atlas.draw(g, 'nova', novaAnim, Math.floor(t / 0.3) % (atlas.frames('nova', novaAnim) || [0]).length, this.novaX(), this.standY, false);
            const miraName = `mira-${store.data.outfit}`;
            const mf = atlas.draw(g, miraName, atlas.has(miraName, this.mira.anim) ? this.mira.anim : 'idle', this.mira.frame, this.standX, this.standY);
            // the rod and the line
            if (this.mira.anim !== 'holdfish') {
                const tip = this.rodTip();
                g.strokeStyle = '#6b4a2a';
                g.lineWidth = 1;
                this.pixelLine(g, tip.hand.x, tip.hand.y, tip.x, tip.y, '#6b4a2a');
                const h = this.hook;
                if (h.state !== 'none' && h.state !== 'done') {
                    const fx0 = h.state === 'flying' ? h.x : (this.floatX ?? h.x);
                    const fy0 = h.state === 'flying' ? h.y : wy - 1 + Math.round((h.dip || 0) * 3) + (h.state === 'waiting' ? Math.round(Math.sin(t * 2) * 0.6) : 0);
                    this.pixelLine(g, tip.x, tip.y, fx0, fy0, '#f4f0ff');
                    if (h.state !== 'flying') {
                        this.pixelLine(g, fx0, fy0, h.x, h.y, '#c8e8ff');
                        if (!ice) {
                            // red and white float
                            g.fillStyle = '#ff4a4a';
                            g.fillRect(Math.round(fx0) - 1, fy0 - 2, 3, 2);
                            g.fillStyle = '#ffffff';
                            g.fillRect(Math.round(fx0) - 1, fy0, 3, 1);
                        }
                        g.fillStyle = '#d8d8e8';
                        g.fillRect(Math.round(h.x), Math.round(h.y), 1, 2);
                    }
                }
            }
            // the catch, held up high
            if (this.hook.state === 'landing' || this.held) {
                const f = this.hook.fish || {};
                const def = this.held ? this.held.def : f.def;
                const pos = this.held ? this.handPoint() : { x: f.x, y: f.y };
                if (def) atlas.draw(g, def.sprite, 'swim', Math.floor(t * 6) % 2, pos.x, pos.y, false);
            }
            fx.draw(g, 0, 0, 1);
            fx.draw(g, 0, 0, 2);
            if (this.snapTrophy) {
                this.snapTrophy = false;
                this.photoTrophy(g);
            }
            // reel meter
            if (this.hook.state === 'reel') this.drawMeter(g);
            if (this.cursor.visible && (this.hook.state === 'none' || this.hook.state === 'done')) {
                g.fillStyle = '#ffffff';
                const cx = Math.round(this.cursor.x);
                const cy = Math.round(Math.max(this.cursor.y, wy + 8));
                g.fillRect(cx - 3, cy, 7, 1);
                g.fillRect(cx, cy - 3, 1, 7);
            }
            void mf;
        }

        pixelLine(g, x0, y0, x1, y1, color) {
            g.fillStyle = color;
            x0 = Math.round(x0);
            y0 = Math.round(y0);
            x1 = Math.round(x1);
            y1 = Math.round(y1);
            const dx = Math.abs(x1 - x0);
            const dy = -Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1;
            const sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;
            for (let i = 0; i < 2000; i += 1) {
                g.fillRect(x0, y0, 1, 1);
                if (x0 === x1 && y0 === y1) break;
                const e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
            }
        }

        drawDock(g) {
            const wy = this.waterY;
            const dock = atlas.frame('p-dock', 'idle', 0);
            // grassy bank on the left, reaching out to where the dock begins
            const bank = dock ? Math.max(18, this.dockEnd - dock[3] + 3) : 18;
            g.fillStyle = '#5aa844';
            g.fillRect(0, wy - 8, bank, view.h - wy + 8);
            g.fillStyle = '#3f8436';
            g.fillRect(bank - 2, wy - 7, 2, view.h - wy + 7);
            g.fillStyle = '#86d45c';
            g.fillRect(0, wy - 9, bank + 2, 2);
            // a few tufts of grass along the top
            for (let x = 4; x < bank - 2; x += 7) g.fillRect(x, wy - 11 + (x % 3 === 0 ? 1 : 0), 1, 2);
            if (dock) {
                // the dock's right end reaches dockEnd
                const x = this.dockEnd - dock[3] + dock[5];
                atlas.drawFrame(g, dock, x, wy - 3);
            } else {
                g.fillStyle = '#8a5a34';
                g.fillRect(10, wy - 7, this.dockEnd - 6, 3);
                g.fillStyle = '#b07a4a';
                g.fillRect(10, wy - 7, this.dockEnd - 6, 1);
                g.fillStyle = '#5a3a24';
                for (let x = 16; x < this.dockEnd; x += 14) g.fillRect(x, wy - 4, 2, 14);
            }
            atlas.draw(g, 'p-reeds', 'idle', Math.floor(this.time * 1.6) % 2, 8, wy - 6);
            atlas.draw(g, 'p-cattail', 'idle', Math.floor(this.time * 1.6 + 1) % 2, view.w - 14, wy + 2);
            atlas.draw(g, 'p-lilypad', 'idle', 0, view.w * 0.72, wy);
        }

        drawIce(g) {
            const wy = this.waterY;
            // the ice sheet with a round hole
            for (let y = wy - 2; y < wy + 7; y += 1) {
                g.fillStyle = y < wy ? '#ffffff' : y < wy + 3 ? '#dff2ff' : '#9fd0f0';
                g.fillRect(0, y, this.holeX - 7, 1);
                g.fillRect(this.holeX + 8, y, view.w - this.holeX - 8, 1);
            }
            g.fillStyle = '#6ab0e0';
            g.fillRect(this.holeX - 7, wy + 6, 15, 1);
            atlas.draw(g, 'p-snowspruce2', 'idle', 0, view.w - 30, wy - 2);
            atlas.draw(g, 'p-igloo', 'idle', 0, 26, wy - 2);
        }

        drawMeter(g) {
            const x = Math.round(this.standX + 16);
            const y = Math.round(this.standY - 40);
            const h = 30;
            g.fillStyle = '#2a1c4a';
            g.fillRect(x - 1, y - 1, 7, h + 2);
            g.fillStyle = '#efe6ff';
            g.fillRect(x, y, 5, h);
            const fill = Math.round(this.tension * h);
            g.fillStyle = this.tension > 0.8 ? '#ff4a4a' : this.tension > 0.5 ? '#ffc23a' : '#5fd068';
            g.fillRect(x, y + h - fill, 5, fill);
            if (this.pulling) {
                g.fillStyle = Math.floor(this.time * 8) % 2 ? '#ff4a4a' : '#ffffff';
                g.fillRect(x + 1, y - 7, 3, 4);
                g.fillRect(x + 1, y - 2, 3, 1);
            }
            // progress: a little fish moving towards Mira
            const px = Math.round(lerp(view.w - 20, this.standX + 30, this.progress || 0));
            g.fillStyle = '#2a1c4a';
            g.fillRect(this.standX + 26, 8, view.w - this.standX - 44, 3);
            g.fillStyle = '#ffd35a';
            g.fillRect(px - 2, 7, 5, 5);
        }

        photoTrophy(g) {
            const rect = { x: clamp(Math.round(this.standX - 46), 0, view.w - 92), y: clamp(Math.round(this.standY - 58), 0, view.h - 69), w: 92, h: 69 };
            const shot = makeCanvas(rect.w, rect.h);
            shot.getContext('2d').drawImage(g.canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
            const tr = this.trophy;
            const label = tr.size ? `${tr.size} cm${tr.record ? ' – NYTT REKORD!' : ''}` : 'Hihi!';
            this.game.ui.polaroid({ canvas: shot, rect, subject: { name: tr.def.name }, stars: tr.def.rare ? 3 : tr.def.junk ? 1 : 2, label, isNew: tr.isNew, improved: tr.record });
        }
    }

    MS.FishingScene = FishingScene;
    void TAU;
})();
