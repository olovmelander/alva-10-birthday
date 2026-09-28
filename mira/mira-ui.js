/*
 * MIRAS STJÄRNSAFARI – interface and controller
 * ---------------------------------------------------------------------
 * Builds the game's own overlay (it needs nothing in index.html besides
 * the button and the loader), runs the frame loop, routes input and moves
 * the story along: prologue → seven islands → finale → epilogue.
 */
(function () {
    'use strict';

    const MS = window.MiraSafari;
    const { clamp } = MS.util;
    const { atlas, view, fx, store, audio } = MS;
    const C = MS.content;

    const el = (tag, cls, html) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html !== undefined) n.innerHTML = html;
        return n;
    };

    const ISLAND_ICONS = ['🌼', '🍄', '🦢', '🦒', '🐒', '❄️', '⭐'];
    const ISLAND_STARS = ['a-rabbit', 'a-moose', 'a-swan', 'a-giraffe', 'a-monkey', 'a-polarbear', 'a-startiger'];
    const STAR = '★';
    const NO_STAR = '☆';

    // =====================================================================
    // DOM
    // =====================================================================
    const ui = {
        root: null,

        build() {
            if (this.root) return;
            const root = el('div', 'mira-ui');
            root.id = 'mira-ui';
            root.setAttribute('aria-hidden', 'true');
            root.innerHTML = `
                <canvas class="mira-canvas" aria-label="Miras Stjärnsafari"></canvas>
                <div class="mira-hud">
                    <div class="mira-hud-top">
                        <div class="mira-where"><span class="mira-where-icon"></span><span class="mira-where-name"></span><span class="mira-where-bar"><i></i></span></div>
                        <button class="mira-round mira-album-btn" type="button" aria-label="Albumet">📖<b class="mira-album-count">0</b></button>
                        <button class="mira-round mira-pause-btn" type="button" aria-label="Paus">❚❚</button>
                    </div>
                    <div class="mira-tools">
                        <button class="mira-tool" data-tool="camera" type="button" aria-label="Kamera">📷<kbd>1</kbd></button>
                        <button class="mira-tool" data-tool="apple" type="button" aria-label="Äpple">🍎<kbd>2</kbd><i class="mira-cool"></i></button>
                        <button class="mira-tool" data-tool="flute" type="button" aria-label="Flöjt">🎵<kbd>3</kbd><i class="mira-cool"></i></button>
                        <button class="mira-tool" data-tool="bubbles" type="button" aria-label="Såpbubblor">🫧<kbd>4</kbd><i class="mira-cool"></i></button>
                    </div>
                </div>
                <div class="mira-says"></div>
                <div class="mira-polaroids"></div>
                <div class="mira-banner"><small></small><strong></strong><span></span></div>
                <div class="mira-hint" role="status"></div>
                <div class="mira-dialog" hidden>
                    <canvas class="mira-dialog-face" width="40" height="40"></canvas>
                    <div class="mira-dialog-body"><b class="mira-dialog-name"></b><p class="mira-dialog-text"></p></div>
                    <span class="mira-dialog-more">▼</span>
                </div>
                <div class="mira-caption" hidden><p></p><span class="mira-dialog-more">▼</span></div>
                <div class="mira-panels"></div>
                <div class="mira-loading"><div class="mira-spinner"></div><p>Gondolen kommer…</p></div>
            `;
            document.body.appendChild(root);
            this.root = root;
            const $ = (s) => root.querySelector(s);
            this.canvas = $('.mira-canvas');
            this.hud = $('.mira-hud');
            this.whereIcon = $('.mira-where-icon');
            this.whereName = $('.mira-where-name');
            this.whereBar = $('.mira-where-bar i');
            this.albumCount = $('.mira-album-count');
            this.albumBtn = $('.mira-album-btn');
            this.pauseBtn = $('.mira-pause-btn');
            this.tools = Array.from(root.querySelectorAll('.mira-tool'));
            this.says = $('.mira-says');
            this.polaroids = $('.mira-polaroids');
            this.bannerEl = $('.mira-banner');
            this.hintEl = $('.mira-hint');
            this.dialogEl = $('.mira-dialog');
            this.dialogFace = $('.mira-dialog-face');
            this.dialogName = $('.mira-dialog-name');
            this.dialogText = $('.mira-dialog-text');
            this.captionEl = $('.mira-caption');
            this.panels = $('.mira-panels');
            this.loadingEl = $('.mira-loading');
        },

        showHud(on) {
            this.hud.classList.toggle('is-on', on);
        },

        setWhere(index, progress) {
            const isl = C.ISLANDS[index];
            if (!isl) return;
            this.whereIcon.textContent = ISLAND_ICONS[index];
            this.whereName.textContent = isl.name;
            this.whereBar.style.transform = `scaleX(${clamp(progress, 0, 1).toFixed(3)})`;
        },

        refreshTools() {
            const owned = store.data.tools;
            for (const b of this.tools) {
                const t = b.dataset.tool;
                b.hidden = t !== 'camera' && !owned.includes(t);
            }
        },

        setArmed(tool) {
            for (const b of this.tools) b.classList.toggle('is-armed', b.dataset.tool === tool);
        },

        setCooldowns(cool) {
            for (const b of this.tools) {
                const t = b.dataset.tool;
                const max = { apple: 0.55, flute: 4.6, bubbles: 2.6 }[t];
                if (!max) continue;
                const v = clamp((cool[t] || 0) / max, 0, 1);
                b.style.setProperty('--cool', v.toFixed(3));
                b.classList.toggle('is-cooling', v > 0.02);
            }
        },

        refreshAlbumCount() {
            const n = Object.keys(store.data.album).length + Object.keys(store.data.fish).length;
            this.albumCount.textContent = n;
        },

        // --- banner, hints, speech -----------------------------------------------
        banner(title, tagline, index) {
            const b = this.bannerEl;
            b.querySelector('small').textContent = index >= 0 ? `Ö ${index + 1} av ${C.ISLANDS.length}` : '';
            b.querySelector('strong').textContent = title;
            b.querySelector('span').textContent = tagline || '';
            b.classList.remove('is-on');
            void b.offsetWidth;
            b.classList.add('is-on');
        },

        hint(text, time = 3, kind = '') {
            const h = this.hintEl;
            h.textContent = text;
            h.className = `mira-hint is-on ${kind ? `is-${kind}` : ''}`;
            clearTimeout(this.hintTimer);
            this.hintTimer = setTimeout(() => h.classList.remove('is-on'), time * 1000);
        },

        say(who, text, time, posFn) {
            // one bubble at a time: a new line ends the one before it
            for (const it of this.sayItems || []) it.until = Math.min(it.until, performance.now());
            const b = el('div', `mira-say is-${who}`);
            b.innerHTML = `<b>${C.NAMES[who] || (C.SPECIES_BY_ID[who] && C.SPECIES_BY_ID[who].name) || ''}</b>${text}`;
            this.says.appendChild(b);
            const item = { el: b, posFn, until: performance.now() + time * 1000 };
            (this.sayItems ||= []).push(item);
            this.placeSay(item);
            requestAnimationFrame(() => b.classList.add('is-on'));
        },

        placeSay(item) {
            const p = item.posFn ? item.posFn() : { x: view.w / 2, y: view.h / 3 };
            const css = view.toCss(p.x, p.y);
            const w = item.el.offsetWidth || 160;
            const x = clamp(css.x - w / 2, 8, window.innerWidth - w - 8);
            item.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(css.y - item.el.offsetHeight - 10)}px)`;
            item.el.style.setProperty('--tail', `${clamp(css.x - x, 14, w - 14)}px`);
        },

        updateSays() {
            if (!this.sayItems) return;
            const now = performance.now();
            for (const it of this.sayItems) {
                if (now > it.until) {
                    it.el.classList.remove('is-on');
                    it.dead = true;
                    setTimeout(() => it.el.remove(), 400);
                } else {
                    this.placeSay(it);
                }
            }
            this.sayItems = this.sayItems.filter((i) => !i.dead);
        },

        clearSays() {
            for (const it of this.sayItems || []) it.el.remove();
            this.sayItems = [];
        },

        // Between screens: no leftover speech bubbles, polaroids or hints.
        clearTransient() {
            this.clearSays();
            this.polaroids.replaceChildren();
            this.hintEl.classList.remove('is-on');
            clearTimeout(this.hintTimer);
        },

        // --- dialogue box (story and "is it my mum?") ------------------------------
        dialog(lines, done, { onLine } = {}) {
            this.dialogQueue = lines.slice();
            this.dialogDone = done;
            this.dialogOnLine = onLine;
            this.nextLine();
        },

        nextLine() {
            if (this.typing) {
                // first tap completes the sentence
                this.typing = null;
                this.dialogText.textContent = this.currentText;
                return;
            }
            const line = this.dialogQueue && this.dialogQueue.shift();
            if (!line) {
                this.dialogEl.hidden = true;
                this.captionEl.hidden = true;
                const done = this.dialogDone;
                this.dialogDone = null;
                this.dialogQueue = null;
                if (done) done();
                return;
            }
            if (this.dialogOnLine) this.dialogOnLine(line);
            if (Array.isArray(line)) {
                const [who, text] = line;
                this.captionEl.hidden = true;
                this.dialogEl.hidden = false;
                this.dialogEl.className = `mira-dialog is-${who}`;
                this.dialogName.textContent = C.NAMES[who] || (C.SPECIES_BY_ID[who] && C.SPECIES_BY_ID[who].name) || '';
                this.paintFace(who);
                this.type(this.dialogText, text);
                game.audio.sfx('voice', { voice: who === 'nova' ? 'meow' : who === 'mira' || who === 'alva' || who === 'pappa' ? null : (C.SPECIES_BY_ID[who] || {}).voice });
            } else if (line.caption) {
                this.dialogEl.hidden = true;
                this.captionEl.hidden = false;
                this.type(this.captionEl.querySelector('p'), line.caption);
            } else {
                // an action line without text: continue straight away
                this.nextLine();
            }
        },

        type(node, text) {
            this.currentText = text;
            node.textContent = '';
            let i = 0;
            const tick = () => {
                if (this.typing !== tick) return;
                i += 1;
                node.textContent = text.slice(0, i);
                if (i < text.length) setTimeout(tick, 22);
                else this.typing = null;
            };
            this.typing = tick;
            tick();
        },

        paintFace(who) {
            const c = this.dialogFace;
            const g = c.getContext('2d');
            g.imageSmoothingEnabled = false;
            g.clearRect(0, 0, c.width, c.height);
            const sprite = who === 'mira' ? `mira-${store.data.outfit}` : who === 'nova' ? 'nova' : who === 'alva' || who === 'pappa' ? who : (C.SPECIES_BY_ID[who] || {}).sprite;
            const anim = who === 'nova' ? 'sit' : atlas.has(sprite, 'look') ? 'look' : 'idle';
            const f = atlas.frame(sprite, anim, 0);
            if (!f) return;
            const bx = f[7];
            const by = f[8];
            const bw = f[9];
            const bh = f[10];
            const head = f[11] && f[11].head;
            if (head && bw > 30) {
                // a big animal: frame its face, found from the head point
                const size = 20;
                const sx = f[1] + clamp(head[0] - size / 2, 0, f[3] - size);
                const sy = f[2] + clamp(head[1], 0, f[4] - size);
                g.drawImage(atlas.images[f[0]], sx, sy, size, size, 0, 0, size * 2, size * 2);
                return;
            }
            // fit the upper part (the face) into the box
            const size = Math.min(bw, 30);
            const sx = f[1] + bx + Math.max(0, Math.floor((bw - size) / 2));
            const sy = f[2] + by;
            const s = Math.max(1, Math.floor(c.width / Math.max(size, Math.min(bh, size))));
            g.drawImage(atlas.images[f[0]], sx, sy, size, Math.min(bh, size), (c.width - size * s) / 2, 2, size * s, Math.min(bh, size) * s);
        },

        dialogOpen() {
            return !!this.dialogQueue;
        },

        // --- polaroids --------------------------------------------------------------
        // Small feedback for an ordinary repeat photo: the name and stars float up.
        mini(result) {
            const m = el('div', 'mira-mini');
            const stars = result.subject ? STAR.repeat(result.stars) + NO_STAR.repeat(3 - result.stars) : '';
            m.innerHTML = result.subject ? `${result.subject.name} <span class="mira-stars">${stars}</span>` : 'Inget djur…';
            const css = view.toCss(result.rect.x + result.rect.w / 2, result.rect.y + result.rect.h / 2);
            m.style.left = `${Math.round(css.x)}px`;
            m.style.top = `${Math.round(css.y)}px`;
            this.polaroids.appendChild(m);
            setTimeout(() => m.remove(), 1300);
        },

        polaroid(result) {
            // never more than two big polaroids at once
            const open = this.polaroids.querySelectorAll('.mira-polaroid:not(.is-away)');
            if (open.length >= 2) open[0].remove();
            const p = el('div', 'mira-polaroid');
            const shot = result.canvas;
            const img = document.createElement('canvas');
            img.width = shot.width;
            img.height = shot.height;
            img.getContext('2d').drawImage(shot, 0, 0);
            p.appendChild(img);
            const cap = el('div', 'mira-polaroid-cap');
            if (result.subject) {
                const stars = STAR.repeat(result.stars) + NO_STAR.repeat(3 - result.stars);
                cap.innerHTML = `<b>${result.subject.name}</b><span class="mira-stars">${stars}</span>${result.stars >= 2 ? `<em>${result.label}</em>` : ''}`;
            } else {
                cap.innerHTML = '<b>Hoppsan!</b><em>Inget djur på bilden</em>';
            }
            p.appendChild(cap);
            if (result.isNew) p.appendChild(el('span', 'mira-new', 'NY!'));
            if (result.improved && !result.isNew) p.appendChild(el('span', 'mira-new is-better', 'BÄTTRE!'));
            const css = view.toCss(result.rect.x + result.rect.w / 2, result.rect.y + result.rect.h / 2);
            p.style.left = `${Math.round(css.x)}px`;
            p.style.top = `${Math.round(css.y)}px`;
            this.polaroids.appendChild(p);
            const tilt = (Math.random() - 0.5) * 10;
            p.style.setProperty('--tilt', `${tilt.toFixed(1)}deg`);
            requestAnimationFrame(() => p.classList.add('is-on'));
            // then it flies into the album
            setTimeout(() => {
                const target = this.albumBtn.getBoundingClientRect();
                p.style.setProperty('--fly-x', `${Math.round(target.left + target.width / 2 - css.x)}px`);
                p.style.setProperty('--fly-y', `${Math.round(target.top + target.height / 2 - css.y)}px`);
                p.classList.add('is-away');
                setTimeout(() => {
                    p.remove();
                    this.albumBtn.classList.remove('is-bump');
                    void this.albumBtn.offsetWidth;
                    this.albumBtn.classList.add('is-bump');
                }, 650);
            }, result.isNew ? 2300 : 1500);
        },

        // --- panels -------------------------------------------------------------------
        panel(html, cls = '') {
            this.closePanel();
            const p = el('div', `mira-panel ${cls}`, html);
            this.panels.appendChild(p);
            this.panels.classList.add('is-on');
            this.current = p;
            const first = p.querySelector('button:not([hidden])');
            if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
            return p;
        },

        closePanel() {
            this.panels.classList.remove('is-on');
            this.panels.replaceChildren();
            this.current = null;
        },

        on(panel, sel, fn) {
            const b = panel.querySelector(sel);
            if (b) b.addEventListener('click', (e) => {
                e.stopPropagation();
                game.audio.sfx('ui');
                fn(e);
            });
        }
    };

    // =====================================================================
    // Controller
    // =====================================================================
    const game = {
        state: 'closed',
        scene: null,
        ride: null,
        timers: [],
        time: 0,
        paused: false,
        audio,
        ui,
        input: { mode: 'touch', keys: new Set() },

        base() {
            const s = document.querySelector('script[src*="mira-core.js"]');
            if (s) return s.src.replace(/mira-core\.js.*$/, '');
            return 'mira/';
        },

        open() {
            if (this.state !== 'closed') return;
            this.state = 'loading';
            ui.build();
            if (!this.bound) this.bind();
            store.load();
            audio.sfxOn = store.data.sfx !== false;
            audio.musicOn = store.data.music !== false;
            audio.enterGame();
            audio.setMusic(audio.musicOn);
            audio.setSfx(audio.sfxOn);
            this.input.mode = window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'keys';
            fx.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            ui.root.classList.add('is-open');
            ui.root.setAttribute('aria-hidden', 'false');
            ui.loadingEl.classList.add('is-on');
            document.documentElement.classList.add('mira-lock');
            const mario = document.getElementById('mario-content');
            if (mario) mario.style.display = 'none';
            if (typeof setSceneRenderPaused === 'function') setSceneRenderPaused(true);
            view.init(ui.canvas);
            MS.buildPixels();
            atlas.load(this.base()).then(() => {
                if (this.state !== 'loading') return;
                ui.loadingEl.classList.remove('is-on');
                ui.refreshTools();
                ui.refreshAlbumCount();
                this.showTitle();
                this.last = performance.now();
                cancelAnimationFrame(this.raf);
                this.raf = requestAnimationFrame((t) => this.frame(t));
            }).catch((error) => {
                ui.loadingEl.querySelector('p').textContent = 'Gondolen fastnade… Försök igen.';
                console.error(error);
                setTimeout(() => this.close(), 2500);
            });
        },

        close() {
            if (this.state === 'closed') return;
            this.state = 'closed';
            cancelAnimationFrame(this.raf);
            if (this.scene && this.scene.dispose) this.scene.dispose();
            this.scene = null;
            this.ride = null;
            this.timers = [];
            ui.closePanel();
            ui.clearSays();
            ui.dialogEl.hidden = true;
            ui.captionEl.hidden = true;
            ui.dialogQueue = null;
            ui.showHud(false);
            ui.root.classList.remove('is-open');
            ui.root.setAttribute('aria-hidden', 'true');
            document.documentElement.classList.remove('mira-lock');
            audio.leaveGame();
            store.save();
            const mario = document.getElementById('mario-content');
            if (mario) mario.style.display = '';
            if (typeof setSceneRenderPaused === 'function') setSceneRenderPaused(false);
            const btn = document.getElementById('play-mira-btn');
            if (btn) btn.focus({ preventScroll: true });
        },

        later(sec, fn) {
            this.timers.push({ t: sec, fn });
        },

        // --- frame loop -----------------------------------------------------------
        frame(now) {
            if (this.state === 'closed') return;
            this.raf = requestAnimationFrame((t) => this.frame(t));
            let dt = (now - this.last) / 1000;
            this.last = now;
            if (!(dt > 0)) dt = 0;
            this.tick(Math.min(dt, 0.066));
        },

        // One step of the game (also used by tests to fast-forward).
        tick(dt, draw = true) {
            const frozen = this.paused || ui.panels.classList.contains('is-on') && this.scene && this.scene.freezeOnPanel;
            if (!frozen) {
                this.time += dt;
                for (const tm of this.timers) tm.t -= dt;
                const due = this.timers.filter((tm) => tm.t <= 0);
                this.timers = this.timers.filter((tm) => tm.t > 0);
                due.forEach((tm) => tm.fn());
                if (this.scene) this.scene.update(dt);
            }
            if (this.scene && draw) {
                this.scene.render(view.g);
                if (this.scene === this.ride) {
                    const r = this.ride;
                    ui.setWhere(r.index, (r.gondola.x + 150) / (r.stopX + 150));
                    ui.setCooldowns(r.cool);
                }
            }
            ui.updateSays();
            this.updateKeysCursor(dt);
        },

        // --- input ----------------------------------------------------------------
        bind() {
            this.bound = true;
            const root = ui.root;
            const canvas = ui.canvas;
            canvas.addEventListener('pointerdown', (e) => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                e.preventDefault();
                audio.resume();
                this.input.mode = e.pointerType === 'mouse' ? 'mouse' : 'touch';
                if (ui.dialogOpen()) {
                    ui.nextLine();
                    return;
                }
                const p = view.toView(e.clientX, e.clientY);
                if (this.scene && this.scene.tap) this.scene.tap(p.x, p.y, e);
            });
            canvas.addEventListener('pointermove', (e) => {
                if (e.pointerType !== 'mouse') return;
                const p = view.toView(e.clientX, e.clientY);
                if (this.scene && this.scene.hover) this.scene.hover(p.x, p.y);
            });
            canvas.addEventListener('pointerup', (e) => {
                const p = view.toView(e.clientX, e.clientY);
                if (this.scene && this.scene.release) this.scene.release(p.x, p.y, e);
            });
            canvas.addEventListener('pointerleave', () => {
                if (this.ride) this.ride.cursor.visible = false;
            });
            ui.dialogEl.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                ui.nextLine();
            });
            ui.captionEl.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                ui.nextLine();
            });
            root.addEventListener('contextmenu', (e) => e.preventDefault());
            ui.pauseBtn.addEventListener('click', () => this.pause());
            ui.albumBtn.addEventListener('click', () => this.openAlbum());
            for (const b of ui.tools) {
                b.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toolButton(b.dataset.tool);
                });
            }
            window.addEventListener('keydown', (e) => this.keyDown(e));
            window.addEventListener('keyup', (e) => {
                this.input.keys.delete(e.code);
                if (this.scene && this.scene.keyUp) this.scene.keyUp(e);
            });
            window.addEventListener('resize', () => {
                if (this.state === 'closed' || !view.canvas) return;
                view.resize();
                if (this.scene && this.scene.resize) this.scene.resize();
            });
            document.addEventListener('visibilitychange', () => {
                if (this.state === 'closed') return;
                if (document.hidden) {
                    this.autoPause();
                    if (audio.ctx && audio.ctx.state === 'running') audio.ctx.suspend().catch(() => {});
                } else {
                    audio.resume();
                }
            });
            window.addEventListener('blur', () => this.autoPause());
            window.addEventListener('pagehide', () => store.save());
        },

        toolButton(tool) {
            const r = this.ride;
            if (!r || this.scene !== r) return;
            audio.resume();
            if (tool === 'camera') {
                r.armed = null;
                ui.setArmed(null);
                if (this.input.mode !== 'touch') r.useTool('camera', r.cursor.x, r.cursor.y);
                else ui.hint(C.HINTS.snap, 2);
            } else if (tool === 'apple') {
                if (this.input.mode === 'keys') {
                    r.useTool('apple', r.cursor.x, r.cursor.y);
                } else {
                    r.armed = r.armed === 'apple' ? null : 'apple';
                    ui.setArmed(r.armed);
                    if (r.armed && !this.appleHinted) {
                        this.appleHinted = true;
                        ui.hint('Tryck där äpplet ska landa!', 2.4);
                    }
                }
            } else {
                r.useTool(tool);
            }
        },

        keyDown(e) {
            if (this.state === 'closed' || this.state === 'loading') return;
            const code = e.code;
            if (ui.dialogOpen() && ['Space', 'Enter', 'NumpadEnter'].includes(code)) {
                e.preventDefault();
                if (!e.repeat) ui.nextLine();
                return;
            }
            if (ui.current) {
                if (code === 'Escape' && this.paused) {
                    e.preventDefault();
                    this.resume();
                }
                return;  // buttons handle Enter/Space themselves
            }
            if (code === 'Escape' || code === 'KeyP') {
                e.preventDefault();
                this.pause();
                return;
            }
            if (this.scene && this.scene.keyDown && this.scene.keyDown(e)) {
                e.preventDefault();
                return;
            }
            const r = this.ride;
            if (!r || this.scene !== r) return;
            const move = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
            if (move.includes(code)) {
                e.preventDefault();
                this.input.mode = 'keys';
                this.input.keys.add(code);
                r.cursor.visible = true;
                r.cursor.keys = true;
                return;
            }
            if (e.repeat) return;
            if (code === 'Space' || code === 'Enter') {
                e.preventDefault();
                r.cursor.visible = true;
                r.useTool(r.armed === 'apple' ? 'apple' : 'camera', r.cursor.x, r.cursor.y);
                if (r.armed) {
                    r.armed = null;
                    ui.setArmed(null);
                }
            } else if (code === 'Digit2' || code === 'KeyE') {
                if (store.data.tools.includes('apple')) r.useTool('apple', r.cursor.x, r.cursor.y);
            } else if (code === 'Digit3' || code === 'KeyF') {
                if (store.data.tools.includes('flute')) r.useTool('flute');
            } else if (code === 'Digit4' || code === 'KeyB') {
                if (store.data.tools.includes('bubbles')) r.useTool('bubbles');
            } else if (code === 'Digit1') {
                r.useTool('camera', r.cursor.x, r.cursor.y);
            }
        },

        updateKeysCursor(dt) {
            const r = this.ride;
            if (!r || this.scene !== r || !this.input.keys.size) return;
            const k = this.input.keys;
            const speed = 110;
            const dx = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
            const dy = (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0) - (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0);
            r.cursor.x = clamp(r.cursor.x + dx * speed * dt, 0, view.w);
            r.cursor.y = clamp(r.cursor.y + dy * speed * dt, 0, view.h);
        },

        // --- pausing --------------------------------------------------------------
        pause() {
            if (this.paused || !this.scene || this.scene === this.title) return;
            if (ui.current) return;
            this.paused = true;
            const p = ui.panel(`
                <h2>Paus</h2>
                <div class="mira-btns">
                    <button class="mira-btn is-go" data-a="resume" type="button">Fortsätt ▶</button>
                    <button class="mira-btn" data-a="album" type="button">Albumet 📖</button>
                    <button class="mira-btn is-small" data-a="sfx" type="button">Ljud: ${audio.sfxOn ? 'på' : 'av'}</button>
                    <button class="mira-btn is-small" data-a="music" type="button">Musik: ${audio.musicOn ? 'på' : 'av'}</button>
                    <button class="mira-btn is-small" data-a="map" type="button">Stjärnkartan</button>
                    <button class="mira-btn is-small is-quiet" data-a="quit" type="button">Avsluta spelet</button>
                </div>`, 'is-pause');
            ui.on(p, '[data-a=resume]', () => this.resume());
            ui.on(p, '[data-a=album]', () => this.openAlbum(() => this.pause()));
            ui.on(p, '[data-a=sfx]', (e) => {
                audio.setSfx(!audio.sfxOn);
                store.data.sfx = audio.sfxOn;
                store.save();
                e.target.textContent = `Ljud: ${audio.sfxOn ? 'på' : 'av'}`;
            });
            ui.on(p, '[data-a=music]', (e) => {
                audio.setMusic(!audio.musicOn);
                store.data.music = audio.musicOn;
                store.save();
                e.target.textContent = `Musik: ${audio.musicOn ? 'på' : 'av'}`;
            });
            ui.on(p, '[data-a=map]', () => {
                this.paused = false;
                this.showMap();
            });
            ui.on(p, '[data-a=quit]', () => this.close());
        },

        resume() {
            if (!this.paused) return;
            this.paused = false;
            ui.closePanel();
            this.last = performance.now();
        },

        autoPause() {
            this.input.keys.clear();
            if (this.state === 'closed') return;
            store.save();
            if (this.scene && this.scene !== this.title && !this.paused && !ui.current) this.pause();
        },

        // --- screens -----------------------------------------------------------------
        showTitle() {
            this.state = 'title';
            this.ride = null;
            ui.showHud(false);
            ui.clearTransient();
            this.title = new MS.TitleScene(this);
            this.scene = this.title;
            audio.setAmbience(null);
            audio.playSong('title');
            const d = store.data;
            const canContinue = d.started && !d.finished;
            const p = ui.panel(`
                <div class="mira-logo"><small>Ett äventyr för Mira</small><h1>Miras<br><span>Stjärnsafari</span></h1><p>En gondolresa bland djur och stjärnor</p></div>
                <div class="mira-btns">
                    <button class="mira-btn is-go" data-a="go" type="button">${canContinue ? `Fortsätt resan ▶` : d.finished ? 'Åk igen ▶' : 'Starta resan ▶'}</button>
                    ${d.started ? '<button class="mira-btn" data-a="map" type="button">Stjärnkartan 🗺️</button>' : ''}
                    ${d.started ? '<button class="mira-btn" data-a="album" type="button">Albumet 📖</button>' : ''}
                    <div class="mira-row">
                        <button class="mira-btn is-small" data-a="sfx" type="button">Ljud: ${audio.sfxOn ? 'på' : 'av'}</button>
                        <button class="mira-btn is-small" data-a="music" type="button">Musik: ${audio.musicOn ? 'på' : 'av'}</button>
                    </div>
                    <button class="mira-btn is-small is-quiet" data-a="quit" type="button">Tillbaka till biljetten</button>
                </div>`, 'is-title');
            ui.on(p, '[data-a=go]', () => {
                if (!d.started) this.startPrologue();
                else if (d.finished) this.showMap();
                else this.startIsland(Math.min(d.chapter, C.ISLANDS.length - 1));
            });
            ui.on(p, '[data-a=map]', () => this.showMap());
            ui.on(p, '[data-a=album]', () => this.openAlbum(() => this.showTitle()));
            ui.on(p, '[data-a=sfx]', (e) => {
                audio.setSfx(!audio.sfxOn);
                store.data.sfx = audio.sfxOn;
                store.save();
                e.target.textContent = `Ljud: ${audio.sfxOn ? 'på' : 'av'}`;
            });
            ui.on(p, '[data-a=music]', (e) => {
                audio.setMusic(!audio.musicOn);
                store.data.music = audio.musicOn;
                store.save();
                e.target.textContent = `Musik: ${audio.musicOn ? 'på' : 'av'}`;
            });
            ui.on(p, '[data-a=quit]', () => this.close());
        },

        startPrologue() {
            ui.closePanel();
            audio.setAmbience('birds');
            store.data.started = true;
            store.save();
            this.state = 'story';
            this.scene = new MS.StoryScene(this, 'prologue', () => this.startIsland(0));
        },

        startIsland(index, { replay = false } = {}) {
            ui.closePanel();
            ui.clearTransient();
            if (this.scene && this.scene.dispose) this.scene.dispose();
            this.state = 'ride';
            this.paused = false;
            this.timers = [];
            const ride = new MS.Ride(this, index, { replay });
            this.ride = ride;
            this.scene = ride;
            ui.refreshTools();
            ui.setArmed(null);
            ui.showHud(true);
            audio.playSong(C.ISLANDS[index].music);
            audio.setAmbience(C.ISLANDS[index].ambience);
            ride.start();
        },

        // --- photos -------------------------------------------------------------------
        photoTaken(ride, result) {
            const album = store.data.album;
            if (result.subject) {
                const id = result.subject.id;
                const entry = album[id];
                result.isNew = !entry;
                result.improved = !!entry && result.stars > entry.stars;
                if (!entry || result.stars >= entry.stars) {
                    album[id] = {
                        stars: Math.max(result.stars, entry ? entry.stars : 0),
                        photo: result.canvas.toDataURL('image/png'),
                        moments: Array.from(new Set([...(entry ? entry.moments : []), result.moment])),
                        n: (entry ? entry.n : 0) + 1
                    };
                } else {
                    entry.n += 1;
                    if (!entry.moments.includes(result.moment)) entry.moments.push(result.moment);
                }
                if (result.isNew) ride.newSpecies.add(id);
                store.save();
                ui.refreshAlbumCount();
                audio.sfx(`star${result.stars}`);
                if (result.isNew) setTimeout(() => audio.sfx('newAnimal'), 180);
                setTimeout(() => audio.sfx('voice', { voice: result.subject.voice }), 350);
                if (result.stars === 3) {
                    ride.miraDo('cheer', 1.2);
                    ride.novaDo('happy', 1.2);
                } else if (result.isNew) {
                    ride.novaDo('happy', 1);
                }
                if (!this.starsHinted && result.stars === 1 && ride.photos.length >= 4) {
                    this.starsHinted = true;
                    this.later(1.2, () => ui.hint(C.HINTS.stars, 4));
                }
            }
            if (!result.subject || result.isNew || result.improved || result.stars === 3) ui.polaroid(result);
            else ui.mini(result);
        },

        // --- end of an island ---------------------------------------------------------------
        mammaScene(ride, lines) {
            const isl = ride.island;
            ui.dialog(lines, () => this.finishIsland(ride), {
                onLine: (line) => {
                    if (!Array.isArray(line)) return;
                    const [who] = line;
                    if (who === 'nova') ride.novaDo(line[1] === '...' ? 'sad' : 'meow', 99);
                    else if (who === 'mira') ride.miraDo('point', 2.5);
                    else {
                        ride.novaDo('sad', 99);
                        const speaker = ride.animals.find((o) => o.isMamma && o.sp.id === who) || ride.mammaAnimal;
                        if (speaker) speaker.setState('special', 1.6);
                    }
                    void isl;
                }
            });
        },

        finishIsland(ride) {
            ride.state = 'done';
            const index = ride.index;
            const d = store.data;
            let reward = null;
            const story = index === d.chapter;
            if (story) {
                d.chapter = index + 1;
                reward = ride.island.reward;
                if (reward && reward.tool && !d.tools.includes(reward.tool)) d.tools.push(reward.tool);
                if (reward && reward.outfit && !d.outfits.includes(reward.outfit)) {
                    d.outfits.push(reward.outfit);
                    if (reward.wear) d.outfit = reward.outfit;
                }
            }
            store.save();
            this.showResults(ride, { story, reward });
        },

        showResults(ride, { story, reward }) {
            const isl = ride.island;
            const species = C.SPECIES.filter((s) => s.island === ride.index);
            const have = species.filter((s) => store.data.album[s.id]).length;
            const shots = ride.photos.filter((p) => p.subject);
            const best = {};
            for (const s of shots) {
                const id = s.subject.id;
                if (!best[id] || s.stars > best[id].stars) best[id] = s;
            }
            const cards = Object.values(best).sort((a, b) => (ride.newSpecies.has(b.subject.id) ? 1 : 0) - (ride.newSpecies.has(a.subject.id) ? 1 : 0) || b.stars - a.stars).slice(0, 8);
            const next = C.ISLANDS[ride.index + 1];
            const p = ui.panel(`
                <h2>${isl.name} <span class="mira-check">✔</span></h2>
                <p class="mira-sub">Du har fotat <b>${have}</b> av <b>${species.length}</b> djur här.</p>
                <div class="mira-strip"></div>
                ${reward ? `<div class="mira-reward"><b>${reward.tool || reward.outfit ? 'Nytt!' : 'Ledtråd:'}</b> ${reward.text}</div>` : ''}
                <div class="mira-btns">
                    ${story && next ? `<button class="mira-btn is-go" data-a="next" type="button">Vidare till ${next.name} ▶</button>` : ''}
                    ${reward && reward.outfit ? '<button class="mira-btn" data-a="outfit" type="button">Byt kläder 👗</button>' : ''}
                    <button class="mira-btn" data-a="again" type="button">Åk igen</button>
                    <button class="mira-btn" data-a="map" type="button">Stjärnkartan</button>
                </div>`, 'is-results');
            const strip = p.querySelector('.mira-strip');
            if (!cards.length) strip.appendChild(el('p', 'mira-empty', 'Inga kort den här gången – nästa gång!'));
            for (const s of cards) {
                const card = el('div', 'mira-card');
                const img = document.createElement('canvas');
                img.width = s.canvas.width;
                img.height = s.canvas.height;
                img.getContext('2d').drawImage(s.canvas, 0, 0);
                card.appendChild(img);
                card.appendChild(el('b', '', s.subject.name));
                card.appendChild(el('span', 'mira-stars', STAR.repeat(s.stars) + NO_STAR.repeat(3 - s.stars)));
                if (ride.newSpecies.has(s.subject.id)) card.appendChild(el('span', 'mira-new', 'NY!'));
                strip.appendChild(card);
            }
            audio.sfx(reward ? 'reward' : 'cheer');
            ui.on(p, '[data-a=next]', () => this.startIsland(ride.index + 1));
            ui.on(p, '[data-a=outfit]', () => this.showOutfits(() => this.showResults(ride, { story, reward })));
            ui.on(p, '[data-a=again]', () => this.startIsland(ride.index, { replay: true }));
            ui.on(p, '[data-a=map]', () => this.showMap());
        },

        // --- fishing -----------------------------------------------------------------------
        fishingStop(ride) {
            const d = store.data;
            const first = !Object.keys(d.fish).length && ride.index === 2;
            if (!d.tools.includes('fishing')) d.tools.push('fishing');
            ride.say('nova', first ? 'Mjau... jag är så hungrig!' : 'Ska vi fiska lite?', 2.6);
            ride.novaDo(first ? 'sad' : 'happy', 2.6);
            this.later(1.6, () => {
                const p = ui.panel(`
                    <h2>${ride.index === 5 ? 'Pimpelfiske 🎣' : 'Fiskebryggan 🎣'}</h2>
                    <p class="mira-sub">${first ? 'Nova är hungrig! Kan Mira fånga en fisk åt henne?' : 'Här nappar det bra. Vill du fiska en stund?'}</p>
                    <div class="mira-btns">
                        <button class="mira-btn is-go" data-a="fish" type="button">Fiska! 🎣</button>
                        ${first ? '' : '<button class="mira-btn" data-a="skip" type="button">Åk vidare ▶</button>'}
                    </div>`, 'is-fish');
                ui.on(p, '[data-a=fish]', () => {
                    ui.closePanel();
                    ui.clearSays();
                    this.scene = new MS.FishingScene(this, ride, {
                        where: ride.index === 5 ? 'ice' : 'lake',
                        first,
                        done: () => {
                            this.scene = ride;
                            ui.showHud(true);
                            ride.state = 'riding';
                            ride.novaDo('happy', 1.5);
                        }
                    });
                });
                ui.on(p, '[data-a=skip]', () => {
                    ui.closePanel();
                    ride.state = 'riding';
                });
            });
        },

        unlockTool(tool, card) {
            const d = store.data;
            if (!d.tools.includes(tool)) d.tools.push(tool);
            store.save();
            ui.refreshTools();
            const info = C.TOOLS[tool];
            if (card && info) {
                audio.sfx('reward');
                ui.hint(`Nytt: ${info.icon} ${info.name}! ${info.hint || ''}`, 6, 'reward');
            }
        },

        finaleFromRide(ride) {
            ui.showHud(false);
            this.state = 'story';
            const scene = new MS.StoryScene(this, 'finale', () => {
                store.data.chapter = C.ISLANDS.length;
                store.data.finished = true;
                store.save();
                this.scene = new MS.StoryScene(this, 'epilogue', () => this.showEnd());
            }, { ride });
            this.scene = scene;
        },

        showEnd() {
            ui.clearTransient();
            const animals = C.SPECIES.filter((s) => s.island >= 0);
            const total = animals.length;
            const have = animals.filter((s) => store.data.album[s.id]).length;
            audio.playSong('finale');
            const p = ui.panel(`
                <div class="mira-logo is-end"><small>Slut</small><h1>Miras<br><span>Stjärnsafari</span></h1><p>Gjord med massor av kärlek till Mira ⭐</p></div>
                <p class="mira-sub">Albumet: <b>${have}</b> av <b>${total}</b> djur. Kan du hitta alla?</p>
                <div class="mira-btns">
                    <button class="mira-btn is-go" data-a="map" type="button">Fortsätt fota ▶</button>
                    <button class="mira-btn" data-a="album" type="button">Albumet 📖</button>
                    <button class="mira-btn is-small is-quiet" data-a="quit" type="button">Tillbaka till biljetten</button>
                </div>`, 'is-title is-end');
            ui.on(p, '[data-a=map]', () => this.showMap());
            ui.on(p, '[data-a=album]', () => this.openAlbum(() => this.showEnd()));
            ui.on(p, '[data-a=quit]', () => this.close());
        },

        // --- map -------------------------------------------------------------------------
        showMap() {
            this.paused = false;
            if (this.scene && this.scene !== this.title && this.scene.dispose) this.scene.dispose();
            this.ride = null;
            ui.showHud(false);
            ui.clearTransient();
            this.title = this.title || new MS.TitleScene(this);
            this.scene = this.title;
            audio.setAmbience(null);
            audio.playSong('title');
            const d = store.data;
            const unlocked = Math.min(d.chapter, C.ISLANDS.length - 1);
            const p = ui.panel(`
                <h2>Stjärnkartan</h2>
                <div class="mira-map"></div>
                <div class="mira-btns is-row">
                    <button class="mira-btn is-small" data-a="album" type="button">Albumet 📖</button>
                    <button class="mira-btn is-small" data-a="outfit" type="button">Klädskåpet 👗</button>
                    <button class="mira-btn is-small is-quiet" data-a="back" type="button">Tillbaka</button>
                </div>`, 'is-map');
            const map = p.querySelector('.mira-map');
            C.ISLANDS.forEach((isl, i) => {
                const species = C.SPECIES.filter((s) => s.island === i);
                const have = species.filter((s) => d.album[s.id]).length;
                const stars = species.reduce((sum, s) => sum + (d.album[s.id] ? d.album[s.id].stars : 0), 0);
                const open = i <= unlocked || d.finished;
                const b = el('button', `mira-island ${open ? '' : 'is-locked'} ${i === d.chapter && !d.finished ? 'is-next' : ''}`);
                b.type = 'button';
                b.disabled = !open;
                b.style.setProperty('--sky-a', isl.sky.gradient[1]);
                b.style.setProperty('--sky-b', isl.sky.gradient[isl.sky.gradient.length - 1]);
                b.innerHTML = open
                    ? `<span class="mira-island-pic"></span><b>${isl.name}</b><small>${have}/${species.length} djur · ${stars}${STAR}</small>`
                    : `<span class="mira-island-pic"></span><b>???</b><small>Ö ${i + 1}</small>`;
                // the island's signature animal (a dark silhouette until you get there)
                const pic = atlas.toCanvas(ISLAND_STARS[i], 'idle', 0, 2) || atlas.toCanvas(ISLAND_STARS[i], 'swim', 0, 2);
                const holder = b.querySelector('.mira-island-pic');
                if (pic) {
                    if (!open) pic.classList.add('is-silhouette');
                    holder.appendChild(pic);
                } else {
                    holder.textContent = open ? ISLAND_ICONS[i] : '🔒';
                }
                if (open) b.addEventListener('click', () => {
                    audio.sfx('ui');
                    if (i === C.ISLANDS.length - 1 && !d.finished && i === d.chapter) this.startIsland(i);
                    else this.startIsland(i, { replay: i < d.chapter });
                });
                map.appendChild(b);
            });
            ui.on(p, '[data-a=album]', () => this.openAlbum(() => this.showMap()));
            ui.on(p, '[data-a=outfit]', () => this.showOutfits());
            ui.on(p, '[data-a=back]', () => this.showTitle());
        },

        showOutfits(back) {
            const d = store.data;
            const goBack = back || (() => this.showMap());
            const p = ui.panel(`
                <h2>Klädskåpet</h2>
                <p class="mira-sub">Vad ska Mira ha på sig?</p>
                <div class="mira-outfits"></div>
                <div class="mira-btns"><button class="mira-btn" data-a="back" type="button">Klar ✔</button></div>`, 'is-outfits');
            const box = p.querySelector('.mira-outfits');
            for (const [key, o] of Object.entries(C.OUTFITS)) {
                const owned = d.outfits.includes(key);
                const b = el('button', `mira-outfit ${d.outfit === key ? 'is-on' : ''} ${owned ? '' : 'is-locked'}`);
                b.type = 'button';
                b.disabled = !owned;
                const pic = atlas.toCanvas(`mira-${key}`, 'idle', 0, 3);
                if (pic && owned) b.appendChild(pic);
                else b.appendChild(el('span', 'mira-lock', '🔒'));
                b.appendChild(el('b', '', owned ? o.name : '???'));
                b.appendChild(el('small', '', owned ? o.desc : 'Hittas på resan'));
                if (owned) b.addEventListener('click', () => {
                    d.outfit = key;
                    store.save();
                    audio.sfx('ui');
                    if (this.ride) this.ride.gondola.outfit = key;
                    this.showOutfits(back);
                });
                box.appendChild(b);
            }
            ui.on(p, '[data-a=back]', goBack);
        },

        // --- album -------------------------------------------------------------------------
        openAlbum(back) {
            const wasPaused = this.paused;
            this.paused = true;
            this.albumBack = back || (() => {
                ui.closePanel();
                this.paused = wasPaused;
                this.last = performance.now();
            });
            this.albumTab = this.albumTab ?? (this.ride ? this.ride.index : 0);
            this.renderAlbum();
        },

        renderAlbum() {
            const d = store.data;
            const tabs = C.ISLANDS.map((isl, i) => `<button class="mira-tab ${this.albumTab === i ? 'is-on' : ''}" data-tab="${i}" type="button" aria-label="${isl.name}">${ISLAND_ICONS[i]}</button>`).join('') +
                `<button class="mira-tab ${this.albumTab === 'fish' ? 'is-on' : ''}" data-tab="fish" type="button" aria-label="Fiskar">🐟</button>`;
            const total = C.SPECIES.filter((s) => s.island >= 0).length + C.FISH.length;
            const have = Object.keys(d.album).filter((k) => k !== 'nova').length + Object.keys(d.fish).length;
            const title = this.albumTab === 'fish' ? 'Fiskar' : C.ISLANDS[this.albumTab].name;
            const p = ui.panel(`
                <div class="mira-album-head"><h2>Miras album</h2><span>${have} / ${total}</span><button class="mira-close" data-a="close" type="button" aria-label="Stäng">✕</button></div>
                <div class="mira-tabs">${tabs}</div>
                <h3>${title}</h3>
                <div class="mira-grid"></div>`, 'is-album');
            const grid = p.querySelector('.mira-grid');
            const items = this.albumTab === 'fish'
                ? C.FISH.map((f) => ({ id: f.id, name: f.name, fish: f, entry: d.fish[f.id] }))
                : C.SPECIES.filter((s) => s.island === this.albumTab || (this.albumTab === 0 && s.id === 'nova')).map((s) => ({ id: s.id, name: s.name, sp: s, entry: d.album[s.id] }));
            for (const it of items) {
                const b = el('button', `mira-slot ${it.entry ? '' : 'is-unknown'}`);
                b.type = 'button';
                if (it.entry) {
                    if (it.fish) {
                        const pic = atlas.toCanvas(it.fish.sprite, 'swim', 0, 3);
                        if (pic) b.appendChild(pic);
                        b.appendChild(el('b', '', it.name));
                        b.appendChild(el('small', '', `${it.entry.best} cm`));
                    } else {
                        const img = new Image();
                        img.src = it.entry.photo || '';
                        img.alt = it.name;
                        if (it.entry.photo) b.appendChild(img);
                        else b.appendChild(atlas.toCanvas(it.sp.sprite, 'idle', 0, 2) || el('span', '', '?'));
                        b.appendChild(el('b', '', it.name));
                        b.appendChild(el('span', 'mira-stars', STAR.repeat(it.entry.stars) + NO_STAR.repeat(3 - it.entry.stars)));
                    }
                    b.addEventListener('click', () => {
                        audio.sfx('ui');
                        this.albumDetail(it);
                    });
                } else {
                    b.appendChild(el('span', 'mira-q', '?'));
                    b.appendChild(el('b', '', '???'));
                    b.disabled = true;
                }
                grid.appendChild(b);
            }
            p.querySelectorAll('[data-tab]').forEach((t) => t.addEventListener('click', () => {
                audio.sfx('ui');
                this.albumTab = t.dataset.tab === 'fish' ? 'fish' : Number(t.dataset.tab);
                this.renderAlbum();
            }));
            ui.on(p, '[data-a=close]', () => this.albumBack());
        },

        albumDetail(it) {
            const e = it.entry;
            const info = it.fish || it.sp;
            const possible = it.fish ? [] : C.momentsFor(it.sp, (s, a) => atlas.has(s, a));
            const moments = it.fish ? '' : Object.entries(C.MOMENTS).filter(([k]) => possible.includes(k)).map(([k, m]) => {
                const got = e.moments.includes(k);
                const label = k === 'special' && it.sp.special ? it.sp.special.label : m.label;
                return `<li class="${got ? 'is-got' : ''}">${got ? m.icon : '·'} ${got ? label : '???'}</li>`;
            }).join('');
            const p = ui.panel(`
                <div class="mira-album-head"><h2>${it.name}</h2><button class="mira-close" data-a="back" type="button" aria-label="Tillbaka">✕</button></div>
                <div class="mira-detail"></div>
                <p class="mira-fact">${info.fact || ''}</p>
                ${it.fish ? `<p class="mira-sub">Fångade: ${e.n} · Största: ${e.best} cm</p>` : `<ul class="mira-moments">${moments}</ul>`}
                ${it.sp && it.sp.secret && !e.moments.includes('special') ? `<p class="mira-secret">Tips: ${it.sp.secret}</p>` : ''}
                <div class="mira-btns is-row">
                    <button class="mira-btn is-small" data-a="say" type="button">🔊 Lyssna</button>
                    <button class="mira-btn is-small" data-a="back2" type="button">Tillbaka</button>
                </div>`, 'is-album is-detail');
            const box = p.querySelector('.mira-detail');
            if (it.fish) {
                const pic = atlas.toCanvas(it.fish.sprite, 'swim', 0, 6);
                if (pic) box.appendChild(pic);
            } else if (e.photo) {
                const img = new Image();
                img.src = e.photo;
                img.alt = it.name;
                box.appendChild(img);
            }
            const speak = () => {
                audio.sfx('voice', { voice: info.voice });
                speakSwedish(`${it.name}. ${info.fact || ''}`);
            };
            ui.on(p, '[data-a=say]', speak);
            ui.on(p, '[data-a=back]', () => this.renderAlbum());
            ui.on(p, '[data-a=back2]', () => this.renderAlbum());
        }
    };

    // Read names aloud with a Swedish voice, when the device has one.
    function speakSwedish(text) {
        try {
            const synth = window.speechSynthesis;
            if (!synth) return;
            synth.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'sv-SE';
            const voice = synth.getVoices().find((v) => /^sv/i.test(v.lang));
            if (voice) u.voice = voice;
            u.rate = 0.9;
            u.pitch = 1.1;
            synth.speak(u);
        } catch (error) {
            // no speech on this device – that's fine
        }
    }

    MS.ui = ui;
    MS.game = game;
    MS.open = () => game.open();
})();
