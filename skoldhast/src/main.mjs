/*
 * Sköldhästen och havet mellan sidorna – the game's entry point.
 *
 *   const game = createGame({ host: document.body, assetBase: './skoldhast/' });
 *   await game.open();      // takes over the screen (the ticket page is hidden and paused)
 *   game.pause(); game.resume();
 *   await game.close();     // idempotent: saves, frees everything, restores the page
 *
 * One scheduler: our own requestAnimationFrame loop steps the game at 120 Hz and
 * calls app.render() (plan §8.2). Host glue is guarded with typeof, like the
 * other games (the ticket page's setSceneRenderPaused, bgMusic, audioCtx).
 */
import * as PIXI from '../vendor/pixi-8.21.0.min.mjs';
import { createGame as createLogic } from './game.mjs';
import { STEP, snapshot, HL, C } from './sim.mjs';
import { createView } from './view.mjs';
import { createUI } from './ui.mjs';
import { createGuide } from './guide.mjs';
import { createInput } from './input.mjs';
import { createPressQueue } from './presses.mjs';
import { createSave, codeToChapter, CODE_RESTORE } from './save.mjs';
import { createStory } from './story.mjs';
import { createAssets } from './assets.mjs';
import { createTable } from './prologue.mjs';
import { countPencils, totalPencils, pencilProgress, createPuzzleState } from './puzzles.mjs';
import { UI, BALK, CAPTIONS, FAMILY, JOURNAL, KLO_COMPANION } from './content/sv.mjs';
import { CHECKPOINTS } from './content/world.mjs';
import { createUserCloud, cloudColor, cloudPoints } from './user-cloud.mjs';
import { createKloCompanion, normalizeKloHelpMode } from './klo-companion.mjs';
import { createKloUI } from './klo-ui.mjs';

// the art bundle each scene draws from (boot holds the hero, Klo, the table and the UI)
const SCENE_BUNDLES = { land: ['land'], kelp: ['sea', 'bay'], viken: ['bay', 'sea'] };
// the notebook's page order: going on turns the page forward, going back turns it back
const PAGE = { land: 1, kelp: 2, viken: 3 };

const DEFAULT_SETTINGS = { help: 'ask', holdGallop: false, followFinger: false, holdToHide: false, bigText: false, lessMotion: false, music: 0.8, sfx: 0.9, voice: 1 };

