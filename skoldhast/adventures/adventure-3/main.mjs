/*
 * Äventyr 3: De försvunna stjärnorna – the adventure's runtime (plan §8.6, "Adventure series";
 * docs/skoldhast/adventure-3.md, section 18). The launcher (src/launcher.mjs) loads this module only when the
 * adventure is playable (or previewed: dev/play.html?adventure=3), and gives it the shared save service.
 *
 *   const game = createGame({ host, assetBase, saver, adventureId, slotId, onSlotChange, onChooseAdventure, onRestart, onClose });
 *   await game.open(); game.pause(); game.resume(); await game.close();
 *
 * One scheduler, as in Äventyr 1 and 2: our requestAnimationFrame loop steps the game at 120 Hz and renders in
 * between. Host glue is guarded with typeof.
 */
import * as PIXI from '../../vendor/pixi-8.21.0.min.mjs';
import { STEP, snapshot, HL, C } from '../../src/sim.mjs';
import { createFrameGuard } from '../../src/frame-guard.mjs';
import { createInput, upMeansHop } from '../../src/input.mjs';
import { createPressQueue } from '../../src/presses.mjs';
import { createSave } from '../../src/save.mjs';
import { ADVENTURES, FIRST_ADVENTURE, adventureStatus } from '../../src/adventures.mjs';
import { createAssets } from '../../src/assets.mjs';
import { UI as BOOK, ADVENTURE_UI, CAPTIONS } from '../../src/content/sv.mjs';
import { createGame as createLogic } from './game.mjs';
import { createStory, SECRETS, MEASURES } from './story.mjs';
import { createView } from './view.mjs';
import { createA3UI } from './ui.mjs';
import { createVoice } from '../../src/voice.mjs';
import { createTable, createUserFlame, flamePoints, flameColor } from './table.mjs';
import { createPictures } from './pictures.mjs';
import { WORDS } from './content/sv.mjs';
import { CHECKPOINTS, LIGHT_TOTAL } from './content/world.mjs';
import { travelPlaces } from './puzzles.mjs';

export const ADVENTURE_ID = 'adventure-3';
const DEFAULT_SETTINGS = { help: 'ask', holdGallop: false, followFinger: false, holdToHide: false, bigText: false, lessMotion: false, music: 0.8, sfx: 0.9, voice: 1 };
// the music of each page (src/audio.mjs areas): sparse on the Moon, wide among the stars, rolling on the ring,
// nothing at all in the white hole (section 16, "Sound"); the great gallop has the whole of it
const AREA = { mane: 'moon', stjarn: 'stars', ring: 'ring', sudd: 'white', vinter: 'gallop' };
const REMIND_AFTER = 45;

