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
    horse: 'Sköldhästen', klo: 'Professor Klo', kv: 'Kartväktaren', alva: 'Alva', mira: 'Mira', signe: 'Sköldpaddan Signe', note: ''
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
        enterHint: 'Forskning, steg ett: hur snabb är du? Galoppera förbi mig, så tar jag tid!',
        holeHint: 'Jag kommer inte ut förrän det är lugnt. Göm dig, så tittar jag fram …',
        poolHint: 'Pölen krusar sig så fort du rör dig. Om du står alldeles stilla – göm dig – blir den blank som en spegel.',
        mirrorStone: ['klo', 'Titta noga! I spegelbilden ligger stenen alldeles vid klippan.'],
        mirrorPlank: ['klo', 'Och plankan över sprickan är hel. Här är den bara streckad.'],
        stoneDone: 'Stenen ligger precis som i spegelbilden!',
        stoneSide: 'Stenen ska bort mot klippan. Gå runt den, så att du står på andra sidan, och knuffa!',
        fluffWrongWay: 'Fjunet flög åt fel håll … det flyger dit jag springer!',
        fluffMiss: 'Fjunet landade inte på någon prickig tuva …',
        plankDone: 'Plankan är hel – precis som i spegeln!',
        teachStreck: 'Såg du? Hovarna ritade klart strecket när du galopperade!',
        firstThin: 'Strecket är ofärdigt. I full galopp ritar dina hovar klart det!',
        teachFluff: 'Fjunet flög åt samma håll som du sprang – och tuvan växte!',
        brantenTufts: 'Tuvorna där uppe är prickiga, som om de väntar på något …',
        rampGrew: 'En ramp av gräs! Nu kommer vi upp en bit.',
        swimTip: 'Här nere kan du simma åt alla håll. Göm dig i en ström, så driver du med den.',
        tasteGrass: ['horse', 'Mums. Stäppgräs.'],
        tasteKelp: ['horse', 'Kelp! Salt och krispigt.'],
        smak: [['klo', 'Gräs på land och kelp i havet?'], ['klo', 'Jag antecknar: äter både och. Det avgör ingenting!']],
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
        end: ['klo', 'Nu vet han att vi kommer.'],
        lyktHint: 'Lyktfiskar! De gömmer sig för simmare. Men för en sten … kanske inte?',
        whirlHint: 'Strömmen går bara runt och runt. Man kan inte simma emot – släpp taget och göm dig!',
        leapHint: 'För lite fart vid kanten. Backen är lång – börja högst uppe och galoppera hela vägen!',
        afterEnd: 'Virveln har vänt sig ut åt höger. Den nya strömmen leder till nästa sida!',
        laneHide: 'Fiskarna följer dig! Men här ligger du still. Göm dig i strömmen ovanför, så driver ni in i valvet tillsammans.',
        ropeHint: 'Ett rep! Ställ dig vid det och tryck Dra, så fälls plankan ner över klyftan.'
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
        chains: 'Tre kedjor går från luckorna: en ner till botten, en till röret och en till bryggan.',
        drumHint: 'Bryggan är ihålig. Galoppera fram och tillbaka på den!',
        plateHint: 'En platta på botten … den vill nog ha något tungt. En sten?',
        pipeHint: 'Röret blåser bort simmare. Men en sten skulle åka rakt upp!',
        diveHint: 'Göm dig nu – låt strömmen ta dig till fönstret!',
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
    },
    // after the ending: Kapplöpning mot Sköldpaddan Signe (plan §4.6 O8)
    after: {
        signeHello: [
            ['signe', 'Hej! Jag heter Signe. Sköldpadda. Helt vanlig.'],
            ['signe', 'Det sägs att du är snabb. Kapplöpning till pölen?']
        ],
        signeGo: [['signe', 'Klara … färdiga … gå!']],
        signeLose: [['signe', 'Jag vann på stilpoäng.']],
        signeAgain: [['signe', 'En gång till? Klara … färdiga … gå!']],
        signeGiveUp: [['signe', 'Vi tar det en annan gång.']]
    }
};

