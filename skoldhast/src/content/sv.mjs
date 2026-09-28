/*
 * Sköldhästen – every player-facing string, in Swedish.
 *
 * Style (plan §3.6): short speaker boxes (≈ 90 characters at most), at most three
 * boxes before control returns, Swedish quotation marks and dashes, "du" to the
 * player, plain child words.
 *
 * Alva's printed text (plan §0 Q5). Until Pappa decides, the game only uses the
 * fallback lines marked (c). If he allows it, put her exact words here:
 *   HER_TEXT.full     – all four sentences, for the journal page "Fältanteckning av Alva" (answer a)
 *   HER_TEXT.question – her question sentence (answer a or b)
 *   HER_TEXT.first    – her first sentence (answer a or b)
 *   HER_TEXT.lastTwo  – her last two sentences, for the prologue caption (answer a)
 */
export const HER_TEXT = { full: null, question: null, first: null, lastTwo: null };

/** Family touches (plan §0 Q6). Pappa decides; these are the defaults. */
export const FAMILY = {
    miraCameo: false,     // Mira and Alva's two lines in the epilogue (heard, never drawn)
    stars: true,          // the three star-tiger stars in the epilogue window
    miraSlot: false,      // a "Mira" save slot (§0 Q8)
    dedication: null      // Pappa's dedication, shown in the credits when set
};

export const NAMES = {
    horse: 'Sköldhästen', klo: 'Professor Klo', kv: 'Kartväktaren', alva: 'Alva', mira: 'Mira', note: ''
};

export const UI = {
    title: 'Sköldhästen',
    subtitle: 'och havet mellan sidorna',
    credit: 'Sköldhästar är påhittade och ritade av Alva.',
    begin: 'Börja', cont: 'Fortsätt', back: 'Tillbaka till biljetten',
    loading: 'Laddar Sköldhästen …', loadFail: 'Något gick fel när spelet laddades.',
    retry: 'Försök igen', reload: 'Ladda om sidan', cancel: 'Avbryt',
    noWebgl: 'Den här webbläsaren kan tyvärr inte visa spelet.',
    noSave: 'Spelet kan inte sparas i den här webbläsaren – men du kan spela ändå.',
    badSave: 'Det sparade spelet gick inte att läsa.', startOver: 'Börja om från början',
    confirmRestart: 'Vill du börja om? Det du har gjort i den här platsen försvinner.',
    yes: 'Ja', no: 'Nej',
    switchResearcher: 'Byt forskare', newResearcher: 'Ny forskare', haveCode: 'Jag har en kod',
    codePrompt: 'Skriv koden från Forskningsrapporten:', codeBad: 'Den koden känner jag inte igen.',
    slotAlva: 'Alva', slotMira: 'Mira',
    journal: 'Forskningsdagbok', pause: 'Paus', resume: 'Spela vidare', settings: 'Inställningar',
    stuck: 'Jag har fastnat', stuckQ: 'Vill du gå tillbaka till en trygg plats?', stuckYes: 'Ja', stuckNo: 'Nej, jag fortsätter',
    hint: 'Visa en ledtråd', hintMore: 'En ledtråd till', close: 'Stäng', next: 'Nästa sida', prev: 'Förra sidan',
    tapToGo: 'Tryck för att fortsätta', rotate: 'Rotera telefonen för bästa upplevelse',
    hop: 'Hoppa', hide: 'Göm dig', show: 'Kom fram',
    help: 'Hjälp', helpEasy: 'Utforska i lugn och ro', helpNormal: 'Lagom', helpHard: 'Lite mer klurigt',
    holdGallop: 'Håll kvar galoppen', holdGallopHelp: 'När du släpper fortsätter sköldhästen att galoppera – tills du styr åt andra hållet.',
    followFinger: 'Följ fingret', holdToHide: 'Håll inne för att gömma dig',
    bigText: 'Större text', lessMotion: 'Mindre rörelse',
    music: 'Musik', sound: 'Ljud', voices: 'Röster',
    pencils: 'Färgpennor', nextPage: 'Nästa sida kommer snart.',
    report: 'Forskningsrapport', code: 'Kod', photoTip: 'Ta gärna en bild på koden.',
    chapter1: 'Kapitel 1: Stranden och stäppen', chapter2: 'Kapitel 2: Udden och djupet', chapter3: 'Kapitel 3: Pappersfyren',
    prologue: 'Ett streck till', finale: 'Havet hittar hem',
    theEnd: 'Slut – men forskningen fortsätter.', playOn: 'Utforska vidare',
    drawGull: 'Rita en mås!', drawCloud: 'Rita ett moln!', drawShore: 'Rita strandkanten vidare – ut på det vita papperet!',
    drawLast: 'Rita det sista strecket!',
    choiceWhat: 'Vad hände?', choiceWho: 'Vem gjorde så?'
};

