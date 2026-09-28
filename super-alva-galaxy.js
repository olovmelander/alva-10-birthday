/*
 * SUPER ALVA GALAXY
 * ---------------------------------------------------------------------
 * Alva's second birthday game: a canvas platformer through ten galaxies –
 * one for every year – that ends with the Grand Star.
 *
 * It lives next to (and independently of) "Alva's Space Jump". The file is
 * loaded after the page's main script and borrows a few things from it:
 *   - audioCtx / bgMusic   sound, created when the splash screen is dismissed
 *   - confetti()           canvas-confetti, for the birthday finale
 *   - setSceneRenderPaused lets the WebGL story scene sleep while we play
 *
 * Structure
 *   1. Tuning            6. Sprites & art
 *   2. Helpers           7. Backgrounds
 *   3. Galaxies          8. Renderer & effects
 *   4. Level builder     9. Sound
 *   5. Simulation       10. UI, input & controller
 */
(function () {
    'use strict';

    // =====================================================================
    // 1. TUNING
    // All gameplay happens in world units ("u"). The screen always shows
    // 400–520u of height, so the game plays the same on every device.
    // =====================================================================
    const VIEW = {
        shortHeight: 400,
        tallHeight: 500,
        shortScreenPx: 460,
        tallScreenPx: 980,
        minWidth: 560,
        groundDepth: 72,
        maxBackingPixels: 2600000,     // caps canvas resolution on big high-DPI screens
        alvaScreenRatio: 0.22,
        alvaScreenMin: 120,
        alvaScreenMax: 220
    };

    const PHYS = {
        step: 1 / 120,
        maxStepsPerFrame: 10,
        gravityRise: 2300,        // while the jump button is held
        gravityRiseCut: 4200,     // button released early: a shorter hop
        gravityFall: 3000,
        terminalVelocity: 1100,
        jumpVelocity: 860,
        jumpMinRise: 0.06,        // even the quickest tap gives a proper hop
        spinVelocity: 600,        // Star Spin: the mid-air second jump
        spinGravityScale: 0.8,
        spinDuration: 0.36,
        stompBounce: 700,
        stompBounceHeld: 880,
        stompMinRise: 0.14,
        hurtHop: 460,
        coyoteTime: 0.09,
        jumpBufferTime: 0.12,
        landingAssistTime: 0.1,   // a press this close to landing becomes a jump, not a spin
        invulnerableTime: 1.6,
        pitDepth: 190,
        rescueInvulnerableTime: 1.2
    };

    const ALVA_BOX = { halfWidth: 12, height: 44, footHalfWidth: 11 };

    const SCORE = {
        bit: 10,
        stompChain: [100, 200, 400, 800, 1000],
        starKill: 200,
        smash: 100,
        block: 50,
        powerup: 500,
        bitsPerHeart: 50,
        heartBonus: 500,
        galaxyClear: 1000,
        perfect: 2000,
        finale: 10000
    };

    const POWER_TIME = { rainbow: 7.5, magnet: 10 };
    const MAX_HEARTS = 3;

    const PROJECTILES = {
        puck: { w: 38, h: 14, speed: 150, lanes: { low: 2, high: 60 } },
        bullet: { w: 42, h: 26, speed: 190, lanes: { low: 2, high: 58 } }
    };

    const METEOR = { fallTime: 0.85, leadTime: 1.05, startHeight: 520, drift: 150 };

    // =====================================================================
    // 2. HELPERS
    // =====================================================================
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
    const easeOutBack = (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    const TAU = Math.PI * 2;

    // Mulberry32 – a tiny seeded PRNG. State lives on a plain object so a
    // run can be cloned (the test bot plans ahead by cloning runs).
    function nextRandom(holder) {
        holder.rngState = (holder.rngState + 0x6D2B79F5) >>> 0;
        let t = holder.rngState;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    function hashNoise(n) {
        const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    function formatScore(value) {
        return String(Math.max(0, Math.round(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function overlaps(a, b) {
        return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    }

    // =====================================================================
    // 3. GALAXIES
    // One per year. Each has a look, a tempo, the pieces its levels are
    // built from, and (for most) a memory from the story that unlocks.
    // =====================================================================
    const GALAXIES = [
        {
            key: 'spark',
            name: 'Gnistgalaxen',
            tagline: 'Där allt började',
            memory: { src: 'alva_1_year.jpg', caption: 'Den allra första gnistan' },
            length: 5400,
            speed: [265, 295],
            intro: ['tutJump', 'tutGoomba', 'tutHold', 'tutBlock'],
            pool: { breather: 1, bitsLine: 2, bitsArc: 3, bitsWave: 2, goomba: 4, goombaPair: 1, rock: 2, block: 1 },
            powerups: ['mushroom'],
            theme: {
                sky: ['#06021a', '#1c0a33', '#4a1a2e'],
                horizon: 'rgba(255, 168, 88, 0.42)',
                nebula: ['rgba(255, 180, 92, 0.30)', 'rgba(255, 110, 170, 0.20)', 'rgba(150, 80, 255, 0.18)'],
                star: '#ffe8c0',
                accent: '#ffcc73',
                planets: [
                    { x: 0.72, y: 0.2, r: 46, colors: ['#ffd88a', '#b4502a'], ring: 'rgba(255, 227, 168, 0.8)', parallax: 0.05 },
                    { x: 0.2, y: 0.12, r: 15, colors: ['#ffa6d6', '#7a2463'], parallax: 0.09 }
                ],
                ground: { top: '#ffc766', edge: '#fff2c9', body: ['#6b3312', '#1c0904'], stripe: 'rgba(255, 210, 130, 0.14)', glow: 'rgba(255, 186, 92, 0.55)', deco: 'crystals', decoColors: ['#ffd76d', '#ff9a5c', '#fff0c0'] },
                gap: 'void',
                feature: 'embers'
            }
        },
        {
            key: 'meadow',
            name: 'Lumaängen',
            tagline: 'Där Lumas samlar stjärnstoft',
            memory: null,
            trophy: { icon: 'luma', caption: 'Lumas tackar för hjälpen!' },
            length: 6400,
            speed: [285, 315],
            intro: ['tutSpin', 'tutPlatform', 'magnetRun'],
            pool: { breather: 1, bitsArc: 2, bitsHigh: 2, goomba: 2, goombaPair: 2, rock: 3, rockTwin: 1, rockGoomba: 1, platformLow: 2, platformStairs: 1, block: 1 },
            powerups: ['magnet', 'mushroom'],
            theme: {
                sky: ['#010d1c', '#05304a', '#0b5560'],
                horizon: 'rgba(96, 240, 255, 0.36)',
                nebula: ['rgba(96, 232, 255, 0.28)', 'rgba(125, 255, 176, 0.20)', 'rgba(60, 120, 255, 0.18)'],
                star: '#d8fbff',
                accent: '#7df6ff',
                planets: [
                    { x: 0.8, y: 0.18, r: 38, colors: ['#a6f5ff', '#16607e'], ring: 'rgba(216, 251, 255, 0.7)', parallax: 0.05 },
                    { x: 0.32, y: 0.1, r: 12, colors: ['#c4ff94', '#2f6b1c'], parallax: 0.09 }
                ],
                ground: { top: '#7dffd6', edge: '#e2fff7', body: ['#0e5550', '#021a1a'], stripe: 'rgba(125, 255, 214, 0.12)', glow: 'rgba(96, 240, 220, 0.5)', deco: 'flowers', decoColors: ['#fff27a', '#ff8ad8', '#7df6ff'] },
                gap: 'void',
                feature: 'fireflies'
            }
        },
        {
            key: 'trail',
            name: 'Vandringsberget',
            tagline: 'Uppför med pappa',
            memory: { src: 'alva_olov_hiking.jpg', caption: 'Vandring med pappa' },
            length: 6800,
            speed: [295, 330],
            intro: ['tutPara'],
            pool: { bitsWave: 1, bitsHigh: 1, goomba: 2, goombaPair: 2, para: 3, rock: 2, rockDouble: 2, rockTwin: 1, platformLow: 1, platformStairs: 2, platformGoomba: 1, block: 1, blockRow: 1 },
            powerups: ['magnet', 'mushroom'],
            theme: {
                sky: ['#0a0826', '#35204f', '#b85a48'],
                horizon: 'rgba(255, 150, 90, 0.45)',
                nebula: ['rgba(255, 180, 92, 0.24)', 'rgba(96, 232, 255, 0.12)', 'rgba(255, 110, 110, 0.16)'],
                star: '#fff0d6',
                accent: '#ffb45c',
                planets: [
                    { x: 0.64, y: 0.24, r: 34, colors: ['#ffe9ae', '#d0703a'], parallax: 0.04 }
                ],
                ground: { top: '#a6e27a', edge: '#eaffd6', body: ['#4d3b22', '#150f07'], stripe: 'rgba(200, 255, 160, 0.10)', glow: 'rgba(180, 255, 140, 0.4)', deco: 'grass', decoColors: ['#c8ff9a', '#7fd05a', '#ffe38a'] },
                gap: 'void',
                feature: 'mountains'
            }
        },
        {
            key: 'nebula',
            name: 'Rosa Nebulosan',
            tagline: 'En riktig superstjärna',
            memory: null,
            trophy: { icon: 'rainbow', caption: 'Superstjärnestatus uppnådd!' },
            length: 7200,
            speed: [305, 340],
            intro: ['rainbowRun'],
            pool: { bitsHigh: 1, goombaPair: 2, goombaTrio: 2, para: 2, paraPair: 1, rock: 1, rockDouble: 1, rockGoomba: 2, platformStairs: 1, platformGoomba: 1, block: 2, blockRow: 1 },
            powerups: ['rainbow', 'magnet', 'mushroom'],
            theme: {
                sky: ['#10021a', '#3a0a3e', '#6e1854'],
                horizon: 'rgba(255, 100, 200, 0.4)',
                nebula: ['rgba(255, 82, 198, 0.30)', 'rgba(72, 238, 255, 0.18)', 'rgba(176, 102, 255, 0.22)'],
                star: '#ffe0f6',
                accent: '#ff7ad5',
                planets: [
                    { x: 0.75, y: 0.24, r: 52, colors: ['#ffa4e2', '#661858'], ring: 'rgba(72, 238, 255, 0.75)', parallax: 0.05 },
                    { x: 0.26, y: 0.12, r: 19, colors: ['#96f6ff', '#1a568a'], parallax: 0.09 }
                ],
                ground: { top: '#ff9be0', edge: '#ffe8f8', body: ['#581a4c', '#1a0518'], stripe: 'rgba(255, 160, 230, 0.12)', glow: 'rgba(255, 120, 220, 0.5)', deco: 'crystals', decoColors: ['#48eeff', '#ff52c6', '#ffffff'] },
                gap: 'void',
                feature: 'comets'
            }
        },
        {
            key: 'lake',
            name: 'Fiskesjön',
            tagline: 'Napp! Ett äventyr med Mira',
            memory: { src: 'alva_mira_fishing.jpg', caption: 'Fisketur med Mira' },
            length: 7400,
            speed: [315, 350],
            intro: ['tutGap'],
            pool: { gapSmall: 3, gapWide: 1, gapPlatform: 2, goomba: 2, goombaPair: 1, para: 2, rock: 2, rockDouble: 1, platformLow: 1, bitsHigh: 1, block: 1 },
            powerups: ['rainbow', 'magnet', 'mushroom'],
            theme: {
                sky: ['#010a18', '#062642', '#0a4a5e'],
                horizon: 'rgba(110, 225, 255, 0.34)',
                nebula: ['rgba(110, 225, 255, 0.22)', 'rgba(168, 255, 120, 0.14)', 'rgba(60, 100, 255, 0.18)'],
                star: '#e0f8ff',
                accent: '#6ee1ff',
                planets: [
                    { x: 0.7, y: 0.16, r: 32, colors: ['#f7fbff', '#8aa4c8'], parallax: 0.03, craters: true }
                ],
                ground: { top: '#a8ff78', edge: '#efffe0', body: ['#1f4a2a', '#06170c'], stripe: 'rgba(168, 255, 120, 0.10)', glow: 'rgba(150, 255, 140, 0.4)', deco: 'reeds', decoColors: ['#c8ff9a', '#6ee1ff', '#ffe38a'] },
                gap: 'water',
                feature: 'lake'
            }
        },
        {
            key: 'hockey',
            name: 'Hockeyplaneten',
            tagline: 'Skridskor på och kör!',
            memory: { src: 'alva_hockey.png', caption: 'Hockeystjärnan Alva' },
            length: 7600,
            speed: [325, 360],
            intro: ['tutPuckLow', 'tutPuckHigh'],
            pool: { puckLow: 3, puckHigh: 3, puckMix: 1, gapSmall: 2, goombaPair: 2, para: 1, rock: 2, rockGoomba: 1, platformLow: 1, block: 1 },
            powerups: ['rainbow', 'magnet', 'mushroom'],
            theme: {
                sky: ['#020617', '#0a2242', '#1b4a72'],
                horizon: 'rgba(170, 235, 255, 0.4)',
                nebula: ['rgba(125, 246, 255, 0.16)', 'rgba(160, 255, 207, 0.14)', 'rgba(255, 255, 255, 0.07)'],
                star: '#ffffff',
                accent: '#aeefff',
                planets: [
                    { x: 0.78, y: 0.2, r: 40, colors: ['#ffffff', '#7fa6c8'], ring: 'rgba(223, 246, 255, 0.75)', parallax: 0.05 }
                ],
                ground: { top: '#eefcff', edge: '#ffffff', body: ['#8cc4e0', '#1c3f5e'], stripe: 'rgba(255, 255, 255, 0.14)', glow: 'rgba(200, 245, 255, 0.55)', deco: 'rink', decoColors: ['#e52521', '#2a5cff', '#ffffff'] },
                gap: 'ice',
                feature: 'aurora'
            }
        },
        {
            key: 'meteor',
            name: 'Stjärnfallsdalen',
            tagline: 'Önska dig något!',
            memory: null,
            trophy: { icon: 'meteor', caption: 'Du dansade mellan meteorerna!' },
            length: 7800,
            speed: [335, 370],
            intro: ['tutMeteor'],
            pool: { meteor: 3, meteorShower: 2, gapSmall: 2, gapPlatform: 1, goombaPair: 2, paraPair: 1, rockDouble: 1, puckLow: 1, platformStairs: 1, block: 1 },
            powerups: ['rainbow', 'magnet', 'mushroom'],
            theme: {
                sky: ['#0c0212', '#2a0a2a', '#5a1420'],
                horizon: 'rgba(255, 110, 70, 0.4)',
                nebula: ['rgba(255, 106, 61, 0.24)', 'rgba(255, 204, 77, 0.14)', 'rgba(160, 61, 255, 0.16)'],
                star: '#ffe6d6',
                accent: '#ff8a5c',
                planets: [
                    { x: 0.7, y: 0.22, r: 44, colors: ['#ffb07a', '#7a2010'], parallax: 0.05, craters: true }
                ],
                ground: { top: '#ff9a5c', edge: '#ffe2c8', body: ['#4a1812', '#150504'], stripe: 'rgba(255, 150, 90, 0.12)', glow: 'rgba(255, 120, 60, 0.5)', deco: 'lava', decoColors: ['#ffcc4d', '#ff6a3d', '#fff0c0'] },
                gap: 'void',
                feature: 'meteors'
            }
        },
        {
            key: 'coaster',
            name: 'Berg-och-dalbanan',
            tagline: 'Upp, ner – och upp igen!',
            memory: { src: 'alva_rollercoaster.png', caption: 'Berg-och-dalbanan' },
            length: 8000,
            speed: [345, 380],
            intro: ['tutMoving'],
            pool: { movingPlatforms: 3, gapPlatform: 2, gapDouble: 2, platformStairs: 2, goombaTrio: 1, para: 2, rock: 1, bitsHigh: 2, block: 1 },
            powerups: ['rainbow', 'magnet', 'mushroom'],
            theme: {
                sky: ['#021004', '#0b3316', '#28601a'],
                horizon: 'rgba(185, 255, 128, 0.38)',
                nebula: ['rgba(185, 255, 128, 0.20)', 'rgba(255, 220, 108, 0.16)', 'rgba(64, 224, 160, 0.16)'],
                star: '#f0ffe0',
                accent: '#b9ff80',
                planets: [
                    { x: 0.74, y: 0.18, r: 36, colors: ['#fff3a6', '#7a8a20'], ring: 'rgba(185, 255, 128, 0.75)', parallax: 0.05 }
                ],
                ground: { top: '#d2ff88', edge: '#f8ffe4', body: ['#2b4814', '#0a1804'], stripe: 'rgba(210, 255, 136, 0.12)', glow: 'rgba(190, 255, 120, 0.45)', deco: 'lights', decoColors: ['#ffdc6c', '#ff52c6', '#48eeff'] },
                gap: 'void',
                feature: 'coaster'
            }
        },
        {
            key: 'blackhole',
            name: 'Svarta hålets rand',
            tagline: 'Håll i dig, Alva!',
            memory: null,
            trophy: { icon: 'blackhole', caption: 'Du flydde från det svarta hålet!' },
            length: 8200,
            speed: [355, 395],
            intro: ['tutBullet'],
            pool: { bulletLow: 2, bulletHigh: 2, bulletMix: 1, gapDouble: 2, gapPlatform: 2, gapWide: 1, movingPlatforms: 1, meteor: 2, paraPair: 2, goombaTrio: 1, rockDouble: 1, block: 1 },
            powerups: ['rainbow', 'magnet', 'mushroom'],
            theme: {
                sky: ['#000000', '#10041c', '#250a38'],
                horizon: 'rgba(170, 90, 255, 0.34)',
                nebula: ['rgba(170, 0, 255, 0.18)', 'rgba(0, 212, 255, 0.12)', 'rgba(255, 0, 136, 0.12)'],
                star: '#efe6ff',
                accent: '#c38bff',
                planets: [],
                ground: { top: '#c9a2ff', edge: '#f4ecff', body: ['#2a1150', '#090314'], stripe: 'rgba(200, 160, 255, 0.12)', glow: 'rgba(180, 120, 255, 0.5)', deco: 'crystals', decoColors: ['#c38bff', '#48eeff', '#ff52c6'] },
                gap: 'void',
                feature: 'blackhole'
            }
        },
        {
            key: 'birthday',
            name: 'Födelsedagsgalaxen',
            tagline: 'Level 10 upplåst!',
            memory: { src: 'alva_family.jpg', caption: 'Stjärnorna viskar: vi älskar dig!' },
            length: 8400,
            speed: [345, 385],
            intro: ['partyStart'],
            pool: { goombaTrio: 2, rainbowRun: 1, gapPlatform: 2, puckMix: 1, bulletLow: 1, meteor: 1, paraPair: 1, platformStairs: 1, movingPlatforms: 1, bitsHigh: 2, block: 2, rockGoomba: 1, bitsWave: 1 },
            powerups: ['rainbow', 'magnet', 'mushroom'],
            finale: true,
            theme: {
                sky: ['#0a0420', '#2a1150', '#5c2670'],
                horizon: 'rgba(255, 215, 0, 0.36)',
                nebula: ['rgba(255, 215, 0, 0.20)', 'rgba(255, 82, 198, 0.20)', 'rgba(72, 238, 255, 0.14)'],
                star: '#fff6d6',
                accent: '#ffd700',
                planets: [
                    { x: 0.8, y: 0.2, r: 40, colors: ['#ffe38a', '#c05a8a'], ring: 'rgba(255, 155, 224, 0.8)', parallax: 0.05 }
                ],
                ground: { top: '#fff1c4', edge: '#ffffff', body: ['#e87aa8', '#5a1a44'], stripe: 'rgba(255, 255, 255, 0.10)', glow: 'rgba(255, 220, 120, 0.5)', deco: 'frosting', decoColors: ['#ff5a5a', '#ffd700', '#48eeff', '#7dff6b', '#b98cff'] },
                gap: 'void',
                feature: 'party'
            }
        }
    ];

    const ENDLESS_POOL = {
        goombaPair: 2, goombaTrio: 2, para: 1, paraPair: 1, rockDouble: 1, rockGoomba: 1,
        gapSmall: 1, gapWide: 1, gapPlatform: 2, gapDouble: 1, movingPlatforms: 1,
        puckMix: 1, bulletMix: 1, meteor: 1, meteorShower: 1, platformStairs: 1, bitsHigh: 1, block: 2
    };

    // Galaxy 11+ is the endless bonus loop: the themes repeat, the tempo keeps rising.
    function getGalaxyDef(index) {
        if (index < GALAXIES.length) return GALAXIES[index];
        const loop = index - GALAXIES.length;
        const base = GALAXIES[loop % GALAXIES.length];
        const speedBoost = Math.min(10 * (loop + 1), 110);
        return {
            ...base,
            key: `${base.key}-endless-${loop}`,
            name: `${base.name} ∞`,
            tagline: 'Oändliga galaxen',
            memory: null,
            trophy: null,
            finale: false,
            length: 8400,
            speed: [385 + speedBoost, 405 + speedBoost],
            intro: [],
            pool: ENDLESS_POOL,
            powerups: ['rainbow', 'magnet', 'mushroom'],
            endless: true
        };
    }

    // =====================================================================
    // 4. LEVEL BUILDER
    // A galaxy is a row of hand-made "chunks" (a goomba under a star bit
    // arc, a gap with a platform, …) picked by weight and joined with
    // breathing room that grows with the tempo.
    // =====================================================================
    const LEVEL_START = 620;       // flat runway before the first chunk
    const FINISH_RUNWAY = 480;     // flat ground before the launch star
    const ONE_PER_GALAXY = new Set(['rainbowRun', 'magnetRun']);

    // Alva's real jump arc, so star bit arcs line up with an actual jump.
    function simulateJumpPath(speed, { holdTime = 10, spinAt = -1, spinHoldTime = 10 } = {}) {
        const dt = PHYS.step;
        const points = [];
        let t = 0;
        let y = 0;
        let vy = PHYS.jumpVelocity;
        let releaseAt = holdTime;
        let forceRise = PHYS.jumpMinRise;
        let spinT = 0;
        let spun = false;

        for (let i = 0; i < 720; i += 1) {
            if (!spun && spinAt >= 0 && t >= spinAt) {
                spun = true;
                vy = Math.max(vy, PHYS.spinVelocity);
                spinT = PHYS.spinDuration;
                forceRise = 0.1;
                releaseAt = t + spinHoldTime;
            }
            const holding = t < releaseAt;
            let g = vy > 0 ? (holding || forceRise > 0 ? PHYS.gravityRise : PHYS.gravityRiseCut) : PHYS.gravityFall;
            if (spinT > 0) g *= PHYS.spinGravityScale;
            vy = Math.max(vy - g * dt, -PHYS.terminalVelocity);
            y += vy * dt;
            t += dt;
            forceRise = Math.max(0, forceRise - dt);
            spinT = Math.max(0, spinT - dt);
            if (y <= 0) {
                points.push({ t, x: speed * t, h: 0 });
                break;
            }
            points.push({ t, x: speed * t, h: y });
        }
        return points;
    }

    function createLevelBuilder(def, seed) {
        const rng = { rngState: seed >>> 0 };
        const level = { entities: [], gaps: [], nextId: 1, star: null };
        const pathCache = new Map();
        let bitColor = 0;
        let paletteCursor = Math.floor(nextRandom(rng) * 4);

        const builder = {
            level,
            def,
            random: () => nextRandom(rng),
            speedAt(x) {
                return lerp(def.speed[0], def.speed[1], clamp(x / def.length, 0, 1));
            },
            path(x, kind) {
                const speed = Math.round(this.speedAt(x) / 5) * 5;
                const key = `${kind}:${speed}`;
                if (!pathCache.has(key)) {
                    const options = kind === 'spin'
                        ? { spinAt: 0.34, spinHoldTime: 0.45 }
                        : kind === 'hop' ? { holdTime: 0.02 } : {};
                    pathCache.set(key, simulateJumpPath(speed, options));
                }
                return pathCache.get(key);
            },
            add(entity) {
                entity.id = level.nextId;
                level.nextId += 1;
                entity.alive = true;
                entity.t = 0;
                level.entities.push(entity);
                return entity;
            },
            bit(x, height) {
                const color = bitColor % 6;
                bitColor += 1;
                return this.add({ type: 'bit', x, y: height - 11, w: 22, h: 22, color, homing: false, hv: 0 });
            },
            bitLine(x, height, count, spacing = 34) {
                for (let i = 0; i < count; i += 1) this.bit(x + i * spacing, height);
                return count * spacing;
            },
            // Star bits along a real jump that starts at startX. Returns the jump length.
            bitArc(startX, count, kind = 'full') {
                const points = this.path(startX, kind);
                for (let i = 0; i < count; i += 1) {
                    const f = lerp(0.1, 0.9, count === 1 ? 0.5 : i / (count - 1));
                    const p = points[Math.min(points.length - 1, Math.round(f * (points.length - 1)))];
                    this.bit(startX + p.x, p.h + 22);
                }
                return points[points.length - 1].x;
            },
            // The same, but with the top of the jump right above centerX.
            bitArcOver(centerX, count, kind = 'full') {
                const points = this.path(centerX, kind);
                let apex = points[0];
                for (const p of points) if (p.h > apex.h) apex = p;
                return this.bitArc(centerX - apex.x, count, kind);
            },
            goomba(x, options = {}) {
                const platform = options.platform || null;
                const palette = paletteCursor % 4;
                paletteCursor += 1;
                return this.add({
                    type: 'goomba', x, y: platform ? platform.top : 0, w: 32, h: 34,
                    vx: -32, vy: 0, palette, platform, active: false, falling: false, wingless: false
                });
            },
            para(x, height, amp, phase = 0) {
                const palette = paletteCursor % 4;
                paletteCursor += 1;
                return this.add({
                    type: 'para', x, y: height, baseY: height, amp, phase, w: 32, h: 34,
                    vx: -26, vy: 0, palette, platform: null, active: false, falling: false
                });
            },
            rock(x) {
                return this.add({ type: 'rock', x, y: 0, w: 34, h: 26, variant: Math.floor(this.random() * 3), hot: false });
            },
            gap(x, width) {
                level.gaps.push({ x0: x, x1: x + width, style: def.theme.gap });
            },
            platform(leftX, top, width, move = null) {
                return this.add({
                    type: 'platform', x: leftX + width / 2, w: width, top, baseTop: top,
                    y: top - 16, h: 16, move, variant: Math.floor(this.random() * 3)
                });
            },
            block(x, bottom, item) {
                return this.add({ type: 'block', x, y: bottom, w: 36, h: 36, item, used: false, bumpT: 0 });
            },
            item(x, height, kind) {
                return this.add({
                    type: 'item', kind, x, y: height - 16, baseY: height - 16, w: 32, h: 32,
                    popping: false, popT: 0, homing: false, hv: 0
                });
            },
            projectile(kind, crossX, lane) {
                const spec = PROJECTILES[kind];
                return this.add({
                    type: kind, x: crossX, crossX, lane, y: spec.lanes[lane], w: spec.w, h: spec.h,
                    spawned: false, warned: false
                });
            },
            meteor(impactX) {
                return this.add({
                    type: 'meteor', x: impactX, impactX, y: METEOR.startHeight, w: 30, h: 30,
                    spawned: false, warned: false, landed: false, fallT: 0, hot: true, variant: Math.floor(this.random() * 3)
                });
            },
            hint(x, key) {
                return this.add({ type: 'hint', x, y: 0, w: 0, h: 0, key, fired: false });
            },
            star(x, grand) {
                const star = this.add({ type: 'star', x, y: grand ? 20 : 14, w: grand ? 84 : 60, h: grand ? 84 : 60, grand, grabbed: false });
                level.star = star;
                return star;
            }
        };
        return builder;
    }

    // Every chunk gets the builder and its start x, and returns its width.
    const CHUNKS = {
        breather(b, x) {
            b.bitLine(x + 20, 24, 5);
            return 200;
        },
        bitsLine(b, x) {
            b.bitLine(x, b.random() < 0.5 ? 24 : 74, 6);
            return 204;
        },
        bitsArc(b, x) {
            return b.bitArc(x + 10, 8) + 40;
        },
        bitsWave(b, x) {
            for (let i = 0; i < 9; i += 1) b.bit(x + i * 36, 28 + Math.sin((i / 8) * Math.PI) * 90);
            return 330;
        },
        bitsHigh(b, x) {
            return b.bitArc(x + 10, 10, 'spin') + 40;
        },
        goomba(b, x) {
            b.goomba(x + 170);
            b.bitArcOver(x + 170, 6);
            return 300;
        },
        goombaPair(b, x) {
            b.goomba(x + 150);
            b.goomba(x + 280);
            b.bitLine(x + 130, 124, 5, 40);
            return 400;
        },
        goombaTrio(b, x) {
            b.goomba(x + 140);
            b.goomba(x + 245);
            b.goomba(x + 350);
            b.bitLine(x + 130, 128, 7, 38);
            return 480;
        },
        rock(b, x) {
            b.rock(x + 160);
            b.bitArcOver(x + 160, 6);
            return 300;
        },
        rockTwin(b, x) {
            b.rock(x + 150);
            b.rock(x + 186);
            b.bitArcOver(x + 168, 7);
            return 330;
        },
        rockDouble(b, x) {
            b.rock(x + 140);
            b.rock(x + 380);
            b.bitArcOver(x + 140, 5);
            b.bitArcOver(x + 380, 5);
            return 500;
        },
        rockGoomba(b, x) {
            b.rock(x + 140);
            b.goomba(x + 380);
            b.bitArcOver(x + 140, 5);
            return 480;
        },
        platformLow(b, x) {
            b.platform(x + 80, 78, 180);
            b.bitLine(x + 104, 78 + 26, 5, 34);
            return 320;
        },
        platformStairs(b, x) {
            b.platform(x + 60, 72, 140);
            b.platform(x + 270, 140, 140);
            b.platform(x + 480, 206, 150);
            b.bitLine(x + 92, 72 + 26, 3, 36);
            b.bitLine(x + 302, 140 + 26, 3, 36);
            b.bitLine(x + 512, 206 + 26, 4, 34);
            return 660;
        },
        platformGoomba(b, x) {
            const platform = b.platform(x + 80, 92, 230);
            b.goomba(x + 250, { platform });
            b.bitLine(x + 104, 92 + 26, 3, 34);
            b.bitLine(x + 120, 24, 5, 40);
            return 360;
        },
        block(b, x) {
            b.bitLine(x, 24, 3);
            b.block(x + 200, 96, 'auto');
            return 280;
        },
        blockRow(b, x) {
            b.block(x + 150, 96, 'bits');
            b.block(x + 186, 96, 'auto');
            b.block(x + 222, 96, 'bits');
            return 320;
        },
        gapSmall(b, x) {
            b.gap(x + 150, 110);
            b.bitArcOver(x + 205, 6);
            return 360;
        },
        gapWide(b, x) {
            b.gap(x + 150, 170);
            b.bitArcOver(x + 235, 8, 'spin');
            return 440;
        },
        gapPlatform(b, x) {
            b.gap(x + 120, 330);
            b.platform(x + 205, 70, 110);
            b.bitLine(x + 226, 70 + 26, 3, 34);
            return 540;
        },
        gapDouble(b, x) {
            b.gap(x + 120, 110);
            b.gap(x + 360, 110);
            b.bitArcOver(x + 175, 5);
            b.bitArcOver(x + 415, 5);
            return 560;
        },
        para(b, x) {
            b.para(x + 230, 66, 34, 0);
            return 400;
        },
        paraPair(b, x) {
            b.para(x + 210, 56, 30, 0);
            b.para(x + 410, 112, 40, Math.PI);
            return 560;
        },
        puckLow(b, x) {
            b.projectile('puck', x + 240, 'low');
            b.bitArcOver(x + 240, 5);
            return 400;
        },
        puckHigh(b, x) {
            b.projectile('puck', x + 240, 'high');
            b.bitLine(x + 150, 24, 5, 38);
            return 400;
        },
        puckMix(b, x) {
            b.projectile('puck', x + 200, 'low');
            b.projectile('puck', x + 540, 'high');
            b.bitLine(x + 440, 24, 5, 38);
            return 680;
        },
        bulletLow(b, x) {
            b.projectile('bullet', x + 240, 'low');
            b.bitArcOver(x + 240, 5);
            return 420;
        },
        bulletHigh(b, x) {
            b.projectile('bullet', x + 240, 'high');
            b.bitLine(x + 150, 24, 5, 38);
            return 420;
        },
        bulletMix(b, x) {
            b.projectile('bullet', x + 200, 'high');
            b.projectile('bullet', x + 560, 'low');
            b.bitLine(x + 110, 24, 5, 38);
            return 700;
        },
        meteor(b, x) {
            b.bitLine(x + 30, 24, 4);
            b.meteor(x + 300);
            b.bitArcOver(x + 300, 5);
            return 440;
        },
        meteorShower(b, x) {
            b.meteor(x + 240);
            b.meteor(x + 490);
            b.meteor(x + 740);
            b.bitArcOver(x + 240, 4);
            b.bitArcOver(x + 490, 4);
            b.bitArcOver(x + 740, 4);
            return 880;
        },
        movingPlatforms(b, x) {
            b.gap(x + 100, 560);
            b.platform(x + 150, 84, 120, { amp: 36, period: 2.6, phase: 0 });
            b.platform(x + 350, 110, 120, { amp: 40, period: 2.6, phase: Math.PI });
            b.bitLine(x + 176, 84 + 36 + 26, 3, 34);
            b.bitLine(x + 376, 110 + 40 + 26, 3, 34);
            return 740;
        },
        magnetRun(b, x) {
            b.item(x + 70, 30, 'magnet');
            for (let i = 0; i < 18; i += 1) {
                b.bit(x + 230 + i * 34, 30 + hashNoise(i + x) * 180);
            }
            return 880;
        },
        rainbowRun(b, x) {
            b.item(x + 120, 30, 'rainbow');
            for (let i = 0; i < 6; i += 1) b.goomba(x + 440 + i * 72);
            b.bitLine(x + 420, 96, 9, 44);
            return 900;
        },
        // --- Tutorials: a regular chunk plus a hint that shows up in time ---
        tutJump(b, x) {
            b.hint(x - 260, 'jump');
            b.bitLine(x, 24, 4);
            b.rock(x + 330);
            b.bitArcOver(x + 330, 6);
            return 460;
        },
        tutGoomba(b, x) {
            b.hint(x - 220, 'goomba');
            b.goomba(x + 220);
            b.bitArcOver(x + 220, 6);
            return 360;
        },
        tutHold(b, x) {
            b.hint(x - 220, 'hold');
            b.rock(x + 200);
            b.rock(x + 236);
            b.rock(x + 272);
            b.bitArcOver(x + 236, 8);
            return 420;
        },
        tutBlock(b, x) {
            b.hint(x - 220, 'block');
            b.bitLine(x, 24, 3);
            b.block(x + 220, 96, 'mushroom');
            return 340;
        },
        tutSpin(b, x) {
            b.hint(x - 260, 'spin');
            return b.bitArc(x + 20, 11, 'spin') + 60;
        },
        tutPlatform(b, x) {
            b.hint(x - 220, 'platform');
            return CHUNKS.platformStairs(b, x);
        },
        tutPara(b, x) {
            b.hint(x - 220, 'para');
            return CHUNKS.para(b, x);
        },
        tutGap(b, x) {
            b.hint(x - 220, 'gap');
            return CHUNKS.gapSmall(b, x);
        },
        tutPuckLow(b, x) {
            b.hint(x - 240, 'puckLow');
            return CHUNKS.puckLow(b, x);
        },
        tutPuckHigh(b, x) {
            b.hint(x - 240, 'puckHigh');
            return CHUNKS.puckHigh(b, x);
        },
        tutMeteor(b, x) {
            b.hint(x - 240, 'meteor');
            return CHUNKS.meteor(b, x);
        },
        tutMoving(b, x) {
            b.hint(x - 240, 'moving');
            return CHUNKS.movingPlatforms(b, x);
        },
        tutBullet(b, x) {
            b.hint(x - 240, 'bullet');
            return CHUNKS.bulletLow(b, x);
        },
        // Galaxy 10 opens with a "10" written in star bits.
        partyStart(b, x) {
            b.hint(x - 260, 'party');
            b.bit(x + 96, 150);
            for (let i = 0; i < 5; i += 1) b.bit(x + 120, 46 + i * 34);
            for (let i = 0; i < 10; i += 1) {
                const angle = (i / 10) * TAU;
                b.bit(x + 250 + Math.cos(angle) * 44, 114 + Math.sin(angle) * 66);
            }
            return 360;
        }
    };

    function pickChunk(pool, builder, last, used) {
        let total = 0;
        const options = [];
        for (const [name, weight] of Object.entries(pool)) {
            if (name === last || (ONE_PER_GALAXY.has(name) && used.has(name))) continue;
            options.push([name, weight]);
            total += weight;
        }
        let roll = builder.random() * total;
        for (const [name, weight] of options) {
            roll -= weight;
            if (roll <= 0) return name;
        }
        return options.length ? options[options.length - 1][0] : 'breather';
    }

    function buildLevel(galaxyIndex, seed) {
        const def = getGalaxyDef(galaxyIndex);
        const builder = createLevelBuilder(def, (seed ^ Math.imul(galaxyIndex + 1, 0x9E3779B1)) >>> 0);
        const queue = def.intro.slice();
        const used = new Set();
        let last = '';
        let x = LEVEL_START;

        while (x < def.length) {
            const name = queue.length ? queue.shift() : pickChunk(def.pool, builder, last, used);
            used.add(name);
            last = name;
            const width = CHUNKS[name](builder, x);
            x += width + 90 + builder.speedAt(x) * 0.3;
        }

        builder.bitLine(x + 40, 24, 8, 36);
        const starX = x + FINISH_RUNWAY;
        builder.star(starX, !!def.finale);

        const level = builder.level;
        level.def = def;
        level.index = galaxyIndex;
        level.starX = starX;
        level.bitTotal = level.entities.filter((e) => e.type === 'bit').length;
        level.entities.sort((p, q) => p.x - q.x);
        level.gaps.sort((p, q) => p.x0 - q.x0);
        return level;
    }

    // =====================================================================
    // 5. SIMULATION
    // Pure game logic in fixed steps. It never touches the DOM: everything
    // the player should see or hear is reported as an event. World y points
    // up and 0 is the ground surface, so resizing never moves anything.
    // =====================================================================
    function createAlva() {
        return {
            x: 0, y: 0, vy: 0, prevY: 0,
            mode: 'run', grounded: true, support: null,
            holding: false, forceRiseT: 0,
            coyote: 0, jumpBuffer: 0,
            spinReady: true, spinT: 0,
            invuln: 0, rainbowT: 0, magnetT: 0,
            combo: 0, airTime: 0,
            rescueT: 0, rescueFromY: 0,
            launchFromY: 0
        };
    }

    function emit(run, type, data = {}) {
        if (run.events.length < 400) run.events.push({ type, ...data });
    }

    function addScore(run, amount) {
        run.score += amount;
    }

    function createRun({ seed, galaxyIndex = 0, view, attract = false } = {}) {
        const run = {
            seed: (seed === undefined ? Math.floor(Math.random() * 1e9) : seed) >>> 0,
            rngState: 0,
            view: { w: 800, h: 420, ax: 176, groundY: 348, ...view },
            attract,
            galaxyIndex,
            score: 0,
            bits: 0,
            goombas: 0,
            bitsTowardHeart: 0,
            hearts: MAX_HEARTS,
            time: 0,
            phase: 'play',
            phaseT: 0,
            speed: 0,
            camX: 0,
            inputHeld: false,
            pruneT: 0,
            attractJumpT: 1.6,
            level: null,
            def: null,
            entities: [],
            gaps: [],
            stats: null,
            alva: createAlva(),
            events: []
        };
        run.rngState = (run.seed ^ 0xA5A5A5A5) >>> 0;
        startGalaxy(run, galaxyIndex);
        return run;
    }

    function startGalaxy(run, index) {
        run.galaxyIndex = index;
        run.level = run.attract
            ? { entities: [], gaps: [], star: null, starX: Infinity, def: GALAXIES[0], index: 0, bitTotal: 0 }
            : buildLevel(index, run.seed + index * 7919);
        run.def = run.level.def;
        run.entities = run.level.entities;
        run.gaps = run.level.gaps;
        run.phase = run.attract ? 'attract' : 'play';
        run.phaseT = 0;
        run.speed = 0;
        run.stats = { startScore: run.score, bits: 0, goombas: 0, damage: 0, bitTotal: run.level.bitTotal };

        const a = createAlva();
        run.alva = a;
        if (run.attract) {
            a.mode = 'run';
        } else {
            // Alva drops in from the sky at the start of every galaxy
            a.mode = 'drop';
            a.grounded = false;
            a.y = run.view.groundY + 70;
            a.prevY = a.y;
        }
        run.camX = a.x - run.view.ax;
        emit(run, 'galaxy', { index });
    }

    function setRunView(run, view) {
        run.view = { ...run.view, ...view };
        run.camX = run.alva.x - run.view.ax;
    }

    // --- Queries about the ground, platforms and blocks ----------------
    function pointOverGap(run, x) {
        for (const gap of run.gaps) {
            if (gap.x0 > x) return false;
            if (x > gap.x0 && x < gap.x1) return true;
        }
        return false;
    }

    // Ground holds Alva as long as one foot touches it.
    function groundHoldsAlva(run, x) {
        const x0 = x - ALVA_BOX.footHalfWidth;
        const x1 = x + ALVA_BOX.footHalfWidth;
        for (const gap of run.gaps) {
            if (gap.x0 > x1) return true;
            if (x0 >= gap.x0 && x1 <= gap.x1) return false;
        }
        return true;
    }

    function surfaceSpan(e) {
        if (e.type === 'platform') return { top: e.top, x0: e.x - e.w / 2, x1: e.x + e.w / 2 };
        return { top: e.y + e.h, x0: e.x - e.w / 2, x1: e.x + e.w / 2 };
    }

    function footOverlaps(span, x) {
        return x + ALVA_BOX.footHalfWidth > span.x0 && x - ALVA_BOX.footHalfWidth < span.x1;
    }

    function isSurface(e) {
        return e.alive && (e.type === 'platform' || e.type === 'block');
    }

    // The surface Alva keeps standing on (with a little tolerance for moving platforms).
    function findStandingSupport(run, x, y) {
        let best = null;
        if (Math.abs(y) <= 4 && groundHoldsAlva(run, x)) best = { top: 0, ref: null };
        for (const e of run.entities) {
            if (!isSurface(e) || Math.abs(e.x - x) > e.w / 2 + 20) continue;
            const span = surfaceSpan(e);
            if (!footOverlaps(span, x) || Math.abs(span.top - y) > 4) continue;
            if (!best || span.top > best.top) best = { top: span.top, ref: e };
        }
        return best;
    }

    // A surface Alva's feet crossed from above during this step.
    function findLandingSupport(run, x, prevY, y) {
        let best = null;
        if (prevY >= -1 && y <= 0 && groundHoldsAlva(run, x)) best = { top: 0, ref: null };
        for (const e of run.entities) {
            if (!isSurface(e) || Math.abs(e.x - x) > e.w / 2 + 20) continue;
            const span = surfaceSpan(e);
            if (!footOverlaps(span, x)) continue;
            if (prevY >= span.top - 1.5 && y <= span.top && (!best || span.top > best.top)) {
                best = { top: span.top, ref: e };
            }
        }
        return best;
    }

    function surfaceBelow(run, x, y) {
        let top = -Infinity;
        if (y >= 0 && groundHoldsAlva(run, x)) top = 0;
        for (const e of run.entities) {
            if (!isSurface(e) || Math.abs(e.x - x) > e.w / 2 + 20) continue;
            const span = surfaceSpan(e);
            if (footOverlaps(span, x) && span.top <= y + 0.5 && span.top > top) top = span.top;
        }
        return top;
    }

    function timeUntilLanding(run) {
        const a = run.alva;
        const top = surfaceBelow(run, a.x, a.y);
        if (top === -Infinity) return Infinity;
        const distance = Math.max(0, a.y - top);
        const v = Math.max(0, -a.vy);
        const g = PHYS.gravityFall;
        return (-v + Math.sqrt(v * v + 2 * g * distance)) / g;
    }

    function boxOf(e) {
        return { x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y, y1: e.y + e.h };
    }

    function shrinkBox(box, amount) {
        return { x0: box.x0 + amount, x1: box.x1 - amount, y0: box.y0 + amount, y1: box.y1 - amount };
    }

    function alvaBox(a) {
        return { x0: a.x - ALVA_BOX.halfWidth, x1: a.x + ALVA_BOX.halfWidth, y0: a.y, y1: a.y + ALVA_BOX.height };
    }

    // --- Alva's moves --------------------------------------------------
    function doJump(run, held) {
        const a = run.alva;
        a.vy = PHYS.jumpVelocity;
        a.grounded = false;
        a.support = null;
        a.mode = 'air';
        a.coyote = 0;
        a.jumpBuffer = 0;
        a.holding = held;
        a.forceRiseT = PHYS.jumpMinRise;
        a.spinReady = true;
        a.airTime = 0;
        emit(run, 'jump', { x: a.x, y: a.y });
    }

    function doSpin(run, held) {
        const a = run.alva;
        a.vy = Math.max(a.vy, PHYS.spinVelocity);
        a.spinT = PHYS.spinDuration;
        a.spinReady = false;
        a.holding = held;
        a.forceRiseT = 0.1;
        a.jumpBuffer = 0;
        emit(run, 'spin', { x: a.x, y: a.y });
    }

    function handlePress(run, held) {
        const a = run.alva;
        if (a.grounded || a.coyote > 0) {
            doJump(run, held);
            return;
        }
        // About to land? Then the player meant "jump again", not "spin".
        if (a.vy <= 0 && timeUntilLanding(run) <= PHYS.landingAssistTime) {
            a.jumpBuffer = PHYS.jumpBufferTime;
            return;
        }
        if (a.spinReady) {
            doSpin(run, held);
            return;
        }
        a.jumpBuffer = PHYS.jumpBufferTime;
    }

    function landOn(run, support) {
        const a = run.alva;
        const impact = clamp(-a.vy / 900, 0, 1);
        a.y = support.top;
        a.vy = 0;
        a.grounded = true;
        a.support = support.ref;
        a.mode = 'run';
        a.spinReady = true;
        a.spinT = 0;
        a.coyote = 0;
        if (a.combo >= 2) emit(run, 'comboEnd', { combo: a.combo });
        a.combo = 0;
        a.airTime = 0;
        emit(run, 'land', { x: a.x, y: a.y, impact });
    }

    function bumpHead(run) {
        const a = run.alva;
        const head = a.y + ALVA_BOX.height;
        const prevHead = a.prevY + ALVA_BOX.height;
        for (const e of run.entities) {
            if (e.type !== 'block' || !e.alive) continue;
            if (Math.abs(e.x - a.x) > e.w / 2 + ALVA_BOX.halfWidth - 4) continue;
            if (prevHead <= e.y + 0.5 && head > e.y) {
                a.y = e.y - ALVA_BOX.height;
                a.vy = -60;
                a.forceRiseT = 0;
                hitBlock(run, e);
                return;
            }
        }
    }

    function chooseBlockItem(run) {
        const pool = run.def.powerups || [];
        const roll = nextRandom(run);
        if (run.hearts < MAX_HEARTS && pool.includes('mushroom') && roll < 0.55) return 'mushroom';
        const specials = pool.filter((kind) => kind !== 'mushroom');
        if (specials.length && roll < 0.82) return specials[Math.floor(nextRandom(run) * specials.length)];
        return 'bits';
    }

    function hitBlock(run, block) {
        if (block.used) {
            emit(run, 'bumpEmpty', { x: block.x, y: block.y });
            return;
        }
        block.used = true;
        block.bumpT = 0.25;
        let item = block.item === 'auto' ? chooseBlockItem(run) : block.item;
        if (item === 'mushroom' && run.hearts >= MAX_HEARTS && block.item === 'auto') item = 'bits';
        addScore(run, SCORE.block);
        const a = run.alva;

        if (item === 'bits') {
            for (let i = 0; i < 5; i += 1) {
                const bit = {
                    id: run.level.nextId, type: 'bit', alive: true, t: 0,
                    x: block.x, y: block.y + block.h, w: 22, h: 22, color: (block.id + i) % 6,
                    homing: true, hv: 0,
                    burstVx: (i - 2) * 110, burstVy: 380 + (i % 2) * 90, burstT: 0.22
                };
                run.level.nextId += 1;
                run.entities.push(bit);
            }
        } else {
            run.entities.push({
                id: run.level.nextId, type: 'item', kind: item, alive: true, t: 0,
                x: block.x, y: block.y + block.h - 30, baseY: block.y + block.h - 30, w: 32, h: 32,
                popping: true, popT: 0, homing: false, hv: 0
            });
            run.level.nextId += 1;
        }
        emit(run, 'block', { x: block.x, y: block.y, item, ax: a.x });
    }

    function hurt(run, cause) {
        const a = run.alva;
        if (a.invuln > 0 || a.rainbowT > 0 || run.phase !== 'play') return;
        run.hearts -= 1;
        run.stats.damage += 1;
        a.invuln = PHYS.invulnerableTime;
        a.combo = 0;
        emit(run, 'hurt', { x: a.x, y: a.y, cause, hearts: run.hearts });
        if (run.hearts <= 0) {
            die(run, cause);
            return;
        }
        if (a.grounded) {
            a.vy = PHYS.hurtHop;
            a.grounded = false;
            a.support = null;
            a.mode = 'air';
            a.forceRiseT = 0.12;
            a.holding = false;
        }
    }

    function die(run, cause) {
        const a = run.alva;
        run.phase = 'dying';
        run.phaseT = 0;
        a.mode = 'dying';
        a.grounded = false;
        a.vy = cause === 'pit' ? 0 : 760;
        a.rainbowT = 0;
        a.magnetT = 0;
        emit(run, 'die', { cause, x: a.x, y: a.y });
    }

    function fallIntoPit(run) {
        const a = run.alva;
        run.hearts -= 1;
        run.stats.damage += 1;
        a.combo = 0;
        emit(run, 'fall', { x: a.x, hearts: run.hearts });
        if (run.hearts <= 0) {
            die(run, 'pit');
            return;
        }
        a.mode = 'rescue';
        a.rescueT = 0;
        a.rescueFromY = a.y;
        a.vy = 0;
        a.spinT = 0;
        a.invuln = 99;
        emit(run, 'rescue', { x: a.x });
    }

    function solidBelow(run, x) {
        if (!pointOverGap(run, x)) return true;
        return run.entities.some((e) => e.type === 'platform' && e.alive && footOverlaps(surfaceSpan(e), x));
    }

    // A Luma swoops down, lifts Alva out of the hole and lets go over solid ground.
    function updateRescue(run, dt) {
        const a = run.alva;
        const liftStart = 0.45;
        const liftEnd = 1.25;
        a.rescueT += dt;
        if (a.rescueT >= liftStart) {
            const t = clamp((a.rescueT - liftStart) / (liftEnd - liftStart), 0, 1);
            a.y = lerp(a.rescueFromY, 150, easeOutCubic(t));
            if (t >= 1 && solidBelow(run, a.x)) {
                a.mode = 'air';
                a.vy = 0;
                a.grounded = false;
                a.spinReady = true;
                a.invuln = PHYS.rescueInvulnerableTime;
                emit(run, 'rescued', { x: a.x, y: a.y });
            }
        }
        a.prevY = a.y;
    }

    function tickPower(run, key, kind, dt) {
        const a = run.alva;
        if (a[key] <= 0) return;
        a[key] = Math.max(0, a[key] - dt);
        if (a[key] === 0) emit(run, 'powerEnd', { kind });
    }

    function updateAlva(run, input, dt) {
        const a = run.alva;
        a.coyote = Math.max(0, a.coyote - dt);
        a.jumpBuffer = Math.max(0, a.jumpBuffer - dt);
        a.forceRiseT = Math.max(0, a.forceRiseT - dt);
        a.spinT = Math.max(0, a.spinT - dt);
        if (a.invuln < 90) a.invuln = Math.max(0, a.invuln - dt);
        tickPower(run, 'rainbowT', 'rainbow', dt);
        tickPower(run, 'magnetT', 'magnet', dt);

        if (a.mode === 'rescue') {
            updateRescue(run, dt);
            return;
        }

        if (a.mode === 'drop') {
            if (input.press) a.jumpBuffer = PHYS.jumpBufferTime;
            a.vy = Math.max(a.vy - PHYS.gravityFall * dt, -PHYS.terminalVelocity);
            a.prevY = a.y;
            a.y += a.vy * dt;
            if (a.y <= 0) {
                a.y = 0;
                a.vy = 0;
                a.grounded = true;
                a.mode = 'run';
                emit(run, 'land', { x: a.x, y: 0, impact: 1, drop: true });
            }
            return;
        }

        if (input.press) handlePress(run, input.held);
        if (!input.held) a.holding = false;
        if (a.grounded && a.jumpBuffer > 0) doJump(run, input.held);

        if (!a.grounded) {
            let g;
            if (a.vy > 0) g = a.holding || a.forceRiseT > 0 ? PHYS.gravityRise : PHYS.gravityRiseCut;
            else g = PHYS.gravityFall;
            if (a.spinT > 0) g *= PHYS.spinGravityScale;
            a.vy = Math.max(a.vy - g * dt, -PHYS.terminalVelocity);
            a.airTime += dt;
        }

        a.prevY = a.y;
        a.y += a.vy * dt;

        if (a.grounded) {
            const support = findStandingSupport(run, a.x, a.y);
            if (support) {
                a.y = support.top;
                a.support = support.ref;
            } else {
                a.grounded = false;
                a.support = null;
                a.mode = 'air';
                a.coyote = PHYS.coyoteTime;
            }
        } else {
            if (a.vy > 0) bumpHead(run);
            if (a.vy <= 0) {
                const support = findLandingSupport(run, a.x, a.prevY, a.y);
                if (support) landOn(run, support);
            }
        }

        if (!a.grounded && a.y < -PHYS.pitDepth) fallIntoPit(run);
    }

    // --- Everything else that moves ------------------------------------
    function updatePlatforms(run) {
        for (const e of run.entities) {
            if (e.type !== 'platform' || !e.move) continue;
            e.top = e.baseTop + Math.sin(run.time * TAU / e.move.period + e.move.phase) * e.move.amp;
            e.y = e.top - 16;
        }
    }

    function updateGoomba(run, e, dt, right) {
        if (!e.active) {
            if (e.x > right + 30) return;
            e.active = true;
        }
        if (e.falling) {
            const prevY = e.y;
            e.vy = Math.max(e.vy - PHYS.gravityFall * dt, -PHYS.terminalVelocity);
            e.y += e.vy * dt;
            if (prevY >= 0 && e.y <= 0 && !pointOverGap(run, e.x)) {
                e.y = 0;
                e.vy = 0;
                e.falling = false;
                emit(run, 'goombaLand', { x: e.x });
            } else if (e.y < -260) {
                e.alive = false;
            }
            return;
        }
        const nextX = e.x + e.vx * dt;
        if (e.platform) {
            const p = e.platform;
            const min = p.x - p.w / 2 + e.w / 2;
            const max = p.x + p.w / 2 - e.w / 2;
            if (nextX < min || nextX > max) e.vx = -e.vx;
            else e.x = nextX;
            e.y = p.top;
        } else {
            const front = nextX + Math.sign(e.vx) * e.w * 0.5;
            if (pointOverGap(run, front)) e.vx = -e.vx;
            else e.x = nextX;
        }
    }

    function updatePara(run, e, dt, right) {
        if (!e.active) {
            if (e.x > right + 30) return;
            e.active = true;
            e.t = 0;
        }
        e.x += e.vx * dt;
        e.y = e.baseY + Math.sin(e.t * 2.4 + e.phase) * e.amp;
    }

    function updateProjectile(run, e, dt) {
        const spec = PROJECTILES[e.type];
        if (!e.spawned) {
            const view = run.view;
            const travel = view.w + 60 - view.ax;
            const tau = travel / Math.max(run.speed + spec.speed, 1);
            const spawnCam = e.crossX - view.ax - run.speed * tau;
            if (!e.warned && run.camX >= spawnCam - Math.max(run.speed, 200) * 0.9) {
                e.warned = true;
                emit(run, 'warn', { kind: e.type, lane: e.lane, y: e.y + e.h / 2 });
            }
            if (run.camX >= spawnCam) {
                e.spawned = true;
                e.x = run.camX + view.w + 60;
                e.t = 0;
                emit(run, 'projectile', { kind: e.type, lane: e.lane });
            }
            return;
        }
        e.x -= spec.speed * dt;
        if (e.x < run.camX - 240) e.alive = false;
    }

    function updateMeteor(run, e, dt) {
        const a = run.alva;
        if (!e.spawned) {
            if (!e.warned && e.impactX - run.camX < run.view.w + 40) {
                e.warned = true;
                emit(run, 'meteorWarn', { x: e.impactX });
            }
            const lead = Math.max(run.speed, 200) * (METEOR.fallTime + METEOR.leadTime);
            if (e.impactX - a.x <= lead) {
                e.spawned = true;
                e.fallT = 0;
                emit(run, 'meteorSpawn', { x: e.impactX });
            }
            return;
        }
        if (e.landed) return;
        e.fallT += dt;
        const t = clamp(e.fallT / METEOR.fallTime, 0, 1);
        e.x = e.impactX + METEOR.drift * (1 - t);
        e.y = METEOR.startHeight * (1 - t * t);
        if (t >= 1) {
            e.landed = true;
            e.type = 'rock';
            e.x = e.impactX;
            e.y = 0;
            e.w = 34;
            e.h = 26;
            e.t = 0;
            emit(run, 'meteorImpact', { x: e.impactX });
        }
    }

    // Star bits and power-ups that fly to Alva: moved relative to her, so
    // they always catch up however fast she runs.
    function homeTowardsAlva(run, e, dt, accel, maxSpeed) {
        const a = run.alva;
        let rx = e.x - a.x;
        let ry = e.y + e.h / 2 - (a.y + ALVA_BOX.height / 2);
        const distance = Math.hypot(rx, ry) || 1;
        e.hv = Math.min(e.hv + accel * dt, maxSpeed);
        const move = Math.min(distance, e.hv * dt);
        rx -= (rx / distance) * move;
        ry -= (ry / distance) * move;
        e.x = a.x + rx;
        e.y = a.y + ALVA_BOX.height / 2 + ry - e.h / 2;
        return distance - move;
    }

    function updateBit(run, e, dt) {
        const a = run.alva;
        if (e.burstT > 0) {
            e.burstT -= dt;
            e.burstVy -= 1800 * dt;
            e.x += (e.burstVx + run.speed) * dt;
            e.y += e.burstVy * dt;
            return;
        }
        if (!e.homing && a.magnetT > 0 && a.mode !== 'rescue') {
            const dx = e.x - a.x;
            const dy = e.y - a.y;
            if (dx > -120 && dx < 280 && Math.abs(dy) < 300) e.homing = true;
        }
        if (e.homing && a.mode !== 'rescue' && a.mode !== 'dying') {
            const remaining = homeTowardsAlva(run, e, dt, 2600, 1100);
            if (remaining < 10) collectBit(run, e);
        }
    }

    function updateItem(run, e, dt) {
        if (e.popping) {
            e.popT += dt;
            e.y = e.baseY + easeOutBack(clamp(e.popT / 0.35, 0, 1)) * 44;
            if (e.popT >= 0.45) {
                e.popping = false;
                e.homing = true;
            }
            return;
        }
        if (e.homing) {
            const remaining = homeTowardsAlva(run, e, dt, 2200, 1000);
            if (remaining < 10) collectItem(run, e);
            return;
        }
        e.y = e.baseY + Math.sin(e.t * 3) * 6;
    }

    function updateEntities(run, dt) {
        const a = run.alva;
        const right = run.camX + run.view.w;
        for (const e of run.entities) {
            if (!e.alive) {
                if (e.deadT !== undefined) e.deadT += dt;
                continue;
            }
            if (e.x > right + 700 && e.type !== 'puck' && e.type !== 'bullet' && e.type !== 'meteor') continue;
            e.t += dt;
            switch (e.type) {
                case 'goomba': updateGoomba(run, e, dt, right); break;
                case 'para': updatePara(run, e, dt, right); break;
                case 'puck':
                case 'bullet': updateProjectile(run, e, dt); break;
                case 'meteor': updateMeteor(run, e, dt); break;
                case 'bit': updateBit(run, e, dt); break;
                case 'item': updateItem(run, e, dt); break;
                case 'block': e.bumpT = Math.max(0, e.bumpT - dt); break;
                case 'hint':
                    if (!e.fired && a.x >= e.x) {
                        e.fired = true;
                        emit(run, 'hint', { key: e.key });
                    }
                    break;
                default: break;
            }
        }

        run.pruneT += dt;
        if (run.pruneT > 0.5) {
            run.pruneT = 0;
            const behind = run.camX - 420;
            run.entities = run.entities.filter((e) => {
                if (e === run.level.star) return true;
                if (!e.alive && (e.deadT === undefined || e.deadT > 1.2)) return false;
                const reach = e.type === 'platform' ? e.w / 2 : 0;
                return e.x + reach > behind || e.homing;
            });
            run.level.entities = run.entities;
        }
    }

    // --- Contacts ------------------------------------------------------
    function collectBit(run, e) {
        const a = run.alva;
        e.alive = false;
        run.bits += 1;
        run.stats.bits += 1;
        addScore(run, SCORE.bit);
        emit(run, 'bit', { x: e.x, y: e.y + e.h / 2, color: e.color });
        run.bitsTowardHeart += 1;
        if (run.bitsTowardHeart >= SCORE.bitsPerHeart) {
            run.bitsTowardHeart = 0;
            if (run.hearts < MAX_HEARTS) {
                run.hearts += 1;
                emit(run, 'heal', { source: 'bits', hearts: run.hearts });
            } else {
                addScore(run, SCORE.heartBonus);
                emit(run, 'bonus', { amount: SCORE.heartBonus, x: a.x, y: a.y + 70 });
            }
        }
    }

    function collectItem(run, e) {
        const a = run.alva;
        e.alive = false;
        addScore(run, SCORE.powerup);
        if (e.kind === 'mushroom') {
            if (run.hearts < MAX_HEARTS) {
                run.hearts += 1;
                emit(run, 'heal', { source: 'mushroom', hearts: run.hearts });
            } else {
                addScore(run, SCORE.heartBonus);
            }
        } else if (e.kind === 'rainbow') {
            a.rainbowT = POWER_TIME.rainbow;
        } else if (e.kind === 'magnet') {
            a.magnetT = POWER_TIME.magnet;
        }
        emit(run, 'powerup', { kind: e.kind, x: e.x, y: e.y + e.h / 2 });
    }

    function defeatEnemy(run, e, cause) {
        e.alive = false;
        e.deadT = 0;
        e.killedBy = cause;
        addScore(run, SCORE.starKill);
        if (e.type === 'goomba' || e.type === 'para') {
            run.goombas += 1;
            run.stats.goombas += 1;
        }
        emit(run, 'defeat', { x: e.x, y: e.y + e.h / 2, cause, kind: e.type, palette: e.palette, points: SCORE.starKill });
    }

    function stompEnemy(run, e) {
        const a = run.alva;
        a.combo += 1;
        const points = SCORE.stompChain[Math.min(a.combo - 1, SCORE.stompChain.length - 1)];
        addScore(run, points);
        const kind = e.type;
        if (kind === 'para') {
            // Paragoombas lose their wings and drop to the ground
            e.type = 'goomba';
            e.falling = true;
            e.wingless = true;
            e.vy = -80;
            e.active = true;
            e.vx = -32;
        } else {
            e.alive = false;
            e.deadT = 0;
            e.killedBy = 'stomp';
            if (kind === 'goomba') {
                run.goombas += 1;
                run.stats.goombas += 1;
            }
        }
        a.vy = run.inputHeld ? PHYS.stompBounceHeld : PHYS.stompBounce;
        a.forceRiseT = PHYS.stompMinRise;
        a.holding = run.inputHeld;
        a.spinReady = true;
        a.grounded = false;
        a.support = null;
        a.mode = 'air';
        a.y = Math.max(a.y, e.y + e.h * 0.55);
        emit(run, 'stomp', { x: e.x, y: e.y + e.h, combo: a.combo, points, palette: e.palette, kind });

        if (a.combo === 5) {
            if (run.hearts < MAX_HEARTS) {
                run.hearts += 1;
                emit(run, 'heal', { source: 'combo', hearts: run.hearts });
            } else {
                addScore(run, SCORE.heartBonus);
                emit(run, 'bonus', { amount: SCORE.heartBonus, x: a.x, y: a.y + 80 });
            }
        }
    }

    function resolveContacts(run) {
        const a = run.alva;
        const box = alvaBox(a);
        const hitBox = shrinkBox(box, 3);
        for (const e of run.entities) {
            if (!e.alive || e.x < a.x - 160 || e.x > a.x + 160) continue;
            if (run.phase !== 'play') return;
            switch (e.type) {
                case 'bit': {
                    const b = boxOf(e);
                    if (overlaps(box, { x0: b.x0 - 5, x1: b.x1 + 5, y0: b.y0 - 5, y1: b.y1 + 5 })) collectBit(run, e);
                    break;
                }
                case 'item':
                    if (!e.popping && overlaps(box, boxOf(e))) collectItem(run, e);
                    break;
                case 'goomba':
                case 'para':
                case 'puck':
                case 'bullet': {
                    if ((e.type === 'puck' || e.type === 'bullet') && !e.spawned) break;
                    if (e.falling && e.vy < -200) break;
                    const enemyBox = boxOf(e);
                    if (!overlaps(box, enemyBox)) break;
                    if (a.rainbowT > 0) {
                        defeatEnemy(run, e, 'rainbow');
                    } else if (a.vy < 0 && a.prevY >= e.y + e.h * 0.45) {
                        stompEnemy(run, e);
                    } else if (a.spinT > 0 && (e.type === 'goomba' || e.type === 'para')) {
                        defeatEnemy(run, e, 'spin');
                    } else if (overlaps(hitBox, shrinkBox(enemyBox, 4))) {
                        hurt(run, e.type);
                    }
                    break;
                }
                case 'rock':
                case 'meteor': {
                    if (e.type === 'meteor' && (!e.spawned || e.landed)) break;
                    const hazard = e.type === 'meteor'
                        ? { x0: e.x - 15, x1: e.x + 15, y0: e.y, y1: e.y + 30 }
                        : boxOf(e);
                    if (!overlaps(box, hazard)) break;
                    if (a.rainbowT > 0) {
                        e.alive = false;
                        e.deadT = 0;
                        addScore(run, SCORE.smash);
                        emit(run, 'smash', { x: e.x, y: e.y + 12, points: SCORE.smash, hot: e.hot });
                    } else if (overlaps(hitBox, shrinkBox(hazard, 4))) {
                        hurt(run, 'rock');
                    }
                    break;
                }
                default: break;
            }
        }
    }

    // --- Galaxy flow -----------------------------------------------------
    function beginLaunch(run) {
        const a = run.alva;
        run.phase = 'launch';
        run.phaseT = 0;
        a.mode = 'launch';
        a.launchFromY = a.y;
        a.grounded = false;
        for (const e of run.entities) {
            if (!e.alive) continue;
            const hazard = e.type === 'goomba' || e.type === 'para' || e.type === 'rock' ||
                ((e.type === 'puck' || e.type === 'bullet') && e.spawned) || (e.type === 'meteor' && e.spawned);
            if (hazard && e.x < run.camX + run.view.w + 80) {
                e.alive = false;
                emit(run, 'poof', { x: e.x, y: e.y + (e.h || 20) / 2 });
            }
        }
        emit(run, 'launch', { x: a.x, y: a.y });
    }

    function beginFinale(run) {
        const a = run.alva;
        run.phase = 'finale';
        run.phaseT = 0;
        a.mode = 'celebrate';
        a.rainbowT = 0;
        a.magnetT = 0;
        const clear = SCORE.galaxyClear * (run.galaxyIndex + 1);
        const perfect = run.stats.damage === 0 ? SCORE.perfect : 0;
        addScore(run, clear + perfect + SCORE.finale);
        run.stats.clearBonus = clear;
        run.stats.perfectBonus = perfect;
        run.stats.finaleBonus = SCORE.finale;
        for (const e of run.entities) {
            if (e.alive && e.type !== 'bit' && e.type !== 'star' && e.type !== 'platform' && e.type !== 'block' && e.type !== 'hint') {
                e.alive = false;
                emit(run, 'poof', { x: e.x, y: e.y + (e.h || 20) / 2 });
            }
        }
        emit(run, 'finale', { x: a.x, y: a.y });
    }

    function checkGoal(run) {
        const a = run.alva;
        const star = run.level.star;
        if (!star || star.grabbed || a.mode === 'rescue' || a.mode === 'drop') return;
        if (a.x >= star.x - 28) {
            star.grabbed = true;
            if (star.grand) beginFinale(run);
            else beginLaunch(run);
        }
    }

    function updateSpeed(run, dt) {
        const a = run.alva;
        let target;
        if (run.phase === 'attract') {
            target = 150;
        } else {
            const progress = clamp(a.x / run.level.starX, 0, 1);
            target = lerp(run.def.speed[0], run.def.speed[1], progress);
            if (a.mode === 'drop') target = 0;
            if (a.rainbowT > 0) target *= 1.18;
            if (a.mode === 'rescue') target *= 0.55;
        }
        const rate = run.speed < target ? 1.8 : 3;
        run.speed += (target - run.speed) * Math.min(1, dt * rate);
    }

    function stepPlay(run, input, dt) {
        const a = run.alva;
        updateSpeed(run, dt);
        a.x += run.speed * dt;
        run.camX = a.x - run.view.ax;
        updatePlatforms(run);
        updateAlva(run, input, dt);
        updateEntities(run, dt);
        if (run.phase === 'play' && a.mode !== 'rescue' && a.mode !== 'drop') resolveContacts(run);
        if (run.phase === 'play') checkGoal(run);
    }

    function stepLaunch(run, dt) {
        const a = run.alva;
        run.speed += (1100 - run.speed) * Math.min(1, dt * 1.6);
        a.x += run.speed * dt;
        run.camX = a.x - run.view.ax;
        a.invuln = 0;
        a.spinT = 0;
        const t = clamp(run.phaseT / 1.2, 0, 1);
        a.y = lerp(a.launchFromY, run.view.groundY + 140, easeInOutSine(t));
        updatePlatforms(run);
        updateEntities(run, dt);
        if (run.phaseT >= 1.5) {
            run.phase = 'cleared';
            run.phaseT = 0;
            const clear = SCORE.galaxyClear * (run.galaxyIndex + 1);
            const perfect = run.stats.damage === 0 ? SCORE.perfect : 0;
            addScore(run, clear + perfect);
            run.stats.clearBonus = clear;
            run.stats.perfectBonus = perfect;
            emit(run, 'cleared', { index: run.galaxyIndex });
        }
    }

    function stepDying(run, dt) {
        const a = run.alva;
        run.speed += (0 - run.speed) * Math.min(1, dt * 6);
        a.x += run.speed * dt;
        run.camX = a.x - run.view.ax;
        if (run.phaseT > 0.35) {
            a.vy -= 2400 * dt;
            a.y += a.vy * dt;
        }
        if (run.phaseT >= 1.7) {
            run.phase = 'dead';
            run.phaseT = 0;
            emit(run, 'gameover', {});
        }
    }

    function stepFinale(run, dt) {
        const a = run.alva;
        run.speed += (0 - run.speed) * Math.min(1, dt * 2.2);
        a.x += run.speed * dt;
        run.camX = a.x - run.view.ax;
        a.y = Math.abs(Math.sin(run.phaseT * 4.2)) * 46 * Math.max(0, 1 - run.phaseT / 6);
        updateEntities(run, dt);
        if (!run.finaleReported && run.phaseT >= 1.4) {
            run.finaleReported = true;
            emit(run, 'finaleReady', {});
        }
    }

    // The menu background: Alva jogs along and shows off a Star Spin now and then.
    function stepAttract(run, dt) {
        const a = run.alva;
        updateSpeed(run, dt);
        a.x += run.speed * dt;
        run.camX = a.x - run.view.ax;
        run.attractJumpT -= dt;
        const input = { press: false, held: a.mode === 'air' && a.vy > 0 };
        if (run.attractJumpT <= 0 && a.grounded) {
            input.press = true;
            input.held = true;
            run.attractJumpT = 2.6;
            run.attractSpinAt = 0.36;
        } else if (a.mode === 'air' && run.attractSpinAt > 0) {
            run.attractSpinAt -= dt;
            if (run.attractSpinAt <= 0) input.press = true;
        }
        updateAlva(run, input, dt);
    }

    function stepRun(run, input, dt) {
        run.time += dt;
        run.phaseT += dt;
        run.inputHeld = !!input.held;
        switch (run.phase) {
            case 'play': stepPlay(run, input, dt); break;
            case 'launch': stepLaunch(run, dt); break;
            case 'dying': stepDying(run, dt); break;
            case 'finale': stepFinale(run, dt); break;
            case 'attract': stepAttract(run, dt); break;
            default: break;
        }
    }

    // =====================================================================
    // 6. SPRITES & ART
    // Alva, the Lumas and the goombas come straight from the page's sprite
    // sheets. Their glows and all vector props are baked once into small
    // canvases, so a frame is mostly cheap image copies.
    // =====================================================================
    const SHEETS = {
        alva: {
            src: 'alva_sprite.png', frameW: 80, frameH: 80, frames: 4, unit: 0.8, anchorX: 46, anchorY: 78,
            // The sheet's frames overlap: the long scarf of frame 3 spills into
            // frame 2's cell. These source rects give each frame only its own
            // pixels (ox = where the rect starts relative to the frame's cell).
            rects: [
                { sx: 0, sw: 80, ox: 0 },
                { sx: 80, sw: 78, ox: 0 },
                { sx: 160, sw: 62, ox: 0 },
                { sx: 224, sw: 96, ox: -16 }
            ]
        },
        luma: { src: 'luma_sprite.png', frameW: 64, frameH: 64, frames: 4, unit: 0.6875, anchorX: 32, anchorY: 34 },
        goomba: { src: 'goomba_sprite_atlas.png', frameW: 96, frameH: 104, frames: 4, unit: 0.46, anchorX: 48, anchorY: 100 }
    };

    const ALVA_GLOW = 'rgba(255, 220, 100, 0.85)';
    const RAINBOW = ['#ff5a5a', '#ffb347', '#fff04d', '#6bff8a', '#4dc3ff', '#c38bff'];
    const GOOMBA_GLOWS = ['rgba(255, 220, 100, 0.9)', 'rgba(84, 216, 255, 0.9)', 'rgba(255, 130, 220, 0.9)', 'rgba(150, 255, 120, 0.9)'];
    const GOOMBA_FLASH = ['#fff5b4', '#d2faff', '#ffe2f6', '#e9ffce'];
    const LUMA_GLOWS = ['rgba(255, 224, 110, 0.9)', 'rgba(84, 190, 255, 0.9)', 'rgba(255, 140, 220, 0.9)', 'rgba(255, 150, 60, 0.9)'];
    const INK = '#140a26';

    const BIT_COLORS = [
        { main: '#ffe14d', light: '#fffbd6', dark: '#c98a00', glow: 'rgba(255, 225, 77, 0.95)' },
        { main: '#4dc3ff', light: '#e0f6ff', dark: '#1a64c2', glow: 'rgba(77, 195, 255, 0.95)' },
        { main: '#ff6fcf', light: '#ffe0f5', dark: '#b01f7a', glow: 'rgba(255, 111, 207, 0.95)' },
        { main: '#7dff6b', light: '#e6ffe0', dark: '#2a9420', glow: 'rgba(125, 255, 107, 0.95)' },
        { main: '#b18cff', light: '#f0e8ff', dark: '#6236cc', glow: 'rgba(177, 140, 255, 0.95)' },
        { main: '#ff9f43', light: '#ffe8d0', dark: '#bf5406', glow: 'rgba(255, 159, 67, 0.95)' }
    ];

    const SPARK_COLORS = {
        white: '#ffffff', gold: '#ffd76d', cyan: '#6ee8ff', pink: '#ff7ad5', green: '#8dff7a',
        purple: '#b98cff', orange: '#ffa25c', red: '#ff5a5a', blue: '#5aa8ff'
    };

    function makeCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.ceil(width));
        canvas.height = Math.max(1, Math.ceil(height));
        return canvas;
    }

    function starPath(g, cx, cy, outer, inner, points = 5, rotation = -Math.PI / 2) {
        g.beginPath();
        for (let i = 0; i < points * 2; i += 1) {
            const radius = i % 2 === 0 ? outer : inner;
            const angle = rotation + (i * Math.PI) / points;
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.closePath();
    }

    function roundRectPath(g, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        g.beginPath();
        g.moveTo(x + radius, y);
        g.arcTo(x + w, y, x + w, y + h, radius);
        g.arcTo(x + w, y + h, x, y + h, radius);
        g.arcTo(x, y + h, x, y, radius);
        g.arcTo(x, y, x + w, y, radius);
        g.closePath();
    }

    // A chubby, rounded star with an ink outline – star bits, the rainbow
    // star and the launch star are all variations of it.
    function paintCandyStar(g, s, { outer, inner, main, light, dark, glow, outline = INK, glowBlur = 7, rotation = -Math.PI / 2 }) {
        g.save();
        g.lineJoin = 'round';
        starPath(g, 0, 0, outer, inner, 5, rotation);
        if (glow) {
            g.shadowColor = glow;
            g.shadowBlur = glowBlur * s;
        }
        g.lineWidth = outer * 0.5;
        g.strokeStyle = outline;
        g.stroke();
        g.shadowBlur = 0;
        const gradient = g.createLinearGradient(-outer, -outer, outer * 0.8, outer);
        gradient.addColorStop(0, light);
        gradient.addColorStop(0.5, main);
        gradient.addColorStop(1, dark);
        g.fillStyle = gradient;
        g.strokeStyle = gradient;
        g.lineWidth = outer * 0.26;
        g.fill();
        g.stroke();
        g.fillStyle = 'rgba(255, 255, 255, 0.85)';
        g.beginPath();
        g.ellipse(-outer * 0.22, -outer * 0.3, outer * 0.16, outer * 0.1, -0.6, 0, TAU);
        g.fill();
        g.restore();
    }

    const art = {
        images: {},
        loaded: false,
        scale: 0,
        baked: new Map(),
        glows: new Map(),

        load() {
            const jobs = Object.entries(SHEETS).map(([key, sheet]) => new Promise((resolve) => {
                const image = new Image();
                image.onload = () => {
                    this.images[key] = image;
                    resolve();
                };
                image.onerror = () => resolve();
                image.src = sheet.src;
            }));
            return Promise.all(jobs).then(() => {
                this.bakeSheetGlows();
                this.loaded = true;
            });
        },

        // A soft glow around a sprite frame: draw the frame far off-canvas
        // and keep only its blurred shadow.
        bakeGlow(image, sx, sy, sw, sh, color, blur, pad) {
            const canvas = makeCanvas(sw + pad * 2, sh + pad * 2);
            const g = canvas.getContext('2d');
            g.shadowColor = color;
            g.shadowBlur = blur;
            g.shadowOffsetX = 10000;
            g.drawImage(image, sx, sy, sw, sh, pad - 10000, pad, sw, sh);
            g.drawImage(image, sx, sy, sw, sh, pad - 10000, pad, sw, sh);
            return canvas;
        },

        bakeTint(image, sx, sy, sw, sh, color) {
            const canvas = makeCanvas(sw, sh);
            const g = canvas.getContext('2d');
            g.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
            g.globalCompositeOperation = 'source-in';
            g.fillStyle = color;
            g.fillRect(0, 0, sw, sh);
            return canvas;
        },

        bakeSheetGlows() {
            const alva = this.images.alva;
            if (alva) {
                const sheet = SHEETS.alva;
                sheet.rects.forEach(({ sx, sw }, f) => {
                    this.glows.set(`alva:${f}:gold`, this.bakeGlow(alva, sx, 0, sw, sheet.frameH, ALVA_GLOW, 10, 16));
                    this.glows.set(`alva:${f}:white`, this.bakeTint(alva, sx, 0, sw, sheet.frameH, '#ffffff'));
                    RAINBOW.forEach((color, i) => {
                        this.glows.set(`alva:${f}:rainbow${i}`, this.bakeGlow(alva, sx, 0, sw, sheet.frameH, color, 14, 16));
                        this.glows.set(`alva:${f}:ghost${i}`, this.bakeTint(alva, sx, 0, sw, sheet.frameH, color));
                    });
                });
            }
            const luma = this.images.luma;
            if (luma) {
                const sheet = SHEETS.luma;
                for (let f = 0; f < sheet.frames; f += 1) {
                    this.glows.set(`luma:${f}`, this.bakeGlow(luma, f * sheet.frameW, 0, sheet.frameW, sheet.frameH, LUMA_GLOWS[f], 10, 14));
                }
            }
            const goomba = this.images.goomba;
            if (goomba) {
                const sheet = SHEETS.goomba;
                for (let row = 0; row < 4; row += 1) {
                    this.glows.set(`goomba:${row}`, this.bakeGlow(goomba, sheet.frameW, row * sheet.frameH, sheet.frameW, sheet.frameH, GOOMBA_GLOWS[row], 12, 16));
                }
            }
        },

        // Vector props are baked at the current device scale (device px per unit).
        bake(key, width, height, draw, pad = 10) {
            const s = this.scale;
            const canvas = makeCanvas((width + pad * 2) * s, (height + pad * 2) * s);
            const g = canvas.getContext('2d');
            g.scale(s, s);
            g.translate(pad + width / 2, pad + height / 2);
            draw(g, s);
            // cw = the prop's own width, so drawSprite(size) means "this wide without the glow margin"
            this.baked.set(key, { canvas, w: canvas.width / s, h: canvas.height / s, ox: pad + width / 2, oy: pad + height / 2, cw: width });
        },

        get(key) {
            return this.baked.get(key);
        },

        rebake(scale) {
            if (Math.abs(scale - this.scale) < 0.01 && this.baked.size) return;
            this.scale = scale;
            this.baked.clear();

            BIT_COLORS.forEach((c, i) => {
                this.bake(`bit${i}`, 22, 22, (g, s) => paintCandyStar(g, s, { outer: 9.5, inner: 5.4, ...c, glowBlur: 8 }));
            });

            RAINBOW.forEach((color, i) => {
                this.bake(`rainbow${i}`, 34, 34, (g, s) => {
                    paintCandyStar(g, s, { outer: 15, inner: 8.4, main: color, light: '#ffffff', dark: RAINBOW[(i + 2) % RAINBOW.length], glow: color, glowBlur: 12 });
                    g.fillStyle = INK;
                    g.beginPath();
                    g.ellipse(-3.4, -0.5, 1.6, 2.8, 0, 0, TAU);
                    g.ellipse(3.4, -0.5, 1.6, 2.8, 0, 0, TAU);
                    g.fill();
                    g.fillStyle = '#ffffff';
                    g.fillRect(-3.9, -2.4, 1, 1.2);
                    g.fillRect(2.9, -2.4, 1, 1.2);
                });
            });

            this.bake('launchStar', 64, 64, (g, s) => {
                paintCandyStar(g, s, { outer: 27, inner: 14, main: '#ff9a1f', light: '#fff3b0', dark: '#e0520a', glow: 'rgba(255, 170, 60, 0.95)', glowBlur: 18 });
                g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
                g.lineWidth = 1.4;
                g.lineJoin = 'round';
                starPath(g, 0, 0, 17, 9);
                g.stroke();
            }, 20);

            this.bake('grandStar', 92, 92, (g, s) => {
                paintCandyStar(g, s, { outer: 40, inner: 21, main: '#ffd21f', light: '#fffbe0', dark: '#e08a00', glow: 'rgba(255, 236, 140, 1)', glowBlur: 26 });
                g.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                g.lineWidth = 2;
                g.lineJoin = 'round';
                starPath(g, 0, 0, 25, 13);
                g.stroke();
            }, 30);

            for (let v = 0; v < 3; v += 1) {
                this.bake(`rock${v}`, 44, 36, (g, s) => this.paintRock(g, s, v, false));
                this.bake(`rockHot${v}`, 44, 36, (g, s) => this.paintRock(g, s, v, true));
            }

            this.bake('block', 36, 36, (g, s) => this.paintBlock(g, s, false));
            this.bake('blockUsed', 36, 36, (g, s) => this.paintBlock(g, s, true));
            this.bake('mushroom', 32, 32, (g, s) => this.paintMushroom(g, s));
            this.bake('bubble', 38, 38, (g, s) => this.paintBubble(g, s));
            this.bake('bullet', 46, 30, (g, s) => this.paintBullet(g, s));
            this.bake('puck', 40, 18, (g, s) => this.paintPuck(g, s));
            this.bake('wing', 22, 16, (g, s) => this.paintWing(g, s));
            this.bake('heart', 20, 18, (g, s) => this.paintHeart(g, s));
            this.bake('dust', 16, 16, (g) => {
                const gradient = g.createRadialGradient(0, 0, 0, 0, 0, 8);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                g.fillStyle = gradient;
                g.fillRect(-8, -8, 16, 16);
            }, 2);
            this.bake('shadow', 40, 12, (g) => {
                const gradient = g.createRadialGradient(0, 0, 0, 0, 0, 20);
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                g.fillStyle = gradient;
                g.scale(1, 0.3);
                g.fillRect(-20, -20, 40, 40);
            }, 2);

            for (const [name, color] of Object.entries(SPARK_COLORS)) {
                this.bake(`dot:${name}`, 16, 16, (g) => {
                    const gradient = g.createRadialGradient(0, 0, 0, 0, 0, 8);
                    gradient.addColorStop(0, '#ffffff');
                    gradient.addColorStop(0.3, color);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    g.fillStyle = gradient;
                    g.fillRect(-8, -8, 16, 16);
                }, 2);
                this.bake(`spark:${name}`, 16, 16, (g, s) => {
                    g.shadowColor = color;
                    g.shadowBlur = 5 * s;
                    g.fillStyle = '#ffffff';
                    starPath(g, 0, 0, 7, 1.6, 4, 0);
                    g.fill();
                }, 4);
            }
        },

        paintRock(g, s, variant, hot) {
            const points = [];
            for (let i = 0; i < 11; i += 1) {
                const angle = (i / 11) * TAU;
                const jitter = 0.84 + hashNoise(variant * 31 + i * 7) * 0.24;
                let px = Math.cos(angle) * 20 * jitter;
                let py = Math.sin(angle) * 16 * jitter;
                if (py > 10) py = 10 + (py - 10) * 0.25;
                points.push([px, py + 3]);
            }
            g.save();
            g.beginPath();
            for (let i = 0; i < points.length; i += 1) {
                const [x0, y0] = points[i];
                const [x1, y1] = points[(i + 1) % points.length];
                const mx = (x0 + x1) / 2;
                const my = (y0 + y1) / 2;
                if (i === 0) g.moveTo(mx, my);
                else g.quadraticCurveTo(x0, y0, mx, my);
            }
            const [fx, fy] = points[0];
            const [sx, sy] = points[1];
            g.quadraticCurveTo(fx, fy, (fx + sx) / 2, (fy + sy) / 2);
            g.closePath();
            g.shadowColor = hot ? 'rgba(255, 120, 40, 0.95)' : 'rgba(185, 160, 255, 0.55)';
            g.shadowBlur = (hot ? 12 : 7) * s;
            g.lineWidth = 3;
            g.lineJoin = 'round';
            g.strokeStyle = INK;
            g.stroke();
            g.shadowBlur = 0;
            const gradient = g.createLinearGradient(-16, -14, 14, 16);
            gradient.addColorStop(0, hot ? '#b07a6a' : '#cfc4ee');
            gradient.addColorStop(0.45, hot ? '#6e4038' : '#8a7cb4');
            gradient.addColorStop(1, hot ? '#2e1512' : '#3a3160');
            g.fillStyle = gradient;
            g.fill();
            g.clip();
            // Craters
            const craters = [[-7 + variant * 3, -2, 4.4], [6 - variant, 4, 3.2], [-1, 7 - variant, 2.4]];
            for (const [cx, cy, r] of craters) {
                g.fillStyle = hot ? 'rgba(40, 10, 8, 0.55)' : 'rgba(40, 30, 80, 0.45)';
                g.beginPath();
                g.ellipse(cx, cy, r, r * 0.75, 0, 0, TAU);
                g.fill();
                g.strokeStyle = hot ? 'rgba(255, 200, 150, 0.35)' : 'rgba(240, 232, 255, 0.45)';
                g.lineWidth = 0.9;
                g.beginPath();
                g.ellipse(cx + 0.4, cy + 0.5, r, r * 0.75, 0, 0.2, Math.PI - 0.2);
                g.stroke();
            }
            if (hot) {
                g.strokeStyle = '#ffcc4d';
                g.shadowColor = '#ff7a1a';
                g.shadowBlur = 6 * s;
                g.lineWidth = 1.6;
                g.lineCap = 'round';
                g.beginPath();
                g.moveTo(-12, 4);
                g.lineTo(-5, 0);
                g.lineTo(-1, 5);
                g.lineTo(6, -3);
                g.lineTo(12, 1);
                g.moveTo(-1, 5);
                g.lineTo(1, 11);
                g.stroke();
            }
            g.restore();
            g.fillStyle = hot ? 'rgba(255, 220, 180, 0.4)' : 'rgba(255, 255, 255, 0.5)';
            g.beginPath();
            g.ellipse(-8, -8, 5, 2.2, -0.4, 0, TAU);
            g.fill();
        },

        paintBlock(g, s, used) {
            g.save();
            g.shadowColor = used ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 210, 80, 0.8)';
            g.shadowBlur = (used ? 4 : 10) * s;
            roundRectPath(g, -17, -17, 34, 34, 5);
            g.fillStyle = INK;
            g.fill();
            g.shadowBlur = 0;
            const gradient = g.createLinearGradient(0, -15, 0, 15);
            gradient.addColorStop(0, used ? '#b07a4a' : '#ffe27a');
            gradient.addColorStop(0.55, used ? '#8a5530' : '#f6b716');
            gradient.addColorStop(1, used ? '#5e3518' : '#d98a00');
            roundRectPath(g, -15, -15, 30, 30, 4);
            g.fillStyle = gradient;
            g.fill();
            g.strokeStyle = used ? 'rgba(255, 220, 180, 0.25)' : 'rgba(255, 250, 220, 0.8)';
            g.lineWidth = 1.4;
            g.beginPath();
            g.moveTo(-13, 11);
            g.lineTo(-13, -13);
            g.lineTo(11, -13);
            g.stroke();
            g.strokeStyle = 'rgba(80, 30, 0, 0.45)';
            g.beginPath();
            g.moveTo(13, -11);
            g.lineTo(13, 13);
            g.lineTo(-11, 13);
            g.stroke();
            g.fillStyle = used ? 'rgba(40, 18, 5, 0.7)' : 'rgba(120, 60, 0, 0.8)';
            for (const [x, y] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
                g.beginPath();
                g.arc(x, y, 1.7, 0, TAU);
                g.fill();
            }
            if (!used) {
                g.font = "18px 'Press Start 2P', monospace";
                g.textAlign = 'center';
                g.textBaseline = 'middle';
                g.fillStyle = 'rgba(120, 50, 0, 0.9)';
                g.fillText('?', 2, 3);
                g.fillStyle = '#ffffff';
                g.fillText('?', 0, 1);
            }
            g.restore();
        },

        paintMushroom(g, s) {
            g.save();
            g.lineJoin = 'round';
            g.shadowColor = 'rgba(255, 90, 90, 0.8)';
            g.shadowBlur = 9 * s;
            // stem
            roundRectPath(g, -8.5, -1, 17, 15, 5);
            g.fillStyle = INK;
            g.fill();
            g.shadowBlur = 0;
            roundRectPath(g, -7, 0, 14, 12.5, 4);
            g.fillStyle = '#fff1d6';
            g.fill();
            g.fillStyle = INK;
            g.beginPath();
            g.ellipse(-2.8, 5.2, 1.2, 2.2, 0, 0, TAU);
            g.ellipse(2.8, 5.2, 1.2, 2.2, 0, 0, TAU);
            g.fill();
            // cap
            g.beginPath();
            g.moveTo(-15, 2);
            g.bezierCurveTo(-16, -17, 16, -17, 15, 2);
            g.closePath();
            g.lineWidth = 3;
            g.strokeStyle = INK;
            g.stroke();
            const gradient = g.createLinearGradient(0, -14, 0, 2);
            gradient.addColorStop(0, '#ff6b5e');
            gradient.addColorStop(1, '#c4140f');
            g.fillStyle = gradient;
            g.fill();
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.arc(0, -7, 4, 0, TAU);
            g.moveTo(-8.5, -2);
            g.arc(-10, -2, 3.2, 0, TAU);
            g.moveTo(13, -2);
            g.arc(10, -2, 3.2, 0, TAU);
            g.fill();
            g.restore();
        },

        paintBubble(g, s) {
            g.save();
            const gradient = g.createRadialGradient(0, 0, 6, 0, 0, 18);
            gradient.addColorStop(0, 'rgba(160, 230, 255, 0.05)');
            gradient.addColorStop(0.8, 'rgba(160, 230, 255, 0.28)');
            gradient.addColorStop(1, 'rgba(200, 245, 255, 0.55)');
            g.shadowColor = 'rgba(110, 230, 255, 0.9)';
            g.shadowBlur = 10 * s;
            g.fillStyle = gradient;
            g.beginPath();
            g.arc(0, 0, 18, 0, TAU);
            g.fill();
            g.shadowBlur = 0;
            g.strokeStyle = 'rgba(225, 250, 255, 0.9)';
            g.lineWidth = 1.3;
            g.stroke();
            if (art.images.luma) {
                const sheet = SHEETS.luma;
                g.imageSmoothingEnabled = false;
                g.drawImage(art.images.luma, sheet.frameW, 0, sheet.frameW, sheet.frameH, -13, -13, 26, 26);
            }
            g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            g.lineWidth = 2;
            g.lineCap = 'round';
            g.beginPath();
            g.arc(0, 0, 13.5, Math.PI * 1.1, Math.PI * 1.4);
            g.stroke();
            g.restore();
        },

        paintBullet(g, s) {
            g.save();
            g.lineJoin = 'round';
            g.shadowColor = 'rgba(255, 90, 90, 0.55)';
            g.shadowBlur = 8 * s;
            // Body: round nose on the left (it flies left), flat back on the right
            g.beginPath();
            g.moveTo(12, -12);
            g.lineTo(-6, -12);
            g.arc(-6, 0, 12, -Math.PI / 2, Math.PI / 2, true);
            g.lineTo(12, 12);
            g.closePath();
            g.lineWidth = 3;
            g.strokeStyle = INK;
            g.stroke();
            g.shadowBlur = 0;
            const gradient = g.createLinearGradient(0, -12, 0, 12);
            gradient.addColorStop(0, '#5a5478');
            gradient.addColorStop(0.35, '#2a2440');
            gradient.addColorStop(1, '#14101f');
            g.fillStyle = gradient;
            g.fill();
            // Back cap
            roundRectPath(g, 11, -13, 9, 26, 2);
            g.fillStyle = INK;
            g.fill();
            roundRectPath(g, 12.5, -11.5, 6, 23, 1.5);
            g.fillStyle = '#6d6a86';
            g.fill();
            // Eye
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.ellipse(-8, -4, 4.4, 5.2, 0, 0, TAU);
            g.fill();
            g.fillStyle = INK;
            g.beginPath();
            g.ellipse(-9.6, -3.6, 1.8, 2.8, 0, 0, TAU);
            g.fill();
            g.strokeStyle = '#ffffff';
            g.lineWidth = 2;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(-13, -10.5);
            g.lineTo(-4, -8.5);
            g.stroke();
            // Arm
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.ellipse(1, 6.5, 4.2, 3, -0.3, 0, TAU);
            g.fill();
            g.strokeStyle = INK;
            g.lineWidth = 1;
            g.stroke();
            g.restore();
        },

        paintPuck(g, s) {
            g.save();
            g.shadowColor = 'rgba(170, 235, 255, 0.7)';
            g.shadowBlur = 8 * s;
            g.fillStyle = '#0b0b10';
            g.beginPath();
            g.ellipse(0, 3, 19, 5, 0, 0, Math.PI);
            g.lineTo(-19, -3);
            g.ellipse(0, -3, 19, 5, 0, Math.PI, TAU);
            g.closePath();
            g.fill();
            g.shadowBlur = 0;
            g.fillStyle = '#26262f';
            g.beginPath();
            g.ellipse(0, -3, 19, 5, 0, 0, TAU);
            g.fill();
            g.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            g.lineWidth = 1;
            g.beginPath();
            g.ellipse(0, -3, 17, 4, 0, Math.PI * 1.05, Math.PI * 1.7);
            g.stroke();
            g.fillStyle = '#ff7ad5';
            starPath(g, 0, -3, 3.6, 1.6, 5);
            g.fill();
            g.restore();
        },

        paintWing(g, s) {
            g.save();
            g.lineJoin = 'round';
            g.shadowColor = 'rgba(255, 255, 255, 0.8)';
            g.shadowBlur = 6 * s;
            g.beginPath();
            g.moveTo(-10, 5);
            g.quadraticCurveTo(-11, -7, 2, -8);
            g.quadraticCurveTo(10, -8, 11, -2);
            g.quadraticCurveTo(7, -2, 8, 2);
            g.quadraticCurveTo(4, 1, 4, 5);
            g.quadraticCurveTo(0, 3, -1, 7);
            g.quadraticCurveTo(-4, 4, -10, 5);
            g.closePath();
            g.lineWidth = 2.4;
            g.strokeStyle = INK;
            g.stroke();
            g.shadowBlur = 0;
            const gradient = g.createLinearGradient(0, -8, 0, 7);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#c9e6ff');
            g.fillStyle = gradient;
            g.fill();
            g.restore();
        },

        paintHeart(g, s) {
            g.save();
            g.shadowColor = 'rgba(255, 90, 120, 0.9)';
            g.shadowBlur = 8 * s;
            g.beginPath();
            g.moveTo(0, 7);
            g.bezierCurveTo(-11, -1, -8, -10, 0, -4.5);
            g.bezierCurveTo(8, -10, 11, -1, 0, 7);
            g.closePath();
            g.lineWidth = 2.4;
            g.lineJoin = 'round';
            g.strokeStyle = INK;
            g.stroke();
            g.shadowBlur = 0;
            g.fillStyle = '#ff4d6d';
            g.fill();
            g.fillStyle = 'rgba(255, 255, 255, 0.8)';
            g.beginPath();
            g.ellipse(-4, -3.5, 2, 1.3, -0.5, 0, TAU);
            g.fill();
            g.restore();
        }
    };

    // =====================================================================
    // 7. BACKGROUNDS
    // Every galaxy gets its own sky: a baked gradient with nebulae, twinkling
    // star layers with parallax, planets and one signature feature.
    // =====================================================================
    function seededRandom(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
        const holder = { rngState: h >>> 0 };
        return () => nextRandom(holder);
    }

    const wrap = (value, size) => ((value % size) + size) % size;

    function bakePlanet(p, scale) {
        const ringSpan = p.ring ? p.r * 1.9 : p.r * 1.25;
        const size = ringSpan * 2 + 20;
        const canvas = makeCanvas(size * scale, size * scale);
        const g = canvas.getContext('2d');
        g.scale(scale, scale);
        g.translate(size / 2, size / 2);
        const ring = (front) => {
            if (!p.ring) return;
            g.save();
            g.rotate(-0.32);
            g.strokeStyle = p.ring;
            g.lineWidth = p.r * 0.16;
            g.beginPath();
            g.ellipse(0, 0, p.r * 1.75, p.r * 0.42, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
            g.stroke();
            g.restore();
        };
        ring(false);
        g.save();
        g.shadowColor = p.colors[0];
        g.shadowBlur = p.r * 0.6 * scale;
        const gradient = g.createRadialGradient(-p.r * 0.35, -p.r * 0.35, p.r * 0.1, 0, 0, p.r);
        gradient.addColorStop(0, p.colors[0]);
        gradient.addColorStop(1, p.colors[1]);
        g.fillStyle = gradient;
        g.beginPath();
        g.arc(0, 0, p.r, 0, TAU);
        g.fill();
        g.restore();
        g.save();
        g.beginPath();
        g.arc(0, 0, p.r, 0, TAU);
        g.clip();
        if (p.craters) {
            for (let i = 0; i < 6; i += 1) {
                const angle = i * 2.4;
                const dist = p.r * (0.2 + (i % 3) * 0.22);
                g.fillStyle = 'rgba(0, 0, 0, 0.12)';
                g.beginPath();
                g.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, p.r * (0.1 + (i % 2) * 0.07), 0, TAU);
                g.fill();
            }
        } else {
            g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            g.lineWidth = p.r * 0.12;
            for (let i = -2; i <= 2; i += 1) {
                g.beginPath();
                g.ellipse(0, i * p.r * 0.34, p.r * 1.2, p.r * 0.08, 0.1, 0, TAU);
                g.stroke();
            }
        }
        const shade = g.createRadialGradient(-p.r * 0.4, -p.r * 0.4, p.r * 0.3, 0, 0, p.r * 1.05);
        shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shade.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        g.fillStyle = shade;
        g.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        g.restore();
        ring(true);
        return { canvas, size };
    }

    function bakeBalloon(color, scale) {
        const canvas = makeCanvas(26 * scale, 52 * scale);
        const g = canvas.getContext('2d');
        g.scale(scale, scale);
        g.translate(13, 16);
        g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(0, 14);
        g.bezierCurveTo(4, 22, -4, 28, 1, 35);
        g.stroke();
        const gradient = g.createRadialGradient(-4, -5, 1, 0, 0, 14);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.25, color);
        gradient.addColorStop(1, color);
        g.fillStyle = gradient;
        g.beginPath();
        g.ellipse(0, 0, 10, 13, 0, 0, TAU);
        g.fill();
        g.beginPath();
        g.moveTo(-2, 12.5);
        g.lineTo(2, 12.5);
        g.lineTo(0, 15);
        g.closePath();
        g.fill();
        return canvas;
    }

    const LETTERS = {
        A: [[[0, 1], [0.5, 0], [1, 1]], [[0.25, 0.55], [0.75, 0.55]]],
        L: [[[0.1, 0], [0.1, 1], [0.85, 1]]],
        V: [[[0, 0], [0.5, 1], [1, 0]]],
        1: [[[0.25, 0.22], [0.6, 0], [0.6, 1]]],
        0: [[[0.5, 0], [0.9, 0.2], [1, 0.5], [0.9, 0.8], [0.5, 1], [0.1, 0.8], [0, 0.5], [0.1, 0.2], [0.5, 0]]]
    };

    const FEATURES = {
        embers: {
            create(rand) {
                return { items: Array.from({ length: 30 }, () => ({ x: rand(), speed: 14 + rand() * 24, phase: rand() * TAU, size: 1.2 + rand() * 1.6, gold: rand() < 0.4 })) };
            },
            back(state, g, bd, camX, time) {
                const span = bd.W + 200;
                for (const e of state.items) {
                    const x = wrap(e.x * span - camX * 0.3 + Math.sin(time * 0.8 + e.phase) * 12, span) - 100;
                    const rise = wrap(time * e.speed + e.phase * 60, bd.groundY);
                    const y = bd.groundY - rise;
                    const alpha = (0.45 + Math.sin(time * 5 + e.phase) * 0.3) * (1 - rise / bd.groundY);
                    drawSprite(g, e.gold ? 'dot:gold' : 'dot:orange', x, y, e.size * 2.4, alpha);
                }
            }
        },
        fireflies: {
            create(rand) {
                return {
                    items: Array.from({ length: 24 }, () => ({ x: rand(), y: 0.15 + rand() * 0.7, phase: rand() * TAU, size: 1 + rand() * 1.4, color: ['cyan', 'green', 'gold'][Math.floor(rand() * 3)] })),
                    lumas: [0, 1, 2].map((i) => ({ x: 0.2 + i * 0.3, y: 0.18 + rand() * 0.25, phase: rand() * TAU, frame: (i + 1) % 4 }))
                };
            },
            back(state, g, bd, camX, time) {
                const span = bd.W + 200;
                for (const l of state.lumas) {
                    const x = wrap(l.x * span - camX * 0.08, span) - 100;
                    const y = l.y * bd.groundY + Math.sin(time * 1.3 + l.phase) * 8;
                    drawLuma(g, l.frame, x, y, 0.42, 0.55, 0);
                }
                for (const f of state.items) {
                    const x = wrap(f.x * span - camX * 0.22 + Math.sin(time * 0.5 + f.phase) * 40, span) - 100;
                    const y = f.y * bd.groundY + Math.sin(time * 0.9 + f.phase * 2) * 22;
                    drawSprite(g, `dot:${f.color}`, x, y, f.size * 3, 0.35 + Math.sin(time * 3 + f.phase) * 0.3);
                }
            }
        },
        mountains: {
            create(rand) {
                const ridge = (count, min, max) => Array.from({ length: count }, (_, i) => ({ x: i / count, h: min + rand() * (max - min) }));
                return { far: ridge(14, 110, 210), near: ridge(18, 50, 120) };
            },
            back(state, g, bd, camX) {
                const layer = (points, parallax, width, colors, snow) => {
                    const offset = wrap(camX * parallax, width);
                    const gradient = g.createLinearGradient(0, bd.groundY - 220, 0, bd.groundY);
                    gradient.addColorStop(0, colors[0]);
                    gradient.addColorStop(1, colors[1]);
                    g.fillStyle = gradient;
                    for (let copy = -1; copy <= Math.ceil(bd.W / width); copy += 1) {
                        const base = copy * width - offset;
                        if (base > bd.W || base + width < 0) continue;
                        g.beginPath();
                        g.moveTo(base, bd.groundY);
                        points.forEach((p, i) => {
                            const x = base + p.x * width;
                            g.lineTo(x, bd.groundY - p.h);
                            const next = points[(i + 1) % points.length];
                            const nx = base + (i + 1 === points.length ? width : next.x * width);
                            g.lineTo((x + nx) / 2, bd.groundY - (p.h + next.h) * 0.36);
                        });
                        g.lineTo(base + width, bd.groundY - points[0].h);
                        g.lineTo(base + width, bd.groundY);
                        g.closePath();
                        g.fill();
                        if (snow) {
                            g.fillStyle = 'rgba(255, 240, 230, 0.55)';
                            points.forEach((p) => {
                                if (p.h < 170) return;
                                const x = base + p.x * width;
                                const y = bd.groundY - p.h;
                                g.beginPath();
                                g.moveTo(x, y);
                                g.lineTo(x - 13, y + 16);
                                g.lineTo(x - 4, y + 12);
                                g.lineTo(x + 3, y + 17);
                                g.lineTo(x + 12, y + 14);
                                g.closePath();
                                g.fill();
                            });
                            g.fillStyle = gradient;
                        }
                    }
                };
                layer(state.far, 0.1, 1500, ['rgba(120, 80, 150, 0.85)', 'rgba(60, 36, 80, 0.9)'], true);
                layer(state.near, 0.26, 1300, ['rgba(52, 30, 66, 0.95)', 'rgba(26, 16, 34, 1)'], false);
            }
        },
        comets: {
            create() {
                return { comets: [], nextAt: 1.2 };
            },
            back(state, g, bd, camX, time, rand) {
                if (time > state.nextAt) {
                    state.nextAt = time + 2.2 + rand() * 2.6;
                    state.comets.push({ born: time, x: bd.W * (0.3 + rand() * 0.8), y: rand() * bd.groundY * 0.35, color: rand() < 0.5 ? '#48eeff' : '#ff9be0' });
                }
                state.comets = state.comets.filter((c) => time - c.born < 1.6);
                for (const c of state.comets) {
                    const age = time - c.born;
                    const x = c.x - age * 420;
                    const y = c.y + age * 170;
                    const alpha = Math.min(1, age * 4) * (1 - age / 1.6);
                    const tail = g.createLinearGradient(x, y, x + 130, y - 53);
                    tail.addColorStop(0, c.color);
                    tail.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    g.globalAlpha = alpha;
                    g.strokeStyle = tail;
                    g.lineWidth = 3;
                    g.lineCap = 'round';
                    g.beginPath();
                    g.moveTo(x, y);
                    g.lineTo(x + 130, y - 53);
                    g.stroke();
                    g.globalAlpha = 1;
                    drawSprite(g, 'dot:white', x, y, 12, alpha);
                }
            }
        },
        lake: {
            create(rand) {
                return { glints: Array.from({ length: 34 }, () => ({ x: rand(), y: rand(), w: 6 + rand() * 18, phase: rand() * TAU })), fish: null, nextFish: 2 };
            },
            back(state, g, bd, camX, time, rand) {
                const top = bd.groundY - 70;
                if (!state.gradient || state.gradientTop !== top) {
                    state.gradient = g.createLinearGradient(0, top, 0, bd.groundY);
                    state.gradient.addColorStop(0, 'rgba(90, 190, 255, 0.35)');
                    state.gradient.addColorStop(1, 'rgba(8, 40, 70, 0.9)');
                    state.gradientTop = top;
                }
                g.fillStyle = state.gradient;
                g.fillRect(0, top, bd.W, 70);
                g.fillStyle = 'rgba(210, 245, 255, 0.55)';
                g.fillRect(0, top, bd.W, 1.2);
                const moon = bd.planets[0];
                if (moon) {
                    const mx = moon.screenX;
                    for (let i = 0; i < 7; i += 1) {
                        const w = 26 - i * 2.4 + Math.sin(time * 2 + i) * 4;
                        g.fillStyle = `rgba(240, 250, 255, ${0.4 - i * 0.04})`;
                        g.fillRect(mx - w / 2, top + 5 + i * 9, w, 2);
                    }
                }
                const span = bd.W + 100;
                for (const s of state.glints) {
                    const x = wrap(s.x * span - camX * 0.32, span) - 50;
                    const y = top + 6 + s.y * 58;
                    g.fillStyle = `rgba(200, 240, 255, ${0.18 + Math.sin(time * 2.4 + s.phase) * 0.14})`;
                    g.fillRect(x, y, s.w, 1.2);
                }
                if (!state.fish && time > state.nextFish) {
                    state.fish = { born: time, x: bd.W * (0.35 + rand() * 0.6), dir: rand() < 0.5 ? -1 : 1 };
                }
                if (state.fish) {
                    const age = time - state.fish.born;
                    if (age > 1.1) {
                        state.fish = null;
                        state.nextFish = time + 2.5 + rand() * 3;
                    } else {
                        const x = state.fish.x + state.fish.dir * age * 70;
                        const y = top + 12 - Math.sin((age / 1.1) * Math.PI) * 46;
                        g.save();
                        g.translate(x, y);
                        g.rotate(state.fish.dir * (age / 1.1 - 0.5) * 1.6);
                        g.scale(state.fish.dir, 1);
                        g.fillStyle = 'rgba(255, 190, 90, 0.95)';
                        g.beginPath();
                        g.ellipse(0, 0, 9, 4, 0, 0, TAU);
                        g.fill();
                        g.beginPath();
                        g.moveTo(-8, 0);
                        g.lineTo(-14, -5);
                        g.lineTo(-14, 5);
                        g.closePath();
                        g.fill();
                        g.fillStyle = INK;
                        g.fillRect(4, -1.5, 1.6, 1.6);
                        g.restore();
                        if (age < 0.12 || age > 1) {
                            for (let i = 0; i < 3; i += 1) drawSprite(g, 'dot:cyan', x + (i - 1) * 6, top + 8 - i * 3, 4, 0.8);
                        }
                    }
                }
            }
        },
        aurora: {
            create(rand) {
                return { flakes: Array.from({ length: 70 }, () => ({ x: rand(), y: rand(), speed: 24 + rand() * 40, size: 1 + rand() * 1.8, phase: rand() * TAU })) };
            },
            back(state, g, bd, camX, time) {
                const bands = [
                    { color: 'rgba(107, 255, 176, 0.32)', y: 0.2, k: 0 },
                    { color: 'rgba(110, 232, 255, 0.26)', y: 0.3, k: 2.1 },
                    { color: 'rgba(255, 122, 213, 0.18)', y: 0.14, k: 4.2 }
                ];
                g.save();
                g.globalCompositeOperation = 'lighter';
                for (const band of bands) {
                    const baseY = bd.groundY * band.y;
                    const gradient = g.createLinearGradient(0, baseY - 40, 0, baseY + 110);
                    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                    gradient.addColorStop(0.35, band.color);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    g.fillStyle = gradient;
                    g.beginPath();
                    const curve = (x) => baseY + Math.sin((x + camX * 0.05) * 0.006 + time * 0.35 + band.k) * 28 + Math.sin(x * 0.013 - time * 0.22 + band.k) * 12;
                    g.moveTo(-40, curve(-40));
                    for (let x = 0; x <= bd.W + 40; x += 40) g.lineTo(x, curve(x));
                    for (let x = bd.W + 40; x >= -40; x -= 40) g.lineTo(x, curve(x) + 100);
                    g.closePath();
                    g.fill();
                }
                g.restore();
            },
            front(state, g, bd, camX, time) {
                const span = bd.W + 40;
                g.fillStyle = 'rgba(255, 255, 255, 0.85)';
                for (const f of state.flakes) {
                    const x = wrap(f.x * span - time * 18 - camX * 0.55 + Math.sin(time + f.phase) * 10, span) - 20;
                    const y = wrap(f.y * bd.H + time * f.speed, bd.H);
                    g.fillRect(x, y, f.size, f.size);
                }
            }
        },
        meteors: {
            create() {
                return { streaks: [], nextAt: 0.4 };
            },
            back(state, g, bd, camX, time, rand) {
                if (time > state.nextAt) {
                    state.nextAt = time + 0.45 + rand() * 0.9;
                    state.streaks.push({ born: time, x: bd.W * (0.2 + rand() * 0.95), y: rand() * bd.groundY * 0.45, len: 60 + rand() * 90, gold: rand() < 0.5 });
                }
                state.streaks = state.streaks.filter((m) => time - m.born < 0.7);
                g.lineCap = 'round';
                for (const m of state.streaks) {
                    const age = time - m.born;
                    const x = m.x - age * 700;
                    const y = m.y + age * 420;
                    const alpha = 1 - age / 0.7;
                    const gradient = g.createLinearGradient(x, y, x + m.len, y - m.len * 0.6);
                    gradient.addColorStop(0, m.gold ? `rgba(255, 220, 120, ${alpha})` : `rgba(255, 140, 90, ${alpha})`);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    g.strokeStyle = gradient;
                    g.lineWidth = 2;
                    g.beginPath();
                    g.moveTo(x, y);
                    g.lineTo(x + m.len, y - m.len * 0.6);
                    g.stroke();
                }
            }
        },
        coaster: {
            create() {
                return {};
            },
            back(state, g, bd, camX, time) {
                const offset = camX * 0.34;
                const trackY = (sx) => {
                    const wx = sx + offset;
                    return bd.groundY - 118 - Math.sin(wx * 0.0085) * 58 - Math.sin(wx * 0.019 + 1) * 22;
                };
                g.strokeStyle = 'rgba(40, 90, 30, 0.8)';
                g.lineWidth = 2;
                const first = -wrap(offset, 60);
                for (let x = first; x < bd.W + 60; x += 60) {
                    g.beginPath();
                    g.moveTo(x, trackY(x));
                    g.lineTo(x, bd.groundY);
                    g.stroke();
                }
                g.lineWidth = 3;
                for (const [shift, color] of [[5, 'rgba(30, 70, 24, 0.95)'], [0, 'rgba(160, 230, 110, 0.8)']]) {
                    g.strokeStyle = color;
                    g.beginPath();
                    for (let x = -20; x <= bd.W + 20; x += 16) {
                        const y = trackY(x) + shift;
                        if (x === -20) g.moveTo(x, y);
                        else g.lineTo(x, y);
                    }
                    g.stroke();
                }
                const lightColors = ['gold', 'pink', 'cyan'];
                const firstLight = -wrap(offset, 30);
                for (let x = firstLight, i = Math.floor(offset / 30); x < bd.W + 30; x += 30, i += 1) {
                    const lit = wrap(i + Math.floor(time * 8), 3);
                    drawSprite(g, `dot:${lightColors[wrap(i, 3)]}`, x, trackY(x) - 3, lit === 0 ? 7 : 4, lit === 0 ? 0.95 : 0.45);
                }
                const cartX = bd.W + 120 - wrap(time * 230, bd.W + 400);
                if (cartX > -60 && cartX < bd.W + 60) {
                    const y = trackY(cartX);
                    const angle = Math.atan2(trackY(cartX + 4) - trackY(cartX - 4), 8);
                    g.save();
                    g.translate(cartX, y - 7);
                    g.rotate(angle);
                    roundRectPath(g, -16, -8, 32, 12, 3);
                    g.fillStyle = '#ff5a5a';
                    g.fill();
                    g.fillStyle = '#ffd76d';
                    g.fillRect(-12, -6, 24, 2);
                    for (const hx of [-8, 0, 8]) {
                        g.fillStyle = hx === 0 ? '#6b3a14' : '#2a1a10';
                        g.beginPath();
                        g.arc(hx, -11, 3.4, 0, TAU);
                        g.fill();
                    }
                    g.restore();
                }
            }
        },
        blackhole: {
            create(rand) {
                return { motes: Array.from({ length: 26 }, () => ({ a: rand() * TAU, r: 0.3 + rand(), speed: 0.3 + rand() * 0.6, color: ['purple', 'cyan', 'pink', 'orange'][Math.floor(rand() * 4)] })) };
            },
            back(state, g, bd, camX, time) {
                const cx = bd.W * 0.7 - wrap(camX * 0.02, bd.W * 1.6) * 0.1;
                const cy = bd.groundY * 0.34;
                const R = Math.min(64, bd.W * 0.08);
                g.save();
                g.translate(cx, cy);
                g.rotate(-0.28);
                g.globalCompositeOperation = 'lighter';
                const rings = [['rgba(255, 150, 60, 0.5)', 2.6, 7], ['rgba(195, 139, 255, 0.45)', 2.2, 5], ['rgba(72, 238, 255, 0.35)', 1.8, 4]];
                rings.forEach(([color, spread, width], i) => {
                    g.strokeStyle = color;
                    g.lineWidth = width;
                    g.setLineDash([22 + i * 6, 12]);
                    g.lineDashOffset = -time * (40 + i * 18);
                    g.beginPath();
                    g.ellipse(0, 0, R * spread, R * spread * 0.24, 0, 0, TAU);
                    g.stroke();
                });
                g.setLineDash([]);
                g.strokeStyle = 'rgba(255, 190, 120, 0.4)';
                g.lineWidth = 5;
                g.beginPath();
                g.ellipse(0, -R * 0.05, R * 1.25, R * 1.05, 0, Math.PI * 1.05, Math.PI * 1.95);
                g.stroke();
                for (const m of state.motes) {
                    const radius = R * (0.9 + wrap(m.r - time * 0.08, 1.4) * 1.5);
                    const angle = m.a + time * m.speed * (2.2 - radius / (R * 2.4));
                    drawSprite(g, `dot:${m.color}`, Math.cos(angle) * radius, Math.sin(angle) * radius * 0.26, 5, 0.8);
                }
                g.globalCompositeOperation = 'source-over';
                g.rotate(0.28);
                const halo = g.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 1.35);
                halo.addColorStop(0, 'rgba(255, 220, 180, 0.9)');
                halo.addColorStop(0.2, 'rgba(195, 139, 255, 0.5)');
                halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
                g.fillStyle = halo;
                g.beginPath();
                g.arc(0, 0, R * 1.35, 0, TAU);
                g.fill();
                g.fillStyle = '#000000';
                g.beginPath();
                g.arc(0, 0, R * 0.86, 0, TAU);
                g.fill();
                g.restore();
            }
        },
        party: {
            create(rand, scale) {
                return {
                    balloons: Array.from({ length: 11 }, (_, i) => ({ x: rand(), speed: 18 + rand() * 20, phase: rand() * TAU, color: i % RAINBOW.length })),
                    confetti: Array.from({ length: 46 }, () => ({ x: rand(), y: rand(), speed: 30 + rand() * 40, spin: 2 + rand() * 4, phase: rand() * TAU, color: RAINBOW[Math.floor(rand() * RAINBOW.length)] })),
                    balloonArt: RAINBOW.map((color) => bakeBalloon(color, scale)),
                    bursts: [],
                    nextBurst: 1
                };
            },
            back(state, g, bd, camX, time, rand) {
                // The "ALVA 10" constellation
                const unit = Math.min(38, bd.W / 22);
                let cursor = bd.W * 0.08 - wrap(camX * 0.02, 60);
                const top = bd.groundY * 0.1;
                g.lineWidth = 1.2;
                g.strokeStyle = 'rgba(255, 230, 150, 0.35)';
                for (const char of ['A', 'L', 'V', 'A', ' ', '1', '0']) {
                    if (char !== ' ') {
                        for (const stroke of LETTERS[char]) {
                            g.beginPath();
                            stroke.forEach(([px, py], i) => {
                                const x = cursor + px * unit * 0.8;
                                const y = top + py * unit * 1.1;
                                if (i === 0) g.moveTo(x, y);
                                else g.lineTo(x, y);
                            });
                            g.stroke();
                            stroke.forEach(([px, py], i) => {
                                drawSprite(g, 'dot:gold', cursor + px * unit * 0.8, top + py * unit * 1.1, 6 + Math.sin(time * 3 + i + cursor) * 2, 0.9);
                            });
                        }
                    }
                    cursor += unit * (char === ' ' ? 0.7 : 1.05);
                }
                // Fireworks
                if (time > state.nextBurst) {
                    state.nextBurst = time + 1.4 + rand() * 1.8;
                    const color = Object.keys(SPARK_COLORS)[1 + Math.floor(rand() * 8)];
                    state.bursts.push({ born: time, x: bd.W * (0.15 + rand() * 0.8), y: bd.groundY * (0.12 + rand() * 0.3), color });
                }
                state.bursts = state.bursts.filter((b) => time - b.born < 1.4);
                for (const b of state.bursts) {
                    const age = time - b.born;
                    const alpha = 1 - age / 1.4;
                    for (let i = 0; i < 18; i += 1) {
                        const angle = (i / 18) * TAU;
                        const dist = easeOutCubic(Math.min(1, age / 0.9)) * 52;
                        drawSprite(g, `dot:${b.color}`, b.x + Math.cos(angle) * dist, b.y + Math.sin(angle) * dist + age * age * 16, 6, alpha);
                    }
                }
                // Balloons
                const span = bd.W + 200;
                state.balloons.forEach((b) => {
                    const x = wrap(b.x * span - camX * 0.28, span) - 100 + Math.sin(time * 1.2 + b.phase) * 8;
                    const y = bd.groundY + 60 - wrap(time * b.speed + b.phase * 50, bd.groundY + 140);
                    g.drawImage(state.balloonArt[b.color], x - 13, y - 16, 26, 52);
                });
            },
            front(state, g, bd, camX, time) {
                const span = bd.W + 40;
                for (const c of state.confetti) {
                    const x = wrap(c.x * span - camX * 0.5 + Math.sin(time * 1.5 + c.phase) * 14, span) - 20;
                    const y = wrap(c.y * bd.H + time * c.speed, bd.H);
                    const flip = Math.cos(time * c.spin + c.phase);
                    g.fillStyle = c.color;
                    g.fillRect(x - 2.5, y - 1.5 * Math.abs(flip), 5, Math.max(0.6, 3 * Math.abs(flip)));
                }
            }
        }
    };

    function createBackdrop(def, view, scale) {
        const theme = def.theme;
        const rand = seededRandom(def.key);
        const W = view.w;
        const H = view.h;
        const groundY = view.groundY;
        const sky = makeCanvas(W * scale, H * scale);
        const g = sky.getContext('2d');
        g.scale(scale, scale);
        const gradient = g.createLinearGradient(0, 0, 0, groundY);
        gradient.addColorStop(0, theme.sky[0]);
        gradient.addColorStop(0.55, theme.sky[1]);
        gradient.addColorStop(1, theme.sky[2]);
        g.fillStyle = gradient;
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i += 1) {
            const color = theme.nebula[i % theme.nebula.length];
            const cx = rand() * W;
            const cy = rand() * groundY * 0.85;
            const r = 110 + rand() * 230;
            g.save();
            g.translate(cx, cy);
            g.scale(1.7, 0.65);
            const nebula = g.createRadialGradient(0, 0, 0, 0, 0, r);
            nebula.addColorStop(0, color);
            nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
            g.fillStyle = nebula;
            g.fillRect(-r, -r, r * 2, r * 2);
            g.restore();
        }
        const horizon = g.createLinearGradient(0, groundY - 160, 0, groundY);
        horizon.addColorStop(0, 'rgba(0, 0, 0, 0)');
        horizon.addColorStop(1, theme.horizon);
        g.fillStyle = horizon;
        g.fillRect(0, groundY - 160, W, 160);
        g.globalCompositeOperation = 'source-over';

        const starSpan = W + 200;
        const stars = [];
        for (let layer = 0; layer < 2; layer += 1) {
            for (let i = 0; i < (layer ? 40 : 80); i += 1) {
                stars.push({
                    x: rand() * starSpan, y: rand() * (groundY - 30),
                    size: layer ? 1.4 + rand() * 1.4 : 0.7 + rand() * 0.9,
                    parallax: layer ? 0.12 : 0.04,
                    phase: rand() * TAU, speed: 0.6 + rand() * 2.4,
                    big: layer === 1 && rand() < 0.3
                });
            }
        }
        const planets = theme.planets.map((p) => ({ ...p, art: bakePlanet(p, scale), screenX: 0 }));
        const featureDef = FEATURES[theme.feature];
        const feature = featureDef ? featureDef.create(rand, scale) : null;
        return { def, theme, W, H, groundY, scale, sky, stars, starSpan, planets, featureDef, feature, rand };
    }

    function drawBackdropBack(g, bd, camX, time, alpha = 1) {
        g.save();
        g.globalAlpha = alpha;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(bd.sky, 0, 0);
        g.restore();
        g.save();
        g.globalAlpha = alpha;
        g.fillStyle = bd.theme.star;
        for (const s of bd.stars) {
            const x = wrap(s.x - camX * s.parallax, bd.starSpan) - 100;
            if (x < -4 || x > bd.W + 4) continue;
            const twinkle = 0.45 + Math.sin(time * s.speed + s.phase) * 0.4;
            if (s.big) {
                drawSprite(g, 'spark:white', x, s.y, 7 + twinkle * 4, alpha * (0.4 + twinkle * 0.6));
            } else {
                g.globalAlpha = alpha * clamp(twinkle + 0.2, 0.1, 1);
                g.fillRect(x, s.y, s.size, s.size);
            }
        }
        g.globalAlpha = alpha;
        for (const p of bd.planets) {
            const span = bd.W * 2.4;
            const x = wrap(p.x * bd.W - camX * p.parallax + p.r * 2, span) - p.r * 2;
            p.screenX = x;
            const y = p.y * bd.groundY;
            g.drawImage(p.art.canvas, x - p.art.size / 2, y - p.art.size / 2, p.art.size, p.art.size);
        }
        if (bd.featureDef && bd.featureDef.back) bd.featureDef.back(bd.feature, g, bd, camX, time, bd.rand);
        g.restore();
    }

    function drawBackdropFront(g, bd, camX, time, alpha = 1) {
        if (!bd.featureDef || !bd.featureDef.front) return;
        g.save();
        g.globalAlpha = alpha;
        bd.featureDef.front(bd.feature, g, bd, camX, time);
        g.restore();
    }

    // =====================================================================
    // 8. RENDERER & EFFECTS
    // Screen units: x grows right, y grows down, 1 unit = 1 world unit.
    // world (x, y) → screen (x - camX, groundY - y)
    // =====================================================================
    function computeView(cssW, cssH) {
        const t = clamp((cssH - VIEW.shortScreenPx) / (VIEW.tallScreenPx - VIEW.shortScreenPx), 0, 1);
        let viewH = lerp(VIEW.shortHeight, VIEW.tallHeight, t);
        let unitPx = cssH / viewH;
        let viewW = cssW / unitPx;
        if (viewW < VIEW.minWidth) {
            unitPx = cssW / VIEW.minWidth;
            viewW = VIEW.minWidth;
            viewH = cssH / unitPx;
        }
        // Tall (portrait) screens get more ground, not an endless sky
        const groundY = Math.min(viewH - VIEW.groundDepth, 560);
        const ax = clamp(viewW * VIEW.alvaScreenRatio, VIEW.alvaScreenMin, VIEW.alvaScreenMax);
        return { w: viewW, h: viewH, groundY, ax, unitPx };
    }

    function drawSprite(g, key, x, y, size, alpha = 1, rotation = 0) {
        const sprite = art.get(key);
        if (!sprite || alpha <= 0.01 || size <= 0) return;
        const scaleFactor = size / sprite.cw;
        const prevAlpha = g.globalAlpha;
        g.globalAlpha = prevAlpha * alpha;
        if (rotation) {
            g.save();
            g.translate(x, y);
            g.rotate(rotation);
            g.drawImage(sprite.canvas, -sprite.ox * scaleFactor, -sprite.oy * scaleFactor, sprite.w * scaleFactor, sprite.h * scaleFactor);
            g.restore();
        } else {
            g.drawImage(sprite.canvas, x - sprite.ox * scaleFactor, y - sprite.oy * scaleFactor, sprite.w * scaleFactor, sprite.h * scaleFactor);
        }
        g.globalAlpha = prevAlpha;
    }

    function drawLuma(g, frame, cx, cy, scale, alpha = 1, rotation = 0) {
        const image = art.images.luma;
        if (!image) return;
        const sheet = SHEETS.luma;
        const u = sheet.unit * scale;
        g.save();
        g.globalAlpha *= alpha;
        g.translate(cx, cy);
        if (rotation) g.rotate(rotation);
        const glow = art.glows.get(`luma:${frame}`);
        if (glow) {
            g.imageSmoothingEnabled = true;
            g.drawImage(glow, (-sheet.anchorX - 14) * u, (-sheet.anchorY - 14) * u, (sheet.frameW + 28) * u, (sheet.frameH + 28) * u);
        }
        g.imageSmoothingEnabled = false;
        g.drawImage(image, frame * sheet.frameW, 0, sheet.frameW, sheet.frameH, -sheet.anchorX * u, -sheet.anchorY * u, sheet.frameW * u, sheet.frameH * u);
        g.restore();
    }

    function drawAlvaSprite(g, frame, sx, sy, options = {}) {
        const image = art.images.alva;
        if (!image) return;
        const { scaleX = 1, scaleY = 1, rotation = 0, pivotY = 0, glow = 'gold', alpha = 1, white = 0 } = options;
        const sheet = SHEETS.alva;
        const rect = sheet.rects[frame];
        const u = sheet.unit;
        const w = rect.sw * u;
        const h = sheet.frameH * u;
        const left = (rect.ox - sheet.anchorX) * u;
        const top = -sheet.anchorY * u;
        g.save();
        g.globalAlpha *= alpha;
        g.translate(sx, sy - pivotY);
        if (rotation) g.rotate(rotation);
        g.translate(0, pivotY);
        g.scale(scaleX, scaleY);
        const glowCanvas = glow ? art.glows.get(`alva:${frame}:${glow}`) : null;
        if (glowCanvas) {
            const pad = 16 * u;
            g.imageSmoothingEnabled = true;
            g.drawImage(glowCanvas, left - pad, top - pad, w + pad * 2, h + pad * 2);
        }
        g.imageSmoothingEnabled = false;
        g.drawImage(image, rect.sx, 0, rect.sw, sheet.frameH, left, top, w, h);
        if (white > 0) {
            const whiteCanvas = art.glows.get(`alva:${frame}:white`);
            if (whiteCanvas) {
                g.globalAlpha *= white;
                g.drawImage(whiteCanvas, left, top, w, h);
            }
        }
        g.restore();
    }

    function drawGoombaSprite(g, row, frame, sx, sy, options = {}) {
        const image = art.images.goomba;
        if (!image) return;
        const { scaleX = 1, scaleY = 1, rotation = 0, alpha = 1, glowAlpha = 1 } = options;
        const sheet = SHEETS.goomba;
        const u = sheet.unit;
        g.save();
        g.globalAlpha *= alpha;
        g.translate(sx, sy);
        if (rotation) g.rotate(rotation);
        g.scale(scaleX, scaleY);
        const glow = art.glows.get(`goomba:${row}`);
        if (glow && glowAlpha > 0) {
            g.imageSmoothingEnabled = true;
            const prev = g.globalAlpha;
            g.globalAlpha = prev * glowAlpha;
            g.drawImage(glow, (-sheet.anchorX - 16) * u, (-sheet.anchorY - 16) * u, (sheet.frameW + 32) * u, (sheet.frameH + 32) * u);
            g.globalAlpha = prev;
        }
        g.imageSmoothingEnabled = false;
        g.drawImage(image, frame * sheet.frameW, row * sheet.frameH, sheet.frameW, sheet.frameH, -sheet.anchorX * u, -sheet.anchorY * u, sheet.frameW * u, sheet.frameH * u);
        g.restore();
    }

    // --- Particles, shake, flashes ---------------------------------------
    const fx = {
        particles: [],
        shakeT: 0,
        shakeDur: 1,
        shakeMag: 0,
        flashT: 0,
        flashDur: 1,
        flashColor: '#ffffff',
        flashAlpha: 0,
        vignetteT: 0,
        reduced: false,

        reset() {
            this.particles.length = 0;
            this.shakeT = 0;
            this.flashT = 0;
            this.vignetteT = 0;
        },

        spawn(options) {
            if (this.particles.length > 460) return null;
            const p = {
                kind: 'dot', color: 'white', x: 0, y: 0, vx: 0, vy: 0, gravity: 0, drag: 0,
                life: 0.6, t: 0, size: 6, sizeEnd: null, alpha: 1, rot: 0, vrot: 0, screen: false, text: '', fade: 1,
                ...options
            };
            if (p.sizeEnd === null) p.sizeEnd = p.size;
            this.particles.push(p);
            return p;
        },

        burst(x, y, count, options = {}) {
            const { speed = 220, spread = TAU, angle = 0, colors = ['white'], kind = 'dot', life = 0.55, size = 7, sizeEnd = 0, gravity = 0, drag = 2, screen = false } = options;
            for (let i = 0; i < count; i += 1) {
                const a = angle + (spread >= TAU ? (i / count) * TAU + Math.random() * 0.3 : (Math.random() - 0.5) * spread);
                const v = speed * (0.55 + Math.random() * 0.6);
                this.spawn({
                    kind, color: colors[i % colors.length], x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                    life: life * (0.7 + Math.random() * 0.5), size, sizeEnd, gravity, drag, screen,
                    rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 12
                });
            }
        },

        pop(x, y, text, color = '#FBD000', size = 11) {
            this.spawn({ kind: 'text', text, color, x, y, vy: 70, drag: 1.5, life: 0.9, size, sizeEnd: size });
        },

        shake(magnitude, duration) {
            if (this.reduced) return;
            const current = this.shakeT > 0 ? this.shakeMag * (this.shakeT / this.shakeDur) : 0;
            if (magnitude < current) return;
            this.shakeMag = magnitude;
            this.shakeDur = duration;
            this.shakeT = duration;
        },

        flash(color, alpha, duration) {
            this.flashColor = color;
            this.flashAlpha = this.reduced ? alpha * 0.35 : alpha;
            this.flashDur = duration;
            this.flashT = duration;
        },

        update(dt) {
            this.shakeT = Math.max(0, this.shakeT - dt);
            this.flashT = Math.max(0, this.flashT - dt);
            this.vignetteT = Math.max(0, this.vignetteT - dt);
            const list = this.particles;
            for (let i = list.length - 1; i >= 0; i -= 1) {
                const p = list[i];
                p.t += dt;
                if (p.t >= p.life) {
                    list[i] = list[list.length - 1];
                    list.pop();
                    continue;
                }
                const damping = Math.max(0, 1 - p.drag * dt);
                p.vx *= damping;
                p.vy = p.vy * damping - p.gravity * dt;
                p.x += p.vx * dt;
                p.y += (p.screen ? -p.vy : p.vy) * dt;
                p.rot += p.vrot * dt;
            }
        },

        shakeOffset(time) {
            if (this.shakeT <= 0) return { x: 0, y: 0 };
            const k = this.shakeT / this.shakeDur;
            const m = this.shakeMag * k * k;
            return { x: Math.sin(time * 97) * m, y: Math.cos(time * 83) * m * 0.7 };
        },

        draw(g, camX, view) {
            for (const p of this.particles) {
                const life = p.t / p.life;
                const alpha = p.alpha * Math.pow(1 - life, p.fade);
                const size = lerp(p.size, p.sizeEnd, life);
                const x = p.screen ? p.x : p.x - camX;
                const y = p.screen ? p.y : view.groundY - p.y;
                switch (p.kind) {
                    case 'dot': drawSprite(g, `dot:${p.color}`, x, y, size, alpha); break;
                    case 'spark': drawSprite(g, `spark:${p.color}`, x, y, size, alpha, p.rot); break;
                    case 'dust': drawSprite(g, 'dust', x, y, size, alpha * 0.8); break;
                    case 'heart': drawSprite(g, 'heart', x, y, size, alpha); break;
                    case 'wing': drawSprite(g, 'wing', x, y, size, alpha, p.rot); break;
                    case 'bit': drawSprite(g, `bit${p.color}`, x, y, size, alpha, p.rot); break;
                    case 'ring':
                        g.save();
                        g.globalAlpha = alpha;
                        g.strokeStyle = p.color;
                        g.lineWidth = 2.2;
                        g.beginPath();
                        g.ellipse(x, y, size, size * (p.flat || 1), 0, 0, TAU);
                        g.stroke();
                        g.restore();
                        break;
                    case 'confetti':
                    case 'shard':
                        g.save();
                        g.globalAlpha = alpha;
                        g.translate(x, y);
                        g.rotate(p.rot);
                        g.fillStyle = p.color;
                        g.fillRect(-size / 2, -size / 4, size, size / 2);
                        g.restore();
                        break;
                    case 'ghost': {
                        const canvas = art.glows.get(p.key);
                        if (canvas) {
                            const sheet = SHEETS.alva;
                            const rect = sheet.rects[p.frame];
                            g.save();
                            g.globalAlpha = alpha;
                            g.imageSmoothingEnabled = false;
                            g.drawImage(canvas, x + (rect.ox - sheet.anchorX) * sheet.unit, y - sheet.anchorY * sheet.unit, rect.sw * sheet.unit, sheet.frameH * sheet.unit);
                            g.restore();
                        }
                        break;
                    }
                    case 'text':
                        g.save();
                        g.globalAlpha = alpha;
                        g.font = `${size}px 'Press Start 2P', monospace`;
                        g.textAlign = 'center';
                        g.textBaseline = 'middle';
                        g.lineWidth = 4;
                        g.lineJoin = 'round';
                        g.strokeStyle = INK;
                        g.strokeText(p.text, x, y);
                        g.fillStyle = p.color;
                        g.fillText(p.text, x, y);
                        g.restore();
                        break;
                    default: break;
                }
            }
        }
    };

    // --- Alva's and the Lumas' presentation state ----------------------
    const CREW = [
        { frame: 0, dx: -54, dy: 66, scale: 0.86, phase: 0.2 },
        { frame: 1, dx: -94, dy: 100, scale: 0.78, phase: 1.3 },
        { frame: 2, dx: -30, dy: 122, scale: 0.72, phase: 2.2 },
        { frame: 3, dx: -128, dy: 56, scale: 0.68, phase: 3.1 }
    ];

    function createLook() {
        return {
            runPhase: 0,
            squash: 0,
            squashV: 0,
            ghostT: 0,
            flashT: 0,
            crew: CREW.map((c) => ({ ...c, x: 0, y: 0, vx: 0, vy: 0, flipT: 0, placed: false }))
        };
    }

    function alvaFrame(a, look) {
        switch (a.mode) {
            case 'drop': return 2;
            case 'launch': return 3;
            case 'dying': return 0;
            case 'rescue': return 2;
            case 'celebrate': return a.y > 4 ? 3 : 0;
            default: break;
        }
        if (!a.grounded) {
            if (a.spinT > 0) return 3;
            if (a.vy > 260) return 1;
            if (a.vy > -260) return 3;
            return 2;
        }
        return Math.floor(look.runPhase * 4) % 4;
    }

    // Where the Alva sprite is drawn this frame (launch and rescue add their own motion).
    function alvaScreenPos(run) {
        const a = run.alva;
        const view = run.view;
        let x = view.ax;
        let y = view.groundY - a.y;
        let rotation = 0;
        if (a.mode === 'launch') {
            const t = clamp((run.phaseT - 0.2) / 1.1, 0, 1);
            x += Math.pow(t, 2.2) * (view.w - view.ax + 160);
            rotation = -0.5 * Math.min(1, t * 3) + t * TAU * 1.5;
        }
        return { x, y, rotation };
    }

    const renderer = {
        canvas: null,
        ctx: null,
        dpr: 1,
        scale: 1,
        view: { w: 800, h: 420, groundY: 348, ax: 176, unitPx: 1 },
        backdrop: null,
        prevBackdrop: null,
        fade: 1,
        look: createLook(),
        groundGradient: null,
        groundKey: '',

        init(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', { alpha: false });
        },

        resize() {
            const rect = this.canvas.getBoundingClientRect();
            const cssW = Math.max(1, rect.width || window.innerWidth);
            const cssH = Math.max(1, rect.height || window.innerHeight);
            const deviceRatio = window.devicePixelRatio || 1;
            const dpr = Math.max(0.75, Math.min(deviceRatio, 3, Math.sqrt(VIEW.maxBackingPixels / (cssW * cssH))));
            this.canvas.width = Math.round(cssW * dpr);
            this.canvas.height = Math.round(cssH * dpr);
            this.dpr = dpr;
            this.view = computeView(cssW, cssH);
            this.scale = this.view.unitPx * dpr;
            art.rebake(this.scale);
            if (this.backdrop) this.backdrop = createBackdrop(this.backdrop.def, this.view, this.scale);
            this.prevBackdrop = null;
            this.fade = 1;
            this.groundKey = '';
            return this.view;
        },

        setGalaxy(def, crossfade) {
            if (this.backdrop && this.backdrop.def.key === def.key) return;
            this.prevBackdrop = crossfade ? this.backdrop : null;
            this.backdrop = createBackdrop(def, this.view, this.scale);
            this.fade = crossfade ? 0 : 1;
            this.groundKey = '';
        },

        resetLook() {
            this.look = createLook();
        },

        // --- Per-frame presentation state ---
        updateLook(run, dt, time) {
            const look = this.look;
            const a = run.alva;
            const cycles = a.grounded ? (run.speed / 300) * 2.2 : 0;
            look.runPhase = (look.runPhase + dt * Math.max(cycles, a.grounded ? 1.2 : 0)) % 1;
            // A damped spring gives the squash & stretch its bounce
            look.squashV += (-look.squash * 260 - look.squashV * 16) * dt;
            look.squash += look.squashV * dt;
            look.flashT = Math.max(0, look.flashT - dt);
            if (this.prevBackdrop) {
                this.fade = Math.min(1, this.fade + dt / 1.1);
                if (this.fade >= 1) this.prevBackdrop = null;
            }

            const pos = alvaScreenPos(run);
            const centerX = pos.x;
            const centerY = pos.y - 28;
            look.crew.forEach((c, i) => {
                let tx;
                let ty;
                if (a.mode === 'rescue' && i === 0) {
                    const t = a.rescueT;
                    if (t < 0.45) {
                        const k = easeInOutSine(t / 0.45);
                        tx = lerp(c.x, pos.x, k);
                        ty = lerp(c.y, run.view.groundY + 40, k);
                    } else {
                        tx = pos.x;
                        ty = pos.y - 58;
                    }
                    c.x += (tx - c.x) * Math.min(1, dt * 18);
                    c.y += (ty - c.y) * Math.min(1, dt * 18);
                    c.flipT = Math.max(0, c.flipT - dt);
                    return;
                }
                if (a.magnetT > 0 || run.phase === 'finale') {
                    const radius = run.phase === 'finale' ? 74 : 60;
                    const angle = time * (run.phase === 'finale' ? 2.4 : 3.2) + i * (TAU / 4);
                    tx = centerX + Math.cos(angle) * radius;
                    ty = centerY + Math.sin(angle) * radius * 0.55 - (run.phase === 'finale' ? 30 : 6);
                } else {
                    tx = centerX + c.dx + Math.sin(time * (2 + i * 0.3) + c.phase) * 7;
                    ty = centerY - c.dy + Math.sin(time * (2.6 + i * 0.2) + c.phase) * 8;
                }
                if (!c.placed) {
                    c.x = tx;
                    c.y = ty;
                    c.placed = true;
                }
                const stiffness = a.mode === 'launch' ? 5 : 7;
                c.vx += ((tx - c.x) * stiffness * stiffness - c.vx * 2 * stiffness) * dt;
                c.vy += ((ty - c.y) * stiffness * stiffness - c.vy * 2 * stiffness) * dt;
                c.x += c.vx * dt;
                c.y += c.vy * dt;
                c.flipT = Math.max(0, c.flipT - dt);
            });

            // Rainbow afterimages
            if (a.rainbowT > 0 && run.phase === 'play') {
                look.ghostT -= dt;
                if (look.ghostT <= 0) {
                    look.ghostT = 0.045;
                    const frame = alvaFrame(a, look);
                    const hue = Math.floor(time * 12) % RAINBOW.length;
                    fx.spawn({ kind: 'ghost', key: `alva:${frame}:ghost${hue}`, frame, x: run.camX + pos.x, y: run.view.groundY - pos.y, vx: 0, life: 0.28, alpha: 0.5 });
                }
            }
        },

        // --- Drawing ---
        draw(run, time) {
            const g = this.ctx;
            const view = this.view;
            const s = this.scale;
            const bd = this.backdrop;
            if (!g || !bd) return;
            const camX = run.camX;

            g.setTransform(s, 0, 0, s, 0, 0);
            g.imageSmoothingEnabled = true;
            if (this.prevBackdrop) {
                drawBackdropBack(g, this.prevBackdrop, camX, time, 1);
                drawBackdropBack(g, bd, camX, time, this.fade);
            } else {
                drawBackdropBack(g, bd, camX, time, 1);
            }

            const shake = fx.shakeOffset(time);
            g.setTransform(s, 0, 0, s, shake.x * s, shake.y * s);
            const theme = bd.theme;
            const a = run.alva;
            const alvaInPit = a.y < -2 && a.mode !== 'launch';

            this.drawGapFills(g, run, theme, time);
            if (alvaInPit) this.drawAlva(g, run, time);
            this.drawGround(g, run, theme, time);
            this.drawEntities(g, run, theme, time);
            this.drawCrew(g, run, time);
            if (!alvaInPit) this.drawAlva(g, run, time);
            if (a.mode === 'rescue') this.drawCrewMember(g, this.look.crew[0], run, time);
            fx.draw(g, camX, view);

            if (this.prevBackdrop) drawBackdropFront(g, this.prevBackdrop, camX, time, 1 - this.fade);
            drawBackdropFront(g, bd, camX, time, this.prevBackdrop ? this.fade : 1);
            this.drawOverlays(g, run, time);
        },

        groundSegments(run, from, to) {
            const segments = [];
            let x = from;
            for (const gap of run.gaps) {
                if (gap.x1 <= x) continue;
                if (gap.x0 >= to) break;
                if (gap.x0 > x) segments.push({ x0: x, x1: gap.x0, gapLeft: x > from, gapRight: true });
                x = gap.x1;
            }
            if (x < to) segments.push({ x0: x, x1: to, gapLeft: x > from, gapRight: false });
            return segments;
        },

        drawGapFills(g, run, theme, time) {
            const view = this.view;
            const camX = run.camX;
            for (const gap of run.gaps) {
                if (gap.x1 < camX - 20 || gap.x0 > camX + view.w + 20) continue;
                const x0 = gap.x0 - camX;
                const x1 = gap.x1 - camX;
                const w = x1 - x0;
                const top = view.groundY;
                const depth = view.h - top;
                g.save();
                g.beginPath();
                g.rect(x0, top - 2, w, depth + 4);
                g.clip();
                if (gap.style === 'water') {
                    const water = g.createLinearGradient(0, top, 0, view.h);
                    water.addColorStop(0, '#2aa6e8');
                    water.addColorStop(1, '#062a52');
                    g.fillStyle = water;
                    g.fillRect(x0, top + 12, w, depth);
                    g.fillStyle = 'rgba(210, 245, 255, 0.85)';
                    g.beginPath();
                    g.moveTo(x0, top + 14);
                    for (let x = x0; x <= x1 + 6; x += 6) g.lineTo(x, top + 12 + Math.sin(x * 0.12 + time * 4) * 2.2);
                    g.lineTo(x1 + 6, top + 18);
                    g.lineTo(x0, top + 18);
                    g.closePath();
                    g.fill();
                    for (let i = 0; i < 4; i += 1) {
                        const sx = x0 + wrap(i * 37 + time * 22, Math.max(w, 1));
                        drawSprite(g, 'spark:white', sx, top + 22 + (i % 2) * 14, 6, 0.4 + Math.sin(time * 5 + i) * 0.3);
                    }
                } else if (gap.style === 'ice') {
                    const ice = g.createLinearGradient(0, top, 0, view.h);
                    ice.addColorStop(0, '#0d2b4a');
                    ice.addColorStop(1, '#01060f');
                    g.fillStyle = ice;
                    g.fillRect(x0, top, w, depth);
                    g.fillStyle = 'rgba(200, 240, 255, 0.85)';
                    for (const [edge, dir] of [[x0, 1], [x1, -1]]) {
                        for (let i = 0; i < 3; i += 1) {
                            g.beginPath();
                            g.moveTo(edge + dir * (2 + i * 7), top + 2);
                            g.lineTo(edge + dir * (6 + i * 7), top + 2);
                            g.lineTo(edge + dir * (4 + i * 7), top + 14 + (i % 2) * 8);
                            g.closePath();
                            g.fill();
                        }
                    }
                } else {
                    const cx = (x0 + x1) / 2;
                    const hole = g.createRadialGradient(cx, top + depth * 0.9, 4, cx, top + depth * 0.5, Math.max(w, depth) * 0.9);
                    hole.addColorStop(0, '#000000');
                    hole.addColorStop(0.55, '#07020f');
                    hole.addColorStop(1, theme.sky[1]);
                    g.fillStyle = hole;
                    g.fillRect(x0, top, w, depth);
                    g.strokeStyle = theme.ground.glow;
                    g.lineWidth = 2;
                    for (let i = 0; i < 3; i += 1) {
                        g.beginPath();
                        g.ellipse(cx, top + depth * 0.95, w * (0.2 + i * 0.16), 10 + i * 7, 0, time * (1.5 + i * 0.5) + i, time * (1.5 + i * 0.5) + i + Math.PI * 1.2);
                        g.stroke();
                    }
                    for (let i = 0; i < 5; i += 1) {
                        const t = wrap(time * 0.6 + i / 5, 1);
                        drawSprite(g, 'dot:purple', cx + Math.cos(i * 2 + time) * w * 0.4 * (1 - t), top + t * depth * 0.9, 5, 1 - t);
                    }
                }
                g.restore();
            }
        },

        drawGround(g, run, theme, time) {
            const view = this.view;
            const camX = run.camX;
            const ground = theme.ground;
            const top = view.groundY;
            const bottom = view.h;
            const key = `${theme.sky[0]}:${top}:${bottom}`;
            if (this.groundKey !== key) {
                this.groundKey = key;
                const body = g.createLinearGradient(0, top, 0, Math.min(bottom, top + 180));
                body.addColorStop(0, ground.body[0]);
                body.addColorStop(1, ground.body[1]);
                this.groundGradient = body;
                const glow = g.createLinearGradient(0, top - 18, 0, top);
                glow.addColorStop(0, 'rgba(0, 0, 0, 0)');
                glow.addColorStop(1, ground.glow);
                this.glowGradient = glow;
            }
            const segments = this.groundSegments(run, camX - 40, camX + view.w + 40);
            for (const seg of segments) {
                const x0 = seg.x0 - camX;
                const x1 = seg.x1 - camX;
                const w = x1 - x0;
                g.fillStyle = this.glowGradient;
                g.fillRect(x0, top - 18, w, 18);
                g.fillStyle = this.groundGradient;
                roundRectPath(g, x0, top, w, bottom - top + 20, seg.gapLeft || seg.gapRight ? 7 : 0);
                g.fill();
                // Stripes like the original Space Jump floor
                g.fillStyle = ground.stripe;
                const first = Math.ceil(seg.x0 / 42) * 42;
                for (let x = first; x < seg.x1; x += 42) g.fillRect(x - camX, top + 7, 2, bottom - top);
                this.drawDeco(g, seg, camX, top, theme, time);
                g.fillStyle = ground.top;
                roundRectPath(g, x0, top - 1, w, 6, 3);
                g.fill();
                g.fillStyle = ground.edge;
                g.fillRect(x0 + 3, top - 1, Math.max(0, w - 6), 1.4);
                if (seg.gapLeft || seg.gapRight) {
                    g.fillStyle = ground.glow;
                    if (seg.gapLeft) g.fillRect(x0, top, 2, bottom - top);
                    if (seg.gapRight) g.fillRect(x1 - 2, top, 2, bottom - top);
                }
            }
        },

        drawDeco(g, seg, camX, top, theme, time) {
            const ground = theme.ground;
            const colors = ground.decoColors;
            const cell = 64;
            const first = Math.ceil((seg.x0 + 10) / cell);
            for (let c = first; c * cell < seg.x1 - 10; c += 1) {
                const n = hashNoise(c * 13.7 + theme.sky[0].length);
                const x = c * cell - camX + n * 20;
                const color = colors[c % colors.length];
                switch (ground.deco) {
                    case 'crystals':
                        if (n < 0.45) break;
                        g.fillStyle = color;
                        g.globalAlpha = 0.85;
                        g.beginPath();
                        g.moveTo(x, top - 9 - n * 6);
                        g.lineTo(x + 3.5, top);
                        g.lineTo(x - 3.5, top);
                        g.closePath();
                        g.fill();
                        g.globalAlpha = 1;
                        drawSprite(g, 'dot:white', x, top - 7, 5, 0.4 + Math.sin(time * 3 + c) * 0.3);
                        break;
                    case 'flowers':
                        g.strokeStyle = 'rgba(125, 255, 214, 0.6)';
                        g.lineWidth = 1;
                        g.beginPath();
                        g.moveTo(x, top);
                        g.lineTo(x + Math.sin(time * 2 + c) * 1.5, top - 8);
                        g.stroke();
                        drawSprite(g, 'dot:white', x + Math.sin(time * 2 + c) * 1.5, top - 9, 5, 0.9);
                        g.fillStyle = color;
                        g.beginPath();
                        g.arc(x + Math.sin(time * 2 + c) * 1.5, top - 9, 1.8, 0, TAU);
                        g.fill();
                        break;
                    case 'grass':
                    case 'reeds': {
                        const tall = ground.deco === 'reeds' ? 16 : 7;
                        g.strokeStyle = color;
                        g.lineWidth = 1.2;
                        g.beginPath();
                        for (let i = -1; i <= 1; i += 1) {
                            g.moveTo(x + i * 3, top);
                            g.lineTo(x + i * 4 + Math.sin(time * 1.6 + c + i) * 1.2, top - tall - (i === 0 ? 3 : 0));
                        }
                        g.stroke();
                        if (ground.deco === 'reeds') {
                            g.fillStyle = '#8a5a2a';
                            g.fillRect(x - 1.2, top - tall - 7, 2.4, 6);
                        }
                        break;
                    }
                    case 'rink':
                        if (c % 9 === 0) {
                            g.fillStyle = 'rgba(229, 37, 33, 0.55)';
                            g.fillRect(x, top + 1, 5, 40);
                        } else if (c % 9 === 4) {
                            g.fillStyle = 'rgba(42, 92, 255, 0.5)';
                            g.fillRect(x, top + 1, 4, 40);
                            g.strokeStyle = 'rgba(229, 37, 33, 0.4)';
                            g.lineWidth = 1.2;
                            g.beginPath();
                            g.ellipse(x + 40, top + 22, 16, 7, 0, 0, TAU);
                            g.stroke();
                        }
                        break;
                    case 'lava':
                        if (n < 0.5) break;
                        g.strokeStyle = colors[c % 2];
                        g.lineWidth = 1.4;
                        g.globalAlpha = 0.55 + Math.sin(time * 2.4 + c) * 0.3;
                        g.beginPath();
                        g.moveTo(x - 10, top + 10);
                        g.lineTo(x - 3, top + 16);
                        g.lineTo(x + 4, top + 12);
                        g.lineTo(x + 12, top + 20);
                        g.stroke();
                        g.globalAlpha = 1;
                        break;
                    case 'lights':
                        for (let i = 0; i < 2; i += 1) {
                            const lx = c * cell - camX + i * 32;
                            if (lx < seg.x0 - camX || lx > seg.x1 - camX) continue;
                            const lit = wrap(c * 2 + i + Math.floor(time * 5), 3) === 0;
                            drawSprite(g, `dot:${['gold', 'pink', 'cyan'][wrap(c * 2 + i, 3)]}`, lx, top + 8, lit ? 9 : 5, lit ? 1 : 0.5);
                        }
                        break;
                    case 'frosting':
                        g.fillStyle = '#fff6e0';
                        g.beginPath();
                        g.ellipse(x, top + 4, 8, 6 + n * 5, 0, 0, Math.PI);
                        g.fill();
                        for (let i = 0; i < 3; i += 1) {
                            g.fillStyle = colors[(c + i) % colors.length];
                            g.save();
                            g.translate(x + (i - 1) * 16 + n * 6, top + 22 + ((c + i) % 3) * 9);
                            g.rotate(n * 3 + i);
                            g.fillRect(-3, -1, 6, 2);
                            g.restore();
                        }
                        break;
                    default: break;
                }
            }
        },

        drawPlatform(g, e, camX, theme, time) {
            const view = this.view;
            const x0 = e.x - e.w / 2 - camX;
            const x1 = x0 + e.w;
            if (x1 < -20 || x0 > view.w + 20) return;
            const top = view.groundY - e.top;
            const mid = (x0 + x1) / 2;
            const ground = theme.ground;
            g.save();
            const glow = g.createLinearGradient(0, top - 14, 0, top);
            glow.addColorStop(0, 'rgba(0, 0, 0, 0)');
            glow.addColorStop(1, ground.glow);
            g.fillStyle = glow;
            g.fillRect(x0 + 2, top - 14, e.w - 4, 14);
            g.beginPath();
            g.moveTo(x0 + 3, top);
            g.lineTo(x1 - 3, top);
            g.quadraticCurveTo(x1 + 3, top + 3, x1 - 5, top + 13);
            g.quadraticCurveTo(mid + e.w * 0.22, top + 24, mid, top + 34);
            g.quadraticCurveTo(mid - e.w * 0.22, top + 24, x0 + 5, top + 13);
            g.quadraticCurveTo(x0 - 3, top + 3, x0 + 3, top);
            g.closePath();
            const body = g.createLinearGradient(0, top, 0, top + 34);
            body.addColorStop(0, ground.body[0]);
            body.addColorStop(1, ground.body[1]);
            g.fillStyle = body;
            g.fill();
            g.lineWidth = 2;
            g.strokeStyle = INK;
            g.stroke();
            g.fillStyle = ground.top;
            roundRectPath(g, x0, top - 2, e.w, 7, 3.5);
            g.fill();
            g.fillStyle = ground.edge;
            g.fillRect(x0 + 4, top - 1.5, e.w - 8, 1.3);
            if (e.move) {
                for (let i = 0; i < 3; i += 1) {
                    drawSprite(g, 'dot:gold', mid + (i - 1) * 12, top + 30 + Math.sin(time * 20 + i) * 2, 7, 0.7);
                }
            }
            g.restore();
        },

        drawEntities(g, run, theme, time) {
            const view = this.view;
            const camX = run.camX;
            const a = run.alva;
            const left = camX - 120;
            const right = camX + view.w + 120;

            for (const e of run.entities) {
                if (e.type === 'platform' && e.alive) this.drawPlatform(g, e, camX, theme, time);
            }

            for (const e of run.entities) {
                if (e.x < left || e.x > right) {
                    if (!((e.type === 'puck' || e.type === 'bullet') && e.warned && !e.spawned && e.alive)) continue;
                }
                const sx = e.x - camX;
                const sy = view.groundY - e.y;
                switch (e.type) {
                    case 'bit':
                        if (!e.alive) break;
                        drawSprite(g, `bit${e.color}`, sx, sy - 11, 22 + Math.sin(time * 4 + e.id) * 1.5, 1, Math.sin(time * 2.2 + e.id) * 0.35);
                        break;
                    case 'block': {
                        const bump = e.bumpT > 0 ? Math.sin((1 - e.bumpT / 0.25) * Math.PI) * 9 : 0;
                        drawSprite(g, e.used ? 'blockUsed' : 'block', sx, sy - 18 - bump, 36);
                        break;
                    }
                    case 'item':
                        if (!e.alive) break;
                        this.drawItem(g, e, sx, sy, time);
                        break;
                    case 'rock':
                        this.drawRock(g, e, sx, sy, time);
                        break;
                    case 'meteor':
                        this.drawMeteor(g, e, sx, sy, time, run);
                        break;
                    case 'goomba':
                    case 'para':
                        this.drawGoomba(g, e, sx, sy, time, a, run);
                        break;
                    case 'puck':
                    case 'bullet':
                        this.drawProjectile(g, e, sx, sy, time, run);
                        break;
                    case 'star':
                        this.drawStar(g, e, sx, sy, time, run);
                        break;
                    default: break;
                }
            }
        },

        drawItem(g, e, sx, sy, time) {
            const cy = sy - e.h / 2;
            const pulse = 1 + Math.sin(time * 6) * 0.05;
            drawSprite(g, 'dot:white', sx, cy, 44 * pulse, 0.35);
            if (e.kind === 'mushroom') drawSprite(g, 'mushroom', sx, cy, 32 * pulse);
            else if (e.kind === 'magnet') drawSprite(g, 'bubble', sx, cy, 38 * pulse);
            else drawSprite(g, `rainbow${Math.floor(time * 10) % RAINBOW.length}`, sx, cy, 34 * pulse, 1, Math.sin(time * 3) * 0.2);
        },

        drawRock(g, e, sx, sy, time) {
            if (!e.alive) {
                if (e.deadT === undefined || e.deadT > 0.4) return;
                drawSprite(g, e.hot ? `rockHot${e.variant}` : `rock${e.variant}`, sx, sy - 16, 44 * (1 + e.deadT * 2), 1 - e.deadT / 0.4);
                return;
            }
            drawSprite(g, 'shadow', sx, sy + 1, 40, 0.8);
            if (e.hot) drawSprite(g, 'dot:orange', sx, sy - 12, 52, 0.35 + Math.sin(time * 5 + e.id) * 0.15);
            drawSprite(g, e.hot ? `rockHot${e.variant}` : `rock${e.variant}`, sx, sy - 16, 44);
        },

        drawMeteor(g, e, sx, sy, time, run) {
            const view = this.view;
            if (!e.alive) return;
            const impact = e.impactX - run.camX;
            if (e.warned && !e.landed) {
                const pulse = 0.5 + Math.sin(time * 14) * 0.5;
                g.save();
                g.strokeStyle = `rgba(255, 90, 60, ${0.5 + pulse * 0.5})`;
                g.lineWidth = 2.2;
                g.beginPath();
                g.ellipse(impact, view.groundY + 2, 20 + pulse * 5, 5 + pulse * 1.5, 0, 0, TAU);
                g.stroke();
                g.fillStyle = `rgba(255, 90, 60, ${0.18 + pulse * 0.18})`;
                g.fill();
                g.fillStyle = '#ff5a3c';
                g.beginPath();
                g.moveTo(impact - 7, view.groundY - 34 - pulse * 4);
                g.lineTo(impact + 7, view.groundY - 34 - pulse * 4);
                g.lineTo(impact, view.groundY - 24 - pulse * 4);
                g.closePath();
                g.fill();
                g.restore();
            }
            if (e.spawned && !e.landed) {
                const trail = g.createLinearGradient(sx, sy - 15, sx + 70, sy - 15 - 160);
                trail.addColorStop(0, 'rgba(255, 200, 90, 0.85)');
                trail.addColorStop(1, 'rgba(255, 80, 40, 0)');
                g.save();
                g.strokeStyle = trail;
                g.lineWidth = 16;
                g.lineCap = 'round';
                g.beginPath();
                g.moveTo(sx, sy - 15);
                g.lineTo(sx + 70, sy - 175);
                g.stroke();
                g.restore();
                drawSprite(g, 'dot:orange', sx, sy - 15, 60, 0.6);
                drawSprite(g, `rockHot${e.variant}`, sx, sy - 15, 40, 1, time * 6);
            }
        },

        drawGoomba(g, e, sx, sy, time, a, run) {
            const row = e.palette;
            if (!e.alive) {
                if (e.deadT === undefined) return;
                if (e.killedBy === 'stomp') {
                    if (e.deadT > 0.45) return;
                    const squash = e.deadT < 0.08 ? lerp(1, 0.34, e.deadT / 0.08) : lerp(0.34, 0.12, (e.deadT - 0.08) / 0.37);
                    drawGoombaSprite(g, row, 3, sx, sy, { scaleX: 1 + (1 - squash) * 0.5, scaleY: squash, alpha: 1 - Math.max(0, e.deadT - 0.2) / 0.25 });
                } else {
                    if (e.deadT > 1.2) return;
                    const fly = e.deadT;
                    drawGoombaSprite(g, row, 3, sx + fly * 160, sy - (fly * 420 - fly * fly * 900), { rotation: fly * 12, alpha: 1 });
                }
                return;
            }
            if (!e.falling || e.y >= 0) drawSprite(g, 'shadow', sx, sy + 1 + (e.type === 'para' ? e.y : 0), 38, e.type === 'para' ? 0.35 : 0.8);
            const above = a.vy < 0 && Math.abs(a.x - e.x) < 60 && a.y > e.y + e.h && a.y - e.y < 170;
            let frame = Math.floor(time * 6.5 + e.id) % 2 ? 1 : 2;
            if (above || e.falling) frame = 3;
            const waddle = Math.sin(time * 12 + e.id) * 0.07;
            const bob = Math.abs(Math.sin(time * 12 + e.id)) * 1.6;
            if (e.type === 'para') {
                const flap = Math.sin(time * 18 + e.id) * 0.55;
                const wy = sy - 36;
                drawSprite(g, 'wing', sx - 17, wy, 22, 1, -0.3 + flap);
                g.save();
                g.translate(sx + 17, wy);
                g.scale(-1, 1);
                drawSprite(g, 'wing', 0, 0, 22, 1, -0.3 + flap);
                g.restore();
            }
            drawGoombaSprite(g, row, frame, sx, sy - bob, { rotation: waddle });
        },

        drawProjectile(g, e, sx, sy, time, run) {
            const view = this.view;
            if (!e.alive) {
                if (e.deadT === undefined || e.deadT > 1) return;
                const t = e.deadT;
                drawSprite(g, e.type, sx + t * 40, sy - e.h / 2 - (t * 300 - t * t * 900), e.type === 'bullet' ? 46 : 40, 1 - t, t * 8);
                return;
            }
            if (!e.spawned) {
                if (!e.warned) return;
                const y = view.groundY - (e.y + e.h / 2);
                const pulse = 0.6 + Math.sin(time * 16) * 0.4;
                const x = view.w - 24;
                g.save();
                g.globalAlpha = 0.7 + pulse * 0.3;
                roundRectPath(g, x - 13, y - 13, 26, 26, 6);
                g.fillStyle = '#E52521';
                g.fill();
                g.lineWidth = 2;
                g.strokeStyle = '#ffffff';
                g.stroke();
                g.font = "14px 'Press Start 2P', monospace";
                g.textAlign = 'center';
                g.textBaseline = 'middle';
                g.fillStyle = '#ffffff';
                g.fillText('!', x + 1, y + 1);
                g.restore();
                return;
            }
            const cy = sy - e.h / 2;
            g.save();
            g.strokeStyle = e.type === 'puck' ? 'rgba(200, 240, 255, 0.6)' : 'rgba(255, 255, 255, 0.35)';
            g.lineWidth = 1.5;
            for (let i = 0; i < 3; i += 1) {
                const ly = cy + (i - 1) * (e.h * 0.3);
                const len = 18 + ((i + Math.floor(time * 20)) % 3) * 8;
                g.beginPath();
                g.moveTo(sx + e.w / 2 + 4, ly);
                g.lineTo(sx + e.w / 2 + 4 + len, ly);
                g.stroke();
            }
            g.restore();
            if (e.type === 'bullet') {
                drawSprite(g, 'bullet', sx, cy, 46);
            } else {
                drawSprite(g, 'puck', sx, cy, 40, 1, Math.sin(time * 30) * 0.04);
            }
        },

        drawStar(g, e, sx, sy, time) {
            const cy = sy - e.h / 2;
            const grand = e.grand;
            const size = grand ? 92 : 64;
            const pulse = 1 + Math.sin(time * 4) * 0.06;
            if (e.grabbed) return;
            g.save();
            g.translate(sx, cy);
            g.globalCompositeOperation = 'lighter';
            const rays = grand ? 12 : 8;
            for (let i = 0; i < rays; i += 1) {
                const angle = time * (grand ? 0.6 : 0.9) + (i / rays) * TAU;
                const color = grand ? RAINBOW[i % RAINBOW.length] : '#ffcc66';
                const ray = g.createLinearGradient(0, 0, Math.cos(angle) * size * 1.3, Math.sin(angle) * size * 1.3);
                ray.addColorStop(0, color);
                ray.addColorStop(1, 'rgba(0, 0, 0, 0)');
                g.strokeStyle = ray;
                g.globalAlpha = 0.35;
                g.lineWidth = grand ? 9 : 6;
                g.beginPath();
                g.moveTo(0, 0);
                g.lineTo(Math.cos(angle) * size * 1.3, Math.sin(angle) * size * 1.3);
                g.stroke();
            }
            g.globalAlpha = 0.6;
            g.strokeStyle = grand ? '#fff3a0' : '#ffb347';
            g.lineWidth = 2;
            for (let i = 0; i < 2; i += 1) {
                g.beginPath();
                g.ellipse(0, 0, size * (0.62 + i * 0.16), size * (0.2 + i * 0.05), time * (i ? -1.1 : 1.4), 0, TAU);
                g.stroke();
            }
            g.restore();
            drawSprite(g, 'dot:gold', sx, cy, size * 1.5, 0.45 + Math.sin(time * 4) * 0.15);
            drawSprite(g, grand ? 'grandStar' : 'launchStar', sx, cy, size * pulse, 1, time * (grand ? 0.8 : 2.2));
        },

        drawCrewMember(g, c, run, time) {
            const flip = c.flipT > 0 ? (1 - c.flipT / 0.45) * TAU : 0;
            drawLuma(g, c.frame, c.x, c.y, c.scale, 1, flip + Math.sin(time * 3 + c.phase) * 0.08);
        },

        drawCrew(g, run, time) {
            if (run.alva.mode === 'dying') return;
            this.look.crew.forEach((c, i) => {
                if (i === 0 && run.alva.mode === 'rescue') return;
                this.drawCrewMember(g, c, run, time);
            });
        },

        drawAlva(g, run, time) {
            const a = run.alva;
            const look = this.look;
            const pos = alvaScreenPos(run);
            if (a.mode === 'launch' && pos.x > this.view.w + 80) return;
            if (a.mode === 'rescue' && a.rescueT < 0.45) return;

            // Blink while invulnerable after a hit
            if (a.invuln > 0 && a.invuln < 90 && a.mode !== 'rescue' && Math.floor(a.invuln * (fx.reduced ? 6 : 14)) % 2 === 1) return;

            const frame = alvaFrame(a, look);
            let rotation = pos.rotation;
            let pivotY = 0;
            if (a.spinT > 0) {
                rotation += (1 - a.spinT / PHYS.spinDuration) * TAU;
                pivotY = 26;
            } else if (a.mode === 'dying') {
                rotation = run.phaseT > 0.35 ? (run.phaseT - 0.35) * 5 : 0;
                pivotY = 26;
            } else if (a.mode === 'launch') {
                pivotY = 26;
            } else if (!a.grounded && a.mode === 'air') {
                rotation = clamp(-a.vy / 3200, -0.12, 0.2);
                pivotY = 26;
            }
            const squash = clamp(look.squash, -0.45, 0.45);
            const scaleX = 1 - squash * 0.55;
            const scaleY = 1 + squash * 0.6;

            let glow = 'gold';
            if (a.rainbowT > 0) glow = `rainbow${Math.floor(time * 12) % RAINBOW.length}`;

            // Shadow on whatever is below her
            if (a.mode !== 'launch' && a.mode !== 'dying' && a.mode !== 'rescue') {
                const below = surfaceBelow(run, a.x, Math.max(a.y, 0));
                if (below > -Infinity) {
                    const height = a.y - below;
                    const k = clamp(1 - height / 220, 0.25, 1);
                    drawSprite(g, 'shadow', pos.x, this.view.groundY - below + 1, 42 * k, 0.9 * k);
                }
            }

            if (a.mode === 'rescue') {
                // Dangling from the Luma, with a sparkle trail
                drawSprite(g, 'spark:gold', pos.x + Math.sin(time * 9) * 10, pos.y - 20, 10, 0.8, time * 5);
            }

            drawAlvaSprite(g, frame, pos.x, pos.y, {
                scaleX, scaleY, rotation, pivotY, glow,
                white: look.flashT > 0 ? look.flashT / 0.12 : 0
            });

            if (a.rainbowT > 0 && a.rainbowT < 1.6 && Math.floor(a.rainbowT * 8) % 2 === 0) {
                drawSprite(g, 'dot:white', pos.x, pos.y - 26, 70, 0.25);
            }
            if (run.def && run.def.key === 'birthday' && a.mode !== 'dying') this.drawPartyHat(g, pos, rotation, pivotY, scaleY, time);
        },

        // In the birthday galaxy Alva wears a party hat (her head top sits ~43u above her feet).
        drawPartyHat(g, pos, rotation, pivotY, scaleY, time) {
            g.save();
            g.translate(pos.x, pos.y - pivotY);
            g.rotate(rotation);
            g.translate(3, pivotY - 43 * scaleY);
            g.rotate(0.28 + Math.sin(time * 6) * 0.05);
            g.beginPath();
            g.moveTo(-8, 4);
            g.lineTo(8, 4);
            g.lineTo(0, -17);
            g.closePath();
            g.fillStyle = '#ff52c6';
            g.fill();
            g.lineWidth = 1.6;
            g.strokeStyle = INK;
            g.stroke();
            g.save();
            g.clip();
            g.fillStyle = '#ffd700';
            for (let i = 0; i < 3; i += 1) g.fillRect(-10, -12 + i * 6, 20, 2.2);
            g.restore();
            drawSprite(g, 'dot:gold', 0, -18, 12, 0.9);
            g.fillStyle = '#fff6d6';
            g.beginPath();
            g.arc(0, -18, 2.6, 0, TAU);
            g.fill();
            g.restore();
        },

        drawOverlays(g, run, time) {
            const view = this.view;
            if (run.phase === 'launch') {
                const k = clamp(run.phaseT / 0.6, 0, 1);
                g.save();
                g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
                g.lineWidth = 1.6;
                for (let i = 0; i < 18; i += 1) {
                    const y = hashNoise(i * 3.1) * view.h;
                    const len = 60 + hashNoise(i * 7.7) * 140;
                    const x = view.w - wrap(time * 1800 + i * 137, view.w + len);
                    g.globalAlpha = k * 0.7;
                    g.beginPath();
                    g.moveTo(x, y);
                    g.lineTo(x + len, y);
                    g.stroke();
                }
                g.restore();
                const white = clamp((run.phaseT - 0.9) / 0.6, 0, 1);
                if (white > 0) {
                    g.fillStyle = `rgba(255, 250, 235, ${white})`;
                    g.fillRect(-20, -20, view.w + 40, view.h + 40);
                }
            }
            if (run.phase === 'cleared') {
                g.fillStyle = 'rgba(255, 250, 235, 1)';
                g.fillRect(-20, -20, view.w + 40, view.h + 40);
            }
            if (fx.vignetteT > 0) {
                const alpha = fx.vignetteT / 0.5;
                const vignette = g.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.3, view.w / 2, view.h / 2, view.w * 0.7);
                vignette.addColorStop(0, 'rgba(229, 37, 33, 0)');
                vignette.addColorStop(1, `rgba(229, 37, 33, ${0.45 * alpha})`);
                g.fillStyle = vignette;
                g.fillRect(-20, -20, view.w + 40, view.h + 40);
            }
            if (fx.flashT > 0) {
                g.globalAlpha = fx.flashAlpha * (fx.flashT / fx.flashDur);
                g.fillStyle = fx.flashColor;
                g.fillRect(-20, -20, view.w + 40, view.h + 40);
                g.globalAlpha = 1;
            }
        }
    };

    // =====================================================================
    // 9. SOUND
    // Everything is synthesized with WebAudio – nothing to download – and
    // mixed under the page's background music.
    // =====================================================================
    const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
    const note = (semitones, base = 523.25) => base * Math.pow(2, semitones / 12);

    function pageMusic() {
        try {
            return typeof bgMusic !== 'undefined' ? bgMusic : null;
        } catch (error) {
            return null;
        }
    }

    const sound = {
        ctx: null,
        master: null,
        noise: null,
        sfxOn: true,
        musicOn: true,
        bitStreak: 0,
        lastBitAt: 0,
        loopNext: 0,
        loopStep: 0,
        musicState: null,
        ducked: false,

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
                    if (typeof audioCtx !== 'undefined') audioCtx = ctx;
                } catch (error) {
                    // A page without the shared context – keep our own.
                }
            }
            if (ctx !== this.ctx) {
                this.ctx = ctx;
                this.master = ctx.createGain();
                this.master.gain.value = this.sfxOn ? 0.9 : 0;
                this.master.connect(ctx.destination);
                this.noise = null;
            }
            return ctx;
        },

        resume() {
            const ctx = this.context();
            if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
        },

        setSfx(on) {
            this.sfxOn = on;
            if (this.master) this.master.gain.value = on ? 0.9 : 0;
        },

        setMusic(on) {
            this.musicOn = on;
            const music = pageMusic();
            if (music) music.muted = !on;
        },

        // Remember how the page's music was set up so leaving the game restores it.
        enterGame() {
            const music = pageMusic();
            this.musicState = music ? { muted: music.muted, volume: music.volume } : null;
            this.setMusic(this.musicOn);
        },

        leaveGame() {
            const music = pageMusic();
            if (music && this.musicState) {
                music.muted = this.musicState.muted;
                music.volume = this.musicState.volume;
            }
            this.ducked = false;
        },

        tone(freq, duration, { type = 'square', gain = 0.06, slide = 0, delay = 0, attack = 0.006 } = {}) {
            const ctx = this.ctx;
            if (!ctx || !this.sfxOn) return;
            const t = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const amp = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + duration);
            amp.gain.setValueAtTime(0.0001, t);
            amp.gain.exponentialRampToValueAtTime(gain, t + attack);
            amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
            osc.connect(amp);
            amp.connect(this.master);
            osc.start(t);
            osc.stop(t + duration + 0.03);
        },

        hiss(duration, { gain = 0.08, type = 'bandpass', freq = 1200, slide = 0, q = 1, delay = 0 } = {}) {
            const ctx = this.ctx;
            if (!ctx || !this.sfxOn) return;
            if (!this.noise) {
                const length = ctx.sampleRate;
                this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
                const data = this.noise.getChannelData(0);
                for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
            }
            const t = ctx.currentTime + delay;
            const source = ctx.createBufferSource();
            source.buffer = this.noise;
            source.loop = true;
            const filter = ctx.createBiquadFilter();
            filter.type = type;
            filter.frequency.setValueAtTime(freq, t);
            if (slide) filter.frequency.exponentialRampToValueAtTime(slide, t + duration);
            filter.Q.value = q;
            const amp = ctx.createGain();
            amp.gain.setValueAtTime(gain, t);
            amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
            source.connect(filter);
            filter.connect(amp);
            amp.connect(this.master);
            source.start(t);
            source.stop(t + duration + 0.03);
        },

        arpeggio(semitones, { step = 0.07, duration = 0.18, type = 'triangle', gain = 0.06, base = 523.25, delay = 0 } = {}) {
            semitones.forEach((s, i) => this.tone(note(s, base), duration, { type, gain, delay: delay + i * step }));
        },

        jump() {
            this.tone(330, 0.16, { type: 'square', gain: 0.045, slide: 720 });
            this.tone(660, 0.1, { type: 'triangle', gain: 0.03, slide: 990 });
        },
        spin() {
            this.tone(520, 0.3, { type: 'triangle', gain: 0.06, slide: 1500 });
            this.hiss(0.26, { freq: 2400, slide: 6500, gain: 0.05, q: 2 });
            this.tone(1568, 0.12, { type: 'sine', gain: 0.03, delay: 0.08 });
            this.tone(2093, 0.12, { type: 'sine', gain: 0.03, delay: 0.14 });
        },
        land(impact) {
            this.hiss(0.08, { type: 'lowpass', freq: 520, gain: 0.03 + impact * 0.06 });
        },
        bit() {
            const ctx = this.ctx;
            if (!ctx) return;
            const now = ctx.currentTime;
            this.bitStreak = now - this.lastBitAt < 0.4 ? Math.min(this.bitStreak + 1, PENTATONIC.length - 1) : 0;
            this.lastBitAt = now;
            const freq = note(PENTATONIC[this.bitStreak], 880);
            this.tone(freq, 0.13, { type: 'triangle', gain: 0.045 });
            this.tone(freq * 2, 0.09, { type: 'sine', gain: 0.02, delay: 0.025 });
        },
        stomp(combo) {
            const lift = Math.pow(2, (Math.min(combo, 6) - 1) * 2 / 12);
            this.tone(400 * lift, 0.2, { type: 'square', gain: 0.1, slide: 120 * lift });
            this.tone(800 * lift, 0.22, { type: 'sine', gain: 0.07, slide: 1250 * lift, delay: 0.03 });
        },
        defeat() {
            this.hiss(0.18, { freq: 900, slide: 3000, gain: 0.06 });
            this.tone(1046, 0.14, { type: 'square', gain: 0.04, slide: 1568 });
        },
        smash() {
            this.hiss(0.25, { type: 'lowpass', freq: 900, slide: 120, gain: 0.12 });
            this.tone(140, 0.2, { type: 'square', gain: 0.05, slide: 60 });
        },
        hurt() {
            this.tone(440, 0.38, { type: 'square', gain: 0.07, slide: 110 });
            this.tone(466, 0.38, { type: 'sawtooth', gain: 0.03, slide: 116 });
            this.hiss(0.2, { type: 'lowpass', freq: 700, gain: 0.07 });
        },
        fall() {
            this.tone(1200, 0.7, { type: 'sine', gain: 0.06, slide: 160 });
        },
        rescue() {
            this.arpeggio([7, 11, 14, 19, 23], { base: 523.25, step: 0.06, type: 'sine', gain: 0.05 });
        },
        die() {
            this.tone(392, 0.18, { type: 'square', gain: 0.07 });
            this.tone(330, 0.18, { type: 'square', gain: 0.07, delay: 0.2 });
            this.tone(262, 0.5, { type: 'square', gain: 0.07, slide: 130, delay: 0.4 });
        },
        gameOver() {
            this.arpeggio([7, 4, 0, -5], { step: 0.22, duration: 0.3, type: 'triangle', gain: 0.07, base: 392 });
        },
        block(item) {
            this.tone(180, 0.07, { type: 'square', gain: 0.07 });
            this.tone(360, 0.06, { type: 'square', gain: 0.04, delay: 0.02 });
            if (item === 'bits') this.arpeggio([12, 16, 19], { base: 880, step: 0.05, gain: 0.03 });
            else this.arpeggio([0, 4, 7, 12, 16], { base: 523.25, step: 0.05, gain: 0.04, delay: 0.08 });
        },
        bumpEmpty() {
            this.tone(140, 0.07, { type: 'square', gain: 0.05 });
        },
        powerup(kind) {
            if (kind === 'mushroom') this.arpeggio([0, 7, 12, 16, 19, 24], { step: 0.06, gain: 0.05 });
            else if (kind === 'rainbow') this.arpeggio([0, 4, 7, 12, 16, 19, 24, 28], { step: 0.04, gain: 0.05, type: 'square' });
            else this.arpeggio([12, 16, 19, 23, 26], { step: 0.07, gain: 0.04, type: 'sine', base: 659.25 });
        },
        powerEnd() {
            this.arpeggio([7, 4, 0], { step: 0.07, gain: 0.03, base: 659.25 });
        },
        heal() {
            this.tone(1047, 0.12, { type: 'triangle', gain: 0.05 });
            this.tone(1568, 0.22, { type: 'triangle', gain: 0.05, delay: 0.1 });
        },
        bonus() {
            this.tone(987.77, 0.1, { type: 'sine', gain: 0.07, slide: 1318.51 });
            this.tone(1318.51, 0.3, { type: 'sine', gain: 0.05, delay: 0.1 });
        },
        warn() {
            this.tone(880, 0.07, { type: 'square', gain: 0.035 });
            this.tone(880, 0.07, { type: 'square', gain: 0.035, delay: 0.12 });
        },
        projectile(kind) {
            if (kind === 'puck') this.hiss(0.12, { type: 'highpass', freq: 1800, gain: 0.08 });
            else {
                this.hiss(0.3, { type: 'lowpass', freq: 400, slide: 90, gain: 0.12 });
                this.tone(110, 0.25, { type: 'square', gain: 0.05, slide: 55 });
            }
        },
        meteorWarn() {
            this.tone(660, 0.1, { type: 'triangle', gain: 0.04 });
            this.tone(520, 0.14, { type: 'triangle', gain: 0.04, delay: 0.12 });
        },
        whoosh() {
            this.hiss(0.8, { freq: 3000, slide: 300, gain: 0.07, q: 1.5 });
        },
        impact() {
            this.hiss(0.4, { type: 'lowpass', freq: 500, slide: 60, gain: 0.16 });
            this.tone(90, 0.35, { type: 'sine', gain: 0.12, slide: 40 });
        },
        launch() {
            this.hiss(1.3, { freq: 300, slide: 5000, gain: 0.08, q: 1.2 });
            this.arpeggio([0, 4, 7, 12, 16, 19, 24], { step: 0.09, gain: 0.05, type: 'square' });
        },
        cleared() {
            const melody = [[7, 0], [12, 0.1], [16, 0.2], [19, 0.3], [24, 0.46]];
            melody.forEach(([s, delay], i) => {
                const last = i === melody.length - 1;
                this.tone(note(s), last ? 0.7 : 0.14, { type: 'square', gain: 0.05, delay });
                this.tone(note(s) / 2, last ? 0.7 : 0.14, { type: 'triangle', gain: 0.05, delay });
            });
        },
        galaxyStart() {
            this.arpeggio([0, 7, 12], { step: 0.08, gain: 0.04, type: 'triangle', base: 659.25 });
        },
        finale() {
            const run1 = [0, 4, 7, 12, 7, 12, 16, 19, 24];
            run1.forEach((s, i) => this.tone(note(s), 0.16, { type: 'square', gain: 0.05, delay: i * 0.1 }));
            [0, 4, 7, 12].forEach((s) => this.tone(note(s + 12), 1.2, { type: 'triangle', gain: 0.05, delay: 0.95 }));
            this.hiss(1.4, { freq: 6000, slide: 1500, gain: 0.04, delay: 0.95 });
        },
        hint() {
            this.tone(1319, 0.08, { type: 'sine', gain: 0.03 });
        },

        // Rainbow Star music: a little arpeggio loop scheduled just ahead.
        update(run, active) {
            const ctx = this.ctx;
            const rainbow = active && run && run.alva.rainbowT > 0 && run.phase === 'play';
            const music = pageMusic();
            if (music && this.musicState) {
                const target = rainbow ? this.musicState.volume * 0.5 : this.musicState.volume;
                if (Math.abs(music.volume - target) > 0.01) music.volume = clamp(lerp(music.volume, target, 0.2), 0, 1);
            }
            if (!rainbow || !ctx || !this.sfxOn) {
                this.loopNext = 0;
                return;
            }
            const pattern = [0, 4, 7, 12, 16, 12, 7, 4, 2, 5, 9, 14, 17, 14, 9, 5];
            if (this.loopNext < ctx.currentTime) this.loopNext = ctx.currentTime + 0.02;
            while (this.loopNext < ctx.currentTime + 0.12) {
                const s = pattern[this.loopStep % pattern.length];
                this.tone(note(s, 659.25), 0.09, { type: 'triangle', gain: 0.028, delay: this.loopNext - ctx.currentTime });
                this.loopStep += 1;
                this.loopNext += 0.085;
            }
        }
    };

    // =====================================================================
    // 10. UI, INPUT & CONTROLLER
    // =====================================================================
    const HINTS = {
        jump: { touch: 'Tryck på skärmen för att hoppa!', keys: 'Hoppa: mellanslag, ↑ eller klick' },
        hold: 'Håll inne = högre hopp!',
        goomba: 'Hoppa på Goomban!',
        block: 'Slå i ?-blocket underifrån!',
        spin: 'Tryck igen i luften: Stjärnsnurr ✦',
        platform: 'Hoppa upp på plattformarna!',
        para: 'Flygande Goomba – studsa på den!',
        gap: 'Hoppa över vattnet!',
        puckLow: 'Låg puck – hoppa över!',
        puckHigh: 'Hög puck – stanna på marken!',
        meteor: 'Meteor! Se upp för målet!',
        moving: 'Plattformarna åker berg-och-dalbana!',
        bullet: 'Kulbill! Hoppa över eller på den!',
        party: 'Sista galaxen – hitta Grand Star! 🎂',
        mushroom: 'Livssvamp: +1 hjärta!',
        magnet: 'Lumas samlar stjärnbitar åt dig!',
        rainbow: 'Regnbågsstjärna! Du är ostoppbar!',
        bitsHeart: '50 stjärnbitar: +1 hjärta!',
        rescue: 'En Luma räddade dig! 💫',
        combo: 'Femdubbel studs: +1 hjärta!'
    };

    const HEART_PIXELS = [
        '.KK...KK.',
        'KRRK.KRRK',
        'KRWRKRRRK',
        'KRRRRRRRK',
        '.KRRRRRK.',
        '..KRRRK..',
        '...KRK...',
        '....K....'
    ];

    const store = {
        key: 'superAlvaGalaxy.v1',
        data: { best: 0, bestGalaxy: 0, finished: false, sfx: true, music: true },
        load() {
            try {
                const raw = window.localStorage.getItem(this.key);
                if (raw) Object.assign(this.data, JSON.parse(raw));
            } catch (error) {
                // Private mode or blocked storage: play without saving.
            }
        },
        save() {
            try {
                window.localStorage.setItem(this.key, JSON.stringify(this.data));
            } catch (error) {
                // Same as above.
            }
        }
    };

    function iconFromPainter(size, paint) {
        const scale = 3;
        const canvas = makeCanvas(size * scale, size * scale);
        const g = canvas.getContext('2d');
        g.scale(scale, scale);
        g.translate(size / 2, size / 2);
        paint(g, scale);
        return canvas.toDataURL();
    }

    function pixelHeartIcon(full) {
        const canvas = makeCanvas(9, 8);
        const g = canvas.getContext('2d');
        const colors = full
            ? { K: '#140a26', R: '#ff4d6d', W: '#ffe0e6' }
            : { K: '#140a26', R: '#3a2440', W: '#5a4060' };
        HEART_PIXELS.forEach((row, y) => {
            [...row].forEach((ch, x) => {
                if (ch === '.') return;
                g.fillStyle = colors[ch];
                g.fillRect(x, y, 1, 1);
            });
        });
        return canvas.toDataURL();
    }

    const game = {
        state: 'closed',
        run: null,
        el: {},
        input: { queue: 0, held: false, pointers: new Set(), keys: new Set(), mode: 'touch' },
        raf: 0,
        lastNow: 0,
        time: 0,
        acc: 0,
        hitstop: 0,
        hud: {},
        hintsShown: new Set(),
        ready: null,

        init() {
            const root = document.getElementById('sag-ui');
            const openButton = document.getElementById('play-galaxy-btn');
            if (!root || !openButton) return;
            const $ = (id) => document.getElementById(id);
            this.el = {
                root,
                openButton,
                canvas: $('sag-canvas'),
                confetti: $('sag-confetti'),
                hud: $('sag-hud'),
                hearts: $('sag-hearts'),
                power: $('sag-power'),
                powerIcon: $('sag-power-icon'),
                powerFill: $('sag-power-fill'),
                galaxyLabel: $('sag-galaxy-label'),
                progressFill: $('sag-progress-fill'),
                progressAlva: $('sag-progress-alva'),
                score: $('sag-score'),
                bits: $('sag-bits'),
                pauseButton: $('sag-pause-btn'),
                toast: $('sag-toast'),
                banner: $('sag-banner'),
                bannerKicker: $('sag-banner-kicker'),
                bannerTitle: $('sag-banner-title'),
                bannerTagline: $('sag-banner-tagline'),
                screens: $('sag-screens'),
                panels: Array.from(root.querySelectorAll('.sag-panel')),
                startRecord: $('sag-start-record'),
                continueButton: $('sag-continue-btn'),
                endlessStartButton: $('sag-endless-start-btn'),
                pauseStatus: $('sag-pause-status'),
                sfxButton: $('sag-sfx-btn'),
                musicButton: $('sag-music-btn'),
                clearKicker: $('sag-clear-kicker'),
                clearMemory: $('sag-clear-memory'),
                clearPhoto: $('sag-clear-photo'),
                clearTrophy: $('sag-clear-trophy'),
                clearCaption: $('sag-clear-caption'),
                clearBits: $('sag-clear-bits'),
                clearGoombas: $('sag-clear-goombas'),
                clearBonus: $('sag-clear-bonus'),
                clearPerfectRow: $('sag-clear-perfect-row'),
                clearPerfect: $('sag-clear-perfect'),
                clearScore: $('sag-clear-score'),
                nextButton: $('sag-next-btn'),
                overGalaxy: $('sag-over-galaxy'),
                overScore: $('sag-over-score'),
                overBits: $('sag-over-bits'),
                overGoombas: $('sag-over-goombas'),
                overRecord: $('sag-over-record'),
                retryButton: $('sag-retry-btn'),
                finaleScore: $('sag-finale-score'),
                finaleBits: $('sag-finale-bits'),
                finaleGoombas: $('sag-finale-goombas'),
                finaleRecord: $('sag-finale-record')
            };

            store.load();
            sound.sfxOn = store.data.sfx !== false;
            sound.musicOn = store.data.music !== false;
            fx.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.input.mode = window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'keys';
            renderer.init(this.el.canvas);
            this.buildHearts();
            this.ready = art.load().then(() => this.buildIcons());
            this.frameBound = (now) => this.frame(now);

            openButton.addEventListener('click', () => this.open());
            const on = (id, handler) => {
                const button = document.getElementById(id);
                if (button) button.addEventListener('click', handler);
            };
            on('sag-start-btn', () => this.startRun(0));
            on('sag-continue-btn', () => this.startRun(store.data.bestGalaxy));
            on('sag-endless-start-btn', () => this.startRun(GALAXIES.length));
            on('sag-quit-btn', () => this.close());
            on('sag-pause-btn', () => this.pause());
            on('sag-resume-btn', () => this.resume());
            on('sag-pause-quit-btn', () => this.close());
            on('sag-sfx-btn', () => this.toggleSfx());
            on('sag-music-btn', () => this.toggleMusic());
            on('sag-next-btn', () => this.continueJourney());
            on('sag-clear-quit-btn', () => this.close());
            on('sag-retry-btn', () => this.retry());
            on('sag-restart-btn', () => this.startRun(0));
            on('sag-over-quit-btn', () => this.close());
            on('sag-endless-btn', () => this.continueJourney());
            on('sag-finale-restart-btn', () => this.startRun(0));
            on('sag-finale-quit-btn', () => this.close());
            this.bindInput();

            window.addEventListener('resize', () => this.onResize());
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) this.autoPause();
            });
            window.addEventListener('blur', () => this.autoPause());
        },

        buildIcons() {
            const root = this.el.root;
            try {
                root.style.setProperty('--sag-heart-full', `url(${pixelHeartIcon(true)})`);
                root.style.setProperty('--sag-heart-empty', `url(${pixelHeartIcon(false)})`);
                root.style.setProperty('--sag-bit-icon', `url(${iconFromPainter(22, (g, s) => paintCandyStar(g, s, { outer: 9.5, inner: 5.4, ...BIT_COLORS[0], glowBlur: 3 }))})`);
                root.style.setProperty('--sag-rainbow-icon', `url(${iconFromPainter(30, (g, s) => paintCandyStar(g, s, { outer: 12, inner: 6.8, main: '#fff04d', light: '#ffffff', dark: '#ff5a5a', glow: '#ffb347', glowBlur: 3 }))})`);
                root.style.setProperty('--sag-meteor-icon', `url(${iconFromPainter(44, (g, s) => art.paintRock(g, s, 1, true))})`);
                root.style.setProperty('--sag-blackhole-icon', `url(${iconFromPainter(44, (g) => {
                    const halo = g.createRadialGradient(0, 0, 8, 0, 0, 20);
                    halo.addColorStop(0, 'rgba(255, 220, 180, 1)');
                    halo.addColorStop(0.35, 'rgba(195, 139, 255, 0.8)');
                    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    g.fillStyle = halo;
                    g.fillRect(-22, -22, 44, 44);
                    g.strokeStyle = 'rgba(255, 170, 80, 0.9)';
                    g.lineWidth = 3;
                    g.beginPath();
                    g.ellipse(0, 0, 20, 5, -0.3, 0, TAU);
                    g.stroke();
                    g.fillStyle = '#000000';
                    g.beginPath();
                    g.arc(0, 0, 8, 0, TAU);
                    g.fill();
                })})`);
            } catch (error) {
                // Icons are decoration; the game works without them.
            }
        },

        buildHearts() {
            this.el.hearts.replaceChildren();
            this.heartNodes = [];
            for (let i = 0; i < MAX_HEARTS; i += 1) {
                const heart = document.createElement('span');
                heart.className = 'sag-heart is-full';
                this.el.hearts.appendChild(heart);
                this.heartNodes.push(heart);
            }
        },

        // --- Opening and closing ------------------------------------------
        open() {
            if (this.state !== 'closed') return;
            this.state = 'opening';
            sound.resume();
            sound.enterGame();
            const mario = document.getElementById('mario-content');
            if (mario) mario.style.display = 'none';
            if (typeof setSceneRenderPaused === 'function') setSceneRenderPaused(true);
            this.el.root.classList.add('is-open');
            this.el.root.setAttribute('aria-hidden', 'false');
            this.el.hud.classList.remove('is-visible');

            const fonts = document.fonts && document.fonts.load
                ? Promise.race([document.fonts.load("16px 'Press Start 2P'"), new Promise((resolve) => setTimeout(resolve, 1500))])
                : Promise.resolve();
            Promise.all([this.ready, fonts]).catch(() => {}).then(() => {
                if (this.state !== 'opening') return;
                this.landscape = window.innerWidth > window.innerHeight;
                const view = renderer.resize();
                this.run = createRun({ attract: true, view });
                renderer.setGalaxy(GALAXIES[0], false);
                renderer.resetLook();
                fx.reset();
                this.state = 'menu';
                this.showStart();
                this.lastNow = performance.now();
                cancelAnimationFrame(this.raf);
                this.raf = requestAnimationFrame(this.frameBound);
            });
        },

        close() {
            if (this.state === 'closed') return;
            this.recordRun();
            cancelAnimationFrame(this.raf);
            this.state = 'closed';
            this.releaseAll();
            this.hidePanels();
            this.el.toast.classList.remove('is-showing');
            this.el.banner.classList.remove('is-showing');
            if (this.confettiShot) this.confettiShot.reset();
            this.el.root.classList.remove('is-open');
            this.el.root.setAttribute('aria-hidden', 'true');
            const mario = document.getElementById('mario-content');
            if (mario) mario.style.display = '';
            if (typeof setSceneRenderPaused === 'function') setSceneRenderPaused(false);
            sound.leaveGame();
            this.run = null;
            this.el.openButton.focus({ preventScroll: true });
        },

        // --- Runs and galaxies ---------------------------------------------
        startRun(galaxyIndex, score = 0) {
            sound.resume();
            this.recordRun();
            const run = createRun({ galaxyIndex, view: renderer.view });
            run.score = score;
            run.stats.startScore = score;
            this.run = run;
            renderer.setGalaxy(run.def, true);
            renderer.resetLook();
            fx.reset();
            this.acc = 0;
            this.hitstop = 0;
            this.releaseAll();
            this.hud = {};
            this.noteGalaxyReached(galaxyIndex);
            this.beginPlaying();
        },

        beginPlaying() {
            this.state = 'playing';
            this.releaseAll();
            this.hidePanels();
            this.el.hud.classList.add('is-visible');
            this.showBanner();
            sound.galaxyStart();
            if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        },

        onCleared() {
            const run = this.run;
            const finished = {
                index: run.galaxyIndex,
                def: run.def,
                bits: run.stats.bits,
                bitTotal: run.stats.bitTotal,
                goombas: run.stats.goombas,
                clearBonus: run.stats.clearBonus || 0,
                perfectBonus: run.stats.perfectBonus || 0,
                score: run.score
            };
            // The next galaxy is set up behind the tally, Alva waits in the sky.
            startGalaxy(run, finished.index + 1);
            renderer.setGalaxy(run.def, true);
            renderer.resetLook();
            fx.flash('#fffbeb', 1, 0.9);
            this.noteGalaxyReached(finished.index + 1);
            this.state = 'clear';
            this.releaseAll();
            sound.cleared();
            this.showClear(finished);
        },

        continueJourney() {
            const run = this.run;
            if (!run) return;
            if (this.state === 'finale') {
                startGalaxy(run, GALAXIES.length);
                renderer.setGalaxy(run.def, true);
                renderer.resetLook();
                this.noteGalaxyReached(GALAXIES.length);
            }
            this.hud = {};
            this.beginPlaying();
        },

        retry() {
            const run = this.run;
            if (!run) return;
            this.startRun(run.galaxyIndex, run.stats.startScore);
        },

        noteGalaxyReached(index) {
            if (index < GALAXIES.length && index > (store.data.bestGalaxy || 0)) {
                store.data.bestGalaxy = index;
                store.save();
            }
        },

        recordRun() {
            const run = this.run;
            if (!run || run.attract || run.recorded) return false;
            const isRecord = run.score > (store.data.best || 0);
            if (isRecord) store.data.best = run.score;
            store.save();
            return isRecord;
        },

        // --- Pause -------------------------------------------------------------
        pause() {
            if (this.state !== 'playing') return;
            this.state = 'paused';
            this.releaseAll();
            this.el.pauseStatus.textContent = `Galax ${this.run.galaxyIndex + 1} • ${formatScore(this.run.score)} poäng`;
            this.refreshSoundButtons();
            this.showPanel('pause');
        },

        resume() {
            if (this.state !== 'paused') return;
            this.state = 'playing';
            this.hidePanels();
            this.acc = 0;
            this.lastNow = performance.now();
            if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        },

        autoPause() {
            this.releaseAll();
            if (this.state === 'playing') this.pause();
        },

        toggleSfx() {
            sound.setSfx(!sound.sfxOn);
            store.data.sfx = sound.sfxOn;
            store.save();
            this.refreshSoundButtons();
        },

        toggleMusic() {
            sound.setMusic(!sound.musicOn);
            store.data.music = sound.musicOn;
            store.save();
            this.refreshSoundButtons();
        },

        refreshSoundButtons() {
            this.el.sfxButton.textContent = `Ljud: ${sound.sfxOn ? 'på' : 'av'}`;
            this.el.musicButton.textContent = `Musik: ${sound.musicOn ? 'på' : 'av'}`;
            this.el.sfxButton.setAttribute('aria-pressed', String(sound.sfxOn));
            this.el.musicButton.setAttribute('aria-pressed', String(sound.musicOn));
        },

        // --- Input -------------------------------------------------------------
        bindInput() {
            const root = this.el.root;
            root.addEventListener('pointerdown', (event) => {
                if (event.target.closest('button, .sag-panel')) return;
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                this.input.mode = event.pointerType === 'mouse' ? 'keys' : 'touch';
                if (this.state !== 'playing') return;
                event.preventDefault();
                this.input.pointers.add(event.pointerId);
                this.press();
            });
            const release = (event) => {
                if (this.input.pointers.delete(event.pointerId)) this.syncHeld();
            };
            window.addEventListener('pointerup', release);
            window.addEventListener('pointercancel', release);
            root.addEventListener('contextmenu', (event) => event.preventDefault());
            window.addEventListener('keydown', (event) => this.onKeyDown(event));
            window.addEventListener('keyup', (event) => {
                if (this.input.keys.delete(event.code)) this.syncHeld();
            });
        },

        onKeyDown(event) {
            if (this.state === 'closed' || this.state === 'opening') return;
            if (['Space', 'ArrowUp', 'KeyW', 'KeyK'].includes(event.code)) {
                // In menus these keys belong to the focused button.
                if (this.state !== 'playing') return;
                event.preventDefault();
                this.input.mode = 'keys';
                if (!event.repeat && !this.input.keys.has(event.code)) {
                    this.input.keys.add(event.code);
                    this.press();
                }
                return;
            }
            if (event.code === 'Escape' || event.code === 'KeyP') {
                if (this.state === 'playing') {
                    event.preventDefault();
                    this.pause();
                } else if (this.state === 'paused') {
                    event.preventDefault();
                    this.resume();
                }
            }
        },

        press() {
            this.input.queue = Math.min(this.input.queue + 1, 2);
            this.input.held = true;
            sound.resume();
        },

        syncHeld() {
            this.input.held = this.input.pointers.size > 0 || this.input.keys.size > 0;
        },

        releaseAll() {
            this.input.pointers.clear();
            this.input.keys.clear();
            this.input.held = false;
            this.input.queue = 0;
        },

        onResize() {
            if (this.state === 'closed' || this.state === 'opening') return;
            // Turning the phone mid-jump would be unfair: pause instead. (Plain height
            // changes, like a collapsing address bar, don't count.)
            const landscape = window.innerWidth > window.innerHeight;
            if (this.state === 'playing' && this.landscape !== undefined && landscape !== this.landscape) this.pause();
            this.landscape = landscape;
            const view = renderer.resize();
            if (this.run) setRunView(this.run, view);
        },

        // --- The frame loop ----------------------------------------------------
        frame(now) {
            if (this.state === 'closed') return;
            this.raf = requestAnimationFrame(this.frameBound);
            let dt = (now - this.lastNow) / 1000;
            this.lastNow = now;
            if (!(dt > 0)) dt = 0;
            dt = Math.min(dt, 0.1);
            this.time += dt;
            const run = this.run;
            if (!run) return;

            if (this.state === 'menu' || this.state === 'playing' || this.state === 'finale') {
                if (this.hitstop > 0) {
                    this.hitstop = Math.max(0, this.hitstop - dt);
                } else {
                    this.acc += dt;
                    let steps = 0;
                    while (this.acc >= PHYS.step && steps < PHYS.maxStepsPerFrame) {
                        const canPress = this.state === 'playing' && run.phase === 'play';
                        let input = { press: canPress && this.input.queue > 0, held: canPress && this.input.held };
                        if (input.press) this.input.queue -= 1;
                        // Test/demo hook: an automated player can steer Alva step by step.
                        if (this.autopilot && canPress) input = this.autopilot(run, input) || input;
                        stepRun(run, input, PHYS.step);
                        this.acc -= PHYS.step;
                        steps += 1;
                    }
                    if (steps >= PHYS.maxStepsPerFrame) this.acc = 0;
                }
                this.processEvents();
            }

            renderer.updateLook(this.run, dt, this.time);
            fx.update(dt);
            sound.update(this.run, this.state === 'playing');
            renderer.draw(this.run, this.time);
            this.updateHud();
        },

        processEvents() {
            const run = this.run;
            if (!run.events.length) return;
            const events = run.events.splice(0);
            for (const event of events) this.present(event, run);
        },

        // Turns simulation events into sound, particles and UI.
        present(e, run) {
            const quiet = this.state === 'menu';
            const look = renderer.look;
            const a = run.alva;
            switch (e.type) {
                case 'jump':
                    look.squashV += 5.5;
                    fx.burst(e.x, 2, 5, { kind: 'dust', speed: 90, spread: Math.PI * 0.8, angle: Math.PI, size: 10, sizeEnd: 18, life: 0.35 });
                    if (!quiet) sound.jump();
                    break;
                case 'spin':
                    fx.spawn({ kind: 'ring', color: '#fff3a0', x: e.x, y: e.y + 26, size: 12, sizeEnd: 46, life: 0.3, flat: 0.45 });
                    fx.burst(e.x, e.y + 26, 10, { kind: 'spark', colors: ['gold', 'white', 'cyan', 'pink'], speed: 260, size: 9, sizeEnd: 2, life: 0.45 });
                    if (!quiet) sound.spin();
                    break;
                case 'land':
                    look.squashV -= 3 + e.impact * 6;
                    fx.burst(e.x, e.y + 2, 4 + Math.round(e.impact * 5), { kind: 'dust', speed: 70 + e.impact * 80, spread: Math.PI * 0.5, angle: Math.PI / 2, size: 9, sizeEnd: 20, life: 0.4 });
                    if (e.drop) {
                        fx.shake(3, 0.2);
                        fx.burst(e.x, 30, 14, { kind: 'spark', colors: ['gold', 'white'], speed: 240, size: 8, sizeEnd: 2, life: 0.5 });
                    }
                    if (!quiet) sound.land(e.impact);
                    break;
                case 'bit': {
                    const color = ['gold', 'cyan', 'pink', 'green', 'purple', 'orange'][e.color] || 'gold';
                    fx.burst(e.x, e.y, 6, { kind: 'spark', colors: [color, 'white'], speed: 150, size: 8, sizeEnd: 1, life: 0.35 });
                    if (!quiet) sound.bit();
                    break;
                }
                case 'stomp': {
                    this.hitstop = Math.max(this.hitstop, 0.045);
                    fx.shake(2.5 + Math.min(e.combo, 5) * 0.6, 0.18);
                    const flash = GOOMBA_FLASH[e.palette || 0];
                    fx.spawn({ kind: 'ring', color: flash, x: e.x, y: e.y - 6, size: 8, sizeEnd: 44, life: 0.32, flat: 0.5 });
                    fx.burst(e.x, e.y - 6, 10, { kind: 'spark', colors: ['white', 'gold'], speed: 240, size: 9, sizeEnd: 2, life: 0.4 });
                    fx.pop(e.x, e.y + 20, e.combo > 1 ? `${formatScore(e.points)} x${e.combo}` : `+${e.points}`, e.combo > 2 ? '#ff7ad5' : '#FBD000', 10 + Math.min(e.combo, 5));
                    if (e.kind === 'para') {
                        fx.spawn({ kind: 'wing', x: e.x - 16, y: e.y - 4, vx: -120, vy: 200, gravity: 900, life: 0.9, size: 22, vrot: -8 });
                        fx.spawn({ kind: 'wing', x: e.x + 16, y: e.y - 4, vx: 120, vy: 220, gravity: 900, life: 0.9, size: 22, vrot: 8 });
                    }
                    const crew = look.crew[Math.floor(Math.random() * look.crew.length)];
                    crew.flipT = 0.45;
                    sound.stomp(e.combo);
                    break;
                }
                case 'defeat':
                    fx.burst(e.x, e.y, 12, { kind: 'spark', colors: ['red', 'orange', 'gold', 'green', 'cyan', 'purple'], speed: 280, size: 10, sizeEnd: 2, life: 0.5 });
                    fx.pop(e.x, e.y + 16, `+${e.points}`, '#FBD000', 10);
                    fx.shake(2, 0.12);
                    sound.defeat();
                    break;
                case 'smash':
                    fx.burst(e.x, e.y, 12, { kind: 'shard', colors: e.hot ? ['#ff9a5c', '#6e4038', '#ffcc4d'] : ['#8a7cb4', '#cfc4ee', '#3a3160'], speed: 300, size: 7, sizeEnd: 4, life: 0.7, gravity: 900 });
                    fx.pop(e.x, e.y + 16, `+${e.points}`, '#FBD000', 10);
                    fx.shake(3, 0.15);
                    sound.smash();
                    break;
                case 'hurt':
                    this.hitstop = Math.max(this.hitstop, 0.1);
                    fx.shake(7, 0.35);
                    fx.vignetteT = 0.5;
                    look.flashT = 0.12;
                    fx.burst(e.x, e.y + 24, 10, { kind: 'dot', colors: ['red', 'white'], speed: 220, size: 9, sizeEnd: 1, life: 0.4 });
                    look.crew.forEach((c) => { c.vx += (Math.random() - 0.5) * 300; c.vy -= 120; });
                    sound.hurt();
                    break;
                case 'fall':
                    fx.vignetteT = 0.5;
                    sound.fall();
                    break;
                case 'rescue':
                    sound.rescue();
                    this.showHint('rescue', true);
                    break;
                case 'rescued':
                    fx.burst(e.x, e.y + 20, 16, { kind: 'spark', colors: ['gold', 'white', 'cyan'], speed: 200, size: 9, sizeEnd: 2, life: 0.5 });
                    break;
                case 'die':
                    fx.shake(8, 0.4);
                    fx.flash('#E52521', 0.35, 0.35);
                    this.hitstop = 0.18;
                    sound.die();
                    break;
                case 'gameover':
                    this.onGameOver();
                    break;
                case 'block':
                    fx.burst(e.x, e.y + 36, 8, { kind: 'spark', colors: ['gold', 'white'], speed: 200, size: 8, sizeEnd: 2, life: 0.4 });
                    fx.pop(e.x, e.y + 60, '+50', '#FBD000', 9);
                    if (!quiet) sound.block(e.item);
                    break;
                case 'bumpEmpty':
                    if (!quiet) sound.bumpEmpty();
                    break;
                case 'powerup':
                    fx.flash(e.kind === 'rainbow' ? '#fff6d6' : '#ffffff', 0.35, 0.3);
                    fx.burst(e.x, e.y, 16, { kind: 'spark', colors: e.kind === 'mushroom' ? ['red', 'white'] : e.kind === 'magnet' ? ['cyan', 'white'] : ['red', 'orange', 'gold', 'green', 'cyan', 'purple'], speed: 260, size: 10, sizeEnd: 2, life: 0.55 });
                    fx.pop(e.x, e.y + 26, e.kind === 'mushroom' ? '+1 ♥' : e.kind === 'magnet' ? 'Luma-magnet!' : 'Regnbåge!', '#ffffff', 10);
                    sound.powerup(e.kind);
                    this.showHint(e.kind);
                    break;
                case 'powerEnd':
                    sound.powerEnd();
                    break;
                case 'heal':
                    fx.spawn({ kind: 'heart', x: a.x, y: a.y + 70, vy: 60, life: 0.9, size: 20, sizeEnd: 26 });
                    sound.heal();
                    if (e.source === 'bits') this.showHint('bitsHeart');
                    if (e.source === 'combo') this.showHint('combo');
                    break;
                case 'bonus':
                    fx.pop(e.x, e.y, `+${e.amount}`, '#FBD000', 11);
                    sound.bonus();
                    break;
                case 'warn':
                    if (!quiet) sound.warn();
                    break;
                case 'projectile':
                    if (!quiet) sound.projectile(e.kind);
                    break;
                case 'meteorWarn':
                    if (!quiet) sound.meteorWarn();
                    break;
                case 'meteorSpawn':
                    if (!quiet) sound.whoosh();
                    break;
                case 'meteorImpact':
                    fx.shake(5, 0.3);
                    fx.burst(e.x, 6, 14, { kind: 'dot', colors: ['orange', 'gold', 'red'], speed: 320, spread: Math.PI * 0.9, angle: Math.PI / 2, size: 9, sizeEnd: 1, life: 0.6, gravity: 700 });
                    fx.burst(e.x, 4, 6, { kind: 'dust', speed: 120, spread: Math.PI * 0.6, angle: Math.PI / 2, size: 14, sizeEnd: 26, life: 0.5 });
                    if (!quiet) sound.impact();
                    break;
                case 'goombaLand':
                    fx.burst(e.x, 2, 4, { kind: 'dust', speed: 60, spread: Math.PI * 0.5, angle: Math.PI / 2, size: 8, sizeEnd: 16, life: 0.35 });
                    break;
                case 'poof':
                    fx.burst(e.x, e.y, 8, { kind: 'dust', speed: 120, size: 12, sizeEnd: 24, life: 0.45 });
                    fx.burst(e.x, e.y, 6, { kind: 'spark', colors: ['white', 'gold'], speed: 180, size: 8, sizeEnd: 2, life: 0.4 });
                    break;
                case 'hint':
                    this.showHint(e.key, true);
                    break;
                case 'launch':
                    fx.burst(e.x, e.y + 30, 24, { kind: 'spark', colors: ['gold', 'orange', 'white'], speed: 320, size: 11, sizeEnd: 2, life: 0.7 });
                    fx.flash('#fff3c4', 0.5, 0.4);
                    look.crew.forEach((c) => { c.flipT = 0.45; });
                    sound.launch();
                    break;
                case 'cleared':
                    this.onCleared();
                    break;
                case 'finale':
                    this.hitstop = 0.25;
                    fx.flash('#ffffff', 0.9, 1.1);
                    fx.shake(6, 0.5);
                    fx.burst(e.x, e.y + 40, 40, { kind: 'spark', colors: ['gold', 'white', 'pink', 'cyan', 'green', 'orange'], speed: 420, size: 12, sizeEnd: 2, life: 1.1 });
                    look.crew.forEach((c) => { c.flipT = 0.45; });
                    sound.finale();
                    this.celebrate(2600);
                    break;
                case 'finaleReady':
                    this.onFinale();
                    break;
                default:
                    break;
            }
        },

        onGameOver() {
            if (this.state !== 'playing') return;
            this.state = 'gameover';
            this.releaseAll();
            const run = this.run;
            const isRecord = this.recordRun();
            run.recorded = true;
            sound.gameOver();
            this.el.overGalaxy.textContent = `Galax ${run.galaxyIndex + 1}: ${run.def.name}`;
            this.el.overScore.textContent = formatScore(run.score);
            this.el.overBits.textContent = formatScore(run.bits);
            this.el.overGoombas.textContent = formatScore(run.goombas);
            this.el.overRecord.hidden = !isRecord;
            const canRetry = run.galaxyIndex > 0;
            this.el.retryButton.hidden = !canRetry;
            this.el.retryButton.textContent = `Försök igen: Galax ${run.galaxyIndex + 1}`;
            this.showPanel('over');
        },

        onFinale() {
            if (this.state !== 'playing') return;
            this.state = 'finale';
            this.releaseAll();
            const run = this.run;
            store.data.finished = true;
            const isRecord = this.recordRun();
            this.el.finaleScore.textContent = formatScore(run.score);
            this.el.finaleBits.textContent = formatScore(run.bits);
            this.el.finaleGoombas.textContent = formatScore(run.goombas);
            this.el.finaleRecord.hidden = !isRecord;
            this.showPanel('finale');
            this.celebrate(4200);
        },

        // Confetti on its own canvas inside the game, so it falls behind the panels.
        celebrate(duration) {
            if (typeof confetti !== 'function' || !this.el.confetti) return;
            if (!this.confettiShot) {
                this.confettiShot = confetti.create(this.el.confetti, { resize: true, useWorker: false, disableForReducedMotion: true });
            }
            const shoot = this.confettiShot;
            const colors = ['#E52521', '#43B047', '#FBD000', '#ffffff', '#ff7ad5', '#6ee8ff'];
            const end = Date.now() + (fx.reduced ? duration * 0.4 : duration);
            const burst = () => {
                if (this.state === 'closed') return;
                shoot({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors });
                shoot({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors });
                if (Date.now() < end) requestAnimationFrame(burst);
            };
            burst();
        },

        // --- HUD ---------------------------------------------------------------
        updateHud() {
            const run = this.run;
            if (!run || run.attract) return;
            const hud = this.hud;
            if (hud.hearts !== run.hearts) {
                this.heartNodes.forEach((node, i) => {
                    const full = i < run.hearts;
                    node.classList.toggle('is-full', full);
                    node.classList.toggle('is-empty', !full);
                });
                if (hud.hearts !== undefined) {
                    const node = this.el.hearts;
                    node.classList.remove('is-hit', 'is-heal');
                    void node.offsetWidth;
                    node.classList.add(run.hearts < hud.hearts ? 'is-hit' : 'is-heal');
                }
                hud.hearts = run.hearts;
            }
            if (hud.score !== run.score) {
                this.el.score.textContent = formatScore(run.score);
                hud.score = run.score;
            }
            if (hud.bits !== run.bits) {
                this.el.bits.textContent = formatScore(run.bits);
                hud.bits = run.bits;
            }
            if (hud.galaxy !== run.galaxyIndex) {
                this.el.galaxyLabel.textContent = run.galaxyIndex < GALAXIES.length
                    ? `GALAX ${run.galaxyIndex + 1}/${GALAXIES.length}`
                    : `GALAX ${run.galaxyIndex + 1} ∞`;
                this.el.root.style.setProperty('--sag-accent', run.def.theme.accent);
                hud.galaxy = run.galaxyIndex;
            }
            const progress = clamp(run.alva.x / run.level.starX, 0, 1);
            if (hud.progress === undefined || Math.abs(hud.progress - progress) > 0.002) {
                this.el.progressFill.style.transform = `scaleX(${progress.toFixed(3)})`;
                this.el.progressAlva.style.left = `${(progress * 100).toFixed(2)}%`;
                hud.progress = progress;
            }
            const a = run.alva;
            const power = a.rainbowT > 0 ? 'rainbow' : a.magnetT > 0 ? 'magnet' : '';
            if (hud.power !== power) {
                this.el.power.hidden = !power;
                this.el.power.dataset.kind = power;
                hud.power = power;
            }
            if (power) {
                const left = power === 'rainbow' ? a.rainbowT / POWER_TIME.rainbow : a.magnetT / POWER_TIME.magnet;
                this.el.powerFill.style.transform = `scaleX(${clamp(left, 0, 1).toFixed(3)})`;
            }
        },

        showBanner() {
            const run = this.run;
            const endless = run.galaxyIndex >= GALAXIES.length;
            this.el.bannerKicker.textContent = endless ? `GALAX ${run.galaxyIndex + 1} ∞` : `GALAX ${run.galaxyIndex + 1} AV ${GALAXIES.length}`;
            this.el.bannerTitle.textContent = run.def.name;
            this.el.bannerTagline.textContent = run.def.tagline;
            this.el.root.style.setProperty('--sag-accent', run.def.theme.accent);
            const banner = this.el.banner;
            banner.classList.remove('is-showing');
            void banner.offsetWidth;
            banner.classList.add('is-showing');
        },

        showHint(key, force = false) {
            const hint = HINTS[key];
            if (!hint || this.state === 'menu') return;
            if (!force && this.hintsShown.has(key)) return;
            this.hintsShown.add(key);
            const text = typeof hint === 'string' ? hint : hint[this.input.mode] || hint.touch;
            const toast = this.el.toast;
            toast.textContent = text;
            toast.classList.remove('is-showing');
            void toast.offsetWidth;
            toast.classList.add('is-showing');
            sound.hint();
        },

        // --- Panels ------------------------------------------------------------
        showPanel(name) {
            this.el.screens.classList.add('is-open');
            let focusTarget = null;
            for (const panel of this.el.panels) {
                const match = panel.dataset.panel === name;
                panel.hidden = !match;
                if (match) focusTarget = panel.querySelector('.sag-btn:not([hidden])');
            }
            if (focusTarget) focusTarget.focus({ preventScroll: true });
        },

        hidePanels() {
            this.el.screens.classList.remove('is-open');
            for (const panel of this.el.panels) panel.hidden = true;
        },

        showStart() {
            const best = store.data.best || 0;
            const bestGalaxy = store.data.bestGalaxy || 0;
            const parts = [];
            if (best > 0) parts.push(`REKORD: ${formatScore(best)}`);
            if (store.data.finished) parts.push('GRAND STAR ⭐');
            else if (bestGalaxy > 0) parts.push(`LÄNGST: GALAX ${bestGalaxy + 1}`);
            this.el.startRecord.textContent = parts.join(' • ');
            this.el.startRecord.hidden = parts.length === 0;
            this.el.continueButton.hidden = !(bestGalaxy > 0 && bestGalaxy < GALAXIES.length);
            this.el.continueButton.textContent = `Fortsätt: Galax ${bestGalaxy + 1}`;
            this.el.endlessStartButton.hidden = !store.data.finished;
            this.el.root.querySelectorAll('[data-touch]').forEach((node) => {
                node.textContent = this.input.mode === 'keys' ? node.dataset.keys : node.dataset.touch;
            });
            this.el.hud.classList.remove('is-visible');
            this.showPanel('start');
        },

        showClear(finished) {
            const def = finished.def;
            const endless = finished.index >= GALAXIES.length;
            this.el.clearKicker.textContent = endless ? `GALAX ${finished.index + 1} ∞` : `GALAX ${finished.index + 1}: ${def.name}`;
            const memory = def.memory;
            const trophy = def.trophy;
            this.el.clearMemory.hidden = !memory && !trophy;
            this.el.clearPhoto.hidden = !memory;
            this.el.clearTrophy.hidden = !!memory || !trophy;
            if (memory) {
                this.el.clearPhoto.src = memory.src;
                this.el.clearCaption.textContent = `Minne upplåst: ${memory.caption}`;
            } else if (trophy) {
                this.el.clearTrophy.dataset.icon = trophy.icon;
                this.el.clearCaption.textContent = trophy.caption;
            }
            this.el.clearBits.textContent = `${finished.bits} / ${finished.bitTotal}`;
            this.el.clearGoombas.textContent = String(finished.goombas);
            this.el.clearBonus.textContent = `+${formatScore(finished.clearBonus)}`;
            this.el.clearPerfectRow.hidden = !finished.perfectBonus;
            this.el.clearPerfect.textContent = `+${formatScore(finished.perfectBonus)}`;
            this.el.clearScore.textContent = formatScore(finished.score);
            this.el.nextButton.textContent = `Till Galax ${finished.index + 2} ▶`;
            this.showPanel('clear');
        }
    };

    game.init();

    // Exposed for debugging and for the automated playthrough tests.
    window.superAlvaGalaxy = {
        game,
        renderer,
        art,
        sound,
        fx,
        store,
        sim: { createRun, startGalaxy, stepRun, setRunView, buildLevel, simulateJumpPath, getGalaxyDef, GALAXIES, CHUNKS, PHYS, SCORE, VIEW }
    };
})();