// ---------------------------------------------------------------------------
// Balks: the sköldhäst refuses and shows why. A short thought only where a pose is not enough.
// ---------------------------------------------------------------------------
export const BALK = {
    paper: 'Nästa sida är inte ritad än …',
    thin: 'Strecket är inte klart. I full galopp ritar jag det!',
    slow: 'För lite fart! Jag behöver full galopp hela vägen.',
    dark: 'Brr, för mörkt. Jag vågar inte simma in.',
    edge: 'För långt att hoppa härifrån.',
    rail: 'Räcket är i vägen.',
    fold: 'Havet är vikt här!',
    gate: 'Grinden är reglad från andra sidan.'
};

// ---------------------------------------------------------------------------
// Hints (plan §4.4): the margin note (level 2) is Klo's pencil note; level 3 is a sketch caption.
// ---------------------------------------------------------------------------
export const HINTS = {
    explore: { q: 'Vad vill Klo?', note: 'Klo har ett stoppur. Visa hur fort du kan springa – galoppera förbi honom!', sketch: 'Håll spaken ända ut (eller pilen inne) i några sekunder nära Klo.' },
    hide: { q: 'Hur får man en blyg krabba att komma fram?', note: 'Blyga djur kommer fram när ingen syns. Göm dig nära hålet!', sketch: 'Stå still nära hålet och tryck Göm dig.' },
    pool: { q: 'Vad döljer pölen?', note: 'Pölen krusar sig när du rör dig. Om du står helt still blir den blank som en spegel.', sketch: 'Gå fram till pölen och tryck Göm dig. Titta i vattnet.' },
    p2: { q: 'Vad skiljer spegelbilden från stranden?', note: 'I spegelbilden ligger stenen vid klippan, och plankan över sprickan är hel.', sketch: 'Ställ dig bakom stenen och tryck Knuffa tills den ligger vid klippan. Galoppera sedan över den streckade plankan.' },
    p1: { q: 'Hur kommer man över valvet?', note: 'Streckade linjer är ofärdiga. I full galopp ritar hovarna klart dem!', sketch: 'Ta sats på plankorna till höger om valvet och galoppera hela vägen över.' },
    p3: { q: 'Hur kommer man upp på branten?', note: 'Backsippornas fjun flyger åt samma håll som du springer. De prickiga tuvorna vill ha fjun.', sketch: 'Galoppera förbi backsippan på slätten mot branten. Vänta tills rampen har växt och gå upp.' },
    p3b: { q: 'Hur når fjunet de övre tuvorna?', note: 'Två backsippor står på den nedre avsatsen. Spring förbi dem i full fart!', sketch: 'Ta sats på slätten, galoppera upp för rampen och vidare förbi backsipporna.' },
    kelp: { q: 'Vart leder Vattenporten?', note: 'Valvet vid pölen är öppet nu!', sketch: 'Ställ dig i valvet och tryck Simma in.' },
    hook: { q: 'Vad finns längre ut i havet?', note: 'Simma österut, mot det ljusa vattnet. Strömmen hjälper dig.', sketch: 'Följ bubbelströmmen åt höger tills Klo säger till.' },
    p4: { q: 'Hur kommer man över klyftan?', note: 'Du behöver full fart ända fram till kanten. Backen är lång …', sketch: 'Gå upp på toppen av backen och galoppera nerför hela vägen till kanten.' },
    toSea: { q: 'Var är märkets andra halva?', note: 'Den ligger någonstans i havet, långt nere i djupet.', sketch: 'Simma in genom valvet vid pölen och följ diket nedåt åt höger.' },
    p5: { q: 'Hur blir det ljust i Mörka valvet?', note: 'Lyktfiskarna är blyga. De följer en sten – men aldrig en simmare.', sketch: 'Simma till strömmen ovanför fiskarnas kelp och göm dig där. Strömmen bär dig in i valvet.' },
    p6: { q: 'Vad finns mitt i strömkarusellen?', note: 'Man kan inte simma emot. Släpp taget!', sketch: 'Göm dig i strömmen, så drar den dig in till mitten.' },
    toViken: { q: 'Vart leder strömmen?', note: 'Virveln har vänt sig ut åt höger.', sketch: 'Simma till virveln längst in i diket och låt den nya strömmen ta dig vidare.' },
    p7: { q: 'Hur tänds fyren?', note: 'Tre luckor, tre kedjor. Följ varje kedja till sin maskin.', sketch: 'Göm dig på plattan på botten. Göm dig vid röret och åk upp. Galoppera sedan fram och tillbaka på bryggan.' },
    talk: { q: 'Vem bor i Pappersfyren?', note: 'Kartväktaren väntar vid bryggans slut.', sketch: 'Gå fram till honom och tryck Prata.' },
    p8: { q: 'Var fortsätter linjen?', note: 'Linjen går längs bryggan och sedan ner i vattnet.', sketch: 'Galoppera längs linjen från stranden, hoppa i vattnet och göm dig där.' },
    signe: { q: 'Vem är snabbast?', note: 'Signe väntar vid snäckorna.', sketch: 'Gå fram till Signe och tryck Prata.' },
    free: { q: 'Snabbaste sköldpaddan eller långsammaste hästen?', note: 'Forskningen fortsätter. Leta efter färgpennor!', sketch: '' }
};

