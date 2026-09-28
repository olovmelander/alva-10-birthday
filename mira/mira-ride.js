/*
 * MIRAS STJÄRNSAFARI – the gondola ride
 * ---------------------------------------------------------------------
 * One ride = one island: the gondola glides along its cable, animals live
 * their lives below, and Mira photographs them (and throws apples, plays
 * the flute and blows bubbles). At the end the gondola stops by an animal
 * Nova hopes might be her mother.
 */
(function () {
    'use strict';

    const MS = window.MiraSafari;
    const { clamp, lerp, rng, TAU, makeCanvas, easeOut } = MS.util;
    const { atlas, fx, view } = MS;
    const W = MS.world;
    const C = MS.content;

    const FRAME_W = 92;
    const FRAME_H = 69;
    const CABLE_Y = -104;

    // How long each frame of an animation shows (seconds)
    const FRAME_TIME = { idle: 0.55, blink: 0.14, walk: 0.13, hop: 0.1, swim: 0.35, fly: 0.08, float: 0.4, eat: 0.25, special: 0.2, look: 1, sleep: 0.8, climb: 0.14, swing: 0.24, breach: 0.55, spout: 0.3, peek: 0.6, dance: 0.2, dive: 0.35, laugh: 0.16, lie: 0.8 };

    // =====================================================================
    // Animals
    // =====================================================================
    let nextId = 1;

    class Animal {
        constructor(ride, sp, x, opts = {}) {
            this.id = nextId++;
            this.ride = ride;
            this.sp = sp;
            this.sprite = sp.variants ? sp.variants[(opts.index || 0) % sp.variants.length] : sp.sprite;
            if (!atlas.has(this.sprite)) this.sprite = sp.sprite;
            this.wade = !!opts.wade;
            this.x = x;
            this.y = 0;
            this.dir = opts.dir || (Math.random() < 0.5 ? -1 : 1);
            this.home = [x - (opts.range ?? sp.range), x + (opts.range ?? sp.range)];
            this.lane = opts.lane ?? 1;
            this.state = 'idle';
            this.t = 0;
            this.dur = 1 + Math.random() * 2;
            this.anim = 'idle';
            this.frame = 0;
            this.frameT = Math.random();
            this.blinkIn = 2 + Math.random() * 3;
            this.blinkT = 0;
            this.lookT = 0;
            this.danceT = 0;
            this.playT = 0;
            this.hop = 0;
            this.bounce = 0;
            this.hidden = !!opts.hidden;
            this.sleeping = !!sp.sleeper;
            this.pond = opts.pond || null;
            this.perch = opts.perch || null;
            this.air = opts.air || null;
            this.event = opts.event || null;
            this.leader = null;
            this.slot = 0;
            this.box = null;
            this.seed = Math.random() * 100;
            this.onScreen = false;
            this.alpha = 1;
            this.front = false;         // drawn in front of the gondola (giraffe lick)
            this.carry = null;          // what it carries (the monkey and Mira's hat)
            this.fixedY = opts.y ?? null;
            this.swing = !!opts.swing;  // hangs from a vine and swings (the jungle monkey)
            this.inWater = false;       // amphibious animals (the beaver) swim while in a pond
            this.submerged = 0;         // the otter dives out of sight for a moment
            this.climb = null;          // a squirrel running up a pine trunk
            this.napping = false;
            if (this.air) {
                this.baseY = this.air[0] + Math.random() * (this.air[1] - this.air[0]);
                this.y = this.baseY;
            }
            if (sp.kind === 'floater' && opts.sky) {
                this.baseY = -150 - Math.random() * 8;
                this.y = this.baseY;
            }
            if (this.pond) this.x = clamp(this.x, this.pond.x0 + 8, this.pond.x1 - 8);
            if (this.sleeping) this.setState('sleep', 999);
            this.place();
        }

        place() {
            const r = this.ride;
            if (this.fixedY !== null) {
                this.y = this.fixedY;
                return;
            }
            const k = this.sp.kind;
            if (this.sp.amphibious) {
                const water = r.pondAt(this.x, -4);
                this.inWater = !!water;
                if (water) {
                    this.y = water.y;
                    return;
                }
            }
            if (this.pond) {
                this.y = this.pond.y + (this.wade ? 4 : 0);
            } else if (k === 'ground' || k === 'hopper') {
                const s = r.surfaceAt(this.x);
                if (s !== null) this.y = s + (this.lane - 1) * 2;
            }
        }

        setState(state, dur) {
            this.state = state;
            this.t = 0;
            this.dur = dur;
            this.frame = 0;
            this.frameT = 0;
            this.seqI = 0;
            if (state === 'special' && !this.swing) this.ride.animalVoice(this);
        }

        // --- moment for photos ----------------------------------------
        moment() {
            if (this.climb) return this.climb.phase === 'run' ? 'plain' : 'special';
            if (this.state === 'special' || this.state === 'event') return 'special';
            if (this.state === 'eat' && this.eatingApple) return 'eat';
            if (this.danceT > 0) return 'dance';
            if (this.playT > 0) return 'play';
            if (this.lookT > 0) return 'look';
            if (this.state === 'sleep') return 'sleep';
            if (this.state === 'eat') return 'eat';
            return 'plain';
        }

        // what the photo caption says for a special moment
        specialLabel() {
            if (this.swing && this.sp.swingLabel) return this.sp.swingLabel;
            return this.sp.special ? this.sp.special.label : null;
        }

        animFor(state) {
            const a = this.sp.anims;
            const has = (n) => atlas.has(this.sprite, n);
            const pick = (...names) => names.find((n) => n && has(n)) || 'idle';
            if (this.swing) return pick('swing', a.idle, 'idle');
            if (state === 'climb') return this.climb && this.climb.phase === 'run' ? pick(a.move, 'hop', 'walk') : pick('climb', 'idle');
            if (this.inWater) return state === 'special' ? pick('special', 'swim') : pick('swim', 'idle');
            switch (state) {
                case 'move':
                case 'seek':
                    return pick(a.move, 'walk', 'hop', 'fly', 'swim');
                case 'eat':
                    return pick('eat', a.idle, 'idle');
                case 'special':
                case 'event':
                    return pick(a.special, 'special', a.idle, 'idle');
                case 'sleep':
                    return pick('sleep', a.idle, 'idle');
                case 'hidden':
                    return pick('peek', 'idle');
                case 'act':
                    return pick(this.actAnim, a.idle, 'idle');
                default:
                    if (this.danceT > 0 && a.dance && has(a.dance)) return a.dance;
                    if (this.lookT > 0 && has('look')) return 'look';
                    return pick(a.idle, 'idle');
            }
        }

        // --- behaviour ------------------------------------------------------
        update(dt, time) {
            const r = this.ride;
            if (this.submerged > 0) {
                // under water: come up again somewhere else in the pond
                this.submerged -= dt;
                this.box = null;
                if (this.submerged <= 0) {
                    const p = this.pond;
                    if (p) this.x = clamp(this.x + (Math.random() - 0.5) * 70, p.x0 + 10, p.x1 - 10);
                    this.place();
                    this.setState('idle', 1.5 + Math.random() * 2);
                    fx.burst('drop', this.x, this.y - 2, 6, { speed: 26, gravity: 90, life: 0.6 });
                }
                return;
            }
            this.t += dt;
            this.lookT = Math.max(0, this.lookT - dt);
            this.danceT = Math.max(0, this.danceT - dt);
            this.playT = Math.max(0, this.playT - dt);
            this.bounce = 0;
            this.hop = 0;

            if (this.leader) {
                this.follow(dt);
            } else if (this.state === 'sleep') {
                // sleepers wait for music; a napping sloth wakes up by itself
                if (this.napping && this.t > this.dur) {
                    this.napping = false;
                    this.setState('idle', 1.5 + Math.random() * 2);
                }
            } else if (this.state === 'climb') {
                this.updateClimb(dt);
            } else if (this.state === 'hidden') {
                // wait for the trigger (apples or bubbles)
            } else if (this.state === 'event') {
                if (this.t > this.dur) this.setState('idle', 1.5 + Math.random() * 2);
            } else if (this.state === 'seek') {
                this.seek(dt);
            } else if (this.state === 'eat') {
                if (this.t > this.dur) {
                    this.eatingApple = false;
                    this.setState('idle', 1 + Math.random() * 2);
                }
                if (this.eatingApple && Math.random() < dt * 2.2) fx.spawn('heartSmall', this.x + this.dir * 4, this.headY() - 2, { vy: -14, life: 0.9, wobble: 2 });
            } else if (this.state === 'special') {
                // some specials travel (a galloping zebra, a pouncing fox)
                const spec = this.sp.special || {};
                const mv = spec.move;
                if (mv && !this.swing && (!spec.moveFrames || spec.moveFrames.includes(this.frame))) {
                    const nx = this.x + this.dir * mv * dt;
                    if (this.canStand(nx)) {
                        this.x = nx;
                        this.place();
                    } else {
                        this.dir *= -1;
                    }
                }
                if (this.t > this.dur) {
                    // a heron swallows the fish it just caught
                    if (spec.then && atlas.has(this.sprite, spec.then) && !this.swing) this.setState(spec.then, 1.3);
                    else this.setState('idle', this.swing ? 1 + Math.random() * 1.5 : 1 + Math.random() * 2.5);
                }
            } else if (this.state === 'act') {
                if (this.t > this.dur) {
                    if (this.actDive) {
                        this.actDive = false;
                        this.submerged = 1.3 + Math.random() * 1.2;
                        this.box = null;
                        return;
                    }
                    this.setState('idle', 1 + Math.random() * 2);
                }
            } else if (this.state === 'move') {
                this.move(dt);
            } else {
                // idle: now and then do something
                if (this.t > this.dur) this.decide();
            }

            // dancing to the flute: bounce on the beat
            if (this.danceT > 0 && this.state !== 'sleep' && this.state !== 'hidden' && !this.climb) {
                const beat = (r.time * 2.5 + this.seed) % 1;
                this.bounce = -Math.round(Math.sin(beat * Math.PI) * 3);
                if (Math.random() < dt * 1.4) fx.spawn(Math.random() < 0.5 ? 'note' : 'note2', this.x, this.headY() - 4, { vy: -16, vx: (Math.random() - 0.5) * 10, life: 1.1, wobble: 2 });
            }
            if (this.playT > 0 && this.state !== 'sleep' && !this.climb) {
                const p = (r.time * 1.7 + this.seed) % 1;
                this.bounce = Math.min(this.bounce, -Math.round(Math.sin(p * Math.PI) * 7));
            }

            // flyers and floaters drift
            const k = this.sp.kind;
            if (k === 'flyer' && !this.leader) {
                const tt = time + this.seed;
                if (this.state === 'special' && this.sp.lands) {
                    // butterflies settle on the flowers to rest
                    const ground = r.surfaceAt(this.x);
                    if (ground !== null) this.y += (ground - 1 - this.y) * Math.min(1, dt * 4);
                } else if (this.state !== 'special') {
                    this.x += Math.sin(tt * 0.9) * this.sp.speed * dt + this.dir * this.sp.speed * 0.25 * dt;
                    const want = this.baseY + Math.sin(tt * 2.3) * 5 + Math.sin(tt * 0.7) * 6;
                    this.y += (want - this.y) * Math.min(1, dt * 3);
                    if (this.x < this.home[0]) this.dir = 1;
                    if (this.x > this.home[1]) this.dir = -1;
                }
            } else if (k === 'floater') {
                const tt = time + this.seed;
                this.y = this.baseY + Math.sin(tt * 1.2) * 3;
                if (this.sp.speed && this.sp.range === 0) this.x += this.sp.speed * dt * this.dir;
                else this.x += Math.sin(tt * 0.5) * this.sp.speed * dt;
            }

            // blinking
            this.blinkIn -= dt;
            if (this.blinkIn <= 0) {
                this.blinkT = 0.13;
                this.blinkIn = 2 + Math.random() * 4;
            }
            this.blinkT = Math.max(0, this.blinkT - dt);

            // animation frames
            const anim = this.animFor(this.state === 'idle' && (this.danceT > 0 || this.playT > 0) ? 'idle' : this.state);
            if (anim !== this.anim) {
                this.anim = anim;
                this.frame = 0;
                this.frameT = 0;
            }
            const ft = this.frameTime(anim);
            this.frameT += dt;
            if (this.climb && this.climb.phase === 'hold') this.frameT = 0;
            if (this.frameT >= ft) {
                this.frameT -= ft;
                const n = (atlas.frames(this.sprite, anim) || [0]).length;
                const inSpecial = this.state === 'special' || this.state === 'event';
                if (this.swing) {
                    // swing back and forth on the vine, or hang still for a moment
                    this.seqI = (this.seqI || 0) + 1;
                    const order = inSpecial ? [0, 1, 2, 1] : [1];
                    this.frame = Math.min(order[this.seqI % order.length], n - 1);
                    return;
                }
                const seq = inSpecial && this.sp.special && this.sp.special.seq;
                if (seq) {
                    // a hand-timed order of frames, e.g. a sheep's boing 0-1-2-1-0
                    this.seqI = (this.seqI || 0) + 1;
                    const i = this.sp.special.loop ? this.seqI % seq.length : Math.min(this.seqI, seq.length - 1);
                    this.frame = Math.min(seq[i], n - 1);
                    return;
                }
                const looping = (inSpecial && this.sp.special && this.sp.special.loop) || (this.state === 'act' && this.actLoop);
                const once = (inSpecial || this.state === 'act') && !looping && anim !== 'idle' && anim !== (this.sp.anims.idle || 'idle');
                const before = this.frame;
                if (once) this.frame = Math.min(this.frame + 1, n - 1);
                else if (looping && this.frame + 1 >= n) this.frame = Math.min((inSpecial && this.sp.special.loopFrom) || 0, n - 1);
                else this.frame = (this.frame + 1) % n;
                if (inSpecial && this.frame !== before) this.specialEffects();
            }
        }

        frameTime(anim) {
            const spec = this.sp.special;
            if ((this.state === 'special' || this.state === 'event') && spec && spec.frame && !this.swing) return spec.frame;
            const own = this.sp.frameTimes && this.sp.frameTimes[anim];
            if (Array.isArray(own)) return own[this.frame] ?? own[own.length - 1];
            return own || FRAME_TIME[anim] || 0.2;
        }

        // wood chips from a woodpecker, a splash from a heron or a beaver's tail
        specialEffects() {
            const spec = this.sp.special;
            if (!spec || !this.onScreen) return;
            const f = atlas.frame(this.sprite, this.anim, this.frame);
            if (spec.chips !== undefined && this.frame === spec.chips) {
                const p = atlas.point(f, 'beak', this.x, this.y, this.dir < 0) || { x: this.x + this.dir * 4, y: this.headY() + 3 };
                for (let i = 0; i < 2; i += 1) fx.spawn('chip', p.x + this.dir, p.y, { vx: -this.dir * (10 + Math.random() * 16), vy: -14 - Math.random() * 12, gravity: 110, life: 0.7 });
            }
            if (spec.splash !== undefined && this.frame === spec.splash) {
                const x = this.x + this.dir * (spec.splashAt || 8);
                const y = this.pond ? this.pond.y : this.inWater ? this.y : this.y;
                fx.burst('drop', x, y - 1, 7, { speed: 34, gravity: 110, life: 0.6, angle: -Math.PI / 2, spread: 1.6 });
                if (this.onScreen) this.ride.sound('plop', this);
            }
        }

        // --- a squirrel running up a pine and back down ----------------------------
        startClimb() {
            const tree = this.ride.trunkFor(this.x, 120);
            if (!tree) return false;
            this.climb = { phase: 'run', t: 0, ...tree };
            this.fixedY = null;
            this.setState('climb', 30);
            return true;
        }

        updateClimb(dt) {
            const c = this.climb;
            if (!c) {
                this.setState('idle', 1);
                return;
            }
            c.t += dt;
            if (c.phase === 'run') {
                const dx = c.x - this.x;
                this.dir = dx > 0 ? 1 : -1;
                if (Math.abs(dx) < 1.5 || c.t > 6) {
                    if (Math.abs(dx) >= 1.5) {
                        this.climb = null;
                        this.setState('idle', 1);
                        return;
                    }
                    this.x = c.x;
                    this.dir = c.dir;
                    c.phase = 'up';
                    c.y = c.low;
                    c.t = 0;
                } else {
                    this.x += this.dir * Math.min(Math.abs(dx), this.sp.speed * 1.5 * dt);
                    this.place();
                    this.hop = -Math.round(Math.abs(Math.sin(this.t * 9)) * 3);
                    return;
                }
            }
            if (c.phase === 'up') {
                c.y -= 12 * dt;
                if (c.y <= c.high) {
                    c.y = c.high;
                    c.phase = 'hold';
                    c.t = 0;
                    c.hold = 1.2 + Math.random() * 1.8;
                }
            } else if (c.phase === 'hold') {
                if (c.t > c.hold) c.phase = 'down';
            } else if (c.phase === 'down') {
                c.y += 15 * dt;
                if (c.y >= c.low) {
                    // hop off the trunk and carry on
                    this.climb = null;
                    this.fixedY = null;
                    this.x -= c.dir * 5;
                    this.dir = -c.dir;
                    this.place();
                    this.setState('idle', 1 + Math.random() * 1.5);
                    return;
                }
            }
            this.fixedY = c.y;
            this.y = c.y;
        }

        headY() {
            const f = atlas.frame(this.sprite, 'idle', 0);
            if (!f) return this.y - 12;
            const p = f[11] && f[11].head;
            return p ? this.y - f[6] + p[1] : this.y - f[6] + f[8];
        }

        decide() {
            const sp = this.sp;
            const k = sp.kind;
            if (this.swing) {
                // a monkey on a vine: swing for a while, then hang and look around
                if (Math.random() < 0.7) this.setState('special', 2.4 + Math.random() * 2.4);
                else this.setState('idle', 1 + Math.random() * 1.5);
                return;
            }
            // little things animals do now and then (a whale's spout, a meerkat digging)
            for (const act of sp.idleActs || []) {
                if (act.water !== undefined && act.water !== this.inWater) continue;
                if (atlas.has(this.sprite, act.anim) && Math.random() < act.chance) {
                    this.actAnim = act.anim;
                    this.actLoop = !!act.loop;
                    this.actDive = !!act.dive;
                    this.setState('act', act.time || 1.4);
                    if (act.voice) this.ride.animalVoice(this);
                    return;
                }
            }
            // a sloth takes a nap now and then
            if (sp.naps && Math.random() < 0.22) {
                this.napping = true;
                this.setState('sleep', 5 + Math.random() * 4);
                return;
            }
            const canSpecial = sp.special && !sp.special.trigger && (!sp.special.water || this.inWater);
            if (k === 'percher' || k === 'hanger' || k === 'whale' || this.fixedY !== null) {
                const roll = Math.random();
                if (canSpecial && roll < (sp.special.chance || 0.3)) {
                    this.setState('special', sp.special.time || 1.5);
                } else if (sp.grazer && roll < 0.55 && atlas.has(this.sprite, 'eat')) {
                    this.setState('eat', 1.5 + Math.random() * 1.5);
                } else {
                    this.setState('idle', 1.5 + Math.random() * 3);
                }
                return;
            }
            const roll = Math.random();
            if (canSpecial && roll < (sp.special.chance || 0.2)) {
                if (sp.special.climb) {
                    if (!this.startClimb()) this.setState('idle', 1 + Math.random());
                } else {
                    this.setState('special', sp.special.time || 1.5);
                }
            } else if (sp.grazer && roll < 0.55 && !this.inWater) {
                this.setState('eat', 1.5 + Math.random() * 2.5);
            } else if (k === 'flyer' || k === 'floater') {
                this.setState('idle', 1 + Math.random() * 2);
            } else if (roll < 0.8) {
                // walk somewhere inside the home range
                const target = this.home[0] + Math.random() * (this.home[1] - this.home[0]);
                this.target = target;
                this.dir = target > this.x ? 1 : -1;
                this.setState('move', 4);
            } else {
                this.setState('idle', 1 + Math.random() * 2);
            }
        }

        canStand(x) {
            const r = this.ride;
            if (this.pond) return x > this.pond.x0 + 6 && x < this.pond.x1 - 6;
            const s = r.surfaceAt(x);
            if (s === null) return false;
            if (this.sp.amphibious) return true;
            return !r.pondAt(x, 3);
        }

        move(dt) {
            const sp = this.sp;
            const speed = sp.speed;
            if (sp.hop) {
                // hops drawn frame by frame (frogs): only move while in the air
                const inAir = this.anim === (sp.anims.move || 'hop') && this.frame === sp.hop.air;
                if (inAir) {
                    const ft = this.frameTime(this.anim);
                    const nx = this.x + this.dir * (sp.hop.dist / ft) * dt;
                    if (this.canStand(nx)) this.x = nx;
                    else this.dir *= -1;
                    if (sp.hop.arc) this.hop = -Math.round(Math.sin(clamp(this.frameT / ft, 0, 1) * Math.PI) * sp.hop.arc);
                }
            } else if (sp.kind === 'hopper') {
                // hop, pause, hop
                const period = 0.5;
                const p = (this.t % period) / period;
                if (p < 0.7) {
                    const nx = this.x + this.dir * speed * 1.4 * dt;
                    if (this.canStand(nx)) this.x = nx;
                    else this.dir *= -1;
                    this.hop = -Math.round(Math.sin((p / 0.7) * Math.PI) * 5);
                }
            } else {
                const nx = this.x + this.dir * speed * dt;
                if (this.canStand(nx)) this.x = nx;
                else {
                    this.dir *= -1;
                    this.setState('idle', 0.8 + Math.random());
                }
            }
            this.place();
            if (this.target !== undefined && Math.abs(this.x - this.target) < 2) this.setState('idle', 1 + Math.random() * 2);
            if (this.t > this.dur) this.setState('idle', 1 + Math.random() * 2);
        }

        follow(dt) {
            // babies trail behind their parent (ducklings in a row)
            const L = this.leader;
            const gap = 9 + this.slot * 9;
            const want = L.x - L.dir * gap;
            const dx = want - this.x;
            if (Math.abs(dx) > 1.5) {
                this.dir = dx > 0 ? 1 : -1;
                const nx = this.x + this.dir * Math.min(Math.abs(dx), (this.sp.speed + 6) * dt);
                if (this.canStand(nx) || this.pond) this.x = nx;
                if (this.state !== 'move') this.setState('move', 99);
            } else {
                this.dir = L.dir;
                if (this.state === 'move') this.setState('idle', 99);
                if (L.state === 'special' && this.sp.special && this.state !== 'special') this.setState('special', this.sp.special.time || 1);
                if (this.state === 'special' && this.t > (this.sp.special ? this.sp.special.time : 1)) this.setState('idle', 99);
            }
            this.place();
        }

        seek(dt) {
            const a = this.apple;
            if (!a || a.gone) {
                this.setState('idle', 1);
                return;
            }
            const dx = a.x - this.x;
            this.dir = dx > 0 ? 1 : -1;
            if (Math.abs(dx) < 6) {
                a.eaten = true;
                a.gone = true;
                this.eatingApple = true;
                this.setState('eat', 3.2);
                this.ride.sound('munch', this);
                return;
            }
            const speed = this.sp.speed * 1.8 + 8;
            const nx = this.x + this.dir * speed * dt;
            if (this.canStand(nx) || this.sp.kind === 'flyer') this.x = nx;
            else {
                this.setState('idle', 1);
                return;
            }
            if (this.sp.kind === 'hopper') this.hop = -Math.round(Math.abs(Math.sin(this.t * 7)) * 4);
            this.place();
        }

        // --- reactions ------------------------------------------------------
        hearMusic() {
            if (this.sp.likes.music === false) return;
            if (this.state === 'sleep') {
                this.sleeping = false;
                this.napping = false;
                if (this.sp.special && this.sp.special.trigger === 'music') this.setState('special', this.sp.special.time || 2);
                else this.setState('idle', 1);
                if (this.sp.sleeper) this.ride.discoverSecret(this);
                fx.spawn('bang', this.x, this.headY() - 6, { vy: -6, life: 0.9 });
                return;
            }
            if (this.sp.special && this.sp.special.trigger === 'music' && this.state !== 'special') {
                this.setState('special', this.sp.special.time || 2);
            }
            this.danceT = 4.2;
        }

        seeApple(apple) {
            if (!this.sp.likes.apple || this.leader) return false;
            if (['sleep', 'special', 'event', 'eat', 'climb'].includes(this.state) || this.swing || this.submerged > 0) return false;
            if (this.pond || ['percher', 'hanger', 'whale', 'floater', 'flyer'].includes(this.sp.kind)) return false;
            this.apple = apple;
            this.setState('seek', 8);
            return true;
        }

        seeBubble() {
            if (this.sp.likes.bubbles === false || this.state === 'sleep') return;
            if (this.playT <= 0) this.ride.sound('boing', this);
            this.playT = 2.2;
        }

        flashed() {
            // a photo makes the animal curious: it looks at Mira for a moment
            if (this.state === 'idle' || this.state === 'move' || this.state === 'eat') {
                if (atlas.has(this.sprite, 'look')) {
                    this.lookT = 1.8;
                    if (this.state === 'move') this.setState('idle', 2);
                }
            }
        }
    }

    // =====================================================================
    // The ride
    // =====================================================================
    class Ride {
        constructor(game, islandIndex, { replay = false } = {}) {
            this.game = game;
            this.index = islandIndex;
            this.island = C.ISLANDS[islandIndex];
            this.replay = replay;
            this.time = 0;
            this.camX = 0;
            this.camY = CABLE_Y;
            this.animals = [];
            this.mammaExtras = [];
            this.props = [];
            this.apples = [];
            this.bubbles = [];
            this.snaps = [];
            this.photos = [];
            this.newSpecies = new Set();
            this.secrets = new Set();
            this.flash = 0;
            this.cursor = { x: view.w * 0.6, y: view.h * 0.6, visible: false, keys: false };
            this.armed = null;          // 'apple' when the next tap throws
            this.cool = { camera: 0, apple: 0, flute: 0, bubbles: 0 };
            this.fluteT = 0;
            this.state = 'intro';       // intro | riding | stop | event | done
            this.pauseReasons = new Set();
            this.eventsDone = new Set();
            this.remarksDone = new Set();
            this.gondola = { x: -150, y: CABLE_Y, speed: 0, target: this.island.speed, bob: 0, miraAnim: 'idle', miraFrame: 0, novaAnim: 'sit', novaFrame: 0, novaFlip: false, outfit: MS.store.data.outfit, lamp: this.island.light === 'night', hatGone: false };
            this.mira = { action: null, t: 0, frameT: 0, frame: 0, blinkIn: 3 };
            this.nova = { action: null, t: 0, frameT: 0, frame: 0, blinkIn: 2 };
            this.aurora = this.island.aurora ? new W.Aurora() : null;
            this.build();
        }

        // --- world building ---------------------------------------------------
        build() {
            const isl = this.island;
            const seed = this.index * 101 + 7;
            const r = rng(seed);
            this.rand = r;
            this.backdrop = new W.Backdrop(isl.sky, seed);
            this.islets = isl.islets.map((d, i) => W.buildIslet({ ...d, seed: seed * 13 + i * 7 }, isl.terrain));
            this.ponds = this.islets.flatMap((s) => s.ponds);
            const first = this.islets[0];
            const last = this.islets[this.islets.length - 1];
            this.length = last.x + last.w;
            this.stopX = isl.mamma ? isl.mamma.x - 36 : this.length - 60;

            // towers: pylons on the islands, star lanterns over the gaps
            const towers = [{ x: first.x - 260, y: CABLE_Y - 6, kind: 'lantern' }];
            this.islets.forEach((s, i) => {
                const count = Math.max(1, Math.round(s.w / 250));
                for (let k = 0; k < count; k += 1) {
                    let x = s.x + ((k + 0.5) / count) * s.w;
                    // keep pylons out of ponds
                    for (const p of s.ponds) if (x > p.x0 - 12 && x < p.x1 + 12) x = p.x1 + 16;
                    const ground = this.surfaceAt(x);
                    towers.push({ x, y: CABLE_Y + (r() * 10 - 5), kind: 'pylon', ground });
                }
                const next = this.islets[i + 1];
                if (next) towers.push({ x: (s.x + s.w + next.x) / 2, y: CABLE_Y - 10, kind: 'lantern' });
            });
            towers.push({ x: last.x + last.w + 260, y: CABLE_Y - 6, kind: 'lantern' });
            // keep the finale's stage clear: no pylon behind the tiger family
            if (isl.mamma && isl.mamma.finale) {
                for (const t of towers) {
                    if (t.kind !== 'pylon' || t.x < this.stopX - 10 || t.x > this.stopX + 160) continue;
                    t.x = this.stopX - 40;
                    t.ground = this.surfaceAt(t.x);
                }
            }
            // the giraffe needs the cable to dip so she can reach the window
            for (const ev of isl.events || []) {
                if (ev.id === 'giraffeLick') {
                    const gx = (isl.animals.find((a) => a.event === 'giraffeLick') || {}).x || ev.at;
                    for (const t of towers) {
                        if (Math.abs(t.x - gx) < 200) t.y = -78;
                    }
                }
            }
            this.towers = towers;
            this.cable = new W.Cable(towers);

            // props
            const fixed = [];
            for (const p of isl.props) {
                if (p.auto) {
                    for (const s of this.islets) {
                        for (let x = s.x + 10; x < s.x + s.w - 10; x += p.every * (0.6 + r() * 0.8)) {
                            if (this.pondAt(x, 6)) continue;
                            if (p.shore && !this.pondAt(x, 30)) continue;
                            const name = p.auto[Math.floor(r() * p.auto.length)];
                            if (!atlas.has(name)) continue;
                            fixed.push({ s: name, x: Math.round(x), lane: r() < 0.55 ? 2 : 0, small: true });
                        }
                    }
                } else if (atlas.has(p.s)) {
                    fixed.push({ ...p, lane: p.lane ?? 0 });
                }
            }
            for (const p of fixed) {
                const f = atlas.frame(p.s, 'idle', 0);
                const onWater = p.water ? this.pondAt(p.x, 0) : null;
                let y = onWater ? onWater.y + (p.sink || 0) : this.surfaceAt(p.x);
                if (y === null) continue;
                if (p.hang) y -= p.hang;   // a vine hangs from the treetop: its anchor is the top
                this.props.push({
                    ...p,
                    y: y + (p.lane === 2 ? 1 : 0),
                    frames: (atlas.frames(p.s, 'idle') || []).length,
                    phase: r() * 10,
                    flip: p.small ? r() < 0.5 : !!p.flip,
                    h: f ? f[4] : 10
                });
            }

            // animals
            for (const group of isl.animals) {
                const sp = C.SPECIES_BY_ID[group.sp];
                if (!sp || !atlas.has(sp.sprite)) continue;
                const n = group.n || 1;
                let parent = null;
                for (let i = 0; i < n; i += 1) {
                    const x = group.x + (n > 1 ? (i - (n - 1) / 2) * ((group.spread || 30) / Math.max(1, n - 1)) : 0);
                    const opts = { range: group.range, lane: i % 2 ? 2 : 1, air: group.air, hidden: group.hidden, event: group.event, sky: group.sky, wade: group.wade, swing: group.swing, index: (group.index || 0) + i };
                    if (group.pond) opts.pond = this.pondAt(x, 0) || this.nearestPond(x);
                    let ax = x;
                    if (group.perch) {
                        const perch = this.perchFor(group.perch, x, group.on);
                        if (perch) {
                            opts.y = perch.y;
                            opts.dir = perch.dir;
                            ax = perch.x;
                        }
                    }
                    const a = new Animal(this, sp, ax, opts);
                    if (group.hidden) a.setState('hidden', 999);
                    this.animals.push(a);
                    if (sp.follows) {
                        parent = parent || this.animals.find((o) => o.sp.id === sp.follows && Math.abs(o.x - x) < 120);
                        if (parent) {
                            a.leader = parent;
                            a.slot = i;
                        }
                    }
                }
            }
            // after the story, Nova's mum and dad wait at the end of Stjärnön
            if (isl.mamma && isl.mamma.finale && MS.store.data.finished) {
                [[isl.mamma.animal, 40], ['startigerdad', 88]].forEach(([id, dx]) => {
                    const sp = C.SPECIES_BY_ID[id];
                    if (!sp || !atlas.has(sp.sprite)) return;
                    const m = new Animal(this, sp, isl.mamma.x + dx, { range: 10, lane: 1, dir: -1 });
                    m.dir = -1;
                    this.animals.push(m);
                });
            }
            // the "is it my mum?" animal waits at the end of the line
            if (isl.mamma && !isl.mamma.finale) {
                const sp = C.SPECIES_BY_ID[isl.mamma.animal];
                if (sp && atlas.has(sp.sprite)) {
                    const opts = { range: 6, lane: 1, dir: -1 };
                    if (isl.mamma.pond) opts.pond = this.nearestPond(isl.mamma.x);
                    if (isl.mamma.perch === 'fence') opts.y = (this.surfaceAt(isl.mamma.x) ?? 0) - 9;
                    const m = new Animal(this, sp, isl.mamma.x, opts);
                    m.dir = -1;
                    m.isMamma = true;
                    this.animals.push(m);
                    this.mammaAnimal = m;
                }
                // sometimes a whole family answers (the lion couple on the savanna)
                for (const ex of isl.mamma.extra || []) {
                    const esp = C.SPECIES_BY_ID[ex.animal];
                    if (!esp || !atlas.has(esp.sprite)) continue;
                    const e = new Animal(this, esp, isl.mamma.x + ex.dx, { range: 4, lane: ex.lane ?? 2, dir: -1 });
                    if (e.state === 'sleep') {
                        e.sleeping = false;
                        e.setState('idle', 2);
                    }
                    e.dir = -1;
                    e.isMamma = true;
                    this.animals.push(e);
                    this.mammaExtras.push(e);
                }
            }
            this.weather = isl.weather;
        }

        surfaceAt(x) {
            for (const s of this.islets) {
                if (x >= s.x && x < s.x + s.w) return s.surface[Math.floor(x - s.x)];
            }
            return null;
        }

        isletAt(x) {
            return this.islets.find((s) => x >= s.x && x < s.x + s.w) || null;
        }

        pondAt(x, margin = 0) {
            return this.ponds.find((p) => x >= p.x0 - margin && x <= p.x1 + margin) || null;
        }

        nearestPond(x) {
            let best = null;
            let bestD = Infinity;
            for (const p of this.ponds) {
                const d = Math.abs((p.x0 + p.x1) / 2 - x);
                if (d < bestD) {
                    bestD = d;
                    best = p;
                }
            }
            return best;
        }

        // Perch on a named point of a nearby prop: 'sill' (the owl's hollow),
        // 'trunk' (a woodpecker's grip), 'perch' (a branch top), 'hang' (the
        // sloth's branch), 'sit' (a lily pad) or 'grip' (the end of a vine).
        // Each point takes one animal. Older layouts fall back to guessing.
        perchFor(kind, x, on = null) {
            const name = { hollow: 'sill' }[kind] || kind;
            let best = null;
            let bestD = 100;
            for (const p of this.props) {
                if (on && p.s !== on) continue;
                if (p.taken && p.taken[name]) continue;
                const f = atlas.frame(p.s, 'idle', 0);
                const pos = f && atlas.point(f, name, p.x, p.y, p.flip);
                if (!pos) continue;
                const d = Math.abs(pos.x - x);
                if (d < bestD) {
                    bestD = d;
                    best = { p, pos };
                }
            }
            if (best) {
                best.p.taken = { ...(best.p.taken || {}), [name]: true };
                const facing = { trunk: 1, trunk2: -1, hang: 1 }[name];
                return { x: best.pos.x, y: best.pos.y, dir: facing ?? (Math.random() < 0.5 ? -1 : 1), prop: best.p };
            }
            // no named point: guess from the nearest tree's size
            let tree = null;
            let treeD = Infinity;
            for (const p of this.props) {
                if (p.small) continue;
                const d = Math.abs(p.x - x);
                if (d < treeD && d < 80) {
                    treeD = d;
                    tree = p;
                }
            }
            if (!tree) {
                const s = this.surfaceAt(x);
                return { x, y: (s ?? 0) - 30, dir: 1 };
            }
            const f = atlas.frame(tree.s, 'idle', 0);
            if (kind === 'hollow' && f && f[11] && f[11].hollow) {
                return { x: tree.x - f[5] + f[11].hollow[0], y: tree.y - f[6] + f[11].hollow[1] + 4, dir: 1 };
            }
            const k = { trunk: [3, 0.4], branch: [8, 0.62], canopy: [-4, 0.8], tree: [0, 0.75] }[kind] || [0, 1];
            return { x: tree.x + k[0], y: tree.y - Math.round(tree.h * k[1]), dir: 1 };
        }

        // A pine trunk a squirrel can run up: which side, how low and how high.
        trunkFor(x, reach) {
            let best = null;
            let bestD = reach;
            for (const p of this.props) {
                const f = atlas.frame(p.s, 'idle', 0);
                if (!f || !f[11] || !f[11].trunk) continue;
                const d = Math.abs(p.x - x);
                if (d >= bestD) continue;
                const free = ['trunk', 'trunk2'].filter((n) => f[11][n] && !(p.taken && p.taken[n]));
                if (!free.length) continue;
                bestD = d;
                const side = free[Math.floor(Math.random() * free.length)];
                const grip = atlas.point(f, side, p.x, p.y, p.flip);
                const top = atlas.point(f, 'trunktop', p.x, p.y, p.flip);
                best = { x: grip.x, dir: side === 'trunk' ? 1 : -1, low: p.y - 12, high: top ? top.y : grip.y - 10 };
            }
            return best;
        }

        animalVoice(a) {
            // animals are heard when they do something special, now and then
            if (!a.onScreen || !a.sp.voice || this.pauseReasons.size) return;
            if (this.time - (this.lastVoice ?? -9) < 2.8) return;
            this.lastVoice = this.time;
            this.sound('voice', a);
        }

        // --- the gondola, Mira and Nova ------------------------------------------
        miraDo(action, dur = null) {
            this.mira.action = action;
            this.mira.t = 0;
            this.mira.frame = 0;
            this.mira.frameT = 0;
            this.mira.dur = dur ?? ({ camera: 0.36, throw: 0.36, flute: 4, bubbles: 1.2, cheer: 1.2, wave: 1.2, point: 1.5, surprised: 1.4, laugh: 1.6, sad: 2 }[action] || 1);
        }

        novaDo(action, dur = 1.2) {
            this.nova.action = action;
            this.nova.t = 0;
            this.nova.frame = 0;
            this.nova.dur = dur;
        }

        updateCharacters(dt) {
            const g = this.gondola;
            const m = this.mira;
            const suffix = g.hatGone ? '-nohat' : '';
            const name = `mira-${g.outfit}`;
            const anim = (base) => (suffix && atlas.has(name, base + suffix) ? base + suffix : base);
            m.t += dt;
            if (m.action && m.t > m.dur) m.action = null;
            if (m.action) {
                const frames = (atlas.frames(name, anim(m.action)) || [0]).length;
                const per = m.action === 'camera' || m.action === 'throw' ? m.dur / frames : m.action === 'flute' ? 0.3 : 0.2;
                m.frameT += dt;
                if (m.frameT >= per) {
                    m.frameT -= per;
                    m.frame = m.action === 'camera' || m.action === 'throw' ? Math.min(frames - 1, m.frame + 1) : (m.frame + 1) % frames;
                }
                g.miraAnim = anim(m.action);
                g.miraFrame = m.frame;
            } else {
                m.blinkIn -= dt;
                if (m.blinkIn < 0) {
                    g.miraAnim = anim('blink');
                    g.miraFrame = 0;
                    if (m.blinkIn < -0.13) m.blinkIn = 2 + Math.random() * 3;
                } else {
                    g.miraAnim = anim('idle');
                    g.miraFrame = Math.floor(this.time / 0.7) % 2;
                }
            }
            const n = this.nova;
            n.t += dt;
            if (n.action && n.t > n.dur) n.action = null;
            if (n.action) {
                const frames = (atlas.frames('nova', n.action) || [0]).length;
                g.novaAnim = n.action;
                g.novaFrame = Math.floor(n.t / 0.25) % frames;
            } else {
                n.blinkIn -= dt;
                if (n.blinkIn < 0) {
                    g.novaAnim = 'blink';
                    g.novaFrame = 0;
                    if (n.blinkIn < -0.13) n.blinkIn = 1.5 + Math.random() * 3;
                } else {
                    g.novaAnim = 'sit';
                    g.novaFrame = Math.floor(this.time / 0.9) % 2;
                }
            }
        }

        // --- main update -----------------------------------------------------------
        update(dt) {
            if (this.pauseReasons.size) dt = 0;
            this.time += dt;
            const g = this.gondola;
            for (const k of Object.keys(this.cool)) this.cool[k] = Math.max(0, this.cool[k] - dt);

            // speed: glide, slow near stops and events
            let target = g.target;
            if (this.state === 'riding' && g.x > this.stopX - 80) target = Math.max(5, g.target * clamp((this.stopX - g.x) / 80, 0, 1));
            // the lake and the ice have a fishing stop on the way
            const fishAt = this.island.fishingStop;
            const fishing = fishAt && this.state === 'riding' && !this.fished;
            if (fishing && g.x > fishAt - 70) target = Math.max(4, g.target * clamp((fishAt - g.x) / 70, 0, 1));
            if (this.state === 'stop' || this.state === 'event' || this.state === 'done') target = 0;
            if (this.slowFor > 0) {
                this.slowFor -= dt;
                target *= 0.45;
            }
            g.speed += (target - g.speed) * Math.min(1, dt * 1.6);
            g.x += g.speed * dt;
            if (fishing && g.x >= fishAt - 0.5) {
                g.x = fishAt;
                g.speed = 0;
                this.fished = true;
                this.state = 'stop';
                this.game.fishingStop(this);
            }
            if (this.state === 'riding' && g.x >= this.stopX - 0.5) {
                g.x = this.stopX;
                g.speed = 0;
                this.arrive();
            }
            const cy = this.cable.y(g.x);
            // a little bump when the grip passes over a tower wheel
            let bump = 0;
            for (const t of this.towers) {
                const d = g.x - t.x;
                if (d > -6 && d < 10) bump = Math.max(bump, Math.sin(((d + 6) / 16) * Math.PI) * 1.6);
            }
            g.y = cy + bump;

            // camera: gondola in the upper-left third, ground in the lower part
            // (the finale eases the gondola further left to make room for the tigers)
            const baseFocus = view.portrait ? 0.32 : 0.3;
            if (this.focusTo !== undefined) this.focus = lerp(this.focus ?? baseFocus, this.focusTo, Math.min(1, dt * 1.2));
            const focusX = this.focus ?? baseFocus;
            const groundFrac = view.portrait ? 0.6 : 0.74;
            const wantX = g.x - view.w * focusX;
            const wantY = cy + 104 - view.h * groundFrac;
            this.camX = wantX;
            this.camY += (wantY - this.camY) * Math.min(1, dt * 2.5 || 1);
            if (!this.camReady) {
                this.camY = wantY;
                this.camReady = true;
            }

            // Mira and Nova talk about what they pass
            for (const rm of this.island.remarks || []) {
                if (this.state !== 'riding' || this.remarksDone.has(rm) || g.x < rm.at) continue;
                this.remarksDone.add(rm);
                rm.lines.forEach(([who, text], i) => this.game.later(0.3 + i * 3.2, () => this.say(who, text, 3)));
            }
            this.updateCharacters(dt);
            this.updateEvents(dt);
            this.updateTools(dt);
            for (const a of this.animals) {
                a.update(dt, this.time);
                const sx = a.x - this.camX;
                a.onScreen = sx > -60 && sx < view.w + 60;
            }
            this.updateWeather(dt);
            fx.update(dt);
            this.flash = Math.max(0, this.flash - dt * 3.5);
        }

        start() {
            this.state = 'riding';
            this.game.ui.banner(this.island.name, this.island.tagline, this.index);
            const lines = this.island.intro || [];
            lines.forEach(([who, text], i) => {
                this.game.later(2.6 + i * 3.4, () => this.say(who, text, 3.1));
            });
            if (this.index === 0 && !MS.store.data.album.rabbit) {
                this.game.later(9.5, () => this.game.ui.hint(this.game.input.mode === 'keys' ? C.HINTS.snapKeys : C.HINTS.snap, 5));
            }
            const tool = this.island.startTool;
            const d = MS.store.data;
            if (tool && !d.tools.includes(tool)) {
                this.game.later(1.2, () => this.game.unlockTool(tool, true));
            }
            // explain a tool the first time it can be used
            d.seenTools = d.seenTools || [];
            if (tool && !d.seenTools.includes(tool)) d.seenTools.push(tool);
            const fresh = d.tools.filter((t) => C.TOOLS[t] && C.TOOLS[t].hint && !d.seenTools.includes(t));
            fresh.forEach((t, i) => {
                d.seenTools.push(t);
                this.game.later(7 + i * 7, () => {
                    this.game.ui.hint(`${C.TOOLS[t].icon} ${C.TOOLS[t].hint}`, 6, 'reward');
                    this.game.audio.sfx('twinkle');
                });
            });
            MS.store.save();
        }

        arrive() {
            if (this.state !== 'riding') return;
            this.state = 'stop';
            const mamma = this.island.mamma;
            if (mamma && mamma.finale) {
                // the reunion plays once; later visits just end at the Star Tiger
                if (MS.store.data.finished) this.game.finishIsland(this);
                else this.game.finaleFromRide(this);
                return;
            }
            for (const m of [this.mammaAnimal, ...this.mammaExtras]) {
                if (!m) continue;
                m.dir = m.x > this.gondola.x ? -1 : 1;
                m.lookT = 999;
            }
            this.novaDo('look', 99);
            this.game.mammaScene(this, mamma ? mamma.lines : []);
        }

        say(who, text, time = 3) {
            this.game.ui.say(who, text, time, () => this.speakerPos(who));
        }

        speakerPos(who) {
            const g = this.gondola;
            if (who === 'nova' && g.novaScreen) return { x: g.novaScreen.x, y: g.novaScreen.y - 14 };
            if (who === 'mira' && g.miraScreen) return { x: g.miraScreen.x, y: g.miraScreen.y - 32 };
            const a = this.animals.find((o) => o.sp.id === who && o.isMamma) || this.animals.find((o) => o.sp.id === who && o.onScreen);
            if (a) return { x: a.x - this.camX, y: a.headY() - this.camY - 6 };
            return { x: view.w * 0.5, y: view.h * 0.3 };
        }

        // --- scripted moments ------------------------------------------------------
        updateEvents(dt) {
            const g = this.gondola;
            for (const ev of this.island.events || []) {
                if (this.eventsDone.has(ev.id)) continue;
                if (g.x >= ev.at) {
                    this.eventsDone.add(ev.id);
                    this.runEvent(ev.id);
                }
            }
            if (this.eventUpdate) this.eventUpdate(dt);
        }

        runEvent(id) {
            const g = this.gondola;
            if (id === 'giraffeLick') {
                const gir = this.animals.find((a) => a.event === 'giraffeLick');
                if (!gir) return;
                gir.dir = -1;
                gir.target = undefined;
                this.state = 'event';
                let t = 0;
                let licked = false;
                this.eventUpdate = (dt) => {
                    t += dt;
                    // the giraffe strolls to the gondola and licks the window
                    const want = g.x + 34;
                    if (!licked) {
                        gir.dir = want > gir.x ? 1 : -1;
                        if (Math.abs(want - gir.x) > 2) {
                            if (gir.state !== 'move') gir.setState('move', 99);
                            gir.x += Math.sign(want - gir.x) * Math.min(Math.abs(want - gir.x), 26 * dt);
                            gir.place();
                        } else {
                            licked = true;
                            gir.dir = -1;
                            gir.front = true;
                            gir.setState('event', 3.2);
                            t = 0;
                            this.miraDo('laugh', 2.4);
                            this.novaDo('happy', 2.4);
                            this.sound('lick');
                            this.say('mira', 'Hihi! Giraffen slickar på fönstret!', 3);
                        }
                    } else if (t > 3.4) {
                        gir.front = false;
                        this.eventUpdate = null;
                        this.state = 'riding';
                    }
                };
            } else if (id === 'monkeyHat') {
                const monkey = this.animals.find((a) => a.event === 'monkeyHat');
                if (!monkey) return;
                const canThrow = MS.store.data.tools.includes('apple');
                const [theHat, myHat] = (C.OUTFITS[g.outfit] && C.OUTFITS[g.outfit].hat) || ['hatten', 'Min hatt'];
                // somewhere dry for the monkey to stand
                const dry = (x) => {
                    for (let d = 0; d < 200; d += 4) {
                        if (monkey.canStand(x + d)) return x + d;
                        if (monkey.canStand(x - d)) return x - d;
                    }
                    return x;
                };
                let phase = 'jump';
                let t = 0;
                const start = { x: monkey.x, y: monkey.y };
                this.eventUpdate = (dt) => {
                    t += dt;
                    if (phase === 'jump') {
                        // leap onto the gondola roof
                        const p = Math.min(1, t / 0.8);
                        const tx = g.x + 4;
                        const ty = g.y + 12;
                        monkey.x = lerp(start.x, tx, p);
                        monkey.y = lerp(start.y, ty, p) - Math.sin(p * Math.PI) * 30;
                        monkey.fixedY = monkey.y;
                        monkey.dir = 1;
                        monkey.front = true;
                        if (monkey.state !== 'move') monkey.setState('move', 99);
                        if (p >= 1) {
                            phase = 'grab';
                            t = 0;
                            g.hatGone = true;
                            monkey.carry = `hat-${g.outfit}`;
                            this.miraDo('surprised', 1.6);
                            this.sound('pop');
                            this.say('mira', `Hallå! ${myHat}!`, 2.4);
                        }
                    } else if (phase === 'grab') {
                        monkey.x = g.x + 4;
                        monkey.fixedY = g.y + 12;
                        monkey.y = monkey.fixedY;
                        if (t > 0.7) {
                            phase = 'run';
                            t = 0;
                            monkey.setState('event', 99);
                            this.game.ui.hint(canThrow ? C.HINTS.monkey.replace('{hat}', theHat) : `Apan snodde ${theHat}!`, 5);
                            this.slowFor = 30;
                        }
                    } else if (phase === 'run') {
                        // runs ahead and teases from the ground, hat held high
                        const target = dry(g.x + 90);
                        const ground = this.surfaceAt(target) ?? 0;
                        const p = Math.min(1, t / 1.2);
                        monkey.x = lerp(g.x + 4, target, p);
                        monkey.fixedY = lerp(g.y + 12, ground, p) - Math.sin(p * Math.PI) * 18;
                        monkey.y = monkey.fixedY;
                        if (p >= 1) {
                            monkey.fixedY = null;
                            monkey.front = false;
                            monkey.place();
                            phase = 'tease';
                            t = 0;
                        }
                    } else if (phase === 'tease') {
                        // stay a little ahead of the gondola until an apple lands close by
                        const want = g.x + 70;
                        if (Math.abs(want - monkey.x) > 3 && monkey.canStand(want) && monkey.canStand(monkey.x + Math.sign(want - monkey.x) * 3)) {
                            monkey.x += Math.sign(want - monkey.x) * Math.min(Math.abs(want - monkey.x), 30 * dt);
                            monkey.place();
                        }
                        monkey.dir = -1;
                        if (monkey.state !== 'event') monkey.setState('event', 99);
                        const apple = this.apples.find((a) => !a.gone && a.landed && Math.abs(a.x - monkey.x) < 46);
                        if (apple || t > (canThrow ? 16 : 6)) {
                            if (apple) {
                                apple.gone = true;
                                monkey.eatingApple = true;
                            }
                            phase = 'return';
                            t = 0;
                            monkey.carry = null;
                            monkey.setState('eat', 3);
                            this.hatFlight = { t: 0, from: { x: monkey.x, y: monkey.headY() - 6 } };
                            this.sound('munch', monkey);
                        }
                    } else if (phase === 'return') {
                        const hf = this.hatFlight;
                        hf.t += dt;
                        if (hf.t > 0.9) {
                            g.hatGone = false;
                            this.hatFlight = null;
                            this.slowFor = 0;
                            this.miraDo('cheer', 1.4);
                            this.novaDo('happy', 1.4);
                            this.say('mira', 'Tack, apan!', 2.2);
                            this.sound('cheer');
                            this.eventUpdate = null;
                        }
                    }
                };
            } else if (id === 'whaleBreach') {
                const whale = this.animals.find((a) => a.event === 'whaleBreach');
                if (!whale) return;
                whale.x = g.x + 110;
                whale.hiddenUntil = 0;
                whale.setState('event', 2.8);
                whale.front = false;
                this.slowFor = 4;
                this.miraDo('surprised', 1.2);
                this.game.later(1.3, () => {
                    this.miraDo('cheer', 1.4);
                    this.novaDo('happy', 1.4);
                });
                this.game.later(0.5, () => this.say('nova', 'En VAL!', 2));
                this.sound('splash', whale);
                this.game.later(1.6, () => {
                    this.sound('splash', whale);
                    fx.burst('drop', whale.x, whale.y - 2, 26, { speed: 90, spread: 1.8, gravity: 160, life: 1.1 });
                });
            }
        }

        discoverSecret(animal) {
            const id = animal.sp.id;
            if (this.secrets.has(id)) return;
            this.secrets.add(id);
            this.game.ui.hint(`Hemlighet: ${animal.sp.name}!`, 2.2, 'secret');
            this.sound('secret');
        }

        // --- tools -------------------------------------------------------------------
        useTool(tool, vx, vy) {
            const g = this.gondola;
            if (this.state === 'done' || this.pauseReasons.size) return;
            if (tool === 'camera') {
                if (this.cool.camera > 0) return;
                this.cool.camera = 0.42;
                this.snaps.push({ x: vx, y: vy });
                this.miraDo('camera');
                this.sound('shutter');
            } else if (tool === 'apple') {
                if (this.cool.apple > 0) return;
                this.cool.apple = 0.55;
                this.miraDo('throw');
                const from = g.miraScreen ? { x: g.miraScreen.x + this.camX + 6, y: g.miraScreen.y + this.camY - 22 } : { x: g.x, y: g.y + 20 };
                const tx = vx + this.camX;
                const ty = vy + this.camY;
                this.apples.push({ x: from.x, y: from.y, from, to: { x: tx, y: ty }, t: 0, dur: 0.55 + Math.min(0.5, Math.hypot(tx - from.x, ty - from.y) / 400), landed: false, gone: false, age: 0 });
                this.sound('throw');
            } else if (tool === 'flute') {
                if (this.cool.flute > 0) return;
                this.cool.flute = 4.6;
                this.fluteT = 4;
                this.miraDo('flute', 4);
                this.novaDo('happy', 4);
                this.game.audio.playFlute(this.island.music);
                for (const a of this.animals) {
                    if (a.onScreen) a.hearMusic();
                }
            } else if (tool === 'bubbles') {
                if (this.cool.bubbles > 0) return;
                this.cool.bubbles = 2.6;
                this.miraDo('bubbles', 1.2);
                const origin = g.miraScreen ? { x: g.miraScreen.x + this.camX + 10, y: g.miraScreen.y + this.camY - 26 } : { x: g.x, y: g.y + 20 };
                for (let i = 0; i < 7; i += 1) {
                    this.bubbles.push({
                        x: origin.x,
                        y: origin.y,
                        vx: 18 + Math.random() * 30 + g.speed * 0.4,
                        vy: 6 + Math.random() * 16,
                        r: 2 + Math.floor(Math.random() * 3),
                        t: 0,
                        life: 5 + Math.random() * 2.5,
                        delay: i * 0.12,
                        seed: Math.random() * 10
                    });
                }
                this.sound('bubbles');
            }
        }

        updateTools(dt) {
            this.fluteT = Math.max(0, this.fluteT - dt);
            if (this.fluteT > 0 && Math.random() < dt * 5 && this.gondola.miraScreen) {
                const f = this.gondola.miraScreen;
                fx.spawn(Math.random() < 0.5 ? 'note' : 'note2', f.x + this.camX + 12, f.y + this.camY - 22, { vx: 10 + Math.random() * 12, vy: -12 - Math.random() * 10, life: 1.4, wobble: 3 });
                // animals scrolling into view join the dance
                for (const a of this.animals) if (a.onScreen && a.danceT <= 0 && a.state !== 'sleep') a.hearMusic();
            }
            // apples fly in an arc, land, and wait to be eaten
            for (const a of this.apples) {
                a.age += dt;
                if (!a.landed) {
                    a.t += dt;
                    const p = Math.min(1, a.t / a.dur);
                    a.x = lerp(a.from.x, a.to.x, p);
                    a.y = lerp(a.from.y, a.to.y, p) - Math.sin(p * Math.PI) * 26;
                    if (p >= 1) {
                        // fall straight down onto whatever is below
                        const ground = this.surfaceAt(a.x);
                        const pond = this.pondAt(a.x, 0);
                        const floor = pond ? pond.y : ground;
                        if (floor === null) {
                            a.vy = (a.vy || 0) + 300 * dt;
                            a.y += a.vy * dt;
                            if (a.y > 400) a.gone = true;
                            continue;
                        }
                        if (a.y < floor - 1) {
                            a.vy = (a.vy || 20) + 300 * dt;
                            a.y = Math.min(floor, a.y + a.vy * dt);
                            if (a.y < floor) continue;
                        }
                        a.y = floor;
                        a.landed = true;
                        a.onWater = !!pond;
                        this.sound(pond ? 'plop' : 'thud');
                        if (pond) fx.burst('drop', a.x, a.y, 6, { speed: 30, gravity: 120, life: 0.5 });
                        else fx.burst('dust', a.x, a.y, 4, { speed: 18, gravity: 40, life: 0.4 });
                        // who wants it? the nearest hungry animals
                        const fans = this.animals
                            .filter((o) => Math.abs(o.x - a.x) < 110 && (o.state !== 'hidden' || o.sp.hidden === 'apple'))
                            .sort((p1, p2) => Math.abs(p1.x - a.x) - Math.abs(p2.x - a.x));
                        for (const o of fans) {
                            if (o.state === 'hidden' && o.sp.hidden === 'apple' && Math.abs(o.x - a.x) < 90) {
                                o.hidden = false;
                                o.setState('idle', 0.2);
                                this.discoverSecret(o);
                            }
                        }
                        for (const o of fans) {
                            if (o.seeApple(a)) break;
                        }
                    }
                } else if (a.age > 12) {
                    a.gone = true;
                }
            }
            this.apples = this.apples.filter((a) => !a.gone);
            // bubbles drift and pop
            for (const b of this.bubbles) {
                b.t += dt;
                if (b.t < b.delay) continue;
                const tt = b.t - b.delay;
                b.x += (b.vx * Math.max(0.2, 1 - tt * 0.3)) * dt;
                b.y += (Math.sin(tt * 2 + b.seed) * 8 + b.vy * (tt < 1 ? 1 : -0.25)) * dt;
                const ground = this.surfaceAt(b.x);
                if (ground !== null && b.y > ground - 4) b.y = ground - 4;
                if (tt > b.life) b.pop = true;
                for (const a of this.animals) {
                    // a bubble anywhere near a hidden chameleon's body gives it away
                    if (a.state === 'hidden' && a.sp.hidden === 'bubbles' && Math.abs(a.x - b.x) < 30 && b.y > a.y - 46 && b.y < a.y + 14) {
                        a.hidden = false;
                        if (a.sp.found && atlas.has(a.sp.found)) a.sprite = a.sp.found;
                        a.setState('special', 1.4);
                        this.discoverSecret(a);
                        b.pop = true;
                    } else if (!a.hidden && a.state !== 'sleep' && Math.abs(a.x - b.x) < 24 && Math.abs(a.headY() - b.y) < 26) {
                        a.seeBubble();
                        if (Math.abs(a.x - b.x) < 8 && Math.random() < dt * 3) b.pop = true;
                    }
                }
                if (b.pop && !b.popped) {
                    b.popped = true;
                    fx.burst('sparkleSmall', b.x, b.y, 3, { speed: 14, gravity: 0, life: 0.4 });
                    this.sound('bubblePop');
                }
            }
            this.bubbles = this.bubbles.filter((b) => !b.popped);
        }

        // --- weather & ambience ------------------------------------------------------
        updateWeather(dt) {
            const w = this.weather;
            const x0 = this.camX;
            const y0 = this.camY;
            const spawn = (rate, fn) => {
                const n = rate * dt * (fx.reduced ? 0.4 : 1);
                for (let i = 0; i < Math.floor(n) + (Math.random() < n % 1 ? 1 : 0); i += 1) fn();
            };
            if (w === 'petals') spawn(5, () => fx.spawn('petal', x0 + Math.random() * view.w * 1.4, y0 - 4, { vx: -12 - Math.random() * 10, vy: 12 + Math.random() * 8, life: 7, wobble: 4, fade: false, layer: 2 }));
            if (w === 'leaves') spawn(4, () => fx.spawn('leaf', x0 + Math.random() * view.w * 1.4, y0 - 4, { vx: -10 - Math.random() * 12, vy: 14 + Math.random() * 10, life: 7, wobble: 5, fade: false, layer: 2 }));
            if (w === 'snow') spawn(26, () => fx.spawn(Math.random() < 0.3 ? 'snow' : 'crumb', x0 + Math.random() * view.w * 1.3, y0 - 4, { vx: -8 - Math.random() * 8, vy: 14 + Math.random() * 12, life: 9, wobble: 3, fade: false, layer: 2 }));
            if (w === 'rain') spawn(60, () => fx.spawn('drop', x0 + Math.random() * view.w * 1.3, y0 - 4, { vx: -24, vy: 150 + Math.random() * 40, life: 2.2, fade: false, layer: 2 }));
            if (w === 'dust') spawn(4, () => fx.spawn('crumb', x0 + Math.random() * view.w, y0 + view.h * (0.3 + Math.random() * 0.6), { vx: -6, vy: -2, life: 5, wobble: 3, layer: 2 }));
            if (w === 'sparkles') spawn(5, () => {
                const p = this.ponds[Math.floor(Math.random() * this.ponds.length)];
                if (p && p.x1 > x0 && p.x0 < x0 + view.w) fx.spawn('sparkleSmall', p.x0 + Math.random() * (p.x1 - p.x0), p.y + 1 + Math.random() * 3, { life: 0.6, layer: 1 });
            });
            if (w === 'fireflies') spawn(3, () => fx.spawn('sparkleSmall', x0 + Math.random() * view.w, y0 + view.h * (0.3 + Math.random() * 0.6), { vx: (Math.random() - 0.5) * 6, vy: -4, life: 3, wobble: 4, blink: true, layer: 2 }));
        }

        // --- drawing ------------------------------------------------------------------
        render(g) {
            const camX = Math.round(this.camX);
            const camY = Math.round(this.camY);
            const t = this.time;
            const night = this.island.light === 'night';
            this.backdrop.draw(g, camX, camY, t, view);
            if (this.aurora) this.aurora.draw(g, view, t, camX, 1);
            this.drawLight(g, 'back');

            // islets (with their waterfalls)
            for (const s of this.islets) {
                const sx = s.x - camX;
                if (sx > view.w || sx + s.w < 0) continue;
                W.drawFalls(g, s, camX, camY, t);
                g.drawImage(s.canvas, Math.round(sx), Math.round(-s.top - camY));
            }
            // water behind the swimmers
            for (const p of this.ponds) {
                if (p.x1 - camX < 0 || p.x0 - camX > view.w) continue;
                this.drawPondBack(g, p, camX, camY);
            }

            // pylons
            for (const tw of this.towers) {
                const sx = tw.x - camX;
                if (sx < -30 || sx > view.w + 30) continue;
                W.drawPylon(g, tw, camX, camY, tw.ground ?? this.surfaceAt(tw.x) ?? 0, t, night);
            }

            // props and animals, back to front
            const items = [];
            for (const p of this.props) {
                const sx = p.x - camX;
                if (sx < -80 || sx > view.w + 80) continue;
                items.push({ z: p.lane * 1000 + p.y, prop: p });
            }
            for (const a of this.animals) {
                if (!a.onScreen || a.front || a.submerged > 0) continue;
                if (a.hidden && a.state === 'hidden' && !atlas.has(a.sprite, 'peek')) continue;
                items.push({ z: (a.sp.kind === 'flyer' || a.sp.kind === 'floater' ? 3000 : a.fixedY !== null && a.sp.kind !== 'ground' ? 500 : 1000 + (a.lane - 1) * 0.5) + a.y, animal: a });
            }
            items.sort((a, b) => a.z - b.z);
            for (const it of items) {
                if (it.prop) this.drawProp(g, it.prop, camX, camY, t);
                else this.drawAnimal(g, it.animal, camX, camY);
            }
            // water in front (so swimmers sit in the water)
            for (const p of this.ponds) {
                if (p.x1 - camX < 0 || p.x0 - camX > view.w) continue;
                this.drawPondFront(g, p, camX, camY, t);
            }
            // apples on the ground and in the air
            for (const a of this.apples) {
                if (a.gone) continue;
                g.drawImage(MS.PIX.apple, Math.round(a.x - camX - 2), Math.round(a.y - camY - 5 + (a.onWater ? 2 : 0)));
            }

            // moonlight: the land and animals turn blue-violet, the sky stays clear
            if (night) {
                this.drawNightTint(g);
                for (const s of this.islets) {
                    for (const gl of s.glints) {
                        const gx = gl.x - camX;
                        if (gx > -10 && gx < view.w + 10 && Math.sin(t * 2 + gl.x) > 0.3) W.drawGlow(g, gx, gl.y - camY, 5, gl.color, 0.7);
                    }
                }
            }

            // cable and gondola
            this.cable.draw(g, camX, camY, view, t, night);
            W.drawGondola(g, this.gondola.x, this.gondola.y, camX, camY, this.gondola, t);
            // animals that come right up to the gondola
            for (const a of this.animals) if (a.front && a.onScreen) this.drawAnimal(g, a, camX, camY);
            if (this.hatFlight) {
                const hf = this.hatFlight;
                const p = Math.min(1, hf.t / 0.9);
                const to = this.gondola.miraScreen ? { x: this.gondola.miraScreen.x + camX, y: this.gondola.miraScreen.y + camY - 30 } : { x: this.gondola.x, y: this.gondola.y };
                const hx = lerp(hf.from.x, to.x, p);
                const hy = lerp(hf.from.y, to.y, p) - Math.sin(p * Math.PI) * 30;
                atlas.draw(g, `hat-${this.gondola.outfit}`, 'idle', 0, hx - camX, hy - camY);
            }

            // bubbles
            for (const b of this.bubbles) {
                if (b.t < b.delay) continue;
                this.drawBubble(g, b.x - camX, b.y - camY, b.r, t + b.seed);
            }
            fx.draw(g, camX, camY, 1);
            fx.draw(g, camX, camY, 2);
            this.drawLight(g, 'front');

            // photos are taken here: the picture is the world without the UI
            if (this.snaps.length) {
                for (const s of this.snaps) this.takePhoto(g, s.x, s.y);
                this.snaps.length = 0;
            }

            // viewfinder
            if (this.cursor.visible && this.state !== 'done') this.drawViewfinder(g, this.cursor.x, this.cursor.y, this.armed === 'apple');
            if (this.flash > 0) {
                g.globalAlpha = Math.min(1, this.flash) * 0.85;
                g.fillStyle = '#ffffff';
                g.fillRect(this.flashRect.x, this.flashRect.y, this.flashRect.w, this.flashRect.h);
                g.globalAlpha = 1;
            }
        }

        drawLight(g, layer) {
            const light = this.island.light;
            const t = this.time;
            if (layer === 'back' && light === 'rays') {
                // soft sunbeams slanting down from the top-left
                g.save();
                g.globalCompositeOperation = 'lighter';
                for (let i = 0; i < 5; i += 1) {
                    const x = ((i * 97 + t * 3 - this.camX * 0.05) % (view.w + 120)) - 60;
                    g.globalAlpha = 0.05 + 0.03 * Math.sin(t * 0.7 + i);
                    g.fillStyle = '#fff2c4';
                    g.beginPath();
                    g.moveTo(x, 0);
                    g.lineTo(x + 18, 0);
                    g.lineTo(x + 18 + view.h * 0.6, view.h);
                    g.lineTo(x + view.h * 0.6 - 10, view.h);
                    g.closePath();
                    g.fill();
                }
                g.restore();
            }
            if (layer === 'front' && light === 'mist') {
                g.save();
                for (let i = 0; i < 3; i += 1) {
                    const y = view.h * (0.45 + i * 0.16) + Math.sin(t * 0.3 + i) * 4;
                    g.globalAlpha = 0.12;
                    g.fillStyle = '#e8fff4';
                    const off = ((t * (6 + i * 3) - this.camX * (0.2 + i * 0.1)) % 200 + 200) % 200;
                    for (let x = -off; x < view.w; x += 200) {
                        g.beginPath();
                        g.ellipse(x + 100, y, 120, 7 + i * 2, 0, 0, TAU);
                        g.fill();
                    }
                }
                g.restore();
            }
            if (layer === 'front' && (light === 'night' || light === 'sunset')) {
                // a gentle vignette
                const v = this.vignette || (this.vignette = this.makeVignette(light));
                if (v.w !== view.w || v.h !== view.h) this.vignette = this.makeVignette(light);
                g.drawImage(this.vignette.canvas, 0, 0);
            }
        }

        drawNightTint(g) {
            if (!this.nightGrad || this.nightGrad.h !== view.h) {
                const grad = g.createLinearGradient(0, 0, 0, view.h);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.35, '#e4e6ff');
                grad.addColorStop(0.6, '#a9b0e6');
                grad.addColorStop(1, '#8c90d4');
                this.nightGrad = { grad, h: view.h };
            }
            g.save();
            g.globalCompositeOperation = 'multiply';
            g.fillStyle = this.nightGrad.grad;
            g.fillRect(0, 0, view.w, view.h);
            g.restore();
        }

        makeVignette(light) {
            const c = makeCanvas(view.w, view.h);
            const g = c.getContext('2d');
            const img = g.createImageData(view.w, view.h);
            const col = light === 'night' ? [8, 6, 30] : [60, 20, 60];
            const strength = light === 'night' ? 0.55 : 0.3;
            for (let y = 0; y < view.h; y += 1) {
                for (let x = 0; x < view.w; x += 1) {
                    const dx = (x / view.w - 0.5) * 2;
                    const dy = (y / view.h - 0.5) * 2;
                    const d = Math.max(0, Math.hypot(dx * 0.9, dy) - 0.75) / 0.6;
                    const a = Math.min(1, d) * strength;
                    if (a <= MS.util.dither(x, y) * 0.5) continue;
                    const i = (y * view.w + x) * 4;
                    img.data[i] = col[0];
                    img.data[i + 1] = col[1];
                    img.data[i + 2] = col[2];
                    img.data[i + 3] = Math.round(a * 255);
                }
            }
            g.putImageData(img, 0, 0);
            return { canvas: c, w: view.w, h: view.h };
        }

        drawPondBack(g, p, camX, camY) {
            const col = this.isletAt(p.x0 + 1).style.water;
            const x0 = Math.round(p.x0 - camX);
            const x1 = Math.round(p.x1 - camX);
            const y = Math.round(p.y - camY);
            g.fillStyle = col.deep;
            for (let x = x0; x <= x1; x += 1) {
                const d = p.depthAt(x + camX);
                g.fillRect(x, y + 1, 1, d);
            }
        }

        drawPondFront(g, p, camX, camY, t) {
            const col = this.isletAt(p.x0 + 1).style.water;
            const x0 = Math.round(p.x0 - camX);
            const x1 = Math.round(p.x1 - camX);
            const y = Math.round(p.y - camY);
            g.globalAlpha = 0.72;
            g.fillStyle = col.mid;
            for (let x = x0; x <= x1; x += 1) {
                const d = p.depthAt(x + camX);
                g.fillRect(x, y + 1, 1, Math.max(1, d - 1));
            }
            g.globalAlpha = 1;
            g.fillStyle = col.light;
            g.fillRect(x0, y, x1 - x0 + 1, 1);
            g.fillStyle = col.foam;
            for (let x = x0 + 2; x < x1 - 1; x += 1) {
                const wx = x + camX;
                const wave = Math.sin(wx * 0.35 + t * 2.2) + Math.sin(wx * 0.13 - t * 1.3);
                if (wave > 1.5) g.fillRect(x, y + 2 + (Math.floor(wx + t * 3) % 3 === 0 ? 1 : 0), 2, 1);
            }
        }

        drawProp(g, p, camX, camY, t) {
            const frames = p.frames || 1;
            const i = frames > 1 ? Math.floor(t * 1.6 + p.phase) % frames : 0;
            const f = atlas.draw(g, p.s, 'idle', i, p.x - camX, p.y - camY, p.flip);
            // a cosy cottage has smoke curling up from its chimney
            if (f && f[11] && f[11].chimney && !this.pauseReasons.size && Math.random() < 0.05) {
                const c = atlas.point(f, 'chimney', p.x, p.y, p.flip);
                fx.spawn('smoke', c.x, c.y - 1, { vx: -4 - Math.random() * 3, vy: -9 - Math.random() * 4, life: 2.6, wobble: 2, fade: true, layer: 1 });
            }
        }

        drawAnimal(g, a, camX, camY) {
            let anim = a.anim;
            let frame = a.frame;
            if (a.blinkT > 0 && (anim === 'idle' || anim === 'swim' || anim === 'float') && atlas.has(a.sprite, 'blink') && a.state !== 'sleep') {
                anim = 'blink';
                frame = 0;
            }
            const x = a.x - camX;
            // a peeking fox shows only its head over the bush
            const peek = a.state === 'hidden' && anim === 'peek' ? -3 : 0;
            const y = a.y - camY + a.hop + a.bounce + peek;
            const flip = a.dir < 0;
            let alpha = 1;
            if (a.state === 'hidden' && a.sp.hidden === 'bubbles') alpha = 0.18;
            const f = atlas.draw(g, a.sprite, anim, frame, x, y, flip, alpha);
            a.box = f ? atlas.box(f, x, y, flip) : null;
            a.drawnFrame = f;
            if (a.carry && f) {
                const pt = atlas.point(f, 'carry', x, y, flip) || { x, y: y - 16 };
                atlas.draw(g, a.carry, 'idle', 0, pt.x, pt.y);
            }
            if (a.state === 'sleep' && Math.floor(this.time * 1.2 + a.seed) % 3 === 0) {
                g.drawImage(MS.PIX.zz, Math.round(x + 4), Math.round(a.headY() - camY - 10 - (this.time * 4 % 4)));
            }
        }

        drawBubble(g, x, y, r, t) {
            x = Math.round(x);
            y = Math.round(y);
            g.globalAlpha = 0.85;
            g.strokeStyle = '#d8f6ff';
            g.fillStyle = '#b8ecff33';
            g.beginPath();
            g.arc(x + 0.5, y + 0.5, r, 0, TAU);
            g.fill();
            g.lineWidth = 1;
            g.stroke();
            g.fillStyle = '#ffffff';
            g.fillRect(x - Math.ceil(r / 2), y - Math.ceil(r / 2), 1, 1);
            const hue = ['#ffb8f0', '#b8fff0', '#fff6b8'][Math.floor(t * 2) % 3];
            g.fillStyle = hue;
            g.fillRect(x + Math.floor(r / 2), y + Math.floor(r / 2) - 1, 1, 1);
            g.globalAlpha = 1;
        }

        drawViewfinder(g, cx, cy, apple) {
            const w = FRAME_W;
            const h = FRAME_H;
            const r = this.frameRect(cx, cy);
            const col = apple ? '#ff8a8a' : '#ffffff';
            g.fillStyle = col;
            const L = 8;
            const corners = [[r.x, r.y, 1, 1], [r.x + r.w - 1, r.y, -1, 1], [r.x, r.y + r.h - 1, 1, -1], [r.x + r.w - 1, r.y + r.h - 1, -1, -1]];
            if (apple) {
                g.drawImage(MS.PIX.apple, Math.round(cx - 2), Math.round(cy - 3));
                g.fillRect(Math.round(cx) - 6, Math.round(cy) + 4, 13, 1);
                return;
            }
            for (const [x, y, dx, dy] of corners) {
                g.fillRect(dx > 0 ? x : x - L + 1, y, L, 1);
                g.fillRect(x, dy > 0 ? y : y - L + 1, 1, L);
            }
            g.fillRect(Math.round(cx) - 2, Math.round(cy), 5, 1);
            g.fillRect(Math.round(cx), Math.round(cy) - 2, 1, 5);
            void w;
            void h;
        }

        frameRect(cx, cy) {
            const w = Math.min(FRAME_W, view.w - 4);
            const h = Math.min(FRAME_H, view.h - 4);
            const x = clamp(Math.round(cx - w / 2), 0, view.w - w);
            const y = clamp(Math.round(cy - h / 2), 0, view.h - h);
            return { x, y, w, h };
        }

        // --- photos -----------------------------------------------------------------------
        takePhoto(g, cx, cy) {
            const rect = this.frameRect(cx, cy);
            const shot = makeCanvas(rect.w, rect.h);
            shot.getContext('2d').drawImage(g.canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
            this.flash = 1;
            this.flashRect = rect;
            const result = this.judge(rect);
            result.canvas = shot;
            result.rect = rect;
            this.photos.push(result);
            if (this.photos.length > 60) this.photos.shift();
            this.game.photoTaken(this, result);
            // animals notice the camera
            for (const a of this.animals) {
                if (a.box && overlap(a.box, rect) > 0.2) a.flashed();
            }
        }

        judge(rect) {
            const cands = [];
            const consider = (who, box, moment, extra = {}) => {
                if (!box || box.w <= 0 || box.h <= 0) return;
                const area = box.w * box.h;
                const vis = overlap(box, rect);
                if (vis < 0.34) return;
                const bcx = box.x + box.w / 2;
                const bcy = box.y + box.h / 2;
                const dx = (bcx - (rect.x + rect.w / 2)) / (rect.w / 2);
                const dy = (bcy - (rect.y + rect.h / 2)) / (rect.h / 2);
                const centre = clamp(1 - Math.hypot(dx, dy) / 1.25, 0, 1);
                const big = clamp(Math.sqrt(area) / 22, 0.35, 1);
                const mom = C.MOMENTS[moment] || C.MOMENTS.plain;
                const score = 50 * vis + 30 * centre + 12 * big + mom.stars * 30;
                cands.push({ who, sp: who.sp || C.SPECIES_BY_ID.nova, box, vis, centre, moment, score, ...extra });
            };
            for (const a of this.animals) {
                if (!a.onScreen || !a.box) continue;
                if (a.state === 'hidden') continue;
                consider(a, a.box, a.moment());
            }
            // Nova can be photographed too
            const gs = this.gondola;
            if (gs.novaScreen) {
                const nf = atlas.frame('nova', gs.novaAnim, gs.novaFrame);
                if (nf) {
                    const box = atlas.box(nf, gs.novaScreen.x, gs.novaScreen.y);
                    const happy = gs.novaAnim === 'happy' || gs.novaAnim === 'eat';
                    consider({ sp: C.SPECIES_BY_ID.nova, isNova: true }, box, happy ? 'special' : 'plain');
                }
            }
            if (!cands.length) return { subject: null, stars: 0 };
            cands.sort((a, b) => b.score - a.score);
            const best = cands[0];
            // friends and family in the same picture
            const famId = best.sp.family || best.sp.id;
            const friends = cands.filter((c) => c !== best && ((c.sp.family || c.sp.id) === famId || c.sp.follows === best.sp.id || best.sp.follows === c.sp.id)).length;
            let moment = best.moment;
            if (moment === 'plain' && friends > 0) moment = 'family';
            const mom = C.MOMENTS[moment] || C.MOMENTS.plain;
            let stars = 1;
            if (mom.stars >= 1) stars += 1;
            if (mom.stars >= 2 || (mom.stars >= 1 && best.vis > 0.95 && best.centre > 0.55)) stars += 1;
            stars = clamp(stars, 1, 3);
            const special = best.who && best.who.specialLabel ? best.who.specialLabel() : best.sp.special && best.sp.special.label;
            return { subject: best.sp, animal: best.who, stars, moment, label: moment === 'special' ? special || mom.label : mom.label };
        }

        // --- sounds (the audio module decides how each sounds) ----------------------------
        sound(name, from) {
            let pan = 0;
            if (from && typeof from.x === 'number') pan = clamp(((from.x - this.camX) / view.w - 0.5) * 1.4, -1, 1);
            this.game.audio.sfx(name, { pan, voice: from && from.sp ? from.sp.voice : null });
        }

        // --- input ---------------------------------------------------------------------------
        tap(vx, vy) {
            if (this.state === 'done') return;
            if (this.armed === 'apple') {
                this.useTool('apple', vx, vy);
                this.armed = null;
                this.game.ui.setArmed(null);
                return;
            }
            this.useTool('camera', vx, vy);
        }

        dispose() {
            fx.reset();
        }
    }

    function overlap(box, rect) {
        const x0 = Math.max(box.x, rect.x);
        const y0 = Math.max(box.y, rect.y);
        const x1 = Math.min(box.x + box.w, rect.x + rect.w);
        const y1 = Math.min(box.y + box.h, rect.y + rect.h);
        if (x1 <= x0 || y1 <= y0) return 0;
        return ((x1 - x0) * (y1 - y0)) / (box.w * box.h);
    }

    MS.Ride = Ride;
    MS.Animal = Animal;
    MS.ride = { FRAME_W, FRAME_H, CABLE_Y, overlap };
    void easeOut;
})();