export function createGame({ host = document.body, assetBase = './skoldhast/', saver: sharedSaver, adventureId = ADVENTURE_ID, slotId,
    onChooseAdventure, onSlotChange, onRestart, onClose, preview = false } = {}) {
    let state = 'closed';
    let el = null, app = null, assets = null, G = null, view = null, ui = null, input = null, audio = null, story = null, table = null, pictures = null, voice = null;
    let lightsLanded = 0;
    let raf = 0, last = 0, acc = 0, paused = false, mode = 'title';
    let slot = { id: 'alva', label: BOOK.slotAlva };
    let settings = { ...DEFAULT_SETTINGS, lessMotion: !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches };
    let inputDevice = 'keys';
    let listeners = null, removeTitle = null, hydrating = false, endingNavigation = null;
    let selectedSlotId = slotId;
    let strokes = null, flameTexture = null, silenced = false;
    const saver = sharedSaver || createSave();
    const hostState = {};
    const presses = createPressQueue();
    const debug = /[?&#]debug/.test(location.search + location.hash);
    let debugEl = null;

    // --------------------------------------------------------------------------------
    // Host glue (as Äventyr 1 and 2)
    // --------------------------------------------------------------------------------
    function pageMusic() { try { return typeof bgMusic !== 'undefined' ? bgMusic : null; } catch { return null; } } // eslint-disable-line no-undef
    function pageAudioCtx() { try { return typeof audioCtx !== 'undefined' ? audioCtx : null; } catch { return null; } } // eslint-disable-line no-undef
    function hostPause(on) { try { if (typeof setSceneRenderPaused === 'function') setSceneRenderPaused(on); } catch (err) { console.warn('Sköldhästen: page pause', err); } } // eslint-disable-line no-undef
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
        const mario = document.getElementById('mario-content');
        if (mario) mario.style.display = '';
        hostPause(false);
        const m = pageMusic();
        if (m && hostState.musicWasPlaying) m.play().catch(() => {});
        document.documentElement.classList.remove('skoldhast-lock');
        if (typeof hostState.scrollY === 'number') window.scrollTo(0, hostState.scrollY);
        (document.getElementById('play-skoldhast-btn') || hostState.focus)?.focus?.({ preventScroll: true });
        try { onClose?.(); } catch { /* the page's own business */ }
    }
    function loadStyle() {
        if (document.querySelector('link[data-skoldhast-a3]')) return Promise.resolve();
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet'; link.href = new URL('./a3.css', import.meta.url).href; link.dataset.skoldhastA3 = '';
            link.onload = link.onerror = () => resolve();
            document.head.appendChild(link);
        });
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
        try { await openInner(); }
        catch (err) { console.error('Sköldhästen: open failed', err); await close(); throw err; }
    }
    async function openInner() {
        takeHost();
        el = document.createElement('div');
        el.className = 'sk-root sk-a3';
        host.appendChild(el);
        await loadStyle();
        app = new PIXI.Application();
        const { w, h, res } = sizes();
        await app.init({ preference: ['webgl'], width: w, height: h, resolution: res, autoDensity: true, antialias: false, autoStart: false, backgroundColor: 0x10142a, powerPreference: 'default' });
        if (state !== 'opening') return;
        app.canvas.className = 'sk-canvas';
        el.appendChild(app.canvas);
        assets = createAssets(PIXI, assetBase);
        try { await assets.init(); await assets.load('boot'); await assets.load('land'); }
        catch (err) { console.warn('Sköldhästen: assets', err); return showFatal(BOOK.loadFail); }
        if (state !== 'opening') return;
        assets.load('sea').catch(() => {});

        G = createLogic();
        G.lessMotion = !!settings.lessMotion;
        voice = createVoice({ audio: () => audio });
        voice.setEnabled(settings.voice > 0);
        ui = createA3UI(el, { assetBase, handlers: uiHandlers(), voice });
        const heroFactory = await loadHeroFactory();
        lightsLanded = 0;
        view = createView(PIXI, app, { assets, G, heroFactory, lightTarget: () => ui?.lightTarget?.(app.canvas, app.screen) });
        setDevice(window.matchMedia?.('(pointer: coarse)').matches ? 'touch' : 'keys');
        input = createInput(el, ui, {
            canvas: app.canvas,
            settings: () => settings,
            mode: () => G?.player?.mode,
            onDevice: d => setDevice(d),
            focusScope: () => menuScope(),
            onBack: () => { if (ui.panelOpen()) ui.closePanel(); },
            isGalloping: () => G && Math.abs(G.player.vx) >= 1000,
            isStopped: () => G && Math.abs(G.player.vx) < 20,
            gallopDefl: C.gallopDefl,
            heroHit: (x, y) => heroHit(x, y),
            kloHit: () => false,
            companionOpen: () => false,
            heroScreen: () => heroScreen(),
            onKey: (k) => {
                if (mode !== 'play') return;
                if (ui.panelOpen()) { if (k === 'pause' || k === 'journal') ui.closePanel(); return; }
                if (k === 'journal') openJournal();
                if (k === 'pause') openPause();
                if (k === 'klo') askKlo();
            }
        });
        await loadAudio();
        story = createStory(G, {
            ui, audio,
            get settings() { return settings; },
            fx: (name, data) => runFx(name, data),
            save: (o) => saveNow(o)
        });
        G.story = story;
        table = createTable({ PIXI, app, assets, ui, audio, G, heroFactory });
        pictures = createPictures({ PIXI, app, assets, ui, audio, G, heroFactory });
        wireEvents();
        wireLifecycle();
        state = 'open';
        last = performance.now();
        raf = requestAnimationFrame(frame);
        showTitle();
    }

    const frameGuard = createFrameGuard({ onLower: () => {
        if (!app) return;
        const { w, h, res } = sizes();
        app.renderer.resolution = res; app.renderer.resize(w, h); view?.resize();
    } });
    function sizes() {
        const w = window.innerWidth, h = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        const cap = (w < 900 || h < 500) ? 1.5e6 : 4.2e6;
        const res = Math.max(1, Math.min(dpr, 2, Math.sqrt(cap / (w * h))) * frameGuard.scale);
        return { w, h, res };
    }
    async function loadHeroFactory() {
        const mod = await import('../../src/hero.mjs');
        const rig = assets.data('hero-rig');
        const textures = {};
        for (const n of assets.frameNames()) textures[n] = assets.frame(n);
        return (o = {}) => mod.createHero(PIXI, { textures, rig, mini: !!o.mini });
    }
    async function loadAudio() {
        try {
            const mod = await import('../../src/audio.mjs');
            audio = mod.createAudio({ ctx: pageAudioCtx() || undefined });
            audio.setVolumes({ music: settings.music, sfx: settings.sfx, voice: settings.voice });
            audio.ready?.catch?.(() => {});
            // the climax's silence (section 16.1): the music stops at the edge of the fog and holds until the gallop
            audio.silence = (on) => { silenced = !!on; audio.setArea(on ? 'quiet' : areaNow()); };
        } catch (err) { console.warn('Sköldhästen: audio unavailable', err); audio = null; }
    }
    function areaNow() {
        const F = G?.flags;
        if (silenced) return 'quiet';
        // from the edge of the fog until the gallop: the first true silence in the series (section 16.1)
        if (G?.sceneId === 'sudd' && F.has('b:fog') && !F.has('self_drawn')) return 'quiet';
        if (F?.has('ended') || F?.has('moon_whole')) return 'sky';
        return AREA[G?.sceneId] || 'moon';
    }
    function showFatal(text) {
        const box = document.createElement('div');
        box.className = 'sk-message';
        const p = document.createElement('p'); p.textContent = text;
        const again = document.createElement('button'); again.className = 'sk-pbtn primary'; again.textContent = BOOK.retry;
        const back = document.createElement('button'); back.className = 'sk-pbtn'; back.textContent = BOOK.back;
        box.append(p, again, back);
        el.appendChild(box);
        again.onclick = () => (onRestart ? onRestart() : close().then(open));
        back.onclick = () => close();
        state = 'failed';
    }

    // --------------------------------------------------------------------------------
    // Title, researchers, new game, continue
    // --------------------------------------------------------------------------------
    function slotList() {
        const list = saver.slots();
        if (!list.find((s) => s.id === 'alva')) list.unshift({ id: 'alva', label: BOOK.slotAlva });
        return list;
    }
    function showTitle() {
        mode = 'title';
        ui.showControls(false);
        ui.guide.show(false);
        if (!saver.available) ui.toast(BOOK.noSave, 4200);
        const lastId = selectedSlotId || saver.last();
        if (lastId) slot = { id: lastId, label: slotList().find((s) => s.id === lastId)?.label || lastId };
        const loaded = saver.load(slot.id, adventureId);
        const profile = saver.loadProfile(slot.id)?.data;
        if (profile?.settings) settings = { ...DEFAULT_SETTINGS, ...profile.settings };
        applySettings();
        removeTitle?.();
        removeTitle = ui.title({
            hasSave: !!loaded?.data && loaded.data.flags.includes('b:arrive'),
            slots: saver.slots(),
            onAdventures: () => chooseAdventure(),
            onBegin: () => { resumeAudio(); newGame(); },
            onContinue: () => { resumeAudio(); continueGame(loaded.data); },
            onSwitch: (done) => ui.slotPicker(slotList(), (id) => { done(); pickSlot(id); }, () => { done(); showTitle(); })
        });
        if (loaded?.corrupt) ui.toast(BOOK.badSave, 5000);
    }
    function pickSlot(id) {
        const profile = saver.loadProfile(id)?.data;
        const playable = adventureStatus(adventureId, profile).playable || preview;
        if (!playable && onChooseAdventure) { onChooseAdventure(FIRST_ADVENTURE, id); return; }
        slot = { id, label: slotList().find((q) => q.id === id)?.label || id };
        selectedSlotId = id; onSlotChange?.(id);
        settings = { ...DEFAULT_SETTINGS, ...(profile?.settings || {}) };
        applySettings();
        const loaded = saver.load(id, adventureId);
        if (loaded?.data?.flags?.includes('b:arrive')) continueGame(loaded.data); else newGame();
    }

    function adventureChoices() {
        const profile = saver.loadProfile(slot.id)?.data;
        return ADVENTURES.map(adventure => {
            const saved = profile?.adventures?.[adventure.id];
            return { ...adventure, ...adventureStatus(adventure.id, profile),
                title: ADVENTURE_UI.titles[adventure.id],
                requiresNumber: ADVENTURES.find(a => a.id === adventure.requires)?.number,
                active: adventure.id === adventureId,
                hasSave: !!saved, ended: !!saved?.ended || saved?.flags?.includes('ended') };
        });
    }
    function chooseAdventure() {
        if (state !== 'open') return;
        saveNow();
        const fromTitle = mode === 'title';
        pause();
        ui.adventurePicker({ adventures: adventureChoices(), playerLabel: slot.label,
            onClose: () => resume(),
            onPick: id => {
                const choice = adventureChoices().find(a => a.id === id);
                if (id === adventureId) { resume(); if (fromTitle) { removeTitle?.(); removeTitle = null; showTitle(); } return; }
                if (!choice?.playable) { chooseAdventure(); return; }
                onChooseAdventure?.(id, slot.id);
            }
        });
    }

    function resetLogic() {
        G.flags.clear();
        G.frozen = null;
        for (const k of Object.keys(G.actors)) delete G.actors[k];
        G.checkpoint = 'start'; G.camHint = null; G.camLook = null; G.busy = 0; G.carry = null; G.selfDrawing = false;
        strokes = null; flameTexture = null; silenced = false;
    }

    async function newGame() {
        removeTitle = null;
        resetLogic();
        mode = 'table';
        ui.showControls(false);
        ui.guide.show(false); ui.guide.clear();
        audio?.setArea('table');
        const result = await table.prologue();
        if (state !== 'open') return;
        if (result?.flame) {
            flameTexture = result.flame.texture;
            strokes = { flame: result.flame.pts, flameColor: result.flame.color };
            view.setFlameTexture(flameTexture);
        }
        // the launch from Utsiktskullen: a picture that ends on the Moon, held while the world is set up behind it
        await pictures.play('launch', { flameTexture });
        if (state !== 'open') return;
        G.goto('mane', 'start');
        view.setScene(G.sceneId);
        await table.reveal();
        await pictures.close?.();
        if (state !== 'open') return;
        startPlay();
        story.start();
        saveNow();
    }
    function continueGame(data) {
        removeTitle = null;
        hydrating = true;
        resetLogic();
        if (data.settings) settings = { ...DEFAULT_SETTINGS, ...data.settings };
        applySettings();
        if (data.strokes?.flame) {
            strokes = { flame: flamePoints(data.strokes.flame), flameColor: flameColor(data.strokes.flameColor) };
            flameTexture = createUserFlame(PIXI, strokes.flame, strokes.flameColor)?.texture || null;
            view.setFlameTexture(flameTexture);
        }
        G.restore(data);
        hydrating = false;
        startPlay();
        story.start();
    }
    function startPlay() {
        view.setScene(G.sceneId);
        mode = 'play';
        ui.showControls(true);
        audio?.freeze(false);
        audio?.setArea(areaNow());
        acc = 0;
    }

    // --------------------------------------------------------------------------------
    // Story moments that need the screen (the rest are the view's)
    // --------------------------------------------------------------------------------
    async function drawWith(kind, prompt, o = {}) {
        const g = view.drawGuide?.(kind);
        if (!g?.anchors?.length) return;
        ui.showControls(false); ui.guide.show(false); ui.keyPrompt(null);
        await ui.draw({ prompt, anchors: g.anchors, guide: g.guide, numbers: !!g.numbers, allowReverse: !!o.allowReverse, color: o.color || '#d9b43c', width: o.width || 5, dotRadius: o.dot || 12 });
        ui.showControls(true);
    }
    async function picture(name, data) {
        mode = 'table';
        ui.showControls(false); ui.guide.show(false); ui.keyPrompt(null);
        try { await pictures.play(name, data); } finally {
            if (state === 'open') { mode = 'play'; ui.showControls(true); }
        }
    }
    async function runFx(name, data = {}) {
        if (state !== 'open' || !view) return new Promise(() => {});
        switch (name) {
            case 'caption': await Promise.all([ui.caption(data.text, 2600), G.wait(1.0)]); return;
            case 'finDraw':
                await drawWith('fin', WORDS.drawFin, { color: '#c0392b', width: 6 });
                audio?.stinger?.('reveal');
                return view.fx('drawn', { kind: 'fin' });
            case 'starDraw':
                await drawWith('star', WORDS.drawStar, { color: '#d9b43c', width: 5 });
                audio?.sfx?.('sparkle');
                return view.fx('drawn', { kind: 'star' });
            case 'constellationDraw':
                await drawWith('constellation', WORDS.drawConstellation, { color: '#e9b949', width: 4.5, dot: 13 });
                audio?.stinger?.('discovery');
                audio?.melodyPhrase?.(12, { inst: 'harm' });
                return view.fx('drawn', { kind: 'constellation' });
            // Suddet's work is heard: the squeak, and at each bite one tearing squeal (section 16.1)
            case 'bite': audio?.sfx('rub'); audio?.sfx('rubTear', { delay: 0.6 }); return view.fx(name, data);
            case 'notesRub': case 'outlineGone': audio?.sfx('rub', { gain: 0.9 }); return view.fx(name, data);
            case 'pipFlash': audio?.sfx('pip'); return view.fx(name, data);
            case 'forestDark': case 'forestLight': return picture(name, { ...data, flameTexture });
            case 'tableVoices': return; // the table is heard, not seen, between pages
            case 'travel': {
                await view.fx('travel', data);
                return;
            }
            case 'epilogue': {
                mode = 'table';
                ui.showControls(false); ui.guide.show(false); ui.guide.clear(); ui.keyPrompt(null);
                audio?.setArea('starTable');
                await view.fx('fadeOut', { rate: 2 });
                await table.epilogue({ flameTexture });
                if (state !== 'open') return;
                view.fadeNow(0);
                mode = 'play';
                ui.showControls(true);
                ui.setSuddEyes?.(true);
                return;
            }
            case 'ending': {
                pause();
                const action = await ui.ending({ nextAdventure: null });
                resume();
                audio?.setArea(areaNow());
                if (action?.type && action.type !== 'explore') {
                    endingNavigation = setTimeout(() => {
                        endingNavigation = null;
                        if (state !== 'open') return;
                        chooseAdventure();
                    }, 0);
                }
                return;
            }
            default: return view.fx(name, data);
        }
    }

    // --------------------------------------------------------------------------------
    // Saving
    // --------------------------------------------------------------------------------
    function saveNow(o = {}) {
        if (hydrating || !G || !G.flags.has('b:arrive')) return;
        const data = G.serialize();
        saver.store(slot.id, slot.label, { ...data, settings, strokes, ended: !!o.ended || G.flags.has('ended') }, adventureId);
    }

    // --------------------------------------------------------------------------------
    // The loop
    // --------------------------------------------------------------------------------
    function frame(now) {
        raf = requestAnimationFrame(frame);
        let dt = (now - last) / 1000;
        last = now;
        if (dt > 0.25) dt = 0.25;
        if (!paused && state === 'open' && !document.hidden) frameGuard.sample(dt);
        if (paused || state !== 'open') {
            presses.clear(); input?.release();
            if (state === 'open') input?.poll();
            ui?.updateSpeaker(null); if (app) app.render(); return;
        }
        const t0 = performance.now();
        const who = ui.panelOpen() ? null : ui.speaker();
        G.speaker = who;
        if (mode === 'play') {
            const blocked = ui.panelOpen() || ui.dialogueOpen();
            const cont = blocked ? { x: 0, y: 0, hopHeld: false } : input.state();
            const e = input.consume();
            if (ui.dialogueOpen() && (e.act || e.hop)) ui.advance();
            if (e.up && upMeansHop(G.player)) e.hop = true;
            if (e.tapKlo && !blocked && !G.busy && !story.running() && G.actors.klo?.visible && G.actors.klo.scene === G.sceneId) { G.lastTalk = 'klo'; G.emit('talk', { who: 'klo' }); }
            if (blocked) presses.clear(); else presses.push(e);
            acc += dt;
            let first = true, steps = 0;
            while (acc >= STEP && steps < 10) {
                const edges = first ? presses.consume() : {};
                const hideEdge = first && !blocked && (settings.holdToHide ? (edges.hide && !G.player.hidden) : edges.hide);
                const hideRelease = !blocked && settings.holdToHide && !cont.hideHeld;
                G.step({ x: cont.x, y: cont.y, hopHeld: cont.hopHeld, hop: first && !blocked && edges.hop,
                    act: first && !blocked && edges.act, duck: first && !blocked && edges.duck,
                    hide: hideEdge, hideRelease, tapHero: first && !blocked && (edges.tapHero || edges.neigh) });
                first = false; acc -= STEP; steps++;
            }
            if (steps >= 10) acc = 0;
            if (G.sceneId !== view.sceneId) {
                view.setScene(G.sceneId);
                view.fadeNow(0.85); view.fx('fadeIn', { rate: 2.6 });
                ui.caption(WORDS.pages[G.sceneId], 2400);
                audio?.setArea(areaNow());
            }
            const snap = snapshot(G.player, acc / STEP, G.terrain, G.time);
            view.render(dt, snap);
            if (pictures.shown) pictures.tick(dt);
            ui.setContext(G.context?.label, G.player.hidden, settings.holdToHide);
            const free = !ui.dialogueOpen() && !ui.panelOpen() && !G.busy;
            const promptable = inputDevice !== 'touch' && G.context?.label && !G.player.hidden && free && !story.running();
            const hs = promptable ? heroScreen() : null;
            ui.keyPrompt(hs ? { key: inputDevice === 'pad' ? 'X' : 'E', label: G.context.label, who: G.context.who, at: { x: hs.x, y: hs.y - HL * 0.8 * hs.scale } } : null);
            ui.guide.show(free);
            const obj = story.objective();
            if (settings.help === 'guided' && story.activePuzzle()) ui.guide.goal(story.hint({ peek: true }).text, obj?.text);
            else ui.guide.goal(obj?.why || '', obj?.text || null);
            remind(free);
            ui.guide.update();
            // a light still flying to Nova's dome is counted when it lands there (view.mjs)
            ui.setLights(G.lights() - (view?.lightsArriving || 0), LIGHT_TOTAL);
            if (view && view.lightsLanded > lightsLanded) { lightsLanded = view.lightsLanded; audio?.note?.(2 + (G.lights() % 6), { inst: 'shell', vel: 0.5 }); }
            if (audio) {
                const p = G.player;
                squeak(dt, p);
                audio.setMotion({ speed01: Math.min(1, Math.abs(p.vx) / 1200), underwater: false, hidden: p.hidden });
                // in space no sound is heard (rule 10): no wind, no waves; only what is close
                audio.setEnvironment(G.sceneId === 'mane' ? 'table' : 'table');
                audio.setRain?.(0);
                audio.setBed?.('falls', 0);
            }
        } else if (mode === 'table') {
            presses.clear();
            audio?.setEnvironment('table');
            table.tick(dt);
            pictures.tick?.(dt);
            if (!table.opaque && !pictures.shown && view.sceneId) view.render(dt, snapshot(G.player, 0, G.terrain, G.time));
            const e = input.consume();
            if (ui.dialogueOpen() && (e.act || e.hop)) ui.advance();
        } else {
            presses.clear();
            input.consume();
        }
        app.render();
        const bounds = mode === 'table' ? (pictures.shown ? pictures.speakerBounds?.(who) : table.speakerBounds(who)) : mode === 'play' ? view.speakerBounds(who) : null;
        ui.updateSpeaker(who, bounds);
        if (debug) debugFrame(performance.now() - t0, dt);
    }
    const frameTimes = [];
    function debugFrame(ms, dt) {
        frameTimes.push(dt * 1000);
        if (frameTimes.length > 600) frameTimes.shift();
        if (!debugEl) { debugEl = document.createElement('div'); debugEl.style.cssText = 'position:absolute;left:6px;bottom:6px;z-index:5;font:12px monospace;background:rgba(255,255,255,.8);padding:4px 6px;pointer-events:none'; el.appendChild(debugEl); }
        if (frameTimes.length % 20 === 0) {
            const fps = 1000 / (frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length);
            const p = G?.player;
            debugEl.textContent = `${fps.toFixed(0)} fps · cpu ${ms.toFixed(1)} ms · ${G?.sceneId} x=${p ? (p.x / HL).toFixed(1) : '-'} y=${p ? (p.y / HL).toFixed(1) : '-'} ${p?.mode || ''} · ljus ${G?.lights()} · ${mode}`;
        }
    }

    // In the white, before the sköldhäst is whole again, Suddet is heard: a slow squeak, three strokes and a pause, nearer
    // as it is followed, from its side (section 16.1). It never speeds up.
    let squeakT = 0;
    function squeak(dt, p) {
        const s = G.actors.sudd;
        if (G.sceneId !== 'sudd' || G.flags.has('self_drawn') || !s?.visible || !G.flags.has('rocket_gone')) { squeakT = 0; return; }
        squeakT -= dt;
        if (squeakT > 0) return;
        squeakT = 2.2;
        const d = Math.abs(s.x - p.x);
        audio.sfx('rub', { gain: Math.max(0.1, Math.min(1, 1 - d / (30 * HL))), pan: Math.max(-1, Math.min(1, (s.x - p.x) / (12 * HL))) });
    }

    // --------------------------------------------------------------------------------
    // Events → sound and captions
    // --------------------------------------------------------------------------------
    function wireEvents() {
        let inkT = 0;
        G.on('*', (type, e) => {
            if (!audio) return;
            const space = G.sceneDef?.waters?.some(w => w.kind === 'space');
            switch (type) {
                // the materials are the audio's own surfaces: moon dust, star-lines (each star a note), ice
                case 'hoof': audio.sfx('hoof', { surface: e.surface || 'moon', foot: e.foot, speed01: Math.min(1, e.speed / 1200) }); break;
                case 'streckStart': audio.sfx('pencil', { len: 0.8 }); break;
                case 'ink': if (G.time > inkT) { inkT = G.time + 0.18; audio.sfx('pencil', { len: 0.2 }); } break;
                case 'streckDone': audio.stinger('aha'); break;
                case 'land': audio.sfx(e.soft ? 'hoof' : 'thud', { surface: 'sand', speed01: 0.5 }); break;
                case 'balk': audio.sfx('snort'); break;
                case 'hop': audio.sfx('whoosh', { gain: 0.6 }); break;
                case 'hide': case 'rest': audio.sfx('thud'); break;
                // in space no sound is heard: a whinny is a small "…" (rule 10)
                case 'neigh': if (G.sceneId === 'mane' || !space) { audio.sfx('neigh'); ui.caption(CAPTIONS.neigh); } else ui.caption('…'); break;
                case 'light': audio.sfx('pickup'); audio.sfx('sparkle'); break;
                case 'push': audio.sfx(G.sceneId === 'ring' ? 'ice' : 'thud'); break;
                case 'boxFalls': audio.sfx('whoosh', { gain: 0.4 }); break;
                case 'carryStart': if (e.kind === 'beam' || e.kind === 'catch') audio.sfx('beam'); else audio.sfx('whoosh', { gain: 0.6 }); break;
                // Karlavagnen's stars and Orion's three ring the melody's notes, one each
                case 'wagonStar': audio.melodyNote?.(e.n - 1, { inst: 'shell' }); break;
                case 'beltOne': audio.melodyNote?.(e.n - 1, { inst: 'shell' }); break;
                case 'novaAngry': audio.sfx('lamp'); break;
                case 'beltWrong': audio.sfx('snort', { gain: 0.5 }); break;
                case 'beltLit': audio.stinger('aha'); break;
                case 'shower': if (e.state === 'shower') audio.sfx('rustle', { gain: 0.8 }); break;
                case 'iceMelts': audio.sfx('ice'); audio.stinger('discovery'); break;
                case 'fogLit': audio.sfx('sparkle'); break;
                case 'bridgeRubbed': audio.sfx('rub'); break;
                // Rita dig själv: the player gallops the theme into being, one note a stride (section 16.1)
                case 'selfStroke': audio.sfx('pencil', { len: 0.4 }); audio.melodyNote?.(e.n - 1); break;
                case 'clue': audio.sfx('write'); ui.pulse?.('journal'); break;
                case 'notesRubbed': ui.pulse?.('journal'); break;
                case 'bump': audio.sfx('thud'); break;
                case 'skid': audio.sfx('hoof', { surface: 'sand', speed01: 1 }); break;
            }
        });
        G.on('checkpoint', () => saveNow());
        G.on('flag', ({ flag }) => { if (!flag.startsWith('b:') && !flag.startsWith('t:') && !flag.startsWith('visited_')) progressAt = G.time; });
        G.on('flag', ({ flag }) => {
            const secret = G.flags.has('ended') && SECRETS.some(s => s.flag === flag);
            if (secret || MEASURES.some(m => m.flag === flag) || flag.startsWith('card_')) { audio?.sfx('write', { delay: 0.4 }); ui.pulse?.('journal'); }
        });
        // the rocket's door: the card with the places (section 8.6)
        G.on('openTravel', () => {
            if (!ui || ui.panelOpen()) return;
            pause();
            const places = travelPlaces(G).filter(t => t.visible).map(t => {
                const info = story.places().find(q => q.id === t.id);
                return { id: t.id, name: WORDS.pages[t.id], open: t.open || t.here, here: t.here, found: info?.found ?? 0, total: info?.total ?? 0, named: info?.named ?? true };
            });
            ui.travel({ places,
                onPick: (id) => { resume(); story.travelTo(id); },
                onClose: () => resume() });
        });
    }

    // --------------------------------------------------------------------------------
    // Menus and help
    // --------------------------------------------------------------------------------
    function placeName() {
        const id = [...(G?.areas || [])].reverse().find(a => WORDS.places[a]);
        if (!id) return WORDS.pages[G?.sceneId] || '';
        // "Novas krater" only once she has said her name (at breakfast)
        return (!G.flags.has('breakfast') && WORDS.placesBefore?.[id]) || WORDS.places[id];
    }
    function openJournal() {
        if (mode !== 'play' || ui.panelOpen()) return;
        pause(); audio?.sfx('page');
        ui.journal({ ...story.notebook(), hint: () => story.hint(), notes: () => story.notes(), place: placeName() });
    }
    let progressAt = 0, reminded = new Set();
    function remind(free) {
        if (settings.help !== 'remind' || !free || story.running()) return;
        const id = story.activePuzzle();
        if (!id || reminded.has(id) || G.time - progressAt < REMIND_AFTER) return;
        reminded.add(id);
        const h = story.hint({ peek: true });
        if (h?.text) ui.guide.hint(h.text, 'klo');
    }
    function openPause() { if (mode !== 'play' || ui.panelOpen()) return; pause(); ui.pauseMenu(); }
    function askKlo() {
        if (G.busy || story.running() || ui.dialogueOpen()) return;
        const h = story.hint('klo');
        if (h?.text) ui.guide.hint(h.text, 'klo');
    }
    function uiHandlers() {
        return {
            onMenuSound: (kind) => audio?.sfx(kind === 'page' ? 'page' : 'ui', { kind: 'tab' }),
            openJournal: () => openJournal(),
            openPause: () => openPause(),
            resume: () => resume(),
            heroScreen: () => heroScreen(),
            stuck: () => {
                const spot = G.safeSpot?.();
                if (spot) { G.goto(G.sceneId, spot); view.cam.snap = true; }
                else { const cp = CHECKPOINTS[G.checkpoint] || CHECKPOINTS.start; G.goto(cp.scene, cp.spot || cp.at); view.setScene(G.sceneId); }
                ui.toast(WORDS.stuckDone, 2200);
                resume();
            },
            quit: () => close(),
            chooseAdventure: () => chooseAdventure(),
            getSettings: () => settings,
            setSetting: (k, v) => { settings[k] = v; applySettings(); saveNow(); },
            // a recorded line is its own sound; the chirp and the pencil are for silent lines (Pip says pip)
            onSay: (who, text, voiced) => { if (who === 'pip') { audio?.sfx('pip'); return; } if (!voiced) audio?.sfx(who === 'klo' || who === 'tukan' || who === 'nova' ? 'crabvoice' : 'write'); },
            onPencil: (len) => audio?.sfx('pencil', { len })
        };
    }
    function applySettings() {
        if (!['ask', 'remind', 'guided'].includes(settings.help)) settings.help = 'ask';
        if (G) G.lessMotion = !!settings.lessMotion;
        audio?.setVolumes({ music: settings.music, sfx: settings.sfx, voice: settings.voice });
        voice?.setEnabled(settings.voice > 0 && !paused);
        ui?.setBigText(settings.bigText);
        ui?.root.classList.toggle('less-motion', !!settings.lessMotion);
    }
    function setDevice(d) {
        inputDevice = d;
        ui?.root.classList.toggle('sk-touch', d === 'touch');
        ui?.root.classList.toggle('sk-pad', d === 'pad');
    }
    function menuScope() {
        if (!ui) return null;
        for (const sel of ['.sk-panel.on', '.sk-choice.on', '.sk-draw.on', '.sk-title']) {
            const node = ui.root.querySelector(sel) || el.querySelector(sel);
            if (node && node.getClientRects().length) return node;
        }
        return null;
    }
    function heroScreen() {
        if (!view || !G) return null;
        const p = G.player;
        return { x: view.world.position.x + p.x * view.world.scale.x, y: view.world.position.y + (p.y - HL * 0.55) * view.world.scale.y, scale: view.world.scale.x, facing: p.facing || 1 };
    }
    function heroHit(x, y) {
        const s = heroScreen();
        if (!s) return false;
        return Math.hypot(x - s.x, y - s.y) < HL * 0.6 * view.world.scale.x + 20;
    }
    function resumeAudio() { try { audio?.resume(); } catch { /* ignore */ } }

    function wireLifecycle() {
        const sig = { signal: listeners.signal };
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { saveNow(); audio?.suspend(); pause(); } else resume();
        }, sig);
        window.addEventListener('pagehide', () => saveNow(), sig);
        const onResize = () => {
            if (!app) return;
            const { w, h, res } = sizes();
            app.renderer.resolution = res;
            app.renderer.resize(w, h);
            view?.resize();
        };
        window.addEventListener('resize', onResize, sig);
        window.addEventListener('orientationchange', () => setTimeout(onResize, 350), sig);
        const unlock = () => resumeAudio();
        for (const t of ['pointerdown', 'pointerup', 'keydown']) el.addEventListener(t, unlock, sig);
    }

    function pause() { presses.clear(); paused = true; input?.release(); voice?.setEnabled(false); }
    function resume() {
        if (state !== 'open' || ui?.panelOpen()) return;
        presses.clear(); input?.release();
        voice?.setEnabled(settings.voice > 0);
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
            clearTimeout(endingNavigation); endingNavigation = null;
            removeTitle = null;
            cancelAnimationFrame(raf);
            listeners?.abort();
            story?.destroy();
            input?.destroy();
            voice?.stop();
            ui?.destroy();
            try { audio?.dispose(); } catch { /* ignore */ }
            try { pictures?.destroy(); } catch { /* ignore */ }
            try { table?.destroy(); } catch { /* ignore */ }
            try { view?.destroy(); } catch { /* ignore */ }
            try { await assets?.close(); } catch { /* ignore */ }
            try { app?.destroy(true, { children: true }); } catch { /* ignore */ }
            el?.remove();
            restoreHost();
            app = null; view = null; ui = null; input = null; audio = null; story = null; table = null; pictures = null; G = null; assets = null; voice = null;
            state = 'closed';
        })();
        const done = closing;
        done.then(() => { closing = null; });
        return done;
    }

    const api = { open, close, pause, resume, dispose: close, get state() { return state; },
        get debug() { return { G, view, ui, app, assets, story, input, table, pictures, heroScreen, get mode() { return mode; } }; } };
    window.__skoldhast3 = api;
    return api;
}
