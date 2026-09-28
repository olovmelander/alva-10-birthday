/*
 * MIRAS STJÄRNSAFARI – sound and music
 * ---------------------------------------------------------------------
 * Everything is synthesized with WebAudio: a music-box soundtrack for each
 * island, Mira's flute, animal voices and little effects. The page's own
 * background music is paused while Mira plays and restored afterwards.
 */
(function () {
    'use strict';

    const MS = window.MiraSafari;
    const { clamp } = MS.util;

    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    // "E5" -> 76, "F#4" -> 66, "Bb3" -> 58
    function noteNum(s) {
        const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
        if (!m) return null;
        return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    }
    // "E5:2 G5:2 -:4" -> [{n, len}] in 16th-note steps ('-' is a rest)
    function seq(str) {
        return str.trim().split(/\s+/).filter((t) => t !== '|').map((tok) => {
            const [n, len] = tok.split(':');
            return { n: n === '-' ? null : noteNum(n), len: Number(len || 2) };
        });
    }

    // =====================================================================
    // Songs: chords (one per bar), an arpeggio shape, a melody and a groove
    // =====================================================================
    const SONGS = {
        title: {
            bpm: 78, swing: 0, inst: 'musicbox', pad: true, bass: true,
            chords: [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']],
            arp: [0, 1, 2, 1, 3, 2, 1, 2],
            melody: seq('E5:4 G5:2 E5:2 D5:4 C5:4 | C5:4 E5:2 A5:6 G5:4 | F5:4 A5:2 C6:6 A5:4 | G5:6 B4:2 D5:4 -:4'),
            flute: 'E5 G5 A5 G5 E5 D5 C5'
        },
        meadow: {
            bpm: 100, inst: 'musicbox', pad: true, bass: true, perc: 'shaker',
            chords: [['G3', 'B3', 'D4'], ['E3', 'G3', 'B3'], ['C4', 'E4', 'G4'], ['D4', 'F#4', 'A4']],
            arp: [0, 2, 1, 2, 3, 2, 1, 2],
            melody: seq('D5:2 G5:2 B5:4 A5:2 G5:2 | E5:4 G5:2 E5:2 D5:4 B4:4 | C5:2 E5:2 G5:4 A5:2 G5:2 | F#5:4 A5:2 F#5:2 D5:8'),
            lead: 'flute',
            flute: 'D5 G5 A5 B5 D6 B5 G5'
        },
        forest: {
            bpm: 84, inst: 'kalimba', pad: true, bass: true, perc: 'wood',
            chords: [['D3', 'F3', 'A3'], ['F3', 'A3', 'C4'], ['C3', 'E3', 'G3'], ['G3', 'B3', 'D4']],
            arp: [0, 1, 2, 3, 2, 1, 0, 1],
            melody: seq('A4:4 D5:2 E5:2 F5:4 E5:4 | C5:4 F5:2 G5:2 A5:6 -:2 | G5:4 E5:2 C5:2 E5:4 G5:4 | B4:4 D5:4 A4:8'),
            flute: 'D5 F5 G5 A5 C6 A5 D5'
        },
        lake: {
            bpm: 70, inst: 'harp', pad: true, bass: true,
            chords: [['F3', 'A3', 'C4', 'E4'], ['D3', 'F3', 'A3', 'C4'], ['Bb2', 'D3', 'F3', 'A3'], ['C3', 'E3', 'G3', 'Bb3']],
            arp: [0, 1, 2, 3, 4, 3, 2, 1],
            melody: seq('A5:6 G5:2 F5:4 C5:4 | D5:6 E5:2 F5:4 A5:4 | Bb5:6 A5:2 F5:4 D5:4 | E5:4 G5:4 C5:8'),
            flute: 'C5 F5 G5 A5 C6 A5 F5'
        },
        savanna: {
            bpm: 104, inst: 'marimba', pad: false, bass: true, perc: 'drums',
            chords: [['C4', 'E4', 'G4'], ['Bb3', 'D4', 'F4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4']],
            arp: [0, 1, 2, 1, 0, 2, 1, 2],
            melody: seq('G5:2 G5:2 E5:2 G5:2 A5:4 G5:4 | F5:2 F5:2 D5:2 F5:2 Bb5:4 A5:4 | A5:2 C6:2 A5:2 F5:2 G5:4 F5:4 | E5:4 D5:2 E5:2 C5:8'),
            lead: 'marimba',
            flute: 'C5 E5 G5 Bb5 C6 G5 E5'
        },
        jungle: {
            bpm: 96, inst: 'marimba', pad: true, bass: true, perc: 'bongo',
            chords: [['A3', 'C4', 'E4'], ['G3', 'B3', 'D4'], ['F3', 'A3', 'C4'], ['E3', 'G#3', 'B3']],
            arp: [0, 2, 1, 2, 0, 3, 2, 1],
            melody: seq('E5:2 A5:2 G5:2 E5:2 D5:4 C5:4 | D5:2 G5:2 E5:2 D5:2 B4:8 | C5:2 F5:2 E5:2 C5:2 A4:4 C5:4 | B4:4 E5:4 G#5:8'),
            flute: 'A4 C5 D5 E5 G5 E5 A5'
        },
        arctic: {
            bpm: 64, inst: 'bell', pad: true, bass: true, shimmer: true,
            chords: [['E3', 'G3', 'B3'], ['C3', 'E3', 'G3', 'B3'], ['G3', 'B3', 'D4'], ['D3', 'F#3', 'A3']],
            arp: [0, 2, 3, 2, 1, 2, 3, 2],
            melody: seq('B5:8 G5:4 E5:4 | E5:6 G5:2 B5:8 | D6:6 B5:2 G5:4 D5:4 | F#5:8 A5:8'),
            flute: 'E5 G5 A5 B5 D6 B5 E6'
        },
        star: {
            bpm: 70, inst: 'celesta', pad: true, bass: true, shimmer: true,
            chords: [['F3', 'A3', 'C4', 'E4'], ['G3', 'B3', 'D4', 'F4'], ['E3', 'G3', 'B3', 'D4'], ['A3', 'C4', 'E4', 'G4']],
            arp: [0, 1, 2, 3, 4, 3, 2, 1],
            melody: seq('C6:4 B5:4 A5:4 E5:4 | D5:4 G5:4 B5:8 | B5:4 A5:4 G5:4 E5:4 | A5:6 C6:2 E6:8'),
            flute: 'F5 A5 B5 C6 E6 C6 A5'
        },
        fishing: {
            bpm: 76, inst: 'guitar', pad: true, bass: true,
            chords: [['G3', 'B3', 'D4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'], ['D3', 'F#3', 'A3']],
            arp: [0, 1, 2, 3, 2, 1, 2, 1],
            melody: seq('B4:4 D5:4 G5:6 -:2 | E5:4 G5:4 C5:6 -:2 | D5:4 B4:4 G4:6 -:2 | F#4:4 A4:4 D5:6 -:2'),
            flute: 'G4 B4 D5 G5 B5 G5 D5'
        },
        finale: {
            bpm: 72, inst: 'bell', pad: true, bass: true, shimmer: true, perc: 'soft',
            chords: [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']],
            arp: [0, 1, 2, 3, 2, 1, 2, 3],
            melody: seq('E5:4 G5:2 E5:2 D5:4 C5:4 | C5:4 E5:2 A5:6 G5:4 | F5:4 A5:2 C6:6 A5:4 | G5:6 B5:2 C6:8'),
            lead: 'flute',
            flute: 'E5 G5 A5 C6 E6 C6 G5'
        }
    };

    // =====================================================================
    // The engine
    // =====================================================================
    function pageMusic() {
        try {
            return typeof bgMusic !== 'undefined' ? bgMusic : null;
        } catch (error) {
            return null;
        }
    }

    const audio = {
        ctx: null,
        out: null,
        music: null,
        sfxBus: null,
        verb: null,
        noiseBuf: null,
        sfxOn: true,
        musicOn: true,
        song: null,
        songId: null,
        step: 0,
        nextTime: 0,
        timer: null,
        pageState: null,
        duckUntil: 0,

        context() {
            let ctx = null;
            try {
                ctx = typeof audioCtx !== 'undefined' ? audioCtx : null;
            } catch (error) {
                ctx = null;
            }
            if (!ctx) {
                const Ctor = window.AudioContext || window.webkitAudioContext;
                if (!Ctor) return null;
                if (!this.ownCtx) this.ownCtx = new Ctor();
                ctx = this.ownCtx;
                try {
                    if (typeof audioCtx !== 'undefined' && !audioCtx) audioCtx = ctx;
                } catch (error) {
                    // no shared context on this page
                }
            }
            if (ctx !== this.ctx) this.setup(ctx);
            return ctx;
        },

        setup(ctx) {
            this.ctx = ctx;
            this.out = ctx.createGain();
            this.out.gain.value = 0.9;
            this.out.connect(ctx.destination);
            this.music = ctx.createGain();
            this.music.gain.value = this.musicOn ? 0.5 : 0;
            this.music.connect(this.out);
            this.sfxBus = ctx.createGain();
            this.sfxBus.gain.value = this.sfxOn ? 0.8 : 0;
            this.sfxBus.connect(this.out);
            // a soft generated reverb for that dreamy music-box sound
            this.verb = ctx.createConvolver();
            this.verb.buffer = this.impulse(2.6);
            const verbOut = ctx.createGain();
            verbOut.gain.value = 0.55;
            this.verb.connect(verbOut);
            verbOut.connect(this.out);
            this.verbSend = ctx.createGain();
            this.verbSend.gain.value = 1;
            this.verbSend.connect(this.verb);
            this.noiseBuf = null;
        },

        impulse(seconds) {
            const ctx = this.ctx;
            const len = Math.floor(ctx.sampleRate * seconds);
            const buf = ctx.createBuffer(2, len, ctx.sampleRate);
            for (let ch = 0; ch < 2; ch += 1) {
                const d = buf.getChannelData(ch);
                for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
            }
            return buf;
        },

        noise() {
            if (this.noiseBuf) return this.noiseBuf;
            const ctx = this.ctx;
            const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
            this.noiseBuf = buf;
            return buf;
        },

        resume() {
            const ctx = this.context();
            if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
        },

        setMusic(on) {
            this.musicOn = on;
            if (this.music) this.music.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.2);
        },

        setSfx(on) {
            this.sfxOn = on;
            if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05);
        },

        // The page's music pauses while Mira plays; leaving restores it.
        enterGame() {
            const m = pageMusic();
            if (m) {
                this.pageState = { paused: m.paused };
                try {
                    m.pause();
                } catch (error) {
                    // ignore
                }
            }
            this.resume();
        },

        leaveGame() {
            this.stopSong();
            this.stopAmbience();
            const m = pageMusic();
            if (m && this.pageState && !this.pageState.paused) m.play().catch(() => {});
            this.pageState = null;
        },

        // --- instruments -------------------------------------------------------
        voiceOsc(type, freq, t, { dest, gain = 0.1, attack = 0.005, decay = 0.6, detune = 0, slide = 0, slideTime = 0.1, verb = 0.3, pan = 0 } = {}) {
            const ctx = this.ctx;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = type;
            o.frequency.setValueAtTime(freq, t);
            if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + slideTime);
            o.detune.value = detune;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(gain, t + attack);
            g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
            o.connect(g);
            let node = g;
            if (pan && ctx.createStereoPanner) {
                const p = ctx.createStereoPanner();
                p.pan.value = pan;
                g.connect(p);
                node = p;
            }
            node.connect(dest || this.music);
            if (verb) {
                const s = ctx.createGain();
                s.gain.value = verb;
                node.connect(s);
                s.connect(this.verbSend);
            }
            o.start(t);
            o.stop(t + attack + decay + 0.05);
            return o;
        },

        pluck(inst, n, t, vel = 1, dest) {
            const f = midi(n);
            const v = vel;
            switch (inst) {
                case 'musicbox':
                    this.voiceOsc('sine', f, t, { dest, gain: 0.09 * v, decay: 1.1, verb: 0.45 });
                    this.voiceOsc('triangle', f * 2, t, { dest, gain: 0.025 * v, decay: 0.35, verb: 0.3 });
                    break;
                case 'kalimba':
                    this.voiceOsc('sine', f * 1.01, t, { dest, gain: 0.1 * v, decay: 0.8, slide: f, slideTime: 0.02, verb: 0.35 });
                    this.voiceOsc('sine', f * 3.1, t, { dest, gain: 0.015 * v, decay: 0.12, verb: 0.1 });
                    break;
                case 'harp':
                    this.voiceOsc('triangle', f, t, { dest, gain: 0.08 * v, decay: 1.4, verb: 0.5 });
                    this.voiceOsc('sine', f * 2, t, { dest, gain: 0.02 * v, decay: 0.6, verb: 0.3 });
                    break;
                case 'marimba':
                    this.voiceOsc('sine', f, t, { dest, gain: 0.12 * v, decay: 0.42, verb: 0.2 });
                    this.voiceOsc('sine', f * 4, t, { dest, gain: 0.02 * v, decay: 0.05, verb: 0 });
                    break;
                case 'bell':
                    this.voiceOsc('sine', f, t, { dest, gain: 0.07 * v, decay: 2, verb: 0.6 });
                    this.voiceOsc('sine', f * 2.76, t, { dest, gain: 0.018 * v, decay: 0.7, verb: 0.5 });
                    this.voiceOsc('sine', f * 5.4, t, { dest, gain: 0.008 * v, decay: 0.3, verb: 0.4 });
                    break;
                case 'celesta':
                    this.voiceOsc('sine', f * 2, t, { dest, gain: 0.07 * v, decay: 1.3, verb: 0.6 });
                    this.voiceOsc('triangle', f * 4, t, { dest, gain: 0.012 * v, decay: 0.3, verb: 0.4 });
                    break;
                case 'guitar':
                    this.voiceOsc('triangle', f, t, { dest, gain: 0.08 * v, decay: 0.9, verb: 0.3 });
                    this.voiceOsc('sawtooth', f, t, { dest, gain: 0.012 * v, decay: 0.25, verb: 0.1 });
                    break;
                case 'flute':
                default:
                    this.flute(f, t, 0.5, 0.07 * v, dest);
            }
        },

        flute(f, t, dur, gain = 0.07, dest) {
            const ctx = this.ctx;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            const vib = ctx.createOscillator();
            const vibG = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = f;
            vib.frequency.value = 5.2;
            vibG.gain.value = f * 0.008;
            vib.connect(vibG);
            vibG.connect(o.frequency);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(gain, t + 0.06);
            g.gain.setValueAtTime(gain, t + dur * 0.7);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
            o.connect(g);
            g.connect(dest || this.music);
            const s = ctx.createGain();
            s.gain.value = 0.35;
            g.connect(s);
            s.connect(this.verbSend);
            // a breath of air
            const nz = ctx.createBufferSource();
            nz.buffer = this.noise();
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = f * 2;
            bp.Q.value = 3;
            const ng = ctx.createGain();
            ng.gain.setValueAtTime(0.0001, t);
            ng.gain.exponentialRampToValueAtTime(gain * 0.25, t + 0.03);
            ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
            nz.connect(bp);
            bp.connect(ng);
            ng.connect(dest || this.music);
            o.start(t);
            vib.start(t);
            nz.start(t);
            o.stop(t + dur + 0.2);
            vib.stop(t + dur + 0.2);
            nz.stop(t + 0.2);
        },

        pad(notes, t, dur, gain = 0.028) {
            const ctx = this.ctx;
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 900;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
            g.gain.setValueAtTime(gain, t + dur * 0.7);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
            lp.connect(g);
            g.connect(this.music);
            const s = ctx.createGain();
            s.gain.value = 0.6;
            g.connect(s);
            s.connect(this.verbSend);
            for (const n of notes) {
                for (const det of [-7, 7]) {
                    const o = ctx.createOscillator();
                    o.type = 'triangle';
                    o.frequency.value = midi(n);
                    o.detune.value = det;
                    o.connect(lp);
                    o.start(t);
                    o.stop(t + dur + 0.5);
                }
            }
        },

        hit(kind, t, gain = 1, dest) {
            const ctx = this.ctx;
            const d = dest || this.music;
            if (kind === 'kick') {
                this.voiceOsc('sine', 120, t, { dest: d, gain: 0.16 * gain, decay: 0.25, slide: 45, slideTime: 0.18, verb: 0 });
                return;
            }
            const src = ctx.createBufferSource();
            src.buffer = this.noise();
            const f = ctx.createBiquadFilter();
            const g = ctx.createGain();
            const dur = { shaker: 0.06, hat: 0.04, wood: 0.05, bongo: 0.12, rim: 0.03 }[kind] || 0.05;
            if (kind === 'shaker' || kind === 'hat') {
                f.type = 'highpass';
                f.frequency.value = 6000;
            } else if (kind === 'wood') {
                f.type = 'bandpass';
                f.frequency.value = 1800;
                f.Q.value = 6;
            } else if (kind === 'bongo') {
                f.type = 'bandpass';
                f.frequency.value = 380 + Math.random() * 120;
                f.Q.value = 8;
            } else {
                f.type = 'bandpass';
                f.frequency.value = 2400;
            }
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.12 * gain, t + 0.004);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(f);
            f.connect(g);
            g.connect(d);
            src.start(t, Math.random() * 0.5);
            src.stop(t + dur + 0.02);
            if (kind === 'bongo') this.voiceOsc('sine', 220 + Math.random() * 60, t, { dest: d, gain: 0.08 * gain, decay: 0.14, slide: 160, slideTime: 0.1, verb: 0.05 });
        },

        // --- the sequencer ------------------------------------------------------
        playSong(id, { fade = 0.8 } = {}) {
            const ctx = this.context();
            if (!ctx) return;
            if (this.songId === id && this.timer) return;
            this.stopSong(fade);
            const song = SONGS[id];
            if (!song) return;
            this.song = song;
            this.songId = id;
            this.step = 0;
            this.melodyIdx = 0;
            this.melodyLeft = 0;
            this.nextTime = ctx.currentTime + 0.15;
            // a fresh bus per song so the old one can fade out
            this.songBus = ctx.createGain();
            this.songBus.gain.setValueAtTime(0.0001, ctx.currentTime);
            this.songBus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + fade);
            this.songBus.connect(this.music);
            this.timer = setInterval(() => this.schedule(), 40);
            this.schedule();
        },

        stopSong(fade = 0.6) {
            if (this.timer) clearInterval(this.timer);
            this.timer = null;
            if (this.songBus && this.ctx) {
                const bus = this.songBus;
                const now = this.ctx.currentTime;
                bus.gain.cancelScheduledValues(now);
                bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
                bus.gain.exponentialRampToValueAtTime(0.0001, now + fade);
                setTimeout(() => bus.disconnect(), (fade + 0.3) * 1000);
            }
            this.songBus = null;
            this.songId = null;
        },

        schedule() {
            const ctx = this.ctx;
            const song = this.song;
            if (!ctx || !song || !this.songBus) return;
            const stepDur = 60 / song.bpm / 4;
            while (this.nextTime < ctx.currentTime + 0.25) {
                this.playStep(song, this.step, this.nextTime, stepDur);
                this.step += 1;
                this.nextTime += stepDur;
            }
        },

        playStep(song, step, t, stepDur) {
            const bus = this.songBus;
            const bar = Math.floor(step / 16) % song.chords.length;
            const s16 = step % 16;
            const chord = song.chords[bar].map(noteNum);
            const ducked = this.ctx.currentTime < this.duckUntil;
            const vel = ducked ? 0.35 : 1;
            // pad and bass on the bar
            if (s16 === 0) {
                if (song.pad) this.pad(chord, t, stepDur * 16, song.shimmer ? 0.03 : 0.024);
                if (song.bass) this.voiceOsc('sine', midi(chord[0] - 12), t, { dest: bus, gain: 0.1 * vel, decay: stepDur * 12, attack: 0.02, verb: 0.1 });
            }
            if (song.bass && s16 === 8) this.voiceOsc('sine', midi(chord[0] - 12 + (song.chords[bar].length > 3 ? 7 : 0)), t, { dest: bus, gain: 0.07 * vel, decay: stepDur * 6, attack: 0.02, verb: 0.1 });
            // arpeggio on eighth notes
            if (s16 % 2 === 0) {
                const i = song.arp[(s16 / 2) % song.arp.length];
                const n = chord[i % chord.length] + (i >= chord.length ? 12 : 0) + 12;
                this.pluck(song.inst, n, t, 0.55 * vel, bus);
            }
            // melody (skips every other round so it breathes)
            const round = Math.floor(step / (16 * song.chords.length));
            if (round % 2 === 0) {
                if (this.melodyLeft <= 0) {
                    const note = song.melody[this.melodyIdx % song.melody.length];
                    this.melodyIdx += 1;
                    this.melodyLeft = note.len;
                    if (note.n !== null) {
                        if (song.lead === 'flute') this.flute(midi(note.n), t, stepDur * note.len * 0.9, 0.045 * vel, bus);
                        else this.pluck(song.lead || song.inst, note.n, t, 0.9 * vel, bus);
                    }
                }
                this.melodyLeft -= 1;
            } else {
                this.melodyIdx = 0;
                this.melodyLeft = 0;
                if (song.shimmer && s16 % 4 === 2 && Math.random() < 0.4) this.pluck('celesta', chord[Math.floor(Math.random() * chord.length)] + 24, t, 0.3 * vel, bus);
            }
            // groove
            const p = song.perc;
            if (p === 'shaker' && s16 % 2 === 1) this.hit('shaker', t, 0.35 * vel, bus);
            if (p === 'wood' && (s16 === 4 || s16 === 12 || s16 === 14)) this.hit('wood', t, 0.5 * vel, bus);
            if (p === 'drums') {
                if (s16 === 0 || s16 === 10) this.hit('kick', t, 0.8 * vel, bus);
                if (s16 % 4 === 2) this.hit('shaker', t, 0.4 * vel, bus);
                if (s16 === 6 || s16 === 14) this.hit('bongo', t, 0.5 * vel, bus);
            }
            if (p === 'bongo' && [0, 3, 6, 10, 12].includes(s16)) this.hit('bongo', t, 0.45 * vel, bus);
            if (p === 'soft' && s16 === 0) this.hit('kick', t, 0.5 * vel, bus);
        },

        // Mira's flute: a short tune in the island's key, the music ducks under it
        playFlute(songId) {
            const ctx = this.context();
            if (!ctx) return;
            const song = SONGS[songId] || SONGS.title;
            const notes = (song.flute || 'C5 E5 G5 E5 C6').split(' ').map(noteNum);
            const t0 = ctx.currentTime + 0.05;
            const beat = 0.42;
            const rhythm = [1, 1, 1, 1, 1, 1, 2];
            let t = t0;
            notes.forEach((n, i) => {
                const d = beat * (rhythm[i] || 1);
                this.flute(midi(n), t, d * 0.95, 0.09, this.sfxBus);
                t += d;
            });
            this.duckUntil = t;
        },

        // --- ambience: a soft bed of sound for each island --------------------------
        setAmbience(kind) {
            const ctx = this.context();
            if (!ctx) return;
            if (this.ambKind === kind) return;
            this.stopAmbience();
            this.ambKind = kind;
            if (!kind) return;
            const bus = ctx.createGain();
            bus.gain.setValueAtTime(0.0001, ctx.currentTime);
            bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.5);
            bus.connect(this.sfxBus);
            this.ambBus = bus;
            // a continuous bed of filtered noise (wind, water, rain)
            const bed = { birds: [500, 0.012, 'lowpass'], forest: [900, 0.016, 'bandpass'], water: [520, 0.03, 'lowpass'], savanna: [700, 0.012, 'lowpass'], rain: [2400, 0.05, 'highpass'], wind: [600, 0.04, 'bandpass'], star: [300, 0.006, 'lowpass'] }[kind];
            if (bed) {
                const src = ctx.createBufferSource();
                src.buffer = this.noise();
                src.loop = true;
                const f = ctx.createBiquadFilter();
                f.type = bed[2];
                f.frequency.value = bed[0];
                f.Q.value = bed[2] === 'bandpass' ? 0.8 : 0.5;
                const g = ctx.createGain();
                g.gain.value = bed[1];
                // slow swells (waves, gusts)
                const lfo = ctx.createOscillator();
                const lg = ctx.createGain();
                lfo.frequency.value = kind === 'water' ? 0.25 : kind === 'wind' ? 0.12 : 0.08;
                lg.gain.value = bed[1] * 0.6;
                lfo.connect(lg);
                lg.connect(g.gain);
                if (kind === 'wind') {
                    const flfo = ctx.createOscillator();
                    const fg = ctx.createGain();
                    flfo.frequency.value = 0.07;
                    fg.gain.value = 300;
                    flfo.connect(fg);
                    fg.connect(f.frequency);
                    flfo.start();
                    this.ambNodes = [flfo];
                }
                src.connect(f);
                f.connect(g);
                g.connect(bus);
                src.start();
                lfo.start();
                this.ambNodes = (this.ambNodes || []).concat([src, lfo]);
            }
            // little events: birds, crickets, drips, twinkles
            this.ambTimer = setInterval(() => this.ambEvent(), 250);
        },

        ambEvent() {
            const ctx = this.ctx;
            if (!ctx || !this.ambBus || !this.sfxOn) return;
            const t = ctx.currentTime + 0.02;
            const k = this.ambKind;
            const d = this.ambBus;
            const r = Math.random();
            const pan = Math.random() * 1.6 - 0.8;
            const o = (type, f, opts) => this.voiceOsc(type, f, t + (opts.delay || 0), { dest: d, verb: 0.35, pan, ...opts });
            if ((k === 'birds' || k === 'forest') && r < (k === 'birds' ? 0.12 : 0.07)) {
                // a little songbird phrase
                const base = 2200 + Math.random() * 1800;
                const n = 2 + Math.floor(Math.random() * 4);
                for (let i = 0; i < n; i += 1) o('sine', base * (1 + (Math.random() - 0.5) * 0.3), { gain: 0.018, decay: 0.07, slide: base * (1.2 + Math.random() * 0.3), slideTime: 0.05, delay: i * (0.09 + Math.random() * 0.05) });
            }
            if (k === 'forest' && r > 0.985) {
                for (let i = 0; i < 6; i += 1) this.noiseHit(t + i * 0.07, { f: 1600, q: 4, gain: 0.02, dur: 0.02, dest: d });
            }
            if (k === 'water' && r < 0.06) o('sine', 600 + Math.random() * 500, { gain: 0.02, decay: 0.08, slide: 1200 + Math.random() * 600, slideTime: 0.06 });
            if (k === 'savanna' && r < 0.3) {
                // crickets
                for (let i = 0; i < 3; i += 1) o('sine', 4200 + Math.random() * 300, { gain: 0.008, decay: 0.03, delay: i * 0.06, verb: 0.1 });
            }
            if (k === 'rain' && r < 0.2) o('sine', 1800 + Math.random() * 1400, { gain: 0.01, decay: 0.03, slide: 900, slideTime: 0.03, verb: 0.2 });
            if (k === 'star' && r < 0.08) o('sine', 1760 * Math.pow(2, Math.floor(Math.random() * 8) / 12), { gain: 0.012, decay: 1.2, verb: 0.8 });
            if (k === 'wind' && r < 0.03) o('sine', 2600 + Math.random() * 800, { gain: 0.006, decay: 0.6, verb: 0.8 });
        },

        stopAmbience() {
            clearInterval(this.ambTimer);
            this.ambTimer = null;
            for (const n of this.ambNodes || []) {
                try {
                    n.stop();
                } catch (error) {
                    // already stopped
                }
            }
            this.ambNodes = [];
            if (this.ambBus && this.ctx) {
                const bus = this.ambBus;
                bus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
                setTimeout(() => bus.disconnect(), 1500);
            }
            this.ambBus = null;
            this.ambKind = null;
        },

        // --- effects and animal voices -------------------------------------------
        sfx(name, { pan = 0, voice = null } = {}) {
            const ctx = this.context();
            if (!ctx || !this.sfxOn) return;
            const t = ctx.currentTime + 0.01;
            const d = this.sfxBus;
            const o = (type, f, opts) => this.voiceOsc(type, f, t + (opts.delay || 0), { dest: d, verb: 0.15, pan, ...opts });
            switch (name) {
                case 'shutter':
                    this.noiseHit(t, { f: 3200, q: 1, gain: 0.18, dur: 0.05, dest: d });
                    this.noiseHit(t + 0.07, { f: 1800, q: 2, gain: 0.12, dur: 0.06, dest: d });
                    o('square', 1800, { gain: 0.03, decay: 0.03, verb: 0 });
                    break;
                case 'star1':
                    o('sine', 1318, { gain: 0.09, decay: 0.5 });
                    break;
                case 'star2':
                    o('sine', 1568, { gain: 0.09, decay: 0.5 });
                    break;
                case 'star3':
                    o('sine', 2093, { gain: 0.1, decay: 0.8, verb: 0.4 });
                    o('sine', 2637, { gain: 0.05, decay: 0.6, delay: 0.05, verb: 0.4 });
                    break;
                case 'newAnimal':
                    [0, 4, 7, 12].forEach((s, i) => o('triangle', midi(76 + s), { gain: 0.08, decay: 0.3, delay: i * 0.08, verb: 0.3 }));
                    break;
                case 'throw':
                    this.noiseHit(t, { f: 900, q: 0.8, gain: 0.08, dur: 0.18, slide: 2200, dest: d });
                    break;
                case 'thud':
                    o('sine', 180, { gain: 0.12, decay: 0.1, slide: 90, verb: 0 });
                    break;
                case 'plop':
                    o('sine', 500, { gain: 0.12, decay: 0.12, slide: 1200, slideTime: 0.08 });
                    break;
                case 'munch':
                    for (let i = 0; i < 3; i += 1) this.noiseHit(t + i * 0.14, { f: 1200, q: 2, gain: 0.09, dur: 0.05, dest: d });
                    break;
                case 'bubbles':
                    for (let i = 0; i < 5; i += 1) o('sine', 700 + Math.random() * 500, { gain: 0.05, decay: 0.08, slide: 1400, slideTime: 0.06, delay: i * 0.09 });
                    break;
                case 'bubblePop':
                    o('sine', 1600 + Math.random() * 600, { gain: 0.05, decay: 0.05, slide: 700, slideTime: 0.04, verb: 0.1 });
                    break;
                case 'boing':
                    o('sine', 300, { gain: 0.06, decay: 0.2, slide: 700, slideTime: 0.15 });
                    break;
                case 'lick':
                    o('sine', 300, { gain: 0.08, decay: 0.3, slide: 180, slideTime: 0.25 });
                    this.noiseHit(t + 0.1, { f: 1400, q: 3, gain: 0.05, dur: 0.2, dest: d });
                    break;
                case 'pop':
                    o('sine', 900, { gain: 0.1, decay: 0.08, slide: 300 });
                    break;
                case 'cheer':
                    [0, 4, 7].forEach((s, i) => o('triangle', midi(72 + s), { gain: 0.07, decay: 0.25, delay: i * 0.07 }));
                    break;
                case 'splash':
                    this.noiseHit(t, { f: 800, q: 0.6, gain: 0.2, dur: 0.6, slide: 300, dest: d });
                    break;
                case 'secret':
                    [0, 7, 12, 16, 19].forEach((s, i) => o('sine', midi(79 + s), { gain: 0.06, decay: 0.5, delay: i * 0.06, verb: 0.5 }));
                    break;
                case 'reward':
                    [0, 4, 7, 12, 16, 12].forEach((s, i) => o('triangle', midi(72 + s), { gain: 0.08, decay: 0.35, delay: i * 0.1, verb: 0.4 }));
                    break;
                case 'ui':
                    o('square', 880, { gain: 0.03, decay: 0.05, verb: 0 });
                    break;
                case 'reel':
                    this.noiseHit(t, { f: 2600, q: 5, gain: 0.05, dur: 0.03, dest: d });
                    break;
                case 'bite':
                    o('sine', 400, { gain: 0.12, decay: 0.15, slide: 900, slideTime: 0.1 });
                    this.noiseHit(t, { f: 900, q: 1, gain: 0.12, dur: 0.2, dest: d });
                    break;
                case 'cast':
                    this.noiseHit(t, { f: 1500, q: 1, gain: 0.08, dur: 0.3, slide: 500, dest: d });
                    break;
                case 'catch':
                    [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => o('triangle', midi(67 + s), { gain: 0.09, decay: 0.3, delay: i * 0.09, verb: 0.4 }));
                    break;
                case 'whoosh':
                    this.noiseHit(t, { f: 400, q: 0.7, gain: 0.1, dur: 0.8, slide: 1600, dest: d });
                    break;
                case 'twinkle':
                    [0, 5, 9].forEach((s, i) => o('sine', midi(88 + s), { gain: 0.05, decay: 0.4, delay: i * 0.09, verb: 0.6 }));
                    break;
                case 'voice':
                    this.animal(voice, t, pan);
                    break;
                default:
                    break;
            }
        },

        noiseHit(t, { f = 1000, q = 1, gain = 0.1, dur = 0.1, slide = 0, dest, type = 'bandpass' } = {}) {
            const ctx = this.ctx;
            const src = ctx.createBufferSource();
            src.buffer = this.noise();
            const filt = ctx.createBiquadFilter();
            filt.type = type;
            filt.frequency.setValueAtTime(f, t);
            if (slide) filt.frequency.exponentialRampToValueAtTime(slide, t + dur);
            filt.Q.value = q;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(filt);
            filt.connect(g);
            g.connect(dest || this.sfxBus);
            src.start(t, Math.random() * 0.5);
            src.stop(t + dur + 0.05);
        },

        animal(voice, t, pan = 0) {
            if (!voice || !this.ctx) return;
            const d = this.sfxBus;
            const o = (type, f, opts) => this.voiceOsc(type, f, t + (opts.delay || 0), { dest: d, verb: 0.2, pan, ...opts });
            const vib = (type, f, dur, gain, rate = 6, depth = 0.03, extra = {}) => {
                const ctx = this.ctx;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                const lfo = ctx.createOscillator();
                const lg = ctx.createGain();
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = extra.lp || 1800;
                osc.type = type;
                osc.frequency.setValueAtTime(f, t);
                if (extra.slide) osc.frequency.exponentialRampToValueAtTime(extra.slide, t + dur);
                lfo.frequency.value = rate;
                lg.gain.value = f * depth;
                lfo.connect(lg);
                lg.connect(osc.frequency);
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(gain, t + 0.04);
                g.gain.setValueAtTime(gain, t + dur * 0.7);
                g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                osc.connect(lp);
                lp.connect(g);
                g.connect(d);
                osc.start(t);
                lfo.start(t);
                osc.stop(t + dur + 0.05);
                lfo.stop(t + dur + 0.05);
            };
            switch (voice) {
                case 'squeak': o('sine', 1400, { gain: 0.06, decay: 0.08, slide: 2000, slideTime: 0.06 }); o('sine', 1600, { gain: 0.05, decay: 0.07, slide: 2200, slideTime: 0.05, delay: 0.1 }); break;
                case 'baa': vib('sawtooth', 320, 0.55, 0.06, 7, 0.05, { lp: 1600 }); break;
                case 'baaSmall': vib('sawtooth', 460, 0.4, 0.05, 8, 0.05, { lp: 2000 }); break;
                case 'moo': vib('sawtooth', 130, 0.9, 0.08, 3, 0.02, { lp: 500, slide: 105 }); break;
                case 'neigh': vib('square', 900, 0.6, 0.04, 14, 0.08, { lp: 2200, slide: 420 }); break;
                case 'quack': o('square', 520, { gain: 0.05, decay: 0.12, slide: 380 }); o('square', 500, { gain: 0.05, decay: 0.12, slide: 360, delay: 0.16 }); break;
                case 'peep': o('sine', 2400, { gain: 0.04, decay: 0.06, slide: 3000, slideTime: 0.05 }); o('sine', 2500, { gain: 0.04, decay: 0.06, slide: 3100, slideTime: 0.05, delay: 0.12 }); break;
                case 'flutter': this.noiseHit(t, { f: 3000, q: 4, gain: 0.03, dur: 0.15 }); o('sine', 3200, { gain: 0.02, decay: 0.1, delay: 0.05 }); break;
                case 'snuffle': for (let i = 0; i < 3; i += 1) this.noiseHit(t + i * 0.09, { f: 700, q: 2, gain: 0.07, dur: 0.06 }); break;
                case 'meow': o('triangle', 620, { gain: 0.07, decay: 0.4, slide: 880, slideTime: 0.18 }); break;
                case 'mew': o('triangle', 820, { gain: 0.06, decay: 0.3, slide: 1100, slideTime: 0.12 }); break;
                case 'purr': vib('sawtooth', 70, 0.7, 0.07, 24, 0.3, { lp: 400 }); break;
                case 'purrDeep': vib('sawtooth', 52, 0.95, 0.08, 19, 0.3, { lp: 330 }); break;
                case 'chitter': for (let i = 0; i < 6; i += 1) o('sine', 2200 + Math.random() * 400, { gain: 0.035, decay: 0.03, delay: i * 0.05 }); break;
                case 'soft': this.noiseHit(t, { f: 900, q: 1, gain: 0.05, dur: 0.3 }); break;
                case 'yip': o('sine', 900, { gain: 0.06, decay: 0.1, slide: 1300 }); o('sine', 950, { gain: 0.06, decay: 0.1, slide: 1350, delay: 0.14 }); break;
                case 'hoot': o('sine', 420, { gain: 0.08, decay: 0.3, slide: 390 }); o('sine', 400, { gain: 0.08, decay: 0.45, slide: 360, delay: 0.38 }); break;
                case 'growl': vib('sawtooth', 95, 0.6, 0.07, 18, 0.12, { lp: 500 }); break;
                case 'bellow': vib('sawtooth', 110, 1.1, 0.08, 4, 0.03, { lp: 600, slide: 80 }); break;
                case 'peck': for (let i = 0; i < 5; i += 1) this.noiseHit(t + i * 0.06, { f: 2500, q: 3, gain: 0.06, dur: 0.02 }); break;
                case 'honk': o('square', 360, { gain: 0.05, decay: 0.16, slide: 330 }); o('square', 380, { gain: 0.05, decay: 0.16, slide: 340, delay: 0.2 }); break;
                case 'croak': for (let i = 0; i < 3; i += 1) o('square', 130, { gain: 0.05, decay: 0.07, delay: i * 0.09, verb: 0 }); break;
                case 'croakSmall': for (let i = 0; i < 2; i += 1) o('square', 330, { gain: 0.04, decay: 0.05, delay: i * 0.07, verb: 0 }); break;
                case 'croakBird': o('sawtooth', 300, { gain: 0.05, decay: 0.3, slide: 200 }); break;
                case 'buzz': vib('sawtooth', 220, 0.3, 0.03, 40, 0.1, { lp: 1200 }); break;
                case 'trumpet': vib('sawtooth', 420, 0.8, 0.06, 7, 0.04, { lp: 1800, slide: 700 }); break;
                case 'trumpetSmall': vib('sawtooth', 600, 0.5, 0.05, 8, 0.04, { lp: 2200, slide: 900 }); break;
                case 'roar': vib('sawtooth', 120, 0.9, 0.08, 12, 0.1, { lp: 700, slide: 90 }); this.noiseHit(t, { f: 500, q: 0.7, gain: 0.05, dur: 0.8 }); break;
                case 'grunt': o('sawtooth', 110, { gain: 0.07, decay: 0.2, slide: 90, verb: 0.1 }); break;
                case 'chirp': o('sine', 2800, { gain: 0.04, decay: 0.05, slide: 2200 }); o('sine', 2900, { gain: 0.04, decay: 0.05, slide: 2300, delay: 0.09 }); break;
                case 'ooh': [0, 1, 2].forEach((i) => o('sine', 500 + i * 120, { gain: 0.06, decay: 0.12, slide: 850 + i * 120, slideTime: 0.1, delay: i * 0.14 })); break;
                case 'squawk': vib('sawtooth', 720, 0.25, 0.05, 30, 0.08, { lp: 2400 }); break;
                case 'squawkSmall': vib('sawtooth', 900, 0.18, 0.04, 30, 0.08, { lp: 2600 }); break;
                case 'sigh': this.noiseHit(t, { f: 600, q: 0.8, gain: 0.05, dur: 0.6, slide: 300 }); break;
                case 'click': this.noiseHit(t, { f: 3000, q: 4, gain: 0.05, dur: 0.02 }); break;
                case 'bark': o('square', 320, { gain: 0.05, decay: 0.1, slide: 220 }); o('square', 330, { gain: 0.05, decay: 0.1, slide: 230, delay: 0.16 }); break;
                case 'whale': o('sine', 220, { gain: 0.08, decay: 1.4, slide: 420, slideTime: 0.7, verb: 0.7 }); o('sine', 330, { gain: 0.05, decay: 1, slide: 260, slideTime: 0.8, delay: 0.6, verb: 0.7 }); break;
                case 'twinkle': [0, 4, 7].forEach((s, i) => o('sine', midi(90 + s), { gain: 0.04, decay: 0.3, delay: i * 0.07, verb: 0.6 })); break;
                default: o('sine', 800, { gain: 0.04, decay: 0.1 });
            }
        }
    };

    MS.audio = audio;
    MS.SONGS = SONGS;
    void clamp;
})();