export function createGame({ host = document.body, assetBase = './skoldhast/', released, onClose } = {}) {
    let state = 'closed';
    let el = null, app = null, assets = null, G = null, view = null, ui = null, input = null, audio = null, story = null, table = null, guide = null;
    let raf = 0, last = 0, acc = 0, paused = false, mode = 'title';
    let glLostAt = 0, glPrompt = null;
    let audioTheme = null;
    let slot = { id: 'alva', label: UI.slotAlva };
    let settings = { ...DEFAULT_SETTINGS, lessMotion: !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches };
    let note = '';
    const saver = createSave();
    const hostState = {};
    let listeners = null;
    const debug = /[?&#]debug/.test(location.search + location.hash);
    const frameTimes = [];
    let debugEl = null;
    const presses = createPressQueue();
    let companion = null, kloUI = null, companionCamera = null, previousCamera = null, preserveHiddenAfterKlo = false;

    // --------------------------------------------------------------------------------
    // Host glue
    // --------------------------------------------------------------------------------
    function pageMusic() { try { return typeof bgMusic !== 'undefined' ? bgMusic : null; } catch { return null; } } // eslint-disable-line no-undef
    function pageAudioCtx() { try { return typeof audioCtx !== 'undefined' ? audioCtx : null; } catch { return null; } } // eslint-disable-line no-undef
    // the page's own functions may throw (e.g. if its 3D scene never started); the game must open anyway
    function hostPause(on) {
        try { if (typeof setSceneRenderPaused === 'function') setSceneRenderPaused(on); } catch (err) { console.warn('Sköldhästen: page pause', err); } // eslint-disable-line no-undef
    }
    function takeHost() {
        hostState.focus = document.activeElement;
        const mario = document.getElementById('mario-content');
        if (mario) mario.style.display = 'none';
        hostPause(true);
        const m = pageMusic();
        hostState.musicWasPlaying = !!(m && !m.paused);
        try { m?.pause(); } catch { /* ignore */ }
        document.documentElement.classList.add('skoldhast-lock');
        hostState.scrollY = window.scrollY;
    }
    function restoreHost() {
        // like the other games: the ticket page comes back with display = ''
        const mario = document.getElementById('mario-content');
        if (mario) mario.style.display = '';
        hostPause(false);
        const m = pageMusic();
        if (m && hostState.musicWasPlaying) m.play().catch(() => {});
        document.documentElement.classList.remove('skoldhast-lock');
        if (typeof hostState.scrollY === 'number') window.scrollTo(0, hostState.scrollY);
        const btn = document.getElementById('play-skoldhast-btn');
        (btn || hostState.focus)?.focus?.({ preventScroll: true });
        try { onClose?.(); } catch { /* the page's own business */ }
    }

    // --------------------------------------------------------------------------------
    // Open
    // --------------------------------------------------------------------------------
    async function open() {
        if (closing) await closing;
        if (state !== 'closed') return;
        state = 'opening';
        paused = false; acc = 0; presses.clear();
        listeners = new AbortController();
        try {
            await openInner();
        } catch (err) {
            // never leave the page half-taken: free everything so a retry starts clean
            console.error('Sköldhästen: open failed', err);
            await close();
            throw err;
        }
    }
    async function openInner() {
        takeHost();
        el = document.createElement('div');
        el.className = 'sk-root';
        host.appendChild(el);
        try {
            app = new PIXI.Application();
            const { w, h, res } = sizes();
            await app.init({ preference: ['webgl'], width: w, height: h, resolution: res, autoDensity: true, antialias: false, autoStart: false, backgroundColor: 0xfbf8f1, powerPreference: 'default' });
            if (app.renderer.name !== 'webgl') throw new Error('not webgl');
        } catch (err) {
            console.warn('Sköldhästen: WebGL unavailable', err);
            return showFatal(UI.noWebgl);
        }
        if (state !== 'opening') return; // closed while loading
        app.canvas.className = 'sk-canvas';
        el.appendChild(app.canvas);
        // WebGL context loss (plan §8.2): Pixi restores its textures itself; if the context has not come
        // back 2 s after the tab is visible, save and offer a clean restart behind one tap
        app.canvas.addEventListener('webglcontextlost', () => {
            glLostAt = performance.now();
            presses.clear(); input?.release();
        }, { signal: listeners.signal });
        app.canvas.addEventListener('webglcontextrestored', () => {
            glLostAt = 0;
            glPrompt?.remove(); glPrompt = null;
            last = performance.now(); acc = 0;
            presses.clear(); input?.release();
        }, { signal: listeners.signal });
        assets = createAssets(PIXI, assetBase);
        try {
            await assets.init();
            await assets.load('boot');
        } catch (err) {
            console.warn('Sköldhästen: assets', err);
            return showFatal(UI.loadFail);
        }
        if (state !== 'opening') return;
        for (const b of assets.bundles()) if (b !== 'boot') assets.load(b);

        G = createLogic({ released });
        G.helpLevel = settings.help;
        ui = createUI(el, { assetBase, handlers: uiHandlers() });
        const img = (name) => new URL(`${assetBase}assets/${name}.webp`, document.baseURI).href;
        guide = createGuide(ui.root, { img, portrait: ui.portrait, heroScreen: () => heroScreen(), onGoalTap: () => openJournal(), onDismissHelp: () => companion?.dismissHelp() });
        guide.show(false);
        const heroFactory = await loadHeroFactory();
        view = createView(PIXI, app, { assets, G, heroFactory, onFx: (name, data) => (name === 'epilogue' ? runEpilogue(data) : name === 'sfx' ? audio?.sfx(data) : null) });
        input = createInput(el, ui, {
            canvas: app.canvas,
            settings: () => settings,
            isGalloping: () => G && Math.abs(G.player.vx) >= 1000,
            isStopped: () => G && Math.abs(G.player.vx) < 20,
            gallopDefl: C.gallopDefl,
            heroHit: (x, y) => heroHit(x, y),
            kloHit: (x, y) => kloHit(x, y),
            companionOpen: () => !!companion?.suspended(),
            heroScreen: () => heroScreen(),
            onKey: (k) => {
                if (mode !== 'play') return;
                if (companion?.suspended()) { companion.close(); return; }
                // J and Esc close an open panel (the journal, the pause menu, the settings) as well as open one
                if (ui.panelOpen()) { if (k === 'pause' || k === 'journal') ui.closePanel(); return; }
                if (k === 'journal') openJournal();
                if (k === 'pause') openPause();
            }
        });
        await loadAudio();
        story = createStory(G, {
            ui, audio, guide, settings: () => settings, touch: !!window.matchMedia?.('(pointer: coarse)').matches,
            fx: async (n, d) => {
                const effectView = view;
                const scene = G.sceneId, effectPlayer = G.player;
                // The hill clue can reveal the bay before its background art
                // finishes loading. Build the vista only once that art exists.
                if (n === 'vista' && d?.scene) await sceneArt(d.scene);
                // An arrival inspection must own the completed destination
                // drawing, so a late art rebuild cannot erase its live frame.
                if (n === 'landFocus') await sceneArt(scene);
                // Match a destroyed view effect: abandon this story continuation
                // rather than running its dialogue on the closed session's UI.
                if (view !== effectView || state === 'closing' || state === 'closed') return new Promise(() => {});
                if (n === 'landFocus' && (G.sceneId !== scene || G.player !== effectPlayer)) return new Promise(() => {});
                if (n === 'landFocus' && !G.vista && (view.sceneId !== scene || !view.built(scene))) {
                    const from = view.sceneId;
                    const turn = from && from !== scene && !view.holding ? ((PAGE[scene] || 0) >= (PAGE[from] || 0) ? 'left' : 'right') : null;
                    view.setScene(scene, { turn, keepCam: from === scene });
                    audio?.setArea(G.finalRun ? 'final' : areaFor(scene));
                }
                return effectView.fx(n, d);
            }, save: () => saveNow(),
            toScreen: (x, y) => ({ x: view.world.position.x + x * view.world.scale.x, y: view.world.position.y + y * view.world.scale.y })
        });
        G.story = story;
        kloUI = createKloUI(ui.root, {
            words: KLO_COMPANION.ui, portrait: ui.portrait, lessMotion: () => settings.lessMotion,
            onCall: () => companion?.call(), onChoice: topic => companion?.choose(topic), onClose: () => companion?.close()
        });
        companion = createKloCompanion(G, {
            story, ui: kloUI, guide, audio,
            canCall: () => mode === 'play' && !paused && !G.busy && !G.vista && !G.hideActors && !story.running() && !ui.panelOpen() && !ui.dialogueOpen(),
            viewport: () => ({ cam: view.cam, width: app.screen.width, height: app.screen.height }),
            onSuspend: entrance => {
                presses.clear(); input.release(); acc = 0;
                previousCamera = G.camHint;
                if (!(entrance.tutorial && entrance.portrait)) {
                    companionCamera = { companion: { x: (G.player.x + entrance.x) / 2,
                        ground: Math.max(G.player.y, entrance.y), side: entrance.x >= G.player.x ? 'left' : 'right' } };
                    G.camHint = companionCamera;
                }
            },
            onResume: () => {
                preserveHiddenAfterKlo = !!G.player.hidden && settings.holdToHide;
                presses.clear(); input.release(); acc = 0;
                if (G.camHint === companionCamera) {
                    G.camHint = previousCamera;
                    if (G.lessMotion) view.cam.snap = true;
                }
                companionCamera = previousCamera = null;
            },
            onSave: () => saveNow()
        });
        G.companion = companion;
        table = createTable({ PIXI, app, view, G, ui, audio, assets, makeHero: () => heroFactory() });
        table.setJournalState(() => journalState());
        wireEvents();
        wireLifecycle();
        state = 'open';
        last = performance.now();
        raf = requestAnimationFrame(frame);
        showTitle();
    }

    function sizes() {
        const w = window.innerWidth, h = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        const cap = (w < 900 || h < 500) ? 1.5e6 : 2.6e6;
        const res = Math.max(1, Math.min(dpr, 2, Math.sqrt(cap / (w * h))));
        return { w, h, res };
    }

    async function loadHeroFactory() {
        let mod = null;
        try { mod = await import('./hero.mjs'); } catch (err) { console.warn('Sköldhästen: hero module missing, using a stand-in', err); }
        const rig = assets.data('hero-rig');
        const textures = {};
        for (const n of assets.frameNames()) textures[n] = assets.frame(n);
        if (mod?.createHero && rig) {
            return (o = {}) => {
                try { return mod.createHero(PIXI, { textures, rig, mini: !!o.mini }); } catch (err) { console.warn('hero', err); return standIn(o); }
            };
        }
        return standIn;
    }

    async function loadAudio() {
        try {
            const mod = await import('./audio.mjs');
            audioTheme = mod.THEME || null;
            audio = mod.createAudio({ ctx: pageAudioCtx() || undefined });
            audio.setVolumes({ music: settings.music, sfx: settings.sfx, voice: settings.voice });
            audio.ready?.catch?.(() => {});
        } catch (err) {
            console.warn('Sköldhästen: audio unavailable', err);
            audio = null;
        }
    }

    function contextGone() {
        try { saveNow(); } catch { /* keep going */ }
        glPrompt = document.createElement('button');
        glPrompt.className = 'sk-message sk-tap';
        glPrompt.type = 'button';
        glPrompt.textContent = UI.tapToGo;
        el.appendChild(glPrompt);
        glPrompt.onclick = async () => { await close(); glPrompt = null; glLostAt = 0; open(); };
    }

    function showFatal(text) {
        const box = document.createElement('div');
        box.className = 'sk-message';
        const p = document.createElement('p'); p.textContent = text;
        const again = document.createElement('button'); again.className = 'sk-pbtn primary'; again.textContent = UI.retry;
        const back = document.createElement('button'); back.className = 'sk-pbtn'; back.textContent = UI.back;
        box.append(p, again, back);
        el.appendChild(box);
        again.onclick = async () => { await close(); open(); };
        back.onclick = () => close();
        state = 'failed';
    }

    // --------------------------------------------------------------------------------
    // Title, slots, new game, continue
    // --------------------------------------------------------------------------------
    function showTitle() {
        mode = 'title';
        ui.showControls(false);
        guide?.show(false);
        if (!saver.available) ui.toast(UI.noSave, 4200);
        const lastId = saver.last();
        const slots = saver.slots();
        if (lastId) slot = { id: lastId, label: slots.find((s) => s.id === lastId)?.label || lastId };
        const loaded = saver.load(slot.id);
        const hasSave = !!loaded?.data;
        if (loaded?.data?.settings) settings = { ...DEFAULT_SETTINGS, ...loaded.data.settings };
        applySettings();
        // Both phone orientations are playable. A timed rotation note would
        // spill over the title and cover the opening's first drawing prompt.
        ui.title({
            hasSave, slots,
            onBegin: () => { resumeAudio(); newGame(); },
            onContinue: () => { resumeAudio(); continueGame(loaded.data); },
            onSwitch: (done) => ui.slotPicker(slotList(), (id) => { done(); pickSlot(id); }, (name) => { done(); newSlot(name); }),
            onCode: (text) => { const n = codeToChapter(text); if (!n) return false; resumeAudio(); restoreCode(n); return true; }
        });
        if (loaded?.corrupt) {
            ui.toast(UI.badSave, 5000);
        }
    }
    function slotList() {
        const list = saver.slots();
        if (!list.find((s) => s.id === 'alva')) list.unshift({ id: 'alva', label: UI.slotAlva });
        if (FAMILY.miraSlot && !list.find((s) => s.id === 'mira')) list.push({ id: 'mira', label: UI.slotMira });
        return list;
    }
    function pickSlot(id) {
        const s = slotList().find((q) => q.id === id);
        slot = { id, label: s?.label || id };
        const loaded = saver.load(id);
        resumeAudio();
        if (loaded?.data) continueGame(loaded.data); else newGame();
    }
    function newSlot(name) {
        const id = 'r-' + name.toLowerCase().replace(/[^a-zåäö0-9]+/g, '-').slice(0, 16);
        slot = { id, label: name };
        resumeAudio();
        newGame();
    }

    function resetLogic() {
        companion?.restore([]); preserveHiddenAfterKlo = false;
        G.flags.clear();
        G.puz = createPuzzleState();
        G.stats = { gallopTime: 0, maxSpeed: 0, leaps: 0 };
        G.userGull = null; G.userCloud = null; G.userStrokes = null; G.prints = [];
        for (const a of Object.values(G.actors)) a.visible = false;
        note = '';
    }

    /** Wait for a scene's art (they load in the background after boot; usually already here). */
    async function sceneArt(id) {
        const wanted = (SCENE_BUNDLES[id] || []).filter((b) => assets.bundles().includes(b) && !assets.loaded(b));
        if (!wanted.length) return;
        let slow = setTimeout(() => { slow = null; ui?.toast(UI.loading, 2500); }, 350);
        try { await Promise.all(wanted.map((b) => assets.load(b))); } finally { if (slow) clearTimeout(slow); }
    }

    async function newGame() {
        resetLogic();
        mode = 'table';
        ui.showControls(false);
        guide?.show(false);
        guide?.clear();
        await sceneArt('land');
        if (state !== 'open') return;
        await table.prologue();
        G.chapterFlags();
        startPlay('start');
        saveNow();
    }

    async function continueGame(data) {
        resetLogic();
        note = data.note || '';
        if (data.settings) settings = { ...DEFAULT_SETTINGS, ...data.settings };
        applySettings();
        G.restore(data);
        companion?.restore(data.companionHints);
        if (data.strokes) restoreStrokes(data.strokes);
        if (!G.flags.has('intro_done')) { newGame(); return; }
        mode = 'loading';
        await sceneArt(G.sceneId);
        if (state !== 'open') return;
        startPlay(null);
    }

    async function restoreCode(n) {
        resetLogic();
        const r = CODE_RESTORE[n];
        G.restore({ flags: r.flags, checkpoint: r.checkpoint, puz: {} });
        mode = 'loading';
        await sceneArt(G.sceneId);
        if (state !== 'open') return;
        startPlay(null);
        saveNow();
    }

    function startPlay(spot) {
        if (spot) G.goto('land', spot);
        view.setScene(G.sceneId);
        view.root.visible = true;
        mode = 'play';
        ui.showControls(true);
        audio?.freeze(false);
        audio?.setArea(areaFor(G.sceneId));
        updatePencils();
        acc = 0;
    }

    function areaFor(id) { return id === 'kelp' ? 'sea' : id === 'viken' ? 'bay' : 'land'; }

    function restoreStrokes(strokes) {
        const make = (pts, color) => {
            if (!pts?.length) return null;
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
            const pad = 12, w = Math.ceil(x1 - x0 + pad * 2), h = Math.ceil(y1 - y0 + pad * 2);
            const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2;
            const c = cv.getContext('2d'); c.scale(2, 2); c.lineCap = c.lineJoin = 'round'; c.strokeStyle = color; c.lineWidth = 4.5;
            c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x - x0 + pad, y - y0 + pad) : c.moveTo(x - x0 + pad, y - y0 + pad))); c.stroke();
            return PIXI.Texture.from(cv);
        };
        G.userStrokes = { ...strokes, cloud: cloudPoints(strokes.cloud), cloudColor: cloudColor(strokes.cloudColor) };
        G.userGull = make(strokes.gull, '#4d6e8c');
        G.userCloud = createUserCloud(PIXI, G.userStrokes.cloud, G.userStrokes.cloudColor)?.texture || null;
    }

    async function runEpilogue(opts = {}) {
        mode = 'table';
        ui.showControls(false);
        guide?.show(false);
        guide?.clear();
        await table.epilogue(opts);
        view.setScene(G.sceneId);
        view.root.visible = true;
        mode = 'play';
        ui.showControls(true);
        audio?.setArea('land');
    }

    // --------------------------------------------------------------------------------
    // Saving
    // --------------------------------------------------------------------------------
    let persistAsked = false;
    function saveNow() {
        if (!G || !G.flags.has('intro_done')) return;
        // ask once for storage the browser won't evict (a bonus, not a safeguard: plan §8.6)
        if (!persistAsked) { persistAsked = true; saver.persist(); }
        const data = G.serialize();
        saver.store(slot.id, slot.label, { ...data, settings, note, companionHints: companion?.serialize() || [], strokes: G.userStrokes || null, ended: G.flags.has('ended') });
    }

    // --------------------------------------------------------------------------------
    // The loop
    // --------------------------------------------------------------------------------
    function frame(now) {
        raf = requestAnimationFrame(frame);
        let dt = (now - last) / 1000;
        last = now;
        if (dt > 0.25) dt = 0.25;
        if (glLostAt) {
            if (document.hidden) glLostAt = now; // count from when the tab is visible again
            else if (now - glLostAt > 2000 && !glPrompt) contextGone();
            return;
        }
        if (paused || state !== 'open') { presses.clear(); input?.release(); ui?.updateSpeaker(null); if (app) app.render(); return; }
        const t0 = performance.now();
        const who = ui.panelOpen() ? null : companion?.suspended() ? 'klo' : ui.speaker() || (mode === 'play' && !G.busy && !G.vista ? guide.speaker() : null);
        G.speaker = who;
        for (const id of ['klo', 'kv']) if (G.actors[id]) {
            G.actors[id].talking = who === id;
            if (who && who !== id) G.actors[id].talkUntil = 0;
        }
        if (mode === 'play') {
            const blocked = ui.panelOpen() || ui.dialogueOpen() || companion?.suspended();
            const cont = blocked ? { x: 0, y: 0, hopHeld: false } : input.state();
            const e = input.consume();
            if (ui.dialogueOpen() && (e.act || e.hop)) ui.advance();
            if (e.tapKlo && !ui.panelOpen() && !ui.dialogueOpen()) companion.call();
            if (blocked || companion.suspended()) presses.clear(); else presses.push(e);
            let first = true;
            if (companion.suspended()) acc = 0; else acc += dt;
            if (preserveHiddenAfterKlo && (cont.hideHeld || e.hop || e.hide || e.duck)) preserveHiddenAfterKlo = false;
            let steps = 0;
            while (acc >= STEP && steps < 10) {
                const edges = first ? presses.consume() : {};
                const hideEdge = first && !blocked && (settings.holdToHide ? (edges.hide && !G.player.hidden) : edges.hide);
                // The current held state also handles release + repress between
                // frames: an older release must not cancel the new hide press.
                const hideRelease = !blocked && !preserveHiddenAfterKlo && settings.holdToHide && !cont.hideHeld;
                G.step({ x: cont.x, y: cont.y, hopHeld: cont.hopHeld, hop: first && !blocked && edges.hop,
                    act: first && !blocked && edges.act, duck: first && !blocked && edges.duck,
                    hide: hideEdge, hideRelease, tapHero: first && !blocked && (edges.tapHero || edges.neigh) });
                first = false; acc -= STEP; steps++;
            }
            if (steps >= 10) acc = 0;
            companion.tick(dt);
            if (G.sceneId !== view.sceneId && !G.vista) {
                const id = G.sceneId, from = view.sceneId;
                const turn = from && !view.holding ? ((PAGE[id] || 0) >= (PAGE[from] || 0) ? 'left' : 'right') : null;
                view.setScene(id, { turn });
                audio?.setArea(G.finalRun ? 'final' : areaFor(id));
                // art still arriving (slow network): redraw the scene when it is here
                const missing = (SCENE_BUNDLES[id] || []).filter((b) => assets.bundles().includes(b) && !assets.loaded(b));
                if (missing.length) {
                    Promise.all(missing.map((b) => assets.load(b))).then(() => {
                        if (view && G && G.sceneId === id && view.sceneId === id && !view.built(id)) view.setScene(id, { keepCam: true });
                    });
                }
            }
            G.guidance = story.guidance();
            const snap = snapshot(G.player, companion.suspended() ? 1 : acc / STEP, G.terrain, G.time);
            view.render(snap, dt);
            ui.setContext(G.context?.label, G.player.hidden, settings.holdToHide);
            const free = !ui.dialogueOpen() && !ui.panelOpen() && !G.busy && !G.vista && !companion.suspended();
            guide.show(free);
            const detailedHelp = settings.help === 'guided' || companion.markerActive();
            G.showGuidance = detailedHelp && free;
            guide.goal(detailedHelp ? G.guidance.goal : G.guidance.thread?.mission || '');
            guide.context(detailedHelp ? { ...G.guidance, requested: settings.help !== 'guided' } : null);
            guide.update();
            kloUI.availability({ visible: mode === 'play' && !ui.panelOpen() && !G.vista && !G.hideHero,
                enabled: !G.busy && !story.running() && !ui.dialogueOpen() });
            if (free && !story.running() && G.flags.has('rule_demo') && !G.flags.has('tip_callKlo')) {
                G.flag('tip_callKlo'); kloUI.pulse(); guide.tip(KLO_COMPANION.ui.callTip, { ms: 4800 });
            }
            if (audio) {
                const p = G.player;
                audio.setMotion({ speed01: companion.suspended() ? 0 : Math.min(1, Math.abs(p.vx) / 1200), underwater: p.mode === 'swim' && p.submerge > 0.7, hidden: p.hidden });
                audio.setEnvironment(G.sceneId === 'kelp' ? 'kelp' : G.sceneId === 'viken' ? 'bay' : p.x >= 80 * HL ? 'beach' : 'steppe');
            }
        } else if (mode === 'table') {
            kloUI?.availability({ visible: false, enabled: false });
            presses.clear();
            audio?.setEnvironment('table');
            table.tick(dt);
            // the world shows only while the table fades in or out
            const showWorld = !table.opaque;
            view.root.visible = showWorld;
            if (showWorld && view.sceneId) view.render(snapshot(G.player, 0, G.terrain, G.time), dt);
            const e = input.consume();
            if (ui.dialogueOpen() && (e.act || e.hop)) ui.advance();
        } else {
            presses.clear();
            kloUI?.availability({ visible: false, enabled: false });
            input.consume();
        }
        app.render();
        ui.updateSpeaker(who, mode === 'table' ? table.speakerBounds(who) : mode === 'play' ? view.speakerBounds(who) : null);
        if (debug) debugFrame(performance.now() - t0, dt);
    }

    function debugFrame(ms, dt) {
        frameTimes.push(dt * 1000);
        if (frameTimes.length > 600) frameTimes.shift();
        if (!debugEl) { debugEl = document.createElement('div'); debugEl.style.cssText = 'position:absolute;left:6px;bottom:6px;z-index:5;font:12px monospace;background:rgba(255,255,255,.8);padding:4px 6px;pointer-events:none'; el.appendChild(debugEl); }
        if (frameTimes.length % 20 === 0) {
            const sorted = frameTimes.slice().sort((a, b) => a - b);
            const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
            const fps = 1000 / (frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length);
            const p = G?.player;
            debugEl.textContent = `${fps.toFixed(0)} fps · p95 ${p95.toFixed(1)} ms · cpu ${ms.toFixed(1)} ms · ${G?.sceneId} x=${p ? (p.x / HL).toFixed(1) : '-'} y=${p ? (p.y / HL).toFixed(1) : '-'} ${p?.mode || ''} res ${app.renderer.resolution.toFixed(2)}`;
        }
    }

    // --------------------------------------------------------------------------------
    // Events → sound, captions, toasts
    // --------------------------------------------------------------------------------
    function wireEvents() {
        let inkT = 0;
        G.on('*', (type, e) => {
            if (!audio) return;
            switch (type) {
                case 'hoof': audio.sfx('hoof', { surface: e.hollow ? 'pier' : e.wading ? 'shallow' : e.surface, foot: e.foot, speed01: Math.min(1, e.speed / 1200) }); break;
                case 'splashIn': audio.sfx('splash', { size: e.size ?? 0.6 }); break;
                case 'splashOut': audio.sfx('drip'); break;
                case 'dolphin': audio.sfx('splash', { size: 0.8 }); audio.stinger('leap'); break;
                case 'paddle': audio.sfx('swim', { pan: (e.side || 0) * 0.2, gain: e.surface ? 0.9 : 0.7 }); break;
                case 'streckStart': audio.sfx('pencil', { len: 0.8 }); break;
                case 'ink': if (G.time > inkT) { inkT = G.time + 0.18; audio.sfx('pencil', { len: 0.2 }); } break;
                case 'leapStart': audio.sfx('whoosh'); if (e.big) audio.stinger('leap'); break;
                case 'land': audio.sfx(e.soft ? 'hoof' : 'thud', { surface: 'sand', speed01: 0.6 }); break;
                case 'balk': audio.sfx('snort'); break;
                case 'hop': audio.sfx('whoosh'); break;
                case 'hide': audio.sfx('thud'); break;
                case 'rest': audio.sfx('thud'); break;
                case 'neigh': audio.sfx(e.under ? 'blubb' : 'neigh'); ui.caption(e.under ? CAPTIONS.blubb : CAPTIONS.neigh); break;
                case 'shake': audio.sfx('shake'); break;
                case 'ratchet': audio.sfx('ratchet'); break;
                case 'wobble': break;
                case 'latch': audio.sfx('latch'); ui.caption(CAPTIONS.latch); break;
                case 'grow': audio.sfx('sparkle'); break;
                case 'fluff': audio.sfx('wind'); break;
                case 'push': audio.sfx('thud'); break;
                case 'pulled': audio.sfx('gate'); break;
                case 'pickup': audio.sfx('pickup'); break;
                case 'colorin': audio.sfx('colorin'); break;
                case 'shellNote': audio.note?.(e.note, { inst: 'shell' }); break;
                case 'plankNote': {
                    const degrees = audioTheme?.degrees;
                    audio.note?.(degrees?.length ? degrees[e.note % degrees.length] : e.note % 7, { inst: 'plank' });
                    break;
                }
                case 'shellTune': audio.phrase?.(8); break;
                case 'schoolFollow': audio.sfx('sparkle'); break;
                case 'flattened': audio.sfx('thud'); break;
                case 'stair': audio.sfx('whoosh'); break;
                case 'bump': audio.sfx('thud'); break;
                case 'skid': audio.sfx('hoof', { surface: 'sand', speed01: 1 }); break;
            }
        });
        // why the sköldhäst refused: a thought bubble over its head, not a toast far away
        G.on('balk', (e) => { const t = BALK[e.reason]; if (t) guide.think(t); });
        G.on('pickup', () => updatePencils());
        G.on('colorin', () => updatePencils());
        G.on('checkpoint', () => saveNow());
        G.on('scene', () => { updatePencils(); if (!G.vista) saveNow(); });
        G.on('neigh', () => {
            if (G.puz.neighs.land && G.puz.neighs.water && !G.flags.has('exp_gnagg')) {
                G.flag('exp_gnagg'); G.puz.tally += 1;
                ui.toast(JOURNAL.measurements + ': ' + JOURNAL.experiments.gnagg);
            }
        });
        G.on('shellTune', () => ui.toast('♪ Sköldhästens visa ♪', 3000));
    }
    function updatePencils() {
        if (!ui || !G) return;
        const region = pencilProgress(G).find(r => r.id === G.sceneId);
        if (region) ui.setPencils(region.found, region.total, region.title);
    }

    // --------------------------------------------------------------------------------
    // Handlers for the UI
    // --------------------------------------------------------------------------------
    function journalState() {
        const visited = new Set([G.sceneId]);
        if (G.flags.has('kelp_entered')) visited.add('kelp');
        if (G.flags.has('viken_arrived')) visited.add('viken');
        visited.add('land');
        return { flags: G.flags, objective: story.objective(), hint: story.guidance().hint, companion: companion?.journal(), tally: G.puz.tally, note, pencils: countPencils(G), pencilsTotal: totalPencils(G), pencilRegions: pencilProgress(G).filter(r => visited.has(r.id)), visited };
    }
    function openJournal() { if (mode !== 'play' || ui.panelOpen()) return; pause(); audio?.sfx('page'); ui.journal({ ...journalState(), onClose: () => resume() }); }
    function openPause() { if (mode !== 'play' || ui.panelOpen()) return; pause(); ui.pauseMenu(); }
    function uiHandlers() {
        return {
            onMenuSound: (kind) => audio?.sfx(kind === 'page' ? 'page' : 'ui', { kind: 'tab' }),
            openJournal: () => openJournal(),
            openPause: () => openPause(),
            resume: () => resume(),
            stuck: () => {
                // the nearest safe place on this page; the last checkpoint only if there is none
                const spot = G.safeSpot?.();
                if (spot) { G.goto(G.sceneId, spot); view.cam.snap = true; }
                else {
                    const cp = CHECKPOINTS[G.checkpoint] || CHECKPOINTS.start;
                    G.goto(cp.scene, cp.spot || cp.at);
                    view.setScene(G.sceneId);
                }
                resume();
            },
            quit: () => close(),
            getSettings: () => settings,
            setSetting: (k, v) => { settings[k] = v; applySettings(); saveNow(); },
            setNote: (v) => { note = v.slice(0, 200); saveNow(); },
            nextChapterOpen: (n) => (G.released || 3) > n,
            onSay: (who) => audio?.sfx(who === 'klo' ? 'crabvoice' : 'write'),
            onPencil: (len) => audio?.sfx('pencil', { len })
        };
    }
    function applySettings() {
        settings.help = normalizeKloHelpMode(settings.help);
        if (G) { G.helpLevel = settings.help; G.lessMotion = !!settings.lessMotion; }
        audio?.setVolumes({ music: settings.music, sfx: settings.sfx, voice: settings.voice });
        ui?.setBigText(settings.bigText);
        ui?.root.classList.toggle('less-motion', !!settings.lessMotion);
    }

    // hero hit-testing for Gnägg
    function heroScreen() {
        if (!view || !G) return null;
        const p = G.player;
        const gx = view.world.position.x + p.x * view.world.scale.x;
        const gy = view.world.position.y + (p.y - HL * 0.55) * view.world.scale.y;
        return { x: gx, y: gy, scale: view.world.scale.x, facing: p.facing || 1 };
    }
    function heroHit(x, y) {
        const s = heroScreen();
        if (!s) return false;
        const r = HL * 0.6 * view.world.scale.x + 20;
        return Math.hypot(x - s.x, y - s.y) < r;
    }
    function kloOnScreen() {
        const k = G?.actors?.klo, b = view?.kloBounds();
        return !!(mode === 'play' && !paused && !G.hideActors && !G.vista && k?.visible && k.scene === G.sceneId && b && b.maxX > 0 && b.minX < app.screen.width && b.maxY > 0 && b.minY < app.screen.height);
    }
    function kloHit(x, y) {
        if (!kloOnScreen() || G.busy || story?.running() || ui?.dialogueOpen() || ui?.panelOpen()) return false;
        const b = view.kloBounds(), pad = 8;
        return x >= b.minX - pad && x <= b.maxX + pad && y >= b.minY - pad && y <= b.maxY + pad;
    }

    function resumeAudio() { try { audio?.resume(); } catch { /* ignore */ } }

    // --------------------------------------------------------------------------------
    // Lifecycle: visibility, resize, audio unlock
    // --------------------------------------------------------------------------------
    function wireLifecycle() {
        const sig = { signal: listeners.signal };
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { saveNow(); audio?.suspend(); pause({ reason: 'visibility' }); }
            else {
                // Hidden tabs may receive no frames, so start the recovery window
                // at the visibility event rather than the last hidden frame.
                if (glLostAt) glLostAt = performance.now();
                resume();
            }
        }, sig);
        window.addEventListener('pagehide', () => saveNow(), sig);
        window.addEventListener('blur', () => companion?.cancel({ restore: true }), sig);
        const onResize = () => {
            if (!app) return;
            const { w, h, res } = sizes();
            app.renderer.resolution = res;
            app.renderer.resize(w, h);
            view?.resize();
            if (table?.active) table.layout();
        };
        window.addEventListener('resize', onResize, sig);
        let orientationTimer = null;
        sig.signal.addEventListener('abort', () => clearTimeout(orientationTimer), { once: true });
        window.addEventListener('orientationchange', () => {
            pause({ reason: 'orientation' });
            clearTimeout(orientationTimer);
            orientationTimer = setTimeout(() => { onResize(); resume(); }, 350);
        }, sig);
        const unlock = () => { if (audio) { resumeAudio(); } };
        for (const t of ['pointerdown', 'pointerup', 'keydown']) el.addEventListener(t, unlock, sig);
    }

    function pause() { companion?.cancel({ restore: true }); presses.clear(); paused = true; input?.release(); kloUI?.availability({ visible: false, enabled: false }); }
    function resume() {
        if (state !== 'open') return;
        if (ui?.panelOpen()) return;
        presses.clear(); input?.release();
        paused = false; last = performance.now(); acc = 0;
        if (!document.hidden) resumeAudio();
    }

    // --------------------------------------------------------------------------------
    // Close: idempotent, saves, frees everything, restores the page
    // --------------------------------------------------------------------------------
    let closing = null;
    function close() {
        presses.clear();
        if (closing) return closing;
        if (state === 'closed') return Promise.resolve();
        closing = (async () => {
            try { saveNow(); } catch (err) { console.warn(err); }
            state = 'closing';
            cancelAnimationFrame(raf);
            listeners?.abort();
            companion?.destroy(); kloUI?.destroy(); companion = null; kloUI = null;
            input?.destroy();
            ui?.destroy(); // drawing input/timers must stop before a slow asset unload
            try { audio?.dispose(); } catch { /* ignore */ }
            try { table?.destroy(); } catch { /* ignore */ }
            try { view?.destroy(); } catch { /* ignore */ }
            try { await assets?.close(); } catch { /* ignore */ }
            try { app?.destroy(true, { children: true }); } catch { /* ignore */ }
            guide?.destroy();
            el?.remove();
            restoreHost();
            app = null; view = null; ui = null; input = null; audio = null; story = null; table = null; G = null; assets = null; guide = null;
            glLostAt = 0; glPrompt = null;
            state = 'closed';
        })();
        const done = closing;
        done.then(() => { closing = null; });
        return done;
    }

    function dispose() { return close(); }

    // for automated tests and the ?debug overlay
    const api = { open, close, pause, resume, dispose, get state() { return state; }, get debug() { return { G, view, ui, app, assets, story, input, guide, companion, kloUI, heroHit, heroScreen, kloHit, kloOnScreen }; } };
    window.__skoldhast = api;
    return api;
}