// ---------------------------------------------------------------------------
// The story (plan §3.4). Each line: [speaker, text]. Speakers: horse, klo, kv, alva, mira, note, caption.
// ---------------------------------------------------------------------------
export const STORY = {
    prolog: {
        captionFull: null, // HER_TEXT.lastTwo when allowed
        captionFallback: 'Häst eller sköldpadda? Ingen vet. Det behövs en forskare!',
        klo1: ['klo', 'Forskare? Här! Professor Klo – expert på allt som bor både på land och i vatten.'],
        klo1Fallback: ['klo', 'Behöver någon en forskare? Här! Professor Klo – expert på land och vatten.'],
        klo2: ['klo', 'Hittills mest krabbor.'],
        stuck: ['horse', 'Alva … vågen har fastnat.'],
        fold: ['horse', 'Titta – ett veck. Någon har vikt sidan.'],
        mystery: ['klo', 'Äntligen ett riktigt mysterium!'],
        research: ['horse', 'Då får vi forska på det.']
    },
    k1: {
        stopwatch: [
            ['klo', 'Fyrtiotvå komma sju kilometer i timmen!'],
            ['klo', 'För en sköldpadda är det världsrekord. För en häst är det … helt okej.'],
            ['horse', 'Helt OKEJ?!']
        ],
        ja: [
            ['klo', 'Häst eller sköldpadda?'],
            ['horse', 'Ja.'],
            ['klo', '… Jag behöver tänka en stund.']
        ],
        mapCorner: [
            ['klo', 'Den här låg i sanden. En bit av en karta – och i hörnet står det /K.'],
            ['klo', 'Titta nu!'],
            ['klo', 'Det som händer med kartan händer med världen!']
        ],
        clouds: [['klo', 'Varför är molnen inte färglagda?'], ['horse', 'Moln är vita, Klo.']],
        note1: ['note', 'OBS! Ofärdigt streck. Rör ej! /K'],
        noteKlo: [
            ['klo', 'K? Det är inte jag! Jag kan inte ens hålla i en linjal.'],
            ['klo', 'Men vem skriver så prydligt? Med linjal, dessutom!']
        ],
        noteKlo2: ['klo', 'Det här är ju Alvas streck. Då får vi väl rita vidare?'],
        glimpse: ['horse', 'Det finns fler!'],
        wavemarksSeen: ['klo', 'Vågmärken – högt uppe på branten! Hur kom havet dit upp?'],
        wavemarks: ['klo', 'Havet har varit här uppe!'],
        mirror: ['klo', 'Spegelbilden visar hur sidan ska se ut!'],
        whisper: ['klo', 'Du gömmer dig jättebra. Förutom manen. Den syns ända upp till ytan.'],
        fishRock: ['klo', 'Fiskarna tror att du är en sten!'],
        deep: ['klo', 'Djupare än alla hästar jag har mätt!'],
        waitWaves: ['klo', 'Vänta! Först måste vi mäta vågmärkena uppe på stäppen.'],
        waitPool: ['klo', 'Vänta! Vi har inte undersökt pölen vid klippan än.'],
        hook: [
            ['horse', 'Någon har vikt det här.'],
            ['klo', 'Med linjal.'],
            ['horse', 'Vem var det där?!']
        ],
        paper: 'Nästa sida kommer snart.'
    },
    k2: {
        open: [
            ['klo', 'Titta på kartbiten. Märket i hörnet är rivet i två delar.'],
            ['klo', 'Hitta märkets två halvor – en på land och en i havet.']
        ],
        record: ['klo', 'Fem hästlängder! Nytt rekord för sköldpaddor. Och för krabbor.'],
        lighthouse: ['horse', 'Fyren lyser – men bara i spegelbilden.'],
        note2: ['note', 'Snälla, rör inte strecken. Det är för teckningens skull. /K'],
        lanterns: ['klo', 'Lyktfiskar! De är blyga … och de lyser.'],
        half: ['klo', 'Halva märket fattas. Den andra halvan ligger nog högt upp – bland vågmärkena.'],
        halfSea: ['klo', 'Den andra halvan måste finnas i havet.'],
        bothHalves: ['klo', 'Två halvor av samma märke!'],
        end: ['klo', 'Nu vet han att vi kommer.']
    },
    k3: {
        arrive: ['klo', 'Spegelviken! Och där ute – Pappersfyren.'],
        mirror: ['klo', 'I spegelbilden är tre luckor öppna. Här är alla stängda.'],
        talk1: [
            ['kv', 'Strandkanten blir aldrig färdig. Och ett ofärdigt streck kan bli en reva.'],
            ['kv', 'Så jag vek bort havet. Det var för teckningens skull!']
        ],
        talk2: [
            ['kv', 'Här står LAND. Och här står HAV. Var ska jag skriva dig?'],
            ['horse', 'Jag finns visst inte på kartan.'],
            ['klo', 'Då är det kartan som är fel. Inte du.']
        ],
        talk3: [
            ['horse', 'Strandkanten ska inte vara färdig. Den flyttar sig med varje våg.'],
            ['horse', 'Det är där jag bor – precis i mitten.']
        ],
        line: ['klo', 'Linjen! Den går hela vägen längs bryggan – och sedan ner i vattnet.'],
        sorry: [
            ['kv', 'Förlåt, Alva. Det var inget fel på ditt streck. Det var bara inte färdigt än.'],
            ['kv', 'Jag ritar strandkanten i blyerts. Då kan vågorna flytta den.']
        ]
    },
    final: {
        conclusion: [
            ['klo', 'Slutsats: För en sköldpadda – världsrekord. För en häst – helt okej.'],
            ['klo', 'För en sköldhäst … precis lagom.'],
            ['klo', 'Mer forskning behövs!']
        ],
        note: null, // her question + "Forskningen fortsätter." when HER_TEXT.question is set
        noteFallback: 'Snabbaste sköldpaddan eller långsammaste hästen? Forskningen fortsätter.',
        mira: [['mira', 'Varför är teckningen blöt?'], ['alva', 'Forskning.']]
    }
};