// ---------------------------------------------------------------------------
// The goal note at the top of the screen (src/guide.mjs): one short line for each objective
// ---------------------------------------------------------------------------
export const GOALS = {
    explore: 'Galoppera förbi Klo – han vill ta tid på dig!',
    hide: 'Göm dig nära Klos hål, så vågar han komma fram.',
    pool: 'Undersök pölen vid klippan.',
    p2: (n) => `Gör stranden lik spegelbilden i pölen. (${n}/2)`,
    p1: 'Kom över det streckade valvet längre till vänster.',
    p3: (n) => `Ta dig upp på branten med vågmärkena. (${n}/3)`,
    p3b: (n) => `Ta dig upp till nästa avsats. (${n}/3)`,
    kelp: 'Simma in genom valvet vid pölen.',
    hook: 'Utforska kelpskogen österut.',
    p4: (n) => `Hitta märkets halva på land, bortom klyftan. (${n}/2)`,
    toSea: (n) => `Hitta märkets andra halva i havet. (${n}/2)`,
    p5: 'Ta dig in i det mörka valvet.',
    p6: 'Ta dig in till mitten av virveln.',
    toViken: 'Följ den nya strömmen från virveln till nästa sida.',
    p7: (n) => `Öppna fyrens tre luckor. (${n}/3)`,
    talk: 'Prata med Kartväktaren på bryggan.',
    p8: 'Följ den lysande linjen – hela vägen!',
    signe: 'Tävla mot Sköldpaddan Signe till pölen!',
    free: 'Utforska fritt – och leta färgpennor!'
};

// ---------------------------------------------------------------------------
// One-off tips about the controls (touch and keyboard versions)
// ---------------------------------------------------------------------------
export const TIPS = {
    gallop: { touch: 'Dra spaken ända ut – då galopperar du!', keys: 'Håll in pilen – efter en stund galopperar du!' },
    act: { touch: 'Den stora knappen byter namn när du kan göra något: Knuffa, Läs, Simma in …', keys: 'Mellanslag gör det som står på knappen: Hoppa, Knuffa, Läs, Simma in …' },
    hide: { touch: 'Göm dig: du kryper in under skalet. Tryck igen för att komma fram.', keys: 'G gömmer dig under skalet. Tryck G igen för att komma fram.' },
    swim: { touch: 'I vattnet styr du åt alla håll. Gömd sjunker du – men i en ström driver du med.', keys: 'Styr med pilarna åt alla håll. Gömd sjunker du – men i en ström driver du med.' },
    journal: { touch: 'Fastnat? Tryck på lappen högst upp eller på boken.', keys: 'Fastnat? Tryck J för Forskningsdagboken.' },
    dashed: { touch: 'Streckade linjer är ofärdiga. Galoppera över dem, så ritas de klart!', keys: 'Streckade linjer är ofärdiga. Galoppera över dem, så ritas de klart!' },
    fullGallop: { touch: 'Full galopp! Nu ritar hovarna och du kan ta stora språng.', keys: 'Full galopp! Nu ritar hovarna och du kan ta stora språng.' }
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
    clueSaved: 'Ledtråden står nu i dagboken ✎',
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

// ---------------------------------------------------------------------------
// The menus' notebook (src/ui.mjs): the journal's tabs, the report's stamp, the map sketch
// ---------------------------------------------------------------------------
export const MENU = {
    tabs: ['Framsida', 'Fältanteckning', 'Vad vet vi?', 'Mätningar', 'Ledtrådar', 'Rapporter', 'Din anteckning'],
    stamp: 'Granskad',
    map: 'Karta'
};