// ------------------------------------------------------------------------------------
// A simple stand-in sköldhäst, used only if the hero art has not been built yet.
// ------------------------------------------------------------------------------------
function standIn({ mini } = {}) {
    const view = new PIXI.Container();
    const g = new PIXI.Graphics();
    view.addChild(g);
    let phase = 0;
    return {
        view,
        update(dt, s) {
            phase += (s.speed || 0) * dt / 300;
            view.scale.x = (s.facing || 1) * (mini ? 0.35 : 1);
            if (mini) view.scale.y = 0.35;
            g.clear();
            const hide = s.hide || 0;
            const legH = 90 * (1 - hide * 0.8);
            const bodyY = -legH - 40;
            for (let i = 0; i < 4; i++) {
                const x = -60 + i * 40, sw = Math.sin(phase * 6.28 + i * 1.6) * (s.speed > 20 ? 22 : 0);
                g.moveTo(x, bodyY + 20).lineTo(x + sw, -4).stroke({ width: 14, color: i % 2 ? 0xb8ada0 : 0xefe6d4 });
                g.rect(x + sw - 9, -18, 18, 18).fill({ color: 0x3e7a34 });
            }
            g.ellipse(0, bodyY, 95, 46).fill({ color: 0xefe6d4 }).stroke({ width: 3, color: 0x3b3530 });
            g.ellipse(-8, bodyY - 26, 88, 50).fill({ color: 0x4f8f3a }).stroke({ width: 3, color: 0x2f5e25 });
            g.moveTo(-95, bodyY).quadraticCurveTo(-150, bodyY + 30, -140, -6).stroke({ width: 16, color: 0xd4562a });
            const neckTop = bodyY - 70 + hide * 60;
            g.moveTo(60, bodyY - 10).lineTo(98, neckTop).stroke({ width: 30, color: 0xefe6d4 });
            g.ellipse(118, neckTop + 4, 36, 20).fill({ color: 0xefe6d4 }).stroke({ width: 3, color: 0x3b3530 });
            g.ellipse(145, neckTop + 10, 14, 12).fill({ color: 0x6e4230 });
            g.moveTo(70, bodyY - 30).quadraticCurveTo(95, neckTop - 50, 108, neckTop - 18).stroke({ width: 18, color: 0xe0782a });
            g.circle(122, neckTop - 2, 4).fill({ color: 0x1c1a18 });
        },
        destroy() { view.destroy({ children: true }); }
    };
}