// ---------------------------------------------------------------------------
// Balks: the sköldhäst refuses and shows why. A short thought only where a pose is not enough.
// ---------------------------------------------------------------------------
export const BALK = {
    paper: 'Nästa sida kommer snart.',
    fold: null, edge: null, slow: null, thin: null, dark: null, gate: 'Grinden är reglad från andra sidan.', rail: null
};

// ---------------------------------------------------------------------------
// Hints (plan §4.4): the margin note (level 2) is Klo's pencil note; level 3 is a sketch caption.
// ---------------------------------------------------------------------------
export const HINTS = {
    explore: { q: 'Vem har vikt sidan?', note: 'Galoppera, hoppa och gnägg! Tryck på sköldhästen för att gnägga.', sketch: 'Spring åt vänster, mot dynerna.' },
    hide: { q: 'Hur får man en blyg krabba att komma fram?', note: 'Blyga djur kommer fram när du gömmer dig. Tryck på Göm dig!', sketch: 'Tryck på Göm dig nära hålet.' },
    p1: { q: 'Hur kommer man över det streckade strecket?', note: 'Titta på hovspåren i sanden. Vilka blir kvar?', sketch: 'Ta sats på stranden och galoppera över!' },
    p3: { q: 'Hur kommer man upp på branten?', note: 'Titta vart fjunet flyger när du springer förbi.', sketch: 'Galoppera genom backsipporna – fjunet flyger åt samma håll.' },
    p3b: { q: 'Hur når fjunet den övre avsatsen?', note: 'Kan du komma i full galopp upp på avsatsen?', sketch: 'Ta sats långt ute på stäppen och galoppera upp för rampen.' },
    p2: { q: 'Vad visar spegelbilden i pölen?', note: 'Göm dig vid pölen och jämför spegelbilden med stranden.', sketch: 'Knuffa stenen och galoppera över plankan.' },
    kelp: { q: 'Vart leder Vattenporten?', note: 'Simma in genom valvet vid pölen.', sketch: 'Ställ dig framför valvet och tryck Simma in.' },
    hook: { q: 'Vad finns längre ut i havet?', note: 'Simma österut, mot det djupa.', sketch: 'Följ strömmen åt höger.' },
    p4: { q: 'Hur kommer man över klyftan?', note: 'Kan du få mer fart någon annanstans?', sketch: 'Galoppera nerför backen hela vägen till kanten.' },
    p5: { q: 'Hur blir det ljust i Mörka valvet?', note: 'Titta på lyktfiskarna när du har gömt dig. Vad gör de?', sketch: 'Göm dig uppströms – strömmen tar dig förbi fiskarna.' },
    p6: { q: 'Vad finns mitt i strömkarusellen?', note: 'Titta vart de lösa kelpbladen tar vägen i strömmen.', sketch: 'Göm dig i strömmen och låt den ta dig in till mitten.' },
    p7: { q: 'Hur tänds fyren?', note: 'Göm dig på bryggan och räkna luckorna i spegelbilden.', sketch: 'Galoppera på bryggan, sjunk på plattan och åk upp i röret.' },
    talk: { q: 'Vem bor i Pappersfyren?', note: 'Gå fram till Kartväktaren.', sketch: 'Tryck Prata.' },
    p8: { q: 'Var fortsätter linjen?', note: 'Följ den streckade linjen med blicken. Var fortsätter den efter bryggan?', sketch: 'Galoppera längs linjen, hoppa i vattnet och göm dig i strömmen.' },
    free: { q: 'Snabbaste sköldpaddan eller långsammaste hästen?', note: 'Forskningen fortsätter. Leta efter färgpennor!', sketch: '' }
};

