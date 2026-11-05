/*
 * Äventyr 2: Den magiska skogen – the adventure's runtime (plan §8.6, "Adventure series").
 * The launcher (src/launcher.mjs) loads this module only when the adventure is
 * playable (or previewed), and gives it the shared save service.
 *
 *   const game = createGame({ host, assetBase, saver, adventureId, slotId, onSlotChange, onChooseAdventure, onRestart, onClose });
 *   await game.open(); game.pause(); game.resume(); await game.close();
 *
 * One scheduler, as in Adventure 1: our requestAnimationFrame loop steps the game
 * at 120 Hz and renders in between. Host glue is guarded with typeof.
 */
import * as PIXI from '../../vendor/pixi-8.21.0.min.mjs';
import { STEP, snapshot, HL, C } from '../../src/sim.mjs';
import { createFrameGuard } from '../../src/frame-guard.mjs';
import { createInput, upMeansHop } from '../../src/input.mjs';
import { createPressQueue } from '../../src/presses.mjs';
import { createSave } from '../../src/save.mjs';
import { ADVENTURES, FIRST_ADVENTURE, adventureStatus } from '../../src/adventures.mjs';
import { createAssets } from '../../src/assets.mjs';
import { createUserCloud, cloudPoints, cloudColor } from '../../src/user-cloud.mjs';
import { UI as BOOK, ADVENTURE_UI, CAPTIONS } from '../../src/content/sv.mjs';
import { createGame as createLogic } from './game.mjs';
import { createStory } from './story.mjs';
import { createView } from './view.mjs';
import { createA2UI } from './ui.mjs';
import { createVoice } from '../../src/voice.mjs';
import { createTable } from './table.mjs';
import { WORDS } from './content/sv.mjs';
import { CHECKPOINTS, EGG_TOTAL } from './content/world.mjs';

export const ADVENTURE_ID = 'adventure-2';
const DEFAULT_SETTINGS = { help: 'ask', holdGallop: false, followFinger: false, holdToHide: false, bigText: false, lessMotion: false, music: 0.8, sfx: 0.9, voice: 1 };
const AREA = { strand: 'land', skog: 'land', kristall: 'sea', topp: 'bay' };
// with "Påminn mig om Klo", Klo offers his next hint after this long without anything solved
const REMIND_AFTER = 45;

