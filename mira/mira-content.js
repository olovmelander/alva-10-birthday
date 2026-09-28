/*
 * MIRAS STJÄRNSAFARI – content
 * ---------------------------------------------------------------------
 * Everything Mira reads and meets: animals (with Swedish names and fun
 * facts), fish, the seven islands, the story and the tools.
 */
(function () {
    'use strict';

    const MS = window.MiraSafari;

    // =====================================================================
    // Photo moments – what an animal is doing when Mira takes the photo
    // =====================================================================
    const MOMENTS = {
        plain: { label: 'Ett fint kort', stars: 0 },
        look: { label: 'Tittar på dig', stars: 1, icon: '👀' },
        eat: { label: 'Äter', stars: 1, icon: '🍎' },
        dance: { label: 'Dansar', stars: 1, icon: '🎵' },
        play: { label: 'Leker med bubblor', stars: 1, icon: '🫧' },
        sleep: { label: 'Sover', stars: 1, icon: '💤' },
        family: { label: 'Med familjen', stars: 1, icon: '💛' },
        special: { label: 'Något speciellt', stars: 2, icon: '⭐' }
    };

    // =====================================================================
    // Animals
    // =====================================================================
    // kind:   ground | hopper | swimmer | flyer | percher | hanger | floater | whale
    // anims:  which sprite animations to use (missing ones fall back to idle)
    // special: { label, chance (per idle pause), trigger, time }
    //   trigger: 'random' (does it by itself now and then), 'music', 'apple',
    //            'bubbles', 'event' (a scripted moment)
    // likes:  what it reacts to (apple, music, bubbles)
    const A = (id, o) => ({
        id,
        sprite: `a-${id}`,
        kind: 'ground',
        speed: 16,
        range: 50,
        likes: { apple: true, music: true, bubbles: true },
        anims: {},
        ...o
    });

    const SPECIES = [
        // --- Blomsterängen -----------------------------------------------
        A('rabbit', { name: 'Kanin', island: 0, kind: 'hopper', speed: 26, range: 70, anims: { move: 'hop' }, special: { label: 'Står på bakbenen', chance: 0.35, time: 1.8, loop: true, frame: 0.3 }, fact: 'Kaniner kan hoppa nästan en meter högt!', voice: 'squeak' }),
        A('sheep', { name: 'Får', island: 0, speed: 10, range: 40, special: { label: 'Skuttar av glädje', chance: 0.25, time: 1.1, seq: [0, 1, 2, 1, 0], frame: 0.16 }, fact: 'Av fårens ull blir det mjuka tröjor och vantar.', voice: 'baa', grazer: true }),
        A('lamb', { name: 'Lamm', island: 0, speed: 14, range: 40, special: { label: 'Skuttar', chance: 0.35, time: 1.2, loop: true, frame: 0.2 }, fact: 'Lammen skuttar och leker med varandra.', voice: 'baaSmall', family: 'sheep' }),
        A('cow', { name: 'Ko', island: 0, speed: 8, range: 40, special: { label: 'Säger muu', chance: 0.3, time: 1.8, frame: 0.45 }, fact: 'Kon idisslar – den tuggar maten två gånger!', voice: 'moo', grazer: true }),
        A('horse', { name: 'Häst', island: 0, speed: 20, range: 90, special: { label: 'Stegrar sig', chance: 0.2, time: 1.6, seq: [0, 1, 2, 1, 2, 0], frame: 0.24 }, fact: 'Hästar kan sova stående!', voice: 'neigh', grazer: true }),
        A('duck', { name: 'Anka', island: 0, kind: 'swimmer', speed: 10, range: 50, anims: { move: 'swim', idle: 'swim' }, special: { label: 'Dyker', chance: 0.3, time: 2, loop: true, frame: 0.25 }, fact: 'Ankans fjädrar är vattentäta – den blir aldrig blöt på riktigt.', voice: 'quack' }),
        A('duckling', { name: 'Ankunge', island: 0, kind: 'swimmer', speed: 10, range: 50, anims: { move: 'swim', idle: 'swim' }, fact: 'Ankungar simmar efter sin mamma på en lång rad.', voice: 'peep', family: 'duck', follows: 'duck' }),
        A('butterfly-pink', { lands: true, name: 'Rosa fjäril', island: 0, kind: 'flyer', speed: 14, range: 60, anims: { move: 'fly', idle: 'fly' }, special: { label: 'Vilar på en blomma', chance: 0.4, time: 2.6, seq: [0, 0, 1, 1, 0], frame: 0.5 }, fact: 'Fjärilar smakar med fötterna!', voice: 'flutter' }),
        A('butterfly-blue', { lands: true, name: 'Blå fjäril', island: 0, kind: 'flyer', speed: 14, range: 60, anims: { move: 'fly', idle: 'fly' }, special: { label: 'Vilar på en blomma', chance: 0.4, time: 2.6, seq: [0, 0, 1, 1, 0], frame: 0.5 }, fact: 'Fjärilen dricker nektar med en lång tunga som en sugrör.', voice: 'flutter' }),
        A('butterfly-yellow', { lands: true, name: 'Gul fjäril', island: 0, kind: 'flyer', speed: 14, range: 60, anims: { move: 'fly', idle: 'fly' }, special: { label: 'Vilar på en blomma', chance: 0.4, time: 2.6, seq: [0, 0, 1, 1, 0], frame: 0.5 }, fact: 'Fjärilen var först en larv som åt massor av blad.', voice: 'flutter' }),
        A('hedgehog', { name: 'Igelkott', island: 0, speed: 8, range: 30, sleeper: true, special: { label: 'Vaknar och vinkar', trigger: 'music', time: 2.6, loop: true, frame: 0.3 }, fact: 'Igelkotten har ungefär 5 000 taggar!', voice: 'snuffle', secret: 'Spela musik för den sovande igelkotten.' }),
        A('cat', { name: 'Katt', island: 0, speed: 12, range: 20, special: { label: 'Sträcker på sig', chance: 0.25, time: 1.8, seq: [0, 1, 1, 0], frame: 0.45 }, fact: 'Katter sover nästan 16 timmar om dagen.', voice: 'meow' }),

        // --- Trollskogen --------------------------------------------------
        A('squirrel', { name: 'Ekorre', island: 1, kind: 'hopper', speed: 30, range: 70, grazer: true, anims: { move: 'hop' }, idleActs: [{ anim: 'special', chance: 0.2, time: 1.6, loop: true, voice: true }], special: { label: 'Klättrar i tallen', chance: 0.45, time: 9, climb: true }, fact: 'Ekorren gömmer nötter – och glömmer ibland var!', voice: 'chitter' }),
        A('deer', { name: 'Rådjur', island: 1, speed: 16, range: 70, special: { label: 'Tar ett skutt', chance: 0.25, time: 1.5, seq: [0, 0, 1, 2, 2, 0], frame: 0.22, move: 38, moveFrames: [2] }, fact: 'Rådjurets vita rumpa kallas för spegel.', voice: 'soft', grazer: true }),
        A('fawn', { name: 'Rådjurskid', island: 1, speed: 16, range: 50, special: { label: 'Skuttar', chance: 0.3, time: 1.2, loop: true, frame: 0.2 }, fact: 'Kiden har vita prickar som gömmer dem i skogen.', voice: 'soft', family: 'deer', follows: 'deer' }),
        A('fox', { name: 'Räv', island: 1, speed: 22, range: 60, hidden: 'apple', special: { label: 'Musar!', chance: 0.3, time: 1.3, frame: 0.25, move: 44, moveFrames: [1] }, fact: 'Räven kan höra en mus som gömmer sig under snön!', voice: 'yip', secret: 'Kasta ett äpple nära buskarna.' }),
        A('owl', { name: 'Uggla', island: 1, kind: 'percher', speed: 0, range: 0, sleeper: true, likes: { apple: false, music: true, bubbles: true }, special: { label: 'Säger hoo-hoo', trigger: 'music', time: 2.4, loop: true, frame: 0.35 }, fact: 'Ugglan kan vrida huvudet nästan ett helt varv.', voice: 'hoot', secret: 'Spela musik för ugglan som sover i trädet.' }),
        A('bear', { name: 'Björn', island: 1, speed: 10, range: 50, grazer: true, special: { label: 'Står upp och vinkar', chance: 0.3, time: 2.4, loop: true, loopFrom: 1, frame: 0.3 }, fact: 'Björnen sover hela vintern i sitt ide.', voice: 'growl' }),
        A('moose', { name: 'Älg', island: 1, speed: 9, range: 40, special: { label: 'Skogens konung ropar', chance: 0.3, time: 1.8, frame: 0.4 }, fact: 'Älgen är skogens konung och Sveriges största djur på land.', voice: 'bellow', grazer: true }),
        A('woodpecker', { name: 'Hackspett', island: 1, kind: 'percher', speed: 0, range: 0, likes: { apple: false, music: true, bubbles: true }, special: { label: 'Hackar i trädet', chance: 0.6, time: 1.6, loop: true, frame: 0.1, chips: 1 }, fact: 'Hackspetten hackar tusentals gånger om dagen – utan att få huvudvärk!', voice: 'peck' }),
        A('lynx', { name: 'Lodjur', island: 1, speed: 14, range: 20, special: { label: 'Tvättar tassen', chance: 0.35, time: 1.8, loop: true, frame: 0.3 }, fact: 'Lodjuret är Sveriges enda vilda kattdjur. Titta på tofsarna på öronen!', voice: 'purr' }),

        // --- Glittersjön ---------------------------------------------------
        A('swan', { name: 'Svan', island: 2, kind: 'swimmer', speed: 9, range: 60, grazer: true, anims: { move: 'swim', idle: 'idle' }, special: { label: 'Breder ut vingarna', chance: 0.3, time: 1.8, loop: true, frame: 0.2 }, fact: 'Svanar håller ihop med samma partner hela livet.', voice: 'honk' }),
        A('cygnet', { name: 'Svanunge', island: 2, kind: 'swimmer', speed: 9, range: 60, anims: { move: 'swim', idle: 'idle' }, fact: 'Svanungar är grå och fluffiga när de är små.', voice: 'peep', family: 'swan', follows: 'swan' }),
        A('frog', { name: 'Groda', island: 2, kind: 'hopper', speed: 20, range: 30, anims: { move: 'hop' }, hop: { air: 1, dist: 9, arc: 0 }, frameTimes: { hop: [0.12, 0.14, 0.3] }, idleActs: [{ anim: 'eat', chance: 0.3, time: 1.2, loop: true, voice: true }], special: { label: 'Fångar en fluga', chance: 0.4, time: 1.3, frame: 0.4 }, fact: 'Grodan fångar flugor med sin långa, klibbiga tunga.', voice: 'croak' }),
        A('beaver', { name: 'Bäver', island: 2, speed: 10, range: 60, amphibious: true, grazer: true, special: { label: 'Plaskar med svansen', chance: 0.45, time: 1.4, frame: 0.35, water: true, splash: 1, splashAt: -8 }, fact: 'Bävern bygger dammar av pinnar och lera.', voice: 'chitter' }),
        A('otter', { name: 'Utter', island: 2, kind: 'swimmer', speed: 8, range: 50, grazer: true, anims: { move: 'swim', idle: 'idle' }, idleActs: [{ anim: 'dive', chance: 0.22, time: 0.8, dive: true }], special: { label: 'Jonglerar med en sten', chance: 0.4, time: 1.8, loop: true, frame: 0.3 }, fact: 'Uttrar håller varandra i tassarna när de sover i vattnet.', voice: 'squeak' }),
        A('heron', { name: 'Häger', island: 2, speed: 6, range: 30, special: { label: 'Fångar en fisk', chance: 0.35, time: 1.5, frame: 0.35, splash: 1, splashAt: 9, then: 'eat' }, fact: 'Hägern står alldeles stilla och väntar på fisk.', voice: 'croakBird' }),
        A('dragonfly', { name: 'Trollslända', island: 2, kind: 'flyer', speed: 30, range: 80, anims: { move: 'fly', idle: 'idle' }, fact: 'Trollsländor kan flyga baklänges!', voice: 'buzz' }),

        // --- Savannen --------------------------------------------------------
        A('giraffe', { name: 'Giraff', island: 3, speed: 9, range: 50, special: { label: 'Slickar på fönstret!', trigger: 'event', time: 2.4, frame: 0.7 }, fact: 'Giraffens tunga är blålila och en halv meter lång!', voice: 'soft', tall: true }),
        A('zebra', { name: 'Zebra', island: 3, speed: 16, range: 70, special: { label: 'Galopperar', chance: 0.25, time: 1.6, move: 44, loop: true, frame: 0.1 }, fact: 'Varje zebra har sitt alldeles egna randmönster.', voice: 'neigh', grazer: true }),
        A('elephant', { name: 'Elefant', island: 3, speed: 8, range: 40, special: { label: 'Sprutar vatten', chance: 0.3, time: 2.2, frame: 0.45 }, fact: 'Elefanten kan duscha sig med vatten från snabeln.', voice: 'trumpet' }),
        A('elephantcalf', { name: 'Elefantunge', island: 3, speed: 8, range: 40, special: { label: 'Viftar med snabeln', chance: 0.4, time: 1.4, loop: true, frame: 0.25 }, fact: 'Elefantungar håller i mammas svans med sin lilla snabel.', voice: 'trumpetSmall', family: 'elephant', follows: 'elephant' }),
        A('lion', { name: 'Lejon', island: 3, speed: 8, range: 20, sleeper: true, special: { label: 'Gäspar stort', trigger: 'music', time: 2.4, frame: 0.55 }, fact: 'Lejonets rytande hörs flera kilometer bort.', voice: 'roar', secret: 'Spela musik för det sovande lejonet.' }),
        A('lioness', { name: 'Lejoninna', island: 3, speed: 12, range: 20, special: { label: 'Spinner', chance: 0.3, time: 2, loop: true, frame: 0.4 }, fact: 'Lejoninnorna tar hand om ungarna tillsammans.', voice: 'purr' }),
        A('lioncub', { name: 'Lejonunge', island: 3, speed: 18, range: 30, special: { label: 'Busar', chance: 0.45, time: 1, move: 30, frame: 0.3 }, fact: 'Lejonungar leker brottning med varandra.', voice: 'mew', family: 'lioness', follows: 'lioness' }),
        A('hippo', { name: 'Flodhäst', island: 3, kind: 'swimmer', speed: 5, range: 30, anims: { move: 'swim', idle: 'swim' }, special: { label: 'Gäspar jättestort', chance: 0.35, time: 2.4, frame: 0.6 }, fact: 'Flodhästen kan hålla andan i fem minuter under vattnet.', voice: 'grunt' }),
        A('rhino', { name: 'Noshörning', island: 3, speed: 9, range: 40, special: { label: 'Frustar', chance: 0.3, time: 1.4, loop: true, frame: 0.3 }, fact: 'Noshörningens horn är gjort av samma sak som dina naglar!', voice: 'grunt', grazer: true }),
        A('meerkat', { name: 'Surikat', island: 3, speed: 14, range: 20, idleActs: [{ anim: 'dig', chance: 0.2, time: 1.4 }], special: { label: 'Tittar upp ur hålet', chance: 0.5, time: 2, frame: 0.35 }, fact: 'Surikaterna turas om att hålla vakt.', voice: 'chirp' }),
        A('flamingo', { name: 'Flamingo', island: 3, speed: 7, range: 30, special: { label: 'Flaxar med vingarna', chance: 0.3, time: 1.6, loop: true, frame: 0.2 }, fact: 'Flamingon blir rosa av maten den äter.', voice: 'honk' }),

        // --- Djungeln ----------------------------------------------------------
        A('monkey', { name: 'Apa', island: 4, speed: 24, range: 60, grazer: true, swingLabel: 'Svingar i lianen', idleActs: [{ anim: 'laugh', chance: 0.25, time: 1.4, loop: true, voice: true }], special: { label: 'Snor Miras hatt!', trigger: 'event', time: 2, loop: true, frame: 0.15 }, fact: 'Apor älskar bananer – och att busa!', voice: 'ooh' }),
        A('parrot', { name: 'Papegoja', island: 4, kind: 'percher', speed: 0, range: 0, grazer: true, special: { label: 'Dansar och härmar', trigger: 'music', time: 2.4, loop: true, frame: 0.2 }, fact: 'Papegojor kan härma ljud och ord.', voice: 'squawk' }),
        A('toucan', { name: 'Tukan', island: 4, kind: 'percher', speed: 0, range: 0, grazer: true, special: { label: 'Kastar ett bär', chance: 0.4, time: 1.4, frame: 0.45 }, fact: 'Tukanens stora näbb är lätt som en fjäder.', voice: 'squawk' }),
        A('sloth', { name: 'Sengångare', island: 4, kind: 'hanger', speed: 0, range: 0, naps: true, grazer: true, special: { label: 'Vinkar jättelångsamt', chance: 0.35, time: 3.2, loop: true, frame: 0.8 }, fact: 'Sengångaren är så långsam att det växer alger i pälsen.', voice: 'sigh' }),
        A('chameleon', { name: 'Kameleont', island: 4, kind: 'percher', speed: 0, range: 0, grazer: true, hidden: 'bubbles', found: 'a-chameleon-pink', special: { label: 'Skjuter ut tungan', chance: 0.4, time: 1.2, frame: 0.3 }, fact: 'Kameleonten kan byta färg!', voice: 'click', secret: 'Blås bubblor på grenen – någon gömmer sig där.' }),
        A('morpho', { lands: true, name: 'Morfofjäril', island: 4, kind: 'flyer', speed: 16, range: 70, anims: { move: 'fly', idle: 'fly', special: 'idle' }, special: { label: 'Vilar på ett blad', chance: 0.35, time: 2.6 }, fact: 'Morfofjärilens vingar glittrar blått i solen.', voice: 'flutter' }),
        A('dartfrog', { name: 'Pilgiftsgroda', island: 4, kind: 'hopper', speed: 16, range: 24, anims: { move: 'hop' }, hop: { air: 1, dist: 7, arc: 5 }, frameTimes: { hop: [0.12, 0.14, 0.34] }, variants: ['a-dartfrog', 'a-dartfrog-red'], fact: 'De små grodorna är knallfärgade för att varna andra djur.', voice: 'croakSmall' }),
        A('tiger', { name: 'Tiger', island: 4, speed: 12, range: 20, idleActs: [{ anim: 'lie', chance: 0.2, time: 3.5 }], special: { label: 'Gäspar', chance: 0.3, time: 1.8, seq: [0, 1, 1, 0], frame: 0.45 }, fact: 'Tigern är världens största kattdjur.', voice: 'purr' }),

        // --- Norrskensisen -------------------------------------------------
        A('polarbear', { name: 'Isbjörn', island: 5, speed: 10, range: 50, idleActs: [{ anim: 'stand', chance: 0.25, time: 2.2 }], special: { label: 'Rullar på rygg', chance: 0.3, time: 2.6, loop: true, loopFrom: 1, frame: 0.35 }, fact: 'Isbjörnens päls är egentligen genomskinlig!', voice: 'growl' }),
        A('polarcub', { name: 'Isbjörnsunge', island: 5, speed: 14, range: 40, special: { label: 'Åker kana på magen', chance: 0.4, time: 1.6, loop: true, move: 34, frame: 0.2 }, fact: 'Isbjörnsungar föds i en grotta av snö.', voice: 'mew', family: 'polarbear', follows: 'polarbear' }),
        A('penguin', { name: 'Pingvin', island: 5, speed: 10, range: 40, anims: { dance: 'flap' }, special: { label: 'Åker kana på magen', chance: 0.35, time: 1.6, loop: true, move: 30, frame: 0.2 }, fact: 'Pingviner kan inte flyga – men de simmar jättesnabbt.', voice: 'squawkSmall' }),
        A('seal', { name: 'Säl', island: 5, speed: 6, range: 20, special: { label: 'Klappar med fenorna', chance: 0.35, time: 1.6, loop: true, frame: 0.25 }, fact: 'Sälar kan sova i vattnet.', voice: 'bark' }),
        A('arcticfox', { name: 'Fjällräv', island: 5, speed: 20, range: 50, special: { label: 'Dyker ner i snön', chance: 0.3, time: 2.2, frame: 0.3 }, fact: 'Fjällräven är vit på vintern och brun på sommaren. Precis som på Miras hatt!', voice: 'yip' }),
        A('reindeer', { name: 'Ren', island: 5, speed: 12, range: 50, special: { label: 'Hornen glittrar', chance: 0.3, time: 1.6, loop: true, frame: 0.25 }, fact: 'Renens horn växer ut på nytt varje år.', voice: 'grunt', grazer: true }),
        A('snowyowl', { name: 'Snöuggla', island: 5, kind: 'percher', speed: 0, range: 0, special: { label: 'Sträcker på vingen', chance: 0.35, time: 1.6, loop: true, frame: 0.4 }, fact: 'Snöugglan har fjädrar ända ut på tårna.', voice: 'hoot' }),
        A('walrus', { name: 'Valross', island: 5, speed: 4, range: 16, special: { label: 'Magplask!', chance: 0.35, time: 1.6, loop: true, frame: 0.35 }, fact: 'Valrossen använder betarna för att dra sig upp på isen.', voice: 'grunt' }),
        A('whale', { name: 'Knölval', island: 5, kind: 'whale', speed: 0, range: 0, likes: { apple: false, music: true, bubbles: false }, anims: { idle: 'idle', move: 'swim', special: 'breach' }, idleActs: [{ anim: 'spout', chance: 0.5, time: 1.5 }], special: { label: 'Hoppar ur vattnet!', trigger: 'event', time: 2.6 }, fact: 'Knölvalen sjunger långa sånger under vattnet.', voice: 'whale' }),

        // --- Stjärnön ------------------------------------------------------
        A('starwhale', { name: 'Stjärnval', island: 6, kind: 'floater', speed: 10, range: 0, likes: { apple: false, music: true, bubbles: true }, anims: { move: 'swim', idle: 'swim' }, special: { label: 'Sjunger en vaggvisa', trigger: 'music', time: 2.4 }, fact: 'Stjärnvalen simmar mellan stjärnorna och sjunger vaggvisor.', voice: 'whale' }),
        A('luma-yellow', { name: 'Gul Luma', island: 6, kind: 'floater', speed: 8, range: 30, anims: { move: 'float', idle: 'float' }, special: { label: 'Snurrar', chance: 0.4, time: 1.2 }, fact: 'Lumas är små stjärnor som älskar att snurra.', voice: 'twinkle' }),
        A('luma-blue', { name: 'Blå Luma', island: 6, kind: 'floater', speed: 8, range: 30, anims: { move: 'float', idle: 'float' }, special: { label: 'Snurrar', chance: 0.4, time: 1.2 }, fact: 'Lumas samlar stjärnstoft i hela rymden.', voice: 'twinkle' }),
        A('luma-pink', { name: 'Rosa Luma', island: 6, kind: 'floater', speed: 8, range: 30, anims: { move: 'float', idle: 'float' }, special: { label: 'Snurrar', chance: 0.4, time: 1.2 }, fact: 'En Luma kan växa upp och bli en helt ny stjärna.', voice: 'twinkle' }),
        A('luma-orange', { name: 'Orange Luma', island: 6, kind: 'floater', speed: 8, range: 30, anims: { move: 'float', idle: 'float' }, special: { label: 'Snurrar', chance: 0.4, time: 1.2 }, fact: 'Lumas lyser upp natten för dem som är vilse.', voice: 'twinkle' }),
        A('firefly', { name: 'Eldfluga', island: 6, kind: 'flyer', speed: 12, range: 50, anims: { move: 'fly', idle: 'fly' }, likes: { apple: false, music: true, bubbles: false }, fact: 'Eldflugor lyser för att hitta sina vänner i mörkret.', voice: 'twinkle' }),
        A('stardeer', { name: 'Stjärnhjort', island: 6, speed: 12, range: 50, special: { label: 'Språngar i stjärnglitter', chance: 0.3, time: 1.6 }, fact: 'Stjärnhjortens horn lyser som kristaller.', voice: 'soft', grazer: true }),
        A('moonrabbit', { name: 'Månkanin', island: 6, kind: 'hopper', speed: 22, range: 50, anims: { move: 'hop' }, special: { label: 'Tittar på månen', chance: 0.4, time: 2 }, fact: 'Månkaninen hoppar allra högst när det är fullmåne.', voice: 'squeak' }),
        A('startiger', { name: 'Mamma Stjärntiger', island: 6, speed: 10, range: 0, special: { label: 'Lyser som norrsken', trigger: 'event', time: 2 }, fact: 'Mamma Stjärntigers ränder lyser som norrsken. Hon är Novas mamma!', voice: 'purr', story: true }),
        A('startigerdad', { sprite: 'a-startiger-dad', name: 'Pappa Stjärntiger', island: 6, speed: 10, range: 0, special: { label: 'Lyser som soluppgången', trigger: 'event', time: 2 }, fact: 'Pappa Stjärntigers ränder lyser som guld när solen går upp. Han är Novas pappa!', voice: 'purrDeep', story: true }),

        // --- Nova herself (tap her in the gondola!) ------------------------------
        { id: 'nova', sprite: 'nova', name: 'Nova', island: -1, kind: 'friend', anims: {}, likes: {}, fact: 'Nova är en liten stjärntiger som ramlade ner från himlen. Miras bästa vän!', voice: 'meow', special: { label: 'Är glad' } }
    ];

    const SPECIES_BY_ID = {};
    SPECIES.forEach((s) => { SPECIES_BY_ID[s.id] = s; });

    // Which photo moments an animal can actually give (the album lists these).
    function momentsFor(sp, has) {
        if (sp.id === 'nova') return ['special'];
        const list = [];
        const ground = ['ground', 'hopper'].includes(sp.kind);
        if (has(sp.sprite, 'look')) list.push('look');
        if ((sp.likes.apple !== false && ground) || sp.grazer) list.push('eat');
        if (sp.likes.music !== false) list.push('dance');
        if (sp.likes.bubbles !== false && sp.kind !== 'whale') list.push('play');
        if (sp.sleeper || sp.naps) list.push('sleep');
        const group = sp.story || SPECIES.some((o) => o.follows === sp.id || o.family === sp.id) || sp.follows ||
            ISLANDS.some((isl) => isl.animals.some((g) => g.sp === sp.id && (g.n || 1) > 1));
        if (group) list.push('family');
        if (sp.special) list.push('special');
        return list;
    }

    // =====================================================================
    // Fish (the fishing stops)
    // =====================================================================
    const FISH = [
        { id: 'perch', sprite: 'f-perch', name: 'Abborre', where: 'lake', weight: 34, size: [14, 32], fight: 1, fact: 'Abborren har randig kropp och taggig ryggfena. Mira har fångat en på riktigt!' },
        { id: 'roach', sprite: 'f-roach', name: 'Mört', where: 'lake', weight: 26, size: [10, 25], fight: 0.6, fact: 'Mörten har röda ögon.' },
        { id: 'bream', sprite: 'f-bream', name: 'Braxen', where: 'lake', weight: 14, size: [25, 50], fight: 1.2, fact: 'Braxen är hög och platt som en tallrik.' },
        { id: 'zander', sprite: 'f-zander', name: 'Gös', where: 'lake', weight: 9, size: [30, 70], fight: 1.5, fact: 'Gösen ser bra i mörkt vatten.' },
        { id: 'pike', sprite: 'f-pike', name: 'Gädda', where: 'lake', weight: 7, size: [40, 100], fight: 2, fact: 'Gäddan är sjöns största rovfisk.' },
        { id: 'goldfish', sprite: 'f-goldfish', name: 'Guldfisk', where: 'lake', weight: 3, size: [12, 20], fight: 1.4, fact: 'En magisk guldfisk som glittrar som en stjärna!', rare: true },
        { id: 'boot', sprite: 'f-boot', name: 'Gammal stövel', where: 'lake', weight: 4, size: [0, 0], fight: 0.4, fact: 'Någon har tappat sin stövel! Hihi.', junk: true },
        { id: 'bottle', sprite: 'f-bottle', name: 'Flaskpost', where: 'lake', weight: 3, size: [0, 0], fight: 0.4, fact: 'Ett brev i en flaska! Det står: "Följ stjärnorna hem."', junk: true },
        { id: 'char', sprite: 'f-char', name: 'Röding', where: 'ice', weight: 30, size: [20, 45], fight: 1, fact: 'Rödingen trivs i kallt och klart vatten.' },
        { id: 'cod', sprite: 'f-cod', name: 'Torsk', where: 'ice', weight: 26, size: [30, 70], fight: 1.2, fact: 'Torsken har ett litet skägg på hakan.' },
        { id: 'salmon', sprite: 'f-salmon', name: 'Lax', where: 'ice', weight: 16, size: [40, 90], fight: 1.8, fact: 'Laxen kan hoppa uppför forsar!' },
        { id: 'crab', sprite: 'f-crab', name: 'Krabba', where: 'ice', weight: 12, size: [8, 16], fight: 0.6, fact: 'Krabban går sidledes!' },
        { id: 'starfish', sprite: 'f-starfish', name: 'Sjöstjärna', where: 'ice', weight: 10, size: [8, 20], fight: 0.4, fact: 'Sjöstjärnan har fem armar.' },
        { id: 'aurorafish', sprite: 'f-aurorafish', name: 'Norrskensfisk', where: 'ice', weight: 4, size: [15, 25], fight: 1.5, fact: 'En magisk fisk som lyser i norrskenets alla färger!', rare: true }
    ];
    const FISH_BY_ID = {};
    FISH.forEach((f) => { FISH_BY_ID[f.id] = f; });

    // =====================================================================
    // Tools
    // =====================================================================
    const TOOLS = {
        camera: { name: 'Kamera', icon: '📷', key: '1' },
        apple: { name: 'Äpplen', icon: '🍎', key: '2', hint: 'Tryck på 🍎 och sedan där äpplet ska landa. Djuren kommer och äter!' },
        flute: { name: 'Flöjt', icon: '🎵', key: '3', hint: 'Tryck på 🎵 så spelar Mira flöjt. Djuren dansar – och den som sover vaknar!' },
        bubbles: { name: 'Såpbubblor', icon: '🫧', key: '4', hint: 'Tryck på 🫧 så blåser Mira bubblor. Djuren vill leka med dem!' }
    };

    const OUTFITS = {
        // hat: what the jungle monkey snatches ('the …' and 'my …' in Swedish)
        c: { name: 'Sommarkväll', desc: 'Solglasögon och rosa blomklänning', hat: ['solglasögonen', 'Mina solglasögon'] },
        a: { name: 'Fisketuren', desc: 'Grön fiskehatt, blå klänning och gröna stövlar', hat: ['hatten', 'Min hatt'] },
        b: { name: 'Gondoldagen', desc: 'Röd keps och vit fjärilsklänning', hat: ['kepsen', 'Min keps'] }
    };

    // =====================================================================
    // Islands
    // =====================================================================
    // Layout units are world pixels. islets: floating islands along the
    // ride; ponds are relative to their islet. animals: spawn groups.
    // props: { s: sprite, x } (x in world pixels), or auto rules.
    const ISLANDS = [
        {
            id: 'meadow',
            name: 'Blomsterängen',
            tagline: 'En äng full av blommor i morgonsolen',
            terrain: 'meadow',
            music: 'meadow',
            ambience: 'birds',
            weather: 'petals',
            light: 'rays',
            speed: 22,
            sky: {
                gradient: ['#312c7c', '#5d56b6', '#b88ad6', '#f5b8d2', '#ffe2c4'],
                stars: 0.35,
                sun: { x: 0.16, y: 0.72, r: 9, color: '#fff3d0', glow: 44, glowColor: '#ffe7b8' },
                clouds: { count: 7, y: [0.12, 0.55], colors: ['#ffffff', '#ffe4f2', '#f3c2de'], alpha: 0.95 },
                planets: [{ x: 0.82, y: 0.08, r: 7, color: '#9fd4ff', bands: 3, par: 0.04 }]
            },
            islets: [
                { x: 0, w: 640, pond: null, falls: 'left' },
                { x: 760, w: 700, pond: { at: 250, w: 150, depth: 10 } },
                { x: 1580, w: 700, falls: 'right' }
            ],
            props: [
                { s: 'p-cottage', x: 150 }, { s: 'p-fence', x: 225 }, { s: 'p-fence', x: 245 }, { s: 'p-haybale', x: 300 },
                { s: 'p-oak', x: 420 }, { s: 'p-birch', x: 560 }, { s: 'p-appletree', x: 880 }, { s: 'p-oak2', x: 1260 },
                { s: 'p-birch', x: 1380 }, { s: 'p-oak', x: 1780 }, { s: 'p-appletree', x: 2010 }, { s: 'p-sign', x: 2150 },
                { s: 'p-fence', x: 2180 }, { s: 'p-fence', x: 2200 }, { s: 'p-fencepost', x: 2220 },
                { auto: ['p-flower-daisy', 'p-flower-poppy', 'p-flower-cornflower', 'p-flower-buttercup'], every: 26 },
                { auto: ['p-grass', 'p-grass2'], every: 34 },
                { auto: ['p-bush', 'p-bush2', 'p-rock', 'p-rock2'], every: 120 }
            ],
            animals: [
                { sp: 'sheep', x: 360, n: 2, spread: 60 }, { sp: 'lamb', x: 400, n: 1 },
                { sp: 'rabbit', x: 520, n: 2, spread: 50 },
                { sp: 'butterfly-pink', x: 600, n: 2, air: [-60, -14] },
                { sp: 'duck', x: 1080, pond: true }, { sp: 'duckling', x: 1060, pond: true, n: 3 },
                { sp: 'cow', x: 880, n: 1 }, { sp: 'horse', x: 1300, n: 1, range: 110 },
                { sp: 'butterfly-blue', x: 1150, n: 2, air: [-70, -18] },
                { sp: 'hedgehog', x: 1700 }, { sp: 'rabbit', x: 1880, n: 1 },
                { sp: 'butterfly-yellow', x: 1920, n: 3, air: [-60, -14] },
                { sp: 'cow', x: 2000, n: 1 }
            ],
            mamma: {
                animal: 'cat', x: 2200, perch: 'fence',
                lines: [
                    ['nova', 'Är du min mamma?'],
                    ['cat', 'Mjau! Nej, lilla vän. Jag är bara en vanlig bondgårdskatt.'],
                    ['cat', 'Men i natt såg jag två stjärnljus flyga mot Trollskogen!'],
                    ['nova', 'Två? Det kanske var mamma och pappa som letade efter mig!'],
                    ['mira', 'Då åker vi dit, Nova!']
                ]
            },
            intro: [
                ['nova', 'Mjau! Titta, en äng full av blommor!'],
                ['mira', 'Jag tar kort på alla djur vi ser. Då kan vi fråga dem om din mamma och pappa!']
            ],
            remarks: [
                { at: 930, lines: [['nova', 'Ankungarna simmar efter sin mamma...'], ['mira', 'Snart hittar vi din mamma och pappa också, Nova. Det lovar jag.']] }
            ],
            reward: { tool: 'apple', text: 'Mira plockade en hel korg med äpplen på ängen!' }
        },
        {
            id: 'forest',
            name: 'Trollskogen',
            tagline: 'En mossig skog där solen letar sig in',
            terrain: 'forest',
            music: 'forest',
            ambience: 'forest',
            weather: 'leaves',
            light: 'rays',
            speed: 22,
            sky: {
                gradient: ['#1f2e5e', '#3b5f96', '#8fb0c8', '#f2c77e', '#ffe2a6'],
                stars: 0.25,
                sun: { x: 0.8, y: 0.66, r: 10, color: '#fff0c0', glow: 50, glowColor: '#ffd98a' },
                clouds: { count: 5, y: [0.1, 0.45], colors: ['#fff6e0', '#f8d9b0', '#dcb28c'], alpha: 0.9 },
                planets: [{ x: 0.2, y: 0.1, r: 6, color: '#ffb38a', par: 0.04 }]
            },
            islets: [
                { x: 0, w: 820, falls: 'left' },
                { x: 930, w: 760, pond: { at: 520, w: 90, depth: 8 } },
                { x: 1810, w: 760, falls: 'right' }
            ],
            props: [
                { s: 'p-spruce', x: 70 }, { s: 'p-pine', x: 170 }, { s: 'p-bigtree', x: 330 }, { s: 'p-spruce2', x: 470 },
                { s: 'p-troll', x: 560 }, { s: 'p-spruce', x: 690 }, { s: 'p-pine', x: 780 },
                { s: 'p-spruce2', x: 990 }, { s: 'p-bigtree', x: 1120 }, { s: 'p-pine', x: 1300 }, { s: 'p-spruce', x: 1560 },
                { s: 'p-pine', x: 1900 }, { s: 'p-spruce', x: 2080 }, { s: 'p-spruce2', x: 2290 }, { s: 'p-pine', x: 2450 },
                { s: 'p-log', x: 640 }, { s: 'p-stump', x: 1210 }, { s: 'p-anthill', x: 2000 },
                { s: 'p-blueberry', x: 260, lane: 2 }, { s: 'p-blueberry', x: 1720 },
                { auto: ['p-flyagaric', 'p-flyagaric2', 'p-chanterelle', 'p-fern', 'p-fern2', 'p-lingon'], every: 36 },
                { auto: ['p-mossrock', 'p-mossrock2', 'p-fern'], every: 140 }
            ],
            animals: [
                { sp: 'squirrel', x: 220, n: 1 }, { sp: 'fox', x: 262, hidden: true }, { sp: 'owl', x: 330, perch: 'sill' },
                { sp: 'deer', x: 600, n: 1 }, { sp: 'fawn', x: 630, n: 1 },
                { sp: 'bear', x: 1040, n: 1 }, { sp: 'woodpecker', x: 1300, perch: 'trunk' },
                { sp: 'squirrel', x: 1350, n: 1 }, { sp: 'moose', x: 1990, n: 1 }, { sp: 'fox', x: 2200, n: 1 }
            ],
            mamma: {
                animal: 'lynx', x: 2480,
                lines: [
                    ['nova', 'Är du min pappa?'],
                    ['lynx', 'Nej, jag är ett lodjur. Ser du tofsarna på mina öron?'],
                    ['lynx', 'Men svanarna vid Glittersjön ser allt som händer på himlen. Fråga dem!'],
                    ['mira', 'Kom, Nova. Vi åker till sjön!']
                ]
            },
            intro: [
                ['nova', 'Oj, vad stora träd...'],
                ['mira', 'Här luktar det mossa och svamp.']
            ],
            remarks: [
                { at: 430, lines: [['mira', 'Titta, en sten som ser ut som ett troll!'], ['nova', 'Sch! Tänk om han vaknar...']] }
            ],
            reward: { tool: 'fishing', outfit: 'a', wear: true, text: 'Mira fick ett fiskespö, en grön fiskehatt och gröna stövlar – nu kan hon fiska!' }
        },
        {
            id: 'lake',
            name: 'Glittersjön',
            tagline: 'En glittrande sjö i solnedgången',
            terrain: 'lake',
            music: 'lake',
            ambience: 'water',
            weather: 'sparkles',
            light: 'sunset',
            speed: 21,
            sky: {
                gradient: ['#261a58', '#6a3288', '#d05a86', '#ff9a6e', '#ffd08a'],
                stars: 0.4,
                sun: { x: 0.5, y: 0.8, r: 16, color: '#ffe0a0', glow: 60, glowColor: '#ffb070' },
                clouds: { count: 6, y: [0.15, 0.5], colors: ['#ffd0b8', '#ff9fae', '#c86a98'], alpha: 0.9 },
                planets: [{ x: 0.12, y: 0.14, r: 8, color: '#c6a8ff', ring: '#ffe0f0', par: 0.04 }]
            },
            islets: [
                { x: 0, w: 780, pond: { at: 240, w: 300, depth: 12 }, falls: 'left' },
                { x: 900, w: 720, pond: { at: 110, w: 380, depth: 12 } },
                { x: 1740, w: 700, pond: { at: 200, w: 220, depth: 10 }, falls: 'right' }
            ],
            fishingStop: 1340,
            props: [
                { s: 'p-willow', x: 110 }, { s: 'p-boathouse', x: 640 }, { s: 'p-reeds', x: 232 }, { s: 'p-reeds2', x: 548 },
                { s: 'p-lilypad3', x: 330, water: true }, { s: 'p-lilypad2', x: 420, water: true }, { s: 'p-rowboat', x: 470, water: true },
                { s: 'p-cattail', x: 1000 }, { s: 'p-beaverdam', x: 1060, water: true, sink: 4 }, { s: 'p-lilypad2', x: 1150, water: true }, { s: 'p-lilypad3', x: 1250, water: true },
                { s: 'p-dock', x: 1390, flip: true }, { s: 'p-reeds', x: 1520 }, { s: 'p-willow', x: 1580 },
                { s: 'p-reeds2', x: 1930 }, { s: 'p-lilypad3', x: 2010, water: true }, { s: 'p-willow', x: 2250 },
                { auto: ['p-reeds', 'p-reeds2', 'p-cattail'], every: 70, shore: true },
                { auto: ['p-lakestone'], every: 160 }
            ],
            animals: [
                { sp: 'swan', x: 360, pond: true }, { sp: 'cygnet', x: 340, pond: true, n: 2 },
                { sp: 'heron', x: 505, pond: true, wade: true }, { sp: 'dragonfly', x: 420, n: 2, air: [-40, -12] },
                { sp: 'frog', x: 330, perch: 'sit' },
                { sp: 'beaver', x: 1100 }, { sp: 'otter', x: 1200, pond: true }, { sp: 'frog', x: 1250, perch: 'sit' }, { sp: 'frog', x: 1460 },
                { sp: 'frog', x: 2010, perch: 'sit' }, { sp: 'swan', x: 2060, pond: true }, { sp: 'dragonfly', x: 2100, n: 2, air: [-40, -12] }
            ],
            mamma: {
                animal: 'swan', x: 2380, pond: true,
                lines: [
                    ['nova', 'Är du min mamma?'],
                    ['swan', 'Hihi, nej! Jag är ju en svan. Ser du inte mina vingar?'],
                    ['swan', 'Men jag såg två gyllene ljus flyga mot Savannen, där solen är så stor.'],
                    ['mira', 'Savannen! Då får vi se lejon!']
                ]
            },
            intro: [
                ['nova', 'Vad det glittrar!'],
                ['mira', 'Solnedgång! Nova, är du hungrig?']
            ],
            remarks: [
                { at: 960, lines: [['mira', 'Bävern har byggt en damm av pinnar!'], ['nova', 'Som ett litet hus mitt i vattnet!']] }
            ],
            reward: { outfit: 'b', text: 'Mira hittade sin röda keps och fjärilsklänningen i gondolen! Byt i Klädskåpet.' }
        },
        {
            id: 'savanna',
            name: 'Savannen',
            tagline: 'Gyllene gräs och jättestora djur',
            terrain: 'savanna',
            music: 'savanna',
            ambience: 'savanna',
            weather: 'dust',
            light: 'sunset',
            speed: 23,
            startTool: 'flute',
            sky: {
                gradient: ['#2e2060', '#8a3a74', '#e0705a', '#ffb050', '#ffe08a'],
                stars: 0.3,
                sun: { x: 0.62, y: 0.74, r: 22, color: '#ffe79a', glow: 70, glowColor: '#ffbf5a' },
                clouds: { count: 4, y: [0.15, 0.4], colors: ['#ffd6a0', '#ffac80', '#d8707a'], alpha: 0.85 },
                planets: [{ x: 0.9, y: 0.12, r: 9, color: '#ffcf8a', bands: 4, par: 0.04 }]
            },
            islets: [
                { x: 0, w: 960, pond: { at: 520, w: 200, depth: 12 }, falls: 'left' },
                { x: 1080, w: 860 },
                { x: 2060, w: 820, pond: { at: 140, w: 170, depth: 11 }, falls: 'right' }
            ],
            props: [
                { s: 'p-acacia', x: 140 }, { s: 'p-termite', x: 300 }, { s: 'p-acacia2', x: 420 }, { s: 'p-baobab', x: 820 },
                { s: 'p-kopje', x: 1150 }, { s: 'p-acacia', x: 1330 }, { s: 'p-drybush', x: 1500 }, { s: 'p-acacia2', x: 1760 },
                { s: 'p-kopje2', x: 1880 }, { s: 'p-sunlog', x: 2100 }, { s: 'p-acacia', x: 2500 }, { s: 'p-baobab', x: 2740 },
                { auto: ['p-savgrass', 'p-savgrass2', 'p-savgrass3'], every: 22 },
                { auto: ['p-drybush', 'p-kopje2'], every: 200 }
            ],
            animals: [
                { sp: 'meerkat', x: 260, n: 3, spread: 24 }, { sp: 'zebra', x: 380, n: 3, spread: 70 },
                { sp: 'hippo', x: 620, pond: true }, { sp: 'flamingo', x: 680, pond: true, n: 2, wade: true },
                { sp: 'elephant', x: 900 }, { sp: 'elephantcalf', x: 870 },
                { sp: 'rhino', x: 1180 }, { sp: 'giraffe', x: 1330, event: 'giraffeLick' }, { sp: 'zebra', x: 1560, n: 2 },
                { sp: 'lion', x: 1720 }, { sp: 'lioncub', x: 1790, n: 2, spread: 20 },
                { sp: 'hippo', x: 2240, pond: true }, { sp: 'giraffe', x: 2420 }, { sp: 'meerkat', x: 2600, n: 2 }
            ],
            events: [{ at: 1210, id: 'giraffeLick' }],
            mamma: {
                animal: 'lioness', x: 2800, extra: [{ animal: 'lion', dx: 34 }],
                lines: [
                    ['nova', 'Är ni min mamma och pappa?'],
                    ['lion', 'Hohoho! Nej, lilla vän. Vi är lejon – vi har inga ränder.'],
                    ['lioness', 'Våra ungar leker där borta. Men din mamma och pappa har ränder, precis som du.'],
                    ['lioness', 'De bor bortom djungeln!'],
                    ['mira', 'Ränder! Vi är på rätt spår, Nova!']
                ]
            },
            intro: [
                ['mira', 'Oj, vad varmt det är!'],
                ['nova', 'Och vad STORA djuren är!']
            ],
            remarks: [
                { at: 1600, lines: [['nova', 'Sch... Lejonet sover.'], ['mira', 'Undrar om det vaknar av lite musik?']] }
            ],
            reward: { tool: 'bubbles', text: 'Mira hittade en bubbelblomma – nu kan hon blåsa såpbubblor!' }
        },
        {
            id: 'jungle',
            name: 'Djungeln',
            tagline: 'Varmt regn, stora blad och busiga apor',
            terrain: 'jungle',
            music: 'jungle',
            ambience: 'rain',
            weather: 'rain',
            light: 'mist',
            speed: 22,
            sky: {
                gradient: ['#0f2c3a', '#1f5a5e', '#3f8f7a', '#8fd0a4', '#d9f5d0'],
                stars: 0.15,
                sun: { x: 0.3, y: 0.3, r: 8, color: '#f6ffe0', glow: 50, glowColor: '#d8ffd0' },
                clouds: { count: 8, y: [0.05, 0.4], colors: ['#e4fff0', '#b8e8d4', '#8cc4b0'], alpha: 0.7 },
                planets: []
            },
            islets: [
                { x: 0, w: 900, pond: { at: 600, w: 140, depth: 10 }, falls: 'left' },
                { x: 1020, w: 780 },
                { x: 1920, w: 700, falls: 'right' }
            ],
            props: [
                { s: 'p-jungletree', x: 110 }, { s: 'p-palm', x: 290 }, { s: 'p-bananas', x: 420 }, { s: 'p-jungletree', x: 580 },
                { s: 'p-vine', x: 598, hang: 66 }, { s: 'p-ruin', x: 820 }, { s: 'p-jungletree', x: 1130 }, { s: 'p-palm', x: 1300 },
                { s: 'p-jungletree2', x: 1500 }, { s: 'p-bananas', x: 1680 }, { s: 'p-jungletree', x: 2040 }, { s: 'p-vine2', x: 2060, hang: 60 },
                { s: 'p-palm', x: 2250 }, { s: 'p-jungletree2', x: 2440 },
                { auto: ['p-fernj', 'p-orchid', 'p-monstera', 'p-monstera2'], every: 30 },
                { auto: ['p-bigleaf', 'p-fernj'], every: 110 }
            ],
            animals: [
                { sp: 'parrot', x: 95, perch: 'perch' }, { sp: 'dartfrog', x: 200, n: 2 }, { sp: 'toucan', x: 292, perch: 'perch', on: 'p-palm' },
                { sp: 'monkey', x: 430, event: 'monkeyHat' }, { sp: 'monkey', x: 598, perch: 'grip', swing: true },
                { sp: 'morpho', x: 700, n: 3, air: [-70, -16] }, { sp: 'dartfrog', x: 820, perch: 'perch', on: 'p-ruin', index: 1 },
                { sp: 'toucan', x: 1115, perch: 'perch', on: 'p-jungletree' }, { sp: 'sloth', x: 1143, perch: 'hang' },
                { sp: 'chameleon', x: 1511, perch: 'perch', on: 'p-jungletree2', hidden: true }, { sp: 'monkey', x: 1700 }, { sp: 'dartfrog', x: 1900, n: 1 },
                { sp: 'parrot', x: 2025, perch: 'perch', on: 'p-jungletree' }, { sp: 'morpho', x: 2150, n: 2, air: [-60, -16] }, { sp: 'parrot', x: 2451, perch: 'perch', on: 'p-jungletree2' }
            ],
            events: [{ at: 330, id: 'monkeyHat' }],
            mamma: {
                animal: 'tiger', x: 2560,
                lines: [
                    ['nova', 'MAMMA?!'],
                    ['tiger', 'Åh, lilla stjärnunge... Jag är inte din mamma. Men jag vet vilka dina föräldrar är!'],
                    ['tiger', 'Det är Stjärntigrarna. Deras ränder lyser som norrsken och soluppgång. Följ norrskenet!'],
                    ['nova', '...'],
                    ['mira', 'Vi är nästan framme, Nova. Jag lovar!']
                ]
            },
            intro: [
                ['nova', 'Det regnar! Men det är varmt.'],
                ['mira', 'Vilka jättestora blad!']
            ],
            remarks: [
                { at: 1020, lines: [['mira', 'En sengångare! Den hänger upp och ner.']] },
                { at: 1390, lines: [['nova', 'Jag tror att någon gömmer sig i trädet där borta...']] }
            ],
            reward: { text: 'Stjärntigrarna finns bortom norrskenet!' }
        },
        {
            id: 'arctic',
            name: 'Norrskensisen',
            tagline: 'Snö, is och dansande norrsken',
            terrain: 'arctic',
            music: 'arctic',
            ambience: 'wind',
            weather: 'snow',
            light: 'night',
            aurora: true,
            speed: 21,
            sky: {
                gradient: ['#050a22', '#0b1a48', '#15306e', '#23508e', '#3a78b0'],
                stars: 1,
                sun: { x: 0.78, y: 0.16, r: 9, color: '#f4f6ff', glow: 36, glowColor: '#c8dcff', moon: true },
                clouds: null,
                planets: [{ x: 0.3, y: 0.12, r: 5, color: '#a8c8ff', par: 0.03 }]
            },
            islets: [
                { x: 0, w: 820, pond: { at: 480, w: 220, depth: 12 }, falls: 'left' },
                { x: 940, w: 740, pond: { at: 380, w: 260, depth: 14 } },
                { x: 1800, w: 760, falls: 'right' }
            ],
            props: [
                { s: 'p-snowspruce', x: 60 }, { s: 'p-igloo', x: 220 }, { s: 'p-snowman', x: 300 }, { s: 'p-snowspruce2', x: 400 },
                { s: 'p-iceberg2', x: 560, water: true }, { s: 'p-snowspruce', x: 760 },
                { s: 'p-snowrock', x: 1010 }, { s: 'p-iceberg', x: 1420, water: true }, { s: 'p-snowspruce2', x: 1640 },
                { s: 'p-snowspruce', x: 1900 }, { s: 'p-icehole', x: 2080 }, { s: 'p-snowspruce', x: 2300 }, { s: 'p-snowspruce2', x: 2480 },
                { auto: ['p-icecrystal', 'p-icecrystal2', 'p-snowdrift'], every: 60 }
            ],
            animals: [
                { sp: 'penguin', x: 160, n: 3, spread: 40 }, { sp: 'arcticfox', x: 340 }, { sp: 'seal', x: 450 },
                { sp: 'walrus', x: 740 }, { sp: 'snowyowl', x: 760, perch: 'tree' },
                { sp: 'polarbear', x: 1060 }, { sp: 'polarcub', x: 1100 }, { sp: 'whale', x: 1460, pond: true, event: 'whaleBreach' },
                { sp: 'reindeer', x: 1950, n: 2, spread: 50 }, { sp: 'arcticfox', x: 2200 }, { sp: 'penguin', x: 2350, n: 2 }
            ],
            events: [{ at: 1330, id: 'whaleBreach' }],
            fishingStop: 2050,
            mamma: {
                animal: 'polarbear', x: 2500,
                lines: [
                    ['nova', 'Är du min mamma?'],
                    ['polarbear', 'Nej, lilla vän. Jag är isbjörnsmamma till den här lilla ungen.'],
                    ['polarbear', 'Men se! Norrskenet pekar mot Stjärnön. Där väntar två som saknar dig väldigt mycket.'],
                    ['nova', 'Mamma och pappa! Stjärnön... Det låter som hemma!']
                ]
            },
            intro: [
                ['mira', 'Brrr! Vad kallt!'],
                ['nova', 'Titta på himlen! Den dansar!'],
                ['mira', 'Det är norrsken!']
            ],
            remarks: [
                { at: 1840, lines: [['nova', 'Renar! Precis som på ett julkort!']] }
            ],
            reward: { text: 'Norrskenet visar vägen till Stjärnön!' }
        },
        {
            id: 'star',
            name: 'Stjärnön',
            tagline: 'Där alla stjärnor sover',
            terrain: 'star',
            music: 'star',
            ambience: 'star',
            weather: 'fireflies',
            light: 'night',
            speed: 20,
            sky: {
                gradient: ['#07041a', '#1a0f45', '#34207a', '#5a36a6', '#8a5ad0'],
                stars: 1,
                sun: { x: 0.72, y: 0.26, r: 20, color: '#fff8e0', glow: 60, glowColor: '#fff0c0', moon: true },
                clouds: { count: 5, y: [0.1, 0.5], colors: ['#9a7ae0', '#6a4ab8', '#4a2e8a'], alpha: 0.55 },
                planets: [{ x: 0.12, y: 0.1, r: 10, color: '#ff9ad8', ring: '#ffe6a0', par: 0.03 }, { x: 0.45, y: 0.06, r: 4, color: '#8ff0ff', par: 0.05 }]
            },
            islets: [
                { x: 0, w: 700, falls: 'left' },
                { x: 840, w: 680 },
                { x: 1660, w: 700, falls: 'right' }
            ],
            props: [
                { s: 'p-crystal3', x: 80 }, { s: 'p-startree', x: 220 }, { s: 'p-crystal', x: 380 }, { s: 'p-glowshroom', x: 460 },
                { s: 'p-startree', x: 600 }, { s: 'p-crystal2', x: 930 }, { s: 'p-startree', x: 1100 }, { s: 'p-crystal3', x: 1380 },
                { s: 'p-startree', x: 1760 }, { s: 'p-crystal', x: 1980 }, { s: 'p-crystal3', x: 2200 },
                { auto: ['p-starflower', 'p-starflower2', 'p-glowshroom', 'p-glowshroom2'], every: 28 }
            ],
            animals: [
                { sp: 'luma-yellow', x: 180, air: [-80, -30] }, { sp: 'luma-blue', x: 320, air: [-80, -30] }, { sp: 'moonrabbit', x: 400, n: 2 },
                { sp: 'firefly', x: 520, n: 5, air: [-60, -8] }, { sp: 'starwhale', x: 900, sky: true },
                { sp: 'stardeer', x: 1150, n: 2, spread: 60 }, { sp: 'luma-pink', x: 1300, air: [-80, -30] }, { sp: 'luma-orange', x: 1480, air: [-80, -30] },
                { sp: 'firefly', x: 1700, n: 5, air: [-60, -8] }, { sp: 'moonrabbit', x: 1880, n: 1 }
            ],
            mamma: { animal: 'startiger', x: 2220, finale: true, lines: [] },
            intro: [
                ['nova', 'Det luktar... hemma!'],
                ['mira', 'Så många stjärnor!']
            ],
            remarks: [
                { at: 780, lines: [['nova', 'Stjärnvalen! Mamma och pappa sjöng om den för mig varje kväll.'], ['mira', 'Då är vi nästan framme!']] }
            ],
            reward: null
        }
    ];

    // =====================================================================
    // Story scenes (captions and dialogue; the scene code stages them)
    // =====================================================================
    const STORY = {
        prologue: [
            { caption: 'Det är en varm sommarkväll. Mira sitter på en bänk och äter glass.' },
            { caption: 'Plötsligt faller en stjärna ner i gräset!', action: 'starfall' },
            { action: 'novaAppears' },
            ['nova', 'Mjau... Jag heter Nova. Jag ramlade ner från Stjärnparken, och nu hittar jag inte min mamma och pappa...'],
            ['mira', 'Stackars dig! Jag heter Mira. Jag ska hjälpa dig!'],
            { caption: 'Då glider en gondol ner från himlen – med tigerrandiga säten!', action: 'gondolaArrives' },
            ['nova', 'Tigergondolen! Den åker ända upp till stjärnorna!'],
            ['mira', 'Jag tar med min kamera. Vi tar kort på alla djur vi träffar!'],
            { action: 'boardGondola' }
        ],
        finale: [
            { action: 'tigerAppears' },
            ['nova', 'MAMMA! PAPPA!'],
            { action: 'novaRuns' },
            ['startiger', 'Nova! Vår lilla stjärna! Där är du ju!'],
            ['startigerdad', 'Vi har letat efter dig över hela himlen, lilla vän.'],
            ['startiger', 'Tack, Mira. Du har varit så modig och snäll, och du tog hand om vår unge hela vägen hem.'],
            ['startigerdad', 'Ta den här stjärnan. Den kommer alltid att lysa för dig.'],
            { action: 'giftStar' },
            ['nova', 'Kommer du och hälsar på mig, Mira?'],
            ['mira', 'Varje kväll! Jag tittar upp på stjärnorna och vinkar till dig.']
        ],
        epilogue: [
            { caption: 'Tigergondolen tar Mira hem igen, genom natten.', action: 'homecoming' },
            ['alva', 'Mira! Där är du ju! Var har du varit?'],
            ['mira', 'Jag har hjälpt en tigerunge att hitta sin mamma och pappa! Titta, jag har tagit kort!'],
            ['pappa', 'Oj! Det måste du berätta allt om.'],
            { caption: 'De tittar upp mot himlen. Där blinkar tre nya stjärnor, alldeles bredvid varandra: en mamma, en pappa och en liten unge.', action: 'constellation' },
            { caption: 'Och varje gång Mira tittar upp mot stjärnorna, blinkar tre tigrar tillbaka. ⭐' },
            { action: 'theEnd' }
        ]
    };

    const NAMES = {
        mira: 'Mira', nova: 'Nova', alva: 'Alva', pappa: 'Pappa', startiger: 'Mamma Stjärntiger', startigerdad: 'Pappa Stjärntiger'
    };

    const HINTS = {
        snap: 'Tryck på ett djur för att ta ett kort!',
        snapKeys: 'Flytta sökaren med piltangenterna och tryck mellanslag för att ta ett kort!',
        newAnimal: 'Ett nytt djur i albumet!',
        stars: 'Ta kort när djuren gör något kul – då får du fler stjärnor!',
        look: 'Djuret tittar på dig – ta ett kort till!',
        monkey: 'Apan snodde {hat}! Kasta ett äpple till apan!',
        fishStart: 'Tryck på vattnet för att kasta ut kroken!',
        fishBite: 'Napp! Tryck NU!',
        fishReel: 'Håll inne för att veva in. Släpp när spöt blir rött!',
        fishEarly: 'Oj, för tidigt! Vänta tills flötet åker ner.',
        fishAway: 'Fisken kom undan! Försök igen.'
    };

    MS.content = { MOMENTS, SPECIES, SPECIES_BY_ID, FISH, FISH_BY_ID, TOOLS, OUTFITS, ISLANDS, STORY, NAMES, HINTS, momentsFor };
})();