// ---------------------------------------------------------------------------
// The journal: Forskningsdagbok (plan §4.7)
// ---------------------------------------------------------------------------
export const JOURNAL = {
    title: 'Sköldhäst – först beskriven av Alva',
    latin: 'Chelonippus alvae?',
    latinNote: 'Ett förslag. Alva får döpa om den.',
    field: 'Fältanteckning av Alva',
    fieldFallback: 'Sköldhästar trivs lika bra i galopp över stäppen som gömda i kelpskogen. Är det världens snabbaste sköldpadda – eller världens långsammaste häst?',
    known: 'Vad vet vi?',
    measurements: 'Professor Klos mätningar',
    clues: 'Ledtrådar',
    halves: 'Två halvor av samma märke',
    yourNote: 'Din anteckning:',
    conclusion: 'Slutsats: Mer forskning behövs.',
    conclusionFull: null, // `Slutsats: ${HER_TEXT.first} Forskningen fortsätter.` when allowed
    empty: 'Inga mätningar än.',
    experiments: {
        fart: 'Fartfällan: 42,7 km/h. För en sköldpadda – världsrekord!',
        djup: 'Djupmätaren: djupare än alla hästar.',
        gom: 'Gömleken: fiskarna trodde att det var en sten.',
        gnagg: 'Gnäggtestet: ”gnägg” på land, ”blubb” under vatten.',
        sprang: 'Språnglängden: fem hästlängder. Rekord för sköldpaddor – och för krabbor.',
        smak: 'Smaktestet: äter både gräs och kelp.'
    },
    clueText: {
        map_corner: 'En kartbit i sanden, signerad /K. Det som händer med kartan händer med världen.',
        note1: 'En lapp vid Streckbron: ”OBS! Ofärdigt streck. Rör ej! /K”',
        wave_marks: 'Vågmärken högt uppe på branten. Havet har varit där uppe.',
        reflection: 'Spegelbilden visar hur sidan ska se ut.',
        fold: 'Ett veck genom havet – rakt som en linjal.',
        figure: 'Någon smal, av papper, med en linjal.',
        glimpse: 'Det finns fler sköldhästar!',
        lighthouse: 'Pappersfyren lyser bara i spegelbilden.',
        note2: 'En lapp i djupet: ”Snälla, rör inte strecken. Det är för teckningens skull. /K”',
        mark_land: 'Märkets landhalva, uppe på Klippudden.',
        mark_sea: 'Märkets havshalva, mitt i strömkarusellen.'
    },
    reports: {
        1: ['Galopperar över stäpperna: bekräftat.', 'Gömmer sig i kelpskogen: bekräftat.', 'Fart: 42,7 km/h – helt okej för en häst.', 'Sköldpadda eller häst? Det står lika. Forskningen fortsätter …'],
        2: ['Hoppar fem hästlängder: bekräftat.', 'Sjunker som en sten: bekräftat.', 'Två halvor av samma märke – hittade!', 'Nästa: Pappersfyren.']
    }
};

/** Word codes for the chapter reports (restore the finished chapter's end). */
export const WORD_CODES = {
    1: 'KELP MÅS SKAL',
    2: 'FYR FJUN KLO'
};

/** Captions for important sounds (plan §8: captions carry everything). */
export const CAPTIONS = {
    rustle: '(prassel)', plask: '(PLASK!)', neigh: '(gnägg!)', blubb: '(blubb!)', ratchet: '(klick)', latch: '(klonk!)', drum: '(dunk dunk)', unfold: '(prassel …)'
};

export const CONTEXT_LABELS = { talk: 'Prata', read: 'Läs', swimIn: 'Simma in', down: 'Gå ner', taste: 'Smaka' };