export function createGame({ host = document.body, assetBase = './skoldhast/', saver: sharedSaver, adventureId = ADVENTURE_ID, slotId,
    onChooseAdventure, onSlotChange, onRestart, onClose, preview = false } = {}) {
    let state = 'closed';
    let el = null, app = null, assets = null, G = null, view = null, ui = null, input = null, audio = null, story = null, table = null, voice = null;
    let eggsLanded = 0; // eggs the view has flown into the count (a chime as each lands)
    let raf = 0, last = 0, acc = 0, paused = false, mode = 'title';
    let slot = { id: 'alva', label: BOOK.slotAlva };
    let settings = { ...DEFAULT_SETTINGS, lessMotion: !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches };
    let inputDevice = 'keys';
    let listeners = null, removeTitle = null, hydrating = false, endingNavigation = null;
    let selectedSlotId = slotId;
    let strokes = null, cloudTexture = null;
    const saver = sharedSaver || createSave();
    const hostState = {};
    const presses = createPressQueue();
    const debug = /[?&#]debug/.test(location.search + location.hash);
    let debugEl = null;

    // --------------------------------------------------------------------------------
    // Host glue (as Adventure 1)
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
        if (document.querySelector('link[data-skoldhast-a2]')) return Promise.resolve();
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet'; link.href = new URL('./a2.css', import.meta.url).href; link.dataset.skoldhastA2 = '';
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
        el.className = 'sk-root sk-a2';
        host.appendChild(el);
        await loadStyle();
        app = new PIXI.Application();
        const { w, h, res } = sizes();
        await app.init({ preference: ['webgl'], width: w, height: h, resolution: res, autoDensity: true, antialias: false, autoStart: false, backgroundColor: 0x2a2d4a, powerPreference: 'default' });
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
        ui = createA2UI(el, { assetBase, handlers: uiHandlers(), voice });
        const heroFactory = await loadHeroFactory();
        eggsLanded = 0;
        view = createView(PIXI, app, { assets, G, heroFactory, eggTarget: () => ui?.eggTarget?.(app.canvas, app.screen) });
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
        // sharp on tablets and laptops too (the visual overhaul); the frame guard softens it where frames are slow
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
        } catch (err) { console.warn('Sköldhästen: audio unavailable', err); audio = null; }
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
        Object.assign(G.puz, { drum: 0, softDrum: 0, fall: null, ball: null, roll: null, still: 0, pushed: {} });
        for (const k of Object.keys(G.actors)) delete G.actors[k];
        G.checkpoint = 'start'; G.storm = 1; G.camHint = null; G.camLook = null; G.busy = 0;
        strokes = null; cloudTexture = null;
    }

    async function newGame() {
        removeTitle = null;
        resetLogic();
        mode = 'table';
        ui.showControls(false);
        ui.guide.show(false); ui.guide.clear();
        const result = await table.prologue();
        if (state !== 'open') return;
        if (result?.cloud) {
            cloudTexture = result.cloud.texture;
            strokes = { cloud: result.cloud.pts, cloudColor: result.cloud.color };
            view.setCloudTexture(cloudTexture);
        }
        G.goto('strand', 'start');
        G.hideHero = true; // it drops in once the page is open (story: the arrival)
        startPlay();
        await table.reveal();
        story.start();
        saveNow();
    }
    function continueGame(data) {
        removeTitle = null;
        hydrating = true;
        resetLogic();
        if (data.settings) settings = { ...DEFAULT_SETTINGS, ...data.settings };
        applySettings();
        if (data.strokes?.cloud) {
            strokes = { cloud: cloudPoints(data.strokes.cloud), cloudColor: cloudColor(data.strokes.cloudColor) };
            cloudTexture = createUserCloud(PIXI, strokes.cloud, strokes.cloudColor)?.texture || null;
            view.setCloudTexture(cloudTexture);
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
        audio?.setArea(G.flags.has('ended') ? 'final' : AREA[G.sceneId] || 'land');
        acc = 0;
    }

    // --------------------------------------------------------------------------------
    // Story moments that need the screen (the rest are the view's)
    // --------------------------------------------------------------------------------
    async function runFx(name, data = {}) {
        if (state !== 'open' || !view) return new Promise(() => {});
        switch (name) {
            case 'caption': await Promise.all([ui.caption(data.text, 2600), G.wait(1.0)]); return;
            case 'cloudRide':
                // the cloud carries everyone home: a little picture of the ride, then the beach
                await view.fx('cloudRide');
                ui.caption(WORDS.pages.strand, 2600);
                pendingFadeIn = true;
                return;
            case 'moonDraw': {
                const m = view.moonScreen();
                const anchors = [], guide = [];
                for (let i = 0; i < 13; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI * 2; anchors.push([m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r]); }
                for (let i = 0; i <= 64; i++) { const a = -Math.PI / 2 + i / 64 * Math.PI * 2; guide.push([m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r]); }
                ui.showControls(false); ui.guide.show(false);
                await ui.draw({ prompt: WORDS.drawMoon, anchors, guide, allowReverse: true, color: '#cfa93c', width: 6, dotRadius: 13 });
                audio?.stinger?.('reveal');
                ui.showControls(true);
                return;
            }
            case 'starsDraw': {
                // a five-pointed star beside the moon, traced with Alva's pencil
                const m = view.moonScreen(), cx = m.x - m.r * 2.6, cy = m.y + m.r * 0.3, R = m.r * 0.95;
                const anchors = [];
                for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.42 : R; anchors.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
                ui.showControls(false); ui.guide.show(false);
                await ui.draw({ prompt: WORDS.drawStars, anchors, color: '#d9b43c', width: 5, dotRadius: 12 });
                audio?.sfx?.('sparkle');
                ui.showControls(true);
                return;
            }
            case 'moonrise': audio?.setArea('final'); return view.fx(name, data);
            case 'hatch': audio?.stinger?.('plask'); return view.fx(name, data);
            case 'epilogue': {
                mode = 'table';
                ui.showControls(false); ui.guide.show(false); ui.guide.clear();
                await view.fx('fadeOut', { rate: 2 });
                await table.epilogue({ cloudTexture });
                if (state !== 'open') return;
                view.fadeNow(0);
                mode = 'play';
                ui.showControls(true);
                return;
            }
            case 'ending': {
                const nextAdventure = adventureChoices().find(a => a.requires === adventureId);
                pause();
                const action = await ui.ending({ nextAdventure });
                resume();
                if (action?.type && action.type !== 'explore') {
                    endingNavigation = setTimeout(() => {
                        endingNavigation = null;
                        if (state !== 'open') return;
                        if (action.type === 'next' && onChooseAdventure) { onChooseAdventure(action.adventureId, slot.id); return; }
                        chooseAdventure();
                    }, 0);
                }
                return;
            }
            default: return view.fx(name, data);
        }
    }
    let pendingFadeIn = false;

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
                if (pendingFadeIn) { pendingFadeIn = false; view.fx('fadeIn', { rate: 1.4 }); }
                else { view.fadeNow(0.85); view.fx('fadeIn', { rate: 2.6 }); ui.caption(WORDS.pages[G.sceneId], 2400); }
                audio?.setArea(G.flags.has('moon') ? 'final' : AREA[G.sceneId] || 'land');
            }
            const snap = snapshot(G.player, acc / STEP, G.terrain, G.time);
            view.render(dt, snap);
            if (table.shown) table.tick(dt); // the veil lifting off the world after the dive
            ui.setContext(G.context?.label, G.player.hidden, settings.holdToHide);
            const free = !ui.dialogueOpen() && !ui.panelOpen() && !G.busy;
            const promptable = inputDevice !== 'touch' && G.context?.label && !G.player.hidden && free && !story.running();
            const hs = promptable ? heroScreen() : null;
            ui.keyPrompt(hs ? { key: inputDevice === 'pad' ? 'X' : 'E', label: G.context.label, at: { x: hs.x, y: hs.y - HL * 0.8 * hs.scale } } : null);
            ui.guide.show(free);
            const obj = story.objective();
            if (settings.help === 'guided' && story.activePuzzle()) ui.guide.goal(story.hint({ peek: true }).text, obj?.text);
            else ui.guide.goal(obj?.why || '', obj?.text || null);
            remind(free);
            ui.guide.update();
            // an egg still flying to the count is counted when it lands there (view.mjs)
            ui.setEggs(G.eggs() - (view?.eggsArriving || 0), EGG_TOTAL);
            // a small chime as a flying egg lands in the count, one note higher for each egg
            if (view && view.eggsLanded > eggsLanded) { eggsLanded = view.eggsLanded; audio?.note?.(2 + (G.eggs() % 6), { inst: 'shell', vel: 0.5 }); }
            if (audio) {
                const p = G.player;
                audio.setMotion({ speed01: Math.min(1, Math.abs(p.vx) / 1200), underwater: p.mode === 'swim' && p.submerge > 0.7, hidden: p.hidden });
                audio.setEnvironment(p.mode === 'swim' ? 'kelp' : 'steppe');
            }
        } else if (mode === 'table') {
            presses.clear();
            audio?.setEnvironment('table');
            table.tick(dt);
            if (!table.opaque && view.sceneId) view.render(dt, snapshot(G.player, 0, G.terrain, G.time));
            const e = input.consume();
            if (ui.dialogueOpen() && (e.act || e.hop)) ui.advance();
        } else {
            presses.clear();
            input.consume();
        }
        app.render();
        ui.updateSpeaker(who, mode === 'table' ? table.speakerBounds(who) : mode === 'play' ? view.speakerBounds(who) : null);
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
            debugEl.textContent = `${fps.toFixed(0)} fps · cpu ${ms.toFixed(1)} ms · ${G?.sceneId} x=${p ? (p.x / HL).toFixed(1) : '-'} y=${p ? (p.y / HL).toFixed(1) : '-'} ${p?.mode || ''} · ägg ${G?.eggs()} · ${mode}`;
        }
    }

    // --------------------------------------------------------------------------------
    // Events → sound and captions
    // --------------------------------------------------------------------------------
    function wireEvents() {
        let inkT = 0;
        G.on('*', (type, e) => {
            if (!audio) return;
            switch (type) {
                case 'hoof': audio.sfx('hoof', { surface: e.hollow ? 'pier' : e.wading ? 'shallow' : e.surface === 'bark' ? 'plank' : e.surface, foot: e.foot, speed01: Math.min(1, e.speed / 1200) }); break;
                case 'splashIn': audio.sfx('splash', { size: e.size ?? 0.6 }); break;
                case 'splashOut': case 'swimEnd': audio.sfx('drip'); break;
                case 'dolphin': audio.sfx('splash', { size: 0.8 }); audio.stinger('leap'); break;
                case 'paddle': audio.sfx('swim', { pan: (e.side || 0) * 0.2, gain: e.surface ? 0.9 : 0.7 }); break;
                case 'streckStart': audio.sfx('pencil', { len: 0.8 }); break;
                case 'ink': if (G.time > inkT) { inkT = G.time + 0.18; audio.sfx('pencil', { len: 0.2 }); } break;
                case 'streckDone': audio.stinger('aha'); break;
                case 'leapStart': audio.sfx('whoosh'); if (e.big) audio.stinger('leap'); break;
                case 'land': audio.sfx(e.soft ? 'hoof' : 'thud', { surface: 'grass', speed01: 0.6 }); break;
                case 'balk': audio.sfx('snort'); break;
                case 'hop': audio.sfx('whoosh'); break;
                case 'hide': case 'rest': audio.sfx('thud'); break;
                case 'neigh': audio.sfx(e.under ? 'blubb' : 'neigh'); ui.caption(e.under ? CAPTIONS.blubb : CAPTIONS.neigh); break;
                case 'egg': audio.sfx('pickup'); audio.sfx('sparkle'); break;
                case 'drum': audio.sfx('ratchet'); break;
                case 'eggFall': audio.sfx('rustle'); break;
                case 'push': audio.sfx('thud'); break;
                case 'ballRoll': audio.sfx('rustle'); break;
                case 'ballSplash': audio.sfx('splash', { size: 0.7 }); break;
                case 'dug': audio.sfx('rustle'); break;
                case 'coin': audio.sfx('sparkle'); audio.stinger('discovery'); break;
                // each crystal plate has its own note: the xylophone Klo jokes about
                case 'crystalRing': audio.note?.(G.sceneDef.crystals?.notes?.[e.id] ?? 0, { inst: 'shell' }); break;
                case 'crystalSoft': case 'crystalWait': audio.note?.(G.sceneDef.crystals?.notes?.[e.id] ?? 0, { inst: 'shell', vel: 0.3 }); break;
                case 'crystalLit': audio.sfx('sparkle'); if (e.lit === e.of) audio.stinger('aha'); break;
                case 'seedsLit': audio.sfx('sparkle'); audio.stinger('aha'); break;
                case 'vine': audio.sfx('gate'); break;
                case 'trade': audio.sfx('sparkle'); break;
                case 'thunder': audio.sfx('wind', { gain: 0.5 + e.strength * 0.5 }); break;
                case 'clue': audio.sfx('write'); break;
                case 'bump': audio.sfx('thud'); break;
                case 'skid': audio.sfx('hoof', { surface: 'sand', speed01: 1 }); break;
            }
        });
        G.on('checkpoint', () => saveNow());
        G.on('flag', ({ flag }) => { if (!flag.startsWith('b:') && !flag.startsWith('t:') && !flag.startsWith('visited_')) progressAt = G.time; });
    }

    // --------------------------------------------------------------------------------
    // Menus and help
    // --------------------------------------------------------------------------------
    function placeName() {
        const id = [...(G?.areas || [])].reverse().find(a => WORDS.places[a]);
        return id ? WORDS.places[id] : WORDS.pages[G?.sceneId] || '';
    }
    function openJournal() {
        if (mode !== 'play' || ui.panelOpen()) return;
        pause(); audio?.sfx('page');
        ui.journal({ objective: story.objective(), clues: story.clues(), eggsFound: G.eggs(), total: EGG_TOTAL, hint: () => story.hint(), place: placeName(),
            hypothesis: story.hypothesis(), question: !G.flags.has('cloud_met'), places: story.places() });
    }
    // "Påminn mig om Klo": after a while with nothing solved, Klo offers the next hint once per puzzle
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
            // a recorded line is its own sound; the chirp and the pencil are for silent lines
            onSay: (who, text, voiced) => { if (!voiced) audio?.sfx(who === 'klo' || who === 'tukan' ? 'crabvoice' : 'write'); },
            onPencil: (len) => audio?.sfx('pencil', { len })
        };
    }
    function applySettings() {
        if (!['ask', 'remind', 'guided'].includes(settings.help)) settings.help = 'ask';
        if (G) G.lessMotion = !!settings.lessMotion;
        audio?.setVolumes({ music: settings.music, sfx: settings.sfx, voice: settings.voice });
        voice?.setEnabled(settings.voice > 0 && !paused); // a change made in the pause menu speaks again on resume
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

    // a paused game is silent, as in Äventyr 1 (src/main.mjs)
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
            try { table?.destroy(); } catch { /* ignore */ }
            try { view?.destroy(); } catch { /* ignore */ }
            try { await assets?.close(); } catch { /* ignore */ }
            try { app?.destroy(true, { children: true }); } catch { /* ignore */ }
            el?.remove();
            restoreHost();
            app = null; view = null; ui = null; input = null; audio = null; story = null; table = null; G = null; assets = null; voice = null;
            state = 'closed';
        })();
        const done = closing;
        done.then(() => { closing = null; });
        return done;
    }

    const api = { open, close, pause, resume, dispose: close, get state() { return state; },
        get debug() { return { G, view, ui, app, assets, story, input, table, heroScreen, get mode() { return mode; } }; } };
    window.__skoldhast2 = api;
    return api;
}
